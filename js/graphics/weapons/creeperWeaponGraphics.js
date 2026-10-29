// ═══════════════════════════════════════════════════════════════════════════
// CREEPER (Minecraft) — TNT Block, Explosion & Sulfur Particle Graphics
// Adheres strictly to Rule 11 (Zero shadowBlur), Rule 26 (Concentric Shockwaves),
// and Rule 31 (Anti-Rectangular Clipping & Feathered Boundaries).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Draws a classic Minecraft red-and-white TNT block with authentic pixel face,
 * top fuse cord, and rhythmic white priming flash.
 */
export function drawMinecraftTntBlock(ctx, tnt) {
  if (!ctx || !tnt) return;
  const size = tnt.size || 22;
  const half = size * 0.5;

  ctx.save();
  ctx.translate(tnt.x, tnt.y);

  // Rotation while traveling through air
  if (tnt.isBouncing || tnt.isAirborne) {
    ctx.rotate(tnt.rotation || 0);
  }

  // White flash cadence as fuse burns down
  const fuseP = Math.max(0, 1.0 - (tnt.fuseTimer || 0) / Math.max(1, tnt.maxFuseTimer || 135));
  const flashFreq = 3 + fuseP * 14;
  const isFlashingWhite = Math.sin(fuseP * Math.PI * flashFreq) > 0.15;

  // Outer black ink frame (Rule 32)
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-half - 1.5, -half - 1.5, size + 3, size + 3);

  if (isFlashingWhite) {
    // Solid white flash on prime
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-half, -half, size, size);
  } else {
    // Red TNT Top / Bottom bands
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(-half, -half, size, size);

    // Dark red bottom shadow
    ctx.fillStyle = '#991B1B';
    ctx.fillRect(-half, half - 3, size, 3);

    // Top highlight rim
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(-half, -half, size, 3);

    // Center white band
    const bandH = size * 0.44;
    const bandY = -bandH * 0.5;
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(-half, bandY, size, bandH);

    // Dark band border lines
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-half, bandY - 1, size, 1);
    ctx.fillRect(-half, bandY + bandH, size, 1);

    // Authentic pixel "TNT" lettering
    ctx.fillStyle = '#0F172A';
    // 'T'
    ctx.fillRect(-half + 3, bandY + 2, 4, 1.5);
    ctx.fillRect(-half + 4.2, bandY + 2, 1.5, bandH - 4);
    // 'N'
    ctx.fillRect(-half + 8.5, bandY + 2, 1.5, bandH - 4);
    ctx.fillRect(-half + 10, bandY + 3.5, 1.5, 2.5);
    ctx.fillRect(-half + 11.5, bandY + 2, 1.5, bandH - 4);
    // 'T'
    ctx.fillRect(-half + 14.5, bandY + 2, 4, 1.5);
    ctx.fillRect(-half + 15.7, bandY + 2, 1.5, bandH - 4);
  }

  // Top fuse spark
  if (tnt.fuseTimer > 0) {
    const sparkX = Math.sin(fuseP * 25) * 2;
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(-1, -half - 3, 2, 3); // Gray fuse string
    ctx.fillStyle = isFlashingWhite ? '#FEF08A' : '#F97316';
    ctx.beginPath();
    ctx.arc(sparkX, -half - 4.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Renders a concussive Minecraft explosion with concentric expanding water-ripple rings
 * and puffy blocky smoke clouds (strictly adhering to Rule 26 & Rule 31).
 */
export function drawCreeperExplosion(ctx, vfx) {
  if (!ctx || !vfx) return;
  const p = Math.min(1.0, 1.0 - (vfx.timer || 0) / Math.max(1, vfx.maxTimer || 28));
  if (p >= 1.0) return;

  const maxR = vfx.radius || 130;
  const isCharged = Boolean(vfx.isCharged);

  ctx.save();
  ctx.translate(vfx.x, vfx.y);

  // 1. Expanding Translucent Interior Wash (Rule 26)
  const washP = Math.pow(p, 0.75);
  const curWashR = maxR * washP;
  const washAlpha = Math.max(0, (1.0 - p) * 0.24);
  ctx.fillStyle = isCharged ? `rgba(56, 189, 248, ${washAlpha.toFixed(3)})` : `rgba(249, 115, 22, ${washAlpha.toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(0, 0, curWashR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Sequential Water-Ripple Shockwave Bands (Rule 26 Dipping Fingers Standard)
  const ringCount = isCharged ? 3 : 2;
  for (let i = 0; i < ringCount; i++) {
    const delay = i * 0.16;
    if (p < delay) continue;
    const ringP = Math.min(1.0, (p - delay) / (1.0 - delay));
    const easeR = Math.pow(ringP, 0.60) * maxR * (isCharged ? 1.05 : 0.95);
    const ringAlpha = Math.max(0, (1.0 - ringP) * (0.85 - i * 0.18));
    if (ringAlpha <= 0) continue;

    ctx.strokeStyle = isCharged
      ? (i === 0 ? `rgba(255, 255, 255, ${ringAlpha.toFixed(3)})` : `rgba(56, 189, 248, ${ringAlpha.toFixed(3)})`)
      : (i === 0 ? `rgba(255, 255, 255, ${ringAlpha.toFixed(3)})` : `rgba(249, 115, 22, ${ringAlpha.toFixed(3)})`);
    ctx.lineWidth = Math.max(1.5, (3.5 - i * 0.8) * (1.0 - ringP * 0.6));
    ctx.beginPath();
    ctx.arc(0, 0, easeR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 3. Discrete Minecraft Puffy Smoke & Sulfur Cloud Cubes (Zero Radial Cobweb Lines - Rule 26)
  const smokeCount = isCharged ? 14 : 10;
  for (let s = 0; s < smokeCount; s++) {
    const angle = (s / smokeCount) * Math.PI * 2 + s * 0.5;
    const distP = Math.pow(p, 0.70);
    const dist = maxR * 0.68 * distP;
    const sx = Math.cos(angle) * dist;
    const sy = Math.sin(angle) * dist;
    const puffSize = Math.max(2, (12 - s % 4 * 2) * (1.0 - p * 0.8));
    const puffAlpha = Math.max(0, (1.0 - p) * 0.70);

    ctx.fillStyle = isCharged
      ? (s % 3 === 0 ? `rgba(255, 255, 255, ${puffAlpha.toFixed(3)})` : `rgba(56, 189, 248, ${puffAlpha.toFixed(3)})`)
      : (s % 3 === 0 ? `rgba(254, 240, 138, ${puffAlpha.toFixed(3)})` : `rgba(100, 116, 139, ${puffAlpha.toFixed(3)})`);
    ctx.fillRect(sx - puffSize * 0.5, sy - puffSize * 0.5, puffSize, puffSize);
  }

  ctx.restore();
}
