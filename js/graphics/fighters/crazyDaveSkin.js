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

/**
 * Crazy Dave's model and iconic cooking pot are 100% procedural pixel art.
 * Returns null as no external PNG hair asset is needed.
 */
export function _getCrazyDaveHairImage() {
  return null;
}

/**
 * Draws Crazy Dave's hair/pan asset if present.
 */
export function _drawCrazyDaveHair(ctx, r, facingLeft = false) {
  // Crazy Dave uses authentic procedural pixel art for his pot and hair
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
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || fighter.angle || 0);
  const isFacingLeft = Math.abs(angle) > Math.PI / 2;
  const swingTimer = fighter.shovelSwingTimer || 0;
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Draw Active Sun Drops managed by Dave if in standalone mode
  if (Array.isArray(fighter.suns) && fighter.suns.length > 0) {
    fighter.suns.forEach(sun => {
      // Sun positions are relative to world coordinates, rendered at their world pos
      // Since we already translated to fighter.x, fighter.y, we render them in world space below
    });
  }

  // 2. Rotate to aim angle and handle left-facing mirror
  ctx.rotate(angle);
  if (isFacingLeft) {
    ctx.scale(1, -1);
  }

  // 3. Back Hand (Positioned behind body)
  if (!shouldHideHands) {
    const backHandRadius = getHandSize(3.8);
    drawPixelHand(ctx, r * 0.6, -r * 0.45, backHandRadius, '#FFE0BD', '#0E0F14');
  }

  // 4. Core Pixel Body
  drawCrazyDavePixelBody(ctx, r);

  // 5. Hair / Pan Asset Overlay if loaded
  _drawCrazyDaveHair(ctx, r, isFacingLeft);

  // 6. In-Hand Weapon: Garden Shovel
  drawCrazyDaveShovel(ctx, 0, 0, 0, r, !isFacingLeft, swingTimer, false, fighter.color || '#84CC16', shouldHideHands);

  // 7. Front Hand (Holding shovel handle)
  if (!shouldHideHands) {
    const frontHandRadius = getHandSize(4.2);
    drawPixelHand(ctx, r * 0.7, 0, frontHandRadius, '#FFE0BD', '#0E0F14');
  }

  ctx.restore();

  // 8. Overhead Floating Sun Counter Pill: ☀️ <sunCount>
  _drawOverheadSunCounter(ctx, fighter);
}

/**
 * Renders a clean, vibrant floating Sun pill above Dave's head.
 */
function _drawOverheadSunCounter(ctx, fighter) {
  if (!fighter || fighter.hp <= 0) return;
  const sunCount = fighter.sunCount !== undefined ? fighter.sunCount : 50;

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.r || 25) - 16);

  const text = `${sunCount}`;
  ctx.font = 'bold 10px monospace';
  const textW = ctx.measureText(text).width;
  const pillW = Math.max(34, textW + 20);
  const pillH = 14;

  // Background Glass Pill
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#F59E0B'; // Solar Amber Border
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  ctx.roundRect(-pillW / 2, -pillH / 2, pillW, pillH, 7);
  ctx.fill();
  ctx.stroke();

  // Mini Golden Sun Icon
  const sunImg = getSunSprite();
  const hasImg = Boolean(sunImg && sunImg.complete && sunImg.naturalWidth > 0);
  const miniX = Math.round(-pillW / 2 + 8);
  const miniY = 0;

  if (hasImg) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sunImg, 0, 0, sunImg.naturalWidth, sunImg.naturalHeight, miniX - 5.5, miniY - 5.5, 11, 11);
    ctx.restore();
  } else {
    ctx.fillStyle = '#B45309';
    ctx.fillRect(miniX - 4, miniY - 4, 8, 8);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(miniX - 3, miniY - 3, 6, 6);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(miniX - 2, miniY - 2, 2, 2);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(miniX - 5, miniY - 1, 10, 2);
    ctx.fillRect(miniX - 1, miniY - 5, 2, 10);
  }

  // Sun Count Text
  ctx.fillStyle = '#FEF08A';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, -pillW / 2 + 15, 0.5);

  ctx.restore();
}
