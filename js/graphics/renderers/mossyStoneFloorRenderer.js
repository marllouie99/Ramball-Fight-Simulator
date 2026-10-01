// ─────────────────────────────────────────────
// ANCIENT MOSSY STONE SLABS ARENA FLOOR RENDERER
// Sourced from Assets/model/Tiles/mossy-stone-tiles-sprite-sheet.png (1536 x 256)
// Features 6 high-detail mossy stone flagstone variants with authentic cracks,
// creeping moss, grass blades, solid stone underlay, and seamless interlocking.
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';

export const DEFAULT_MOSSY_STONE_TILE_RECTS = [
  { id: 'stone_cobble', sx: 0,   sy: 0, sw: 256, sh: 256 }, // Multi-block cobblestone flagstone slab (Zero grass)
  { id: 'stone_paver',  sx: 256, sy: 0, sw: 256, sh: 256 }  // 4-square carved stone paver slab (Zero grass)
];

// Natural alternating 36-tile distribution pool using exclusively the 2 grass-free stone tiles
const MOSSY_STONE_POOL = [
  0, 1, 0, 1, 0, 1,
  1, 0, 1, 0, 1, 0,
  0, 1, 0, 1, 0, 1,
  1, 0, 1, 0, 1, 0,
  0, 1, 0, 1, 0, 1,
  1, 0, 1, 0, 1, 0
];

let _mossyStoneSpriteImg = null;
let _mossyStoneSpriteLoading = false;

/**
 * Preloads the authentic Mossy Stone Tile sprite sheet.
 */
export function loadMossyStoneTileSpriteSheet() {
  if (_mossyStoneSpriteImg || _mossyStoneSpriteLoading) return;
  if (typeof Image === 'undefined') return;

  _mossyStoneSpriteLoading = true;
  _mossyStoneSpriteImg = new Image();
  _mossyStoneSpriteImg.onload = () => {
    _mossyStoneSpriteLoading = false;
    // Invalidate cached canvas when sprite finishes loading so it repaints in full crisp quality
    if (typeof state !== 'undefined' && state) {
      state._mossyStoneFloorCanvas = null;
      if (state._arenaFloorCanvasCache) {
        state._arenaFloorCanvasCache = {};
      }
    }
  };
  _mossyStoneSpriteImg.onerror = (e) => {
    console.warn('Failed to load Mossy Stone Tile sprite sheet at Assets/model/Tiles/mossy-stone-tiles-sprite-sheet.png', e);
    _mossyStoneSpriteLoading = false;
    _mossyStoneSpriteImg = null;
  };
  const src = 'Assets/model/Tiles/mossy-stone-tiles-sprite-sheet.png';
  _mossyStoneSpriteImg.src = encodeURI(`${src}?v=1`);
}

/**
 * Returns the loaded Mossy Stone Tile sprite sheet image if ready.
 */
export function getMossyStoneTileSpriteSheet() {
  if (_mossyStoneSpriteImg && _mossyStoneSpriteImg.complete && _mossyStoneSpriteImg.naturalWidth > 0) {
    return _mossyStoneSpriteImg;
  }
  if (!_mossyStoneSpriteLoading && typeof Image !== 'undefined') {
    loadMossyStoneTileSpriteSheet();
  }
  return _mossyStoneSpriteImg;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getMossyStoneTileSpriteSheet();
}

/**
 * Retrieves or builds an axis-aligned cached offscreen canvas containing mossy stone tiles.
 * 1. Fills arena with solid earthy stone underlay (zero transparent seams or black lines).
 * 2. Overlays high-detail mossy stone sprite tiles with seamless interlocking.
 */
export function getOrCreateMossyStoneFloorCanvas(arena, isDark = false, fBleed = 0) {
  if (typeof document === 'undefined') return null;

  const width = Math.max(64, Math.ceil(arena.width + fBleed * 2));
  const height = Math.max(64, Math.ceil(arena.height + fBleed * 2));
  const shape = arena.shape || 'rect';
  const key = `${width}_${height}_${shape}_${isDark ? 'dark' : 'light'}`;

  const stoneImg = getMossyStoneTileSpriteSheet();
  const imgLoaded = Boolean(stoneImg && stoneImg.complete && stoneImg.naturalWidth > 0);
  const fullKey = `${key}_${imgLoaded ? 'loaded' : 'fallback'}`;

  if (state._mossyStoneFloorCanvas && state._mossyStoneFloorCanvas._key === fullKey) {
    return state._mossyStoneFloorCanvas;
  }

  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const oc = offCanvas.getContext('2d');
  if (!oc) return null;

  oc.imageSmoothingEnabled = true;

  const targetTileSize = 76.6;
  const cols = arena.cols || Math.max(3, Math.round(arena.width / targetTileSize));
  const rows = arena.rows || Math.max(3, Math.round(arena.height / targetTileSize));
  const cellW = width / cols;
  const cellH = height / rows;

  // 1. Solid Earthy Stone Underlay Base
  const baseA = isDark ? '#14181a' : '#332f2a';
  const baseB = isDark ? '#0f1214' : '#27231e';
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

  // 2. High-Detail Mossy Stone Tiles Overlay
  if (imgLoaded) {
    const overlap = 2; // Bleed for seamless interlocking of grass tufts & stone edges
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const poolIdx = (r * cols + c) % MOSSY_STONE_POOL.length;
        const tileIdx = MOSSY_STONE_POOL[poolIdx];
        const rect = DEFAULT_MOSSY_STONE_TILE_RECTS[tileIdx] || DEFAULT_MOSSY_STONE_TILE_RECTS[0];

        const dx = Math.floor(c * cellW) - overlap;
        const dy = Math.floor(r * cellH) - overlap;
        const dw = Math.ceil(cellW) + overlap * 2;
        const dh = Math.ceil(cellH) + overlap * 2;

        oc.drawImage(stoneImg, rect.sx, rect.sy, rect.sw, rect.sh, dx, dy, dw, dh);
      }
    }

    if (isDark) {
      // Midnight moonlight / shadow overlay tint
      oc.save();
      oc.fillStyle = 'rgba(10, 16, 24, 0.45)';
      oc.fillRect(0, 0, width, height);
      oc.restore();
    }
  } else {
    // Procedural stone flagstone fallback with green moss patches while image is loading
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = Math.floor(c * cellW);
        const by = Math.floor(r * cellH);
        const bw = Math.ceil(cellW);
        const bh = Math.ceil(cellH);

        // Stone body
        oc.fillStyle = isDark ? '#2e3440' : '#b8b2a7';
        oc.fillRect(bx + 1, by + 1, bw - 2, bh - 2);

        // Cracks
        oc.fillStyle = isDark ? '#14181f' : '#4a4439';
        oc.fillRect(bx + Math.round(bw * 0.25), by + Math.round(bh * 0.3), Math.round(bw * 0.5), 2);
        oc.fillRect(bx + Math.round(bw * 0.4), by + Math.round(bh * 0.3), 2, Math.round(bh * 0.4));

        // Moss tufts
        oc.fillStyle = isDark ? '#166534' : '#4ade80';
        oc.fillRect(bx + 2, by + 2, 8, 8);
        oc.fillStyle = isDark ? '#22c55e' : '#86efac';
        oc.fillRect(bx + 4, by + 1, 4, 4);
      }
    }
  }

  offCanvas._key = fullKey;
  state._mossyStoneFloorCanvas = offCanvas;
  return offCanvas;
}

/**
 * Renders the Mossy Stone Tiles arena floor onto the provided canvas 2D context.
 */
export function renderMossyStoneFloor(ctx, arena, isDark = false, fBleed = 0) {
  if (!ctx || !arena) return;

  const floorCanvas = getOrCreateMossyStoneFloorCanvas(arena, isDark, fBleed);
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
