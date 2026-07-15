// ─────────────────────────────────────────────
// OBJECT POOL — Reusable particle/effect objects
// Reduces garbage collection by recycling objects
// ─────────────────────────────────────────────

/**
 * Generic object pool for reusing particle/effect objects.
 * @param {number} initialSize - Initial pool size
 * @param {Function} factory - Factory function to create new objects
 */
class ObjectPool {
  constructor(initialSize = 50, factory = null) {
    this.factory = factory || (() => ({}));
    this.pool = [];
    this.active = new Set();

    // Pre-populate the pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  acquire() {
    let obj = this.pool.pop();
    if (!obj) {
      obj = this.factory();
    }
    this.active.add(obj);
    return obj;
  }

  release(obj) {
    if (!obj) return;
    // Reset common properties
    obj.x = 0;
    obj.y = 0;
    obj.vx = 0;
    obj.vy = 0;
    obj.size = 0;
    obj.color = '';
    obj.life = 0;
    obj.decay = 0;
    obj.wobblePhase = 0;
    obj.wobbleSpeed = 0;
    obj.type = '';
    obj.maxSize = 0;

    this.active.delete(obj);
    this.pool.push(obj);
  }

  clear() {
    while (this.pool.length > 0) {
      this.pool.pop();
    }
    this.active.clear();
    // Re-populate with fresh objects
    for (let i = 0; i < 50; i++) {
      this.pool.push(this.factory());
    }
  }
}

// ─────────────────────────────────────────────
// POOL INSTANCES
// ─────────────────────────────────────────────

export const bloodPool = new ObjectPool(100);

export const deathPool = new ObjectPool(50);

export const illusionDeathPool = new ObjectPool(50);

export const berserkerRagePool = new ObjectPool(25);

/**
 * Clears all object pools. Call this when resetting the game.
 */
export function clearAllPools() {
  bloodPool.clear();
  deathPool.clear();
  illusionDeathPool.clear();
  berserkerRagePool.clear();
}