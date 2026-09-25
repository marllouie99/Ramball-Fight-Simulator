// ─────────────────────────────────────────────
// Engineer FIGHTER SKIN RENDERER (100% Discrete Pixel Art — Saitama Tech)
// Minimalist circle brawler aesthetic, upright front POV, faceless (Rule 19 & 20 compliant)
// Authentic Team Fortress 2 RED Engineer Aesthetic:
// - Orange Construction Hard Hat with reinforced ridge & brim
// - Dark Safety Goggles / Sunglasses with opaque tinted lenses
// - Red work shirt with white V-neck undershirt & orange reflective armband stripes
// - Dark charcoal-brown overalls with brass buckle clasps
// - Heavy stitched brown leather toolbelt with brass buckle & pouch holsters
// - Dark brown work pants with tan knee pads & steel-toe boots
// - Heavy rubberized leather work gloves
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawEngineerShotgun, drawEngineerWrench } from '../weapons/engineerWeaponGraphics.js';

// ── Engineer Hard Hat PNG Asset Loader (Lazy-load & Cache Pattern — Escanor-style) ──
let _engineerHairImage = null;
let _engineerHairImageLoading = false;

/**
 * Lazy-loads and caches the Engineer hard hat PNG asset.
 * @returns {HTMLImageElement|null}
 */
export function _getEngineerHairImage() {
  if (_engineerHairImage && _engineerHairImage.complete && _engineerHairImage.naturalWidth > 0) {
    return _engineerHairImage;
  }
  if (!_engineerHairImageLoading && typeof Image !== 'undefined') {
    _engineerHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _engineerHairImage = img;
      _engineerHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Engineer hair image at Assets/model/Hair/Engineer-Hair.png', e);
      _engineerHairImageLoading = false;
    };
    img.src = 'Assets/model/Hair/Engineer-Hair.png?v=1';
    _engineerHairImage = img;
  }
  return _engineerHairImage;
}

// Pre-load on module init
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getEngineerHairImage();
}

/**
 * Draws Engineer's construction hard hat from Assets/model/Hair/Engineer-Hair.png.
 * Overlaid on top of the procedural pixel body circle, replacing the procedural hat zone.
 * Uses nearest-neighbor scaling for crisp pixel art fidelity (Rule 19 / Rule 3.5).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawEngineerHair(ctx, r, facingLeft = false) {
  const hairImg = _getEngineerHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp pixel art fidelity (Rule 19)

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.engineer) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;

    // Engineer-Hair.png (1280x1229). Visible hard hat bounding box:
    // X: [120, 1159] (width 1039, horizontal center at 639.5)
    // Y: [234, 1009] (height 775, top crown at 234)
    // Scales to cover the upper head hemisphere with the hat sitting naturally on top
    const targetHatWidth = r * 2.60 * wMult;
    const targetHatHeight = r * 1.55 * hMult;
    const scaleX = targetHatWidth / 1039;
    const scaleY = targetHatHeight / 775;
    const drawW = 1280 * scaleX;
    const drawH = 1229 * scaleY;
    const drawX = -639.5 * scaleX + offX;
    const drawY = -r * 1.15 - 234 * scaleY + offY;

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
      const normX = rx / r;
      const normY = ry / r;

      // Pixelated Dark Stroke Border
      if (Math.hypot(rx + P, ry) > r || Math.hypot(rx - P, ry) > r || Math.hypot(rx, ry + P) > r || Math.hypot(rx, ry - P) > r) {
        ctx.fillStyle = '#0B0D12';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // Zone 1: Orange Construction Hard Hat & Dark Safety Goggles (normY < -0.15)
      if (normY < -0.15) {
        // 1A. Hard Hat Dome (normY < -0.42)
        if (normY < -0.42) {
          // Center reinforced ridge highlight
          if (Math.abs(rx) < P * 0.8 && normY >= -0.85) {
            ctx.fillStyle = '#FEF3C7'; // Bright ridge specular
          } else if (normY < -0.70 && Math.abs(normX) < 0.45) {
            ctx.fillStyle = '#FB923C'; // Top orange highlight
          } else if (Math.abs(normX) > 0.70 || normY > -0.48) {
            ctx.fillStyle = '#C2410C'; // Dome side deep shadow
          } else {
            ctx.fillStyle = '#EA580C'; // TF2 construction orange
          }
        }
        // 1B. Hard Hat Brim (-0.42 <= normY < -0.28)
        else if (normY < -0.28) {
          if (normY <= -0.36) {
            ctx.fillStyle = '#F97316'; // Top of brim orange
          } else {
            ctx.fillStyle = '#9A3412'; // Underside brim deep shadow
          }
        }
        // 1C. Dark Safety Goggles & Strap (-0.28 <= normY < -0.15)
        else {
          const isLeftLens = (normX >= -0.65 && normX <= -0.15);
          const isRightLens = (normX >= 0.15 && normX <= 0.65);
          if (isLeftLens || isRightLens) {
            // Lens frame border
            if (Math.abs(normX + 0.4) > 0.20 || Math.abs(normX - 0.4) > 0.20 || normY <= -0.26 || normY >= -0.17) {
              ctx.fillStyle = '#111114'; // Dark goggle frame
            } else if ((isLeftLens && rx === snap(-r * 0.4)) || (isRightLens && rx === snap(r * 0.4))) {
              ctx.fillStyle = '#94A3B8'; // Subtle dark lens glint
            } else {
              ctx.fillStyle = '#1C1917'; // Dark tinted sunglasses lens (TF2 style)
            }
          } else {
            // Goggles elastic dark strap
            ctx.fillStyle = '#111114';
          }
        }
        ctx.fillRect(px, py, P, P);
      }
      // Zone 2: FACE / SKIN — Tanned Rugged Face, Chin, Jawline & Stubble (-0.15 <= normY < 0.16)
      // Rule 3.2 compliant: NO eyes, mouth, nose — only skin tones, jaw contour & stubble shadow
      else if (normY < 0.16) {
        // Upper face directly below goggles — forehead/cheek highlight
        if (normY < -0.04) {
          if (Math.abs(normX) < 0.20) {
            ctx.fillStyle = '#EDCAAA'; // Center face skin highlight (under goggle bridge)
          } else if (Math.abs(normX) < 0.55) {
            ctx.fillStyle = '#E0B896'; // Cheek skin warm tone
          } else {
            ctx.fillStyle = '#D4A07A'; // Side face shadow (under goggle frame edges)
          }
        }
        // Mid face — chin & jaw area with 5 o'clock stubble shadow
        else if (normY < 0.08) {
          if (Math.abs(normX) < 0.15) {
            // Center chin cleft / dimple shadow
            ctx.fillStyle = '#C89670'; // Chin center shadow
          } else if (Math.abs(normX) < 0.45) {
            // Stubble zone — discrete scattered dark pixels for 5 o'clock shadow
            const stubbleHash = ((gx * 31 + gy * 17) & 7);
            if (stubbleHash < 2) {
              ctx.fillStyle = '#A67B5B'; // Dark stubble dot
            } else {
              ctx.fillStyle = '#D4A882'; // Normal jaw skin
            }
          } else {
            ctx.fillStyle = '#C89670'; // Outer jawline shadow
          }
        }
        // Lower face / neck transition
        else {
          if (Math.abs(normX) < 0.18) {
            ctx.fillStyle = '#D4A882'; // Center neck skin
          } else if (Math.abs(normX) < 0.42) {
            // More stubble on lower jaw
            const stubbleHash = ((gx * 23 + gy * 13) & 7);
            if (stubbleHash < 3) {
              ctx.fillStyle = '#A67B5B'; // Dark stubble dot
            } else {
              ctx.fillStyle = '#C89670'; // Jaw/neck skin shadow
            }
          } else {
            ctx.fillStyle = '#B8855F'; // Deep neck/jaw edge shadow
          }
        }
        ctx.fillRect(px, py, P, P);
      }
      // Zone 3: Red Work Shirt & Dark Charcoal-Brown Overalls (0.16 <= normY < 0.48)
      else if (normY < 0.48) {
        // Overalls chest bib (dark brown/charcoal center panel)
        const isBib = (Math.abs(normX) <= 0.48 && normY >= 0.24);
        // Overalls shoulder straps (over the red shirt)
        const isStrapLeft = (normX >= -0.55 && normX <= -0.32 && normY < 0.24);
        const isStrapRight = (normX >= 0.32 && normX <= 0.55 && normY < 0.24);

        if (isStrapLeft || isStrapRight) {
          // Brass buckle/clasp on strap
          if (normY >= 0.18 && normY <= 0.23) {
            ctx.fillStyle = '#D4A017'; // Brass buckle fastener
          } else {
            ctx.fillStyle = '#3C2A1A'; // Dark brown overalls strap
          }
        } else if (isBib) {
          // Chest tool pocket on bib
          const isPocket = (Math.abs(normX) <= 0.32 && normY >= 0.30 && normY <= 0.42);
          if (isPocket) {
            // Yellow carpenter pencil poking out
            if (normX >= 0.12 && normX <= 0.22 && normY <= 0.34) {
              ctx.fillStyle = '#F59E0B'; // Yellow carpenter pencil
            } else if (ry === snap(r * 0.30)) {
              ctx.fillStyle = '#1C1210'; // Pocket rim stitching
            } else {
              ctx.fillStyle = '#2D1F14'; // Pocket body dark brown
            }
          } else {
            ctx.fillStyle = '#44332A'; // Dark charcoal-brown overalls bib
          }
        } else {
          // Red Work Shirt (visible on shoulders/sleeves outside overalls)
          // White V-neck undershirt collar visible at top center
          if (normY < 0.22 && Math.abs(normX) < 0.22) {
            ctx.fillStyle = '#F5F5F4'; // White undershirt V-neck collar
          } else if (normY < 0.22 && Math.abs(normX) < 0.35) {
            ctx.fillStyle = '#EF4444'; // Red shirt collar edges
          }
          // Orange reflective armband stripe on outer sleeves
          else if (Math.abs(normX) > 0.58 && Math.abs(normX) < 0.72 && normY >= 0.26 && normY <= 0.34) {
            ctx.fillStyle = '#F97316'; // Orange safety reflective stripe
          } else if (Math.abs(normX) > 0.72 && normY >= 0.26 && normY <= 0.34) {
            ctx.fillStyle = '#C2410C'; // Stripe shadow on outer edge
          }
          // Sleeve shadow on outer edges
          else if (Math.abs(normX) > 0.65) {
            ctx.fillStyle = '#991B1B'; // Deep sleeve shadow
          } else {
            ctx.fillStyle = '#DC2626'; // TF2 RED team work shirt
          }
        }
        ctx.fillRect(px, py, P, P);
      }
      // Zone 4: Heavy Leather Toolbelt & Brass Buckle (0.48 <= normY < 0.66)
      else if (normY < 0.66) {
        // Center Toolbelt Buckle
        const isBuckle = (Math.abs(normX) <= 0.28 && Math.abs(normY - 0.56) <= 0.06);
        if (isBuckle) {
          if (Math.abs(normX) >= 0.24 || Math.abs(normY - 0.56) >= 0.04) {
            ctx.fillStyle = '#181B22'; // Dark buckle frame
          } else if (normX < -0.05 && normY < 0.56) {
            ctx.fillStyle = '#FFFBEB'; // Buckle glint
          } else {
            ctx.fillStyle = '#D4A017'; // Heavy brass plate
          }
        } else {
          // Brown leather toolbelt & side pouch slots
          if (Math.abs(normX) > 0.50) {
            ctx.fillStyle = '#3B1A06'; // Heavy pouch deep shadow
          } else if (normY < 0.53) {
            ctx.fillStyle = '#92400E'; // Top leather highlight
          } else {
            ctx.fillStyle = '#78350F'; // Stitched leather belt
          }
        }
        ctx.fillRect(px, py, P, P);
      }
      // Zone 5: Dark Brown Work Pants, Tan Knee Pads & Steel-Toe Boots (normY >= 0.66)
      else {
        // Steel-toe dark work boots
        if (normY >= 0.84) {
          if (Math.abs(normX) < 0.38 && normY <= 0.90) {
            ctx.fillStyle = '#3F3F46'; // Steel toe cap highlight
          } else {
            ctx.fillStyle = '#111114'; // Dark boot leather
          }
        }
        // Tan Knee Pads (TF2 style — distinct patches on knees)
        else if (normY >= 0.72 && normY <= 0.82 && Math.abs(normX) >= 0.10 && Math.abs(normX) <= 0.48) {
          // Knee pad outline
          if (normY <= 0.73 || normY >= 0.81 || Math.abs(normX) >= 0.45) {
            ctx.fillStyle = '#92400E'; // Leather knee pad edge stitching
          } else if (normY <= 0.75) {
            ctx.fillStyle = '#D4A45A'; // Tan knee pad highlight
          } else {
            ctx.fillStyle = '#B8860B'; // Tan knee pad body
          }
        }
        // Dark brown/charcoal work pants
        else {
          if (Math.abs(normX) > 0.48) {
            ctx.fillStyle = '#1C1210'; // Outer leg deep shadow
          } else if (normY < 0.72) {
            ctx.fillStyle = '#3C2A1A'; // Upper pants charcoal-brown
          } else {
            ctx.fillStyle = '#2D1F14'; // Lower pants darker fold
          }
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
  const angle = isPodiumPreview ? (fighter.gunAngle || 0) : (fighter.gunAngle || fighter.angle || 0);

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

  // ── LAYER 3: HARD HAT PNG OVERLAY (Assets/model/Hair/Engineer-Hair.png) ──
  _drawEngineerHair(ctx, r, facingLeft);

  // ── LAYER 4: FRONT WEAPON (ACTIVE WEAPON ON TOP OF BODY) ──
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
