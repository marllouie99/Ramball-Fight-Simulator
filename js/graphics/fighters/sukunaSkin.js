// Offscreen canvas cache for Sukuna's pixel body model (avoids 1,000 fillRect calls per frame)
let _cachedSukunaCanvas = null;
let _cachedSukunaR = 0;
let _cachedSukunaColor = '';

function _renderSukunaPixelBodyToCanvas(destCtx, r, crimsonBase) {
  destCtx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  // Palette Colors for Ryomen Sukuna (Whole Crimson Red Body + Dark Cursed Ink)
  const C = {
    outline: '#0E0F14',        // Deep dark pixel border
    tattooBlack: '#0E0F14',    // Deep high-contrast cursed ink tattoo

    skinBase: crimsonBase,     // Main rich crimson red flesh
    skinHighlight: '#B21E35',  // Top forehead / brow highlight
    skinShadow1: '#6E0A18',    // Mid cheek & jaw edge shade
    skinShadow2: '#4A0510',    // Deep perimeter rim & bottom shadow
  };

  const cx = destCtx.canvas.width / 2;
  const cy = destCtx.canvas.height / 2;

  destCtx.save();
  destCtx.translate(cx, cy);

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);

      // ──────────────────────────────────────────
      // 0. PIXELATED BLACK STROKE BORDER
      // ──────────────────────────────────────────
      if (
        Math.hypot(rx + P, ry) > r ||
        Math.hypot(rx - P, ry) > r ||
        Math.hypot(rx, ry + P) > r ||
        Math.hypot(rx, ry - P) > r
      ) {
        destCtx.fillStyle = C.outline;
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      const absGx = Math.abs(gx);

      // ──────────────────────────────────────────
      // 1. EXACT CANONICAL SUKUNA TATTOO MARKINGS (DISCRETE PIXEL GRID)
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
      // 2. PIXEL RENDER (TATTOO vs CRIMSON FLESH)
      // ──────────────────────────────────────────
      if (isTattoo) {
        destCtx.fillStyle = C.tattooBlack;
      } else {
        let col = C.skinBase;
        if (gy < -4 && absGx < 6) {
          col = C.skinHighlight;
        } else if (gy >= -1 && gy <= 5 && absGx < 4) {
          col = C.skinHighlight;
        } else if (absGx >= 8 || gy > 9 || gy < -9) {
          const dLevel = Math.max((absGx - 8) / 4, (gy - 9) / 3);
          if (dLevel > 0.5) {
            col = ((gx + gy) % 2 === 0) ? C.skinShadow2 : C.skinShadow1;
          } else {
            col = ((gx + gy) % 2 === 0) ? C.skinShadow1 : C.skinBase;
          }
        } else if (absGx >= 6 && gy >= 2 && gy <= 7) {
          col = ((gx + gy) % 2 === 0) ? C.skinShadow1 : C.skinBase;
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
    const size = Math.ceil((r + 4) * 2);
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

  // 2. Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}
