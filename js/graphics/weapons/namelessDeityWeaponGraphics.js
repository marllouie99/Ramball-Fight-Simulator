// ─────────────────────────────────────────────
// Nameless Destroyer Weapon & Visual FX Graphics
// Terraria: Wrath of the Gods — Transcendent Cosmic Arsenal
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { namelessDeityConfig } from '../../configs/characters/namelessDeityConfig.js';

let _cosmicLightCircleImage = null;
const _COSMIC_LIGHT_CIRCLE_PATH = 'Assets/model/NamelessDeity/CosmicLightCircle.png';

function _getCosmicLightCircleImage() {
  if (_cosmicLightCircleImage && _cosmicLightCircleImage.complete && _cosmicLightCircleImage.naturalWidth > 0) return _cosmicLightCircleImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _COSMIC_LIGHT_CIRCLE_PATH;
    _cosmicLightCircleImage = img;
  }
  return _cosmicLightCircleImage;
}

let _cosmicSpaceImage = null;
const _COSMIC_SPACE_PATH = 'Assets/model/Sprites/Neon Cosmic Nebula Texture.png';

function _getCosmicSpaceImage() {
  if (_cosmicSpaceImage && _cosmicSpaceImage.complete && _cosmicSpaceImage.naturalWidth > 0) return _cosmicSpaceImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _COSMIC_SPACE_PATH;
    _cosmicSpaceImage = img;
  }
  return _cosmicSpaceImage;
}

let _beamTexture2Image = null;
let _cachedBlueBeamTexture2Canvas = null;
const _BEAM_TEXTURE2_PATH = 'Assets/model/NamelessDeity/beam-texture2.png';

function _getBeamTexture2Image() {
  if (_beamTexture2Image && _beamTexture2Image.complete && _beamTexture2Image.naturalWidth > 0) return _beamTexture2Image;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _BEAM_TEXTURE2_PATH;
    _beamTexture2Image = img;
  }
  return _beamTexture2Image;
}

function _getBlueBeamTexture2Canvas() {
  const img = _getBeamTexture2Image();
  if (!_isImageReady(img)) return null;
  if (_cachedBlueBeamTexture2Canvas) return _cachedBlueBeamTexture2Canvas;
  if (typeof document === 'undefined') return img;

  try {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = img.naturalWidth || 1254;
    offCanvas.height = img.naturalHeight || 1254;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(img, 0, 0);

    const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (lum > 220) {
        // Pure blinding starlight diamond core (brilliant white to ice cyan core)
        const t = (lum - 220) / 35;
        data[i] = Math.min(255, Math.round(180 + 75 * t));
        data[i + 1] = Math.min(255, Math.round(230 + 25 * t));
        data[i + 2] = 255;
      } else if (lum > 100) {
        // Radiant Cyan & Azure celestial nebula stream
        const t = (lum - 100) / 120;
        data[i] = Math.round(15 + 165 * t * 0.85);
        data[i + 1] = Math.round(110 + 120 * t);
        data[i + 2] = Math.min(255, Math.round(200 + 55 * t));
      } else {
        // Deep sapphire & cosmic dark space background
        const t = lum / 100;
        data[i] = Math.round(5 * t);
        data[i + 1] = Math.round(75 * t);
        data[i + 2] = Math.round(160 * t + 25);
      }
    }
    offCtx.putImageData(imgData, 0, 0);
    _cachedBlueBeamTexture2Canvas = offCanvas;
    return _cachedBlueBeamTexture2Canvas;
  } catch (e) {
    return img;
  }
}

// Reusable offscreen buffer for seamless alpha-dissolved beam texture
let _beamOffscreenCanvas = null;
let _beamOffscreenCtx = null;

function _getBeamBuffer(width, height) {
  if (!_beamOffscreenCanvas && typeof document !== 'undefined') {
    _beamOffscreenCanvas = document.createElement('canvas');
    _beamOffscreenCanvas.width = width;
    _beamOffscreenCanvas.height = height;
    _beamOffscreenCtx = _beamOffscreenCanvas.getContext('2d');
  }
  if (_beamOffscreenCanvas && (_beamOffscreenCanvas.width !== width || _beamOffscreenCanvas.height !== height)) {
    _beamOffscreenCanvas.width = width;
    _beamOffscreenCanvas.height = height;
    _beamOffscreenCtx = _beamOffscreenCanvas.getContext('2d');
  }
  return { canvas: _beamOffscreenCanvas, ctx: _beamOffscreenCtx };
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getCosmicLightCircleImage();
  _getCosmicSpaceImage();
  _getBeamTexture2Image();
}

function _isImageReady(img) {
  if (!img) return false;
  if (img.complete !== undefined) return Boolean(img.complete && img.naturalWidth > 0);
  return Boolean((img.width || img.naturalWidth) > 0);
}

function _drawAtPivot(ctx, image, x, y, scaleX, scaleY, pivotX = 0.5, pivotY = 0.5) {
  const imgW = image.naturalWidth || image.width || 900;
  const imgH = image.naturalHeight || image.height || 900;
  const width = imgW * scaleX;
  const height = imgH * scaleY;
  ctx.drawImage(image, x - width * pivotX, y - height * pivotY, width, height);
}

/**
 * Draws the magic circle with balanced micro-dilation for clean, crisp, distinct runes and borders.
 */
function _drawThickMagicCircle(ctx, magicCircle, scale, alpha = 1.0) {
  if (!_isImageReady(magicCircle)) return;
  ctx.save();
  ctx.imageSmoothingEnabled = true;

  // Subtle 4-way micro-dilation (0.6px) for crisp line reinforcement without bloat
  const offsets = [
    [-0.6, 0], [0.6, 0], [0, -0.6], [0, 0.6]
  ];
  ctx.globalAlpha = 0.25 * alpha;
  for (let i = 0; i < offsets.length; i++) {
    const [ox, oy] = offsets[i];
    _drawAtPivot(ctx, magicCircle, ox, oy, scale, scale, 0.5, 0.5);
  }

  // Crisp Solid Center Pass (100% full opacity core)
  ctx.globalAlpha = 1.0 * alpha;
  _drawAtPivot(ctx, magicCircle, 0, 0, scale, scale, 0.5, 0.5);

  ctx.restore();
}

// ─────────────────────────────────────────────
// Pre-Seeded Arena-Wide Volumetric Lighting Structures (Rule 12 Compliant: Zero Per-Frame GC)
// ─────────────────────────────────────────────

const _ARENA_GOD_RAYS = Array.from({ length: 24 }, (_, i) => ({
  baseAngle: (i * Math.PI * 2) / 24,
  speed: (i % 2 === 0 ? 1 : -1) * (0.08 + 0.12 * ((i * 0.381966) % 1.0)),
  length: 880 + ((i * 73) % 220),
  spread: 0.025 + 0.020 * ((i * 0.618033) % 1.0), // Ultra-slender spread (0.025 - 0.045 rad, 6x to 8x thinner than previous triangles)
  alpha: 0.12 + 0.08 * ((i * 0.5) % 1.0),
  color: (i % 3 === 0) ? 'rgba(235, 205, 255, ' : ((i % 3 === 1) ? 'rgba(216, 180, 254, ' : 'rgba(192, 132, 252, ')
}));

const _ARENA_STARDUST_MOTES = Array.from({ length: 32 }, (_, i) => ({
  angle: (i * 2.399963), // Golden angle distribution for uniform organic coverage
  distRatio: 0.12 + 0.84 * ((i * 0.6180339887) % 1.0),
  size: (i % 3 === 0) ? 3.4 : ((i % 2 === 0) ? 2.5 : 1.6),
  speed: 0.30 + 0.60 * ((i * 0.381966) % 1.0),
  phase: i * 1.37,
  isSquare: (i % 3 === 0), // Authentic square pixel motes as seen in reference footage
  isDiamond: (i % 5 === 0),
  colorType: i % 3 // 0: Pure White, 1: Vibrant Lavender, 2: Celestial Cyan Glint
}));

/**
 * Renders broad volumetric ambient purple or blue illumination across the entire arena floor (Rule 11 compliant).
 */
function _drawArenaCosmicAmbientDome(ctx, cx, cy, radius, intensity = 1.0, gameTimer = 0, isBlueTheme = false) {
  if (intensity <= 0.01 || radius <= 5) return;

  ctx.save();
  ctx.translate(cx, cy);

  const pulse = 0.96 + 0.04 * Math.sin(gameTimer * 0.35);
  const r = radius * pulse;

  // 1. Broad Volumetric Cosmic Purple/Violet or Celestial Blue/Cyan Radial Ambient Illumination
  const domeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  if (isBlueTheme) {
    domeGrad.addColorStop(0.00, `rgba(235, 250, 255, ${(0.65 * intensity).toFixed(3)})`);
    domeGrad.addColorStop(0.12, `rgba(180, 235, 255, ${(0.55 * intensity).toFixed(3)})`);
    domeGrad.addColorStop(0.28, `rgba(100, 215, 255, ${(0.45 * intensity).toFixed(3)})`);
    domeGrad.addColorStop(0.50, `rgba(0, 160, 255, ${(0.32 * intensity).toFixed(3)})`);
    domeGrad.addColorStop(0.72, `rgba(0, 90, 220, ${(0.20 * intensity).toFixed(3)})`);
    domeGrad.addColorStop(0.88, `rgba(0, 40, 150, ${(0.10 * intensity).toFixed(3)})`);
    domeGrad.addColorStop(1.00, 'rgba(5, 15, 50, 0.00)');
  } else {
    domeGrad.addColorStop(0.00, `rgba(243, 232, 255, ${(0.65 * intensity).toFixed(3)})`);
    domeGrad.addColorStop(0.12, `rgba(216, 180, 254, ${(0.55 * intensity).toFixed(3)})`);
    domeGrad.addColorStop(0.28, `rgba(192, 132, 252, ${(0.45 * intensity).toFixed(3)})`);
    domeGrad.addColorStop(0.50, `rgba(147, 51, 234, ${(0.32 * intensity).toFixed(3)})`);
    domeGrad.addColorStop(0.72, `rgba(91, 33, 182, ${(0.20 * intensity).toFixed(3)})`);
    domeGrad.addColorStop(0.88, `rgba(59, 7, 100, ${(0.10 * intensity).toFixed(3)})`);
    domeGrad.addColorStop(1.00, 'rgba(24, 9, 43, 0.00)');
  }

  ctx.fillStyle = domeGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Renders sweeping slender celestial god rays fanning out across the arena.
 */
function _drawArenaGodRays(ctx, cx, cy, maxRadius, intensity = 1.0, gameTimer = 0, isBlueTheme = false) {
  if (intensity <= 0.01) return;

  ctx.save();
  ctx.translate(cx, cy);

  for (let i = 0; i < _ARENA_GOD_RAYS.length; i++) {
    const ray = _ARENA_GOD_RAYS[i];
    const angle = ray.baseAngle + gameTimer * 0.008 * ray.speed;
    const rayLength = Math.min(maxRadius, ray.length);
    const halfSpread = ray.spread * 0.5;

    const angle1 = angle - halfSpread;
    const angle2 = angle + halfSpread;

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const x1 = Math.cos(angle1) * rayLength;
    const y1 = Math.sin(angle1) * rayLength;
    const x2 = Math.cos(angle2) * rayLength;
    const y2 = Math.sin(angle2) * rayLength;
    const tipX = cosA * rayLength;
    const tipY = sinA * rayLength;

    const alpha = ray.alpha * intensity * (0.80 + 0.20 * Math.sin(gameTimer * 0.25 + i * 1.5));
    if (alpha <= 0.01) continue;

    const rayColor = isBlueTheme
      ? ((i % 3 === 0) ? 'rgba(215, 250, 255, ' : ((i % 3 === 1) ? 'rgba(180, 235, 255, ' : 'rgba(0, 200, 255, '))
      : ray.color;

    const rayGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, rayLength);
    rayGrad.addColorStop(0.00, `${rayColor}${(alpha * 1.15).toFixed(3)})`);
    rayGrad.addColorStop(0.25, `${rayColor}${alpha.toFixed(3)})`);
    rayGrad.addColorStop(0.65, `${rayColor}${(alpha * 0.40).toFixed(3)})`);
    rayGrad.addColorStop(1.00, `${rayColor}0.00)`);

    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(tipX * 1.01, tipY * 1.01);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fill();

    // Center slender starlight line
    ctx.strokeStyle = isBlueTheme ? `rgba(200, 245, 255, ${(alpha * 0.35).toFixed(3)})` : `rgba(255, 255, 255, ${(alpha * 0.30).toFixed(3)})`;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tipX * 0.85, tipY * 0.85);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renders floating stardust glints and square pixel motes drifting through the illuminated arena.
 */
function _drawArenaStardustMotes(ctx, cx, cy, radius, intensity = 1.0, gameTimer = 0, isBlueTheme = false) {
  if (intensity <= 0.01) return;

  ctx.save();
  ctx.translate(cx, cy);

  for (let i = 0; i < _ARENA_STARDUST_MOTES.length; i++) {
    const mote = _ARENA_STARDUST_MOTES[i];
    const curAngle = mote.angle + gameTimer * 0.008 * mote.speed;
    const curDist = radius * mote.distRatio * (0.92 + 0.08 * Math.sin(gameTimer * 0.25 + mote.phase));

    const px = Math.cos(curAngle) * curDist;
    const py = Math.sin(curAngle) * curDist;

    const flicker = 0.50 + 0.50 * Math.sin(gameTimer * 0.6 + mote.phase);
    const alpha = (mote.isSquare ? 0.75 : 0.90) * intensity * flicker;
    if (alpha <= 0.02) continue;

    const size = mote.size * (0.85 + 0.30 * flicker);

    if (mote.colorType === 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    } else if (mote.colorType === 1) {
      ctx.fillStyle = isBlueTheme ? `rgba(180, 235, 255, ${alpha.toFixed(3)})` : `rgba(216, 180, 254, ${alpha.toFixed(3)})`;
    } else {
      ctx.fillStyle = isBlueTheme ? `rgba(0, 215, 255, ${alpha.toFixed(3)})` : `rgba(165, 243, 252, ${alpha.toFixed(3)})`;
    }

    if (mote.isSquare) {
      ctx.fillRect(px - size * 0.5, py - size * 0.5, size, size);
    } else if (mote.isDiamond) {
      ctx.beginPath();
      ctx.moveTo(px, py - size * 1.4);
      ctx.lineTo(px + size * 0.9, py);
      ctx.lineTo(px, py + size * 1.4);
      ctx.lineTo(px - size * 0.9, py);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Renders an authentic cinematic optical lens flare (Rule 11 compliant: pure gradients & needle polygons).
 * Features an ultra-luminous pure starlight white core, dense 360° radiating sunburst diffraction rays with
 * organic waving needle tails, undulating anamorphic streak glares, and clean starlight diamond core (zero violet bloom).
 */
function _drawDiamondStarFlare(ctx, cx, cy, radius, pulse = 1.0, options = {}) {
  const {
    color = '#FFFFFF',
    haloColor = 'rgba(255, 255, 255, 0.75)',
    outerGlowColor = 'rgba(255, 255, 255, 0.00)',
    flareTheme = 'white',
    vScale = 2.8,
    hScale = 1.5,
    rayCount = 40,
    coreScale = 0.28,
    rotation = 0,
    animSpeed = 0.18
  } = options;

  ctx.save();
  ctx.translate(cx, cy);
  if (rotation !== 0) ctx.rotate(rotation);

  const r = radius * pulse;
  const gameTimer = (typeof state !== 'undefined' && state.gameTime) ? state.gameTime : Date.now() * 0.05;
  const ft = gameTimer * animSpeed;

  // 1. Soft Luminous Starlight / Azure Flare Glow
  const maxReach = r * Math.max(vScale, hScale, 2.2) * (0.96 + 0.04 * Math.sin(ft * 0.8));
  const hazeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxReach);
  if (flareTheme === 'blue') {
    hazeGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.95)');
    hazeGrad.addColorStop(0.18, 'rgba(180, 235, 255, 0.65)');
    hazeGrad.addColorStop(0.45, 'rgba(0, 200, 255, 0.30)');
    hazeGrad.addColorStop(0.75, 'rgba(0, 120, 255, 0.10)');
    hazeGrad.addColorStop(1.00, 'rgba(0, 50, 200, 0.00)');
  } else {
    hazeGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.65)');
    hazeGrad.addColorStop(0.20, 'rgba(255, 255, 255, 0.35)');
    hazeGrad.addColorStop(0.50, 'rgba(255, 255, 255, 0.10)');
    hazeGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0.00)');
  }
  ctx.fillStyle = hazeGrad;
  ctx.beginPath();
  ctx.arc(0, 0, maxReach, 0, Math.PI * 2);
  ctx.fill();

  // 2. Layer A: Background Slow-Drifting Swirling Slender Corona Needles
  const subRayCount = Math.floor(rayCount * 0.65);
  for (let i = 0; i < subRayCount; i++) {
    const baseAngle = (i * Math.PI * 2) / subRayCount + ft * 0.04;
    const sway = Math.sin(ft * 0.8 + i * 1.7) * 0.04;
    const angle = baseAngle + sway;

    const lengthPulse = 0.50 + 0.35 * Math.sin(ft * 1.1 + i * 2.1) + 0.15 * Math.cos(ft * 1.8 + i * 0.9);
    const rayLength = r * (0.95 + 1.45 * lengthPulse);
    const rayWidth = (i % 2 === 0) ? 0.65 : 0.35;

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const perpX = -sinA * rayWidth * 0.5;
    const perpY = cosA * rayWidth * 0.5;

    const midLen = rayLength * 0.52;
    const midSway = Math.sin(ft * 1.2 + i * 1.4) * (r * 0.035);
    const midX = cosA * midLen - sinA * midSway;
    const midY = sinA * midLen + cosA * midSway;

    const endX = cosA * rayLength;
    const endY = sinA * rayLength;

    const rayGrad = ctx.createLinearGradient(0, 0, endX, endY);
    if (flareTheme === 'blue') {
      rayGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.95)');
      rayGrad.addColorStop(0.25, 'rgba(180, 235, 255, 0.75)');
      rayGrad.addColorStop(0.60, 'rgba(0, 190, 255, 0.35)');
      rayGrad.addColorStop(1.00, 'rgba(0, 80, 255, 0.00)');
    } else {
      rayGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.85)');
      rayGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.45)');
      rayGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0.00)');
    }

    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(midX + perpX, midY + perpY, endX, endY);
    ctx.quadraticCurveTo(midX - perpX, midY - perpY, 0, 0);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Layer B: Foreground Intense Ultra-Slender Sunburst Needle Rays with Naturally Waving Tails
  for (let i = 0; i < rayCount; i++) {
    const baseAngle = (i * Math.PI * 2) / rayCount;

    const wave1 = Math.sin(ft * 0.95 + i * 2.3);
    const wave2 = Math.cos(ft * 1.55 + i * 1.5);
    const wave3 = Math.sin(ft * 0.50 + i * 0.8);

    const angleSway = (wave1 * 0.030 + wave2 * 0.015);
    const angle = baseAngle + angleSway;

    const lengthMod = 0.50 + 0.35 * wave1 + 0.15 * wave2;
    const rayLength = r * (1.15 + 1.85 * lengthMod);
    const rayWidth = (i % 4 === 0) ? 0.85 : ((i % 2 === 0) ? 0.55 : 0.30);

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const perpX = -sinA * rayWidth * 0.5;
    const perpY = cosA * rayWidth * 0.5;

    const midLen = rayLength * 0.54;
    const whipOffset = (wave2 * 0.04 + wave3 * 0.02) * r;
    const midX = cosA * midLen - sinA * whipOffset;
    const midY = sinA * midLen + cosA * whipOffset;

    const endX = cosA * rayLength;
    const endY = sinA * rayLength;

    const rayGrad = ctx.createLinearGradient(0, 0, endX, endY);
    if (flareTheme === 'blue') {
      rayGrad.addColorStop(0.00, '#FFFFFF');
      rayGrad.addColorStop(0.25, 'rgba(215, 250, 255, 0.90)');
      rayGrad.addColorStop(0.55, 'rgba(0, 215, 255, 0.55)');
      rayGrad.addColorStop(0.80, 'rgba(0, 130, 255, 0.20)');
      rayGrad.addColorStop(1.00, 'rgba(0, 60, 220, 0.00)');
    } else {
      rayGrad.addColorStop(0.00, '#FFFFFF');
      rayGrad.addColorStop(0.30, 'rgba(255, 255, 255, 0.75)');
      rayGrad.addColorStop(0.70, 'rgba(255, 255, 255, 0.25)');
      rayGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0.00)');
    }

    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(midX + perpX, midY + perpY, endX, endY);
    ctx.quadraticCurveTo(midX - perpX, midY - perpY, 0, 0);
    ctx.closePath();
    ctx.fill();
  }

  // 3. Primary Anamorphic Cross Glares — Slender, Razor-Sharp Pure White Needles
  const vWave = Math.sin(ft * 1.15);
  const hWave = Math.cos(ft * 1.35);
  const vStreakL = r * vScale * (1.20 + 0.20 * vWave);
  const hStreakL = r * hScale * (1.20 + 0.18 * hWave);

  // Vertical Anamorphic Light Shaft
  for (let s = -1; s <= 1; s += 2) {
    const tipSway = Math.sin(ft * 1.6 + s * 1.5) * (r * 0.04);
    const vEnd = s * vStreakL;

    const vStreakGrad = ctx.createLinearGradient(0, 0, tipSway, vEnd);
    if (flareTheme === 'blue') {
      vStreakGrad.addColorStop(0.00, '#FFFFFF');
      vStreakGrad.addColorStop(0.20, 'rgba(215, 250, 255, 0.95)');
      vStreakGrad.addColorStop(0.45, 'rgba(0, 210, 255, 0.65)');
      vStreakGrad.addColorStop(0.75, 'rgba(0, 130, 255, 0.25)');
      vStreakGrad.addColorStop(1.00, 'rgba(0, 50, 200, 0.00)');
    } else {
      vStreakGrad.addColorStop(0.00, '#FFFFFF');
      vStreakGrad.addColorStop(0.30, 'rgba(255, 255, 255, 0.85)');
      vStreakGrad.addColorStop(0.70, 'rgba(255, 255, 255, 0.35)');
      vStreakGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0.00)');
    }

    ctx.fillStyle = vStreakGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(r * coreScale * 0.08, s * (vStreakL * 0.35), tipSway, vEnd);
    ctx.quadraticCurveTo(-r * coreScale * 0.08, s * (vStreakL * 0.35), 0, 0);
    ctx.closePath();
    ctx.fill();

    // Inner bright needle core
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r * coreScale * 0.028, s * (vStreakL * 0.25));
    ctx.lineTo(tipSway * 0.5, vEnd * 0.90);
    ctx.lineTo(-r * coreScale * 0.028, s * (vStreakL * 0.25));
    ctx.closePath();
    ctx.fill();
  }

  // Horizontal Anamorphic Glare Line
  for (let s = -1; s <= 1; s += 2) {
    const tipSwayY = Math.cos(ft * 1.5 + s * 1.5) * (r * 0.035);
    const hEnd = s * hStreakL;

    const hStreakGrad = ctx.createLinearGradient(0, 0, hEnd, tipSwayY);
    if (flareTheme === 'blue') {
      hStreakGrad.addColorStop(0.00, '#FFFFFF');
      hStreakGrad.addColorStop(0.20, 'rgba(215, 250, 255, 0.95)');
      hStreakGrad.addColorStop(0.45, 'rgba(0, 210, 255, 0.65)');
      hStreakGrad.addColorStop(0.75, 'rgba(0, 130, 255, 0.25)');
      hStreakGrad.addColorStop(1.00, 'rgba(0, 50, 200, 0.00)');
    } else {
      hStreakGrad.addColorStop(0.00, '#FFFFFF');
      hStreakGrad.addColorStop(0.30, 'rgba(255, 255, 255, 0.85)');
      hStreakGrad.addColorStop(0.70, 'rgba(255, 255, 255, 0.35)');
      hStreakGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0.00)');
    }

    ctx.fillStyle = hStreakGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(s * (hStreakL * 0.35), r * coreScale * 0.065, hEnd, tipSwayY);
    ctx.quadraticCurveTo(s * (hStreakL * 0.35), -r * coreScale * 0.065, 0, 0);
    ctx.closePath();
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(s * (hStreakL * 0.25), r * coreScale * 0.022);
    ctx.lineTo(hEnd * 0.90, tipSwayY * 0.5);
    ctx.lineTo(s * (hStreakL * 0.25), -r * coreScale * 0.022);
    ctx.closePath();
    ctx.fill();
  }

  // 4. Drifting Stardust Glints along Rays
  for (let p = 0; p < 8; p++) {
    const pProgress = ((ft * 0.12 + p * 0.125) % 1.0);
    const pAngle = (p * 1.414 + ft * 0.04);
    const pDist = r * (0.35 + 1.85 * pProgress);
    const pAlpha = Math.sin(pProgress * Math.PI) * 0.85;
    const pSize = 1.3 + Math.sin(ft * 0.8 + p) * 0.6;

    const px = Math.cos(pAngle) * pDist;
    const py = Math.sin(pAngle) * pDist;

    ctx.fillStyle = (flareTheme === 'blue')
      ? (p % 2 === 0 ? `rgba(180, 240, 255, ${pAlpha})` : `rgba(0, 215, 255, ${pAlpha})`)
      : `rgba(255, 255, 255, ${pAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py, pSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Intense Inner Starlight Core (Zero violet bloom)
  const coreR = r * coreScale * (0.96 + 0.04 * Math.sin(ft * 1.1));
  const innerBloom = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * 1.8);
  if (flareTheme === 'blue') {
    innerBloom.addColorStop(0.00, '#FFFFFF');
    innerBloom.addColorStop(0.30, 'rgba(215, 250, 255, 0.95)');
    innerBloom.addColorStop(0.60, 'rgba(0, 200, 255, 0.50)');
    innerBloom.addColorStop(0.85, 'rgba(0, 110, 255, 0.20)');
    innerBloom.addColorStop(1.00, 'rgba(0, 50, 200, 0.00)');
  } else {
    innerBloom.addColorStop(0.00, '#FFFFFF');
    innerBloom.addColorStop(0.35, 'rgba(255, 255, 255, 0.95)');
    innerBloom.addColorStop(0.70, 'rgba(255, 255, 255, 0.40)');
    innerBloom.addColorStop(1.00, 'rgba(255, 255, 255, 0.00)');
  }

  ctx.fillStyle = innerBloom;
  ctx.beginPath();
  ctx.arc(0, 0, coreR * 1.8, 0, Math.PI * 2);
  ctx.fill();

  // 6. Solid Pure Blinding White Sun Core
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, coreR * 0.60, 0, Math.PI * 2);
  ctx.fill();

  // 7. Central 4-point Diamond Core Rhombus
  const diamondSway = Math.sin(ft * 1.3) * (coreR * 0.05);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(0, -coreR * 1.35 - diamondSway);
  ctx.lineTo(coreR * 0.38 + diamondSway * 0.3, 0);
  ctx.lineTo(0, coreR * 1.35 + diamondSway);
  ctx.lineTo(-coreR * 0.38 - diamondSway * 0.3, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export const NamelessDeity_WEAPON_GRAPHICS = {
  namelessDestroyer: {
    name: 'Nameless Destroyer',
    category: 'Cosmic Superweapon',
    rarity: 'Transcendent',
    description: 'The supreme cosmic death-ray cannon of the Nameless Deity. Fires apocalyptic prismatic laser beams and reality-warping starlight.'
  }
};

/**
 * Draws the Nameless Destroyer weapon resting on the fighter.
 * Full 3D Magic Circle portal, aperture rift, starlight diamond flare and super-beam
 * are handled in dedicated portal overlay and beam renderers.
 */
export function drawNamelessDestroyerWeapon(ctx, fighter) {
  // Portal overlay, beam and starlight flares handle full weapon visualization cleanly.
  return;
}

/**
 * Renders the "Nameless Destroyer" Cosmic Space Super-Beam.
 * Streams the authentic Neon Cosmic Nebula galaxy starfield across the screen with a smooth
 * edge feather and chromatic cyan-magenta celestial bloom perfectly matched to the texture.
 */
export function drawNamelessDestroyerBeam(ctx, fighter, targetAngle, arena) {
  const r = fighter.r || 28;
  const startX = fighter.x;
  const startY = fighter.y;
  const beamLength = (typeof fighter?.destroyerBeamLength === 'number')
    ? fighter.destroyerBeamLength
    : ((typeof CONFIG !== 'undefined' && CONFIG.namelessdeity?.destroyerBeamLength)
      ?? namelessDeityConfig?.destroyerBeamLength
      ?? 1400);

  const fireTimer = fighter.destroyerFireTimer || 0;
  const gameTimer = (typeof state !== 'undefined' && state.gameTime) ? state.gameTime : Date.now() * 0.05;

  const skinVariant = fighter?.skinVariant || (typeof state !== 'undefined' ? (state.selectedNamelessDeitySkin || 'skin1') : 'skin1');
  const isSkin2 = (skinVariant === 'skin2' || skinVariant === 'golden');

  // ──────────────────────────────────────────
  // 1. Broad Volumetric Arena-Wide Cosmic Purple / Azure Illumination & God Rays
  // Bathes the entire arena in luminous celestial starlight (Authentic to reference footage)
  // ──────────────────────────────────────────
  _drawArenaCosmicAmbientDome(ctx, startX, startY, 1150, 1.0, gameTimer, isSkin2);
  _drawArenaGodRays(ctx, startX, startY, 1080, 1.0, gameTimer, isSkin2);
  _drawArenaStardustMotes(ctx, startX, startY, 980, 1.0, gameTimer, isSkin2);

  // Magic circle full visual diameter (enlarged for grand celestial scale)
  const magicCircleDiameter = (typeof fighter?.destroyerMagicCircleDiameter === 'number')
    ? fighter.destroyerMagicCircleDiameter
    : ((typeof CONFIG !== 'undefined' && CONFIG.namelessdeity?.destroyerMagicCircleDiameter)
      ?? namelessDeityConfig?.destroyerMagicCircleDiameter
      ?? 380);
  const portalScaleH = 1.25;
  const depthSquish = 0.38;

  // Exact inner aperture geometry of CosmicLightCircle.png (inner ring at 60% outer radius)
  const innerApertureRatio = 0.60;
  const innerApertureRadius = (magicCircleDiameter * 0.5) * innerApertureRatio; // 114px
  const halfH = innerApertureRadius * portalScaleH; // 142.5px
  const halfW = innerApertureRadius * depthSquish;  // 43.32px
  const totalBeamHeight = Math.ceil(halfH * 2);     // 285px

  ctx.save();
  ctx.translate(startX, startY);
  ctx.rotate(targetAngle); // Local coordinate: beam extends along +X

  // ──────────────────────────────────────────
  // 2. Broad Volumetric Beam Floor Ground Wash along 1400px Trajectory
  // ──────────────────────────────────────────
  ctx.save();
  const washHalfH = 340; // Wide luminous ground wash
  const groundWashGrad = ctx.createLinearGradient(0, -washHalfH, 0, washHalfH);
  if (isSkin2) {
    groundWashGrad.addColorStop(0.00, 'rgba(0, 110, 255, 0.00)');
    groundWashGrad.addColorStop(0.20, 'rgba(0, 180, 255, 0.12)');
    groundWashGrad.addColorStop(0.38, 'rgba(100, 220, 255, 0.28)');
    groundWashGrad.addColorStop(0.50, 'rgba(210, 245, 255, 0.45)');
    groundWashGrad.addColorStop(0.62, 'rgba(100, 220, 255, 0.28)');
    groundWashGrad.addColorStop(0.80, 'rgba(0, 180, 255, 0.12)');
    groundWashGrad.addColorStop(1.00, 'rgba(0, 110, 255, 0.00)');
  } else {
    groundWashGrad.addColorStop(0.00, 'rgba(147, 51, 234, 0.00)');
    groundWashGrad.addColorStop(0.20, 'rgba(168, 85, 247, 0.12)');
    groundWashGrad.addColorStop(0.38, 'rgba(192, 132, 252, 0.28)');
    groundWashGrad.addColorStop(0.50, 'rgba(235, 205, 255, 0.45)');
    groundWashGrad.addColorStop(0.62, 'rgba(192, 132, 252, 0.28)');
    groundWashGrad.addColorStop(0.80, 'rgba(168, 85, 247, 0.12)');
    groundWashGrad.addColorStop(1.00, 'rgba(147, 51, 234, 0.00)');
  }
  ctx.fillStyle = groundWashGrad;
  ctx.fillRect(0, -washHalfH, beamLength, washHalfH * 2);
  ctx.restore();

  // ──────────────────────────────────────────
  // 3. Primary 3D Tilted Magic Circle Ring (Rendered UNDER the flare and beam stream)
  // ──────────────────────────────────────────
  const magicCircle = _getCosmicLightCircleImage();
  if (_isImageReady(magicCircle)) {
    const circleBaseScale = (magicCircleDiameter / (magicCircle.naturalHeight || 900));
    const spinSpeed = (typeof fighter?.destroyerMagicCircleSpinSpeed === 'number')
      ? fighter.destroyerMagicCircleSpinSpeed
      : ((typeof CONFIG !== 'undefined' && CONFIG.namelessdeity?.destroyerMagicCircleSpinSpeed)
        ?? namelessDeityConfig?.destroyerMagicCircleSpinSpeed
        ?? 0.035);
    const circleFadeInFrames = (typeof fighter?.destroyerCircleFadeInFrames === 'number')
      ? fighter.destroyerCircleFadeInFrames
      : ((typeof CONFIG !== 'undefined' && CONFIG.namelessdeity?.destroyerCircleFadeInFrames)
        ?? namelessDeityConfig?.destroyerCircleFadeInFrames
        ?? 60);
    const holdFrames = (typeof fighter?.destroyerHoldFrames === 'number')
      ? fighter.destroyerHoldFrames
      : ((typeof CONFIG !== 'undefined' && CONFIG.namelessdeity?.destroyerHoldFrames)
        ?? namelessDeityConfig?.destroyerHoldFrames
        ?? 20);
    const fireFramesTotal = (typeof fighter?.destroyerFireFrames === 'number')
      ? fighter.destroyerFireFrames
      : ((typeof CONFIG !== 'undefined' && CONFIG.namelessdeity?.destroyerFireFrames)
        ?? namelessDeityConfig?.destroyerFireFrames
        ?? 800);
    const spinAngle = (circleFadeInFrames + holdFrames + (fireFramesTotal - fireTimer)) * spinSpeed;

    ctx.save();
    ctx.scale(depthSquish, portalScaleH);
    ctx.rotate(spinAngle);
    _drawThickMagicCircle(ctx, magicCircle, circleBaseScale, 1.0);
    ctx.restore();
  }

  // ──────────────────────────────────────────
  // 4. Optical Cinematic Sunburst Lens Flare (✦) — Rendered Behind Galaxy Stream
  // ──────────────────────────────────────────
  const starPulse = 1.0;
  _drawDiamondStarFlare(ctx, 0, 0, r * 1.70, starPulse, {
    color: '#FFFFFF',
    haloColor: isSkin2 ? 'rgba(180, 235, 255, 0.90)' : 'rgba(255, 255, 255, 0.75)',
    outerGlowColor: isSkin2 ? 'rgba(0, 180, 255, 0.30)' : 'rgba(255, 255, 255, 0.00)',
    flareTheme: isSkin2 ? 'blue' : 'white',
    vScale: 3.0,
    hScale: 1.6,
    rayCount: 40,
    coreScale: 0.28,
    animSpeed: 0.18
  });

  // ──────────────────────────────────────────
  // 5. 3D Inner Aperture Cavity Shading (Rich cosmic depth behind beam)
  // ──────────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, halfW, halfH, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 7, 30, 0.45)';
  ctx.fill();
  ctx.restore();

  // ──────────────────────────────────────────
  // 6. Soft Alpha-Dissolved Cosmic Space Galaxy Stream (Full Length, Overlays Magic Circle)
  // ──────────────────────────────────────────
  const spaceImg = isSkin2 ? _getBlueBeamTexture2Canvas() : _getCosmicSpaceImage();
  if (_isImageReady(spaceImg)) {
    const bufW = 1400;
    const bufH = totalBeamHeight;
    const { canvas: bCanvas, ctx: bCtx } = _getBeamBuffer(bufW, bufH);

    if (bCtx) {
      bCtx.clearRect(0, 0, bufW, bufH);

      // A. Tile the cosmic space galaxy texture across the entire buffer width with forward streaming motion
      const texW = spaceImg.naturalWidth || 1024;
      const texH = spaceImg.naturalHeight || 1024;
      const scale = bufH / texH;
      const scaledW = texW * scale;
      const scaledH = bufH;
      const scrollSpeed = (typeof fighter?.destroyerScrollSpeed === 'number')
        ? fighter.destroyerScrollSpeed
        : ((typeof CONFIG !== 'undefined' && CONFIG.namelessdeity?.destroyerScrollSpeed)
          ?? namelessDeityConfig?.destroyerScrollSpeed
          ?? 14.0);
      const forwardScrollOffset = (gameTimer * scrollSpeed) % scaledW;

      for (let bx = forwardScrollOffset - scaledW; bx < bufW + scaledW; bx += scaledW) {
        bCtx.drawImage(spaceImg, bx, 0, scaledW, scaledH);
      }

      // B. Crisp Edge Definition with subtle boundary glow (perfect cylinder contact)
      bCtx.globalCompositeOperation = 'destination-in';
      const alphaGrad = bCtx.createLinearGradient(0, 0, 0, bufH);
      alphaGrad.addColorStop(0.00, 'rgba(0, 0, 0, 0.00)');
      alphaGrad.addColorStop(0.015, 'rgba(0, 0, 0, 0.70)');
      alphaGrad.addColorStop(0.035, 'rgba(0, 0, 1.00)');
      alphaGrad.addColorStop(0.965, 'rgba(0, 0, 1.00)');
      alphaGrad.addColorStop(0.985, 'rgba(0, 0, 0, 0.70)');
      alphaGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0.00)');
      bCtx.fillStyle = alphaGrad;
      bCtx.fillRect(0, 0, bufW, bufH);

      bCtx.globalCompositeOperation = 'source-over';

      // C. Clip precisely to the 3D oval opening of the magic circle portal
      ctx.save();
      ctx.beginPath();
      // Curved inner portal ellipse arc from top (0, -halfH) to bottom (0, +halfH)
      for (let a = -Math.PI / 2; a <= Math.PI / 2; a += Math.PI / 16) {
        const ex = -Math.cos(a) * halfW;
        const ey = Math.sin(a) * halfH;
        if (a === -Math.PI / 2) {
          ctx.moveTo(ex, ey);
        } else {
          ctx.lineTo(ex, ey);
        }
      }
      // Extend along cylinder length to +X
      ctx.lineTo(beamLength, halfH);
      ctx.lineTo(beamLength, -halfH);
      ctx.closePath();
      ctx.clip();

      // Blit cosmic galaxy stream seamlessly from aperture interior
      ctx.drawImage(bCanvas, -halfW, -halfH);
      ctx.restore();
    }
  }

  // ──────────────────────────────────────────
  // 7. Drifting Starlight Constellation Sparkles along Beam
  // ──────────────────────────────────────────
  const activeScrollSpeed = (typeof fighter?.destroyerScrollSpeed === 'number')
    ? fighter.destroyerScrollSpeed
    : ((typeof CONFIG !== 'undefined' && CONFIG.namelessdeity?.destroyerScrollSpeed)
      ?? namelessDeityConfig?.destroyerScrollSpeed
      ?? 14.0);

  for (let i = 0; i < 10; i++) {
    const sparkX = ((gameTimer * (activeScrollSpeed * 2.5) + i * 140) % beamLength);
    const sparkY = Math.sin(i * 1.7 + gameTimer * 0.08) * (halfH * 0.55);
    const sparkR = 2.8 + Math.sin(gameTimer * 0.6 + i) * 1.2;
    const isLavender = (i % 2 === 0);

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, sparkR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isSkin2
      ? (isLavender ? 'rgba(180, 235, 255, 0.85)' : 'rgba(0, 210, 255, 0.80)')
      : (isLavender ? 'rgba(216, 180, 254, 0.85)' : 'rgba(168, 85, 247, 0.80)');
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, sparkR * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // Restore beam transform
}

/**
 * Maintained for backwards compatibility.
 * The 3D Magic Circle is now rendered directly in the proper under-beam layer inside drawNamelessDestroyerBeam
 * so the super-beam overlays the magic circle.
 */
export function drawNamelessDestroyerPortalOverlay(ctx, fighter, targetAngle) {
  // Handled directly inside drawNamelessDestroyerBeam to guarantee correct under-beam layering.
  return;
}

/**
 * Renders the authentic 3D Depth Cosmic Light Magic Circle during wind-up charging phase
 * with opening cosmic starry rift, spinning depth rings, and growing diamond starburst flare.
 */
export function drawNamelessDestroyerCharge(ctx, fighter, targetAngle) {
  const r = fighter.r || 28;
  const startX = fighter.x;
  const startY = fighter.y;

  const skinVariant = fighter?.skinVariant || (typeof state !== 'undefined' ? (state.selectedNamelessDeitySkin || 'skin1') : 'skin1');
  const isSkin2 = (skinVariant === 'skin2' || skinVariant === 'golden');

  const flareFrames = (typeof fighter?.destroyerFlareWindupFrames === 'number')
    ? fighter.destroyerFlareWindupFrames
    : ((typeof CONFIG !== 'undefined' && (CONFIG.namelessdeity?.destroyerFlareWindupFrames ?? CONFIG.namelessdeity?.destroyerWindupFrames))
      ?? namelessDeityConfig?.destroyerFlareWindupFrames
      ?? namelessDeityConfig?.destroyerWindupFrames
      ?? 200);

  const circleFadeInFrames = (typeof fighter?.destroyerCircleFadeInFrames === 'number')
    ? fighter.destroyerCircleFadeInFrames
    : ((typeof CONFIG !== 'undefined' && CONFIG.namelessdeity?.destroyerCircleFadeInFrames)
      ?? namelessDeityConfig?.destroyerCircleFadeInFrames
      ?? 60);

  const holdFrames = (typeof fighter?.destroyerHoldFrames === 'number')
    ? fighter.destroyerHoldFrames
    : ((typeof CONFIG !== 'undefined' && CONFIG.namelessdeity?.destroyerHoldFrames)
      ?? namelessDeityConfig?.destroyerHoldFrames
      ?? 20);

  const totalWindup = (typeof fighter?.destroyerWindupMax === 'number' && fighter.destroyerWindupMax > 0)
    ? fighter.destroyerWindupMax
    : (flareFrames + circleFadeInFrames + holdFrames);

  const remaining = fighter.destroyerWindupTimer || 0;
  const elapsed = Math.max(0, totalWindup - remaining);
  const gameTimer = (typeof state !== 'undefined' && state.gameTime) ? state.gameTime : Date.now() * 0.05;

  const magicCircleDiameter = (typeof fighter?.destroyerMagicCircleDiameter === 'number')
    ? fighter.destroyerMagicCircleDiameter
    : ((typeof CONFIG !== 'undefined' && CONFIG.namelessdeity?.destroyerMagicCircleDiameter)
      ?? namelessDeityConfig?.destroyerMagicCircleDiameter
      ?? 380);

  // Phase 1: Pure Flare Wind-Up (0 <= elapsed <= flareFrames)
  // Flare smoothly builds from 0.0 to 1.0 over flareFrames
  const flareProgress = Math.min(1.0, elapsed / Math.max(1, flareFrames));
  const flarePulse = 0.96 + 0.04 * Math.sin(gameTimer * 0.35);

  // 0. Arena-Wide Volumetric Ambient Bloom & God Rays during Flare Wind-Up
  if (flareProgress > 0.02) {
    _drawArenaCosmicAmbientDome(ctx, startX, startY, 860 * flareProgress, flareProgress, gameTimer, isSkin2);
    _drawArenaGodRays(ctx, startX, startY, 800 * flareProgress, flareProgress * 0.85, gameTimer, isSkin2);
    _drawArenaStardustMotes(ctx, startX, startY, 740 * flareProgress, flareProgress, gameTimer, isSkin2);
  }

  ctx.save();
  ctx.translate(startX, startY);
  ctx.rotate(targetAngle); // Aligns the 3D portal perpendicular to the cast vector

  // Magic circle portal dimensions
  const depthSquish = 0.38;
  const portalScaleH = 1.25;

  // Phase 2: Smooth Fade-In of the Magic Circle While Spinning
  // Gated: ONLY starts fading in AFTER elapsed >= flareFrames! (When the flare windup frames are up!)
  let circleAlpha = 0;
  let circleSpinElapsed = 0;
  if (elapsed >= flareFrames && circleFadeInFrames > 0) {
    circleSpinElapsed = elapsed - flareFrames;
    const circleProgress = Math.min(1.0, circleSpinElapsed / circleFadeInFrames);
    // Smooth sinusoidal easing from 0.0 to 1.0
    circleAlpha = Math.sin(circleProgress * Math.PI * 0.5);
  } else if (circleFadeInFrames <= 0 && elapsed >= flareFrames) {
    circleAlpha = 1.0;
    circleSpinElapsed = elapsed - flareFrames;
  }

  if (circleAlpha > 0.005) {
    const magicCircle = _getCosmicLightCircleImage();
    const spinSpeed = (typeof fighter?.destroyerMagicCircleSpinSpeed === 'number')
      ? fighter.destroyerMagicCircleSpinSpeed
      : ((typeof CONFIG !== 'undefined' && CONFIG.namelessdeity?.destroyerMagicCircleSpinSpeed)
        ?? namelessDeityConfig?.destroyerMagicCircleSpinSpeed
        ?? 0.035);
    const spinAngle = circleSpinElapsed * spinSpeed;
    const baseScale = (magicCircleDiameter / (magicCircle?.naturalHeight || 900));
    const circleScale = baseScale;

    if (_isImageReady(magicCircle)) {
      ctx.save();
      ctx.scale(depthSquish, portalScaleH);
      ctx.rotate(spinAngle);
      _drawThickMagicCircle(ctx, magicCircle, circleScale, circleAlpha);
      ctx.restore();
    } else {
      // Geometric Mandala Fallback
      ctx.save();
      ctx.scale(depthSquish, portalScaleH);
      ctx.rotate(spinAngle);
      const ringR = 125;
      ctx.strokeStyle = isSkin2 ? `rgba(180, 235, 255, ${circleAlpha.toFixed(3)})` : `rgba(216, 180, 254, ${circleAlpha.toFixed(3)})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = isSkin2 ? `rgba(0, 190, 255, ${circleAlpha.toFixed(3)})` : `rgba(168, 85, 247, ${circleAlpha.toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, ringR * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Converging 3D Energy Shards / Focus Rays into Portal Center
  if (flareProgress > 0.15) {
    const shardProgress = Math.min(1.0, (flareProgress - 0.15) / 0.85);
    const convergingR = Math.max(10, (1.0 - shardProgress) * 125);
    ctx.save();
    ctx.scale(depthSquish, portalScaleH);
    ctx.strokeStyle = isSkin2
      ? `rgba(180, 235, 255, ${(0.90 * shardProgress).toFixed(3)})`
      : `rgba(255, 255, 255, ${(0.85 * shardProgress).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + gameTimer * 0.06;
      const px = Math.cos(a) * convergingR;
      const py = Math.sin(a) * convergingR;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(0, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Phase 1 (Core): Winding up the Blinding Diamond Star Flare at Center of Aperture
  const starR = r * (0.45 + 1.25 * flareProgress);
  _drawDiamondStarFlare(ctx, 0, 0, starR, flarePulse, {
    color: '#FFFFFF',
    haloColor: isSkin2 ? `rgba(180, 235, 255, ${(0.90 * flareProgress).toFixed(3)})` : `rgba(255, 255, 255, ${(0.80 * flareProgress).toFixed(3)})`,
    outerGlowColor: isSkin2 ? `rgba(0, 180, 255, ${(0.35 * flareProgress).toFixed(3)})` : 'rgba(255, 255, 255, 0.00)',
    flareTheme: isSkin2 ? 'blue' : 'white',
    vScale: 2.8,
    hScale: 1.4,
    coreScale: 0.28,
    animSpeed: 0.18
  });

  ctx.restore(); // Restore main transform
}

/**
 * Weapon Studio preview renderer for Nameless Destroyer with 3D Cosmic Light Magic Circle,
 * CosmicSpaceTexture background, and luminous central diamond star flare.
 */
export function drawNamelessDestroyerPreview(ctx, cx, cy, size = 48) {
  ctx.save();
  ctx.translate(cx, cy);

  const skinVariant = (typeof state !== 'undefined' ? (state.selectedNamelessDeitySkin || 'skin1') : 'skin1');
  const isSkin2 = (skinVariant === 'skin2' || skinVariant === 'golden');

  // Background Cosmic Glow & Space Texture in preview
  const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.7);
  if (isSkin2) {
    glowGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.50)');
    glowGrad.addColorStop(0.3, 'rgba(180, 235, 255, 0.40)');
    glowGrad.addColorStop(0.6, 'rgba(0, 190, 255, 0.25)');
    glowGrad.addColorStop(1.0, 'rgba(0, 80, 220, 0)');
  } else {
    glowGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.45)');
    glowGrad.addColorStop(0.3, 'rgba(216, 180, 254, 0.35)');
    glowGrad.addColorStop(0.6, 'rgba(168, 85, 247, 0.20)');
    glowGrad.addColorStop(1.0, 'rgba(126, 34, 206, 0)');
  }
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2);
  ctx.fill();

  const spaceImg = isSkin2 ? _getBlueBeamTexture2Canvas() : _getCosmicSpaceImage();
  if (_isImageReady(spaceImg)) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = 0.80;
    const spaceScale = (size * 1.4) / (spaceImg.naturalHeight || 1024);
    _drawAtPivot(ctx, spaceImg, 0, 0, spaceScale, spaceScale, 0.5, 0.5);
    ctx.restore();
  }

  const magicCircle = _getCosmicLightCircleImage();
  if (_isImageReady(magicCircle)) {
    ctx.imageSmoothingEnabled = true;
    const scale = (size * 1.95) / (magicCircle.naturalHeight || 900);

    // 3D perspective tilt
    ctx.save();
    ctx.scale(0.60, 1.05);
    ctx.rotate(0.35);
    _drawAtPivot(ctx, magicCircle, 0, 0, scale, scale, 0.5, 0.5);
    ctx.restore();
  } else {
    // Core Prismatic Star Fallback
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = isSkin2 ? '#B4EBFF' : '#D8B4FE';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = isSkin2 ? '#00BEFF' : '#A855F7';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.48, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Central Diamond Starburst Flare in Preview
  _drawDiamondStarFlare(ctx, 0, 0, size * 0.46, 1.0, {
    color: '#FFFFFF',
    haloColor: isSkin2 ? 'rgba(180, 235, 255, 0.90)' : 'rgba(255, 255, 255, 0.80)',
    outerGlowColor: isSkin2 ? 'rgba(0, 180, 255, 0.30)' : 'rgba(255, 255, 255, 0.00)',
    flareTheme: isSkin2 ? 'blue' : 'white',
    vScale: 2.2,
    hScale: 0.95,
    diagScale: 0.70,
    coreScale: 0.32
  });

  // Laser Core Beam Glint in Preview
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-size * 0.45, 0);
  ctx.lineTo(size * 0.45, 0);
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders Nameless Deity's Skill 1: Supercluster Star Mandala.
 * Sacred geometric starlight polygon constellation with 6 orbiting stars,
 * dual counter-rotating BloomFlare halos, and glowing connector rays.
 */
export function drawSuperclusterStarMandala(ctx, fighter) {
  if (!fighter || fighter.hp <= 0) return;

  const isMandalaActive = Boolean(fighter.superclusterActiveTimer && fighter.superclusterActiveTimer > 0);
  const isDetonationActive = Boolean(fighter.superclusterDetonationTimer && fighter.superclusterDetonationTimer > 0);
  if (!isMandalaActive && !isDetonationActive) return;

  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.namelessdeity) ? CONFIG.namelessdeity : namelessDeityConfig;
  const now = Date.now();

  // ──────────────────────────────────────────
  // 1. Orbiting Constellation Mandala Phase
  // ──────────────────────────────────────────
  if (isMandalaActive) {
    const durMax = fighter.superclusterDurationMax || 300;
    const currentTimer = fighter.superclusterActiveTimer;
    const fadeIn = Math.min(1.0, (durMax - currentTimer) / 15 + 0.2);
    const alpha = Math.min(1.0, fadeIn);

    if (alpha > 0.01) {
      const starCount = cfg?.superclusterStarCount || 6;
      const baseOrbitRadius = cfg?.superclusterOrbitRadius || 85;
      let orbitRadius = baseOrbitRadius;
      let whiteHotOverload = 0;

      if (currentTimer < 50) {
        const convergeP = currentTimer / 50; // 1 down to 0
        orbitRadius = baseOrbitRadius * (0.15 + 0.85 * Math.pow(convergeP, 1.8));
        whiteHotOverload = (1.0 - convergeP);
      }

      const orbitAngle = fighter.superclusterOrbitAngle || 0;
      const cx = fighter.x;
      const cy = fighter.y;
      const starPositions = [];

      for (let i = 0; i < starCount; i++) {
        const a = orbitAngle + (i * Math.PI * 2 / starCount);
        const sx = cx + Math.cos(a) * orbitRadius;
        const sy = cy + Math.sin(a) * orbitRadius;
        starPositions.push({ x: sx, y: sy, angle: a });
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // 1A. Sacred Geometric Mandala Polygon Lines connecting each star to next
      ctx.globalAlpha = alpha * (0.55 + whiteHotOverload * 0.45);
      ctx.strokeStyle = whiteHotOverload > 0.5 ? '#FFFFFF' : '#00F0FF';
      ctx.lineWidth = 1.8 + whiteHotOverload * 1.5;
      ctx.beginPath();
      for (let i = 0; i < starCount; i++) {
        const p1 = starPositions[i];
        const p2 = starPositions[(i + 1) % starCount];
        if (i === 0) ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      ctx.closePath();
      ctx.stroke();

      // 1B. Cross-Chord Star Hexagram lines across vertices
      ctx.globalAlpha = alpha * (0.35 + whiteHotOverload * 0.40);
      ctx.strokeStyle = whiteHotOverload > 0.5 ? '#00F0FF' : '#A17FE0';
      ctx.lineWidth = 1.2 + whiteHotOverload * 1.2;
      ctx.beginPath();
      for (let i = 0; i < starCount; i++) {
        const p1 = starPositions[i];
        const p2 = starPositions[(i + 2) % starCount];
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      ctx.stroke();

      // 1C. Central Starlight Rays connecting Deity center to each star
      ctx.globalAlpha = alpha * (0.45 + whiteHotOverload * 0.55);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.0 + whiteHotOverload * 2.0;
      ctx.beginPath();
      for (let i = 0; i < starCount; i++) {
        const p = starPositions[i];
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      // 1D. Draw each of the 6 Orbiting Supercluster Stars
      const starPulse = (1.0 + Math.sin(now * 0.008) * 0.12) * (1.0 + whiteHotOverload * 0.4);
      for (let i = 0; i < starCount; i++) {
        const p = starPositions[i];
        const rot1 = now * 0.005 + i;

        ctx.save();
        ctx.translate(p.x, p.y);

        // BloomFlare Halos
        const haloR = 20 * starPulse;
        const haloGrad1 = ctx.createRadialGradient(0, 0, 1, 0, 0, haloR);
        haloGrad1.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
        haloGrad1.addColorStop(0.35, 'rgba(0, 240, 255, 0.60)');
        haloGrad1.addColorStop(0.80, 'rgba(161, 127, 224, 0.25)');
        haloGrad1.addColorStop(1.0, 'rgba(0, 240, 255, 0.00)');
        ctx.fillStyle = haloGrad1;
        ctx.beginPath();
        ctx.arc(0, 0, haloR, 0, Math.PI * 2);
        ctx.fill();

        // 8-Point Crystalline Diamond Star
        const starR = 12 * starPulse;
        const starH = 3.5;
        ctx.rotate(rot1);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(0, -starR * 1.3);
        ctx.lineTo(starH, 0);
        ctx.lineTo(0, starR * 1.3);
        ctx.lineTo(-starH, 0);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-starR * 1.3, 0);
        ctx.lineTo(0, starH);
        ctx.lineTo(starR * 1.3, 0);
        ctx.lineTo(0, -starH);
        ctx.closePath();
        ctx.fill();

        // Secondary Diagonal Flares
        ctx.fillStyle = '#00F0FF';
        const diagR = starR * 0.75;
        ctx.beginPath();
        ctx.moveTo(-diagR, -diagR);
        ctx.lineTo(starH * 0.7, 0);
        ctx.lineTo(diagR, diagR);
        ctx.lineTo(-starH * 0.7, 0);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(diagR, -diagR);
        ctx.lineTo(0, starH * 0.7);
        ctx.lineTo(-diagR, diagR);
        ctx.lineTo(0, -starH * 0.7);
        ctx.closePath();
        ctx.fill();

        // Pure White-Hot Core Diamond
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      ctx.restore();
    }
  }

  // ──────────────────────────────────────────
  // 2. Supernova Detonation Shockwave & Starburst Blast Phase (Terraria: Wrath of the Gods)
  // ──────────────────────────────────────────
  if (isDetonationActive) {
    const detTimer = fighter.superclusterDetonationTimer || 0;
    const detMax = fighter.superclusterDetonationMax || 30;
    const detP = 1.0 - (detTimer / detMax); // 0.0 (start of blast) -> 1.0 (fully expanded/dissipated)
    const blastX = fighter.superclusterDetonationX ?? fighter.x;
    const blastY = fighter.superclusterDetonationY ?? fighter.y;
    const blastAlpha = Math.max(0, 1.0 - detP);
    const maxBlastRadius = (cfg?.superclusterOrbitRadius || 85) * 2.4; // ~205px blast radius
    const curRadius = maxBlastRadius * Math.sin(detP * Math.PI * 0.5);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(blastX, blastY);

    // 2A. Layer 1: Expanding Solar Fire Plasma Sphere (ExplodingStar.cs FireExplosionShader)
    const fireR = Math.max(16, curRadius * 0.85);
    const fireGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, fireR);
    fireGrad.addColorStop(0.0, `rgba(255, 255, 255, ${(blastAlpha * 0.98).toFixed(3)})`);
    fireGrad.addColorStop(0.20, `rgba(255, 230, 140, ${(blastAlpha * 0.90).toFixed(3)})`);
    fireGrad.addColorStop(0.45, `rgba(255, 120, 30, ${(blastAlpha * 0.70).toFixed(3)})`);
    fireGrad.addColorStop(0.75, `rgba(0, 240, 255, ${(blastAlpha * 0.45).toFixed(3)})`);
    fireGrad.addColorStop(0.92, `rgba(161, 127, 224, ${(blastAlpha * 0.20).toFixed(3)})`);
    fireGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = fireGrad;
    ctx.beginPath();
    ctx.arc(0, 0, fireR, 0, Math.PI * 2);
    ctx.fill();

    // 2B. Layer 2: LightWave Double Shockwave Rings (LightWave.cs)
    ctx.strokeStyle = `rgba(0, 240, 255, ${(blastAlpha * 0.95).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, 6.0 * (1 - detP));
    ctx.beginPath();
    ctx.arc(0, 0, curRadius, 0, Math.PI * 2);
    ctx.stroke();

    if (curRadius > 20) {
      ctx.strokeStyle = `rgba(255, 200, 80, ${(blastAlpha * 0.80).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, 3.5 * (1 - detP));
      ctx.beginPath();
      ctx.arc(0, 0, curRadius * 0.82, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(161, 127, 224, ${(blastAlpha * 0.65).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, 2.5 * (1 - detP));
      ctx.beginPath();
      ctx.arc(0, 0, curRadius * 0.60, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2C. Layer 3: Ejected Flying Prismatic Starburst Shards (Starburst.cs)
    const shardCount = 8;
    const shardDist = curRadius * 1.12;
    const shardAlpha = blastAlpha * 0.95;
    for (let s = 0; s < shardCount; s++) {
      const sAngle = (s * Math.PI * 2 / shardCount) + (detP * 0.6);
      const shardX = Math.cos(sAngle) * shardDist;
      const shardY = Math.sin(sAngle) * shardDist;
      const tailX = Math.cos(sAngle) * (shardDist - 22 * (1 - detP));
      const tailY = Math.sin(sAngle) * (shardDist - 22 * (1 - detP));

      // Shard trailing starlight ray
      ctx.strokeStyle = `rgba(0, 240, 255, ${(shardAlpha * 0.65).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, 3.0 * (1 - detP));
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(shardX, shardY);
      ctx.stroke();

      // Shard diamond head
      ctx.save();
      ctx.translate(shardX, shardY);
      ctx.rotate(sAngle + Math.PI / 4 + detP * 2.5);
      const shSize = Math.max(1, 7.5 * (1 - detP * 0.6));
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-shSize * 0.5, -shSize * 0.5, shSize, shSize);
      ctx.restore();
    }

    // 2D. Layer 4: Radiant 8-Point Starlight Twinkle Diamond Flare (TwinkleParticle.cs)
    const spikeLen = maxBlastRadius * 1.45 * (0.30 + 0.70 * Math.sin(detP * Math.PI * 0.70));
    const spikeThick = Math.max(0.5, 7.5 * (1 - detP));
    const rot = detP * 0.9;

    ctx.save();
    ctx.rotate(rot);
    ctx.fillStyle = `rgba(255, 255, 255, ${(blastAlpha * 0.95).toFixed(3)})`;

    // Major Cardinal Spikes
    ctx.beginPath();
    ctx.moveTo(0, -spikeLen);
    ctx.lineTo(spikeThick, 0);
    ctx.lineTo(0, spikeLen);
    ctx.lineTo(-spikeThick, 0);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-spikeLen, 0);
    ctx.lineTo(0, spikeThick);
    ctx.lineTo(spikeLen, 0);
    ctx.lineTo(0, -spikeThick);
    ctx.closePath();
    ctx.fill();

    // Secondary Diagonal Spikes
    ctx.fillStyle = `rgba(0, 240, 255, ${(blastAlpha * 0.85).toFixed(3)})`;
    const diagLen = spikeLen * 0.72;
    ctx.beginPath();
    ctx.moveTo(-diagLen * 0.707, -diagLen * 0.707);
    ctx.lineTo(spikeThick * 0.7, 0);
    ctx.lineTo(diagLen * 0.707, diagLen * 0.707);
    ctx.lineTo(-spikeThick * 0.7, 0);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(diagLen * 0.707, -diagLen * 0.707);
    ctx.lineTo(0, spikeThick * 0.7);
    ctx.lineTo(-diagLen * 0.707, diagLen * 0.707);
    ctx.lineTo(0, -spikeThick * 0.7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }
}

