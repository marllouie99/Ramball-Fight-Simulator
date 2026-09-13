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
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawDivineAxeRhitta, drawRhittaSlashArc } from '../weapons/escanorWeaponGraphics.js';

const P = 2.0; // 2.0px authentic retro pixel grid
const snap = (v) => Math.round(v / P) * P;

/**
 * Discrete Hairline Array for Escanor's Swept-Back Noble Golden Mane
 * 27 columns total (gx = -13 to +13, index = gx + 13)
 * Terminating above the face zone (Rule 19.1 compliant).
 */
const ESCANOR_HAIRLINE_GY = [
   2,  1,  0, -2, -4, -3, -2, -2, -1,  0, -1, -3, -4, -5, -4, -3, -1,  0, -1, -2, -3, -4, -2,  0,  1,  2,  2
];

/**
 * Main Skin Renderer for Escanor (Pixel Art Edition)
 */
export function drawEscanorSkin(ctx, fighter) {
  const r = (fighter.r || 25) + (fighter.isTheOneActive ? 3 : 0);
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
    : { isSwinging: false, phase: 'idle', axeAngle: 0.46, handX: -r * 0.75, handY: r * 0.28, backHandX: r * 0.55, backHandY: -r * 0.15, strikeP: 0 };
  const isPunching = !isPodiumPreview && !isSuppressed && Boolean(fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
  const punchPhase = isPunching ? Math.min(1.0, 1.0 - (fighter.punchAnimTimer / (fighter.punchMaxTime || 14))) : 0;

  // 4. LAYER 0: BACK HAND (Behind Body Layer)
  const showBackHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideBackHand;
  if (showBackHand) {
    _drawEscanorBackHand(ctx, fighter, r, chopState, isPunching, punchPhase);
  }

  // 5. LAYER 1: MAIN BODY (Pixel Circle + Emerald Vest + Golden Hair + Handlebar Mustache)
  drawEscanorPixelBody(ctx, r, fighter.isTheOneActive);

  // 6. LAYER 2: FRONT HAND & DIVINE AXE RHITTA (On Top of Body)
  const showFrontHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideFrontHand;
  if (showFrontHand) {
    _drawEscanorFrontHand(ctx, fighter, r, chopState, isPunching, punchPhase);
  }

  // 7. Active Rhitta Slash Arc Trail
  if (chopState.isSwinging && chopState.phase === 'strike' && !isSuppressed) {
    drawRhittaSlashArc(ctx, 0, 0, 0, r, chopState.strikeP, fighter.isTheOneActive);
  }

  // Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}

/**
 * Escanor's Radiant Sunshine Solar Aura (Zero shadowBlur - Rule 11 compliant)
 */
function _drawEscanorSolarAura(ctx, r, fighter, now) {
  const isTheOne = Boolean(fighter.isTheOneActive);
  const prideStacks = fighter.prideStacks || 0;
  const pulse = Math.sin(now * 0.008) * 2;
  const auraR = r * (isTheOne ? 1.65 : (1.25 + prideStacks * 0.06)) + pulse;

  // Outer Corona Glow
  ctx.save();
  ctx.fillStyle = isTheOne ? 'rgba(254, 240, 138, 0.25)' : 'rgba(245, 158, 11, 0.18)';
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fill();

  // Middle Radiant Ring
  ctx.strokeStyle = isTheOne ? 'rgba(251, 191, 36, 0.65)' : 'rgba(245, 158, 11, 0.45)';
  ctx.lineWidth = isTheOne ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, auraR - 3, 0, Math.PI * 2);
  ctx.stroke();

  // The One: Rotating Solar Flare Rays
  if (isTheOne) {
    ctx.save();
    ctx.rotate(now * 0.003);
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.70)';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(r + 2, 0);
      ctx.lineTo(auraR + 6, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

let _escanorSkinImage = null;
let _escanorSkinImageLoading = false;
let _escanorMustacheImage = null;
let _escanorMustacheImageLoading = false;

export function _getEscanorSkinImage() {
  if (_escanorSkinImage && _escanorSkinImage.complete && _escanorSkinImage.naturalWidth > 0) {
    return _escanorSkinImage;
  }
  if (!_escanorSkinImageLoading && typeof Image !== 'undefined') {
    _escanorSkinImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _escanorSkinImage = img;
      _escanorSkinImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Escanor skin image at Assets/model/Escanor-skin-model.png', e);
      _escanorSkinImageLoading = false;
    };
    img.src = 'Assets/model/Escanor-skin-model.png?v=1';
    _escanorSkinImage = img;
  }
  return _escanorSkinImage;
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
      console.warn('Failed to load Escanor mustache image at Assets/model/Escanor-model-mustache.png', e);
      _escanorMustacheImageLoading = false;
    };
    img.src = 'Assets/model/Escanor-model-mustache.png?v=1';
    _escanorMustacheImage = img;
  }
  return _escanorMustacheImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getEscanorSkinImage();
  _getEscanorMustacheImage();
}

/**
 * Solid 2D Pixel-Art Body for Escanor
 * Uses high-definition pixel-art models from Assets/model/ with procedural fallback.
 */
export function drawEscanorPixelBody(ctx, r, isTheOne = false) {
  const skinImg = _getEscanorSkinImage();
  const mustacheImg = _getEscanorMustacheImage();

  if (skinImg && skinImg.complete && skinImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Escanor-skin-model.png: 500x500 base model, body circle center at (245, 275) with r ~ 140
    const scale = r / 140.0;
    ctx.drawImage(skinImg, -245.0 * scale, -275.0 * scale, 500.0 * scale, 500.0 * scale);

    // Escanor-model-mustache.png: 1774x887 handlebar mustache overlay
    if (mustacheImg && mustacheImg.complete && mustacheImg.naturalWidth > 0) {
      const mustacheW = r * 1.05;
      const mustacheH = mustacheW / 2.0;
      ctx.drawImage(mustacheImg, -mustacheW / 2.0, -r * 0.32, mustacheW, mustacheH);
    }

    // Solar glint overlay for "The One" transformation
    if (isTheOne) {
      ctx.fillStyle = 'rgba(254, 240, 138, 0.15)';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  _drawEscanorProceduralFallback(ctx, r, isTheOne);
}

/**
 * Procedural Pixel-Art Armor Body Fallback
 */
function _drawEscanorProceduralFallback(ctx, r, isTheOne = false) {
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

      // ── 2. SWEPT-BACK GOLDEN-BLONDE HAIR (gy <= hairCutoffGy) ──
      const hairIdx = Math.max(0, Math.min(26, gx + 13));
      const hairCutoffGy = ESCANOR_HAIRLINE_GY[hairIdx];
      const isHair = gy <= hairCutoffGy;

      if (isHair) {
        if (normY < -0.65 && (gx % 2 === 0)) {
          ctx.fillStyle = '#FEF08A'; // Solar crown highlight / glint
        } else if (normY < -0.35) {
          ctx.fillStyle = isTheOne ? '#FEF08A' : '#FBBF24'; // Bright golden anime blonde
        } else if (gy >= hairCutoffGy - 1) {
          ctx.fillStyle = '#D97706'; // Warm amber lock edge / depth
        } else {
          ctx.fillStyle = '#F59E0B'; // Rich golden midtone
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 3. CHISELED FACE & PROUD MUSTACHE ZONE (-r*0.18 to +r*0.18) ──
      if (normY < 0.18) {
        // Handlebar Mustache Silhouette (gy between 2 and 5, curved upward at tips)
        const isMustache = (
          (gy === 3 && Math.abs(gx) <= 4) ||
          (gy === 4 && (Math.abs(gx) <= 5 && Math.abs(gx) >= 1)) ||
          (gy === 2 && (Math.abs(gx) === 4 || Math.abs(gx) === 5)) // Upward curved tips!
        );

        if (isMustache) {
          ctx.fillStyle = isTheOne ? '#92400E' : '#78350F'; // Proud amber handlebar mustache
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Chiseled Tanned Warrior Face Skin
        if (normY < -0.05) {
          ctx.fillStyle = '#FEE8D6'; // Pale anime face skin
        } else if (normY < 0.08) {
          ctx.fillStyle = '#FDD3B2'; // Warm peach tone
        } else {
          ctx.fillStyle = '#F9B786'; // Chin & jawline shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 4. ESCANOR'S DAY FORM: GOLDEN HOLY KNIGHT ARMOR (+r*0.18 to +r*1.00) ──
      // Reference: Segmented Golden Sun-Plate Cuirass with Royal Blue Pauldrons & White Sun Crest

      // A. Royal Blue Shoulder Pauldrons (|normX| >= 0.45 && normY >= 0.18 && normY <= 0.72)
      const isShoulderPauldron = Math.abs(normX) >= 0.45 && normY >= 0.18 && normY <= 0.72;
      if (isShoulderPauldron) {
        const isPauldronGoldRim = Math.abs(normX) >= 0.78 || normY <= 0.22 || (normY >= 0.68 && normY <= 0.72);
        if (isPauldronGoldRim) {
          ctx.fillStyle = isTheOne ? '#FEF08A' : '#FBBF24'; // Polished Gold Pauldron Rim
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // White Lion / Sun Heraldic Crest Pixels inside the Blue Field
        const isPauldronCrest = (
          (Math.abs(gx) === 6 && (gy === 6 || gy === 7)) ||
          (Math.abs(gx) === 7 && (gy === 5 || gy === 6 || gy === 7 || gy === 8)) ||
          (Math.abs(gx) === 8 && (gy === 6 || gy === 7))
        );
        if (isPauldronCrest) {
          ctx.fillStyle = '#FFFFFF'; // Pure white heraldic sun crest
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Royal Blue Main Pauldron Plate
        if (normY < 0.40) {
          ctx.fillStyle = '#3B82F6'; // Lighter royal blue highlight
        } else if (normY < 0.58) {
          ctx.fillStyle = '#2563EB'; // Vibrant royal blue
        } else {
          ctx.fillStyle = '#1D4ED8'; // Deep blue shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // B. High Golden Gorget & Neck Collar (normY >= 0.18 && normY <= 0.28 && |normX| < 0.45)
      const isGorget = normY >= 0.18 && normY <= 0.28;
      if (isGorget) {
        if (Math.abs(gx) <= 1) {
          ctx.fillStyle = '#FEF08A'; // Center gorget sheen
        } else if (gy === 3 || gy === 4) {
          ctx.fillStyle = '#FBBF24'; // High collar gold plate
        } else {
          ctx.fillStyle = '#D97706'; // Gorget rim shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // C. Tiered Scalloped Golden Sun Cuirass / Breastplate (normY > 0.28 && normY <= 0.72)
      const isBreastplate = normY > 0.28 && normY <= 0.72;
      if (isBreastplate) {
        // Scalloped Tier Overlap Seams (gy = 6, 9, 12)
        const isTierSeam = (
          (gy === 6 && Math.abs(gx) <= 4) ||
          (gy === 9 && Math.abs(gx) <= 3) ||
          (gy === 12 && Math.abs(gx) <= 3)
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

      // D. Golden Armored Faulds & Segmented Tassets (normY > 0.72 to +r*1.00)
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

  // Extra crown spikes breaking the top circle boundary (Rule 19.1)
  ctx.fillStyle = isTheOne ? '#FEF08A' : '#FBBF24';
  ctx.fillRect(-6, -r - 3, 4, 4);
  ctx.fillRect(2, -r - 4, 4, 5);
  ctx.fillRect(-12, -r + 2, 4, 4);
  ctx.fillRect(8, -r + 1, 4, 4);

  // Extra Shoulder Pauldron Plates breaking side boundaries for imposing armor silhouette
  ctx.fillStyle = '#FBBF24'; // Gold top rim
  ctx.fillRect(-r - 3, 4, 4, 3);
  ctx.fillRect(r - 1, 4, 4, 3);
  ctx.fillStyle = '#2563EB'; // Royal Blue flare
  ctx.fillRect(-r - 2, 7, 3, 6);
  ctx.fillRect(r - 1, 7, 3, 6);

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
  if (!fighter.slashSwingTimer || fighter.slashSwingTimer <= 0) {
    const r = (fighter.r || 25) + (fighter.isTheOneActive ? 3 : 0);
    return {
      isSwinging: false,
      phase: 'idle',
      axeAngle: 0.46,
      handX: -r * 0.75,
      handY: r * 0.28,
      backHandX: r * 0.55,
      backHandY: -r * 0.15,
      strikeP: 0
    };
  }

  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
  const liftFrames = (typeof fighter.chopLiftFrames === 'number') ? fighter.chopLiftFrames : ((typeof cfg.chopLiftFrames === 'number') ? cfg.chopLiftFrames : 8);
  const holdFrames = (typeof fighter.chopLiftHoldFrames === 'number') ? fighter.chopLiftHoldFrames : ((typeof cfg.chopLiftHoldFrames === 'number') ? cfg.chopLiftHoldFrames : 20);
  const strikeFrames = (typeof fighter.chopStrikeFrames === 'number') ? fighter.chopStrikeFrames : ((typeof cfg.chopStrikeFrames === 'number') ? cfg.chopStrikeFrames : 8);
  const recFrames = (typeof fighter.chopRecoveryFrames === 'number') ? fighter.chopRecoveryFrames : ((typeof cfg.chopRecoveryFrames === 'number') ? cfg.chopRecoveryFrames : 12);
  const totalFrames = fighter.slashSwingMaxTimer || (liftFrames + holdFrames + strikeFrames + recFrames);

  const elapsed = Math.max(0, totalFrames - fighter.slashSwingTimer);
  const r = (fighter.r || 25) + (fighter.isTheOneActive ? 3 : 0);

  let axeAngle = 0.46;
  let handX = -r * 0.75;
  let handY = r * 0.28;
  let backHandX = r * 0.55;
  let backHandY = -r * 0.15;
  let strikeP = 0;
  let phase = 'lift';

  if (elapsed < liftFrames) {
    // 1. LIFT: Raise weapon up from resting pose (+0.46) to high overhead stance (-1.35)
    phase = 'lift';
    const p = Math.min(1.0, elapsed / Math.max(1, liftFrames));
    // Smooth sine ease-in-out: starts slow (heavy weapon), flows through, decelerates at top
    const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
    axeAngle = 0.46 + (-1.35 - 0.46) * ease;
    handX = -r * 0.75 + ease * (r * 0.35);
    handY = r * 0.28 - ease * (r * 0.65);
    backHandX = r * 0.55 - ease * (r * 0.30);
    backHandY = -r * 0.15 - ease * (r * 0.35);
  } else if (elapsed < liftFrames + holdFrames) {
    // 2. POISED OVERHEAD HOLD: STAYS POISED IN HIGH OVERHEAD CHOP POSITION FOR EXACT chopLiftHoldFrames!
    phase = 'hold';
    const holdElapsed = elapsed - liftFrames;
    const tensionTremor = Math.sin(holdElapsed * 0.8) * 0.02; // Muscular tension tremor
    axeAngle = -1.35 + tensionTremor;
    handX = -r * 0.40;
    handY = -r * 0.37 + Math.sin(holdElapsed * 0.3) * 0.8;
    backHandX = r * 0.25;
    backHandY = -r * 0.50;
  } else if (elapsed < liftFrames + holdFrames + strikeFrames) {
    // 3. EXPLOSIVE DOWNWARD CHOP STRIKE: Snaps from -1.35 rad down to +1.15 rad
    phase = 'strike';
    const strikeElapsed = elapsed - (liftFrames + holdFrames);
    strikeP = Math.min(1.0, strikeElapsed / Math.max(1, strikeFrames));
    const ease = 1 - Math.pow(1 - strikeP, 3); // Cubic explosive snap
    axeAngle = -1.35 + (1.15 - (-1.35)) * ease;
    handX = -r * 0.40 + ease * (r * 0.85);
    handY = -r * 0.37 + ease * (r * 0.75);
    backHandX = r * 0.25 + ease * (r * 0.35);
    backHandY = -r * 0.50 + ease * (r * 0.35);
  } else {
    // 4. RECOVERY: Smoothly return from +1.15 rad to resting pose (+0.46)
    phase = 'recovery';
    const recElapsed = elapsed - (liftFrames + holdFrames + strikeFrames);
    const recP = Math.min(1.0, recElapsed / Math.max(1, recFrames));
    const ease = recP * (2 - recP);
    axeAngle = 1.15 + (0.46 - 1.15) * ease;
    handX = (r * 0.45) + (-r * 0.75 - (r * 0.45)) * ease;
    handY = (r * 0.38) + (r * 0.28 - (r * 0.38)) * ease;
    backHandX = (r * 0.60) + (r * 0.55 - (r * 0.60)) * ease;
    backHandY = -r * 0.15;
  }

  return { isSwinging: true, phase, axeAngle, handX, handY, backHandX, backHandY, strikeP };
}

/**
 * Escanor Layer 0: Back Hand — Right Gauntlet (Behind Body / Forward Guard & Chop Counter-Balance)
 */
function _drawEscanorBackHand(ctx, fighter, r, chopState, isPunching, punchPhase) {
  const handR = Math.max(r * 0.22, getHandSize(5.2));
  let handX = r * 0.55;
  let handY = -r * 0.15;

  if (chopState.isSwinging) {
    handX = chopState.backHandX;
    handY = chopState.backHandY;
  } else if (isPunching) {
    handX = r * 0.85 + Math.sin(punchPhase * Math.PI) * (r * 0.35);
    handY = -r * 0.20;
  }

  // Golden Plate Gauntlet (Right hand on the forward/upper side)
  _drawEscanorGoldenGauntlet(ctx, handX, handY, handR, fighter.isTheOneActive);
}

/**
 * Escanor Layer 2: Front Hand & Divine Axe Rhitta — Left Gauntlet (On Top of Body / Overhead Lift, Hold, & Chop Down)
 */
function _drawEscanorFrontHand(ctx, fighter, r, chopState, isPunching, punchPhase) {
  const handR = Math.max(r * 0.24, getHandSize(5.6));
  let handX = -r * 0.75;
  let handY = r * 0.28;
  let axeAngle = 0.46; // Canonical resting pose: held at far left flank angled down-forward

  if (chopState.isSwinging) {
    handX = chopState.handX;
    handY = chopState.handY;
    axeAngle = chopState.axeAngle;
  } else if (isPunching) {
    handX = r * 0.75 + Math.sin(punchPhase * Math.PI) * (r * 0.40);
    handY = r * 0.15;
    axeAngle = 0.20;
  }

  // Draw Divine Axe Rhitta held firmly in left hand by the blue hilt
  drawDivineAxeRhitta(ctx, handX, handY, axeAngle, r, {
    isSwinging: chopState.isSwinging,
    isTheOne: fighter.isTheOneActive,
    heatLevel: 1.0 + (fighter.prideStacks || 0) * 0.2
  });

  // Left Golden Gauntlet gripping the axe blue hilt
  _drawEscanorGoldenGauntlet(ctx, handX, handY, handR, fighter.isTheOneActive);
}
