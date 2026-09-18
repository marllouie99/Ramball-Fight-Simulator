// ─────────────────────────────────────────────
// ZEUS FIGHTER SKIN & BODY MODEL (Authentic Pixel Art Edition)
// King of Olympus — God of Thunder & Lightning (Greek Mythology)
//
// Adheres strictly to:
// - Rule 11 (Prohibition of shadowBlur CPU Filters)
// - Rule 18 (HUD Skill Bar Theme Consistency)
// - Rule 19 (Upright Front POV Camera Orientation, Zero Eyes/Mouth/Nose)
// - Rule 19.1 (Proportional Vertical Bands, Flowing Olympian Beard & Golden Laurel Wreath)
// - Rule 20 (Fighter Hand Visibility & Skin Only Guard)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

const P = 2.0; // 2.0px authentic retro pixel grid

/**
 * Discrete Hairline Array for Zeus's Flowing Olympian Crown Mane
 * 27 columns total (gx = -13 to +13, index = gx + 13)
 * Terminating above the face zone (Rule 19.1 compliant).
 */
const ZEUS_HAIRLINE_GY = [
   1,  0, -1, -3, -4, -3, -2, -3, -4, -3, -4, -5, -4, -5, -4, -5, -4, -3, -4, -3, -2, -3, -4, -3, -1,  0,  1
];

/**
 * Discrete Beard Array for Zeus's Flowing Olympian Beard
 * Defines the cascading silver beard boundary from gx = -7 to +7 (index = gx + 7)
 */
const ZEUS_BEARD_BOTTOM_GY = [
  3,  5,  7,  9, 10, 11, 12, 12, 12, 11, 10,  9,  7,  5,  3
];

/**
 * Draws the procedural pixel art body of Zeus (King of Olympus).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character radius
 * @param {boolean} [isStormActive=false] - Whether Divine Wrath / Thunder Storm is active
 */
export function drawZeusPixelBody(ctx, r = 25, isStormActive = false) {
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
        ctx.fillStyle = isStormActive ? '#0284C7' : '#0B1220'; // Deep celestial navy border
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 2. GOLDEN LAUREL WREATH CROWN (KOTINOS DIADEM) (gy between -12 and -8) ──
      const isLaurelWreath = (
        (gy === -11 && Math.abs(gx) <= 8 && Math.abs(gx) >= 1) ||
        (gy === -10 && (Math.abs(gx) === 2 || Math.abs(gx) === 3 || Math.abs(gx) === 5 || Math.abs(gx) === 6 || Math.abs(gx) === 8)) ||
        (gy === -9  && (Math.abs(gx) === 1 || Math.abs(gx) === 4 || Math.abs(gx) === 7))
      );

      // Central Radiant Topaz / Celestial Lightning Diamond Gem
      const isCenterGem = (gx === 0 && (gy === -11 || gy === -10)) || (Math.abs(gx) === 1 && gy === -10);

      if (isCenterGem) {
        if (gx === 0 && gy === -11) {
          ctx.fillStyle = '#FFFFFF'; // Specular diamond glint
        } else {
          ctx.fillStyle = isStormActive ? '#E0F2FE' : '#00FFFF'; // Electric cyan celestial jewel
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      if (isLaurelWreath) {
        if (normY < -0.45 && (gx % 2 === 0)) {
          ctx.fillStyle = '#FEF08A'; // Golden leaf tip glint
        } else if (Math.abs(gx) === 1 || Math.abs(gx) === 4 || Math.abs(gx) === 7) {
          ctx.fillStyle = '#FACC15'; // Brilliant Olympian gold
        } else {
          ctx.fillStyle = '#CA8A04'; // Warm amber gold leaf shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 3. FLOWING SILVER-WHITE CROWN MANE (gy <= hairCutoffGy) ──
      const hairIdx = Math.max(0, Math.min(26, gx + 13));
      const hairCutoffGy = ZEUS_HAIRLINE_GY[hairIdx];
      const isHair = gy <= hairCutoffGy;

      if (isHair) {
        if (isStormActive) {
          // Electrified Divine Crown
          if (normY < -0.70 && (gx % 2 === 0)) {
            ctx.fillStyle = '#FFFFFF';
          } else if (normY < -0.40) {
            ctx.fillStyle = '#BAE6FD'; // Radiant electric sky blue
          } else {
            ctx.fillStyle = '#38BDF8'; // Charged cyan midtone
          }
        } else {
          // Regal Olympian Silver / Platinum Hair
          if (normY < -0.70 && (gx % 2 === 0)) {
            ctx.fillStyle = '#FFFFFF'; // Pure white lightning sheen
          } else if (normY < -0.40) {
            ctx.fillStyle = '#F1F5F9'; // Silvery white mane
          } else if (gy >= hairCutoffGy - 1) {
            ctx.fillStyle = '#94A3B8'; // Slate shadow depth
          } else {
            ctx.fillStyle = '#CBD5E1'; // Platinum silver midtone
          }
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 4. FLOWING MAJESTIC BEARD & MUSTACHE (Center & Lower Face / Chest) ──
      const beardIdx = gx + 7;
      const isInBeardRange = beardIdx >= 0 && beardIdx < ZEUS_BEARD_BOTTOM_GY.length;
      const beardBottomGy = isInBeardRange ? ZEUS_BEARD_BOTTOM_GY[beardIdx] : -999;
      
      // Parted Olympian Mustache (gy = -2 to +1, |gx| <= 5)
      const isMustache = (
        (gy === -2 && Math.abs(gx) <= 4 && Math.abs(gx) >= 1) ||
        (gy === -1 && Math.abs(gx) <= 5) ||
        (gy === 0  && Math.abs(gx) <= 5 && Math.abs(gx) >= 1) ||
        (gy === 1  && (Math.abs(gx) === 4 || Math.abs(gx) === 5)) // Regal downward curls
      );

      // Cascading Flowing Beard (gy >= 0 and gy <= beardBottomGy)
      const isBeard = (gy >= 0 && gy <= beardBottomGy && isInBeardRange);

      if (isMustache || isBeard) {
        if (isStormActive) {
          if (Math.abs(gx) <= 1 && gy % 2 === 0) {
            ctx.fillStyle = '#FFFFFF'; // Blazing center core
          } else if (normY < 0.20) {
            ctx.fillStyle = '#E0F2FE'; // Electric white-blue
          } else if (gy >= beardBottomGy - 1) {
            ctx.fillStyle = '#0284C7'; // Deep blue lightning edge
          } else {
            ctx.fillStyle = '#38BDF8'; // Cyan beard glow
          }
        } else {
          if (isMustache && gy === -1 && Math.abs(gx) <= 2) {
            ctx.fillStyle = '#FFFFFF'; // Mustache top highlight
          } else if (Math.abs(gx) <= 1 && gy % 2 === 0) {
            ctx.fillStyle = '#FFFFFF'; // Flowing beard highlight streak
          } else if (normY < 0.15) {
            ctx.fillStyle = '#F8FAFC'; // Pure silver beard body
          } else if (gy >= beardBottomGy - 1) {
            ctx.fillStyle = '#64748B'; // Deep beard bottom shadow
          } else if (Math.abs(gx) >= 4) {
            ctx.fillStyle = '#94A3B8'; // Side beard lock shadow
          } else {
            ctx.fillStyle = '#CBD5E1'; // Platinum silver midtone
          }
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 5. TANNED OLYMPIAN GOD FACE ZONE (normY > -0.30 && normY <= 0.10) ──
      if (normY <= 0.10) {
        if (normY < -0.18) {
          ctx.fillStyle = '#FDE68A'; // Forehead highlight
        } else if (normY < -0.05) {
          ctx.fillStyle = '#FCD34D'; // Warm sun-kissed Olympian face
        } else {
          ctx.fillStyle = '#F59E0B'; // Cheek & jawline shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 6. OLYMPIAN ROYAL ROBE / TOGA (HIMATION & CHITON) (normY > 0.10 to +1.00) ──

      // A. Golden Lightning Fibula Brooch (Left Shoulder Clasp at gx = -6, gy = 3 to 4)
      const isBrooch = (
        (Math.abs(gx - (-6)) <= 1 && Math.abs(gy - 3) <= 1)
      );
      if (isBrooch) {
        if (gx === -6 && gy === 3) {
          ctx.fillStyle = isStormActive ? '#FFFFFF' : '#00FFFF'; // Electric center sigil
        } else {
          ctx.fillStyle = '#FACC15'; // Polished gold brooch ring
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // B. Golden Olympian Belt / Sash (Zone) (gy >= 10 && gy <= 12)
      const isGoldBelt = gy >= 10 && gy <= 12;
      if (isGoldBelt) {
        // Greek Meander Geometric Pattern in the Belt
        const isMeanderGlint = (Math.abs(gx) % 3 === 0);
        if (isMeanderGlint) {
          ctx.fillStyle = isStormActive ? '#FEF08A' : '#FDE047'; // Bright gold meander key
        } else if (gy === 11) {
          ctx.fillStyle = '#EAB308'; // Polished gold body
        } else {
          ctx.fillStyle = '#A16207'; // Deep bronze belt rim
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // C. Draped Olympian Toga: Left Side White Himation with Gold Trim / Right Side Midnight Blue Tunic
      const isLeftDrapedToga = gx <= -1;

      if (isLeftDrapedToga) {
        // Golden Greek Key Embroidery Trim along the diagonal drape edge (gx === -1 or -2)
        const isGoldTrim = (gx === -1 || (gx === -2 && gy <= 5));
        if (isGoldTrim) {
          if (gy % 2 === 0) {
            ctx.fillStyle = isStormActive ? '#FEF08A' : '#FACC15'; // Gold meander stitch
          } else {
            ctx.fillStyle = '#CA8A04'; // Amber gold thread
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Pure Olympian White Draped Fabric (Himation)
        if (normX < -0.65) {
          ctx.fillStyle = '#CBD5E1'; // Shoulder fold shadow
        } else if (normY < 0.40) {
          ctx.fillStyle = '#FFFFFF'; // Pure white silk fold
        } else if (normY < 0.65) {
          ctx.fillStyle = '#F8FAFC'; // Soft white fabric
        } else {
          ctx.fillStyle = '#E2E8F0'; // Lower drape shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      } else {
        // Right Side: Celestial Midnight Blue Tunic (Storm Night Sky)
        if (normX > 0.65) {
          ctx.fillStyle = isStormActive ? '#0369A1' : '#0F172A'; // Outer navy shadow
        } else if (normY < 0.35) {
          ctx.fillStyle = isStormActive ? '#38BDF8' : '#2563EB'; // Royal sapphire blue highlight
        } else if (normY < 0.60) {
          ctx.fillStyle = isStormActive ? '#0284C7' : '#1D4ED8'; // Celestial blue
        } else {
          ctx.fillStyle = isStormActive ? '#075985' : '#1E293B'; // Deep midnight blue
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }
    }
  }

  ctx.restore();
}

/**
 * Draws Zeus's Celestial Thunderstorm & Electric God Aura (Rule 11 compliant - Zero shadowBlur)
 */
function _drawZeusElectricAura(ctx, r, fighter, now) {
  const isStorm = Boolean(fighter.isChargingStorm || fighter.stormActive);
  const pulse = Math.sin(now * 0.009) * 2.5;
  const auraR = r * (isStorm ? 1.60 : 1.25) + pulse;

  ctx.save();

  // 1. Outer Electric Corona Glow (Concentric Flat Circles)
  ctx.fillStyle = isStorm ? 'rgba(56, 189, 248, 0.28)' : 'rgba(0, 220, 255, 0.14)';
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Middle Radiant Electric Ring
  ctx.strokeStyle = isStorm ? 'rgba(224, 242, 254, 0.85)' : 'rgba(56, 189, 248, 0.50)';
  ctx.lineWidth = isStorm ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, auraR - 2.5, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Crackling Micro-Lightning Sparks along the perimeter
  const numSparks = isStorm ? 6 : 3;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < numSparks; i++) {
    const angle = (now * 0.004 * (i % 2 === 0 ? 1 : -1)) + (i * Math.PI * 2 / numSparks);
    const sparkDist = r + 4 + (Math.sin(now * 0.02 + i) * 6);
    const sx = Math.cos(angle) * sparkDist;
    const sy = Math.sin(angle) * sparkDist;
    const jx = (Math.sin(now * 0.05 + i * 3) - 0.5) * 8;
    const jy = (Math.cos(now * 0.05 + i * 3) - 0.5) * 8;

    ctx.beginPath();
    ctx.moveTo(sx - jx, sy - jy);
    ctx.lineTo(sx, sy);
    ctx.lineTo(sx + jx, sy + jy);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Main Skin Renderer for Zeus (King of Olympus - Authentic Pixel Art Edition)
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} fighter - Fighter instance
 */
export function drawZeusSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const isStorm = Boolean(fighter.isChargingStorm || fighter.stormActive);
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

  // 2. Divine Electric God Aura (Rule 11 compliant)
  if (!isSuppressed) {
    _drawZeusElectricAura(ctx, r, fighter, now);
  }

  // 3. Hand Positioning (Rule 20)
  const skinColor = '#FCD34D'; // Sun-kissed Olympian hand complexion
  const outlineColor = isStorm ? '#0284C7' : '#0B1220';
  const backHandRadius = getHandSize(5.8, fighter);
  const frontHandRadius = getHandSize(6.4, fighter);

  // Attack Pullback & Throw Dynamics
  const attackProgress = (typeof fighter.getAttackProgress === 'function') ? fighter.getAttackProgress() : 1.0;
  let attackPullback = 0;
  if (attackProgress >= 0.5) {
    const p = (attackProgress - 0.5) / 0.5;
    attackPullback = -14 * p * p;
  } else if (attackProgress < 0.3) {
    const p = 1 - (attackProgress / 0.3);
    attackPullback = 12 * p * p * p;
  }

  // LAYER 0: BACK HAND (Behind Body Layer)
  // Only shown when Zeus casts his skyward storm ability (throws weapon to the sky)
  const showBackHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideBackHand && isStorm;
  if (showBackHand) {
    ctx.save();
    // Channeling Storm: Raised high in divine command with crackling spark
    const shakeAmt = 2.0;
    const sx = (Math.random() - 0.5) * shakeAmt;
    const sy = (Math.random() - 0.5) * shakeAmt;
    drawPixelHand(ctx, r * 0.35 + sx, -r * 0.85 + sy, backHandRadius, skinColor, outlineColor);
    ctx.restore();
  }

  // LAYER 1: MAIN BODY (Pixel Circle + Silver Mane + Laurel Wreath + Flowing Beard + Royal Toga)
  drawZeusPixelBody(ctx, r, isStorm);

  // LAYER 2: FRONT HAND (On Top of Body)
  // When charging storm or when showSkinOnly is active, draw the front hand here.
  const showFrontHand = !isPodiumPreview && !fighter.hideFrontHand;
  if (showFrontHand) {
    if (isStorm && !Boolean(state.showSkinOnly)) {
      // Storm Channeling: Raised forward high with celestial power
      const shakeAmt = 2.0;
      const sx = (Math.random() - 0.5) * shakeAmt;
      const sy = (Math.random() - 0.5) * shakeAmt;
      ctx.save();
      drawPixelHand(ctx, r * 0.75 + sx, -r * 0.70 + sy, frontHandRadius, skinColor, outlineColor);
      ctx.restore();
    } else if (Boolean(state.showSkinOnly)) {
      ctx.save();
      const frontHandX = r * 0.85 + attackPullback;
      const frontHandY = r * 0.15;
      drawPixelHand(ctx, frontHandX, frontHandY, frontHandRadius, skinColor, outlineColor);
      ctx.restore();
    }
  }

  // Status Overlays (Stun, Freeze, Paralyze, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}
