import { state, triggerGlobalScreenShake } from '../../../core/state.js';
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

  // ── 1. INNATE DOMAIN: UPPER CRIMSON VOID SKY & LOWER LUMINOUS CYAN ABYSSAL WATER ──
  ctx.save();
  if (isClashSecondary) {
    ctx.globalAlpha = 0.70; // Blends on top of existing domain during domain clash
  }

  const screenW = state.canvas ? state.canvas.width : 1920;
  const screenH = state.canvas ? state.canvas.height : 1080;
  const waterLineY = sy - 85;

  // 1a. Upper Dark Crimson Cursed Sky (Pitch Black with Sinister Dark-Crimson Cloud Formations)
  if (!fighter._cachedSkyGrad || fighter._cachedSkyGradH !== waterLineY || fighter._cachedSkyGradScreenH !== screenH) {
    fighter._cachedSkyGradH = waterLineY;
    fighter._cachedSkyGradScreenH = screenH;
    fighter._cachedSkyGrad = ctx.createLinearGradient(0, 0, 0, Math.max(1, waterLineY));
    fighter._cachedSkyGrad.addColorStop(0.0, 'rgba(1, 0, 1, 0.99)');     // Pitch black void crown
    fighter._cachedSkyGrad.addColorStop(0.25, 'rgba(6, 1, 3, 0.98)');    // Deep dark void
    fighter._cachedSkyGrad.addColorStop(0.55, 'rgba(38, 2, 8, 0.95)');   // Dark cursed burgundy
    fighter._cachedSkyGrad.addColorStop(0.80, 'rgba(68, 4, 14, 0.92)');  // Sinister crimson clouds
    fighter._cachedSkyGrad.addColorStop(1.0, 'rgba(8, 2, 10, 0.98)');    // Dark horizon haze
  }

  // 1b. Lower Luminous Teal-Cyan Abyssal Water Floor (Authentic Innate Domain Scene)
  if (!fighter._cachedWaterGrad || fighter._cachedWaterGradH !== screenH || fighter._cachedWaterGradY !== waterLineY) {
    fighter._cachedWaterGradY = waterLineY;
    fighter._cachedWaterGradH = screenH;
    fighter._cachedWaterGrad = ctx.createLinearGradient(0, waterLineY, 0, screenH);
    fighter._cachedWaterGrad.addColorStop(0.0, 'rgba(3, 32, 44, 0.95)');    // Deep teal water surface
    fighter._cachedWaterGrad.addColorStop(0.20, 'rgba(5, 58, 76, 0.92)');   // Illuminated turquoise depth
    fighter._cachedWaterGrad.addColorStop(0.55, 'rgba(3, 38, 54, 0.94)');   // Dark aquatic depth
    fighter._cachedWaterGrad.addColorStop(0.85, 'rgba(2, 22, 32, 0.96)');   // Abyssal teal-black
    fighter._cachedWaterGrad.addColorStop(1.0, 'rgba(1, 10, 16, 0.98)');    // Deep ocean abyss floor
  }

  // Draw Sky & Water Floor
  ctx.fillStyle = fighter._cachedSkyGrad;
  ctx.fillRect(0, 0, screenW, Math.max(0, waterLineY));

  // Sinister rolling dark cursed clouds in upper sky
  if (!isLowQuality && waterLineY > 20) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    const cloudCount = isMultiDomain ? 3 : 6;
    for (let c = 0; c < cloudCount; c++) {
      const ccx = (sx - 450 + (c * 170) + Math.sin(time * 0.0008 + c) * 20);
      const ccy = (waterLineY * 0.45) + Math.sin(time * 0.0012 + c * 1.5) * 12;
      const rx = 135 + (c % 3) * 28;
      const ry = 36 + (c % 2) * 14;
      ctx.beginPath();
      ctx.ellipse(ccx, ccy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Ominous deep crimson cloud rim highlights
    ctx.fillStyle = 'rgba(120, 8, 18, 0.15)';
    for (let c = 0; c < cloudCount; c += 2) {
      const ccx = (sx - 380 + (c * 170) + Math.sin(time * 0.0008 + c) * 20);
      const ccy = (waterLineY * 0.52) + Math.sin(time * 0.0012 + c * 1.5) * 12;
      ctx.beginPath();
      ctx.ellipse(ccx, ccy, 110, 28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.fillStyle = fighter._cachedWaterGrad;
  ctx.fillRect(0, Math.max(0, waterLineY), screenW, Math.max(0, screenH - waterLineY));
  ctx.restore();

  // ── 2. LUMINOUS GLOWING CYAN WATER LIGHT SHAFTS (SMOOTH ATMOSPHERIC GLOWS) ──
  const pillarOffsets = isLowQuality ? [-380, 380] : [-520, -280, 280, 520];
  const pillarW = isLowQuality ? 130 : 160;
  const halfPW = pillarW / 2;
  const pillarWaterTop = Math.max(0, waterLineY);
  const pillarWaterH = Math.max(0, screenH - pillarWaterTop);

  for (let i = 0; i < pillarOffsets.length; i++) {
    const colX = sx + pillarOffsets[i];
    if (colX + halfPW < 0 || colX - halfPW > screenW) continue;

    ctx.save();
    const colGrad = ctx.createLinearGradient(colX - halfPW, 0, colX + halfPW, 0);
    colGrad.addColorStop(0.0, 'rgba(0, 229, 255, 0)');
    colGrad.addColorStop(0.30, 'rgba(4, 120, 150, 0.06)');
    colGrad.addColorStop(0.50, 'rgba(0, 229, 255, 0.18)'); // Soft seamless cyan light glow
    colGrad.addColorStop(0.70, 'rgba(4, 120, 150, 0.06)');
    colGrad.addColorStop(1.0, 'rgba(0, 229, 255, 0)');

    ctx.fillStyle = colGrad;
    ctx.fillRect(colX - halfPW, pillarWaterTop, pillarW, pillarWaterH);
    ctx.restore();
  }

  // ── 3. WATER SURFACE HORIZON MENISCUS & GLOWING CYAN MIST ──
  ctx.save();
  const mistH = 35;
  const mistGrad = ctx.createLinearGradient(0, waterLineY - mistH, 0, waterLineY + mistH);
  mistGrad.addColorStop(0.0, 'rgba(0, 229, 255, 0)');
  mistGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.22)');
  mistGrad.addColorStop(1.0, 'rgba(0, 229, 255, 0)');
  ctx.fillStyle = mistGrad;
  ctx.fillRect(0, waterLineY - mistH, screenW, mistH * 2);
  ctx.restore();



  // ── 6. FLOATING BIOLUMINESCENT AQUATIC MOTES / PARTICLES ──
  if (!isLowQuality) {
    const moteCount = isMultiDomain ? 8 : 16;
    ctx.fillStyle = 'rgba(0, 229, 255, 0.38)';
    for (let m = 0; m < moteCount; m++) {
      const seedX = (sx - 500 + (m * 83) % 1000);
      const seedY = waterLineY + 30 + ((m * 67 + time * 0.03) % Math.max(100, screenH - waterLineY));
      const moteR = 1.2 + (m % 3) * 0.6;
      ctx.beginPath();
      ctx.arc(seedX + Math.sin(time * 0.002 + m) * 12, seedY, moteR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── DOMAIN CLASH: Cyan/crimson water ripples radiating toward opponent domain ──
  if (isYutaClash) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const yDomX = yutaClashFighter.domainX !== undefined ? yutaClashFighter.domainX : yutaClashFighter.x;
    const yDomY = yutaClashFighter.domainY !== undefined ? yutaClashFighter.domainY : yutaClashFighter.y;
    const dirAngle = Math.atan2(yDomY - sy, yDomX - sx);

    const rippleCount = isLowQuality ? 2 : 5;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.32)';
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

  // ── 7. INVERTED SHRINE REFLECTION IN GLOWING CYAN WATER ──
  if (!isLowQuality) {
    ctx.save();
    ctx.translate(sx, waterLineY);
    ctx.scale(1, -0.55);
    ctx.globalAlpha = 0.38;
    fighter._drawShrineBody(ctx);

    // Aquatic teal wash over the inverted reflection
    ctx.fillStyle = 'rgba(2, 28, 40, 0.52)';
    ctx.fillRect(-220, -180, 440, 360);

    // Subtle cyan caustics glow on reflection
    ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
    ctx.fillRect(-220, -180, 440, 360);
    ctx.restore();
  }

  // ── 8. FIGHTER WATER RIPPLES & REFLECTIONS ──
  if (!isLowQuality && state.fighters) {
    state.fighters.forEach(f => {
      if (f && f.hp > 0) {
        ctx.save();
        ctx.translate(f.x, f.y + f.r * 1.5);
        ctx.scale(1, 0.32);

        // Dark cyan water shadow
        ctx.fillStyle = 'rgba(0, 229, 255, 0.22)';
        ctx.beginPath();
        ctx.arc(0, 0, f.r * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Expanding concentric cyan ripples
        const ripPhase = (time * 0.003 + (f.x + f.y) * 0.01) % 1;
        const ripR = (f.r * 0.8) + ripPhase * (f.r * 1.6);
        const ripAlpha = (1 - ripPhase) * 0.35;
        ctx.strokeStyle = `rgba(0, 229, 255, ${ripAlpha.toFixed(2)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, ripR, 0, Math.PI * 2);
        ctx.stroke();

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

  // ── DOMAIN CLASH: Crimson energy border on Sukuna's domain edge ──
  if (isYutaClash) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

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
        // ── 1. Check if target can dodge the domain slice line (e.g. Saitama's Caped Baldy Reflexes) ──
        if (typeof target.dodgeSliceLine === 'function') {
          const didDodge = target.dodgeSliceLine({
            isSliceLine: true,
            angle,
            cx,
            cy,
            normalX,
            normalY,
            thickness,
            attacker: fighter
          });
          if (didDodge) {
            hitTargetsThisWave.add(target);
            return; // Clean dodge! Evades damage, ricochet knockback, and sparks!
          }
        }

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

        let tookDamage = true;
        if (typeof target.takeDamage === 'function') {
          const dmgResult = target.takeDamage(finalDamage, fighter, {
            isDomain: true,
            isDomainSlash: true,
            isSukunaDomainSliceLine: true,
            bypassShield: true,
            isSukunaSlash: true,
            isGuaranteedHit: true,
            undodgeable: true,
            alreadyCheckedDodge: true,
            angle,
            normalX,
            normalY,
            cx,
            cy,
            thickness,
            isCrit
          });
          if (dmgResult === false) {
            tookDamage = false;
          }
        }

        if (tookDamage) {
          hitTargetsThisWave.add(target);
          hitAny = true;

          // Standard crimson slash hit sparks & impact flash (no ricochet / parry effect)
          spawnSparks(target.x, target.y, 8, 'crimsonSniper', '#8B0000');
          spawnImpactFlash(target.x, target.y, 20, 'crimsonSniper');
        } else {
          hitTargetsThisWave.add(target);
        }
      }
    });
  }

  // Cap pool tightly to max 8 lines
  while (_domainSlashLines.length > 8) {
    _domainSlashLines.shift();
  }

  // Small arena screen shake when Malevolent Shrine cut lines slash
  if (_domainSlashLines.length > 0) {
    const shakeIntensity = hitAny 
      ? (CONFIG.sukuna?.domainSlashHitShakeIntensity ?? 2.4)
      : (CONFIG.sukuna?.domainSlashShakeIntensity ?? 1.8);
    const shakeDuration = CONFIG.sukuna?.domainSlashShakeDuration ?? 3;
    triggerGlobalScreenShake(shakeIntensity, shakeDuration);
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
