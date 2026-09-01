// ─────────────────────────────────────────────
// SUKUNA DOMAIN EXPANSION (MALEVOLENT SHRINE) VISUAL RENDERER
// ─────────────────────────────────────────────
import { state } from '../../../core/state.js';
import { CONFIG } from '../../../core/config.js';
import { spawnSparks, spawnImpactFlash } from '../../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';

export function renderSukunaDomainBackground(fighter, ctx, isClashSecondary = false) {
  if (!fighter || !fighter.domainActive) return;

  const domainRadius = 1000;
  const time = Date.now();
  const sx = fighter.domainX !== undefined ? fighter.domainX : fighter.x;
  const sy = fighter.domainY !== undefined ? fighter.domainY : fighter.y;

  // Detect low quality / low FPS mode
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));

  ctx.save();

  // In Dark Mode: Strictly clip Sukuna's Domain Expansion visual to the arena boundaries
  // In Light Mode: Let the domain visual spread across the full screen unclipped
  const _isDarkMode = Boolean(typeof state !== 'undefined' && (state.arenaTheme === 'dark' || state.darkMode));
  const arena = state.arena || CONFIG.arena;
  if (_isDarkMode && arena) {
    const ww = arena.wallWidth || 4;
    ctx.beginPath();
    if (arena.shape === 'circle') {
      const acx = arena.x + arena.width / 2;
      const acy = arena.y + arena.height / 2;
      const ar = (arena.radius !== undefined ? arena.radius : (arena.width / 2)) - ww;
      ctx.arc(acx, acy, Math.max(0, ar), 0, Math.PI * 2);
    } else {
      ctx.rect(arena.x + ww, arena.y + ww, arena.width - ww * 2, arena.height - ww * 2);
    }
    ctx.clip();
  }

  // Detect if clashing with Yuta's domain specifically
  const isMultiDomain = (state.fighters && state.fighters.filter(f => f && f.domainActive).length > 1);
  const yutaClashFighter = isMultiDomain ? state.fighters.find(f => f && f.domainActive && (f.type === 'yuta' || (f._def && f._def.id === 'yuta'))) : null;
  const isYutaClash = !!yutaClashFighter;

  // ── 1. DARK LIQUID WATER FLOOR & SPECULAR SHEEN ──
  ctx.save();
  if (isClashSecondary) {
    ctx.globalAlpha = 0.70; // Blends on top of existing domain during domain clash
  }

  const screenW = state.canvas ? state.canvas.width : 1920;
  const screenH = state.canvas ? state.canvas.height : 1080;

  if (!fighter._cachedLiquidGrad || fighter._cachedLiquidGradH !== screenH) {
    fighter._cachedLiquidGradH = screenH;
    fighter._cachedLiquidGrad = ctx.createLinearGradient(0, 0, 0, screenH);
    fighter._cachedLiquidGrad.addColorStop(0, 'rgba(15, 2, 5, 0.88)');
    fighter._cachedLiquidGrad.addColorStop(0.3, 'rgba(40, 4, 10, 0.82)');
    fighter._cachedLiquidGrad.addColorStop(0.7, 'rgba(25, 3, 8, 0.86)');
    fighter._cachedLiquidGrad.addColorStop(1, 'rgba(10, 1, 3, 0.92)');
  }

  ctx.fillStyle = fighter._cachedLiquidGrad;
  // Fill inside clipped arena
  ctx.fillRect(0, 0, screenW, screenH);
  ctx.restore();

  // Horizontal liquid water wave sheen lines across the floor (batched single-stroke for 60 FPS performance)
  const waveCount = isLowQuality ? 3 : (isMultiDomain ? 5 : 10);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(240, 80, 80, 0.16)';
  ctx.beginPath();
  for (let w = 0; w < waveCount; w++) {
    const wy = sy - 150 + w * 45 + Math.sin(time * 0.002 + w) * 8;
    ctx.moveTo(sx - 1200, wy);
    ctx.quadraticCurveTo(sx, wy + Math.sin(time * 0.004 + w * 2) * 12, sx + 1200, wy);
  }
  ctx.stroke();

  // ── DOMAIN CLASH: Blood-water crimson ripples radiating toward Yuta's domain side ──
  if (isYutaClash) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const yDomX = yutaClashFighter.domainX !== undefined ? yutaClashFighter.domainX : yutaClashFighter.x;
    const yDomY = yutaClashFighter.domainY !== undefined ? yutaClashFighter.domainY : yutaClashFighter.y;
    const dirAngle = Math.atan2(yDomY - sy, yDomX - sx);

    // Radiate fewer ripples in low quality (2 instead of 5)
    const rippleCount = isLowQuality ? 2 : 5;
    ctx.strokeStyle = 'rgba(180, 20, 20, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let r = 0; r < rippleCount; r++) {
      const rippleRadius = 80 + r * 55 + Math.sin(time * 0.003 + r * 1.2) * 15;
      ctx.moveTo(sx + Math.cos(dirAngle - Math.PI * 0.4) * rippleRadius, sy + Math.sin(dirAngle - Math.PI * 0.4) * rippleRadius);
      ctx.arc(sx, sy, rippleRadius, dirAngle - Math.PI * 0.4, dirAngle + Math.PI * 0.4);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ── 2. WATER REFLECTION OF THE SHRINE STRUCTURE (completely skipped in low quality to save CPU drawImage)
  if (!isLowQuality) {
    ctx.save();
    ctx.translate(sx, sy - 40);
    ctx.scale(1, -0.45);
    ctx.globalAlpha = 0.32;
    fighter._drawShrineBody(ctx);
    ctx.fillStyle = 'rgba(20, 2, 6, 0.45)';
    ctx.fillRect(-150, -150, 300, 300);
    ctx.restore();
  }

  // ── 3. FIGHTER WATER REFLECTIONS (completely skipped in low quality)
  if (!isLowQuality && state.fighters) {
    state.fighters.forEach(f => {
      if (f && f.hp > 0) {
        ctx.save();
        ctx.translate(f.x, f.y + f.r * 1.6);
        ctx.scale(1, 0.3);
        ctx.fillStyle = 'rgba(255, 30, 30, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, f.r * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  ctx.restore();
}

export function renderSukunaDomainForeground(fighter, ctx) {
  if (!fighter || !fighter.domainActive) return;

  const time = Date.now();
  const sx = fighter.domainX !== undefined ? fighter.domainX : fighter.x;
  const sy = fighter.domainY !== undefined ? fighter.domainY : fighter.y;

  // Detect low quality / low FPS mode
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));

  // Detect Yuta domain clash
  const isMultiDomain = (state.fighters && state.fighters.filter(f => f && f.domainActive).length > 1);
  const yutaClashFighter = isMultiDomain ? state.fighters.find(f => f && f.domainActive && (f.type === 'yuta' || (f._def && f._def.id === 'yuta'))) : null;
  const isYutaClash = !!yutaClashFighter;

  ctx.save();

  // ── REAL SHRINE STRUCTURE (Above Water Level - Shifted higher toward top) ──
  ctx.save();
  ctx.translate(sx, sy - 120);
  fighter._drawShrineBody(ctx);
  ctx.restore();

  // ── DOMAIN CLASH: Crimson cleave slash arcs flickering around the Shrine ──
  if (isYutaClash) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 3 rotating cleave slash arcs (draw only 1 in low quality mode to save paths)
    const slashCount = isLowQuality ? 1 : 3;
    ctx.strokeStyle = 'rgba(255, 20, 20, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let s = 0; s < slashCount; s++) {
      const slashAngle = (s / 3) * Math.PI * 2 + time * 0.004;
      const slashRadius = 80 + Math.sin(time * 0.005 + s * 2) * 20;
      const arcStart = slashAngle - 0.4;
      const arcEnd = slashAngle + 0.4;
      ctx.moveTo(sx + Math.cos(arcStart) * slashRadius, sy - 120 + Math.sin(arcStart) * slashRadius);
      ctx.arc(sx, sy - 120, slashRadius, arcStart, arcEnd);
    }
    ctx.stroke();

    // Pulsing crimson energy border on Sukuna's domain edge
    const borderPulse = 0.3 + Math.sin(time / 220) * 0.15;
    ctx.strokeStyle = `rgba(220, 20, 60, ${borderPulse})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(sx, sy, 450, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

// ─────────────────────────────────────────────
// DOMAIN SLASH CUT LINES — Arena-Clipped Spatial Dismantling (Ultra-Optimized 60 FPS)
// ─────────────────────────────────────────────

// Static pool array to completely eliminate per-frame GC allocations
const _domainSlashLines = [];
let _slashLineIdCounter = 0;

/**
 * Spawn new domain slash cut lines into the active pool and execute physical hits.
 * Each slash line performs a geometric intersection hit test against all valid targets in the arena.
 * Called from applyDomainEffect() on each damage tick.
 * @param {object} fighter - The Sukuna fighter instance
 * @param {number} count - Number of new slash lines to spawn (2-3)
 * @returns {boolean} Whether any target was hit by the slash lines this tick
 */
export function spawnDomainSlashLines(fighter, count) {
  if (!fighter || !fighter.domainActive) return false;

  const arena = state.arena || CONFIG.arena;
  if (!arena) return false;

  const ax = arena.x;
  const ay = arena.y;
  const aw = arena.width;
  const ah = arena.height;
  const diag = Math.hypot(aw, ah);

  if (!fighter.domainTimeInsideMap) fighter.domainTimeInsideMap = new Map();

  // ── Unified Target Resolution (Rule #6: Fighters & Illusions) ──
  const myTeam = (typeof state !== 'undefined' && state.fighters) ? state.getFighterTeam(state.fighters.indexOf(fighter)) : null;
  const validTargets = [];

  if (state.fighters) {
    state.fighters.forEach((f, idx) => {
      if (f && f !== fighter && f.hp > 0) {
        if (f.domainImmunity && f.characterId !== 'toji' && f.type !== 'toji') return;
        const isEnemy = (myTeam === null || state.getFighterTeam(idx) !== myTeam);
        if (isEnemy) validTargets.push(f);
      }
    });
  }

  if (state.illusions) {
    state.illusions.forEach((ill) => {
      if (!ill || ill.hp <= 0 || ill.owner === fighter || ill.isRika) return;
      let isEnemy = true;
      if (myTeam !== null) {
        let illOwnerIndex = -1;
        if (ill.ownerIndex !== undefined) {
          illOwnerIndex = ill.ownerIndex;
        } else if (ill.owner && state.fighters && state.fighters.indexOf(ill.owner) !== -1) {
          illOwnerIndex = state.fighters.indexOf(ill.owner);
        }
        if (illOwnerIndex !== -1) {
          isEnemy = state.getFighterTeam(illOwnerIndex) !== myTeam;
        }
      }
      if (isEnemy) validTargets.push(ill);
    });
  }

  const slashCount = Math.min(3, count || (CONFIG.sukuna?.domainSlashesPerTick || 2));
  const baseDamage = CONFIG.sukuna?.domainSlashDamage ?? CONFIG.sukuna?.domainDamage ?? 15;
  const damageInterval = CONFIG.sukuna?.domainDamageInterval || 18;
  const rampRate = CONFIG.sukuna?.domainRampRatePerSec ?? 0.10;

  let hitAny = false;
  const hitTargetsThisWave = new Set();

  for (let i = 0; i < slashCount; i++) {
    let angle, cx, cy;

    // Distribute lines: Target-focused lines passing directly through enemies + spatial cuts across arena
    if (validTargets.length > 0 && i < validTargets.length) {
      const primaryTarget = validTargets[i % validTargets.length];
      angle = Math.random() * Math.PI;
      cx = primaryTarget.x + (Math.random() - 0.5) * 8;
      cy = primaryTarget.y + (Math.random() - 0.5) * 8;
    } else {
      // Spatial cut across the arena
      angle = Math.random() * Math.PI;
      const perpOffset = (Math.random() - 0.5) * diag * 0.75;
      cx = ax + aw / 2 + Math.cos(angle + Math.PI / 2) * perpOffset;
      cy = ay + ah / 2 + Math.sin(angle + Math.PI / 2) * perpOffset;
    }

    const maxLife = 24 + Math.floor(Math.random() * 12); // Shorter, crisper 24-36 frame lifetime
    const thickness = 2.2 + Math.random() * 1.8;

    const slashLine = {
      id: _slashLineIdCounter++,
      angle,
      timer: maxLife,
      maxLife,
      thickness,
      cx,
      cy,
    };

    _domainSlashLines.push(slashLine);

    // ── Physical Hit Intersection Check ──
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const normalX = -sinA;
    const normalY = cosA;

    validTargets.forEach((target) => {
      if (hitTargetsThisWave.has(target)) return; // Max 1 clean hit per target per wave to prevent VFX/damage stacking spikes

      const perpDist = Math.abs((target.x - cx) * normalX + (target.y - cy) * normalY);
      const hitRadius = (target.r || 20) + thickness + 14;

      if (perpDist <= hitRadius) {
        hitTargetsThisWave.add(target);
        hitAny = true;

        const timeInside = (fighter.domainTimeInsideMap.get(target) || 0) + damageInterval;
        fighter.domainTimeInsideMap.set(target, timeInside);

        const rampMultiplier = 1 + (timeInside / 60) * rampRate;
        const rawDamage = baseDamage * rampMultiplier;

        let finalDamage = rawDamage;
        let isCrit = false;
        if (typeof fighter.evaluateSlashCrit === 'function') {
          const res = fighter.evaluateSlashCrit(target, rawDamage, { isDomain: true });
          finalDamage = res.finalDamage;
          isCrit = res.isCrit;
        }

        if (typeof target.takeDamage === 'function') {
          target.takeDamage(finalDamage, fighter, {
            isDomain: true,
            bypassShield: true,
            isSukunaSlash: true,
            isCrit
          });
        }

        // Lightweight single impact spark & flash
        spawnSparks(target.x, target.y, 4, 'crimsonSniper', '#8B0000');
        spawnImpactFlash(target.x, target.y, 18, 'crimsonSniper');

        // Subtle slice impulse
        const pushDir = ((target.x - cx) * normalX + (target.y - cy) * normalY) >= 0 ? 1 : -1;
        target.vx = (target.vx || 0) + normalX * pushDir * 1.4;
        target.vy = (target.vy || 0) + normalY * pushDir * 1.4;
      }
    });
  }

  // Cap pool tightly to max 8 lines
  while (_domainSlashLines.length > 8) {
    _domainSlashLines.shift();
  }

  return hitAny;
}

// Offscreen Low-Res Nearest-Neighbor Arcade Buffer for Domain Slash Lines
let _pixelArcadeCanvas = null;
let _pixelArcadeCtx = null;
let _pixelArcadeW = 0;
let _pixelArcadeH = 0;

function _getPixelArcadeBuffer(w, h, scale = 2.5) {
  const lowW = Math.max(32, Math.ceil(w / scale));
  const lowH = Math.max(32, Math.ceil(h / scale));

  if (!_pixelArcadeCanvas || _pixelArcadeW !== lowW || _pixelArcadeH !== lowH) {
    _pixelArcadeW = lowW;
    _pixelArcadeH = lowH;
    _pixelArcadeCanvas = document.createElement('canvas');
    _pixelArcadeCanvas.width = lowW;
    _pixelArcadeCanvas.height = lowH;
    _pixelArcadeCtx = _pixelArcadeCanvas.getContext('2d');
    _pixelArcadeCtx.imageSmoothingEnabled = false;
  }
  return { canvas: _pixelArcadeCanvas, ctx: _pixelArcadeCtx, lowW, lowH, scale };
}

/**
 * Render all active domain slash cut lines, clipped to arena bounds.
 * Uses the Low-Res Nearest-Neighbor Arcade Buffer technique (locked 60 FPS).
 * Produces authentic chunky 16-bit retro arcade pixel staircases at any angle.
 * @param {object} fighter - The Sukuna fighter instance
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
 */
export function renderSukunaDomainSlashLines(fighter, ctx) {
  if (!fighter || !fighter.domainActive) return;
  if (_domainSlashLines.length === 0) return;

  const arena = state.arena || CONFIG.arena;
  if (!arena) return;

  const ax = arena.x;
  const ay = arena.y;
  const aw = arena.width;
  const ah = arena.height;
  const ww = arena.wallWidth || 4;
  const diag = Math.hypot(aw, ah) * 0.75;

  // 1. Get/Sync the Low-Res Native Arcade Buffer (2.5x chunky pixel scaling)
  const ARCADE_SCALE = 2.5;
  const { canvas: lowCanvas, ctx: lowCtx, lowW, lowH } = _getPixelArcadeBuffer(aw, ah, ARCADE_SCALE);

  lowCtx.clearRect(0, 0, lowW, lowH);
  lowCtx.imageSmoothingEnabled = false;

  // 2. Render active slash lines into the low-res buffer
  for (let i = _domainSlashLines.length - 1; i >= 0; i--) {
    const sl = _domainSlashLines[i];
    sl.timer--;
    if (sl.timer <= 0) {
      _domainSlashLines.splice(i, 1);
      continue;
    }

    const lifeRatio = sl.timer / sl.maxLife;
    const spawnAge = sl.maxLife - sl.timer;

    let alpha;
    if (spawnAge < 4) {
      alpha = 0.4 + (spawnAge / 4) * 0.6;
    } else if (lifeRatio > 0.3) {
      alpha = 1.0;
    } else {
      alpha = lifeRatio / 0.3;
    }

    const cosA = Math.cos(sl.angle);
    const sinA = Math.sin(sl.angle);
    const perpX = -sinA;
    const perpY = cosA;

    // Transform coordinates into low-res space
    const lowCx = (sl.cx - ax) / ARCADE_SCALE;
    const lowCy = (sl.cy - ay) / ARCADE_SCALE;
    const lowHalfLen = diag / ARCADE_SCALE;
    const lowCoreThick = Math.max(0.8, (sl.thickness * (0.7 + alpha * 0.3)) / ARCADE_SCALE);
    const lowCaseThick = lowCoreThick + 1.2;

    const startX = lowCx - cosA * lowHalfLen;
    const startY = lowCy - sinA * lowHalfLen;
    const endX = lowCx + cosA * lowHalfLen;
    const endY = lowCy + sinA * lowHalfLen;

    // Layer 1: Outer White Casing Polygon
    const topCaseX = lowCx + perpX * lowCaseThick;
    const topCaseY = lowCy + perpY * lowCaseThick;
    const botCaseX = lowCx - perpX * lowCaseThick;
    const botCaseY = lowCy - perpY * lowCaseThick;

    lowCtx.beginPath();
    lowCtx.moveTo(startX, startY);
    lowCtx.lineTo(topCaseX, topCaseY);
    lowCtx.lineTo(endX, endY);
    lowCtx.lineTo(botCaseX, botCaseY);
    lowCtx.closePath();

    lowCtx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(2)})`;
    lowCtx.fill();

    // Layer 2: Inner Pitch-Black Core Polygon (or White Flash on Spawn)
    const topMidX = lowCx + perpX * lowCoreThick;
    const topMidY = lowCy + perpY * lowCoreThick;
    const botMidX = lowCx - perpX * lowCoreThick;
    const botMidY = lowCy - perpY * lowCoreThick;

    lowCtx.beginPath();
    lowCtx.moveTo(startX, startY);
    lowCtx.lineTo(topMidX, topMidY);
    lowCtx.lineTo(endX, endY);
    lowCtx.lineTo(botMidX, botMidY);
    lowCtx.closePath();

    if (spawnAge < 3) {
      lowCtx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
    } else {
      lowCtx.fillStyle = `rgba(10, 10, 14, ${(alpha * 0.98).toFixed(2)})`;
    }
    lowCtx.fill();
  }

  // 3. Upscale from Low-Res Arcade Buffer to Main Canvas via Nearest-Neighbor Interpolation
  ctx.save();

  // Clip all slash lines cleanly inside the arena rectangle
  ctx.beginPath();
  ctx.rect(ax + ww, ay + ww, aw - ww * 2, ah - ww * 2);
  ctx.clip();

  ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling creates chunky stepped arcade pixels
  ctx.drawImage(lowCanvas, ax, ay, aw, ah);

  ctx.restore();
}

/**
 * Clear all domain slash lines (called when domain ends).
 */
export function clearDomainSlashLines() {
  _domainSlashLines.length = 0;
}
