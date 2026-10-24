// ─────────────────────────────────────────────
// ZEUS FIGHTER SKIN & BODY MODEL (Authentic Pixel Art Edition)
// King of Olympus — God of Thunder & Lightning (Greek Mythology)
//
// Adheres strictly to:
// - Rule 11 (Prohibition of shadowBlur CPU Filters)
// - Rule 18 (HUD Skill Bar Theme Consistency)
// - Rule 19 (Upright Front POV Camera Orientation, Zero Eyes/Mouth/Nose)
// - Rule 19.1 (Proportional Vertical Bands, Faceless God Skin, Golden Diadem & Royal Toga)
// - Rule 20 (Fighter Hand Visibility & Skin Only Guard)
// ─────────────────────────────────────────────

import { getHandSize, CONFIG } from '../../core/config.js';
import { zeusConfig } from '../../configs/characters/zeusConfig.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

const P = 2.0; // 2.0px authentic retro pixel grid

let _zeusHairImage = null;
let _zeusHairImageLoading = false;
let _zeusCrownImage = null;
let _zeusCrownImageLoading = false;

export function _getZeusHairImage() {
  if (_zeusHairImage && _zeusHairImage.complete && _zeusHairImage.naturalWidth > 0) {
    return _zeusHairImage;
  }
  if (!_zeusHairImageLoading && typeof Image !== 'undefined') {
    _zeusHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _zeusHairImage = img;
      _zeusHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Zeus hair image at Assets/model/zeus/Zeus-hair.png', e);
      _zeusHairImageLoading = false;
    };
    img.src = 'Assets/model/zeus/Zeus-hair.png?v=1';
    _zeusHairImage = img;
  }
  return _zeusHairImage;
}

export function _getZeusCrownImage() {
  if (_zeusCrownImage && _zeusCrownImage.complete && _zeusCrownImage.naturalWidth > 0) {
    return _zeusCrownImage;
  }
  if (!_zeusCrownImageLoading && typeof Image !== 'undefined') {
    _zeusCrownImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _zeusCrownImage = img;
      _zeusCrownImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Zeus crown image at Assets/model/zeus/Zeus-crown.png', e);
      _zeusCrownImageLoading = false;
    };
    img.src = 'Assets/model/zeus/Zeus-crown.png?v=1';
    _zeusCrownImage = img;
  }
  return _zeusCrownImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getZeusHairImage();
  _getZeusCrownImage();
}

/**
 * Draws Zeus's authentic flowing silver anime hair from Assets/model/zeus/Zeus-hair.png.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [isStormActive=false]
 * @param {boolean} [facingLeft=false]
 */
export function _drawZeusHair(ctx, r, isStormActive = false, facingLeft = false) {
  const hairImg = _getZeusHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp retro pixel art fidelity (Rule 22)

    const custom = (typeof state !== 'undefined' && (state.skinCustomizations?.zeus || state.skinCustomizations?.zeus_hair)) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;
    const flipX = custom.flipX ? -1 : 1;
    const flipY = custom.flipY ? -1 : 1;

    // Zeus-hair.png (1254x1254). True visible hair bounding box:
    // X: [41, 1235] (width 1195, horizontal center at 638)
    // Y: [31, 1253] (height 1223, top crown at 31)
    const targetHairWidth = r * 3.10 * wMult;
    const targetHairHeight = r * 2.85 * hMult;
    const scaleX = targetHairWidth / 1195;
    const scaleY = targetHairHeight / 1223;
    const drawW = 1254 * scaleX;
    const drawH = 1254 * scaleY;
    const drawX = -638 * scaleX + offX;
    const drawY = -r * 1.30 - 31 * scaleY + offY;

    if (rot !== 0 || flipX !== 1 || flipY !== 1) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      if (rot !== 0) ctx.rotate(rot);
      if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
      ctx.drawImage(hairImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(hairImg, drawX, drawY, drawW, drawH);
    }

    ctx.restore();
  }
}

/**
 * Draws Zeus's golden Olympian crown / headband from Assets/model/zeus/Zeus-crown.png.
 * Positioned cleanly as a headband wrapping across the brow and hair.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [isStormActive=false]
 * @param {boolean} [facingLeft=false]
 */
export function _drawZeusCrown(ctx, r, isStormActive = false, facingLeft = false) {
  const crownImg = _getZeusCrownImage();
  if (crownImg && crownImg.complete && crownImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp retro pixel art fidelity (Rule 22)

    const custom = (typeof state !== 'undefined' && (state.skinCustomizations?.zeus_crown || state.skinCustomizations?.zeus?.crown)) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;
    const flipX = custom.flipX ? -1 : 1;
    const flipY = custom.flipY ? -1 : 1;

    // Zeus-crown.png (1627x967). True visible crown bounding box (black background removed):
    // X: [230, 1398] (width 1169, horizontal center at 814.0)
    // Y: [108, 869] (height 762, top crown peak at 108)
    // Scales to sit naturally across the brow framing hair and face with central peak at -1.05r
    const targetCrownWidth = r * 1.85 * wMult;
    const targetCrownHeight = (r * 1.85 * (762 / 1169)) * hMult;
    const scaleX = targetCrownWidth / 1169;
    const scaleY = targetCrownHeight / 762;
    const drawW = 1627 * scaleX;
    const drawH = 967 * scaleY;
    const drawX = -814.0 * scaleX + offX;
    const drawY = -r * 1.05 - 108 * scaleY + offY;

    if (rot !== 0 || flipX !== 1 || flipY !== 1) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      if (rot !== 0) ctx.rotate(rot);
      if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
      ctx.drawImage(crownImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(crownImg, drawX, drawY, drawW, drawH);
    }

    ctx.restore();
  }
}

/**
 * Draws a retro pixel art hand with golden wrist vambrace for Zeus (Rule 20).
 */
export function drawZeusHand(ctx, cx, cy, radius = 5.6, skinColor = '#F3BF9F', isStorm = false, angle = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  if (angle !== 0) {
    ctx.rotate(angle);
  }

  // 1. Golden Olympian Armored Vambrace / Gauntlet (Discrete Stepped Pixel Rectangles)
  const cuffW = Math.round(radius * 1.6);
  const cuffH = Math.round(radius * 0.9);
  const bx = Math.round(-cuffW * 0.5);
  const by = Math.round(-radius * 0.35 - cuffH);

  // Vambrace base gold / electric cyan
  ctx.fillStyle = isStorm ? '#0284C7' : '#CA8A04';
  ctx.fillRect(bx, by, cuffW, cuffH);
  // Highlight facet band
  ctx.fillStyle = isStorm ? '#38BDF8' : '#FACC15';
  ctx.fillRect(bx + 1, by + 1, cuffW - 2, Math.max(1, cuffH - 2));
  // Vambrace ink outline
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(bx - 0.5, by - 0.5, cuffW + 1, cuffH + 1);

  // 2. Canonical Round Pixel Hand (Rule 20)
  const actualSkin = skinColor || (isStorm ? '#BAE6FD' : '#F3BF9F');
  drawPixelHand(ctx, 0, 0, radius, actualSkin, '#0E0F14');

  ctx.restore();
}

export function _drawZeusVambrace(ctx, cx, cy, radius = 6.4, isStorm = false) {
  drawZeusHand(ctx, cx, cy, radius, isStorm ? '#BAE6FD' : '#F3BF9F', isStorm);
}

let _cachedZeusCanvas = null;
let _cachedZeusR = 0;
let _cachedZeusStorm = false;

/**
 * Solid 2D Pixel-Art Body for Zeus (Offscreen Cache Pattern, Rule 24 Toji Standard)
 */
export function drawZeusBody(ctx, r = 25, isStormActive = false) {
  const intR = Math.round(r);
  if (!_cachedZeusCanvas || _cachedZeusR !== intR || _cachedZeusStorm !== isStormActive) {
    const P = 2.0;
    const steps = Math.ceil((intR + P) / P);
    const size = (steps * 2 + 1) * P;
    const offscreen = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
    if (offscreen) {
      offscreen.width = size;
      offscreen.height = size;
      const offCtx = offscreen.getContext('2d');
      offCtx.imageSmoothingEnabled = false;
      offCtx.translate(size / 2, size / 2);
      _renderZeusPixelBodyToCanvas(offCtx, intR, isStormActive);
      _cachedZeusCanvas = offscreen;
      _cachedZeusR = intR;
      _cachedZeusStorm = isStormActive;
    }
  }

  if (_cachedZeusCanvas) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const size = _cachedZeusCanvas.width;
    ctx.drawImage(_cachedZeusCanvas, -size / 2, -size / 2);
    ctx.restore();
  } else {
    _renderZeusPixelBodyToCanvas(ctx, intR, isStormActive);
  }
}

/**
 * Procedural discrete grid rasterization of Zeus's body matching Rule 24 (Toji standard):
 * - Stepped dark manga ink outline (#0E0F14) with 4-neighbor boundary test
 * - Zone 1: Pure Face Dome (tan athletic Olympian god skin tone, forehead highlight, side contour, faceless)
 * - Zone 2: Upper Torso (golden gorget collar + draped white royal toga on left + bare muscular chest on right)
 * - Zone 3: Golden Armored Belt & Diamond Buckle
 * - Zone 4: Pleated White Himation / Skirt
 */
function _renderZeusPixelBodyToCanvas(destCtx, r, isStorm = false) {
  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
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

      // 4-neighbor attached boundary test for solid dark manga ink outline (Rule 24)
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
      // ZONE 1: Face Dome & Cheeks (ry < r * 0.28)
      // ──────────────────────────────────────────
      if (ry < r * 0.28) {
        let col = isStorm ? '#BAE6FD' : '#F3BF9F'; // Sun-kissed Olympian god skin base
        if (ry < -r * 0.40) {
          col = isStorm ? '#FFFFFF' : '#FFF0E4'; // Upper forehead highlight
        } else if (Math.abs(rx) > r * 0.70) {
          col = isStorm ? '#38BDF8' : '#D4A373'; // Cheek & jaw contour
        }
        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: Upper Torso / Royal Toga & Gorget (r * 0.28 <= ry < r * 0.64)
      // ──────────────────────────────────────────
      else if (ry < r * 0.64) {
        // Upper Gorget Collar rim (ry < r * 0.36 && |rx| <= r * 0.45)
        if (ry < r * 0.36 && Math.abs(rx) <= r * 0.45) {
          if (Math.abs(rx) <= P * 0.8) {
            destCtx.fillStyle = isStorm ? '#FFFFFF' : '#FEF08A'; // Center glint
          } else if (Math.abs(rx) <= r * 0.28) {
            destCtx.fillStyle = isStorm ? '#38BDF8' : '#FACC15'; // Olympian gold
          } else {
            destCtx.fillStyle = isStorm ? '#0284C7' : '#CA8A04'; // Gorget dark edge
          }
        }
        // Left Side: Draped Royal White Toga (rx <= r * 0.12)
        else if (rx <= r * 0.12) {
          if (Math.abs(rx - r * 0.08) <= P * 0.6) {
            destCtx.fillStyle = isStorm ? '#0284C7' : '#94A3B8'; // Center draped fold crease
          } else if (Math.abs(rx + r * 0.36) <= P * 0.8 || ry > r * 0.56) {
            destCtx.fillStyle = isStorm ? '#BAE6FD' : '#CBD5E1'; // Toga fold shadow
          } else {
            destCtx.fillStyle = isStorm ? '#FFFFFF' : '#F8FAFC'; // Crisp white toga fabric
          }
        }
        // Right Side: Bare Muscular Olympian God Chest (rx > r * 0.12)
        else {
          if (ry >= r * 0.52 && ry <= r * 0.58 && rx >= r * 0.20 && rx <= r * 0.68) {
            destCtx.fillStyle = isStorm ? '#0284C7' : '#B87E60'; // Pectoral shadow line
          } else if (ry >= r * 0.38 && ry < r * 0.50 && rx >= r * 0.25 && rx <= r * 0.65) {
            destCtx.fillStyle = isStorm ? '#E0F2FE' : '#F8CDB1'; // Pectoral muscle highlight
          } else {
            destCtx.fillStyle = isStorm ? '#7DD3FC' : '#E8AC8B'; // Muscular tanned chest
          }
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: Golden Armored Belt & Diamond Buckle (r * 0.64 <= ry < r * 0.78)
      // ──────────────────────────────────────────
      else if (ry < r * 0.78) {
        // Center Diamond Buckle (|rx| <= r * 0.16)
        if (Math.abs(rx) <= r * 0.16) {
          if (Math.abs(rx) <= P * 0.6) {
            destCtx.fillStyle = isStorm ? '#FFFFFF' : '#FEF08A'; // Center diamond shine
          } else {
            destCtx.fillStyle = isStorm ? '#38BDF8' : '#FACC15'; // Buckle plate
          }
        } else {
          if (ry < r * 0.68) {
            destCtx.fillStyle = isStorm ? '#7DD3FC' : '#FEF08A'; // Belt upper rim glint
          } else if (ry > r * 0.73) {
            destCtx.fillStyle = isStorm ? '#0369A1' : '#CA8A04'; // Belt lower shadow
          } else {
            destCtx.fillStyle = isStorm ? '#0284C7' : '#FACC15'; // Belt gold band
          }
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 4: Lower Pleated Himation Skirt (ry >= r * 0.78)
      // ──────────────────────────────────────────
      else {
        if (Math.abs(rx) <= P * 0.6) {
          destCtx.fillStyle = isStorm ? '#0284C7' : '#94A3B8'; // Center inseam crease
        } else if (Math.abs(Math.abs(rx) - r * 0.38) <= P * 0.6 || Math.abs(Math.abs(rx) - r * 0.70) <= P * 0.6) {
          destCtx.fillStyle = isStorm ? '#38BDF8' : '#CBD5E1'; // Pleat fold shadows
        } else {
          destCtx.fillStyle = isStorm ? '#BAE6FD' : '#FFFFFF'; // White pleated himation
        }
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  destCtx.restore();
}

export const drawZeusPixelBody = drawZeusBody;

/**
 * Draws Zeus's Celestial Thunderstorm & Electric God Aura (Rule 11 compliant - Zero shadowBlur)
 */
function _drawZeusElectricAura(ctx, r, fighter, now) {
  const isStorm = Boolean(fighter.isChargingStorm || fighter.stormActive);
  const pulse = Math.sin(now * 0.009) * 2.5;
  const auraR = r * (isStorm ? 1.60 : 1.25) + pulse;

  ctx.save();

  // 1. Outer Electric Corona Glow (Concentric Flat Circles)
  ctx.fillStyle = isStorm ? 'rgba(56, 189, 248, 0.28)' : 'rgba(0, 220, 255, 0.14)';
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Middle Radiant Electric Ring
  ctx.strokeStyle = isStorm ? 'rgba(224, 242, 254, 0.85)' : 'rgba(56, 189, 248, 0.50)';
  ctx.lineWidth = isStorm ? 2.0 : 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, auraR - 2.5, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Crackling Micro-Lightning Sparks along the perimeter (Discrete stepped line segments & pixel motes)
  const numSparks = isStorm ? 6 : 3;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < numSparks; i++) {
    const angle = (now * 0.004 * (i % 2 === 0 ? 1 : -1)) + (i * Math.PI * 2 / numSparks);
    const sparkDist = r + 4 + (Math.sin(now * 0.02 + i) * 6);
    const sx = Math.round(Math.cos(angle) * sparkDist / 2) * 2;
    const sy = Math.round(Math.sin(angle) * sparkDist / 2) * 2;
    const jx = Math.round(((Math.sin(now * 0.05 + i * 3) - 0.5) * 8) / 2) * 2;
    const jy = Math.round(((Math.cos(now * 0.05 + i * 3) - 0.5) * 8) / 2) * 2;

    ctx.beginPath();
    ctx.moveTo(sx - jx, sy - jy);
    ctx.lineTo(sx, sy);
    ctx.lineTo(sx + jx, sy + jy);
    ctx.stroke();

    // Discrete 2x2 spark motes
    ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#00E5FF';
    ctx.fillRect(sx - 1, sy - 1, 2, 2);
  }

  ctx.restore();
}

/**
 * Main Skin Renderer for Zeus (King of Olympus - Authentic Faceless Pixel Art Edition)
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} fighter - Fighter instance
 */
export function drawZeusSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const isStorm = Boolean(fighter.isChargingStorm || fighter.stormActive);
  const now = Date.now();

  const isSuppressed = !isPodiumPreview && Boolean(
    fighter.isTargetOfAmbush ||
    (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
  );

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = (isPodiumPreview || isStorm) ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft && !fighter.isSpinning) {
    ctx.scale(1, -1);
  }

  // 2. Divine Electric God Aura (Rule 11 compliant)
  if (!isSuppressed) {
    _drawZeusElectricAura(ctx, r, fighter, now);
  }

  // LAYER 1: MAIN BODY (Clean God Face + Royal Toga & Pleats)
  drawZeusPixelBody(ctx, r, isStorm);

  // LAYER 2: AUTHENTIC ANIME HAIR ASSET (Assets/model/zeus/Zeus-hair.png)
  _drawZeusHair(ctx, r, isStorm, facingLeft);

  // LAYER 3: GOLDEN OLYMPIAN CROWN HEADBAND (Assets/model/zeus/Zeus-crown.png)
  _drawZeusCrown(ctx, r, isStorm, facingLeft);

  // LAYER 4: CANONICAL DEFAULT HANDS (Rule 20)
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  if (!shouldHideHands) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zeus) ? CONFIG.zeus : zeusConfig;
    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.zeus) || {};
    const handScale = custom.handScale ?? (fighter && (fighter.handScale ?? fighter._def?.handScale)) ?? cfg?.handScale ?? 0.75;
    const handRadius = getHandSize(r * 0.30 * handScale);
    const skinTone = isStorm ? '#BAE6FD' : '#F3BF9F';

    // Left Hand (Off-hand): Always at (-r * 0.82, +r * 0.38)
    drawPixelHand(ctx, -r * 0.82, r * 0.38, handRadius, skinTone, '#0E0F14');

    // Right Hand (Main-hand):
    // Displayed when weapon is hidden, in podium preview, or during storm channel (weapon launched to sky)
    const isWieldingWeapon = !fighter.hideWeapon && !fighter.isChargingStorm && !isPodiumPreview;
    if (!isWieldingWeapon) {
      drawPixelHand(ctx, r * 0.82, r * 0.38, handRadius, skinTone, '#0E0F14');
    }
  }

  // Status Overlays (Stun, Freeze, Paralyze, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}

