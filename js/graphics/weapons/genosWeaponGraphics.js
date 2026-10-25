import { CONFIG } from '../../core/config.js';

/**
 * Genos Weapon & Ultimate Graphics Renderer: Spiral Incineration Cannon
 * 16-bit 12-Frame Animated Mega-Beam Sprite Strip Renderer
 * Master strip path: Assets/model/genos/spiral_incineration_cannon/spiral_incineration_cannon-b.png
 * Geometry: 12 frames, each 900x384px, centered at y=192px with seamless root nozzle and thick white-hot core.
 */

const FRAME_COUNT = 12;
const FRAME_WIDTH = 800;
const FRAME_HEIGHT = 384;
const BEAM_BODY_HEIGHT = 180; // Calibrated core body height in the 384px frame

let _genosSpiralCannonStrip = null;
let _genosSpiralCannonLoading = false;

/**
 * Eagerly loads and caches the 12-frame master horizontal strip.
 * @returns {HTMLImageElement|null}
 */
export function _getGenosSpiralCannonStrip() {
  if (_genosSpiralCannonStrip && _genosSpiralCannonStrip.complete && _genosSpiralCannonStrip.naturalWidth > 0) {
    return _genosSpiralCannonStrip;
  }
  if (!_genosSpiralCannonLoading && typeof Image !== 'undefined') {
    _genosSpiralCannonLoading = true;
    const img = new Image();
    img.onload = () => {
      _genosSpiralCannonStrip = img;
      _genosSpiralCannonLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Genos Spiral Incineration Cannon strip:', e);
      _genosSpiralCannonLoading = false;
    };
    img.src = 'Assets/model/genos/spiral_incineration_cannon/spiral_incineration_cannon-b.png';
    _genosSpiralCannonStrip = img;
  }
  return _genosSpiralCannonStrip;
}

// Proactive eager initialization in browser environment
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getGenosSpiralCannonStrip();
}

/**
 * Calculates current 0-indexed frame index based on active firing progression.
 * @param {object} fighter
 * @param {number} now - High-res timestamp
 * @returns {number} frameIndex [0..11]
 */
function _getSpiralCannonFrameIndex(fighter, now) {
  const totalDuration = CONFIG.genos?.ultDurationFrames || 150;
  const ticksPerFrame = CONFIG.genos?.ultBeamSpriteTicksPerFrame || 3;

  if (fighter && typeof fighter.ultTimer === 'number' && fighter.isFiringUlt) {
    const timeFired = Math.max(0, totalDuration - fighter.ultTimer);
    return Math.floor(timeFired / ticksPerFrame) % FRAME_COUNT;
  }
  return Math.floor((now / (ticksPerFrame * 16.67)) % FRAME_COUNT);
}

/**
 * Renders the 16-bit 12-frame animated Spiral Incineration Cannon sprite.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} fighter
 * @param {number} beamAngle
 * @param {number} startX
 * @param {number} startY
 * @param {number} range - Full beam reach (e.g. 1200px)
 * @param {number} beamW - Beam target visual width (e.g. 130px)
 * @param {number} now
 */
export function drawGenosAnimatedSpiralCannonSprite(ctx, fighter, beamAngle, startX, startY, range, beamW, now) {
  const strip = _getGenosSpiralCannonStrip();
  const frameIndex = _getSpiralCannonFrameIndex(fighter, now);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(startX, startY);
  ctx.rotate(beamAngle);

  if (strip && strip.complete && strip.naturalWidth > 0) {
    const sx = frameIndex * FRAME_WIDTH;
    const sy = 0;
    const sWidth = FRAME_WIDTH;
    const sHeight = FRAME_HEIGHT;

    // Scale drawing height to match target beamW while preserving vertical padding proportion
    const drawH = Math.round((beamW / BEAM_BODY_HEIGHT) * FRAME_HEIGHT);
    const drawY = -Math.round(drawH * 0.5);
    const drawW = Math.round(range);

    ctx.drawImage(strip, sx, sy, sWidth, sHeight, 0, drawY, drawW, drawH);
  } else {
    // Graceful procedural plasma fallback while image is loading
    _drawSpiralCannonFallback(ctx, range, beamW);
  }

  ctx.restore();
}

/**
 * Fallback procedural plasma beam rendered only if asset is still loading.
 */
function _drawSpiralCannonFallback(ctx, range, beamW) {
  const halfW = Math.round(beamW * 0.5);
  // Outer crimson
  ctx.fillStyle = '#CC2A00';
  ctx.fillRect(0, -halfW, range, halfW * 2);
  // Inner orange
  ctx.fillStyle = '#FF5500';
  ctx.fillRect(0, -Math.round(halfW * 0.65), range, Math.round(halfW * 1.3));
  // Solar gold
  ctx.fillStyle = '#FFE600';
  ctx.fillRect(0, -Math.round(halfW * 0.35), range, Math.round(halfW * 0.7));
  // Blazing white hot core
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, -Math.round(halfW * 0.15), range, Math.round(halfW * 0.3));
}

/**
 * Primary export entry point for Genos's Ultimate Beam rendering.
 */
export function drawGenosSpiralIncinerationCannon(ctx, fighter, beamAngle, startX, startY, range, beamW, now) {
  drawGenosAnimatedSpiralCannonSprite(ctx, fighter, beamAngle, startX, startY, range, beamW, now);
}
