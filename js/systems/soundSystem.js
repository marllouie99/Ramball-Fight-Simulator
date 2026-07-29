// ─────────────────────────────────────────────
// SOUND SYSTEM — lightweight audio manager
// ─────────────────────────────────────────────

const _cache = new Map();
const _loopingSounds = new Map();
const _activeSounds = new Set();
let _sharedAudioCtx = null;
let _audioUnlocked = false;

// Lightweight pool for cloning HTML5 Audio objects to stop heap allocation thrashing
const _audioPool = [];
const MAX_POOL_SIZE = 30;

// Sound cache management to prevent unbounded memory growth
const MAX_CACHE_SIZE = 250; // Maximum number of cached sounds

function _pruneSoundCache() {
  if (_cache.size > MAX_CACHE_SIZE) {
    // Remove oldest entries (Map maintains insertion order)
    const entriesToRemove = _cache.size - MAX_CACHE_SIZE;
    const keysToRemove = Array.from(_cache.keys()).slice(0, entriesToRemove);
    keysToRemove.forEach(key => _cache.delete(key));
  }
}

function isAudioBufferLike(value) {
  return typeof AudioBuffer !== 'undefined' && value instanceof AudioBuffer;
}

/** Get or create a shared AudioContext to avoid "too many contexts" errors. */
function getAudioContext() {
  if (!_sharedAudioCtx || _sharedAudioCtx.state === 'closed') {
    _sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Only attempt resume after explicit unlock attempt from a user gesture.
  if (_audioUnlocked && _sharedAudioCtx.state === 'suspended') {
    _sharedAudioCtx.resume().catch(() => {});
  }
  return _sharedAudioCtx;
}

/**
 * Unlocks browser audio by resuming AudioContext from a user gesture.
 * Safe to call repeatedly; no-op once unlocked.
 * @returns {Promise<boolean>} True when audio is unlocked/running.
 */
export async function unlockAudio() {
  try {
    const audioCtx = getAudioContext();
    if (audioCtx.state === 'running') {
      _audioUnlocked = true;
      return true;
    }
    await audioCtx.resume();
    _audioUnlocked = audioCtx.state === 'running';
    return _audioUnlocked;
  } catch (e) {
    _audioUnlocked = false;
    return false;
  }
}

/**
 * Pre-load an audio file so it's ready to play instantly.
 * Uses fetch + AudioContext.decodeAudioData to fully decode the audio
 * into memory, bypassing the browser's lazy loading for zero-latency playback.
 * Falls back to a standard Audio element if Web Audio API fails.
 * @param {string} src - Path to the audio file (relative or absolute)
 */
export async function preloadSound(src) {
  if (!src) return;
  if (Array.isArray(src)) {
    await Promise.all(src.map((s) => preloadSound(s)));
    return;
  }
  if (_cache.has(src)) return;
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const audioCtx = getAudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    _cache.set(src, audioBuffer);
    // Prune cache if it grows too large
    _pruneSoundCache();
  } catch (e) {
    // Fallback: standard Audio element (may have loading delay)
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.load();
    _cache.set(src, audio);
    // Prune cache if it grows too large
    _pruneSoundCache();
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
  if (isAudioBufferLike(cached)) {
    try {
      const audioCtx = getAudioContext();
      if (audioCtx.state !== 'running') {
        throw new Error('AudioContext not running yet');
      }
      const source = audioCtx.createBufferSource();
      source.buffer = cached;
      const gainNode = audioCtx.createGain();
      // Web Audio API supports gain values above 1.0 for amplification/boosting
      gainNode.gain.value = Math.max(0, Math.min(15, volume));
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
        try { gainNode.disconnect(); } catch (e) {}
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
    try { soundObj.gainNode.disconnect(); } catch (e) {}
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
 * Pause a looping sound without destroying its key or state.
 * @param {string} key - Identifier passed to playLoopingSound
 */
export function pauseLoopingSound(key) {
  const soundObj = _loopingSounds.get(key);
  if (!soundObj) return;

  if (soundObj.gainNode && soundObj.buffer) {
    try { soundObj.gainNode.gain.value = 0; } catch (e) {}
  } else if (typeof soundObj.pause === 'function') {
    soundObj.pause();
  }
}

/**
 * Resume a paused looping sound.
 * @param {string} key - Identifier passed to playLoopingSound
 * @param {number} [volume=1.0] - Volume level 0.0 - 1.0
 */
export function resumeLoopingSound(key, volume = 1.0) {
  const soundObj = _loopingSounds.get(key);
  if (!soundObj) return;

  if (soundObj.gainNode && soundObj.buffer) {
    try { soundObj.gainNode.gain.value = Math.max(0, Math.min(15, volume)); } catch (e) {}
  } else if (typeof soundObj.play === 'function') {
    if (soundObj.paused) {
      soundObj.play().catch(() => {});
    }
  }
}

/**
 * Stop all looping sounds and clear the registry.
 */
export function stopAllLoopingSounds() {
  _loopingSounds.forEach((soundObj) => {
    // Handle Web Audio API objects
    if (soundObj.gainNode && soundObj.buffer) {
      try { soundObj.source.stop(); } catch (e) {}
      try { soundObj.gainNode.disconnect(); } catch (e) {}
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
const _lastPlayTimes = new Map();
const SOUND_THROTTLE_MS = 15; // Prevent identical audio file from double-playing within same frame (15ms)

const _activeSoundHandles = new Set();

export function playSound(src, volume = 1.0, speed = 1.0, offset = 0, delay = 0) {
  if (!src) return null;

  // Support passing a sound config object directly: playSound({ src: '...', volume: 1.2, delay: -0.1 })
  if (typeof src === 'object' && !Array.isArray(src)) {
    const obj = src;
    src = obj.src;
    if (obj.volume !== undefined) volume = obj.volume;
    if (obj.speed !== undefined) speed = obj.speed;
    if (obj.offset !== undefined) offset = obj.offset;
    if (obj.delay !== undefined) delay = obj.delay;
  }

  // Handle positive delay option (schedules playback after delayMs)
  if (delay > 0) {
    const delayMs = delay < 10 ? delay * 1000 : delay;
    setTimeout(() => {
      playSound(src, volume, speed, offset, 0);
    }, delayMs);
    return null;
  }

  // Handle Array of sound sources (play each sound in the array)
  if (Array.isArray(src)) {
    if (src.length === 0) return null;
    let lastResult = null;
    for (const singleSrc of src) {
      const res = playSound(singleSrc, volume, speed, offset, 0);
      if (res) lastResult = res;
    }
    return lastResult;
  }

  // Throttling guard: Prevent same sound file from playing multiple times in rapid succession
  const now = performance.now();
  const lastTime = _lastPlayTimes.get(src) || 0;
  
  // Frequent combat sounds (hits, swings, slashes, summons) enforce a 70ms minimum gap to prevent audio machine-gun stutter
  const srcLower = String(src).toLowerCase();
  const isCombatSound = srcLower.includes('fleshhit') || srcLower.includes('sword') || srcLower.includes('slash') || srcLower.includes('illusion') || srcLower.includes('hit') || srcLower.includes('punch') || srcLower.includes('smash');
  const minInterval = isCombatSound ? 70 : 25;

  if (now - lastTime < minInterval) {
    return null;
  }
  _lastPlayTimes.set(src, now);

  const cached = _cache.get(src);

  // Fast path: AudioBuffer (fully decoded during preload) — zero latency
  if (isAudioBufferLike(cached)) {
    try {
      const audioCtx = getAudioContext();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const source = audioCtx.createBufferSource();
      source.buffer = cached;
      const gainNode = audioCtx.createGain();
      // Web Audio API supports gain values above 1.0 for amplification/boosting
      const targetGain = Math.max(0, Math.min(15, volume));
      gainNode.gain.setValueAtTime(targetGain, audioCtx.currentTime);
      gainNode.gain.value = targetGain;
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      const safeSpeed = Math.max(0.1, speed);
      source.playbackRate.value = safeSpeed;
      const startTime = audioCtx.currentTime;
      source.start(0, Math.max(0, offset));

      const duration = Math.max(0, (cached.duration - Math.max(0, offset)) / safeSpeed);
      const endTime = startTime + duration;

      const handle = {
        src,
        isPlaying: () => getAudioContext().currentTime < endTime,
        duration,
        source,
        gainNode
      };
      _activeSoundHandles.add(handle);
      setTimeout(() => { _activeSoundHandles.delete(handle); }, duration * 1000 + 100);

      return handle;
    } catch (e) {
      // Fall through to Audio element fallback
    }
  }

  // Slow path: Audio element fallback (may need to load/decode on demand)
  const base = (cached && typeof cached.cloneNode === 'function') ? cached : new Audio(src);
  let clone;
  let poolIdx = _audioPool.findIndex(a => a && (a.paused || a.ended));
  if (poolIdx >= 0) {
    clone = _audioPool.splice(poolIdx, 1)[0];
  } else {
    try {
      clone = /** @type {HTMLAudioElement} */ (base.cloneNode());
    } catch(e) {
      clone = new Audio(src);
    }
  }
  clone.src = src;

  clone.volume = Math.max(0, Math.min(1, volume));
  clone.playbackRate = Math.max(0.1, speed);
  clone.currentTime = Math.max(0, offset);
  
  const handle = {
    src,
    isPlaying: () => !clone.paused && !clone.ended,
    audio: clone
  };
  _activeSoundHandles.add(handle);

  const cleanup = () => {
    _activeSounds.delete(clone);
    _activeSoundHandles.delete(handle);
    if (_audioPool.length < MAX_POOL_SIZE && !_audioPool.includes(clone)) {
      _audioPool.push(clone);
    }
  };

  _activeSounds.add(clone);
  clone.addEventListener('ended', cleanup, { once: true });
  
  clone.play().catch(() => {
    _activeSounds.delete(clone);
    _activeSoundHandles.delete(handle);
  });
  
  return handle;
}

/**
 * Stop a played sound instance immediately.
 * Works for both Web Audio API handle objects and HTMLAudioElements.
 * @param {object|HTMLAudioElement} soundHandle
 */
export function stopSound(soundHandle) {
  if (!soundHandle) return;
  try {
    if (soundHandle.source && typeof soundHandle.source.stop === 'function') {
      try { soundHandle.source.stop(0); } catch(e) {}
      try { soundHandle.source.disconnect(); } catch(e) {}
    }
    if (soundHandle.gainNode && typeof soundHandle.gainNode.disconnect === 'function') {
      try { soundHandle.gainNode.gain.setValueAtTime(0, getAudioContext().currentTime); } catch(e) {}
      try { soundHandle.gainNode.disconnect(); } catch(e) {}
    }
    if (soundHandle.audio) {
      try { soundHandle.audio.pause(); } catch(e) {}
      soundHandle.audio.currentTime = 0;
    }
    if (typeof soundHandle.pause === 'function') {
      try { soundHandle.pause(); } catch(e) {}
      soundHandle.currentTime = 0;
    }
  } catch (e) {}
  _activeSoundHandles.delete(soundHandle);
}

/**
 * Smoothly fade out a played sound instance over fadeMs milliseconds before stopping.
 * Works for both Web Audio API handle objects and HTMLAudioElements.
 * @param {object|HTMLAudioElement} soundHandle
 * @param {number} [fadeMs=350] - Fade duration in milliseconds
 */
export function fadeOutSound(soundHandle, fadeMs = 350) {
  if (!soundHandle) return;

  // Web Audio API instance (gainNode)
  if (soundHandle.gainNode) {
    try {
      const audioCtx = getAudioContext();
      const now = audioCtx.currentTime;
      const currentGain = soundHandle.gainNode.gain.value;
      soundHandle.gainNode.gain.setValueAtTime(currentGain, now);
      soundHandle.gainNode.gain.linearRampToValueAtTime(0.001, now + (fadeMs / 1000));
      setTimeout(() => {
        try { if (soundHandle.source) soundHandle.source.stop(0); } catch(e) {}
        try { if (soundHandle.source) soundHandle.source.disconnect(); } catch(e) {}
        try { soundHandle.gainNode.disconnect(); } catch(e) {}
        _activeSoundHandles.delete(soundHandle);
      }, fadeMs + 20);
      return;
    } catch(e) {}
  }

  // HTML5 Audio element instance
  const audio = soundHandle.audio || (typeof soundHandle.pause === 'function' ? soundHandle : null);
  if (audio && !audio.paused && !audio.ended) {
    const startVol = audio.volume;
    const steps = 15;
    const stepDelay = Math.max(10, fadeMs / steps);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      audio.volume = Math.max(0, startVol * (1 - progress));
      if (step >= steps) {
        clearInterval(interval);
        try { audio.pause(); } catch(e) {}
        audio.currentTime = 0;
        _activeSoundHandles.delete(soundHandle);
      }
    }, stepDelay);
    return;
  }

  stopSound(soundHandle);
}

/**
 * Smoothly fade out all active non-looping sound instances matching a sound file src.
 * @param {string} src - Path or partial substring of sound file (e.g. 'groundTremble')
 * @param {number} [fadeMs=350] - Fade duration in milliseconds
 */
export function fadeOutSoundBySrc(src, fadeMs = 350) {
  if (!src) return;
  const target = String(src).toLowerCase();
  for (const handle of Array.from(_activeSoundHandles)) {
    if (handle && handle.src && String(handle.src).toLowerCase().includes(target)) {
      fadeOutSound(handle, fadeMs);
    }
  }
}

/**
 * Stop all active non-looping sound instances playing a matching sound file src.
 * @param {string} src - Path or partial substring of sound file (e.g. 'groundTremble')
 */
export function stopSoundBySrc(src) {
  if (!src) return;
  const target = String(src).toLowerCase();
  for (const handle of Array.from(_activeSoundHandles)) {
    if (handle && handle.src && String(handle.src).toLowerCase().includes(target)) {
      stopSound(handle);
    }
  }
}

/**
 * Stop all non-looping sounds that are currently playing.
 */
export function stopAllSounds() {
  _activeSounds.forEach((audio) => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
      audio.load();
    }
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

// Auto-unlock AudioContext on first user interaction (click, keydown, touch)
if (typeof window !== 'undefined') {
  const unlockEvents = ['pointerdown', 'keydown', 'touchstart', 'click'];
  const handleUnlock = () => {
    unlockAudio();
  };
  unlockEvents.forEach((evt) => {
    window.addEventListener(evt, handleUnlock, { passive: true });
  });
}