// ─────────────────────────────────────────────
// Ulquiorra Cifer — Weapon & Technique Graphics
// Zanpakutō Murciélago & Lanza del Relámpago
// Bleach: Arrancar / Hueco Mundo Arc
//
// Adheres strictly to:
// - Rule 11 (Zero shadowBlur - Concentric fills)
// - Rule 15 (Double-tapered crescent slashes)
// - Rule 20 (Skin Only & Hand Visibility)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

/**
 * Draws Ulquiorra's Zanpakutō: Murciélago (The Black-Winged Great Demon).
 * Features:
 * - Japanese Katana with dark emerald green silk cord wrap (Tsuka-ito).
 * - 4-corner flared Espada crossguard (Tsuba) with emerald accent inlays.
 * - Polished brass blade collar (Habaki).
 * - Sleek tempered curved katana blade with radiant green Reishi fuller gleam.
 *
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x Hand anchor X
 * @param {number} y Hand anchor Y
 * @param {number} angle Additional swing angle in radians
 * @param {number} r Fighter radius
 * @param {boolean} isSwinging Whether actively slashing
 * @param {number} swingProgress Progress of the swing (0 to 1)
 */
export function drawUlquiorraMurcielago(ctx, x = 0, y = 0, angle = 0, r = 25, isSwinging = false, swingProgress = 0) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  const custom = (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.ulquiorra)
    ? state.weaponCustomizations.ulquiorra
    : { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };

  const customScale = custom.scale !== undefined ? custom.scale : 1.0;
  const customOffsetX = custom.offsetX !== undefined ? custom.offsetX : 0;
  const customOffsetY = custom.offsetY !== undefined ? custom.offsetY : 0;
  const customAngle = custom.angleOffset !== undefined ? custom.angleOffset : 0;

  ctx.save();
  ctx.translate(x + customOffsetX, y + customOffsetY);
  ctx.rotate(angle + customAngle);
  ctx.scale(customScale, customScale);

  const scale = r / 25;

  // 1. Subtle Reishi Energy Glow (Concentric radial gradient, Rule 11 compliant)
  const glowGrad = ctx.createRadialGradient(28 * scale, 0, 4 * scale, 28 * scale, 0, 36 * scale);
  glowGrad.addColorStop(0, 'rgba(0, 255, 136, 0.30)');
  glowGrad.addColorStop(0.60, 'rgba(0, 200, 100, 0.12)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(28 * scale, 0, 36 * scale, 0, Math.PI * 2);
  ctx.fill();

  // ─────────────────────────────────────────────
  // 2. KATANA HILT & POMMEL (Extending along -X)
  // ─────────────────────────────────────────────
  const hiltLength = 18 * scale;
  const hiltWidth = 4.2 * scale;
  const pommelRadius = 2.4 * scale;

  // A. Kashira (Pommel Cap)
  ctx.fillStyle = '#14181F';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.arc(-hiltLength, 0, pommelRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Gold Kashira Accent Ring
  ctx.fillStyle = '#D4AF37';
  ctx.beginPath();
  ctx.arc(-hiltLength, 0, pommelRadius * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // B. Tsuka (Handle) Wrapped in Emerald Tsuka-ito
  ctx.fillStyle = '#006633'; // Deep Emerald base wrap
  ctx.strokeStyle = '#0B0F14';
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.roundRect(-hiltLength, -hiltWidth / 2, hiltLength, hiltWidth, 1.2 * scale);
  ctx.fill();
  ctx.stroke();

  // Diamond Cross-Wrap Diamonds (Menuki pattern)
  ctx.fillStyle = '#00FF88';
  for (let i = 0; i < 4; i++) {
    const dx = -hiltLength + 2.5 * scale + i * (3.8 * scale);
    ctx.beginPath();
    ctx.moveTo(dx, -hiltWidth * 0.35);
    ctx.lineTo(dx + 1.8 * scale, 0);
    ctx.lineTo(dx, hiltWidth * 0.35);
    ctx.lineTo(dx - 1.8 * scale, 0);
    ctx.closePath();
    ctx.fill();
  }

  // ─────────────────────────────────────────────
  // 3. TSUBA (4-Corner Flared Espada Crossguard at X = 0)
  // ─────────────────────────────────────────────
  ctx.fillStyle = '#14181F';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.3 * scale;
  ctx.beginPath();
  // 4-corner flared crossguard polygon
  ctx.moveTo(0, -7.5 * scale);
  ctx.lineTo(2.0 * scale, -4.5 * scale);
  ctx.lineTo(3.2 * scale, 0);
  ctx.lineTo(2.0 * scale, 4.5 * scale);
  ctx.lineTo(0, 7.5 * scale);
  ctx.lineTo(-2.0 * scale, 4.5 * scale);
  ctx.lineTo(-3.2 * scale, 0);
  ctx.lineTo(-2.0 * scale, -4.5 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Emerald Inlays on Tsuba corners
  ctx.fillStyle = '#00FF88';
  ctx.beginPath();
  ctx.arc(0, -5.2 * scale, 1.0 * scale, 0, Math.PI * 2);
  ctx.arc(0, 5.2 * scale, 1.0 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Habaki (Blade Collar at base)
  ctx.fillStyle = '#E5C158'; // Brass Gold
  ctx.strokeStyle = '#8C6D1F';
  ctx.lineWidth = 1.0 * scale;
  ctx.fillRect(0, -2.5 * scale, 3.5 * scale, 5.0 * scale);
  ctx.strokeRect(0, -2.5 * scale, 3.5 * scale, 5.0 * scale);

  // ─────────────────────────────────────────────
  // 4. TEMPERED KATANA BLADE (Extending along +X)
  // ─────────────────────────────────────────────
  const bladeStart = 3.5 * scale;
  const bladeLength = 48 * scale;
  const bladeWidth = 3.8 * scale;

  ctx.save();
  // Blade silhouette
  ctx.beginPath();
  ctx.moveTo(bladeStart, -bladeWidth / 2); // Spine base
  ctx.lineTo(bladeStart + bladeLength - 6 * scale, -bladeWidth / 2); // Spine top
  ctx.lineTo(bladeStart + bladeLength, 0); // Kissaki tip
  ctx.lineTo(bladeStart + bladeLength - 4 * scale, bladeWidth / 2); // Ha (Edge) point
  ctx.lineTo(bladeStart, bladeWidth / 2); // Ha base
  ctx.closePath();

  // Blade Metallic Steel Gradient
  const bladeGrad = ctx.createLinearGradient(0, -bladeWidth / 2, 0, bladeWidth / 2);
  bladeGrad.addColorStop(0, '#CBD5E1');   // Spine tone
  bladeGrad.addColorStop(0.45, '#FFFFFF'); // Specular highlight
  bladeGrad.addColorStop(0.55, '#E2E8F0'); // Shinogi line
  bladeGrad.addColorStop(1.0, '#FFFFFF');  // Razor cutting edge
  ctx.fillStyle = bladeGrad;
  ctx.fill();

  // Blade Ink Outline
  ctx.strokeStyle = '#0B0F14';
  ctx.lineWidth = 1.2 * scale;
  ctx.stroke();

  // Shinogi Ridge Line & Reishi Fuller (Emerald energy gleam)
  ctx.strokeStyle = '#00FF88';
  ctx.lineWidth = 0.9 * scale;
  ctx.beginPath();
  ctx.moveTo(bladeStart + 2 * scale, 0);
  ctx.lineTo(bladeStart + bladeLength - 6 * scale, 0);
  ctx.stroke();

  // Hamon Tempering Wave along cutting edge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 0.7 * scale;
  ctx.beginPath();
  for (let xPos = bladeStart + 2 * scale; xPos < bladeStart + bladeLength - 6 * scale; xPos += 4 * scale) {
    ctx.lineTo(xPos, bladeWidth * 0.35);
    ctx.lineTo(xPos + 2 * scale, bladeWidth * 0.15);
  }
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

/**
 * Draws Ulquiorra's Segunda Etapa Ultimate Weapon: Lanza del Relámpago (Spear of Lightning).
 * A dual-headed crackling Reishi plasma javelin.
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x Hand anchor X
 * @param {number} y Hand anchor Y
 * @param {number} angle Spear aim angle
 * @param {number} r Fighter radius
 * @param {number} chargeRatio Charge level from 0.0 to 1.0
 */
export function drawLanzaDelRelampago(ctx, x = 0, y = 0, angle = 0, r = 25, chargeRatio = 1.0) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const scale = (r / 25) * (0.8 + chargeRatio * 0.4);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const spearLength = 95 * scale;
  const halfLen = spearLength / 2;
  const pulse = Math.sin(now * 0.02) * 1.5;

  // 1. Concentric Luminous Energy Aura (Rule 11 zero shadowBlur)
  const auraGrad = ctx.createRadialGradient(0, 0, 8 * scale, 0, 0, (halfLen + 20) * scale);
  auraGrad.addColorStop(0, 'rgba(0, 255, 136, 0.45)');
  auraGrad.addColorStop(0.40, 'rgba(0, 200, 100, 0.20)');
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, (halfLen + 15) * scale, 16 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Dual-Pointed Pure Reishi Lightning Spear Shaft
  // Center Thick, Tapering to both tips
  ctx.fillStyle = '#00FF88';
  ctx.beginPath();
  ctx.moveTo(-halfLen, 0); // Back tip
  ctx.lineTo(-halfLen * 0.7, -2.5 * scale);
  ctx.lineTo(0, -4.5 * scale - pulse * 0.3); // Center width
  ctx.lineTo(halfLen * 0.7, -2.5 * scale);
  ctx.lineTo(halfLen, 0); // Front tip
  ctx.lineTo(halfLen * 0.7, 2.5 * scale);
  ctx.lineTo(0, 4.5 * scale + pulse * 0.3);
  ctx.lineTo(-halfLen * 0.7, 2.5 * scale);
  ctx.closePath();
  ctx.fill();

  // 3. Super White-Hot Pure Energy Core
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(-halfLen * 0.95, 0);
  ctx.lineTo(-halfLen * 0.6, -1.2 * scale);
  ctx.lineTo(0, -2.0 * scale);
  ctx.lineTo(halfLen * 0.6, -1.2 * scale);
  ctx.lineTo(halfLen * 0.95, 0);
  ctx.lineTo(halfLen * 0.6, 1.2 * scale);
  ctx.lineTo(0, 2.0 * scale);
  ctx.lineTo(-halfLen * 0.6, 1.2 * scale);
  ctx.closePath();
  ctx.fill();

  // 4. Barbed Spearhead Flares at Front & Rear Tips
  ctx.fillStyle = '#00FF88';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.0 * scale;

  // Front Spearhead Barbs
  ctx.beginPath();
  ctx.moveTo(halfLen, 0);
  ctx.lineTo(halfLen - 12 * scale, -6 * scale);
  ctx.lineTo(halfLen - 8 * scale, -1.5 * scale);
  ctx.lineTo(halfLen - 12 * scale, 6 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rear Spearhead Barbs
  ctx.beginPath();
  ctx.moveTo(-halfLen, 0);
  ctx.lineTo(-halfLen + 12 * scale, -6 * scale);
  ctx.lineTo(-halfLen + 8 * scale, -1.5 * scale);
  ctx.lineTo(-halfLen + 12 * scale, 6 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 5. Orbiting Lightning Plasma Arcs
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const seed = (now * 0.006 + i * 1.57) % (Math.PI * 2);
    const startX = Math.cos(seed) * halfLen * 0.8;
    const startY = Math.sin(seed * 3) * (7 * scale);
    const midX = startX + (Math.sin(now * 0.01 + i) * 10 * scale);
    const midY = -startY * 1.2;
    ctx.moveTo(startX, startY);
    ctx.lineTo(midX, midY);
  }
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws Ulquiorra's dynamic double-tapered crescent slash arc.
 * Fully compliant with Rule 15 (Needle-thin power curve tapering).
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x Center X
 * @param {number} y Center Y
 * @param {number} angle Facing angle
 * @param {number} radius Outer arc radius
 * @param {number} progress Swing animation progress (0.0 to 1.0)
 * @param {boolean} isOscuras Whether to render the pitch-black Cero Oscuras slash
 */
export function drawUlquiorraSlashArc(ctx, x = 0, y = 0, angle = 0, radius = 60, progress = 0.5, isOscuras = false) {
  if (progress <= 0 || progress >= 1) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const arcSpan = 2.1; // ~120 degrees
  const halfArc = arcSpan / 2;
  const startAngle = -halfArc;
  const endAngle = halfArc;
  const maxThick = isOscuras ? 14 : 9;

  const steps = 24;
  const outerPts = [];
  const innerPts = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = startAngle + t * (endAngle - startAngle);
    
    // Double-tapered thickness curve (Rule 15)
    const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
    const thick = maxThick * taper;
    
    const rOuter = radius + thick / 2;
    const rInner = radius - thick / 2;

    outerPts.push({ x: Math.cos(a) * rOuter, y: Math.sin(a) * rOuter });
    innerPts.push({ x: Math.cos(a) * rInner, y: Math.sin(a) * rInner });
  }

  // Draw 4-point filled polygon ribbon
  ctx.beginPath();
  ctx.moveTo(outerPts[0].x, outerPts[0].y);
  for (let i = 1; i < outerPts.length; i++) {
    ctx.lineTo(outerPts[i].x, outerPts[i].y);
  }
  for (let i = innerPts.length - 1; i >= 0; i--) {
    ctx.lineTo(innerPts[i].x, innerPts[i].y);
  }
  ctx.closePath();

  if (isOscuras) {
    // Pitch-black abyss core with emerald outer glow
    ctx.fillStyle = '#05080C';
    ctx.fill();
    ctx.strokeStyle = '#00FF88';
    ctx.lineWidth = 1.8;
    ctx.stroke();
  } else {
    // Radiant Emerald Reishi Crescent
    const grad = ctx.createLinearGradient(outerPts[0].x, outerPts[0].y, outerPts[steps].x, outerPts[steps].y);
    grad.addColorStop(0, 'rgba(0, 255, 136, 0.1)');
    grad.addColorStop(0.5, 'rgba(0, 255, 136, 0.95)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  ctx.restore();
}
