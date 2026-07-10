export function drawDoppelgangerSkin(ctx, x, y, r, angle, timeOpt) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Restore to basic circle shape
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#9b59b6'; // Doppelganger color
  ctx.fill();
  
  // Basic outline
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Basic eyes pointing right (forward)
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(r * 0.4, -r * 0.35, r * 0.15, 0, Math.PI * 2);
  ctx.arc(r * 0.4, r * 0.35, r * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
