// ─────────────────────────────────────────────
// Ender Dragon — Upright Circle Body Fighter Skin & Animated Wings + Tail Engine
// Authentic Faceless Minimalist Pixel Art (Rule 19, 20 & 35)
// Uses Assets/model/Sprites/Dragon-wings-sprite-sheet.png for animated flapping wings
// Uses Assets/model/Sprites/Dragon-tails-sprite-sheet.png for animated articulated tail
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { getHandSize } from '../../core/config.js';
import { FighterRenderer, drawPixelHand } from '../renderers/fighterRenderer.js';
import { enderDragonConfig } from '../../configs/characters/enderDragonConfig.js';

let _wingsSheet = null;
let _tailsSheet = null;
let _disintegration1 = null;
let _disintegration2 = null;

let _wingsLoaded = false;
let _tailsLoaded = false;
let _dis1Loaded = false;
let _dis2Loaded = false;

// 6-Frame animation grid coordinates for wing sprite sheet (2 rows x 3 cols, 512x512 per cell)
const WING_FRAMES = [
  { sx: 0,    sy: 0,   sw: 512, sh: 512 }, // Frame 0: Peak Upstroke
  { sx: 512,  sy: 0,   sw: 512, sh: 512 }, // Frame 1: Mid Downstroke
  { sx: 1024, sy: 0,   sw: 512, sh: 512 }, // Frame 2: Full Downstroke
  { sx: 0,    sy: 512, sw: 512, sh: 512 }, // Frame 3: Bottom Rising
  { sx: 512,  sy: 512, sw: 512, sh: 512 }, // Frame 4: Mid Upstroke
  { sx: 1024, sy: 512, sw: 512, sh: 512 }, // Frame 5: Cresting Upstroke
];

// Single Bird's-Eye View Tail Frame (Dragon-tail-birdeyeview-sprite-sheet1.png: 309x526, base anchor at 117,20, length 484px)
const TAIL_FRAME = { sx: 0, sy: 0, sw: 309, sh: 526, ax: 117.0, ay: 20.0, h: 484.0 };

export function getEnderDragonWingsSheet() {
  if (!_wingsSheet && typeof Image !== 'undefined') {
    _wingsSheet = new Image();
    _wingsSheet.onload = () => { _wingsLoaded = true; };
    _wingsSheet.onerror = (e) => { console.warn('Failed to load Dragon Wings Sheet at Assets/model/Sprites/Dragon-wings-sprite-sheet.png', e); };
    _wingsSheet.src = encodeURI('Assets/model/Sprites/Dragon-wings-sprite-sheet.png?v=1');
  }
  return _wingsSheet;
}

export function getEnderDragonTailsSheet() {
  if (!_tailsSheet && typeof Image !== 'undefined') {
    _tailsSheet = new Image();
    _tailsSheet.onload = () => { _tailsLoaded = true; };
    _tailsSheet.onerror = (e) => { console.warn('Failed to load Dragon Tails Sheet at Assets/model/Sprites/Dragon-tail-birdeyeview-sprite-sheet1.png', e); };
    _tailsSheet.src = encodeURI('Assets/model/Sprites/Dragon-tail-birdeyeview-sprite-sheet1.png?v=1');
  }
  return _tailsSheet;
}

// Backward-compatibility aliases
export const getEnderDragonMovementSheet = getEnderDragonWingsSheet;
export const getEnderDragonVerticalSheet = getEnderDragonWingsSheet;
export const getEnderDragonSideSheet = getEnderDragonWingsSheet;
export const getEnderDragonStraightSheet = getEnderDragonWingsSheet;
export const getEnderDragonAngledSheet = getEnderDragonWingsSheet;
export const getEnderDragonModelImage = getEnderDragonWingsSheet;

export function getEnderDragonDisintegrationImages() {
  if (!_disintegration1 && typeof Image !== 'undefined') {
    _disintegration1 = new Image();
    _disintegration1.onload = () => { _dis1Loaded = true; };
    _disintegration1.src = encodeURI('Assets/model/Sprites/Ender-dragon-Disintegration-Sequence.png?v=1');
  }
  if (!_disintegration2 && typeof Image !== 'undefined') {
    _disintegration2 = new Image();
    _disintegration2.onload = () => { _dis2Loaded = true; };
    _disintegration2.src = encodeURI('Assets/model/Sprites/Ender-dragon-Disintegration-Sequence2.png?v=1');
  }
  return { dis1: _disintegration1, dis2: _disintegration2 };
}

// Pre-initialize on load if in browser environment
if (typeof window !== 'undefined') {
  getEnderDragonWingsSheet();
  getEnderDragonTailsSheet();
  getEnderDragonDisintegrationImages();
}

/**
 * Procedural fallback wings if wings sheet is loading
 */
function _drawProceduralWings(ctx, r, isSwooping = false) {
  ctx.save();
  const wingSpan = r * 2.2;
  ctx.fillStyle = '#27272A';
  ctx.strokeStyle = '#581C87';
  ctx.lineWidth = 2.0;

  // Upper/Left Flank Wing
  ctx.beginPath();
  ctx.moveTo(-r * 0.1, -r * 0.4);
  ctx.lineTo(-r * 0.9, -wingSpan);
  ctx.lineTo(r * 0.6, -wingSpan * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Lower/Right Flank Wing
  ctx.beginPath();
  ctx.moveTo(-r * 0.1, r * 0.4);
  ctx.lineTo(-r * 0.9, wingSpan);
  ctx.lineTo(r * 0.6, wingSpan * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Procedural fallback tail if tail sheet is loading
 */
function _drawProceduralTail(ctx, r, tailRotation = 0) {
  ctx.save();
  ctx.translate(-r * 0.65, 0);
  ctx.rotate(tailRotation);
  const tailSegments = 4;
  const segLen = r * 0.45;
  let currX = 0;
  let currY = 0;

  ctx.fillStyle = '#18181B';
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 2.0;

  for (let i = 0; i < tailSegments; i++) {
    const nextX = currX - segLen;
    const nextY = currY;
    const halfW = (r * 0.22) * (1 - (i / tailSegments) * 0.6);

    ctx.beginPath();
    ctx.moveTo(currX, currY - halfW);
    ctx.lineTo(nextX, nextY - halfW * 0.7);
    ctx.lineTo(nextX, nextY + halfW * 0.7);
    ctx.lineTo(currX, currY + halfW);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Purple spine on dorsal side
    ctx.fillStyle = '#A21CAF';
    ctx.fillRect(currX - 3, currY - halfW - 2, 4, 3);

    currX = nextX;
    currY = nextY;
  }
  ctx.restore();
}

/**
 * Renders Animated Bird's-Eye View Dragon Tail from Dragon-tail-birdeyeview-sprite-sheet1.png
 */
function _drawEnderDragonTail(ctx, r, tailImg, tBox, tailRotation = 0) {
  const tailLength = r * 1.55; // Proportional sleek & compact dragon tail scale
  const scale = tailLength / (tBox?.h || 484.0);
  const attachX = -r * 0.65; // Base attaches beneath dragon rear circle

  if (tailImg && tailImg.complete && tailImg.naturalWidth > 0 && tBox) {
    ctx.save();
    ctx.translate(attachX, 0);
    ctx.rotate(tailRotation); // Retro arcade 4.5° quantized rotational flex & sway
    ctx.rotate(Math.PI / 2);  // Rotate 90° so vertical downward (+Y) sprite extends straight backward (-X)
    ctx.imageSmoothingEnabled = false; // Authentic pixel art
    ctx.drawImage(
      tailImg,
      tBox.sx, tBox.sy, tBox.sw, tBox.sh,
      -tBox.ax * scale, -tBox.ay * scale,
      tBox.sw * scale, tBox.sh * scale
    );
    ctx.restore();
  } else {
    _drawProceduralTail(ctx, r, tailRotation);
  }
}

// Offscreen canvas cache for Ender Dragon's pixel body model (avoids 1,200 fillRect calls per frame and subpixel grid lines)
let _cachedDragonCanvas = null;
let _cachedDragonR = 0;

function _renderEnderDragonPixelBodyToCanvas(destCtx, r) {
  destCtx.imageSmoothingEnabled = false;
  const P = 2.0;
  const steps = Math.ceil((r * 1.15 + P) / P);

  // Palette Colors matching Authentic Ender Dragon (Obsidian + Amethyst + Silver)
  const C = {
    outline: '#0E0F14',        // Deep dark manga ink outline
    obsidianBase: '#18181B',   // Dark obsidian charcoal base
    obsidianDark: '#101014',   // Deep shadow / rear obsidian
    obsidianMid: '#24242B',    // Scale midtone
    obsidianLight: '#383842',  // Snout / brow specular highlight

    spinePlate: '#D4D4D8',    // Metallic silver dorsal spine plate
    spineGlint: '#FFFFFF',    // Specular spine glint

    eyeSocket: '#A21CAF',     // Amethyst socket rim
    eyeViolet: '#E879F9',     // Neon violet slit
    eyeCore: '#F5D0FE',       // Specular amethyst eye core

    crystalShadow: '#701A75', // Void crystal shadow
    crystalMid: '#D946EF',    // Void crystal facet
    crystalLight: '#F5D0FE',  // Void crystal bright facet
    crystalCore: '#FFFFFF',   // Void crystal inner gleam

    hornBase: '#18181B',      // Horn root
    hornMid: '#C026D3',       // Horn amethyst gradient
    hornBright: '#E879F9',    // Horn bright facet
    hornGlint: '#F5D0FE',     // Horn tip specular glint
  };

  const cx = destCtx.canvas.width / 2;
  const cy = destCtx.canvas.height / 2;

  destCtx.save();
  destCtx.translate(cx, cy);

  function pointInTri(px, py, x1, y1, x2, y2, x3, y3) {
    const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
    const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
    const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(hasNeg && hasPos);
  }

  function isInsideDragon(x, y) {
    if (Math.hypot(x, y) <= r) return true;
    // Swept-back twin horns
    if (pointInTri(x, y, r * 0.35, -r * 0.38, -r * 0.95, -r * 0.95, -r * 0.25, -r * 0.60)) return true;
    if (pointInTri(x, y, r * 0.35, r * 0.38, -r * 0.95, r * 0.95, -r * 0.25, r * 0.60)) return true;
    return false;
  }

  // 100% Discrete Grid Rasterization onto Axis-Aligned Offscreen Canvas (Zero Crisscross Lines)
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      if (!isInsideDragon(rx, ry)) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;

      // 4-neighbor boundary test for clean 1-pixel outer manga ink outline
      const isBorder =
        !isInsideDragon((gx + 1) * P, gy * P) ||
        !isInsideDragon((gx - 1) * P, gy * P) ||
        !isInsideDragon(gx * P, (gy + 1) * P) ||
        !isInsideDragon(gx * P, (gy - 1) * P);

      if (isBorder) {
        destCtx.fillStyle = C.outline;
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      const dist = Math.hypot(rx, ry);

      // ── ZONE 1: Swept-Back Twin Horns ──
      const isUpperHorn = ry < -r * 0.45 && rx < -r * 0.15;
      const isLowerHorn = ry > r * 0.45 && rx < -r * 0.15;

      if (isUpperHorn || isLowerHorn) {
        const absY = Math.abs(ry);
        if (rx < -r * 0.65 && absY > r * 0.72) {
          if (rx < -r * 0.85) {
            destCtx.fillStyle = C.hornGlint;
          } else if (rx < -r * 0.75) {
            destCtx.fillStyle = C.hornBright;
          } else {
            destCtx.fillStyle = C.hornMid;
          }
        } else {
          destCtx.fillStyle = C.hornBase;
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── ZONE 2: Metallic Silver Dorsal Spine Ridges ──
      const isCenterSpine = Math.abs(ry) <= P * 1.5 && rx >= -r * 0.75 && rx <= r * 0.55;
      if (isCenterSpine) {
        const spineSegment = Math.floor((rx + r * 0.75) / (r * 0.26));
        const isSpineBlock = (spineSegment % 2 === 0);
        if (isSpineBlock) {
          destCtx.fillStyle = (Math.abs(ry) <= P * 0.6) ? C.spineGlint : C.spinePlate;
          destCtx.fillRect(px, py, P, P);
          continue;
        }
      }

      // ── ZONE 3: Faceless Amethyst Eye Slits ──
      const isEyeX = rx >= r * 0.28 && rx <= r * 0.48;
      const isUpperEye = isEyeX && ry >= -r * 0.42 && ry <= -r * 0.20;
      const isLowerEye = isEyeX && ry >= r * 0.20 && ry <= r * 0.42;

      if (isUpperEye || isLowerEye) {
        if (rx >= r * 0.36 && rx <= r * 0.44 && Math.abs(ry) >= r * 0.26 && Math.abs(ry) <= r * 0.36) {
          destCtx.fillStyle = C.eyeCore;
        } else if (rx >= r * 0.32) {
          destCtx.fillStyle = C.eyeViolet;
        } else {
          destCtx.fillStyle = C.eyeSocket;
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── ZONE 4: Void Crystal Core / Heart ──
      const coreCenterX = -r * 0.10;
      const coreDist = Math.abs(rx - coreCenterX) + Math.abs(ry) * 1.25;
      if (coreDist <= r * 0.22) {
        if (coreDist <= P * 1.5) {
          destCtx.fillStyle = C.crystalCore;
        } else if (coreDist <= r * 0.10) {
          destCtx.fillStyle = C.crystalLight;
        } else if (coreDist <= r * 0.16) {
          destCtx.fillStyle = C.crystalMid;
        } else {
          destCtx.fillStyle = C.crystalShadow;
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ── ZONE 5: Solid Obsidian Scale Shading (No modulo dither noise) ──
      if (rx > r * 0.35 && Math.abs(ry) < r * 0.45) {
        destCtx.fillStyle = C.obsidianLight;
      } else if (rx > 0 && dist < r * 0.70) {
        destCtx.fillStyle = C.obsidianMid;
      } else if (rx < -r * 0.35 || dist > r * 0.82) {
        destCtx.fillStyle = C.obsidianDark;
      } else {
        destCtx.fillStyle = C.obsidianBase;
      }

      destCtx.fillRect(px, py, P, P);
    }
  }

  destCtx.restore();
}

/**
 * Authentic Obsidian Ender Dragon Pixel Art Engine (Offscreen Cached)
 * Upright Front POV, Faceless Minimalist Aesthetic (Rule 19, 20 & 35)
 */
export function drawEnderDragonPixelBody(ctx, r, isPreview = false) {
  if (typeof document === 'undefined') return;

  if (!_cachedDragonCanvas || _cachedDragonR !== r) {
    _cachedDragonR = r;
    const P = 2.0;
    const steps = Math.ceil((r * 1.15 + P) / P);
    const size = (steps * 2 + 1) * P;

    _cachedDragonCanvas = document.createElement('canvas');
    _cachedDragonCanvas.width = size;
    _cachedDragonCanvas.height = size;
    const offCtx = _cachedDragonCanvas.getContext('2d');
    _renderEnderDragonPixelBodyToCanvas(offCtx, r);
  }

  if (_cachedDragonCanvas) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(_cachedDragonCanvas, -_cachedDragonCanvas.width / 2, -_cachedDragonCanvas.height / 2);
    ctx.restore();
  }
}

// Backward-compatibility alias
export const _drawEnderDragonCircleBody = drawEnderDragonPixelBody;

/**
 * Renders trailing swooping afterimages in world space
 */
function _drawSwoopAfterImages(ctx, afterImages, r, fBox, wingsImg, tBox, tailsImg, totalFlex = 0) {
  if (!afterImages || afterImages.length === 0) return;
  const wingDrawSize = r * 3.8;
  const tailDrawSize = r * 3.2;
  const scale = tailDrawSize / 512;
  const attachX = -r * 0.65;

  for (let i = 0; i < afterImages.length; i++) {
    const ai = afterImages[i];
    const alpha = Math.max(0, Math.min(1, ai.alpha || 0.4));
    if (alpha <= 0.02) continue;

    ctx.save();
    ctx.translate(ai.x, ai.y);
    const angle = (ai.angle !== undefined) ? ai.angle : 0;
    ctx.rotate(angle);
    const facingLeft = Math.abs(angle) > Math.PI / 2;
    if (facingLeft) {
      ctx.scale(1, -1);
    }
    ctx.globalAlpha = alpha * 0.5;

    // Draw fading tail with fluid rotation
    if (tailsImg && tailsImg.complete && tailsImg.naturalWidth > 0 && tBox) {
      const tailLength = r * 1.55;
      const tailScale = tailLength / (tBox?.h || 484.0);
      const aiTailRot = facingLeft ? -totalFlex : totalFlex;
      ctx.save();
      ctx.translate(attachX, 0);
      ctx.rotate(aiTailRot);
      ctx.rotate(Math.PI / 2);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        tailsImg,
        tBox.sx, tBox.sy, tBox.sw, tBox.sh,
        -tBox.ax * tailScale, -tBox.ay * tailScale,
        tBox.sw * tailScale, tBox.sh * tailScale
      );
      ctx.restore();
    }

    // Draw fading wings
    if (wingsImg && wingsImg.complete && wingsImg.naturalWidth > 0 && fBox) {
      ctx.save();
      ctx.translate(-r * 0.15, 0);
      ctx.rotate(-Math.PI / 2);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        wingsImg,
        fBox.sx, fBox.sy, fBox.sw, fBox.sh,
        -wingDrawSize / 2, -wingDrawSize / 2, wingDrawSize, wingDrawSize
      );
      ctx.restore();
    }

    // Draw fading silhouette
    ctx.fillStyle = '#C026D3';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Renders Void Cataclysm charging lightning arcs around dragon
 */
function _drawCataclysmLightning(ctx, r, channelProgress) {
  ctx.save();
  const count = 4 + Math.floor(channelProgress * 6);
  const ringR = r * (1.2 + channelProgress * 0.5);

  ctx.strokeStyle = channelProgress > 0.6 ? '#F5D0FE' : '#D946EF';
  ctx.lineWidth = 2.0;

  for (let i = 0; i < count; i++) {
    const baseA = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const x1 = Math.cos(baseA) * (ringR * 0.6);
    const y1 = Math.sin(baseA) * (ringR * 0.6);
    const midA = baseA + (Math.random() - 0.5) * 0.4;
    const mx = Math.cos(midA) * (ringR * 0.9);
    const my = Math.sin(midA) * (ringR * 0.9);
    const x2 = Math.cos(baseA) * ringR;
    const y2 = Math.sin(baseA) * ringR;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(mx, my);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Main Ender Dragon Skin Renderer
 * Renders Upright Minimalist Circle Body + Animated Flapping Wings + Animated Articulated Tail
 */
export function drawEnderDragonSkin(ctx, fighter) {
  if (!ctx || !fighter) return;

  const r = fighter.r || enderDragonConfig.r || 36;
  const isPreview = Boolean(fighter._isPreview || fighter._isWinnerReveal || fighter.isPreview);

  const wingsImg = getEnderDragonWingsSheet();
  const tailsImg = getEnderDragonTailsSheet();

  // Frame timing: speed up during swoops and high-velocity flight
  const isSwooping = Boolean(fighter.isSwooping || fighter.aiState === 'SWOOP_DASH');
  const ticksPerFrame = isSwooping
    ? enderDragonConfig.swoopTicksPerFrame || 3
    : enderDragonConfig.spriteTicksPerFrame || 5;

  const frameCounter = (typeof state !== 'undefined' && state.frameCount !== undefined)
    ? state.frameCount
    : Math.floor(Date.now() / 16);

  const frameIdx = Math.floor(frameCounter / ticksPerFrame) % WING_FRAMES.length;
  const fBox = WING_FRAMES[frameIdx] || WING_FRAMES[0];
  const tBox = TAIL_FRAME;

  // ── Continuous 360° World-Space Spring-Damper Tail Physics Engine ──
  const angle = isPreview ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));

  // Initialize or reset tracking angles
  if (fighter._tailWorldAngle === undefined || isNaN(fighter._tailWorldAngle)) {
    fighter._tailWorldAngle = angle + Math.PI;
    fighter._tailAngularVel = 0;
  }

  // Target tail world angle points directly opposite to dragon facing direction (along dorsal spine)
  const targetTailWorld = angle + Math.PI;

  // Shortest angular difference from current tail angle to target angle
  let dAngle = targetTailWorld - fighter._tailWorldAngle;
  while (dAngle > Math.PI) dAngle -= Math.PI * 2;
  while (dAngle < -Math.PI) dAngle += Math.PI * 2;

  // Spring-damper physics simulation for fluid, responsive tail trailing
  const springK = isPreview ? 0.35 : (isSwooping ? 0.28 : 0.20);
  const damping = isPreview ? 0.70 : (isSwooping ? 0.75 : 0.78);

  fighter._tailAngularVel = ((fighter._tailAngularVel || 0) * damping) + (dAngle * springK);
  fighter._tailWorldAngle += fighter._tailAngularVel;

  // CRITICAL: Normalize world tail angle to [-PI, PI] to prevent unbounded accumulation
  while (fighter._tailWorldAngle > Math.PI) fighter._tailWorldAngle -= Math.PI * 2;
  while (fighter._tailWorldAngle < -Math.PI) fighter._tailWorldAngle += Math.PI * 2;

  // Calculate relative flex angle of the tail relative to the spine (targetTailWorld)
  // ALWAYS strictly normalized to [-PI, PI] to guarantee zero angle wrapping or sticking bugs!
  let relFlex = fighter._tailWorldAngle - targetTailWorld;
  while (relFlex > Math.PI) relFlex -= Math.PI * 2;
  while (relFlex < -Math.PI) relFlex += Math.PI * 2;

  // Clamp natural anatomical spine bend to ±30 degrees
  const maxFlex = Math.PI / 6.0;
  relFlex = Math.max(-maxFlex, Math.min(maxFlex, relFlex));

  // Dynamic Velocity Aerodynamic Draft (Air drag pushes tail away from flight direction)
  let velPush = 0;
  const speed = Math.hypot(fighter.vx || 0, fighter.vy || 0);
  if (speed > 0.4 && !isPreview) {
    const moveAngle = Math.atan2(fighter.vy, fighter.vx);
    let relMoveAngle = moveAngle - angle;
    while (relMoveAngle > Math.PI) relMoveAngle -= Math.PI * 2;
    while (relMoveAngle < -Math.PI) relMoveAngle += Math.PI * 2;
    velPush = -Math.sin(relMoveAngle) * Math.min(0.22, speed * 0.038);
  }

  // ── Retro Arcade Dragon Tail Animation Engine (8-Step Wave + 4.5° Quantization) ──
  // 8-step retro arcade rhythmic sway wave (Classic 16-bit / Neo-Geo boss cadence)
  const swayTicks = isSwooping ? 2 : 4;
  const retroPhase = Math.floor(frameCounter / swayTicks) % 8;
  const ARCADE_SWAY_TABLE = [0, 0.45, 0.90, 0.55, 0, -0.45, -0.90, -0.55];
  const arcadeSway = (ARCADE_SWAY_TABLE[retroPhase] || 0) * (isSwooping ? 0.07 : 0.13);

  // Combine lag, velocity drag, and arcade sway
  const rawFlex = relFlex + velPush + arcadeSway;

  // Discrete 4.5° arcade angular quantization (16-bit directional notch snapping)
  const ARCADE_NOTCH = Math.PI / 40; // 4.5 degrees per discrete step
  const totalFlex = Math.round(rawFlex / ARCADE_NOTCH) * ARCADE_NOTCH;

  // When facing left, context scale(1, -1) inverts local Y, so invert rotation angle
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  const tailRotation = facingLeft ? -totalFlex : totalFlex;

  // Render afterimages in world space behind fighter
  if (fighter.afterImages && fighter.afterImages.length > 0) {
    _drawSwoopAfterImages(ctx, fighter.afterImages, r, fBox, wingsImg, tBox, tailsImg, totalFlex);
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // ── Upright Aim Angle Transform Standard (Rule 19) ──
  ctx.rotate(angle);
  if (facingLeft) {
    ctx.scale(1, -1); // Upright orientation: top horn/wing stays on -Y and bottom on +Y!
  }

  // Draw Void Cataclysm channeling lightning
  if (fighter.isChannelingCataclysm) {
    _drawCataclysmLightning(ctx, r, fighter.cataclysmProgress || 0);
  }

  // ── LAYER 1: Animated Articulated Dragon Tail (Single Frame with Fluid Angular Physics) ──
  _drawEnderDragonTail(ctx, r, tailsImg, tBox, tailRotation);

  // ── LAYER 2: Animated Dragon Wings Attached to Back (Dragon-wings-sprite-sheet.png) ──
  const wingDrawSize = r * 3.8;
  if (wingsImg && wingsImg.complete && wingsImg.naturalWidth > 0) {
    ctx.save();
    ctx.translate(-r * 0.15, 0); // Attach wings to back spine
    ctx.rotate(-Math.PI / 2);    // Align lateral wing spread perpendicular to spine
    ctx.imageSmoothingEnabled = false; // Authentic pixel art
    ctx.drawImage(
      wingsImg,
      fBox.sx, fBox.sy, fBox.sw, fBox.sh,
      -wingDrawSize / 2, -wingDrawSize / 2, wingDrawSize, wingDrawSize
    );
    ctx.restore();
  } else {
    _drawProceduralWings(ctx, r, isSwooping);
  }

  // ── LAYER 3: Obsidian Circle Body Model (Head & Eyes at +X, Spine at -X) ──
  _drawEnderDragonCircleBody(ctx, r, isPreview);

  // Status overlays & hit flash
  FighterRenderer.drawStatusOverlays(ctx, fighter);

  ctx.restore();
}

/**
 * Draws the Lingering Dragon Breath Acid Pool on the arena ground
 */
export function drawDragonAcidPool(ctx, pool) {
  if (!ctx || !pool || pool.duration <= 0) return;
  const radius = pool.radius || 70;
  const alpha = Math.max(0, Math.min(0.65, pool.duration / 30));

  ctx.save();
  ctx.translate(pool.x, pool.y);

  // Outer acid glow
  const grad = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
  grad.addColorStop(0, `rgba(162, 28, 175, ${alpha * 0.9})`);
  grad.addColorStop(0.6, `rgba(192, 38, 211, ${alpha * 0.5})`);
  grad.addColorStop(1, 'rgba(162, 28, 175, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Floating acidic vapor bubbles
  const bubbleCount = 6;
  const time = (typeof state !== 'undefined' && state.frameCount) ? state.frameCount : 0;
  ctx.fillStyle = `rgba(244, 114, 182, ${alpha * 0.8})`;

  for (let i = 0; i < bubbleCount; i++) {
    const angle = (i / bubbleCount) * Math.PI * 2 + time * 0.03;
    const dist = (radius * 0.45) + Math.sin(time * 0.08 + i) * (radius * 0.25);
    const bx = Math.cos(angle) * dist;
    const by = Math.sin(angle) * dist;
    const bSize = 3 + (i % 3);

    ctx.beginPath();
    ctx.arc(bx, by, bSize, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
