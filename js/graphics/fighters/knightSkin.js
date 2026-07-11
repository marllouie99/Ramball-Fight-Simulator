import { CONFIG } from '../../core/config.js';

export function drawKnightOutline(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#aaaaaa';
  ctx.stroke();

  // Draw sword range radius
  ctx.beginPath();
  ctx.arc(x, y, r + CONFIG.knight.swordRange, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(158, 158, 158, 0.35)'; // Visible gray ring
  ctx.stroke();
}

