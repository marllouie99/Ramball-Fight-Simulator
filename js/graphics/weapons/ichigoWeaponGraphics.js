import { state } from '../../core/state.js';

export function drawGetsugaSlash(ctx, p, isBlack) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = Math.atan2(vy, vx);
  const owner = state.fighters && state.fighters[p.owner];
  const form = p.getsugaForm || (isBlack ? (owner && owner.hollowMaskActive ? (owner.bankaiActive ? 'bankai_hollow' : 'hollow') : 'bankai') : 'shikai');
  
  const isFinal = form === 'final_bankai';
  const isBankaiHollow = form === 'bankai_hollow' || (owner && owner.bankaiActive && owner.hollowMaskActive);
  const isShikaiHollow = (form === 'hollow' || (owner && !owner.bankaiActive && owner.hollowMaskActive)) && !isBankaiHollow;
  const isBankai = form === 'bankai' || isBankaiHollow || isFinal;
  const isShikai = form === 'shikai' && !isBankai && !isShikaiHollow;

  const scale = owner ? Math.max(0.9, owner.r / 22) : 1.0;
  const lifeRatio = Math.max(0.2, (p.life || 30) / (p.maxLife || 30));
  const isInfinityFrozen = Boolean(p.isFrozenByInfinity);
  const fadeAlpha = (isInfinityFrozen && p.infinityFreezeTimer !== undefined && p.infinityFreezeTimer < 30) ? Math.max(0, p.infinityFreezeTimer / 30) : 1.0;
  const alpha = Math.min(1.0, lifeRatio * 1.30) * fadeAlpha;
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  const scaleMult = isFinal ? 2.85 : ((isBankaiHollow || isShikaiHollow) ? 2.15 : (isBankai ? 1.95 : 1.85));
  ctx.scale(scale * scaleMult, scale * scaleMult);

  // ── Exact Crescent Parameters (Matching VFX Reference Image) ──
  const R = isFinal ? 84 : ((isBankaiHollow || isShikaiHollow) ? 62 : (isBankai ? 54 : 56));             // Crescent outer radius
  const maxThick = isFinal ? 30 : ((isBankaiHollow || isShikaiHollow) ? 22 : (isBankai ? 19 : 20));      // Maximum crescent body thickness at center
  const halfAngle = isFinal ? (0.70 * Math.PI) : ((isBankaiHollow || isShikaiHollow) ? (0.66 * Math.PI) : (0.64 * Math.PI)); // ~115° - 126° sweep
  const numSteps = 24;

  // ── 0. Soft Volumetric Atmospheric Glow (Concentric Radial Diffusion) ──
  const glowSteps = 24;
  ctx.beginPath();
  for (let i = 0; i <= glowSteps; i++) {
    const t = (i / glowSteps) * 2 - 1;
    const ang = t * halfAngle;
    const gTaper = Math.cos(t * (Math.PI / 2));
    const dist = R + maxThick * 0.75 * gTaper;
    const gx = Math.cos(ang) * dist;
    const gy = Math.sin(ang) * dist;
    if (i === 0) ctx.moveTo(gx, gy);
    else ctx.lineTo(gx, gy);
  }
  for (let i = glowSteps; i >= 0; i--) {
    const t = (i / glowSteps) * 2 - 1;
    const ang = t * halfAngle;
    const gTaper = Math.cos(t * (Math.PI / 2));
    const dist = R - maxThick * 1.85 * Math.pow(gTaper, 1.2);
    const gx = Math.cos(ang) * dist;
    const gy = Math.sin(ang) * dist;
    ctx.lineTo(gx, gy);
  }
  ctx.closePath();

  if (isInfinityFrozen) ctx.fillStyle = `rgba(0, 229, 255, ${(0.35 * alpha).toFixed(3)})`;
  else if (isFinal) ctx.fillStyle = `rgba(220, 20, 60, ${(0.30 * alpha).toFixed(3)})`;
  else if (isBankaiHollow) ctx.fillStyle = `rgba(220, 20, 40, ${(0.32 * alpha).toFixed(3)})`;
  else if (isShikaiHollow) ctx.fillStyle = `rgba(0, 229, 255, ${(0.32 * alpha).toFixed(3)})`;
  else if (isBankai) ctx.fillStyle = `rgba(220, 20, 40, ${(0.28 * alpha).toFixed(3)})`;
  else ctx.fillStyle = `rgba(0, 160, 255, ${(0.26 * alpha).toFixed(3)})`;
  ctx.fill();

  // ── 1. Trailing Ethereal Motion Blur Echoes ──
  const echoCount = isFinal ? 3 : 2;
  for (let e = echoCount; e >= 1; e--) {
    const eFrac = e / (echoCount + 1);
    const eDist = e * (isFinal ? 14 : 9);
    const eAlpha = alpha * (1.0 - eFrac) * 0.40;

    ctx.save();
    ctx.translate(-eDist, 0);
    ctx.scale(1.0 - eFrac * 0.08, 1.0 - eFrac * 0.08);

    ctx.beginPath();
    for (let i = 0; i <= numSteps; i++) {
      const t = (i / numSteps) * 2 - 1;
      const ang = t * halfAngle;
      const fx = Math.cos(ang) * R;
      const fy = Math.sin(ang) * R;
      if (i === 0) ctx.moveTo(fx, fy);
      else ctx.lineTo(fx, fy);
    }
    for (let i = numSteps; i >= 0; i--) {
      const t = (i / numSteps) * 2 - 1;
      const ang = t * halfAngle;
      const taper = Math.cos(t * (Math.PI / 2));
      const inR = R - maxThick * Math.pow(taper, 1.25);
      const bx = Math.cos(ang) * inR;
      const by = Math.sin(ang) * inR;
      ctx.lineTo(bx, by);
    }
    ctx.closePath();

    if (isInfinityFrozen) ctx.fillStyle = `rgba(0, 220, 255, ${eAlpha.toFixed(3)})`;
    else if (isFinal) ctx.fillStyle = `rgba(220, 20, 60, ${eAlpha.toFixed(3)})`;
    else if (isBankaiHollow) ctx.fillStyle = `rgba(220, 20, 40, ${eAlpha.toFixed(3)})`;
    else if (isShikaiHollow) ctx.fillStyle = `rgba(0, 220, 255, ${eAlpha.toFixed(3)})`;
    else if (isBankai) ctx.fillStyle = `rgba(220, 20, 40, ${eAlpha.toFixed(3)})`;
    else ctx.fillStyle = `rgba(0, 200, 255, ${eAlpha.toFixed(3)})`;
    ctx.fill();

    ctx.restore();
  }

  // ── 2. Outer Luminous Crescent Halo (Smooth Outer Edge Gradient) ──
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = (i / numSteps) * 2 - 1;
    const ang = t * halfAngle;
    const taper = Math.cos(t * (Math.PI / 2));
    const fx = Math.cos(ang) * (R + 2.8 * taper);
    const fy = Math.sin(ang) * (R + 2.8 * taper);
    if (i === 0) ctx.moveTo(fx, fy);
    else ctx.lineTo(fx, fy);
  }
  for (let i = numSteps; i >= 0; i--) {
    const t = (i / numSteps) * 2 - 1;
    const ang = t * halfAngle;
    const taper = Math.cos(t * (Math.PI / 2));
    const inR = R - maxThick * 1.15 * Math.pow(taper, 1.30);
    const bx = Math.cos(ang) * inR;
    const by = Math.sin(ang) * inR;
    ctx.lineTo(bx, by);
  }
  ctx.closePath();

  const haloGrad = ctx.createRadialGradient(R * 0.4, 0, R * 0.2, R * 0.6, 0, R * 1.2);
  if (isInfinityFrozen) {
    haloGrad.addColorStop(0.0, `rgba(0, 240, 255, ${(0.75 * alpha).toFixed(3)})`);
    haloGrad.addColorStop(1.0, 'rgba(0, 100, 255, 0.0)');
  } else if (isFinal) {
    haloGrad.addColorStop(0.0, `rgba(220, 20, 60, ${(0.65 * alpha).toFixed(3)})`);
    haloGrad.addColorStop(1.0, 'rgba(120, 0, 20, 0.0)');
  } else if (isBankaiHollow) {
    haloGrad.addColorStop(0.0, `rgba(255, 30, 50, ${(0.70 * alpha).toFixed(3)})`);
    haloGrad.addColorStop(1.0, 'rgba(18, 2, 6, 0.0)');
  } else if (isShikaiHollow) {
    haloGrad.addColorStop(0.0, `rgba(0, 235, 255, ${(0.70 * alpha).toFixed(3)})`);
    haloGrad.addColorStop(1.0, 'rgba(10, 15, 25, 0.0)');
  } else if (isBankai) {
    haloGrad.addColorStop(0.0, `rgba(255, 30, 50, ${(0.65 * alpha).toFixed(3)})`);
    haloGrad.addColorStop(1.0, 'rgba(150, 10, 20, 0.0)');
  } else {
    haloGrad.addColorStop(0.0, `rgba(0, 220, 255, ${(0.65 * alpha).toFixed(3)})`);
    haloGrad.addColorStop(1.0, 'rgba(0, 100, 255, 0.0)');
  }
  ctx.fillStyle = haloGrad;
  ctx.fill();

  // ── 3. Main Dense Crescent Body (Form-Themed Color Flow) ──
  ctx.beginPath();
  // Convex Outer Leading Arc
  for (let i = 0; i <= numSteps; i++) {
    const t = (i / numSteps) * 2 - 1;
    const ang = t * halfAngle;
    const fx = Math.cos(ang) * R;
    const fy = Math.sin(ang) * R;
    if (i === 0) ctx.moveTo(fx, fy);
    else ctx.lineTo(fx, fy);
  }
  // Concave Inner Trailing Arc (Clean, smooth fluid taper)
  for (let i = numSteps; i >= 0; i--) {
    const t = (i / numSteps) * 2 - 1;
    const ang = t * halfAngle;
    const taper = Math.cos(t * (Math.PI / 2));
    const inR = R - maxThick * Math.pow(taper, 1.32);
    const bx = Math.cos(ang) * inR;
    const by = Math.sin(ang) * inR;
    ctx.lineTo(bx, by);
  }
  ctx.closePath();

  // Directional Linear Plasma Gradient from Leading Apex toward Center Concave Wake
  const bodyGrad = ctx.createLinearGradient(R, 0, R - maxThick * 1.1, 0);
  if (isInfinityFrozen) {
    // ── Frozen by Limitless Infinity: Pure Laser White -> Radiant Electric Cyan -> Deep Azure ──
    bodyGrad.addColorStop(0.0, `rgba(255, 255, 255, ${(1.0 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(0.20, `rgba(0, 240, 255, ${(0.98 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(0.65, `rgba(0, 130, 255, ${(0.92 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(1.0, `rgba(0, 60, 200, ${(0.20 * alpha).toFixed(3)})`);
  } else if (isFinal) {
    bodyGrad.addColorStop(0.0, `rgba(255, 240, 240, ${(1.0 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(0.18, `rgba(220, 20, 60, ${(0.96 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(0.55, `rgba(8, 1, 3, ${(0.99 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(1.0, `rgba(4, 0, 1, ${(0.30 * alpha).toFixed(3)})`);
  } else if (isBankaiHollow) {
    // ── Hollow in Bankai: Black + Red Crimson + White Lines ──
    bodyGrad.addColorStop(0.0, `rgba(255, 255, 255, ${(1.0 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(0.18, `rgba(255, 25, 45, ${(0.98 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(0.52, `rgba(6, 1, 2, ${(0.99 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(1.0, `rgba(2, 0, 1, ${(0.30 * alpha).toFixed(3)})`);
  } else if (isShikaiHollow) {
    // ── Hollow in Shikai: CyanBlue + White + Black Lines ──
    bodyGrad.addColorStop(0.0, `rgba(255, 255, 255, ${(1.0 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(0.20, `rgba(0, 240, 255, ${(0.98 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(0.55, `rgba(10, 12, 18, ${(0.98 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(1.0, `rgba(0, 140, 240, ${(0.20 * alpha).toFixed(3)})`);
  } else if (isBankai) {
    bodyGrad.addColorStop(0.0, `rgba(255, 240, 245, ${(0.98 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(0.18, `rgba(255, 25, 45, ${(0.96 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(0.55, `rgba(10, 2, 5, ${(0.98 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(1.0, `rgba(6, 1, 3, ${(0.25 * alpha).toFixed(3)})`);
  } else {
    // Standard Shikai: Brilliant White -> Electric Cyan -> Deep Radiant Azure
    bodyGrad.addColorStop(0.0, `rgba(255, 255, 255, ${(1.0 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(0.20, `rgba(70, 245, 255, ${(0.98 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(0.65, `rgba(0, 150, 255, ${(0.88 * alpha).toFixed(3)})`);
    bodyGrad.addColorStop(1.0, `rgba(0, 90, 240, ${(0.15 * alpha).toFixed(3)})`);
  }
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // ── 4. Stylized Inner Fluid Plasma Whisps (Anime Liquid Plasma Texture) ──
  ctx.save();
  ctx.beginPath();
  const whispSteps = 28;
  for (let i = 0; i <= whispSteps; i++) {
    const t = (i / whispSteps) * 2 - 1;
    const ang = t * (halfAngle * 0.88);
    const taper = Math.cos(t * (Math.PI / 2));
    const wave = Math.sin(t * Math.PI * 3 + now * 0.012) * (1.2 * taper);
    const fx = Math.cos(ang) * (R - maxThick * 0.22 + wave);
    const fy = Math.sin(ang) * (R - maxThick * 0.22 + wave);
    if (i === 0) ctx.moveTo(fx, fy);
    else ctx.lineTo(fx, fy);
  }
  for (let i = whispSteps; i >= 0; i--) {
    const t = (i / whispSteps) * 2 - 1;
    const ang = t * (halfAngle * 0.88);
    const taper = Math.cos(t * (Math.PI / 2));
    const inR = R - maxThick * (0.68 * Math.pow(taper, 1.4));
    const bx = Math.cos(ang) * inR;
    const by = Math.sin(ang) * inR;
    ctx.lineTo(bx, by);
  }
  ctx.closePath();

  if (isInfinityFrozen) ctx.fillStyle = `rgba(180, 250, 255, ${(0.75 * alpha).toFixed(3)})`;
  else if (isFinal) ctx.fillStyle = `rgba(255, 40, 70, ${(0.45 * alpha).toFixed(3)})`;
  else if (isBankaiHollow) ctx.fillStyle = `rgba(255, 40, 70, ${(0.55 * alpha).toFixed(3)})`;
  else if (isShikaiHollow) ctx.fillStyle = `rgba(0, 240, 255, ${(0.60 * alpha).toFixed(3)})`;
  else if (isBankai) ctx.fillStyle = `rgba(255, 30, 50, ${(0.38 * alpha).toFixed(3)})`;
  else ctx.fillStyle = `rgba(180, 250, 255, ${(0.65 * alpha).toFixed(3)})`;
  ctx.fill();
  ctx.restore();

  // ── 5. Leading Arc Lines (Themed Line Contours) ──
  // Outer Outline Stroke
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = (i / numSteps) * 2 - 1;
    const ang = t * halfAngle;
    const fx = Math.cos(ang) * R;
    const fy = Math.sin(ang) * R;
    if (i === 0) ctx.moveTo(fx, fy);
    else ctx.lineTo(fx, fy);
  }

  if (isInfinityFrozen) {
    ctx.strokeStyle = `rgba(0, 240, 255, ${(0.98 * alpha).toFixed(3)})`;
    ctx.lineWidth = 3.6;
    ctx.stroke();
  } else if (isFinal) {
    ctx.strokeStyle = `rgba(255, 40, 60, ${(0.95 * alpha).toFixed(3)})`;
    ctx.lineWidth = 3.6;
    ctx.stroke();
  } else if (isBankaiHollow) {
    // Bankai Hollow: Crimson outer glow with Black accent line
    ctx.strokeStyle = `rgba(255, 30, 50, ${(0.98 * alpha).toFixed(3)})`;
    ctx.lineWidth = 3.6;
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= numSteps; i++) {
      const t = (i / numSteps) * 2 - 1;
      const ang = t * halfAngle;
      const fx = Math.cos(ang) * (R - 0.5);
      const fy = Math.sin(ang) * (R - 0.5);
      if (i === 0) ctx.moveTo(fx, fy);
      else ctx.lineTo(fx, fy);
    }
    ctx.strokeStyle = `rgba(5, 1, 2, ${(0.95 * alpha).toFixed(3)})`;
    ctx.lineWidth = 2.4;
    ctx.stroke();
  } else if (isShikaiHollow) {
    // Shikai Hollow: Cyan-Blue outer glow with Black contrast line
    ctx.strokeStyle = `rgba(0, 240, 255, ${(0.98 * alpha).toFixed(3)})`;
    ctx.lineWidth = 3.6;
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= numSteps; i++) {
      const t = (i / numSteps) * 2 - 1;
      const ang = t * halfAngle;
      const fx = Math.cos(ang) * (R - 0.5);
      const fy = Math.sin(ang) * (R - 0.5);
      if (i === 0) ctx.moveTo(fx, fy);
      else ctx.lineTo(fx, fy);
    }
    ctx.strokeStyle = `rgba(5, 8, 14, ${(0.98 * alpha).toFixed(3)})`;
    ctx.lineWidth = 2.4;
    ctx.stroke();
  } else if (isBankai) {
    ctx.strokeStyle = `rgba(255, 30, 50, ${(0.95 * alpha).toFixed(3)})`;
    ctx.lineWidth = 3.0;
    ctx.stroke();
  } else {
    ctx.strokeStyle = `rgba(0, 240, 255, ${(0.98 * alpha).toFixed(3)})`;
    ctx.lineWidth = 3.4;
    ctx.stroke();
  }

  // Inner Ultra-Bright White-Hot Laser Spine (The "White Lines")
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = (i / numSteps) * 2 - 1;
    const ang = t * halfAngle;
    const fx = Math.cos(ang) * R;
    const fy = Math.sin(ang) * R;
    if (i === 0) ctx.moveTo(fx, fy);
    else ctx.lineTo(fx, fy);
  }
  ctx.strokeStyle = `rgba(255, 255, 255, ${(1.0 * alpha).toFixed(3)})`;
  ctx.lineWidth = (isBankaiHollow || isShikaiHollow || isInfinityFrozen) ? 1.6 : 1.4;
  ctx.stroke();

  // ── 6. Iconic Center Leading Slash Flare / Energy Beam ──
  const flareLen = isFinal ? 46 : ((isBankaiHollow || isShikaiHollow || isInfinityFrozen) ? 36 : (isBankai ? 28 : 30));
  const flareAngle = -0.45; // ~-25° angle matching the dynamic cutting slash beam in Image 2
  const cosF = Math.cos(flareAngle);
  const sinF = Math.sin(flareAngle);
  const perpFX = -sinF;
  const perpFY = cosF;

  ctx.save();
  ctx.translate(R, 0);

  // Pass A: Brilliant 4-Point Forward Cutting Slash Flare
  ctx.beginPath();
  ctx.moveTo(cosF * flareLen, sinF * flareLen);                             // Sharp leading spear tip
  ctx.lineTo(perpFX * 3.5 - cosF * (flareLen * 0.2), perpFY * 3.5 - sinF * (flareLen * 0.2));
  ctx.lineTo(-cosF * (flareLen * 0.45), -sinF * (flareLen * 0.45));          // Trailing core root
  ctx.lineTo(-perpFX * 3.5 - cosF * (flareLen * 0.2), -perpFY * 3.5 - sinF * (flareLen * 0.2));
  ctx.closePath();

  ctx.fillStyle = `rgba(255, 255, 255, ${(1.0 * alpha).toFixed(3)})`;
  ctx.fill();

  // Pass B: Outer Glow on the Cutting Beam
  if (isInfinityFrozen) ctx.strokeStyle = `rgba(0, 240, 255, ${(0.98 * alpha).toFixed(3)})`;
  else if (isFinal) ctx.strokeStyle = `rgba(255, 40, 60, ${(0.92 * alpha).toFixed(3)})`;
  else if (isBankaiHollow) ctx.strokeStyle = `rgba(255, 30, 50, ${(0.95 * alpha).toFixed(3)})`;
  else if (isShikaiHollow) ctx.strokeStyle = `rgba(0, 240, 255, ${(0.98 * alpha).toFixed(3)})`;
  else if (isBankai) ctx.strokeStyle = `rgba(255, 30, 50, ${(0.92 * alpha).toFixed(3)})`;
  else ctx.strokeStyle = `rgba(0, 240, 255, ${(0.95 * alpha).toFixed(3)})`;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Pass C: Circular Focal Blast Orb & Micro Energy Droplets
  const focalGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 8.5);
  focalGrad.addColorStop(0.0, `rgba(255, 255, 255, ${(1.0 * alpha).toFixed(3)})`);
  if (isInfinityFrozen) {
    focalGrad.addColorStop(0.45, `rgba(0, 240, 255, ${(0.85 * alpha).toFixed(3)})`);
    focalGrad.addColorStop(1.0, 'rgba(0, 140, 255, 0.0)');
  } else if (isFinal || isBankaiHollow) {
    focalGrad.addColorStop(0.45, `rgba(255, 40, 50, ${(0.85 * alpha).toFixed(3)})`);
    focalGrad.addColorStop(1.0, 'rgba(220, 20, 40, 0.0)');
  } else if (isShikaiHollow) {
    focalGrad.addColorStop(0.45, `rgba(0, 240, 255, ${(0.85 * alpha).toFixed(3)})`);
    focalGrad.addColorStop(1.0, 'rgba(0, 140, 255, 0.0)');
  } else if (isBankai) {
    focalGrad.addColorStop(0.45, `rgba(255, 40, 50, ${(0.85 * alpha).toFixed(3)})`);
    focalGrad.addColorStop(1.0, 'rgba(220, 20, 40, 0.0)');
  } else {
    focalGrad.addColorStop(0.45, `rgba(0, 230, 255, ${(0.85 * alpha).toFixed(3)})`);
    focalGrad.addColorStop(1.0, 'rgba(0, 140, 255, 0.0)');
  }
  ctx.fillStyle = focalGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
  ctx.fill();

  // Micro Energy Droplets / Spark Beads near the flare
  const droplets = [
    { dx: cosF * (flareLen * 0.55) + perpFX * 4.5, dy: sinF * (flareLen * 0.55) + perpFY * 4.5, sz: 1.8 },
    { dx: cosF * (flareLen * 0.85) - perpFX * 3.0, dy: sinF * (flareLen * 0.85) - perpFY * 3.0, sz: 1.4 },
    { dx: -cosF * 6 + perpFX * 6.0,                 dy: -sinF * 6 + perpFY * 6.0,                 sz: 1.6 }
  ];
  for (let d = 0; d < droplets.length; d++) {
    const dp = droplets[d];
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.95 * alpha).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(dp.dx, dp.dy, dp.sz, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  ctx.restore();
}

export function drawCeroBeam(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = Math.atan2(vy, vx);
  const lifeRatio = Math.max(0.3, (p.life || 30) / (p.maxLife || 30));

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // Outer red energy column (cero width reads from config, default 80px)
  const beamWidth = 60;
  const beamLength = 400; // Large visual column

  // Outer Crimson Glow
  const grad = ctx.createLinearGradient(0, -beamWidth, 0, beamWidth);
  grad.addColorStop(0, 'rgba(139, 0, 0, 0)');
  grad.addColorStop(0.3, `rgba(255, 10, 10, ${0.8 * lifeRatio})`);
  grad.addColorStop(0.5, `rgba(255, 255, 255, ${0.95 * lifeRatio})`); // white hot core
  grad.addColorStop(0.7, `rgba(255, 10, 10, ${0.8 * lifeRatio})`);
  grad.addColorStop(1.0, 'rgba(139, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(-50, -beamWidth, beamLength + 50, beamWidth * 2);

  // Add round energy sparks/circles on the beam tip
  ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * lifeRatio})`;
  ctx.beginPath();
  ctx.arc(beamLength, 0, beamWidth * 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(220, 10, 10, ${0.75 * lifeRatio})`;
  ctx.beginPath();
  ctx.arc(beamLength, 0, beamWidth * 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawShikaiZangetsu(ctx, x, y, angle, r) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Standalone weapon scale
  const scale = 0.78;
  ctx.scale(scale, scale);

  const handleLen = 42;
  const handleThick = 6.5;
  const hiltX = -handleLen; // -42

  // 1. Draw Trailing White Cloth Ribbons from the Pommel (Slim & Compact 3 Strands)
  ctx.save();

  // Ribbon Strand 3 (Deepest downward loop, weaving behind)
  ctx.fillStyle = '#EAEAEA';
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(hiltX - 1, 1);
  ctx.bezierCurveTo(hiltX - 12, 10, hiltX - 14, 24, hiltX - 2, 27);
  ctx.bezierCurveTo(hiltX + 10, 30, hiltX + 22, 22, hiltX + 38, 20);
  ctx.lineTo(hiltX + 36, 17);
  ctx.bezierCurveTo(hiltX + 22, 19, hiltX + 10, 26, hiltX - 2, 24);
  ctx.bezierCurveTo(hiltX - 10, 22, hiltX - 8, 9, hiltX - 1, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ribbon Strand 2 (Middle strand crossing under Strand 1)
  ctx.fillStyle = '#F5F5F5';
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(hiltX - 1, 1);
  ctx.bezierCurveTo(hiltX - 8, 6, hiltX - 8, 18, hiltX + 2, 20);
  ctx.bezierCurveTo(hiltX + 15, 22, hiltX + 28, 16, hiltX + 46, 23);
  ctx.lineTo(hiltX + 44, 20);
  ctx.bezierCurveTo(hiltX + 28, 13, hiltX + 15, 19, hiltX + 2, 17);
  ctx.bezierCurveTo(hiltX - 5, 15, hiltX - 5, 5, hiltX, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ribbon Strand 1 (Front strand crossing over middle and waving to top tail)
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(hiltX - 1, 1);
  ctx.bezierCurveTo(hiltX - 10, 8, hiltX - 11, 22, hiltX - 1, 24);
  ctx.bezierCurveTo(hiltX + 10, 26, hiltX + 22, 12, hiltX + 38, 13);
  ctx.bezierCurveTo(hiltX + 46, 14, hiltX + 50, 16, hiltX + 54, 13);
  ctx.lineTo(hiltX + 52, 10);
  ctx.bezierCurveTo(hiltX + 48, 12, hiltX + 44, 11, hiltX + 36, 10);
  ctx.bezierCurveTo(hiltX + 22, 9, hiltX + 10, 22, hiltX - 1, 21);
  ctx.bezierCurveTo(hiltX - 8, 19, hiltX - 7, 7, hiltX, 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fabric Pommel Wrap Knot
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(hiltX - 1.5, 0, 2.8, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  // 2. Draw Handle / Hilt (white cloth wrapped directly around hilt, NO handguard/collar!)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(hiltX, -handleThick / 2);
  ctx.lineTo(0, -handleThick / 2);
  ctx.lineTo(0, handleThick / 2);
  ctx.lineTo(hiltX, handleThick / 2);
  ctx.closePath();
  ctx.fill();

  // Fabric wrapping texture lines (white cloth wrapped around hilt)
  ctx.strokeStyle = '#D8D8D8';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  for (let px = hiltX + 4; px < 0; px += 4.5) {
    ctx.moveTo(px, -handleThick / 2);
    ctx.lineTo(px + 2.5, handleThick / 2);
    ctx.moveTo(px + 2.5, -handleThick / 2);
    ctx.lineTo(px, handleThick / 2);
  }
  ctx.stroke();

  // Handle outer outline
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(hiltX, -handleThick / 2, handleLen, handleThick);

  // 3. Blade Geometry
  const tipX = 145, tipY = -12;
  const cutoutR = 7.0;
  const cutoutCenterX = cutoutR, cutoutCenterY = 3.5;
  const heelX = cutoutR * 2, heelY = 22;

  // A) Draw Black Back Spine Region (Upper Portion of the Blade)
  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath();
  ctx.moveTo(0, -3.5);
  ctx.lineTo(tipX, tipY);
  ctx.quadraticCurveTo(75, -2, heelX, cutoutCenterY);
  ctx.arc(cutoutCenterX, cutoutCenterY, cutoutR, 0, Math.PI, true);
  ctx.lineTo(0, 6.0); // Small downward spur under handle
  ctx.lineTo(0, -3.5);
  ctx.closePath();
  ctx.fill();

  // B) Draw Silver Steel Blade Body (Main Lower Region & Cutting Edge)
  const silverGrad = ctx.createLinearGradient(heelX, 0, tipX, 0);
  silverGrad.addColorStop(0, '#E5E5E5');
  silverGrad.addColorStop(0.3, '#FFFFFF');
  silverGrad.addColorStop(0.7, '#ECECEC');
  silverGrad.addColorStop(1, '#D8D8D8');

  ctx.fillStyle = silverGrad;
  ctx.beginPath();
  ctx.moveTo(heelX, heelY);
  ctx.quadraticCurveTo(80, 18, tipX, tipY); // Bottom cutting edge arc
  ctx.quadraticCurveTo(75, -2, heelX, cutoutCenterY); // Seam line separating black spine
  ctx.lineTo(heelX, heelY); // Heel vertical line
  ctx.closePath();
  ctx.fill();

  // C) Draw Outer Outlines & Seam Details
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -3.5);
  ctx.lineTo(tipX, tipY);
  ctx.quadraticCurveTo(80, 18, heelX, heelY);
  ctx.lineTo(heelX, cutoutCenterY);
  ctx.arc(cutoutCenterX, cutoutCenterY, cutoutR, 0, Math.PI, true);
  ctx.lineTo(0, 6.0);
  ctx.lineTo(0, -3.5);
  ctx.closePath();
  ctx.stroke();

  // Seam line separating Black Spine from Silver Steel Body
  ctx.strokeStyle = 'rgba(20, 20, 20, 0.7)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(heelX, cutoutCenterY);
  ctx.quadraticCurveTo(75, -2, tipX, tipY);
  ctx.stroke();

  // Metallic highlight line along silver edge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(heelX + 1, heelY - 2);
  ctx.quadraticCurveTo(80, 16, tipX - 2, tipY + 0.5);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the authentic, high-fidelity Tensa Zangetsu (Fullbring / True Bankai Katana).
 * Features:
 * 1. Pitch-black daito blade with 3 stepped serrated fin notches along the upper spine and razor-polished kissaki tip.
 * 2. Authentic 4-pronged Manji (卍) black handguard with right-angle hooks and edge bevels.
 * 3. Hilt (Tsuka) with vibrant crimson red Samegawa (rayskin) background and black diamond-wrap cutouts (◆ ◆ ◆ ◆ ◆).
 * 4. Iron pommel cap (Kashira) with Sarute ring and dangling 3D linked Kusari black chain.
 */
export function drawTensaZangetsuKatana(ctx, swordStartX, isMask = false, opts = {}) {
  const bladeLen = opts.bladeLen || 94;
  const bladeBaseX = swordStartX + 5;
  const tipX = swordStartX + bladeLen;

  // ── 1. Hilt Handle (Tsuka) with Authentic Red Rayskin & Black Diamond Wrap ──
  const hiltStartX = swordStartX - 32;
  const hiltLen = 32;
  const hiltHalfW = 3.4;

  // 1a. Base Red Rayskin (Samegawa)
  ctx.fillStyle = '#A31313';
  ctx.fillRect(hiltStartX, -hiltHalfW, hiltLen, hiltHalfW * 2);
  
  const sameGrad = ctx.createLinearGradient(hiltStartX, -hiltHalfW, hiltStartX, hiltHalfW);
  sameGrad.addColorStop(0, '#7A0C0C');
  sameGrad.addColorStop(0.5, '#D32020');
  sameGrad.addColorStop(1, '#5C0808');
  ctx.fillStyle = sameGrad;
  ctx.fillRect(hiltStartX, -hiltHalfW + 0.4, hiltLen, (hiltHalfW * 2) - 0.8);

  // 1b. Black Silk Ito Wrap (Top & Bottom Edges)
  ctx.fillStyle = '#0D0D11';
  ctx.fillRect(hiltStartX, -hiltHalfW, hiltLen, 1.1);
  ctx.fillRect(hiltStartX, hiltHalfW - 1.1, hiltLen, 1.1);

  // 1c. Crisp Red Diamond Lozenges (◆ ◆ ◆ ◆ ◆ ◆) along the handle center
  const diamonds = [
    hiltStartX + 3.8,
    hiltStartX + 9.2,
    hiltStartX + 14.6,
    hiltStartX + 20.0,
    hiltStartX + 25.4,
    hiltStartX + 30.0
  ];
  for (let i = 0; i < diamonds.length; i++) {
    const cx = diamonds[i];
    // Black diagonal cross bands flanking the diamond
    ctx.fillStyle = '#0D0D11';
    ctx.beginPath();
    ctx.moveTo(cx - 2.6, -hiltHalfW);
    ctx.lineTo(cx, 0);
    ctx.lineTo(cx - 2.6, hiltHalfW);
    ctx.lineTo(cx - 3.8, hiltHalfW);
    ctx.lineTo(cx - 1.2, 0);
    ctx.lineTo(cx - 3.8, -hiltHalfW);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 2.6, -hiltHalfW);
    ctx.lineTo(cx, 0);
    ctx.lineTo(cx + 2.6, hiltHalfW);
    ctx.lineTo(cx + 3.8, hiltHalfW);
    ctx.lineTo(cx + 1.2, 0);
    ctx.lineTo(cx + 3.8, -hiltHalfW);
    ctx.closePath();
    ctx.fill();

    // Vivid red diamond core
    ctx.fillStyle = '#E61E1E';
    ctx.beginPath();
    ctx.moveTo(cx, -1.8);
    ctx.lineTo(cx + 1.7, 0);
    ctx.lineTo(cx, 1.8);
    ctx.lineTo(cx - 1.7, 0);
    ctx.closePath();
    ctx.fill();

    // Hot scarlet diamond center highlight
    ctx.fillStyle = '#FF5252';
    ctx.beginPath();
    ctx.moveTo(cx, -0.9);
    ctx.lineTo(cx + 0.9, 0);
    ctx.lineTo(cx, 0.9);
    ctx.lineTo(cx - 0.9, 0);
    ctx.closePath();
    ctx.fill();
  }

  // 1d. Handle Border Outlines
  ctx.strokeStyle = '#050508';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(hiltStartX, -hiltHalfW, hiltLen, hiltHalfW * 2);

  // 1e. Pommel Cap (Kashira) & Iron Ring (Sarute)
  ctx.fillStyle = '#08080C';
  ctx.fillRect(hiltStartX - 2.8, -hiltHalfW - 0.3, 3.0, (hiltHalfW * 2) + 0.6);
  ctx.strokeStyle = '#1F1F28';
  ctx.lineWidth = 0.7;
  ctx.strokeRect(hiltStartX - 2.8, -hiltHalfW - 0.3, 3.0, (hiltHalfW * 2) + 0.6);

  // Iron Sarute ring loop at pommel end
  const ringX = hiltStartX - 4.2;
  ctx.beginPath();
  ctx.arc(ringX, 0, 2.2, 0, Math.PI * 2);
  ctx.strokeStyle = '#14141A';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // ── 2. Broken Black Chain (Kusari) with 3D Linked Loops (Natural Hanging Catenary Drape) ──
  if (!opts.skipChain) {
    const ringX = hiltStartX - 4.2;
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const breathe = Math.sin(now * 0.0025) * 1.5;
    
    // Natural hanging catenary drape under gravity with subtle breathing sway
    const chainLinks = [];
    const linkCount = 13;
    for (let i = 0; i < linkCount; i++) {
      const t = i / (linkCount - 1);
      const cx = ringX - t * 30.0;
      const cy = Math.sin(t * Math.PI) * (14.0 + breathe) + t * 4.0;
      const ang = Math.cos(t * Math.PI) * 0.85 - 0.25;
      chainLinks.push({ x: cx, y: cy, ang: ang });
    }

    ctx.save();
    for (let c = 0; c < chainLinks.length; c++) {
      const cl = chainLinks[c];
      ctx.save();
      ctx.translate(cl.x, cl.y);
      ctx.rotate(cl.ang);

      // Chain link outer loop
      const isOdd = (c % 2 === 1);
      const linkRx = 2.7;
      const linkRy = isOdd ? 1.0 : 1.6;

      ctx.beginPath();
      ctx.ellipse(0, 0, linkRx, linkRy, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isMask ? '#5A1212' : '#0D0D12';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // Specular metallic gleam
      ctx.beginPath();
      ctx.ellipse(-0.3, -0.3, linkRx * 0.65, linkRy * 0.5, 0, -Math.PI * 0.75, -Math.PI * 0.15);
      ctx.strokeStyle = isMask ? 'rgba(255, 60, 0, 0.65)' : 'rgba(135, 140, 165, 0.55)';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  }

  // ── 3. Blade Collar (Habaki) ──
  ctx.fillStyle = '#16161D';
  ctx.fillRect(swordStartX - 0.5, -3.5, 5.8, 7.0);
  ctx.strokeStyle = '#2B2B38';
  ctx.lineWidth = 0.7;
  ctx.strokeRect(swordStartX - 0.5, -3.5, 5.8, 7.0);

  // ── 4. Slender Pitch-Black Katana Blade with 3 Serrated Fin Steps ──
  const fin1StartX = swordStartX + 52;
  const fin2StartX = swordStartX + 66;
  const fin3StartX = swordStartX + 80;

  // 4a. Blade Silhouette Path (with the 3 stepped fins on the spine — +Y side)
  ctx.beginPath();
  // Cutting edge (smooth top edge at -Y)
  ctx.moveTo(bladeBaseX, -3.2);
  ctx.quadraticCurveTo(swordStartX + 72, -3.0, tipX, 0.1); // Needle sharp kissaki tip

  // Spine edge with 3 stepped fins (+Y side, trailing below)
  ctx.quadraticCurveTo(swordStartX + 87, 3.6, fin3StartX + 1.8, 5.8);

  // Fin 3 (nearest tip)
  ctx.lineTo(fin2StartX + 12.2, 2.8);
  ctx.lineTo(fin2StartX + 10.5, 4.8);
  ctx.lineTo(fin2StartX + 1.8, 5.6);

  // Fin 2
  ctx.lineTo(fin1StartX + 12.2, 3.1);
  ctx.lineTo(fin1StartX + 10.5, 4.8);
  ctx.lineTo(fin1StartX + 1.8, 5.4);

  // Fin 1 (nearest guard)
  ctx.lineTo(fin1StartX, 3.2);
  ctx.lineTo(bladeBaseX, 3.2);
  ctx.closePath();

  // 4b. Dark Obsidian Blade Body Fill
  const bladeGrad = ctx.createLinearGradient(bladeBaseX, -3.2, bladeBaseX, 5.8);
  bladeGrad.addColorStop(0, '#0C0C10');
  bladeGrad.addColorStop(0.42, '#14141A');
  bladeGrad.addColorStop(0.45, '#1A1A22');
  bladeGrad.addColorStop(0.85, '#22222E');
  bladeGrad.addColorStop(1, '#111116');
  ctx.fillStyle = bladeGrad;
  ctx.fill();

  // 4c. Shinogi Ridge Line (Katana bevel separation line)
  ctx.beginPath();
  ctx.moveTo(bladeBaseX, 0.4);
  ctx.lineTo(swordStartX + 72, 0.4);
  ctx.quadraticCurveTo(swordStartX + 84, 0.7, tipX - 2.0, 0.0);
  ctx.strokeStyle = 'rgba(75, 80, 100, 0.50)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 4d. Razor Cutting Edge Polished Steel Highlight (now on -Y / top)
  ctx.beginPath();
  ctx.moveTo(bladeBaseX, -2.8);
  ctx.quadraticCurveTo(swordStartX + 72, -2.6, tipX, 0.1);
  ctx.strokeStyle = isMask ? 'rgba(255, 60, 0, 0.90)' : 'rgba(200, 215, 235, 0.75)';
  ctx.lineWidth = isMask ? 1.2 : 0.95;
  ctx.stroke();

  // 4e. Fin Step Accent Highlights (Metallic highlights on the 3 stepped notches, now on +Y)
  ctx.beginPath();
  // Fin 1 edge
  ctx.moveTo(fin1StartX, 3.2);
  ctx.lineTo(fin1StartX + 1.8, 5.4);
  ctx.lineTo(fin1StartX + 10.5, 4.8);
  // Fin 2 edge
  ctx.moveTo(fin2StartX, 3.1);
  ctx.lineTo(fin2StartX + 1.8, 5.6);
  ctx.lineTo(fin2StartX + 10.5, 4.8);
  // Fin 3 edge
  ctx.moveTo(fin3StartX, 2.8);
  ctx.lineTo(fin3StartX + 1.8, 5.8);
  ctx.quadraticCurveTo(swordStartX + 87, 3.6, tipX, 0.1);
  ctx.strokeStyle = isMask ? 'rgba(255, 90, 20, 0.80)' : 'rgba(130, 140, 170, 0.65)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 4f. Crisp Outer Silhouette Outline
  ctx.beginPath();
  // Cutting edge (-Y)
  ctx.moveTo(bladeBaseX, -3.2);
  ctx.quadraticCurveTo(swordStartX + 72, -3.0, tipX, 0.1);
  // Spine edge with fins (+Y)
  ctx.quadraticCurveTo(swordStartX + 87, 3.6, fin3StartX + 1.8, 5.8);
  ctx.lineTo(fin2StartX + 12.2, 2.8);
  ctx.lineTo(fin2StartX + 10.5, 4.8);
  ctx.lineTo(fin2StartX + 1.8, 5.6);
  ctx.lineTo(fin1StartX + 12.2, 3.1);
  ctx.lineTo(fin1StartX + 10.5, 4.8);
  ctx.lineTo(fin1StartX + 1.8, 5.4);
  ctx.lineTo(fin1StartX, 3.2);
  ctx.lineTo(bladeBaseX, 3.2);
  ctx.closePath();
  ctx.strokeStyle = '#050508';
  ctx.lineWidth = 0.95;
  ctx.stroke();

  // ── 5. Handguard / Tsuba (Authentic 4-Pronged Manji 卍) ──
  ctx.fillStyle = '#08080C';
  ctx.strokeStyle = '#1F1F2A';
  ctx.lineWidth = 0.8;

  // Center hub
  ctx.fillRect(swordStartX - 2.8, -4.8, 5.6, 9.6);

  // Top Arm (-Y) with right-hook (+X)
  ctx.fillRect(swordStartX - 2.0, -12.8, 4.0, 8.5);
  ctx.fillRect(swordStartX + 1.5, -12.8, 6.2, 4.0);

  // Bottom Arm (+Y) with left-hook (-X)
  ctx.fillRect(swordStartX - 2.0, 4.3, 4.0, 8.5);
  ctx.fillRect(swordStartX - 7.7, 8.8, 6.2, 4.0);

  // Front/Right Arm (+X) with down-hook (+Y)
  ctx.fillRect(swordStartX + 2.8, -2.0, 7.5, 4.0);
  ctx.fillRect(swordStartX + 6.3, 1.5, 4.0, 6.0);

  // Back/Left Arm (-X) with up-hook (-Y)
  ctx.fillRect(swordStartX - 10.3, -2.0, 7.5, 4.0);
  ctx.fillRect(swordStartX - 10.3, -7.5, 4.0, 6.0);

  // Manji Outline & Edge Bevels
  ctx.beginPath();
  ctx.moveTo(swordStartX - 2.0, -4.8);
  ctx.lineTo(swordStartX - 2.0, -12.8);
  ctx.lineTo(swordStartX + 7.7, -12.8);
  ctx.lineTo(swordStartX + 7.7, -8.8);
  ctx.lineTo(swordStartX + 2.0, -8.8);
  ctx.lineTo(swordStartX + 2.0, -2.0);
  ctx.lineTo(swordStartX + 10.3, -2.0);
  ctx.lineTo(swordStartX + 10.3, 7.5);
  ctx.lineTo(swordStartX + 6.3, 7.5);
  ctx.lineTo(swordStartX + 6.3, 2.0);
  ctx.lineTo(swordStartX + 2.0, 2.0);
  ctx.lineTo(swordStartX + 2.0, 12.8);
  ctx.lineTo(swordStartX - 7.7, 12.8);
  ctx.lineTo(swordStartX - 7.7, 8.8);
  ctx.lineTo(swordStartX - 2.0, 8.8);
  ctx.lineTo(swordStartX - 2.0, 2.0);
  ctx.lineTo(swordStartX - 10.3, 2.0);
  ctx.lineTo(swordStartX - 10.3, -7.5);
  ctx.lineTo(swordStartX - 6.3, -7.5);
  ctx.lineTo(swordStartX - 6.3, -2.0);
  ctx.lineTo(swordStartX - 2.0, -2.0);
  ctx.closePath();
  ctx.stroke();
}

/**
 * Draws a visible, atmospheric Kuroi Reiatsu smoke aura emitting from Tensa Zangetsu during Bankai.
 * Dark smoke wisps with glowing crimson inner embers curl off the blade spine,
 * creating a menacing living weapon feel clearly visible during arena combat.
 */
export function drawBankaiSwordOrbitingAura(ctx, swordStartX, swordLen = 94, isMask = false, isFrozen = false) {
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const time = isFrozen ? 0 : (now * 0.001);
  const bladeBaseX = swordStartX + 5;
  const actualBladeLen = swordLen - 8;

  ctx.save();

  // ── 1. Rising Smoke Wisps (Bold atmospheric smoke plumes drifting off blade spine) ──
  const smokeCount = 14;
  for (let i = 0; i < smokeCount; i++) {
    const seed = (i * 137.508) % 1.0;
    const speed = 0.22 + seed * 0.16;
    const lifeT = ((time * speed + seed * 6.28) % 2.8) / 2.8;

    const bladeT = (seed + lifeT * 0.06) % 1.0;
    const baseX = bladeBaseX + bladeT * actualBladeLen;
    const wander = Math.sin(time * 1.0 + i * 2.3) * 5.0 * lifeT;

    // Rise from spine (+Y) with turbulent curl
    const riseY = 4.5 + lifeT * 18.0 * (0.7 + 0.3 * seed);
    const curlX = Math.sin(time * 0.7 + i * 1.7 + lifeT * 3.5) * 6.0 * lifeT;

    const px = baseX + curlX + wander * 0.3;
    const py = riseY + Math.cos(time * 1.3 + i) * 2.0 * lifeT;

    // Smoke lifecycle
    const fadeIn = Math.min(1.0, lifeT * 4.0);
    const fadeOut = Math.max(0.0, 1.0 - Math.pow(lifeT, 1.6));
    const alpha = fadeIn * fadeOut * (isMask ? 0.72 : 0.62);
    if (alpha <= 0.03) continue;

    // Smoke grows larger as it drifts (small near blade → large as it dissipates)
    const size = (3.0 + lifeT * 9.0) * (0.75 + seed * 0.5);

    ctx.globalAlpha = alpha;

    // Outer dark smoke body
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = isMask
      ? 'rgba(50, 6, 0, 0.72)'
      : 'rgba(12, 6, 18, 0.68)';
    ctx.fill();

    // Crimson mid-ring glow (visible colored halo around each wisp)
    if (lifeT < 0.75) {
      const ringAlpha = (1.0 - lifeT / 0.75) * 0.45;
      ctx.beginPath();
      ctx.arc(px, py, size * 0.72, 0, Math.PI * 2);
      ctx.fillStyle = isMask
        ? `rgba(255, 50, 0, ${ringAlpha.toFixed(3)})`
        : `rgba(200, 25, 50, ${ringAlpha.toFixed(3)})`;
      ctx.globalAlpha = alpha * ringAlpha;
      ctx.fill();
    }

    // Hot ember core center
    if (lifeT < 0.55) {
      const coreAlpha = (1.0 - lifeT / 0.55) * 0.80;
      ctx.beginPath();
      ctx.arc(px, py, size * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = isMask
        ? `rgba(255, 80, 10, ${coreAlpha.toFixed(3)})`
        : `rgba(220, 40, 55, ${coreAlpha.toFixed(3)})`;
      ctx.globalAlpha = alpha * coreAlpha;
      ctx.fill();
    }
  }

  // ── 2. Blade-Hugging Haze (Dark mist clinging to the blade surface) ──
  const hazeSteps = 8;
  for (let h = 0; h < hazeSteps; h++) {
    const ht = (h + 0.5) / hazeSteps;
    const hx = bladeBaseX + ht * actualBladeLen;
    const breathe = Math.sin(time * 1.6 + h * 1.1) * 2.0;

    ctx.save();
    ctx.translate(hx, breathe * 0.3);

    const hazeW = 8.0 + Math.sin(time * 0.9 + h * 2.0) * 3.5;
    const hazeH = 3.5 + Math.sin(time * 1.4 + h * 1.5) * 1.5;
    const hazeAlpha = 0.28 + 0.14 * Math.sin(time * 1.1 + h * 0.8);

    ctx.beginPath();
    ctx.ellipse(0, 3.5 + breathe, hazeW, hazeH, 0, 0, Math.PI * 2);
    ctx.fillStyle = isMask
      ? `rgba(70, 10, 0, ${hazeAlpha.toFixed(3)})`
      : `rgba(20, 8, 28, ${hazeAlpha.toFixed(3)})`;
    ctx.globalAlpha = hazeAlpha;
    ctx.fill();

    ctx.restore();
  }

  // ── 3. Ember Sparks (Hot sparks popping off the smoke) ──
  const sparkCount = 6;
  for (let s = 0; s < sparkCount; s++) {
    const st = ((time * 0.55 + s * 1.05) % 2.0) / 2.0;
    const sx = bladeBaseX + ((s * 0.18 + st * 0.04) % 1.0) * actualBladeLen;
    const sy = 4.0 + st * 12.0 + Math.sin(time * 2.8 + s * 2.5) * 2.5;
    const sparkAlpha = Math.sin(st * Math.PI) * 0.85;

    if (sparkAlpha <= 0.05) continue;

    ctx.beginPath();
    ctx.arc(sx + Math.sin(time * 1.8 + s) * 4.0, sy, 1.2 + (1 - st) * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = isMask ? '#FF7040' : '#E62040';
    ctx.globalAlpha = sparkAlpha;
    ctx.fill();
  }

  ctx.restore();
}

export function drawTensaZangetsu(ctx, x, y, angle, r, opts = {}) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const scale = opts.scale || 1.15;
  ctx.scale(scale, scale);

  const swordStartX = r * 0.7;
  drawTensaZangetsuKatana(ctx, swordStartX, Boolean(opts.isMask), opts);

  if (opts.showAura !== false) {
    drawBankaiSwordOrbitingAura(ctx, swordStartX, opts.bladeLen || 94, Boolean(opts.isMask), false);
  }

  ctx.restore();
}

/**
 * Draws Ichigo's signature Crescent Blade Slash Arc (Rule 15 Compliant).
 * Renders in world coordinates underneath/around the blade during active basic chops.
 * Form-specific palettes:
 *  - Shikai: Silver steel with sky-blue/cyan Reiatsu glow
 *  - Bankai: Deep Getsuga black void core with electric cyan Reiatsu edge
 *  - Hollow Mask: Black void core with flaming crimson/orange edge
 *  - Vasto Lorde: Demonic pitch-black core with blazing blood-red trim
 */
export function drawIchigoSlashArc(ctx, fighter) {
  if (!fighter || fighter.slashSwingTimer <= 0 || fighter.isGetsugaSlash || fighter.isChannelingGetsuga || fighter.isChannelingBankai || fighter.isFrozenByInfinity || (fighter.timeStopTimer && fighter.timeStopTimer > 0) || (fighter.statusEffects && fighter.statusEffects.timeStopTimer > 0)) return;

  const maxT = fighter.slashSwingMaxTimer || 22;
  const rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.slashSwingTimer / maxT)));

  const r = fighter.r || 25;
  const baseAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  const facingLeft = Math.abs(baseAngle) > Math.PI / 2;

  const isMask = Boolean(fighter.hollowMaskActive);
  const isBankai = Boolean(fighter.bankaiActive || fighter.skin === 'bankai');
  const isShikai = !isBankai;

  // Arc angles matching the exact sword rotation span (top-to-bottom downward power chop)
  const startOffset = -1.35; // ~ -77 degrees (upper-left chamber)
  const endOffset = 1.20;   // ~ +69 degrees (lower-right follow-through)

  let currentTipOffset = startOffset;
  let currentTailOffset = startOffset;
  let trailAlpha = 1.0;

  const windupCutoff = 0.10;
  const cutCutoff = 0.55;

  if (rawProgress < windupCutoff) {
    // Brief windup anticipation (trail hidden)
    return;
  } else if (rawProgress < cutCutoff) {
    // Active Cutting Phase: crescent expands with buttery cubic Hermite ease
    const t = (rawProgress - windupCutoff) / (cutCutoff - windupCutoff);
    const eased = t * t * (3 - 2 * t);
    currentTipOffset = startOffset + eased * (endOffset - startOffset);
    currentTailOffset = startOffset;
    trailAlpha = Math.sin(Math.min(1.0, t * 1.5) * (Math.PI / 2));
  } else {
    // Recovery Phase: Tip stays locked at final follow-through angle while tail cleanly erases
    const recP = (rawProgress - cutCutoff) / (1.0 - cutCutoff);
    const easedRec = 0.5 + 0.5 * Math.cos(recP * Math.PI);
    currentTipOffset = endOffset;
    currentTailOffset = endOffset - (endOffset - startOffset) * easedRec;
    trailAlpha = Math.sin((1.0 - recP) * (Math.PI / 2));
  }

  if (trailAlpha <= 0.01 || Math.abs(currentTipOffset - currentTailOffset) < 0.04) return;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.rotate(baseAngle);

  // Mirror vertically when aiming left so swing remains top-to-bottom
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  const outerRadius = r + (isMask ? 76 : (isShikai ? 80 : 70));
  const maxThick = isMask ? 25.0 : (isShikai ? 27.0 : 23.0);
  const numSteps = 32;

  // 1. Pass 1: Spiritual Pressure / Reiatsu Outer Soft Glow Bloom
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.12) * (0.26 + 0.74 * t);
    const rad = outerRadius + taper * 5.5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = numSteps; i >= 0; i--) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.12) * (0.26 + 0.74 * t);
    const rad = outerRadius - (maxThick * taper) - taper * 4.5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    ctx.lineTo(px, py);
  }
  ctx.closePath();

  if (isMask && isBankai) {
    ctx.fillStyle = `rgba(255, 20, 50, ${0.60 * trailAlpha})`;
  } else if (isMask) {
    ctx.fillStyle = `rgba(255, 40, 20, ${0.52 * trailAlpha})`;
  } else if (isBankai) {
    ctx.fillStyle = `rgba(220, 20, 30, ${0.52 * trailAlpha})`;
  } else {
    ctx.fillStyle = `rgba(0, 191, 255, ${0.45 * trailAlpha})`;
  }
  ctx.fill();

  // 2. Pass 2: High-Density Core Blade Crescent Polygon
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.12) * (0.26 + 0.74 * t);
    const rad = outerRadius + taper * 1.5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = numSteps; i >= 0; i--) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.12) * (0.26 + 0.74 * t);
    const rad = outerRadius - (maxThick * taper);
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    ctx.lineTo(px, py);
  }
  ctx.closePath();

  if (isMask && isBankai) {
    ctx.fillStyle = `rgba(8, 0, 3, ${0.98 * trailAlpha})`;
  } else if (isMask) {
    ctx.fillStyle = `rgba(18, 5, 5, ${0.95 * trailAlpha})`;
  } else if (isBankai) {
    ctx.fillStyle = `rgba(8, 2, 4, ${0.98 * trailAlpha})`;
  } else {
    ctx.fillStyle = `rgba(242, 246, 255, ${0.96 * trailAlpha})`;
  }
  ctx.fill();

  // 3. Pass 3: Brilliant Cutting Edge Highlight Line
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.12) * (0.26 + 0.74 * t);
    const rad = outerRadius - (maxThick * taper * 0.15);
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  if (isMask && isBankai) {
    ctx.strokeStyle = `rgba(255, 40, 30, ${0.98 * trailAlpha})`;
    ctx.lineWidth = 2.2;
  } else if (isMask) {
    ctx.strokeStyle = `rgba(255, 120, 0, ${0.88 * trailAlpha})`;
    ctx.lineWidth = 2.0;
  } else if (isBankai) {
    ctx.strokeStyle = `rgba(255, 30, 20, ${0.95 * trailAlpha})`;
    ctx.lineWidth = 2.0;
  } else {
    ctx.strokeStyle = `rgba(255, 255, 255, ${1.0 * trailAlpha})`;
    ctx.lineWidth = 2.0;
  }
  ctx.stroke();

  // 4. Pass 4: Dynamic Reiatsu Speed Needles flying from cutting tip
  if (rawProgress >= 0.15 && rawProgress <= 0.50) {
    const sparkT = (rawProgress - 0.15) / 0.35;
    const tipAngle = currentTipOffset;
    const sparkCount = 3;
    ctx.save();
    for (let s = 0; s < sparkCount; s++) {
      const spOffset = (s - 1) * 0.08;
      const spAng = tipAngle + spOffset;
      const spDist = outerRadius + 4 + (s * 3);
      const spLen = 12 + (1 - sparkT) * 10;
      
      const spX1 = Math.cos(spAng) * spDist;
      const spY1 = Math.sin(spAng) * spDist;
      const spX2 = spX1 + Math.cos(spAng + 0.4) * spLen;
      const spY2 = spY1 + Math.sin(spAng + 0.4) * spLen;

      ctx.beginPath();
      ctx.moveTo(spX1, spY1);
      ctx.lineTo(spX2, spY2);

      if (isMask && isBankai) ctx.strokeStyle = (s % 2 === 0) ? `rgba(255, 40, 30, ${0.92 * trailAlpha})` : `rgba(255, 255, 255, ${0.95 * trailAlpha})`;
      else if (isMask) ctx.strokeStyle = `rgba(255, 160, 20, ${0.85 * trailAlpha})`;
      else if (isBankai) ctx.strokeStyle = (s % 2 === 0) ? `rgba(255, 30, 20, ${0.90 * trailAlpha})` : `rgba(255, 240, 240, ${0.95 * trailAlpha})`;
      else ctx.strokeStyle = (s % 2 === 0) ? `rgba(0, 229, 255, ${0.85 * trailAlpha})` : `rgba(255, 255, 255, ${0.90 * trailAlpha})`;

      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

