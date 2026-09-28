// CRAZY DAVE WEAPONS & PLANT VISUALS (Plants vs. Zombies)
// Authentic Discrete Pixel Art Aesthetics & Multi-Frame Animated Plant Sprite Sheets
// Adheres strictly to: 100% Balanced Canvas 2D Stacks, Zero shadowBlur (Rule 2.2)

import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { getHandSize } from '../../core/config.js';

// Pre-computed Sprite Frame Bounding Boxes
export const PEASHOOTER_IDLE_RECTS = [
  { sx: 14,   sy: 218, sw: 371, sh: 358 },
  { sx: 456,  sy: 193, sw: 361, sh: 380 },
  { sx: 858,  sy: 230, sw: 368, sh: 348 },
  { sx: 1288, sy: 206, sw: 347, sh: 550 },
  { sx: 1697, sy: 231, sw: 368, sh: 525 },
];

export const PEASHOOTER_SHOOT_RECTS = [
  { sx: 11,   sy: 185, sw: 441, sh: 426 },
  { sx: 547,  sy: 172, sw: 475, sh: 440 },
  { sx: 1069, sy: 177, sw: 545, sh: 435 },
  { sx: 1619, sy: 189, sw: 537, sh: 421 },
];

export const SNOWPEA_IDLE_RECTS = [
  { sx: 26,   sy: 145, sw: 461, sh: 495 },
  { sx: 564,  sy: 158, sw: 458, sh: 481 },
  { sx: 1065, sy: 115, sw: 463, sh: 520 },
  { sx: 1634, sy: 164, sw: 477, sh: 474 },
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

function _loadPlantImage(src, current) {
  if (current && current.complete && current.naturalWidth > 0) return current;
  if (typeof Image === 'undefined') return null;
  const img = new Image();
  img.src = encodeURI(src);
  return img;
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
  getPeashooterIdleSprite();
  getPeashooterShootSprite();
  getSnowPeaIdleSprite();
  getSnowPeaShootSprite();
  getPeaProjSprite();
  getSnowPeaProjSprite();
}

export const CrazyDave_WEAPON_GRAPHICS = {
  shovel: {
    name: 'Garden Shovel',
    id: 'crazydave_shovel',
    desc: 'Crazy Dave\'s trusty steel garden trowel/shovel.',
  }
};

/**
 * Draws Crazy Dave's Shovel in hand or stowed.
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
  ctx.save();
  ctx.translate(x, y);
  if (angle !== 0) ctx.rotate(angle);

  const shaftLength = r * 1.5;
  const shaftWidth = 3.2;

  // 1. Wooden Shaft
  ctx.fillStyle = '#78350F'; // Dark walnut wood
  ctx.fillRect(r * 0.2, -shaftWidth / 2, shaftLength, shaftWidth);

  ctx.fillStyle = '#92400E'; // Wood grain highlight
  ctx.fillRect(r * 0.2, -shaftWidth / 2 + 0.8, shaftLength, 1.2);

  // 2. Triangular Wooden / Plastic D-Grip at base
  const gripX = r * 0.2;
  ctx.fillStyle = '#451A03';
  ctx.fillRect(gripX - 4, -4, 4, 8);
  ctx.fillStyle = '#78350F';
  ctx.fillRect(gripX - 3, -3, 2, 6);

  // 3. Metallic Steel Shovel Scoop Head
  const scoopX = r * 0.2 + shaftLength;
  const scoopW = 12;
  const scoopH = 14;

  // Metallic Collar
  ctx.fillStyle = '#475569';
  ctx.fillRect(scoopX - 2, -3.5, 3, 7);

  // Steel Blade Head
  ctx.fillStyle = '#94A3B8'; // Slate Steel
  ctx.beginPath();
  ctx.moveTo(scoopX, -scoopH / 2);
  ctx.lineTo(scoopX + scoopW * 0.7, -scoopH / 2);
  ctx.lineTo(scoopX + scoopW, 0);
  ctx.lineTo(scoopX + scoopW * 0.7, scoopH / 2);
  ctx.lineTo(scoopX, scoopH / 2);
  ctx.closePath();
  ctx.fill();

  // Dark Outline
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Blade Metallic Highlight Core
  ctx.fillStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.moveTo(scoopX + 2, -scoopH / 3);
  ctx.lineTo(scoopX + scoopW * 0.5, -scoopH / 3);
  ctx.lineTo(scoopX + scoopW * 0.75, 0);
  ctx.lineTo(scoopX + 2, 0);
  ctx.closePath();
  ctx.fill();

  // Specular Edge
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(scoopX + 2, -1, scoopW * 0.5, 1.5);

  // 4. Hand gripping shaft
  if (!shouldHideHands) {
    const handRadius = getHandSize(4.0);
    drawPixelHand(ctx, r * 0.65, 0, handRadius, '#FFE0BD', '#0E0F14');
  }

  ctx.restore();
}

/**
 * Draws a radiant bouncing Sun drop on the arena floor.
 */
export function drawSunDrop(ctx, sun) {
  if (!sun) return;
  const x = sun.x || 0;
  const y = sun.y || 0;
  const r = sun.r || 14;
  const pulse = sun.pulse || (Math.sin(Date.now() * 0.006) * 1.5);
  const rotAngle = sun.rotAngle || (Date.now() * 0.002);

  ctx.save();
  ctx.translate(x, y);

  // 1. Concentric Golden Halo (Rule 2.2: Zero shadowBlur)
  const haloGrad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r + 9 + pulse);
  haloGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
  haloGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
  haloGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r + 9 + pulse, 0, Math.PI * 2);
  ctx.fill();

  // 2. Rotating Sun Rays (8 triangular solar petals)
  ctx.save();
  ctx.rotate(rotAngle);
  ctx.fillStyle = '#F59E0B'; // Solar Amber
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 1.0;
  for (let i = 0; i < 8; i++) {
    const rayAngle = (i * Math.PI) / 4;
    ctx.save();
    ctx.rotate(rayAngle);
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -3.5);
    ctx.lineTo(r * 1.45 + (pulse * 0.5), 0);
    ctx.lineTo(r * 0.7, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // 3. Central Golden Disk Body
  ctx.fillStyle = '#FACC15'; // Bright Sunshine Yellow
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#B45309'; // Dark golden outline
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 4. Inner Specular Glint & Core
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.25, r * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.35, r * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
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
  const windupTimer = peashooter.shootWindupTimer || 0;
  const windupMax = peashooter.shootWindupMax || 12;
  const postShootTimer = peashooter.postShootTimer || 0;
  const isAboutToShoot = windupTimer > 0 || postShootTimer > 0;
  const drawSize = r * 2.6;

  const idleImg = getPeashooterIdleSprite();
  const shootImg = getPeashooterShootSprite();
  const hasIdle = Boolean(idleImg && idleImg.complete && idleImg.naturalWidth > 0);
  const hasShoot = Boolean(shootImg && shootImg.complete && shootImg.naturalWidth > 0);

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

  // 1. "About to Shoot" Swell / Recoil Animation Frame
  if (isAboutToShoot && hasShoot) {
    let frameIdx = 0;
    if (windupTimer > 0) {
      const progress = 1.0 - (windupTimer / windupMax);
      frameIdx = Math.min(PEASHOOTER_SHOOT_RECTS.length - 1, Math.floor(progress * PEASHOOTER_SHOOT_RECTS.length));
    } else {
      frameIdx = PEASHOOTER_SHOOT_RECTS.length - 1; // peak firing frame
    }
    const frame = PEASHOOTER_SHOOT_RECTS[frameIdx] || PEASHOOTER_SHOOT_RECTS[0];
    ctx.drawImage(
      shootImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawSize * 0.5, -drawSize * 0.8, drawSize, drawSize
    );
  }
  // 2. Idle Swaying Animation Frame
  else if (hasIdle) {
    const tick = peashooter.animTick || 0;
    const frameIdx = Math.floor(tick / 8) % PEASHOOTER_IDLE_RECTS.length;
    const frame = PEASHOOTER_IDLE_RECTS[frameIdx] || PEASHOOTER_IDLE_RECTS[0];
    ctx.drawImage(
      idleImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawSize * 0.5, -drawSize * 0.8, drawSize, drawSize
    );
  }
  // 3. High-Quality Procedural Fallback
  else {
    _drawProceduralPeashooter(ctx, r, isHit, isAboutToShoot ? 8 : 0);
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
  const windupTimer = snowpea.shootWindupTimer || 0;
  const windupMax = snowpea.shootWindupMax || 12;
  const postShootTimer = snowpea.postShootTimer || 0;
  const isAboutToShoot = windupTimer > 0 || postShootTimer > 0;
  const drawSize = r * 2.6;

  const idleImg = getSnowPeaIdleSprite();
  const shootImg = getSnowPeaShootSprite();
  const hasIdle = Boolean(idleImg && idleImg.complete && idleImg.naturalWidth > 0);
  const hasShoot = Boolean(shootImg && shootImg.complete && shootImg.naturalWidth > 0);

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

  // 1. "About to Shoot" Swell / Ice Blast Animation Frame
  if (isAboutToShoot && hasShoot) {
    let frameIdx = 0;
    if (windupTimer > 0) {
      const progress = 1.0 - (windupTimer / windupMax);
      frameIdx = Math.min(SNOWPEA_SHOOT_RECTS.length - 1, Math.floor(progress * SNOWPEA_SHOOT_RECTS.length));
    } else {
      frameIdx = SNOWPEA_SHOOT_RECTS.length - 1; // peak ice firing frame
    }
    const frame = SNOWPEA_SHOOT_RECTS[frameIdx] || SNOWPEA_SHOOT_RECTS[0];
    ctx.drawImage(
      shootImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawSize * 0.5, -drawSize * 0.8, drawSize, drawSize
    );
  }
  // 2. Idle Swaying Animation Frame
  else if (hasIdle) {
    const tick = snowpea.animTick || 0;
    const frameIdx = Math.floor(tick / 8) % SNOWPEA_IDLE_RECTS.length;
    const frame = SNOWPEA_IDLE_RECTS[frameIdx] || SNOWPEA_IDLE_RECTS[0];
    ctx.drawImage(
      idleImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawSize * 0.5, -drawSize * 0.8, drawSize, drawSize
    );
  }
  // 3. High-Quality Procedural Fallback
  else {
    _drawProceduralSnowPea(ctx, r, isHit, isAboutToShoot ? 8 : 0);
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
