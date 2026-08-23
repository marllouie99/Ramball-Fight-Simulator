// ─────────────────────────────────────────────
// MAIN — Entry point for the ES6 module build
// ─────────────────────────────────────────────

import { state } from './state.js';
import { initFlameCanvas, resizeFlameCanvas } from '../graphics/canvasManager.js';
import { startGame, startNextRound, resetMatchWithRandom1v1Fighters, resetMatchWithRandom1v2Fighters, restartCurrentRound, resetMatch } from './gameFlow.js';
import { FIGHTER_DEFS, CONFIG } from './config.js';
import { handleUIClick, handleUIMove } from '../graphics/ui.js';
import { stopAllSounds, stopAllLoopingSounds, unlockAudio } from '../systems/soundSystem.js';
import { initGraphicsCache } from '../graphics/graphicsCache.js';
import { syncHudPosition } from '../graphics/ui/hudLayout.js';
import { clearHealthHud } from '../graphics/hudManager.js';
import { getTacticalIcon } from '../graphics/ui/tacticalIcons.js';
// ─────────────────────────────────────────────
// FLAME CANVAS INITIALIZATION
// ─────────────────────────────────────────────
initFlameCanvas();
resizeFlameCanvas();

// ─────────────────────────────────────────────
// GRAPHICS CACHE & FONT INITIALIZATION
// ─────────────────────────────────────────────
initGraphicsCache();

if (typeof document !== 'undefined' && 'fonts' in document) {
  try {
    document.fonts.load('48px "Pricedown"').catch((e) => console.warn('Pricedown font load warning:', e));
  } catch (e) {
    console.warn('FontFace error:', e);
  }
}

// Handle window resize for flame canvas
window.addEventListener('resize', () => {
  resizeFlameCanvas();
});

// ─────────────────────────────────────────────
// INPUT HANDLING
// ─────────────────────────────────────────────

window.addEventListener('keydown', (e) => {
  unlockAudio();

  if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
    if (state.gameState === 'playing' || state.gameState === 'countdown') {
      state.previousGameState = state.gameState;
      state.gameState = 'paused';
    } else if (state.gameState === 'paused') {
      state.gameState = state.previousGameState || 'playing';
    }
  } else if (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 's') {
    if (state.gameState === 'title') {
      executeTacticalAction(activeTacticalAction);
    }
    else if (state.gameState === 'select') startGame();
    else if (state.gameState === 'roundEnd') startNextRound();
    else if (state.gameState === 'matchEnd') {
      if (state.mode === '1v2 Stand Off') resetMatchWithRandom1v2Fighters();
      else if (state.mode === '1v1' || state.mode === 'Stand Off') resetMatchWithRandom1v1Fighters();
      else resetMatch();
    }
  } else if (e.key.toLowerCase() === 'r') {
    if (state.gameState === 'playing' || state.gameState === 'roundEnd') {
      restartCurrentRound();
    } else if (state.gameState === 'matchEnd') {
      resetMatch();
    }
  } else if (e.key.toLowerCase() === 'c') {
    if (state.allFpsLogs && state.allFpsLogs.length > 0) {
      const logText = state.allFpsLogs.join('\n');
      navigator.clipboard.writeText(logText).catch(err => console.error('Failed to copy logs:', err));
      state.fpsLogsCopiedTimer = 120; // Show copied message for 2 seconds
    }
  } else if (e.key.toLowerCase() === 'h') {
    state.hideFpsLogs = !state.hideFpsLogs;
  } else if (e.key.toLowerCase() === 't') {
    // DEBUG: Press 'T' to trigger Gojo's RCT aura (for testing visual effect)
    if (state.gameState === 'playing' && state.fighters) {
      state.fighters.forEach(fighter => {
        if (fighter && fighter._def && fighter._def.type === 'gojo') {
          fighter.healingAuraTimer = 180;
          console.log('[DEBUG] Triggering Gojo RCT aura...');
        }
      });
    }
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

inputTarget.addEventListener('click', (e) => {
  unlockAudio();

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

inputTarget.addEventListener('touchstart', () => {
  unlockAudio();
}, { passive: true });

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

// Function to apply Arena Theme (Dark / Light)
export function applyArenaTheme(theme) {
  state.arenaTheme = theme;
  CONFIG.arenaTheme = theme;
  localStorage.setItem('arenaTheme', theme);

  const isDark = (theme === 'dark');
  CONFIG.canvasBgColor = isDark ? '#000000' : '#ffffffff';
  CONFIG.arenaOuterBgColor = isDark ? '#121318' : '#fffdf1ff';
  CONFIG.arenaInnerBgColor = isDark ? '#1a1c23' : '#ffffffff';
  CONFIG.hudTextColor = isDark ? '#f0f2f5' : '#131313ff';

  // Invalidate cached canvases
  state._arenaBorderCanvas = null;
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
const hudModeBtn = document.getElementById('btn-hudmode');
if (hudModeBtn) {
  hudModeBtn.innerText = CONFIG.hudShowFighterDescription ? 'DESCRIPTION' : 'SKILL BARS';
}

if (localStorage.getItem('showArenaTitle') !== null) {
  CONFIG.showArenaTitle = localStorage.getItem('showArenaTitle') === 'true';
} else {
  CONFIG.showArenaTitle = false;
}
const arenaTitleBtn = document.getElementById('btn-arenatitle');
if (arenaTitleBtn) {
  arenaTitleBtn.innerText = CONFIG.showArenaTitle ? 'ON' : 'OFF';
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

state.cinefilmFilter = localStorage.getItem('cinefilmFilter') === 'true';
updateCinefilmOverlay();

// Tactical Terminal State
let activeTacticalAction = 'mode-1v1';

function updateBriefingPanel(cardEl, playAudio = true) {
  if (!cardEl) return;
  const title = cardEl.getAttribute('data-title') || 'TACTICAL OPERATION';
  const desc = cardEl.getAttribute('data-desc') || 'Select an operation to proceed to deployment.';
  const iconKey = cardEl.getAttribute('data-icon') || 'duel';
  const action = cardEl.getAttribute('data-action') || 'mode-1v1';
  const tag1 = cardEl.getAttribute('data-tag1') || '■ OPERATION';
  const tag2 = cardEl.getAttribute('data-tag2') || '■ TIER 1';
  const tag3 = cardEl.getAttribute('data-tag3') || '■ READY';

  activeTacticalAction = action;

  const briefingTitle = document.getElementById('briefing-title');
  const briefingDesc = document.getElementById('briefing-desc');
  const briefingIcon = document.getElementById('briefing-icon');
  const tagEl1 = document.getElementById('briefing-tag-1');
  const tagEl2 = document.getElementById('briefing-tag-2');
  const tagEl3 = document.getElementById('briefing-tag-3');
  const launchText = document.getElementById('launch-button-text');

  if (briefingTitle) briefingTitle.innerText = title;
  if (briefingDesc) briefingDesc.innerText = desc;
  if (briefingIcon) briefingIcon.innerHTML = getTacticalIcon(iconKey);
  if (tagEl1) tagEl1.innerText = tag1;
  if (tagEl2) tagEl2.innerText = tag2;
  if (tagEl3) tagEl3.innerText = tag3;

  if (launchText) {
    if (action.startsWith('mode-')) {
      launchText.innerText = 'LAUNCH ' + title;
    } else if (action.startsWith('screen-')) {
      launchText.innerText = 'OPEN ' + title;
    } else {
      launchText.innerText = 'CONFIGURE ' + title;
    }
  }

  // Update active state across cards
  document.querySelectorAll('.tactical-card').forEach(c => c.classList.remove('active'));
  cardEl.classList.add('active');

  if (playAudio && typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
    audioSystem.playSFX('skill_dash5', 0.12);
  }
}

function executeTacticalAction(action) {
  if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
    audioSystem.playSFX('skill_dash3', 0.4);
  }

  if (action === 'mode-1v1') {
    state.mode = '1v1';
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  } else if (action === 'mode-standoff') {
    state.mode = 'Stand Off';
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  } else if (action === 'mode-2v2') {
    state.mode = '2v2';
    state.p3Index = state.p3Index ?? 2;
    state.p4Index = state.p4Index ?? 3;
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  } else if (action === 'mode-ffa') {
    state.mode = 'FFA';
    state.p3Index = state.p3Index ?? 2;
    state.p4Index = state.p4Index ?? 3;
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  } else if (action === 'mode-standoff1v2') {
    state.mode = '1v2 Stand Off';
    stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
    state.gameState = 'select';
  } else if (action === 'screen-index') {
    state.gameState = 'index';
  } else if (action === 'screen-weaponstudio') {
    state.gameState = 'weaponStudio';
  } else if (action === 'screen-weapons') {
    state.gameState = 'weapons';
  } else if (action === 'screen-leaderboard') {
    state.gameState = 'leaderboard';
  } else if (action === 'toggle-theme') {
    const nextTheme = (state.arenaTheme === 'dark') ? 'light' : 'dark';
    applyArenaTheme(nextTheme);
  } else if (action === 'toggle-hud') {
    CONFIG.hudShowFighterDescription = !CONFIG.hudShowFighterDescription;
    localStorage.setItem('hudShowFighterDescription', CONFIG.hudShowFighterDescription);
    const btn = document.getElementById('btn-hudmode');
    if (btn) btn.innerText = CONFIG.hudShowFighterDescription ? 'DESCRIPTION' : 'SKILL BARS';
  } else if (action === 'toggle-cinefilm') {
    state.cinefilmFilter = !state.cinefilmFilter;
    localStorage.setItem('cinefilmFilter', state.cinefilmFilter);
    updateCinefilmOverlay();
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
  } else if (action === 'toggle-testmode') {
    state.testMode = !state.testMode;
    const btn = document.getElementById('btn-testmode');
    if (btn) btn.innerText = state.testMode ? 'ON' : 'OFF';
  } else if (action === 'toggle-arenatitle') {
    CONFIG.showArenaTitle = !CONFIG.showArenaTitle;
    localStorage.setItem('showArenaTitle', CONFIG.showArenaTitle);
    const btn = document.getElementById('btn-arenatitle');
    if (btn) btn.innerText = CONFIG.showArenaTitle ? 'ON' : 'OFF';
  }
}

// Category Tabs Switching
const categoryLabelMap = {
  all: 'OPERATIONS',
  modes: 'BATTLE MODES',
  arsenal: 'ARSENAL & STUDIO',
  database: 'DATABASE & STATS',
  system: 'SYSTEM CONFIG',
};

const tabButtons = document.querySelectorAll('.tactical-tab-btn');
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const category = btn.getAttribute('data-category');
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const catLabel = document.getElementById('tactical-category-label');
    if (catLabel) catLabel.innerText = categoryLabelMap[category] || 'OPERATIONS';

    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('skill_dash1', 0.2);
    }

    const cards = document.querySelectorAll('.tactical-card');
    let visibleCount = 0;
    let firstVisible = null;

    cards.forEach(card => {
      const cardCat = card.getAttribute('data-category');
      if (category === 'all' || cardCat === category) {
        card.style.display = 'flex';
        visibleCount++;
        if (!firstVisible) firstVisible = card;
      } else {
        card.style.display = 'none';
      }
    });

    const badge = document.getElementById('tactical-counter-badge');
    if (badge) badge.innerText = `(${visibleCount} READY)`;

    if (firstVisible) {
      updateBriefingPanel(firstVisible, false);
    }
  });
});

// Tactical Card Selection & Click
document.querySelectorAll('.tactical-card').forEach(card => {
  card.addEventListener('mouseenter', () => {
    updateBriefingPanel(card, true);
  });
  card.addEventListener('click', (e) => {
    // If clicking directly on a child button inside system card, let the button handler fire
    if (e.target && e.target.tagName === 'BUTTON') return;
    updateBriefingPanel(card, false);
    const action = card.getAttribute('data-action');
    if (action) executeTacticalAction(action);
  });
});

// Launch Button
document.getElementById('btn-tactical-launch')?.addEventListener('click', () => {
  executeTacticalAction(activeTacticalAction);
});

// System Buttons Handlers
document.getElementById('btn-theme')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const nextTheme = (state.arenaTheme === 'dark') ? 'light' : 'dark';
  applyArenaTheme(nextTheme);
});

document.getElementById('quick-toggle-theme')?.addEventListener('click', () => {
  const nextTheme = (state.arenaTheme === 'dark') ? 'light' : 'dark';
  applyArenaTheme(nextTheme);
});

document.getElementById('btn-hudmode')?.addEventListener('click', (e) => {
  e.stopPropagation();
  CONFIG.hudShowFighterDescription = !CONFIG.hudShowFighterDescription;
  localStorage.setItem('hudShowFighterDescription', CONFIG.hudShowFighterDescription);
  e.target.innerText = CONFIG.hudShowFighterDescription ? 'DESCRIPTION' : 'SKILL BARS';
});

document.getElementById('btn-cinefilm')?.addEventListener('click', (e) => {
  e.stopPropagation();
  state.cinefilmFilter = !state.cinefilmFilter;
  localStorage.setItem('cinefilmFilter', state.cinefilmFilter);
  updateCinefilmOverlay();
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

// Keyboard / Tactical Controller Prompts
window.addEventListener('keydown', (e) => {
  if (state.gameState === 'title') {
    if (e.key === 'Tab') {
      e.preventDefault();
      const activeTab = document.querySelector('.tactical-tab-btn.active');
      const tabs = Array.from(document.querySelectorAll('.tactical-tab-btn'));
      const idx = tabs.indexOf(activeTab);
      const nextIdx = (idx + 1) % tabs.length;
      tabs[nextIdx]?.click();
    }
  }
});