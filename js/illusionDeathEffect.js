// ─────────────────────────────────────────────
// ILLUSION DEATH EFFECT
// Creates a ghostly dissolving effect when illusions die
// ─────────────────────────────────────────────
import { state } from './state.js';

/**
 * Spawns an illusion death effect at the illusion's position.
 * Ethereal dissolving effect with purple magical particles.
 * @param {Object} illusion - The illusion that died
 */
export function spawnIllusionDeath(illusion) {
  const particleCount = 20;  // Number of ethereal particles
  const color = illusion.color || '#9966ff'; // Purple by default
  
  // Create dissolving particles that float upward
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.8;
    const speed = 1 + Math.random() * 2.5;
    
    // Random size for particles
    const size = illusion.r * (0.1 + Math.random() * 0.2);
    
    state.illusionDeathEffects.push({
      x: illusion.x + (Math.random() - 0.5) * illusion.r * 0.8,
      y: illusion.y + (Math.random() - 0.5) * illusion.r * 0.8,
      vx: Math.cos(angle) * speed * 0.5,  // Reduced horizontal velocity
      vy: -Math.random() * 2 - 0.5,        // Float upward
      size: size,
      color: color,
      life: 1.0,
      maxLife: 1.0,
      decay: 0.015 + Math.random() * 0.01, // Slow fade for ethereal feel
      wobblePhase: Math.random() * Math.PI * 2, // For gentle side-to-side motion
      wobbleSpeed: 0.05 + Math.random() * 0.05,
      type: 'particle'
    });
  }
  
  // Add a central glow burst
  state.illusionDeathEffects.push({
    x: illusion.x,
    y: illusion.y,
    vx: 0,
    vy: 0,
    size: illusion.r * 0.5,
    maxSize: illusion.r * 2.5,
    color: color,
    life: 1.0,
    maxLife: 1.0,
    decay: 0.04, // Quick flash
    type: 'glow'
  });
  
  // Add swirling wisps around the death point
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    const dist = illusion.r * 0.3;
    
    state.illusionDeathEffects.push({
      x: illusion.x + Math.cos(angle) * dist,
      y: illusion.y + Math.sin(angle) * dist,
      vx: Math.cos(angle) * 1.5,
      vy: Math.sin(angle) * 1.5 - 1, // Spiral outward and up
      size: illusion.r * 0.08,
      color: '#ffffff',
      life: 1.0,
      maxLife: 1.0,
      decay: 0.025,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.1,
      type: 'wisp'
    });
  }
}

/**
 * Updates all illusion death effects.
 */
export function updateIllusionDeathEffects() {
  for (let i = state.illusionDeathEffects.length - 1; i >= 0; i--) {
    const effect = state.illusionDeathEffects[i];
    
    if (effect.type === 'glow') {
      // Glow expands and fades
      effect.size += (effect.maxSize - effect.size) * 0.15;
      effect.life -= effect.decay;
    } else {
      // Update position with gentle wobble
      effect.wobblePhase += effect.wobbleSpeed;
      const wobble = Math.sin(effect.wobblePhase) * 0.3;
      
      effect.x += effect.vx + wobble;
      effect.y += effect.vy;
      
      // Slow down over time
      effect.vx *= 0.97;
      effect.vy *= 0.98;
      
      // Fade out
      effect.life -= effect.decay;
    }
    
    // Remove dead effects
    if (effect.life <= 0) {
      state.illusionDeathEffects.splice(i, 1);
    }
  }
}

/**
 * Draws all illusion death effects.
 */
export function drawIllusionDeathEffects() {
  const { ctx } = state;
  
  for (const effect of state.illusionDeathEffects) {
    ctx.save();
    
    if (effect.type === 'glow') {
      // Draw expanding glow ring
      const gradient = ctx.createRadialGradient(
        effect.x, effect.y, 0,
        effect.x, effect.y, effect.size
      );
      gradient.addColorStop(0, `rgba(180, 130, 255, ${effect.life * 0.6})`);
      gradient.addColorStop(0.5, `rgba(150, 80, 220, ${effect.life * 0.3})`);
      gradient.addColorStop(1, `rgba(100, 50, 180, 0)`);
      
      ctx.globalAlpha = effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
    } else if (effect.type === 'wisp') {
      // Draw small white wisps
      ctx.globalAlpha = effect.life * 0.8;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.fillStyle = effect.color;
      ctx.fill();
      
    } else {
      // Draw dissolving particles
      ctx.globalAlpha = effect.life * 0.7;
      
      // Create gradient for particle
      const gradient = ctx.createRadialGradient(
        effect.x, effect.y, 0,
        effect.x, effect.y, effect.size
      );
      gradient.addColorStop(0, effect.color);
      gradient.addColorStop(0.6, `rgba(150, 100, 220, ${effect.life * 0.5})`);
      gradient.addColorStop(1, `rgba(100, 50, 180, 0)`);
      
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
    
    ctx.restore();
  }
}