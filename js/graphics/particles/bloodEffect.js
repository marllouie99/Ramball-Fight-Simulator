// ─────────────────────────────────────────────
// BLOOD EFFECT
// Small particle effect when fighters take damage
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { GAME_MODES } from '../../core/modeConfig.js';

import { CONFIG } from '../../core/config.js';

/**
 * Spawns a blood effect at the fighter's position.
 * Particles spray outward from the damage direction.
 * @param {Object} fighter - The fighter that took damage
 * @param {number} amount - Damage amount (affects particle count/size)
 * @param {number} damageAngle - Angle of the damage direction (radians), null for random
 */
export function spawnBloodEffect(fighter, amount = 10, damageAngle = null) {
  const isMulti = state && (state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.FFA);

  // Allow far more blood particles so they can accumulate on the floor
  const qualityMultiplier = state.qualityLevel || 1.0;
  let MAX_BLOOD_PARTICLES = Math.floor((isMulti ? 200 : 400) * qualityMultiplier);

  // OPTIMIZED: Reduce particle count based on quality level
  const baseParticleCount = Math.max(2, Math.floor(amount / 3));
  const particleCount = Math.max(1, Math.floor(baseParticleCount * qualityMultiplier));

  let color = fighter.color || '#e60000';
  // Increase saturation/depth for standard team/fighter colors so they pop on white
  if (color === '#ff4d4d' || color === '#ff4444') color = '#e60000';
  else if (color === '#4da3ff') color = '#0066ff';
  else if (color === '#ffd700') color = '#ff9900';
  else if (color === '#4dff4d') color = '#00cc00';

  for (let i = 0; i < particleCount; i++) {
    // If we reached the global limit, properly remove the oldest blood particle
    if (state.bloodEffects.length >= MAX_BLOOD_PARTICLES) {
      state.bloodEffects.shift();
    }
    // Random angle for each particle
    let angle = Math.random() * Math.PI * 2;
    // Massive initial burst speed for a horizontal spray
    const speed = 12 + Math.random() * 20;

    // If damage angle is provided, bias particles in the damage direction
    if (damageAngle !== null) {
      // Create a sharp, directed cone spray ('<') away from the attacker
      const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.6; // ~108 degree cone
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
      life: 1.0,           
      decay: 0.001 + Math.random() * 0.001, 
      airResistance: 0.94, // Lighter air friction so they fly further
      friction: 0.90,      // Ground friction
    });
  }
}

/**
 * Updates all blood effects.
 */
export function updateBloodEffects() {
  const arenaBottom = CONFIG.arena.y + CONFIG.arena.height;

  for (let i = state.bloodEffects.length - 1; i >= 0; i--) {
    const effect = state.bloodEffects[i];

    // Air resistance slows the blood down slightly as it flies
    effect.vx *= effect.airResistance;
    effect.vy *= effect.airResistance;

    // Apply low gravity so it shoots out straight before falling
    effect.vy += 0.15;

    // Update position
    effect.x += effect.vx;
    effect.y += effect.vy;

    // Check for floor collision
    if (effect.y >= arenaBottom - effect.size / 2) {
      effect.y = arenaBottom - effect.size / 2;
      effect.vy *= -0.2; // Slight bounce
      effect.vx *= effect.friction; // Slow down quickly when sliding on the floor
    }

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
    // Remove 'lighter' composite operation so blood stays red on white background
    ctx.translate(effect.x, effect.y);

    // Spin the tiny cubes/squares as they fly outward
    const rotation = (effect.vx + effect.vy) * effect.life * 0.5;
    ctx.rotate(rotation);

    ctx.globalAlpha = effect.life;
    ctx.fillStyle = effect.color;
    // Render as sharp digital square/cube shards
    ctx.fillRect(-effect.size / 2, -effect.size / 2, effect.size, effect.size);
    
    // Add dark stroke so it stands out against the white background
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-effect.size / 2, -effect.size / 2, effect.size, effect.size);

    ctx.restore();
  }
}