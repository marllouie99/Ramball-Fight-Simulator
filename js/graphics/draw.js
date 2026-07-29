// ——————————————————————————————————————————————————————
// DRAW — ARENA
// ——————————————————————————————————————————————————————
import { state, getProjectiles } from '../core/state.js';
import { TricksterCronosTheme } from '../entities/fighters/trickster/tricksterThemes.js';
import { drawShurikenProjectile, drawGraySwordProjectile, drawPoisonBottleCore, drawRedSniperGun, drawBlueAimbotGun } from './weaponVisuals.js';
import { flamewardenFlameSystem } from './weapons/flamewardenWeaponGraphics.js';

let _shimmerFrame = 0;
let _shimmerValue = 1;
import { drawRangerBullet } from './weapons/rangerWeaponGraphics.js';
import { drawGunSlingerBullet, drawGunSlingerMuzzleFlash } from './weapons/gunSlingerWeaponGraphics.js';
import { drawEngineerBullet, drawTurret, drawTurretBullet } from './engineerWeaponGraphics.js';
import { drawBomberExplosionGraphic, drawBomberGrenade, drawGrenadeTrail, drawBomberC4 } from './weapons/bomberWeaponGraphics.js';
import { drawThermobaricExplosions as modDrawThermobaricExplosions } from './renderers/explosionRenderer.js';
import { CONFIG, GUN_TIP_DIST } from '../core/config.js';
import { initFlameCanvas, resizeFlameCanvas, drawFlamesToCanvas, clearFlameCanvas } from './canvasManager.js';
import { drawDeathEffects } from './particles/deathShatterEffect.js';
import { drawBloodEffects } from './particles/bloodEffect.js';
import { drawIllusionDeathEffects } from './particles/illusionDeathEffect.js';
import { drawIllusionSpawnEffects } from './particles/illusionSpawnEffect.js';
import { drawBerserkerRageEffects } from './particles/berserkerRageEffect.js';
import { drawSparkEffects } from './particles/sparkEffect.js';
import { drawDoppelgangerDeathEffects } from '../graphics/particles/doppelgangerDeathEffect.js';
import { drawCrimsonSniperBullet } from './weapons/crimsonsniperWeaponGraphics.js';
import { projectileSystem } from '../systems/projectileSystem.js';
import { drawThunderboltShape } from './weapons/zeusWeaponGraphics.js';
import { drawLapseBlueOrb, drawGojoOrb, drawPurpleOrbTrail } from './weapons/gojoWeaponGraphics.js';
import { drawArena, drawPurpleDimScreen, drawTojiUltimateOverlay, drawMahoragaAdaptationDimScreen } from './renderers/arenaRenderer.js';
import { drawStormDimScreen, drawFurnaceDimScreen, drawRikaSummonDimScreen } from './renderers/environmentalRenderer.js';
import { drawDopplegangerBodyEffect, drawDopplegangerPurpleSword } from './weapons/dopplegangerWeaponGraphics.js';
import { drawDoppelgangerSkin } from './fighters/doppelgangerSkin.js';

import { drawProjectiles as modDrawProjectiles, drawDivineFlameArrowConstruct, drawBlackHoleVisual } from './renderers/projectileRenderer.js';

let _cachedTime = 0;
let _sortedFightersBuffer = [];
let _fugaLocalTrailPool = [];

const _DRAW_HEX_COS = Array.from({ length: 6 }, (_, i) => Math.cos((i * Math.PI) / 3 + Math.PI / 6));
const _DRAW_HEX_SIN = Array.from({ length: 6 }, (_, i) => Math.sin((i * Math.PI) / 3 + Math.PI / 6));

const _cronosGridCache = new Map();

export function resetCachedTime() {
  _cachedTime = 0;
}

export function getNow() {
  if (!_cachedTime) _cachedTime = Date.now();
  return _cachedTime;
}

export { drawDivineFlameArrowConstruct };
export { drawStormDimScreen, drawFurnaceDimScreen, drawRikaSummonDimScreen };
export { drawArena, drawPurpleDimScreen, drawTojiUltimateOverlay, drawMahoragaAdaptationDimScreen };
export { drawDeathEffects, drawDoppelgangerDeathEffects, drawBloodEffects, drawIllusionDeathEffects, drawIllusionSpawnEffects, drawBerserkerRageEffects, drawSparkEffects };

export function drawCronosSphereVisual({
  ctx,
  cx,
  cy,
  radius,
  alpha = 1,
  deployProgress = 1,
  now = Date.now(),
  frozenCount = 0,  // number of frozen projectiles for LOD
  theme = null,
}) {
  // OPTIMIZATION: Aggressive LOD based on FPS and quality
  const qualityLevel = (typeof state !== 'undefined' && state.qualityLevel) || 1.0;
  const fps = (typeof state !== 'undefined' && state.fps) || 60;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Stand Off' && state.mode !== 'Training';
  const useLOD = isMulti && (qualityLevel < 1.0 || fps < 55);
  const useUltraLOD = isMulti && (qualityLevel <= 0.5 || fps < 40);

  // Set up default theme if none is provided
  const t = theme || {
    lodOuterGlow: 'rgba(0, 220, 255, 0.8)',
    lodInnerFill: 'rgba(0, 255, 255, 0.25)',
    vol1: 'rgba(0, 255, 255, 0.15)',
    vol2: 'rgba(0, 210, 255, 0.20)',
    vol3: 'rgba(0, 150, 220, 0.35)',
    vol4: 'rgba(0, 80, 160, 0.55)',
    hexFill: 'rgba(0, 240, 255, 0.12)',
    hexEdge: 'rgba(0, 255, 255, 0.90)',
    hexDot: 'rgba(0, 255, 255, 0.8)',
    pulseRing: 'rgba(0, 255, 255, 0.6)',
    crispEdge: 'rgba(0, 255, 255, 0.95)'
  };

  // OPTIMIZATION: Skip complex sphere drawing at ultra low quality
  if (useUltraLOD) {
    // Simplified but extremely visible: thick blue ring with solid inner fill
    ctx.save();
    ctx.globalAlpha = alpha;
    // Outer glow ring
    ctx.strokeStyle = t.lodOuterGlow;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    // Solid inner fill
    ctx.fillStyle = t.lodInnerFill;
    ctx.fill();
    ctx.restore();
    return;
  }

  const p = Math.min(1, Math.max(0, deployProgress));
  const R = radius;

  // ── LOD: Use simplified rendering when many projectiles frozen ────────
  const lodCellSize = useLOD ? Math.max(30, R * 0.20) : Math.max(18, R * 0.13);

  // â”€â”€ Use module-level cached hex trig â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const cosAngles = _DRAW_HEX_COS;
  const sinAngles = _DRAW_HEX_SIN;

  // No outer glow - keeps the sphere crisp without blur


  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PERFECT CIRCULAR CLIP REGION â€” everything below is masked to a clean circle
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // ── Honeycomb grid (inside clipped region) ──────────────────────────
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);

  const cacheKey = `sphere_${Math.round(R)}_lod${useLOD ? 1 : 0}_v2`;
  let gridData = _cronosGridCache.get(cacheKey);

  if (!gridData) {
    const cellSize = lodCellSize;
    const cellOffsetX = cellSize * Math.sqrt(3);
    const cellOffsetY = cellSize * 1.5;
    const colCount = Math.ceil(R / cellOffsetX) + 1;
    const rowCount = Math.ceil(R / cellOffsetY) + 1;
    const minDist = 0;

    // Pre-compute hex vertex offsets
    const hexOffsets = [];
    for (let i = 0; i < 6; i++) {
      hexOffsets.push({ x: cosAngles[i] * cellSize, y: sinAngles[i] * cellSize });
    }

    // Build valid cells â€” clip() handles the circular boundary cleanly,
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
  volumeGrad.addColorStop(0, t.vol1);    // Bright luminous core
  volumeGrad.addColorStop(0.5, t.vol2);  // Mid-tone body
  volumeGrad.addColorStop(0.85, t.vol3); // Darker edge for depth
  volumeGrad.addColorStop(1, t.vol4);    // Dark rim

  ctx.fillStyle = volumeGrad;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();

  // Draw all hex fills in one path
  ctx.fillStyle = t.hexFill;
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

  // Draw all hex edges in one path
  ctx.strokeStyle = t.hexEdge;
  ctx.lineWidth = Math.max(1.0, cellSize * 0.05);
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
  ctx.fillStyle = t.hexDot;
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



  // â”€â”€ Energy pulse rings (inside clip, subtle) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ctx.save();
  ctx.globalAlpha = 0.55 * alpha;
  ctx.translate(cx, cy);
  ctx.strokeStyle = t.pulseRing;
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

  // â”€â”€ EDGE GLOW â€” integrated luminous ring at the sphere boundary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Uses screen blend + animated shimmer + gradient stroke to feel like part of the sphere
  // OPTIMIZATION: Quantize shimmer to every ~3 frames (avoids per-frame Math.sin)
  _shimmerFrame++;
  if (_shimmerFrame >= 3) {
    _shimmerFrame = 0;
    _shimmerValue = 0.82 + 0.18 * Math.sin(now / 280);
  }
  const shimmer = _shimmerValue;



  // Crisp edge ring â€” clean border instead of blurry glow
  ctx.save();
  ctx.globalAlpha = alpha * shimmer;
  ctx.strokeStyle = t.crispEdge;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

}

/**
 * Cronos Pre-Activate Barrier Effect
 * A glowing honeycomb barrier that surrounds Cronos when his sphere is about to activate.
 * Matches the aesthetic of drawCronosSphereVisual â€” hexagonal, cyan glow, pulsing.
 */
export function drawCronosPreActivateBarrier({
  ctx,
  cx,
  cy,
  radius = 55,
  preProgress = 1,   // 0 = just started warning, 1 = about to activate
  now = Date.now(),
  x,
  y,
  progress,
}) {
  // OPTIMIZATION: LOD gate â€” skip barrier entirely at low FPS/quality
  const qualityLevel = (typeof state !== 'undefined' && state.qualityLevel) || 1.0;
  const fps = (typeof state !== 'undefined' && state.fps) || 60;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Stand Off' && state.mode !== 'Training';

  const useLOD = isMulti && (qualityLevel < 1.0 || fps < 55);

  const finalX = cx !== undefined ? cx : (x !== undefined ? x : 0);
  const finalY = cy !== undefined ? cy : (y !== undefined ? y : 0);
  const finalProgress = preProgress !== undefined ? preProgress : (progress !== undefined ? progress : 1);
  cx = finalX;
  cy = finalY;

  const p = Math.min(1, Math.max(0, finalProgress));
  const R = radius;

  // Use module-level cached hex trig
  const cosAngles = _DRAW_HEX_COS;
  const sinAngles = _DRAW_HEX_SIN;

  // â”€â”€ Outer glow (fresnel-like) â€” reduced from 4 to 3 gradient stops â”€â”€â”€â”€â”€â”€â”€
  ctx.save();
  const pulseIntensity = 0.5 + 0.5 * Math.sin(now / 180);
  const glowAlpha = (0.6 + 0.4 * p) * pulseIntensity;
  const glow = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.4);
  // Vibrant dark cyan
  glow.addColorStop(0, `rgba(0,200,240,${Math.min(1, glowAlpha * 1.6)})`);
  glow.addColorStop(0.5, `rgba(0,150,200,${Math.min(1, glowAlpha * 1.2)})`);
  glow.addColorStop(1, 'rgba(0,150,200,0)'); // Fade to transparent cyan, not black
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // â”€â”€ Inner energy core â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ctx.save();
  const coreAlpha = (0.7 + 0.3 * p) * pulseIntensity;
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.85);
  // Vibrant dark cyan
  core.addColorStop(0, `rgba(0,220,250,${Math.min(1, coreAlpha * 1.6)})`);
  core.addColorStop(0.3, `rgba(0,180,220,${Math.min(1, coreAlpha * 1.3)})`);
  core.addColorStop(0.7, `rgba(0,130,180,${Math.min(1, coreAlpha * 1.0)})`);
  core.addColorStop(1, 'rgba(0,130,180,0)'); // Fade to transparent cyan, not black
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // â”€â”€ Primary barrier shell outline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.97, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(100, 220, 255, ${(0.15 + 0.1 * p) * pulseIntensity})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // OPTIMIZATION: Skip rotating energy arcs at low quality
  if (true) { // Always render rotating energy arcs for clear visibility
    // â”€â”€ Rotating energy arcs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Honeycomb grid clipped to shell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // OPTIMIZED: Single-pass rendering with cached distances
  ctx.save();
  // Removed 'screen' composite operation so barrier grid stays visible on white arena
  ctx.globalAlpha = Math.min(1, 0.9 * pulseIntensity);
  ctx.translate(cx, cy);
  ctx.rotate(now / 2000);

  const cellSize = Math.max(9, R * 0.18);
  const shellRadius = R * 0.92;

  const cacheKeyBarrier = `barrier_${Math.round(R)}_v2`;
  let barrierData = _cronosGridCache.get(cacheKeyBarrier);

  if (!barrierData) {
    const cellOffsetX = cellSize * Math.sqrt(3);
    const cellOffsetY = cellSize * 1.5;
    const colCount = Math.ceil(shellRadius / cellOffsetX) + 1;
    const rowCount = Math.ceil(shellRadius / cellOffsetY) + 1;
    const minDist = 0;
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

  // Batch 1: Fill cells (Light cyan tint so Cronos remains 100% visible inside barrier)
  ctx.fillStyle = 'rgba(0, 243, 255, 0.22)';
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
  ctx.strokeStyle = `rgba(0, 243, 255, 0.95)`;
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

  // â”€â”€ Energy pulse rings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Hexagonal node points at shell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Cronos Sphere Impact Burst â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  modDrawProjectiles();
}

// ──────────────────────────────────────────
// DRAW — BLACK HOLE EFFECTS (drawn BEFORE fighters)
// ──────────────────────────────────────────

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

  // Draw stuck shurikens on the walls
  if (projectileSystem.stuckShurikens && projectileSystem.stuckShurikens.length > 0) {
    projectileSystem.stuckShurikens.forEach(s => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, s.life / 60); // Fade out over the last 60 frames
      drawShurikenProjectile(ctx, s.x, s.y, s.angle, s.scale);
      ctx.restore();
    });
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DRAW â€” ALL FIGHTERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function drawFighters() {
  const { ctx, fighters, mode } = state;
  // Removed debug overlay hiding to prevent DOM layout thrashing

  // Helper to render team indicator ring for team modes (2v2 and 1v2 Stand Off)
  const isTeamMode = (mode === '2v2' || mode === '1v2 Stand Off' || mode === '1v2');

  const drawTeamRing = (fighter, fi, isOnTop = false) => {
    if (!isTeamMode || !fighter || fighter.hp <= 0) return;
    const team = state.getFighterTeam(fi);
    if (team === null) return;

    // In 1v2 mode, remove team indicator for the solo fighter (team 0)
    const is1v2Mode = (mode === '1v2 Stand Off' || mode === '1v2' || state.mode === '1v2 Stand Off' || state.mode === '1v2');
    if (is1v2Mode && team === 0) return;

    const teamColor = team === 0 ? '#ff4d4d' : '#4da3ff';

    const drawX = fighter.x;
    const drawY = fighter.y - (fighter.z || 0);

    ctx.save();
    ctx.translate(drawX, drawY);

    if (!isOnTop) {
      // Underfoot ground indicator (filled)
      ctx.beginPath();
      ctx.arc(0, 0, fighter.r + 8, 0, Math.PI * 2);
      ctx.fillStyle = teamColor;
      ctx.globalAlpha = 1.0;
      ctx.fill();
      
      // Crisp outline
      ctx.strokeStyle = '#000'; // Black outline for contrast
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1.0;
      ctx.stroke();

      // Draw team silhouette/glow
      ctx.beginPath();
      ctx.arc(0, 0, fighter.r + 4, 0, Math.PI * 2);
      ctx.fillStyle = teamColor;
      ctx.globalAlpha = 0.2;
      ctx.fill();
    } else {
      // Over-aura crisp team indicator ring overlay so Cursed Energy aura & domain effects never obscure team identity!
      ctx.beginPath();
      ctx.arc(0, 0, fighter.r + 9, 0, Math.PI * 2);
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 3.5;
      ctx.globalAlpha = 1.0;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, fighter.r + 11, 0, Math.PI * 2);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.8;
      ctx.stroke();
    }

    ctx.restore();
  };

  // Sort fighters by depth (y-coordinate) so characters lower on screen draw on top.
  // Exception: Fighters with an active domain expansion are forced to draw last (on top of everyone).
  if (!_sortedFightersBuffer || _sortedFightersBuffer.length !== fighters.length) {
    _sortedFightersBuffer = new Array(fighters.length);
    for (let i = 0; i < fighters.length; i++) _sortedFightersBuffer[i] = { f: null, i: 0 };
  }
  for (let i = 0; i < fighters.length; i++) {
    _sortedFightersBuffer[i].f = fighters[i];
    _sortedFightersBuffer[i].i = i;
  }
  _sortedFightersBuffer.sort((a, b) => {
    if (!a.f) return -1;
    if (!b.f) return 1;

    // Force active domain expansions to the top layer
    const aDomain = a.f.domainActive;
    const bDomain = b.f.domainActive;
    if (aDomain && !bDomain) return 1;
    if (!aDomain && bDomain) return -1;

    // Force active punchers/attackers/skill casters to render on top of their targets so punching hands & skill effects overlay opponent bodies
    const aPunching = (a.f.punchAnimTimer && a.f.punchAnimTimer > 0) || (a.f.isChannelingPurple) || (a.f.redEffectTimer && a.f.redEffectTimer > 0);
    const bPunching = (b.f.punchAnimTimer && b.f.punchAnimTimer > 0) || (b.f.isChannelingPurple) || (b.f.redEffectTimer && b.f.redEffectTimer > 0);
    if (aPunching && !bPunching) return 1;
    if (!aPunching && bPunching) return -1;

    return a.f.y - b.f.y;
  });

  _sortedFightersBuffer.forEach((item) => {
    const fighter = item.f;
    const fi = item.i;
    if (!fighter || fighter.hp <= 0) return;

    // Draw underfoot team indicator ring base
    drawTeamRing(fighter, fi, false);

    const opponent = mode === 'FFA' ? null : fighters[1 - fi];
    try {
      fighter.draw(ctx, opponent);
    } catch (e) {
      console.error('fighter.draw error:', e);
    }

    // Draw crisp team indicator overlay ring AFTER fighter & CE aura draw, so CE aura never hides team indicator
    drawTeamRing(fighter, fi, true);
  });

  // Draw time-stop visual effect (Cronos passive/sphere effect or Gojo Infinity freeze)
  const allStasisEntities = [
    ...(fighters || []),
    ...(state.illusions || [])
  ];

  allStasisEntities.forEach((entity) => {
    if (!entity || entity.hp <= 0) return;
    
    let isInfinityFreeze = entity.isFrozenByInfinity;
    const isMahoragaFreeze = entity.mahoragaAdaptationFreezeTimer > 0;
    // Suppress golden visual for short hit-pauses (< 15 frames) used in flurries like Sukuna's
    const isGenericTimeStop = entity.timeStopTimer > 0 && (entity._timeStopOriginalDuration || 0) >= 15;

    // Check if Gojo's Domain Expansion (Unlimited Void) is currently active and freezing everyone
    let gojoDomainActive = false;
    if (typeof state !== 'undefined' && state.fighters) {
      const gojo = state.fighters.find(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.domainActive);
      if (gojo) gojoDomainActive = true;
    }

    // Unlimited Void freeze uses the same Cyan Blue as Infinity, but shouldn't apply to Gojo himself
    if (gojoDomainActive && isGenericTimeStop) {
      if (entity.characterId !== 'gojo' && entity.type !== 'gojo') {
        isInfinityFreeze = true;
      }
    }

    if (!isInfinityFreeze && !isGenericTimeStop) return;
    if (entity._def?.type === 'sukuna' || entity._def?.id === 'sukuna' || entity._def?.name === 'Sukuna') return;

    // If Mahoraga paused time for adaptation (and it's not Gojo's infinity), don't draw an overlay
    if (isMahoragaFreeze && !isInfinityFreeze) return;

    const isCyanOverlay = isInfinityFreeze || entity.characterId === 'gojo' || entity.type === 'gojo';
    const colorFill = isCyanOverlay ? 'rgba(0, 229, 255, 0.65)' : 'rgba(255, 215, 0, 0.35)'; // Cyan for Gojo / Infinity, Gold for Cronos
    const colorRing = isCyanOverlay ? 'rgba(224, 255, 255, 0.9)' : 'rgba(255, 255, 150, 0.8)';

    ctx.save();
    ctx.translate(entity.x, entity.y - (entity.z || 0));

    const time = Date.now() / 200;
    const pulse = Math.sin(time * 2) * 0.5 + 0.5;

    // 1. Body fill overlay
    ctx.beginPath();
    ctx.arc(0, 0, entity.r + 3, 0, Math.PI * 2);
    ctx.fillStyle = colorFill;
    ctx.fill();

    // 2. Outer glowing stasis ring
    ctx.beginPath();
    ctx.arc(0, 0, entity.r + 4 + pulse * 4, 0, Math.PI * 2);
    ctx.strokeStyle = colorRing;
    ctx.lineWidth = 3.0;
    ctx.stroke();

    // Floating stasis particles / tick marks (like a clock)
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / 4 + time * 0.5);
      ctx.beginPath();
      ctx.moveTo(0, -entity.r - 6);
      ctx.lineTo(0, -entity.r - 14);
      ctx.strokeStyle = '#00F3FF';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

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

  // Draw beam overlays (LaserFighter / Trickster laser beams) on top of fighters
  fighters.forEach((fighter) => {
    if (!fighter || fighter.hp <= 0 || typeof fighter.drawBeamOverlay !== 'function') return;
    try {
      fighter.drawBeamOverlay(ctx);
    } catch (e) {
      console.error('fighter beam overlay draw error:', e);
    }
  });

  fighters.forEach((fighter, fi) => {
    if (!fighter || fighter.hp <= 0) return;
    // Ensure backstab mark is rendered even if a subclass didn't call super.draw()
    if (fighter.backstabMarkTimer && fighter.backstabMarkTimer > 0) {
      const progress = fighter.backstabMarkTimer / (CONFIG.darkslategray.backstabMarkDuration || 45);
      const offset = fighter.r + 10;
      const bx = fighter.x - Math.cos(fighter.angle) * offset;
      const by = (fighter.y - (fighter.z || 0)) - Math.sin(fighter.angle) * offset;

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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DRAW â€” FUEL PICKUPS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€ Outer glow â”€â”€
    const glowGrad = ctx.createRadialGradient(pickup.x, pickup.y, r * 0.6, pickup.x, pickup.y, r * 2.2);
    glowGrad.addColorStop(0, 'rgba(255, 180, 30, 0.5)');
    glowGrad.addColorStop(0.5, 'rgba(255, 120, 0, 0.25)');
    glowGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // â”€â”€ Battery dimensions â”€â”€
    const bw = r * 1.6;   // battery body width (half)
    const bh = r * 1.1;   // battery body height (half)
    const br = r * 0.35;  // corner radius
    const nx = pickup.x;  // center x
    const ny = pickup.y;  // center y

    // â”€â”€ Battery body (rounded rectangle) â”€â”€
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

// ──────────────────────────────────────────
// DRAW — FLOATING TEXT LABELS
// ──────────────────────────────────────────

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

// ──────────────────────────────────────────
// DRAW — FLAMES (Batched for Performance)
// ──────────────────────────────────────────

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

// ──────────────────────────────────────────
// DRAW — ILLUSIONS (Doppleganger)
// ──────────────────────────────────────────

export function drawIllusions() {
  const { ctx, illusions } = state;

  for (const illusion of illusions) {
    // Skip Rika - she is injected into the illusions array for AI targeting, but draws herself!
    if (illusion.isRika) continue;

    ctx.save();
    ctx.globalAlpha = 0.85;

    // Draw illusion body
    ctx.translate(illusion.x, illusion.y);
    ctx.rotate(illusion.angle || 0);

    // Purple ethereal glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(155, 89, 182, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, illusion.r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

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

    // Global hit flash visual effect
    if (illusion.hitFlashTimer > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(0, 0, illusion.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${illusion.hitFlashTimer / 8})`;
      ctx.fill();
      ctx.restore();
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
  const now = getNow();
  const allEntities = [...(state.fighters || []), ...(state.illusions || [])];
  for (const fighter of allEntities) {
    if (!fighter || !fighter.sphereActive) continue;
    const elapsed = CONFIG.cronos.sphereDuration - (fighter.sphereTimer || 0);
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
          theme: fighter.sphereTheme
        });
      }
    } catch (e) {
      console.error('Error in drawAllCronosSpheres:', e);
    }
  }
}

export function drawThermobaricExplosions(ctx) {
  modDrawThermobaricExplosions(ctx);
}

