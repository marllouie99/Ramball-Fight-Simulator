// ─────────────────────────────────────────────
// SATORU GOJO DOMAIN EXPANSION (UNLIMITED VOID) VISUAL RENDERER
// ─────────────────────────────────────────────
import { state } from '../../../core/state.js';

export function renderGojoDomainBackground(fighter, ctx, isClashSecondary = false) {
  if (!fighter || !fighter.domainActive) return;

  const time = Date.now();
  const cx = fighter.x;
  const cy = fighter.y;
  const canvas = state.canvas;
  if (!canvas) return;

  ctx.save();

  // ── 1. DEEP BLACK / INDIGO COSMIC VOID OVERLAY ──
  if (!isClashSecondary) {
    const voidGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(canvas.width, canvas.height) * 0.85);
    voidGrad.addColorStop(0, 'rgba(0, 20, 45, 0.92)');
    voidGrad.addColorStop(0.35, 'rgba(5, 10, 30, 0.95)');
    voidGrad.addColorStop(0.7, 'rgba(2, 4, 15, 0.97)');
    voidGrad.addColorStop(1, 'rgba(0, 0, 5, 0.98)');

    ctx.fillStyle = voidGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ── 2. ATMOSPHERIC COSMIC DUST & STARFIELD PARTICLES ──
  for (let p = 0; p < 12; p++) {
    const px = cx + (Math.sin(time * 0.0015 + p * 1.9) * 450);
    const py = cy + (Math.cos(time * 0.002 + p * 2.5) * 320);
    const starAlpha = 0.25 + Math.sin(time * 0.004 + p) * 0.2;
    ctx.fillStyle = `rgba(0, 229, 255, ${starAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.5 + (p % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 3. INFINITE KNOWLEDGE SINGULARITY RING AROUND GOJO ──
  const ringPulse = Math.sin(time * 0.004) * 6;
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 75 + ringPulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 60 - ringPulse * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
