// ─────────────────────────────────────────────
// DRAW — ARENA
// ─────────────────────────────────────────────
import { state, getProjectiles } from '../core/state.js';
import { TricksterCronosTheme } from '../entities/fighters/trickster/tricksterThemes.js';
import { drawShurikenProjectile, drawGraySwordProjectile, drawPoisonBottleCore, drawRedSniperGun, drawBlueAimbotGun } from './weaponVisuals.js';
import { drawRangerBullet } from './weapons/rangerWeaponGraphics.js';
import { drawGunSlingerBullet, drawGunSlingerMuzzleFlash } from './weapons/gunSlingerWeaponGraphics.js';
import { drawEngineerBullet, drawTurret, drawTurretBullet } from './engineerWeaponGraphics.js';
import { drawBomberExplosionGraphic, drawBomberGrenade, drawGrenadeTrail, drawBomberC4 } from './weapons/bomberWeaponGraphics.js';
import { drawDopplegangerPurpleSword, drawDopplegangerBodyEffect } from './weapons/dopplegangerWeaponGraphics.js';
import { drawDoppelgangerSkin } from './fighters/doppelgangerSkin.js';
import { drawTricksterBolt } from './weapons/tricksterWeaponGraphics.js';
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
  ctx.fillStyle = 'rgb(250, 250, 250)';
  ctx.fillRect(arena.x, arena.y, arena.width, arena.height);

  // Draw the arena boundary stroke
  ctx.strokeStyle = '#000000ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(arena.x, arena.y, arena.width, arena.height);
}

/**
 * Draws a purple dim screen overlay when Gojo's Hollow Purple orb is active.
 * The overlay opacity is based on the purple orb's remaining life/duration.
 */
export function drawPurpleDimScreen() {
  const { ctx, canvas, fighters } = state;
  
  // Find the active purple orb or a channeling Gojo
  const purpleOrb = getProjectiles().find(p => p.isGojoPurple && p.life > 0);
  const channelingGojo = fighters ? fighters.find(f => f.isChannelingPurple) : null;
  
  if (!purpleOrb && !channelingGojo) return;
  
  let opacity = 0;
  let centerX = canvas.width / 2;
  let centerY = canvas.height / 2;

  if (channelingGojo) {
    // Smoothly fade in the dark screen while Gojo is mixing Red and Blue
    const chargeRatio = channelingGojo.purpleChargeTimer / (channelingGojo.purpleChargeMax || 120);
    opacity = 0.5 * chargeRatio;
    centerX = channelingGojo.x;
    centerY = channelingGojo.y;
  } else if (purpleOrb) {
    // Calculate opacity based on remaining life (fade out as life decreases)
    const lifeRatio = purpleOrb.life / purpleOrb.maxLife;
    opacity = 0.5; // Much darker base opacity for dramatic effect
    if (lifeRatio < 0.5) {
      opacity = 0.5 * (lifeRatio / 0.5); // Fade from 0.5 to 0 as life goes from 50% to 0%
    }
    centerX = purpleOrb.x;
    centerY = purpleOrb.y;
  }
  
  // Don't draw if opacity is too low
  if (opacity < 0.01) return;
  
  // Create a purple radial gradient from the origin position
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, Math.max(canvas.width, canvas.height)
  );
  
  gradient.addColorStop(0, `rgba(138, 43, 226, ${opacity * 0.4})`);  // Bright purple at the center (Blue Violet)
  gradient.addColorStop(0.3, `rgba(75, 0, 130, ${opacity * 0.8})`);  // Indigo/Deep Purple
  gradient.addColorStop(0.6, `rgba(40, 0, 80, ${opacity * 1.2})`);   // Very dark purple
  gradient.addColorStop(1, `rgba(10, 0, 25, ${opacity * 1.5})`);     // Almost black purple at edges
  
  // Fill the entire canvas with the purple overlay
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Draws a dark dim screen overlay when Zeus is charging or casting his Storm ultimate.
 * The overlay opacity increases during charge, then stays at max while strikes are active.
 */
export function drawStormDimScreen() {
  const { ctx, canvas } = state;
  
  // Find Zeus fighters that are charging or actively storming
  const zeusStorming = state.fighters?.filter(f => 
    f && f._def?.type === 'zeus' && (f.isChargingStorm || f.stormActive)
  );
  
  // Also check if there are active storm strikes happening
  const hasActiveStrikes = state.zeusStormStrikes && state.zeusStormStrikes.length > 0;
  
  // If no Zeus is storming and no strikes active, don't draw the overlay
  if ((!zeusStorming || zeusStorming.length === 0) && !hasActiveStrikes) return;
  
  // Get the first Zeus fighter for reference
  const zeus = zeusStorming ? zeusStorming[0] : null;
  
  // Calculate opacity
  let opacity;
  if (zeus && zeus.isChargingStorm) {
    // During charge: opacity increases with charge progress
    const chargeProgress = 1.0 - (zeus.stormCooldown / (CONFIG.zeus.stormTelegraphFrames || 120));
    const dimOpacity = CONFIG.zeus.stormDimOpacity || 0.7;
    opacity = chargeProgress * dimOpacity;
  } else {
    // During active storm: always at max opacity
    opacity = CONFIG.zeus.stormDimOpacity || 0.7;
  }
  
  // Don't draw if opacity is too low
  if (opacity < 0.01) return;
  
  // Fill the entire canvas with a plain dark overlay
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Draws a dark fiery dim screen overlay with flame lightning when Sukuna channels or fires Furnace (Fuga).
 */
export function drawFurnaceDimScreen() {
  const { ctx, canvas } = state;
  if (!ctx || !canvas) return;

  // Find Sukuna fighters channeling Furnace
  const sukunaFuga = state.fighters?.find(f => 
    f && (f._def?.type === 'sukuna' || f._def?.name === 'Sukuna') && f.isChannelingDivineFlame
  );
  
  // Also check if Furnace fire arrow is actively flying
  const furnaceArrow = getProjectiles().find(p => (p.isSukunaFurnace || p.visual === 'sukunaFurnaceArrow') && p.life > 0);

  if (!sukunaFuga && !furnaceArrow) return;

  let opacity = 0.65;
  let cx = canvas.width / 2;
  let cy = canvas.height / 2;

  if (sukunaFuga) {
    const progress = Math.min(1.0, sukunaFuga.divineFlameChargeTimer / Math.max(1, sukunaFuga.divineFlameChargeMax));
    opacity = 0.25 + progress * 0.55;
    cx = sukunaFuga.x;
    cy = sukunaFuga.y;
  } else if (furnaceArrow) {
    opacity = 0.45;
    cx = furnaceArrow.x;
    cy = furnaceArrow.y;
  }

  if (opacity < 0.02) return;

  ctx.save();

  // Dark fiery vignette gradient centered on Sukuna/Arrow
  const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(canvas.width, canvas.height) * 0.95);
  grad.addColorStop(0, `rgba(255, 60, 0, ${opacity * 0.25})`);
  grad.addColorStop(0.3, `rgba(120, 20, 0, ${opacity * 0.65})`);
  grad.addColorStop(0.7, `rgba(30, 5, 2, ${opacity * 0.85})`);
  grad.addColorStop(1, `rgba(10, 2, 2, ${opacity * 0.95})`);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.restore();
}

/**
 * Draws Sukuna's Furnace (Fuga) Divine Flame Arrow Construct.
 * Long turbulent roaring fire trail with fluid curling patterns.
 * Color cascade: white → bright yellow → golden orange → deep orange → crimson.
 * Conveys supernatural speed, unstoppable momentum, and immense magical power.
 */
export function drawDivineFlameArrowConstruct(ctx, {
  x, y, angle, scale = 1.0, progress = 1.0, isFlying = false, time = Date.now() * 0.012
}) {
  if (progress <= 0) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  const notchX = -32 * progress;
  const tipX = 28 * progress;
  const totalLen = tipX - notchX;
  const headLen = 22 * progress;
  const headX = tipX - headLen;

  // 1. OUTMOST THERMAL HEAT DISTORTION AURA
  const auraR = (42 + progress * 28);
  const auraGrad = ctx.createRadialGradient(tipX * 0.2, 0, 4, tipX * 0.1, 0, auraR * 2.0);
  auraGrad.addColorStop(0, `rgba(255, 240, 160, ${0.5 * progress})`);
  auraGrad.addColorStop(0.25, `rgba(255, 140, 0, ${0.35 * progress})`);
  auraGrad.addColorStop(0.55, `rgba(200, 40, 0, ${0.18 * progress})`);
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.ellipse(tipX * 0.2, 0, auraR * 2.2, auraR * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Switch to ADDITIVE LIGHTING for hyper-realistic fire
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // ═══════════════════════════════════════════════════════════════
  // 2. ROARING FLAME TONGUES — long, turbulent, curling backward
  // Uses traveling wave + multi-frequency turbulence for fluid motion
  // ═══════════════════════════════════════════════════════════════
  const numTendrils = 16;
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

    // Color cascade from white-hot (near arrow) to crimson (tips)
    const tGrad = ctx.createLinearGradient(originX, 0, originX - flameLen, side * spread * 0.5);
    if (ratio < 0.3) {
      // Near tip: white → bright yellow core
      tGrad.addColorStop(0, `rgba(255, 255, 245, ${0.9 * progress})`);
      tGrad.addColorStop(0.3, `rgba(255, 245, 160, ${0.75 * progress})`);
      tGrad.addColorStop(0.6, `rgba(255, 180, 40, ${0.5 * progress})`);
      tGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');
    } else if (ratio < 0.6) {
      // Mid shaft: golden orange → deep orange
      tGrad.addColorStop(0, `rgba(255, 220, 80, ${0.85 * progress})`);
      tGrad.addColorStop(0.35, `rgba(255, 150, 10, ${0.7 * progress})`);
      tGrad.addColorStop(0.7, `rgba(230, 60, 0, ${0.4 * progress})`);
      tGrad.addColorStop(1, 'rgba(150, 15, 0, 0)');
    } else {
      // Rear: deep orange → crimson red
      tGrad.addColorStop(0, `rgba(255, 160, 30, ${0.75 * progress})`);
      tGrad.addColorStop(0.3, `rgba(220, 70, 0, ${0.55 * progress})`);
      tGrad.addColorStop(0.65, `rgba(160, 20, 0, ${0.3 * progress})`);
      tGrad.addColorStop(1, 'rgba(80, 5, 0, 0)');
    }
    ctx.fillStyle = tGrad;
    ctx.fill();
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. TWIN FIERY TAIL FLETCHING (Rear Plumes at notchX)
  // Wild streaming plumes that convey unstoppable momentum
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // 4. MOLTEN LAVA SHAFT & INCANDESCENT CORE
  // ═══════════════════════════════════════════════════════════════
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

  // Intricate Magma / Lava Crack Patterns along shaft
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

  // ═══════════════════════════════════════════════════════════════
  // 5. VOLCANIC OBSIDIAN MAGMA ARROWHEAD
  // ═══════════════════════════════════════════════════════════════
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

    const dripGrad = ctx.createRadialGradient(dripX, dripY, 0, dripX, dripY, 4 * progress);
    dripGrad.addColorStop(0, `rgba(255, 255, 220, ${progress})`);
    dripGrad.addColorStop(0.5, `rgba(255, 140, 0, ${0.9 * progress})`);
    dripGrad.addColorStop(1, 'rgba(180, 20, 0, 0)');
    ctx.fillStyle = dripGrad;
    ctx.fill();
  }

  // (D) Blinding White Nose Tip Flare
  const tipGlow = ctx.createRadialGradient(tipApexX, 0, 0, tipApexX, 0, 16 * progress);
  tipGlow.addColorStop(0, `rgba(255, 255, 255, ${progress})`);
  tipGlow.addColorStop(0.3, `rgba(255, 250, 200, ${0.9 * progress})`);
  tipGlow.addColorStop(0.6, `rgba(255, 200, 80, ${0.5 * progress})`);
  tipGlow.addColorStop(1, 'rgba(255, 90, 0, 0)');
  ctx.fillStyle = tipGlow;
  ctx.beginPath();
  ctx.arc(tipApexX, 0, 16 * progress, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // Restore globalCompositeOperation ('lighter')
  ctx.restore(); // Restore transform matrix
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

  const pulse = 1 + Math.sin(now / 220) * 0.05;

  ctx.save();
  ctx.globalAlpha = alpha;
  
  ctx.translate(p.x, p.y);

  // If rotateAngle is provided, use it (usually for the projectile phase).
  // Otherwise, a slight wobble to give it life without spinning like a pinwheel.
  let diskRot = rotateAngle;
  if (diskRot === null || diskRot === undefined) {
    diskRot = Math.sin(now / 2500) * 0.15;
  }
  ctx.rotate(diskRot);

  // High-frequency energy flickering/throbbing (feels more natural than position jitter)
  const energyFlicker = 1 + (Math.sin(now / 15) * 0.03 + Math.cos(now / 23) * 0.02);

  // 1. Large background nebula glow (purple)
  const glowGrad = ctx.createRadialGradient(0, 0, eventHorizon * 0.5, 0, 0, outerDiskR * 2.8 * energyFlicker);
  glowGrad.addColorStop(0, `rgba(180, 50, 255, 0.4)`);
  glowGrad.addColorStop(0.3, `rgba(130, 20, 255, 0.25)`);
  glowGrad.addColorStop(1, `rgba(80, 0, 180, 0)`);
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(0, 0, outerDiskR * 2.8 * energyFlicker, 0, Math.PI * 2);
  ctx.fill();

  // 2. The Horizontal Accretion Disk Flare (Interstellar style)
  ctx.globalCompositeOperation = 'screen';
  
  // Apply the intense flicker directly to the flare width/height
  const streakWidth = outerDiskR * 3.5 * pulse * energyFlicker;
  const streakHeight = eventHorizon * 0.35 * energyFlicker;
  
  ctx.save();
  ctx.scale(1, streakHeight / streakWidth);
  
  // Outer flare
  ctx.beginPath();
  ctx.arc(0, 0, streakWidth, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(140, 30, 255, 0.4)`;
  ctx.fill();

  // Mid flare
  ctx.beginPath();
  ctx.arc(0, 0, streakWidth * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(200, 100, 255, 0.6)`;
  ctx.fill();
  
  // Inner core flare
  ctx.beginPath();
  ctx.arc(0, 0, streakWidth * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 180, 255, 0.8)`;
  ctx.fill();
  
  ctx.restore();

  // Very thin bright center line extending outwards
  ctx.save();
  ctx.scale(1, (streakHeight * 0.08) / (streakWidth * 1.5));
  ctx.beginPath();
  ctx.arc(0, 0, streakWidth * 1.5 * energyFlicker, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
  ctx.fill();
  ctx.restore();

  // 3. The Photon Ring (Circular glow behind the event horizon)
  const ringR = eventHorizon * 1.15;
  ctx.beginPath();
  ctx.arc(0, 0, ringR, 0, Math.PI * 2);
  ctx.lineWidth = eventHorizon * 0.3;
  ctx.strokeStyle = `rgba(160, 40, 255, 0.6)`;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, eventHorizon * 1.08, 0, Math.PI * 2);
  ctx.lineWidth = eventHorizon * 0.12;
  ctx.strokeStyle = `rgba(230, 130, 255, 0.9)`;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, eventHorizon * 1.03, 0, Math.PI * 2);
  ctx.lineWidth = eventHorizon * 0.05;
  ctx.strokeStyle = `rgba(255, 255, 255, 1)`;
  ctx.stroke();
  
  ctx.globalCompositeOperation = 'source-over';

  // 4. Orbital swirling lines (thick, bright, 3D perspective, outside event horizon)
  ctx.globalCompositeOperation = 'screen'; 
  const lineCount = 8;
  for (let i = 0; i < lineCount; i++) {
    const orbitSpeed = (i % 2 === 0 ? 1 : -1) * (600 + i * 150);
    const orbitAngle = now / orbitSpeed + (i * Math.PI * 2) / lineCount;
    
    // X radius is large (accretion disk width)
    const orbitRadiusX = eventHorizon * 1.6 + (outerDiskR * 0.8) * (i / lineCount);
    
    // Y radius must be strictly larger than eventHorizon so it NEVER crosses the black hole!
    const orbitRadiusY = eventHorizon * 1.1 + (outerDiskR * 0.3) * (i / lineCount);
    
    const lineLength = Math.PI * 0.8 + 0.4 * Math.sin(now / 300 + i);
    
    ctx.beginPath();
    ctx.ellipse(0, 0, orbitRadiusX, orbitRadiusY, 0, orbitAngle, orbitAngle + lineLength);
    
    const lineAlpha = (0.6 + 0.4 * Math.sin(now / 200 + i)) * alpha;
    ctx.strokeStyle = `rgba(255, 180, 255, ${lineAlpha})`;
    ctx.lineWidth = Math.max(1, outerDiskR * 0.015); // Thinner elegant lines
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over'; 

  // 5. Small debris/pebbles getting sucked in
  const pebbleCount = Math.max(12, Math.min(25, Math.floor(outerDiskR * 0.25))); 
  for (let i = 0; i < pebbleCount; i++) {
    const timeOffset = i * 1337.5;
    const life = ((now + timeOffset) % 2000) / 2000;
    
    const dist = outerDiskR * 2.2 * (1 - Math.pow(life, 2)) + eventHorizon * 1.05;
    const ang = i * Math.PI * 2 / pebbleCount + life * Math.PI * 8 * (i % 2 === 0 ? 1 : -1);
    
    // Elliptical path that matches the swirling rings
    const px = Math.cos(ang) * dist;
    // Y is squished, but always maintains a safe distance from center
    const py = Math.sin(ang) * (eventHorizon * 1.05 + (dist - eventHorizon * 1.05) * 0.35);

    const fade = Math.sin(life * Math.PI); 

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(life * Math.PI * 15 + i);
    
    ctx.beginPath();
    const s = Math.max(2.5, outerDiskR * 0.035) * (1 - life * 0.3); 
    ctx.moveTo(-s, -s * 0.5);
    ctx.lineTo(s * 0.8, -s * 1.2);
    ctx.lineTo(s * 1.1, s * 0.7);
    ctx.lineTo(-s * 0.6, s);
    ctx.closePath();
    
    ctx.fillStyle = `rgba(220, 180, 255, ${0.95 * fade * alpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * fade * alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // 6. The Event Horizon (Pure Black Hole in the center)
  // Drawn last so it perfectly covers anything passing behind/into it
  ctx.beginPath();
  ctx.arc(0, 0, eventHorizon, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0, 0, 0, 1)`;
  ctx.fill();
  
  // 7. Some tiny stars/particles in the background glow for the "space" feel
  const starCount = Math.floor(outerDiskR * 0.3);
  for (let i = 0; i < starCount; i++) {
    const rand1 = Math.sin(p.x * 12.9898 + i) * 43758.5453;
    const rand2 = Math.cos(p.y * 78.233 + i) * 43758.5453;
    const rDist = eventHorizon * 1.5 + (outerDiskR * 1.5) * (Math.abs(rand1) % 1);
    const rAng = (Math.abs(rand2) % 1) * Math.PI * 2 + now / 2000;
    
    const twinkle = 0.5 + 0.5 * Math.sin(now / (200 + i * 50));
    
    ctx.beginPath();
    ctx.arc(Math.cos(rAng) * rDist, Math.sin(rAng) * rDist, Math.max(0.5, outerDiskR * 0.01) * twinkle, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + 0.6 * twinkle})`;
    ctx.fill();
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
  theme = null,
}) {
  // OPTIMIZATION: Aggressive LOD based on FPS and quality
  const qualityLevel = (typeof state !== 'undefined' && state.qualityLevel) || 1.0;
  const fps = (typeof state !== 'undefined' && state.fps) || 60;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1';
  const useLOD = isMulti && (qualityLevel < 1.0 || fps < 55);
  const useUltraLOD = isMulti && (qualityLevel <= 0.5 || fps < 40);

  // Set up default theme if none is provided
  const t = theme || {
    lodOuterGlow: 'rgba(0, 160, 200, 1.0)',
    lodInnerFill: 'rgba(0, 180, 220, 0.6)',
    vol1: 'rgba(0, 240, 255, 0.3)',
    vol2: 'rgba(0, 180, 220, 0.55)',
    vol3: 'rgba(0, 120, 180, 0.7)',
    vol4: 'rgba(0, 80, 140, 0.85)',
    hexFill: 'rgba(0, 200, 235, 0.4)',
    hexEdge: 'rgba(0, 220, 255, 0.9)',
    hexDot: 'rgba(0, 200, 240, 0.5)',
    pulseRing: 'rgba(0, 190, 230, 0.7)',
    crispEdge: 'rgba(0, 210, 245, 0.95)'
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



  // ── Energy pulse rings (inside clip, subtle) ─────────────────────────────
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

  const useLOD = isMulti && (qualityLevel < 1.0 || fps < 55);

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
      
      if (p.stoppedByCronosSphere || p.frozenByCronosSphere) {
         ctx.save();
         ctx.translate(p.x, p.y);
         ctx.rotate(angle);
         // Cyan time-stasis crystal casing around the sword
         ctx.fillStyle = 'rgba(0, 243, 255, 0.25)';
         ctx.strokeStyle = 'rgba(0, 243, 255, 0.7)';
         ctx.lineWidth = 2;
         ctx.beginPath();
         // Elongated ellipse matching the sword's profile
         ctx.ellipse(20 * scale, 0, 32 * scale, 10 * scale, 0, 0, Math.PI * 2);
         ctx.fill();
         ctx.stroke();
         // Inner bright core
         ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
         ctx.beginPath();
         ctx.ellipse(20 * scale, 0, 18 * scale, 4 * scale, 0, 0, Math.PI * 2);
         ctx.fill();
         ctx.restore();
      }
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

    // Sukuna slash visual - Crimson Black Crescent Blade Arc (Basic Attack)
    if (p.visual === 'sukunaSlash') {
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

      // Pitch black ink contour
      ctx.fillStyle = `rgba(0, 0, 0, ${0.92 * lifeRatio})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(0, 0, 0, ${0.95 * lifeRatio})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Vivid crimson inner crescent fill
      ctx.save();
      ctx.scale(0.85, 0.85);
      ctx.beginPath();
      ctx.arc(0, 0, r, -Math.PI * 0.52, Math.PI * 0.52, false);
      ctx.arc(r * 0.45, 0, r * 0.85, Math.PI * 0.48, -Math.PI * 0.48, true);
      ctx.closePath();
      ctx.fillStyle = `rgba(220, 10, 10, ${0.95 * lifeRatio})`;
      ctx.fill();
      ctx.restore();

      // Razor-sharp white crescent core line
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.98 * lifeRatio})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.95, -Math.PI * 0.48, Math.PI * 0.48, false);
      ctx.stroke();

      ctx.restore();
      return;
    }

    // Ghost Blade visual - Ethereal translucent blade with trailing effect
    if (p.visual === 'ghostBlade') {
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
      
      // Dark drop shadow for visibility against white background
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      
      // Crimson glow effect (outer blur)
      ctx.shadowColor = 'rgba(180, 30, 30, 0.8)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Ghost trail - fading afterimages behind the blade
      for (let i = 3; i >= 1; i--) {
        const trailAlpha = 0.15 * lifeRatio * (4 - i) / 3;
        const trailOffset = i * 8;
        ctx.save();
        ctx.translate(-trailOffset, 0);
        ctx.globalAlpha = trailAlpha;
        ctx.beginPath();
        // Crescent moon shape
        ctx.arc(0, 0, r, -Math.PI * 0.6, Math.PI * 0.6, false);
        ctx.arc(r * 0.5, 0, r * 0.8, Math.PI * 0.55, -Math.PI * 0.55, true);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 100, 100, 1)';
        ctx.fill();
        ctx.restore();
      }
      
      // Main ghost blade - crescent moon shape
      ctx.globalAlpha = 0.7 * lifeRatio;
      ctx.beginPath();
      ctx.arc(0, 0, r, -Math.PI * 0.6, Math.PI * 0.6, false);
      ctx.arc(r * 0.5, 0, r * 0.8, Math.PI * 0.55, -Math.PI * 0.55, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 180, 180, 1)';
      ctx.fill();
      
      // Sharp outer crescent edge
      ctx.strokeStyle = `rgba(255, 200, 200, ${0.95 * lifeRatio})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255, 100, 100, 0.9)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.98, -Math.PI * 0.58, Math.PI * 0.58, false);
      ctx.stroke();
      
      // Sharp inner crescent edge
      ctx.beginPath();
      ctx.arc(r * 0.5, 0, r * 0.78, Math.PI * 0.53, -Math.PI * 0.53, true);
      ctx.stroke();
      
      // Thin bright center line
      ctx.strokeStyle = `rgba(255, 220, 220, ${0.98 * lifeRatio})`;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, -Math.PI * 0.5, Math.PI * 0.5, false);
      ctx.stroke();

      ctx.restore();
      return;
    }

    // Sukuna Cleave visual - Pure White Slash with Dark Drop Shadow
    if (p.visual === 'sukunaCleave') {
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

      // Add dark drop shadow so the white blade stands out against the white arena
      ctx.shadowColor = `rgba(0, 0, 0, ${0.8 * lifeRatio})`;
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      const r = 24;
      
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
      return;
    }

    // Sukuna Furnace (Fuga) Arrow visual - supernatural velocity flame arrow with long turbulent roaring fire trail
    if (p.visual === 'sukunaFurnaceArrow' || p.isSukunaFurnace) {
      const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
      const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
      const angle = Math.atan2(vy, vx);
      const time = Date.now() * 0.012;
      const speed = Math.hypot(vx, vy);

      // Initialize trail history and particle systems
      if (!p._fugaFlameTimer) p._fugaFlameTimer = 0;
      p._fugaFlameTimer++;

      if (!p._trailHistory) p._trailHistory = [];
      if (!p.flameParticles) p.flameParticles = [];
      if (!p.emberParticles) p.emberParticles = [];

      // Record position trail for the long streaming fire wake
      p._trailHistory.push({ x: p.x, y: p.y, time: time });
      const maxTrailLen = 48;
      while (p._trailHistory.length > maxTrailLen) p._trailHistory.shift();

      // ── SPAWN FLAME BLOBS: Dense, long-lived, velocity-stretched ──
      for (let i = 0; i < 3; i++) {
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
          decay: 0.018 + Math.random() * 0.014,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.12 + Math.random() * 0.2,
          turbSeed: Math.random() * 100,
          layer: i % 3 // 0=white-core, 1=golden, 2=crimson-outer
        });
      }

      // ── SPAWN EMBERS: Glowing sparks that dissolve at trail end ──
      if (Math.random() < 0.85) {
        p.emberParticles.push({
          x: 5 - Math.random() * 25,
          y: (Math.random() - 0.5) * 20,
          vx: -(4 + Math.random() * 8 + speed * 0.18),
          vy: (Math.random() - 0.5) * 5.0,
          size: 1.0 + Math.random() * 2.0,
          life: 1.0,
          maxLife: 1.0,
          decay: 0.012 + Math.random() * 0.012,
          trail: []
        });
      }

      // Cap particles
      while (p.flameParticles.length > 120) p.flameParticles.shift();
      while (p.emberParticles.length > 40) p.emberParticles.shift();

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);

      // ═══════════════════════════════════════════════════════════════
      // LAYER 0: LONG TURBULENT FIRE WAKE (drawn from trail history)
      // A massive streaking energy wake that makes the arrow look
      // like it's ripping through the air and igniting everything
      // ═══════════════════════════════════════════════════════════════
      if (p._trailHistory.length > 3) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Convert trail history to local coordinates
        const cosA = Math.cos(-angle);
        const sinA = Math.sin(-angle);
        const localTrail = p._trailHistory.map(pt => {
          const dx = pt.x - p.x;
          const dy = pt.y - p.y;
          return { x: dx * cosA - dy * sinA, y: dx * sinA + dy * cosA };
        });

        // Draw multiple layered turbulent fire tongues along the trail
        for (let layer = 0; layer < 3; layer++) {
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
          const wakeGrad = ctx.createLinearGradient(trailStartX, 0, trailEndX, 0);

          if (layer === 0) {
            // Outermost: crimson → deep orange fade
            wakeGrad.addColorStop(0, `rgba(180, 30, 0, ${0.35})`);
            wakeGrad.addColorStop(0.3, `rgba(200, 50, 0, ${0.25})`);
            wakeGrad.addColorStop(0.7, `rgba(120, 15, 0, ${0.12})`);
            wakeGrad.addColorStop(1, 'rgba(60, 5, 0, 0)');
          } else if (layer === 1) {
            // Middle: golden orange → deep orange
            wakeGrad.addColorStop(0, `rgba(255, 180, 30, ${0.5})`);
            wakeGrad.addColorStop(0.25, `rgba(255, 120, 0, ${0.4})`);
            wakeGrad.addColorStop(0.6, `rgba(200, 40, 0, ${0.2})`);
            wakeGrad.addColorStop(1, 'rgba(100, 10, 0, 0)');
          } else {
            // Innermost core: white → bright yellow
            wakeGrad.addColorStop(0, `rgba(255, 255, 240, ${0.7})`);
            wakeGrad.addColorStop(0.15, `rgba(255, 240, 140, ${0.55})`);
            wakeGrad.addColorStop(0.4, `rgba(255, 180, 40, ${0.35})`);
            wakeGrad.addColorStop(1, 'rgba(200, 60, 0, 0)');
          }

          ctx.fillStyle = wakeGrad;
          ctx.fill();
        }
        ctx.restore();
      }

      // ═══════════════════════════════════════════════════════════════
      // LAYER 1: FLUID FLAME BLOBS — curling, twisting smoke-fire
      // ═══════════════════════════════════════════════════════════════
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (let i = p.flameParticles.length - 1; i >= 0; i--) {
        const fp = p.flameParticles[i];
        fp.life -= fp.decay;
        if (fp.life <= 0) { p.flameParticles.splice(i, 1); continue; }

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

        // Velocity-stretched ellipses (more elongated = more speed feel)
        const stretchX = curSize * (1.6 + speed * 0.03);
        const stretchY = curSize * (0.7 + ageRatio * 0.3);

        const pGrad = ctx.createRadialGradient(fp.x, fp.y + wobY, 0, fp.x, fp.y + wobY, Math.max(stretchX, stretchY));

        if (fp.layer === 0) {
          // White-hot core blobs (youngest, closest to arrow)
          pGrad.addColorStop(0, `rgba(255, 255, 250, ${alpha * 0.95})`);
          pGrad.addColorStop(0.3, `rgba(255, 245, 180, ${alpha * 0.8})`);
          pGrad.addColorStop(0.6, `rgba(255, 200, 60, ${alpha * 0.5})`);
          pGrad.addColorStop(1, 'rgba(255, 120, 0, 0)');
        } else if (fp.layer === 1) {
          // Golden-orange mid layer
          pGrad.addColorStop(0, `rgba(255, 220, 80, ${alpha * 0.85})`);
          pGrad.addColorStop(0.35, `rgba(255, 160, 20, ${alpha * 0.65})`);
          pGrad.addColorStop(0.7, `rgba(230, 80, 0, ${alpha * 0.35})`);
          pGrad.addColorStop(1, 'rgba(160, 20, 0, 0)');
        } else {
          // Crimson-red outer layer (oldest, farthest back)
          pGrad.addColorStop(0, `rgba(255, 140, 30, ${alpha * 0.7})`);
          pGrad.addColorStop(0.4, `rgba(220, 50, 0, ${alpha * 0.45})`);
          pGrad.addColorStop(0.8, `rgba(140, 15, 0, ${alpha * 0.2})`);
          pGrad.addColorStop(1, 'rgba(60, 0, 0, 0)');
        }

        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.ellipse(fp.x, fp.y + wobY, stretchX, stretchY, -0.1, 0, Math.PI * 2);
        ctx.fill();
      }

      // ═══════════════════════════════════════════════════════════════
      // LAYER 2: GLOWING EMBER SPARKS — dissolving at trail end
      // ═══════════════════════════════════════════════════════════════
      for (let i = p.emberParticles.length - 1; i >= 0; i--) {
        const ep = p.emberParticles[i];
        ep.life -= ep.decay;
        if (ep.life <= 0) { p.emberParticles.splice(i, 1); continue; }
        ep.trail.push({ x: ep.x, y: ep.y });
        if (ep.trail.length > 8) ep.trail.shift();
        ep.x += ep.vx;
        ep.y += ep.vy;
        ep.vy += (Math.random() - 0.5) * 0.4; // random drift
        const prog = ep.life / ep.maxLife;

        // Ember streak trail
        if (ep.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(ep.trail[0].x, ep.trail[0].y);
          for (let t = 1; t < ep.trail.length; t++) ctx.lineTo(ep.trail[t].x, ep.trail[t].y);
          ctx.lineTo(ep.x, ep.y);
          ctx.strokeStyle = `rgba(255, ${140 + prog * 115}, 40, ${prog * 0.6})`;
          ctx.lineWidth = ep.size * 0.7;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Bright ember head
        ctx.beginPath();
        ctx.arc(ep.x, ep.y, ep.size * (0.5 + prog * 0.8), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${200 + prog * 55}, ${120 + prog * 80}, ${prog})`;
        ctx.fill();
      }

      ctx.restore(); // lighter

      // ═══════════════════════════════════════════════════════════════
      // LAYER 3: TURBULENT AIR-RIP SHOCKWAVE LINES
      // Thin velocity lines showing air being torn apart
      // ═══════════════════════════════════════════════════════════════
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = 'rgba(255, 200, 100, 0.4)';
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

      ctx.restore(); // restore translate/rotate

      // Draw main Volcanic Magma Flame Arrow construct on top
      drawDivineFlameArrowConstruct(ctx, {
        x: p.x,
        y: p.y,
        angle,
        scale: 1.0,
        progress: 1.0,
        isFlying: true,
        time
      });

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

    // Crimson Sniper bullet
    if (p.visual === 'crimsonSniperBullet') {
      drawCrimsonSniperBullet(ctx, p, false);
      return;
    }
    if (p.visual === 'crimsonSniperBullet_enhanced') {
      drawCrimsonSniperBullet(ctx, p, true, false);
      return;
    }
    
    if (p.visual === 'tricksterSniperBullet_enhanced') {
      drawCrimsonSniperBullet(ctx, p, true, true);
      return;
    }

    // Zeus Chain Lightning Visual
    if (p.visual === 'chainLightning') {
      ctx.save();
      
      // Draw a bright glowing white core at the leading tip with a strong blue aura
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(0, 191, 255, 1)';
      ctx.fill();
      
      // Draw jagged trail with motion blur and thinning effect
      if (p.history && p.history.length > 1) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0, 191, 255, 1)'; // Strong light blue luminance
        ctx.lineCap = 'round';
        ctx.lineJoin = 'miter';
        
        // Loop from oldest (i=0) to newest (i = length-2)
        for (let i = 0; i < p.history.length - 1; i++) {
          // Rapidly thin out: older segments are thinner
          const progress = i / (p.history.length - 1);
          const thickness = 0.5 + progress * 4.5;
          
          // Disconnected zig-zags for motion blur: randomly skip some segments
          if (Math.random() < 0.25) continue;
          
          const pt1 = p.history[i];
          const pt2 = p.history[i+1];
          
          ctx.beginPath();
          
          // Small local jitter for even more jaggedness
          const j1x = pt1.x + (Math.random() - 0.5) * 4;
          const j1y = pt1.y + (Math.random() - 0.5) * 4;
          const j2x = pt2.x + (Math.random() - 0.5) * 4;
          const j2y = pt2.y + (Math.random() - 0.5) * 4;
          
          ctx.moveTo(j1x, j1y);
          ctx.lineTo(j2x, j2y);
          
          // 1. Draw softer blue aura
          ctx.strokeStyle = 'rgba(0, 191, 255, 0.3)';
          ctx.lineWidth = thickness + 2;
          ctx.stroke();
          
          // 2. Draw purely white core
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = thickness;
          ctx.stroke();
        }
      }
      
      ctx.restore();
      return;
    }

    if (p.isArcaneBolt) {
      drawTricksterBolt(ctx, p);
      return;
    }

    if (p.visual === 'gojoBlue' || p.isGojoPurple) {
      ctx.save();
      
      const colorType = p.isGojoPurple ? 'purple' : 'blue';
      
      // Calculate fade-out for purple orb when life is running out
      if (p.isGojoPurple) {
        const lifeRatio = p.life / p.maxLife;
        // Start fading when life is below 30%, smooth fade from 30% to 0%
        if (lifeRatio < 0.3) {
          const fadeAlpha = lifeRatio / 0.3; // 0 to 1 as life goes from 0% to 30%
          ctx.globalAlpha = fadeAlpha;
        }
      }
      
      // Draw custom trail for Purple orb - Hollow Purple effect
      if (p.isGojoPurple && p.history && p.history.length > 1) {
        drawPurpleOrbTrail(ctx, p, Date.now());
      }
      
      // Draw the highly detailed orb
      drawGojoOrb(ctx, p.x, p.y, p.r, Date.now(), colorType, 0);
      
      ctx.restore();
      return;
    }

    // Default projectile draw
    // Make projectile visuals depend on the owner projectile color/type.
    // RED: red-orange motion trail; BLUE: cyan “laser-ish” streak.
    const isRed = (p.color && p.color.toLowerCase().includes('ff4d4d')) ||
      (p.color && p.color.toLowerCase().includes('ff') && p.color.toLowerCase().includes('4d'));
    const isBlue = (p.color && p.color.toLowerCase().includes('4da3ff')) ||
      (p.color && p.color.toLowerCase().includes('a3') && p.color.toLowerCase().includes('ff')) ||
      (p.color && p.color.toLowerCase().includes('00ffff'));

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
          theme: fighter.sphereTheme
        });
      }
    } catch (e) {
      console.error('Error in drawAllCronosSpheres:', e);
    }
  }
}

export function drawThermobaricExplosions(ctx) {
  if (!state.thermobaricExplosions || state.thermobaricExplosions.length === 0) return;

  for (let i = state.thermobaricExplosions.length - 1; i >= 0; i--) {
    const exp = state.thermobaricExplosions[i];
    exp.life--;
    
    const progress = 1 - (exp.life / exp.maxLife);
    const radius = exp.radius + (exp.maxRadius - exp.radius) * Math.sin(progress * Math.PI * 0.5);
    const alpha = Math.max(0, 1 - progress);

    ctx.save();

    // 1. CRACKS & SHATTERED GROUND AT IMPACT SURFACE
    if (exp.cracks && exp.cracks.length > 0) {
      ctx.save();
      const crackAlpha = Math.max(0, 1 - progress * 0.7);
      
      // Lava glow seam inside cracks
      ctx.strokeStyle = `rgba(255, 60, 0, ${0.9 * crackAlpha})`;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      exp.cracks.forEach(segments => {
        segments.forEach(seg => {
          ctx.beginPath();
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
          ctx.stroke();
        });
      });

      // Dark charcoal cracked ground contour
      ctx.strokeStyle = `rgba(20, 20, 20, ${0.95 * crackAlpha})`;
      ctx.lineWidth = 2;
      exp.cracks.forEach(segments => {
        segments.forEach(seg => {
          ctx.beginPath();
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
          ctx.stroke();
        });
      });
      ctx.restore();
    }

    ctx.translate(exp.x, exp.y);

    // 2. EXPANDING RINGS OF ORANGE AND RED FLAMES OUTWARD
    // Outer deep crimson flame shockwave
    ctx.lineWidth = 18 * (1 - progress);
    ctx.strokeStyle = `rgba(200, 10, 0, ${0.85 * alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Mid vibrant orange flame ring
    ctx.lineWidth = 10 * (1 - progress);
    ctx.strokeStyle = `rgba(255, 120, 0, ${0.9 * alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
    ctx.stroke();

    // Inner bright white-gold heat wave ring
    ctx.lineWidth = 5 * (1 - progress);
    ctx.strokeStyle = `rgba(255, 230, 160, ${0.95 * alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
    ctx.stroke();

    // 3. FLYING DEBRIS AND EMBERS
    if (exp.debris && exp.debris.length > 0) {
      exp.debris.forEach(d => {
        d.x += d.vx;
        d.y += d.vy;
        d.vy += 0.25; // gravity drop
        d.rot += d.rotSpeed;

        ctx.save();
        ctx.translate(d.x - exp.x, d.y - exp.y);
        ctx.rotate(d.rot);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = d.color;
        ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
        ctx.restore();
      });
    }

    // 4. BRIGHT WHITE CORE AT IMPACT POINT
    if (progress < 0.45) {
      const coreAlpha = (0.45 - progress) / 0.45;
      const coreR = radius * (0.6 - progress * 0.5);

      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, coreR));
      coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * coreAlpha})`);
      coreGrad.addColorStop(0.5, `rgba(255, 240, 200, ${0.85 * coreAlpha})`);
      coreGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, coreR), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (exp.life <= 0) {
      state.thermobaricExplosions.splice(i, 1);
    }
  }
}

