// ─────────────────────────────────────────────
// Ulquiorra Cifer — Weapon & Technique Graphics
// Zanpakutō Murciélago & Lanza del Relámpago
// Bleach: Arrancar / Hueco Mundo Arc
//
// Authentic Single-Edged Japanese Katana Architecture:
// - Uniform 4.8px blade width along the shaft with authentic upward Sori curvature
// - Classic Japanese Kissaki (Tip) with upward Fukura sweep & Yokote line
// - Mint/Seafoam green silk Tsuka-ito wrap over white Samegawa with diamond lozenges (◆ ◆ ◆ ◆ ◆ ◆)
// - Elongated beveled Espada eye Tsuba with curved horn prongs & Brass Habaki
// - Rule 11 (Zero shadowBlur - Concentric fills)
// - Rule 15 (Double-tapered crescent slashes)
// - Rule 20 (Skin Only & Hand Visibility)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

/**
 * Draws Ulquiorra's Zanpakutō: Murciélago (The Great Black-Winged Bat).
 * Matching the exact anime scale, fidelity, and single-edged Katana geometry.
 *
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x Hand anchor X
 * @param {number} y Hand anchor Y
 * @param {number} angle Additional swing angle in radians
 * @param {number} r Fighter radius
 * @param {boolean} isSwinging Whether actively slashing
 * @param {number} swingProgress Progress of the swing (0 to 1)
 */
export function drawUlquiorraMurcielago(ctx, x = 0, y = 0, angle = 0, r = 25, isSwinging = false, swingProgress = 0, opts = {}) {
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

  const swordStartX = 0;
  const bladeLen = opts.bladeLen || 94;
  const bladeBaseX = swordStartX + 5.5;
  const tipX = swordStartX + bladeLen;
  const yokoteX = tipX - 10.0;
  const halfW = 2.4; // Uniform blade half-width (4.8px total width)

  // ─────────────────────────────────────────────
  // 1. TSUKA HILT (Handle extending along -X)
  // ─────────────────────────────────────────────
  const hiltStartX = swordStartX - 32;
  const hiltLen = 32;
  const hiltHalfW = 3.4;

  // 1a. Base White Samegawa (Rayskin)
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(hiltStartX, -hiltHalfW, hiltLen, hiltHalfW * 2);

  // 1b. Mint/Seafoam Green Silk Ito Wrap (Top & Bottom Edges)
  const itoGrad = ctx.createLinearGradient(hiltStartX, -hiltHalfW, hiltStartX, hiltHalfW);
  itoGrad.addColorStop(0, '#059669');
  itoGrad.addColorStop(0.5, '#34D399');
  itoGrad.addColorStop(1, '#047857');
  ctx.fillStyle = itoGrad;
  ctx.fillRect(hiltStartX, -hiltHalfW, hiltLen, 1.2);
  ctx.fillRect(hiltStartX, hiltHalfW - 1.2, hiltLen, 1.2);

  // 1c. Crisp Diamond Lozenges (◆ ◆ ◆ ◆ ◆ ◆) along the handle center
  const diamonds = [
    hiltStartX + 3.8,
    hiltStartX + 9.2,
    hiltStartX + 14.6,
    hiltStartX + 20.0,
    hiltStartX + 25.4,
    hiltStartX + 30.0
  ];

  for (let i = 0; i < diamonds.length; i++) {
    const cx = diamonds[i];
    // Seafoam green diagonal cross bands flanking the diamond
    ctx.fillStyle = itoGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 2.6, -hiltHalfW);
    ctx.lineTo(cx, 0);
    ctx.lineTo(cx - 2.6, hiltHalfW);
    ctx.lineTo(cx - 3.8, hiltHalfW);
    ctx.lineTo(cx - 1.2, 0);
    ctx.lineTo(cx - 3.8, -hiltHalfW);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 2.6, -hiltHalfW);
    ctx.lineTo(cx, 0);
    ctx.lineTo(cx + 2.6, hiltHalfW);
    ctx.lineTo(cx + 3.8, hiltHalfW);
    ctx.lineTo(cx + 1.2, 0);
    ctx.lineTo(cx + 3.8, -hiltHalfW);
    ctx.closePath();
    ctx.fill();

    // Pure White / Pale Mint Rayskin Diamond Core
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(cx, -1.8);
    ctx.lineTo(cx + 1.7, 0);
    ctx.lineTo(cx, 1.8);
    ctx.lineTo(cx - 1.7, 0);
    ctx.closePath();
    ctx.fill();

    // Dark grey center diamond stitch dot
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(cx, -0.8);
    ctx.lineTo(cx + 0.8, 0);
    ctx.lineTo(cx, 0.8);
    ctx.lineTo(cx - 0.8, 0);
    ctx.closePath();
    ctx.fill();
  }

  // 1d. Handle Border Outlines
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(hiltStartX, -hiltHalfW, hiltLen, hiltHalfW * 2);

  // 1e. Pommel Cap (Kashira) & Metallic Ring
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(hiltStartX - 2.8, -hiltHalfW - 0.3, 3.0, (hiltHalfW * 2) + 0.6);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(hiltStartX - 2.8, -hiltHalfW - 0.3, 3.0, (hiltHalfW * 2) + 0.6);

  // ─────────────────────────────────────────────
  // 2. TSUBA (Authentic Espada Curved Eye Crossguard)
  // ─────────────────────────────────────────────
  ctx.save();
  ctx.translate(swordStartX, 0);

  // Main elongated eye-shaped Tsuba with curved prongs
  ctx.fillStyle = '#CBD5E1'; // Polished silver-grey steel
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.0;

  ctx.beginPath();
  ctx.moveTo(0, -9.0);
  ctx.quadraticCurveTo(2.6, -5.0, 4.0, 0);
  ctx.quadraticCurveTo(2.6, 5.0, 0, 9.0);
  ctx.quadraticCurveTo(-2.6, 5.0, -4.0, 0);
  ctx.quadraticCurveTo(-2.6, -5.0, 0, -9.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Curved eye prongs extending along blade/hilt
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.moveTo(0, -8.0);
  ctx.lineTo(2.0, -11.5);
  ctx.lineTo(0.5, -9.0);
  ctx.lineTo(0, -8.0);
  ctx.moveTo(0, 8.0);
  ctx.lineTo(-2.0, 11.5);
  ctx.lineTo(-0.5, 9.0);
  ctx.lineTo(0, 8.0);
  ctx.closePath();
  ctx.fill();

  // Inner beveled ridge
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.6, 5.8, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  // ─────────────────────────────────────────────
  // 3. HABAKI (Blade Collar at base)
  // ─────────────────────────────────────────────
  const habakiGrad = ctx.createLinearGradient(swordStartX, -halfW - 0.8, swordStartX, halfW + 0.8);
  habakiGrad.addColorStop(0, '#E5C158');
  habakiGrad.addColorStop(0.5, '#FFF2A8');
  habakiGrad.addColorStop(1, '#A08020');
  ctx.fillStyle = habakiGrad;
  ctx.fillRect(swordStartX, -halfW - 0.8, 5.5, (halfW + 0.8) * 2);
  ctx.strokeStyle = '#6E5212';
  ctx.lineWidth = 0.7;
  ctx.strokeRect(swordStartX, -halfW - 0.8, 5.5, (halfW + 0.8) * 2);

  // ─────────────────────────────────────────────
  // 4. AUTHENTIC SINGLE-EDGED KATANA BLADE
  // ─────────────────────────────────────────────
  // Sori (Curvature) function: smooth upward katana arch toward Kissaki tip
  const getSori = (xCoord) => {
    const t = Math.max(0, Math.min(1.0, (xCoord - bladeBaseX) / (tipX - bladeBaseX)));
    return -Math.pow(t, 1.45) * 7.5;
  };

  const midX = (bladeBaseX + tipX) / 2;
  const midSori = getSori(midX);
  const tipSori = getSori(tipX);
  const yokoteSori = getSori(yokoteX);

  // 4a. Single-Edged Katana Blade Body Fill
  ctx.beginPath();
  // 1. Top Spine Line (Mune) - smooth upward Sori arch from base to tip apex
  ctx.moveTo(bladeBaseX, getSori(bladeBaseX) - halfW);
  ctx.quadraticCurveTo(midX, midSori - halfW, tipX, tipSori - halfW);

  // 2. Kissaki Tip Arc (Fukura) - sharp diagonal upward curve from yokote to tip apex
  ctx.quadraticCurveTo(tipX - 1.5, yokoteSori + halfW * 0.4, yokoteX, yokoteSori + halfW);

  // 3. Bottom Cutting Edge (Ha) - perfectly parallel to the spine all the way back to base
  ctx.quadraticCurveTo(midX, midSori + halfW, bladeBaseX, getSori(bladeBaseX) + halfW);

  // 4. Base edge meeting Habaki
  ctx.lineTo(bladeBaseX, getSori(bladeBaseX) - halfW);
  ctx.closePath();

  // Tempered Steel Gradient Fill (Polished steel body + dark spine)
  const bladeGrad = ctx.createLinearGradient(bladeBaseX, -halfW, bladeBaseX, halfW);
  bladeGrad.addColorStop(0, '#334155'); // Mune-ji (Dark tempered spine facet)
  bladeGrad.addColorStop(0.32, '#64748B');
  bladeGrad.addColorStop(0.38, '#94A3B8'); // Shinogi bevel line
  bladeGrad.addColorStop(0.44, '#E2E8F0'); // Hira-ji (Gleaming silver steel face)
  bladeGrad.addColorStop(0.85, '#FFFFFF'); // Razor pure-white cutting edge
  bladeGrad.addColorStop(1, '#F8FAFC');
  ctx.fillStyle = bladeGrad;
  ctx.fill();

  // 4b. Shinogi Ridge Line (Running along entire blade shaft parallel to spine)
  ctx.beginPath();
  ctx.moveTo(bladeBaseX, getSori(bladeBaseX) - halfW * 0.25);
  ctx.quadraticCurveTo(midX, midSori - halfW * 0.25, yokoteX, yokoteSori - halfW * 0.25);
  ctx.lineTo(tipX, tipSori - halfW); // Leads into the kissaki point
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.70)'; // Radiant Emerald Reishi fuller gleam
  ctx.lineWidth = 0.85;
  ctx.stroke();

  // 4c. Yokote Line (Perpendicular line separating blade shaft from Kissaki tip)
  ctx.beginPath();
  ctx.moveTo(yokoteX, yokoteSori - halfW);
  ctx.lineTo(yokoteX, yokoteSori + halfW);
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.65)';
  ctx.lineWidth = 0.75;
  ctx.stroke();

  // 4d. Razor-Sharp Pure White Cutting Edge Line
  ctx.beginPath();
  ctx.moveTo(bladeBaseX, getSori(bladeBaseX) + halfW);
  ctx.quadraticCurveTo(midX, midSori + halfW, yokoteX, yokoteSori + halfW);
  ctx.quadraticCurveTo(tipX - 1.5, yokoteSori + halfW * 0.4, tipX, tipSori - halfW);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // 4e. Crisp Outer Silhouette Ink Outline
  ctx.beginPath();
  ctx.moveTo(bladeBaseX, getSori(bladeBaseX) - halfW);
  ctx.quadraticCurveTo(midX, midSori - halfW, tipX, tipSori - halfW);
  ctx.quadraticCurveTo(tipX - 1.5, yokoteSori + halfW * 0.4, yokoteX, yokoteSori + halfW);
  ctx.quadraticCurveTo(midX, midSori + halfW, bladeBaseX, getSori(bladeBaseX) + halfW);
  ctx.lineTo(bladeBaseX, getSori(bladeBaseX) - halfW);
  ctx.closePath();
  ctx.strokeStyle = '#080A0E';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws Ulquiorra's Lanza del Relámpago (Segunda Etapa Ultimate Spear).
 * A colossal Reishi lightning javelin crackling with nuclear emerald Reishi plasma.
 */
export function drawLanzaDelRelampago(ctx, x = 0, y = 0, angle = 0, r = 25, chargeRatio = 1.0) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const spearLength = 110;
  const pulse = Math.sin(now * 0.015) * 1.5;

  // 1. Concentric Radial Lightning Core Glow (Rule 11 compliant)
  const coreGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 40 * chargeRatio);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  coreGrad.addColorStop(0.35, 'rgba(0, 255, 136, 0.70)');
  coreGrad.addColorStop(0.70, 'rgba(0, 200, 100, 0.25)');
  coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 40 * chargeRatio, 0, Math.PI * 2);
  ctx.fill();

  // 2. Central Lightning Shaft (White-hot energy core)
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.5 + pulse * 0.4;
  ctx.beginPath();
  ctx.moveTo(-spearLength * 0.4, 0);
  ctx.lineTo(spearLength * 0.6, 0);
  ctx.stroke();

  ctx.strokeStyle = '#00FF88';
  ctx.lineWidth = 6.0 + pulse * 0.6;
  ctx.beginPath();
  ctx.moveTo(-spearLength * 0.4, 0);
  ctx.lineTo(spearLength * 0.6, 0);
  ctx.stroke();

  // 3. Dual Spearhead Needle Tips
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#00FF88';
  ctx.lineWidth = 1.5;

  // Forward Tip (+X)
  ctx.beginPath();
  ctx.moveTo(spearLength * 0.6 + 18, 0);
  ctx.lineTo(spearLength * 0.6 - 10, -6);
  ctx.lineTo(spearLength * 0.6 - 4, 0);
  ctx.lineTo(spearLength * 0.6 - 10, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rear Tip (-X)
  ctx.beginPath();
  ctx.moveTo(-spearLength * 0.4 - 14, 0);
  ctx.lineTo(-spearLength * 0.4 + 8, -5);
  ctx.lineTo(-spearLength * 0.4 + 3, 0);
  ctx.lineTo(-spearLength * 0.4 + 8, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. Crackling Arc Flares
  ctx.strokeStyle = '#00FF88';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const t = (now * 0.005 + i * 0.25) % 1.0;
    const lx = -spearLength * 0.3 + t * (spearLength * 0.8);
    const flareY = Math.sin(t * Math.PI * 4 + i) * (8 + pulse);
    ctx.beginPath();
    ctx.moveTo(lx - 6, 0);
    ctx.lineTo(lx, flareY);
    ctx.lineTo(lx + 6, 0);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws Ulquiorra's signature Crescent Blade Slash Arc (Rule 15 Compliant).
 * Features sharp double-tapering and clean dynamic trail wiping.
 */
export function drawUlquiorraSlashArc(ctx, fighter) {
  if (!fighter || !fighter.isSlashing) return;

  const progress = fighter.slashProgress || 0;
  if (progress <= 0 || progress >= 1.0) return;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  const angle = fighter.gunAngle || fighter.angle || 0;
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft && !fighter.isSpinning) {
    ctx.scale(1, -1);
  }

  const r = fighter.r || 25;
  const isSegunda = Boolean(fighter.segundaEtapaActive || fighter.isSegundaEtapa);
  const slashRadius = r * (isSegunda ? 3.4 : 2.8);
  const maxThick = isSegunda ? 18.0 : 14.0;

  // Swing sweep angles
  const startAng = -1.25 + progress * 2.5;
  const arcSpan = Math.PI * 0.95 * Math.sin(progress * Math.PI);

  const N = 24;
  const outerPoly = [];
  const innerPoly = [];

  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const curAng = startAng - arcSpan * (1 - t);
    // Rule 15 double-tapering
    const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
    const thick = maxThick * taper;

    const outR = slashRadius + thick / 2;
    const inR  = slashRadius - thick / 2;

    outerPoly.push({ x: Math.cos(curAng) * outR, y: Math.sin(curAng) * outR });
    innerPoly.push({ x: Math.cos(curAng) * inR,  y: Math.sin(curAng) * inR });
  }

  // Draw Crescent Slash Polygon
  ctx.beginPath();
  outerPoly.forEach((pt, idx) => (idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
  for (let i = innerPoly.length - 1; i >= 0; i--) {
    ctx.lineTo(innerPoly[i].x, innerPoly[i].y);
  }
  ctx.closePath();

  const slashGrad = ctx.createRadialGradient(0, 0, slashRadius - 10, 0, 0, slashRadius + 10);
  if (isSegunda) {
    slashGrad.addColorStop(0, 'rgba(0, 0, 0, 0.90)'); // Black Cero Oscuras core
    slashGrad.addColorStop(0.5, 'rgba(0, 255, 136, 0.95)');
    slashGrad.addColorStop(1, 'rgba(0, 200, 100, 0)');
  } else {
    slashGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    slashGrad.addColorStop(0.4, 'rgba(0, 255, 136, 0.85)');
    slashGrad.addColorStop(1, 'rgba(0, 200, 100, 0)');
  }
  ctx.fillStyle = slashGrad;
  ctx.fill();

  ctx.restore();
}
