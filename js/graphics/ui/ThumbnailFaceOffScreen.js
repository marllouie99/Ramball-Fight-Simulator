// ─────────────────────────────────────────────
// THUMBNAIL & FACE-OFF OVERLAY SCREEN
// Anime Grunge Split Aesthetic with Dynamic Fighter Color Themes & Engineer-Style Glows
// Cinematic 1-by-1 Entrance + Central "VS" to Countdown Transition (3... 2... 1... FIGHT!)
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { CONFIG, FIGHTER_DEFS, getActiveFighterDefs } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';
import { Fighter } from '../../entities/fighter.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { _clearButtons, _registerButton, drawChamferedRect } from './uiFramework.js';
import { proceedFromFaceOffToCountdown, startMatchDirectlyFromFaceOff } from '../../core/gameFlow.js';
import { clearHealthHud } from '../hudManager.js';

// Cache for live fighter preview instances (Pooled by character type to eliminate GC churn)
const _fighterTypePreviewCache = {};

// Static seed arrays for background particles and floating debris
let _floatingDebris = null;
let _scratchLines = null;
let _bgCacheCanvas = null;
let _bgCacheCtx = null;
let _lastBgKey = '';
let _ffaBgCacheCanvas = null;
let _ffaBgCacheCtx = null;
let _lastFfaBgKey = '';
const _textWidthCache = Object.create(null);

// Pre-computed ink splatter points for VS emblem
const _inkSplatterPoints = [];
for (let i = 0; i < 16; i++) {
  const angle = (i / 16) * Math.PI * 2;
  const baseR = (i % 2 === 0) ? 58 : 36;
  const offset = ((i * 7) % 11) - 5;
  const r = baseR + offset;
  _inkSplatterPoints.push({
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r
  });
}

const _splatterDots = [];
for (let s = 0; s < 8; s++) {
  const sAngle = s * 0.8;
  const sDist = 52 + (s * 7) % 25;
  _splatterDots.push({
    x: Math.cos(sAngle) * sDist,
    y: Math.sin(sAngle) * sDist,
    r: 2.4 + (s % 3),
    isLeft: (s % 2 === 0)
  });
}

// Easing Functions
function easeOutBack(t) {
  const c1 = 1.25;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Memoized Color Utility Helpers to eliminate per-frame regex & string allocations
const _brightnessCache = Object.create(null);
function adjustBrightness(hex, percent) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex || '#ffffff';
  const key = hex + '_' + percent;
  let res = _brightnessCache[key];
  if (res) return res;

  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  let num = parseInt(cleanHex, 16);
  if (isNaN(num)) return hex;
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000FF) + Math.round(255 * (percent / 100));
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  res = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  _brightnessCache[key] = res;
  return res;
}

const _rgbaCache = Object.create(null);
function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return `rgba(255, 255, 255, ${alpha})`;
  const key = hex + '_' + alpha;
  let res = _rgbaCache[key];
  if (res) return res;

  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  let num = parseInt(cleanHex, 16);
  if (isNaN(num)) return `rgba(255, 255, 255, ${alpha})`;
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  res = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  _rgbaCache[key] = res;
  return res;
}

function initDebrisAndScratches(width, height) {
  _floatingDebris = [];
  for (let i = 0; i < 24; i++) {
    const colorType = (i % 3 === 0) ? 'left' : ((i % 3 === 1) ? 'right' : 'white');
    _floatingDebris.push({
      x: ((i * 137.5 + 45) % width),
      y: ((i * 211.3 + 30) % height),
      size: 4 + (i % 5) * 1.5,
      rotation: (i * 0.45) % (Math.PI * 2),
      isSolid: (i % 2 === 0),
      colorType: colorType,
      alpha: 0.50 + ((i * 7) % 5) * 0.08
    });
  }

  _scratchLines = [];
  for (let i = 0; i < 18; i++) {
    const isLeft = (i % 2 === 0);
    _scratchLines.push({
      startXRatio: 0.12 + ((i * 0.17) % 0.76),
      startYRatio: 0.10 + ((i * 0.23) % 0.80),
      length: 50 + (i % 6) * 15,
      angle: -0.65 + ((i % 4) - 2) * 0.05,
      width: 1.0 + (i % 3) * 0.4,
      isLeftColor: isLeft,
      alpha: 0.45 + (i % 3) * 0.1
    });
  }
}

/** Prepares a fresh, properly styled fighter model for the face-off layout (Singleton pool by character type) */
function getFaceOffFighter(slotKey, def, targetAngle) {
  if (!def) return null;
  const type = def.type || def.id || 'fighter';
  if (!_fighterTypePreviewCache[type]) {
    const FighterClass = (typeof FIGHTER_CLASS_MAP !== 'undefined' && FIGHTER_CLASS_MAP && FIGHTER_CLASS_MAP[type]) ? FIGHTER_CLASS_MAP[type] : Fighter;
    _fighterTypePreviewCache[type] = new FighterClass({
      ...def,
      startX: 0,
      startY: 0,
      startVx: 0,
      startVy: 0,
    });
  }
  const f = _fighterTypePreviewCache[type];
  f.x = 0;
  f.y = 0;
  f.vx = 0;
  f.vy = 0;
  f.z = 0;
  f.angle = targetAngle;
  f.gunAngle = targetAngle;
  f.rightGunAngle = targetAngle;
  f.leftGunAngle = targetAngle;
  f.shootCooldown = 0;
  f.cooldown = 0;
  f.combatAuraOpacity = 1.0;
  f._isFaceOff = true;
  f._isWinnerReveal = false;
  f.hideHpText = true;
  f.hideHands = false;
  f.hideFrontHand = false;
  f.hideBackHand = false;
  f.afterImages = [];
  f.attackCooldown = 0;
  f.attackSwingTimer = 0;

  if (type === 'trickster') {
    f.tkTarget = null;
    f.tkTimer = 0;
    f.stolenType = null;
    f.stolenWindUpTimer = 0;
    f.beamCharge = 0;
    f.beamTimer = 0;
    f.activePullActive = false;
    f.flurryHitsLeft = 0;
    f.flurryTimer = 0;
    f.stormActive = false;
  } else if (type === 'gojo') {
    f.isMeleeMode = true;
    f.orbTransition = 0;
    f.hideWeapon = true;
    f.hideHands = true;
    f.hideFrontHand = true;
    f.hideBackHand = true;
    f.redEffectTimer = 0;
    f.domainActive = false;
  } else if (type === 'sukuna') {
    f.hideHands = true;
    f.hideFrontHand = true;
    f.hideBackHand = true;
    f.combatAuraOpacity = 1.0;
  } else if (type === 'yuta' || type === 'yuji') {
    f.combatAuraOpacity = 1.0;
  }

  return f;
}

/** Audio SFX Trigger Helper for Face-Off Sequences */
export function triggerFaceOffSFX(soundName, volume = 0.25) {
  if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
    audioSystem.playSFX(soundName, volume);
  }
}

/** Direct full-resolution PNG capture & download for YouTube / Showcase thumbnails */
export function captureFaceOffScreenshot() {
  const canvas = state.canvas;
  if (!canvas) return;
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const currentDefs = getActiveFighterDefs();
    const p1Name = currentDefs[state.p1Index]?.name || 'Fighter-1';
    const p2Name = currentDefs[state.p2Index]?.name || 'Fighter-2';
    link.download = `circle-battle-thumbnail-${p1Name}-vs-${p2Name}.png`.toLowerCase().replace(/\s+/g, '-');
    link.href = dataUrl;
    link.click();

    state.faceOffSavedToastTimer = 140;
    triggerFaceOffSFX('skill_dash5', 0.25);
  } catch (e) {
    console.error('Failed to export thumbnail PNG:', e);
  }
}

/** Main entry point for drawing the Face-Off & Countdown Overlay Screen */
export function drawFaceOffThumbnailScreen() {
  const { ctx, canvas } = state;
  _clearButtons();

  ctx.resetTransform();
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const timer = state.faceOffTimer || 0;
  const scale = state.faceOffScale || 1.35;
  const mode = state.mode || GAME_MODES.ONE_VS_ONE;
  const exitProgress = Math.min(1.0, Math.max(0, (timer - 216) / 24));

  // Resolve fighter definitions and theme colors
  const currentDefs = getActiveFighterDefs();
  const p1Def = currentDefs[state.p1Index] || currentDefs[0] || FIGHTER_DEFS[0];
  const p2Def = currentDefs[state.p2Index] || currentDefs[1] || currentDefs[0];
  const p3Def = currentDefs[state.p3Index] || currentDefs[2] || currentDefs[0];
  const p4Def = currentDefs[state.p4Index] || currentDefs[3] || currentDefs[0];

  let leftThemeColor = p1Def?.color || '#38bdf8';
  let rightThemeColor = p2Def?.color || '#e51a2e';

  const t1 = Math.min(1.0, timer / 38);
  const k1 = Math.min(16, Math.round(16 * (1 - Math.pow(1 - t1, 3.8))));
  const rollP1Def = getStripFighterDef(k1, 16, p1Def, 3);
  leftThemeColor = rollP1Def?.color || leftThemeColor;

  const t2 = Math.min(1.0, timer / 58);
  const k2 = Math.min(22, Math.round(22 * (1 - Math.pow(1 - t2, 3.8))));
  const rollP2Def = getStripFighterDef(k2, 22, p2Def, 7);
  rightThemeColor = rollP2Def?.color || rightThemeColor;

  if (timer <= 2) {
    clearHealthHud();
    state._hasPlayedCjFaceOffIntroVoice = false;
  }

  // Play CJ intro voiceline ONCE when the countdown in the show-off screen is about to end
  if (timer >= 180 && !state._hasPlayedCjFaceOffIntroVoice) {
    const hasCj = [p1Def, p2Def, p3Def, p4Def].some(d => d && (d.type === 'cj' || d.id === 'cj'));
    if (hasCj) {
      state._hasPlayedCjFaceOffIntroVoice = true;
      const cjSnd = CONFIG.cj?.sounds?.introVoiceline || 'Assets/Sound Effects/Skills/cj-intro-voiceline.mp3';
      const cjVol = CONFIG.cj?.soundVolumes?.introVoiceline ?? 3.0;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX(cjSnd, cjVol);
      }
    }
  }

  // Full-Screen Click to skip straight to "FIGHT!" and enter arena
  _registerButton(0, 0, canvas.width, canvas.height, () => {
    proceedFromFaceOffToCountdown();
  });

  // 1. Draw Anime Grunge Background (4-Way Zigzag Split for FFA, Diagonal 2-Way Split for others)
  const isFFA = (mode === GAME_MODES.FFA || mode === 'FFA' || mode === GAME_MODES.TACTICAL_FFA || mode === 'Tactical FFA');
  if (isFFA) {
    const ffaColors = [
      p1Def?.color || '#3b82f6',
      p2Def?.color || '#10b981',
      p3Def?.color || '#f59e0b',
      p4Def?.color || '#ef4444'
    ];
    drawFfaAnimeGrungeZigzagBackground(ctx, canvas.width, canvas.height, ffaColors, timer);
    drawFfaFaceOff(ctx, canvas.width, canvas.height, [p1Def, p2Def, p3Def, p4Def], scale, timer, exitProgress);
  } else {
    drawAnimeGrungeSplitBackground(ctx, canvas.width, canvas.height, leftThemeColor, rightThemeColor, timer);

    // 2. Render Mode-Specific Side-by-Side Face-Off Layout with "VS" to Countdown Transition
    if (mode === GAME_MODES.STAND_OFF_1V2 || mode === '1v2 Stand Off' || mode === '1v2') {
      draw1v2FaceOff(ctx, canvas.width, canvas.height, p1Def, p2Def, p3Def, scale, timer, leftThemeColor, rightThemeColor, exitProgress);
    } else if (mode === GAME_MODES.TWO_VS_TWO || mode === '2v2' || mode === GAME_MODES.TACTICAL_2V2 || mode === 'Tactical 2v2') {
      draw2v2FaceOff(ctx, canvas.width, canvas.height, p1Def, p3Def, p2Def, p4Def, scale, timer, leftThemeColor, rightThemeColor, exitProgress);
    } else if (mode === 'TLFS') {
      drawTlfsFaceOff(ctx, canvas.width, canvas.height, p1Def, p2Def, scale, timer, leftThemeColor, rightThemeColor, exitProgress);
    } else {
      // Default: 1v1 Duel / Stand Off / Tactical 1v1 / Tactical Standoff
      draw1v1FaceOff(ctx, canvas.width, canvas.height, p1Def, p2Def, scale, timer, leftThemeColor, rightThemeColor, exitProgress);
    }
  }

  // 3. Draw Spatial Slash Shockwave & Flash Dissolve during Final FIGHT! Exit
  if (exitProgress > 0) {
    drawExitArenaTransitionWipe(ctx, canvas.width, canvas.height, exitProgress, leftThemeColor, rightThemeColor);
  }

  // 4. Draw Screenshot Saved Toast Notification (if triggered)
  if (state.faceOffSavedToastTimer > 0) {
    drawSavedToast(ctx, canvas.width, canvas.height, state.faceOffSavedToastTimer, leftThemeColor, rightThemeColor);
  }
}

/** Renders the Static Background Elements onto a Cached Offscreen Canvas */
function renderCachedBackground(width, height, leftColor, rightColor) {
  if (!_bgCacheCanvas) {
    _bgCacheCanvas = document.createElement('canvas');
    _bgCacheCtx = _bgCacheCanvas.getContext('2d');
  }
  if (_bgCacheCanvas.width !== width || _bgCacheCanvas.height !== height) {
    _bgCacheCanvas.width = width;
    _bgCacheCanvas.height = height;
  }

  const ctx = _bgCacheCtx;
  ctx.clearRect(0, 0, width, height);

  // ── Step 1: Base Left Domain (Deep Moody Obsidian Tinted with Fighter 1's Color) ──
  const leftBgGrad = ctx.createLinearGradient(0, 0, width * 0.6, height);
  const darkLeft1 = adjustBrightness(leftColor, -88);
  leftBgGrad.addColorStop(0, '#040508');
  leftBgGrad.addColorStop(0.5, darkLeft1);
  leftBgGrad.addColorStop(1, '#030406');
  ctx.fillStyle = leftBgGrad;
  ctx.fillRect(0, 0, width, height);

  // Left Ambient Energy Bloom (Subtle & Moody)
  const leftBloom = ctx.createRadialGradient(width * 0.22, height * 0.44, 20, width * 0.22, height * 0.44, width * 0.48);
  leftBloom.addColorStop(0, hexToRgba(leftColor, 0.24));
  leftBloom.addColorStop(0.55, hexToRgba(leftColor, 0.06));
  leftBloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = leftBloom;
  ctx.fillRect(0, 0, width, height);

  // ── Step 2: Diagonal Right Domain (Deep, Rich, Slightly Dark Shade of Fighter 2's Color) ──
  const topSplitX = width * 0.62;
  const botSplitX = width * 0.38;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(topSplitX, 0);
  ctx.lineTo(width, 0);
  ctx.lineTo(width, height);
  ctx.lineTo(botSplitX, height);
  ctx.closePath();

  const rightGrad = ctx.createLinearGradient(botSplitX, height, width, 0);
  const deepDarkRight = adjustBrightness(rightColor, -65);
  const midDarkRight = adjustBrightness(rightColor, -48);
  const topDarkRight = adjustBrightness(rightColor, -35);
  rightGrad.addColorStop(0, deepDarkRight);
  rightGrad.addColorStop(0.5, midDarkRight);
  rightGrad.addColorStop(1, topDarkRight);
  ctx.fillStyle = rightGrad;
  ctx.fill();
  ctx.restore();

  // Right Ambient Energy Bloom (Moody & Saturated)
  const rightBloom = ctx.createRadialGradient(width * 0.78, height * 0.44, 20, width * 0.78, height * 0.44, width * 0.48);
  rightBloom.addColorStop(0, hexToRgba(rightColor, 0.28));
  rightBloom.addColorStop(0.55, hexToRgba(rightColor, 0.08));
  rightBloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rightBloom;
  ctx.fillRect(0, 0, width, height);

  // ── Step 3: Halftone Dot Patterns ──
  drawHalftoneGrid(ctx, 0, 0, width * 0.45, height * 0.40, hexToRgba(leftColor, 0.15), true);
  drawHalftoneGrid(ctx, width * 0.55, height * 0.60, width * 0.45, height * 0.40, 'rgba(0, 0, 0, 0.40)', false);

  // ── Step 4: Grunge Paint Splatters & Diagonal Brush Streaks ──
  drawGrungeBrushStrokes(ctx, width, height, topSplitX, botSplitX, leftColor, rightColor);

  // ── Step 5: Floating Triangles & Debris Specks ──
  drawFloatingActionDebris(ctx, width, height, leftColor, rightColor);
}

/** Draws the Dynamic Anime Grunge Split Background with High-Performance Offscreen Caching */
function drawAnimeGrungeSplitBackground(ctx, width, height, leftColor, rightColor, timer) {
  if (!_floatingDebris || _floatingDebris.length === 0) {
    initDebrisAndScratches(width, height);
  }

  const bgKey = `${width}_${height}_${leftColor}_${rightColor}`;
  if (bgKey !== _lastBgKey || !_bgCacheCanvas) {
    _lastBgKey = bgKey;
    renderCachedBackground(width, height, leftColor, rightColor);
  }

  // 1-Call Blit of the pre-rendered background
  if (_bgCacheCanvas) {
    ctx.drawImage(_bgCacheCanvas, 0, 0);
  }

  // Dynamic Jagged White Lightning Fracture Seam
  const topSplitX = width * 0.62;
  const botSplitX = width * 0.38;
  drawJaggedLightningCrack(ctx, width, height, topSplitX, botSplitX, timer);
}

/** Horizontal zigzag coordinates for FFA 4-way screen division */
function getFfaHorizontalZigzagPoints(width, midY) {
  return [
    { x: 0,             y: midY },
    { x: width * 0.12,  y: midY - 14 },
    { x: width * 0.22,  y: midY + 16 },
    { x: width * 0.35,  y: midY - 18 },
    { x: width * 0.50,  y: midY },
    { x: width * 0.65,  y: midY + 18 },
    { x: width * 0.78,  y: midY - 16 },
    { x: width * 0.88,  y: midY + 14 },
    { x: width,         y: midY }
  ];
}

/** Vertical zigzag coordinates for FFA 4-way screen division */
function getFfaVerticalZigzagPoints(height, midX) {
  return [
    { x: midX,        y: 0 },
    { x: midX - 16,   y: height * 0.14 },
    { x: midX + 18,   y: height * 0.28 },
    { x: midX,        y: height * 0.44 },
    { x: midX - 18,   y: height * 0.60 },
    { x: midX + 16,   y: height * 0.76 },
    { x: midX - 12,   y: height * 0.90 },
    { x: midX,        y: height }
  ];
}

/** Renders the FFA 4-Way Background with 4 Distinct Theme Colors & Frames Occupying 100% of each section */
function renderCachedFfaBackground(width, height, colors) {
  if (!_ffaBgCacheCanvas) {
    _ffaBgCacheCanvas = document.createElement('canvas');
    _ffaBgCacheCtx = _ffaBgCacheCanvas.getContext('2d');
  }
  if (_ffaBgCacheCanvas.width !== width || _ffaBgCacheCanvas.height !== height) {
    _ffaBgCacheCanvas.width = width;
    _ffaBgCacheCanvas.height = height;
  }

  const ctx = _ffaBgCacheCtx;
  ctx.clearRect(0, 0, width, height);

  const midX = width * 0.5;
  const midY = height * 0.44;
  const hz = getFfaHorizontalZigzagPoints(width, midY);
  const vz = getFfaVerticalZigzagPoints(height, midX);

  const c0 = colors[0] || '#3b82f6';
  const c1 = colors[1] || '#10b981';
  const c2 = colors[2] || '#f59e0b';
  const c3 = colors[3] || '#ef4444';

  // Helper to render a fully saturated, rich, edge-to-edge theme domain inside a clipped quadrant
  const renderQuadrant = (clipFn, startX, startY, endX, endY, qX, qY, qW, qH, color) => {
    ctx.save();
    ctx.beginPath();
    clipFn();
    ctx.closePath();
    ctx.clip();

    // 1. Rich Edge-to-Edge Theme Color Gradient (100% coverage, no black voids)
    const deepDark = adjustBrightness(color, -70);
    const midDark = adjustBrightness(color, -44);
    const topVibrant = adjustBrightness(color, -22);

    const grad = ctx.createLinearGradient(startX, startY, endX, endY);
    grad.addColorStop(0, deepDark);
    grad.addColorStop(0.5, midDark);
    grad.addColorStop(1, topVibrant);
    ctx.fillStyle = grad;
    ctx.fillRect(qX - 50, qY - 50, qW + 100, qH + 100);

    // 2. High-Impact Ambient Energy Bloom across the whole frame
    const bloomCenterX = qX + qW * 0.5;
    const bloomCenterY = qY + qH * 0.5;
    const bloomRadius = Math.hypot(qW, qH) * 0.65;
    const bloom = ctx.createRadialGradient(bloomCenterX, bloomCenterY, 20, bloomCenterX, bloomCenterY, bloomRadius);
    bloom.addColorStop(0, hexToRgba(color, 0.48));
    bloom.addColorStop(0.45, hexToRgba(color, 0.22));
    bloom.addColorStop(0.85, hexToRgba(color, 0.06));
    bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(qX - 50, qY - 50, qW + 100, qH + 100);

    // 3. Full-Frame Halftone Dot Pattern
    drawHalftoneGrid(ctx, qX, qY, qW, qH, hexToRgba(color, 0.20), true);

    // 4. Subtle Inner Glow & Paint Strokes
    const cornerGrad = ctx.createRadialGradient(startX, startY, 10, startX, startY, qW * 0.8);
    cornerGrad.addColorStop(0, hexToRgba(color, 0.35));
    cornerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = cornerGrad;
    ctx.fillRect(qX - 50, qY - 50, qW + 100, qH + 100);

    ctx.restore();
  };

  // ── Quadrant 0: Top-Left (Fighter 1) ──
  renderQuadrant(
    () => {
      ctx.moveTo(0, 0);
      ctx.lineTo(midX, 0);
      for (let i = 0; i < vz.length; i++) {
        if (vz[i].y <= midY) ctx.lineTo(vz[i].x, vz[i].y);
      }
      for (let i = hz.length - 1; i >= 0; i--) {
        if (hz[i].x <= midX) ctx.lineTo(hz[i].x, hz[i].y);
      }
      ctx.lineTo(0, 0);
    },
    0, 0, midX, midY,
    0, 0, midX, midY,
    c0
  );

  // ── Quadrant 1: Top-Right (Fighter 2) ──
  renderQuadrant(
    () => {
      ctx.moveTo(midX, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, midY);
      for (let i = hz.length - 1; i >= 0; i--) {
        if (hz[i].x >= midX) ctx.lineTo(hz[i].x, hz[i].y);
      }
      for (let i = vz.length - 1; i >= 0; i--) {
        if (vz[i].y <= midY) ctx.lineTo(vz[i].x, vz[i].y);
      }
    },
    width, 0, midX, midY,
    midX, 0, width - midX, midY,
    c1
  );

  // ── Quadrant 2: Bottom-Left (Fighter 3) ──
  renderQuadrant(
    () => {
      ctx.moveTo(0, midY);
      for (let i = 0; i < hz.length; i++) {
        if (hz[i].x <= midX) ctx.lineTo(hz[i].x, hz[i].y);
      }
      for (let i = 0; i < vz.length; i++) {
        if (vz[i].y >= midY) ctx.lineTo(vz[i].x, vz[i].y);
      }
      ctx.lineTo(0, height);
      ctx.lineTo(0, midY);
    },
    0, height, midX, midY,
    0, midY, midX, height - midY,
    c2
  );

  // ── Quadrant 3: Bottom-Right (Fighter 4) ──
  renderQuadrant(
    () => {
      ctx.moveTo(midX, midY);
      for (let i = 0; i < hz.length; i++) {
        if (hz[i].x >= midX) ctx.lineTo(hz[i].x, hz[i].y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(midX, height);
      for (let i = vz.length - 1; i >= 0; i--) {
        if (vz[i].y >= midY) ctx.lineTo(vz[i].x, vz[i].y);
      }
    },
    width, height, midX, midY,
    midX, midY, width - midX, height - midY,
    c3
  );

  // Floating debris in all 4 colors
  drawFloatingFfaDebris(ctx, width, height, colors);
}

/** Draws the 4-way FFA Anime Grunge Zigzag Background */
function drawFfaAnimeGrungeZigzagBackground(ctx, width, height, colors, timer) {
  if (!_floatingDebris || _floatingDebris.length === 0) {
    initDebrisAndScratches(width, height);
  }

  const bgKey = `${width}_${height}_${colors.join('_')}`;
  if (bgKey !== _lastFfaBgKey || !_ffaBgCacheCanvas) {
    _lastFfaBgKey = bgKey;
    renderCachedFfaBackground(width, height, colors);
  }

  if (_ffaBgCacheCanvas) {
    ctx.drawImage(_ffaBgCacheCanvas, 0, 0);
  }

  const midX = width * 0.5;
  const midY = height * 0.44;
  drawFfaJaggedZigzagDividers(ctx, width, height, midX, midY, timer, colors);
}

/** Draws the sharp horizontal and vertical zigzag divider seams */
function drawFfaJaggedZigzagDividers(ctx, width, height, midX, midY, timer, colors) {
  ctx.save();

  const hz = getFfaHorizontalZigzagPoints(width, midY);
  const vz = getFfaVerticalZigzagPoints(height, midX);

  ctx.lineJoin = 'miter';
  ctx.miterLimit = 4;
  ctx.lineCap = 'square';

  const tracePath = (pts) => {
    ctx.beginPath();
    pts.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
  };

  // 1. Thick Solid Black Ink Backing
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 14.0;
  tracePath(hz);
  ctx.stroke();
  tracePath(vz);
  ctx.stroke();

  // 2. Outer White / Neon Glow Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 5.0;
  tracePath(hz);
  ctx.stroke();
  tracePath(vz);
  ctx.stroke();

  // 3. Middle Intense White Lightning Line
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.6;
  tracePath(hz);
  ctx.stroke();
  tracePath(vz);
  ctx.stroke();

  // 4. Center Diamond Intersection Emblem
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  const nodeR = 7.0;
  ctx.moveTo(midX, midY - nodeR);
  ctx.lineTo(midX + nodeR, midY);
  ctx.lineTo(midX, midY + nodeR);
  ctx.lineTo(midX - nodeR, midY);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** Draws floating geometric action debris in 4 FFA colors */
function drawFloatingFfaDebris(ctx, width, height, colors) {
  if (!_floatingDebris) return;

  ctx.save();
  _floatingDebris.forEach((d, idx) => {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rotation);
    ctx.globalAlpha = d.alpha * 0.9;

    ctx.beginPath();
    const r = d.size;
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.86, r * 0.5);
    ctx.lineTo(-r * 0.86, r * 0.5);
    ctx.closePath();

    const color = colors[idx % colors.length] || '#ffffff';
    if (d.isSolid) {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
  });
  ctx.restore();
}

/** Draws procedural halftone dot grids */
function drawHalftoneGrid(ctx, startX, startY, gridW, gridH, dotColor, invertDensity) {
  const spacing = 12;
  const cols = Math.floor(gridW / spacing);
  const rows = Math.floor(gridH / spacing);

  ctx.save();
  ctx.fillStyle = dotColor;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * spacing + (r % 2 === 0 ? 0 : spacing * 0.5);
      const y = startY + r * spacing;

      const normX = c / cols;
      const normY = r / rows;
      const dist = Math.hypot(normX, normY);
      const radiusFactor = invertDensity ? Math.max(0.2, 1.0 - dist * 0.8) : Math.max(0.2, dist * 0.85);
      const radius = Math.min(3.5, Math.max(0.8, radiusFactor * 3.2));

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Draws authentic anime grunge brush scratches & paint strokes along the diagonal split */
function drawGrungeBrushStrokes(ctx, width, height, topSplitX, botSplitX, leftColor, rightColor) {
  ctx.save();

  // 1. Heavy Left-Side Paint Spikes extending into the Right side
  ctx.fillStyle = adjustBrightness(leftColor, -65);
  const leftSplats = [
    { y: height * 0.22, length: 110, h: 26 },
    { y: height * 0.32, length: 140, h: 34 },
    { y: height * 0.48, length: 160, h: 48 },
    { y: height * 0.65, length: 125, h: 30 },
    { y: height * 0.78, length: 95,  h: 22 }
  ];

  leftSplats.forEach((s) => {
    const t = s.y / height;
    const splitX = topSplitX + (botSplitX - topSplitX) * t;

    ctx.beginPath();
    ctx.moveTo(splitX - 10, s.y - s.h / 2);
    ctx.lineTo(splitX + s.length, s.y);
    ctx.lineTo(splitX + s.length * 0.85, s.y + s.h * 0.2);
    ctx.lineTo(splitX + s.length * 0.95, s.y + s.h * 0.4);
    ctx.lineTo(splitX - 10, s.y + s.h / 2);
    ctx.closePath();
    ctx.fill();
  });

  // 2. Heavy Right-Side Paint Spikes extending into the Left side
  ctx.fillStyle = rightColor;
  const rightSplats = [
    { y: height * 0.15, length: 100, h: 22 },
    { y: height * 0.28, length: 130, h: 32 },
    { y: height * 0.42, length: 155, h: 42 },
    { y: height * 0.58, length: 135, h: 36 },
    { y: height * 0.72, length: 115, h: 28 },
    { y: height * 0.85, length: 85,  h: 20 }
  ];

  rightSplats.forEach((s) => {
    const t = s.y / height;
    const splitX = topSplitX + (botSplitX - topSplitX) * t;

    ctx.beginPath();
    ctx.moveTo(splitX + 10, s.y - s.h / 2);
    ctx.lineTo(splitX - s.length, s.y);
    ctx.lineTo(splitX - s.length * 0.85, s.y + s.h * 0.2);
    ctx.lineTo(splitX - s.length * 0.95, s.y + s.h * 0.4);
    ctx.lineTo(splitX + 10, s.y + s.h / 2);
    ctx.closePath();
    ctx.fill();
  });

  // 3. Fine Needle Speed Scratches across the scene
  if (_scratchLines) {
    _scratchLines.forEach(line => {
      const lx = width * line.startXRatio;
      const ly = height * line.startYRatio;
      const ex = lx + Math.cos(line.angle) * line.length;
      const ey = ly + Math.sin(line.angle) * line.length;

      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = line.isLeftColor ? leftColor : rightColor;
      ctx.globalAlpha = line.alpha;
      ctx.lineWidth = line.width;
      ctx.stroke();
    });
  }

  ctx.restore();
}

/** Draws the sharp, jagged white lightning bolt crack dividing the two domains */
function drawJaggedLightningCrack(ctx, width, height, topSplitX, botSplitX, timer) {
  ctx.save();

  const crackPoints = [
    { y: 0,              xOff: 0 },
    { y: height * 0.12,  xOff: -14 },
    { y: height * 0.18,  xOff: 18 },
    { y: height * 0.27,  xOff: -22 },
    { y: height * 0.36,  xOff: 26 },
    { y: height * 0.45,  xOff: -32 },
    { y: height * 0.54,  xOff: 30 },
    { y: height * 0.63,  xOff: -24 },
    { y: height * 0.72,  xOff: 20 },
    { y: height * 0.84,  xOff: -16 },
    { y: height * 0.93,  xOff: 12 },
    { y: height,         xOff: 0 }
  ];

  const crackProgress = Math.min(1.0, timer / 12);
  const visibleCount = Math.max(2, Math.floor(crackPoints.length * crackProgress));

  ctx.lineJoin = 'miter';
  ctx.miterLimit = 4;
  ctx.lineCap = 'square';

  ctx.beginPath();
  for (let i = 0; i < visibleCount; i++) {
    const pt = crackPoints[i];
    const t = pt.y / height;
    const baseSplitX = topSplitX + (botSplitX - topSplitX) * t;
    const px = baseSplitX + pt.xOff;
    const py = pt.y;

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  // 1. Thick Solid Black Ink Stroke Backing
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 13.0;
  ctx.stroke();

  // 2. Outer White Lightning Glow Stroke
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.70)';
  ctx.lineWidth = 5.0;
  ctx.stroke();

  // 3. Middle Intense Bright White Line
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.8;
  ctx.stroke();

  // 4. Inner Intense Bright White Core
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.restore();
}

/** Draws floating geometric action triangles & ink particles */
function drawFloatingActionDebris(ctx, width, height, leftColor, rightColor) {
  if (!_floatingDebris) return;

  ctx.save();
  _floatingDebris.forEach(d => {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rotation);
    ctx.globalAlpha = d.alpha;

    ctx.beginPath();
    const r = d.size;
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.86, r * 0.5);
    ctx.lineTo(-r * 0.86, r * 0.5);
    ctx.closePath();

    const color = d.colorType === 'left' ? leftColor : (d.colorType === 'right' ? rightColor : '#ffffff');

    if (d.isSolid) {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    ctx.restore();
  });
  ctx.restore();
}

// Dynamic variables for rolling animation
const _lastSlotMap = {};
const _lockedMap = {};
let _lastAudioTickTimer = -1;

function getStripFighterDef(slotIndex, totalSlots, targetDef, seed) {
  if (slotIndex >= totalSlots) return targetDef;
  const currentDefs = getActiveFighterDefs();
  const clampedIdx = Math.max(0, slotIndex);
  const hashIdx = (clampedIdx * 7 + seed) % currentDefs.length;
  return currentDefs[hashIdx] || targetDef;
}

function drawSmoothReelColumn(ctx, centerX, centerY, targetDef, slotKey, totalSlots, duration, timer, scale, themeColor, facingAngle, isLeft) {
  const slotH = 140 * (scale / 1.35);
  const totalDist = totalSlots * slotH;

  const t = Math.min(1.0, timer / duration);
  // Ultra-smooth quintic ease-out deceleration
  const easeProgress = 1 - Math.pow(1 - t, 3.8);
  const scrollY = totalDist * easeProgress;

  // Damped spring settle bounce on lock
  const settleTime = timer - duration;
  let bounceY = 0;
  if (settleTime >= 0 && settleTime < 16) {
    bounceY = Math.sin(settleTime * 0.48) * Math.exp(-settleTime * 0.28) * 10;
  }

  const isLocked = (t >= 1.0);
  const currentSlotFloat = scrollY / slotH;
  const baseSlot = Math.floor(currentSlotFloat);

  // Audio tick on each new slot entering center (throttled to max 1 SFX per frame)
  if (!isLocked && baseSlot !== _lastSlotMap[slotKey]) {
    _lastSlotMap[slotKey] = baseSlot;
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX && timer !== _lastAudioTickTimer) {
      _lastAudioTickTimer = timer;
      const vol = Math.min(0.25, 0.08 + (1 - t) * 0.16);
      audioSystem.playSFX('Assets/Sound Effects/Skills/cj-typeclick1letter-noise.mp3', vol);
    }
  }

  // Lock-in trigger SFX
  if (isLocked && !_lockedMap[slotKey]) {
    _lockedMap[slotKey] = true;
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('Assets/Sound Effects/Skills/parry.mp3', 0.60);
    }
  }

  // Render visible characters on the clean conveyor roll with smooth alpha falloff
  const maxReach = 135 * (scale / 1.35);
  const seed = (slotKey.charCodeAt(0) * 7 + (slotKey.charCodeAt(1) || 3) * 13) % 31;
  const nonTargetFade = isLocked ? 0 : (t > 0.75 ? Math.max(0, 1 - (t - 0.75) / 0.25) : 1.0);

  // If locked, we only draw the single finalized target fighter
  const startSlot = isLocked ? totalSlots : baseSlot - 1;
  const endSlot = isLocked ? totalSlots : baseSlot + 2;

  for (let k = startSlot; k <= endSlot; k++) {
    if (k < 0 || k > totalSlots) continue;

    const isFinalSlot = (k === totalSlots);
    if (isLocked && !isFinalSlot) continue;

    const slotDy = (currentSlotFloat - k) * slotH + bounceY;
    const dist = Math.abs(slotDy);
    if (!isLocked && dist > maxReach) continue;

    const def = getStripFighterDef(k, totalSlots, targetDef, seed);
    let itemAlpha = isLocked ? 1.0 : Math.max(0, Math.pow(1 - dist / maxReach, 1.8));
    if (!isFinalSlot) {
      itemAlpha *= nonTargetFade;
    }
    if (itemAlpha <= 0.005) continue;

    const itemScale = scale * (isLocked ? 1.0 : (1.0 - (dist / (maxReach * 1.3)) * 0.18));

    const f = getFaceOffFighter(isLocked ? slotKey : `${slotKey}_reel_${k % 8}`, def, facingAngle);
    if (f) {
      ctx.save();
      ctx.globalAlpha = itemAlpha;

      if (dist < 32 || isLocked) {
        drawEngineerStyleHeroGlow(ctx, centerX, centerY - (isLocked ? -bounceY : slotDy), f.r * itemScale, def.color || themeColor);
      }

      ctx.translate(centerX, centerY - (isLocked ? -bounceY : slotDy));
      ctx.scale(itemScale, itemScale);
      try {
        f.draw(ctx, null);
      } catch (e) {}
      ctx.restore();
    }
  }

  // Active Current Center Definition for Name Plate
  const centerK = Math.min(totalSlots, Math.round(currentSlotFloat));
  const activeDef = getStripFighterDef(centerK, totalSlots, targetDef, seed);
  return { activeDef, isLocked };
}

/** 1v1 Face-Off Layout: Dynamic Color Theming, Engineer Glows, Entrance & Arena Dash Exit */
function draw1v1FaceOff(ctx, width, height, p1Def, p2Def, scale, timer, leftColor, rightColor, exitProgress = 0) {
  const targetLeftX = width * 0.24;
  const targetRightX = width * 0.76;
  const centerY = height * 0.44;

  if (timer <= 1) {
    _lastSlotMap['p1'] = -1;
    _lastSlotMap['p2'] = -1;
    _lockedMap['p1'] = false;
    _lockedMap['p2'] = false;
  }

  let leftX = targetLeftX;
  let rightX = targetRightX;

  // ── High-Speed Dash Forward during Final "FIGHT!" Stage ──
  if (exitProgress > 0) {
    const easeExit = Math.pow(exitProgress, 2.2);
    leftX += easeExit * 340;
    rightX -= easeExit * 340;
  }

  // 1. Left Fighter (P1) Smooth Physics Reel Column
  ctx.save();
  if (exitProgress > 0.05) {
    drawExitDashSpeedLines(ctx, leftX - 60, centerY, 140, leftColor, exitProgress);
  }
  const { activeDef: activeP1Def } = drawSmoothReelColumn(
    ctx, leftX, centerY, p1Def, 'p1', 16, 38, timer, scale, leftColor, 0, true
  );
  ctx.restore();

  // P1 Fighter Name Plate
  const nameY = centerY + 120 * (scale / 1.35);
  const p1NameAlpha = Math.max(0, 1 - exitProgress * 2.5);
  if (p1NameAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = p1NameAlpha;
    drawFighterCleanName(ctx, leftX, nameY, activeP1Def?.name || '', activeP1Def?.color || leftColor);
    ctx.restore();
  }

  // 2. Right Fighter (P2) Smooth Physics Reel Column
  ctx.save();
  if (exitProgress > 0.05) {
    drawExitDashSpeedLines(ctx, rightX + 60, centerY, -140, rightColor, exitProgress);
  }
  const { activeDef: activeP2Def } = drawSmoothReelColumn(
    ctx, rightX, centerY, p2Def, 'p2', 22, 58, timer, scale, rightColor, Math.PI, false
  );
  ctx.restore();

  // P2 Fighter Name Plate
  const p2NameAlpha = Math.max(0, 1 - exitProgress * 2.5);
  if (p2NameAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = p2NameAlpha;
    drawFighterCleanName(ctx, rightX, nameY, activeP2Def?.name || '', activeP2Def?.color || rightColor);
    ctx.restore();
  }

  // 3. Center "VS" to Countdown Transition (VS -> 3 -> 2 -> 1 -> FIGHT!) with Standoff Pause Frame
  if (timer >= 96) {
    drawCenterUnifiedCountdown(ctx, width / 2, centerY, timer, activeP1Def?.color || leftColor, activeP2Def?.color || rightColor, exitProgress);
  }
}

/** 1v2 Stand Off Layout */
function draw1v2FaceOff(ctx, width, height, p1Def, p2Def, p3Def, scale, timer, leftColor, rightColor, exitProgress = 0) {
  const targetLeftX = width * 0.24;
  const targetRightX = width * 0.76;
  const centerY = height * 0.44;

  // Unified scale: Everyone (Solo P1, Duo P2, Duo P3) has the exact same scale size in 1v2 showoff
  const unifiedScale = scale * 0.96;

  const duo1Y = centerY - 82;
  const duo2Y = centerY + 82;

  if (timer <= 1) {
    _lastSlotMap['p1'] = -1;
    _lastSlotMap['p2'] = -1;
    _lastSlotMap['p3'] = -1;
    _lockedMap['p1'] = false;
    _lockedMap['p2'] = false;
    _lockedMap['p3'] = false;
  }

  let leftX = targetLeftX;
  let d1X = targetRightX;
  let d2X = targetRightX;

  if (exitProgress > 0) {
    const easeExit = Math.pow(exitProgress, 2.2);
    leftX += easeExit * 340;
    d1X -= easeExit * 340;
    d2X -= easeExit * 340;
  }

  // 1. Solo Boss (Left) - Staggered lock 1 (36)
  ctx.save();
  if (exitProgress > 0.05) {
    drawExitDashSpeedLines(ctx, leftX - 60, centerY, 140, leftColor, exitProgress);
  }
  const { activeDef: activeP1Def } = drawSmoothReelColumn(
    ctx, leftX, centerY, p1Def, 'p1', 16, 36, timer, unifiedScale, leftColor, 0, true
  );
  ctx.restore();

  // Solo Boss Name Plate (directly below Solo fighter)
  const soloNameY = centerY + 78 * (unifiedScale / 1.35);
  const soloNameAlpha = Math.max(0, 1 - exitProgress * 2.5);
  if (soloNameAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = soloNameAlpha;
    drawFighterCleanName(ctx, leftX, soloNameY, activeP1Def?.name || '', activeP1Def?.color || leftColor, 1.0);
    ctx.restore();
  }

  // 2. Duo 1 (Top Right) - Staggered lock 2 (48)
  ctx.save();
  if (exitProgress > 0.05) {
    drawExitDashSpeedLines(ctx, d1X + 60, duo1Y, -140, p2Def?.color || rightColor, exitProgress);
  }
  const { activeDef: activeP2Def } = drawSmoothReelColumn(
    ctx, d1X, duo1Y, p2Def, 'p2', 20, 48, timer, unifiedScale, p2Def?.color || rightColor, Math.PI, false
  );
  ctx.restore();

  // Duo 1 Name Plate (displayed directly at Duo 1's bottom)
  const duo1NameY = duo1Y + 54 * (unifiedScale / 1.35);
  const duo1NameAlpha = Math.max(0, 1 - exitProgress * 2.5);
  if (duo1NameAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = duo1NameAlpha;
    drawFighterCleanName(ctx, d1X, duo1NameY, activeP2Def?.name || '', activeP2Def?.color || p2Def?.color || rightColor, 0.82);
    ctx.restore();
  }

  // 3. Duo 2 (Bottom Right) - Staggered lock 3 (60)
  ctx.save();
  if (exitProgress > 0.05) {
    drawExitDashSpeedLines(ctx, d2X + 60, duo2Y, -140, p3Def?.color || rightColor, exitProgress);
  }
  const { activeDef: activeP3Def } = drawSmoothReelColumn(
    ctx, d2X, duo2Y, p3Def, 'p3', 24, 60, timer, unifiedScale, p3Def?.color || rightColor, Math.PI, false
  );
  ctx.restore();

  // Duo 2 Name Plate (displayed directly at Duo 2's bottom)
  const duo2NameY = duo2Y + 54 * (unifiedScale / 1.35);
  const duo2NameAlpha = Math.max(0, 1 - exitProgress * 2.5);
  if (duo2NameAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = duo2NameAlpha;
    drawFighterCleanName(ctx, d2X, duo2NameY, activeP3Def?.name || '', activeP3Def?.color || p3Def?.color || rightColor, 0.82);
    ctx.restore();
  }

  // 4. Center "1 VS 2" to Countdown Transition
  if (timer >= 96) {
    drawCenterUnifiedCountdown(ctx, width / 2, centerY, timer, activeP1Def?.color || leftColor, rightColor, exitProgress, '1 VS 2');
  }
}

/** 2v2 Team Battle Layout */
function draw2v2FaceOff(ctx, width, height, t1p1Def, t1p2Def, t2p1Def, t2p2Def, scale, timer, leftColor, rightColor, exitProgress = 0) {
  const targetLeftX = width * 0.24;
  const targetRightX = width * 0.76;
  const centerY = height * 0.44;

  const teamScale = scale * 0.88;
  const topY = centerY - 65;
  const botY = centerY + 65;

  if (timer <= 1) {
    _lastSlotMap['p1'] = -1;
    _lastSlotMap['p3'] = -1;
    _lastSlotMap['p2'] = -1;
    _lastSlotMap['p4'] = -1;
    _lockedMap['p1'] = false;
    _lockedMap['p3'] = false;
    _lockedMap['p2'] = false;
    _lockedMap['p4'] = false;
  }

  let leftX = targetLeftX;
  let rightX = targetRightX;

  if (exitProgress > 0) {
    const easeExit = Math.pow(exitProgress, 2.2);
    leftX += easeExit * 340;
    rightX -= easeExit * 340;
  }

  // Team 1 Top (P1) - Lock at 34
  ctx.save();
  if (exitProgress > 0.05) {
    drawExitDashSpeedLines(ctx, leftX - 60, topY, 140, leftColor, exitProgress);
  }
  const { activeDef: activeT1P1Def } = drawSmoothReelColumn(
    ctx, leftX, topY, t1p1Def, 'p1', 14, 34, timer, teamScale, leftColor, 0, true
  );
  ctx.restore();

  // Team 1 Bot (P3) - Lock at 44
  ctx.save();
  if (exitProgress > 0.05) {
    drawExitDashSpeedLines(ctx, leftX - 60, botY, 140, t1p2Def?.color || leftColor, exitProgress);
  }
  const { activeDef: activeT1P2Def } = drawSmoothReelColumn(
    ctx, leftX, botY, t1p2Def, 'p3', 18, 44, timer, teamScale, t1p2Def?.color || leftColor, 0, true
  );
  ctx.restore();

  // Team 1 Combined Name
  const t1NameY = centerY + 135;
  const t1NameAlpha = Math.max(0, 1 - exitProgress * 2.5);
  if (t1NameAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = t1NameAlpha;
    drawFighterCleanName(ctx, leftX, t1NameY, `${activeT1P1Def?.name || ''} & ${activeT1P2Def?.name || ''}`, leftColor);
    ctx.restore();
  }

  // Team 2 Top (P2) - Lock at 54
  ctx.save();
  if (exitProgress > 0.05) {
    drawExitDashSpeedLines(ctx, rightX + 60, topY, -140, rightColor, exitProgress);
  }
  const { activeDef: activeT2P1Def } = drawSmoothReelColumn(
    ctx, rightX, topY, t2p1Def, 'p2', 22, 54, timer, teamScale, rightColor, Math.PI, false
  );
  ctx.restore();

  // Team 2 Bot (P4) - Lock at 64
  ctx.save();
  if (exitProgress > 0.05) {
    drawExitDashSpeedLines(ctx, rightX + 60, botY, -140, t2p2Def?.color || rightColor, exitProgress);
  }
  const { activeDef: activeT2P2Def } = drawSmoothReelColumn(
    ctx, rightX, botY, t2p2Def, 'p4', 26, 64, timer, teamScale, t2p2Def?.color || rightColor, Math.PI, false
  );
  ctx.restore();

  // Team 2 Combined Name
  const t2NameY = centerY + 135;
  const t2NameAlpha = Math.max(0, 1 - exitProgress * 2.5);
  if (t2NameAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = t2NameAlpha;
    drawFighterCleanName(ctx, rightX, t2NameY, `${activeT2P1Def?.name || ''} & ${activeT2P2Def?.name || ''}`, rightColor);
    ctx.restore();
  }

  if (timer >= 96) {
    drawCenterUnifiedCountdown(ctx, width / 2, centerY, timer, leftColor, rightColor, exitProgress, '2 VS 2');
  }
}

/** FFA 4-Way Arena Layout */
function drawFfaFaceOff(ctx, width, height, defs, scale, timer, exitProgress = 0) {
  const cx = width / 2;
  const cy = height * 0.44;
  const ffaScale = scale * 0.82;
  const spreadX = width * 0.25;
  const spreadY = 65;

  const positions = [
    { targetX: cx - spreadX, targetY: cy - spreadY, angle: 0.35, slots: 14, duration: 34, labelY: cy - spreadY + 48 },
    { targetX: cx + spreadX, targetY: cy - spreadY, angle: Math.PI - 0.35, slots: 18, duration: 44, labelY: cy - spreadY + 48 },
    { targetX: cx - spreadX, targetY: cy + spreadY, angle: -0.35, slots: 22, duration: 54, labelY: cy + spreadY + 48 },
    { targetX: cx + spreadX, targetY: cy + spreadY, angle: Math.PI + 0.35, slots: 26, duration: 64, labelY: cy + spreadY + 48 }
  ];

  if (timer <= 1) {
    positions.forEach((_, i) => {
      _lastSlotMap[`ffa_${i}`] = -1;
      _lockedMap[`ffa_${i}`] = false;
    });
  }

  const activeDefs = [];
  defs.forEach((def, i) => {
    if (!def) return;
    const pos = positions[i];
    let currX = pos.targetX;
    let currY = pos.targetY;

    if (exitProgress > 0) {
      const easeExit = Math.pow(exitProgress, 2.2);
      currX += (cx - currX) * easeExit * 1.5;
      currY += (cy - currY) * easeExit * 1.5;
    }

    ctx.save();
    const { activeDef } = drawSmoothReelColumn(
      ctx, currX, currY, def, `ffa_${i}`, pos.slots, pos.duration, timer, ffaScale, def.color || '#f59e0b', pos.angle, i % 2 === 0
    );
    ctx.restore();

    const finalDef = activeDef || def;
    activeDefs.push(finalDef);

    // Draw individual fighter nameplate inside their own quadrant frame
    if (exitProgress < 0.6) {
      const nameAlpha = Math.max(0, 1 - exitProgress * 2.0);
      ctx.save();
      ctx.globalAlpha = nameAlpha;
      drawFighterCleanName(ctx, currX, pos.labelY, finalDef.name, finalDef.color || '#ffffff', 0.80);
      ctx.restore();
    }
  });

  if (timer >= 96) {
    const isTactical = (state.gameCategory === 'tactical' || state.mode === 'Tactical FFA' || state.mode === GAME_MODES.TACTICAL_FFA);
    const badgeText = isTactical ? 'TACTICAL FFA' : 'FFA';
    drawCenterUnifiedCountdown(ctx, cx, cy, timer, activeDefs[0]?.color || '#f59e0b', activeDefs[1]?.color || '#3b82f6', exitProgress, badgeText);
  }
}

/** TLFS Gauntlet Mode Layout */
function drawTlfsFaceOff(ctx, width, height, p1Def, enemyDef, scale, timer, leftColor, rightColor, exitProgress = 0) {
  draw1v1FaceOff(ctx, width, height, p1Def, enemyDef, scale, timer, leftColor, rightColor, exitProgress);
}

/** Speed lines streaming behind fighters during the exit dash */
function drawExitDashSpeedLines(ctx, startX, startY, length, color, progress) {
  ctx.save();
  ctx.strokeStyle = hexToRgba(color, 0.7 * progress);
  ctx.lineWidth = 2.5;
  for (let i = -3; i <= 3; i++) {
    const yOff = i * 14;
    const len = length * (0.6 + Math.abs(i) * 0.1);
    ctx.beginPath();
    ctx.moveTo(startX, startY + yOff);
    ctx.lineTo(startX - len, startY + yOff);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Multi-Layered Engineer-Style Holographic Hero Glow System
 */
function drawEngineerStyleHeroGlow(ctx, cx, cy, radius, glowColor = '#38bdf8') {
  ctx.save();
  ctx.translate(cx, cy);

  // ── 1. Volumetric Back Silhouette Body Bloom ──
  const backBloom = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius * 2.2);
  backBloom.addColorStop(0, hexToRgba(glowColor, 0.70));
  backBloom.addColorStop(0.35, hexToRgba(glowColor, 0.40));
  backBloom.addColorStop(0.70, hexToRgba(glowColor, 0.12));
  backBloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = backBloom;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  // ── 2. Ground Oval Drop Shadow Base ──
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.95, radius * 1.35, radius * 0.45, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fill();

  // ── 3. Translucent Radial Holographic Floor Fill ──
  const floorFill = ctx.createRadialGradient(0, radius * 0.95, 6, 0, radius * 0.95, radius * 1.8);
  floorFill.addColorStop(0, hexToRgba(glowColor, 0.55));
  floorFill.addColorStop(0.55, hexToRgba(glowColor, 0.20));
  floorFill.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = floorFill;
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.95, radius * 1.8, radius * 0.60, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── 4. Multi-Layered Perimeter Boundary Rings ──
  ctx.strokeStyle = hexToRgba(glowColor, 0.28);
  ctx.lineWidth = 6.0;
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.95, radius * 1.55, radius * 0.52, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = hexToRgba(glowColor, 0.85);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.95, radius * 1.55, radius * 0.52, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.95, radius * 1.55, radius * 0.52, 0, 0, Math.PI * 2);
  ctx.stroke();

  // ── 5. Inner Concentric Ripple Ring ──
  ctx.strokeStyle = hexToRgba(glowColor, 0.50);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.95, radius * 1.05, radius * 0.35, 0, 0, Math.PI * 2);
  ctx.stroke();

  // ── 6. Tactical Holographic Cross / Diamond Tech Nodes ──
  const rx = radius * 1.55;
  const ry = radius * 0.52;
  const nodes = [
    { x: -rx, y: radius * 0.95 },
    { x: rx,  y: radius * 0.95 },
    { x: 0,   y: radius * 0.95 - ry },
    { x: 0,   y: radius * 0.95 + ry }
  ];

  nodes.forEach(n => {
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(n.x, n.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

/**
 * Unified Center Emblem: Transitions "VS" -> 3 -> 2 -> 1 -> FIGHT!
 */
function drawCenterUnifiedCountdown(ctx, cx, cy, timer, leftColor = '#38bdf8', rightColor = '#e51a2e', exitProgress = 0, customLabel = 'VS') {
  // Stage 1: "VS" Initial Clash (Timer 96 - 126)
  if (timer < 126) {
    const prog = Math.min(1.0, (timer - 96) / 18);
    const ease = easeOutBack(prog);
    drawAnimeBrushVsClash(ctx, cx, cy, customLabel, ease, leftColor, rightColor);
    return;
  }

  // Stage 2: Countdown "3" (Timer 126 - 156)
  if (timer < 156) {
    const prog = Math.min(1.0, (timer - 126) / 16);
    const ease = easeOutBack(prog);
    drawCountdownDigit(ctx, cx, cy, '3', ease, leftColor, rightColor);
    return;
  }

  // Stage 3: Countdown "2" (Timer 156 - 186)
  if (timer < 186) {
    const prog = Math.min(1.0, (timer - 156) / 16);
    const ease = easeOutBack(prog);
    drawCountdownDigit(ctx, cx, cy, '2', ease, leftColor, rightColor);
    return;
  }

  // Stage 4: Countdown "1" (Timer 186 - 216)
  if (timer < 216) {
    const prog = Math.min(1.0, (timer - 186) / 16);
    const ease = easeOutBack(prog);
    drawCountdownDigit(ctx, cx, cy, '1', ease, leftColor, rightColor);
    return;
  }

  // Stage 5: Final "FIGHT!" Burst (Timer 216+)
  const prog = Math.min(1.0, (timer - 216) / 16);
  const ease = easeOutBack(prog);
  drawCountdownDigit(ctx, cx, cy, 'FIGHT!', ease, leftColor, rightColor, exitProgress);
}

/** Draws the animated "VS" Brush Letters */
function drawAnimeBrushVsClash(ctx, cx, cy, label, ease, leftColor, rightColor) {
  ctx.save();
  ctx.translate(cx, cy);

  // 1. Central Flare Bloom
  const flare = ctx.createRadialGradient(0, 0, 10, 0, 0, 110);
  flare.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  flare.addColorStop(0.35, hexToRgba(leftColor, 0.45));
  flare.addColorStop(0.70, hexToRgba(rightColor, 0.25));
  flare.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = flare;
  ctx.beginPath();
  ctx.arc(0, 0, 110, 0, Math.PI * 2);
  ctx.fill();

  // 2. Ink Splatter Explosion Burst (Pre-computed polygon points)
  const inkScale = Math.min(1.0, ease);
  ctx.save();
  ctx.scale(inkScale, inkScale);
  ctx.fillStyle = '#06070a';
  ctx.beginPath();
  for (let i = 0; i < _inkSplatterPoints.length; i++) {
    const pt = _inkSplatterPoints[i];
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }
  ctx.closePath();
  ctx.fill();

  for (let s = 0; s < _splatterDots.length; s++) {
    const dot = _splatterDots[s];
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
    ctx.fillStyle = dot.isLeft ? leftColor : rightColor;
    ctx.fill();
  }
  ctx.restore();

  // 3. Render Brush Letters "V" & "S"
  if (label === 'VS') {
    const vOffset = (1 - ease) * 80;
    ctx.save();
    ctx.translate(-24 - vOffset, -vOffset * 0.5);

    ctx.strokeStyle = hexToRgba(leftColor, 0.40);
    ctx.lineWidth = 14;
    ctx.font = '900 68px "Permanent Marker", "Bangers", "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('V', 0, 2);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeText('V', 0, 2);

    ctx.fillStyle = leftColor;
    ctx.fillText('V', 0, 2);

    ctx.fillStyle = adjustBrightness(leftColor, +45);
    ctx.font = '900 64px "Permanent Marker", "Bangers", "Outfit", sans-serif';
    ctx.fillText('V', -1, 0);
    ctx.restore();

    const sOffset = (1 - ease) * 80;
    ctx.save();
    ctx.translate(22 + sOffset, 2 + sOffset * 0.5);

    ctx.strokeStyle = hexToRgba(rightColor, 0.40);
    ctx.lineWidth = 14;
    ctx.font = '900 68px "Permanent Marker", "Bangers", "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('S', 0, 0);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeText('S', 0, 0);

    ctx.fillStyle = rightColor;
    ctx.fillText('S', 0, 0);

    ctx.fillStyle = adjustBrightness(rightColor, +45);
    ctx.font = '900 64px "Permanent Marker", "Bangers", "Outfit", sans-serif';
    ctx.fillText('S', 1, -1);
    ctx.restore();
  } else {
    ctx.save();
    ctx.scale(Math.min(1.0, ease), Math.min(1.0, ease));
    ctx.fillStyle = rightColor;
    ctx.font = '900 32px "Permanent Marker", "Bangers", "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.strokeText(label, 0, 0);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

/** Draws Countdown Digits ("3", "2", "1", "FIGHT!") with Holographic Rings and Energy Flares */
function drawCountdownDigit(ctx, cx, cy, digitStr, ease, leftColor, rightColor, exitProgress = 0) {
  ctx.save();
  ctx.translate(cx, cy);

  const isFight = digitStr.length > 2;
  const exitScale = 1.0 + exitProgress * 1.5;
  const scale = (0.85 + ease * 0.25) * exitScale;
  ctx.scale(scale, scale);

  // 1. Central Flare Bloom
  const flare = ctx.createRadialGradient(0, 0, 8, 0, 0, isFight ? 140 : 100);
  flare.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  flare.addColorStop(0.35, hexToRgba(leftColor, 0.50));
  flare.addColorStop(0.70, hexToRgba(rightColor, 0.30));
  flare.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = flare;
  ctx.beginPath();
  ctx.arc(0, 0, isFight ? 140 : 100, 0, Math.PI * 2);
  ctx.fill();

  // 2. Large Stylized Countdown Typography
  const fontSize = isFight ? 64 : 96;
  ctx.font = `900 ${fontSize}px "Permanent Marker", "Bangers", "Outfit", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Layer A: Radiant outer glow stroke
  ctx.strokeStyle = hexToRgba(isFight ? rightColor : leftColor, 0.50);
  ctx.lineWidth = isFight ? 20 : 16;
  ctx.strokeText(digitStr, 0, isFight ? 2 : 4);

  // Layer B: Sharp black outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = isFight ? 9 : 8;
  ctx.lineJoin = 'round';
  ctx.strokeText(digitStr, 0, isFight ? 2 : 4);

  // Layer C: Dynamic dual-tone gradient fill
  const numGrad = ctx.createLinearGradient(0, -45, 0, 45);
  numGrad.addColorStop(0, '#ffffff');
  numGrad.addColorStop(0.40, leftColor);
  numGrad.addColorStop(1, rightColor);
  ctx.fillStyle = numGrad;
  ctx.fillText(digitStr, 0, isFight ? 2 : 4);

  // Layer D: Inner bright white highlight core
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${fontSize * 0.94}px "Permanent Marker", "Bangers", "Outfit", sans-serif`;
  ctx.fillText(digitStr, 0, isFight ? 1 : 2);

  ctx.restore();
}

/** Draws the Arena Out-Transition Spatial Slash & Flash Wipe */
function drawExitArenaTransitionWipe(ctx, width, height, exitProgress, leftColor, rightColor) {
  ctx.save();

  // 1. Diagonal Slash Beam Shockwave expanding across the seam
  const slashWidth = Math.pow(exitProgress, 1.8) * width * 1.8;
  const topSplitX = width * 0.62;
  const botSplitX = width * 0.38;

  ctx.beginPath();
  ctx.moveTo(topSplitX - slashWidth * 0.5, 0);
  ctx.lineTo(topSplitX + slashWidth * 0.5, 0);
  ctx.lineTo(botSplitX + slashWidth * 0.5, height);
  ctx.lineTo(botSplitX - slashWidth * 0.5, height);
  ctx.closePath();

  const slashGrad = ctx.createLinearGradient(0, 0, width, height);
  slashGrad.addColorStop(0, hexToRgba(leftColor, 0.7));
  slashGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
  slashGrad.addColorStop(1, hexToRgba(rightColor, 0.7));
  ctx.fillStyle = slashGrad;
  ctx.fill();

  // 2. Full-Screen Cinematic Lens Flare / White Flash Dissolve
  const flashAlpha = Math.min(1.0, Math.pow(exitProgress, 1.6));
  ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

/** Draws ONLY the Fighter's Name with Multi-Layer Laser Glow Underline */
function drawFighterCleanName(ctx, cx, cy, name, accentColor, fontScale = 1.0) {
  if (!name) return;

  const upperName = name.toUpperCase();
  ctx.save();

  const baseFontSize = upperName.length > 10 ? 22 : (upperName.length > 7 ? 26 : 30);
  const fontSize = Math.round(baseFontSize * fontScale);
  ctx.font = `900 ${fontSize}px "Outfit", "Rajdhani", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.strokeStyle = hexToRgba(accentColor, 0.40);
  ctx.lineWidth = 10 * fontScale;
  ctx.strokeText(upperName, cx, cy);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 5 * fontScale;
  ctx.lineJoin = 'round';
  ctx.strokeText(upperName, cx, cy);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(upperName, cx, cy);

  const cacheKey = `${upperName}_${fontSize}`;
  let underlineW = _textWidthCache[cacheKey];
  if (underlineW === undefined) {
    underlineW = ctx.measureText(upperName).width * 0.90;
    _textWidthCache[cacheKey] = underlineW;
  }
  const lineY = cy + fontSize * 0.65;

  ctx.strokeStyle = hexToRgba(accentColor, 0.35);
  ctx.lineWidth = 6.5 * fontScale;
  ctx.beginPath();
  ctx.moveTo(cx - underlineW / 2, lineY);
  ctx.lineTo(cx + underlineW / 2, lineY);
  ctx.stroke();

  ctx.strokeStyle = accentColor || '#ffffff';
  ctx.lineWidth = 2.6 * fontScale;
  ctx.beginPath();
  ctx.moveTo(cx - underlineW / 2, lineY);
  ctx.lineTo(cx + underlineW / 2, lineY);
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.0 * fontScale;
  ctx.beginPath();
  ctx.moveTo(cx - underlineW / 2 + 6 * fontScale, lineY);
  ctx.lineTo(cx + underlineW / 2 - 6 * fontScale, lineY);
  ctx.stroke();

  ctx.restore();
}

/** Screenshot saved popup notification toast */
function drawSavedToast(ctx, width, height, timer, leftColor = '#38bdf8', rightColor = '#e51a2e') {
  const alpha = Math.min(1.0, timer / 20);
  const toastW = 280;
  const toastH = 40;
  const toastX = width / 2 - toastW / 2;
  const toastY = 88;

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = 'rgba(12, 16, 24, 0.94)';
  ctx.strokeStyle = rightColor || '#e51a2e';
  ctx.lineWidth = 1.5;
  drawChamferedRect(ctx, toastX, toastY, toastW, toastH, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 12.5px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📸 THUMBNAIL PNG SAVED TO DOWNLOADS!', width / 2, toastY + toastH / 2);

  ctx.restore();
}
