// ─────────────────────────────────────────────
// SPARTAN FIGHTER SKIN & BODY MODEL
// Ancient Greek Hoplite (Rule 24 Toji Reference Standard)
// 1. Corinthian Bronze Helmet with Dark T-Visor Slit & Towering Red Horsehair Crest
// 2. Sculpted Bronze Muscle Cuirass / Linothorax over Crimson Tunic
// 3. Leather Pteruges (Belt Strips) with Bronze Studs
// 4. Red Spartan Cloak (Chlamys) draped across the shoulders
// 5. Rule 19 (Upright Front POV), Rule 20 (Symmetrical Hands), Rule 3.2 (Faceless)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

let _cachedSpartanBodyCanvas = null;
let _cachedSpartanBodyR = 0;
let _spartanCrestImage = null;
let _spartanCrestLoading = false;

export function _getSpartanCrestImage() {
  if (_spartanCrestImage && _spartanCrestImage.complete && _spartanCrestImage.naturalWidth > 0) {
    return _spartanCrestImage;
  }
  if (!_spartanCrestLoading && typeof Image !== 'undefined') {
    _spartanCrestLoading = true;
    const img = new Image();
    img.onload = () => {
      _spartanCrestImage = img;
      _spartanCrestLoading = false;
    };
    img.onerror = () => {
      if (!img.src.includes('.jpg')) {
        img.src = 'Assets/model/Spartan/spartan_helmet.jpg?v=1';
      } else {
        _spartanCrestLoading = false;
      }
    };
    img.src = 'Assets/model/Spartan/spartan_helmet.png?v=1';
    _spartanCrestImage = img;
  }
  return _spartanCrestImage;
}

export const _getSpartanHairImage = _getSpartanCrestImage;

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getSpartanCrestImage();
}

/**
 * Draws Spartan's iconic Corinthian bronze helmet and horsehair crest from Assets/model/Spartan/spartan_helmet.png.
 * Falls back seamlessly to procedural rasterization if image is not yet loaded or in test mocks.
 */
export function _drawSpartanCrest(ctx, r, facingLeft = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const crestImg = _getSpartanCrestImage();
  const custom = (typeof state !== 'undefined' && state.skinCustomizations?.spartan) || {};
  const useProcedural = custom.proceduralOnly === true;

  if (!useProcedural && crestImg && crestImg.complete && crestImg.naturalWidth > 0) {
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;
    const flipX = custom.flipX ? -1 : 1;
    const flipY = custom.flipY ? -1 : 1;

    // spartan_helmet.png (784x1312) - calibrated to frame the upper body circle seamlessly
    const baseW = r * 2.10;
    const baseH = r * 3.514; // 2.10 * (1312 / 784)
    const targetW = baseW * wMult;
    const targetH = baseH * hMult;
    const drawX = -targetW / 2 + offX;
    const drawY = -r * 1.52 + offY;

    if (rot !== 0 || flipX !== 1 || flipY !== 1) {
      ctx.translate(drawX + targetW / 2, drawY + targetH / 2);
      if (rot !== 0) ctx.rotate(rot);
      if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
      ctx.drawImage(crestImg, -targetW / 2, -targetH / 2, targetW, targetH);
    } else {
      ctx.drawImage(crestImg, drawX, drawY, targetW, targetH);
    }
    ctx.restore();
    return;
  }

  // Corinthian transverse horsehair crest spanning across the helmet crown (-r * 1.45 to -r * 0.20)
  const P = 2.0;
  const crestW = r * 1.6;
  const crestTopY = -r * 1.40;
  const crestBotY = -r * 0.25;

  // Crest holder base (bronze ridge mount along the center of the helmet)
  ctx.fillStyle = '#85581A';
  ctx.fillRect(-P * 1.5, crestBotY - 4, P * 3, 6);
  ctx.fillStyle = '#C28B38';
  ctx.fillRect(-P * 1.0, crestBotY - 4, P * 2, 5);

  // Black horsehair root / binding band
  ctx.fillStyle = '#18181B';
  ctx.fillRect(-crestW * 0.45, crestBotY - 8, crestW * 0.9, 4);

  // Flowing Spartan crimson horsehair plumes (stepped dense pixel locks)
  const plumeLocks = [
    { x: -0.42, yOff: 4, h: 22 },
    { x: -0.32, yOff: 8, h: 26 },
    { x: -0.22, yOff: 12, h: 30 },
    { x: -0.11, yOff: 14, h: 32 },
    { x: 0.00,  yOff: 15, h: 33 }, // Apex crown
    { x: 0.11,  yOff: 14, h: 32 },
    { x: 0.22,  yOff: 12, h: 30 },
    { x: 0.32,  yOff: 8, h: 26 },
    { x: 0.42,  yOff: 4, h: 22 },
    { x: 0.50,  yOff: -2, h: 18 }, // Trailing back plume
    { x: 0.58,  yOff: -8, h: 14 }
  ];

  for (const lock of plumeLocks) {
    const lx = Math.round((lock.x * crestW) / P) * P;
    const ly = Math.round((crestTopY + (33 - lock.h)) / P) * P;
    const lh = lock.h;

    // Dark crimson shadow plume
    ctx.fillStyle = '#7F1D1D';
    ctx.fillRect(lx - P, ly, P * 2, lh);

    // Vibrant Spartan red core
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(lx - P * 0.5, ly + 2, P, lh - 4);

    // Tip highlight
    ctx.fillStyle = '#F87171';
    ctx.fillRect(lx - P * 0.5, ly, P, 3);
  }

  ctx.restore();
}

/**
 * Procedural Pixel Art Render Function (Renders once to offscreen cache).
 * Adheres strictly to Rule 24 (Toji Reference Standard Proportions):
 * - Zone 1 (ry < 0.28r): Corinthian Bronze Helmet with Dark T-Visor opening & bronze cheek plates
 * - Zone 2 (0.28r <= ry < 0.64r): Bronze Muscle Cuirass & Red Spartan Cloak across shoulders
 * - Zone 3 (0.64r <= ry < 0.78r): Leather Pteruges (Groin/Waist Armor) with Bronze Studs
 * - Zone 4 (ry >= 0.78r): Crimson Tunic & Bronze Greaves
 */
function _renderSpartanPixelBodyToCanvas(destCtx, r) {
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

      // 4-neighbor boundary test for clean 1-pixel outer ink outline
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
      // ZONE 1: Corinthian Bronze Helmet & T-Visor (ry < r * 0.28)
      // ──────────────────────────────────────────
      if (ry < r * 0.28) {
        // Iconic Spartan T-Visor: Dark eye slit & nose guard opening
        const isHorizontalEyeSlit = (ry >= -r * 0.02 && ry <= r * 0.12 && Math.abs(rx) <= r * 0.52);
        const isVerticalNoseGuard = (ry >= r * 0.08 && ry <= r * 0.26 && Math.abs(rx) <= r * 0.12);

        if (isHorizontalEyeSlit && !isVerticalNoseGuard) {
          // Dark shadow inside helmet slit
          destCtx.fillStyle = '#0F0E0D';
        } else if (isVerticalNoseGuard) {
          // Bronze nose bridge guard
          destCtx.fillStyle = (Math.abs(rx) <= P * 0.5) ? '#D9A04A' : '#A17024';
        } else {
          // Bronze Helmet Dome & Cheek Guards
          if (ry < -r * 0.15) {
            // Upper forehead dome with specular glint
            destCtx.fillStyle = (Math.abs(rx) < r * 0.25 && ry < -r * 0.20) ? '#E5B869' : '#C28B38';
          } else if (Math.abs(rx) > r * 0.45) {
            // Side cheek contour
            destCtx.fillStyle = '#85581A';
          } else {
            // Mid helmet bronze
            destCtx.fillStyle = '#B37E2E';
          }
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: Bronze Muscle Cuirass & Red Cloak (r * 0.28 <= ry < r * 0.64)
      // ──────────────────────────────────────────
      else if (ry < r * 0.64) {
        // Red Spartan Cloak (Chlamys) on outer flanks (|rx| > r * 0.62)
        if (Math.abs(rx) > r * 0.62) {
          destCtx.fillStyle = (Math.abs(rx) > r * 0.78) ? '#7F1D1D' : '#B91C1C';
        } else {
          // Sculpted Bronze Breastplate / Muscle Cuirass
          if (ry < r * 0.35) {
            // Gorget / upper neckline
            destCtx.fillStyle = '#784E14';
          } else if (Math.abs(rx) < r * 0.32 && ry >= r * 0.38 && ry <= r * 0.50) {
            // Pectoral plate highlights
            destCtx.fillStyle = '#D9A04A';
          } else if (Math.abs(rx) <= P * 0.6 && ry > r * 0.45) {
            // Center sternum seam
            destCtx.fillStyle = '#5A380C';
          } else {
            // Main bronze cuirass
            destCtx.fillStyle = '#A87326';
          }
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: Leather Pteruges & Bronze Studs (r * 0.64 <= ry < r * 0.78)
      // ──────────────────────────────────────────
      else if (ry < r * 0.78) {
        // Repeating leather armor strips (pteruges) with golden bronze studs
        const stripIndex = Math.floor((rx + r) / (P * 2.5));
        const isStud = (ry >= r * 0.68 && ry <= r * 0.72 && (Math.abs(rx) % (P * 2.5)) < P);
        
        if (isStud) {
          destCtx.fillStyle = '#FBBF24'; // Golden bronze stud
        } else if (stripIndex % 2 === 0) {
          destCtx.fillStyle = '#451A03'; // Dark leather strip
        } else {
          destCtx.fillStyle = '#78350F'; // Mid leather strip
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 4: Crimson Tunic & Bronze Greaves (ry >= r * 0.78)
      // ──────────────────────────────────────────
      else {
        if (Math.abs(rx) <= P * 0.6) {
          destCtx.fillStyle = '#0E0F14'; // Center pleat crease
        } else if (Math.abs(rx) >= r * 0.40) {
          // Bronze greaves on lower legs
          destCtx.fillStyle = (Math.abs(rx) >= r * 0.70) ? '#85581A' : '#C28B38';
        } else {
          // Crimson Spartan battle tunic
          destCtx.fillStyle = (ry > r * 0.88) ? '#991B1B' : '#B91C1C';
        }
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  destCtx.restore();
}

/**
 * Draws Spartan's procedural pixel-art body with offscreen caching.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Fighter radius
 */
export function drawSpartanPixelBody(ctx, r) {
  if (typeof document === 'undefined') {
    _renderSpartanPixelBodyToCanvas(ctx, r);
    return;
  }

  const intR = Math.round(r);
  if (!_cachedSpartanBodyCanvas || _cachedSpartanBodyR !== intR) {
    const P = 2.0;
    const steps = Math.ceil((intR + P) / P);
    const size = (steps * 2 + 1) * P;
    _cachedSpartanBodyCanvas = document.createElement('canvas');
    _cachedSpartanBodyCanvas.width = size;
    _cachedSpartanBodyCanvas.height = size;
    const cctx = _cachedSpartanBodyCanvas.getContext('2d');
    cctx.imageSmoothingEnabled = false;
    _renderSpartanPixelBodyToCanvas(cctx, intR);
    _cachedSpartanBodyR = intR;
  }

  const P = 2.0;
  const steps = Math.ceil((intR + P) / P);
  const size = (steps * 2 + 1) * P;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_cachedSpartanBodyCanvas, -size / 2, -size / 2);
  ctx.restore();
}

/**
 * Draws Spartan's complete upright skin:
 * Layer 1: Procedural offscreen pixel body (Toji standard)
 * Layer 2: Corinthian horsehair crest
 * Layer 3: Rule 20 symmetrical canonical hands
 */
export function drawSpartanSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;

  // Layer 1: Pixel body
  drawSpartanPixelBody(ctx, r);

  // Layer 2: Corinthian horsehair crest
  const facingLeft = fighter.facingLeft ?? (Math.abs(fighter.gunAngle || fighter.angle || 0) > Math.PI / 2);
  _drawSpartanCrest(ctx, r, facingLeft);

  // Layer 3: Rule 20 Canonical Symmetrical Hands
  if (!shouldHideHands) {
    const handRadius = getHandSize(r * 0.30);
    const skinTone = '#C28B38'; // Spartan bronze vambraces

    // Left Hand (Hoplon Shield Grip): (-r * 0.82, +r * 0.38)
    drawPixelHand(ctx, -r * 0.82, r * 0.38, handRadius, skinTone);

    // Right Hand (Spear / Javelin Grip): (+r * 0.82, +r * 0.38)
    drawPixelHand(ctx, r * 0.82, r * 0.38, handRadius, skinTone);
  }
}
