// ─────────────────────────────────────────────
// Carl "CJ" Johnson — Dual Micro-Uzi & Weapon Graphics
// GTA San Andreas Authentic Drive-By Weapons
// Rule 11 (Zero shadowBlur) & Rule 20 Compliant
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';

let _brassKnuckleImg = null;
let _brassKnuckleImgLoading = false;

/**
 * Preloads and returns the authentic Brass Knuckle PNG image
 */
export function getBrassKnuckleImage() {
  if (_brassKnuckleImg && _brassKnuckleImg.complete && _brassKnuckleImg.naturalWidth > 0) {
    return _brassKnuckleImg;
  }
  if (!_brassKnuckleImgLoading && typeof Image !== 'undefined') {
    _brassKnuckleImgLoading = true;
    const img = new Image();
    img.onload = () => {
      _brassKnuckleImg = img;
      _brassKnuckleImgLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Brass Knuckle image at Assets/weapon/brassknuckle.png', e);
      _brassKnuckleImgLoading = false;
    };
    img.src = 'Assets/weapon/brassknuckle.png';
    _brassKnuckleImg = img;
  }
  return _brassKnuckleImg;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getBrassKnuckleImage();
}

/**
 * Draws CJ's vintage cast-brass knuckles overlay on fingers (Zero stretching, 100% natural aspect ratio)
 */
export function drawAuthenticBrassKnucklesShape(ctx, scale = 1.0, opts = {}) {
  const img = getBrassKnuckleImage();
  ctx.save();
  ctx.scale(scale, scale);

  if (img && img.complete && img.naturalWidth > 0) {
    // Preserve 100% natural aspect ratio without any stretching
    const aspect = (img.naturalWidth && img.naturalHeight) ? (img.naturalWidth / img.naturalHeight) : (1065 / 1531);
    const baseH = 26;
    const baseW = baseH * aspect;
    ctx.drawImage(img, -baseW * 0.5, -baseH * 0.5, baseW, baseH);
  } else {
    // Vector fallback while loading
    const brassGrad = ctx.createLinearGradient(-4, -8, 6, 8);
    brassGrad.addColorStop(0, '#F59E0B');
    brassGrad.addColorStop(0.35, '#FEF08A');
    brassGrad.addColorStop(0.70, '#D97706');
    brassGrad.addColorStop(1, '#92400E');

    ctx.fillStyle = brassGrad;
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 0.9;

    const fingerHoles = [
      { x: 3.2 * 0.85, y: -7.2 * 0.85, r: 3.4 },
      { x: 4.9 * 0.85, y: -2.3 * 0.85, r: 3.6 },
      { x: 4.9 * 0.85, y:  2.3 * 0.85, r: 3.6 },
      { x: 3.2 * 0.85, y:  7.2 * 0.85, r: 3.4 },
    ];

    ctx.beginPath();
    ctx.roundRect(-5, -10, 12, 20, 3.0);
    ctx.fill();
    ctx.stroke();

    fingerHoles.forEach((h) => {
      ctx.beginPath();
      ctx.arc(h.x + 2.5, h.y, 2.0, -Math.PI / 2, Math.PI / 2);
      ctx.fillStyle = '#FEF08A';
      ctx.fill();
      ctx.stroke();
    });

    ctx.fillStyle = '#3E2114';
    fingerHoles.forEach(h => {
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });
  }

  ctx.restore();
}

let _cachedBulletTrailGrad = null;

function _getBulletTrailGrad(ctx) {
  if (!_cachedBulletTrailGrad) {
    _cachedBulletTrailGrad = ctx.createLinearGradient(-26, 0, 8, 0);
    _cachedBulletTrailGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
    _cachedBulletTrailGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
    _cachedBulletTrailGrad.addColorStop(1, 'rgba(254, 240, 138, 0.95)');
  }
  return _cachedBulletTrailGrad;
}

/**
 * Draws CJ's high-velocity 9mm Micro-Uzi tracer bullet projectile
 */
export function drawCjUziBullet(ctx, p) {
  const vx = p.vx || 0;
  const vy = p.vy || 0;
  const angle = Math.atan2(vy, vx);
  const len = 12;
  const width = 3.0;

  // 1. World-Space Tracer Trail
  if (p.history && p.history.length > 1) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p.history[0].x, p.history[0].y);
    for (let i = 1; i < p.history.length; i++) {
      ctx.lineTo(p.history[i].x, p.history[i].y);
    }
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.50)'; // Amber gold tracer
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Hot-yellow tracer core
    const sliceCount = Math.max(1, p.history.length - 3);
    ctx.beginPath();
    ctx.moveTo(p.history[sliceCount - 1].x, p.history[sliceCount - 1].y);
    for (let i = sliceCount; i < p.history.length; i++) {
      ctx.lineTo(p.history[i].x, p.history[i].y);
    }
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.90)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // 2. Trailing speed streak
  ctx.fillStyle = _getBulletTrailGrad(ctx);
  ctx.beginPath();
  ctx.moveTo(0, -width * 0.5);
  ctx.lineTo(-24, 0);
  ctx.lineTo(0, width * 0.5);
  ctx.closePath();
  ctx.fill();

  // 3. 9mm Full Metal Jacket Bullet Core
  ctx.fillStyle = '#D97706'; // Amber brass casing
  ctx.fillRect(-len * 0.5, -width * 0.5, len * 0.65, width);

  // Copper bullet tip
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(len * 0.15, 0, width * 0.5, -Math.PI / 2, Math.PI / 2);
  ctx.fill();

  // White-hot center highlight
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-len * 0.2, -width * 0.2, len * 0.35, width * 0.4);

  ctx.restore();
}

/**
 * Draws sharp, vibrant Micro-Uzi Muzzle Flash
 */
export function drawCjMuzzleFlash(ctx, x, y, scale = 1.0) {
  ctx.save();
  ctx.translate(x, y);

  const burstSize = 14 * scale;

  // 1. Fiery Orange Outer Star Burst
  ctx.fillStyle = 'rgba(245, 158, 11, 0.90)';
  ctx.beginPath();
  ctx.moveTo(burstSize, 0);
  ctx.lineTo(burstSize * 0.35, -burstSize * 0.45);
  ctx.lineTo(0, -burstSize * 0.90);
  ctx.lineTo(-burstSize * 0.35, -burstSize * 0.45);
  ctx.lineTo(-burstSize * 0.60, 0);
  ctx.lineTo(-burstSize * 0.35, burstSize * 0.45);
  ctx.lineTo(0, burstSize * 0.90);
  ctx.lineTo(burstSize * 0.35, burstSize * 0.45);
  ctx.closePath();
  ctx.fill();

  // 2. White-Hot Inner Core Diamond
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.moveTo(burstSize * 0.65, 0);
  ctx.lineTo(0, -burstSize * 0.45);
  ctx.lineTo(-burstSize * 0.35, 0);
  ctx.lineTo(0, burstSize * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws Authentic GTA San Andreas Micro-Uzi SMG
 * Detailed 2D vector model with stamped steel receiver, extended magazine & barrel
 */
export function drawCjMicroUzi(ctx, x, y, scale = 1.0, recoil = 0, flashTimer = 0) {
  ctx.save();
  ctx.translate(x - recoil, y);
  ctx.scale(scale, scale);

  // 1. Extended Box Magazine (protrudes downwards from bottom of grip)
  ctx.fillStyle = '#111827'; // Dark charcoal steel
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(-2, 6, 4.5, 14, 1.2);
  ctx.fill();
  ctx.stroke();

  // Magazine baseplate
  ctx.fillStyle = '#475569';
  ctx.fillRect(-2.5, 18.5, 5.5, 2.0);

  // 2. Ergonomic Pistol Grip
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.roundRect(-3.5, 1, 6.5, 9, 1.5);
  ctx.fill();
  ctx.stroke();

  // Textured grip ridges
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 0.8;
  for (let gy = 3; gy <= 8; gy += 2) {
    ctx.beginPath();
    ctx.moveTo(-2.5, gy);
    ctx.lineTo(2.0, gy);
    ctx.stroke();
  }

  // Trigger Guard & Trigger
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(4, 4, 3.2, Math.PI * 0.3, Math.PI * 1.1);
  ctx.stroke();

  // 3. Stamped Steel Box Receiver (Main Gun Body)
  ctx.fillStyle = '#1E293B'; // Dark gunmetal
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-7, -4.5, 22, 9, 1.5);
  ctx.fill();
  ctx.stroke();

  // Top Receiver Deck & Cocking Slide Channel
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-5, -6.0, 16, 2.0);

  // Top Charging Handle / Bolt Knob
  ctx.fillStyle = '#475569';
  ctx.fillRect(1, -7.8, 4.0, 2.2);

  // Ejection Port (Right Side)
  ctx.fillStyle = '#09090B';
  ctx.fillRect(2, -2.5, 6, 3.0);
  ctx.fillStyle = '#D97706'; // Glimpse of brass cartridge chambered
  ctx.fillRect(3.5, -1.8, 3.2, 1.6);

  // 4. Barrel Assembly & Ribbed Nut
  // Barrel Nut Collar
  ctx.fillStyle = '#334155';
  ctx.fillRect(14, -3.2, 3.5, 6.4);

  // Protruding Short Barrel
  ctx.fillStyle = '#09090B';
  ctx.fillRect(17.5, -2.0, 6.5, 4.0);

  // Front Sight Post
  ctx.fillStyle = '#475569';
  ctx.fillRect(13, -7.0, 1.8, 3.0);

  // Rear Sight Post
  ctx.fillRect(-5, -7.0, 1.8, 2.5);

  // 5. Folded Steel Wire Stock (Bracket behind receiver)
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-7, -2);
  ctx.lineTo(-10, -2);
  ctx.lineTo(-10, 3);
  ctx.lineTo(-7, 3);
  ctx.stroke();

  // 6. Muzzle Flash Burst
  if (flashTimer > 0) {
    drawCjMuzzleFlash(ctx, 24, 0, 1.15);
  }

  ctx.restore();
}

/**
 * Standalone Brass Knuckles renderer for Weapon Studio / UI screens
 */
export function drawCjBrassKnuckles(ctx, x = 0, y = 0, gunAngle = 0, r = 25, opts = {}) {
  ctx.save();
  let posX = x;
  let posY = y;
  let angle = 0;
  let scale = 1.0;

  if (typeof gunAngle === 'object') {
    opts = gunAngle;
    scale = opts.scale || 1.0;
  } else if (typeof gunAngle === 'number') {
    angle = gunAngle;
    if (typeof r === 'number') {
      posX = x + (r * 0.75);
      posY = y;
      scale = (opts && opts.scale) ? opts.scale : 1.85;
    } else if (typeof r === 'object') {
      opts = r;
      scale = opts.scale || 1.0;
    }
  }

  ctx.translate(posX, posY);
  ctx.rotate(angle);
  drawAuthenticBrassKnucklesShape(ctx, scale, opts);
  ctx.restore();
}

/**
 * Standalone DARPA Jetpack renderer for Weapon Studio / UI screens
 */
export function drawCjJetpackWeapon(ctx, x = 0, y = 0, gunAngle = 0, r = 25, opts = {}) {
  ctx.save();
  let posX = x;
  let posY = y;
  let angle = 0;
  let scale = 1.0;

  if (typeof gunAngle === 'object') {
    opts = gunAngle;
    scale = opts.scale || 1.0;
  } else if (typeof gunAngle === 'number') {
    angle = gunAngle;
    if (typeof r === 'number') {
      posX = x + (r * 0.4);
      posY = y;
      scale = (opts && opts.scale) ? opts.scale : 1.15;
    } else if (typeof r === 'object') {
      opts = r;
      scale = opts.scale || 1.0;
    }
  }

  ctx.translate(posX, posY);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  const tankW = 10;
  const tankH = 28;

  // Twin Slate-Blue Fuel Tanks
  const tankGrad = ctx.createLinearGradient(-15, -tankH * 0.5, 15, tankH * 0.5);
  tankGrad.addColorStop(0, '#64748B');
  tankGrad.addColorStop(0.5, '#475569');
  tankGrad.addColorStop(1, '#334155');

  // Left Tank
  ctx.fillStyle = tankGrad;
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(-14, -tankH * 0.5, tankW, tankH, 4);
  ctx.fill();
  ctx.stroke();

  // Right Tank
  ctx.beginPath();
  ctx.roundRect(4, -tankH * 0.5, tankW, tankH, 4);
  ctx.fill();
  ctx.stroke();

  // Central Olive-Drab Avionics Box
  const boxGrad = ctx.createLinearGradient(-7, -10, 7, 10);
  boxGrad.addColorStop(0, '#4B5320');
  boxGrad.addColorStop(1, '#2E3516');
  ctx.fillStyle = boxGrad;
  ctx.beginPath();
  ctx.roundRect(-6, -10, 12, 20, 2);
  ctx.fill();
  ctx.stroke();

  // Orange Avionics Bay
  ctx.fillStyle = '#EA580C';
  ctx.fillRect(-4, -6, 8, 5);

  // Twin Lower Exhaust Nozzles
  ctx.fillStyle = '#18181B';
  ctx.beginPath();
  ctx.moveTo(-13, tankH * 0.5);
  ctx.lineTo(-5, tankH * 0.5);
  ctx.lineTo(-7, tankH * 0.5 + 5);
  ctx.lineTo(-11, tankH * 0.5 + 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(5, tankH * 0.5);
  ctx.lineTo(13, tankH * 0.5);
  ctx.lineTo(11, tankH * 0.5 + 5);
  ctx.lineTo(7, tankH * 0.5 + 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Standalone M134 Minigun renderer for Weapon Studio / UI screens
 */
export function drawCjMinigun(ctx, x = 0, y = 0, gunAngle = 0, r = 25, opts = {}) {
  ctx.save();
  let posX = x;
  let posY = y;
  let angle = 0;
  let scale = 1.0;

  if (typeof gunAngle === 'object') {
    opts = gunAngle;
    scale = opts.scale || 1.0;
  } else if (typeof gunAngle === 'number') {
    angle = gunAngle;
    if (typeof r === 'number') {
      posX = x + (r * 0.75);
      posY = y;
      scale = (opts && opts.scale) ? opts.scale : 1.10;
    } else if (typeof r === 'object') {
      opts = r;
      scale = opts.scale || 1.0;
    }
  }

  ctx.translate(posX, posY);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // 1. Rear Spade Grip & Housing
  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-20, -7, 14, 14, 2);
  ctx.fill();
  ctx.stroke();

  // 2. Central Motor Body / Rotor Cylinder
  const bodyGrad = ctx.createLinearGradient(-6, -9, 8, 9);
  bodyGrad.addColorStop(0, '#334155');
  bodyGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-6, -9, 15, 18, 2);
  ctx.fill();
  ctx.stroke();

  // 3. 6-Barrel Gatling Cluster with Rotor Rings
  const numBarrels = 6;
  const clusterRadius = 5.5;
  const barrelLen = 32;

  // Front and Mid Clamp Collars
  ctx.fillStyle = '#09090B';
  ctx.fillRect(8, -8, 3, 16);
  ctx.fillRect(22, -8, 3, 16);
  ctx.fillRect(36, -8, 3, 16);

  // 6 Steel Barrels
  const spinAngle = (opts && opts.spinAngle) ? opts.spinAngle : 0;
  for (let i = 0; i < numBarrels; i++) {
    const a = spinAngle + (i * Math.PI * 2) / numBarrels;
    const by = Math.sin(a) * clusterRadius;
    const bDepth = Math.cos(a);
    ctx.fillStyle = bDepth > 0 ? '#475569' : '#1E293B';
    ctx.fillRect(8, by - 1.2, barrelLen, 2.4);
  }

  // 4. Side Ammo Belt Feed Chute
  ctx.fillStyle = '#D97706'; // Golden brass link feed
  ctx.beginPath();
  ctx.roundRect(-4, 9, 8, 7, 1);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}
