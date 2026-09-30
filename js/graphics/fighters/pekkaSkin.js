// ─────────────────────────────────────────────
// P.E.K.K.A Character Skin & Visuals (Clash of Clans Edition)
// Supercell Authentic Heavy Armor & Radiant Magenta Horns
// Adheres strictly to:
// - Rule 19 (Upright Front POV Orientation)
// - Rule 20 & Root Rule (Canonical Symmetrical Lower-Flank Hands: (-0.82r, +0.38r) & (+0.82r, +0.38r), front layer overlap)
// - Rule 3.5 (Mandatory Offscreen Canvas Caching Pattern & Discrete Grid P=2.0px)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 2.4 (Canvas 2D Transform Stack Balance)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawPekkaBlade } from '../weapons/pekkaWeaponGraphics.js';

const P = 2.0; // 2.0px authentic discrete pixel art unit
let _cachedPekkaCanvas = null;
let _cachedPekkaR = 0;

/**
 * Procedural offscreen rasterization of P.E.K.K.A's authentic heavy slate-steel armor.
 * Rasterized ONCE into an axis-aligned buffer to prevent sub-pixel seams on rotation.
 */
function _renderPekkaPixelBodyToCanvas(destCtx, r) {
  destCtx.imageSmoothingEnabled = false;
  const steps = Math.ceil((r + P) / P);
  const cx = destCtx.canvas.width / 2;
  const cy = destCtx.canvas.height / 2;

  destCtx.save();
  destCtx.translate(cx, cy);

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;

      // 4-neighbor attached border test for solid manga ink outline
      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );

      if (isBorder) {
        destCtx.fillStyle = '#0E0F14'; // Dark manga ink outline
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // Vertical Bands (Rule 3.3 & Rule 19 Upright Front POV):
      // -Y (Top): Heavy Steel Helmet Dome & Brow Visor (-r to -r * 0.34)
      // Y ~ -0.25r to +0.12r: Recessed Faceplate with Glowing Magenta Eyes & Raised Gorget Collar
      // +Y (Center): Heavy Segmented Slate Steel Breastplate (+r * 0.12 to +r * 0.60)
      // +Y (Bottom): Segmented Fauld & Tasset Skirt (+r * 0.60 to +r)

      if (ry < -r * 0.44) {
        // Helmet Crown Dome & Raised Center Crest
        const isCenterRidge = Math.abs(rx) <= r * 0.18;
        if (isCenterRidge) {
          destCtx.fillStyle = '#64748B'; // Raised center steel crest
        } else if (Math.abs(rx) <= r * 0.55) {
          destCtx.fillStyle = ry < -r * 0.72 ? '#334155' : '#475569'; // Curved steel helmet dome
        } else {
          destCtx.fillStyle = '#1E293B'; // Dark steel outer rim
        }
      } else if (ry >= -r * 0.44 && ry <= -r * 0.34) {
        // Protruding Steel Brow Plate & Rivets
        const isBrowRivet = (Math.abs(Math.abs(rx) - r * 0.42) <= P * 1.2);
        if (isBrowRivet) {
          destCtx.fillStyle = '#CBD5E1'; // Polished steel rivet stud
        } else if (ry <= -r * 0.40) {
          destCtx.fillStyle = '#94A3B8'; // Top specular glint on brow plate
        } else {
          destCtx.fillStyle = '#475569'; // Heavy brow visor plate
        }
      } else if (ry > -r * 0.34 && ry <= -r * 0.12) {
        // Faceplate Mask & Glowing Elixir Eyes
        if (Math.abs(rx) > r * 0.52) {
          destCtx.fillStyle = '#334155'; // Outer steel cheek guard
        } else {
          const isNasalBridge = Math.abs(rx) <= P * 1.5;
          const isNasalVent = isNasalBridge && ry >= -r * 0.22;
          const isLeftEye = (rx >= -r * 0.36 && rx <= -r * 0.10) && (ry >= -r * 0.28 && ry <= -r * 0.18);
          const isRightEye = (rx >= r * 0.10 && rx <= r * 0.36) && (ry >= -r * 0.28 && ry <= -r * 0.18);

          if (isLeftEye || isRightEye) {
            const isEyeCore = (Math.abs(Math.abs(rx) - r * 0.23) <= P && Math.abs(ry + r * 0.23) <= P);
            destCtx.fillStyle = isEyeCore ? '#FFFFFF' : '#E879F9'; // Glowing magenta elixir eyes with white-hot core
          } else if (isNasalVent) {
            destCtx.fillStyle = '#0E0F14'; // Dark nasal vent slit
          } else if (isNasalBridge) {
            destCtx.fillStyle = '#1E293B'; // Central nasal ridge
          } else {
            destCtx.fillStyle = '#151B24'; // Deep obsidian steel faceplate cavity
          }
        }
      } else if (ry > -r * 0.12 && ry <= +r * 0.15) {
        // Raised Protective Steel Gorget Neck Collar
        if (Math.abs(rx) > r * 0.62) {
          destCtx.fillStyle = '#334155'; // Shoulder pauldron base
        } else if (Math.abs(rx) > r * 0.48) {
          destCtx.fillStyle = '#475569'; // Pauldron rim
        } else {
          const isUnderChinShadow = Math.abs(rx) <= r * 0.25 && ry <= -r * 0.05;
          const isGorgetRim = ry <= -r * 0.05;
          if (isUnderChinShadow) {
            destCtx.fillStyle = '#0E0F14'; // Throat shadow under chin
          } else if (isGorgetRim) {
            destCtx.fillStyle = '#94A3B8'; // Specular glint on collar rim
          } else {
            destCtx.fillStyle = '#4F5E75'; // Slate steel gorget plate
          }
        }
      } else if (ry > +r * 0.15 && ry <= +r * 0.60) {
        // Heavy Steel Cuirass / Muscular Segmented Breastplate
        if (Math.abs(rx) > r * 0.62) {
          destCtx.fillStyle = ry < +r * 0.38 ? '#475569' : '#334155'; // Layered pauldron steel
        } else {
          const isCenterSeam = Math.abs(rx) <= P * 0.8;
          const isChestRivet = (Math.abs(Math.abs(rx) - r * 0.38) <= P * 1.2 && Math.abs(ry - r * 0.32) <= P * 1.2);
          const isAbdominalBand = ry > +r * 0.46;

          if (isChestRivet) {
            destCtx.fillStyle = '#CBD5E1'; // Polished steel rivet
          } else if (isCenterSeam) {
            destCtx.fillStyle = '#151B24'; // Dark metal crevice seam
          } else if (isAbdominalBand) {
            destCtx.fillStyle = '#334155'; // Segmented abdominal plate
          } else {
            const isUpperPecHighlight = (ry >= +r * 0.18 && ry <= +r * 0.28 && Math.abs(rx) >= r * 0.12 && Math.abs(rx) <= r * 0.36);
            if (isUpperPecHighlight) {
              destCtx.fillStyle = '#64748B'; // Highlight on curved steel pectoral
            } else {
              destCtx.fillStyle = '#475569'; // Solid slate steel breastplate
            }
          }
        }
      } else {
        // Fauld & Segmented Tasset Skirt
        const isBeltLine = Math.abs(ry - r * 0.66) <= P * 1.0;
        const isCenterTasset = Math.abs(rx) <= r * 0.32;
        if (isBeltLine) {
          destCtx.fillStyle = '#151B24'; // Dark steel belt crevice
        } else if (isCenterTasset) {
          destCtx.fillStyle = ry > +r * 0.82 ? '#252F3F' : '#3D495C'; // Central groin guard plate
        } else {
          destCtx.fillStyle = ry > +r * 0.80 ? '#1E293B' : '#475569'; // Segmented thigh tassets
        }
      }

      destCtx.fillRect(px, py, P, P);
    }
  }

  destCtx.restore();
}

/**
 * Draws the cached P.E.K.K.A pixel body with zero sub-pixel seams
 */
export function drawPekkaPixelBody(ctx, r) {
  if (typeof document === 'undefined') return;

  if (!_cachedPekkaCanvas || _cachedPekkaR !== r) {
    _cachedPekkaR = r;
    const steps = Math.ceil((r + P) / P);
    const size = (steps * 2 + 1) * P;

    _cachedPekkaCanvas = document.createElement('canvas');
    _cachedPekkaCanvas.width = size;
    _cachedPekkaCanvas.height = size;
    const offCtx = _cachedPekkaCanvas.getContext('2d');
    if (offCtx) {
      _renderPekkaPixelBodyToCanvas(offCtx, r);
    }
  }

  if (_cachedPekkaCanvas) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(_cachedPekkaCanvas, -_cachedPekkaCanvas.width / 2, -_cachedPekkaCanvas.height / 2);
    ctx.restore();
  }
}

/**
 * Draws P.E.K.K.A's authentic curved magenta elixir horns extending from the helmet sides
 */
function _drawPekkaHorns(ctx, r) {
  ctx.save();

  // Dual Horns (-X and +X) curving outward and up into sharp glowing magenta tips
  const hornPairs = [-1, 1]; // Left and right
  for (const side of hornPairs) {
    ctx.save();
    ctx.scale(side, 1);

    // 1. Dark Steel Socket Collar at helmet attachment point
    ctx.beginPath();
    ctx.ellipse(r * 0.44, -r * 0.48, r * 0.16, r * 0.22, 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#1E293B';
    ctx.fill();
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 2. Thick Curved Horn Body (Deep Purple -> Radiant Elixir Magenta)
    ctx.beginPath();
    ctx.moveTo(r * 0.42, -r * 0.36); // Lower base of horn
    ctx.quadraticCurveTo(r * 0.90, -r * 0.44, r * 1.16, -r * 1.08); // Outer sweep to sharp tip
    ctx.quadraticCurveTo(r * 0.72, -r * 0.80, r * 0.42, -r * 0.60); // Inner sweep back to base
    ctx.closePath();

    ctx.fillStyle = '#581C87'; // Deep dark purple base
    ctx.fill();
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 3. Glowing Magenta Elixir Horn Tip & Mid-Body
    ctx.beginPath();
    ctx.moveTo(r * 0.62, -r * 0.58);
    ctx.quadraticCurveTo(r * 0.96, -r * 0.62, r * 1.16, -r * 1.08);
    ctx.quadraticCurveTo(r * 0.78, -r * 0.82, r * 0.54, -r * 0.66);
    ctx.closePath();
    ctx.fillStyle = '#C026D3'; // Vibrant elixir magenta
    ctx.fill();

    // 4. Brilliant Hot Pink/White Tip Glint
    ctx.beginPath();
    ctx.moveTo(r * 0.88, -r * 0.80);
    ctx.quadraticCurveTo(r * 1.04, -r * 0.90, r * 1.16, -r * 1.08);
    ctx.quadraticCurveTo(r * 0.92, -r * 0.94, r * 0.82, -r * 0.86);
    ctx.closePath();
    ctx.fillStyle = '#E879F9'; // Neon magenta tip
    ctx.fill();

    // Inner horn highlight glint streak
    ctx.strokeStyle = '#FAE8FF';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(r * 0.84, -r * 0.78);
    ctx.lineTo(r * 1.12, -r * 1.04);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws the sharp magenta elixir spikes on P.E.K.K.A's shoulder pauldrons
 */
function _drawPekkaShoulderSpikes(ctx, r) {
  ctx.save();

  // Dual Spiked Pauldrons (-X and +X)
  const sides = [-1, 1];
  for (const side of sides) {
    ctx.save();
    ctx.scale(side, 1);

    // 3 Sharp Magenta Spikes on each shoulder
    const spikes = [
      { b1x: r * 0.82, b1y: -r * 0.22, b2x: r * 0.76, b2y: -r * 0.08, tx: r * 1.22, ty: -r * 0.32 }, // Upper spike
      { b1x: r * 0.88, b1y: -r * 0.04, b2x: r * 0.84, b2y: +r * 0.12, tx: r * 1.34, ty: +r * 0.04 }, // Mid spike
      { b1x: r * 0.84, b1y: +r * 0.16, b2x: r * 0.78, b2y: +r * 0.28, tx: r * 1.20, ty: +r * 0.34 }, // Lower spike
    ];

    for (const sp of spikes) {
      ctx.beginPath();
      ctx.moveTo(sp.b1x, sp.b1y);
      ctx.lineTo(sp.tx, sp.ty);
      ctx.lineTo(sp.b2x, sp.b2y);
      ctx.closePath();

      ctx.fillStyle = '#C026D3'; // Vibrant magenta base
      ctx.fill();
      ctx.strokeStyle = '#0E0F14';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Sharp glowing tip highlight
      ctx.beginPath();
      const midBx = (sp.b1x + sp.b2x) * 0.5;
      const midBy = (sp.b1y + sp.b2y) * 0.5;
      ctx.moveTo(midBx + (sp.tx - midBx) * 0.45, midBy + (sp.ty - midBy) * 0.45);
      ctx.lineTo(sp.tx, sp.ty);
      ctx.lineTo(sp.b2x + (sp.tx - sp.b2x) * 0.65, sp.b2y + (sp.ty - sp.b2y) * 0.65);
      ctx.closePath();
      ctx.fillStyle = '#E879F9';
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws sharp magenta elixir spikes on P.E.K.K.A's forearm bracers
 */
function _drawPekkaBracerSpikes(ctx, hx, hy, handRadius, isLeft = false) {
  ctx.save();
  ctx.translate(hx, hy);
  const dir = isLeft ? -1 : 1;

  for (let i = -1; i <= 1; i++) {
    const by = i * (handRadius * 0.45);
    const bx = dir * (handRadius * 0.65);
    const tx = dir * (handRadius * 1.40);
    const ty = by + (i * 2);

    ctx.beginPath();
    ctx.moveTo(bx, by - 3);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx, by + 3);
    ctx.closePath();
    ctx.fillStyle = '#E879F9';
    ctx.fill();
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 1.0;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws the ethereal butterfly that P.E.K.K.A chases
 */
function _drawEtherealButterfly(ctx, bx, by, tick = 0) {
  ctx.save();
  ctx.translate(bx, by);

  // Wing flapping oscillation
  const flap = Math.sin(tick * 0.35);
  const wingScaleX = 0.4 + Math.abs(flap) * 0.6;

  // Floating glow aura (Rule 11 compliant concentric circles)
  ctx.fillStyle = 'rgba(232, 121, 249, 0.20)';
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(192, 38, 211, 0.25)';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();

  // Left & Right Wings (Magenta & Violet Gradient)
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side * wingScaleX, 1);

    // Upper Wing
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(8, -12, 14, -8);
    ctx.quadraticCurveTo(12, -2, 0, 2);
    ctx.closePath();
    ctx.fillStyle = '#E879F9'; // Radiant Magenta
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Lower Wing
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.quadraticCurveTo(10, 6, 8, 11);
    ctx.quadraticCurveTo(3, 8, 0, 3);
    ctx.closePath();
    ctx.fillStyle = '#C026D3'; // Deep Elixir Violet
    ctx.fill();

    ctx.restore();
  }

  // Tiny butterfly body
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-1, -3, 2, 6);

  ctx.restore();
}

/**
 * Draws P.E.K.K.A's dynamic crescent slash wave during active cleave
 */
function _drawCleaveSlashWave(ctx, r, swingProgress, stage = 1) {
  if (swingProgress <= 0 || swingProgress >= 1.0) return;

  ctx.save();
  const reach = r + 62;
  const sweepAngle = (140 * Math.PI) / 180;
  const currentAngle = -sweepAngle / 2 + sweepAngle * swingProgress;
  const trailAngle = sweepAngle * 0.45 * (1 - swingProgress);

  ctx.rotate(currentAngle);

  // Colors based on momentum stage
  const arcColor = stage === 3 ? '#F472B6' : (stage === 2 ? '#E879F9' : '#C026D3');
  const coreColor = stage === 3 ? '#FFFFFF' : '#FDF4FF';

  // Crescent blade slash
  ctx.beginPath();
  ctx.arc(0, 0, reach, -trailAngle, 0, false);
  ctx.arc(0, 0, reach - 14, 0, -trailAngle, true);
  ctx.closePath();

  ctx.fillStyle = arcColor;
  ctx.globalAlpha = Math.sin(swingProgress * Math.PI) * 0.75;
  ctx.fill();

  // White cutting core line
  ctx.beginPath();
  ctx.arc(0, 0, reach - 4, -trailAngle * 0.7, 0, false);
  ctx.strokeStyle = coreColor;
  ctx.lineWidth = stage === 3 ? 3.5 : 2.0;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws cooling exhaust steam puffs venting from P.E.K.K.A's rear armor during post-strike breather
 */
function _drawExhaustSteam(ctx, r, progress) {
  if (progress <= 0 || progress >= 1.0) return;
  ctx.save();
  const alpha = Math.sin(progress * Math.PI) * 0.40;
  ctx.fillStyle = `rgba(203, 213, 225, ${alpha})`;

  for (const sy of [-r * 0.42, r * 0.42]) {
    const steamX = -r * 0.70 - progress * (r * 0.65);
    const steamY = sy;
    const steamR = r * 0.18 + progress * (r * 0.22);
    ctx.beginPath();
    ctx.arc(steamX, steamY, steamR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws pre-attack wind-up charging aura rings
 */
function _drawWindupAura(ctx, r, progress, stage = 1) {
  if (progress <= 0 || progress >= 1.0) return;
  ctx.save();
  const pulse = Math.sin(progress * Math.PI * 3);
  const ringR = r * 1.5 + pulse * 3;
  const color = stage === 3 ? 'rgba(244, 114, 182,' : (stage === 2 ? 'rgba(232, 121, 249,' : 'rgba(192, 38, 211,');

  ctx.beginPath();
  ctx.arc(0, 0, ringR, 0, Math.PI * 2);
  ctx.strokeStyle = `${color} ${0.25 + progress * 0.35})`;
  ctx.lineWidth = 1.6 + progress * 1.4;
  ctx.stroke();

  ctx.restore();
}

/**
 * Master P.E.K.K.A Skin Renderer
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Object} fighter P.E.K.K.A entity
 */
export function drawPekkaSkin(ctx, fighter) {
  if (!ctx || !fighter) return;

  const r = fighter.r || 28;
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // Local space transform & facing orientation (Rule 19)
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  const momentumStage = fighter.kineticMomentum || 0;

  // 4-Phase Heavyweight Attack Timers & Progress
  const isWindingUp = Boolean(fighter.isCleaveWindingUp && (fighter.cleaveWindupTimer || 0) > 0);
  const windupMax = fighter.cleaveWindupMax || 20;
  const windupProgress = isWindingUp ? 1.0 - (fighter.cleaveWindupTimer / windupMax) : 0;

  const isHitPausing = Boolean(fighter.cleaveHitPauseTimer && fighter.cleaveHitPauseTimer > 0);

  const isSwinging = Boolean(fighter.isCleaveSwinging || (fighter.cleaveSwingTimer || 0) > 0);
  const swingMax = fighter.cleaveSwingMax || 16;
  const swingProgress = isSwinging ? 1.0 - (fighter.cleaveSwingTimer / swingMax) : 0;

  const isBreather = Boolean(fighter.isCleaveBreather && (fighter.cleaveBreatherTimer || 0) > 0);
  const breatherMax = fighter.cleaveBreatherMax || 22;
  const breatherProgress = isBreather ? 1.0 - (fighter.cleaveBreatherTimer / breatherMax) : 0;

  // Escanor-Style Blade Impact Micro-Tremor
  if (isHitPausing) {
    const tremor = Math.sin((fighter.cleaveHitPauseTimer || 0) * 3.4) * 1.4;
    ctx.translate(tremor, -tremor);
  }

  // ── LAYER 1: Electric Overload Shockwave (if detonating) ──
  if (fighter.overloadVfxTimer > 0) {
    const p = 1.0 - (fighter.overloadVfxTimer / (fighter.overloadVfxMax || 30));
    const shockRadius = r + p * (fighter.overloadRadius || 210);
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, shockRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(232, 121, 249, ${1.0 - p})`;
    ctx.lineWidth = 4 * (1.0 - p);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, shockRadius * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(192, 38, 211, ${(1.0 - p) * 0.7})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  // ── LAYER 2: Pre-Attack Wind-Up Aura & Breather Steam ──
  if (isWindingUp) {
    _drawWindupAura(ctx, r, windupProgress, momentumStage || 1);
  }
  if (isBreather) {
    _drawExhaustSteam(ctx, r, breatherProgress);
  }

  // ── LAYER 3: Shoulder Spikes, Horns & Armor Body ──
  _drawPekkaShoulderSpikes(ctx, r);
  _drawPekkaHorns(ctx, r);
  drawPekkaPixelBody(ctx, r);

  // ── LAYER 4: Hands & Held Greatsword (Canonical Lower-Flank Standard) ──
  if (!shouldHideHands) {
    const handRadius = r * 0.30;

    // Symmetrical Lower-Left Flank Hand (-0.82r, +0.38r)
    let leftHandX = -r * 0.82;
    let leftHandY = r * 0.38;

    // Symmetrical Lower-Right Flank Hand (+0.82r, +0.38r)
    let rightHandX = r * 0.82;
    let rightHandY = r * 0.38;
    let swordOffsetAngle = 0.22; // Natural resting forward/downward angle

    const CHOP_DOWN_ANGLE = 0.88; // Grounded chop-down plant angle (~50.4°)

    if (isHitPausing) {
      // Escanor-Style Hit-Pause: Sword locked at forward chop impact pose with high tension
      swordOffsetAngle = CHOP_DOWN_ANGLE;
      rightHandX = r * 0.72;
      rightHandY = r * 0.44;
      leftHandX = -r * 0.82;
      leftHandY = r * 0.38;
    } else if (isWindingUp) {
      // Wind-Up: Hoist massive greatsword high back over the shoulder
      const windupEase = Math.sin(windupProgress * Math.PI * 0.5);
      swordOffsetAngle = 0.22 - windupEase * 1.42; // Rotates back to -1.20 rad (-69°)
      rightHandX = r * 0.82 - windupEase * (r * 0.18);
      rightHandY = r * 0.38 - windupEase * (r * 0.42);
      leftHandX = -r * 0.82 + windupEase * (r * 0.12);
      leftHandY = r * 0.38 - windupEase * (r * 0.20);
    } else if (isSwinging) {
      // Release: Chop violently downwards from overhead (-1.20 rad) down to grounded slam (+0.88 rad)
      const swingEase = Math.sin(swingProgress * Math.PI * 0.5);
      swordOffsetAngle = -1.20 + swingEase * 2.08; // Lands smoothly at +0.88 rad!
      rightHandX = r * 0.82 - swingEase * (r * 0.10);
      rightHandY = r * 0.38 + swingEase * (r * 0.06);
    } else if (isBreather) {
      // Breather: Greatsword STAYS completely planted in the downward chop slam pose!
      // NO lift-up animation during breather — stays grounded while steam vents!
      swordOffsetAngle = CHOP_DOWN_ANGLE;
      rightHandX = r * 0.72;
      rightHandY = r * 0.44;
      leftHandX = -r * 0.82;
      leftHandY = r * 0.38;
    }

    // Left hand with slate-steel gauntlet & bracer spikes
    _drawPekkaBracerSpikes(ctx, leftHandX, leftHandY, handRadius, true);
    drawPixelHand(ctx, leftHandX, leftHandY, handRadius, '#475569', '#0E0F14');

    // Draw Held Colossal Falchion Cleaver extending from Right Hand
    const gripOffset = r * 0.32;
    const bladeOriginX = rightHandX + Math.cos(swordOffsetAngle) * gripOffset;
    const bladeOriginY = rightHandY + Math.sin(swordOffsetAngle) * gripOffset;
    drawPekkaBlade(ctx, bladeOriginX, bladeOriginY, swordOffsetAngle, r, {
      momentumStage,
      isSwinging,
      isWindingUp,
      isHitPausing,
      now: Date.now()
    });

    // Right Hand with slate-steel gauntlet on front layer over hilt grip & bracer spikes
    _drawPekkaBracerSpikes(ctx, rightHandX, rightHandY, handRadius, false);
    drawPixelHand(ctx, rightHandX, rightHandY, handRadius, '#64748B', '#0E0F14');

    // Hit-pause contact impact glow
    if (isHitPausing) {
      ctx.save();
      const contactDist = r * 2.2;
      const contactX = rightHandX + Math.cos(swordOffsetAngle) * contactDist;
      const contactY = rightHandY + Math.sin(swordOffsetAngle) * contactDist;
      ctx.beginPath();
      ctx.arc(contactX, contactY, 14, 0, Math.PI * 2);
      ctx.fillStyle = momentumStage === 3 ? 'rgba(232, 121, 249, 0.45)' : 'rgba(192, 38, 211, 0.35)';
      ctx.fill();
      ctx.restore();
    }
  }

  // ── LAYER 5: Active Cleave Slash Wave ──
  if (isSwinging) {
    _drawCleaveSlashWave(ctx, r, swingProgress, momentumStage || 1);
  }

  ctx.restore();

  // ── LAYER 6: World Space Butterfly (when Butterfly Chase is active) ──
  if (fighter.isChasingButterfly && fighter.butterflyTargetX !== undefined && fighter.butterflyTargetY !== undefined) {
    _drawEtherealButterfly(ctx, fighter.butterflyTargetX, fighter.butterflyTargetY, fighter.animTick || 0);
  }
}
