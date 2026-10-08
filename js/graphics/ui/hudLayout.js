import { CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { worldToScreen } from '../../systems/cameraSystem.js';

let _hudSyncInitialized = false;
let _cachedGameBox = null;
let _cachedContainerBottom = null;
let _cachedContainerLeft = null;
let _cachedContainerRight = null;
let _cachedTopContainer = null;
let _cachedBottomContainer = null;
let _cachedPixiView = null;
let _cachedBoxHeight = 0;
let _cachedBoxWidth = 0;
let _cachedCanvasHeight = 0;
let _cachedCanvasWidth = 0;
let _cachedCanvasTopInBox = 0;

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

  const isHorizontal = Boolean(typeof state !== 'undefined' && state.viewOrientation === 'horizontal');
  const isGrandBattle = isHorizontal && Boolean(typeof state !== 'undefined' && (
    (state.arena && state.arena.width > 600) ||
    state.mode === '3v3v3v3' ||
    state.mode === '2v2v2v2' ||
    state.mode === '4v4' ||
    state.mode === 'Battle Royale 8' ||
    state.mode === '8-Fighter Battle Royale' ||
    state.mode === '3v3v3v3 Teamfight' ||
    state.mode === '4v4 Grand War' ||
    state.mode === '2v2v2v2 Quad Battle' ||
    state.mode === '2v2v2v2 Quad' ||
    state.mode === 'Grand Colosseum' ||
    state.mode === 'Classic Minimalist Arena'
  ));
  const isTactical = isGrandBattle;

  _cachedGameBox.style.aspectRatio = isHorizontal ? '16 / 9' : '540 / 960';
  _cachedGameBox.style.maxWidth = `${canvasWidth}px`;
  
  const isDark = (typeof state !== 'undefined' && state.arenaTheme === 'dark');
  const outerBgColor = isDark ? '#000000' : (CONFIG.arenaOuterBgColor || '#fff8ceff');
  _cachedGameBox.style.backgroundColor = (typeof outerBgColor === 'string' && outerBgColor.startsWith('#') && outerBgColor.length === 9 && outerBgColor.endsWith('ff'))
    ? outerBgColor.substring(0, 7)
    : outerBgColor;

  const boxRect = _cachedGameBox.getBoundingClientRect();
  const canvasRect = _cachedPixiView.getBoundingClientRect();

  if (boxRect.height <= 0 || canvasRect.height <= 0 || boxRect.width <= 0 || canvasRect.width <= 0) return;

  _cachedBoxHeight = boxRect.height;
  _cachedBoxWidth = boxRect.width;
  _cachedCanvasHeight = canvasRect.height;
  _cachedCanvasWidth = canvasRect.width;
  _cachedCanvasTopInBox = canvasRect.top - boxRect.top;

  const canvasTopInBox = _cachedCanvasTopInBox;
  const canvasLeftInBox = canvasRect.left - boxRect.left;

  const scale = CONFIG.internalScale || 1.0;
  const hudScale = isHorizontal ? 0.80 : (scale * 0.9);

  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
  const arenaWidth = arena.width;
  const arenaX = arena.x;
  
  const widthModifier = CONFIG.hudWidthModifier ?? scale;
  const topWidthModifier = CONFIG.topHudWidthModifier ?? widthModifier;
  const bottomWidthModifier = CONFIG.bottomHudWidthModifier ?? (CONFIG.hudBottomWidthModifier ?? 1.007);

  // Top HUD sizing & positioning (spans full arena header)
  const topHudCssWidth = isTactical ? arenaWidth : ((arenaWidth * topWidthModifier) / hudScale);
  const topVisualWidthPercent = (topHudCssWidth / canvasWidth) * 100;
  const topHudCssLeft = isTactical ? arenaX : ((arenaX + arenaWidth / 2) - topHudCssWidth / 2);
  const topVisualLeftPercent = (topHudCssLeft / canvasWidth) * 100;

  // Bottom HUD sizing & positioning (compact centered width)
  const bottomHudCssWidth = isTactical ? (arenaWidth * bottomWidthModifier) : ((arenaWidth * bottomWidthModifier) / hudScale);
  const bottomVisualWidthPercent = (bottomHudCssWidth / canvasWidth) * 100;
  const bottomHudCssLeft = isTactical ? ((arenaX + arenaWidth / 2) - (arenaWidth * bottomWidthModifier) / 2) : ((arenaX + arenaWidth / 2) - bottomHudCssWidth / 2);
  const bottomVisualLeftPercent = (bottomHudCssLeft / canvasWidth) * 100;

  const is1v2 = Boolean(
    state.mode === 'Boss Battle' ||
    state.mode === '1v2 Stand Off' ||
    state.mode === '1v2' ||
    state.mode === 'Stand Off 1v2' ||
    (typeof GAME_MODES !== 'undefined' && (state.mode === GAME_MODES.BOSS_BATTLE || state.mode === GAME_MODES.STAND_OFF_1V2))
  );

  // 1. Position Top HUD Container
  const topRatio = isHorizontal
    ? ((arena.y - 28) / canvasHeight)
    : (is1v2 ? ((arena.y - 100) / canvasHeight) : ((arena.y - 90) / canvasHeight));
  const topPx = canvasTopInBox + canvasRect.height * topRatio;
  const topPercent = (topPx / boxRect.height) * 100;
  
  if (!_cachedTopContainer) _cachedTopContainer = document.getElementById('hudTopContainer');
  if (_cachedTopContainer) {
    setSafeStyle(_cachedTopContainer, 'top', `${topPercent.toFixed(3)}%`);
    setSafeStyle(_cachedTopContainer, 'width', `${topVisualWidthPercent.toFixed(3)}%`, 'important');
    setSafeStyle(_cachedTopContainer, 'max-width', 'none', 'important');
    setSafeStyle(_cachedTopContainer, 'left', `${topVisualLeftPercent.toFixed(3)}%`, 'important');
    setSafeStyle(_cachedTopContainer, 'right', 'auto', 'important');
    setSafeStyle(_cachedTopContainer, 'margin', '0', 'important');
    setSafeStyle(_cachedTopContainer, 'transform', isTactical ? 'none' : `scale(${hudScale})`);
    setSafeStyle(_cachedTopContainer, 'transform-origin', 'top center', 'important');
  }

  // 2. Position Bottom HUD Container (Snug right below arena bottom wall)
  const bottomMarginPx = isHorizontal ? 6 : (is1v2 ? 24 : 16);
  const bottomRatio = ((arena.y + arena.height + bottomMarginPx) / canvasHeight);
  const bottomPx = canvasTopInBox + canvasRect.height * bottomRatio;
  const bottomPercent = (bottomPx / boxRect.height) * 100;

  if (!_cachedBottomContainer) _cachedBottomContainer = document.getElementById('hudBottomContainer');
  if (_cachedBottomContainer) {
    setSafeStyle(_cachedBottomContainer, 'top', `${bottomPercent.toFixed(3)}%`);
    setSafeStyle(_cachedBottomContainer, 'bottom', 'auto', 'important');
    setSafeStyle(_cachedBottomContainer, 'width', `${bottomVisualWidthPercent.toFixed(3)}%`, 'important');
    setSafeStyle(_cachedBottomContainer, 'max-width', 'none', 'important');
    setSafeStyle(_cachedBottomContainer, 'left', `${bottomVisualLeftPercent.toFixed(3)}%`, 'important');
    setSafeStyle(_cachedBottomContainer, 'right', 'auto', 'important');
    setSafeStyle(_cachedBottomContainer, 'margin', '0', 'important');
    setSafeStyle(_cachedBottomContainer, 'transform', isTactical ? 'none' : `scale(${hudScale})`);
    setSafeStyle(_cachedBottomContainer, 'transform-origin', 'top center', 'important');
  }

  // 3. Position Health HUD (Snug right below arena bottom wall)
  if (!_cachedContainerBottom) _cachedContainerBottom = document.getElementById('healthHud');
  const healthHud = _cachedContainerBottom;
  if (healthHud) {
    setSafeStyle(healthHud, 'top', `${bottomPercent.toFixed(3)}%`);
    setSafeStyle(healthHud, 'bottom', 'auto', 'important');
    setSafeStyle(healthHud, 'width', `${bottomVisualWidthPercent.toFixed(3)}%`, 'important');
    setSafeStyle(healthHud, 'max-width', 'none', 'important');
    setSafeStyle(healthHud, 'left', `${bottomVisualLeftPercent.toFixed(3)}%`, 'important');
    setSafeStyle(healthHud, 'right', 'auto', 'important');
    setSafeStyle(healthHud, 'margin', '0', 'important');
    setSafeStyle(healthHud, 'transform', isTactical ? 'none' : `scale(${hudScale})`);
    setSafeStyle(healthHud, 'transform-origin', 'top center', 'important');
  }

  // 4. Position Side HUD Containers for Horizontal 1v1 Mode
  if (!_cachedContainerLeft) _cachedContainerLeft = document.getElementById('healthHudLeft');
  if (!_cachedContainerRight) _cachedContainerRight = document.getElementById('healthHudRight');

  if (isHorizontal) {
    const sideTopRatio = ((arena.y + 38) / canvasHeight);
    const sideTopPx = canvasTopInBox + canvasRect.height * sideTopRatio;
    const sideTopPercent = (sideTopPx / boxRect.height) * 100;

    const sideWidthPx = 244;
    const sideWidthPercent = (sideWidthPx / canvasWidth) * 100;

    if (_cachedContainerLeft) {
      setSafeStyle(_cachedContainerLeft, 'top', `${sideTopPercent.toFixed(3)}%`);
      setSafeStyle(_cachedContainerLeft, 'left', `18px`, 'important');
      setSafeStyle(_cachedContainerLeft, 'right', 'auto', 'important');
      setSafeStyle(_cachedContainerLeft, 'width', `${sideWidthPercent.toFixed(3)}%`, 'important');
      setSafeStyle(_cachedContainerLeft, 'max-width', 'none', 'important');
    }
    if (_cachedContainerRight) {
      setSafeStyle(_cachedContainerRight, 'top', `${sideTopPercent.toFixed(3)}%`);
      setSafeStyle(_cachedContainerRight, 'right', `18px`, 'important');
      setSafeStyle(_cachedContainerRight, 'left', 'auto', 'important');
      setSafeStyle(_cachedContainerRight, 'width', `${sideWidthPercent.toFixed(3)}%`, 'important');
      setSafeStyle(_cachedContainerRight, 'max-width', 'none', 'important');
    }
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
 * Dynamically updates the Top HUD Container (#hudTopContainer) position & transform
 * to remain anchored to the arena top edge when fixed camera zooms, dynamic camera tracks, or screen shakes.
 */
export function updateTopHudCameraTracking(topContainer) {
  if (!topContainer) return;
  if (!_cachedGameBox) _cachedGameBox = document.querySelector('.game-box');
  if (!_cachedPixiView) _cachedPixiView = _cachedGameBox?.querySelector('canvas') || document.getElementById('arena');
  if (!_cachedGameBox || !_cachedPixiView) return;

  const canvasWidth = (typeof state !== 'undefined' && state.canvas && state.canvas.width) || CONFIG.canvasWidth || 540;
  const canvasHeight = (typeof state !== 'undefined' && state.canvas && state.canvas.height) || CONFIG.canvasHeight || 960;
  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
  const arenaCenterX = arena.x + arena.width / 2;
  const arenaCenterY = arena.y + arena.height / 2;
  const screenCenterY = arenaCenterY;

  const cam = (typeof state !== 'undefined') ? state.camera : null;
  const isFixed = Boolean(!cam || !cam.enabled || cam.mode === 'fixed');
  const camZoom = cam ? (cam.zoom || 1.0) : 1.0;


  const isHorizontal = Boolean(typeof state !== 'undefined' && state.viewOrientation === 'horizontal');
  const scale = CONFIG.internalScale || 1.0;
  const baseHudScale = isHorizontal ? 0.80 : (scale * 0.9);

  const is1v2 = Boolean(
    typeof state !== 'undefined' && (
      state.mode === 'Boss Battle' ||
      state.mode === '1v2 Stand Off' ||
      state.mode === '1v2' ||
      state.mode === 'Stand Off 1v2' ||
      (typeof GAME_MODES !== 'undefined' && (state.mode === GAME_MODES.BOSS_BATTLE || state.mode === GAME_MODES.STAND_OFF_1V2))
    )
  );

  if (_cachedBoxHeight <= 0 || _cachedCanvasHeight <= 0) {
    syncHudPosition();
    if (_cachedBoxHeight <= 0 || _cachedCanvasHeight <= 0) return;
  }

  const boxHeight = _cachedBoxHeight;
  const canvasHeightPx = _cachedCanvasHeight;
  const canvasWidthPx = _cachedCanvasWidth;
  const canvasTopInBox = _cachedCanvasTopInBox;
  const topOffsetPx = isHorizontal ? 28 : (is1v2 ? 100 : 90);

  const camX = isFixed ? arenaCenterX : (cam ? cam.x : arenaCenterX);
  const camY = isFixed ? arenaCenterY : (cam ? cam.y : arenaCenterY);

  const screenArenaTop = screenCenterY + (arena.y - camY) * camZoom;
  const hudTopCanvasY = screenArenaTop - (topOffsetPx * camZoom);
  const effectiveHudScale = baseHudScale * camZoom;

  const hudTopPxInBox = canvasTopInBox + (canvasHeightPx * (hudTopCanvasY / canvasHeight));
  const hudTopPercent = (hudTopPxInBox / boxHeight) * 100;

  const displayRatio = canvasWidthPx / canvasWidth;
  const panOffsetX = (arenaCenterX - camX) * camZoom;
  const shakeX = ((cam ? cam.shakeX : (state ? state.shakeX : 0)) || 0);
  const shakeY = ((cam ? cam.shakeY : (state ? state.shakeY : 0)) || 0);

  const totalTranslateX = (panOffsetX + shakeX) * displayRatio;
  const totalTranslateY = shakeY * displayRatio;

  setSafeStyle(topContainer, 'top', `${hudTopPercent.toFixed(3)}%`);
  setSafeStyle(topContainer, 'transform', `translate(${totalTranslateX.toFixed(2)}px, ${totalTranslateY.toFixed(2)}px) scale(${effectiveHudScale.toFixed(4)})`, 'important');
  setSafeStyle(topContainer, 'transform-origin', 'top center', 'important');
}

let _lastBottomHudStyle = '';

/**
 * Dynamically ensures the Bottom HUD Container (#healthHud and #hudBottomContainer)
 * remains strictly screen-locked in viewport space with ZERO camera tracking drift or arena tethering.
 */
export function updateBottomHudCameraTracking(bottomContainer) {
  if (!bottomContainer) return;

  const isHorizontal = Boolean(typeof state !== 'undefined' && state.viewOrientation === 'horizontal');
  const scale = CONFIG.internalScale || 1.0;
  const baseHudScale = isHorizontal ? 0.80 : (scale * 0.9);
  const curStyle = `${baseHudScale}`;
  if (_lastBottomHudStyle === curStyle) return;
  _lastBottomHudStyle = curStyle;

  setSafeStyle(bottomContainer, 'bottom', 'auto', 'important');
  setSafeStyle(bottomContainer, 'transform', `scale(${baseHudScale})`, 'important');
  setSafeStyle(bottomContainer, 'transform-origin', 'top center', 'important');
}
