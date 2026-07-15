// ─────────────────────────────────────────────
// DRAW — ARENA
// ─────────────────────────────────────────────
import { state, getProjectiles } from '../core/state.js';
import { drawShurikenProjectile, drawGraySwordProjectile, drawPoisonBottleCore, drawRedSniperGun, drawBlueAimbotGun } from './weaponVisuals.js';
import { drawRangerBullet } from './weapons/rangerWeaponGraphics.js';
import { drawGunSlingerBullet, drawGunSlingerMuzzleFlash } from './weapons/gunSlingerWeaponGraphics.js';
import { drawEngineerBullet, drawTurret, drawTurretBullet } from './engineerWeaponGraphics.js';
import { drawBomberExplosionGraphic, drawBomberGrenade, drawGrenadeTrail, drawBomberC4 } from './weapons/bomberWeaponGraphics.js';
import { drawDopplegangerPurpleSword, drawDopplegangerBodyEffect } from './weapons/dopplegangerWeaponGraphics.js';
import { drawDoppelgangerSkin } from './fighters/doppelgangerSkin.js';
import { CONFIG, GUN_TIP_DIST } from '../core/config.js';
import { initFlameCanvas, resizeFlameCanvas, drawFlamesToCanvas, clearFlameCanvas } from './canvasManager.js';
import { drawDeathEffects } from './particles/deathShatterEffect.js';
import { drawBloodEffects } from './particles/bloodEffect.js';
import { drawIllusionDeathEffects } from './particles/illusionDeathEffect.js';
import { drawIllusionSpawnEffects } from './particles/illusionSpawnEffect.js';
import { drawBerserkerRageEffects } from './particles/berserkerRageEffect.js';
import { drawSparkEffects } from './particles/sparkEffect.js';
import { drawDoppelgangerDeathEffects } from '../graphics/particles/doppelgangerDeathEffect.js';
export { drawDeathEffects, drawDoppelgangerDeathEffects, drawBloodEffects, drawIllusionDeathEffects, drawIllusionSpawnEffects, drawBerserkerRageEffects, drawSparkEffects };

// Performance: Cache time at the start of each frame to avoid multiple Date.now() calls
let _cachedTime = 0;
// Cache for heavy grid geometry
const _cronosGridCache = new Map();
function getNow() {
  if (_cachedTime === 0) _cachedTime = Date.now();
  return _cachedTime;
}
export function resetCachedTime() {
  _cachedTime = 0;
}

// ── Module-level cached hex vertex trig (shared by sphere, barrier, etc.) ──
const _DRAW_HEX_ANGLE = Math.PI / 3;
const _DRAW_HEX_COS = [
  Math.cos(Math.PI / 6), Math.cos(Math.PI / 6 + _DRAW_HEX_ANGLE), Math.cos(Math.PI / 6 + _DRAW_HEX_ANGLE * 2),
  Math.cos(Math.PI / 6 + _DRAW_HEX_ANGLE * 3), Math.cos(Math.PI / 6 + _DRAW_HEX_ANGLE * 4), Math.cos(Math.PI / 6 + _DRAW_HEX_ANGLE * 5)
];
const _DRAW_HEX_SIN = [
  Math.sin(Math.PI / 6), Math.sin(Math.PI / 6 + _DRAW_HEX_ANGLE), Math.sin(Math.PI / 6 + _DRAW_HEX_ANGLE * 2),
  Math.sin(Math.PI / 6 + _DRAW_HEX_ANGLE * 3), Math.sin(Math.PI / 6 + _DRAW_HEX_ANGLE * 4), Math.sin(Math.PI / 6 + _DRAW_HEX_ANGLE * 5)
];
// Cached shimmer value (quantized to every ~3 frames to avoid per-frame sine)
let _shimmerValue = 0.9;
let _shimmerFrame = 0;

// bomber explosion visuals are routed through js/weaponGraphic/bomberWeaponGraphics.js.
// Change bomber graphics in that file instead of here.

export function drawArena() {
  const { ctx, canvas, arena } = state;
  
  // Fill the entire canvas background with white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Arena background (in case it needs to be different later, but right now it's also white)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(arena.x, arena.y, arena.width, arena.height);

  // Draw the arena boundary stroke
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeRect(arena.x, arena.y, arena.width, arena.height);
}

// ─────────────────────────────────────────────
// DRAW — PROJECTILES
// ─────────────────────────────────────────────

function drawBlackHoleVisual({
  ctx,
  p,
  alpha,
  now,
  eventHorizon,
  innerDiskR,
  outerDiskR,
  progress,
  rotateAngle = null,
  indicator = false,
}) {
  // Optional summon indicator ring
  if (indicator && p.indicatorTimer > 0) {
    const ip = p.indicatorTimer / (p.indicatorLife || 1);
    const ringProgress = 1 - ip;
    const ringRadius = (outerDiskR * 0.9) * (1 + ringProgress * 0.8);
    ctx.save();
    ctx.globalAlpha = Math.max(0, ip * 0.95) * alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(204,102,255,${0.85 * ip})`;
    ctx.lineWidth = Math.max(2, outerDiskR * 0.05) * (0.7 + ringProgress * 0.6);
    ctx.stroke();
    ctx.restore();
  }

  const pulse = 1 + Math.sin(now / 220) * 0.08;

  // --- Dark core / gravitational well ---
  ctx.save();
  ctx.globalAlpha = alpha;
  const coreGlow = ctx.createRadialGradient(
    p.x,
    p.y,
    Math.max(0.6, eventHorizon * 0.2),
    p.x,
    p.y,
    outerDiskR * 1.1
  );
  coreGlow.addColorStop(0, `rgba(0,0,0,${0.95})`);
  coreGlow.addColorStop(0.25, `rgba(10,0,20,${0.85 * alpha})`);
  coreGlow.addColorStop(0.6, `rgba(60,0,120,${0.25 * alpha})`);
  coreGlow.addColorStop(1, `rgba(153,0,255,${0.0})`);
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, outerDiskR * 1.05 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- Accretion disk bands (reduced from 12 to 6 for performance) ---
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x, p.y);

  // If rotateAngle is provided (projectile phase), bias rotation so it reads directionally.
  const diskRot = (rotateAngle ?? 0) + now / 650;
  ctx.rotate(diskRot);

  const bandCount = 6; // Reduced from 12 for performance
  for (let i = 0; i < bandCount; i++) {
    const t = i / bandCount;
    const bandWidth = (2 * Math.PI) / bandCount;
    const bandAlpha = (0.10 + 0.10 * Math.sin(t * Math.PI * 2 + now / 300)) * pulse;

    ctx.strokeStyle = `rgba(204,102,255,${Math.max(0, bandAlpha * 0.9)})`;
    ctx.lineWidth = Math.max(1, outerDiskR * 0.06);

    const a0 = t * 2 * Math.PI;
    const a1 = a0 + bandWidth * 0.78;

    ctx.beginPath();
    ctx.arc(0, 0, (innerDiskR + outerDiskR) * 0.5, a0, a1);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,210,255,${Math.max(0, bandAlpha * 0.35)})`;
    ctx.lineWidth = Math.max(0.8, outerDiskR * 0.035);
    ctx.beginPath();
    ctx.arc(
      0,
      0,
      innerDiskR * (0.98 + 0.06 * Math.sin(now / 280 + i)),
      a0 + bandWidth * 0.15,
      a1 - bandWidth * 0.15
    );
    ctx.stroke();
  }
  ctx.restore();

  // --- Event horizon ring ---
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(p.x, p.y, eventHorizon * 1.25, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(204,102,255,${0.55 * alpha})`;
  ctx.lineWidth = Math.max(2, outerDiskR * 0.05);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(p.x, p.y, eventHorizon, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${0.95})`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(p.x, p.y, eventHorizon * 0.82, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,220,255,${0.12 * alpha})`;
  ctx.lineWidth = Math.max(1, outerDiskR * 0.02);
  ctx.stroke();
  ctx.restore();

  // --- Suction specks / lensing streaks (reduced from 10-26 to 6-12 for performance) ---
  const suctionStrength = 0.55 + 0.45 * Math.sin(now / 180 + (p.x + p.y) * 0.01);
  const speckCount = Math.max(6, Math.min(12, Math.floor(outerDiskR * 0.12))); // Reduced from 0.22 to 0.12

  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < speckCount; i++) {
    const ang = (i / speckCount) * Math.PI * 2 + now / 1000;
    const randish = (Math.sin(i * 12.9898 + p.x * 0.01 + p.y * 0.01) * 43758.5453) % 1;
    const startT = 0.35 + (randish * 0.6);

    const startR = outerDiskR * pulse * startT;
    const endR = eventHorizon * (0.95 + 0.25 * suctionStrength);

    const sx = p.x + Math.cos(ang) * startR;
    const sy = p.y + Math.sin(ang) * startR;
    const ex = p.x + Math.cos(ang) * (endR * 0.98);
    const ey = p.y + Math.sin(ang) * (endR * 0.98);

    const fade = 1 - startT;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = `rgba(204,102,255,${0.08 + 0.12 * fade * alpha})`;
    ctx.lineWidth = Math.max(1, outerDiskR * 0.018);
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    const headR = Math.max(0.9, outerDiskR * 0.012 * (1 - fade * 0.6));
    ctx.arc(ex, ey, headR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,220,255,${0.06 + 0.14 * fade * alpha})`;
    ctx.fill();
  }
  ctx.restore();

  // --- Inner swirl arcs ---
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x, p.y);

  const swirlRot = now / 500;
  ctx.rotate(swirlRot);

  ctx.strokeStyle = `rgba(153,0,255,${0.22 * alpha})`;
  ctx.lineWidth = Math.max(1.2, outerDiskR * 0.03);
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.rotate((Math.PI * 2) / 3);
    ctx.arc(0, 0, outerDiskR * (0.55 + i * 0.12), -Math.PI * 0.15, Math.PI * 0.65);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCronosSphereVisual({
  ctx,
  cx,
  cy,
  radius,
  alpha = 1,
  deployProgress = 1,
  now = Date.now(),
  frozenCount = 0,  // number of frozen projectiles for LOD
}) {
  // OPTIMIZATION: Aggressive LOD based on FPS and quality
  const qualityLevel = (typeof state !== 'undefined' && state.qualityLevel) || 1.0;
  const fps = (typeof state !== 'undefined' && state.fps) || 60;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1';
  const useUltraLOD = false;
  const useLOD = false;

  // OPTIMIZATION: Skip complex sphere drawing at ultra low quality
  if (useUltraLOD) {
    // Simplified but extremely visible: thick blue ring with solid inner fill
    ctx.save();
    ctx.globalAlpha = alpha;
    // Outer glow ring - dark cyan
    ctx.strokeStyle = 'rgba(0, 160, 200, 1.0)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    // Solid inner fill - dark cyan
    ctx.fillStyle = 'rgba(0, 180, 220, 0.6)';
    ctx.fill();
    ctx.restore();
    return;
  }

  const p = Math.min(1, Math.max(0, deployProgress));
  const R = radius;

  // ── LOD: Use simplified rendering when many projectiles frozen ────────
  const lodCellSize = useLOD ? Math.max(30, R * 0.22) : Math.max(20, R * 0.14);

  // ── Use module-level cached hex trig ──────────────────────────────────────
  const cosAngles = _DRAW_HEX_COS;
  const sinAngles = _DRAW_HEX_SIN;

  // No outer glow - keeps the sphere crisp without blur


  // ═══════════════════════════════════════════════════════════════════════════
  // PERFECT CIRCULAR CLIP REGION — everything below is masked to a clean circle
  // ═══════════════════════════════════════════════════════════════════════════
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // ── Honeycomb grid (inside clipped region) ───────────────────────────────
  ctx.save();
  // Removed 'screen' mode so grid stays visible on white
  ctx.globalAlpha = 0.85 * alpha;
  ctx.translate(cx, cy);

  const cacheKey = `sphere_${Math.round(R)}_lod${useLOD ? 1 : 0}`;
  let gridData = _cronosGridCache.get(cacheKey);

  if (!gridData) {
    const cellSize = lodCellSize;
    const colCount = Math.ceil(R / (cellSize * 1.75)) + 1;
    const rowCount = Math.ceil(R / (cellSize * 1.52)) + 1;
    const cellOffsetX = cellSize * 1.75;
    const cellOffsetY = cellSize * 1.52;
    const minDist = R * 0.16;

    // Pre-compute hex vertex offsets
    const hexOffsets = [];
    for (let i = 0; i < 6; i++) {
      hexOffsets.push({ x: cosAngles[i] * cellSize, y: sinAngles[i] * cellSize });
    }

    // Build valid cells — clip() handles the circular boundary cleanly,
    // so we just include all cells whose center falls within the radius.
    const validCells = [];
    for (let row = -rowCount; row <= rowCount; row++) {
      for (let col = -colCount; col <= colCount; col++) {
        const x = col * cellOffsetX + (row % 2 ? cellOffsetX * 0.5 : 0);
        const y = row * cellOffsetY;
        const dist = Math.hypot(x, y);
        if (dist > R || dist < minDist) continue;
        validCells.push({ x, y, dist });
      }
    }
    gridData = { cellSize, hexOffsets, validCells };
    _cronosGridCache.set(cacheKey, gridData);
  }

  const { cellSize, hexOffsets, validCells } = gridData;

  // 3D Volume Gradient - gives the sphere depth so it's not just a flat circle
  const volumeGrad = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R);
  volumeGrad.addColorStop(0, 'rgba(0, 240, 255, 0.3)');    // Bright luminous core
  volumeGrad.addColorStop(0.5, 'rgba(0, 180, 220, 0.55)'); // Mid-tone cyan body
  volumeGrad.addColorStop(0.85, 'rgba(0, 120, 180, 0.7)'); // Darker edge for depth
  volumeGrad.addColorStop(1, 'rgba(0, 80, 140, 0.85)');    // Dark teal rim

  ctx.fillStyle = volumeGrad;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();

  // Draw all hex fills in one path - vibrant cyan fill
  ctx.fillStyle = 'rgba(0, 200, 235, 0.4)';
  ctx.beginPath();
  for (const cell of validCells) {
    const { x, y } = cell;
    ctx.moveTo(x + hexOffsets[0].x, y + hexOffsets[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(x + hexOffsets[i].x, y + hexOffsets[i].y);
    }
    ctx.closePath();
  }
  ctx.fill();

  // Draw all hex edges in one path - vibrant saturated cyan
  ctx.strokeStyle = `rgba(0, 220, 255, 0.9)`;
  ctx.lineWidth = Math.max(1.5, cellSize * 0.14);
  ctx.beginPath();
  for (const cell of validCells) {
    const { x, y } = cell;
    ctx.moveTo(x + hexOffsets[0].x, y + hexOffsets[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(x + hexOffsets[i].x, y + hexOffsets[i].y);
    }
    ctx.closePath();
  }
  ctx.stroke();

  // Draw corner node dots (sparse sampling)
  const dotRadius = cellSize * 0.06;
  ctx.fillStyle = `rgba(0, 200, 240, 0.5)`;
  ctx.beginPath();
  for (const cell of validCells) {
    const { x, y } = cell;
    for (let i = 0; i < 6; i += 2) {
      const nx = x + hexOffsets[i].x;
      const ny = y + hexOffsets[i].y;
      ctx.moveTo(nx + dotRadius, ny);
      ctx.arc(nx, ny, dotRadius, 0, Math.PI * 2);
    }
  }
  ctx.fill();

  ctx.restore(); // end honeycomb group



  // ── Energy pulse rings (inside clip, subtle) ─────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.55 * alpha;
  ctx.translate(cx, cy);
  ctx.strokeStyle = `rgba(0, 190, 230, 0.7)`;
  ctx.lineWidth = Math.max(1.2, R * 0.009);
  for (let i = 0; i < 2; i++) {
    const phase = now / 900 + i * 1.2;
    const radiusA = R * (0.42 + i * 0.28);
    ctx.beginPath();
    ctx.arc(0, 0, radiusA, phase, phase + Math.PI * 0.36);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore(); // END CLIP REGION

  // ── EDGE GLOW — integrated luminous ring at the sphere boundary ───────────
  // Uses screen blend + animated shimmer + gradient stroke to feel like part of the sphere
  // OPTIMIZATION: Quantize shimmer to every ~3 frames (avoids per-frame Math.sin)
  _shimmerFrame++;
  if (_shimmerFrame >= 3) {
    _shimmerFrame = 0;
    _shimmerValue = 0.82 + 0.18 * Math.sin(now / 280);
  }
  const shimmer = _shimmerValue;



  // Crisp edge ring — clean border instead of blurry glow
  ctx.save();
  ctx.globalAlpha = alpha * shimmer;
  ctx.strokeStyle = 'rgba(0, 210, 245, 0.95)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

}

/**
 * Cronos Pre-Activate Barrier Effect
 * A glowing honeycomb barrier that surrounds Cronos when his sphere is about to activate.
 * Matches the aesthetic of drawCronosSphereVisual — hexagonal, cyan glow, pulsing.
 */
export function drawCronosPreActivateBarrier({
  ctx,
  cx,
  cy,
  radius = 55,
  preProgress = 1,   // 0 = just started warning, 1 = about to activate
  now = Date.now(),
}) {
  // OPTIMIZATION: LOD gate — skip barrier entirely at low FPS/quality
  const qualityLevel = (typeof state !== 'undefined' && state.qualityLevel) || 1.0;
  const fps = (typeof state !== 'undefined' && state.fps) || 60;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1';

  const useLOD = false;

  const p = Math.min(1, Math.max(0, preProgress));
  const R = radius;

  // Use module-level cached hex trig
  const cosAngles = _DRAW_HEX_COS;
  const sinAngles = _DRAW_HEX_SIN;

  // ── Outer glow (fresnel-like) — reduced from 4 to 3 gradient stops ───────
  ctx.save();
  const pulseIntensity = 0.5 + 0.5 * Math.sin(now / 180);
  const glowAlpha = (0.5 + 0.3 * p) * pulseIntensity;
  const glow = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.4);
  // Vibrant dark cyan
  glow.addColorStop(0, `rgba(0,200,230,${glowAlpha * 1.5})`);
  glow.addColorStop(0.5, `rgba(0,140,180,${glowAlpha * 1.0})`);
  glow.addColorStop(1, 'rgba(0,140,180,0)'); // Fade to transparent cyan, not black
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Inner energy core ───────────────────────────────────────────────────
  ctx.save();
  const coreAlpha = (0.6 + 0.4 * p) * pulseIntensity;
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.85);
  // Vibrant dark cyan
  core.addColorStop(0, `rgba(0,220,240,${coreAlpha * 1.5})`);
  core.addColorStop(0.3, `rgba(0,180,210,${coreAlpha * 1.2})`);
  core.addColorStop(0.7, `rgba(0,120,160,${coreAlpha * 0.9})`);
  core.addColorStop(1, 'rgba(0,120,160,0)'); // Fade to transparent cyan, not black
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Primary barrier shell outline ────────────────────────────────────────
  ctx.save();
  // OPTIMIZED: Removed shadowBlur (expensive operation)
  ctx.globalAlpha = (0.5 + 0.3 * p) * pulseIntensity;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.92, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(0, 243, 255, ${(0.5 + 0.3 * p) * pulseIntensity})`;
  ctx.lineWidth = 2 + pulseIntensity;
  ctx.stroke();
  ctx.restore();

  // Outer thin ring
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.97, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(100, 220, 255, ${(0.15 + 0.1 * p) * pulseIntensity})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // OPTIMIZATION: Skip rotating energy arcs at low quality
  if (!useLOD) {
    // ── Rotating energy arcs ────────────────────────────────────────────────
    const rot = now / 400;
    const arcW = Math.PI / 4;
    ctx.save();
    ctx.globalAlpha = (0.5 + 0.3 * p) * pulseIntensity;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.05, rot, rot + arcW);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const rot2 = -now / 650;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.1, rot2, rot2 + arcW * 0.5);
    ctx.strokeStyle = `rgba(0, 200, 255, 0.3)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // ── Honeycomb grid clipped to shell ──────────────────────────────────────
  // OPTIMIZED: Single-pass rendering with cached distances
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.75 * pulseIntensity;
  ctx.translate(cx, cy);
  ctx.rotate(now / 2000);

  const cellSize = Math.max(9, R * 0.18);
  const shellRadius = R * 0.92;

  const cacheKeyBarrier = `barrier_${Math.round(R)}`;
  let barrierData = _cronosGridCache.get(cacheKeyBarrier);

  if (!barrierData) {
    const colCount = Math.ceil(shellRadius / (cellSize * 1.75)) + 1;
    const rowCount = Math.ceil(shellRadius / (cellSize * 1.52)) + 1;
    const cellOffsetX = cellSize * 1.75;
    const cellOffsetY = cellSize * 1.52;
    const minDist = shellRadius * 0.1;
    const maxDist = shellRadius * 0.98;

    // Pre-compute hex vertex offsets
    const hexOffsets = [];
    for (let i = 0; i < 6; i++) {
      hexOffsets.push({ x: cosAngles[i] * cellSize, y: sinAngles[i] * cellSize });
    }

    // OPTIMIZED: Pre-calculate valid cells once, cache distances
    const validCells = [];
    for (let row = -rowCount; row <= rowCount; row++) {
      for (let col = -colCount; col <= colCount; col++) {
        const x = col * cellOffsetX + (row % 2 ? cellOffsetX * 0.5 : 0);
        const y = row * cellOffsetY;
        const dist = Math.hypot(x, y);
        if (dist > maxDist || dist < minDist) continue;
        validCells.push({ x, y, dist });
      }
    }
    barrierData = { hexOffsets, validCells };
    _cronosGridCache.set(cacheKeyBarrier, barrierData);
  }

  const { hexOffsets, validCells } = barrierData;

  // Batch 1: Fill cells
  ctx.fillStyle = 'rgba(10, 30, 60, 0.65)';
  ctx.beginPath();
  for (const cell of validCells) {
    const { x, y } = cell;
    ctx.moveTo(x + hexOffsets[0].x, y + hexOffsets[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(x + hexOffsets[i].x, y + hexOffsets[i].y);
    }
    ctx.closePath();
  }
  ctx.fill();

  // Batch 2: Hex edges
  ctx.strokeStyle = `rgba(0, 243, 255, 0.65)`;
  ctx.lineWidth = Math.max(0.8, cellSize * 0.1);
  ctx.beginPath();
  for (const cell of validCells) {
    const { x, y } = cell;
    ctx.moveTo(x + hexOffsets[0].x, y + hexOffsets[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(x + hexOffsets[i].x, y + hexOffsets[i].y);
    }
    ctx.closePath();
  }
  ctx.stroke();

  // OPTIMIZED: Draw corner node dots only at alternate vertices
  const dotRadius = cellSize * 0.06;
  ctx.fillStyle = `rgba(0, 243, 255, 0.5)`;
  ctx.beginPath();
  for (const cell of validCells) {
    const { x, y } = cell;
    for (let i = 0; i < 6; i += 2) {
      const nx = x + hexOffsets[i].x;
      const ny = y + hexOffsets[i].y;
      ctx.moveTo(nx + dotRadius, ny);
      ctx.arc(nx, ny, dotRadius, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.restore();

  // ── Energy pulse rings ───────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = (0.4 + 0.3 * p) * pulseIntensity;
  ctx.translate(cx, cy);
  for (let i = 0; i < 2; i++) {
    const phase = now / 900 + i * 1.0;
    const radiusA = shellRadius * (0.45 + i * 0.2);
    ctx.beginPath();
    ctx.arc(0, 0, radiusA, phase, phase + Math.PI * 0.3);
    ctx.strokeStyle = i % 2 === 0 ? `rgba(0, 243, 255, 0.4)` : `rgba(255, 0, 127, 0.25)`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();

  // ── Hexagonal node points at shell ────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = (0.35 + 0.3 * p) * pulseIntensity;
  ctx.translate(cx, cy);
  ctx.rotate(now / 2600);
  const nodeCount = 6;
  ctx.fillStyle = 'rgba(180, 255, 255, 0.75)';
  ctx.beginPath();
  for (let i = 0; i < nodeCount; i++) {
    const nodeAngle = (i / nodeCount) * Math.PI * 2;
    const nx = Math.cos(nodeAngle) * shellRadius;
    const ny = Math.sin(nodeAngle) * shellRadius;
    ctx.moveTo(nx + R * 0.02, ny);
    ctx.arc(nx, ny, R * 0.02, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

// ── Cronos Sphere Impact Burst ─────────────────────────────────────────────
// Called when Cronos unleashes his sphere. Matches the sphere's cyan/honeycomb style.
export function drawCronosSphereImpact({ ctx, cx, cy, radius, impactProgress, now }) {
  const p = Math.min(1, Math.max(0, impactProgress));
  const R = radius;
  const baseAlpha = Math.max(0, 1 - p * 1.8);

  // Simple central pulse
  if (baseAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = baseAlpha * 0.5;
    ctx.fillStyle = '#00F3FF';
    ctx.beginPath();
    ctx.arc(cx, cy, R * (0.2 + p * 0.45), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Single expanding ring
  const ringAlpha = Math.max(0, 1 - p * 1.4);
  if (ringAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = ringAlpha;
    ctx.strokeStyle = '#AAFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R * (0.35 + p * 1.3), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Low-cost ripple ring
  const rippleAlpha = Math.max(0, 1 - p * 2.4);
  if (rippleAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = rippleAlpha * 0.5;
    ctx.strokeStyle = '#00F3FF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R * (0.55 + p * 0.8), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Simple particle burst
  const dotCount = 6;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - p * 2.2);
  ctx.fillStyle = '#00F3FF';
  for (let i = 0; i < dotCount; i++) {
    const angle = (i / dotCount) * Math.PI * 2 + now / 500;
    const dist = R * (0.45 + p * 0.7);
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    const size = 1.2 + (1 - p) * 0.6;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Light energy arcs
  const arcAlpha = Math.max(0, 0.4 - p * 1.5);
  if (arcAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = arcAlpha;
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.6)';
    ctx.lineWidth = 1.2;
    const arcRadius = R * (0.4 + p * 0.8);
    for (let i = 0; i < 2; i++) {
      const arcAngle = (i / 2) * Math.PI * 2 + now / 280;
      ctx.beginPath();
      ctx.arc(cx, cy, arcRadius, arcAngle, arcAngle + Math.PI * 0.35);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawProjectiles() {
  const ctx = state.ctx;
  const projectiles = getProjectiles();
  const now = getNow(); // Cache time once for all projectiles

  // View culling - define arena bounds with padding
  const arena = CONFIG.arena;
  const cullPadding = 50;
  const minX = arena.x - cullPadding;
  const maxX = arena.x + arena.width + cullPadding;
  const minY = arena.y - cullPadding;
  const maxY = arena.y + arena.height + cullPadding;

  projectiles.forEach((p) => {
    // Skip off-screen projectiles for performance
    if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
      return;
    }
    if (p.isExplosion) {
      if (p.isGlassShard) {
        const lifeRatio = p.life / p.maxLife;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.scale(lifeRatio, lifeRatio);

        ctx.beginPath();
        ctx.moveTo(0, -p.r);
        ctx.lineTo(p.r * 0.8, p.r * 0.8);
        ctx.lineTo(-p.r * 0.8, p.r * 0.3);
        ctx.closePath();

        ctx.fillStyle = `rgba(255, 255, 255, ${lifeRatio * 0.8})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(180, 255, 180, ${lifeRatio})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
        return;
      }

      // Save/restore to ensure no clip regions from previous drawings (like Cronos sphere) affect explosion rendering
      ctx.save();
      drawBomberExplosionGraphic(p);
      ctx.restore();
      return;
    }

    // ── POISON SPILL: boiling liquid pool with foam, bubbles, and surface texture ──
    if (p.isPoisonSpill) {
      const lifeRatio = Math.max(0, Math.min(1, p.life / (p.maxLife || 1)));
      const fadeAlpha = lifeRatio;
      const baseRadius = p.r;
      const now = Date.now();

      ctx.save();

      // ── Layer 1: Dark base shadow ───────────────────────────────────────────
      ctx.globalAlpha = fadeAlpha * 0.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, baseRadius * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = '#0d2b0d';
      ctx.fill();

      // ── Layer 2: Main liquid pool with irregular boiling edge ─────────────────
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

      // ── Layer 4: Boiling surface bubbles (popping and rising) ─────────────────
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

      // ── Layer 5: Surface ripples (expanding circles from random points) ────────
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

      // ── Layer 6: Foam patches on surface ─────────────────────────────────────
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

      // ── Layer 7: Inner glow core ─────────────────────────────────────────────
      ctx.globalAlpha = fadeAlpha * 0.4;
      const coreGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, baseRadius * 0.4);
      coreGrad.addColorStop(0, 'rgba(200,255,200,0.6)');
      coreGrad.addColorStop(1, 'rgba(77,255,77,0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, baseRadius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    if (p.isGrenade) {
      // Draw tail trail
      if (p.history && p.history.length > 0) {
        ctx.beginPath();
        ctx.moveTo(p.history[0].x, p.history[0].y - p.history[0].z);
        for (let i = 1; i < p.history.length; i++) {
          ctx.lineTo(p.history[i].x, p.history[i].y - p.history[i].z);
        }
        ctx.lineTo(p.x, p.y - p.z);
        ctx.strokeStyle = 'rgba(77, 255, 77, 0.4)';
        ctx.lineWidth = p.r * 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }

      // Draw shadow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fill();

      // Draw grenade as a tumbling poison bottle
      ctx.save();
      ctx.translate(p.x, p.y - p.z);

      // Make the bottle tumble through the air
      // Base rotation direction on velocity
      const spinDirection = p.vx >= 0 ? 1 : -1;
      ctx.rotate((p.maxLife - p.life) * 0.25 * spinDirection);

      // Draw the bottle
      drawPoisonBottleCore(ctx, 0.9);
      ctx.restore();
      return;
    }

    // ── C4 EXPLOSIVE: high-quality military C4 charge ──────────────────────
    if (p.isC4) {
      const sparkPhase = (now / 200) % (Math.PI * 2);
      const rotation = p.rotation || 0;
      const zHeight = p.z || 0;

      // Get trail points if available
      const trailPoints = p.history || [];

      // Draw the high-quality C4
      drawBomberC4(ctx, p.x, p.y, p.r, {
        rotation: rotation,
        sparkPhase: sparkPhase,
        trailPoints: trailPoints,
        shadowAlpha: 0.25,
        zHeight: zHeight,
        isDeathC4: p.isDeathC4 || false,
        pulseIntensity: 1,
      });
      return;
    }

    if (p.isFlame) {
      // Skip individual flame drawing - flames are batched in drawFlames()
      // This improves performance by reducing draw calls
      return;
    }

    if (p.isBomberGrenade) {
      // ── HIGH-QUALITY GRENADE DRAWING ─────────────────────────────────────
      // Use the detailed grenade renderer from bomberWeaponGraphics.js
      const zOffset = p.z || 0;
      const sparkPhase = Date.now() / 100;

      // Get trail points for arc visualization
      const trailPoints = p.history ? p.history.slice(-6) : [];

      // Calculate rotation based on velocity for tumbling effect
      const rotation = Math.atan2(p.vy || 0, p.vx || 0) + Math.PI / 4;

      // Shadow alpha based on height
      const shadowAlpha = Math.max(0.1, 0.3 - zOffset * 0.01);

      // Draw the high-quality grenade
      drawBomberGrenade(ctx, p.x, p.y, p.r, {
        rotation: rotation,
        isSticky: p.isSticky || false,
        sparkPhase: sparkPhase,
        trailPoints: trailPoints,
        shadowAlpha: shadowAlpha,
        zHeight: zOffset,
      });

      return;
    }

    if (p.isC4) {
      const now = Date.now();
      const pulse = Math.sin(now / 150 + p.pulsePhase) * 0.15 + 1;
      const lifeRatio = p.life / p.maxLife;
      const urgency = 1 - lifeRatio;

      // Draw pulsing glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 1.5 * pulse, 0, Math.PI * 2);
      const glowColor = p.isDeathC4 ? `rgba(255, 0, 0, ${0.3 + urgency * 0.4})` : `rgba(255, 68, 68, ${0.3 + urgency * 0.4})`;
      ctx.fillStyle = glowColor;
      ctx.fill();

      // Draw C4 body
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw blinking light
      const blinkPhase = Math.sin(now / 100) > 0;
      ctx.beginPath();
      ctx.arc(p.x + p.r * 0.4, p.y - p.r * 0.3, 3, 0, Math.PI * 2);
      ctx.fillStyle = blinkPhase ? '#FF0000' : '#660000';
      ctx.fill();

      // Draw "C4" text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C4', p.x, p.y);

      // Draw countdown ring for death C4
      if (p.isDeathC4) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 5, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * lifeRatio));
        ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + urgency * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      return;
    }

    // Black hole visuals are now drawn in drawBlackHoleEffects() which is called BEFORE fighters
    // This ensures blackholes appear behind fighters instead of overlaying them
    if (p.isBlackHole) {
      return;
    }

    // Sword projectile visual
    if (p.visual === 'sword') {
      const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
      const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
      const angle = Math.atan2(vy, vx);
      // scale down a bit relative to typical fighter radius
      const owner = state.fighters && state.fighters[p.owner];
      const scale = owner ? Math.max(0.5, owner.r / 24) : 0.9;
      drawGraySwordProjectile(ctx, p.x, p.y, angle, scale);
      return;
    }

    // Shuriken projectile visual
    if (p.visual === 'shuriken') {
      const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
      const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
      const angle = Math.atan2(vy, vx);
      // Add rotation for spinning effect
      const spinAngle = angle + (Date.now() / 100) % (Math.PI * 2);
      const owner = state.fighters && state.fighters[p.owner];
      const scale = owner ? Math.max(0.6, owner.r / 25) : 0.8;
      drawShurikenProjectile(ctx, p.x, p.y, spinAngle, scale);
      return;
    }

    // Gun Slinger bullet visual - detailed brass/copper revolver bullets
    if (p.visual === 'gunslingerBullet') {
      const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
      const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
      const angle = Math.atan2(vy, vx);
      const owner = state.fighters && state.fighters[p.owner];
      const scale = owner ? Math.max(0.7, owner.r / 22) : 1.0;
      const lifeRatio = Math.max(0.3, (p.life || 30) / (p.maxLife || 30));

      drawGunSlingerBullet(ctx, p.x, p.y, angle, scale, lifeRatio);
      return;
    }

    // Engineer bullet visual - brass tracer rounds with hot glow trail
    if (p.visual === 'EngineerBullet') {
      const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
      const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
      const angle = Math.atan2(vy, vx);
      const owner = state.fighters && state.fighters[p.owner];
      const scale = owner ? Math.max(0.6, owner.r / 20) : 0.9;
      const lifeRatio = Math.max(0.4, (p.life || 40) / (p.maxLife || 40));

      drawEngineerBullet(ctx, p.x, p.y, angle, scale, lifeRatio);
      return;
    }

    if (p.visual === 'turretBullet') {
      const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
      const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
      const angle = Math.atan2(vy, vx);
      const owner = state.fighters && state.fighters[p.owner];
      const scale = owner ? Math.max(0.6, owner.r / 20) : 0.9;
      const lifeRatio = Math.max(0.4, (p.life || 40) / (p.maxLife || 40));

      drawTurretBullet(ctx, p.x, p.y, angle, scale, lifeRatio);
      return;
    }

    // Add rangerBullet handler
    if (p.visual === 'rangerBullet') {
      drawRangerBullet(ctx, p);
      return;
    }

    // Default projectile draw
    // Make projectile visuals depend on the owner projectile color/type.
    // RED: red-orange motion trail; BLUE: cyan “laser-ish” streak.
    const isRed = (p.color && p.color.toLowerCase().includes('ff4d4d')) ||
      (p.color && p.color.toLowerCase().includes('ff') && p.color.toLowerCase().includes('4d'));
    const isBlue = (p.color && p.color.toLowerCase().includes('4da3ff')) ||
      (p.color && p.color.toLowerCase().includes('a3') && p.color.toLowerCase().includes('ff'));

    if (p.history && p.history.length > 1 && (isRed || isBlue)) {
      ctx.save();
      // Removed 'lighter' composite operation so trails stay visible on white

      // Trail polyline
      ctx.beginPath();
      const first = p.history[0];
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < p.history.length; i++) {
        const pt = p.history[i];
        ctx.lineTo(pt.x, pt.y);
      }

      const tailAlpha = isBlue ? 0.28 : 0.35;
      ctx.strokeStyle = isBlue ? 'rgba(0, 220, 255, 0.95)' : p.color;
      ctx.globalAlpha = tailAlpha;
      ctx.lineWidth = Math.max(1.2, p.r * 0.9);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Stronger glow core along last segment
      const prev = p.history[p.history.length - 2];
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(1.6, p.r * 1.35);
      ctx.stroke();

      ctx.restore();
    }

    // Projectile body core
    ctx.save();
    // Removed 'lighter' composite operation so it doesn't wash out to white

    const outerGlow = isBlue ? 'rgba(0, 220, 255, 0.10)' : 'rgba(255, 80, 80, 0.12)';
    const coreGlow = isBlue ? 'rgba(0, 240, 255, 0.22)' : 'rgba(255, 120, 120, 0.22)';

    // outer glow
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 2.0, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow;
    ctx.fill();

    // main core
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    
    // Add dark stroke so it stands out against the white background
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // extra cyan/red-ish inner bloom
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = coreGlow;
    ctx.globalAlpha = 0.9;
    ctx.fill();

    ctx.restore();
  });
}

// ─────────────────────────────────────────────
// DRAW — BLACK HOLE EFFECTS (drawn BEFORE fighters)
// ─────────────────────────────────────────────

export function drawBlackHoleEffects() {
  const ctx = state.ctx;
  const projectiles = getProjectiles();
  const now = Date.now();

  projectiles.forEach((p) => {
    if (!p.isBlackHole) return;

    // Check if this is a transformed black hole or a projectile about to transform
    if (p.transformed) {
      // Calculate fade-in and fade-out
      const maxLife = CONFIG.black.blackHoleDuration || 180;
      const fadeInDuration = 30;
      const fadeOutDuration = 30;

      let alpha = 1;
      if (p.life > maxLife - fadeOutDuration) {
        // Fade out
        alpha = (p.life - (maxLife - fadeOutDuration)) / fadeOutDuration;
      } else if (maxLife - p.life < fadeInDuration) {
        // Fade in
        alpha = (maxLife - p.life) / fadeInDuration;
      }

      // If summoned just now, show a larger pulsing ring that fades in/out
      if (p.indicatorTimer > 0) {
        const ip = p.indicatorTimer / (p.indicatorLife || 1);
        const ringProgress = 1 - ip; // grows as timer decreases
        const ringRadius = p.r * (1 + 0.8 + ringProgress * 1.4);
        ctx.save();
        ctx.globalAlpha = Math.max(0, ip * 0.95);
        ctx.beginPath();
        ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(204,102,255,${0.85 * ip})`;
        ctx.lineWidth = 4 * (0.6 + ringProgress * 1.4);
        ctx.stroke();
        ctx.restore();
      }

      // Unified black hole renderer (exact visual pipeline)
      const eventHorizon = Math.max(1, p.r * 0.28);
      const innerDiskR = p.r * 0.40;
      const outerDiskR = p.r * 0.95;

      drawBlackHoleVisual({
        ctx,
        p,
        alpha,
        now: p.visualTime || now,
        eventHorizon,
        innerDiskR,
        outerDiskR,
        progress: 1,
        rotateAngle: 0,
        indicator: true,
      });
    } else {
      // Unified black hole renderer (exact visual pipeline) for pre-transform phase
      // progress 0..1 (0 = just spawned, 1 = about to transform)
      const initial = p.initialTransformTimer || (Math.floor((p.life || 30) / 3) || 12);
      const progress = Math.min(1, Math.max(0, 1 - (p.transformTimer || 0) / initial));

      // Keep projectile-size interpolation (so it still reads as a projectile),
      // but render using the exact same element pipeline.
      const alpha = 0.78 + 0.20 * progress;

      const eventHorizon = Math.max(2.2, p.r * (0.62 + progress * 0.22));
      const innerDiskR = p.r * (1.10 + progress * 0.35);
      const outerDiskR = p.r * (2.45 + progress * 0.85);

      const angle = Math.atan2(p.vy || 0, p.vx || 1);
      const animTime = p.visualTime || now;

      // Subtle projectile tilt so it still feels like it's moving.
      // The hole art itself stays identical; only the local canvas transform changes.
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle + Math.sin(animTime / 360) * 0.18);
      ctx.scale(1.35, 0.58);
      ctx.rotate(animTime / 520);
      ctx.translate(-p.x, -p.y);

      drawBlackHoleVisual({
        ctx,
        p,
        alpha,
        now: animTime,
        eventHorizon,
        innerDiskR,
        outerDiskR,
        progress,
        rotateAngle: 0,
        indicator: false,
      });
      ctx.restore();

      // Projectile motion lensing trail (keep separate from the hole renderer)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 4.5, p.y - p.vy * 4.5);
      ctx.strokeStyle = `rgba(153,0,255,${0.18 + 0.08 * progress})`;
      ctx.lineWidth = Math.max(1, p.r * 0.55);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }
  });
}

// ─────────────────────────────────────────────
// DRAW — ALL FIGHTERS
// ─────────────────────────────────────────────

export function drawFighters() {
  const { ctx, fighters, mode } = state;
  // Removed debug overlay hiding to prevent DOM layout thrashing

  // Draw team indicators for 2v2 mode before drawing fighters
  if (mode === '2v2') {
    fighters.forEach((fighter, fi) => {
      if (!fighter || fighter.hp <= 0) return;
      const team = state.getFighterTeam(fi);
      if (team === null) return;

      const teamColor = team === 0 ? '#ff4d4d' : '#4da3ff';

      ctx.save();
      ctx.translate(fighter.x, fighter.y);

      // Draw team indicator ring
      ctx.beginPath();
      ctx.arc(0, 0, fighter.r + 8, 0, Math.PI * 2);
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.7;
      ctx.stroke();

      // Draw team silhouette/glow
      ctx.beginPath();
      ctx.arc(0, 0, fighter.r + 4, 0, Math.PI * 2);
      ctx.fillStyle = teamColor;
      ctx.globalAlpha = 0.2;
      ctx.fill();

      ctx.restore();
    });
  }

  fighters.forEach((fighter, fi) => {
    if (!fighter || fighter.hp <= 0) return;
    const opponent = mode === 'FFA' ? null : fighters[1 - fi];
    try {
      fighter.draw(ctx, opponent);
    } catch (e) {
      console.error('fighter.draw error:', e);
    }
  });

  // Draw time-stop visual effect (Cronos passive/sphere effect)
  fighters.forEach((fighter) => {
    if (!fighter || fighter.hp <= 0 || !fighter.timeStopTimer) return;

    // Draw cyan glowing stasis effect
    ctx.save();
    ctx.translate(fighter.x, fighter.y);

    const time = Date.now() / 200;
    const pulse = Math.sin(time * 2) * 0.5 + 0.5;

    // Outer stasis ring
    ctx.beginPath();
    ctx.arc(0, 0, fighter.r + 4 + pulse * 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 243, 255, ${0.5 + pulse * 0.5})`;
    ctx.lineWidth = 2.5;
    // OPTIMIZED: Removed shadowBlur (expensive operation)
    ctx.stroke();

    // Inner stasis overlay
    ctx.beginPath();
    ctx.arc(0, 0, fighter.r + 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 243, 255, ${0.15 + pulse * 0.15})`;
    ctx.fill();

    // Floating stasis particles / tick marks (like a clock)
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / 4 + time * 0.5);
      ctx.beginPath();
      ctx.moveTo(0, -fighter.r - 6);
      ctx.lineTo(0, -fighter.r - 14);
      ctx.strokeStyle = '#00F3FF';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    // Core freeze overlay
    ctx.beginPath();
    ctx.arc(0, 0, fighter.r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, 0.2)`;
    ctx.fill();

    ctx.restore();
  });

  fighters.forEach((fighter) => {
    if (!fighter || fighter.hp <= 0 || typeof fighter._drawAttackSlashEffects !== 'function') return;
    try {
      fighter._drawAttackSlashEffects(ctx);
    } catch (e) {
      console.error('fighter slash effect draw error:', e);
    }
  });

  fighters.forEach((fighter, fi) => {
    if (!fighter || fighter.hp <= 0) return;
    // Ensure backstab mark is rendered even if a subclass didn't call super.draw()
    if (fighter.backstabMarkTimer && fighter.backstabMarkTimer > 0) {
      const progress = fighter.backstabMarkTimer / (CONFIG.darkslategray.backstabMarkDuration || 45);
      const offset = fighter.r + 10;
      const bx = fighter.x - Math.cos(fighter.angle) * offset;
      const by = fighter.y - Math.sin(fighter.angle) * offset;

      ctx.save();
      ctx.globalAlpha = Math.min(1, progress * 1.2);
      ctx.fillStyle = '#ff44ff';
      ctx.beginPath();
      ctx.arc(bx, by, 6 + (1 - progress) * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(bx, by);
      ctx.rotate(fighter.angle + Math.PI);
      ctx.fillStyle = 'rgba(255,68,255,0.9)';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Removed backmark-debug DOM overlay to prevent per-frame layout thrashing

      // decrement timer so it fades
      fighter.backstabMarkTimer = Math.max(0, fighter.backstabMarkTimer - 1);
    }
  });
}

// ─────────────────────────────────────────────
// DRAW — FUEL PICKUPS
// ─────────────────────────────────────────────

export function drawFuelPickups() {
  const { ctx, fuelPickups, fighters } = state;

  // Only draw fuel pickups if an Orange fighter is currently alive in the arena.
  const hasOrange = fighters.some(f => f && f.hp > 0 && f._def.type === 'orange');
  if (!hasOrange) return;

  fuelPickups.forEach(pickup => {
    if (!pickup.active) return;

    ctx.save();

    // Pulsing effect
    const pulse = 0.85 + Math.sin(pickup.pulsePhase) * 0.15;
    const r = pickup.radius * pulse; // base radius for scaling

    // ── Outer glow ──
    const glowGrad = ctx.createRadialGradient(pickup.x, pickup.y, r * 0.6, pickup.x, pickup.y, r * 2.2);
    glowGrad.addColorStop(0, 'rgba(255, 180, 30, 0.5)');
    glowGrad.addColorStop(0.5, 'rgba(255, 120, 0, 0.25)');
    glowGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // ── Battery dimensions ──
    const bw = r * 1.6;   // battery body width (half)
    const bh = r * 1.1;   // battery body height (half)
    const br = r * 0.35;  // corner radius
    const nx = pickup.x;  // center x
    const ny = pickup.y;  // center y

    // ── Battery body (rounded rectangle) ──
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    roundedRect(ctx, nx - bw, ny - bh, bw * 2, bh * 2, br);
    ctx.fill();

    // ── Body metallic gradient overlay ──
    const bodyGrad = ctx.createLinearGradient(nx - bw, ny - bh, nx + bw, ny + bh);
    bodyGrad.addColorStop(0, '#6e6e6e');
    bodyGrad.addColorStop(0.3, '#8a8a8a');
    bodyGrad.addColorStop(0.5, '#b0b0b0');
    bodyGrad.addColorStop(0.7, '#8a8a8a');
    bodyGrad.addColorStop(1, '#5a5a5a');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    roundedRect(ctx, nx - bw + 1.5, ny - bh + 1.5, bw * 2 - 3, bh * 2 - 3, br - 1);
    ctx.fill();

    // ── Positive terminal nub (top) ──
    const nubW = r * 0.35;
    const nubH = r * 0.45;
    ctx.fillStyle = '#c0c0c0';
    ctx.beginPath();
    roundedRect(ctx, nx - nubW, ny - bh - nubH, nubW * 2, nubH, r * 0.15);
    ctx.fill();
    // nub highlight
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    roundedRect(ctx, nx - nubW + 1, ny - bh - nubH + 1, nubW * 2 - 2, nubH * 0.55, r * 0.1);
    ctx.fill();

    // ── Fuel level indicator (colored bar inside battery) ──
    const fuelRatio = 0.75; // pickups are always "full" looking
    const barPad = r * 0.25;
    const barX = nx - bw + barPad;
    const barY = ny - bh + barPad;
    const barW = (bw * 2 - barPad * 2) * fuelRatio;
    const barH = bh * 2 - barPad * 2;

    // Bar background (dark empty portion)
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    roundedRect(ctx, barX, barY, bw * 2 - barPad * 2, barH, r * 0.12);
    ctx.fill();

    // Bar fill (green-to-orange gradient = energy)
    const barGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    barGrad.addColorStop(0, '#4caf50');
    barGrad.addColorStop(0.5, '#ff9800');
    barGrad.addColorStop(1, '#ff5722');
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    roundedRect(ctx, barX, barY, barW, barH, r * 0.12);
    ctx.fill();

    // ── Small "F" label on the bar ──
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(r * 0.55)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('F', nx, ny);

    // ── Battery outline ──
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundedRect(ctx, nx - bw, ny - bh, bw * 2, bh * 2, br);
    ctx.stroke();

    ctx.restore();
  });
}

// Helper: draw a rounded rectangle path
function roundedRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ─────────────────────────────────────────────
// DRAW — FLOATING TEXT LABELS
// ─────────────────────────────────────────────

export function drawFloatingTexts() {
  const { ctx } = state;

  const texts = state.floatingTexts;
  if (!texts || texts.length === 0) return;

  // Build new array without expired texts (avoids splice O(n) in loop)
  const activeTexts = [];
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    t.timer++;
    t.y += t.vy;
    t.vy *= 0.96; // gradually decelerate upward drift

    const progress = t.timer / t.maxTimer;
    let alpha;
    if (progress < 0.15) {
      alpha = progress / 0.15;
    } else if (progress > 0.65) {
      alpha = 1 - (progress - 0.65) / 0.35;
    } else {
      alpha = 1;
    }

    if (t.timer < t.maxTimer) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.strokeText(t.text, t.x, t.y);

      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillText(t.text, t.x + 1, t.y + 1); // Subtle drop shadow

      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
      activeTexts.push(t);
    }
  }

  // Replace array reference
  state.floatingTexts = activeTexts;
}

// ─────────────────────────────────────────────
// DRAW — FLAMES (Batched for Performance)
// ─────────────────────────────────────────────

/**
 * Draw all flame projectiles to the dedicated flame canvas.
 * This batches all flame drawing operations for better performance.
 */
export function drawFlames() {
  const projectiles = getProjectiles();
  const flames = projectiles.filter(p => p.isFlame);

  if (flames.length === 0) {
    clearFlameCanvas();
    return;
  }

  // Draw all flames to the offscreen flame canvas
  drawFlamesToCanvas(flames);
}

// ─────────────────────────────────────────────
// DRAW — ILLUSIONS (Doppleganger)
// ─────────────────────────────────────────────

export function drawIllusions() {
  const { ctx, illusions } = state;

  for (const illusion of illusions) {
    // Illusions don't fade out based on duration anymore - they persist until death
    // But we can add a subtle visual effect to show age if desired
    const age = CONFIG.doppleganger.illusionDuration - (illusion.duration || 0);
    const ageRatio = Math.min(1, age / CONFIG.doppleganger.illusionDuration);

    // Slight transparency increase as illusion ages (visual only, not removal)
    const baseAlpha = 0.7;
    const ageAlpha = baseAlpha - (ageRatio * 0.2); // Fade from 0.7 to 0.5 alpha over time

    ctx.save();
    ctx.globalAlpha = ageAlpha;

    // Draw illusion body
    ctx.translate(illusion.x, illusion.y);
    ctx.rotate(illusion.angle);

    ctx.beginPath();
    const animTime = illusion.animationTime || Date.now();

    // Draw the haze and void core UNDER the body
    drawDopplegangerBodyEffect(ctx, 0, 0, illusion.r, 0, 'under', animTime);

    // Custom body skin
    drawDoppelgangerSkin(ctx, 0, 0, illusion.r, 0, animTime);

    // Draw the swirling violet smoke OVER the body
    drawDopplegangerBodyEffect(ctx, 0, 0, illusion.r, 0, 'over', animTime);

    // Draw status overlays (shock, poison, burn)
    if (typeof illusion.drawStatusOverlays === 'function') {
      illusion.drawStatusOverlays(ctx, illusion.r);
    }

    // Draw illusion outline (optional if you still want an outline over the custom skin)
    ctx.beginPath();
    ctx.arc(0, 0, illusion.r, 0, Math.PI * 2);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw illusion health
    ctx.rotate(-illusion.angle);
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const hpText = Math.floor(illusion.hp).toString();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeText(hpText, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(hpText, 0, 0);

    ctx.restore();

    // Draw illusion sword (always visible, not just during swings)
    drawDopplegangerPurpleSword(
      ctx,
      illusion.x, illusion.y,
      illusion.gunAngle || illusion.swordSwingAngle || 0,
      illusion.r,
      illusion.swordSwingActive,
      illusion.swordSwingTimer,
      illusion.swordSwingAngle,
      illusion.swordSwingDuration,
      animTime
    );
  }
}

export function drawAllCronosSpheres(ctx) {
  // OPTIMIZATION: Skip sphere drawing entirely at very low FPS
  const fps = (typeof state !== 'undefined' && state.fps) || 60;
  const qualityLevel = (typeof state !== 'undefined' && state.qualityLevel) || 1.0;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1';


  const now = getNow();
  for (const fighter of state.fighters) {
    if (!fighter || !fighter.sphereActive) continue;
    const elapsed = CONFIG.cronos.sphereDuration - fighter.sphereTimer;
    const deployProgress = Math.min(1, Math.max(0, elapsed / Math.max(1, CONFIG.cronos.sphereDuration)));

    try {
      if (typeof drawCronosSphereVisual === 'function') {
        drawCronosSphereVisual({
          ctx,
          cx: fighter.sphereX,
          cy: fighter.sphereY,
          radius: CONFIG.cronos.sphereRadius,
          alpha: 0.9,
          deployProgress,
          now,
        });
      }
    } catch (e) {
      console.error('Error in drawAllCronosSpheres:', e);
    }
  }
}

