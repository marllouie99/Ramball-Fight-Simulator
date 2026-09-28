// ─────────────────────────────────────────────
// MEGUMIN FIGHTER SKIN & PIXEL ART BODY MODEL
// The Crimson Demon Archmage (KonoSuba)
// Features Authentic Procedural Pixel-Art Body:
// 1. Faceless Peach Skin Face (Rule 19 Compliant, Faceless Aesthetic)
// 2. Iconic Black Eyepatch with Gold Trim & Ruby Cross Seal
// 3. Pointed Conical Archmage Wizard Hat with Gold Buckle & Brim Decals
// 4. Crimson Demon Tunic Robe with Gold Trim & Shoulder Wizard Cape
// 5. Dark Leather Belt with Brass Buckle & Black Velvet Neck Choker
// 6. Asymmetric Leg Bandages & Dark Stocking
// 7. Hairless Base Canvas (Strictly Prepared for Hair Asset Drop-In)
// Adheres strictly to:
// - Rule 19 (Upright Front POV Camera Orientation)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 3.5 (Discrete Grid P=2.0px & Offscreen Canvas Cache)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

let _meguminHairImage = null;
let _meguminHairImageLoading = false;

/**
 * Image loader for Megumin's upcoming hair asset (Assets/model/Megumin-hair.png).
 */
export function _getMeguminHairImage() {
  if (_meguminHairImage && _meguminHairImage.complete && _meguminHairImage.naturalWidth > 0) {
    return _meguminHairImage;
  }
  if (!_meguminHairImageLoading && typeof Image !== 'undefined') {
    _meguminHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _meguminHairImage = img;
      _meguminHairImageLoading = false;
    };
    img.onerror = () => {
      // Gracefully silent if asset is not yet added to workspace
      _meguminHairImageLoading = false;
    };
    img.src = 'Assets/model/Megumin-hair.png?v=1';
    _meguminHairImage = img;
  }
  return _meguminHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getMeguminHairImage();
}

/**
 * Draws Megumin's hair asset if present.
 * If no asset is present, nothing is drawn (no procedural hair per user specification).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawMeguminHair(ctx, r, facingLeft = false) {
  const hairImg = _getMeguminHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor pixel fidelity (Rule 19)

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.megumin) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;

    const targetHairWidth = r * 2.50 * wMult;
    const targetHairHeight = r * 2.00 * hMult;
    const natW = hairImg.naturalWidth || 500;
    const natH = hairImg.naturalHeight || 500;
    const scaleX = targetHairWidth / natW;
    const scaleY = targetHairHeight / natH;
    const drawW = natW * scaleX;
    const drawH = natH * scaleY;
    const drawX = -drawW / 2 + offX;
    const drawY = -r * 1.30 + offY;

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
 * Draws Megumin's casting hand or fist in authentic pixel art style.
 */
export function drawMeguminFist(ctx, x, y, radius, skinColor = '#FFE0BD') {
  ctx.save();
  ctx.translate(x, y);
  drawPixelHand(ctx, 0, 0, radius, skinColor, '#14080E');
  ctx.restore();
}

/**
 * Draws Megumin's Archmage Walnut Staff with floating Crimson Mana Orb.
 */
export function drawMeguminStaff(ctx, x, y, r, isChanneling = false) {
  ctx.save();
  ctx.translate(x, y);

  const staffLen = r * 2.4;
  const shaftW = 3.0;

  // 1. Walnut wood staff shaft
  ctx.fillStyle = '#4A2810';
  ctx.fillRect(-shaftW / 2, -staffLen * 0.70, shaftW, staffLen);

  // Shaft highlight
  ctx.fillStyle = '#6E3C18';
  ctx.fillRect(-shaftW / 2 + 0.8, -staffLen * 0.70, 1.2, staffLen);

  // 2. Ornate Golden Claw Mount at Top
  const topY = -staffLen * 0.70;
  ctx.fillStyle = '#FFD166';
  ctx.beginPath();
  ctx.arc(0, topY, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#B48220';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 3. Floating Crimson Mana Sphere (Center Core)
  const orbY = topY - 8.0;
  const orbR = isChanneling ? 6.5 : 4.8;

  // Concentric mana glow (Rule 11 Zero shadowBlur)
  if (isChanneling) {
    const pulse = (typeof performance !== 'undefined' ? Math.sin(performance.now() * 0.01) : 0) * 1.5;
    const glowGrad = ctx.createRadialGradient(0, orbY, 1, 0, orbY, orbR + 7 + pulse);
    glowGrad.addColorStop(0, 'rgba(255, 230, 100, 0.9)');
    glowGrad.addColorStop(0.4, 'rgba(230, 20, 40, 0.6)');
    glowGrad.addColorStop(1, 'rgba(200, 0, 30, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, orbY, orbR + 7 + pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // Solid Core Ruby Sphere
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.arc(0, orbY, orbR, 0, Math.PI * 2);
  ctx.fill();

  // Specular glint
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-1.2, orbY - 1.2, 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

let _cachedMeguminBodyCanvas = null;
let _cachedMeguminBodyR = 0;

/**
 * Procedural Pixel Art Render Function (Renders once to offscreen cache).
 * Adheres strictly to:
 * - Rule 19: Upright Front POV orientation
 * - Faceless Minimalist Aesthetic (zero eyes, pupils, mouth, nose)
 * - NO PROCEDURAL HAIR (clean surface ready for hair PNG asset)
 * - Iconic Black Eyepatch on Right Eye
 * - Pointed Conical Wizard Hat with Gold Buckle
 * - Crimson Robes, Velvet Choker, Leather Belt & Asymmetric Legwear
 */
function _renderMeguminPixelBodyToCanvas(destCtx, r) {
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
        destCtx.fillStyle = '#14080E'; // Dark Charcoal Mana Ink Outline
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // ZONE 1: Face & Head (ry < r * 0.18)
      // Faceless Peach Skin (NO HAIR DRAWN)
      // ──────────────────────────────────────────
      if (ry < r * 0.18) {
        let col = '#FFE0BD'; // Base peach skin tone

        // Subtle cheek / perimeter shading
        if (Math.abs(rx) > r * 0.68 || ry > r * 0.08) {
          col = '#F5CBA7'; // Warm contour shadow
        } else if (ry < -r * 0.25) {
          col = '#FFF0DE'; // Forehead highlight
        }

        // ──────────────────────────────────────────
        // Iconic Black Eyepatch with Gold Border & Ruby Cross
        // Located over right eye: rx in [r * 0.14, r * 0.46], ry in [-r * 0.06, r * 0.10]
        // ──────────────────────────────────────────
        if (rx >= r * 0.14 && rx <= r * 0.46 && ry >= -r * 0.06 && ry <= r * 0.10) {
          const isPatchBorder = (
            rx <= r * 0.18 || rx >= r * 0.42 ||
            ry <= -r * 0.02 || ry >= r * 0.06
          );

          if (isPatchBorder) {
            col = '#FFD166'; // Gold Eyepatch Border
          } else if (
            // Center Ruby Cross
            (Math.abs(rx - r * 0.30) <= P * 0.6) ||
            (Math.abs(ry - r * 0.02) <= P * 0.6)
          ) {
            col = '#EF4444'; // Glowing Ruby Seal Cross
          } else {
            col = '#1C1924'; // Matte Black Eyepatch Fabric
          }
        }
        // Diagonal Eyepatch Strap extending to right temple
        else if (rx > r * 0.46 && Math.abs(ry - (-r * 0.08 + (rx - r * 0.46) * 0.4)) <= P * 0.6) {
          col = '#14080E';
        }

        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: Neck Collar & Velvet Choker (r * 0.18 <= ry < r * 0.32)
      // ──────────────────────────────────────────
      else if (ry < r * 0.32) {
        // Center Velvet Choker Band
        if (Math.abs(rx) <= r * 0.35 && ry >= r * 0.20 && ry <= r * 0.28) {
          if (Math.abs(rx) <= P * 0.7) {
            destCtx.fillStyle = '#EF4444'; // Central Ruby Brooch Gem
          } else if (Math.abs(rx) <= r * 0.10) {
            destCtx.fillStyle = '#FFD166'; // Gold Brooch Mount
          } else {
            destCtx.fillStyle = '#181216'; // Black Velvet Choker
          }
        } else if (Math.abs(rx) <= r * 0.45) {
          destCtx.fillStyle = '#F8F4F0'; // Cream-White Collar Trim
        } else {
          destCtx.fillStyle = '#A3161D'; // Crimson Cape Shoulder Fold
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: Crimson Archmage Robe Tunic (r * 0.32 <= ry < r * 0.58)
      // ──────────────────────────────────────────
      else if (ry < r * 0.58) {
        // Gold filigree vertical center seam
        if (Math.abs(rx) <= P * 0.6) {
          destCtx.fillStyle = '#FFD166'; // Gold Center Seam Line
        }
        // Outer wizard cape drape on shoulders
        else if (Math.abs(rx) > r * 0.65) {
          destCtx.fillStyle = (rx > 0) ? '#8B1118' : '#720E14'; // Crimson Cape Drapery
        }
        // Tunic Chest Highlight
        else if (Math.abs(rx) < r * 0.35 && ry > r * 0.36 && ry < r * 0.48) {
          destCtx.fillStyle = '#DC2626'; // Bright Crimson Tunic
        } else {
          destCtx.fillStyle = '#C81D25'; // Standard Crimson Robe Red
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 4: Leather Belt & Brass Buckle (r * 0.58 <= ry < r * 0.70)
      // ──────────────────────────────────────────
      else if (ry < r * 0.70) {
        // Center Brass Buckle
        if (Math.abs(rx) <= r * 0.20) {
          if (
            Math.abs(rx) > r * 0.12 ||
            ry <= r * 0.60 || ry >= r * 0.68
          ) {
            destCtx.fillStyle = '#FFD166'; // Outer Brass Frame
          } else {
            destCtx.fillStyle = '#3A1E0B'; // Buckle Hole Dark Interior
          }
        } else {
          destCtx.fillStyle = '#5C3316'; // Saddle Brown Leather Belt
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 5: Lower Skirt & Asymmetric Legwear (ry >= r * 0.70)
      // ──────────────────────────────────────────
      else {
        // Gold trim hem on skirt border
        if (ry < r * 0.78) {
          destCtx.fillStyle = (Math.abs(rx) <= P * 0.6) ? '#FFD166' : '#A3161D'; // Crimson Skirt Fold
        }
        // Legwear: Right Leg (rx > 0) Bandage Wraps, Left Leg (rx < 0) Dark Stocking
        else if (rx > P * 0.6) {
          // Bandage wraps (alternating off-white & shadow)
          destCtx.fillStyle = (Math.floor(ry / (P * 1.5)) % 2 === 0) ? '#F3F4F6' : '#D1D5DB';
        } else if (rx < -P * 0.6) {
          // Dark thigh-high stocking
          destCtx.fillStyle = '#1F1D24';
        } else {
          destCtx.fillStyle = '#14080E'; // Center leg gap shadow
        }
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  // ──────────────────────────────────────────
  // Pointed Conical Archmage Wizard Hat
  // ──────────────────────────────────────────
  _renderMeguminWizardHat(destCtx, r, P);

  destCtx.restore();
}

/**
 * Draws Megumin's iconic oversized pointed Archmage Hat on the offscreen canvas.
 */
function _renderMeguminWizardHat(ctx, r, P) {
  // 1. Conical Crown Hat Cone (Extending up to -1.35r)
  const coneTopY = -r * 1.35;
  const coneBaseY = -r * 0.45;
  const coneHalfW = r * 0.75;

  ctx.fillStyle = '#4A192C'; // Dark Crimson-Plum Felt
  ctx.beginPath();
  ctx.moveTo(r * 0.15, coneTopY); // Slightly crooked pointed tip
  ctx.lineTo(coneHalfW, coneBaseY);
  ctx.lineTo(-coneHalfW, coneBaseY);
  ctx.closePath();
  ctx.fill();

  // Dark shading on left side of cone
  ctx.fillStyle = '#33101E';
  ctx.beginPath();
  ctx.moveTo(r * 0.15, coneTopY);
  ctx.lineTo(-coneHalfW, coneBaseY);
  ctx.lineTo(0, coneBaseY);
  ctx.closePath();
  ctx.fill();

  // Cone manga ink border
  ctx.strokeStyle = '#14080E';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // 2. Gold Hat Belt Band
  ctx.fillStyle = '#FFD166';
  ctx.fillRect(-coneHalfW * 0.88, coneBaseY - 5, coneHalfW * 1.76, 5);
  ctx.fillStyle = '#B48220';
  ctx.fillRect(-3, coneBaseY - 6, 6, 7); // Center gold buckle

  // 3. Wide Circular Curved Brim (y = -r * 0.45 to -r * 0.32)
  const brimW = r * 1.35;
  const brimH = r * 0.35;
  const brimY = -r * 0.40;

  ctx.fillStyle = '#5A1E35';
  ctx.beginPath();
  ctx.ellipse(0, brimY, brimW, brimH, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#14080E';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 4. Iconic Smiling Face Button Decals on Hat Brim
  ctx.fillStyle = '#FFD166';
  ctx.beginPath();
  ctx.arc(-r * 0.45, brimY, 3.2, 0, Math.PI * 2);
  ctx.arc(r * 0.45, brimY, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#14080E';
  ctx.beginPath();
  ctx.arc(-r * 0.45, brimY, 1.2, 0, Math.PI * 2);
  ctx.arc(r * 0.45, brimY, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Procedural Pixel Body Interface.
 */
export function drawMeguminPixelBody(ctx, r = 24, facingLeft = false) {
  const roundedR = Math.round(r);
  const size = (roundedR + 12) * 2;

  if (!_cachedMeguminBodyCanvas || _cachedMeguminBodyR !== roundedR) {
    if (typeof document !== 'undefined') {
      _cachedMeguminBodyCanvas = document.createElement('canvas');
      _cachedMeguminBodyCanvas.width = size;
      _cachedMeguminBodyCanvas.height = size;
      const offCtx = _cachedMeguminBodyCanvas.getContext('2d');
      _renderMeguminPixelBodyToCanvas(offCtx, roundedR);
      _cachedMeguminBodyR = roundedR;
    }
  }

  if (_cachedMeguminBodyCanvas) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(_cachedMeguminBodyCanvas, -size / 2, -size / 2);
    ctx.restore();
  }
}

/**
 * Draws Megumin's comic Faceplant Burnout State (Helpless Prone Sprite).
 */
export function drawMeguminFaceplantSprite(ctx, r) {
  ctx.save();
  // Flat horizontal collapsed ellipse
  ctx.fillStyle = '#C81D25';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.4, r * 1.3, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#14080E';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Fallen wizard hat next to her
  ctx.fillStyle = '#5A1E35';
  ctx.beginPath();
  ctx.ellipse(-r * 0.8, r * 0.2, r * 0.6, r * 0.35, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Comedic dizzy spiral runes
  ctx.strokeStyle = '#FFD166';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(r * 0.5, -r * 0.1, 4.0, 0, Math.PI * 1.5);
  ctx.stroke();

  ctx.restore();
}

/**
 * Main Skin Renderer for Megumin (The Crimson Demon Archmage).
 */
export function drawMeguminSkin(ctx, fighter) {
  const r = fighter.r || 24;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const isDepleted = Boolean(fighter.isDepleted || fighter.isProne || (fighter.faceplantTimer && fighter.faceplantTimer > 0));
  const isChanting = Boolean(fighter.isChantingExplosion || fighter.isChanting);

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. If exhausted from Explosion, render comic faceplant burnout state
  if (isDepleted && !isPodiumPreview) {
    drawMeguminFaceplantSprite(ctx, r);
    ctx.restore();
    return;
  }

  // 2. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  const hideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;

  // 3. Layer A: Back Hand (Chuunibyou Dramatic Stance behind body)
  if (!hideHands) {
    const backHandX = r * 1.05;
    const backHandY = -r * 0.10;
    drawMeguminFist(ctx, backHandX, backHandY, getHandSize(5.5), '#FFE0BD');
  }

  // 4. Layer B: Pixel Art Body Circle (with Eyepatch, Wizard Hat & Robes; NO HAIR)
  drawMeguminPixelBody(ctx, r, facingLeft);

  // 5. Layer C: Draw Hair Asset if loaded (Assets/model/Megumin-hair.png)
  _drawMeguminHair(ctx, r, facingLeft);

  // 6. Layer D: Front Hand & Archmage Staff (on top of body circle)
  if (!hideHands) {
    const frontHandX = r * 0.15;
    const frontHandY = r * 0.15;
    drawMeguminStaff(ctx, frontHandX + 12, frontHandY - 4, r, isChanting);
    drawMeguminFist(ctx, frontHandX, frontHandY, getHandSize(6.0), '#FFE0BD');
  }

  ctx.restore();
}
