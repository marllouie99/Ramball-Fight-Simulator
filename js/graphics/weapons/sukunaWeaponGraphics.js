import { state } from '../../core/state.js';
import { fastCleanArray } from '../particles/visualTrailSystem.js';

export function drawSukunaSlash(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = Math.atan2(vy, vx);
  const owner = state.fighters && state.fighters[p.owner];
  const scale = owner ? Math.max(0.85, owner.r / 20) : 1.0;
  const lifeRatio = Math.max(0.3, (p.life || 30) / (p.maxLife || 30));

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  const r = 24;
  // Outer crescent arc & inner returning arc
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.55, Math.PI * 0.55, false);
  ctx.arc(r * 0.45, 0, r * 0.85, Math.PI * 0.50, -Math.PI * 0.50, true);
  ctx.closePath();

  ctx.fillStyle = `rgba(0, 0, 0, ${0.92 * lifeRatio})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(0, 0, 0, ${0.95 * lifeRatio})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Vivid inner crescent fill (Electric Cyan if frozen by Limitless, Crimson if normal)
  ctx.save();
  ctx.scale(0.85, 0.85);
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.52, Math.PI * 0.52, false);
  ctx.arc(r * 0.45, 0, r * 0.85, Math.PI * 0.48, -Math.PI * 0.48, true);
  ctx.closePath();
  ctx.fillStyle = p.isFrozenByInfinity ? `rgba(0, 229, 255, ${0.95 * lifeRatio})` : `rgba(220, 10, 10, ${0.95 * lifeRatio})`;
  ctx.fill();
  ctx.restore();

  // Razor-sharp white/cyan crescent core line
  ctx.strokeStyle = p.isFrozenByInfinity ? `rgba(224, 255, 255, ${0.98 * lifeRatio})` : `rgba(255, 255, 255, ${0.98 * lifeRatio})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.95, -Math.PI * 0.48, Math.PI * 0.48, false);
  ctx.stroke();

  ctx.restore();
}

let _ghostBladeBuffer = null;
let _ghostBladeLow = null;
let _ghostBladeHighCtx = null;
let _ghostBladeLowCtx = null;

function _getGhostBladeBuffers() {
  if (!_ghostBladeBuffer) {
    _ghostBladeBuffer = document.createElement('canvas');
    _ghostBladeBuffer.width = 64;
    _ghostBladeBuffer.height = 64;
    _ghostBladeHighCtx = _ghostBladeBuffer.getContext('2d');

    _ghostBladeLow = document.createElement('canvas');
    _ghostBladeLow.width = 32;
    _ghostBladeLow.height = 32;
    _ghostBladeLowCtx = _ghostBladeLow.getContext('2d', { willReadFrequently: true });
  }
  return { high: _ghostBladeBuffer, low: _ghostBladeLow, highCtx: _ghostBladeHighCtx, lowCtx: _ghostBladeLowCtx };
}

function _renderVectorGhostBlade(ctx, r, lifeRatio, isFrozen) {
  // Main ghost blade crescent shape
  ctx.globalAlpha = Math.max(0.70, 0.95 * lifeRatio);
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.6, Math.PI * 0.6, false);
  ctx.arc(r * 0.5, 0, r * 0.8, Math.PI * 0.55, -Math.PI * 0.55, true);
  ctx.closePath();
  ctx.fillStyle = isFrozen ? 'rgba(0, 229, 255, 0.95)' : 'rgba(255, 180, 180, 1)';
  ctx.fill();

  // Sharp outer crescent edge
  ctx.strokeStyle = isFrozen ? `rgba(224, 255, 255, ${0.95 * lifeRatio})` : `rgba(255, 200, 200, ${0.95 * lifeRatio})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.98, -Math.PI * 0.58, Math.PI * 0.58, false);
  ctx.stroke();

  // Sharp inner crescent edge
  ctx.beginPath();
  ctx.arc(r * 0.5, 0, r * 0.78, Math.PI * 0.53, -Math.PI * 0.53, true);
  ctx.stroke();

  // Thin bright center line
  ctx.strokeStyle = isFrozen ? `rgba(255, 255, 255, ${0.98 * lifeRatio})` : `rgba(255, 220, 220, ${0.98 * lifeRatio})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.6, -Math.PI * 0.5, Math.PI * 0.5, false);
  ctx.stroke();
}

export function drawGhostBlade(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = Math.atan2(vy, vx);
  const owner = state.fighters && state.fighters[p.owner];
  const scale = owner ? Math.max(0.85, owner.r / 20) : 1.0;
  const lifeRatio = Math.max(0.3, (p.life || 30) / (p.maxLife || 30));

  const isFrozen = Boolean(p.isFrozenByInfinity);
  const r = 24;

  const { high, low, highCtx, lowCtx } = _getGhostBladeBuffers();

  // Render high-res vector blade
  highCtx.clearRect(0, 0, 64, 64);
  highCtx.save();
  highCtx.translate(32, 32);
  _renderVectorGhostBlade(highCtx, r, lifeRatio, isFrozen);
  highCtx.restore();

  // Downsample to low-res discrete grid (32x32, P=2.0)
  lowCtx.clearRect(0, 0, 32, 32);
  lowCtx.imageSmoothingEnabled = false;
  lowCtx.drawImage(high, 0, 0, 32, 32);

  // Apply Saitama discrete outline & color snapping
  const imgData = lowCtx.getImageData(0, 0, 32, 32);
  const data = imgData.data;

  // First pass: identify non-empty pixels
  const w = 32, h = 32;
  const grid = new Array(h);
  for (let y = 0; y < h; y++) {
    grid[y] = new Uint8Array(w);
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > 30) grid[y][x] = 1;
    }
  }

  // Second pass: apply Saitama dark border (#0E0F14) and snap fill
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (!grid[y][x]) {
        data[idx + 3] = 0;
        continue;
      }

      const isBorder = (
        y === 0 || !grid[y - 1][x] ||
        y === h - 1 || !grid[y + 1][x] ||
        x === 0 || !grid[y][x - 1] ||
        x === w - 1 || !grid[y][x + 1]
      );

      if (isBorder) {
        data[idx] = 14;     // #0E
        data[idx + 1] = 15; // #0F
        data[idx + 2] = 20; // #14
        data[idx + 3] = 255;
      } else {
        data[idx + 3] = 255;
      }
    }
  }
  lowCtx.putImageData(imgData, 0, 0);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = false;

  // 1. Ghost Trail - discrete stepped pixel slices
  for (let i = 3; i >= 1; i--) {
    const trailAlpha = 0.22 * lifeRatio * (4 - i) / 3;
    const trailOffset = i * 8;
    ctx.save();
    ctx.globalAlpha = trailAlpha;
    ctx.drawImage(low, 0, 0, 32, 32, -32 - trailOffset, -32, 64, 64);
    ctx.restore();
  }

  // 2. Main Pixelated Ghost Blade (Saitama Style)
  ctx.drawImage(low, 0, 0, 32, 32, -32, -32, 64, 64);

  // 3. Discrete trailing pixel sparks
  const sparkCol = isFrozen ? '#00E5FF' : '#FF6666';
  ctx.fillStyle = sparkCol;
  const time = Date.now() * 0.01;
  const spark1X = -14 + Math.round(Math.sin(time + (p.x || 0) * 0.1) * 3) * 2;
  const spark1Y = -18 + Math.round(Math.cos(time * 1.5) * 2) * 2;
  const spark2X = -16 + Math.round(Math.cos(time + (p.y || 0) * 0.1) * 3) * 2;
  const spark2Y = 18 + Math.round(Math.sin(time * 1.3) * 2) * 2;
  ctx.fillRect(spark1X, spark1Y, 2, 2);
  ctx.fillRect(spark2X, spark2Y, 2, 2);

  ctx.restore();
}

export function drawSukunaCleave(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = Math.atan2(vy, vx);
  const owner = state.fighters && state.fighters[p.owner];
  const scale = owner ? Math.max(1.2, owner.r / 15) : 1.4;
  const lifeRatio = Math.max(0.3, (p.life || 30) / (p.maxLife || 30));

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  const r = 24;

  // OPTIMIZED: Removed shadowBlur. Used a dark underlay path for drop shadow instead
  ctx.beginPath();
  ctx.arc(2, 2, r, -Math.PI * 0.55, Math.PI * 0.55, false);
  ctx.arc(r * 0.45 + 2, 2, r * 0.85, Math.PI * 0.50, -Math.PI * 0.50, true);
  ctx.closePath();
  ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * lifeRatio})`;
  ctx.fill();
  
  // Draw the pure white crescent blade
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.55, Math.PI * 0.55, false);
  ctx.arc(r * 0.45, 0, r * 0.85, Math.PI * 0.50, -Math.PI * 0.50, true);
  ctx.closePath();
  
  ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * lifeRatio})`;
  ctx.fill();

  // Sharp core line for extra detail
  ctx.shadowColor = 'transparent'; // turn off shadow for the inner details
  ctx.strokeStyle = `rgba(230, 240, 255, ${1.0 * lifeRatio})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.95, -Math.PI * 0.48, Math.PI * 0.48, false);
  ctx.stroke();

  ctx.restore();
}

let _fugaLocalTrailPool = [];

export function drawSukunaFurnaceArrow(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = Math.atan2(vy, vx);
  // 30 FPS stepped animation time for anime Sakuga travel keyframes
  const step30Frame = Math.floor(Date.now() / (1000 / 30));
  const time = step30Frame * (1000 / 30) * 0.012;
  const speed = Math.hypot(vx, vy);

  // Performance: Detect low quality mode (explicit performance settings only)
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.2)));

  // Initialize trail history and particle systems
  if (!p._fugaFlameTimer) p._fugaFlameTimer = 0;
  p._fugaFlameTimer++;

  if (!p._trailHistory) p._trailHistory = [];
  if (!p.flameParticles) p.flameParticles = [];
  if (!p.emberParticles) p.emberParticles = [];

  // Record position trail for the long streaming fire wake (shorter trail in low quality)
  p._trailHistory.push({ x: p.x, y: p.y, time: time });
  const maxTrailLen = isLowQuality ? 16 : 48;
  while (p._trailHistory.length > maxTrailLen) p._trailHistory.shift();

  // ─── SPAWN FLAME BLOBS: Dense, long-lived, velocity-stretched (fewer in low quality)
  const spawnRate = isLowQuality ? 1 : 3;
  for (let i = 0; i < spawnRate; i++) {
    const spawnOffset = -Math.random() * 20;
    p.flameParticles.push({
      x: spawnOffset,
      y: (Math.random() - 0.5) * 14,
      vx: -(3.0 + Math.random() * 5.0 + speed * 0.12),
      vy: (Math.random() - 0.5) * 2.5,
      size: 6 + Math.random() * 10,
      maxSize: 22 + Math.random() * 18,
      life: 1.0,
      maxLife: 1.0,
      decay: isLowQuality ? (0.035 + Math.random() * 0.02) : (0.018 + Math.random() * 0.014), // Faster decay in low quality
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.12 + Math.random() * 0.2,
      turbSeed: Math.random() * 100,
      layer: i % 3 // 0=white-core, 1=golden, 2=crimson-outer
    });
  }

  // ─── SPAWN EMBERS: Glowing sparks that dissolve at trail end (fewer in low quality)
  const emberChance = isLowQuality ? 0.3 : 0.85;
  if (Math.random() < emberChance) {
    p.emberParticles.push({
      x: 5 - Math.random() * 25,
      y: (Math.random() - 0.5) * 20,
      vx: -(4 + Math.random() * 8 + speed * 0.18),
      vy: (Math.random() - 0.5) * 5.0,
      size: 1.0 + Math.random() * 2.0,
      life: 1.0,
      maxLife: 1.0,
      decay: isLowQuality ? (0.024 + Math.random() * 0.02) : (0.012 + Math.random() * 0.012),
      trail: []
    });
  }

  // Cap particles for 60 FPS performance (much tighter limits in low quality)
  const maxFlames = isLowQuality ? 8 : 25;
  const maxEmbers = isLowQuality ? 5 : 15;
  while (p.flameParticles.length > maxFlames) p.flameParticles.shift();
  while (p.emberParticles.length > maxEmbers) p.emberParticles.shift();

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // ─────────────────────────────────────────────────────────
  // LAYER 0: LONG TURBULENT FIRE WAKE (drawn from trail history)
  // A massive streaking energy wake that makes the arrow look
  // like it's ripping through the air and igniting everything
  // ─────────────────────────────────────────────────────────
  if (p._trailHistory.length > 3) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Convert trail history to local coordinates
    const cosA = Math.cos(-angle);
    const sinA = Math.sin(-angle);
    if (!_fugaLocalTrailPool || _fugaLocalTrailPool.length < p._trailHistory.length) {
      _fugaLocalTrailPool = [];
      for (let k = 0; k < 60; k++) _fugaLocalTrailPool.push({ x: 0, y: 0 });
    }
    const localTrail = _fugaLocalTrailPool;
    for (let k = 0; k < p._trailHistory.length; k++) {
      const pt = p._trailHistory[k];
      const dx = pt.x - p.x;
      const dy = pt.y - p.y;
      localTrail[k].x = dx * cosA - dy * sinA;
      localTrail[k].y = dx * sinA + dy * cosA;
    }

    // Draw multiple layered turbulent fire tongues along the trail (draw only 1 layer in low quality mode)
    const wakeLayers = isLowQuality ? 1 : 3;
    for (let layer = 0; layer < wakeLayers; layer++) {
      const widthMul = layer === 0 ? 1.0 : layer === 1 ? 0.6 : 0.3;
      const baseWidth = (18 + speed * 0.5) * widthMul;

      ctx.beginPath();
      const len = localTrail.length;

      // Top edge with turbulence
      for (let j = len - 1; j >= 0; j--) {
        const t = j / (len - 1); // 0=oldest, 1=newest
        const fadeWidth = baseWidth * (0.15 + t * 0.85);
        const turb = Math.sin(time * 7.0 - j * 0.6 + layer * 2.1) * fadeWidth * 0.4;
        const turb2 = Math.cos(time * 5.3 + j * 0.9 + layer * 1.3) * fadeWidth * 0.25;
        const yOff = fadeWidth + turb + turb2;
        if (j === len - 1) ctx.moveTo(localTrail[j].x, localTrail[j].y - yOff);
        else ctx.lineTo(localTrail[j].x, localTrail[j].y - yOff);
      }

      // Bottom edge with turbulence (reversed)
      for (let j = 0; j < len; j++) {
        const t = j / (len - 1);
        const fadeWidth = baseWidth * (0.15 + t * 0.85);
        const turb = Math.sin(time * 7.0 - j * 0.6 + layer * 2.1 + 3.14) * fadeWidth * 0.4;
        const turb2 = Math.cos(time * 5.3 + j * 0.9 + layer * 1.3 + 1.57) * fadeWidth * 0.25;
        const yOff = fadeWidth + turb + turb2;
        ctx.lineTo(localTrail[j].x, localTrail[j].y + yOff);
      }

      ctx.closePath();

      // Color cascade: white → yellow → golden orange → deep orange → crimson
      const trailStartX = localTrail[len - 1].x;
      const trailEndX = localTrail[0].x;

      if (isLowQuality) {
        // Fast flat fill instead of allocating linear gradients on the CPU per frame
        ctx.fillStyle = p.isFrozenByInfinity ? 'rgba(0, 160, 255, 0.4)' : 'rgba(255, 120, 0, 0.35)';
        ctx.fill();
      } else {
        const wakeGrad = ctx.createLinearGradient(trailStartX, 0, trailEndX, 0);
        if (p.isFrozenByInfinity) {
          if (layer === 0) {
            wakeGrad.addColorStop(0, `rgba(0, 120, 255, ${0.40})`);
            wakeGrad.addColorStop(0.3, `rgba(0, 80, 220, ${0.30})`);
            wakeGrad.addColorStop(0.7, `rgba(0, 40, 180, ${0.15})`);
            wakeGrad.addColorStop(1, 'rgba(0, 10, 80, 0)');
          } else if (layer === 1) {
            wakeGrad.addColorStop(0, `rgba(0, 229, 255, ${0.60})`);
            wakeGrad.addColorStop(0.25, `rgba(0, 160, 255, ${0.45})`);
            wakeGrad.addColorStop(0.6, `rgba(0, 90, 220, ${0.25})`);
            wakeGrad.addColorStop(1, 'rgba(0, 20, 100, 0)');
          } else {
            wakeGrad.addColorStop(0, `rgba(255, 255, 255, ${0.85})`);
            wakeGrad.addColorStop(0.15, `rgba(224, 255, 255, ${0.70})`);
            wakeGrad.addColorStop(0.4, `rgba(0, 229, 255, ${0.50})`);
            wakeGrad.addColorStop(1, 'rgba(0, 120, 255, 0)');
          }
        } else {
          if (layer === 0) {
            wakeGrad.addColorStop(0, `rgba(180, 30, 0, ${0.35})`);
            wakeGrad.addColorStop(0.3, `rgba(200, 50, 0, ${0.25})`);
            wakeGrad.addColorStop(0.7, `rgba(120, 15, 0, ${0.12})`);
            wakeGrad.addColorStop(1, 'rgba(60, 5, 0, 0)');
          } else if (layer === 1) {
            wakeGrad.addColorStop(0, `rgba(255, 180, 30, ${0.5})`);
            wakeGrad.addColorStop(0.25, `rgba(255, 120, 0, ${0.4})`);
            wakeGrad.addColorStop(0.6, `rgba(200, 40, 0, ${0.2})`);
            wakeGrad.addColorStop(1, 'rgba(100, 10, 0, 0)');
          } else {
            wakeGrad.addColorStop(0, `rgba(255, 255, 240, ${0.7})`);
            wakeGrad.addColorStop(0.15, `rgba(255, 240, 140, ${0.55})`);
            wakeGrad.addColorStop(0.4, `rgba(255, 180, 40, ${0.35})`);
            wakeGrad.addColorStop(1, 'rgba(200, 60, 0, 0)');
          }
        }
        ctx.fillStyle = wakeGrad;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ═════════════════════════════════════════════════════════
  // LAYER 1: FLUID FLAME BLOBS — curling, twisting smoke-fire
  // ═════════════════════════════════════════════════════════
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Optimized: Zero-GC swap-and-pop array cleanup
  fastCleanArray(p.flameParticles, (fp) => {
    fp.life -= fp.decay;
    if (fp.life <= 0) return false;

    // Fluid curl motion: sine wobble + turbulence offset
    fp.wobblePhase += fp.wobbleSpeed;
    const turbX = Math.sin(fp.turbSeed + time * 3.5) * 2.0;
    const turbY = Math.cos(fp.turbSeed * 1.7 + time * 2.8) * 3.0;
    fp.x += fp.vx + turbX * 0.3;
    fp.y += fp.vy + turbY * 0.3;
    fp.vy += Math.sin(fp.wobblePhase) * 0.15; // gentle curling drift

    const prog = fp.life / fp.maxLife;
    const ageRatio = 1 - prog; // 0=new, 1=dying
    const curSize = fp.size + (fp.maxSize - fp.size) * ageRatio;
    const alpha = prog * prog; // quadratic falloff for smoother fade
    const wobY = Math.sin(fp.wobblePhase) * 3.0;

    // Velocity-stretched ellipses
    const stretchX = curSize * (1.6 + speed * 0.03);
    const stretchY = curSize * (0.7 + ageRatio * 0.3);

    if (p.isFrozenByInfinity) {
      ctx.fillStyle = fp.layer === 0
        ? `rgba(255, 255, 255, ${alpha * 0.85})`
        : fp.layer === 1
        ? `rgba(0, 229, 255, ${alpha * 0.65})`
        : `rgba(0, 120, 255, ${alpha * 0.45})`;
    } else {
      ctx.fillStyle = fp.layer === 0
        ? `rgba(255, 245, 180, ${alpha * 0.75})`
        : fp.layer === 1
        ? `rgba(255, 140, 20, ${alpha * 0.55})`
        : `rgba(220, 40, 0, ${alpha * 0.35})`;
    }

    const isDark = _isDarkMode();
    if (isDark) {
      const px = Math.round(fp.x / 2) * 2;
      const py = Math.round((fp.y + wobY) / 2) * 2;
      const sx = Math.max(2, Math.round(stretchX / 2) * 2);
      const sy = Math.max(2, Math.round(stretchY / 2) * 2);
      ctx.fillRect(px - sx / 2, py - sy / 2, sx, sy);
    } else {
      ctx.beginPath();
      ctx.ellipse(fp.x, fp.y + wobY, stretchX, stretchY, -0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    return true;
  });

  // ═════════════════════════════════════════════════════════
  // LAYER 2: GLOWING EMBER SPARKS — dissolving at trail end
  // ═════════════════════════════════════════════════════════
  // Optimized: Zero-GC swap-and-pop array cleanup
  fastCleanArray(p.emberParticles, (ep) => {
    ep.life -= ep.decay;
    if (ep.life <= 0) return false;

    ep.trail.push({ x: ep.x, y: ep.y });
    const maxEmberTrail = isLowQuality ? 3 : 8;
    while (ep.trail.length > maxEmberTrail) ep.trail.shift();
    ep.x += ep.vx;
    ep.y += ep.vy;
    ep.vy += (Math.random() - 0.5) * 0.4; // random drift
    const prog = ep.life / ep.maxLife;

    const isDark = _isDarkMode();

    // Ember streak trail
    if (ep.trail.length > 1) {
      if (isDark) {
        ctx.fillStyle = p.isFrozenByInfinity
          ? `rgba(0, 229, 255, ${prog * 0.7})`
          : `rgba(255, ${140 + prog * 115}, 40, ${prog * 0.6})`;
        for (let t = 0; t < ep.trail.length; t++) {
          const tx = Math.round(ep.trail[t].x / 2) * 2;
          const ty = Math.round(ep.trail[t].y / 2) * 2;
          ctx.fillRect(tx, ty, 2, 2);
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(ep.trail[0].x, ep.trail[0].y);
        for (let t = 1; t < ep.trail.length; t++) ctx.lineTo(ep.trail[t].x, ep.trail[t].y);
        ctx.lineTo(ep.x, ep.y);
        ctx.strokeStyle = p.isFrozenByInfinity
          ? `rgba(0, 229, 255, ${prog * 0.7})`
          : `rgba(255, ${140 + prog * 115}, 40, ${prog * 0.6})`;
        ctx.lineWidth = ep.size * 0.7;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    // Bright ember head
    if (isDark) {
      const ex = Math.round(ep.x / 2) * 2;
      const ey = Math.round(ep.y / 2) * 2;
      const es = Math.max(2, Math.round((ep.size * (0.5 + prog * 0.8)) / 2) * 2);
      ctx.fillStyle = p.isFrozenByInfinity
        ? `rgba(224, 255, 255, ${prog})`
        : `rgba(255, ${200 + prog * 55}, ${120 + prog * 80}, ${prog})`;
      ctx.fillRect(ex - es / 2, ey - es / 2, es, es);
    } else {
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, ep.size * (0.5 + prog * 0.8), 0, Math.PI * 2);
      ctx.fillStyle = p.isFrozenByInfinity
        ? `rgba(224, 255, 255, ${prog})`
        : `rgba(255, ${200 + prog * 55}, ${120 + prog * 80}, ${prog})`;
      ctx.fill();
    }
    return true;
  });

  ctx.restore(); // lighter

  // ═════════════════════════════════════════════════════════
  // LAYER 3: TURBULENT AIR-RIP SHOCKWAVE LINES (completely skipped in low quality to save paths)
  // ═════════════════════════════════════════════════════════
  if (!isLowQuality) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = p.isFrozenByInfinity ? 'rgba(0, 255, 255, 0.7)' : 'rgba(255, 200, 100, 0.4)';
    ctx.lineWidth = 1.0;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const yOff = (i - 2) * 6 + Math.sin(time * 8 + i * 1.7) * 4;
      const startX = -10 - Math.random() * 10;
      const endX = startX - 25 - Math.random() * 35;
      ctx.beginPath();
      ctx.moveTo(startX, yOff);
      ctx.lineTo(endX, yOff + Math.sin(time * 6 + i) * 3);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore(); // restore translate/rotate

  // Draw main Volcanic Magma / Electric Cyan Flame Arrow construct on top
  drawDivineFlameArrowConstruct(ctx, {
    x: p.x,
    y: p.y,
    angle,
    scale: 1.0,
    progress: 1.0,
    isFlying: true,
    time,
    isFrozenByInfinity: p.isFrozenByInfinity
  });
}

function _isDarkMode() {
  return Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' ||
      state.darkMode ||
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );
}

let _fugaArcadeCanvas = null;
let _fugaArcadeCtx = null;

function _getFugaArcadeBuffer() {
  if (!_fugaArcadeCanvas) {
    _fugaArcadeCanvas = document.createElement('canvas');
    _fugaArcadeCanvas.width = 200;
    _fugaArcadeCanvas.height = 120;
    _fugaArcadeCtx = _fugaArcadeCanvas.getContext('2d');
    _fugaArcadeCtx.imageSmoothingEnabled = false;
  }
  return { canvas: _fugaArcadeCanvas, ctx: _fugaArcadeCtx };
}

export function drawDivineFlameArrowConstruct(ctx, {
  x, y, angle, scale = 1.0, progress = 1.0, isFlying = false, time = Date.now() * 0.012, isFrozenByInfinity = false
}) {
  if (progress <= 0) return;

  const isDark = _isDarkMode();

  if (isDark) {
    const { canvas: lowCanvas, ctx: lowCtx } = _getFugaArcadeBuffer();

    lowCtx.clearRect(0, 0, 200, 120);
    lowCtx.imageSmoothingEnabled = false;
    lowCtx.save();
    lowCtx.translate(100, 60);

    // Render directly into the low-res arcade canvas at native coordinates
    _renderVectorDivineFlameArrow(lowCtx, {
      scale: 1.0, progress, isFlying, time, isFrozenByInfinity
    });
    lowCtx.restore();

    // Blit with nearest-neighbor upscaling (chunky 16-bit retro arcade pixel flames at locked 60 FPS)
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lowCanvas, -100, -60);
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    _renderVectorDivineFlameArrow(ctx, {
      scale: 1.0, progress, isFlying, time, isFrozenByInfinity
    });
    ctx.restore();
  }
}

function _renderVectorDivineFlameArrow(ctx, {
  scale = 1.0, progress = 1.0, isFlying = false, time = Date.now() * 0.012, isFrozenByInfinity = false
}) {
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.2)));

  const notchX = -32 * progress;
  const tipX = 28 * progress;
  const totalLen = tipX - notchX;
  const headLen = 22 * progress;
  const headX = tipX - headLen;

  // 1. OUTMOST SPATIAL DISTORTION AURA
  const auraR = (42 + progress * 28);
  const auraGrad = ctx.createRadialGradient(tipX * 0.2, 0, 4, tipX * 0.1, 0, auraR * 2.0);
  if (isFrozenByInfinity) {
    auraGrad.addColorStop(0, `rgba(224, 255, 255, ${0.65 * progress})`);
    auraGrad.addColorStop(0.25, `rgba(0, 229, 255, ${0.45 * progress})`);
    auraGrad.addColorStop(0.55, `rgba(0, 100, 255, ${0.25 * progress})`);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    auraGrad.addColorStop(0, `rgba(255, 240, 160, ${0.5 * progress})`);
    auraGrad.addColorStop(0.25, `rgba(255, 140, 0, ${0.35 * progress})`);
    auraGrad.addColorStop(0.55, `rgba(200, 40, 0, ${0.18 * progress})`);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  }
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.ellipse(tipX * 0.2, 0, auraR * 2.2, auraR * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Switch to ADDITIVE LIGHTING for hyper-realistic fire
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // ═════════════════════════════════════════════════════════
  // 2. ROARING FLAME TONGUES — long, turbulent, curling backward
  // Uses traveling wave + multi-frequency turbulence for fluid motion
  // ═════════════════════════════════════════════════════════
  const numTendrils = isLowQuality ? 4 : 16;
  for (let i = 0; i < numTendrils; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const ratio = i / (numTendrils - 1);
    const originX = tipX - ratio * totalLen;

    // Traveling wave with multi-frequency turbulence for fluid, smoke-like curling
    const flowPhase = time * 6.5 - ratio * 14.0 + i * 0.6;
    const turb1 = Math.sin(flowPhase) * 12;
    const turb2 = Math.sin(flowPhase * 1.7 + i * 1.1) * 6;
    const turb3 = Math.cos(flowPhase * 0.6 + i * 2.3) * 4;

    // Flames get dramatically longer toward the rear (velocity-stretched)
    const lenMultiplier = isFlying ? (1.0 + ratio * 1.8) : (1.0 + ratio * 0.8);
    const flameLen = (28 + turb1 + turb2 + ratio * 30) * progress * lenMultiplier;
    const spread = (8 + Math.cos(flowPhase * 0.85) * 6 + ratio * 14 + turb3) * progress;
    const wave = Math.sin(flowPhase * 1.4) * 7 * progress;

    // More control points for fluid S-curve motion
    ctx.beginPath();
    ctx.moveTo(originX, side * 2);
    ctx.bezierCurveTo(
      originX - flameLen * 0.25, side * (spread * 1.3 + wave),
      originX - flameLen * 0.55, side * (spread * 1.6 - wave * 0.8),
      originX - flameLen * 0.75, side * (spread * 1.1 + wave * 0.4)
    );
    ctx.bezierCurveTo(
      originX - flameLen * 0.9, side * (spread * 0.7),
      originX - flameLen, side * (spread * 0.3 + turb3 * 0.3),
      originX - flameLen, side * (spread * 0.15)
    );
    // Return path (thin inner edge)
    ctx.bezierCurveTo(
      originX - flameLen * 0.85, side * (spread * 0.2),
      originX - flameLen * 0.4, side * (spread * 0.15),
      originX, side * 2
    );
    ctx.closePath();

    if (isLowQuality) {
      // Fast path: reuse single flat fills instead of generating CPU linear gradients per tendril per frame
      ctx.fillStyle = isFrozenByInfinity 
        ? `rgba(0, ${150 + ratio * 105}, 255, ${progress * 0.7})` 
        : `rgba(255, ${100 + ratio * 155}, 0, ${progress * 0.7})`;
    } else {
      // Color cascade from white-hot to cyan/blue (if frozen) or crimson (if normal)
      const tGrad = ctx.createLinearGradient(originX, 0, originX - flameLen, side * spread * 0.5);
      if (isFrozenByInfinity) {
        if (ratio < 0.3) {
          tGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * progress})`);
          tGrad.addColorStop(0.3, `rgba(224, 255, 255, ${0.8 * progress})`);
          tGrad.addColorStop(0.6, `rgba(0, 229, 255, ${0.6 * progress})`);
          tGrad.addColorStop(1, 'rgba(0, 120, 255, 0)');
        } else if (ratio < 0.6) {
          tGrad.addColorStop(0, `rgba(0, 229, 255, ${0.85 * progress})`);
          tGrad.addColorStop(0.35, `rgba(0, 160, 255, ${0.65 * progress})`);
          tGrad.addColorStop(0.7, `rgba(0, 80, 220, ${0.4 * progress})`);
          tGrad.addColorStop(1, 'rgba(0, 30, 150, 0)');
        } else {
          tGrad.addColorStop(0, `rgba(0, 180, 255, ${0.75 * progress})`);
          tGrad.addColorStop(0.3, `rgba(0, 100, 240, ${0.55 * progress})`);
          tGrad.addColorStop(0.65, `rgba(0, 40, 180, ${0.3 * progress})`);
          tGrad.addColorStop(1, 'rgba(0, 15, 100, 0)');
        }
      } else {
        if (ratio < 0.3) {
          tGrad.addColorStop(0, `rgba(255, 255, 245, ${0.9 * progress})`);
          tGrad.addColorStop(0.3, `rgba(255, 245, 160, ${0.75 * progress})`);
          tGrad.addColorStop(0.6, `rgba(255, 180, 40, ${0.5 * progress})`);
          tGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');
        } else if (ratio < 0.6) {
          tGrad.addColorStop(0, `rgba(255, 220, 80, ${0.85 * progress})`);
          tGrad.addColorStop(0.35, `rgba(255, 150, 10, ${0.7 * progress})`);
          tGrad.addColorStop(0.7, `rgba(230, 60, 0, ${0.4 * progress})`);
          tGrad.addColorStop(1, 'rgba(150, 15, 0, 0)');
        } else {
          tGrad.addColorStop(0, `rgba(255, 160, 30, ${0.75 * progress})`);
          tGrad.addColorStop(0.3, `rgba(220, 70, 0, ${0.55 * progress})`);
          tGrad.addColorStop(0.65, `rgba(160, 20, 0, ${0.3 * progress})`);
          tGrad.addColorStop(1, 'rgba(80, 5, 0, 0)');
        }
      }
      ctx.fillStyle = tGrad;
    }
    ctx.fill();
  }

  // ═════════════════════════════════════════════════════════
  // 3. TWIN FIERY TAIL FLETCHING (Rear Plumes at notchX)
  // Wild streaming plumes that convey unstoppable momentum
  // ═════════════════════════════════════════════════════════
  for (let side of [-1, 1]) {
    const tailPhase = time * 7.5 + side * 1.5;
    const plumeScale = isFlying ? 1.6 : 1.0;
    const fletchLen = (40 + Math.sin(tailPhase) * 10) * progress * plumeScale;
    const fletchSpread = (20 + Math.cos(tailPhase * 0.8) * 7) * progress;

    ctx.beginPath();
    ctx.moveTo(notchX + 8 * progress, 0);
    ctx.bezierCurveTo(
      notchX - fletchLen * 0.3, side * fletchSpread * 0.4,
      notchX - fletchLen * 0.7, side * fletchSpread * 1.4,
      notchX - fletchLen, side * fletchSpread * 1.1
    );
    ctx.bezierCurveTo(
      notchX - fletchLen * 0.8, side * fletchSpread * 0.6,
      notchX - fletchLen * 0.35, side * 3,
      notchX + 8 * progress, 0
    );
    ctx.closePath();

    const flGrad = ctx.createLinearGradient(notchX, 0, notchX - fletchLen, side * fletchSpread);
    flGrad.addColorStop(0, `rgba(255, 250, 200, ${0.95 * progress})`);
    flGrad.addColorStop(0.25, `rgba(255, 180, 30, ${0.85 * progress})`);
    flGrad.addColorStop(0.55, `rgba(240, 80, 0, ${0.55 * progress})`);
    flGrad.addColorStop(0.8, `rgba(180, 20, 0, ${0.3 * progress})`);
    flGrad.addColorStop(1, 'rgba(80, 0, 0, 0)');
    ctx.fillStyle = flGrad;
    ctx.fill();
  }

  // ═════════════════════════════════════════════════════════
  // 4. MOLTEN LAVA SHAFT & INCANDESCENT CORE
  // ═════════════════════════════════════════════════════════
  const shaftGrad = ctx.createLinearGradient(notchX, 0, headX + 4, 0);
  shaftGrad.addColorStop(0, `rgba(255, 90, 0, ${0.75 * progress})`);
  shaftGrad.addColorStop(0.3, `rgba(255, 180, 30, ${0.9 * progress})`);
  shaftGrad.addColorStop(0.7, `rgba(255, 245, 160, ${0.95 * progress})`);
  shaftGrad.addColorStop(1, `rgba(255, 255, 240, 1.0)`);

  ctx.beginPath();
  ctx.moveTo(notchX, -2.5 * progress);
  ctx.lineTo(headX + 4, -4 * progress);
  ctx.lineTo(headX + 4, 4 * progress);
  ctx.lineTo(notchX, 2.5 * progress);
  ctx.closePath();
  ctx.fillStyle = shaftGrad;
  ctx.fill();

  // White incandescent inner core spine line
  ctx.beginPath();
  ctx.moveTo(notchX + 4 * progress, 0);
  ctx.lineTo(headX + 6, 0);
  ctx.strokeStyle = `rgba(255, 255, 255, ${progress})`;
  ctx.lineWidth = 2.5 * progress;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Intricate Magma / Lava Crack Patterns along shaft (skipped in low quality mode)
  if (!isLowQuality) {
    ctx.strokeStyle = `rgba(255, 235, 130, ${0.95 * progress})`;
    ctx.lineWidth = 1.3 * progress;
    const numCracks = 6;
    for (let c = 0; c < numCracks; c++) {
      const cx = notchX + (c + 0.5) * ((headX - notchX) / numCracks);
      const side = c % 2 === 0 ? 1 : -1;
      const cWobble = Math.sin(time * 3 + c * 2) * 2;

      ctx.beginPath();
      ctx.moveTo(cx - 6, side * 0.5);
      ctx.quadraticCurveTo(cx, side * (4.5 + cWobble), cx + 7, side * 1.2);
      ctx.stroke();
    }
  }

  // ═════════════════════════════════════════════════════════
  // 5. VOLCANIC OBSIDIAN MAGMA ARROWHEAD
  // ═════════════════════════════════════════════════════════
  const tipApexX = tipX + 6 * progress;
  const barbX = headX - 6 * progress;
  const barbY = 17 * progress;

  // (A) Dark Volcanic Crystalline Base Plate
  ctx.beginPath();
  ctx.moveTo(tipApexX, 0);
  ctx.quadraticCurveTo(tipApexX - 10 * progress, -barbY * 0.5, barbX, -barbY);
  ctx.quadraticCurveTo(headX + 4 * progress, -barbY * 0.4, headX + 2 * progress, 0);
  ctx.quadraticCurveTo(headX + 4 * progress, barbY * 0.4, barbX, barbY);
  ctx.quadraticCurveTo(tipApexX - 10 * progress, barbY * 0.5, tipApexX, 0);
  ctx.closePath();

  const obsidianGrad = ctx.createLinearGradient(barbX, 0, tipApexX, 0);
  obsidianGrad.addColorStop(0, `rgba(140, 10, 0, ${0.95 * progress})`);
  obsidianGrad.addColorStop(0.4, `rgba(220, 60, 0, ${0.95 * progress})`);
  obsidianGrad.addColorStop(0.8, `rgba(255, 180, 30, ${0.98 * progress})`);
  obsidianGrad.addColorStop(1, `rgba(255, 255, 220, 1.0)`);
  ctx.fillStyle = obsidianGrad;
  ctx.fill();

  // Dark volcanic rock contour lines
  ctx.strokeStyle = `rgba(80, 0, 0, ${0.85 * progress})`;
  ctx.lineWidth = 1.5 * progress;
  ctx.stroke();

  // (B) Lava Veins inside Arrowhead Plate
  ctx.strokeStyle = `rgba(255, 240, 160, ${0.95 * progress})`;
  ctx.lineWidth = 1.6 * progress;
  
  // Center vein
  ctx.beginPath();
  ctx.moveTo(headX + 2 * progress, 0);
  ctx.lineTo(tipApexX - 2 * progress, 0);
  ctx.stroke();

  // Branching veins to top & bottom barb wings
  for (let side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(headX + 6 * progress, 0);
    ctx.quadraticCurveTo(headX + 10 * progress, side * (barbY * 0.4), barbX + 4 * progress, side * (barbY * 0.85));
    ctx.stroke();
  }

  // (C) Dripping Molten Lava Droplets from Barb Wing Tips
  for (let side of [-1, 1]) {
    const dripLen = (6 + Math.sin(time * 4 + side * 2) * 3) * progress;
    const dripX = barbX - dripLen * 0.8;
    const dripY = side * (barbY + dripLen * 0.5);

    ctx.beginPath();
    ctx.moveTo(barbX, side * barbY);
    ctx.quadraticCurveTo(dripX, side * (barbY + 2), dripX - 2 * progress, dripY);
    ctx.arc(dripX - 2 * progress, dripY, 2.2 * progress, 0, Math.PI * 2);
    ctx.closePath();

    if (isLowQuality) {
      ctx.fillStyle = `rgba(255, 180, 0, ${0.9 * progress})`;
      ctx.fill();
    } else {
      const dripGrad = ctx.createRadialGradient(dripX, dripY, 0, dripX, dripY, 4 * progress);
      dripGrad.addColorStop(0, `rgba(255, 255, 220, ${progress})`);
      dripGrad.addColorStop(0.5, `rgba(255, 140, 0, ${0.9 * progress})`);
      dripGrad.addColorStop(1, 'rgba(180, 20, 0, 0)');
      ctx.fillStyle = dripGrad;
      ctx.fill();
    }
  }

  // (D) Blinding White Nose Tip Flare
  if (isLowQuality) {
    ctx.fillStyle = `rgba(255, 250, 200, ${0.85 * progress})`;
    ctx.beginPath();
    ctx.arc(tipApexX, 0, 14 * progress, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const tipGlow = ctx.createRadialGradient(tipApexX, 0, 0, tipApexX, 0, 16 * progress);
    tipGlow.addColorStop(0, `rgba(255, 255, 255, ${progress})`);
    tipGlow.addColorStop(0.3, `rgba(255, 250, 200, ${0.9 * progress})`);
    tipGlow.addColorStop(0.6, `rgba(255, 200, 80, ${0.5 * progress})`);
    tipGlow.addColorStop(1, 'rgba(255, 90, 0, 0)');
    ctx.fillStyle = tipGlow;
    ctx.beginPath();
    ctx.arc(tipApexX, 0, 16 * progress, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // Restore globalCompositeOperation ('lighter')
  ctx.restore(); // Restore transform matrix
}
