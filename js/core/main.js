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
// ─────────────────────────────────────────────
// FLAME CANVAS INITIALIZATION
// ─────────────────────────────────────────────
initFlameCanvas();
resizeFlameCanvas();

// ─────────────────────────────────────────────
// GRAPHICS CACHE INITIALIZATION
// ─────────────────────────────────────────────
initGraphicsCache();

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
      stopAllSounds(false, 0, 0);
      stopAllLoopingSounds(0, 0);
      state.gameState = 'select';
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

inputTarget.addEventListener('mousemove', (e) => {
  const rect = inputTarget.getBoundingClientRect();
  // Handle scaling if CSS sizes canvas differently
  const scaleX = state.canvas.width / rect.width;
  const scaleY = state.canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  handleUIMove(mx, my);
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
document.getElementById('btn-battle')?.addEventListener('click', () => {
  stopAllSounds(false, 0, 0); stopAllLoopingSounds(0, 0);
  state.gameState = 'select';
});

document.getElementById('btn-index')?.addEventListener('click', () => {
  state.gameState = 'index';
});

document.getElementById('btn-weapons')?.addEventListener('click', () => {
  state.gameState = 'weapons';
});

document.getElementById('btn-testmode')?.addEventListener('click', (e) => {
  state.testMode = !state.testMode;
  e.target.innerText = '🧪 TEST MODE: ' + (state.testMode ? 'ON' : 'OFF');
});

// Initialize HUD Mode from localStorage or CONFIG default
if (localStorage.getItem('hudShowFighterDescription') !== null) {
  CONFIG.hudShowFighterDescription = localStorage.getItem('hudShowFighterDescription') === 'true';
}
const hudModeBtn = document.getElementById('btn-hudmode');
if (hudModeBtn) {
  hudModeBtn.innerText = '📋 HUD: ' + (CONFIG.hudShowFighterDescription ? 'DESCRIPTION' : 'SKILL BARS');
}

document.getElementById('btn-hudmode')?.addEventListener('click', (e) => {
  CONFIG.hudShowFighterDescription = !CONFIG.hudShowFighterDescription;
  localStorage.setItem('hudShowFighterDescription', CONFIG.hudShowFighterDescription);
  e.target.innerText = '📋 HUD: ' + (CONFIG.hudShowFighterDescription ? 'DESCRIPTION' : 'SKILL BARS');
});

// Initialize Performance Mode from localStorage
state.performanceMode = localStorage.getItem('performanceMode') === 'true';
const perfBtn = document.getElementById('btn-performance');
if (perfBtn) {
  perfBtn.innerText = '⚙ PERFORMANCE: ' + (state.performanceMode ? 'ON' : 'OFF');
}

document.getElementById('btn-performance')?.addEventListener('click', (e) => {
  state.performanceMode = !state.performanceMode;
  localStorage.setItem('performanceMode', state.performanceMode);
  e.target.innerText = '⚙ PERFORMANCE: ' + (state.performanceMode ? 'ON' : 'OFF');
});

// Initialize FPS & Logs Toggle from localStorage
const fpsBtn = document.getElementById('btn-fps');
if (fpsBtn) {
  fpsBtn.innerText = '📊 FPS & LOGS: ' + (state.hideFpsLogs ? 'OFF' : 'ON');
}

document.getElementById('btn-fps')?.addEventListener('click', (e) => {
  state.hideFpsLogs = !state.hideFpsLogs;
  localStorage.setItem('hideFpsLogs', state.hideFpsLogs);
  e.target.innerText = '📊 FPS & LOGS: ' + (state.hideFpsLogs ? 'OFF' : 'ON');
});

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
    btn.innerText = '🎞️ CINEFILM FILTER: ' + (state.cinefilmFilter ? 'ON' : 'OFF');
  }
}

// Initialize Cinefilm Filter from localStorage
state.cinefilmFilter = localStorage.getItem('cinefilmFilter') === 'true';
updateCinefilmOverlay();

document.getElementById('btn-cinefilm')?.addEventListener('click', () => {
  state.cinefilmFilter = !state.cinefilmFilter;
  localStorage.setItem('cinefilmFilter', state.cinefilmFilter);
  updateCinefilmOverlay();
});

document.getElementById('btn-leaderboard')?.addEventListener('click', () => {
  state.gameState = 'leaderboard';
});