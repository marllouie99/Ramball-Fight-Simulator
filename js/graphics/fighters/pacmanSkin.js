// ═══════════════════════════════════════════════════════════════════════════
// PAC-MAN (Namco / Retro Arcade Legend) — Character Skin Renderer
// ═══════════════════════════════════════════════════════════════════════════

import { state } from '../../core/state.js';
import { getHandSize } from '../../core/config.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

let _pacmanHairImage = null;
let _pacmanGhostImage = null;
let _pacmanGhostFlashImage = null;

/**
 * Rule 22: Module-Level Dedicated Hair Asset Loader for Pac-Man.
 */
export function _getPacmanHairImage() {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return null;
  if (!_pacmanHairImage) {
    _pacmanHairImage = new Image();
    _pacmanHairImage.src = 'Assets/model/pacman/Pacman-hair.png';
  }
  return _pacmanHairImage;
}

/**
 * Dedicated Asset Loader for Frightened Blue Ghost.
 */
export function _getPacmanGhostImage() {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return null;
  if (!_pacmanGhostImage) {
    _pacmanGhostImage = new Image();
    _pacmanGhostImage.src = 'Assets/model/pacman/pacman-ghost.png';
  }
  return _pacmanGhostImage;
}

/**
 * Dedicated Asset Loader for Flashing White/Red Frightened Ghost.
 */
export function _getPacmanGhostFlashImage() {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return null;
  if (!_pacmanGhostFlashImage) {
    _pacmanGhostFlashImage = new Image();
    _pacmanGhostFlashImage.src = 'Assets/model/pacman/pacman-ghost-flash.png';
  }
  return _pacmanGhostFlashImage;
}

// Proactive eager initialization
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getPacmanHairImage();
  _getPacmanGhostImage();
  _getPacmanGhostFlashImage();
}

const GHOST_FRAME_0 = [
  '.....BBBB.....',
  '...BBBBBBBB...',
  '..BBBBBBBBBB..',
  '.BBBBBBBBBBBB.',
  '.BBBWWBBWWBBB.',
  'BBBBWWBBWWBBBB',
  'BBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBB',
  'BBWWBBWWBBWWBB',
  'BWBBWWBBWWBBWB',
  'BBBBBBBBBBBBBB',
  'BB.BBB..BBB.BB',
  'B...BB..BB...B',
];

const GHOST_FRAME_1 = [
  '.....BBBB.....',
  '...BBBBBBBB...',
  '..BBBBBBBBBB..',
  '.BBBBBBBBBBBB.',
  '.BBBWWBBWWBBB.',
  'BBBBWWBBWWBBBB',
  'BBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBB',
  'BBWWBBWWBBWWBB',
  'BWBBWWBBWWBBWB',
  'BBBBBBBBBBBBBB',
  '.BB.BB..BB.BB.',
  '..BB......BB..',
];

function _drawProceduralGhost(ctx, r, isFlashing, animTick = 0) {
  const bodyColor = isFlashing ? '#FFFFFF' : '#150FF7';
  const faceColor = isFlashing ? '#EF4444' : '#FFFFFF';
  const cellSize = (r * 2.3) / 14;
  const startX = -7 * cellSize;
  const startY = -7 * cellSize;
  const walkFrame = Math.floor(animTick * 0.15) % 2 === 0 ? GHOST_FRAME_0 : GHOST_FRAME_1;

  for (let row = 0; row < 14; row++) {
    const line = walkFrame[row];
    for (let col = 0; col < 14; col++) {
      const ch = line[col];
      if (ch === '.') continue;
      ctx.fillStyle = ch === 'B' ? bodyColor : faceColor;
      ctx.fillRect(startX + col * cellSize, startY + row * cellSize, cellSize + 0.5, cellSize + 0.5);
    }
  }
}

/**
 * Renders the classic retro arcade frightened ghost when transformed by Pac-Man's Power Pellet.
 * Adheres to authentic Pac-Man aesthetics: blue body with white face,
 * animated waddling skirt waves, and flashing white/red during the final countdown warning frames.
 */
export function drawPacmanFrightenedGhost(ctx, fighter) {
  if (!ctx || !fighter) return;
  const r = fighter.r || 25;
  const timer = fighter.pacmanGhostTimer || 0;
  const isFlashing = timer < 90 && Math.floor(timer / 10) % 2 === 1;

  ctx.save();
  ctx.translate(fighter.x || 0, (fighter.y || 0) - (fighter.z || 0));

  // Subtle floating hover bob (2-3px)
  const animTick = (typeof state !== 'undefined' && state.frameCount) ? state.frameCount : (Date.now() * 0.05);
  const bob = Math.sin(animTick * 0.18) * 2.5;
  ctx.translate(0, bob);

  const img = isFlashing ? _getPacmanGhostFlashImage() : _getPacmanGhostImage();
  const drawW = r * 2.3;
  const drawH = r * 2.3;
  const drawX = -drawW * 0.5;
  const drawY = -drawH * 0.5;

  if (img && img.complete && img.naturalWidth > 0 && Math.floor(animTick * 0.15) % 2 === 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    _drawProceduralGhost(ctx, r, isFlashing, animTick);
  }

  ctx.restore();
}

/**
 * Rule 22: Renders Pac-Man's dedicated headband / arcade top asset on Layer 2.
 */
export function _drawPacmanHair(ctx, r, facingLeft = false) {
  const img = _getPacmanHairImage();
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const userCustom = state.skinCustomizations?.pacman;
  const hairScale = (userCustom?.hairScale ?? 1.0);
  const hairOffsetX = (userCustom?.hairOffsetX ?? 0);
  const hairOffsetY = (userCustom?.hairOffsetY ?? 0);
  const hairRotation = (userCustom?.hairRotation ?? 0);

  const drawW = r * 1.60 * hairScale;
  const drawH = r * 0.85 * hairScale;
  const drawX = -drawW * 0.5 + hairOffsetX;
  const drawY = -r * 1.05 + hairOffsetY;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (hairRotation !== 0) {
    ctx.rotate((hairRotation * Math.PI) / 180);
  }
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
}

let _cachedPacmanCanvases = new Map();

/**
 * 8-Bit Arcade Pac-Man Body Rasterizer:
 * Renders the iconic 8-bit Pac-Man matching the canonical arcade reference:
 * - Solid vibrant yellow circular body
 * - Discrete solid black dot eye positioned above the mouth corner (Rule 32)
 * - Dynamic animated mouth wedge aperture
 * - Crisp 4-neighbor manga ink outline (#0E0F14) surrounding the perimeter & lining mouth jaws
 */
function _renderPacmanFrame(destCtx, intR, mouthHalfAngle, bodyColor = '#F2F000', isOffscreen = true) {
  const r = intR;
  const P = 2.0;
  const steps = Math.ceil((r + P) / P);

  destCtx.save();
  if (isOffscreen && destCtx.canvas) {
    destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);
  }
  destCtx.imageSmoothingEnabled = false;

  const OUTLINE = '#0E0F14';
  const EYE_COLOR = '#0E0F14';

  // Eye geometry calibrated to uploaded reference (solid black circular pixel dot above mouth apex)
  const eyeX = r * 0.18;
  const eyeY = -r * 0.38;
  const eyeR = r * 0.11;
  const apexX = r * 0.08;
  const isMouthClosed = mouthHalfAngle < 0.08;

  function isBodyPixel(x, y) {
    if (Math.hypot(x, y) > r) return false;
    if (!isMouthClosed && x >= apexX && Math.abs(Math.atan2(y, x - apexX)) < mouthHalfAngle) return false;
    return true;
  }

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;

      if (!isBodyPixel(rx, ry)) continue;

      // 4-neighbor boundary test for authentic 8-bit black manga outline (Rule 24 & Rule 32)
      const isBorder =
        !isBodyPixel((gx + 1) * P, ry) ||
        !isBodyPixel((gx - 1) * P, ry) ||
        !isBodyPixel(rx, (gy + 1) * P) ||
        !isBodyPixel(rx, (gy - 1) * P);

      if (isBorder) {
        destCtx.fillStyle = OUTLINE;
        destCtx.fillRect(rx - P / 2, ry - P / 2, P, P);
        continue;
      }

      // Solid black circular dot eye
      const isEye = Math.hypot(rx - eyeX, ry - eyeY) <= eyeR;
      if (isEye) {
        destCtx.fillStyle = EYE_COLOR;
        destCtx.fillRect(rx - P / 2, ry - P / 2, P, P);
        continue;
      }

      // Pure iconic yellow body fill
      destCtx.fillStyle = bodyColor;
      destCtx.fillRect(rx - P / 2, ry - P / 2, P, P);
    }
  }

  destCtx.restore();
}

/**
 * Gets or creates the cached offscreen canvas for an 8-bit Pac-Man mouth animation frame.
 */
function _getPacmanFrameCanvas(intR, bodyColor, frameIdx) {
  if (typeof document === 'undefined') return null;

  const key = `${intR}_${bodyColor}_${frameIdx}`;
  if (_cachedPacmanCanvases.has(key)) {
    return _cachedPacmanCanvases.get(key);
  }

  const P = 2.0;
  const steps = Math.ceil((intR + P) / P);
  const size = (steps * 2 + 1) * P;

  // 8 discrete mouth aperture frames from 0 (closed) to 1.15 rad (wide chomp)
  const maxAngle = 1.15;
  const mouthAngle = (frameIdx / 7) * maxAngle;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const offCtx = canvas.getContext('2d');
  _renderPacmanFrame(offCtx, intR, mouthAngle, bodyColor, true);

  _cachedPacmanCanvases.set(key, canvas);
  return canvas;
}

/**
 * Procedural 8-bit Pac-Man body rasterizer adhering to Toji Reference Geometry (Rule 24).
 * Dynamically articulates the iconic wedge mouth during movement & combat.
 */
export function drawPacmanPixelBody(ctx, r, fighter) {
  const intR = Math.round(r || 25);
  const P = 2.0;
  const steps = Math.ceil((intR + P) / P);
  const size = (steps * 2 + 1) * P;

  const isChomp = Boolean(fighter && fighter.isChompModeActive);
  const animTick = fighter?._mouthAnimTicks || (typeof state !== 'undefined' ? state.frameCount : 0) || 0;

  // Mouth wedge aperture angle: cycles open/shut
  // Normal mode: 0 to 42 deg (~0.72 rad)
  // Chomp mode: 12 to 66 deg (~1.15 rad)
  const baseMouthAngle = isChomp ? 0.20 : 0.00;
  const maxMouthAngle = isChomp ? 1.15 : 0.72;
  const mouthCycle = (Math.sin(animTick * 0.35) + 1) * 0.5; // 0..1
  const mouthHalfAngle = baseMouthAngle + mouthCycle * (maxMouthAngle - baseMouthAngle);

  const bodyColor = fighter?.color || (typeof CONFIG !== 'undefined' && CONFIG.pacman?.color) || '#F2F000';
  const frameIdx = Math.min(7, Math.max(0, Math.round((mouthHalfAngle / 1.15) * 7)));

  const cached = _getPacmanFrameCanvas(intR, bodyColor, frameIdx);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (cached) {
    ctx.drawImage(cached, -size / 2, -size / 2);
  } else {
    // Direct rendering fallback for headless Node.js verification environments
    _renderPacmanFrame(ctx, intR, mouthHalfAngle, bodyColor, false);
  }
  ctx.restore();
}

/**
 * Main skin entry point for Pac-Man (`drawPacmanSkin(ctx, fighter)`).
 * Adheres to Rule 19 (Upright Front POV), Rule 20 (Symmetrical Hands at +-0.82r, +0.38r),
 * Rule 22 (Hair Layer 2), Rule 24 (Toji Body Baseline), and Rule 32 (Manga Ink Outline).
 */
export function drawPacmanSkin(ctx, fighter) {
  if (!ctx || !fighter) return;
  const r = fighter.r || 25;

  ctx.save();
  // Mandatory Rule 32 Coordinate Translation Contract
  ctx.translate(fighter.x || 0, (fighter.y || 0) - (fighter.z || 0));

  // Rule 19: Upright Front POV orientation & vertical flip when facing left
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // Swallowed Enemy Belly Bulge: When holding an enemy inside, Pac-Man swells slightly with a cute stuffed wobble
  const isStuffed = Boolean(fighter.swallowedEnemies && fighter.swallowedEnemies.some(e => e && e.isSwallowedByPacman));
  if (isStuffed) {
    const pulse = Math.sin(((typeof state !== 'undefined' ? state.frameCount : 0) || 0) * 0.22) * 0.04;
    ctx.scale(1.14 + pulse, 1.14 + pulse);
  }

  // Layer 1: Authentic 8-bit Pac-Man pixel body circle, eye & animated mouth wedge
  drawPacmanPixelBody(ctx, r, fighter);

  // Layer 2: Dedicated Headband / Cap Hair Asset (Rule 22)
  if (!fighter.hideHair) {
    _drawPacmanHair(ctx, r, false);
  }

  // Layer 3: Hands (Suppressed for Pac-Man — Classic Retro Sphere Form)
  const shouldHideHands = fighter.hideHands !== false || fighter.hideHand;
  if (!shouldHideHands) {
    const handRadius = getHandSize(r * 0.30, fighter);
    const gloveFill = fighter.isChompModeActive ? '#FACC15' : '#EF4444';
    const handOutline = '#0E0F14';

    // Off-hand (Left Hand)
    drawPixelHand(ctx, -r * 0.82, r * 0.38, handRadius, gloveFill, handOutline);

    // Main-hand (Right Hand)
    drawPixelHand(ctx, r * 0.82, r * 0.38, handRadius, gloveFill, handOutline);
  }

  ctx.restore();
}
