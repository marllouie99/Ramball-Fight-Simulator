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
import { POKEMON_FRAME_ANCHORS } from './pokemonAnchors.js';
import { renderPokemonHitFlash } from '../../systems/pokemonTrainerSystem.js';

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
    idle:       { src: 'Assets/model/ash/pokemon/pikachu/Idle-Anim.png',   fw: 40, fh: 56, frames: 6,  dirs: 8, ticksPerFrame: 6, ax: 20, ay: 32 },
    walk:       { src: 'Assets/model/ash/pokemon/pikachu/Walk-Anim.png',   fw: 32, fh: 40, frames: 4,  dirs: 8, ticksPerFrame: 5, ax: 16, ay: 24 },
    attack:     { src: 'Assets/model/ash/pokemon/pikachu/Attack-Anim.png', fw: 80, fh: 80, frames: 10, dirs: 8, ticksPerFrame: 3, ax: 40, ay: 43 },
    special:    { src: 'Assets/model/ash/pokemon/pikachu/Shock-Anim.png',  fw: 48, fh: 64, frames: 13, dirs: 8, ticksPerFrame: 3, ax: 24, ay: 36 },
    hurt:       { src: 'Assets/model/ash/pokemon/pikachu/Hurt-Anim.png',   fw: 48, fh: 64, frames: 2,  dirs: 8, ticksPerFrame: 6, durations: [3, 9], ax: 24, ay: 33 },
    faint:      { src: 'Assets/model/ash/pokemon/pikachu/Faint-Anim.png',  fw: 40, fh: 40, frames: 4,  dirs: 8, ticksPerFrame: 6, durations: [8, 12, 4, 10], ax: 20, ay: 24 },
    victory:    { src: 'Assets/model/ash/pokemon/pikachu/Pose-Anim.png',   fw: 32, fh: 40, frames: 3,  dirs: 8, ticksPerFrame: 8, durations: [12, 2, 8], ax: 16, ay: 24 },
    pose:       { src: 'Assets/model/ash/pokemon/pikachu/Pose-Anim.png',   fw: 32, fh: 40, frames: 3,  dirs: 8, ticksPerFrame: 8, durations: [12, 2, 8], ax: 16, ay: 24 },
    sleep:      { src: 'Assets/model/ash/pokemon/pikachu/Sleep-Anim.png',  fw: 32, fh: 40, frames: 2,  dirs: 1, ticksPerFrame: 30, durations: [30, 35], ax: 16, ay: 24 }
  },
  charizard: {
    idle:       { src: 'Assets/model/ash/pokemon/charizard/Idle-Anim.png',   fw: 40, fh: 48, frames: 4,  dirs: 8, ticksPerFrame: 7, ax: 20, ay: 28 },
    walk:       { src: 'Assets/model/ash/pokemon/charizard/Walk-Anim.png',   fw: 40, fh: 48, frames: 4,  dirs: 8, ticksPerFrame: 6, ax: 20, ay: 28 },
    attack:     { src: 'Assets/model/ash/pokemon/charizard/Attack-Anim.png', fw: 80, fh: 88, frames: 14, dirs: 8, ticksPerFrame: 3, ax: 40, ay: 47 },
    special:    { src: 'Assets/model/ash/pokemon/charizard/Shoot-Anim.png',  fw: 56, fh: 56, frames: 11, dirs: 8, ticksPerFrame: 3, ax: 28, ay: 31 },
    hurt:       { src: 'Assets/model/ash/pokemon/charizard/Hurt-Anim.png',   fw: 64, fh: 64, frames: 2,  dirs: 8, ticksPerFrame: 6, durations: [3, 9], ax: 32, ay: 34 },
    faint:      { src: 'Assets/model/ash/pokemon/charizard/Faint-Anim.png',  fw: 48, fh: 48, frames: 4,  dirs: 8, ticksPerFrame: 6, durations: [8, 12, 4, 10], ax: 24, ay: 28 },
    victory:    { src: 'Assets/model/ash/pokemon/charizard/Sleep-Anim.png',  fw: 32, fh: 48, frames: 2,  dirs: 1, ticksPerFrame: 30, durations: [30, 35], ax: 16, ay: 28 },
    sleep:      { src: 'Assets/model/ash/pokemon/charizard/Sleep-Anim.png',  fw: 32, fh: 48, frames: 2,  dirs: 1, ticksPerFrame: 30, durations: [30, 35], ax: 16, ay: 28 }
  },

  greninja: {
    idle:       { src: 'Assets/model/ash/pokemon/greninja/Idle-Anim.png',   fw: 32, fh: 56, frames: 7,  dirs: 8, ticksPerFrame: 6, ax: 16, ay: 32 },
    walk:       { src: 'Assets/model/ash/pokemon/greninja/Walk-Anim.png',   fw: 32, fh: 48, frames: 4,  dirs: 8, ticksPerFrame: 5, ax: 16, ay: 28 },
    attack:     { src: 'Assets/model/ash/pokemon/greninja/Attack-Anim.png', fw: 64, fh: 72, frames: 12, dirs: 8, ticksPerFrame: 3, ax: 32, ay: 38 },
    special:    { src: 'Assets/model/ash/pokemon/greninja/Shoot-Anim.png',  fw: 40, fh: 56, frames: 12, dirs: 8, ticksPerFrame: 3, ax: 20, ay: 31 },
    hurt:       { src: 'Assets/model/ash/pokemon/greninja/Hurt-Anim.png',   fw: 40, fh: 64, frames: 2,  dirs: 8, ticksPerFrame: 6, durations: [3, 9], ax: 20, ay: 34 },
    faint:      { src: 'Assets/model/ash/pokemon/greninja/Hurt-Anim.png',   fw: 40, fh: 64, frames: 2,  dirs: 8, ticksPerFrame: 6, durations: [8, 16], ax: 20, ay: 34 },
    victory:    { src: 'Assets/model/ash/pokemon/greninja/RearUp-Anim.png', fw: 32, fh: 48, frames: 16, dirs: 8, ticksPerFrame: 3, ax: 16, ay: 28 },
    rearUp:     { src: 'Assets/model/ash/pokemon/greninja/RearUp-Anim.png', fw: 32, fh: 48, frames: 16, dirs: 8, ticksPerFrame: 3, ax: 16, ay: 28 },
    sleep:      { src: 'Assets/model/ash/pokemon/greninja/Sleep-Anim.png',  fw: 24, fh: 40, frames: 2,  dirs: 1, ticksPerFrame: 30, durations: [30, 35], ax: 12, ay: 24 }
  },
  lucario: {
    idle:       { src: 'Assets/model/ash/pokemon/lucario/Idle-Anim.png',       fw: 32, fh: 56, frames: 6,  dirs: 8, ticksPerFrame: 6, ax: 16, ay: 32 },
    walk:       { src: 'Assets/model/ash/pokemon/lucario/Walk-Anim.png',       fw: 32, fh: 48, frames: 4,  dirs: 8, ticksPerFrame: 5, ax: 16, ay: 28 },
    attack:     { src: 'Assets/model/ash/pokemon/lucario/Attack-Anim.png',     fw: 64, fh: 72, frames: 15, dirs: 8, ticksPerFrame: 2, ax: 32, ay: 39 },
    special:    { src: 'Assets/model/ash/pokemon/lucario/RearUp-Anim.png',     fw: 32, fh: 56, frames: 12, dirs: 8, ticksPerFrame: 3, ax: 16, ay: 32 },
    hurt:       { src: 'Assets/model/ash/pokemon/lucario/Hurt-Anim.png',       fw: 40, fh: 56, frames: 2,  dirs: 8, ticksPerFrame: 6, durations: [3, 9], ax: 20, ay: 30 },
    faint:      { src: 'Assets/model/ash/pokemon/lucario/Faint-Anim.png',      fw: 32, fh: 48, frames: 4,  dirs: 8, ticksPerFrame: 6, durations: [8, 12, 4, 10], ax: 16, ay: 28 },
    victory:    { src: 'Assets/model/ash/pokemon/lucario/TumbleBack-Anim.png', fw: 24, fh: 40, frames: 10, dirs: 1, ticksPerFrame: 4, ax: 12, ay: 24 },
    tumbleback: { src: 'Assets/model/ash/pokemon/lucario/TumbleBack-Anim.png', fw: 24, fh: 40, frames: 10, dirs: 1, ticksPerFrame: 4, ax: 12, ay: 24 },
    tumbleBack: { src: 'Assets/model/ash/pokemon/lucario/TumbleBack-Anim.png', fw: 24, fh: 40, frames: 10, dirs: 1, ticksPerFrame: 4, ax: 12, ay: 24 },
    rearUp:     { src: 'Assets/model/ash/pokemon/lucario/RearUp-Anim.png',     fw: 32, fh: 56, frames: 12, dirs: 8, ticksPerFrame: 3, ax: 16, ay: 32 },
    sleep:      { src: 'Assets/model/ash/pokemon/lucario/Sleep-Anim.png',      fw: 24, fh: 32, frames: 2,  dirs: 1, ticksPerFrame: 30, durations: [30, 35], ax: 12, ay: 20 }
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

// Eagerly preload all Pokémon PMD sprite sheets into memory cache
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  try {
    for (const group of Object.values(POKEMON_CLIP_SPECS)) {
      for (const spec of Object.values(group)) {
        if (spec && spec.src) _getPokemonSheet(spec.src);
      }
    }
  } catch (_) {}
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

let _charizardFlameSheet = null;
let _charizardFlameSheetLoading = false;
export function _getCharizardFlameSheet() {
  if (_charizardFlameSheet && _charizardFlameSheet.complete && (_charizardFlameSheet.naturalWidth || _charizardFlameSheet.width || 0) > 0) {
    return _charizardFlameSheet;
  }
  if (!_charizardFlameSheetLoading && typeof Image !== 'undefined') {
    _charizardFlameSheetLoading = true;
    const img = new Image();
    img.onload = () => { _charizardFlameSheet = img; };
    img.onerror = (e) => { console.warn('Failed to load Charizard flame sheet:', e); };
    img.src = 'Assets/model/ash/pokemon/charizard/Flame/flamethrower-sheet.png?v=3';
    _charizardFlameSheet = img;
  }
  return _charizardFlameSheet;
}

const _charizardFlameFrames = new Array(18).fill(null);
let _charizardFlameFramesLoading = false;
export function _getCharizardFlameFrames() {
  if (!_charizardFlameFramesLoading && typeof Image !== 'undefined') {
    _charizardFlameFramesLoading = true;
    for (let i = 0; i < 18; i++) {
      const img = new Image();
      img.onload = () => { _charizardFlameFrames[i] = img; };
      img.onerror = (e) => { console.warn(`Failed to load Charizard flamethrower-${i + 1}.png:`, e); };
      img.src = `Assets/model/ash/pokemon/charizard/Flame/flamethrower-${i + 1}.png?v=3`;
      _charizardFlameFrames[i] = img;
    }
  }
  return _charizardFlameFrames;
}

// ---------------------------------------------------------------------------
// 12-Frame 12-Bit Charizard Charging Flame Animation
// (Assets/model/ash/pokemon/charizard/Flame_charge/flame_charge-1.png .. flame_charge-12.png)
// ---------------------------------------------------------------------------
const CHARIZARD_FLAME_CHARGE_FRAME_COUNT = 12;
let _charizardFlameChargeSheet = null;
let _charizardFlameChargeSheetLoading = false;
export function _getCharizardFlameChargeSheet() {
  if (_charizardFlameChargeSheet && _charizardFlameChargeSheet.complete && (_charizardFlameChargeSheet.naturalWidth || _charizardFlameChargeSheet.width || 0) > 0) {
    return _charizardFlameChargeSheet;
  }
  if (!_charizardFlameChargeSheetLoading && typeof Image !== 'undefined') {
    _charizardFlameChargeSheetLoading = true;
    const img = new Image();
    img.onload = () => { _charizardFlameChargeSheet = img; };
    img.onerror = (e) => { console.warn('Failed to load Charizard flame charge sheet:', e); };
    img.src = 'Assets/model/ash/pokemon/charizard/Flame_charge/flame_charge-sheet.png';
    _charizardFlameChargeSheet = img;
  }
  return _charizardFlameChargeSheet;
}

const _charizardFlameChargeFrames = new Array(CHARIZARD_FLAME_CHARGE_FRAME_COUNT).fill(null);
let _charizardFlameChargeFramesLoading = false;
export function _getCharizardFlameChargeFrames() {
  if (!_charizardFlameChargeFramesLoading && typeof Image !== 'undefined') {
    _charizardFlameChargeFramesLoading = true;
    for (let i = 0; i < CHARIZARD_FLAME_CHARGE_FRAME_COUNT; i++) {
      const img = new Image();
      img.onload = () => { _charizardFlameChargeFrames[i] = img; };
      img.onerror = (e) => { console.warn(`Failed to load Charizard flame_charge-${i + 1}.png:`, e); };
      img.src = `Assets/model/ash/pokemon/charizard/Flame_charge/flame_charge-${i + 1}.png`;
      _charizardFlameChargeFrames[i] = img;
    }
  }
  return _charizardFlameChargeFrames;
}

// Exact open-jaw pixel coordinates (mx, my) inside Charizard's 56x56 Shoot-Anim.png cell
// for each of PMD's 8 directions: 0=Down, 1=DownRight, 2=Right, 3=UpRight, 4=Up, 5=UpLeft, 6=Left, 7=DownLeft
const CHARIZARD_SHOOT_MOUTH_COORDS = [
  { mx: 27, my: 37 }, // 0: Down (+Y)
  { mx: 44, my: 33 }, // 1: Down-Right
  { mx: 50, my: 24 }, // 2: Right (+X)
  { mx: 46, my: 11 }, // 3: Up-Right
  { mx: 27, my: 7  }, // 4: Up (-Y)
  { mx: 8,  my: 11 }, // 5: Up-Left
  { mx: 4,  my: 24 }, // 6: Left (-X)
  { mx: 10, my: 33 }  // 7: Down-Left
];

// Exact reared-up mouth coordinates (mx, my) and skyward flame angle during Charizard's
// charging windup posture (Shoot-Anim.png cols 0 & 1 where Charizard throws his head up)
const CHARIZARD_WINDUP_MOUTH_COORDS = [
  { mx: 28, my: 9,  angle: -Math.PI * 0.50 }, // 0: Down (head reared straight up)
  { mx: 24, my: 9,  angle: -Math.PI * 0.42 }, // 1: Down-Right (head reared up, tilting slightly right)
  { mx: 22, my: 11, angle: -Math.PI * 0.35 }, // 2: Right (head reared up, open jaws facing up-right)
  { mx: 20, my: 14, angle: -Math.PI * 0.28 }, // 3: Up-Right
  { mx: 28, my: 18, angle: -Math.PI * 0.50 }, // 4: Up (open jaws facing up)
  { mx: 36, my: 14, angle: -Math.PI * 0.72 }, // 5: Up-Left
  { mx: 34, my: 11, angle: -Math.PI * 0.65 }, // 6: Left (open jaws facing up-left)
  { mx: 32, my: 9,  angle: -Math.PI * 0.58 }  // 7: Down-Left (head reared up, tilting slightly left)
];

/**
 * Computes the exact local canvas offset (originX, originY) and flame angle of Charizard's
 * reared-up open jaws during the charging windup animation (Shoot-Anim.png cols 0 & 1).
 */
export function getCharizardWindupMouthLocalOffset(pokemon, castAngle, windupProgress = 0) {
  const r = pokemon?.r || 22;
  const groundY = r * 0.45;
  const scale = pokemon?.spriteScale || 3.65;
  const dirRow = _angleToPmdDirectionRow(castAngle);
  const windupMouth = CHARIZARD_WINDUP_MOUTH_COORDS[dirRow] || CHARIZARD_WINDUP_MOUTH_COORDS[0];
  const frameCol = windupProgress < 0.5 ? 0 : 1;

  const specialAnchors = POKEMON_FRAME_ANCHORS.charizard?.special;
  const anchorIdx = (dirRow * 11 + frameCol) * 2;
  const ax = (specialAnchors && anchorIdx + 1 < specialAnchors.length) ? specialAnchors[anchorIdx] : 28;
  const ay = (specialAnchors && anchorIdx + 1 < specialAnchors.length) ? specialAnchors[anchorIdx + 1] : 31;

  return {
    originX: (windupMouth.mx - ax) * scale,
    originY: groundY + (windupMouth.my - ay) * scale,
    flameAngle: windupMouth.angle
  };
}

/**
 * Renders a single frame of Charizard's 12-Frame 12-Bit Charging Flame VFX
 * anchored directly at Charizard's reared-up charging mouth (nozzle at 32, 128 inside the 256x256 cell).
 */
function _drawCharizardFlameChargeSprite(ctx, originX, originY, flameAngle, frameIdx, alpha = 1.0) {
  const clampedIdx = Math.max(0, Math.min(CHARIZARD_FLAME_CHARGE_FRAME_COUNT - 1, Math.floor(frameIdx)));
  const frames = _getCharizardFlameChargeFrames();
  const frameImg = frames[clampedIdx];
  const hasFrame = frameImg && frameImg.complete && ((frameImg.naturalWidth || frameImg.width || 0) > 0);
  const sheetImg = _getCharizardFlameChargeSheet();
  const hasSheet = sheetImg && sheetImg.complete && ((sheetImg.naturalWidth || sheetImg.width || 0) > 0);

  if (!hasFrame && !hasSheet) return false;

  const cellW = 256;
  const cellH = 256;
  const anchorX = 32;
  const anchorY = 128;
  const drawScale = 0.44;
  const destX = -anchorX * drawScale;
  const destY = -anchorY * drawScale;
  const destW = cellW * drawScale;
  const destH = cellH * drawScale;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.rotate(flameAngle);
  if (Math.cos(flameAngle) < -0.05) {
    ctx.scale(1, -1);
  }
  ctx.imageSmoothingEnabled = false;
  if (alpha < 0.999) {
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  }

  if (hasFrame) {
    ctx.drawImage(frameImg, destX, destY, destW, destH);
  } else {
    const col = clampedIdx % 6;
    const row = Math.floor(clampedIdx / 6);
    ctx.drawImage(
      sheetImg,
      col * cellW, row * cellH, cellW, cellH,
      destX, destY, destW, destH
    );
  }

  ctx.restore();
  return true;
}

const CHARIZARD_FLAME_CHAIN_LINKS = 28;

function _normalizeAngleDiff(target, current) {
  let d = (target - current) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Computes the exact local canvas offset (originX, originY) of Charizard's open mouth
 * relative to (pokemon.x, pokemon.y - z), matching the 8-directional PMD Shoot-Anim.png sprite,
 * with smooth damping across 45° sector transitions so the nozzle never teleports when turning.
 */
export function getCharizardMouthLocalOffset(pokemon, castAngle) {
  const r = pokemon?.r || 22;
  const groundY = r * 0.45;
  const scale = pokemon?.spriteScale || 3.65;
  const dirRow = _angleToPmdDirectionRow(castAngle);
  const mouth = CHARIZARD_SHOOT_MOUTH_COORDS[dirRow] || CHARIZARD_SHOOT_MOUTH_COORDS[0];

  const specialAnchors = POKEMON_FRAME_ANCHORS.charizard?.special;
  // Active roar frames (col 4..9) use col 4 ground anchor as the canonical firing posture
  const anchorIdx = (dirRow * 11 + 4) * 2;
  const ax = (specialAnchors && anchorIdx + 1 < specialAnchors.length) ? specialAnchors[anchorIdx] : 28;
  const ay = (specialAnchors && anchorIdx + 1 < specialAnchors.length) ? specialAnchors[anchorIdx + 1] : 31;

  const targetX = (mouth.mx - ax) * scale;
  const targetY = groundY + (mouth.my - ay) * scale;

  if (pokemon && typeof pokemon === 'object') {
    if (typeof pokemon._smoothMouthX === 'number' && typeof pokemon._smoothMouthY === 'number') {
      return {
        originX: pokemon._smoothMouthX,
        originY: pokemon._smoothMouthY
      };
    }
  }

  return {
    originX: targetX,
    originY: targetY
  };
}

/**
 * Advances Charizard's 28-link Flamethrower chain angles & smooth mouth offset by 1 tick (60 FPS).
 * Link 0 locks to Charizard's current mouth angle; downstream links 1..27 follow like a flexible
 * fire chain with Frenet-Serret curvature clamping so the wide fire cloud whips smoothly without folding.
 */
export function updateCharizardFlameChain(pokemon, castAngle) {
  if (!pokemon) return;

  const r = pokemon.r || 22;
  const groundY = r * 0.45;
  const scale = pokemon.spriteScale || 3.65;
  const dirRow = _angleToPmdDirectionRow(castAngle);
  const mouth = CHARIZARD_SHOOT_MOUTH_COORDS[dirRow] || CHARIZARD_SHOOT_MOUTH_COORDS[0];
  const specialAnchors = POKEMON_FRAME_ANCHORS.charizard?.special;
  const anchorIdx = (dirRow * 11 + 4) * 2;
  const ax = (specialAnchors && anchorIdx + 1 < specialAnchors.length) ? specialAnchors[anchorIdx] : 28;
  const ay = (specialAnchors && anchorIdx + 1 < specialAnchors.length) ? specialAnchors[anchorIdx + 1] : 31;
  const targetX = (mouth.mx - ax) * scale;
  const targetY = groundY + (mouth.my - ay) * scale;

  if (typeof pokemon._smoothMouthX !== 'number' || typeof pokemon._smoothMouthY !== 'number') {
    pokemon._smoothMouthX = targetX;
    pokemon._smoothMouthY = targetY;
  } else {
    pokemon._smoothMouthX += (targetX - pokemon._smoothMouthX) * 0.45;
    pokemon._smoothMouthY += (targetY - pokemon._smoothMouthY) * 0.45;
  }

  if (!Array.isArray(pokemon.flamethrowerChainAngles) || pokemon.flamethrowerChainAngles.length !== CHARIZARD_FLAME_CHAIN_LINKS) {
    pokemon.flamethrowerChainAngles = new Array(CHARIZARD_FLAME_CHAIN_LINKS).fill(castAngle);
    return;
  }

  const chain = pokemon.flamethrowerChainAngles;
  chain[0] = castAngle;

  for (let k = 1; k < CHARIZARD_FLAME_CHAIN_LINKS; k++) {
    const u = k / (CHARIZARD_FLAME_CHAIN_LINKS - 1);
    const follow = 0.45 - 0.12 * u;
    chain[k] += _normalizeAngleDiff(chain[k - 1], chain[k]) * follow;

    // Frenet-Serret non-folding bound: narrow stem bends sharply, wide downstream cloud curves smoothly
    const maxBend = 0.095 * (1.0 - 0.72 * Math.pow(u, 0.85));
    const diffPrev = _normalizeAngleDiff(chain[k], chain[k - 1]);
    if (Math.abs(diffPrev) > maxBend) {
      chain[k] = chain[k - 1] + (diffPrev >= 0 ? maxBend : -maxBend);
    }
  }
}

/**
 * Draws a crisp axis-aligned 16-bit pixel-stepped disc (3 overlapping axis-aligned rectangles
 * snapped to the P-pixel grid) so every curve has authentic SNES/GBA staircase pixelation.
 */
function _fill16BitPixelDisc(ctx, cx, cy, radius, P = 3) {
  const r = Math.max(P, Math.round(radius / P) * P);
  const bx = Math.round(cx / P) * P;
  const by = Math.round(cy / P) * P;

  if (r <= P) {
    ctx.fillRect(bx - P, by - P, P * 2, P * 2);
    return;
  }

  const rMid = Math.max(P, Math.round((r * 0.78) / P) * P);
  const rCore = Math.max(P, Math.round((r * 0.46) / P) * P);

  // Horizontal wide band, vertical tall band, and diagonal mid-step band
  ctx.fillRect(bx - r, by - rCore, r * 2, rCore * 2);
  ctx.fillRect(bx - rCore, by - r, rCore * 2, r * 2);
  ctx.fillRect(bx - rMid, by - rMid, rMid * 2, rMid * 2);
}

/**
 * Draws a crisp 16-bit pixel-art diamond/square ember with a dark 16-bit pixel border.
 */
function _draw16BitFireEmber(ctx, cx, cy, size, fillColor, P = 2) {
  const bx = Math.round(cx / P) * P;
  const by = Math.round(cy / P) * P;
  const s = Math.max(P, Math.round(size / P) * P);

  ctx.fillStyle = '#14080E';
  ctx.fillRect(bx - s - P, by - P, (s + P) * 2, P * 2);
  ctx.fillRect(bx - P, by - s - P, P * 2, (s + P) * 2);

  ctx.fillStyle = fillColor;
  ctx.fillRect(bx - s, by - P, s * 2, P * 2);
  ctx.fillRect(bx - P, by - s, P * 2, s * 2);
}

/**
 * Hardcoded 16-Bit Pixel-Art Charging Flame for Charizard's reared-up jaws during Windup.
 * Fixed size (never resizes while charging) with multi-pass stepped pixel discs and
 * cel-shaded SNES/GBA fire bands (#14080E -> #991B1B -> #EF4444 -> #F97316 -> #FACC15 -> #FFFBEB).
 */
function _drawCharizard16BitWindupFlame(ctx, originX, originY, flameAngle, windupProgress, tick) {
  const P = 3;
  const cosA = Math.cos(flameAngle);
  const sinA = Math.sin(flameAngle);
  const perpX = -sinA;
  const perpY = cosA;

  // Fixed-size windup flame dimensions
  const baseR = 14;
  const fixedFlameLen = 28;
  const nodes = [];

  // Central jaw core + 4 flickering skyward 16-bit flame tongues at fixed size
  const tongueCount = 5;
  for (let i = 0; i < tongueCount; i++) {
    const u = i / (tongueCount - 1);
    const dist = u * fixedFlameLen;
    const wave = Math.sin(u * 6.0 - tick * 0.55 + i) * (4 * u);
    const nx = originX + cosA * dist + perpX * wave;
    const ny = originY + sinA * dist + perpY * wave;
    const nr = baseR * (1.0 - 0.58 * Math.pow(u, 0.85));
    nodes.push({ x: nx, y: ny, r: Math.max(P, nr), u });
  }

  // Side cheek overflow flame puffs at fixed radius
  for (const side of [-1, 1]) {
    const puffWave = Math.sin(tick * 0.5 + side * 1.4);
    const px = originX + cosA * 4 + perpX * side * (11 + puffWave * 1.5);
    const py = originY + sinA * 4 + perpY * side * (11 + puffWave * 1.5);
    nodes.push({ x: px, y: py, r: Math.max(P, baseR * 0.62), u: 0.35 });
  }

  ctx.save();
  // Pass 0: Unified 16-Bit Outer Dark Ink Outline (#14080E)
  ctx.fillStyle = '#14080E';
  for (let i = 0; i < nodes.length; i++) {
    _fill16BitPixelDisc(ctx, nodes[i].x, nodes[i].y, nodes[i].r + P, P);
  }

  // Pass 1: Deep Crimson Scorch (#991B1B)
  ctx.fillStyle = '#991B1B';
  for (let i = 0; i < nodes.length; i++) {
    _fill16BitPixelDisc(ctx, nodes[i].x, nodes[i].y, nodes[i].r, P);
  }

  // Pass 2: Blazing Vermilion Red (#EF4444)
  ctx.fillStyle = '#EF4444';
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].r * 0.82 >= P) {
      _fill16BitPixelDisc(ctx, nodes[i].x, nodes[i].y, nodes[i].r * 0.82, P);
    }
  }

  // Pass 3: Roaring Flame Orange (#F97316)
  ctx.fillStyle = '#F97316';
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].u < 0.85) {
      _fill16BitPixelDisc(ctx, nodes[i].x, nodes[i].y, Math.max(P, nodes[i].r * 0.64), P);
    }
  }

  // Pass 4: Solar Amber Gold (#FACC15)
  ctx.fillStyle = '#FACC15';
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].u < 0.65) {
      _fill16BitPixelDisc(ctx, nodes[i].x, nodes[i].y, Math.max(P, nodes[i].r * 0.44), P);
    }
  }

  // Pass 5: Incandescent White-Hot Maw Core (#FFFBEB)
  ctx.fillStyle = '#FFFBEB';
  _fill16BitPixelDisc(ctx, originX, originY, Math.max(P, baseR * 0.34), P);

  // Pass 6: Orbiting 16-Bit Pixel Embers at Jaws
  for (let s = 0; s < 5; s++) {
    const sa = ((Math.PI * 2) / 5) * s + (tick * 0.28);
    const moteDist = 18 + (s % 2) * 4;
    const mx = originX + Math.cos(sa) * moteDist;
    const my = originY + Math.sin(sa) * moteDist;
    _draw16BitFireEmber(ctx, mx, my, s % 2 === 0 ? 4 : 2, s % 2 === 0 ? '#FACC15' : '#F97316', 2);
  }

  ctx.restore();
}

/**
 * Hardcoded 16-Bit Pixel-Art Flamethrower Stream along Charizard's 28-link articulated chain spine.
 * Strictly fixed length (260px) and fixed width (48px) at all times while firing — never stretches,
 * shrinks, or resizes based on target distance, walls, or frame timers.
 */
function _drawCharizard16BitFlamethrower(ctx, pokemon, originX, originY, castAngle, fixedStreamLen, fixedStreamW, tick, opts = {}) {
  const P = 3;
  const alpha = opts.alpha ?? 1.0;
  const isRecovery = Boolean(opts.isRecovery);

  // Strictly locked geometry: 28 nodes, constant step length, constant width profile
  const totalNodes = CHARIZARD_FLAME_CHAIN_LINKS;
  const constantLen = 260;
  const constantW = 48;
  const stepLen = constantLen / totalNodes;

  const chainAngles = (pokemon && Array.isArray(pokemon.flamethrowerChainAngles) && pokemon.flamethrowerChainAngles.length === CHARIZARD_FLAME_CHAIN_LINKS)
    ? pokemon.flamethrowerChainAngles
    : null;

  // 1. Reconstruct articulated spine coordinates with constant step length
  const spineX = new Float32Array(totalNodes + 1);
  const spineY = new Float32Array(totalNodes + 1);
  const spineAngle = new Float32Array(totalNodes + 1);
  spineX[0] = originX;
  spineY[0] = originY;

  for (let i = 0; i <= totalNodes; i++) {
    const idx = Math.min(CHARIZARD_FLAME_CHAIN_LINKS - 1, i);
    const a = chainAngles ? chainAngles[idx] : castAngle;
    spineAngle[i] = a;
    if (i < totalNodes) {
      spineX[i + 1] = spineX[i] + Math.cos(a) * stepLen;
      spineY[i + 1] = spineY[i] + Math.sin(a) * stepLen;
    }
  }

  // 2. Build fixed-size 16-bit billowing fire nodes + licking side flame tongues
  const halfW = constantW * 0.52;
  const billows = [];

  for (let i = 0; i <= totalNodes; i++) {
    const u = i / totalNodes;
    const a = spineAngle[i];
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const perpX = -sinA;
    const perpY = cosA;

    // Travelling thermal wave phase (animates wave motion without resizing node radius)
    const phase1 = u * 10.5 - tick * 0.62;
    const phase2 = u * 17.0 - tick * 0.88 + i * 0.65;
    const wave1 = Math.sin(phase1);
    const wave2 = Math.cos(phase2);

    // Fixed cone envelope: tight nozzle at jaws -> full fixed width body -> rounded head
    const nozzleTaper = 0.32 + 0.68 * Math.pow(Math.min(1, u / 0.65), 0.55);
    const headRound = u > 0.86 ? (1.0 - 0.32 * ((u - 0.86) / 0.14)) : 1.0;
    const rBillow = Math.max(P * 2, halfW * nozzleTaper * headRound);

    // Lateral whip undulation along the stream
    const lateralAmp = 2.0 + halfW * 0.28 * Math.pow(u, 0.72);
    const latOff = (wave1 * 0.68 + wave2 * 0.32) * lateralAmp;

    const bx = spineX[i] + perpX * latOff;
    const by = spineY[i] + perpY * latOff;

    billows.push({
      x: bx,
      y: by,
      r: rBillow,
      u,
      hasCore: !isRecovery || (i % 2 === 0)
    });

    // Fixed-size licking 16-bit side flame tongues along the flanks
    if (i > 1 && i < totalNodes && (i + Math.floor(tick * 0.5)) % 2 === 0) {
      const side = (i % 4 < 2) ? 1 : -1;
      const tongueDist = rBillow * 0.82;
      const tx = bx - cosA * (rBillow * 0.30) + perpX * side * tongueDist;
      const ty = by - sinA * (rBillow * 0.30) + perpY * side * tongueDist;
      const tr = Math.max(P, rBillow * 0.48);
      billows.push({
        x: tx,
        y: ty,
        r: tr,
        u: Math.min(1, u + 0.15),
        isTongue: true,
        hasCore: false
      });
    }
  }

  // 3. Fixed-size 16-Bit Impact Fireball Head at the tip of the stream
  const tipX = spineX[totalNodes];
  const tipY = spineY[totalNodes];
  const tipAngle = spineAngle[totalNodes];
  const impactBaseR = halfW * 0.76;
  billows.push({
    x: tipX,
    y: tipY,
    r: impactBaseR,
    u: 0.35,
    hasCore: true
  });
  for (let lobe = 0; lobe < 4; lobe++) {
    const la = tipAngle + (lobe * Math.PI * 0.5) + tick * 0.38;
    const lDist = impactBaseR * 0.58;
    billows.push({
      x: tipX + Math.cos(la) * lDist,
      y: tipY + Math.sin(la) * lDist,
      r: Math.max(P * 2, impactBaseR * 0.54),
      u: 0.50,
      hasCore: lobe % 2 === 0
    });
  }

  ctx.save();
  if (alpha < 0.999) {
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  }

  // ── PASS 0: Unified 16-Bit Outer Dark Ink Outline (#14080E) ──
  ctx.fillStyle = '#14080E';
  for (let i = 0; i < billows.length; i++) {
    const b = billows[i];
    _fill16BitPixelDisc(ctx, b.x, b.y, b.r + P, P);
  }

  // ── PASS 1: Deep Crimson-Maroon Scorch Envelope (#991B1B) ──
  ctx.fillStyle = '#991B1B';
  for (let i = 0; i < billows.length; i++) {
    const b = billows[i];
    _fill16BitPixelDisc(ctx, b.x, b.y, b.r, P);
  }

  // ── PASS 2: Blazing Vermilion-Red Mid Body (#EF4444) ──
  ctx.fillStyle = '#EF4444';
  for (let i = 0; i < billows.length; i++) {
    const b = billows[i];
    const r2 = b.r * (b.isTongue ? 0.72 : 0.84);
    if (r2 >= P) {
      _fill16BitPixelDisc(ctx, b.x, b.y, r2, P);
    }
  }

  // ── PASS 3: Roaring Arcade Flame Orange (#F97316) ──
  ctx.fillStyle = '#F97316';
  for (let i = 0; i < billows.length; i++) {
    const b = billows[i];
    const r3 = b.r * (b.isTongue ? 0.46 : 0.66);
    if (r3 >= P) {
      _fill16BitPixelDisc(ctx, b.x, b.y, r3, P);
    }
  }

  // ── PASS 4: High-Velocity Solar Amber Gold Core (#FACC15) ──
  ctx.fillStyle = '#FACC15';
  for (let i = 0; i < billows.length; i++) {
    const b = billows[i];
    if (!b.hasCore) continue;
    const r4 = b.r * (0.48 - 0.10 * b.u);
    if (r4 >= P) {
      _fill16BitPixelDisc(ctx, b.x, b.y, r4, P);
    }
  }

  // ── PASS 5: Incandescent White-Hot Nozzle Jet & Thermal Core (#FFFBEB) ──
  if (!isRecovery) {
    ctx.fillStyle = '#FFFBEB';
    for (let i = 0; i < billows.length; i++) {
      const b = billows[i];
      if (!b.hasCore) continue;
      const isNozzle = b.u <= 0.28;
      const isPulseNode = ((i + Math.floor(tick * 0.6)) % 3 === 0);
      if (isNozzle || isPulseNode) {
        const r5 = b.r * (isNozzle ? 0.34 : 0.25);
        if (r5 >= P) {
          _fill16BitPixelDisc(ctx, b.x, b.y, r5, P);
        }
      }
    }
  }

  // ── PASS 6: Detached 16-Bit Pixel Embers & Impact Sparks ──
  const emberCount = 6;
  for (let e = 0; e < emberCount; e++) {
    const ep = ((e / emberCount) + (tick * 0.038)) % 1.0;
    const nodeIdx = Math.min(totalNodes, Math.floor(ep * totalNodes));
    const a = spineAngle[nodeIdx];
    const perpX = -Math.sin(a);
    const perpY = Math.cos(a);
    const side = (e % 2 === 0) ? 1 : -1;
    const spread = (halfW * (0.55 + 0.55 * ep)) + Math.sin(tick * 0.35 + e * 2.1) * 6;
    const ex = spineX[nodeIdx] + perpX * side * spread;
    const ey = spineY[nodeIdx] + perpY * side * spread;
    const emberCol = (e % 3 === 0) ? '#FFFBEB' : (e % 2 === 0 ? '#FACC15' : '#F97316');
    _draw16BitFireEmber(ctx, ex, ey, (e % 2 === 0) ? 4 : 2, emberCol, 2);
  }

  if (!isRecovery) {
    for (let s = 0; s < 5; s++) {
      const splashA = tipAngle + Math.PI + (s - 2) * 0.52 + Math.sin(tick * 0.4 + s) * 0.2;
      const splashR = (halfW * 0.65) + ((tick * 3 + s * 9) % 16);
      const sx = tipX + Math.cos(splashA) * splashR;
      const sy = tipY + Math.sin(splashA) * splashR;
      _draw16BitFireEmber(ctx, sx, sy, s % 2 === 0 ? 4 : 2, s % 2 === 0 ? '#FACC15' : '#EF4444', 2);
    }
  }

  ctx.restore();
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
    : 0.18 * barrierAlpha;
  ctx.fillStyle = hitFlash > 0.2
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
    ctx.fillStyle = hitFlash > 0.2
      ? `rgba(250, 204, 21, ${cellAlpha.toFixed(3)})`
      : `rgba(56, 189, 248, ${cellAlpha.toFixed(3)})`;
    ctx.fill();

    const strokeAlpha = (hitFlash > 0 ? (0.60 + hitFlash * 0.4) : (0.35 + wave * 0.35)) * angleFalloff * barrierAlpha;
    ctx.strokeStyle = hitFlash > 0.2
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
  ctx.strokeStyle = hitFlash > 0 ? '#FEF08A' : '#38BDF8';
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

  // 1. Thrown Poké Ball in Flight (Launches from Trainer's Whipping Hand at releaseRatio)
  if (fighter.thrownPokeball) {
    const ball = fighter.thrownPokeball;
    const rawP = Math.max(0, Math.min(1, 1 - ball.timer / Math.max(1, ball.maxTimer)));
    const releaseRatio = ball.releaseRatio ?? 0.28;

    // Only draw the airborne projectile once the trainer's hand reaches the release apex
    if (rawP >= releaseRatio) {
      const p = Math.max(0, Math.min(1, (rawP - releaseRatio) / Math.max(0.01, 1 - releaseRatio)));
      const curX = ball.startX + (ball.targetX - ball.startX) * p;
      const curY = ball.startY + (ball.targetY - ball.startY) * p;
      const arcZ = Math.sin(p * Math.PI) * 36;
      const rot = p * Math.PI * 6;
      const ballR = 9;

      ctx.save();
      // Ground shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
      ctx.beginPath();
      ctx.ellipse(curX, curY + 6, Math.max(4, 8 - (arcZ / 36) * 2.5), 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Parabolic flight motion ribbon behind spinning Poké Ball
      if (p > 0.04 && p < 0.94) {
        const prevP = Math.max(0, p - 0.14);
        const prevX = ball.startX + (ball.targetX - ball.startX) * prevP;
        const prevY = ball.startY + (ball.targetY - ball.startY) * prevP - Math.sin(prevP * Math.PI) * 36;
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.45)';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(curX, curY - arcZ);
        ctx.stroke();
      }

      ctx.translate(curX, curY - arcZ);
      ctx.rotate(rot);

      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(0, 0, ballR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#EF4444';
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
        ctx.fillStyle = '#F97316';
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
 * Renders dedicated close-combat attack effects for Ash's Pokémon:
 * - Pikachu: Quick Attack (manga supersonic needle speed lines, afterimages)
 *            Iron Tail (metallic hardened steel crescent slash, air flip altitude, compression impact)
 * - Charizard: Dragon Claw (twin 3-taloned emerald / cyan rending claw slash crescents)
 * - Greninja: Night Slash (dark ninja shadow step afterimages & crossed dark blade cross-cleave)
 * - Lucario: Close Combat (4-hit flurry barrage fist trails, kick arc & finisher Aura Palm shockwave)
 */
function _drawPokemonMeleeAttackEffects(ctx, pokemon, r, groundY, scale) {
  if (!pokemon.meleeMoveState || !pokemon.meleeMoveKey) return;
  const key = pokemon.meleeMoveKey;
  const tick = pokemon.meleeMoveTick || 0;
  const z = Math.max(0, pokemon.z || 0);

  // Target position calculation:
  // Spawns attack effects directly onto the target enemy in relative coordinate space
  const tgt = (pokemon.meleeTarget && pokemon.meleeTarget.hp > 0)
    ? pokemon.meleeTarget
    : (pokemon.meleeTarget || (typeof state !== 'undefined' && Array.isArray(state.fighters)
      ? state.fighters.find(f => f && f !== pokemon && f !== pokemon.owner && f.hp > 0 && f.teamId !== pokemon.teamId)
      : null));

  let enemyRelX = null;
  let enemyRelY = null;
  if (tgt && typeof tgt.x === 'number' && typeof tgt.y === 'number') {
    enemyRelX = tgt.x - pokemon.x;
    enemyRelY = tgt.y - (pokemon.y - z);
  } else if (pokemon.meleeTargetLastPos) {
    enemyRelX = pokemon.meleeTargetLastPos.x - pokemon.x;
    enemyRelY = pokemon.meleeTargetLastPos.y - (pokemon.y - z);
  }

  const hasEnemy = (enemyRelX !== null && enemyRelY !== null);
  const castAngle = hasEnemy
    ? Math.atan2(enemyRelY, enemyRelX)
    : (pokemon.meleeCastAngle !== undefined ? pokemon.meleeCastAngle : (pokemon.gunAngle || 0));
  const cosA = Math.cos(castAngle);
  const sinA = Math.sin(castAngle);

  // 1. Pikachu: Quick Attack & Iron Tail
  if (key === 'quickAttack') {
    // ── Stage 1: The Initial Bounding Hop (ticks 5–12) ──
    if (tick >= 5 && tick <= 12) {
      ctx.save();
      const hopP = (tick - 5) / 7;
      // Floor takeoff dust puff behind Pikachu
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.45 * (1 - hopP)).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(-cosA * 14, groundY + 4, 12 * hopP, 4.5 * hopP, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hop speed motes & subtle bounding lines
      ctx.strokeStyle = `rgba(254, 240, 138, ${(0.6 * (1 - hopP)).toFixed(3)})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-cosA * 18, groundY - 6);
      ctx.lineTo(-cosA * 6, groundY - 14);
      ctx.stroke();
      ctx.restore();
    }

    // ── Stage 2: The Explosive Leapforth & Supersonic Strike (ticks 13–28) ──
    if (tick >= 13 && tick <= 28) {
      ctx.save();
      const lineAlpha = (tick <= 22) ? 0.90 : Math.max(0, (28 - tick) / 6);
      ctx.globalAlpha = lineAlpha;

      // Rule 16: Manga speed lines as 4-point filled needle polygons trailing along leap trajectory
      const lineOffsets = [-20, -10, 0, 10, 20];
      for (let i = 0; i < lineOffsets.length; i++) {
        const perpOff = lineOffsets[i];
        const lineLen = 34 + (i % 3) * 14;
        const startX = -cosA * 14 + (-sinA) * perpOff;
        const startY = groundY - 16 - sinA * 14 + cosA * perpOff;
        const endX = startX - cosA * lineLen;
        const endY = startY - sinA * lineLen;
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const halfThick = (i === 2 ? 2.5 : 1.6);

        ctx.fillStyle = (i === 2) ? '#FFFFFF' : '#FEF08A';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(midX + (-sinA) * halfThick, midY + cosA * halfThick);
        ctx.lineTo(endX, endY);
        ctx.lineTo(midX - (-sinA) * halfThick, midY - cosA * halfThick);
        ctx.closePath();
        ctx.fill();
      }

      // Supersonic contact Mach compression rings popping forward during the leap
      // When nearing strike frames (tick >= 18), spawn directly on the enemy target
      if (tick >= 14 && tick <= 22) {
        const ringP = (tick - 14) / 8;
        const ringR = (r * 0.95) + ringP * 24;
        ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - ringP).toFixed(3)})`;
        ctx.lineWidth = 2.6 * (1 - ringP * 0.5);
        ctx.beginPath();
        const ringCenterX = (hasEnemy && tick >= 18) ? enemyRelX : cosA * (r * 0.9);
        const ringCenterY = (hasEnemy && tick >= 18) ? enemyRelY : (groundY - 16 + sinA * (r * 0.9));
        ctx.ellipse(ringCenterX, ringCenterY, ringR * 0.5, ringR, castAngle + Math.PI / 2, 0, Math.PI * 2);
        ctx.stroke();

        // High-voltage supersonic impact spark at enemy body center on strike frame
        if (hasEnemy && tick >= 18 && tick <= 22) {
          _drawPixelElectricSpark(ctx, enemyRelX, enemyRelY, 5.0);
        }
      }
      ctx.restore();
    }

    // ── Stage 3: Ground Impact Lock & Touchdown (ticks 25–32) ──
    if (tick >= 25 && tick <= 32) {
      ctx.save();
      const landP = (tick - 25) / 7;
      const ringAlpha = Math.max(0, 1.0 - landP);
      ctx.globalAlpha = ringAlpha;

      // Concentric ground compression ring on floor plane underneath target (Rule 26)
      const ringR = (r * 1.1) + landP * 18;
      const impactCenterX = hasEnemy ? enemyRelX : 0;
      const impactCenterY = hasEnemy ? (enemyRelY + (tgt?.r || 25) * 0.45) : groundY;

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.2 * (1 - landP * 0.5);
      ctx.beginPath();
      ctx.ellipse(impactCenterX, impactCenterY, ringR, ringR * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(impactCenterX, impactCenterY, ringR * 0.75, ringR * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  } else if (key === 'ironTail') {
    // Air Flip Leap & Hardened Metallic Steel Tail
    ctx.save();
    // Ticks 1–17: Tail charge sparks orbiting tail
    if (tick <= 17) {
      const chargeP = tick / 17;
      const tailAnchorX = -cosA * (r * 0.8);
      const tailAnchorY = groundY - 16 - sinA * (r * 0.8);
      for (let s = 0; s < 3; s++) {
        const sa = chargeP * Math.PI * 4 + s * (Math.PI * 2 / 3);
        const sx = tailAnchorX + Math.cos(sa) * (14 * (1 - chargeP * 0.5));
        const sy = tailAnchorY + Math.sin(sa) * (14 * (1 - chargeP * 0.5));
        _drawPixelElectricSpark(ctx, sx, sy, 3);
      }
    }
    // Ticks 18–36: Heavy Metallic Crescent Slash Arc & Impact Lock (Rule 15 & Rule 30)
    // Slices directly through the center of the enemy target body
    if (tick >= 18 && tick <= 36) {
      const slashProgress = Math.min(1.0, (tick - 18) / 8);
      const lockHold = tick >= 26;
      const alpha = lockHold ? Math.max(0, 1.0 - (tick - 26) / 10) : 1.0;
      ctx.globalAlpha = alpha;

      const slashCenterX = hasEnemy ? enemyRelX : (cosA * (r + 35));
      const slashCenterY = hasEnemy ? enemyRelY : (groundY - 14 + sinA * (r + 35));

      // Diagonal slash angle across the enemy body
      const slashTilt = 0.45;
      const slashAngle = castAngle + slashTilt;

      // Arc radius calibrated so apex passes right through (0, 0)
      const arcR = 38;
      const spanA = 0.95;

      let curStartA = -spanA;
      let curEndA = -spanA + slashProgress * (spanA * 2);

      // Eraser wipe during recovery settle (Rule 15)
      if (lockHold) {
        const recP = (tick - 26) / 10;
        curStartA = -spanA + Math.pow(recP, 1.4) * (spanA * 2);
        curEndA = spanA;
      }

      ctx.save();
      ctx.translate(slashCenterX, slashCenterY);
      ctx.rotate(slashAngle);

      // Center of curvature is at (-arcR, 0) so at angle 0, x = -arcR + arcR = 0, y = 0
      // Passing directly through the center of the enemy body!
      const centerOffsetX = -arcR;

      // Outer ink stroke
      ctx.strokeStyle = '#0E0F14';
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.arc(centerOffsetX, 0, arcR, curStartA, curEndA);
      ctx.stroke();

      // Steel silver body
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 4.8;
      ctx.beginPath();
      ctx.arc(centerOffsetX, 0, arcR, curStartA, curEndA);
      ctx.stroke();

      // Pure white razor core
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(centerOffsetX, 0, arcR, curStartA, curEndA);
      ctx.stroke();

      // Electric spark star at cutting tip
      const tipX = centerOffsetX + Math.cos(curEndA) * arcR;
      const tipY = Math.sin(curEndA) * arcR;
      _drawPixelElectricSpark(ctx, tipX, tipY, 4.5);

      // Electrical detonation starburst directly at enemy center on impact (ticks 20-28)
      if (tick >= 20 && tick <= 28) {
        _drawPixelElectricSpark(ctx, 0, 0, 6.0);
      }

      ctx.restore();
    }
    ctx.restore();
  }
  // 2. Charizard: Dragon Claw (Twin 3-Taloned Rending Slashes Crossing Directly at Enemy Center)
  else if (key === 'dragonClaw') {
    ctx.save();
    const clawColor = '#10B981';
    const clawCore = '#ECFDF5';

    // Strike & Lock Window (ticks 17–40)
    if (tick >= 17 && tick <= 40) {
      const hit1Progress = Math.min(1.0, (tick - 17) / 8);
      const hit2Progress = tick >= 23 ? Math.min(1.0, (tick - 23) / 8) : 0;
      const alpha = tick <= 30 ? 1.0 : Math.max(0, 1.0 - (tick - 30) / 10);
      ctx.globalAlpha = alpha;

      const cx = hasEnemy ? enemyRelX : (cosA * (r + 40));
      const cy = hasEnemy ? enemyRelY : (groundY - 18 + sinA * (r + 40));

      const clawSpacing = 6.5;
      const arcR = 38;
      const spanA = 0.58;

      ctx.save();
      ctx.translate(cx, cy);

      // Claw 1: Right Claw (sweeps diagonal downward-left, slicing directly through enemy center)
      if (hit1Progress > 0) {
        ctx.save();
        ctx.rotate(castAngle - 0.65);

        let curStartA = -spanA;
        let curEndA = -spanA + hit1Progress * (spanA * 2);
        if (tick >= 25) {
          const recP = (tick - 25) / 15;
          curStartA = -spanA + Math.pow(recP, 1.4) * (spanA * 2);
          curEndA = spanA;
        }

        for (let talon = -1; talon <= 1; talon++) {
          const talonOffY = talon * clawSpacing;
          const centerOffsetX = -arcR;

          ctx.strokeStyle = '#0E0F14';
          ctx.lineWidth = 5.2;
          ctx.beginPath();
          ctx.arc(centerOffsetX, talonOffY, arcR, curStartA, curEndA);
          ctx.stroke();

          ctx.strokeStyle = clawColor;
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.arc(centerOffsetX, talonOffY, arcR, curStartA, curEndA);
          ctx.stroke();

          ctx.strokeStyle = clawCore;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(centerOffsetX, talonOffY, arcR, curStartA, curEndA);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Claw 2: Left Claw (sweeps opposite diagonal downward-right, crossing in an emerald "X" directly at (0, 0))
      if (hit2Progress > 0) {
        ctx.save();
        ctx.rotate(castAngle + 0.65);

        let curStartA = -spanA;
        let curEndA = -spanA + hit2Progress * (spanA * 2);
        if (tick >= 31) {
          const recP = (tick - 31) / 9;
          curStartA = -spanA + Math.pow(recP, 1.4) * (spanA * 2);
          curEndA = spanA;
        }

        for (let talon = -1; talon <= 1; talon++) {
          const talonOffY = talon * clawSpacing;
          const centerOffsetX = -arcR;

          ctx.strokeStyle = '#0E0F14';
          ctx.lineWidth = 5.2;
          ctx.beginPath();
          ctx.arc(centerOffsetX, talonOffY, arcR, curStartA, curEndA);
          ctx.stroke();

          ctx.strokeStyle = clawColor;
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.arc(centerOffsetX, talonOffY, arcR, curStartA, curEndA);
          ctx.stroke();

          ctx.strokeStyle = clawCore;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(centerOffsetX, talonOffY, arcR, curStartA, curEndA);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Emerald dragon rend flare at intersection center (0, 0)
      if (hit2Progress > 0.4 && tick <= 34) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.40)';
        ctx.beginPath();
        ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, 4.0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.restore();
  }
  // 3. Greninja: Night Slash (Violet Ninja Shadow Step & Crossed Dark Blades Directly on Enemy)
  else if (key === 'nightSlash') {
    ctx.save();
    // Shadow afterimages during dash (ticks 1–10)
    if (tick <= 10) {
      ctx.fillStyle = 'rgba(76, 29, 149, 0.40)';
      ctx.beginPath();
      ctx.ellipse(-cosA * 18, groundY - 14 - sinA * 18, r * 0.7, r * 0.9, castAngle, 0, Math.PI * 2);
      ctx.fill();
    }
    // Dual Crossed Dark-Blade Cleave (ticks 12–32)
    if (tick >= 12 && tick <= 32) {
      const strikeP = Math.min(1.0, (tick - 12) / 8);
      const alpha = tick <= 22 ? 1.0 : Math.max(0, 1.0 - (tick - 22) / 10);
      ctx.globalAlpha = alpha;

      const cx = hasEnemy ? enemyRelX : (cosA * (r + 35));
      const cy = hasEnemy ? enemyRelY : (groundY - 14 + sinA * (r + 35));

      ctx.save();
      ctx.translate(cx, cy);

      const arcR = 36;
      const spanA = 0.65;
      let curStartA = -spanA;
      let curEndA = -spanA + strikeP * (spanA * 2);

      // Eraser wipe during recovery (Rule 15)
      if (tick >= 20) {
        const recP = (tick - 20) / 12;
        curStartA = -spanA + Math.pow(recP, 1.4) * (spanA * 2);
        curEndA = spanA;
      }

      // Blade 1 & 2 (Crossing in a dark violet "X" directly through (0, 0))
      for (const dir of [1, -1]) {
        ctx.save();
        ctx.rotate(castAngle + dir * 0.55);

        const centerOffsetX = -arcR;

        ctx.strokeStyle = '#0E0F14';
        ctx.lineWidth = 6.4;
        ctx.beginPath();
        ctx.arc(centerOffsetX, 0, arcR, curStartA, curEndA);
        ctx.stroke();

        ctx.strokeStyle = '#8B5CF6';
        ctx.lineWidth = 4.0;
        ctx.beginPath();
        ctx.arc(centerOffsetX, 0, arcR, curStartA, curEndA);
        ctx.stroke();

        ctx.strokeStyle = '#EDE9FE';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(centerOffsetX, 0, arcR, curStartA, curEndA);
        ctx.stroke();

        // Tip spark
        const tipX = centerOffsetX + Math.cos(curEndA) * arcR;
        const tipY = Math.sin(curEndA) * arcR;
        ctx.fillStyle = '#EDE9FE';
        ctx.fillRect(Math.round(tipX - 1.5), Math.round(tipY - 1.5), 3, 3);

        ctx.restore();
      }

      // Dark ninja cross energy burst at enemy center (0, 0)
      if (strikeP > 0.4 && tick <= 26) {
        ctx.fillStyle = 'rgba(139, 92, 246, 0.40)';
        ctx.beginPath();
        ctx.arc(0, 0, 9.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, 4.0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.restore();
  }
  // 4. Lucario: Close Combat (4-Hit Flurry Barrage & Aura Palm Finisher Directly on Enemy)
  else if (key === 'closeCombat') {
    ctx.save();
    const auraCol = '#22D3EE';
    const auraWash = 'rgba(34, 211, 238, 0.22)';

    const enemyCenterX = hasEnemy ? enemyRelX : (cosA * (r + 35));
    const enemyCenterY = hasEnemy ? enemyRelY : (groundY - 16 + sinA * (r + 35));

    // Flurry Punches / Kick (ticks 7–29)
    if (tick >= 7 && tick <= 29) {
      ctx.save();
      ctx.translate(enemyCenterX, enemyCenterY);
      ctx.rotate(castAngle);

      // Alternating 4-hit flurry barrage: Left jab, Right cross, Roundhouse, Double thrust
      const flurryStep = Math.floor((tick - 7) / 6); // 0, 1, 2, 3
      const lateralDir = (flurryStep % 2 === 0) ? -1 : 1;
      const stepTick = (tick - 7) % 6;
      const punchProgress = stepTick / 5; // 0 to 1

      // Punch drives directly into enemy center (-6px front -> +2px core)
      const punchDepth = -6 + punchProgress * 8;
      const punchLateral = lateralDir * (7 + (flurryStep === 2 ? 3 : 0));

      // Trailing aura fist disc
      ctx.fillStyle = auraCol;
      ctx.beginPath();
      ctx.arc(punchDepth, punchLateral, 8.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(punchDepth, punchLateral, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Supersonic impact ring popping at contact point on enemy body
      const ringR = 6 + punchProgress * 12;
      ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - punchProgress).toFixed(3)})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(punchDepth, punchLateral, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // Impact spark motes
      if (stepTick >= 2) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(Math.round(punchDepth - 1), Math.round(punchLateral - 1), 3, 3);
      }

      ctx.restore();
    }
    // Finisher Aura Palm Blast (ticks 30–44) -> Concentric Water-Ripple Shockwave Directly Centered on Enemy (Rule 26)
    if (tick >= 30 && tick <= 44) {
      const palmP = (tick - 30) / 14;
      const alpha = Math.max(0, 1.0 - palmP);
      ctx.globalAlpha = alpha;

      const blastX = hasEnemy ? enemyRelX : (cosA * (r + 40));
      const blastY = hasEnemy ? enemyRelY : (groundY - 16 + sinA * (r + 40));

      ctx.save();
      ctx.translate(blastX, blastY);

      // Concentric rings expanding outward directly from enemy center (0, 0) (Rule 26)
      const maxR = r * 2.2;
      for (let k = 0; k < 2; k++) {
        const offset = k * 0.2;
        if (palmP > offset) {
          const lp = (palmP - offset) / (1 - offset);
          const curR = maxR * Math.pow(lp, 0.7);

          if (k === 0) {
            ctx.fillStyle = auraWash;
            ctx.beginPath();
            ctx.arc(0, 0, curR, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.strokeStyle = k === 0 ? '#FFFFFF' : auraCol;
          ctx.lineWidth = (k === 0 ? 3.0 : 2.0) * (1 - lp * 0.5);
          ctx.beginPath();
          ctx.arc(0, 0, curR, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Discrete aura spark motes radiating from center (Rule 26: zero radial spokes!)
      for (let s = 0; s < 6; s++) {
        const sa = (s / 6) * Math.PI * 2 + palmP * 2.0;
        const sDist = maxR * 0.6 * palmP + (s % 2) * 6;
        const sx = Math.cos(sa) * sDist;
        const sy = Math.sin(sa) * sDist;
        ctx.fillStyle = (s % 2 === 0) ? '#FFFFFF' : auraCol;
        ctx.fillRect(Math.round(sx - 1.5), Math.round(sy - 1.5), 3, 3);
      }

      ctx.restore();
    }
    ctx.restore();
  }
}

/**
 * Renders the Rule 26 staggered concentric water-ripple summon shockwave rings under the Pokémon's feet.
 */
function _drawPokemonSummonIntroGroundRings(ctx, pokemon, r, shadowY, introP) {
  const themeColor = pokemon.themeColor || '#FACC15';
  const ringColors = ['#EF4444', themeColor, '#FFFFFF'];
  const maxRx = r * 2.55;
  const maxRy = r * 1.05;

  ctx.save();
  for (let k = 0; k < 3; k++) {
    const tOffset = k * 0.14;
    const rawLp = (introP - tOffset) / Math.max(0.01, 1.0 - tOffset);
    if (rawLp <= 0 || rawLp >= 1) continue;

    const lp = Math.max(0, Math.min(1, rawLp));
    const popIn = Math.min(1.0, lp / 0.10);
    const fadeOut = Math.pow(1.0 - lp, 1.25);
    const waveAlpha = popIn * fadeOut;
    const easeR = Math.pow(lp, 0.58);
    const curRx = Math.max(1, maxRx * easeR);
    const curRy = Math.max(1, maxRy * easeR);

    // Expanding translucent interior wash on leading ring
    if (k === 0) {
      ctx.globalAlpha = 0.22 * waveAlpha;
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.ellipse(0, shadowY, curRx, curRy, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.90 * waveAlpha;
    ctx.strokeStyle = ringColors[k % ringColors.length];
    ctx.lineWidth = Math.max(1.2, (3.2 - k * 0.6) * (1.0 - lp * 0.35));
    ctx.beginPath();
    ctx.ellipse(0, shadowY, curRx, curRy, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Renders the popping-open Poké Ball halves, 16-bit materialization beam, and species elemental sparkles during summon intro.
 */
function _drawPokemonSummonIntroOverlayEffects(ctx, pokemon, r, groundY, drawW, drawH, ay, scale, introP) {
  const themeColor = pokemon.themeColor || '#FACC15';
  const centerY = groundY - (ay * scale * 0.52);

  ctx.save();

  // 1. 16-bit vertical materialization energy pillar & crimson/white flash silhouette (first 55% of intro)
  if (introP < 0.55) {
    const beamP = introP / 0.55;
    const beamAlpha = Math.sin(beamP * Math.PI) * (1.0 - beamP * 0.35);
    const beamW = Math.max(4, r * 1.45 * (1.0 - beamP * 0.55));
    const beamTopY = groundY - r * 3.1;

    // Outer crimson release pillar
    ctx.globalAlpha = 0.42 * beamAlpha;
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(-beamW * 0.5, beamTopY, beamW, groundY - beamTopY);

    // Mid species theme pillar
    ctx.globalAlpha = 0.55 * beamAlpha;
    ctx.fillStyle = themeColor;
    ctx.fillRect(-beamW * 0.32, beamTopY, beamW * 0.64, groundY - beamTopY);

    // Inner white core pillar
    ctx.globalAlpha = 0.85 * beamAlpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-beamW * 0.16, beamTopY, beamW * 0.32, groundY - beamTopY);

    // Glowing materialization aura envelope around the emerging Pokémon
    ctx.globalAlpha = 0.50 * (1.0 - beamP);
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.ellipse(0, centerY, drawW * 0.36, drawH * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.65 * Math.pow(1.0 - beamP, 1.4);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, centerY, drawW * 0.24, drawH * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Popping-open Poké Ball halves separating above the Pokémon
    const ballBaseY = groundY - r * 1.65 - beamP * 14;
    const splitDist = 3 + beamP * 13;
    const ballR = 8.5;
    const ballAlpha = Math.max(0, 1.0 - Math.pow(beamP, 1.35));

    ctx.globalAlpha = ballAlpha;
    // Top Red Cap (tilted backward as it pops open)
    ctx.save();
    ctx.translate(0, ballBaseY - splitDist);
    ctx.rotate(-0.35 * beamP);
    ctx.fillStyle = '#EF4444';
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, ballR, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Bottom White Cap (tilted downward)
    ctx.save();
    ctx.translate(0, ballBaseY + splitDist * 0.65);
    ctx.rotate(0.28 * beamP);
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, ballR, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Center clasp button
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 2. 16-bit Pixel Diamond Starburst Sparkles & Species Elemental Motes
  const sparkCount = 6;
  const sparkFade = Math.pow(1.0 - introP, 0.85);
  for (let i = 0; i < sparkCount; i++) {
    const angle = (i / sparkCount) * Math.PI * 2 + introP * 1.2;
    const radialDist = (r * 0.35) + Math.pow(introP, 0.65) * (r * 1.55) + (i % 2) * 5;
    const sx = Math.cos(angle) * radialDist;
    const sy = centerY + Math.sin(angle) * (radialDist * 0.68) - introP * 10;
    const sparkSize = Math.max(2.0, (5.5 - (i % 2) * 1.5) * sparkFade);

    ctx.globalAlpha = Math.min(1.0, sparkFade * 1.1);
    // 4-point pixel diamond sparkle
    ctx.fillStyle = (i % 2 === 0) ? '#FFFFFF' : themeColor;
    ctx.beginPath();
    ctx.moveTo(sx, sy - sparkSize);
    ctx.lineTo(sx + sparkSize * 0.45, sy - sparkSize * 0.45);
    ctx.lineTo(sx + sparkSize, sy);
    ctx.lineTo(sx + sparkSize * 0.45, sy + sparkSize * 0.45);
    ctx.lineTo(sx, sy + sparkSize);
    ctx.lineTo(sx - sparkSize * 0.45, sy + sparkSize * 0.45);
    ctx.lineTo(sx - sparkSize, sy);
    ctx.lineTo(sx - sparkSize * 0.45, sy - sparkSize * 0.45);
    ctx.closePath();
    ctx.fill();

    // 16-bit pixel ember/mote accent
    const mx = Math.cos(angle + 0.5) * (radialDist * 0.78);
    const my = groundY - ((introP * 36 + i * 7) % 34);
    const moteColor = pokemon.speciesId === 'charizard'
      ? (i % 2 === 0 ? '#FF9E00' : '#E63946')
      : (pokemon.speciesId === 'greninja' || pokemon.speciesId === 'lucario' ? '#38BDF8' : '#FACC15');
    ctx.fillStyle = '#0E0F14';
    ctx.fillRect(Math.round(mx) - 2, Math.round(my) - 2, 4, 4);
    ctx.fillStyle = moteColor;
    ctx.fillRect(Math.round(mx) - 1, Math.round(my) - 1, 2, 2);
  }

  ctx.restore();
}

/**
 * Renders the active Pokémon companion with 8-directional PMD sprite sheets & overhead minion HP bar.
 */
export function drawPokemonCompanion(ctx, pokemon) {
  const isFainting = Boolean(pokemon && pokemon.hp <= 0 && (pokemon.isFainting || pokemon.animState === 'faint'));
  if (!pokemon || (pokemon.hp <= 0 && !isFainting)) return;

  const r = pokemon.r || 22;
  const speciesKey = pokemon.speciesId || 'pikachu';
  const specGroup = POKEMON_CLIP_SPECS[speciesKey] || POKEMON_CLIP_SPECS.pikachu;
  const stateKey = isFainting ? 'faint' : (pokemon.animState || 'idle');
  const clipSpec = specGroup[stateKey] || specGroup.idle;
  const sheetImg = _getPokemonSheet(clipSpec.src);

  // Ground plane contact baseline: feet anchor squarely on the ground plane at groundY
  const groundY = r * 0.45;
  const z = Math.max(0, pokemon.z || 0);

  const isSummonIntro = Boolean(!isFainting && pokemon.isSummonIntro && (pokemon.summonIntroTimer || 0) > 0);
  const summonIntroMax = Math.max(1, pokemon.summonIntroMaxTimer || 28);
  const summonIntroP = isSummonIntro
    ? Math.max(0, Math.min(1, 1.0 - ((pokemon.summonIntroTimer || 0) / summonIntroMax)))
    : 1.0;

  const faintTick = pokemon.faintTick || 0;
  const maxFaintTicks = pokemon.maxFaintTicks || 48;

  // Smooth opacity dissolution during Poké Ball recall beam
  let spriteAlpha = 1.0;
  let recallProgress = 0;
  if (isFainting && faintTick >= 26) {
    recallProgress = Math.min(1.0, (faintTick - 26) / Math.max(1, maxFaintTicks - 26));
    spriteAlpha = Math.max(0.0, Math.pow(1.0 - recallProgress, 1.35));
  }

  ctx.save();
  ctx.translate(pokemon.x, pokemon.y - z);

  // 1. Ground shadow ellipse & elemental aura ring directly underneath feet on floor plane
  const heightFactor = Math.max(0.35, 1.0 - (z / 180));
  const shadowY = groundY + z; // Stays on floor plane when airborne
  const shadowRx = r * 0.95 * heightFactor;
  const shadowRy = r * 0.36 * heightFactor;

  ctx.fillStyle = `rgba(15, 23, 42, ${(0.38 * heightFactor * spriteAlpha).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(0, shadowY, shadowRx, shadowRy, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isSummonIntro) {
    _drawPokemonSummonIntroGroundRings(ctx, pokemon, r, shadowY, summonIntroP);
  }

  // 2. Render 8-Directional PMD Sprite Sheet Frame (anchored 1:1 at ground feet position)
  if (sheetImg && sheetImg.complete && sheetImg.naturalWidth > 0) {
    const facingAngle = isFainting
      ? (pokemon.faintAngle !== undefined ? pokemon.faintAngle : (pokemon.gunAngle || pokemon.angle || 0))
      : (pokemon.gunAngle || pokemon.angle || 0);
    const dirRow = Math.min(clipSpec.dirs - 1, _angleToPmdDirectionRow(facingAngle));

    let frameCol = 0;
    if (isFainting) {
      if (clipSpec.durations && Array.isArray(clipSpec.durations)) {
        let acc = 0;
        frameCol = clipSpec.frames - 1;
        for (let i = 0; i < clipSpec.durations.length; i++) {
          acc += clipSpec.durations[i];
          if (faintTick < acc) {
            frameCol = i;
            break;
          }
        }
      } else if (clipSpec.frames === 4) {
        if (faintTick < 8) frameCol = 0;
        else if (faintTick < 20) frameCol = 1;
        else if (faintTick < 24) frameCol = 2;
        else frameCol = 3;
      } else if (clipSpec.frames === 2) {
        frameCol = faintTick < 8 ? 0 : 1;
      } else {
        frameCol = Math.min(clipSpec.frames - 1, Math.floor(faintTick / (clipSpec.ticksPerFrame || 6)));
      }
    } else if (stateKey === 'hurt') {
      const hTick = pokemon.hurtTick || 0;
      if (clipSpec.frames === 2) {
        frameCol = hTick < 3 ? 0 : 1;
      } else {
        frameCol = Math.min(clipSpec.frames - 1, Math.floor(hTick / (clipSpec.ticksPerFrame || 6)));
      }
    } else if (stateKey === 'special' && pokemon.speciesId === 'charizard' && isSummonIntro && !pokemon.flamethrowerState) {
      frameCol = summonIntroP < 0.45 ? 0 : 1;
    } else if (stateKey === 'special' && pokemon.speciesId === 'charizard' && pokemon.flamethrowerState) {
      if (pokemon.flamethrowerState === 'windup') {
        const p = 1.0 - Math.max(0, pokemon.flamethrowerTimer / Math.max(1, pokemon.flamethrowerMaxWindup || 28));
        frameCol = p < 0.5 ? 0 : 1;
      } else if (pokemon.flamethrowerState === 'active') {
        const activeTick = (pokemon.flamethrowerMaxActive || 120) - pokemon.flamethrowerTimer;
        if (activeTick < 6) {
          frameCol = 2 + Math.floor((activeTick / 6) * 2);
        } else {
          frameCol = 4 + (Math.floor(activeTick / 4) % 6);
        }
      } else if (pokemon.flamethrowerState === 'recovery') {
        frameCol = 10;
      }
    } else if (stateKey === 'attack' && pokemon.meleeMoveState && (pokemon.meleeMoveMaxTicks || 0) > 0) {
      if (pokemon.speciesId === 'pikachu' && pokemon.meleeMoveKey === 'quickAttack') {
        const tick = pokemon.meleeMoveTick || 0;
        if (tick <= 4) {
          frameCol = 0; // Low compression crouch
        } else if (tick <= 12) {
          // Stage 1: The Hop (frames 1 -> 3)
          const hopP = (tick - 4) / 8;
          frameCol = 1 + Math.min(2, Math.floor(hopP * 3));
        } else if (tick <= 24) {
          // Stage 2: The Leapforth (frames 4 -> 7, soaring forward leap)
          const leapP = (tick - 12) / 12;
          frameCol = 4 + Math.min(3, Math.floor(leapP * 4));
        } else {
          // Stage 3 & 4: Touchdown impact lock & recovery (frames 8 -> 9)
          frameCol = Math.min(clipSpec.frames - 1, 8 + (tick > 30 ? 1 : 0));
        }
      } else if (pokemon.speciesId === 'charizard' && pokemon.meleeMoveKey === 'dragonClaw') {
        const tick = pokemon.meleeMoveTick || 0;
        // 5-Phase Melee Kinematics (Rule 30) for Charizard's Dragon Claw (52 ticks, 14 frames)
        if (tick <= 13) {
          // Phase 1 (Coil & Lunge): Grounded windup crouch & rearing back (frames 0 -> 3)
          const p = tick / 13;
          frameCol = Math.min(3, Math.floor(p * 4));
        } else if (tick <= 16) {
          // Phase 2 (Poised Hold): Coiled anticipation hold at apex (frame 4)
          frameCol = 4;
        } else if (tick <= 19) {
          // Phase 3a (Hit 1: Right Claw Rend): Explosive strike acceleration (frames 5 -> 7)
          const p = (tick - 16) / 3;
          frameCol = 5 + Math.min(2, Math.floor(p * 3));
        } else if (tick <= 28) {
          // Phase 3b (Hit 2: Left Claw Cross-Rend & follow-through): (frames 8 -> 11)
          const p = (tick - 19) / 9;
          frameCol = 8 + Math.min(3, Math.floor(p * 4));
        } else if (tick <= 40) {
          // Phase 4 (Impact Lock): Locked at impact apex (frame 12)
          frameCol = 12;
        } else {
          // Phase 5 (Recovery Settle): Returning smoothly to ground stance (frame 13)
          frameCol = 13;
        }
      } else {
        const progress = Math.min(1.0, (pokemon.meleeMoveTick || 0) / pokemon.meleeMoveMaxTicks);
        frameCol = Math.min(clipSpec.frames - 1, Math.floor(progress * clipSpec.frames));
      }
    } else if (clipSpec.durations && Array.isArray(clipSpec.durations)) {
      let total = 0;
      for (let i = 0; i < clipSpec.durations.length; i++) total += clipSpec.durations[i];
      const cycleTick = (pokemon.animTick || 0) % Math.max(1, total);
      let acc = 0;
      frameCol = clipSpec.frames - 1;
      for (let i = 0; i < clipSpec.durations.length; i++) {
        acc += clipSpec.durations[i];
        if (cycleTick < acc) {
          frameCol = i;
          break;
        }
      }
    } else {
      frameCol = Math.floor((pokemon.animTick || 0) / (clipSpec.ticksPerFrame || 6)) % clipSpec.frames;
    }

    const sx = frameCol * clipSpec.fw;
    const sy = dirRow * clipSpec.fh;
    const scale = pokemon.spriteScale || 1.5;
    const drawW = clipSpec.fw * scale;
    const drawH = clipSpec.fh * scale;

    let ax = clipSpec.ax !== undefined ? clipSpec.ax : (clipSpec.fw / 2);
    let ay = clipSpec.ay !== undefined ? clipSpec.ay : (clipSpec.fh * 0.6);

    // Look up exact per-frame ground anchor (Rule 29 Anti-Wobble / Ground-Anchor Standard)
    // Guarantees feet remain 100% stationary on ground plane across all 8 directions
    const clipAnchors = POKEMON_FRAME_ANCHORS[speciesKey]?.[stateKey];
    if (clipAnchors) {
      const anchorBase = (dirRow * clipSpec.frames + frameCol) * 2;
      if (anchorBase + 1 < clipAnchors.length) {
        ax = clipAnchors[anchorBase];
        ay = clipAnchors[anchorBase + 1];
      }
    }

    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = spriteAlpha;
    if (isSummonIntro) {
      let popScaleX = 1.0;
      let popScaleY = 1.0;
      if (summonIntroP < 0.35) {
        const p = summonIntroP / 0.35;
        const s = 0.25 + 0.90 * Math.pow(p, 0.65);
        popScaleX = s * 0.94;
        popScaleY = s * 1.06;
      } else if (summonIntroP < 0.65) {
        const p = (summonIntroP - 0.35) / 0.30;
        popScaleX = 1.08 - 0.10 * p;
        popScaleY = 1.15 - 0.19 * p;
      } else {
        const p = (summonIntroP - 0.65) / 0.35;
        popScaleX = 0.98 + 0.02 * p;
        popScaleY = 0.96 + 0.04 * p;
      }
      ctx.save();
      ctx.translate(0, groundY);
      ctx.scale(popScaleX, popScaleY);
      ctx.drawImage(
        sheetImg,
        sx,
        sy,
        clipSpec.fw,
        clipSpec.fh,
        -ax * scale,
        -ay * scale,
        drawW,
        drawH
      );
      // 1:1 Pixel-Perfect Model-Accurate Sprite White Hit-Flash Silhouette
      renderPokemonHitFlash(ctx, pokemon, sheetImg, sx, sy, clipSpec.fw, clipSpec.fh, -ax * scale, -ay * scale, drawW, drawH);
      ctx.restore();
    } else {
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
      // 1:1 Pixel-Perfect Model-Accurate Sprite White Hit-Flash Silhouette
      renderPokemonHitFlash(ctx, pokemon, sheetImg, sx, sy, clipSpec.fw, clipSpec.fh, -ax * scale, groundY - (ay * scale), drawW, drawH);
    }

    if (isSummonIntro) {
      _drawPokemonSummonIntroOverlayEffects(ctx, pokemon, r, groundY, drawW, drawH, ay, scale, summonIntroP);
    }

    // Dedicated Close Combat Attack Effects (Quick Attack, Iron Tail, Dragon Claw, Night Slash, Close Combat)
    _drawPokemonMeleeAttackEffects(ctx, pokemon, r, groundY, scale);

    // If dissolving in Poké Ball recall beam: draw glowing crimson/white energy aura overlay & rising motes
    if (isFainting && recallProgress > 0) {
      const recallGlow = Math.sin(recallProgress * Math.PI);
      ctx.save();
      ctx.globalAlpha = 0.40 * recallGlow;
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.ellipse(0, groundY - (ay * scale * 0.45), drawW * 0.42, drawH * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rising red recall energy particles
      ctx.fillStyle = '#FFFFFF';
      for (let pIdx = 0; pIdx < 3; pIdx++) {
        const pOffset = ((faintTick * 3 + pIdx * 7) % 22);
        const pY = groundY - (pOffset * 1.6);
        const pX = Math.sin(faintTick * 0.4 + pIdx * 1.5) * 12;
        ctx.fillRect(pX - 1.5, pY - 1.5, 3, 3);
      }
      ctx.restore();
    }
  } else {
    // Procedural elemental emblem fallback while image loads
    ctx.fillStyle = pokemon.themeColor || '#FACC15';
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Procedural Fallback Hit Flash (Only when sprite image is not yet loaded)
    renderPokemonHitFlash(ctx, pokemon);

    if (isSummonIntro) {
      const scale = pokemon.spriteScale || 1.5;
      const ay = clipSpec.ay !== undefined ? clipSpec.ay : (clipSpec.fh * 0.6);
      _drawPokemonSummonIntroOverlayEffects(
        ctx,
        pokemon,
        r,
        groundY,
        clipSpec.fw * scale,
        clipSpec.fh * scale,
        ay,
        scale,
        summonIntroP
      );
    }
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

  // 4. Charizard Hardcoded 16-Bit Pixel-Art Flamethrower (Charging Windup, Roaring Flame Torrent & Breather)
  if (pokemon.flamethrowerState) {
    const castAngle = pokemon.flamethrowerCastAngle || pokemon.gunAngle || 0;
    const cosA = Math.cos(castAngle);
    const sinA = Math.sin(castAngle);
    // Exact 8-directional mouth anchor matching Charizard's PMD Shoot-Anim.png sprite
    const { originX, originY } = getCharizardMouthLocalOffset(pokemon, castAngle);
    const specSkill = pokemon.spec?.skills?.special;
    const tick = pokemon.animTick || 0;

    if (pokemon.flamethrowerState === 'windup') {
      const p = Math.max(0, Math.min(1.0, 1.0 - Math.max(0, pokemon.flamethrowerTimer / Math.max(1, pokemon.flamethrowerMaxWindup || 28))));
      const windupMouth = getCharizardWindupMouthLocalOffset(pokemon, castAngle, p);
      _drawCharizard16BitWindupFlame(ctx, windupMouth.originX, windupMouth.originY, windupMouth.flameAngle, p, tick);
    } else if (pokemon.flamethrowerState === 'active') {
      const fixedStreamLen = 260;
      const fixedStreamW = 48;
      _drawCharizard16BitFlamethrower(ctx, pokemon, originX, originY, castAngle, fixedStreamLen, fixedStreamW, tick, {
        alpha: 1.0,
        isRecovery: false
      });
    } else if (pokemon.flamethrowerState === 'recovery') {
      // Phase 3: Breather / Fixed-Size Flame Fade + 16-Bit Pixel Smoke Puffs
      const maxRec = Math.max(1, specSkill?.recoveryFrames || 24);
      const p = Math.max(0, Math.min(1, 1.0 - Math.max(0, pokemon.flamethrowerTimer / maxRec)));
      const fixedStreamLen = 260;
      const fixedStreamW = 48;

      if (p < 0.75) {
        _drawCharizard16BitFlamethrower(ctx, pokemon, originX, originY, castAngle, fixedStreamLen, fixedStreamW, tick, {
          alpha: Math.max(0, 1.0 - (p / 0.75)),
          isRecovery: true
        });
      }

      // 16-Bit Stepped Pixel-Art Cooling Smoke Puffs Rising from Jaws (Fixed Radius)
      const P = 3;
      const smokeCount = 4;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1.0 - p * 0.85);
      for (let s = 0; s < smokeCount; s++) {
        const driftDist = (14 + s * 14) * (0.35 + 0.65 * p);
        const sx = originX + cosA * driftDist + Math.sin(tick * 0.18 + s) * 6;
        const sy = originY + sinA * driftDist - (6 + s * 9) * p;
        const sr = Math.max(P, 6 + s * 3);

        ctx.fillStyle = '#0E0F14';
        _fill16BitPixelDisc(ctx, sx, sy, sr + P, P);
        ctx.fillStyle = '#475569';
        _fill16BitPixelDisc(ctx, sx, sy, sr, P);
        if (sr * 0.68 >= P) {
          ctx.fillStyle = '#94A3B8';
          _fill16BitPixelDisc(ctx, sx - 1, sy - 1, sr * 0.68, P);
        }
      }
      ctx.restore();
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
