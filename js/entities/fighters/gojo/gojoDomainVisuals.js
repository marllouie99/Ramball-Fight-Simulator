// ─────────────────────────────────────────────
// SATORU GOJO & RUBBICK DOMAIN EXPANSION (UNLIMITED VOID / MURYŌKŪSHO)
// Pixel Art Domain Overlay Image Renderer (Assets/Overlays/gojo-domainexpansion.png)
// Supports Gojo (Cosmic Cyan/Blue) & Rubbick (Stolen Arcane Emerald Green)
// ─────────────────────────────────────────────
import { state } from '../../../core/state.js';

let _gojoDomainImg = null;
let _gojoDomainImgLoading = false;
let _rubbickDomainCanvas = null;
let _rubbickDomainCanvasReady = false;

/**
 * Preload and retrieve Gojo's pixel art domain expansion overlay image
 */
function _getGojoDomainImage() {
  if (_gojoDomainImg && _gojoDomainImg.complete && _gojoDomainImg.naturalWidth > 0) {
    return _gojoDomainImg;
  }
  if (!_gojoDomainImgLoading && typeof Image !== 'undefined') {
    _gojoDomainImgLoading = true;
    const img = new Image();
    img.onload = () => {
      _gojoDomainImg = img;
      _gojoDomainImgLoading = false;
      _buildRubbickDomainCanvas(img);
    };
    img.onerror = (e) => {
      console.warn('Failed to load Gojo domain overlay image at Assets/Overlays/gojo-domainexpansion.png', e);
      _gojoDomainImgLoading = false;
    };
    img.src = 'Assets/Overlays/gojo-domainexpansion.png';
    _gojoDomainImg = img;
  }
  return _gojoDomainImg;
}

/**
 * Pre-renders an Arcane Emerald Green version of Unlimited Void for Rubbick's stolen domain.
 * Transforms the cosmic cyan/sapphire palette into glowing emerald while preserving stars and depth.
 */
function _buildRubbickDomainCanvas(img) {
  if (typeof document === 'undefined' || !img || !img.naturalWidth || !img.naturalHeight) return null;
  if (_rubbickDomainCanvasReady && _rubbickDomainCanvas) return _rubbickDomainCanvas;

  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a === 0) continue;

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;

      if (lum < 6) {
        // Deep space void: pitch black with tiny hint of dark forest
        data[i] = 1;
        data[i + 1] = Math.min(10, Math.round(lum * 0.8));
        data[i + 2] = 2;
      } else if (lum > 220 && sat < 0.22) {
        // Brilliant white/mint stars and cosmic core glints
        data[i] = Math.round(r * 0.82 + 200 * 0.18);
        data[i + 1] = 255;
        data[i + 2] = Math.round(b * 0.82 + 220 * 0.18);
      } else {
        // Cosmic nebulae, event horizon rings, celestial eye filaments:
        // Map luminance smoothly to vibrant Arcane Emerald (#00FF64 / #00CC50 / #059669 / #80FFB0)
        const t = Math.min(1.0, Math.max(0, lum / 255));
        let newR, newG, newB;
        if (t < 0.45) {
          const factor = t / 0.45;
          // Deep arcane jade shadow -> rich emerald
          newR = Math.round(0 * (1 - factor) + 0 * factor);
          newG = Math.round(30 * (1 - factor) + 220 * factor);
          newB = Math.round(12 * (1 - factor) + 75 * factor);
        } else if (t < 0.82) {
          const factor = (t - 0.45) / 0.37;
          // Rich emerald -> Neon Arcane Green (#00FF64)
          newR = Math.round(0 * (1 - factor) + 20 * factor);
          newG = Math.round(220 * (1 - factor) + 255 * factor);
          newB = Math.round(75 * (1 - factor) + 110 * factor);
        } else {
          const factor = (t - 0.82) / 0.18;
          // Neon Arcane Green -> Mint highlight (#E0FFF0)
          newR = Math.round(20 * (1 - factor) + 224 * factor);
          newG = Math.round(255 * (1 - factor) + 255 * factor);
          newB = Math.round(110 * (1 - factor) + 240 * factor);
        }

        data[i] = newR;
        data[i + 1] = newG;
        data[i + 2] = newB;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    _rubbickDomainCanvas = canvas;
    _rubbickDomainCanvasReady = true;
    return _rubbickDomainCanvas;
  } catch (err) {
    console.warn('Failed to build Rubbick green domain canvas:', err);
    return null;
  }
}

/**
 * Retrieve the green-tinted Unlimited Void domain image/canvas for Rubbick
 */
function _getRubbickDomainImage() {
  if (_rubbickDomainCanvasReady && _rubbickDomainCanvas) {
    return _rubbickDomainCanvas;
  }
  const baseImg = _getGojoDomainImage();
  if (baseImg && baseImg.complete && baseImg.naturalWidth > 0) {
    return _buildRubbickDomainCanvas(baseImg) || baseImg;
  }
  return null;
}

// Preload immediately if running in browser
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getGojoDomainImage();
}

/**
 * Main Visual Renderer for Gojo & Rubbick Domain Expansion (Unlimited Void / Muryōkūsho).
 * Renders the pixel art domain overlay occupying the whole arena, clipped inside the arena bounds.
 * Supports standard Gojo cyan and Rubbick emerald green.
 * @param {object} fighter - The Gojo or Rubbick fighter instance
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
 * @param {boolean} isClashSecondary - Whether this domain is secondary in a domain clash
 * @param {object} [options={}] - Custom options (e.g. { isRubbick: true, colorTheme: 'green' })
 */
export function renderGojoDomainBackground(fighter, ctx, isClashSecondary = false, options = {}) {
  const isRubbick = Boolean(
    options.isRubbick ||
    options.colorTheme === 'green' ||
    (fighter && (fighter.characterId === 'rubbick' || fighter.type === 'rubbick' || fighter.stolenDomainActive || fighter.stolenType === 'gojo_domain'))
  );

  const isActive = fighter && (fighter.domainActive || fighter.stolenDomainActive);
  if (!isActive) return;

  const arena = state.arena;
  if (!arena) return;

  const ax = arena.x;
  const ay = arena.y;
  const aw = arena.width;
  const ah = arena.height;
  const ww = arena.wallWidth || 4;

  ctx.save();

  // 1. Clip strictly inside the arena bounds
  ctx.beginPath();
  if (arena.shape === 'circle') {
    const acx = arena.x + arena.width / 2;
    const acy = arena.y + arena.height / 2;
    const ar = (arena.radius !== undefined ? arena.radius : (arena.width / 2)) - ww;
    ctx.arc(acx, acy, Math.max(0, ar), 0, Math.PI * 2);
  } else {
    ctx.rect(ax + ww, ay + ww, aw - ww * 2, ah - ww * 2);
  }
  ctx.clip();

  if (isClashSecondary) {
    ctx.globalAlpha = 0.75;
  }

  // 2. Base Dark Cosmic Background
  ctx.fillStyle = isRubbick ? '#011106' : '#000000';
  ctx.fillRect(ax, ay, aw, ah);

  // 3. Draw Domain Overlay Image occupying the whole arena
  const img = isRubbick ? _getRubbickDomainImage() : _getGojoDomainImage();
  if (img && (img.complete || img.width > 0)) {
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling preserves crisp pixel art
    ctx.drawImage(img, ax, ay, aw, ah);
  } else if (isRubbick) {
    // Procedural Emerald Cosmic Nebula fallback while asset initializes
    const cx = ax + aw / 2;
    const cy = ay + ah / 2;
    const maxR = Math.max(aw, ah) * 0.6;
    const nebulaGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
    nebulaGrad.addColorStop(0, 'rgba(0, 255, 100, 0.45)');
    nebulaGrad.addColorStop(0.3, 'rgba(0, 180, 70, 0.30)');
    nebulaGrad.addColorStop(0.65, 'rgba(0, 60, 25, 0.20)');
    nebulaGrad.addColorStop(1, 'rgba(1, 17, 6, 0.0)');
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(ax, ay, aw, ah);
  }

  // 4. Dark Overlay on top of image
  ctx.fillStyle = isRubbick ? 'rgba(0, 20, 8, 0.40)' : 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(ax, ay, aw, ah);

  ctx.restore();
}

/**
 * Dedicated visual renderer for Rubbick's stolen Unlimited Void domain (Arcane Emerald Green)
 */
export function renderRubbickDomainBackground(fighter, ctx, isClashSecondary = false) {
  return renderGojoDomainBackground(fighter, ctx, isClashSecondary, { isRubbick: true, colorTheme: 'green' });
}

