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
      const baseScale = ((r * 3.65) / WEAPON_SHAFT_LEN) * customScale;
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
    // Hit-Pause Impact: Full glorious arc held firmly at full extension during the impact freeze!
    currentStartA = startA;
    currentEndA = endA;
    alpha = 1.0 * maxOpacity;
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

/**
 * Draws the Cruel Sun (無慈悲な太陽) Projectile Orb
 */
export function drawCruelSunOrb(ctx, x, y, r = 18, now = Date.now()) {
  ctx.save();
  ctx.translate(x, y);

  // 1. Concentric Solar Corona Flares (Rule 11: Zero shadowBlur)
  const pulse = Math.sin(now * 0.015) * 3;
  const coreR = r + pulse;

  ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
  ctx.beginPath();
  ctx.arc(0, 0, coreR * 1.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
  ctx.beginPath();
  ctx.arc(0, 0, coreR * 1.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(251, 191, 36, 0.75)';
  ctx.beginPath();
  ctx.arc(0, 0, coreR * 1.05, 0, Math.PI * 2);
  ctx.fill();

  // 2. White-Hot Solar Core
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, coreR * 0.65, 0, Math.PI * 2);
  ctx.fill();

  // 3. Rotating Solar Flare Spikes
  ctx.save();
  ctx.rotate(now * 0.005);
  ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-2, coreR * 0.9, 4, 6);
  }
  ctx.restore();

  ctx.restore();
}

/**
 * Draws the Pride Flare (プライド・フレア) Expanding Shockwave Nova
 */
export function drawPrideFlareShockwave(ctx, x, y, currentRadius, maxRadius, alpha = 1.0) {
  if (currentRadius <= 0 || alpha <= 0) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  // Outer Expanding Gold Ring
  ctx.beginPath();
  ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 4.0;
  ctx.stroke();

  // White Hot Inner Ring
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(0, currentRadius - 6), 0, Math.PI * 2);
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Central Thermal Fill
  ctx.fillStyle = 'rgba(245, 158, 11, 0.20)';
  ctx.beginPath();
  ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
