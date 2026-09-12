const _imageCache = new Map();

/**
 * Preload an image asset so it's fully resident in memory before combat.
 * @param {string} src
 * @returns {HTMLImageElement|undefined}
 */
export function preloadImage(src) {
  if (!src || typeof Image === 'undefined') return;
  if (_imageCache.has(src)) return _imageCache.get(src);
  const img = new Image();
  img.src = src;
  _imageCache.set(src, img);
  return img;
}

/**
 * Initializes the graphics cache and warms up character skin bitmaps.
 * Call this once at startup.
 */
export function initGraphicsCache() {
  if (typeof Image === 'undefined') return;
  const models = [
    'Assets/model/Saturo-Gojo-PIXEL-SKIN.png?v=1',
    'Assets/model/SUKUNA.png',
    'Assets/model/Johnwick-pixel-skin.png',
    'Assets/model/Toji-skin.png',
    'Assets/model/Yuta-Pixel-Skin.png',
    'Assets/model/Nanami-PIXEL-SKIN.png',
    'Assets/model/MAHITO-PIXEL-SKIN.png',
    'Assets/model/Yuji-PIXEL-SKIN.png',
    'Assets/model/Uryu-ishida.png',
    'Assets/model/ichigo-bankai-skin.png',
    'Assets/model/ichigo-shikai-skin.png',
    'Assets/model/Nanami-weapon.png',
    'Assets/model/MAHITO-CLAWS-WEAPON.png',
    'Assets/model/UlquiorraCifer-weapon.png',
    'Assets/model/POWER-MODEL-SKIN.png',
    'Assets/model/Makima-model-skin.png',
    'Assets/model/REZE-MODEL-SKIN.png',
    'Assets/model/denji-devilform-model-skin.png',
    'Assets/Overlays/mahitos-de.png'
  ];
  models.forEach(preloadImage);
}

/**
 * Clears the graphics cache.
 * Call this when resetting the game or changing modes.
 */
export function clearCache() {
  _imageCache.clear();
}