// CRAZY DAVE WEAPONS & PLANT VISUALS (Plants vs. Zombies)
// Authentic Discrete Pixel Art Aesthetics & Multi-Frame Animated Plant Sprite Sheets
// Adheres strictly to: 100% Balanced Canvas 2D Stacks, Zero shadowBlur (Rule 2.2)

import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { getHandSize } from '../../core/config.js';

const PLANT_VISUAL_SCALE = 0.92;

// Pre-computed Sprite Frame Bounding Boxes
export const PEASHOOTER_IDLE_RECTS = [
  { sx: 15,   sy: 218, sw: 370, sh: 358 },
  { sx: 459,  sy: 193, sw: 358, sh: 379 },
  { sx: 861,  sy: 230, sw: 362, sh: 348 },
  { sx: 1288, sy: 206, sw: 346, sh: 373 },
  { sx: 1697, sy: 231, sw: 364, sh: 349 },
];

export const PEASHOOTER_SHOOT_RECTS = [
  { sx: 11,   sy: 185, sw: 441, sh: 426 },
  { sx: 547,  sy: 172, sw: 475, sh: 440 },
  { sx: 1069, sy: 177, sw: 545, sh: 435 },
  { sx: 1619, sy: 189, sw: 537, sh: 421 },
];

export const SNOWPEA_IDLE_RECTS = [
  { sx: 27,   sy: 145, sw: 459, sh: 494 },
  { sx: 565,  sy: 158, sw: 456, sh: 481 },
  { sx: 1066, sy: 116, sw: 461, sh: 518 },
  { sx: 1635, sy: 165, sw: 476, sh: 473 },
];

export const SNOWPEA_SHOOT_RECTS = [
  { sx: 37,   sy: 127, sw: 443, sh: 487 },
  { sx: 543,  sy: 116, sw: 471, sh: 499 },
  { sx: 1027, sy: 118, sw: 542, sh: 497 },
  { sx: 1625, sy: 116, sw: 522, sh: 499 },
];

export const PEA_PROJ_RECTS = [
  { sx: 12,   sy: 43, sw: 181, sh: 179 },
  { sx: 347,  sy: 40, sw: 204, sh: 199 },
  { sx: 704,  sy: 39, sw: 198, sh: 197 },
  { sx: 1080, sy: 36, sw: 204, sh: 200 },
  { sx: 1436, sy: 19, sw: 212, sh: 213 },
];

export const SNOWPEA_PROJ_RECTS = [
  { sx: 53,   sy: 39, sw: 196, sh: 195 },
  { sx: 401,  sy: 30, sw: 206, sh: 202 },
  { sx: 761,  sy: 30, sw: 208, sh: 209 },
  { sx: 1130, sy: 24, sw: 210, sh: 214 },
  { sx: 1491, sy: 17, sw: 222, sh: 222 },
];

export const WALLNUT_RECTS = [
  { sx: 12,   sy: 194, sw: 294, sh: 356 }, // Frame 0: Healthy & Alert
  { sx: 342,  sy: 181, sw: 298, sh: 369 }, // Frame 1: Slight shell crack
  { sx: 675,  sy: 181, sw: 303, sh: 369 }, // Frame 2: Minor shell fracture
  { sx: 1012, sy: 181, sw: 304, sh: 369 }, // Frame 3: Moderate crack / Sad face
  { sx: 1342, sy: 168, sw: 392, sh: 382 }, // Frame 4: Heavy break / Shell chunks falling
  { sx: 1778, sy: 194, sw: 381, sh: 408 }, // Frame 5: Severe crumble into pile
];

export const TORCHWOOD_RECTS = [
  { sx: 15,   sy: 207, sw: 273, sh: 405 }, // Frame 0: Burning idle
  { sx: 361,  sy: 174, sw: 269, sh: 438 }, // Frame 1: Flame flicker A
  { sx: 725,  sy: 176, sw: 269, sh: 435 }, // Frame 2: Flame flicker B
  { sx: 1080, sy: 179, sw: 274, sh: 433 }, // Frame 3: Flame flicker C
  { sx: 1453, sy: 218, sw: 272, sh: 394 }, // Frame 4: Flame dip
  { sx: 1810, sy: 174, sw: 272, sh: 438 }, // Frame 5: Flame flicker D
];

export const FIRE_PEA_RECTS = [
  { sx: 13,  sy: 50, sw: 244, sh: 180 }, // Frame 0: Compact fireball burst
  { sx: 344, sy: 43, sw: 291, sh: 193 }, // Frame 1: Extended flame tongue
  { sx: 699, sy: 26, sw: 327, sh: 216 }, // Frame 2: Blazing roaring fireball
];

export const FIRE_PEA_FRAME_SEQUENCE = [0, 1, 2, 2, 1, 0];

export const LAWNMOWER_RECTS = [
  { sx: 13,   sy: 218, sw: 345, sh: 302 }, // Frame 0: Idle parked
  { sx: 372,  sy: 218, sw: 341, sh: 302 }, // Frame 1: Blade spin A
  { sx: 749,  sy: 218, sw: 342, sh: 301 }, // Frame 2: Blade spin B
  { sx: 1099, sy: 218, sw: 340, sh: 301 }, // Frame 3: Blade spin C
  { sx: 1450, sy: 218, sw: 345, sh: 301 }, // Frame 4: Blade spin D
  { sx: 1807, sy: 218, sw: 341, sh: 301 }, // Frame 5: Blade spin E
];

export const POTATO_MINE_RECTS = [
  { sx: 28,   sy: 274, sw: 241, sh: 230 }, // Frame 0: Idle alert (unarmed)
  { sx: 281,  sy: 274, sw: 236, sh: 230 }, // Frame 1: Idle blink (unarmed)
  { sx: 529,  sy: 274, sw: 235, sh: 229 }, // Frame 2: Armed idle (ready to blow)
  { sx: 776,  sy: 247, sw: 237, sh: 259 }, // Frame 3: Triggered! Sparking fuse flash
  { sx: 1044, sy: 267, sw: 292, sh: 244 }, // Frame 4: Explosion start (SPUDOW burst)
  { sx: 1358, sy: 269, sw: 299, sh: 254 }, // Frame 5: Explosion mid (debris scatter)
  { sx: 1665, sy: 316, sw: 244, sh: 207 }, // Frame 6: Explosion end (settling mash)
  { sx: 1923, sy: 344, sw: 235, sh: 179 }, // Frame 7: Aftermath (fading remnants)
];

// Lazy-loaded sprite images
let _wallnutImg = null;
let _torchwoodImg = null;
let _peashooterIdleImg = null;
let _peashooterShootImg = null;
let _snowPeaIdleImg = null;
let _snowPeaShootImg = null;
let _peaProjImg = null;
let _snowPeaProjImg = null;
let _sunEconomyImg = null;

function _loadPlantImage(src, current) {
  if (current && current.complete && current.naturalWidth > 0) return current;
  if (typeof Image === 'undefined') return null;
  const img = new Image();
  img.src = encodeURI(src);
  return img;
}

export function getSunSprite() {
  if (!_sunEconomyImg) _sunEconomyImg = _loadPlantImage('Assets/model/crazyDave/Sun-economy-sprite.png', _sunEconomyImg);
  return _sunEconomyImg;
}

export function getPeashooterIdleSprite() {
  if (!_peashooterIdleImg) _peashooterIdleImg = _loadPlantImage('Assets/model/crazyDave/Peashooter-sprite-sheet.png', _peashooterIdleImg);
  return _peashooterIdleImg;
}

export function getPeashooterShootSprite() {
  if (!_peashooterShootImg) _peashooterShootImg = _loadPlantImage('Assets/model/crazyDave/peashooter-about2shoot-sprite-sheet.png', _peashooterShootImg);
  return _peashooterShootImg;
}

export function getSnowPeaIdleSprite() {
  if (!_snowPeaIdleImg) _snowPeaIdleImg = _loadPlantImage('Assets/model/crazyDave/Snowpea-sprite-sheet.png', _snowPeaIdleImg);
  return _snowPeaIdleImg;
}

export function getSnowPeaShootSprite() {
  if (!_snowPeaShootImg) _snowPeaShootImg = _loadPlantImage('Assets/model/crazyDave/snowpea-about2shoot-sprite-sheet.png', _snowPeaShootImg);
  return _snowPeaShootImg;
}

export function getPeaProjSprite() {
  if (!_peaProjImg) _peaProjImg = _loadPlantImage('Assets/model/crazyDave/Peashooter-projectile.png', _peaProjImg);
  return _peaProjImg;
}

export function getSnowPeaProjSprite() {
  if (!_snowPeaProjImg) _snowPeaProjImg = _loadPlantImage('Assets/model/crazyDave/snowpea-projectile.png', _snowPeaProjImg);
  return _snowPeaProjImg;
}

export function getWallnutSprite() {
  if (!_wallnutImg) _wallnutImg = _loadPlantImage('Assets/model/crazyDave/Wallnut-sprite-sheet.png', _wallnutImg);
  return _wallnutImg;
}

export function getTorchwoodSprite() {
  if (!_torchwoodImg) _torchwoodImg = _loadPlantImage('Assets/model/crazyDave/torchwood-sprite-sheet.png', _torchwoodImg);
  return _torchwoodImg;
}

let _firePeaProjImg = null;

export function getFirePeaProjSprite() {
  if (!_firePeaProjImg) _firePeaProjImg = _loadPlantImage('Assets/model/Sprites/Six-Frame Pixel Fireball Animation.png', _firePeaProjImg);
  return _firePeaProjImg;
}

let _lawnmowerImg = null;

export function getLawnmowerSprite() {
  if (!_lawnmowerImg) _lawnmowerImg = _loadPlantImage('Assets/model/crazyDave/lawnmower-sprite-sheet.png', _lawnmowerImg);
  return _lawnmowerImg;
}

let _potatoMineImg = null;

export function getPotatoMineSprite() {
  if (!_potatoMineImg) _potatoMineImg = _loadPlantImage('Assets/model/crazyDave/potato-mine-sprite-sheet.png', _potatoMineImg);
  return _potatoMineImg;
}

// Preload on startup
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getSunSprite();
  getWallnutSprite();
  getTorchwoodSprite();
  getFirePeaProjSprite();
  getLawnmowerSprite();
  getPeashooterIdleSprite();
  getPeashooterShootSprite();
  getSnowPeaIdleSprite();
  getSnowPeaShootSprite();
  getPeaProjSprite();
  getSnowPeaProjSprite();
  getPotatoMineSprite();
}

import { state } from '../../core/state.js';

export const CrazyDave_WEAPON_GRAPHICS = {
  shovel: {
    name: 'Garden Shovel',
    id: 'crazydave_shovel',
    category: 'Gardening / Melee',
    desc: 'Crazy Dave\'s trusty high-carbon steel garden trowel/shovel with an ergonomic walnut D-grip and sharpened spade scoop.',
    handleWood: '#78350F',
    handleHighlight: '#D97706',
    collarSteel: '#475569',
    bladeSteel: '#94A3B8',
    bladeHighlight: '#FFFFFF',
    dirtLoam: '#451A03'
  },
  positioning: {
    offsetX: 0,
    offsetY: 0,
    scale: 1.0,
    angleOffset: 0
  }
};

/**
 * Draws Crazy Dave's Shovel in 100% discrete Pixel Art style.
 * Features an authentic walnut D-grip, grained wooden shaft, reinforced steel socket,
 * and a faceted metallic spade scoop with subtle PvZ gardener earth stains.
 */
export function drawCrazyDaveShovel(
  ctx,
  x = 0,
  y = 0,
  angle = 0,
  r = 25,
  facingRight = true,
  swingTimer = 0,
  isStowed = false,
  color = '#84CC16',
  shouldHideHands = false
) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  const custom = (!isStowed && typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.crazydave)
    ? state.weaponCustomizations.crazydave
    : null;
  const customOffsetX = custom?.offsetX || 0;
  const customOffsetY = custom?.offsetY || 0;
  const customScale = custom?.scale ?? 1.0;
  const customAngle = custom?.angleOffset || 0;

  ctx.save();
  ctx.translate(x + customOffsetX, y + customOffsetY);
  if (angle !== 0 || customAngle !== 0) ctx.rotate(angle + customAngle);
  if (customScale !== 1.0) ctx.scale(customScale, customScale);

  // Position shovel relative to character body scale
  const scale = (r / 25) * 0.95;
  ctx.scale(scale, scale);

  // 1. D-GRIP HANDLE (X: 0..8, Y: -7..7)
  // Outer Manga Dark Ink Outline (#0E0F14)
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(0, -7, 3, 14);
  ctx.fillRect(2, -8, 6, 3);
  ctx.fillRect(2, 5, 6, 3);
  ctx.fillRect(6, -4, 2, 8);

  // Deep Mahogany Base (#451A03)
  ctx.fillStyle = '#451A03';
  ctx.fillRect(1, -6, 2, 12);

  // Rich Walnut Wood Body (#78350F)
  ctx.fillStyle = '#78350F';
  ctx.fillRect(2, -6, 4, 2);
  ctx.fillRect(2, 4, 4, 2);
  ctx.fillRect(1, -4, 1, 8);

  // Amber Wood Grain Highlights (#B45309 / #D97706)
  ctx.fillStyle = '#B45309';
  ctx.fillRect(2, -7, 4, 1);
  ctx.fillRect(1, -5, 1, 5);
  ctx.fillStyle = '#FEF08A'; // Specular top glint
  ctx.fillRect(3, -7, 2, 1);

  // 2. WOODEN SHAFT (X: 7..37, Y: -3..3)
  // Top & Bottom Manga Ink Borders
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(7, -3, 30, 1);
  ctx.fillRect(7, 2, 30, 1);

  // Walnut Wood Core (#78350F)
  ctx.fillStyle = '#78350F';
  ctx.fillRect(7, -2, 30, 4);

  // Upper Wood Grain Highlight (#B45309)
  ctx.fillStyle = '#B45309';
  ctx.fillRect(7, -2, 30, 1);

  // Tactile Grain Streaks (#D97706 & #9A3412)
  ctx.fillStyle = '#D97706';
  ctx.fillRect(12, -2, 5, 1);
  ctx.fillRect(22, -2, 7, 1);
  ctx.fillRect(32, -2, 3, 1);
  ctx.fillStyle = '#9A3412';
  ctx.fillRect(16, -1, 4, 1);
  ctx.fillRect(27, -1, 4, 1);

  // Underside Shadow Band (#451A03)
  ctx.fillStyle = '#451A03';
  ctx.fillRect(7, 1, 30, 1);

  // 3. REINFORCED STEEL SOCKET COLLAR (X: 36..42, Y: -5..5)
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(36, -5, 6, 10);

  ctx.fillStyle = '#334155'; // Dark Parkerized Steel
  ctx.fillRect(37, -4, 4, 8);

  // Socket Upper Chamfer Highlight (#64748B & #E2E8F0)
  ctx.fillStyle = '#64748B';
  ctx.fillRect(37, -4, 4, 2);
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(38, -4, 2, 1);

  // Hardened Rivet Pin
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(38, -1, 2, 2);
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(38, -1, 1, 1);

  // 4. METALLIC STEEL SPADE SCOOP HEAD (X: 42..66, Y: -9..9)
  // Step 4a: Outer Dark Manga Ink Shell (#0E0F14)
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(42, -9, 8, 2);
  ctx.fillRect(42, 7, 8, 2);
  ctx.fillRect(50, -8, 6, 2);
  ctx.fillRect(50, 6, 6, 2);
  ctx.fillRect(55, -6, 5, 2);
  ctx.fillRect(55, 4, 5, 2);
  ctx.fillRect(59, -4, 4, 2);
  ctx.fillRect(59, 2, 4, 2);
  ctx.fillRect(62, -2, 3, 2);
  ctx.fillRect(62, 0, 3, 2);
  ctx.fillRect(65, -1, 2, 2); // Pointed Spade Tip

  // Step 4b: Polished Slate Steel Base Body (#94A3B8)
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(42, -7, 8, 14);
  ctx.fillRect(50, -6, 6, 12);
  ctx.fillRect(55, -4, 5, 8);
  ctx.fillRect(59, -2, 4, 4);
  ctx.fillRect(62, -1, 3, 2);

  // Step 4c: Concave Dish / Hollow Depth Shadow (#475569 & #334155)
  ctx.fillStyle = '#475569';
  ctx.fillRect(44, -4, 6, 8);
  ctx.fillRect(51, -2, 4, 4);
  ctx.fillStyle = '#334155';
  ctx.fillRect(45, -2, 4, 4);

  // Step 4d: Specular Blade Ridge & Top Edge Glint (#CBD5E1, #E2E8F0, #FFFFFF)
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(43, -7, 6, 2);
  ctx.fillStyle = '#FFFFFF'; // Pure Specular Highlight
  ctx.fillRect(43, -7, 4, 1);
  ctx.fillRect(50, -6, 4, 1);
  ctx.fillRect(55, -4, 3, 1);
  ctx.fillRect(59, -2, 2, 1);

  // Central Spine Ridge
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(52, -1, 7, 1);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(55, 0, 6, 1);

  // Step 4e: Underside Bevel Shadow (#1E293B)
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(43, 5, 6, 2);
  ctx.fillRect(50, 4, 4, 2);
  ctx.fillRect(55, 2, 3, 2);

  // Step 4f: PvZ Gardener Soil & Lawn Grass Stains on Edge
  ctx.fillStyle = '#78350F'; // Earthy Loam
  ctx.fillRect(61, 0, 2, 1);
  ctx.fillRect(58, 2, 2, 1);
  ctx.fillStyle = '#451A03'; // Deep Soil
  ctx.fillRect(63, -1, 2, 1);
  ctx.fillStyle = '#15803D'; // Grass Stain
  ctx.fillRect(53, 5, 2, 1);

  // 5. HAND GRIP (When rendered standalone or in preview)
  if (!shouldHideHands) {
    const handRadius = getHandSize(4.0);
    drawPixelHand(ctx, 22, 0, handRadius, '#FFE0BD', '#0E0F14');
  }

  ctx.restore();
}

/**
 * Draws an authentic discrete Pixel Art Sun drop on the arena floor using Sun-economy-sprite.png.
 */
export function drawSunDrop(ctx, sun) {
  if (!sun) return;
  const x = sun.x || 0;
  const y = sun.y || 0;
  const r = sun.r || 30;
  const pulse = sun.pulse || (Math.sin(Date.now() * 0.006) * 1.5);
  const rotAngle = sun.rotAngle || (Date.now() * 0.002);

  ctx.save();
  ctx.translate(x, y);

  const bloomRadius = r * 1.85 + pulse;
  const bloom = ctx.createRadialGradient(0, 0, r * 0.12, 0, 0, bloomRadius);
  bloom.addColorStop(0, 'rgba(255, 250, 205, 0.42)');
  bloom.addColorStop(0.38, 'rgba(255, 205, 45, 0.20)');
  bloom.addColorStop(1, 'rgba(255, 174, 0, 0)');
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(0, 0, bloomRadius, 0, Math.PI * 2);
  ctx.fill();

  const sunImg = getSunSprite();
  const hasImg = Boolean(sunImg && sunImg.complete && sunImg.naturalWidth > 0);

  // 1. Soft Warm Ambient Pixel Halo Ring (Zero shadowBlur - Rule 2.2)
  const P = 2.0;
  ctx.fillStyle = 'rgba(254, 240, 138, 0.22)';
  const haloR = r + 4 + pulse;
  const haloSteps = Math.ceil(haloR / P);
  for (let gy = -haloSteps; gy <= haloSteps; gy++) {
    for (let gx = -haloSteps; gx <= haloSteps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist >= r + 2 && dist <= haloR) {
        ctx.fillRect(gx * P - P / 2, gy * P - P / 2, P, P);
      }
    }
  }

  // 2. Render Official Sun Sprite or Procedural Pixel Fallback
  if (hasImg) {
    ctx.save();
    ctx.rotate(rotAngle);
    ctx.imageSmoothingEnabled = false;
    const drawSize = r * 2.45 + (pulse * 0.8);
    ctx.drawImage(sunImg, 0, 0, sunImg.naturalWidth, sunImg.naturalHeight, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    ctx.restore();
  } else {
    _drawProceduralPixelSun(ctx, r, pulse, rotAngle);
  }

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const lightRadius = r * 1.15;
  const lighting = ctx.createRadialGradient(-r * 0.34, -r * 0.42, 0, -r * 0.12, -r * 0.12, lightRadius);
  lighting.addColorStop(0, 'rgba(255, 255, 238, 0.50)');
  lighting.addColorStop(0.42, 'rgba(255, 240, 160, 0.17)');
  lighting.addColorStop(1, 'rgba(255, 220, 90, 0)');
  ctx.fillStyle = lighting;
  ctx.beginPath();
  ctx.arc(0, 0, lightRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/**
 * Procedural pixel art sun fallback
 */
function _drawProceduralPixelSun(ctx, r, pulse, rotAngle) {
  const P = 2.0;

  // Rotating Ray Petals
  ctx.save();
  ctx.rotate(rotAngle);
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const perpX = -sinA;
    const perpY = cosA;

    const tipDist = r + 6 + (pulse * 0.5);
    const baseDist = r - 2;

    for (let d = baseDist; d <= tipDist; d += P) {
      const t = (d - baseDist) / (tipDist - baseDist);
      const halfW = (1.0 - t * 0.75) * 2.8;

      for (let w = -halfW; w <= halfW; w += 1.0) {
        const px = Math.round(cosA * d + perpX * w);
        const py = Math.round(sinA * d + perpY * w);

        const isTip = t > 0.8;
        const isEdge = Math.abs(w) >= halfW - 0.8;

        let col = '#FBBF24'; // Warm Gold
        if (isTip || isEdge) col = '#B45309';
        else if (t < 0.4) col = '#FDE047';

        ctx.fillStyle = col;
        ctx.fillRect(px - P / 2, py - P / 2, P, P);
      }
    }
  }
  ctx.restore();

  // Central Sun Disk
  const steps = Math.ceil((r + P) / P);
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = Math.round(rx - P / 2);
      const py = Math.round(ry - P / 2);

      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );

      if (isBorder) {
        ctx.fillStyle = '#78350F';
      } else if (rx >= -r * 0.55 && rx <= -r * 0.25 && ry >= -r * 0.55 && ry <= -r * 0.25) {
        ctx.fillStyle = '#FFFFFF';
      } else if (rx < 0 && ry < 0 && dist < r * 0.75) {
        ctx.fillStyle = '#FEF08A';
      } else if (rx > r * 0.35 || ry > r * 0.35) {
        ctx.fillStyle = '#EAB308';
      } else {
        ctx.fillStyle = '#FACC15';
      }

      ctx.fillRect(px, py, P, P);
    }
  }
}

// High-performance reusable offscreen buffer for sprite silhouette hit-flashes (Zero GC / Rule 2.2 compliant)
let _plantFlashCanvas = null;
let _plantFlashCtx = null;

function _getPlantFlashBuffer(width, height) {
  if (typeof document === 'undefined') return null;
  if (!_plantFlashCanvas) {
    _plantFlashCanvas = document.createElement('canvas');
    _plantFlashCtx = _plantFlashCanvas.getContext('2d', { willReadFrequently: false });
  }
  const targetW = Math.max(64, Math.ceil(width));
  const targetH = Math.max(64, Math.ceil(height));
  if (_plantFlashCanvas.width < targetW || _plantFlashCanvas.height < targetH) {
    _plantFlashCanvas.width = Math.max(_plantFlashCanvas.width || 0, targetW);
    _plantFlashCanvas.height = Math.max(_plantFlashCanvas.height || 0, targetH);
  }
  return { canvas: _plantFlashCanvas, ctx: _plantFlashCtx };
}

/**
 * Renders a sprite frame with an exact-silhouette white hit-flash overlay when damaged.
 * Avoids generic circle overlays by alpha-masking the flash to the non-transparent sprite pixels.
 */
export function drawSpriteWithHitFlash(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh, isHit, flashAlpha = 0.85) {
  if (!img) return;
  if (!isHit || flashAlpha <= 0) {
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    return;
  }

  // Exact-silhouette white hit-flash:
  // 1. Draw sprite frame into isolated offscreen buffer
  // 2. Use source-atop to fill non-transparent pixels with pure white
  // 3. Blit flash-tinted sprite to main canvas with pristine alpha edges
  const buf = _getPlantFlashBuffer(dw, dh);
  if (buf && buf.ctx) {
    const bCtx = buf.ctx;
    const w = Math.ceil(dw);
    const h = Math.ceil(dh);

    bCtx.clearRect(0, 0, w, h);
    bCtx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    bCtx.save();
    bCtx.globalCompositeOperation = 'source-atop';
    bCtx.fillStyle = `rgba(255, 255, 255, ${flashAlpha.toFixed(2)})`;
    bCtx.fillRect(0, 0, w, h);
    bCtx.restore();

    ctx.drawImage(buf.canvas, 0, 0, w, h, dx, dy, dw, dh);
  } else {
    // Fallback if canvas buffer unavailable
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }
}

/**
 * Draws an animated green Peashooter turret using the official sprite sheets.
 */
export function drawPeashooter(ctx, peashooter) {
  if (!peashooter) return;
  const x = peashooter.x || 0;
  const y = peashooter.y || 0;
  const r = peashooter.r || 18;
  const angle = peashooter.gunAngle || peashooter.angle || 0;
  const isFacingLeft = (peashooter.facingDirection === -1) || (Math.abs(angle) > Math.PI / 2);
  const isHit = peashooter.hitFlashTimer > 0;
  const drawSize = r * 2.6;

  const idleImg = getPeashooterIdleSprite();
  const hasIdle = Boolean(idleImg && idleImg.complete && idleImg.naturalWidth > 0);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(PLANT_VISUAL_SCALE, PLANT_VISUAL_SCALE);

  // Ground leaf base shadow
  ctx.beginPath();
  ctx.ellipse(0, r * 0.7, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
  ctx.fill();

  // Horizontal flip if facing left
  if (isFacingLeft) {
    ctx.scale(-1, 1);
  }

  // 1. Continuous Animated Sprite Frame
  if (hasIdle) {
    const tick = peashooter.animTick || 0;
    const frameIdx = Math.floor(tick / 8) % PEASHOOTER_IDLE_RECTS.length;
    const frame = PEASHOOTER_IDLE_RECTS[frameIdx] || PEASHOOTER_IDLE_RECTS[0];
    const flashAlpha = isHit ? Math.min(0.90, (peashooter.hitFlashTimer / 6) * 0.90) : 0;
    drawSpriteWithHitFlash(
      ctx,
      idleImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawSize * 0.5, -drawSize * 0.8, drawSize, drawSize,
      isHit,
      flashAlpha
    );
  }
  // 2. High-Quality Procedural Fallback
  else {
    _drawProceduralPeashooter(ctx, r, isHit, 0);
  }

  ctx.restore();
}

/**
 * Draws an animated icy Snow Pea turret using the official sprite sheets.
 */
export function drawSnowPea(ctx, snowpea) {
  if (!snowpea) return;
  const x = snowpea.x || 0;
  const y = snowpea.y || 0;
  const r = snowpea.r || 18;
  const angle = snowpea.gunAngle || snowpea.angle || 0;
  const isFacingLeft = (snowpea.facingDirection === -1) || (Math.abs(angle) > Math.PI / 2);
  const isHit = snowpea.hitFlashTimer > 0;
  const drawSize = r * 2.6;

  const idleImg = getSnowPeaIdleSprite();
  const hasIdle = Boolean(idleImg && idleImg.complete && idleImg.naturalWidth > 0);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(PLANT_VISUAL_SCALE, PLANT_VISUAL_SCALE);

  // Ground frost shadow
  ctx.beginPath();
  ctx.ellipse(0, r * 0.7, r * 0.95, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(14, 116, 144, 0.42)';
  ctx.fill();

  // Horizontal flip if facing left
  if (isFacingLeft) {
    ctx.scale(-1, 1);
  }

  // 1. Continuous Animated Sprite Frame
  if (hasIdle) {
    const tick = snowpea.animTick || 0;
    const frameIdx = Math.floor(tick / 8) % SNOWPEA_IDLE_RECTS.length;
    const frame = SNOWPEA_IDLE_RECTS[frameIdx] || SNOWPEA_IDLE_RECTS[0];
    const flashAlpha = isHit ? Math.min(0.90, (snowpea.hitFlashTimer / 6) * 0.90) : 0;
    drawSpriteWithHitFlash(
      ctx,
      idleImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawSize * 0.5, -drawSize * 0.8, drawSize, drawSize,
      isHit,
      flashAlpha
    );
  }
  // 2. High-Quality Procedural Fallback
  else {
    _drawProceduralSnowPea(ctx, r, isHit, 0);
  }

  ctx.restore();
}

/**
 * Procedural fallback for Peashooter
 */
function _drawProceduralPeashooter(ctx, r, isHit, shootTimer) {
  // Leaf Skirt
  ctx.fillStyle = isHit ? '#FFFFFF' : '#15803D';
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const leafAngle = (i * Math.PI) / 2 + Math.PI / 4;
    ctx.save();
    ctx.rotate(leafAngle);
    ctx.beginPath();
    ctx.ellipse(r * 0.7, 0, r * 0.4, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Stem
  ctx.fillStyle = isHit ? '#FFFFFF' : '#22C55E';
  ctx.fillRect(-2.5, -r * 0.6, 5, r * 0.7);
  ctx.strokeRect(-2.5, -r * 0.6, 5, r * 0.7);

  // Head
  ctx.fillStyle = isHit ? '#FFFFFF' : '#4ADE80';
  ctx.beginPath();
  ctx.arc(0, -r * 0.5, r * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Snout
  const snoutLen = r * 0.65 + (shootTimer > 0 ? 3 : 0);
  ctx.fillStyle = isHit ? '#FFFFFF' : '#22C55E';
  ctx.fillRect(r * 0.2, -r * 0.75, snoutLen, r * 0.5);
  ctx.strokeRect(r * 0.2, -r * 0.75, snoutLen, r * 0.5);
}

/**
 * Procedural fallback for Snow Pea
 */
function _drawProceduralSnowPea(ctx, r, isHit, shootTimer) {
  // Leaf Skirt
  ctx.fillStyle = isHit ? '#FFFFFF' : '#0E7490';
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const leafAngle = (i * Math.PI) / 2 + Math.PI / 4;
    ctx.save();
    ctx.rotate(leafAngle);
    ctx.beginPath();
    ctx.ellipse(r * 0.7, 0, r * 0.4, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Stem
  ctx.fillStyle = isHit ? '#FFFFFF' : '#06B6D4';
  ctx.fillRect(-2.5, -r * 0.6, 5, r * 0.7);
  ctx.strokeRect(-2.5, -r * 0.6, 5, r * 0.7);

  // Ice Crystals on Head Back
  ctx.fillStyle = '#E0F2FE';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.8 + i * 5);
    ctx.lineTo(-r * 1.0, -r * 0.9 + i * 5);
    ctx.lineTo(-r * 0.6, -r * 0.6 + i * 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Head
  ctx.fillStyle = isHit ? '#FFFFFF' : '#38BDF8'; // Icy Sky Blue
  ctx.beginPath();
  ctx.arc(0, -r * 0.5, r * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Snout
  const snoutLen = r * 0.65 + (shootTimer > 0 ? 3 : 0);
  ctx.fillStyle = isHit ? '#FFFFFF' : '#0284C7';
  ctx.fillRect(r * 0.2, -r * 0.75, snoutLen, r * 0.5);
  ctx.strokeRect(r * 0.2, -r * 0.75, snoutLen, r * 0.5);
}

/**
 * Draws an animated / degrading Wall-nut defense barrier using the official sprite sheet.
 * Frames degrade smoothly based on remaining HP ratio across 6 damage stages.
 */
export function drawWallnut(ctx, wallnut) {
  if (!wallnut) return;
  const x = wallnut.x || 0;
  const y = wallnut.y || 0;
  const r = wallnut.r || 24;
  const angle = wallnut.gunAngle || wallnut.angle || 0;
  const isFacingLeft = (wallnut.facingDirection === -1) || (Math.abs(angle) > Math.PI / 2);
  const isHit = wallnut.hitFlashTimer > 0;
  const hpRatio = Math.max(0, Math.min(1, (wallnut.hp || 0) / (wallnut.maxHp || 1)));

  // Calculate damage stage: 6 stages (0: 100-83%, 1: 83-66%, 2: 66-50%, 3: 50-33%, 4: 33-16%, 5: 16-0%)
  let frameIdx = 0;
  if (hpRatio <= 0.166) frameIdx = 5;
  else if (hpRatio <= 0.333) frameIdx = 4;
  else if (hpRatio <= 0.500) frameIdx = 3;
  else if (hpRatio <= 0.666) frameIdx = 2;
  else if (hpRatio <= 0.833) frameIdx = 1;
  else frameIdx = 0;

  const drawSize = r * 2.8;
  const wallnutImg = getWallnutSprite();
  const hasImg = Boolean(wallnutImg && wallnutImg.complete && wallnutImg.naturalWidth > 0);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(PLANT_VISUAL_SCALE, PLANT_VISUAL_SCALE);

  // Ground soil shadow
  ctx.beginPath();
  ctx.ellipse(0, r * 0.72, r * 1.05, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
  ctx.fill();

  // Horizontal flip if facing left
  if (isFacingLeft) {
    ctx.scale(-1, 1);
  }

  // Hit vibration bob
  const hitShakeY = isHit ? -2 : 0;

  if (hasImg) {
    const frame = WALLNUT_RECTS[frameIdx] || WALLNUT_RECTS[0];
    const aspect = frame.sw / (frame.sh || 1);
    const drawHeight = drawSize;
    const drawWidth = drawHeight * aspect;
    const flashAlpha = isHit ? Math.min(0.90, (wallnut.hitFlashTimer / 6) * 0.90) : 0;
    drawSpriteWithHitFlash(
      ctx,
      wallnutImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawWidth * 0.5, -drawHeight * 0.82 + hitShakeY, drawWidth, drawHeight,
      isHit,
      flashAlpha
    );
  } else {
    _drawProceduralWallnut(ctx, r, isHit, hpRatio);
  }

  ctx.restore();
}

/**
 * Procedural fallback for Wall-nut in case sprite sheet is loading or missing.
 */
function _drawProceduralWallnut(ctx, r, isHit, hpRatio) {
  const baseColor = isHit ? '#FFFFFF' : '#A16207';
  const highlightColor = isHit ? '#FFFFFF' : '#CA8A04';
  const shadowColor = isHit ? '#E2E8F0' : '#78350F';
  const outlineColor = '#0E0F14';

  ctx.save();
  // Draw walnut egg-shaped shell
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.2, r * 0.85, r * 1.05, 0, 0, Math.PI * 2);
  ctx.fillStyle = baseColor;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = outlineColor;
  ctx.stroke();

  // Shell highlight
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, -r * 0.45, r * 0.45, r * 0.65, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = highlightColor;
  ctx.fill();

  // Shell shading bottom
  ctx.beginPath();
  ctx.ellipse(r * 0.2, r * 0.35, r * 0.5, r * 0.4, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = shadowColor;
  ctx.fill();

  // Eyes (Classic PvZ Wallnut eyes)
  if (hpRatio > 0.33) {
    const eyeY = -r * 0.25;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(-r * 0.22, eyeY, r * 0.22, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(r * 0.22, eyeY, r * 0.22, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0E0F14';
    ctx.beginPath();
    ctx.arc(-r * 0.15, eyeY, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.29, eyeY, r * 0.11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-r * 0.17, eyeY - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.27, eyeY - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, eyeY + r * 0.42, r * 0.15, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else {
    const eyeY = -r * 0.2;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(-r * 0.22, eyeY, r * 0.20, r * 0.24, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(r * 0.22, eyeY, r * 0.20, r * 0.24, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0E0F14';
    ctx.beginPath();
    ctx.arc(-r * 0.20, eyeY + 2, r * 0.10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.20, eyeY + 2, r * 0.10, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, eyeY + r * 0.52, r * 0.16, Math.PI + 0.3, -0.3);
    ctx.stroke();
  }

  // Crack lines if damaged
  if (hpRatio <= 0.66) {
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.0);
    ctx.lineTo(-r * 0.15, -r * 0.6);
    ctx.lineTo(r * 0.1, -r * 0.45);
    ctx.stroke();
  }
  if (hpRatio <= 0.33) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.65, -r * 0.3);
    ctx.lineTo(-r * 0.4, -r * 0.1);
    ctx.lineTo(-r * 0.55, r * 0.2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws a kinetic green Pea projectile using Peashooter-projectile.png.
 */
export function drawPeaBullet(ctx, p) {
  if (!p) return;
  const x = p.x || 0;
  const y = p.y || 0;
  const r = p.r || 6.0;

  const isFrozen = Boolean(p.isFrozenByInfinity || (p.infinityFreezeTimer && p.infinityFreezeTimer > 0));
  const freezeTimer = p.infinityFreezeTimer || 0;
  const fadeAlpha = (isFrozen && freezeTimer < 30 && freezeTimer > 0) ? Math.max(0, freezeTimer / 30) : 1.0;

  const projImg = getPeaProjSprite();
  const hasImg = Boolean(projImg && projImg.complete && projImg.naturalWidth > 0);

  ctx.save();
  ctx.globalAlpha = fadeAlpha;
  ctx.translate(x, y);

  if (isFrozen) {
    // Electric Limitless Infinity Stasis Halo
    const freezeHalo = ctx.createRadialGradient(0, 0, 1, 0, 0, r + 8);
    freezeHalo.addColorStop(0.0, 'rgba(0, 229, 255, 0.90)');
    freezeHalo.addColorStop(0.45, 'rgba(56, 189, 248, 0.45)');
    freezeHalo.addColorStop(1.0, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = freezeHalo;
    ctx.beginPath();
    ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
    ctx.fill();

    // Solid Frozen Ice-Blue Pea Core
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Specular icy highlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.35, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (hasImg) {
    const frameIdx = Math.floor(Math.abs(p.life || 0) / 3) % PEA_PROJ_RECTS.length;
    const frame = PEA_PROJ_RECTS[frameIdx] || PEA_PROJ_RECTS[0];
    const size = r * 2.4;
    ctx.drawImage(projImg, frame.sx, frame.sy, frame.sw, frame.sh, -size / 2, -size / 2, size, size);
  } else {
    // Glowing Pea Sphere Fallback
    const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, r + 4);
    halo.addColorStop(0, 'rgba(134, 239, 172, 0.7)');
    halo.addColorStop(1, 'rgba(34, 197, 94, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#065F46';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.35, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws an icy cyan Snow Pea projectile using snowpea-projectile.png.
 */
export function drawSnowPeaBullet(ctx, p) {
  if (!p) return;
  const x = p.x || 0;
  const y = p.y || 0;
  const r = p.r || 6.0;

  const isFrozen = Boolean(p.isFrozenByInfinity || (p.infinityFreezeTimer && p.infinityFreezeTimer > 0));
  const freezeTimer = p.infinityFreezeTimer || 0;
  const fadeAlpha = (isFrozen && freezeTimer < 30 && freezeTimer > 0) ? Math.max(0, freezeTimer / 30) : 1.0;

  const projImg = getSnowPeaProjSprite();
  const hasImg = Boolean(projImg && projImg.complete && projImg.naturalWidth > 0);

  ctx.save();
  ctx.globalAlpha = fadeAlpha;
  ctx.translate(x, y);

  if (isFrozen) {
    // Electric Limitless Cyan Stasis Halo
    const freezeHalo = ctx.createRadialGradient(0, 0, 1, 0, 0, r + 9);
    freezeHalo.addColorStop(0.0, 'rgba(0, 229, 255, 0.95)');
    freezeHalo.addColorStop(0.5, 'rgba(56, 189, 248, 0.50)');
    freezeHalo.addColorStop(1.0, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = freezeHalo;
    ctx.beginPath();
    ctx.arc(0, 0, r + 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#0369A1';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.35, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
  } else if (hasImg) {
    const frameIdx = Math.floor(Math.abs(p.life || 0) / 3) % SNOWPEA_PROJ_RECTS.length;
    const frame = SNOWPEA_PROJ_RECTS[frameIdx] || SNOWPEA_PROJ_RECTS[0];
    const size = r * 2.4;
    ctx.drawImage(projImg, frame.sx, frame.sy, frame.sw, frame.sh, -size / 2, -size / 2, size, size);
  } else {
    // Chilling Frost Halo Fallback
    const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, r + 5);
    halo.addColorStop(0, 'rgba(186, 230, 253, 0.8)');
    halo.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)');
    halo.addColorStop(1, 'rgba(2, 132, 199, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38BDF8'; // Vivid Ice Blue
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#0369A1';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.35, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws an animated blazing Torchwood stump using the official sprite sheet.
 * Fire-topped tree stump that ignites passing Peashooter peas and melts Snow Pea peas.
 */
export function drawTorchwood(ctx, torchwood) {
  if (!torchwood) return;
  const x = torchwood.x || 0;
  const y = torchwood.y || 0;
  const r = torchwood.r || 22;
  const angle = torchwood.gunAngle || torchwood.angle || 0;
  const isFacingLeft = (torchwood.facingDirection === -1) || (Math.abs(angle) > Math.PI / 2);
  const isHit = torchwood.hitFlashTimer > 0;
  // Scaled up to authentic robust PvZ tree stump proportions (height ~85px, width ~57px)
  const drawHeight = r * 3.85;

  const torchImg = getTorchwoodSprite();
  const hasImg = Boolean(torchImg && torchImg.complete && torchImg.naturalWidth > 0);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(PLANT_VISUAL_SCALE, PLANT_VISUAL_SCALE);

  // Warm ambient fire glow centered on the upper flaming crown (Zero shadowBlur - Rule 2.2)
  const glowRadius = r * 2.8;
  const fireGlow = ctx.createRadialGradient(0, -drawHeight * 0.45, r * 0.25, 0, -drawHeight * 0.45, glowRadius);
  fireGlow.addColorStop(0, 'rgba(251, 146, 60, 0.32)');
  fireGlow.addColorStop(0.45, 'rgba(249, 115, 22, 0.14)');
  fireGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');
  ctx.fillStyle = fireGlow;
  ctx.beginPath();
  ctx.arc(0, -drawHeight * 0.45, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // Ground ember shadow underneath tree stump roots
  ctx.beginPath();
  ctx.ellipse(0, r * 0.72, r * 1.25, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(120, 53, 15, 0.45)';
  ctx.fill();

  // Horizontal flip if facing left
  if (isFacingLeft) {
    ctx.scale(-1, 1);
  }

  // Hit vibration bob
  const hitShakeY = isHit ? -2 : 0;

  if (hasImg) {
    const tick = torchwood.animTick || 0;
    const frameIdx = Math.floor(tick / 7) % TORCHWOOD_RECTS.length;
    const frame = TORCHWOOD_RECTS[frameIdx] || TORCHWOOD_RECTS[0];
    const aspect = frame.sw / (frame.sh || 1);
    const drawWidth = drawHeight * aspect;
    const flashAlpha = isHit ? Math.min(0.90, (torchwood.hitFlashTimer / 6) * 0.90) : 0;
    drawSpriteWithHitFlash(
      ctx,
      torchImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawWidth * 0.5, -drawHeight * 0.82 + hitShakeY, drawWidth, drawHeight,
      isHit,
      flashAlpha
    );
  } else {
    _drawProceduralTorchwood(ctx, r, isHit);
  }

  ctx.restore();
}

/**
 * Procedural fallback for Torchwood in case sprite sheet is loading or missing.
 */
function _drawProceduralTorchwood(ctx, r, isHit) {
  const stumpColor = isHit ? '#FFFFFF' : '#78350F';
  const barkColor = isHit ? '#FFFFFF' : '#92400E';
  const outlineColor = '#0E0F14';

  ctx.save();
  ctx.scale(1.35, 1.35);

  // Tree stump body
  ctx.beginPath();
  ctx.moveTo(-r * 0.65, -r * 0.3);
  ctx.lineTo(-r * 0.55, r * 0.7);
  ctx.lineTo(r * 0.55, r * 0.7);
  ctx.lineTo(r * 0.65, -r * 0.3);
  ctx.closePath();
  ctx.fillStyle = stumpColor;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = outlineColor;
  ctx.stroke();

  // Bark texture highlight
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.1);
  ctx.lineTo(-r * 0.35, r * 0.5);
  ctx.lineTo(r * 0.0, r * 0.5);
  ctx.lineTo(r * 0.05, -r * 0.1);
  ctx.closePath();
  ctx.fillStyle = barkColor;
  ctx.fill();

  // Roots
  ctx.fillStyle = isHit ? '#FFFFFF' : '#451A03';
  ctx.beginPath();
  ctx.ellipse(-r * 0.5, r * 0.65, r * 0.35, r * 0.18, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(r * 0.45, r * 0.65, r * 0.3, r * 0.15, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Fire flames on top
  const flameColors = ['#FDE047', '#FBBF24', '#F97316', '#EA580C'];
  for (let i = 0; i < 5; i++) {
    const flameX = (i - 2) * r * 0.28;
    const flameH = r * (0.6 + Math.random() * 0.5);
    ctx.beginPath();
    ctx.moveTo(flameX - r * 0.12, -r * 0.3);
    ctx.quadraticCurveTo(flameX + Math.random() * 4 - 2, -r * 0.3 - flameH, flameX + r * 0.12, -r * 0.3);
    ctx.closePath();
    ctx.fillStyle = flameColors[i % flameColors.length];
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws an animated blazing Fire Pea projectile (ignited by Torchwood).
 * Uses Six-Frame Pixel Fireball Animation.png sprite sheet with 6-stage frame sequence.
 */
export function drawFirePeaBullet(ctx, p) {
  if (!p) return;
  const x = p.x || 0;
  const y = p.y || 0;
  const r = p.r || 6.0;

  const isFrozen = Boolean(p.isFrozenByInfinity || (p.infinityFreezeTimer && p.infinityFreezeTimer > 0));
  const freezeTimer = p.infinityFreezeTimer || 0;
  const fadeAlpha = (isFrozen && freezeTimer < 30 && freezeTimer > 0) ? Math.max(0, freezeTimer / 30) : 1.0;

  // Determine trajectory angle
  let angle = 0;
  if (p.angle !== undefined) {
    angle = p.angle;
  } else if (p.vx !== undefined && p.vy !== undefined && (p.vx !== 0 || p.vy !== 0)) {
    angle = Math.atan2(p.vy, p.vx);
  }

  const projImg = getFirePeaProjSprite();
  const hasImg = Boolean(projImg && projImg.complete && projImg.naturalWidth > 0);

  ctx.save();
  ctx.globalAlpha = fadeAlpha;
  ctx.translate(x, y);

  if (isFrozen) {
    // Limitless Stasis Ambient Halo in Radiant Electric Cyan
    const haloR = r + 10;
    const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, haloR);
    halo.addColorStop(0, 'rgba(0, 229, 255, 0.90)');
    halo.addColorStop(0.35, 'rgba(56, 189, 248, 0.55)');
    halo.addColorStop(0.7, 'rgba(2, 132, 199, 0.25)');
    halo.addColorStop(1, 'rgba(2, 132, 199, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, haloR, 0, Math.PI * 2);
    ctx.fill();

    // Solid Frozen Cyan Core
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Glint
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.35, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Fiery ambient halo (Zero shadowBlur - Rule 2.2)
    const haloR = r + 8;
    const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, haloR);
    halo.addColorStop(0, 'rgba(251, 191, 36, 0.85)');
    halo.addColorStop(0.35, 'rgba(249, 115, 22, 0.5)');
    halo.addColorStop(0.7, 'rgba(239, 68, 68, 0.2)');
    halo.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, haloR, 0, Math.PI * 2);
    ctx.fill();

    // Rotate to align with trajectory
    ctx.rotate(angle);

    if (hasImg) {
      // 6-step animated pulse cycle (2 frames per step)
      const tick = (p.animTick !== undefined) ? p.animTick : (p.life !== undefined ? Math.abs(1000 - p.life) : 0);
      const stepIdx = Math.floor(tick / 2) % FIRE_PEA_FRAME_SEQUENCE.length;
      const frameIdx = FIRE_PEA_FRAME_SEQUENCE[stepIdx];
      const frame = FIRE_PEA_RECTS[frameIdx] || FIRE_PEA_RECTS[0];

      const aspect = frame.sw / (frame.sh || 1);
      const drawHeight = r * 4.4;
      const drawWidth = drawHeight * aspect;

      // Flip horizontally so the round fireball head leads forward (+X) and flame trail trails behind (-X)
      ctx.scale(-1, 1);

      // In the raw sprite, the head center is around 26% from the left edge.
      // Offsetting X by -drawWidth * 0.26 anchors the head center precisely at (0, 0).
      ctx.drawImage(
        projImg,
        frame.sx, frame.sy, frame.sw, frame.sh,
        -drawWidth * 0.26, -drawHeight * 0.5, drawWidth, drawHeight
      );
    } else {
      _drawProceduralFirePeaBullet(ctx, r);
    }
  }

  ctx.restore();
}

/**
 * Procedural fallback for Fire Pea bullet in case sprite sheet is loading or missing.
 */
function _drawProceduralFirePeaBullet(ctx, r) {
  const coreGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r);
  coreGrad.addColorStop(0, '#FEF08A');
  coreGrad.addColorStop(0.3, '#FBBF24');
  coreGrad.addColorStop(0.65, '#F97316');
  coreGrad.addColorStop(1, '#DC2626');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#7C2D12';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.35, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draws an authentic Plants vs. Zombies Lawnmower.
 * Sits parked at the baseline while idle, and spins blades with engine vibration when charging.
 */
export function drawLawnmower(ctx, mower) {
  if (!mower) return;
  const x = mower.x || 0;
  const y = mower.y || 0;
  const r = mower.r || 18;
  const isFacingLeft = (mower.facingDirection === -1);
  const isCharging = (mower.state === 'charging');
  const drawHeight = r * 2.7;

  const mowerImg = getLawnmowerSprite();
  const hasImg = Boolean(mowerImg && mowerImg.complete && mowerImg.naturalWidth > 0);

  ctx.save();
  ctx.translate(x, y);

  // Ground wheel shadow
  ctx.beginPath();
  ctx.ellipse(0, r * 0.65, r * 1.35, r * 0.38, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
  ctx.fill();

  // Flip if facing left
  if (isFacingLeft) {
    ctx.scale(-1, 1);
  }

  // Engine vibration when active / charging
  const shakeY = isCharging ? ((mower.animTick % 2 === 0) ? -1.5 : 1.5) : 0;

  if (hasImg) {
    const frameIdx = isCharging ? (Math.floor((mower.animTick || 0) / 3) % LAWNMOWER_RECTS.length) : 0;
    const frame = LAWNMOWER_RECTS[frameIdx] || LAWNMOWER_RECTS[0];
    const aspect = frame.sw / (frame.sh || 1);
    const drawWidth = drawHeight * aspect;
    const isHit = (mower.hitFlashTimer || 0) > 0;
    const flashAlpha = isHit ? Math.min(0.90, (mower.hitFlashTimer / 6) * 0.90) : 0;
    drawSpriteWithHitFlash(
      ctx,
      mowerImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawWidth * 0.5, -drawHeight * 0.78 + shakeY, drawWidth, drawHeight,
      isHit,
      flashAlpha
    );
  } else {
    _drawProceduralLawnmower(ctx, r, isCharging);
  }

  // Speed lines behind mower when charging
  if (isCharging) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(-r * 2.2, -r * 0.2, r * 0.8, 2);
    ctx.fillRect(-r * 2.6, r * 0.2, r * 1.0, 1.5);
  }

  ctx.restore();
}

/**
 * Procedural fallback for Lawnmower.
 */
function _drawProceduralLawnmower(ctx, r, isCharging) {
  const redColor = '#DC2626';
  const darkRed = '#991B1B';
  const metalColor = '#CBD5E1';
  const wheelColor = '#1E293B';
  const outlineColor = '#0E0F14';

  ctx.save();
  // Chassis
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(-r * 0.8, -r * 0.5, r * 1.6, r * 0.85, 4);
  } else {
    ctx.rect(-r * 0.8, -r * 0.5, r * 1.6, r * 0.85);
  }
  ctx.fillStyle = redColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Engine block
  ctx.fillStyle = metalColor;
  ctx.fillRect(-r * 0.2, -r * 0.8, r * 0.8, r * 0.4);
  ctx.strokeRect(-r * 0.2, -r * 0.8, r * 0.8, r * 0.4);

  // Handle
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.3);
  ctx.lineTo(-r * 1.4, -r * 1.0);
  ctx.lineTo(-r * 1.2, -r * 1.2);
  ctx.stroke();

  // Wheels
  ctx.fillStyle = wheelColor;
  ctx.beginPath();
  ctx.arc(-r * 0.6, r * 0.45, r * 0.32, 0, Math.PI * 2);
  ctx.arc(r * 0.6, r * 0.45, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.restore();
}

/**
 * Wrapper for Weapon Studio & standalone rendering.
 */
export function drawCrazyDaveWeapon(ctx, options = {}) {
  const x = options.x || 0;
  const y = options.y || 0;
  const angle = options.angle || 0;
  const r = options.r || 25;
  const color = options.color || '#84CC16';

  drawCrazyDaveShovel(ctx, x, y, angle, r, true, 0, false, color, false);
}

// ─────────────────────────────────────────────────────────────────────────────
// POTATO MINE RENDERER (Sprite Sheet + Procedural Fallback)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draws an animated Potato Mine plant using the official sprite sheet.
 * Shows different frames based on arming state and explosion phase.
 *
 * Frame mapping:
 *   - Frames 0-1: Unarmed idle (cycling blink animation)
 *   - Frame 2: Armed and ready (glowing red detonator)
 *   - Frame 3: Triggered fuse spark
 *   - Frames 4-7: Explosion sequence (SPUDOW!)
 */
export function drawPotatoMine(ctx, mine) {
  if (!mine) return;
  const x = mine.x || 0;
  const y = mine.y || 0;
  const r = mine.r || 20;
  const isHit = mine.hitFlashTimer > 0;
  const drawSize = r * 2.8;

  const spriteImg = getPotatoMineSprite();
  const hasSprite = Boolean(spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(PLANT_VISUAL_SCALE, PLANT_VISUAL_SCALE);

  // Ground dirt shadow
  ctx.beginPath();
  ctx.ellipse(0, r * 0.65, r * 0.85, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(60, 30, 10, 0.45)';
  ctx.fill();

  // Determine which sprite frame to use based on mine state
  let frameIdx = 0;
  if (mine.isExploding) {
    // Explosion sequence: frames 3-7 over the explosion duration
    const explodeProg = mine.explodeAnimProgress || 0; // 0.0 to 1.0
    if (explodeProg < 0.1) {
      frameIdx = 3; // Triggered fuse flash
    } else if (explodeProg < 0.35) {
      frameIdx = 4; // Explosion start
    } else if (explodeProg < 0.60) {
      frameIdx = 5; // Explosion mid
    } else if (explodeProg < 0.85) {
      frameIdx = 6; // Explosion end
    } else {
      frameIdx = 7; // Aftermath remnants
    }
  } else if (mine.isArmed) {
    // Armed: use frame 2 (armed idle with glowing detonator)
    frameIdx = 2;
  } else {
    // Unarmed: cycle between frames 0 and 1
    const tick = mine.animTick || 0;
    frameIdx = Math.floor(tick / 20) % 2;
  }

  if (hasSprite) {
    // Render dynamic explosion aura and shockwave behind sprite when detonating
    if (mine.isExploding) {
      _drawPotatoMineExplosionVFX(ctx, r, mine.explodeAnimProgress || 0);
    }

    const frame = POTATO_MINE_RECTS[frameIdx] || POTATO_MINE_RECTS[0];
    const flashAlpha = isHit ? Math.min(0.90, (mine.hitFlashTimer / 6) * 0.90) : 0;
    const explosionScale = mine.isExploding ? 1.6 : 1.0;
    const dw = drawSize * explosionScale;
    const dh = drawSize * explosionScale;
    drawSpriteWithHitFlash(
      ctx,
      spriteImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -dw * 0.5, -dh * 0.7, dw, dh,
      isHit,
      flashAlpha
    );
  } else {
    // Procedural fallback
    _drawProceduralPotatoMine(ctx, r, mine.isArmed, mine.isExploding, isHit, mine.explodeAnimProgress || 0);
  }

  ctx.restore();
}

/**
 * Dynamic multi-layer explosion visual effect for Potato Mine ("SPUDOW!").
 * Renders expanding fireball bursts, comic starburst spikes, ground dirt blast puffs, and flying potato shards.
 * Strictly 0 shadowBlur (Rule 2.2) and 100% balanced Canvas 2D stack (Rule 2.4).
 */
function _drawPotatoMineExplosionVFX(ctx, r, explodeProg) {
  const p = Math.max(0, Math.min(1.0, explodeProg));
  const alpha = Math.max(0, 1.0 - p);
  if (alpha <= 0.001) return;

  // ── 1. Ground Dirt Eruption Puffs (Base Layer) ──
  const dirtAlpha = (alpha * 0.85).toFixed(3);
  ctx.fillStyle = `rgba(92, 51, 23, ${dirtAlpha})`;
  ctx.beginPath();
  ctx.ellipse(-r * 0.8 * (1 + p * 0.5), r * 0.4, r * 0.6 * (1 + p * 0.4), r * 0.35, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.8 * (1 + p * 0.5), r * 0.4, r * 0.6 * (1 + p * 0.4), r * 0.35, 0, 0, Math.PI * 2);
  ctx.ellipse(0, r * 0.5, r * 0.9 * (1 + p * 0.6), r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── 2. Comic-Style 10-Point Jagged Starburst Shockwave ──
  const spikeCount = 10;
  const starR = r * (1.4 + p * 2.2);
  const starAlpha = (alpha * 0.90).toFixed(3);
  ctx.fillStyle = `rgba(255, 102, 0, ${starAlpha})`;
  ctx.beginPath();
  for (let i = 0; i < spikeCount * 2; i++) {
    const angle = (i * Math.PI) / spikeCount + (p * 0.15);
    const radius = (i % 2 === 0) ? starR : starR * 0.52;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius * 0.85 - r * 0.2; // slight perspective squish
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // ── 3. Concentric Multi-Tier Fireball Core ──
  // Outer fiery orange blast
  const outerR = r * (1.1 + p * 1.6);
  ctx.fillStyle = `rgba(255, 140, 0, ${(alpha * 0.95).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(0, -r * 0.25, outerR, 0, Math.PI * 2);
  ctx.fill();

  // Mid golden solar burst
  const midR = r * (0.75 + p * 1.1);
  ctx.fillStyle = `rgba(255, 220, 0, ${(alpha * 0.98).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(0, -r * 0.25, midR, 0, Math.PI * 2);
  ctx.fill();

  // Inner superheated white flash core
  const coreAlpha = Math.max(0, (1.0 - p * 2.2)).toFixed(3);
  if (parseFloat(coreAlpha) > 0.01) {
    const innerR = r * (0.45 + p * 0.6);
    ctx.fillStyle = `rgba(255, 255, 255, ${coreAlpha})`;
    ctx.beginPath();
    ctx.arc(0, -r * 0.25, innerR, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 4. Flying Golden Potato Tuber Shards ──
  const chunkCount = 6;
  const chunkAlpha = (alpha * 0.95).toFixed(3);
  ctx.fillStyle = `rgba(245, 158, 11, ${chunkAlpha})`;
  ctx.strokeStyle = `rgba(14, 15, 20, ${chunkAlpha})`;
  ctx.lineWidth = 1.0;
  for (let k = 0; k < chunkCount; k++) {
    const chunkAngle = (k / chunkCount) * Math.PI * 2 + 0.35;
    const chunkDist = r * (0.8 + p * 2.6);
    const cx = Math.cos(chunkAngle) * chunkDist;
    const cy = Math.sin(chunkAngle) * chunkDist * 0.75 - (p * r * 1.4); // upward trajectory
    const cSize = Math.max(2, r * 0.18 * (1 - p * 0.4));

    ctx.beginPath();
    ctx.rect(cx - cSize * 0.5, cy - cSize * 0.5, cSize, cSize);
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * Procedural fallback for Potato Mine when sprite sheet is unavailable.
 */
function _drawProceduralPotatoMine(ctx, r, isArmed, isExploding, isHit, explodeProg = 0) {
  const bodyColor = isHit ? '#FFFFFF' : '#B8860B';
  const dirtColor = isHit ? '#FFFFFF' : '#5C3317';
  const outlineColor = '#0E0F14';

  if (isExploding) {
    _drawPotatoMineExplosionVFX(ctx, r, explodeProg);
    return;
  }

  // Dirt mound base
  ctx.beginPath();
  ctx.ellipse(0, r * 0.4, r * 1.0, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = dirtColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Potato body (dome shape)
  ctx.beginPath();
  ctx.arc(0, -r * 0.1, r * 0.7, 0, Math.PI * 2);
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Red detonator cap on top
  const capColor = isArmed ? '#FF0000' : '#CC4444';
  ctx.beginPath();
  ctx.arc(0, -r * 0.75, r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = isHit ? '#FFFFFF' : capColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Glint on detonator cap
  if (isArmed) {
    ctx.beginPath();
    ctx.arc(-r * 0.06, -r * 0.82, r * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
}
