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
    spark.type = type; // 'crimson', 'flash', or 'crimsonSniper'
    if (type === 'crimsonSniper') {
      const rand = Math.random();
      // Black, Crimson, and White shards for anime style
      spark.color = rand > 0.65 ? 'rgba(0, 0, 0, 1)' : (rand > 0.25 ? 'rgba(200, 0, 0, 1)' : 'rgba(255, 255, 255, 1)');
    } else if (type === 'flash') {
      spark.color = 'rgba(255, 200, 100, 1)';
    } else {
      spark.color = `rgba(255, ${50 + Math.random() * 100}, ${20 + Math.random() * 50}, 1)`;
    }

    state.sparkEffects.push(spark);
  }
}

/**
 * Spawns an impact flash (visual-only).
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} radius - Flash radius
 */
export function spawnImpactFlash(x, y, radius = 20, type = 'default') {
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
  flash.type = type === 'crimsonSniper' ? 'crimsonSniperFlash' : 'flash';
  flash.isFlash = true;
  flash.color = 'rgba(255, 255, 255, 1)'; // Unused for flashes, handled by gradients

  state.sparkEffects.push(flash);
}

/**
 * Spawns a massive crimson lightning shockwave impact effect.
 * Used when the enhanced execute bullet hits a wall or pierces through a target.
 * Creates expanding jagged rings + radial lightning arcs.
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} radius - Base radius
 */
export function spawnCrimsonLightningImpact(x, y, radius = 60) {
  // 1. Bright white-crimson core flash
  const coreFlash = _getSpark();
  coreFlash.x = x;
  coreFlash.y = y;
  coreFlash.vx = 0;
  coreFlash.vy = 0;
  coreFlash.size = radius * 0.6;
  coreFlash.life = 1.0;
  coreFlash.decay = 0.08;
  coreFlash.type = 'crimsonLightningCore';
  coreFlash.isFlash = true;
  coreFlash.friction = 1;
  coreFlash.color = 'white';
  state.sparkEffects.push(coreFlash);

  // 2. Expanding crimson shockwave rings (2 rings at different speeds)
  for (let ring = 0; ring < 2; ring++) {
    const ringEffect = _getSpark();
    ringEffect.x = x;
    ringEffect.y = y;
    ringEffect.vx = 0;
    ringEffect.vy = 0;
    ringEffect.size = radius * 0.2; // starts small, expands
    ringEffect.targetSize = radius * (1.5 + ring * 0.8); // expand target
    ringEffect.life = 1.0;
    ringEffect.decay = 0.04 + ring * 0.02;
    ringEffect.type = 'crimsonLightningRing';
    ringEffect.isFlash = true;
    ringEffect.friction = 1;
    ringEffect.color = 'crimson';
    state.sparkEffects.push(ringEffect);
  }

  // 3. Radial lightning arc sparks shooting outward
  const arcCount = 8 + Math.floor(Math.random() * 4);
  for (let i = 0; i < arcCount; i++) {
    const angle = (i / arcCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const speed = 4 + Math.random() * 6;
    const spark = _getSpark();
    spark.x = x;
    spark.y = y;
    spark.vx = Math.cos(angle) * speed;
    spark.vy = Math.sin(angle) * speed;
    spark.size = 2 + Math.random() * 3;
    spark.life = 1.0;
    spark.decay = 0.03 + Math.random() * 0.03;
    spark.friction = 0.95;
    spark.type = 'crimsonLightningArc';
    spark.isFlash = false;
    spark.angle = angle; // store for drawing direction
    // Alternate between crimson, dark red, white
    const rand = Math.random();
    spark.color = rand > 0.7 ? 'rgba(255, 255, 255, 1)' : (rand > 0.3 ? 'rgba(255, 30, 30, 1)' : 'rgba(150, 0, 0, 1)');
    state.sparkEffects.push(spark);
  }
}

/**
 * Spawns a massive scorch mark decal on the ground.
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {number} radius - The size of the scorch mark
 * @param {number} durationFrames - How many frames the scorch persists
 */
export function spawnGroundScorch(x, y, radius, durationFrames = 120) {
  const scorch = _getSpark();
  scorch.x = x;
  scorch.y = y;
  scorch.vx = 0;
  scorch.vy = 0;
  scorch.size = radius;
  scorch.life = 1.0;
  scorch.decay = 1.0 / durationFrames;
  scorch.type = 'crimsonGroundScorch';
  scorch.isFlash = true; // Hook into the flash rendering block

  // 1. Generate an organic, jagged scorch boundary
  scorch.points = scorch.points || [];
  scorch.points.length = 0;
  const numPoints = 16;
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const r = radius * (0.6 + Math.random() * 0.5);
    scorch.points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r * 0.5 }); // squished for perspective
  }

  // 2. Generate detailed, static branching cracks
  scorch.cracks = scorch.cracks || [];
  scorch.cracks.length = 0;
  const numCracks = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < numCracks; i++) {
    const angle = (i / numCracks) * Math.PI * 2 + (Math.random() - 0.5);
    const crackLength = radius * (0.8 + Math.random() * 0.6);
    let cx = 0, cy = 0;
    const path = [{ x: cx, y: cy }];
    const segments = 4 + Math.floor(Math.random() * 3);
    let currentAngle = angle;
    
    for (let s = 1; s <= segments; s++) {
      currentAngle += (Math.random() - 0.5) * 1.5; // Wander
      const segLen = crackLength / segments;
      cx += Math.cos(currentAngle) * segLen;
      cy += Math.sin(currentAngle) * segLen * 0.5;
      path.push({ x: cx, y: cy });
      
      // Generate a sub-branch occasionally
      if (Math.random() > 0.6) {
         let bx = cx, by = cy;
         let branchAngle = currentAngle + (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.6);
         const branchPath = [{ x: bx, y: by }];
         for (let b = 0; b < 2; b++) {
            bx += Math.cos(branchAngle) * (segLen * 0.8);
            by += Math.sin(branchAngle) * (segLen * 0.8) * 0.5;
            branchPath.push({ x: bx, y: by });
         }
         scorch.cracks.push(branchPath);
      }
    }
    scorch.cracks.push(path);
  }

  state.sparkEffects.push(scorch);
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
      if (effect.type === 'crimsonLightningCore') {
        // Blinding white-to-crimson radial core flash
        const gradient = ctx.createRadialGradient(
          effect.x, effect.y, 0,
          effect.x, effect.y, effect.size
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${0.9 * effect.life})`);
        gradient.addColorStop(0.3, `rgba(255, 120, 120, ${0.7 * effect.life})`);
        gradient.addColorStop(0.6, `rgba(200, 0, 0, ${0.4 * effect.life})`);
        gradient.addColorStop(1, 'rgba(80, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      } else if (effect.type === 'crimsonGroundScorch') {
        // Massive, highly-detailed organic scorch mark burned into the ground
        ctx.globalCompositeOperation = 'multiply';
        
        ctx.translate(effect.x, effect.y);

        // Deep black/red burned organic polygon
        ctx.fillStyle = `rgba(30, 0, 0, ${effect.life * 0.8})`;
        ctx.beginPath();
        if (effect.points && effect.points.length > 0) {
          ctx.moveTo(effect.points[0].x, effect.points[0].y);
          for (let i = 1; i < effect.points.length; i++) {
            ctx.lineTo(effect.points[i].x, effect.points[i].y);
          }
        }
        ctx.closePath();
        ctx.fill();
        
        // Inner molten branching cracks
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = `rgba(255, 60, 10, ${effect.life * 0.8})`;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 1 + effect.life * 1.5;
        
        ctx.beginPath();
        if (effect.cracks) {
          for (const path of effect.cracks) {
            if (path.length > 0) {
              ctx.moveTo(path[0].x, path[0].y);
              for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y);
              }
            }
          }
        }
        ctx.stroke();
        
        // Darker outer cracks for depth
        ctx.strokeStyle = `rgba(40, 0, 0, ${effect.life * 0.9})`;
        ctx.lineWidth = 2 + effect.life * 2;
        ctx.globalCompositeOperation = 'multiply';
        ctx.stroke();
        
        ctx.translate(-effect.x, -effect.y);
        ctx.globalCompositeOperation = 'source-over';
      } else if (effect.type === 'crimsonLightningRing') {
        // Expanding jagged crimson shockwave ring
        // Expand size toward target
        if (effect.targetSize) {
          effect.size += (effect.targetSize - effect.size) * 0.15;
        }
        ctx.strokeStyle = `rgba(200, 0, 0, ${effect.life * 0.8})`;
        ctx.lineWidth = 3 * effect.life;
        ctx.beginPath();
        // Draw jagged circle instead of smooth
        const segments = 24;
        for (let seg = 0; seg <= segments; seg++) {
          const theta = (seg / segments) * Math.PI * 2;
          const jitter = (Math.random() - 0.5) * effect.size * 0.15;
          const rx = effect.x + Math.cos(theta) * (effect.size + jitter);
          const ry = effect.y + Math.sin(theta) * (effect.size + jitter);
          if (seg === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.stroke();
        // Inner white ring
        ctx.strokeStyle = `rgba(255, 200, 200, ${effect.life * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let seg = 0; seg <= segments; seg++) {
          const theta = (seg / segments) * Math.PI * 2;
          const jitter = (Math.random() - 0.5) * effect.size * 0.1;
          const rx = effect.x + Math.cos(theta) * (effect.size * 0.85 + jitter);
          const ry = effect.y + Math.sin(theta) * (effect.size * 0.85 + jitter);
          if (seg === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.stroke();
      } else if (effect.type === 'crimsonSniperFlash') {
        // Impact flash - radial gradient glow
        const gradient = ctx.createRadialGradient(
          effect.x, effect.y, 0,
          effect.x, effect.y, effect.size
        );
        // Deep crimson core, sharp black edge
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(0.3, 'rgba(200, 0, 20, 0.6)');
        gradient.addColorStop(1, 'rgba(50, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      } else {
        // Default impact flash
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
      }
    } else if (effect.type === 'crimsonLightningArc') {
      // Lightning arc spark — draw as a short jagged line instead of a dot
      const len = effect.size * 4;
      const angle = Math.atan2(effect.vy, effect.vx);
      ctx.strokeStyle = effect.color.replace('1)', `${effect.life})`);
      ctx.lineWidth = 1 + effect.life;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      // 3-segment jagged line
      for (let seg = 1; seg <= 3; seg++) {
        const t = seg / 3;
        const jx = (Math.random() - 0.5) * len * 0.4;
        const jy = (Math.random() - 0.5) * len * 0.4;
        ctx.lineTo(
          effect.x + Math.cos(angle) * len * t + jx,
          effect.y + Math.sin(angle) * len * t + jy
        );
      }
      ctx.stroke();
    } else {
      // Standard spark - small glowing dot with gradient
      const gradient = ctx.createRadialGradient(
        effect.x, effect.y, 0,
        effect.x, effect.y, effect.size
      );
      gradient.addColorStop(0, effect.color);
      gradient.addColorStop(0.5, effect.color.replace('1)', '0.6)'));
      
      if (effect.type === 'crimsonSniper') {
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
      }

      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.restore();
  }
}