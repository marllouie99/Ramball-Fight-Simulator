// ═══════════════════════════════════════════════════════════════════════════
// CREEPER (Minecraft) — Upright Minimalist Pixel Art Skin Renderer
// Built strictly on the Toji Reference Standard (Rule 24), Upright Front POV
// (Rule 19), Canonical Symmetrical Hands (Rule 20), Hair Asset Model (Rule 22),
// and Universal Black Outline Standard (Rule 32).
// ═══════════════════════════════════════════════════════════════════════════

import { state } from '../../core/state.js';
import { getHandSize } from '../../core/config.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

let _cachedCreeperCanvas = null;
let _cachedCreeperR = 0;

// ── Creeper is a hairless Minecraft mob (Rule 19 Upright Front POV) ──
export function _drawCreeperHair(ctx, r, facingLeft = false) {
  // Creeper features no external hair asset; iconic 8x8 pixel face is integrated into body rasterizer
}

/**
 * Layer 1 (Toji Standard Offscreen Rasterizer — Rule 24):
 * Draws Creeper's circular pixel body with 4-neighbor #0E0F14 manga outline and authentic
 * Minecraft green moss camouflage + iconic 8x8 frowning pixel face.
 */
function _renderCreeperOffscreen(destCtx, intR) {
  const r = intR;
  const P = 2.0;
  const steps = Math.ceil((r + P) / P);

  destCtx.save();
  destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);
  destCtx.imageSmoothingEnabled = false;

  const OUTLINE = '#0E0F14';
  const LIME = '#4ADE80';
  const GREEN_BASE = '#22C55E';
  const MOSS_MID = '#16A34A';
  const FOREST_DARK = '#15803D';
  const DEEP_SHADOW = '#14532D';
  const FROWN_BLACK = '#0F172A';
  const PAW_SOLE = '#090D16';

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      // Toji 4-neighbor outer manga ink outline test (Rule 24)
      const isBorder =
        Math.hypot((gx + 1) * P, ry) > r ||
        Math.hypot((gx - 1) * P, ry) > r ||
        Math.hypot(rx, (gy + 1) * P) > r ||
        Math.hypot(rx, (gy - 1) * P) > r;

      if (isBorder) {
        destCtx.fillStyle = OUTLINE;
        destCtx.fillRect(rx - P / 2, ry - P / 2, P, P);
        continue;
      }

      // Procedural Minecraft Moss Camo Color Generator
      let color = GREEN_BASE;
      const seed = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
      const frac = seed - Math.floor(seed);
      if (frac < 0.22) color = LIME;
      else if (frac < 0.50) color = GREEN_BASE;
      else if (frac < 0.78) color = MOSS_MID;
      else if (frac < 0.92) color = FOREST_DARK;
      else color = DEEP_SHADOW;

      // ── ZONE 1: Iconic Minecraft Frowning Face ──
      // Eyes: Left eye (-r * 0.40 to -r * 0.14, ry -r * 0.34 to -r * 0.08), Right eye (+r * 0.14 to +r * 0.40)
      const isLeftEye = rx >= -r * 0.40 && rx <= -r * 0.14 && ry >= -r * 0.34 && ry <= -r * 0.08;
      const isRightEye = rx >= r * 0.14 && rx <= r * 0.40 && ry >= -r * 0.34 && ry <= -r * 0.08;

      // Central Nose Bridge: (-r * 0.14 to +r * 0.14, ry -r * 0.08 to +r * 0.16)
      const isNoseBridge = Math.abs(rx) <= r * 0.14 && ry >= -r * 0.08 && ry <= r * 0.16;

      // Mouth Down-Turn: Outer corner brackets
      const isMouthOuter = Math.abs(rx) <= r * 0.34 && Math.abs(rx) >= r * 0.14 && ry >= r * 0.06 && ry <= r * 0.34;
      const isMouthBottom = Math.abs(rx) <= r * 0.20 && ry >= r * 0.16 && ry <= r * 0.34;

      if (isLeftEye || isRightEye || isNoseBridge || isMouthOuter || isMouthBottom) {
        color = FROWN_BLACK;
      } else if (ry >= r * 0.78) {
        // ── ZONE 3: Stubby Creeper Feet Soles ──
        if (Math.abs(rx) >= r * 0.35) {
          color = PAW_SOLE;
        } else {
          color = DEEP_SHADOW;
        }
      }

      destCtx.fillStyle = color;
      destCtx.fillRect(rx - P / 2, ry - P / 2, P, P);
    }
  }

  destCtx.restore();
}

export function drawCreeperPixelBody(ctx, r, fighter = null) {
  const intR = Math.round(r);
  const P = 2.0;
  const steps = Math.ceil((intR + P) / P);
  const size = (steps * 2 + 1) * P;

  if (!_cachedCreeperCanvas || _cachedCreeperR !== intR) {
    if (typeof document !== 'undefined') {
      _cachedCreeperCanvas = document.createElement('canvas');
      _cachedCreeperCanvas.width = size;
      _cachedCreeperCanvas.height = size;
      _cachedCreeperR = intR;
      const offCtx = _cachedCreeperCanvas.getContext('2d');
      _renderCreeperOffscreen(offCtx, intR);
    } else {
      _renderCreeperOffscreen(ctx, intR);
      return;
    }
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_cachedCreeperCanvas, -size / 2, -size / 2);
  ctx.restore();
}

/**
 * Draws the Charged Creeper Electric Plasma Aura.
 * Rule 11: Uses discrete geometric rings and spark motes (zero shadowBlur).
 */
function _drawChargedElectricAura(ctx, r, fighter) {
  if (!fighter || (!fighter.isChargedCreeper && !(fighter.chargedCreeperTimer > 0))) return;

  ctx.save();
  const tick = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.018;
  const pulse = 1.0 + Math.sin(tick * 1.5) * 0.08;
  const auraR = r * 1.42 * pulse;

  // 1. Translucent cyan electric disc
  ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Rotating polygonal lightning cage ring
  ctx.save();
  ctx.rotate(tick * 0.7);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  const pts = 8;
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const jitter = (i % 2 === 0 ? 3 : -3);
    const px = Math.cos(a) * (auraR + jitter);
    const py = Math.sin(a) * (auraR + jitter);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // 3. Orbiting discrete electric spark motes (Rule 26: standalone shapes, zero radial spokes)
  for (let i = 0; i < 4; i++) {
    const angle = tick * 1.2 + i * (Math.PI * 0.5);
    const mx = Math.cos(angle) * (auraR + 4);
    const my = Math.sin(angle) * (auraR + 4);
    ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#38BDF8';
    ctx.fillRect(mx - 2, my - 2, 4, 4);
  }

  ctx.restore();
}

/**
 * Renders high-voltage electrical ionization flash and jagged surface crackling arcs
 * when Creeper is struck by celestial lightning to awaken as Charged Creeper.
 */
function _drawLightningAwakenEffect(ctx, r, timer, maxTimer = 28) {
  const p = Math.max(0, Math.min(1.0, timer / maxTimer)); // 1.0 (start of strike) -> 0.0 (end)

  ctx.save();

  // 1. Blinding white electrical core flash
  ctx.fillStyle = `rgba(255, 255, 255, ${(p * 0.90).toFixed(2)})`;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // 2. High-voltage cyan ionization rim
  ctx.strokeStyle = `rgba(56, 189, 248, ${(p * 0.85).toFixed(2)})`;
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Jagged electric crackle arcs crawling across Creeper's body
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  const arcSeed = timer * 11;
  for (let a = 0; a < 4; a++) {
    const baseAngle = (a * Math.PI * 0.5) + Math.sin(arcSeed + a * 2.3) * 0.6;
    const d1 = r * 0.30;
    const d2 = r * 0.70;
    const d3 = r * 1.15;
    const x1 = Math.cos(baseAngle) * d1;
    const y1 = Math.sin(baseAngle) * d1;
    const x2 = Math.cos(baseAngle + 0.35) * d2;
    const y2 = Math.sin(baseAngle + 0.35) * d2;
    const x3 = Math.cos(baseAngle - 0.25) * d3;
    const y3 = Math.sin(baseAngle - 0.25) * d3;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Main skin entry point for Creeper (`drawCreeperSkin(ctx, fighter)`).
 * Strictly complies with Rule 19 (Upright POV), Rule 20 (Symmetrical Paws),
 * Rule 24 (Toji Standard), Rule 32 (Universal Black Outline), and internal translation contract.
 */
export function drawCreeperSkin(ctx, fighter) {
  if (!ctx || !fighter) return;
  const r = fighter.r || 25;

  ctx.save();
  // Mandatory Canonical World-Space Coordinate Translation Contract
  ctx.translate(fighter.x || 0, (fighter.y || 0) - (fighter.z || 0));

  // High-voltage lightning strike electrical jitter (violent trembling during awakening strike)
  if (fighter.lightningAwakenTimer > 0) {
    const jitterMag = Math.min(3.5, (fighter.lightningAwakenTimer / 28) * 4.0);
    const jx = Math.sin(fighter.lightningAwakenTimer * 45) * jitterMag;
    const jy = Math.cos(fighter.lightningAwakenTimer * 50) * jitterMag * 0.7;
    ctx.translate(jx, jy);
  }

  // Charged Creeper Electric Plasma Matrix (suppressed during silhouette pass)
  if (!fighter._isSilhouettePass) {
    _drawChargedElectricAura(ctx, r, fighter);
  }

  // Priming Detonation Visual Inflation (1.0 -> 1.28x)
  let inflationScale = 1.0;
  if (fighter.isPrimingDetonation || fighter.primeDetonationTimer > 0) {
    const primeP = 1.0 - Math.max(0, (fighter.primeDetonationTimer || 0) / Math.max(1, fighter.maxPrimeTimer || 60));
    inflationScale = 1.0 + primeP * 0.28;
  } else if (fighter.deathDetonationTimer > 0) {
    const deathP = 1.0 - (fighter.deathDetonationTimer / 45);
    inflationScale = 1.0 + deathP * 0.32;
  }
  if (inflationScale !== 1.0) {
    ctx.scale(inflationScale, inflationScale);
  }

  // Rule 19: Upright Front POV orientation & vertical flip when facing left
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // Layer 1: Toji-standard pixel body circle with authentic Minecraft frown
  drawCreeperPixelBody(ctx, r, fighter);

  // Layer 1.5: Mandatory Universal Character Black Outline Standard (Rule 32)
  // Guarantees circular body geometry & green camouflage sharply pop off the white arena floor
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = '#0E0F14';
  ctx.stroke();
  ctx.restore();

  // Layer 2: Dedicated Head Asset (Rule 22)
  _drawCreeperHair(ctx, r, facingLeft);

  // Layer 3: Canonical Hands Suppressed (Creeper is an armless/handless Minecraft mob)
  const shouldHideHands = fighter.hideHands !== undefined ? Boolean(fighter.hideHands || fighter.hideHand) : true;
  if (!shouldHideHands) {
    const handRadius = getHandSize(r * 0.28, fighter);
    const pawColor = (fighter.isChargedCreeper || (fighter.chargedCreeperTimer || 0) > 0 || (fighter.lightningAwakenTimer || 0) > 0) ? '#38BDF8' : '#22C55E';
    const pawOutline = '#0E0F14';

    // Left Paw (-r * 0.82, +r * 0.38)
    drawPixelHand(ctx, -r * 0.82, r * 0.38, handRadius, pawColor, pawOutline);

    // Right Paw (+r * 0.82, +r * 0.38)
    drawPixelHand(ctx, r * 0.82, r * 0.38, handRadius, pawColor, pawOutline);
  }

  // Priming White Flash Overlay (Iconic Minecraft Blinking White Prime)
  if (!fighter._isSilhouettePass && (fighter.isPrimingDetonation || fighter.primeDetonationTimer > 0 || fighter.deathDetonationTimer > 0)) {
    const timer = fighter.primeDetonationTimer || fighter.deathDetonationTimer || 0;
    const flashTick = Math.sin(timer * 0.45);
    if (flashTick > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${(flashTick * 0.82).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Lightning Awakening High-Voltage Flash & Surface Crackling Arcs
  if (!fighter._isSilhouettePass && (fighter.lightningAwakenTimer || 0) > 0) {
    _drawLightningAwakenEffect(ctx, r, fighter.lightningAwakenTimer, fighter.maxLightningAwakenTimer || 28);
  }

  ctx.restore();
}
