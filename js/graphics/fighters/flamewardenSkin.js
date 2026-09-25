// ─────────────────────────────────────────────
// EMBER (FLAMEWARDEN) FIGHTER MODEL
// Pure Pixel Art Volcanic Magma Elemental Edition
//
// Adheres strictly to:
// - Zero human flesh skin tone (100% Pure Elemental Fire / Magma / Basalt Entity)
// - Rule 11 (Prohibition of shadowBlur CPU Filters)
// - Rule 19 (Upright Front POV Camera Orientation, Zero Eyes/Mouth/Nose)
// - Rule 3.5 (Authentic 2D Discrete Grid Rasterization Engine P = 2.0px)
// - Rule 2.4 (100% Balanced Canvas 2D Stack Depths)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

const P = 2.0; // 2.0px authentic retro pixel grid

// Offscreen canvas cache for Ember's pixel body model (avoids thousands of fillRect calls and eliminates subpixel seam lines)
let _cachedEmberCanvas = null;
let _cachedEmberR = 0;

/**
 * Internal offscreen rasterization function for Ember's pure fire/magma elemental body.
 * Constructed from volcanic basalt plating, incandescent magma core, flaming crest horns, and furnace visor.
 * Zero human flesh skin tone anywhere.
 * 
 * @param {CanvasRenderingContext2D} destCtx
 * @param {number} r - Character radius
 */
function _renderEmberPixelBodyToCanvas(destCtx, r) {
  destCtx.imageSmoothingEnabled = false;
  const steps = Math.ceil((r + P) / P);

  const cx = destCtx.canvas.width / 2;
  const cy = destCtx.canvas.height / 2;

  destCtx.save();
  destCtx.translate(cx, cy);

  // 1. Underlay solid dark base circle to guarantee 0% background show-through
  destCtx.fillStyle = '#100501';
  destCtx.beginPath();
  destCtx.arc(0, 0, r, 0, Math.PI * 2);
  destCtx.fill();

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);

      // Strict Circle Boundary Clipping
      if (dist > r) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;

      const normX = rx / r; // -1.0 to +1.0
      const normY = ry / r; // -1.0 to +1.0
      const absX = Math.abs(normX);
      const absY = Math.abs(normY);
      const normDist = dist / r; // 0.0 at center, 1.0 at outer edge

      // ── 1. STEPPED DARK MANGA INK OUTLINE SHELL (Rule 19 / Rule 3.5) ──
      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );

      if (isBorder) {
        destCtx.fillStyle = '#0F0501'; // Deepest midnight volcanic obsidian ink outline
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 2. VOLCANIC MAGMA ELEMENTAL PIXEL SHADING (Zero Human Flesh Skin) ──

      // A. Flaming Crown Spikes & Magma Crest (Upper -Y Hemisphere: normY < -0.32)
      if (normY < -0.32) {
        // Crown Fire Horn Spikes (-r * 0.70 to -r * 1.0)
        const isHornSpike = (
          (absX <= 0.14 && normY < -0.80) ||
          (absX >= 0.32 && absX <= 0.58 && normY < -0.66) ||
          (absX >= 0.70 && absX <= 0.85 && normY < -0.48)
        );

        if (isHornSpike) {
          if (normY < -0.85 || (gx + gy) % 3 === 0) {
            destCtx.fillStyle = '#FFFFFF'; // White-hot incandescent fire tip
          } else if (normY < -0.65) {
            destCtx.fillStyle = '#FDE047'; // Solar flare gold
          } else {
            destCtx.fillStyle = '#F97316'; // Blazing fire orange
          }
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Upper Magma Horn Base & Basalt Forehead Plate
        if (absX < 0.40 && normY < -0.50) {
          destCtx.fillStyle = (gx + gy) % 2 === 0 ? '#FB923C' : '#EA580C'; // Molten forehead energy
        } else if (absX < 0.70) {
          destCtx.fillStyle = '#9A3412'; // Volcanic midtone
        } else {
          destCtx.fillStyle = (gx + gy) % 2 === 0 ? '#431407' : '#1C0B02'; // Outer basalt crust
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // B. Molten Furnace Visor & Central Core Eye-Slit (-0.32 <= normY <= +0.15)
      if (normY <= +0.15) {
        // Horizontal Glowing Furnace Visor Slit
        const isVisorSlit = (
          (normY >= -0.18 && normY <= +0.02 && absX < 0.62) ||
          (normY >= -0.26 && normY <= -0.10 && absX < 0.35)
        );

        if (isVisorSlit) {
          if (absX < 0.20 && Math.abs(normY + 0.08) < 0.08) {
            destCtx.fillStyle = '#FFFFFF'; // Pure white-hot furnace core glint
          } else if (absX < 0.42) {
            destCtx.fillStyle = '#FDE047'; // Blazing solar yellow visor
          } else {
            destCtx.fillStyle = '#F97316'; // Radiant orange visor rim
          }
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Basalt Visor Housing & Cheek Guards
        if (absX < 0.45) {
          destCtx.fillStyle = (gx + gy) % 2 === 0 ? '#7C2D12' : '#431407'; // Heated basalt frame
        } else if (absX < 0.75) {
          destCtx.fillStyle = '#291206'; // Forged obsidian cheek plate
        } else {
          destCtx.fillStyle = (gx + gy) % 2 === 0 ? '#1C0B02' : '#0F0501'; // Outer shadow boundary
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // C. Volcanic Chest Cuirass & Magma Fissures (+0.15 < normY <= +0.65)
      if (normY <= +0.65) {
        // Symmetrical Magma Energy Veins & Fissure Channels
        const isMagmaVein = (
          (Math.abs(absX - (normY - 0.15) * 0.8) < 0.10 && (gx + gy) % 2 === 0) ||
          (absX < 0.15 && normY > 0.25 && normY < 0.55) ||
          (absX > 0.45 && absX < 0.62 && (gx + gy) % 3 === 0)
        );

        if (isMagmaVein) {
          destCtx.fillStyle = absX < 0.25 ? '#FDE047' : '#F97316'; // Glowing lava vein
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Heavy Basalt Cuirass Armor Shading
        if (normDist < 0.55) {
          destCtx.fillStyle = (gx + gy) % 2 === 0 ? '#431407' : '#291206'; // Heated inner chest
        } else if (normDist < 0.80) {
          destCtx.fillStyle = '#1C0B02'; // Solid basalt plate
        } else {
          destCtx.fillStyle = (gx + gy) % 2 === 0 ? '#140702' : '#0A0301'; // Dark armor rim
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // D. Lower Igneous Greaves & Smoldering Robe (+0.65 < normY <= +1.0)
      const isLowerVent = (
        (absX <= 0.18 && normY > +0.72) ||
        (absX >= 0.45 && absX <= 0.70 && normY > +0.70 && (gx + gy) % 2 === 0)
      );

      if (isLowerVent) {
        if (normY > +0.88) {
          destCtx.fillStyle = '#140702'; // Dark volcanic base
        } else if ((gx + gy) % 2 === 0) {
          destCtx.fillStyle = '#EA580C'; // Lava fissure glow
        } else {
          destCtx.fillStyle = '#9A3412'; // Molten underglow
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // Lower Ambient Basalt Shadow
      if (normDist < 0.65) {
        destCtx.fillStyle = (gx + gy) % 2 === 0 ? '#291206' : '#1C0B02';
      } else if (normDist < 0.88) {
        destCtx.fillStyle = '#140702';
      } else {
        destCtx.fillStyle = '#0A0301';
      }
      destCtx.fillRect(px, py, P, P);
    }
  }

  destCtx.restore();
}

/**
 * Draws Ember's authentic procedural pixel-art body with offscreen canvas caching.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character radius
 */
export function drawEmberPixelBody(ctx, r = 25) {
  if (typeof document === 'undefined') {
    _renderEmberPixelBodyToCanvas(ctx, r);
    return;
  }

  const intR = Math.round(r);
  if (!_cachedEmberCanvas || _cachedEmberR !== intR) {
    const steps = Math.ceil((intR + P) / P);
    const size = (steps * 2 + 1) * P;
    _cachedEmberCanvas = document.createElement('canvas');
    _cachedEmberCanvas.width = size;
    _cachedEmberCanvas.height = size;
    const cctx = _cachedEmberCanvas.getContext('2d');
    _renderEmberPixelBodyToCanvas(cctx, intR);
    _cachedEmberR = intR;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const size = _cachedEmberCanvas.width;
  ctx.drawImage(_cachedEmberCanvas, -size / 2, -size / 2);
  ctx.restore();
}

/**
 * Main Ember / Flamewarden Skin entry point.
 * Supports polymorphic calling conventions:
 * 1. drawEmberSkin(ctx, fighterEntity)
 * 2. drawEmberSkin(ctx, x, y, r, angle, timeOpt)
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {object|number} fighterOrX - Fighter entity or x coordinate
 * @param {number} [y]
 * @param {number} [r]
 * @param {number} [angle]
 * @param {number} [timeOpt]
 */
export function drawEmberSkin(ctx, fighterOrX, y, r, angle, timeOpt) {
  let posX = 0;
  let posY = 0;
  let radius = 25;
  let renderAngle = 0;
  let isWinnerReveal = false;

  if (fighterOrX && typeof fighterOrX === 'object') {
    const f = fighterOrX;
    posX = f.x || 0;
    posY = f.y || 0;
    radius = f.r || 25;
    isWinnerReveal = Boolean(f._isWinnerReveal);
    renderAngle = isWinnerReveal ? 0 : (f.gunAngle !== undefined ? f.gunAngle : (f.angle || 0));
  } else {
    posX = fighterOrX || 0;
    posY = y || 0;
    radius = r || 25;
    renderAngle = angle || 0;
  }

  ctx.save();
  ctx.translate(posX, posY);

  // Upright Front-POV Orientation with horizontal scale mirroring (Rule 19)
  const facingLeft = Math.abs(renderAngle) > Math.PI / 2;
  const baseAngle = isWinnerReveal ? 0 : (facingLeft ? Math.PI : 0);

  ctx.rotate(baseAngle);
  if (facingLeft && !isWinnerReveal) {
    ctx.scale(1, -1);
  }

  // Draw authentic pure magma elemental pixel body
  drawEmberPixelBody(ctx, radius);

  ctx.restore();
}

// Aliases for backward compatibility
export const drawFlamewardenSkin = drawEmberSkin;
