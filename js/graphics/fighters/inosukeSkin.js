// ─────────────────────────────────────────────
// Inosuke Hashibira Fighter Skin & Body Model (Authentic Pixel Art Edition)
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
import { drawInosukeDualSerratedKatanas } from '../weapons/demonSlayerWeaponGraphics.js';

const P = 2.0; // 2.0px authentic retro pixel grid
const snap = (v) => Math.round(v / P) * P;

/**
 * Main Skin Renderer for Inosuke Hashibira (Pixel Art)
 */
export function drawInosukeSkin(ctx, fighter) {
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
  const isBladeSwinging = !isPodiumPreview && !isSuppressed && (fighter.slashSwingTimer && fighter.slashSwingTimer > 0);
  const isPunching = !isPodiumPreview && !isSuppressed && (fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
  const animPhase = isBladeSwinging
    ? Math.min(1.0, 1.0 - (fighter.slashSwingTimer / (fighter.slashSwingMaxTimer || 16)))
    : (isPunching ? Math.min(1.0, 1.0 - (fighter.punchAnimTimer / (fighter.punchMaxTime || 14))) : 0);

  // 3. LAYER 0: BACK HAND (Behind Body Layer)
  const showBackHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideBackHand;
  if (showBackHand) {
    _drawInosukeBackHand(ctx, fighter, r, isBladeSwinging, isPunching, animPhase);
  }

  // 4. LAYER 1: MAIN BODY (Pixel Boar Mask + Tusks + Muscular Torso + Fur Pelt + Hakama)
  drawInosukePixelBody(ctx, r);

  // 5. LAYER 2: FRONT HAND & DUAL SERRATED KATANAS (On Top of Body)
  const showFrontHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideFrontHand;
  if (showFrontHand) {
    _drawInosukeFrontHand(ctx, fighter, r, isBladeSwinging, isPunching, animPhase);
  }

  ctx.restore();
}

/**
 * Solid 2D Pixel-Art Body for Inosuke Hashibira
 */
export function drawInosukePixelBody(ctx, r) {
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

      // ── 2. GREY BOAR MASK HEAD (normY < 0.20) ──
      if (normY < 0.20) {
        // Pointed Boar Ears (gx = -8..-5 and gx = 5..8, gy <= -7)
        const isLeftEar = (gx >= -8 && gx <= -5 && gy <= -7);
        const isRightEar = (gx >= 5 && gx <= 8 && gy <= -7);

        if (isLeftEar || isRightEar) {
          const isInnerEar = (Math.abs(gx) === 6 || Math.abs(gx) === 7) && gy >= -9;
          ctx.fillStyle = isInnerEar ? '#F472B6' : '#334155'; // Pink inner ear or dark ear rim
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Pink Boar Snout (gx = -3..3, gy = -3..0)
        const isSnout = (Math.abs(gx) <= 3 && gy >= -3 && gy <= 0);
        const isNostril = (gy === -1 && (gx === -2 || gx === 2));

        if (isNostril) {
          ctx.fillStyle = '#18181B'; // Boar nostril
          ctx.fillRect(px, py, P, P);
          continue;
        } else if (isSnout) {
          ctx.fillStyle = (gy === -3) ? '#FBCFE8' : '#F472B6'; // Snout highlight & base
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Boar Fur Shading
        if (normY < -0.55) {
          ctx.fillStyle = (gx % 2 === 0) ? '#94A3B8' : '#64748B'; // Forehead fur ridge
        } else if (normY < -0.15) {
          ctx.fillStyle = '#64748B'; // Slate-grey boar fur
        } else {
          ctx.fillStyle = '#475569'; // Lower mask shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 3. BARE MUSCULAR TORSO (normY: 0.20 to 0.55) ──
      if (normY < 0.55) {
        const isPectoralLine = (gy === 4 && Math.abs(gx) <= 5);
        const isCenterAbLine = (gx === 0 && gy >= 4 && gy <= 7);
        const isAbCrossLine = (gy === 6 && Math.abs(gx) <= 3);

        if (isPectoralLine || isCenterAbLine || isAbCrossLine) {
          ctx.fillStyle = '#C2410C'; // Muscular shadow lines
        } else if (normY < 0.35) {
          ctx.fillStyle = '#FED7AA'; // Tanned muscular skin
        } else {
          ctx.fillStyle = '#FDBA74'; // Mid torso shading
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 4. DEER FUR PELT WAISTBAND (normY: 0.55 to 0.72) ──
      if (normY < 0.72) {
        const isFurTuft = (gy >= 8 && Math.abs(gx) % 2 === 1);
        ctx.fillStyle = isFurTuft ? '#92400E' : '#78350F'; // Fluffy brown deer pelt
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 5. DARK NAVY HAKAMA TROUSERS (normY: 0.72 to 1.00) ──
      const isPleatLine = (Math.abs(gx) === 3 || gx === 0);
      ctx.fillStyle = isPleatLine ? '#0F172A' : '#1E293B'; // Deep indigo navy trousers
      ctx.fillRect(px, py, P, P);
    }
  }

  // ── 6. Pixelated Twin Curved White Bone Tusks (Cheeks: gx = ±8, gy = -4..0) ──
  [-1, 1].forEach(side => {
    const tx = snap(side * r * 0.55);
    const ty = snap(-r * 0.10);
    // Ivory Tusk Tip & Curve
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(tx + side * 2, ty - 6, 3, 3); // Upper curved tip
    ctx.fillRect(tx + side * 4, ty - 3, 3, 3);
    ctx.fillRect(tx + side * 2, ty, 4, 3);     // Tusk base
    // Shadow edge
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(tx, ty + 1, 2, 2);
  });

  ctx.restore();
}

/**
 * Pixel Art Back Hand
 */
function _drawInosukeBackHand(ctx, fighter, r, isBladeSwinging, isPunching, animPhase) {
  const handSize = getHandSize(6.0);
  const backX = r * 0.65;
  const backY = -r * 0.35;
  drawPixelHand(ctx, backX, backY, handSize, '#FED7AA', '#18181B');
}

/**
 * Pixel Art Front Hand & Dual Serrated Katanas
 */
function _drawInosukeFrontHand(ctx, fighter, r, isBladeSwinging, isPunching, animPhase) {
  const frontX = r * 0.95 + (isBladeSwinging ? animPhase * 14 : 0);
  const frontY = 0;

  // Draw Dual Serrated Katanas
  drawInosukeDualSerratedKatanas(ctx, 0, 0, isBladeSwinging ? (animPhase - 0.5) * 1.8 : 0, r);

  // Front Pixel Fist
  const handSize = getHandSize(6.5);
  drawPixelHand(ctx, frontX, frontY, handSize, '#FED7AA', '#18181B');
}
