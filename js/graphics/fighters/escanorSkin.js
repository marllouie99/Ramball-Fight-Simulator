// ─────────────────────────────────────────────
// Escanor Fighter Skin & Body Model (Authentic Pixel Art Edition)
// The Seven Deadly Sins: Lion's Sin of Pride
// Adheres strictly to:
// - Rule 19 (Upright Front POV Camera Orientation, Zero Eyes/Mouth/Nose)
// - Rule 19.1 (Proportional Vertical Bands & Swept-Back Anime Hair Spikes)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

import { getHandSize, CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawDivineAxeRhitta, drawRhittaSlashArc, drawRhittaSolarFlash, drawCruelSunChargingExpansion } from '../weapons/escanorWeaponGraphics.js';

const P = 2.0; // 2.0px authentic retro pixel grid
const snap = (v) => Math.round(v / P) * P;

let _escanorHairImage = null;
let _escanorHairImageLoading = false;
let _escanorMustacheImage = null;
let _escanorMustacheImageLoading = false;

export function _getEscanorHairImage() {
  if (_escanorHairImage && _escanorHairImage.complete && _escanorHairImage.naturalWidth > 0) {
    return _escanorHairImage;
  }
  if (!_escanorHairImageLoading && typeof Image !== 'undefined') {
    _escanorHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _escanorHairImage = img;
      _escanorHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Escanor hair image at Assets/model/Escanor-hair.png', e);
      _escanorHairImageLoading = false;
    };
    img.src = 'Assets/model/Escanor-hair.png?v=1';
    _escanorHairImage = img;
  }
  return _escanorHairImage;
}

export function _getEscanorMustacheImage() {
  if (_escanorMustacheImage && _escanorMustacheImage.complete && _escanorMustacheImage.naturalWidth > 0) {
    return _escanorMustacheImage;
  }
  if (!_escanorMustacheImageLoading && typeof Image !== 'undefined') {
    _escanorMustacheImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _escanorMustacheImage = img;
      _escanorMustacheImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Escanor mustache image at Assets/model/Escanor-mustache.png', e);
      _escanorMustacheImageLoading = false;
    };
    img.src = 'Assets/model/Escanor-mustache.png?v=1';
    _escanorMustacheImage = img;
  }
  return _escanorMustacheImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getEscanorHairImage();
  _getEscanorMustacheImage();
}

/**
 * Draws Escanor's signature noble golden hair from Assets/model/Escanor-hair.png.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawEscanorHair(ctx, r, facingLeft = false) {
  const hairImg = _getEscanorHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp pixel art fidelity (Rule 19)

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.escanor) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;

    // Escanor-hair.png (500x500). Visible hair bounding box:
    // X: [112, 391] (width 280, horizontal center at 251.5)
    // Y: [122, 341] (height 220, top crown at 122)
    // Scales to cover the upper head circle hemisphere seamlessly with crown spikes at -1.35r
    const targetHairWidth = r * 2.85 * wMult;
    const targetHairHeight = r * 2.10 * hMult;
    const scaleX = targetHairWidth / 280;
    const scaleY = targetHairHeight / 220;
    const drawW = 500 * scaleX;
    const drawH = 500 * scaleY;
    const drawX = -251.5 * scaleX + offX;
    const drawY = -r * 1.35 - 122 * scaleY + offY;

    if (rot !== 0) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      ctx.rotate(rot);
      ctx.drawImage(hairImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(hairImg, drawX, drawY, drawW, drawH);
    }

    ctx.restore();
  }
}

/**
 * Draws Escanor's proud handlebar mustache from Assets/model/Escanor-mustache.png.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawEscanorMustache(ctx, r, facingLeft = false) {
  const mustacheImg = _getEscanorMustacheImage();
  if (mustacheImg && mustacheImg.complete && mustacheImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp pixel art fidelity (Rule 19)

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.escanor_mustache) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;

    // Escanor-mustache.png (1254x1254). Visible mustache bounding box:
    // X: [186, 1070] (width 885, horizontal center at 628)
    // Y: [492, 772] (height 281, vertical center at 632, top at 492)
    // Width scales to 1.30r across the lower face, sitting naturally at y = -0.04r
    const targetMustacheWidth = r * 1.30 * wMult;
    const targetMustacheHeight = (r * 1.30 * (281 / 885)) * hMult;
    const scaleX = targetMustacheWidth / 885;
    const scaleY = targetMustacheHeight / 281;
    const drawW = 1254 * scaleX;
    const drawH = 1254 * scaleY;
    const drawX = -628 * scaleX + offX;
    const drawY = -r * 0.04 - 492 * scaleY + offY;

    if (rot !== 0) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      ctx.rotate(rot);
      ctx.drawImage(mustacheImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(mustacheImg, drawX, drawY, drawW, drawH);
    }

    ctx.restore();
  }
}

/**
 * Main Skin Renderer for Escanor (Pixel Art Edition)
 */
export function drawEscanorSkin(ctx, fighter) {
  const r = fighter.r || 32;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const now = Date.now();

  const isSuppressed = !isPodiumPreview && Boolean(
    fighter.isTargetOfAmbush ||
    (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
  );

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  // When casting Cruel Sun or holding the post-throw follow-through stance, Escanor faces directly towards the player/camera (angle 0)
  const isChannelingSun = Boolean(fighter.isChannelingCruelSun);
  const isPostThrowRecovery = Boolean(fighter.cruelSunRecoveryTimer && fighter.cruelSunRecoveryTimer > 0);
  const isFacingPlayer = isPodiumPreview || isChannelingSun || isPostThrowRecovery;
  const angle = isFacingPlayer ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  // During Cruel Sun channeling or post-throw recovery, body flips horizontally based on target/cast angle
  const enemyAngle = (isChannelingSun || isPostThrowRecovery)
    ? ((fighter.cruelSunCastAngle !== undefined) ? fighter.cruelSunCastAngle : (fighter.cruelSunReleaseAngle || 0))
    : angle;

  const facingLeft = !isPodiumPreview && Math.abs(enemyAngle) > Math.PI / 2;
  if (facingLeft) {
    if (isFacingPlayer) {
      ctx.scale(-1, 1); // Flip horizontally when facing player upright
    } else {
      ctx.scale(1, -1); // Standard Rule 19 vertical scale mirroring when rotated
    }
  }

  // 2. Solar Heat / Sunshine Aura (Rule 11 compliant: Concentric flat rings)
  if (!isSuppressed) {
    _drawEscanorSolarAura(ctx, r, fighter, now);
  }

  // 3. Attack & Swing States
  const chopState = (!isPodiumPreview && !isSuppressed)
    ? _getEscanorChopAnimationState(fighter)
    : { isSwinging: false, phase: 'idle', axeAngle: 0.14, handX: -r * 0.85, handY: r * 0.40, backHandX: r * 0.65, backHandY: -r * 0.18, strikeP: 0 };
  const isPunching = !isPodiumPreview && !isSuppressed && Boolean(fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
  const punchPhase = isPunching ? Math.min(1.0, 1.0 - (fighter.punchAnimTimer / (fighter.punchMaxTime || 14))) : 0;

  // ── Authentic Retro Game Stepped Breathing Animation (Rule 3.5: P = 2.0px discrete grid) ──
  // Classic 4-step retro sprite keyframe loop: Inhale lift -> Peak hold -> Exhale drop -> Neutral rest.
  // Strictly integer-stepped pixel displacement with ZERO float scaling or pulsing!
  ctx.save();
  if (!isPodiumPreview && !isSuppressed && (isChannelingSun || isPostThrowRecovery)) {
    // 4-frame retro animation loop with 160ms per keyframe (~640ms total cycle)
    const frameDuration = 160;
    const currentFrame = Math.floor((now / frameDuration) % 4); // 0, 1, 2, 3

    // Discrete stepped pixel displacement:
    // Frame 0: Neutral Rest (0px)
    // Frame 1: Inhale Lift (-2px / -P)
    // Frame 2: Deep Inhale Hold (-2px / -P)
    // Frame 3: Exhale Drop (0px)
    const retroStepY = (currentFrame === 1 || currentFrame === 2) ? -P : 0;
    ctx.translate(0, retroStepY);

    if (currentFrame === 3) {
      _drawEscanorRetroExhaleMotes(ctx, r, now);
    }
  }

  // 4. LAYER 0: BACK HAND & RESTING WEAPON (Behind Body Layer)
  const showBackHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideBackHand;
  if (showBackHand) {
    _drawEscanorBackHand(ctx, fighter, r, chopState, isPunching, punchPhase);
  }

  // 5. LAYER 1: MAIN BODY (Pixel Head/Neck Skin + Lowered Holy Knight Armor)
  drawEscanorPixelBody(ctx, r, fighter.isTheOneActive);

  // 6. LAYER 2: MUSTACHE ASSET OVERLAY (Assets/model/Escanor-mustache.png)
  _drawEscanorMustache(ctx, r, facingLeft);

  // 7. LAYER 3: HAIR ASSET OVERLAY (Assets/model/Escanor-hair.png)
  _drawEscanorHair(ctx, r, facingLeft);

  // 8. LAYER 4: FRONT HAND / POINTING GAUNTLET (On Top of Body, Mustache & Hair)
  const showFrontHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideFrontHand;
  if (showFrontHand) {
    _drawEscanorFrontHand(ctx, fighter, r, chopState, isPunching, punchPhase, now, facingLeft);
  }

  // 9. Active Rhitta Slash Arc Trail (Rule 2.6 / 15 Compliant: Dynamic Eraser Wipe)
  // Handled in world coordinates in EscanorFighter.js draw() so the attack effect stays anchored in the air when released!

  // 10. Expanding Cruel Sun during Channeling (Poised steadily overhead above Escanor)
  if (!isPodiumPreview && !isSuppressed && isChannelingSun) {
    const maxTimer = fighter.cruelSunMaxChargeTimer || 45;
    const curTimer = fighter.cruelSunChargeTimer || 0;
    const progress = Math.max(0, Math.min(1.0, 1.0 - (curTimer / maxTimer)));
    const expandProgress = Math.max(0, Math.min(1.0, (progress - 0.20) / 0.80));

    if (expandProgress > 0) {
      const handR = Math.max(r * 0.30, getHandSize(7.0));
      const fingerLen = snap(handR * 1.35);
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : (fighter._config || {});
      const maxSunR = Number.isFinite(Number(cfg.cruelSunMaxExpandRadius))
        ? Number(cfg.cruelSunMaxExpandRadius)
        : (Number.isFinite(Number(cfg.cruelSunOrbRadius)) ? Number(cfg.cruelSunOrbRadius) : 48);
      const currentSunR = Math.max(3, expandProgress * maxSunR);

      const poisedHandX = r * 0.90;
      const poisedHandY = -r * 0.38;
      const fingerTopY = poisedHandY - fingerLen;

      // Sun remains steadily poised overhead above Escanor — ZERO rotation or movement around him
      const sunX = poisedHandX;
      const sunY = fingerTopY - currentSunR - 6;

      drawCruelSunChargingExpansion(ctx, sunX, sunY, expandProgress, maxSunR, fighter.isTheOneActive, now);
    }
  }

  ctx.restore();

  // Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}

/**
 * Renders authentic retro discrete pixel steam motes exhaled on exhale keyframes.
 * Adheres strictly to Rule 2.2 (Zero shadowBlur), Rule 2.4 (Stack Integrity), and Rule 3.5 (P = 2px).
 */
function _drawEscanorRetroExhaleMotes(ctx, r, now = Date.now()) {
  const currentNow = (typeof now === 'number' && !Number.isNaN(now)) ? now : Date.now();
  ctx.save();
  ctx.fillStyle = '#FEF08A';
  // 3 discrete 2x2px pixel blocks stepped outward from mustache
  const subTick = Math.floor((currentNow / 50) % 3);
  const px1 = snap(4 + subTick * 2);
  const py1 = snap(r * 0.18 + subTick * 2);
  ctx.fillRect(px1, py1, P, P);

  ctx.fillStyle = '#FFF795';
  const px2 = snap(-4 - subTick * 2);
  const py2 = snap(r * 0.18 + subTick * 2);
  ctx.fillRect(px2, py2, P, P);
  ctx.restore();
}

/**
 * Grace "Sunshine" & Thermal Updraft (恩寵「太陽」& 熱上昇気流)
 * Renders Escanor's divine solar aura and rising thermal convection waves:
 * 1. Ground Thermal Scorch Field & Convective Heat Mirage Rings
 * 2. Vertical Thermal Updraft Waves (sinusoidal rising heat shimmer)
 * 3. Rising Solar Ember Motes & Thermal Sparks (convection updraft)
 * 4. Pulsing Solar Corona & Prominence Arches (Grace "Sunshine")
 * 5. High Noon "The One" Blazing Radiance & Solar Flares
 * Adheres strictly to Rule 11 (Zero shadowBlur) & Stack Integrity (Rule 2.4).
 */
function _drawEscanorSolarAura(ctx, r, fighter, now = Date.now()) {
  const currentNow = (typeof now === 'number' && !Number.isNaN(now)) ? now : Date.now();
  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
  const isTheOne = Boolean(fighter.isTheOneActive);
  if (cfg.enableSunshine === false && !isTheOne) return;
  const prideStacks = fighter.prideStacks || 0;
  const prideRatio = prideStacks / 5.0; // 0.0 to 1.0

  // Derive heat aura radius directly from fighter.currentSunshineHeatRadius or CONFIG.escanor.sunshineHeatRadius
  const baseHeatR = (fighter && typeof fighter.currentSunshineHeatRadius === 'number')
    ? fighter.currentSunshineHeatRadius
    : ((typeof cfg.sunshineHeatRadius === 'number') ? cfg.sunshineHeatRadius : 200);

  const heatPulse = Math.sin(currentNow * 0.006) * (isTheOne ? 6.0 : 3.0);
  const totalHeatR = baseHeatR + heatPulse;

  ctx.save();

  // ── 1. GROUND THERMAL SCORCH FIELD & RADIAL CONVECTION RINGS ──
  // Outer Dissipating Thermal Boundary (Matches configured sunshineHeatRadius exactly)
  ctx.beginPath();
  ctx.arc(0, 0, totalHeatR, 0, Math.PI * 2);
  ctx.fillStyle = isTheOne
    ? 'rgba(254, 240, 138, 0.04)'
    : `rgba(245, 158, 11, ${0.02 + prideRatio * 0.02})`;
  ctx.fill();

  // Mid Thermal Wave Ring
  ctx.beginPath();
  ctx.arc(0, 0, totalHeatR * 0.65, 0, Math.PI * 2);
  ctx.fillStyle = isTheOne
    ? 'rgba(245, 158, 11, 0.05)'
    : `rgba(220, 38, 38, ${0.03 + prideRatio * 0.02})`;
  ctx.fill();

  // Pulsing Radiant Coronal Edge
  ctx.beginPath();
  ctx.arc(0, 0, totalHeatR * 0.95, 0, Math.PI * 2);
  ctx.strokeStyle = isTheOne
    ? 'rgba(254, 240, 138, 0.16)'
    : `rgba(245, 158, 11, ${0.08 + prideRatio * 0.07})`;
  ctx.lineWidth = isTheOne ? 1.6 : 1.1;
  ctx.stroke();

  // ── 2. VERTICAL THERMAL UPDRAFT WAVES (Rising Convection Heat Ribbons) ──
  // Wavy vertical heat shimmer rising upward across the entire sunshineHeatRadius
  const updraftWidth = Math.max(r * 2.5, totalHeatR * 1.5);
  const updraftHeight = Math.max(r * 3.5, totalHeatR * 1.25);
  const numUpdrafts = Math.max(5, Math.min(17, Math.floor(updraftWidth / 32)));
  
  ctx.save();
  for (let i = 0; i < numUpdrafts; i++) {
    const colX = ((i / (numUpdrafts - 1 || 1)) - 0.5) * updraftWidth;
    const speed = 0.0035 + (i % 3) * 0.001;
    const startY = r * 0.8;
    const waveAmp = (3.0 + (i % 2) * 2.0) * (isTheOne ? 1.3 : 1.0);

    ctx.beginPath();
    let isFirst = true;
    const segments = 12;
    for (let s = 0; s <= segments; s++) {
      const sp = s / segments;
      const currY = startY - sp * updraftHeight;
      const wave = Math.sin(sp * Math.PI * 3.0 - now * 0.008 + i * 2.0) * waveAmp * (1.0 - sp * 0.4);
      const currX = colX + wave;
      if (isFirst) {
        ctx.moveTo(currX, currY);
        isFirst = false;
      } else {
        ctx.lineTo(currX, currY);
      }
    }

    const colAlpha = (1.0 - Math.abs(colX / (updraftWidth * 0.5))) * (isTheOne ? 0.12 : (0.05 + prideRatio * 0.05));
    ctx.strokeStyle = isTheOne
      ? `rgba(254, 240, 138, ${colAlpha})`
      : (i % 2 === 0 ? `rgba(245, 158, 11, ${colAlpha})` : `rgba(251, 191, 36, ${colAlpha})`);
    ctx.lineWidth = isTheOne ? 1.5 : 1.0;
    ctx.stroke();
  }
  ctx.restore();

  // ── 3. RISING SOLAR EMBER MOTES (Thermal Convection Sparkles) ──
  // Particle sparks scaled across the active sunshineHeatRadius
  const numEmbers = Math.max(10, Math.min(30, Math.floor(totalHeatR / 16)));
  const emberFieldH = updraftHeight;
  const emberFieldW = updraftWidth;

  for (let e = 0; e < numEmbers; e++) {
    const seed = ((e * 7919) % 10000) / 10000;
    const seedX = ((e * 6271) % 10000) / 10000;
    const speed = 0.0007 + seed * 0.0006;
    const cycle = (now * speed + seed) % 1.0; // 0.0 (bottom) to 1.0 (top)

    const py = (r * 0.7) - cycle * emberFieldH;
    const sway = Math.sin(now * 0.005 + e * 1.7) * (5.0 + seed * 5.0);
    const px = (seedX - 0.5) * emberFieldW + sway;

    // Fade in from ground, peak at mid-rise, burn out at apex
    const fade = Math.sin(cycle * Math.PI);
    const emberAlpha = fade * (isTheOne ? 0.38 : (0.20 + prideRatio * 0.18));
    const emberSize = (cycle < 0.6 ? 1.8 : 1.2) * (isTheOne ? 1.2 : 1.0);

    ctx.fillStyle = (e % 3 === 0)
      ? `rgba(255, 255, 255, ${emberAlpha})`
      : (e % 3 === 1 ? `rgba(254, 240, 138, ${emberAlpha})` : `rgba(245, 158, 11, ${emberAlpha})`);
    ctx.fillRect(Math.round(px), Math.round(py), Math.max(1, Math.round(emberSize)), Math.max(1, Math.round(emberSize)));
  }

  // ── 4. GRACE "SUNSHINE" SOLAR CORONA & ROTATING SOLAR PROMINENCE FLARES ──
  const coreCoronaR = Math.max(r * 1.35, Math.min(r * 2.2, totalHeatR * 0.35));
  
  // Inner Radiant Solar Core
  ctx.beginPath();
  ctx.arc(0, 0, coreCoronaR, 0, Math.PI * 2);
  ctx.fillStyle = isTheOne
    ? 'rgba(254, 240, 138, 0.10)'
    : `rgba(245, 158, 11, ${0.05 + prideRatio * 0.05})`;
  ctx.fill();

  // Rotating Solar Flare Rays (Clockwise primary corona)
  const numRays = isTheOne ? 12 : (6 + (prideStacks >= 3 ? 2 : 0));
  ctx.save();
  ctx.rotate(now * (isTheOne ? 0.0025 : 0.0015));
  for (let rIdx = 0; rIdx < numRays; rIdx++) {
    ctx.rotate((Math.PI * 2) / numRays);
    const rayLen = (coreCoronaR * 0.40) + Math.sin(now * 0.01 + rIdx * 2.1) * (isTheOne ? 6.0 : 3.0);
    const rayThick = isTheOne ? 1.8 : 1.2;

    ctx.strokeStyle = isTheOne
      ? 'rgba(254, 240, 138, 0.30)'
      : `rgba(251, 191, 36, ${0.15 + prideRatio * 0.12})`;
    ctx.lineWidth = rayThick;
    ctx.beginPath();
    ctx.moveTo(coreCoronaR - 2, 0);
    ctx.lineTo(coreCoronaR + rayLen, 0);
    ctx.stroke();

    // Secondary Solar Prominence Arches (Magnetic coronal flare loops)
    if (prideStacks >= 3 || isTheOne) {
      const loopR = (isTheOne ? 12 : 7) + Math.sin(now * 0.008 + rIdx) * 2;
      ctx.beginPath();
      ctx.arc(coreCoronaR + 3, 0, loopR, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.strokeStyle = isTheOne
        ? 'rgba(245, 158, 11, 0.20)'
        : 'rgba(239, 68, 68, 0.15)';
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }
  }
  ctx.restore();

  // Reverse Counter-Rotating Outer Corona Flare Teeth
  if (prideStacks >= 2 || isTheOne) {
    ctx.save();
    ctx.rotate(-now * (isTheOne ? 0.003 : 0.0018));
    const numTeeth = isTheOne ? 8 : 6;
    ctx.fillStyle = isTheOne
      ? 'rgba(254, 240, 138, 0.24)'
      : `rgba(245, 158, 11, ${0.12 + prideRatio * 0.10})`;
    for (let t = 0; t < numTeeth; t++) {
      ctx.rotate((Math.PI * 2) / numTeeth);
      ctx.beginPath();
      ctx.moveTo(coreCoronaR + 1, -2);
      ctx.lineTo(coreCoronaR + (isTheOne ? 10 : 6), 0);
      ctx.lineTo(coreCoronaR + 1, 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ── 5. THE ONE — HIGH NOON LIMITLESS SOLAR CORONA SPIKES ──
  if (isTheOne) {
    ctx.save();
    ctx.rotate(now * 0.001);
    // Blinding 4 Cardinal High-Noon Light Pillars
    for (let c = 0; c < 4; c++) {
      ctx.rotate(Math.PI / 2);
      const pillarLen = totalHeatR * 1.15;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(r * 0.5, 0);
      ctx.lineTo(pillarLen, 0);
      ctx.stroke();

      // Sharp solar diamond glint
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(Math.round(totalHeatR * 0.95), -1, 3, 3);
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws the procedural pixel art body of Escanor (Lion's Sin of Pride).
 * Authentic 2D Discrete Grid Rasterization Engine (P = 2.0px)
 * Features Lowered Holy Knight Armor with exposed muscular neck/collarbone.
 * Adheres strictly to:
 * - Rule 19 (Upright Front POV Camera Orientation, Zero Eyes/Mouth/Nose)
 * - Rule 19.1 (Proportional Vertical Bands, Chiseled Muscular Neck, Lowered Holy Knight Armor)
 * - Rule 11 (Zero shadowBlur CPU performance preservation)
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character radius
 * @param {boolean} [isTheOne=false] - Whether "The One" transformation is active
 */
export function drawEscanorPixelBody(ctx, r, isTheOne = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const steps = Math.ceil((r + P) / P);

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);
      const normY = ry / r;
      const normX = rx / r;

      // ── 1. Stepped Outer Dark Manga Ink Shell ──
      const isOutline = dist >= r - P;
      if (isOutline) {
        ctx.fillStyle = isTheOne ? '#78350F' : '#18181B';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 2. CHISELED FACE & MUSCULAR NECK ZONE (Head, Face & Throat: normY < 0.36) ──
      if (normY < 0.36) {
        // Chiseled Tanned Warrior Face & Neck Skin (Clean base under hair & mustache assets)
        if (normY < -0.40) {
          ctx.fillStyle = '#FFF0E2'; // Upper crown/head skin highlight under hair
        } else if (normY < -0.05) {
          ctx.fillStyle = '#FEE8D6'; // Pale anime face skin
        } else if (normY < 0.10) {
          ctx.fillStyle = '#FDD3B2'; // Warm peach cheek tone
        } else if (normY < 0.22) {
          ctx.fillStyle = '#F9B786'; // Chin & jawline shadow
        } else {
          // Muscular Neck & Collarbone Contours (0.22 <= normY < 0.36)
          if (Math.abs(normX) < 0.16) {
            ctx.fillStyle = '#FDD3B2'; // Center muscular throat & collarbone hollow
          } else if (Math.abs(normX) < 0.35) {
            ctx.fillStyle = '#F9B786'; // Sternocleidomastoid muscle highlight
          } else {
            ctx.fillStyle = '#E4966A'; // Deep neck & trap muscle shadow
          }
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 3. LOWERED GOLDEN HOLY KNIGHT ARMOR (+r*0.36 to +r*1.00) ──
      // Reference: Lowered Segmented Golden Sun-Plate Cuirass with Royal Blue Pauldrons & White Sun Crest

      // A. Royal Blue Shoulder Pauldrons (|normX| >= 0.42 && normY >= 0.36 && normY <= 0.80)
      const isShoulderPauldron = Math.abs(normX) >= 0.42 && normY >= 0.36 && normY <= 0.80;
      if (isShoulderPauldron) {
        const isPauldronGoldRim = Math.abs(normX) >= 0.78 || normY <= 0.40 || (normY >= 0.76 && normY <= 0.80);
        if (isPauldronGoldRim) {
          ctx.fillStyle = isTheOne ? '#FEF08A' : '#FBBF24'; // Polished Gold Pauldron Rim
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // White Lion / Sun Heraldic Crest Pixels inside the Blue Field
        const isPauldronCrest = (
          (Math.abs(gx) === 6 && (gy === 7 || gy === 8)) ||
          (Math.abs(gx) === 7 && (gy === 6 || gy === 7 || gy === 8 || gy === 9)) ||
          (Math.abs(gx) === 8 && (gy === 7 || gy === 8))
        );
        if (isPauldronCrest) {
          ctx.fillStyle = '#FFFFFF'; // Pure white heraldic sun crest
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Royal Blue Main Pauldron Plate
        if (normY < 0.52) {
          ctx.fillStyle = '#3B82F6'; // Lighter royal blue highlight
        } else if (normY < 0.68) {
          ctx.fillStyle = '#2563EB'; // Vibrant royal blue
        } else {
          ctx.fillStyle = '#1D4ED8'; // Deep blue shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // B. Lowered Golden Gorget & Neck Collarplate (normY >= 0.36 && normY <= 0.46 && |normX| < 0.42)
      const isGorget = normY >= 0.36 && normY <= 0.46;
      if (isGorget) {
        if (Math.abs(gx) <= 1) {
          ctx.fillStyle = '#FEF08A'; // Center gorget sheen
        } else if (gy === 5 || gy === 6) {
          ctx.fillStyle = '#FBBF24'; // High collar gold plate
        } else {
          ctx.fillStyle = '#D97706'; // Gorget rim shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // C. Tiered Scalloped Golden Sun Cuirass / Breastplate (normY > 0.46 && normY <= 0.78)
      const isBreastplate = normY > 0.46 && normY <= 0.78;
      if (isBreastplate) {
        // Scalloped Tier Overlap Seams (gy = 7, 10, 13)
        const isTierSeam = (
          (gy === 7 && Math.abs(gx) <= 4) ||
          (gy === 10 && Math.abs(gx) <= 3) ||
          (gy === 13 && Math.abs(gx) <= 3)
        );
        if (isTierSeam) {
          ctx.fillStyle = '#78350F'; // Dark bronze-gold plate seam
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Center Vertical Golden Sheen (Specular Highlight along breastplate ridge)
        if (Math.abs(gx) <= 1) {
          ctx.fillStyle = isTheOne ? '#FFFFFF' : '#FEF08A'; // Blazing solar gleam
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Main Golden Plate Shading
        if (Math.abs(gx) <= 3) {
          ctx.fillStyle = isTheOne ? '#FEF08A' : '#FBBF24'; // Brilliant polished gold
        } else {
          ctx.fillStyle = '#F59E0B'; // Rich gold midtone
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // D. Golden Armored Faulds & Segmented Tassets (normY > 0.78 to +r*1.00)
      // Articulated hip plates and scalloped groin tasset
      const isFauldSeam = (gy === steps - 3 || gy === steps - 1);
      if (isFauldSeam) {
        ctx.fillStyle = '#92400E'; // Segmented fauld seam
        ctx.fillRect(px, py, P, P);
        continue;
      }

      if (Math.abs(gx) <= 2) {
        ctx.fillStyle = isTheOne ? '#FEF08A' : '#FBBF24'; // Central tasset plate
      } else {
        ctx.fillStyle = '#D97706'; // Side hip plate shadow
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  // Extra Lowered Shoulder Pauldron Plates breaking side boundaries for imposing armor silhouette
  const sideY = Math.round(r * 0.38);
  ctx.fillStyle = '#FBBF24'; // Gold top rim
  ctx.fillRect(-r - 3, sideY, 4, 3);
  ctx.fillRect(r - 1, sideY, 4, 3);
  ctx.fillStyle = '#2563EB'; // Royal Blue flare
  ctx.fillRect(-r - 2, sideY + 3, 3, 6);
  ctx.fillRect(r - 1, sideY + 3, 3, 6);

  // Solar glint overlay for "The One" transformation
  if (isTheOne) {
    ctx.fillStyle = 'rgba(254, 240, 138, 0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Escanor Holy Knight Golden Plate Gauntlet
 * Matches the golden armor theme:
 * - Highlight: #FFF795
 * - Base Armor Gold: #FDC236
 * - Warm Amber Shadow: #D97706
 * - Stepped Bronze Outline: #78350F
 */
function _drawEscanorGoldenGauntlet(ctx, cx, cy, radius, isTheOne = false) {
  if (radius <= 0) return;
  const steps = Math.ceil((radius + P) / P);

  // 1. Dark Bronze Outline Shell
  ctx.fillStyle = isTheOne ? '#92400E' : '#78350F';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const d = Math.hypot(gx * P, gy * P);
      if (d <= radius + P * 0.85) {
        ctx.fillRect(snap(cx + gx * P), snap(cy + gy * P), P, P);
      }
    }
  }

  // 2. Armor Gold Plate Fill with Specular Sheen
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const d = Math.hypot(rx, ry);
      if (d > radius) continue;

      const px = snap(cx + rx);
      const py = snap(cy + ry);

      if (ry < -radius * 0.25 && rx > -radius * 0.35) {
        ctx.fillStyle = isTheOne ? '#FFFFFF' : '#FFF795'; // Brilliant armor shine
      } else if (ry > radius * 0.40) {
        ctx.fillStyle = isTheOne ? '#B45309' : '#D97706'; // Warm amber gold shadow
      } else {
        ctx.fillStyle = isTheOne ? '#FEF08A' : '#FDC236'; // Vibrant Holy Knight armor gold
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  // Segmented Knuckle Ridge Specular Pixel
  ctx.fillStyle = isTheOne ? '#FFFFFF' : '#FFF795';
  ctx.fillRect(snap(cx - radius * 0.2), snap(cy - radius * 0.2), P, P);
}

/**
 * Escanor Pointing Gauntlet (Retro Arcade Pixel Art Edition)
 * Golden Holy Knight plate gauntlet with:
 * - Quantized discrete 24-way arcade stick aiming angles (~15° notches)
 * - Authentic 2D Discrete Grid (P = 2.0px) pixel art shading
 * - 4-frame retro arcade cycling ignition spark at the extended fingertip
 */
function _drawEscanorPointingGauntlet(ctx, cx, cy, radius, isTheOne = false, pointProgress = 1.0, fingerAngle = -Math.PI / 2, now = Date.now(), alpha = 1.0, showSpark = true) {
  if (radius <= 0 || alpha <= 0.001) return;
  const currentNow = (typeof now === 'number' && !Number.isNaN(now)) ? now : Date.now();

  const snapCx = snap(cx);
  const snapCy = snap(cy);

  const needAlphaWrap = (alpha < 0.999);
  if (needAlphaWrap) {
    ctx.save();
    ctx.globalAlpha *= alpha;
  }

  // 1. Palm / Fist Base (Discrete Pixel Gauntlet)
  _drawEscanorGoldenGauntlet(ctx, snapCx, snapCy, snap(radius * 0.85), isTheOne);

  // 2. Extended Index Finger (Quantized 24-Way Arcade Stick Direction)
  ctx.save();
  ctx.translate(snapCx, snapCy);

  // Quantize finger angle to authentic 24-way discrete arcade angles (~15° per step)
  const angleStep = Math.PI / 12;
  const rawRot = fingerAngle + Math.PI / 2;
  const quantizedAngle = Math.round(rawRot / angleStep) * angleStep;
  ctx.rotate(quantizedAngle);

  const fingerLen = snap(radius * 1.40);
  const fingerTopY = -fingerLen;
  const outlineColor = isTheOne ? '#78350F' : '#5B210B';
  const shadowColor = isTheOne ? '#B45309' : '#92400E';
  const goldColor = isTheOne ? '#FDE047' : '#FBBF24';
  const highlightColor = isTheOne ? '#FFFFFF' : '#FEF08A';

  // 2a. Stepped Dark Ink Outline (Rule 3.5: Discrete grid bounding shell)
  ctx.fillStyle = outlineColor;
  ctx.fillRect(snap(-4), snap(fingerTopY - 2), 8, fingerLen + 4);

  // 2b. Inner Gauntlet Armor Shadow
  ctx.fillStyle = shadowColor;
  ctx.fillRect(snap(-3), snap(fingerTopY), 6, fingerLen);

  // 2c. Golden Armor Plate Base Fill
  ctx.fillStyle = goldColor;
  ctx.fillRect(snap(-2), snap(fingerTopY), 4, fingerLen - 2);

  // 2d. Specular Highlight Core along leading edge
  ctx.fillStyle = highlightColor;
  ctx.fillRect(snap(-1), snap(fingerTopY), 2, snap(fingerLen * 0.80));

  // 3. 4-Frame Retro Arcade Cycling Ignition Spark at Fingertip
  if (showSpark && pointProgress >= 0.15) {
    const sparkFrame = Math.floor((currentNow / 75) % 4); // 75ms per retro arcade flash frame

    if (sparkFrame === 0) {
      // Small 2x2 intense white core
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(snap(-1), snap(fingerTopY - 2), 2, 2);
    } else if (sparkFrame === 1) {
      // 4x4 Diamond Flash: Amber outer + White inner
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(snap(-3), snap(fingerTopY - 4), 6, 6);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(snap(-2), snap(fingerTopY - 3), 4, 4);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(snap(-1), snap(fingerTopY - 2), 2, 2);
    } else if (sparkFrame === 2) {
      // 8x2 Horizontal Glint + 2x8 Vertical Cross Glint (Classic Arcade Beam Flare)
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(snap(-4), snap(fingerTopY - 2), 8, 2);
      ctx.fillRect(snap(-1), snap(fingerTopY - 5), 2, 8);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(snap(-2), snap(fingerTopY - 3), 4, 4);
    } else {
      // 4x4 Golden Mote Flare
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(snap(-2), snap(fingerTopY - 3), 4, 4);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(snap(-1), snap(fingerTopY - 2), 2, 2);
    }
  }

  ctx.restore();

  if (needAlphaWrap) {
    ctx.restore();
  }
}

/**
 * Computes exact frame-by-frame state for Escanor's Divine Axe Rhitta Chop.
 * Directly honors chopLiftFrames, chopLiftHoldFrames, chopStrikeFrames, chopRecoveryFrames.
 */
export function _getEscanorChopAnimationState(fighter) {
  const r = fighter.r || 28;
  // Frame 1: Resting stance (Weapon held in hand on the LEFT-LOWER side of body -X/+Y, pointing down-forward to the right)
  const idleAxeAngle = 0.14;
  const idleHandX = -r * 0.85;
  const idleHandY = r * 0.40;
  const idleBackHandX = r * 0.65;
  const idleBackHandY = -r * 0.18;

  if (!fighter.slashSwingTimer || fighter.slashSwingTimer <= 0) {
    if (!fighter.chopHitPauseTimer || fighter.chopHitPauseTimer <= 0) {
      return {
        isSwinging: false,
        phase: 'idle',
        axeAngle: idleAxeAngle,
        handX: idleHandX,
        handY: idleHandY,
        backHandX: idleBackHandX,
        backHandY: idleBackHandY,
        strikeP: 0,
        pauseP: 0,
        recP: 0
      };
    }
  }

  const strikeEndAngle = 1.05; // ~60° forward-down cleave follow-through angle
  const strikeEndHandX = r * 1.15; // Front hand lunges forward with full body momentum
  const strikeEndHandY = r * 0.42;
  const strikeEndBackHandX = r * 1.35; // Back hand extends forward in two-handed grip
  const strikeEndBackHandY = -r * 0.05;

  // Cinematic Hit-Pause Impact Freeze: Axe locked in exact collision pose while shockwave / sparks hold
  if (fighter.chopHitPauseTimer && fighter.chopHitPauseTimer > 0) {
    const pauseMax = fighter.chopHitPauseMax || 20;
    const pauseP = Math.max(0, Math.min(1.0, 1.0 - (fighter.chopHitPauseTimer / pauseMax)));

    // Mid-pause: preserve the EXACT collision pose where the blade struck the enemy
    const hitP = (typeof fighter.chopHitProgress === 'number') ? fighter.chopHitProgress : 1.0;
    const axeAngle = (typeof fighter.chopHitAxeAngle === 'number') ? fighter.chopHitAxeAngle : strikeEndAngle;
    const handX = (typeof fighter.chopHitHandX === 'number') ? fighter.chopHitHandX : strikeEndHandX;
    const handY = (typeof fighter.chopHitHandY === 'number') ? fighter.chopHitHandY : strikeEndHandY;
    const backHandX = (typeof fighter.chopHitBackHandX === 'number') ? fighter.chopHitBackHandX : strikeEndBackHandX;
    const backHandY = (typeof fighter.chopHitBackHandY === 'number') ? fighter.chopHitBackHandY : strikeEndBackHandY;

    // High-frequency kinetic micro-tremor during hit-pause (simulating massive weapon friction biting into enemy)
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
    const tremorAmp = (typeof cfg.chopHitTremorIntensity === 'number') ? cfg.chopHitTremorIntensity : 1.5;
    const tremor = Math.sin((fighter.chopHitPauseTimer || 0) * 2.8) * tremorAmp;

    return {
      isSwinging: true,
      phase: 'hitPause',
      axeAngle: axeAngle + tremor * 0.02,
      handX: handX + tremor * 0.4,
      handY: handY + tremor * 0.8,
      backHandX: backHandX + tremor * 0.4,
      backHandY: backHandY + tremor * 0.8,
      strikeP: hitP,
      pauseP,
      recP: 0,
      hitConnected: Boolean(fighter._chopHitConnected)
    };
  }

  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
  const liftFrames = (typeof fighter.chopLiftFrames === 'number') ? fighter.chopLiftFrames : ((typeof cfg.chopLiftFrames === 'number') ? cfg.chopLiftFrames : 8);
  const holdFrames = (typeof fighter.chopLiftHoldFrames === 'number') ? fighter.chopLiftHoldFrames : ((typeof cfg.chopLiftHoldFrames === 'number') ? cfg.chopLiftHoldFrames : 20);
  const strikeFrames = (typeof fighter.chopStrikeFrames === 'number') ? fighter.chopStrikeFrames : ((typeof cfg.chopStrikeFrames === 'number') ? cfg.chopStrikeFrames : 8);
  const recFrames = (typeof fighter.chopRecoveryFrames === 'number') ? fighter.chopRecoveryFrames : ((typeof cfg.chopRecoveryFrames === 'number') ? cfg.chopRecoveryFrames : 24);
  const totalFrames = fighter.slashSwingMaxTimer || (liftFrames + holdFrames + strikeFrames + recFrames);

  const elapsed = Math.max(0, totalFrames - fighter.slashSwingTimer);

  // Frame 2: Lift stance (hand at upper-left, weapon shaft pointing up-left over back shoulder)
  const overheadAngle = -2.45; // ~-140° pointing up-left
  const overheadHandX = -r * 0.48; // Shifted to left side
  const overheadHandY = -r * 0.42; // Upper area
  const overheadBackHandX = r * 0.35;
  const overheadBackHandY = -r * 0.10;

  let axeAngle = idleAxeAngle;
  let handX = idleHandX;
  let handY = idleHandY;
  let backHandX = idleBackHandX;
  let backHandY = idleBackHandY;
  let strikeP = 0;
  let recP = 0;
  let phase = 'lift';

  if (elapsed < liftFrames) {
    // 1. LIFT: Raise weapon up from Frame 1 resting pose to Frame 2 overhead stance
    phase = 'lift';
    const p = Math.min(1.0, elapsed / Math.max(1, liftFrames));
    // Smooth sine ease-in-out: starts slow (heavy weapon), flows through, decelerates at top
    const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
    axeAngle = idleAxeAngle + (overheadAngle - idleAxeAngle) * ease;
    handX = idleHandX + ease * (overheadHandX - idleHandX);
    handY = idleHandY + ease * (overheadHandY - idleHandY);
    backHandX = idleBackHandX + ease * (overheadBackHandX - idleBackHandX);
    backHandY = idleBackHandY + ease * (overheadBackHandY - idleBackHandY);
  } else if (elapsed < liftFrames + holdFrames) {
    // 2. POISED OVERHEAD HOLD: STAYS POISED IN HIGH OVERHEAD CHOP POSITION FOR EXACT chopLiftHoldFrames!
    phase = 'hold';
    const holdElapsed = elapsed - liftFrames;
    const tensionTremor = Math.sin(holdElapsed * 0.8) * 0.02; // Muscular tension tremor
    axeAngle = overheadAngle + tensionTremor;
    handX = overheadHandX;
    handY = overheadHandY + Math.sin(holdElapsed * 0.3) * 0.8;
    backHandX = overheadBackHandX;
    backHandY = overheadBackHandY + Math.sin(holdElapsed * 0.3) * 0.8;
  } else if (elapsed < liftFrames + holdFrames + strikeFrames) {
    // 3. EXPLOSIVE DOWNWARD CHOP STRIKE: Snaps from overheadAngle down to strikeEndAngle
    phase = 'strike';
    const strikeElapsed = elapsed - (liftFrames + holdFrames);
    strikeP = Math.min(1.0, strikeElapsed / Math.max(1, strikeFrames));
    const ease = 1 - Math.pow(1 - strikeP, 3); // Cubic explosive snap
    axeAngle = overheadAngle + (strikeEndAngle - overheadAngle) * ease;
    handX = overheadHandX + ease * (strikeEndHandX - overheadHandX);
    handY = overheadHandY + ease * (strikeEndHandY - overheadHandY);
    backHandX = overheadBackHandX + ease * (strikeEndBackHandX - overheadBackHandX);
    backHandY = overheadBackHandY + ease * (strikeEndBackHandY - overheadBackHandY);
  } else {
    // 4. RECOVERY: Smoothly return from ground cleave follow-through to resting pose
    phase = 'recovery';
    const recElapsed = elapsed - (liftFrames + holdFrames + strikeFrames);
    recP = Math.min(1.0, recElapsed / Math.max(1, recFrames));
    strikeP = 1.0;
    const ease = recP * (2 - recP);
    axeAngle = strikeEndAngle + (idleAxeAngle - strikeEndAngle) * ease;
    handX = strikeEndHandX + (idleHandX - strikeEndHandX) * ease;
    handY = strikeEndHandY + (idleHandY - strikeEndHandY) * ease;
    backHandX = strikeEndBackHandX + (idleBackHandX - strikeEndBackHandX) * ease;
    backHandY = strikeEndBackHandY + (idleBackHandY - strikeEndBackHandY) * ease;
  }

  return { isSwinging: true, phase, axeAngle, handX, handY, backHandX, backHandY, strikeP, pauseP: 0, recP, hitConnected: Boolean(fighter._chopHitConnected) };
}

/**
 * Escanor Layer 0: Back Hand & Resting Weapon — (Behind Body Layer)
 */
function _drawEscanorBackHand(ctx, fighter, r, chopState, isPunching, punchPhase) {
  const handR = Math.max(r * 0.28, getHandSize(6.5));

  // While actively channeling Cruel Sun, back hand is hidden
  if (fighter.isChannelingCruelSun) {
    return;
  }

  // During post-throw recovery, back hand smoothly fades in as pointing hand hides
  if (fighter.cruelSunRecoveryTimer && fighter.cruelSunRecoveryTimer > 0) {
    const maxRecTimer = fighter.cruelSunMaxRecoveryTimer || 180;
    const recRemaining = fighter.cruelSunRecoveryTimer || 0;
    const recElapsed = Math.max(0, maxRecTimer - recRemaining);
    const recP = Math.max(0, Math.min(1.0, recElapsed / maxRecTimer));

    if (recP < 0.25) {
      return; // Fully hidden while pointing hand is visible
    }

    const backHandAlpha = Math.min(1.0, (recP - 0.25) / 0.30);
    ctx.save();
    ctx.globalAlpha *= backHandAlpha;
    let handX = r * 0.65;
    let handY = -r * 0.18;
    _drawEscanorGoldenGauntlet(ctx, handX, handY, handR, fighter.isTheOneActive);
    ctx.restore();
    return;
  }

  let handX = r * 0.65;
  let handY = -r * 0.18;

  if (chopState.isSwinging) {
    handX = chopState.backHandX;
    handY = chopState.backHandY;
  } else if (isPunching) {
    handX = r * 0.85 + Math.sin(punchPhase * Math.PI) * (r * 0.35);
    handY = -r * 0.20;
  }

  // Golden Plate Gauntlet (Forward guard hand on the right side +X)
  _drawEscanorGoldenGauntlet(ctx, handX, handY, handR, fighter.isTheOneActive);
}

/**
 * Escanor Layer 4: Front Hand & Divine Axe Rhitta / Pointing Gauntlet (On Top of Body Layer)
 */
function _drawEscanorFrontHand(ctx, fighter, r, chopState, isPunching, punchPhase, now = Date.now(), facingLeft = false) {
  const currentNow = (typeof now === 'number' && !Number.isNaN(now)) ? now : Date.now();
  const handR = Math.max(r * 0.30, getHandSize(7.0));

  // Cruel Sun Activation, Aim & Smooth Post-Throw Hand Hide Pose:
  // 1. Left Hand firmly grips Divine Axe Rhitta on the front lower-left (-X, +Y)
  // 2. Right Hand:
  //    - Phase 1 (0.00-0.25): Lifts from resting up to skyward pointing pose
  //    - Phase 2 (0.25-0.75): Points skyward with muscular tension tremor as sun expands overhead
  //    - Phase 3 (0.75-1.00): Smoothly lowers & aims pointing index finger directly forward at enemy along local +X!
  //    - Post-Throw Recovery: Smoothly retracts pointing gauntlet and fades it to 0 opacity
  if (fighter.isChannelingCruelSun || (fighter.cruelSunRecoveryTimer && fighter.cruelSunRecoveryTimer > 0)) {
    const isRecovery = !fighter.isChannelingCruelSun && Boolean(fighter.cruelSunRecoveryTimer > 0);
    const maxTimer = fighter.cruelSunMaxChargeTimer || 45;
    const curTimer = fighter.cruelSunChargeTimer || 0;
    const progress = isRecovery ? 1.0 : Math.max(0, Math.min(1.0, 1.0 - (curTimer / maxTimer)));

    // 1. Left Hand with Divine Axe Rhitta (Front Layer)
    let leftHandX = snap(-r * 0.72);
    let leftHandY = snap(r * 0.38);
    let axeAngle = 0.35; // Angled down-right across bottom

    // 2. Right Hand Retro Arcade Keyframed Aiming
    const rawCastAngle = (fighter.cruelSunCastAngle !== undefined) ? fighter.cruelSunCastAngle : (fighter.cruelSunReleaseAngle || 0);
    // When ctx.scale(-1, 1) is active (facingLeft), transform raw target angle into local flipped coordinate space
    const castAngle = facingLeft ? (Math.PI - rawCastAngle) : rawCastAngle;
    const restingHandX = snap(r * 0.75);
    const restingHandY = snap(-r * 0.18);
    const midLiftHandX = snap(r * 0.82);
    const midLiftHandY = snap(-r * 0.28);
    const poisedHandX = snap(r * 0.90);
    const poisedHandY = snap(-r * 0.38);
    const forwardHandX = snap(Math.cos(castAngle) * (r * 0.95));
    const forwardHandY = snap(Math.sin(castAngle) * (r * 0.95));

    let rightHandX = poisedHandX;
    let rightHandY = poisedHandY;
    let fingerAngle = -Math.PI / 2;
    let handAlpha = 1.0;
    let showSpark = !isRecovery;

    if (isRecovery) {
      // Post-Throw Smooth Hand Retraction & Fade Out:
      const maxRecTimer = fighter.cruelSunMaxRecoveryTimer || 180;
      const recRemaining = fighter.cruelSunRecoveryTimer || 0;
      const recElapsed = Math.max(0, maxRecTimer - recRemaining);
      const recP = Math.max(0, Math.min(1.0, recElapsed / maxRecTimer));

      if (recP <= 0.08) {
        // Initial follow-through hold right after release
        rightHandX = forwardHandX;
        rightHandY = forwardHandY;
        fingerAngle = castAngle;
        handAlpha = 1.0;
      } else if (recP < 0.45) {
        // Smoothly ease back towards resting guard position while fading out to 0
        const fadeNorm = (recP - 0.08) / 0.37; // 0.0 -> 1.0
        const smoothEase = 0.5 - 0.5 * Math.cos(fadeNorm * Math.PI);
        rightHandX = snap(forwardHandX + (restingHandX - forwardHandX) * smoothEase);
        rightHandY = snap(forwardHandY + (restingHandY - forwardHandY) * smoothEase);
        fingerAngle = castAngle + (-Math.PI * 0.15 - castAngle) * smoothEase;
        handAlpha = Math.max(0, 1.0 - smoothEase);
      } else {
        // Pointing hand is fully hidden
        handAlpha = 0.0;
      }

      // Smoothly blend left hand holding Divine Axe Rhitta into resting pose
      if (recP > 0.25) {
        const blendP = Math.min(1.0, (recP - 0.25) / 0.30);
        const ease = 0.5 - 0.5 * Math.cos(blendP * Math.PI);
        leftHandX = snap(-r * 0.72 + (chopState.handX - (-r * 0.72)) * ease);
        leftHandY = snap(r * 0.38 + (chopState.handY - r * 0.38) * ease);
        axeAngle = 0.35 + (chopState.axeAngle - 0.35) * ease;
      }
    } else if (progress < 0.25) {
      // Phase 1: 3-Frame Discrete Arcade Arm Lift (Pose-to-Pose Keyframes)
      if (progress < 0.08) {
        // Frame 0: Resting Guard Pose
        rightHandX = restingHandX;
        rightHandY = restingHandY;
        fingerAngle = -Math.PI * 0.15;
      } else if (progress < 0.17) {
        // Frame 1: Mid-Diagonal Lift Pose
        rightHandX = midLiftHandX;
        rightHandY = midLiftHandY;
        fingerAngle = -Math.PI * 0.32;
      } else {
        // Frame 2: High Skyward Ready Pose
        rightHandX = poisedHandX;
        rightHandY = poisedHandY;
        fingerAngle = -Math.PI / 2;
      }
    } else if (progress < 0.75) {
      // Phase 2: Retro Stepped Poise Hold & Muscular Tension Tremor
      // Discrete integer-stepped pixel displacement on 120ms retro cycle (0px / -2px)
      const retroTremor = (Math.floor(currentNow / 120) % 2 === 0) ? -P : 0;
      rightHandX = poisedHandX;
      rightHandY = snap(poisedHandY + retroTremor);
      fingerAngle = -Math.PI / 2;
    } else {
      // Phase 3: 3-Step Discrete Arcade Aim Snap Transition (Skyward -> Target Angle)
      const phaseP = (progress - 0.75) / 0.25; // 0.0 -> 1.0

      // Compute shortest angular path to target angle
      let angleDiff = castAngle - (-Math.PI / 2);
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (phaseP < 0.35) {
        // Step 1 (Keyframe 1: 33% Snap)
        const stepRatio = 0.33;
        rightHandX = snap(poisedHandX + (forwardHandX - poisedHandX) * stepRatio);
        rightHandY = snap(poisedHandY + (forwardHandY - poisedHandY) * stepRatio);
        fingerAngle = -Math.PI / 2 + angleDiff * stepRatio;
      } else if (phaseP < 0.70) {
        // Step 2 (Keyframe 2: 66% Snap)
        const stepRatio = 0.66;
        rightHandX = snap(poisedHandX + (forwardHandX - poisedHandX) * stepRatio);
        rightHandY = snap(poisedHandY + (forwardHandY - poisedHandY) * stepRatio);
        fingerAngle = -Math.PI / 2 + angleDiff * stepRatio;
      } else {
        // Step 3 (Keyframe 3: 100% Target Lock)
        rightHandX = forwardHandX;
        rightHandY = forwardHandY;
        fingerAngle = castAngle;
      }
    }

    drawDivineAxeRhitta(ctx, leftHandX, leftHandY, axeAngle, r, {
      isSwinging: false,
      isTheOne: fighter.isTheOneActive,
      prideStacks: fighter.prideStacks || 0,
      heatLevel: 1.0 + (fighter.prideStacks || 0) * 0.2
    });
    _drawEscanorGoldenGauntlet(ctx, leftHandX, leftHandY, handR, fighter.isTheOneActive);

    if (handAlpha > 0.001) {
      _drawEscanorPointingGauntlet(ctx, rightHandX, rightHandY, handR, fighter.isTheOneActive, progress, fingerAngle, currentNow, handAlpha, showSpark);
    }
    return;
  }

  let handX = chopState.handX;
  let handY = chopState.handY;
  let axeAngle = chopState.axeAngle;

  if (chopState.isSwinging) {
    handX = chopState.handX;
    handY = chopState.handY;
    axeAngle = chopState.axeAngle;
  } else if (isPunching) {
    handX = -r * 0.40 + Math.sin(punchPhase * Math.PI) * (r * 0.40);
    handY = r * 0.35;
    axeAngle = 0.14;
  }

  // Draw Divine Axe Rhitta held firmly in hand on the lower-left side of the body (-X, +Y)
  drawDivineAxeRhitta(ctx, handX, handY, axeAngle, r, {
    isSwinging: chopState.isSwinging,
    isTheOne: fighter.isTheOneActive,
    prideStacks: fighter.prideStacks || 0,
    heatLevel: 1.0 + (fighter.prideStacks || 0) * 0.2
  });

  // Axe Head Solar Flash Sync at Full Arc Extension (Hit-Pause Impact Frame)
  if (chopState.isSwinging && chopState.phase === 'hitPause') {
    const prideScaleMult = 1.0 + (fighter.prideStacks || 0) * 0.04;
    const hubDist = (r * 4.0) * (fighter.isTheOneActive ? 1.35 : prideScaleMult);
    const hubX = handX + Math.cos(axeAngle) * hubDist;
    const hubY = handY + Math.sin(axeAngle) * hubDist;
    const intensity = Math.sin(Math.max(0, 1.0 - (chopState.pauseP || 0)) * Math.PI * 0.5);
    drawRhittaSolarFlash(ctx, hubX, hubY, fighter.isTheOneActive, intensity);
  }

  // Golden Gauntlet gripping the axe blue hilt on the lower-left side of the body
  _drawEscanorGoldenGauntlet(ctx, handX, handY, handR, fighter.isTheOneActive);
}
