// ─────────────────────────────────────────────
// ASH KETCHUM — HONEYCOMB BARRIER & POKÉMON COMPANION GRAPHICS
// Renders:
// 1. Hexagonal Honeycomb Forcefield Dome around Ash while Pokémon is deployed
// 2. Thrown Poké Ball & Recall Laser Beams
// 3. 8-Directional PMD Pokémon Sprite Sheets (Pikachu, Charizard/Mega X, Greninja, Lucario/Mega)
// 4. Staggered Water-Ripple Elemental Shockwaves & Projectiles (Rule 11 & Rule 26 Compliant)
// ─────────────────────────────────────────────

import { ashConfig } from '../../configs/characters/ashConfig.js';
import { drawMinionHealthBar } from '../statusEffects.js';

// Exact 8-directional PMD sprite sheet frame specs & canonical ground anchors (from animData/catalog.bytes)
const POKEMON_CLIP_SPECS = {
  pikachu: {
    idle:    { src: 'Assets/model/ash/pokemon/pikachu/Idle-Anim.png',   fw: 40, fh: 56, frames: 6,  dirs: 8, ticksPerFrame: 6, ax: 20, ay: 32 },
    walk:    { src: 'Assets/model/ash/pokemon/pikachu/Walk-Anim.png',   fw: 32, fh: 40, frames: 4,  dirs: 8, ticksPerFrame: 5, ax: 16, ay: 24 },
    attack:  { src: 'Assets/model/ash/pokemon/pikachu/Attack-Anim.png', fw: 80, fh: 80, frames: 10, dirs: 8, ticksPerFrame: 3, ax: 40, ay: 43 },
    special: { src: 'Assets/model/ash/pokemon/pikachu/Shock-Anim.png',  fw: 48, fh: 64, frames: 13, dirs: 8, ticksPerFrame: 3, ax: 24, ay: 36 },
    hurt:    { src: 'Assets/model/ash/pokemon/pikachu/Hurt-Anim.png',   fw: 48, fh: 64, frames: 2,  dirs: 8, ticksPerFrame: 6, ax: 24, ay: 33 },
    faint:   { src: 'Assets/model/ash/pokemon/pikachu/Faint-Anim.png',  fw: 40, fh: 40, frames: 4,  dirs: 8, ticksPerFrame: 6, ax: 20, ay: 24 }
  },
  charizard: {
    idle:    { src: 'Assets/model/ash/pokemon/charizard/Idle-Anim.png',   fw: 40, fh: 48, frames: 4,  dirs: 8, ticksPerFrame: 7, ax: 20, ay: 28 },
    walk:    { src: 'Assets/model/ash/pokemon/charizard/Walk-Anim.png',   fw: 40, fh: 48, frames: 4,  dirs: 8, ticksPerFrame: 6, ax: 20, ay: 28 },
    attack:  { src: 'Assets/model/ash/pokemon/charizard/Attack-Anim.png', fw: 80, fh: 88, frames: 14, dirs: 8, ticksPerFrame: 3, ax: 40, ay: 47 },
    special: { src: 'Assets/model/ash/pokemon/charizard/Shoot-Anim.png',  fw: 56, fh: 56, frames: 11, dirs: 8, ticksPerFrame: 3, ax: 28, ay: 31 },
    hurt:    { src: 'Assets/model/ash/pokemon/charizard/Hurt-Anim.png',   fw: 64, fh: 64, frames: 2,  dirs: 8, ticksPerFrame: 6, ax: 32, ay: 34 },
    faint:   { src: 'Assets/model/ash/pokemon/charizard/Faint-Anim.png',  fw: 48, fh: 48, frames: 4,  dirs: 8, ticksPerFrame: 6, ax: 24, ay: 28 }
  },
  charizard_mega: {
    idle:    { src: 'Assets/model/ash/pokemon/charizard/mega/Idle-Anim.png',   fw: 48, fh: 56, frames: 4,  dirs: 8, ticksPerFrame: 7, ax: 24, ay: 32 },
    walk:    { src: 'Assets/model/ash/pokemon/charizard/mega/Walk-Anim.png',   fw: 48, fh: 56, frames: 4,  dirs: 8, ticksPerFrame: 6, ax: 24, ay: 32 },
    attack:  { src: 'Assets/model/ash/pokemon/charizard/mega/Attack-Anim.png', fw: 88, fh: 96, frames: 14, dirs: 8, ticksPerFrame: 3, ax: 44, ay: 51 },
    special: { src: 'Assets/model/ash/pokemon/charizard/mega/Shoot-Anim.png',  fw: 56, fh: 64, frames: 11, dirs: 8, ticksPerFrame: 3, ax: 28, ay: 35 },
    hurt:    { src: 'Assets/model/ash/pokemon/charizard/mega/Hurt-Anim.png',   fw: 64, fh: 64, frames: 2,  dirs: 8, ticksPerFrame: 6, ax: 32, ay: 34 },
    faint:   { src: 'Assets/model/ash/pokemon/charizard/Faint-Anim.png',       fw: 48, fh: 48, frames: 4,  dirs: 8, ticksPerFrame: 6, ax: 24, ay: 28 }
  },
  greninja: {
    idle:    { src: 'Assets/model/ash/pokemon/greninja/Idle-Anim.png',   fw: 32, fh: 56, frames: 7,  dirs: 8, ticksPerFrame: 6, ax: 16, ay: 32 },
    walk:    { src: 'Assets/model/ash/pokemon/greninja/Walk-Anim.png',   fw: 32, fh: 48, frames: 4,  dirs: 8, ticksPerFrame: 5, ax: 16, ay: 28 },
    attack:  { src: 'Assets/model/ash/pokemon/greninja/Attack-Anim.png', fw: 64, fh: 72, frames: 12, dirs: 8, ticksPerFrame: 3, ax: 32, ay: 38 },
    special: { src: 'Assets/model/ash/pokemon/greninja/Shoot-Anim.png',  fw: 40, fh: 56, frames: 12, dirs: 8, ticksPerFrame: 3, ax: 20, ay: 31 },
    hurt:    { src: 'Assets/model/ash/pokemon/greninja/Hurt-Anim.png',   fw: 40, fh: 64, frames: 2,  dirs: 8, ticksPerFrame: 6, ax: 20, ay: 34 },
    faint:   { src: 'Assets/model/ash/pokemon/greninja/Hurt-Anim.png',   fw: 40, fh: 64, frames: 2,  dirs: 8, ticksPerFrame: 6, ax: 20, ay: 34 }
  },
  lucario: {
    idle:    { src: 'Assets/model/ash/pokemon/lucario/Idle-Anim.png',   fw: 32, fh: 56, frames: 6,  dirs: 8, ticksPerFrame: 6, ax: 16, ay: 32 },
    walk:    { src: 'Assets/model/ash/pokemon/lucario/Walk-Anim.png',   fw: 32, fh: 48, frames: 4,  dirs: 8, ticksPerFrame: 5, ax: 16, ay: 28 },
    attack:  { src: 'Assets/model/ash/pokemon/lucario/Attack-Anim.png', fw: 64, fh: 72, frames: 15, dirs: 8, ticksPerFrame: 2, ax: 32, ay: 39 },
    special: { src: 'Assets/model/ash/pokemon/lucario/RearUp-Anim.png', fw: 32, fh: 56, frames: 12, dirs: 8, ticksPerFrame: 3, ax: 16, ay: 32 },
    hurt:    { src: 'Assets/model/ash/pokemon/lucario/Hurt-Anim.png',   fw: 40, fh: 56, frames: 2,  dirs: 8, ticksPerFrame: 6, ax: 20, ay: 30 },
    faint:   { src: 'Assets/model/ash/pokemon/lucario/Faint-Anim.png',  fw: 32, fh: 48, frames: 4,  dirs: 8, ticksPerFrame: 6, ax: 16, ay: 28 }
  },
  lucario_mega: {
    idle:    { src: 'Assets/model/ash/pokemon/lucario/mega/Idle-Anim.png',   fw: 32, fh: 48, frames: 10, dirs: 8, ticksPerFrame: 5, ax: 16, ay: 28 },
    walk:    { src: 'Assets/model/ash/pokemon/lucario/mega/Walk-Anim.png',   fw: 32, fh: 48, frames: 4,  dirs: 8, ticksPerFrame: 5, ax: 16, ay: 28 },
    attack:  { src: 'Assets/model/ash/pokemon/lucario/mega/Attack-Anim.png', fw: 64, fh: 80, frames: 13, dirs: 8, ticksPerFrame: 2, ax: 33, ay: 42 },
    special: { src: 'Assets/model/ash/pokemon/lucario/mega/RearUp-Anim.png', fw: 32, fh: 56, frames: 12, dirs: 8, ticksPerFrame: 3, ax: 16, ay: 32 },
    hurt:    { src: 'Assets/model/ash/pokemon/lucario/mega/Hurt-Anim.png',   fw: 40, fh: 56, frames: 2,  dirs: 8, ticksPerFrame: 6, ax: 20, ay: 30 },
    faint:   { src: 'Assets/model/ash/pokemon/lucario/Faint-Anim.png',       fw: 32, fh: 48, frames: 4,  dirs: 8, ticksPerFrame: 6, ax: 16, ay: 28 }
  }
};

const _spriteSheetCache = new Map();

function _getPokemonSheet(srcPath) {
  if (!srcPath) return null;
  const cached = _spriteSheetCache.get(srcPath);
  if (cached) return cached;

  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = srcPath;
    _spriteSheetCache.set(srcPath, img);
    return img;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 12-Frame Pikachu Thunderbolt & Thunderbolt Impact Sprite Animations
// (Assets/model/ash/pokemon/pikachu/Thunderbolt/ & Thunderbolt_impact/)
// ---------------------------------------------------------------------------
const THUNDERBOLT_FRAME_COUNT = 12;
const THUNDERBOLT_FRAME_PATHS = Array.from(
  { length: 12 },
  (_, i) => `Assets/model/ash/pokemon/pikachu/Thunderbolt/thunderbolt-${i + 1}.png`
);
const THUNDERBOLT_IMPACT_FRAME_COUNT = 12;
const THUNDERBOLT_IMPACT_FRAME_PATHS = Array.from(
  { length: 12 },
  (_, i) => `Assets/model/ash/pokemon/pikachu/Thunderbolt_impact/impact-${i + 1}.png`
);

let _thunderboltFrames = [];
let _thunderboltFramesLoading = false;
let _thunderboltImpactFrames = [];
let _thunderboltImpactFramesLoading = false;

export function _getThunderboltFrames() {
  if (
    _thunderboltFrames.length === THUNDERBOLT_FRAME_COUNT &&
    _thunderboltFrames.every(img => img && img.complete && ((img.naturalWidth || img.width || 0) > 0))
  ) {
    return _thunderboltFrames;
  }
  if (!_thunderboltFramesLoading && typeof Image !== 'undefined') {
    _thunderboltFramesLoading = true;
    _thunderboltFrames = [];
    THUNDERBOLT_FRAME_PATHS.forEach((src, idx) => {
      const img = new Image();
      img.onload = () => { _thunderboltFrames[idx] = img; };
      img.onerror = (e) => { console.warn(`Failed to load Thunderbolt frame ${idx + 1} at ${src}:`, e); };
      img.src = `${src}?v=1`;
      _thunderboltFrames[idx] = img;
    });
  }
  return _thunderboltFrames;
}

export function _getThunderboltImpactFrames() {
  if (
    _thunderboltImpactFrames.length === THUNDERBOLT_IMPACT_FRAME_COUNT &&
    _thunderboltImpactFrames.every(img => img && img.complete && ((img.naturalWidth || img.width || 0) > 0))
  ) {
    return _thunderboltImpactFrames;
  }
  if (!_thunderboltImpactFramesLoading && typeof Image !== 'undefined') {
    _thunderboltImpactFramesLoading = true;
    _thunderboltImpactFrames = [];
    THUNDERBOLT_IMPACT_FRAME_PATHS.forEach((src, idx) => {
      const img = new Image();
      img.onload = () => { _thunderboltImpactFrames[idx] = img; };
      img.onerror = (e) => { console.warn(`Failed to load Thunderbolt impact frame ${idx + 1} at ${src}:`, e); };
      img.src = `${src}?v=1`;
      _thunderboltImpactFrames[idx] = img;
    });
  }
  return _thunderboltImpactFrames;
}

// Proactive eager initialization in browser environment
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getThunderboltFrames();
  _getThunderboltImpactFrames();
}

/**
 * Converts a continuous radians angle into PMD's 8-direction row index:
 * 0=Down (+Y), 1=DownRight, 2=Right (+X), 3=UpRight, 4=Up (-Y), 5=UpLeft, 6=Left (-X), 7=DownLeft
 */
function _angleToPmdDirectionRow(angleRad) {
  // Normalize angle to [0, 2*PI)
  const twoPi = Math.PI * 2;
  const norm = ((angleRad % twoPi) + twoPi) % twoPi;
  // In Canvas 2D: 0 = Right (Row 2), PI/2 = Down (Row 0), PI = Left (Row 6), 3PI/2 = Up (Row 4)
  // Notice each step of +PI/4 clockwise corresponds to -1 in PMD row (since PMD goes counter-clockwise from Down=0 -> DownRight=1 -> Right=2 -> UpRight=3 -> Up=4)
  const sector = Math.round(norm / (Math.PI / 4)) % 8;
  const sectorToPmdRow = [2, 1, 0, 7, 6, 5, 4, 3];
  return sectorToPmdRow[sector] ?? 0;
}

// Pre-computed hexagon center offsets for the Honeycomb Barrier lattice
const HEX_LATTICE_OFFSETS = [
  { q: 0, r: 0 },
  { q: 1, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: -1, r: 1 },
  { q: 2, r: 0 }, { q: -2, r: 0 }, { q: 0, r: 2 }, { q: 0, r: -2 },
  { q: 1, r: 1 }, { q: -1, r: -1 }, { q: 2, r: -1 }, { q: -2, r: 1 }, { q: 1, r: -2 }, { q: -1, r: 2 }
];

function _drawHexagon(ctx, cx, cy, hexR) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const vx = cx + Math.cos(a) * hexR;
    const vy = cy + Math.sin(a) * hexR;
    if (i === 0) ctx.moveTo(vx, vy);
    else ctx.lineTo(vx, vy);
  }
  ctx.closePath();
}

function _drawJaggedLightningPath(ctx, x1, y1, x2, y2, segments = 6, amp = 12, seed = 0) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let s = 1; s < segments; s++) {
    const t = s / segments;
    const wave = Math.sin(seed * 3.7 + s * 2.3) * amp * Math.sin(t * Math.PI);
    const px = x1 + dx * t + nx * wave;
    const py = y1 + dy * t + ny * wave;
    ctx.lineTo(px, py);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Draws the Hexagonal Honeycomb Forcefield Dome protecting Ash while his Pokémon is deployed.
 * Adheres strictly to Rule 11 (Zero shadowBlur).
 */
export function drawAshHoneycombBarrier(ctx, fighter) {
  if (!fighter || !fighter.isProtectedByHoneycombBarrier) return;

  const barrierR = fighter.honeycombBarrierRadius || ashConfig.honeycombBarrierRadius || 46;
  const tick = fighter._animTick || 0;
  const hitFlash = Math.max(0, (fighter.barrierHitFlashTimer || 0) / 14);
  const isMega = fighter.ultimateActiveTimer > 0;

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // 1. Clip interior to the circular dome perimeter
  ctx.beginPath();
  ctx.arc(0, 0, barrierR, 0, Math.PI * 2);
  ctx.clip();

  // 2. Translucent energy dome wash
  ctx.fillStyle = hitFlash > 0
    ? `rgba(250, 204, 21, ${0.22 + hitFlash * 0.25})`
    : (isMega ? 'rgba(250, 204, 21, 0.14)' : 'rgba(56, 189, 248, 0.13)');
  ctx.fillRect(-barrierR, -barrierR, barrierR * 2, barrierR * 2);

  // 3. Tessellated Honeycomb Hexagon Cells
  const cellR = 11.5;
  const dxStep = cellR * 1.5;
  const dyStep = cellR * Math.sqrt(3);

  for (let i = 0; i < HEX_LATTICE_OFFSETS.length; i++) {
    const cell = HEX_LATTICE_OFFSETS[i];
    const hx = cell.q * dxStep;
    const hy = (cell.r + cell.q * 0.5) * dyStep;
    const distRatio = Math.min(1, Math.hypot(hx, hy) / barrierR);
    const wave = 0.5 + 0.5 * Math.sin(tick * 0.10 - distRatio * 3.2 + i * 0.4);

    _drawHexagon(ctx, hx, hy, cellR - 1.0);

    // Individual hex cell fill pulse
    const cellAlpha = (0.08 + wave * 0.14 + hitFlash * 0.35) * (1 - distRatio * 0.25);
    ctx.fillStyle = (isMega || hitFlash > 0.2)
      ? `rgba(250, 204, 21, ${cellAlpha.toFixed(3)})`
      : `rgba(56, 189, 248, ${cellAlpha.toFixed(3)})`;
    ctx.fill();

    ctx.strokeStyle = hitFlash > 0
      ? `rgba(254, 240, 138, ${(0.55 + hitFlash * 0.4).toFixed(3)})`
      : `rgba(250, 204, 21, ${(0.28 + wave * 0.30).toFixed(3)})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.restore();

  // 4. Crisp Outer Hexagonal-Rim & Concentric Dome Ring (Outside clip)
  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  ctx.strokeStyle = hitFlash > 0 ? '#FEF08A' : (isMega ? '#FACC15' : '#38BDF8');
  ctx.lineWidth = 2.4 + hitFlash * 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, barrierR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(0, 0, barrierR - 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the in-flight thrown Poké Ball and any active elemental projectiles/shockwaves (Rule 26).
 */
export function drawAshVisualEffects(ctx, fighter) {
  if (!fighter) return;

  // 1. Thrown Poké Ball in Flight
  if (fighter.thrownPokeball) {
    const ball = fighter.thrownPokeball;
    const p = Math.max(0, Math.min(1, 1 - ball.timer / Math.max(1, ball.maxTimer)));
    const curX = ball.startX + (ball.targetX - ball.startX) * p;
    const curY = ball.startY + (ball.targetY - ball.startY) * p;
    const arcZ = Math.sin(p * Math.PI) * 34;
    const rot = p * Math.PI * 6;
    const ballR = 9;

    ctx.save();
    // Ground shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
    ctx.beginPath();
    ctx.ellipse(curX, curY + 6, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(curX, curY - arcZ);
    ctx.rotate(rot);

    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.arc(0, 0, ballR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ball.isMega ? '#1E293B' : '#EF4444';
    ctx.beginPath();
    ctx.arc(0, 0, ballR, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-ballR, 0);
    ctx.lineTo(ballR, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, ballR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 2. Active Elemental Projectiles (Thunderbolt, Water Shuriken, Aura Sphere, Flamethrower Fireballs)
  if (Array.isArray(fighter.activeElementalProjectiles)) {
    const tick = fighter._animTick || 0;
    for (let i = 0; i < fighter.activeElementalProjectiles.length; i++) {
      const proj = fighter.activeElementalProjectiles[i];
      ctx.save();
      ctx.translate(proj.x, proj.y);

      if (proj.kind === 'thunderbolt') {
        const tr = proj.r || 16;
        const travelAngle = Math.atan2(proj.vy || 0, proj.vx || 1);

        // Outer golden plasma corona (Rule 11 compliant — concentric shapes, zero shadowBlur)
        ctx.fillStyle = 'rgba(250, 204, 21, 0.34)';
        ctx.beginPath();
        ctx.arc(0, 0, tr * 1.35, 0, Math.PI * 2);
        ctx.fill();

        // Trailing jagged lightning tail
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 3.2;
        const tailX = -Math.cos(travelAngle) * (tr * 2.4);
        const tailY = -Math.sin(travelAngle) * (tr * 2.4);
        _drawJaggedLightningPath(ctx, 0, 0, tailX, tailY, 5, 9, tick * 0.45 + i);

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.6;
        _drawJaggedLightningPath(ctx, 0, 0, tailX, tailY, 5, 9, tick * 0.45 + i);

        // High-voltage electric core
        ctx.fillStyle = '#FACC15';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, tr * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, tr * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else if (proj.kind === 'waterShuriken') {
        ctx.rotate(proj.rot || 0);
        const sr = proj.r || 13;
        ctx.fillStyle = '#38BDF8';
        ctx.strokeStyle = '#E0F2FE';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let b = 0; b < 4; b++) {
          const ba = (Math.PI / 2) * b;
          ctx.lineTo(Math.cos(ba) * sr, Math.sin(ba) * sr);
          ctx.lineTo(Math.cos(ba + Math.PI / 4) * (sr * 0.36), Math.sin(ba + Math.PI / 4) * (sr * 0.36));
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (proj.kind === 'auraSphere') {
        const ar = proj.r || 15;
        ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, ar * 1.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#22D3EE';
        ctx.strokeStyle = '#ECFEFF';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(0, 0, ar, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Fire Blast / Dragon Flame Orb
        const fr = proj.r || 14;
        ctx.fillStyle = proj.isMega ? '#38BDF8' : '#F97316';
        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(0, 0, fr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // 3. Staggered Water-Ripple Shockwaves, Thunderbolt Strikes & Recall Beams (Rule 26 Compliant — Zero Radial Spokes)
  if (Array.isArray(fighter.activeVisualEffects)) {
    const tick = fighter._animTick || 0;
    for (let i = 0; i < fighter.activeVisualEffects.length; i++) {
      const fx = fighter.activeVisualEffects[i];
      const progress = Math.max(0, Math.min(1, 1 - fx.timer / Math.max(1, fx.maxTimer)));

      if (fx.type === 'recallBeam') {
        const alpha = Math.pow(1 - progress, 1.2);
        ctx.save();
        ctx.strokeStyle = `rgba(239, 68, 68, ${(0.85 * alpha).toFixed(3)})`;
        ctx.lineWidth = 4.5 * (1 - progress * 0.5);
        ctx.beginPath();
        ctx.moveTo(fx.fromX, fx.fromY);
        ctx.lineTo(fx.toX, fx.toY);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.90 * alpha).toFixed(3)})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(fx.fromX, fx.fromY);
        ctx.lineTo(fx.toX, fx.toY);
        ctx.stroke();
        ctx.restore();
      } else {
        // Rule 26: Sequential Water-Ripple Wavefront Staggering (t0 = 0.00, t1 = 0.12, t2 = 0.24)
        ctx.save();
        ctx.translate(fx.x, fx.y);
        const offsets = [0.00, 0.12, 0.24];
        const maxR = fx.maxRadius || 95;

        for (let k = 0; k < offsets.length; k++) {
          const tOffset = offsets[k];
          if (progress <= tOffset) continue;
          const lp = Math.min(1, (progress - tOffset) / (1 - tOffset));
          const rk = maxR * Math.pow(lp, 0.65);
          const popIn = Math.min(1, lp / 0.10);
          const fadeOut = Math.pow(1 - lp, 1.25);
          const waveAlpha = popIn * fadeOut;

          if (k === 0) {
            ctx.fillStyle = fx.washColor || `rgba(250, 204, 21, ${(0.18 * waveAlpha).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(0, 0, rk, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.strokeStyle = k === 0 ? '#FFFFFF' : (fx.color || '#FACC15');
          ctx.lineWidth = (k === 0 ? 3.0 : 2.0) * (0.45 + 0.55 * fadeOut);
          ctx.globalAlpha = waveAlpha;
          ctx.beginPath();
          ctx.arc(0, 0, rk, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        // Sky-Splitting Thunderbolt Lightning Column & Pikachu-to-Target Discharge Arc
        if (fx.type === 'thunderboltStrike' && progress < 0.78) {
          const boltAlpha = Math.pow(1 - (progress / 0.78), 1.15);
          const seed = (fx.seed || 0) + Math.floor(tick * 0.5);
          ctx.save();
          ctx.globalAlpha = boltAlpha;

          // Sky-to-target lightning bolt column
          const skyX = fx.x + Math.sin(seed) * 18;
          const skyY = fx.y - 235;
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 7.5 * (1 - progress * 0.45);
          _drawJaggedLightningPath(ctx, skyX, skyY, fx.x, fx.y, 8, 18, seed);

          ctx.strokeStyle = '#FEF08A';
          ctx.lineWidth = 4.2 * (1 - progress * 0.45);
          _drawJaggedLightningPath(ctx, skyX, skyY, fx.x, fx.y, 8, 18, seed);

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.0;
          _drawJaggedLightningPath(ctx, skyX, skyY, fx.x, fx.y, 8, 18, seed);

          // Direct electric arc from Pikachu's cheeks to target
          if (fx.fromX !== undefined && fx.fromY !== undefined) {
            ctx.strokeStyle = '#FACC15';
            ctx.lineWidth = 5.0 * (1 - progress * 0.4);
            _drawJaggedLightningPath(ctx, fx.fromX, fx.fromY, fx.x, fx.y, 7, 14, seed + 2.1);

            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2.0;
            _drawJaggedLightningPath(ctx, fx.fromX, fx.fromY, fx.x, fx.y, 7, 14, seed + 2.1);
          }

          ctx.restore();
        }
      }
    }
  }
}

/**
 * Renders the active Pokémon companion with 8-directional PMD sprite sheets & overhead minion HP bar.
 */
export function drawPokemonCompanion(ctx, pokemon) {
  if (!pokemon || (pokemon.hp <= 0 && (pokemon.faintTimer || 0) <= 0)) return;

  const r = pokemon.r || 22;
  const speciesKey = (pokemon.isMega && POKEMON_CLIP_SPECS[`${pokemon.speciesId}_mega`])
    ? `${pokemon.speciesId}_mega`
    : (pokemon.speciesId || 'pikachu');
  const specGroup = POKEMON_CLIP_SPECS[speciesKey] || POKEMON_CLIP_SPECS.pikachu;
  const stateKey = pokemon.animState || 'idle';
  const clipSpec = specGroup[stateKey] || specGroup.idle;
  const sheetImg = _getPokemonSheet(clipSpec.src);

  // Ground plane contact baseline: feet anchor squarely on the ground plane at groundY
  const groundY = r * 0.45;
  const z = Math.max(0, pokemon.z || 0);

  ctx.save();
  ctx.translate(pokemon.x, pokemon.y - z);

  // 1. Ground shadow ellipse & elemental aura ring directly underneath feet on floor plane
  const heightFactor = Math.max(0.35, 1.0 - (z / 180));
  const shadowY = groundY + z; // Stays on floor plane when airborne
  const shadowRx = r * 0.95 * heightFactor;
  const shadowRy = r * 0.36 * heightFactor;

  ctx.fillStyle = `rgba(15, 23, 42, ${(0.38 * heightFactor).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(0, shadowY, shadowRx, shadowRy, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = pokemon.isMega ? (pokemon.megaColor || '#38BDF8') : (pokemon.themeColor || '#FACC15');
  ctx.lineWidth = (pokemon.isMega ? 2.5 : 1.6) * heightFactor;
  ctx.beginPath();
  ctx.ellipse(0, shadowY, shadowRx * 1.15, shadowRy * 1.20, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Render 8-Directional PMD Sprite Sheet Frame (anchored 1:1 at ground feet position)
  if (sheetImg && sheetImg.complete && sheetImg.naturalWidth > 0) {
    const dirRow = Math.min(clipSpec.dirs - 1, _angleToPmdDirectionRow(pokemon.gunAngle || 0));
    const frameCol = Math.floor((pokemon.animTick || 0) / clipSpec.ticksPerFrame) % clipSpec.frames;
    const sx = frameCol * clipSpec.fw;
    const sy = dirRow * clipSpec.fh;
    const scale = pokemon.spriteScale || 1.5;
    const drawW = clipSpec.fw * scale;
    const drawH = clipSpec.fh * scale;

    const ax = clipSpec.ax !== undefined ? clipSpec.ax : (clipSpec.fw / 2);
    const ay = clipSpec.ay !== undefined ? clipSpec.ay : (clipSpec.fh * 0.6);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sheetImg,
      sx,
      sy,
      clipSpec.fw,
      clipSpec.fh,
      -ax * scale,
      groundY - (ay * scale),
      drawW,
      drawH
    );
  } else {
    // Procedural elemental emblem fallback while image loads
    ctx.fillStyle = pokemon.themeColor || '#FACC15';
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 3. Pikachu Thunderbolt Charging Windup & Continuous Lightning Torrent Beam
  if (pokemon.thunderboltState) {
    const castAngle = pokemon.thunderboltCastAngle || pokemon.gunAngle || 0;
    const cosA = Math.cos(castAngle);
    const sinA = Math.sin(castAngle);
    const scale = pokemon.spriteScale || 1.5;
    const ay = clipSpec.ay !== undefined ? clipSpec.ay : (clipSpec.fh * 0.6);
    // Origin at Pikachu's cheek pouch
    const originX = cosA * (r * 0.70);
    const originY = groundY - (ay * scale * 0.45) + sinA * 4;
    const specSkill = pokemon.spec?.skills?.special;
    const tick = pokemon.animTick || 0;

    if (pokemon.thunderboltState === 'windup') {
      const p = 1.0 - Math.max(0, pokemon.thunderboltTimer / Math.max(1, pokemon.thunderboltMaxWindup || 20));
      const coronaR = (r * 0.65) * (0.4 + 0.6 * p);

      // High-voltage cheek charge aura
      ctx.fillStyle = `rgba(250, 204, 21, ${(0.15 + 0.25 * p).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(originX, originY, coronaR * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Converging jagged electric sparks into cheek pouches
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 1.8 + p * 1.2;
      for (let s = 0; s < 4; s++) {
        const sa = (Math.PI / 2) * s + (tick * 0.35);
        const sparkStartX = originX + Math.cos(sa) * (coronaR * (1.8 - 0.7 * p));
        const sparkStartY = originY + Math.sin(sa) * (coronaR * (1.8 - 0.7 * p));
        _drawJaggedLightningPath(ctx, sparkStartX, sparkStartY, originX, originY, 4, 7, tick * 0.5 + s);
      }

      // White-hot plasma spark core at cheeks
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(originX, originY, Math.max(2, coronaR * 0.35), 0, Math.PI * 2);
      ctx.fill();
    } else if (pokemon.thunderboltState === 'active') {
      const beamW = specSkill?.beamWidth || 42;
      const maxRange = specSkill?.beamRange || 680;
      let beamLen = maxRange;
      if (pokemon.thunderboltTarget && pokemon.thunderboltTarget.hp > 0) {
        const distToTgt = Math.hypot(pokemon.thunderboltTarget.x - pokemon.x, pokemon.thunderboltTarget.y - pokemon.y);
        beamLen = Math.min(maxRange, Math.max(distToTgt + 120, maxRange * 0.85));
      }
      const endX = originX + cosA * beamLen;
      const endY = originY + sinA * beamLen;

      // Layer 1: Authentic 12-Frame Animated Thunderbolt Sprite (Assets/model/ash/pokemon/pikachu/Thunderbolt/)
      const tbFrames = _getThunderboltFrames();
      const tbIndex = Math.floor((tick * 0.45) % 12);
      const tbImg = tbFrames[tbIndex];
      let tbDrawn = false;
      if (tbImg && tbImg.complete && ((tbImg.naturalWidth || tbImg.width || 0) > 0)) {
        ctx.save();
        ctx.translate(originX, originY);
        ctx.rotate(castAngle);
        ctx.imageSmoothingEnabled = false;
        const scaleX = beamLen / 228.0;
        const scaleY = (beamW * 2.8) / 256.0;
        ctx.drawImage(tbImg, -20 * scaleX, -128 * scaleY, 256 * scaleX, 256 * scaleY);
        ctx.restore();
        tbDrawn = true;
      }

      // Layer 2: Translucent Outer Golden Plasma Wash (Rule 11 compliant: zero shadowBlur)
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.34)';
      ctx.lineWidth = beamW * 1.35;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Layer 3: High-Voltage Golden Ionization Sheath
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = beamW * 0.65;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Layer 4: Supersonic Pure White Laser Core
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = beamW * 0.28;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Layer 5: Branching Dynamic Jagged Lightning Paths
      const numBranches = 3;
      for (let b = 0; b < numBranches; b++) {
        ctx.strokeStyle = b === 0 ? '#FFFFFF' : (b === 1 ? '#FEF08A' : '#FACC15');
        ctx.lineWidth = b === 0 ? 1.6 : (b === 1 ? 2.4 : 3.2);
        _drawJaggedLightningPath(ctx, originX, originY, endX, endY, 12, beamW * 0.42, tick * 0.45 + b * 2.1);
      }

      // Layer 6: Cheeks Plasma Eruption Core
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(originX, originY, beamW * 0.40, 0, Math.PI * 2);
      ctx.fill();

      // Layer 7: Authentic 12-Frame Animated Thunderbolt Impact VFX Sprite (Assets/model/ash/pokemon/pikachu/Thunderbolt_impact/)
      const impFrames = _getThunderboltImpactFrames();
      const impIndex = Math.floor((tick * 0.45) % 12);
      const impImg = impFrames[impIndex];
      const wavePhase = (tick * 0.25) % 1.0;

      // Impact blast directly on target's position
      if (pokemon.thunderboltTarget && pokemon.thunderboltTarget.hp > 0) {
        const tgtLocalX = pokemon.thunderboltTarget.x - pokemon.x;
        const tgtLocalY = (pokemon.thunderboltTarget.y - (pokemon.thunderboltTarget.z || 0)) - pokemon.y;
        if (impImg && impImg.complete && ((impImg.naturalWidth || impImg.width || 0) > 0)) {
          const impSize = beamW * 3.6;
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(impImg, tgtLocalX - impSize / 2, tgtLocalY - impSize / 2, impSize, impSize);
          ctx.restore();
        }

        // Concentric electric impact blast rings on target (Rule 26 Compliant)
        for (let k = 0; k < 2; k++) {
          const ringP = (wavePhase + k * 0.5) % 1.0;
          const ringR = (beamW * 0.9) + ringP * (beamW * 1.5);
          const ringAlpha = (1.0 - ringP) * 0.85;

          ctx.strokeStyle = k === 0 ? '#FFFFFF' : '#FACC15';
          ctx.lineWidth = (k === 0 ? 2.8 : 1.8) * (1.0 - ringP * 0.4);
          ctx.globalAlpha = ringAlpha;
          ctx.beginPath();
          ctx.arc(tgtLocalX, tgtLocalY, ringR, 0, Math.PI * 2);
          ctx.stroke();

          if (k === 0) {
            ctx.fillStyle = `rgba(250, 204, 21, ${(0.28 * ringAlpha).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(tgtLocalX, tgtLocalY, ringR * 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Beam terminus 12-frame impact & compression rings
      if (impImg && impImg.complete && ((impImg.naturalWidth || impImg.width || 0) > 0)) {
        const endImpSize = beamW * 2.8;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(impImg, endX - endImpSize / 2, endY - endImpSize / 2, endImpSize, endImpSize);
        ctx.restore();
      }

      for (let k = 0; k < 2; k++) {
        const ringP = (wavePhase + k * 0.45) % 1.0;
        const ringR = (beamW * 0.8) + ringP * (beamW * 1.4);
        const ringAlpha = (1.0 - ringP) * 0.85;

        ctx.strokeStyle = k === 0 ? '#FFFFFF' : '#FACC15';
        ctx.lineWidth = (k === 0 ? 2.6 : 1.8) * (1.0 - ringP * 0.4);
        ctx.globalAlpha = ringAlpha;
        ctx.beginPath();
        ctx.arc(endX, endY, ringR, 0, Math.PI * 2);
        ctx.stroke();

        if (k === 0) {
          ctx.fillStyle = `rgba(250, 204, 21, ${(0.24 * ringAlpha).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(endX, endY, ringR * 0.75, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;
    }
  }

  ctx.restore();

  // 3. Minion Health Bar cleanly anchored above Pokemon's head / crown
  if (pokemon.hp > 0) {
    const scale = pokemon.spriteScale || 1.5;
    const ay = clipSpec.ay !== undefined ? clipSpec.ay : (clipSpec.fh * 0.6);
    const spriteHeightAboveFeet = ay * scale;
    const barY = (pokemon.y - z) + groundY - spriteHeightAboveFeet - 12;
    drawMinionHealthBar(ctx, pokemon.x, barY, r * 1.8, 5, pokemon.hp, pokemon.maxHp, pokemon.themeColor || '#FACC15');
  }
}
