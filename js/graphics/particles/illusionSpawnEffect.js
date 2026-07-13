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
  const particleCount = 35; // Increased particle count
  const smokeColor = '#9b59b6'; // Deep purple
  const sparkColor = '#f1c40f'; // Bright yellow/gold for contrast

  // 1. Central Implosion/Explosion Ring
  for (let i = 0; i < 15; i++) {
    const angle = (Math.PI * 2 * i) / 15;
    const speed = 3 + Math.random() * 2;
    state.illusionSpawnEffects.push({
      x: illusion.x,
      y: illusion.y,
      vx: Math.cos(angle) * speed * 0.5,
      vy: Math.sin(angle) * speed * 0.5,
      size: illusion.r * (0.1 + Math.random() * 0.2),
      color: smokeColor,
      life: 1.0,
      decay: 0.02 + Math.random() * 0.015,
      type: 'ring'
    });
  }

  // 2. Smoky Burst
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2.5;
    state.illusionSpawnEffects.push({
      x: illusion.x,
      y: illusion.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: illusion.r * (0.4 + Math.random() * 0.5),
      color: smokeColor,
      life: 1.0,
      decay: 0.015 + Math.random() * 0.01,
      type: 'smoke'
    });
  }
  
  // 3. Sharp Sparks
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 3;
    state.illusionSpawnEffects.push({
      x: illusion.x,
      y: illusion.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 2,
      color: sparkColor,
      life: 1.0,
      decay: 0.04 + Math.random() * 0.02,
      type: 'spark'
    });
  }
}

/**
 * Updates all illusion spawn effects.
 */
export function updateIllusionSpawnEffects() {
  for (let i = state.illusionSpawnEffects.length - 1; i >= 0; i--) {
    const p = state.illusionSpawnEffects[i];
    
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;

    switch (p.type) {
      case 'ring':
        // Move outwards then slow down and fade
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.size *= 0.98;
        break;
      case 'smoke':
        // Billow and fade, slowing down significantly
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.size *= 0.96;
        break;
      case 'spark':
        // Fast, sharp decay, no slowdown
        p.vx *= 0.98; // a little drag
        p.vy *= 0.98;
        break;
    }
    
    if (p.life <= 0) {
      state.illusionSpawnEffects.splice(i, 1);
    }
  }
}

/**
 * Draws all illusion spawn effects.
 */
export function drawIllusionSpawnEffects() {
  const { ctx } = state;
  
  for (const p of state.illusionSpawnEffects) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);

    switch (p.type) {
      case 'ring':
        // Draw as a soft circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.filter = 'blur(2px)';
        ctx.fill();
        break;

      case 'smoke':
        // Use a radial gradient for a soft, smoky feel
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, `${p.color}bf`); // Hex with alpha (75%)
        gradient.addColorStop(1, `${p.color}00`); // Hex with alpha (0%)
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'spark':
        // Draw as a sharp, rotating line for a glint effect
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 0.5, p.y - p.vy * 0.5);
        ctx.lineTo(p.x + p.vx * 0.5, p.y + p.vy * 0.5);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.stroke();
        break;
    }
    
    ctx.restore();
  }
}
