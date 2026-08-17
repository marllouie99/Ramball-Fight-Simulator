// ─────────────────────────────────────────────
// ILLUSION DEATH EFFECT
// Creates a ghostly dissolving effect when illusions die
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { illusionDeathPool } from '../objectPool.js';

/**
 * Spawns an illusion death effect at the illusion's position.
 * Ethereal dissolving effect with purple magical particles.
 * @param {Object} illusion - The illusion that died
 */
export function spawnIllusionDeath(illusion) {
  const scale = Math.max(0.25, illusion.r / 25);
  const is1v2 = typeof state !== 'undefined' && state.mode && (state.mode === '1v2' || state.mode.includes('1v2'));
  const particleCount = Math.ceil((is1v2 ? 10 : 20) * scale);  // Number of ethereal particles
  const wispCount = Math.ceil((is1v2 ? 4 : 8) * scale);
  const color = illusion.color || '#9966ff'; // Purple by default

  // Create dissolving particles that float upward
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.8;
    const speed = 1 + Math.random() * 2.5;

    // Random size for particles
    const size = illusion.r * (0.1 + Math.random() * 0.2);

    // Acquire from pool instead of allocating new object
    const particle = illusionDeathPool.acquire();
    particle.x = illusion.x + (Math.random() - 0.5) * illusion.r * 0.8;
    particle.y = illusion.y + (Math.random() - 0.5) * illusion.r * 0.8;
    particle.vx = Math.cos(angle) * speed * 0.5;  // Reduced horizontal velocity
    particle.vy = -Math.random() * 2 - 0.5;        // Float upward
    particle.size = size;
    particle.color = color;
    particle.life = 1.0;
    particle.decay = 0.015 + Math.random() * 0.01; // Slow fade for ethereal feel
    particle.wobblePhase = Math.random() * Math.PI * 2; // For gentle side-to-side motion
    particle.wobbleSpeed = 0.05 + Math.random() * 0.05;
    particle.type = 'particle';
    state.illusionDeathEffects.push(particle);
  }

  // Add a central glow burst
  const glow = illusionDeathPool.acquire();
  glow.x = illusion.x;
  glow.y = illusion.y;
  glow.vx = 0;
  glow.vy = 0;
  glow.size = illusion.r * 0.5;
  glow.maxSize = illusion.r * 2.5;
  glow.color = color;
  glow.life = 1.0;
  glow.decay = 0.04; // Quick flash
  glow.type = 'glow';
  state.illusionDeathEffects.push(glow);

  // Add swirling wisps around the death point
  for (let i = 0; i < wispCount; i++) {
    const angle = (Math.PI * 2 * i) / Math.max(1, wispCount);
    const dist = illusion.r * 0.3;

    const wisp = illusionDeathPool.acquire();
    wisp.x = illusion.x + Math.cos(angle) * dist;
    wisp.y = illusion.y + Math.sin(angle) * dist;
    wisp.vx = Math.cos(angle) * 1.5;
    wisp.vy = Math.sin(angle) * 1.5 - 1; // Spiral outward and up
    wisp.size = illusion.r * 0.08;
    wisp.color = '#ffffff';
    wisp.life = 1.0;
    wisp.decay = 0.025;
    wisp.wobblePhase = Math.random() * Math.PI * 2;
    wisp.wobbleSpeed = 0.1;
    wisp.type = 'wisp';
    state.illusionDeathEffects.push(wisp);
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

    // Remove dead effects — return to pool instead of dropping
    if (effect.life <= 0) {
      // Swap-and-pop is O(1) instead of O(n) splice()
      state.illusionDeathEffects[i] = state.illusionDeathEffects[state.illusionDeathEffects.length - 1];
      state.illusionDeathEffects.pop();
      illusionDeathPool.release(effect);
    }
  }
}

/**
 * Draws all illusion death effects.
 */
export function drawIllusionDeathEffects() {
  const { ctx } = state;
  
  for (const effect of state.illusionDeathEffects) {
    // Manual state backup for illusion death effects
    const prevFill = ctx.fillStyle;
    const prevAlpha = ctx.globalAlpha;
    
    if (effect.type === 'glow') {
      // Draw expanding glow ring
      const gradient = ctx.createRadialGradient(
        effect.x, effect.y, 0,
        effect.x, effect.y, effect.size
      );
      gradient.addColorStop(0, `rgba(217, 70, 239, ${effect.life * 0.65})`);
      gradient.addColorStop(0.5, `rgba(192, 38, 211, ${effect.life * 0.35})`);
      gradient.addColorStop(1, `rgba(147, 51, 234, 0)`);
      
      ctx.globalAlpha = effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
    } else if (effect.type === 'wisp') {
      // Draw small wisps
      ctx.globalAlpha = effect.life * 0.8;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.fillStyle = effect.color || '#D946EF';
      ctx.fill();
      
    } else {
      // Draw dissolving particles
      ctx.globalAlpha = effect.life * 0.7;
      
      // Create gradient for particle
      const gradient = ctx.createRadialGradient(
        effect.x, effect.y, 0,
        effect.x, effect.y, effect.size
      );
      gradient.addColorStop(0, effect.color || '#C026D3');
      gradient.addColorStop(0.6, `rgba(192, 38, 211, ${effect.life * 0.5})`);
      gradient.addColorStop(1, `rgba(147, 51, 234, 0)`);
      
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
    
    // Restore illusion death effect states
    ctx.fillStyle = prevFill;
    ctx.globalAlpha = prevAlpha;
  }
}