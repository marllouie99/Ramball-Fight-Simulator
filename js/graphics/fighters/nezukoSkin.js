// ─────────────────────────────────────────────
// Nezuko Kamado Fighter Skin & Body Model (Authentic Pixel Art Edition)
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
import { drawNezukoDemonClaws } from '../weapons/demonSlayerWeaponGraphics.js';

const P = 2.0; // 2.0px authentic retro pixel grid
const snap = (v) => Math.round(v / P) * P;

/**
 * Discrete Pixel-Art Hairline Grid for Nezuko's Long Flowing Hair
 * 27 columns total (gx = -13 to +13, index = gx + 13)
 * Side locks cascade down the shoulders with fiery ombré tips.
 */
const NEZUKO_HAIRLINE_GY = [
   8,  7,  6,  4,  0, -2, -3, -4, -3, -1,  0,  0, -1, -1, -1,  0,  0, -2, -3, -4, -3, -1,  4,  6,  7,  8,  8
];

/**
 * Main Skin Renderer for Nezuko Kamado (Pixel Art)
 */
export function drawNezukoSkin(ctx, fighter) {
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
  const isClawSlashing = !isPodiumPreview && !isSuppressed && (fighter.slashSwingTimer && fighter.slashSwingTimer > 0);
  const isPunching = !isPodiumPreview && !isSuppressed && (fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
  const animPhase = isClawSlashing
    ? Math.min(1.0, 1.0 - (fighter.slashSwingTimer / (fighter.slashSwingMaxTimer || 16)))
    : (isPunching ? Math.min(1.0, 1.0 - (fighter.punchAnimTimer / (fighter.punchMaxTime || 14))) : 0);

  // 3. LAYER 0: BACK HAND (Behind Body Layer)
  const showBackHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideBackHand;
  if (showBackHand) {
    _drawNezukoBackHand(ctx, fighter, r, isClawSlashing, isPunching, animPhase);
  }

  // 4. LAYER 1: MAIN BODY (Pixel Circle + Kimono + Haori + Bamboo Muzzle + Horn + Hair)
  drawNezukoPixelBody(ctx, r);

  // 5. LAYER 2: FRONT HAND & DEMON CLAWS (On Top of Body)
  const showFrontHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideFrontHand;
  if (showFrontHand) {
    _drawNezukoFrontHand(ctx, fighter, r, isClawSlashing, isPunching, animPhase);
  }

  ctx.restore();
}

/**
 * Solid 2D Pixel-Art Body for Nezuko Kamado
 */
export function drawNezukoPixelBody(ctx, r) {
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

      // ── 1. Stepped Outer Manga Ink Outline ──
      const isOutline = dist >= r - P;
      if (isOutline) {
        ctx.fillStyle = '#18181B';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 2. LONG CASCADING BLACK & OMBRÉ HAIR (gy <= hairCutoffGy) ──
      const hairIdx = Math.max(0, Math.min(26, gx + 13));
      const hairCutoffGy = NEZUKO_HAIRLINE_GY[hairIdx];
      const isHair = gy <= hairCutoffGy;

      if (isHair) {
        // Bottom Ombré Tips on cascading side locks (Math.abs(gx) >= 9, gy >= 4)
        if (Math.abs(gx) >= 8 && gy >= 4) {
          ctx.fillStyle = (gy >= 6) ? '#F97316' : '#EA580C'; // Fiery vermilion/orange ombré tips
        } else if (normY < -0.70) {
          ctx.fillStyle = '#27272A'; // Hair crown shine
        } else if (gy === hairCutoffGy) {
          ctx.fillStyle = '#09090B'; // Hair shadow edge
        } else {
          ctx.fillStyle = '#18181B'; // Jet black hair mass
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 3. BAMBOO MUZZLE (gy = 0..3, Math.abs(gx) <= 8) ──
      const isBambooMuzzle = (gy >= 0 && gy <= 3 && Math.abs(gx) <= 6);
      const isBambooCord = (gy === 1 && Math.abs(gx) >= 7 && Math.abs(gx) <= 10);

      if (isBambooCord) {
        ctx.fillStyle = '#DC2626'; // Red tying cord
        ctx.fillRect(px, py, P, P);
        continue;
      } else if (isBambooMuzzle) {
        const isNode = (gx === -3 || gx === 3);
        const isHighlight = (gy === 1 && Math.abs(gx) <= 4);
        if (isHighlight) {
          ctx.fillStyle = '#86EFAC'; // Mint highlight sheen
        } else if (isNode) {
          ctx.fillStyle = '#15803D'; // Dark bamboo joint ring
        } else {
          ctx.fillStyle = '#22C55E'; // Vibrant bamboo green
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 4. FAIR PORCELAIN FACE SKIN (-r*0.18 to +r*0.18) ──
      if (normY < 0.18) {
        if (normY < -0.05) {
          ctx.fillStyle = '#FFF1E8'; // Fair porcelain base
        } else if (normY < 0.08) {
          ctx.fillStyle = '#FED7AA'; // Soft peach cheek tone
        } else {
          ctx.fillStyle = '#FDBA74'; // Chin shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 5. ASANOHA KIMONO, OBI SASH & BLACK HAORI (+r*0.18 to +r*1.00) ──
      const isOuterHaori = Math.abs(gx) >= 8;
      const isObiSash = (gy >= 8 && gy <= 10 && Math.abs(gx) <= 7);
      const isObiJimeCord = (gy === 9 && Math.abs(gx) <= 7);

      if (isOuterHaori) {
        // Dark Charcoal Black Haori
        ctx.fillStyle = '#1C1917';
        ctx.fillRect(px, py, P, P);
      } else if (isObiJimeCord) {
        // Orange Obi-Jime Cord
        ctx.fillStyle = '#F97316';
        ctx.fillRect(px, py, P, P);
      } else if (isObiSash) {
        // Red and White Checkered Obi Pattern (2x2 grid)
        const checkX = Math.floor((gx + 7) / 3);
        const isRedCheck = (checkX % 2 === 0);
        ctx.fillStyle = isRedCheck ? '#DC2626' : '#FFFFFF';
        ctx.fillRect(px, py, P, P);
      } else {
        // Pink Asanoha Geometric Kimono
        const isGridLine = (Math.abs(gx) % 3 === 0 || gy % 3 === 0);
        ctx.fillStyle = isGridLine ? '#EC4899' : '#F472B6';
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  // ── 6. Pixelated Demonic Ivory Horn (Right Forehead: gx = 4..6, gy = -10..-5) ──
  const hx = snap(r * 0.38);
  const hy = snap(-r * 0.55);
  ctx.fillStyle = '#FEF3C7'; // Ivory horn base
  ctx.fillRect(hx - 2, hy - 4, 4, 6);
  ctx.fillRect(hx - 1, hy - 8, 2, 4);
  ctx.fillStyle = '#F59E0B'; // Shadow ridge
  ctx.fillRect(hx + 1, hy - 6, 1, 6);

  // ── 7. Pink Hair Ribbon (Left Temple: gx = -9, gy = -6) ──
  const rx = snap(-r * 0.70);
  const ry = snap(-r * 0.45);
  ctx.fillStyle = '#F472B6';
  ctx.fillRect(rx - 2, ry - 2, 5, 4);
  ctx.fillStyle = '#BE185D';
  ctx.fillRect(rx - 1, ry - 1, 3, 2);

  ctx.restore();
}

/**
 * Pixel Art Back Hand
 */
function _drawNezukoBackHand(ctx, fighter, r, isClawSlashing, isPunching, animPhase) {
  const handSize = getHandSize(5.5);
  const backX = r * 0.65;
  const backY = -r * 0.35;
  drawPixelHand(ctx, backX, backY, handSize, '#FFF1E8', '#BE185D');
}

/**
 * Pixel Art Front Hand & Demon Claws
 */
function _drawNezukoFrontHand(ctx, fighter, r, isClawSlashing, isPunching, animPhase) {
  const frontX = r * 0.95 + (isClawSlashing ? animPhase * 10 : 0);
  const frontY = 0;

  // Draw Demon Claws Weapon Preview / Visuals
  drawNezukoDemonClaws(ctx, 0, 0, isClawSlashing ? (animPhase - 0.5) * 1.4 : 0, r);

  // Front Pixel Claw Fist
  const handSize = getHandSize(5.8);
  drawPixelHand(ctx, frontX, frontY, handSize, '#FFF1E8', '#BE185D');
}
