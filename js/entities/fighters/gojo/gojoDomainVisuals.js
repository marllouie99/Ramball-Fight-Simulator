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
  const arena = state.arena;
  if (!canvas || !arena) return;

  ctx.save();

  // ── 1. BLUE GLASS TRANSLUCENT LINEAR GRADIENT (SUKUNA DOMAIN AESTHETIC IN BLUE) ──
  ctx.save();
  if (isClashSecondary) {
    ctx.globalAlpha = 0.70;
  }

  if (!fighter._cachedGojoBgGrad || fighter._cachedGojoBgCx !== cx || fighter._cachedGojoBgCy !== cy) {
    fighter._cachedGojoBgCx = cx;
    fighter._cachedGojoBgCy = cy;
    fighter._cachedGojoBgGrad = ctx.createRadialGradient(cx, cy, 15, cx, cy, 230);
    fighter._cachedGojoBgGrad.addColorStop(0, 'rgba(0, 120, 190, 0.78)');   // Vibrant Electric Cyan-Blue bloom around Gojo's body
    fighter._cachedGojoBgGrad.addColorStop(0.35, 'rgba(0, 70, 130, 0.82)'); // Limitless Cyan glass tint
    fighter._cachedGojoBgGrad.addColorStop(0.75, 'rgba(0, 35, 75, 0.88)');  // Deep Infinity Cyan-Navy
    fighter._cachedGojoBgGrad.addColorStop(1, 'rgba(0, 18, 45, 0.92)');     // Outer dark cyan glass edge
  }

  ctx.fillStyle = fighter._cachedGojoBgGrad;
  ctx.fillRect(arena.x, arena.y, arena.width, arena.height);
  ctx.restore();

  // ── 2. HORIZONTAL CYAN SHEEN WAVE LINES (MATCHING SUKUNA'S FLOOR WAVE LINES IN BLUE) ──
  ctx.save();
  const waveCount = 10;
  ctx.lineWidth = 1;
  for (let w = 0; w < waveCount; w++) {
    const wy = cy - 150 + w * 45 + Math.sin(time * 0.002 + w) * 8;
    const waveAlpha = 0.12 + Math.sin(time * 0.003 + w * 1.5) * 0.08;
    ctx.strokeStyle = `rgba(0, 229, 255, ${waveAlpha})`;
    ctx.beginPath();
    ctx.moveTo(cx - 1200, wy);
    ctx.quadraticCurveTo(cx, wy + Math.sin(time * 0.004 + w * 2) * 12, cx + 1200, wy);
    ctx.stroke();
  }
  ctx.restore();

  // ── 3. INFINITE KNOWLEDGE SINGULARITY RINGS AROUND GOJO ──
  const ringPulse = Math.sin(time * 0.004) * 6;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Outer glowing cyan ring (tighter radius)
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 30 + ringPulse * 0.7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0, 229, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 30 + ringPulse * 0.7, 0, Math.PI * 2);
  ctx.stroke();

  // Inner white singularity ring (tighter radius)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, 22 - ringPulse * 0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}
