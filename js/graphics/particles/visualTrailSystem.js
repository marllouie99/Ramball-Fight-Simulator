// ─────────────────────────────────────────────
// VISUAL TRAIL SYSTEM & ZERO-GC POOLING
// ─────────────────────────────────────────────
// Eliminates OBS recording sluggishness and Garbage Collection pauses
// by replacing .splice() / .shift() with fast swap-and-pop and max capacity capping.

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

export function pushTrailCap(arr, item, maxCap = 25) {
  if (!arr) return;

  let effectiveCap = maxCap;
  if (typeof window !== 'undefined' && window.state) {
    const state = window.state;
    const fps = state.fps || 60;
    const quality = state.qualityLevel || 1.0;
    
    // Dynamically throttle the maximum trail size if the game loop drops below 55 FPS
    if (fps < 52 || quality < 0.75) {
      effectiveCap = Math.max(6, Math.floor(maxCap * 0.45)); // Reduce max trail size by 55%
    } else if (fps < 56 || quality < 0.9) {
      effectiveCap = Math.max(10, Math.floor(maxCap * 0.7)); // Reduce max trail size by 30%
    }
  }

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
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.maxSize;
    if (this.count < this.maxSize) {
      this.count++;
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
