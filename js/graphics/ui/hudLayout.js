import { CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';

let _hudSyncInitialized = false;
let _cachedGameBox = null;
let _cachedContainerBottom = null;
let _cachedTopContainer = null;
let _cachedBottomContainer = null;
let _cachedPixiView = null;

/**
 * Dynamically recalculates the HUD container positions based on the actual
 * PixiJS canvas element's bounding rect relative to the game-box.
 * This prevents HUD drift during browser zoom changes.
 */
export function syncHudPosition() {
  if (!_cachedGameBox) _cachedGameBox = document.querySelector('.game-box');
  if (!_cachedPixiView) _cachedPixiView = _cachedGameBox?.querySelector('canvas') || document.getElementById('arena');
  if (!_cachedGameBox || !_cachedPixiView) return;

  const canvasWidth = (typeof state !== 'undefined' && state.canvas && state.canvas.width) || CONFIG.canvasWidth || 540;
  const canvasHeight = (typeof state !== 'undefined' && state.canvas && state.canvas.height) || CONFIG.canvasHeight || 1080;

  _cachedGameBox.style.aspectRatio = `${canvasWidth} / ${canvasHeight}`;
  _cachedGameBox.style.maxWidth = `${canvasWidth}px`;
  
  const isDark = (typeof state !== 'undefined' && (state.gameCategory === 'tactical' || state.arenaTheme === 'dark'));
  const outerBgColor = isDark ? '#000000' : (CONFIG.arenaOuterBgColor || '#ffffff');
  _cachedGameBox.style.backgroundColor = outerBgColor.replace(/ff$/, '');

  const boxRect = _cachedGameBox.getBoundingClientRect();
  const canvasRect = _cachedPixiView.getBoundingClientRect();

  if (boxRect.height <= 0 || canvasRect.height <= 0 || boxRect.width <= 0 || canvasRect.width <= 0) return;

  const canvasTopInBox = canvasRect.top - boxRect.top;
  const canvasLeftInBox = canvasRect.left - boxRect.left;

  const scale = CONFIG.internalScale || 1.0;
  const hudScale = scale * 0.9;

  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
  const arenaWidth = arena.width;
  const arenaX = arena.x;
  
  const widthModifier = CONFIG.hudWidthModifier ?? scale;

  const hudCssWidth = (arenaWidth * widthModifier) / hudScale;
  const visualWidthPercent = (hudCssWidth / canvasWidth) * 100;

  const hudCssLeft = (arenaX + arenaWidth / 2) - hudCssWidth / 2;
  const visualLeftPercent = (hudCssLeft / canvasWidth) * 100;

  // 1. Position Top HUD Container
  const topRatio = ((arena.y - 90) / canvasHeight);
  const topPx = canvasTopInBox + canvasRect.height * topRatio;
  const topPercent = (topPx / boxRect.height) * 100;
  
  if (!_cachedTopContainer) _cachedTopContainer = document.getElementById('hudTopContainer');
  if (_cachedTopContainer) {
    _cachedTopContainer.style.top = `${topPercent.toFixed(3)}%`;
    _cachedTopContainer.style.width = `${visualWidthPercent.toFixed(3)}%`;
    _cachedTopContainer.style.maxWidth = 'none';
    _cachedTopContainer.style.left = `${visualLeftPercent.toFixed(3)}%`;
    _cachedTopContainer.style.right = 'auto';
    _cachedTopContainer.style.transform = `scale(${hudScale})`;
    _cachedTopContainer.style.transformOrigin = 'top center';
  }

  // 2. Position Bottom HUD Container
  const bottomRatio = ((arena.y + arena.height + 20) / canvasHeight);
  const bottomPx = canvasTopInBox + canvasRect.height * bottomRatio;
  const bottomPercent = (bottomPx / boxRect.height) * 100;

  if (!_cachedBottomContainer) _cachedBottomContainer = document.getElementById('hudBottomContainer');
  if (_cachedBottomContainer) {
    _cachedBottomContainer.style.top = `${bottomPercent.toFixed(3)}%`;
    _cachedBottomContainer.style.width = `${visualWidthPercent.toFixed(3)}%`;
    _cachedBottomContainer.style.maxWidth = 'none';
    _cachedBottomContainer.style.left = `${visualLeftPercent.toFixed(3)}%`;
    _cachedBottomContainer.style.right = 'auto';
    _cachedBottomContainer.style.transform = `scale(${hudScale})`;
    _cachedBottomContainer.style.transformOrigin = 'top center';
  }

  // 3. Position Health HUD
  const arenaBottomRatio = (arena.y + arena.height) / canvasHeight;
  const arenaBottomInBox = canvasTopInBox + canvasRect.height * arenaBottomRatio;
  const hudMargin = canvasRect.height * (20 / canvasHeight);
  const hudTopPx = arenaBottomInBox + hudMargin;
  const hudTopPercent = (hudTopPx / boxRect.height) * 100;

  if (!_cachedContainerBottom) _cachedContainerBottom = document.getElementById('healthHud');
  const healthHud = _cachedContainerBottom;
  if (healthHud) {
    healthHud.style.top = `${hudTopPercent.toFixed(3)}%`;
    healthHud.style.width = `${visualWidthPercent.toFixed(3)}%`;
    healthHud.style.maxWidth = 'none';
    healthHud.style.left = `${visualLeftPercent.toFixed(3)}%`;
    healthHud.style.right = 'auto';
    healthHud.style.margin = '0';
    healthHud.style.transform = `scale(${hudScale})`;
    healthHud.style.transformOrigin = 'top center';
  }
}

export function initHudSync() {
  if (_hudSyncInitialized) return;
  _hudSyncInitialized = true;

  syncHudPosition();

  window.addEventListener('resize', syncHudPosition);

  const dprMediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  const onDprChange = () => {
    syncHudPosition();
    const newQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    newQuery.addEventListener('change', onDprChange, { once: true });
  };
  dprMediaQuery.addEventListener('change', onDprChange, { once: true });

  const gameBox = document.querySelector('.game-box');
  if (gameBox && typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      _cachedPixiView = null;
      syncHudPosition();
    });
    ro.observe(gameBox);
  }
}
