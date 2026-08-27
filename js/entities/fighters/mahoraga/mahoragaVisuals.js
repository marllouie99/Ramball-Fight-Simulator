// ─────────────────────────────────────────────
// MAHORAGA VISUALS MODULE
// Draw method, sakuga impact frames, cursed purple flames,
// afterimage rendering, and HUD ring overlays
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { drawMahoraga3DWheel, drawMahoragaSword, drawMahoragaLeftPunch } from '../../../graphics/weapons/mahoragaWeaponGraphics.js';
import { drawMahoragaFaceWings, drawMahoragaChestNecklace } from '../../../graphics/fighters/mahoragaSkin.js';
import { fastCleanArray } from '../../../graphics/particles/visualTrailSystem.js';
import { isChampionScreenActive } from '../../../core/state.js';

/**
 * Draw Sakuga Anime Impact Frame (anime speed lines + multi-strike phantom flurry + ink-brush burst)
 */
export function drawSakugaImpactFrame(ctx, fighter) {
  const t = fighter.sakugaImpactTimer / fighter.sakugaImpactMaxTimer;
  const alpha = Math.max(0, t);
  const scale = 1.0 + (1.0 - t) * 0.6;

  ctx.save();
  ctx.translate(fighter.sakugaImpactX, fighter.sakugaImpactY);
  ctx.rotate(fighter.sakugaImpactAngle);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  const seed = fighter.sakugaImpactSeed || 0.5;

  // 1. ANIME ACTION SPEED LINES
  ctx.save();
  const numRays = 16;
  for (let r = 0; r < numRays; r++) {
    const rayAngle = (r / numRays) * Math.PI * 2 + seed * 1.5;
    const innerRadius = 15 + seed * 10;
    const outerRadius = innerRadius + 45 + (r % 3 === 0 ? 35 : 15);
    const rayWidth = 1.8 + (r % 2 === 0 ? 1.5 : 0.5);

    ctx.beginPath();
    ctx.moveTo(Math.cos(rayAngle) * innerRadius, Math.sin(rayAngle) * innerRadius);
    ctx.lineTo(Math.cos(rayAngle) * outerRadius, Math.sin(rayAngle) * outerRadius);
    ctx.strokeStyle = (r % 3 === 0) ? '#FFFFFF' : ((r % 2 === 0) ? '#FFD700' : 'rgba(20, 10, 0, 0.7)');
    ctx.lineWidth = rayWidth;
    ctx.stroke();
  }
  ctx.restore();

  // 2. PHANTOM MULTI-STRIKE FLURRY ARCS
  ctx.save();
  const numPhantomHits = 5;
  for (let p = 0; p < numPhantomHits; p++) {
    const pAngle = (p / numPhantomHits) * Math.PI * 2 + seed * 3.0;
    const pDist = 25 + Math.sin(p * 1.7) * 12;
    const px = Math.cos(pAngle) * pDist;
    const py = Math.sin(pAngle) * pDist;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(pAngle + Math.PI / 2);

    ctx.beginPath();
    ctx.arc(0, 0, 14, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.strokeStyle = (p % 2 === 0) ? `rgba(255, 215, 0, ${alpha * 0.85})` : `rgba(255, 255, 255, ${alpha * 0.95})`;
    ctx.lineWidth = 3.0;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(18, 0);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.0;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // 3. ANIME SAKUGA INK CLUSTERS & STARBURST RAYS
  const numClusters = 6 + Math.floor(seed * 4);
  for (let c = 0; c < numClusters; c++) {
    const clusterAngle = (c / numClusters) * Math.PI * 2 + seed * 2.5;
    const clusterDist = 20 + (seed * 12) * (c % 3 === 0 ? 1.6 : 0.6);
    const cx = Math.cos(clusterAngle) * clusterDist;
    const cy = Math.sin(clusterAngle) * clusterDist;

    const numStrokes = 3 + Math.floor(seed * 3);
    for (let s = 0; s < numStrokes; s++) {
      const strokeAngle = clusterAngle + (s - 1) * 0.35 + seed * 1.2;
      const strokeLen = 16 + seed * 20 + (s === 0 ? 14 : 0);
      const strokeWidth = 1.8 + seed * 1.5;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const midX = cx + Math.cos(strokeAngle + 0.3) * strokeLen * 0.5;
      const midY = cy + Math.sin(strokeAngle + 0.3) * strokeLen * 0.5;
      const endX = cx + Math.cos(strokeAngle) * strokeLen;
      const endY = cy + Math.sin(strokeAngle) * strokeLen;
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = strokeWidth * 0.45;
      ctx.stroke();
    }
  }

  // 4. CONCENTRIC IMPACT SHOCK RING
  ctx.beginPath();
  ctx.arc(0, 0, 35 * (1.0 + (1.0 - t) * 0.4), 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.8})`;
  ctx.lineWidth = 2.5;
  ctx.stroke();

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

  // 1. Draw base fighter body & wrist blade
  fighter._superDraw(ctx, opponent);

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
