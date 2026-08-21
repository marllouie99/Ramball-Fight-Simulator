// ─────────────────────────────────────────────
// CJ's Skill 2: Dropped DARPA Jetpack Floating Item Pickup
// Spawns on the ground when Rocketman flight expires.
// Floats with smooth vertical sine wave bobbing, rotates continuously
// in full 360° pseudo-3D perspective, projects dynamic ground drop shadow,
// and emits classic GTA item pickup corona rings & sparkling glints.
// Rule 11 & Rule 12 Compliant (Zero shadowBlur CPU filters)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

if (typeof state !== 'undefined' && !state.cjDroppedJetpacks) {
  state.cjDroppedJetpacks = [];
}

/**
 * Spawns a floating 360-degree rotating Jetpack item at the specified ground coordinates
 * @param {number} x Ground X coordinate
 * @param {number} y Ground Y coordinate
 */
export function spawnDroppedJetpack(x, y) {
  if (typeof state === 'undefined') return;
  if (!state.cjDroppedJetpacks) state.cjDroppedJetpacks = [];

  state.cjDroppedJetpacks.push({
    x: Number(x) || 0,
    y: Number(y) || 0,
    spawnTime: (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    phaseOffset: Math.random() * Math.PI * 2,
    sparkleTimer: 0,
    alpha: 1.0,
    sparkles: []
  });
}

/**
 * Updates floating jetpack animations and pickup sparkle particles
 */
export function updateFloatingJetpacks() {
  if (typeof state === 'undefined' || !state.cjDroppedJetpacks) return;

  for (let i = state.cjDroppedJetpacks.length - 1; i >= 0; i--) {
    const item = state.cjDroppedJetpacks[i];
    if (!item) continue;

    // Spawn tiny golden pickup sparkle stars periodically
    item.sparkleTimer = (item.sparkleTimer || 0) + 1;
    if (item.sparkleTimer % 14 === 0) {
      if (!item.sparkles) item.sparkles = [];
      if (item.sparkles.length < 8) {
        item.sparkles.push({
          x: item.x + (Math.random() - 0.5) * 32,
          y: item.y - 18 + (Math.random() - 0.5) * 22,
          vy: -0.35 - Math.random() * 0.45,
          life: 28,
          maxLife: 28,
          size: 2.8 + Math.random() * 2.2,
          color: (Math.random() > 0.35) ? '#FBBF24' : '#60A5FA'
        });
      }
    }

    // Update internal sparkles
    if (item.sparkles && item.sparkles.length > 0) {
      for (let s = item.sparkles.length - 1; s >= 0; s--) {
        const sp = item.sparkles[s];
        sp.y += sp.vy;
        sp.life--;
        if (sp.life <= 0) {
          item.sparkles.splice(s, 1);
        }
      }
    }
  }
}

/**
 * Draws a 4-point diamond sparkle glint
 */
function _draw4PointStar(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.quadraticCurveTo(cx, cy, cx + size * 0.3, cy);
  ctx.quadraticCurveTo(cx, cy, cx + size, cy);
  ctx.quadraticCurveTo(cx, cy, cx + size * 0.3, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + size);
  ctx.quadraticCurveTo(cx, cy, cx - size * 0.3, cy);
  ctx.quadraticCurveTo(cx, cy, cx - size, cy);
  ctx.quadraticCurveTo(cx, cy, cx - size * 0.3, cy);
  ctx.closePath();
  ctx.fill();
}

/**
 * Renders the detailed DARPA Jetpack 3D model in rotating perspective
 */
function _drawFloatingJetpackModel(ctx, facingFront, cosRot) {
  const tankW = 11.5;
  const tankH = 34.0;
  const tankHalfH = tankH * 0.5;

  // 1. Central Olive-Drab Engine & Avionics Core Block
  const boxW = 15.0;
  const boxH = 22.0;
  const boxX = -boxW * 0.5;
  const boxY = -boxH * 0.5;

  const boxGrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
  boxGrad.addColorStop(0, '#364234');
  boxGrad.addColorStop(0.5, '#404D3E');
  boxGrad.addColorStop(1, '#242C23');

  ctx.fillStyle = boxGrad;
  ctx.strokeStyle = '#151C14';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 2.5);
  ctx.fill();
  ctx.stroke();

  // Orange Electronics Bay with Status Indicators
  const bayW = 10.0;
  const bayH = 7.0;
  ctx.fillStyle = '#EA580C';
  ctx.strokeStyle = '#9A3412';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(-bayW * 0.5, -bayH * 0.5, bayW, bayH, 1.2);
  ctx.fill();
  ctx.stroke();

  // Amber / Green Indicator Lights
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(-bayW * 0.5 + 1.5, -bayH * 0.5 + 1.5, 3.0, 1.5);
  ctx.fillStyle = '#22C55E';
  ctx.fillRect(bayW * 0.5 - 3.5, -bayH * 0.5 + 1.5, 2.0, 1.5);

  // 2. Twin Brushed Slate-Blue Steel Fuel Cylinders (Left & Right)
  const leftX = -17.5;
  const rightX = 6.0;

  const tankXs = [leftX, rightX];
  for (let t = 0; t < tankXs.length; t++) {
    const tx = tankXs[t];

    const tankGrad = ctx.createLinearGradient(tx, 0, tx + tankW, 0);
    tankGrad.addColorStop(0, '#334155');
    tankGrad.addColorStop(0.3, '#64748B');
    tankGrad.addColorStop(0.6, '#94A3B8'); // Metallic reflection core
    tankGrad.addColorStop(1, '#1E293B');

    ctx.fillStyle = tankGrad;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(tx, -tankHalfH, tankW, tankH, 5.0);
    ctx.fill();
    ctx.stroke();

    // Top Chrome Manifold Dome Cap
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.ellipse(tx + tankW * 0.5, -tankHalfH + 1.5, tankW * 0.38, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bottom Exhaust Nozzle (Dark conical bell)
    ctx.fillStyle = '#18181B';
    ctx.strokeStyle = '#09090B';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(tx + 1.5, tankHalfH);
    ctx.lineTo(tx + tankW - 1.5, tankHalfH);
    ctx.lineTo(tx + tankW + 1.0, tankHalfH + 6.0);
    ctx.lineTo(tx - 1.0, tankHalfH + 6.0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Nozzle internal glow core
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.ellipse(tx + tankW * 0.5, tankHalfH + 5.5, tankW * 0.35, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Chrome Conduit Piping / Connectors across the tanks
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(leftX + tankW, -tankHalfH * 0.45);
  ctx.lineTo(rightX, -tankHalfH * 0.45);
  ctx.moveTo(leftX + tankW, tankHalfH * 0.45);
  ctx.lineTo(rightX, tankHalfH * 0.45);
  ctx.stroke();
}

/**
 * Draws all active floating, 360-degree rotating Jetpack pickups on the arena floor
 */
export function drawFloatingJetpacks(ctx) {
  if (typeof state === 'undefined' || !state.cjDroppedJetpacks || state.cjDroppedJetpacks.length === 0) return;

  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  for (let i = 0; i < state.cjDroppedJetpacks.length; i++) {
    const item = state.cjDroppedJetpacks[i];
    if (!item) continue;

    const time = now * 0.0014 + item.phaseOffset; // Elegant, steady 360° rotation speed
    const hoverZ = 16 + Math.sin(time * 2.2) * 5.0; // Smooth 11px to 21px vertical floating bob
    const rotAngle = time; // Continuous 360° rotation angle
    const cosRot = Math.cos(rotAngle);
    const sinRot = Math.sin(rotAngle);

    // ── 1. GROUND PICKUP DROP SHADOW ──
    const shadowScale = Math.max(0.65, 1.0 - (hoverZ / 40) * 0.35);
    const shadowAlpha = Math.max(0.18, (0.45 - (hoverZ / 40) * 0.22) * (item.alpha || 1.0));

    ctx.save();
    ctx.translate(item.x, item.y + 6);
    ctx.scale(1.0, 0.42);
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(0, 0, 24 * shadowScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── 2. GTA ROTATING GOLDEN PICKUP CORONA / HALO AURA ──
    ctx.save();
    ctx.translate(item.x, item.y - hoverZ);

    const auraAlpha = 0.24 + Math.sin(time * 2.2) * 0.08;
    const coronaGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, 34);
    coronaGrad.addColorStop(0, `rgba(251, 191, 36, ${(auraAlpha * 1.25).toFixed(3)})`);
    coronaGrad.addColorStop(0.55, `rgba(245, 158, 11, ${(auraAlpha * 0.65).toFixed(3)})`);
    coronaGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');

    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();

    // ── 3. ROTATING 360° JETPACK MODEL (3D Pseudo-Perspective Transform) ──
    // Horizontal perspective scaling by cosRot gives authentic 3D rotating pickup rotation
    const facingFront = (sinRot >= 0);
    const horizScale = Math.abs(cosRot);
    const sign = cosRot >= 0 ? 1 : -1;

    ctx.scale(Math.max(0.14, horizScale) * sign, 1.0);

    _drawFloatingJetpackModel(ctx, facingFront, cosRot);

    ctx.restore();

    // ── 4. PICKUP SPARKLE STARS ──
    if (item.sparkles && item.sparkles.length > 0) {
      ctx.save();
      for (const sp of item.sparkles) {
        const spAlpha = Math.min(1.0, sp.life / 10);
        ctx.fillStyle = sp.color || '#FBBF24';
        ctx.globalAlpha = spAlpha;
        _draw4PointStar(ctx, sp.x, sp.y, sp.size);
      }
      ctx.restore();
    }
  }
}

/**
 * Clears all active floating jetpack items on round or match reset
 */
export function clearFloatingJetpacks() {
  if (typeof state === 'undefined' || !state.cjDroppedJetpacks) return;
  state.cjDroppedJetpacks.length = 0;
}
