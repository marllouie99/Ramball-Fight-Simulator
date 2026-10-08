import { state } from './state.js';
import { CONFIG } from './config.js';
import { resetCamera } from '../systems/cameraSystem.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * VIEWPORT MANAGER
 * Handles dynamic switching between Vertical View (9:16 Portrait - 540x960)
 * for YouTube Shorts / Mobile and Horizontal View (16:9 Landscape - 960x540)
 * for Longform YouTube Videos / Grand Teamfights with zero page reloads.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const VIEWPORT_MODES = {
  VERTICAL: 'vertical',
  HORIZONTAL: 'horizontal',
};

export const VIEWPORT_CONFIGS = {
  [VIEWPORT_MODES.VERTICAL]: {
    width: 540,
    height: 960,
    arena: { x: 45, y: 240, width: 450, height: 450, wallWidth: 4, shape: 'rect' },
    label: '📱 Vertical (9:16 Shorts)',
  },
  [VIEWPORT_MODES.HORIZONTAL]: {
    width: 960,
    height: 540,
    arena: { x: 280, y: 70, width: 400, height: 400, wallWidth: 4, shape: 'rect' },
    grandArena: { x: -220, y: -430, width: 1400, height: 1400, wallWidth: 4, shape: 'rect' },
    label: '🖥️ Horizontal (16:9 Widescreen)',
  },
};

/**
 * Helper to check if the current or target game mode is a multi-team grand battle.
 */
export function isGrandBattleMode(mode) {
  const m = mode || (typeof state !== 'undefined' ? state.mode : '');
  return Boolean(
    m === '3v3v3v3' ||
    m === '2v2v2v2' ||
    m === '4v4' ||
    m === 'Battle Royale 8' ||
    m === '8-Fighter Battle Royale' ||
    m === '3v3v3v3 Teamfight' ||
    m === '4v4 Grand War' ||
    m === '2v2v2v2 Quad Battle' ||
    m === '2v2v2v2 Quad' ||
    m === 'Grand Colosseum' ||
    m === 'Classic Minimalist Arena'
  );
}

/**
 * Resolves the appropriate arena geometry for a given mode and orientation.
 */
export function getArenaConfigForMode(mode, orientation) {
  const isH = (orientation === VIEWPORT_MODES.HORIZONTAL || (typeof state !== 'undefined' && state.viewOrientation === VIEWPORT_MODES.HORIZONTAL));
  if (isH) {
    return isGrandBattleMode(mode)
      ? { ...VIEWPORT_CONFIGS[VIEWPORT_MODES.HORIZONTAL].grandArena }
      : { ...VIEWPORT_CONFIGS[VIEWPORT_MODES.HORIZONTAL].arena };
  }
  return { ...VIEWPORT_CONFIGS[VIEWPORT_MODES.VERTICAL].arena };
}

/**
 * Gets current active viewport mode ('vertical' | 'horizontal').
 */
export function getViewportOrientation() {
  if (typeof state !== 'undefined' && state.viewOrientation) {
    return state.viewOrientation;
  }
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('ramball_viewport_orientation');
    if (saved === VIEWPORT_MODES.HORIZONTAL || saved === VIEWPORT_MODES.VERTICAL) {
      return saved;
    }
  }
  return VIEWPORT_MODES.VERTICAL;
}

/**
 * Sets active viewport mode and resizes all canvases, rendering layers, and UI containers.
 */
export function setViewportOrientation(mode) {
  const targetMode = (mode === VIEWPORT_MODES.HORIZONTAL) ? VIEWPORT_MODES.HORIZONTAL : VIEWPORT_MODES.VERTICAL;
  const cfg = VIEWPORT_CONFIGS[targetMode];

  state.viewOrientation = targetMode;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('ramball_viewport_orientation', targetMode);
  }

  // Determine arena geometry based on mode & orientation
  const isGrand = isGrandBattleMode(state.mode);
  const activeArena = (targetMode === VIEWPORT_MODES.HORIZONTAL && isGrand)
    ? { ...cfg.grandArena }
    : { ...cfg.arena };

  // Update logical config dimensions
  CONFIG.canvasWidth = cfg.width;
  CONFIG.canvasHeight = cfg.height;
  CONFIG.arena = { ...activeArena };
  state.arena = { ...activeArena };

  // Resize main 2D and WebGL render targets
  const canvas = state.canvas || (typeof document !== 'undefined' ? document.getElementById('arena') : null);
  if (canvas) {
    canvas.width = cfg.width;
    canvas.height = cfg.height;
  }

  if (state.floatingTextCanvas) {
    state.floatingTextCanvas.width = cfg.width;
    state.floatingTextCanvas.height = cfg.height;
  }

  if (state.topLevelUiCanvas) {
    state.topLevelUiCanvas.width = cfg.width;
    state.topLevelUiCanvas.height = cfg.height;
  }

  // Resize PixiJS WebGL viewport if active
  if (state.pixiApp && state.pixiApp.renderer && typeof state.pixiApp.renderer.resize === 'function') {
    state.pixiApp.renderer.resize(cfg.width, cfg.height);
  }

  // Synchronize PixiJS canvas textures immediately to prevent WebGL texSubImage2D overflow
  syncPixiCanvasTextureSize(state.legacyCanvasSprite, canvas);
  syncPixiCanvasTextureSize(state.floatingTextSprite, state.floatingTextCanvas);
  syncPixiCanvasTextureSize(state.topLevelUiSprite, state.topLevelUiCanvas);

  // Invalidate cached arena backgrounds so they re-render at the new aspect ratio
  state._arenaBorderCanvas = null;
  state._arenaOuterDetailsCanvas = null;

  // Toggle DOM styling classes
  if (typeof document !== 'undefined') {
    const isH = (targetMode === VIEWPORT_MODES.HORIZONTAL);
    const container = document.querySelector('.game-container');
    const box = document.querySelector('.game-box');

    const topCanvas = state.topLevelUiCanvas || (typeof document !== 'undefined' ? document.getElementById('topLevelUiCanvas') : null);
    const floatCanvas = state.floatingTextCanvas || (typeof document !== 'undefined' ? document.getElementById('floatingTextCanvas') : null);

    if (isH) {
      document.documentElement.classList.add('horizontal-viewport-mode');
      document.body.classList.add('horizontal-viewport-mode');
      if (container) {
        container.classList.add('horizontal-mode');
        container.style.width = '960px';
        container.style.height = '540px';
      }
      if (box) {
        box.classList.add('horizontal-mode');
        box.style.width = '960px';
        box.style.height = '540px';
        box.style.aspectRatio = '16 / 9';
      }
      if (canvas) {
        canvas.classList.add('horizontal-mode');
        canvas.style.width = '960px';
        canvas.style.height = '540px';
      }
      if (topCanvas) {
        topCanvas.classList.add('horizontal-mode');
        topCanvas.style.width = '960px';
        topCanvas.style.height = '540px';
      }
      if (floatCanvas) {
        floatCanvas.classList.add('horizontal-mode');
        floatCanvas.style.width = '960px';
        floatCanvas.style.height = '540px';
      }
    } else {
      document.documentElement.classList.remove('horizontal-viewport-mode');
      document.body.classList.remove('horizontal-viewport-mode');
      if (container) {
        container.classList.remove('horizontal-mode');
        container.style.width = '540px';
        container.style.height = '960px';
      }
      if (box) {
        box.classList.remove('horizontal-mode');
        box.style.width = '540px';
        box.style.height = '960px';
        box.style.aspectRatio = '540 / 960';
      }
      if (canvas) {
        canvas.classList.remove('horizontal-mode');
        canvas.style.width = '540px';
        canvas.style.height = '960px';
      }
      if (topCanvas) {
        topCanvas.classList.remove('horizontal-mode');
        topCanvas.style.width = '540px';
        topCanvas.style.height = '960px';
      }
      if (floatCanvas) {
        floatCanvas.classList.remove('horizontal-mode');
        floatCanvas.style.width = '540px';
        floatCanvas.style.height = '960px';
      }
    }

    // Always enable and trigger aspect scaling so the window auto-adjusts immediately
    if (state) {
      state.aspectScalingMode = 'fit';
    }
    if (typeof window !== 'undefined' && typeof window.updateAspectScaling === 'function') {
      window.updateAspectScaling();
    }
  }

  // Recenter and normalize camera
  resetCamera(true);

  // Clear and rebuild health HUD for new orientation
  import('../graphics/hudManager.js').then(m => m.clearHealthHud && m.clearHealthHud()).catch(() => {});

  // Notify Electron desktop main process to resize physical OS window to 16:9 / 9:16
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.setWindowOrientation === 'function') {
    window.electronAPI.setWindowOrientation(targetMode);
  }

  // Dispatch event for UI listeners
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('viewportOrientationChanged', { detail: { mode: targetMode, config: cfg } }));
  }

  return targetMode;
}

/**
 * Toggles between Vertical and Horizontal viewport mode.
 */
export function toggleViewportOrientation() {
  const current = getViewportOrientation();
  const next = (current === VIEWPORT_MODES.HORIZONTAL) ? VIEWPORT_MODES.VERTICAL : VIEWPORT_MODES.HORIZONTAL;
  return setViewportOrientation(next);
}

/**
 * Safely synchronizes PixiJS Canvas texture and BaseTexture dimensions
 * to match source canvas dimensions and prevent WebGL texSubImage2D dimension overflows.
 */
export function syncPixiCanvasTextureSize(sprite, targetCanvas) {
  if (!sprite || !sprite.texture || !targetCanvas) return;
  const tex = sprite.texture;
  const base = tex.baseTexture;
  if (!base) return;

  const w = targetCanvas.width;
  const h = targetCanvas.height;
  if (base.width !== w || base.height !== h || (base.resource && (base.resource.width !== w || base.resource.height !== h))) {
    if (base.resource && typeof base.resource.resize === 'function') {
      base.resource.resize(w, h);
    }
    if (typeof base.setSize === 'function') {
      base.setSize(w, h);
    }
    if (tex.trim && typeof tex.trim === 'object') {
      tex.trim.width = w;
      tex.trim.height = h;
    }
    if (tex.orig && typeof tex.orig === 'object') {
      tex.orig.width = w;
      tex.orig.height = h;
    }
    if (tex._frame && typeof tex._frame === 'object') {
      tex._frame.width = w;
      tex._frame.height = h;
    }
    if (typeof base.update === 'function') {
      base.update();
    }
  }
}


