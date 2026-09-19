// ─────────────────────────────────────────────
// MAIN — Entry point for the ES6 module build
// ─────────────────────────────────────────────

import { state, loadFighterSelections, saveFighterSelections } from './state.js';
import { initFlameCanvas, resizeFlameCanvas } from '../graphics/canvasManager.js';
import { startGame, startNextRound, resetMatchWithRandom1v1Fighters, resetMatchWithRandom1v2Fighters, startRandomStandoffBattle, restartCurrentRound, resetMatch, proceedFromFaceOffToCountdown, preloadGameSounds } from './gameFlow.js';
import { FIGHTER_DEFS, CONFIG } from './config.js';
import { handleUIClick, handleUIMove, captureFaceOffScreenshot } from '../graphics/ui.js';
import { stopAllSounds, stopAllLoopingSounds, unlockAudio } from '../systems/soundSystem.js';
import { getSelectedArenaBgmTrack, cycleNextArenaBgmTrack } from '../systems/arenaBgmSystem.js';
import { initGraphicsCache } from '../graphics/graphicsCache.js';
import { syncHudPosition } from '../graphics/ui/hudLayout.js';
import { clearHealthHud } from '../graphics/hudManager.js';
import { getTacticalIcon } from '../graphics/ui/tacticalIcons.js';
import { GAME_MODES } from './modeConfig.js';
import { STARTER_MAP } from '../../Tactical Force/maps/index.js';
import { toggleCameraMode } from '../systems/cameraSystem.js';
import { BalanceManager } from '../configs/balanceManager.js';
// ─────────────────────────────────────────────
// FLAME CANVAS INITIALIZATION
// ─────────────────────────────────────────────
initFlameCanvas();
resizeFlameCanvas();

// ─────────────────────────────────────────────
// GRAPHICS CACHE & FONT INITIALIZATION
// ─────────────────────────────────────────────
initGraphicsCache();

// Pre-render PixiJS stage once during startup to pre-compile WebGL shaders and initialize GPU pipelines
if (state.pixiApp && typeof state.pixiApp.render === 'function') {
  try {
    state.pixiApp.render();
  } catch (e) {}
}

// Proactively preload all game sound effects and tracks lazily in background idle time
preloadGameSounds(true).catch((e) => console.warn('Audio preloading warning:', e));

if (typeof document !== 'undefined' && 'fonts' in document) {
  try {
    document.fonts.load('48px "Pricedown"').catch((e) => console.warn('Pricedown font load warning:', e));
  } catch (e) {
    console.warn('FontFace error:', e);
  }
}

// ─────────────────────────────────────────────
// RESPONSIVE VIEWPORT ENGINE & AUTO-FITTING
// ─────────────────────────────────────────────
export function fitGameToViewport() {
  const container = document.querySelector('.game-container');
  if (!container) return;
  const targetW = 540;
  const targetH = 960;

  container.style.width = `${targetW}px`;
  container.style.height = `${targetH}px`;

  const windowW = window.innerWidth;
  const windowH = window.innerHeight;

  // Scale uniformly to fit within viewport without clipping
  const scale = Math.min(windowW / targetW, windowH / targetH);
  if (Math.abs(scale - 1.0) < 0.005) {
    container.style.transform = 'none';
  } else {
    container.style.transform = `scale(${scale})`;
  }
  container.style.transformOrigin = 'center center';
}

// Initial viewport auto-fit
fitGameToViewport();

// Handle window resize & orientation changes across all devices
window.addEventListener('resize', () => {
  resizeFlameCanvas();
  fitGameToViewport();
});
window.addEventListener('orientationchange', () => {
  setTimeout(fitGameToViewport, 60);
});
if (typeof window !== 'undefined' && window.visualViewport) {
  window.visualViewport.addEventListener('resize', fitGameToViewport);
}

// Universal one-shot audio unlock for mobile Safari / Android Chrome
const _unlockAudioOnce = () => {
  unlockAudio();
};
['touchstart', 'touchend', 'pointerdown', 'click', 'keydown'].forEach(evt => {
  window.addEventListener(evt, _unlockAudioOnce, { passive: true, once: true });
});

// ─────────────────────────────────────────────
// INPUT HANDLING
// ─────────────────────────────────────────────

let activeTacticalAction = 'mode-1v1';

window.addEventListener('keydown', (e) => {
  unlockAudio();

  if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
    if (state.gameState === 'faceoff') {
      state.gameState = 'select';
      return;
    }
    if (state.gameState === 'playing' || state.gameState === 'countdown') {
      state.previousGameState = state.gameState;
      state.gameState = 'paused';
    } else if (state.gameState === 'paused') {
      state.gameState = state.previousGameState || 'playing';
    }
  } else if (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 's') {
    if (state.gameState === 'faceoff') {
      if (e.key.toLowerCase() === 's') {
        captureFaceOffScreenshot();
      } else {
        proceedFromFaceOffToCountdown();
      }
      return;
    }
    if (state.gameState === 'title') {
      const targetAction = activeTacticalAction || ((state.gameCategory === 'tactical') ? 'tactical-ffa' : 'mode-1v1');
      executeTacticalAction(targetAction);
      return;
    }
    else if (state.gameState === 'select') startGame();
    else if (state.gameState === 'roundEnd') startNextRound();
    else if (state.gameState === 'matchEnd') {
      if (state.mode === '1v2 Stand Off') resetMatchWithRandom1v2Fighters();
      else if (state.mode === '1v1' || state.mode === 'Stand Off') resetMatchWithRandom1v1Fighters();
      else resetMatch();
    }
  } else if (e.key.toLowerCase() === 'c') {
    if (state.gameState === 'faceoff') {
      state.faceOffCleanMode = !state.faceOffCleanMode;
      return;
    }
    if (state.allFpsLogs && state.allFpsLogs.length > 0) {
      const logText = state.allFpsLogs.join('\n');
      navigator.clipboard.writeText(logText).catch(err => console.error('Failed to copy logs:', err));
      state.fpsLogsCopiedTimer = 120; // Show copied message for 2 seconds
    }
  } else if (e.key.toLowerCase() === 't') {
    if (state.gameState === 'faceoff') {
      const themes = ['neon', 'manga', 'arena'];
      const nextIdx = (themes.indexOf(state.faceOffTheme || 'neon') + 1) % themes.length;
      state.faceOffTheme = themes[nextIdx];
      return;
    }
    // DEBUG: Press 'T' to trigger Gojo's RCT aura (for testing visual effect)
    if (state.gameState === 'playing' && state.fighters) {
      state.fighters.forEach(fighter => {
        if (fighter && fighter._def && fighter._def.type === 'gojo') {
          fighter.healingAuraTimer = 180;
          console.log('[DEBUG] Triggering Gojo RCT aura...');
        }
      });
    }
  } else if (e.key.toLowerCase() === 'r') {
    if (state.gameState === 'playing' || state.gameState === 'roundEnd') {
      restartCurrentRound();
    } else if (state.gameState === 'matchEnd') {
      resetMatch();
    }
  } else if (e.key.toLowerCase() === 'h') {
    state.hideFpsLogs = !state.hideFpsLogs;
  } else if (e.key.toLowerCase() === 'v') {
    toggleCameraMode();
  }
});

const inputTarget = state.pixiApp ? state.pixiApp.view : state.canvas;

inputTarget.addEventListener('mousedown', (e) => {
  const rect = inputTarget.getBoundingClientRect();
  const scaleX = state.canvas.width / rect.width;
  const scaleY = state.canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  if (state.gameState === 'paused') {
    const cx = state.pauseMenuX !== undefined ? state.pauseMenuX : state.canvas.width / 2;
    const cy = state.pauseMenuY !== undefined ? state.pauseMenuY : 180;
    const panelW = 260;
    const panelH = 280;
    const px = cx - panelW / 2;
    const py = cy - panelH / 2;

    if (mx >= px && mx <= px + panelW && my >= py && my <= py + panelH) {
      state.isDraggingPauseMenu = true;
      state.pauseMenuDragOffset = { x: mx - cx, y: my - cy };
    }
  }
});

inputTarget.addEventListener('mousemove', (e) => {
  const rect = inputTarget.getBoundingClientRect();
  // Handle scaling if CSS sizes canvas differently
  const scaleX = state.canvas.width / rect.width;
  const scaleY = state.canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  if (state.isDraggingPauseMenu && state.gameState === 'paused') {
    const offsetX = state.pauseMenuDragOffset ? state.pauseMenuDragOffset.x : 0;
    const offsetY = state.pauseMenuDragOffset ? state.pauseMenuDragOffset.y : 0;
    state.pauseMenuX = Math.max(130, Math.min(state.canvas.width - 130, mx - offsetX));
    state.pauseMenuY = Math.max(140, Math.min(state.canvas.height - 140, my - offsetY));
    state.canvas.style.cursor = 'grabbing';
    return;
  }

  handleUIMove(mx, my);

  if (state.gameState === 'paused' && !state.isDraggingPauseMenu) {
    const cx = state.pauseMenuX !== undefined ? state.pauseMenuX : state.canvas.width / 2;
    const cy = state.pauseMenuY !== undefined ? state.pauseMenuY : 180;
    const panelW = 260;
    const panelH = 280;
    const px = cx - panelW / 2;
    const py = cy - panelH / 2;
    if (mx >= px && mx <= px + panelW && my >= py && my <= py + panelH) {
      if (state.canvas.style.cursor === 'default') {
        state.canvas.style.cursor = 'grab';
      }
    }
  }
});

window.addEventListener('mouseup', () => {
  state.isDraggingPauseMenu = false;
});

let _lastTouchTapTime = 0;
let _touchStartX = 0;
let _touchStartY = 0;
let _touchStartTime = 0;

inputTarget.addEventListener('touchstart', (e) => {
  unlockAudio();
  if (e.touches && e.touches.length === 1) {
    _touchStartX = e.touches[0].clientX;
    _touchStartY = e.touches[0].clientY;
    _touchStartTime = Date.now();

    if (state.gameState === 'paused') {
      const rect = inputTarget.getBoundingClientRect();
      const scaleX = state.canvas.width / rect.width;
      const scaleY = state.canvas.height / rect.height;
      const mx = (_touchStartX - rect.left) * scaleX;
      const my = (_touchStartY - rect.top) * scaleY;
      const cx = state.pauseMenuX !== undefined ? state.pauseMenuX : state.canvas.width / 2;
      const cy = state.pauseMenuY !== undefined ? state.pauseMenuY : 180;
      const panelW = 260;
      const panelH = 280;
      const px = cx - panelW / 2;
      const py = cy - panelH / 2;

      if (mx >= px && mx <= px + panelW && my >= py && my <= py + panelH) {
        state.isDraggingPauseMenu = true;
        state.pauseMenuDragOffset = { x: mx - cx, y: my - cy };
      }
    }
  }
}, { passive: true });

inputTarget.addEventListener('touchmove', (e) => {
  if (e.touches && e.touches.length === 1) {
    const rect = inputTarget.getBoundingClientRect();
    const scaleX = state.canvas.width / rect.width;
    const scaleY = state.canvas.height / rect.height;
    const mx = (e.touches[0].clientX - rect.left) * scaleX;
    const my = (e.touches[0].clientY - rect.top) * scaleY;

    if (state.isDraggingPauseMenu && state.gameState === 'paused') {
      if (e.cancelable) e.preventDefault();
      const offsetX = state.pauseMenuDragOffset ? state.pauseMenuDragOffset.x : 0;
      const offsetY = state.pauseMenuDragOffset ? state.pauseMenuDragOffset.y : 0;
      state.pauseMenuX = Math.max(130, Math.min(state.canvas.width - 130, mx - offsetX));
      state.pauseMenuY = Math.max(140, Math.min(state.canvas.height - 140, my - offsetY));
      return;
    }
  }
}, { passive: false });

inputTarget.addEventListener('touchend', (e) => {
  if (state.isDraggingPauseMenu) {
    state.isDraggingPauseMenu = false;
    return;
  }
  if (e.changedTouches && e.changedTouches.length === 1) {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - _touchStartX;
    const dy = touch.clientY - _touchStartY;
    const dist = Math.hypot(dx, dy);
    const duration = Date.now() - _touchStartTime;

    // Detect clean tap (finger moved less than 14px within 500ms)
    if (dist < 14 && duration < 500) {
      const rect = inputTarget.getBoundingClientRect();
      const scaleX = state.canvas.width / rect.width;
      const scaleY = state.canvas.height / rect.height;
      const mx = (touch.clientX - rect.left) * scaleX;
      const my = (touch.clientY - rect.top) * scaleY;

      _lastTouchTapTime = Date.now();
      const clickedButton = handleUIClick(mx, my);
      if (!clickedButton && state.gameState === 'title') {
        stopAllSounds(false, 0, 0);
        stopAllLoopingSounds(0, 0);
        state.gameState = 'select';
      }
    }
  }
}, { passive: true });

inputTarget.addEventListener('click', (e) => {
  unlockAudio();

  // Filter synthetic ghost clicks fired by browsers ~300ms after a touchend tap
  if (Date.now() - _lastTouchTapTime < 450) {
    return;
  }

  const rect = inputTarget.getBoundingClientRect();
  // Handle scaling if CSS sizes canvas differently
  const scaleX = state.canvas.width / rect.width;
  const scaleY = state.canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  const clickedButton = handleUIClick(mx, my);
  if (!clickedButton && state.gameState === 'title') {
    stopAllSounds(false, 0, 0);
    stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  }
});

inputTarget.addEventListener('wheel', (e) => {
  if (state.gameState === 'weapons') {
    e.preventDefault();
    const totalPages = Math.ceil(FIGHTER_DEFS.length / 5);
    if (e.deltaY > 0 && state.weaponPage < totalPages - 1) {
      state.weaponPage++;
    } else if (e.deltaY < 0 && state.weaponPage > 0) {
      state.weaponPage--;
    }
  } else if (state.gameState === 'index') {
    e.preventDefault();
    const filteredDefs = FIGHTER_DEFS.filter(def => 
      !state.indexCategory || state.indexCategory === 'All' || def.category === state.indexCategory
    );
    const totalPages = Math.ceil(filteredDefs.length / 5);
    if (e.deltaY > 0 && state.indexPage < totalPages - 1) {
      state.indexPage++;
    } else if (e.deltaY < 0 && state.indexPage > 0) {
      state.indexPage--;
    }
  }
}, { passive: false });


import { startGameLoop } from '../systems/gameLoop.js';
startGameLoop();

// ─────────────────────────────────────────────
// HTML UI DOM LISTENERS
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// HTML UI DOM LISTENERS: DOOM ETERNAL TACTICAL TERMINAL
// ─────────────────────────────────────────────

// Capture initial light mode colors from CONFIG so custom user configuration is preserved
const _initialLightCanvasBg = CONFIG.canvasBgColor || '#ffffffff';
const _initialLightArenaOuterBg = CONFIG.arenaOuterBgColor || '#fff8ceff';
const _initialLightArenaInnerBg = CONFIG.arenaInnerBgColor || '#ffffffff';
const _initialLightHudTextColor = CONFIG.hudTextColor || '#131313ff';

// Function to apply Arena Theme (Dark / Light)
export function applyArenaTheme(theme) {
  const effectiveTheme = (state.gameCategory === 'tactical') ? 'dark' : theme;
  state.arenaTheme = effectiveTheme;
  CONFIG.arenaTheme = effectiveTheme;
  if (state.gameCategory !== 'tactical') {
    localStorage.setItem('arenaTheme', effectiveTheme);
  }

  const isDark = (effectiveTheme === 'dark');
  CONFIG.canvasBgColor = isDark ? '#000000' : (CONFIG.lightCanvasBgColor || _initialLightCanvasBg);
  CONFIG.arenaOuterBgColor = isDark ? '#000000' : (CONFIG.lightArenaOuterBgColor || _initialLightArenaOuterBg);
  CONFIG.arenaInnerBgColor = isDark ? '#000000' : (CONFIG.lightArenaInnerBgColor || _initialLightArenaInnerBg);
  CONFIG.hudTextColor = isDark ? '#f0f2f5' : (CONFIG.lightHudTextColor || _initialLightHudTextColor);

  // Invalidate cached canvases
  state._arenaBorderCanvas = null;
  state._arenaOuterDetailsCanvas = null;
  state._titleHeaderCanvas = null;
  state._titleHeaderCanvasTheme = null;

  // Toggle DOM classes
  const _themeEls = [
    document.querySelector('.game-container'),
    document.querySelector('.game-box'),
    document.getElementById('hudBottomContainer'),
    document.getElementById('hudTopContainer'),
    document.getElementById('healthHud'),
    document.getElementById('healthHudLeft'),
    document.getElementById('healthHudRight'),
  ];
  _themeEls.forEach(el => {
    if (el) {
      if (isDark) el.classList.add('arena-dark-mode');
      else el.classList.remove('arena-dark-mode');
    }
  });

  const btn = document.getElementById('btn-theme');
  if (btn) {
    btn.innerText = isDark ? 'DARK MODE' : 'LIGHT MODE';
  }

  clearHealthHud();
  syncHudPosition();
}

// Function to sync Cinefilm overlay state
export function updateCinefilmOverlay() {
  const overlay = document.getElementById('cinefilm-overlay');
  const btn = document.getElementById('btn-cinefilm');
  if (overlay) {
    if (state.cinefilmFilter) {
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('active');
    }
  }
  if (btn) {
    btn.innerText = state.cinefilmFilter ? 'ON' : 'OFF';
  }
}

// Initialize System States from localStorage
const savedTheme = localStorage.getItem('arenaTheme') || 'light';
applyArenaTheme(savedTheme);

if (localStorage.getItem('hudShowFighterDescription') !== null) {
  CONFIG.hudShowFighterDescription = localStorage.getItem('hudShowFighterDescription') === 'true';
}

if (localStorage.getItem('darkModeShowHudSkillBars') !== null) {
  CONFIG.darkModeShowHudSkillBars = parseInt(localStorage.getItem('darkModeShowHudSkillBars'), 10);
}

if (localStorage.getItem('darkModeShowHudStats') !== null) {
  CONFIG.darkModeShowHudStats = parseInt(localStorage.getItem('darkModeShowHudStats'), 10);
}

if (localStorage.getItem('hudHideAll') !== null) {
  CONFIG.hudHideAll = localStorage.getItem('hudHideAll') === 'true';
}

if (localStorage.getItem('hudHideHealthBars') !== null) {
  CONFIG.hudHideHealthBars = localStorage.getItem('hudHideHealthBars') === 'true';
}

if (localStorage.getItem('hudHideSkillBars') !== null) {
  CONFIG.hudHideSkillBars = localStorage.getItem('hudHideSkillBars') === 'true';
}

if (localStorage.getItem('hudHideStats') !== null) {
  CONFIG.hudHideStats = localStorage.getItem('hudHideStats') === 'true';
}

if (localStorage.getItem('hudHideOverheadHp') !== null) {
  CONFIG.hudHideOverheadHp = localStorage.getItem('hudHideOverheadHp') === 'true';
}

if (localStorage.getItem('hudSkillBarsMode') !== null) {
  CONFIG.hudSkillBarsMode = localStorage.getItem('hudSkillBarsMode');
} else {
  CONFIG.hudSkillBarsMode = CONFIG.darkModeShowHudSkillBars === 1 ? 'all' : (CONFIG.darkModeShowHudSkillBars === -1 ? 'none' : 'signature');
}

export function syncHudButtons() {
  const masterBtn = document.getElementById('btn-hud-master');
  if (masterBtn) {
    masterBtn.innerText = CONFIG.hudHideAll ? 'HIDDEN' : 'VISIBLE';
  }

  const healthBarsBtn = document.getElementById('btn-hud-healthbars');
  if (healthBarsBtn) {
    healthBarsBtn.innerText = CONFIG.hudHideHealthBars ? 'HIDE' : 'SHOW';
  }

  const skillBarsBtn = document.getElementById('btn-hud-skillbars');
  if (skillBarsBtn) {
    if (CONFIG.hudHideSkillBars || CONFIG.hudSkillBarsMode === 'none' || CONFIG.darkModeShowHudSkillBars === -1) {
      skillBarsBtn.innerText = 'HIDE ALL';
    } else if (CONFIG.hudSkillBarsMode === 'signature' || CONFIG.darkModeShowHudSkillBars === 0) {
      skillBarsBtn.innerText = 'SIGNATURE';
    } else {
      skillBarsBtn.innerText = 'SHOW ALL';
    }
  }

  const darkSkillsBtn = document.getElementById('btn-darkskills');
  if (darkSkillsBtn) {
    if (CONFIG.hudHideSkillBars || CONFIG.hudSkillBarsMode === 'none' || CONFIG.darkModeShowHudSkillBars === -1) {
      darkSkillsBtn.innerText = 'OFF';
    } else if (CONFIG.hudSkillBarsMode === 'signature' || CONFIG.darkModeShowHudSkillBars === 0) {
      darkSkillsBtn.innerText = 'SIGNATURE';
    } else {
      darkSkillsBtn.innerText = 'ON';
    }
  }

  const statsBtn = document.getElementById('btn-hud-stats');
  if (statsBtn) {
    statsBtn.innerText = (CONFIG.hudHideStats || CONFIG.darkModeShowHudStats === 0) ? 'HIDE' : 'SHOW';
  }

  const darkStatsBtn = document.getElementById('btn-darkstats');
  if (darkStatsBtn) {
    darkStatsBtn.innerText = (CONFIG.hudHideStats || CONFIG.darkModeShowHudStats === 0) ? 'OFF' : 'ON';
  }

  const displayModeBtn = document.getElementById('btn-hud-displaymode');
  if (displayModeBtn) {
    displayModeBtn.innerText = CONFIG.hudShowFighterDescription ? 'DESCRIPTION' : 'SKILL BARS';
  }
  const hudModeBtn = document.getElementById('btn-hudmode');
  if (hudModeBtn) {
    hudModeBtn.innerText = CONFIG.hudShowFighterDescription ? 'DESCRIPTION' : 'SKILL BARS';
  }

  const overheadHpBtn = document.getElementById('btn-hud-overheadhp');
  if (overheadHpBtn) {
    overheadHpBtn.innerText = CONFIG.hudHideOverheadHp ? 'HIDE' : 'SHOW';
  }
}

syncHudButtons();

if (localStorage.getItem('showArenaTitle') !== null) {
  CONFIG.showArenaTitle = localStorage.getItem('showArenaTitle') === 'true';
} else {
  CONFIG.showArenaTitle = false;
}
const arenaTitleBtn = document.getElementById('btn-arenatitle');
if (arenaTitleBtn) {
  arenaTitleBtn.innerText = CONFIG.showArenaTitle ? 'ON' : 'OFF';
}

const bgmBtn = document.getElementById('btn-bgm');
if (bgmBtn) {
  bgmBtn.innerText = getSelectedArenaBgmTrack().name;
}

if (localStorage.getItem('todo_enableTakadaBackgroundSong') !== null) {
  if (CONFIG.todo) {
    CONFIG.todo.enableTakadaBackgroundSong = localStorage.getItem('todo_enableTakadaBackgroundSong') === 'true';
  }
}
const todoBgmBtn = document.getElementById('btn-todobgm');
if (todoBgmBtn) {
  todoBgmBtn.innerText = (CONFIG.todo?.enableTakadaBackgroundSong !== false) ? 'ON' : 'OFF';
}

state.performanceMode = localStorage.getItem('performanceMode') === 'true';
const perfBtn = document.getElementById('btn-performance');
if (perfBtn) {
  perfBtn.innerText = state.performanceMode ? 'ON' : 'OFF';
}

const fpsBtn = document.getElementById('btn-fps');
if (fpsBtn) {
  fpsBtn.innerText = state.hideFpsLogs ? 'OFF' : 'ON';
}

const camBtn = document.getElementById('btn-camera');
if (camBtn) {
  const isCamOn = Boolean(state.camera && state.camera.mode === 'dynamic');
  camBtn.innerText = isCamOn ? 'ON' : 'OFF';
}

state.cinefilmFilter = localStorage.getItem('cinefilmFilter') === 'true';
updateCinefilmOverlay();

state.disableDimEffects = localStorage.getItem('disableDimEffects') === 'true';
const dimEffectsBtn = document.getElementById('btn-dimeffects');
if (dimEffectsBtn) {
  dimEffectsBtn.innerText = state.disableDimEffects ? 'OFF' : 'ON';
}

const quickBarBtn = document.getElementById('btn-quickbar');
if (quickBarBtn) {
  quickBarBtn.innerText = (state.quickBarMode || 'auto').toUpperCase();
}

// ─────────────────────────────────────────────
// COMBAT BALANCE & DEBUG MULTIPLIERS ENGINE
// ─────────────────────────────────────────────
const DAMAGE_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const KNOCKBACK_STEPS = [0.25, 0.5, 1.0, 1.5, 2.0];
const SPEED_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5];
const COOLDOWN_STEPS = [0.25, 0.5, 1.0, 1.5, 2.0];

export function cycleMultiplier(current, steps) {
  const idx = steps.findIndex(s => Math.abs(s - current) < 0.05);
  if (idx === -1 || idx === steps.length - 1) return steps[0];
  return steps[idx + 1];
}

export function syncBalanceButtons() {
  const mults = BalanceManager.getGlobalMultipliers();
  
  const dmgBtn = document.getElementById('btn-balance-damage');
  if (dmgBtn) dmgBtn.innerText = `${mults.damageScale.toFixed(2).replace(/\.?0+$/, '')}X`;
  
  const kbBtn = document.getElementById('btn-balance-knockback');
  if (kbBtn) kbBtn.innerText = `${mults.knockbackScale.toFixed(2).replace(/\.?0+$/, '')}X`;
  
  const spdBtn = document.getElementById('btn-balance-speed');
  if (spdBtn) spdBtn.innerText = `${mults.speedScale.toFixed(2).replace(/\.?0+$/, '')}X`;
  
  const cdBtn = document.getElementById('btn-balance-cooldown');
  if (cdBtn) cdBtn.innerText = `${mults.cooldownScale.toFixed(2).replace(/\.?0+$/, '')}X`;

  const debugDmg = document.getElementById('debugValDamage');
  if (debugDmg) debugDmg.innerText = `${mults.damageScale.toFixed(2)}x`;

  const debugKb = document.getElementById('debugValKnockback');
  if (debugKb) debugKb.innerText = `${mults.knockbackScale.toFixed(2)}x`;

  const debugSpd = document.getElementById('debugValSpeed');
  if (debugSpd) debugSpd.innerText = `${mults.speedScale.toFixed(2)}x`;

  const debugCd = document.getElementById('debugValCooldown');
  if (debugCd) debugCd.innerText = `${mults.cooldownScale.toFixed(2)}x`;
}

BalanceManager.subscribe(syncBalanceButtons);
syncBalanceButtons();

export function toggleBalanceDebugOverlay() {
  const overlay = document.getElementById('balanceDebugOverlay');
  if (!overlay) return;
  const isHidden = overlay.style.display === 'none' || !overlay.style.display;
  overlay.style.display = isHidden ? 'block' : 'none';
  if (isHidden) syncBalanceButtons();
}

// Tactical Terminal & Menu Navigation State
export function showMenuView(paneId, playAudio = true) {
  const panes = document.querySelectorAll('.menu-view-pane');
  panes.forEach(p => p.classList.remove('active'));

  const targetPane = document.getElementById(paneId);
  if (targetPane) {
    targetPane.classList.add('active');
  }

  const badge = document.querySelector('.retro-badge-title');
  if (badge) {
    if (paneId === 'menu-view-main') {
      badge.innerText = (state.gameCategory === 'tactical') ? 'Tactical Ops' : 'Operations';
    } else if (paneId === 'menu-view-battle' || paneId === 'menu-view-tactical-battle') {
      badge.innerText = 'Battle Modes';
    } else if (paneId === 'menu-view-arsenal') {
      badge.innerText = 'Arsenal & Studio';
    } else if (paneId === 'menu-view-settings') {
      badge.innerText = 'Settings';
    } else if (paneId === 'menu-view-graphics-settings') {
      badge.innerText = 'Graphics & Visuals';
    } else if (paneId === 'menu-view-hud-settings') {
      badge.innerText = 'HUD & Interface';
    } else if (paneId === 'menu-view-audio-settings') {
      badge.innerText = 'Audio & Soundtrack';
    } else if (paneId === 'menu-view-balance-settings') {
      badge.innerText = 'Combat Tuner';
    } else if (paneId === 'menu-view-system-settings') {
      badge.innerText = 'System & Perf';
    }
  }

  if (playAudio && typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
    audioSystem.playSFX('skill_dash1', 0.2);
  }
}

export function executeTacticalAction(action) {
  if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
    audioSystem.playSFX('skill_dash3', 0.4);
  }

  // Fight of Characters Actions
  if (action === 'mode-1v1') {
    state.gameCategory = 'foc';
    state.mode = GAME_MODES.ONE_VS_ONE || '1v1';
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  } else if (action === 'mode-standoff') {
    state.gameCategory = 'foc';
    state.mode = GAME_MODES.STAND_OFF || 'Stand Off';
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  } else if (action === 'mode-random-standoff') {
    state.gameCategory = 'foc';
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    startRandomStandoffBattle();
  } else if (action === 'mode-2v2') {
    state.gameCategory = 'foc';
    state.mode = GAME_MODES.TWO_VS_TWO || '2v2';
    state.p3Index = state.p3Index ?? 2;
    state.p4Index = state.p4Index ?? 3;
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  } else if (action === 'mode-ffa') {
    state.gameCategory = 'foc';
    state.mode = GAME_MODES.FFA || 'FFA';
    state.p3Index = state.p3Index ?? 2;
    state.p4Index = state.p4Index ?? 3;
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  } else if (action === 'mode-standoff1v2') {
    state.gameCategory = 'foc';
    state.mode = GAME_MODES.STAND_OFF_1V2 || '1v2 Stand Off';
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  } else if (action === 'mode-tagmatch' || action === 'mode-tag') {
    state.gameCategory = 'foc';
    state.mode = GAME_MODES.TAG_MATCH || 'Tag Match';
    state.p3Index = state.p3Index ?? 2;
    state.p4Index = state.p4Index ?? 3;
    state.p5Index = state.p5Index ?? 4;
    state.p6Index = state.p6Index ?? 5;
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  }

  // Tactical Shooter Actions
  else if (action === 'tactical-4v4') {
    state.gameCategory = 'tactical';
    state.mode = GAME_MODES.TACTICAL_4V4 || 'Tactical 4v4';
    loadFighterSelections('tactical');
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  } else if (action === 'tactical-1v1') {
    state.gameCategory = 'tactical';
    state.mode = GAME_MODES.TACTICAL_1V1 || 'Tactical 1v1';
    loadFighterSelections('tactical');
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  } else if (action === 'tactical-standoff') {
    state.gameCategory = 'tactical';
    state.mode = GAME_MODES.TACTICAL_STANDOFF || 'Tactical Stand Off';
    loadFighterSelections('tactical');
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  } else if (action === 'tactical-random') {
    state.gameCategory = 'tactical';
    state.mode = GAME_MODES.TACTICAL_RANDOM || 'Tactical Random';
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    startRandomStandoffBattle();
  } else if (action === 'tactical-2v2') {
    state.gameCategory = 'tactical';
    state.mode = GAME_MODES.TACTICAL_2V2 || 'Tactical 2v2';
    loadFighterSelections('tactical');
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  } else if (action === 'tactical-ffa') {
    state.gameCategory = 'tactical';
    state.mode = GAME_MODES.TACTICAL_FFA || 'Tactical FFA';
    loadFighterSelections('tactical');
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  }

  // Database / Arsenal Screens
  else if (action === 'screen-index') {
    state.gameState = 'index';
  } else if (action === 'screen-weaponstudio') {
    state.gameState = 'weaponStudio';
  } else if (action === 'screen-skinstudio') {
    state.gameState = 'skinStudio';
  } else if (action === 'screen-weapons') {
    state.weaponSelectedFighter = null;
    state.weaponPage = 0;
    state.weaponCategoryTab = (state.gameCategory === 'tactical') ? 'tactical' : 'foc';
    state.gameState = 'weapons';
  } else if (action === 'screen-leaderboard') {
    state.gameState = 'leaderboard';
  }

  // System Configurations
  else if (action === 'open-graphics-settings') {
    showMenuView('menu-view-graphics-settings');
  } else if (action === 'open-audio-settings') {
    showMenuView('menu-view-audio-settings');
  } else if (action === 'open-system-settings') {
    showMenuView('menu-view-system-settings');
  } else if (action === 'toggle-theme') {
    const nextTheme = (state.arenaTheme === 'dark') ? 'light' : 'dark';
    applyArenaTheme(nextTheme);
  } else if (action === 'open-balance-settings') {
    syncBalanceButtons();
    showMenuView('menu-view-balance-settings');
  } else if (action === 'cycle-balance-damage') {
    const cur = BalanceManager.getGlobalMultipliers().damageScale;
    BalanceManager.setGlobalMultiplier('damageScale', cycleMultiplier(cur, DAMAGE_STEPS));
    syncBalanceButtons();
  } else if (action === 'cycle-balance-knockback') {
    const cur = BalanceManager.getGlobalMultipliers().knockbackScale;
    BalanceManager.setGlobalMultiplier('knockbackScale', cycleMultiplier(cur, KNOCKBACK_STEPS));
    syncBalanceButtons();
  } else if (action === 'cycle-balance-speed') {
    const cur = BalanceManager.getGlobalMultipliers().speedScale;
    BalanceManager.setGlobalMultiplier('speedScale', cycleMultiplier(cur, SPEED_STEPS));
    syncBalanceButtons();
  } else if (action === 'cycle-balance-cooldown') {
    const cur = BalanceManager.getGlobalMultipliers().cooldownScale;
    BalanceManager.setGlobalMultiplier('cooldownScale', cycleMultiplier(cur, COOLDOWN_STEPS));
    syncBalanceButtons();
  } else if (action === 'reset-balance-all') {
    BalanceManager.resetGlobalMultipliers();
    syncBalanceButtons();
  } else if (action === 'open-hud-settings') {
    showMenuView('menu-view-hud-settings');
  } else if (action === 'toggle-hud-master') {
    if (CONFIG.hudHideAll) {
      // Switching from HIDDEN to VISIBLE (Enable all HUD elements)
      CONFIG.hudHideAll = false;
      CONFIG.hudHideHealthBars = false;
      CONFIG.hudHideOverheadHp = false;
      CONFIG.hudHideSkillBars = false;
      CONFIG.hudHideStats = false;
      CONFIG.darkModeShowHudStats = 1;
      if (CONFIG.hudSkillBarsMode === 'none' || CONFIG.darkModeShowHudSkillBars === -1) {
        CONFIG.hudSkillBarsMode = 'all';
        CONFIG.darkModeShowHudSkillBars = 1;
      }
      localStorage.setItem('hudHideAll', 'false');
      localStorage.setItem('hudHideHealthBars', 'false');
      localStorage.setItem('hudHideOverheadHp', 'false');
      localStorage.setItem('hudHideSkillBars', 'false');
      localStorage.setItem('hudHideStats', 'false');
      localStorage.setItem('darkModeShowHudStats', '1');
      localStorage.setItem('hudSkillBarsMode', CONFIG.hudSkillBarsMode);
      localStorage.setItem('darkModeShowHudSkillBars', CONFIG.darkModeShowHudSkillBars);
    } else {
      // Switching from VISIBLE to HIDDEN
      CONFIG.hudHideAll = true;
      localStorage.setItem('hudHideAll', 'true');
    }
    syncHudButtons();
  } else if (action === 'toggle-hud-healthbars') {
    CONFIG.hudHideHealthBars = !CONFIG.hudHideHealthBars;
    if (!CONFIG.hudHideHealthBars) {
      CONFIG.hudHideOverheadHp = false;
      localStorage.setItem('hudHideOverheadHp', 'false');
    }
    localStorage.setItem('hudHideHealthBars', CONFIG.hudHideHealthBars);
    syncHudButtons();
  } else if (action === 'toggle-hud-skillbars') {
    if (CONFIG.hudHideSkillBars || CONFIG.hudSkillBarsMode === 'none' || CONFIG.darkModeShowHudSkillBars === -1) {
      CONFIG.hudSkillBarsMode = 'all';
      CONFIG.hudHideSkillBars = false;
      CONFIG.darkModeShowHudSkillBars = 1;
    } else if (CONFIG.hudSkillBarsMode === 'all' || CONFIG.darkModeShowHudSkillBars === 1) {
      CONFIG.hudSkillBarsMode = 'signature';
      CONFIG.hudHideSkillBars = false;
      CONFIG.darkModeShowHudSkillBars = 0;
    } else {
      CONFIG.hudSkillBarsMode = 'none';
      CONFIG.hudHideSkillBars = true;
      CONFIG.darkModeShowHudSkillBars = -1;
    }
    localStorage.setItem('hudSkillBarsMode', CONFIG.hudSkillBarsMode);
    localStorage.setItem('hudHideSkillBars', CONFIG.hudHideSkillBars);
    localStorage.setItem('darkModeShowHudSkillBars', CONFIG.darkModeShowHudSkillBars);
    syncHudButtons();
  } else if (action === 'toggle-hud-stats') {
    CONFIG.hudHideStats = !CONFIG.hudHideStats;
    CONFIG.darkModeShowHudStats = CONFIG.hudHideStats ? 0 : 1;
    localStorage.setItem('hudHideStats', CONFIG.hudHideStats);
    localStorage.setItem('darkModeShowHudStats', CONFIG.darkModeShowHudStats);
    syncHudButtons();
  } else if (action === 'toggle-hud-displaymode' || action === 'toggle-hud') {
    CONFIG.hudShowFighterDescription = !CONFIG.hudShowFighterDescription;
    localStorage.setItem('hudShowFighterDescription', CONFIG.hudShowFighterDescription);
    syncHudButtons();
  } else if (action === 'toggle-hud-overheadhp') {
    CONFIG.hudHideOverheadHp = !CONFIG.hudHideOverheadHp;
    localStorage.setItem('hudHideOverheadHp', CONFIG.hudHideOverheadHp);
    syncHudButtons();
  } else if (action === 'toggle-darkskills') {
    if (CONFIG.hudHideSkillBars || CONFIG.hudSkillBarsMode === 'none' || CONFIG.darkModeShowHudSkillBars === -1) {
      CONFIG.hudSkillBarsMode = 'all';
      CONFIG.hudHideSkillBars = false;
      CONFIG.darkModeShowHudSkillBars = 1;
    } else if (CONFIG.hudSkillBarsMode === 'all' || CONFIG.darkModeShowHudSkillBars === 1) {
      CONFIG.hudSkillBarsMode = 'signature';
      CONFIG.hudHideSkillBars = false;
      CONFIG.darkModeShowHudSkillBars = 0;
    } else {
      CONFIG.hudSkillBarsMode = 'none';
      CONFIG.hudHideSkillBars = true;
      CONFIG.darkModeShowHudSkillBars = -1;
    }
    localStorage.setItem('hudSkillBarsMode', CONFIG.hudSkillBarsMode);
    localStorage.setItem('hudHideSkillBars', CONFIG.hudHideSkillBars);
    localStorage.setItem('darkModeShowHudSkillBars', CONFIG.darkModeShowHudSkillBars);
    syncHudButtons();
  } else if (action === 'toggle-darkstats') {
    CONFIG.hudHideStats = !CONFIG.hudHideStats;
    CONFIG.darkModeShowHudStats = CONFIG.hudHideStats ? 0 : 1;
    localStorage.setItem('hudHideStats', CONFIG.hudHideStats);
    localStorage.setItem('darkModeShowHudStats', CONFIG.darkModeShowHudStats);
    syncHudButtons();
  } else if (action === 'toggle-cinefilm') {
    state.cinefilmFilter = !state.cinefilmFilter;
    localStorage.setItem('cinefilmFilter', state.cinefilmFilter);
    updateCinefilmOverlay();
  } else if (action === 'toggle-dimeffects') {
    state.disableDimEffects = !state.disableDimEffects;
    localStorage.setItem('disableDimEffects', state.disableDimEffects);
    const btn = document.getElementById('btn-dimeffects');
    if (btn) btn.innerText = state.disableDimEffects ? 'OFF' : 'ON';
  } else if (action === 'toggle-perf') {
    state.performanceMode = !state.performanceMode;
    localStorage.setItem('performanceMode', state.performanceMode);
    const btn = document.getElementById('btn-performance');
    if (btn) btn.innerText = state.performanceMode ? 'ON' : 'OFF';
  } else if (action === 'toggle-fps') {
    state.hideFpsLogs = !state.hideFpsLogs;
    localStorage.setItem('hideFpsLogs', state.hideFpsLogs);
    const btn = document.getElementById('btn-fps');
    if (btn) btn.innerText = state.hideFpsLogs ? 'OFF' : 'ON';
  } else if (action === 'toggle-camera') {
    toggleCameraMode();
    const btn = document.getElementById('btn-camera');
    if (btn) btn.innerText = (state.camera.mode === 'dynamic') ? 'ON' : 'OFF';
  } else if (action === 'toggle-quickbar') {
    const modes = ['auto', 'off', 'on'];
    const curIdx = modes.indexOf(state.quickBarMode || 'auto');
    const nextMode = modes[(curIdx + 1) % modes.length];
    state.quickBarMode = nextMode;
    localStorage.setItem('quickBarMode', nextMode);
    const btn = document.getElementById('btn-quickbar');
    if (btn) btn.innerText = nextMode.toUpperCase();
    syncMobileQuickBar();
  } else if (action === 'toggle-testmode') {
    state.testMode = !state.testMode;
    const btn = document.getElementById('btn-testmode');
    if (btn) btn.innerText = state.testMode ? 'ON' : 'OFF';
  } else if (action === 'toggle-arenatitle') {
    CONFIG.showArenaTitle = !CONFIG.showArenaTitle;
    localStorage.setItem('showArenaTitle', CONFIG.showArenaTitle);
    const btn = document.getElementById('btn-arenatitle');
    if (btn) btn.innerText = CONFIG.showArenaTitle ? 'ON' : 'OFF';
  } else if (action === 'toggle-todobgm') {
    const isEnabled = CONFIG.todo?.enableTakadaBackgroundSong !== false;
    if (CONFIG.todo) {
      CONFIG.todo.enableTakadaBackgroundSong = !isEnabled;
    }
    localStorage.setItem('todo_enableTakadaBackgroundSong', (!isEnabled).toString());
    const btn = document.getElementById('btn-todobgm');
    if (btn) btn.innerText = (!isEnabled) ? 'ON' : 'OFF';
  }
}

// ─────────────────────────────────────────────
// GAME HUB SWITCHER
// ─────────────────────────────────────────────
export function switchGameHub(hub, playAudio = true) {
  state.gameCategory = hub;

  const tileBattleTitle = document.getElementById('tile-battle-title');
  const tileBattleSubtitle = document.getElementById('tile-battle-subtitle');
  const tileArsenalTitle = document.getElementById('tile-arsenal-title');
  const tileArsenalSubtitle = document.getElementById('tile-arsenal-subtitle');
  const tileIndexTitle = document.getElementById('tile-index-title');
  const tileIndexSubtitle = document.getElementById('tile-index-subtitle');
  const tileHubTitle = document.getElementById('tile-hub-title');
  const tileHubSubtitle = document.getElementById('tile-hub-subtitle');
  const tileHubIcon = document.getElementById('tile-hub-icon');
  const cardArsenalTitle = document.getElementById('card-arsenal-title');
  const cardArsenalSubtitle = document.getElementById('card-arsenal-subtitle');
  const cardStudioWrap = document.getElementById('card-studio-wrap');
  const cardSkinStudioWrap = document.getElementById('card-skinstudio-wrap');
  const titleScreen = document.getElementById('title-screen');
  const badge = document.querySelector('.retro-badge-title');

  if (hub === 'tactical') {
    state.mode = GAME_MODES.TACTICAL_FFA || 'Tactical FFA';
    state.arena = { ...STARTER_MAP.arena };
    loadFighterSelections('tactical');
    activeTacticalAction = 'tactical-ffa';
    titleScreen?.classList.add('hub-tactical');
    if (badge) badge.innerText = 'Tactical Ops';
    if (tileBattleTitle) tileBattleTitle.innerText = 'FIREFIGHT';
    if (tileBattleSubtitle) tileBattleSubtitle.innerText = 'BALLISTIC MODES';
    if (tileArsenalTitle) tileArsenalTitle.innerText = 'ARMORY';
    if (tileArsenalSubtitle) tileArsenalSubtitle.innerText = 'FIREARMS & STATS';
    if (tileIndexTitle) tileIndexTitle.innerText = 'ROSTER';
    if (tileIndexSubtitle) tileIndexSubtitle.innerText = 'GUNSLINGERS';
    if (tileHubTitle) tileHubTitle.innerText = 'ANIME BRAWL';
    if (tileHubSubtitle) tileHubSubtitle.innerText = 'SWITCH HUB';
    if (tileHubIcon) {
      tileHubIcon.innerHTML = `<svg class="pixel-icon" viewBox="0 0 16 16" width="26" height="26" fill="none" shape-rendering="crispEdges">
        <path d="M2 1h3v1h1v1h1v1h1v1h1v1h1v1h1v2h1v1h2v1h1v3h-3v-1h-1v-2h-1v-1h-1V9H8V8H7V7H6V6H5V5H4V4H3V3H2V1z" fill="#ffffff"/>
        <path d="M14 1h-3v1h-1v1h-1v1H8v1H7v1H6v1H5v1H4v2H3v1H1v1H0v3h3v-1h1v-2h1v-1h1V9h1V8h1V7h1V6h1V5h1V4h1V3h1V1h-2z" fill="#ffffff"/>
        <path d="M3 2h1v1h1v1h1v1h1v1h1v1h-1v1H6V7H5V6H4V5H3V2z" fill="#ffd1dc"/>
        <path d="M13 2h-1v1h-1v1h-1v1H9v1H8v1h1v1h1V7h1V6h1V5h1V2z" fill="#ffd1dc"/>
        <path d="M7 7h2v2H7z" fill="#ff99af"/>
        <path d="M1 14h2v1H1z M13 14h2v1h-2z" fill="#21050c"/>
      </svg>`;
    }
    if (cardArsenalTitle) cardArsenalTitle.innerText = 'FIREARMS ARMORY';
    if (cardArsenalSubtitle) cardArsenalSubtitle.innerText = 'BALLISTICS & SKINS';
    if (cardStudioWrap) cardStudioWrap.style.display = 'none';
    if (cardSkinStudioWrap) cardSkinStudioWrap.style.display = 'none';
    applyArenaTheme('dark');
  } else {
    state.mode = GAME_MODES.ONE_VS_ONE || '1v1';
    state.arena = { ...CONFIG.arena };
    loadFighterSelections('foc');
    activeTacticalAction = 'mode-1v1';
    titleScreen?.classList.remove('hub-tactical');
    if (badge) badge.innerText = 'Operations';
    if (tileBattleTitle) tileBattleTitle.innerText = 'BATTLE';
    if (tileBattleSubtitle) tileBattleSubtitle.innerText = 'COMBAT MODES';
    if (tileArsenalTitle) tileArsenalTitle.innerText = 'ARSENAL';
    if (tileArsenalSubtitle) tileArsenalSubtitle.innerText = 'WEAPONS & STUDIO';
    if (tileIndexTitle) tileIndexTitle.innerText = 'INDEX';
    if (tileIndexSubtitle) tileIndexSubtitle.innerText = '24 FIGHTERS';
    if (tileHubTitle) tileHubTitle.innerText = 'TACTICAL';
    if (tileHubSubtitle) tileHubSubtitle.innerText = 'SWITCH HUB';
    if (tileHubIcon) {
      tileHubIcon.innerHTML = `<svg class="pixel-icon" viewBox="0 0 16 16" width="26" height="26" fill="none" shape-rendering="crispEdges">
        <path d="M5 1h6v1h2v2h1v2h1v4h-1v2h-1v2h-2v1H5v-1H3v-2H2v-2H1V6h1V4h1V2h2V1z" fill="#ffffff"/>
        <path d="M5 3h6v1h2v2h1v4h-1v2h-2v1H5v-1H3v-2H2V6h1V4h2V3z" fill="#21050c"/>
        <path d="M6 4h4v1h1v1h1v4h-1v1h-1v1H6v-1H5v-1H4V6h1V5h1V4z" fill="#ffffff"/>
        <path d="M7 6h2v1h1v2H9v1H7V9H6V7h1V6z" fill="#cf3355"/>
        <path d="M7 7h2v2H7V7z" fill="#ffffff"/>
        <path d="M7 0h2v3H7V0z M7 13h2v3H7v-3z M0 7h3v2H0V7z M13 7h3v2h-3V7z" fill="#ffffff"/>
      </svg>`;
    }
    if (cardArsenalTitle) cardArsenalTitle.innerText = 'WEAPON ARSENAL';
    if (cardArsenalSubtitle) cardArsenalSubtitle.innerText = 'WEAPON PREVIEW & SKINS';
    if (cardStudioWrap) cardStudioWrap.style.display = 'flex';
    if (cardSkinStudioWrap) cardSkinStudioWrap.style.display = 'flex';
    applyArenaTheme(localStorage.getItem('arenaTheme') || 'light');
  }

  showMenuView('menu-view-main', false);

  if (playAudio && typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
    audioSystem.playSFX('skill_dash1', 0.25);
  }
}

// Unified Tactical & Main Menu Card Click Handlers
document.querySelectorAll('.tactical-card, .menu-tile-3d').forEach(card => {
  card.addEventListener('click', (e) => {
    if (e.target && e.target.tagName === 'BUTTON' && e.target.id) return;
    const action = card.getAttribute('data-action');
    if (action === 'open-battle') {
      if (state.gameCategory === 'tactical') {
        showMenuView('menu-view-tactical-battle');
      } else {
        showMenuView('menu-view-battle');
      }
    } else if (action === 'open-arsenal') {
      showMenuView('menu-view-arsenal');
    } else if (action === 'open-settings') {
      showMenuView('menu-view-settings');
    } else if (action === 'toggle-hub') {
      const nextHub = (state.gameCategory === 'tactical') ? 'foc' : 'tactical';
      switchGameHub(nextHub);
    } else if (action) {
      activeTacticalAction = action;
      executeTacticalAction(action);
    }
  });
});

// Sub-view Back Buttons
document.querySelectorAll('.menu-back-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const backTarget = btn.getAttribute('data-back');
    if (backTarget === 'settings') {
      showMenuView('menu-view-settings');
    } else {
      showMenuView('menu-view-main');
    }
  });
});

// Titlebar close box returns to main menu if in subview
document.querySelector('.retro-close-box')?.addEventListener('click', () => {
  showMenuView('menu-view-main');
});

// System Buttons Handlers
document.getElementById('btn-theme')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (state.gameCategory === 'tactical') return;
  const nextTheme = (state.arenaTheme === 'dark') ? 'light' : 'dark';
  applyArenaTheme(nextTheme);
});

document.getElementById('quick-toggle-theme')?.addEventListener('click', () => {
  if (state.gameCategory === 'tactical') return;
  const nextTheme = (state.arenaTheme === 'dark') ? 'light' : 'dark';
  applyArenaTheme(nextTheme);
});

// HUD Setting Buttons
document.getElementById('btn-hud-master')?.addEventListener('click', (e) => {
  e.stopPropagation();
  executeTacticalAction('toggle-hud-master');
});

document.getElementById('btn-hud-healthbars')?.addEventListener('click', (e) => {
  e.stopPropagation();
  executeTacticalAction('toggle-hud-healthbars');
});

document.getElementById('btn-hud-skillbars')?.addEventListener('click', (e) => {
  e.stopPropagation();
  executeTacticalAction('toggle-hud-skillbars');
});

document.getElementById('btn-hud-stats')?.addEventListener('click', (e) => {
  e.stopPropagation();
  executeTacticalAction('toggle-hud-stats');
});

document.getElementById('btn-hud-displaymode')?.addEventListener('click', (e) => {
  e.stopPropagation();
  executeTacticalAction('toggle-hud-displaymode');
});

document.getElementById('btn-hud-overheadhp')?.addEventListener('click', (e) => {
  e.stopPropagation();
  executeTacticalAction('toggle-hud-overheadhp');
});

document.getElementById('btn-hudmode')?.addEventListener('click', (e) => {
  e.stopPropagation();
  executeTacticalAction('toggle-hud-displaymode');
});

document.getElementById('btn-darkskills')?.addEventListener('click', (e) => {
  e.stopPropagation();
  executeTacticalAction('toggle-darkskills');
});

document.getElementById('btn-darkstats')?.addEventListener('click', (e) => {
  e.stopPropagation();
  executeTacticalAction('toggle-darkstats');
});

document.getElementById('btn-cinefilm')?.addEventListener('click', (e) => {
  e.stopPropagation();
  state.cinefilmFilter = !state.cinefilmFilter;
  localStorage.setItem('cinefilmFilter', state.cinefilmFilter);
  updateCinefilmOverlay();
});

document.getElementById('btn-dimeffects')?.addEventListener('click', (e) => {
  e.stopPropagation();
  state.disableDimEffects = !state.disableDimEffects;
  localStorage.setItem('disableDimEffects', state.disableDimEffects);
  e.target.innerText = state.disableDimEffects ? 'OFF' : 'ON';
});

document.getElementById('btn-performance')?.addEventListener('click', (e) => {
  e.stopPropagation();
  state.performanceMode = !state.performanceMode;
  localStorage.setItem('performanceMode', state.performanceMode);
  e.target.innerText = state.performanceMode ? 'ON' : 'OFF';
});

document.getElementById('btn-fps')?.addEventListener('click', (e) => {
  e.stopPropagation();
  state.hideFpsLogs = !state.hideFpsLogs;
  localStorage.setItem('hideFpsLogs', state.hideFpsLogs);
  e.target.innerText = state.hideFpsLogs ? 'OFF' : 'ON';
});

document.getElementById('btn-camera')?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleCameraMode();
  e.target.innerText = (state.camera.mode === 'dynamic') ? 'ON' : 'OFF';
});

document.getElementById('btn-quickbar')?.addEventListener('click', (e) => {
  e.stopPropagation();
  executeTacticalAction('toggle-quickbar');
});

document.getElementById('btn-testmode')?.addEventListener('click', (e) => {
  e.stopPropagation();
  state.testMode = !state.testMode;
  e.target.innerText = state.testMode ? 'ON' : 'OFF';
});

document.getElementById('btn-arenatitle')?.addEventListener('click', (e) => {
  e.stopPropagation();
  CONFIG.showArenaTitle = !CONFIG.showArenaTitle;
  localStorage.setItem('showArenaTitle', CONFIG.showArenaTitle);
  e.target.innerText = CONFIG.showArenaTitle ? 'ON' : 'OFF';
});

document.getElementById('btn-bgm')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const nextTrack = cycleNextArenaBgmTrack();
  e.target.innerText = nextTrack.name;
});

document.getElementById('btn-todobgm')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const isEnabled = CONFIG.todo?.enableTakadaBackgroundSong !== false;
  if (CONFIG.todo) {
    CONFIG.todo.enableTakadaBackgroundSong = !isEnabled;
  }
  localStorage.setItem('todo_enableTakadaBackgroundSong', (!isEnabled).toString());
  e.target.innerText = (!isEnabled) ? 'ON' : 'OFF';
});

// Initialize initial menu view on boot
showMenuView('menu-view-main', false);

// Keyboard Navigation
window.addEventListener('keydown', (e) => {
  if (e.key === 'F2') {
    e.preventDefault();
    toggleBalanceDebugOverlay();
    return;
  }

  if (state.gameState === 'title') {
    if (e.key === 'Escape' || e.key === 'Backspace') {
      showMenuView('menu-view-main');
    } else if (e.key === '1') {
      switchGameHub('foc');
    } else if (e.key === '2') {
      switchGameHub('tactical');
    }
  }
});

// Live Combat Balance & Debug Floating Overlay Buttons
document.getElementById('debugCloseBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleBalanceDebugOverlay();
});

document.getElementById('debugResetBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  BalanceManager.resetGlobalMultipliers();
  syncBalanceButtons();
});

document.querySelectorAll('.debug-step-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const key = btn.getAttribute('data-debug-step');
    const step = parseFloat(btn.getAttribute('data-step')) || 0.25;
    if (key && BalanceManager.data.globalMultipliers) {
      const cur = BalanceManager.getGlobalMultipliers()[key] || 1.0;
      const next = Math.max(0.25, Math.min(3.0, Math.round((cur + step) * 100) / 100));
      BalanceManager.setGlobalMultiplier(key, next);
      syncBalanceButtons();
    }
  });
});

// ─────────────────────────────────────────────
// MOBILE & MULTI-DEVICE QUICK ACTION BAR CONTROLS
// ─────────────────────────────────────────────
const mobileQuickBar = document.getElementById('mobileQuickBar');
const quickBtnPause = document.getElementById('quickBtnPause');
const quickIconPause = document.getElementById('quickIconPause');
const quickBtnRestart = document.getElementById('quickBtnRestart');
const quickBtnFullscreen = document.getElementById('quickBtnFullscreen');
const quickIconFullscreen = document.getElementById('quickIconFullscreen');
const quickBtnCamera = document.getElementById('quickBtnCamera');
const quickBtnSound = document.getElementById('quickBtnSound');
const quickIconSound = document.getElementById('quickIconSound');

let _isMuted = false;

if (quickBtnPause) {
  quickBtnPause.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockAudio();
    if (state.gameState === 'playing' || state.gameState === 'countdown') {
      state.previousGameState = state.gameState;
      state.gameState = 'paused';
    } else if (state.gameState === 'paused') {
      state.gameState = state.previousGameState || 'playing';
    }
    syncMobileQuickBar();
  });
}

if (quickBtnRestart) {
  quickBtnRestart.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockAudio();
    if (state.gameState === 'playing' || state.gameState === 'roundEnd' || state.gameState === 'paused') {
      restartCurrentRound();
    } else if (state.gameState === 'matchEnd') {
      resetMatch();
    }
    syncMobileQuickBar();
  });
}

if (quickBtnFullscreen) {
  quickBtnFullscreen.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    setTimeout(syncMobileQuickBar, 100);
  });
}

if (quickBtnCamera) {
  quickBtnCamera.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCameraMode();
  });
}

if (quickBtnSound) {
  quickBtnSound.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockAudio();
    _isMuted = !_isMuted;
    if (_isMuted) {
      stopAllSounds(false, 0, 0);
      stopAllLoopingSounds(0, 0);
      if (quickIconSound) quickIconSound.textContent = '🔇';
    } else {
      if (quickIconSound) quickIconSound.textContent = '🔊';
    }
  });
}

export function shouldShowQuickBar() {
  const mode = state.quickBarMode || 'auto';
  if (mode === 'off') return false;
  if (mode === 'on') return true;
  // 'auto': Only show on mobile / touch devices where physical keyboard is missing
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  return Boolean((isCoarse || isMobileUA) && isTouchDevice && !window.electronAPI);
}

let _lastQuickBarState = '';
export function syncMobileQuickBar() {
  if (!mobileQuickBar) return;
  const inCombat = (
    state.gameState === 'playing' ||
    state.gameState === 'countdown' ||
    state.gameState === 'paused' ||
    state.gameState === 'roundEnd' ||
    state.gameState === 'matchEnd'
  );

  const shouldShow = shouldShowQuickBar() && inCombat;
  const curState = `${shouldShow ? '1' : '0'}_${state.gameState}_${Boolean(document.fullscreenElement)}_${_isMuted}`;
  if (curState === _lastQuickBarState) return;
  _lastQuickBarState = curState;

  mobileQuickBar.style.display = shouldShow ? 'flex' : 'none';
  if (quickIconPause) {
    quickIconPause.textContent = (state.gameState === 'paused') ? '▶' : '⏸';
  }
  if (quickIconFullscreen) {
    quickIconFullscreen.textContent = document.fullscreenElement ? '🗗' : '⛶';
  }
  if (quickIconSound) {
    quickIconSound.textContent = _isMuted ? '🔇' : '🔊';
  }
}

document.addEventListener('fullscreenchange', syncMobileQuickBar);
setInterval(syncMobileQuickBar, 100);