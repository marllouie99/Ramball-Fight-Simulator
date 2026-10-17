// ─────────────────────────────────────────────
// CHOSO FIGHTER SKIN & BODY MODEL
// Death Painting Eldest Brother (Jujutsu Kaisen)
// Strictly adheres to:
// - Rule 19: Upright Front POV Orientation & Leftward Y-Scale Mirroring
// - Rule 20: Canonical Symmetrical Flank Hand Positioning & Convergence Clasp
// - Rule 22: Hair & Head Asset Model Import with Procedural Discrete Locks Fallback
// - Rule 24: Universal Character Body Model & Scale Standard (Toji Reference Standard)
// - Rule 3.2: Faceless Minimalist Standard (Zero eyes/mouth; iconic nose blood bridge)
// - Rule 11: Prohibition of shadowBlur / shadowColor
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

let _chosoHairImage = null;
let _chosoHairImageLoading = false;

/**
 * Module-level eager loader for Choso's dedicated hair asset.
 */
export function _getChosoHairImage() {
  if (_chosoHairImage && _chosoHairImage.complete && _chosoHairImage.naturalWidth > 0) {
    return _chosoHairImage;
  }
  if (!_chosoHairImageLoading && typeof Image !== 'undefined') {
    _chosoHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _chosoHairImage = img;
      _chosoHairImageLoading = false;
      _cachedChosoBodyCanvas = null;
      _cachedChosoBodyR = 0;
    };
    img.onerror = () => {
      _chosoHairImageLoading = false;
    };
    img.src = 'Assets/model/choso/Choso-hair.png?v=1';
    _chosoHairImage = img;
  }
  return _chosoHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getChosoHairImage();
}

/**
 * Procedural discrete lock hair rendering for Choso (Rule 22 Fallback & Studio Renderer).
 * Accurately models Choso's signature dark messy hair, jagged forehead bangs,
 * and the iconic high twin pigtail tufts flared at 45° angles.
 */
export function _drawProceduralChosoHair(ctx, r, offX = 0, offY = 0, wMult = 1, hMult = 1, rot = 0, flipX = 1, flipY = 1) {
  ctx.save();
  if (rot !== 0 || flipX !== 1 || flipY !== 1 || offX !== 0 || offY !== 0 || wMult !== 1 || hMult !== 1) {
    ctx.translate(offX, offY);
    if (rot !== 0) ctx.rotate(rot);
    if (flipX !== 1 || flipY !== 1) ctx.scale(flipX * wMult, flipY * hMult);
  }

  const baseCol = '#1B141E';      // Deep espresso / midnight plum black
  const shadowCol = '#0E0912';    // Dark ink root / tie bands
  const highlightCol = '#2D2034'; // Crown glint tier

  // 1. Root Volume & Forehead Hairline (Terminates cleanly at y = -r * 0.20 to -r * 0.35)
  ctx.fillStyle = baseCol;
  ctx.beginPath();
  ctx.arc(0, -r * 0.40, r * 0.82, Math.PI * 0.90, Math.PI * 2.10);
  ctx.fill();

  // 2. High Twin Pigtail Tufts (Iconic Choso Silhouette)
  // Left High Pigtail Tuft (Angled ~ -45° to upper-left)
  ctx.save();
  ctx.translate(-r * 0.52, -r * 0.88);
  ctx.rotate(-0.45);
  // Hair tie band
  ctx.fillStyle = shadowCol;
  ctx.fillRect(-r * 0.14, -r * 0.08, r * 0.28, r * 0.14);
  // Expanding tuft flare
  ctx.fillStyle = baseCol;
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, 0);
  ctx.lineTo(-r * 0.38, -r * 0.52);
  ctx.lineTo(-r * 0.18, -r * 0.46);
  ctx.lineTo(-r * 0.32, -r * 0.78); // Topmost spike
  ctx.lineTo(-r * 0.06, -r * 0.56);
  ctx.lineTo(r * 0.08, -r * 0.84);  // Secondary apex
  ctx.lineTo(r * 0.12, -r * 0.44);
  ctx.lineTo(r * 0.26, -r * 0.50);
  ctx.lineTo(r * 0.12, 0);
  ctx.closePath();
  ctx.fill();
  // Glint strand
  ctx.fillStyle = highlightCol;
  ctx.beginPath();
  ctx.moveTo(-r * 0.06, -r * 0.12);
  ctx.lineTo(-r * 0.18, -r * 0.50);
  ctx.lineTo(0, -r * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Right High Pigtail Tuft (Angled ~ +45° to upper-right)
  ctx.save();
  ctx.translate(r * 0.52, -r * 0.88);
  ctx.rotate(0.45);
  // Hair tie band
  ctx.fillStyle = shadowCol;
  ctx.fillRect(-r * 0.14, -r * 0.08, r * 0.28, r * 0.14);
  // Expanding tuft flare
  ctx.fillStyle = baseCol;
  ctx.beginPath();
  ctx.moveTo(r * 0.12, 0);
  ctx.lineTo(r * 0.38, -r * 0.52);
  ctx.lineTo(r * 0.18, -r * 0.46);
  ctx.lineTo(r * 0.32, -r * 0.78); // Topmost spike
  ctx.lineTo(r * 0.06, -r * 0.56);
  ctx.lineTo(-r * 0.08, -r * 0.84); // Secondary apex
  ctx.lineTo(-r * 0.12, -r * 0.44);
  ctx.lineTo(-r * 0.26, -r * 0.50);
  ctx.lineTo(-r * 0.12, 0);
  ctx.closePath();
  ctx.fill();
  // Glint strand
  ctx.fillStyle = highlightCol;
  ctx.beginPath();
  ctx.moveTo(r * 0.06, -r * 0.12);
  ctx.lineTo(r * 0.18, -r * 0.50);
  ctx.lineTo(0, -r * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3. Central Crown Messy Strands
  ctx.fillStyle = baseCol;
  ctx.beginPath();
  ctx.moveTo(-r * 0.30, -r * 0.90);
  ctx.lineTo(-r * 0.16, -r * 1.25);
  ctx.lineTo(0, -r * 0.98);
  ctx.lineTo(r * 0.16, -r * 1.28);
  ctx.lineTo(r * 0.30, -r * 0.90);
  ctx.closePath();
  ctx.fill();

  // 4. Forehead Bang Strands (Sharp, discrete locks framing the skin dome)
  const bangs = [
    { startX: -r * 0.65, startY: -r * 0.50, tipX: -r * 0.58, tipY: -r * 0.18, endX: -r * 0.46, endY: -r * 0.45 },
    { startX: -r * 0.48, startY: -r * 0.55, tipX: -r * 0.34, tipY: -r * 0.22, endX: -r * 0.22, endY: -r * 0.52 },
    { startX: -r * 0.24, startY: -r * 0.58, tipX: -r * 0.08, tipY: -r * 0.19, endX: r * 0.04, endY: -r * 0.56 },
    { startX: 0, startY: -r * 0.58, tipX: r * 0.14, tipY: -r * 0.21, endX: r * 0.28, endY: -r * 0.54 },
    { startX: r * 0.26, startY: -r * 0.52, tipX: r * 0.42, tipY: -r * 0.18, endX: r * 0.56, endY: -r * 0.48 },
    { startX: r * 0.52, startY: -r * 0.45, tipX: r * 0.64, tipY: -r * 0.16, endX: r * 0.72, endY: -r * 0.40 },
  ];

  for (let i = 0; i < bangs.length; i++) {
    const b = bangs[i];
    ctx.beginPath();
    ctx.moveTo(b.startX, b.startY);
    ctx.lineTo(b.tipX, b.tipY);
    ctx.lineTo(b.endX, b.endY);
    ctx.closePath();
    ctx.fill();
  }

  // 5. Crown Highlight Sheen
  ctx.fillStyle = highlightCol;
  ctx.beginPath();
  ctx.arc(0, -r * 0.85, r * 0.35, Math.PI * 1.1, Math.PI * 1.9);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws Choso's anime hair from Assets/model/choso/Choso-hair.png or procedural fallback.
 */
export function _drawChosoHair(ctx, r, facingLeft = false) {
  const custom = (typeof state !== 'undefined' && state.skinCustomizations?.choso) || {};
  const wMult = custom.widthScale ?? 1.0;
  const hMult = custom.heightScale ?? 1.0;
  const offX = custom.offsetX ?? 0;
  const offY = custom.offsetY ?? 0;
  const rot = custom.angleOffset ?? 0;
  const flipX = custom.flipX ? -1 : 1;
  const flipY = custom.flipY ? -1 : 1;

  const hairImg = _getChosoHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Calibrated crown anchor for Choso hair asset
    const targetHairWidth = r * 3.05 * wMult;
    const targetHairHeight = r * 2.20 * hMult;
    const scaleX = targetHairWidth / 1200;
    const scaleY = targetHairHeight / 900;
    const drawW = 1200 * scaleX;
    const drawH = 900 * scaleY;
    const drawX = -600 * scaleX + offX;
    const drawY = -r * 1.35 + offY;

    if (rot !== 0 || flipX !== 1 || flipY !== 1) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      if (rot !== 0) ctx.rotate(rot);
      if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
      ctx.drawImage(hairImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(hairImg, drawX, drawY, drawW, drawH);
    }
    ctx.restore();
  } else {
    // Crisp pixel art discrete lock procedural fallback
    _drawProceduralChosoHair(ctx, r, offX, offY, wMult, hMult, rot, flipX, flipY);
  }
}

let _cachedChosoBodyCanvas = null;
let _cachedChosoBodyR = 0;

/**
 * Procedural Pixel Art Render Function (Renders once to offscreen cache).
 * Strictly adheres to Toji Reference Standard (Rule 24):
 * - Fixed discrete grid unit P = 2.0px with integer coordinate snapping
 * - 4-neighbor attached boundary shell test for solid #0E0F14 manga ink outline
 * - Vertical Proportion Zones:
 *   Zone 1 (ry < r * 0.28): Pale skin dome with iconic horizontal nose blood stripe
 *   Zone 2 (r * 0.28 <= ry < r * 0.65): High cream scarf collar + plum-charcoal martial arts tunic
 *   Zone 3 (r * 0.65 <= ry < r * 0.78): Dark burgundy/black obi belt sash
 *   Zone 4 (ry >= r * 0.78): Deep slate-black baggy hakama trousers
 */
function _renderChosoPixelBodyToCanvas(destCtx, r) {
  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);
  const P = 2.0;
  const steps = Math.ceil((r + P) / P);

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;

      // 4-neighbor boundary test for clean 1-pixel outer manga ink outline (Rule 24)
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
      // ZONE 1: Face Dome & Iconic Blood Stripe (ry < r * 0.28)
      // ──────────────────────────────────────────
      if (ry < r * 0.28) {
        let col = '#F4DDD0'; // Pale, cold Death Painting skin tone

        // Side cheek shading contour
        if (Math.abs(rx) > r * 0.70) {
          col = '#DDB9A4';
        }

        // Iconic Horizontal Blood Scab Stripe across the nose bridge and cheeks
        // Positioned centrally: rx in [-r * 0.44, +r * 0.44], ry in [-r * 0.04, +r * 0.09]
        if (Math.abs(rx) <= r * 0.44 && ry >= -r * 0.04 && ry <= r * 0.09) {
          if (ry <= -r * 0.02 || ry >= r * 0.07 || Math.abs(rx) >= r * 0.40) {
            col = '#3E0B12'; // Deep dried blood border
          } else {
            col = '#6E1420'; // Coagulated dark blood core
          }
        }

        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: Collar & Martial Arts Robes (r * 0.28 <= ry < r * 0.65)
      // ──────────────────────────────────────────
      else if (ry < r * 0.65) {
        // High wrap cream-white under-kimono scarf collar (ry: 0.28r to 0.42r)
        if (ry < r * 0.42) {
          if (Math.abs(rx) <= r * 0.50) {
            // Fold shadow
            destCtx.fillStyle = (Math.abs(rx) < r * 0.15) ? '#DED5C2' : '#EEE5D3';
          } else {
            destCtx.fillStyle = '#221828'; // Outer shoulder robe fabric
          }
        }
        // Baggy Sleeveless Plum-Charcoal Tabard Tunic (ry: 0.42r to 0.65r)
        else {
          if (Math.abs(rx) <= r * 0.12) {
            destCtx.fillStyle = '#1D1422'; // Center chest seam / fold
          } else if (Math.abs(rx) < r * 0.42 && ry > r * 0.46 && ry < r * 0.58) {
            destCtx.fillStyle = '#3F2F4A'; // Robe fold highlight
          } else {
            destCtx.fillStyle = '#2E2236'; // Main plum-charcoal martial arts fabric
          }
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: Obi Sash Belt & Forward Knot (r * 0.65 <= ry < r * 0.78)
      // ──────────────────────────────────────────
      else if (ry < r * 0.78) {
        if (Math.abs(rx) <= r * 0.14) {
          destCtx.fillStyle = '#100B14'; // Center hanging sash knot
        } else if (Math.abs(rx) < r * 0.10 && ry > r * 0.70) {
          destCtx.fillStyle = '#4D1A25'; // Knot fold highlight
        } else {
          destCtx.fillStyle = '#20121C'; // Dark burgundy-black obi sash band
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 4: Lower Hakama Trousers (ry >= r * 0.78)
      // ──────────────────────────────────────────
      else {
        if (Math.abs(rx) <= P * 0.6) {
          destCtx.fillStyle = '#0E0912'; // Center pants inseam crease
        } else if ((Math.abs(rx) >= r * 0.30 && Math.abs(rx) <= r * 0.38) || Math.abs(rx) >= r * 0.68) {
          destCtx.fillStyle = '#150F1A'; // Deep pleat shadow
        } else {
          destCtx.fillStyle = '#241B2B'; // Deep slate-plum hakama cloth
        }
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  destCtx.restore();
}

/**
 * Draws Choso's procedural pixel-art body with offscreen canvas caching.
 */
export function drawChosoPixelBody(ctx, r) {
  if (typeof document === 'undefined') {
    _renderChosoPixelBodyToCanvas(ctx, r);
    return;
  }

  const intR = Math.round(r);
  if (!_cachedChosoBodyCanvas || _cachedChosoBodyR !== intR) {
    const P = 2.0;
    const steps = Math.ceil((intR + P) / P);
    const size = (steps * 2 + 1) * P;
    _cachedChosoBodyCanvas = document.createElement('canvas');
    _cachedChosoBodyCanvas.width = size;
    _cachedChosoBodyCanvas.height = size;
    const cctx = _cachedChosoBodyCanvas.getContext('2d');
    _renderChosoPixelBodyToCanvas(cctx, intR);
    _cachedChosoBodyR = intR;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const size = _cachedChosoBodyCanvas.width;
  ctx.drawImage(_cachedChosoBodyCanvas, -size / 2, -size / 2);
  ctx.restore();
}

/**
 * Main Skin Renderer for Choso
 */
export function drawChosoSkin(ctx, fighter) {
  const r = fighter.r || 25;

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // 1. Orientation & Mirroring (Rule 19 Upright Front POV)
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
  ctx.rotate(angle);

  const facingLeft = Math.abs(normAngle) > Math.PI / 2;
  if (facingLeft && !fighter.isSpinning) {
    ctx.scale(1, -1);
  }

  // 2. Procedural Pixel-Art Body (Rule 24 Toji Baseline)
  drawChosoPixelBody(ctx, r);

  // 3. Hair Asset Overlay (Rule 22 Standard)
  _drawChosoHair(ctx, r, facingLeft);

  // 4. Canonical Default Symmetrical Hand Layering (Rule 20)
  const shouldHideHands = Boolean(
    (typeof state !== 'undefined' && state.showSkinOnly) ||
    fighter.hideHands ||
    fighter.usesCustomHands
  );

  if (!shouldHideHands) {
    const handRadius = getHandSize(r * 0.30);
    const skinTone = '#EAD2C2';

    // Check if Choso is performing Convergence Clasp (Prayer Pose)
    const isClasping = Boolean(
      fighter.isCastingLaserMatrix ||
      fighter.isChargingPiercingBlood ||
      fighter.isClaspedForConvergence
    );

    if (isClasping) {
      // Hands translate symmetrically into center prayer clasp cupping compressed blood
      ctx.save();
      ctx.translate(0, r * 0.25);
      drawPixelHand(ctx, -handRadius * 0.70, 0, handRadius, skinTone);
      drawPixelHand(ctx, handRadius * 0.70, 0, handRadius, skinTone);
      // Pulsing miniature blood singularity in palms
      const pulse = Math.sin(performance.now() * 0.02) * 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 4.5 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = '#FF2A55';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.restore();
    } else {
      // Canonical Approved Symmetrical Lower Flank Positioning (Rule 20)
      // Left Hand: (x: -r * 0.82, y: +r * 0.38)
      // Right Hand: (x: +r * 0.82, y: +r * 0.38)
      drawPixelHand(ctx, -r * 0.82, r * 0.38, handRadius, skinTone);
      drawPixelHand(ctx, r * 0.82, r * 0.38, handRadius, skinTone);
    }
  }

  // 5. Flowing Red Scale: Stack Vascular Marking Glow (when buff active)
  if (fighter.isFlowingRedScaleActive) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 30, 60, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    // Subtle capillary branches across cheeks
    ctx.moveTo(-r * 0.40, 0);
    ctx.lineTo(-r * 0.60, -r * 0.15);
    ctx.moveTo(r * 0.40, 0);
    ctx.lineTo(r * 0.60, -r * 0.15);
    ctx.stroke();
    ctx.restore();
  }

  // 6. Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}

/**
 * Ghost model afterimage renderer for Choso's Flowing Red Scale dashes.
 */
export function drawChosoGhostSkin(ctx, x, y, angle = 0, r = 25, alpha = 0.5) {
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

  // Sanguine Cursed Energy Aura Disc
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(163, 29, 29, 0.28)';
  ctx.fill();

  drawChosoPixelBody(ctx, r);
  _drawChosoHair(ctx, r, facingLeft);

  ctx.restore();
}
