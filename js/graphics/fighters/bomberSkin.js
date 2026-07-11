import { CONFIG } from '../../core/config.js';
import { drawBomberGrenade } from '../weapons/bomberWeaponGraphics.js';

export function drawBomberOutline(ctx, x, y, r, skinColor) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = skinColor || '#4A2508';
  ctx.stroke();

  // Draw throw radius (max range — green dashed)
  const throwRadius = CONFIG.bomber.throwRadius;
  ctx.beginPath();
  ctx.arc(x, y, throwRadius, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = 'rgba(100, 255, 100, 0.25)';
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw restrict radius (min range — red dashed)
  const restrictRadius = CONFIG.bomber.restrictRadius;
  ctx.beginPath();
  ctx.arc(x, y, restrictRadius, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255, 80, 80, 0.3)';
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawBomberBody(ctx, r, angle, skinColor, skinAccentColor) {
  ctx.save();
  ctx.rotate(angle);

  // Base body with custom skin color
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = skinColor;
  ctx.fill();

  // TNT texture pattern
  ctx.fillStyle = '#FF0000';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw "TNT" text on the body
  ctx.save();
  ctx.rotate(-angle); // Counter-rotate to keep text upright
  ctx.fillText('TNT', 0, 0);
  ctx.restore();

  // Add explosive warning stripes
  ctx.strokeStyle = skinAccentColor;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((Math.PI / 2) * i);
    ctx.beginPath();
    ctx.moveTo(r - 5, -3);
    ctx.lineTo(r, -3);
    ctx.moveTo(r - 5, 3);
    ctx.lineTo(r, 3);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

export function drawBomberHeldGrenade(ctx, x, y, r, gunAngle) {
  // Hand position is near the base of the grenade launcher, not at the muzzle tip.
  const handOffset = r + CONFIG.gun.baseOffset + 4;
  const handX = x + Math.cos(gunAngle) * handOffset;
  const handY = y + Math.sin(gunAngle) * handOffset;

  // Offset the grenade slightly to the side of the launcher so it looks held, not pointed.
  const perpX = -Math.sin(gunAngle);
  const perpY = Math.cos(gunAngle);
  const grenadeRadius = Math.max(4, r * 0.35);
  const sideOffset = grenadeRadius * 0.7;
  const forwardOffset = -6;
  const gx = handX + Math.cos(gunAngle) * forwardOffset + perpX * sideOffset;
  const gy = handY + Math.sin(gunAngle) * forwardOffset + perpY * sideOffset;

  // Draw the grenade with a fixed top-facing orientation.
  drawBomberGrenade(ctx, gx, gy, grenadeRadius, {
    rotation: 0,
    isSticky: false,
    sparkPhase: Date.now() / 100,
    trailPoints: [],
    shadowAlpha: 0.15,
    zHeight: 0,
    isHeld: true,
  });

  // Draw fingers gripping the grenade (simple representation)
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(gunAngle);

  // Draw simple finger indicators
  ctx.strokeStyle = '#8B7355';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  // Three fingers wrapping around the grenade
  for (let i = 0; i < 3; i++) {
    const fingerY = -4 + i * 4;
    ctx.beginPath();
    ctx.arc(forwardOffset + sideOffset * 0.9, fingerY, 3, 0, Math.PI, true);
    ctx.stroke();
  }

  ctx.restore();
}

