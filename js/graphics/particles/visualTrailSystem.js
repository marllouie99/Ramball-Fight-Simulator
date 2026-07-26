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

/**
 * Pushes a new item to a trail array while enforcing a strict maximum capacity.
 * If capacity is exceeded, the oldest element (index 0) is overwritten or removed without GC churn.
 * @param {Array} arr - The trail array
 * @param {Object} item - The new visual trail item to add
 * @param {number} [maxCap=25] - Maximum allowed items in the trail array
 */
export function pushTrailCap(arr, item, maxCap = 25) {
  if (!arr) return;
  if (arr.length >= maxCap) {
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
