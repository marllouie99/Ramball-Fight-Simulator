import { CONFIG } from '../../core/config.js';

export function drawAssassinOutline(ctx, x, y, r, isInvisible, weaponMode) {
  if (isInvisible) {
    // During stealth mode, still show melee attack radius with full visibility
    if (weaponMode === 'melee') {
      ctx.save();
      ctx.globalAlpha = 1.0; // Full visibility regardless of stealth
      ctx.beginPath();
      ctx.arc(x, y, CONFIG.darkslategray.meleeAttackRadius, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)'; // Brighter for stealth mode visibility
      ctx.stroke();
      ctx.restore();
    }
    return;
  }

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#4a6a6a';
  ctx.stroke();

  // Draw melee attack radius when in melee mode
  if (weaponMode === 'melee') {
    ctx.beginPath();
    ctx.arc(x, y, CONFIG.darkslategray.meleeAttackRadius, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.35)'; // Semi-transparent blue ring
    ctx.stroke();
  }
}

export function drawAssassinBody(ctx, r, color, isInvisible) {
  if (isInvisible) {
    ctx.globalAlpha = CONFIG.darkslategray.invisibilityAlpha;
  }

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
