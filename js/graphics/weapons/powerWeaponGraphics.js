// ─────────────────────────────────────────────
// Power (The Blood Fiend) Weapon & Combat FX Visuals
// Adheres strictly to:
// - Rule 16 (Manga Action Speed Lines — 4-Point Filled Needle Polygons)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

import { drawPowerBloodHammer, drawPowerBloodScythe } from '../fighters/powerSkin.js';

const P = 2.0;
function snap(v) {
  return Math.round(v / P) * P;
}

let _powerSpeedLineSeeds = null;

function _initPowerSpeedLineSeeds() {
  const seeds = [];
  const count = 22;
  for (let i = 0; i < count; i++) {
    const norm = (i / (count - 1)) * 2 - 1;
    const perpOffset = norm * 32;
    const normDist = 1 - Math.abs(norm);
    const length = 40 + normDist * 50;
    const speed = 1.2 + Math.random() * 0.8;
    const phase = Math.random() * 100;
    seeds.push({ perpOffset, length, speed, phase });
  }
  return seeds;
}

/**
 * Draws Manga Action Speed Lines behind Power during Hammer Smashes (Rule 16)
 */
export function drawPowerSpeedLines(ctx, fighter) {
  if (!fighter || !fighter.isHammerLunging) return;

  if (!_powerSpeedLineSeeds) {
    _powerSpeedLineSeeds = _initPowerSpeedLineSeeds();
  }

  const now = Date.now();
  const aimAngle = fighter.gunAngle || fighter.angle || 0;
  const backOffset = (fighter.r || 25) * 1.2;
  const cosA = Math.cos(aimAngle);
  const sinA = Math.sin(aimAngle);
  const perpX = -sinA;
  const perpY =  cosA;

  ctx.save();
  for (let i = 0; i < _powerSpeedLineSeeds.length; i++) {
    const seed = _powerSpeedLineSeeds[i];
    const travel = ((now * 0.001 * seed.speed * 60 + seed.phase) % 80);

    const lineCenterX = fighter.x - cosA * (backOffset + travel) + perpX * seed.perpOffset;
    const lineCenterY = fighter.y - sinA * (backOffset + travel) + perpY * seed.perpOffset;

    const halfLen = seed.length * 0.5;
    const startX = lineCenterX - cosA * halfLen;
    const startY = lineCenterY - sinA * halfLen;
    const endX   = lineCenterX + cosA * halfLen;
    const endY   = lineCenterY + sinA * halfLen;

    const midOff = halfLen * 0.15;
    const bulgeX = lineCenterX + cosA * midOff;
    const bulgeY = lineCenterY + sinA * midOff;
    const halfThick = 1.2;

    const topMidX = bulgeX + perpX * halfThick;
    const topMidY = bulgeY + perpY * halfThick;
    const botMidX = bulgeX - perpX * halfThick;
    const botMidY = bulgeY - perpY * halfThick;

    // 4-Slot Color Theme Standard (Rule 16)
    let color;
    if (i % 4 === 0) color = 'rgba(239, 68, 68, 0.90)';   // Bright Blood Crimson
    else if (i % 4 === 1) color = 'rgba(153, 27, 27, 0.85)'; // Deep Fiend Burgundy
    else if (i % 4 === 2) color = 'rgba(254, 240, 138, 0.95)'; // Fiend Gold Glint
    else color = 'rgba(17, 14, 20, 0.90)';                 // Dark Ink Line

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
 * Draws Power's Blood Hammer or Blood Scythe Preview for Weapon Studio
 */
export function drawPowerWeaponPreview(ctx, x = 0, y = 0, angle = 0, r = 25, opts = {}) {
  const isScythe = opts && opts.isScythe;
  if (isScythe) {
    drawPowerBloodScythe(ctx, x, y, angle, r, opts);
  } else {
    drawPowerBloodHammer(ctx, x, y, angle, r, opts);
  }
}

/**
 * Draws an individual floating Blood Dagger in 2D Pixel Art
 */
export function drawPowerBloodDagger(ctx, d) {
  if (!d) return;
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(d.angle || 0);

  // Ink outline
  ctx.fillStyle = '#110E14';
  ctx.fillRect(-12, -3, 24, 6);

  // Blood dagger blade
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(-10, -2, 20, 4);

  // Glowing center glint
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(-8, -1, 14, 2);

  // Needle tip
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(8, -1, 2, 2);

  ctx.restore();
}
