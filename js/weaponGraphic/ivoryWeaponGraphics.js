import { CONFIG } from '../config.js';

// ivoryWeaponGraphics.js
//  - Use this file for Ivory/White-specific weapon graphics (railgun and charge effect).
//  - Keep gameplay and tuning values in js/config.js; only visual/graphical details belong here.
//  - If you want to change Ivory weapon visuals, edit the palette or functions below.

export const IVORY_WEAPON_GRAPHICS = {
  railgun: {
    stockColor: '#1e2329',             // Back stock color
    stockStroke: '#0f1214',            // Stock outline
    batteryColor: '#00f0ff',           // Blue battery indicator
    bodyGradient1: '#ffffff',          // Main body light
    bodyGradient2: '#eef3f7',          // Main body mid
    bodyGradient3: '#a9b6c7',          // Main body dark
    bodyStroke: '#4e5a6e',             // Body outline
    panelLine: '#c5d1df',              // Panel line color
    chamberDark: '#11151a',            // Energy chamber dark
    chamberCore: '#ccffff',            // Glowing core
    chamberCenter: '#ffffff',          // Bright center line
    chamberGrill: '#1e2329',           // Grill over core
    gripColor: '#262c33',              // Lower grip color
    gripStroke: '#0f1214',             // Grip outline
    barrelColor: '#2c343d',            // Barrel system color
    barrelStroke: '#161a1f',           // Barrel outline
    barrelRing: '#6d7b8f',             // Barrel rings
    muzzleGradient1: '#eef3f7',        // Muzzle light
    muzzleGradient2: '#8695a8',       // Muzzle dark
    muzzleStroke: '#323c4a',          // Muzzle outline
    emitterColor: '#00ffff',           // Emitter glow
    emitterHighlight: '#ffffff',       // Emitter highlight
    sightColor: '#313a45',             // Top sight color
    sightStroke: '#161a1f',            // Sight outline
    sightLens: '#00ffff',              // Sight lens color
  },
  positioning: {
    scale: 1.2,
    baseOffset: 2,                     // Distance from fighter body edge
  },
  dimensions: {
    stockLength: 12,
    stockHeight: 8,
    bodyLength: 32,
    bodyHeight: 16,
    chamberWidth: 14,
    chamberHeight: 5,
    barrelLength: 18,
    barrelHeight: 5,
    muzzleLength: 6,
    muzzleHeight: 11,
  },
  chargeEffect: {
    baseColor: 'rgba(204, 255, 255, 0.6)', // Base charge glow
    particleColor: 'rgba(170, 255, 255, 0.8)', // Orbiting particles
    streakColor: 'rgba(180, 255, 255, 0.24)', // Suction streaks
    shimmerColor: 'rgba(180, 255, 255, 0.8)', // Outer shimmer
  },
};

export function drawWhiteRailgun(ctx, x, y, gunAngle, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(gunAngle);

  // Adjust base position to start at the fighter's edge
  ctx.translate(r + IVORY_WEAPON_GRAPHICS.positioning.baseOffset, 0);

  const cfg = IVORY_WEAPON_GRAPHICS;
  const scale = cfg.positioning.scale;

  // Shadow for depth
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  // -- 1. Back Stock / Battery Pack --
  ctx.fillStyle = cfg.railgun.stockColor;
  ctx.beginPath();
  ctx.moveTo(-12 * scale, -6 * scale);
  ctx.lineTo(2 * scale, -6 * scale);
  ctx.lineTo(4 * scale, 6 * scale);
  ctx.lineTo(-8 * scale, 8 * scale);
  ctx.lineTo(-12 * scale, 2 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = cfg.railgun.stockStroke;
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  // Blue battery indicator
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = cfg.railgun.batteryColor;
  ctx.shadowColor = cfg.railgun.batteryColor;
  ctx.shadowBlur = 6;
  ctx.fillRect(-8 * scale, -2 * scale, 6 * scale, 2 * scale);
  ctx.shadowBlur = 0;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  // -- 2. Main Gun Body (Sleek White/Silver) --
  ctx.beginPath();
  ctx.moveTo(0, -9 * scale);
  ctx.lineTo(25 * scale, -9 * scale);
  ctx.lineTo(32 * scale, -3 * scale);
  ctx.lineTo(32 * scale, 4 * scale);
  ctx.lineTo(18 * scale, 7 * scale);
  ctx.lineTo(6 * scale, 7 * scale);
  ctx.lineTo(0, 3 * scale);
  ctx.closePath();

  const bodyGradient = ctx.createLinearGradient(0, -9 * scale, 0, 7 * scale);
  bodyGradient.addColorStop(0, cfg.railgun.bodyGradient1);
  bodyGradient.addColorStop(0.4, cfg.railgun.bodyGradient2);
  bodyGradient.addColorStop(1, cfg.railgun.bodyGradient3);
  ctx.fillStyle = bodyGradient;
  ctx.fill();
  ctx.strokeStyle = cfg.railgun.bodyStroke;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // Panel lines
  ctx.beginPath();
  ctx.moveTo(6 * scale, -2 * scale);
  ctx.lineTo(22 * scale, -2 * scale);
  ctx.strokeStyle = cfg.railgun.panelLine;
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  // -- 3. Energy Chamber (Exposed Core) --
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  
  // Inner dark cutout
  ctx.fillStyle = cfg.railgun.chamberDark;
  ctx.fillRect(8 * scale, -4 * scale, cfg.dimensions.chamberWidth * scale, cfg.dimensions.chamberHeight * scale);
  
  // Glowing core
  ctx.fillStyle = cfg.railgun.chamberCore;
  ctx.shadowColor = cfg.railgun.emitterColor;
  ctx.shadowBlur = 10;
  ctx.fillRect(9 * scale, -3 * scale, 12 * scale, 3 * scale);
  
  // Bright center line
  ctx.fillStyle = cfg.railgun.chamberCenter;
  ctx.shadowBlur = 15;
  ctx.fillRect(10 * scale, -2 * scale, 10 * scale, 1 * scale);
  ctx.shadowBlur = 0;
  
  // Grill over core
  ctx.fillStyle = cfg.railgun.chamberGrill;
  ctx.fillRect(12 * scale, -4 * scale, 1.5 * scale, 5 * scale);
  ctx.fillRect(16 * scale, -4 * scale, 1.5 * scale, 5 * scale);

  // Pulsing energy lines on the body
  const pulse = Math.sin(Date.now() / 150) * 0.5 + 0.5;
  ctx.strokeStyle = `rgba(0, 255, 255, ${0.4 + pulse * 0.6})`;
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(18 * scale, 1 * scale);
  ctx.lineTo(26 * scale, 1 * scale);
  ctx.moveTo(18 * scale, 3 * scale);
  ctx.lineTo(28 * scale, 3 * scale);
  ctx.stroke();
  
  // Power nodes
  ctx.fillStyle = `rgba(0, 255, 255, ${0.8 + pulse * 0.2})`;
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.arc(22 * scale, 1 * scale, 1.5 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(26 * scale, 3 * scale, 1.5 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  // -- 4. Lower Grip --
  ctx.fillStyle = cfg.railgun.gripColor;
  ctx.beginPath();
  ctx.moveTo(8 * scale, 7 * scale);
  ctx.lineTo(14 * scale, 7 * scale);
  ctx.lineTo(10 * scale, 15 * scale);
  ctx.lineTo(5 * scale, 15 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = cfg.railgun.gripStroke;
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  // -- 5. Barrel System --
  ctx.fillStyle = cfg.railgun.barrelColor;
  ctx.fillRect(32 * scale, -4 * scale, cfg.dimensions.barrelLength * scale, cfg.dimensions.barrelHeight * scale);
  ctx.strokeStyle = cfg.railgun.barrelStroke;
  ctx.strokeRect(32 * scale, -4 * scale, cfg.dimensions.barrelLength * scale, cfg.dimensions.barrelHeight * scale);

  // Barrel rings
  ctx.fillStyle = cfg.railgun.barrelRing;
  ctx.fillRect(36 * scale, -5 * scale, 3 * scale, 7 * scale);
  ctx.fillRect(42 * scale, -5 * scale, 3 * scale, 7 * scale);

  // -- 6. Muzzle / Emitter Tip --
  ctx.beginPath();
  ctx.moveTo(50 * scale, -6 * scale);
  ctx.lineTo(56 * scale, -3 * scale);
  ctx.lineTo(56 * scale, 2 * scale);
  ctx.lineTo(50 * scale, 5 * scale);
  ctx.closePath();
  const muzzleGrad = ctx.createLinearGradient(50 * scale, -6 * scale, 56 * scale, 5 * scale);
  muzzleGrad.addColorStop(0, cfg.railgun.muzzleGradient1);
  muzzleGrad.addColorStop(1, cfg.railgun.muzzleGradient2);
  ctx.fillStyle = muzzleGrad;
  ctx.fill();
  ctx.strokeStyle = cfg.railgun.muzzleStroke;
  ctx.stroke();

  // Glowing Emitter Opening
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.beginPath();
  ctx.arc(56 * scale, -0.5 * scale, 2 * scale, 0, Math.PI * 2);
  ctx.fillStyle = cfg.railgun.emitterColor;
  ctx.shadowColor = cfg.railgun.emitterColor;
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.fillStyle = cfg.railgun.emitterHighlight;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(56 * scale, -0.5 * scale, 1 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // -- 7. Top Sight / Scope --
  ctx.fillStyle = cfg.railgun.sightColor;
  ctx.beginPath();
  ctx.moveTo(4 * scale, -9 * scale);
  ctx.lineTo(14 * scale, -9 * scale);
  ctx.lineTo(12 * scale, -13 * scale);
  ctx.lineTo(6 * scale, -13 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = cfg.railgun.sightStroke;
  ctx.stroke();
  
  // Sight Lens (cyan)
  ctx.fillStyle = cfg.railgun.sightLens;
  ctx.fillRect(12 * scale, -12 * scale, 2 * scale, 2 * scale);

  ctx.restore();
}

export function drawWhiteChargeEffect(ctx, x, y, gunAngle, beamCharge, r) {
  if (beamCharge <= 0) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(gunAngle);

  // Position precisely at the muzzle tip (r + baseOffset + muzzle tip * scale)
  const tipDist = r + 2 + (56 * 1.2); 
  const chargeNorm = Math.min(1, beamCharge / CONFIG.laser.windupDuration);
  const glowRadius = 15 + chargeNorm * 35;
  const alpha = 0.2 + chargeNorm * 0.6;
  const time = Date.now() / 80;
  
  // Central concentrated energy core
  ctx.shadowBlur = 15 + chargeNorm * 10;
  ctx.shadowColor = '#00ffff';
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(tipDist, 0, 3 + chargeNorm * 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Expanding pulsing energy rings
  for (let i = 0; i < 3; i++) {
    const ringPhase = ((time * 0.5 + i * 0.33) % 1);
    ctx.beginPath();
    ctx.arc(tipDist, 0, glowRadius * ringPhase, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 255, 255, ${(1 - ringPhase) * alpha})`;
    ctx.lineWidth = 2 * (1 - ringPhase);
    ctx.stroke();
  }

  // Spiraling suction energy nodes
  const particleCount = 12;
  for (let i = 0; i < particleCount; i++) {
    const pPhase = ((time * 1.2 + i * 0.25) % 1);
    // Spiral inward (decreasing radius as phase goes 0->1, angle rotates)
    const angle = (Math.PI * 2 * i) / particleCount + time * 0.8 + (pPhase * Math.PI);
    const radial = glowRadius * (1 - pPhase);
    const xPos = tipDist + Math.cos(angle) * radial;
    const yPos = Math.sin(angle) * radial;

    // Glowing particle
    ctx.beginPath();
    ctx.arc(xPos, yPos, 1.5 + 2 * pPhase, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(150, 255, 255, ${0.4 + 0.6 * pPhase})`;
    ctx.fill();

    // Suction trail connecting to the core
    ctx.beginPath();
    ctx.moveTo(xPos, yPos);
    // Draw trail curving slightly towards the center
    ctx.quadraticCurveTo(
      tipDist + Math.cos(angle - 0.5) * radial * 0.5, 
      Math.sin(angle - 0.5) * radial * 0.5, 
      tipDist, 
      0
    );
    ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 * (1 - pPhase)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}
