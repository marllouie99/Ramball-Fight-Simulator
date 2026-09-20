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
import { drawDivineAxeRhitta, drawRhittaSlashArc, drawRhittaSolarFlash } from '../weapons/escanorWeaponGraphics.js';

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
    const targetMustacheHeight = (targetMustacheWidth * (281 / 885)) * hMult;
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
  const r = fighter.r || 28;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const now = Date.now();

  const isSuppressed = !isPodiumPreview && Boolean(
    fighter.isTargetOfAmbush ||
    (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
  );

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
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

  // 4. LAYER 0: BACK HAND (Behind Body Layer)
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

  // 8. LAYER 4: FRONT HAND & DIVINE AXE RHITTA (On Top of Body, Mustache & Hair)
  const showFrontHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideFrontHand;
  if (showFrontHand) {
    _drawEscanorFrontHand(ctx, fighter, r, chopState, isPunching, punchPhase);
  }

  // 9. Active Rhitta Slash Arc Trail (Rule 2.6 / 15 Compliant: Dynamic Eraser Wipe)
  if (chopState.isSwinging && (chopState.phase === 'strike' || chopState.phase === 'hitPause' || chopState.phase === 'recovery') && !isSuppressed) {
    const reach = (typeof fighter.currentRhittaReach === 'number') ? fighter.currentRhittaReach : (CONFIG.escanor?.rhittaReach || 100);
    drawRhittaSlashArc(ctx, 0, 0, 0, r, chopState, fighter.isTheOneActive, reach);
  }

  // Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

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
function _drawEscanorSolarAura(ctx, r, fighter, now) {
  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
  const isTheOne = Boolean(fighter.isTheOneActive);
  const prideStacks = fighter.prideStacks || 0;
  const prideRatio = prideStacks / 5.0; // 0.0 to 1.0

  // Derive heat aura radius directly from fighter.currentSunshineHeatRadius or CONFIG.escanor.sunshineHeatRadius
  const baseHeatR = (fighter && typeof fighter.currentSunshineHeatRadius === 'number')
    ? fighter.currentSunshineHeatRadius
    : ((typeof cfg.sunshineHeatRadius === 'number') ? cfg.sunshineHeatRadius : 200);

  const heatPulse = Math.sin(now * 0.006) * (isTheOne ? 6.0 : 3.0);
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

  const strikeEndAngle = 1.18; // Ground cleave follow-through angle
  const strikeEndHandX = r * 0.40;
  const strikeEndHandY = r * 0.30;
  const strikeEndBackHandX = r * 0.60;
  const strikeEndBackHandY = -r * 0.15;

  // Cinematic Hit-Pause Impact Freeze: Axe locked in full cleave pose while shockwave / sparks hold
  if (fighter.chopHitPauseTimer && fighter.chopHitPauseTimer > 0) {
    const pauseMax = fighter.chopHitPauseMax || 10;
    const pauseP = Math.max(0, Math.min(1.0, 1.0 - (fighter.chopHitPauseTimer / pauseMax)));
    return {
      isSwinging: true,
      phase: 'hitPause',
      axeAngle: strikeEndAngle,
      handX: strikeEndHandX,
      handY: strikeEndHandY,
      backHandX: strikeEndBackHandX,
      backHandY: strikeEndBackHandY,
      strikeP: 1.0,
      pauseP,
      recP: 0
    };
  }

  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
  const liftFrames = (typeof fighter.chopLiftFrames === 'number') ? fighter.chopLiftFrames : ((typeof cfg.chopLiftFrames === 'number') ? cfg.chopLiftFrames : 8);
  const holdFrames = (typeof fighter.chopLiftHoldFrames === 'number') ? fighter.chopLiftHoldFrames : ((typeof cfg.chopLiftHoldFrames === 'number') ? cfg.chopLiftHoldFrames : 20);
  const strikeFrames = (typeof fighter.chopStrikeFrames === 'number') ? fighter.chopStrikeFrames : ((typeof cfg.chopStrikeFrames === 'number') ? cfg.chopStrikeFrames : 8);
  const recFrames = (typeof fighter.chopRecoveryFrames === 'number') ? fighter.chopRecoveryFrames : ((typeof cfg.chopRecoveryFrames === 'number') ? cfg.chopRecoveryFrames : 12);
  const totalFrames = fighter.slashSwingMaxTimer || (liftFrames + holdFrames + strikeFrames + recFrames);

  const elapsed = Math.max(0, totalFrames - fighter.slashSwingTimer);

  // Frame 2: Lift stance (hand at upper-right / top-center, weapon shaft pointing up-left over back shoulder)
  const overheadAngle = -2.45; // ~-140° pointing up-left
  const overheadHandX = -r * 0.25; // Upper back
  const overheadHandY = -r * 0.40; // Upper area
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
 * Escanor Layer 0: Back Hand — Right Gauntlet (Behind Body / Forward Guard & Chop Counter-Balance)
 */
function _drawEscanorBackHand(ctx, fighter, r, chopState, isPunching, punchPhase) {
  const handR = Math.max(r * 0.28, getHandSize(6.5));
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
 * Escanor Layer 2: Front Hand & Divine Axe Rhitta — Left Gauntlet (On Top of Body / Wielding Rhitta on the Lower Left Side -X/+Y)
 */
function _drawEscanorFrontHand(ctx, fighter, r, chopState, isPunching, punchPhase) {
  const handR = Math.max(r * 0.30, getHandSize(7.0));
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
    const hubDist = (r * 3.4) * (fighter.isTheOneActive ? 1.35 : prideScaleMult);
    const hubX = handX + Math.cos(axeAngle) * hubDist;
    const hubY = handY + Math.sin(axeAngle) * hubDist;
    const intensity = Math.sin(Math.max(0, 1.0 - (chopState.pauseP || 0)) * Math.PI * 0.5);
    drawRhittaSolarFlash(ctx, hubX, hubY, fighter.isTheOneActive, intensity);
  }

  // Golden Gauntlet gripping the axe blue hilt on the lower-left side of the body
  _drawEscanorGoldenGauntlet(ctx, handX, handY, handR, fighter.isTheOneActive);
}
