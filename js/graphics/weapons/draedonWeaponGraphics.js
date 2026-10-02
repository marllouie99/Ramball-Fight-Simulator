// ─────────────────────────────────────────────
// Exo Electric Disintegrator Weapon & Visual FX Graphics
// Terraria: Calamity Mod — Draedon's Exo-Mechanical Arsenal
// ─────────────────────────────────────────────

import { drawPixelHand } from '../draw.js';

export const Draedon_WEAPON_GRAPHICS = {
  exoElectricDisintegrator: {
    name: 'Exo Electric Disintegrator',
    category: 'Exo Superweapon',
    rarity: 'Apex Mechanical',
    description: 'Draedon\'s ultimate continuous plasma melting cannon. Unleashes multi-stream electric disintegration lasers forged with Exo-Plating and Thanatos coils.'
  }
};

/**
 * Draws the Exo Electric Disintegrator weapon mounted on Draedon.
 */
export function drawExoElectricDisintegratorWeapon(ctx, fighter) {
  const r = fighter.r || 28;
  const isCharging = (fighter.disintegratorWindupTimer && fighter.disintegratorWindupTimer > 0);
  const isFiring = (fighter.disintegratorFireTimer && fighter.disintegratorFireTimer > 0);

  ctx.save();
  ctx.translate(r * 0.82, r * 0.38);

  // Heavy Mechanical Barrel & Thanatos Coil Spine
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = '#06B6D4';
  ctx.lineWidth = 1.4;

  ctx.beginPath();
  ctx.rect(0, -6, 22, 12);
  ctx.fill();
  ctx.stroke();

  // Amber Power Emitter Coils
  ctx.fillStyle = isFiring ? '#FFFFFF' : (isCharging ? '#EF4444' : '#F59E0B');
  ctx.fillRect(4, -4, 4, 8);
  ctx.fillRect(12, -4, 4, 8);

  // Front pixel hand gripping the handle (Rule 20)
  drawPixelHand(ctx, 0, 0, r * 0.30, '#06B6D4', '#0B0F19');

  ctx.restore();
}

/**
 * Renders the screen-spanning continuous "Exo Electric Disintegrator" Plasma Melting Beam.
 */
export function drawExoDisintegratorBeam(ctx, fighter, targetAngle, arena) {
  const r = fighter.r || 28;
  const startX = fighter.x + Math.cos(targetAngle) * (r + 18);
  const startY = fighter.y + Math.sin(targetAngle) * (r + 18);
  const beamLength = 1200;
  const endX = startX + Math.cos(targetAngle) * beamLength;
  const endY = startY + Math.sin(targetAngle) * beamLength;

  const width = fighter.disintegratorBeamWidth || 42;
  const fireTimer = fighter.disintegratorFireTimer || 0;
  const pulse = Math.sin(fireTimer * 0.6) * 3.5;

  ctx.save();

  // 1. Outer High-Voltage Electric Arc Field (Amber & Green)
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.40)';
  ctx.lineWidth = width + 20 + pulse;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // 2. Focused Exo Plasma Beam (Cyan)
  ctx.strokeStyle = '#06B6D4';
  ctx.lineWidth = width + 6 + pulse * 0.5;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // 3. Superheated Melting White Core
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(5, width * 0.45);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // 4. Jagged Electric Disintegration Arcs branching off beam
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 1.5;
  for (let i = 1; i <= 5; i++) {
    const segDist = i * 180;
    const segX = startX + Math.cos(targetAngle) * segDist;
    const segY = startY + Math.sin(targetAngle) * segDist;
    const perpAngle = targetAngle + Math.PI / 2;
    const offset = ((i % 2 === 0) ? 1 : -1) * (width * 0.6 + Math.random() * 12);

    ctx.beginPath();
    ctx.moveTo(segX, segY);
    ctx.lineTo(segX + Math.cos(perpAngle) * offset, segY + Math.sin(perpAngle) * offset);
    ctx.stroke();
  }

  // 5. Muzzle Induction Ring at Barrel
  ctx.translate(startX, startY);
  ctx.strokeStyle = '#06B6D4';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, width * 0.7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders charging high-voltage arcs during the wind-up phase.
 */
export function drawExoDisintegratorCharge(ctx, fighter, targetAngle) {
  const r = fighter.r || 28;
  const startX = fighter.x + Math.cos(targetAngle) * (r + 18);
  const startY = fighter.y + Math.sin(targetAngle) * (r + 18);

  ctx.save();
  ctx.translate(startX, startY);

  ctx.strokeStyle = '#06B6D4';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2;
    const len = 10 + Math.random() * 20;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.stroke();
  }

  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Weapon Studio preview renderer for Exo Electric Disintegrator.
 */
export function drawExoDisintegratorPreview(ctx, cx, cy, size = 48) {
  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = '#06B6D4';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.rect(-size * 0.4, -size * 0.2, size * 0.8, size * 0.4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(-size * 0.2, -size * 0.1, size * 0.2, size * 0.2);
  ctx.fillRect(size * 0.1, -size * 0.1, size * 0.2, size * 0.2);

  ctx.restore();
}
