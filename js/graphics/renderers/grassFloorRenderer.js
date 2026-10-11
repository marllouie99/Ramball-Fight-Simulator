// CRAZY DAVE PVZ GRASS TILES ARENA FLOOR RENDERER
// Sourced from Assets/model/Sprites/Grass-tiles-sprite-sheet.png (1536 x 1024)
// Features pixel-perfect source rect cropping (2 rows of 6 tiles), solid PvZ checkerboard underlay,
// and seamless scale-fitting across the battle arena matching tactical bush sprite precision.

import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { ARENA_TILE_COUNT } from '../../systems/arenaTileGrid.js';

// Pre-computed default frame bounding boxes from Grass-tiles-sprite-sheet.png (1536x1024)
export const DEFAULT_GRASS_TILE_RECTS = [
  // Row 0 (Y: 230..505, Height: 276)
  { id: 'plain_1',   sx: 15,   sy: 230, sw: 239, sh: 276 },
  { id: 'daisy_1',   sx: 268,  sy: 230, sw: 243, sh: 276 },
  { id: 'clover_1',  sx: 524,  sy: 230, sw: 237, sh: 276 },
  { id: 'yellow_1',  sx: 775,  sy: 230, sw: 237, sh: 276 },
  { id: 'dirt_1',    sx: 1025, sy: 230, sw: 242, sh: 276 },
  { id: 'sunbeam_1', sx: 1281, sy: 230, sw: 241, sh: 276 },
  // Row 1 (Y: 533..807, Height: 275)
  { id: 'plain_2',   sx: 15,   sy: 533, sw: 239, sh: 275 },
  { id: 'daisy_2',   sx: 268,  sy: 533, sw: 243, sh: 275 },
  { id: 'clover_2',  sx: 524,  sy: 533, sw: 237, sh: 275 },
  { id: 'yellow_2',  sx: 775,  sy: 533, sw: 237, sh: 275 },
  { id: 'dirt_2',    sx: 1025, sy: 533, sw: 242, sh: 275 },
  { id: 'sunbeam_2', sx: 1281, sy: 533, sw: 241, sh: 275 },
];

// Full 12-variant pool featuring prominent dirt path patches (4 & 10), clovers, daisies, yellow flowers & solar sunbeams
const ALL_GRASS_VARIANTS_POOL = [
  0, 1, 4, 2, 5, 3,
  6, 7, 10, 8, 11, 9,
  2, 4, 0, 1, 3, 5,
  8, 10, 6, 7, 9, 11,
  4, 0, 1, 5, 2, 3,
  10, 6, 7, 9, 8, 11
];

let _grassTileSpriteImg = null;
let _grassTileSpriteLoading = false;

/**
 * Preloads the authentic Plants vs. Zombies Grass Tiles sprite sheet.
 */
export function loadGrassTileSpriteSheet() {
  if (_grassTileSpriteImg || _grassTileSpriteLoading) return;
  if (typeof Image === 'undefined') return;

  _grassTileSpriteLoading = true;
  _grassTileSpriteImg = new Image();
  _grassTileSpriteImg.onload = () => {
    _grassTileSpriteLoading = false;
    // Invalidate cached grass canvas when sprite finishes loading so it repaints in full HD
    if (typeof state !== 'undefined' && state) {
      state._crazyDaveGrassCanvas = null;
    }
  };
  _grassTileSpriteImg.onerror = (e) => {
    console.warn('Failed to load Grass Tiles sprite sheet at Assets/model/Tiles/Grass-tiles-sprite-sheet.png', e);
    _grassTileSpriteLoading = false;
    _grassTileSpriteImg = null;
  };
  const src = CONFIG.crazydave?.grassTilesSpriteSrc || 'Assets/model/Tiles/Grass-tiles-sprite-sheet.png';
  _grassTileSpriteImg.src = encodeURI(`${src}?v=3`);
}

/**
 * Returns the loaded Grass Tiles sprite sheet image if ready.
 */
export function getGrassTileSpriteSheet() {
  if (_grassTileSpriteImg && _grassTileSpriteImg.complete && _grassTileSpriteImg.naturalWidth > 0) {
    return _grassTileSpriteImg;
  }
  if (!_grassTileSpriteLoading && typeof Image !== 'undefined') {
    loadGrassTileSpriteSheet();
  }
  return _grassTileSpriteImg;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getGrassTileSpriteSheet();
}

/**
 * Checks if Crazy Dave is currently present in the active arena, match roster, or character preview.
 */
export function isCrazyDavePresent() {
  if (typeof state === 'undefined' || !state) return false;

  // Active match roster (both living and fallen to preserve match lawn aesthetic)
  if (state.fighters && Array.isArray(state.fighters)) {
    const found = state.fighters.some(f => 
      f && (
        f.characterId === 'crazydave' || 
        f.characterId === 'crazy_dave' || 
        f.type === 'crazydave' || 
        f.type === 'crazy_dave' || 
        f._def?.id === 'crazydave' || 
        f._def?.id === 'crazy_dave' ||
        f.name === 'Crazy Dave' ||
        f.isCrazyDave === true
      )
    );
    if (found) return true;
  }

  // Preview / Studio / Training fighter
  if (state.previewFighter) {
    const pf = state.previewFighter;
    if (
      pf.characterId === 'crazydave' || 
      pf.characterId === 'crazy_dave' || 
      pf.type === 'crazydave' || 
      pf.type === 'crazy_dave' || 
      pf._def?.id === 'crazydave' || 
      pf._def?.id === 'crazy_dave' ||
      pf.name === 'Crazy Dave' ||
      pf.isCrazyDave === true
    ) {
      return true;
    }
  }

  // Selected fighters in lobby / character select screen
  if (state.selectedFighters && Array.isArray(state.selectedFighters)) {
    const selected = state.selectedFighters.some(f => 
      f && (f.id === 'crazydave' || f.id === 'crazy_dave' || f.name === 'Crazy Dave')
    );
    if (selected && state.currentScreen === 'game') return true;
  }

  return false;
}

/**
 * Retrieves or builds an axis-aligned cached offscreen canvas containing perfectly scaled grass tiles.
 * 1. Fills arena with solid PvZ alternating checkered green lawn base (zero gaps or black background).
 * 2. Overlays pixel-perfect cropped grass sprites (including dirt path tiles 4 and 10) with subtle edge interlocking.
 */
export function getOrCreateGrassFloorCanvas(arena, isDark = false, fBleed = 0) {
  if (typeof document === 'undefined') return null;

  const width = Math.max(64, Math.ceil(arena.width + fBleed * 2));
  const height = Math.max(64, Math.ceil(arena.height + fBleed * 2));
  const shape = arena.shape || 'rect';
  const key = `${width}_${height}_${shape}`;

  const grassImg = getGrassTileSpriteSheet();
  const imgLoaded = Boolean(grassImg && grassImg.complete && grassImg.naturalWidth > 0);
  const fullKey = `${key}_${imgLoaded ? 'loaded' : 'fallback'}`;

  if (state._crazyDaveGrassCanvas && state._crazyDaveGrassCanvas._key === fullKey) {
    return state._crazyDaveGrassCanvas;
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

  // 1. Solid PvZ Checkered Lawn Base (100% gapless green underlay)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isAlternate = ((r + c) % 2 === 0);
      oc.fillStyle = isAlternate ? '#4db827' : '#3da01f';
      oc.fillRect(
        Math.floor(c * cellW),
        Math.floor(r * cellH),
        Math.ceil(cellW + 1),
        Math.ceil(cellH + 1)
      );
    }
  }

  // 2. High-Resolution PvZ Grass Sprite Sheet Overlay (Including Dirt Patches 4 & 10)
  if (imgLoaded) {
    const overlap = 2; // subtle interlocking bleed so grass blade fringes blend smoothly
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const gridIndex = (r * cols + c) % ALL_GRASS_VARIANTS_POOL.length;
        const tileIdx = ALL_GRASS_VARIANTS_POOL[gridIndex];
        const rect = DEFAULT_GRASS_TILE_RECTS[tileIdx] || DEFAULT_GRASS_TILE_RECTS[0];

        const dx = Math.floor(c * cellW) - overlap;
        const dy = Math.floor(r * cellH) - overlap;
        const dw = Math.ceil(cellW) + overlap * 2;
        const dh = Math.ceil(cellH) + overlap * 2;

        oc.drawImage(grassImg, rect.sx, rect.sy, rect.sw, rect.sh, dx, dy, dw, dh);
      }
    }
  } else {
    // High-quality procedural grass blade tufts, daisy highlights & dirt patches fallback
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isAlternate = ((r + c) % 2 === 0);
        const bx = Math.floor(c * cellW);
        const by = Math.floor(r * cellH);
        const gridIndex = (r * cols + c) % ALL_GRASS_VARIANTS_POOL.length;
        const tileIdx = ALL_GRASS_VARIANTS_POOL[gridIndex];

        // Dirt Patch Fallback for Tile 4 & 10
        if (tileIdx === 4 || tileIdx === 10) {
          oc.fillStyle = '#78350F'; // Rich Earth Brown
          oc.beginPath();
          oc.ellipse(bx + cellW * 0.28, by + cellH * 0.28, cellW * 0.22, cellH * 0.18, 0.2, 0, Math.PI * 2);
          oc.ellipse(bx + cellW * 0.72, by + cellH * 0.72, cellW * 0.20, cellH * 0.16, -0.2, 0, Math.PI * 2);
          oc.fill();

          // Pebbles / Rocks
          oc.fillStyle = '#94A3B8';
          oc.fillRect(bx + cellW * 0.22, by + cellH * 0.24, 4, 3);
          oc.fillRect(bx + cellW * 0.76, by + cellH * 0.70, 3, 3);
        } else {
          // Blade accents
          oc.fillStyle = isAlternate ? '#5bc337' : '#34861f';
          oc.fillRect(bx + 10, by + 12, 5, 5);
          oc.fillRect(bx + cellW - 18, by + cellH - 16, 5, 5);

          // Subtle flower accent on alternating cells
          if ((r * 3 + c * 7) % 5 === 0) {
            oc.fillStyle = '#FFFFFF';
            oc.fillRect(bx + cellW * 0.48, by + cellH * 0.45, 4, 4);
            oc.fillStyle = '#FBBF24';
            oc.fillRect(bx + cellW * 0.48 + 1, by + cellH * 0.45 + 1, 2, 2);
          }
        }
      }
    }
  }

  offCanvas._key = fullKey;
  state._crazyDaveGrassCanvas = offCanvas;
  return offCanvas;
}

/**
 * Renders the full Grass Tiles arena floor onto the provided canvas 2D context.
 * Strictly adheres to arena boundary clipping (both rectangular and circular arenas).
 */
export function renderCrazyDaveGrassFloor(ctx, arena, isDark = false, fBleed = 0) {
  if (!ctx || !arena) return;

  const grassCanvas = getOrCreateGrassFloorCanvas(arena, isDark, fBleed);
  if (!grassCanvas) return;

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

  // Blit cached grass canvas seamlessly across the clipped arena bounds
  ctx.drawImage(grassCanvas, arena.x - fBleed, arena.y - fBleed, arena.width + fBleed * 2, arena.height + fBleed * 2);
  ctx.restore();
}

/**
 * Calculates the exact world coordinates for the center of the grass tile nearest to (targetX, targetY).
 * Optionally accepts a list of existing occupants (e.g. active plants) to find the nearest unoccupied tile.
 */
export function getNearestGrassTileCenter(targetX, targetY, arena, existingOccupants = []) {
  arena = arena || (typeof state !== 'undefined' && state.arena) || { x: 0, y: 0, width: 460, height: 460 };
  const cols = ARENA_TILE_COUNT;
  const rows = ARENA_TILE_COUNT;
  const cellW = arena.width / cols;
  const cellH = arena.height / rows;

  const baseCol = Math.max(0, Math.min(cols - 1, Math.floor((targetX - arena.x) / cellW)));
  const baseRow = Math.max(0, Math.min(rows - 1, Math.floor((targetY - arena.y) / cellH)));

  const isInsideCircularArena = (cx, cy) => {
    if (arena.shape !== 'circle') return true;
    const arenaMidX = arena.x + arena.width / 2;
    const arenaMidY = arena.y + arena.height / 2;
    const ar = (arena.radius !== undefined ? arena.radius : (arena.width / 2)) - 25;
    return Math.hypot(cx - arenaMidX, cy - arenaMidY) <= ar;
  };

  const isOccupied = (c, r) => {
    const cx = arena.x + (c + 0.5) * cellW;
    const cy = arena.y + (r + 0.5) * cellH;
    if (!isInsideCircularArena(cx, cy)) return true;
    return existingOccupants.some(occ => {
      if (!occ || occ.hp <= 0) return false;
      return Math.hypot(occ.x - cx, occ.y - cy) < Math.min(cellW, cellH) * 0.45;
    });
  };

  if (!isOccupied(baseCol, baseRow) && isInsideCircularArena(arena.x + (baseCol + 0.5) * cellW, arena.y + (baseRow + 0.5) * cellH)) {
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
      if (!isInsideCircularArena(cx, cy)) continue;
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

/**
 * Picks a random grass tile center within the arena bounds.
 */
export function getRandomGrassTileCenter(arena, existingOccupants = []) {
  arena = arena || (typeof state !== 'undefined' && state.arena) || { x: 0, y: 0, width: 460, height: 460 };
  const cols = ARENA_TILE_COUNT;
  const rows = ARENA_TILE_COUNT;
  const cellW = arena.width / cols;
  const cellH = arena.height / rows;

  const validTiles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = arena.x + (c + 0.5) * cellW;
      const cy = arena.y + (r + 0.5) * cellH;
      // In circular arenas, ensure tile center is within arena radius
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

