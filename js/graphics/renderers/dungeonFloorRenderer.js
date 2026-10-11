// ─────────────────────────────────────────────
// DUNGEON SLABS ARENA FLOOR RENDERER
// Sourced from Assets/model/Sprites/dungeon-tile-sprite-sheet.png (2172 x 724)
// Features pixel-perfect source rect cropping (1 row of 6 dungeon tile variants),
// solid dark mortar underlay, seamless tile interlocking, iron sewer grates, moss, and rubble masonry.
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { ARENA_TILE_COUNT } from '../../systems/arenaTileGrid.js';

// Pre-computed default frame bounding boxes from dungeon-tile-sprite-sheet.png (2172x724)
export const DEFAULT_DUNGEON_TILE_RECTS = [
  { id: 'dungeon_1', sx: 13,   sy: 177, sw: 337, sh: 330 }, // Plain stone flagstones
  { id: 'dungeon_2', sx: 376,  sy: 177, sw: 337, sh: 329 }, // Cracked stone slab + chunk
  { id: 'dungeon_3', sx: 740,  sy: 177, sw: 334, sh: 329 }, // Mortared quadrant slabs
  { id: 'dungeon_4', sx: 1100, sy: 177, sw: 336, sh: 329 }, // Rubble & broken masonry
  { id: 'dungeon_5', sx: 1462, sy: 177, sw: 336, sh: 329 }, // Mossy creeping flagstone
  { id: 'dungeon_6', sx: 1823, sy: 177, sw: 337, sh: 329 }  // Iron drain sewer grate
];

// 36-variant natural distribution pool for non-corner tiles (0..4: plain, cracks, mortared, rubble, moss)
const NON_CORNER_DUNGEON_POOL = [
  0, 1, 4, 2, 3, 0,
  2, 4, 0, 3, 1, 4,
  1, 0, 3, 4, 2, 1,
  4, 2, 0, 1, 3, 2,
  3, 1, 2, 0, 4, 3,
  0, 3, 4, 2, 1, 0
];

let _dungeonTileSpriteImg = null;
let _dungeonTileSpriteLoading = false;

/**
 * Preloads the authentic Dungeon Tile sprite sheet.
 */
export function loadDungeonTileSpriteSheet() {
  if (_dungeonTileSpriteImg || _dungeonTileSpriteLoading) return;
  if (typeof Image === 'undefined') return;

  _dungeonTileSpriteLoading = true;
  _dungeonTileSpriteImg = new Image();
  _dungeonTileSpriteImg.onload = () => {
    _dungeonTileSpriteLoading = false;
    // Invalidate cached dungeon canvas when sprite finishes loading so it repaints in full crisp quality
    if (typeof state !== 'undefined' && state) {
      state._dungeonFloorCanvas = null;
      if (state._arenaFloorCanvasCache) {
        state._arenaFloorCanvasCache = {};
      }
    }
  };
  _dungeonTileSpriteImg.onerror = (e) => {
    console.warn('Failed to load Dungeon Tile sprite sheet at Assets/model/Tiles/dungeon-tile-sprite-sheet.png', e);
    _dungeonTileSpriteLoading = false;
    _dungeonTileSpriteImg = null;
  };
  const src = 'Assets/model/Tiles/dungeon-tile-sprite-sheet.png';
  _dungeonTileSpriteImg.src = encodeURI(`${src}?v=2`);
}

/**
 * Returns the loaded Dungeon Tile sprite sheet image if ready.
 */
export function getDungeonTileSpriteSheet() {
  if (_dungeonTileSpriteImg && _dungeonTileSpriteImg.complete && _dungeonTileSpriteImg.naturalWidth > 0) {
    return _dungeonTileSpriteImg;
  }
  if (!_dungeonTileSpriteLoading && typeof Image !== 'undefined') {
    loadDungeonTileSpriteSheet();
  }
  return _dungeonTileSpriteImg;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getDungeonTileSpriteSheet();
}

/**
 * Retrieves or builds an axis-aligned cached offscreen canvas containing scaled dungeon stone tiles.
 * 1. Fills arena with solid deep mortar underlay (zero transparent seams or black lines).
 * 2. Positions iron sewer grate tiles (Tile 6) EXCLUSIVELY at the 4 arena corners.
 * 3. Overlays pixel-perfect cropped dungeon sprite tiles with subtle edge interlocking.
 */
export function getOrCreateDungeonFloorCanvas(arena, isDark = false, fBleed = 0) {
  if (typeof document === 'undefined') return null;

  const width = Math.max(64, Math.ceil(arena.width + fBleed * 2));
  const height = Math.max(64, Math.ceil(arena.height + fBleed * 2));
  const shape = arena.shape || 'rect';
  const key = `${width}_${height}_${shape}_${isDark ? 'dark' : 'light'}`;

  const dungeonImg = getDungeonTileSpriteSheet();
  const imgLoaded = Boolean(dungeonImg && dungeonImg.complete && dungeonImg.naturalWidth > 0);
  const fullKey = `${key}_${imgLoaded ? 'loaded' : 'fallback'}`;

  if (state._dungeonFloorCanvas && state._dungeonFloorCanvas._key === fullKey) {
    return state._dungeonFloorCanvas;
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

  // 1. Solid Deep Mortar Underlay Base (100% gapless dark stone mortar)
  const baseA = isDark ? '#090a0f' : '#1c1e24';
  const baseB = isDark ? '#050608' : '#14151a';
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

  // 2. Authentic Dungeon Tiles Sprite Sheet Overlay
  if (imgLoaded) {
    const overlap = 1; // Subtle bleed so heavy stone borders interlock seamlessly
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // 4 Corners strictly receive the iron sewer grate tile (index 5)
        const isCorner = (r === 0 || r === rows - 1) && (c === 0 || c === cols - 1);
        let tileIdx;
        if (isCorner) {
          tileIdx = 5; // Iron grate tile (dungeon_6)
        } else {
          const poolIdx = (r * cols + c) % NON_CORNER_DUNGEON_POOL.length;
          tileIdx = NON_CORNER_DUNGEON_POOL[poolIdx]; // Strictly 0..4 (plain, cracked, mortared, rubble, moss)
        }

        const rect = DEFAULT_DUNGEON_TILE_RECTS[tileIdx] || DEFAULT_DUNGEON_TILE_RECTS[0];

        const dx = Math.floor(c * cellW) - overlap;
        const dy = Math.floor(r * cellH) - overlap;
        const dw = Math.ceil(cellW) + overlap * 2;
        const dh = Math.ceil(cellH) + overlap * 2;

        oc.drawImage(dungeonImg, rect.sx, rect.sy, rect.sw, rect.sh, dx, dy, dw, dh);
      }
    }

    if (isDark) {
      // Dark torchlight / obsidian shadow tint
      oc.save();
      oc.fillStyle = 'rgba(5, 7, 12, 0.45)';
      oc.fillRect(0, 0, width, height);
      oc.restore();
    }
  } else {
    // Procedural stone flagstone fallback while image is loading
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = Math.floor(c * cellW);
        const by = Math.floor(r * cellH);
        const bw = Math.ceil(cellW);
        const bh = Math.ceil(cellH);
        const isCorner = (r === 0 || r === rows - 1) && (c === 0 || c === cols - 1);

        // Stone bevel highlights
        oc.fillStyle = isDark ? '#3f3f46' : '#71717a';
        oc.fillRect(bx + 1, by + 1, bw - 2, 2);
        oc.fillRect(bx + 1, by + 1, 2, bh - 2);

        // Stone bevel shadows
        oc.fillStyle = isDark ? '#09090b' : '#18181b';
        oc.fillRect(bx + 1, by + bh - 3, bw - 2, 2);
        oc.fillRect(bx + bw - 3, by + 1, 2, bh - 2);

        if (isCorner) {
          // Sewer Grate on corners
          const gx = bx + Math.round(bw * 0.52);
          const gy = by + Math.round(bh * 0.52);
          const gw = Math.round(bw * 0.40);
          const gh = Math.round(bh * 0.40);
          oc.fillStyle = '#09090b';
          oc.fillRect(gx, gy, gw, gh);
          oc.fillStyle = isDark ? '#475569' : '#64748b';
          for (let barX = gx + 3; barX < gx + gw - 2; barX += 4) {
            oc.fillRect(barX, gy + 2, 2, gh - 4);
          }
        } else {
          // Flagstone cracks
          oc.fillStyle = '#09090b';
          oc.fillRect(bx + Math.round(bw * 0.3), by + Math.round(bh * 0.3), 8, 2);
          oc.fillRect(bx + Math.round(bw * 0.4), by + Math.round(bh * 0.32), 2, 6);
        }
      }
    }
  }

  offCanvas._key = fullKey;
  state._dungeonFloorCanvas = offCanvas;
  return offCanvas;
}

/**
 * Renders the Dungeon Tiles arena floor onto the provided canvas 2D context.
 */
export function renderDungeonFloor(ctx, arena, isDark = false, fBleed = 0) {
  if (!ctx || !arena) return;

  const floorCanvas = getOrCreateDungeonFloorCanvas(arena, isDark, fBleed);
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
