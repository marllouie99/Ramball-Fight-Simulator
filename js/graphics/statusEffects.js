export function drawSlowEffect(ctx, baseRadius) {
  ctx.fillStyle = 'rgba(77, 163, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();
}

export function drawElectricStunEffect(ctx, baseRadius, useAggressiveMode) {
  ctx.save();
  
  // Clean, bright cyan flash on the body
  ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  // OPTIMIZATION: Skip shockwaves on low-end machines
  if (!useAggressiveMode) {
    // Expanding EMP / energy shockwaves
    const timeFactor1 = (Date.now() % 200) / 200; // Loops every 200ms
    const timeFactor2 = ((Date.now() + 100) % 200) / 200; // Offset by 100ms
    
    // Inner thicker shockwave
    ctx.strokeStyle = `rgba(0, 255, 255, ${1 - timeFactor1})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius * (1 + timeFactor1 * 1.5), 0, Math.PI * 2);
    ctx.stroke();

    // Outer thinner shockwave
    ctx.strokeStyle = `rgba(0, 255, 255, ${1 - timeFactor2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius * (1 + timeFactor2 * 2.5), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPoisonEffect(ctx, baseRadius) {
  ctx.fillStyle = 'rgba(77, 255, 77, 0.4)';
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBurnEffect(ctx, baseRadius, useAggressiveMode) {
  // OPTIMIZATION: Simplified burn effect at low quality
  if (useAggressiveMode) {
    ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // 1. Pulse heat glow outline
  const glowIntensity = Math.abs(Math.sin(Date.now() / 150));
  ctx.save();
  ctx.strokeStyle = `rgba(255, 120, 0, ${0.4 + glowIntensity * 0.4})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius + 2 + glowIntensity * 2, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Translucent fiery inner core
  ctx.fillStyle = `rgba(255, 50, 0, ${0.3 + glowIntensity * 0.2})`;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  // 3. Embers popping off the body
  ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
  for (let i = 0; i < 3; i++) {
    // Pseudo-random positions based on time to make them flicker/move
    const seed = (Date.now() / 80 + i * 13) % (Math.PI * 2);
    const rOffset = baseRadius * (0.6 + 0.5 * Math.sin(seed * 2));
    const x = Math.cos(seed) * rOffset;
    const y = Math.sin(seed) * rOffset;
    
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + Math.sin(seed * 3) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
