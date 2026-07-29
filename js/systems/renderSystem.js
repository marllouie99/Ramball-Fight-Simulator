import { state } from '../core/state.js';
import {
  drawTitleScreen, drawSelectScreen, drawIndexScreen, drawIndexDetailScreen, 
  drawLeaderboardScreen, drawWeaponMenu, drawWeaponDetailScreen, drawHUD, 
  drawPauseScreen, drawRoundEndScreen, drawMatchEndScreen, drawCountdown
} from '../graphics/ui.js';
import {
  drawArena, drawProjectiles, drawFuelPickups, drawFighters, drawFloatingTexts, 
  drawFlames, drawDeathEffects, drawBlackHoleEffects, drawBloodEffects, drawIllusions, 
  drawIllusionDeathEffects, drawIllusionSpawnEffects, drawBerserkerRageEffects, 
  drawSparkEffects, drawPurpleDimScreen, drawStormDimScreen, drawFurnaceDimScreen, 
  drawRikaSummonDimScreen, drawTojiUltimateOverlay, drawMahoragaAdaptationDimScreen,
  drawAllCronosSpheres, drawThermobaricExplosions
} from '../graphics/draw.js';
import { compositeFlameCanvas } from '../graphics/canvasManager.js';
import { drawDoppelgangerDeathEffects } from '../graphics/particles/doppelgangerDeathEffect.js';
import { drawBlackFlashEffects } from '../graphics/particles/blackFlashEffect.js';
import { drawLightningEffects } from '../graphics/particles/lightningEffects.js';
import { renderYutaSukunaDomainClashRift } from '../entities/fighters/yuta/yutaDomainVisuals.js';
import { flamewardenFlameSystem } from '../graphics/weapons/flamewardenWeaponGraphics.js';
import { burnEffectSystem } from '../graphics/particles/burnEffectVisuals.js';
import { bomberExplosionSystem } from '../graphics/particles/bomberExplosionVisuals.js';

export function renderGame() {
    // Apply global screen shake (dampened smoothly back to zero as timer expires)
    let shakeX = 0, shakeY = 0;
    if (state.screenShake && state.screenShake.timer > 0) {
      const maxTimer = state.screenShake.maxTimer || state.screenShake.timer;
      const dampRatio = maxTimer > 0 ? (state.screenShake.timer / maxTimer) : 1.0;
      const currentIntensity = state.screenShake.intensity * dampRatio;
      
      shakeX = (Math.random() - 0.5) * currentIntensity * 2;
      shakeY = (Math.random() - 0.5) * currentIntensity * 2;
      state.screenShake.timer--;
      if (state.screenShake.timer <= 0) {
        state.screenShake.intensity = 0;
        state.screenShake.maxTimer = 0;
      }
    }

    // Sync HTML DOM Health HUD containers with screen shake so DOM cards and Canvas Arena shake as one locked unit
    const containerBottom = document.getElementById('healthHud');
    const containerLeft = document.getElementById('healthHudLeft');
    const containerRight = document.getElementById('healthHudRight');
    const hudTransform = (shakeX !== 0 || shakeY !== 0) ? `translate3d(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px, 0)` : '';
    if (containerBottom) containerBottom.style.transform = hudTransform;
    if (containerLeft) containerLeft.style.transform = hudTransform;
    if (containerRight) containerRight.style.transform = hudTransform;

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
      // Apply screen shake for game rendering
      const previousTransform = state.ctx.getTransform();
      try {
        state.ctx.translate(shakeX, shakeY);

        drawArena();

        // ── GLOBAL ARENA CLIP ──
        // Ensure absolutely no game visuals (fighters, projectiles, particles) can ever spill over the arena borders and obscure the HUD.
        state.ctx.save();
        if (state.arena) {
          state.ctx.beginPath();
          state.ctx.rect(state.arena.x, state.arena.y, state.arena.width, state.arena.height);
          state.ctx.clip();
        }
      drawPurpleDimScreen(); // Draw purple dim screen overlay when Gojo's Hollow Purple is active
      drawStormDimScreen(); // Draw dark dim screen overlay when Zeus is charging Storm
      drawFurnaceDimScreen(); // Draw dark fiery dim screen overlay with flame lightning when Sukuna channels Furnace (Fuga)
      drawRikaSummonDimScreen(); // Draw dark cursed energy dim screen overlay when Yuta summons Rika
      drawTojiUltimateOverlay(); // Draw pitch black overlay with Fly Heads when Toji uses Ultimate
      
      const isGojoDomainActive = state.fighters && state.fighters.some(f => f && (f.type === 'gojo' || (f._def && f._def.id === 'gojo')) && f.domainActive);

      if (!isGojoDomainActive) {
        drawFlames(); // Draw all flames to offscreen canvas (batched for performance)
        flamewardenFlameSystem.draw(state.ctx); // Draw Flamewarden flamethrower particles
      }
      
      drawFuelPickups();
      
      if (!isGojoDomainActive) {
        drawBlackHoleEffects(); // Draw blackhole effects BEFORE fighters so they appear behind
      }
      // Draw Domain Expansions (Render all active domains, blending them gracefully during domain clashes)
      if (state.fighters) {
        const activeDomainFighters = state.fighters
          .filter(f => f && (f.domainActive || (f.type === 'yuta' && f.rika && f.rika.active)))
          .sort((a, b) => {
            const aTime = (a && a.domainActive && a.domainActivationTime) ? a.domainActivationTime : 0;
            const bTime = (b && b.domainActive && b.domainActivationTime) ? b.domainActivationTime : 0;
            return aTime - bTime;
          });

        if (activeDomainFighters.length > 0) {

          activeDomainFighters.forEach((fighter, index) => {
            state.ctx.save();
            const isClashSecondary = (index > 0);
            if (isClashSecondary) {
              state.ctx.globalAlpha = 0.65;
            }
            if (fighter.drawDomainBackground) fighter.drawDomainBackground(state.ctx, isClashSecondary);
            if (fighter.drawDomainForeground) fighter.drawDomainForeground(state.ctx, isClashSecondary);
            state.ctx.restore();
          });

          // Render Yuta vs Sukuna Domain Clash Rift overlay on top of both domains
          if (activeDomainFighters.length > 1) {
            const yutaDomain = activeDomainFighters.find(f => f.type === 'yuta' || (f._def && f._def.id === 'yuta'));
            const sukunaDomain = activeDomainFighters.find(f => f.type === 'sukuna' || (f._def && f._def.id === 'sukuna'));
            if (yutaDomain && sukunaDomain) {
              renderYutaSukunaDomainClashRift(state.ctx, yutaDomain, sukunaDomain);
            }
          }
          
        }
      }

      // Draw thermobaric explosion shockwaves (Fuga) on the ground, before fighters
      const qualityLevel = state.qualityLevel || 1.0;
      const fps = state.fps || 60;
      const useAggressiveParticleMode = fps < 35 || qualityLevel < 0.4;

      if (!useAggressiveParticleMode && !isGojoDomainActive) {
        drawThermobaricExplosions(state.ctx); 
      }

      drawFighters();
      drawIllusions(); // Draw Doppleganger illusions
      drawAllCronosSpheres(state.ctx); // Draw Cronos spheres on top of illusions
      drawProjectiles(); // Draw projectiles AFTER fighters so they appear on top of body

      const isDomainClash = state.fighters && (state.fighters.filter(f => f && f.domainActive).length > 1);

      // OPTIMIZATION: Quality-based particle drawing (throttled during domain clashes for locked 60 FPS)
      if (!useAggressiveParticleMode && (!isDomainClash || Math.random() > 0.5) && !isGojoDomainActive) {
        bomberExplosionSystem.draw(state.ctx); // Draw high fidelity explosions
        burnEffectSystem.draw(state.ctx); // Draw burn particles
      }

      if (!useAggressiveParticleMode && !isGojoDomainActive) {
        drawDeathEffects(); // Draw death shatter effects on top of everything
        drawDoppelgangerDeathEffects();
        drawIllusionDeathEffects(); // Draw illusion death effects
        drawIllusionSpawnEffects(); // Draw illusion spawn effects
        drawBerserkerRageEffects(); // Draw berserker rage effects
      }

      if (!useAggressiveParticleMode && (!isDomainClash || Math.random() > 0.5) && !isGojoDomainActive) {
        drawBloodEffects(); // Draw blood effects on top of everything
      }
      if ((!useAggressiveParticleMode || Math.random() > (isDomainClash ? 0.65 : 0.4)) && !isGojoDomainActive) {
        drawSparkEffects(); // Draw spark effects on top of everything
      }
      if (!isGojoDomainActive) {
        drawBlackFlashEffects(state.ctx); // Draw Black Flash cursed energy impact
        drawLightningEffects(state.ctx); // Draw Zeus storm lightning strikes
      }

      drawMahoragaAdaptationDimScreen(); // Draw dark golden cinematic dim screen overlay when Mahoraga adapts wheel

      // Composite flame canvas onto main canvas (clipped to arena bounds)
      compositeFlameCanvas();

      drawFloatingTexts(); // Keep UI-like text on top of dim and flames

      // Restore the global arena clip so HUD and FPS logs can draw freely outside the arena
      state.ctx.restore();

      // Draw FPS display and logs (if not hidden by user pressing H)
      if (!state.hideFpsLogs) {
        state.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        state.ctx.font = '12px monospace';
        state.ctx.textAlign = 'left';
        state.ctx.fillText(`FPS: ${state.fps}`, 10, 20);

        // Draw FPS Drop Causes as a log list
        if (state.fpsLogs && state.fpsLogs.length > 0) {
          state.ctx.font = 'bold 12px monospace';
          state.ctx.textAlign = 'left';

          let startY = state.canvas.height - 10 - (state.fpsLogs.length * 16);

          // Draw copy and hide instructions if not copied recently
          if (!state.fpsLogsCopiedTimer || state.fpsLogsCopiedTimer <= 0) {
            state.ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
            state.ctx.fillText('Press C to copy logs | Press H to hide', 10, startY - 10);
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
      }


      if (state.gameState === 'playing' || state.gameState === 'countdown') {
        drawHUD();
      }

      } finally {
        // Restore canvas transform exactly (end screen shake)
        state.ctx.setTransform(previousTransform);
      }

      if (state.gameState === 'countdown') {
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
}
