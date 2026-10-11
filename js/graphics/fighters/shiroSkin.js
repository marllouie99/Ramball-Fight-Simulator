// ─────────────────────────────────────────────
// SHIRO FIGHTER SKIN & BODY MODEL
// Queen of Elkia (『　　』 Blank — No Game No Life)
// Adheres strictly to Repository Rules:
// - Rule 19: Upright Front POV Orientation & Faceless Minimalist Standard
// - Rule 20: Symmetrical Lower-Flank Hand Placement
// - Rule 22: Dedicated Hair Asset Model Loading (Assets/model/shiro/shiro-hair.png)
// - Rule 24: Toji 1:1 Offscreen Canvas Buffer Architecture (P = 2.0px)
// - Rule 11: Zero ctx.shadowBlur / ctx.shadowColor
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

let _shiroHairImage = null;
let _shiroHairImageLoading = false;
let _shiroCrownImage = null;
let _shiroCrownImageLoading = false;

export function _getShiroHairImage() {
  if (_shiroHairImage && _shiroHairImage.complete && _shiroHairImage.naturalWidth > 0) {
    return _shiroHairImage;
  }
  if (!_shiroHairImageLoading && typeof Image !== 'undefined') {
    _shiroHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _shiroHairImage = img;
      _shiroHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Shiro hair image at Assets/model/shiro/shiro-hair.png', e);
      _shiroHairImageLoading = false;
    };
    img.src = 'Assets/model/shiro/shiro-hair.png?v=1';
    _shiroHairImage = img;
  }
  return _shiroHairImage;
}

export function _getShiroCrownImage() {
  if (_shiroCrownImage && _shiroCrownImage.complete && _shiroCrownImage.naturalWidth > 0) {
    return _shiroCrownImage;
  }
  if (!_shiroCrownImageLoading && typeof Image !== 'undefined') {
    _shiroCrownImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _shiroCrownImage = img;
      _shiroCrownImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Shiro crown image at Assets/model/shiro/shiro_crown.png', e);
      _shiroCrownImageLoading = false;
    };
    img.src = 'Assets/model/shiro/shiro_crown.png?v=1';
    _shiroCrownImage = img;
  }
  return _shiroCrownImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getShiroHairImage();
  _getShiroCrownImage();
}

/**
 * Draws Shiro's voluminous pastel lavender/white anime hair.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 * @param {object} [motion={}]
 */
export function _drawShiroHair(ctx, r, facingLeft = false, motion = {}) {
  const hairImg = _getShiroHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const custom = (typeof state !== 'undefined' && (state.skinCustomizations?.shiro || state.skinCustomizations?.shiro_hair)) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = (custom.offsetX ?? 0) + (motion.shiftX || 0);
    const offY = (custom.offsetY ?? 0) + (motion.shiftY || 0);
    const rot = (custom.angleOffset ?? 0) + (motion.tilt || 0);
    const flipX = custom.flipX ? -1 : 1;
    const flipY = custom.flipY ? -1 : 1;
    const stretchX = motion.stretchX || 1.0;
    const stretchY = motion.stretchY || 1.0;

    // shiro-hair.png (360x280)
    const targetHairWidth = r * 3.30 * wMult * stretchX;
    const targetHairHeight = r * 2.50 * hMult * stretchY;
    const scaleX = targetHairWidth / 360;
    const scaleY = targetHairHeight / 280;
    const drawW = 360 * scaleX;
    const drawH = 280 * scaleY;
    const drawX = -180 * scaleX + offX;
    const drawY = -r * 1.40 + offY;

    ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
    if (rot !== 0) ctx.rotate(rot);
    if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
    ctx.drawImage(hairImg, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();
  }
}

/**
 * Draws Shiro's royal golden crown of Elkia from Assets/model/shiro/shiro_crown.png.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 * @param {object} [motion={}]
 */
export function _drawShiroCrown(ctx, r, facingLeft = false, motion = {}) {
  const crownImg = _getShiroCrownImage();
  if (crownImg && crownImg.complete && crownImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const custom = (typeof state !== 'undefined' && (state.skinCustomizations?.shiro_crown || state.skinCustomizations?.shiro?.crown)) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = (custom.offsetX ?? 0) + (motion.shiftX || 0);
    const offY = (custom.offsetY ?? 0) + (motion.shiftY || 0);
    const rot = (custom.angleOffset ?? 0) + (motion.tilt || 0);
    const flipX = custom.flipX ? -1 : 1;
    const flipY = custom.flipY ? -1 : 1;

    // shiro_crown.png (1536x1024). True visible crown bounding box:
    // X: [0, 1535] (width 1536, horizontal center at 767.5)
    // Y: [15, 1023] (height 1009, top peak at 15)
    const targetCrownWidth = r * 1.65 * wMult;
    const targetCrownHeight = (r * 1.65 * (1009 / 1536)) * hMult;
    const scaleX = targetCrownWidth / 1536;
    const scaleY = targetCrownHeight / 1009;
    const drawW = 1536 * scaleX;
    const drawH = 1024 * scaleY;
    const drawX = -767.5 * scaleX + offX;
    const drawY = -r * 1.15 - 15 * scaleY + offY;

    ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
    if (rot !== 0) ctx.rotate(rot);
    if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
    ctx.drawImage(crownImg, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// Offscreen Canvas Cache (Toji Baseline Standard — Rule 24)
// ─────────────────────────────────────────────
let _cachedShiroCanvas = null;
let _cachedShiroR = 0;

function _renderShiroPixelBodyToCanvas(destCtx, r) {
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  // 1. Color Palette Tokens (Authentic Royal Violet Sailor Uniform Reference)
  const INK = '#0E0F14';               // 4-neighbor boundary outline
  const SKIN_BASE = '#FFF5EB';         // Clean porcelain fair skin dome
  const SKIN_SHADOW = '#FED7AA';       // Soft peach side contour

  // Royal Purple Sailor Dress (bodice, sleeves, pleats)
  const UNIFORM_PURPLE = '#6D28D9';    // Royal purple main fabric
  const UNIFORM_VIOLET = '#5B21B6';    // Deep violet shadows & side folds
  const UNIFORM_DEEP = '#4C1D95';      // Deep fold shadow
  const UNIFORM_HIGHLIGHT = '#8B5CF6'; // Vibrant lavender glint folds

  // Sailor Collar (Crisp white with royal purple trim stripes)
  const COLLAR_WHITE = '#FFFFFF';      // Crisp white sailor collar
  const COLLAR_SHADOW = '#E2E8F0';     // Soft collar fabric shadow
  const COLLAR_STRIPE = '#7C3AED';     // Purple trim stripe on collar flaps

  // Vibrant Golden Yellow Neckerchief / Scarf Tie
  const RIBBON_GOLD = '#FACC15';       // Bright golden yellow scarf knot & tails
  const RIBBON_LIGHT = '#FEF08A';      // Glint highlight on scarf knot/ridges
  const RIBBON_SHADOW = '#CA8A04';     // Rich warm golden amber shadow
  const RIBBON_DEEP = '#A16207';       // Knot center crease

  // Skirt Hem Trim
  const SKIRT_WHITE_TRIM = '#FFFFFF';  // Crisp white satin ribbon hem band

  const intR = Math.ceil(r);
  const steps = Math.ceil((intR + P) / P);

  // Helper inside circle test
  const isInside = (rx, ry) => Math.hypot(rx, ry) <= r;

  // Boundary 4-neighbor shell test
  const isBoundary = (gx, gy) => {
    const rx = gx * P;
    const ry = gy * P;
    if (!isInside(rx, ry)) return false;
    return (
      Math.hypot((gx + 1) * P, gy * P) > r ||
      Math.hypot((gx - 1) * P, gy * P) > r ||
      Math.hypot(gx * P, (gy + 1) * P) > r ||
      Math.hypot(gx * P, (gy - 1) * P) > r
    );
  };

  for (let gy = -steps; gy <= steps; gy++) {
    const ry = gy * P;
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      if (!isInside(rx, ry)) continue;

      const px = snap(rx);
      const py = snap(ry);

      // Outer Manga Ink Outline (Rule 24)
      if (isBoundary(gx, gy)) {
        destCtx.fillStyle = INK;
        destCtx.fillRect(px - P / 2, py - P / 2, P, P);
        continue;
      }

      // Zone 1: Pure Porcelain Face & Cheeks Dome (ry < r * 0.28)
      if (ry < r * 0.28) {
        const isCheekShadow = Math.abs(rx) > r * 0.65 || (ry > r * 0.15 && Math.abs(rx) > r * 0.50);
        destCtx.fillStyle = isCheekShadow ? SKIN_SHADOW : SKIN_BASE;
        destCtx.fillRect(px - P / 2, py - P / 2, P, P);
        continue;
      }

      // Zone 2: Royal Purple Sailor Fuku Top with White Collar & Golden Yellow Scarf (r * 0.28 <= ry < r * 0.64)
      if (ry >= r * 0.28 && ry < r * 0.64) {
        // Sleeves on flanks (oversized loose sailor sleeves)
        const isSleeve = Math.abs(rx) > r * 0.68;
        if (isSleeve) {
          // Purple fabric with shadow on far flank
          destCtx.fillStyle = Math.abs(rx) > r * 0.82 ? UNIFORM_DEEP : UNIFORM_VIOLET;
          destCtx.fillRect(px - P / 2, py - P / 2, P, P);

          // White sailor cuff trim with purple stripe at sleeve edges
          if (ry > r * 0.58) {
            destCtx.fillStyle = COLLAR_STRIPE;
            destCtx.fillRect(px - P / 2, py - P / 2, P, P);
          } else if (ry > r * 0.54) {
            destCtx.fillStyle = COLLAR_WHITE;
            destCtx.fillRect(px - P / 2, py - P / 2, P, P);
          }
          continue;
        }

        // Center Golden Yellow Scarf / Neckerchief knot & tails
        const isCenterRibbon = Math.abs(rx) < r * 0.24 && ry >= r * 0.30 && ry < r * 0.60;
        if (isCenterRibbon) {
          if (ry < r * 0.40) {
            // Knot
            const isKnotGlint = ry < r * 0.35 && Math.abs(rx) < r * 0.08;
            const isKnotCrease = ry >= r * 0.37 && Math.abs(rx) < P * 0.6;
            destCtx.fillStyle = isKnotGlint ? RIBBON_LIGHT : (isKnotCrease ? RIBBON_DEEP : (Math.abs(rx) > r * 0.12 ? RIBBON_SHADOW : RIBBON_GOLD));
          } else {
            // Flowing scarf tails
            const isTailSplit = Math.abs(rx) < P * 0.6 && ry > r * 0.44;
            const isTailGlint = (Math.abs(rx) > r * 0.06 && Math.abs(rx) < r * 0.14);
            const isTailEdge = Math.abs(rx) > r * 0.18;
            destCtx.fillStyle = isTailSplit ? RIBBON_DEEP : (isTailGlint ? RIBBON_LIGHT : (isTailEdge ? RIBBON_SHADOW : RIBBON_GOLD));
          }
          destCtx.fillRect(px - P / 2, py - P / 2, P, P);
          continue;
        }

        // Wide White Sailor Collar flaps over chest
        const isCollarFlap = ry < r * 0.46 && Math.abs(rx) > r * 0.18;
        if (isCollarFlap) {
          // Purple trim stripe on edge of sailor collar
          const isCollarStripe = Math.abs(rx) > r * 0.52 || (ry > r * 0.40 && Math.abs(rx) > r * 0.26);
          destCtx.fillStyle = isCollarStripe ? COLLAR_STRIPE : (ry < r * 0.32 ? COLLAR_SHADOW : COLLAR_WHITE);
          destCtx.fillRect(px - P / 2, py - P / 2, P, P);
          continue;
        }

        // Royal Purple Uniform Torso Fabric
        const isFold = (snap(rx) % (P * 4) === 0 && ry > r * 0.46);
        destCtx.fillStyle = isFold ? UNIFORM_HIGHLIGHT : (Math.abs(rx) > r * 0.48 ? UNIFORM_DEEP : UNIFORM_PURPLE);
        destCtx.fillRect(px - P / 2, py - P / 2, P, P);
        continue;
      }

      // Zone 3: Royal Purple Flowing Pleated Skirt with White Satin Hem Band (ry >= r * 0.64)
      if (ry >= r * 0.64) {
        // Deep purple hem bottom fold
        if (ry >= r * 0.94) {
          destCtx.fillStyle = UNIFORM_DEEP;
          destCtx.fillRect(px - P / 2, py - P / 2, P, P);
          continue;
        }

        // White satin ribbon hem trim band along lower skirt hem (ry >= r * 0.86)
        if (ry >= r * 0.86) {
          const isWhiteStripeCrease = Math.abs(snap(rx)) % (P * 4) === 0;
          destCtx.fillStyle = isWhiteStripeCrease ? COLLAR_SHADOW : SKIRT_WHITE_TRIM;
          destCtx.fillRect(px - P / 2, py - P / 2, P, P);
          continue;
        }

        // Waistband line
        if (ry < r * 0.68) {
          destCtx.fillStyle = UNIFORM_DEEP;
          destCtx.fillRect(px - P / 2, py - P / 2, P, P);
          continue;
        }

        // Pleated skirt vertical ridges with rich royal purple folds
        const isCrease = Math.abs(snap(rx)) % (P * 3) === 0;
        const isHighlight = Math.abs(snap(rx)) % (P * 3) === P;
        destCtx.fillStyle = isCrease ? UNIFORM_DEEP : (isHighlight ? UNIFORM_HIGHLIGHT : UNIFORM_PURPLE);
        destCtx.fillRect(px - P / 2, py - P / 2, P, P);
        continue;
      }
    }
  }
}

/**
 * Main Shiro Fighter Skin Renderer.
 * Adheres strictly to Upright Front POV (Rule 19) and Symmetrical Hands (Rule 20).
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} fighter
 */
export function drawShiroSkin(ctx, fighter) {
  if (!fighter) return;

  const r = fighter.r || 25;
  const P = 2.0;
  const steps = Math.ceil((Math.ceil(r) + P) / P);
  const size = (steps * 2 + 1) * P;

  // 1. Maintain Offscreen Canvas Cache
  if (!_cachedShiroCanvas || _cachedShiroR !== r) {
    if (typeof document !== 'undefined') {
      _cachedShiroCanvas = document.createElement('canvas');
      _cachedShiroCanvas.width = size;
      _cachedShiroCanvas.height = size;
      const offCtx = _cachedShiroCanvas.getContext('2d');
      offCtx.imageSmoothingEnabled = false;
      offCtx.translate(size / 2, size / 2);
      _renderShiroPixelBodyToCanvas(offCtx, r);
      _cachedShiroR = r;
    }
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // Front POV angle rotation (Rule 19)
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  // Vertical scale flip when facing left so hair stays on -Y (Rule 19)
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // Calculate dynamic hair & crown motion inertia (inertial drag, tilt & idle floating sway)
  let hairMotion = {};
  let crownMotion = {};
  const isStaticPreview = fighter._isWinnerReveal || (typeof state !== 'undefined' && state.showSkinOnly);

  if (!isStaticPreview) {
    const vx = fighter.vx || 0;
    const vy = fighter.vy || 0;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    let localVx = vx * cosA + vy * sinA;
    let localVy = -vx * sinA + vy * cosA;
    if (facingLeft) localVy = -localVy;

    // Movement inertia drag & tilt
    const dragX = Math.max(-r * 0.35, Math.min(r * 0.35, -localVx * 0.65));
    const dragY = Math.max(-r * 0.25, Math.min(r * 0.25, -localVy * 0.45));
    const velTilt = Math.max(-0.18, Math.min(0.18, -localVx * 0.025 - localVy * 0.020));

    // Dynamic aerodynamic stretch during dashes / fast movement
    const speed = Math.hypot(localVx, localVy);
    const stretchX = 1.0 + Math.min(0.10, speed * 0.010);
    const stretchY = 1.0 - Math.min(0.06, speed * 0.006);

    // Natural anime idle floating sway & breathing flutter
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const idleSway = Math.sin(now * 0.0032) * (r * 0.05);
    const idleBob = Math.cos(now * 0.0024) * (r * 0.035);
    const idleTilt = Math.sin(now * 0.0028) * 0.03;

    hairMotion = {
      shiftX: dragX + idleSway,
      shiftY: dragY + idleBob,
      tilt: velTilt + idleTilt,
      stretchX: stretchX,
      stretchY: stretchY
    };

    crownMotion = {
      shiftX: dragX * 0.50 + idleSway * 0.60,
      shiftY: dragY * 0.40 + idleBob * 0.70,
      tilt: velTilt * 0.60 + idleTilt * 0.50,
      stretchX: 1.0,
      stretchY: 1.0
    };
  }

  // 2. Blit Cached Pixel Body (Layer 1)
  if (_cachedShiroCanvas) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(_cachedShiroCanvas, -size / 2, -size / 2);
  }

  // 3. Render Dedicated Hair & Crown Model with Dynamic Motion (Layer 2 - Rule 22)
  _drawShiroHair(ctx, r, facingLeft, hairMotion);
  _drawShiroCrown(ctx, r, facingLeft, crownMotion);

  // 4. Symmetrical Lower-Flank Hands (Layer 3 - Rule 20)
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  if (!shouldHideHands) {
    const handR = getHandSize(r * 0.30);
    const handLeftX = -r * 0.82;
    const handRightX = r * 0.82;
    const handY = r * 0.38;

    // Left Hand: Holds Royal Gold Chess King Piece (#FCD34D)
    drawPixelHand(ctx, handLeftX, handY, handR, '#FFF5EB', '#0E0F14');
    ctx.save();
    ctx.fillStyle = '#FCD34D';
    ctx.beginPath();
    ctx.arc(handLeftX - 2, handY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right Hand: Tactician Piece-Flicking Stance with Cyan Sparkle (#38BDF8)
    drawPixelHand(ctx, handRightX, handY, handR, '#FFF5EB', '#0E0F14');
    ctx.save();
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(handRightX + 3, handY - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}
