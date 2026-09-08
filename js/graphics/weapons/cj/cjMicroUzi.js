// ─────────────────────────────────────────────
// CJ Micro-Uzi Graphics
// ─────────────────────────────────────────────

import { getHandSize } from '../../../core/config.js';
import { state } from '../../../core/state.js';
import { isDarkMode } from './cjShared.js';

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
