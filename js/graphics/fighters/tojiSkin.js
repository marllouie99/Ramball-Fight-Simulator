// ─────────────────────────────────────────────
// TOJI FUSHIGURO FIGHTER SKIN & BODY MODEL
// The Sorcerer Killer (Jujutsu Kaisen)
// Features Authentic Procedural Pixel-Art Body Matching Reference:
// 1. Warm Athletic Tan Skin Face with Signature Lip Scar (Rule 19 Compliant, Faceless)
// 2. Charcoal Compression Crewneck Shirt
// 3. Dark Hakama Pants & Sash with White Ribbon Loops
// 4. Authentic Pixel-Art Jet-Black Hair Asset (Assets/model/toji-hair.png)
// Rule 19 (Upright Front POV), Rule 20 (Hand Visibility), and Rule 11 Compliant
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

let _tojiHairImage = null;
let _tojiHairImageLoading = false;

export function _getTojiHairImage() {
  if (_tojiHairImage && _tojiHairImage.complete && _tojiHairImage.naturalWidth > 0) {
    return _tojiHairImage;
  }
  if (!_tojiHairImageLoading && typeof Image !== 'undefined') {
    _tojiHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _tojiHairImage = img;
      _tojiHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Toji hair image at Assets/model/toji-hair.png', e);
      _tojiHairImageLoading = false;
    };
    img.src = 'Assets/model/toji-hair.png?v=1';
    _tojiHairImage = img;
  }
  return _tojiHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getTojiHairImage();
}

/**
 * Draws Toji's authentic anime spiky hair from Assets/model/toji-hair.png.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawTojiHair(ctx, r, facingLeft = false) {
  const hairImg = _getTojiHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp pixel art fidelity (Rule #19)

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.toji) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;

    // toji-hair.png (1345x1170). True visible hair bounding box:
    // X: [125, 1247] (width 1123, horizontal center at 686)
    // Y: [136, 1043] (height 908, top crown at 136)
    // Calibrated to seamlessly cover the upper circle with spiky crown at -1.45r
    const targetHairWidth = r * 2.85 * wMult;
    const targetHairHeight = r * 2.10 * hMult;
    const scaleX = targetHairWidth / 1123;
    const scaleY = targetHairHeight / 908;
    const drawW = 1345 * scaleX;
    const drawH = 1170 * scaleY;
    const drawX = -686 * scaleX + offX;
    const drawY = -r * 1.45 - 136 * scaleY + offY;

    if (rot !== 0) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      ctx.rotate(rot);
      ctx.drawImage(hairImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(hairImg, drawX, drawY, drawW, drawH);
    }
    ctx.restore();
  }
}

/**
 * Draws Toji's hand/fist in clean pixel art style with warm athletic tan skin tone.
 */
export function drawTojiFist(ctx, x, y, radius, skinColor = '#D4A373', fighter = null, isBack = false) {
  ctx.save();
  ctx.translate(x, y);
  drawPixelHand(ctx, 0, 0, radius, skinColor);
  ctx.restore();
}

let _cachedTojiBodyCanvas = null;
let _cachedTojiBodyR = 0;

/**
 * Procedural Pixel Art Render Function (Renders once to offscreen cache).
 * Matches the reference image:
 * - Stepped dark outer circle stroke
 * - Warm tan athletic skin face with signature corner lip scar (no procedural hair)
 * - Charcoal compression crewneck shirt
 * - Dark hakama pants & waist sash with white ribbon loop tabs
 */
function _renderTojiPixelBodyToCanvas(destCtx, r) {
  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);
  const P = 2.0;
  const steps = Math.ceil((r + P) / P);

  // 100% 4-Way Symmetrical Circular Pixel Body Fill & Outer Border
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;

      // 4-neighbor boundary test for clean 1-pixel outer manga ink outline
      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );

      if (isBorder) {
        destCtx.fillStyle = '#0E0F14';
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // ZONE 1: Face & Cheeks Tan Skin (ry < r * 0.22)
      // ──────────────────────────────────────────
      if (ry < r * 0.22) {
        let col = '#E8BD9B'; // Warm athletic tan skin

        // Cheek / side contour
        if (Math.abs(rx) > r * 0.72) {
          col = '#D4A373';
        }

        // Signature Corner Lip Scar on lower-right cheek
        // Diagonal slash: rx in [r * 0.20, r * 0.40], ry in [r * 0.04, r * 0.16]
        const scarRelX = (rx - r * 0.20) / (r * 0.20);
        const expectedY = r * 0.04 + scarRelX * (r * 0.10);
        if (rx >= r * 0.20 && rx <= r * 0.40 && Math.abs(ry - expectedY) <= P * 0.9) {
          col = '#7D3224'; // Rich scar crimson-brown
        }

        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: Dark Compression Crewneck Shirt (r * 0.22 <= ry < r * 0.65)
      // ──────────────────────────────────────────
      else if (ry < r * 0.65) {
        // Crewneck collar rim along the neck border (ry ~ 0.22r to 0.29r in center)
        if (ry < r * 0.29 && Math.abs(rx) <= r * 0.45) {
          destCtx.fillStyle = '#0C0D10'; // Darker collar rim
        } else if (ry > r * 0.58) {
          destCtx.fillStyle = '#101115'; // Lower shirt seam shadow
        } else {
          destCtx.fillStyle = '#1C1D24'; // Charcoal compression shirt fabric
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: Dark Hakama Pants & Waist Sash (ry >= r * 0.65)
      // ──────────────────────────────────────────
      else {
        if (ry < r * 0.74) {
          destCtx.fillStyle = '#0A0B0E'; // Dark waist sash band
        } else if (Math.abs(rx) <= r * 0.08 && ry >= r * 0.74 && ry <= r * 0.86) {
          destCtx.fillStyle = '#050608'; // Center knot tie
        } else if (Math.abs(rx) <= P * 0.6 && ry > r * 0.86) {
          destCtx.fillStyle = '#08090C'; // Inseam crease
        } else {
          destCtx.fillStyle = '#121318'; // Dark hakama fabric
        }
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  destCtx.restore();
}

/**
 * Draws Toji's procedural pixel-art body with offscreen caching.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Fighter radius
 */
export function drawTojiPixelBody(ctx, r) {
  if (typeof document === 'undefined') {
    // Node environment fallback
    _renderTojiPixelBodyToCanvas(ctx, r);
    return;
  }

  const intR = Math.round(r);
  if (!_cachedTojiBodyCanvas || _cachedTojiBodyR !== intR) {
    const P = 2.0;
    const steps = Math.ceil((intR + P) / P);
    const size = (steps * 2 + 1) * P;
    _cachedTojiBodyCanvas = document.createElement('canvas');
    _cachedTojiBodyCanvas.width = size;
    _cachedTojiBodyCanvas.height = size;
    const cctx = _cachedTojiBodyCanvas.getContext('2d');
    _renderTojiPixelBodyToCanvas(cctx, intR);
    _cachedTojiBodyR = intR;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const size = _cachedTojiBodyCanvas.width;
  ctx.drawImage(_cachedTojiBodyCanvas, -size / 2, -size / 2);
  ctx.restore();
}

/**
 * Main Skin Renderer for Toji Fushiguro
 */
export function drawTojiSkin(ctx, fighter) {
  const r = fighter.r || 25;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Orientation & Mirroring (Rule 19 Upright POV)
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
  ctx.rotate(angle);

  const facingLeft = Math.abs(normAngle) > Math.PI / 2;
  if (facingLeft && !fighter.isSpinning) {
    ctx.scale(1, -1);
  }

  // 2. Procedural Pixel-Art Body
  drawTojiPixelBody(ctx, r);

  // 3. Hair Asset Overlay
  _drawTojiHair(ctx, r, facingLeft);

  // 4. Status Overlays (Stun, Freeze, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore(); // End main transform
}

/**
 * Renders Toji's Ghost Model Afterimage with full skin details, translucent ethereal energy, and spiky anime silhouette.
 */
export function drawTojiGhostSkin(ctx, x, y, angle = 0, r = 25, alpha = 0.5, isDomain = false) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);

  const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
  const facingLeft = Math.abs(normAngle) > Math.PI / 2;
  ctx.rotate(angle);
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 1. Spectral Cursed Energy Outer Glow Aura
  if (typeof state === 'undefined' || state.gameState !== 'countdown') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.30, 0, Math.PI * 2);
    ctx.fillStyle = isDomain ? 'rgba(160, 48, 255, 0.35)' : 'rgba(255, 30, 86, 0.28)';
    ctx.fill();
  }

  // 2. Procedural Pixel-Art Body
  drawTojiPixelBody(ctx, r);

  // 3. Hair Asset Overlay
  _drawTojiHair(ctx, r, facingLeft);

  // 4. Spectral Body Outline
  ctx.strokeStyle = isDomain ? 'rgba(180, 100, 255, 0.90)' : 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
