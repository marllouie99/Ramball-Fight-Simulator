// ─────────────────────────────────────────────
// SOUND SYSTEM — lightweight audio manager
// ─────────────────────────────────────────────

import { state } from '../core/state.js';

const _cache = new Map();
const _loopingSounds = new Map();
const _activeSounds = new Set();
const _pendingSoundTimeouts = new Set();
let _sharedAudioCtx = null;
let _audioUnlocked = false;

// Lightweight pool for cloning HTML5 Audio objects to stop heap allocation thrashing
const _audioPool = [];
const MAX_POOL_SIZE = 30;

// Sound cache management to prevent unbounded memory growth
const MAX_CACHE_SIZE = 250; // Maximum number of cached sounds

// ── CONCURRENT SOUND LIMITING (prevents audio bus overload → crackling) ──
const MAX_CONCURRENT_SOUNDS = 18; // Hard cap on simultaneous Web Audio sources
// Micro-fade duration in seconds to prevent click/pop artifacts on start/stop
const MICRO_FADE_IN = 0.008;  // 8ms fade-in
const MICRO_FADE_OUT = 0.015; // 15ms fade-out

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

let _masterLimiterNode = null;

/** Get or create a shared AudioContext to avoid "too many contexts" errors. */
function getAudioContext() {
  if (!_sharedAudioCtx || _sharedAudioCtx.state === 'closed') {
    _sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    _masterLimiterNode = null;
  }

  // Only attempt resume after explicit unlock attempt from a user gesture.
  if (_audioUnlocked && _sharedAudioCtx.state === 'suspended') {
    _sharedAudioCtx.resume().catch(() => {});
  }
  return _sharedAudioCtx;
}

/** Get or create a master DynamicsCompressor limiter to prevent digital clipping / crackling. */
function getMasterAudioDestination() {
  const audioCtx = getAudioContext();
  if (!_masterLimiterNode && audioCtx) {
    try {
      _masterLimiterNode = audioCtx.createDynamicsCompressor();
      // Relaxed limiter settings to prevent pumping artifacts while still clamping peaks
      _masterLimiterNode.threshold.setValueAtTime(-6.0, audioCtx.currentTime);
      _masterLimiterNode.knee.setValueAtTime(12.0, audioCtx.currentTime);
      _masterLimiterNode.ratio.setValueAtTime(12.0, audioCtx.currentTime);
      _masterLimiterNode.attack.setValueAtTime(0.003, audioCtx.currentTime);
      _masterLimiterNode.release.setValueAtTime(0.15, audioCtx.currentTime);
      _masterLimiterNode.connect(audioCtx.destination);
    } catch (e) {
      _masterLimiterNode = null;
    }
  }
  return _masterLimiterNode || audioCtx.destination;
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
      const targetGain = Math.max(0, Math.min(2.5, volume));
      // Smooth fade-in to prevent click on loop start
      gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(targetGain, audioCtx.currentTime + MICRO_FADE_IN);
      source.connect(gainNode);
      gainNode.connect(getMasterAudioDestination());
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
    try {
      const audioCtx = getAudioContext();
      const now = audioCtx.currentTime;
      const currentGain = gainNode.gain.value;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(currentGain, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + (fadeMs / 1000));
      setTimeout(() => {
        try { source.stop(); } catch (e) {}
        try { gainNode.disconnect(); } catch (e) {}
        _loopingSounds.delete(key);
      }, fadeMs + 30);
    } catch (e) {
      try { source.stop(); } catch (e2) {}
      try { gainNode.disconnect(); } catch (e2) {}
      _loopingSounds.delete(key);
    }
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
    try {
      const audioCtx = getAudioContext();
      const now = audioCtx.currentTime;
      soundObj.gainNode.gain.cancelScheduledValues(now);
      soundObj.gainNode.gain.setValueAtTime(soundObj.gainNode.gain.value, now);
      soundObj.gainNode.gain.linearRampToValueAtTime(0.001, now + MICRO_FADE_OUT);
      setTimeout(() => {
        try { soundObj.source.stop(); } catch (e) {}
        try { soundObj.gainNode.disconnect(); } catch (e) {}
      }, MICRO_FADE_OUT * 1000 + 5);
    } catch (e) {
      try { soundObj.source.stop(); } catch (e2) {}
      try { soundObj.gainNode.disconnect(); } catch (e2) {}
    }
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
    try {
      const audioCtx = getAudioContext();
      const now = audioCtx.currentTime;
      soundObj.gainNode.gain.cancelScheduledValues(now);
      soundObj.gainNode.gain.setValueAtTime(soundObj.gainNode.gain.value, now);
      soundObj.gainNode.gain.linearRampToValueAtTime(0.001, now + MICRO_FADE_OUT);
    } catch (e) {}
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
    try {
      const audioCtx = getAudioContext();
      const now = audioCtx.currentTime;
      const targetGain = Math.max(0, Math.min(15, volume));
      soundObj.gainNode.gain.cancelScheduledValues(now);
      soundObj.gainNode.gain.setValueAtTime(0.001, now);
      soundObj.gainNode.gain.linearRampToValueAtTime(targetGain, now + MICRO_FADE_IN);
    } catch (e) {}
  } else if (typeof soundObj.play === 'function') {
    if (soundObj.paused) {
      soundObj.play().catch(() => {});
    }
  }
}

/**
 * Stop all looping sounds with optional delay and smooth fade-out.
 * @param {number} [fadeDelayMs=2000] - Delay in ms before starting fade-out (default 2 seconds).
 * @param {number} [fadeDurationMs=500] - Fade duration in ms.
 */
export function stopAllLoopingSounds(fadeDelayMs = 2000, fadeDurationMs = 500) {
  const keys = Array.from(_loopingSounds.keys());
  if (fadeDelayMs > 0) {
    keys.forEach((key) => {
      const timerId = setTimeout(() => {
        _pendingSoundTimeouts.delete(timerId);
        fadeOutLoopingSound(key, fadeDurationMs);
      }, fadeDelayMs);
      _pendingSoundTimeouts.add(timerId);
    });
  } else {
    keys.forEach((key) => {
      stopLoopingSound(key);
    });
    _loopingSounds.clear();
  }
}

/**
 * Evict the oldest active sound handle to make room for a new one.
 * Uses a micro-fade-out to prevent click/pop on eviction.
 */
function _evictOldestSound() {
  // Find the oldest handle (first in the Set)
  const iterator = _activeSoundHandles.values();
  const oldest = iterator.next().value;
  if (!oldest) return;

  if (oldest.gainNode) {
    try {
      const audioCtx = getAudioContext();
      const now = audioCtx.currentTime;
      oldest.gainNode.gain.cancelScheduledValues(now);
      oldest.gainNode.gain.setValueAtTime(oldest.gainNode.gain.value, now);
      oldest.gainNode.gain.linearRampToValueAtTime(0.001, now + MICRO_FADE_OUT);
      setTimeout(() => {
        try { if (oldest.source) oldest.source.stop(0); } catch(e) {}
        try { if (oldest.source) oldest.source.disconnect(); } catch(e) {}
        try { oldest.gainNode.disconnect(); } catch(e) {}
      }, MICRO_FADE_OUT * 1000 + 5);
    } catch(e) {
      try { if (oldest.source) oldest.source.stop(0); } catch(e2) {}
      try { if (oldest.source) oldest.source.disconnect(); } catch(e2) {}
      try { if (oldest.gainNode) oldest.gainNode.disconnect(); } catch(e2) {}
    }
  } else if (oldest.audio) {
    try { oldest.audio.pause(); } catch(e) {}
    oldest.audio.currentTime = 0;
  }
  _activeSoundHandles.delete(oldest);
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

export function playSound(src, volume = 1.0, speed = 1.0, offset = 0, delay = 0, onEnded = null) {
  if (!src) return null;

  // Support passing a sound config object directly: playSound({ src: '...', volume: 1.2, delay: -0.1 })
  if (typeof src === 'object' && !Array.isArray(src)) {
    const obj = src;
    src = obj.src;
    if (obj.volume !== undefined) volume = obj.volume;
    if (obj.speed !== undefined) speed = obj.speed;
    if (obj.offset !== undefined) offset = obj.offset;
    if (obj.delay !== undefined) delay = obj.delay;
    if (obj.onEnded !== undefined) onEnded = obj.onEnded;
  }

  // Check if gameState is roundEnd/matchEnd to block non-announcer/UI combat sounds (after the initial action delay of 60 frames)
  const srcStr = String(src).toLowerCase();
  const isAnnouncerOrUi = srcStr.includes('announcer') || srcStr.includes('ui');
  if (typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd')) {
    const isDuringActionDelay = (state.gameState === 'roundEnd' && state.roundEndTimer < 60) || 
                                (state.gameState === 'matchEnd' && state.matchEndTimer < 60);
    if (!isDuringActionDelay && !isAnnouncerOrUi && typeof onEnded !== 'function') {
      return null;
    }
  }

  // Handle positive delay option (schedules playback after delayMs)
  if (delay > 0) {
    const delayMs = delay < 10 ? delay * 1000 : delay;
    const timerId = setTimeout(() => {
      _pendingSoundTimeouts.delete(timerId);
      playSound(src, volume, speed, offset, 0, onEnded);
    }, delayMs);
    _pendingSoundTimeouts.add(timerId);
    return null;
  }

  // Handle Array of sound sources (play each sound in the array)
  if (Array.isArray(src)) {
    if (src.length === 0) return null;
    let lastResult = null;
    for (const singleSrc of src) {
      const res = playSound(singleSrc, volume, speed, offset, 0, onEnded);
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

  // ── Evict oldest sounds if at concurrent limit to prevent audio bus overload ──
  while (_activeSoundHandles.size >= MAX_CONCURRENT_SOUNDS) {
    _evictOldestSound();
  }

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
      const targetGain = Math.max(0, Math.min(2.5, volume));
      // Micro-fade-in to prevent click/pop artifact on playback start
      gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(targetGain, audioCtx.currentTime + MICRO_FADE_IN);
      source.connect(gainNode);
      gainNode.connect(getMasterAudioDestination());
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
      setTimeout(() => {
        // Micro-fade-out before stopping to prevent click/pop on natural end
        try {
          const ctx = getAudioContext();
          const fadeStart = ctx.currentTime;
          gainNode.gain.cancelScheduledValues(fadeStart);
          gainNode.gain.setValueAtTime(gainNode.gain.value, fadeStart);
          gainNode.gain.linearRampToValueAtTime(0.001, fadeStart + MICRO_FADE_OUT);
        } catch(e) {}
        setTimeout(() => {
          try { source.stop(0); } catch(e) {}
          try { source.disconnect(); } catch(e) {}
          try { gainNode.disconnect(); } catch(e) {}
          _activeSoundHandles.delete(handle); 
          if (typeof onEnded === 'function') {
            onEnded();
          }
        }, MICRO_FADE_OUT * 1000 + 5);
      }, Math.max(0, duration * 1000 - MICRO_FADE_OUT * 1000));

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
    duration: clone.duration || 0,
    audio: clone
  };
  _activeSoundHandles.add(handle);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    _activeSounds.delete(clone);
    _activeSoundHandles.delete(handle);
    try {
      clone.removeEventListener('ended', cleanup);
    } catch (e) {}
    if (_audioPool.length < MAX_POOL_SIZE && !_audioPool.includes(clone)) {
      _audioPool.push(clone);
    }
    if (typeof onEnded === 'function') {
      onEnded();
    }
  };

  handle.cleanup = cleanup;

  _activeSounds.add(clone);
  clone.addEventListener('ended', cleanup, { once: true });
  
  clone.play().catch(() => {
    cleanup();
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
    // Web Audio: micro-fade-out then disconnect to prevent click/pop
    if (soundHandle.gainNode && typeof soundHandle.gainNode.gain === 'object') {
      try {
        const audioCtx = getAudioContext();
        const now = audioCtx.currentTime;
        soundHandle.gainNode.gain.cancelScheduledValues(now);
        soundHandle.gainNode.gain.setValueAtTime(soundHandle.gainNode.gain.value, now);
        soundHandle.gainNode.gain.linearRampToValueAtTime(0.001, now + MICRO_FADE_OUT);
        setTimeout(() => {
          try { if (soundHandle.source) soundHandle.source.stop(0); } catch(e) {}
          try { if (soundHandle.source) soundHandle.source.disconnect(); } catch(e) {}
          try { soundHandle.gainNode.disconnect(); } catch(e) {}
        }, MICRO_FADE_OUT * 1000 + 5);
      } catch(e) {
        try { if (soundHandle.source) soundHandle.source.stop(0); } catch(e2) {}
        try { if (soundHandle.source) soundHandle.source.disconnect(); } catch(e2) {}
        try { soundHandle.gainNode.disconnect(); } catch(e2) {}
      }
    } else if (soundHandle.source && typeof soundHandle.source.stop === 'function') {
      try { soundHandle.source.stop(0); } catch(e) {}
      try { soundHandle.source.disconnect(); } catch(e) {}
    }
    if (soundHandle.audio) {
      try { soundHandle.audio.pause(); } catch(e) {}
      soundHandle.audio.currentTime = 0;
    }
    if (typeof soundHandle.pause === 'function') {
      try { soundHandle.pause(); } catch(e) {}
      soundHandle.currentTime = 0;
    }
    if (typeof soundHandle.cleanup === 'function') {
      try { soundHandle.cleanup(); } catch(e) {}
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
      soundHandle.gainNode.gain.cancelScheduledValues(now);
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
        stopSound(soundHandle);
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
 * @param {boolean} [keepAnnouncer=true] - If true, preserves announcer and death sounds like faah.mp3.
 * @param {number} [fadeDelayMs=2000] - Delay in ms before starting fade-out (default 2 seconds).
 * @param {number} [fadeDurationMs=500] - Fade-out duration in ms.
 */
export function stopAllSounds(keepAnnouncer = true, fadeDelayMs = 2000, fadeDurationMs = 500) {
  // 1. Clear all pending delayed sound timers
  _pendingSoundTimeouts.forEach((timerId) => clearTimeout(timerId));
  _pendingSoundTimeouts.clear();

  // 2. Stop/fade active Web Audio API & HTML Audio handles
  const handles = Array.from(_activeSoundHandles);
  for (const handle of handles) {
    if (keepAnnouncer && handle.src && (String(handle.src).toLowerCase().includes('announcer') || String(handle.src).toLowerCase().includes('machinegunblow'))) {
      continue;
    }
    if (fadeDelayMs > 0) {
      const timerId = setTimeout(() => {
        _pendingSoundTimeouts.delete(timerId);
        fadeOutSound(handle, fadeDurationMs);
      }, fadeDelayMs);
      _pendingSoundTimeouts.add(timerId);
    } else {
      stopSound(handle);
    }
  }

  // 3. Stop any fallback HTML Audio elements
  _activeSounds.forEach((audio) => {
    if (audio) {
      if (keepAnnouncer && audio.src && (String(audio.src).toLowerCase().includes('announcer') || String(audio.src).toLowerCase().includes('machinegunblow'))) {
        return;
      }
      if (fadeDelayMs > 0) {
        const timerId = setTimeout(() => {
          _pendingSoundTimeouts.delete(timerId);
          try { audio.pause(); } catch(e) {}
          audio.currentTime = 0;
          audio.src = '';
        }, fadeDelayMs);
        _pendingSoundTimeouts.add(timerId);
      } else {
        try { audio.pause(); } catch(e) {}
        audio.currentTime = 0;
        audio.src = '';
      }
    }
  });
}

/**
 * Stop ALL sounds (both looping and non-looping) - call this when leaving the game.
 * @param {boolean} [keepAnnouncer=false]
 * @param {number} [fadeDelayMs=0]
 * @param {number} [fadeDurationMs=350]
 */
export function stopAllAudio(keepAnnouncer = false, fadeDelayMs = 0, fadeDurationMs = 350) {
  stopAllSounds(keepAnnouncer, fadeDelayMs, fadeDurationMs);
  stopAllLoopingSounds(fadeDelayMs, fadeDurationMs);
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