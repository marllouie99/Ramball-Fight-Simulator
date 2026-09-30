// ─────────────────────────────────────────────
// P.E.K.K.A Colossal Heavy Greatsword Weapon Graphics
// Clash of Clans / Clash Royale / Supercell
// Adheres strictly to:
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 2.4 (Canvas 2D Transform Stack Integrity)
// - Weapon Studio Customization Support
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

const P = 2.0; // 2.0px discrete grid
const snap = (v) => Math.round(v / P) * P;

/**
 * Draws P.E.K.K.A's Colossal Greatsword
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x Offset X
 * @param {number} y Offset Y
 * @param {number} angle Facing/Wielding angle
 * @param {number} r Fighter body radius
 * @param {Object} opts Extra options (isPreview, momentumStage, isSwinging, now)
 */
export function drawPekkaBlade(ctx, x, y, angle = 0, r = 28, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Weapon Studio Customization Offsets
  let customX = 0;
  let customY = 0;
  let customScale = 1.0;
  let customAngle = 0;

  if (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.pekka) {
    const cust = state.weaponCustomizations.pekka;
    customX = cust.offsetX || 0;
    customY = cust.offsetY || 0;
    customScale = cust.scale || 1.0;
    customAngle = (cust.angleOffset || 0) * (Math.PI / 180);
  }

  ctx.translate(customX, customY);
  ctx.scale(customScale, customScale);
  ctx.rotate(customAngle);

  const stage = opts.momentumStage || 0;
  const isSwinging = Boolean(opts.isSwinging);

  // Blade dimensions
  const bladeLength = r * 2.3;
  const bladeWidth = r * 0.52;
  const guardWidth = bladeWidth * 1.6;
  const guardThickness = 7.0;
  const hiltLength = r * 0.7;

  // 1. Greatsword Hilt (Wrapped Steel Handle)
  ctx.fillStyle = '#1E1B4B'; // Obsidian dark indigo
  ctx.fillRect(-hiltLength, -3.5, hiltLength, 7.0);

  // Silver grip rings
  ctx.fillStyle = '#64748B';
  for (let i = 0; i < 4; i++) {
    const rx = -hiltLength + 4 + i * 5;
    ctx.fillRect(rx, -4, 2, 8);
  }

  // Heavy Pommel with glowing magenta elixir crystal
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(-hiltLength - 4, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#E879F9'; // Radiant magenta elixir core
  ctx.beginPath();
  ctx.arc(-hiltLength - 4, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 2. Heavy Angular Crossguard
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.moveTo(0, -guardWidth / 2);
  ctx.lineTo(guardThickness, -guardWidth / 2 + 4);
  ctx.lineTo(guardThickness, guardWidth / 2 - 4);
  ctx.lineTo(0, guardWidth / 2);
  ctx.lineTo(-3, 0);
  ctx.closePath();
  ctx.fill();

  // Guard border highlights
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Central elixir power socket in crossguard
  ctx.fillStyle = stage >= 2 ? '#E879F9' : '#C026D3';
  ctx.fillRect(1, -3, 4, 6);

  // 3. Colossal Broadsword Blade Body (Beveled Steel + Dark Fuller)
  const tipX = bladeLength;
  const taperStartX = bladeLength * 0.78;

  // Dark fuller core
  ctx.beginPath();
  ctx.moveTo(guardThickness, -bladeWidth / 2);
  ctx.lineTo(taperStartX, -bladeWidth / 2);
  ctx.lineTo(tipX, 0);
  ctx.lineTo(taperStartX, bladeWidth / 2);
  ctx.lineTo(guardThickness, bladeWidth / 2);
  ctx.closePath();

  ctx.fillStyle = '#1E293B'; // Heavy dark slate steel body
  ctx.fill();
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Top cutting edge bevel (Light silver-blue steel)
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.moveTo(guardThickness, -bladeWidth / 2);
  ctx.lineTo(taperStartX, -bladeWidth / 2);
  ctx.lineTo(tipX, 0);
  ctx.lineTo(taperStartX, -bladeWidth / 2 + 3.5);
  ctx.lineTo(guardThickness, -bladeWidth / 2 + 3.5);
  ctx.closePath();
  ctx.fill();

  // Bottom cutting edge bevel
  ctx.fillStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.moveTo(guardThickness, bladeWidth / 2);
  ctx.lineTo(taperStartX, bladeWidth / 2);
  ctx.lineTo(tipX, 0);
  ctx.lineTo(taperStartX, bladeWidth / 2 - 3.5);
  ctx.lineTo(guardThickness, bladeWidth / 2 - 3.5);
  ctx.closePath();
  ctx.fill();

  // 4. Central Magenta Elixir Energy Channel (P.E.K.K.A Core Rune Line)
  const channelAlpha = stage === 3 ? 1.0 : (stage === 2 ? 0.85 : 0.60);
  ctx.fillStyle = stage === 3 ? '#FFFFFF' : (stage === 2 ? '#E879F9' : `rgba(192, 38, 211, ${channelAlpha})`);
  ctx.fillRect(guardThickness + 4, -1.5, bladeLength * 0.65, 3.0);

  // Concentric energy aura during high momentum (Rule 11 compliant glow simulation)
  if (stage >= 2 || isSwinging) {
    const glowColor = stage === 3 ? 'rgba(244, 114, 182, 0.35)' : 'rgba(232, 121, 249, 0.25)';
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = stage === 3 ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(guardThickness, -bladeWidth / 2 - 1.5);
    ctx.lineTo(taperStartX, -bladeWidth / 2 - 1.5);
    ctx.lineTo(tipX + 3, 0);
    ctx.lineTo(taperStartX, bladeWidth / 2 + 1.5);
    ctx.lineTo(guardThickness, bladeWidth / 2 + 1.5);
    ctx.stroke();
  }

  // Stage 3 Overclock: Sparks crackling along the blade tip
  if (stage === 3) {
    const now = typeof opts.now === 'number' ? opts.now : Date.now();
    const sparkPhase = (now % 300) / 300;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(taperStartX - 5, -2);
    ctx.lineTo(taperStartX + 8, Math.sin(sparkPhase * Math.PI * 4) * 4);
    ctx.lineTo(tipX + 2, 0);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Metadata export for Weapon Studio & Weapon Index
 */
export const PEKKA_WEAPON_GRAPHICS = {
  name: 'Colossal Greatsword',
  type: 'pekka',
  draw: drawPekkaBlade
};

/**
 * Standard weapon renderer wrapper for UI screens
 */
export function drawPekkaWeapon(ctx, options = {}) {
  const x = options.x || 0;
  const y = options.y || 0;
  const angle = options.angle || 0;
  const r = options.r || 28;
  const momentumStage = options.momentumStage || 1;
  drawPekkaBlade(ctx, x, y, angle, r, { momentumStage, isSwinging: false });
}

