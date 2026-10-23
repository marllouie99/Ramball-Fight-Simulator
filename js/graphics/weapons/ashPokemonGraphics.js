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

/**
 * Computes maximum ray distance from (startX, startY) along angle to the arena walls.
 * Prevents beams and effects from clipping outside the arena boundaries without degenerate 0-distance clamps.
 */
function _getRayArenaIntersection(startX, startY, angle, arena, innerMargin = 4) {
  if (!arena) return 700;
  const wallW = arena.wallWidth || 4;
  const margin = wallW + innerMargin;

  if (arena.shape === 'circle' || arena.radius) {
    const cx = arena.x + arena.width / 2;
    const cy = arena.y + arena.height / 2;
    const r = Math.max(20, (arena.radius || arena.width / 2) - margin);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const dx = startX - cx;
    const dy = startY - cy;
    const b = 2 * (dx * cosA + dy * sinA);
    const c = dx * dx + dy * dy - r * r;
    const disc = b * b - 4 * c;
    if (disc < 0) return 700;
    const t = (-b + Math.sqrt(disc)) / 2;
    return Math.max(40, t);
  }

  const minX = arena.x + margin;
  const maxX = arena.x + arena.width - margin;
  const minY = arena.y + margin;
  const maxY = arena.y + arena.height - margin;

  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  let maxDist = Infinity;

  // Vertical boundary collisions (X-axis)
  if (cosA > 0.0001) {
    const d = (maxX - startX) / cosA;
    if (d > 0 && d < maxDist) maxDist = d;
  } else if (cosA < -0.0001) {
    const d = (minX - startX) / cosA;
    if (d > 0 && d < maxDist) maxDist = d;
  }

  // Horizontal boundary collisions (Y-axis)
  if (sinA > 0.0001) {
    const d = (maxY - startY) / sinA;
    if (d > 0 && d < maxDist) maxDist = d;
  } else if (sinA < -0.0001) {
    const d = (minY - startY) / sinA;
    if (d > 0 && d < maxDist) maxDist = d;
  }

  if (maxDist === Infinity || maxDist < 40 || Number.isNaN(maxDist)) {
    const fallbackReach = Math.min(arena.width, arena.height) || 450;
    return Math.max(120, fallbackReach * 0.9);
  }

  return maxDist;
}

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
      img.src = `${src}?v=2`;
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
      img.src = `${src}?v=2`;
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

/**
 * Draws a crisp retro Pokémon pixel-art 4-point diamond spark (stepped 2x2 pixel blocks).
 */
function _drawPixelElectricSpark(ctx, cx, cy, size = 4) {
  const s = Math.max(2, Math.round(size / 2) * 2);
  const bx = Math.round(cx / 2) * 2;
  const by = Math.round(cy / 2) * 2;
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(bx - s - 2, by - 2, (s + 2) * 2, 4);
  ctx.fillRect(bx - 2, by - s - 2, 4, (s + 2) * 2);
  ctx.fillStyle = '#FACC15';
  ctx.fillRect(bx - s, by - 2, s * 2, 4);
  ctx.fillRect(bx - 2, by - s, 4, s * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(bx - 2, by - 2, 4, 4);
}

function _drawJaggedLightningPath(ctx, x1, y1, x2, y2, segments = 6, amp = 12, seed = 0) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  ctx.beginPath();
  ctx.moveTo(Math.round(x1 / 2) * 2, Math.round(y1 / 2) * 2);
  for (let s = 1; s < segments; s++) {
    const t = s / segments;
    // Crisp alternating Pokémon zigzag kink with 2px pixel-grid snapping
    const alt = (s % 2 === 0 ? 1 : -1) * (0.65 + 0.35 * Math.sin(seed * 3.7 + s * 1.9));
    const wave = alt * amp * Math.sin(t * Math.PI);
    const px = Math.round((x1 + dx * t + nx * wave) / 2) * 2;
    const py = Math.round((y1 + dy * t + ny * wave) / 2) * 2;
    ctx.lineTo(px, py);
  }
  ctx.lineTo(Math.round(x2 / 2) * 2, Math.round(y2 / 2) * 2);
  ctx.stroke();
}

/**
 * Draws the Directional Hexagonal Honeycomb Forcefield Shield protecting Ash while his Pokémon is deployed.
 * Stays hidden normally; dynamically manifests at the incoming attack/threat angle when attacked.
 * Adheres strictly to Rule 11 (Zero shadowBlur).
 */
export function drawAshHoneycombBarrier(ctx, fighter) {
  if (!fighter || !fighter.isProtectedByHoneycombBarrier) return;

  // Stays hidden until incoming threat or attack arrives
  const hitFlash = Math.max(0, (fighter.barrierHitFlashTimer || 0) / 16);
  const activeRatio = Math.max(0, (fighter.barrierActiveTimer || 0) / 22);
  const barrierAlpha = Math.max(hitFlash, activeRatio);
  if (barrierAlpha <= 0.01) return;

  const barrierR = fighter.honeycombBarrierRadius || ashConfig.honeycombBarrierRadius || 46;
  const tick = fighter._animTick || 0;
  const isMega = fighter.ultimateActiveTimer > 0;
  const barrierAngle = fighter.barrierAngle !== undefined ? fighter.barrierAngle : (fighter.gunAngle || 0);

  // Directional arc: projects a ~105-degree shielding sector centered at the incoming attack angle
  const arcSpan = Math.PI * 0.58; // ~105 degrees
  const startAngle = barrierAngle - arcSpan / 2;
  const endAngle = barrierAngle + arcSpan / 2;

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // 1. Clip to the directional arc sector facing the attack angle
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, barrierR + 2, startAngle, endAngle);
  ctx.closePath();
  ctx.clip();

  // 2. Translucent directional energy dome wash
  const baseAlpha = hitFlash > 0
    ? (0.28 + hitFlash * 0.35)
    : (isMega ? 0.22 : 0.18) * barrierAlpha;
  ctx.fillStyle = (isMega || hitFlash > 0.2)
    ? `rgba(250, 204, 21, ${baseAlpha.toFixed(3)})`
    : `rgba(56, 189, 248, ${baseAlpha.toFixed(3)})`;
  ctx.fillRect(-barrierR - 4, -barrierR - 4, (barrierR + 4) * 2, (barrierR + 4) * 2);

  // 3. Tessellated Honeycomb Hexagon Cells in the directional sector
  const cellR = 11.5;
  const dxStep = cellR * 1.5;
  const dyStep = cellR * Math.sqrt(3);

  for (let i = 0; i < HEX_LATTICE_OFFSETS.length; i++) {
    const cell = HEX_LATTICE_OFFSETS[i];
    const hx = cell.q * dxStep;
    const hy = (cell.r + cell.q * 0.5) * dyStep;
    const cellDist = Math.hypot(hx, hy);
    if (cellDist > barrierR + cellR) continue;

    // Check angular alignment with attack direction for progressive falloff
    const cellAngle = Math.atan2(hy, hx);
    let angleDiff = Math.abs(Math.atan2(Math.sin(cellAngle - barrierAngle), Math.cos(cellAngle - barrierAngle)));
    if (angleDiff > arcSpan / 2 + 0.35) continue;

    const angleFalloff = Math.max(0, 1.0 - angleDiff / (arcSpan / 2 + 0.35));
    const distRatio = Math.min(1, cellDist / barrierR);
    const wave = 0.5 + 0.5 * Math.sin(tick * 0.12 - distRatio * 3.2 + i * 0.4);

    _drawHexagon(ctx, hx, hy, cellR - 1.0);

    // Individual hex cell fill pulse focused on the attack angle
    const cellAlpha = (0.12 + wave * 0.16 + hitFlash * 0.45) * angleFalloff * barrierAlpha;
    ctx.fillStyle = (isMega || hitFlash > 0.2)
      ? `rgba(250, 204, 21, ${cellAlpha.toFixed(3)})`
      : `rgba(56, 189, 248, ${cellAlpha.toFixed(3)})`;
    ctx.fill();

    const strokeAlpha = (hitFlash > 0 ? (0.60 + hitFlash * 0.4) : (0.35 + wave * 0.35)) * angleFalloff * barrierAlpha;
    ctx.strokeStyle = (isMega || hitFlash > 0.2)
      ? `rgba(254, 240, 138, ${strokeAlpha.toFixed(3)})`
      : `rgba(186, 230, 253, ${strokeAlpha.toFixed(3)})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  ctx.restore();

  // 4. Directional Curved Shield Rim & Edge Accents (Outside clip)
  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  const rimAlpha = Math.min(1.0, barrierAlpha * (0.75 + hitFlash * 0.25));
  ctx.globalAlpha = rimAlpha;

  // Primary outer arc facing the attack
  ctx.strokeStyle = hitFlash > 0 ? '#FEF08A' : (isMega ? '#FACC15' : '#38BDF8');
  ctx.lineWidth = 2.8 + hitFlash * 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, barrierR, startAngle, endAngle);
  ctx.stroke();

  // Crisp inner laser glint arc
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, barrierR - 2.5, startAngle + 0.08, endAngle - 0.08);
  ctx.stroke();

  // Impact flash shockwave ring on hard block
  if (hitFlash > 0.15) {
    const pulseR = barrierR + (1.0 - hitFlash) * 12;
    ctx.strokeStyle = `rgba(254, 240, 138, ${(hitFlash * 0.8).toFixed(3)})`;
    ctx.lineWidth = 2.0 * hitFlash;
    ctx.beginPath();
    ctx.arc(0, 0, pulseR, startAngle - 0.1, endAngle + 0.1);
    ctx.stroke();
  }

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

        // Trailing pixel-art jagged lightning tail with dark ink outline
        const tailX = -Math.cos(travelAngle) * (tr * 2.4);
        const tailY = -Math.sin(travelAngle) * (tr * 2.4);
        ctx.strokeStyle = '#0E0F14';
        ctx.lineWidth = 4.8;
        _drawJaggedLightningPath(ctx, 0, 0, tailX, tailY, 5, 9, tick * 0.45 + i);

        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 3.0;
        _drawJaggedLightningPath(ctx, 0, 0, tailX, tailY, 5, 9, tick * 0.45 + i);

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.6;
        _drawJaggedLightningPath(ctx, 0, 0, tailX, tailY, 5, 9, tick * 0.45 + i);

        // Retro Pokémon pixel diamond spark head
        _drawPixelElectricSpark(ctx, 0, 0, tr * 0.85);
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

          // Authentic 12-Frame Pixel-Art Thunderbolt Sprite crashing down from the sky
          const tbFrames = _getThunderboltFrames();
          const tbFrameIdx = Math.min(11, Math.floor((progress / 0.78) * 12));
          const tbImg = tbFrames[tbFrameIdx];
          if (tbImg && tbImg.complete && ((tbImg.naturalWidth || tbImg.width || 0) > 0)) {
            const boltH = 270;
            const boltW = 92;
            const prevSmooth = ctx.imageSmoothingEnabled;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(tbImg, Math.round(fx.x - boltW / 2), Math.round(fx.y - boltH), boltW, boltH);
            ctx.imageSmoothingEnabled = prevSmooth;
          } else {
            // Fallback jagged lightning path
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
          }

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

      // Retro Pokémon Pixel-Art Cheek Charge Sparks & Jagged Arcs
      ctx.strokeStyle = '#0E0F14';
      ctx.lineWidth = 4.0;
      for (let s = 0; s < 4; s++) {
        const sa = (Math.PI / 2) * s + (tick * 0.35);
        const sparkStartX = originX + Math.cos(sa) * (coronaR * (1.8 - 0.7 * p));
        const sparkStartY = originY + Math.sin(sa) * (coronaR * (1.8 - 0.7 * p));
        _drawJaggedLightningPath(ctx, sparkStartX, sparkStartY, originX, originY, 4, 7, tick * 0.5 + s);
      }

      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2.2;
      for (let s = 0; s < 4; s++) {
        const sa = (Math.PI / 2) * s + (tick * 0.35);
        const sparkStartX = originX + Math.cos(sa) * (coronaR * (1.8 - 0.7 * p));
        const sparkStartY = originY + Math.sin(sa) * (coronaR * (1.8 - 0.7 * p));
        _drawJaggedLightningPath(ctx, sparkStartX, sparkStartY, originX, originY, 4, 7, tick * 0.5 + s);
        _drawPixelElectricSpark(ctx, sparkStartX, sparkStartY, 4);
      }

      // Stepped pixel diamond spark core at Pikachu's cheeks
      _drawPixelElectricSpark(ctx, originX, originY, Math.max(4, coronaR * 0.55));
    } else if (pokemon.thunderboltState === 'active') {
      const beamW = specSkill?.beamWidth || 42;
      const maxSkillRange = specSkill?.beamRange || 680;
      let beamLen = maxSkillRange;

      // Primary source of truth: beam length computed in AshFighter.js update loop
      if (typeof pokemon.thunderboltCurrentBeamLen === 'number' && pokemon.thunderboltCurrentBeamLen > 20) {
        beamLen = pokemon.thunderboltCurrentBeamLen;
      } else {
        const curArena = typeof state !== 'undefined' ? state.arena : null;
        const worldStartX = pokemon.x + originX;
        const worldStartY = pokemon.y - z + originY;
        const wallDist = curArena ? _getRayArenaIntersection(worldStartX, worldStartY, castAngle, curArena, 8) : maxSkillRange;
        beamLen = Math.min(maxSkillRange, wallDist);
        if (pokemon.thunderboltTarget && pokemon.thunderboltTarget.hp > 0) {
          const distToTgt = Math.hypot(pokemon.thunderboltTarget.x - pokemon.x, pokemon.thunderboltTarget.y - pokemon.y);
          beamLen = Math.min(beamLen, distToTgt);
        }
      }
      const endX = originX + cosA * beamLen;
      const endY = originY + sinA * beamLen;

      // Layer 1: Authentic 12-Frame Pixel-Art Pokémon Thunderbolt Sprite Stream (Assets/model/ash/pokemon/pikachu/Thunderbolt/)
      const tbFrames = _getThunderboltFrames();
      const tbIndex = Math.floor((tick * 0.50) % 12);
      const tbImg = tbFrames[tbIndex];
      const hasSprite = tbImg && tbImg.complete && ((tbImg.naturalWidth || tbImg.width || 0) > 0);
      if (hasSprite && beamLen > 4) {
        ctx.save();
        ctx.translate(originX, originY);
        // Sprite is vertical (origin at 128, 12; grounding tip at 128, 246)
        // Rotating by castAngle - PI/2 directs +Y along castAngle directly towards the target
        ctx.rotate(castAngle - Math.PI / 2);
        ctx.imageSmoothingEnabled = false;
        // Tile/repeat or scale cleanly to preserve crisp pixel block aspect ratio
        const segLen = 234.0;
        const scaleW = (beamW * 2.5) / 256.0;
        const numSegs = Math.max(1, Math.ceil(beamLen / segLen));
        const stepLen = beamLen / numSegs;
        const scaleL = stepLen / 234.0;
        for (let seg = 0; seg < numSegs; seg++) {
          const segFrame = tbFrames[(tbIndex + seg * 3) % 12] || tbImg;
          ctx.drawImage(segFrame, -128 * scaleW, seg * stepLen - 12 * scaleL, 256 * scaleW, 256 * scaleL);
        }
        ctx.restore();
      }

      // Layer 2: Core Pixel-Stepped Jagged Pokémon Lightning Stream & Arcs
      if (beamLen > 8) {
        ctx.strokeStyle = '#0E0F14';
        ctx.lineWidth = 6.0;
        _drawJaggedLightningPath(ctx, originX, originY, endX, endY, 10, beamW * 0.42, tick * 0.45);
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 4.0;
        _drawJaggedLightningPath(ctx, originX, originY, endX, endY, 10, beamW * 0.42, tick * 0.45);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.0;
        _drawJaggedLightningPath(ctx, originX, originY, endX, endY, 10, beamW * 0.42, tick * 0.45);

        // High-voltage diamond star sparks along beam trajectory
        const sparkCount = Math.max(2, Math.floor(beamLen / 70));
        for (let s = 1; s <= sparkCount; s++) {
          const spT = (s / (sparkCount + 1)) + Math.sin(tick * 0.2 + s) * 0.05;
          const sx = originX + cosA * (beamLen * spT) + (-sinA) * ((s % 2 === 0 ? 1 : -1) * 8);
          const sy = originY + sinA * (beamLen * spT) + (cosA) * ((s % 2 === 0 ? 1 : -1) * 8);
          _drawPixelElectricSpark(ctx, sx, sy, 5);
        }
      }

      // Layer 4: Cheeks High-Voltage Pixel Star Burst Core
      _drawPixelElectricSpark(ctx, originX, originY, beamW * 0.35);

      // Layer 5: Authentic 12-Frame Pixel-Art Thunderbolt Impact VFX Sprite (Assets/model/ash/pokemon/pikachu/Thunderbolt_impact/)
      // Plays once per strike at ~1.2 ticks per frame (14 frames total lifecycle)
      const impFrames = _getThunderboltImpactFrames();
      if (typeof pokemon.thunderboltImpactTimer === 'number') {
        const impIndex = Math.floor(pokemon.thunderboltImpactTimer / 1.2);
        if (impIndex >= 0 && impIndex < 12) {
          const impImg = impFrames[impIndex];
          if (impImg && impImg.complete && ((impImg.naturalWidth || impImg.width || 0) > 0)) {
            const endImpSize = Math.round(beamW * 4.0);
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(impImg, Math.round(endX - endImpSize / 2), Math.round(endY - endImpSize / 2), endImpSize, endImpSize);
            ctx.restore();
          } else {
            _drawPixelElectricSpark(ctx, endX, endY, Math.round(beamW * 0.9));
          }
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
