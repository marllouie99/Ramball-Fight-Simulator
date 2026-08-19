// ─────────────────────────────────────────────
// Nobara Kugisaki — Weapon & Technique Graphics
// Steel Hammer, Cursed Nails & Straw Doll (Effigy)
// Adheres strictly to Rule 11 (Zero shadowBlur)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

/**
 * Draws Nobara's signature Steel Carpenter Claw Hammer.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x Weapon anchor X in local coordinates
 * @param {number} y Weapon anchor Y in local coordinates
 * @param {number} angle Additional rotation angle offset
 * @param {number} r Fighter radius
 * @param {boolean} isSwinging Whether actively executing a melee swing
 * @param {boolean} isBlackFlash Whether Black Flash lightning is surging
 */
export function drawNobaraHammer(ctx, x = 0, y = 0, angle = 0, r = 25, isSwinging = false, isBlackFlash = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const hScale = r / 25; // Proportional scale

  // 1. Cursed Energy Ambient Aura / Black Flash Sparks around Hammer Head
  if (isBlackFlash) {
    // Red-Black spatial lightning aura
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(14 * hScale, -2 * hScale, 11 * hScale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(14 * hScale, -2 * hScale, 12.5 * hScale, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Subtle Deep Rose Cursed Energy Shimmer
    const glowGrad = ctx.createRadialGradient(14 * hScale, -2 * hScale, 2 * hScale, 14 * hScale, -2 * hScale, 14 * hScale);
    glowGrad.addColorStop(0, 'rgba(217, 78, 104, 0.45)');
    glowGrad.addColorStop(0.6, 'rgba(255, 107, 129, 0.20)');
    glowGrad.addColorStop(1, 'rgba(217, 78, 104, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(14 * hScale, -2 * hScale, 14 * hScale, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Wooden Handle (Ergonomic Oak Tone with subtle grain)
  const handleW = 4.5 * hScale;
  const handleL = 26 * hScale;
  const handleX = -10 * hScale;
  const handleY = -handleW / 2;

  // Handle Base
  ctx.fillStyle = '#8B5A2B'; // Oak wood brown
  ctx.beginPath();
  ctx.roundRect(handleX, handleY, handleL, handleW, 1.5 * hScale);
  ctx.fill();

  // Handle Highlight Top Edge
  ctx.fillStyle = '#A66F38';
  ctx.beginPath();
  ctx.roundRect(handleX, handleY, handleL, handleW * 0.35, 1 * hScale);
  ctx.fill();

  // Handle Bottom Shadow Edge
  ctx.fillStyle = '#5A3714';
  ctx.beginPath();
  ctx.roundRect(handleX, handleY + handleW * 0.65, handleL, handleW * 0.35, 1 * hScale);
  ctx.fill();

  // Dark Steel Buttcap
  ctx.fillStyle = '#2C3038';
  ctx.beginPath();
  ctx.roundRect(handleX - 1.5 * hScale, handleY - 0.5 * hScale, 3.5 * hScale, handleW + 1 * hScale, 1 * hScale);
  ctx.fill();

  // 3. Forged Steel Hammer Head
  const headX = handleX + handleL - 2 * hScale;
  const headY = -8 * hScale;
  const headW = 10 * hScale;
  const headH = 16 * hScale;

  // A. Central Steel Collar & Shaft Eye
  ctx.fillStyle = '#4B5563'; // Steel Gray
  ctx.beginPath();
  ctx.roundRect(headX - 1 * hScale, -4 * hScale, 7 * hScale, 8 * hScale, 1.5 * hScale);
  ctx.fill();

  // Collar Bevel Highlight
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = 1.0 * hScale;
  ctx.stroke();

  // B. Striking Face (Forward +X side)
  ctx.fillStyle = '#374151'; // Dark Forged Steel
  ctx.beginPath();
  ctx.roundRect(headX + 4 * hScale, -4.5 * hScale, 6.5 * hScale, 9 * hScale, 1 * hScale);
  ctx.fill();

  // Striking Face Chamfered Front Edge
  ctx.fillStyle = '#D1D5DB'; // Polished Strike Surface
  ctx.beginPath();
  ctx.roundRect(headX + 9.5 * hScale, -4 * hScale, 2 * hScale, 8 * hScale, 0.5 * hScale);
  ctx.fill();

  // C. Curved Rear Claw (Curving Backwards for Prying)
  ctx.fillStyle = '#374151';
  ctx.beginPath();
  ctx.moveTo(headX, -3.5 * hScale);
  ctx.quadraticCurveTo(headX - 6 * hScale, -6 * hScale, headX - 8 * hScale, -11 * hScale);
  ctx.lineTo(headX - 5.5 * hScale, -11 * hScale);
  ctx.quadraticCurveTo(headX - 3.5 * hScale, -6.5 * hScale, headX + 2 * hScale, -4.5 * hScale);
  ctx.closePath();
  ctx.fill();

  // Claw Sharp Inner V-Notch & Highlight
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 0.9 * hScale;
  ctx.beginPath();
  ctx.moveTo(headX - 8 * hScale, -11 * hScale);
  ctx.quadraticCurveTo(headX - 4.5 * hScale, -6.5 * hScale, headX + 2 * hScale, -4.5 * hScale);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws Floating Cursed Steel Nails around Nobara's off-hand.
 */
export function drawNobaraFloatingNails(ctx, x, y, nailCount = 3, isEcstasy = false) {
  if (nailCount <= 0) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  
  ctx.save();
  ctx.translate(x, y);

  const count = Math.min(5, Math.max(1, nailCount));
  for (let i = 0; i < count; i++) {
    const bobOffset = Math.sin((now * 0.005) + (i * 1.3)) * 2.5;
    const nailX = (i - (count - 1) / 2) * 5.5;
    const nailY = bobOffset - (i * 2.0);
    const nailRot = (i - (count - 1) / 2) * 0.18 + Math.sin(now * 0.003 + i) * 0.12;

    ctx.save();
    ctx.translate(nailX, nailY);
    ctx.rotate(nailRot);

    // Cursed Energy Glow dot
    const glowColor = isEcstasy ? 'rgba(255, 60, 90, 0.60)' : 'rgba(217, 78, 104, 0.45)';
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Steel Nail Shank & Point
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(-1.2, -7);
    ctx.lineTo(1.2, -7);
    ctx.lineTo(0.8, 4);
    ctx.lineTo(0, 7.5); // Sharp point
    ctx.lineTo(-0.8, 4);
    ctx.closePath();
    ctx.fill();

    // Nail Flat Top Head
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.roundRect(-2.8, -8.5, 5.6, 2.0, 0.6);
    ctx.fill();

    // Center metallic shine line
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.lineTo(0, 5.5);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws Embedded Cursed Steel Nails on a Target Entity.
 */
export function drawEmbeddedNailsOnTarget(ctx, target) {
  if (!target || !target.embeddedNails || target.embeddedNails <= 0) return;

  const r = target.r || 25;
  const count = Math.min(5, target.embeddedNails);
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  ctx.save();
  ctx.translate(target.x, target.y);

  for (let i = 0; i < count; i++) {
    const angle = (i * (Math.PI * 2 / 5)) + 0.35;
    const spikeDist = r * 0.78;
    const sx = Math.cos(angle) * spikeDist;
    const sy = Math.sin(angle) * spikeDist;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle + Math.PI / 2);

    // Cursed Rose Shock Halo
    const pulse = 1.0 + Math.sin(now * 0.008 + i * 1.5) * 0.2;
    ctx.strokeStyle = `rgba(217, 78, 104, ${(0.65 * pulse).toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 5.5 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Protruding Steel Spike
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(-1.4, -9);
    ctx.lineTo(1.4, -9);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();

    // Flat Head
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.roundRect(-2.6, -10.5, 5.2, 1.8, 0.5);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws the Spectral Straw Doll (Effigy) for Resonance.
 */
export function drawStrawDollGraphic(ctx, x, y, scale = 1.0, progress = 0.0, isResonance = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 1. Straw Doll Body Texture & Weave (Straw Gold #D4AF37)
  const strawColor = '#C99E32';
  const strawDark = '#8C6818';
  const strawHighlight = '#F0C75E';

  // Torso
  ctx.fillStyle = strawColor;
  ctx.beginPath();
  ctx.roundRect(-7, -8, 14, 20, 3);
  ctx.fill();

  // Head (Round straw bundle)
  ctx.beginPath();
  ctx.arc(0, -15, 8.5, 0, Math.PI * 2);
  ctx.fill();

  // Cross-hatched straw grain lines
  ctx.strokeStyle = strawDark;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-5, -6); ctx.lineTo(5, -2);
  ctx.moveTo(-5, 0);  ctx.lineTo(5, 4);
  ctx.moveTo(-5, 6);  ctx.lineTo(5, 10);
  ctx.moveTo(5, -6);  ctx.lineTo(-5, -2);
  ctx.moveTo(5, 0);   ctx.lineTo(-5, 4);
  ctx.stroke();

  // Twin Cross-Stitch Button Eyes (Dark Charcoal/Black)
  ctx.strokeStyle = '#1F2937';
  ctx.lineWidth = 1.3;
  // Left eye cross
  ctx.beginPath();
  ctx.moveTo(-4.5, -17.5); ctx.lineTo(-1.5, -14.5);
  ctx.moveTo(-1.5, -17.5); ctx.lineTo(-4.5, -14.5);
  // Right eye cross
  ctx.moveTo(1.5, -17.5);  ctx.lineTo(4.5, -14.5);
  ctx.moveTo(4.5, -17.5);  ctx.lineTo(1.5, -14.5);
  ctx.stroke();

  // Red Cursed Binding Thread / Heart Seal
  ctx.strokeStyle = '#EF4444';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6, -8);
  ctx.lineTo(6, 12);
  ctx.moveTo(6, -8);
  ctx.lineTo(-6, 12);
  ctx.stroke();

  // Cursed Nail Impalement on Resonance
  if (isResonance || progress > 0.3) {
    const nailDrive = Math.min(1.0, progress * 1.5);
    const nailY = -4 + (nailDrive * 3);

    // Glowing Crimson Nail Head & Spike
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.roundRect(-4, nailY - 2, 8, 3, 0.8);
    ctx.fill();

    // Spatial Curse Discharge
    ctx.strokeStyle = 'rgba(217, 78, 104, 0.85)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, nailY, 8 + Math.sin(progress * 12) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
