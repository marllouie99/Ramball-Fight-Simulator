// cronosWeaponGraphics.js
//  - Use this file for Cronos-specific weapon graphics (crescent blade).
//  - Keep gameplay and tuning values in js/config.js; only visual/graphical details belong here.
//  - If you want to change Cronos weapon visuals, edit the palette or drawCronosCrescentBlade() below.

export const CRONOS_WEAPON_GRAPHICS = {
  blade: {
    pommelColor: '#1b1d21',          // Dark pommel
    pommelStroke: '#2f343b',        // Pommel outline
    gripColor: '#111214',            // Dark grip
    gripStroke: '#25292f',           // Grip outline
    gripDetail: '#181b20',           // Grip texture lines
    guardColor: '#1f2329',           // Guard body
    guardStroke: '#4f5761',          // Guard outline
    guardDetail: '#2c3239',          // Guard panels
    screwColor: '#d2d8df',           // Screw heads
    screwStroke: '#6e7580',          // Screw outlines
    buttonColor: '#00F3FF',          // Activation button
    buttonStroke: '#00aacc',         // Button outline
    bladeMain: '#0d0f12',            // Main blade color
    bladeMid: '#080a0c',             // Blade midtone
    bladeLight: '#15181c',           // Blade highlight
    bladeStroke: '#000000',          // Blade outline
    neonColor: '#00F3FF',            // Neon cutting edge
    neonGlow: 'rgba(0, 229, 255, 0.95)', // Neon fill
  },
  positioning: {
    scale: 1.0,
    scale: 1.3,
    offset: 12,                      // Distance from fighter body edge
  },
  particles: {
    cellSize: 2.5,                   // Honeycomb cell size (reduced from 3.2)
    fillColor: 'rgba(10, 30, 60, 0.7)', // Cell fill base
    strokeColor: 'rgba(0, 243, 255, 0.8)', // Cell stroke
    crossColor: 'rgba(0, 243, 255, 0.25)', // Cross accent
    dotColor: 'rgba(0, 243, 255, 0.6)',    // Vertex dots
  },
};

/**
 * Draws Cronos's obsidian crescent blade with glowing edge.
 * ★ POSITION ADJUST: Change this offset to move blade closer/farther from fighter
 * ★ SIZE ADJUST: Change bladeScale to resize the entire weapon
 */
export function drawCronosCrescentBlade(ctx, x, y, gunAngle, r, swingActive, swingTimer, swingAngle, swingDuration, swingDirection, fighterColor = '#00f3ff') {
  // OPTIMIZATION: Import state for quality check (need to add import at top)
  // For now, we'll check if state is available globally
  const qualityLevel = (typeof state !== 'undefined' && state.qualityLevel) || 1.0;
  const fps = (typeof state !== 'undefined' && state.fps) || 60;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1';
  const useLOD = false;

  // OPTIMIZATION: Skip entire weapon drawing at very low FPS


  ctx.save();
  ctx.translate(x, y);

  // Calculate swing rotation if active - back and forth animation
  const bladeScale = CRONOS_WEAPON_GRAPHICS.positioning.scale;
  let rotation = gunAngle;
  let visualScale = bladeScale;
  if (swingActive && swingTimer > 0) {
    const progress = 1 - (swingTimer / swingDuration);
    const swingTotal = Math.PI * 0.8;
    
    // Forward swing starts from left (-0.4 PI) and sweeps to right (+0.4 PI)
    // Reverse swing starts from right (+0.4 PI) and sweeps back to left (-0.4 PI)
    if (swingDirection === 1) {
      rotation = swingAngle - (swingTotal / 2) + progress * swingTotal;
      visualScale = bladeScale * 1.0;
    } else {
      rotation = swingAngle + (swingTotal / 2) - progress * swingTotal;
      visualScale = bladeScale * 0.92;
    }
  }

  // Rotate first so the weapon orbits the fighter
  ctx.rotate(rotation);

  // ★ POSITION ADJUST: Change this offset to move blade closer/farther from fighter
  // Increase = farther away, Decrease = closer to body
  ctx.translate(r + CRONOS_WEAPON_GRAPHICS.positioning.offset, 0);

  const blade = CRONOS_WEAPON_GRAPHICS.blade;

  // Handle/grip pommel
  ctx.fillStyle = blade.pommelColor;
  ctx.strokeStyle = blade.pommelStroke;
  ctx.lineWidth = 1.5 * bladeScale;
  ctx.beginPath();
  ctx.arc(-22 * bladeScale, 0, 4.4 * bladeScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Grip
  ctx.fillStyle = blade.gripColor;
  ctx.strokeStyle = blade.gripStroke;
  ctx.lineWidth = 1 * bladeScale;
  ctx.fillRect(-18 * bladeScale, -4 * bladeScale, 16 * bladeScale, 8 * bladeScale);
  ctx.strokeRect(-18 * bladeScale, -4 * bladeScale, 16 * bladeScale, 8 * bladeScale);

  ctx.fillStyle = blade.gripDetail;
  for (let i = 0; i < 4; i++) {
    const offset = -16 + i * 3.5;
    ctx.fillRect(offset * bladeScale, -4 * bladeScale, 1.2 * bladeScale, 8 * bladeScale);
  }

  ctx.strokeStyle = '#3b4149';
  ctx.lineWidth = 0.6 * bladeScale;
  for (let i = 0; i < 4; i++) {
    const offset = -17 + i * 3.5;
    ctx.beginPath();
    ctx.moveTo(offset * bladeScale, -4 * bladeScale);
    ctx.lineTo((offset + 3) * bladeScale, 4 * bladeScale);
    ctx.stroke();
  }

  // Guard / armored midsection (scaled down to balance katana blade)
  ctx.fillStyle = blade.guardColor;
  ctx.strokeStyle = blade.guardStroke;
  ctx.lineWidth = 1.2 * bladeScale;
  ctx.beginPath();
  ctx.moveTo(-3 * bladeScale, -7 * bladeScale);
  ctx.lineTo(4 * bladeScale, -7 * bladeScale);
  ctx.lineTo(6 * bladeScale, -4 * bladeScale);
  ctx.lineTo(6 * bladeScale, 5 * bladeScale);
  ctx.lineTo(4 * bladeScale, 8 * bladeScale);
  ctx.lineTo(-3 * bladeScale, 8 * bladeScale);
  ctx.lineTo(-5 * bladeScale, 5 * bladeScale);
  ctx.lineTo(-5 * bladeScale, -4 * bladeScale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = blade.guardDetail;
  ctx.fillRect(-2 * bladeScale, -5 * bladeScale, 4 * bladeScale, 11 * bladeScale);
  ctx.fillRect(-5 * bladeScale, -2 * bladeScale, 2 * bladeScale, 5 * bladeScale);

  // Screws
  ctx.fillStyle = blade.screwColor;
  ctx.strokeStyle = blade.screwStroke;
  ctx.lineWidth = 0.8 * bladeScale;
  const screws = [
    [0.5, -5.5],
    [0.5, 6.5],
  ];
  screws.forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx * bladeScale, sy * bladeScale, 1.0 * bladeScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // Activation button (moved onto the handle)
  ctx.fillStyle = blade.buttonColor;
  ctx.beginPath();
  ctx.arc(-8 * bladeScale, 0, 1.5 * bladeScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = blade.buttonStroke;
  ctx.lineWidth = 0.6 * bladeScale;
  ctx.stroke();

  // Blade body (D-shape / Samurai Katana style)
  ctx.beginPath();
  ctx.moveTo(6 * bladeScale, -3 * bladeScale);
  ctx.lineTo(74 * bladeScale, -3 * bladeScale);
  ctx.quadraticCurveTo(74 * bladeScale, 4 * bladeScale, 40 * bladeScale, 4 * bladeScale);
  ctx.lineTo(6 * bladeScale, 4 * bladeScale);
  ctx.closePath();

  const bladeGradient = ctx.createLinearGradient(6 * bladeScale, -4 * bladeScale, 76 * bladeScale, 5 * bladeScale);
  bladeGradient.addColorStop(0, blade.bladeMain);
  bladeGradient.addColorStop(0.35, blade.bladeMid);
  bladeGradient.addColorStop(0.72, blade.bladeLight);
  bladeGradient.addColorStop(1, '#050708');
  ctx.fillStyle = bladeGradient;
  ctx.fill();
  ctx.strokeStyle = blade.bladeStroke;
  ctx.lineWidth = 1.2 * bladeScale;
  ctx.stroke();

  // Neon glowing cutting edge (The line of the blade)
  const now = Date.now();
  const pulse = (Math.sin((now / 500) * Math.PI) + 1) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(74 * bladeScale, -3 * bladeScale);
  ctx.quadraticCurveTo(74 * bladeScale, 4 * bladeScale, 40 * bladeScale, 4 * bladeScale);
  ctx.lineTo(6 * bladeScale, 4 * bladeScale);
  
  // Neon aura around the edge
  ctx.strokeStyle = blade.neonColor || '#00F3FF';
  ctx.lineWidth = (2.0 + pulse * 1.0) * bladeScale;
  ctx.shadowColor = blade.neonColor || '#00F3FF';
  ctx.shadowBlur = 10 + pulse * 10;
  ctx.stroke();

  // White hot core on the edge
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 + pulse * 0.3})`;
  ctx.lineWidth = 1.0 * bladeScale;
  ctx.stroke();
  ctx.restore();

  // Circuit spine and dot accents (Subtle, no heavy glow inside the body)
  ctx.save();
  ctx.strokeStyle = blade.neonColor || '#00F3FF';
  ctx.lineWidth = 0.8 * bladeScale;
  ctx.globalAlpha = 0.6; // Muted, not glowing brightly
  
  ctx.beginPath();
  ctx.moveTo(8 * bladeScale, -1.5 * bladeScale);
  ctx.lineTo(68 * bladeScale, -1.5 * bladeScale);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(8 * bladeScale, 1.5 * bladeScale);
  ctx.lineTo(60 * bladeScale, 1.5 * bladeScale);
  ctx.stroke();
  
  ctx.fillStyle = blade.neonColor || '#00F3FF';
  [[70, -1.5], [64, 1.5], [58, 1.5]].forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx * bladeScale, cy * bladeScale, 1.0 * bladeScale, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // ── Hand ──
  ctx.fillStyle = fighterColor;
  ctx.beginPath();
  ctx.arc(-10 * bladeScale, 0, 6 * bladeScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1.5 * bladeScale;
  ctx.strokeStyle = '#000';
  ctx.stroke();

  ctx.restore();
}
