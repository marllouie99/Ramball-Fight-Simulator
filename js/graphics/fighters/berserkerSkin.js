import { CONFIG } from '../../core/config.js';

export function drawBerserkerOutline(ctx, x, y, r, isInRage) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = isInRage ? '#ff0000' : '#8b0000';
  ctx.stroke();

  // Rage glow effect (extra outer ring when enraged)
  if (isInRage) {
    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.stroke();
  }

  // Axe attack range ring — subtle solid ring (matching Grenadier/melee style)
  const axeRange = CONFIG.berserker.axeRange ?? 35;
  const attackRadius = r + axeRange;
  ctx.beginPath();
  ctx.arc(x, y, attackRadius, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = isInRage
    ? 'rgba(255, 70, 70, 0.35)'
    : 'rgba(180, 60, 60, 0.18)';
  ctx.stroke();
}

