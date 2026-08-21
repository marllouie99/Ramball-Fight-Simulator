// ─────────────────────────────────────────────
// Vehicular Crash Shockwave Ring Visual Effect
// Simple, clean expanding kinetic shockwave rings & air ripple
// Rule 11 (Zero shadowBlur) & Rule 12 (Zero PIXI.Text) Compliant
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

// Pre-allocated active shockwave effects array
if (typeof state !== 'undefined' && !state.bamEffects) {
  state.bamEffects = [];
}

/**
 * Spawns a clean kinetic shockwave ring at the given coordinates
 * @param {number} x World X coordinate
 * @param {number} y World Y coordinate
 * @param {number} scale Overall scale multiplier (default: 1.0)
 */
export function spawnBamEffect(x, y, scale = 1.0) {
  if (typeof state === 'undefined') return;
  if (!state.bamEffects) state.bamEffects = [];

  state.bamEffects.push({
    x,
    y,
    scale,
    life: 14,
    maxLife: 14
  });
}

/**
 * Updates all active shockwave ring effects
 */
export function updateBamEffects() {
  if (typeof state === 'undefined' || !state.bamEffects || state.bamEffects.length === 0) return;

  for (let i = state.bamEffects.length - 1; i >= 0; i--) {
    const eff = state.bamEffects[i];
    eff.life--;
    if (eff.life <= 0) {
      state.bamEffects.splice(i, 1);
    }
  }
}

/**
 * Draws all active clean expanding shockwave rings
 */
export function drawBamEffects(ctx) {
  if (typeof state === 'undefined' || !state.bamEffects || state.bamEffects.length === 0) return;

  ctx.save();

  for (let i = 0; i < state.bamEffects.length; i++) {
    const eff = state.bamEffects[i];
    if (!eff || eff.life <= 0) continue;

    const progress = 1 - (eff.life / eff.maxLife); // 0.0 -> 1.0
    const fade = (1 - progress);
    const s = eff.scale || 1.0;

    ctx.save();
    ctx.translate(eff.x, eff.y);

    // ── 1. PRIMARY SHOCKWAVE RING (Expanding White/Silver Air Ripple) ──
    const r1 = (12 + progress * 46) * s;
    ctx.strokeStyle = `rgba(255, 255, 255, ${(0.90 * fade).toFixed(3)})`;
    ctx.lineWidth = 3.2 * fade * s;
    ctx.beginPath();
    ctx.arc(0, 0, r1, 0, Math.PI * 2);
    ctx.stroke();

    // ── 2. SECONDARY INNER RING (Golden Kinetic Wave) ──
    const r2 = (6 + progress * 32) * s;
    ctx.strokeStyle = `rgba(245, 158, 11, ${(0.70 * fade).toFixed(3)})`;
    ctx.lineWidth = 2.2 * fade * s;
    ctx.beginPath();
    ctx.arc(0, 0, r2, 0, Math.PI * 2);
    ctx.stroke();

    // ── 3. SUBTLE RADIAL AIR STREAKS (4 Directional Flecks) ──
    ctx.strokeStyle = `rgba(254, 240, 138, ${(0.80 * fade).toFixed(3)})`;
    ctx.lineWidth = 1.6 * fade * s;
    const streakStart = (r1 * 0.7);
    const streakEnd = (r1 * 1.15);
    for (let a = 0; a < 4; a++) {
      const ang = (a * Math.PI * 0.5) + 0.35;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      ctx.beginPath();
      ctx.moveTo(cosA * streakStart, sinA * streakStart);
      ctx.lineTo(cosA * streakEnd, sinA * streakEnd);
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Clears all active shockwave effects on round/match reset
 */
export function clearBamEffects() {
  if (typeof state !== 'undefined' && state.bamEffects) {
    state.bamEffects.length = 0;
  }
}
