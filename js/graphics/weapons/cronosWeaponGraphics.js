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
    buttonColor: '#ff2d2d',          // Activation button
    buttonStroke: '#7e1010',         // Button outline
    bladeMain: '#06090b',            // Main blade color
    bladeMid: '#181d23',             // Blade midtone
    bladeLight: '#101315',           // Blade highlight
    bladeStroke: '#2f353d',          // Blade outline
    neonColor: '#00e5ff',            // Neon cutting edge
    neonGlow: 'rgba(0, 229, 255, 0.95)', // Neon fill
  },
  positioning: {
    scale: 1.0,
    offset: 12,                      // Distance from fighter body edge
  },
  particles: {
    cellSize: 3.2,                   // Honeycomb cell size
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
export function drawCronosCrescentBlade(ctx, x, y, gunAngle, r, swingActive, swingTimer, swingAngle, swingDuration) {
  ctx.save();
  ctx.translate(x, y);

  // ★ POSITION ADJUST: Change this offset to move blade closer/farther from fighter
  // Increase = farther away, Decrease = closer to body
  ctx.translate(r + CRONOS_WEAPON_GRAPHICS.positioning.offset, 0);

  // ★ SIZE ADJUST: Change this scale to resize the entire blade
  const bladeScale = CRONOS_WEAPON_GRAPHICS.positioning.scale;

  // Calculate swing rotation if active
  let rotation = gunAngle;
  if (swingActive && swingTimer > 0) {
    const progress = 1 - (swingTimer / swingDuration);
    const swingTotal = Math.PI * 0.8;
    const swingStart = swingAngle - swingTotal * 0.5;
    rotation = swingStart + progress * swingTotal;
  }

  ctx.rotate(rotation);

  // Honeycomb particle glow around the blade.
  _drawCronosBladeParticles(ctx, bladeScale);

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

  // Neon cutting edge
  ctx.save();
  // OPTIMIZED: Removed shadowBlur (expensive operation)
  ctx.beginPath();
  ctx.moveTo(6 * bladeScale, -2 * bladeScale);
  ctx.lineTo(72 * bladeScale, -2 * bladeScale);
  ctx.quadraticCurveTo(72 * bladeScale, 3 * bladeScale, 40 * bladeScale, 3 * bladeScale);
  ctx.lineTo(6 * bladeScale, 3 * bladeScale);
  ctx.closePath();
  ctx.fillStyle = blade.neonGlow;
  ctx.fill();
  ctx.restore();

  // Circuit spine and dot accents
  ctx.save();
  ctx.strokeStyle = blade.neonColor;
  ctx.lineWidth = 0.8 * bladeScale;
  ctx.globalAlpha = 0.95;
  
  ctx.beginPath();
  ctx.moveTo(8 * bladeScale, -1.5 * bladeScale);
  ctx.lineTo(68 * bladeScale, -1.5 * bladeScale);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(8 * bladeScale, 1.5 * bladeScale);
  ctx.lineTo(60 * bladeScale, 1.5 * bladeScale);
  ctx.stroke();
  
  ctx.fillStyle = blade.neonColor;
  [[70, -1.5], [64, 1.5], [58, 1.5]].forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx * bladeScale, cy * bladeScale, 1.0 * bladeScale, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  ctx.restore();
}

function _drawCronosBladeParticles(ctx, bladeScale) {
  const now = Date.now();
  const part = CRONOS_WEAPON_GRAPHICS.particles;

  // ── Pre-compute hex vertex angles (matching sphere's honeycomb) ──────────
  const hexAngle = Math.PI / 3;
  const cosAngles = [
    Math.cos(Math.PI / 6), Math.cos(Math.PI / 6 + hexAngle), Math.cos(Math.PI / 6 + hexAngle * 2),
    Math.cos(Math.PI / 6 + hexAngle * 3), Math.cos(Math.PI / 6 + hexAngle * 4), Math.cos(Math.PI / 6 + hexAngle * 5)
  ];
  const sinAngles = [
    Math.sin(Math.PI / 6), Math.sin(Math.PI / 6 + hexAngle), Math.sin(Math.PI / 6 + hexAngle * 2),
    Math.sin(Math.PI / 6 + hexAngle * 3), Math.sin(Math.PI / 6 + hexAngle * 4), Math.sin(Math.PI / 6 + hexAngle * 5)
  ];

  // ── Blade-local honeycomb grid ───────────────────────────────────────────
  const cellSize = part.cellSize * bladeScale;
  const cellOffsetX = cellSize * 1.75;
  const cellOffsetY = cellSize * 1.52;
  const minX = 4 * bladeScale;
  const maxX = 78 * bladeScale;
  const minY = -14 * bladeScale;
  const maxY = 14 * bladeScale;
  const colStart = Math.floor(minX / cellOffsetX) - 1;
  const colEnd = Math.ceil(maxX / cellOffsetX) + 1;
  const rowStart = Math.floor(minY / cellOffsetY) - 1;
  const rowEnd = Math.ceil(maxY / cellOffsetY) + 1;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.shadowBlur = 0; // Prevent inheriting expensive UI shadow blurs

  // ── Draw each tile with staggered random fade ─────────────────────────
  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      const x = col * cellOffsetX + (row % 2 ? cellOffsetX * 0.5 : 0);
      const y = row * cellOffsetY;
      if (x < minX || x > maxX || y < minY || y > maxY) continue;

      const tileHash = ((row * 1619 + col * 31337) ^ (row * col * 7)) | 0;
      const tilePhase = (Math.abs(Math.sin(tileHash * 12.9898 + 78.233)) * Math.PI * 2);
      const tileFade = (Math.sin((now / 1000) * Math.PI + tilePhase) + 1) / 2;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const px = x + cosAngles[i] * cellSize;
        const py = y + sinAngles[i] * cellSize;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const pulse = (Math.sin((now / 500) + (row * 0.9 + col * 0.7)) + 1) / 2;
      ctx.fillStyle = `rgba(10, 30, 60, ${pulse * 0.7 * tileFade})`;
      ctx.fill();

      ctx.strokeStyle = part.strokeColor.replace('0.8', `${0.8 * tileFade}`);
      ctx.lineWidth = Math.max(0.8, cellSize * 0.1);
      ctx.stroke();

      if (((row + col) & 1) === 0) {
        ctx.beginPath();
        const cx2 = x + cosAngles[0] * cellSize * 0.5;
        const cy2 = y + sinAngles[0] * cellSize * 0.5;
        const cs = cellSize * 0.3;
        ctx.moveTo(cx2 - cs, cy2 - cs * 0.7);
        ctx.lineTo(cx2 + cs, cy2 + cs * 0.7);
        ctx.moveTo(cx2 - cs * 0.7, cy2 + cs);
        ctx.lineTo(cx2 + cs * 0.7, cy2 - cs);
        ctx.strokeStyle = part.crossColor.replace('0.25', `${0.25 * tileFade}`);
        ctx.lineWidth = Math.max(0.4, cellSize * 0.04);
        ctx.stroke();
      }

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const nx = x + cosAngles[i] * cellSize;
        const ny = y + sinAngles[i] * cellSize;
        ctx.moveTo(nx + cellSize * 0.06, ny);
        ctx.arc(nx, ny, cellSize * 0.06, 0, Math.PI * 2);
      }
      ctx.fillStyle = part.dotColor.replace('0.6', `${0.6 * tileFade}`);
      ctx.fill();
    }
  }

  ctx.restore();
}
