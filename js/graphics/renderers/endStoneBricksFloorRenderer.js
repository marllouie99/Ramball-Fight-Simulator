// ─────────────────────────────────────────────
// MINECRAFT END STONE BRICKS ARENA FLOOR RENDERER
// Sourced from Assets/model/Tiles/end-stone-bricks-tile.png
// Features authentic 16x16 Minecraft End Stone Bricks texture,
// pale yellowish-tan brick courses with dark olive mortar grooves,
// and subtle obsidian void tinting in dark mode.
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';

let _endStoneBricksTileImg = null;
let _endStoneBricksTileLoading = false;

/**
 * Preloads the authentic Minecraft End Stone Bricks Tile sprite.
 */
export function loadEndStoneBricksTileSprite() {
  if (_endStoneBricksTileImg || _endStoneBricksTileLoading) return;
  if (typeof Image === 'undefined') return;

  _endStoneBricksTileLoading = true;
  _endStoneBricksTileImg = new Image();
  _endStoneBricksTileImg.onload = () => {
    _endStoneBricksTileLoading = false;
    // Invalidate cached canvas when sprite finishes loading so it repaints in full crisp quality
    if (typeof state !== 'undefined' && state) {
      state._endStoneBricksFloorCanvas = null;
      if (state._arenaFloorCanvasCache) {
        state._arenaFloorCanvasCache = {};
      }
    }
  };
  _endStoneBricksTileImg.onerror = (e) => {
    console.warn('Failed to load End Stone Bricks Tile at Assets/model/Tiles/end-stone-bricks-tile.png', e);
    _endStoneBricksTileLoading = false;
    _endStoneBricksTileImg = null;
  };
  const src = 'Assets/model/Tiles/end-stone-bricks-tile.png';
  _endStoneBricksTileImg.src = encodeURI(`${src}?v=1`);
}

/**
 * Returns the loaded End Stone Bricks Tile sprite image if ready.
 */
export function getEndStoneBricksTileSprite() {
  if (_endStoneBricksTileImg && _endStoneBricksTileImg.complete && _endStoneBricksTileImg.naturalWidth > 0) {
    return _endStoneBricksTileImg;
  }
  if (!_endStoneBricksTileLoading && typeof Image !== 'undefined') {
    loadEndStoneBricksTileSprite();
  }
  return _endStoneBricksTileImg;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getEndStoneBricksTileSprite();
}

/**
 * Retrieves or builds an axis-aligned cached offscreen canvas containing tiled Minecraft End Stone Bricks.
 * 1. Fills arena with solid pale End Stone underlay (zero transparent seams or black lines).
 * 2. Overlays authentic 16x16 Minecraft End Stone Bricks texture tiles with seamless interlocking.
 */
export function getOrCreateEndStoneBricksFloorCanvas(arena, isDark = false, fBleed = 0) {
  if (typeof document === 'undefined') return null;

  const width = Math.max(64, Math.ceil(arena.width + fBleed * 2));
  const height = Math.max(64, Math.ceil(arena.height + fBleed * 2));
  const shape = arena.shape || 'rect';
  const key = `${width}_${height}_${shape}_${isDark ? 'dark' : 'light'}`;

  const brickImg = getEndStoneBricksTileSprite();
  const imgLoaded = Boolean(brickImg && brickImg.complete && brickImg.naturalWidth > 0);
  const fullKey = `${key}_${imgLoaded ? 'loaded' : 'fallback'}`;

  if (state._endStoneBricksFloorCanvas && state._endStoneBricksFloorCanvas._key === fullKey) {
    return state._endStoneBricksFloorCanvas;
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

  // 2. Authentic Minecraft End Stone Bricks Texture Overlay
  if (imgLoaded) {
    const overlap = 1; // Subtle bleed so tile stitches interlock seamlessly
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dx = Math.floor(c * cellW) - overlap;
        const dy = Math.floor(r * cellH) - overlap;
        const dw = Math.ceil(cellW) + overlap * 2;
        const dh = Math.ceil(cellH) + overlap * 2;

        oc.drawImage(brickImg, 0, 0, brickImg.naturalWidth, brickImg.naturalHeight, dx, dy, dw, dh);
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
    // Procedural End Stone Bricks fallback while image is loading
    const mortar = isDark ? '#1e1c24' : '#5c5836';
    const brickLight = isDark ? '#3d384c' : '#ede8be';
    const brickDark = isDark ? '#2a2635' : '#c9c38f';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = Math.floor(c * cellW);
        const by = Math.floor(r * cellH);
        const bw = Math.ceil(cellW);
        const bh = Math.ceil(cellH);

        // Mortar grid
        oc.fillStyle = mortar;
        oc.fillRect(bx, by, bw, bh);

        // 4 Horizontal Brick Rows
        const rowH = bh / 4;
        for (let br = 0; br < 4; br++) {
          const ry = by + br * rowH;
          const isStaggered = (br % 2 === 1);
          const brickW = bw / 2;

          if (isStaggered) {
            // Half brick, full brick, half brick
            oc.fillStyle = brickLight;
            oc.fillRect(bx + 1, ry + 1, brickW / 2 - 2, rowH - 2);
            oc.fillRect(bx + brickW / 2 + 1, ry + 1, brickW - 2, rowH - 2);
            oc.fillRect(bx + brickW * 1.5 + 1, ry + 1, brickW / 2 - 2, rowH - 2);
          } else {
            // Two full bricks
            oc.fillStyle = brickDark;
            oc.fillRect(bx + 1, ry + 1, brickW - 2, rowH - 2);
            oc.fillRect(bx + brickW + 1, ry + 1, brickW - 2, rowH - 2);
          }
        }
      }
    }
  }

  offCanvas._key = fullKey;
  state._endStoneBricksFloorCanvas = offCanvas;
  return offCanvas;
}

/**
 * Renders the End Stone Bricks Tiles arena floor onto the provided canvas 2D context.
 */
export function renderEndStoneBricksFloor(ctx, arena, isDark = false, fBleed = 0) {
  if (!ctx || !arena) return;

  const floorCanvas = getOrCreateEndStoneBricksFloorCanvas(arena, isDark, fBleed);
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
