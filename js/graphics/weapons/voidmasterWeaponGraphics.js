export function drawVoidmasterWeapon(ctx, x, y, r) {
  const prevFillStyle = ctx.fillStyle;
  const prevStrokeStyle = ctx.strokeStyle;
  const prevLineWidth = ctx.lineWidth;

  ctx.translate(x, y);

  // Note: purposely not rotating by the fighter's body angle 
  // so the weapons do not spin with the character.

  const orbOffset = r + 8;

  // Left orb
  ctx.translate(-orbOffset, 0);
  drawVoidOrb(ctx, 0);
  ctx.translate(orbOffset, 0);

  // Right orb
  ctx.translate(orbOffset, 0);
  drawVoidOrb(ctx, Math.PI);
  ctx.translate(-orbOffset, 0);

  // Manual transform reset
  ctx.translate(-x, -y);

  // Manual state restore
  ctx.fillStyle = prevFillStyle;
  ctx.strokeStyle = prevStrokeStyle;
  ctx.lineWidth = prevLineWidth;
}

function drawVoidOrb(ctx, phaseOffset) {
  const t = Date.now();
  const pulse = Math.sin(t / 200 + phaseOffset) * 0.2 + 1;
  const baseRadius = 6;
  const glowRadius = 12 * pulse;

  // Outer faint glow
  ctx.beginPath();
  ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(0, 0, baseRadius, 0, 0, glowRadius);
  grad.addColorStop(0, 'rgba(153, 0, 255, 0.5)');
  grad.addColorStop(1, 'rgba(153, 0, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Black hole center (matching second image)
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#111'; // black center
  ctx.fill();
  ctx.strokeStyle = '#9900ff'; // solid purple rim
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Small orbiting dot (matching second image)
  const orbitAngle = t / 150 + phaseOffset;
  ctx.beginPath();
  ctx.arc(Math.cos(orbitAngle) * (baseRadius + 2.5), Math.sin(orbitAngle) * (baseRadius + 2.5), 1.8, 0, Math.PI * 2);
  ctx.fillStyle = '#df80ff';
  // OPTIMIZED: Removed shadowBlur (expensive operation)
  ctx.fill();
}
