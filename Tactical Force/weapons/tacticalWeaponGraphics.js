// ─────────────────────────────────────────────
// TACTICAL FORCE — WEAPON GRAPHICS
// Authentic 2D Canvas weapon renderers for firearm combatants
// ─────────────────────────────────────────────

import { state } from '../../js/core/state.js';

/**
 * Unified Tactical Bullet Projectile Renderer
 * High-velocity world-space motion trail + streamlined tracer capsule with white-hot core & dynamic character theme color
 */
export function drawTacticalBullet(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vy === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = (vx !== 0 || vy !== 0) ? Math.atan2(vy, vx) : (p.lastAngle !== undefined ? p.lastAngle : (p.angle || 0));
  const speed = Math.hypot(vx, vy);

  // Derive dynamic theme color from projectile or owner character
  const owner = (typeof p.owner === 'number' && typeof state !== 'undefined' && state.fighters) ? state.fighters[p.owner] : p.owner;
  const themeColor = p.color || (owner ? (owner.themeColor || owner.color || owner._def?.color) : null) || '#00e5ff';

  const bulletRadius = p.r || 4;
  const caliberScale = p.tacticalCaliberScale || (bulletRadius / 4.0);
  const bulletLen = (p.bulletLength || 16) * caliberScale;
  const bulletHalfWidth = (p.bulletWidth || 3.0) * caliberScale;

  // ─────────────────────────────────────────────
  // 1. WORLD-SPACE CONTINUOUS HIGH-VELOCITY MOTION TRAIL
  // ─────────────────────────────────────────────
  if (p.history && p.history.length > 1) {
    const pts = p.history;
    const len = pts.length;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Multi-pass tapering neon motion streak
    for (let i = 1; i < len; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const ratio = i / len; // 0 (oldest tail) -> 1 (head)

      // Outer Neon Theme Glow
      ctx.globalAlpha = Math.pow(ratio, 1.4) * 0.70;
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = Math.max(1.2, ratio * bulletHalfWidth * 2.4);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      // Inner White-Hot Core Line
      ctx.globalAlpha = Math.pow(ratio, 2.0) * 0.95;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(0.8, ratio * bulletHalfWidth * 0.9);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    // Connect last history point directly to current bullet head (p.x, p.y)
    const lastPt = pts[len - 1];
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = bulletHalfWidth * 2.4;
    ctx.beginPath();
    ctx.moveTo(lastPt.x, lastPt.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = bulletHalfWidth * 0.9;
    ctx.beginPath();
    ctx.moveTo(lastPt.x, lastPt.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    ctx.restore();
  }

  // ─────────────────────────────────────────────
  // 2. LOCAL-SPACE AERODYNAMIC TRACER CAPSULE & KINETIC NOSE
  // ─────────────────────────────────────────────
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // Aerodynamic Speed Wedge (Behind bullet: -X)
  const localTrailLen = Math.min(32, Math.max(14, speed * 1.5)) * caliberScale;
  const trailGrad = ctx.createLinearGradient(0, 0, -localTrailLen, 0);
  trailGrad.addColorStop(0.0, themeColor);
  trailGrad.addColorStop(0.5, themeColor);
  trailGrad.addColorStop(1.0, 'rgba(0,0,0,0)');

  ctx.fillStyle = trailGrad;
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.moveTo(0, -bulletHalfWidth * 0.9);
  ctx.lineTo(-localTrailLen, 0);
  ctx.lineTo(0, bulletHalfWidth * 0.9);
  ctx.closePath();
  ctx.fill();

  // Glowing Neon Outer Envelope / Tracer Contour (Theme Colored)
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = themeColor;
  ctx.beginPath();
  ctx.moveTo(-bulletLen * 0.5, -bulletHalfWidth);
  ctx.lineTo(bulletLen * 0.3, -bulletHalfWidth);
  ctx.quadraticCurveTo(bulletLen * 0.7, -bulletHalfWidth * 0.6, bulletLen * 0.7, 0);
  ctx.quadraticCurveTo(bulletLen * 0.7, bulletHalfWidth * 0.6, bulletLen * 0.3, bulletHalfWidth);
  ctx.lineTo(-bulletLen * 0.5, bulletHalfWidth);
  ctx.closePath();
  ctx.fill();

  // Ultra-Bright White-Hot Kinetic Core
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 1.0;
  ctx.beginPath();
  ctx.moveTo(-bulletLen * 0.4, -bulletHalfWidth * 0.45);
  ctx.lineTo(bulletLen * 0.2, -bulletHalfWidth * 0.45);
  ctx.quadraticCurveTo(bulletLen * 0.55, -bulletHalfWidth * 0.25, bulletLen * 0.55, 0);
  ctx.quadraticCurveTo(bulletLen * 0.55, bulletHalfWidth * 0.25, bulletLen * 0.2, bulletHalfWidth * 0.45);
  ctx.lineTo(-bulletLen * 0.4, bulletHalfWidth * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Common Muzzle Flash effect
 */
export function drawTacticalMuzzleFlash(ctx, x, y, angle, size = 18, color = '#ffdd44') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Core flash star
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(size * 0.4, 0, size * 0.6, size * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outer fiery corona
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size * 0.9, -size * 0.45);
  ctx.lineTo(size * 1.3, 0);
  ctx.lineTo(size * 0.9, size * 0.45);
  ctx.closePath();
  ctx.fill();

  // Spikes
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(size * 0.2, -size * 0.3);
  ctx.lineTo(size * 1.1, -size * 0.6);
  ctx.moveTo(size * 0.2, size * 0.3);
  ctx.lineTo(size * 1.1, size * 0.6);
  ctx.stroke();

  ctx.restore();
}

/**
 * 1. RIFLE — Tactical Assault Rifle (M4/Carbine Platform)
 */
export function drawTacticalRifleWeapon(ctx, x, y, angle, r = 25, options = {}) {
  const recoil = options.recoil || 0;
  const isFiring = options.isFiring || false;
  const tc = options.themeColor || '#3b82f6';

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Recoil translation
  const recoilDist = recoil * 5;
  ctx.translate(-recoilDist, 0);

  const sizeRatio = (r && r > 0) ? (r / 25) : 1.0;
  const totalScale = sizeRatio * (options.scale || 1.0);
  ctx.scale(totalScale, totalScale);

  // Weapon Dimensions
  const gunX = (r * 0.6) / totalScale;
  const gunY = 4;

  // Receiver body (Matte Gunmetal)
  ctx.fillStyle = '#1e2430';
  ctx.strokeStyle = tc;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(gunX, gunY - 5, 24, 10, 2);
  ctx.fill();
  ctx.stroke();

  // Handguard & Picatinny Rail (Forward barrel shroud)
  ctx.fillStyle = '#141822';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(gunX + 24, gunY - 4, 22, 8, 1);
  ctx.fill();
  ctx.stroke();

  // Rail vent slots
  ctx.fillStyle = tc;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(gunX + 27 + i * 6, gunY - 2, 3, 4);
  }

  // Steel Barrel & Flash Hider
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(gunX + 46, gunY - 2.5, 14, 5);
  // Flash Hider / Muzzle Brake
  ctx.fillStyle = '#334155';
  ctx.fillRect(gunX + 60, gunY - 3.5, 6, 7);

  // Curved 30-Round Magazine
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = tc;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gunX + 12, gunY + 5);
  ctx.lineTo(gunX + 18, gunY + 5);
  ctx.lineTo(gunX + 15, gunY + 18);
  ctx.lineTo(gunX + 9, gunY + 17);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Holographic Sight / Optic on top rail
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(gunX + 4, gunY - 10, 14, 5);
  // Optic Lens (reticle tint)
  ctx.fillStyle = tc;
  ctx.globalAlpha = 0.65;
  ctx.fillRect(gunX + 7, gunY - 9, 8, 3);
  ctx.globalAlpha = 1;

  // Tactical Stock (Collapsible Carbine Stock)
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gunX, gunY - 3);
  ctx.lineTo(gunX - 16, gunY - 5);
  ctx.lineTo(gunX - 18, gunY + 8);
  ctx.lineTo(gunX - 14, gunY + 8);
  ctx.lineTo(gunX - 12, gunY + 2);
  ctx.lineTo(gunX, gunY + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Muzzle flash if firing
  if (isFiring) {
    drawTacticalMuzzleFlash(ctx, gunX + 66, gunY, 0, 20, tc);
  }

  ctx.restore();
}

/**
 * 2. SHOTGUN — 12-Gauge Tactical Pump Shotgun
 */
export function drawTacticalShotgunWeapon(ctx, x, y, angle, r = 25, options = {}) {
  const recoil = options.recoil || 0;
  const isFiring = options.isFiring || false;
  const pumpProgress = options.pumpProgress || 0; // 0..1 pump animation
  const tc = options.themeColor || '#10b981';

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const recoilDist = recoil * 7;
  ctx.translate(-recoilDist, 0);

  const sizeRatio = (r && r > 0) ? (r / 25) : 1.0;
  const totalScale = sizeRatio * (options.scale || 1.0);
  ctx.scale(totalScale, totalScale);

  const gunX = (r * 0.55) / totalScale;
  const gunY = 4;

  // Heavy Receiver (Dark Slate with Accent)
  ctx.fillStyle = '#1b2620';
  ctx.strokeStyle = tc;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(gunX, gunY - 5.5, 26, 11, 2);
  ctx.fill();
  ctx.stroke();

  // Ejection Port
  ctx.fillStyle = '#09100d';
  ctx.fillRect(gunX + 6, gunY - 4, 12, 4);

  // Heavy Bore 12-Gauge Barrel
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.fillRect(gunX + 26, gunY - 5, 36, 5.5);

  // Tubular Magazine under barrel
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(gunX + 26, gunY + 0.5, 32, 4.5);
  // Magazine Cap
  ctx.fillStyle = tc;
  ctx.fillRect(gunX + 58, gunY + 1, 4, 3.5);

  // Ribbed Pump Forend (Moves back and forth on chambering)
  const pumpOffset = Math.sin(pumpProgress * Math.PI) * 10;
  ctx.fillStyle = '#111827';
  ctx.strokeStyle = tc;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(gunX + 32 - pumpOffset, gunY - 1, 16, 7.5, 2);
  ctx.fill();
  ctx.stroke();
  // Pump grip ridges
  ctx.fillStyle = tc;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(gunX + 35 - pumpOffset + i * 4, gunY + 1, 1.5, 4);
  }

  // Tactical Pistol Grip & Stock
  ctx.fillStyle = '#1e2621';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gunX, gunY);
  ctx.lineTo(gunX - 18, gunY - 2);
  ctx.lineTo(gunX - 22, gunY + 10);
  ctx.lineTo(gunX - 17, gunY + 10);
  ctx.lineTo(gunX - 12, gunY + 3);
  ctx.lineTo(gunX, gunY + 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Muzzle blast if firing
  if (isFiring) {
    drawTacticalMuzzleFlash(ctx, gunX + 63, gunY - 2, 0, 26, tc);
  }

  ctx.restore();
}

/**
 * 3. PISTOL — Semi-Automatic Combat Handgun
 */
export function drawTacticalPistolWeapon(ctx, x, y, angle, r = 25, options = {}) {
  const recoil = options.recoil || 0;
  const isFiring = options.isFiring || false;
  const tc = options.themeColor || '#f59e0b';

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const recoilDist = recoil * 4;
  ctx.translate(-recoilDist, 0);

  const sizeRatio = (r && r > 0) ? (r / 25) : 1.0;
  const totalScale = sizeRatio * (options.scale || 1.0);
  ctx.scale(totalScale, totalScale);

  const gunX = (r * 0.75) / totalScale;
  const gunY = 3;

  // Slide (Accent & Charcoal Steel)
  ctx.fillStyle = '#262015';
  ctx.strokeStyle = tc;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(gunX, gunY - 5, 24, 7, 1.5);
  ctx.fill();
  ctx.stroke();

  // Slide Serrations (Rear grip cuts)
  ctx.fillStyle = tc;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(gunX + 3 + i * 3, gunY - 4, 1.5, 5);
  }

  // Front Sight Pip
  ctx.fillStyle = tc;
  ctx.fillRect(gunX + 20, gunY - 7, 2.5, 2);

  // Lower Frame & Trigger Guard
  ctx.fillStyle = '#18140e';
  ctx.fillRect(gunX + 4, gunY + 2, 16, 4);

  // Pistol Grip (Textured polymer)
  ctx.fillStyle = '#1e1b15';
  ctx.strokeStyle = tc;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gunX + 4, gunY + 2);
  ctx.lineTo(gunX - 4, gunY + 15);
  ctx.lineTo(gunX + 3, gunY + 16);
  ctx.lineTo(gunX + 11, gunY + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Under-barrel Tactical Light / Laser Module
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = tc;
  ctx.lineWidth = 0.8;
  ctx.fillRect(gunX + 12, gunY + 2, 9, 3.5);
  ctx.strokeRect(gunX + 12, gunY + 2, 9, 3.5);

  // Muzzle flash
  if (isFiring) {
    drawTacticalMuzzleFlash(ctx, gunX + 25, gunY - 1.5, 0, 16, tc);
  }

  ctx.restore();
}

/**
 * 4. SNIPER — .338 Bolt-Action Precision Sniper Rifle
 */
export function drawTacticalSniperWeapon(ctx, x, y, angle, r = 25, options = {}) {
  const recoil = options.recoil || 0;
  const isFiring = options.isFiring || false;
  const tc = options.themeColor || '#ef4444';

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const recoilDist = recoil * 9;
  ctx.translate(-recoilDist, 0);

  const sizeRatio = (r && r > 0) ? (r / 25) : 1.0;
  const totalScale = sizeRatio * (options.scale || 1.0);
  ctx.scale(totalScale, totalScale);

  const gunX = (r * 0.55) / totalScale;
  const gunY = 3.5;

  // Solid Chassis / Body (High-Precision Platform)
  ctx.fillStyle = '#112229';
  ctx.strokeStyle = tc;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(gunX, gunY - 4.5, 32, 9, 2);
  ctx.fill();
  ctx.stroke();

  // Long Fluted Precision Barrel
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.fillRect(gunX + 32, gunY - 3, 50, 5);

  // Multi-Port Heavy Muzzle Brake
  ctx.fillStyle = tc;
  ctx.fillRect(gunX + 82, gunY - 4.5, 8, 8);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(gunX + 84, gunY - 3.5, 2, 6);
  ctx.fillRect(gunX + 87, gunY - 3.5, 2, 6);

  // High-Magnification Sniper Scope with Elevation Turrets
  ctx.fillStyle = '#0b1920';
  ctx.strokeStyle = tc;
  ctx.lineWidth = 1;
  // Scope Tube
  ctx.fillRect(gunX + 6, gunY - 12, 28, 5.5);
  ctx.strokeRect(gunX + 6, gunY - 12, 28, 5.5);
  // Objective Bell (Front lens flare)
  ctx.fillStyle = tc;
  ctx.fillRect(gunX + 30, gunY - 13.5, 6, 8.5);
  // Eyepiece Bell
  ctx.fillRect(gunX + 3, gunY - 13, 4, 7.5);
  // Turret knobs
  ctx.fillRect(gunX + 18, gunY - 15, 4, 3);

  // Scope Mount Rings
  ctx.fillStyle = '#64748b';
  ctx.fillRect(gunX + 10, gunY - 6.5, 4, 2.5);
  ctx.fillRect(gunX + 24, gunY - 6.5, 4, 2.5);

  // Folded Tactical Bipod
  ctx.fillStyle = '#475569';
  ctx.fillRect(gunX + 54, gunY + 2, 14, 2.5);

  // Skeletonized Adjustable Sniper Stock
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = tc;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gunX, gunY - 3);
  ctx.lineTo(gunX - 22, gunY - 5);
  ctx.lineTo(gunX - 25, gunY + 10);
  ctx.lineTo(gunX - 20, gunY + 10);
  ctx.lineTo(gunX - 16, gunY + 2);
  ctx.lineTo(gunX, gunY + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Muzzle blast if firing
  if (isFiring) {
    drawTacticalMuzzleFlash(ctx, gunX + 90, gunY - 0.5, 0, 32, tc);
  }

  ctx.restore();
}
