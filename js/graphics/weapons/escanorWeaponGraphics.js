// ─────────────────────────────────────────────
// Escanor Sacred Treasure Weapon Graphics: Divine Axe Rhitta (神斧 リッタ)
// The Seven Deadly Sins: Lion's Sin of Pride
// Adheres strictly to:
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - 2D Pixel Art Aesthetics & Stack Balance
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

const P = 2.0; // 2.0px authentic retro pixel grid
const snap = (v) => Math.round(v / P) * P;

/**
 * Draws Escanor's Sacred Treasure: Divine Axe Rhitta (Pixel Art Edition)
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x Offset X
 * @param {number} y Offset Y
 * @param {number} angle Facing/Wielding angle
 * @param {number} r Fighter body radius
 * @param {Object} opts Extra options (isPreview, isSwinging, heatLevel, now)
 */
let _escanorWeaponImage = null;
let _escanorWeaponStrokedCanvas = null;
let _escanorWeaponImageLoading = false;

function _generateStrokedWeaponCanvas(img) {
  if (typeof document === 'undefined') return img;
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return img;

    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    if (!offCtx || typeof offCtx.drawImage !== 'function' || typeof offCtx.getImageData !== 'function' || typeof offCtx.putImageData !== 'function') return img;

    offCtx.drawImage(img, 0, 0);
    const imgData = offCtx.getImageData(0, 0, w, h);
    const src = imgData.data;
    const dst = new Uint8ClampedArray(src.length);
    for (let i = 0; i < src.length; i++) dst[i] = src[i];

    const strokeRadius = 3;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (src[idx + 3] > 30) continue;

        let hasNeighbor = false;
        for (let dy = -strokeRadius; dy <= strokeRadius; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -strokeRadius; dx <= strokeRadius; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            if (dx * dx + dy * dy <= strokeRadius * strokeRadius) {
              const nIdx = (ny * w + nx) * 4;
              if (src[nIdx + 3] > 80) {
                hasNeighbor = true;
                break;
              }
            }
          }
          if (hasNeighbor) break;
        }

        if (hasNeighbor) {
          dst[idx + 0] = 15;
          dst[idx + 1] = 15;
          dst[idx + 2] = 20;
          dst[idx + 3] = 255;
        }
      }
    }

    for (let i = 0; i < src.length; i++) imgData.data[i] = dst[i];
    offCtx.putImageData(imgData, 0, 0);
    return offCanvas;
  } catch (err) {
    console.warn('Failed to generate stroked weapon canvas', err);
    return img;
  }
}

export function _getEscanorWeaponImage() {
  if (_escanorWeaponStrokedCanvas) {
    return _escanorWeaponStrokedCanvas;
  }
  if (_escanorWeaponImage && _escanorWeaponImage.complete && _escanorWeaponImage.naturalWidth > 0) {
    _escanorWeaponStrokedCanvas = _generateStrokedWeaponCanvas(_escanorWeaponImage);
    return _escanorWeaponStrokedCanvas;
  }
  if (!_escanorWeaponImageLoading && typeof Image !== 'undefined') {
    _escanorWeaponImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _escanorWeaponImage = img;
      _escanorWeaponStrokedCanvas = _generateStrokedWeaponCanvas(img);
      _escanorWeaponImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Escanor weapon image at Assets/model/Escanor-Weapon.png', e);
      _escanorWeaponImageLoading = false;
    };
    img.src = 'Assets/model/Escanor-Weapon.png?v=1';
    _escanorWeaponImage = img;
  }
  return _escanorWeaponImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getEscanorWeaponImage();
}

let _escanorSlashEffectImage = null;
let _escanorSlashEffectGoldenCanvas = null;
let _escanorSlashEffectTheOneCanvas = null;
let _escanorSlashEffectImageLoading = false;

// Geometry constants for Assets/model/Attack-Effects/Attack-Effect-1.png (612 x 408)
const EFFECT_CENTER_X = 238.4; // Center of curvature of the crescent arc
const EFFECT_CENTER_Y = 200.1;
const EFFECT_ARC_BASE_R = 155.6; // Natural outer arc radius in raw image coordinates
const EFFECT_ROT_OFFSET = -0.635; // Aligns crescent center with Escanor downward chop centerline

function _generateCleanSlashEffectCanvas(img, isTheOne = false) {
  if (typeof document === 'undefined') return img;
  if (!isTheOne) {
    return img; // Preserves 100% of user's uploaded pixel colors and alpha channels directly
  }
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return img;

    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    if (!offCtx || typeof offCtx.drawImage !== 'function' || typeof offCtx.getImageData !== 'function' || typeof offCtx.putImageData !== 'function') return img;

    offCtx.drawImage(img, 0, 0);
    const imgData = offCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Remap pixels to High Noon "The One" Solar Radiance (Blinding white core, golden corona)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const a = data[idx + 3];
        if (a < 10) {
          data[idx + 3] = 0;
          continue;
        }

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const maxC = Math.max(r, g, b) / 255;
        const minC = Math.min(r, g, b) / 255;
        const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
        const v = maxC;

        if (v >= 0.85 && sat < 0.35) {
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
        } else if (v >= 0.60) {
          const t = (v - 0.60) / 0.40;
          data[idx] = 255;
          data[idx + 1] = Math.round(240 + 15 * t);
          data[idx + 2] = Math.round(138 + 117 * t);
        } else if (v >= 0.30) {
          const t = (v - 0.30) / 0.30;
          data[idx] = Math.round(245 + 9 * t);
          data[idx + 1] = Math.round(158 + 82 * t);
          data[idx + 2] = Math.round(11 + 127 * t);
        } else {
          const t = v / 0.30;
          data[idx] = Math.round(146 + 99 * t);
          data[idx + 1] = Math.round(64 + 94 * t);
          data[idx + 2] = Math.round(14 - 3 * t);
        }
      }
    }

    offCtx.putImageData(imgData, 0, 0);
    return offCanvas;
  } catch (err) {
    console.warn('Failed to generate The One slash effect canvas', err);
    return img;
  }
}

export function _getEscanorSlashEffectImage(isTheOne = false) {
  if (isTheOne && _escanorSlashEffectTheOneCanvas) {
    return _escanorSlashEffectTheOneCanvas;
  }
  if (!isTheOne && _escanorSlashEffectGoldenCanvas) {
    return _escanorSlashEffectGoldenCanvas;
  }
  if (_escanorSlashEffectImage && _escanorSlashEffectImage.complete && _escanorSlashEffectImage.naturalWidth > 0) {
    _escanorSlashEffectGoldenCanvas = _generateCleanSlashEffectCanvas(_escanorSlashEffectImage, false);
    _escanorSlashEffectTheOneCanvas = _generateCleanSlashEffectCanvas(_escanorSlashEffectImage, true);
    return isTheOne ? _escanorSlashEffectTheOneCanvas : _escanorSlashEffectGoldenCanvas;
  }
  if (!_escanorSlashEffectImageLoading && typeof Image !== 'undefined') {
    _escanorSlashEffectImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _escanorSlashEffectImage = img;
      _escanorSlashEffectGoldenCanvas = _generateCleanSlashEffectCanvas(img, false);
      _escanorSlashEffectTheOneCanvas = _generateCleanSlashEffectCanvas(img, true);
      _escanorSlashEffectImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Escanor attack effect at Assets/model/Attack-Effects/Attack-Effect-1.png', e);
      _escanorSlashEffectImageLoading = false;
    };
    img.src = 'Assets/model/Attack-Effects/Attack-Effect-1.png?v=3';
    _escanorSlashEffectImage = img;
  }
  return _escanorSlashEffectImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getEscanorSlashEffectImage();
}

// Geometry constants for Assets/model/Escanor-Weapon.png (1774 x 887)
const WEAPON_BLUE_GRIP_X = 1525.5;
const WEAPON_BLUE_GRIP_Y = 742.3;
const WEAPON_WIELD_GRIP_X = 1150.0; // Shaft grip balance point
const WEAPON_WIELD_GRIP_Y = 575.0;
const WEAPON_HUB_X = 422.7;
const WEAPON_HUB_Y = 251.0;
const WEAPON_MID_X = (WEAPON_BLUE_GRIP_X + WEAPON_HUB_X) / 2.0; // 974.1
const WEAPON_MID_Y = (WEAPON_BLUE_GRIP_Y + WEAPON_HUB_Y) / 2.0; // 496.6
const WEAPON_SHAFT_LEN = 1207.3;
// Natural angle pointing from Grip to Hub in raw image: -155.99° = -2.722496 rad
const WEAPON_ROT_ALIGN = 2.722496;

/**
 * Draws Escanor's Sacred Treasure: Divine Axe Rhitta (神斧 リッタ)
 * Supports High-Definition Pixel-Art Model from Assets/model/Escanor-Weapon.png with procedural fallback.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x Offset X
 * @param {number} y Offset Y
 * @param {number} angle Facing/Wielding angle
 * @param {number} r Fighter body radius
 * @param {Object} opts Extra options (isPreview, isSwinging, heatLevel, now)
 */
export function drawDivineAxeRhitta(ctx, x, y, angle, r = 28, opts = {}) {
  const isPreview = Boolean(opts.isPreview);
  const now = opts.now || Date.now();
  const heatLevel = opts.heatLevel !== undefined ? opts.heatLevel : 1.0;
  const isTheOne = Boolean(opts.isTheOne);
  const weaponImg = _getEscanorWeaponImage();

  const custom = (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.escanor)
    ? state.weaponCustomizations.escanor
    : { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };
  const customScale = custom.scale !== undefined ? custom.scale : 1.0;
  const customOffsetX = custom.offsetX !== undefined ? custom.offsetX : 0;
  const customOffsetY = custom.offsetY !== undefined ? custom.offsetY : 0;
  const customAngle = custom.angleOffset !== undefined ? custom.angleOffset : 0;

  ctx.save();
  ctx.translate(x + customOffsetX, y + customOffsetY);
  ctx.rotate(angle + customAngle);
  ctx.imageSmoothingEnabled = false;

  if (weaponImg && (weaponImg.complete || weaponImg.width) && (weaponImg.naturalWidth > 0 || weaponImg.width > 0)) {
    const drawW = weaponImg.naturalWidth || weaponImg.width;
    const drawH = weaponImg.naturalHeight || weaponImg.height;

    if (isPreview) {
      // Centered diagonal showcase for Weapon Menu Card & Selection Screen
      const previewScale = ((r * 3.4) / WEAPON_SHAFT_LEN) * customScale;
      ctx.rotate(-0.50 - WEAPON_ROT_ALIGN);
      ctx.scale(previewScale, -previewScale);
      ctx.drawImage(
        weaponImg,
        -WEAPON_MID_X,
        -WEAPON_MID_Y,
        drawW,
        drawH
      );
    } else {
      // Wielded in Hand: Align Blue Hilt Grip Center at (0, 0)
      const baseScale = ((r * 4.25) / WEAPON_SHAFT_LEN) * customScale;
      const prideScaleMult = 1.0 + (opts.prideStacks || 0) * 0.04;
      const wieldScale = baseScale * (isTheOne ? 1.35 : prideScaleMult);
      ctx.rotate(-WEAPON_ROT_ALIGN);
      ctx.scale(wieldScale, -wieldScale);
      ctx.drawImage(
        weaponImg,
        -WEAPON_BLUE_GRIP_X,
        -WEAPON_BLUE_GRIP_Y,
        drawW,
        drawH
      );
    }

    ctx.restore();
    return;
  }

  // Procedural Fallback
  _drawDivineAxeRhittaProcedural(ctx, r, isPreview, isTheOne, heatLevel, now, opts.prideStacks || 0, customScale);
  ctx.restore();
}

/**
 * Procedural Pixel-Art Axe Fallback
 */
function _drawDivineAxeRhittaProcedural(ctx, r, isPreview, isTheOne, heatLevel, now, prideStacks = 0, customScale = 1.0) {
  const rScale = isPreview ? 1.0 : Math.max(1.0, r / 28);
  const sizeMult = (isTheOne ? 1.35 : (1.0 + prideStacks * 0.04)) * rScale * customScale;
  const startX = isPreview ? snap(-14) : snap(r * 0.60);
  const shaftLength = snap(46 * sizeMult);
  const shaftWidth = snap(4 * sizeMult);

  // 2. Heavy Golden Grip & Haft (Handle)
  ctx.fillStyle = '#1C1917';
  ctx.fillRect(startX - 10, -shaftWidth / 2, shaftLength + 4, shaftWidth);

  // Golden Inlay Grip Wraps
  ctx.fillStyle = '#D97706';
  for (let gx = startX - 8; gx < startX + shaftLength - 12; gx += 6) {
    ctx.fillRect(gx, -shaftWidth / 2, 2, shaftWidth);
  }

  // Golden Lion Head / Spiked Pommel (Rear Cap)
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(startX - 14, -5, 4, 10);
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(startX - 16, -3, 2, 6);
  ctx.fillStyle = '#B45309';
  ctx.fillRect(startX - 12, -2, 2, 4);

  // 3. Central Axe Head Junction & Crossguard Filigree
  const headX = startX + shaftLength - 8;
  ctx.fillStyle = '#B45309'; // Deep bronze-gold foundation
  ctx.fillRect(headX - 6, -10, 14, 20);
  ctx.fillStyle = '#F59E0B'; // Bright Sacred Gold
  ctx.fillRect(headX - 4, -8, 10, 16);

  // Central Ruby Solar Core
  const corePulse = (Math.sin(now * 0.01) + 1) / 2;
  ctx.fillStyle = isTheOne ? '#FEF08A' : (corePulse > 0.5 ? '#EF4444' : '#DC2626');
  ctx.fillRect(headX - 1, -3, 4, 6);
  ctx.fillStyle = '#FEE2E2';
  ctx.fillRect(headX, -2, 2, 2);

  // 4. Rear Spiked Counterweight
  ctx.fillStyle = '#92400E';
  ctx.fillRect(headX + 2, 6, 6, 8);
  ctx.fillRect(headX + 4, 12, 4, 6);
  ctx.fillRect(headX + 5, 16, 2, 6);
  ctx.fillStyle = '#FBBF24';
  ctx.fillRect(headX + 3, 7, 2, 10);

  // 5. Giant Colossal Crescent Blade
  ctx.fillStyle = '#78350F';
  ctx.fillRect(headX - 16, -26, 28, 6);
  ctx.fillRect(headX - 22, -22, 38, 6);
  ctx.fillRect(headX - 26, -16, 44, 6);
  ctx.fillRect(headX - 28, -10, 48, 6);
  ctx.fillRect(headX - 26, -4, 44, 6);

  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(headX - 14, -24, 24, 4);
  ctx.fillRect(headX - 20, -20, 34, 4);
  ctx.fillRect(headX - 24, -14, 40, 4);
  ctx.fillRect(headX - 26, -8, 44, 4);
  ctx.fillRect(headX - 24, -2, 40, 4);

  ctx.fillStyle = '#FBBF24';
  ctx.fillRect(headX - 12, -22, 20, 2);
  ctx.fillRect(headX - 18, -18, 30, 2);
  ctx.fillRect(headX - 22, -12, 36, 2);
  ctx.fillRect(headX - 24, -6, 40, 2);

  ctx.fillStyle = isTheOne ? '#FFFFFF' : '#FEF08A';
  ctx.fillRect(headX - 20, -26, 6, 2);
  ctx.fillRect(headX - 26, -20, 6, 2);
  ctx.fillRect(headX - 30, -14, 6, 2);
  ctx.fillRect(headX - 32, -8, 6, 2);
  ctx.fillRect(headX - 30, -2, 6, 2);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(headX - 18, -28, 4, 3);
  ctx.fillRect(headX - 20, -30, 2, 3);
  ctx.fillRect(headX + 16, -26, 4, 3);
  ctx.fillRect(headX + 18, -28, 2, 3);
}

/**
 * Draws Escanor's Sacred Axe Rhitta Attack Effect
 * Renders Assets/model/Attack-Effects/Attack-Effect-1.png with radial clipping.
 * Compliant with Rule 2.6 (Eraser Wipe Standard) and Rule 11 (Zero shadowBlur).
 * Seamlessly handles Strike, Hit-Pause Impact Freeze, and Eraser Recovery phases without snappy pop-outs!
 */
export function drawRhittaSlashArc(ctx, x, y, angle, r = 25, animInput = 0, isTheOne = false, reach = 100) {
  let phase = 'strike';
  let strikeP = 0;
  let recP = 0;

  if (typeof animInput === 'object' && animInput !== null) {
    phase = animInput.phase || 'strike';
    strikeP = animInput.strikeP || 0;
    recP = animInput.recP || 0;
  } else {
    strikeP = Number(animInput) || 0;
    phase = strikeP >= 1.0 ? 'hitPause' : 'strike';
  }

  // Only render during the active downward strike, hit-pause impact freeze, or recovery eraser wipe
  if (phase !== 'strike' && phase !== 'hitPause' && phase !== 'recovery') return;
  if (phase === 'strike' && strikeP <= 0) return;
  if (phase === 'recovery' && recP >= 1.0) return;

  const startA = -2.45; // Overhead start angle (~-140° lifted high back to top-left)
  const endA = 1.18; // Ground cleave end angle (~68° follow-through)
  const outerR = r + reach;
  const innerR = r + Math.max(14, reach * 0.24);

  let currentStartA = startA;
  let currentEndA = endA;
  let alpha = 1.0;
  let pauseP = 0;

  const maxOpacity = isTheOne ? 1.0 : 0.65;

  if (phase === 'strike') {
    // Strike phase: Axe sweeps forward carving the arc from startA towards endA
    currentStartA = startA;
    currentEndA = startA + (endA - startA) * strikeP;
    alpha = Math.min(1.0, 0.45 + 0.55 * strikeP) * maxOpacity;
  } else if (phase === 'hitPause') {
    // Hit-Pause Impact: Arc holds firmly at the exact collision progress where the blade struck!
    const hitP = (animInput && typeof animInput.strikeP === 'number') ? animInput.strikeP : 1.0;
    currentStartA = startA;
    currentEndA = startA + (endA - startA) * hitP;
    alpha = Math.min(1.0, 0.55 + 0.45 * hitP) * maxOpacity;
    pauseP = animInput.pauseP || 0;
  } else if (phase === 'recovery') {
    // Recovery Phase: Smooth continuous dynamic eraser wipe starting from startA to endA
    const eraserP = Math.pow(Math.min(1.0, Math.max(0, recP)), 1.15);
    currentStartA = startA + (endA - startA) * eraserP;
    currentEndA = endA;
    alpha = Math.max(0, (1.0 - recP) * 0.95) * maxOpacity;
  }

  if (alpha <= 0.01 || currentStartA >= currentEndA - 0.02) {
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }
  ctx.globalAlpha = Math.max(0, Math.min(1.0, alpha));
  ctx.imageSmoothingEnabled = false;

  const effectImg = _getEscanorSlashEffectImage(isTheOne);
  if (effectImg && (effectImg.complete || effectImg.width) && (effectImg.naturalWidth > 0 || effectImg.width > 0)) {
    // Clip by the dynamic sweep angle [currentStartA, currentEndA]
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, outerR * 2.2, currentStartA, currentEndA, false);
    ctx.closePath();
    ctx.clip();

    const baseScale = (outerR * 1.08) / EFFECT_ARC_BASE_R;
    const finalScale = isTheOne ? baseScale * 1.25 : baseScale;

    ctx.rotate(EFFECT_ROT_OFFSET);
    ctx.scale(finalScale, finalScale);
    ctx.drawImage(
      effectImg,
      -EFFECT_CENTER_X,
      -EFFECT_CENTER_Y,
      effectImg.naturalWidth || effectImg.width || 612,
      effectImg.naturalHeight || effectImg.height || 408
    );

    ctx.restore();
  } else {
    _drawRhittaSlashArcProcedural(ctx, currentStartA, currentEndA, alpha, r, reach, isTheOne);
  }

  // 1. Solar Flare Particle Sprays on Swing Release (Leading Edge Embers & Ground Impact Sparks)
  _drawRhittaSolarFlareParticles(ctx, outerR, innerR, currentEndA, phase, strikeP, pauseP, isTheOne, alpha);

  ctx.restore();
}

/**
 * Renders high-noon solar flare ember particles spraying from the leading cutting edge of Rhitta's slash
 */
function _drawRhittaSolarFlareParticles(ctx, outerR, innerR, currentEndA, phase, strikeP, pauseP, isTheOne, alpha) {
  if (alpha <= 0.05) return;

  const tipX = Math.cos(currentEndA) * outerR;
  const tipY = Math.sin(currentEndA) * outerR;
  const tangentA = currentEndA - Math.PI * 0.5;

  if (phase === 'strike') {
    // Leading edge solar sparks spraying backwards from the cutting arc
    const sparkCount = isTheOne ? 9 : 6;
    for (let i = 0; i < sparkCount; i++) {
      const frac = i / Math.max(1, sparkCount - 1);
      const rDist = innerR + (outerR - innerR) * (0.35 + 0.65 * frac);
      const trailDist = (3 + (i % 3) * 4) * (0.6 + 0.4 * strikeP);
      const perpOffset = ((i % 2 === 0 ? 1 : -1) * (2 + (i % 3) * 2));

      const px = Math.cos(currentEndA) * rDist + Math.cos(tangentA) * trailDist - Math.sin(tangentA) * perpOffset;
      const py = Math.sin(currentEndA) * rDist + Math.sin(tangentA) * trailDist + Math.cos(tangentA) * perpOffset;

      const pSize = (i % 3 === 0) ? 3.0 : 2.0;
      if (i % 4 === 0) {
        ctx.fillStyle = '#FFFFFF'; // White-hot core ember
      } else if (i % 3 === 0) {
        ctx.fillStyle = isTheOne ? '#FFFFFF' : '#FEF08A';
      } else if (i % 2 === 0) {
        ctx.fillStyle = isTheOne ? '#FEF08A' : '#FBBF24';
      } else {
        ctx.fillStyle = '#F59E0B';
      }

      ctx.fillRect(snap(px), snap(py), pSize, pSize);
    }
  } else if (phase === 'hitPause') {
    // Explosive ground cleave solar spark burst
    const burstCount = isTheOne ? 10 : 7;
    const burstIntensity = Math.sin(Math.max(0, 1.0 - (pauseP || 0)) * Math.PI * 0.5);

    for (let i = 0; i < burstCount; i++) {
      const burstAngle = currentEndA - Math.PI * 0.5 + (i / Math.max(1, burstCount - 1)) * Math.PI;
      const burstDist = (10 + (i % 4) * 6) * burstIntensity;
      const bx = tipX + Math.cos(burstAngle) * burstDist;
      const by = tipY + Math.sin(burstAngle) * burstDist;

      const bSize = (i % 2 === 0) ? 3.0 : 2.0;
      ctx.fillStyle = (i % 3 === 0) ? '#FFFFFF' : (isTheOne ? '#FEF08A' : '#FBBF24');
      ctx.fillRect(snap(bx), snap(by), bSize, bSize);
    }
  }
}

/**
 * Draws Escanor's Sacred Axe Rhitta Solar Impact Flash
 * Emits an explosive 4-point solar cross glint and stepped solar halos at the axe blade hub.
 * Compliant with Rule 11 (Zero shadowBlur) and Canvas Stack Integrity (Rule 2.4).
 */
export function drawRhittaSolarFlash(ctx, x, y, isTheOne = false, intensity = 1.0) {
  if (intensity <= 0.01) return;
  const alpha = Math.min(1.0, Math.max(0, intensity));

  ctx.save();
  ctx.translate(x, y);

  // 1. Concentric Stepped Solar Halos (Rule 11 compliant: Zero shadowBlur)
  ctx.beginPath();
  ctx.arc(0, 0, 30 * alpha, 0, Math.PI * 2);
  ctx.fillStyle = isTheOne
    ? `rgba(254, 240, 138, ${alpha * 0.35})`
    : `rgba(245, 158, 11, ${alpha * 0.30})`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, 18 * alpha, 0, Math.PI * 2);
  ctx.fillStyle = isTheOne
    ? `rgba(255, 255, 255, ${alpha * 0.55})`
    : `rgba(251, 191, 36, ${alpha * 0.48})`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, 8 * alpha, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
  ctx.fill();

  // 2. 4-Point Solar Cross Glint Needles
  const armLen = (isTheOne ? 38 : 28) * alpha;
  const armThick = (isTheOne ? 3.2 : 2.2) * alpha;

  ctx.fillStyle = isTheOne ? '#FFFFFF' : '#FEF08A';
  // Horizontal Needle
  ctx.beginPath();
  ctx.moveTo(-armLen, 0);
  ctx.lineTo(0, -armThick);
  ctx.lineTo(armLen, 0);
  ctx.lineTo(0, armThick);
  ctx.closePath();
  ctx.fill();

  // Vertical Needle
  ctx.beginPath();
  ctx.moveTo(0, -armLen);
  ctx.lineTo(-armThick, 0);
  ctx.lineTo(0, armLen);
  ctx.lineTo(armThick, 0);
  ctx.closePath();
  ctx.fill();

  // Diagonal Diamond Accent
  const diagLen = armLen * 0.52;
  const diagThick = armThick * 0.7;
  ctx.fillStyle = isTheOne ? '#FEF08A' : '#F59E0B';
  ctx.beginPath();
  ctx.moveTo(-diagLen, -diagLen);
  ctx.lineTo(0, -diagThick);
  ctx.lineTo(diagLen, diagLen);
  ctx.lineTo(0, diagThick);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-diagLen, diagLen);
  ctx.lineTo(-diagThick, 0);
  ctx.lineTo(diagLen, -diagLen);
  ctx.lineTo(diagThick, 0);
  ctx.closePath();
  ctx.fill();

  // 3. Central White Core Pinpoint
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-2, -2, 4, 4);

  ctx.restore();
}

/**
 * Procedural Blazing Golden Axe Slash Arc Fallback
 */
function _drawRhittaSlashArcProcedural(ctx, currentStartA, currentEndA, alpha, r, reach, isTheOne) {
  const outerR = r + reach;
  const innerR = r + Math.max(14, reach * 0.24);

  // 1. Semi-Transparent Ghost Solar Sector Fan (Soft translucent golden-amber veil)
  ctx.beginPath();
  ctx.arc(0, 0, outerR, currentStartA, currentEndA, false);
  ctx.arc(0, 0, innerR, currentEndA, currentStartA, true);
  ctx.closePath();
  ctx.fillStyle = isTheOne
    ? `rgba(254, 240, 138, ${alpha * 0.22})`
    : `rgba(245, 158, 11, ${alpha * 0.17})`;
  ctx.fill();

  // 2. Soft Inner Energy Arc Fill (Slightly warmer gradient step near the inner boundary)
  ctx.beginPath();
  ctx.arc(0, 0, innerR + (outerR - innerR) * 0.35, currentStartA, currentEndA, false);
  ctx.arc(0, 0, innerR, currentEndA, currentStartA, true);
  ctx.closePath();
  ctx.fillStyle = isTheOne
    ? `rgba(254, 240, 138, ${alpha * 0.12})`
    : `rgba(217, 119, 6, ${alpha * 0.10})`;
  ctx.fill();

  // 3. Inner Accent Arc Rim (Warm gold contour visible near inner radius)
  ctx.beginPath();
  ctx.arc(0, 0, innerR, currentStartA, currentEndA, false);
  ctx.strokeStyle = isTheOne
    ? `rgba(254, 240, 138, ${alpha * 0.45})`
    : `rgba(245, 158, 11, ${alpha * 0.38})`;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 4. Outer Perimeter Ghost Cutting Contour
  ctx.beginPath();
  ctx.arc(0, 0, outerR, currentStartA, currentEndA, false);
  ctx.strokeStyle = isTheOne
    ? `rgba(255, 255, 255, ${alpha * 0.45})`
    : `rgba(254, 240, 138, ${alpha * 0.35})`;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 5. Radial Edge Cap Lines (Start & End Angle Borders)
  ctx.beginPath();
  ctx.moveTo(Math.cos(currentStartA) * innerR, Math.sin(currentStartA) * innerR);
  ctx.lineTo(Math.cos(currentStartA) * outerR, Math.sin(currentStartA) * outerR);
  ctx.moveTo(Math.cos(currentEndA) * innerR, Math.sin(currentEndA) * innerR);
  ctx.lineTo(Math.cos(currentEndA) * outerR, Math.sin(currentEndA) * outerR);
  ctx.strokeStyle = isTheOne
    ? `rgba(254, 240, 138, ${alpha * 0.30})`
    : `rgba(245, 158, 11, ${alpha * 0.25})`;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/**
 * Draws the Divine Sword Escanor (聖剣エスカノール) High Noon Vertical Solar Cleavage Blade
 * Colossal golden vertical sun beam that cleaves downward through the arena and fades smoothly.
 */
export function drawDivineSwordEscanorBlade(ctx, x, y, angle, r = 28, reach = 160, lifeRatio = 1.0) {
  if (lifeRatio <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const alpha = Math.max(0, Math.min(1.0, lifeRatio));
  const easeW = Math.sin(lifeRatio * Math.PI * 0.5); // Starts wide, tapers as it dissipates
  const totalLength = r + reach;
  const halfWidth = 32 * easeW;

  // 1. Outer Solar Flare Aura Beam
  ctx.fillStyle = `rgba(245, 158, 11, ${alpha * 0.30})`;
  ctx.beginPath();
  ctx.moveTo(0, -halfWidth * 1.5);
  ctx.lineTo(totalLength, -halfWidth * 0.4);
  ctx.lineTo(totalLength + 20, 0);
  ctx.lineTo(totalLength, halfWidth * 0.4);
  ctx.lineTo(0, halfWidth * 1.5);
  ctx.closePath();
  ctx.fill();

  // 2. High Noon Golden Solar Blade Body
  ctx.fillStyle = `rgba(254, 240, 138, ${alpha * 0.85})`;
  ctx.beginPath();
  ctx.moveTo(0, -halfWidth);
  ctx.lineTo(totalLength - 10, -halfWidth * 0.25);
  ctx.lineTo(totalLength + 10, 0);
  ctx.lineTo(totalLength - 10, halfWidth * 0.25);
  ctx.lineTo(0, halfWidth);
  ctx.closePath();
  ctx.fill();

  // 3. Blinding White Core Razor Line
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.98})`;
  ctx.lineWidth = 6.0 * easeW;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(totalLength + 15, 0);
  ctx.stroke();

  // 4. Perpendicular Solar Flare Shockwave Wings
  ctx.strokeStyle = `rgba(253, 224, 71, ${alpha * 0.60})`;
  ctx.lineWidth = 2.5;
  for (let d = totalLength * 0.25; d <= totalLength * 0.9; d += totalLength * 0.25) {
    const wingLen = 18 * easeW * (1.0 - d / totalLength);
    ctx.beginPath();
    ctx.moveTo(d, -wingLen);
    ctx.lineTo(d, wingLen);
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Escanor Cruel Sun Pixel Art Sprite Sheet Asset Loader ───
let _escanorCruelSunSpriteImage = null;
let _escanorCruelSunStandardCanvas = null;
let _escanorCruelSunTheOneCanvas = null;
let _escanorCruelSunSpriteLoading = false;

/**
 * 6-Frame Discrete Grid Pixel Art Cruel Sun Sprite Coordinates
 * Sourced from Assets/model/Sprites/Escanor-Cruel Sun-Pixel Art Sprite Sheet.png (1536 x 1024)
 * 3 columns x 2 rows, each cell 512x512 with transparent background.
 * Anchored precisely on the core solar sphere center across all 6 frames.
 */
export const ESCANOR_CRUEL_SUN_FRAMES = [
  // Frame 0: Initial solar ignition & rising crown flame (BBox: 420x420, Center: 250, 280, Anchor: 169, 169)
  { sx: 81, sy: 111, sw: 420, sh: 420, cx: 250, cy: 280, anchorX: 169, anchorY: 169 },
  // Frame 1: Expanding curved solar prominences (BBox: 501x424, Center: 765, 280, Anchor: 250, 173)
  { sx: 515, sy: 107, sw: 501, sh: 424, cx: 765, cy: 280, anchorX: 250, anchorY: 173 },
  // Frame 2: Rotating clockwise solar flares (BBox: 501x451, Center: 1276, 280, Anchor: 250, 200)
  { sx: 1026, sy: 80, sw: 501, sh: 451, cx: 1276, cy: 280, anchorX: 250, anchorY: 200 },
  // Frame 3: Swirling spiral prominence loop (BBox: 457x493, Center: 250, 780, Anchor: 206, 250)
  { sx: 44, sy: 530, sw: 457, sh: 493, cx: 250, cy: 780, anchorX: 206, anchorY: 250 },
  // Frame 4: Roaring plasma vortex (BBox: 501x493, Center: 765, 780, Anchor: 250, 250)
  { sx: 515, sy: 530, sw: 501, sh: 493, cx: 765, cy: 780, anchorX: 250, anchorY: 250 },
  // Frame 5: Peak thermonuclear vortex (BBox: 501x493, Center: 1276, 780, Anchor: 250, 250)
  { sx: 1026, sy: 530, sw: 501, sh: 493, cx: 1276, cy: 780, anchorX: 250, anchorY: 250 }
];

const BASE_CRUEL_SUN_RADIUS = 158.0;

function _generateTheOneCruelSunCanvas(img) {
  if (typeof document === 'undefined') return img;
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return img;

    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    if (!offCtx || typeof offCtx.drawImage !== 'function' || typeof offCtx.getImageData !== 'function' || typeof offCtx.putImageData !== 'function') return img;

    offCtx.drawImage(img, 0, 0);
    const imgData = offCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Remap pixels to High Noon "The One" Solar Radiance (Blinding white core, golden corona)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const a = data[idx + 3];
        if (a < 10) {
          data[idx + 3] = 0;
          continue;
        }

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const maxC = Math.max(r, g, b) / 255;
        const minC = Math.min(r, g, b) / 255;
        const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
        const v = maxC;

        if (v >= 0.88 && sat < 0.40) {
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
        } else if (v >= 0.65) {
          const t = (v - 0.65) / 0.35;
          data[idx] = 255;
          data[idx + 1] = Math.round(240 + 15 * t);
          data[idx + 2] = Math.round(138 + 117 * t);
        } else if (v >= 0.35) {
          const t = (v - 0.35) / 0.30;
          data[idx] = Math.round(245 + 10 * t);
          data[idx + 1] = Math.round(158 + 82 * t);
          data[idx + 2] = Math.round(11 + 127 * t);
        } else {
          const t = v / 0.35;
          data[idx] = Math.round(124 + 121 * t);
          data[idx + 1] = Math.round(45 + 113 * t);
          data[idx + 2] = Math.round(18 - 7 * t);
        }
      }
    }

    offCtx.putImageData(imgData, 0, 0);
    return offCanvas;
  } catch (err) {
    console.warn('Failed to generate The One Cruel Sun canvas', err);
    return img;
  }
}

export function _getEscanorCruelSunSpriteImage(isTheOne = false) {
  if (isTheOne && _escanorCruelSunTheOneCanvas) {
    return _escanorCruelSunTheOneCanvas;
  }
  if (!isTheOne && _escanorCruelSunStandardCanvas) {
    return _escanorCruelSunStandardCanvas;
  }
  if (_escanorCruelSunSpriteImage && _escanorCruelSunSpriteImage.complete && _escanorCruelSunSpriteImage.naturalWidth > 0) {
    _escanorCruelSunStandardCanvas = _escanorCruelSunSpriteImage;
    _escanorCruelSunTheOneCanvas = _generateTheOneCruelSunCanvas(_escanorCruelSunSpriteImage);
    return isTheOne ? _escanorCruelSunTheOneCanvas : _escanorCruelSunStandardCanvas;
  }
  if (!_escanorCruelSunSpriteLoading && typeof Image !== 'undefined') {
    _escanorCruelSunSpriteLoading = true;
    const img = new Image();
    img.onload = () => {
      _escanorCruelSunSpriteImage = img;
      _escanorCruelSunStandardCanvas = img;
      _escanorCruelSunTheOneCanvas = _generateTheOneCruelSunCanvas(img);
      _escanorCruelSunSpriteLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Escanor Cruel Sun sprite sheet at Assets/model/Sprites/Escanor-Cruel Sun-Pixel Art Sprite Sheet.png', e);
      _escanorCruelSunSpriteLoading = false;
    };
    img.src = encodeURI('Assets/model/Sprites/Escanor-Cruel Sun-Pixel Art Sprite Sheet.png?v=1');
    _escanorCruelSunSpriteImage = img;
  }
  return _escanorCruelSunSpriteImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getEscanorCruelSunSpriteImage();
}

// ─── Escanor Sun Explosion Pixel Art Sprite Sheet Asset Loader ───
let _escanorSunExplosionSpriteImage = null;
let _escanorSunExplosionStandardCanvas = null;
let _escanorSunExplosionTheOneCanvas = null;
let _escanorSunExplosionSpriteLoading = false;

/**
 * 6-Frame Discrete Grid Pixel Art Sun Explosion / Expiration Sprite Coordinates
 * Sourced from Assets/model/Sprites/Escanor-Sun-Explosion-Sprite-Sheet.png (1536 x 1024)
 * 3 columns x 2 rows, each cell 512x512 with transparent background.
 * Frame 0: Intact solar sphere with inner fissure fractures
 * Frame 1: Expanding solar cracks, molten fragments detaching
 * Frame 2: Core nuclear eruption & explosive fracture rays
 * Frame 3: Radial needle shockwave & dispersing lava chunks
 * Frame 4: Expanding solar ash cloud & dissipating ember fragments
 * Frame 5: Fading stellar embers vanishing into the void
 */
export const ESCANOR_SUN_EXPLOSION_FRAMES = [
  { sx: 0, sy: 0, sw: 512, sh: 512, cx: 256, cy: 288, anchorX: 256, anchorY: 288 },
  { sx: 512, sy: 0, sw: 512, sh: 512, cx: 240, cy: 288, anchorX: 240, anchorY: 288 },
  { sx: 1024, sy: 0, sw: 512, sh: 512, cx: 232, cy: 280, anchorX: 232, anchorY: 280 },
  { sx: 0, sy: 512, sw: 512, sh: 512, cx: 256, cy: 240, anchorX: 256, anchorY: 240 },
  { sx: 512, sy: 512, sw: 512, sh: 512, cx: 240, cy: 230, anchorX: 240, anchorY: 230 },
  { sx: 1024, sy: 512, sw: 512, sh: 512, cx: 230, cy: 250, anchorX: 230, anchorY: 250 }
];

const BASE_EXPLOSION_RADIUS = 158.0;

function _generateTheOneExplosionCanvas(img) {
  if (typeof document === 'undefined') return img;
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return img;

    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    if (!offCtx || typeof offCtx.drawImage !== 'function' || typeof offCtx.getImageData !== 'function' || typeof offCtx.putImageData !== 'function') return img;

    offCtx.drawImage(img, 0, 0);
    const imgData = offCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Remap pixels to High Noon "The One" Solar Radiance
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const a = data[idx + 3];
        if (a < 10) {
          data[idx + 3] = 0;
          continue;
        }

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const maxC = Math.max(r, g, b) / 255;
        const minC = Math.min(r, g, b) / 255;
        const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
        const v = maxC;

        if (v >= 0.85 && sat < 0.45) {
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
        } else if (v >= 0.60) {
          const t = (v - 0.60) / 0.40;
          data[idx] = 255;
          data[idx + 1] = Math.round(235 + 20 * t);
          data[idx + 2] = Math.round(130 + 125 * t);
        } else if (v >= 0.30) {
          const t = (v - 0.30) / 0.30;
          data[idx] = Math.round(245 + 10 * t);
          data[idx + 1] = Math.round(158 + 77 * t);
          data[idx + 2] = Math.round(11 + 119 * t);
        } else {
          const t = v / 0.30;
          data[idx] = Math.round(124 + 121 * t);
          data[idx + 1] = Math.round(45 + 113 * t);
          data[idx + 2] = Math.round(18 - 7 * t);
        }
      }
    }

    offCtx.putImageData(imgData, 0, 0);
    return offCanvas;
  } catch (err) {
    console.warn('Failed to generate The One Sun Explosion canvas', err);
    return img;
  }
}

export function _getEscanorSunExplosionSpriteImage(isTheOne = false) {
  if (isTheOne && _escanorSunExplosionTheOneCanvas) {
    return _escanorSunExplosionTheOneCanvas;
  }
  if (!isTheOne && _escanorSunExplosionStandardCanvas) {
    return _escanorSunExplosionStandardCanvas;
  }
  if (_escanorSunExplosionSpriteImage && _escanorSunExplosionSpriteImage.complete && _escanorSunExplosionSpriteImage.naturalWidth > 0) {
    _escanorSunExplosionStandardCanvas = _escanorSunExplosionSpriteImage;
    _escanorSunExplosionTheOneCanvas = _generateTheOneExplosionCanvas(_escanorSunExplosionSpriteImage);
    return isTheOne ? _escanorSunExplosionTheOneCanvas : _escanorSunExplosionStandardCanvas;
  }
  if (!_escanorSunExplosionSpriteLoading && typeof Image !== 'undefined') {
    _escanorSunExplosionSpriteLoading = true;
    const img = new Image();
    img.onload = () => {
      _escanorSunExplosionSpriteImage = img;
      _escanorSunExplosionStandardCanvas = img;
      _escanorSunExplosionTheOneCanvas = _generateTheOneExplosionCanvas(img);
      _escanorSunExplosionSpriteLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Escanor Sun Explosion sprite sheet at Assets/model/Sprites/Escanor-Sun-Explosion-Sprite-Sheet.png', e);
      _escanorSunExplosionSpriteLoading = false;
    };
    img.src = encodeURI('Assets/model/Sprites/Escanor-Sun-Explosion-Sprite-Sheet.png?v=1');
    _escanorSunExplosionSpriteImage = img;
  }
  return _escanorSunExplosionSpriteImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getEscanorSunExplosionSpriteImage();
}

/**
 * Procedural Discrete Integer Grid Solar Sphere Fallback
 * Used when sprite sheet is loading or unavailable.
 */
export function drawProceduralPixelCruelSunSphere(ctx, cx, cy, radius, isTheOne = false, now = Date.now(), alpha = 1.0, showCorona = true) {
  if (radius <= 0 || alpha <= 0) return;
  const currentNow = (typeof now === 'number' && !Number.isNaN(now)) ? now : Date.now();
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const snapCx = snap(cx);
  const snapCy = snap(cy);
  const coreR = Math.max(P * 2, snap(radius));
  const steps = Math.ceil((coreR + P) / P);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = Math.max(0, Math.min(1.0, alpha));

  if (showCorona) {
    const haloFrame = Math.floor(currentNow / 120) % 3;
    const haloCells = [
      [-0.95, -0.18, 3], [-0.78, -0.62, 2], [-0.36, -1.02, 3], [0.18, -1.12, 2],
      [0.72, -0.72, 3], [1.06, -0.18, 2], [0.98, 0.42, 3], [0.52, 0.88, 2],
      [0.05, 1.10, 3], [-0.52, 0.92, 2], [-1.02, 0.52, 3], [-1.14, 0.05, 2]
    ];
    for (let i = 0; i < haloCells.length; i++) {
      const [hx, hy, length] = haloCells[(i + haloFrame) % haloCells.length];
      const cellSize = P * (1 + (i % 2));
      ctx.fillStyle = isTheOne ? 'rgba(255, 255, 255, 0.34)' : 'rgba(220, 38, 38, 0.42)';
      ctx.fillRect(
        snapCx + snap(hx * coreR) - cellSize / 2,
        snapCy + snap(hy * coreR) - cellSize / 2,
        cellSize * length,
        cellSize
      );
    }
  }

  const plasmaTick = Math.floor(currentNow / 80) % 4;

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const d = Math.hypot(rx, ry);
      if (d > coreR) continue;

      const px = snapCx + snap(rx);
      const py = snapCy + snap(ry);
      const normD = d / coreR;

      if (d >= coreR - P) {
        ctx.fillStyle = isTheOne ? '#7C2D12' : '#3B0A0A';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      const plasmaNoise = Math.sin(gx * 0.7 + gy * 0.7 + plasmaTick * 1.57);

      if (normD > 0.78) {
        if (plasmaNoise > 0.4) {
          ctx.fillStyle = isTheOne ? '#F59E0B' : '#B91C1C';
        } else if (plasmaNoise < -0.4) {
          ctx.fillStyle = isTheOne ? '#FBBF24' : '#EA580C';
        } else {
          ctx.fillStyle = isTheOne ? '#FEF08A' : '#F59E0B';
        }
      } else if (normD > 0.52) {
        if (plasmaNoise > 0.3) {
          ctx.fillStyle = isTheOne ? '#FEF08A' : '#FBBF24';
        } else {
          ctx.fillStyle = isTheOne ? '#FFFFFF' : '#FDE047';
        }
      } else if (normD > 0.28) {
        if (plasmaNoise > 0.2) {
          ctx.fillStyle = isTheOne ? '#FFFFFF' : '#FDE047';
        } else {
          ctx.fillStyle = isTheOne ? '#FFFFFF' : '#FEF08A';
        }
      } else {
        ctx.fillStyle = '#FFFFFF';
      }

      ctx.fillRect(px, py, P, P);
    }
  }

  if (showCorona && coreR >= P * 4) {
    ctx.save();
    ctx.translate(snapCx, snapCy);

    const tongueFrame = Math.floor(currentNow / 100) % 2;
    const tongues = [
      [0, -1, 0.42, 2], [0.82, -0.62, 0.30, 2], [1.02, 0.18, 0.25, 1],
      [0.54, 0.86, 0.34, 2], [-0.24, 1.04, 0.28, 1], [-0.86, 0.68, 0.38, 2],
      [-1.02, -0.32, 0.24, 1], [-0.54, -0.88, 0.30, 2]
    ];
    for (let i = 0; i < tongues.length; i++) {
      const [tx, ty, lengthRatio, width] = tongues[(i + tongueFrame) % tongues.length];
      const distance = snap(coreR * (1.0 + lengthRatio));
      const endX = snap(tx * distance);
      const endY = snap(ty * distance);
      const baseX = snap(tx * (coreR - P));
      const baseY = snap(ty * (coreR - P));
      const sideX = snap(-ty * P * width);
      const sideY = snap(tx * P * width);

      ctx.fillStyle = (i % 3 === 0) ? '#FFFFFF' : (isTheOne ? '#FEF08A' : '#F59E0B');
      ctx.beginPath();
      ctx.moveTo(baseX - sideX, baseY - sideY);
      ctx.lineTo(endX, endY);
      ctx.lineTo(baseX + sideX, baseY + sideY);
      ctx.closePath();
      ctx.fill();
    }

    const glintFrame = Math.floor(currentNow / 130) % 2;
    const glintLen = snap(coreR * (0.72 + glintFrame * 0.18));
    ctx.fillStyle = isTheOne ? '#FFFFFF' : '#FEF08A';
    for (let d = -glintLen; d <= glintLen; d += P) {
      const taper = 1 - Math.abs(d) / glintLen;
      const h = taper > 0.55 ? P * 2 : P;
      ctx.fillRect(snap(d), snap(-h / 2), P, h);
      ctx.fillRect(snap(-h / 2), snap(d), h, P);
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(snap(-P), snap(-P), P * 2, P * 2);

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws the Authentic 2D Discrete Grid Pixel Art Cruel Sun (無慈悲な太陽) Sphere
 * Renders the 6-frame pixel art sprite sheet animation with centered rotation flares,
 * multi-tier solar corona bloom, and white-hot optical core glints.
 * Adheres strictly to:
 * - Rule 3.5: Authentic 2D Discrete Grid Rasterization Engine (P = 2.0px)
 * - Rule 11 / Rule 2.2: Prohibition of shadowBlur CPU filters (Flat stepped pixel layers)
 * - Rule 2.4: Canvas 2D Transform Stack Integrity (balanced save/restore)
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} radius - Sphere core radius
 * @param {boolean} [isTheOne=false] - Whether "The One" transformation palette is active
 * @param {number} [now=Date.now()] - Current animation timestamp
 * @param {number} [alpha=1.0] - Opacity multiplier
 * @param {boolean} [showCorona=true] - Whether to render outer stepped solar prominence flares & diamond glints
 */
/**
 * Renders the ambient floor / ground solar illumination wash beneath Cruel Sun.
 * Casts a soft, radiant pool of warm golden and crimson solar lighting onto the arena floor.
 * Matches the multi-tiered floor lighting architecture used in Zenitsu's PNG Dash.
 * Rule 11 (Zero shadowBlur) & Rule 2.4 (Canvas stack balance) compliant.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} radius - Sun sphere radius
 * @param {boolean} [isTheOne=false] - Whether Escanor is in "The One" state
 * @param {number} [alpha=1.0] - Opacity
 * @param {boolean} [isExplosion=false] - Whether rendering during explosion / expiration
 * @param {number} [explosionProgress=0] - Normalized explosion progress (0.0 to 1.0)
 */
export function drawCruelSunFloorLighting(ctx, cx, cy, radius, isTheOne = false, alpha = 1.0, isExplosion = false, explosionProgress = 0) {
  if (!ctx || radius <= 0 || alpha <= 0.02) return;
  const isDark = Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' ||
      state.darkMode ||
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  let floorR;
  let intensity;

  if (isExplosion) {
    const expP = Math.max(0, Math.min(1.0, explosionProgress));
    // Explosion expands rapidly outward during peak burst (frames 1-3), then dims (clamped to prevent full-canvas gradient stall)
    floorR = Math.min(320, radius * (2.8 + expP * 3.2));
    intensity = (isDark ? 0.42 : 0.30) * Math.max(0, 1.0 - Math.pow(expP, 1.3)) * (isTheOne ? 1.4 : 1.0) * alpha;
  } else {
    // Continuous radiant thermal pulse (clamped to prevent GPU fill-rate drop on large sun scales)
    const pulse = Math.sin(Date.now() * 0.005) * 0.08;
    floorR = Math.min(280, radius * (isTheOne ? 3.6 : 3.0) * (1.0 + pulse));
    intensity = (isDark ? 0.32 : 0.22) * (isTheOne ? 1.35 : 1.0) * alpha;
  }

  if (floorR > 2 && intensity > 0.01) {
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, floorR);
    if (isTheOne) {
      glow.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1.0, intensity * 1.0)})`);
      glow.addColorStop(0.25, `rgba(254, 240, 138, ${intensity * 0.85})`);
      glow.addColorStop(0.55, `rgba(251, 191, 36, ${intensity * 0.45})`);
      glow.addColorStop(0.82, `rgba(217, 119, 6, ${intensity * 0.18})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
      glow.addColorStop(0, `rgba(255, 250, 220, ${Math.min(1.0, intensity * 1.0)})`);
      glow.addColorStop(0.28, `rgba(254, 240, 138, ${intensity * 0.75})`);
      glow.addColorStop(0.60, `rgba(245, 158, 11, ${intensity * 0.40})`);
      glow.addColorStop(0.85, `rgba(220, 38, 38, ${intensity * 0.16})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, floorR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Renders directional solar bloom & rim lighting on entities near Cruel Sun.
 * Casts a warm golden solar specular highlight on fighters/illusions facing the star.
 * Rule 11 (Zero shadowBlur) & Rule 2.4 (Canvas stack balance) compliant.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} sunX - Sun world X
 * @param {number} sunY - Sun world Y
 * @param {number} sunRadius - Sun sphere radius
 * @param {boolean} [isTheOne=false] - Whether Escanor is in "The One" state
 * @param {number} [alpha=1.0] - Opacity
 */
export function drawCruelSunProximityEntityLighting(ctx, sunX, sunY, sunRadius, isTheOne = false, alpha = 1.0) {
  if (!ctx || sunRadius <= 0 || alpha <= 0.05) return;
  const entities = [];
  if (typeof state !== 'undefined') {
    if (Array.isArray(state.fighters)) entities.push(...state.fighters);
    if (Array.isArray(state.illusions)) entities.push(...state.illusions);
  }
  if (entities.length === 0) return;

  const lightRadius = Math.min(320, sunRadius * 3.2);
  const lightRadiusSq = lightRadius * lightRadius;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!ent || ent.hp <= 0 || (ent.dead && !ent._isWinnerReveal)) continue;
    const dx = sunX - ent.x;
    const dy = sunY - (ent.y - (ent.z || 0));
    const distSq = dx * dx + dy * dy;
    if (distSq > lightRadiusSq || distSq <= 4) continue;

    const dist = Math.sqrt(distSq);
    const norm = 1.0 - (dist / lightRadius);
    const rimIntensity = Math.pow(norm, 1.3) * (isTheOne ? 0.45 : 0.32) * alpha;
    if (rimIntensity <= 0.02) continue;

    const entR = ent.r || 25;
    const angleToSun = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(ent.x, ent.y - (ent.z || 0));

    // Directional Solar Rim Arc
    ctx.strokeStyle = isTheOne
      ? `rgba(254, 240, 138, ${rimIntensity * 0.90})`
      : `rgba(245, 158, 11, ${rimIntensity * 0.80})`;
    ctx.lineWidth = Math.max(1.5, entR * 0.12);
    ctx.beginPath();
    ctx.arc(0, 0, entR * 1.05, angleToSun - Math.PI * 0.35, angleToSun + Math.PI * 0.35);
    ctx.stroke();

    // Secondary White-Hot Glint on leading edge
    ctx.strokeStyle = `rgba(255, 255, 255, ${rimIntensity * 0.70})`;
    ctx.lineWidth = Math.max(1.0, entR * 0.06);
    ctx.beginPath();
    ctx.arc(0, 0, entR * 1.05, angleToSun - Math.PI * 0.15, angleToSun + Math.PI * 0.15);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws the Authentic 2D Discrete Grid Pixel Art Cruel Sun (無慈悲な太陽) Sphere
 * Renders the 6-frame pixel art sprite sheet animation with centered rotation flares,
 * multi-tier solar corona bloom (multi-sample offset aura in lighter mode), and white-hot optical core glints.
 * Adheres strictly to:
 * - Rule 3.5: Authentic 2D Discrete Grid Rasterization Engine (P = 2.0px)
 * - Rule 11 / Rule 2.2: Prohibition of shadowBlur CPU filters (Flat stepped pixel layers)
 * - Rule 2.4: Canvas 2D Transform Stack Integrity (balanced save/restore)
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} radius - Sphere core radius
 * @param {boolean} [isTheOne=false] - Whether "The One" transformation palette is active
 * @param {number} [now=Date.now()] - Current animation timestamp
 * @param {number} [alpha=1.0] - Opacity multiplier
 * @param {boolean} [showCorona=true] - Whether to render outer stepped solar prominence flares & diamond glints
 */
export function drawPixelCruelSunSphere(ctx, cx, cy, radius, isTheOne = false, now = Date.now(), alpha = 1.0, showCorona = true) {
  if (radius <= 0 || alpha <= 0) return;
  const currentNow = (typeof now === 'number' && !Number.isNaN(now)) ? now : Date.now();
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const snapCx = snap(cx);
  const snapCy = snap(cy);
  const spriteImg = _getEscanorCruelSunSpriteImage(isTheOne);

  if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
    const frameIdx = Math.floor(currentNow / 80) % ESCANOR_CRUEL_SUN_FRAMES.length;
    const frame = ESCANOR_CRUEL_SUN_FRAMES[frameIdx] || ESCANOR_CRUEL_SUN_FRAMES[0];
    const scale = radius / BASE_CRUEL_SUN_RADIUS;
    const drawW = frame.sw * scale;
    const drawH = frame.sh * scale;
    const drawX = -frame.anchorX * scale;
    const drawY = -frame.anchorY * scale;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(snapCx, snapCy);
    ctx.globalAlpha = Math.max(0, Math.min(1.0, alpha));

    // ── TIER 1 (BACK LAYER): ADDITIVE SOLAR CORONA BLOOM (Aura glowing around the sides/perimeter) ──
    if (showCorona) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // Outer Solar Flare Bloom around perimeter (4 cardinal/diagonal samples @ radius * 0.16)
      const outerRadius = Math.max(3.0, radius * 0.16);
      const outerAlpha = (isTheOne ? 0.24 : 0.18) * alpha;
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        const ox = Math.cos(ang) * outerRadius;
        const oy = Math.sin(ang) * outerRadius;
        ctx.globalAlpha = outerAlpha;
        ctx.drawImage(
          spriteImg,
          frame.sx, frame.sy, frame.sw, frame.sh,
          drawX + ox, drawY + oy, drawW, drawH
        );
      }

      // Tight Solar Flare Rim (4 diagonal samples @ radius * 0.08)
      const innerRadius = Math.max(1.5, outerRadius * 0.48);
      const innerAlpha = (isTheOne ? 0.32 : 0.25) * alpha;
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + (Math.PI / 4);
        const ox = Math.cos(ang) * innerRadius;
        const oy = Math.sin(ang) * innerRadius;
        ctx.globalAlpha = innerAlpha;
        ctx.drawImage(
          spriteImg,
          frame.sx, frame.sy, frame.sw, frame.sh,
          drawX + ox, drawY + oy, drawW, drawH
        );
      }
      ctx.restore();
    }

    // ── TIER 2 (FOREGROUND LAYER): CRISP UPRIGHT PIXEL ART SPRITE PASS (Solid source-over) ──
    // Drawn on top of the bloom aura so the sun core stays 100% crisp and detailed while glowing around the sides
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(
      spriteImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      drawX, drawY, drawW, drawH
    );
    ctx.restore();

    // ── TIER 3: WHITE-HOT OPTICAL CORE SPARKLE (Upright lens cross-glint) ──
    if (radius >= 14) {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      const glintTick = Math.floor(currentNow / 110) % 2;
      const glintSize = snap(Math.max(P, radius * 0.12 * (glintTick ? 1.25 : 0.85)));
      ctx.fillRect(-glintSize, -P / 2, glintSize * 2, P);
      ctx.fillRect(-P / 2, -glintSize, P, glintSize * 2);
      ctx.restore();
    }

    ctx.restore();
    return;
  }

  // Fallback: Procedural Discrete Integer Grid Solar Sphere
  drawProceduralPixelCruelSunSphere(ctx, snapCx, snapCy, radius, isTheOne, currentNow, alpha, showCorona);
}

/**
 * Procedural Fallback for Sun Expiration / Explosion
 * Used when explosion sprite sheet is loading or unavailable.
 */
export function drawProceduralPixelCruelSunExplosion(ctx, snapCx, snapCy, radius, frameIdx = 0, isTheOne = false, alpha = 1.0) {
  if (radius <= 0 || alpha <= 0) return;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = Math.max(0, Math.min(1.0, alpha));

  const progress = Math.max(0, Math.min(1.0, frameIdx / 5));
  const expandR = snap(radius * (1.0 + progress * 0.85));
  const steps = Math.ceil(expandR / P);

  for (let gy = -steps; gy <= steps; gy += 2) {
    for (let gx = -steps; gx <= steps; gx += 2) {
      const d = Math.hypot(gx * P, gy * P);
      if (d > expandR) continue;
      const normD = d / expandR;
      const angle = Math.atan2(gy, gx);
      const shatterNoise = Math.sin(angle * 6 + frameIdx * 1.8);

      if (frameIdx <= 1) {
        if (normD > 0.80) {
          ctx.fillStyle = isTheOne ? '#FEF08A' : '#DC2626';
        } else if (normD > 0.40) {
          ctx.fillStyle = isTheOne ? '#FFFFFF' : '#F59E0B';
        } else {
          ctx.fillStyle = '#FFFFFF';
        }
        ctx.fillRect(snapCx + gx * P, snapCy + gy * P, P * 2, P * 2);
      } else if (frameIdx <= 3) {
        if (shatterNoise > -0.2 && normD > 0.3) {
          ctx.fillStyle = (normD > 0.75) ? (isTheOne ? '#F59E0B' : '#DC2626') : (isTheOne ? '#FFFFFF' : '#FEF08A');
          ctx.fillRect(snapCx + gx * P, snapCy + gy * P, P * 2, P * 2);
        }
      } else {
        if (shatterNoise > 0.3 && normD > 0.5) {
          ctx.fillStyle = isTheOne ? '#FEF08A' : '#F59E0B';
          ctx.fillRect(snapCx + gx * P, snapCy + gy * P, P, P);
        }
      }
    }
  }

  // White core flash during peak burst (frames 1-3)
  if (frameIdx >= 1 && frameIdx <= 3) {
    ctx.fillStyle = '#FFFFFF';
    const coreFlash = snap(radius * 0.35 * (1 - (frameIdx - 1) / 3));
    ctx.fillRect(snapCx - coreFlash, snapCy - P / 2, coreFlash * 2, P);
    ctx.fillRect(snapCx - P / 2, snapCy - coreFlash, P, coreFlash * 2);
  }

  ctx.restore();
}

/**
 * Draws the Sun Expiration / Explosion Animation in Authentic Pixel Art Style
 * Uses 6-frame pixel art sprite sheet from Assets/model/Sprites/Escanor-Sun-Explosion-Sprite-Sheet.png
 * Features multi-tiered additive solar corona bloom and nuclear core radiance.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} cx - Center X coordinate in world space
 * @param {number} cy - Center Y coordinate in world space
 * @param {number} radius - Base radius of Cruel Sun
 * @param {number} progressOrFrame - Normalized progress (0.0 to 1.0) or discrete frame index (0..5)
 * @param {boolean} [isTheOne=false] - Whether High Noon "The One" palette is active
 * @param {number} [alpha=1.0] - Opacity multiplier
 */
export function drawPixelCruelSunExplosion(ctx, cx, cy, radius, progressOrFrame = 0, isTheOne = false, alpha = 1.0) {
  if (radius <= 0 || alpha <= 0) return;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const snapCx = snap(cx);
  const snapCy = snap(cy);

  let frameIdx = 0;
  if (typeof progressOrFrame === 'number') {
    if (progressOrFrame >= 0 && progressOrFrame <= 1.0) {
      frameIdx = Math.min(5, Math.floor(progressOrFrame * 6));
    } else {
      frameIdx = Math.max(0, Math.min(5, Math.floor(progressOrFrame)));
    }
  }

  const spriteImg = _getEscanorSunExplosionSpriteImage(isTheOne);
  if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
    const frame = ESCANOR_SUN_EXPLOSION_FRAMES[frameIdx] || ESCANOR_SUN_EXPLOSION_FRAMES[0];
    const scale = radius / BASE_EXPLOSION_RADIUS;
    const drawW = frame.sw * scale;
    const drawH = frame.sh * scale;
    const drawX = -frame.anchorX * scale;
    const drawY = -frame.anchorY * scale;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(snapCx, snapCy);
    ctx.globalAlpha = Math.max(0, Math.min(1.0, alpha));

    // ── TIER 1 (BACK LAYER): ADDITIVE SOLAR EXPLOSION CORONA BLOOM (Aura glowing around the sides of fragments) ──
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bloomScale = frameIdx < 3 ? 1.0 : Math.max(0, 1.0 - (frameIdx - 3) / 3);

    // Outer Blast Bloom (4 radial samples @ radius * 0.20)
    const outerRadius = Math.max(3.0, radius * 0.20 * (1.0 + frameIdx * 0.12));
    const outerAlpha = (isTheOne ? 0.24 : 0.18) * alpha * bloomScale;
    if (outerAlpha > 0.01) {
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        const ox = Math.cos(ang) * outerRadius;
        const oy = Math.sin(ang) * outerRadius;
        ctx.globalAlpha = outerAlpha;
        ctx.drawImage(
          spriteImg,
          frame.sx, frame.sy, frame.sw, frame.sh,
          drawX + ox, drawY + oy, drawW, drawH
        );
      }
    }

    // Tight Blast Rim (4 samples @ radius * 0.09)
    const innerRadius = Math.max(1.5, outerRadius * 0.45);
    const innerAlpha = (isTheOne ? 0.32 : 0.24) * alpha * bloomScale;
    if (innerAlpha > 0.01) {
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + (Math.PI / 4);
        const ox = Math.cos(ang) * innerRadius;
        const oy = Math.sin(ang) * innerRadius;
        ctx.globalAlpha = innerAlpha;
        ctx.drawImage(
          spriteImg,
          frame.sx, frame.sy, frame.sw, frame.sh,
          drawX + ox, drawY + oy, drawW, drawH
        );
      }
    }
    ctx.restore();

    // ── TIER 2 (FOREGROUND LAYER): CRISP UPRIGHT PIXEL ART EXPLOSION FRAME (Solid source-over) ──
    // Drawn on top of the bloom aura so fragments, fissures, and ash stay 100% crisp and distinct
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(
      spriteImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      drawX, drawY, drawW, drawH
    );
    ctx.restore();

    ctx.restore();
    return;
  }

  // Fallback: Procedural Discrete Integer Grid Solar Explosion
  drawProceduralPixelCruelSunExplosion(ctx, snapCx, snapCy, radius, frameIdx, isTheOne, alpha);
}

/**
 * Draws the Cruel Sun (無慈悲な太陽) Projectile Orb in Authentic Pixel Art Style
 * - Renders Layer 0 ambient floor solar illumination wash & proximity entity rim lighting
 * - Renders high-performance O(1) multi-tier discrete pixel flame nodes along flight history (60 FPS at any scale!)
 * - 6-frame animated spinning pixel art Cruel Sun sprite sheet orb with multi-tiered bloom during active flight
 * - 6-frame animated pixel art Sun Explosion sprite sheet with expanding floor wash when about to expire (final 30 frames or detonating)
 */
export function drawCruelSunOrb(ctx, x, y, r = 48, now = Date.now(), sun = null) {
  const currentNow = (typeof now === 'number' && !Number.isNaN(now)) ? now : Date.now();
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const isTheOne = Boolean(sun && sun.owner && sun.owner.isTheOneActive);

  // Check if Cruel Sun is about to expire (final 30 frames of life or marked expiring)
  const isExpiring = Boolean(sun && (sun.isExpiring || (typeof sun.life === 'number' && sun.life <= 30)));

  // ── LAYER 0: AMBIENT FLOOR / GROUND SOLAR ILLUMINATION WASH & ENTITY RIM LIGHTING ──
  if (isExpiring) {
    let expireP = 0.0;
    if (sun && typeof sun.life === 'number') {
      expireP = Math.max(0, Math.min(1.0, 1.0 - Math.max(0, sun.life) / 30));
    }
    drawCruelSunFloorLighting(ctx, x, y, snap(r), isTheOne, 1.0, true, expireP);
    drawCruelSunProximityEntityLighting(ctx, x, y, snap(r), isTheOne, 1.0 - expireP * 0.5);
  } else {
    drawCruelSunFloorLighting(ctx, x, y, snap(r), isTheOne, 1.0, false, 0);
    drawCruelSunProximityEntityLighting(ctx, x, y, snap(r), isTheOne, 1.0);
  }

  // 1. Draw High-Performance O(1) Discrete Pixel Art Fire Trail (Zero O(N*r^2) nested loop stalls!)
  if (!isExpiring && sun && sun.history && sun.history.length > 1) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const len = sun.history.length;
    // Step by 2 along history to keep trail clean and lightweight
    for (let k = 0; k < len; k += 2) {
      const pt = sun.history[k];
      const trailRatio = (k + 1) / len; // 0 (oldest) to 1.0 (newest)
      const baseNodeR = snap(r * (0.20 + 0.45 * trailRatio));
      const alpha = (0.12 + 0.55 * trailRatio);
      const snapPtX = snap(pt.x);
      const snapPtY = snap(pt.y);

      ctx.globalAlpha = alpha;

      // Tier 1: Outer Ember Diamond Outline (Deep Crimson Red)
      const outR = Math.max(P * 2, snap(baseNodeR));
      ctx.fillStyle = isTheOne ? '#B45309' : '#DC2626';
      ctx.fillRect(snapPtX - outR, snapPtY - P, outR * 2, P * 2);
      ctx.fillRect(snapPtX - P, snapPtY - outR, P * 2, outR * 2);
      ctx.fillRect(snapPtX - snap(outR * 0.65), snapPtY - snap(outR * 0.65), snap(outR * 1.3), snap(outR * 1.3));

      // Tier 2: Mid Plasma Solar Core (Fiery Amber)
      const midR = Math.max(P, snap(baseNodeR * 0.58));
      ctx.fillStyle = isTheOne ? '#FEF08A' : '#F59E0B';
      ctx.fillRect(snapPtX - midR, snapPtY - P / 2, midR * 2, P);
      ctx.fillRect(snapPtX - P / 2, snapPtY - midR, P, midR * 2);
      ctx.fillRect(snapPtX - snap(midR * 0.6), snapPtY - snap(midR * 0.6), snap(midR * 1.2), snap(midR * 1.2));

      // Tier 3: Nuclear White-Hot Core Pixel
      const coreR = Math.max(P, snap(baseNodeR * 0.25));
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(snapPtX - coreR, snapPtY - coreR, coreR * 2, coreR * 2);

      // Trailing upward drift spark mote
      const sparkDriftY = snap((1.0 - trailRatio) * 6);
      const sparkDriftX = snap(Math.sin(k * 1.4) * 4);
      ctx.fillStyle = (k % 4 === 0) ? '#FFFFFF' : (isTheOne ? '#FEF08A' : '#FBBF24');
      ctx.fillRect(snapPtX + sparkDriftX, snapPtY - sparkDriftY, P, P);
    }
    ctx.restore();
  }

  // 2. Draw Main Cruel Sun Sphere (Flight Sprite) or Sun Explosion Animation (Expiration Sprite)
  if (isExpiring) {
    let expireP = 0.0;
    if (sun && typeof sun.life === 'number') {
      expireP = Math.max(0, Math.min(1.0, 1.0 - Math.max(0, sun.life) / 30));
    }
    drawPixelCruelSunExplosion(ctx, x, y, snap(r), expireP, isTheOne, 1.0);
  } else {
    drawPixelCruelSunSphere(ctx, x, y, snap(r), isTheOne, currentNow, 1.0, true);
  }
}

/**
 * Draws the Expanding Cruel Sun (無慈悲な太陽) Activation Animation in Authentic Pixel Art Style
 * - Manifests steadily above Escanor's raised index finger
 * - Casts ambient floor lighting & solar proximity rim highlights
 * - Expands from a tiny 4-frame retro arcade spark to full roaring animated pixel star
 * - Features discrete stepped boiling plasma, optical pixel cross-glints, and rising retro embers
 */
export function drawCruelSunChargingExpansion(ctx, x, y, expandProgress = 0, maxRadius = 22, isTheOne = false, now = Date.now()) {
  const p = Math.max(0, Math.min(1.0, expandProgress));
  if (p <= 0) return;
  const currentNow = (typeof now === 'number' && !Number.isNaN(now)) ? now : Date.now();
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  // 1. Dynamic Radius Growth
  const ease = p < 0.20
    ? (p / 0.20) * 0.15
    : 0.15 + 0.85 * Math.pow((p - 0.20) / 0.80, 1.25);

  const currentR = Math.max(P * 2, snap(ease * maxRadius));

  // Cast ambient floor lighting & proximity entity rim lighting while charging above finger
  if (p >= 0.15) {
    drawCruelSunFloorLighting(ctx, x, y, currentR, isTheOne, p * 0.85, false, 0);
    drawCruelSunProximityEntityLighting(ctx, x, y, currentR, isTheOne, p * 0.75);
  }

  // 2. Tiny Early Ignition Phase (p < 0.15: 4-frame retro arcade spark)
  if (p < 0.15) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const snapX = snap(x);
    const snapY = snap(y);
    const sparkFrame = Math.floor(currentNow / 70) % 4;

    if (sparkFrame === 0) {
      // 2x2 White Spark
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(snapX - P / 2, snapY - P / 2, P, P);
    } else if (sparkFrame === 1) {
      // 4x4 Diamond Flash
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(snapX - P * 2, snapY - P * 2, P * 4, P * 4);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(snapX - P, snapY - P, P * 2, P * 2);
    } else if (sparkFrame === 2) {
      // 6x2 Horizontal + 2x6 Vertical Glint
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(snapX - P * 3, snapY - P / 2, P * 6, P);
      ctx.fillRect(snapX - P / 2, snapY - P * 3, P, P * 6);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(snapX - P, snapY - P, P * 2, P * 2);
    } else {
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(snapX - P, snapY - P, P * 2, P * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(snapX - P / 2, snapY - P / 2, P, P);
    }
    ctx.restore();
    return;
  }

  // 3. Expanding Animated Pixel Solar Sphere
  drawPixelCruelSunSphere(ctx, x, y, currentR, isTheOne, currentNow, 1.0, p >= 0.35);

  // 4. Procedural Ascending Pixel Ember Motes (Thermal updraft sparkles)
  if (p >= 0.25) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const snapX = snap(x);
    const snapY = snap(y);
    const emberCount = 5;

    for (let i = 0; i < emberCount; i++) {
      const emberPhase = ((currentNow * 0.003 + i * 0.45) % 1.0);
      const emberAngle = (i * (Math.PI * 2 / emberCount)) + Math.sin(currentNow * 0.004 + i) * 0.5;
      const emberDist = (currentR * 0.6) + emberPhase * (currentR * 1.2);
      const px = snap(snapX + Math.cos(emberAngle) * emberDist);
      const py = snap(snapY - Math.abs(Math.sin(emberAngle) * emberDist) - (emberPhase * 12)); // Drift upward into -Y

      const emberAlpha = Math.sin(emberPhase * Math.PI) * (0.5 + 0.5 * p);
      if (emberAlpha > 0.08) {
        ctx.globalAlpha = emberAlpha;
        ctx.fillStyle = (i % 2 === 0) ? '#FFFFFF' : '#FEF08A';
        ctx.fillRect(px, py, P, P);
      }
    }
    ctx.restore();
  }
}

/**
 * Draws the Pride Flare (プライド・フレア) Expanding Shockwave Nova in Discrete Pixel Art Style
 */
export function drawPrideFlareShockwave(ctx, x, y, currentRadius, maxRadius, alpha = 1.0) {
  if (currentRadius <= 0 || alpha <= 0) return;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(snap(x), snap(y));
  ctx.globalAlpha = Math.max(0, Math.min(1.0, alpha));

  const curR = snap(currentRadius);
  const steps = Math.ceil((curR + P) / P);

  // Stepped Pixel Art Shockwave Ring
  for (let gy = -steps; gy <= steps; gy += 2) {
    for (let gx = -steps; gx <= steps; gx += 2) {
      const d = Math.hypot(gx * P, gy * P);
      if (d > curR || d < curR - P * 3) continue;

      if (d >= curR - P) {
        ctx.fillStyle = '#F59E0B'; // Outer gold rim
      } else if (d >= curR - P * 2) {
        ctx.fillStyle = '#FEF08A'; // Mid hot yellow
      } else {
        ctx.fillStyle = '#FFFFFF'; // Inner white-hot rim
      }
      ctx.fillRect(gx * P, gy * P, P * 2, P * 2);
    }
  }

  ctx.restore();
}

// ─── Cruel Sun First-Collision Hit Impact VFX Pipeline ───
const MAX_CRUEL_SUN_IMPACTS = 24;
const _cruelSunImpactPool = [];

for (let i = 0; i < MAX_CRUEL_SUN_IMPACTS; i++) {
  const particles = [];
  for (let j = 0; j < 10; j++) {
    particles.push({ x: 0, y: 0, vx: 0, vy: 0, size: 2, color: '#FFFFFF' });
  }
  _cruelSunImpactPool.push({
    active: false,
    x: 0,
    y: 0,
    hitAngle: 0,
    isTheOne: false,
    frame: 0,
    maxFrames: 18,
    particles
  });
}

/**
 * Spawns an authentic anime Cruel Sun first-collision solar burst hit effect.
 * @param {number} x Collision contact X
 * @param {number} y Collision contact Y
 * @param {number} [hitAngle=0] Incoming hit angle from sun center to target
 * @param {boolean} [isTheOne=false] Whether Escanor is in "The One" state
 */
export function spawnCruelSunHitImpact(x, y, hitAngle = 0, isTheOne = false) {
  let impact = _cruelSunImpactPool.find(imp => !imp.active);
  if (!impact) {
    impact = _cruelSunImpactPool[0];
  }
  impact.active = true;
  impact.x = x;
  impact.y = y;
  impact.hitAngle = hitAngle;
  impact.isTheOne = Boolean(isTheOne);
  impact.frame = 0;
  impact.maxFrames = 18;

  for (let i = 0; i < impact.particles.length; i++) {
    const p = impact.particles[i];
    p.x = 0;
    p.y = 0;
    const spread = (Math.random() - 0.5) * Math.PI * 1.3;
    const ang = hitAngle + spread;
    const spd = 3.0 + Math.random() * 6.0;
    p.vx = Math.cos(ang) * spd;
    p.vy = Math.sin(ang) * spd;
    p.size = (i % 3 === 0) ? 4.0 : 2.0;
    p.color = (i % 2 === 0) ? '#FFFFFF' : (isTheOne ? '#FEF08A' : '#F59E0B');
  }
}

/**
 * Updates all active Cruel Sun hit impact particles.
 */
export function updateCruelSunHitImpacts() {
  for (let i = 0; i < _cruelSunImpactPool.length; i++) {
    const imp = _cruelSunImpactPool[i];
    if (!imp.active) continue;
    imp.frame++;
    if (imp.frame >= imp.maxFrames) {
      imp.active = false;
      continue;
    }
    for (let j = 0; j < imp.particles.length; j++) {
      const p = imp.particles[j];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.88;
      p.vy *= 0.88;
    }
  }
}

/**
 * Draws active Cruel Sun first-collision solar burst hit effects in Discrete Pixel Art Style.
 * Adheres strictly to:
 * - Rule 3.5: Authentic 2D Discrete Grid Unit (P = 2.0px)
 * - Rule 11 / Rule 2.2: Prohibition of shadowBlur (stepped pixel layers & lighter blend modes)
 * - Rule 16: Manga Speed Line Standard (4-point filled needle polygons)
 * - Rule 2.4: Canvas 2D Transform Stack Integrity (balanced save/restore)
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawCruelSunHitImpacts(ctx) {
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  for (let i = 0; i < _cruelSunImpactPool.length; i++) {
    const imp = _cruelSunImpactPool[i];
    if (!imp.active) continue;

    const progress = imp.frame / imp.maxFrames;
    const invP = 1.0 - progress;
    const snapX = snap(imp.x);
    const snapY = snap(imp.y);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(snapX, snapY);

    // 1. Concentric Expanding Discrete Pixel Shockwave Rings
    const ringR = snap(progress * 52.0);
    const ringSteps = Math.ceil((ringR + P) / P);

    for (let gy = -ringSteps; gy <= ringSteps; gy += 2) {
      for (let gx = -ringSteps; gx <= ringSteps; gx += 2) {
        const d = Math.hypot(gx * P, gy * P);
        if (d > ringR || d < ringR - P * 3) continue;

        ctx.globalAlpha = Math.max(0, invP * 0.85);
        if (d >= ringR - P) {
          ctx.fillStyle = imp.isTheOne ? '#FEF08A' : '#DC2626';
        } else if (d >= ringR - P * 2) {
          ctx.fillStyle = imp.isTheOne ? '#FFFFFF' : '#F59E0B';
        } else {
          ctx.fillStyle = '#FFFFFF';
        }
        ctx.fillRect(gx * P, gy * P, P * 2, P * 2);
      }
    }

    // 2. Radial Solar Prominence Spikes (Rule 16: Manga 4-Point Filled Needles)
    const spikeCount = 6;
    for (let s = 0; s < spikeCount; s++) {
      const sAngle = imp.hitAngle + (s - (spikeCount - 1) / 2) * 0.45;
      const spikeLen = snap((28 + (s % 2) * 16) * Math.sin(progress * Math.PI));
      const spikeThick = snap(Math.max(P, P * 2 * invP));
      if (spikeLen <= 0) continue;

      const cosA = Math.cos(sAngle);
      const sinA = Math.sin(sAngle);
      const perpX = snap(-sinA * spikeThick);
      const perpY = snap(cosA * spikeThick);
      const midX = snap(cosA * (spikeLen * 0.45));
      const midY = snap(sinA * (spikeLen * 0.45));
      const tipX = snap(cosA * spikeLen);
      const tipY = snap(sinA * spikeLen);

      ctx.globalAlpha = Math.max(0, invP * 0.95);
      ctx.fillStyle = (s % 2 === 0) ? '#FFFFFF' : (imp.isTheOne ? '#FEF08A' : '#F59E0B');
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(midX + perpX, midY + perpY);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(midX - perpX, midY - perpY);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Central Solar Optical Diamond Flare (Peak at early frames)
    if (progress < 0.50) {
      const flashP = progress / 0.50;
      const flashSize = snap(Math.sin(flashP * Math.PI) * 18);
      if (flashSize > 0) {
        ctx.globalAlpha = Math.sin(flashP * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-flashSize, -P / 2, flashSize * 2, P);
        ctx.fillRect(-P / 2, -flashSize, P, flashSize * 2);
        ctx.fillRect(-flashSize / 2, -flashSize / 2, flashSize, flashSize);
      }
    }

    // 4. Flying Solar Pixel Ember Shards
    ctx.globalAlpha = Math.max(0, invP * 0.90);
    for (let j = 0; j < imp.particles.length; j++) {
      const pt = imp.particles[j];
      ctx.fillStyle = pt.color;
      ctx.fillRect(snap(pt.x), snap(pt.y), pt.size, pt.size);
    }

    ctx.restore();
  }
}

/**
 * Clears all active Cruel Sun hit impact visual effects.
 */
export function clearCruelSunHitImpacts() {
  for (let i = 0; i < _cruelSunImpactPool.length; i++) {
    _cruelSunImpactPool[i].active = false;
  }
}

// ─── Standalone Cruel Sun Explosion Pool (Zero-Allocation) ───
const MAX_CRUEL_SUN_EXPLOSIONS = 16;
const _cruelSunExplosionPool = [];

for (let i = 0; i < MAX_CRUEL_SUN_EXPLOSIONS; i++) {
  _cruelSunExplosionPool.push({
    active: false,
    x: 0,
    y: 0,
    r: 48,
    isTheOne: false,
    frame: 0,
    maxFrames: 30
  });
}

/**
 * Spawns an independent Cruel Sun 6-frame pixel art explosion animation.
 * @param {number} x - Center X
 * @param {number} y - Center Y
 * @param {number} [radius=48] - Sphere base radius
 * @param {boolean} [isTheOne=false] - Whether Escanor is in "The One" state
 * @param {number} [durationFrames=30] - Total frames for animation to play
 */
export function spawnCruelSunExplosion(x, y, radius = 48, isTheOne = false, durationFrames = 30) {
  let exp = _cruelSunExplosionPool.find(e => !e.active);
  if (!exp) {
    exp = _cruelSunExplosionPool[0];
  }
  exp.active = true;
  exp.x = x;
  exp.y = y;
  exp.r = radius;
  exp.isTheOne = Boolean(isTheOne);
  exp.frame = 0;
  exp.maxFrames = Math.max(6, durationFrames || 30);
}

/**
 * Updates all active Cruel Sun explosion animations.
 */
export function updateCruelSunExplosions() {
  for (let i = 0; i < _cruelSunExplosionPool.length; i++) {
    const exp = _cruelSunExplosionPool[i];
    if (!exp.active) continue;
    exp.frame++;
    if (exp.frame >= exp.maxFrames) {
      exp.active = false;
    }
  }
}

/**
 * Renders all active Cruel Sun explosion animations.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawCruelSunExplosions(ctx) {
  for (let i = 0; i < _cruelSunExplosionPool.length; i++) {
    const exp = _cruelSunExplosionPool[i];
    if (!exp.active) continue;
    const progress = exp.frame / exp.maxFrames;
    const alpha = progress > 0.85 ? Math.max(0, 1.0 - ((progress - 0.85) / 0.15)) : 1.0;
    drawCruelSunFloorLighting(ctx, exp.x, exp.y, exp.r, exp.isTheOne, alpha, true, progress);
    drawCruelSunProximityEntityLighting(ctx, exp.x, exp.y, exp.r, exp.isTheOne, alpha * (1.0 - progress * 0.5));
    drawPixelCruelSunExplosion(ctx, exp.x, exp.y, exp.r, progress, exp.isTheOne, alpha);
  }
}

/**
 * Clears all active Cruel Sun explosions.
 */
export function clearCruelSunExplosions() {
  for (let i = 0; i < _cruelSunExplosionPool.length; i++) {
    _cruelSunExplosionPool[i].active = false;
  }
}
