// ─────────────────────────────────────────────
// Reze (The Bomb Devil Hybrid) Weapon Visuals & Explosive FX
// Chainsaw Man / Soviet Assassin & Bomb Devil
// Adheres strictly to:
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 16 (Manga Action Speed Line Effects — Construction & Angle Standards)
// - Rule 10 (WebGL / Canvas 2D Performance Preservation)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

let _rezeSpeedLineSeeds = null;

function _getRezeSpeedLineSeeds() {
  if (_rezeSpeedLineSeeds) return _rezeSpeedLineSeeds;
  _rezeSpeedLineSeeds = [];
  const lineCount = 24;
  for (let i = 0; i < lineCount; i++) {
    const norm = (i / (lineCount - 1)) * 2 - 1; // -1.0 to 1.0
    const perpOffset = norm * 35; // ±35px cluster width
    const normDist = 1 - Math.abs(norm);
    const baseLength = 35 + normDist * 55; // 35px to 90px parabolic length
    const speed = 1.2 + Math.random() * 0.8;
    const phase = Math.random() * 100;
    const maxThick = 1.0 + normDist * 1.2; // 1.0px to 2.2px max thickness
    _rezeSpeedLineSeeds.push({ perpOffset, baseLength, speed, phase, maxThick });
  }
  return _rezeSpeedLineSeeds;
}

/**
 * Draws Manga Action Speed Lines behind Reze during Supersonic Rocket Lunge (Rule 16 Compliant)
 */
export function drawRezeSpeedLines(ctx, fighter) {
  if (!fighter || !fighter.isRocketLunging) return;

  const r = fighter.r || 25;
  const aimAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  const cosA = Math.cos(aimAngle);
  const sinA = Math.sin(aimAngle);
  const perpX = -sinA;
  const perpY = cosA;

  const backOffset = r * 1.2;
  const seeds = _getRezeSpeedLineSeeds();
  const now = Date.now();

  ctx.save();
  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    const travel = ((now * 0.001 * seed.speed * 60 + seed.phase) % 80);

    // Negative cosA/sinA streams strictly BEHIND the fighter
    const lineCenterX = fighter.x - cosA * (backOffset + travel) + perpX * seed.perpOffset;
    const lineCenterY = fighter.y - sinA * (backOffset + travel) + perpY * seed.perpOffset;

    const halfLen = seed.baseLength * 0.5;
    const startX = lineCenterX - cosA * halfLen;
    const startY = lineCenterY - sinA * halfLen;
    const endX   = lineCenterX + cosA * halfLen;
    const endY   = lineCenterY + sinA * halfLen;

    // 4-point double-tapered needle polygon
    const midOff = halfLen * 0.15;
    const midX = lineCenterX + cosA * midOff;
    const midY = lineCenterY + sinA * midOff;
    const halfThick = seed.maxThick * 0.5;

    const topMidX = midX + perpX * halfThick;
    const topMidY = midY + perpY * halfThick;
    const botMidX = midX - perpX * halfThick;
    const botMidY = midY - perpY * halfThick;

    // 4-Slot Character Theme Palette (Rule 16 Standard)
    let color;
    if (i % 4 === 0) color = 'rgba(255, 107, 26, 0.90)';      // Tangerine Flame Orange
    else if (i % 4 === 1) color = 'rgba(255, 230, 0, 0.95)'; // Spark Gold
    else if (i % 4 === 2) color = 'rgba(255, 255, 255, 0.98)'; // Pure White Kinetic Core
    else color = 'rgba(30, 26, 36, 0.85)';                   // Dark Gunpowder Ink

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(topMidX, topMidY);
    ctx.lineTo(endX, endY);
    ctx.lineTo(botMidX, botMidY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws Spark Flechette Projectile (tight flying spark needle with trailing embers)
 */
export function drawSparkFlechette(ctx, projectile) {
  const x = projectile.x;
  const y = projectile.y;
  const angle = projectile.angle || Math.atan2(projectile.vy, projectile.vx);
  const len = 14;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Outer orange combustion glow
  ctx.fillStyle = 'rgba(255, 107, 26, 0.40)';
  ctx.beginPath();
  ctx.ellipse(0, 0, len * 0.8, 6.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sharp yellow/gold flechette core
  ctx.fillStyle = '#FFE600';
  ctx.beginPath();
  ctx.moveTo(-len * 0.5, -2.5);
  ctx.lineTo(len * 0.5, 0); // Sharp needle tip
  ctx.lineTo(-len * 0.5, 2.5);
  ctx.closePath();
  ctx.fill();

  // White-hot center
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-len * 0.3, -1.0, len * 0.6, 2.0);

  ctx.restore();
}

/**
 * Draws Decoy Bomb Entity (Running Clone Silhouette with live spark fuse)
 */
export function drawRezeDecoy(ctx, decoy) {
  const r = decoy.r || 20;
  const now = Date.now();

  ctx.save();
  ctx.translate(decoy.x, decoy.y);
  ctx.rotate(decoy.angle || 0);

  // Shadowy clone body
  ctx.fillStyle = 'rgba(32, 27, 46, 0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FF6B1A';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Burning fuse on decoy head
  const fuseX = 0;
  const fuseY = -r * 0.9;
  ctx.fillStyle = '#FFE600';
  ctx.beginPath();
  ctx.arc(fuseX, fuseY - 6, 4.5 + Math.sin(now * 0.03) * 2.0, 0, Math.PI * 2);
  ctx.fill();

  // Floating warning text
  ctx.fillStyle = '#FFE600';
  ctx.font = '700 8px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BOMB!', 0, -r - 12);

  ctx.restore();
}

/**
 * Draws Explosive Palm Blast Cone (Basic Attack Finisher 3rd Hit)
 */
export function drawRezePalmBlast(ctx, blast) {
  const p = Math.max(0, Math.min(1.0, 1.0 - (blast.timer / blast.maxTimer)));
  const curRadius = blast.radius * Math.pow(p, 0.6);
  const alpha = 1.0 - Math.pow(p, 1.5);

  ctx.save();
  ctx.translate(blast.x, blast.y);
  ctx.rotate(blast.angle);

  // Outer orange shockwave arc
  ctx.fillStyle = `rgba(255, 107, 26, ${0.45 * alpha})`;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, curRadius, -blast.arc / 2, blast.arc / 2);
  ctx.closePath();
  ctx.fill();

  // Inner bright yellow flame core
  ctx.fillStyle = `rgba(255, 230, 0, ${0.75 * alpha})`;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, curRadius * 0.65, -blast.arc / 2.5, blast.arc / 2.5);
  ctx.closePath();
  ctx.fill();

  // White-hot shock boundary stroke
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.90 * alpha})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, curRadius, -blast.arc / 2, blast.arc / 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws Megaton Tsar Nuke Ultimate Visuals (Exploding Fireball, Mach Rings, Scorch Crater)
 */
export function drawRezeMegatonNuke(ctx, nuke) {
  const p = Math.max(0, Math.min(1.0, 1.0 - (nuke.timer / nuke.maxTimer)));
  const maxR = nuke.radius || 220;
  const curR = maxR * Math.pow(p, 0.5);
  const alpha = 1.0 - Math.pow(p, 1.2);

  ctx.save();
  ctx.translate(nuke.x, nuke.y);

  // 1. Concentric Fireball Expanding Rings (Rule 11: Zero shadowBlur)
  ctx.fillStyle = `rgba(255, 46, 0, ${0.35 * alpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, curR * 1.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 107, 26, ${0.55 * alpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, curR * 0.85, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 230, 0, ${0.75 * alpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, curR * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // White-hot nuclear detonation core
  if (p < 0.4) {
    const coreAlpha = (1.0 - (p / 0.4));
    ctx.fillStyle = `rgba(255, 255, 255, ${coreAlpha * 0.95})`;
    ctx.beginPath();
    ctx.arc(0, 0, curR * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // Supersonic Mach Compression Shockwave Rings
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * alpha})`;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, curR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 107, 26, ${0.60 * alpha})`;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, curR * 0.92, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
