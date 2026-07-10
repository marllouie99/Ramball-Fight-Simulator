// ─────────────────────────────────────────────
// MAIN — Entry point for the ES6 module build
// ─────────────────────────────────────────────

import { state, initFlameCanvas, resizeFlameCanvas, compositeFlameCanvas } from './state.js';
import { updateFighters, updateProjectiles, updateIllusions } from './physics.js';
import { bomberExplosionSystem } from './weaponVisual/bomberExplosionVisuals.js';
import { burnEffectSystem } from './weaponVisual/burnEffectVisuals.js';
import { updateDeathEffects } from './deathShatterEffect.js';
import { updateIllusionDeathEffects } from './illusionDeathEffect.js';
import { updateIllusionSpawnEffects } from './illusionSpawnEffect.js';
import { updateBerserkerRageEffects } from './berserkerRageEffect.js';
import { updateBloodEffects } from './bloodEffect.js';
import { startGame, startNextRound, resetMatchWithRandom1v1Fighters, restartCurrentRound, resetMatch } from './gameFlow.js';
import { FIGHTER_DEFS } from './config.js';
import { drawTitleScreen, drawSelectScreen, drawIndexScreen, drawIndexDetailScreen, drawLeaderboardScreen, drawWeaponMenu, drawWeaponDetailScreen, handleUIClick, handleUIMove, drawHUD, drawPauseScreen, drawRoundEndScreen, drawMatchEndScreen, drawCountdown } from './ui.js';
import { drawArena, drawProjectiles, drawFuelPickups, drawFighters, drawFloatingTexts, drawFlames, drawDeathEffects, resetCachedTime, drawBlackHoleEffects, drawBloodEffects, drawIllusions, drawIllusionDeathEffects, drawIllusionSpawnEffects, drawBerserkerRageEffects } from './draw.js';
import { drawAllCronosSpheres } from './customFighters.js';
import { stopAllSounds, stopAllLoopingSounds } from './soundSystem.js';
import { flamewardenFlameSystem } from './weaponGraphic/flamewardenWeaponGraphics.js';

// ─────────────────────────────────────────────
// FLAME CANVAS INITIALIZATION
// ─────────────────────────────────────────────
initFlameCanvas();
resizeFlameCanvas();

// Handle window resize for flame canvas
window.addEventListener('resize', () => {
  resizeFlameCanvas();
});

// ─────────────────────────────────────────────
// INPUT HANDLING
// ─────────────────────────────────────────────

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.gameState === 'playing') state.gameState = 'paused';
    else if (state.gameState === 'paused') state.gameState = 'playing';
  } else if (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 's') {
    if (state.gameState === 'title') {
      stopAllSounds();
      stopAllLoopingSounds();
      state.gameState = 'select';
    }
    else if (state.gameState === 'select') startGame();
    else if (state.gameState === 'roundEnd') startNextRound();
    else if (state.gameState === 'matchEnd') resetMatchWithRandom1v1Fighters();
  } else if (e.key.toLowerCase() === 'r') {
    if (state.gameState === 'playing' || state.gameState === 'roundEnd') {
      restartCurrentRound();
    } else if (state.gameState === 'matchEnd') {
      resetMatch();
    }
  }
});

state.canvas.addEventListener('mousemove', (e) => {
  const rect = state.canvas.getBoundingClientRect();
  // Handle scaling if CSS sizes canvas differently
  const scaleX = state.canvas.width / rect.width;
  const scaleY = state.canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;
  
  handleUIMove(mx, my);
});

state.canvas.addEventListener('click', (e) => {
  const rect = state.canvas.getBoundingClientRect();
  // Handle scaling if CSS sizes canvas differently
  const scaleX = state.canvas.width / rect.width;
  const scaleY = state.canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  const clickedButton = handleUIClick(mx, my);
  if (!clickedButton && state.gameState === 'title') {
    stopAllSounds();
    stopAllLoopingSounds();
    state.gameState = 'select';
  }
});

state.canvas.addEventListener('wheel', (e) => {
  if (state.gameState === 'index' || state.gameState === 'weapons') {
    e.preventDefault();
    const scrollState = state.gameState === 'index' ? 'indexScroll' : 'weaponScroll';
    const itemHeight = 140;
    const visibleItems = Math.floor((state.canvas.height - 90) / itemHeight);
    const maxScroll = Math.max(0, FIGHTER_DEFS.length * itemHeight - (state.canvas.height - 90));
    state[scrollState] = Math.min(Math.max(0, state[scrollState] + e.deltaY * 0.75), maxScroll);
  }
}, { passive: false });

// ─────────────────────────────────────────────
// MOBILE OPTIMIZATION
// ─────────────────────────────────────────────

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const TARGET_FPS = isMobile ? 30 : 60; // Lower FPS on mobile to reduce heating
const FRAME_TIME = 1000 / TARGET_FPS;
let lastFrameTime = 0;
let isPageVisible = true;

// Pause game loop when tab is hidden (mobile optimization)
document.addEventListener('visibilitychange', () => {
  isPageVisible = !document.hidden;
  if (isPageVisible) {
    lastFrameTime = performance.now(); // Reset to prevent huge delta
  }
});

// ─────────────────────────────────────────────
// GAME LOOP
// ─────────────────────────────────────────────

function animate(timestamp) {
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
    }

    // Reset cached time for this frame (performance optimization)
    resetCachedTime();
    
    // Update Logic based on state
    if (state.gameState === 'countdown') {
      // Countdown timer - increment until duration reached
      state.countdownTimer++;
      // Update fighters during countdown to aim guns at opponents
      updateFighters();
      // Update flame particle system
      const dt = Math.min(FRAME_TIME / 1000, 0.1);
      flamewardenFlameSystem.update(dt);
      if (state.countdownTimer >= state.countdownDuration) {
        state.gameState = 'playing';
      }
    } else if (state.gameState === 'playing') {
      updateFighters();
      updateProjectiles();
      // Update flame particle system
      const dt = Math.min(FRAME_TIME / 1000, 0.1); // Convert to seconds, cap at 100ms
      flamewardenFlameSystem.update(dt);
    } else if (state.gameState === 'roundEnd') {
      // Keep fighters moving in background during winning display
      updateFighters();
      updateProjectiles();
      // Update flame particle system
      const dt = Math.min(FRAME_TIME / 1000, 0.1);
      flamewardenFlameSystem.update(dt);
      state.roundEndTimer++;
      // Wait for player to press space to continue
    } else if (state.gameState === 'matchEnd' && state.mode === '1v1') {
      // Keep fighters moving in background during match end display
      updateFighters();
      updateProjectiles();
      // Update flame particle system
      const dt = Math.min(FRAME_TIME / 1000, 0.1);
      flamewardenFlameSystem.update(dt);
      state.matchEndTimer++;
      // Wait for player to press space to continue
    }

    // Update death effects (always update, even between rounds)
    updateDeathEffects();
    updateIllusionDeathEffects();
    updateIllusionSpawnEffects();
    updateBerserkerRageEffects();
    // Update blood effects (always update, even between rounds)
    updateBloodEffects();
    // Update burn effects (always update, even between rounds)
    const dtGlobal = Math.min(FRAME_TIME / 1000, 0.1);
    if (state.gameState !== 'title' && state.gameState !== 'select' && state.gameState !== 'index' && state.gameState !== 'leaderboard') {
      state.fighters.forEach(fighter => {
        if (fighter && fighter.hp > 0 && fighter.burnTimer > 0) {
          burnEffectSystem.spawnBurnParticles(fighter);
        }
      });
    }
    burnEffectSystem.update(dtGlobal);
    bomberExplosionSystem.update(dtGlobal);

    // Draw Logic based on state
    if (state.gameState === 'title') {
      
      try {
        drawTitleScreen();
      } catch (screenError) {
        console.error('drawTitleScreen error:', screenError);
        // Fallback: clear and show empty canvas
        state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
        state.ctx.fillStyle = '#fff';
        state.ctx.font = 'bold 24px Arial';
        state.ctx.textAlign = 'center';
        state.ctx.fillText('ERROR in drawTitleScreen', state.canvas.width / 2, state.canvas.height / 2);
      }
    } else if (state.gameState === 'select') {
      drawSelectScreen();
    } else if (state.gameState === 'index') {
      drawIndexScreen();
    } else if (state.gameState === 'indexDetail') {
      drawIndexDetailScreen();
    } else if (state.gameState === 'leaderboard') {
      drawLeaderboardScreen();
    } else if (state.gameState === 'weapons') {
      drawWeaponMenu();
    } else if (state.gameState === 'weaponDetail') {
      drawWeaponDetailScreen();
    } else {
      drawArena();
      drawFlames(); // Draw all flames to offscreen canvas (batched for performance)
      flamewardenFlameSystem.draw(state.ctx); // Draw Flamewarden flamethrower particles
      drawFuelPickups();
      drawBlackHoleEffects(); // Draw blackhole effects BEFORE fighters so they appear behind
      drawFighters();
      drawIllusions(); // Draw Doppleganger illusions
      drawAllCronosSpheres(state.ctx); // Draw Cronos spheres on top of illusions
      drawProjectiles(); // Draw projectiles AFTER fighters so they appear on top of body
      bomberExplosionSystem.draw(state.ctx); // Draw high fidelity explosions
      burnEffectSystem.draw(state.ctx); // Draw burn particles
      drawFloatingTexts();
      drawDeathEffects(); // Draw death shatter effects on top of everything
      drawIllusionDeathEffects(); // Draw illusion death effects
      drawIllusionSpawnEffects(); // Draw illusion spawn effects
      drawBerserkerRageEffects(); // Draw berserker rage effects
      drawBloodEffects(); // Draw blood effects on top of everything

      // Draw FPS display
      state.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      state.ctx.font = '12px monospace';
      state.ctx.textAlign = 'left';
      state.ctx.fillText(`FPS: ${state.fps}`, 10, 20);

      // Composite flame canvas onto main canvas (after all other drawing)
      compositeFlameCanvas();

      if (state.gameState === 'playing') {
        drawHUD();
      } else if (state.gameState === 'countdown') {
        drawCountdown();
      } else if (state.gameState === 'paused') {
        drawPauseScreen();
      } else if (state.gameState === 'roundEnd') {
        drawRoundEndScreen();
        drawBloodEffects(); // Draw blood effects during round end
      } else if (state.gameState === 'matchEnd') {
        drawMatchEndScreen();
        drawBloodEffects(); // Draw blood effects during match end
      }
    }
  } catch (e) {
    console.error('Game loop error:', e);
  }

  requestAnimationFrame(animate);
}

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────

animate();
