// ─────────────────────────────────────────────
// SAND BEACH TILES ARENA FLOOR RENDERER
// Sourced from Assets/model/Sprites/sand-beach-tiles-sprite-sheet.png (2172 x 724)
// Features pixel-perfect source rect cropping (1 row of 6 sand tile variants),
// solid warm beach underlay, seamless tile interlocking, and authentic pixel pebbles/dune striations.
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';

// Pre-computed default frame bounding boxes from sand-beach-tiles-sprite-sheet.png (2172x724)
export const DEFAULT_SAND_TILE_RECTS = [
  { id: 'sand_1', sx: 16,   sy: 198, sw: 346, sh: 332 },
  { id: 'sand_2', sx: 382,  sy: 197, sw: 342, sh: 333 },
  { id: 'sand_3', sx: 724,  sy: 197, sw: 362, sh: 333 },
  { id: 'sand_4', sx: 1086, sy: 197, sw: 362, sh: 333 },
  { id: 'sand_5', sx: 1465, sy: 197, sw: 345, sh: 333 },
  { id: 'sand_6', sx: 1810, sy: 198, sw: 354, sh: 332 }
];

// 36-variant natural distribution pool for 6x6 arena grid (ensures non-repeating adjacent tiles)
const ALL_SAND_VARIANTS_POOL = [
  0, 2, 4, 1, 3, 5,
  3, 5, 0, 4, 2, 1,
  1, 0, 3, 5, 4, 2,
  4, 2, 5, 0, 1, 3,
  5, 3, 1, 2, 0, 4,
  2, 4, 0, 3, 5, 1
];

let _sandTileSpriteImg = null;
let _sandTileSpriteLoading = false;

/**
 * Preloads the authentic Sand Beach Tiles sprite sheet.
 */
export function loadSandTileSpriteSheet() {
  if (_sandTileSpriteImg || _sandTileSpriteLoading) return;
  if (typeof Image === 'undefined') return;

  _sandTileSpriteLoading = true;
  _sandTileSpriteImg = new Image();
  _sandTileSpriteImg.onload = () => {
    _sandTileSpriteLoading = false;
    // Invalidate cached sand canvas when sprite finishes loading so it repaints in full crisp quality
    if (typeof state !== 'undefined' && state) {
      state._sandBeachFloorCanvas = null;
      if (state._arenaFloorCanvasCache) {
        state._arenaFloorCanvasCache = {};
      }
    }
  };
  _sandTileSpriteImg.onerror = (e) => {
    console.warn('Failed to load Sand Beach Tiles sprite sheet at Assets/model/Tiles/sand-beach-tiles-sprite-sheet.png', e);
    _sandTileSpriteLoading = false;
    _sandTileSpriteImg = null;
  };
  const src = 'Assets/model/Tiles/sand-beach-tiles-sprite-sheet.png';
  _sandTileSpriteImg.src = encodeURI(`${src}?v=1`);
}

/**
 * Returns the loaded Sand Beach Tiles sprite sheet image if ready.
 */
export function getSandTileSpriteSheet() {
  if (_sandTileSpriteImg && _sandTileSpriteImg.complete && _sandTileSpriteImg.naturalWidth > 0) {
    return _sandTileSpriteImg;
  }
  if (!_sandTileSpriteLoading && typeof Image !== 'undefined') {
    loadSandTileSpriteSheet();
  }
  return _sandTileSpriteImg;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getSandTileSpriteSheet();
}

/**
 * Retrieves or builds an axis-aligned cached offscreen canvas containing scaled sand beach tiles.
 * 1. Fills arena with solid warm tropical sand underlay (zero black gaps or transparent seams).
 * 2. Overlays pixel-perfect cropped sand beach sprite tiles with subtle edge interlocking.
 */
export function getOrCreateSandBeachFloorCanvas(arena, isDark = false, fBleed = 0) {
  if (typeof document === 'undefined') return null;

  const width = Math.max(64, Math.ceil(arena.width + fBleed * 2));
  const height = Math.max(64, Math.ceil(arena.height + fBleed * 2));
  const shape = arena.shape || 'rect';
  const key = `${width}_${height}_${shape}_${isDark ? 'dark' : 'light'}`;

  const sandImg = getSandTileSpriteSheet();
  const imgLoaded = Boolean(sandImg && sandImg.complete && sandImg.naturalWidth > 0);
  const fullKey = `${key}_${imgLoaded ? 'loaded' : 'fallback'}`;

  if (state._sandBeachFloorCanvas && state._sandBeachFloorCanvas._key === fullKey) {
    return state._sandBeachFloorCanvas;
  }

  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const oc = offCanvas.getContext('2d');
  if (!oc) return null;

  oc.imageSmoothingEnabled = false;

  const targetTileSize = 76.6;
  const cols = arena.cols || Math.max(3, Math.round(arena.width / targetTileSize));
  const rows = arena.rows || Math.max(3, Math.round(arena.height / targetTileSize));
  const cellW = width / cols;
  const cellH = height / rows;

  // 1. Solid Warm Sand Underlay Base (100% gapless tropical gold/tan)
  const baseA = isDark ? '#1e293b' : '#e6b96e';
  const baseB = isDark ? '#0f172a' : '#d8a95c';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isAlt = ((r + c) % 2 === 0);
      oc.fillStyle = isAlt ? baseA : baseB;
      oc.fillRect(
        Math.floor(c * cellW),
        Math.floor(r * cellH),
        Math.ceil(cellW + 1),
        Math.ceil(cellH + 1)
      );
    }
  }

  // 2. Authentic Sand Beach Tiles Sprite Sheet Overlay
  if (imgLoaded) {
    const overlap = 1; // Subtle bleed so tile stitches and perimeter borders interlock seamlessly
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const gridIndex = (r * cols + c) % ALL_SAND_VARIANTS_POOL.length;
        const tileIdx = ALL_SAND_VARIANTS_POOL[gridIndex];
        const rect = DEFAULT_SAND_TILE_RECTS[tileIdx] || DEFAULT_SAND_TILE_RECTS[0];

        const dx = Math.floor(c * cellW) - overlap;
        const dy = Math.floor(r * cellH) - overlap;
        const dw = Math.ceil(cellW) + overlap * 2;
        const dh = Math.ceil(cellH) + overlap * 2;

        oc.drawImage(sandImg, rect.sx, rect.sy, rect.sw, rect.sh, dx, dy, dw, dh);
      }
    }

    if (isDark) {
      // Apply dark moonlit overlay tint
      oc.save();
      oc.fillStyle = 'rgba(15, 23, 42, 0.45)';
      oc.fillRect(0, 0, width, height);
      oc.restore();
    }
  } else {
    // Procedural sand tile fallback while image is loading
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = Math.floor(c * cellW);
        const by = Math.floor(r * cellH);
        const bw = Math.ceil(cellW);
        const bh = Math.ceil(cellH);

        // Tile bevel highlights
        oc.fillStyle = isDark ? '#334155' : '#fef08a';
        oc.fillRect(bx + 1, by + 1, bw - 2, 2);
        oc.fillRect(bx + 1, by + 1, 2, bh - 2);

        // Tile bevel shadows
        oc.fillStyle = isDark ? '#020617' : '#b45309';
        oc.fillRect(bx + 1, by + bh - 3, bw - 2, 2);
        oc.fillRect(bx + bw - 3, by + 1, 2, bh - 2);

        // Pebbles
        oc.fillStyle = isDark ? '#475569' : '#78716c';
        oc.fillRect(bx + Math.round(bw * 0.25), by + Math.round(bh * 0.35), 4, 3);
        oc.fillRect(bx + Math.round(bw * 0.75), by + Math.round(bh * 0.70), 3, 3);
      }
    }
  }

  offCanvas._key = fullKey;
  state._sandBeachFloorCanvas = offCanvas;
  return offCanvas;
}

/**
 * Renders the Sand Beach Tiles arena floor onto the provided canvas 2D context.
 */
export function renderSandBeachFloor(ctx, arena, isDark = false, fBleed = 0) {
  if (!ctx || !arena) return;

  const floorCanvas = getOrCreateSandBeachFloorCanvas(arena, isDark, fBleed);
  if (!floorCanvas) return;

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
  ctx.drawImage(floorCanvas, arena.x - fBleed, arena.y - fBleed, arena.width + fBleed * 2, arena.height + fBleed * 2);
  ctx.restore();
}
