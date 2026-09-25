// ─────────────────────────────────────────────
// DOPPELGANGER FIGHTER MODEL (Pure Pixel Art Shadow Phantom Edition)
// Ethereal Void Mirage / Abyssal Mirror Phantom
//
// Adheres strictly to:
// - Zero human flesh skin tone (100% Pure Shadow/Void Phantom Entity)
// - Rule 11 (Prohibition of shadowBlur CPU Filters)
// - Rule 19 (Upright Front POV Camera Orientation, Zero Eyes/Mouth/Nose)
// - Rule 3.5 (Authentic 2D Discrete Grid Rasterization Engine P = 2.0px)
// - Rule 2.4 (100% Balanced Canvas 2D Stack Depths)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

const P = 2.0; // 2.0px authentic retro pixel grid

// Offscreen canvas cache for Doppelganger's pixel body model (avoids thousands of fillRect calls and eliminates subpixel seam lines)
let _cachedDoppelgangerCanvas = null;
let _cachedDoppelgangerR = 0;

/**
 * Internal offscreen rasterization function for Doppelganger's pure shadow phantom body.
 * Constructed from volumetric dark obsidian, abyssal amethyst, crystalline facets, and void core dither.
 * Zero human flesh skin tone anywhere.
 * 
 * @param {CanvasRenderingContext2D} destCtx
 * @param {number} r - Character radius
 */
function _renderDoppelgangerPixelBodyToCanvas(destCtx, r) {
  destCtx.imageSmoothingEnabled = false;
  const steps = Math.ceil((r + P) / P);

  const cx = destCtx.canvas.width / 2;
  const cy = destCtx.canvas.height / 2;

  destCtx.save();
  destCtx.translate(cx, cy);

  // 1. Underlay solid dark base circle to guarantee 0% background show-through
  destCtx.fillStyle = '#0a0314';
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
        destCtx.fillStyle = '#0a0314'; // Deepest midnight void ink outline
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 2. ETHEREAL PHANTOM VOLUMETRIC PIXEL SHADING (Pure Void / Amethyst) ──

      // A. Central Singularity / Crystalline Phantom Core (Center: normDist < 0.28)
      if (normDist < 0.26) {
        if (normDist < 0.09) {
          destCtx.fillStyle = '#FAF5FF'; // Pure white-violet radiant energy singularity
        } else if (normDist < 0.16) {
          destCtx.fillStyle = '#E9D5FF'; // Astral lilac core halo
        } else if ((gx + gy) % 2 === 0) {
          destCtx.fillStyle = '#C084FC'; // Glowing amethyst facet glint
        } else {
          destCtx.fillStyle = '#A855F7'; // Radiant purple energy body
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // B. Symmetrical Crystal Facets & Phantom Void Crown (Upper -Y Hemisphere)
      if (normY < -0.25) {
        // Crown Spikes & Specular Crest Glints (-r * 0.70 to -r * 1.0)
        const isCrownSpike = (
          (absX <= 0.12 && normY < -0.78) ||
          (absX >= 0.35 && absX <= 0.55 && normY < -0.68)
        );

        if (isCrownSpike) {
          if (normY < -0.85 || (gx + gy) % 3 === 0) {
            destCtx.fillStyle = '#E9D5FF'; // Diamond glint peak
          } else {
            destCtx.fillStyle = '#C084FC'; // Brilliant purple crest facet
          }
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Upper Shadow Phantom Head / Crown Body
        if (absX < 0.38 && normY < -0.45) {
          destCtx.fillStyle = (gx + gy) % 2 === 0 ? '#9333EA' : '#7E22CE'; // Pulsing violet crown body
        } else if (absX < 0.65) {
          destCtx.fillStyle = '#581C87'; // Deep purple upper midtone
        } else {
          destCtx.fillStyle = (gx + gy) % 2 === 0 ? '#3B0764' : '#240046'; // Outer void shadow rim
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // C. Central Phantom Horizon & Shadow Fractures (Mid Zone: normY between -0.25 and +0.30)
      if (normY <= +0.30) {
        // Symmetrical Ethereal Energy Channels extending outward
        const isEnergyRays = (
          (Math.abs(absX - absY) < 0.12 && (gx + gy) % 2 === 0) ||
          (Math.abs(normY) < 0.08 && absX < 0.65)
        );

        if (isEnergyRays) {
          destCtx.fillStyle = absX < 0.40 ? '#C084FC' : '#9333EA'; // Crystalline energy seam
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Mid-Body Phantom Shading
        if (normDist < 0.52) {
          destCtx.fillStyle = (gx + gy) % 2 === 0 ? '#6B21A8' : '#581C87'; // Inner amethyst mantle
        } else if (normDist < 0.78) {
          destCtx.fillStyle = '#3B0764'; // Obsidian purple body
        } else {
          destCtx.fillStyle = (gx + gy) % 2 === 0 ? '#240046' : '#140024'; // Abyssal edge dither
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // D. Lower Phantom Cowl / Void Tendril Strands (Lower +Y Hemisphere: normY > +0.30)
      const isTendrilFlap = (
        (absX <= 0.16 && normY > +0.65) ||
        (absX >= 0.42 && absX <= 0.68 && normY > +0.55)
      );

      if (isTendrilFlap) {
        if (normY > +0.85) {
          destCtx.fillStyle = '#10002B'; // Deepest shadow root
        } else if ((gx + gy) % 2 === 0) {
          destCtx.fillStyle = '#6B21A8'; // Flowing tendril highlight
        } else {
          destCtx.fillStyle = '#4C1D95'; // Dark purple tendril strand
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // Lower Ambient Shadow
      if (normDist < 0.60) {
        destCtx.fillStyle = (gx + gy) % 2 === 0 ? '#4C1D95' : '#3B0764'; // Lower robe/shadow
      } else if (normDist < 0.85) {
        destCtx.fillStyle = '#240046'; // Deep obsidian-purple
      } else {
        destCtx.fillStyle = '#10002B'; // Outer void darkness
      }
      destCtx.fillRect(px, py, P, P);
    }
  }

  destCtx.restore();
}

/**
 * Draws Doppelganger's authentic procedural pixel-art body with offscreen canvas caching.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character radius
 */
export function drawDoppelgangerPixelBody(ctx, r = 25) {
  if (typeof document === 'undefined') {
    _renderDoppelgangerPixelBodyToCanvas(ctx, r);
    return;
  }

  const intR = Math.round(r);
  if (!_cachedDoppelgangerCanvas || _cachedDoppelgangerR !== intR) {
    const steps = Math.ceil((intR + P) / P);
    const size = (steps * 2 + 1) * P;
    _cachedDoppelgangerCanvas = document.createElement('canvas');
    _cachedDoppelgangerCanvas.width = size;
    _cachedDoppelgangerCanvas.height = size;
    const cctx = _cachedDoppelgangerCanvas.getContext('2d');
    _renderDoppelgangerPixelBodyToCanvas(cctx, intR);
    _cachedDoppelgangerR = intR;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const size = _cachedDoppelgangerCanvas.width;
  ctx.drawImage(_cachedDoppelgangerCanvas, -size / 2, -size / 2);
  ctx.restore();
}

/**
 * Main Doppelganger Skin entry point.
 * Supports polymorphic calling conventions:
 * 1. drawDoppelgangerSkin(ctx, fighterEntity)
 * 2. drawDoppelgangerSkin(ctx, x, y, r, angle, timeOpt)
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {object|number} fighterOrX - Fighter entity or x coordinate
 * @param {number} [y]
 * @param {number} [r]
 * @param {number} [angle]
 * @param {number} [timeOpt]
 */
export function drawDoppelgangerSkin(ctx, fighterOrX, y, r, angle, timeOpt) {
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

  // Draw authentic pure shadow phantom pixel body
  drawDoppelgangerPixelBody(ctx, radius);

  ctx.restore();
}
