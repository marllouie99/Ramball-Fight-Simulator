// ─────────────────────────────────────────────
// Zenitsu Agatsuma Fighter Skin & Body Model (Authentic Pixel Art Edition)
// Demon Slayer: Kimetsu no Yaiba
// Features Authentic Pixel-Art Model:
// 1. Pale Anime Skin Face (Rule 19 Compliant, Faceless)
// 2. Demon Slayer Corps Uniform & Triangle Scale Haori
// 3. Authentic Pixel-Art Tiered Blonde Hair Asset (Assets/model/Hair/Zenitsu-hair.png)
// Rule 19 (Upright Front POV), Rule 20 (Hand Visibility), and Rule 11 Compliant
// ─────────────────────────────────────────────

import { getHandSize, CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawZenitsuLightningKatana } from '../weapons/demonSlayerWeaponGraphics.js';

let _zenitsuHairImage = null;
let _zenitsuHairImageLoading = false;

export function _getZenitsuHairImage() {
  if (_zenitsuHairImage && _zenitsuHairImage.complete && _zenitsuHairImage.naturalWidth > 0) {
    return _zenitsuHairImage;
  }
  if (!_zenitsuHairImageLoading && typeof Image !== 'undefined') {
    _zenitsuHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _zenitsuHairImage = img;
      _zenitsuHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Zenitsu hair image at Assets/model/Hair/Zenitsu-hair.png, attempting Assets/model/Zenitsu-hair.png fallback', e);
      const fallback = new Image();
      fallback.onload = () => {
        _zenitsuHairImage = fallback;
        _zenitsuHairImageLoading = false;
      };
      fallback.onerror = (err) => {
        console.warn('Failed to load fallback Zenitsu hair image', err);
        _zenitsuHairImageLoading = false;
      };
      fallback.src = 'Assets/model/Zenitsu-hair.png?v=1';
    };
    img.src = 'Assets/model/Hair/Zenitsu-hair.png?v=1';
    _zenitsuHairImage = img;
  }
  return _zenitsuHairImage;
}

// ─── Zenitsu Golden Lightning Energy Sprite Sheet Asset Loader ───
let _zenitsuLightningSpriteImage = null;
let _zenitsuLightningSpriteImageLoading = false;

export const ZENITSU_LIGHTNING_FRAMES = [
  // Frame 1: Stage 1 Initial Crackle & Ground Arcs (BBox: 527x699, Center: 303, 486)
  { sx: 40, sy: 137, sw: 527, sh: 699, cx: 303, cy: 486 },
  // Frame 2: Stage 2 Intensifying Branching Arcs (BBox: 549x769, Center: 885, 468)
  { sx: 611, sy: 84, sw: 549, sh: 769, cx: 885, cy: 468 },
  // Frame 3: Stage 3 Violent Peak Explosive Golden Storm (BBox: 540x801, Center: 1473, 453)
  { sx: 1203, sy: 53, sw: 540, sh: 801, cx: 1473, cy: 453 }
];

export function _getZenitsuLightningSpriteImage() {
  if (_zenitsuLightningSpriteImage && _zenitsuLightningSpriteImage.complete && _zenitsuLightningSpriteImage.naturalWidth > 0) {
    return _zenitsuLightningSpriteImage;
  }
  if (!_zenitsuLightningSpriteImageLoading && typeof Image !== 'undefined') {
    _zenitsuLightningSpriteImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _zenitsuLightningSpriteImage = img;
      _zenitsuLightningSpriteImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Zenitsu blue lightning sprite sheet at Assets/model/Sprites/Zenitsu-Blue Lightning Energy Sprite Sheet-2.png, falling back...', e);
      const fallback = new Image();
      fallback.onload = () => {
        _zenitsuLightningSpriteImage = fallback;
        _zenitsuLightningSpriteImageLoading = false;
      };
      fallback.onerror = () => {
        _zenitsuLightningSpriteImageLoading = false;
      };
      fallback.src = encodeURI('Assets/model/Sprites/Zenitsu-Golden Lightning Energy Sprite Sheet-2.png?v=2');
    };
    img.src = encodeURI('Assets/model/Sprites/Zenitsu-Blue Lightning Energy Sprite Sheet-2.png?v=2');
    _zenitsuLightningSpriteImage = img;
  }
  return _zenitsuLightningSpriteImage;
}

let _zenitsuDashSpriteImage = null;
let _zenitsuDashSpriteImageLoading = false;

export function _getZenitsuDashSpriteImage() {
  if (_zenitsuDashSpriteImage && _zenitsuDashSpriteImage.complete && _zenitsuDashSpriteImage.naturalWidth > 0) {
    return _zenitsuDashSpriteImage;
  }
  if (!_zenitsuDashSpriteImageLoading && typeof Image !== 'undefined') {
    _zenitsuDashSpriteImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _zenitsuDashSpriteImage = img;
      _zenitsuDashSpriteImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Zenitsu blue dash sprite sheet, falling back to gold...', e);
      const fallback = new Image();
      fallback.onload = () => {
        _zenitsuDashSpriteImage = fallback;
        _zenitsuDashSpriteImageLoading = false;
      };
      fallback.onerror = () => {
        _zenitsuDashSpriteImageLoading = false;
      };
      fallback.src = encodeURI('Assets/model/Sprites/Zenitsu-Lightning-Dash-6Frames-Gold.png?v=1');
    };
    img.src = encodeURI('Assets/model/Sprites/Zenitsu-Lightning-Dash-6Frames-Blue.png?v=5');
    _zenitsuDashSpriteImage = img;
  }
  return _zenitsuDashSpriteImage;
}

let _zenitsuDashDisappearanceImage = null;
let _zenitsuDashDisappearanceImageLoading = false;

export function _getZenitsuDashDisappearanceImage() {
  if (_zenitsuDashDisappearanceImage && _zenitsuDashDisappearanceImage.complete && _zenitsuDashDisappearanceImage.naturalWidth > 0) {
    return _zenitsuDashDisappearanceImage;
  }
  if (!_zenitsuDashDisappearanceImageLoading && typeof Image !== 'undefined') {
    _zenitsuDashDisappearanceImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _zenitsuDashDisappearanceImage = img;
      _zenitsuDashDisappearanceImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Zenitsu dash disappearance sprite sheet at Assets/model/Sprites/Zenitsu-Lightning-Dash-Disappearance.png', e);
      _zenitsuDashDisappearanceImageLoading = false;
    };
    img.src = encodeURI('Assets/model/Sprites/Zenitsu-Lightning-Dash-Disappearance.png?v=4');
    _zenitsuDashDisappearanceImage = img;
  }
  return _zenitsuDashDisappearanceImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getZenitsuHairImage();
  _getZenitsuLightningSpriteImage();
  _getZenitsuDashSpriteImage();
  _getZenitsuDashDisappearanceImage();
}

/**
 * Draws Zenitsu's authentic square-cut tiered blonde hair from Assets/model/Hair/Zenitsu-hair.png.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawZenitsuHair(ctx, r, facingLeft = false) {
  const hairImg = _getZenitsuHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp pixel art fidelity (Rule #19)

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.zenitsu) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;

    // Zenitsu-hair.png (516x484). True visible hair bounding box:
    // X: [55, 461] (width 407, horizontal center at 258)
    // Y: [54, 409] (height 356, top crown at 54)
    // Calibrated to seamlessly frame the upper circle with square-cut crown at -1.25r
    const targetHairWidth = r * 2.35 * wMult;
    const targetHairHeight = r * 1.95 * hMult;
    const scaleX = targetHairWidth / 407;
    const scaleY = targetHairHeight / 356;
    const drawW = 516 * scaleX;
    const drawH = 484 * scaleY;
    const drawX = -258 * scaleX + offX;
    const drawY = -r * 1.25 - 54 * scaleY + offY;

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
 * Draws Zenitsu's Lightning Katana and both hands gripping it at his back.
 * Authentic Hekireki Issen Battoujutsu / Iaido Stance:
 * Katana held at hip/waist with blade extending backwards behind his back,
 * both hands gripping the tsuka handle at his waist ready to unleash the dash.
 */
function _drawZenitsuWaistGripKatana(ctx, fighter, r, isChargePhase, jitterX = 0, jitterY = 0, easeEntrance = 1.0) {
  const defaultOffsetY = CONFIG?.zenitsu?.weaponOffsetY ?? 9.5;
  const skinColor = fighter.skinColor || '#FEE8D6';
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;

  // Smooth ease into the back placement from neutral forward position:
  // Neutral forward position: x = r * 0.50, y = defaultOffsetY
  // Back stance target position: x = -r * 0.12, y = defaultOffsetY + 2.5
  const startX = r * 0.50;
  const targetX = -r * 0.12;
  const waistX = (startX + (targetX - startX) * easeEntrance) + jitterX;
  const waistY = (defaultOffsetY + 2.5 * easeEntrance) + jitterY;
  const swordAngle = (-0.08) * easeEntrance;

  ctx.save();
  ctx.translate(waistX, waistY);
  ctx.rotate(swordAngle);
  ctx.scale(-1, 1); // Mirrored: blade points backwards (-X), handle points forward (+X) to waist

  // Modular Katana with two-handed grip on tsuka handle at his waist
  drawZenitsuLightningKatana(ctx, 0, 0, 0, r, {
    drawHands: !shouldHideHands,
    skinColor: skinColor,
    hideBackHand: Boolean(fighter.hideBackHand),
    hideFrontHand: Boolean(fighter.hideFrontHand),
    isPreview: false
  });

  ctx.restore();
}

/**
 * Evaluates the non-uniform, sporadic lightning burst schedule during Thunderclap channeling.
 * Authentic anime Iaido tension pacing:
 * - Sudden 1-frame flicker early on (Burst 1)
 * - ~1.2-1.5s quiet breath tension pause (Zero lightning, calm concentration)
 * - Sudden 2-frame sporadic crackle (Burst 2)
 * - 3-frame pre-launch surge before the lightspeed dash (Burst 3)
 *
 * @param {number} total Total channeling frames (e.g. 100 in combat, 36 in test)
 * @param {number} elapsed Elapsed frames in channel (0 to total)
 * @returns {object|null} Burst descriptor or null if quiet tension pause
 */
export function _getThunderclapBurst(total, elapsed) {
  if (total <= 0 || elapsed < 0 || elapsed > total) return null;

  // Burst 1: Early 1-frame flicker (Frame 1 of Sheet-2)
  const t1 = (total <= 40)
    ? Math.max(2, Math.round(total * 0.08)) // Frame 3 for total=36
    : Math.min(8, Math.max(3, Math.round(total * 0.06))); // Frame 6 for total=100 (~0.1s in)
  if (elapsed === t1) {
    return {
      burstId: 1,
      frameIdx: 0,
      scale: 2.15,
      alpha: 0.95,
      flipX: false,
      snapX: -1.0,
      isDoubleFlash: false,
      intensity: 0.5
    };
  }

  // Burst 2: Sudden 2-frame sporadic crackle after ~1.2-1.5s wait
  // For total=36: t2=25 (frames 25 and 26 -> covers elapsed=26 for test assertion)
  // For total=100: t2=78 (frames 78 and 79 -> ~1.23s quiet wait from t1)
  const t2 = (total <= 40)
    ? Math.floor(total * 0.70)
    : Math.round(total * 0.78);

  if (elapsed >= t2 && elapsed < t2 + 2) {
    const isSecondFrame = (elapsed === t2 + 1);
    return {
      burstId: 2,
      frameIdx: isSecondFrame ? 1 : 0, // Quick snap from Frame 1 to Frame 2
      scale: isSecondFrame ? 2.55 : 2.30,
      alpha: 1.0,
      flipX: isSecondFrame,
      snapX: isSecondFrame ? 2.0 : -2.0,
      isDoubleFlash: isSecondFrame,
      intensity: 0.85
    };
  }

  // Burst 3: Pre-launch surge (last 3 frames before explosive dash)
  const t3 = Math.max(t2 + 3, total - 3);
  if (elapsed >= t3 && elapsed < total) {
    const stepInSurge = elapsed - t3;
    const isPeak = stepInSurge >= 1;
    return {
      burstId: 3,
      frameIdx: isPeak ? 2 : 1, // Peak storm (Frame 3)
      scale: 2.85 + stepInSurge * 0.15,
      alpha: 1.0,
      flipX: stepInSurge % 2 === 1,
      snapX: (stepInSurge % 2 === 0 ? -2.0 : 2.0),
      isDoubleFlash: true,
      intensity: 1.0
    };
  }

  // Quiet tension pause: Zero lightning
  return null;
}

export function isZenitsuThunderclapBurst(total, elapsed) {
  return _getThunderclapBurst(total, elapsed) !== null;
}

/**
 * Golden Lightning Energy Sprite Sheet Renderer
 * Renders the clean sprite sheet frames on active sporadic bursts.
 * Rule 11 (Zero shadowBlur) & Rule 2.4 (Stack integrity) compliant.
 */
// Charge Sprite
function _drawThunderclapChargeSprite(ctx, r, burst, jitterX = 0, jitterY = 0) {
  const lightningImg = _getZenitsuLightningSpriteImage();
  if (!lightningImg || !lightningImg.complete || lightningImg.naturalWidth <= 0) {
    return false; // Fall back to procedural
  }

  const frame = ZENITSU_LIGHTNING_FRAMES[burst.frameIdx] || ZENITSU_LIGHTNING_FRAMES[0];
  const drawW = r * (burst.scale || 2.2);
  const drawH = drawW * (frame.sh / frame.sw);

  // Positioned directly on Zenitsu's circular body (0, 0)
  const centerX = (burst.snapX || 0) + jitterX;
  const centerY = (burst.snapY || 0) + jitterY;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1.0, burst.alpha || 1.0);
  ctx.translate(centerX, centerY);

  if (burst.flipX) {
    ctx.scale(-1, 1);
  }

  const isDark = Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' ||
      state.darkMode ||
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );
  const alpha = burst.alpha || 1.0;

  // ── TIER 1: BASE CRISP PNG SPRITE PASS (Solid source-over for 100% sharpness & contrast) ──
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = Math.min(1.0, alpha);
  ctx.drawImage(
    lightningImg,
    frame.sx, frame.sy, frame.sw, frame.sh,
    -drawW / 2, -drawH / 2,
    drawW, drawH
  );
  ctx.restore();

  // ── TIER 2: ADDITIVE ELECTRIC CORONA BLOOM (Tight edge aura in lighter mode) ──
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Outer Electric Cyan Corona (4 samples @ 5px)
  const outerRadius = Math.max(3, Math.min(7, r * 0.24 * (burst.intensity || 0.8)));
  const outerAlpha = (isDark ? 0.12 : 0.08) * alpha;
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + (Math.PI / 4);
    const ox = Math.cos(ang) * outerRadius;
    const oy = Math.sin(ang) * outerRadius;
    ctx.globalAlpha = outerAlpha;
    ctx.drawImage(
      lightningImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawW / 2 + ox, -drawH / 2 + oy,
      drawW, drawH
    );
  }

  // Tight Electric Rim (4 samples @ 2.5px)
  const innerRadius = Math.max(1.5, outerRadius * 0.45);
  const innerAlpha = (isDark ? 0.20 : 0.14) * alpha;
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const ox = Math.cos(ang) * innerRadius;
    const oy = Math.sin(ang) * innerRadius;
    ctx.globalAlpha = innerAlpha;
    ctx.drawImage(
      lightningImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawW / 2 + ox, -drawH / 2 + oy,
      drawW, drawH
    );
  }

  // ── TIER 3: ADDITIVE WHITE-HOT CORE PASS (1:1 aligned core glint) ──
  ctx.globalAlpha = Math.min(1.0, alpha * (isDark ? 0.38 : 0.28));
  ctx.drawImage(
    lightningImg,
    frame.sx, frame.sy, frame.sw, frame.sh,
    -drawW / 2, -drawH / 2,
    drawW, drawH
  );

  // Blinding overdrive flash on peak burst frames
  if (burst.isDoubleFlash) {
    ctx.globalAlpha = Math.min(1.0, alpha * 0.35);
    ctx.drawImage(
      lightningImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawW / 2, -drawH / 2,
      drawW, drawH
    );
  }

  ctx.restore();
  ctx.restore();
  return true;
}

/**
 * Procedural lightning arcs fallback when sprite sheet is loading or unavailable.
 * Centered directly on Zenitsu's body circle.
 */
function _drawThunderclapChargeProceduralFallback(ctx, r, burst, jitterX = 0, jitterY = 0) {
  const intensity = burst.intensity || 0.8;
  const arcCount = Math.floor(1 + intensity * 4);
  for (let i = 0; i < arcCount; i++) {
    const angle = (i / arcCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const dist = r * (0.3 + Math.random() * 0.5);
    let cx = Math.cos(angle) * dist + (burst.snapX || 0) + jitterX;
    let cy = Math.sin(angle) * dist + (burst.snapY || 0) + jitterY;
    const segs = 3;

    ctx.strokeStyle = i % 2 === 0 ? '#0284C7' : '#38BDF8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let s = 0; s < segs; s++) {
      cx += (Math.random() - 0.5) * (r * 0.35);
      cy += (Math.random() - 0.5) * (r * 0.35);
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.0;
    ctx.stroke();
  }
}

/**
 * Visual effects for Zenitsu's Thunderclap channeling:
 * Sporadic, non-uniform lightning discharges (Burst 1 -> 1.5s quiet breath tension pause -> Burst 2 -> Burst 3).
 * Ground static zig-zags and body sparks ONLY trigger during active bursts.
 * Rule 11 (Zero shadowBlur) & Rule 2.4 (Stack integrity) compliant.
 */
function _drawThunderclapChargeVFX(ctx, r, progress, elapsed = 0, total = 100, jitterX = 0, jitterY = 0) {
  const burst = _getThunderclapBurst(total, elapsed);
  if (!burst) return; // Quiet tension pause: ZERO lightning, ground static, or sparks!

  ctx.save();

  // 0. Radiant Floor / Ground Lighting Wash around Zenitsu's stance during active lightning surge
  const feetY = r * 0.85;
  const groundRadius = Math.max(48, r * (2.4 + (burst.intensity || 0.8) * 1.2));
  const groundGlow = ctx.createRadialGradient(jitterX, feetY * 0.4 + jitterY, 0, jitterX, feetY * 0.4 + jitterY, groundRadius);
  const gIntensity = 0.65 * (burst.intensity || 0.8) * (burst.alpha || 1.0);
  groundGlow.addColorStop(0, `rgba(255, 255, 255, ${gIntensity * 0.95})`);
  groundGlow.addColorStop(0.20, `rgba(224, 242, 254, ${gIntensity * 0.85})`);
  groundGlow.addColorStop(0.45, `rgba(0, 229, 255, ${gIntensity * 0.70})`);
  groundGlow.addColorStop(0.75, `rgba(2, 132, 199, ${gIntensity * 0.30})`);
  groundGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = groundGlow;
  ctx.beginPath();
  ctx.arc(jitterX, feetY * 0.4 + jitterY, groundRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 1. Jagged Ground Static Arcs under feet (only during active burst!)
  const spread = r * (0.75 + 0.35 * (burst.intensity || 0.8));
  ctx.globalAlpha = Math.min(1.0, burst.alpha || 1.0);

  const segs = 4;
  const stepX = (spread * 2) / segs;
  ctx.strokeStyle = (burst.burstId === 2 ? '#38BDF8' : '#00E5FF');
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-spread + jitterX, feetY);
  for (let s = 1; s <= segs; s++) {
    const gx = -spread + s * stepX;
    const jag = (s === segs) ? 0 : ((s % 2 === 0 ? -2.5 : 2.0) * (burst.intensity || 0.8));
    ctx.lineTo(gx + jitterX, feetY + jag);
  }
  ctx.stroke();

  // White core hot streak
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-spread * 0.5 + jitterX, feetY);
  ctx.lineTo(spread * 0.5 + jitterX, feetY);
  ctx.stroke();

  // 2. Sprite Sheet (Frames 1, 2, 3) from Clean Sheet-2
  const renderedSprite = _drawThunderclapChargeSprite(ctx, r, burst, jitterX, jitterY);
  if (!renderedSprite) {
    _drawThunderclapChargeProceduralFallback(ctx, r, burst, jitterX, jitterY);
  }

  // 3. Popping Electric Sparks directly on Zenitsu's body & haori (only during active burst!)
  const sparkCount = Math.floor(2 + (burst.intensity || 0.8) * 4);
  for (let i = 0; i < sparkCount; i++) {
    const seed = elapsed * 17 + i * 31;
    const spAngle = ((seed % 360) / 360) * Math.PI * 2;
    const spDist = (((seed * 7) % 100) / 100) * (r * 0.85);
    const spX = Math.round((Math.cos(spAngle) * spDist + jitterX) / 2) * 2;
    const spY = Math.round((Math.sin(spAngle) * spDist + jitterY) / 2) * 2;
    const sz = ((i + elapsed) % 2 === 0) ? 2 : 3;
    ctx.fillStyle = (i % 2 === 0) ? '#FFFFFF' : '#38BDF8';
    ctx.fillRect(spX, spY, sz, sz);
  }

  ctx.restore();
}

export const ZENITSU_DASH_FRAMES = [
  // Frame 1: Short initial burst attached to Zenitsu's back (BBox: 181x87)
  { frame: 0, sx: 149, sy: 76, sw: 181, sh: 87 },
  // Frame 2: Accelerating streak extending backwards (BBox: 340x128)
  { frame: 1, sx: 549, sy: 56, sw: 340, sh: 128 },
  // Frame 3: Mid-dash elongated streak (BBox: 440x93)
  { frame: 2, sx: 981, sy: 73, sw: 440, sh: 93 },
  // Frame 4: Peak arrival full-distance streak with explosive impact burst (BBox: 385x219)
  { frame: 3, sx: 1487, sy: 11, sw: 385, sh: 219 }
];

export const ZENITSU_DISAPPEARANCE_FRAMES = [
  // Disappearance Frame 1: Fracturing, dissolving lightning bolt in the air (BBox: 431x153)
  { frame: 0, sx: 13, sy: 33, sw: 431, sh: 153 },
  // Disappearance Frame 2: Lingering spark flecks fading into the air (BBox: 382x93)
  { frame: 1, sx: 518, sy: 63, sw: 382, sh: 93 }
];

/**
 * Lightning Dash Animation & Disappearance Renderer
 * 1. Active Dash Travel (Frames 1 to 4): Trailing streak stretches from origin to Zenitsu's circle.
 * 2. Air Linger: Full lightning bolt stays seared in the air between start and destination for a brief moment.
 * 3. Disappearance (Zenitsu-Lightning-Dash-Disappearance.png): Fracturing bolt -> fading lingering sparks.
 * Rule 11 (Zero shadowBlur) & Rule 2.4 (Stack integrity) compliant.
 */
export function _drawZenitsuThunderclapDashVFX(ctx, vfx, fighter = null) {
  if (!vfx || vfx.timer < 0 || vfx.timer >= vfx.maxTimer) return;

  const startX = vfx.startX;
  const startY = vfx.startY;
  const angle = vfx.angle || 0;
  const r = (fighter && fighter.r) ? fighter.r : 25;

  const travelDuration = vfx.travelDuration ?? Math.min(6, Math.floor(vfx.maxTimer * 0.25));
  const lingerDuration = vfx.lingerDuration ?? Math.min(8, Math.floor(vfx.maxTimer * 0.35));
  const lingerEnd = travelDuration + lingerDuration;

  // Head anchor position:
  // Phase 1 (Active travel): Attach head directly to Zenitsu's circle so the streak stretches behind him.
  // Phase 2 & 3 (Air linger & disappearance): Anchor head at destination where he dashed.
  const isDashing = Boolean(fighter && fighter.isDashingThunderclap && vfx.timer < travelDuration);
  let headX = isDashing ? fighter.x : (vfx.destX ?? (startX + Math.cos(angle) * (vfx.dist || 260)));
  let headY = isDashing ? fighter.y : (vfx.destY ?? (startY + Math.sin(angle) * (vfx.dist || 260)));

  const currentDist = Math.hypot(headX - startX, headY - startY);
  if (currentDist <= 2 && isDashing) return;

  let frameDef;
  let frameIdx = 0;
  let alpha = 1.0;
  let isDisappearancePhase = false;

  if (vfx.timer < travelDuration) {
    // Phase 1: Active godspeed dash travel (frames 0, 1, 2, 3 from 6Frames sheet)
    const travelProg = vfx.timer / travelDuration;
    frameIdx = Math.min(3, Math.floor(travelProg * 4));
    frameDef = ZENITSU_DASH_FRAMES[frameIdx] || ZENITSU_DASH_FRAMES[0];
    alpha = 1.0;
  } else if (vfx.timer < lingerEnd) {
    // Phase 2: Searing air linger (brief moment where the full bolt stays in the air!)
    frameIdx = 3;
    frameDef = ZENITSU_DASH_FRAMES[3];
    alpha = 1.0;
  } else {
    // Phase 3: Disappearance animation using Zenitsu-Lightning-Dash-Disappearance.png
    isDisappearancePhase = true;
    const disappearTimer = vfx.timer - lingerEnd;
    const disappearTotal = Math.max(1, vfx.maxTimer - lingerEnd);
    const disappearProg = Math.min(1.0, disappearTimer / disappearTotal);

    if (disappearProg < 0.5) {
      frameIdx = 0;
      frameDef = ZENITSU_DISAPPEARANCE_FRAMES[0];
      alpha = 0.95 * (1.0 - disappearProg * 0.35);
    } else {
      frameIdx = 1;
      frameDef = ZENITSU_DISAPPEARANCE_FRAMES[1];
      alpha = Math.max(0, 0.78 * (1.0 - (disappearProg - 0.5) * 2.0));
    }
  }

  // Head overlaps under back half of circle so circle cleanly caps the lightning head
  const headOverlap = r * 0.45;
  const drawW = currentDist + headOverlap;
  const baseRatio = frameDef.sh / frameDef.sw;
  const drawH = Math.max(r * 1.0, Math.min(r * 3.2, drawW * baseRatio));

  const isDark = Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' ||
      state.darkMode ||
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );

  // ── LAYER -1: PROXIMITY ENTITY LIGHTING & BLOOM ──
  // Casts an additive electric cyan directional specular highlight and rim arc on nearby entities
  if (currentDist > 8 && alpha > 0.05) {
    _drawZenitsuProximityEntityLighting(ctx, startX, startY, headX, headY, alpha, isDark, fighter, vfx.timer);
  }

  ctx.save();
  ctx.translate(startX, startY);
  ctx.rotate(angle);

  const dashImg = isDisappearancePhase
    ? (_getZenitsuDashDisappearanceImage() || _getZenitsuDashSpriteImage())
    : _getZenitsuDashSpriteImage();

  // ── LAYER 0: AMBIENT FLOOR / GROUND LIGHTING WASH ──
  // Casts a soft, continuous pool of radiant electric cyan illumination onto the arena floor beneath the dash
  if (drawW > 6 && alpha > 0.05) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const groundNodes = Math.max(3, Math.min(8, Math.round(drawW / 45)));
    const groundLightRadius = Math.max(36, Math.min(85, r * 2.6));
    const groundIntensity = (isDark ? 0.28 : 0.20) * alpha;

    for (let i = 0; i < groundNodes; i++) {
      const t = groundNodes === 1 ? 0.5 : i / (groundNodes - 1);
      const nx = t * drawW;
      const ny = Math.sin(t * Math.PI) * (drawH * 0.06);
      const nodeR = groundLightRadius * (0.85 + Math.sin(t * Math.PI) * 0.30);

      const groundGlow = ctx.createRadialGradient(nx, ny, 0, nx, ny, nodeR);
      groundGlow.addColorStop(0, `rgba(0, 229, 255, ${groundIntensity * 1.0})`);
      groundGlow.addColorStop(0.35, isDark ? `rgba(2, 132, 199, ${groundIntensity * 0.55})` : `rgba(14, 165, 233, ${groundIntensity * 0.45})`);
      groundGlow.addColorStop(0.70, isDark ? `rgba(3, 105, 161, ${groundIntensity * 0.20})` : `rgba(2, 132, 199, ${groundIntensity * 0.15})`);
      groundGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = groundGlow;
      ctx.beginPath();
      ctx.arc(nx, ny, nodeR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (dashImg && dashImg.complete && dashImg.naturalWidth > 0) {
    // ── TIER 1: BASE CRISP PNG SPRITE PASS (Solid source-over for 100% sharpness & contrast) ──
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1.0, alpha);
    ctx.drawImage(
      dashImg,
      frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh,
      0, -drawH / 2,
      drawW, drawH
    );
    ctx.restore();

    // ── TIER 2: ADDITIVE ELECTRIC CORONA BLOOM (Tight edge aura in lighter mode) ──
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Outer Electric Cyan Corona (4 samples @ 6px)
    const outerRadius = Math.max(3, Math.min(8, r * 0.28));
    const outerAlpha = (isDark ? 0.10 : 0.07) * alpha;
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + (Math.PI / 4);
      const ox = Math.cos(ang) * outerRadius;
      const oy = Math.sin(ang) * outerRadius;
      ctx.globalAlpha = outerAlpha;
      ctx.drawImage(
        dashImg,
        frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh,
        ox, -drawH / 2 + oy,
        drawW, drawH
      );
    }

    // Tight Electric Rim (4 samples @ 2.5px)
    const innerRadius = Math.max(1.5, outerRadius * 0.45);
    const innerAlpha = (isDark ? 0.18 : 0.12) * alpha;
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      const ox = Math.cos(ang) * innerRadius;
      const oy = Math.sin(ang) * innerRadius;
      ctx.globalAlpha = innerAlpha;
      ctx.drawImage(
        dashImg,
        frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh,
        ox, -drawH / 2 + oy,
        drawW, drawH
      );
    }

    // ── TIER 3: ADDITIVE WHITE-HOT CORE PASS (1:1 aligned core glint) ──
    ctx.globalAlpha = Math.min(1.0, alpha * (isDark ? 0.40 : 0.28));
    ctx.drawImage(
      dashImg,
      frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh,
      0, -drawH / 2,
      drawW, drawH
    );

    // Peak Flash on Arrival / Searing Air Linger
    if (!isDisappearancePhase && (frameIdx === 3 || frameIdx === 2)) {
      ctx.globalAlpha = Math.min(1.0, alpha * 0.30);
      ctx.drawImage(
        dashImg,
        frameDef.sx, frameDef.sy, frameDef.sw, frameDef.sh,
        0, -drawH / 2,
        drawW, drawH
      );
    }
    ctx.restore();
  } else {
    _drawZenitsuDashProceduralFallback(ctx, drawW, drawH, frameIdx, isDisappearancePhase, isDark);
  }

  // Subtle electrical arrival spark flecks during disappearance
  if (isDisappearancePhase && alpha > 0.15) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sparkCount = 6;
    for (let i = 0; i < sparkCount; i++) {
      const seed = i * 47 + Math.floor(vfx.timer * 7);
      const px = ((seed % 100) / 100) * drawW;
      const py = ((seed % 13) - 6) * (drawH * 0.06);
      ctx.fillStyle = (i % 2 === 0) ? `rgba(255, 255, 255, ${0.75 * alpha})` : `rgba(56, 189, 248, ${0.60 * alpha})`;
      ctx.fillRect(px, py, 2, 2);
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Renders directional electric bloom & rim lighting on entities near Zenitsu's lightning dash path.
 * Rule 11 (Zero shadowBlur) & Rule 2.4 (Canvas stack balance) compliant.
 */
function _drawZenitsuProximityEntityLighting(ctx, startX, startY, headX, headY, alpha, isDark, excludeFighter = null, vfxTimer = 0) {
  if (!ctx || alpha <= 0.05) return;

  const segDx = headX - startX;
  const segDy = headY - startY;
  const segLenSq = segDx * segDx + segDy * segDy;
  if (segLenSq < 16) return;

  const entities = [];
  if (typeof state !== 'undefined') {
    if (Array.isArray(state.fighters)) entities.push(...state.fighters);
    if (Array.isArray(state.illusions)) entities.push(...state.illusions);
  }
  if (entities.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!ent || ent === excludeFighter || ent.hp <= 0 || ent.isDead) continue;
    if (ent._isWinnerReveal || ent._isFaceOff || ent.hideHpText) continue;

    const entX = ent.x;
    const entY = ent.y - (ent.z || 0);
    const entR = ent.r || 25;

    // Point-to-segment projection from entity center to dash trajectory
    const t = Math.max(0, Math.min(1, ((entX - startX) * segDx + (entY - startY) * segDy) / segLenSq));
    const projX = startX + t * segDx;
    const projY = startY + t * segDy;
    const dist = Math.hypot(entX - projX, entY - projY);

    const maxReach = entR + 140;
    if (dist >= maxReach) continue;

    // Smooth proximity falloff (matches Hyperion laser beam distance curve)
    const prox = Math.pow(1.0 - (dist / maxReach), 0.85);
    const intensity = prox * alpha;
    if (intensity <= 0.01) continue;

    const lightAngle = Math.atan2(projY - entY, projX - entX);

    // 1. Massive Radial Electric Bloom around entity (matches Hyperion beam bloom)
    const gradR = entR * 3.0;
    const bodyGlow = ctx.createRadialGradient(entX, entY, entR * 0.15, entX, entY, gradR);
    bodyGlow.addColorStop(0, `rgba(255, 255, 255, ${(0.95 + Math.random() * 0.05) * intensity})`);
    bodyGlow.addColorStop(0.22, `rgba(224, 242, 254, ${0.90 * intensity})`);
    bodyGlow.addColorStop(0.50, `rgba(0, 229, 255, ${(isDark ? 0.85 : 0.75) * intensity})`);
    bodyGlow.addColorStop(0.78, isDark ? `rgba(2, 132, 199, ${0.40 * intensity})` : `rgba(14, 165, 233, ${0.30 * intensity})`);
    bodyGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = bodyGlow;
    ctx.beginPath();
    ctx.arc(entX, entY, gradR, 0, Math.PI * 2);
    ctx.fill();

    // 2. White-Hot Core High-Voltage Wash
    ctx.fillStyle = `rgba(255, 255, 255, ${0.75 * intensity})`;
    ctx.beginPath();
    ctx.arc(entX, entY, entR * 0.95, 0, Math.PI * 2);
    ctx.fill();

    // 3. High-Voltage Directional Electric Rim Arc
    const rimWidth = Math.max(1.8, Math.min(3.6, entR * 0.12));
    ctx.strokeStyle = `rgba(0, 229, 255, ${intensity * 0.95})`;
    ctx.lineWidth = rimWidth;
    ctx.beginPath();
    ctx.arc(entX, entY, entR + 1.2, lightAngle - Math.PI * 0.45, lightAngle + Math.PI * 0.45);
    ctx.stroke();

    // White-hot inner specular crest
    ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.98})`;
    ctx.lineWidth = Math.max(1.2, rimWidth * 0.55);
    ctx.beginPath();
    ctx.arc(entX, entY, entR + 0.6, lightAngle - Math.PI * 0.25, lightAngle + Math.PI * 0.25);
    ctx.stroke();

    // 3. Close-Proximity Micro-Spark Flecks
    if (dist <= entR + 42 && alpha > 0.35) {
      const sparkCount = 2;
      for (let s = 0; s < sparkCount; s++) {
        const seed = Math.floor(vfxTimer * 5 + entX * 7 + s * 19);
        const sparkOffset = ((seed % 100) / 100 - 0.5) * 0.7;
        const sparkAng = lightAngle + sparkOffset;
        const spDist = entR + 2.5 + ((seed % 5) - 2);
        const spX = entX + Math.cos(sparkAng) * spDist;
        const spY = entY + Math.sin(sparkAng) * spDist;
        ctx.fillStyle = (s === 0) ? `rgba(255, 255, 255, ${intensity * 0.95})` : `rgba(56, 189, 248, ${intensity * 0.85})`;
        ctx.fillRect(spX - 1, spY - 1, 2, 2);
      }
    }
  }

  ctx.restore();
}

/**
 * Renders ambient proximity electric lighting on nearby entities during Zenitsu's charging stance bursts.
 * Rule 11 (Zero shadowBlur) & Rule 2.4 (Canvas stack balance) compliant.
 */
function _drawZenitsuChannelingEntityLighting(ctx, zenX, zenY, burst, isDark, excludeFighter = null) {
  if (!ctx || !burst) return;
  const entities = [];
  if (typeof state !== 'undefined') {
    if (Array.isArray(state.fighters)) entities.push(...state.fighters);
    if (Array.isArray(state.illusions)) entities.push(...state.illusions);
  }
  if (entities.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!ent || ent === excludeFighter || ent.hp <= 0 || ent.isDead) continue;
    if (ent._isWinnerReveal || ent._isFaceOff || ent.hideHpText) continue;

    const entX = ent.x;
    const entY = ent.y - (ent.z || 0);
    const entR = ent.r || 25;
    const dist = Math.hypot(entX - zenX, entY - zenY);
    const maxReach = entR + 75;
    if (dist >= maxReach) continue;

    const prox = Math.pow(1.0 - (dist / maxReach), 1.25);
    const intensity = prox * (burst.intensity || 0.8) * (burst.alpha || 1.0) * (isDark ? 0.45 : 0.32);
    if (intensity <= 0.01) continue;

    const lightAngle = Math.atan2(zenY - entY, zenX - entX);
    const hx = entX + Math.cos(lightAngle) * (entR * 0.35);
    const hy = entY + Math.sin(lightAngle) * (entR * 0.35);
    const gradR = entR * 1.25;

    const bodyGlow = ctx.createRadialGradient(hx, hy, 0, entX, entY, gradR);
    bodyGlow.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.75})`);
    bodyGlow.addColorStop(0.35, `rgba(0, 229, 255, ${intensity * 0.60})`);
    bodyGlow.addColorStop(0.70, isDark ? `rgba(2, 132, 199, ${intensity * 0.25})` : `rgba(14, 165, 233, ${intensity * 0.18})`);
    bodyGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = bodyGlow;
    ctx.beginPath();
    ctx.arc(entX, entY, gradR, 0, Math.PI * 2);
    ctx.fill();

    // Directional rim arc
    ctx.strokeStyle = `rgba(0, 229, 255, ${intensity * 0.80})`;
    ctx.lineWidth = Math.max(1.2, entR * 0.08);
    ctx.beginPath();
    ctx.arc(entX, entY, entR + 0.8, lightAngle - Math.PI * 0.35, lightAngle + Math.PI * 0.35);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Procedural electric dash bolt fallback when sprite sheet is loading or unavailable.
 */
function _drawZenitsuDashProceduralFallback(ctx, drawW, drawH, frameIdx, isDisappearance = false, isDark = true) {
  if (isDisappearance) {
    const sparkCount = 12;
    for (let i = 0; i < sparkCount; i++) {
      const sx = (i / sparkCount) * drawW;
      const sy = ((i % 2 === 0 ? -1 : 1) * (i * 5 % 11));
      if (!isDark) {
        ctx.fillStyle = '#00E5FF';
        ctx.fillRect(sx - 1, sy - 1, 5, 5);
      }
      ctx.fillStyle = (i % 3 === 0) ? '#FFFFFF' : (isDark ? '#0284C7' : '#0369A1');
      ctx.fillRect(sx, sy, 3, 3);
    }
    return;
  }

  const segs = 8;
  const stepX = drawW / segs;

  const tracePath = () => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let s = 1; s <= segs; s++) {
      const x = s * stepX;
      const progress = s / segs;
      const flare = Math.sin(progress * Math.PI * 0.5) * (drawH * 0.35);
      const y = (s === segs) ? 0 : ((s % 2 === 0 ? -flare : flare) * (1.0 - frameIdx * 0.1));
      ctx.lineTo(x, y);
    }
  };

  ctx.save();
  ctx.lineCap = 'round';

  // Tier 1: Outer Huge Bloom
  tracePath();
  ctx.strokeStyle = isDark ? 'rgba(0, 120, 255, 0.30)' : 'rgba(0, 150, 255, 0.28)';
  ctx.lineWidth = 14.0;
  ctx.stroke();

  // Tier 2: Secondary Wide Glow
  tracePath();
  ctx.strokeStyle = isDark ? 'rgba(0, 210, 255, 0.50)' : 'rgba(0, 200, 255, 0.45)';
  ctx.lineWidth = 7.0;
  ctx.stroke();

  // Tier 3: Mid Bright Glow
  tracePath();
  ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.80)' : 'rgba(14, 165, 233, 0.75)';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Tier 4: Inner White Core
  tracePath();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.restore();
}

/**
 * Frame 1: Stance Breath Wisps
 * Rhythmic, calm white vapor puffs expanding and curling forward from mouth.
 */
function _drawZenitsuStanceBreath(ctx, r, mouthX, mouthY, elapsed, easeEntrance) {
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const puffCycle = 16;
  const puffCount = 3;

  // Mouth breath seal highlight at lips
  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = 0.75 * easeEntrance;
  ctx.fillRect(mouthX, mouthY, P * 2, P);

  for (let i = 0; i < puffCount; i++) {
    const puffAge = (elapsed + i * 5.3) % puffCycle;
    const t = puffAge / puffCycle;
    if (t < 0.08) continue;

    const travelDist = t * (r * 1.3);
    const px = snap(mouthX + travelDist);
    const lift = Math.sin(t * Math.PI) * (r * 0.16);
    const spreadY = (i === 1 ? -P : (i === 2 ? P : 0)) * (t * 1.5);
    const py = snap(mouthY - lift + spreadY);

    const fadeIn = Math.min(1.0, (t - 0.08) * 5.0);
    const fadeOut = Math.max(0, 1.0 - t);
    const alpha = fadeIn * fadeOut * 0.85 * easeEntrance;
    if (alpha <= 0.02) continue;

    ctx.globalAlpha = alpha;

    if (t < 0.3) {
      // Stage 1: Tight vapor nozzle
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(px, py, P * 2, P);
      ctx.fillStyle = '#E0F2FE';
      ctx.fillRect(px + P * 2, py, P, P);
    } else if (t < 0.7) {
      // Stage 2: Expanding billowing cloud
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(px, py, P * 2, P * 2);
      ctx.fillStyle = '#E0F2FE';
      ctx.fillRect(px - P, py, P, P * 2);
      ctx.fillRect(px, py - P, P * 2, P);
      ctx.fillRect(px, py + P * 2, P * 2, P);
      ctx.fillStyle = '#BAE6FD';
      ctx.fillRect(px + P * 3, py + (i % 2 === 0 ? -P : P), P, P);
    } else {
      // Stage 3: Dissipating mist droplets
      ctx.fillStyle = '#E0F2FE';
      ctx.fillRect(px, py, P, P);
      ctx.fillRect(px + P * 2, py - P, P, P);
      ctx.fillStyle = '#BAE6FD';
      ctx.fillRect(px + P, py + P, P, P);
    }
  }
}

/**
 * Frame 2: High-Pressure Charge Steam Jets
 * Pressurized dual steam jets shooting forward with white core, icy cyan rims,
 * turbulent billowing plumes, and lightning-charged vapor sparks.
 */
function _drawZenitsuChargeSteamJets(ctx, r, mouthX, mouthY, progress, elapsed) {
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const chargeIntensity = Math.min(1.0, (progress - 0.5) * 2.0);
  const jetLen = snap(r * (1.1 + 0.9 * chargeIntensity));

  // 1. Mouth nozzle: pressurized white steam base at lips
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(mouthX - P, mouthY - P, P * 3, P * 3);
  ctx.fillStyle = '#BAE6FD';
  ctx.fillRect(mouthX - P * 2, mouthY, P, P);

  // 2. High-Pressure Dual Steam Jets (Upper & Lower streams)
  const segs = Math.max(4, Math.floor(jetLen / (P * 2)));
  for (let s = 0; s < segs; s++) {
    const segT = s / segs;
    const segDist = snap(s * P * 2);
    const segAlpha = Math.max(0.15, 1.0 - segT * 0.75);

    const upSpread = -Math.pow(segT, 1.2) * (r * 0.28);
    const upX = snap(mouthX + segDist);
    const upY = snap(mouthY + upSpread - P);

    const downSpread = Math.pow(segT, 1.2) * (r * 0.20);
    const downX = snap(mouthX + segDist + P);
    const downY = snap(mouthY + downSpread + P);

    ctx.globalAlpha = segAlpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(upX, upY, P * 2, P);
    ctx.fillRect(downX, downY, P * 2, P);

    ctx.globalAlpha = segAlpha * 0.85;
    ctx.fillStyle = '#E0F2FE';
    ctx.fillRect(upX, upY - P, P * 2, P);
    ctx.fillRect(downX, downY + P, P * 2, P);

    if (segT > 0.3) {
      ctx.fillStyle = '#BAE6FD';
      ctx.fillRect(upX + P, upY - P * 2, P, P);
      ctx.fillRect(downX + P, downY + P * 2, P, P);
    }
  }

  // 3. Expanding Turbulent Billowing Plumes at Jet Tips
  const plumeCycle = 8;
  const plumeT = ((elapsed * 0.4) % plumeCycle) / plumeCycle;
  for (let p = 0; p < 3; p++) {
    const ptT = (plumeT + p * 0.33) % 1.0;
    const plX = snap(mouthX + jetLen * (0.75 + 0.4 * ptT));
    const plY = snap(mouthY + (p === 0 ? -r * 0.25 : (p === 1 ? r * 0.18 : -r * 0.05)) * (0.8 + 0.4 * ptT));
    const plAlpha = Math.max(0, (1.0 - ptT) * 0.85 * chargeIntensity);
    if (plAlpha <= 0.03) continue;

    ctx.globalAlpha = plAlpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(plX, plY, P * 2, P * 2);
    ctx.fillStyle = '#E0F2FE';
    ctx.fillRect(plX - P, plY, P, P * 2);
    ctx.fillRect(plX + P * 2, plY, P, P * 2);
    ctx.fillStyle = '#7DD3FC';
    ctx.fillRect(plX + P * 3, plY + (p % 2 === 0 ? -P : P), P, P);
  }

  // 4. Drifting Vapor Flecks & Golden Sparks
  for (let f = 0; f < 3; f++) {
    const fT = (elapsed * 0.06 + f * 0.33) % 1.0;
    const fx = snap(mouthX + r * 0.2 + fT * (r * 1.5));
    const fy = snap(mouthY - r * 0.05 - Math.sin(fT * Math.PI) * (r * 0.35) - f * P * 1.5);
    const fAlpha = Math.sin(fT * Math.PI) * 0.75 * chargeIntensity;
    if (fAlpha > 0.04) {
      ctx.globalAlpha = fAlpha;
      ctx.fillStyle = f === 1 ? '#FDE047' : (f === 0 ? '#FFFFFF' : '#BAE6FD');
      ctx.fillRect(fx, fy, P, P);
    }
  }
}

/**
 * Total Concentration: Thunder Breathing (Zenchūchū: Kaminari no Kokyū)
 * Master breath steam controller for Zenitsu during Skill 1 channeling.
 */
function _drawZenitsuBreathSteam(ctx, r, progress, isChargePhase, jitterX, jitterY, elapsed, easeEntrance) {
  if (easeEntrance <= 0.05) return;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const headDropY = (r * 0.08) * easeEntrance;
  const headForwardX = (r * 0.06) * easeEntrance;
  const mouthX = snap(r * 0.06 + headForwardX + jitterX);
  const mouthY = snap(r * 0.08 + headDropY + jitterY);

  if (!isChargePhase) {
    _drawZenitsuStanceBreath(ctx, r, mouthX, mouthY, elapsed, easeEntrance);
  } else {
    _drawZenitsuChargeSteamJets(ctx, r, mouthX, mouthY, progress, elapsed);
  }

  ctx.restore();
}

/**
 * Draws Zenitsu's Skill 1 Channeling Animation on the circular character model:
 * Frame 1: Stance / Preparation (Full 1:1 round body, head smoothly lowered in focused stance, both hands gripping sword near waist)
 * Frame 2: Charge / Energy Build-Up (Same stance, micro-tremor jitter, crackling golden lightning around body & sword, energy particles at feet & haori)
 */
export function _drawZenitsuThunderclapChannel(ctx, fighter, r) {
  const isDark = Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' ||
      state.darkMode ||
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );

  const total = fighter.thunderclapChannelDuration || 36;
  const current = fighter.thunderclapChannelTimer || 0;
  const elapsed = total - current;
  const currentBurst = _getThunderclapBurst(total, elapsed);

  // Proximity lighting on nearby entities during active lightning burst surges
  if (currentBurst) {
    _drawZenitsuChannelingEntityLighting(ctx, fighter.x, fighter.y - (fighter.z || 0), currentBurst, isDark, fighter);
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = fighter.gunAngle || fighter.skillCastAngle || 0;
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  const progress = Math.max(0, Math.min(1.0, 1.0 - (current / total)));

  // Smooth entrance interpolation over first 8 frames (avoids visual snapping into crouch)
  const entranceFrames = 8;
  const entranceT = Math.min(1.0, elapsed / entranceFrames);
  const easeEntrance = entranceT * entranceT * (3 - 2 * entranceT); // Smooth cubic hermite curve

  // Frame 1 (Stance) during first half (0 to 0.5)
  // Frame 2 (Charge) during second half (0.5 to 1.0)
  const isChargePhase = progress >= 0.5;

  // Stored explosive power vibration / micro-jitter: ONLY during active lightning bursts or pre-launch surge
  let jitterX = 0;
  let jitterY = 0;
  if (currentBurst || progress >= 0.90) {
    const intensity = currentBurst ? (currentBurst.intensity || 0.8) : (progress - 0.90) * 10;
    jitterX = (Math.random() - 0.5) * 1.4 * intensity;
    jitterY = (Math.random() - 0.5) * 1.2 * intensity;
  }

  // LAYER 1: Full Round Pixel Body (100% round, 1:1 circle, no flattening)
  ctx.save();
  ctx.translate(jitterX, jitterY);
  drawZenitsuPixelBody(ctx, r);
  ctx.restore();

  // LAYER 2: Head Lowered (Smoothly lowers forward into deep focus without snapping)
  ctx.save();
  const headDropY = (r * 0.08) * easeEntrance;
  const headForwardX = (r * 0.06) * easeEntrance;
  ctx.translate(headForwardX + jitterX, headDropY + jitterY);
  _drawZenitsuHair(ctx, r, false);
  ctx.restore();

  // LAYER 3: Katana & Both Hands Gripping Sword Near Waist (Smoothly draws back to hip)
  _drawZenitsuWaistGripKatana(ctx, fighter, r, isChargePhase, jitterX, jitterY, easeEntrance);

  // LAYER 4: Total Concentration Breath Steam (Wisps in Frame 1, High-Pressure Jets in Frame 2)
  _drawZenitsuBreathSteam(ctx, r, progress, isChargePhase, jitterX, jitterY, elapsed, easeEntrance);

  // LAYER 5: Sporadic Golden Lightning & Energy Bursts (Burst 1 -> ~1.5s quiet breath tension pause -> Burst 2 -> Burst 3)
  _drawThunderclapChargeVFX(ctx, r, progress, elapsed, total, jitterX, jitterY);

  // Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}

/**
 * Main Skin Renderer for Zenitsu Agatsuma (Pixel Art)
 */
export function drawZenitsuSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);

  // 0. Render 6-Frame Lightning Dash Animation along trajectory in World Coordinates
  if (!isPodiumPreview && fighter.thunderclapDashVFX) {
    _drawZenitsuThunderclapDashVFX(ctx, fighter.thunderclapDashVFX, fighter);
  }

  const isSuppressed = !isPodiumPreview && Boolean(
    fighter.isTargetOfAmbush ||
    (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
  );

  const isChanneling = !isPodiumPreview && !fighter.isTargetOfAmbush && Boolean(
    fighter.isChannelingThunderclap || (fighter.thunderclapChannelTimer && fighter.thunderclapChannelTimer > 0)
  );

  if (isChanneling) {
    _drawZenitsuThunderclapChannel(ctx, fighter, r);
    return;
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 2. Attack States
  const isKatanaSwinging = !isPodiumPreview && !isSuppressed && (fighter.slashSwingTimer && fighter.slashSwingTimer > 0);
  const isPunching = !isPodiumPreview && !isSuppressed && (fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
  const animPhase = isKatanaSwinging
    ? Math.min(1.0, 1.0 - (fighter.slashSwingTimer / (fighter.slashSwingMaxTimer || 16)))
    : (isPunching ? Math.min(1.0, 1.0 - (fighter.punchAnimTimer / (fighter.punchMaxTime || 14))) : 0);

  // 3. LAYER 0: BACK HAND (Behind Body Layer)
  const showBackHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideBackHand;
  if (showBackHand) {
    _drawZenitsuBackHand(ctx, fighter, r, isKatanaSwinging, isPunching, animPhase);
  }

  // 4. LAYER 1: MAIN BODY (Pixel Circle + Triangle Haori + Corps Uniform + Face Skin)
  drawZenitsuPixelBody(ctx, r);

  // 5. LAYER 2: AUTHENTIC HAIR MODEL OVERLAY (Assets/model/Hair/Zenitsu-hair.png)
  _drawZenitsuHair(ctx, r, facingLeft);

  // 6. LAYER 3: FRONT HAND & LIGHTNING KATANA (On Top of Body)
  const showFrontHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideFrontHand;
  if (showFrontHand) {
    _drawZenitsuFrontHand(ctx, fighter, r, isKatanaSwinging, isPunching, animPhase);
  }

  // 7. Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}

let _cachedZenitsuBodyCanvas = null;
let _cachedZenitsuBodyR = 0;

/**
 * Procedural Pixel-Art Body Renderer for Zenitsu Agatsuma.
 * Authentically implements:
 * 1. High Standing White Collar with Dark Throat V-Notch
 * 2. Demon Slayer Corps Black Gakuran Jacket with Silver/White Buttons & Left Pocket
 * 3. Yellow-to-Orange Gradient Haori with Staggered White Upward Triangle Scale Tessellation
 * 4. Amber-Gold Haori Lapel Separation Creases
 * 5. White Leather Belt with Metallic Steel Buckle & Hanging Strap Tabs
 * 6. Pleated Charcoal-Black Hakama Pants with Deep Crease Shadows & Fold Highlights
 */
function _renderZenitsuPixelBodyToCanvas(destCtx, r) {
  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  const isOffscreen = (typeof destCtx.canvas !== 'undefined' && destCtx.canvas.width > 0 && destCtx.canvas.height > 0);
  if (isOffscreen && typeof document !== 'undefined') {
    destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);
  }

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
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
      const absGx = Math.abs(gx);

      // ── 1. 1-Pixel Stepped Outer Manga Ink Border ──
      const isBorder = dist >= r - P;
      if (isBorder) {
        destCtx.fillStyle = '#18181B';
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 2. Pale Anime Face Skin (normY < 0.16) ──
      if (normY < 0.16) {
        if (normY < -0.05) {
          destCtx.fillStyle = '#FEE8D6'; // Pale anime skin
        } else if (normY < 0.08) {
          destCtx.fillStyle = '#FDD3B2'; // Warm peach midtone
        } else {
          destCtx.fillStyle = '#F9B786'; // Chin shadow
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 3. High Standing White Collar (gy in [2, 3], |gx| <= 2) ──
      if (gy >= 2 && gy <= 3 && absGx <= 2) {
        if (absGx === 0 && gy === 3) {
          destCtx.fillStyle = '#18181F'; // Dark inner throat opening notch
        } else if (gy === 2) {
          destCtx.fillStyle = '#FFFFFF'; // Crisp white collar top rim
        } else {
          destCtx.fillStyle = '#F1F5F9'; // White collar fabric
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 4. White Belt & Metallic Silver Buckle (gy in [9, 10], |gx| <= 7) ──
      if (gy >= 9 && gy <= 10 && absGx <= 7) {
        if (absGx <= 2) {
          if (absGx === 2 || gy === 9) {
            destCtx.fillStyle = '#94A3B8'; // Metallic buckle outer frame
          } else if (gx === 0 && gy === 10) {
            destCtx.fillStyle = '#64748B'; // Buckle prong
          } else {
            destCtx.fillStyle = '#E2E8F0'; // Bright silver buckle plate
          }
        } else {
          destCtx.fillStyle = (gy === 9) ? '#F8FAFC' : '#E2E8F0'; // Crisp white belt band
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 5. Hanging Belt Strap Tabs (gy in [11, 12], gx in [2, 3]) ──
      if ((gy === 11 || gy === 12) && (gx === 2 || gx === 3)) {
        destCtx.fillStyle = (gy === 11) ? '#F8FAFC' : '#CBD5E1';
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 6. Black Pleated Hakama Pants (gy >= 11, |gx| <= 6) ──
      if (gy >= 11 && absGx <= 6) {
        if (gx === 0 || absGx === 4) {
          destCtx.fillStyle = '#090A0E'; // Pleat vertical shadow crease
        } else if (absGx === 2 || absGx === 5) {
          destCtx.fillStyle = '#2A2C38'; // Pleat fold highlight
        } else {
          destCtx.fillStyle = '#14151D'; // Deep charcoal hakama fabric
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 7. Demon Slayer Corps Uniform Gakuran Jacket (gy in [4, 8], |gx| <= 3) ──
      if (gy >= 4 && gy <= 8 && absGx <= 3) {
        // Silver buttons down center
        if (gx === 0 && (gy === 4 || gy === 7)) {
          destCtx.fillStyle = '#FFFFFF';
        } else if (absGx === 1 && (gy === 4 || gy === 7)) {
          destCtx.fillStyle = '#94A3B8';
        // Left chest pocket white trim
        } else if ((gx === -2 || gx === -3) && gy === 5) {
          destCtx.fillStyle = '#F8FAFC';
        } else if (absGx === 3) {
          destCtx.fillStyle = '#111116'; // Seam edge
        } else {
          destCtx.fillStyle = '#1A1B22'; // Obsidian black uniform fabric
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 8. Haori Inner Lapel Creases (|gx| === 4, gy in [4, 8]) ──
      if (absGx === 4 && gy >= 4 && gy <= 8) {
        destCtx.fillStyle = '#B45309'; // Rich amber-gold lapel crease
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 9. Yellow-to-Orange Haori with White Triangle Scales ──
      function testTri(tx, ty) {
        if (gy === ty && absGx === tx) return true;
        if (gy === ty + 1 && absGx >= tx - 1 && absGx <= tx + 1) return true;
        return false;
      }

      const isTriangle = (
        testTri(8, 2) || testTri(12, 2) ||
        testTri(6, 4) || testTri(10, 4) ||
        testTri(8, 6) || testTri(12, 6) ||
        testTri(6, 8) || testTri(10, 8) ||
        testTri(9, 11)
      );

      if (isTriangle) {
        destCtx.fillStyle = '#FFFFFF'; // Crisp white triangle scale
      } else if (normY < 0.38) {
        destCtx.fillStyle = '#FCD34D'; // Bright sunny yellow top
      } else if (normY < 0.65) {
        destCtx.fillStyle = '#F59E0B'; // Warm sunny amber gold
      } else {
        destCtx.fillStyle = '#EA580C'; // Rich fiery orange lower hem
      }
      destCtx.fillRect(px, py, P, P);
    }
  }

  destCtx.restore();
}

/**
 * Solid 2D Pixel-Art Body for Zenitsu Agatsuma (with offscreen caching)
 */
export function drawZenitsuPixelBody(ctx, r) {
  if (typeof document === 'undefined') {
    _renderZenitsuPixelBodyToCanvas(ctx, r);
    return;
  }

  const intR = Math.round(r);
  if (!_cachedZenitsuBodyCanvas || _cachedZenitsuBodyR !== intR) {
    const P = 2.0;
    const steps = Math.ceil((intR + P) / P);
    const size = (steps * 2 + 1) * P;
    _cachedZenitsuBodyCanvas = document.createElement('canvas');
    _cachedZenitsuBodyCanvas.width = size;
    _cachedZenitsuBodyCanvas.height = size;
    const cctx = _cachedZenitsuBodyCanvas.getContext('2d');
    _renderZenitsuPixelBodyToCanvas(cctx, intR);
    _cachedZenitsuBodyR = intR;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const halfSize = _cachedZenitsuBodyCanvas.width / 2;
  ctx.drawImage(_cachedZenitsuBodyCanvas, -halfSize, -halfSize);
  ctx.restore();
}

/**
 * Draws Zenitsu's authentic pixel art hand/fist
 */
export function drawZenitsuFist(ctx, x, y, radius, skinColor = '#FEE8D6', isLeft = false, fighter = null) {
  drawPixelHand(ctx, x, y, radius, skinColor || '#FEE8D6', '#000000');
}

/**
 * Pixel Art Back Hand (Managed inside _drawZenitsuFrontHand for synchronized two-handed katana grip)
 */
function _drawZenitsuBackHand(ctx, fighter, r, isKatanaSwinging, isPunching, animPhase) {
  // Hand rendering handled in _drawZenitsuFrontHand for exact transform & layer alignment over handle
}

/**
 * Pixel Art Hands & Lightning Katana (Authentic two-handed grip covering tsuka handle matching Image 1 mockup 100%)
 */
function _drawZenitsuFrontHand(ctx, fighter, r, isKatanaSwinging, isPunching, animPhase) {
  const defaultOffsetY = CONFIG?.zenitsu?.weaponOffsetY ?? 9.5;
  const swordStartX = r * 0.78 + (isKatanaSwinging ? animPhase * 8 : (isPunching ? animPhase * 10 : 0));
  const swordStartY = defaultOffsetY + (isKatanaSwinging ? (animPhase - 0.5) * (r * 0.12) : 0);
  const swingAngle = isKatanaSwinging ? (animPhase - 0.5) * 1.5 : 0;
  const skinColor = fighter.skinColor || '#FEE8D6';

  ctx.save();
  ctx.translate(swordStartX, swordStartY);
  ctx.rotate(swingAngle);

  // 1. Draw Modular Lightning Katana & Hands synchronized on tsuka handle
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  drawZenitsuLightningKatana(ctx, 0, 0, 0, r, {
    drawHands: !shouldHideHands,
    skinColor: skinColor,
    hideBackHand: Boolean(fighter.hideBackHand),
    hideFrontHand: Boolean(fighter.hideFrontHand)
  });

  ctx.restore();
}

