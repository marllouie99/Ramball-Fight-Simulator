// ─────────────────────────────────────────────
// SPECIAL OVERLAY RENDERER
// Full-screen character ability screen overlays & vignettes
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { worldToScreen } from '../../systems/cameraSystem.js';
import { excludeGojoInfinityFromDim } from './domainDimOverlays.js';

// ─────────────────────────────────────────────────────────────────────
// GENOS SELF-DESTRUCT: Screen Dim + Cyan Electric Starburst Explosion
// ─────────────────────────────────────────────────────────────────────

// Pre-seeded static needle arrays so no per-frame GC allocations (Rule 12)
const _SD_LONG_SEEDS = Array.from({ length: 18 }, () => ({
  angle: Math.random() * Math.PI * 2,
  len: 80 + Math.random() * 140,
  thick: 1.2 + Math.random() * 2.0,
  speed: 0.4 + Math.random() * 0.9,
  phase: Math.random() * Math.PI * 2,
  color: Math.floor(Math.random() * 3), // 0=cyan, 1=white, 2=light-blue
}));
const _SD_SHORT_SEEDS = Array.from({ length: 26 }, () => ({
  angle: Math.random() * Math.PI * 2,
  len: 20 + Math.random() * 60,
  thick: 0.8 + Math.random() * 1.4,
  speed: 0.7 + Math.random() * 1.2,
  phase: Math.random() * Math.PI * 2,
  tilt: (Math.random() - 0.5) * 0.55, // slight scatter angle off main ray
  color: Math.floor(Math.random() * 4),
}));

// Transient explosion flash state (short-burst 2D Canvas, Rule 10)
let _genosSdFlashTimer = 0;
let _genosSdFlashX = 0;
let _genosSdFlashY = 0;

export function triggerGenosSelfDestructFlash(x, y) {
  _genosSdFlashTimer = 55; // ~0.9s burst on Canvas 2D
  _genosSdFlashX = x;
  _genosSdFlashY = y;
}

export function drawGenosSelfDestructDimScreen() {
  if (typeof state !== 'undefined' && state.disableDimEffects) {
    if (_genosSdFlashTimer > 0) _genosSdFlashTimer--;
    return;
  }
  const ctx = state.ctx;
  if (!ctx || !state.fighters) return;

  const now = Date.now();

  // ── 1. Find Genos fighter ──
  const genos = state.fighters.find(f =>
    f && (f.characterId === 'genos' || f.type === 'genos' || (f._def && f._def.id === 'genos'))
  );

  // ── 2. Smooth screen dim while charging self-destruct (Pitch Dark Screen) ──
  if (genos && genos.isSelfDestructing && genos.selfDestructTimer !== undefined) {
    const maxT = CONFIG.genos?.selfDestructCountdownFrames || 150;
    const elapsed = maxT - Math.max(0, genos.selfDestructTimer);
    // Smoothly fade in to 0.92 pitch dark alpha over first 50 frames
    const chargeP = Math.min(1.0, elapsed / 50);
    const dimAlpha = chargeP * 0.92;

    if (dimAlpha > 0.01) {
      const screenPos = worldToScreen(genos.x, genos.y);
      const drawX = screenPos.x;
      const drawY = screenPos.y;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // Pitch-black screen dim overlay (Rule 14)
      ctx.fillStyle = `rgba(0, 0, 0, ${dimAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      // Bright Electric Cyan radial charging bloom centered on Genos
      const glowGrad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, 160);
      glowGrad.addColorStop(0, `rgba(0, 255, 255, ${(chargeP * 0.90).toFixed(3)})`);
      glowGrad.addColorStop(0.35, `rgba(0, 229, 255, ${(chargeP * 0.60).toFixed(3)})`);
      glowGrad.addColorStop(0.70, `rgba(0, 180, 255, ${(chargeP * 0.25).toFixed(3)})`);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(drawX, drawY, 160, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ── 3. Tick down flash timer ──
  if (_genosSdFlashTimer > 0) _genosSdFlashTimer--;

  // ── 4. If no active flash, done ──
  if (_genosSdFlashTimer <= 0) return;

  const screenF = worldToScreen(_genosSdFlashX, _genosSdFlashY);
  const fx = screenF.x;
  const fy = screenF.y;
  const life = _genosSdFlashTimer / 55; // 1.0 → 0.0

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Maintain pitch dark backdrop during explosion starburst flash
  ctx.fillStyle = `rgba(0, 0, 0, ${(life * 0.85).toFixed(3)})`;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // ── 4a. Initial Electric Cyan Core Bloom ──
  const coreAlpha = Math.min(1.0, life * 2.2);
  const coreR = 26 * (1.15 - life * 0.35);
  const coreGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, coreR * 4.5);
  coreGrad.addColorStop(0, `rgba(224, 255, 255, ${(coreAlpha * 1.0).toFixed(3)})`);
  coreGrad.addColorStop(0.18, `rgba(0, 255, 255, ${(coreAlpha * 0.98).toFixed(3)})`);
  coreGrad.addColorStop(0.48, `rgba(0, 229, 255, ${(coreAlpha * 0.75).toFixed(3)})`);
  coreGrad.addColorStop(0.78, `rgba(0, 160, 255, ${(coreAlpha * 0.35).toFixed(3)})`);
  coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(fx, fy, coreR * 4.5, 0, Math.PI * 2);
  ctx.fill();

  // ── 4b. Long razor beam needles — sharp radiating streaks ──
  for (let i = 0; i < _SD_LONG_SEEDS.length; i++) {
    const s = _SD_LONG_SEEDS[i];
    const expand = 1 + (1 - life) * 2.8;
    const rayLen = s.len * expand * life;
    const flicker = 0.7 + Math.sin(now * 0.012 * s.speed + s.phase) * 0.3;
    const alpha = life * flicker * 0.95;
    if (alpha < 0.03) continue;

    const cosA = Math.cos(s.angle);
    const sinA = Math.sin(s.angle);
    const perpX = -sinA;
    const perpY = cosA;
    const halfT = (s.thick * life * 0.9) / 2;

    const tipX = fx + cosA * rayLen;
    const tipY = fy + sinA * rayLen;
    const mx = fx + cosA * (rayLen * 0.22);
    const my = fy + sinA * (rayLen * 0.22);

    let fillCol;
    if (s.color === 0) {
      fillCol = `rgba(0, 255, 255, ${alpha.toFixed(3)})`; // Cyan
    } else if (s.color === 1) {
      fillCol = `rgba(255, 255, 255, ${(alpha * 1.0).toFixed(3)})`; // White-hot core
    } else {
      fillCol = `rgba(140, 235, 255, ${(alpha * 0.85).toFixed(3)})`; // Sky Cyan
    }

    ctx.fillStyle = fillCol;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(mx + perpX * halfT, my + perpY * halfT);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(mx - perpX * halfT, my - perpY * halfT);
    ctx.closePath();
    ctx.fill();
  }

  // ── 4c. Short secondary electric spark needles ──
  for (let i = 0; i < _SD_SHORT_SEEDS.length; i++) {
    const s = _SD_SHORT_SEEDS[i];
    const expand = 1 + (1 - life) * 1.8;
    const rayLen = s.len * expand * life;
    const ang = s.angle + s.tilt;
    const flicker = 0.6 + Math.sin(now * 0.016 * s.speed + s.phase) * 0.4;
    const alpha = life * flicker * 0.85;
    if (alpha < 0.03) continue;

    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);
    const perpX = -sinA;
    const perpY = cosA;
    const halfT = (s.thick * life * 0.8) / 2;

    const tipX = fx + cosA * rayLen;
    const tipY = fy + sinA * rayLen;
    const mx = fx + cosA * (rayLen * 0.18);
    const my = fy + sinA * (rayLen * 0.18);

    let fillCol;
    if (s.color === 0) fillCol = `rgba(0, 255, 255, ${alpha.toFixed(3)})`;
    else if (s.color === 1) fillCol = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`;
    else if (s.color === 2) fillCol = `rgba(0, 200, 255, ${(alpha * 0.75).toFixed(3)})`;
    else fillCol = `rgba(200, 255, 255, ${(alpha * 0.9).toFixed(3)})`;

    ctx.fillStyle = fillCol;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(mx + perpX * halfT, my + perpY * halfT);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(mx - perpX * halfT, my - perpY * halfT);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────
// TODO TAKADA-CHAN: Idol Screen Overlay & Floating Hearts/Stars
// ─────────────────────────────────────────────────────────────────────

let _cachedIdolPixelHearts = null;
let _cachedIdolPixelStars = null;

function _initTodoIdolPixelSprites() {
  if (typeof document === 'undefined' || _cachedIdolPixelHearts) return;

  const P = 2.0;

  function createPixelHeart(w, h, map, outlineCol, coreCol, highlightCol, shadeCol) {
    const c = document.createElement('canvas');
    c.width = Math.round(w * P);
    c.height = Math.round(h * P);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;

    for (let r = 0; r < map.length; r++) {
      for (let col = 0; col < map[r].length; col++) {
        const ch = map[r][col];
        if (ch === ' ') continue;
        if (ch === '1') g.fillStyle = outlineCol;
        else if (ch === '2') g.fillStyle = coreCol;
        else if (ch === '3') g.fillStyle = highlightCol;
        else if (ch === '4') g.fillStyle = shadeCol;
        g.fillRect(col * P, r * P, P, P);
      }
    }
    return c;
  }

  function createPixelStar(w, h, map, outlineCol, coreCol, highlightCol) {
    const c = document.createElement('canvas');
    c.width = Math.round(w * P);
    c.height = Math.round(h * P);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;

    for (let r = 0; r < map.length; r++) {
      for (let col = 0; col < map[r].length; col++) {
        const ch = map[r][col];
        if (ch === ' ') continue;
        if (ch === '1') g.fillStyle = outlineCol;
        else if (ch === '2') g.fillStyle = coreCol;
        else if (ch === '3') g.fillStyle = highlightCol;
        g.fillRect(col * P, r * P, P, P);
      }
    }
    return c;
  }

  // 7x7 Medium Heart Matrix
  const heartMap7 = [
    " 11 11 ",
    "1221221",
    "1322221",
    "1222241",
    " 12241 ",
    "  141  ",
    "   1   "
  ];

  // 9x9 Large Heart Matrix
  const heartMap9 = [
    "  11 11  ",
    " 1221221 ",
    "132222221",
    "132222241",
    "122222441",
    " 1222441 ",
    "  12241  ",
    "   141   ",
    "    1    "
  ];

  // 7x7 Diamond Sparkle Star Matrix
  const starMap7 = [
    "   1   ",
    "  121  ",
    " 12321 ",
    "1233321",
    " 12321 ",
    "  121  ",
    "   1   "
  ];

  // 5x5 Small Diamond Sparkle Matrix
  const starMap5 = [
    "  1  ",
    " 121 ",
    "12321",
    " 121 ",
    "  1  "
  ];

  // 3x3 Micro Cross Sparkle Matrix
  const starMap3 = [
    " 1 ",
    "121",
    " 1 "
  ];

  _cachedIdolPixelHearts = [
    createPixelHeart(7, 7, heartMap7, '#1F0815', '#FF2A7A', '#FFF1F2', '#9F1239'),
    createPixelHeart(7, 7, heartMap7, '#1F0815', '#E11D48', '#FFE4E6', '#881337'),
    createPixelHeart(7, 7, heartMap7, '#1F0815', '#FF77BC', '#FFF1F2', '#BE185D'),
    createPixelHeart(7, 7, heartMap7, '#291705', '#F59E0B', '#FEF3C7', '#B45309'),
    createPixelHeart(9, 9, heartMap9, '#1F0815', '#FF2A7A', '#FFF1F2', '#9F1239'),
    createPixelHeart(9, 9, heartMap9, '#1F0815', '#E11D48', '#FFE4E6', '#881337'),
    createPixelHeart(9, 9, heartMap9, '#1F0815', '#FF77BC', '#FFF1F2', '#BE185D'),
    createPixelHeart(9, 9, heartMap9, '#291705', '#F59E0B', '#FEF3C7', '#B45309')
  ];

  _cachedIdolPixelStars = [
    createPixelStar(7, 7, starMap7, '#291705', '#FBBF24', '#FFFFFF'),
    createPixelStar(7, 7, starMap7, '#1E1B4B', '#E2E8F0', '#FFFFFF'),
    createPixelStar(7, 7, starMap7, '#2B061A', '#F472B6', '#FFFFFF'),
    createPixelStar(7, 7, starMap7, '#082F49', '#38BDF8', '#FFFFFF'),
    createPixelStar(5, 5, starMap5, '#291705', '#FBBF24', '#FFFFFF'),
    createPixelStar(5, 5, starMap5, '#1E1B4B', '#E2E8F0', '#FFFFFF'),
    createPixelStar(5, 5, starMap5, '#2B061A', '#F472B6', '#FFFFFF'),
    createPixelStar(5, 5, starMap5, '#082F49', '#38BDF8', '#FFFFFF'),
    createPixelStar(3, 3, starMap3, '#291705', '#FDE68A', '#FFFFFF'),
    createPixelStar(3, 3, starMap3, '#1E1B4B', '#F8FAFC', '#FFFFFF'),
    createPixelStar(3, 3, starMap3, '#2B061A', '#FBCFE8', '#FFFFFF')
  ];
}

let _todoIdolOverlayAlpha = 0;
let _todoHeartSeeds = null;
let _todoSparkleSeeds = null;
let _cachedIdolOverlayGrad = null;
let _cachedIdolGradW = 0;
let _cachedIdolGradH = 0;
let _cachedIdolGradX = 0;
let _cachedIdolGradY = 0;

function _getIdolPinkOverlayGrad(ctx, x, y, w, h) {
  if (_cachedIdolOverlayGrad && 
      _cachedIdolGradW === w && 
      _cachedIdolGradH === h && 
      _cachedIdolGradX === x && 
      _cachedIdolGradY === y) {
    return _cachedIdolOverlayGrad;
  }

  const cx = x + w / 2;
  const cy = y + h / 2;
  const innerR = Math.min(w, h) * 0.12;
  const outerR = Math.max(w, h) * 0.78;

  const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
  grad.addColorStop(0.00, 'rgba(255, 182, 193, 0.45)');
  grad.addColorStop(0.35, 'rgba(244, 114, 182, 0.40)');
  grad.addColorStop(0.68, 'rgba(219, 39, 119, 0.44)');
  grad.addColorStop(1.00, 'rgba(131, 24, 67, 0.62)');

  _cachedIdolOverlayGrad = grad;
  _cachedIdolGradW = w;
  _cachedIdolGradH = h;
  _cachedIdolGradX = x;
  _cachedIdolGradY = y;

  return grad;
}

function _initTodoIdolSeeds() {
  _initTodoIdolPixelSprites();

  _todoHeartSeeds = [];
  for (let i = 0; i < 12; i++) {
    _todoHeartSeeds.push({
      relX: (i + 0.5) / 12 + (Math.random() - 0.5) * 0.07,
      speed: 0.65 + Math.random() * 0.45,
      scale: 1.0 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      spriteIdx: i % 8,
      yOffset: Math.random() * 700
    });
  }

  _todoSparkleSeeds = [];
  for (let i = 0; i < 16; i++) {
    _todoSparkleSeeds.push({
      relX: (i + 0.5) / 16 + (Math.random() - 0.5) * 0.08,
      speed: 0.75 + Math.random() * 0.50,
      scale: 0.85 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      spriteIdx: i % 11,
      yOffset: Math.random() * 700
    });
  }
}

export function isTodoTakadaOverlayActive() {
  if (typeof state !== 'undefined' && state.fighters) {
    const isChanneling = Boolean(
      (state.fighters.some(f => f && f.hp > 0 && (f.characterId === 'todo' || f.type === 'todo' || f._def?.id === 'todo' || f._def?.type === 'todo') && f.isTakadaChanneling)) ||
      (state.previewFighter && (state.previewFighter.characterId === 'todo' || state.previewFighter.type === 'todo') && state.previewFighter.isTakadaChanneling)
    );
    if (isChanneling) return false;

    if (_todoIdolOverlayAlpha > 0.01) return true;
    return state.fighters.some(f => 
      f && f.hp > 0 && 
      (f.characterId === 'todo' || f.type === 'todo' || f._def?.id === 'todo' || f._def?.type === 'todo') && 
      !f.isTakadaChanneling &&
      f.isTakadaUltActive
    );
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────
// AOI TODO: Ultimate Arena Overlay (Todo-ultimate-overlay.png)
// ─────────────────────────────────────────────────────────────────────

let todoUltimateOverlayImg = null;
let todoUltimateOverlayImgLoading = false;

export function loadTodoUltimateOverlayImage() {
  if (todoUltimateOverlayImg || todoUltimateOverlayImgLoading) return;
  todoUltimateOverlayImgLoading = true;
  todoUltimateOverlayImg = new Image();
  todoUltimateOverlayImg.onload = () => {
    todoUltimateOverlayImgLoading = false;
  };
  todoUltimateOverlayImg.onerror = (e) => {
    console.error("Failed to load Todo ultimate overlay image at Assets/Overlays/Todo-ultimate-overlay.png:", e);
    todoUltimateOverlayImgLoading = false;
    todoUltimateOverlayImg = null;
  };
  todoUltimateOverlayImg.src = 'Assets/Overlays/Todo-ultimate-overlay.png';
}

export function getTodoUltimateOverlayImage() {
  if (todoUltimateOverlayImg && todoUltimateOverlayImg.complete && (todoUltimateOverlayImg.naturalWidth > 0 || todoUltimateOverlayImg.width > 0)) {
    return todoUltimateOverlayImg;
  }
  if (!todoUltimateOverlayImgLoading && typeof Image !== 'undefined') {
    loadTodoUltimateOverlayImage();
  }
  return todoUltimateOverlayImg;
}

/**
 * Renders Assets/Overlays/Todo-ultimate-overlay.png inside the arena with smooth fade transitions,
 * authentic pixel-art rasterization, semi-transparency (a bit transparent),
 * and clean rectangular/circular arena boundary clipping.
 */
export function drawTodoUltimateArenaOverlay(customCtx = null, customOpacity = null) {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  if (CONFIG.todo?.enableUltimateOverlay === false) return;
  const ctx = customCtx || state.ctx;
  const arena = state.arena;
  if (!ctx || !arena) return;

  // Never render arena overlay during channeling phase (only after channeling finishes / when ultimate is active)
  const isChanneling = Boolean(
    (state.fighters?.some(f => f && f.hp > 0 && (f.characterId === 'todo' || f.type === 'todo' || f._def?.id === 'todo' || f._def?.type === 'todo') && f.isTakadaChanneling)) ||
    (state.previewFighter && (state.previewFighter.characterId === 'todo' || state.previewFighter.type === 'todo') && state.previewFighter.isTakadaChanneling)
  );
  if (isChanneling) return;

  const todoFighter = (state.fighters?.find(f =>
    f && f.hp > 0 &&
    (f.characterId === 'todo' || f.type === 'todo' || f._def?.id === 'todo' || f._def?.type === 'todo') &&
    !f.isTakadaChanneling &&
    (f.isTakadaUltActive || f.takadaSongStarted)
  )) || (state.previewFighter && (state.previewFighter.characterId === 'todo' || state.previewFighter.type === 'todo') && !state.previewFighter.isTakadaChanneling && (state.previewFighter.isTakadaUltActive || state.previewFighter.takadaSongStarted) ? state.previewFighter : null);

  if (!todoFighter && (!customOpacity || customOpacity <= 0.005)) return;

  const opacity = customOpacity !== null
    ? customOpacity
    : (_todoIdolOverlayAlpha > 0.005 ? _todoIdolOverlayAlpha : (todoFighter ? (CONFIG.todo?.takadaDimOpacity ?? 0.58) : 0));

  if (opacity <= 0.005) return;

  const zoom = (state.camera && state.camera.enabled && state.camera.mode === 'dynamic') ? (state.camera.zoom || 1.0) : 1.0;
  const worldArenaCenterX = (arena.x || 0) + (arena.width || 800) / 2;
  const worldArenaCenterY = (arena.y || 0) + (arena.height || 600) / 2;
  const arenaScreenCenter = worldToScreen(worldArenaCenterX, worldArenaCenterY);
  const arenaW = (arena.width || 800) * zoom;
  const arenaH = (arena.height || 600) * zoom;
  const arenaX = arenaScreenCenter.x - arenaW / 2;
  const arenaY = arenaScreenCenter.y - arenaH / 2;
  const wallW = (arena.wallWidth || 4) * zoom;

  ctx.save();
  ctx.beginPath();
  if (arena.shape === 'circle') {
    const ar = (arena.radius || ((arena.width || 800) / 2)) * zoom - wallW;
    ctx.arc(arenaScreenCenter.x, arenaScreenCenter.y, Math.max(0, ar), 0, Math.PI * 2);
  } else {
    ctx.rect(arenaX + wallW, arenaY + wallW, arenaW - wallW * 2, arenaH - wallW * 2);
  }
  ctx.clip();

  // Subtle idol concert stage ambient tint inside arena
  ctx.fillStyle = `rgba(236, 72, 153, ${(opacity * 0.16).toFixed(3)})`;
  ctx.fillRect(arenaX + wallW, arenaY + wallW, arenaW - wallW * 2, arenaH - wallW * 2);

  // Draw Todo & Takada-chan Ultimate Overlay Art (Assets/Overlays/Todo-ultimate-overlay.png) with transparency
  const img = getTodoUltimateOverlayImage();
  const baseOverlayAlpha = (typeof CONFIG !== 'undefined' && CONFIG.todo?.ultimateOverlayAlpha !== undefined)
    ? CONFIG.todo.ultimateOverlayAlpha
    : 0.65;
  const overlayZoom = (typeof CONFIG !== 'undefined' && CONFIG.todo?.ultimateOverlayZoom !== undefined)
    ? CONFIG.todo.ultimateOverlayZoom
    : 1.0;
  const custom = (typeof state !== 'undefined' && state.skinCustomizations?.todo_ultimate_overlay) || {};
  const effectiveZoom = custom.zoom ?? overlayZoom;
  const offX = (custom.offsetX ?? ((typeof CONFIG !== 'undefined' && CONFIG.todo?.ultimateOverlayOffsetX !== undefined) ? CONFIG.todo.ultimateOverlayOffsetX : 0)) * zoom;
  const offY = (custom.offsetY ?? ((typeof CONFIG !== 'undefined' && CONFIG.todo?.ultimateOverlayOffsetY !== undefined) ? CONFIG.todo.ultimateOverlayOffsetY : 0)) * zoom;

  if (img && (img.complete || img.width > 0) && (img.naturalWidth === undefined || img.naturalWidth > 0 || img.width > 0)) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor preserves crisp pixel art
    const baseW = arenaW - wallW * 2;
    const baseH = arenaH - wallW * 2;

    const drawW = baseW * effectiveZoom;
    const drawH = baseH * effectiveZoom;

    const drawX = arenaScreenCenter.x - drawW / 2 + offX;
    const drawY = arenaScreenCenter.y - drawH / 2 + offY;

    ctx.globalAlpha = opacity * baseOverlayAlpha;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  // Atmospheric romantic pink / lavender perimeter vignette framing the arena
  const maxR = Math.max(arenaW, arenaH) * 0.70;
  const vignetteGrad = ctx.createRadialGradient(arenaScreenCenter.x, arenaScreenCenter.y, Math.min(arenaW, arenaH) * 0.25, arenaScreenCenter.x, arenaScreenCenter.y, maxR);
  vignetteGrad.addColorStop(0.00, 'rgba(0, 0, 0, 0)');
  vignetteGrad.addColorStop(0.70, `rgba(219, 39, 119, ${(opacity * 0.18).toFixed(3)})`);
  vignetteGrad.addColorStop(1.00, `rgba(147, 51, 234, ${(opacity * 0.35).toFixed(3)})`);
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(arenaX + wallW, arenaY + wallW, arenaW - wallW * 2, arenaH - wallW * 2);

  ctx.restore();
}

/**
 * Draws Aoi Todo's 530,000 IQ Takada-chan Idol Imagination full-screen concert stage overlay.
 * Active throughout Todo's channeling (3.0s) and active ultimate (8.0s) phases.
 * Features an uplifting, vibrant idol concert atmosphere with pastel pink & electric lavender
 * stage lighting, sweeping concert spotlight beams, luminous idol spotlight centered on Todo,
 * soft magenta stage glow, semi-transparent arena overlay artwork, and upward-fluttering pixel-art hearts, stars, and diamond sparkles.
 */
export function drawTodoTakadaDimScreen() {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  const { ctx, canvas } = state;
  if (!ctx || !canvas) return;

  if (CONFIG.todo?.enableTakadaDimScreen === false) return;

  // Never render dim screen or concert stage visuals during channeling phase (strictly only display after channeling)
  const isChanneling = Boolean(
    (state.fighters?.some(f => f && f.hp > 0 && (f.characterId === 'todo' || f.type === 'todo' || f._def?.id === 'todo' || f._def?.type === 'todo') && f.isTakadaChanneling)) ||
    (state.previewFighter && (state.previewFighter.characterId === 'todo' || state.previewFighter.type === 'todo') && state.previewFighter.isTakadaChanneling)
  );
  if (isChanneling) {
    _todoIdolOverlayAlpha = 0;
    return;
  }

  const todoFighter = (state.fighters?.find(f =>
    f && f.hp > 0 &&
    (f.characterId === 'todo' || f.type === 'todo' || f._def?.id === 'todo' || f._def?.type === 'todo') &&
    !f.isTakadaChanneling &&
    f.isTakadaUltActive
  )) || (state.previewFighter && (state.previewFighter.characterId === 'todo' || state.previewFighter.type === 'todo') && !state.previewFighter.isTakadaChanneling && state.previewFighter.isTakadaUltActive ? state.previewFighter : null);

  const baseOpacity = CONFIG.todo?.takadaDimOpacity ?? 0.58;
  const targetAlpha = todoFighter ? baseOpacity : 0.0;

  if (targetAlpha > _todoIdolOverlayAlpha) {
    _todoIdolOverlayAlpha += (targetAlpha - _todoIdolOverlayAlpha) * 0.12;
  } else if (targetAlpha < _todoIdolOverlayAlpha) {
    _todoIdolOverlayAlpha += (targetAlpha - _todoIdolOverlayAlpha) * 0.08;
  }

  if (_todoIdolOverlayAlpha <= 0.005) {
    _todoIdolOverlayAlpha = 0;
    return;
  }

  const opacity = _todoIdolOverlayAlpha;
  const w = canvas.width;
  const h = canvas.height;
  const now = Date.now();
  const isLowPerf = Boolean(state.performanceMode || (state.fps && state.fps < 50));

  if (!_todoHeartSeeds) _initTodoIdolSeeds();

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 1. Radiant Idol Stage Pastel & Lavender Concert Backdrop (Vibrant & uplifting, NOT dark!)
  const linearGrad = ctx.createLinearGradient(0, 0, 0, h);
  linearGrad.addColorStop(0.0, `rgba(168, 85, 247, ${(opacity * 0.28).toFixed(3)})`);   // Soft electric lavender stage top
  linearGrad.addColorStop(0.25, `rgba(236, 72, 153, ${(opacity * 0.26).toFixed(3)})`);  // Radiant idol pink
  linearGrad.addColorStop(0.50, `rgba(255, 105, 180, ${(opacity * 0.24).toFixed(3)})`);  // Sweet candy rose center
  linearGrad.addColorStop(0.75, `rgba(217, 70, 239, ${(opacity * 0.26).toFixed(3)})`);  // Vibrant idol magenta
  linearGrad.addColorStop(1.0, `rgba(147, 51, 234, ${(opacity * 0.30).toFixed(3)})`);   // Royal stage violet bottom
  ctx.fillStyle = linearGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. High-contrast radiant romantic pink/magenta idol spotlight radial gradient centered on Todo
  const screenPos = todoFighter ? worldToScreen(todoFighter.x, todoFighter.y - (todoFighter.z || 0)) : { x: w / 2, y: h / 2 };
  const cx = screenPos.x;
  const cy = screenPos.y;
  const camZoom = (state.camera && state.camera.mode === 'dynamic') ? (state.camera.zoom || 1.0) : 1.0;
  const maxDim = Math.max(w, h) * 0.95 * camZoom;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim);
  grad.addColorStop(0.00, `rgba(255, 255, 255, ${(opacity * 0.45).toFixed(3)})`);     // Luminous pure starlight center on idol Todo
  grad.addColorStop(0.12, `rgba(255, 182, 218, ${(opacity * 0.38).toFixed(3)})`);     // Cotton candy idol pink core
  grad.addColorStop(0.28, `rgba(244, 114, 182, ${(opacity * 0.28).toFixed(3)})`);     // Dreamy sakura rose halo
  grad.addColorStop(0.50, `rgba(217, 70, 239, ${(opacity * 0.18).toFixed(3)})`);      // Electric fuchsia concert glow
  grad.addColorStop(0.75, `rgba(168, 85, 247, ${(opacity * 0.09).toFixed(3)})`);      // Soft lavender stage mist
  grad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');                                        // Outer transparent blend
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 3. Soft Idol Stage Glow Perimeter (Vibrant concert stage vignette, NOT dark shadows!)
  const cornerGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.85);
  cornerGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
  cornerGrad.addColorStop(0.65, `rgba(219, 39, 119, ${(opacity * 0.14).toFixed(3)})`); // Soft idol magenta rim
  cornerGrad.addColorStop(1.0, `rgba(126, 34, 206, ${(opacity * 0.22).toFixed(3)})`);  // Dreamy concert purple rim
  ctx.fillStyle = cornerGrad;
  ctx.fillRect(0, 0, w, h);

  // 3.5. Render Todo & Takada-chan Ultimate Arena PNG Overlay (Assets/Overlays/Todo-ultimate-overlay.png) clipped to arena
  drawTodoUltimateArenaOverlay(ctx, opacity);

  // 4. Floating Pixel-Art Sparkles & Diamond Stars (Zero-GC texture blits)
  ctx.imageSmoothingEnabled = false;

  if (_cachedIdolPixelStars) {
    const sparkleCount = isLowPerf ? 8 : _todoSparkleSeeds.length;
    for (let i = 0; i < sparkleCount; i++) {
      const sp = _todoSparkleSeeds[i];
      const sx = sp.relX * w + Math.sin(now * 0.0012 * sp.speed + sp.phase) * 20;
      const rawY = h + 30 - ((now * 0.038 * sp.speed + sp.yOffset) % (h + 70));
      const starAlpha = Math.min(1.0, Math.sin((rawY / h) * Math.PI)) * opacity * 0.95;
      const sprite = _cachedIdolPixelStars[sp.spriteIdx];
      if (sprite && starAlpha > 0.01) {
        const sprW = Math.round(sprite.width * sp.scale);
        const sprH = Math.round(sprite.height * sp.scale);
        ctx.globalAlpha = starAlpha;
        ctx.drawImage(sprite, Math.round(sx - sprW / 2), Math.round(rawY - sprH / 2), sprW, sprH);
      }
    }
  }

  // 5. Floating Pixel-Art Pink & Gold Hearts (Zero-GC texture blits)
  if (_cachedIdolPixelHearts) {
    const heartCount = isLowPerf ? 6 : _todoHeartSeeds.length;
    for (let i = 0; i < heartCount; i++) {
      const hSeed = _todoHeartSeeds[i];
      const hx = hSeed.relX * w + Math.sin(now * 0.0016 * hSeed.speed + hSeed.phase) * 28;
      const rawY = h + 35 - ((now * 0.032 * hSeed.speed + hSeed.yOffset) % (h + 80));
      const heartAlpha = Math.min(1.0, Math.sin((rawY / h) * Math.PI)) * opacity * 0.92;
      const sprite = _cachedIdolPixelHearts[hSeed.spriteIdx];
      if (sprite && heartAlpha > 0.01) {
        const sprW = Math.round(sprite.width * hSeed.scale);
        const sprH = Math.round(sprite.height * hSeed.scale);
        ctx.globalAlpha = heartAlpha;
        ctx.drawImage(sprite, Math.round(hx - sprW / 2), Math.round(rawY - sprH / 2), sprW, sprH);
      }
    }
  }

  // 6. Exclude Gojo Limitless Infinity Barrier from dimming
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();

  state.globalDimEdgeColor = `rgba(147, 51, 234, ${(opacity * 0.32).toFixed(3)})`;
}

export function drawTodoTakadaIdolScreenOverlay() {
  drawTodoTakadaDimScreen();
}

// ─────────────────────────────────────────────────────────────────────
// YUJI ITADORI: Soul Swap (Sukuna Takeover) Arena Overlay (Yuji-soulswap-overlay.png)
// ─────────────────────────────────────────────────────────────────────

let yujiSoulSwapOverlayImg = null;
let yujiSoulSwapOverlayImgLoading = false;
let currentYujiSoulSwapOpacity = 0;

export function loadYujiSoulSwapOverlayImage() {
  if (yujiSoulSwapOverlayImg || yujiSoulSwapOverlayImgLoading) return;
  yujiSoulSwapOverlayImgLoading = true;
  yujiSoulSwapOverlayImg = new Image();
  yujiSoulSwapOverlayImg.onload = () => {
    yujiSoulSwapOverlayImgLoading = false;
  };
  yujiSoulSwapOverlayImg.onerror = (e) => {
    console.error("Failed to load Yuji Soul Swap overlay image at Assets/Overlays/Yuji-soulswap-overlay.png:", e);
    yujiSoulSwapOverlayImgLoading = false;
    yujiSoulSwapOverlayImg = null;
  };
  yujiSoulSwapOverlayImg.src = 'Assets/Overlays/Yuji-soulswap-overlay.png';
}

export function getYujiSoulSwapOverlayImage() {
  if (yujiSoulSwapOverlayImg && yujiSoulSwapOverlayImg.complete && (yujiSoulSwapOverlayImg.naturalWidth > 0 || yujiSoulSwapOverlayImg.width > 0)) {
    return yujiSoulSwapOverlayImg;
  }
  if (!yujiSoulSwapOverlayImgLoading && typeof Image !== 'undefined') {
    loadYujiSoulSwapOverlayImage();
  }
  return yujiSoulSwapOverlayImg;
}

// Preload immediately in browser
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getYujiSoulSwapOverlayImage();
}

export function isYujiSoulSwapOverlayActive() {
  return currentYujiSoulSwapOpacity > 0.005;
}

/**
 * Renders Assets/Overlays/Yuji-soulswap-overlay.png inside the arena with smooth fade transitions,
 * authentic pixel-art rasterization, semi-transparency, and clean rectangular/circular arena boundary clipping.
 */
export function drawYujiSoulSwapArenaOverlay(customCtx = null, customOpacity = null) {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  if (typeof CONFIG !== 'undefined' && CONFIG.yuji?.enableSoulSwapOverlay === false) return;
  const ctx = customCtx || state.ctx;
  const arena = state.arena;
  if (!ctx || !arena) return;

  const yujiFighter = (state.fighters?.find(f =>
    f && f.hp > 0 &&
    (f.characterId === 'yuji' || f.type === 'yuji' || f._def?.id === 'yuji' || f._def?.type === 'yuji') &&
    (f.soulSwapActive || (f.soulSwapTransitionTimer && f.soulSwapTransitionTimer > 0))
  )) || (state.previewFighter && (state.previewFighter.characterId === 'yuji' || state.previewFighter.type === 'yuji') && (state.previewFighter.soulSwapActive || state.previewFighter.soulSwapTransitionTimer > 0) ? state.previewFighter : null);

  const opacity = customOpacity !== null
    ? customOpacity
    : (currentYujiSoulSwapOpacity > 0.005 ? currentYujiSoulSwapOpacity : (yujiFighter ? (CONFIG.yuji?.soulSwapDimOpacity ?? 0.85) : 0));

  if (opacity <= 0.005) return;

  const zoom = (state.camera && state.camera.enabled && state.camera.mode === 'dynamic') ? (state.camera.zoom || 1.0) : 1.0;
  const worldArenaCenterX = (arena.x || 0) + (arena.width || 800) / 2;
  const worldArenaCenterY = (arena.y || 0) + (arena.height || 600) / 2;
  const arenaScreenCenter = worldToScreen(worldArenaCenterX, worldArenaCenterY);
  const arenaW = (arena.width || 800) * zoom;
  const arenaH = (arena.height || 600) * zoom;
  const arenaX = arenaScreenCenter.x - arenaW / 2;
  const arenaY = arenaScreenCenter.y - arenaH / 2;
  const wallW = (arena.wallWidth || 4) * zoom;

  ctx.save();
  ctx.beginPath();
  if (arena.shape === 'circle') {
    const ar = (arena.radius || ((arena.width || 800) / 2)) * zoom - wallW;
    ctx.arc(arenaScreenCenter.x, arenaScreenCenter.y, Math.max(0, ar), 0, Math.PI * 2);
  } else {
    ctx.rect(arenaX + wallW, arenaY + wallW, arenaW - wallW * 2, arenaH - wallW * 2);
  }
  ctx.clip();

  // Subtle cursed crimson ambient wash inside arena
  ctx.fillStyle = `rgba(180, 10, 25, ${(opacity * 0.16).toFixed(3)})`;
  ctx.fillRect(arenaX + wallW, arenaY + wallW, arenaW - wallW * 2, arenaH - wallW * 2);

  // Draw Sukuna Face Markings Art (Assets/Overlays/Yuji-soulswap-overlay.png) with semi-transparency
  const img = getYujiSoulSwapOverlayImage();
  const baseOverlayAlpha = (typeof CONFIG !== 'undefined' && CONFIG.yuji?.soulSwapOverlayAlpha !== undefined)
    ? CONFIG.yuji.soulSwapOverlayAlpha
    : 0.68;
  const overlayZoom = (typeof CONFIG !== 'undefined' && CONFIG.yuji?.soulSwapOverlayZoom !== undefined)
    ? CONFIG.yuji.soulSwapOverlayZoom
    : 1.05;
  const custom = (typeof state !== 'undefined' && state.skinCustomizations?.yuji_soulswap_overlay) || {};
  const effectiveZoom = custom.zoom ?? overlayZoom;
  const offX = (custom.offsetX ?? ((typeof CONFIG !== 'undefined' && CONFIG.yuji?.soulSwapOverlayOffsetX !== undefined) ? CONFIG.yuji.soulSwapOverlayOffsetX : 0)) * zoom;
  const offY = (custom.offsetY ?? ((typeof CONFIG !== 'undefined' && CONFIG.yuji?.soulSwapOverlayOffsetY !== undefined) ? CONFIG.yuji.soulSwapOverlayOffsetY : 0)) * zoom;

  if (img && (img.complete || img.width > 0) && (img.naturalWidth === undefined || img.naturalWidth > 0 || img.width > 0)) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor preserves crisp pixel art
    const innerW = arenaW - wallW * 2;
    const innerH = arenaH - wallW * 2;
    // Keep proportional square aspect ratio based on arena dimensions
    const baseSize = Math.min(innerW, innerH);
    const drawW = baseSize * effectiveZoom;
    const drawH = baseSize * effectiveZoom;

    const drawX = arenaScreenCenter.x - drawW / 2 + offX;
    const drawY = arenaScreenCenter.y - drawH / 2 + offY;

    ctx.globalAlpha = opacity * baseOverlayAlpha;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  // Atmospheric cursed blood-red & shadow perimeter vignette framing the arena
  const maxR = Math.max(arenaW, arenaH) * 0.70;
  const vignetteGrad = ctx.createRadialGradient(arenaScreenCenter.x, arenaScreenCenter.y, Math.min(arenaW, arenaH) * 0.25, arenaScreenCenter.x, arenaScreenCenter.y, maxR);
  vignetteGrad.addColorStop(0.00, 'rgba(0, 0, 0, 0)');
  vignetteGrad.addColorStop(0.65, `rgba(120, 5, 20, ${(opacity * 0.22).toFixed(3)})`);
  vignetteGrad.addColorStop(1.00, `rgba(15, 0, 4, ${(opacity * 0.55).toFixed(3)})`);
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(arenaX + wallW, arenaY + wallW, arenaW - wallW * 2, arenaH - wallW * 2);

  ctx.restore();
}

/**
 * Draws Yuji's Soul Swap (Sukuna Takeover) Full-Screen Dim Screen & Arena Overlay.
 */
export function drawYujiSoulSwapDimScreen() {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  if (typeof CONFIG !== 'undefined' && CONFIG.yuji?.enableSoulSwapOverlay === false) return;
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  const yujiFighter = (state.fighters?.find(f =>
    f && f.hp > 0 &&
    (f.characterId === 'yuji' || f.type === 'yuji' || f._def?.id === 'yuji' || f._def?.type === 'yuji') &&
    (f.soulSwapActive || (f.soulSwapTransitionTimer && f.soulSwapTransitionTimer > 0))
  )) || (state.previewFighter && (state.previewFighter.characterId === 'yuji' || state.previewFighter.type === 'yuji') && (state.previewFighter.soulSwapActive || state.previewFighter.soulSwapTransitionTimer > 0) ? state.previewFighter : null);

  let targetOpacity = 0;
  if (yujiFighter) {
    const baseDim = (typeof CONFIG !== 'undefined' && CONFIG.yuji?.soulSwapDimOpacity !== undefined)
      ? CONFIG.yuji.soulSwapDimOpacity
      : 0.85;
    if (yujiFighter.soulSwapTransitionTimer > 0) {
      const transMax = 30;
      const progress = Math.min(1.0, Math.max(0, 1.0 - (yujiFighter.soulSwapTransitionTimer / transMax)));
      targetOpacity = baseDim * (0.60 + 0.40 * progress);
    } else if (yujiFighter.soulSwapActive) {
      targetOpacity = baseDim;
    }
  }

  // Smooth fade transitions
  if (targetOpacity > currentYujiSoulSwapOpacity) {
    currentYujiSoulSwapOpacity += (targetOpacity - currentYujiSoulSwapOpacity) * 0.12;
  } else {
    currentYujiSoulSwapOpacity += (targetOpacity - currentYujiSoulSwapOpacity) * 0.08;
  }

  if (currentYujiSoulSwapOpacity < 0.005) {
    currentYujiSoulSwapOpacity = 0;
    return;
  }

  const opacity = currentYujiSoulSwapOpacity;
  const w = canvas.width;
  const h = canvas.height;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 1. Ominous Cursed Blood-Red & Pitch Black Linear Gradient Across Full Screen
  const linearGrad = ctx.createLinearGradient(0, 0, 0, h);
  linearGrad.addColorStop(0.0, `rgba(5, 0, 1, ${(opacity * 0.96).toFixed(3)})`);       // Pitch obsidian-crimson top
  linearGrad.addColorStop(0.20, `rgba(32, 2, 8, ${(opacity * 0.92).toFixed(3)})`);     // Dark sinister crimson
  linearGrad.addColorStop(0.50, `rgba(60, 4, 15, ${(opacity * 0.88).toFixed(3)})`);    // Malevolent soul takeover core
  linearGrad.addColorStop(0.80, `rgba(32, 2, 8, ${(opacity * 0.92).toFixed(3)})`);     // Dark sinister crimson
  linearGrad.addColorStop(1.0, `rgba(5, 0, 1, ${(opacity * 0.96).toFixed(3)})`);       // Pitch obsidian-crimson bottom
  ctx.fillStyle = linearGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. High-contrast radial cursed energy aura centered on Yuji / Sukuna
  const screenPos = yujiFighter ? worldToScreen(yujiFighter.x, yujiFighter.y - (yujiFighter.z || 0)) : { x: w / 2, y: h / 2 };
  const cx = screenPos.x;
  const cy = screenPos.y;
  const maxDim = Math.max(w, h) * 0.90;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim);
  grad.addColorStop(0.00, `rgba(220, 20, 60, ${(opacity * 0.50).toFixed(3)})`);       // Radiant crimson core (#dc143c)
  grad.addColorStop(0.15, `rgba(178, 10, 40, ${(opacity * 0.38).toFixed(3)})`);       // Deep cursed scarlet ring
  grad.addColorStop(0.35, `rgba(100, 5, 25, ${(opacity * 0.25).toFixed(3)})`);        // Dark maroon transition
  grad.addColorStop(0.60, `rgba(40, 2, 10, ${(opacity * 0.12).toFixed(3)})`);         // Abyssal burgundy void
  grad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');                                         // Outer blend
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 3. Dark Outer Edge Screen Corner Vignette
  const cornerGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.30, w / 2, h / 2, Math.max(w, h) * 0.85);
  cornerGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
  cornerGrad.addColorStop(0.60, `rgba(15, 0, 4, ${(opacity * 0.55).toFixed(3)})`);
  cornerGrad.addColorStop(1.0, `rgba(2, 0, 1, ${(opacity * 0.95).toFixed(3)})`);
  ctx.fillStyle = cornerGrad;
  ctx.fillRect(0, 0, w, h);

  // 3.5. Render Yuji Soul Swap Arena PNG Overlay clipped to arena bounds
  drawYujiSoulSwapArenaOverlay(ctx, opacity);

  // 4. Subtle Sukuna Cursed Aura Spotlight on Yuji
  if (yujiFighter) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const zoom = (state.camera && state.camera.enabled && state.camera.mode === 'dynamic') ? (state.camera.zoom || 1.0) : 1.0;
    const spotR = (yujiFighter.r || 25) * 4.2 * zoom;
    const spotGrad = ctx.createRadialGradient(cx, cy, 5 * zoom, cx, cy, spotR);
    spotGrad.addColorStop(0, `rgba(255, 60, 80, ${(opacity * 0.35).toFixed(3)})`);
    spotGrad.addColorStop(0.40, `rgba(200, 15, 45, ${(opacity * 0.18).toFixed(3)})`);
    spotGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, spotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 5. Exclude Gojo Limitless Infinity Barrier from dimming
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();

  state.globalDimEdgeColor = `rgba(32, 2, 8, ${(opacity * 0.95).toFixed(3)})`;
}
