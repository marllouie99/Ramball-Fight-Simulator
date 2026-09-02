// ─────────────────────────────────────────────
// Carl "CJ" Johnson — Dual Micro-Uzi & Weapon Graphics
// GTA San Andreas Authentic Drive-By Weapons
// Rule 11 (Zero shadowBlur) & Rule 20 Compliant
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';

function _isDarkMode() {
  return Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' || 
      state.darkMode || 
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );
}

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
 * Draws CJ's 9mm Micro-Uzi / TEC-9 Tracer Bullet in authentic Pixel Art Style (Saitama Tech)
 */
export function drawCjPixelUziBullet(ctx, p) {
  const vx = (p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined) ? p._resumeVx : (p.vx || 0);
  const vy = (p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined) ? p._resumeVy : (p.vy || 0);
  const angle = (vx !== 0 || vy !== 0) ? Math.atan2(vy, vx) : (p.lastAngle !== undefined ? p.lastAngle : (p.angle || 0));
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  // 1. Stepped Pixel Tracer Trail
  if (p.history && p.history.length > 1) {
    ctx.save();
    for (let i = 0; i < p.history.length; i++) {
      const h = p.history[i];
      const alpha = (i / p.history.length) * 0.85;
      const size = (i > p.history.length - 3) ? 4.0 : 2.5;
      ctx.fillStyle = (i % 2 === 0) ? `rgba(245, 158, 11, ${alpha})` : `rgba(254, 240, 138, ${alpha})`;
      ctx.fillRect(snap(h.x - size * 0.5), snap(h.y - size * 0.5), size, size);
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(snap(p.x), snap(p.y));
  ctx.rotate(angle);

  // 2. Trailing Pixel Flame / Exhaust Streak
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(-16, -1.5, 10, 3);
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(-8, -1.0, 6, 2);

  // 3. Stepped 9mm Bullet Core with #0E0F14 Outline
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-6, -3, 13, 6);

  // Brass Casing Body
  ctx.fillStyle = '#D97706';
  ctx.fillRect(-5, -2, 7, 4);

  // Copper Pointed Tip
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(2, -2, 3, 4);
  ctx.fillRect(5, -1, 1, 2);

  // Specular Core Highlight
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-2, -1, 4, 2);

  ctx.restore();
}

/**
 * Draws CJ's high-velocity 9mm Micro-Uzi tracer bullet projectile
 */
export function drawCjUziBullet(ctx, p) {
  if (_isDarkMode()) {
    drawCjPixelUziBullet(ctx, p);
    return;
  }

  const vx = (p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined) ? p._resumeVx : (p.vx || 0);
  const vy = (p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined) ? p._resumeVy : (p.vy || 0);
  const angle = (vx !== 0 || vy !== 0) ? Math.atan2(vy, vx) : (p.lastAngle !== undefined ? p.lastAngle : (p.angle || 0));
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
 * Draws Pixel Art Starburst Muzzle Flash
 */
export function drawCjPixelMuzzleFlash(ctx, x, y, scale = 1.0) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  const P = 2.0 * scale;

  // Stepped Pixel Diamond Starburst
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-P * 3, -P * 3, P * 6, P * 6);

  ctx.fillStyle = '#F97316'; // Fiery orange outer cross
  ctx.fillRect(-P * 4, -P, P * 8, P * 2);
  ctx.fillRect(-P, -P * 4, P * 2, P * 8);

  ctx.fillStyle = '#FBBF24'; // Golden core
  ctx.fillRect(-P * 2.5, -P * 2.5, P * 5, P * 5);

  ctx.fillStyle = '#FFFFFF'; // White-hot center
  ctx.fillRect(-P, -P, P * 2, P * 2);

  ctx.restore();
}

/**
 * Draws sharp, vibrant Micro-Uzi Muzzle Flash
 */
export function drawCjMuzzleFlash(ctx, x, y, scale = 1.0) {
  if (_isDarkMode()) {
    drawCjPixelMuzzleFlash(ctx, x, y, scale);
    return;
  }

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

let _cachedUziMagGrad = null;
let _cachedUziGripGrad = null;
let _cachedUziRecGrad = null;
let _cachedUziBarrelGrad = null;

function _initUziGradients(ctx) {
  if (_cachedUziMagGrad) return;
  _cachedUziMagGrad = ctx.createLinearGradient(-2.5, 0, 2.5, 0);
  _cachedUziMagGrad.addColorStop(0.0, '#1E232B');
  _cachedUziMagGrad.addColorStop(0.35, '#3B4452');
  _cachedUziMagGrad.addColorStop(0.70, '#1E232B');
  _cachedUziMagGrad.addColorStop(1.0, '#0F1217');

  _cachedUziGripGrad = ctx.createLinearGradient(-6, 0, 4, 0);
  _cachedUziGripGrad.addColorStop(0.0, '#181B22');
  _cachedUziGripGrad.addColorStop(0.35, '#282D37');
  _cachedUziGripGrad.addColorStop(0.70, '#181B22');
  _cachedUziGripGrad.addColorStop(1.0, '#0F1116');

  _cachedUziRecGrad = ctx.createLinearGradient(0, -6.5, 0, 6.5);
  _cachedUziRecGrad.addColorStop(0.00, '#2A303C');
  _cachedUziRecGrad.addColorStop(0.18, '#4D576B');
  _cachedUziRecGrad.addColorStop(0.42, '#647085');
  _cachedUziRecGrad.addColorStop(0.70, '#323B4A');
  _cachedUziRecGrad.addColorStop(1.00, '#1B2028');

  _cachedUziBarrelGrad = ctx.createLinearGradient(0, -1.8, 0, 1.8);
  _cachedUziBarrelGrad.addColorStop(0.0, '#323B4A');
  _cachedUziBarrelGrad.addColorStop(0.3, '#647085');
  _cachedUziBarrelGrad.addColorStop(0.7, '#2A303C');
  _cachedUziBarrelGrad.addColorStop(1.0, '#181B22');
}

/**
 * Draws Authentic GTA San Andreas Micro-Uzi in 100% Discrete Pixel Art Style (Saitama Tech)
 */
export function drawCjPixelMicroUzi(ctx, x, y, scale = 1.0, recoil = 0, flashTimer = 0) {
  ctx.save();
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const recoilOff = snap(recoil * 0.9);
  ctx.translate(snap(x - recoilOff), snap(y));
  ctx.scale(scale, scale);

  // 1. Magazine (Steel Straight Box)
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-3, 6, 6, 20);
  ctx.fillStyle = '#1E293B'; // Dark steel magazine
  ctx.fillRect(-2, 7, 4, 18);
  ctx.fillStyle = '#0F172A'; // Floor plate
  ctx.fillRect(-3, 24, 6, 2);

  // 2. Pistol Grip & Lower Receiver
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-7, 2, 11, 14);
  ctx.fillStyle = '#181B22'; // Molded black polymer grip
  ctx.fillRect(-6, 3, 9, 12);
  // Grip texture ribs
  ctx.fillStyle = '#0F1116';
  ctx.fillRect(-5, 5, 7, 2);
  ctx.fillRect(-5, 9, 7, 2);

  // Trigger Guard & Trigger
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(4, 5, 5, 8);
  ctx.fillStyle = '#334155';
  ctx.fillRect(5, 6, 3, 6);
  ctx.fillStyle = '#0E0F14'; // Trigger cutout
  ctx.fillRect(5, 7, 3, 4);

  // 3. Upper Receiver (Matte Gunmetal Gray Box)
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-12, -7, 32, 11);
  ctx.fillStyle = '#334155'; // Receiver body
  ctx.fillRect(-11, -6, 30, 9);
  ctx.fillStyle = '#475569'; // Top cover reflection
  ctx.fillRect(-10, -5, 28, 2);

  // Top Cocking Handle
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(0, -10, 8, 4);
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(1, -9, 6, 2);

  // Ejection Port & Brass Glimpse
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(4, -4, 7, 4);
  ctx.fillStyle = '#D97706';
  ctx.fillRect(5, -3, 5, 2);

  // 4. Barrel Nut & Short Barrel
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(19, -4, 7, 5);
  ctx.fillStyle = '#475569';
  ctx.fillRect(20, -3, 5, 3);
  ctx.fillStyle = '#0E0F14'; // Barrel bore
  ctx.fillRect(24, -2, 2, 1);

  // Front Sight Post
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(18, -9, 3, 3);

  // Rear Sight Post
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-11, -9, 3, 3);

  // 5. Muzzle Flash
  if (flashTimer > 0) {
    drawCjPixelMuzzleFlash(ctx, 27, -1.5, 1.15);
  }

  ctx.restore();
}

/**
 * Draws Authentic GTA: San Andreas Micro SMG (IMI Micro-Uzi)
 * Faithful to GTA SA Mid-2000s Industrial Aesthetic & Real Firearm Architecture:
 * - Receiver and Body: Matte gunmetal gray / dark steel with industrial metallic reflections
 * - Furniture (Grip and Handguard): Molded dark charcoal / black polymer with tactile ribs
 * - Small Details: Darker pins, ejection port, and stamped & welded sheet metal sights
 * - Left-side Folded Steel Stock with hinge bracket, longitudinal strut, and rubber buttpad
 * - Stamped 32-Round Straight Steel Box Magazine with Stamped Spine Flute & Baseplate
 * Rule 11 (Zero shadowBlur) & Rule 20 Compliant
 */
export function drawCjMicroUzi(ctx, x, y, scale = 1.0, recoil = 0, flashTimer = 0) {
  if (_isDarkMode()) {
    drawCjPixelMicroUzi(ctx, x, y, scale, recoil, flashTimer);
    return;
  }

  _initUziGradients(ctx);

  ctx.save();
  const recoilOffset = recoil * 0.9;
  const recoilClimb = -recoil * 0.015;

  ctx.translate(x - recoilOffset, y);
  if (recoil > 0) {
    ctx.rotate(recoilClimb);
  }
  ctx.scale(scale, scale);

  // ── LAYER 1: EXTENDED 32-ROUND STRAIGHT STEEL BOX MAGAZINE ──
  const magX = 0;
  const magTopY = 22.0;
  const magW = 5.0;
  const magH = 18.0;

  // Stamped Cold-Rolled Steel Body Gradient (Cached)
  ctx.fillStyle = _cachedUziMagGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(magX - magW * 0.5, magTopY, magW, magH, 0.6);
  ctx.fill();
  ctx.stroke();

  // Central Stamped Spine Groove
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(magX, magTopY + 1.0);
  ctx.lineTo(magX, magTopY + magH - 1.5);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(magX + 0.5, magTopY + 1.0);
  ctx.lineTo(magX + 0.5, magTopY + magH - 1.5);
  ctx.stroke();

  // Steel Magazine Baseplate / Floorplate
  ctx.fillStyle = '#333D4B';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(magX - (magW + 1.4) * 0.5, magTopY + magH - 0.5, magW + 1.4, 2.4, 0.6);
  ctx.fill();
  ctx.stroke();

  // Floorplate retention pin dimple
  ctx.fillStyle = '#0F1217';
  ctx.fillRect(magX - 0.6, magTopY + magH + 0.4, 1.2, 0.8);

  // ── LAYER 2: PISTOL GRIP (MOLDED DARK CHARCOAL / BLACK POLYMER) & TRIGGER GUARD ──
  // A. Pistol Grip Body (Cached)
  ctx.save();
  ctx.fillStyle = _cachedUziGripGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  ctx.moveTo(3.5, 6.0);       // Top front under receiver
  ctx.lineTo(4.0, 14.5);      // Front strap upper (merges with trigger guard)
  ctx.lineTo(3.2, 23.5);      // Front strap lower
  ctx.lineTo(4.2, 24.5);      // Front base lip
  ctx.lineTo(-6.0, 24.5);     // Bottom base
  ctx.lineTo(-6.8, 23.5);     // Rear base heel
  ctx.lineTo(-5.8, 14.5);     // Backstrap lower
  ctx.lineTo(-5.2, 6.0);      // Top rear under receiver
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // B. Rear Grip Safety Squeeze Lever (Stamped Dark Steel on backstrap)
  ctx.fillStyle = '#181B22';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(-8.2, 7.5, 3.0, 6.8, [1.4, 0, 0, 1.4]);
  ctx.fill();
  ctx.stroke();

  // Safety lever pivot line
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-5.4, 7.5);
  ctx.lineTo(-5.4, 14.3);
  ctx.stroke();

  // C. Textured Grip Serrations Panel (Molded Charcoal Polymer Ribs)
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-4.8, 14.5, 7.6, 8.5, 1.0);
  ctx.fillStyle = '#0F1116';
  ctx.fill();
  ctx.clip(); // STRICT CLIPPING

  // Clean horizontal rib serrations
  ctx.strokeStyle = '#282D37';
  ctx.lineWidth = 0.8;
  for (let gy = 15.5; gy <= 22.0; gy += 1.4) {
    ctx.beginPath();
    ctx.moveTo(-5.5, gy);
    ctx.lineTo(3.5, gy);
    ctx.stroke();
  }
  ctx.restore();

  // D. Small Molded Grip Medallion
  ctx.fillStyle = '#0F1116';
  ctx.strokeStyle = '#282D37';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(-1.2, 20.0, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  // E. Integral Stamped Steel Trigger Guard Loop
  ctx.strokeStyle = '#0F1217';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(3.8, 6.5);
  ctx.lineTo(12.5, 6.5);
  ctx.lineTo(12.5, 14.5);
  ctx.lineTo(3.8, 14.5);
  ctx.stroke();

  // Inner Trigger Guard Dark Void
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.moveTo(4.6, 7.3);
  ctx.lineTo(11.3, 7.3);
  ctx.lineTo(11.3, 13.3);
  ctx.lineTo(4.6, 13.3);
  ctx.closePath();
  ctx.fill();

  // Polished Curved Steel Trigger Blade inside
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(6.5, 7.0);
  ctx.quadraticCurveTo(8.2, 9.5, 7.2, 12.5);
  ctx.stroke();

  // ── LAYER 3: STAMPED SHEET METAL MAIN RECEIVER (MATTE GUNMETAL GRAY / INDUSTRIAL DARK STEEL) ──
  const recLeftX = -24.0;
  const recRightX = 26.0;
  const recTopY = -6.5;
  const recH = 13.0;

  // 3D Cylindrical Matte Gunmetal Gray Gradient with Industrial Metallic Reflections (Cached)
  ctx.fillStyle = _cachedUziRecGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.roundRect(recLeftX, recTopY, recRightX - recLeftX, recH, 1.2);
  ctx.fill();
  ctx.stroke();

  // Stamped Longitudinal Ribs at Rear of Receiver (Upper & Lower Horizontal Ribs)
  // Rib 1 (Upper)
  ctx.fillStyle = '#1E232B';
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.roundRect(-21.0, -3.8, 12.0, 2.0, 0.8);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.30)';
  ctx.beginPath();
  ctx.moveTo(-20.5, -2.8);
  ctx.lineTo(-9.5, -2.8);
  ctx.stroke();

  // Rib 2 (Lower)
  ctx.fillStyle = '#1E232B';
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.roundRect(-21.0, -0.8, 12.0, 2.0, 0.8);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.30)';
  ctx.beginPath();
  ctx.moveTo(-20.5, 0.2);
  ctx.lineTo(-9.5, 0.2);
  ctx.stroke();

  // Stamped Rectangular Recess below Ejection Port
  ctx.fillStyle = '#1E232B';
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.roundRect(-6.5, 2.2, 11.5, 2.8, 0.8);
  ctx.fill();
  ctx.stroke();

  // Ejection Port & Reciprocating Steel Bolt
  const ejectX = -4.0;
  const ejectW = 8.5;
  const ejectTopY = -5.0;
  const ejectH = 4.2;
  const boltRecoilOffset = recoil * 1.2;

  // Stamped Ejection Port Cutout
  ctx.fillStyle = '#020617';
  ctx.strokeStyle = '#2A303C';
  ctx.lineWidth = 0.8;
  ctx.fillRect(ejectX, ejectTopY, ejectW, ejectH);
  ctx.strokeRect(ejectX, ejectTopY, ejectW, ejectH);

  // Reciprocating Steel Bolt Face (Machined Industrial Parkerized Steel)
  const boltFaceX = ejectX - boltRecoilOffset;
  ctx.fillStyle = '#647085';
  ctx.fillRect(Math.max(ejectX + 0.3, boltFaceX), ejectTopY + 0.4,
    Math.min(ejectW - 0.6, ejectW + boltRecoilOffset - 0.6), ejectH - 0.8);

  // Brass Extractor / Cartridge Glimpse
  ctx.fillStyle = '#D97706';
  ctx.fillRect(Math.max(ejectX + 0.6, boltFaceX + 3.0), ejectTopY + 1.2, 2.2, 1.8);
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(Math.max(ejectX + 0.6, boltFaceX + 3.8), ejectTopY + 1.5, 1.0, 1.2);

  // ── LAYER 4: MOLDED DARK CHARCOAL / BLACK POLYMER FOREARM HANDGUARD ──
  const guardLeftX = 7.0;
  const guardRightX = 25.0;
  const guardTopY = -4.5;
  const guardH = 10.5;

  const guardGrad = ctx.createLinearGradient(0, guardTopY, 0, guardTopY + guardH);
  guardGrad.addColorStop(0.0, '#1A1D24'); // Top edge
  guardGrad.addColorStop(0.25, '#282D37'); // Charcoal polymer highlight
  guardGrad.addColorStop(0.70, '#181B22'); // Matte body
  guardGrad.addColorStop(1.00, '#0F1116'); // Deep dark underside

  ctx.fillStyle = guardGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(guardLeftX, guardTopY, guardRightX - guardLeftX, guardH, [1.0, 1.5, 1.5, 1.0]);
  ctx.fill();
  ctx.stroke();

  // Tactile Vertical Rib Textures on Charcoal Handguard
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 0.7;
  for (let gx = guardLeftX + 2.5; gx <= guardRightX - 2.5; gx += 1.8) {
    ctx.beginPath();
    ctx.moveTo(gx, guardTopY + 1.2);
    ctx.lineTo(gx, guardTopY + guardH - 1.2);
    ctx.stroke();
  }

  // Darkened Steel Handguard Mounting Screws
  [guardLeftX + 3.0, guardRightX - 3.5].forEach(sx => {
    ctx.fillStyle = '#2A303C';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(sx, guardTopY + guardH * 0.5, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // ── LAYER 5: KNURLED BARREL NUT COLLAR & PROTRUDING 9MM BARREL ──
  const nutX = guardRightX;
  const nutW = 3.5;
  const nutTopY = -4.0;
  const nutH = 8.0;

  // Dark Steel Barrel Nut Collar
  ctx.fillStyle = '#2A303C';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(nutX, nutTopY, nutW, nutH, 0.8);
  ctx.fill();
  ctx.stroke();

  // Knurling facets on nut
  ctx.fillStyle = '#181B22';
  ctx.fillRect(nutX + 1.0, nutTopY + 0.6, 0.8, nutH - 1.2);
  ctx.fillRect(nutX + 2.2, nutTopY + 0.6, 0.8, nutH - 1.2);

  // Protruding Smooth Gunmetal Steel 9mm Barrel (Cached)
  const barrelX = nutX + nutW;
  const barrelLen = 11.0;
  const barrelTopY = -1.8;
  const barrelH = 3.6;

  ctx.fillStyle = _cachedUziBarrelGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.fillRect(barrelX, barrelTopY, barrelLen, barrelH);
  ctx.strokeRect(barrelX, barrelTopY, barrelLen, barrelH);

  // Dark 9mm Muzzle Bore Crown
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.ellipse(barrelX + barrelLen, 0, 0.6, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── LAYER 6: STAMPED & WELDED SHEET METAL SIGHT PROTECTIVE WINGS ──
  // A. Front Sight Protective Wing (Near front of receiver)
  const fSightX = 21.0;
  ctx.fillStyle = '#181B22';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;

  // Stamped Semi-Circular Curved Front Ear
  ctx.beginPath();
  ctx.moveTo(fSightX - 3.2, recTopY);
  ctx.quadraticCurveTo(fSightX - 3.2, recTopY - 6.5, fSightX, recTopY - 6.5);
  ctx.quadraticCurveTo(fSightX + 3.2, recTopY - 6.5, fSightX + 3.2, recTopY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Front Sight Pin Post inside
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(fSightX - 0.6, recTopY - 5.0, 1.2, 5.0);

  // Front Sight Adjustment Screw Disc
  ctx.fillStyle = '#323B4A';
  ctx.beginPath();
  ctx.arc(fSightX, recTopY - 2.5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // B. Rear Sight Protective Wing (Near rear of receiver)
  const rSightX = -18.0;
  ctx.fillStyle = '#181B22';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;

  // Stamped Semi-Circular Curved Rear Ear
  ctx.beginPath();
  ctx.moveTo(rSightX - 3.4, recTopY);
  ctx.quadraticCurveTo(rSightX - 3.4, recTopY - 6.5, rSightX, recTopY - 6.5);
  ctx.quadraticCurveTo(rSightX + 3.4, recTopY - 6.5, rSightX + 3.4, recTopY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rear Aperture Peep Hole & Windage Wheel Dial
  ctx.fillStyle = '#323B4A';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(rSightX, recTopY - 3.0, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.arc(rSightX, recTopY - 3.0, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // ── LAYER 7: TOP COCKING SLIDE & LOW-PROFILE CHARGING KNOB ──
  // Top Cocking Slide Channel
  ctx.fillStyle = '#09090B';
  ctx.fillRect(-12.0, recTopY - 1.2, 28.0, 1.4);

  // Low-profile Cylindrical Cocking Knob (Right on the top slide)
  const knobRecoilOffset = recoil * 1.2;
  const knobX = 4.0 - knobRecoilOffset;
  const knobW = 3.6;
  const knobH = 4.0;

  // Knob base stem
  ctx.fillStyle = '#2A303C';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(knobX - knobW * 0.5, recTopY - knobH, knobW, knobH, [1.5, 1.5, 0, 0]);
  ctx.fill();
  ctx.stroke();

  // Knurled top bevel & highlight
  ctx.fillStyle = '#4D576B';
  ctx.fillRect(knobX - knobW * 0.35, recTopY - knobH + 0.6, knobW * 0.7, 1.2);
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(knobX - knobW * 0.25, recTopY - knobH + 0.8, knobW * 0.5, 0.6);

  // ── LAYER 8: FOLDED STEEL WIRE STOCK (Folded along left side as in reference photo) ──
  // A. Rear Hinge Pivot Block
  const hingeX = -23.0;
  ctx.fillStyle = '#2A303C';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(hingeX - 1.5, -3.5, 3.2, 7.0, 1.0);
  ctx.fill();
  ctx.stroke();

  // Upper & Lower Pivot Rivet Pins
  ctx.fillStyle = '#647085';
  ctx.beginPath();
  ctx.arc(hingeX, -1.8, 0.9, 0, Math.PI * 2);
  ctx.arc(hingeX, 1.8, 0.9, 0, Math.PI * 2);
  ctx.fill();

  // B. Stamped Steel Stock Strut (Folded forward along bottom-left of receiver)
  ctx.save();
  ctx.fillStyle = '#2A303C';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.1;

  // Main horizontal folded strut bar
  ctx.beginPath();
  ctx.roundRect(-23.0, 3.8, 20.0, 3.4, 1.0);
  ctx.fill();
  ctx.stroke();

  // Stamped Lightening Groove along strut
  ctx.fillStyle = '#09090B';
  ctx.beginPath();
  ctx.roundRect(-21.5, 4.7, 17.0, 1.6, 0.7);
  ctx.fill();

  // C. Folding Buttpad & Triangular Reinforcement Gusset (Hangs down vertically near rear)
  // Triangular strut gusset
  ctx.fillStyle = '#2A303C';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-23.0, 4.0);
  ctx.lineTo(-15.0, 4.0);
  ctx.lineTo(-23.0, 12.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner dark lightening triangular cutout
  ctx.fillStyle = '#09090B';
  ctx.beginPath();
  ctx.moveTo(-21.5, 5.2);
  ctx.lineTo(-16.5, 5.2);
  ctx.lineTo(-21.5, 10.2);
  ctx.closePath();
  ctx.fill();

  // Down-hanging Buttpad Body (Molded Dark Charcoal Rubber Pad)
  ctx.fillStyle = '#181B22';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(-25.5, -3.0, 3.6, 18.0, [1.5, 0, 0, 1.5]);
  ctx.fill();
  ctx.stroke();

  // Textured Rubber Buttpad Lining on back edge
  ctx.fillStyle = '#09090B';
  ctx.fillRect(-26.2, -2.0, 1.2, 16.0);

  ctx.restore();

  // ── LAYER 9: FLYING EJECTED BRASS CASING PARTICLE ──
  if (flashTimer > 0) {
    ctx.save();
    const caseProgress = (3 - flashTimer) / 3;
    const caseX = 3.0 + caseProgress * 5.0;
    const caseY = -8.0 - caseProgress * 6.5;
    const caseAngle = caseProgress * Math.PI * 1.8;

    ctx.translate(caseX, caseY);
    ctx.rotate(caseAngle);

    // 9mm brass casing
    ctx.fillStyle = '#F59E0B';
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(-2.0, -0.8, 4.0, 1.6, 0.4);
    ctx.fill();
    ctx.stroke();

    // Extractor groove & rim
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(-1.8, -0.5, 0.7, 1.0);
    ctx.restore();
  }

  // ── LAYER 10: REALISTIC MUZZLE FLASH BURST ──
  if (flashTimer > 0) {
    drawCjMuzzleFlash(ctx, barrelX + barrelLen + 2.0, 0, 1.25);
  }

  ctx.restore();
}

/**
 * Draws Authentic GTA San Andreas TEC-9 in 100% Discrete Pixel Art Style (Saitama Tech)
 */
export function drawCjPixelTec9(ctx, x = 0, y = 0, scale = 1.0, recoil = 0, flashTimer = 0) {
  ctx.save();
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const recoilOff = snap(recoil * 0.9);
  ctx.translate(snap(x - recoilOff), snap(y));
  ctx.scale(scale, scale);

  // 1. Long 32-Round Straight Steel Box Magazine
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(5, 5, 7, 30);
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(6, 6, 5, 28);
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(5, 33, 7, 2);

  // 2. Lower Receiver & Ergonomic Grip
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-8, 3, 11, 16);
  ctx.fillStyle = '#181B22'; // Black polymer frame
  ctx.fillRect(-7, 4, 9, 14);
  // Grip texture
  ctx.fillStyle = '#0F1116';
  ctx.fillRect(-6, 6, 7, 2);
  ctx.fillRect(-6, 10, 7, 2);
  ctx.fillRect(-6, 14, 7, 2);

  // Trigger Guard
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(2, 6, 5, 8);

  // 3. Tubular Upper Receiver & Perforated Heat Shroud
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-14, -6, 42, 11);
  ctx.fillStyle = '#334155'; // Parkerized steel finish
  ctx.fillRect(-13, -5, 40, 9);
  ctx.fillStyle = '#475569'; // Cylindrical highlight
  ctx.fillRect(-12, -4, 38, 2);

  // Perforated Barrel Shroud Cooling Holes (Discrete pixel dots)
  ctx.fillStyle = '#0E0F14';
  for (let hX = 14; hX <= 24; hX += 4) {
    ctx.fillRect(hX, -4, 2, 2);
    ctx.fillRect(hX + 2, -1, 2, 2);
    ctx.fillRect(hX, 2, 2, 2);
  }

  // Ejection Port
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-2, -3, 8, 4);
  ctx.fillStyle = '#D97706';
  ctx.fillRect(-1, -2, 6, 2);

  // 4. Threaded Barrel Extension Tip
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(27, -4, 8, 7);
  ctx.fillStyle = '#475569';
  ctx.fillRect(28, -3, 6, 5);
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(33, -2, 2, 3);

  // Front & Rear Sights
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(26, -8, 3, 3);
  ctx.fillRect(-13, -8, 3, 3);

  // 5. Muzzle Flash
  if (flashTimer > 0) {
    drawCjPixelMuzzleFlash(ctx, 36, -0.5, 1.25);
  }

  ctx.restore();
}

/**
 * Draws sharp, multi-petal starburst muzzle flash on Tec-9
 */
export function drawCjTec9MuzzleFlash(ctx, x, y, scale = 1.0) {
  if (_isDarkMode()) {
    drawCjPixelMuzzleFlash(ctx, x, y, scale * 1.2);
    return;
  }

  ctx.save();
  ctx.translate(x, y);

  const burstSize = 22 * scale;

  // 1. Fiery Orange/Amber Outer Starburst Spikes
  ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
  ctx.beginPath();
  ctx.moveTo(burstSize, 0);
  ctx.lineTo(burstSize * 0.38, -burstSize * 0.35);
  ctx.lineTo(burstSize * 0.15, -burstSize * 0.85);
  ctx.lineTo(-burstSize * 0.22, -burstSize * 0.38);
  ctx.lineTo(-burstSize * 0.55, 0);
  ctx.lineTo(-burstSize * 0.22, burstSize * 0.38);
  ctx.lineTo(burstSize * 0.15, burstSize * 0.85);
  ctx.lineTo(burstSize * 0.38, burstSize * 0.35);
  ctx.closePath();
  ctx.fill();

  // 2. Bright Golden Yellow Intermediate Core
  ctx.fillStyle = '#FBBF24';
  ctx.beginPath();
  ctx.moveTo(burstSize * 0.72, 0);
  ctx.lineTo(burstSize * 0.22, -burstSize * 0.52);
  ctx.lineTo(-burstSize * 0.35, 0);
  ctx.lineTo(burstSize * 0.22, burstSize * 0.52);
  ctx.closePath();
  ctx.fill();

  // 3. White-Hot Inner Core Diamond
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(burstSize * 0.48, 0);
  ctx.lineTo(0, -burstSize * 0.30);
  ctx.lineTo(-burstSize * 0.22, 0);
  ctx.lineTo(0, burstSize * 0.30);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

let _cachedTec9MagGrad = null;
let _cachedTec9FrameGrad = null;
let _cachedTec9TubeGrad = null;
let _cachedTec9ShroudGrad = null;
let _cachedTec9CapGrad = null;

function _initTec9Gradients(ctx) {
  if (_cachedTec9MagGrad) return;
  _cachedTec9MagGrad = ctx.createLinearGradient(-3, 0, 3, 0);
  _cachedTec9MagGrad.addColorStop(0.0, '#161B22');
  _cachedTec9MagGrad.addColorStop(0.35, '#2D3644');
  _cachedTec9MagGrad.addColorStop(0.70, '#161B22');
  _cachedTec9MagGrad.addColorStop(1.0, '#0C0E12');

  _cachedTec9FrameGrad = ctx.createLinearGradient(-16, 0, 14, 0);
  _cachedTec9FrameGrad.addColorStop(0.0, '#151820');
  _cachedTec9FrameGrad.addColorStop(0.35, '#242933');
  _cachedTec9FrameGrad.addColorStop(0.70, '#151820');
  _cachedTec9FrameGrad.addColorStop(1.0, '#0A0C0F');

  _cachedTec9TubeGrad = ctx.createLinearGradient(0, -8.8, 0, -0.6);
  _cachedTec9TubeGrad.addColorStop(0.00, '#252C36');
  _cachedTec9TubeGrad.addColorStop(0.18, '#4A5769');
  _cachedTec9TubeGrad.addColorStop(0.40, '#64748B');
  _cachedTec9TubeGrad.addColorStop(0.70, '#384454');
  _cachedTec9TubeGrad.addColorStop(1.00, '#1B2027');

  _cachedTec9ShroudGrad = ctx.createLinearGradient(0, -8.2, 0, -1.0);
  _cachedTec9ShroudGrad.addColorStop(0.00, '#11141A');
  _cachedTec9ShroudGrad.addColorStop(0.20, '#28303C');
  _cachedTec9ShroudGrad.addColorStop(0.50, '#181D24');
  _cachedTec9ShroudGrad.addColorStop(0.85, '#0E1015');
  _cachedTec9ShroudGrad.addColorStop(1.00, '#060709');

  _cachedTec9CapGrad = ctx.createLinearGradient(0, -6.8, 0, -2.0);
  _cachedTec9CapGrad.addColorStop(0, '#2E3744');
  _cachedTec9CapGrad.addColorStop(0.3, '#526075');
  _cachedTec9CapGrad.addColorStop(1, '#1B2027');
}

/**
 * Draws Authentic GTA: San Andreas TEC-9 Submachine Gun (Intratec TEC-9)
 * Faithful to GTA SA Urban-Gang Aesthetic & Real Firearm Architecture:
 * - Receiver and Barrel Jacket: Matte gunmetal gray with a slightly worn, parkerized steel finish, stamped-metal weld lines
 * - Furniture: Molded dark charcoal / black polymer for the lower frame and grip
 * - Details: Contrasting black barrel shroud with distinctive cooling perforations (holes)
 * Rule 11 (Zero shadowBlur) & Rule 20 Compliant
 */
export function drawCjTec9(ctx, x = 0, y = 0, scale = 1.0, recoil = 0, flashTimer = 0, opts = {}) {
  _initTec9Gradients(ctx);

  ctx.save();
  const recoilOffset = recoil * 0.9;
  const recoilClimb = -recoil * 0.018;

  ctx.translate(x - recoilOffset, y);
  if (recoil > 0) {
    ctx.rotate(recoilClimb);
  }
  ctx.scale(scale, scale);

  // ── LAYER 1: LONG 32-ROUND STRAIGHT BOX MAGAZINE (STAMPED STEEL) ──
  const magX = 7.2;
  const magTopY = 6.0;
  const magW = 6.0;
  const magH = 32.0;

  // Stamped Steel Body Gradient (Cached)
  ctx.fillStyle = _cachedTec9MagGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(magX - magW * 0.5, magTopY, magW, magH, 0.8);
  ctx.fill();
  ctx.stroke();

  // Vertical Stamped Central Stiffener Flute down the magazine body
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(magX, magTopY + 2.0);
  ctx.lineTo(magX, magTopY + magH - 2.5);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(magX + 0.6, magTopY + 2.0);
  ctx.lineTo(magX + 0.6, magTopY + magH - 2.5);
  ctx.stroke();

  // Steel Magazine Baseplate / Floorplate at bottom
  ctx.fillStyle = '#262D38';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(magX - (magW + 1.6) * 0.5, magTopY + magH - 0.5, magW + 1.6, 2.6, 0.8);
  ctx.fill();
  ctx.stroke();

  // Floorplate retention button dimple
  ctx.fillStyle = '#0C0E12';
  ctx.fillRect(magX - 0.8, magTopY + magH + 0.6, 1.6, 0.9);

  // ── LAYER 2: MOLDED DARK CHARCOAL / BLACK POLYMER LOWER RECEIVER FRAME ──
  // A. Horizontal Receiver Rail Base (Bridge beneath tubular receiver)
  ctx.fillStyle = _cachedTec9FrameGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-16.0, -1.2, 28.0, 5.0, [1.0, 1.0, 0, 0]);
  ctx.fill();
  ctx.stroke();

  // B. Forward Magazine Well Housing
  ctx.fillStyle = _cachedTec9FrameGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(2.8, -1.2, 9.2, 8.5, [0, 0, 1.5, 1.5]);
  ctx.fill();
  ctx.stroke();

  // Magwell Lower Flared Bevel Mouth Lip
  ctx.fillStyle = '#1A1E26';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(2.2, 6.2, 10.4, 1.6, 0.6);
  ctx.fill();
  ctx.stroke();

  // Front Takedown Pivot Pin / Screw Head (Dark Steel)
  ctx.fillStyle = '#374151';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(4.6, 1.2, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Screw Slot
  ctx.fillStyle = '#09090B';
  ctx.fillRect(3.8, 0.8, 1.6, 0.8);

  // Subtle Manufacturer Stamping "INTRATEC"
  ctx.fillStyle = 'rgba(100, 116, 139, 0.40)';
  ctx.font = '700 2.2px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('INTRATEC', 4.0, 4.2);

  // Magazine Release Catch Lever (behind magwell inside trigger guard)
  ctx.fillStyle = '#262D38';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(2.6, 7.2, 1.8, 3.2, 0.6);
  ctx.fill();
  ctx.stroke();

  // C. Molded Integral Trigger Guard Loop (Clean Rectangular Loop)
  ctx.strokeStyle = '#0F1217';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(2.6, 6.5);
  ctx.lineTo(2.6, 13.5);
  ctx.lineTo(-4.5, 13.5);
  ctx.lineTo(-4.5, 6.5);
  ctx.stroke();

  // Inner Dark Trigger Guard Void
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.moveTo(1.8, 6.5);
  ctx.lineTo(1.8, 12.2);
  ctx.lineTo(-3.6, 12.2);
  ctx.lineTo(-3.6, 6.5);
  ctx.closePath();
  ctx.fill();

  // Polished Curved Steel Trigger Blade inside
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-0.2, 6.0);
  ctx.quadraticCurveTo(-1.8, 8.8, -1.0, 11.2);
  ctx.stroke();

  // D. Ergonomic Swept-Back Pistol Grip (Molded Dark Charcoal Polymer)
  ctx.save();
  ctx.fillStyle = _cachedTec9FrameGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;

  // Grip Body Polygon (Sleek angle, front finger swell, flared base heel)
  ctx.beginPath();
  ctx.moveTo(-4.5, 6.5);     // Top front junction to trigger guard
  ctx.lineTo(-4.8, 13.5);    // Front strap upper
  ctx.lineTo(-7.2, 23.5);    // Front strap lower
  ctx.lineTo(-9.8, 25.5);    // Front toe
  ctx.lineTo(-17.2, 24.0);   // Flared base heel
  ctx.lineTo(-14.8, 13.0);   // Backstrap palm swell
  ctx.lineTo(-11.5, 2.0);    // Beavertail under receiver
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Recessed Textured Diamond Checkering Panel with Strict Clipping
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-5.5, 13.5);
  ctx.lineTo(-7.2, 22.0);
  ctx.lineTo(-14.8, 21.0);
  ctx.lineTo(-13.0, 13.5);
  ctx.closePath();
  ctx.fillStyle = '#0A0C0F';
  ctx.fill();
  ctx.clip(); // STRICT CLIPPING: Texture lines will NEVER bleed outside this panel!

  // Checkering Grid Lines (Clean 45-degree cross-hatch)
  ctx.strokeStyle = '#1E242E';
  ctx.lineWidth = 0.6;
  for (let gy = 11.0; gy <= 25.0; gy += 1.8) {
    ctx.beginPath();
    ctx.moveTo(-16.0, gy);
    ctx.lineTo(-4.0, gy + 4.0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-16.0, gy + 4.0);
    ctx.lineTo(-4.0, gy);
    ctx.stroke();
  }
  ctx.restore();

  // Subtle Border around Checkering Panel
  ctx.strokeStyle = '#242933';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-5.5, 13.5);
  ctx.lineTo(-7.2, 22.0);
  ctx.lineTo(-14.8, 21.0);
  ctx.lineTo(-13.0, 13.5);
  ctx.closePath();
  ctx.stroke();

  // Molded Intratec Medallion Logo (in upper section of grip)
  const logoX = -10.2;
  const logoY = 8.5;
  ctx.fillStyle = '#0A0C0F';
  ctx.strokeStyle = '#2E3744';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(logoX, logoY, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Stylized Intratec "T" / Crosshair Mark
  ctx.strokeStyle = '#55647A';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(logoX, logoY, 1.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(logoX - 1.2, logoY - 0.5);
  ctx.lineTo(logoX + 1.2, logoY - 0.5);
  ctx.moveTo(logoX, logoY - 0.5);
  ctx.lineTo(logoX, logoY + 1.2);
  ctx.stroke();

  ctx.restore();

  // ── LAYER 3: UPPER WORN MATTE GUNMETAL GRAY PARKERIZED STEEL RECEIVER ──
  const recLeftX = -17.5;
  const recRightX = 12.5;
  const recTopY = -8.8;
  const recH = 8.2;

  // Stamped-Metal Tubular Receiver (Cached)
  ctx.fillStyle = _cachedTec9TubeGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(recLeftX, recTopY, recRightX - recLeftX, recH, [2.0, 0, 0, 1.5]);
  ctx.fill();
  ctx.stroke();

  // Visible Stamped-Metal Weld Seam Line along the tubular receiver
  ctx.strokeStyle = '#090B0E';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(recLeftX + 3.0, recTopY + 2.2);
  ctx.lineTo(recRightX - 1.0, recTopY + 2.2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'; // Industrial weld glint
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(recLeftX + 3.0, recTopY + 1.8);
  ctx.lineTo(recRightX - 1.0, recTopY + 1.8);
  ctx.stroke();

  // Rear Threaded Receiver End Cap with Knurling
  ctx.fillStyle = '#252C36';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(recLeftX - 1.5, recTopY - 0.5, 3.8, recH + 1.0, 1.2);
  ctx.fill();
  ctx.stroke();

  // Vertical Knurling Ribs on End Cap
  ctx.fillStyle = '#526075';
  ctx.fillRect(recLeftX - 0.8, recTopY + 1.0, 0.8, recH - 2.0);
  ctx.fillRect(recLeftX + 0.6, recTopY + 1.0, 0.8, recH - 2.0);

  // Rear Iron Notch Sight Post (Stamped Sheet Metal)
  ctx.fillStyle = '#161B22';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(recLeftX + 2.0, recTopY);
  ctx.lineTo(recLeftX + 2.0, recTopY - 3.2);
  ctx.lineTo(recLeftX + 5.5, recTopY - 3.2);
  ctx.lineTo(recLeftX + 5.5, recTopY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Top Charging Handle / Round Cocking Knob with Stem
  ctx.fillStyle = '#09090B';
  // Cocking Slide Slot in Receiver
  ctx.fillRect(-6.5, recTopY, 8.5, 1.8);

  const boltRecoilOffset = recoil * 1.5;
  const knobX = -3.2 - boltRecoilOffset;

  // Handle Stem (Dark Steel)
  ctx.fillStyle = '#2E3744';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.9;
  ctx.fillRect(knobX - 1.0, recTopY - 4.5, 2.0, 5.0);
  ctx.strokeRect(knobX - 1.0, recTopY - 4.5, 2.0, 5.0);

  // Knurled Round Knob Top (Worn Gunmetal Steel)
  ctx.fillStyle = '#526075';
  ctx.strokeStyle = '#1E242E';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(knobX, recTopY - 5.0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Specular Highlight Glint on Knob
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(knobX - 0.8, recTopY - 6.2, 1.4, 0.9);

  // Right-Side Ejection Port & Reciprocating Steel Bolt
  const ejectX = -2.0;
  const ejectW = 8.5;
  const ejectH = 4.0;
  const ejectY = recTopY + 2.2;

  // Stamped Ejection Port Cutout
  ctx.fillStyle = '#020617';
  ctx.strokeStyle = '#252C36';
  ctx.lineWidth = 0.8;
  ctx.fillRect(ejectX, ejectY, ejectW, ejectH);
  ctx.strokeRect(ejectX, ejectY, ejectW, ejectH);

  // Reciprocating Industrial Steel Bolt Face inside Ejection Port
  const boltX = ejectX - boltRecoilOffset;
  ctx.fillStyle = '#64748B';
  ctx.fillRect(Math.max(ejectX, boltX), ejectY + 0.4, Math.min(ejectW, ejectW + boltRecoilOffset), ejectH - 0.8);

  // Brass Extractor Rim Glint inside
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(Math.max(ejectX, boltX + 3.0), ejectY + 1.2, 2.4, 1.6);

  // ── LAYER 4: CONTRASTING MATTE BLACK PERFORATED BARREL SHROUD ──
  const shroudLeftX = 12.5;
  const shroudRightX = 40.5;
  const shroudTopY = -8.2;
  const shroudH = 7.2;

  // Shroud Collar Weld Ring & Intermediate Sight Boss
  ctx.fillStyle = '#161B22';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.fillRect(shroudLeftX - 0.5, shroudTopY - 0.5, 2.8, shroudH + 1.0);
  ctx.strokeRect(shroudLeftX - 0.5, shroudTopY - 0.5, 2.8, shroudH + 1.0);

  // Intermediate sling loop / sight collar boss
  ctx.fillStyle = '#2E3744';
  ctx.fillRect(shroudLeftX + 0.2, shroudTopY - 2.5, 1.8, 2.5);

  // Main Cylindrical Perforated Shroud Body (Contrasting Matte Black Oxide Finish - Cached)
  ctx.fillStyle = _cachedTec9ShroudGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(shroudLeftX, shroudTopY, shroudRightX - shroudLeftX, shroudH, 1.0);
  ctx.fill();
  ctx.stroke();

  // 3 STAGGERED ROWS OF CIRCULAR COOLING HOLES (Authentic TEC-9 Perforations)
  // Row 1 (Upper Row)
  const row1Xs = [17.0, 21.0, 25.0, 29.0, 33.0, 37.0];
  const row1Y = shroudTopY + 1.6;
  // Row 2 (Middle Row - Staggered)
  const row2Xs = [15.0, 19.0, 23.0, 27.0, 31.0, 35.0, 39.0];
  const row2Y = shroudTopY + shroudH * 0.5;
  // Row 3 (Lower Row)
  const row3Xs = [17.0, 21.0, 25.0, 29.0, 33.0, 37.0];
  const row3Y = shroudTopY + shroudH - 1.6;

  // Draw inner dark holes with cold steel barrel depth underneath
  const allHoles = [
    ...row1Xs.map(hx => ({ x: hx, y: row1Y, r: 1.15 })),
    ...row2Xs.map(hx => ({ x: hx, y: row2Y, r: 1.35 })),
    ...row3Xs.map(hx => ({ x: hx, y: row3Y, r: 1.15 }))
  ];

  for (let i = 0; i < allHoles.length; i++) {
    const h = allHoles[i];
    // Dark Hole Cavity
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
    ctx.fill();

    // Cold Steel Inner Barrel Glimpse
    ctx.fillStyle = '#3E4A5C';
    ctx.beginPath();
    ctx.arc(h.x + 0.2, h.y - 0.2, h.r * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Outer Bezel Rim Glint
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
  }

  // Front Blade Sight Post (on top of shroud near muzzle)
  ctx.fillStyle = '#161B22';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(37.5, shroudTopY);
  ctx.lineTo(37.5, shroudTopY - 3.5);
  ctx.lineTo(39.8, shroudTopY - 3.5);
  ctx.lineTo(39.8, shroudTopY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // White Dot on Front Sight Blade
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(38.0, shroudTopY - 3.0, 1.2, 1.2);

  // ── LAYER 5: STEPPED THREADED BARREL TIP & 9MM MUZZLE CROWN ──
  const barrelTipX = shroudRightX;
  const barrelTipW = 8.5;
  const barrelTipTopY = -6.2;
  const barrelTipH = 3.6;

  // Protruding Barrel Tube (Dark Worn Steel)
  ctx.fillStyle = '#252C36';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.fillRect(barrelTipX, barrelTipTopY, barrelTipW, barrelTipH);
  ctx.strokeRect(barrelTipX, barrelTipTopY, barrelTipW, barrelTipH);

  // Threaded Muzzle Cap / Protector Collar (Matte Dark Steel - Cached)
  const capX = barrelTipX + 3.5;
  const capW = 5.0;
  const capTopY = -6.8;
  const capH = 4.8;

  ctx.fillStyle = _cachedTec9CapGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(capX, capTopY, capW, capH, 0.8);
  ctx.fill();
  ctx.stroke();

  // Thread Knurling Rings on Cap
  ctx.fillStyle = '#11141A';
  ctx.fillRect(capX + 1.2, capTopY + 0.6, 0.8, capH - 1.2);
  ctx.fillRect(capX + 2.8, capTopY + 0.6, 0.8, capH - 1.2);

  // Dark 9mm Muzzle Bore Opening Crown
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.ellipse(barrelTipX + barrelTipW, 0, 0.7, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── LAYER 6: FLYING EJECTED BRASS CASING PARTICLE ──
  if (flashTimer > 0) {
    ctx.save();
    const caseProgress = (3 - flashTimer) / 3;
    const caseX = ejectX + 4.0 + caseProgress * 5.5;
    const caseY = ejectY - 4.0 - caseProgress * 6.5;
    const caseAngle = caseProgress * Math.PI * 1.8;

    ctx.translate(caseX, caseY);
    ctx.rotate(caseAngle);

    // 9mm brass casing
    ctx.fillStyle = '#F59E0B';
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(-2.0, -0.8, 4.0, 1.6, 0.4);
    ctx.fill();
    ctx.stroke();

    // Extractor groove & rim
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(-1.8, -0.5, 0.7, 1.0);
    ctx.restore();
  }

  // ── LAYER 7: REALISTIC STARBURST MUZZLE FLASH ──
  if (flashTimer > 0) {
    drawCjTec9MuzzleFlash(ctx, barrelTipX + barrelTipW + 2.0, -4.4, 1.35);
  }

  ctx.restore();
}

/**
 * Standalone Intratec TEC-9 renderer for Weapon Studio / UI screens & in-game Weapon Detail
 */
export function drawCjTec9Weapon(ctx, x = 0, y = 0, gunAngle = 0, r = 25, opts = {}) {
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
      scale = (opts && opts.scale) ? opts.scale : 1.35;
    } else if (typeof r === 'object') {
      opts = r;
      scale = opts.scale || 1.0;
    }
  }

  const recoil = (opts && opts.recoil) ? opts.recoil : 0;
  const flashTimer = (opts && opts.flashTimer) ? opts.flashTimer : 0;

  ctx.translate(posX, posY);
  ctx.rotate(angle);
  drawCjTec9(ctx, 0, 0, scale, recoil, flashTimer, opts);
  ctx.restore();
}

/**
 * Standalone IMI Micro-Uzi renderer for Weapon Studio / UI screens & in-game Weapon Detail
 */
export function drawCjMicroUziWeapon(ctx, x = 0, y = 0, gunAngle = 0, r = 25, opts = {}) {
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
      scale = (opts && opts.scale) ? opts.scale : 1.35;
    } else if (typeof r === 'object') {
      opts = r;
      scale = opts.scale || 1.0;
    }
  }

  const recoil = (opts && opts.recoil) ? opts.recoil : 0;
  const flashTimer = (opts && opts.flashTimer) ? opts.flashTimer : 0;

  ctx.translate(posX, posY);
  ctx.rotate(angle);
  drawCjMicroUzi(ctx, 0, 0, scale, recoil, flashTimer);
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
 * Standalone DARPA Area 69 Jetpack renderer for Weapon Studio / UI screens
 * Accurately designed from the authentic GTA San Andreas 3D reference model:
 * - Wide Glossy Black Overhead Cross-Pipe Manifold with Riser Block
 * - Dual Downward-Facing Thrust Nozzles with Bronze/Copper Metallic Rings
 * - Dual Brushed Chrome/Silver Fuel Tanks with Rounded Capsule Domes
 * - Vertical Cyan Fuel Gauge Sight Windows with Chrome Bevels
 * - Olive-Drab Military Green Center Console with Dual Control Bays
 * - Authentic Diagonal Red/Black Hazard Caution Stripe Emblem
 * - Multi-colored Instrument LEDs & Pushbuttons (Red, Amber, Cyan, Green)
 * - Copper/Brass Curved Wiring Conduits
 * - Left-side Ergonomic Throttle Arm with Joystick Flight Grip
 * Rule 11 Compliant (Zero shadowBlur CPU filters)
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

  // ── LAYER 0: REAR HARNESS & MATTE INDUSTRIAL SILVER / BRUSHED ALUMINUM BACKING FRAME ──
  const frameGrad = ctx.createLinearGradient(-24, -20, 24, 26);
  frameGrad.addColorStop(0.00, '#64748B'); // Brushed aluminum dark edge
  frameGrad.addColorStop(0.25, '#94A3B8');
  frameGrad.addColorStop(0.50, '#CBD5E1'); // Metallic silver sheen
  frameGrad.addColorStop(0.80, '#94A3B8');
  frameGrad.addColorStop(1.00, '#475569');

  ctx.fillStyle = frameGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.roundRect(-24, -20, 48, 46, 4);
  ctx.fill();
  ctx.stroke();

  // Visible Metallic Structural Panels & Weld Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-22, 2);
  ctx.lineTo(22, 2);
  ctx.stroke();

  // Dark-Tan Leather Harness Straps with Heavy Buckles (Crossing Backplate)
  ctx.fillStyle = '#784B28'; // Dark-tan leather strap
  ctx.strokeStyle = '#3D2514';
  ctx.lineWidth = 1.0;
  ctx.fillRect(-22, -18, 44, 4.0);
  ctx.strokeRect(-22, -18, 44, 4.0);
  ctx.fillRect(-22, 18, 44, 4.0);
  ctx.strokeRect(-22, 18, 44, 4.0);

  // Heavy Silver Harness Buckles
  ctx.fillStyle = '#E2E8F0';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.fillRect(-18, -19, 5.0, 6.0);
  ctx.strokeRect(-18, -19, 5.0, 6.0);
  ctx.fillRect(13, -19, 5.0, 6.0);
  ctx.strokeRect(13, -19, 5.0, 6.0);

  // Central Vertical Manifold Riser Block (Matte Brushed Aluminum)
  const riserGrad = ctx.createLinearGradient(-5, 0, 5, 0);
  riserGrad.addColorStop(0.0, '#64748B');
  riserGrad.addColorStop(0.5, '#CBD5E1');
  riserGrad.addColorStop(1.0, '#475569');
  ctx.fillStyle = riserGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.6;
  ctx.fillRect(-5, -28, 10, 10);
  ctx.strokeRect(-5, -28, 10, 10);

  // ── LAYER 1: DUAL MUTED OLIVE DRAB / MILITARY GREEN FUEL TANKS ──
  const tankW = 16.0;
  const tankH = 54.0;
  const tankTopY = -22.0;
  const tankBtmY = tankTopY + tankH;
  const tankXs = [-25.0, 9.0]; // Left and Right Tank X coordinates

  for (let i = 0; i < tankXs.length; i++) {
    const tX = tankXs[i];
    const isLeft = (i === 0);

    // Curved Silver Feeder Tube from Tank Dome to Top Manifold (with black outline)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tX + tankW * 0.5, tankTopY);
    ctx.quadraticCurveTo(tX + tankW * 0.5, tankTopY - 6, (isLeft ? -4 : 4), -26);
    ctx.stroke();

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // 3D Muted Olive Drab / Military Green Cylinder Gradient
    const tankGrad = ctx.createLinearGradient(tX, 0, tX + tankW, 0);
    tankGrad.addColorStop(0.00, '#2E381C'); // Shadowed olive drab
    tankGrad.addColorStop(0.18, '#44542A'); // Military olive body
    tankGrad.addColorStop(0.40, '#657B3E'); // Top specular military sheen
    tankGrad.addColorStop(0.70, '#44542A'); // Matte green
    tankGrad.addColorStop(1.00, '#1D2411'); // Dark underside shadow

    ctx.fillStyle = tankGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(tX, tankTopY, tankW, tankH, 8.0);
    ctx.fill();
    ctx.stroke();

    // Top Dome Specular Arc Highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(tX + tankW * 0.5, tankTopY + 7.5, 5.5, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Vertical Cyan Sight Glass Fuel Gauge Slot
    const glassX = isLeft ? (tX + 2.5) : (tX + tankW - 6.5);
    const glassY = tankTopY + 14;
    const glassW = 4.0;
    const glassH = 26.0;

    // Recessed Dark Housing
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(glassX, glassY, glassW, glassH, 1.8);
    ctx.fill();
    ctx.stroke();

    // Glowing Cyan Fuel Column
    const fuelGrad = ctx.createLinearGradient(glassX, glassY, glassX + glassW, glassY);
    fuelGrad.addColorStop(0.0, '#0284C7');
    fuelGrad.addColorStop(0.5, '#38BDF8');
    fuelGrad.addColorStop(1.0, '#7DD3FC');
    ctx.fillStyle = fuelGrad;
    ctx.fillRect(glassX + 0.6, glassY + 0.6, glassW - 1.2, glassH - 1.2);

    // White Glint Line on Glass
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(glassX + 0.9, glassY + 2.0, 0.8, glassH - 4.0);

    // Dark Canvas Strap with Heavy Buckles
    const strapY = tankTopY + 9.5;
    const strapH = 6.5;
    const strapGrad = ctx.createLinearGradient(tX - 1, 0, tX + tankW + 1, 0);
    strapGrad.addColorStop(0, '#181B14');
    strapGrad.addColorStop(0.4, '#2B3024');
    strapGrad.addColorStop(1, '#11140E');

    ctx.fillStyle = strapGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.8;
    ctx.fillRect(tX - 1.2, strapY, tankW + 2.4, strapH);
    ctx.strokeRect(tX - 1.2, strapY, tankW + 2.4, strapH);

    // Heavy Silver Buckle Clasp
    ctx.fillStyle = '#CBD5E1';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.8;
    ctx.fillRect(tX + 2.5, strapY + 1.2, 4.0, strapH - 2.4);
    ctx.strokeRect(tX + 2.5, strapY + 1.2, 4.0, strapH - 2.4);
    ctx.fillRect(tX + tankW - 6.5, strapY + 1.2, 4.0, strapH - 2.4);
    ctx.strokeRect(tX + tankW - 6.5, strapY + 1.2, 4.0, strapH - 2.4);
  }

  // ── LAYER 2: CENTRAL OLIVE-DRAB AVIONICS & CONTROL MODULE ──
  const boxW = 20.0;
  const boxH = 48.0;
  const boxX = -boxW * 0.5;
  const boxY = -16.0;

  const boxGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
  boxGrad.addColorStop(0.0, '#44542A');
  boxGrad.addColorStop(0.5, '#3B4824');
  boxGrad.addColorStop(1.0, '#242C16');

  ctx.fillStyle = boxGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 2.5);
  ctx.fill();
  ctx.stroke();

  // 4 Copper/Brass Curved Wiring Conduits / Brackets connecting Box to Tanks
  const copperYs = [boxY + 18, boxY + 24];
  for (const cY of copperYs) {
    // Left Copper Bracket
    const cGradL = ctx.createLinearGradient(boxX - 4, cY, boxX, cY);
    cGradL.addColorStop(0, '#B45309');
    cGradL.addColorStop(0.5, '#F59E0B');
    cGradL.addColorStop(1, '#92400E');
    ctx.fillStyle = cGradL;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.4;
    ctx.fillRect(boxX - 4.0, cY - 1.5, 4.5, 3.0);
    ctx.strokeRect(boxX - 4.0, cY - 1.5, 4.5, 3.0);

    // Right Copper Bracket
    const cGradR = ctx.createLinearGradient(boxX + boxW, cY, boxX + boxW + 4, cY);
    cGradR.addColorStop(0, '#92400E');
    cGradR.addColorStop(0.5, '#F59E0B');
    cGradR.addColorStop(1, '#B45309');
    ctx.fillStyle = cGradR;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.4;
    ctx.fillRect(boxX + boxW - 0.5, cY - 1.5, 4.5, 3.0);
    ctx.strokeRect(boxX + boxW - 0.5, cY - 1.5, 4.5, 3.0);
  }

  // A. Upper Instrument Section Bay
  const upperBayX = boxX + 2.0;
  const upperBayY = boxY + 2.5;
  const upperBayW = boxW - 4.0;
  const upperBayH = 15.0;

  ctx.fillStyle = '#1D2411';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.fillRect(upperBayX, upperBayY, upperBayW, upperBayH);
  ctx.strokeRect(upperBayX, upperBayY, upperBayW, upperBayH);

  // White Status Display Monitor
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.fillRect(upperBayX + 2.0, upperBayY + 2.0, upperBayW - 4.0, 3.2);
  ctx.strokeRect(upperBayX + 2.0, upperBayY + 2.0, upperBayW - 4.0, 3.2);

  // Red Rectangular Command Button
  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.9;
  ctx.fillRect(upperBayX + 2.0, upperBayY + 6.8, 6.5, 3.0);
  ctx.strokeRect(upperBayX + 2.0, upperBayY + 6.8, 6.5, 3.0);

  // Status LED Array (Amber, Cyan, Green)
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(upperBayX + 2.0, upperBayY + 11.0, 2.8, 2.2);
  ctx.fillStyle = '#06B6D4';
  ctx.fillRect(upperBayX + 5.6, upperBayY + 11.0, 2.8, 2.2);
  ctx.fillStyle = '#10B981';
  ctx.fillRect(upperBayX + 9.2, upperBayY + 11.0, 2.8, 2.2);

  // B. Center Authentic Red/Black Caution Hazard Warning Sticker
  const hazX = boxX + 3.5;
  const hazY = boxY + 19.5;
  const hazW = boxW - 7.0;
  const hazH = 12.0;

  ctx.save();
  ctx.beginPath();
  ctx.rect(hazX, hazY, hazW, hazH);
  ctx.clip();

  // Solid Red Base
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(hazX, hazY, hazW, hazH);

  // Bold Black Diagonal Stripes
  ctx.fillStyle = '#111827';
  for (let sx = -hazW * 2; sx <= hazW * 3; sx += 4.5) {
    ctx.beginPath();
    ctx.moveTo(hazX + sx, hazY);
    ctx.lineTo(hazX + sx + 3.0, hazY);
    ctx.lineTo(hazX + sx + 3.0 - 5.0, hazY + hazH);
    ctx.lineTo(hazX + sx - 5.0, hazY + hazH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(hazX, hazY, hazW, hazH);

  // C. Lower Switch Section Bay
  const lowerBayX = boxX + 2.0;
  const lowerBayY = boxY + 33.5;
  const lowerBayW = boxW - 4.0;
  const lowerBayH = 12.0;

  ctx.fillStyle = '#1D2411';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.fillRect(lowerBayX, lowerBayY, lowerBayW, lowerBayH);
  ctx.strokeRect(lowerBayX, lowerBayY, lowerBayW, lowerBayH);

  // 3 Stacked Rectangular Pushbuttons (Red, Red, Gold)
  const swColors = ['#DC2626', '#DC2626', '#EAB308'];
  for (let sIdx = 0; sIdx < swColors.length; sIdx++) {
    const sY = lowerBayY + 1.8 + sIdx * 3.4;
    ctx.fillStyle = swColors[sIdx];
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.9;
    ctx.fillRect(lowerBayX + 2.5, sY, lowerBayW - 5.0, 2.2);
    ctx.strokeRect(lowerBayX + 2.5, sY, lowerBayW - 5.0, 2.2);
  }

  // ── LAYER 3: TOP OVERHEAD EXHAUST MANIFOLD (Dark Charcoal / Burnt-Metal Steel Cross-Pipe) ──
  const archLeftX = -38.0;
  const archRightX = 38.0;
  const archTopY = -34.0;
  const elbowY = -14.0;

  // 1. Pipe Black Outer Outline Stroke Underlayer
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 13.0;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(archLeftX, elbowY);
  ctx.quadraticCurveTo(archLeftX, archTopY, 0, archTopY);
  ctx.quadraticCurveTo(archRightX, archTopY, archRightX, elbowY);
  ctx.stroke();

  // 2. Main Dark Charcoal / Burnt-Metal Steel Pipe Body
  const pipeGrad = ctx.createLinearGradient(archLeftX, 0, archRightX, 0);
  pipeGrad.addColorStop(0.0, '#1C1E24');
  pipeGrad.addColorStop(0.25, '#3B424D');
  pipeGrad.addColorStop(0.5, '#16191F');
  pipeGrad.addColorStop(0.75, '#3B424D');
  pipeGrad.addColorStop(1.0, '#1C1E24');

  ctx.strokeStyle = pipeGrad;
  ctx.lineWidth = 8.5;
  ctx.beginPath();
  ctx.moveTo(archLeftX, elbowY);
  ctx.quadraticCurveTo(archLeftX, archTopY, 0, archTopY);
  ctx.quadraticCurveTo(archRightX, archTopY, archRightX, elbowY);
  ctx.stroke();

  // 3. Specular Highlight Center Curve
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(archLeftX + 2, elbowY - 2);
  ctx.quadraticCurveTo(archLeftX + 2, archTopY + 2, 0, archTopY + 2);
  ctx.quadraticCurveTo(archRightX - 2, archTopY + 2, archRightX - 2, elbowY - 2);
  ctx.stroke();

  // ── LAYER 4: DOWNWARD-FACING THRUSTER NOZZLES (Burnt-Metal Steel & Heat-Treated Rings) ──
  const nozzleXs = [archLeftX, archRightX];

  for (let n = 0; n < nozzleXs.length; n++) {
    const nX = nozzleXs[n];

    // A. Heat-Treated Burnt Bronze/Steel Collar Ring
    const ringW = 9.0;
    const ringH = 5.0;
    const ringY = elbowY;
    const ringGrad = ctx.createLinearGradient(nX - ringW * 0.5, 0, nX + ringW * 0.5, 0);
    ringGrad.addColorStop(0.0, '#78350F');
    ringGrad.addColorStop(0.35, '#D97706');
    ringGrad.addColorStop(0.7, '#92400E');
    ringGrad.addColorStop(1.0, '#451A03');

    ctx.fillStyle = ringGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(nX - ringW * 0.5, ringY, ringW, ringH, 1.2);
    ctx.fill();
    ctx.stroke();

    // B. Tapered Dark Charcoal / Burnt Steel Nozzle Cone
    const coneTopW = 8.2;
    const coneBtmW = 5.2;
    const coneTopY = ringY + ringH;
    const coneH = 8.0;
    const coneBtmY = coneTopY + coneH;

    const coneGrad = ctx.createLinearGradient(nX - coneTopW * 0.5, 0, nX + coneTopW * 0.5, 0);
    coneGrad.addColorStop(0.0, '#1C1E24');
    coneGrad.addColorStop(0.35, '#3F4654');
    coneGrad.addColorStop(0.7, '#2A303C');
    coneGrad.addColorStop(1.0, '#121418');

    ctx.fillStyle = coneGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(nX - coneTopW * 0.5, coneTopY);
    ctx.lineTo(nX + coneTopW * 0.5, coneTopY);
    ctx.lineTo(nX + coneBtmW * 0.5, coneBtmY);
    ctx.lineTo(nX - coneBtmW * 0.5, coneBtmY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Open Exhaust Rim
    ctx.fillStyle = '#09090B';
    ctx.beginPath();
    ctx.ellipse(nX, coneBtmY, coneBtmW * 0.5, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // ── LAYER 5: LEFT-SIDE THROTTLE EXTENSION ARM & FLIGHT STICK (Reference Image 2 & 3) ──
  ctx.save();
  // Structural Curved Olive-Drab Arm
  const armGrad = ctx.createLinearGradient(-26, 10, -48, 22);
  armGrad.addColorStop(0.0, '#4D5824');
  armGrad.addColorStop(0.5, '#5E6B2C');
  armGrad.addColorStop(1.0, '#343C18');

  ctx.fillStyle = armGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-25, 10);
  ctx.quadraticCurveTo(-36, 12, -47, 21);
  ctx.lineTo(-47, 26);
  ctx.quadraticCurveTo(-36, 17, -25, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Side Avionics Switch Box
  ctx.fillStyle = '#22280F';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.fillRect(-41, 14, 7.5, 9.0);
  ctx.strokeRect(-41, 14, 7.5, 9.0);

  // Red & Cyan Instrument Buttons on Arm
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(-39.5, 15.5, 4.5, 2.2);
  ctx.fillStyle = '#06B6D4';
  ctx.fillRect(-39.5, 19.2, 4.5, 2.2);

  // Flight Control Stick (Grip Handle & Thumb Trigger)
  const gripX = -49.0;
  const gripTopY = 8.0;
  const gripH = 15.0;

  ctx.fillStyle = '#18181B';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(gripX - 2.5, gripTopY, 5.0, gripH, 2.0);
  ctx.fill();
  ctx.stroke();

  // Grip Rib Texture
  ctx.strokeStyle = '#3F3F46';
  ctx.lineWidth = 0.8;
  for (let g = 0; g < 3; g++) {
    const gy = gripTopY + 4 + g * 3;
    ctx.beginPath();
    ctx.moveTo(gripX - 2, gy);
    ctx.lineTo(gripX + 2, gy);
    ctx.stroke();
  }

  // Red Top Thumb Button
  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(gripX, gripTopY - 0.5, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  ctx.restore();
}

/**
 * Draws Authentic GTA San Andreas M134 Minigun in 100% Discrete Pixel Art Style (Saitama Tech)
 * Faithful to GTA SA Mid-2000s Heavy Military Industrial Aesthetic:
 * - Receiver and Housing: Matte military olive-drab with charcoal steel armor reinforcement plates
 * - Underslung Drive Motor Pod: Olive-drab body with stator cooling vents, endcaps, and latch clamp
 * - Heavy Ammo Feed Chute: Flexible segmented canvas belt with brass 7.62mm linked cartridges
 * - 6-Barrel Gatling Cluster: Mathematical 3D rotating cylinder with depth sorting, specular flutes,
 *   3 heavy clamp rings with tension bolts, and burnt heat-treated / incandescent molten tips
 * - Ergonomic Rear Chainsaw Joystick Spade Grip: Scalloped finger grooves, red toggle horn, status LED
 * - Overhead Horizontal Bridge Support Strut & Forward Carry Handle Loop Bracket with mounting pins
 * - Tumbling Spent Brass Casings & Disintegrating Link Clips when firing
 * - Multi-tier Rotational Pixel Starburst Muzzle Flash with blast sparks and gas venting
 */
export function drawCjPixelMinigun(ctx, x = 0, y = 0, gunAngle = 0, r = 25, opts = {}) {
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

  const recoil = (opts && opts.recoil) ? opts.recoil : 0;
  const flashTimer = (opts && opts.flashTimer) ? opts.flashTimer : 0;
  const heat = (opts && opts.heat) ? Math.min(1.0, Math.max(0, opts.heat)) : 0;
  const spinAngle = (opts && opts.spinAngle !== undefined) ? opts.spinAngle : (flashTimer > 0 ? (Date.now() * 0.02) : 0);

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const recoilOff = snap(recoil * 1.1);
  ctx.translate(snap(posX - recoilOff), snap(posY));
  if (angle !== 0) ctx.rotate(angle);
  ctx.scale(scale, scale);

  // ── LAYER 0: UNDERSLUNG DRIVE MOTOR POD & HEAVY AMMO FEED CHUTE ──
  const motorX = -8;
  const motorY = 4;
  const motorW = 22;
  const motorH = 10;

  // Flexible Canvas Ammo Feed Chute (Curved down-left)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-32, 4, 26, 12);
  ctx.fillRect(-28, 14, 18, 6);

  // Canvas Outer Belt
  ctx.fillStyle = '#1E2515'; // Dark military canvas green
  ctx.fillRect(-30, 6, 22, 8);
  ctx.fillRect(-26, 14, 14, 4);

  // Articulated Metallic Steel Link Clips & 7.62mm Brass Rounds
  const chuteRounds = [
    { x: -28, y: 6 },
    { x: -22, y: 8 },
    { x: -16, y: 10 },
    { x: -10, y: 12 }
  ];
  for (let c = 0; c < chuteRounds.length; c++) {
    const cr = chuteRounds[c];
    // Brass cartridge
    ctx.fillStyle = '#D97706';
    ctx.fillRect(cr.x, cr.y, 4, 6);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(cr.x + 1, cr.y + 1, 2, 4);
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(cr.x + 1, cr.y + 1, 1, 2);
    // Steel link clip
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(cr.x + 3, cr.y - 1, 2, 8);
    ctx.fillStyle = '#475569';
    ctx.fillRect(cr.x + 3, cr.y, 1, 6);
  }

  // Cylindrical Motor Pod Body (Matte Military Olive-Drab)
  ctx.fillStyle = '#0B0D12'; // Dark outline
  ctx.fillRect(motorX - 1, motorY - 1, motorW + 2, motorH + 2);

  ctx.fillStyle = '#2C361C'; // Matte olive drab body
  ctx.fillRect(motorX, motorY, motorW, motorH);

  // Motor top specular highlight
  ctx.fillStyle = '#4A5A2F';
  ctx.fillRect(motorX + 2, motorY, motorW - 4, 2);
  ctx.fillStyle = '#5C703A';
  ctx.fillRect(motorX + 4, motorY, motorW - 8, 1);

  // Motor underside deep shadow
  ctx.fillStyle = '#161D0E';
  ctx.fillRect(motorX, motorY + motorH - 2, motorW, 2);

  // Stator Cooling Vents & Internal Coils
  ctx.fillStyle = '#11160C';
  ctx.fillRect(motorX + 4, motorY + 2, motorW - 8, motorH - 4);
  for (let vx = motorX + 5; vx < motorX + motorW - 5; vx += 3) {
    ctx.fillStyle = '#B45309'; // Copper armature coil glimpse
    ctx.fillRect(vx, motorY + 3, 1, motorH - 6);
    ctx.fillStyle = '#364323'; // Olive stator rib
    ctx.fillRect(vx + 1, motorY + 2, 1, motorH - 4);
  }

  // Charcoal Steel End Caps
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(motorX, motorY, 3, motorH);
  ctx.fillRect(motorX + motorW - 3, motorY, 3, motorH);
  ctx.fillStyle = '#475569';
  ctx.fillRect(motorX + motorW - 3, motorY, 1, motorH);

  // Motor Center Clamp Band & Silver Latch
  ctx.fillStyle = '#2A323D';
  ctx.fillRect(motorX + 9, motorY - 1, 3, motorH + 2);
  ctx.fillStyle = '#E2E8F0'; // Silver Latch
  ctx.fillRect(motorX + 10, motorY + 2, 2, 3);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(motorX + 10, motorY + 2, 1, 1);

  // ── LAYER 1: REAR CHASSIS SUPPORT BARS & TERMINAL BRACKET ──
  // Dual Lower Support Rods (Charcoal Steel)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-36, -3, 20, 4);
  ctx.fillRect(-36, 3, 20, 4);

  ctx.fillStyle = '#1E232B';
  ctx.fillRect(-35, -2, 18, 2);
  ctx.fillRect(-35, 4, 18, 2);

  ctx.fillStyle = '#475569'; // Rod top specular edge
  ctx.fillRect(-34, -2, 16, 1);
  ctx.fillRect(-34, 4, 16, 1);

  // Rear Terminal Cross-Brace Bracket (Military Olive Drab)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-37, -5, 4, 12);
  ctx.fillStyle = '#2C361C';
  ctx.fillRect(-36, -4, 2, 10);
  ctx.fillStyle = '#4A5A2F';
  ctx.fillRect(-36, -4, 2, 2);

  // ── LAYER 2: CENTRAL RECEIVER / ROTOR HOUSING ──
  const recX = -16;
  const recY = -8;
  const recW = 25;
  const recH = 12;

  // Main Receiver Dark Outer Contour
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(recX - 1, recY - 1, recW + 2, recH + 2);

  // Military Olive-Drab Armor Plate Body
  ctx.fillStyle = '#364323';
  ctx.fillRect(recX, recY, recW, recH);

  // Receiver Top Specular Highlight
  ctx.fillStyle = '#526435';
  ctx.fillRect(recX + 1, recY, recW - 2, 2);
  ctx.fillStyle = '#657C41';
  ctx.fillRect(recX + 3, recY, recW - 6, 1);

  // Receiver Underside Shadow
  ctx.fillStyle = '#1A2111';
  ctx.fillRect(recX, recY + recH - 2, recW, 2);

  // Charcoal Steel Structural Reinforcement Top Plate
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(recX + 2, recY + 1, recW - 4, 3);
  ctx.fillStyle = '#475569';
  ctx.fillRect(recX + 2, recY + 1, recW - 4, 1);

  // Top Stamped Inspection Plate & Amber Military Serial Marking
  ctx.fillStyle = '#11160C';
  ctx.fillRect(recX + 5, recY + 2, 10, 2);
  ctx.fillStyle = '#F59E0B'; // Military Stencil Bar
  ctx.fillRect(recX + 6, recY + 2, 8, 1);

  // Exposed Metallic Silver Hex Screws
  const hexXs = [recX + 3, recX + 16, recX + 20];
  for (let h = 0; h < hexXs.length; h++) {
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(hexXs[h], recY + 2, 2, 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(hexXs[h], recY + 2, 1, 1);
  }

  // Side Cylindrical Auxiliary Solenoid Housing (Charcoal Steel)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(recX + 1, recY + 5, 14, 5);
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(recX + 2, recY + 6, 12, 3);
  ctx.fillStyle = '#475569';
  ctx.fillRect(recX + 2, recY + 6, 12, 1);

  // Dual Butterfly Quick-Release T-Wing Nuts on Top Housing
  const tNuts = [recX + 5, recX + 17];
  for (let t = 0; t < tNuts.length; t++) {
    const tx = tNuts[t];
    // Vertical Stud
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(tx - 1, recY - 4, 3, 4);
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(tx, recY - 3, 1, 3);
    // Horizontal T-Wing Nut (Metallic Silver)
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(tx - 3, recY - 5, 7, 3);
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(tx - 2, recY - 4, 5, 1);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(tx - 1, recY - 4, 2, 1);
  }

  // Rear Rotor Block Collar (Charcoal Gunmetal Steel with Silver Bevel)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(recX + recW - 2, recY - 1, 4, recH + 2);
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(recX + recW - 1, recY, 2, recH);
  ctx.fillStyle = '#64748B';
  ctx.fillRect(recX + recW - 1, recY, 1, recH);

  // ── LAYER 3: 6-BARREL GATLING CLUSTER WITH DYNAMIC 3D ROTATIONAL PROJECTION ──
  const numBarrels = 6;
  const clusterR = 6.0;
  const barrelStartX = 11;
  const barrelEndX = 55;
  const barrelLen = barrelEndX - barrelStartX; // 44px

  // Central Axle Drive Shaft
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(barrelStartX, -2, barrelLen - 2, 4);
  ctx.fillStyle = '#181B22';
  ctx.fillRect(barrelStartX + 1, -1, barrelLen - 4, 2);
  // Rotating central axle flute highlight
  const axleY = snap(Math.sin(spinAngle * 3) * 0.8);
  ctx.fillStyle = '#475569';
  ctx.fillRect(barrelStartX + 2, axleY, barrelLen - 6, 1);

  // Dynamic 3D Barrel Calculation
  const barrels = [];
  for (let i = 0; i < numBarrels; i++) {
    const a = spinAngle + (i * Math.PI * 2) / numBarrels;
    const by = Math.sin(a) * clusterR;
    const depth = Math.cos(a); // -1.0 (back) to +1.0 (front)
    barrels.push({ idx: i, angle: a, y: snap(by), depth: depth });
  }

  // Sort by depth so back barrels render first, then clamp rings, then front barrels
  barrels.sort((a, b) => a.depth - b.depth);

  // Helper to draw a discrete pixel minigun barrel
  const drawPixelBarrel = (bY, depth, isFront) => {
    const isBack = !isFront;
    const bH = isFront ? 3 : 2;
    const tipLen = 8;
    const mainLen = barrelLen - tipLen;

    // Dark outline / shadow
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(barrelStartX, bY - 1, barrelLen, bH + 2);

    // Barrel body base color
    let bodyColor = isFront ? '#334155' : '#1E293B';
    let topSheen = isFront ? '#64748B' : '#334155';
    let specColor = isFront ? '#94A3B8' : '#475569';

    if (heat > 0.45) {
      bodyColor = (depth > 0) ? '#EA580C' : '#9A3412';
      topSheen = '#F59E0B';
      specColor = '#FEF08A';
    } else if (heat > 0.20) {
      bodyColor = (depth > 0) ? '#475569' : '#1E293B';
      topSheen = '#EA580C';
      specColor = '#F59E0B';
    }

    ctx.fillStyle = bodyColor;
    ctx.fillRect(barrelStartX + 1, bY, mainLen, bH);

    // Specular longitudinal metallic highlight on front barrels
    if (isFront) {
      ctx.fillStyle = topSheen;
      ctx.fillRect(barrelStartX + 2, bY, mainLen - 2, 1);
      ctx.fillStyle = specColor;
      ctx.fillRect(barrelStartX + 6, bY, (mainLen - 12) * 0.6, 1);
    }

    // Heat-Treated Muzzle Tip (Tempered Titanium Blue/Purple or Incandescent Molten Glow)
    const tipX = barrelStartX + mainLen;
    if (heat > 0.5) {
      // White-hot / molten orange tip
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(tipX, bY, tipLen - 2, bH);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(tipX + 1, bY, tipLen - 4, 1);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(tipX + tipLen - 3, bY, 2, bH);
    } else if (heat > 0.25) {
      // Cherry red / glowing tip
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(tipX, bY, tipLen - 2, bH);
      ctx.fillStyle = '#EA580C';
      ctx.fillRect(tipX + 1, bY, tipLen - 4, 1);
    } else {
      // Authentic Titanium Heat-Treated Blue/Purple Sheen
      ctx.fillStyle = '#2563EB'; // Royal heat blue
      ctx.fillRect(tipX, bY, 3, bH);
      ctx.fillStyle = '#4F46E5'; // Indigo/violet temper ring
      ctx.fillRect(tipX + 3, bY, 3, bH);
      ctx.fillStyle = '#1E232B'; // Charcoal muzzle crown
      ctx.fillRect(tipX + 6, bY, 2, bH);
    }

    // Barrel Bore Opening (Dark Hole at Muzzle Crown)
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(barrelEndX - 1, bY, 1, bH);
  };

  // Helper to draw a heavy pixel clamp ring
  const drawPixelClampRing = (ringX, isFrontMuzzle = false) => {
    const ringW = 4;
    const ringH = 18;
    const ringY = -9;

    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(ringX - 1, ringY - 1, ringW + 2, ringH + 2);

    let ringBody = '#364323'; // Military olive drab
    let ringHighlight = '#526435';
    let boltColor = '#E2E8F0';

    if (isFrontMuzzle && heat > 0.4) {
      ringBody = '#EA580C';
      ringHighlight = '#FEF08A';
      boltColor = '#FFFFFF';
    } else if (isFrontMuzzle && heat > 0.2) {
      ringBody = '#DC2626';
      ringHighlight = '#F59E0B';
    }

    ctx.fillStyle = ringBody;
    ctx.fillRect(ringX, ringY, ringW, ringH);

    // Top & center highlight bands
    ctx.fillStyle = ringHighlight;
    ctx.fillRect(ringX, ringY, ringW, 2);
    ctx.fillRect(ringX + 1, ringY + 5, 2, 8);

    // Dark perimeter cooling notches
    ctx.fillStyle = '#11160C';
    ctx.fillRect(ringX, ringY + 3, 1, 2);
    ctx.fillRect(ringX, ringY + 13, 1, 2);
    ctx.fillRect(ringX + ringW - 1, ringY + 3, 1, 2);
    ctx.fillRect(ringX + ringW - 1, ringY + 13, 1, 2);

    // Clamp Tension Silver Hex Bolts
    ctx.fillStyle = boltColor;
    ctx.fillRect(ringX + 1, ringY + 1, 2, 2);
    ctx.fillRect(ringX + 1, ringY + ringH - 3, 2, 2);
  };

  // 3A. Draw Back Barrels (depth < 0)
  for (let i = 0; i < barrels.length; i++) {
    const b = barrels[i];
    if (b.depth >= 0) continue;
    drawPixelBarrel(b.y, b.depth, false);
  }

  // 3B. Draw 3 Heavy Clamp Rings
  drawPixelClampRing(11, false); // Rear Collar Ring
  drawPixelClampRing(31, false); // Mid-Barrel Stabilizer Ring
  drawPixelClampRing(51, true);  // Front Muzzle Crown Ring

  // 3C. Draw Front Barrels (depth >= 0)
  for (let i = 0; i < barrels.length; i++) {
    const b = barrels[i];
    if (b.depth < 0) continue;
    drawPixelBarrel(b.y, b.depth, true);
  }

  // 3D. Rotational Motion Blur Ring when firing or spinning
  if (flashTimer > 0 || heat > 0.15) {
    ctx.fillStyle = (heat > 0.4) ? 'rgba(249, 115, 22, 0.45)' : 'rgba(148, 163, 184, 0.35)';
    ctx.fillRect(barrelStartX + 2, -7, barrelLen - 4, 1);
    ctx.fillRect(barrelStartX + 2, 7, barrelLen - 4, 1);
    ctx.fillRect(barrelEndX - 2, -8, 2, 16);
  }

  // ── LAYER 4: OVERHEAD HORIZONTAL BRIDGE SUPPORT STRUT & FORWARD CARRY HANDLE BRACKET ──
  const loopX = 8;
  const loopTopY = -18;
  const loopH = 26;

  // Upright Forward Carry Handle Loop Bracket (Olive Drab with Dark Core)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(loopX - 3, loopTopY - 1, 6, loopH + 2);

  ctx.fillStyle = '#364323';
  ctx.fillRect(loopX - 2, loopTopY, 4, loopH);

  ctx.fillStyle = '#4A5A2F'; // Highlight
  ctx.fillRect(loopX - 2, loopTopY, 2, loopH);

  // Oval Grip Hole in Loop Handle for front hand grip
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(loopX - 1, loopTopY + 3, 2, 8);

  // Forward Bracket Mounting Boss Collar (Charcoal Steel)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(loopX - 4, -7, 8, 13);
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(loopX - 3, -6, 6, 11);
  ctx.fillStyle = '#475569';
  ctx.fillRect(loopX - 3, -6, 6, 1);

  // Silver Hex Mounting Pin
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(loopX - 1, -2, 2, 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(loopX - 1, -2, 1, 1);

  // Overhead Horizontal Bridge Support Strut (Connecting Forward Loop to Rear Spade Grip)
  const bridgeStartX = loopX;
  const bridgeEndX = -36;
  const bridgeY = -15;
  const bridgeW = bridgeStartX - bridgeEndX;

  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(bridgeEndX - 1, bridgeY - 1, bridgeW + 2, 5);

  ctx.fillStyle = '#334155';
  ctx.fillRect(bridgeEndX, bridgeY, bridgeW, 3);

  ctx.fillStyle = '#64748B'; // Top metallic sheen
  ctx.fillRect(bridgeEndX, bridgeY, bridgeW, 1);

  // Front & Rear Strut Mounting Silver Bolts
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(bridgeStartX - 2, bridgeY - 1, 2, 2);
  ctx.fillRect(bridgeEndX + 2, bridgeY - 1, 2, 2);

  // ── LAYER 5: REAR CHAINSAW / JOYSTICK SPADE GRIP ──
  const gripX = -36;
  const gripTopY = -24;

  // Ergonomic Grip Outer Dark Contour
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(gripX - 9, gripTopY - 1, 12, 30);
  ctx.fillRect(gripX - 7, gripTopY + 28, 9, 3);

  // Heavy Matte Black Polymer / Rubber Grip Body
  ctx.fillStyle = '#0F1116';
  ctx.fillRect(gripX - 8, gripTopY, 10, 28);

  // Contoured Rear Spine Highlight
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(gripX + 1, gripTopY + 4, 1, 22);

  // Textured Scalloped Finger Grip Ribs (4 Finger Grooves)
  ctx.fillStyle = '#181B22';
  ctx.fillRect(gripX - 6, gripTopY + 6, 6, 18);

  ctx.fillStyle = '#282D37'; // Groove divider ribs
  for (let gy = gripTopY + 8; gy <= gripTopY + 20; gy += 4) {
    ctx.fillRect(gripX - 7, gy, 7, 1);
  }

  // Red/Amber Thumb Safety / Fire Toggle Switch on Top Horn
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(gripX - 5, gripTopY - 4, 6, 5);
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(gripX - 4, gripTopY - 3, 4, 3);
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(gripX - 3, gripTopY - 3, 2, 1);

  // Glowing Green Status LED
  ctx.fillStyle = '#22C55E';
  ctx.fillRect(gripX - 3, gripTopY - 1, 2, 2);
  ctx.fillStyle = '#86EFAC';
  ctx.fillRect(gripX - 3, gripTopY - 1, 1, 1);

  // ── LAYER 6: TUMBLING 7.62MM SPENT BRASS CASINGS & DISINTEGRATING LINKS SHOWER ──
  if (flashTimer > 0 || recoil > 1.5) {
    const casings = [
      { dx: -6, dy: 12, angle: spinAngle * 2.5 },
      { dx: -12, dy: 20, angle: spinAngle * 3.0 + 1.2 },
      { dx: -18, dy: 28, angle: spinAngle * 3.5 + 2.4 }
    ];
    for (let c = 0; c < casings.length; c++) {
      const cs = casings[c];
      ctx.save();
      ctx.translate(snap(motorX + 4 + cs.dx), snap(motorY + motorH + cs.dy));
      ctx.rotate(cs.angle);

      // Heavy 7.62mm Brass Shell Casing
      ctx.fillStyle = '#0B0D12';
      ctx.fillRect(-4, -2, 8, 4);

      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-3, -1, 6, 2);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(-3, -1, 4, 1);
      ctx.fillStyle = '#B45309'; // Extractor rim
      ctx.fillRect(-3, 0, 1, 1);

      ctx.restore();
    }

    // Disintegrating Dark Steel Belt Link Clip
    ctx.save();
    ctx.translate(snap(motorX - 2), snap(motorY + motorH + 16));
    ctx.rotate(-spinAngle * 2.8);
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(-3, -2, 6, 4);
    ctx.fillStyle = '#1E232B';
    ctx.fillRect(-2, -1, 4, 2);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-2, -1, 3, 1);
    ctx.restore();
  }

  // ── LAYER 7: MULTI-TIER ROTATIONAL PIXEL STARBURST MUZZLE FLASH ──
  if (flashTimer > 0) {
    const mX = barrelEndX + 2;
    const mY = 0;

    // 1. Gas Venting Jets (Top and Bottom radial vents)
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(mX - 4, -14, 2, 4);
    ctx.fillRect(mX - 3, -12, 2, 4);
    ctx.fillRect(mX - 4, 10, 2, 4);
    ctx.fillRect(mX - 3, 8, 2, 4);

    // 2. Fiery Outer Starburst Blast Spikes (Orange & Crimson)
    ctx.fillStyle = '#EA580C';
    // Forward primary spike
    ctx.fillRect(mX, -2, 24, 4);
    ctx.fillRect(mX + 24, -1, 6, 2);
    // Vertical spikes
    ctx.fillRect(mX + 2, -10, 4, 20);
    ctx.fillRect(mX + 3, -14, 2, 28);
    // 45° Diagonal spikes
    ctx.fillRect(mX + 6, -8, 4, 4);
    ctx.fillRect(mX + 10, -12, 3, 3);
    ctx.fillRect(mX + 6, 4, 4, 4);
    ctx.fillRect(mX + 10, 9, 3, 3);

    // 3. Golden Yellow Mid-Burst Petals
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(mX + 1, -3, 16, 6);
    ctx.fillRect(mX + 2, -7, 4, 14);
    ctx.fillRect(mX + 4, -5, 8, 10);
    ctx.fillRect(mX + 12, -2, 6, 4);

    // 4. White-Hot Incandescent Star Core
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(mX + 1, -2, 10, 4);
    ctx.fillRect(mX + 3, -4, 4, 8);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(mX + 2, -1, 6, 2);
    ctx.fillRect(mX + 4, -3, 2, 6);

    // 5. High-Velocity Ballistic Pixel Sparks
    const sparkOffsets = [
      { x: mX + 22, y: -6, s: 2, c: '#FFFFFF' },
      { x: mX + 28, y: 3, s: 2, c: '#FEF08A' },
      { x: mX + 34, y: -2, s: 3, c: '#F59E0B' },
      { x: mX + 20, y: 8, s: 2, c: '#EA580C' },
      { x: mX + 16, y: -12, s: 2, c: '#FBBF24' }
    ];
    for (let sp = 0; sp < sparkOffsets.length; sp++) {
      const spo = sparkOffsets[sp];
      ctx.fillStyle = spo.c;
      ctx.fillRect(spo.x, spo.y, spo.s, spo.s);
    }
  }

  ctx.restore();
}

/**
 * Standalone M134 Minigun (Handheld Vulcan) renderer for Weapon Studio / UI screens & in-game CJ Ultimate
 * Authentic Grand Theft Auto: San Andreas Military-Industrial Aesthetic:
 * - Receiver and Housing: Matte military olive drab / dark army green with charcoal steel reinforcement plates
 * - Barrels: Polished steel with subtle metallic blue-gray sheen, dark cooling vents, and burnt heat-treated tips
 * - Feed Chute & Drive Motor: Heavy black polymer / rubberized canvas segmented feed chute with olive-drab motor housing
 * - Hardware: Exposed metallic silver hex bolts, latches, wing-nuts, and dark iron mounting brackets
 * - Rear Ergonomic Chainsaw Joystick Grip with 4 scalloped finger grooves, red toggle horn, and status LED
 * - Overheat Thermal Glow curve (heat shimmer & molten glowing barrel tips)
 * - Multi-layered Rotational Starburst Muzzle Flash
 * Rule 11 (Zero shadowBlur) & Rule 20 Compliant
 */
export function drawCjMinigun(ctx, x = 0, y = 0, gunAngle = 0, r = 25, opts = {}) {
  if (_isDarkMode()) {
    drawCjPixelMinigun(ctx, x, y, gunAngle, r, opts);
    return;
  }

  _initMinigunGradients(ctx);

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

  const recoil = (opts && opts.recoil) ? opts.recoil : 0;
  const flashTimer = (opts && opts.flashTimer) ? opts.flashTimer : 0;
  const heat = (opts && opts.heat) ? Math.min(1.0, Math.max(0, opts.heat)) : 0;
  const spinAngle = (opts && opts.spinAngle !== undefined) ? opts.spinAngle : 0;

  ctx.translate(posX - recoil, posY);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // ── LAYER 0: UNDERSLUNG DRIVE MOTOR POD & HEAVY RUBBERIZED CANVAS AMMO FEED CHUTE ──
  const motorX = -8.0;
  const motorY = 4.5;
  const motorW = 22.0;
  const motorH = 9.5;

  // Heavy Flexible Rubberized Canvas Ammo Feed Chute with Metallic Articulated Links
  ctx.strokeStyle = '#090B0E';
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(motorX + 2.0, motorY + motorH * 0.65);
  ctx.quadraticCurveTo(motorX - 12.0, motorY + motorH + 4.0, -31.0, motorY + 4.5);
  ctx.stroke();

  // Rubberized Canvas Inner Belt
  ctx.strokeStyle = '#1E2515'; // Dark Army Canvas Green
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(motorX + 2.0, motorY + motorH * 0.65);
  ctx.quadraticCurveTo(motorX - 12.0, motorY + motorH + 4.0, -31.0, motorY + 4.5);
  ctx.stroke();

  // Metallic Silver Link Segments along Chute
  ctx.fillStyle = '#CBD5E1';
  [-26.0, -21.0, -16.0, -11.0].forEach(lx => {
    ctx.fillRect(lx, motorY + motorH - 0.5, 1.4, 2.8);
  });

  // Cylindrical Motor Pod Body (Matte Military Olive-Drab Finish - Cached)
  ctx.fillStyle = _cachedMinigunMotorGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(motorX, motorY, motorW, motorH, 2.5);
  ctx.fill();
  ctx.stroke();

  // Dark Stator Vents in Center Window
  ctx.fillStyle = '#11160C';
  ctx.fillRect(motorX + 5.0, motorY + 1.2, motorW - 10.0, motorH - 2.4);
  ctx.strokeStyle = '#364323';
  ctx.lineWidth = 0.8;
  for (let cx = motorX + 6.0; cx < motorX + motorW - 6.0; cx += 1.6) {
    ctx.beginPath();
    ctx.moveTo(cx, motorY + 1.2);
    ctx.lineTo(cx, motorY + motorH - 1.2);
    ctx.stroke();
  }

  // Front & Rear Motor Heavy End Caps (Charcoal Steel)
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(motorX + motorW - 2.5, motorY, 2.5, motorH);
  ctx.fillRect(motorX, motorY, 2.5, motorH);

  // Motor Center Dark Iron Clamp Strap & Silver Latch Pin
  ctx.fillStyle = '#2A323D';
  ctx.fillRect(motorX + motorW * 0.45 - 1.2, motorY - 0.5, 2.8, motorH + 1.0);
  ctx.fillStyle = '#E2E8F0'; // Silver Latch
  ctx.fillRect(motorX + motorW * 0.45 - 0.6, motorY + 2.0, 1.6, 2.0);

  // ── LAYER 1: REAR FRAME SUPPORT TUBES & CHASSIS BARS ──
  // Dual Lower Support Bars (Charcoal Steel) connecting Main Receiver to Rear Grip
  ctx.fillStyle = '#1E232B';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  // Upper rear rod
  ctx.fillRect(-34.0, -2.5, 18.0, 2.2);
  ctx.strokeRect(-34.0, -2.5, 18.0, 2.2);
  // Lower rear rod
  ctx.fillRect(-34.0, 3.2, 18.0, 2.2);
  ctx.strokeRect(-34.0, 3.2, 18.0, 2.2);

  // Rear Terminal Cross-Brace Bracket (Military Olive Drab)
  ctx.fillStyle = '#2C361C';
  ctx.fillRect(-34.5, -4.0, 3.5, 10.5);
  ctx.strokeRect(-34.5, -4.0, 3.5, 10.5);

  // ── LAYER 2: CENTRAL RECEIVER / ROTOR HOUSING (MATTE MILITARY OLIVE DRAB & CHARCOAL STEEL) ──
  const recX = -16.0;
  const recY = -7.5;
  const recW = 25.0;
  const recH = 12.0;

  // Military Olive-Drab Upper Receiver Housing (Cached)
  ctx.fillStyle = _cachedMinigunRecGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.roundRect(recX, recY, recW, recH, 2.0);
  ctx.fill();
  ctx.stroke();

  // Heavy Gunmetal / Charcoal Steel Structural Reinforcement Plates
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(recX + 2.0, recY + 1.0, recW - 4.0, 2.6);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 0.6;
  ctx.strokeRect(recX + 2.0, recY + 1.0, recW - 4.0, 2.6);

  // Top Stamped Inspection Plate & Military Serial Marking
  ctx.fillStyle = '#11160C';
  ctx.fillRect(recX + 5.0, recY + 1.4, 10.0, 1.8);
  ctx.fillStyle = '#F59E0B'; // Military Stencil Bar
  ctx.fillRect(recX + 6.0, recY + 1.8, 8.0, 0.8);

  // Exposed Metallic Silver Hex Screws on Top Housing
  [recX + 4.0, recX + 16.0, recX + 21.0].forEach(hx => {
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.arc(hx, recY + 2.3, 0.7, 0, Math.PI * 2);
    ctx.fill();
  });

  // Side Cylindrical Auxiliary Solenoid / Housing (Charcoal Steel)
  ctx.fillStyle = '#1E232B';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(recX + 1.5, recY + 4.2, 14.5, 4.0, 1.2);
  ctx.fill();
  ctx.stroke();

  // 2 Chrome / Silver Butterfly Quick-Release Screws on top of housing
  const tScrewXs = [recX + 6.0, recX + 17.5];
  for (let i = 0; i < tScrewXs.length; i++) {
    const tx = tScrewXs[i];
    // Vertical Stud
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(tx - 0.8, recY - 2.8, 1.6, 3.2);
    // Horizontal T-Wing Nut (Metallic Silver)
    ctx.fillStyle = '#E2E8F0';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.roundRect(tx - 2.8, recY - 4.2, 5.6, 1.6, 0.6);
    ctx.fill();
    ctx.stroke();
  }

  // Rear Rotor Block Collar (Charcoal Gunmetal Steel with Silver Bevel)
  ctx.fillStyle = '#1E232B';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.fillRect(recX + recW - 2.5, recY - 1.0, 3.5, recH + 2.0);
  ctx.strokeRect(recX + recW - 2.5, recY - 1.0, 3.5, recH + 2.0);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 0.6;
  ctx.strokeRect(recX + recW - 2.0, recY - 0.5, 2.5, recH + 1.0);

  // ── LAYER 3: 6-BARREL GATLING CLUSTER WITH ROTATIONAL 3D MOTION BLUR & DEPTH SORTING ──
  const numBarrels = 6;
  const clusterR = 6.2;
  const barrelStartX = 11.0;
  const barrelEndX = 56.0;
  const barrelLen = barrelEndX - barrelStartX;

  // Rotational Motion Blur Ring when barrels are spinning rapidly
  if (flashTimer > 0 || heat > 0.15) {
    ctx.save();
    ctx.strokeStyle = `rgba(148, 163, 184, ${(0.15 + heat * 0.25).toFixed(2)})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(barrelStartX + barrelLen * 0.5, 0, barrelLen * 0.5, clusterR, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Muzzle Crown Motion Blur Ring with heat tint
    ctx.strokeStyle = (heat > 0.4) ? `rgba(249, 115, 22, ${(heat * 0.45).toFixed(2)})` : 'rgba(100, 116, 139, 0.25)';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.ellipse(barrelEndX, 0, 1.5, clusterR + 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Central Axle Drive Shaft (Dark Parkerized Gunmetal with rotating faceted highlights)
  ctx.fillStyle = '#181B22';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.8;
  ctx.fillRect(barrelStartX, -1.2, barrelLen - 2.0, 2.4);
  ctx.strokeRect(barrelStartX, -1.2, barrelLen - 2.0, 2.4);

  // Rotating Axle Center Flute Highlight
  const axleFluteY = Math.sin(spinAngle * 3) * 0.8;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(barrelStartX + 2.0, axleFluteY - 0.4, barrelLen - 6.0, 0.8);

  // Calculate 3D barrel projections
  const barrels = [];
  for (let i = 0; i < numBarrels; i++) {
    const a = spinAngle + (i * Math.PI * 2) / numBarrels;
    const by = Math.sin(a) * clusterR;
    const depth = Math.cos(a); // -1 (back) to +1 (front)
    barrels.push({ idx: i, angle: a, y: by, depth: depth });
  }

  // Sort by depth so back barrels render first, then clamp rings, then front barrels
  barrels.sort((a, b) => a.depth - b.depth);

  // A. Render Back Barrels (depth < 0)
  for (let i = 0; i < barrels.length; i++) {
    const b = barrels[i];
    if (b.depth >= 0) continue;

    _drawSingleMinigunBarrel(ctx, barrelStartX, b.y, barrelLen, b.depth, heat);
  }

  // B. Render the 3 Heavy Charcoal & Olive Drab Clamp Rings
  // Clamp 1: Rear Rotor Collar (x = 10.5)
  _drawMinigunClampRing(ctx, 10.5, -8.0, 3.6, 16.0);
  // Clamp 2: Mid-Barrel Stabilizer Ring (x = 31.5)
  _drawMinigunClampRing(ctx, 31.5, -8.0, 3.6, 16.0);
  // Clamp 3: Front Muzzle Clamp Ring (x = 52.5)
  _drawMinigunClampRing(ctx, 52.5, -8.0, 3.6, 16.0);

  // C. Render Front Barrels (depth >= 0) on top of clamp rings
  for (let i = 0; i < barrels.length; i++) {
    const b = barrels[i];
    if (b.depth < 0) continue;

    _drawSingleMinigunBarrel(ctx, barrelStartX, b.y, barrelLen, b.depth, heat);
  }

  // ── LAYER 4: FORWARD UPRIGHT CARRY HANDLE LOOP BRACKET (MILITARY OLIVE DRAB) ──
  const loopX = 8.5;
  const loopTopY = -18.5;
  const loopH = 25.5;

  // Upright Bracket Loop Ring (Olive Drab with Dark Iron Core - Cached)
  ctx.fillStyle = _cachedMinigunLoopGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.roundRect(loopX - 2.5, loopTopY, 5.0, loopH, [2.5, 2.5, 1.5, 1.5]);
  ctx.fill();
  ctx.stroke();

  // Oval Hole in Loop Handle for front hand grip
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.roundRect(loopX - 1.2, loopTopY + 2.5, 2.4, 7.5, 1.2);
  ctx.fill();

  // Forward Bracket Mounting Boss Collar (Charcoal Steel)
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(loopX - 3.2, -6.5, 6.4, 11.5);
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(loopX - 3.2, -6.5, 6.4, 11.5);

  // Exposed Hex Mounting Pin on Bracket
  ctx.fillStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.arc(loopX, -1.0, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // ── LAYER 5: OVERHEAD HORIZONTAL BRIDGE SUPPORT STRUT ──
  const bridgeStartX = loopX + 1.0;
  const bridgeEndX = -35.0;
  const bridgeY = -14.5;
  const bridgeH = 2.8;

  ctx.fillStyle = _cachedMinigunBridgeGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(bridgeStartX, bridgeY);
  ctx.lineTo(bridgeEndX, bridgeY);
  ctx.lineTo(bridgeEndX - 2.5, bridgeY + bridgeH + 2.0);
  ctx.lineTo(bridgeEndX, bridgeY + bridgeH);
  ctx.lineTo(bridgeStartX, bridgeY + bridgeH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Front & Rear Strut Mounting Metallic Silver Hex Bolts
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(bridgeStartX - 2.0, bridgeY - 0.5, 1.6, 1.6);
  ctx.fillRect(bridgeEndX + 1.5, bridgeY - 0.5, 1.6, 1.6);

  // ── LAYER 6: REAR CHAINSAW / JOYSTICK SPADE GRIP (HEAVY MATTE BLACK RUBBER) ──
  const gripX = -36.5;
  const gripTopY = -23.5;

  ctx.save();
  // Ergonomic Grip Body with 4 Scalloped Finger Grooves
  ctx.fillStyle = '#0F1116';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.4;

  ctx.beginPath();
  ctx.moveTo(gripX + 1.5, gripTopY);                // Top rear horn
  ctx.lineTo(gripX - 5.5, gripTopY + 2.5);          // Horn top curve
  ctx.lineTo(gripX - 7.5, gripTopY + 7.0);          // Upper thumb web
  // 4 Scalloped Finger Grooves on front face
  ctx.lineTo(gripX - 6.0, gripTopY + 11.0);         // Finger 1 notch
  ctx.lineTo(gripX - 7.8, gripTopY + 13.5);
  ctx.lineTo(gripX - 6.0, gripTopY + 16.5);         // Finger 2 notch
  ctx.lineTo(gripX - 7.8, gripTopY + 19.0);
  ctx.lineTo(gripX - 6.0, gripTopY + 22.0);         // Finger 3 notch
  ctx.lineTo(gripX - 7.5, gripTopY + 24.5);
  ctx.lineTo(gripX - 5.0, gripTopY + 27.5);         // Bottom finger 4 & flared heel
  ctx.lineTo(gripX + 2.0, gripTopY + 26.0);         // Rear heel
  ctx.lineTo(gripX + 1.0, gripTopY + 6.0);          // Rear spine
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rubber Textured Grip Rib Inset
  ctx.fillStyle = '#181B22';
  ctx.beginPath();
  ctx.moveTo(gripX - 4.2, gripTopY + 6.5);
  ctx.lineTo(gripX - 5.2, gripTopY + 23.5);
  ctx.lineTo(gripX - 1.0, gripTopY + 23.0);
  ctx.lineTo(gripX - 0.5, gripTopY + 6.5);
  ctx.closePath();
  ctx.fill();

  // Finger groove divide lines
  ctx.strokeStyle = '#282D37';
  ctx.lineWidth = 0.8;
  for (let gy = gripTopY + 12.0; gy <= gripTopY + 22.0; gy += 4.2) {
    ctx.beginPath();
    ctx.moveTo(gripX - 6.5, gy);
    ctx.lineTo(gripX - 1.5, gy);
    ctx.stroke();
  }

  // Red/Amber Thumb Safety / Fire Toggle Switch on Top Horn
  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(gripX - 3.5, gripTopY - 2.5, 4.5, 3.2, 0.8);
  ctx.fill();
  ctx.stroke();

  // Safety status indicator LED
  ctx.fillStyle = '#22C55E';
  ctx.fillRect(gripX - 2.0, gripTopY - 1.5, 1.5, 1.2);

  ctx.restore();

  // ── LAYER 7: TUMBLING 7.62MM SPENT BRASS CASINGS & DISINTEGRATING LINKS SHOWER ──
  if (flashTimer > 0 || (recoil > 2.0)) {
    ctx.save();
    const casingSeeds = [
      { dx: -6.0, dy: 10.0, rot: spinAngle * 2.2, scale: 1.0 },
      { dx: -12.0, dy: 18.0, rot: spinAngle * 2.8 + 1.2, scale: 0.9 },
      { dx: -18.0, dy: 26.0, rot: spinAngle * 3.4 + 2.4, scale: 0.8 }
    ];

    for (let c = 0; c < casingSeeds.length; c++) {
      const cs = casingSeeds[c];
      ctx.save();
      ctx.translate(motorX + 4.0 + cs.dx, motorY + motorH + cs.dy);
      ctx.rotate(cs.rot);
      ctx.scale(cs.scale, cs.scale);

      // Heavy 7.62mm Brass Shell Casing
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.roundRect(-3.2, -1.2, 6.4, 2.4, 0.5);
      ctx.fill();
      ctx.stroke();

      // Rim & Extractor Groove
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(-3.0, -0.9, 1.2, 1.8);
      ctx.restore();
    }

    // Disintegrating Dark Steel Belt Link Clip
    ctx.save();
    ctx.translate(motorX - 2.0, motorY + motorH + 14.0);
    ctx.rotate(-spinAngle * 2.5);
    ctx.fillStyle = '#1E232B';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.roundRect(-2.2, -1.8, 4.4, 3.6, 0.8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // ── LAYER 8: REALISTIC MULTI-BARREL ROTATIONAL STARBURST MUZZLE FLASH & BARREL JETS ──
  if (flashTimer > 0) {
    _drawMinigunRotationalMuzzleFlash(ctx, barrelEndX + 2.0, 0, 1.65, spinAngle, heat);
  }

  ctx.restore();
}

let _cachedTopBarrelGrad = null;
let _cachedBottomBarrelGrad = null;
let _cachedHeatGrad = null;
let _cachedClampGrad = null;
let _cachedMinigunMotorGrad = null;
let _cachedMinigunRecGrad = null;
let _cachedMinigunLoopGrad = null;
let _cachedMinigunBridgeGrad = null;

function _initMinigunGradients(ctx) {
  if (_cachedTopBarrelGrad) return;

  _cachedTopBarrelGrad = ctx.createLinearGradient(0, -1.2, 0, 1.2);
  _cachedTopBarrelGrad.addColorStop(0.00, '#384556');
  _cachedTopBarrelGrad.addColorStop(0.25, '#71829B');
  _cachedTopBarrelGrad.addColorStop(0.50, '#94A3B8');
  _cachedTopBarrelGrad.addColorStop(0.80, '#475569');
  _cachedTopBarrelGrad.addColorStop(1.00, '#1E252F');

  _cachedBottomBarrelGrad = ctx.createLinearGradient(0, -1.2, 0, 1.2);
  _cachedBottomBarrelGrad.addColorStop(0.00, '#1E252F');
  _cachedBottomBarrelGrad.addColorStop(0.50, '#384556');
  _cachedBottomBarrelGrad.addColorStop(1.00, '#0E1116');

  _cachedHeatGrad = ctx.createLinearGradient(0, 0, 14, 0);
  _cachedHeatGrad.addColorStop(0.0, 'rgba(56, 69, 86, 0)');
  _cachedHeatGrad.addColorStop(0.5, 'rgba(76, 94, 130, 0.40)');
  _cachedHeatGrad.addColorStop(0.8, 'rgba(120, 90, 50, 0.35)');
  _cachedHeatGrad.addColorStop(1.0, 'rgba(30, 37, 47, 0.60)');

  _cachedClampGrad = ctx.createLinearGradient(0, -8, 0, 8);
  _cachedClampGrad.addColorStop(0.00, '#2A323D');
  _cachedClampGrad.addColorStop(0.25, '#475569');
  _cachedClampGrad.addColorStop(0.70, '#1E232B');
  _cachedClampGrad.addColorStop(1.00, '#0F1217');

  const motorY = 4.5;
  const motorH = 9.5;
  _cachedMinigunMotorGrad = ctx.createLinearGradient(0, motorY, 0, motorY + motorH);
  _cachedMinigunMotorGrad.addColorStop(0.00, '#364323');
  _cachedMinigunMotorGrad.addColorStop(0.30, '#4A5A2F');
  _cachedMinigunMotorGrad.addColorStop(0.70, '#2C361C');
  _cachedMinigunMotorGrad.addColorStop(1.00, '#161D0E');

  const recY = -7.5;
  const recH = 12.0;
  _cachedMinigunRecGrad = ctx.createLinearGradient(0, recY, 0, recY + recH);
  _cachedMinigunRecGrad.addColorStop(0.00, '#364323');
  _cachedMinigunRecGrad.addColorStop(0.25, '#526435');
  _cachedMinigunRecGrad.addColorStop(0.60, '#364323');
  _cachedMinigunRecGrad.addColorStop(1.00, '#1A2111');

  const loopTopY = -18.5;
  const loopH = 25.5;
  _cachedMinigunLoopGrad = ctx.createLinearGradient(0, loopTopY, 0, loopTopY + loopH);
  _cachedMinigunLoopGrad.addColorStop(0.0, '#364323');
  _cachedMinigunLoopGrad.addColorStop(0.5, '#4A5A2F');
  _cachedMinigunLoopGrad.addColorStop(1.0, '#212915');

  const bridgeY = -14.5;
  const bridgeH = 2.8;
  _cachedMinigunBridgeGrad = ctx.createLinearGradient(0, bridgeY, 0, bridgeY + bridgeH);
  _cachedMinigunBridgeGrad.addColorStop(0.0, '#475569');
  _cachedMinigunBridgeGrad.addColorStop(0.4, '#64748B');
  _cachedMinigunBridgeGrad.addColorStop(1.0, '#1E232B');
}

/**
 * Helper to draw a single 3D shaded Gatling barrel (Polished Steel with Metallic Blue-Gray Sheen & Heat-Treated Muzzle Tip)
 * High-performance optimized with cached module gradients
 */
function _drawSingleMinigunBarrel(ctx, startX, y, len, depth, heat) {
  _initMinigunGradients(ctx);
  const barrelH = 2.4;
  const isTopShaded = (depth >= 0);

  ctx.save();
  ctx.translate(startX, y);

  // Polished Steel Gradient with Metallic Blue-Gray Sheen (Cached)
  ctx.fillStyle = isTopShaded ? _cachedTopBarrelGrad : _cachedBottomBarrelGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.8;
  ctx.fillRect(0, -barrelH * 0.5, len, barrelH);
  ctx.strokeRect(0, -barrelH * 0.5, len, barrelH);

  // Heat-Treated Burnt Blued/Bronze Tint near Muzzle Tip (Cached)
  const heatTreatedLen = 14.0;
  const heatStartX = len - heatTreatedLen;
  ctx.save();
  ctx.translate(heatStartX, 0);
  ctx.fillStyle = _cachedHeatGrad;
  ctx.fillRect(0, -barrelH * 0.5, heatTreatedLen, barrelH);
  ctx.restore();

  // Dark 9mm Barrel Bore Opening Crown & Dark Cooling Vents
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.ellipse(len, 0, 0.6, barrelH * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark cooling vent slot on barrel tip
  ctx.fillStyle = '#090B0E';
  ctx.fillRect(len - 3.5, -barrelH * 0.3, 2.0, barrelH * 0.6);

  // Overheat Thermal Glow (Incandescent orange to white-hot at high RPM)
  if (heat > 0.04) {
    const tipGlowLen = Math.min(26, 12 + heat * 20);
    const tipStartX = len - tipGlowLen;
    ctx.fillStyle = `rgba(251, 191, 36, ${(heat * 0.85).toFixed(2)})`;
    ctx.fillRect(tipStartX, -barrelH * 0.5, tipGlowLen, barrelH);
    ctx.fillStyle = `rgba(255, 255, 255, ${(heat * 0.90).toFixed(2)})`;
    ctx.fillRect(len - 6.0, -barrelH * 0.35, 6.0, barrelH * 0.7);
  }

  ctx.restore();
}

/**
 * Helper to draw a heavy-duty military clamp collar ring (Charcoal Steel & Olive Drab Reinforcement)
 * High-performance optimized with cached gradient
 */
function _drawMinigunClampRing(ctx, x, y, w, h) {
  _initMinigunGradients(ctx);

  ctx.save();
  ctx.translate(x, 0);

  // Heavy Charcoal Gunmetal Ring Body (Cached)
  ctx.fillStyle = _cachedClampGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(0, y, w, h, 1.2);
  ctx.fill();
  ctx.stroke();

  // Army Olive-Drab Center Band
  ctx.fillStyle = '#364323';
  ctx.fillRect(0.8, y + 2.0, w - 1.6, h - 4.0);

  // Center Hub Darkening & Machined Ring Recesses
  ctx.fillStyle = '#020617';
  ctx.fillRect(0.8, -2.5, w - 1.6, 5.0);
  ctx.fillRect(0.8, y + 1.0, w - 1.6, 1.2);
  ctx.fillRect(0.8, y + h - 2.2, w - 1.6, 1.2);

  ctx.restore();
}

let _cachedMuzzleGlowGrad = null;

function _getMuzzleGlowGrad(ctx, glowR) {
  if (!_cachedMuzzleGlowGrad) {
    _cachedMuzzleGlowGrad = ctx.createRadialGradient(4, 0, 0, 4, 0, 48);
    _cachedMuzzleGlowGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.98)');
    _cachedMuzzleGlowGrad.addColorStop(0.25, 'rgba(254, 240, 138, 0.88)');
    _cachedMuzzleGlowGrad.addColorStop(0.55, 'rgba(249, 115, 22, 0.55)');
    _cachedMuzzleGlowGrad.addColorStop(0.82, 'rgba(220, 38, 38, 0.20)');
    _cachedMuzzleGlowGrad.addColorStop(1.0, 'rgba(220, 38, 38, 0)');
  }
  return _cachedMuzzleGlowGrad;
}

/**
 * Helper to draw tactical high-velocity M4-style rotational muzzle flash & spark effects for M134 Minigun
 * Inspired by John Wick's TTI M4 Rifle: Supersonic cyan shock ring, Mach diamonds, 8-point stretched starburst, and forward powder sparks
 * Hyper-dynamic animation to ensure zero static/stuck visual appearance during rapid continuous firing.
 */
function _drawMinigunRotationalMuzzleFlash(ctx, x, y, scale = 1.0, spinAngle = 0, heat = 0.5) {
  ctx.save();
  ctx.translate(x, y);

  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const flicker = 0.85 + Math.sin(now * 0.08 + spinAngle * 3.5) * 0.18 + (Math.random() - 0.5) * 0.12;
  const progress = scale * Math.max(0.65, flicker);
  const alpha = Math.min(1.0, 0.95 * Math.max(0.6, flicker));

  // 1. Supersonic Cyan-Blue Vapor Shock Ring (Pulsing expansion shockwave)
  const ringRadius = (14 + ((now * 0.06 + spinAngle * 8) % 18)) * scale;
  const ringAlpha = Math.max(0, 1.0 - (ringRadius / (32 * scale))) * 0.55 * alpha;
  ctx.strokeStyle = `rgba(56, 189, 248, ${ringAlpha.toFixed(3)})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(8 * progress, 0, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Volumetric Radiant Atmospheric Fireball Glow
  const glowR = 48 * progress;
  ctx.save();
  ctx.scale(glowR / 48, glowR / 48);
  ctx.fillStyle = _getMuzzleGlowGrad(ctx, 48);
  ctx.beginPath();
  ctx.arc(4, 0, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. Multi-Port Gas Compensator Vents (6 Angled Radial Jets matching revolving barrel crowns)
  ctx.save();
  ctx.rotate(spinAngle);
  for (let b = 0; b < 6; b++) {
    const ba = (b * Math.PI * 2) / 6;
    const vLen = (20 + Math.sin(now * 0.05 + b) * 4) * progress;
    const vx = Math.cos(ba) * vLen;
    const vy = Math.sin(ba) * vLen;

    ctx.fillStyle = `rgba(251, 191, 36, ${0.85 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-1 + vx, vy);
    ctx.lineTo(2, 0);
    ctx.closePath();
    ctx.fill();

    // White-hot vent root
    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(-1 + vx * 0.45, vy * 0.45);
    ctx.lineTo(1, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 4. Forward Conical Combustion Flame Plume (Dynamic fluttering length)
  const coneLen = (42 + Math.sin(now * 0.09) * 10 + (Math.random() - 0.5) * 6) * scale;
  ctx.fillStyle = `rgba(254, 215, 170, ${0.90 * alpha})`;
  ctx.beginPath();
  ctx.moveTo(-3, -5.0 * progress);
  ctx.lineTo(coneLen * 0.72, -12 * progress);
  ctx.lineTo(coneLen, 0);
  ctx.lineTo(coneLen * 0.72, 12 * progress);
  ctx.lineTo(-3, 5.0 * progress);
  ctx.closePath();
  ctx.fill();

  // 5. 8-Point Aggressive Stretched Starburst Flare (Forward Horizontal Elongation)
  ctx.save();
  ctx.rotate(spinAngle * 0.4);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
  ctx.strokeStyle = `rgba(245, 158, 11, ${0.85 * alpha})`;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  const starPoints = 8;
  const outerStarR = (26 + Math.sin(now * 0.1) * 4) * progress;
  const innerStarR = 8 * progress;
  for (let i = 0; i < starPoints * 2; i++) {
    const spAngle = (i * Math.PI) / starPoints;
    const R = (i % 2 === 0) ? outerStarR : innerStarR;
    const stretchX = (i % 2 === 0 && Math.cos(spAngle) > 0) ? 2.2 : 1.0;
    const sx = Math.cos(spAngle) * R * stretchX;
    const sy = Math.sin(spAngle) * R;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 6. Supersonic Mach Expansion Shock Diamonds (Oscillating Mach Discs)
  const machJitter = Math.sin(now * 0.06 + spinAngle * 2) * 2.0;
  // First Mach Diamond
  ctx.fillStyle = `rgba(255, 255, 255, ${1.0 * alpha})`;
  ctx.strokeStyle = `rgba(253, 224, 71, ${0.95 * alpha})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo((11 + machJitter) * progress, 0);
  ctx.lineTo((18 + machJitter) * progress, -4.5 * progress);
  ctx.lineTo((25 + machJitter) * progress, 0);
  ctx.lineTo((18 + machJitter) * progress, 4.5 * progress);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Second Mach Diamond (Further out)
  ctx.beginPath();
  ctx.moveTo((30 + machJitter * 1.5) * progress, 0);
  ctx.lineTo((36 + machJitter * 1.5) * progress, -3.2 * progress);
  ctx.lineTo((42 + machJitter * 1.5) * progress, 0);
  ctx.lineTo((36 + machJitter * 1.5) * progress, 3.2 * progress);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 7. White-Hot Incandescent Core Diamond at Muzzle Mouth
  ctx.fillStyle = `rgba(255, 255, 255, ${1.0 * alpha})`;
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(5 * progress, -6.0 * progress);
  ctx.lineTo(18 * progress, 0);
  ctx.lineTo(5 * progress, 6.0 * progress);
  ctx.closePath();
  ctx.fill();

  // 8. High-Speed Incandescent Powder Sparks & Embers (Actively streaming forward along muzzle cone)
  for (let s = 0; s < 8; s++) {
    const sPhase = ((now * 0.095 + s * 14.5 + (spinAngle || 0) * 18.0) % 55);
    const sDist = (8 + sPhase * 1.15) * scale;
    const sSpread = (0.08 + (sPhase / 55) * 0.32);
    const sAngle = Math.sin(s * 3.1 + sPhase * 0.18) * sSpread;
    const sAlpha = Math.max(0, 1.0 - sPhase / 55) * alpha;
    const sSize = (1.4 + (s % 3) * 0.6) * (1.0 - sPhase / 70) * scale;
    const spX = Math.cos(sAngle) * sDist;
    const spY = Math.sin(sAngle) * sDist;

    ctx.fillStyle = `rgba(254, 240, 138, ${sAlpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(spX, spY, Math.max(0.6, sSize), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

let _cachedMinigunTrailGrad = null;

function _getMinigunTrailGrad(ctx) {
  if (!_cachedMinigunTrailGrad) {
    _cachedMinigunTrailGrad = ctx.createLinearGradient(-38, 0, 14, 0);
    _cachedMinigunTrailGrad.addColorStop(0, 'rgba(234, 88, 12, 0)');
    _cachedMinigunTrailGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.65)');
    _cachedMinigunTrailGrad.addColorStop(0.75, 'rgba(251, 191, 36, 0.95)');
    _cachedMinigunTrailGrad.addColorStop(1.0, 'rgba(255, 255, 255, 1.0)');
  }
  return _cachedMinigunTrailGrad;
}

/**
 * Draws CJ's M134 Minigun Armor-Piercing Supersonic Tracer Bullet in authentic Pixel Art Style (Saitama Tech)
 */
export function drawCjPixelMinigunBullet(ctx, p) {
  const vx = (p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined) ? p._resumeVx : (p.vx || 0);
  const vy = (p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined) ? p._resumeVy : (p.vy || 0);
  const angle = (vx !== 0 || vy !== 0) ? Math.atan2(vy, vx) : (p.lastAngle !== undefined ? p.lastAngle : (p.angle || 0));
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  // 1. Stepped Pixel World Tracer Trail
  if (p.history && p.history.length > 1) {
    ctx.save();
    for (let i = 0; i < p.history.length; i++) {
      const h = p.history[i];
      const alpha = (i / p.history.length) * 0.95;
      const size = (i > p.history.length - 4) ? 5.0 : 3.0;
      ctx.fillStyle = (i % 2 === 0) ? `rgba(249, 115, 22, ${alpha})` : `rgba(254, 240, 138, ${alpha})`;
      ctx.fillRect(snap(h.x - size * 0.5), snap(h.y - size * 0.5), size, size);
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(snap(p.x), snap(p.y));
  ctx.rotate(angle);

  // 2. Supersonic Stepped Pixel Shockwave Chevrons
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillRect(-10, -6, 2, 2);
  ctx.fillRect(-8, -4, 2, 2);
  ctx.fillRect(-6, -2, 2, 2);
  ctx.fillRect(-6, 2, 2, 2);
  ctx.fillRect(-8, 4, 2, 2);
  ctx.fillRect(-10, 6, 2, 2);

  ctx.fillStyle = 'rgba(254, 240, 138, 0.50)';
  ctx.fillRect(-18, -8, 2, 2);
  ctx.fillRect(-16, -6, 2, 2);
  ctx.fillRect(-14, -4, 2, 2);
  ctx.fillRect(-14, 4, 2, 2);
  ctx.fillRect(-16, 6, 2, 2);
  ctx.fillRect(-18, 8, 2, 2);

  // 3. Heavy 20mm AP Bullet Slug with #0E0F14 Outline
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-10, -4, 21, 8);

  // Tungsten Hardened Core
  ctx.fillStyle = '#B45309';
  ctx.fillRect(-9, -3, 10, 6);
  ctx.fillStyle = '#F97316';
  ctx.fillRect(1, -3, 6, 6);
  ctx.fillStyle = '#FBBF24';
  ctx.fillRect(7, -2, 2, 4);
  ctx.fillRect(9, -1, 1, 2);

  // White-Hot Specular Center Line
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-5, -1, 10, 2);

  ctx.restore();
}

/**
 * Draws CJ's high-velocity supersonic Minigun armor-piercing projectile with Mach shockwave rings
 */
export function drawCjMinigunBullet(ctx, p) {
  if (_isDarkMode()) {
    drawCjPixelMinigunBullet(ctx, p);
    return;
  }

  const vx = (p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined) ? p._resumeVx : (p.vx || 0);
  const vy = (p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined) ? p._resumeVy : (p.vy || 0);
  const angle = (vx !== 0 || vy !== 0) ? Math.atan2(vy, vx) : (p.lastAngle !== undefined ? p.lastAngle : (p.angle || 0));
  const len = 20;
  const width = 4.2;

  // 1. World-Space Tracer Trail
  if (p.history && p.history.length > 1) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p.history[0].x, p.history[0].y);
    for (let i = 1; i < p.history.length; i++) {
      ctx.lineTo(p.history[i].x, p.history[i].y);
    }
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.65)'; // Fiery orange outer tracer
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Hot-yellow intense tracer core
    const sliceCount = Math.max(1, p.history.length - 4);
    ctx.beginPath();
    ctx.moveTo(p.history[sliceCount - 1].x, p.history[sliceCount - 1].y);
    for (let i = sliceCount; i < p.history.length; i++) {
      ctx.lineTo(p.history[i].x, p.history[i].y);
    }
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.98)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // 2. Trailing Supersonic Speed Streak
  ctx.fillStyle = _getMinigunTrailGrad(ctx);
  ctx.beginPath();
  ctx.moveTo(4, -width * 0.5);
  ctx.lineTo(-38, 0);
  ctx.lineTo(4, width * 0.5);
  ctx.closePath();
  ctx.fill();

  // 3. Supersonic Mach Conical Shockwave Rings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-10, -6.0);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-10, 6.0);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(254, 240, 138, 0.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-20, -9.0);
  ctx.lineTo(-12, 0);
  ctx.lineTo(-20, 9.0);
  ctx.stroke();

  // 4. Armor-Piercing Tungsten Core & Brass Shell
  ctx.fillStyle = '#B45309'; // Heavy brass casing
  ctx.fillRect(-len * 0.5, -width * 0.5, len * 0.65, width);

  // Hardened steel penetrator tip
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(len * 0.15, 0, width * 0.5, -Math.PI / 2, Math.PI / 2);
  ctx.fill();

  // White-hot center highlight
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-len * 0.25, -width * 0.2, len * 0.45, width * 0.4);

  ctx.restore();
}
