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

  stopAll() {
    stopAllSounds();
    stopAllLoopingSounds();
  }
}

export const audioSystem = new AudioEventEmitter();
