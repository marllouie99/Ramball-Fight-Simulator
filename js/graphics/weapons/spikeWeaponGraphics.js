import { state } from '../../core/state.js';

// spikeWeaponGraphics.js
//  - Use this file for Spike/Melee-specific weapon graphics (rotating spikes).
//  - Keep gameplay and tuning values in js/config.js; only visual/graphical details belong here.
//  - If you want to change Spike weapon visuals, edit the palette or drawSpikeWeapon() below.

export const SPIKE_WEAPON_GRAPHICS = {
  spikes: {
    spikeColor: '#e0e5eb',           // Metallic silver blade
    spikeHighlight: '#ffffff',       // Shiny edge
    spikeShadow: '#5a626b',          // Darker metal base for more contrast
  },
  positioning: {
    scale: 1.0,
    numSpikes: 6,                    // 6 distinct blades around the body
    innerOffset: -2,                 // Less embedded to show more blade
    outerExtension: 20,              // Longer reach, sharper look
    spikeWidth: 6,                   // Narrower base for sharper look
  },
};

/**
 * Draws rotating spikes around the fighter body for the Spike/Melee fighter.
 * Optimized: Uses a single path and a single radial gradient for all blades to minimize draw calls.
 */
export function drawSpikeWeapon(ctx, x, y, angle, r) {
  const cfg = SPIKE_WEAPON_GRAPHICS;
  const qualityLevel = state.qualityLevel || 1.0;
  const useLOD = false;
  const useUltraLOD = false;

  const numSpikes = useUltraLOD ? 3 : (useLOD ? 4 : cfg.positioning.numSpikes);
  const innerOffset = cfg.positioning.innerOffset;
  const outerExtension = cfg.positioning.outerExtension;
  const spikeWidth = cfg.positioning.spikeWidth;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-angle * 0.5); // Counter rotation for visual variety

  const baseR = r + innerOffset;
  const tipR = baseR + outerExtension;
  
  const grad = ctx.createRadialGradient(0, 0, baseR, 0, 0, tipR);
  grad.addColorStop(0, cfg.spikes.spikeShadow);
  grad.addColorStop(0.5, cfg.spikes.spikeColor);
  grad.addColorStop(1, cfg.spikes.spikeHighlight);

  ctx.beginPath();
  const angleStep = (Math.PI * 2) / numSpikes;
  
  for (let i = 0; i < numSpikes; i++) {
    const currentAngle = i * angleStep;
    const cos = Math.cos(currentAngle);
    const sin = Math.sin(currentAngle);
    
    const px = -sin;
    const py = cos;
    
    const bx1 = cos * baseR + px * (spikeWidth / 2);
    const by1 = sin * baseR + py * (spikeWidth / 2);
    const bx2 = cos * baseR - px * (spikeWidth / 2);
    const by2 = sin * baseR - py * (spikeWidth / 2);
    
    const tx = cos * tipR;
    const ty = sin * tipR;

    if (useUltraLOD) {
        // Simplified triangle shape for ultra low FPS
        ctx.moveTo(bx1, by1);
        ctx.lineTo(tx, ty);
        ctx.lineTo(bx2, by2);
        ctx.closePath();
    } else {
        const midR = baseR + outerExtension * 0.4;
        const midW = spikeWidth * 0.25;
        const mx1 = cos * midR + px * midW;
        const my1 = sin * midR + py * midW;
        const mx2 = cos * midR - px * midW;
        const my2 = sin * midR - py * midW;
        
        ctx.moveTo(bx1, by1);
        ctx.lineTo(mx1, my1);
        ctx.lineTo(tx, ty);
        ctx.lineTo(mx2, my2);
        ctx.lineTo(bx2, by2);
        ctx.closePath();
    }
  }
  
  ctx.fillStyle = grad;
  ctx.fill();
  
  ctx.strokeStyle = '#1a1f24';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (!useUltraLOD) {
      ctx.beginPath();
      for (let i = 0; i < numSpikes; i++) {
        const currentAngle = i * angleStep;
        const cos = Math.cos(currentAngle);
        const sin = Math.sin(currentAngle);
        
        ctx.moveTo(cos * baseR, sin * baseR);
        ctx.lineTo(cos * tipR, sin * tipR);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws a single spike for use in other contexts (e.g., projectiles or effects).
 */
export function drawSingleSpike(ctx, x, y, angle, scale = 1.0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  
  const cfg = SPIKE_WEAPON_GRAPHICS;
  const innerOffset = cfg.positioning.innerOffset * scale;
  const outerExtension = cfg.positioning.outerExtension * scale;
  const spikeWidth = cfg.positioning.spikeWidth * scale;
  
  const base = innerOffset;
  const tip = base + outerExtension;
  const mid = base + outerExtension * 0.4;
  const midW = spikeWidth * 0.25;

  ctx.beginPath();
  ctx.moveTo(base, spikeWidth / 2);
  ctx.lineTo(mid, midW);
  ctx.lineTo(tip, 0);
  ctx.lineTo(mid, -midW);
  ctx.lineTo(base, -spikeWidth / 2);
  ctx.closePath();

  const grad = ctx.createLinearGradient(base, 0, tip, 0);
  grad.addColorStop(0, cfg.spikes.spikeShadow);
  grad.addColorStop(0.5, cfg.spikes.spikeColor);
  grad.addColorStop(1, cfg.spikes.spikeHighlight);

  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = '#1a1f24';
  ctx.lineWidth = 1 * scale;
  ctx.stroke();
  
  // Center ridge
  ctx.beginPath();
  ctx.moveTo(base, 0);
  ctx.lineTo(tip, 0);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1.2 * scale;
  ctx.stroke();
  
  ctx.restore();
}
