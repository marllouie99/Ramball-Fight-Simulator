// ─────────────────────────────────────────────
// YUTA OKKOTSU FIGHTER SKIN & BODY MODEL
// Special Grade Jujutsu Sorcerer (Jujutsu Kaisen)
// Features Authentic Pixel-Art Model Matching Reference:
// 1. High Standing White Wrap Collar with Gold Swirl Button & Dark Strap
// 2. Fair Ivory-Peach Skin Tone (Rule 19 Compliant, Faceless)
// 3. Midnight Charcoal Pants with Center White Cinch/Zipper Line
// 4. Authentic Pixel-Art Jet-Black Swept Hair (Assets/model/Yuta-hair.png)
// Rule 19 (Upright Front POV), Rule 20 (Hand Visibility), and Rule 11 Compliant
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { FighterRenderer, drawPixelHand } from '../renderers/fighterRenderer.js';

let _yutaHairImage = null;
let _yutaHairImageLoading = false;

export function _getYutaHairImage() {
  if (_yutaHairImage && _yutaHairImage.complete && _yutaHairImage.naturalWidth > 0) {
    return _yutaHairImage;
  }
  if (!_yutaHairImageLoading && typeof Image !== 'undefined') {
    _yutaHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _yutaHairImage = img;
      _yutaHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Yuta hair image at Assets/model/Yuta-hair.png', e);
      _yutaHairImageLoading = false;
    };
    img.src = 'Assets/model/Yuta-hair.png?v=2';
    _yutaHairImage = img;
  }
  return _yutaHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getYutaHairImage();
}

/**
 * Draws Yuta's authentic anime spiky hair from Assets/model/Yuta-hair.png.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawYutaHair(ctx, r, facingLeft = false) {
  const hairImg = _getYutaHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp pixel art fidelity (Rule #19)

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.yuta) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;

    // Yuta-hair.png (577x433). True visible hair bounding box:
    // X: [72, 492] (width 421, horizontal center at 282)
    // Y: [82, 408] (height 327, top crown at 82)
    // Scales to seamlessly cover the upper circle with spiky crown at -1.25r
    const targetHairWidth = r * 2.40 * wMult;
    const targetHairHeight = r * 1.80 * hMult;
    const scaleX = targetHairWidth / 421;
    const scaleY = targetHairHeight / 327;
    const drawW = 577 * scaleX;
    const drawH = 433 * scaleY;
    const drawX = -282 * scaleX + offX;
    const drawY = -r * 1.25 - 82 * scaleY + offY;

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
 * Draws Yuta's hand with white uniform sleeve cuff, skin tone, and signature silver engagement ring.
 * Fully compliant with Rule 20 (Hand Visibility & Skin Only).
 */
export function drawYutaFist(ctx, x, y, radius, skinColor = '#F7C4A5', fighter = null, isLeft = false) {
  ctx.save();
  ctx.translate(x, y);

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  // 1. Special Grade White Uniform Sleeve Cuff (Pixel Art Stepped Rect)
  const cuffX = -radius * 1.1;
  const cuffY = -radius * 0.72;
  const cuffW = radius * 1.0;
  const cuffH = radius * 1.44;

  // Stepped Dark Ink Outline for Sleeve
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(snap(cuffX - P), snap(cuffY - P), snap(cuffW + P * 2), snap(cuffH + P * 2));
  // White Fabric Fill
  ctx.fillStyle = '#FAFAFC';
  ctx.fillRect(snap(cuffX), snap(cuffY), snap(cuffW), snap(cuffH));
  // Sleeve Fold Crease Pixel
  ctx.fillStyle = '#D0D8E2';
  ctx.fillRect(snap(cuffX + cuffW * 0.5), snap(cuffY + P), P, snap(cuffH - P * 2));

  // 2. Skin Knuckle / Fist in Pixel Art Style
  drawPixelHand(ctx, 0, 0, radius, skinColor);

  // 3. Signature Silver Engagement Ring (on left hand) in Pixel Art
  if (isLeft) {
    const rx = snap(radius * 0.25);
    const ry = snap(-radius * 0.15);
    ctx.fillStyle = '#0E0F14';
    ctx.fillRect(rx - P, ry - P, P * 3, P * 3);
    ctx.fillStyle = '#E8ECEF';
    ctx.fillRect(rx, ry, P * 2, P * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(rx, ry, P, P); // Ring shine glint
  }

  // 4. Subtle Cursed Energy (Pink/Magenta Bloom) around hands when active
  if (fighter && (typeof state === 'undefined' || state.gameState !== 'countdown') && (fighter.combatAuraOpacity > 0.1 || fighter.isChannelingDomain || (fighter.flurrySlashTimer || 0) > 0)) {
    const auraAlpha = Math.min(1.0, (fighter.combatAuraOpacity || 0.6) * 0.8);
    ctx.strokeStyle = `rgba(255, 20, 147, ${auraAlpha})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.25, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
  }

  ctx.restore();
}

let _cachedYutaBodyCanvas = null;
let _cachedYutaBodyR = 0;

/**
 * Procedural Pixel Art Render Function (Renders once to offscreen cache).
 * Matches the reference image:
 * - Stepped dark outer circle stroke
 * - Warm fair peach face skin (no procedural hair)
 * - White wrap collar / jacket with dark left notch, gold swirl button, dark shoulder strap
 * - Midnight charcoal pants with center white cinch / zipper line
 */
function _renderYutaPixelBodyToCanvas(destCtx, r) {
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
      // ZONE 1: Face Skin (ry < r * 0.14)
      // ──────────────────────────────────────────
      if (ry < r * 0.14) {
        let col = '#F7C4A5'; // Fair warm peach
        if (Math.abs(rx) > r * 0.70) {
          col = '#E8B496'; // Subtle cheek contour
        }
        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: White Jujutsu High Jacket & Wrap Collar (r * 0.14 <= ry < r * 0.64)
      // ──────────────────────────────────────────
      else if (ry < r * 0.64) {
        // Gold Button #1: cx = r * 0.38, cy = r * 0.38, btnR = r * 0.10
        const btnX = r * 0.38, btnY = r * 0.38, btnR = r * 0.10;
        const bDist = Math.hypot(rx - btnX, ry - btnY);

        if (bDist <= btnR) {
          if (bDist >= btnR - P * 0.8) {
            destCtx.fillStyle = '#1C1917'; // Dark bronze rim
          } else if (Math.hypot(rx - (btnX - btnR * 0.35), ry - (btnY - btnR * 0.35)) <= P * 0.9) {
            destCtx.fillStyle = '#FCD34D'; // Soft golden highlight
          } else if (bDist <= btnR * 0.35) {
            destCtx.fillStyle = '#78350F'; // Inner swirl dot
          } else {
            destCtx.fillStyle = '#D4AF37'; // Rich Antique Gold
          }
        } else if (rx >= r * 0.44 && rx <= r * 0.54 && ry >= r * 0.30) {
          // Subtle shoulder fold crease on right
          destCtx.fillStyle = '#D0D8E2';
        } else if (rx <= -r * 0.52 && ry >= r * 0.14 && ry <= r * 0.22) {
          // Left collar notch
          destCtx.fillStyle = '#333B48';
        } else if (ry > r * 0.54) {
          // Lower fold shadow band
          destCtx.fillStyle = '#D0D8E2';
        } else {
          // Pure white jacket
          destCtx.fillStyle = '#FAFAFC';
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: Dark Uniform Pants (ry >= r * 0.64)
      // ──────────────────────────────────────────
      else {
        // Subtle center dark inseam crease (zero white wrapper lines)
        if (Math.abs(rx) <= P * 0.6 && ry >= r * 0.64 && ry <= r * 0.94) {
          destCtx.fillStyle = '#0E1014'; // Subtle center inseam
        } else {
          destCtx.fillStyle = '#16181E'; // Midnight charcoal navy
        }
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  destCtx.restore();
}

/**
 * Draws Yuta Okkotsu's entire body circle model in authentic Pixel Art Style (Offscreen Cached).
 * Uses discrete stepped pixel grid rasterization matching the reference image.
 * Minimalist circle brawler aesthetic, upright front POV, faceless (Rule #19 compliant).
 */
export function drawYutaPixelBody(ctx, r) {
  if (typeof document === 'undefined') {
    _renderYutaPixelBodyToCanvas(ctx, r);
    return;
  }

  const intR = Math.round(r);
  if (!_cachedYutaBodyCanvas || _cachedYutaBodyR !== intR) {
    _cachedYutaBodyR = intR;
    const P = 2.0;
    const steps = Math.ceil((intR + P) / P);
    const size = (steps * 2 + 1) * P;

    _cachedYutaBodyCanvas = document.createElement('canvas');
    _cachedYutaBodyCanvas.width = size;
    _cachedYutaBodyCanvas.height = size;
    const offCtx = _cachedYutaBodyCanvas.getContext('2d');
    _renderYutaPixelBodyToCanvas(offCtx, intR);
  }

  if (_cachedYutaBodyCanvas) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Enforce circular clip mask to prevent any rectangular canvas bleeding
    ctx.beginPath();
    ctx.arc(0, 0, intR + 1, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(_cachedYutaBodyCanvas, -_cachedYutaBodyCanvas.width / 2, -_cachedYutaBodyCanvas.height / 2);
    ctx.restore();
  }
}

/**
 * Main entry point — Draws Yuta Okkotsu's stylized anime character body circle.
 */
export function drawYutaSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);

  ctx.save();
  ctx.translate(fighter.x || 0, (fighter.y || 0) - (fighter.z || 0));

  // Facing orientation & Rule 19 local space transform
  const isEntrance = Boolean((typeof state !== 'undefined' && state._bossEntranceActive) || fighter._hideInBush);
  const angle = (isPodiumPreview || isEntrance) ? (fighter.angle || 0) : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  ctx.rotate(angle);

  // Vertical flip when aiming left so hair stays at -Y (Top) and uniform stays at +Y (Bottom)
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // ── 1. BODY CIRCLE (Authentic Procedural Pixel Art) ──
  drawYutaPixelBody(ctx, r);

  // ── 2. AUTHENTIC PIXEL-ART HAIR MODEL (Assets/model/Yuta-hair.png) ──
  _drawYutaHair(ctx, r, facingLeft);

  // ── 3. STATUS OVERLAYS (Freeze, Paralyze, Stun, RCT) ──
  FighterRenderer.drawStatusOverlays(ctx, fighter);

  ctx.restore();
}

/**
 * Draws Yuta's spectral ghost afterimage model during dashes, flurry combos, and teleports.
 */
export function drawYutaGhostSkin(ctx, x, y, angle = 0, r = 25, alpha = 0.5) {
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

  // 1. Spectral Cursed Energy Outer Glow (Pink/Magenta)
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 20, 147, 0.25)';
  ctx.fill();

  // 2. Pixel Body & Hair
  drawYutaPixelBody(ctx, r);
  _drawYutaHair(ctx, r, facingLeft);

  // 3. Ghost outline
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.restore();
}
