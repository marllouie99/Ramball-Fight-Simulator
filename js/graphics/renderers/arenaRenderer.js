// ─────────────────────────────────────────────
// ARENA & SCREEN OVERLAY RENDERER
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';

export function drawArena() {
  const { ctx, canvas, arena } = state;
  const hasActiveDomain = state.fighters && state.fighters.some(f => f && f.domainActive);

  if (!hasActiveDomain) {
    // Fill the entire canvas background with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Arena background (in case it needs to be different later, but right now it's also white)
    ctx.fillStyle = 'rgb(250, 250, 250)';
    ctx.fillRect(arena.x, arena.y, arena.width, arena.height);
  }

  // Draw the arena boundary stroke
  ctx.strokeStyle = '#000000ff';
  ctx.lineWidth = 16;
  ctx.strokeRect(arena.x, arena.y, arena.width, arena.height);
}

/**
 * Draws a purple dim screen overlay when Gojo's Hollow Purple orb is active.
 * The overlay opacity is based on the purple orb's remaining life/duration.
 */
export function drawPurpleDimScreen() {
  const { ctx, canvas } = state;
  if (!ctx || !canvas) return;

  const activeProjectiles = state.getProjectiles ? state.getProjectiles() : [];
  const purpleOrb = activeProjectiles.find(p => p && p.isGojoPurpleOrb);

  if (!purpleOrb) return;

  const maxLife = purpleOrb.maxLife || 180;
  const currentLife = purpleOrb.life || 0;
  const lifeRatio = Math.max(0, Math.min(1, currentLife / maxLife));
  const opacity = Math.sin(lifeRatio * Math.PI) * 0.45;

  ctx.save();
  ctx.fillStyle = `rgba(30, 0, 50, ${opacity})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const time = Date.now();
  const vignetteGrad = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.width * 0.2,
    canvas.width / 2, canvas.height / 2, canvas.width * 0.75
  );
  vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignetteGrad.addColorStop(1, `rgba(75, 0, 130, ${opacity * 0.8})`);

  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}
