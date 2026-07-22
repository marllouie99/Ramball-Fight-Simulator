// ─────────────────────────────────────────────
// SUKUNA DOMAIN EXPANSION (MALEVOLENT SHRINE) VISUAL RENDERER
// ─────────────────────────────────────────────
import { state } from '../../../core/state.js';

export function renderSukunaDomainBackground(fighter, ctx, isClashSecondary = false) {
  if (!fighter || !fighter.domainActive) return;

  const domainRadius = 1000;
  const time = Date.now();
  const sx = fighter.domainX !== undefined ? fighter.domainX : fighter.x;
  const sy = fighter.domainY !== undefined ? fighter.domainY : fighter.y;

  ctx.save();

  // ── 1. DARK LIQUID WATER FLOOR & SPECULAR SHEEN ──
  if (!isClashSecondary) {
    const liquidGrad = ctx.createLinearGradient(0, sy - 200, 0, sy + 600);
    liquidGrad.addColorStop(0, 'rgba(15, 2, 5, 0.88)');
    liquidGrad.addColorStop(0.3, 'rgba(40, 4, 10, 0.82)');
    liquidGrad.addColorStop(0.7, 'rgba(25, 3, 8, 0.86)');
    liquidGrad.addColorStop(1, 'rgba(10, 1, 3, 0.92)');

    ctx.fillStyle = liquidGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, domainRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Horizontal liquid water wave sheen lines across the floor
  const isMultiDomain = (state.fighters && state.fighters.filter(f => f && f.domainActive).length > 1);
  const waveCount = isMultiDomain ? 4 : 12;
  ctx.lineWidth = 1;
  for (let w = 0; w < waveCount; w++) {
    const wy = sy - 150 + w * 45 + Math.sin(time * 0.002 + w) * 8;
    const waveAlpha = 0.12 + Math.sin(time * 0.003 + w * 1.5) * 0.08;
    ctx.strokeStyle = `rgba(240, 80, 80, ${waveAlpha})`;
    ctx.beginPath();
    ctx.moveTo(sx - 1200, wy);
    ctx.quadraticCurveTo(sx, wy + Math.sin(time * 0.004 + w * 2) * 12, sx + 1200, wy);
    ctx.stroke();
  }

  // ── 2. WATER REFLECTION OF THE SHRINE STRUCTURE ──
  ctx.save();
  ctx.translate(sx, sy + 30);
  ctx.scale(1, -0.45);
  ctx.globalAlpha = 0.32;
  fighter._drawShrineBody(ctx);
  ctx.fillStyle = 'rgba(20, 2, 6, 0.45)';
  ctx.fillRect(-150, -150, 300, 300);
  ctx.restore();

  // ── 3. FIGHTER WATER REFLECTIONS ──
  if (state.fighters) {
    state.fighters.forEach(f => {
      if (f && f.hp > 0) {
        ctx.save();
        ctx.translate(f.x, f.y + f.r * 1.6);
        ctx.scale(1, 0.3);
        ctx.fillStyle = 'rgba(255, 30, 30, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, f.r * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  ctx.restore();
}

export function renderSukunaDomainForeground(fighter, ctx) {
  if (!fighter || !fighter.domainActive) return;

  const time = Date.now();
  const sx = fighter.domainX !== undefined ? fighter.domainX : fighter.x;
  const sy = fighter.domainY !== undefined ? fighter.domainY : fighter.y;

  ctx.save();

  // ── REAL SHRINE STRUCTURE (Above Water Level) ──
  ctx.save();
  ctx.translate(sx, sy - 35);
  fighter._drawShrineBody(ctx);
  ctx.restore();

  // Floating Blood/Spark Embers inside Domain
  for (let p = 0; p < 10; p++) {
    const px = sx + (Math.sin(time * 0.002 + p * 1.7) * 450);
    const py = sy + (Math.cos(time * 0.0025 + p * 2.3) * 300);
    ctx.fillStyle = '#FF2200';
    ctx.beginPath();
    ctx.arc(px, py, 1.8 + (p % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
