// ─────────────────────────────────────────────
// SPARK EFFECT
// Visual-only particles for bullet impacts (e.g., Crimson Sniper wall hits)
// These bypass physics and collision entirely - pure visual decoration
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';

// ─────────────────────────────────────────────
// OBJECT POOL — eliminates GC thrashing from rapid spark spawn/despawn
// ─────────────────────────────────────────────
const SPARK_POOL_SIZE = 300;
const sparkPool = [];

// Pre-allocate the entire pool at module load time
for (let i = 0; i < SPARK_POOL_SIZE; i++) {
  sparkPool.push({});
}

/**
 * Get a spark particle from pool or create new one (fallback).
 */
function _getSpark() {
  if (sparkPool.length > 0) {
    return sparkPool.pop();
  }
  return {};
}

/**
 * Return a spark particle to pool for reuse.
 * Statically resets properties to keep the engine's hidden class optimized.
 */
function _returnSpark(spark) {
  spark.x = 0;
  spark.y = 0;
  spark.vx = 0;
  spark.vy = 0;
  spark.size = 0;
  spark.life = 0;
  spark.decay = 0;
  spark.friction = 0;
  spark.type = null;
  spark.color = null;
  spark.isFlash = false;
  // Always return to pool (removed size limit to prevent memory waste)
  sparkPool.push(spark);
}

/**
 * Spawns spark effects at a position (visual-only, no collision).
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} count - Number of sparks to spawn
 * @param {string} type - 'crimson' for red/orange sparks, 'flash' for impact flash
 */
export function spawnSparks(x, y, count = 8, type = 'crimson') {
  const isMulti = state && (state.mode === '2v2' || state.mode === 'ffa');
  // OPTIMIZED: Apply quality level to spark limits
  const qualityMultiplier = state.qualityLevel || 1.0;
  const MAX_SPARK_PARTICLES = Math.floor((isMulti ? 100 : 200) * qualityMultiplier);
  
  // OPTIMIZED: Reduce spark count based on quality
  const adjustedCount = Math.max(1, Math.floor(count * qualityMultiplier));

  for (let i = 0; i < adjustedCount; i++) {
    // Remove oldest if at limit — return it to pool first
    if (state.sparkEffects.length >= MAX_SPARK_PARTICLES) {
      const oldest = state.sparkEffects.shift();
      if (oldest) _returnSpark(oldest);
    }

    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;

    const spark = _getSpark();
    spark.x = x;
    spark.y = y;
    spark.vx = Math.cos(angle) * speed;
    spark.vy = Math.sin(angle) * speed;
    spark.size = 1.5 + Math.random() * 3;
    spark.life = 1.0;
    spark.decay = 0.04 + Math.random() * 0.06; // Fade out in ~15-25 frames
    spark.friction = 0.92;
    spark.type = type; // 'crimson' or 'flash'
    spark.color = type === 'flash'
      ? 'rgba(255, 200, 100, 1)'
      : `rgba(255, ${50 + Math.random() * 100}, ${20 + Math.random() * 50}, 1)`;

    state.sparkEffects.push(spark);
  }
}

/**
 * Spawns an impact flash (visual-only).
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} radius - Flash radius
 */
export function spawnImpactFlash(x, y, radius = 20) {
  const isMulti = state && (state.mode === '2v2' || state.mode === 'ffa');
  const MAX_FLASHES = isMulti ? 20 : 40;

  if (state.sparkEffects.length >= MAX_FLASHES) {
    const oldest = state.sparkEffects.shift();
    if (oldest) _returnSpark(oldest);
  }

  const flash = _getSpark();
  flash.x = x;
  flash.y = y;
  flash.vx = 0;
  flash.vy = 0;
  flash.size = radius;
  flash.life = 1.0;
  flash.decay = 0.15; // Fast fade
  flash.type = 'flash';
  flash.isFlash = true;
  flash.color = 'rgba(255, 220, 150, 1)';

  state.sparkEffects.push(flash);
}

/**
 * Updates all spark effects. These decay even when frozen in Cronos sphere.
 * Dead sparks are returned to the pool instead of being spliced out.
 * @param {boolean} frozen - Whether time is stopped (sparks still decay)
 */
export function updateSparkEffects(frozen = false) {
  for (let i = state.sparkEffects.length - 1; i >= 0; i--) {
    const effect = state.sparkEffects[i];

    // Sparks always decay, even when frozen in time sphere
    effect.life -= effect.decay;

    // Only move if not frozen
    if (!frozen) {
      effect.x += effect.vx;
      effect.y += effect.vy;
      effect.vx *= effect.friction;
      effect.vy *= effect.friction;
    }

    // Remove dead effects — return to pool instead of splice
    if (effect.life <= 0) {
      state.sparkEffects.splice(i, 1);
      _returnSpark(effect);
    }
  }
}

/**
 * Draws all spark effects using gradient-based glow (no shadowBlur).
 */
export function drawSparkEffects() {
  const { ctx } = state;
  if (!ctx) return;

  for (const effect of state.sparkEffects) {
    // Skip effects with non-finite coordinates to prevent createRadialGradient errors
    if (!Number.isFinite(effect.x) || !Number.isFinite(effect.y) || !Number.isFinite(effect.size)) continue;

    ctx.save();
    ctx.globalAlpha = effect.life;

    if (effect.isFlash) {
      // Impact flash - radial gradient glow
      const gradient = ctx.createRadialGradient(
        effect.x, effect.y, 0,
        effect.x, effect.y, effect.size
      );
      gradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
      gradient.addColorStop(0.3, 'rgba(255, 180, 80, 0.5)');
      gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
      
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    } else {
      // Spark - small glowing dot with gradient
      const gradient = ctx.createRadialGradient(
        effect.x, effect.y, 0,
        effect.x, effect.y, effect.size
      );
      gradient.addColorStop(0, effect.color);
      gradient.addColorStop(0.5, effect.color.replace('1)', '0.6)'));
      gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.restore();
  }
}