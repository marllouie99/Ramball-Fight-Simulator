import { state, getProjectiles } from '../core/state.js';
import { FIGHTER_DEFS } from '../core/config.js';
import { spatialGrid } from './physics.js';
import { burnEffectSystem } from '../graphics/particles/burnEffectVisuals.js';
import { flamewardenFlameSystem } from '../graphics/weapons/flamewardenWeaponGraphics.js';
import { bomberExplosionSystem } from '../graphics/particles/bomberExplosionVisuals.js';
import { resetCachedTime } from '../graphics/draw.js';
import { updateGame } from './updateSystem.js';
import { renderGame } from './renderSystem.js';
import { getAudioCurrentTime } from './soundSystem.js';

export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
export const TARGET_FPS = isMobile ? 30 : 60; // Lower FPS on mobile to reduce heating
export const FRAME_TIME = 1000 / TARGET_FPS;
let lastFrameTime = 0;
let isPageVisible = true;
let _uiScreensCache = null;
let _uiLayerCache = null;

// Pause game loop when tab is hidden (mobile optimization)
document.addEventListener('visibilitychange', () => {
  isPageVisible = !document.hidden;
  if (isPageVisible) {
    lastFrameTime = performance.now(); // Reset to prevent huge delta
  }
});

export function animate(timestamp) {
  // Mobile: skip frame to limit FPS and reduce heating
  if (isMobile) {
    const elapsed = timestamp - lastFrameTime;
    if (elapsed < FRAME_TIME) {
      requestAnimationFrame(animate);
      return;
    }
    lastFrameTime = timestamp - (elapsed % FRAME_TIME);
  }

  // Skip updates when page is hidden
  if (!isPageVisible) {
    requestAnimationFrame(animate);
    return;
  }

  try {
    // FPS calculation
    if (!state.fpsLastTime) state.fpsLastTime = timestamp;
    state.fpsFrames++;
    if (timestamp - state.fpsLastTime >= 1000) {
      state.fps = state.fpsFrames;
      state.fpsFrames = 0;
      state.fpsLastTime = timestamp;

      // Visual quality stays at 100% full quality (no dynamic degradation on FPS drop)
      state.qualityLevel = state.performanceMode ? 0.2 : 1.0;

      // Track active particles
      let burnActive = 0;
      if (burnEffectSystem && burnEffectSystem.particles) {
        burnActive = burnEffectSystem.particles.length; // BurnEffectSystem already manages active-only particles in this array
      }
      let flameActive = 0;
      if (flamewardenFlameSystem && flamewardenFlameSystem.particles) {
        const parts = flamewardenFlameSystem.particles;
        for (let i = 0; i < parts.length; i++) {
          if (parts[i] && parts[i].active) {
            flameActive++;
          }
        }
      }

      const totalParticles = state.bloodEffects.length + state.deathEffects.length +
        state.berserkerRageEffects.length + (state.sparkEffects ? state.sparkEffects.length : 0) +
        burnActive + flameActive;

      // FPS Drop Detection
      if (state.fps < 45 && state.gameState === 'playing') {
        // Collect diagnostic data synchronously (cheap integer checks)
        const currentFps = state.fps;
        const projCount = getProjectiles().length;
        const particleCount = totalParticles;
        const explosionsCount = (bomberExplosionSystem && bomberExplosionSystem.particles) ? bomberExplosionSystem.particles.length : 0;

        // Spatial grid clash detection (lightweight integer work)
        let closeFighters = 0;
        let clashingNames = new Set();

        for (const fighter of state.fighters) {
          if (!fighter || fighter.hp <= 0) continue;

          const nearbyFighters = spatialGrid.getNearby(fighter.x, fighter.y, 150);
          for (const other of nearbyFighters) {
            if (other === fighter || !other.hp || other.hp <= 0) continue;

            const dist = Math.hypot(other.x - fighter.x, other.y - fighter.y);
            if (dist < 150) {
              closeFighters++;
              let n1 = (fighter.fighterIndex !== undefined && FIGHTER_DEFS[fighter.fighterIndex]) ? FIGHTER_DEFS[fighter.fighterIndex].name : 'Unknown';
              let n2 = (other.fighterIndex !== undefined && FIGHTER_DEFS[other.fighterIndex]) ? FIGHTER_DEFS[other.fighterIndex].name : 'Unknown';
              clashingNames.add(n1);
              clashingNames.add(n2);
            }
          }
        }

        // Divide by 2 since each pair is counted twice
        closeFighters = Math.floor(closeFighters / 2);

        const aliveFighters = [];
        for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          if (f && f.hp > 0) {
            aliveFighters.push((f.fighterIndex !== undefined && FIGHTER_DEFS[f.fighterIndex]) ? FIGHTER_DEFS[f.fighterIndex].name : 'Unknown');
          }
        }
        
        // Defer heavy string concatenation/array operations to idle time
        const logTask = () => {
          let issues = [];
          if (projCount > 30) issues.push(`${projCount} Projectiles`);
          if (particleCount > 80) issues.push(`${particleCount} Particles`);
          if (explosionsCount > 3) issues.push(`${explosionsCount} Explosions`);
  
          if (closeFighters > 0) {
            let names = Array.from(clashingNames).join(', ');
            issues.push(`Clash (${closeFighters} close) [${names}]`);
          }
  
          let logText = '';
          if (issues.length > 0) {
            if (closeFighters === 0 && aliveFighters.length > 0) {
              issues.push(`Active: [${aliveFighters.join(', ')}]`);
            }
            logText = `[FPS: ${currentFps}] ${issues.join(', ')}`;
          } else {
            logText = `[FPS: ${currentFps}] Unknown Heavy Load [${aliveFighters.join(', ')}]`;
          }
  
          state.fpsLogs.push({ text: logText, timer: 300 });
          if (state.fpsLogs.length > 5) {
            state.fpsLogs[0] = state.fpsLogs[state.fpsLogs.length - 1];
            state.fpsLogs.pop();
          }
  
          state.allFpsLogs.push(`[${new Date().toLocaleTimeString()}] ${logText}`);
          const MAX_FPS_LOGS = 1000;
          if (state.allFpsLogs.length > MAX_FPS_LOGS) {
            state.allFpsLogs.splice(0, state.allFpsLogs.length - MAX_FPS_LOGS);
          }
        };

        if (window.requestIdleCallback) {
          window.requestIdleCallback(logTask);
        } else {
          setTimeout(logTask, 0);
        }
      }
    }

    if (state.fpsLogsCopiedTimer > 0) {
      state.fpsLogsCopiedTimer--;
    }

    if (state.fpsLogs) {
      for (let i = state.fpsLogs.length - 1; i >= 0; i--) {
        state.fpsLogs[i].timer--;
        if (state.fpsLogs[i].timer <= 0) {
          state.fpsLogs.splice(i, 1);
        }
      }
    }

    // Reset cached time for this frame (performance optimization)
    resetCachedTime();
    state.frameAudioTime = getAudioCurrentTime();

    // The abstracted core updates and renders!
    updateGame();
    renderGame();

    // Sync HTML UI Screens
    if (state.lastGameState !== state.gameState) {
      state.lastGameState = state.gameState;
      if (!_uiScreensCache) _uiScreensCache = document.querySelectorAll('.ui-screen');
      const screens = _uiScreensCache;
      if (screens && screens.length > 0) {
        screens.forEach(s => s.classList.remove('active'));
        const activeScreen = document.getElementById(state.gameState + '-screen');
        if (activeScreen) activeScreen.classList.add('active');
        
        if (!_uiLayerCache) _uiLayerCache = document.getElementById('ui-layer');
        const uiLayer = _uiLayerCache;
        if (uiLayer) {
            uiLayer.style.pointerEvents = ['title'].includes(state.gameState) ? 'auto' : 'none';
        }
      }
    }

  } catch (e) {
    console.error('Game loop error:', e);
  }

  requestAnimationFrame(animate);
}

export function startGameLoop() {
  requestAnimationFrame(animate);
}
