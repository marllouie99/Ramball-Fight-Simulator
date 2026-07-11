// ─────────────────────────────────────────────
// BERSERKER RAGE EFFECT
// Creates an impactful blood-red visual burst when Berserker enters rage
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';

/**
 * Spawns an impactful rage visual effect at the Berserker's position.
 * @param {Object} berserker - The Berserker fighter
 */
export function spawnBerserkerRageEffect(berserker) {
  const particleCount = 30;
  const color = '#ff0000'; // Blood red
  const secondaryColor = '#ff4444'; 
  
  // Create outward explosive particles
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
    const speed = 4 + Math.random() * 5; // Fast burst
    
    state.berserkerRageEffects.push({
      x: berserker.x,
      y: berserker.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: berserker.r * (0.15 + Math.random() * 0.25),
      color: Math.random() > 0.5 ? color : secondaryColor,
      life: 1.0,
      decay: 0.02 + Math.random() * 0.03, // fade quickly
      type: 'burst'
    });
  }
  
  // Add a central flash (shockwave ring)
  state.berserkerRageEffects.push({
    x: berserker.x,
    y: berserker.y,
    size: berserker.r,
    maxSize: berserker.r * 3.5, // expands very large
    color: color,
    life: 1.0,
    decay: 0.05,
    type: 'shockwave'
  });

  // Add a bright inner flash
  state.berserkerRageEffects.push({
    x: berserker.x,
    y: berserker.y,
    size: berserker.r * 0.5,
    maxSize: berserker.r * 2.0,
    color: '#ffffff', // White hot center
    life: 1.0,
    decay: 0.08,
    type: 'flash'
  });
}

/**
 * Updates all berserker rage effects.
 */
export function updateBerserkerRageEffects() {
  for (let i = state.berserkerRageEffects.length - 1; i >= 0; i--) {
    const effect = state.berserkerRageEffects[i];
    
    if (effect.type === 'shockwave') {
      effect.size += (effect.maxSize - effect.size) * 0.25;
      effect.life -= effect.decay;
    } else if (effect.type === 'flash') {
      effect.size += (effect.maxSize - effect.size) * 0.15;
      effect.life -= effect.decay;
    } else {
      effect.x += effect.vx;
      effect.y += effect.vy;
      
      // Intense slowdown (friction)
      effect.vx *= 0.85;
      effect.vy *= 0.85;
      
      effect.size *= 0.92;
      
      effect.life -= effect.decay;
    }
    
    if (effect.life <= 0) {
      state.berserkerRageEffects.splice(i, 1);
    }
  }
}

/**
 * Draws all berserker rage effects.
 */
export function drawBerserkerRageEffects() {
  const { ctx } = state;
  
  for (const effect of state.berserkerRageEffects) {
    ctx.save();
    
    if (effect.type === 'shockwave') {
      ctx.globalAlpha = effect.life * 0.6;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.lineWidth = 4 * effect.life;
      ctx.strokeStyle = effect.color;
      ctx.stroke();
    } else if (effect.type === 'flash') {
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
