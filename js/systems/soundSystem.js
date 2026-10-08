// ─────────────────────────────────────────────
// SOUND SYSTEM — lightweight audio manager
// ─────────────────────────────────────────────

import { state } from '../core/state.js';
import { soundSpriteManager } from './soundSpriteSystem.js';

export { soundSpriteManager };

const _cache = new Map();
const _loadingPromises = new Map();
const _loopingSounds = new Map();
const _activeSounds = new Set();
const _activeSoundHandles = new Set();
const _pendingSoundTimeouts = new Set();
let _sharedAudioCtx = null;
let _audioUnlocked = false;

// Lightweight pool for cloning HTML5 Audio objects to stop heap allocation thrashing
const _audioPool = [];
const MAX_POOL_SIZE = 30;

// Sound cache management to prevent unbounded memory growth
const MAX_CACHE_SIZE = 1000; // Increased to ensure all preloaded game sounds remain resident

// ── CONCURRENT SOUND LIMITING (prevents audio bus overload → crackling) ──
const MAX_CONCURRENT_SOUNDS = 40; // Hard cap on simultaneous Web Audio sources
// Micro-fade duration in seconds to prevent click/pop artifacts on start/stop without delaying attack transient
const MICRO_FADE_IN = 0.002;  // 2ms fade-in (preserves crisp punch/slash attack snap)
const MICRO_FADE_OUT = 0.015; // 15ms fade-out

/**
 * Checks whether an audio source is a protected voice line, announcer dialogue,
 * character sound, or death voice that must NEVER be cut off prematurely.
 * @param {string} src
 * @returns {boolean}
 */
export function isProtectedVoiceOrAnnouncerSound(src) {
  if (!src) return false;
  const s = String(src).toLowerCase();
  return s.includes('announcer') ||
         s.includes('faah') ||
         s.includes('voiceline') ||
         s.includes('voice') ||
         s.includes('vocal') ||
         s.includes('getsuga') ||
         s.includes('bankai') ||
         s.includes('ichigo') ||
         s.includes('homie') ||
         s.includes('noise') ||
         s.includes('clone') ||
         s.includes('minion') ||
         s.includes('mahito') ||
         s.includes('dialogue') ||
         s.includes('mybestfriend') ||
         s.includes('bestfriend') ||
         s.includes('tadaka') ||
         s.includes('takada') ||
         s.includes('imagination') ||
         s.includes('deathmusic') ||
         s.includes('respect') ||
         s.includes('wasted') ||
         s.includes('missionpassed') ||
         s.includes('cheatactivated') ||
         s.includes('cheat') ||
         s.includes('you-win') ||
         s.includes('you_win') ||
         s.includes('fight') ||
         s.includes('bell') ||
         s.includes('timertick') ||
         s.includes('machinegunblow') ||
         s.includes('purelovebeam') ||
         s.includes('purelove') ||
         s.includes('lovebeam') ||
         s.includes('yuta-lovebeam') ||
         s.includes('cosmiclaser') ||
         s.includes('namelessdeity') ||
         s.includes('nameless') ||
         s.includes('lovebeam-fires') ||
         s.includes('lovebeam-background') ||
         s.includes('finalflash') ||
         s.includes('hollowpurple') ||
         s.includes('purpledeploy') ||
         s.includes('redblast') ||
         s.includes('fuga') ||
         s.includes('comerika') ||
         s.includes('rikaappearance') ||
         s.includes('toji-ultimate') ||
         s.includes('finalblow') ||
         s.includes('zenitsu') ||
         s.includes('sansspeak') ||
         s.includes('sans') ||
         s.includes('ui');
}

/**
 * Checks whether an audio source is a fighter voice line, vocal chant,
 * or character speech that should not be stolen or played by Rubbick,
 * and should receive 90s Arcade Retro DSP filtering.
 * @param {string} src
 * @returns {boolean}
 */
export function isVoicelineAudio(src) {
  if (!src) return false;
  const s = String(src).toLowerCase();
  return s.includes('voiceline') ||
         s.includes('voice') ||
         s.includes('vocal') ||
         s.includes('hollowpurple') ||
         s.includes('purpledeploy') ||
         s.includes('mixing') ||
         s.includes('reddeploy') ||
         s.includes('redcharging') ||
         s.includes('redchanneling') ||
         s.includes('gojodomain') ||
         s.includes('yutadomainexpansion') ||
         s.includes('domainexpansion') ||
         s.includes('shrine') ||
         (s.includes('fuga') && !s.includes('travel') && !s.includes('explode') && !s.includes('ignite')) ||
         s.includes('mybestfriend') ||
         s.includes('bestfriend') ||
         s.includes('tadaka') ||
         s.includes('takada') ||
         s.includes('brother') ||
         s.includes('champion') ||
         s.includes('homie') ||
         s.includes('dialogue') ||
         s.includes('ragescream') ||
         s.includes('comerika') ||
         s.includes('sansspeak') ||
         s.includes('seriouspunch') ||
         s.includes('bankai') ||
         s.includes('incinerat') ||
         s.includes('machinegunblow') ||
         s.includes('bang') ||
         s.includes('bakketsu') ||
         s.includes('hinokami') ||
         s.includes('thunderclap');
}

/**
 * Checks whether a voiceline is an ultimate chant or domain expansion that benefits
 * from classic arcade slapback reverberation.
 * @param {string} src
 * @returns {boolean}
 */
export function isUltimateVoiceline(src) {
  if (!src) return false;
  const s = String(src).toLowerCase();
  return s.includes('domain') ||
         s.includes('shrine') ||
         s.includes('hollowpurple') ||
         s.includes('bankai') ||
         s.includes('seriouspunch') ||
         s.includes('champion') ||
         s.includes('purelovebeam') ||
         s.includes('cosmiclaser') ||
         s.includes('universalannihilation') ||
         s.includes('megatontsar');
}



function _pruneSoundCache() {
  if (_cache.size > MAX_CACHE_SIZE) {
    const entriesToRemove = _cache.size - MAX_CACHE_SIZE;
    let removed = 0;
    for (const key of _cache.keys()) {
      if (removed >= entriesToRemove) break;
      // Protect voice lines / announcer audio and active BGM from premature eviction
      if (isProtectedVoiceOrAnnouncerSound(key) || (typeof state !== 'undefined' && state.activeMatchBgmSrc === key)) {
        continue;
      }
      _cache.delete(key);
      removed++;
    }
    if (_cache.size > MAX_CACHE_SIZE) {
      const remaining = _cache.size - MAX_CACHE_SIZE;
      const oldestKeys = Array.from(_cache.keys()).slice(0, remaining);
      oldestKeys.forEach(k => _cache.delete(k));
    }
  }
}

function isAudioBufferLike(value) {
  if (!value) return false;
  if (typeof AudioBuffer !== 'undefined' && value instanceof AudioBuffer) return true;
  if (typeof globalThis !== 'undefined' && typeof globalThis.AudioBuffer !== 'undefined' && value instanceof globalThis.AudioBuffer) return true;
  return typeof value === 'object' && typeof value.duration === 'number' && typeof value.numberOfChannels === 'number';
}

let _masterLimiterNode = null;

/** Get or create a shared AudioContext with balanced latency to avoid underruns during screen recording. */
function getAudioContext() {
  if (!_sharedAudioCtx || _sharedAudioCtx.state === 'closed') {
    const AudioContextClass = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) ||
                              (typeof globalThis !== 'undefined' && (globalThis.AudioContext || globalThis.webkitAudioContext));
    if (AudioContextClass) {
      try {
        _sharedAudioCtx = new AudioContextClass({ latencyHint: 'interactive' });
      } catch (e) {
        try {
          _sharedAudioCtx = new AudioContextClass();
        } catch (e2) {
          _sharedAudioCtx = null;
        }
      }
    }
    _masterLimiterNode = null;
  }

  // Only attempt resume after explicit unlock attempt from a user gesture.
  if (_audioUnlocked && _sharedAudioCtx && _sharedAudioCtx.state === 'suspended') {
    _sharedAudioCtx.resume().catch(() => {});
  }
  return _sharedAudioCtx;
}

/**
 * Returns the current audio output latency in milliseconds.
 * This is the hardware pipeline delay between scheduling a sound and it actually being audible.
 * Useful for diagnostics and recording sync monitoring.
 * @returns {number} Output latency in ms (0 if unavailable)
 */
export function getAudioLatencyMs() {
  if (!_sharedAudioCtx) return 0;
  const outputLat = _sharedAudioCtx.outputLatency || 0;
  const baseLat = _sharedAudioCtx.baseLatency || 0;
  return Math.round((outputLat > 0 ? outputLat : baseLat) * 1000 * 10) / 10;
}

/**
 * Returns the current AudioContext time in seconds.
 * Exposed so other systems (gameLoop) can snapshot audio clock per frame.
 * @returns {number}
 */
export function getAudioCurrentTime() {
  if (!_sharedAudioCtx) return 0;
  return _sharedAudioCtx.currentTime;
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
 * Detects whether an audio source is a full-length music / BGM track that should
 * be streamed via HTML5 Audio rather than decoded into uncompressed Web Audio PCM buffers.
 * @param {string} src
 * @returns {boolean}
 */
export function isMusicAudio(src) {
  if (!src) return false;
  const s = String(src).toLowerCase();
  return s.includes('arena-bgmusic') ||
         s.includes('bgmusic') ||
         s.includes('cps1') ||
         s.includes('background-song') ||
         s.includes('bgm') ||
         s.includes('music') ||
         s.includes('loop') ||
         s.includes('megalovania') ||
         s.includes('deathmusic') ||
         s.includes('respect') ||
         s.includes('cj-respectoverlay-bgmusic');
}

/**
 * Pre-load a single audio file into Web Audio memory as an AudioBuffer.
 * For large BGM tracks, falls back to HTMLAudioElement to avoid CPU/memory decoding spikes.
 * @param {string} src - Audio URL path
 * @param {object} [options={}] - Options (e.g. forceWebAudio)
 * @returns {Promise<AudioBuffer|HTMLAudioElement|null>}
 */
export async function preloadAudioBuffer(src, options = {}) {
  if (!src || typeof src !== 'string') return null;

  // 1. Check sound sprite sheet registry first
  if (soundSpriteManager.hasSprite(src)) {
    const info = soundSpriteManager.getSpriteInfo(src);
    if (info) {
      const sheet = soundSpriteManager.spriteSheets.get(info.sheetId);
      if (sheet && sheet.buffer) {
        _cache.set(src, sheet.buffer);
        _pruneSoundCache();
        return sheet.buffer;
      } else if (sheet && !sheet.isVirtual && sheet.url && !sheet.url.startsWith('virtual://')) {
        const audioCtx = getAudioContext();
        const sheetBuffer = await soundSpriteManager.loadSpriteSheet(info.sheetId, audioCtx);
        if (sheetBuffer) {
          _cache.set(src, sheetBuffer);
          _pruneSoundCache();
          return sheetBuffer;
        }
      }
    }
  }

  // 2. Return immediately if already resident in memory cache
  if (_cache.has(src)) {
    return _cache.get(src);
  }

  // 3. Return existing in-flight promise if currently fetching/decoding
  if (_loadingPromises.has(src)) {
    return _loadingPromises.get(src);
  }

  const loadPromise = (async () => {
    // Full-length music tracks (3-5MB MP3s) stream efficiently via HTMLAudioElement without uncompressed PCM spikes
    const isMusic = !options.forceWebAudio && isMusicAudio(src);
    if (isMusic) {
      try {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.load();
        _cache.set(src, audio);
        _pruneSoundCache();
        return audio;
      } catch (err) {
        return null;
      }
    }

    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioCtx = getAudioContext();
      if (!audioCtx) throw new Error('No AudioContext available');
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      _cache.set(src, audioBuffer);
      _pruneSoundCache();
      return audioBuffer;
    } catch (e) {
      // Fallback: standard Audio element (streamed/on-demand)
      try {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.load();
        _cache.set(src, audio);
        _pruneSoundCache();
        return audio;
      } catch (err) {
        return null;
      }
    } finally {
      _loadingPromises.delete(src);
    }
  })();

  _loadingPromises.set(src, loadPromise);
  return loadPromise;
}

/**
 * Concurrently batch-preloads and decodes an array of audio URLs into Web Audio buffers.
 * Employs a worker pool pattern with bounded concurrency (default 6 parallel workers)
 * to prevent network starvation and audio decoding CPU spikes while ensuring zero-latency
 * instant combat sound playback.
 *
 * @param {string[]} urls - Array of audio file paths
 * @param {object} [options={}] - Batch loading options
 * @param {number} [options.concurrency=6] - Max simultaneous fetch + decode jobs
 * @param {boolean} [options.priority=false] - High priority (e.g. match start) with higher concurrency
 * @param {boolean} [options.idle=false] - Background idle load (yields/pauses during active matches)
 * @param {function} [options.onProgress=null] - Progress callback: (completed, total, currentUrl, success)
 * @returns {Promise<{ loaded: number, errors: number, total: number }>}
 */
export async function preloadAudioBufferBatch(urls, options = {}) {
  if (!Array.isArray(urls) || urls.length === 0) {
    return { loaded: 0, errors: 0, total: 0 };
  }

  const isPriority = Boolean(options && options.priority);
  const isIdle = Boolean(options && options.idle);
  const concurrency = options.concurrency || (isPriority ? 8 : (isIdle ? 4 : 6));
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

  // Filter and de-duplicate unique audio URLs
  const uniqueUrls = [...new Set(urls.filter(u => typeof u === 'string' && u.trim().length > 0))];
  const totalCount = uniqueUrls.length;
  if (totalCount === 0) {
    return { loaded: 0, errors: 0, total: 0 };
  }

  let currentIndex = 0;
  let completedCount = 0;
  let errorCount = 0;

  const workerCount = Math.min(concurrency, totalCount);
  const workers = Array.from({ length: workerCount }, async () => {
    while (currentIndex < totalCount) {
      // If idle mode and match is active, pause preloading so combat maintains locked 60 FPS
      while (isIdle && typeof state !== 'undefined' && (state.gameState === 'countdown' || state.gameState === 'playing')) {
        await new Promise(r => setTimeout(r, 500));
      }

      const idx = currentIndex++;
      if (idx >= totalCount) break;

      const url = uniqueUrls[idx];
      let success = true;
      try {
        await preloadAudioBuffer(url, options);
      } catch (err) {
        success = false;
        errorCount++;
      }

      completedCount++;
      if (onProgress) {
        try {
          onProgress(completedCount, totalCount, url, success);
        } catch (e) {}
      }

      // Periodically yield to browser event loop to prevent micro-stutter
      if (completedCount % 4 === 0) {
        await new Promise(r => {
          if (isIdle && typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => setTimeout(r, 4), { timeout: 60 });
          } else {
            setTimeout(r, isPriority ? 2 : 8);
          }
        });
      }
    }
  });

  await Promise.all(workers);
  return { loaded: completedCount - errorCount, errors: errorCount, total: totalCount };
}

/**
 * Pre-load audio file(s) so they are ready to play instantly.
 * Supports a single URL string or an array of URLs (which uses the concurrent batch worker pool).
 * @param {string|string[]} src - Path or array of paths to audio files
 * @param {object} [options={}] - Preload options (priority, idle, concurrency, onProgress)
 * @returns {Promise<any>}
 */
export async function preloadSound(src, options = {}) {
  if (!src) return;
  if (Array.isArray(src)) {
    return preloadAudioBufferBatch(src, options);
  }
  return preloadAudioBuffer(src, options);
}

/**
 * Retrieve live diagnostics and memory statistics about the sound system audio cache.
 * @returns {{ total: number, audioBuffers: number, audioElements: number, inFlight: number, activeHandles: number, loopingSounds: number, maxCacheSize: number }}
 */
export function getSoundCacheStats() {
  let audioBuffers = 0;
  let audioElements = 0;
  for (const val of _cache.values()) {
    if (isAudioBufferLike(val)) audioBuffers++;
    else if (val) audioElements++;
  }
  return {
    total: _cache.size,
    audioBuffers,
    audioElements,
    inFlight: _loadingPromises.size,
    activeHandles: _activeSoundHandles.size,
    loopingSounds: _loopingSounds.size,
    maxCacheSize: MAX_CACHE_SIZE
  };
}

/**
 * Checks whether a given audio asset is currently resident in the memory cache.
 * @param {string} src
 * @returns {boolean}
 */
export function isSoundCached(src) {
  if (!src) return false;
  if (_cache.has(src)) return true;
  const spriteAudio = soundSpriteManager.getSpriteAudio(src);
  return Boolean(spriteAudio && spriteAudio.buffer);
}

/**
 * Checks whether a given audio asset is cached specifically as an uncompressed Web Audio AudioBuffer.
 * @param {string} src
 * @returns {boolean}
 */
export function isSoundAudioBuffer(src) {
  if (!src) return false;
  if (isAudioBufferLike(_cache.get(src))) return true;
  const spriteAudio = soundSpriteManager.getSpriteAudio(src);
  return Boolean(spriteAudio && isAudioBufferLike(spriteAudio.buffer));
}

/**
 * Clear the sound memory cache.
 * @param {boolean} [keepProtected=true] - If true, preserves protected announcer and death voice lines.
 */
export function clearSoundCache(keepProtected = true) {
  if (!keepProtected) {
    _cache.clear();
    return;
  }
  for (const [key] of _cache.entries()) {
    if (!isProtectedVoiceOrAnnouncerSound(key)) {
      _cache.delete(key);
    }
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
export function playLoopingSound(key, src, volume = 1.0, speed = 1.0, fadeMs = 0, loopStart = 0, loopEnd = 0) {
  if (_loopingSounds.has(key)) {
    stopLoopingSound(key);
  }
  // If cache holds an AudioBuffer, use Web Audio API for zero-latency playback
  const cached = _cache.get(src);
  if (isAudioBufferLike(cached)) {
    try {
      const audioCtx = getAudioContext();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const source = audioCtx.createBufferSource();
      source.buffer = cached;
      const gainNode = audioCtx.createGain();
      const targetGain = Math.max(0, Math.min(25.0, volume));
      const rampTime = fadeMs > 0 ? (fadeMs / 1000) : MICRO_FADE_IN;
      const targetDest = getMasterAudioDestination();

      const now = audioCtx.currentTime;
      if (fadeMs > 0) {
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(targetGain, now + rampTime);
      } else {
        gainNode.gain.setValueAtTime(targetGain, now);
      }

      source.connect(gainNode);
      gainNode.connect(targetDest);
      source.playbackRate.value = Math.max(0.1, speed);
      source.loop = true;
      if (loopEnd > loopStart) {
        source.loopStart = Math.max(0, loopStart);
        source.loopEnd = Math.min(cached.duration || loopEnd, loopEnd);
      }
      source.start(0);
      // Store as object with source and gain for later control
      const soundObj = { source, gainNode, buffer: cached, _isFadingOut: false };
      _loopingSounds.set(key, soundObj);
      return soundObj;
    } catch (e) {
      // Fall through to Audio element fallback
    }
  }
  if (!_cache.has(src)) {
    preloadSound(src).catch(() => {});
  }
  // Fallback: standard Audio element
  const audio = new Audio(src);
  audio.preload = 'auto';
  const targetVol = Math.max(0, Math.min(1, volume));
  audio.loop = true;
  audio.playbackRate = Math.max(0.1, speed);
  audio._isFadingOut = false;
  if (fadeMs > 0) {
    audio.volume = 0.001;
    audio.play().catch(() => {});
    const steps = 20;
    const stepDelay = Math.max(10, fadeMs / steps);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      audio.volume = Math.min(targetVol, targetVol * (step / steps));
      if (step >= steps) clearInterval(interval);
    }, stepDelay);
  } else {
    audio.volume = targetVol;
    audio.play().catch(() => {});
  }
  _loopingSounds.set(key, audio);
  return audio;
}

/**
 * Check if a looping sound is currently registered and actively playing.
 * @param {string} key - Identifier passed to playLoopingSound
 * @returns {boolean}
 */
export function isLoopingSoundPlaying(key) {
  const soundObj = _loopingSounds.get(key);
  if (!soundObj) return false;
  if (soundObj._isFadingOut) return false;
  if (soundObj.gainNode && soundObj.buffer) {
    return true;
  }
  if (typeof soundObj.paused === 'boolean') {
    if (soundObj.paused && soundObj.currentTime > 0) return false;
  }
  return true;
}

/**
 * Smoothly fade out a looping sound over ~fadeMs milliseconds, then stop it.
 * @param {string} key - Identifier passed to playLoopingSound
 * @param {number} [fadeMs=300] - Fade duration in milliseconds
 */
export function fadeOutLoopingSound(key, fadeMs = 300) {
  const soundObj = _loopingSounds.get(key);
  if (!soundObj) return;

  if (soundObj._isFadingOut) return;
  soundObj._isFadingOut = true;

  // Handle Web Audio API objects (have source/gainNode/buffer)
  if (soundObj.gainNode && soundObj.buffer) {
    const gainNode = soundObj.gainNode;
    const source = soundObj.source;
    try {
      const audioCtx = getAudioContext();
      const now = audioCtx ? audioCtx.currentTime : 0;
      const currentGain = gainNode.gain.value;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(currentGain, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + (fadeMs / 1000));
      setTimeout(() => {
        try { source.stop(); } catch (e) {}
        try { gainNode.disconnect(); } catch (e) {}
        if (_loopingSounds.get(key) === soundObj) {
          _loopingSounds.delete(key);
        }
      }, fadeMs + 30);
    } catch (e) {
      try { source.stop(); } catch (e2) {}
      try { gainNode.disconnect(); } catch (e2) {}
      if (_loopingSounds.get(key) === soundObj) {
        _loopingSounds.delete(key);
      }
    }
    return;
  }

  // Handle HTML Audio elements
  const audio = soundObj;
  if (audio.paused || audio.ended) {
    if (_loopingSounds.get(key) === soundObj) {
      _loopingSounds.delete(key);
    }
    return;
  }
  const startVol = audio.volume;
  const steps = 20;
  const stepDelay = Math.max(10, fadeMs / steps);
  let step = 0;
  const interval = setInterval(() => {
    step++;
    audio.volume = Math.max(0, startVol * (1 - step / steps));
    if (step >= steps) {
      clearInterval(interval);
      audio.pause();
      audio.currentTime = 0;
      audio.loop = false;
      if (_loopingSounds.get(key) === soundObj) {
        _loopingSounds.delete(key);
      }
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
 * Smoothly adjust volume of an active looping sound.
 * @param {string} key
 * @param {number} targetVolume
 * @param {number} [rampMs=0]
 */
export function setLoopingSoundVolume(key, targetVolume, rampMs = 0) {
  const soundObj = _loopingSounds.get(key);
  if (!soundObj) return;

  if (soundObj.gainNode && soundObj.buffer) {
    try {
      const audioCtx = getAudioContext();
      const now = audioCtx.currentTime;
      const targetGain = Math.max(0, Math.min(15, targetVolume));
      soundObj.gainNode.gain.cancelScheduledValues(now);
      if (rampMs > 0) {
        soundObj.gainNode.gain.setValueAtTime(soundObj.gainNode.gain.value, now);
        soundObj.gainNode.gain.linearRampToValueAtTime(targetGain, now + (rampMs / 1000));
      } else {
        soundObj.gainNode.gain.setValueAtTime(targetGain, now);
      }
    } catch (e) {}
    return;
  }

  // HTML5 Audio element
  const audio = soundObj;
  if (audio && typeof audio.volume === 'number') {
    const targetVol = Math.max(0, Math.min(1, targetVolume));
    if (rampMs > 0) {
      const startVol = audio.volume;
      const steps = 15;
      const stepDelay = Math.max(10, rampMs / steps);
      let step = 0;
      const interval = setInterval(() => {
        step++;
        audio.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * (step / steps)));
        if (step >= steps) clearInterval(interval);
      }, stepDelay);
    } else {
      audio.volume = targetVol;
    }
  }
}

/**
 * Checks whether an audio handle, key, or source corresponds to Todo's Takada-chan idol
 * ultimate background music for a living Todo who has won the round/match and whose
 * ultimate duration has not yet expired.
 * @param {string} keyOrSrc
 * @returns {boolean}
 */
export function isTodoTakadaWinnerSong(keyOrSrc) {
  if (!keyOrSrc) return false;
  const str = String(keyOrSrc).toLowerCase();
  const isTakadaKeyOrSrc = str.startsWith('todo_takada_bg_') || str.includes('tadaka') || str.includes('takada') || str.includes('background-song');
  if (!isTakadaKeyOrSrc) return false;

  if (typeof state === 'undefined' || !state.fighters) return false;

  return state.fighters.some((f, idx) => {
    if (!f || (f.characterId !== 'todo' && f.type !== 'todo')) return false;
    if (f.hp <= 0 || f.isDead || f.dead) return false;

    // Ultimate duration not expired yet
    const hasUnexpiredUlt = (f.takadaUltTimer > 0) || f.isTakadaUltActive || f.isTakadaChanneling || f.takadaSongStarted || f.isTakadaBackgroundPlaying;
    if (!hasUnexpiredUlt) return false;

    const isOver = (state.gameState === 'matchEnd' || state.gameState === 'roundEnd');
    if (isOver) {
      if (state.matchWinner === f || state.roundWinner === f) return true;
      if (typeof state.getFighterTeam === 'function' && state.winningTeam !== undefined) {
        if (state.getFighterTeam(idx) === state.winningTeam) return true;
      }
      const enemiesAlive = state.fighters.some(other => other && other !== f && !f.isTeammate?.(other) && other.hp > 0 && !other.isDead && !other.dead);
      if (!enemiesAlive) return true;
    } else {
      // During active fight, Todo's ultimate song should not be killed by generic stopAllLoopingSounds
      return true;
    }
    return false;
  });
}

/**
 * Stop all looping sounds with optional delay and smooth fade-out.
 * @param {number} [fadeDelayMs=2000] - Delay in ms before starting fade-out (default 2 seconds).
 * @param {number} [fadeDurationMs=500] - Fade duration in ms.
 * @param {boolean} [keepBgm=false] - If true, preserves arena BGM looping sound.
 * @param {boolean} [forceStopAll=false] - If true, ignores protection and stops all sounds.
 */
export function stopAllLoopingSounds(fadeDelayMs = 2000, fadeDurationMs = 500, keepBgm = false, forceStopAll = false) {
  const keys = Array.from(_loopingSounds.keys());
  if (fadeDelayMs > 0) {
    keys.forEach((key) => {
      if (keepBgm && (key === 'arena_bgm_loop' || key === 'arena_bgm_preview')) return;
      if (!forceStopAll && isTodoTakadaWinnerSong(key)) return;
      const timerId = setTimeout(() => {
        _pendingSoundTimeouts.delete(timerId);
        fadeOutLoopingSound(key, fadeDurationMs);
      }, fadeDelayMs);
      _pendingSoundTimeouts.add(timerId);
    });
  } else {
    keys.forEach((key) => {
      if (keepBgm && (key === 'arena_bgm_loop' || key === 'arena_bgm_preview')) return;
      if (!forceStopAll && isTodoTakadaWinnerSong(key)) return;
      stopLoopingSound(key);
    });
    if (!keepBgm) {
      for (const [k] of _loopingSounds) {
        if (!forceStopAll && isTodoTakadaWinnerSong(k)) continue;
        _loopingSounds.delete(k);
      }
    }
  }
}

/**
 * Evict the oldest active sound handle to make room for a new one.
 * Uses a micro-fade-out to prevent click/pop on eviction.
 * @returns {boolean} Whether a sound was successfully evicted
 */
function _evictOldestSound() {
  if (_activeSoundHandles.size === 0) return false;

  // Find the oldest NON-PROTECTED handle (never evict announcer, faah, death sounds, voicelines, finisher channels, or homie noises)
  let candidate = null;
  for (const handle of _activeSoundHandles) {
    if (!handle) continue;
    if (isProtectedVoiceOrAnnouncerSound(handle.src) || handle.isFinisher) {
      continue; // Protected from eviction!
    }
    candidate = handle;
    break;
  }

  // If all active handles are protected voice clips, evict the absolute oldest handle
  if (!candidate) {
    candidate = _activeSoundHandles.values().next().value;
  }
  if (!candidate) return false;

  stopSound(candidate);
  return true;
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

  // Strict Mute Check: If volume is zero, immediately abort playback
  if (volume <= 0.0001) {
    return null;
  }

  // Check if gameState is roundEnd/matchEnd to block non-announcer/UI combat sounds (after the initial action delay of 60 frames)
  const isAnnouncerOrUi = isProtectedVoiceOrAnnouncerSound(src);
  if (typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd')) {
    const isDuringActionDelay = (state.gameState === 'roundEnd' && state.roundEndTimer < 60) || 
                                (state.gameState === 'matchEnd' && state.matchEndTimer < 60);
    if (!isDuringActionDelay && !isAnnouncerOrUi && typeof onEnded !== 'function') {
      return null;
    }
  }

  // Throttling guard: Prevent same sound file from playing multiple times in rapid succession.
  // RECORDING SYNC FIX: Use audioCtx.currentTime (hardware audio clock) instead of performance.now()
  // so the throttle is synchronized with the same clock that schedules sounds.
  // performance.now() drifts relative to audioCtx.currentTime under heavy CPU load (recording),
  // causing sounds to be incorrectly throttled or double-played.
  const audioCtx = getAudioContext();
  const now = audioCtx ? audioCtx.currentTime * 1000 : performance.now();
  const lastTime = _lastPlayTimes.get(src) || 0;
  
  // Frequent combat sounds (hits, swings, slashes, summons) enforce a 20ms minimum gap (just over 1 frame at 60fps)
  // to avoid same-frame audio doubling while guaranteeing rapid consecutive strikes play instantly
  const srcLower = String(src).toLowerCase();
  const isCombatSound = srcLower.includes('fleshhit') || srcLower.includes('sword') || srcLower.includes('slash') || srcLower.includes('illusion') || srcLower.includes('hit') || srcLower.includes('punch') || srcLower.includes('smash');
  const minInterval = isCombatSound ? 20 : 15;

  if (now - lastTime < minInterval) {
    return null;
  }
  _lastPlayTimes.set(src, now);

  // ── Evict oldest sounds if at concurrent limit to prevent audio bus overload ──
  let _evictAttempts = _activeSoundHandles.size;
  while (_activeSoundHandles.size >= MAX_CONCURRENT_SOUNDS && _evictAttempts-- > 0) {
    if (!_evictOldestSound()) break;
  }

  const spriteAudio = soundSpriteManager.getSpriteAudio(src);
  const cached = spriteAudio ? spriteAudio.buffer : _cache.get(src);
  const isSprite = Boolean(spriteAudio);
  const spriteBaseOffset = isSprite ? spriteAudio.offset : 0;
  const spriteMaxDuration = isSprite ? spriteAudio.duration : 0;

  // Fast path: AudioBuffer (fully decoded during preload or from sound sprite) — zero latency Web Audio scheduling
  if (isAudioBufferLike(cached) && audioCtx) {
    try {
      if (audioCtx.state === 'suspended' && _audioUnlocked) {
        audioCtx.resume().catch(() => {});
      }
      const source = audioCtx.createBufferSource();
      source.buffer = cached;
      const gainNode = audioCtx.createGain();
      const targetGain = Math.max(0, Math.min(25.0, volume));

      // Calculate hardware timeline start timestamp (delay is scheduled on audio card clock, not CPU JS loop)
      const delaySec = delay > 0 ? (delay < 10 ? delay : delay / 1000) : 0;
      const startTime = audioCtx.currentTime + delaySec;

      const targetDest = getMasterAudioDestination();

      // Instant zero-delay attack at startTime
      gainNode.gain.setValueAtTime(targetGain, startTime);
      source.connect(gainNode);
      gainNode.connect(targetDest);

      const safeSpeed = Math.max(0.1, speed);
      source.playbackRate.value = safeSpeed;

      const offsetSec = Math.max(0, spriteBaseOffset + offset);
      const remainingDuration = isSprite ? Math.max(0, spriteMaxDuration - offset) : Math.max(0, cached.duration - offsetSec);
      if (isSprite) {
        source.start(startTime, offsetSec, remainingDuration);
      } else {
        source.start(startTime, offsetSec);
      }

      const duration = Math.max(0, remainingDuration / safeSpeed);
      const endTime = startTime + duration;

      let safetyTimeout = null;
      const handle = {
        src,
        startTime,
        endTime,
        isPlaying: () => {
          const t = getAudioContext().currentTime;
          return t >= startTime && t < endTime;
        },
        duration,
        source,
        gainNode,
        get safetyTimeout() { return safetyTimeout; }
      };
      _activeSoundHandles.add(handle);

      // Natural AudioBuffer completion handler: avoids clock-drift truncation from setTimeout
      source.onended = () => {
        if (safetyTimeout) {
          clearTimeout(safetyTimeout);
          _pendingSoundTimeouts.delete(safetyTimeout);
          safetyTimeout = null;
        }
        try { source.disconnect(); } catch(e) {}
        try { gainNode.disconnect(); } catch(e) {}
        _activeSoundHandles.delete(handle);
        if (typeof onEnded === 'function') {
          onEnded();
        }
      };

      // Safety timeout purely for garbage collection in case onended is dropped
      safetyTimeout = setTimeout(() => {
        _activeSoundHandles.delete(handle);
        try { source.disconnect(); } catch(e) {}
        try { gainNode.disconnect(); } catch(e) {}
      }, Math.max(1000, (delaySec + duration) * 1000 + 600));
      _pendingSoundTimeouts.add(safetyTimeout);

      return handle;
    } catch (e) {
      // Fall through to Audio element fallback
    }
  }

  // If not cached as AudioBuffer yet, asynchronously trigger preload so future plays are zero latency
  if (!_cache.has(src)) {
    preloadSound(src).catch(() => {});
  }

  // Handle positive delay option for fallback path
  if (delay > 0) {
    const delayMs = delay < 10 ? delay * 1000 : delay;
    const timerId = setTimeout(() => {
      _pendingSoundTimeouts.delete(timerId);
      playSound(src, volume, speed, offset, 0, onEnded);
    }, delayMs);
    _pendingSoundTimeouts.add(timerId);
    return null;
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
 * @param {boolean} [force=false] - Force stop even if sound is protected
 */
export function stopSound(soundHandle, force = false) {
  if (!soundHandle) return;
  const srcStr = String(soundHandle.src || (soundHandle.audio && soundHandle.audio.src) || '').toLowerCase();
  if (!force && (srcStr.includes('faah') || srcStr.includes('announcer/faah') || srcStr.includes('respect') || srcStr.includes('cj-respectoverlay-bgmusic'))) {
    return; // PROTECTED: Never cut faah.mp3 death audio or CJ Respect overlay bgmusic!
  }
  if (soundHandle.safetyTimeout) {
    clearTimeout(soundHandle.safetyTimeout);
    _pendingSoundTimeouts.delete(soundHandle.safetyTimeout);
  }
  try {
    // Web Audio: micro-fade-out then disconnect to prevent click/pop
    if (soundHandle.gainNode && typeof soundHandle.gainNode.gain === 'object') {
      try {
        const audioCtx = getAudioContext();
        const now = audioCtx.currentTime;

        // If sound was scheduled in the future and hasn't started yet, cancel immediately
        if (soundHandle.startTime !== undefined && now < soundHandle.startTime) {
          try { if (soundHandle.source) soundHandle.source.stop(0); } catch(e) {}
          try { if (soundHandle.source) soundHandle.source.disconnect(); } catch(e) {}
          soundHandle.gainNode.gain.cancelScheduledValues(now);
          soundHandle.gainNode.gain.setValueAtTime(0.0001, now);
          try { soundHandle.gainNode.disconnect(); } catch(e) {}
          _activeSoundHandles.delete(soundHandle);
          return;
        }

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
 * @param {boolean} [force=false] - Force fade out even if protected
 */
export function fadeOutSound(soundHandle, fadeMs = 350, force = false) {
  if (!soundHandle) return;
  const srcStr = String(soundHandle.src || (soundHandle.audio && soundHandle.audio.src) || '').toLowerCase();
  if (!force && (srcStr.includes('faah') || srcStr.includes('announcer/faah') || srcStr.includes('respect') || srcStr.includes('cj-respectoverlay-bgmusic'))) {
    return; // PROTECTED: Never cut or fade out faah.mp3 or CJ Respect overlay bgmusic!
  }

  // Web Audio API instance (gainNode)
  if (soundHandle.gainNode) {
    try {
      const audioCtx = getAudioContext();
      const now = audioCtx.currentTime;

      // If scheduled in the future and hasn't started yet, cancel immediately
      if (soundHandle.startTime !== undefined && now < soundHandle.startTime) {
        stopSound(soundHandle);
        return;
      }

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
 * Smoothly play a sound and fade it in over fadeMs milliseconds up to targetVolume.
 * @param {string} src - Sound source path
 * @param {number} [targetVolume=1.0] - Target volume
 * @param {number} [fadeMs=1500] - Fade-in duration in milliseconds
 */
export function fadeInSound(src, targetVolume = 1.0, fadeMs = 1500) {
  const handle = playSound(src, 0.001, 1.0);
  if (!handle) return null;

  if (handle.gainNode) {
    try {
      const audioCtx = getAudioContext();
      const now = audioCtx.currentTime;
      handle.gainNode.gain.cancelScheduledValues(now);
      handle.gainNode.gain.setValueAtTime(0.001, now);
      handle.gainNode.gain.linearRampToValueAtTime(targetVolume, now + (fadeMs / 1000));
    } catch(e) {}
  } else {
    const audio = handle.audio || (typeof handle.pause === 'function' ? handle : null);
    if (audio) {
      audio.volume = 0.001;
      const steps = 20;
      const stepDelay = Math.max(10, fadeMs / steps);
      let step = 0;
      const interval = setInterval(() => {
        step++;
        audio.volume = Math.min(targetVolume, targetVolume * (step / steps));
        if (step >= steps) clearInterval(interval);
      }, stepDelay);
    }
  }
  return handle;
}

/**
 * Pause or mute an active sound instance (Web Audio API or HTMLAudioElement).
 * @param {object|HTMLAudioElement} soundHandle 
 */
export function pauseSound(soundHandle) {
  if (!soundHandle) return;
  try {
    // Web Audio API instance
    if (soundHandle.gainNode && typeof soundHandle.gainNode.gain === 'object') {
      const audioCtx = getAudioContext();
      const now = audioCtx.currentTime;
      if (soundHandle._savedGain === undefined) {
        soundHandle._savedGain = soundHandle.gainNode.gain.value;
      }
      soundHandle.gainNode.gain.cancelScheduledValues(now);
      soundHandle.gainNode.gain.setValueAtTime(0.0001, now);
      soundHandle._isPaused = true;
      return;
    }

    // HTML5 Audio element instance
    const audio = soundHandle.audio || (typeof soundHandle.pause === 'function' ? soundHandle : null);
    if (audio && typeof audio.pause === 'function') {
      try { audio.pause(); } catch (e) {}
      soundHandle._isPaused = true;
    }
  } catch (e) {}
}

/**
 * Resume a paused sound instance (Web Audio API or HTMLAudioElement).
 * @param {object|HTMLAudioElement} soundHandle 
 */
export function resumeSound(soundHandle) {
  if (!soundHandle) return;
  try {
    // Web Audio API instance
    if (soundHandle.gainNode && typeof soundHandle.gainNode.gain === 'object') {
      const audioCtx = getAudioContext();
      const now = audioCtx.currentTime;
      const targetGain = soundHandle._savedGain !== undefined ? soundHandle._savedGain : 1.0;
      soundHandle.gainNode.gain.cancelScheduledValues(now);
      soundHandle.gainNode.gain.setValueAtTime(targetGain, now);
      soundHandle._isPaused = false;
      return;
    }

    // HTML5 Audio element instance
    const audio = soundHandle.audio || (typeof soundHandle.play === 'function' ? soundHandle : null);
    if (audio && typeof audio.play === 'function') {
      if (audio.paused) {
        audio.play().catch(() => {});
      }
      soundHandle._isPaused = false;
    }
  } catch (e) {}
}

/**
 * Pause all active sound instances matching a sound file src string.
 * @param {string} src 
 */
export function pauseSoundBySrc(src) {
  if (!src) return;
  const target = String(src).toLowerCase();
  for (const handle of Array.from(_activeSoundHandles)) {
    if (handle && handle.src && String(handle.src).toLowerCase().includes(target)) {
      pauseSound(handle);
    }
  }
}

/**
 * Resume all paused sound instances matching a sound file src string.
 * @param {string} src 
 */
export function resumeSoundBySrc(src) {
  if (!src) return;
  const target = String(src).toLowerCase();
  for (const handle of Array.from(_activeSoundHandles)) {
    if (handle && handle.src && String(handle.src).toLowerCase().includes(target)) {
      resumeSound(handle);
    }
  }
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
 * @param {boolean} [force=false]
 */
export function stopSoundBySrc(src, force = false) {
  if (!src) return;
  const target = String(src).toLowerCase();
  if (!force && (target.includes('faah') || target.includes('respect') || target.includes('cj-respectoverlay-bgmusic'))) return; // PROTECTED!
  for (const handle of Array.from(_activeSoundHandles)) {
    if (handle && handle.src && String(handle.src).toLowerCase().includes(target)) {
      stopSound(handle, force);
    }
  }
}

/**
 * Stop all non-looping sounds that are currently playing.
 * @param {boolean} [keepAnnouncer=true] - If true, preserves announcer and death sounds like faah.mp3.
 * @param {number} [fadeDelayMs=2000] - Delay in ms before starting fade-out (default 2 seconds).
 * @param {number} [fadeDurationMs=500] - Fade-out duration in ms.
 * @param {boolean} [forceStopAll=false] - Force stop even protected sounds (e.g. exiting to title menu).
 */
export function stopAllSounds(keepAnnouncer = true, fadeDelayMs = 2000, fadeDurationMs = 500, forceStopAll = false) {
  // 1. Clear all pending delayed sound timers
  _pendingSoundTimeouts.forEach((timerId) => clearTimeout(timerId));
  _pendingSoundTimeouts.clear();

  // 2. Stop/fade active Web Audio API & HTML Audio handles
  const handles = Array.from(_activeSoundHandles);
  for (const handle of handles) {
    const src = String(handle?.src || (handle?.audio && handle.audio.src) || '').toLowerCase();
    const isRespect = src.includes('respect') || src.includes('cj-respectoverlay-bgmusic');
    if (!forceStopAll && isRespect) {
      continue; // CJ Respect music ALWAYS plays until it ends naturally!
    }
    if (!forceStopAll && isTodoTakadaWinnerSong(src)) {
      continue; // Todo Takada BG music ALWAYS plays until ultimate duration expires!
    }
    if (keepAnnouncer && isProtectedVoiceOrAnnouncerSound(handle.src)) {
      continue;
    }
    if (!forceStopAll && handle.isFinisher && handle.fighter && !handle.fighter.isDead && !handle.fighter.dead && handle.fighter.hp > 0) {
      continue; // Active finisher sound belonging to living caster is preserved!
    }
    if (fadeDelayMs > 0) {
      const timerId = setTimeout(() => {
        _pendingSoundTimeouts.delete(timerId);
        fadeOutSound(handle, fadeDurationMs, forceStopAll);
      }, fadeDelayMs);
      _pendingSoundTimeouts.add(timerId);
    } else {
      stopSound(handle, forceStopAll);
    }
  }

  // 3. Stop any fallback HTML Audio elements
  _activeSounds.forEach((audio) => {
    if (audio) {
      const src = String(audio.src || '').toLowerCase();
      const isRespect = src.includes('respect') || src.includes('cj-respectoverlay-bgmusic');
      if (!forceStopAll && isRespect) {
        return; // CJ Respect music ALWAYS plays until it ends naturally!
      }
      if (!forceStopAll && isTodoTakadaWinnerSong(src)) {
        return; // Todo Takada BG music ALWAYS plays until ultimate duration expires!
      }
      if (keepAnnouncer && isProtectedVoiceOrAnnouncerSound(audio.src)) {
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
 * @param {boolean} [forceStopAll=false]
 */
export function stopAllAudio(keepAnnouncer = false, fadeDelayMs = 0, fadeDurationMs = 350, forceStopAll = false) {
  stopAllSounds(keepAnnouncer, fadeDelayMs, fadeDurationMs, forceStopAll);
  stopAllLoopingSounds(fadeDelayMs, fadeDurationMs, false, forceStopAll);
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