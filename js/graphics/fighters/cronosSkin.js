// ─────────────────────────────────────────────
// CRONUS (CRONOS) FIGHTER SKIN & BODY MODEL (Authentic Pixel Art Edition)
// King of the Titans & God of Time / Ages (Greek Mythology)
//
// Adheres strictly to:
// - Rule 11 (Prohibition of shadowBlur CPU Filters)
// - Rule 18 (HUD Skill Bar Theme Consistency)
// - Rule 19 (Upright Front POV Camera Orientation, Zero Eyes/Mouth/Nose)
// - Rule 19.1 (Proportional Vertical Bands, Flowing Starlight Mane & Golden Chrono Diadem)
// - Rule 20 (Fighter Hand Visibility & Skin Only Guard)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

const P = 2.0; // 2.0px authentic retro pixel grid

/**
 * Discrete Hairline Array for Cronus's Flowing Starlight Mane
 * 27 columns total (gx = -13 to +13, index = gx + 13)
 * Terminating above the face zone (Rule 19.1 compliant).
 */
const CRONOS_HAIRLINE_GY = [
   1,  0, -1, -3, -4, -3, -2, -4, -5, -4, -5, -6, -5, -6, -5, -6, -5, -4, -5, -4, -2, -3, -4, -3, -1,  0,  1
];

/**
 * Draws the procedural pixel art body of Cronus (King of the Titans / God of Time).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character radius
 * @param {boolean} [isSphereActive=false] - Whether Time Stop Sphere is active
 */
export function drawCronosPixelBody(ctx, r = 25, isSphereActive = false) {
  const steps = Math.ceil((r + 4) / P);

  ctx.save();

  // 100% Symmetrical 4-Way Discrete Pixel Art Rasterization
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const d = Math.hypot(rx, ry);

      // Strict Circle Clipping
      if (d > r) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;

      const normX = rx / r; // -1.0 to +1.0
      const normY = ry / r; // -1.0 to +1.0

      // ── 1. OUTER STEPPED DARK INK OUTLINE SHELL (Rule 19) ──
      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );

      if (isBorder) {
        ctx.fillStyle = isSphereActive ? '#00F3FF' : '#080F1E'; // Electric cyan border during Time Stop, else deep cosmic obsidian
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 2. GOLDEN CHRONO DIADEM / CIRCLET OF THE AGES (gy between -12 and -8) ──
      const isDiadem = (
        (gy === -11 && Math.abs(gx) <= 7 && Math.abs(gx) >= 1) ||
        (gy === -10 && (Math.abs(gx) <= 8 && Math.abs(gx) >= 1)) ||
        (gy === -9  && (Math.abs(gx) === 1 || Math.abs(gx) === 3 || Math.abs(gx) === 6))
      );

      // Central Radiant Chrono Jewel / Starlight Diamond (gx = 0, gy = -11 to -9)
      const isCenterJewel = (
        (gx === 0 && (gy === -11 || gy === -10 || gy === -9)) ||
        (Math.abs(gx) === 1 && gy === -10)
      );

      if (isCenterJewel) {
        if (gx === 0 && gy === -11) {
          ctx.fillStyle = '#FFFFFF'; // Specular white glint
        } else if (gx === 0 && gy === -10) {
          ctx.fillStyle = isSphereActive ? '#FFFFFF' : '#00F3FF'; // Pure cyan temporal crystal core
        } else {
          ctx.fillStyle = isSphereActive ? '#BAE6FD' : '#38BDF8'; // Facet blue
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      if (isDiadem) {
        if (normY < -0.45 && (gx % 2 === 0)) {
          ctx.fillStyle = '#FEF08A'; // Golden diadem specular glint
        } else if (Math.abs(gx) <= 4) {
          ctx.fillStyle = '#FACC15'; // Brilliant Olympian/Titan gold
        } else {
          ctx.fillStyle = '#CA8A04'; // Warm amber gold wing shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 3. FLOWING STARLIGHT / PLATINUM MANE (gy <= hairCutoffGy) ──
      const hairIdx = Math.max(0, Math.min(26, gx + 13));
      const hairCutoffGy = CRONOS_HAIRLINE_GY[hairIdx];
      const isHair = gy <= hairCutoffGy;

      if (isHair) {
        if (isSphereActive) {
          // Electrified Chrono Mana Surge
          if (normY < -0.70 && (gx % 2 === 0)) {
            ctx.fillStyle = '#FFFFFF';
          } else if (normY < -0.40) {
            ctx.fillStyle = '#E0F2FE'; // Electric starlight blue
          } else {
            ctx.fillStyle = '#38BDF8'; // Charged cyan midtone
          }
        } else {
          // Ancient Titan Starlight & Platinum Silver Hair
          if (normY < -0.70 && (gx % 2 === 0)) {
            ctx.fillStyle = '#FFFFFF'; // Pure white starlight sheen
          } else if (normY < -0.40) {
            ctx.fillStyle = '#E0F2FE'; // Pale starlight silver
          } else if (gy >= hairCutoffGy - 1) {
            ctx.fillStyle = '#64748B'; // Slate shadow depth
          } else {
            ctx.fillStyle = '#CBD5E1'; // Platinum silver midtone
          }
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 4. ETHEREAL GOD FACE AREA (normY > -0.30 && normY <= 0.10) ──
      // Strictly Faceless Minimalist — Zero Eyes, Mouth, Nose (Rule 19)
      if (normY <= 0.10) {
        if (normY < -0.18) {
          ctx.fillStyle = '#FDE68A'; // Forehead starlight glow
        } else if (normY < -0.05) {
          ctx.fillStyle = '#FCD34D'; // Warm ethereal pale complexion
        } else {
          ctx.fillStyle = '#F59E0B'; // Jawline & cheek shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 5. GILDED TITAN GORGET & COLLAR (gy = 2 to 4) ──
      const isCollar = gy >= 2 && gy <= 4;
      if (isCollar) {
        // Central Temporal Energy Conduit Nexus (gx = 0 or |gx| === 1)
        if (Math.abs(gx) <= 1) {
          if (gx === 0 && gy === 3) {
            ctx.fillStyle = '#FFFFFF'; // Glowing core node
          } else {
            ctx.fillStyle = isSphereActive ? '#E0F2FE' : '#00F3FF'; // Pure cyan energy nexus
          }
        } else if (Math.abs(gx) <= 5) {
          ctx.fillStyle = (gy === 2 || (Math.abs(gx) % 2 === 0)) ? '#FACC15' : '#CA8A04'; // Polished gold gorget plates
        } else {
          ctx.fillStyle = '#94A3B8'; // Shoulder pauldrons silver rim
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 6. OBSIDIAN TITAN CUIRASS & CELESTIAL TUNIC (gy = 5 to 9) ──
      const isCuirass = gy >= 5 && gy <= 9;
      if (isCuirass) {
        // Central Glowing Chrono Energy Channel running down the center
        if (gx === 0) {
          ctx.fillStyle = (gy === 6 || gy === 8) ? '#FFFFFF' : (isSphereActive ? '#BAE6FD' : '#00F3FF');
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Clockwork Gold Filigree Inlays at |gx| === 3 or 4
        if ((Math.abs(gx) === 3 && (gy === 6 || gy === 8)) || (Math.abs(gx) === 4 && gy === 7)) {
          ctx.fillStyle = isSphereActive ? '#FEF08A' : '#FACC15';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Obsidian Breastplate Body
        if (normX < -0.55 || normX > 0.55) {
          ctx.fillStyle = '#080D1A'; // Deep side shadow
        } else if (gy <= 6) {
          ctx.fillStyle = '#1E293B'; // Upper chestplate steel
        } else {
          ctx.fillStyle = '#0F172A'; // Obsidian midtone
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 7. GOLDEN CHRONO OUROBOROS TIME BELT & SASH (gy = 10 to 12) ──
      const isBelt = gy >= 10 && gy <= 12;
      if (isBelt) {
        // Central Clockwork Buckle with Chrono Gem
        if (Math.abs(gx) <= 1) {
          if (gx === 0 && gy === 11) {
            ctx.fillStyle = isSphereActive ? '#FFFFFF' : '#00F3FF'; // Temporal core buckle gem
          } else {
            ctx.fillStyle = '#FEF08A'; // Gold buckle bezel
          }
        } else if (Math.abs(gx) % 2 === 0) {
          ctx.fillStyle = '#FACC15'; // Gold belt links
        } else {
          ctx.fillStyle = '#A16207'; // Deep bronze belt shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 8. LOWER CELESTIAL ROBES & TASSETS (gy >= 13) ──
      // Gold hem embroidery on the skirt bottom
      if (gy === steps || Math.abs(gy - steps) <= 1) {
        if (gx % 2 === 0) {
          ctx.fillStyle = '#CA8A04'; // Gold hem trim
        } else {
          ctx.fillStyle = '#0F172A'; // Dark navy hem
        }
      } else {
        if (normX < -0.50 || normX > 0.50) {
          ctx.fillStyle = '#080D1A'; // Shadowed robe fold
        } else if (Math.abs(gx) <= 2) {
          ctx.fillStyle = isSphereActive ? '#0369A1' : '#1E293B'; // Center drape fold
        } else {
          ctx.fillStyle = '#0F172A'; // Midnight blue fabric
        }
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  ctx.restore();
}

/**
 * Draws Cronus's Pulsing Chrono Halo & Orbiting Clock Dial Ticks (Rule 11 compliant - Zero shadowBlur)
 */
export function _drawCronosChronoAura(ctx, r, fighter, now) {
  const isSphere = Boolean(fighter.sphereActive && fighter.sphereTimer > 0);
  const pulse = Math.sin(now * 0.008) * 2.2;
  const auraR = r * (isSphere ? 1.55 : 1.25) + pulse;

  ctx.save();

  // 1. Outer Chrono Corona Glow (Concentric Flat Circles)
  ctx.fillStyle = isSphere ? 'rgba(0, 243, 255, 0.25)' : 'rgba(0, 213, 255, 0.12)';
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Middle Radiant Chrono Ring
  ctx.strokeStyle = isSphere ? 'rgba(224, 242, 254, 0.85)' : 'rgba(0, 243, 255, 0.45)';
  ctx.lineWidth = isSphere ? 2.2 : 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, auraR - 2.0, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Clock Dial Hour / Minute Tick Marks orbiting clockwise
  const numTicks = 8;
  const tickAngleOffset = (now * 0.0015) % (Math.PI * 2);
  ctx.strokeStyle = isSphere ? '#FFFFFF' : 'rgba(0, 243, 255, 0.85)';
  ctx.lineWidth = 1.4;

  for (let i = 0; i < numTicks; i++) {
    const ang = tickAngleOffset + (i * Math.PI * 2 / numTicks);
    const innerDist = auraR - 6.0;
    const outerDist = auraR - 1.0;
    const isMajor = (i % 2 === 0);

    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);

    ctx.beginPath();
    ctx.moveTo(cosA * (isMajor ? innerDist - 2 : innerDist), sinA * (isMajor ? innerDist - 2 : innerDist));
    ctx.lineTo(cosA * outerDist, sinA * outerDist);
    ctx.stroke();
  }

  // 4. Subtle Chrono Temporal Sparks
  if (isSphere) {
    const numSparks = 4;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < numSparks; i++) {
      const sparkAng = (now * 0.003 * (i % 2 === 0 ? 1 : -1)) + (i * Math.PI * 2 / numSparks);
      const sparkDist = r + 5 + Math.sin(now * 0.02 + i) * 8;
      const sx = Math.cos(sparkAng) * sparkDist;
      const sy = Math.sin(sparkAng) * sparkDist;

      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Main Skin Renderer for Cronus (King of the Titans - Authentic Pixel Art Edition)
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} fighter - Fighter instance
 */
export function drawCronosSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const isSphereActive = Boolean(fighter.sphereActive && fighter.sphereTimer > 0);
  const now = Date.now();

  const isSuppressed = !isPodiumPreview && Boolean(
    fighter.isTargetOfAmbush ||
    (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
  );

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft && !fighter.isSpinning) {
    ctx.scale(1, -1);
  }

  // 2. Pulsing Chrono Halo Aura (Rule 11 compliant)
  if (!isSuppressed) {
    _drawCronosChronoAura(ctx, r, fighter, now);
  }

  // 3. Hand Positioning (Rule 20)
  const skinColor = '#FCD34D'; // Warm ethereal pale complexion
  const outlineColor = isSphereActive ? '#00F3FF' : '#080F1E';
  const backHandRadius = getHandSize(5.6, fighter);
  const frontHandRadius = getHandSize(6.2, fighter);

  // Attack Pullback & Lunge Dynamics
  const isMeleeActive = Boolean(fighter.meleeSwingActive || fighter.meleeSwingTimer > 0);
  let swingLunge = 0;
  if (isMeleeActive) {
    const dur = fighter._def?.meleeSwingDuration || 20;
    const progress = 1 - Math.max(0, (fighter.meleeSwingTimer || 0) / dur);
    swingLunge = Math.sin(progress * Math.PI) * 12;
  }

  // LAYER 0: BACK HAND (Behind Body Layer)
  const showBackHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideBackHand;
  if (showBackHand) {
    ctx.save();
    // Guarding / Stasis gesture: slightly raised behind body
    const backHandX = -r * 0.20;
    const backHandY = -r * 0.70;
    drawPixelHand(ctx, backHandX, backHandY, backHandRadius, skinColor, outlineColor);
    ctx.restore();
  }

  // LAYER 1: MAIN PIXEL BODY (Obsidian Cuirass + Starlight Mane + Golden Diadem + Ouroboros Belt)
  drawCronosPixelBody(ctx, r, isSphereActive);

  // LAYER 2: FRONT HAND (On Top of Body)
  // Only rendered directly if showSkinOnly is active (as weapon renderer draws the gripping hand when weapon is active)
  const showFrontHand = !isPodiumPreview && !fighter.hideFrontHand;
  if (showFrontHand && Boolean(state.showSkinOnly)) {
    ctx.save();
    const frontHandX = r * 0.80 + swingLunge;
    const frontHandY = r * 0.10;
    drawPixelHand(ctx, frontHandX, frontHandY, frontHandRadius, skinColor, outlineColor);
    ctx.restore();
  }

  // Status Overlays (Stun, Freeze, Paralyze, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}

/**
 * Backwards compatible alias for drawCronosBody
 */
export function drawCronosBody(ctx, r, angle = 0) {
  drawCronosPixelBody(ctx, r, false);
}
