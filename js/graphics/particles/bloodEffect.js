// ─────────────────────────────────────────────
// BLOOD EFFECT
// Small particle effect when fighters take damage
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { GAME_MODES } from '../../core/modeConfig.js';

/**
 * Spawns a blood effect at the fighter's position.
 * Particles spray outward from the damage direction.
 * @param {Object} fighter - The fighter that took damage
 * @param {number} amount - Damage amount (affects particle count/size)
 * @param {number} damageAngle - Angle of the damage direction (radians), null for random
 */
export function spawnBloodEffect(fighter, amount = 10, damageAngle = null) {
  const isMulti = state && (state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.FFA);
  
  // OPTIMIZED: Apply quality level to blood particle limits
  const qualityMultiplier = state.qualityLevel || 1.0;
  let MAX_BLOOD_PARTICLES = Math.floor((isMulti ? 20 : 100) * qualityMultiplier);
  
  // OPTIMIZED: Reduce particle count based on quality level
  const baseParticleCount = Math.max(2, Math.floor(amount / 3));
  const particleCount = Math.max(1, Math.floor(baseParticleCount * qualityMultiplier));
  
  const color = fighter.color || '#ff4444';
  
  for (let i = 0; i < particleCount; i++) {
    // If we reached the global limit, remove the oldest blood particle using swap-and-pop
    if (state.bloodEffects.length >= MAX_BLOOD_PARTICLES) {
      // Swap-and-pop is O(1) instead of O(n) shift()
      state.bloodEffects[0] = state.bloodEffects[state.bloodEffects.length - 1];
      state.bloodEffects.pop();
    }
    // Random angle for each particle
    let angle = Math.random() * Math.PI * 2;
    // Faster speed for more impact
    const speed = 2 + Math.random() * 3;
    
    // If damage angle is provided, bias particles in the damage direction
    if (damageAngle !== null) {
      // Wider spread in the damage direction (90 degree spread)
      const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.5;
      angle = damageAngle + spreadAngle;
    }
    
    // Bigger particles (3-6 pixels) for more visibility
    const size = 3 + Math.random() * 3;
    
    state.bloodEffects.push({
      x: fighter.x + (Math.random() - 0.5) * fighter.r * 0.5,
      y: fighter.y + (Math.random() - 0.5) * fighter.r * 0.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: size,
      color: color,
      life: 1.0,           // 1.0 = full life, 0 = dead
      decay: 0.006 + Math.random() * 0.006, // 1.5-3 seconds to fade
      friction: 0.94,     // Slow down over time
    });
  }
}

/**
 * Updates all blood effects.
 */
export function updateBloodEffects() {
  for (let i = state.bloodEffects.length - 1; i >= 0; i--) {
    const effect = state.bloodEffects[i];
    
    // Update position (spread outward)
    effect.x += effect.vx;
    effect.y += effect.vy;
    
    // Slow down over time (friction to stop spreading)
    effect.vx *= effect.friction;
    effect.vy *= effect.friction;
    
    // Fade out
    effect.life -= effect.decay;
    
    // Remove dead effects
    if (effect.life <= 0) {
      state.bloodEffects.splice(i, 1);
    }
  }
}

/**
 * Draws all blood effects.
 */
export function drawBloodEffects() {
  const { ctx } = state;
  for (const effect of state.bloodEffects) {
    ctx.save();
    ctx.globalAlpha = effect.life;
    
    // Draw a small circle for blood particle
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
    ctx.fillStyle = effect.color;
    ctx.fill();
    
    ctx.restore();
  }
}