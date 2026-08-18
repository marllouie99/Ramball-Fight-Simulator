import { playSound, stopSound, stopLoopingSound, stopSoundBySrc, stopAllSounds, stopAllLoopingSounds, playLoopingSound, fadeOutSound, fadeOutLoopingSound, fadeInSound } from './soundSystem.js';
import { AUDIO_CONFIG } from '../configs/audioConfig.js';

class AudioEventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(...args));
    }
    
    // Explicit event routing to the underlying low-level soundSystem
    if (event === 'playSFX') {
      const [id, volume = 1.0, speed = 1.0, offset = 0, delay = 0, onEnded = null] = args;
      const src = AUDIO_CONFIG[id] || id; // Fallback to string if not mapped
      if (typeof src === 'string' && !src.includes('/') && !src.includes('.')) {
        return null; // Skip unmapped sound key that is not a file path
      }
      return playSound(src, volume, speed, offset, delay, onEnded);
    }
    
    if (event === 'playLoop') {
      const [key, id, volume = 1.0, speed = 1.0, fadeMs = 0] = args;
      const src = AUDIO_CONFIG[id] || id;
      if (typeof src === 'string' && !src.includes('/') && !src.includes('.')) {
        return null;
      }
      return playLoopingSound(key, src, volume, speed, fadeMs);
    }

    if (event === 'stopLoop') {
      const [key, fadeMs = 300] = args;
      fadeOutLoopingSound(key, fadeMs);
    }
  }

  playSFX(id, volume = 1.0, speed = 1.0, offset = 0, delay = 0, onEnded = null) {
    return this.emit('playSFX', id, volume, speed, offset, delay, onEnded);
  }

  fadeInSFX(id, targetVolume = 1.0, fadeMs = 1500) {
    const src = AUDIO_CONFIG[id] || id;
    return fadeInSound(src, targetVolume, fadeMs);
  }

  playLoop(key, id, volume = 1.0, speed = 1.0, fadeMs = 0) {
    return this.emit('playLoop', key, id, volume, speed, fadeMs);
  }

  stopLoop(key, fadeMs = 300) {
    return this.emit('stopLoop', key, fadeMs);
  }

  fadeOutSFX(handle, fadeMs = 400) {
    fadeOutSound(handle, fadeMs);
  }

  /**
   * Play a voiceline for a specific fighter, cutting off any previously playing voiceline
   * on that same fighter. This ensures only one voiceline plays per fighter at a time.
   * If a protected voiceline is playing (e.g. Domain Expansion channeling & deployment),
   * normal skill/attack/dash voicelines will NOT cut it off.
   *
   * @param {object} fighter - The fighter object (used as the key to track active voiceline)
   * @param {string} id - Audio source path or config key
   * @param {number} [volume=1.0] - Volume level
   * @param {number} [speed=1.0] - Playback speed
   * @param {number} [offset=0] - Start offset in seconds
   * @param {number} [delay=0] - Delay before playing
   * @param {object} [options={}] - Options e.g. { isProtected: true, durationMs: 4000 }
   * @returns {object|null} The sound handle
   */
  playFighterVoiceline(fighter, id, volume = 1.0, speed = 1.0, offset = 0, delay = 0, options = {}) {
    if (!fighter) return this.playSFX(id, volume, speed, offset, delay);

    const now = Date.now();
    const newPriority = options.priority || (options.isProtected ? 'protected' : 'normal');

    // Priority levels: 'domain' (highest, level 3) > 'protected' (level 2) > 'normal' (level 1)
    const priorityValue = {
      'domain': 3,
      'protected': 2,
      'normal': 1
    };

    const currentPriority = fighter._activeVoicelinePriority || (fighter._activeVoicelineIsProtected ? 'protected' : 'normal');
    const isCurrentActive = Boolean(
      fighter._activeVoicelineHandle &&
      fighter._activeVoicelineEndTime &&
      now < fighter._activeVoicelineEndTime
    );

    // If a strictly higher priority voiceline is currently playing and not expired, block lower priority incoming lines
    if (isCurrentActive && (priorityValue[newPriority] || 1) < (priorityValue[currentPriority] || 1)) {
      return null;
    }

    // Stop the fighter's currently playing voiceline (if any)
    if (fighter._activeVoicelineHandle) {
      stopSound(fighter._activeVoicelineHandle);
      fighter._activeVoicelineHandle = null;
    }

    // Play the new voiceline and store the handle on the fighter
    const handle = this.playSFX(id, volume, speed, offset, delay);
    fighter._activeVoicelineHandle = handle;
    fighter._activeVoicelinePriority = newPriority;
    fighter._activeVoicelineIsProtected = (newPriority === 'domain' || newPriority === 'protected');
    if (fighter._activeVoicelineIsProtected) {
      const durationMs = (options && options.durationMs) || 4000;
      fighter._activeVoicelineEndTime = now + durationMs;
    } else {
      delete fighter._activeVoicelineEndTime;
    }

    return handle;
  }

  stopAll() {
    stopAllSounds();
    stopAllLoopingSounds();
  }
}

export const audioSystem = new AudioEventEmitter();
