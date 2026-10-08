// ─────────────────────────────────────────────
// Denji (The Chainsaw Devil Hybrid) Fighter Skin & Body Model
// Authentic Chainsaw Man Anime & Manga Edition (1:1 Reference Pixel Art)
// Adheres strictly to:
// - Rule 19 (Upright Front POV Camera Orientation, Zero Eyes/Mouth/Nose in Human Form)
// - Rule 19.1 (Proportional Vertical Bands & Discrete Lock Hair Arrays)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawAuthenticChainsawBlade, drawDenjiAttackSlashFX, drawDenjiChainsawSmoke } from '../weapons/denjiWeaponGraphics.js';

const P = 2.0;
function snap(v) {
  return Math.round(v / P) * P;
}

let _denjiDevilSkinImage = null;
let _denjiDevilSkinImageLoading = false;

export function _getDenjiDevilSkinImage() {
  if (_denjiDevilSkinImage && _denjiDevilSkinImage.complete && _denjiDevilSkinImage.naturalWidth > 0) {
    return _denjiDevilSkinImage;
  }
  if (!_denjiDevilSkinImageLoading && typeof Image !== 'undefined') {
    _denjiDevilSkinImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _denjiDevilSkinImage = img;
      _denjiDevilSkinImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Denji devil form pixel skin image at Assets/model/denji/denji-devilform-model-skin.png', e);
      _denjiDevilSkinImageLoading = false;
    };
    img.src = 'Assets/model/denji/denji-devilform-model-skin.png?v=1';
    _denjiDevilSkinImage = img;
  }
  return _denjiDevilSkinImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getDenjiDevilSkinImage();
}

/**
 * Main Skin Renderer for Denji (Human Form & Chainsaw Devil Hybrid Form)
 */
export function drawDenjiSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const now = Date.now();

  const isSuppressed = !isPodiumPreview && Boolean(
    fighter.isTargetOfAmbush || 
    (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
  );

  const isHybrid = (fighter.isHybridModeActive !== false) || Boolean(fighter.isExecutingMassacre);
  const hideChainsaws = Boolean(fighter.hideChainsaws || fighter.hideChainsaw || (typeof state !== 'undefined' && (state.hideDenjiChainsaws || state.showSkinOnly)));
  const hideHands = Boolean(fighter.hideHands || fighter.hideFrontHand || fighter.hideBackHand || hideChainsaws || (typeof state !== 'undefined' && state.showSkinOnly));

  let denjiShakeX = 0;
  let denjiShakeY = 0;
  if (fighter.shredShakeTimer && fighter.shredShakeTimer > 0) {
    const intensity = fighter.shredShakeIntensity || 2.0;
    denjiShakeX = (Math.random() - 0.5) * intensity * 2;
    denjiShakeY = (Math.random() - 0.5) * intensity * 2;
  }

  ctx.save();
  ctx.translate(fighter.x + denjiShakeX, fighter.y + denjiShakeY);

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 2. Shred & Lunge States
  const isPunching = !isPodiumPreview && !isSuppressed && (fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
  const isLunge = !isPodiumPreview && !isSuppressed && Boolean(
    fighter.isEngineLunging || 
    (fighter.lungeWindupTimer && fighter.lungeWindupTimer > 0) || 
    (fighter.lungeHitRecoveryTimer && fighter.lungeHitRecoveryTimer > 0)
  );
  const isShredding = !isPodiumPreview && Boolean(fighter.isShredding);

  // Golden Helmet Vent Slits Illumination Alpha during Skill 1 (Windup, Dash, Impact Breather, Speed Boost)
  let lungeGlowAlpha = 0;
  if (!isPodiumPreview && !isSuppressed) {
    if (fighter.lungeWindupTimer && fighter.lungeWindupTimer > 0) {
      lungeGlowAlpha = 1.0;
    } else if (fighter.isEngineLunging) {
      lungeGlowAlpha = 1.0;
    } else if (fighter.lungeHitRecoveryTimer && fighter.lungeHitRecoveryTimer > 0) {
      lungeGlowAlpha = 1.0;
    } else if (fighter.lungePostSpeedBoostTimer && fighter.lungePostSpeedBoostTimer > 0) {
      const maxBoost = (typeof CONFIG !== 'undefined' && CONFIG.denji && CONFIG.denji.lungePostSpeedBoostFrames !== undefined)
        ? CONFIG.denji.lungePostSpeedBoostFrames 
        : (fighter.lungePostSpeedBoostFrames || 200);
      const fadeDuration = Math.min(45, maxBoost);
      if (fighter.lungePostSpeedBoostTimer > fadeDuration) {
        lungeGlowAlpha = 1.0;
      } else {
        lungeGlowAlpha = Math.max(0, fighter.lungePostSpeedBoostTimer / fadeDuration);
      }
    }
  }

  const curContinuous = fighter.continuousShredTimer || 0;
  const smokeMax = 120; // 2.0s continuous shred duration for full thermal friction heat
  const heatRatio = curContinuous > 0 ? Math.min(1.0, curContinuous / smokeMax) : 0;

  const combatOpts = {
    isAttacking: isPunching || isShredding,
    isLunging: isLunge,
    isSawing: isShredding,
    shredBladeCount: fighter.shredBladeCount || (isShredding ? 1 : 0),
    isMassacre: Boolean(fighter.isExecutingMassacre),
    heatRatio: heatRatio,
    isOverheated: heatRatio > 0,
    lungeGlowAlpha: lungeGlowAlpha
  };

  // 3. LAYER 1: MAIN BODY CIRCLE (Permanently Chainsaw Devil Form)
  const devilImg = _getDenjiDevilSkinImage();
  if (devilImg && devilImg.complete && devilImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const drawW = r * (1150 / 368);
    const drawH = r * (1150 / 368);
    const shiftX = r * (600 / 368);
    const shiftY = r * (620 / 368);
    ctx.drawImage(devilImg, -shiftX, -shiftY, drawW, drawH);
    ctx.restore();

    // Golden Helmet Vent Slit Illumination (Lights up during windup/dash, fades as speed boost expires)
    if (lungeGlowAlpha > 0) {
      _drawDenjiHelmetVentGlow(ctx, r, lungeGlowAlpha, now);
    }

    // Central Forehead Chainsaw Blade (Protruding Forward along Top Crest)
    if (!hideChainsaws && !(typeof state !== 'undefined' && state.showSkinOnly)) {
      _drawDenjiForeheadChainsaw(ctx, r, now, combatOpts);
    }
  } else {
    drawDenjiChainsawHybridBody(ctx, r, now, hideChainsaws, combatOpts);
    if (lungeGlowAlpha > 0) {
      _drawDenjiHelmetVentGlow(ctx, r, lungeGlowAlpha, now);
    }
  }

  // 4. LAYER 2: SYMMETRICAL FRONT HANDS & FOREARM CHAINSAWS (Rule 20 Front Layer Standard)
  // Both Left Hand (-r * 0.82, +r * 0.38) and Right Hand (+r * 0.82, +r * 0.38) on the FRONT layer!
  if (!hideHands && !(typeof state !== 'undefined' && state.showSkinOnly)) {
    // Left Hand / Left Forearm Chainsaw (Symmetrical Lower-Left Flank)
    if (!fighter.hideBackHand && (!hideChainsaws || !isHybrid)) {
      _drawDenjiLeftArm(ctx, fighter, r, isHybrid, isPunching, isLunge, isPodiumPreview, now, combatOpts);
    }
    // Right Hand / Right Forearm Chainsaw (Symmetrical Lower-Right Flank)
    if (!fighter.hideFrontHand && (!hideChainsaws || !isHybrid)) {
      _drawDenjiRightArm(ctx, fighter, r, isHybrid, isPunching, isLunge, isPodiumPreview, now, combatOpts);
    }
  }

  ctx.restore();

  // 5. LAYER 3: Chainsaw Overheat Smoke Effect (World Space Particles)
  if (!isPodiumPreview && !hideChainsaws) {
    drawDenjiChainsawSmoke(ctx, fighter);
  }
}

/**
 * Discrete Pixel-Art Hairline & Bangs Grid for Denji's Messy Spiked Anime Hair
 * 27 columns total (gx = -13 to +13, index = gx + 13)
 * Features messy, staggered spikes characteristic of Denji's unkempt blonde hair.
 */
const DENJI_HAIRLINE_GY = [
   1,  2,  1,  0, -1, -3, -4, -3, -2,  0,  1,  2,  2,  1,  0, -2, -4, -3, -1,  0,  1,  2,  1,  2,  2,  1,  1
];

/**
 * Draws Denji's Human Body Circle in Solid 2D Pixel Art (Rule 19 & 19.1)
 */
export function drawDenjiHumanPixelBody(ctx, r, now) {
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

      // ── Outer Dark Manga Ink Shell (1px boundary) ──
      const isInkOutline = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );
      if (isInkOutline) {
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 1. HAIR LAYER (Crown Spikes & Bangs: normY <= 0.0) ──
      const hairIdx = Math.max(0, Math.min(26, gx + 13));
      const hairCutoffGy = DENJI_HAIRLINE_GY[hairIdx];
      const isHair = gy <= hairCutoffGy;

      if (isHair) {
        // Top-left specular golden highlight
        if (normY < -0.45 && normX < 0.2) {
          ctx.fillStyle = '#FEF08A'; // Pale blonde highlight
        } else if (normY < -0.15) {
          ctx.fillStyle = '#FACC15'; // Vibrant anime blonde
        } else if (normY < 0.05) {
          ctx.fillStyle = '#EAB308'; // Ochre yellow base
        } else {
          ctx.fillStyle = '#CA8A04'; // Hair root shadow
        }
        ctx.fillRect(px, py, P, P);

        // Dark hair crevice shadow accents
        if ((gx === -7 || gx === 0 || gx === 6) && gy === hairCutoffGy) {
          ctx.fillStyle = '#713F12';
          ctx.fillRect(px, py, P, P);
        }
        continue;
      }

      // ── 2. FACE ZONE (normY: 0.0 to +0.22) ──
      // Strictly faceless aesthetic (Rule 19)
      if (normY < 0.22) {
        if (normY < 0.08) {
          ctx.fillStyle = '#FFE0BD'; // Warm peach skin base
        } else if (normY < 0.16) {
          ctx.fillStyle = '#F3C99F'; // Mid skin tone
        } else {
          ctx.fillStyle = '#E2B185'; // Jawline shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 3. SHIRT COLLAR, LOOSE TIE & POCHITA RIPCORD (normY: +0.22 to +0.65) ──
      if (normY < 0.65) {
        const isTie = Math.abs(gx) <= 1 && normY >= 0.26;
        const isShirtCollar = Math.abs(gx) <= 3 && normY >= 0.22 && normY <= 0.32;
        const isRipcordRing = (gx === 2 || gx === 3) && (gy === 4 || gy === 5);
        const isRipcordCord = gx === 2 && (gy === 3 || gy === 4);

        if (isRipcordRing) {
          ctx.fillStyle = '#CBD5E1'; // Metallic pull-ring
          ctx.fillRect(px, py, P, P);
        } else if (isRipcordCord) {
          ctx.fillStyle = '#F97316'; // Orange pull cord
          ctx.fillRect(px, py, P, P);
        } else if (isTie) {
          ctx.fillStyle = '#0F172A'; // Loosened black silk tie
          ctx.fillRect(px, py, P, P);
        } else if (isShirtCollar) {
          ctx.fillStyle = '#FFFFFF'; // Crisp white unbuttoned collar
          ctx.fillRect(px, py, P, P);
        } else {
          // White Public Safety shirt with fabric shading
          if (normX < -0.3) {
            ctx.fillStyle = '#E2E8F0'; // Left flank shadow
          } else if (normX > 0.3) {
            ctx.fillStyle = '#CBD5E1'; // Right flank shadow
          } else {
            ctx.fillStyle = '#FAF7F0'; // Shirt front
          }
          ctx.fillRect(px, py, P, P);
        }
        continue;
      }

      // ── 4. LOWER TORSO & CHARCOAL PANTS (normY: +0.65 to +1.00) ──
      if (normY < 0.72) {
        // Belt line
        if (Math.abs(gx) <= 1) {
          ctx.fillStyle = '#F59E0B'; // Gold belt buckle
        } else {
          ctx.fillStyle = '#18181B'; // Black leather belt
        }
      } else {
        // Charcoal trousers with subtle center crease
        if (gx === 0) {
          ctx.fillStyle = '#0F172A'; // Fly seam
        } else {
          ctx.fillStyle = '#1E293B'; // Dark slate pants
        }
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  // ── Extra Crown Spikes extending beyond circle boundary (Rule 19.1) ──
  _drawDenjiCrownSpikes(ctx, r);

  ctx.restore();
}

/**
 * Extra pixel-art crown hair spikes breaking the top circle boundary (Rule 19.1)
 */
function _drawDenjiCrownSpikes(ctx, r) {
  const spikes = [
    { gx: -8, gy: -15, col: '#FACC15' },
    { gx: -7, gy: -14, col: '#FACC15' },
    { gx: -4, gy: -16, col: '#FEF08A' },
    { gx: -3, gy: -15, col: '#FACC15' },
    { gx:  0, gy: -16, col: '#FEF08A' },
    { gx:  1, gy: -15, col: '#FACC15' },
    { gx:  4, gy: -15, col: '#FACC15' },
    { gx:  5, gy: -14, col: '#EAB308' },
    { gx:  8, gy: -14, col: '#EAB308' },
  ];

  for (let sp of spikes) {
    ctx.fillStyle = '#18181B'; // Ink outline
    ctx.fillRect(snap(sp.gx * P - P), snap(sp.gy * P - P), P * 3, P * 3);
  }
  for (let sp of spikes) {
    ctx.fillStyle = sp.col;
    ctx.fillRect(snap(sp.gx * P), snap(sp.gy * P), P, P);
  }
}

/**
 * Renders the 3 acoustic exhaust vent ridges / slits on Denji's Chainsaw Devil helmet cowl
 * glowing in radiant gold during Skill 1 Ripcord Engine Rev Lunge (wind-up, dash, recovery, speed boost).
 * Adheres strictly to Rule 11 (Zero shadowBlur CPU performance preservation).
 */
export function _drawDenjiHelmetVentGlow(ctx, r, glowAlpha, now = 0) {
  if (!glowAlpha || glowAlpha <= 0) return;
  const clampedAlpha = Math.max(0, Math.min(1.0, glowAlpha));
  const scale = r / 25;

  // Pulse oscillation (high-frequency engine rev electrical vibration)
  const time = now || Date.now();
  const pulse = 0.90 + 0.10 * Math.sin(time * 0.035);
  const effAlpha = clampedAlpha * pulse;

  const slits = [
    // Slit 1 (Left / Rear)
    { x1: -10.8 * scale, y1: -13.2 * scale, x2: -7.2 * scale, y2: -2.0 * scale, thick: 2.6 * scale, steps: 5 },
    // Slit 2 (Center / Main)
    { x1: -6.2 * scale, y1: -15.8 * scale, x2: -2.4 * scale, y2: -1.8 * scale, thick: 2.8 * scale, steps: 6 },
    // Slit 3 (Right / Front)
    { x1: -1.6 * scale, y1: -13.2 * scale, x2: +2.4 * scale, y2: -1.8 * scale, thick: 2.6 * scale, steps: 5 },
  ];

  const bloomX = -4.3 * scale;
  const bloomY = -8.0 * scale;

  ctx.save();

  // 0. LAYER 0: Multi-Tier Golden Radial Atmosphere Bloom (Simulated GPU Bloom without shadowBlur)
  const bloomRadius = (r * 1.15) * (0.92 + 0.08 * Math.sin(time * 0.04));
  const innerBloomRadius = r * 0.55;

  // Outer Soft Ambient Golden Bloom
  const outerBloomGrad = ctx.createRadialGradient(bloomX, bloomY, innerBloomRadius * 0.2, bloomX, bloomY, bloomRadius);
  outerBloomGrad.addColorStop(0.0, `rgba(255, 255, 240, ${effAlpha * 0.65})`);
  outerBloomGrad.addColorStop(0.25, `rgba(254, 240, 138, ${effAlpha * 0.45})`);
  outerBloomGrad.addColorStop(0.55, `rgba(250, 204, 21, ${effAlpha * 0.24})`);
  outerBloomGrad.addColorStop(0.82, `rgba(245, 158, 11, ${effAlpha * 0.08})`);
  outerBloomGrad.addColorStop(1.0, 'rgba(217, 119, 6, 0.0)');

  ctx.fillStyle = outerBloomGrad;
  ctx.beginPath();
  ctx.arc(bloomX, bloomY, bloomRadius, 0, Math.PI * 2);
  ctx.fill();

  // Intense Inner Core Bloom Hotspot
  const innerBloomGrad = ctx.createRadialGradient(bloomX, bloomY, 0, bloomX, bloomY, innerBloomRadius);
  innerBloomGrad.addColorStop(0.0, `rgba(255, 255, 255, ${effAlpha * 0.75})`);
  innerBloomGrad.addColorStop(0.40, `rgba(254, 240, 138, ${effAlpha * 0.50})`);
  innerBloomGrad.addColorStop(0.80, `rgba(250, 204, 21, ${effAlpha * 0.20})`);
  innerBloomGrad.addColorStop(1.0, 'rgba(250, 204, 21, 0.0)');

  ctx.fillStyle = innerBloomGrad;
  ctx.beginPath();
  ctx.arc(bloomX, bloomY, innerBloomRadius, 0, Math.PI * 2);
  ctx.fill();

  // 1. Outer Warm Amber Radiation Halo on Each Slit
  for (let s of slits) {
    ctx.strokeStyle = `rgba(245, 158, 11, ${effAlpha * 0.42})`;
    ctx.lineWidth = s.thick + 3.4 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }

  // 2. Main Radiant Super Saiyan Anime Gold Body (#FACC15 / #FFD700)
  for (let s of slits) {
    ctx.strokeStyle = `rgba(250, 204, 21, ${effAlpha * 0.95})`;
    ctx.lineWidth = s.thick;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }

  // 3. High-Intensity White-Gold Core Filament (#FEF08A / #FFFFFF)
  for (let s of slits) {
    ctx.strokeStyle = `rgba(254, 240, 138, ${effAlpha * 0.95})`;
    ctx.lineWidth = Math.max(1.0, s.thick * 0.42);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x1 * 0.92 + s.x2 * 0.08, s.y1 * 0.92 + s.y2 * 0.08);
    ctx.lineTo(s.x1 * 0.08 + s.x2 * 0.92, s.y1 * 0.08 + s.y2 * 0.92);
    ctx.stroke();
  }

  // 4. Fine Discrete Pixel Slats & Specular Sparks (Authentic 1:1 Pixel Art Aesthetic)
  for (let s of slits) {
    for (let i = 0; i <= s.steps; i++) {
      const t = i / s.steps;
      const tx = s.x1 + (s.x2 - s.x1) * t;
      const ty = s.y1 + (s.y2 - s.y1) * t;
      const px = snap(tx);
      const py = snap(ty);

      if (i % 2 === 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${effAlpha * 0.95})`;
        ctx.fillRect(px, py, P, P);
      } else {
        ctx.fillStyle = `rgba(254, 240, 138, ${effAlpha * 0.90})`;
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  // 5. Anamorphic Golden Lens Flare / Diamond Bloom Streaks
  if (effAlpha >= 0.25) {
    const flareLen = (r * 0.95) * (0.85 + 0.15 * Math.sin(time * 0.04));
    const flareThick = 2.4 * scale;
    const flareAngle = 1.28; // Diagonal slant aligned with helmet cowl acoustic slits

    ctx.save();
    ctx.translate(bloomX, bloomY);
    ctx.rotate(flareAngle);

    // Primary Longitudinal Lens Flare Beam
    const flareGrad = ctx.createLinearGradient(-flareLen, 0, flareLen, 0);
    flareGrad.addColorStop(0.0, 'rgba(250, 204, 21, 0.0)');
    flareGrad.addColorStop(0.35, `rgba(250, 204, 21, ${effAlpha * 0.38})`);
    flareGrad.addColorStop(0.5, `rgba(255, 255, 255, ${effAlpha * 0.88})`);
    flareGrad.addColorStop(0.65, `rgba(250, 204, 21, ${effAlpha * 0.38})`);
    flareGrad.addColorStop(1.0, 'rgba(250, 204, 21, 0.0)');

    ctx.fillStyle = flareGrad;
    ctx.beginPath();
    ctx.moveTo(-flareLen, 0);
    ctx.lineTo(0, -flareThick);
    ctx.lineTo(flareLen, 0);
    ctx.lineTo(0, flareThick);
    ctx.closePath();
    ctx.fill();

    // Secondary Perpendicular Cross-Beam
    const crossLen = flareLen * 0.45;
    const crossThick = flareThick * 0.75;
    const crossGrad = ctx.createLinearGradient(0, -crossLen, 0, crossLen);
    crossGrad.addColorStop(0.0, 'rgba(254, 240, 138, 0.0)');
    crossGrad.addColorStop(0.5, `rgba(255, 255, 255, ${effAlpha * 0.80})`);
    crossGrad.addColorStop(1.0, 'rgba(254, 240, 138, 0.0)');

    ctx.fillStyle = crossGrad;
    ctx.beginPath();
    ctx.moveTo(0, -crossLen);
    ctx.lineTo(-crossThick, 0);
    ctx.lineTo(0, crossLen);
    ctx.lineTo(crossThick, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // 6. Micro Engine Exhaust Flame/Sparks at Top Vent Lips (during peak lunge/dash)
  if (effAlpha >= 0.75) {
    const sparkCount = 3;
    for (let i = 0; i < sparkCount; i++) {
      const s = slits[i];
      const sparkPhase = (time * 0.02 + i * 2.1);
      const sparkX = s.x1 + Math.sin(sparkPhase) * (1.5 * scale);
      const sparkY = s.y1 - Math.abs(Math.cos(sparkPhase)) * (2.5 * scale);
      ctx.fillStyle = `rgba(254, 240, 138, ${effAlpha * (0.6 + 0.4 * Math.sin(sparkPhase * 2))})`;
      ctx.fillRect(snap(sparkX), snap(sparkY), P, P);
    }
  }

  ctx.restore();
}

/**
 * Draws Denji's Chainsaw Devil Hybrid Form Body in Solid 2D Pixel Art
 * Authentic 1:1 Chainsaw Man reference design matching official anime close-up:
 * - Fiery orange helmet cowl with 3 concentric black acoustic/exhaust vent ridges
 * - Sharp orange lower jaw/chin guard plate beneath mouth
 * - Interlocking sharp triangular shark teeth in terrifying open grin
 * - Rear mechanical engine gearbox with circular starter axle & exhaust conduits
 * - L-shaped top engine roll-cage handle extending from engine block
 * - Bundled mechanical tendon cables forming the neck
 * - Extended forehead chainsaw blade with hooked teeth and blood streaks
 * - Crisp cream Public Safety shirt, black silk tie, brown belt, dark trousers
 */
export function drawDenjiChainsawHybridBody(ctx, r, now, hideChainsaw = false, opts = {}) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const steps = Math.ceil((r + P) / P);

  // ── 0. L-Shaped Top Engine Roll-Cage Handle (Rule 19.1) ──
  _drawDenjiTopPullHandle(ctx, r);

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

      // ── Outer Dark Manga Ink Shell ──
      const isInkOutline = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );
      if (isInkOutline) {
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ══════════════════════════════════════════
      // ZONE 1: CHAINSAW DEVIL HEAD & FACE (normY <= +0.32, gy <= 6)
      // ══════════════════════════════════════════
      if (gy <= 6) {
        // ── A. REAR ENGINE BLOCK & STARTER AXLE (gx <= -5, gy <= 3) ──
        const isRearEngine = (gx <= -5 && gy <= 3);
        if (isRearEngine) {
          // Circular Starter Axle Hub at gx = -9..-7, gy = -6..-4
          const hubDist = Math.hypot(gx - (-8), gy - (-5));
          if (hubDist <= 1.5) {
            ctx.fillStyle = (hubDist < 0.8) ? '#090D16' : '#94A3B8'; // Starter hub pin & chrome rim
          } else if (gx <= -10) {
            ctx.fillStyle = '#090D16'; // Rear casing boundary
          } else if (gy <= -9) {
            ctx.fillStyle = '#334155'; // Upper engine bracket
          } else {
            ctx.fillStyle = '#1E293B'; // Dark gunmetal engine block
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // ── B. INTERLOCKING SHARK-TEETH OPEN MOUTH (gy = -2..3, gx = -4..7) ──
        const isTeethMouth = (gy >= -2 && gy <= 3 && gx >= -4 && gx <= 7);
        if (isTeethMouth) {
          // Sharp enamel fangs pointing down from upper jaw (even gx) and up from lower jaw (odd gx)
          const isUpperTooth = (gy <= 0 && ((gx % 2 === 0) || gy === -2));
          const isLowerTooth = (gy >= 1 && ((Math.abs(gx) % 2 === 1) || gy === 3));

          if (gx === 7 && gy === -2) {
            ctx.fillStyle = '#FF5722'; // Upper orange visor overhang tip
          } else if (gx === -4 && gy === 3) {
            ctx.fillStyle = '#D84315'; // Lower jaw hinge anchor
          } else if (isUpperTooth || isLowerTooth) {
            ctx.fillStyle = (gy === 0 || gy === 1) ? '#FFFFFF' : '#E2E8F0'; // Sharp white enamel fangs
          } else {
            ctx.fillStyle = '#090D16'; // Hollow black open mouth cavity
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // ── C. ORANGE LOWER JAW & SHARP CHIN PLATE (gx: -4..6, gy: 4..6) ──
        const isLowerOrangeJaw = (
          (gx >= -4 && gx <= 5 && gy === 4) ||
          (gx >= -2 && gx <= 5 && gy === 5) ||
          (gx >= 3 && gx <= 6 && gy === 6)
        );

        // ── D. EXPOSED BUNDLED TENDON NECK CABLES (gx: -8..2, gy: 4..6) ──
        const isNeckCables = (gx >= -8 && gx <= 2 && gy >= 4 && gy <= 6 && !isLowerOrangeJaw);

        if (isLowerOrangeJaw) {
          if (gx === 6 && gy === 6) {
            ctx.fillStyle = '#090D16'; // Sharp chin tip point
          } else if (gy === 4) {
            ctx.fillStyle = '#FF4500'; // Orange chin plate top rim
          } else if (gy === 5) {
            ctx.fillStyle = '#FF5722'; // Vibrant orange chin plate
          } else {
            ctx.fillStyle = '#D84315'; // Orange chin plate underside shade
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        if (isNeckCables) {
          // Ribbed vertical mechanical cable strands linking lower jaw/engine to collar
          if (gx === -4 || gx === 0) {
            ctx.fillStyle = '#E2E8F0'; // Light tendon cable sheen
          } else if (gx === -6 || gx === -2) {
            ctx.fillStyle = '#94A3B8'; // Mid gray cable
          } else {
            ctx.fillStyle = '#334155'; // Dark tendon strand shadow
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // ── E. 3 CONCENTRIC BLACK ACOUSTIC/VENT ARCS ON ORANGE CHEEK (1:1 with Reference) ──
        // Concentric circular arcs centered at (cx = -4, cy = -4) radiating forward
        const ventDist = Math.hypot(gx - (-4), gy - (-4));
        const isVentArc1 = (ventDist >= 1.8 && ventDist <= 2.6 && gx >= -3 && gy <= -2);
        const isVentArc2 = (ventDist >= 3.6 && ventDist <= 4.4 && gx >= -2 && gy <= -1);
        const isVentArc3 = (ventDist >= 5.4 && ventDist <= 6.2 && gx >= -1 && gy <= -1);

        if (isVentArc1 || isVentArc2 || isVentArc3) {
          if (opts && opts.lungeGlowAlpha && opts.lungeGlowAlpha > 0) {
            const gAlpha = opts.lungeGlowAlpha;
            if (gAlpha >= 0.8) {
              ctx.fillStyle = (ventDist > 3.0 && ventDist < 4.8) ? '#FEF08A' : '#FACC15';
            } else if (gAlpha >= 0.4) {
              ctx.fillStyle = '#EAB308';
            } else {
              ctx.fillStyle = '#92400E';
            }
          } else {
            ctx.fillStyle = '#090D16'; // Deep black acoustic vent arcs
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // ── F. FIERY ORANGE HELMET COWLS (Top of Head) ──
        if (gy <= -10 && gx >= -2) {
          ctx.fillStyle = '#FFA07A'; // Top curved ridge specular sheen
        } else if (gy <= -4) {
          ctx.fillStyle = '#FF4500'; // Vibrant Chainsaw Man orange base
        } else if (gx >= 6) {
          ctx.fillStyle = '#FF5722'; // Forward brow overhang
        } else {
          ctx.fillStyle = '#D84315'; // Orange lower cheek shade
        }
        ctx.fillRect(px, py, P, P);

        // Splatters of fresh blood on the helmet
        if ((gx === -2 && gy === -7) || (gx === 4 && gy === -5) || (gx === 0 && gy === -3)) {
          ctx.fillStyle = '#991B1B';
          ctx.fillRect(px, py, P, P);
        }
        continue;
      }

      // ══════════════════════════════════════════
      // ZONE 2: PUBLIC SAFETY WHITE SHIRT & BLACK TIE (gy >= 7, normY <= 0.68)
      // ══════════════════════════════════════════
      if (normY < 0.68) {
        // Pointed collar lapels
        const isCollarWing = (Math.abs(gx) >= 2 && Math.abs(gx) <= 5 && gy >= 7 && gy <= 9);
        const isTie = (Math.abs(gx) <= 1 && gy >= 7);

        if (isTie) {
          // Solid Black Silk Necktie
          ctx.fillStyle = (gx === 0 && gy <= 9) ? '#1E293B' : '#090D16';
          ctx.fillRect(px, py, P, P);
        } else if (isCollarWing) {
          ctx.fillStyle = '#FAF7F0'; // Crisp white pointed collar
          ctx.fillRect(px, py, P, P);
        } else {
          // White button-up shirt with fabric folds & blood splatters
          if ((gx === -4 && gy === 9) || (gx === 3 && gy === 10)) {
            ctx.fillStyle = '#DC2626'; // Fresh crimson blood splatter
          } else if (normX < -0.2) {
            ctx.fillStyle = '#E2E8F0'; // Left fold shadow
          } else if (normX > 0.2) {
            ctx.fillStyle = '#CBD5E1'; // Right fold shadow
          } else {
            ctx.fillStyle = '#FAF7F0'; // Front crisp white shirt
          }
          ctx.fillRect(px, py, P, P);
        }
        continue;
      }

      // ══════════════════════════════════════════
      // ZONE 3: BROWN LEATHER BELT & METALLIC BUCKLE (normY: 0.68 to 0.74)
      // ══════════════════════════════════════════
      if (normY < 0.74) {
        if (Math.abs(gx) <= 1) {
          ctx.fillStyle = '#E2E8F0'; // Metallic silver chrome buckle (Reference Image 2)
        } else {
          ctx.fillStyle = '#6B2D0C'; // Brown leather belt (Reference Image 2)
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ══════════════════════════════════════════
      // ZONE 4: DARK MATTE TROUSERS (normY >= 0.74)
      // ══════════════════════════════════════════
      if (gx === 0) {
        ctx.fillStyle = '#090D16'; // Center fly seam
      } else {
        ctx.fillStyle = '#18181B'; // Dark tailored trousers
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  // ── Central Forehead Chainsaw Blade (Protruding Forward along Top Crest) ──
  if (!hideChainsaw && !(typeof state !== 'undefined' && state.showSkinOnly)) {
    _drawDenjiForeheadChainsaw(ctx, r, now);
  }

  ctx.restore();
}

/**
 * Draws the L-shaped mechanical engine roll-cage handle extending from rear engine block (Matching Reference Image)
 */
function _drawDenjiTopPullHandle(ctx, r) {
  const handlePixels = [
    // Vertical riser from engine block
    { gx: -7, gy: -13, col: '#090D16' },
    { gx: -7, gy: -14, col: '#334155' },
    { gx: -7, gy: -15, col: '#334155' },
    { gx: -7, gy: -16, col: '#090D16' },
    // Horizontal top grip bar extending forward
    { gx: -6, gy: -16, col: '#475569' },
    { gx: -5, gy: -16, col: '#94A3B8' }, // Specular glint
    { gx: -4, gy: -16, col: '#CBD5E1' }, // Specular glint
    { gx: -3, gy: -16, col: '#475569' },
    { gx: -2, gy: -15, col: '#090D16' }, // Forward anchor bend
  ];

  ctx.fillStyle = '#090D16';
  for (let p of handlePixels) {
    const px = snap(p.gx * P);
    const py = snap(p.gy * P);
    ctx.fillRect(px - P, py, P, P);
    ctx.fillRect(px + P, py, P, P);
    ctx.fillRect(px, py - P, P, P);
    ctx.fillRect(px, py + P, P, P);
  }
  for (let p of handlePixels) {
    ctx.fillStyle = p.col;
    ctx.fillRect(snap(p.gx * P), snap(p.gy * P), P, P);
  }
}

/**
 * Draws the iconic high-detail central forehead chainsaw blade protruding forward along the top crest
 * Authentic Chainsaw Man anime & manga edition (1:1 Match with Reference Picture 1 & 2):
 * - Solid pale steel silver guide bar with rounded nose tip (no external base sprocket)
 * - Sharp triangular raked cutter teeth moving dynamically around the guide rail
 * - Visceral arterial blood splatters, diagonal smears, and nose tip gore cap
 */
function _drawDenjiForeheadChainsaw(ctx, r, now, opts = {}) {
  const bladeLen = Math.round(r * 3.1); // 78px (proportional reach matching anime screenshot)
  const bladeThick = Math.round((bladeLen * 369) / 1594); // ~18px
  const startX = r * 0.30; // Anchored flush into brow visor
  const startY = -r * 0.35; // Forehead level

  ctx.save();
  ctx.translate(startX, startY);
  ctx.rotate(-0.18); // Tilted slightly upward

  drawAuthenticChainsawBlade(ctx, bladeLen, bladeThick, now, opts);

  ctx.restore();
}

/**
 * Draws Denji's Left Arm / Left Forearm Chainsaw (Rule 20 Canonical Symmetrical Standard)
 * Rendered on the Front Layer at (-r * 0.82, +r * 0.38)
 * In idle/neutral, this off-hand chainsaw slants forward-downward at a 42° angle (0.73 rad)
 * with dynamic swinging animation.
 */
function _drawDenjiLeftArm(ctx, fighter, r, isHybrid, isPunching, isLunge, isPodiumPreview, now, opts = {}) {
  const handRadius = getHandSize(r * 0.30);
  let armX = -r * 0.82;
  let armY = r * 0.38;
  let sawAngle = 0.73; // ~42° forward-downward slant matching diagram

  const isSuppressed = !isPodiumPreview && Boolean(
    fighter.isTargetOfAmbush || 
    (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
  );

  // Dynamic arm swinging animation (idle breathing & stride sway)
  if (!isSuppressed) {
    const moveSpeed = Math.hypot(fighter.vx || 0, fighter.vy || 0);
    const speedFactor = Math.min(2.0, 1.0 + moveSpeed * 0.12);
    const swingPhase = (now * 0.0055) * speedFactor;
    
    const swingAmpX = r * 0.08; // ~2.0px horizontal sway
    const swingAmpY = r * 0.05; // ~1.25px vertical sway
    const swingAngleAmp = 0.08; // ~4.6° angular oscillation

    armX += Math.sin(swingPhase) * swingAmpX;
    armY += Math.cos(swingPhase) * swingAmpY;
    sawAngle += Math.sin(swingPhase) * swingAngleAmp;
  }

  // High-frequency chainsaw motor vibration during active shredding / sawing
  if (opts.isSawing || opts.isMassacre) {
    armX += (Math.sin(now * 0.08) - 0.5) * 1.5;
    armY += (Math.cos(now * 0.08) - 0.5) * 1.5;
    sawAngle += (Math.sin(now * 0.12) - 0.5) * 0.04;
  }

  if (isPunching) {
    const ext = Math.sin((fighter.punchAnimTimer / (fighter.punchMaxTime || 14)) * Math.PI) * (r * 0.6);
    armX += ext;
  } else if (isLunge) {
    armX += r * 0.5;
    sawAngle = 0.0; // Point directly forward toward the enemy alongside the right arm
  }

  if (isHybrid) {
    _drawPixelForearmChainsaw(ctx, armX, armY, sawAngle, handRadius, now, false, opts, r);
  } else {
    drawPixelHand(ctx, armX, armY, handRadius, '#FFE0BD', '#18181B');
  }
}

/**
 * Draws Denji's Right Arm / Right Forearm Chainsaw (Rule 20 Canonical Symmetrical Standard)
 * Rendered on the Front Layer at (+r * 0.82, +r * 0.38)
 * In idle/neutral, this lead chainsaw points straight forward towards the enemy (0.0 rad)
 * with dynamic swinging animation in complementary counter-phase.
 */
function _drawDenjiRightArm(ctx, fighter, r, isHybrid, isPunching, isLunge, isPodiumPreview, now, opts = {}) {
  const handRadius = getHandSize(r * 0.30);
  let armX = r * 0.82;
  let armY = r * 0.38;
  let sawAngle = 0.0; // Pointing forward towards the enemy (0.0 rad)

  const isSuppressed = !isPodiumPreview && Boolean(
    fighter.isTargetOfAmbush || 
    (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
  );

  // Dynamic arm swinging animation (counter-phase for natural alternating swing)
  if (!isSuppressed) {
    const moveSpeed = Math.hypot(fighter.vx || 0, fighter.vy || 0);
    const speedFactor = Math.min(2.0, 1.0 + moveSpeed * 0.12);
    const swingPhase = (now * 0.0055) * speedFactor + Math.PI; // Counter-phase (+180°)
    
    const swingAmpX = r * 0.08; // ~2.0px horizontal sway
    const swingAmpY = r * 0.05; // ~1.25px vertical sway
    const swingAngleAmp = 0.08; // ~4.6° angular oscillation

    armX += Math.sin(swingPhase) * swingAmpX;
    armY += Math.cos(swingPhase) * swingAmpY;
    sawAngle += Math.sin(swingPhase) * swingAngleAmp;
  }

  // High-frequency chainsaw motor vibration during active shredding / sawing
  if (opts.isSawing || opts.isMassacre) {
    armX += (Math.sin(now * 0.08 + 1) - 0.5) * 1.5;
    armY += (Math.cos(now * 0.08 + 1) - 0.5) * 1.5;
    sawAngle += (Math.sin(now * 0.12 + 1) - 0.5) * 0.04;
  }

  if (isPunching) {
    const ext = Math.sin((fighter.punchAnimTimer / (fighter.punchMaxTime || 14)) * Math.PI) * (r * 0.8);
    armX += ext;
  } else if (isLunge) {
    armX += r * 0.5;
    sawAngle = 0.0;
  }

  if (isHybrid) {
    _drawPixelForearmChainsaw(ctx, armX, armY, sawAngle, handRadius, now, true, opts, r);
  } else {
    drawPixelHand(ctx, armX, armY, handRadius, '#FFE0BD', '#18181B');
  }
}

/**
 * Draws a forearm-mounted chainsaw blade bursting from Denji's arm in 2D Pixel Art
 * Adheres strictly to Rule 20 (drawPixelHand front-layer rendering over weapon base)
 * Scaled to the exact same size as the head chainsaw (bladeLen: Math.round(r * 3.1))
 */
function _drawPixelForearmChainsaw(ctx, cx, cy, angle, handRadius, now, isFront, opts = {}, r = 25) {
  const sawLen = Math.round(r * 3.1); // Same scale size as head chainsaw (~78px)
  const sawThick = Math.round((sawLen * 369) / 1594); // Same scale thickness (~18px)

  // 1. Draw chainsaw blade emerging from wrist/forearm
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Compact sleeve cuff & flesh emergence ring at blade root
  ctx.fillStyle = '#090D16';
  ctx.fillRect(-3, -sawThick / 2 - 1, 4, sawThick + 2);
  ctx.fillStyle = '#FAF7F0';
  ctx.fillRect(-2, -sawThick / 2, 2, sawThick);
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(0, -1, 3, 2);

  // Chainsaw Blade extending along +X
  drawAuthenticChainsawBlade(ctx, sawLen, sawThick, now, opts);
  ctx.restore();

  // 2. LAYER 2: Rule 20 Circular Pixel Hand overlapping front layer over blade anchor
  drawPixelHand(ctx, cx, cy, handRadius, '#FFE0BD', '#090D16');
}

/**
 * Renders Denji's Chainsaw Devil Ghost Model afterimages at recorded absolute world coordinates.
 * Each ghost model renders Denji's full Chainsaw Devil body circle along with all 3 chainsaws
 * (forehead saw + left & right arm chainsaws) fading smoothly in his wake.
 */
export function drawDenjiAfterImages(ctx, fighter) {
  const isSuppressed = Boolean(
    fighter && (
      fighter.isTargetOfAmbush || 
      (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
    )
  );
  if (!fighter || !fighter.afterImages || fighter.afterImages.length === 0 || isSuppressed) return;
  const r = fighter.r || 25;
  const now = Date.now();

  ctx.save();
  for (let i = 0; i < fighter.afterImages.length; i++) {
    const ai = fighter.afterImages[i];
    if (!ai || ai.timer <= 0) continue;
    const progress = ai.timer / (ai.maxTimer || 16);
    const alpha = progress * 0.45;
    const angle = ai.gunAngle !== undefined ? ai.gunAngle : (ai.angle || 0);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(ai.x, ai.y);
    ctx.rotate(angle);

    const facingLeft = Math.abs(angle) > Math.PI / 2;
    if (facingLeft) ctx.scale(1, -1);

    const ghostOpts = {
      isAttacking: false,
      isLunging: true,
      isSawing: false,
      shredBladeCount: 1,
      isMassacre: false,
      isGhost: true
    };

    // 1. Ghost Body Model (Chainsaw Devil)
    const devilImg = _getDenjiDevilSkinImage();
    if (devilImg && devilImg.complete && devilImg.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const drawW = r * (1150 / 368);
      const drawH = r * (1150 / 368);
      const shiftX = r * (600 / 368);
      const shiftY = r * (620 / 368);
      ctx.drawImage(devilImg, -shiftX, -shiftY, drawW, drawH);
      ctx.restore();

      // Ghost Golden Vent Glow
      _drawDenjiHelmetVentGlow(ctx, r, 1.0, now);

      // Ghost Forehead Chainsaw Blade
      _drawDenjiForeheadChainsaw(ctx, r, now, ghostOpts);
    } else {
      drawDenjiChainsawHybridBody(ctx, r, now, false, ghostOpts);
      _drawDenjiHelmetVentGlow(ctx, r, 1.0, now);
    }

    // 2. Ghost Hands & Left / Right Forearm Chainsaws
    const handRadius = getHandSize(r * 0.30);
    // Left Arm Chainsaw (pointing forward at 0.0 rad)
    _drawPixelForearmChainsaw(ctx, -r * 0.82 + r * 0.5, r * 0.38, 0.0, handRadius, now, false, ghostOpts, r);
    // Right Arm Chainsaw (pointing forward at 0.0 rad)
    _drawPixelForearmChainsaw(ctx, r * 0.82 + r * 0.5, r * 0.38, 0.0, handRadius, now, true, ghostOpts, r);

    // 3. Amber Energy Aura Ring
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(234, 179, 8, ${alpha * 0.8})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
  ctx.restore();
}
