// ─────────────────────────────────────────────
// SOUND SYSTEM — lightweight audio manager
// ─────────────────────────────────────────────

const _cache = new Map();
const _loopingSounds = new Map();
const _activeSounds = new Set();
let _sharedAudioCtx = null;

/** Get or create a shared AudioContext to avoid "too many contexts" errors. */
function getAudioContext() {
  if (!_sharedAudioCtx || _sharedAudioCtx.state === 'closed') {
    _sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browsers require user interaction to start audio)
  if (_sharedAudioCtx.state === 'suspended') {
    _sharedAudioCtx.resume().catch(() => {});
  }
  return _sharedAudioCtx;
}

/**
 * Pre-load an audio file so it's ready to play instantly.
 * Uses fetch + AudioContext.decodeAudioData to fully decode the audio
 * into memory, bypassing the browser's lazy loading for zero-latency playback.
 * Falls back to a standard Audio element if Web Audio API fails.
 * @param {string} src - Path to the audio file (relative or absolute)
 */
export async function preloadSound(src) {
  if (_cache.has(src)) return;
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const audioCtx = getAudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    _cache.set(src, audioBuffer);
  } catch (e) {
    // Fallback: standard Audio element (may have loading delay)
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.load();
    _cache.set(src, audio);
  }
}

/**
 * Play a looping sound and return the audio element so it can be stopped/faded.
 * Only one looping instance per key is kept — calling again returns the same element.
 * @param {string} key - Identifier for this looping sound (e.g. fighter instance id)
 * @param {string} src - Path to the audio file
 * @param {number} [volume=1.0] - Volume level 0.0 – 1.0
 * @param {number} [speed=1.0] - Playback speed (1.0 is normal)
 * @returns {HTMLAudioElement}
 */
export function playLoopingSound(key, src, volume = 1.0, speed = 1.0) {
  if (_loopingSounds.has(key)) {
    const existing = _loopingSounds.get(key);
    if (existing.paused || existing.ended) {
      existing.currentTime = 0;
      existing.volume = Math.max(0, Math.min(1, volume));
      existing.playbackRate = Math.max(0.1, speed);
      existing.loop = true;
      existing.play().catch(() => {});
    }
    return existing;
  }
  // If cache holds an AudioBuffer, use Web Audio API for zero-latency playback
  const cached = _cache.get(src);
  if (cached instanceof AudioBuffer) {
    try {
      const audioCtx = getAudioContext();
      const source = audioCtx.createBufferSource();
      source.buffer = cached;
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      source.playbackRate.value = Math.max(0.1, speed);
      source.loop = true;
      source.start(0);
      // Store as object with source and gain for later control
      const soundObj = { source, gainNode, buffer: cached };
      _loopingSounds.set(key, soundObj);
      return soundObj;
    } catch (e) {
      // Fall through to Audio element fallback
    }
  }
  // Fallback: standard Audio element
  const audio = /** @type {HTMLAudioElement} */ (cached?.cloneNode() ?? new Audio(src));
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.playbackRate = Math.max(0.1, speed);
  audio.loop = true;
  audio.play().catch(() => {});
  _loopingSounds.set(key, audio);
  return audio;
}

/**
 * Smoothly fade out a looping sound over ~fadeMs milliseconds, then stop it.
 * @param {string} key - Identifier passed to playLoopingSound
 * @param {number} [fadeMs=300] - Fade duration in milliseconds
 */
export function fadeOutLoopingSound(key, fadeMs = 300) {
  const soundObj = _loopingSounds.get(key);
  if (!soundObj) return;

  // Handle Web Audio API objects (have source/gainNode/buffer)
  if (soundObj.gainNode && soundObj.buffer) {
    const gainNode = soundObj.gainNode;
    const source = soundObj.source;
    const startVol = gainNode.gain.value;
    const steps = 20;
    const stepDelay = fadeMs / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      gainNode.gain.value = Math.max(0, startVol * (1 - step / steps));
      if (step >= steps) {
        clearInterval(interval);
        try { source.stop(); } catch (e) {}
        _loopingSounds.delete(key);
      }
    }, stepDelay);
    return;
  }

  // Handle HTML Audio elements
  const audio = soundObj;
  if (audio.paused || audio.ended) return;
  const startVol = audio.volume;
  const steps = 20;
  const stepDelay = fadeMs / steps;
  let step = 0;
  const interval = setInterval(() => {
    step++;
    audio.volume = Math.max(0, startVol * (1 - step / steps));
    if (step >= steps) {
      clearInterval(interval);
      audio.pause();
      audio.currentTime = 0;
      audio.loop = false;
      _loopingSounds.delete(key);
    }
  }, stepDelay);
}

/**
 * Stop a specific looping sound immediately.
 * @param {string} key - Identifier passed to playLoopingSound
 */
export function stopLoopingSound(key) {
  const soundObj = _loopingSounds.get(key);
  if (!soundObj) return;

  // Handle Web Audio API objects
  if (soundObj.gainNode && soundObj.buffer) {
    try { soundObj.source.stop(); } catch (e) {}
    _loopingSounds.delete(key);
    return;
  }

  // Handle HTML Audio elements
  const audio = soundObj;
  audio.pause();
  audio.currentTime = 0;
  audio.loop = false;
  _loopingSounds.delete(key);
}

/**
 * Stop all looping sounds and clear the registry.
 */
export function stopAllLoopingSounds() {
  _loopingSounds.forEach((soundObj) => {
    // Handle Web Audio API objects
    if (soundObj.gainNode && soundObj.buffer) {
      try { soundObj.source.stop(); } catch (e) {}
    } else {
      // Handle HTML Audio elements
      const audio = soundObj;
      audio.pause();
      audio.currentTime = 0;
      audio.loop = false;
    }
  });
  _loopingSounds.clear();
}

/**
 * Play a pre-loaded (or on-demand) sound effect.
 * If the sound was preloaded via preloadSound() using Web Audio API (AudioBuffer),
 * it plays instantly with zero latency.
 * Otherwise falls back to cloning an Audio element (may have loading delay).
 * Each call creates a fresh instance so overlapping plays work correctly.
 * @param {string} src - Path to the audio file
 * @param {number} [volume=1.0] - Volume level 0.0 – 1.0
 * @param {number} [speed=1.0] - Playback speed (1.0 is normal)
 * @param {number} [offset=0] - Time in seconds to start playing from (advance)
 * @returns {HTMLAudioElement|null} The audio element (null for Web Audio playback)
 */
export function playSound(src, volume = 1.0, speed = 1.0, offset = 0) {
  const cached = _cache.get(src);

  // Fast path: AudioBuffer (fully decoded during preload) — zero latency
  if (cached instanceof AudioBuffer) {
    try {
      const audioCtx = getAudioContext();
      const source = audioCtx.createBufferSource();
      source.buffer = cached;
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      source.playbackRate.value = Math.max(0.1, speed);
      source.start(0, Math.max(0, offset));
    } catch (e) {
      // Fall through to Audio element fallback
    }
    return null;
  }

  // Slow path: Audio element fallback (may need to load/decode on demand)
  const base = cached ?? new Audio(src);
  const clone = /** @type {HTMLAudioElement} */ (base.cloneNode());
  clone.volume = Math.max(0, Math.min(1, volume));
  clone.playbackRate = Math.max(0.1, speed);
  clone.currentTime = Math.max(0, offset);
  _activeSounds.add(clone);
  clone.addEventListener('ended', () => _activeSounds.delete(clone), { once: true });
  clone.addEventListener('pause', () => _activeSounds.delete(clone), { once: true });
  clone.play().catch(() => {
    // Silently ignore autoplay-blocked or missing-file errors in dev
    _activeSounds.delete(clone);
  });
  return clone;
}

/**
 * Stop all non-looping sounds that are currently playing.
 */
export function stopAllSounds() {
  _activeSounds.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
  _activeSounds.clear();
}

/**
 * Stop ALL sounds (both looping and non-looping) - call this when leaving the game.
 */
export function stopAllAudio() {
  stopAllSounds();
  stopAllLoopingSounds();
}