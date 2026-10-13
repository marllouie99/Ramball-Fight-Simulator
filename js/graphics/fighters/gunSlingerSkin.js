// ─────────────────────────────────────────────
// ALUCARD FIGHTER SKIN & BODY MODEL (Authentic Pixel Art Edition)
// The No-Life King & Vampire of Hellsing (Hellsing Ultimate)
//
// Adheres strictly to:
// - Rule 11 (Prohibition of shadowBlur CPU Filters)
// - Rule 18 (HUD Skill Bar Theme Consistency — #B91C1C)
// - Rule 19 (Upright Front POV Orientation, Zero Eyes/Mouth/Nose)
// - Rule 20 (Approved Symmetrical Lower-Flank Hand Positioning & White Gloves with Hellsing Seal)
// - Rule 22 (Hair & Head Asset Model Import & Calibration)
// - Rule 24 (Mandatory Universal Character Body Model & Scale Standard — Toji Baseline)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { getHandSize } from '../../core/config.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

const P = 2.0; // 2.0px authentic retro pixel grid (Rule 24 Toji Standard)

let _alucardHatImage = null;
let _alucardHatImageLoading = false;

/**
 * Lazy-loads and caches the Alucard Crimson Fedora Hat PNG asset.
 * @returns {HTMLImageElement|null}
 */
export function _getAlucardHatImage() {
  if (_alucardHatImage && _alucardHatImage.complete && _alucardHatImage.naturalWidth > 0) {
    return _alucardHatImage;
  }
  if (!_alucardHatImageLoading && typeof Image !== 'undefined') {
    _alucardHatImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _alucardHatImage = img;
      _alucardHatImageLoading = false;
    };
    img.onerror = () => {
      _alucardHatImageLoading = false;
    };
    img.src = 'Assets/model/Alucard/Red-hat.png?v=1';
    _alucardHatImage = img;
  }
  return _alucardHatImage;
}

export const _getAlucardHairImage = _getAlucardHatImage;
export const _getGunslingerHairImage = _getAlucardHatImage;

let _alucardGlassesImage = null;
let _alucardGlassesImageLoading = false;

/**
 * Lazy-loads and caches Alucard's round amber eye glasses PNG asset.
 * @returns {HTMLImageElement|null}
 */
export function _getAlucardGlassesImage() {
  if (_alucardGlassesImage && _alucardGlassesImage.complete && _alucardGlassesImage.naturalWidth > 0) {
    return _alucardGlassesImage;
  }
  if (!_alucardGlassesImageLoading && typeof Image !== 'undefined') {
    _alucardGlassesImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _alucardGlassesImage = img;
      _alucardGlassesImageLoading = false;
    };
    img.onerror = () => {
      _alucardGlassesImageLoading = false;
    };
    img.src = 'Assets/model/Alucard/Red-eye-glasses.png?v=1';
    _alucardGlassesImage = img;
  }
  return _alucardGlassesImage;
}

// Pre-load on module init
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getAlucardHatImage();
  _getAlucardGlassesImage();
}

/**
 * Draws Alucard's dedicated eye glasses asset model (Assets/model/Alucard/Red-eye-glasses.png)
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawAlucardGlasses(ctx, r, facingLeft = false) {
  const glassesImg = _getAlucardGlassesImage();
  if (glassesImg && glassesImg.complete && glassesImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const custom = (typeof state !== 'undefined' && (state.skinCustomizations?.alucard_glasses || state.skinCustomizations?.gunslinger_glasses)) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;
    const flipX = custom.flipX ? -1 : 1;
    const flipY = custom.flipY ? -1 : 1;

    // Red-eye-glasses.png: 1007 x 342, center: 503.5
    const targetGlassesWidth = r * 1.70 * wMult;
    const targetGlassesHeight = r * 0.58 * hMult;
    const scaleX = targetGlassesWidth / 1007;
    const scaleY = targetGlassesHeight / 342;
    const drawW = 1007 * scaleX;
    const drawH = 342 * scaleY;
    const drawX = -503.5 * scaleX + offX;
    const drawY = -r * 0.02 - drawH / 2 + offY;

    if (rot !== 0 || flipX !== 1 || flipY !== 1) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      if (rot !== 0) ctx.rotate(rot);
      if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
      ctx.drawImage(glassesImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(glassesImg, drawX, drawY, drawW, drawH);
    }

    ctx.restore();
  }
}

/**
 * Draws Alucard's wide-brimmed crimson fedora from dedicated image asset (Assets/model/Alucard/Red-hat.png).
 * Uses nearest-neighbor scaling for crisp pixel art fidelity (Rule 19 / Rule 22).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawAlucardHat(ctx, r, facingLeft = false) {
  const hatImg = _getAlucardHatImage();
  if (hatImg && hatImg.complete && hatImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const custom = (typeof state !== 'undefined' && (state.skinCustomizations?.alucard_hat || state.skinCustomizations?.gunslinger || state.skinCustomizations?.alucard)) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;
    const flipX = custom.flipX ? -1 : 1;
    const flipY = custom.flipY ? -1 : 1;

    // Red-hat.png: 1536 x 643, visW: 1528, visH: 643, center: 768
    const targetHatWidth = r * 3.30 * wMult;
    const targetHatHeight = r * 1.38 * hMult;
    const scaleX = targetHatWidth / 1528;
    const scaleY = targetHatHeight / 643;
    const drawW = 1536 * scaleX;
    const drawH = 643 * scaleY;
    const drawX = -768 * scaleX + offX;
    const drawY = -r * 1.53 + offY;

    if (rot !== 0 || flipX !== 1 || flipY !== 1) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      if (rot !== 0) ctx.rotate(rot);
      if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
      ctx.drawImage(hatImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(hatImg, drawX, drawY, drawW, drawH);
    }

    ctx.restore();
  } else {
    _drawProceduralAlucardFedora(ctx, r);
  }
}

/**
 * Composite hair and headwear renderer: draws eye glasses followed by crimson fedora hat.
 */
export function _drawAlucardHair(ctx, r, facingLeft = false) {
  _drawAlucardGlasses(ctx, r, facingLeft);
  _drawAlucardHat(ctx, r, facingLeft);
}

export const _drawGunslingerHair = _drawAlucardHair;

/**
 * Discrete Hairline Array for Alucard's Untamed Jet-Black Locks & Bangs
 * 27 columns total (gx = -13 to +13, index = gx + 13)
 * Terminating above the face zone (Rule 19.1 compliant).
 */
const ALUCARD_HAIRLINE_GY = [
  -1, -2, -3, -5, -6, -5, -4, -6, -7, -6, -8, -9, -7, -8, -7, -8, -7, -6, -7, -5, -4, -5, -6, -4, -3, -2, -1
];

// Offscreen canvas cache for Alucard's pixel body model (Toji Standard 1:1 buffer)
let _cachedAlucardBodyCanvas = null;
let _cachedAlucardBodyR = 0;

/**
 * Renders Alucard's discrete pixel art body into an offscreen canvas context.
 * Features:
 * - Zone 1: Pale vampire skin & signature amber wireframe round sunglasses (Faceless aesthetic)
 * - Zone 2: Flamboyant white Victorian cravat & high crimson trench coat collar
 * - Zone 3: Crossed leather gun belts with silver buckles
 * - Zone 4: Flowing crimson trench coat duster tails & charcoal dress trousers
 */
function _renderAlucardPixelBodyToCanvas(destCtx, r) {
  destCtx.imageSmoothingEnabled = false;
  const steps = Math.ceil((r + P) / P);

  const cx = destCtx.canvas.width / 2;
  const cy = destCtx.canvas.height / 2;

  destCtx.save();
  destCtx.translate(cx, cy);

  // Underlay solid dark base circle to ensure 0% background bleed
  destCtx.fillStyle = '#0F0404';
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

      // ── 1. STEPPED DARK INK OUTLINE SHELL (Rule 24 Manga Ink Standard) ──
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

      // ── 2. UNTAMED JET-BLACK VAMPIRE HAIR (-Y: Spikes, Locks & Bangs) ──
      const colIdx = Math.max(0, Math.min(26, gx + 13));
      const hairLineY = ALUCARD_HAIRLINE_GY[colIdx];
      const isSideLock = (normY < +0.10 && (Math.abs(normX) > 0.62 || (normY < -0.35 && Math.abs(normX) > 0.44)));
      const isHair = (gy <= hairLineY) || isSideLock;

      if (isHair) {
        if (normY < -0.80 && Math.abs(normX) < 0.40) {
          destCtx.fillStyle = '#474E5D'; // Tier 4: Specular crown glint
        } else if (normY < -0.50) {
          destCtx.fillStyle = '#272B35'; // Tier 2: Mid charcoal sheen
        } else if (normY < -0.20) {
          destCtx.fillStyle = '#181A20'; // Tier 3: Jet black shadow
        } else {
          destCtx.fillStyle = '#0E0F14'; // Tier 1: Undercut root ink
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 3. ZONE 1: PALE VAMPIRE FACE & ROUND AMBER GLASSES (normY: -0.18 to +0.22) ──
      if (normY < +0.22) {
        const hasGlassesAsset = (_alucardGlassesImage && _alucardGlassesImage.complete && _alucardGlassesImage.naturalWidth > 0);
        
        // Procedural amber glasses fallback when asset image is not loaded / in headless tests
        if (!hasGlassesAsset) {
          const isLeftLens = (gx >= -4 && gx <= -1 && gy >= -2 && gy <= 1);
          const isRightLens = (gx >= 1 && gx <= 4 && gy >= -2 && gy <= 1);
          const isWireBridge = (gx === 0 && gy === -1);
          const isFrameRimLeft = (
            (gx === -4 || gx === -1 || gy === -2 || gy === 1) &&
            gx >= -4 && gx <= -1 && gy >= -2 && gy <= 1
          );
          const isFrameRimRight = (
            (gx === 1 || gx === 4 || gy === -2 || gy === 1) &&
            gx >= 1 && gx <= 4 && gy >= -2 && gy <= 1
          );

          if (isWireBridge) {
            destCtx.fillStyle = '#7C2D12'; // Wireframe bridge
            destCtx.fillRect(px, py, P, P);
            continue;
          }

          if (isLeftLens || isRightLens) {
            if (isFrameRimLeft || isFrameRimRight) {
              destCtx.fillStyle = '#9A3412'; // Bronze/dark orange circular rim
            } else if (gx === -2 && gy === -1 || gx === 2 && gy === -1) {
              destCtx.fillStyle = '#FEF08A'; // Center glint sparkle
            } else {
              destCtx.fillStyle = '#FF8C00'; // Glowing amber tinted lens
            }
            destCtx.fillRect(px, py, P, P);
            continue;
          }
        }

        // Aristocratic Pale Gothic Skin Base
        if (normY < -0.04 && Math.abs(normX) < 0.40) {
          destCtx.fillStyle = '#FAF5F0'; // Forehead highlight
        } else if (normY < +0.10) {
          destCtx.fillStyle = '#EFE6DD'; // Base pale skin
        } else {
          destCtx.fillStyle = '#D8C9BB'; // Lower jaw shadow contour
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 4. ZONE 2: WHITE VICTORIAN CRAVAT & HIGH CRIMSON COLLAR (normY: +0.22 to +0.44) ──
      if (normY < +0.44) {
        // Flamboyant Victorian White Ascot/Cravat Knot (|normX| <= 0.16)
        if (Math.abs(normX) <= 0.16) {
          if (normY < +0.28 && Math.abs(normX) <= 0.08) {
            destCtx.fillStyle = '#FFFFFF'; // Cravat silk knot glint
          } else if (normY < +0.36) {
            destCtx.fillStyle = '#F1F5F9'; // Pure white silk cravat
          } else {
            destCtx.fillStyle = '#CBD5E1'; // Cascading cravat fold shadow
          }
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // High Standing Crimson Trench Coat Lapels (0.16 < |normX| <= 0.78)
        if (Math.abs(normX) >= 0.70) {
          destCtx.fillStyle = '#5A0000'; // Dark crimson outer seam
        } else if (normY < +0.30) {
          destCtx.fillStyle = '#B91C1C'; // High collar rim highlight
        } else {
          destCtx.fillStyle = '#8B0000'; // Crimson duster coat lapels
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 5. TORSO, CHARCOAL VEST & CRIMSON CAPELET (normY: +0.44 to +0.68) ──
      if (normY < +0.68) {
        // Shoulder Capelet / Flared Mantle (|normX| >= 0.38)
        if (Math.abs(normX) >= 0.38) {
          if (Math.abs(normX) >= 0.68) {
            destCtx.fillStyle = '#4D0000'; // Capelet edge shadow
          } else if (normY < +0.54) {
            destCtx.fillStyle = '#A30F0F'; // Mantle fold highlight
          } else {
            destCtx.fillStyle = '#8B0000'; // Rich crimson mantle body
          }
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Center Cravat Ribbon Tails (|normX| <= 0.10 && normY < +0.52)
        if (Math.abs(normX) <= 0.10 && normY < +0.52) {
          destCtx.fillStyle = normY < +0.48 ? '#E2E8F0' : '#94A3B8';
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Charcoal Victorian Waistcoat / Vest (|normX| < 0.38)
        const isGoldButton = (gx === 0 && (gy === 10 || gy === 13));
        if (isGoldButton) {
          destCtx.fillStyle = '#F59E0B'; // Gold vest buttons
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        if (Math.abs(normX) < 0.18) {
          destCtx.fillStyle = '#232730'; // Vest center placket
        } else {
          destCtx.fillStyle = '#171920'; // Vest side shadow
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 6. ZONE 3: CROSSED LEATHER GUN BELTS & SILVER BUCKLES (normY: +0.68 to +0.80) ──
      if (normY < +0.80) {
        // Center Ornate Silver Buckle (|normX| <= 0.16)
        if (Math.abs(normX) <= 0.16) {
          if (Math.abs(normX) <= 0.08 && normY >= +0.71 && normY <= +0.77) {
            destCtx.fillStyle = '#FFFFFF'; // Buckle center silver glint
          } else {
            destCtx.fillStyle = '#CBD5E1'; // Silver buckle frame
          }
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Heavy Dark Leather Gun Belt & Holster Straps
        destCtx.fillStyle = (normY < +0.74) ? '#382015' : '#20120B';
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── 7. ZONE 4: CRIMSON COAT TAILS & CHARCOAL TROUSERS (normY: +0.80 to +1.00) ──
      // Billowing Crimson Coat Tails (Outer Flanks: |normX| >= 0.42)
      if (Math.abs(normX) >= 0.42) {
        if (Math.abs(normX) >= 0.70) {
          destCtx.fillStyle = '#500000'; // Outer seam fold
        } else {
          destCtx.fillStyle = '#8B0000'; // Flowing crimson coat tails
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // Charcoal Victorian Dress Trousers (Center: |normX| < 0.42)
      if (Math.abs(normX) <= 0.04) {
        destCtx.fillStyle = '#141820'; // Center fly/crease seam
      } else {
        destCtx.fillStyle = '#242A36'; // Charcoal trousers body (Luminance Y >= 24)
      }
      destCtx.fillRect(px, py, P, P);
    }
  }

  destCtx.restore();
}

/**
 * Draws Alucard's authentic pixel-art body with offscreen canvas caching (Toji Standard).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character radius
 */
export function drawAlucardPixelBody(ctx, r = 25) {
  if (typeof document === 'undefined') {
    _renderAlucardPixelBodyToCanvas(ctx, r);
    return;
  }

  const intR = Math.round(r);
  if (!_cachedAlucardBodyCanvas || _cachedAlucardBodyR !== intR) {
    const steps = Math.ceil((intR + P) / P);
    const size = (steps * 2 + 1) * P;
    _cachedAlucardBodyCanvas = document.createElement('canvas');
    _cachedAlucardBodyCanvas.width = size;
    _cachedAlucardBodyCanvas.height = size;
    const cctx = _cachedAlucardBodyCanvas.getContext('2d');
    _renderAlucardPixelBodyToCanvas(cctx, intR);
    _cachedAlucardBodyR = intR;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const size = _cachedAlucardBodyCanvas.width;
  ctx.drawImage(_cachedAlucardBodyCanvas, -size / 2, -size / 2);
  ctx.restore();
}

export const drawGunslingerPixelBody = drawAlucardPixelBody;

/**
 * Draws Alucard's iconic procedural wide-brimmed crimson fedora hat
 * with black ribbon band and front rim curvature.
 */
function _drawProceduralAlucardFedora(ctx, r) {
  const P = 2.0;
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const rect = (gx, gy, gw, gh, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(gx * P), Math.round(gy * P), Math.round(gw * P), Math.round(gh * P));
  };

  // Wide Curved Brim: gx: -18 to +18, gy: -12 to -9
  rect(-18, -10, 36, 2, '#0E0F14'); // Brim outline
  rect(-17, -11, 34, 2, '#8B0000'); // Brim base crimson
  rect(-15, -12, 30, 1, '#A30F0F'); // Brim top curved glint
  rect(-18, -9, 36, 1, '#500000');  // Brim underside shadow

  // Black Ribbon Band: gx: -10 to +10, gy: -15 to -12
  rect(-11, -15, 22, 4, '#0E0F14');
  rect(-10, -14, 20, 2, '#181A20');
  rect(-8, -14, 16, 1, '#333844');  // Ribbon sheen

  // Fedora Creased Crown: gx: -10 to +10, gy: -22 to -15
  rect(-11, -22, 22, 8, '#0E0F14'); // Crown outline
  rect(-10, -21, 20, 7, '#8B0000'); // Crown body
  rect(-8, -22, 16, 2, '#A30F0F');  // Crown crease top
  rect(-6, -23, 12, 1, '#C21E1E');  // Specular top highlight
  rect(-10, -19, 5, 5, '#5A0000');  // Left dent shadow
  rect(5, -19, 5, 5, '#A30F0F');   // Right highlight crease

  ctx.restore();
}

/**
 * Draws a single Rule 20 compliant Alucard white combat glove with red Hellsing seal rune.
 * Canonical standard: radius = handR, white glove, manga dark ink outline, red sigil square.
 */
export function drawAlucardHand(ctx, cx = 0, cy = 0, handR = 7.5) {
  drawPixelHand(ctx, cx, cy, handR, '#F8FAFC', '#0E0F14');
  ctx.save();
  ctx.fillStyle = '#DC2626';
  const sigilSize = Math.max(2, Math.round(handR * 0.45));
  ctx.fillRect(Math.round(cx - sigilSize / 2), Math.round(cy - sigilSize / 2), sigilSize, sigilSize);
  ctx.restore();
}

/**
 * Draws Alucard's Rule 20 compliant white combat gloves with Hellsing sigil rune at canonical lower flanks.
 */
export function drawAlucardHands(ctx, r, hideHands = false) {
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || hideHands;
  if (shouldHideHands) return;

  const handR = getHandSize(r * 0.30);
  const leftX = -r * 0.82;
  const rightX = r * 0.82;
  const handY = r * 0.38;

  // Left White Glove (Front layer, overlapping lower perimeter)
  drawAlucardHand(ctx, leftX, handY, handR);
  // Right White Glove
  drawAlucardHand(ctx, rightX, handY, handR);
}

/**
 * Main Alucard Skin entry point.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object|number} fighterOrX - Fighter entity or x coordinate
 * @param {number} [y]
 * @param {number} [r]
 * @param {number} [angle]
 * @param {string} [color]
 */
export function drawAlucardSkin(ctx, fighterOrX, y, r, angle, color) {
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

  // Draw authentic Alucard pixel body
  drawAlucardPixelBody(ctx, radius);

  // Draw Layer 2 Head Assets: Glasses & Fedora Hat
  _drawAlucardGlasses(ctx, radius, facingLeft);
  _drawAlucardHat(ctx, radius, facingLeft);

  // Rule 20 Single-Source-of-Truth Hand Standard:
  // Alucard's single pair of white combat gloves is rendered exclusively by his dual firearms (drawAlucardDualGuns).
  // Default static body hands are completely removed/hidden across all states to prevent duplicate hands.

  ctx.restore();
}

export const drawGunslingerSkin = drawAlucardSkin;
