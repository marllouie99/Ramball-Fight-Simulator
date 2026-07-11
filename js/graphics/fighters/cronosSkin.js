export function drawCronosBody(ctx, r, angle) {
  const baseRadius = r;
  const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius);
  bodyGradient.addColorStop(0, '#b8ffff');
  bodyGradient.addColorStop(0.35, '#00d5ff');
  bodyGradient.addColorStop(1, '#081434');
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const sheen = ctx.createRadialGradient(-baseRadius * 0.2, -baseRadius * 0.2, 0, 0, 0, baseRadius);
  sheen.addColorStop(0, 'rgba(255,255,255,0.24)');
  sheen.addColorStop(0.65, 'rgba(0,243,255,0.00)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#00f3ff';
  ctx.lineWidth = 1;
  const hexSize = Math.max(4, baseRadius * 0.22);
  const xOffset = hexSize * 1.75;
  const yOffset = hexSize * 1.52;
  for (let row = -3; row <= 3; row++) {
    for (let col = -3; col <= 3; col++) {
      const x = col * xOffset + ((row % 2) ? xOffset * 0.5 : 0);
      const y = row * yOffset;
      if (Math.hypot(x, y) > baseRadius * 0.92) continue;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angleHex = Math.PI / 6 + i * Math.PI / 3;
        const px = x + Math.cos(angleHex) * hexSize;
        const py = y + Math.sin(angleHex) * hexSize;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#00d7ff';
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255,0,127,0.35)';
  ctx.lineWidth = 1.25;
  for (let i = 0; i < 5; i++) {
    const ang = i * (Math.PI * 2 / 5) + angle * 0.5;
    const inner = baseRadius * 0.38;
    const outer = baseRadius * 0.82;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner);
    ctx.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
    ctx.stroke();
  }
  ctx.restore();
}

