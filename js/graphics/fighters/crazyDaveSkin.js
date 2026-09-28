// CRAZY DAVE FIGHTER SKIN & PIXEL ART BODY MODEL (Plants vs. Zombies)
// Adheres strictly to:
// - Rule 19: Upright Front POV orientation (-Y top, +Y bottom, ctx.scale(1, -1) when facing left)
// - Faceless Minimalist Standard (no eyes, pupils, mouth, or nose; identity via pot, scruffy beard, polo, jeans)
// - Rule 3.5: Authentic 2D Discrete Grid Rasterization Engine (P = 2.0px) & Offscreen Canvas Cache
// - Rule 3.6: Hand Layering & drawPixelHand Engine
// - Rule 2.2: Prohibition of shadowBlur CPU filters

import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawCrazyDaveShovel, drawSunDrop, getSunSprite } from '../weapons/crazyDaveWeaponGraphics.js';

let _crazyDaveHairImage = null;
let _crazyDaveHairImageLoading = false;

/**
 * Lazy-loads and caches the Crazy Dave hair/pan PNG asset.
 * @returns {HTMLImageElement|null}
 */
export function _getCrazyDaveHairImage() {
  if (_crazyDaveHairImage && _crazyDaveHairImage.complete && _crazyDaveHairImage.naturalWidth > 0) {
    return _crazyDaveHairImage;
  }
  if (!_crazyDaveHairImageLoading && typeof Image !== 'undefined') {
    _crazyDaveHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _crazyDaveHairImage = img;
      _crazyDaveHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Crazy Dave hair image at Assets/model/Hair/crazydave-hair.png', e);
      _crazyDaveHairImageLoading = false;
    };
    img.src = 'Assets/model/Hair/crazydave-hair.png?v=1';
    _crazyDaveHairImage = img;
  }
  return _crazyDaveHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getCrazyDaveHairImage();
}

/**
 * Draws Crazy Dave's cooking pot from Assets/model/Hair/crazydave-hair.png.
 * Overlaid on top of the procedural pixel body circle.
 * Uses nearest-neighbor scaling for crisp pixel art fidelity (Rule 19 / Rule 3.5).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawCrazyDaveHair(ctx, r, facingLeft = false) {
  const hairImg = _getCrazyDaveHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp pixel art fidelity (Rule 19)

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.crazydave) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;

    // crazydave-hair.png (1536x1024). Main Pan Dome Bounding Box:
    // X: [184, 1038] (width 855, horizontal center of pan dome at 611)
    // Y: [301, 814] (height 514, top crown at 301, bottom rim at 814)
    // Full visible range with handle: X: [133, 1495]
    const targetDomeWidth = r * 2.25 * wMult;
    const targetDomeHeight = r * 1.30 * hMult;
    const scaleX = targetDomeWidth / 855;
    const scaleY = targetDomeHeight / 514;
    const drawW = 1536 * scaleX;
    const drawH = 1024 * scaleY;
    const drawX = -611 * scaleX + offX;
    const drawY = -r * 1.15 - 301 * scaleY + offY;

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

let _cachedCrazyDaveBodyCanvas = null;
let _cachedCrazyDaveBodyR = 0;

/**
 * Procedural Pixel Art Render Function (Renders once to offscreen cache).
 * - Upright Front POV orientation
 * - Metallic cooking pot / pan atop head with side handle
 * - Brown scruffy beard / stubble covering lower chin/jaw
 * - White polo button-up shirt
 * - Classic blue denim jeans
 * - Brown work boots
 */
function _renderCrazyDavePixelBodyToCanvas(destCtx, r) {
  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);
  const P = 2.0;
  const steps = Math.ceil((r + P) / P);

  // 100% 4-Way Symmetrical Circular Pixel Body Fill & Outer Border
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;

      // 4-neighbor boundary test for clean 1-pixel outer manga ink outline
      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );

      if (isBorder) {
        destCtx.fillStyle = '#0E0F14'; // Dark Manga Ink Outline
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // ZONE 1: Metallic Cooking Pot on Head (ry < -r * 0.12)
      // ──────────────────────────────────────────
      if (ry < -r * 0.12) {
        let col = '#94A3B8'; // Slate Silver Pan

        // Pot Rim Base Band
        if (ry >= -r * 0.22) {
          col = '#64748B'; // Deep Steel Rim
          if (Math.abs(rx) < r * 0.45 && ry >= -r * 0.18) {
            col = '#CBD5E1'; // Rim Specular Glint
          }
        }
        // Pan Specular Glint (Top-Left Highlight)
        else if (rx < -r * 0.15 && ry < -r * 0.45) {
          col = '#F1F5F9'; // Pure White/Silver Sheen
        } else if (rx < 0 && ry < -r * 0.3) {
          col = '#CBD5E1'; // Light Metallic Surface
        } else if (rx > r * 0.4) {
          col = '#475569'; // Dark Metallic Shadow on right
        } else {
          col = '#94A3B8'; // Mid Steel Tone
        }

        // Side Pan Handle (Right side: rx > r * 0.65, ry in [-r * 0.45, -r * 0.25])
        if (rx > r * 0.60 && ry >= -r * 0.45 && ry <= -r * 0.25) {
          col = '#1E293B'; // Dark Handle Grip
        }

        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: Face & Brown Scruffy Beard ( -r * 0.12 <= ry < r * 0.22 )
      // Faceless Peach Skin + Stubble
      // ──────────────────────────────────────────
      else if (ry < r * 0.22) {
        let col = '#FFE0BD'; // Base Peach Skin Tone

        // Sideburns Hair Tufts (Left and Right edges)
        if (Math.abs(rx) > r * 0.65) {
          col = '#5C3A21'; // Brown messy side hair
        }
        // Brown Scruffy Beard / 5 O'Clock Stubble (Lower Chin/Jaw: ry > 0)
        else if (ry >= 0) {
          if (Math.abs(rx) < r * 0.55) {
            // Stubble / Scruffy Beard
            col = (Math.abs(rx) < r * 0.35 && ry > r * 0.08) ? '#4A2E1B' : '#6B4226';
          } else {
            col = '#5C3A21';
          }
        }
        // Forehead Skin Contour
        else {
          if (Math.abs(rx) > r * 0.45) {
            col = '#F5CBA7'; // Face contour shadow
          } else {
            col = '#FFF0DE'; // Face core highlight
          }
        }

        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: White Polo Shirt & Collar ( r * 0.22 <= ry < r * 0.60 )
      // ──────────────────────────────────────────
      else if (ry < r * 0.60) {
        let col = '#F8FAFC'; // Crisp White Polo

        // V-Neck / Open Collar Split in center
        if (ry < r * 0.36 && Math.abs(rx) <= r * 0.18) {
          if (Math.abs(rx) <= P * 0.6) {
            col = '#F5CBA7'; // Exposed Neck Skin
          } else {
            col = '#E2E8F0'; // Collar lapel folds
          }
        }
        // Center Button Seam
        else if (Math.abs(rx) <= P * 0.6 && ry >= r * 0.36 && ry < r * 0.54) {
          col = (gy % 2 === 0) ? '#475569' : '#CBD5E1'; // Polo button dots
        }
        // Shoulder / Arm Shading
        else if (Math.abs(rx) > r * 0.65) {
          col = '#CBD5E1'; // Sleeve Shading
        } else if (ry > r * 0.50) {
          col = '#E2E8F0'; // Lower Shirt Fold
        }

        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 4: Leather Belt ( r * 0.60 <= ry < r * 0.70 )
      // ──────────────────────────────────────────
      else if (ry < r * 0.70) {
        let col = '#78350F'; // Dark Brown Leather Belt

        // Brass Buckle in center
        if (Math.abs(rx) <= r * 0.22) {
          col = (Math.abs(rx) <= r * 0.10) ? '#FEF08A' : '#D97706'; // Golden Brass Buckle
        }

        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 5: Blue Denim Jeans & Work Boots ( ry >= r * 0.70 )
      // ──────────────────────────────────────────
      else {
        let col = '#2563EB'; // Classic Denim Blue Jeans

        // Center Leg Inseam Divider
        if (Math.abs(rx) <= P * 0.6 && ry > r * 0.76) {
          col = '#0E0F14'; // Dark Inseam Divider
        }
        // Bottom Work Boots (ry > r * 0.88)
        else if (ry > r * 0.88) {
          col = (Math.abs(rx) < r * 0.35) ? '#451A03' : '#78350F'; // Tough Brown Work Boots
        }
        // Denim Highlights
        else if (Math.abs(rx) > r * 0.15 && Math.abs(rx) < r * 0.45) {
          col = '#3B82F6'; // Denim Thigh Highlight
        } else {
          col = '#1D4ED8'; // Denim Shadow
        }

        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  destCtx.restore();
}

/**
 * Draws the cached Crazy Dave pixel body.
 */
export function drawCrazyDavePixelBody(ctx, r) {
  if (!_cachedCrazyDaveBodyCanvas || _cachedCrazyDaveBodyR !== r) {
    const size = Math.ceil(r * 2 + 16);
    const offscreen = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
    if (offscreen) {
      offscreen.width = size;
      offscreen.height = size;
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        _renderCrazyDavePixelBodyToCanvas(offCtx, r);
        _cachedCrazyDaveBodyCanvas = offscreen;
        _cachedCrazyDaveBodyR = r;
      }
    }
  }

  if (_cachedCrazyDaveBodyCanvas) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      _cachedCrazyDaveBodyCanvas,
      -_cachedCrazyDaveBodyCanvas.width / 2,
      -_cachedCrazyDaveBodyCanvas.height / 2
    );
    ctx.restore();
  }
}

/**
 * Main Skin Renderer for Crazy Dave.
 */
export function drawCrazyDaveSkin(ctx, fighter) {
  if (!fighter) return;

  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  let isFacingLeft = false;
  if (!isPodiumPreview) {
    if (fighter.facingLeft !== undefined) {
      isFacingLeft = Boolean(fighter.facingLeft);
    } else if (fighter.gunAngle !== undefined && fighter.gunAngle !== 0) {
      isFacingLeft = Math.abs(fighter.gunAngle) > Math.PI / 2;
    } else if (fighter.vx !== undefined && Math.abs(fighter.vx) > 0.1) {
      isFacingLeft = fighter.vx < 0;
    }
  }

  const swingTimer = fighter.shovelSwingTimer || fighter.plantingAnimTimer || 0;
  const swingMax = fighter.plantingAnimDuration || 20;
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;

  // Compute shovel dig swing angle & offsets during planting
  let shovelAngle = 0;
  let shovelOffsetX = 0;
  let shovelOffsetY = r * 0.38;

  if (swingTimer > 0) {
    const p = Math.max(0, Math.min(1.0, 1.0 - (swingTimer / swingMax)));
    if (p <= 0.45) {
      // Phase 1: Dig Down into soil (~41° downward tilt and forward push)
      const digP = p / 0.45;
      shovelAngle = digP * 0.72;
      shovelOffsetX = digP * r * 0.18;
      shovelOffsetY = r * 0.38 + digP * r * 0.20;
    } else if (p <= 0.75) {
      // Phase 2: Scoop Upward & Dirt Toss
      const scoopP = (p - 0.45) / 0.30;
      shovelAngle = 0.72 - scoopP * 1.05; // scoops up to -0.33 rad (~-19°)
      shovelOffsetX = r * 0.18 - scoopP * r * 0.12;
      shovelOffsetY = r * 0.58 - scoopP * r * 0.26;
    } else {
      // Phase 3: Settle back to resting waist pose
      const recP = (p - 0.75) / 0.25;
      shovelAngle = -0.33 * (1.0 - recP);
      shovelOffsetX = (r * 0.06) * (1.0 - recP);
      shovelOffsetY = (r * 0.32) + recP * (r * 0.06);
    }
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // Dave stays strictly upright with ZERO angular rotation (no ctx.rotate); flips horizontally via scale(-1, 1)
  if (isFacingLeft) {
    ctx.scale(-1, 1);
  }

  // 1. Back Hand (Follows shovel animation smoothly)
  if (!shouldHideHands) {
    const backHandRadius = getHandSize(3.8);
    const backHandX = r * 0.50 + shovelOffsetX * 0.5;
    const backHandY = r * 0.22 + (shovelOffsetY - r * 0.38) * 0.5;
    drawPixelHand(ctx, backHandX, backHandY, backHandRadius, '#FFE0BD', '#0E0F14');
  }

  // 2. Core Pixel Body
  drawCrazyDavePixelBody(ctx, r);

  // 3. Hair / Pan Asset Overlay if loaded
  _drawCrazyDaveHair(ctx, r, isFacingLeft);

  // 4. In-Hand Weapon: Garden Shovel (Animated with dig & scoop motion)
  drawCrazyDaveShovel(ctx, shovelOffsetX, shovelOffsetY, shovelAngle, r, true, swingTimer, false, fighter.color || '#84CC16', true);

  // 5. Front Hand (Holding shovel handle at animated angle and position)
  if (!shouldHideHands) {
    const frontHandRadius = getHandSize(4.2);
    const cosA = Math.cos(shovelAngle);
    const sinA = Math.sin(shovelAngle);
    const frontHandX = shovelOffsetX + (r * 0.65) * cosA;
    const frontHandY = shovelOffsetY + (r * 0.65) * sinA;
    drawPixelHand(ctx, frontHandX, frontHandY, frontHandRadius, '#FFE0BD', '#0E0F14');
  }

  ctx.restore();
}
