// ─────────────────────────────────────────────
// ARENA TILE & FLOOR SYSTEM — Modular Theme Engine & Universal Grid Math
// ─────────────────────────────────────────────

import { state } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { _registerButton, drawChamferedRect, drawPanel, fitSingleLineText, wrapText } from '../graphics/ui/uiFramework.js';
import { getOrCreateGrassFloorCanvas } from '../graphics/renderers/grassFloorRenderer.js';

export const ARENA_FLOOR_STORAGE_KEY = 'circle_selected_arena_floor';

export const ARENA_FLOORS = [
  {
    id: 'classic_clean',
    name: 'PIXEL TOURNAMENT',
    shortName: 'PIXEL CLEAN',
    icon: '⚪',
    themeColor: '#64748b',
    gridSize: 76.6,
    features: '6x6 TILES • 6 COLS x 6 ROWS',
    desc: '6x6 Esports-grade minimalist pixel arena with 8-bit stepped corner brackets, discrete crosshairs, and center target reticle.'
  },
  {
    id: 'pvz_grass',
    name: 'PVZ LAWN',
    shortName: 'PVZ LAWN',
    icon: '🌱',
    themeColor: '#22c55e',
    gridSize: 76.6,
    features: '6x6 TILES • 6 COLS x 6 ROWS',
    desc: '6x6 Authentic Plants vs. Zombies front lawn with 6 columns and 6 rows of sprite tiles (daisies, solar sunbeams, dirt paths).'
  },
  {
    id: 'clash_arena',
    name: 'CLASH ARENA',
    shortName: 'CLASH',
    icon: '⚔️',
    themeColor: '#f59e0b',
    gridSize: 76.6,
    features: '6x6 TILES • 6 COLS x 6 ROWS',
    desc: '6x6 Royal battle turf bounded by heavy pixel slate pauldron blocks, 16-bit golden bolt rivets, and emerald grass tufts.'
  },
  {
    id: 'checker_arcade',
    name: 'RETRO CHECKER',
    shortName: 'CHECKER',
    icon: '🏁',
    themeColor: '#8b5cf6',
    gridSize: 76.6,
    features: '6x6 TILES • 6 COLS x 6 ROWS',
    desc: '6x6 High-contrast 16-bit retro arcade checkerboard with 3D stepped beveled rims on every tile, specular highlights, and studs.'
  },
  {
    id: 'cyber_grid',
    name: 'CYBER GRID',
    shortName: 'CYBER',
    icon: '🌐',
    themeColor: '#06b6d4',
    gridSize: 76.6,
    features: '6x6 TILES • 6 COLS x 6 ROWS',
    desc: '6x6 Deep obsidian void arena with glowing neon cyan pixel tracks, 8-bit diamond intersection nodes, and PCB traces.'
  },
  {
    id: 'stone_dungeon',
    name: 'DUNGEON SLABS',
    shortName: 'DUNGEON',
    icon: '🧱',
    themeColor: '#78716c',
    gridSize: 76.6,
    features: '6x6 TILES • 6 COLS x 6 ROWS',
    desc: '6x6 Ancient carved dungeon flagstones with deep mortar channels, staircase pixel fractures, rune etchings, and moss tufts.'
  },
  {
    id: 'tatami_dojo',
    name: 'DOJO TATAMI',
    shortName: 'TATAMI',
    icon: '🥋',
    themeColor: '#d97706',
    gridSize: 76.6,
    features: '6x6 TILES • 6 COLS x 6 ROWS',
    desc: '6x6 Traditional martial arts dojo with discrete woven straw reed striations, deep indigo cloth borders, and pixel cross-stitches.'
  }
];

let _selectedArenaFloor = null;
let _isArenaFloorModalOpen = false;
let _modalScrollY = 0;
let _miniPreviewCache = {};

// ─────────────────────────────────────────────
// STATE & SELECTION PERSISTENCE
// ─────────────────────────────────────────────

export function getSelectedArenaFloor() {
  if (_selectedArenaFloor !== null) return _selectedArenaFloor;
  if (typeof state !== 'undefined' && state.selectedArenaFloor && ARENA_FLOORS.some(f => f.id === state.selectedArenaFloor)) {
    _selectedArenaFloor = state.selectedArenaFloor;
    return _selectedArenaFloor;
  }
  try {
    const saved = localStorage.getItem(ARENA_FLOOR_STORAGE_KEY);
    if (saved && ARENA_FLOORS.some(f => f.id === saved)) {
      _selectedArenaFloor = saved;
      if (typeof state !== 'undefined') state.selectedArenaFloor = saved;
      return _selectedArenaFloor;
    }
  } catch (e) {}
  _selectedArenaFloor = 'classic_clean';
  if (typeof state !== 'undefined') state.selectedArenaFloor = 'classic_clean';
  return _selectedArenaFloor;
}

export function setSelectedArenaFloor(floorId) {
  if (!ARENA_FLOORS.some(f => f.id === floorId)) floorId = 'classic_clean';
  _selectedArenaFloor = floorId;
  if (typeof state !== 'undefined') {
    state.selectedArenaFloor = floorId;
  }
  try {
    localStorage.setItem(ARENA_FLOOR_STORAGE_KEY, floorId);
  } catch (e) {}
  return _selectedArenaFloor;
}

export function isArenaFloorModalOpen() {
  return _isArenaFloorModalOpen;
}

export function openArenaFloorModal() {
  _isArenaFloorModalOpen = true;
  _modalScrollY = 0;
}

export function closeArenaFloorModal() {
  _isArenaFloorModalOpen = false;
}

export function toggleArenaFloorModal() {
  _isArenaFloorModalOpen = !_isArenaFloorModalOpen;
  if (_isArenaFloorModalOpen) _modalScrollY = 0;
  return _isArenaFloorModalOpen;
}

// ─────────────────────────────────────────────
// THEME RESOLUTION
// ─────────────────────────────────────────────

export function resolveActiveFloorId() {
  return getSelectedArenaFloor();
}

export function getActiveArenaFloorDef() {
  const activeId = resolveActiveFloorId();
  return ARENA_FLOORS.find(f => f.id === activeId) || ARENA_FLOORS[0];
}

// ─────────────────────────────────────────────
// UNIVERSAL TILE GRID MATH & SNAPPING API
// ─────────────────────────────────────────────

export function getTileGridInfo(arena) {
  arena = arena || (typeof state !== 'undefined' && state.arena) || { x: 0, y: 0, width: 460, height: 460 };
  const floorDef = getActiveArenaFloorDef();
  const targetTileSize = floorDef.gridSize || 76.6;
  const cols = Math.max(2, Math.round(arena.width / targetTileSize));
  const rows = Math.max(2, Math.round(arena.height / targetTileSize));
  const cellW = arena.width / cols;
  const cellH = arena.height / rows;

  return {
    cols,
    rows,
    cellW,
    cellH,
    totalTiles: cols * rows,
    tileSize: targetTileSize,
    floorDef
  };
}

export function getNearestTileCenter(targetX, targetY, arena, existingOccupants = []) {
  arena = arena || (typeof state !== 'undefined' && state.arena) || { x: 0, y: 0, width: 460, height: 460 };
  const { cols, rows, cellW, cellH } = getTileGridInfo(arena);

  const baseCol = Math.max(0, Math.min(cols - 1, Math.floor((targetX - arena.x) / cellW)));
  const baseRow = Math.max(0, Math.min(rows - 1, Math.floor((targetY - arena.y) / cellH)));

  const isOccupied = (c, r) => {
    const cx = arena.x + (c + 0.5) * cellW;
    const cy = arena.y + (r + 0.5) * cellH;
    return existingOccupants.some(occ => {
      if (!occ || occ.hp <= 0) return false;
      return Math.hypot(occ.x - cx, occ.y - cy) < Math.min(cellW, cellH) * 0.45;
    });
  };

  if (!isOccupied(baseCol, baseRow)) {
    return {
      x: arena.x + (baseCol + 0.5) * cellW,
      y: arena.y + (baseRow + 0.5) * cellH,
      col: baseCol,
      row: baseRow
    };
  }

  // Find nearest unoccupied tile center
  let bestCenter = null;
  let minD = Infinity;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isOccupied(c, r)) continue;
      const cx = arena.x + (c + 0.5) * cellW;
      const cy = arena.y + (r + 0.5) * cellH;
      const d = Math.hypot(cx - targetX, cy - targetY);
      if (d < minD) {
        minD = d;
        bestCenter = { x: cx, y: cy, col: c, row: r };
      }
    }
  }

  if (bestCenter) return bestCenter;

  return {
    x: arena.x + (baseCol + 0.5) * cellW,
    y: arena.y + (baseRow + 0.5) * cellH,
    col: baseCol,
    row: baseRow
  };
}

export function getRandomTileCenter(arena, existingOccupants = []) {
  arena = arena || (typeof state !== 'undefined' && state.arena) || { x: 0, y: 0, width: 460, height: 460 };
  const { cols, rows, cellW, cellH } = getTileGridInfo(arena);

  const validTiles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = arena.x + (c + 0.5) * cellW;
      const cy = arena.y + (r + 0.5) * cellH;
      if (arena.shape === 'circle') {
        const arenaMidX = arena.x + arena.width / 2;
        const arenaMidY = arena.y + arena.height / 2;
        const ar = (arena.radius !== undefined ? arena.radius : (arena.width / 2)) - 25;
        if (Math.hypot(cx - arenaMidX, cy - arenaMidY) > ar) continue;
      }
      validTiles.push({ x: cx, y: cy, col: c, row: r });
    }
  }

  if (validTiles.length === 0) {
    return { x: arena.x + arena.width / 2, y: arena.y + arena.height / 2, col: 0, row: 0 };
  }

  return validTiles[Math.floor(Math.random() * validTiles.length)];
}

export function isTileOccupied(col, row, arena, occupants = []) {
  if (!occupants || occupants.length === 0) return false;
  arena = arena || (typeof state !== 'undefined' && state.arena) || { x: 0, y: 0, width: 460, height: 460 };
  const { cellW, cellH } = getTileGridInfo(arena);
  const cx = arena.x + (col + 0.5) * cellW;
  const cy = arena.y + (row + 0.5) * cellH;
  return occupants.some(occ => occ && occ.hp > 0 && Math.hypot(occ.x - cx, occ.y - cy) < Math.min(cellW, cellH) * 0.45);
}

// ─────────────────────────────────────────────
// AUTHENTIC 2D DISCRETE PIXEL ART HELPERS
// ─────────────────────────────────────────────

function _pixelRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function _pixelDiamond(ctx, cx, cy, size, color) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  ctx.fillStyle = color;
  for (let dy = -size; dy <= size; dy++) {
    const span = size - Math.abs(dy);
    ctx.fillRect(cx - span, cy + dy, span * 2 + 1, 1);
  }
}

function _pixelCross(ctx, cx, cy, armLen, thick, color) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  ctx.fillStyle = color;
  ctx.fillRect(cx - armLen, cy - Math.floor(thick / 2), armLen * 2 + 1, thick);
  ctx.fillRect(cx - Math.floor(thick / 2), cy - armLen, thick, armLen * 2 + 1);
}

function _pixelLBracket(ctx, x, y, len, thick, dirX, dirY, color) {
  x = Math.round(x);
  y = Math.round(y);
  ctx.fillStyle = color;
  if (dirX > 0) {
    ctx.fillRect(x, y, len, thick);
  } else {
    ctx.fillRect(x - len + thick, y, len, thick);
  }
  if (dirY > 0) {
    ctx.fillRect(x, y, thick, len);
  } else {
    ctx.fillRect(x, y - len + thick, thick, len);
  }
}

// ─────────────────────────────────────────────
// MODULAR PIXEL ART THEME GENERATORS
// ─────────────────────────────────────────────

function _renderPixelCleanFloor(oc, width, height, cols, rows, cellW, cellH, isDark) {
  const bgColor = isDark ? '#070a13' : '#f8fafc';
  const gridDotColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)';
  const frameColor = isDark ? '#334155' : '#cbd5e1';
  const bracketColor = isDark ? '#64748b' : '#475569';
  const accentColor = isDark ? '#38bdf8' : '#0284c7';

  _pixelRect(oc, 0, 0, width, height, bgColor);

  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      const gx = Math.round(c * cellW);
      const gy = Math.round(r * cellH);
      _pixelRect(oc, gx - 1, gy, 3, 1, gridDotColor);
      _pixelRect(oc, gx, gy - 1, 1, 3, gridDotColor);
    }
  }

  const pad = 6;
  _pixelRect(oc, pad, pad, width - pad * 2, 2, frameColor);
  _pixelRect(oc, pad, height - pad - 2, width - pad * 2, 2, frameColor);
  _pixelRect(oc, pad, pad, 2, height - pad * 2, frameColor);
  _pixelRect(oc, width - pad - 2, pad, 2, height - pad * 2, frameColor);

  const bLen = 14;
  const bThick = 3;
  _pixelLBracket(oc, pad + 2, pad + 2, bLen, bThick, 1, 1, bracketColor);
  _pixelLBracket(oc, width - pad - 2 - bThick, pad + 2, bLen, bThick, -1, 1, bracketColor);
  _pixelLBracket(oc, pad + 2, height - pad - 2 - bThick, bLen, bThick, 1, -1, bracketColor);
  _pixelLBracket(oc, width - pad - 2 - bThick, height - pad - 2 - bThick, bLen, bThick, -1, -1, bracketColor);

  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);
  _pixelCross(oc, cx, cy, 8, 2, accentColor);
  _pixelRect(oc, cx - 1, cy - 1, 3, 3, bgColor);
  _pixelRect(oc, cx, cy, 1, 1, accentColor);
}

function _renderPixelPvzGrassFloor(oc, width, height, cols, rows, cellW, cellH, isDark) {
  const grassA = isDark ? '#2b7a18' : '#43b02a';
  const grassB = isDark ? '#236313' : '#389822';
  const seamColor = isDark ? '#19450c' : '#297017';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = Math.round(c * cellW);
      const by = Math.round(r * cellH);
      const bw = Math.round((c + 1) * cellW) - bx;
      const bh = Math.round((r + 1) * cellH) - by;
      const isAlt = ((r + c) % 2 === 0);

      _pixelRect(oc, bx, by, bw, bh, isAlt ? grassA : grassB);
      _pixelRect(oc, bx, by, bw, 1, seamColor);
      _pixelRect(oc, bx, by, 1, bh, seamColor);

      const cellSeed = (r * 13 + c * 37) % 100;

      if ((c === 3 && (r === 1 || r === 4)) || (c === 1 && r === 2)) {
        const dx = bx + Math.round(bw * 0.22);
        const dy = by + Math.round(bh * 0.22);
        const dw = Math.round(bw * 0.56);
        const dh = Math.round(bh * 0.56);
        _pixelRect(oc, dx, dy, dw, dh, '#78350f');
        _pixelRect(oc, dx + 2, dy + 2, dw - 4, dh - 4, '#92400e');
        _pixelRect(oc, dx - 2, dy + 4, 2, dh - 8, '#78350f');
        _pixelRect(oc, dx + dw, dy + 4, 2, dh - 8, '#78350f');
        _pixelRect(oc, dx + 4, dy - 2, dw - 8, 2, '#78350f');
        _pixelRect(oc, dx + 4, dy + dh, dw - 8, 2, '#78350f');
        _pixelRect(oc, dx + 4, dy + 4, 3, 2, '#94a3b8');
        _pixelRect(oc, dx + dw - 7, dy + dh - 6, 4, 2, '#64748b');
      } else {
        const bladeTip = isDark ? '#4ade80' : '#86efac';
        const bladeRoot = isDark ? '#14532d' : '#166534';
        
        const kx1 = bx + Math.round(bw * 0.25);
        const ky1 = by + Math.round(bh * 0.35);
        _pixelRect(oc, kx1, ky1, 2, 5, bladeRoot);
        _pixelRect(oc, kx1 + 2, ky1 - 2, 2, 7, bladeTip);
        _pixelRect(oc, kx1 + 4, ky1 + 1, 2, 4, bladeRoot);

        const kx2 = bx + Math.round(bw * 0.70);
        const ky2 = by + Math.round(bh * 0.65);
        _pixelRect(oc, kx2, ky2, 2, 4, bladeRoot);
        _pixelRect(oc, kx2 - 2, ky2 - 2, 2, 6, bladeTip);

        if (cellSeed % 3 === 0) {
          const fx = bx + Math.round(bw * 0.50);
          const fy = by + Math.round(bh * 0.40);
          _pixelRect(oc, fx - 2, fy - 1, 5, 3, '#ffffff');
          _pixelRect(oc, fx - 1, fy - 2, 3, 5, '#ffffff');
          _pixelRect(oc, fx, fy, 1, 1, '#f59e0b');
        } else if (cellSeed % 5 === 0) {
          const sx = bx + Math.round(bw * 0.45);
          const sy = by + Math.round(bh * 0.50);
          _pixelRect(oc, sx, sy, 4, 2, 'rgba(254, 240, 138, 0.45)');
          _pixelRect(oc, sx + 1, sy - 1, 2, 4, 'rgba(254, 240, 138, 0.45)');
        }
      }
    }
  }
}

function _renderPixelClashFloor(oc, width, height, cols, rows, cellW, cellH, isDark) {
  const slateBaseA = isDark ? '#1e293b' : '#475569';
  const slateBaseB = isDark ? '#0f172a' : '#334155';
  const slateLight = isDark ? '#475569' : '#94a3b8';
  const slateDark = isDark ? '#020617' : '#1e293b';

  const turfBaseA = isDark ? '#15803d' : '#22c55e';
  const turfBaseB = isDark ? '#166534' : '#16a34a';
  const turfSeam = isDark ? '#052e16' : '#14532d';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = Math.round(c * cellW);
      const by = Math.round(r * cellH);
      const bw = Math.round((c + 1) * cellW) - bx;
      const bh = Math.round((r + 1) * cellH) - by;
      const isBorder = (r === 0 || r === rows - 1 || c === 0 || c === cols - 1);
      const isAlt = ((r + c) % 2 === 0);

      if (isBorder) {
        _pixelRect(oc, bx, by, bw, bh, isAlt ? slateBaseA : slateBaseB);
        _pixelRect(oc, bx + 1, by + 1, bw - 2, 2, slateLight);
        _pixelRect(oc, bx + 1, by + 1, 2, bh - 2, slateLight);
        _pixelRect(oc, bx + 1, by + bh - 3, bw - 2, 2, slateDark);
        _pixelRect(oc, bx + bw - 3, by + 1, 2, bh - 2, slateDark);
        _pixelRect(oc, bx, by, bw, 1, '#020617');
        _pixelRect(oc, bx, by + bh - 1, bw, 1, '#020617');
        _pixelRect(oc, bx, by, 1, bh, '#020617');
        _pixelRect(oc, bx + bw - 1, by, 1, bh, '#020617');

        const isCorner = (r === 0 || r === rows - 1) && (c === 0 || c === cols - 1);
        const isMidEdge = (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) && (c === Math.floor(cols / 2) || r === Math.floor(rows / 2));
        if (isCorner || isMidEdge) {
          const rvx = Math.round(bx + bw / 2);
          const rvy = Math.round(by + bh / 2);
          _pixelRect(oc, rvx - 3, rvy - 3, 7, 7, '#78350f');
          _pixelRect(oc, rvx - 2, rvy - 2, 5, 5, '#f59e0b');
          _pixelRect(oc, rvx - 1, rvy - 1, 3, 3, '#fde047');
          _pixelRect(oc, rvx - 2, rvy - 2, 2, 2, '#ffffff');
          _pixelRect(oc, rvx + 1, rvy + 1, 1, 1, '#b45309');
        }
      } else {
        _pixelRect(oc, bx, by, bw, bh, isAlt ? turfBaseA : turfBaseB);
        _pixelRect(oc, bx, by, bw, 1, turfSeam);
        _pixelRect(oc, bx, by, 1, bh, turfSeam);

        const tipColor = isDark ? '#4ade80' : '#86efac';
        const rootColor = isDark ? '#052e16' : '#14532d';
        const gx1 = bx + Math.round(bw * 0.30);
        const gy1 = by + Math.round(bh * 0.35);
        _pixelRect(oc, gx1, gy1, 2, 4, rootColor);
        _pixelRect(oc, gx1 + 2, gy1 - 2, 2, 6, tipColor);

        const gx2 = bx + Math.round(bw * 0.70);
        const gy2 = by + Math.round(bh * 0.65);
        _pixelRect(oc, gx2, gy2, 2, 5, rootColor);
        _pixelRect(oc, gx2 - 2, gy2 - 1, 2, 4, tipColor);

        const midC = Math.floor(cols / 2);
        const midR = Math.floor(rows / 2);
        if ((r === midR || r === midR - 1) && (c === midC || c === midC - 1)) {
          const fx = (c === midC ? bx + 2 : bx + bw - 5);
          const fy = (r === midR ? by + 2 : by + bh - 5);
          _pixelRect(oc, fx, fy, 3, 3, '#f59e0b');
          _pixelRect(oc, fx + 1, fy + 1, 1, 1, '#fef08a');
        }
      }
    }
  }
}

function _renderPixelCheckerFloor(oc, width, height, cols, rows, cellW, cellH, isDark) {
  const lightBase = isDark ? '#334155' : '#f8fafc';
  const lightBevelHi = isDark ? '#64748b' : '#ffffff';
  const lightBevelSh = isDark ? '#1e293b' : '#cbd5e1';

  const darkBase = isDark ? '#1e1b4b' : '#4f46e5';
  const darkBevelHi = isDark ? '#4338ca' : '#818cf8';
  const darkBevelSh = isDark ? '#0f172a' : '#312e81';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = Math.round(c * cellW);
      const by = Math.round(r * cellH);
      const bw = Math.round((c + 1) * cellW) - bx;
      const bh = Math.round((r + 1) * cellH) - by;
      const isAlt = ((r + c) % 2 === 0);

      const base = isAlt ? lightBase : darkBase;
      const hi = isAlt ? lightBevelHi : darkBevelHi;
      const sh = isAlt ? lightBevelSh : darkBevelSh;

      _pixelRect(oc, bx, by, bw, bh, base);
      _pixelRect(oc, bx + 1, by + 1, bw - 2, 2, hi);
      _pixelRect(oc, bx + 1, by + 1, 2, bh - 2, hi);
      _pixelRect(oc, bx + 1, by + bh - 3, bw - 2, 2, sh);
      _pixelRect(oc, bx + bw - 3, by + 1, 2, bh - 2, sh);

      _pixelRect(oc, bx, by, bw, 1, '#0f172a');
      _pixelRect(oc, bx, by + bh - 1, bw, 1, '#0f172a');
      _pixelRect(oc, bx, by, 1, bh, '#0f172a');
      _pixelRect(oc, bx + bw - 1, by, 1, bh, '#0f172a');

      const studHi = isAlt ? '#ffffff' : '#a5b4fc';
      const studSh = isAlt ? '#94a3b8' : '#1e1b4b';
      const off = 5;

      _pixelRect(oc, bx + off, by + off, 2, 2, studHi);
      _pixelRect(oc, bx + off + 1, by + off + 1, 1, 1, studSh);
      _pixelRect(oc, bx + bw - off - 2, by + off, 2, 2, studHi);
      _pixelRect(oc, bx + bw - off - 1, by + off + 1, 1, 1, studSh);
      _pixelRect(oc, bx + off, by + bh - off - 2, 2, 2, studHi);
      _pixelRect(oc, bx + off + 1, by + bh - off - 1, 1, 1, studSh);
      _pixelRect(oc, bx + bw - off - 2, by + bh - off - 2, 2, 2, studHi);
      _pixelRect(oc, bx + bw - off - 1, by + bh - off - 1, 1, 1, studSh);
    }
  }

  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);
  _pixelDiamond(oc, cx, cy, 7, '#0f172a');
  _pixelDiamond(oc, cx, cy, 5, '#8b5cf6');
  _pixelDiamond(oc, cx, cy, 3, '#c084fc');
  _pixelRect(oc, cx, cy, 1, 1, '#ffffff');
}

function _renderPixelCyberFloor(oc, width, height, cols, rows, cellW, cellH, isDark) {
  const bgVoid = isDark ? '#040711' : '#080d1a';
  _pixelRect(oc, 0, 0, width, height, bgVoid);

  const neonCyan = '#06b6d4';
  const neonCyanBright = '#22d3ee';
  const neonCyanGlow = 'rgba(6, 182, 212, 0.35)';

  for (let c = 0; c <= cols; c++) {
    const gx = Math.round(c * cellW);
    _pixelRect(oc, gx - 1, 0, 3, height, neonCyanGlow);
    _pixelRect(oc, gx, 0, 1, height, neonCyanBright);
  }
  for (let r = 0; r <= rows; r++) {
    const gy = Math.round(r * cellH);
    _pixelRect(oc, 0, gy - 1, width, 3, neonCyanGlow);
    _pixelRect(oc, 0, gy, width, 1, neonCyanBright);
  }

  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const gx = Math.round(c * cellW);
      const gy = Math.round(r * cellH);
      _pixelDiamond(oc, gx, gy, 2, neonCyan);
      _pixelRect(oc, gx, gy, 1, 1, '#ffffff');
    }
  }

  const pad = 12;
  const traceSteps = [
    { x: pad, y: pad + 24, len: 12, dx: 0, dy: -1 },
    { x: pad, y: pad + 12, len: 12, dx: 1, dy: 0 },
    { x: width - pad - 2, y: pad + 24, len: 12, dx: 0, dy: -1 },
    { x: width - pad - 14, y: pad + 12, len: 12, dx: 1, dy: 0 },
    { x: pad, y: height - pad - 26, len: 12, dx: 0, dy: 1 },
    { x: pad, y: height - pad - 14, len: 12, dx: 1, dy: 0 },
    { x: width - pad - 2, y: height - pad - 26, len: 12, dx: 0, dy: 1 },
    { x: width - pad - 14, y: height - pad - 14, len: 12, dx: 1, dy: 0 }
  ];
  for (const tr of traceSteps) {
    _pixelRect(oc, tr.x, tr.y, (tr.dx ? tr.len : 2), (tr.dy ? tr.len : 2), neonCyanBright);
  }

  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);
  const arm = 10;
  _pixelRect(oc, cx - arm, cy, arm * 2 + 1, 1, neonCyanBright);
  _pixelRect(oc, cx, cy - arm, 1, arm * 2 + 1, neonCyanBright);
  _pixelDiamond(oc, cx, cy, 3, neonCyan);
  _pixelRect(oc, cx - 1, cy - 1, 3, 3, bgVoid);
  _pixelRect(oc, cx, cy, 1, 1, '#ffffff');
}

function _renderPixelDungeonFloor(oc, width, height, cols, rows, cellW, cellH, isDark) {
  const mortarColor = isDark ? '#05070a' : '#111827';
  _pixelRect(oc, 0, 0, width, height, mortarColor);

  const stoneA = isDark ? '#27272a' : '#52525b';
  const stoneB = isDark ? '#18181b' : '#3f3f46';
  const stoneHi = isDark ? '#52525b' : '#a1a1aa';
  const stoneSh = isDark ? '#09090b' : '#27272a';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = Math.round(c * cellW) + 2;
      const by = Math.round(r * cellH) + 2;
      const bw = Math.round((c + 1) * cellW) - bx - 2;
      const bh = Math.round((r + 1) * cellH) - by - 2;
      const isAlt = ((r + c) % 2 === 0);

      _pixelRect(oc, bx, by, bw, bh, isAlt ? stoneA : stoneB);
      _pixelRect(oc, bx, by, bw, 2, stoneHi);
      _pixelRect(oc, bx, by, 2, bh, stoneHi);
      _pixelRect(oc, bx, by + bh - 2, bw, 2, stoneSh);
      _pixelRect(oc, bx + bw - 2, by, 2, bh, stoneSh);

      if ((r * 7 + c * 13) % 3 === 0) {
        let kx = bx + Math.round(bw * 0.25);
        let ky = by + Math.round(bh * 0.30);
        const steps = 8;
        for (let s = 0; s < steps; s++) {
          _pixelRect(oc, kx, ky, 2, 2, '#09090b');
          _pixelRect(oc, kx + 1, ky + 1, 1, 1, stoneHi);
          kx += (s % 2 === 0 ? 2 : 1);
          ky += (s % 3 === 0 ? 2 : 1);
        }
      }

      if ((r * 11 + c * 17) % 4 === 0) {
        const mx = bx + bw - 6;
        const my = by + bh - 6;
        _pixelRect(oc, mx, my, 6, 6, '#14532d');
        _pixelRect(oc, mx + 1, my + 1, 4, 4, '#16a34a');
        _pixelRect(oc, mx + 2, my + 2, 2, 2, '#4ade80');
      }
    }
  }

  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);
  _pixelDiamond(oc, cx, cy, 6, '#09090b');
  _pixelCross(oc, cx, cy, 5, 1, '#38bdf8');
  _pixelRect(oc, cx - 1, cy - 1, 3, 3, '#09090b');
  _pixelRect(oc, cx, cy, 1, 1, '#e0f2fe');
}

function _renderPixelTatamiFloor(oc, width, height, cols, rows, cellW, cellH, isDark) {
  const mortarBg = isDark ? '#100904' : '#1c1208';
  _pixelRect(oc, 0, 0, width, height, mortarBg);

  const strawBase = isDark ? '#78350f' : '#ca8a04';
  const strawReedHi = isDark ? '#92400e' : '#eab308';
  const strawReedSh = isDark ? '#451a03' : '#854d0e';
  const clothTape = isDark ? '#0f172a' : '#1e1b4b';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = Math.round(c * cellW) + 2;
      const by = Math.round(r * cellH) + 2;
      const bw = Math.round((c + 1) * cellW) - bx - 2;
      const bh = Math.round((r + 1) * cellH) - by - 2;
      const isHorizontal = ((r + c) % 2 === 0);

      _pixelRect(oc, bx, by, bw, bh, strawBase);

      if (isHorizontal) {
        for (let ly = by + 4; ly < by + bh - 4; ly += 4) {
          _pixelRect(oc, bx + 5, ly, bw - 10, 1, strawReedHi);
          _pixelRect(oc, bx + 5, ly + 1, bw - 10, 1, strawReedSh);
          for (let lx = bx + 7; lx < bx + bw - 7; lx += 8) {
            _pixelRect(oc, lx + (ly % 8 === 0 ? 0 : 4), ly, 1, 2, strawReedSh);
          }
        }
        _pixelRect(oc, bx, by, 5, bh, clothTape);
        _pixelRect(oc, bx + bw - 5, by, 5, bh, clothTape);

        for (let sy = by + 6; sy < by + bh - 6; sy += 10) {
          _pixelRect(oc, bx + 1, sy + 1, 3, 1, '#ffffff');
          _pixelRect(oc, bx + 2, sy, 1, 3, '#ffffff');
          _pixelRect(oc, bx + bw - 4, sy + 1, 3, 1, '#ffffff');
          _pixelRect(oc, bx + bw - 3, sy, 1, 3, '#ffffff');
        }
      } else {
        for (let lx = bx + 4; lx < bx + bw - 4; lx += 4) {
          _pixelRect(oc, lx, by + 5, 1, bh - 10, strawReedHi);
          _pixelRect(oc, lx + 1, by + 5, 1, bh - 10, strawReedSh);
          for (let ly = by + 7; ly < by + bh - 7; ly += 8) {
            _pixelRect(oc, lx, ly + (lx % 8 === 0 ? 0 : 4), 2, 1, strawReedSh);
          }
        }
        _pixelRect(oc, bx, by, bw, 5, clothTape);
        _pixelRect(oc, bx, by + bh - 5, bw, 5, clothTape);

        for (let sx = bx + 6; sx < bx + bw - 6; sx += 10) {
          _pixelRect(oc, sx + 1, by + 1, 3, 1, '#ffffff');
          _pixelRect(oc, sx + 2, by, 1, 3, '#ffffff');
          _pixelRect(oc, sx + 1, by + bh - 4, 3, 1, '#ffffff');
          _pixelRect(oc, sx + 2, by + bh - 3, 1, 3, '#ffffff');
        }
      }

      _pixelRect(oc, bx, by, 4, 4, '#7c2d12');
      _pixelRect(oc, bx + 1, by + 1, 2, 2, '#b45309');
    }
  }
}

// ─────────────────────────────────────────────
// PROCEDURAL OFFSCREEN CANVAS TEXTURE GENERATOR
// ─────────────────────────────────────────────

export function getOrCreateFloorCanvas(floorId, arena, isDark = false, fBleed = 4) {
  if (typeof document === 'undefined') return null;

  if (floorId === 'pvz_grass') {
    return getOrCreateGrassFloorCanvas(arena, isDark, fBleed);
  }

  const width = Math.max(64, Math.ceil(arena.width + fBleed * 2));
  const height = Math.max(64, Math.ceil(arena.height + fBleed * 2));
  const shape = arena.shape || 'rect';
  const key = `${floorId}_${width}_${height}_${shape}_${isDark ? 'dark' : 'light'}`;

  if (!state._arenaFloorCanvasCache) {
    state._arenaFloorCanvasCache = {};
  }
  if (state._arenaFloorCanvasCache[key]) {
    return state._arenaFloorCanvasCache[key];
  }

  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const oc = offCanvas.getContext('2d');
  if (!oc) return null;

  oc.imageSmoothingEnabled = false;

  const floorDef = ARENA_FLOORS.find(f => f.id === floorId) || ARENA_FLOORS[0];
  const targetTileSize = floorDef.gridSize || 76.6;
  const cols = Math.max(2, Math.round(arena.width / targetTileSize));
  const rows = Math.max(2, Math.round(arena.height / targetTileSize));
  const cellW = width / cols;
  const cellH = height / rows;

  switch (floorId) {
    case 'pvz_grass':
      _renderPixelPvzGrassFloor(oc, width, height, cols, rows, cellW, cellH, isDark);
      break;

    case 'clash_arena':
      _renderPixelClashFloor(oc, width, height, cols, rows, cellW, cellH, isDark);
      break;

    case 'checker_arcade':
      _renderPixelCheckerFloor(oc, width, height, cols, rows, cellW, cellH, isDark);
      break;

    case 'cyber_grid':
      _renderPixelCyberFloor(oc, width, height, cols, rows, cellW, cellH, isDark);
      break;

    case 'stone_dungeon':
      _renderPixelDungeonFloor(oc, width, height, cols, rows, cellW, cellH, isDark);
      break;

    case 'tatami_dojo':
      _renderPixelTatamiFloor(oc, width, height, cols, rows, cellW, cellH, isDark);
      break;

    case 'classic_clean':
    default:
      _renderPixelCleanFloor(oc, width, height, cols, rows, cellW, cellH, isDark);
      break;
  }

  state._arenaFloorCanvasCache[key] = offCanvas;
  return offCanvas;
}

// ─────────────────────────────────────────────
// GAMEPLAY RENDER INTEGRATION
// ─────────────────────────────────────────────

export function renderActiveArenaFloor(ctx, arena, isDark = false, fBleed = 4) {
  if (!ctx || !arena) return;

  const floorId = resolveActiveFloorId();
  const floorCanvas = getOrCreateFloorCanvas(floorId, arena, isDark, fBleed);

  if (!floorCanvas) {
    ctx.fillStyle = isDark ? '#000000' : (CONFIG.arenaInnerBgColor || '#ffffff');
    if (arena.shape === 'circle') {
      const cx = arena.x + arena.width / 2;
      const cy = arena.y + arena.height / 2;
      const ar = (arena.radius !== undefined ? arena.radius : (arena.width / 2)) + fBleed;
      ctx.beginPath();
      ctx.arc(cx, cy, ar, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(arena.x - fBleed, arena.y - fBleed, arena.width + fBleed * 2, arena.height + fBleed * 2);
    }
    return;
  }

  ctx.save();
  ctx.beginPath();
  if (arena.shape === 'circle') {
    const cx = arena.x + arena.width / 2;
    const cy = arena.y + arena.height / 2;
    const ar = (arena.radius !== undefined ? arena.radius : (arena.width / 2)) + fBleed;
    ctx.arc(cx, cy, ar, 0, Math.PI * 2);
  } else {
    ctx.rect(arena.x - fBleed, arena.y - fBleed, arena.width + fBleed * 2, arena.height + fBleed * 2);
  }
  ctx.clip();

  ctx.drawImage(floorCanvas, arena.x - fBleed, arena.y - fBleed);
  ctx.restore();
}

// ─────────────────────────────────────────────
// MINI PREVIEW GENERATOR FOR MODAL CARDS
// ─────────────────────────────────────────────

function getOrCreateMiniPreviewCanvas(floorDef, w, h) {
  const key = `${floorDef.id}_${w}x${h}`;
  if (_miniPreviewCache[key]) return _miniPreviewCache[key];

  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const oc = off.getContext('2d');
  if (!oc) return null;

  oc.imageSmoothingEnabled = false;

  const mockArena = { x: 0, y: 0, width: 460, height: 460, shape: 'rect' };
  const targetId = floorDef.id;
  const fullCanvas = getOrCreateFloorCanvas(targetId, mockArena, false, 0);

  if (fullCanvas) {
    oc.drawImage(fullCanvas, 0, 0, w, h);
  } else {
    oc.fillStyle = floorDef.themeColor;
    oc.fillRect(0, 0, w, h);
  }

  oc.strokeStyle = 'rgba(33, 5, 12, 0.4)';
  oc.lineWidth = 1.0;
  oc.strokeRect(0, 0, w, h);

  _miniPreviewCache[key] = off;
  return off;
}

// ─────────────────────────────────────────────
// UI SELECTOR BADGE (CHARACTER SELECT TOP BAR)
// ─────────────────────────────────────────────

export function drawArenaFloorSelector(ctx, x, y, w, h) {
  if (!ctx) return;

  const activeDef = ARENA_FLOORS.find(f => f.id === getSelectedArenaFloor()) || ARENA_FLOORS[0];
  const label = `${activeDef.icon} FLOOR: ${activeDef.shortName}`;

  ctx.save();
  // 3D Shadow
  ctx.fillStyle = '#baa88c';
  drawChamferedRect(ctx, x, y + 2, w, h, 3);
  ctx.fill();

  // Button Body
  ctx.fillStyle = '#faedf0';
  ctx.strokeStyle = activeDef.themeColor || '#21050c';
  ctx.lineWidth = 1.6;
  drawChamferedRect(ctx, x, y, w, h, 3);
  ctx.fill();
  ctx.stroke();

  // Accent Pip
  ctx.fillStyle = activeDef.themeColor || '#b81c3b';
  ctx.fillRect(x + 4, y + 2, 3, h - 4);

  // Text
  ctx.fillStyle = '#21050c';
  ctx.font = '900 9.5px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitSingleLineText(ctx, label, w - 12), x + w / 2 + 1, y + h / 2);
  ctx.restore();

  _registerButton(x, y, w, h + 2, () => {
    toggleArenaFloorModal();
    if (state.audioSystem?.playSFX) state.audioSystem.playSFX('skill_dash1', 0.25);
  });
}

// ─────────────────────────────────────────────
// ARENA FLOOR SELECTION MODAL
// ─────────────────────────────────────────────

export function drawArenaFloorModal(ctx) {
  if (!ctx || !state.canvas) return;

  const canvas = state.canvas;
  const modalW = Math.min(canvas.width - 24, 510);
  const modalH = 640;
  const mx = (canvas.width - modalW) / 2;
  const my = (canvas.height - modalH) / 2;

  // 1. Dark Backdrop Overlay
  ctx.save();
  ctx.fillStyle = 'rgba(33, 5, 12, 0.88)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Backdrop click closes modal
  _registerButton(0, 0, canvas.width, canvas.height, () => {
    closeArenaFloorModal();
  });

  // Panel Window Click Blocker
  _registerButton(mx, my, modalW, modalH, () => {});

  // 2. Outer Retro Window Panel
  drawPanel(mx, my, modalW, modalH, 0.98, 6, '#21050c');

  // Header Banner
  ctx.fillStyle = '#b81c3b';
  ctx.font = '900 10px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('ARENA ENVIRONMENT // CUSTOM FLOOR TILES // SYS.v3.0', mx + 18, my + 14);

  ctx.fillStyle = '#21050c';
  ctx.font = '900 14.5px "Outfit", "Rajdhani", sans-serif';
  ctx.fillText('CHOOSE ARENA FLOOR & TILES', mx + 18, my + 27);

  // Close Button (Top-Right "X")
  const closeBtnW = 24;
  const closeBtnH = 22;
  const closeBtnX = mx + modalW - closeBtnW - 16;
  const closeBtnY = my + 14;

  ctx.fillStyle = '#baa88c';
  drawChamferedRect(ctx, closeBtnX, closeBtnY + 2, closeBtnW, closeBtnH, 3);
  ctx.fill();

  ctx.fillStyle = '#faedf0';
  ctx.strokeStyle = '#21050c';
  ctx.lineWidth = 1.4;
  drawChamferedRect(ctx, closeBtnX, closeBtnY, closeBtnW, closeBtnH, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#b81c3b';
  ctx.font = '900 12px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✕', closeBtnX + closeBtnW / 2, closeBtnY + closeBtnH / 2);

  _registerButton(closeBtnX, closeBtnY, closeBtnW, closeBtnH + 2, () => {
    closeArenaFloorModal();
  });

  // Header Accent Line
  ctx.fillStyle = '#21050c';
  ctx.fillRect(mx + 18, my + 46, modalW - 36, 2);

  // 3. Floor Option Cards (2 Columns x 4 Rows)
  const cols = 2;
  const padX = 18;
  const gapX = 12;
  const gapY = 10;
  const cardW = Math.floor((modalW - padX * 2 - gapX) / cols); // ~225px
  const cardH = 126;
  const startCardsY = my + 56;

  const currentSelection = getSelectedArenaFloor();

  ARENA_FLOORS.forEach((floorDef, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = mx + padX + col * (cardW + gapX);
    const cy = startCardsY + row * (cardH + gapY);

    const isSelected = (currentSelection === floorDef.id);

    // Card 3D Shadow
    ctx.fillStyle = isSelected ? '#5e0d1f' : '#baa88c';
    drawChamferedRect(ctx, cx, cy + 3, cardW, cardH, 4);
    ctx.fill();

    // Card Background
    ctx.fillStyle = isSelected ? '#fff5f7' : '#faedf0';
    ctx.strokeStyle = isSelected ? '#b81c3b' : '#21050c';
    ctx.lineWidth = isSelected ? 2.0 : 1.4;
    drawChamferedRect(ctx, cx, cy, cardW, cardH, 4);
    ctx.fill();
    ctx.stroke();

    // Left Pip Accent Bar
    ctx.fillStyle = floorDef.themeColor;
    ctx.fillRect(cx + 4, cy + 4, 3.5, cardH - 8);

    // Mini Live Preview Box on Left
    const prevW = 46;
    const prevH = 46;
    const prevX = cx + 12;
    const prevY = cy + 12;

    const miniPreview = getOrCreateMiniPreviewCanvas(floorDef, prevW, prevH);
    if (miniPreview) {
      ctx.drawImage(miniPreview, prevX, prevY, prevW, prevH);
    }

    // Mini preview border
    ctx.strokeStyle = '#21050c';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(prevX, prevY, prevW, prevH);

    // Title & Icon on Right of Preview
    const textX = prevX + prevW + 8;
    const maxTextW = cardW - (textX - cx) - 8;

    ctx.fillStyle = isSelected ? '#b81c3b' : '#21050c';
    ctx.font = '900 11px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fitSingleLineText(ctx, `${floorDef.icon} ${floorDef.name}`, maxTextW), textX, cy + 12);

    // Feature Tag
    ctx.fillStyle = '#8b1524';
    ctx.font = '800 8px "Outfit", "Rajdhani", sans-serif';
    ctx.fillText(fitSingleLineText(ctx, floorDef.features, maxTextW), textX, cy + 28);

    // Equipped / Select Status Badge
    const statusY = cy + 42;
    ctx.fillStyle = isSelected ? '#b81c3b' : '#64748b';
    ctx.font = '900 8px "Press Start 2P", monospace';
    ctx.fillText(isSelected ? '★ EQUIPPED' : '○ SELECT', textX, statusY);

    // Description text across bottom
    ctx.fillStyle = '#21050c';
    ctx.font = '800 8.5px "Outfit", "Rajdhani", sans-serif';
    wrapText(ctx, floorDef.desc, cx + 12, cy + 66, cardW - 24, 11, 4);

    // Card Selection Click Handler
    _registerButton(cx, cy, cardW, cardH + 3, () => {
      setSelectedArenaFloor(floorDef.id);
      if (state.audioSystem?.playSFX) state.audioSystem.playSFX('skill_dash1', 0.3);
    });
  });

  // Footer Instructions
  const footY = my + modalH - 22;
  ctx.fillStyle = '#8b1524';
  ctx.font = '800 9px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CLICK ANY FLOOR TO EQUIP • SELECTION AUTOMATICALLY SAVED TO STORAGE', mx + modalW / 2, footY);

  ctx.restore();
}
