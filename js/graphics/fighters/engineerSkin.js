// ─────────────────────────────────────────────
// Engineer FIGHTER SKIN RENDERER (100% Discrete Pixel Art — Saitama Tech)
// Minimalist circle brawler aesthetic, upright front POV, faceless (Rule 19 & 20 compliant)
// Authentic Team Fortress 2 Industrial Worker Aesthetic:
// - Yellow Construction Hard Hat with reinforced ridge & brim
// - Welder Safety Goggles with amber lenses and specular glint
// - Red worker tunic shirt & royal denim blue work overalls with silver strap buckles
// - Heavy stitched brown leather toolbelt with silver buckle & pouch holsters
// - Heavy rubberized leather work gloves
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawEngineerShotgun, drawEngineerWrench } from '../weapons/engineerWeaponGraphics.js';

/**
 * Draws a standardized, authentic retro pixel art work glove for Engineer.
 * Compact and well-proportioned to the body circle and weapons.
 */
export function drawEngineerPixelHand(ctx, cx = 0, cy = 0, radius = 4.2, gloveColor = '#D97706', isHoldingGun = false) {
  if (radius <= 0) return;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const gridR = Math.max(P, radius);
  const steps = Math.ceil((gridR + P) / P);

  ctx.save();
  // 1. Dark Outline Shell
  ctx.fillStyle = '#0B0D12';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const d = Math.hypot(gx * P, gy * P);
      if (d <= gridR + P * 0.7) {
        ctx.fillRect(snap(cx + gx * P), snap(cy + gy * P), P, P);
      }
    }
  }

  // 2. Leather Work Glove Fill
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const d = Math.hypot(rx, ry);
      if (d > gridR) continue;

      const px = snap(cx + rx);
      const py = snap(cy + ry);

      // Top specular highlight
      if (ry < -gridR * 0.35 && rx > -gridR * 0.3) {
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(px, py, P, P);
      }
      // Heel / edge shadow
      else if (ry > gridR * 0.35 || rx < -gridR * 0.45) {
        ctx.fillStyle = '#78350F';
        ctx.fillRect(px, py, P, P);
      }
      // Main glove leather body
      else {
        ctx.fillStyle = gloveColor;
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  // 3. Knuckle Reinforcement / Seam Line
  if (gridR >= 3.5) {
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(snap(cx + P * 0.5), snap(cy - gridR * 0.3), P, P);
  }

  ctx.restore();
}

/**
 * Draws Engineer's entire body circle model in authentic Pixel Art Style.
 * Minimalist circle brawler aesthetic, upright front POV, faceless (Rule #19 compliant).
 */
export function drawEngineerPixelBody(ctx, r) {
  ctx.save();
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

      // Pixelated Dark Stroke Border
      if (Math.hypot(rx + P, ry) > r || Math.hypot(rx - P, ry) > r || Math.hypot(rx, ry + P) > r || Math.hypot(rx, ry - P) > r) {
        ctx.fillStyle = '#0B0D12';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // Zone 1: Yellow Hard Hat & Welder Goggles (ry < -r * 0.15)
      if (ry < -r * 0.15) {
        // 1A. Hard Hat Dome (ry < -r * 0.42)
        if (ry < -r * 0.42) {
          // Center ridge highlight
          if (Math.abs(rx) < P * 0.8 && ry >= -r * 0.85) {
            ctx.fillStyle = '#FFFFFF';
          } else if (ry < -r * 0.70 && Math.abs(rx) < r * 0.45) {
            ctx.fillStyle = '#FEF08A'; // Top bright highlight
          } else if (Math.abs(rx) > r * 0.70 || ry > -r * 0.48) {
            ctx.fillStyle = '#D97706'; // Dome side shadow
          } else {
            ctx.fillStyle = '#FBBF24'; // Construction yellow
          }
        }
        // 1B. Hard Hat Brim (-r * 0.42 <= ry < -r * 0.28)
        else if (ry < -r * 0.28) {
          if (ry <= -r * 0.36) {
            ctx.fillStyle = '#F59E0B'; // Top of brim
          } else {
            ctx.fillStyle = '#B45309'; // Underside shadow of brim
          }
        }
        // 1C. Welder Goggles & Strap (-r * 0.28 <= ry < -r * 0.15)
        else {
          const isLeftLens = (rx >= -r * 0.65 && rx <= -r * 0.15);
          const isRightLens = (rx >= r * 0.15 && rx <= r * 0.65);
          if (isLeftLens || isRightLens) {
            // Lens frame border
            if (Math.abs(rx + r * 0.4) > r * 0.20 || Math.abs(rx - r * 0.4) > r * 0.20 || ry <= -r * 0.26 || ry >= -r * 0.17) {
              ctx.fillStyle = '#181B22'; // Goggle black frame
            } else if ((isLeftLens && rx === snap(-r * 0.4)) || (isRightLens && rx === snap(r * 0.4))) {
              ctx.fillStyle = '#FFFFFF'; // Specular glint
            } else {
              ctx.fillStyle = '#F59E0B'; // Amber tinted glass
            }
          } else {
            // Goggles elastic dark strap / face shadow
            ctx.fillStyle = '#181B22';
          }
        }
        ctx.fillRect(px, py, P, P);
      }
      // Zone 2: Red Worker Shirt & Denim Overalls (-r * 0.15 <= ry < r * 0.38)
      else if (ry < r * 0.38) {
        // Center overalls chest bib & pocket
        const isBib = (Math.abs(rx) <= r * 0.48 && ry >= -r * 0.05);
        const isStrapLeft = (rx >= -r * 0.55 && rx <= -r * 0.32 && ry < -r * 0.05);
        const isStrapRight = (rx >= r * 0.32 && rx <= r * 0.55 && ry < -r * 0.05);
        
        if (isStrapLeft || isStrapRight) {
          // Metallic buckle on strap
          if (ry >= -r * 0.12 && ry <= -r * 0.06) {
            ctx.fillStyle = '#E2E8F0'; // Silver fastener
          } else {
            ctx.fillStyle = '#1D4ED8'; // Denim blue strap
          }
        } else if (isBib) {
          // Chest tool pocket on bib
          const isPocket = (Math.abs(rx) <= r * 0.32 && ry >= r * 0.08 && ry <= r * 0.28);
          if (isPocket) {
            // Pencil / ruler poking out of pocket
            if (rx >= r * 0.12 && rx <= r * 0.22 && ry <= r * 0.14) {
              ctx.fillStyle = '#F59E0B'; // Yellow carpenter pencil
            } else if (ry === snap(r * 0.08)) {
              ctx.fillStyle = '#172554'; // Pocket rim
            } else {
              ctx.fillStyle = '#1E3A8A'; // Pocket body
            }
          } else {
            ctx.fillStyle = '#2563EB'; // Royal denim blue overalls
          }
        } else {
          // Red Worker Tunic Shirt
          if (ry < 0 && Math.abs(rx) < r * 0.35) {
            ctx.fillStyle = '#EF4444'; // Top collar highlight
          } else if (Math.abs(rx) > r * 0.65) {
            ctx.fillStyle = '#991B1B'; // Sleeve shadow
          } else {
            ctx.fillStyle = '#DC2626'; // Red work shirt
          }
        }
        ctx.fillRect(px, py, P, P);
      }
      // Zone 3: Heavy Leather Toolbelt & Buckle (r * 0.38 <= ry < r * 0.62)
      else if (ry < r * 0.62) {
        // Center Toolbelt Buckle
        const isBuckle = (Math.abs(rx) <= r * 0.28 && Math.abs(ry - r * 0.48) <= r * 0.10);
        if (isBuckle) {
          if (Math.abs(rx) >= r * 0.24 || Math.abs(ry - r * 0.48) >= r * 0.08) {
            ctx.fillStyle = '#181B22'; // Dark buckle frame
          } else if (rx < -P && ry < r * 0.48) {
            ctx.fillStyle = '#FFFFFF'; // Buckle glint
          } else {
            ctx.fillStyle = '#CBD5E1'; // Heavy silver plate
          }
        } else {
          // Brown leather toolbelt & side pouch slots
          if (Math.abs(rx) > r * 0.55) {
            ctx.fillStyle = '#451A03'; // Heavy pouch shadow
          } else if (ry < r * 0.44) {
            ctx.fillStyle = '#92400E'; // Top leather highlight
          } else {
            ctx.fillStyle = '#78350F'; // Stitched leather belt
          }
        }
        ctx.fillRect(px, py, P, P);
      }
      // Zone 4: Denim Work Pants & Steel-Toe Boots (ry >= r * 0.62)
      else {
        // Steel-toe work boots
        if (ry >= r * 0.76) {
          if (Math.abs(rx) < r * 0.50 && ry <= r * 0.82) {
            ctx.fillStyle = '#475569'; // Steel toe cap highlight
          } else {
            ctx.fillStyle = '#181B22'; // Dark boot leather
          }
        } else {
          // Denim pants lower fold
          ctx.fillStyle = '#172554';
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  ctx.restore();
}

/**
 * Main entry point for drawing Engineer's skin and equipped weapons in 100% discrete pixel art style.
 */
export function drawEngineerSkin(ctx, fighter) {
  const r = fighter.r || 20;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || fighter.angle || 0);

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  const lastWeapon = fighter.lastWeaponUsed || 'shotgun';
  const isWrenchActive = lastWeapon === 'wrench';
  const wrenchTimer = fighter.wrenchTimer || 0;
  const wrenchAngle = fighter.wrenchAngle || 0;
  const wrenchSlashFade = fighter.wrenchSlashFadeTimer || 0;
  const shotgunRecoil = fighter.shotgunRecoilTimer || 0;
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands || fighter.hideFrontHand || isPodiumPreview;

  // ── LAYER 1: BACK WEAPON (STOWED ON BACK LAYER) ──
  if (isWrenchActive) {
    // Shotgun stowed on back
    drawEngineerShotgun(ctx, 0, 0, 0, r, true, 0, true, fighter.color, shouldHideHands, isPodiumPreview);
  } else {
    // Wrench stowed on back
    drawEngineerWrench(ctx, 0, 0, 0, r, true, 0, true, fighter.color, 0, shouldHideHands, isPodiumPreview);
  }

  // ── LAYER 2: 100% DISCRETE PROCEDURAL PIXEL ART BODY (SAITAMA TECH & RULE 19 COMPLIANT) ──
  drawEngineerPixelBody(ctx, r);

  // ── LAYER 3: FRONT WEAPON (ACTIVE WEAPON ON TOP OF BODY) ──
  if (isWrenchActive) {
    drawEngineerWrench(ctx, 0, 0, (fighter.wrenchActive ? wrenchAngle : 0), r, true, (fighter.wrenchActive ? wrenchTimer : 0), false, fighter.color, wrenchSlashFade, shouldHideHands, isPodiumPreview);
  } else {
    drawEngineerShotgun(ctx, 0, 0, 0, r, true, shotgunRecoil, false, fighter.color, shouldHideHands, isPodiumPreview);
  }

  // Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}
