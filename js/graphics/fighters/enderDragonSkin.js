// ─────────────────────────────────────────────
// Ender Dragon — Upright Circle Body Fighter Skin & Animated Wings Engine
// Authentic Faceless Minimalist Pixel Art (Rule 19, 20 & 35)
// Uses Assets/model/Sprites/Dragon-wings-sprite-sheet.png for animated flapping wings
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { getHandSize } from '../../core/config.js';
import { FighterRenderer, drawPixelHand } from '../renderers/fighterRenderer.js';
import { enderDragonConfig } from '../../configs/characters/enderDragonConfig.js';

let _wingsSheet = null;
let _disintegration1 = null;
let _disintegration2 = null;

let _wingsLoaded = false;
let _dis1Loaded = false;
let _dis2Loaded = false;

// 6-Frame animation grid coordinates (2 rows x 3 cols, 512x512 per cell)
const WING_FRAMES = [
  { sx: 0,    sy: 0,   sw: 512, sh: 512 }, // Frame 0: Peak Upstroke
  { sx: 512,  sy: 0,   sw: 512, sh: 512 }, // Frame 1: Mid Downstroke
  { sx: 1024, sy: 0,   sw: 512, sh: 512 }, // Frame 2: Full Downstroke
  { sx: 0,    sy: 512, sw: 512, sh: 512 }, // Frame 3: Bottom Rising
  { sx: 512,  sy: 512, sw: 512, sh: 512 }, // Frame 4: Mid Upstroke
  { sx: 1024, sy: 512, sw: 512, sh: 512 }, // Frame 5: Cresting Upstroke
];

export function getEnderDragonWingsSheet() {
  if (!_wingsSheet && typeof Image !== 'undefined') {
    _wingsSheet = new Image();
    _wingsSheet.onload = () => { _wingsLoaded = true; };
    _wingsSheet.onerror = (e) => { console.warn('Failed to load Dragon Wings Sheet at Assets/model/Sprites/Dragon-wings-sprite-sheet.png', e); };
    _wingsSheet.src = encodeURI('Assets/model/Sprites/Dragon-wings-sprite-sheet.png?v=1');
  }
  return _wingsSheet;
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
 * Obsidian Dragon Circle Body Renderer (Authentic Faceless Minimalist Pixel Art)
 * Coordinate system:
 * - Forward / Aim direction: +X (Head, Snout, Amethyst Eye Slits)
 * - Rear / Spine direction: -X (Back, Dorsal Spine Plates, Tail)
 * - Flanks: -Y (Left Flank / Horn), +Y (Right Flank / Horn)
 * - Strictly NO human eyes, pupils, mouth, or nose (Rule 19)
 */
function _drawEnderDragonCircleBody(ctx, r, isPreview = false) {
  ctx.save();

  // ── 1. Swept-Back Twin Dragon Horns (Sweeping from forward crown towards -X rear) ──
  // Upper/Left Horn
  ctx.fillStyle = '#18181B';
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(r * 0.35, -r * 0.40);
  ctx.lineTo(-r * 0.85, -r * 0.95); // Swept-back horn tip
  ctx.lineTo(-r * 0.25, -r * 0.60);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Upper Horn Glowing Amethyst Tip
  ctx.fillStyle = '#D946EF';
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, -r * 0.85);
  ctx.lineTo(-r * 0.85, -r * 0.95);
  ctx.lineTo(-r * 0.50, -r * 0.68);
  ctx.closePath();
  ctx.fill();

  // Lower/Right Horn
  ctx.fillStyle = '#18181B';
  ctx.beginPath();
  ctx.moveTo(r * 0.35, r * 0.40);
  ctx.lineTo(-r * 0.85, r * 0.95); // Swept-back horn tip
  ctx.lineTo(-r * 0.25, r * 0.60);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Lower Horn Glowing Amethyst Tip
  ctx.fillStyle = '#D946EF';
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, r * 0.85);
  ctx.lineTo(-r * 0.85, r * 0.95);
  ctx.lineTo(-r * 0.50, r * 0.68);
  ctx.closePath();
  ctx.fill();

  // ── 2. Main Obsidian Circle Body Shell ──
  const bodyGrad = ctx.createRadialGradient(r * 0.2, 0, r * 0.1, 0, 0, r);
  bodyGrad.addColorStop(0, '#27272A'); // Lighter obsidian highlight near forward face
  bodyGrad.addColorStop(0.7, '#18181B'); // Mid charcoal scale
  bodyGrad.addColorStop(1, '#0F0F12'); // Dark rear rim

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Outer Manga Ink Outline
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Void Energy Rim Glow
  ctx.strokeStyle = 'rgba(192, 38, 211, 0.45)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
  ctx.stroke();

  // ── 3. Metallic Silver Dorsal Spine Ridges (Along Center X spine) ──
  const spineCount = 5;
  for (let i = 0; i < spineCount; i++) {
    const sx = -r * 0.70 + (i * (r * 1.10 / (spineCount - 1)));
    const sWidth = 4;
    const sHeight = (i === 0 || i === spineCount - 1) ? 4 : 6;
    // Silver spine block
    ctx.fillStyle = (i % 2 === 0) ? '#E4E4E7' : '#A1A1AA';
    ctx.fillRect(sx - sWidth / 2, -sHeight / 2, sWidth, sHeight);
    ctx.fillStyle = '#0E0F14';
    ctx.strokeRect(sx - sWidth / 2, -sHeight / 2, sWidth, sHeight);
  }

  // ── 4. Faceless Minimalist Amethyst Eyes / Forward Brow Visor (Rule 19) ──
  // Glowing violet eye slits aiming FORWARD towards +X (the enemy)
  const eyeX = r * 0.35;
  const eyeW = 5.0;
  const eyeH = r * 0.28;

  // Upper Eye Slit
  ctx.fillStyle = '#D946EF';
  ctx.beginPath();
  ctx.moveTo(eyeX, -r * 0.40);
  ctx.lineTo(eyeX + eyeW, -r * 0.40 + 2);
  ctx.lineTo(eyeX + eyeW - 2, -r * 0.40 + eyeH);
  ctx.lineTo(eyeX, -r * 0.40 + eyeH - 2);
  ctx.closePath();
  ctx.fill();

  // Upper Eye Core Glint
  ctx.fillStyle = '#F5D0FE';
  ctx.fillRect(eyeX + 1, -r * 0.35, 2.5, 4);

  // Lower Eye Slit
  ctx.fillStyle = '#D946EF';
  ctx.beginPath();
  ctx.moveTo(eyeX, r * 0.40);
  ctx.lineTo(eyeX + eyeW, r * 0.40 - 2);
  ctx.lineTo(eyeX + eyeW - 2, r * 0.40 - eyeH);
  ctx.lineTo(eyeX, r * 0.40 - eyeH + 2);
  ctx.closePath();
  ctx.fill();

  // Lower Eye Core Glint
  ctx.fillStyle = '#F5D0FE';
  ctx.fillRect(eyeX + 1, r * 0.35 - 4, 2.5, 4);

  // ── 5. Ender Crystal Core / Void Heart (-r * 0.10, 0) ──
  const coreX = -r * 0.10;
  const coreR = r * 0.22;
  // Core Diamond Shape
  ctx.fillStyle = '#A21CAF';
  ctx.beginPath();
  ctx.moveTo(coreX - coreR, 0);
  ctx.lineTo(coreX, coreR * 0.8);
  ctx.lineTo(coreX + coreR, 0);
  ctx.lineTo(coreX, -coreR * 0.8);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#E879F9';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Inner Core Bright Amethyst
  ctx.fillStyle = '#F5D0FE';
  ctx.fillRect(coreX - 2, -2, 4, 4);

  ctx.restore();
}

/**
 * Renders trailing swooping afterimages in world space
 */
function _drawSwoopAfterImages(ctx, afterImages, r, fBox, wingsImg) {
  if (!afterImages || afterImages.length === 0) return;
  const wingDrawSize = r * 3.8;

  for (let i = 0; i < afterImages.length; i++) {
    const ai = afterImages[i];
    const alpha = Math.max(0, Math.min(1, ai.alpha || 0.4));
    if (alpha <= 0.02) continue;

    ctx.save();
    ctx.translate(ai.x, ai.y);
    const angle = (ai.angle !== undefined) ? ai.angle : 0;
    ctx.rotate(angle);
    if (Math.abs(angle) > Math.PI / 2) {
      ctx.scale(1, -1);
    }
    ctx.globalAlpha = alpha * 0.5;

    // Draw fading wings
    if (wingsImg && wingsImg.complete && wingsImg.naturalWidth > 0) {
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
 * Renders Upright Minimalist Circle Body + Animated Flapping Wings from Dragon-wings-sprite-sheet.png
 */
export function drawEnderDragonSkin(ctx, fighter) {
  if (!ctx || !fighter) return;

  const r = fighter.r || enderDragonConfig.r || 36;
  const isPreview = Boolean(fighter._isPreview || fighter._isWinnerReveal || fighter.isPreview);

  const wingsImg = getEnderDragonWingsSheet();

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

  // Render afterimages in world space behind fighter
  if (fighter.afterImages && fighter.afterImages.length > 0) {
    _drawSwoopAfterImages(ctx, fighter.afterImages, r, fBox, wingsImg);
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // ── Upright Aim Angle Transform Standard (Rule 19) ──
  const angle = isPreview ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  ctx.rotate(angle);
  if (Math.abs(angle) > Math.PI / 2) {
    ctx.scale(1, -1); // Upright orientation: top horn/wing stays on -Y and bottom on +Y!
  }

  // Draw Void Cataclysm channeling lightning
  if (fighter.isChannelingCataclysm) {
    _drawCataclysmLightning(ctx, r, fighter.cataclysmProgress || 0);
  }

  // ── LAYER 1: Back Claw Hand (Behind Wings & Body) ──
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  const handR = getHandSize(r * 0.28, fighter);

  if (!shouldHideHands) {
    drawPixelHand(ctx, r * 0.60, -r * 0.45, handR, '#18181B', '#0E0F14');
  }

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

  // ── LAYER 4: Front Claw Hand (On Top of Body) ──
  if (!shouldHideHands) {
    drawPixelHand(ctx, r * 0.70, r * 0.35, handR, '#18181B', '#0E0F14');
  }

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
