// ─────────────────────────────────────────────
// TACTICAL FORCE — FIGHTER SKINS
// Sleek, authentic faceless tactical uniforms
// Follows Rule 19 (Upright POV, -Y top, +Y bottom, NO eyes/mouth/nose)
// Follows Rule 20 (Respects showSkinOnly and hideFrontHand/hideBackHand)
// ─────────────────────────────────────────────

import { state } from '../../js/core/state.js';

/**
 * 1. RIFLE SKIN — Assault Operator
 * Navy / Tactical Blue combat FAST helmet, comms headset, ballistic vest, shoulder pads.
 */
export function drawRifleSkin(ctx, fighter) {
  const r = fighter.r || 25;

  ctx.save();

  // Base Body Circle (Dark Matte Blue-Grey Uniform)
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Tactical Plate Carrier / Armor Vest (+Y Lower Half)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r - 1, 0.15, Math.PI - 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Triple Rifle Magazine Chest Pouches
  ctx.fillStyle = '#3b82f6';
  for (let i = -1; i <= 1; i++) {
    ctx.fillRect(i * 9 - 3.5, 4, 7, 12);
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 1;
    ctx.strokeRect(i * 9 - 3.5, 4, 7, 12);
  }

  // FAST Tactical Combat Helmet (-Y Upper Half)
  ctx.fillStyle = '#1e3a8a';
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -2, r * 0.92, Math.PI * 1.05, Math.PI * 1.95);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // NVG Shroud Bracket Mount on forehead
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-4, -r + 3, 8, 5);
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-4, -r + 3, 8, 5);

  // Tactical Communication Headset & Ear Cups (-X and +X)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-r + 1, -8, 6, 12, 2);
  ctx.roundRect(r - 7, -8, 6, 12, 2);
  ctx.fill();
  ctx.stroke();

  // Headset headband
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -5, r * 0.82, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // Tactical Goggles Silhouette Rim (Across forehead / upper center)
  ctx.fillStyle = '#0284c7';
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.roundRect(-r * 0.55, -8, r * 1.1, 7, 3);
  ctx.fill();
  ctx.globalAlpha = 1.0;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

/**
 * 2. SHOTGUN SKIN — Heavy SWAT Breacher
 * Emerald / Forest Green reinforced ballistic breacher armor, blast collar, heavy helmet.
 */
export function drawShotgunSkin(ctx, fighter) {
  const r = fighter.r || 26;

  ctx.save();

  // Base Body (Dark Olive Slate)
  ctx.fillStyle = '#14231b';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Heavy Ceramic Plate Carrier (+Y Lower Torso)
  ctx.fillStyle = '#0a1610';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, r - 1, 0.2, Math.PI - 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Shotgun Shell Loops across Chest (4 red/brass shells)
  for (let i = -1.5; i <= 1.5; i++) {
    const sx = i * 7.5;
    // Red shell casing
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(sx - 2.5, 6, 5, 10);
    // Brass rim
    ctx.fillStyle = '#eab308';
    ctx.fillRect(sx - 2.5, 4, 5, 2.5);
  }

  // Heavy Breacher Ballistic Helmet (-Y Upper Half)
  ctx.fillStyle = '#064e3b';
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -1, r * 0.94, Math.PI * 1.02, Math.PI * 1.98);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Heavy Blast Collar / Neck Guard
  ctx.fillStyle = '#065f46';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-r * 0.65, -3, r * 1.3, 7, 3);
  ctx.fill();
  ctx.stroke();

  // Heavy Visor Rim Protective Shroud
  ctx.fillStyle = '#052e16';
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-r * 0.6, -10, r * 1.2, 6, 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * 3. PISTOL SKIN — Covert Gunslinger Operative
 * Amber / Gold lightweight tactical rig, sleek balaclava mask, tactical harness.
 */
export function drawPistolSkin(ctx, fighter) {
  const r = fighter.r || 24;

  ctx.save();

  // Base Body (Dark Charcoal Uniform)
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Covert Balaclava Mask / Hood (-Y)
  ctx.fillStyle = '#27272a';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, r - 1, Math.PI * 0.95, Math.PI * 2.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Lightweight Shoulder Holster Harness (+Y)
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2.5;
  // Left strap
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -2);
  ctx.lineTo(-4, r - 4);
  ctx.stroke();
  // Right strap
  ctx.beginPath();
  ctx.moveTo(r * 0.6, -2);
  ctx.lineTo(4, r - 4);
  ctx.stroke();

  // Center Tactical Buckle
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-4, 6, 8, 6);

  // Ballistic Tint Sunglasses Silhouette (Across center)
  ctx.fillStyle = '#09090b';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-r * 0.6, -7, r * 1.2, 6.5, 3);
  ctx.fill();
  ctx.stroke();

  // Amber Lens Tint Highlight
  ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.fillRect(-r * 0.5, -6, r - 2, 2);

  ctx.restore();
}

/**
 * 4. SNIPER SKIN — Recon Ghost Marksman
 * Cyan / Teal recon hood, rangefinder mono-goggle, high-collar windbreaker, camo strap.
 */
export function drawSniperSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const themeColor = fighter.color || '#ef4444';

  const hex = themeColor.replace('#', '');
  const tR = parseInt(hex.substring(0, 2), 16) || 239;
  const tG = parseInt(hex.substring(2, 4), 16) || 68;
  const tB = parseInt(hex.substring(4, 6), 16) || 68;
  const darkShade = `rgb(${Math.round(tR * 0.25)}, ${Math.round(tG * 0.25)}, ${Math.round(tB * 0.25)})`;
  const midShade = `rgb(${Math.round(tR * 0.45)}, ${Math.round(tG * 0.45)}, ${Math.round(tB * 0.45)})`;
  const lightShade = `rgba(${tR}, ${tG}, ${tB}, 0.75)`;

  ctx.save();

  // Base Body (Dark Charcoal)
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // High-Collar Windbreaker / Ghillie Cape (+Y Lower Half)
  ctx.fillStyle = '#0e1726';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r - 1, 0.1, Math.PI - 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Recon Ghillie Hood / Beanie (-Y Upper Half)
  ctx.fillStyle = darkShade;
  ctx.strokeStyle = lightShade;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -2, r * 0.92, Math.PI * 1.05, Math.PI * 1.95);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // High Windbreaker Collar
  ctx.fillStyle = midShade;
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-r * 0.55, 0, r * 1.1, 7, 2);
  ctx.fill();
  ctx.stroke();

  // Precision Rangefinder Mono-Goggle / Optics Unit (On right eye position in local coordinates)
  ctx.fillStyle = darkShade;
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(5, -6, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Glowing Laser Aperture Core
  ctx.fillStyle = themeColor;
  ctx.beginPath();
  ctx.arc(5, -6, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Monocle strap
  ctx.strokeStyle = midShade;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -6);
  ctx.lineTo(0, -6);
  ctx.stroke();

  ctx.restore();
}
