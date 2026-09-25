import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';

// ─────────────────────────────────────────────
// Spike — Ultra-Optimized Discrete Pixel Art Skin Engine (P = 2.0px)
// Pre-rendered offscreen canvases for 60 FPS performance
// ─────────────────────────────────────────────
const P = 2.0;
const snap = (v) => Math.round(v / P) * P;

let _cachedSpikeBodyCanvas = null;
let _cachedSpikeBodyR = 0;
let _cachedSpikeGhostCanvas = null;
let _cachedSpikeGhostR = 0;

function _createCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h);
  } else if (typeof document !== 'undefined' && document.createElement) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  return null;
}

function _renderPixelSpikeBody(ctx, r) {
  const steps = Math.ceil((r + 4) / P);

  // 1. Dark Manga Ink Outer Shell Outline
  ctx.fillStyle = '#111114';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= r + P * 0.75) {
        ctx.fillRect(snap(gx * P), snap(gy * P), P, P);
      }
    }
  }

  // 2. Stepped Armored Titanium-Gold Dome Body
  const innerR = r * 0.55;
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const bx = snap(rx);
      const by = snap(ry);

      // Light source from upper-left (-X, -Y)
      const lightFactor = (-rx * 0.5 - ry * 0.5) / r;

      if (dist <= innerR * 0.75) {
        // Central Core Gem
        if (rx < -2 && ry < -2) {
          ctx.fillStyle = '#FFFFFF'; // Specular core spark
        } else if (dist <= innerR * 0.45) {
          ctx.fillStyle = '#FEF08A'; // Bright core glow
        } else if (dist <= innerR * 0.65) {
          ctx.fillStyle = '#F59E0B'; // Amber gem body
        } else {
          ctx.fillStyle = '#B45309'; // Core rim shadow
        }
      } else {
        // Armored Plate Shading
        if (lightFactor > 0.55 && dist < r * 0.85) {
          ctx.fillStyle = '#FFFFFF'; // Specular armor glint
        } else if (lightFactor > 0.15) {
          ctx.fillStyle = '#E2E8F0'; // Bright metallic steel
        } else if (lightFactor > -0.25) {
          ctx.fillStyle = '#94A3B8'; // Mid steel tone
        } else if (lightFactor > -0.60) {
          ctx.fillStyle = '#475569'; // Steel shadow
        } else {
          ctx.fillStyle = '#1E293B'; // Deep occluded base
        }
      }

      ctx.fillRect(bx, by, P, P);
    }
  }

  // 3. Segmented Hexagonal Armor Grooves & Rivets
  ctx.fillStyle = '#0F172A';
  const numPlates = 6;
  const angleStep = (Math.PI * 2) / numPlates;

  for (let i = 0; i < numPlates; i++) {
    const a = i * angleStep;
    const nextA = (i + 1) * angleStep;

    const x1 = snap(Math.cos(a) * innerR);
    const y1 = snap(Math.sin(a) * innerR);
    const x2 = snap(Math.cos(nextA) * innerR);
    const y2 = snap(Math.sin(nextA) * innerR);

    // Inner hex groove
    _drawPixelLine(ctx, x1, y1, x2, y2, P, '#0F172A');

    // Radial groove to outer perimeter
    const rx2 = snap(Math.cos(a) * (r - 2));
    const ry2 = snap(Math.sin(a) * (r - 2));
    _drawPixelLine(ctx, x1, y1, rx2, ry2, P, '#0F172A');

    // Corner rivet dot
    ctx.fillStyle = '#090D16';
    ctx.fillRect(x1 - P / 2, y1 - P / 2, P, P);
  }
}

function _renderPixelSpikeGhost(ctx, r) {
  const steps = Math.ceil((r + 4) / P);

  // 1. Ghost Outer Outline
  ctx.fillStyle = '#111114';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      if (Math.hypot(gx * P, gy * P) <= r + P * 0.75) {
        ctx.fillRect(snap(gx * P), snap(gy * P), P, P);
      }
    }
  }

  // 2. Ghost Armored Shell & Glowing Core
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const bx = snap(rx);
      const by = snap(ry);

      if (dist <= r * 0.40) {
        ctx.fillStyle = '#FFFFFF'; // Bright ghost core spark
      } else if (dist <= r * 0.75) {
        ctx.fillStyle = '#E5C158'; // Glowing amber/gold body
      } else {
        ctx.fillStyle = '#92400E'; // Ghost outer shadow
      }
      ctx.fillRect(bx, by, P, P);
    }
  }

  // 3. Ghost Spikes
  const numSpikes = 6;
  const angleStep = (Math.PI * 2) / numSpikes;
  const tipR = r + 18;

  ctx.fillStyle = '#E5C158';
  for (let i = 0; i < numSpikes; i++) {
    const curA = i * angleStep;
    const cosA = Math.cos(curA);
    const sinA = Math.sin(curA);
    const perpX = -sinA;
    const perpY = cosA;

    const tx = snap(cosA * tipR);
    const ty = snap(sinA * tipR);
    const bx1 = snap(cosA * (r - 2) + perpX * 4);
    const by1 = snap(sinA * (r - 2) + perpY * 4);
    const bx2 = snap(cosA * (r - 2) - perpX * 4);
    const by2 = snap(sinA * (r - 2) - perpY * 4);

    ctx.beginPath();
    ctx.moveTo(bx1, by1);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx2, by2);
    ctx.closePath();
    ctx.fill();
  }
}

function _drawPixelLine(ctx, x0, y0, x1, y1, size, color) {
  ctx.fillStyle = color;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? size : -size;
  const sy = y0 < y1 ? size : -size;
  let err = dx - dy;

  let cx = x0;
  let cy = y0;

  while (true) {
    ctx.fillRect(snap(cx), snap(cy), size, size);
    if (Math.abs(cx - x1) < size && Math.abs(cy - y1) < size) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
}

/**
 * Draws the pre-rendered discrete pixel art armored shell skin for Spike in 1 fast drawImage call.
 */
export function drawSpikeSkin(ctx, x, y, r, angle, baseColor = '#e5c158') {
  const intR = Math.round(r);
  if (!_cachedSpikeBodyCanvas || _cachedSpikeBodyR !== intR) {
    const size = Math.ceil((intR + 8) * 2);
    _cachedSpikeBodyCanvas = _createCanvas(size, size);
    if (_cachedSpikeBodyCanvas) {
      const cctx = _cachedSpikeBodyCanvas.getContext('2d');
      cctx.imageSmoothingEnabled = false;
      cctx.translate(size / 2, size / 2);
      _renderPixelSpikeBody(cctx, intR);
      _cachedSpikeBodyR = intR;
    }
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (_cachedSpikeBodyCanvas) {
    const half = _cachedSpikeBodyCanvas.width / 2;
    ctx.drawImage(_cachedSpikeBodyCanvas, -half, -half);
  }

  ctx.restore();
}

/**
 * Renders full ghost model afterimage silhouette in 1 fast drawImage call.
 */
export function drawSpikeGhostModel(ctx, x, y, r, angle, alpha = 0.5, themeColor = '#e5c158') {
  const intR = Math.round(r);
  if (!_cachedSpikeGhostCanvas || _cachedSpikeGhostR !== intR) {
    const size = Math.ceil((intR + 24) * 2);
    _cachedSpikeGhostCanvas = _createCanvas(size, size);
    if (_cachedSpikeGhostCanvas) {
      const cctx = _cachedSpikeGhostCanvas.getContext('2d');
      cctx.imageSmoothingEnabled = false;
      cctx.translate(size / 2, size / 2);
      _renderPixelSpikeGhost(cctx, intR);
      _cachedSpikeGhostR = intR;
    }
  }

  ctx.save();
  ctx.globalAlpha = Math.max(0.05, Math.min(1.0, alpha));
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (_cachedSpikeGhostCanvas) {
    const half = _cachedSpikeGhostCanvas.width / 2;
    ctx.drawImage(_cachedSpikeGhostCanvas, -half, -half);
  }

  ctx.restore();
}

export function drawSpikeOutline(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.stroke();
}
