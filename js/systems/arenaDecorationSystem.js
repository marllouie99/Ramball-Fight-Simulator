// ─────────────────────────────────────────────
// ARENA DECORATION SYSTEM — Modular Seasonal Event Themes & Corner Decals
// ─────────────────────────────────────────────

import { state } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { _registerButton, drawChamferedRect, fitSingleLineText } from '../graphics/ui/uiFramework.js';
import { spawnSparks, spawnImpactFlash } from '../graphics/particles/sparkEffect.js';
import { audioSystem } from './audioSystem.js';

export const ARENA_DECORATION_STORAGE_ENABLED_KEY = 'circle_arena_decorations_enabled';
export const ARENA_DECORATION_STORAGE_THEME_KEY = 'circle_arena_decoration_theme';

export const ARENA_DECORATION_THEMES = [
  {
    id: 'halloween',
    name: 'HALLOWEEN',
    shortName: 'HALLOWEEN',
    icon: '🎃',
    themeColor: '#F97316',
    desc: 'Spooky cobwebs, burning skull candles, ancient ribcages, and scattered bones adorning the arena.',
    assets: {
      cobwebs: 'Assets/Overlays/Arena Decoration/cobwebs1.png',
      bonecandle: 'Assets/Overlays/Arena Decoration/bonecandle.png',
      skulls: 'Assets/Overlays/Arena Decoration/skulls.png',
      bones: 'Assets/Overlays/Arena Decoration/bones.png',
      tombstone: 'Assets/Overlays/Arena Decoration/thumbstone.png',
      ghost: 'Assets/Overlays/Arena Decoration/Ghost.png',
    },
    sprites: {
      topLeftWeb: {
        sx: 57,
        sy: 116,
        sw: 805,
        sh: 530,
        aspectRatio: 805 / 530, // ~1.5189
      },
      topRightWeb: {
        sx: 1632,
        sy: 116,
        sw: 505,
        sh: 530,
        aspectRatio: 505 / 530, // ~0.9528
      },
      boneCandle: {
        sx: 4,
        sy: 12,
        sw: 115,
        sh: 226,
        aspectRatio: 115 / 226, // ~0.5088
      },
      skullsPair: {
        sx: 18,
        sy: 2,
        sw: 195,
        sh: 204,
        aspectRatio: 195 / 204, // ~0.9558
      },
      skullTopLeft: {
        sx: 18,
        sy: 2,
        sw: 108,
        sh: 113,
        aspectRatio: 108 / 113,
      },
      skullBottomRight: {
        sx: 107,
        sy: 95,
        sw: 106,
        sh: 111,
        aspectRatio: 106 / 111,
      },
      boneRibcage: {
        sx: 137,
        sy: 105,
        sw: 136,
        sh: 142,
        aspectRatio: 136 / 142,
      },
      boneFemur: {
        sx: 0,
        sy: 116,
        sw: 118,
        sh: 119,
        aspectRatio: 118 / 119,
      },
      boneMiniSkull: {
        sx: 205,
        sy: 12,
        sw: 63,
        sh: 68,
        aspectRatio: 63 / 68,
      },
      boneCubeSkull: {
        sx: 44,
        sy: 39,
        sw: 104,
        sh: 108,
        aspectRatio: 104 / 108,
      },
    },
  },
  {
    id: 'none',
    name: 'CLEAN (OFF)',
    shortName: 'OFF',
    icon: '🚫',
    themeColor: '#64748B',
    desc: 'Zero arena decorations. Clean competitive fighting ring.',
  },
];

let _cobwebImage = null;
let _skullsImage = null;
let _boneCandleImage = null;
let _bonesImage = null;
let _isDecorationsEnabled = null;
let _currentThemeId = null;

// Dynamic physics tracking for decorations blown away by Saitama's punches
let _blownDecorationIds = new Set();
let _blownDecorations = [];

/**
 * Resets all blown away decorations back to their static mounting perches.
 * Called on round restarts and match re-initializations.
 */
export function resetBlownDecorations() {
  _blownDecorationIds.clear();
  _blownDecorations = [];
}

/**
 * Returns the array of currently active blown decoration physics entities (kept for backwards compatibility).
 * @returns {Array<object>}
 */
export function getBlownDecorations() {
  return _blownDecorations;
}

/**
 * Returns a Set copy of currently vanished/disappeared decoration IDs.
 * @returns {Set<string>}
 */
export function getBlownDecorationIds() {
  return new Set(_blownDecorationIds);
}

/**
 * Checks if a specific decoration is currently disappeared/vanished.
 * @param {string} id
 * @returns {boolean}
 */
export function isDecorationBlown(id) {
  return _blownDecorationIds.has(id);
}

/**
 * Returns the cached or freshly initialized Image object for cobweb decorations.
 * @returns {HTMLImageElement|null}
 */
export function getCobwebDecorationImage() {
  if (typeof Image === 'undefined') return null;
  if (!_cobwebImage) {
    _cobwebImage = new Image();
    _cobwebImage.src = 'Assets/Overlays/Arena Decoration/cobwebs1.png';
  }
  return _cobwebImage;
}

/**
 * Returns the cached or freshly initialized Image object for skulls decorations.
 * @returns {HTMLImageElement|null}
 */
export function getSkullsDecorationImage() {
  if (typeof Image === 'undefined') return null;
  if (!_skullsImage) {
    _skullsImage = new Image();
    _skullsImage.src = 'Assets/Overlays/Arena Decoration/skulls.png';
  }
  return _skullsImage;
}

/**
 * Returns the cached or freshly initialized Image object for bone candle decorations.
 * @returns {HTMLImageElement|null}
 */
export function getBoneCandleDecorationImage() {
  if (typeof Image === 'undefined') return null;
  if (!_boneCandleImage) {
    _boneCandleImage = new Image();
    _boneCandleImage.src = 'Assets/Overlays/Arena Decoration/bonecandle.png';
  }
  return _boneCandleImage;
}

/**
 * Returns the cached or freshly initialized Image object for scattered bones decorations.
 * @returns {HTMLImageElement|null}
 */
export function getBonesDecorationImage() {
  if (typeof Image === 'undefined') return null;
  if (!_bonesImage) {
    _bonesImage = new Image();
    _bonesImage.src = 'Assets/Overlays/Arena Decoration/bones.png';
  }
  return _bonesImage;
}

// Proactive eager preloading in browser environment
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getCobwebDecorationImage();
  getSkullsDecorationImage();
  getBoneCandleDecorationImage();
  getBonesDecorationImage();
}

/**
 * Checks whether arena decorations are currently enabled.
 * Evaluates localStorage override first, then CONFIG.arenaDecorations.enabled fallback.
 * @returns {boolean}
 */
export function isArenaDecorationsEnabled() {
  if (_isDecorationsEnabled !== null) return _isDecorationsEnabled;
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(ARENA_DECORATION_STORAGE_ENABLED_KEY);
      if (saved !== null) {
        _isDecorationsEnabled = saved === 'true' || saved === '1';
        return _isDecorationsEnabled;
      }
    }
  } catch (_) {}

  const cfgEnabled = (typeof CONFIG !== 'undefined' && CONFIG.arenaDecorations?.enabled !== undefined)
    ? Boolean(CONFIG.arenaDecorations.enabled)
    : true;
  _isDecorationsEnabled = cfgEnabled;
  return _isDecorationsEnabled;
}

/**
 * Sets whether arena decorations are enabled and persists the setting to localStorage.
 * @param {boolean} enabled
 */
export function setArenaDecorationsEnabled(enabled) {
  _isDecorationsEnabled = Boolean(enabled);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ARENA_DECORATION_STORAGE_ENABLED_KEY, _isDecorationsEnabled ? 'true' : 'false');
    }
  } catch (_) {}
}

/**
 * Toggles arena decorations between enabled and disabled.
 * @returns {boolean} The new enabled state
 */
export function toggleArenaDecorations() {
  const current = isArenaDecorationsEnabled();
  setArenaDecorationsEnabled(!current);
  return !current;
}

/**
 * Returns the current active decoration theme ID.
 * @returns {string}
 */
export function getArenaDecorationTheme() {
  if (_currentThemeId !== null) return _currentThemeId;
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(ARENA_DECORATION_STORAGE_THEME_KEY);
      if (saved && ARENA_DECORATION_THEMES.some(t => t.id === saved)) {
        _currentThemeId = saved;
        return _currentThemeId;
      }
    }
  } catch (_) {}

  const cfgTheme = (typeof CONFIG !== 'undefined' && CONFIG.arenaDecorations?.theme)
    ? CONFIG.arenaDecorations.theme
    : 'halloween';
  _currentThemeId = cfgTheme;
  return _currentThemeId;
}

/**
 * Sets the active decoration theme and persists it to localStorage.
 * @param {string} themeId
 */
export function setArenaDecorationTheme(themeId) {
  if (ARENA_DECORATION_THEMES.some(t => t.id === themeId)) {
    _currentThemeId = themeId;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(ARENA_DECORATION_STORAGE_THEME_KEY, themeId);
      }
    } catch (_) {}
  }
}

/**
 * Generates descriptor list for all active Halloween decorations in world/camera coordinates.
 * @param {Object} arena
 * @returns {Array<object>}
 */
export function getHalloweenDecorationItems(arena) {
  if (!arena) return [];
  const isHorizontal = typeof state !== 'undefined' && state.viewOrientation === 'horizontal';
  const userScale = (typeof CONFIG !== 'undefined' && CONFIG.arenaDecorations?.scaleMultiplier)
    ? CONFIG.arenaDecorations.scaleMultiplier
    : 1.0;
  const scaleFactor = (isHorizontal
    ? Math.min(1.45, Math.max(1.0, (arena.height / 450) * 0.95))
    : 1.0) * userScale;

  const halloweenTheme = ARENA_DECORATION_THEMES[0];
  const sp = halloweenTheme.sprites;
  const wallW = arena.wallWidth || 4;

  const scaleFraction = isHorizontal ? 0.18 : 0.22;
  const baseCornerH = Math.min(175, Math.max(92, arena.height * scaleFraction)) * scaleFactor;
  const leftCornerW = Math.round(baseCornerH * sp.topLeftWeb.aspectRatio);
  const leftCornerH = Math.round(baseCornerH);
  const rightCornerW = Math.round(baseCornerH * sp.topRightWeb.aspectRatio);
  const rightCornerH = Math.round(baseCornerH);

  const cW = Math.round(22 * scaleFactor);
  const cH = Math.round(44 * scaleFactor);

  const items = [];

  // 1. Cobwebs (Layer 2)
  items.push({
    id: 'cobweb_top_left',
    type: 'cobweb',
    name: 'Top-Left Cobweb',
    layer: 2,
    x: arena.x,
    y: arena.y,
    w: leftCornerW,
    h: leftCornerH,
    cx: arena.x + leftCornerW * 0.38,
    cy: arena.y + leftCornerH * 0.38,
    radius: Math.max(leftCornerW, leftCornerH) * 0.55,
    imgFunc: getCobwebDecorationImage,
    sprite: sp.topLeftWeb,
  });

  items.push({
    id: 'cobweb_top_right',
    type: 'cobweb',
    name: 'Top-Right Cobweb',
    layer: 2,
    x: arena.x + arena.width - rightCornerW,
    y: arena.y,
    w: rightCornerW,
    h: rightCornerH,
    cx: arena.x + arena.width - rightCornerW * 0.38,
    cy: arena.y + rightCornerH * 0.38,
    radius: Math.max(rightCornerW, rightCornerH) * 0.55,
    imgFunc: getCobwebDecorationImage,
    sprite: sp.topRightWeb,
  });

  // 2. Bone Candles (Layer 3 - top of walls)
  items.push({
    id: 'candle_top_left',
    type: 'candle',
    name: 'Top-Left Skull Candle',
    layer: 3,
    x: arena.x - Math.round(cW * 0.45),
    y: arena.y - Math.round(cH * 0.65),
    w: cW,
    h: cH,
    cx: arena.x - Math.round(cW * 0.45) + cW * 0.5,
    cy: arena.y - Math.round(cH * 0.65) + cH * 0.5,
    radius: cH * 0.65,
    imgFunc: getBoneCandleDecorationImage,
    sprite: sp.boneCandle,
    seed: 0.1,
    mirror: true,
  });

  items.push({
    id: 'candle_top_right',
    type: 'candle',
    name: 'Top-Right Skull Candle',
    layer: 3,
    x: arena.x + arena.width - Math.round(cW * 0.55),
    y: arena.y - Math.round(cH * 0.65),
    w: cW,
    h: cH,
    cx: arena.x + arena.width - Math.round(cW * 0.55) + cW * 0.5,
    cy: arena.y - Math.round(cH * 0.65) + cH * 0.5,
    radius: cH * 0.65,
    imgFunc: getBoneCandleDecorationImage,
    sprite: sp.boneCandle,
    seed: 1.7,
    mirror: false,
  });

  items.push({
    id: 'candle_bottom_left',
    type: 'candle',
    name: 'Bottom-Left Skull Candle',
    layer: 3,
    x: arena.x - Math.round(cW * 0.45),
    y: arena.y + arena.height - Math.round(cH * 0.65),
    w: cW,
    h: cH,
    cx: arena.x - Math.round(cW * 0.45) + cW * 0.5,
    cy: arena.y + arena.height - Math.round(cH * 0.65) + cH * 0.5,
    radius: cH * 0.65,
    imgFunc: getBoneCandleDecorationImage,
    sprite: sp.boneCandle,
    seed: 3.2,
    mirror: true,
  });

  items.push({
    id: 'candle_bottom_right',
    type: 'candle',
    name: 'Bottom-Right Skull Candle',
    layer: 3,
    x: arena.x + arena.width - Math.round(cW * 0.55),
    y: arena.y + arena.height - Math.round(cH * 0.65),
    w: cW,
    h: cH,
    cx: arena.x + arena.width - Math.round(cW * 0.55) + cW * 0.5,
    cy: arena.y + arena.height - Math.round(cH * 0.65) + cH * 0.5,
    radius: cH * 0.65,
    imgFunc: getBoneCandleDecorationImage,
    sprite: sp.boneCandle,
    seed: 4.8,
    mirror: false,
  });

  // 3. Floor Relics (Layer 1)
  // 1A. Ribcage
  const rw = Math.round(34 * scaleFactor);
  const rh = Math.round(36 * scaleFactor);
  const rx = arena.x + wallW + Math.round(8 * scaleFactor);
  const ry = arena.y + arena.height - wallW - Math.round(40 * scaleFactor);
  items.push({
    id: 'floor_bl_ribcage',
    type: 'bone',
    name: 'Bottom-Left Ribcage',
    layer: 1,
    x: rx, y: ry, w: rw, h: rh,
    cx: rx + rw * 0.5, cy: ry + rh * 0.5,
    radius: Math.max(rw, rh) * 0.6,
    imgFunc: getBonesDecorationImage,
    sprite: sp.boneRibcage,
  });

  // 1B. Femur
  const bw = Math.round(28 * scaleFactor);
  const bh = Math.round(28 * scaleFactor);
  const bx = arena.x + wallW + Math.round(30 * scaleFactor);
  const by = arena.y + arena.height - wallW - Math.round(24 * scaleFactor);
  items.push({
    id: 'floor_bl_femur',
    type: 'bone',
    name: 'Bottom-Left Crossbone',
    layer: 1,
    x: bx, y: by, w: bw, h: bh,
    cx: bx + bw * 0.5, cy: by + bh * 0.5,
    radius: Math.max(bw, bh) * 0.6,
    imgFunc: getBonesDecorationImage,
    sprite: sp.boneFemur,
  });

  // 1C. Mini Skull
  const mw = Math.round(16 * scaleFactor);
  const mh = Math.round(17 * scaleFactor);
  const mx = arena.x + wallW + Math.round(24 * scaleFactor);
  const my = arena.y + arena.height - wallW - Math.round(14 * scaleFactor);
  items.push({
    id: 'floor_bl_mini_skull',
    type: 'skull',
    name: 'Bottom-Left Mini Skull',
    layer: 1,
    x: mx, y: my, w: mw, h: mh,
    cx: mx + mw * 0.5, cy: my + mh * 0.5,
    radius: Math.max(mw, mh) * 0.6,
    imgFunc: getBonesDecorationImage,
    sprite: sp.boneMiniSkull,
  });

  // 2A. Dual Skulls
  const dw = Math.round(42 * scaleFactor);
  const dh = Math.round(44 * scaleFactor);
  const dx = arena.x + arena.width - wallW - Math.round(52 * scaleFactor);
  const dy = arena.y + arena.height - wallW - Math.round(46 * scaleFactor);
  items.push({
    id: 'floor_br_dual_skulls',
    type: 'skull',
    name: 'Bottom-Right Dual Skulls',
    layer: 1,
    x: dx, y: dy, w: dw, h: dh,
    cx: dx + dw * 0.5, cy: dy + dh * 0.5,
    radius: Math.max(dw, dh) * 0.6,
    imgFunc: getSkullsDecorationImage,
    sprite: sp.skullsPair,
  });

  // 2B. Scattered Crossbone
  const fw = Math.round(26 * scaleFactor);
  const fh = Math.round(26 * scaleFactor);
  const fx = arena.x + arena.width - wallW - Math.round(74 * scaleFactor);
  const fy = arena.y + arena.height - wallW - Math.round(22 * scaleFactor);
  items.push({
    id: 'floor_br_femur',
    type: 'bone',
    name: 'Bottom-Right Crossbone',
    layer: 1,
    x: fx, y: fy, w: fw, h: fh,
    cx: fx + fw * 0.5, cy: fy + fh * 0.5,
    radius: Math.max(fw, fh) * 0.6,
    imgFunc: getBonesDecorationImage,
    sprite: sp.boneFemur,
  });

  // 2C. Mini Skull
  const sw = Math.round(15 * scaleFactor);
  const sh = Math.round(16 * scaleFactor);
  const sx = arena.x + arena.width - wallW - Math.round(22 * scaleFactor);
  const sy = arena.y + arena.height - wallW - Math.round(16 * scaleFactor);
  items.push({
    id: 'floor_br_mini_skull',
    type: 'skull',
    name: 'Bottom-Right Mini Skull',
    layer: 1,
    x: sx, y: sy, w: sw, h: sh,
    cx: sx + sw * 0.5, cy: sy + sh * 0.5,
    radius: Math.max(sw, sh) * 0.6,
    imgFunc: getBonesDecorationImage,
    sprite: sp.boneMiniSkull,
  });

  // 3A. Top-Left Cube Skull
  const tlw = Math.round(20 * scaleFactor);
  const tlh = Math.round(21 * scaleFactor);
  const tlx = arena.x + wallW + Math.round(12 * scaleFactor);
  const tly = arena.y + wallW + Math.round(70 * scaleFactor);
  items.push({
    id: 'floor_tl_cube_skull',
    type: 'skull',
    name: 'Top-Left Cube Skull',
    layer: 1,
    x: tlx, y: tly, w: tlw, h: tlh,
    cx: tlx + tlw * 0.5, cy: tly + tlh * 0.5,
    radius: Math.max(tlw, tlh) * 0.6,
    imgFunc: getSkullsDecorationImage,
    sprite: sp.skullTopLeft,
  });

  // 3B. Top-Right Cube Skull
  const trw = Math.round(20 * scaleFactor);
  const trh = Math.round(21 * scaleFactor);
  const trx = arena.x + arena.width - wallW - Math.round(32 * scaleFactor);
  const tryY = arena.y + wallW + Math.round(70 * scaleFactor);
  items.push({
    id: 'floor_tr_cube_skull',
    type: 'skull',
    name: 'Top-Right Cube Skull',
    layer: 1,
    x: trx, y: tryY, w: trw, h: trh,
    cx: trx + trw * 0.5, cy: tryY + trh * 0.5,
    radius: Math.max(trw, trh) * 0.6,
    imgFunc: getSkullsDecorationImage,
    sprite: sp.skullBottomRight,
  });

  return items;
}

/**
 * Makes arena decorations disappear instantly when struck by Saitama's punches,
 * supersonic blast cones, or wall shatter impacts.
 * @param {number} originX - Punch / blast origin X
 * @param {number} originY - Punch / blast origin Y
 * @param {number} punchAngle - Punch direction angle
 * @param {number} reach - Blast reach radius
 * @param {number} [halfArc=Math.PI * 0.35] - Frontal supersonic blast half-arc
 * @param {number} [power=1.0] - Knockback velocity multiplier
 * @param {boolean} [isSeriousPunch=false] - If true, makes all arena decorations disappear instantly
 */
export function blowAwayArenaDecorations(originX, originY, punchAngle, reach, halfArc = Math.PI * 0.35, power = 1.0, isSeriousPunch = false) {
  if (!isArenaDecorationsEnabled()) return;
  const activeThemeId = getArenaDecorationTheme();
  if (activeThemeId === 'none') return;

  const arena = (typeof state !== 'undefined' && state.arena) || (typeof CONFIG !== 'undefined' && CONFIG.arena);
  if (!arena) return;

  const items = getHalloweenDecorationItems(arena);
  let anyBlown = false;

  for (const item of items) {
    if (_blownDecorationIds.has(item.id)) continue;

    let shouldDisappear = false;
    const dx = item.cx - originX;
    const dy = item.cy - originY;
    const dist = Math.hypot(dx, dy);

    if (isSeriousPunch || power >= 3.0) {
      shouldDisappear = true;
    } else {
      if (dist <= reach + item.radius) {
        let angleToItem = Math.atan2(dy, dx);
        let angleDiff = angleToItem - punchAngle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        const effectiveHalfArc = Math.max(halfArc, Math.PI * 0.40);
        if (Math.abs(angleDiff) <= effectiveHalfArc || dist <= 130) {
          shouldDisappear = true;
        }
      } else if (dist <= 130) {
        shouldDisappear = true;
      }
    }

    if (shouldDisappear) {
      anyBlown = true;
      _blownDecorationIds.add(item.id);

      // Instant vanish feedback: micro spark pop at decoration location
      if (typeof spawnSparks === 'function') {
        spawnSparks(item.cx, item.cy, 8, 'impact', item.type === 'candle' ? '#F97316' : '#E2E8F0');
      }
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(item.cx, item.cy, 24, '#FFFFFF');
      }
    }
  }

  if (anyBlown && typeof audioSystem !== 'undefined') {
    const punchImpactSFX = 'Assets/Sound Effects/Attacks/heavypunch2.mp3';
    audioSystem.playSFX(punchImpactSFX, 0.35);
  }
}

/**
 * Makes decorations disappear near shattered wall breaches caused by Saitama.
 * @param {object} hit - Shattered wall hit details
 * @param {object} arena - Arena configuration
 */
export function blowAwayArenaDecorationsNearWall(hit, arena) {
  if (!isArenaDecorationsEnabled() || !hit || !arena) return;
  const items = getHalloweenDecorationItems(arena);
  const wallSpan = hit.span || 140;
  const thresholdDist = wallSpan * 0.65 + 40;
  let anyBlown = false;

  for (const item of items) {
    if (_blownDecorationIds.has(item.id)) continue;
    const dist = Math.hypot(item.cx - hit.x, item.cy - hit.y);
    if (dist <= thresholdDist) {
      anyBlown = true;
      _blownDecorationIds.add(item.id);

      if (typeof spawnSparks === 'function') {
        spawnSparks(item.cx, item.cy, 8, 'impact', item.type === 'candle' ? '#F97316' : '#E2E8F0');
      }
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(item.cx, item.cy, 24, '#FFFFFF');
      }
    }
  }

  if (anyBlown && typeof audioSystem !== 'undefined') {
    const punchImpactSFX = 'Assets/Sound Effects/Attacks/heavypunch2.mp3';
    audioSystem.playSFX(punchImpactSFX, 0.35);
  }
}

/**
 * No-op lifecycle updater maintained for backwards compatibility.
 */
export function updateBlownDecorations(arena) {
  // Direct disappearance model: decorations vanish instantly upon punch
}

/**
 * Renders the active arena decorations onto the canvas context.
 * Anchored in camera-space at the arena corners and boundary posts.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} [passedArena]
 */
export function drawArenaDecorations(ctx, passedArena) {
  if (!ctx || !isArenaDecorationsEnabled()) return;

  const activeThemeId = getArenaDecorationTheme();
  if (activeThemeId === 'none') return;

  const arena = passedArena || (typeof state !== 'undefined' && state.arena) || (typeof CONFIG !== 'undefined' && CONFIG.arena);
  if (!arena) return;

  if (activeThemeId === 'halloween') {
    const isHorizontal = typeof state !== 'undefined' && state.viewOrientation === 'horizontal';
    const userScale = (typeof CONFIG !== 'undefined' && CONFIG.arenaDecorations?.scaleMultiplier)
      ? CONFIG.arenaDecorations.scaleMultiplier
      : 1.0;
    const scaleFactor = (isHorizontal
      ? Math.min(1.45, Math.max(1.0, (arena.height / 450) * 0.95))
      : 1.0) * userScale;

    const globalAlpha = (typeof CONFIG !== 'undefined' && typeof CONFIG.arenaDecorations?.opacity === 'number')
      ? Math.max(0, Math.min(1.0, CONFIG.arenaDecorations.opacity))
      : 1.0;

    // 1. Layer 1 (Arena Floor): Ancient skeletal relics, ribcages, and floor skulls
    _drawHalloweenFloorRelics(ctx, arena, globalAlpha, scaleFactor);

    // 2. Layer 2 (Arena Corner Walls): Cobwebs draped across top corners
    _drawHalloweenCobwebs(ctx, arena, globalAlpha, scaleFactor);

    // 3. Layer 3 (TOP LAYER OF ARENA WALLS): Bone candles perched on top of arena wall corner posts & cobwebs
    _drawHalloweenCandles(ctx, arena, globalAlpha, scaleFactor);
  }
}

/**
 * Renders the Halloween cobweb decals and hanging spiders on the top-left and top-right corners.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} arena
 * @param {number} globalAlpha
 * @param {number} scaleFactor
 */
function _drawHalloweenCobwebs(ctx, arena, globalAlpha, scaleFactor) {
  const img = getCobwebDecorationImage();
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const halloweenTheme = ARENA_DECORATION_THEMES[0];
  const { topLeftWeb, topRightWeb } = halloweenTheme.sprites;

  const isHorizontal = typeof state !== 'undefined' && state.viewOrientation === 'horizontal';
  const scaleFraction = isHorizontal ? 0.18 : 0.22;
  const baseCornerH = Math.min(175, Math.max(92, arena.height * scaleFraction)) * scaleFactor;
  const leftCornerW = Math.round(baseCornerH * topLeftWeb.aspectRatio);
  const leftCornerH = Math.round(baseCornerH);
  const rightCornerW = Math.round(baseCornerH * topRightWeb.aspectRatio);
  const rightCornerH = Math.round(baseCornerH);

  // Subtle ambient breathing sway on spider silk (0.0018 rad/frame frequency)
  const enableSway = (typeof CONFIG !== 'undefined' && CONFIG.arenaDecorations?.swayAnimation !== undefined)
    ? CONFIG.arenaDecorations.swayAnimation
    : true;
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
  const swayOffset = enableSway ? Math.sin(now * 0.0018) * 1.4 : 0;

  ctx.save();
  ctx.imageSmoothingEnabled = false; // Preserve authentic crisp pixel art
  if (globalAlpha < 1.0) {
    ctx.globalAlpha = globalAlpha;
  }

  // 1. Top-Left Corner Cobweb & Hanging Spider
  if (!_blownDecorationIds.has('cobweb_top_left')) {
    const leftX = arena.x;
    const leftY = arena.y;
    ctx.drawImage(
      img,
      topLeftWeb.sx, topLeftWeb.sy, topLeftWeb.sw, topLeftWeb.sh,
      leftX, leftY + swayOffset * 0.5, leftCornerW, leftCornerH
    );
  }

  // 2. Top-Right Corner Cobweb & Hanging Spider
  if (!_blownDecorationIds.has('cobweb_top_right')) {
    const rightX = arena.x + arena.width - rightCornerW;
    const rightY = arena.y;
    ctx.drawImage(
      img,
      topRightWeb.sx, topRightWeb.sy, topRightWeb.sw, topRightWeb.sh,
      rightX, rightY + swayOffset * 0.5, rightCornerW, rightCornerH
    );
  }

  ctx.restore();
}

/**
 * Renders atmospheric bone candles with flickering flames and warm candlelight halos
 * perched at the arena outer rim corner posts.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} arena
 * @param {number} globalAlpha
 * @param {number} scaleFactor
 */
function _drawHalloweenCandles(ctx, arena, globalAlpha, scaleFactor) {
  const img = getBoneCandleDecorationImage();
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const halloweenTheme = ARENA_DECORATION_THEMES[0];
  const sp = halloweenTheme.sprites.boneCandle;

  const cW = Math.round(22 * scaleFactor);
  const cH = Math.round(44 * scaleFactor);

  const enableFlicker = (typeof CONFIG !== 'undefined' && CONFIG.arenaDecorations?.candleFlicker !== undefined)
    ? CONFIG.arenaDecorations.candleFlicker
    : true;
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;

  // 4 Corner Rim Posts — Mounted directly atop the arena wall corners on the top layer
  const candlePositions = [
    // Top-Left corner wall post (top layer) — Mirrored to face inward across the arena
    { id: 'candle_top_left', x: arena.x - Math.round(cW * 0.45), y: arena.y - Math.round(cH * 0.65), seed: 0.1, mirror: true },
    // Top-Right corner wall post (top layer) — Naturally faces inward across the arena
    { id: 'candle_top_right', x: arena.x + arena.width - Math.round(cW * 0.55), y: arena.y - Math.round(cH * 0.65), seed: 1.7, mirror: false },
    // Bottom-Left corner wall post (top layer) — Mirrored to face inward across the arena
    { id: 'candle_bottom_left', x: arena.x - Math.round(cW * 0.45), y: arena.y + arena.height - Math.round(cH * 0.65), seed: 3.2, mirror: true },
    // Bottom-Right corner wall post (top layer) — Naturally faces inward across the arena
    { id: 'candle_bottom_right', x: arena.x + arena.width - Math.round(cW * 0.55), y: arena.y + arena.height - Math.round(cH * 0.65), seed: 4.8, mirror: false },
  ];

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  for (const c of candlePositions) {
    if (_blownDecorationIds.has(c.id)) continue;

    // 1. Warm candlelight illumination halo blooming behind the flame
    if (enableFlicker) {
      const flicker = Math.sin(now * 0.011 + c.seed) * 0.08 + Math.cos(now * 0.023 + c.seed) * 0.04;
      const flameX = c.x + cW * 0.5;
      const flameY = c.y + cH * 0.12;
      const haloR = Math.max(12, (24 + flicker * 8) * scaleFactor);

      ctx.save();
      const haloGrad = ctx.createRadialGradient(flameX, flameY, 2, flameX, flameY, haloR);
      haloGrad.addColorStop(0, `rgba(254, 240, 138, ${0.36 * globalAlpha})`);
      haloGrad.addColorStop(0.45, `rgba(249, 115, 22, ${0.12 * globalAlpha})`);
      haloGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(flameX, flameY, haloR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Ground/Wall contact shadow ellipse beneath candle skull
    ctx.save();
    ctx.fillStyle = `rgba(5, 6, 9, ${0.45 * globalAlpha})`;
    ctx.beginPath();
    ctx.ellipse(c.x + cW * 0.5, c.y + cH - 2, cW * 0.46, 4.5 * scaleFactor, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Bone candle pixel art sprite (drawn on TOP layer over wall corners & cobwebs)
    ctx.save();
    if (globalAlpha < 1.0) ctx.globalAlpha = globalAlpha;
    if (c.mirror) {
      ctx.translate(c.x + cW, c.y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sp.sx, sp.sy, sp.sw, sp.sh, 0, 0, cW, cH);
    } else {
      ctx.drawImage(img, sp.sx, sp.sy, sp.sw, sp.sh, c.x, c.y, cW, cH);
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Renders atmospheric ancient skeletal relics (ribcages, crossed bones, dual gladiator skulls)
 * nestled along the inside corners and alcoves of the arena floor.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} arena
 * @param {number} globalAlpha
 * @param {number} scaleFactor
 */
function _drawHalloweenFloorRelics(ctx, arena, globalAlpha, scaleFactor) {
  const skullsImg = getSkullsDecorationImage();
  const bonesImg = getBonesDecorationImage();
  const halloweenTheme = ARENA_DECORATION_THEMES[0];
  const sp = halloweenTheme.sprites;

  const wallW = arena.wallWidth || 4;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (globalAlpha < 1.0) ctx.globalAlpha = globalAlpha;

  // ── 1. Inside Bottom-Left Corner Skeletal Cluster ──
  if (bonesImg && bonesImg.complete && bonesImg.naturalWidth > 0) {
    // 1A. Leaning Ribcage
    if (!_blownDecorationIds.has('floor_bl_ribcage')) {
      const rw = Math.round(34 * scaleFactor);
      const rh = Math.round(36 * scaleFactor);
      const rx = arena.x + wallW + Math.round(8 * scaleFactor);
      const ry = arena.y + arena.height - wallW - Math.round(40 * scaleFactor);

      ctx.save();
      ctx.fillStyle = `rgba(5, 6, 9, ${0.40 * globalAlpha})`;
      ctx.beginPath();
      ctx.ellipse(rx + rw * 0.5, ry + rh - 2, rw * 0.46, 4.5 * scaleFactor, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.drawImage(bonesImg, sp.boneRibcage.sx, sp.boneRibcage.sy, sp.boneRibcage.sw, sp.boneRibcage.sh, rx, ry, rw, rh);
    }

    // 1B. Femur Crossbone
    if (!_blownDecorationIds.has('floor_bl_femur')) {
      const bw = Math.round(28 * scaleFactor);
      const bh = Math.round(28 * scaleFactor);
      const bx = arena.x + wallW + Math.round(30 * scaleFactor);
      const by = arena.y + arena.height - wallW - Math.round(24 * scaleFactor);

      ctx.save();
      ctx.fillStyle = `rgba(5, 6, 9, ${0.35 * globalAlpha})`;
      ctx.beginPath();
      ctx.ellipse(bx + bw * 0.5, by + bh - 2, bw * 0.46, 3.5 * scaleFactor, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.drawImage(bonesImg, sp.boneFemur.sx, sp.boneFemur.sy, sp.boneFemur.sw, sp.boneFemur.sh, bx, by, bw, bh);
    }

    // 1C. Mini Skull
    if (!_blownDecorationIds.has('floor_bl_mini_skull')) {
      const mw = Math.round(16 * scaleFactor);
      const mh = Math.round(17 * scaleFactor);
      const mx = arena.x + wallW + Math.round(24 * scaleFactor);
      const my = arena.y + arena.height - wallW - Math.round(14 * scaleFactor);

      ctx.save();
      ctx.fillStyle = `rgba(5, 6, 9, ${0.35 * globalAlpha})`;
      ctx.beginPath();
      ctx.ellipse(mx + mw * 0.5, my + mh - 1, mw * 0.46, 3 * scaleFactor, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.drawImage(bonesImg, sp.boneMiniSkull.sx, sp.boneMiniSkull.sy, sp.boneMiniSkull.sw, sp.boneMiniSkull.sh, mx, my, mw, mh);
    }
  }

  // ── 2. Inside Bottom-Right Corner Dual Skulls & Bone ──
  if (skullsImg && skullsImg.complete && skullsImg.naturalWidth > 0) {
    // 2A. Dual Gladiator Skulls Pile
    if (!_blownDecorationIds.has('floor_br_dual_skulls')) {
      const dw = Math.round(42 * scaleFactor);
      const dh = Math.round(44 * scaleFactor);
      const dx = arena.x + arena.width - wallW - Math.round(52 * scaleFactor);
      const dy = arena.y + arena.height - wallW - Math.round(46 * scaleFactor);

      ctx.save();
      ctx.fillStyle = `rgba(5, 6, 9, ${0.42 * globalAlpha})`;
      ctx.beginPath();
      ctx.ellipse(dx + dw * 0.5, dy + dh - 2, dw * 0.46, 5 * scaleFactor, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.drawImage(skullsImg, sp.skullsPair.sx, sp.skullsPair.sy, sp.skullsPair.sw, sp.skullsPair.sh, dx, dy, dw, dh);
    }
  }

  if (bonesImg && bonesImg.complete && bonesImg.naturalWidth > 0) {
    // 2B. Scattered Crossbone
    if (!_blownDecorationIds.has('floor_br_femur')) {
      const fw = Math.round(26 * scaleFactor);
      const fh = Math.round(26 * scaleFactor);
      const fx = arena.x + arena.width - wallW - Math.round(74 * scaleFactor);
      const fy = arena.y + arena.height - wallW - Math.round(22 * scaleFactor);

      ctx.save();
      ctx.fillStyle = `rgba(5, 6, 9, ${0.35 * globalAlpha})`;
      ctx.beginPath();
      ctx.ellipse(fx + fw * 0.5, fy + fh - 2, fw * 0.46, 3.5 * scaleFactor, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.drawImage(bonesImg, sp.boneFemur.sx, sp.boneFemur.sy, sp.boneFemur.sw, sp.boneFemur.sh, fx, fy, fw, fh);
    }

    // 2C. Mini Skull
    if (!_blownDecorationIds.has('floor_br_mini_skull')) {
      const sw = Math.round(15 * scaleFactor);
      const sh = Math.round(16 * scaleFactor);
      const sx = arena.x + arena.width - wallW - Math.round(22 * scaleFactor);
      const sy = arena.y + arena.height - wallW - Math.round(16 * scaleFactor);

      ctx.save();
      ctx.fillStyle = `rgba(5, 6, 9, ${0.35 * globalAlpha})`;
      ctx.beginPath();
      ctx.ellipse(sx + sw * 0.5, sy + sh - 1, sw * 0.46, 3 * scaleFactor, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.drawImage(bonesImg, sp.boneMiniSkull.sx, sp.boneMiniSkull.sy, sp.boneMiniSkull.sw, sp.boneMiniSkull.sh, sx, sy, sw, sh);
    }
  }

  // ── 3. Inside Top Corners (Alcoves beneath Cobwebs) ──
  if (skullsImg && skullsImg.complete && skullsImg.naturalWidth > 0) {
    // 3A. Top-Left Alcove Cube Skull
    if (!_blownDecorationIds.has('floor_tl_cube_skull')) {
      const tlw = Math.round(20 * scaleFactor);
      const tlh = Math.round(21 * scaleFactor);
      const tlx = arena.x + wallW + Math.round(12 * scaleFactor);
      const tly = arena.y + wallW + Math.round(70 * scaleFactor);

      ctx.save();
      ctx.fillStyle = `rgba(5, 6, 9, ${0.38 * globalAlpha})`;
      ctx.beginPath();
      ctx.ellipse(tlx + tlw * 0.5, tly + tlh - 1, tlw * 0.46, 3 * scaleFactor, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.drawImage(skullsImg, sp.skullTopLeft.sx, sp.skullTopLeft.sy, sp.skullTopLeft.sw, sp.skullTopLeft.sh, tlx, tly, tlw, tlh);
    }

    // 3B. Top-Right Alcove Cube Skull
    if (!_blownDecorationIds.has('floor_tr_cube_skull')) {
      const trw = Math.round(20 * scaleFactor);
      const trh = Math.round(21 * scaleFactor);
      const trx = arena.x + arena.width - wallW - Math.round(32 * scaleFactor);
      const tryY = arena.y + wallW + Math.round(70 * scaleFactor);

      ctx.save();
      ctx.fillStyle = `rgba(5, 6, 9, ${0.38 * globalAlpha})`;
      ctx.beginPath();
      ctx.ellipse(trx + trw * 0.5, tryY + trh - 1, trw * 0.46, 3 * scaleFactor, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.drawImage(skullsImg, sp.skullBottomRight.sx, sp.skullBottomRight.sy, sp.skullBottomRight.sw, sp.skullBottomRight.sh, trx, tryY, trw, trh);
    }
  }

  ctx.restore();
}

/**
 * Draws the interactive Arena Decoration / Event Theme selector button.
 * Placed in the character selection screen control header alongside Floor & BGM selectors.
 * Clicking toggles the decorations ON / OFF and persists to localStorage.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
export function drawArenaDecorationSelector(ctx, x, y, w, h) {
  if (!ctx) return;

  const isEnabled = isArenaDecorationsEnabled();
  const activeThemeId = getArenaDecorationTheme();
  const activeTheme = ARENA_DECORATION_THEMES.find(t => t.id === activeThemeId) || ARENA_DECORATION_THEMES[0];

  const label = isEnabled
    ? `${activeTheme.icon} DECO: ${activeTheme.shortName}`
    : `🚫 DECO: OFF`;
  const accentColor = isEnabled ? (activeTheme.themeColor || '#F97316') : '#64748B';

  ctx.save();
  // Outer Dark Bevel
  ctx.fillStyle = '#0F1116';
  drawChamferedRect(ctx, x, y + 2, w, h, 3);
  ctx.fill();

  // Button Frame
  ctx.fillStyle = isEnabled ? '#1A1412' : '#14161F';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.4;
  drawChamferedRect(ctx, x, y, w, h, 3);
  ctx.fill();
  ctx.stroke();

  // Left Accent Vertical Stripe
  ctx.fillStyle = accentColor;
  ctx.fillRect(x + 3, y + 2, 2.5, h - 4);

  // Text
  ctx.fillStyle = isEnabled ? '#FFF7ED' : '#94A3B8';
  ctx.font = '900 9px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitSingleLineText(ctx, label, w - 12), x + w / 2 + 2, y + h / 2);
  ctx.restore();

  // Interactive Click Registration
  _registerButton(x, y, w, h + 2, () => {
    const newState = toggleArenaDecorations();
    if (typeof state !== 'undefined' && state.audioSystem?.playSFX) {
      state.audioSystem.playSFX('skill_dash1', 0.25);
    }
  });
}
