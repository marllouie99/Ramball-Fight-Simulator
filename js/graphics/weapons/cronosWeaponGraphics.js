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
export function drawCronosCrescentBlade(ctx, x, y, gunAngle, r, swingActive, swingTimer, swingAngle, swingDuration, swingDirection) {
  // OPTIMIZATION: Import state for quality check (need to add import at top)
  // For now, we'll check if state is available globally
  const qualityLevel = (typeof state !== 'undefined' && state.qualityLevel) || 1.0;
  const fps = (typeof state !== 'undefined' && state.fps) || 60;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1';
  const useLOD = false;

  // OPTIMIZATION: Skip entire weapon drawing at very low FPS


  ctx.save();
  ctx.translate(x, y);

  // ★ POSITION ADJUST: Change this offset to move blade closer/farther from fighter
  // Increase = farther away, Decrease = closer to body
  ctx.translate(r + CRONOS_WEAPON_GRAPHICS.positioning.offset, 0);

  // ★ SIZE ADJUST: Change this scale to resize the entire blade
  const bladeScale = CRONOS_WEAPON_GRAPHICS.positioning.scale;

  // Calculate swing rotation if active - back and forth animation
  let rotation = gunAngle;
  let visualScale = bladeScale;
  if (swingActive && swingTimer > 0) {
    const progress = 1 - (swingTimer / swingDuration);
    const swingTotal = Math.PI * 0.8;
    // Always swing from behind (swingAngle - PI) through the opponent (swingAngle)
    // swingDirection determines which way we sweep through: clockwise or counter-clockwise
    const behindAngle = swingAngle - Math.PI;
    rotation = behindAngle + progress * swingTotal * swingDirection;
    // Adjust visual scale based on swing direction to compensate for blade shape asymmetry
    // When swinging the "other way", the blade shape appears larger, so scale it down slightly
    visualScale = bladeScale * (swingDirection === 1 ? 1.0 : 0.92);
  }

  ctx.rotate(rotation);

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

  // Draw honeycomb effect ON TOP of the blade (after blade is drawn)
  if (!useLOD) {
    _drawCronosBladeParticles(ctx, bladeScale);
  }

  ctx.restore();
}

// ── Module-level cached hex vertex angles ──────────────────────────────────
const _HEX_ANGLE = Math.PI / 3;
const _HEX_COS = [
  Math.cos(Math.PI / 6), Math.cos(Math.PI / 6 + _HEX_ANGLE), Math.cos(Math.PI / 6 + _HEX_ANGLE * 2),
  Math.cos(Math.PI / 6 + _HEX_ANGLE * 3), Math.cos(Math.PI / 6 + _HEX_ANGLE * 4), Math.cos(Math.PI / 6 + _HEX_ANGLE * 5)
];
const _HEX_SIN = [
  Math.sin(Math.PI / 6), Math.sin(Math.PI / 6 + _HEX_ANGLE), Math.sin(Math.PI / 6 + _HEX_ANGLE * 2),
  Math.sin(Math.PI / 6 + _HEX_ANGLE * 3), Math.sin(Math.PI / 6 + _HEX_ANGLE * 4), Math.sin(Math.PI / 6 + _HEX_ANGLE * 5)
];

// ── Pre-computed tile hash phases (avoids per-tile Math.sin in hot loop) ────
const _BLADE_TILE_CACHE = new Map();

function _drawCronosBladeParticles(ctx, bladeScale) {
  const now = Date.now();

  // ── Blade-local honeycomb grid ───────────────────────────────────────────
  // X = along blade (length), Y = perpendicular (width)
  // minX/maxX = length, minY/maxY = width
  const cellSize = CRONOS_WEAPON_GRAPHICS.particles.cellSize * bladeScale;
  const cellOffsetX = cellSize * 2.0;  // increased spacing = fewer tiles
  const cellOffsetY = cellSize * 1.8;  // increased spacing = fewer tiles
  const minX = 6 * bladeScale;   // left edge (matches blade start at x=6)
  const maxX = 72 * bladeScale;  // right edge (matches blade end)
  const minY = -1 * bladeScale;  // top edge (matches blade top)
  const maxY = 5 * bladeScale;   // bottom edge (matches blade bottom)
  const colStart = Math.floor(minX / cellOffsetX) - 1;
  const colEnd = Math.ceil(maxX / cellOffsetX) + 1;
  const rowStart = Math.floor(minY / cellOffsetY) - 1;
  const rowEnd = Math.ceil(maxY / cellOffsetY) + 1;

  // ── Frame-level time values (computed once, not per-tile) ────────────────
  const timeA = (now / 2000) * Math.PI;
  const timeB = now / 500;

  // ── Global pulse for bloom (replaces per-tile pulse in bloom pass) ───────
  const globalPulse = (Math.sin(timeB) + 1) / 2;

  ctx.save();
  // Removed 'screen' composite operation for white background compatibility
  ctx.shadowBlur = 0;

  // ── Collect visible tile positions ───────────────────────────────────────
  // Reuse a flat array to avoid object allocation per tile
  const tileCount = (colEnd - colStart + 1) * (rowEnd - rowStart + 1);
  const tileXs = new Float32Array(tileCount);
  const tileYs = new Float32Array(tileCount);
  const tileFades = new Float32Array(tileCount);
  let validCount = 0;

  for (let row = rowStart; row <= rowEnd; row++) {
    const rowOdd = row % 2 ? cellOffsetX * 0.5 : 0;
    for (let col = colStart; col <= colEnd; col++) {
      const x = col * cellOffsetX + rowOdd;
      const y = row * cellOffsetY;
      if (x < minX || x > maxX || y < minY || y > maxY) continue;

// Per-tile random phase AND speed for more variation
      const key = (row << 16) | (col & 0xFFFF);
      let tileData = _BLADE_TILE_CACHE.get(key);
      if (tileData === undefined) {
        const tileHash = ((row * 1619 + col * 31337) ^ (row * col * 7)) | 0;
        tileData = {
          phase: Math.abs(Math.sin(tileHash * 12.9898 + 78.233)) * Math.PI * 2,
          speed: 0.5 + Math.abs(Math.sin(tileHash * 31.41 + 42.1)) * 1.0,  // 0.5x to 1.5x speed
          dutyPhase: Math.abs(Math.sin(tileHash * 5.3 + 9.7)) * Math.PI * 2
        };
        _BLADE_TILE_CACHE.set(key, tileData);
      }
      // Fast duty cycle: visible fade in and fade out
      const dutyCycle = (Math.sin(timeA * 3.0 + tileData.dutyPhase) + 1) / 2;
      // Fast twinkle adds variation while tile is active
      const twinkle = (Math.sin(timeA * tileData.speed * 4.0 + tileData.phase) + 1) / 2;
      // Combine: duty cycle controls visibility, twinkle adds sparkle
      const tileFade = dutyCycle * 0.6 + twinkle * dutyCycle * 0.4;

      tileXs[validCount] = x;
      tileYs[validCount] = y;
      tileFades[validCount] = tileFade;
      validCount++;
    }
  }

  // ── SINGLE BATCHED PASS: Bloom stroke + cell fill + cell stroke ──────────
  // Changed to per-tile loop to prevent all tiles glowing synchronously.

  ctx.save();
  // Removed 'lighter' composite operation
  
  for (let i = 0; i < validCount; i++) {
    const fade = tileFades[i];
    if (fade < 0.02) continue; // Skip invisible tiles
    
    const x = tileXs[i], y = tileYs[i];
    
    // Path for Bloom (slightly larger)
    ctx.beginPath();
    const s = cellSize * 1.05;
    ctx.moveTo(x + _HEX_COS[0] * s, y + _HEX_SIN[0] * s);
    for (let j = 1; j < 6; j++) {
      ctx.lineTo(x + _HEX_COS[j] * s, y + _HEX_SIN[j] * s);
    }
    ctx.closePath();
    
    // Bloom stroke
    ctx.strokeStyle = 'rgb(0, 150, 255)'; // Deep saturated cyan
    ctx.lineWidth = cellSize * 0.75;
    ctx.globalAlpha = 0.22 * fade; 
    ctx.stroke();

    // Core glow stroke
    ctx.beginPath();
    ctx.moveTo(x + _HEX_COS[0] * cellSize, y + _HEX_SIN[0] * cellSize);
    for (let j = 1; j < 6; j++) {
      ctx.lineTo(x + _HEX_COS[j] * cellSize, y + _HEX_SIN[j] * cellSize);
    }
    ctx.closePath();
    
    ctx.strokeStyle = 'rgb(0, 180, 255)'; // Saturated cyan stroke to outline cells
    ctx.lineWidth = cellSize * 0.25;
    ctx.globalAlpha = 0.30 * fade;
    ctx.stroke();
  }
  ctx.restore();

  // ── PASS 2: Sharp Solid Cells & Edges (Per-tile fade for twinkling effect) ──
  // Use globalAlpha instead of expensive rgba string interpolation
  ctx.fillStyle = 'rgb(0, 190, 220)'; // Vibrant cyan fill to match his theme
  ctx.strokeStyle = 'rgb(0, 160, 255)'; // Deep saturated cyan lines
  ctx.lineWidth = Math.max(1.2, cellSize * 0.14);

  for (let i = 0; i < validCount; i++) {
    const x = tileXs[i], y = tileYs[i];
    const fade = tileFades[i];
    
    ctx.beginPath();
    ctx.moveTo(x + _HEX_COS[0] * cellSize, y + _HEX_SIN[0] * cellSize);
    for (let j = 1; j < 6; j++) {
      ctx.lineTo(x + _HEX_COS[j] * cellSize, y + _HEX_SIN[j] * cellSize);
    }
    ctx.closePath();

    // Fill with fade
    ctx.globalAlpha = 0.85 * fade;
    ctx.fill();

    // Stroke with just fade
    ctx.globalAlpha = 0.95 * fade;
    ctx.stroke();
  }

  ctx.restore();
}
