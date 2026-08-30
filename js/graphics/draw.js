export { drawFuelPickups } from './renderers/arenaRenderer.js';
export { drawBlackHoleEffects, drawFloatingTexts, drawUltimateChannelingTexts, drawFlames, drawGenosSpeedLines, drawMahoragaSpeedLines, drawNanamiSpeedLines, drawSaitamaSpeedLines, drawIchigoBankaiSpeedLines, drawTodoTakadaIdolScreenOverlay } from './renderers/effectsRenderer.js';
export { drawFighters, drawIllusions } from './renderers/EntityRenderer.js';
export { drawDriveBys, drawDriveByGroundEffects } from '../systems/cjDriveBySystem.js';
export { drawBamEffects, spawnBamEffect, updateBamEffects, clearBamEffects } from './particles/bamImpactEffect.js';
export { drawFloatingJetpacks, spawnDroppedJetpack, updateFloatingJetpacks, clearFloatingJetpacks } from './particles/cjFloatingJetpack.js';
export { drawDroppedMiniguns, spawnDroppedMinigun, updateDroppedMiniguns, clearDroppedMiniguns } from './particles/cjDroppedMinigun.js';
export { drawCarExplosions, drawCarScorchMarks, spawnCarExplosion, updateCarExplosions, clearCarExplosions } from './particles/cjCarExplosion.js';
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
import { drawEngineerBullet, drawTurret, drawTurretBullet, drawDispenser, drawDispenserTetherBeam, drawDispenserHealingRing } from './weapons/engineerWeaponGraphics.js';
import { drawBomberExplosionGraphic, drawBomberGrenade, drawGrenadeTrail, drawBomberC4 } from './weapons/bomberWeaponGraphics.js';
import { drawThermobaricExplosions as modDrawThermobaricExplosions } from './renderers/explosionRenderer.js';
import { CONFIG, GUN_TIP_DIST } from '../core/config.js';
import { initFlameCanvas, resizeFlameCanvas, drawFlamesToCanvas, clearFlameCanvas } from './canvasManager.js';
import { drawDeathEffects } from './particles/deathShatterEffect.js';
import { drawBloodEffects } from './particles/bloodEffect.js';
import { drawDroppedMagazines } from './particles/johnWickDroppedMagazine.js';
import { drawIllusionDeathEffects } from './particles/illusionDeathEffect.js';
import { drawIllusionSpawnEffects } from './particles/illusionSpawnEffect.js';
import { drawBerserkerRageEffects } from './particles/berserkerRageEffect.js';
import { drawSparkEffects } from './particles/sparkEffect.js';
import { drawDoppelgangerDeathEffects } from '../graphics/particles/doppelgangerDeathEffect.js';
import { drawCrimsonSniperBullet } from './weapons/crimsonsniperWeaponGraphics.js';
import { projectileSystem } from '../systems/projectileSystem.js';
import { drawThunderboltShape } from './weapons/zeusWeaponGraphics.js';
import { drawLapseBlueOrb, drawGojoOrb, drawPurpleOrbTrail } from './weapons/gojoWeaponGraphics.js';
import { drawArena, drawPurpleDimScreen, drawTojiUltimateOverlay, drawMahoragaAdaptationDimScreen, drawMahoragaLevel8DimScreen, drawSaitamaSeriousPunchDimScreen, drawNanamiRatioCritDimScreen, drawBankaiImpactDimScreen } from './renderers/arenaRenderer.js';
import { drawStormDimScreen, drawFurnaceDimScreen, drawRikaSummonDimScreen, drawMahitoDomainOverlay, drawCjSanAndreasAtmosphere, drawCjBaguvixDimScreen } from './renderers/environmentalRenderer.js';
import { drawGenosSelfDestructDimScreen } from './renderers/effectsRenderer.js';
import { drawDopplegangerBodyEffect, drawDopplegangerPurpleSword } from './weapons/dopplegangerWeaponGraphics.js';
import { drawDoppelgangerSkin } from './fighters/doppelgangerSkin.js';
export { drawCjSkin } from './fighters/cjSkin.js';
export { drawTojiSkin, drawTojiGhostSkin } from './fighters/tojiSkin.js';
export { drawMegumiSkin, drawMegumiGhostSkin } from './fighters/megumiSkin.js';
export { drawMegumiShadowBlade, drawMegumiDagger, drawMegumiSlashArc } from './weapons/megumiWeaponGraphics.js';
export { drawUryuSkin, drawUryuGhostSkin } from './fighters/uryuSkin.js';
export { drawUryuBow } from './weapons/uryuWeaponGraphics.js';
export { drawUlquiorraSkin, drawUlquiorraGhostSkin } from './fighters/ulquiorraSkin.js';
export { drawUlquiorraMurcielago, drawLanzaDelRelampago, drawUlquiorraSlashArc } from './weapons/ulquiorraWeaponGraphics.js';
export { drawYutaSkin, drawYutaGhostSkin } from './fighters/yutaSkin.js';
export { drawSukunaBody, drawSukunaPixelBody } from './fighters/sukunaSkin.js';
export { drawEngineerSkin } from './fighters/engineerSkin.js';
export { spawnGetsugaHitEffect, drawGetsugaImpactEffects, updateGetsugaImpactEffects, clearGetsugaImpactEffects } from './particles/getsugaImpactEffect.js';


import { drawProjectiles as modDrawProjectiles, drawBlackHoleVisual } from './renderers/projectileRenderer.js';
import { drawDivineFlameArrowConstruct } from './weapons/sukunaWeaponGraphics.js';

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
export { drawStormDimScreen, drawFurnaceDimScreen, drawRikaSummonDimScreen, drawMahitoDomainOverlay, drawCjSanAndreasAtmosphere, drawCjBaguvixDimScreen };
export { drawArena, drawPurpleDimScreen, drawTojiUltimateOverlay, drawMahoragaAdaptationDimScreen, drawMahoragaLevel8DimScreen, drawSaitamaSeriousPunchDimScreen, drawNanamiRatioCritDimScreen, drawBankaiImpactDimScreen };
export { drawDeathEffects, drawDoppelgangerDeathEffects, drawBloodEffects, drawDroppedMagazines, drawIllusionDeathEffects, drawIllusionSpawnEffects, drawBerserkerRageEffects, drawSparkEffects };
export { drawGenosSelfDestructDimScreen };
export { drawSoulDisfigurementEffect, drawSoulDisfigurementCounter } from './statusEffects.js';

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
  const useLOD = (typeof state !== 'undefined' && state.mode === 'FFA') || isMulti && (qualityLevel < 1.0 || fps < 55);
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

  const useLOD = (typeof state !== 'undefined' && state.mode === 'FFA') || isMulti && (qualityLevel < 1.0 || fps < 55);

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

export function drawAllCronosSpheres(ctx) {
  if (typeof state !== 'undefined' && state.pixiApp) return;
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

export function drawThinIceBreakerDimScreen() {
  const { ctx, canvas } = state;
  if (!ctx || !canvas || !state.thinIceBreakerDimTimer || state.thinIceBreakerDimTimer <= 0) return;

  const maxTimer = 18;
  const progress = state.thinIceBreakerDimTimer / maxTimer;
  // Flash instantly, then smoothly fade out to 0 using a power curve
  const opacity = 0.65 * Math.pow(progress, 1.8);

  ctx.save();
  // Reset the transform temporarily to prevent edge gaps during screen shakes
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Deep dark spatial blue/gray overlay
  ctx.fillStyle = `rgba(3, 12, 20, ${opacity})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  
  state.globalDimEdgeColor = `rgba(3, 12, 20, ${opacity})`;
}

