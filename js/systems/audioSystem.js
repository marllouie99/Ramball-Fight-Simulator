import { playSound, stopSound, stopLoopingSound, stopSoundBySrc, stopAllSounds, stopAllLoopingSounds, playLoopingSound, fadeOutSound, fadeOutLoopingSound } from './soundSystem.js';
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
      return playSound(src, volume, speed, offset, delay, onEnded);
    }
    
    if (event === 'playLoop') {
      const [key, id, volume = 1.0, speed = 1.0] = args;
      const src = AUDIO_CONFIG[id] || id;
      return playLoopingSound(key, src, volume, speed);
    }

    if (event === 'stopLoop') {
      const [key] = args;
      stopLoopingSound(key); // Assuming we import this, wait we didn't export stopLoopingSound in the import above!
    }
  }

  playSFX(id, volume = 1.0, speed = 1.0, offset = 0, delay = 0, onEnded = null) {
    return this.emit('playSFX', id, volume, speed, offset, delay, onEnded);
  }

  playLoop(key, id, volume = 1.0, speed = 1.0) {
    return this.emit('playLoop', key, id, volume, speed);
  }

  stopAll() {
    stopAllSounds();
    stopAllLoopingSounds();
  }
}

export const audioSystem = new AudioEventEmitter();
