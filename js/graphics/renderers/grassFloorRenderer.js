// CRAZY DAVE PVZ GRASS TILES ARENA FLOOR RENDERER
// Sourced from Assets/model/Sprites/Grass-tiles-sprite-sheet.png (1536 x 1024)
// Features pixel-perfect source rect cropping (2 rows of 6 tiles), solid PvZ checkerboard underlay,
// and seamless scale-fitting across the battle arena matching tactical bush sprite precision.

import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';

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

// Natural organic pool for authentic PvZ lawn composition (lush grass, clovers, daisies, yellow flowers & sunbeams)
const LUSH_GRASS_POOL = [0, 1, 2, 6, 7, 8, 1, 3, 5, 7, 9, 11];

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
    console.warn('Failed to load Grass Tiles sprite sheet at Assets/model/Sprites/Grass-tiles-sprite-sheet.png', e);
    _grassTileSpriteLoading = false;
    _grassTileSpriteImg = null;
  };
  const src = CONFIG.crazydave?.grassTilesSpriteSrc || 'Assets/model/Sprites/Grass-tiles-sprite-sheet.png';
  _grassTileSpriteImg.src = encodeURI(`${src}?v=2`);
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
 * 2. Overlays pixel-perfect cropped grass sprites with subtle edge interlocking.
 */
export function getOrCreateGrassFloorCanvas(arena, isDark = false, fBleed = 4) {
  if (typeof document === 'undefined') return null;

  const width = Math.max(64, Math.ceil(arena.width + fBleed * 2));
  const height = Math.max(64, Math.ceil(arena.height + fBleed * 2));
  const shape = arena.shape || 'rect';
  const key = `${width}_${height}_${shape}_${isDark ? 'dark' : 'light'}`;

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

  // Grid calculation: standard 6x6 tiles for 460x460 arena (or dynamic ~76px per tile)
  const targetTileSize = CONFIG.crazydave?.grassTileSize || 76.6;
  const cols = Math.max(3, Math.round(arena.width / targetTileSize));
  const rows = Math.max(3, Math.round(arena.height / targetTileSize));
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

  // 2. High-Resolution PvZ Grass Sprite Sheet Overlay
  if (imgLoaded) {
    const overlap = 2; // subtle interlocking bleed so grass blade fringes blend smoothly
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const poolIdx = (r * 5 + c * 3 + (r % 2) * 2) % LUSH_GRASS_POOL.length;
        const tileIdx = LUSH_GRASS_POOL[poolIdx];
        const rect = DEFAULT_GRASS_TILE_RECTS[tileIdx] || DEFAULT_GRASS_TILE_RECTS[0];

        const dx = Math.floor(c * cellW) - overlap;
        const dy = Math.floor(r * cellH) - overlap;
        const dw = Math.ceil(cellW) + overlap * 2;
        const dh = Math.ceil(cellH) + overlap * 2;

        oc.drawImage(grassImg, rect.sx, rect.sy, rect.sw, rect.sh, dx, dy, dw, dh);
      }
    }
  } else {
    // High-quality procedural grass blade tufts & daisy highlights fallback
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isAlternate = ((r + c) % 2 === 0);
        const bx = Math.floor(c * cellW);
        const by = Math.floor(r * cellH);

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

  // 3. Dark Mode / Night Lawn Atmosphere Tint
  if (isDark) {
    oc.fillStyle = 'rgba(6, 20, 16, 0.42)';
    oc.fillRect(0, 0, width, height);
  }

  offCanvas._key = fullKey;
  state._crazyDaveGrassCanvas = offCanvas;
  return offCanvas;
}

/**
 * Renders the full Grass Tiles arena floor onto the provided canvas 2D context.
 * Strictly adheres to arena boundary clipping (both rectangular and circular arenas).
 */
export function renderCrazyDaveGrassFloor(ctx, arena, isDark = false, fBleed = 4) {
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
  ctx.drawImage(grassCanvas, arena.x - fBleed, arena.y - fBleed);
  ctx.restore();
}

