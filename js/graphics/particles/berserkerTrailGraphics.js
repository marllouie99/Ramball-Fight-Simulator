// ─────────────────────────────────────────────
// BERSERKER FLUID BLOOD TRAIL GRAPHICS
// Dynamic, path-conforming blood ribbon trail with decoupled droplet particles
// ─────────────────────────────────────────────
import { CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';

const STREAM_FRAME_SRCS = [
  'Assets/effects/berserker/berserker-blood-stream.png',
  'Assets/effects/berserker/berserker-blood-stream-frame1.png',
  'Assets/effects/berserker/berserker-blood-stream-frame2.png'
];

const _streamFrameImgs = [null, null, null];
const _streamFrameLoading = [false, false, false];

/**
 * Lazy loads and caches the 3-frame animated blood stream PNG assets.
 * @param {number} frameIdx - Frame index (0, 1, 2)
 */
export function getBerserkerStreamImage(frameIdx = 0) {
  const idx = Math.max(0, Math.min(2, Math.floor(frameIdx))) % 3;
  if (_streamFrameImgs[idx] && _streamFrameImgs[idx].complete && _streamFrameImgs[idx].naturalWidth > 0) {
    return _streamFrameImgs[idx];
  }
  if (!_streamFrameLoading[idx] && typeof Image !== 'undefined') {
    _streamFrameLoading[idx] = true;
    const img = new Image();
    img.onload = () => {
      _streamFrameImgs[idx] = img;
      _streamFrameLoading[idx] = false;
    };
    img.onerror = () => {
      _streamFrameLoading[idx] = false;
    };
    img.src = STREAM_FRAME_SRCS[idx];
    _streamFrameImgs[idx] = img;
  }
  if (_streamFrameImgs[idx] && _streamFrameImgs[idx].complete) return _streamFrameImgs[idx];
  return _streamFrameImgs[0];
}

/**
 * Cycles through the 3 animated blood stream frames based on combat ticks.
 * @param {number} tick - Fighter animation tick counter
 * @param {number} speedMultiplier - Speed multiplier to increase frame rate during rage/sprint
 */
export function getBerserkerStreamAnimatedFrame(tick = 0, speedMultiplier = 1.0) {
  const interval = speedMultiplier > 1.4 ? 3 : 5;
  const frameIdx = Math.floor(tick / interval) % 3;
  return getBerserkerStreamImage(frameIdx);
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getBerserkerStreamImage(0);
  getBerserkerStreamImage(1);
  getBerserkerStreamImage(2);
}

/**
 * Initializes trail arrays on Berserker if not already present.
 */
function ensureTrailState(fighter) {
  if (!fighter.fluidTrailHistory) fighter.fluidTrailHistory = [];
  if (!fighter.fluidDropletParticles) fighter.fluidDropletParticles = [];
  if (fighter._fluidTrailTick === undefined) fighter._fluidTrailTick = 0;
}

/**
 * Updates Berserker's fluid trail history buffer and world droplet particles.
 */
export function updateBerserkerFluidTrail(fighter) {
  ensureTrailState(fighter);
  fighter._fluidTrailTick++;

  const speed = Math.hypot(fighter.vx, fighter.vy);
  const isMoving = speed > 0.4;
  const isRage = Boolean(fighter.isInRage);
  const history = fighter.fluidTrailHistory;

  // Max history frames based on combat state
  const maxHistory = isRage ? 20 : 14;

  if (isMoving) {
    // Record current position at the back of the fighter
    const moveAngle = Math.atan2(fighter.vy, fighter.vx);
    const rearOffsetX = -Math.cos(moveAngle) * (fighter.r * 0.45);
    const rearOffsetY = -Math.sin(moveAngle) * (fighter.r * 0.45);

    // Only push if moved at least 1.5px from previous point to prevent clustering
    let shouldPush = true;
    if (history.length > 0) {
      const last = history[0];
      const d = Math.hypot(fighter.x + rearOffsetX - last.x, fighter.y + rearOffsetY - last.y);
      if (d < 1.8) {
        shouldPush = false;
        // Update speed and rage state of latest point
        last.speed = speed;
        last.isRage = isRage;
      }
    }

    if (shouldPush) {
      history.unshift({
        x: fighter.x + rearOffsetX,
        y: fighter.y + rearOffsetY,
        vx: fighter.vx,
        vy: fighter.vy,
        speed: speed,
        angle: moveAngle,
        isRage: isRage,
        alpha: 1.0,
        age: 0
      });

      // Spawn dynamic world droplet particles
      const dropletInterval = isRage ? 1 : 3;
      if (fighter._fluidTrailTick % dropletInterval === 0 && history.length >= 2) {
        spawnFluidDroplets(fighter, history, isRage);
      }
    }
  } else {
    // Decay history smoothly when stopped (dynamic eraser wipe)
    for (let i = 0; i < history.length; i++) {
      history[i].alpha *= 0.85;
    }
  }

  // Trim excess history frames
  while (history.length > maxHistory) {
    history.pop();
  }

  // Update existing world droplet particles
  const droplets = fighter.fluidDropletParticles;
  for (let i = droplets.length - 1; i >= 0; i--) {
    const p = droplets[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.93;
    p.vy *= 0.93;
    p.life--;
    if (p.life <= 0) {
      droplets[i] = droplets[droplets.length - 1];
      droplets.pop();
    }
  }
}

/**
 * Spawns independent pixel-art blood droplet particles in world coordinates.
 */
function spawnFluidDroplets(fighter, history, isRage) {
  const droplets = fighter.fluidDropletParticles;
  const maxDroplets = isRage ? 25 : 12;
  if (droplets.length >= maxDroplets) return;

  // Pick a point along the trailing portion of the history
  const sampleIdx = Math.min(history.length - 1, 1 + Math.floor(Math.random() * (history.length - 1)));
  const pt = history[sampleIdx];
  if (!pt) return;

  const count = isRage ? (Math.random() > 0.4 ? 2 : 1) : 1;
  for (let i = 0; i < count; i++) {
    if (droplets.length >= maxDroplets) break;

    const normalA = pt.angle + Math.PI / 2;
    const sideOffset = (Math.random() - 0.5) * (isRage ? 22 : 14);
    const spraySpeed = (Math.random() - 0.5) * 1.8;

    droplets.push({
      x: pt.x + Math.cos(normalA) * sideOffset,
      y: pt.y + Math.sin(normalA) * sideOffset,
      vx: -pt.vx * 0.12 + Math.cos(normalA) * spraySpeed,
      vy: -pt.vy * 0.12 + Math.sin(normalA) * spraySpeed,
      size: isRage ? (2.5 + Math.random() * 2.5) : (1.8 + Math.random() * 1.8),
      life: 14 + Math.floor(Math.random() * 10),
      maxLife: 24,
      isRage: isRage
    });
  }
}

/**
 * Draws the fluid, path-bending blood ribbon trail and independent droplet particles.
 */
export function drawBerserkerFluidTrail(ctx, fighter) {
  ensureTrailState(fighter);
  const history = fighter.fluidTrailHistory;
  const droplets = fighter.fluidDropletParticles;

  // 1. Draw decoupled world droplet particles
  if (droplets && droplets.length > 0) {
    drawWorldDroplets(ctx, droplets);
  }

  // 2. Draw segmented flowing blood ribbon if we have enough path history
  if (history && history.length >= 2) {
    drawSegmentedRibbon(ctx, fighter, history);
  }
}

/**
 * Draws independent blood droplets with crisp pixel outlines and crimson cores.
 */
function drawWorldDroplets(ctx, droplets) {
  ctx.save();
  for (let i = 0; i < droplets.length; i++) {
    const p = droplets[i];
    const progress = p.life / p.maxLife; // 1.0 -> 0.0
    const alpha = Math.max(0, Math.min(1.0, progress * 1.2));
    const r = p.size * (0.6 + 0.4 * progress);

    ctx.globalAlpha = alpha;

    // Outer obsidian dark ink shell (#120306)
    ctx.fillStyle = '#120306';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Inner crimson droplet body (#d4111e or bright ruby in rage)
    ctx.fillStyle = p.isRage ? '#ff2a2a' : '#b30e18';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();

    // Specular white-hot glint core in rage mode
    if (p.isRage && r > 2.0 && progress > 0.4) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x - 0.4, p.y - 0.4, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Slices the blood stream PNG along the historical movement path for zero stiffness.
 */
function drawSegmentedRibbon(ctx, fighter, history) {
  const isRage = Boolean(fighter.isInRage);
  const tick = fighter._fluidTrailTick || 0;
  const currentSpeed = Math.hypot(fighter.vx, fighter.vy);
  const img = getBerserkerStreamAnimatedFrame(tick, isRage ? 2.0 : (currentSpeed > 3 ? 1.5 : 1.0));
  const hasImg = img && img.complete && (img.naturalWidth > 0 || img.width > 0);

  // Measure cumulative path length
  const numSegments = isRage ? 12 : 9;
  const pathPoints = samplePathUniform(history, numSegments + 1);
  if (pathPoints.length < 2) return;

  const speedStretch = Math.min(1.4, 0.9 + currentSpeed * 0.06);
  const baseHeight = (isRage ? 34 : 26) * (1.05 - (currentSpeed / 16) * 0.15);

  const imgW = hasImg ? (img.naturalWidth || 757) : 757;
  const imgH = hasImg ? (img.naturalHeight || 130) : 130;
  const sliceSrcW = imgW / numSegments;

  ctx.save();

  // Wave ripple time counter for fluid organic pulsation
  const time = (fighter._fluidTrailTick || 0) * 0.22;

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const p0 = pathPoints[i];     // closer to fighter
    const p1 = pathPoints[i + 1]; // further along trail tail

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const segLen = Math.hypot(dx, dy);
    if (segLen < 0.5) continue;

    const angle = Math.atan2(dy, dx);
    const tProgress = i / numSegments; // 0.0 at head -> 1.0 at tail

    // Perpendicular fluid ripple
    const ripple = Math.sin(time + i * 0.75) * (isRage ? 2.2 : 1.4);
    const normalA = angle + Math.PI / 2;
    const midX = p0.x + Math.cos(normalA) * ripple;
    const midY = p0.y + Math.sin(normalA) * ripple;

    // Segment taper: thickest near chest/head, tapering smoothly to sharp tail tip
    const taper = Math.pow(Math.sin((1 - tProgress * 0.85) * (Math.PI / 2)), 1.1);
    const segH = baseHeight * taper;
    const segAlpha = Math.max(0, Math.min(1.0, (1 - tProgress * 0.75) * p0.alpha));

    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(angle);
    ctx.globalAlpha = segAlpha;

    if (hasImg) {
      // Draw sliced PNG segment (overlap by 2.5px to guarantee seamless connection)
      const srcX = i * sliceSrcW;
      ctx.drawImage(
        img,
        srcX, 0, sliceSrcW, imgH,
        0, -segH / 2, segLen + 2.5, segH
      );

      // Blood Rage extra radiance layer
      if (isRage) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = segAlpha * 0.45;
        ctx.drawImage(
          img,
          srcX, 0, sliceSrcW, imgH,
          0, -segH / 2, segLen + 2.5, segH
        );
      }
    } else {
      // Procedural pixel-art fallback if image is still loading
      drawProceduralSegment(ctx, segLen, segH, isRage);
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Samples N evenly-spaced points along the historical path.
 */
function samplePathUniform(history, targetCount) {
  if (history.length < 2) return history.slice();

  const points = [];
  for (let i = 0; i < history.length; i++) {
    points.push({ x: history[i].x, y: history[i].y, alpha: history[i].alpha });
  }

  // If already close to target count, return directly
  if (points.length <= targetCount) return points;

  // Otherwise downsample uniformly
  const sampled = [];
  const step = (points.length - 1) / (targetCount - 1);
  for (let i = 0; i < targetCount; i++) {
    const idx = Math.min(points.length - 1, Math.round(i * step));
    sampled.push(points[idx]);
  }
  return sampled;
}

/**
 * High-fidelity procedural fallback matching the exact Blood Crimson palette.
 */
function drawProceduralSegment(ctx, len, h, isRage) {
  const halfH = h / 2;

  // Dark obsidian outer border
  ctx.fillStyle = '#120306';
  ctx.fillRect(0, -halfH, len + 2, h);

  // Crimson body fill
  ctx.fillStyle = isRage ? '#dc1424' : '#990c15';
  ctx.fillRect(1, -halfH + 1.5, len, h - 3);

  // Highlight core strip
  ctx.fillStyle = isRage ? '#ff7a7a' : '#d42835';
  ctx.fillRect(2, -halfH * 0.35, len - 2, halfH * 0.7);
}

/**
 * Draws a dynamic, segmented blood stream ribbon following the sweep of an axe blade.
 * Slices the PNG along the historical axe tip coordinates for 100% path conformity.
 */
export function drawAxeBladeRibbon(ctx, trail, isRage, tick = 0) {
  if (!trail || trail.length < 2) return;

  const img = getBerserkerStreamAnimatedFrame(tick, isRage ? 2.0 : 1.0);
  const hasImg = img && img.complete && (img.naturalWidth > 0 || img.width > 0);

  const imgW = hasImg ? (img.naturalWidth || 757) : 757;
  const imgH = hasImg ? (img.naturalHeight || 130) : 130;
  const numSegments = trail.length - 1;
  const sliceSrcW = imgW / numSegments;

  const baseHeight = isRage ? 28 : 16;

  ctx.save();
  for (let i = 0; i < numSegments; i++) {
    // trail[trail.length - 1] is newest blade tip
    const p0 = trail[trail.length - 1 - i];
    const p1 = trail[trail.length - 2 - i];

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const segLen = Math.hypot(dx, dy);
    if (segLen < 0.5) continue;

    const angle = Math.atan2(dy, dx);
    const tProgress = i / numSegments; // 0.0 at blade tip -> 1.0 at tail

    // Tapering: sharp at tail, wide at blade
    const taper = Math.pow(Math.sin((1 - tProgress * 0.88) * (Math.PI / 2)), 1.1);
    const segH = baseHeight * taper;
    const pLife = p0.life !== undefined ? (p0.life / 12) : 1.0;
    const segAlpha = Math.max(0, Math.min(1.0, pLife * (1 - tProgress * 0.45)));

    ctx.save();
    ctx.translate(p0.x, p0.y);
    ctx.rotate(angle);
    ctx.globalAlpha = segAlpha;

    if (hasImg) {
      const srcX = i * sliceSrcW;
      ctx.drawImage(
        img,
        srcX, 0, sliceSrcW, imgH,
        0, -segH / 2, segLen + 3.0, segH
      );

      if (isRage) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = segAlpha * 0.55;
        ctx.drawImage(
          img,
          srcX, 0, sliceSrcW, imgH,
          0, -segH / 2, segLen + 3.0, segH
        );
      }
    } else {
      drawProceduralSegment(ctx, segLen, segH, isRage);
    }

    ctx.restore();
  }
  ctx.restore();
}
