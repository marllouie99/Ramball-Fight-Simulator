// ─────────────────────────────────────────────
// Reze (The Bomb Devil Hybrid) Fighter Skin & Body Model
// Authentic Chainsaw Man Anime & Manga Edition (1:1 Reference Pixel Art)
// Adheres strictly to:
// - Rule 19 (Upright Front POV Camera Orientation, Zero Eyes/Mouth/Nose)
// - Rule 19.1 (Proportional Vertical Bands & Discrete Lock Hair Arrays)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { _getRezeWeaponImage, _drawDiscretePixelChefKnife } from '../weapons/rezeWeaponGraphics.js';

const P = 2.0;
function snap(v) {
  return Math.round(v / P) * P;
}

let _rezeSkinImage = null;
let _rezeSkinImageLoading = false;

export function _getRezeSkinImage() {
  if (_rezeSkinImage && _rezeSkinImage.complete && _rezeSkinImage.naturalWidth > 0) {
    return _rezeSkinImage;
  }
  if (!_rezeSkinImageLoading && typeof Image !== 'undefined') {
    _rezeSkinImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _rezeSkinImage = img;
      _rezeSkinImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Reze pixel skin image at Assets/model/REZE-MODEL-SKIN.png', e);
      _rezeSkinImageLoading = false;
    };
    img.src = 'Assets/model/REZE-MODEL-SKIN.png?v=1';
    _rezeSkinImage = img;
  }
  return _rezeSkinImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getRezeSkinImage();
}

function _getMartialLungeCurve(p) {
  if (p <= 0) return 0;
  if (p >= 1) return 0;
  if (p < 0.25) {
    return Math.sin((p / 0.25) * (Math.PI * 0.5));
  } else if (p < 0.60) {
    return 1.0;
  } else {
    return Math.cos(((p - 0.60) / 0.40) * (Math.PI * 0.5));
  }
}

/**
 * Main Skin Renderer for Reze (Human Form & Bomb Devil Hybrid Form)
 */
export function drawRezeSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const now = Date.now();

  const isSuppressed = !isPodiumPreview && Boolean(
    fighter.isTargetOfAmbush || 
    (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
  );

  const isHybrid = Boolean((fighter.isHybridModeActive || (fighter.isExecutingNuke && !fighter.isPullingPin)) && !fighter.isPullingPin);

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 2. Punch & Lunge & Dive Bomb States
  const isPunching = !isPodiumPreview && !isSuppressed && (fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
  const isLunge = !isPodiumPreview && !isSuppressed && Boolean(fighter.isRocketLunging);
  const isDiveBomb = !isPodiumPreview && !isSuppressed && Boolean(fighter.isDiveBombing);
  const punchPhase = isPunching ? Math.min(1.0, 1.0 - (fighter.punchAnimTimer / (fighter.punchMaxTime || 14))) : 0;
  const punchCycle = fighter.punchComboCount || 0;

  // 3. LAYER 1: BACK HAND (Behind Body Circle Layer)
  // Hidden during podium preview & model inspection to show clean character details (Rule 20)
  // In Devil Form (isHybrid), back hand is displayed in ready combat guard stance
  const showBackHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideBackHand && (isHybrid || isPunching || isLunge || isDiveBomb || fighter.isPullingPin);
  if (showBackHand) {
    _drawRezeBackHand(ctx, fighter, r, isHybrid, isPunching, punchPhase, punchCycle, isLunge, isDiveBomb, now);
  }

  // 4. LAYER 2: MAIN BODY CIRCLE (Middle Layer)
  if (isHybrid) {
    drawRezeBombHybridBody(ctx, r, now);
  } else {
    const rezeImg = _getRezeSkinImage();
    if (rezeImg && rezeImg.complete && rezeImg.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const drawW = r * (1016 / 437);
      const drawH = r * (984 / 437);
      const shiftX = r * (480 / 437);
      const shiftY = r * (500 / 437);
      ctx.drawImage(rezeImg, -shiftX, -shiftY, drawW, drawH);
      ctx.restore();
    } else {
      drawRezeHumanPixelBody(ctx, r, now);
    }
  }

  // 5. LAYER 3: FRONT HAND (Front Layer — On Top of Body)
  // In Human Form (!isHybrid), Reze visibly holds her tactical combat knife in front guard stance
  // In Devil Form (isHybrid), Reze visibly displays her front martial arts guard hand
  const showFrontHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideFrontHand;
  if (showFrontHand) {
    _drawRezeFrontHand(ctx, fighter, r, isHybrid, isPunching, punchPhase, punchCycle, isLunge, isDiveBomb, now);
  }

  ctx.restore();
}

/**
 * Discrete Pixel-Art Hairline Grid for Reze's Authentic Manga Bob (1:1 with Reference Image 3)
 * gx ranges from -13 to +13 (index = gx + 13, 27 columns total)
 * Features:
 * - Left outer bob / cheek lock (gx = -13..-9: gy reaches 1)
 * - Left notch (gx = -6..-4: skin exposed up to gy = -4)
 * - Center-Left long sweeping bang (gx = 0..3: sweeps down to gy = 2 with glint)
 * - Right notch (gx = 4..6: skin exposed up to gy = -4)
 * - Right cheek framing lock (gx = 9..13: gy reaches 1)
 */
const REZE_HAIRLINE_GY = [
   2,  2,  1,  1,  0, -2, -4, -4, -3, -1,  0,  1,  2,  2,  1, -1, -4, -4, -3, -1,  0,  1,  1,  2,  2,  2,  2
];

/**
 * Draws Reze's Human Body Circle in Authentic Pixel Art (Matching Reference Images 2 & 3)
 */
export function drawRezeHumanPixelBody(ctx, r, now) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
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

      // 1. Pixelated Dark Ink Border Shell
      if (Math.hypot(rx + P, ry) > r || Math.hypot(rx - P, ry) > r || Math.hypot(rx, ry + P) > r || Math.hypot(rx, ry - P) > r) {
        ctx.fillStyle = '#14101A';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      const colIdx = Math.max(0, Math.min(26, gx + 13));
      const hairLimitGy = REZE_HAIRLINE_GY[colIdx];
      const isHair = (gy < hairLimitGy);

      // ──────────────────────────────────────────
      // 2. SOFT DARK PURPLE-AUBURN HAIR (gy < hairLimitGy)
      // ──────────────────────────────────────────
      if (isHair) {
        let col = '#36283B'; // Soft dark auburn/plum base (Reference Image 3)

        const isCenterLongBang = (gx >= 0 && gx <= 2 && gy >= -2 && gy <= 2);
        const isCreaseLine = (
          (gx === -6 && gy >= -7 && gy <= -4) ||
          (gx === -1 && gy >= -8 && gy <= 0) ||
          (gx === 3  && gy >= -7 && gy <= 1) ||
          (gx === 7  && gy >= -7 && gy <= -3)
        );

        if (isCreaseLine) {
          col = '#1C1322'; // Deep manga crease shadow
        } else if (isCenterLongBang) {
          if (gx === 1 && gy >= 0) {
            col = '#5A4663'; // Soft violet-plum specular glint on center lock
          } else {
            col = '#3F2F45';
          }
        } else if (gy < -9) {
          col = '#4F3D56'; // Dome top hair highlight
        } else if (gy === -8 && Math.abs(gx) <= 6) {
          col = '#5E4968'; // Crown specular sheen
        } else if (gy === hairLimitGy - 1) {
          col = '#241929'; // Bang shadow edge
        } else if (Math.abs(gx) >= 10) {
          col = '#2A1E30'; // Outer flank depth shadow
        }

        ctx.fillStyle = col;
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // 3. FAIR PORCELAIN FACE SKIN (hairLimitGy <= gy < r * 0.14 / P)
      // ──────────────────────────────────────────
      if (ry < r * 0.14) {
        let col = '#FFE6D8'; // Warm porcelain skin

        if (gy === hairLimitGy) {
          col = '#F2CAB4'; // Soft drop shadow under bangs
        } else if (Math.abs(gx) >= 8) {
          col = '#F5D0BC'; // Cheek perimeter shading
        }

        ctx.fillStyle = col;
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // 4. ATTIRE & NECK CHOKER (ry >= r * 0.14)
      // ──────────────────────────────────────────

      // A. High Neck & Deep Navy Choker Collar (ry = r * 0.14 to r * 0.24)
      const isChokerBand = (ry >= r * 0.14 && ry <= r * 0.22 && Math.abs(rx) <= r * 0.40);
      const isNeckSkin = (ry >= r * 0.14 && ry <= r * 0.26 && Math.abs(rx) <= r * 0.50);

      // Metallic Grenade Pin Pull-Ring on left throat (rx: -r*0.34 to -r*0.18, ry: r*0.12 to r*0.24)
      const pinDist = Math.hypot(rx - (-r * 0.26), ry - (r * 0.17));
      const isPinRing = (pinDist <= r * 0.11 && pinDist >= r * 0.05);
      const isPinHole = (pinDist < r * 0.05);

      if (isPinHole) {
        // Exposed skin inside the pull ring hole
        ctx.fillStyle = '#ECC2AB';
        ctx.fillRect(px, py, P, P);
        continue;
      } else if (isPinRing) {
        // Silver Metallic Pull Ring with specular glint
        if (rx < -r * 0.26 && ry < r * 0.17) {
          ctx.fillStyle = '#FFFFFF'; // Shiny silver glint
        } else {
          ctx.fillStyle = '#C8D2E2'; // Metallic steel ring
        }
        ctx.fillRect(px, py, P, P);
        continue;
      } else if (isChokerBand) {
        // Deep Navy Choker Strap
        if (ry <= r * 0.16) {
          ctx.fillStyle = '#34456C'; // Choker top highlight
        } else {
          ctx.fillStyle = '#1F2942'; // Dark navy body
        }
        ctx.fillRect(px, py, P, P);
        continue;
      } else if (isNeckSkin && ry < r * 0.24) {
        ctx.fillStyle = '#FFE6D8';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // B. Pointed Shirt Collar Wings (Triangular lapels folding down over chest)
      // Left wing: rx from -r*0.40 to -r*0.06, ry from r*0.22 to r*0.42
      const isCollarWingLeft = (
        rx >= -r * 0.40 && rx <= -r * 0.06 &&
        ry >= r * 0.22 && ry <= r * 0.42 &&
        (rx - (-r * 0.40)) * 0.75 >= (ry - r * 0.22)
      );
      // Right wing: rx from +r*0.06 to +r*0.40, ry from r*0.22 to r*0.42
      const isCollarWingRight = (
        rx >= r * 0.06 && rx <= r * 0.40 &&
        ry >= r * 0.22 && ry <= r * 0.42 &&
        (r * 0.40 - rx) * 0.75 >= (ry - r * 0.22)
      );

      // C. Exposed Throat V-Opening
      const isThroatV = (
        ry >= r * 0.22 && ry <= r * 0.32 &&
        Math.abs(rx) <= (1 - (ry - r * 0.22) / (r * 0.10)) * (r * 0.10)
      );

      // D. Dark Navy Silk Ribbon / Bow Tie (Reference Image 2)
      // Bow knot center
      const isBowKnot = (ry >= r * 0.32 && ry <= r * 0.40 && Math.abs(rx) <= r * 0.08);
      // Bow loops
      const isBowLoopLeft = (rx >= -r * 0.24 && rx <= -r * 0.06 && ry >= r * 0.30 && ry <= r * 0.38);
      const isBowLoopRight = (rx >= r * 0.06 && rx <= r * 0.24 && ry >= r * 0.30 && ry <= r * 0.38);
      // 4 Cascading Vertical Ribbon Tails
      const isRibbonTails = (
        ry >= r * 0.38 && ry <= r * 0.72 &&
        (
          (rx >= -r * 0.16 && rx <= -r * 0.10 && ry <= r * 0.65) || // Left outer
          (rx >= -r * 0.08 && rx <= -r * 0.02 && ry <= r * 0.72) || // Left inner
          (rx >= r * 0.02  && rx <= r * 0.08  && ry <= r * 0.72) || // Right inner
          (rx >= r * 0.10  && rx <= r * 0.16  && ry <= r * 0.65)    // Right outer
        )
      );

      // E. High-Waisted Dark Slate-Indigo Shorts
      const isShorts = (ry >= r * 0.72);

      // ── COLOR RASTERIZATION ──
      if (isBowKnot || isBowLoopLeft || isBowLoopRight || isRibbonTails) {
        // Dark Navy Silk Ribbon Pixels
        if (isBowKnot && Math.abs(rx) <= P * 0.6) {
          ctx.fillStyle = '#3A4C74'; // Center knot silk highlight
        } else if ((isBowLoopLeft && rx < -r * 0.16) || (isBowLoopRight && rx > r * 0.16)) {
          ctx.fillStyle = '#324268'; // Loop sheen
        } else if (isRibbonTails && (Math.abs(rx) === Math.round(r * 0.05 / P) * P)) {
          ctx.fillStyle = '#2C3A5C'; // Vertical ribbon specular edge
        } else {
          ctx.fillStyle = '#1A2134'; // Solid dark navy silk
        }
        ctx.fillRect(px, py, P, P);
      } else if (isCollarWingLeft || isCollarWingRight) {
        // Crisp White Pointed Collar Lapels
        if (ry < r * 0.28) {
          ctx.fillStyle = '#FFFFFF'; // Bright crisp upper collar
        } else if (ry > r * 0.38 || Math.abs(rx) > r * 0.32) {
          ctx.fillStyle = '#D6D1C4'; // Collar lapel tip & edge shadow
        } else {
          ctx.fillStyle = '#FAF9F5'; // Crisp ivory fabric
        }
        ctx.fillRect(px, py, P, P);
      } else if (isThroatV) {
        // Exposed Throat Skin in V-Neck Cutout
        ctx.fillStyle = (ry > r * 0.28) ? '#ECC0A8' : '#FFE6D8';
        ctx.fillRect(px, py, P, P);
      } else if (isShorts) {
        // High-Waisted Dark Slate-Indigo Shorts
        if (ry <= r * 0.75) {
          ctx.fillStyle = '#434764'; // Waistband top highlight line
        } else if (Math.abs(rx) <= P * 0.6) {
          ctx.fillStyle = '#161724'; // Center fly seam
        } else if (Math.abs(Math.abs(rx) - r * 0.40) <= P * 0.6) {
          ctx.fillStyle = '#1A1C28'; // Belt loops
        } else {
          ctx.fillStyle = '#2C2E42'; // Dark slate-indigo shorts base
        }
        ctx.fillRect(px, py, P, P);
      } else {
        // White Sleeveless Blouse Fabric (ry = r * 0.24 to r * 0.72)
        if (Math.abs(rx) > r * 0.65) {
          ctx.fillStyle = '#DDD8CB'; // Armhole fold shading
        } else if (Math.abs(rx) <= r * 0.08 && ry > r * 0.42) {
          ctx.fillStyle = '#FAF9F5'; // Center placket
        } else {
          ctx.fillStyle = '#F5F3ED'; // Crisp white body
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  ctx.restore();
}

/**
 * Draws Reze's Bomb Devil Hybrid Form (Authentic Chainsaw Man Bomb Girl / Bomb Devil Figure)
 * 1:1 Match with the official Chainsaw Man reference figure:
 * - Forward facing (+X): Aerodynamic dark gunmetal torpedo warhead with rounded nose cone jutting forward (+X)
 * - Menacing mechanical jaw with prominent square white teeth clamped in an eerie grimace (+X)
 * - Sharp angular chin guard plate and mechanical jaw hinge rivet
 * - Rear facing (-X): 4 flared rear stabilizer fins and tapered tail cone breaking the top-left silhouette (-X)
 * - Tall segmented metallic armored neck with 3 stacked plates
 * - Bare porcelain skin shoulders on both flanks
 * - Crisp white collared shirt with pointed lapels and dark silk ribbon bow tie cascading down
 * - Halter corset/apron densely woven from twisted black fuse-cord ropes with curling wick tendrils
 * - Waist bandolier of dark charcoal cylindrical bomb cartridges (tactical artillery shells, no cartoon red)
 * - Dark slate-charcoal lower shorts
 */
export function drawRezeBombHybridBody(ctx, r, now) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  // ──────────────────────────────────────────
  // 1. REAR TORPEDO STABILIZER FINS & TAIL CONE (Top-Left / Rear Silhouette Breaker)
  // Drawn outside circle bounds on the REAR (-X) side to break the silhouette
  // ──────────────────────────────────────────
  ctx.save();

  const drawPixel = (gx, gy, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(snap(gx * P), snap(gy * P), P, P);
  };

  // ── Tail Cylinder Cone (linking bomb body to fins: gx = -12..-6, gy = -12..-6) ──
  for (let gy = -12; gy <= -6; gy++) {
    for (let gx = -12; gx <= -6; gx++) {
      if (Math.hypot(gx * P, gy * P) > r * 0.95) {
        let col = '#222637';
        if (gy === -12 || gy === -6 || gx === -12) col = '#0E1017'; // Dark outer shell seam
        else if (gy === -11) col = '#505C7E'; // Upper specular cylinder sheen
        else if (gy === -10) col = '#32394E'; // Cylinder body
        else if (gy === -7) col = '#141620'; // Underside shadow
        drawPixel(gx, gy, col);
      }
    }
  }

  // ── Stabilizer Fin 1: Upper Vertical Blade (pointing up-left: gx = -13..-8, gy = -19..-12) ──
  const _UPPER_FIN = [
    { gx: -8,  gy: -12, col: '#0E1017' },
    { gx: -8,  gy: -13, col: '#0E1017' },
    { gx: -9,  gy: -13, col: '#4A5676' },
    { gx: -9,  gy: -14, col: '#6E7FA8' },
    { gx: -9,  gy: -15, col: '#0E1017' },
    { gx: -10, gy: -14, col: '#363E56' },
    { gx: -10, gy: -15, col: '#6E7FA8' },
    { gx: -10, gy: -16, col: '#8DA0CD' }, // Leading edge glint tip
    { gx: -10, gy: -17, col: '#0E1017' },
    { gx: -11, gy: -15, col: '#2E354A' },
    { gx: -11, gy: -16, col: '#4A5676' },
    { gx: -11, gy: -17, col: '#8DA0CD' },
    { gx: -11, gy: -18, col: '#0E1017' },
    { gx: -12, gy: -15, col: '#1E2230' },
    { gx: -12, gy: -16, col: '#2E354A' },
    { gx: -12, gy: -17, col: '#1E2230' },
    { gx: -12, gy: -18, col: '#0E1017' },
    { gx: -13, gy: -16, col: '#0E1017' },
    { gx: -13, gy: -17, col: '#0E1017' },
  ];
  for (let pt of _UPPER_FIN) drawPixel(pt.gx, pt.gy, pt.col);

  // ── Stabilizer Fin 2: Rear Horizontal Blade (pointing back-left: gx = -17..-11, gy = -11..-8) ──
  const _REAR_FIN = [
    { gx: -12, gy: -11, col: '#0E1017' },
    { gx: -13, gy: -11, col: '#5E6D94' },
    { gx: -14, gy: -11, col: '#5E6D94' },
    { gx: -15, gy: -11, col: '#7889B6' },
    { gx: -16, gy: -11, col: '#8DA0CD' },
    { gx: -17, gy: -10, col: '#0E1017' },
    { gx: -16, gy: -10, col: '#32394E' },
    { gx: -15, gy: -10, col: '#2A3043' },
    { gx: -14, gy: -10, col: '#242939' },
    { gx: -13, gy: -10, col: '#242939' },
    { gx: -12, gy: -10, col: '#1A1D28' },
    { gx: -13, gy: -9,  col: '#1A1D28' },
    { gx: -14, gy: -9,  col: '#141620' },
    { gx: -15, gy: -9,  col: '#0E1017' },
    { gx: -12, gy: -9,  col: '#0E1017' },
  ];
  for (let pt of _REAR_FIN) drawPixel(pt.gx, pt.gy, pt.col);

  // ── Stabilizer Fin 3: Lower Diagonal Blade (pointing down-left: gx = -15..-9, gy = -7..-2) ──
  const _LOWER_FIN = [
    { gx: -10, gy: -7, col: '#0E1017' },
    { gx: -11, gy: -7, col: '#3E4762' },
    { gx: -12, gy: -6, col: '#4A5576' },
    { gx: -13, gy: -5, col: '#5E6D94' },
    { gx: -14, gy: -4, col: '#7283AF' },
    { gx: -15, gy: -3, col: '#0E1017' },
    { gx: -14, gy: -3, col: '#1E2230' },
    { gx: -13, gy: -4, col: '#1E2230' },
    { gx: -12, gy: -5, col: '#181A25' },
    { gx: -11, gy: -6, col: '#141620' },
    { gx: -10, gy: -6, col: '#0E1017' },
  ];
  for (let pt of _LOWER_FIN) drawPixel(pt.gx, pt.gy, pt.col);

  // ── Tail Fuse Cap at the rear center of tail cone ──
  drawPixel(-12, -9, '#4F5B7D');
  drawPixel(-13, -9, '#7283AF');
  drawPixel(-13, -8, '#262C3C');

  // ──────────────────────────────────────────
  // 2. LOOSE FUSE-CORD WICK TENDRILS (Curling from flanks)
  // Matching living detonator wicks in the reference figure
  // ──────────────────────────────────────────
  const _WICKS = [
    // Left Flank Wick
    { gx: -12, gy: 3, col: '#282D40' },
    { gx: -13, gy: 2, col: '#45506E' },
    { gx: -14, gy: 1, col: '#5E6C92' },
    { gx: -15, gy: 0, col: '#45506E' },
    { gx: -15, gy: -1, col: '#C2753A' }, // Burnt fuse ember tip
    // Right Flank Wick
    { gx: 12, gy: 4, col: '#282D40' },
    { gx: 13, gy: 3, col: '#45506E' },
    { gx: 14, gy: 2, col: '#5E6C92' },
    { gx: 15, gy: 1, col: '#45506E' },
    { gx: 15, gy: 0, col: '#C2753A' }, // Burnt fuse ember tip
  ];
  for (let pt of _WICKS) drawPixel(pt.gx, pt.gy, pt.col);

  ctx.restore();

  // ──────────────────────────────────────────
  // 3. MAIN BODY CIRCLE & TORPEDO WARHEAD CASING (Pixel Grid)
  // ──────────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);

      // Pixelated Dark Ink Border Shell
      if (Math.hypot(rx + P, ry) > r || Math.hypot(rx - P, ry) > r || Math.hypot(rx, ry + P) > r || Math.hypot(rx, ry - P) > r) {
        ctx.fillStyle = '#0B0C12';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ══════════════════════════════════════════
      // ZONE A: HEAD & TORPEDO WARHEAD CASING (gy <= 2)
      // ══════════════════════════════════════════
      if (gy <= 2) {
        // ── 1. SEGMENTED METALLIC NECK COLLAR (gy = 1..2, gx = -3..3) ──
        if (gy >= 1 && Math.abs(gx) <= 3) {
          if (gy === 1) {
            ctx.fillStyle = '#4A5576'; // Upper neck ring highlight
          } else {
            ctx.fillStyle = (Math.abs(gx) <= 1) ? '#2B3044' : '#181A25'; // Vertebra shadow
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // ── 2. MENACING MECHANICAL JAW & SQUARE WHITE TEETH (gx = -2..7, gy = -3..1 on +X forward face) ──
        const isMouthCavity = (gx >= -2 && gx <= 7 && gy >= -3 && gy <= 1);
        if (isMouthCavity) {
          // A. Mechanical Jaw Hinge Rivet at rear corner (gx = -2..-1, gy = 0..1)
          if (gx <= -1 && gy >= 0) {
            ctx.fillStyle = (gx === -1 && gy === 0) ? '#627196' : '#1E2230';
            ctx.fillRect(px, py, P, P);
            continue;
          }

          // B. Sharp Angular Chin Guard Plate (gy = 1, gx = 0..6)
          if (gy === 1 && gx >= 0) {
            if (gx === 6) ctx.fillStyle = '#0E1017'; // Sharp chin corner outline
            else if (gx >= 3 && gx <= 5) ctx.fillStyle = '#485474'; // Chin leading edge highlight
            else ctx.fillStyle = '#24293A'; // Chin plate body
            ctx.fillRect(px, py, P, P);
            continue;
          }

          // C. Two Rows of Menacing Square White Enamel Teeth (gy = -2..0, gx = 0..6)
          const isTeethZone = (gy >= -2 && gy <= 0 && gx >= 0 && gx <= 6);
          if (isTeethZone) {
            // Gap slits separating individual square teeth at gx = 1, 3, 5
            const isToothGap = (gx === 1 || gx === 3 || gx === 5);
            if (isToothGap) {
              ctx.fillStyle = '#08090E'; // Deep vertical slit between teeth
            } else if (gy === -2) {
              ctx.fillStyle = '#FFFFFF'; // Upper tooth crown highlight
            } else if (gy === -1) {
              ctx.fillStyle = '#E8F0FA'; // Solid clean square white tooth
            } else {
              ctx.fillStyle = '#A0AFC7'; // Lower tooth edge shadow
            }
            ctx.fillRect(px, py, P, P);
            continue;
          }

          // D. Dark Hollow Mouth Void interior behind teeth
          ctx.fillStyle = '#08090E';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // ── 3. TORPEDO WARHEAD METALLIC CASING (Gunmetal Navy Shell) ──
        let col = '#262A3C'; // Dark gunmetal / steel-navy body

        // Curved Diagonal Segmented Armor Plating Seams (1:1 with reference figure)
        const seam1 = Math.abs(-gx + gy * 0.72 - (-5)) <= 0.65;
        const seam2 = Math.abs(-gx + gy * 0.72 - 1) <= 0.65;
        const seam3 = Math.abs(-gx + gy * 0.72 - 7) <= 0.65;

        // Signature Mechanical Bracket Hinge near top of mid seam (gx = -1..0, gy = -8..-7)
        const isBracketHinge = (gx >= -1 && gx <= 0 && gy >= -8 && gy <= -7);

        if (isBracketHinge) {
          ctx.fillStyle = (gx === 0 && gy === -8) ? '#8697C2' : '#525F82'; // Metallic hinge bracket
          ctx.fillRect(px, py, P, P);
          continue;
        } else if (seam1 || seam2 || seam3) {
          col = '#0C0E14'; // Deep panel groove seam
        } else if (gx >= 3 && gx <= 11 && gy >= -10 && gy <= -4) {
          // Aerodynamic Rounded Nose Cone Specular Highlight (Forward +X side)
          if (gx >= 5 && gx <= 9 && gy >= -9 && gy <= -6) {
            col = '#8293BC'; // Brilliant metallic glint
          } else {
            col = '#4B577B'; // Upper nose cone curvature sheen
          }
        } else if (gy < -9) {
          col = '#343B54'; // Warhead crown ridge
        } else if (Math.abs(gx) >= 9) {
          col = '#151824'; // Outer flank depth shadow
        }

        ctx.fillStyle = col;
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ══════════════════════════════════════════
      // ZONE B: UPPER TORSO & BARE SHOULDERS (gy = 3 .. 6)
      // ══════════════════════════════════════════
      if (gy >= 3 && gy <= 6) {
        // ── 1. Bare Porcelain Skin Shoulders on Flanks (|gx| >= 6) ──
        if (Math.abs(gx) >= 6) {
          if (gy === 3) {
            ctx.fillStyle = '#EDBFAF'; // Shoulder drop shadow from warhead
          } else if (Math.abs(gx) >= 10) {
            ctx.fillStyle = '#F2C8B6'; // Outer arm curve shading
          } else {
            ctx.fillStyle = '#FFE6D8'; // Fair porcelain skin
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // ── 2. Center Chest: White Blouse & Dark Silk Ribbon Tie (|gx| <= 2) ──
        if (Math.abs(gx) <= 2) {
          // Dark Navy/Charcoal Silk Ribbon Tie cascading down
          const isRibbonTie = (Math.abs(gx) <= 1 && gy >= 4);
          const isRibbonKnot = (gx === 0 && gy === 3);

          if (isRibbonKnot) {
            ctx.fillStyle = '#425174'; // Knot silk sheen
            ctx.fillRect(px, py, P, P);
            continue;
          } else if (isRibbonTie) {
            ctx.fillStyle = (gx === 0) ? '#32405D' : '#192030'; // Cascading silk tails
            ctx.fillRect(px, py, P, P);
            continue;
          }

          // Crisp White Collared Shirt Fabric & Pointed Collar Wings
          ctx.fillStyle = (gy === 3) ? '#FFFFFF' : '#F6F4EE';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // ── 3. Braided Fuse-Cord Halter Straps (|gx| = 3 .. 5) ──
        let ropeCol = '#191B24';
        if ((gx + gy) % 2 === 0) {
          ropeCol = '#3A4058'; // Twisted cord highlight
        } else {
          ropeCol = '#11121A'; // Deep rope crevice
        }
        ctx.fillStyle = ropeCol;
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ══════════════════════════════════════════
      // ZONE C: BRAIDED FUSE-CORD CORSET / APRON (gy = 7 .. 9)
      // Densely woven from twisted dynamite wicks / detonating ropes
      // ══════════════════════════════════════════
      if (gy >= 7 && gy <= 9) {
        let cordCol = '#181A24';
        const weavePattern = (Math.abs(gx) * 2 + gy * 3) % 4;

        if (weavePattern === 0) {
          cordCol = '#424965'; // Twisted cord ridge specular highlight
        } else if (weavePattern === 1) {
          cordCol = '#2C3145'; // Cord body
        } else if (weavePattern === 2) {
          cordCol = '#1D202D'; // Midtone rope strand
        } else {
          cordCol = '#0E0F16'; // Deep braided crevice groove
        }

        ctx.fillStyle = cordCol;
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ══════════════════════════════════════════
      // ZONE D: WAIST DYNAMITE CYLINDER BANDOLIER (gy = 10 .. 11)
      // Tactical charcoal/slate artillery shells (1:1 with reference figure, no cartoon red)
      // ══════════════════════════════════════════
      if (gy >= 10 && gy <= 11) {
        const isDivider = (Math.abs(gx) % 2 === 0);
        if (isDivider) {
          ctx.fillStyle = '#0D0E14'; // Shadow groove between shell cartridges
        } else if (gy === 10) {
          ctx.fillStyle = '#4D5573'; // Rounded cartridge top metallic rim highlight
        } else {
          ctx.fillStyle = '#2A2E40'; // Solid dark gunmetal cylindrical shell body
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ══════════════════════════════════════════
      // ZONE E: LOWER DARK SLATE SHORTS (gy >= 12)
      // ══════════════════════════════════════════
      if (gy === 12) {
        ctx.fillStyle = '#101118'; // Belt rim
      } else {
        ctx.fillStyle = '#161824'; // Dark matte shorts
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Draws Reze's Concealed Kitchen Chef's Knife in 100% authentic discrete pixel art style.
 * 1:1 match with Zangetsu & Nanami Cleaver standard.
 */
function _drawRezeConcealedKnife(ctx, hx, hy, handSize, bladeAngle = 0, isReverseGrip = false) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(bladeAngle);
  if (isReverseGrip) {
    ctx.rotate(Math.PI * 0.72);
  }

  const s = 0.56; // Balanced scale (not too small, not too big)
  const anchorX = 30 * s;
  const anchorY = 14 * s;

  const wImg = _getRezeWeaponImage();
  if (wImg && wImg.complete && wImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const drawW = 128 * s;
    const drawH = 36 * s;
    ctx.drawImage(wImg, 0, 0, wImg.naturalWidth, wImg.naturalHeight, -anchorX, -anchorY, drawW, drawH);
    ctx.restore();
  } else {
    _drawDiscretePixelChefKnife(ctx, -anchorX, -anchorY, s);
  }

  ctx.restore();
}

/**
 * Draws discrete pixel-art combustion sparks and flame halo at the striking fist/palm (Hybrid Form)
 */
function _drawRezeHandPixelCombustion(ctx, hx, hy, handSize, isFinisher, punchPhase, now, fighter) {
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const intensity = _getMartialLungeCurve(punchPhase);

  ctx.save();
  ctx.translate(hx, hy);

  // 1. Incandescent Core Pixel Cross
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-P, -P, P * 2, P * 2);

  // 2. Bright Spark Gold Collar
  ctx.fillStyle = '#FFE600';
  ctx.fillRect(-P * 2, -P, P, P * 2);
  ctx.fillRect(P, -P, P, P * 2);
  ctx.fillRect(-P, -P * 2, P * 2, P);
  ctx.fillRect(-P, P, P * 2, P);

  // 3. Tangerine / Molten Flame Envelope
  ctx.fillStyle = '#FF2E00';
  ctx.fillRect(-P * 3, -P * 0.5, P, P);
  ctx.fillRect(P * 2, -P * 0.5, P, P);
  ctx.fillRect(-P * 0.5, -P * 3, P, P);
  ctx.fillRect(-P * 0.5, P * 2, P, P);

  // 4. Finisher "Spark Slap" Multi-Pixel Flare & Flying Embers
  if (isFinisher) {
    const flareR = snap(handSize * (1.2 + intensity * 0.8));
    ctx.fillStyle = '#FFE600';
    ctx.fillRect(flareR, -P, P * 1.5, P * 2);
    ctx.fillRect(-flareR, -P, P * 1.5, P * 2);
    ctx.fillRect(-P, flareR, P * 2, P * 1.5);
    ctx.fillRect(-P, -flareR, P * 2, P * 1.5);

    // Flying spark pixels
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + (now * 0.01);
      const dist = snap(handSize * 1.8 + Math.sin(now * 0.02 + i) * 6);
      const sx = snap(Math.cos(ang) * dist);
      const sy = snap(Math.sin(ang) * dist);
      ctx.fillStyle = (i % 2 === 0) ? '#FFFFFF' : ((fighter && fighter.themeColor) || '#430363ff');
      ctx.fillRect(sx, sy, P, P);
    }
  }

  ctx.restore();
}

/**
 * Renders Reze's Back Hand (Layer 1 - Behind Body Circle) during active combat
 */
function _drawRezeBackHand(ctx, fighter, r, isHybrid, isPunching, punchPhase, punchCycle, isLunge, isDiveBomb, now) {
  const handSize = isHybrid ? getHandSize(r * 0.22) : getHandSize(r * 0.18);
  const skinColor = isHybrid ? '#32394E' : '#FFE6D8';
  const outlineColor = isHybrid ? '#0E1017' : '#14101A';

  let hx = r * 0.96;
  let hy = r * 0.28;
  let activeCombustion = false;
  const isFinisher = isPunching && (punchCycle === 0 || punchCycle === 3);
  const lungeProgress = isPunching ? _getMartialLungeCurve(punchPhase) : 0;

  if (fighter.isPullingPin) {
    // Dramatic stance: off-hand holds counter-balance near hip/ribcage
    hx = -r * 0.22;
    hy = r * 0.38;
    drawPixelHand(ctx, hx, hy, handSize, skinColor, outlineColor);
    return;
  }

  if (!isHybrid) {
    // ──────────────────────────────────────────
    // HUMAN FORM: TACTICAL CQC OFF-HAND GUARD
    // ──────────────────────────────────────────
    if (isPunching) {
      if (punchCycle === 1) {
        // Strike 1: Hand pulls close to chest/chin guarding against counter
        const t = Math.sin(punchPhase * Math.PI);
        hx = r * (0.40 - 0.12 * t);
        hy = r * (-0.15 + 0.05 * t);
      } else if (punchCycle === 2) {
        // Strike 2: Off-hand braces high guard near throat
        const t = Math.sin(punchPhase * Math.PI);
        hx = r * (0.45 - 0.10 * t);
        hy = r * (-0.08 + 0.04 * t);
      } else {
        // Strike 3 (Thrust): Off-hand pulls back to hip as biomechanical counter-balance
        const t = Math.sin(punchPhase * Math.PI);
        hx = r * (0.35 - 0.22 * t);
        hy = r * (0.28 + 0.08 * t);
      }
    } else {
      hx = r * 0.40;
      hy = r * 0.28;
    }
  } else {
    // Bomb Devil Form: Martial Arts combo & Guard Stance
    // Off-hand guards from the LEFT side of body (like Mahoraga's stance)
    if (isPunching) {
      if (punchCycle === 2) {
        hx = r * 0.85 + lungeProgress * (r * 1.20);
        hy = -r * 0.18;
        activeCombustion = (punchPhase > 0.08 && punchPhase < 0.88);
      } else if (punchCycle === 0) {
        hx = r * 0.90 + lungeProgress * (r * 1.40);
        hy = -r * 0.22;
        activeCombustion = (punchPhase > 0.05 && punchPhase < 0.92);
      } else {
        // Non-punching hand recoils to left guard
        hx = r * 0.55 - lungeProgress * (r * 0.15);
        hy = -r * 0.32;
      }
    } else if (isLunge || isDiveBomb) {
      hx = r * 0.75;
      hy = -r * 0.30;
    } else {
      // Idle / moving in Bomb Devil Form:
      // Off-hand held in left-side martial-arts guard stance (like Mahoraga)
      const idleBob = (now && typeof now === 'number') ? Math.sin(now * 0.005 + 1.2) * 0.8 : 0;
      hx = r * 0.60;
      hy = -r * 0.32 + idleBob;
    }
  }

  drawPixelHand(ctx, hx, hy, handSize, skinColor, outlineColor);

  if (activeCombustion) {
    _drawRezeHandPixelCombustion(ctx, hx + handSize * 0.6, hy, handSize, isFinisher, punchPhase, now, fighter);
  }
}

/**
 * Draws Reze's Collar Pin Pull Visuals:
 * - Silver grenade pull-ring gripped by the hand
 * - Cotter-pin metallic stem stretching between neck collar socket and the ring
 * - Supersonic friction sparks and glow erupting from the collar socket
 */
function _drawRezePinPullVisuals(ctx, r, pullProgress, hx, hy, handSize, now) {
  const collarX = r * 0.05;
  const collarY = r * 0.18;

  // 1. Silver Grenade Pull-Ring (Gripped in front hand fingers)
  if (pullProgress >= 0.25) {
    const ringX = hx - handSize * 0.30;
    const ringY = hy;
    const ringR = r * 0.10;

    ctx.save();
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#CBD5E1'; // Polished steel
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
    ctx.stroke();

    // Metallic specular glint pixel
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(ringX - 1, ringY - ringR - 1, 2, 2);
    ctx.restore();

    // 2. Cotter-Pin Wire / Stem extending from collar socket to ring
    if (pullProgress >= 0.45) {
      ctx.save();
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(collarX, collarY);
      ctx.lineTo(ringX, ringY);
      ctx.stroke();

      // Gleaming center wire highlight
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(collarX, collarY);
      ctx.lineTo(ringX, ringY);
      ctx.stroke();
      ctx.restore();

      // 3. Friction & Ignition Sparks spraying from collar socket
      const sparkIntensity = Math.min(1.0, (pullProgress - 0.45) / 0.55);
      const sparkCount = Math.floor(6 + sparkIntensity * 7);

      ctx.save();
      for (let i = 0; i < sparkCount; i++) {
        const sparkSeed = (i * 137.5 + (now || 0) * 0.02) % 360;
        const angle = (sparkSeed * Math.PI) / 180;
        const dist = (r * 0.08) + (i % 3) * (r * 0.14 * sparkIntensity);
        const sx = collarX + Math.cos(angle) * dist;
        const sy = collarY + Math.sin(angle) * dist;
        const size = (i % 2 === 0) ? 2.5 : 1.5;
        const col = (i % 3 === 0) ? '#FFFFFF' : ((i % 3 === 1) ? '#FFE600' : '#FF6B1A');
        ctx.fillStyle = col;
        ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
      }

      // Collar socket glow halo (Rule 11: transparent concentric circles, zero shadowBlur)
      ctx.fillStyle = `rgba(255, 230, 0, ${0.40 * sparkIntensity})`;
      ctx.beginPath();
      ctx.arc(collarX, collarY, r * 0.16 * sparkIntensity, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 107, 26, ${0.25 * sparkIntensity})`;
      ctx.beginPath();
      ctx.arc(collarX, collarY, r * 0.26 * sparkIntensity, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

/**
 * Renders Reze's Front Hand (Layer 3 - On Top of Body Circle)
 * In Human Form (!isHybrid), Reze visibly holds her Chef's Knife in front guard stance.
 */
function _drawRezeFrontHand(ctx, fighter, r, isHybrid, isPunching, punchPhase, punchCycle, isLunge, isDiveBomb, now) {
  const handSize = isHybrid ? getHandSize(r * 0.22) : getHandSize(r * 0.18);
  const skinColor = isHybrid ? '#32394E' : '#FFE6D8';
  const outlineColor = isHybrid ? '#0E1017' : '#14101A';

  let hx = r * 0.85;
  let hy = r * 0.22;
  let activeCombustion = false;
  let drawKnife = !isHybrid; // Always hold knife in Human Form
  let knifeAngle = -0.14;
  let reverseGrip = false;
  const isFinisher = isPunching && (punchCycle === 0 || punchCycle === 3);
  const lungeProgress = isPunching ? _getMartialLungeCurve(punchPhase) : 0;

  if (fighter.isPullingPin) {
    // ──────────────────────────────────────────
    // HUMAN FORM: COLLAR GRENADE PIN PULL ANIMATION
    // ──────────────────────────────────────────
    drawKnife = false;
    const pullMax = fighter.pinPullMaxTimer || 44;
    const pullTimer = fighter.pinPullTimer !== undefined ? fighter.pinPullTimer : 0;
    const pullProgress = Math.max(0, Math.min(1.0, 1.0 - (pullTimer / pullMax)));

    // Trajectory:
    // Phase 1 (0.00 to 0.35): Reach from guard (0.85r, 0.22r) up to neck collar (0.05r, 0.18r)
    // Phase 2 (0.35 to 0.48): Grip onto the ring at collar (0.05r, 0.18r)
    // Phase 3 (0.48 to 1.00): Hard pull yanking pin outward to (0.55r, 0.12r)
    if (pullProgress < 0.35) {
      const t = pullProgress / 0.35;
      const ease = Math.sin(t * Math.PI * 0.5);
      hx = r * (0.85 - 0.80 * ease);
      hy = r * (0.22 - 0.04 * ease);
    } else if (pullProgress < 0.48) {
      hx = r * 0.05;
      hy = r * 0.18;
    } else {
      const t = (pullProgress - 0.48) / 0.52;
      const ease = t * t;
      hx = r * (0.05 + 0.50 * ease);
      hy = r * (0.18 - 0.06 * ease);
    }

    // 1. Draw Front Hand
    drawPixelHand(ctx, hx, hy, handSize, skinColor, outlineColor);

    // 2. Draw Collar Pin, Pulled Ring, Stem Wire & Friction Sparks
    _drawRezePinPullVisuals(ctx, r, pullProgress, hx, hy, handSize, now);
    return;
  }

  if (isDiveBomb) {
    // Aerial Attack: Dive Bomb knife held in downward reverse grip
    hx = r * 1.15;
    hy = r * 0.18;
    drawKnife = !isHybrid;
    knifeAngle = 0.45;
    reverseGrip = true;
  } else if (isPunching && !isHybrid) {
    // ──────────────────────────────────────────
    // HUMAN FORM: DYNAMIC 3-HIT TACTICAL KNIFE COMBO
    // ──────────────────────────────────────────
    drawKnife = true;
    if (punchCycle === 1) {
      // ── Strike 1: Overhead Downward Diagonal Chop / Slash ──
      if (punchPhase < 0.16) {
        // Windup: Hand raises up and back, blade cocks high overhead (~11 o'clock)
        const t = punchPhase / 0.16;
        const ease = Math.sin(t * Math.PI * 0.5);
        hx = r * (0.85 - 0.15 * ease);
        hy = r * (0.22 - 0.60 * ease);
        knifeAngle = -0.14 - 1.15 * ease; // snaps to -1.29 rad (~11 o'clock)
      } else if (punchPhase < 0.65) {
        // Power Stroke: High-velocity slicing arc across center down to ~5 o'clock
        const t = (punchPhase - 0.16) / 0.49;
        const ease = t * t * (3 - 2 * t);
        hx = r * (0.70 + 0.68 * Math.sin(t * Math.PI));
        hy = r * (-0.38 + 0.76 * ease); // sweeps from -0.38r down to +0.38r
        knifeAngle = -1.29 + 2.35 * ease; // sweeps down to +1.06 rad (~5 o'clock)
      } else {
        // Follow-through & Recovery back to neutral guard
        const recP = (punchPhase - 0.65) / 0.35;
        const easeRec = 0.5 + 0.5 * Math.cos(recP * Math.PI);
        hx = r * (0.85 + 0.22 * easeRec);
        hy = r * (0.22 + 0.16 * easeRec);
        knifeAngle = -0.14 + 1.20 * easeRec;
      }
    } else if (punchCycle === 2) {
      // ── Strike 2: Low-to-High Upward Backhand Riposte ──
      if (punchPhase < 0.16) {
        // Windup: Hand drops low, blade angles downward (~5 o'clock)
        const t = punchPhase / 0.16;
        const ease = Math.sin(t * Math.PI * 0.5);
        hx = r * (0.85 - 0.12 * ease);
        hy = r * (0.22 + 0.28 * ease);
        knifeAngle = -0.14 + 1.15 * ease; // angles down to +1.01 rad
      } else if (punchPhase < 0.65) {
        // Power Stroke: Slices diagonally upward across center up to ~1 o'clock
        const t = (punchPhase - 0.16) / 0.49;
        const ease = t * t * (3 - 2 * t);
        hx = r * (0.73 + 0.62 * Math.sin(t * Math.PI));
        hy = r * (0.50 - 0.82 * ease); // sweeps from +0.50r up to -0.32r
        knifeAngle = 1.01 - 2.15 * ease; // sweeps up to -1.14 rad
      } else {
        // Follow-through & Recovery back to neutral guard
        const recP = (punchPhase - 0.65) / 0.35;
        const easeRec = 0.5 + 0.5 * Math.cos(recP * Math.PI);
        hx = r * (0.85 + 0.18 * easeRec);
        hy = r * (0.22 - 0.20 * easeRec);
        knifeAngle = -0.14 - 1.00 * easeRec;
      }
    } else {
      // ── Strike 3: Step-in Precision Stiletto Thrust Finisher ──
      if (punchPhase < 0.18) {
        // Chamber: Hand draws back to ribcage, knife snaps dead-center straight
        const t = punchPhase / 0.18;
        const ease = Math.sin(t * Math.PI * 0.5);
        hx = r * (0.85 - 0.35 * ease);
        hy = r * (0.22 - 0.18 * ease);
        knifeAngle = -0.14 * (1 - ease);
      } else if (punchPhase < 0.58) {
        // Piston Thrust: Powerful lunging forward penetration along aim vector
        const t = (punchPhase - 0.18) / 0.40;
        const ease = Math.sin(t * Math.PI * 0.5);
        hx = r * (0.50 + 1.25 * ease); // lunges forward out to 1.75r!
        hy = r * 0.04;
        knifeAngle = 0.0;
      } else {
        // Snappy Tactical Recoil Retraction
        const recP = (punchPhase - 0.58) / 0.42;
        const easeRec = Math.pow(1 - recP, 2.0);
        hx = r * (0.85 + 0.90 * easeRec);
        hy = r * (0.22 - 0.18 * (1 - easeRec));
        knifeAngle = -0.14 * (1 - easeRec);
      }
    }
  } else if (isPunching && isHybrid) {
    // Bomb Devil Form: Martial Arts punches
    if (punchCycle === 1) {
      hx = r * 0.80 + lungeProgress * (r * 1.55);
      hy = -r * 0.05;
      activeCombustion = (punchPhase > 0.08 && punchPhase < 0.88);
    } else if (punchCycle === 2) {
      hx = r * 0.75 + lungeProgress * (r * 1.45);
      hy = r * 0.12;
      activeCombustion = (punchPhase > 0.08 && punchPhase < 0.88);
    } else {
      hx = r * 0.85 + lungeProgress * (r * 1.65);
      hy = 0;
      activeCombustion = (punchPhase > 0.05 && punchPhase < 0.92);
    }
  } else if (isLunge) {
    hx = r * 1.05;
    hy = r * 0.15;
    drawKnife = !isHybrid;
    knifeAngle = -0.10;
  } else {
    // Idle / Walking / Moving / Aiming
    const idleBob = (now && typeof now === 'number') ? Math.sin(now * 0.005) * 0.8 : 0;
    if (isHybrid) {
      // Bomb Devil Form: Martial arts lead hand in front guard
      hx = r * 0.78;
      hy = r * 0.10 + idleBob;
      drawKnife = false;
    } else {
      // Human Form: Knife guard
      hx = r * 0.85;
      hy = r * 0.22 + idleBob;
      drawKnife = true;
      knifeAngle = -0.14;
    }
  }

  // 1. Draw Knife first so hand fingers grip over the handle
  if (drawKnife) {
    _drawRezeConcealedKnife(ctx, hx, hy, handSize, knifeAngle, reverseGrip);
  }

  // 2. Draw Front Pixel Hand
  drawPixelHand(ctx, hx, hy, handSize, skinColor, outlineColor);

  // 3. Hybrid Form: Combustion flame/spark FX
  if (activeCombustion) {
    _drawRezeHandPixelCombustion(ctx, hx + handSize * 0.8, hy, handSize, isFinisher, punchPhase, now, fighter);
  } else if (isHybrid && !isPunching && !isDiveBomb) {
    // Subtle idle ignition spark on fingertips in Bomb Devil Form
    const sparkPhase = ((now || 0) * 0.008) % 1;
    if (sparkPhase < 0.65) {
      ctx.fillStyle = (sparkPhase < 0.35) ? '#FFE600' : '#FF6B1A';
      ctx.fillRect(Math.round(hx + handSize * 0.7), Math.round(hy - handSize * 0.2), 2, 2);
    }
  }
}
