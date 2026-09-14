// Offscreen canvas cache for Sukuna's pixel body model (avoids 1,000 fillRect calls per frame)
let _cachedSukunaCanvas = null;
let _cachedSukunaR = 0;
let _cachedSukunaColor = '';

function _renderSukunaPixelBodyToCanvas(destCtx, r, crimsonBase) {
  destCtx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  // Palette Colors for Ryomen Sukuna (Crimson Face + Traditional Kimono)
  const C = {
    outline: '#0E0F14',        // Deep dark pixel border
    tattooBlack: '#0E0F14',    // Deep high-contrast cursed ink tattoo

    skinBase: '#FEDBC0',       // Warm fair skin (matches Gojo)
    skinHighlight: '#FFF0E2',  // Soft center forehead/face highlight
    skinShadow1: '#E9B796',    // Light cheek shadow dither
    skinShadow2: '#D89F7C',    // Deep cheek shadow dither

    // Traditional Kimono Outfit
    cowlBase: '#1E1B24',       // Dark charcoal cowl/scarf
    cowlLight: '#2C2836',      // Cowl fold subtle highlight
    kimonoBase: '#DCD8D0',     // Light off-white kimono
    kimonoLight: '#EBE8E2',    // Kimono bright highlight
    kimonoShadow: '#B8B4AC',   // Kimono crease shadow
    kimonoDark: '#A09C94',     // Kimono perimeter dither
    lapelNavy: '#302D52',      // Dark navy collar/lapel
    lapelEdge: '#1A1830',      // Lapel dark outline edge
    obiBase: '#2C2842',        // Obi belt dark base
    obiPattern: '#8C8780',     // Obi geometric pattern accent
    obiEdge: '#1C1828',        // Obi border line
  };

  const cx = destCtx.canvas.width / 2;
  const cy = destCtx.canvas.height / 2;

  destCtx.save();
  destCtx.translate(cx, cy);

  // 0. Stepped Dark Outer Ink Shell (Eliminates transparent diagonal corner gaps / white border bleeding)
  destCtx.fillStyle = C.outline;
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist <= r + P * 0.5) {
        destCtx.fillRect(snap(rx), snap(ry), P, P);
      }
    }
  }

  // 1. Inner Body Fill: Clean Zonal Tones (NO noisy checkerboard dithering stripes) & Cursed Ink Tattoos
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r - P * 0.4) continue; // Keep the solid outer border shell clean

      const px = snap(rx);
      const py = snap(ry);
      const absGx = Math.abs(gx);

      // ──────────────────────────────────────────
      // EXACT CANONICAL SUKUNA TATTOO MARKINGS (DISCRETE PIXEL GRID)
      // ──────────────────────────────────────────
      let isTattoo = false;

      // ── A. FOREHEAD TRIDENT & CENTRAL DROPLET ──
      if (absGx === 0 && (gy === -9 || gy === -8 || gy === -7)) {
        isTattoo = true;
      } else if (absGx === 4 && (gy === -10 || gy === -9 || gy === -8)) {
        isTattoo = true;
      } else if (gy === -7 && absGx === 3) {
        isTattoo = true;
      } else if (gy === -6 && (absGx === 2 || absGx === 3 || absGx === 4)) {
        isTattoo = true;
      } else if ((gy === -5 && absGx === 4) || (gy === -4 && absGx === 5)) {
        isTattoo = true;
      } else if (absGx === 2 && (gy === -5 || gy === -4 || gy === -3)) {
        isTattoo = true;
      }
      // ── B. NOSE / BROW WAVE ARCH ──
      else if (gy === -2 && absGx <= 1) {
        isTattoo = true;
      } else if (gy === -1 && absGx === 2) {
        isTattoo = true;
      } else if (gy === 0 && absGx === 3) {
        isTattoo = true;
      }
      // ── C. CHEEK FORKS, JAWLINE & CHIN ──
      else if ((gy === -3 && absGx === 10) || (gy === -2 && absGx === 9)) {
        isTattoo = true;
      } else if ((gy === -2 && absGx === 7) || (gy === -1 && absGx === 8)) {
        isTattoo = true;
      } else if (absGx === 9 && (gy === 0 || gy === 1)) {
        isTattoo = true;
      } else if ((gy === 2 && absGx === 8) || (gy === 3 && absGx === 8) || (gy === 4 && absGx === 7)) {
        isTattoo = true;
      } else if ((gy === 5 && absGx === 6) || (gy === 6 && absGx === 5) || (gy === 7 && absGx === 4)) {
        isTattoo = true;
      } else if (gy === 8 && absGx === 5) {
        isTattoo = true;
      } else if (gy === 8 && absGx === 3) {
        isTattoo = true;
      } else if ((gy === 9 && absGx === 4) || (gy === 10 && absGx === 3)) {
        isTattoo = true;
      } else if (absGx === 1 && (gy === 9 || gy === 10)) {
        isTattoo = true;
      }

      // ──────────────────────────────────────────
      // 2. PIXEL RENDER: ZONED (CRIMSON FACE + KIMONO OUTFIT)
      // ──────────────────────────────────────────
      const ny = ry / r;
      const nx = rx / r;
      const absNx = Math.abs(nx);

      if (ny >= 0.20) {
        // ── CLOTHING ZONE: Traditional Kimono Outfit ──
        let col;

        if (ny < 0.42) {
          // Thick Puffy Dark Cowl / Scarf (large, wrapping around neck)
          col = C.cowlBase;
          // Upper cowl highlight folds (subtle fabric texture)
          if (ny < 0.28 && absNx < 0.45) col = C.cowlLight;
          // Mid cowl crease fold
          if (ny >= 0.30 && ny < 0.33 && absNx < 0.50) col = '#151220';
          // Lower cowl highlight fold
          if (ny >= 0.34 && ny < 0.37 && absNx < 0.42) col = C.cowlLight;
          // Bottom cowl border crease edge
          if (ny >= 0.40) col = C.outline;
        } else {
          // Kimono Body (light/white robe)
          col = C.kimonoBase;

          // Single diagonal navy sash/collar band going from upper-left to lower-right
          const sashCenter = (ny - 0.42) * 1.4 - 0.18;
          const sashDist = Math.abs(nx - sashCenter);
          if (sashDist < 0.10) {
            col = C.lapelNavy;
            // Dark edge outline on sash borders
            if (sashDist > 0.07) col = C.lapelEdge;
          }

          // Obi belt band
          if (ny >= 0.62 && ny < 0.76) {
            col = C.obiBase;
            // Geometric triangle-like pattern
            if (ny >= 0.64 && ny < 0.74 && (absGx + gy) % 3 === 0) col = C.obiPattern;
            // Top/bottom obi border edges
            if (ny < 0.64 || ny >= 0.74) col = C.obiEdge;
          }

          // Kimono fold crease
          if (Math.abs(ny - 0.52) < 0.02 && absNx > 0.20 && absNx < 0.55) {
            col = C.kimonoShadow;
          }

          // Perimeter shadow dither
          if (absNx > 0.72 || ny > 0.84) {
            if ((gx + gy) % 2 === 0) col = C.kimonoDark;
          }
        }

        destCtx.fillStyle = col;
      } else if (isTattoo) {
        // ── FACE ZONE: Cursed Ink Tattoo ──
        destCtx.fillStyle = C.tattooBlack;
      } else {
        // ── FACE ZONE: Volumetric Crimson Flesh ──
        let col = C.skinBase;
        if (gy < -5 && absGx < 6) {
          col = C.skinHighlight;
        } else if (gy >= -2 && gy <= 4 && absGx < 4) {
          col = C.skinHighlight;
        } else if (absGx >= 9 || gy > 9 || gy < -9) {
          col = C.skinShadow2;
        } else if (absGx >= 7 || gy >= 7) {
          col = C.skinShadow1;
        }
        destCtx.fillStyle = col;
      }
      destCtx.fillRect(px, py, P, P);
    }
  }

  destCtx.restore();
}

/**
 * Authentic 1:1 Procedural Pixel Art Body for Ryomen Sukuna (High Performance Offscreen Cached)
 */
export function drawSukunaPixelBody(ctx, r, fighter = null) {
  const crimsonBase = (fighter && fighter.color) ? fighter.color : '#8B0000';

  if (!_cachedSukunaCanvas || _cachedSukunaR !== r || _cachedSukunaColor !== crimsonBase) {
    _cachedSukunaR = r;
    _cachedSukunaColor = crimsonBase;
    const P = 2.0;
    const steps = Math.ceil((r + P) / P);
    const size = (steps + 2) * P * 2;
    _cachedSukunaCanvas = document.createElement('canvas');
    _cachedSukunaCanvas.width = size;
    _cachedSukunaCanvas.height = size;
    const offCtx = _cachedSukunaCanvas.getContext('2d');
    _renderSukunaPixelBodyToCanvas(offCtx, r, crimsonBase);
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_cachedSukunaCanvas, -_cachedSukunaCanvas.width / 2, -_cachedSukunaCanvas.height / 2);
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
      console.warn('Failed to load Sukuna hair image at Assets/model/Sukuna-hair.png', e);
      _sukunaHairImageLoading = false;
    };
    img.src = 'Assets/model/Sukuna-hair.png?v=1';
    _sukunaHairImage = img;
  }
  return _sukunaHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getSukunaHairImage();
}

/**
 * Draws Sukuna's authentic pixel-art spiky hair from Assets/model/Sukuna-hair.png.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawSukunaHair(ctx, r, facingLeft = false) {
  const hairImg = _getSukunaHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp pixel art fidelity (Rule #19)

    // Sukuna-hair.png (1254x1254). True visible hair bounding box:
    // X: [164, 1088] (width 925, horizontal center at 626)
    // Y: [226, 974] (height 749, top crown at 226)
    // Scales with increased volume and length to match Gojo's spiky hair scale size
    const targetHairWidth = r * 2.90;
    const targetHairHeight = r * 2.25;
    const scaleX = targetHairWidth / 925;
    const scaleY = targetHairHeight / 749;
    const drawW = 1254 * scaleX;
    const drawH = 1254 * scaleY;
    const drawX = -626 * scaleX;
    const drawY = -r * 1.70 - 226 * scaleY;

    ctx.drawImage(hairImg, drawX, drawY, drawW, drawH);
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

  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || fighter.angle || 0);
  ctx.rotate(angle);

  // Mirror Y-axis vertically so top (-Y) stays on top and torso (+Y) stays on bottom when moving/aiming left (Rule #19)
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 1. Procedural Pixel Art Body with Stepped Outer Black Stroke
  drawSukunaPixelBody(ctx, r, fighter);

  // 2. Authentic Pixel-Art Spiky Hair (Assets/model/Sukuna-hair.png)
  _drawSukunaHair(ctx, r, facingLeft);

  // 3. Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}
