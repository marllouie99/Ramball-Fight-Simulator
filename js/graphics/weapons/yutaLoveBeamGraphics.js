// ─────────────────────────────────────────────
// Yuta Okkotsu — Pure Love Beam 12-Frame Animation & VFX Module
// Jujutsu Kaisen 0 Authentic Celestial Mega-Beam
// Adheres strictly to:
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 2.4 (Canvas 2D Transform Stack Integrity)
// - Rule 26 (Clean Concentric Shockwave & Wavefront Standard)
// - Skill twelve-frame-animation-generator (Assets/model/yuta/Love_beam/)
// ─────────────────────────────────────────────

import { CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';

const YUTA_LOVE_BEAM_FRAME_COUNT = 12;
const YUTA_LOVE_BEAM_FRAME_PATHS = Array.from(
  { length: 12 },
  (_, i) => `Assets/model/yuta/Love_beam/Love_beam-${i + 1}.png`
);

let _yutaLoveBeamFrames = [];
let _yutaLoveBeamFramesLoading = false;

/**
 * Preloads and caches the 12-frame Pure Love Beam active animation sequence.
 * @returns {HTMLImageElement[]}
 */
export function _getYutaLoveBeamFrames() {
  if (
    _yutaLoveBeamFrames.length === YUTA_LOVE_BEAM_FRAME_COUNT &&
    _yutaLoveBeamFrames.every(img => img && img.complete && (img.naturalWidth || img.width || 0) > 0)
  ) {
    return _yutaLoveBeamFrames;
  }
  if (!_yutaLoveBeamFramesLoading && typeof Image !== 'undefined') {
    _yutaLoveBeamFramesLoading = true;
    _yutaLoveBeamFrames = [];
    YUTA_LOVE_BEAM_FRAME_PATHS.forEach((src, idx) => {
      const img = new Image();
      img.onload = () => {
        _yutaLoveBeamFrames[idx] = img;
      };
      img.onerror = (e) => {
        console.warn(`Failed to load Yuta Love Beam frame ${idx + 1} at ${src}:`, e);
      };
      img.src = `${src}?v=6`;
      _yutaLoveBeamFrames[idx] = img;
    });
  }
  return _yutaLoveBeamFrames;
}

const YUTA_LOVE_BEAM_OUT_FRAME_COUNT = 12;
const YUTA_LOVE_BEAM_OUT_FRAME_PATHS = Array.from(
  { length: 12 },
  (_, i) => `Assets/model/yuta/love_beam_out/love_beam_out-${i + 1}.png`
);

let _yutaLoveBeamOutFrames = [];
let _yutaLoveBeamOutFramesLoading = false;

/**
 * Preloads and caches the 12-frame Pure Love Beam Out dissipation animation sequence.
 * @returns {HTMLImageElement[]}
 */
export function _getYutaLoveBeamOutFrames() {
  if (
    _yutaLoveBeamOutFrames.length === YUTA_LOVE_BEAM_OUT_FRAME_COUNT &&
    _yutaLoveBeamOutFrames.every(img => img && img.complete && (img.naturalWidth || img.width || 0) > 0)
  ) {
    return _yutaLoveBeamOutFrames;
  }
  if (!_yutaLoveBeamOutFramesLoading && typeof Image !== 'undefined') {
    _yutaLoveBeamOutFramesLoading = true;
    _yutaLoveBeamOutFrames = [];
    YUTA_LOVE_BEAM_OUT_FRAME_PATHS.forEach((src, idx) => {
      const img = new Image();
      img.onload = () => {
        _yutaLoveBeamOutFrames[idx] = img;
      };
      img.onerror = (e) => {
        console.warn(`Failed to load Yuta Love Beam Out frame ${idx + 1} at ${src}:`, e);
      };
      img.src = `${src}?v=6`;
      _yutaLoveBeamOutFrames[idx] = img;
    });
  }
  return _yutaLoveBeamOutFrames;
}

const YUTA_LOVE_BEAM_WINDUP_FRAME_COUNT = 12;
const YUTA_LOVE_BEAM_WINDUP_FRAME_PATHS = Array.from(
  { length: 12 },
  (_, i) => `Assets/model/yuta/Love_beam_windup/Love_beam_windup-${i + 1}.png`
);

let _yutaLoveBeamWindupFrames = [];
let _yutaLoveBeamWindupFramesLoading = false;

/**
 * Preloads and caches the 12-frame Pure Love Beam wind-up animation sequence.
 * @returns {HTMLImageElement[]}
 */
export function _getYutaLoveBeamWindupFrames() {
  if (
    _yutaLoveBeamWindupFrames.length === YUTA_LOVE_BEAM_WINDUP_FRAME_COUNT &&
    _yutaLoveBeamWindupFrames.every(img => img && img.complete && (img.naturalWidth || img.width || 0) > 0)
  ) {
    return _yutaLoveBeamWindupFrames;
  }
  if (!_yutaLoveBeamWindupFramesLoading && typeof Image !== 'undefined') {
    _yutaLoveBeamWindupFramesLoading = true;
    _yutaLoveBeamWindupFrames = [];
    YUTA_LOVE_BEAM_WINDUP_FRAME_PATHS.forEach((src, idx) => {
      const img = new Image();
      img.onload = () => {
        _yutaLoveBeamWindupFrames[idx] = img;
      };
      img.onerror = (e) => {
        console.warn(`Failed to load Yuta Love Beam Windup frame ${idx + 1} at ${src}:`, e);
      };
      img.src = `${src}?v=6`;
      _yutaLoveBeamWindupFrames[idx] = img;
    });
  }
  return _yutaLoveBeamWindupFrames;
}

// Proactive eager initialization in browser environment
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getYutaLoveBeamFrames();
  _getYutaLoveBeamOutFrames();
  _getYutaLoveBeamWindupFrames();
}

/**
 * Draws Yuta's Pure Love Beam using the authentic 12-frame animated sprite sequence.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} p Projectile data
 */
export function drawYutaPureLoveBeam(ctx, p) {
  if (!p) return;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);

  const length = p.length || (CONFIG?.yuta?.pureLoveBeamLength) || 2500;
  const configuredWidth = p.r || (CONFIG?.yuta?.pureLoveBeamWidth) || 200;
  const P = 4.0; // Pixel art unit grid

  let beamAlpha = 0.95;
  let sizeScale = 1.0;
  if (p.life < 30) {
    beamAlpha = Math.max(0, (p.life / 30) * 0.95);
    sizeScale = Math.max(0, p.life / 30);
  }

  const isDissipating = (p.life < 24);
  let frames, frameIndex;

  if (isDissipating) {
    frames = _getYutaLoveBeamOutFrames();
    const progress = 1.0 - Math.max(0, p.life / 24);
    frameIndex = Math.min(11, Math.max(0, Math.floor(progress * 12)));
  } else {
    frames = _getYutaLoveBeamFrames();
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    frameIndex = Math.floor((now / 45) % 12);
  }

  const currentFrame = frames[frameIndex];
  const hasValidFrame = Boolean(currentFrame && currentFrame.complete && ((currentFrame.naturalWidth || currentFrame.width || 0) > 0));

  ctx.globalAlpha = beamAlpha;

  if (hasValidFrame) {
    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;

    // Sprite calibration (640x440 full uncropped frame with generous transparent padding)
    // Centerline is at y=220 (exactly 440/2) with zero pixels touching top, bottom, or left borders.
    // Target core width scales directly and dynamically with CONFIG.yuta.pureLoveBeamWidth (p.r):
    const targetCoreWidth = Math.max(16, configuredWidth * 0.70) * sizeScale;
    const shaftDrawH = targetCoreWidth / 0.159; // Scales frame height proportionally to pureLoveBeamWidth
    const shaftScale = shaftDrawH / 440.0;

    // ── 1. ATMOSPHERIC AMBIENT ENERGY AURA (Back Layer) ──
    const auraH = targetCoreWidth * 1.30;
    const auraGrad = ctx.createLinearGradient(0, -auraH, 0, auraH);
    auraGrad.addColorStop(0, 'rgba(255, 20, 147, 0.0)');
    auraGrad.addColorStop(0.25, 'rgba(255, 105, 180, 0.15)');
    auraGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.28)');
    auraGrad.addColorStop(0.75, 'rgba(255, 105, 180, 0.15)');
    auraGrad.addColorStop(1, 'rgba(255, 20, 147, 0.0)');

    // Semicircular rounded cap at origin + beam shaft (ZERO flat rectangular cuts)
    ctx.beginPath();
    ctx.arc(0, 0, auraH, Math.PI / 2, -Math.PI / 2, false);
    ctx.lineTo(length, -auraH);
    ctx.lineTo(length, auraH);
    ctx.closePath();
    ctx.fillStyle = auraGrad;
    ctx.fill();

    // Soft radial aura bloom at origin around Yuta's hands
    const originBloom = ctx.createRadialGradient(0, 0, 0, 0, 0, auraH * 1.15);
    originBloom.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    originBloom.addColorStop(0.4, 'rgba(255, 105, 180, 0.20)');
    originBloom.addColorStop(1, 'rgba(255, 20, 147, 0.0)');
    ctx.fillStyle = originBloom;
    ctx.beginPath();
    ctx.arc(0, 0, auraH * 1.15, 0, Math.PI * 2);
    ctx.fill();

    // ── 2. CONTINUOUS STREAM OF ANIMATED BEAM SHAFT BODIES (x=300..620) ──
    // Clean horizontal energy stream with generous vertical transparent padding (zero box edges)
    const shaftSrcX = 300;
    const shaftSrcW = 320;
    const shaftSrcH = 440;
    const shaftDrawW = shaftSrcW * shaftScale * 0.90;

    const numSegments = Math.max(1, Math.ceil(length / (shaftDrawW - 4)));
    for (let s = 0; s < numSegments; s++) {
      const segFrame = isDissipating ? currentFrame : (frames[(frameIndex + s * 2) % 12] || currentFrame);
      const segX = s * (shaftDrawW - 4);
      ctx.drawImage(
        segFrame,
        shaftSrcX, 0, shaftSrcW, shaftSrcH,
        segX, -shaftDrawH / 2, shaftDrawW, shaftDrawH
      );
    }

    // ── 3. MUZZLE ACCELERATOR & CHARGING PORTAL (At Origin, Drawn ONCE) ──
    // Full uncropped energy orb and accelerator swirl centered directly at Yuta's hands
    const portalSrcW = 300;
    const portalSrcH = 440;
    const portalScale = (targetCoreWidth * 2.50) / portalSrcH;
    const portalDrawW = portalSrcW * portalScale;
    const portalDrawH = portalSrcH * portalScale;
    const portalOriginX = 188 * portalScale;
    const portalOriginY = portalDrawH / 2;
    ctx.drawImage(
      currentFrame,
      0, 0, portalSrcW, portalSrcH,
      -portalOriginX, -portalOriginY, portalDrawW, portalDrawH
    );

    // ── 4. JAGGED CELESTIAL ELECTRIC BOLTS & EMBERS ──
    if (!isDissipating) {
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      _drawLoveBeamLightning(ctx, length, targetCoreWidth * 0.65, now, P);
      _drawLoveBeamEmbers(ctx, length, targetCoreWidth * 0.65, now);
    }

    // ── 5. MUZZLE CORE GLINT (Blinding Diamond Center Spark at Hands) ──
    const coreR = Math.max(4, Math.round(10 * sizeScale));
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 20, 147, 0.50)';
    ctx.beginPath();
    ctx.arc(0, 0, coreR * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.imageSmoothingEnabled = prevSmoothing;
  } else {
    // Procedural Fallback if assets are loading
    _drawProceduralLoveBeamFallback(ctx, length, configuredWidth, sizeScale, beamAlpha, P);
  }

  ctx.restore();
}

/**
 * Draws streaming electric lightning bolts along the Love Beam.
 */
function _drawLoveBeamLightning(ctx, length, radius, now, P) {
  const stepCount = 14;
  const stepLen = length / stepCount;
  const timeStep = Math.floor(now / 50);

  const pseudoRand = (seed) => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 4; i++) {
    const side = (i % 2 === 0 ? -1 : 1);
    const seed = timeStep * 37 + i * 53;
    ctx.fillStyle = (pseudoRand(seed) > 0.4) ? '#FFFFFF' : '#FF1493';

    for (let s = 0; s < stepCount; s++) {
      const prog = s / stepCount;
      const spreadY = side * (radius * 0.45) * (0.8 + (i % 2) * 0.3);
      const jag = (pseudoRand(seed + s * 17) - 0.5) * (15 + prog * 25);
      const lx = Math.round((s * stepLen) / P) * P;
      const ly = Math.round((spreadY + jag) / P) * P;
      ctx.fillRect(lx, ly, P * 1.5, P * 1.5);
    }
  }
}

/**
 * Draws streaming spark particles travelling forward along the Love Beam.
 */
function _drawLoveBeamEmbers(ctx, length, radius, now) {
  const emberCount = 24;
  const timeStep = Math.floor(now / 40);

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  for (let i = 0; i < emberCount; i++) {
    const seed = i * 47.11;
    const emberX = ((timeStep * 24 + seed * 90) % length);
    const spreadY = (Math.sin(timeStep * 0.15 + i) * radius * 0.65);
    const emberR = 1.5 + (i % 3) * 0.8;
    ctx.moveTo(emberX + emberR, spreadY);
    ctx.arc(emberX, spreadY, emberR, 0, Math.PI * 2);
  }
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 20, 147, 0.85)';
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const seed = (i + 31) * 33.7;
    const emberX = ((timeStep * 30 + seed * 75) % length);
    const spreadY = (Math.cos(timeStep * 0.18 + i * 2) * radius * 0.80);
    const emberR = 2.0 + (i % 2) * 1.0;
    ctx.moveTo(emberX + emberR, spreadY);
    ctx.arc(emberX, spreadY, emberR, 0, Math.PI * 2);
  }
  ctx.fill();
}

/**
 * Procedural fallback renderer when sprite assets are still loading.
 */
function _drawProceduralLoveBeamFallback(ctx, length, radius, sizeScale, beamAlpha, P) {
  const currentRadius = radius * sizeScale;
  const startBaseR = currentRadius * 0.35;
  const endBaseR = currentRadius * 1.8;
  const colStep = P * 2;

  ctx.globalAlpha = beamAlpha;
  for (let x = 0; x <= length; x += colStep) {
    const prog = x / length;
    const curR = startBaseR + (endBaseR - startBaseR) * prog;
    const px = Math.round(x / P) * P;
    const pw = colStep;

    // Pitch-black manga shell
    const outH = Math.round((curR + P * 2) / P) * P;
    ctx.fillStyle = '#0E0F14';
    ctx.fillRect(px, -outH, pw, outH * 2);

    // Deep celestial magenta/purple
    const deepH = Math.round(curR / P) * P;
    ctx.fillStyle = '#8B008B';
    ctx.fillRect(px, -deepH, pw, deepH * 2);

    // Bright hot pink energy
    const brightH = Math.round((curR * 0.75) / P) * P;
    ctx.fillStyle = '#FF1493';
    ctx.fillRect(px, -brightH, pw, brightH * 2);

    // White core spine
    const whiteH = Math.round((curR * 0.28) / P) * P;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(px, -whiteH, pw, Math.max(P, whiteH * 2));
  }
}

/**
 * Draws Yuta's Pure Love Beam 12-frame wind-up / charge gathering animation.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x Center X coordinate
 * @param {number} y Center Y coordinate
 * @param {number} [angle=0] Rotation angle (radians)
 * @param {number} [progress=0] Charge progress from 0.0 to 1.0
 * @param {number} [radius=95] Target visual radius
 * @param {number} [alpha=1.0] Opacity multiplier
 */
export function drawYutaLoveBeamWindup(ctx, x, y, angle = 0, progress = 0, radius = 95, alpha = 1.0) {
  if (!ctx || alpha <= 0) return;

  ctx.save();
  ctx.translate(x, y);
  if (angle !== 0) {
    ctx.rotate(angle);
  }

  const frames = _getYutaLoveBeamWindupFrames();
  const clampedProgress = Math.min(1.0, Math.max(0.0, progress));
  const frameIndex = Math.min(11, Math.max(0, Math.floor(clampedProgress * 12)));
  const currentFrame = frames[frameIndex];
  const hasValidFrame = Boolean(currentFrame && currentFrame.complete && ((currentFrame.naturalWidth || currentFrame.width || 0) > 0));

  ctx.globalAlpha *= alpha;

  const P = 2.4;
  if (hasValidFrame) {
    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;

    // Windup sprite frame is 256x256 with condensation centroid calibrated at (128, 128)
    const dynamicScale = 0.55 + 0.45 * clampedProgress;
    const scale = (radius * 2.0 / 256.0) * dynamicScale;
    const drawSize = 256 * scale;

    ctx.drawImage(
      currentFrame,
      0, 0, 256, 256,
      -drawSize / 2, -drawSize / 2, drawSize, drawSize
    );

    // Subtle celestial ionization glint at the focal center (Rule 11 compliant: no shadowBlur)
    const coreR = Math.max(2, Math.round(drawSize * 0.07));
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 20, 147, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, coreR * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.imageSmoothingEnabled = prevSmoothing;
  } else {
    _drawProceduralWindupFallback(ctx, radius, clampedProgress, P);
  }

  ctx.restore();
}

/**
 * Procedural fallback for wind-up when sprite frames are loading.
 */
function _drawProceduralWindupFallback(ctx, radius, progress, P) {
  const r = Math.max(P, radius * (0.3 + 0.7 * progress));

  // Concentric supersonic condensation ring
  ctx.strokeStyle = '#FF69B4';
  ctx.lineWidth = P;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Magenta cursed energy boundary
  ctx.strokeStyle = '#FF1493';
  ctx.lineWidth = P * 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
  ctx.stroke();

  // Center white spark
  const coreR = Math.max(P, r * 0.35);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-coreR / 2, -coreR / 2, coreR, coreR);
}
