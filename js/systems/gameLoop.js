import { state, getProjectiles } from '../core/state.js';
import { FIGHTER_DEFS } from '../core/config.js';
import { spatialGrid } from './physics.js';
import { burnEffectSystem } from '../graphics/particles/burnEffectVisuals.js';
import { flamewardenFlameSystem } from '../graphics/weapons/flamewardenWeaponGraphics.js';
import { bomberExplosionSystem } from '../graphics/particles/bomberExplosionVisuals.js';
import { resetCachedTime } from '../graphics/draw.js';
import { updateGame } from './updateSystem.js';
import { renderGame } from './renderSystem.js';

export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
export const TARGET_FPS = isMobile ? 30 : 60; // Lower FPS on mobile to reduce heating
export const FRAME_TIME = 1000 / TARGET_FPS;
let lastFrameTime = 0;
let isPageVisible = true;

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

      // Dynamic quality system - adjust based on FPS
      state.qualityCheckTimer++;
      if (state.qualityCheckTimer >= state.qualityCheckInterval) {
        state.qualityCheckTimer = 0;
        if (state.performanceMode) {
          state.qualityLevel = 0.2;
        } else {
          // OPTIMIZED: Extremely aggressive quality reduction for severe FPS drops
          if (state.fps < state.targetFps && state.qualityLevel > 0.2) {
            const dropAmount = state.fps < 25 ? 0.3 : state.fps < 35 ? 0.2 : 0.15; // Drop faster when FPS is low
            state.qualityLevel = Math.max(0.2, state.qualityLevel - dropAmount);
          } else if (state.fps >= state.targetFps - 2 && state.qualityLevel < 1.0) {
            state.qualityLevel = Math.min(1.0, state.qualityLevel + 0.1); // Recover quickly when FPS stabilizes
          }
        }
      }

      // OPTIMIZED: Enforce hard cap on total particles
      const totalParticles = state.bloodEffects.length + state.deathEffects.length +
        state.berserkerRageEffects.length + (state.sparkEffects ? state.sparkEffects.length : 0) +
        (burnEffectSystem?.particles?.filter(p => p.active).length || 0) +
        (flamewardenFlameSystem?.particles?.filter(p => p.active).length || 0);

      if (totalParticles > state.maxTotalParticles) {
        // Aggressively reduce quality if over particle cap
        state.qualityLevel = Math.max(0.2, state.qualityLevel - 0.1);
      }

      // FPS Drop Detection
      if (state.fps < 45 && state.gameState === 'playing') {
        let issues = [];
        const projCount = getProjectiles().length;
        if (projCount > 30) issues.push(`${projCount} Projectiles`);

        let particleCount = totalParticles;
        if (particleCount > 80) issues.push(`${particleCount} Particles`);

        let explosionsCount = (bomberExplosionSystem && bomberExplosionSystem.explosions) ? bomberExplosionSystem.explosions.length : 0;
        if (explosionsCount > 3) issues.push(`${explosionsCount} Explosions`);

        // OPTIMIZATION: Use spatial grid for clash detection instead of O(n²) loop
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

        if (closeFighters > 0) {
          let names = Array.from(clashingNames).join(', ');
          issues.push(`Clash (${closeFighters} close) [${names}]`);
        }

        let logText = '';
        if (issues.length > 0) {
          if (closeFighters === 0) {
            // Append alive fighters if no clash
            let alive = state.fighters.filter(f => f && f.hp > 0).map(f => (f.fighterIndex !== undefined && FIGHTER_DEFS[f.fighterIndex]) ? FIGHTER_DEFS[f.fighterIndex].name : 'Unknown');
            if (alive.length > 0) issues.push(`Active: [${alive.join(', ')}]`);
          }
          logText = `[FPS: ${state.fps}] ${issues.join(', ')}`;
        } else {
          let alive = state.fighters.filter(f => f && f.hp > 0).map(f => (f.fighterIndex !== undefined && FIGHTER_DEFS[f.fighterIndex]) ? FIGHTER_DEFS[f.fighterIndex].name : 'Unknown');
          logText = `[FPS: ${state.fps}] Unknown Heavy Load [${alive.join(', ')}]`;
        }

        state.fpsLogs.push({ text: logText, timer: 300 });
        if (state.fpsLogs.length > 5) {
          // Use swap-and-pop instead of shift() to avoid O(n) re-indexing
          state.fpsLogs[0] = state.fpsLogs[state.fpsLogs.length - 1];
          state.fpsLogs.pop();
        }

        state.allFpsLogs.push(`[${new Date().toLocaleTimeString()}] ${logText}`);
        // Cap allFpsLogs to prevent unbounded memory growth
        const MAX_FPS_LOGS = 1000;
        if (state.allFpsLogs.length > MAX_FPS_LOGS) {
          state.allFpsLogs.splice(0, state.allFpsLogs.length - MAX_FPS_LOGS);
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

    // The abstracted core updates and renders!
    updateGame();
    renderGame();

    // Sync HTML UI Screens
    if (state.lastGameState !== state.gameState) {
      state.lastGameState = state.gameState;
      const screens = document.querySelectorAll('.ui-screen');
      if (screens && screens.length > 0) {
        screens.forEach(s => s.classList.remove('active'));
        const activeScreen = document.getElementById(state.gameState + '-screen');
        if (activeScreen) activeScreen.classList.add('active');
        
        // Hide/show ui-layer container pointer events based on if an HTML screen is active
        const uiLayer = document.getElementById('ui-layer');
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
