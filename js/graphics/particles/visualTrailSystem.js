import { CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';
import { MODE_SETTINGS, GAME_MODES } from '../../core/modeConfig.js';

/**
 * Fast zero-GC array cleanup using swap-and-pop instead of Array.prototype.splice.
 * @param {Array} arr - The array of visual objects (afterimages, slashes, sparks)
 * @param {Function} updateFn - Function receiving (item, index), returning true to keep or false to remove
 */
export function fastCleanArray(arr, updateFn) {
  if (!arr || arr.length === 0) return;
  for (let i = arr.length - 1; i >= 0; i--) {
    const keep = updateFn(arr[i], i);
    if (!keep) {
      // Swap with last element and pop (O(1) instead of O(N) splice)
      arr[i] = arr[arr.length - 1];
      arr.pop();
    }
  }
}

/**
 * Returns the effective maximum afterimage capacity based on current game mode and performance state.
 * @param {number} fallbackCap - Default fallback cap if no mode limit is configured
 * @returns {number}
 */
export function getEffectiveAfterimageLimit(fallbackCap = 25) {
  let effectiveCap = fallbackCap;
  const curState = (typeof state !== 'undefined') ? state : (typeof window !== 'undefined' ? window.state : null);

  if (curState && curState.mode) {
    const currentMode = curState.mode;

    // Check mode settings from modeConfig.js first
    const modeSetting = (typeof MODE_SETTINGS !== 'undefined' && MODE_SETTINGS[currentMode])
      || (typeof MODE_SETTINGS !== 'undefined' && (
        currentMode.includes('1v2') ? MODE_SETTINGS[GAME_MODES.STAND_OFF_1V2] :
        (currentMode === 'Stand Off' || currentMode === 'StandOff') ? MODE_SETTINGS[GAME_MODES.STAND_OFF] :
        null
      ));

    if (modeSetting && modeSetting.maxAfterimages !== undefined) {
      effectiveCap = Math.min(effectiveCap, modeSetting.maxAfterimages);
    } else if (typeof CONFIG !== 'undefined') {
      const is1v2 = currentMode.includes('1v2') || currentMode === '1v2' || currentMode === 'STAND_OFF_1V2';
      const isStandOff = currentMode === 'Stand Off' || currentMode === 'StandOff' || currentMode === 'STAND_OFF';

      if (is1v2 && (CONFIG.standOff1v2?.maxAfterimages !== undefined || CONFIG.oneVsTwo?.maxAfterimages !== undefined)) {
        const limit1v2 = CONFIG.standOff1v2?.maxAfterimages ?? CONFIG.oneVsTwo?.maxAfterimages;
        effectiveCap = Math.min(effectiveCap, limit1v2);
      } else if (isStandOff && CONFIG.standOff?.maxAfterimages !== undefined) {
        effectiveCap = Math.min(effectiveCap, CONFIG.standOff.maxAfterimages);
      }
    }

    const fps = (curState.fps !== undefined && curState.fps > 0) ? curState.fps : 60;
    const quality = (curState.qualityLevel !== undefined) ? curState.qualityLevel : 1.0;
    
    // Dynamically throttle the maximum trail size if the game loop drops below 55 FPS
    if (fps < 52 || quality < 0.75) {
      effectiveCap = Math.max(3, Math.floor(effectiveCap * 0.45)); // Reduce max trail size by 55%
    } else if (fps < 56 || quality < 0.9) {
      effectiveCap = Math.max(5, Math.floor(effectiveCap * 0.7)); // Reduce max trail size by 30%
    }
  }

  return effectiveCap;
}

export function pushTrailCap(arr, item, maxCap = 25) {
  if (!arr) return;

  const effectiveCap = getEffectiveAfterimageLimit(maxCap);

  // Quickly trim the array down to the new target capacity using pop() to prevent memory/GC churn
  while (arr.length > effectiveCap) {
    arr.pop();
  }

  if (arr.length >= effectiveCap) {
    // Fast O(N) shift or overwrite without growing memory footprint
    for (let i = 0; i < arr.length - 1; i++) {
      arr[i] = arr[i + 1];
    }
    arr[arr.length - 1] = item;
  } else {
    arr.push(item);
  }
}

/**
 * Ring Buffer implementation for high-frequency afterimages (e.g. Gojo speed trails, Toji stealth motion).
 * Allocates a fixed-size array once and cycles pointers without creating garbage.
 */
export class RingBufferTrail {
  constructor(maxSize = 25) {
    this.maxSize = maxSize;
    this.buffer = new Array(maxSize);
    this.head = 0;
    this.count = 0;
  }

  add(item) {
    const effectiveMaxSize = getEffectiveAfterimageLimit(this.maxSize);

    this.buffer[this.head] = item;
    this.head = (this.head + 1) % effectiveMaxSize;
    if (this.count < effectiveMaxSize) {
      this.count++;
    } else if (this.count > effectiveMaxSize) {
      this.count = effectiveMaxSize;
    }
  }

  update(decayRate = 0.03) {
    for (let i = 0; i < this.count; i++) {
      const item = this.buffer[i];
      if (item && item.alpha !== undefined) {
        item.alpha -= decayRate;
        if (item.alpha <= 0) {
          item.alpha = 0;
        }
      } else if (item && item.timer !== undefined) {
        item.timer--;
      }
    }
  }

  forEachActive(callback) {
    for (let i = 0; i < this.count; i++) {
      const item = this.buffer[i];
      if (item && ((item.alpha !== undefined && item.alpha > 0) || (item.timer !== undefined && item.timer > 0))) {
        callback(item);
      }
    }
  }

  clear() {
    this.count = 0;
    this.head = 0;
  }
}
