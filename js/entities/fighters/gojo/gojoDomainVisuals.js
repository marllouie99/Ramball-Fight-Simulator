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

  // ── 1. VIBRANT COSMIC CYAN / INDIGO VOID OVERLAY ──
  ctx.save();
  if (isClashSecondary) {
    ctx.globalAlpha = 0.70; // Blends on top of existing domain during domain clash
  }
  const voidGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(canvas.width, canvas.height) * 0.85);
  voidGrad.addColorStop(0, 'rgba(0, 45, 90, 0.70)');    // Bright cosmic cyan/blue glow near Gojo
  voidGrad.addColorStop(0.35, 'rgba(10, 30, 65, 0.75)'); // Vibrant deep indigo-cyan void
  voidGrad.addColorStop(0.7, 'rgba(5, 15, 40, 0.78)');
  voidGrad.addColorStop(1, 'rgba(2, 8, 25, 0.80)');      // Soft cosmic edge

  ctx.fillStyle = voidGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // ── 3. INFINITE KNOWLEDGE SINGULARITY RING AROUND GOJO ──
  const ringPulse = Math.sin(time * 0.004) * 6;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Outer glowing cyan ring
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 75 + ringPulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0, 229, 255, 0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 75 + ringPulse, 0, Math.PI * 2);
  ctx.stroke();

  // Inner white singularity ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 60 - ringPulse * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}
