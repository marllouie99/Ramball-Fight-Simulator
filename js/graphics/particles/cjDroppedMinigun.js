// ─────────────────────────────────────────────
// CJ's Ultimate: Overheated Dropped M134 Minigun System
// Spawns on the arena floor when BAGUVIX God Mode expires.
// Features glowing red-hot barrels, rising animated steam puffs,
// perspective ground shadow, and smooth fade-out.
// Rule 11 & Rule 12 Compliant (Zero shadowBlur CPU filters)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { drawCjMinigun } from '../weapons/cjWeaponGraphics.js';

if (typeof state !== 'undefined' && !state.cjDroppedMiniguns) {
  state.cjDroppedMiniguns = [];
}

/**
 * Spawns an overheated dropped Minigun at the specified coordinates
 * @param {number} x Ground X coordinate
 * @param {number} y Ground Y coordinate
 * @param {number} angle Drop facing angle
 */
export function spawnDroppedMinigun(x, y, angle = 0) {
  if (typeof state === 'undefined') return;
  if (!state.cjDroppedMiniguns) state.cjDroppedMiniguns = [];

  state.cjDroppedMiniguns.push({
    x: Number(x) || 0,
    y: Number(y) || 0,
    angle: Number(angle) || 0,
    life: 240,
    maxLife: 240,
    steamTimer: 0,
    steamParticles: []
  });
}

/**
 * Updates dropped minigun lifetimes and rising steam clouds
 */
export function updateDroppedMiniguns() {
  if (typeof state === 'undefined' || !state.cjDroppedMiniguns || state.cjDroppedMiniguns.length === 0) return;

  for (let i = state.cjDroppedMiniguns.length - 1; i >= 0; i--) {
    const item = state.cjDroppedMiniguns[i];
    if (!item) continue;

    item.life--;
    if (item.life <= 0) {
      state.cjDroppedMiniguns.splice(i, 1);
      continue;
    }

    // Spawn rising steam clouds from overheated barrels
    item.steamTimer = (item.steamTimer || 0) + 1;
    if (item.steamTimer % 3 === 0 && item.life > 40) {
      if (!item.steamParticles) item.steamParticles = [];
      if (item.steamParticles.length < 24) {
        const cosA = Math.cos(item.angle);
        const sinA = Math.sin(item.angle);
        const tipDist = 28 + Math.random() * 14;
        const tipX = item.x + cosA * tipDist + (Math.random() - 0.5) * 8;
        const tipY = item.y + sinA * tipDist + (Math.random() - 0.5) * 8;

        item.steamParticles.push({
          x: tipX,
          y: tipY,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -0.8 - Math.random() * 0.9,
          radius: 3.5 + Math.random() * 3.0,
          growth: 0.18 + Math.random() * 0.15,
          life: 45,
          maxLife: 45,
          alpha: 0.55 + Math.random() * 0.30
        });
      }
    }

    // Update internal steam particles
    if (item.steamParticles && item.steamParticles.length > 0) {
      for (let s = item.steamParticles.length - 1; s >= 0; s--) {
        const sp = item.steamParticles[s];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.radius += sp.growth;
        sp.life--;
        if (sp.life <= 0) {
          item.steamParticles.splice(s, 1);
        }
      }
    }
  }
}

/**
 * Draws all dropped overheated miniguns and rising steam clouds
 */
export function drawDroppedMiniguns(ctx) {
  if (typeof state === 'undefined' || !state.cjDroppedMiniguns || state.cjDroppedMiniguns.length === 0) return;

  for (let i = 0; i < state.cjDroppedMiniguns.length; i++) {
    const item = state.cjDroppedMiniguns[i];
    if (!item) continue;

    const lifeRatio = item.life / item.maxLife;
    const fadeAlpha = item.life < 60 ? (item.life / 60) : 1.0;
    const heat = Math.max(0, (lifeRatio - 0.25) / 0.75); // Hot glow cools down as life decays

    ctx.save();
    ctx.globalAlpha = fadeAlpha;

    // 1. Perspective Ground Shadow
    ctx.save();
    ctx.translate(item.x, item.y + 4);
    ctx.scale(1.0, 0.45);
    const shadowGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 26);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    shadowGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.35)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Overheated Minigun Graphic
    drawCjMinigun(ctx, item.x, item.y, item.angle, 25, {
      scale: 0.95,
      heat: heat,
      flashTimer: 0,
      spinAngle: 0
    });

    // 3. Rising Billowing Steam Particles
    if (item.steamParticles && item.steamParticles.length > 0) {
      for (let s = 0; s < item.steamParticles.length; s++) {
        const sp = item.steamParticles[s];
        const pRatio = sp.life / sp.maxLife;
        const pAlpha = pRatio * sp.alpha * fadeAlpha;

        ctx.fillStyle = `rgba(241, 245, 249, ${pAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

/**
 * Clears all dropped miniguns on round reset
 */
export function clearDroppedMiniguns() {
  if (typeof state === 'undefined' || !state.cjDroppedMiniguns) return;
  state.cjDroppedMiniguns.length = 0;
}
