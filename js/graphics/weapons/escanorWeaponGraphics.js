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
export function drawDivineAxeRhitta(ctx, x, y, angle, r = 25, opts = {}) {
  const isPreview = Boolean(opts.isPreview);
  const now = opts.now || Date.now();
  const heatLevel = opts.heatLevel !== undefined ? opts.heatLevel : 1.0;
  const isTheOne = Boolean(opts.isTheOne);
  const weaponImg = _getEscanorWeaponImage();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;

  if (weaponImg && (weaponImg.complete || weaponImg.width) && (weaponImg.naturalWidth > 0 || weaponImg.width > 0)) {
    const drawW = weaponImg.naturalWidth || weaponImg.width;
    const drawH = weaponImg.naturalHeight || weaponImg.height;

    if (isPreview) {
      // Centered diagonal showcase for Weapon Menu Card & Selection Screen
      const previewScale = (r * 5.0) / WEAPON_SHAFT_LEN;
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
      // 1. Solar Heat Mirages around the blade (Rule 11 compliant: Concentric flat rings/glow)
      const pulse = Math.sin(now * 0.008) > 0;
      ctx.fillStyle = isTheOne
        ? (pulse ? 'rgba(254, 240, 138, 0.35)' : 'rgba(245, 158, 11, 0.25)')
        : (pulse ? 'rgba(245, 158, 11, 0.20)' : 'rgba(239, 68, 68, 0.15)');
      ctx.beginPath();
      ctx.arc(r * 3.2, r * 1.5, r * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // 2. Wielded in Hand: Align Blue Hilt Grip Center at (0, 0)
      const wieldScale = (r * 4.3) / WEAPON_SHAFT_LEN * (isTheOne ? 1.30 : 1.0);
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
  _drawDivineAxeRhittaProcedural(ctx, r, isPreview, isTheOne, heatLevel, now);
  ctx.restore();
}

/**
 * Procedural Pixel-Art Axe Fallback
 */
function _drawDivineAxeRhittaProcedural(ctx, r, isPreview, isTheOne, heatLevel, now) {
  const startX = isPreview ? snap(-18) : snap(r * 0.70);
  const shaftLength = snap(46);
  const shaftWidth = snap(4);

  // 1. Solar Heat Mirages around the blade (Rule 11 compliant: Concentric flat pixels)
  if (!isPreview) {
    const pulse = Math.sin(now * 0.008) > 0;
    ctx.fillStyle = isTheOne
      ? (pulse ? 'rgba(254, 240, 138, 0.35)' : 'rgba(245, 158, 11, 0.25)')
      : (pulse ? 'rgba(245, 158, 11, 0.20)' : 'rgba(239, 68, 68, 0.15)');
    ctx.fillRect(startX + shaftLength - 16, -26, 32, 52);
  }

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
 * Draws Escanor's 140° Blazing Golden Axe Slash Arc Trail
 */
export function drawRhittaSlashArc(ctx, x, y, angle, r = 25, strikeP = 0, isTheOne = false) {
  if (strikeP <= 0 || strikeP > 1.0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const startA = -1.25; // Overhead start angle
  const endA = 1.15; // Ground cleave end angle
  const currentEndA = startA + (endA - startA) * strikeP;
  const currentStartA = Math.max(startA, currentEndA - Math.PI * 0.85 * (1.0 - strikeP * 0.35));
  const outerR = r + 115;
  const innerR = r + 35;

  // Outer Golden Solar Flame Shockwave
  ctx.beginPath();
  ctx.arc(0, 0, outerR, currentStartA, currentEndA, false);
  ctx.arc(0, 0, innerR, currentEndA, currentStartA, true);
  ctx.closePath();

  const alpha = Math.sin(strikeP * Math.PI) * 0.88;
  ctx.fillStyle = isTheOne
    ? `rgba(254, 240, 138, ${alpha})`
    : `rgba(245, 158, 11, ${alpha})`;
  ctx.fill();

  // White-hot sharp cutting blade line
  ctx.beginPath();
  ctx.arc(0, 0, outerR - 2, currentStartA, currentEndA, false);
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
  ctx.lineWidth = isTheOne ? 4.5 : 3.0;
  ctx.stroke();

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
