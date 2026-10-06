import { CONFIG } from '../core/config.js';

const _imageCache = new Map();
let _totalPreloadCount = 0;
let _loadedPreloadCount = 0;

/**
 * Preload an image asset so it's fully resident in memory before combat.
 * @param {string} src
 * @returns {HTMLImageElement|undefined}
 */
export function preloadImage(src) {
  if (!src || typeof Image === 'undefined') return;
  if (_imageCache.has(src)) return _imageCache.get(src);
  
  _totalPreloadCount++;
  const img = new Image();
  img.onload = () => {
    _loadedPreloadCount++;
  };
  img.onerror = () => {
    _loadedPreloadCount++;
  };
  img.src = src;
  _imageCache.set(src, img);
  return img;
}

/**
 * Returns current asset preloader progress.
 * @returns {{ total: number, loaded: number, ratio: number, isComplete: boolean }}
 */
export function getPreloadStatus() {
  const total = _totalPreloadCount;
  const loaded = _loadedPreloadCount;
  const ratio = total > 0 ? Math.min(1.0, loaded / total) : 1.0;
  return {
    total,
    loaded,
    ratio,
    isComplete: total === 0 || loaded >= total
  };
}

/**
 * Initializes the graphics cache and warms up character skin bitmaps.
 * Call this once at startup.
 */
export function initGraphicsCache() {
  if (typeof Image === 'undefined') return;
  const models = new Set([
    'Assets/Overlays/mahitos-de.png',
    'Assets/Overlays/gojo-domainexpansion.png',
    'Assets/Overlays/Yuta-domain-overlay.png',
    'Assets/Overlays/toji-ultimate-overlay.png',
    'Assets/Overlays/CJ-baguvix-overlay.png',
    'Assets/Overlays/Nanami-overtime-overlay.png',
    'Assets/Overlays/Todo-ultimate-overlay.png',
    'Assets/Overlays/Yuji-soulswap-overlay.png',
    'Assets/Overlays/Mahoraga-wheel-overlay.png'
  ]);

  if (typeof CONFIG === 'object') {
    for (const key of Object.keys(CONFIG)) {
      const cfg = CONFIG[key];
      if (cfg && cfg.assets && typeof cfg.assets === 'object') {
        for (const assetPath of Object.values(cfg.assets)) {
          if (typeof assetPath === 'string' && (assetPath.endsWith('.png') || assetPath.endsWith('.jpg') || assetPath.endsWith('.webp'))) {
            models.add(assetPath);
          }
        }
      }
    }
  }

  models.forEach(preloadImage);
}

/**
 * Clears the graphics cache.
 * Call this when resetting the game or changing modes.
 */
export function clearCache() {
  _imageCache.clear();
}