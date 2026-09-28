// CRAZY DAVE PVZ GRASS TILES ARENA FLOOR RENDERER
// Sourced from Assets/model/Sprites/Grass-tiles-sprite-sheet.png (1536 x 1024, 6 cols x 4 rows of 256x256 tiles)

import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';

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
  _grassTileSpriteImg.src = encodeURI(`${src}?v=1`);
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
 * Retrieves or builds an axis-aligned cached offscreen canvas containing tiled grass sprites.
 * Slices 256x256 tiles from the 6x4 sprite sheet and tiles them across the arena floor.
 */
export function getOrCreateGrassFloorCanvas(arena, isDark = false) {
  if (typeof document === 'undefined') return null;

  const width = Math.max(64, Math.ceil(arena.width + 32));
  const height = Math.max(64, Math.ceil(arena.height + 32));
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

  const tileSize = CONFIG.crazydave?.grassTileSize || 64; // PvZ lawn grid tile size (fits ~7-8 columns per arena width)
  const cols = Math.ceil(width / tileSize) + 1;

  const rows = Math.ceil(height / tileSize) + 1;

  if (imgLoaded) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Deterministic pseudo-random variant selector across the 24 tiles (6 cols x 4 rows)
        const tileIdx = Math.abs((Math.imul(c * 17 + 7, r * 31 + 13) ^ (c + r * 5)) >>> 0) % 24;
        const srcCol = tileIdx % 6;
        const srcRow = Math.floor(tileIdx / 6) % 4;
        const sx = srcCol * 256;
        const sy = srcRow * 256;
        const dx = c * tileSize;
        const dy = r * tileSize;

        oc.drawImage(grassImg, sx, sy, 256, 256, dx, dy, tileSize, tileSize);
      }
    }
  } else {
    // High-quality procedural lush green lawn fallback (PvZ checkered alternating lawn stripes)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isAlternate = ((r + c) % 2 === 0);
        oc.fillStyle = isAlternate ? '#48a82d' : '#3e9925';
        oc.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);

        // Subtle grass blade highlights
        oc.fillStyle = isAlternate ? '#5bc337' : '#34861f';
        oc.fillRect(c * tileSize + 8, r * tileSize + 8, 4, 4);
        oc.fillRect(c * tileSize + tileSize - 14, r * tileSize + tileSize - 14, 4, 4);
      }
    }
  }

  // Dark Mode / Night Lawn subtle atmosphere tint
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

  const grassCanvas = getOrCreateGrassFloorCanvas(arena, isDark);
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

  // Blit cached grass canvas seamlessly with sub-pixel alignment offset
  ctx.drawImage(grassCanvas, arena.x - 16, arena.y - 16);
  ctx.restore();
}
