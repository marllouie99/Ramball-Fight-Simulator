// ─────────────────────────────────────────────
// MINECRAFT END STONE ARENA FLOOR RENDERER
// Sourced from Assets/model/Sprites/end-stone-tile.png (192 x 192)
// Features pixel-perfect 16x16 Minecraft End Stone texture,
// solid pale cream underlay, seamless tile interlocking, and obsidian/void tinting in dark mode.
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { ARENA_TILE_COUNT } from '../../systems/arenaTileGrid.js';

let _endStoneTileImg = null;
let _endStoneTileLoading = false;

/**
 * Preloads the authentic Minecraft End Stone Tile sprite.
 */
export function loadEndStoneTileSprite() {
  if (_endStoneTileImg || _endStoneTileLoading) return;
  if (typeof Image === 'undefined') return;

  _endStoneTileLoading = true;
  _endStoneTileImg = new Image();
  _endStoneTileImg.onload = () => {
    _endStoneTileLoading = false;
    // Invalidate cached canvas when sprite finishes loading so it repaints in full crisp quality
    if (typeof state !== 'undefined' && state) {
      state._endStoneFloorCanvas = null;
      if (state._arenaFloorCanvasCache) {
        state._arenaFloorCanvasCache = {};
      }
    }
  };
  _endStoneTileImg.onerror = (e) => {
    console.warn('Failed to load End Stone Tile at Assets/model/Tiles/end-stone-tile.png', e);
    _endStoneTileLoading = false;
    _endStoneTileImg = null;
  };
  const src = 'Assets/model/Tiles/end-stone-tile.png';
  _endStoneTileImg.src = encodeURI(`${src}?v=1`);
}

/**
 * Returns the loaded End Stone Tile sprite image if ready.
 */
export function getEndStoneTileSprite() {
  if (_endStoneTileImg && _endStoneTileImg.complete && _endStoneTileImg.naturalWidth > 0) {
    return _endStoneTileImg;
  }
  if (!_endStoneTileLoading && typeof Image !== 'undefined') {
    loadEndStoneTileSprite();
  }
  return _endStoneTileImg;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getEndStoneTileSprite();
}

/**
 * Retrieves or builds an axis-aligned cached offscreen canvas containing tiled Minecraft End Stone.
 * 1. Fills arena with solid pale End Stone underlay (zero transparent seams or black lines).
 * 2. Overlays pixel-perfect 16x16 Minecraft End Stone texture tiles with subtle edge interlocking.
 */
export function getOrCreateEndStoneFloorCanvas(arena, isDark = false, fBleed = 0) {
  if (typeof document === 'undefined') return null;

  const width = Math.max(64, Math.ceil(arena.width + fBleed * 2));
  const height = Math.max(64, Math.ceil(arena.height + fBleed * 2));
  const shape = arena.shape || 'rect';
  const key = `${width}_${height}_${shape}_${isDark ? 'dark' : 'light'}`;

  const stoneImg = getEndStoneTileSprite();
  const imgLoaded = Boolean(stoneImg && stoneImg.complete && stoneImg.naturalWidth > 0);
  const fullKey = `${key}_${imgLoaded ? 'loaded' : 'fallback'}`;

  if (state._endStoneFloorCanvas && state._endStoneFloorCanvas._key === fullKey) {
    return state._endStoneFloorCanvas;
  }

  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const oc = offCanvas.getContext('2d');
  if (!oc) return null;

  oc.imageSmoothingEnabled = false;

  const cols = ARENA_TILE_COUNT;
  const rows = ARENA_TILE_COUNT;
  const cellW = width / cols;
  const cellH = height / rows;

  // 1. Solid Pale End Stone Underlay Base
  const baseA = isDark ? '#1a1820' : '#e6dfa8';
  const baseB = isDark ? '#121018' : '#ded599';
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

  // 2. Authentic Minecraft End Stone Texture Overlay
  if (imgLoaded) {
    const overlap = 1; // Subtle bleed so tile stitches interlock seamlessly
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dx = Math.floor(c * cellW) - overlap;
        const dy = Math.floor(r * cellH) - overlap;
        const dw = Math.ceil(cellW) + overlap * 2;
        const dh = Math.ceil(cellH) + overlap * 2;

        oc.drawImage(stoneImg, 0, 0, stoneImg.naturalWidth, stoneImg.naturalHeight, dx, dy, dw, dh);
      }
    }

    if (isDark) {
      // Obsidian End dimension void overlay tint
      oc.save();
      oc.fillStyle = 'rgba(20, 10, 32, 0.45)';
      oc.fillRect(0, 0, width, height);
      oc.restore();
    }
  } else {
    // Procedural End Stone fallback while image is loading
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = Math.floor(c * cellW);
        const by = Math.floor(r * cellH);
        const bw = Math.ceil(cellW);
        const bh = Math.ceil(cellH);

        // Speckled dark olive pits
        oc.fillStyle = isDark ? '#2e2a3b' : '#9ca368';
        oc.fillRect(bx + Math.round(bw * 0.2), by + Math.round(bh * 0.2), 6, 6);
        oc.fillRect(bx + Math.round(bw * 0.6), by + Math.round(bh * 0.3), 8, 5);
        oc.fillRect(bx + Math.round(bw * 0.3), by + Math.round(bh * 0.7), 7, 6);
        oc.fillRect(bx + Math.round(bw * 0.75), by + Math.round(bh * 0.65), 5, 5);

        // Pale highlights
        oc.fillStyle = isDark ? '#4a445e' : '#fef9c3';
        oc.fillRect(bx + Math.round(bw * 0.2) + 1, by + Math.round(bh * 0.2) - 2, 4, 2);
        oc.fillRect(bx + Math.round(bw * 0.6) + 1, by + Math.round(bh * 0.3) - 2, 5, 2);
      }
    }
  }

  offCanvas._key = fullKey;
  state._endStoneFloorCanvas = offCanvas;
  return offCanvas;
}

/**
 * Renders the End Stone Tiles arena floor onto the provided canvas 2D context.
 */
export function renderEndStoneFloor(ctx, arena, isDark = false, fBleed = 0) {
  if (!ctx || !arena) return;

  const floorCanvas = getOrCreateEndStoneFloorCanvas(arena, isDark, fBleed);
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
