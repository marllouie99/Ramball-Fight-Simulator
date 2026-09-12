// ─────────────────────────────────────────────
// Zenitsu Agatsuma Fighter Skin & Body Model (Authentic Pixel Art Edition)
// Demon Slayer: Kimetsu no Yaiba
// Adheres strictly to:
// - Rule 19 (Upright Front POV Camera Orientation, Zero Eyes/Mouth/Nose)
// - Rule 19.1 (Proportional Vertical Bands & Discrete Lock Hair Arrays)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawZenitsuLightningKatana } from '../weapons/demonSlayerWeaponGraphics.js';

const P = 2.0; // 2.0px authentic retro pixel grid
const snap = (v) => Math.round(v / P) * P;

/**
 * Discrete Pixel-Art Hairline Grid for Zenitsu's Square-Cut Tiered Blonde Hair
 * 27 columns total (gx = -13 to +13, index = gx + 13)
 * Features iconic horizontal blunt square-cut bang blocks.
 */
const ZENITSU_HAIRLINE_GY = [
   1,  0, -1, -2, -2, -2, -1, -1, -1,  0,  0,  0, -1, -1,  0,  0,  0, -1, -1, -1, -2, -2, -2, -1,  0,  1,  1
];

/**
 * Main Skin Renderer for Zenitsu Agatsuma (Pixel Art)
 */
export function drawZenitsuSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const now = Date.now();

  const isSuppressed = !isPodiumPreview && Boolean(
    fighter.isTargetOfAmbush ||
    (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
  );

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

  // 4. LAYER 1: MAIN BODY (Pixel Circle + Triangle Haori + Corps Uniform + Tiered Blonde Hair)
  drawZenitsuPixelBody(ctx, r);

  // 5. LAYER 2: FRONT HAND & LIGHTNING KATANA (On Top of Body)
  const showFrontHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideFrontHand;
  if (showFrontHand) {
    _drawZenitsuFrontHand(ctx, fighter, r, isKatanaSwinging, isPunching, animPhase);
  }

  ctx.restore();
}

/**
 * Solid 2D Pixel-Art Body for Zenitsu Agatsuma
 */
export function drawZenitsuPixelBody(ctx, r) {
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
        ctx.fillStyle = '#18181B';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 2. TIERED SQUARE-CUT BLONDE & ORANGE HAIR (gy <= hairCutoffGy) ──
      const hairIdx = Math.max(0, Math.min(26, gx + 13));
      const hairCutoffGy = ZENITSU_HAIRLINE_GY[hairIdx];
      const isHair = gy <= hairCutoffGy;

      if (isHair) {
        // Square-Cut Orange Tips (gy === hairCutoffGy or hairCutoffGy - 1)
        if (gy >= hairCutoffGy - 1) {
          ctx.fillStyle = '#F97316'; // Vibrant orange tips
        } else if (normY < -0.60 && (gx % 2 === 0)) {
          ctx.fillStyle = '#FEF08A'; // Pale blonde crown shine
        } else if (normY < -0.30) {
          ctx.fillStyle = '#FBBF24'; // Bright yellow anime blonde
        } else {
          ctx.fillStyle = '#F59E0B'; // Warm amber midtone
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 3. PALE ANIME FACE SKIN (-r*0.18 to +r*0.18) ──
      if (normY < 0.18) {
        if (normY < -0.05) {
          ctx.fillStyle = '#FEE8D6'; // Pale anime skin
        } else if (normY < 0.08) {
          ctx.fillStyle = '#FDD3B2'; // Warm peach tone
        } else {
          ctx.fillStyle = '#F9B786'; // Chin shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 4. CORPS UNIFORM & TRIANGLE HAORI (+r*0.18 to +r*1.00) ──
      const isWhiteCollar = Math.abs(gx) <= 2 && gy >= 3 && gy <= 5;
      const isInnerBlackV = Math.abs(gx) <= 1 && gy >= 3 && gy <= 4;
      const isGoldButton = gx === 0 && gy === 6;
      const isWhiteBelt = gy >= 9 && gy <= 10 && Math.abs(gx) <= 8;
      const isBeltBuckle = isWhiteBelt && Math.abs(gx) <= 2;

      if (isInnerBlackV) {
        ctx.fillStyle = '#18181B';
        ctx.fillRect(px, py, P, P);
      } else if (isWhiteCollar) {
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(px, py, P, P);
      } else if (isGoldButton) {
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(px, py, P, P);
      } else if (isBeltBuckle) {
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(px, py, P, P);
      } else if (isWhiteBelt) {
        ctx.fillStyle = '#F1F5F9';
        ctx.fillRect(px, py, P, P);
      } else {
        // White Triangle Scale Pattern on Yellow-to-Orange Gradient Haori
        const isWhiteTriangle = (
          (Math.abs(gx) % 5 === 0 && gy % 4 === 0) ||
          (Math.abs(gx) % 5 === 1 && gy % 4 === 1) ||
          (Math.abs(gx) % 5 === 4 && gy % 4 === 1)
        );

        if (isWhiteTriangle) {
          ctx.fillStyle = '#FFFFFF'; // Crisp white triangle scale
        } else {
          // Yellow-to-Orange Gradient Haori Body
          if (normY < 0.40) {
            ctx.fillStyle = '#FBBF24'; // Bright yellow top
          } else if (normY < 0.70) {
            ctx.fillStyle = '#F59E0B'; // Warm amber gold
          } else {
            ctx.fillStyle = '#EA580C'; // Deep orange lower hem
          }
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  // ── 5. Pixelated White Lightning Glint (Left Crown: gx = -2, gy = -8) ──
  const lx = snap(-r * 0.15);
  const ly = snap(-r * 0.75);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(lx, ly, 4, 2);
  ctx.fillRect(lx + 2, ly + 2, 4, 2);

  ctx.restore();
}

/**
 * Pixel Art Back Hand
 */
function _drawZenitsuBackHand(ctx, fighter, r, isKatanaSwinging, isPunching, animPhase) {
  const handSize = getHandSize(5.8);
  const backX = r * 0.65;
  const backY = -r * 0.35;
  drawPixelHand(ctx, backX, backY, handSize, '#FEE8D6', '#18181B');
}

/**
 * Pixel Art Front Hand & Lightning Katana
 */
function _drawZenitsuFrontHand(ctx, fighter, r, isKatanaSwinging, isPunching, animPhase) {
  const frontX = r * 0.95 + (isKatanaSwinging ? animPhase * 14 : 0);
  const frontY = 0;

  // Draw Lightning Katana
  drawZenitsuLightningKatana(ctx, 0, 0, isKatanaSwinging ? (animPhase - 0.5) * 1.6 : 0, r);

  // Front Pixel Fist
  const handSize = getHandSize(6.2);
  drawPixelHand(ctx, frontX, frontY, handSize, '#FEE8D6', '#18181B');
}
