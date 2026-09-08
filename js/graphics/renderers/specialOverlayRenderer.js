// ─────────────────────────────────────────────
// SPECIAL OVERLAY RENDERER
// Full-screen character ability screen overlays & vignettes
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { worldToScreen } from '../../systems/cameraSystem.js';

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
  return _todoIdolOverlayAlpha > 0.01;
}

export function drawTodoTakadaIdolScreenOverlay() {
  if (!state || !state.fighters || !state.ctx || !state.canvas) return;

  // Single pass fighter search
  let todoFighter = null;
  let yutaFighter = null;
  let isMahitoDomainActive = false;
  let isSaitamaSeriousPunchActive = false;
  const fighters = state.fighters;
  for (let i = 0; i < fighters.length; i++) {
    const f = fighters[i];
    if (!f || f.hp <= 0) continue;
    const charId = f.characterId || f.type || f._def?.type || f._def?.id;
    if (charId === 'todo' && (f.isTakadaChanneling || f.isTakadaUltActive)) {
      todoFighter = f;
    } else if (charId === 'yuta' && f.rika) {
      yutaFighter = f;
    } else if (charId === 'mahito' && f.domainActive) {
      isMahitoDomainActive = true;
    } else if (charId === 'saitama' && (
      (f._counterPunchTimer && f._counterPunchTimer > 0) ||
      (f._postCounterRecoveryTimer && f._postCounterRecoveryTimer > 0) ||
      f.isChargingSeriousPunch ||
      f.isCountering
    )) {
      isSaitamaSeriousPunchActive = true;
    }
  }

  const targetAlpha = todoFighter ? 1.0 : 0.0;
  if (targetAlpha > _todoIdolOverlayAlpha) {
    _todoIdolOverlayAlpha = Math.min(1.0, _todoIdolOverlayAlpha + 0.05);
  } else if (targetAlpha < _todoIdolOverlayAlpha) {
    _todoIdolOverlayAlpha = Math.max(0.0, _todoIdolOverlayAlpha - 0.025);
  }

  if (_todoIdolOverlayAlpha <= 0.001) return;

  const ctx = state.ctx;
  const canvas = state.canvas;
  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : null;
  const arenaW = arena ? arena.width : canvas.width;
  const arenaH = arena ? arena.height : canvas.height;
  const arenaX = arena ? arena.x : 0;
  const arenaY = arena ? arena.y : 0;
  const now = Date.now();
  const isLowPerf = Boolean(state.performanceMode || (state.fps && state.fps < 50));

  if (!_todoHeartSeeds) _initTodoIdolSeeds();

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 0. Dreamy Romantic Pinkish Screen Overlay
  const overlayGrad = _getIdolPinkOverlayGrad(ctx, arenaX, arenaY, arenaW, arenaH);
  if (overlayGrad) {
    const pulse = 0.94 + Math.sin(now * 0.0028) * 0.06;
    ctx.globalAlpha = _todoIdolOverlayAlpha * pulse;
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(arenaX, arenaY, arenaW, arenaH);
  }

  ctx.globalAlpha = _todoIdolOverlayAlpha;

  // 1. Floating Pixel-Art Sparkles & Diamond Stars (Zero-GC texture blits)
  if (_cachedIdolPixelStars) {
    const sparkleCount = isLowPerf ? 8 : _todoSparkleSeeds.length;
    for (let i = 0; i < sparkleCount; i++) {
      const sp = _todoSparkleSeeds[i];
      const sx = arenaX + sp.relX * arenaW + Math.sin(now * 0.0012 * sp.speed + sp.phase) * 20;
      const rawY = arenaY + arenaH + 30 - ((now * 0.038 * sp.speed + sp.yOffset) % (arenaH + 70));
      const sy = rawY;
      const starAlpha = Math.min(1.0, Math.sin(((rawY - arenaY) / arenaH) * Math.PI)) * _todoIdolOverlayAlpha * 0.90;

      const sprite = _cachedIdolPixelStars[sp.spriteIdx];
      if (sprite && starAlpha > 0.01) {
        const sprW = Math.round(sprite.width * sp.scale);
        const sprH = Math.round(sprite.height * sp.scale);
        ctx.globalAlpha = starAlpha;
        ctx.drawImage(sprite, Math.round(sx - sprW / 2), Math.round(sy - sprH / 2), sprW, sprH);
      }
    }
  }

  // 2. Floating Pixel-Art Pink & Gold Hearts (Zero-GC texture blits)
  if (_cachedIdolPixelHearts) {
    const heartCount = isLowPerf ? 6 : _todoHeartSeeds.length;
    for (let i = 0; i < heartCount; i++) {
      const h = _todoHeartSeeds[i];
      const hx = arenaX + h.relX * arenaW + Math.sin(now * 0.0016 * h.speed + h.phase) * 28;
      const rawY = arenaY + arenaH + 35 - ((now * 0.032 * h.speed + h.yOffset) % (arenaH + 80));
      const hy = rawY;
      const heartAlpha = Math.min(1.0, Math.sin(((rawY - arenaY) / arenaH) * Math.PI)) * _todoIdolOverlayAlpha * 0.88;

      const sprite = _cachedIdolPixelHearts[h.spriteIdx];
      if (sprite && heartAlpha > 0.01) {
        const sprW = Math.round(sprite.width * h.scale);
        const sprH = Math.round(sprite.height * h.scale);
        ctx.globalAlpha = heartAlpha;
        ctx.drawImage(sprite, Math.round(hx - sprW / 2), Math.round(hy - sprH / 2), sprW, sprH);
      }
    }
  }

  ctx.globalAlpha = _todoIdolOverlayAlpha;

  // 3. Radial cutout around Rika and Pure Love Beam Corridor
  if (!isMahitoDomainActive && yutaFighter && yutaFighter.rika) {
    const rk = yutaFighter.rika;
    const isRikaActive = rk.active || 
      (yutaFighter.rikaEmergingForBeamTimer && yutaFighter.rikaEmergingForBeamTimer > 0) || 
      yutaFighter.isChannelingPureLoveBeam || 
      yutaFighter.isFiringPureLoveBeam || 
      (yutaFighter.rikaAlpha !== undefined && yutaFighter.rikaAlpha > 0);

    if (isRikaActive) {
      const rkX = rk.x;
      const rkY = rk.y;
      const cutoutRadius = (rk.radius || rk.r || 65) + 110;

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const cutoutGrad = ctx.createRadialGradient(rkX, rkY, 20, rkX, rkY, cutoutRadius);
      cutoutGrad.addColorStop(0.0, 'rgba(0, 0, 0, 1.0)');
      cutoutGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.8)');
      cutoutGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

      ctx.fillStyle = cutoutGrad;
      ctx.beginPath();
      ctx.arc(rkX, rkY, cutoutRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (yutaFighter.isFiringPureLoveBeam) {
      const beamAngle = yutaFighter.pureLoveBeamLockedAngle !== undefined ? yutaFighter.pureLoveBeamLockedAngle : (yutaFighter.gunAngle || 0);
      const beamOffset = (yutaFighter.r || 22) + 14;
      const startX = yutaFighter.x + Math.cos(beamAngle) * beamOffset;
      const startY = yutaFighter.y + Math.sin(beamAngle) * beamOffset;
      const beamLen = 2500;
      const beamWidth = 220;

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.translate(startX, startY);
      ctx.rotate(beamAngle);

      const beamGrad = ctx.createLinearGradient(0, -beamWidth / 2, 0, beamWidth / 2);
      beamGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
      beamGrad.addColorStop(0.25, 'rgba(0, 0, 0, 0.9)');
      beamGrad.addColorStop(0.5, 'rgba(0, 0, 0, 1.0)');
      beamGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.9)');
      beamGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, -beamWidth / 2, beamLen, beamWidth);
      ctx.restore();
    }
  }

  ctx.restore();
}
