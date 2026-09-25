// ─────────────────────────────────────────────
// GUNSLINGER FIGHTER SKIN & BODY MODEL (Authentic Pixel Art Edition)
// Western Outlaw Elf Gunslinger (Cowboy Hat Edition)
//
// Adheres strictly to:
// - Rule 11 (Prohibition of shadowBlur CPU Filters)
// - Rule 18 (HUD Skill Bar Theme Consistency)
// - Rule 19 (Upright Front POV Camera Orientation, Zero Eyes/Mouth/Nose)
// - Rule 19.1 (Proportional Vertical Bands, Discrete Lock Hairline, Elf Silhouette)
// - Rule 20 (Fighter Hand Visibility & Skin Only Guard)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

const P = 2.0; // 2.0px authentic retro pixel grid

let _gunslingerHairImage = null;
let _gunslingerHairImageLoading = false;

/**
 * Lazy-loads and caches the Gunslinger Cowboy Hat PNG asset.
 * @returns {HTMLImageElement|null}
 */
export function _getGunslingerHairImage() {
  if (_gunslingerHairImage && _gunslingerHairImage.complete && _gunslingerHairImage.naturalWidth > 0) {
    return _gunslingerHairImage;
  }
  if (!_gunslingerHairImageLoading && typeof Image !== 'undefined') {
    _gunslingerHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _gunslingerHairImage = img;
      _gunslingerHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Gunslinger hair image at Assets/model/Hair/Gunslinger-hair.png', e);
      _gunslingerHairImageLoading = false;
    };
    img.src = 'Assets/model/Hair/Gunslinger-hair.png?v=1';
    _gunslingerHairImage = img;
  }
  return _gunslingerHairImage;
}

// Pre-load on module init
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getGunslingerHairImage();
}

/**
 * Draws Gunslinger's authentic cowboy hat from Assets/model/Hair/Gunslinger-hair.png.
 * Overlaid on top of the procedural pixel body circle.
 * Uses nearest-neighbor scaling for crisp pixel art fidelity (Rule 19 / Rule 3.5).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawGunslingerHair(ctx, r, facingLeft = false) {
  const hairImg = _getGunslingerHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp pixel art fidelity (Rule 19)

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.gunslinger) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;

    // Gunslinger-hair.png (1536x1024). Visible cowboy hat bounding box:
    // X: [0, 1516] (width 1517, horizontal center at 758)
    // Y: [7, 1023] (height 1017, top crown at 7)
    // Scales to sit naturally on top of Gunslinger's head
    const targetHatWidth = r * 2.80 * wMult;
    const targetHatHeight = r * 1.85 * hMult;
    const scaleX = targetHatWidth / 1517;
    const scaleY = targetHatHeight / 1017;
    const drawW = 1536 * scaleX;
    const drawH = 1024 * scaleY;
    const drawX = -758 * scaleX + offX;
    const drawY = -r * 1.32 - 7 * scaleY + offY;

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
 * Discrete Hairline Array for Gunslinger's Flowing Dark Locks & Fringe
 * 27 columns total (gx = -13 to +13, index = gx + 13)
 * Terminating above the face zone (Rule 19.1 compliant).
 */
const GUNSLINGER_HAIRLINE_GY = [
   0, -1, -2, -4, -5, -4, -3, -5, -6, -5, -6, -7, -6, -7, -6, -7, -6, -5, -6, -5, -3, -4, -5, -4, -2, -1,  0
];

// Offscreen canvas cache for Gunslinger's pixel body model (eliminates sub-pixel grid lines and avoids thousands of fillRect calls)
let _cachedGunslingerBodyCanvas = null;
let _cachedGunslingerBodyR = 0;

function _renderGunslingerPixelBodyToCanvas(destCtx, r) {
  destCtx.imageSmoothingEnabled = false;
  const steps = Math.ceil((r + P) / P);

  const cx = destCtx.canvas.width / 2;
  const cy = destCtx.canvas.height / 2;

  destCtx.save();
  destCtx.translate(cx, cy);

  // Underlay solid base circle to ensure 0% background show-through between pixels
  destCtx.fillStyle = '#110C08';
  destCtx.beginPath();
  destCtx.arc(0, 0, r, 0, Math.PI * 2);
  destCtx.fill();

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const d = Math.hypot(rx, ry);

      // Strict Circle Boundary Clipping
      if (d > r) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;

      const normX = rx / r; // -1.0 to +1.0
      const normY = ry / r; // -1.0 to +1.0

      // ── 1. STEPPED DARK INK OUTLINE SHELL (Rule 19 / Rule 3.5) ──
      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );

      if (isBorder) {
        destCtx.fillStyle = '#110C08'; // Deep dark espresso ink outline
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 2. POINTED ELF EARS (Lateral protrusion on head sides) ──
      const isElfEarLeft = (normX <= -0.72 && normY >= -0.32 && normY <= -0.06);
      const isElfEarRight = (normX >= 0.72 && normY >= -0.32 && normY <= -0.06);

      if (isElfEarLeft || isElfEarRight) {
        // Pointed elf tip highlight vs shadow
        if (normY < -0.22) {
          destCtx.fillStyle = '#F5C8A5'; // Ear tip highlight
        } else if (Math.abs(normX) > 0.86) {
          destCtx.fillStyle = '#DCA37B'; // Outer ear rim
        } else {
          destCtx.fillStyle = '#BA7F5A'; // Inner ear shadow
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 3. HAIR ZONE (-Y: Crown Spikes, Locks & Bangs) ──
      const colIdx = Math.max(0, Math.min(26, gx + 13));
      const hairLineY = GUNSLINGER_HAIRLINE_GY[colIdx];
      const isHair = (gy <= hairLineY) || (normY < -0.16 && (Math.abs(normX) > 0.65 || (normY < -0.42 && Math.abs(normX) > 0.40)));

      if (isHair) {
        // 4-Tier Hair Palette Hierarchy
        if (normY < -0.80 && Math.abs(normX) < 0.45) {
          destCtx.fillStyle = '#5A3D28'; // Tier 4: Specular Crown Highlight
        } else if (normY < -0.50) {
          destCtx.fillStyle = '#3E2616'; // Tier 2: Base Warm Espresso
        } else if (normY < -0.25) {
          destCtx.fillStyle = '#28170D'; // Tier 3: Mid-Lock Shadow
        } else {
          destCtx.fillStyle = '#180E07'; // Tier 1: Undercut Root
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 4. FACE / CHIN / GOATEE ZONE (normY: -0.18 to +0.14) ──
      if (normY < +0.14) {
        // Dark Goatee & Stubble at the Chin Tip (normY: +0.02 to +0.13, |normX| <= 0.22)
        const isGoatee = (normY >= +0.02 && Math.abs(normX) <= 0.20 && !(normY > +0.10 && Math.abs(normX) > 0.12));
        if (isGoatee) {
          destCtx.fillStyle = normY > +0.08 ? '#1A0E08' : '#2D1A0E'; // Dark goatee beard shadow
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Sideburns framing the jawline
        if (Math.abs(normX) > 0.52 && normY < +0.06) {
          destCtx.fillStyle = '#28170D'; // Dark sideburn locks
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Warm Tan Elven Skin Tone
        if (normY < -0.05 && Math.abs(normX) < 0.40) {
          destCtx.fillStyle = '#F5C8A5'; // Forehead highlight
        } else if (normY < +0.06) {
          destCtx.fillStyle = '#E2AA82'; // Base skin
        } else {
          destCtx.fillStyle = '#C68B63'; // Lower jaw shadow
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 5. HIGH DUSTER LEATHER COLLAR & V-NECK SHIRT (normY: +0.14 to +0.36) ──
      if (normY < +0.36) {
        // High-standing Duster Lapels / Collar (left and right wings)
        const isCollarWing = (Math.abs(normX) >= 0.28 && Math.abs(normX) <= 0.78);
        if (isCollarWing) {
          if (Math.abs(normX) >= 0.72) {
            destCtx.fillStyle = '#3E2212'; // Collar outer seam
          } else if (normY < +0.22) {
            destCtx.fillStyle = '#BA7D50'; // Collar top lapel edge highlight
          } else {
            destCtx.fillStyle = '#945E35'; // Rich tan leather duster collar
          }
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // V-Neck Open Lace-Up Pioneer Shirt (Center: |normX| < 0.28)
        const isChestLace = (
          (normY >= +0.20 && normY <= +0.23 && Math.abs(normX) <= 0.16) ||
          (normY >= +0.28 && normY <= +0.31 && Math.abs(normX) <= 0.14)
        );
        if (isChestLace) {
          destCtx.fillStyle = '#301A0D'; // Leather cross laces
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        if (Math.abs(normX) <= 0.12) {
          destCtx.fillStyle = '#F4EDE4'; // White linen shirt core
        } else {
          destCtx.fillStyle = '#D3C6B4'; // Off-white linen shirt shadow
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 6. TORSO, BANDOLIER, GREEN CAPELET & DUSTER COAT (normY: +0.36 to +0.66) ──
      if (normY < +0.66) {
        // Emerald Green Shoulder Capelet / Drape (Left Shoulder: normX <= -0.38)
        if (normX <= -0.38) {
          if (normX <= -0.68) {
            destCtx.fillStyle = '#194A2A'; // Deep emerald shadow folds
          } else if (normY < +0.48) {
            destCtx.fillStyle = '#3EA660'; // Bright emerald mantle highlight
          } else {
            destCtx.fillStyle = '#267942'; // Emerald green drape
          }
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Diagonal Bullet Bandolier (running from top-right to bottom-left: rx + ry ≈ const)
        const bandolierDiag = normX * 0.85 + (normY - 0.48) * 1.35;
        const isBandolierStrap = (bandolierDiag >= -0.16 && bandolierDiag <= +0.16);

        if (isBandolierStrap) {
          // Brass/Gold Bullets nested along the strap
          const bulletPhase = Math.floor((normX + normY * 1.5) * 5.0) % 2;
          if (bulletPhase === 0 && Math.abs(bandolierDiag) < 0.09) {
            destCtx.fillStyle = '#F5CF47'; // Polished brass cartridge highlight
          } else if (bulletPhase === 0) {
            destCtx.fillStyle = '#B88C1B'; // Brass bullet casing base
          } else {
            destCtx.fillStyle = '#3A2011'; // Heavy leather bandolier strap
          }
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Duster Coat Outer Flaps (Right side: normX >= 0.40)
        if (normX >= 0.40) {
          if (normX >= 0.70) {
            destCtx.fillStyle = '#422413'; // Outer duster seam
          } else {
            destCtx.fillStyle = '#82522C'; // Tan leather duster body
          }
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Dark Brown Inner Vest / Waistcoat (|normX| < 0.40)
        if (normY < +0.50 && Math.abs(normX) < 0.22) {
          destCtx.fillStyle = '#E8DFD3'; // Lower shirt tail tucked in
        } else if (Math.abs(normX) < 0.20) {
          destCtx.fillStyle = '#2E221A'; // Charcoal brown vest center
        } else {
          destCtx.fillStyle = '#453023'; // Vest side shadow
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 7. UTILITY BELT, BRASS BUCKLE & GREEN WAIST SASH (normY: +0.66 to +0.80) ──
      if (normY < +0.80) {
        // Center Stamped Brass Belt Buckle (|normX| <= 0.18)
        if (Math.abs(normX) <= 0.18) {
          if (Math.abs(normX) <= 0.08 && normY >= +0.69 && normY <= +0.76) {
            destCtx.fillStyle = '#FAE57F'; // Brass buckle center tongue glint
          } else {
            destCtx.fillStyle = '#C99E2A'; // Rich gold/brass buckle frame
          }
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Emerald Green Waist Sash / Scarf (Draped on right side: normX >= 0.18 && normX <= 0.48)
        if (normX >= 0.18 && normX <= 0.48) {
          destCtx.fillStyle = (normY < +0.73) ? '#389A57' : '#216B3B'; // Green sash folds
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Heavy Leather Utility Belt
        destCtx.fillStyle = normY < +0.72 ? '#4A2A16' : '#2D170A'; // Dark leather belt
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 8. DUSTER HEM, TROUSERS & BOOTS (normY: +0.80 to +1.00) ──
      // Emerald Green Sash Tail hanging down
      if (normX >= 0.20 && normX <= 0.38 && normY < +0.92) {
        destCtx.fillStyle = '#1D5C32'; // Emerald green sash tail
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // Duster Coat Tails (Outer sides)
      if (Math.abs(normX) >= 0.48) {
        destCtx.fillStyle = (Math.abs(normX) >= 0.72) ? '#3B1F0F' : '#6E4323'; // Duster leather tails
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // Dark Charcoal Riding Trousers & Boots (Center)
      if (normY > +0.90) {
        destCtx.fillStyle = '#1C120B'; // Sturdy leather boots
      } else if (Math.abs(normX) < 0.12) {
        destCtx.fillStyle = '#1F1A17'; // Trousers inner inseam
      } else {
        destCtx.fillStyle = '#312924'; // Charcoal riding breeches
      }
      destCtx.fillRect(px, py, P, P);
    }
  }

  destCtx.restore();
}

/**
 * Draws Gunslinger's authentic pixel-art body with offscreen canvas caching.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character radius
 */
export function drawGunslingerPixelBody(ctx, r = 25) {
  if (typeof document === 'undefined') {
    _renderGunslingerPixelBodyToCanvas(ctx, r);
    return;
  }

  const intR = Math.round(r);
  if (!_cachedGunslingerBodyCanvas || _cachedGunslingerBodyR !== intR) {
    const steps = Math.ceil((intR + P) / P);
    const size = (steps * 2 + 1) * P;
    _cachedGunslingerBodyCanvas = document.createElement('canvas');
    _cachedGunslingerBodyCanvas.width = size;
    _cachedGunslingerBodyCanvas.height = size;
    const cctx = _cachedGunslingerBodyCanvas.getContext('2d');
    _renderGunslingerPixelBodyToCanvas(cctx, intR);
    _cachedGunslingerBodyR = intR;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const size = _cachedGunslingerBodyCanvas.width;
  ctx.drawImage(_cachedGunslingerBodyCanvas, -size / 2, -size / 2);
  ctx.restore();
}

/**
 * Main Gunslinger Skin entry point.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object|number} fighterOrX - Fighter entity or x coordinate
 * @param {number} [y]
 * @param {number} [r]
 * @param {number} [angle]
 * @param {string} [color]
 */
export function drawGunslingerSkin(ctx, fighterOrX, y, r, angle, color) {
  if (typeof state !== 'undefined' && state.showSkinOnly) {
    // If showSkinOnly, still render the skin
  }

  let posX = 0;
  let posY = 0;
  let radius = 25;
  let renderAngle = 0;
  let isWinnerReveal = false;

  if (fighterOrX && typeof fighterOrX === 'object') {
    const f = fighterOrX;
    posX = f.x || 0;
    posY = f.y || 0;
    radius = f.r || 25;
    isWinnerReveal = Boolean(f._isWinnerReveal);
    renderAngle = isWinnerReveal ? 0 : (f.gunAngle !== undefined ? f.gunAngle : (f.angle || 0));
  } else {
    posX = fighterOrX || 0;
    posY = y || 0;
    radius = r || 25;
    renderAngle = angle || 0;
  }

  ctx.save();
  ctx.translate(posX, posY);

  // Upright Front-POV Orientation with horizontal scale mirroring (Rule 19 / Rule 3.1)
  const skinAngle = isWinnerReveal ? 0 : renderAngle;
  ctx.rotate(skinAngle);

  const facingLeft = Math.abs(skinAngle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // Draw authentic Gunslinger pixel body
  drawGunslingerPixelBody(ctx, radius);

  // Draw Cowboy Hat PNG Overlay (Assets/model/Hair/Gunslinger-hair.png)
  _drawGunslingerHair(ctx, radius, facingLeft);

  ctx.restore();
}
