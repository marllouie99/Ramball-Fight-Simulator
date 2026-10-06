// ─────────────────────────────────────────────
// MAKI ZEN'IN FIGHTER SKIN & BODY MODEL
// Heavenly Restriction: Complete (Jujutsu Kaisen)
// Features Authentic Procedural Pixel-Art Body:
// 1. Warm Athletic Skin with Facial Burn Scars (Rule 19 Upright Front POV, Rule 18 Faceless)
// 2. High-Collar Black Tactical Sleeveless Turtleneck & Harness Vest
// 3. Dark Tactical Cargo Pants & Combat Belt
// 4. Authentic Pixel-Art Spiky Hair (Assets/model/maki/Maki-hair.png)
// Rule 19 (Upright Front POV), Rule 20 (Hand Visibility), and Rule 11 (Zero shadowBlur) Compliant
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawMakiWeapons, drawMakiComboSlashVFX } from '../weapons/makiWeaponGraphics.js';

let _makiHairImage = null;
let _makiHairImageLoading = false;

export function _getMakiHairImage() {
  if (_makiHairImage && _makiHairImage.complete && _makiHairImage.naturalWidth > 0) {
    return _makiHairImage;
  }
  if (!_makiHairImageLoading && typeof Image !== 'undefined') {
    _makiHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _makiHairImage = img;
      _makiHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Maki hair image at Assets/model/maki/Maki-hair.png', e);
      _makiHairImageLoading = false;
    };
    img.src = 'Assets/model/maki/Maki-hair.png?v=1';
    _makiHairImage = img;
  }
  return _makiHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getMakiHairImage();
}

/**
 * Draws Maki's authentic short spiky hair from Assets/model/maki/Maki-hair.png.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawMakiHair(ctx, r, facingLeft = false) {
  const hairImg = _getMakiHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp pixel art fidelity (Rule #19)

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.maki) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;
    const flipX = custom.flipX ? -1 : 1;
    const flipY = custom.flipY ? -1 : 1;

    // Maki-hair.png (1024x1024). True visible hair bounding box:
    // X: [71, 952] (width 882, horizontal center at 511.5)
    // Y: [92, 900] (height 809, top crown at 92)
    // Calibrated to seamlessly frame the upper circle with spiky crown at -1.40r
    const targetHairWidth = r * 2.85 * wMult;
    const targetHairHeight = r * 2.20 * hMult;
    const scaleX = targetHairWidth / 882;
    const scaleY = targetHairHeight / 809;
    const drawW = 1024 * scaleX;
    const drawH = 1024 * scaleY;
    const drawX = -511.5 * scaleX + offX;
    const drawY = -r * 1.40 - 92 * scaleY + offY;

    if (rot !== 0 || flipX !== 1 || flipY !== 1) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      if (rot !== 0) ctx.rotate(rot);
      if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
      ctx.drawImage(hairImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(hairImg, drawX, drawY, drawW, drawH);
    }
    ctx.restore();
  } else {
    _drawProceduralMakiHair(ctx, r);
  }
}

/**
 * Procedural hair fallback using discrete lock coordinate arrays (Rule 3.4).
 */
function _drawProceduralMakiHair(ctx, r) {
  ctx.save();
  ctx.fillStyle = '#111216';
  // Spiky crown locks
  const locks = [
    { x: 0, y: -r * 1.38, w: r * 0.45, h: r * 0.60 },
    { x: -r * 0.50, y: -r * 1.25, w: r * 0.40, h: r * 0.55 },
    { x: r * 0.50, y: -r * 1.25, w: r * 0.40, h: r * 0.55 },
    { x: -r * 0.90, y: -r * 0.95, w: r * 0.35, h: r * 0.70 },
    { x: r * 0.90, y: -r * 0.95, w: r * 0.35, h: r * 0.70 },
  ];
  for (const lock of locks) {
    ctx.beginPath();
    ctx.arc(lock.x, lock.y + lock.h / 2, lock.w / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws Maki's hand/fist in clean pixel art style with warm athletic tan skin tone.
 */
export function drawMakiFist(ctx, x, y, radius, skinColor = '#D4A373', fighter = null) {
  ctx.save();
  ctx.translate(x, y);
  drawPixelHand(ctx, 0, 0, radius, skinColor);
  ctx.restore();
}

let _cachedMakiBodyCanvas = null;
let _cachedMakiBodyR = 0;

/**
 * Procedural Pixel Art Render Function (Renders once to offscreen cache).
 * Matches Awakened Maki Zen'in:
 * - Stepped dark outer circle stroke (#0E0F14)
 * - Warm athletic tan skin face with facial burn scars across cheeks/forehead
 * - High-collar black sleeveless combat turtleneck & tactical vest
 * - Utility chest harness straps & tactical waist belt
 * - Deep obsidian combat cargo trousers
 */
function _renderMakiPixelBodyToCanvas(destCtx, r) {
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
        destCtx.fillStyle = '#0E0F14';
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // ZONE 1: Face & Cheeks Tan Skin with Burn Scars (ry < r * 0.25)
      // ──────────────────────────────────────────
      if (ry < r * 0.25) {
        let col = '#E4BA96'; // Warm athletic tan skin tone

        // Side cheek shadow
        if (Math.abs(rx) > r * 0.68) {
          col = '#CD9F78';
        }

        // Facial Burn Scars (Left cheek & across nose bridge / forehead)
        // Staggered textured burn tissue pattern
        const isLeftCheekBurn = (rx >= -r * 0.55 && rx <= -r * 0.15 && ry >= -r * 0.10 && ry <= r * 0.20);
        const isRightCheekBurn = (rx >= r * 0.20 && rx <= r * 0.48 && ry >= 0 && ry <= r * 0.22);
        const isForeheadBurn = (rx >= -r * 0.35 && rx <= r * 0.25 && ry >= -r * 0.25 && ry <= -r * 0.12);

        if (isLeftCheekBurn || isRightCheekBurn || isForeheadBurn) {
          const noise = ((Math.floor(rx / P) + Math.floor(ry / P)) % 3);
          if (noise === 0) {
            col = '#7D3224'; // Deep scar crimson-brown
          } else if (noise === 1) {
            col = '#5A2218'; // Dark burn core
          } else {
            col = '#A85A48'; // Raised scar tissue edge
          }
        }

        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: High-Collar Black Combat Turtleneck (r * 0.25 <= ry < r * 0.58)
      // ──────────────────────────────────────────
      else if (ry < r * 0.58) {
        // High-collar neck band (ry ~ 0.25r to 0.32r)
        if (ry < r * 0.32 && Math.abs(rx) <= r * 0.40) {
          destCtx.fillStyle = '#0E1015'; // Dark collar rim
        } else if (Math.abs(rx) >= r * 0.55 && ry > r * 0.35) {
          // Sleeveless bare shoulder tan skin
          destCtx.fillStyle = '#CD9F78';
        } else if (Math.abs(rx) < r * 0.18 && ry > r * 0.34 && ry < r * 0.52) {
          // Tactical zipper / center seam
          destCtx.fillStyle = '#0A0C10';
        } else if ((Math.abs(rx) >= r * 0.22 && Math.abs(rx) <= r * 0.32) && ry >= r * 0.32 && ry <= r * 0.56) {
          // Tactical harness shoulder straps
          destCtx.fillStyle = '#222530';
        } else {
          destCtx.fillStyle = '#161820'; // Obsidian tactical vest fabric
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: Tactical Utility Belt & Holster (r * 0.58 <= ry < r * 0.70)
      // ──────────────────────────────────────────
      else if (ry < r * 0.70) {
        if (Math.abs(rx) <= r * 0.14) {
          destCtx.fillStyle = '#64748B'; // Steel center belt buckle
        } else if (Math.abs(rx) >= r * 0.40 && Math.abs(rx) <= r * 0.65) {
          destCtx.fillStyle = '#1E293B'; // Utility ammo / scroll pouches
        } else {
          destCtx.fillStyle = '#0F172A'; // Dark leather combat belt
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 4: Dark Obsidian Cargo Combat Trousers (ry >= r * 0.70)
      // ──────────────────────────────────────────
      else {
        if (Math.abs(rx) <= P * 0.6 && ry > r * 0.78) {
          destCtx.fillStyle = '#0B0C10'; // Inseam crease shadow
        } else if ((Math.abs(rx) >= r * 0.30 && Math.abs(rx) <= r * 0.38) || Math.abs(rx) >= r * 0.70) {
          destCtx.fillStyle = '#12141A'; // Deep cargo fold shadow
        } else if (ry < r * 0.82 && Math.abs(rx) < r * 0.45) {
          destCtx.fillStyle = '#282C37'; // Thigh highlight
        } else {
          destCtx.fillStyle = '#1B1E26'; // Deep obsidian cargo fabric
        }
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  destCtx.restore();
}

/**
 * Draws Maki's procedural pixel-art body with offscreen caching.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Fighter radius
 */
export function drawMakiPixelBody(ctx, r) {
  if (typeof document === 'undefined') {
    // Node environment fallback
    _renderMakiPixelBodyToCanvas(ctx, r);
    return;
  }

  const intR = Math.round(r);
  if (!_cachedMakiBodyCanvas || _cachedMakiBodyR !== intR) {
    const P = 2.0;
    const steps = Math.ceil((intR + P) / P);
    const size = (steps * 2 + 1) * P;
    _cachedMakiBodyCanvas = document.createElement('canvas');
    _cachedMakiBodyCanvas.width = size;
    _cachedMakiBodyCanvas.height = size;
    const cctx = _cachedMakiBodyCanvas.getContext('2d');
    _renderMakiPixelBodyToCanvas(cctx, intR);
    _cachedMakiBodyR = intR;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const size = _cachedMakiBodyCanvas.width;
  ctx.drawImage(_cachedMakiBodyCanvas, -size / 2, -size / 2);
  ctx.restore();
}

/**
 * Main Skin Renderer for Awakened Maki Zen'in
 */
export function drawMakiSkin(ctx, fighter) {
  const r = fighter.r || 25;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Orientation & Mirroring (Rule 19 Upright Front POV)
  let angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));

  const isSpinningSweep = fighter.swordSwingTimer > 0 && fighter.swordComboStep === 3;
  if (isSpinningSweep) {
    const maxT = fighter.swordSwingMax || 28;
    const progress = Math.max(0, Math.min(1.0, 1.0 - fighter.swordSwingTimer / maxT));
    const spinEase = Math.sin(progress * Math.PI * 0.5);
    angle += spinEase * Math.PI * 2;
  }

  const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
  ctx.rotate(angle);

  const isSpinning = fighter.isSpinning || isSpinningSweep;
  const facingLeft = Math.abs(normAngle) > Math.PI / 2;
  if (facingLeft && !isSpinning) {
    ctx.scale(1, -1);
  }

  // 2. Atmospheric Flow / Air Step Subtle Ripple Rings
  if (fighter.isAirStepping || fighter.isInFlowState) {
    ctx.save();
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.45)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(139, 92, 246, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Procedural Pixel-Art Body
  drawMakiPixelBody(ctx, r);

  // 4. Hair Asset / Fallback Overlay
  _drawMakiHair(ctx, r, facingLeft);

  // 5. Weapon & Symmetrical Hands (Rule 20)
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  if (!shouldHideHands) {
    drawMakiWeapons(ctx, fighter, r, facingLeft);
    drawMakiComboSlashVFX(ctx, fighter, r, facingLeft);
  }

  // 6. Status Overlays (Stun, Freeze, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore(); // End main transform
}

/**
 * Ghost model afterimage for Sakurajima Awakening / Air-step speed blitz.
 */
export function drawMakiGhostSkin(ctx, x, y, angle = 0, r = 25, alpha = 0.5) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);

  const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
  const facingLeft = Math.abs(normAngle) > Math.PI / 2;
  ctx.rotate(angle);
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // Atmospheric soul aura
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(220, 38, 38, 0.25)';
  ctx.fill();

  // Procedural body & hair
  drawMakiPixelBody(ctx, r);
  _drawMakiHair(ctx, r, facingLeft);

  // Ethereal rim
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
