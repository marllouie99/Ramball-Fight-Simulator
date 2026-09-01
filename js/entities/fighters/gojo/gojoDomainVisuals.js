// ─────────────────────────────────────────────
// SATORU GOJO DOMAIN EXPANSION (UNLIMITED VOID / MURYŌKŪSHO)
// Pixel Art Domain Overlay Image Renderer (Assets/Overlays/gojo-domainexpansion.png)
// ─────────────────────────────────────────────
import { state } from '../../../core/state.js';

let _gojoDomainImg = null;
let _gojoDomainImgLoading = false;

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

// Preload immediately if running in browser
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getGojoDomainImage();
}

/**
 * Main Visual Renderer for Gojo's Domain Expansion (Unlimited Void / Muryōkūsho).
 * Renders Assets/Overlays/gojo-domainexpansion.png occupying the whole arena, clipped inside the arena bounds.
 * @param {object} fighter - The Gojo fighter instance
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
 * @param {boolean} isClashSecondary - Whether this domain is secondary in a domain clash
 */
export function renderGojoDomainBackground(fighter, ctx, isClashSecondary = false) {
  if (!fighter || !fighter.domainActive) return;

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
  ctx.fillStyle = '#000000';
  ctx.fillRect(ax, ay, aw, ah);

  // 3. Draw Gojo Domain Overlay Image occupying the whole arena
  const img = _getGojoDomainImage();
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling preserves crisp pixel art
    ctx.drawImage(img, ax, ay, aw, ah);
  }

  // 4. Black Overlay on top of image
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(ax, ay, aw, ah);

  ctx.restore();
}

