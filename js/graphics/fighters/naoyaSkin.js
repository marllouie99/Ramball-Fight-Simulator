// ─────────────────────────────────────────────
// Naoya Zenin — Fighter Skin & Body Model
// Adheres strictly to Repository Standards:
// - Rule 19: Upright Front POV Orientation
// - Rule 20: Canonical Default Model Hand Positioning
// - Rule 3.2: Faceless Minimalist Aesthetic
// - Rule 3.4: Discrete Lock Arrays for Hair (No Sine Waves)
// - Rule 3.5: Offscreen Canvas Caching Pattern
// - Rule 11: Zero shadowBlur / shadowColor
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawNaoyaTanto, drawCursedWombCocoonVFX, drawCurseNaoyaMachRamjetVFX } from '../weapons/naoyaWeaponGraphics.js';

let _cachedFighterCanvas = null;
let _cachedFighterR = 0;
let _cachedCurseFighterCanvas = null;
let _cachedCurseFighterR = 0;
let _cachedProjectionGhostCanvas = null;
let _cachedProjectionGhostR = 0;
let _cachedProjectionHairCanvas = null;
let _cachedProjectionHairR = 0;

let _naoyaHairImage = null;
let _naoyaHairImageLoading = false;

export function _getNaoyaHairImage() {
  if (_naoyaHairImage && _naoyaHairImage.complete && _naoyaHairImage.naturalWidth > 0) {
    return _naoyaHairImage;
  }
  if (!_naoyaHairImageLoading && typeof Image !== 'undefined') {
    _naoyaHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _naoyaHairImage = img;
      _naoyaHairImageLoading = false;
      _cachedFighterCanvas = null;
      _cachedFighterR = 0;
      _cachedProjectionGhostCanvas = null;
      _cachedProjectionGhostR = 0;
      _cachedProjectionHairCanvas = null;
      _cachedProjectionHairR = 0;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Naoya hair image at Assets/model/naoya/Naoya_hair.png', e);
      _naoyaHairImageLoading = false;
    };
    img.src = 'Assets/model/naoya/Naoya_hair.png?v=1';
    _naoyaHairImage = img;
  }
  return _naoyaHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getNaoyaHairImage();
}

/**
 * Procedural discrete locks fallback when image is unavailable.
 */
function _drawProceduralNaoyaHair(ctx, r, offX = 0, offY = 0, wMult = 1, hMult = 1, rot = 0, flipX = 1, flipY = 1) {
  ctx.save();
  if (rot !== 0 || flipX !== 1 || flipY !== 1 || offX !== 0 || offY !== 0 || wMult !== 1 || hMult !== 1) {
    ctx.translate(offX, offY);
    if (rot !== 0) ctx.rotate(rot);
    if (flipX !== 1 || flipY !== 1) ctx.scale(flipX * wMult, flipY * hMult);
  }

  // Tier 1: Dark Undercut / Roots (-r * 0.50 to -r * 0.10)
  ctx.fillStyle = '#1A1C23';
  ctx.beginPath();
  ctx.moveTo(-r * 0.80, -r * 0.10);
  ctx.lineTo(-r * 0.75, -r * 0.45);
  ctx.lineTo(r * 0.75, -r * 0.45);
  ctx.lineTo(r * 0.80, -r * 0.10);
  ctx.lineTo(r * 0.65, -r * 0.05);
  ctx.lineTo(0, -r * 0.20);
  ctx.lineTo(-r * 0.65, -r * 0.05);
  ctx.closePath();
  ctx.fill();

  // Tier 2: Base Dyed Blonde Hair Volume
  ctx.fillStyle = '#F1DF88'; // Pale golden blonde
  ctx.beginPath();
  ctx.arc(0, -r * 0.32, r * 0.84, Math.PI * 0.88, Math.PI * 2.12);
  ctx.fill();

  // Tier 3: Discrete Spiky Locks & Crown Tufts (-r * 1.15)
  ctx.beginPath();
  ctx.moveTo(-r * 0.80, -r * 0.25);
  ctx.lineTo(-r * 0.92, -r * 0.55);
  ctx.lineTo(-r * 0.65, -r * 0.65);
  ctx.lineTo(-r * 0.60, -r * 1.05); // Left crown spike
  ctx.lineTo(-r * 0.35, -r * 0.82);
  ctx.lineTo(-r * 0.20, -r * 1.15); // Left-center main spike
  ctx.lineTo(0, -r * 0.88);
  ctx.lineTo(r * 0.25, -r * 1.12);  // Right-center main spike
  ctx.lineTo(r * 0.45, -r * 0.85);
  ctx.lineTo(r * 0.70, -r * 1.02);  // Right crown spike
  ctx.lineTo(r * 0.75, -r * 0.58);
  ctx.lineTo(r * 0.90, -r * 0.48);
  ctx.lineTo(r * 0.80, -r * 0.22);
  ctx.closePath();
  ctx.fill();

  // Tier 4: Sharp Bang Lock Strands framing face (-r * 0.35 to -r * 0.12)
  ctx.beginPath();
  ctx.moveTo(-r * 0.65, -r * 0.30);
  ctx.lineTo(-r * 0.55, -r * 0.05);
  ctx.lineTo(-r * 0.42, -r * 0.25);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.35);
  ctx.lineTo(-r * 0.10, -r * 0.12); // Swept bang tip
  ctx.lineTo(r * 0.15, -r * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(r * 0.40, -r * 0.30);
  ctx.lineTo(r * 0.58, -r * 0.08);
  ctx.lineTo(r * 0.68, -r * 0.28);
  ctx.closePath();
  ctx.fill();

  // Specular Golden Hair Highlights (Crown Glint)
  ctx.fillStyle = '#FFF6B8';
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.70);
  ctx.lineTo(-r * 0.20, -r * 0.95);
  ctx.lineTo(0, -r * 0.75);
  ctx.lineTo(r * 0.22, -r * 0.92);
  ctx.lineTo(r * 0.45, -r * 0.70);
  ctx.lineTo(0, -r * 0.65);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws Naoya's authentic anime spiky dyed-blonde hair from Assets/model/naoya/Naoya_hair.png.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawNaoyaHair(ctx, r, facingLeft = false) {
  const hairImg = _getNaoyaHairImage();
  const custom = (typeof state !== 'undefined' && state.skinCustomizations?.naoya) || {};
  const wMult = custom.widthScale ?? 1.0;
  const hMult = custom.heightScale ?? 1.0;
  const offX = custom.offsetX ?? 0;
  const offY = custom.offsetY ?? 0;
  const rot = custom.angleOffset ?? 0;
  const flipX = custom.flipX ? -1 : 1;
  const flipY = custom.flipY ? -1 : 1;

  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp pixel art fidelity (Rule #19)

    // Naoya_hair.png (1506x1045). True visible hair bounding box:
    // X: [96, 1384] (width 1288, horizontal center at 740)
    // Y: [30, 977] (height 947, top crown at 30)
    // Calibrated to 1:1 match Gojo/Yuji anime hair volume (3.10r, crown apex: -1.42r)
    const targetHairWidth = r * 3.10 * wMult;
    const targetHairHeight = r * 2.10 * hMult;
    const scaleX = targetHairWidth / 1288;
    const scaleY = targetHairHeight / 947;
    const drawW = 1506 * scaleX;
    const drawH = 1045 * scaleY;
    const drawX = -740 * scaleX + offX;
    const drawY = -r * 1.42 - 30 * scaleY + offY;

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
    // Procedural fallback
    _drawProceduralNaoyaHair(ctx, r, offX, offY, wMult, hMult, rot, flipX, flipY);
  }
}

/**
 * Rasterizes Naoya's authentic body model (clean anime head + Zenin clan clothes)
 * to an offscreen canvas for optimal 60 FPS performance (Rule 3.5).
 * Built 1:1 on the Universal Character Body Model Standard (Gojo/Yuji/Todo Architecture):
 * - 4-neighbor boundary test for clean 1-pixel outer manga ink outline (#0E0F14)
 * - ZONE 1: Pale Blonde Hair Roots & Crown (ny < -0.28)
 * - ZONE 2: Warm Fair Anime Skin Face & 3 Gold Stud Ear Piercings (-0.28 <= ny < 0.30)
 * - ZONE 3: Traditional Kimono & Dark Slate Haori Shoulders (0.30 <= ny < 0.66)
 * - ZONE 4: Dark Obi Sash & Electric Lime Obijime Cord (0.66 <= ny < 0.78)
 * - ZONE 5: Lower Hakama Trousers (ny >= 0.78)
 * @param {HTMLCanvasElement|CanvasRenderingContext2D} canvasOrCtx
 * @param {number} r
 */
function _renderNaoyaPixelBodyToCanvas(canvasOrCtx, r) {
  let destCtx;
  if (canvasOrCtx && canvasOrCtx.getContext) {
    const P = 2.0;
    const steps = Math.ceil((r + P) / P);
    const size = (steps * 2 + 1) * P;
    canvasOrCtx.width = size;
    canvasOrCtx.height = size;
    destCtx = canvasOrCtx.getContext('2d');
  } else {
    destCtx = canvasOrCtx;
  }
  if (!destCtx) return;

  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  if (canvasOrCtx && canvasOrCtx.width) {
    destCtx.translate(canvasOrCtx.width / 2, canvasOrCtx.height / 2);
  }

  const P = 2.0;
  const steps = Math.ceil((r + P) / P);

  // 100% 4-Way Symmetrical Circular Pixel Body Fill & Outer Border (1:1 Standard)
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

      const nx = rx / r;
      const ny = ry / r;
      const absX = Math.abs(nx);

      // ──────────────────────────────────────────
      // ZONE 1: PALE BLONDE HAIR ROOTS & CROWN (ny < -0.28)
      // ──────────────────────────────────────────
      if (ny < -0.28) {
        let col = '#F1DF88'; // Pale golden blonde base
        if (absX >= 0.55) {
          const dLevel = (absX - 0.55) / 0.45;
          if (dLevel > 0.5) {
            col = ((gx + gy) % 2 === 0) ? '#E0CD72' : '#C9B752';
          } else if ((gx + gy) % 3 === 0) {
            col = '#E0CD72';
          }
        } else if (Math.abs(absX - (0.20 + (ny + 1.0) * 0.12)) <= P / r * 1.2) {
          col = '#FFF6B8'; // Crown shine
        }
        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: WARM FAIR SKIN FACE & GOLD EAR PIERCINGS (-0.28 <= ny < 0.30)
      // ──────────────────────────────────────────
      else if (ny < 0.30) {
        // Zenin Clan Left Ear Piercings (3 Gold Studs along left ear flank)
        const isPiercing1 = Math.hypot(rx - (-r * 0.78), ry - (-r * 0.06)) <= P * 1.0;
        const isPiercing2 = Math.hypot(rx - (-r * 0.82), ry - (0.0)) <= P * 1.0;
        const isPiercing3 = Math.hypot(rx - (-r * 0.78), ry - (r * 0.06)) <= P * 1.0;

        if (isPiercing1 || isPiercing2 || isPiercing3) {
          destCtx.fillStyle = '#FACC15'; // Gold Stud Piercings
        } else {
          let col = '#FEDBC0'; // Fair ivory-peach skin base (1:1 with Gojo)
          if (absX >= 0.55) {
            const dLevel = (absX - 0.55) / 0.45;
            if (dLevel > 0.6) {
              col = ((gx + gy) % 2 === 0) ? '#D89F7C' : '#E9B796';
            } else if ((gx + gy) % 2 === 0) {
              col = '#E9B796';
            }
          } else if (absX < 0.35 && ny > -0.15 && ny < 0.10) {
            if ((gx + gy) % 4 === 0) {
              col = '#FFF0E2'; // Center face highlight
            }
          } else if (ny > 0.16) {
            col = '#E9B796'; // Lower jaw shadow
          }
          destCtx.fillStyle = col;
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: ZENIN CLAN KIMONO & HAORI SHOULDERS (0.30 <= ny < 0.66)
      // ──────────────────────────────────────────
      else if (ny < 0.66) {
        // Pale Sage-Green Under-Kimono V-Neckline in center:
        const vProgress = (ny - 0.30) / 0.36; // 0 to 1
        const kimonoHalfW = 0.16 + vProgress * 0.22; // ~0.16 to 0.38

        if (absX <= kimonoHalfW) {
          // Center V opening neckline
          const isWhiteCollarLeft = Math.abs(nx - (-kimonoHalfW + 0.06)) <= P / r * 0.8;
          const isWhiteCollarRight = Math.abs(nx - (kimonoHalfW - 0.06)) <= P / r * 0.8;
          const isNeckSkin = (ny < 0.38 && absX <= (1 - (ny - 0.30) / 0.08) * 0.14);

          if (isNeckSkin) {
            destCtx.fillStyle = '#E9B796'; // Throat skin in collar V
          } else if (isWhiteCollarLeft || isWhiteCollarRight) {
            destCtx.fillStyle = '#FFFFFF'; // Crisp white under-kimono collar lining
          } else if (absX <= P / r * 0.6) {
            destCtx.fillStyle = '#8FA885'; // Inner green fold seam
          } else {
            destCtx.fillStyle = '#D9E8D2'; // Pale sage kimono fabric
          }
        } else {
          // Flanking Dark Slate Charcoal Haori Shoulders (High luminance Y >= 24)
          if (absX > 0.72) {
            destCtx.fillStyle = '#1E222D'; // Slate flank shadow
          } else if (ny > 0.54) {
            destCtx.fillStyle = '#242834'; // Lower haori fold shadow
          } else {
            destCtx.fillStyle = '#2C303E'; // Slate dark charcoal haori base
          }
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 4: DARK OBI SASH & ELECTRIC LIME CORD (0.66 <= ny < 0.78)
      // ──────────────────────────────────────────
      else if (ny < 0.78) {
        // Electric Lime Obijime Accent Cord in center of obi
        if (ny >= 0.70 && ny <= 0.74) {
          destCtx.fillStyle = '#76E042'; // Neon lime obijime cord
        } else if (ny < 0.69) {
          destCtx.fillStyle = '#2C3240'; // Upper obi edge highlight
        } else {
          destCtx.fillStyle = '#181A22'; // Dark ink obi sash
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 5: LOWER HAKAMA PANTS (ny >= 0.78)
      // ──────────────────────────────────────────
      else {
        if (absX <= P / r * 0.6 && ny >= 0.80 && ny <= 0.96) {
          destCtx.fillStyle = '#161924'; // Center hakama inseam crease
        } else if (absX > 0.65) {
          destCtx.fillStyle = '#1A1D28'; // Outer pleat shadow
        } else {
          destCtx.fillStyle = '#262A38'; // Dark charcoal hakama skirt
        }
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  destCtx.restore();
}

export function getNaoyaCachedCanvas(r) {
  const intR = Math.round(r);
  if (!_cachedFighterCanvas || _cachedFighterR !== intR) {
    if (typeof document !== 'undefined') {
      const P = 2.0;
      const steps = Math.ceil((intR + P) / P);
      const size = (steps * 2 + 1) * P;
      _cachedFighterCanvas = document.createElement('canvas');
      _cachedFighterCanvas.width = size;
      _cachedFighterCanvas.height = size;
      _renderNaoyaPixelBodyToCanvas(_cachedFighterCanvas, intR);
      _cachedFighterR = intR;
    }
  }
  return _cachedFighterCanvas;
}

/**
 * Rasterizes Naoya's authentic 24-FPS Blue Projection Sorcery Hologram Model
 * to an offscreen canvas for optimal 60 FPS performance (Rule 3.5 & Rule 11).
 * Features luminous cyan-blue palette, stepped shading, discrete spiky hair,
 * front hands, horizontal 24-FPS film scanlines, and corner shutter brackets.
 * @param {HTMLCanvasElement|CanvasRenderingContext2D} canvasOrCtx
 * @param {number} r
 */
function _renderNaoyaProjectionGhostToCanvas(canvasOrCtx, r) {
  let destCtx;
  if (canvasOrCtx && canvasOrCtx.getContext) {
    const P = 2.0;
    const steps = Math.ceil((r * 1.6 + P) / P);
    const size = (steps * 2 + 1) * P;
    canvasOrCtx.width = size;
    canvasOrCtx.height = size;
    destCtx = canvasOrCtx.getContext('2d');
  } else {
    destCtx = canvasOrCtx;
  }
  if (!destCtx) return;

  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  if (canvasOrCtx && canvasOrCtx.width) {
    destCtx.translate(canvasOrCtx.width / 2, canvasOrCtx.height / 2);
  }

  const P = 2.0;
  const steps = Math.ceil((r + P) / P);

  // 1. Render Cyan-Blue Projection Body Model (Discrete 2.0px Rasterization)
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;

      // 4-neighbor boundary test for glowing cyan outer projection border
      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );

      if (isBorder) {
        destCtx.fillStyle = '#00F2FE'; // Neon cyan outer projection boundary
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      const nx = rx / r;
      const ny = ry / r;
      const absX = Math.abs(nx);

      // ──────────────────────────────────────────
      // ZONE 1: Projection Hair Crown (ny < -0.28)
      // ──────────────────────────────────────────
      if (ny < -0.28) {
        let col = '#38BDF8';
        if (absX >= 0.55) {
          col = ((gx + gy) % 2 === 0) ? '#0284C7' : '#0369A1';
        } else if (Math.abs(absX - (0.20 + (ny + 1.0) * 0.12)) <= P / r * 1.2) {
          col = '#E0F2FE';
        }
        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: Projection Face Skin & Piercings (-0.28 <= ny < 0.30)
      // ──────────────────────────────────────────
      else if (ny < 0.30) {
        const isPiercing1 = Math.hypot(rx - (-r * 0.78), ry - (-r * 0.06)) <= P * 1.0;
        const isPiercing2 = Math.hypot(rx - (-r * 0.82), ry - (0.0)) <= P * 1.0;
        const isPiercing3 = Math.hypot(rx - (-r * 0.78), ry - (r * 0.06)) <= P * 1.0;

        if (isPiercing1 || isPiercing2 || isPiercing3) {
          destCtx.fillStyle = '#FFFFFF'; // White-cyan stud glints
        } else {
          let col = '#38BDF8'; // Vivid sky cyan
          if (absX >= 0.55) {
            col = ((gx + gy) % 2 === 0) ? '#0369A1' : '#0284C7';
          } else if (absX < 0.35 && ny > -0.15 && ny < 0.10) {
            if ((gx + gy) % 4 === 0) col = '#BAE6FD';
          } else if (ny > 0.16) {
            col = '#0369A1';
          }
          destCtx.fillStyle = col;
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: Projection Kimono & Haori Shoulders (0.30 <= ny < 0.66)
      // ──────────────────────────────────────────
      else if (ny < 0.66) {
        const vProgress = (ny - 0.30) / 0.36;
        const kimonoHalfW = 0.16 + vProgress * 0.22;

        if (absX <= kimonoHalfW) {
          const isWhiteCollarLeft = Math.abs(nx - (-kimonoHalfW + 0.06)) <= P / r * 0.8;
          const isWhiteCollarRight = Math.abs(nx - (kimonoHalfW - 0.06)) <= P / r * 0.8;
          const isNeckSkin = (ny < 0.38 && absX <= (1 - (ny - 0.30) / 0.08) * 0.14);

          if (isNeckSkin) {
            destCtx.fillStyle = '#38BDF8';
          } else if (isWhiteCollarLeft || isWhiteCollarRight) {
            destCtx.fillStyle = '#F0F9FF';
          } else if (absX <= P / r * 0.6) {
            destCtx.fillStyle = '#0284C7';
          } else {
            destCtx.fillStyle = '#0284C7';
          }
        } else {
          if (absX > 0.72) {
            destCtx.fillStyle = '#082F49';
          } else if (ny > 0.54) {
            destCtx.fillStyle = '#075985';
          } else {
            destCtx.fillStyle = '#0C4A6E';
          }
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 4: Projection Obi Sash (0.66 <= ny < 0.78)
      // ──────────────────────────────────────────
      else if (ny < 0.78) {
        if (ny >= 0.70 && ny <= 0.74) {
          destCtx.fillStyle = '#00F2FE'; // Bright neon cyan obijime cord
        } else if (ny < 0.69) {
          destCtx.fillStyle = '#032B56';
        } else {
          destCtx.fillStyle = '#021F3F';
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 5: Lower Hakama Pants (ny >= 0.78)
      // ──────────────────────────────────────────
      else {
        if (absX <= P / r * 0.6 && ny >= 0.80 && ny <= 0.96) {
          destCtx.fillStyle = '#021F3F';
        } else if (absX > 0.65) {
          destCtx.fillStyle = '#082F49';
        } else {
          destCtx.fillStyle = '#075985';
        }
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  // 2. Render Authentic Blue Projection Hair Layer (from Assets/model/naoya/Naoya_hair.png)
  const projHairCanvas = _getNaoyaProjectionHairCanvas(r);
  const custom = (typeof state !== 'undefined' && state.skinCustomizations?.naoya) || {};
  const wMult = custom.widthScale ?? 1.0;
  const hMult = custom.heightScale ?? 1.0;
  const offX = custom.offsetX ?? 0;
  const offY = custom.offsetY ?? 0;
  const rot = custom.angleOffset ?? 0;
  const flipX = custom.flipX ? -1 : 1;
  const flipY = custom.flipY ? -1 : 1;

  if (projHairCanvas) {
    destCtx.save();
    destCtx.imageSmoothingEnabled = false;

    const targetHairWidth = r * 3.10 * wMult;
    const targetHairHeight = r * 2.10 * hMult;
    const scaleX = targetHairWidth / 1288;
    const scaleY = targetHairHeight / 947;
    const drawW = 1506 * scaleX;
    const drawH = 1045 * scaleY;
    const drawX = -740 * scaleX + offX;
    const drawY = -r * 1.42 - 30 * scaleY + offY;

    if (rot !== 0 || flipX !== 1 || flipY !== 1) {
      destCtx.translate(drawX + drawW / 2, drawY + drawH / 2);
      if (rot !== 0) destCtx.rotate(rot);
      if (flipX !== 1 || flipY !== 1) destCtx.scale(flipX, flipY);
      destCtx.drawImage(projHairCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      destCtx.drawImage(projHairCanvas, drawX, drawY, drawW, drawH);
    }
    destCtx.restore();
  } else {
    // Procedural discrete locks fallback when PNG is loading / unavailable
    _drawProceduralProjectionHair(destCtx, r, offX, offY, wMult, hMult, rot, flipX, flipY);
  }

  // 3. Render Symmetrical Projection Front Hands (Rule 20)
  const handR = getHandSize(r * 0.30);
  const handX = r * 0.82;
  const handY = r * 0.38;
  drawPixelHand(destCtx, -handX, handY, handR, '#38BDF8', '#00F2FE');
  drawPixelHand(destCtx, handX, handY, handR, '#38BDF8', '#00F2FE');

  // 4. Render Horizontal Holographic 24-FPS Scanlines (Clipped strictly to skin, hair & body)
  destCtx.save();
  destCtx.globalCompositeOperation = 'source-atop';
  const scanMinX = -r * 2.0;
  const scanMaxX = r * 2.0;
  const scanMinY = -r * 2.0;
  const scanMaxY = r * 2.0;
  const scanStep = 4.0;

  for (let sy = scanMinY, idx = 0; sy <= scanMaxY; sy += scanStep, idx++) {
    const scanAlpha = (idx % 2 === 0) ? 0.45 : 0.22;
    destCtx.strokeStyle = `rgba(0, 242, 254, ${scanAlpha})`;
    destCtx.lineWidth = 1.2;
    destCtx.beginPath();
    destCtx.moveTo(scanMinX, sy);
    destCtx.lineTo(scanMaxX, sy);
    destCtx.stroke();
  }
  destCtx.restore();

  destCtx.restore();
}

/**
 * Generates or retrieves an offscreen canvas containing Naoya's authentic PNG hair
 * tinted into the 24-FPS Blue Projection Sorcery Hologram color palette.
 * @param {number} r
 * @returns {HTMLCanvasElement|null}
 */
export function _getNaoyaProjectionHairCanvas(r) {
  const hairImg = _getNaoyaHairImage();
  if (!hairImg || !hairImg.complete || hairImg.naturalWidth <= 0) return null;

  const intR = Math.round(r);
  if (_cachedProjectionHairCanvas && _cachedProjectionHairR === intR) {
    return _cachedProjectionHairCanvas;
  }

  if (typeof document === 'undefined') return null;

  const w = hairImg.naturalWidth;
  const h = hairImg.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const tCtx = c.getContext('2d');
  if (!tCtx) return null;

  // 1. Draw base hair image
  tCtx.drawImage(hairImg, 0, 0);

  // 2. Tint with Projection Sorcery Electric Blue / Cyan gradient
  tCtx.save();
  tCtx.globalCompositeOperation = 'source-atop';
  const grad = tCtx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#E0F2FE'); // Specular light cyan crown
  grad.addColorStop(0.22, '#38BDF8'); // Electric sky cyan mid-locks
  grad.addColorStop(0.60, '#0284C7'); // Deep projection blue
  grad.addColorStop(1.0, '#072B54'); // Dark sapphire roots / undercut
  tCtx.fillStyle = grad;
  tCtx.globalAlpha = 0.85;
  tCtx.fillRect(0, 0, w, h);
  tCtx.restore();

  _cachedProjectionHairCanvas = c;
  _cachedProjectionHairR = intR;
  return _cachedProjectionHairCanvas;
}

/**
 * Procedural fallback for projection hair when PNG image is loading / unavailable.
 */
function _drawProceduralProjectionHair(ctx, r, offX = 0, offY = 0, wMult = 1, hMult = 1, rot = 0, flipX = 1, flipY = 1) {
  ctx.save();
  if (rot !== 0 || flipX !== 1 || flipY !== 1 || offX !== 0 || offY !== 0 || wMult !== 1 || hMult !== 1) {
    ctx.translate(offX, offY);
    if (rot !== 0) ctx.rotate(rot);
    if (flipX !== 1 || flipY !== 1) ctx.scale(flipX * wMult, flipY * hMult);
  }

  // Tier 1: Roots / Undercut
  ctx.fillStyle = '#072B54';
  ctx.beginPath();
  ctx.moveTo(-r * 0.80, -r * 0.10);
  ctx.lineTo(-r * 0.75, -r * 0.45);
  ctx.lineTo(r * 0.75, -r * 0.45);
  ctx.lineTo(r * 0.80, -r * 0.10);
  ctx.lineTo(r * 0.65, -r * 0.05);
  ctx.lineTo(0, -r * 0.20);
  ctx.lineTo(-r * 0.65, -r * 0.05);
  ctx.closePath();
  ctx.fill();

  // Tier 2: Base Projection Blue Hair Volume
  ctx.fillStyle = '#0284C7';
  ctx.beginPath();
  ctx.arc(0, -r * 0.32, r * 0.84, Math.PI * 0.88, Math.PI * 2.12);
  ctx.fill();

  // Tier 3: Discrete Spiky Locks & Crown Tufts (-r * 1.15)
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath();
  ctx.moveTo(-r * 0.80, -r * 0.25);
  ctx.lineTo(-r * 0.92, -r * 0.55);
  ctx.lineTo(-r * 0.65, -r * 0.65);
  ctx.lineTo(-r * 0.60, -r * 1.05);
  ctx.lineTo(-r * 0.35, -r * 0.82);
  ctx.lineTo(-r * 0.20, -r * 1.15);
  ctx.lineTo(0, -r * 0.88);
  ctx.lineTo(r * 0.25, -r * 1.12);
  ctx.lineTo(r * 0.45, -r * 0.85);
  ctx.lineTo(r * 0.70, -r * 1.02);
  ctx.lineTo(r * 0.75, -r * 0.58);
  ctx.lineTo(r * 0.90, -r * 0.48);
  ctx.lineTo(r * 0.80, -r * 0.22);
  ctx.closePath();
  ctx.fill();

  // Tier 4: Sharp Bang Locks
  ctx.fillStyle = '#7DD3FC';
  ctx.beginPath();
  ctx.moveTo(-r * 0.65, -r * 0.30);
  ctx.lineTo(-r * 0.55, -r * 0.05);
  ctx.lineTo(-r * 0.42, -r * 0.25);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.35);
  ctx.lineTo(-r * 0.10, -r * 0.12);
  ctx.lineTo(r * 0.15, -r * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(r * 0.40, -r * 0.30);
  ctx.lineTo(r * 0.58, -r * 0.08);
  ctx.lineTo(r * 0.68, -r * 0.28);
  ctx.closePath();
  ctx.fill();

  // Specular Crown Glint
  ctx.fillStyle = '#E0F2FE';
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.70);
  ctx.lineTo(-r * 0.20, -r * 0.95);
  ctx.lineTo(0, -r * 0.75);
  ctx.lineTo(r * 0.22, -r * 0.92);
  ctx.lineTo(r * 0.45, -r * 0.70);
  ctx.lineTo(0, -r * 0.65);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function getNaoyaProjectionCachedCanvas(r) {
  const intR = Math.round(r);
  if (!_cachedProjectionGhostCanvas || _cachedProjectionGhostR !== intR) {
    if (typeof document !== 'undefined') {
      const P = 2.0;
      const steps = Math.ceil((intR * 1.8 + P) / P);
      const size = (steps * 2 + 1) * P;
      _cachedProjectionGhostCanvas = document.createElement('canvas');
      _cachedProjectionGhostCanvas.width = size;
      _cachedProjectionGhostCanvas.height = size;
      _renderNaoyaProjectionGhostToCanvas(_cachedProjectionGhostCanvas, intR);
      _cachedProjectionGhostR = intR;
    }
  }
  return _cachedProjectionGhostCanvas;
}

/**
 * Renders Naoya's authentic 24-FPS Blue Projection Sorcery Hologram Model for afterimages and projected frames.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} angle
 * @param {number} r
 * @param {number} [alpha=0.5]
 */
export function drawNaoyaGhostModel(ctx, x, y, angle, r, alpha = 0.5) {
  if (alpha <= 0.01) return;
  const canvas = getNaoyaProjectionCachedCanvas(r);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle || 0);

  // Rule 19: Vertical mirroring when aiming left
  const facingLeft = Math.abs(angle || 0) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.imageSmoothingEnabled = false;

  if (canvas) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.drawImage(canvas, -w / 2, -h / 2, w, h);
  } else {
    _renderNaoyaProjectionGhostToCanvas(ctx, r);
  }

  ctx.restore();
}

/**
 * Discrete Grid Rasterization Engine for Curse Naoya (Jet Turbine Exoskeleton Form).
 * Fixed discrete grid unit (P = 2.0px) rasterized onto an offscreen canvas buffer.
 */
function _renderCurseNaoyaPixelBodyToCanvas(destCanvas, r) {
  const destCtx = destCanvas.getContext('2d');
  destCtx.imageSmoothingEnabled = false;

  const P = 2.0;
  const steps = Math.ceil((r * 1.6 + P) / P);
  const cx = destCanvas.width / 2;
  const cy = destCanvas.height / 2;

  destCtx.save();
  destCtx.translate(cx, cy);

  const isInsideCurseBody = (gx, gy) => {
    const rx = gx * P;
    const ry = gy * P;
    // Aerodynamic elongated body: radius r with side turbine nacelles
    const mainBody = (rx * rx) / ((r * 1.15) * (r * 1.15)) + (ry * ry) / (r * r) <= 1.0;
    const leftTurbine = Math.hypot(rx - (-r * 0.3), ry - (-r * 0.65)) <= r * 0.42;
    const rightTurbine = Math.hypot(rx - (-r * 0.3), ry - (r * 0.65)) <= r * 0.42;
    return mainBody || leftTurbine || rightTurbine;
  };

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      if (!isInsideCurseBody(gx, gy)) continue;

      const rx = gx * P;
      const ry = gy * P;
      const px = rx - P / 2;
      const py = ry - P / 2;

      // 4-neighbor attached boundary test for solid manga ink outline
      const isBorder = (
        !isInsideCurseBody(gx + 1, gy) ||
        !isInsideCurseBody(gx - 1, gy) ||
        !isInsideCurseBody(gx, gy + 1) ||
        !isInsideCurseBody(gx, gy - 1)
      );

      if (isBorder) {
        destCtx.fillStyle = '#020617';
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // Zone 1: Bone-White Visor / Facial Skull Plate (-r * 0.35 to +r * 0.35 in Y, rx > 0)
      if (rx >= -r * 0.15 && Math.abs(ry) <= r * 0.42) {
        if (rx > r * 0.65) {
          destCtx.fillStyle = '#FFFFFF'; // Front aerodynamic nose glint
        } else if (rx > r * 0.25) {
          destCtx.fillStyle = '#E2E8F0'; // Pale bone visor
        } else {
          destCtx.fillStyle = '#94A3B8'; // Visor seam shadow
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // Zone 2: Jet Ramjet Turbines (Upper & Lower Side Nacelles)
      const distLeftTurbine = Math.hypot(rx - (-r * 0.3), ry - (-r * 0.65));
      const distRightTurbine = Math.hypot(rx - (-r * 0.3), ry - (r * 0.65));
      if (distLeftTurbine <= r * 0.38 || distRightTurbine <= r * 0.38) {
        const d = Math.min(distLeftTurbine, distRightTurbine);
        if (d <= r * 0.16) {
          destCtx.fillStyle = '#00F2FE'; // Cyan intake core
        } else if (d <= r * 0.28) {
          destCtx.fillStyle = '#76E042'; // Lime intake ring
        } else {
          destCtx.fillStyle = '#0F172A'; // Obsidian turbine housing
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // Zone 3: Aerodynamic Exoskeleton Carapace Plates
      if (rx < -r * 0.45) {
        destCtx.fillStyle = '#0B0F19'; // Rear thruster exhaust housing
      } else if (Math.abs(ry) > r * 0.50) {
        destCtx.fillStyle = '#1E293B'; // Lateral carapace armor
      } else if (rx > r * 0.10) {
        destCtx.fillStyle = '#334155'; // Dorsal ridge plate
      } else {
        destCtx.fillStyle = '#111827'; // Dark chitin underlayer
      }
      destCtx.fillRect(px, py, P, P);
    }
  }

  destCtx.restore();
}

export function getCurseNaoyaCachedCanvas(r) {
  const intR = Math.round(r);
  if (!_cachedCurseFighterCanvas || _cachedCurseFighterR !== intR) {
    if (typeof document !== 'undefined') {
      const P = 2.0;
      const steps = Math.ceil((intR * 1.6 + P) / P);
      const size = (steps * 2 + 1) * P;
      _cachedCurseFighterCanvas = document.createElement('canvas');
      _cachedCurseFighterCanvas.width = size;
      _cachedCurseFighterCanvas.height = size;
      _renderCurseNaoyaPixelBodyToCanvas(_cachedCurseFighterCanvas, intR);
      _cachedCurseFighterR = intR;
    }
  }
  return _cachedCurseFighterCanvas;
}

/**
 * Draws Curse Naoya (Awakened Jet Turbine Cursed Spirit Form).
 * Adheres strictly to Rule 19, Rule 20, and Rule 3.5.
 */
export function drawCurseNaoyaSkin(ctx, fighter) {
  if (!fighter) return;

  const r = fighter.r || 25;
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);

  // 1. Offscreen Canvas Caching check
  getCurseNaoyaCachedCanvas(r);

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
  ctx.rotate(angle);

  // Rule 19: Vertical mirroring when aiming left
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 2. Draw Rear Ramjet Jet Exhaust Flames / Heat Distortion
  drawCurseNaoyaMachRamjetVFX(ctx, fighter);

  // 3. Render Cached Pixel Art Jet Body
  if (_cachedCurseFighterCanvas) {
    const w = _cachedCurseFighterCanvas.width;
    const h = _cachedCurseFighterCanvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(_cachedCurseFighterCanvas, -w / 2, -h / 2, w, h);
  } else {
    _renderCurseNaoyaPixelBodyToCanvas(ctx, r);
  }

  // 4. Render Symmetrical Cursed Talon Claws (Rule 20 Canonical Lower Flanks)
  const shouldHideHands = Boolean(
    (typeof state !== 'undefined' && state.showSkinOnly) ||
    fighter.hideHands
  );

  if (!shouldHideHands) {
    const handR = getHandSize(r * 0.32);
    const clawTone = '#1E293B';
    const clawOutline = '#020617';

    const isPunching = Boolean(fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
    const isLunging = Boolean(fighter.isRamjetLunging);

    let leftX = -r * 0.82;
    let leftY = -r * 0.38;
    let rightX = r * 0.82;
    let rightY = r * 0.38;

    if (isLunging) {
      // Both talons thrust forward during Mach 3 ramjet lunge
      leftX = r * 0.85;
      leftY = -r * 0.45;
      rightX = r * 0.85;
      rightY = r * 0.45;
    } else if (isPunching) {
      const maxT = fighter.punchAnimMaxTimer || 8;
      const rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
      const lunge = Math.sin(rawProgress * Math.PI) * (r * 1.25);
      if (fighter.punchAnimHand === 1) {
        leftX += lunge;
      } else {
        rightX += lunge;
      }
    }

    // Draw Cursed Fists & Cyan Claw Tips
    drawPixelHand(ctx, leftX, leftY, handR, clawTone, clawOutline);
    drawPixelHand(ctx, rightX, rightY, handR, clawTone, clawOutline);

    // Glowing Cyan Talon Points
    ctx.fillStyle = '#00F2FE';
    ctx.beginPath();
    ctx.arc(leftX + handR * 0.6, leftY, handR * 0.35, 0, Math.PI * 2);
    ctx.arc(rightX + handR * 0.6, rightY, handR * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws Naoya's full fighter skin adhering to Rule 19, Rule 20, and Rule 3.5.
 * Automatically delegates to Cursed Womb or Curse Form when transformed!
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} fighter
 */
export function drawNaoyaSkin(ctx, fighter) {
  if (!fighter) return;

  // ── OPTION B: CURSED WOMB COCOON & CURSE FORM HOOKS ──
  if (fighter.isCurseWomb) {
    drawCursedWombCocoonVFX(ctx, fighter);
    return;
  }
  if (fighter.isCurseForm) {
    drawCurseNaoyaSkin(ctx, fighter);
    return;
  }

  const r = fighter.r || 25;
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);

  // 1. Offscreen Canvas Caching check
  getNaoyaCachedCanvas(r);

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
  ctx.rotate(angle);

  // Rule 19: Vertical mirroring when aiming left
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 2. Render Cached Pixel Art Body (Clean Bald Anime Head & Zenin Clan Clothes)
  if (_cachedFighterCanvas) {
    const w = _cachedFighterCanvas.width;
    const h = _cachedFighterCanvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(_cachedFighterCanvas, -w / 2, -h / 2, w, h);
  } else {
    _renderNaoyaPixelBodyToCanvas(ctx, r);
  }

  // 3. Render Authentic Pixel-Art Hair Model Layer (Assets/model/naoya/Naoya_hair.png)
  _drawNaoyaHair(ctx, r, facingLeft);

  // 4. Render Hand Layering & Dynamic Brawler Punches (Gojo-style snappy anime punches)
  const shouldHideHands = Boolean(
    (typeof state !== 'undefined' && state.showSkinOnly) ||
    fighter.hideHands
  );

  if (!shouldHideHands) {
    const handR = getHandSize(r * 0.30);
    const skinTone = '#FFDFC4';
    const handOutline = '#0E1015';

    const isStabbing = Boolean(fighter.isStabbingKnife && fighter.knifeStabTimer > 0);
    const isPunching = Boolean(fighter.punchAnimTimer && fighter.punchAnimTimer > 0 && !isStabbing);
    const isUltPaused = Boolean(fighter.isExecutingUlt && (fighter.ultStartupPauseTimer || 0) > 0);
    const isUltSprinting = Boolean(fighter.isExecutingUlt && !isUltPaused && (fighter.ultPhase === 1 || fighter.ultPhase === 0));

    if (isStabbing) {
      const maxT = fighter.knifeStabMaxTimer || 38;
      const rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.knifeStabTimer / maxT)));

      let rightX = r * 0.65;
      let rightY = r * 0.38;
      let leftX = r * 0.35;
      let leftY = -r * 0.38;
      let handAngleOffset = 0;

      if (rawProgress < 0.40) {
        // Phase 1: Smooth Unsheathe / Knife Draw (0.0 to 0.40)
        const p = rawProgress / 0.40;
        const easeTakeoff = Math.sin(p * (Math.PI / 2));
        rightX = r * 0.40 + easeTakeoff * (r * 0.25);
        rightY = r * 0.48 - easeTakeoff * (r * 0.18);
        handAngleOffset = -22 * (1.0 - easeTakeoff);
        leftX = r * 0.35 - easeTakeoff * (r * 0.05);
        leftY = -r * 0.38;
      } else if (rawProgress < 0.75) {
        // Phase 2: Smooth Dynamic Forward Lunge & Deep Front Stab (0.40 to 0.75)
        const p = (rawProgress - 0.40) / 0.35;
        const easeThrust = Math.pow(Math.sin(p * (Math.PI / 2)), 1.15);
        const target = fighter.knifeStabTarget || fighter.flurryTarget || fighter.target;
        let maxLunge = r * 2.20;
        if (target && !target.isDead) {
          const dx = target.x - fighter.x;
          const dy = (target.y - (target.z || 0)) - (fighter.y - (fighter.z || 0));
          const dist = Math.hypot(dx, dy);
          const targetR = target.r || r;
          const gap = dist - targetR - r * 0.82;
          maxLunge = Math.max(r * 1.5, Math.min(r * 2.8, gap + targetR * 0.6));
        }
        rightX = r * 0.65 + easeThrust * maxLunge;
        rightY = r * 0.30 - easeThrust * (r * 0.05);
        leftX = r * 0.30 - easeThrust * (r * 0.15);
        leftY = -r * 0.42;
      } else {
        // Phase 3: Fluid Retraction back to rest stance (0.75 to 1.0)
        const p = (rawProgress - 0.75) / 0.25;
        const easeRetract = Math.cos(p * (Math.PI / 2));
        rightX = r * 0.65 + easeRetract * (r * 1.20);
        rightY = r * 0.30 + (1 - easeRetract) * (r * 0.08);
        leftX = r * 0.15 + (1 - easeRetract) * (r * 0.20);
        leftY = -r * 0.42 + (1 - easeRetract) * (r * 0.04);
      }

      // Draw Tanto Knife attached to the right hand
      drawNaoyaTanto(ctx, 0, 0, 0, r, true, rawProgress, {
        handX: rightX,
        handY: rightY,
        angleOffset: handAngleOffset,
        isStab: true
      });

      // Draw Guarding Hand (left) then Front Stabbing Hand (right over handle)
      drawPixelHand(ctx, leftX, leftY, handR * 0.95, skinTone, handOutline);
      drawPixelHand(ctx, rightX, rightY, handR * 1.05, skinTone, handOutline);

      // Manga speed needle trail & puncture piercing glint during active stab
      if (rawProgress >= 0.40 && rawProgress <= 0.75) {
        const p = (rawProgress - 0.40) / 0.35;
        const stabNeedleLen = r * 1.8 * Math.sin(p * Math.PI);
        ctx.fillStyle = 'rgba(118, 224, 66, 0.75)';
        ctx.beginPath();
        ctx.moveTo(rightX + 24 + stabNeedleLen, rightY);
        ctx.lineTo(rightX + 24, rightY - 2.5);
        ctx.lineTo(rightX + 18, rightY);
        ctx.lineTo(rightX + 24, rightY + 2.5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(rightX + 24 + stabNeedleLen * 0.8, rightY);
        ctx.lineTo(rightX + 24, rightY - 1.2);
        ctx.lineTo(rightX + 20, rightY);
        ctx.lineTo(rightX + 24, rightY + 1.2);
        ctx.closePath();
        ctx.fill();
      }
    } else if (isPunching) {
      const maxT = fighter.punchAnimMaxTimer || 8;
      const rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));

      let easePunch = 0;
      if (rawProgress < 0.28) {
        easePunch = Math.sin((rawProgress / 0.28) * (Math.PI / 2));
      } else {
        const retractT = (rawProgress - 0.28) / 0.72;
        easePunch = Math.cos(retractT * (Math.PI / 2));
      }

      // Dynamic reach directly towards target so punch connects deeply into opponent
      let maxLunge = r * 1.85;
      const target = fighter.flurryTarget || fighter.target;
      if (target && !target.isDead) {
        const dx = target.x - fighter.x;
        const dy = (target.y - (target.z || 0)) - (fighter.y - (fighter.z || 0));
        const dist = Math.hypot(dx, dy);
        const targetR = target.r || r;
        const gap = dist - targetR - r * 0.82;
        const desiredReach = gap + Math.min(targetR * 0.5, 14);
        maxLunge = Math.max(r * 1.15, Math.min(r * 2.5, desiredReach));
      }
      const currentLunge = easePunch * maxLunge;

      // Alternating Left / Right 1-2 Boxer Punches (Upper Left & Lower Right Flanks)
      const isLeftPunch = (fighter.punchAnimHand === 1);
      
      let leftX, leftY, rightX, rightY;
      if (!isLeftPunch) {
        // Right fist (lower flank) lunges forward along +X
        rightX = r * 0.65 + currentLunge;
        rightY = r * 0.38 - Math.sin(rawProgress * Math.PI) * (r * 0.10);
        // Left fist (upper flank) stays forward in active boxer high guard
        leftX = r * 0.45 - easePunch * (r * 0.15);
        leftY = -r * 0.38;
      } else {
        // Left fist (upper flank) lunges forward along +X
        leftX = r * 0.65 + currentLunge;
        leftY = -r * 0.38 + Math.sin(rawProgress * Math.PI) * (r * 0.10);
        // Right fist (lower flank) stays forward in active boxer high guard
        rightX = r * 0.45 - easePunch * (r * 0.15);
        rightY = r * 0.38;
      }

      // Draw guarding fist first (under), then lunging punch fist on top
      if (!isLeftPunch) {
        drawPixelHand(ctx, leftX, leftY, handR * 0.95, skinTone, handOutline);
        drawPixelHand(ctx, rightX, rightY, handR * 1.10, skinTone, handOutline);
      } else {
        drawPixelHand(ctx, rightX, rightY, handR * 0.95, skinTone, handOutline);
        drawPixelHand(ctx, leftX, leftY, handR * 1.10, skinTone, handOutline);
      }
    } else if (isUltSprinting) {
      // Supersonic Mach 3 Sprint Arm-Pumping Cycle
      const p = Math.min(1.0, Math.max(0.0, fighter.ultRunwayProgress || 0));
      // Frequency accelerates from steady 0.50 rad/frame to blistering 1.15 rad/frame at Mach 3
      const freq = 0.50 + p * 0.65;
      const sprintPhase = (fighter.ultTimer || 0) * freq;
      
      // Dynamic swing amplitude: arm reaches forward and drives back
      const strokeAmp = (r * 0.70) + p * (r * 0.35); // 0.70r to 1.05r
      const stroke = Math.sin(sprintPhase);
      const strokeCos = Math.cos(sprintPhase);

      // Sprinter forward torso lean: hands shift forward as speed builds
      const forwardLean = (r * 0.15) + p * (r * 0.35);

      // Left Arm: on upper flank (-Y)
      const leftX = forwardLean - stroke * strokeAmp;
      const leftY = -r * 0.52 + strokeCos * (r * 0.12);

      // Right Arm: on lower flank (+Y), opposite phase
      const rightX = forwardLean + stroke * strokeAmp;
      const rightY = r * 0.52 - strokeCos * (r * 0.12);

      // Draw whichever hand is further back first, then front hand
      if (leftX < rightX) {
        drawPixelHand(ctx, leftX, leftY, handR, skinTone, handOutline);
        drawPixelHand(ctx, rightX, rightY, handR, skinTone, handOutline);
      } else {
        drawPixelHand(ctx, rightX, rightY, handR, skinTone, handOutline);
        drawPixelHand(ctx, leftX, leftY, handR, skinTone, handOutline);
      }

      // Supersonic Manga Speed Needles & Energy Slipstreams behind both fists (Rule 16)
      const renderSprintSlipstream = (handX, handY, isDrivingForward, isLime) => {
        const trailLen = (r * 0.85 + p * r * 1.5) * (isDrivingForward ? 1.25 : 0.75);
        const needleW = handR * (0.60 + p * 0.25);
        const mainColor = isLime ? 'rgba(118, 224, 66, 0.70)' : 'rgba(0, 242, 254, 0.70)';

        // 4-point Manga speed needle polygon trailing behind the fist (-X direction)
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.moveTo(handX - trailLen, handY);
        ctx.lineTo(handX - trailLen * 0.45, handY - needleW);
        ctx.lineTo(handX - handR * 0.4, handY);
        ctx.lineTo(handX - trailLen * 0.45, handY + needleW);
        ctx.closePath();
        ctx.fill();

        // Intense White core needle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
        ctx.beginPath();
        ctx.moveTo(handX - trailLen * 0.75, handY);
        ctx.lineTo(handX - trailLen * 0.40, handY - needleW * 0.40);
        ctx.lineTo(handX - handR * 0.3, handY);
        ctx.lineTo(handX - trailLen * 0.40, handY + needleW * 0.40);
        ctx.closePath();
        ctx.fill();
      };

      // Render slipstreams for both fists
      renderSprintSlipstream(leftX, leftY, leftX > forwardLean, false); // Cyan slipstream on upper arm
      renderSprintSlipstream(rightX, rightY, rightX > forwardLean, true);  // Lime slipstream on lower arm
    }
    // Idle / Moving Stance: Hands remain tucked inside sleeves/haori (hidden)
  }

  ctx.restore();
}
