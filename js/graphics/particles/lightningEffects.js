import { state } from '../../core/state.js';
import { drawThunderRootsEffect } from '../statusEffects.js';

export function updateLightningEffects() {
  if (!state.zeusStormStrikes) return;
  
  for (let i = state.zeusStormStrikes.length - 1; i >= 0; i--) {
    let strike = state.zeusStormStrikes[i];
    strike.life--;
    if (strike.life <= 0) {
      state.zeusStormStrikes.splice(i, 1);
    }
  }
}

export function drawLightningEffects(ctx) {
  if (!state.zeusStormStrikes || state.zeusStormStrikes.length === 0) return;
  
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  
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
    
    // 1. Outer cyan glow (Simulates the removed shadowBlur much faster)
    ctx.strokeStyle = `rgba(0, 191, 255, ${0.6 * lifeRatio})`;
    ctx.lineWidth = 14 + lifeRatio * 6;
    ctx.stroke();
    
    // 2. Main white bolt body
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3 + lifeRatio * 4;
    ctx.stroke();
    
    // 3. Inner brightest core
    ctx.strokeStyle = '#E0FFFF';
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
  }
  
  ctx.restore();
}
