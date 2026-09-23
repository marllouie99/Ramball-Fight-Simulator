// ─────────────────────────────────────────────
// Zenitsu Agatsuma Fighter Skin & Body Model (Authentic Pixel Art Edition)
// Demon Slayer: Kimetsu no Yaiba
// Features Authentic Pixel-Art Model:
// 1. Pale Anime Skin Face (Rule 19 Compliant, Faceless)
// 2. Demon Slayer Corps Uniform & Triangle Scale Haori
// 3. Authentic Pixel-Art Tiered Blonde Hair Asset (Assets/model/Hair/Zenitsu-hair.png)
// Rule 19 (Upright Front POV), Rule 20 (Hand Visibility), and Rule 11 Compliant
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawZenitsuLightningKatana } from '../weapons/demonSlayerWeaponGraphics.js';

let _zenitsuHairImage = null;
let _zenitsuHairImageLoading = false;

export function _getZenitsuHairImage() {
  if (_zenitsuHairImage && _zenitsuHairImage.complete && _zenitsuHairImage.naturalWidth > 0) {
    return _zenitsuHairImage;
  }
  if (!_zenitsuHairImageLoading && typeof Image !== 'undefined') {
    _zenitsuHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _zenitsuHairImage = img;
      _zenitsuHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Zenitsu hair image at Assets/model/Hair/Zenitsu-hair.png, attempting Assets/model/Zenitsu-hair.png fallback', e);
      const fallback = new Image();
      fallback.onload = () => {
        _zenitsuHairImage = fallback;
        _zenitsuHairImageLoading = false;
      };
      fallback.onerror = (err) => {
        console.warn('Failed to load fallback Zenitsu hair image', err);
        _zenitsuHairImageLoading = false;
      };
      fallback.src = 'Assets/model/Zenitsu-hair.png?v=1';
    };
    img.src = 'Assets/model/Hair/Zenitsu-hair.png?v=1';
    _zenitsuHairImage = img;
  }
  return _zenitsuHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getZenitsuHairImage();
}

/**
 * Draws Zenitsu's authentic square-cut tiered blonde hair from Assets/model/Hair/Zenitsu-hair.png.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawZenitsuHair(ctx, r, facingLeft = false) {
  const hairImg = _getZenitsuHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp pixel art fidelity (Rule #19)

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.zenitsu) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;

    // Zenitsu-hair.png (516x484). True visible hair bounding box:
    // X: [55, 461] (width 407, horizontal center at 258)
    // Y: [54, 409] (height 356, top crown at 54)
    // Calibrated to seamlessly frame the upper circle with square-cut crown at -1.25r
    const targetHairWidth = r * 2.35 * wMult;
    const targetHairHeight = r * 1.95 * hMult;
    const scaleX = targetHairWidth / 407;
    const scaleY = targetHairHeight / 356;
    const drawW = 516 * scaleX;
    const drawH = 484 * scaleY;
    const drawX = -258 * scaleX + offX;
    const drawY = -r * 1.25 - 54 * scaleY + offY;

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
 * Main Skin Renderer for Zenitsu Agatsuma (Pixel Art)
 */
export function drawZenitsuSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);

  const isSuppressed = !isPodiumPreview && Boolean(
    fighter.isTargetOfAmbush ||
    (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
  );

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 2. Attack States
  const isKatanaSwinging = !isPodiumPreview && !isSuppressed && (fighter.slashSwingTimer && fighter.slashSwingTimer > 0);
  const isPunching = !isPodiumPreview && !isSuppressed && (fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
  const animPhase = isKatanaSwinging
    ? Math.min(1.0, 1.0 - (fighter.slashSwingTimer / (fighter.slashSwingMaxTimer || 16)))
    : (isPunching ? Math.min(1.0, 1.0 - (fighter.punchAnimTimer / (fighter.punchMaxTime || 14))) : 0);

  // 3. LAYER 0: BACK HAND (Behind Body Layer)
  const showBackHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideBackHand;
  if (showBackHand) {
    _drawZenitsuBackHand(ctx, fighter, r, isKatanaSwinging, isPunching, animPhase);
  }

  // 4. LAYER 1: MAIN BODY (Pixel Circle + Triangle Haori + Corps Uniform + Face Skin)
  drawZenitsuPixelBody(ctx, r);

  // 5. LAYER 2: AUTHENTIC HAIR MODEL OVERLAY (Assets/model/Hair/Zenitsu-hair.png)
  _drawZenitsuHair(ctx, r, facingLeft);

  // 6. LAYER 3: FRONT HAND & LIGHTNING KATANA (On Top of Body)
  const showFrontHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideFrontHand;
  if (showFrontHand) {
    _drawZenitsuFrontHand(ctx, fighter, r, isKatanaSwinging, isPunching, animPhase);
  }

  // 7. Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}

let _cachedZenitsuBodyCanvas = null;
let _cachedZenitsuBodyR = 0;

/**
 * Procedural Pixel-Art Body Renderer for Zenitsu Agatsuma.
 * Authentically implements:
 * 1. High Standing White Collar with Dark Throat V-Notch
 * 2. Demon Slayer Corps Black Gakuran Jacket with Silver/White Buttons & Left Pocket
 * 3. Yellow-to-Orange Gradient Haori with Staggered White Upward Triangle Scale Tessellation
 * 4. Amber-Gold Haori Lapel Separation Creases
 * 5. White Leather Belt with Metallic Steel Buckle & Hanging Strap Tabs
 * 6. Pleated Charcoal-Black Hakama Pants with Deep Crease Shadows & Fold Highlights
 */
function _renderZenitsuPixelBodyToCanvas(destCtx, r) {
  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  const isOffscreen = (typeof destCtx.canvas !== 'undefined' && destCtx.canvas.width > 0 && destCtx.canvas.height > 0);
  if (isOffscreen && typeof document !== 'undefined') {
    destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);
  }

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);
      const normY = ry / r;
      const absGx = Math.abs(gx);

      // ── 1. 1-Pixel Stepped Outer Manga Ink Border ──
      const isBorder = dist >= r - P;
      if (isBorder) {
        destCtx.fillStyle = '#18181B';
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 2. Pale Anime Face Skin (normY < 0.16) ──
      if (normY < 0.16) {
        if (normY < -0.05) {
          destCtx.fillStyle = '#FEE8D6'; // Pale anime skin
        } else if (normY < 0.08) {
          destCtx.fillStyle = '#FDD3B2'; // Warm peach midtone
        } else {
          destCtx.fillStyle = '#F9B786'; // Chin shadow
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 3. High Standing White Collar (gy in [2, 3], |gx| <= 2) ──
      if (gy >= 2 && gy <= 3 && absGx <= 2) {
        if (absGx === 0 && gy === 3) {
          destCtx.fillStyle = '#18181F'; // Dark inner throat opening notch
        } else if (gy === 2) {
          destCtx.fillStyle = '#FFFFFF'; // Crisp white collar top rim
        } else {
          destCtx.fillStyle = '#F1F5F9'; // White collar fabric
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 4. White Belt & Metallic Silver Buckle (gy in [9, 10], |gx| <= 7) ──
      if (gy >= 9 && gy <= 10 && absGx <= 7) {
        if (absGx <= 2) {
          if (absGx === 2 || gy === 9) {
            destCtx.fillStyle = '#94A3B8'; // Metallic buckle outer frame
          } else if (gx === 0 && gy === 10) {
            destCtx.fillStyle = '#64748B'; // Buckle prong
          } else {
            destCtx.fillStyle = '#E2E8F0'; // Bright silver buckle plate
          }
        } else {
          destCtx.fillStyle = (gy === 9) ? '#F8FAFC' : '#E2E8F0'; // Crisp white belt band
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 5. Hanging Belt Strap Tabs (gy in [11, 12], gx in [2, 3]) ──
      if ((gy === 11 || gy === 12) && (gx === 2 || gx === 3)) {
        destCtx.fillStyle = (gy === 11) ? '#F8FAFC' : '#CBD5E1';
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 6. Black Pleated Hakama Pants (gy >= 11, |gx| <= 6) ──
      if (gy >= 11 && absGx <= 6) {
        if (gx === 0 || absGx === 4) {
          destCtx.fillStyle = '#090A0E'; // Pleat vertical shadow crease
        } else if (absGx === 2 || absGx === 5) {
          destCtx.fillStyle = '#2A2C38'; // Pleat fold highlight
        } else {
          destCtx.fillStyle = '#14151D'; // Deep charcoal hakama fabric
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 7. Demon Slayer Corps Uniform Gakuran Jacket (gy in [4, 8], |gx| <= 3) ──
      if (gy >= 4 && gy <= 8 && absGx <= 3) {
        // Silver buttons down center
        if (gx === 0 && (gy === 4 || gy === 7)) {
          destCtx.fillStyle = '#FFFFFF';
        } else if (absGx === 1 && (gy === 4 || gy === 7)) {
          destCtx.fillStyle = '#94A3B8';
        // Left chest pocket white trim
        } else if ((gx === -2 || gx === -3) && gy === 5) {
          destCtx.fillStyle = '#F8FAFC';
        } else if (absGx === 3) {
          destCtx.fillStyle = '#111116'; // Seam edge
        } else {
          destCtx.fillStyle = '#1A1B22'; // Obsidian black uniform fabric
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 8. Haori Inner Lapel Creases (|gx| === 4, gy in [4, 8]) ──
      if (absGx === 4 && gy >= 4 && gy <= 8) {
        destCtx.fillStyle = '#B45309'; // Rich amber-gold lapel crease
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 9. Yellow-to-Orange Haori with White Triangle Scales ──
      function testTri(tx, ty) {
        if (gy === ty && absGx === tx) return true;
        if (gy === ty + 1 && absGx >= tx - 1 && absGx <= tx + 1) return true;
        return false;
      }

      const isTriangle = (
        testTri(8, 2) || testTri(12, 2) ||
        testTri(6, 4) || testTri(10, 4) ||
        testTri(8, 6) || testTri(12, 6) ||
        testTri(6, 8) || testTri(10, 8) ||
        testTri(9, 11)
      );

      if (isTriangle) {
        destCtx.fillStyle = '#FFFFFF'; // Crisp white triangle scale
      } else if (normY < 0.38) {
        destCtx.fillStyle = '#FCD34D'; // Bright sunny yellow top
      } else if (normY < 0.65) {
        destCtx.fillStyle = '#F59E0B'; // Warm sunny amber gold
      } else {
        destCtx.fillStyle = '#EA580C'; // Rich fiery orange lower hem
      }
      destCtx.fillRect(px, py, P, P);
    }
  }

  destCtx.restore();
}

/**
 * Solid 2D Pixel-Art Body for Zenitsu Agatsuma (with offscreen caching)
 */
export function drawZenitsuPixelBody(ctx, r) {
  if (typeof document === 'undefined') {
    _renderZenitsuPixelBodyToCanvas(ctx, r);
    return;
  }

  const intR = Math.round(r);
  if (!_cachedZenitsuBodyCanvas || _cachedZenitsuBodyR !== intR) {
    const P = 2.0;
    const steps = Math.ceil((intR + P) / P);
    const size = (steps * 2 + 1) * P;
    _cachedZenitsuBodyCanvas = document.createElement('canvas');
    _cachedZenitsuBodyCanvas.width = size;
    _cachedZenitsuBodyCanvas.height = size;
    const cctx = _cachedZenitsuBodyCanvas.getContext('2d');
    _renderZenitsuPixelBodyToCanvas(cctx, intR);
    _cachedZenitsuBodyR = intR;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const halfSize = _cachedZenitsuBodyCanvas.width / 2;
  ctx.drawImage(_cachedZenitsuBodyCanvas, -halfSize, -halfSize);
  ctx.restore();
}

/**
 * Pixel Art Back Hand (Lowered to chest/waist level at r * 0.28)
 */
function _drawZenitsuBackHand(ctx, fighter, r, isKatanaSwinging, isPunching, animPhase) {
  const handSize = getHandSize(5.8);
  const backY = r * 0.28 + (isKatanaSwinging ? (animPhase - 0.5) * (r * 0.15) : 0);
  const backX = r * 0.58 + (isKatanaSwinging ? animPhase * 8 : 0);
  drawPixelHand(ctx, backX, backY, handSize, '#FEE8D6', '#18181B');
}

/**
 * Pixel Art Front Hand & Lightning Katana (Lowered to chest/waist level at r * 0.28)
 */
function _drawZenitsuFrontHand(ctx, fighter, r, isKatanaSwinging, isPunching, animPhase) {
  const frontY = r * 0.28 + (isKatanaSwinging ? (animPhase - 0.5) * (r * 0.18) : (isPunching ? (animPhase - 0.5) * (r * 0.10) : 0));
  const frontX = r * 0.82 + (isKatanaSwinging ? animPhase * 12 : (isPunching ? animPhase * 14 : 0));

  // Draw Lightning Katana lowered to front hand level
  drawZenitsuLightningKatana(ctx, 0, frontY, isKatanaSwinging ? (animPhase - 0.5) * 1.6 : 0, r);

  // Front Pixel Fist
  const handSize = getHandSize(6.2);
  drawPixelHand(ctx, frontX, frontY, handSize, '#FEE8D6', '#18181B');
}
