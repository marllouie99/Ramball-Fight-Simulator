export function drawRangerOutline(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#00eaff70';
  ctx.stroke();
}
