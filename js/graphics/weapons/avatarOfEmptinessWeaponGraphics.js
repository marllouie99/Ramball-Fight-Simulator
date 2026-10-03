// ─────────────────────────────────────────────
// Avatar of Emptiness Weapon & Visual Effects Graphics
// Terraria: Wrath of the Gods — Dimensional Portals & Universal Annihilation
// Adheres strictly to Rule 2.2 (no shadowBlur) and Rule 2.4 (Canvas 2D stack integrity)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

/**
 * Draws idle weapon / dimensional focus in hand
 */
export function drawAvatarWeapon(ctx, fighter) {
  if (!fighter || fighter.hp <= 0) return;
  // Hand rendering is handled natively in avatarOfEmptinessSkin.js
}

/**
 * Renders the Universal Annihilation Charging Convergence Portal
 */
export function drawUniversalAnnihilationCharge(ctx, fighter, angle) {
  if (!fighter || fighter.hp <= 0) return;

  const r = fighter.r || 29;
  const gameTimer = (typeof state !== 'undefined' && state.gameTimer) ? state.gameTimer : 0;
  const windupProgress = Math.min(1.0, 1.0 - (fighter.annihilationWindupTimer / (fighter.annihilationWindupMax || 50)));

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.rotate(angle);

  const focusDist = r * 1.6;
  const focusX = focusDist;
  const focusY = 0;

  // 1. Concentric Singularity Convergence Rings
  const coreRadius = (r * 1.8) * Math.sin(windupProgress * Math.PI * 0.5);

  const grad = ctx.createRadialGradient(focusX, focusY, 0, focusX, focusY, coreRadius * 1.5);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.2, '#00F5D4');
  grad.addColorStop(0.55, '#9D4EDD');
  grad.addColorStop(0.85, 'rgba(6, 7, 11, 0.85)');
  grad.addColorStop(1, 'rgba(6, 7, 11, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(focusX, focusY, coreRadius * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // 2. Converging Dimensional Needle Arcs
  const arcCount = 8;
  for (let i = 0; i < arcCount; i++) {
    const ringAngle = (i * (Math.PI * 2 / arcCount)) + (gameTimer * 0.08);
    const ringDist = coreRadius * (1.2 + (1.0 - windupProgress) * 1.8);
    const pX = focusX + Math.cos(ringAngle) * ringDist;
    const pY = focusY + Math.sin(ringAngle) * ringDist;

    ctx.fillStyle = (i % 2 === 0) ? '#00F5D4' : '#FF0055';
    ctx.beginPath();
    ctx.arc(pX, pY, 3 + windupProgress * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Central Dark Singularity Core
  ctx.fillStyle = '#06070B';
  ctx.beginPath();
  ctx.arc(focusX, focusY, coreRadius * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Renders the screen-spanning Universal Annihilation Reality Shatter Beam
 */
export function drawUniversalAnnihilationBeam(ctx, fighter, angle, arena) {
  if (!fighter || fighter.hp <= 0) return;

  const r = fighter.r || 29;
  const gameTimer = (typeof state !== 'undefined' && state.gameTimer) ? state.gameTimer : 0;
  const beamLength = 1300;
  const baseWidth = fighter.annihilationBeamWidth || 52;
  const pulse = Math.sin(gameTimer * 0.4) * 6;
  const currentWidth = baseWidth + pulse;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.rotate(angle);

  const startX = r * 1.2;

  // 1. Outermost Chromatic Distortion Aura
  ctx.fillStyle = 'rgba(157, 78, 221, 0.22)';
  ctx.fillRect(startX, -currentWidth * 1.4, beamLength, currentWidth * 2.8);

  // 2. Cyan / Visceral Corona Band
  ctx.fillStyle = 'rgba(0, 245, 212, 0.45)';
  ctx.fillRect(startX, -currentWidth * 0.9, beamLength, currentWidth * 1.8);

  // 3. Deep Amethyst Core Ray
  ctx.fillStyle = '#9D4EDD';
  ctx.fillRect(startX, -currentWidth * 0.55, beamLength, currentWidth * 1.1);

  // 4. White-Hot Singularity Center Line
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(startX, -currentWidth * 0.22, beamLength, currentWidth * 0.44);

  // 5. Transverse Shock Needle Polygons along the beam (Rule 16 style)
  for (let d = startX + 60; d < startX + 900; d += 120) {
    const shockPhase = (gameTimer * 12 + d) % 240;
    const waveY = Math.sin((d + gameTimer * 15) * 0.04) * (currentWidth * 0.85);

    ctx.fillStyle = (d % 240 === 0) ? '#00F5D4' : '#FF0055';
    ctx.beginPath();
    ctx.moveTo(d, waveY - 4);
    ctx.lineTo(d + 40, waveY);
    ctx.lineTo(d, waveY + 4);
    ctx.lineTo(d - 15, waveY);
    ctx.closePath();
    ctx.fill();
  }

  // 6. Origin Spatial Muzzle Flare
  const flareRadius = currentWidth * 1.6;
  const flareGrad = ctx.createRadialGradient(startX, 0, 0, startX, 0, flareRadius);
  flareGrad.addColorStop(0, '#FFFFFF');
  flareGrad.addColorStop(0.3, '#00F5D4');
  flareGrad.addColorStop(0.65, '#9D4EDD');
  flareGrad.addColorStop(1, 'rgba(6, 7, 11, 0)');
  ctx.fillStyle = flareGrad;
  ctx.beginPath();
  ctx.arc(startX, 0, flareRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws Cryonic Absolute Zero frost columns and ground crystals
 */
export function drawCryonicZeroEffects(ctx, cryonicActiveList) {
  if (!cryonicActiveList || cryonicActiveList.length === 0) return;

  for (const cryo of cryonicActiveList) {
    ctx.save();
    ctx.translate(cryo.x, cryo.y);

    const progress = 1.0 - (cryo.timer / (cryo.maxTimer || 150));
    const rad = cryo.radius || 130;

    // Expanding Frost Ring
    ctx.strokeStyle = `rgba(0, 245, 212, ${Math.max(0, 1.0 - progress)})`;
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.arc(0, 0, rad * progress, 0, Math.PI * 2);
    ctx.stroke();

    // Falling Frost Columns
    if (cryo.columns) {
      for (const col of cryo.columns) {
        ctx.save();
        ctx.translate(col.x - cryo.x, col.y - cryo.y);
        ctx.fillStyle = 'rgba(0, 245, 212, 0.75)';
        ctx.beginPath();
        ctx.moveTo(0, -60);
        ctx.lineTo(12, 0);
        ctx.lineTo(0, 15);
        ctx.lineTo(-12, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(0, -45);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }
}

/**
 * Draws Visceral Blood Torrent Cone & Swirling Vortex
 */
export function drawVisceralTorrentEffects(ctx, fighter) {
  if (!fighter || fighter.visceralActiveTimer <= 0) return;

  const r = fighter.r || 29;
  const gameTimer = (typeof state !== 'undefined' && state.gameTimer) ? state.gameTimer : 0;
  const reach = fighter.visceralReach || 155;
  const arc = fighter.visceralArc || (Math.PI * 0.88);

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.rotate(fighter.visceralCastAngle || fighter.gunAngle || 0);

  // Swirling Blood Fan
  const bloodGrad = ctx.createRadialGradient(r * 0.8, 0, 0, r * 0.8, 0, reach);
  bloodGrad.addColorStop(0, 'rgba(255, 0, 85, 0.85)');
  bloodGrad.addColorStop(0.5, 'rgba(157, 78, 221, 0.55)');
  bloodGrad.addColorStop(0.85, 'rgba(11, 0, 20, 0.35)');
  bloodGrad.addColorStop(1, 'rgba(255, 0, 85, 0)');

  ctx.fillStyle = bloodGrad;
  ctx.beginPath();
  ctx.moveTo(r * 0.8, 0);
  ctx.arc(r * 0.8, 0, reach, -arc / 2, arc / 2);
  ctx.closePath();
  ctx.fill();

  // Spiral Blood Arc Needles
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.0;
  for (let i = 0; i < 4; i++) {
    const sweepAngle = (-arc / 2) + (i * (arc / 3)) + Math.sin(gameTimer * 0.2 + i) * 0.15;
    ctx.beginPath();
    ctx.moveTo(r * 0.9, 0);
    ctx.lineTo(r * 0.9 + Math.cos(sweepAngle) * reach * 0.9, Math.sin(sweepAngle) * reach * 0.9);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws Dark Dimension Portal Strikes around targets
 */
export function drawDarkPortalStrikes(ctx, activePortals) {
  if (!activePortals || activePortals.length === 0) return;

  for (const portal of activePortals) {
    ctx.save();
    ctx.translate(portal.x, portal.y);
    ctx.rotate(portal.angle || 0);

    const strikeProgress = Math.min(1.0, portal.timer / (portal.maxTimer || 24));
    const pSize = 38 * Math.sin(strikeProgress * Math.PI);

    // 1. Dark Rift Portal Oval
    ctx.fillStyle = '#06070B';
    ctx.strokeStyle = '#9D4EDD';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.ellipse(0, 0, pSize * 0.5, pSize * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. Cyan Event Horizon Edge
    ctx.strokeStyle = '#00F5D4';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Jutting Shadowy Claw Strike
    if (strikeProgress > 0.25 && strikeProgress < 0.85) {
      const clawExtend = (strikeProgress - 0.25) / 0.6;
      const clawReach = 65 * Math.sin(clawExtend * Math.PI);

      ctx.fillStyle = '#10002B';
      ctx.strokeStyle = '#00F5D4';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(0, -clawReach);
      ctx.lineTo(12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}
