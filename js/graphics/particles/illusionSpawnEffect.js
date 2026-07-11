// ─────────────────────────────────────────────
// ILLUSION SPAWN EFFECT
// Creates a smooth ethereal visual effect when illusions spawn
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';

/**
 * Spawns an illusion spawn effect at the illusion's position.
 * @param {Object} illusion - The illusion that was spawned
 */
export function spawnIllusionSpawn(illusion) {
  const particleCount = 15;
  const color = illusion.color || '#9966ff'; // Purple by default
  
  // Create outward burst particles
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount;
    const speed = 2 + Math.random() * 2;
    
    state.illusionSpawnEffects.push({
      x: illusion.x,
      y: illusion.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: illusion.r * (0.2 + Math.random() * 0.3),
      color: color,
      life: 1.0,
      decay: 0.03 + Math.random() * 0.02,
      type: 'burst'
    });
  }
  
  // Add a central flash
  state.illusionSpawnEffects.push({
    x: illusion.x,
    y: illusion.y,
    size: illusion.r * 0.1,
    maxSize: illusion.r * 1.5,
    color: color,
    life: 1.0,
    decay: 0.05,
    type: 'flash'
  });
}

/**
 * Updates all illusion spawn effects.
 */
export function updateIllusionSpawnEffects() {
  for (let i = state.illusionSpawnEffects.length - 1; i >= 0; i--) {
    const effect = state.illusionSpawnEffects[i];
    
    if (effect.type === 'flash') {
      effect.size += (effect.maxSize - effect.size) * 0.2;
      effect.life -= effect.decay;
    } else {
      effect.x += effect.vx;
      effect.y += effect.vy;
      
      // Slow down
      effect.vx *= 0.9;
      effect.vy *= 0.9;
      
      effect.size *= 0.95;
      
      effect.life -= effect.decay;
    }
    
    if (effect.life <= 0) {
      state.illusionSpawnEffects.splice(i, 1);
    }
  }
}

/**
 * Draws all illusion spawn effects.
 */
export function drawIllusionSpawnEffects() {
  const { ctx } = state;
  
  for (const effect of state.illusionSpawnEffects) {
    ctx.save();
    
    if (effect.type === 'flash') {
      ctx.globalAlpha = effect.life * 0.8;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.fillStyle = effect.color;
      ctx.fill();
    } else {
      ctx.globalAlpha = effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.fillStyle = effect.color;
      ctx.fill();
    }
    
    ctx.restore();
  }
}
