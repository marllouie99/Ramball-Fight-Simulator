// ─────────────────────────────────────────────
// MAIN — Entry point for the ES6 module build
// ─────────────────────────────────────────────

import { state, getProjectiles } from './state.js';
import { initFlameCanvas, resizeFlameCanvas, compositeFlameCanvas } from '../graphics/canvasManager.js';
import { updateFighters, updateProjectiles, updateIllusions, spatialGrid } from '../systems/physics.js';
import { bomberExplosionSystem } from '../graphics/particles/bomberExplosionVisuals.js';
import { burnEffectSystem } from '../graphics/particles/burnEffectVisuals.js';
import { updateDeathEffects } from '../graphics/particles/deathShatterEffect.js';
import { updateIllusionDeathEffects } from '../graphics/particles/illusionDeathEffect.js';
import { updateDoppelgangerDeathEffects, drawDoppelgangerDeathEffects } from '../graphics/particles/doppelgangerDeathEffect.js';
import { updateIllusionSpawnEffects } from '../graphics/particles/illusionSpawnEffect.js';
import { updateBerserkerRageEffects } from '../graphics/particles/berserkerRageEffect.js';
import { updateBloodEffects } from '../graphics/particles/bloodEffect.js';
import { updateSparkEffects } from '../graphics/particles/sparkEffect.js';
import { updateLightningEffects, drawLightningEffects } from '../graphics/particles/lightningEffects.js';
import { startGame, startNextRound, resetMatchWithRandom1v1Fighters, restartCurrentRound, resetMatch } from './gameFlow.js';
import { FIGHTER_DEFS } from './config.js';
import { drawTitleScreen, drawSelectScreen, drawIndexScreen, drawIndexDetailScreen, drawLeaderboardScreen, drawWeaponMenu, drawWeaponDetailScreen, handleUIClick, handleUIMove, drawHUD, drawPauseScreen, drawRoundEndScreen, drawMatchEndScreen, drawCountdown } from '../graphics/ui.js';
import { drawArena, drawProjectiles, drawFuelPickups, drawFighters, drawFloatingTexts, drawFlames, drawDeathEffects, resetCachedTime, drawBlackHoleEffects, drawBloodEffects, drawIllusions, drawIllusionDeathEffects, drawIllusionSpawnEffects, drawBerserkerRageEffects, drawSparkEffects } from '../graphics/draw.js';
import { drawAllCronosSpheres } from '../graphics/draw.js';
import { stopAllSounds, stopAllLoopingSounds, unlockAudio } from '../systems/soundSystem.js';
import { flamewardenFlameSystem } from '../graphics/weapons/flamewardenWeaponGraphics.js';

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
  unlockAudio();

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
  } else if (e.key.toLowerCase() === 'c') {
    if (state.allFpsLogs && state.allFpsLogs.length > 0) {
      const logText = state.allFpsLogs.join('\n');
      navigator.clipboard.writeText(logText).catch(err => console.error('Failed to copy logs:', err));
      state.fpsLogsCopiedTimer = 120; // Show copied message for 2 seconds
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
  unlockAudio();

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

state.canvas.addEventListener('touchstart', () => {
  unlockAudio();
}, { passive: true });

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

      // Dynamic quality system - adjust based on FPS
      state.qualityCheckTimer++;
      if (state.qualityCheckTimer >= state.qualityCheckInterval) {
        state.qualityCheckTimer = 0;
        // Quality Level is locked to 1.0; no dynamic downgrading
        state.qualityLevel = 1.0;
      }

      // OPTIMIZED: Enforce hard cap on total particles
      const totalParticles = state.bloodEffects.length + state.deathEffects.length +
        state.berserkerRageEffects.length + state.sparkEffects.length +
        (burnEffectSystem?.particles?.length || 0) +
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

        let particleCount = state.bloodEffects.length + state.deathEffects.length + state.berserkerRageEffects.length;
        if (burnEffectSystem && burnEffectSystem.particles) particleCount += burnEffectSystem.particles.length;
        if (flamewardenFlameSystem && flamewardenFlameSystem.particles) particleCount += flamewardenFlameSystem.particles.length;
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

      // Auto next round / match
      const autoDelay = (state.mode === 'FFA' && state.ffaMatchComplete) ? 300 : 180;
      if (state.roundEndTimer >= autoDelay) {
        startNextRound();
      }
    } else if (state.gameState === 'matchEnd') {
      // Keep fighters moving in background during match end display
      updateFighters();
      updateProjectiles();
      // Update flame particle system
      const dt = Math.min(FRAME_TIME / 1000, 0.1);
      flamewardenFlameSystem.update(dt);
      state.matchEndTimer++;

      // Auto next match
      if (state.matchEndTimer >= 300) {
        if (state.mode === '1v1') {
          resetMatchWithRandom1v1Fighters();
        } else {
          // For 2v2 or others that might use matchEnd
          resetMatch();
        }
      }
    }

    // OPTIMIZATION: Quality-based particle system updates
    const qualityLevel = state.qualityLevel || 1.0;
    const fps = state.fps || 60;
    const useAggressiveParticleMode = false;

    // Update death effects (always update, even between rounds)
    if (!useAggressiveParticleMode || Math.random() > 0.5) {
      updateDeathEffects();
    }
    if (!useAggressiveParticleMode) {
      updateDoppelgangerDeathEffects();
      updateIllusionDeathEffects();
      updateIllusionSpawnEffects();
      updateBerserkerRageEffects();
    }
    // Update blood effects (always update, even between rounds)
    if (!useAggressiveParticleMode || Math.random() > 0.7) {
      updateBloodEffects();
    }
    // Update spark effects (always update, even between rounds)
    if (!useAggressiveParticleMode || Math.random() > 0.6) {
      updateSparkEffects();
    }
    updateLightningEffects(); // Update lightning effects
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
      // Apply Global Screen Shake via CSS transform (always resets cleanly)
      if (state.screenShake && state.screenShake.timer > 0) {
        state.screenShake.timer--;
        const curShake = state.screenShake.intensity;
        const offsetX = (Math.random() - 0.5) * curShake;
        const offsetY = (Math.random() - 0.5) * curShake;
        state.canvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        
        // Decay intensity
        state.screenShake.intensity *= 0.9;
        
        // Reset when done
        if (state.screenShake.timer <= 0) {
          state.canvas.style.transform = '';
          state.screenShake.intensity = 0;
        }
      }

      drawArena();
      drawFlames(); // Draw all flames to offscreen canvas (batched for performance)
      flamewardenFlameSystem.draw(state.ctx); // Draw Flamewarden flamethrower particles
      drawFuelPickups();
      drawBlackHoleEffects(); // Draw blackhole effects BEFORE fighters so they appear behind
      drawSparkEffects('background'); // Draw ground-level spark effects (debris, scorches) BEFORE fighters
      drawFighters();
      drawIllusions(); // Draw Doppleganger illusions
      drawAllCronosSpheres(state.ctx); // Draw Cronos spheres on top of illusions
      drawProjectiles(); // Draw projectiles AFTER fighters so they appear on top of body
      
      // Draw Laser Beams and Hit Glows ON TOP of fighters and normal projectiles
      if (state.fighters) {
        for (const f of state.fighters) {
          if (f && typeof f.drawBeamOverlay === 'function') {
            f.drawBeamOverlay(state.ctx);
          }
        }
      }

      // OPTIMIZATION: Quality-based particle drawing
      if (!useAggressiveParticleMode) {
        bomberExplosionSystem.draw(state.ctx); // Draw high fidelity explosions
        burnEffectSystem.draw(state.ctx); // Draw burn particles
      }
      drawLightningEffects(state.ctx); // Draw lightning effects above explosions but below floating texts
      drawFloatingTexts();

      if (!useAggressiveParticleMode) {
        drawDeathEffects(); // Draw death shatter effects on top of everything
        drawDoppelgangerDeathEffects();
        drawIllusionDeathEffects(); // Draw illusion death effects
        drawIllusionSpawnEffects(); // Draw illusion spawn effects
        drawBerserkerRageEffects(); // Draw berserker rage effects
      }

      drawBloodEffects(); // Draw blood effects on top of everything
      drawSparkEffects('foreground'); // Draw spark effects on top of everything

      // Draw FPS display
      state.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      state.ctx.font = '12px monospace';
      state.ctx.textAlign = 'left';
      state.ctx.fillText(`FPS: ${state.fps}`, 10, 20);

      // Draw FPS Drop Causes as a log list
      if (state.fpsLogs && state.fpsLogs.length > 0) {
        state.ctx.font = 'bold 12px monospace';
        state.ctx.textAlign = 'left';

        let startY = state.canvas.height - 10 - (state.fpsLogs.length * 16);

        // Draw copy instruction if not copied recently
        if (!state.fpsLogsCopiedTimer || state.fpsLogsCopiedTimer <= 0) {
          state.ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
          state.ctx.fillText('Press C to copy logs', 10, startY - 10);
        }

        for (let i = 0; i < state.fpsLogs.length; i++) {
          let log = state.fpsLogs[i];
          let alpha = Math.min(1, log.timer / 60); // Fade out
          state.ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
          state.ctx.fillText(log.text, 10, startY + (i * 16));
        }
      }

      // Draw copied notification
      if (state.fpsLogsCopiedTimer > 0) {
        state.ctx.font = 'bold 12px monospace';
        state.ctx.textAlign = 'left';
        let startY = state.canvas.height - 10 - ((state.fpsLogs ? state.fpsLogs.length : 0) * 16);
        state.ctx.fillStyle = `rgba(100, 255, 100, ${Math.min(1, state.fpsLogsCopiedTimer / 30)})`;
        state.ctx.fillText('Copied to clipboard!', 10, startY - 10);
      }

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
        drawSparkEffects(); // Draw spark effects during round end
      } else if (state.gameState === 'matchEnd') {
        drawMatchEndScreen();
        drawBloodEffects(); // Draw blood effects during match end
        drawSparkEffects(); // Draw spark effects during match end
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
