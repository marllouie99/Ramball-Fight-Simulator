// ─────────────────────────────────────────────
// MEGUMIN FIGHTER SKIN & PIXEL ART BODY MODEL
// The Crimson Demon Archmage (KonoSuba)
// Authentic Anime & Manga Proportions (1:1 with Makima & Reze Standard)
// Features Authentic Procedural Pixel-Art Model:
// 1. Faceless Peach Skin Face (Rule 19 Compliant, Faceless Aesthetic)
// 2. Iconic Black Eyepatch with Gold Trim & Ruby Cross Seal
// 3. Voluminous Brunette Bob Hair & Side Cheek Locks (Matching Makima/Reze R*2.30 Silhouette)
// 4. Oversized Pointed Archmage Wizard Hat with Gold Buckle & Brim Decals
// 5. Crimson Demon Tunic Robe with Gold Trim, Velvet Choker & Flared Shoulder Mantle
// 6. Dark Leather Belt with Brass Buckle & Asymmetric Legwear
// Adheres strictly to:
// - Rule 19 (Upright Front POV Camera Orientation)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 3.4 (Discrete Lock Arrays for Hair - No Sine Waves)
// - Rule 3.5 (Discrete Grid P=2.0px & Offscreen Canvas Cache)
// ─────────────────────────────────────────────

import { CONFIG, getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

let _meguminHairImage = null;

/**
 * Megumin's model features complete authentic procedural brunette hair & oversized hat.
 * Returns null as no external PNG hair asset is needed.
 */
export function _getMeguminHairImage() {
  return null;
}

/**
 * Optional Hair PNG Asset Hook if user supplies custom texture.
 */
export function _drawMeguminHair(ctx, r, facingLeft = false) {
  const hairImg = _getMeguminHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.megumin) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;

    const targetHairWidth = r * 2.30 * wMult;
    const targetHairHeight = r * 2.25 * hMult;
    const natW = hairImg.naturalWidth || 500;
    const natH = hairImg.naturalHeight || 500;
    const scaleX = targetHairWidth / natW;
    const scaleY = targetHairHeight / natH;
    const drawW = natW * scaleX;
    const drawH = natH * scaleY;
    const drawX = -drawW / 2 + offX;
    const drawY = -r * 1.28 + offY;

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
 * Draws Megumin's casting hand or fist in authentic pixel art style (Matching Makima & Reze scale).
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

  const staffLen = r * 2.6;
  const shaftW = 3.2;

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
  ctx.arc(0, topY, 6.0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#B48220';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 3. Floating Crimson Mana Sphere (Center Core)
  const orbY = topY - 9.0;
  const orbR = isChanneling ? 7.2 : 5.4;

  // Concentric mana glow (Rule 11 Zero shadowBlur)
  if (isChanneling) {
    const pulse = (typeof performance !== 'undefined' ? Math.sin(performance.now() * 0.01) : 0) * 1.8;
    const glowGrad = ctx.createRadialGradient(0, orbY, 1, 0, orbY, orbR + 9 + pulse);
    glowGrad.addColorStop(0, 'rgba(255, 230, 100, 0.95)');
    glowGrad.addColorStop(0.4, 'rgba(230, 20, 40, 0.65)');
    glowGrad.addColorStop(1, 'rgba(200, 0, 30, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, orbY, orbR + 9 + pulse, 0, Math.PI * 2);
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
  ctx.arc(-1.4, orbY - 1.4, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

let _cachedMeguminBodyCanvas = null;
let _cachedMeguminBodyR = 0;

/**
 * Procedural Pixel Art Render Function (Renders once to offscreen cache).
 * Hatless Edition: Megumin's complete iconic voluminous brunette bob haircut:
 * - Crown Hair & Ahoge Tuft: ny in [-1.22, -0.65] (discrete lock arrays & glint)
 * - Voluminous Side Bob Locks: absX in [0.65r, 1.15r], ny in [-0.70, 0.35]
 * - Sweeping Forehead Bangs: ny in [-0.65, -0.12]
 * - Radiant Porcelain Face & Eyepatch: -0.15 <= ny < 0.22 (Full face 1:1 with Makima & Reze)
 * - Velvet Choker & Ruby Brooch: 0.22 <= ny < 0.35
 * - Crimson Tunic Robe: 0.35 <= ny < 0.68 (Full-bodied robe)
 * - Leather Belt & Brass Buckle: 0.68 <= ny < 0.78
 * - Skirt & Asymmetric Legwear: ny >= 0.78
 * - Flared Cape Mantle Shoulders: absX in [0.72r, 1.25r]
 */
function _renderMeguminPixelBodyToCanvas(destCtx, r) {
  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);
  const P = 2.0;
  const steps = Math.ceil((r * 1.35 + P) / P);

  // ──────────────────────────────────────────
  // 1. LAYER A: Voluminous Brunette Crown Dome, Ahoge, Side Locks & Flared Cape Mantle
  // ──────────────────────────────────────────
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      const absX = Math.abs(rx);
      const nx = rx / r;
      const ny = ry / r;

      const px = rx - P / 2;
      const py = ry - P / 2;

      // A. Outer Shoulder Cape Wings (absX in [0.72r, 1.25r], ry in [0.22r, 0.72r])
      const isCapeWing = (absX >= r * 0.72 && absX <= r * 1.25 && ry >= r * 0.22 && ry <= r * 0.72 && dist <= r * 1.28);
      if (isCapeWing) {
        if (absX >= r * 1.18 || ry >= r * 0.67) {
          destCtx.fillStyle = '#FFD166'; // Arcane Gold Trim
        } else if (absX >= r * 1.02) {
          destCtx.fillStyle = (rx > 0) ? '#8B1118' : '#720E14'; // Darker Cape Shadow Fold
        } else {
          destCtx.fillStyle = '#A3161D'; // Crimson Cape Base
        }
        destCtx.fillRect(px, py, P, P);

        if (absX >= r * 1.22 || ry >= r * 0.70) {
          destCtx.fillStyle = '#14080E'; // Outer Ink Outline
          destCtx.fillRect(px, py, P, P);
        }
        continue;
      }

      // B. Crown Hair Dome & Ahoge Tuft (ny in [-1.22, -0.65], absX <= 1.08)
      // Discrete lock array defining the top crown silhouette
      let isCrownHair = false;
      let isCrownAhoge = false;
      if (ny >= -1.22 && ny < -0.65 && absX <= 1.08) {
        // Skull dome curve with discrete triangular anime locks
        const domeLimitY = -1.02 - (1.0 - Math.pow(absX / 1.08, 2.0)) * 0.16;
        const leftTuft = (nx >= -0.75 && nx <= -0.35 && ny >= -1.14 - (nx + 0.55) * 0.2);
        const centerTuft = (nx >= -0.30 && nx <= 0.25 && ny >= -1.18);
        const rightTuft = (nx >= 0.30 && nx <= 0.75 && ny >= -1.14 + (nx - 0.55) * 0.2);
        // Signature cute ahoge tuft curling at top right
        const ahoge = (nx >= 0.08 && nx <= 0.26 && ny >= -1.24 && ny <= -1.12 && Math.abs((ny + 1.18) - (nx - 0.17) * 0.7) <= 0.06);

        if (ny >= domeLimitY || leftTuft || centerTuft || rightTuft) {
          isCrownHair = true;
        } else if (ahoge) {
          isCrownHair = true;
          isCrownAhoge = true;
        }
      }

      if (isCrownHair) {
        // Outline check for crown hair
        const isCrownEdge = (ny <= -1.16 || absX >= 0.98 || isCrownAhoge);
        if (isCrownEdge) {
          destCtx.fillStyle = '#14080E'; // Dark Manga Ink Outline
        } else if (ny <= -1.02 && absX <= 0.55) {
          destCtx.fillStyle = '#6A3B5C'; // Specular Crown Sheen Glint
        } else if (ny <= -0.85 && absX <= 0.70) {
          destCtx.fillStyle = '#4D2A42'; // Mid-Tone Hair Highlight
        } else if (ny >= -0.75) {
          destCtx.fillStyle = '#22121E'; // Hair Shadow Root
        } else {
          destCtx.fillStyle = '#3B2032'; // Brunette Base Tone
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // C. Voluminous Brunette Side Locks (absX in [0.65r, 1.15r], ry in [-0.70r, 0.35r])
      const isSideHair = (absX >= r * 0.65 && absX <= r * 1.15 && ry >= -r * 0.70 && ry <= r * 0.35);
      if (isSideHair) {
        const lockTipY = r * 0.35 - (absX - r * 0.65) * 0.45;
        if (ry <= lockTipY) {
          if (absX >= r * 1.08 || ry >= lockTipY - P) {
            destCtx.fillStyle = '#14080E'; // Dark Manga Ink Outline
          } else if (absX >= r * 0.92) {
            destCtx.fillStyle = '#22121E'; // Hair Shadow Root
          } else if (ry <= -r * 0.25) {
            destCtx.fillStyle = '#582E48'; // Specular Glint
          } else {
            destCtx.fillStyle = '#3B2032'; // Brunette Mid-Tone
          }
          destCtx.fillRect(px, py, P, P);
        }
      }
    }
  }

  // ──────────────────────────────────────────
  // 2. LAYER B: Core Full-Size Symmetrical Circular Body (Exact Makima / Reze Proportions)
  // ──────────────────────────────────────────
  const coreSteps = Math.ceil((r + P) / P);
  for (let gy = -coreSteps; gy <= coreSteps; gy++) {
    for (let gx = -coreSteps; gx <= coreSteps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;

      // 4-neighbor boundary test for clean outer manga ink outline
      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );

      if (isBorder) {
        destCtx.fillStyle = '#14080E';
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // Normalized coordinates from -1.0 to +1.0
      const nx = rx / r;
      const ny = ry / r;
      const absX = Math.abs(nx);

      // ──────────────────────────────────────────
      // ZONE 1: Sweeping Forehead Bangs (ny < -0.15)
      // ──────────────────────────────────────────
      if (ny < -0.15) {
        // Discrete Triangular Anime Bang Locks peeking down into forehead
        const leftBang = (nx >= -0.60 && nx <= -0.18 && ny <= -0.20 + (nx + 0.38) * 0.4);
        const centerBang = (nx >= -0.22 && nx <= 0.08 && ny <= -0.12 - Math.abs(nx + 0.07) * 0.6);
        const rightBang = (nx >= 0.15 && nx <= 0.60 && ny <= -0.18 - (nx - 0.38) * 0.4);

        const isBangLock = (ny <= -0.45 || leftBang || centerBang || rightBang);

        if (isBangLock) {
          if (ny >= -0.22) {
            destCtx.fillStyle = '#14080E'; // Bang tip ink outline
          } else if (ny <= -0.70) {
            destCtx.fillStyle = '#22121E'; // Hair root shadow
          } else if (ny <= -0.45 && absX <= 0.50) {
            destCtx.fillStyle = '#582E48'; // Hair sheen highlight
          } else {
            destCtx.fillStyle = '#3B2032'; // Brunette base tone
          }
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Exposed Forehead Porcelain Skin under bangs
        let col = (absX >= 0.55) ? '#F5CBA7' : '#FFE0BD';
        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: Face & Eyepatch ( -0.15 <= ny < 0.22 - Full Size Face matching Makima/Reze )
      // ──────────────────────────────────────────
      else if (ny < 0.22) {
        // Base peach porcelain skin tone
        let col = '#FFE0BD';

        if (absX >= 0.55) {
          col = '#F5CBA7'; // Soft warm cheek contour shadow
        } else if (ny >= -0.05 && ny < 0.18 && absX < 0.35) {
          col = '#FFF0DE'; // Radiant face center highlight
        }

        // ──────────────────────────────────────────
        // Iconic Black Eyepatch with Gold Border & Ruby Cross
        // Located over right eye: nx in [0.12, 0.46], ny in [-0.08, 0.12]
        // ──────────────────────────────────────────
        if (nx >= 0.12 && nx <= 0.46 && ny >= -0.08 && ny <= 0.12) {
          const isPatchBorder = (
            nx <= 0.16 || nx >= 0.42 ||
            ny <= -0.04 || ny >= 0.08
          );

          if (isPatchBorder) {
            col = '#FFD166'; // Gold Eyepatch Border
          } else if (
            // Center Ruby Cross
            (Math.abs(nx - 0.29) <= 0.04) ||
            (Math.abs(ny - 0.02) <= 0.04)
          ) {
            col = '#EF4444'; // Glowing Ruby Seal Cross
          } else {
            col = '#1C1924'; // Matte Black Eyepatch Fabric
          }
        }
        // Diagonal Eyepatch Strap extending to right temple
        else if (nx > 0.46 && Math.abs(ny - (-0.06 + (nx - 0.46) * 0.4)) <= 0.04) {
          col = '#14080E';
        }

        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: Velvet Neck Choker & Collar ( ny in [0.22, 0.35] )
      // ──────────────────────────────────────────
      else if (ny < 0.35) {
        // Center Velvet Choker Band
        if (absX <= 0.32 && ny >= 0.24 && ny <= 0.30) {
          if (absX <= 0.04) {
            destCtx.fillStyle = '#EF4444'; // Central Ruby Brooch Gem
          } else if (absX <= 0.10) {
            destCtx.fillStyle = '#FFD166'; // Gold Brooch Mount
          } else {
            destCtx.fillStyle = '#181216'; // Black Velvet Choker
          }
        } else if (absX <= 0.45) {
          destCtx.fillStyle = '#F8F4F0'; // Cream-White Collar Trim
        } else {
          destCtx.fillStyle = '#A3161D'; // Crimson Cape Shoulder Fold
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 4: Crimson Archmage Robe Tunic ( ny in [0.35, 0.68] )
      // ──────────────────────────────────────────
      else if (ny < 0.68) {
        // Gold filigree vertical center seam
        if (absX <= 0.04) {
          destCtx.fillStyle = '#FFD166'; // Gold Center Seam Line
        }
        // Outer wizard cape drape on shoulders
        else if (absX > 0.58) {
          destCtx.fillStyle = (nx > 0) ? '#8B1118' : '#720E14'; // Crimson Cape Drapery
        }
        // Tunic Chest Highlight
        else if (absX < 0.32 && ny > 0.38 && ny < 0.54) {
          destCtx.fillStyle = '#DC2626'; // Bright Crimson Tunic
        } else {
          destCtx.fillStyle = '#C81D25'; // Standard Crimson Robe Red
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 5: Leather Belt & Brass Buckle ( ny in [0.68, 0.78] )
      // ──────────────────────────────────────────
      else if (ny < 0.78) {
        // Center Brass Buckle
        if (absX <= 0.20) {
          if (
            absX > 0.10 ||
            ny <= 0.70 || ny >= 0.76
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
      // ZONE 6: Lower Skirt & Asymmetric Legwear ( ny >= 0.78 )
      // ──────────────────────────────────────────
      else {
        // Gold trim hem on skirt border
        if (ny < 0.84) {
          destCtx.fillStyle = (absX <= 0.04) ? '#FFD166' : '#A3161D'; // Crimson Skirt Fold
        }
        // Legwear: Right Leg (nx > 0) Bandage Wraps, Left Leg (nx < 0) Dark Stocking
        else if (nx > 0.04) {
          // Bandage wraps (alternating off-white & shadow)
          destCtx.fillStyle = (Math.floor(ry / (P * 1.5)) % 2 === 0) ? '#F3F4F6' : '#D1D5DB';
        } else if (nx < -0.04) {
          // Dark thigh-high stocking
          destCtx.fillStyle = '#1F1D24';
        } else {
          destCtx.fillStyle = '#14080E'; // Center leg gap shadow
        }
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  destCtx.restore();
}

/**
 * Procedural Pixel Body Interface with Offscreen Canvas Caching.
 */
export function drawMeguminPixelBody(ctx, r = 25, facingLeft = false) {
  const roundedR = Math.round(r);
  const size = Math.ceil((roundedR * 2.4 + 16) * 2 / 2.0) * 2.0;

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
  // 1. Collapsed prone crimson body ellipse
  ctx.fillStyle = '#C81D25';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.4, r * 1.35, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#14080E';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // 2. Messy brunette hair splayed on the ground
  ctx.fillStyle = '#3B2032';
  ctx.beginPath();
  ctx.ellipse(-r * 0.75, r * 0.25, r * 0.65, r * 0.40, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#14080E';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // 3. Fallen Archmage Walnut Staff lying on the grass
  ctx.fillStyle = '#4A2810';
  ctx.fillRect(r * 0.2, r * 0.75, r * 1.8, 3.0);
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.arc(r * 2.0, r * 0.78, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // 4. Comedic dizzy spiral runes
  ctx.strokeStyle = '#FFD166';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(r * 0.6, -r * 0.1, 4.5, 0, Math.PI * 1.5);
  ctx.stroke();

  ctx.restore();
}

/**
 * Discrete 5x5 Pixel Bit-Matrices for Ancient Crimson Demon Runes.
 * Authentic 16-bit arcade / retro pixel art glyphs (Rule 3.5).
 */
const PIXEL_RUNES = [
  // 0: Cross Star / Seal of Megumin
  [
    1,0,0,0,1,
    0,1,0,1,0,
    0,0,1,0,0,
    0,1,0,1,0,
    1,0,0,0,1
  ],
  // 1: Sacred Cross with T-ends
  [
    0,0,1,0,0,
    1,1,1,1,1,
    0,0,1,0,0,
    0,0,1,0,0,
    0,1,1,1,0
  ],
  // 2: Algiz (ᛉ) - Upward Elk Horns
  [
    1,0,1,0,1,
    0,1,1,1,0,
    0,0,1,0,0,
    0,0,1,0,0,
    0,0,1,0,0
  ],
  // 3: Thurisaz (Þ) - Thorn Spike
  [
    1,0,0,0,0,
    1,1,1,0,0,
    1,0,0,1,0,
    1,1,1,0,0,
    1,0,0,0,0
  ],
  // 4: 8-Point Solar Star Sigil
  [
    0,0,1,0,0,
    1,0,1,0,1,
    0,1,1,1,0,
    1,0,1,0,1,
    0,0,1,0,0
  ],
  // 5: Dagaz (ᛞ) - Hourglass of Destruction
  [
    1,0,0,0,1,
    1,1,0,1,1,
    0,0,1,0,0,
    1,1,0,1,1,
    1,0,0,0,1
  ],
  // 6: Sowilo (ᛋ) - Lightning Chevron
  [
    0,1,1,1,1,
    0,1,0,0,0,
    0,0,1,1,0,
    0,0,0,1,0,
    1,1,1,1,0
  ],
  // 7: Eye of Crimson Demon
  [
    0,1,1,1,0,
    1,0,0,0,1,
    1,0,1,0,1,
    1,0,0,0,1,
    0,1,1,1,0
  ],
  // 8: Tiwaz (ᛏ) - Arrowhead
  [
    0,0,1,0,0,
    0,1,1,1,0,
    1,0,1,0,1,
    0,0,1,0,0,
    0,0,1,0,0
  ],
  // 9: Ingwaz (ᛜ) - Arcane Diamond
  [
    0,0,1,0,0,
    0,1,0,1,0,
    1,0,0,0,1,
    0,1,0,1,0,
    0,0,1,0,0
  ],
  // 10: Kenaz (ᚲ) - Torch Beacon
  [
    1,1,1,0,0,
    0,0,0,1,0,
    0,0,0,0,1,
    0,0,0,1,0,
    1,1,1,0,0
  ],
  // 11: Archmage Crown Crest
  [
    1,0,1,0,1,
    1,0,1,0,1,
    1,1,1,1,1,
    0,1,0,1,0,
    0,0,1,0,0
  ],
  // 12: Quad Spoke Nexus
  [
    0,1,0,1,0,
    1,1,1,1,1,
    0,1,1,1,0,
    1,1,1,1,1,
    0,1,0,1,0
  ],
  // 13: Hagalaz (ᚺ) - Crystal Matrix
  [
    1,0,0,0,1,
    1,0,1,0,1,
    1,1,1,1,1,
    1,0,1,0,1,
    1,0,0,0,1
  ],
  // 14: Fehu (ᚠ) - Primordial Flame
  [
    1,1,1,1,0,
    1,0,0,0,1,
    1,1,1,1,0,
    1,0,0,0,0,
    1,0,0,0,0
  ],
  // 15: Cataclysmic Tri-Flame Sigil
  [
    0,0,1,0,0,
    1,0,1,0,1,
    0,1,1,1,0,
    1,0,1,0,1,
    0,1,0,1,0
  ]
];

let _runeAtlasCanvas = null;
let _runeAtlasLitCanvas = null;

/**
 * Pre-renders the 16 5x5 pixel runes into an in-memory sprite atlas once.
 */
function _ensureRuneAtlas() {
  if (_runeAtlasCanvas) return;
  const size = 16;
  const P = 2.0;

  _runeAtlasCanvas = document.createElement('canvas');
  _runeAtlasCanvas.width = size * PIXEL_RUNES.length;
  _runeAtlasCanvas.height = size;
  const actx = _runeAtlasCanvas.getContext('2d');
  actx.imageSmoothingEnabled = false;

  _runeAtlasLitCanvas = document.createElement('canvas');
  _runeAtlasLitCanvas.width = size * PIXEL_RUNES.length;
  _runeAtlasLitCanvas.height = size;
  const litCtx = _runeAtlasLitCanvas.getContext('2d');
  litCtx.imageSmoothingEnabled = false;

  for (let g = 0; g < PIXEL_RUNES.length; g++) {
    const grid = PIXEL_RUNES[g];
    const ox = g * size + size / 2;
    const oy = size / 2;

    actx.fillStyle = '#FF2238';
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (grid[row * 5 + col]) {
          actx.fillRect(ox + (col - 2) * P - P / 2, oy + (row - 2) * P - P / 2, P, P);
        }
      }
    }

    litCtx.fillStyle = '#FFE680';
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (grid[row * 5 + col]) {
          litCtx.fillRect(ox + (col - 2) * P - P / 2, oy + (row - 2) * P - P / 2, P, P);
        }
      }
    }
    litCtx.fillStyle = '#FFFFFF';
    litCtx.fillRect(ox - P / 2, oy - P / 2, P, P);
  }
}

/**
 * Renders an authentic procedural ancient Crimson Demon runic glyph using discrete pixel grid.
 */
export function drawCrimsonDemonRune(ctx, glyphIndex, size, alpha = 1.0, isLit = false) {
  if (alpha <= 0.01) return;
  _ensureRuneAtlas();
  const g = Math.abs(glyphIndex) % PIXEL_RUNES.length;
  const atlas = isLit ? _runeAtlasLitCanvas : _runeAtlasCanvas;
  if (!atlas) return;

  ctx.save();
  ctx.globalAlpha *= alpha;
  const s = Math.max(12, size);
  ctx.drawImage(atlas, g * 16, 0, 16, 16, -s / 2, -s / 2, s, s);
  ctx.restore();
}

/**
 * Computes heat-ramped colors based on chant progress.
 * Phase 1-2: Cold crimson red. Phase 3-4: Warm orange-red. Phase 5-6: Hot yellow-white.
 */
function getHeatColors(heat) {
  const h = Math.min(1, Math.max(0, heat));
  const r = 255;
  const g = Math.floor(20 + 210 * h);
  const b = Math.floor(10 + 60 * h * h);
  const coreR = 255;
  const coreG = Math.floor(80 + 175 * h);
  const coreB = Math.floor(20 + 235 * h * h);
  return {
    glow: `rgba(${r}, ${g}, ${b}, `,
    core: `rgb(${coreR}, ${coreG}, ${coreB})`,
    glowRGB: [r, g, b],
    coreRGB: [coreR, coreG, coreB],
  };
}

/**
 * High-performance hardware-accelerated pixel ring (single GPU draw call).
 */
function _drawPixelRing(ctx, cx, cy, radius, rimColor, coreColor, glowWidth = 3.5, coreWidth = 1.6) {
  if (radius <= 0) return;
  if (rimColor) {
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = glowWidth;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (coreColor) {
    ctx.strokeStyle = coreColor;
    ctx.lineWidth = coreWidth;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/**
 * Renders the Primary PENTAGRAM (5-Pointed Star) with batched GPU draw calls.
 */
function drawPixelPentagram(ctx, radius, rotation, alpha, heat) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.rotate(rotation);

  const hc = getHeatColors(heat);
  const verts = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    verts.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius });
  }

  const drawStarPath = () => {
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const idx = (i * 2) % 5;
      const v = verts[idx];
      if (i === 0) ctx.moveTo(v.x, v.y);
      else ctx.lineTo(v.x, v.y);
    }
    ctx.closePath();
  };

  // Pass 1: Rim
  ctx.strokeStyle = hc.glow + '0.45)';
  ctx.lineWidth = 4.0;
  drawStarPath();
  ctx.stroke();

  // Pass 2: Core
  ctx.strokeStyle = hc.core;
  ctx.lineWidth = 1.8;
  drawStarPath();
  ctx.stroke();

  // Pass 3: Center Highlight
  if (heat > 0.3) {
    const hlG = Math.floor(200 + 55 * heat);
    const hlB = Math.floor(140 + 115 * heat);
    ctx.strokeStyle = `rgb(255, ${hlG}, ${hlB})`;
    ctx.lineWidth = 0.8;
    drawStarPath();
    ctx.stroke();
  }

  // 5 vertex pixel nodes
  for (let i = 0; i < 5; i++) {
    const v = verts[i];
    ctx.fillStyle = hc.glow + '0.60)';
    ctx.fillRect(v.x - 3, v.y - 3, 6, 6);
    ctx.fillStyle = hc.core;
    ctx.fillRect(v.x - 2, v.y - 2, 4, 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(v.x - 1, v.y - 1, 2, 2);
  }

  // Inner pentagon
  const innerR = radius * 0.382;
  ctx.strokeStyle = hc.glow + '0.65)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * Math.PI * 2) / 5;
    const ix = Math.cos(a) * innerR;
    const iy = Math.sin(a) * innerR;
    if (k === 0) ctx.moveTo(ix, iy);
    else ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders diamond-shaped node seals in 1 single batched path call.
 */
function drawPixelDiamondNodeSeals(ctx, radius, count, heat, alpha) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const hc = getHeatColors(heat);
  const s = Math.max(3, radius * 0.04);

  // Batch all 8 diamonds into 1 path
  ctx.beginPath();
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 - Math.PI / 2;
    const nx = Math.cos(a) * radius;
    const ny = Math.sin(a) * radius;
    ctx.moveTo(nx, ny - s);
    ctx.lineTo(nx + s, ny);
    ctx.lineTo(nx, ny + s);
    ctx.lineTo(nx - s, ny);
    ctx.closePath();
  }
  ctx.fillStyle = hc.glow + '0.85)';
  ctx.fill();
  ctx.strokeStyle = hc.core;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Center white pixel dots
  ctx.fillStyle = '#FFFFFF';
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 - Math.PI / 2;
    const nx = Math.cos(a) * radius;
    const ny = Math.sin(a) * radius;
    ctx.fillRect(nx - 1, ny - 1, 2, 2);
  }

  ctx.restore();
}

/**
 * Renders the rune text band in discrete pixel art with pre-cached rune atlas blits.
 */
function drawPixelRuneBand(ctx, rInner, rOuter, rotation, alpha, heat) {
  if (alpha <= 0.01) return;
  _ensureRuneAtlas();
  ctx.save();
  ctx.globalAlpha *= alpha;

  const hc = getHeatColors(heat);

  // Concentric border rings: 2 batched stroke calls
  ctx.strokeStyle = hc.glow + '0.40)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, rOuter, 0, Math.PI * 2);
  ctx.arc(0, 0, rInner, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = hc.core;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, rOuter, 0, Math.PI * 2);
  ctx.arc(0, 0, rInner, 0, Math.PI * 2);
  ctx.stroke();

  // Dense pixel runes blitted from atlas
  const glyphR = (rInner + rOuter) * 0.5;
  const glyphCount = Math.min(28, Math.max(14, Math.floor(glyphR * 0.14)));
  const isLit = heat > 0.6;
  const atlas = isLit ? _runeAtlasLitCanvas : _runeAtlasCanvas;

  if (atlas) {
    const size = 16;
    for (let i = 0; i < glyphCount; i++) {
      const angle = (i / glyphCount) * Math.PI * 2 + rotation;
      const gx = Math.cos(angle) * glyphR;
      const gy = Math.sin(angle) * glyphR;
      const g = i % PIXEL_RUNES.length;

      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(angle + Math.PI / 2);
      ctx.drawImage(atlas, g * size, 0, size, size, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * Renders floating spark particles in 4 batched color passes.
 */
function drawPixelUpwardSparks(ctx, radius, frame, particleCount, heat) {
  ctx.save();
  const hc = getHeatColors(heat);
  const count = Math.min(particleCount, 25);

  for (let batch = 0; batch < 4; batch++) {
    if (batch === 0) ctx.fillStyle = '#FFFFFF';
    else if (batch === 1) ctx.fillStyle = `rgb(255, ${190 + Math.floor(65 * heat)}, ${40 + Math.floor(60 * heat)})`;
    else if (batch === 2) ctx.fillStyle = hc.core;
    else ctx.fillStyle = `rgb(255, ${100 + Math.floor(155 * heat)}, 20)`;

    for (let i = batch; i < count; i += 4) {
      const seed = i * 137.508 + i * 31.7;
      const speed = 0.012 + (i % 7) * 0.005;
      const progress = ((frame * speed + (i / count)) % 1.0);

      const originAngle = seed;
      const originDist = radius * (0.6 + 0.5 * ((i * 3.7) % 1.0));
      const px = Math.round(Math.cos(originAngle) * originDist + Math.sin(seed * 0.7 + frame * 0.01) * radius * 0.1);
      const py = Math.round(Math.sin(originAngle) * originDist - progress * radius * (0.8 + heat * 1.2));

      const pSize = (i % 3 === 0) ? 3 : 2;
      ctx.fillRect(px, py, pSize, pSize);
    }
  }

  ctx.restore();
}

/**
 * Renders the Inception Core with 3 batched stepped disks (0.001ms).
 */
function drawPixelInceptionCore(ctx, coreRadius, p1, p5, p6, frame, heat) {
  ctx.save();
  const r = Math.max(3, coreRadius);
  const hc = getHeatColors(heat);

  ctx.fillStyle = hc.glow + '0.25)';
  ctx.beginPath();
  ctx.arc(0, 0, r * (1.6 + 0.5 * p6), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hc.glow + '0.65)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hc.core;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-2, -2, 4, 4);

  ctx.restore();
}

/**
 * Renders jagged electrical mana crackles in batched paths.
 */
function drawPixelManaCrackles(ctx, radius, frame, crackleCount, heat) {
  ctx.save();
  const hc = getHeatColors(heat);
  const count = Math.min(crackleCount, 4);

  ctx.lineWidth = 1.6;
  for (let c = 0; c < count; c++) {
    const seed = Math.floor(frame * 0.35 + c * 7.7);
    const v1 = (seed % 5);
    const v2 = (v1 + 2 + (seed % 2)) % 5;
    const a1 = -Math.PI / 2 + v1 * (Math.PI * 2 / 5) + (frame * 0.012);
    const a2 = -Math.PI / 2 + v2 * (Math.PI * 2 / 5) + (frame * 0.012);
    const x1 = Math.cos(a1) * radius * 0.75;
    const y1 = Math.sin(a1) * radius * 0.75;
    const x2 = Math.cos(a2) * radius * 0.75;
    const y2 = Math.sin(a2) * radius * 0.75;

    ctx.strokeStyle = (c % 2 === 0) ? '#FFFFCC' : hc.core;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let seg = 1; seg <= 3; seg++) {
      const t = seg / 4;
      const targetX = x1 + (x2 - x1) * t + (-(y2 - y1) * 0.22 * Math.sin(seed + seg * 2.3));
      const targetY = y1 + (y2 - y1) * t + ((x2 - x1) * 0.22 * Math.sin(seed + seg * 2.3));
      ctx.lineTo(targetX, targetY);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Renders Phase 6 Energy Surge: Colossal piercing Volumetric God Rays in batched paths.
 */
function drawPixelGodRays(ctx, radius, frame, p6) {
  if (p6 <= 0.01) return;
  ctx.save();
  const rayCount = 12;
  ctx.lineWidth = 2.0;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2 + frame * 0.018;
    const lenMult = 1.3 + 1.0 * Math.sin(i * 2.4 + frame * 0.25);
    const rayLength = radius * lenMult * p6;
    const startDist = radius * 0.2;
    const sx = Math.cos(angle) * startDist;
    const sy = Math.sin(angle) * startDist;
    const ex = Math.cos(angle) * rayLength;
    const ey = Math.sin(angle) * rayLength;

    ctx.strokeStyle = (i % 2 === 0) ? '#FFE666' : '#FF6600';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Main Grand Magic Circle Engine for Megumin's "EXPLOSION!" spell.
 * Ultra-Optimized Pixel Art Engine (Locked 60 FPS, Rule 3.5).
 *
 * Phase 1/6 (0.00–0.18): Cold red pixel pentagram + double pixel rings + 5x5 rune band, flat bird's-eye view
 * Phase 2/6 (0.18–0.40): Warming glow, pixel sparks begin, steady size
 * Phase 3/6 (0.40–0.65): Orange-red, more sparks, inner pixel rune band
 * Phase 4/6 (0.65–0.85): Strong orange glow, heavy pixel sparks
 * Phase 5/6 (0.85–0.95): Yellow-hot, blazing pixel sparks shower, pixel mana crackles
 * Phase 6/6 (0.95–1.00): White-hot detonation, pixel god rays, maximum intensity
 */
export function drawMeguminMagicCircle(ctx, cx, cy, baseRadius, chantProgress = 0, frame = 0, options = {}) {
  const p = Math.min(1, Math.max(0, chantProgress));
  const isGround = Boolean(options.isGround);
  const isCasting = Boolean(options.isCastingCircle);
  const facingAngle = options.facingAngle || 0;
  const globalAlpha = options.alpha !== undefined ? options.alpha : 1.0;
  if (globalAlpha <= 0.01) return;

  // Phase breakpoints (6 progressive phases)
  const p1 = Math.min(1, p / 0.18);                          // Phase 1: Inception
  const p2 = Math.min(1, Math.max(0, (p - 0.18) / 0.22));    // Phase 2: Ring & star
  const p3 = Math.min(1, Math.max(0, (p - 0.40) / 0.25));    // Phase 3: Inner layers
  const p4 = Math.min(1, Math.max(0, (p - 0.65) / 0.20));    // Phase 4: Deep structure
  const p5 = Math.min(1, Math.max(0, (p - 0.85) / 0.10));    // Phase 5: Peak activation
  const p6 = Math.min(1, Math.max(0, (p - 0.95) / 0.05));    // Phase 6: Detonation surge

  // Heat ramp: 0.0 (cold red) → 1.0 (white-hot)
  const heat = Math.min(1, p * 0.55 + p5 * 0.25 + p6 * 0.20);

  const scale = 0.30 + 0.35 * p1 + 0.20 * p2 + 0.15 * p3;
  const R = baseRadius * scale;

  const hc = getHeatColors(heat);

  ctx.save();
  ctx.globalAlpha *= globalAlpha;
  ctx.translate(cx, cy);

  if (isCasting) {
    ctx.rotate(facingAngle);
  }

  // 1. Ambient stepped radial glow backdrop
  if (p1 > 0.01) {
    const bgGrad = ctx.createRadialGradient(0, 0, R * 0.05, 0, 0, R * 1.25);
    const bgAlpha1 = (0.20 * p1 + 0.25 * p5 + 0.15 * p6);
    const bgAlpha2 = (0.06 * p2 + 0.12 * p5 + 0.08 * p6);
    bgGrad.addColorStop(0, `rgba(${hc.glowRGB[0]}, ${hc.glowRGB[1]}, ${hc.glowRGB[2]}, ${bgAlpha1.toFixed(3)})`);
    bgGrad.addColorStop(0.55, `rgba(${hc.glowRGB[0]}, ${Math.floor(hc.glowRGB[1] * 0.6)}, ${Math.floor(hc.glowRGB[2] * 0.5)}, ${bgAlpha2.toFixed(3)})`);
    bgGrad.addColorStop(1, 'rgba(80, 0, 10, 0)');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Phase 6: God Rays
  if (p6 > 0.01) {
    drawPixelGodRays(ctx, R, frame, p6);
  }

  // 3. Phase 1+: Outer rings + rune band + diamond seals
  if (p1 > 0.01) {
    const rotOuter = frame * 0.008;
    ctx.save();
    ctx.globalAlpha *= p1;
    drawPixelRuneBand(ctx, R * 0.88, R * 1.00, rotOuter, p1, heat);
    drawPixelDiamondNodeSeals(ctx, R * 1.00, 8, heat, p1);
    ctx.restore();
  }

  // 4. Phase 2+: Pentagram + containment ring
  if (p2 > 0.01) {
    const rotOuter = frame * 0.008;
    ctx.save();
    ctx.globalAlpha *= p2;
    _drawPixelRing(ctx, 0, 0, R * 0.75, hc.glow + '0.40)', hc.core, 3.5, 1.6);
    ctx.restore();
    drawPixelPentagram(ctx, R * 0.75, rotOuter, p2, heat);
  }

  // 5. Phase 3+: Inner rune band
  if (p3 > 0.01) {
    const rotInner = -frame * 0.012;
    ctx.save();
    ctx.globalAlpha *= p3;
    drawPixelRuneBand(ctx, R * 0.50, R * 0.60, rotInner, p3, heat);
    ctx.restore();
  }

  // 6. Phase 4+: Upward sparks
  if (p4 > 0.01) {
    const sparkCount = Math.floor(10 + 15 * p4 + 10 * p5);
    drawPixelUpwardSparks(ctx, R, frame, sparkCount, heat);
  }

  // 7. Phase 5: Mana crackles
  if (p5 > 0.01) {
    drawPixelManaCrackles(ctx, R, frame, Math.floor(2 + 2 * p5), heat);
  }

  // 8. Core
  const coreR = R * (0.08 + 0.06 * p1 + 0.10 * p6);
  drawPixelInceptionCore(ctx, coreR, p1, p5, p6, frame, heat);

  // 9. Phase 6 shockwave halos
  if (p6 > 0.01) {
    ctx.save();
    const shockR1 = R * (1.1 + 0.45 * Math.sin(frame * 0.3));
    const shockR2 = R * (1.4 + 0.55 * Math.cos(frame * 0.25));
    _drawPixelRing(ctx, 0, 0, shockR1, null, 'rgba(255, 240, 200, 0.85)', 0, 2.0);
    _drawPixelRing(ctx, 0, 0, shockR2, null, hc.glow + '0.65)', 0, 1.4);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws Megumin's chant, singularity, detonation, and lingering crater telegraphs.
 */
export function drawMeguminGroundTelegraph(ctx, fighter) {
  const cfg = CONFIG.megumin || {};
  const targetX = fighter.explosionTargetX;
  const targetY = fighter.explosionTargetY;
  const phase = fighter.explosionPhase;
  const frame = (typeof state !== 'undefined' && state.frameCount !== undefined) ? state.frameCount : 0;
  const chantProgress = fighter.chantProgress || 0;

  ctx.save();

  // 1. CHANT & SINGULARITY PHASES: Render Staff Magic Circle & Ground Epicenter Circle
  if (phase === 'CHANT' || phase === 'SINGULARITY') {
    // A. Staff Casting Magic Circle (Floating in front of Megumin's staff along cast angle)
    const castAngle = fighter.committedCastAngle !== undefined ? fighter.committedCastAngle : (fighter.gunAngle || 0);
    const staffDist = (fighter.r || 25) + 38;
    const staffCircleX = fighter.x + Math.cos(castAngle) * staffDist;
    const staffCircleY = (fighter.y - (fighter.z || 0)) + Math.sin(castAngle) * staffDist;

    // Arcane mana connecting beam from Megumin's staff to casting circle
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 230, 100, 0.85)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(fighter.x + Math.cos(castAngle) * (fighter.r * 0.6), (fighter.y - (fighter.z || 0)) + Math.sin(castAngle) * (fighter.r * 0.6));
    ctx.lineTo(staffCircleX, staffCircleY);
    ctx.stroke();
    ctx.restore();

    // Render Staff Casting Circle (65px base radius)
    drawMeguminMagicCircle(ctx, staffCircleX, staffCircleY, 65, chantProgress, frame, {
      isCastingCircle: true,
      facingAngle: castAngle
    });

    // B. Grand Arena-Centered Magic Seal on the ground
    const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : (CONFIG.arena || { x: 0, y: 0, width: 800, height: 600 });
    const arenaCenterX = (arena.x || 0) + (arena.width || 800) / 2;
    const arenaCenterY = (arena.y || 0) + (arena.height || 600) / 2;
    const arenaRadius = Math.min(arena.width || 800, arena.height || 600) * 0.44;
    const groundCircleRadius = Math.max(arenaRadius, (cfg.explosionBlastRadius || 260) * 0.85);

    drawMeguminMagicCircle(ctx, arenaCenterX, arenaCenterY, groundCircleRadius, chantProgress, frame, {
      isGround: true
    });

    // Singularity Gravitational Vortex Center Hole in Arena Center
    if (phase === 'SINGULARITY') {
      const pullRadius = cfg.explosionSingularityRadius || 200;
      const singGrad = ctx.createRadialGradient(arenaCenterX, arenaCenterY, 4, arenaCenterX, arenaCenterY, pullRadius);
      singGrad.addColorStop(0, 'rgba(10, 0, 6, 0.95)');
      singGrad.addColorStop(0.35, 'rgba(180, 15, 30, 0.55)');
      singGrad.addColorStop(1, 'rgba(180, 15, 30, 0)');
      ctx.fillStyle = singGrad;
      ctx.beginPath();
      ctx.arc(arenaCenterX, arenaCenterY, pullRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFE600';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(arenaCenterX, arenaCenterY, 20 + (frame % 16), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 2. DETONATION PHASE: Apocalyptic Cataclysmic Blast Fireball & Shockwaves
  if (phase === 'DETONATION' && fighter.explosionBlastTimer > 0) {
    const progress = 1 - fighter.explosionBlastTimer / (fighter.explosionBlastMaxTimer || 24);
    const blastRadius = Math.max(10, (cfg.explosionBlastRadius || 260) * Math.pow(progress, 0.65));

    // Core Incandescent Fireball Gradient
    const blastGrad = ctx.createRadialGradient(targetX, targetY, 0, targetX, targetY, blastRadius);
    blastGrad.addColorStop(0, `rgba(255, 255, 245, ${0.98 * (1 - progress * 0.35)})`);
    blastGrad.addColorStop(0.20, `rgba(255, 235, 120, ${0.92 * (1 - progress * 0.5)})`);
    blastGrad.addColorStop(0.55, `rgba(235, 30, 50, ${0.75 * (1 - progress)})`);
    blastGrad.addColorStop(0.88, `rgba(140, 10, 25, ${0.45 * (1 - progress)})`);
    blastGrad.addColorStop(1, 'rgba(120, 5, 20, 0)');
    ctx.fillStyle = blastGrad;
    ctx.beginPath();
    ctx.arc(targetX, targetY, blastRadius, 0, Math.PI * 2);
    ctx.fill();

    // Piercing blast shockwave corona rings
    ctx.strokeStyle = '#FFF8E7';
    ctx.lineWidth = 6 * (1 - progress) + 1.5;
    ctx.beginPath();
    ctx.arc(targetX, targetY, blastRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#FF4D6D';
    ctx.lineWidth = 3.5 * (1 - progress) + 1.0;
    ctx.beginPath();
    ctx.arc(targetX, targetY, blastRadius * 0.75, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 3. CRATER PHASE: Lingering Molten Earth Crater with Burning Ancient Rune Fractures
  if (fighter.explosionCraterTimer > 0) {
    const life = fighter.explosionCraterTimer / (cfg.explosionLingeringFireFrames || 180);
    const craterR = cfg.explosionFireRadius || 120;

    const craterGrad = ctx.createRadialGradient(targetX, targetY, craterR * 0.1, targetX, targetY, craterR);
    craterGrad.addColorStop(0, `rgba(255, 210, 80, ${0.35 * life})`);
    craterGrad.addColorStop(0.45, `rgba(190, 20, 35, ${0.42 * life})`);
    craterGrad.addColorStop(0.85, `rgba(35, 8, 16, ${0.30 * life})`);
    craterGrad.addColorStop(1, 'rgba(18, 4, 10, 0)');
    ctx.fillStyle = craterGrad;
    ctx.beginPath();
    ctx.arc(targetX, targetY, craterR, 0, Math.PI * 2);
    ctx.fill();

    // Molten runic fracture lines
    ctx.strokeStyle = `rgba(255, 209, 102, ${0.75 * life})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(targetX, targetY, craterR * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    // 6 Radial molten magma fissures radiating outward
    for (let k = 0; k < 6; k++) {
      const a = k * (Math.PI / 3) + 0.15;
      ctx.beginPath();
      ctx.moveTo(targetX + Math.cos(a) * craterR * 0.2, targetY + Math.sin(a) * craterR * 0.2);
      ctx.lineTo(targetX + Math.cos(a) * craterR * 0.85, targetY + Math.sin(a) * craterR * 0.85);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Full-screen cinematic screen overlay, dark atmosphere vignette, and detonation flash.
 */
export function drawMeguminExplosionScreenOverlay(ctx, fighters) {
  if (state.disableDimEffects || !fighters) return;
  const fighter = fighters.find((entry) => entry && (
    entry.explosionPhase === 'CHANT' ||
    entry.explosionPhase === 'SINGULARITY' ||
    entry.explosionPhase === 'DETONATION'
  ));
  if (!fighter) return;

  let dimAlpha = 0;
  let flashAlpha = 0;
  if (fighter.explosionPhase === 'CHANT') {
    dimAlpha = 0.10 + Math.min(1, fighter.chantProgress || 0) * 0.22;
  } else if (fighter.explosionPhase === 'SINGULARITY') {
    dimAlpha = 0.45;
  } else {
    const progress = 1 - fighter.explosionBlastTimer / (fighter.explosionBlastMaxTimer || 24);
    dimAlpha = 0.35 * (1 - progress);
    flashAlpha = 0.65 * (1 - progress);
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (dimAlpha > 0.01) {
    ctx.fillStyle = `rgba(24, 3, 12, ${dimAlpha})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  if (flashAlpha > 0.01) {
    ctx.fillStyle = `rgba(255, 248, 220, ${flashAlpha})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  ctx.restore();
}

/**
 * Main Skin Renderer for Megumin (The Crimson Demon Archmage).
 * Hand scale & layout matches Makima & Reze standard (getHandSize: 7.8 - 8.2).
 */
export function drawMeguminSkin(ctx, fighter) {
  const r = fighter.r || 25;
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

  // 3. Layer A: Back Hand (Chuunibyou Dramatic Stance - Scaled 1:1 with Makima/Reze hands)
  if (!hideHands) {
    const backHandX = r * 0.98;
    const backHandY = -r * 0.12;
    drawMeguminFist(ctx, backHandX, backHandY, getHandSize(7.8), '#FFE0BD');
  }

  // 4. Layer B: Pixel Art Body Circle (with Eyepatch, Voluminous Brunette Locks, Oversized Hat & Flared Robes)
  drawMeguminPixelBody(ctx, r, facingLeft);

  // 5. Layer C: Draw Hair Asset if loaded (Assets/model/Megumin-hair.png)
  _drawMeguminHair(ctx, r, facingLeft);

  // 6. Layer D: Front Hand & Archmage Staff (on top of body circle - Scaled 1:1 with Makima/Reze hands)
  if (!hideHands) {
    const frontHandX = r * 0.20;
    const frontHandY = r * 0.24;
    drawMeguminStaff(ctx, frontHandX + 16, frontHandY - 4, r, isChanting);
    drawMeguminFist(ctx, frontHandX, frontHandY, getHandSize(8.0), '#FFE0BD');
  }

  ctx.restore();
}
