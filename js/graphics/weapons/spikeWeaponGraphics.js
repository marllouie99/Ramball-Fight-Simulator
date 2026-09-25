import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';

// ─────────────────────────────────────────────
// Spike — Authentic 2D Discrete Pixel Art Rotating Spikes (P = 2.0px)
// Pre-rendered offscreen canvas for 60 FPS performance
// ─────────────────────────────────────────────
const P = 2.0;
const snap = (v) => Math.round(v / P) * P;

let _cachedSpikeWeaponCanvas = null;
let _cachedSpikeWeaponR = 0;

export const SPIKE_WEAPON_GRAPHICS = {
  spikes: {
    spikeColor: '#e0e5eb',           // Metallic silver blade
    spikeHighlight: '#ffffff',       // Shiny edge
    spikeShadow: '#5a626b',          // Darker metal base for more contrast
  },
  positioning: {
    scale: 1.0,
    numSpikes: 6,                    // 6 distinct blades around the body
    innerOffset: -2,                 // Less embedded to show more blade
    outerExtension: 20,              // Longer reach, sharper look
    spikeWidth: 6,                   // Narrower base for sharper look
  },
};

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

function _renderPixelSpikes(ctx, r) {
  const cfg = (CONFIG.spike?.weapon) || SPIKE_WEAPON_GRAPHICS;
  const numSpikes = cfg.numSpikes || SPIKE_WEAPON_GRAPHICS.positioning.numSpikes;
  const innerOffset = cfg.innerOffset !== undefined ? cfg.innerOffset : SPIKE_WEAPON_GRAPHICS.positioning.innerOffset;
  const outerExtension = cfg.outerExtension || SPIKE_WEAPON_GRAPHICS.positioning.outerExtension;
  const spikeWidth = cfg.spikeWidth || SPIKE_WEAPON_GRAPHICS.positioning.spikeWidth;

  const baseR = r + innerOffset;
  const tipR = baseR + outerExtension;
  const angleStep = (Math.PI * 2) / numSpikes;

  for (let i = 0; i < numSpikes; i++) {
    const curA = i * angleStep;
    const cosA = Math.cos(curA);
    const sinA = Math.sin(curA);
    const perpX = -sinA;
    const perpY = cosA;

    const tx = snap(cosA * tipR);
    const ty = snap(sinA * tipR);
    const bx1 = snap(cosA * baseR + perpX * (spikeWidth / 2));
    const by1 = snap(sinA * baseR + perpY * (spikeWidth / 2));
    const bx2 = snap(cosA * baseR - perpX * (spikeWidth / 2));
    const by2 = snap(sinA * baseR - perpY * (spikeWidth / 2));

    const midR = baseR + outerExtension * 0.45;
    const midW = spikeWidth * 0.35;
    const mx1 = snap(cosA * midR + perpX * midW);
    const my1 = snap(sinA * midR + perpY * midW);
    const mx2 = snap(cosA * midR - perpX * midW);
    const my2 = snap(sinA * midR - perpY * midW);

    // 1. Dark ink boundary outline
    ctx.fillStyle = '#111114';
    ctx.beginPath();
    ctx.moveTo(bx1 + perpX * 1.5, by1 + perpY * 1.5);
    ctx.lineTo(mx1 + perpX * 1.5, my1 + perpY * 1.5);
    ctx.lineTo(tx + cosA * 2, ty + sinA * 2);
    ctx.lineTo(mx2 - perpX * 1.5, my2 - perpY * 1.5);
    ctx.lineTo(bx2 - perpX * 1.5, by2 - perpY * 1.5);
    ctx.closePath();
    ctx.fill();

    // 2. Left Shaded Facet
    ctx.fillStyle = '#5a626b';
    ctx.beginPath();
    ctx.moveTo(bx2, by2);
    ctx.lineTo(mx2, my2);
    ctx.lineTo(tx, ty);
    ctx.lineTo(snap(cosA * baseR), snap(sinA * baseR));
    ctx.closePath();
    ctx.fill();

    // 3. Right Highlighted Facet
    ctx.fillStyle = '#e0e5eb';
    ctx.beginPath();
    ctx.moveTo(bx1, by1);
    ctx.lineTo(mx1, my1);
    ctx.lineTo(tx, ty);
    ctx.lineTo(snap(cosA * baseR), snap(sinA * baseR));
    ctx.closePath();
    ctx.fill();

    // 4. Specular Blade Spine & Sharp Tip
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(snap(cosA * (baseR + outerExtension * 0.7)), snap(sinA * (baseR + outerExtension * 0.7)), P, P);
    ctx.fillRect(tx - P / 2, ty - P / 2, P, P);
  }
}

/**
 * Draws rotating spikes around the fighter body in 1 fast drawImage call.
 */
export function drawSpikeWeapon(ctx, x, y, angle, r) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  const intR = Math.round(r);
  if (!_cachedSpikeWeaponCanvas || _cachedSpikeWeaponR !== intR) {
    const size = Math.ceil((intR + 32) * 2);
    _cachedSpikeWeaponCanvas = _createCanvas(size, size);
    if (_cachedSpikeWeaponCanvas) {
      const cctx = _cachedSpikeWeaponCanvas.getContext('2d');
      cctx.imageSmoothingEnabled = false;
      cctx.translate(size / 2, size / 2);
      _renderPixelSpikes(cctx, intR);
      _cachedSpikeWeaponR = intR;
    }
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (_cachedSpikeWeaponCanvas) {
    const half = _cachedSpikeWeaponCanvas.width / 2;
    ctx.drawImage(_cachedSpikeWeaponCanvas, -half, -half);
  }

  ctx.restore();
}

/**
 * Draws a single spike for use in other contexts (e.g., projectiles or effects).
 */
export function drawSingleSpike(ctx, x, y, angle, scale = 1.0) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.rotate(angle);

  const cfg = SPIKE_WEAPON_GRAPHICS;
  const innerOffset = cfg.positioning.innerOffset * scale;
  const outerExtension = cfg.positioning.outerExtension * scale;
  const spikeWidth = cfg.positioning.spikeWidth * scale;

  const base = snap(innerOffset);
  const tip = snap(base + outerExtension);
  const mid = snap(base + outerExtension * 0.45);
  const midW = snap(spikeWidth * 0.35);

  // Outer dark ink outline
  ctx.fillStyle = '#111114';
  ctx.beginPath();
  ctx.moveTo(base, snap(spikeWidth / 2 + 1.5));
  ctx.lineTo(mid, midW + 1.5);
  ctx.lineTo(tip + 2, 0);
  ctx.lineTo(mid, -midW - 1.5);
  ctx.lineTo(base, snap(-spikeWidth / 2 - 1.5));
  ctx.closePath();
  ctx.fill();

  // Bottom shaded facet
  ctx.fillStyle = '#5a626b';
  ctx.beginPath();
  ctx.moveTo(base, snap(-spikeWidth / 2));
  ctx.lineTo(mid, -midW);
  ctx.lineTo(tip, 0);
  ctx.lineTo(base, 0);
  ctx.closePath();
  ctx.fill();

  // Top bright facet
  ctx.fillStyle = '#e0e5eb';
  ctx.beginPath();
  ctx.moveTo(base, snap(spikeWidth / 2));
  ctx.lineTo(mid, midW);
  ctx.lineTo(tip, 0);
  ctx.lineTo(base, 0);
  ctx.closePath();
  ctx.fill();

  // Specular core line
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(snap(base + outerExtension * 0.6), -P / 2, snap(outerExtension * 0.3), P);

  ctx.restore();
}
