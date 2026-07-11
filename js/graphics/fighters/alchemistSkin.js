export function drawAlchemistOutline(ctx, x, y, r, attackRadius) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#4dff4d';
  ctx.stroke();

  // Draw attack radius
  ctx.beginPath();
  ctx.arc(x, y, attackRadius, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(77, 255, 77, 0.2)';
  ctx.stroke();
}
