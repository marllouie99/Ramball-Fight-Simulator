export function drawPoisonSpill(ctx, p) {
  const lifeRatio = Math.max(0, Math.min(1, p.life / (p.maxLife || 1)));
  const fadeAlpha = lifeRatio;
  const baseRadius = p.r;
  const now = Date.now();

  ctx.save();

  // ─── Layer 1: Dark base shadow ──────────────────────────────────────
  ctx.globalAlpha = fadeAlpha * 0.4;
  ctx.beginPath();
  ctx.arc(p.x, p.y, baseRadius * 1.1, 0, Math.PI * 2);
  ctx.fillStyle = '#0d2b0d';
  ctx.fill();

  // ─── Layer 2: Main liquid pool with irregular boiling edge ───────────────
  ctx.globalAlpha = fadeAlpha * 0.65;
  ctx.beginPath();
  // Draw irregular boiling edge using multiple arc segments
  const segments = 12;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const wobble = Math.sin(now / 200 + i * 1.3) * 0.08 +
      Math.cos(now / 350 + i * 0.9) * 0.06 +
      Math.sin(now / 120 + i * 2.1) * 0.04;
    const r = baseRadius * (0.85 + wobble);
    const px = p.x + Math.cos(angle) * r;
    const py = p.y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const liquidGrad = ctx.createRadialGradient(
    p.x - baseRadius * 0.15, p.y - baseRadius * 0.15, 0,
    p.x, p.y, baseRadius
  );
  liquidGrad.addColorStop(0, '#7dff7d');
  liquidGrad.addColorStop(0.3, '#4dff4d');
  liquidGrad.addColorStop(0.6, '#2eb82e');
  liquidGrad.addColorStop(1, '#1a5c1a');
  ctx.fillStyle = liquidGrad;
  ctx.fill();

  // ─── Layer 4: Boiling surface bubbles (popping and rising) ───────────────
  const bubbleCount = 10;
  for (let i = 0; i < bubbleCount; i++) {
    const seed = i * 137.5; // Golden angle for even distribution
    const bPhase = (now / 600 + seed) % 1;
    const bAngle = seed * 0.1;
    const bDist = (0.15 + (bPhase * 0.7)) * baseRadius;
    const bx = p.x + Math.cos(bAngle) * bDist;
    const by = p.y + Math.sin(bAngle) * bDist;
    // Bubbles grow then pop
    const bScale = bPhase < 0.7 ? bPhase / 0.7 : (1 - bPhase) / 0.3;
    const br = (2 + i % 3) * bScale;
    const bAlpha = Math.max(0, fadeAlpha * (bPhase < 0.7 ? 0.8 : bScale * 0.8));

    if (br > 0.5) {
      ctx.globalAlpha = bAlpha;
      ctx.fillStyle = '#b8ffb8';
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      // Bubble highlight
      if (br > 1.5) {
        ctx.globalAlpha = bAlpha * 0.6;
        ctx.fillStyle = '#e0ffe0';
        ctx.beginPath();
        ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ─── Layer 5: Surface ripples (expanding circles from random points) ────────
  const rippleCount = 3;
  for (let r = 0; r < rippleCount; r++) {
    const rPhase = ((now / 900 + r * 0.33) % 1);
    const rAngle = r * 2.1 + now / 2000;
    const rDist = rPhase * baseRadius * 0.7;
    const rx = p.x + Math.cos(rAngle) * rDist;
    const ry = p.y + Math.sin(rAngle) * rDist;
    const rAlpha = (1 - rPhase) * fadeAlpha * 0.3;
    const rRadius = 3 + rPhase * 15;

    ctx.globalAlpha = rAlpha;
    ctx.strokeStyle = '#90ee90';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(rx, ry, rRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ─── Layer 6: Foam patches on surface ──────────────────────────────────
  const foamCount = 5;
  for (let f = 0; f < foamCount; f++) {
    const fSeed = f * 97.3;
    const fX = p.x + Math.cos(fSeed * 0.1 + now / 3000) * baseRadius * 0.5;
    const fY = p.y + Math.sin(fSeed * 0.15 + now / 2500) * baseRadius * 0.5;
    const fSize = 4 + (f % 3) * 2;
    const fAlpha = (0.3 + Math.sin(now / 400 + fSeed) * 0.2) * fadeAlpha;

    ctx.globalAlpha = fAlpha;
    ctx.fillStyle = '#c8ffc8';
    ctx.beginPath();
    ctx.arc(fX, fY, fSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── Layer 7: Inner glow core ──────────────────────────────────────────
  ctx.globalAlpha = fadeAlpha * 0.4;
  const coreGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, baseRadius * 0.4);
  coreGrad.addColorStop(0, 'rgba(200,255,200,0.6)');
  coreGrad.addColorStop(1, 'rgba(77,255,77,0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(p.x, p.y, baseRadius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
