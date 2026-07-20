import { state } from '../../core/state.js';
import { drawThunderRootsEffect } from '../statusEffects.js';
import { playSound } from '../../systems/soundSystem.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';

export function updateLightningEffects() {
  if (!state.zeusStormStrikes) return;
  
  for (let i = state.zeusStormStrikes.length - 1; i >= 0; i--) {
    let strike = state.zeusStormStrikes[i];
    
    // Play thunder strike sound on first frame when strike is created
    if (strike.life === strike.maxLife && !strike.soundPlayed) {
      strike.soundPlayed = true;
      const thunderSound = getSkillEffectSound('zeus', 'thunderstrike');
      if (thunderSound) playSound(thunderSound.src, thunderSound.volume);
    }
    
    strike.life--;
    if (strike.life <= 0) {
      state.zeusStormStrikes.splice(i, 1);
    }
  }
}

export function drawLightningEffects(ctx) {
  if (!state.zeusStormStrikes || state.zeusStormStrikes.length === 0) return;
  
  ctx.save();
  // Removed 'screen' blending because it makes lightning invisible on bright/white backgrounds.
  // 'source-over' (default) ensures the cyan glow is always visible and adds contrast.
  
  for (let i = 0; i < state.zeusStormStrikes.length; i++) {
    let strike = state.zeusStormStrikes[i];
    let lifeRatio = strike.life / strike.maxLife;
    
    // Fade out
    ctx.globalAlpha = Math.max(0, lifeRatio);
    
    // REMOVED Expensive shadowBlur to fix FPS drops
    
    // Draw vertical lightning bolt from sky to target
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';
    
    ctx.beginPath();
    let curX = strike.x;
    let curY = strike.y - 400; // Start high up
    
    ctx.moveTo(curX, curY);
    
    // Jagged segments down to target
    let steps = 8;
    for (let s = 1; s <= steps; s++) {
      let t = s / steps;
      let targetX = strike.x;
      let targetY = strike.y;
      
      let nextX = curX + (targetX - curX) * (1/steps) + (Math.random() - 0.5) * 40 * (1-t);
      let nextY = curY + (targetY - curY) * (1/steps);
      
      if (s === steps) {
        nextX = targetX;
        nextY = targetY;
      }
      
      ctx.lineTo(nextX, nextY);
      curX = nextX;
      curY = nextY;
    }
    
    let isGreen = strike.color === 'green';

    // 0. Massive faint under-glow for extra luminance
    if (isGreen) {
      ctx.strokeStyle = `rgba(0, 255, 100, ${0.25 * lifeRatio})`;
    } else {
      ctx.strokeStyle = `rgba(0, 100, 255, ${0.25 * lifeRatio})`;
    }
    ctx.lineWidth = 35 + lifeRatio * 15;
    ctx.stroke();

    // 1. Outer cyan glow (Simulates the removed shadowBlur much faster)
    if (isGreen) {
      ctx.strokeStyle = `rgba(0, 255, 0, ${0.8 * lifeRatio})`;
    } else {
      ctx.strokeStyle = `rgba(0, 220, 255, ${0.8 * lifeRatio})`;
    }
    ctx.lineWidth = 16 + lifeRatio * 8;
    ctx.stroke();
    
    // 2. Main white bolt body
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3 + lifeRatio * 4;
    ctx.stroke();
    
    // 3. Inner brightest core
    if (isGreen) {
      ctx.strokeStyle = '#E0FFE0';
    } else {
      ctx.strokeStyle = '#E0FFFF';
    }
    ctx.lineWidth = 1.5 + lifeRatio * 2;
    ctx.stroke();
    
    // Impact flash at ground
    ctx.beginPath();
    ctx.arc(strike.x, strike.y, 20 * (1 - lifeRatio), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${lifeRatio})`;
    ctx.fill();
    
    // Impact ring
    ctx.beginPath();
    ctx.arc(strike.x, strike.y, 40 * (1 - lifeRatio), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 191, 255, ${lifeRatio * 0.5})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Luminance Shine Bloom Effect (like Solar Champion laser)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bloomRadius = 160;
    const shineGlow = ctx.createRadialGradient(strike.x, strike.y, 10, strike.x, strike.y, bloomRadius);
    // Brilliant white/cyan core
    shineGlow.addColorStop(0, `rgba(255, 255, 255, ${(0.8 + Math.random() * 0.2) * lifeRatio})`);
    // Electric blue mid
    shineGlow.addColorStop(0.2, `rgba(0, 200, 255, ${(0.5 + Math.random() * 0.2) * lifeRatio})`);
    // Deep blue outer fade
    shineGlow.addColorStop(1, 'rgba(0, 50, 255, 0)');
    
    ctx.fillStyle = shineGlow;
    ctx.beginPath();
    ctx.arc(strike.x, strike.y, bloomRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  
  ctx.restore();
}
