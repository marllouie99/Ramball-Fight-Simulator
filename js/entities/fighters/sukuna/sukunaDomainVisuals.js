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

  // Detect if clashing with Yuta's domain specifically
  const isMultiDomain = (state.fighters && state.fighters.filter(f => f && f.domainActive).length > 1);
  const yutaClashFighter = isMultiDomain ? state.fighters.find(f => f && f.domainActive && (f.type === 'yuta' || (f._def && f._def.id === 'yuta'))) : null;
  const isYutaClash = !!yutaClashFighter;

  // ── 1. DARK LIQUID WATER FLOOR & SPECULAR SHEEN ──
  ctx.save();
  if (isClashSecondary) {
    ctx.globalAlpha = 0.70; // Blends on top of existing domain during domain clash
  }

  if (!fighter._cachedLiquidGrad || fighter._cachedLiquidGradY !== sy) {
    fighter._cachedLiquidGradY = sy;
    fighter._cachedLiquidGrad = ctx.createLinearGradient(0, sy - 200, 0, sy + 600);
    fighter._cachedLiquidGrad.addColorStop(0, 'rgba(15, 2, 5, 0.88)');
    fighter._cachedLiquidGrad.addColorStop(0.3, 'rgba(40, 4, 10, 0.82)');
    fighter._cachedLiquidGrad.addColorStop(0.7, 'rgba(25, 3, 8, 0.86)');
    fighter._cachedLiquidGrad.addColorStop(1, 'rgba(10, 1, 3, 0.92)');
  }

  ctx.fillStyle = fighter._cachedLiquidGrad;
  ctx.beginPath();
  ctx.arc(sx, sy, domainRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Horizontal liquid water wave sheen lines across the floor
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

  // ── DOMAIN CLASH: Blood-water crimson ripples radiating toward Yuta's domain side ──
  if (isYutaClash) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const yDomX = yutaClashFighter.domainX !== undefined ? yutaClashFighter.domainX : yutaClashFighter.x;
    const yDomY = yutaClashFighter.domainY !== undefined ? yutaClashFighter.domainY : yutaClashFighter.y;
    const dirAngle = Math.atan2(yDomY - sy, yDomX - sx);

    // Radiate 5 concentric blood ripple arcs toward Yuta's domain
    for (let r = 0; r < 5; r++) {
      const rippleRadius = 80 + r * 55 + Math.sin(time * 0.003 + r * 1.2) * 15;
      const rippleAlpha = 0.18 + Math.sin(time * 0.004 + r * 2.5) * 0.1;
      ctx.strokeStyle = `rgba(180, 20, 20, ${rippleAlpha})`;
      ctx.lineWidth = 2.5 - r * 0.3;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255, 0, 0, 0.4)';
      ctx.beginPath();
      // Arc only on the half facing Yuta's domain
      ctx.arc(sx, sy, rippleRadius, dirAngle - Math.PI * 0.4, dirAngle + Math.PI * 0.4);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
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

  // Detect Yuta domain clash
  const isMultiDomain = (state.fighters && state.fighters.filter(f => f && f.domainActive).length > 1);
  const yutaClashFighter = isMultiDomain ? state.fighters.find(f => f && f.domainActive && (f.type === 'yuta' || (f._def && f._def.id === 'yuta'))) : null;
  const isYutaClash = !!yutaClashFighter;

  ctx.save();

  // ── REAL SHRINE STRUCTURE (Above Water Level) ──
  ctx.save();
  ctx.translate(sx, sy - 35);
  fighter._drawShrineBody(ctx);
  ctx.restore();

  // ── DOMAIN CLASH: Crimson cleave slash arcs flickering around the Shrine ──
  if (isYutaClash) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 3 rotating cleave slash arcs around the Shrine roof horns
    for (let s = 0; s < 3; s++) {
      const slashAngle = (s / 3) * Math.PI * 2 + time * 0.004;
      const slashRadius = 80 + Math.sin(time * 0.005 + s * 2) * 20;
      const slashAlpha = 0.4 + Math.sin(time * 0.006 + s * 3) * 0.25;

      ctx.strokeStyle = `rgba(255, 20, 20, ${slashAlpha})`;
      ctx.lineWidth = 3;

      // Draw a curved cleave slash arc
      ctx.beginPath();
      const arcStart = slashAngle - 0.4;
      const arcEnd = slashAngle + 0.4;
      ctx.arc(sx, sy - 35, slashRadius, arcStart, arcEnd);
      ctx.stroke();

      // Thin white edge highlight
      ctx.strokeStyle = `rgba(255, 200, 200, ${slashAlpha * 0.7})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(sx, sy - 35, slashRadius - 2, arcStart + 0.05, arcEnd - 0.05);
      ctx.stroke();
    }

    // Pulsing crimson energy border on Sukuna's domain edge
    const borderPulse = 0.3 + Math.sin(time / 220) * 0.15;
    ctx.strokeStyle = `rgba(220, 20, 60, ${borderPulse})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(sx, sy, 450, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}
