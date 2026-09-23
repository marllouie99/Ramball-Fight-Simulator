import { CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { worldToScreen } from '../../systems/cameraSystem.js';

let _hudSyncInitialized = false;
let _cachedGameBox = null;
let _cachedContainerBottom = null;
let _cachedTopContainer = null;
let _cachedBottomContainer = null;
let _cachedPixiView = null;

/**
 * Safely sets a style property on a DOM element, supporting both standard
 * CSSStyleDeclaration (.setProperty) and mock style objects (used in unit tests).
 */
function setSafeStyle(el, prop, val, priority) {
  if (!el || !el.style) return;
  if (typeof el.style.setProperty === 'function') {
    if (priority) {
      el.style.setProperty(prop, val, priority);
    } else {
      el.style.setProperty(prop, val);
    }
  } else {
    const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    el.style[camelProp] = val;
    el.style[prop] = val;
  }
}

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
  const canvasHeight = (typeof state !== 'undefined' && state.canvas && state.canvas.height) || CONFIG.canvasHeight || 960;

  _cachedGameBox.style.aspectRatio = '540 / 960';
  _cachedGameBox.style.maxWidth = `${canvasWidth}px`;
  
  const isDark = (typeof state !== 'undefined' && (state.gameCategory === 'tactical' || state.arenaTheme === 'dark'));
  const outerBgColor = isDark ? '#000000' : (CONFIG.arenaOuterBgColor || '#fff8ceff');
  _cachedGameBox.style.backgroundColor = (typeof outerBgColor === 'string' && outerBgColor.startsWith('#') && outerBgColor.length === 9 && outerBgColor.endsWith('ff'))
    ? outerBgColor.substring(0, 7)
    : outerBgColor;

  const boxRect = _cachedGameBox.getBoundingClientRect();
  const canvasRect = _cachedPixiView.getBoundingClientRect();

  if (boxRect.height <= 0 || canvasRect.height <= 0 || boxRect.width <= 0 || canvasRect.width <= 0) return;

  const canvasTopInBox = canvasRect.top - boxRect.top;
  const canvasLeftInBox = canvasRect.left - boxRect.left;

  const isTactical = typeof state !== 'undefined' && (state.gameCategory === 'tactical' || String(state.mode || '').toLowerCase().includes('tactical'));

  const scale = CONFIG.internalScale || 1.0;
  const hudScale = isTactical ? 1.0 : (scale * 0.9);

  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
  const arenaWidth = arena.width;
  const arenaX = arena.x;
  
  const widthModifier = CONFIG.hudWidthModifier ?? scale;

  const hudCssWidth = isTactical ? arenaWidth : ((arenaWidth * widthModifier) / hudScale);
  const visualWidthPercent = (hudCssWidth / canvasWidth) * 100;

  const hudCssLeft = isTactical ? arenaX : ((arenaX + arenaWidth / 2) - hudCssWidth / 2);
  const visualLeftPercent = (hudCssLeft / canvasWidth) * 100;

  const is1v2 = Boolean(
    state.mode === 'Boss Battle' ||
    state.mode === '1v2 Stand Off' ||
    state.mode === '1v2' ||
    state.mode === 'Stand Off 1v2' ||
    (typeof GAME_MODES !== 'undefined' && (state.mode === GAME_MODES.BOSS_BATTLE || state.mode === GAME_MODES.STAND_OFF_1V2))
  );

  // 1. Position Top HUD Container
  const topRatio = is1v2 ? ((arena.y - 100) / canvasHeight) : ((arena.y - 90) / canvasHeight);
  const topPx = canvasTopInBox + canvasRect.height * topRatio;
  const topPercent = (topPx / boxRect.height) * 100;
  
  if (!_cachedTopContainer) _cachedTopContainer = document.getElementById('hudTopContainer');
  if (_cachedTopContainer) {
    setSafeStyle(_cachedTopContainer, 'top', `${topPercent.toFixed(3)}%`);
    setSafeStyle(_cachedTopContainer, 'width', `${visualWidthPercent.toFixed(3)}%`, 'important');
    setSafeStyle(_cachedTopContainer, 'max-width', 'none', 'important');
    setSafeStyle(_cachedTopContainer, 'left', `${visualLeftPercent.toFixed(3)}%`, 'important');
    setSafeStyle(_cachedTopContainer, 'right', 'auto', 'important');
    setSafeStyle(_cachedTopContainer, 'margin', '0', 'important');
    setSafeStyle(_cachedTopContainer, 'transform', isTactical ? 'none' : `scale(${hudScale})`);
    setSafeStyle(_cachedTopContainer, 'transform-origin', 'top center', 'important');
  }

  // 2. Position Bottom HUD Container
  const bottomRatio = ((arena.y + arena.height + 20) / canvasHeight);
  const bottomPx = canvasTopInBox + canvasRect.height * bottomRatio;
  const bottomPercent = (bottomPx / boxRect.height) * 100;

  if (!_cachedBottomContainer) _cachedBottomContainer = document.getElementById('hudBottomContainer');
  if (_cachedBottomContainer) {
    setSafeStyle(_cachedBottomContainer, 'top', `${bottomPercent.toFixed(3)}%`);
    setSafeStyle(_cachedBottomContainer, 'width', `${visualWidthPercent.toFixed(3)}%`, 'important');
    setSafeStyle(_cachedBottomContainer, 'max-width', 'none', 'important');
    setSafeStyle(_cachedBottomContainer, 'left', `${visualLeftPercent.toFixed(3)}%`, 'important');
    setSafeStyle(_cachedBottomContainer, 'right', 'auto', 'important');
    setSafeStyle(_cachedBottomContainer, 'margin', '0', 'important');
    setSafeStyle(_cachedBottomContainer, 'transform', isTactical ? 'none' : `scale(${hudScale})`);
    setSafeStyle(_cachedBottomContainer, 'transform-origin', 'top center', 'important');
  }

  // 3. Position Health HUD
  const arenaBottomRatio = (arena.y + arena.height) / canvasHeight;
  const arenaBottomInBox = canvasTopInBox + canvasRect.height * arenaBottomRatio;
  const bottomMarginPx = is1v2 ? 40 : 20;
  const hudMargin = canvasRect.height * (bottomMarginPx / canvasHeight);
  const hudTopPx = arenaBottomInBox + hudMargin;
  const hudTopPercent = (hudTopPx / boxRect.height) * 100;

  if (!_cachedContainerBottom) _cachedContainerBottom = document.getElementById('healthHud');
  const healthHud = _cachedContainerBottom;
  if (healthHud) {
    setSafeStyle(healthHud, 'top', `${hudTopPercent.toFixed(3)}%`);
    setSafeStyle(healthHud, 'width', `${visualWidthPercent.toFixed(3)}%`, 'important');
    setSafeStyle(healthHud, 'max-width', 'none', 'important');
    setSafeStyle(healthHud, 'left', `${visualLeftPercent.toFixed(3)}%`, 'important');
    setSafeStyle(healthHud, 'right', 'auto', 'important');
    setSafeStyle(healthHud, 'margin', '0', 'important');
    setSafeStyle(healthHud, 'transform', isTactical ? 'none' : `scale(${hudScale})`);
    setSafeStyle(healthHud, 'transform-origin', 'top center', 'important');
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

/**
 * Updates the Top HUD Container (#hudTopContainer) transform statically (never shakes).
 */
export function updateTopHudCameraTracking(topContainer) {
  if (!topContainer) return;
  const scale = CONFIG.internalScale || 1.0;
  const isTactical = typeof state !== 'undefined' && (state.gameCategory === 'tactical' || String(state.mode || '').toLowerCase().includes('tactical'));
  const hudScale = isTactical ? 1.0 : (scale * 0.9);

  setSafeStyle(topContainer, 'transform', isTactical ? 'none' : `scale(${hudScale})`, 'important');
  setSafeStyle(topContainer, 'transform-origin', 'top center', 'important');
}

/**
 * Updates the Bottom HUD Container (#healthHud) transform statically (never shakes).
 */
export function updateBottomHudCameraTracking(bottomContainer) {
  if (!bottomContainer) return;
  const scale = CONFIG.internalScale || 1.0;
  const isTactical = typeof state !== 'undefined' && (state.gameCategory === 'tactical' || String(state.mode || '').toLowerCase().includes('tactical'));
  const hudScale = isTactical ? 1.0 : (scale * 0.9);

  setSafeStyle(bottomContainer, 'transform', isTactical ? 'none' : `scale(${hudScale})`, 'important');
  setSafeStyle(bottomContainer, 'transform-origin', 'top center', 'important');
}
