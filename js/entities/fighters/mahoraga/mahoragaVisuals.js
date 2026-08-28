// ─────────────────────────────────────────────
// MAHORAGA VISUALS MODULE
// Draw method, sakuga impact frames, cursed purple flames,
// afterimage rendering, and HUD ring overlays
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { drawMahoraga3DWheel, drawMahoragaSword, drawMahoragaLeftPunch } from '../../../graphics/weapons/mahoragaWeaponGraphics.js';
import { drawMahoragaFaceWings, drawMahoragaChestNecklace, drawMahoragaSkin, drawMahoragaPixelBody } from '../../../graphics/fighters/mahoragaSkin.js';
import { fastCleanArray } from '../../../graphics/particles/visualTrailSystem.js';
import { isChampionScreenActive, state } from '../../../core/state.js';

/**
 * Draw Sakuga Anime Impact Frame (anime speed lines + multi-strike phantom flurry + ink-brush burst)
 */
export function drawSakugaImpactFrame(ctx, fighter) {
  const t = fighter.sakugaImpactTimer / fighter.sakugaImpactMaxTimer;
  const alpha = Math.max(0, t);
  const scale = 1.0 + (1.0 - t) * 0.6;
  const P = 2.4; // Pixel art grid scale

  ctx.save();
  ctx.translate(fighter.sakugaImpactX, fighter.sakugaImpactY);
  ctx.rotate(fighter.sakugaImpactAngle);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  const seed = fighter.sakugaImpactSeed || 0.5;

  // 1. PIXEL-ART ACTION SPEED LINES
  const numRays = 16;
  for (let r = 0; r < numRays; r++) {
    const rayAngle = (r / numRays) * Math.PI * 2 + seed * 1.5;
    const innerRadius = 15 + seed * 10;
    const outerRadius = innerRadius + 45 + (r % 3 === 0 ? 35 : 15);
    const col = (r % 3 === 0) ? '#FFFFFF' : ((r % 2 === 0) ? '#FFD700' : '#111114');

    const cosA = Math.cos(rayAngle);
    const sinA = Math.sin(rayAngle);
    const steps = Math.max(2, Math.round((outerRadius - innerRadius) / P));
    ctx.fillStyle = col;
    for (let s = 0; s <= steps; s++) {
      const dist = innerRadius + (outerRadius - innerRadius) * (s / steps);
      const px = Math.round((cosA * dist) / P) * P;
      const py = Math.round((sinA * dist) / P) * P;
      ctx.fillRect(px, py, P, P);
    }
  }

  // 2. PIXEL-ART PHANTOM MULTI-STRIKE FLURRY ARCS
  const numPhantomHits = 5;
  for (let p = 0; p < numPhantomHits; p++) {
    const pAngle = (p / numPhantomHits) * Math.PI * 2 + seed * 3.0;
    const pDist = 25 + Math.sin(p * 1.7) * 12;
    const px = Math.cos(pAngle) * pDist;
    const py = Math.sin(pAngle) * pDist;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(pAngle + Math.PI / 2);

    const hitSteps = 10;
    const arcR = 14;
    for (let i = 0; i <= hitSteps; i++) {
      const a = -Math.PI * 0.6 + (Math.PI * 1.2) * (i / hitSteps);
      const hx = Math.round((Math.cos(a) * arcR) / P) * P;
      const hy = Math.round((Math.sin(a) * arcR) / P) * P;
      ctx.fillStyle = (p % 2 === 0) ? '#FFD700' : '#FFFFFF';
      ctx.fillRect(hx, hy, P, P);
    }

    // White strike spine line
    for (let x = -18; x <= 18; x += P) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(Math.round(x / P) * P, 0, P, P);
    }
    ctx.restore();
  }

  // 3. PIXEL-ART CONCENTRIC IMPACT SHOCK RING
  const ringRadius = 35 * (1.0 + (1.0 - t) * 0.4);
  const ringSteps = Math.max(16, Math.round((Math.PI * 2 * ringRadius) / P));
  for (let i = 0; i <= ringSteps; i++) {
    const ang = (i / ringSteps) * Math.PI * 2;
    const rx = Math.round((Math.cos(ang) * ringRadius) / P) * P;
    const ry = Math.round((Math.sin(ang) * ringRadius) / P) * P;
    ctx.fillStyle = (i % 2 === 0) ? '#FFD700' : '#FFFFFF';
    ctx.fillRect(rx, ry, P, P);
  }

  ctx.restore();
}

/**
 * Draw Dynamic Orbiting Cursed Purple Flame Particles & Embers
 */
export function drawCursedPurpleFlames(ctx, fighter) {
  if (!fighter._flameParticles) {
    fighter._flameParticles = [];
  }

  const particles = fighter._flameParticles;
  const now = Date.now();
  const time = now * 0.0015;

  const spawnRate = 2;
  for (let s = 0; s < spawnRate; s++) {
    const angle = Math.random() * Math.PI * 2;
    const orbitR = fighter.r * (0.75 + Math.random() * 0.4);
    const startX = fighter.x + Math.cos(angle) * orbitR;
    const startY = fighter.y + Math.sin(angle) * orbitR * 0.6 + (Math.random() - 0.5) * 10;

    particles.push({
      x: startX,
      y: startY,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.4 - Math.random() * 0.6,
      size: 3 + Math.random() * 4,
      maxSize: 3 + Math.random() * 4,
      life: 1.0,
      decay: 0.012 + Math.random() * 0.015,
      rot: (Math.random() - 0.5) * 0.5,
      vRot: (Math.random() - 0.5) * 0.05,
      isEmber: Math.random() < 0.3
    });
  }

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx + Math.sin(time * 2 + i) * 0.3;
    p.y += p.vy;
    p.rot += p.vRot;
    p.life -= p.decay;

    p.size = p.maxSize * Math.max(0, p.life);

    if (p.life <= 0 || p.size <= 0.4) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.isEmber) {
      ctx.fillStyle = `rgba(243, 232, 255, ${p.life * 0.9})`;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.8, p.size * 0.4), 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    } else {
      const sz = p.size;
      const alpha = Math.min(1.0, p.life * 1.2);

      ctx.beginPath();
      ctx.moveTo(0, sz * 0.9);
      ctx.quadraticCurveTo(-sz * 0.85, 0, 0, -sz * 1.4);
      ctx.quadraticCurveTo(sz * 0.85, 0, 0, sz * 0.9);
      ctx.closePath();

      const flameGrad = ctx.createLinearGradient(0, sz * 0.9, 0, -sz * 1.4);
      flameGrad.addColorStop(0, `rgba(123, 44, 191, ${alpha * 0.95})`);
      flameGrad.addColorStop(0.5, `rgba(157, 78, 221, ${alpha * 0.90})`);
      flameGrad.addColorStop(1, `rgba(224, 170, 255, ${alpha * 0.70})`);
      ctx.fillStyle = flameGrad;
      ctx.fill();

      // No shadowBlur
      ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.95})`;
      ctx.lineWidth = 0.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      const coreSz = sz * 0.4;
      ctx.beginPath();
      ctx.moveTo(0, coreSz * 0.8);
      ctx.quadraticCurveTo(-coreSz * 0.7, 0, 0, -coreSz * 1.3);
      ctx.quadraticCurveTo(coreSz * 0.7, 0, 0, coreSz * 0.8);
      ctx.closePath();

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Render fading divine flash-dash afterimage ghosts along motion trail.
 */
export function drawAfterimages(ctx, fighter) {
  if (!fighter.adaptationAfterimages || fighter.adaptationAfterimages.length === 0) return;

  fastCleanArray(fighter.adaptationAfterimages, (img) => {
    if (!img || img.timer <= 0) return false;

    const maxT = img.maxTimer || 28;
    const progress = Math.max(0, Math.min(1, img.timer / maxT));
    const baseOpacity = (typeof CONFIG !== 'undefined' && CONFIG.mahoraga) ? (CONFIG.mahoraga.afterimageOpacity ?? 0.50) : 0.50;
    const alpha = Math.pow(progress, 0.7) * baseOpacity;

    // 1. Dash Trajectory Motion Beam Line
    if (img.fromX !== undefined && img.toX !== undefined) {
      ctx.save();
      ctx.globalAlpha = alpha * 0.5;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 5.0;
      ctx.beginPath();
      ctx.moveTo(img.fromX, img.fromY);
      ctx.lineTo(img.toX, img.toY);
      ctx.stroke();

      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(img.fromX, img.fromY);
      ctx.lineTo(img.toX, img.toY);
      ctx.stroke();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(img.fromX, img.fromY);
      ctx.lineTo(img.toX, img.toY);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(img.x, img.y);
    ctx.rotate(img.gunAngle || 0);

    // 2. DARK GROUND DROP SHADOW
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, fighter.r * 0.75, fighter.r * 1.2, fighter.r * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.4})`;
    ctx.fill();
    ctx.restore();

    // 3. Divine Aura Energy Glow Circles
    ctx.beginPath();
    ctx.arc(0, 0, fighter.r * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(30, 41, 59, ${alpha * 0.25})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, fighter.r * 1.0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(224, 232, 255, ${alpha * 0.45})`;
    ctx.fill();

    // 4. HIGH-CONTRAST BODY SILHOUETTE
    ctx.beginPath();
    ctx.arc(0, 0, fighter.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(15, 23, 42, ${alpha * 0.50})`;
    ctx.fill();

    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.55})`;
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.70})`;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 5. 3D WHEEL SILHOUETTE
    ctx.beginPath();
    ctx.ellipse(0, -fighter.r - 20, 16, 6, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.55})`;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.75})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.restore();

    img.timer--;
    return img.timer > 0;
  });
}

/**
 * Renders the 3-second Gamma Ray Rainbow Prismatic Aura underlay behind Mahoraga's body.
 * Triggered on every Eight-Handled Sword Wheel click.
 */
export function drawMahoragaGammaRayRainbowUnderlay(ctx, fighter) {
  if (!fighter || !fighter.gammaRayRainbowTimer || fighter.gammaRayRainbowTimer <= 0) return;

  const timer = fighter.gammaRayRainbowTimer;
  const maxTimer = fighter.gammaRayRainbowMax || 180;
  const alpha = Math.min(1.0, timer / 25.0);

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const time = now * 0.001;
  const r = fighter.r || 25;

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // Organic random multi-harmonic wandering focal vectors (non-spinning, chaotic drift)
  const pulse = 1.0 + 0.09 * (Math.sin(time * 6.3) * 0.5 + Math.cos(time * 11.2) * 0.5);
  const auraR = r * 1.20 * pulse;

  const fx1 = (Math.sin(time * 2.7) * 0.6 + Math.cos(time * 5.3) * 0.4) * (r * 0.75);
  const fy1 = (Math.cos(time * 3.1) * 0.6 + Math.sin(time * 6.7) * 0.4) * (r * 0.75);
  const fx2 = (Math.sin(time * 3.9 + 1.7) * 0.6 + Math.cos(time * 7.8) * 0.4) * (r * 0.85);
  const fy2 = (Math.cos(time * 2.5 + 2.1) * 0.6 + Math.sin(time * 8.4) * 0.4) * (r * 0.85);

  const auraGrad = ctx.createLinearGradient(fx1, fy1, fx2, fy2);
  const s1 = Math.max(0.05, Math.min(0.28, 0.18 + Math.sin(time * 3.3) * 0.06));
  const s2 = Math.max(0.30, Math.min(0.50, 0.38 + Math.cos(time * 2.9) * 0.06));
  const s3 = Math.max(0.52, Math.min(0.72, 0.58 + Math.sin(time * 4.1) * 0.06));
  const s4 = Math.max(0.74, Math.min(0.92, 0.78 + Math.cos(time * 3.7) * 0.06));

  auraGrad.addColorStop(0.00, `rgba(255, 0, 85, ${(0.45 * alpha).toFixed(3)})`);
  auraGrad.addColorStop(s1, `rgba(255, 120, 0, ${(0.45 * alpha).toFixed(3)})`);
  auraGrad.addColorStop(s2, `rgba(255, 230, 0, ${(0.45 * alpha).toFixed(3)})`);
  auraGrad.addColorStop(s3, `rgba(0, 255, 120, ${(0.45 * alpha).toFixed(3)})`);
  auraGrad.addColorStop(s4, `rgba(0, 220, 255, ${(0.45 * alpha).toFixed(3)})`);
  auraGrad.addColorStop(1.00, `rgba(180, 0, 255, ${(0.45 * alpha).toFixed(3)})`);

  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fillStyle = auraGrad;
  ctx.fill();

  ctx.restore();
}

/**
 * Renders the 3-second Gamma Ray Rainbow Prismatic Sheen overlay across Mahoraga's body.
 */
export function drawMahoragaGammaRayRainbowOverlay(ctx, fighter) {
  if (!fighter || !fighter.gammaRayRainbowTimer || fighter.gammaRayRainbowTimer <= 0) return;

  const timer = fighter.gammaRayRainbowTimer;
  const maxTimer = fighter.gammaRayRainbowMax || 180;
  const alpha = Math.min(1.0, timer / 25.0);

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const time = now * 0.001;
  const r = fighter.r || 25;

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // Organic random multi-frequency shimmer over the body (no circular spin)
  const gx1 = (Math.cos(time * 3.5) * 0.6 + Math.sin(time * 7.1) * 0.4) * (r * 0.8);
  const gy1 = (Math.sin(time * 4.2) * 0.6 + Math.cos(time * 6.5) * 0.4) * (r * 0.8);
  const gx2 = (Math.sin(time * 3.1 + 2.4) * 0.6 + Math.cos(time * 8.7) * 0.4) * (r * 0.8);
  const gy2 = (Math.cos(time * 3.8 + 1.2) * 0.6 + Math.sin(time * 5.9) * 0.4) * (r * 0.8);

  const rainbowGrad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
  const os1 = Math.max(0.05, Math.min(0.28, 0.18 + Math.cos(time * 3.7) * 0.06));
  const os2 = Math.max(0.30, Math.min(0.50, 0.38 + Math.sin(time * 2.5) * 0.06));
  const os3 = Math.max(0.52, Math.min(0.72, 0.58 + Math.cos(time * 4.3) * 0.06));
  const os4 = Math.max(0.74, Math.min(0.92, 0.78 + Math.sin(time * 3.1) * 0.06));

  rainbowGrad.addColorStop(0.00, `rgba(255, 0, 85, ${(0.38 * alpha).toFixed(3)})`);
  rainbowGrad.addColorStop(os1, `rgba(255, 120, 0, ${(0.42 * alpha).toFixed(3)})`);
  rainbowGrad.addColorStop(os2, `rgba(255, 230, 0, ${(0.42 * alpha).toFixed(3)})`);
  rainbowGrad.addColorStop(os3, `rgba(0, 255, 120, ${(0.42 * alpha).toFixed(3)})`);
  rainbowGrad.addColorStop(os4, `rgba(0, 220, 255, ${(0.42 * alpha).toFixed(3)})`);
  rainbowGrad.addColorStop(1.00, `rgba(180, 0, 255, ${(0.38 * alpha).toFixed(3)})`);

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = rainbowGrad;
  ctx.fill();

  ctx.restore();
}

/**
 * Main draw method for Mahoraga fighter.
 * Renders afterimages, Level 8 glow, stance rings, body, wings, necklace, wheel,
 * cleave windup, sakuga impact, and health bar.
 */
export function drawMahoragaFighter(ctx, fighter, opponent) {
  const isGojoDomainActive = typeof state !== 'undefined' && (
    state.activeDomain === 'unlimited_void' || 
    state.domainActive === 'unlimited_void' || 
    (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive))
  );

  // 0. Render fading divine flash-dash afterimage ghosts
  if (!isGojoDomainActive) {
    drawAfterimages(ctx, fighter);
  }

  // UNDERLAY RINGS
  const totalStages = (fighter.adaptationStage?.melee || 0) + (fighter.adaptationStage?.ranged || 0) + (fighter.adaptationStage?.skill || 0);
  const isLevel8 = totalStages >= 8 || fighter.isInfinityBlitz;

  // 0b. Draw Gamma Ray Rainbow Theme Visual Effect Underlay (3 seconds on wheel click)
  if (!isGojoDomainActive) {
    drawMahoragaGammaRayRainbowUnderlay(ctx, fighter);
  }

  ctx.save();

  // 1. Draw base fighter pixel art body & wrist blade
  drawMahoragaSkin(ctx, fighter);
  if (!fighter.isTargetOfAmbush && !(typeof state !== 'undefined' && state.showSkinOnly)) {
    fighter.drawGun(ctx);
  }

  // 2. Draw Eye-Socket Face Wings ON TOP OF BODY
  drawMahoragaFaceWings(ctx, fighter);

  // 3. Draw Shinto Ritual Chest Necklace & Amulet
  drawMahoragaChestNecklace(ctx, fighter);

  // 4. Draw Left Off-Hand ON TOP OF BODY & NECKLACE
  if (typeof isChampionScreenActive !== 'function' || !isChampionScreenActive()) {
    drawMahoragaLeftPunch(ctx, fighter);
  }

  // 5. Draw 3D Wheel of Adaptation & Surrounding Golden Ring Highlight
  drawMahoraga3DWheel(ctx, fighter);

  // 5b. Draw Gamma Ray Rainbow Theme Visual Effect Overlay
  if (!isGojoDomainActive) {
    drawMahoragaGammaRayRainbowOverlay(ctx, fighter);
  }

  ctx.restore();

  // 6. Draw Cleave Windup Visual
  if (fighter.isCleaving && !isGojoDomainActive) {
    const maxWindup = CONFIG.mahoraga?.cleaveWindupFrames || 30;
    const progress = fighter.cleaveWindupTimer / maxWindup;
    const radius = (CONFIG.mahoraga?.cleaveRadius || 150) * progress;

    ctx.save();
    ctx.translate(fighter.x, fighter.y);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(218, 165, 32, ${1 - progress})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  if (fighter.sakugaImpactTimer > 0) {
    if (!isGojoDomainActive) {
      drawSakugaImpactFrame(ctx, fighter);
    }
    fighter.sakugaImpactTimer--;
  }

  // Always draw Health Text on TOP
  fighter.drawHealth(ctx);
}
