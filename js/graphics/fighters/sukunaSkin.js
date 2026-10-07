// Offscreen canvas cache for Sukuna's pixel body model (avoids 1,000 fillRect calls per frame)
let _cachedSukunaCanvas = null;
let _cachedSukunaR = 0;

function _renderSukunaPixelBodyToCanvas(destCtx, r) {
  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);
  const P = 2.0;
  const steps = Math.ceil((r + P) / P);

  // Palette Colors for Ryomen Sukuna (Crimson Cursed Ink Face + Traditional Kimono)
  const C = {
    outline: '#0E0F14',        // Deep dark manga ink pixel border
    tattooBlack: '#0E0F14',    // Deep high-contrast cursed ink tattoo

    skinBase: '#FEDBC0',       // Warm fair skin (1:1 with Gojo & Toji)
    skinHighlight: '#FFF0E2',  // Soft center forehead/face highlight
    skinShadow1: '#E9B796',    // Light cheek shadow dither
    skinShadow2: '#D89F7C',    // Deep cheek shadow dither

    // Traditional Kimono Outfit (Ensuring Y >= 24 luminance so fabrics never merge into #0E0F14 outer stroke)
    cowlBase: '#262230',       // Dark charcoal cowl/scarf
    cowlLight: '#3A3448',      // Cowl fold subtle highlight
    cowlCrease: '#181520',     // Cowl fold crease
    kimonoBase: '#DCD8D0',     // Light off-white kimono
    kimonoLight: '#EBE8E2',    // Kimono bright highlight
    kimonoShadow: '#B8B4AC',   // Kimono crease shadow
    kimonoDark: '#A09C94',     // Kimono perimeter dither
    lapelNavy: '#38345C',      // Dark navy collar/lapel
    lapelEdge: '#201E34',      // Lapel dark outline edge
    obiBase: '#2E2A44',        // Obi belt dark base
    obiPattern: '#8C8780',     // Obi geometric pattern accent
    obiEdge: '#1C1828',        // Obi border line
  };

  // 100% 4-Way Symmetrical Circular Pixel Body Fill & Outer Border
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;
      const absGx = Math.abs(gx);

      // 4-neighbor boundary test for clean 1-pixel outer manga ink outline
      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );

      if (isBorder) {
        destCtx.fillStyle = C.outline;
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      const ny = ry / r;
      const nx = rx / r;
      const absNx = Math.abs(nx);

      // ──────────────────────────────────────────
      // ZONE 1: WARM ATHLETIC SKIN FACE & CANONICAL CURSED TATTOOS (ny < 0.30)
      // Pure unbroken circular dome (All hair on Layer 2)
      // Tattoos are strictly bounded within the interior so they never merge into the outer stroke
      // ──────────────────────────────────────────
      if (ny < 0.33) {
        let isTattoo = false;

        // A. Forehead Trident & Central Markings (safely inside forehead)
        if (absGx === 0 && (gy === -8 || gy === -7 || gy === -6)) {
          isTattoo = true;
        } else if (absGx === 3 && (gy === -8 || gy === -7)) {
          isTattoo = true;
        } else if (gy === -6 && (absGx === 1 || absGx === 2 || absGx === 3)) {
          isTattoo = true;
        } else if (absGx === 2 && (gy === -5 || gy === -4)) {
          isTattoo = true;
        }
        // B. Nose / Brow Wave Arch (Horizontally aligned with upper cheek fork)
        else if (gy === -2 && absGx <= 1) {
          isTattoo = true; // Top horizontal bridge
        } else if (gy === -1 && absGx === 2) {
          isTattoo = true; // Left/right diagonal legs
        }
        // C. Cheek Markings (Full-length long vertical cheek strokes aligned with nose arch)
        else if (gy === -3 && (absGx === 9 || absGx === 10)) {
          isTattoo = true; // Upper temple fork
        } else if (gy === -2 && (absGx === 8 || absGx === 9)) {
          isTattoo = true; // Upper cheek notch (aligned with nose arch)
        } else if ((gy === -1 || gy === 0 || gy === 1 || gy === 2) && absGx === 8) {
          isTattoo = true; // Long vertical cheek stroke
        } else if (gy === 3 && (absGx === 7 || absGx === 8)) {
          isTattoo = true; // Lower jaw curve
        } else if (gy === 4 && (absGx === 6 || absGx === 7)) {
          isTattoo = true; // Bottom jawline tip
        }
        // D. Chin Markings
        else if (absGx === 1 && gy === 4) {
          isTattoo = true;
        }

        if (isTattoo) {
          destCtx.fillStyle = C.tattooBlack;
        } else {
          let col = C.skinBase;
          if (absNx >= 0.55) {
            const dLevel = (absNx - 0.55) / 0.45;
            if (dLevel > 0.6) {
              col = ((gx + gy) % 2 === 0) ? C.skinShadow2 : C.skinShadow1;
            } else if ((gx + gy) % 2 === 0) {
              col = C.skinShadow1;
            }
          } else if (absNx < 0.35 && ny > -0.25 && ny < 0.10) {
            if ((gx + gy) % 4 === 0) {
              col = C.skinHighlight;
            }
          }
          destCtx.fillStyle = col;
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2 & 3: TRADITIONAL KIMONO OUTFIT & COWL (ny >= 0.30)
      // ──────────────────────────────────────────
      else {
        let col;

        if (ny < 0.48) {
          // Thick Puffy Dark Cowl / Scarf (wrapping around neck)
          col = C.cowlBase;
          // Upper cowl highlight folds
          if (ny < 0.36 && absNx < 0.50) col = C.cowlLight;
          // Mid cowl crease fold
          if (ny >= 0.38 && ny < 0.41 && absNx < 0.55) col = C.cowlCrease;
          // Lower cowl highlight fold
          if (ny >= 0.42 && ny < 0.45 && absNx < 0.48) col = C.cowlLight;
        } else {
          // Kimono Body (light/white robe)
          col = C.kimonoBase;

          // Single diagonal navy sash/collar band going from upper-left to lower-right
          const sashCenter = (ny - 0.48) * 1.3 - 0.15;
          const sashDist = Math.abs(nx - sashCenter);
          if (sashDist < 0.11) {
            col = C.lapelNavy;
            if (sashDist > 0.08) col = C.lapelEdge;
          }

          // Obi belt band (ny >= 0.66 && ny < 0.78)
          if (ny >= 0.66 && ny < 0.78) {
            col = C.obiBase;
            if (ny >= 0.68 && ny < 0.76 && (absGx + gy) % 3 === 0) col = C.obiPattern;
            if (ny < 0.68 || ny >= 0.76) col = C.obiEdge;
          }

          // Kimono fold crease
          if (Math.abs(ny - 0.56) < 0.02 && absNx > 0.20 && absNx < 0.55) {
            col = C.kimonoShadow;
          }

          // Perimeter shadow dither
          if (absNx > 0.72 || ny > 0.84) {
            if ((gx + gy) % 2 === 0) col = C.kimonoDark;
          }
        }

        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  destCtx.restore();
}

/**
 * Authentic 1:1 Procedural Pixel Art Body for Ryomen Sukuna (High Performance Offscreen Cached)
 */
export function drawSukunaPixelBody(ctx, r, fighter = null) {
  if (typeof document === 'undefined') {
    _renderSukunaPixelBodyToCanvas(ctx, r);
    return;
  }

  const intR = Math.round(r);
  if (!_cachedSukunaCanvas || _cachedSukunaR !== intR) {
    _cachedSukunaR = intR;
    const P = 2.0;
    const steps = Math.ceil((intR + P) / P);
    const size = (steps * 2 + 1) * P;
    _cachedSukunaCanvas = document.createElement('canvas');
    _cachedSukunaCanvas.width = size;
    _cachedSukunaCanvas.height = size;
    const offCtx = _cachedSukunaCanvas.getContext('2d');
    _renderSukunaPixelBodyToCanvas(offCtx, intR);
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const size = _cachedSukunaCanvas.width;
  ctx.drawImage(_cachedSukunaCanvas, -size / 2, -size / 2);
  ctx.restore();
}

let _sukunaHairImage = null;
let _sukunaHairImageLoading = false;

export function _getSukunaHairImage() {
  if (_sukunaHairImage && _sukunaHairImage.complete && _sukunaHairImage.naturalWidth > 0) {
    return _sukunaHairImage;
  }
  if (!_sukunaHairImageLoading && typeof Image !== 'undefined') {
    _sukunaHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _sukunaHairImage = img;
      _sukunaHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Sukuna hair image at Assets/model/sukuna/Sukuna-hair.png', e);
      _sukunaHairImageLoading = false;
    };
    img.src = 'Assets/model/sukuna/Sukuna-hair.png?v=1';
    _sukunaHairImage = img;
  }
  return _sukunaHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getSukunaHairImage();
}

/**
 * Draws Sukuna's authentic pixel-art spiky hair from Assets/model/sukuna/Sukuna-hair.png.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawSukunaHair(ctx, r, facingLeft = false) {
  const hairImg = _getSukunaHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp pixel art fidelity (Rule #19)

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.sukuna) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;
    const flipX = custom.flipX ? -1 : 1;
    const flipY = custom.flipY ? -1 : 1;

    // Sukuna-hair.png (1254x1254). True visible hair bounding box:
    // X: [164, 1088] (width 925, horizontal center at 626)
    // Y: [226, 974] (height 749, top crown at 226)
    // Scales to frame upper head circle with spiky crown at -1.40r
    const targetHairWidth = r * 3.10 * wMult;
    const targetHairHeight = r * 2.00 * hMult;
    const scaleX = targetHairWidth / 925;
    const scaleY = targetHairHeight / 749;
    const drawW = 1254 * scaleX;
    const drawH = 1254 * scaleY;
    const drawX = -626 * scaleX + offX;
    const drawY = -r * 1.40 - 226 * scaleY + offY;

    if (rot !== 0 || flipX !== 1 || flipY !== 1) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      if (rot !== 0) ctx.rotate(rot);
      if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
      ctx.drawImage(hairImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(hairImg, drawX, drawY, drawW, drawH);
    }
    ctx.restore();
  }
}

/**
 * Main Skin Renderer for Ryomen Sukuna
 */
export function drawSukunaBody(ctx, fighter) {
  const z = fighter.z || 0;
  const r = fighter.r;

  // Ground shadow when levitating
  if (z > 0) {
    const levFactor = Math.min(1.0, z / 35);
    ctx.save();
    ctx.translate(fighter.x, fighter.y);
    ctx.scale(1.0, 0.35);

    const shadowGlow = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.6);
    shadowGlow.addColorStop(0, `rgba(0, 0, 0, ${0.7 * levFactor})`);
    shadowGlow.addColorStop(0.5, `rgba(0, 0, 0, ${0.4 * levFactor})`);
    shadowGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = shadowGlow;
    ctx.fill();

    ctx.restore();
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y - z);

  const isChannelingDomain = Boolean(fighter.isChannelingDomainExpansion);
  const angle = (fighter._isWinnerReveal || isChannelingDomain) ? 0 : (fighter.gunAngle || fighter.angle || 0);
  ctx.rotate(angle);

  // Mirror Y-axis vertically so top (-Y) stays on top and torso (+Y) stays on bottom when moving/aiming left (Rule #19)
  const facingLeft = !isChannelingDomain && Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 1. Procedural Pixel Art Body with Stepped Outer Black Stroke
  drawSukunaPixelBody(ctx, r, fighter);

  // 2. Authentic Pixel-Art Spiky Hair (Assets/model/sukuna/Sukuna-hair.png)
  _drawSukunaHair(ctx, r, facingLeft);

  // 3. Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}
