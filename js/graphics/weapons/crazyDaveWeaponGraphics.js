// CRAZY DAVE WEAPONS & PLANT VISUALS (Plants vs. Zombies)
// Authentic Discrete Pixel Art Aesthetics & Multi-Frame Animated Plant Sprite Sheets
// Adheres strictly to: 100% Balanced Canvas 2D Stacks, Zero shadowBlur (Rule 2.2)

import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { getHandSize } from '../../core/config.js';

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

// Lazy-loaded sprite images
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
  if (!_sunEconomyImg) _sunEconomyImg = _loadPlantImage('Assets/model/Sprites/Sun-economy-sprite.png', _sunEconomyImg);
  return _sunEconomyImg;
}

export function getPeashooterIdleSprite() {
  if (!_peashooterIdleImg) _peashooterIdleImg = _loadPlantImage('Assets/model/Sprites/Peashooter-sprite-sheet.png', _peashooterIdleImg);
  return _peashooterIdleImg;
}

export function getPeashooterShootSprite() {
  if (!_peashooterShootImg) _peashooterShootImg = _loadPlantImage('Assets/model/Sprites/peashooter-about2shoot-sprite-sheet.png', _peashooterShootImg);
  return _peashooterShootImg;
}

export function getSnowPeaIdleSprite() {
  if (!_snowPeaIdleImg) _snowPeaIdleImg = _loadPlantImage('Assets/model/Sprites/Snowpea-sprite-sheet.png', _snowPeaIdleImg);
  return _snowPeaIdleImg;
}

export function getSnowPeaShootSprite() {
  if (!_snowPeaShootImg) _snowPeaShootImg = _loadPlantImage('Assets/model/Sprites/snowpea-about2shoot-sprite-sheet.png', _snowPeaShootImg);
  return _snowPeaShootImg;
}

export function getPeaProjSprite() {
  if (!_peaProjImg) _peaProjImg = _loadPlantImage('Assets/model/Sprites/Peashooter-projectile.png', _peaProjImg);
  return _peaProjImg;
}

export function getSnowPeaProjSprite() {
  if (!_snowPeaProjImg) _snowPeaProjImg = _loadPlantImage('Assets/model/Sprites/snowpea-projectile.png', _snowPeaProjImg);
  return _snowPeaProjImg;
}

// Preload on startup
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getSunSprite();
  getPeashooterIdleSprite();
  getPeashooterShootSprite();
  getSnowPeaIdleSprite();
  getSnowPeaShootSprite();
  getPeaProjSprite();
  getSnowPeaProjSprite();
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
    ctx.drawImage(
      idleImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawSize * 0.5, -drawSize * 0.8, drawSize, drawSize
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
    ctx.drawImage(
      idleImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawSize * 0.5, -drawSize * 0.8, drawSize, drawSize
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
 * Draws a kinetic green Pea projectile using Peashooter-projectile.png.
 */
export function drawPeaBullet(ctx, p) {
  if (!p) return;
  const x = p.x || 0;
  const y = p.y || 0;
  const r = p.r || 6.0;

  const projImg = getPeaProjSprite();
  const hasImg = Boolean(projImg && projImg.complete && projImg.naturalWidth > 0);

  ctx.save();
  ctx.translate(x, y);

  if (hasImg) {
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

  const projImg = getSnowPeaProjSprite();
  const hasImg = Boolean(projImg && projImg.complete && projImg.naturalWidth > 0);

  ctx.save();
  ctx.translate(x, y);

  if (hasImg) {
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
