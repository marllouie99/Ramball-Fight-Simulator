import { state } from '../core/state.js';
import { CONFIG } from '../core/config.js';
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
  drawAllCronosSpheres, drawThermobaricExplosions, drawThinIceBreakerDimScreen
} from '../graphics/draw.js';
import { compositeFlameCanvas } from '../graphics/canvasManager.js';
import { drawDoppelgangerDeathEffects } from '../graphics/particles/doppelgangerDeathEffect.js';
import { drawBlackFlashEffects } from '../graphics/particles/blackFlashEffect.js';
import { drawLightningEffects } from '../graphics/particles/lightningEffects.js';
import { renderYutaSukunaDomainClashRift } from '../entities/fighters/yuta/yutaDomainVisuals.js';
import { flamewardenFlameSystem } from '../graphics/weapons/flamewardenWeaponGraphics.js';
import { burnEffectSystem } from '../graphics/particles/burnEffectVisuals.js';
import { bomberExplosionSystem } from '../graphics/particles/bomberExplosionVisuals.js';
import { updateHybridProjectiles, updateHybridRika } from '../graphics/renderers/hybridProjectileRenderer.js';
import { updateHybridEnvironment, updateHybridCronospheres, updateHybridBerserkerRage } from '../graphics/renderers/hybridEnvironmentRenderer.js';

let _domHealthHud = null;
let _domHealthHudLeft = null;
let _domHealthHudRight = null;

export function renderGame() {
    // Clear the offscreen 2D canvas at the start of every frame so it's fully transparent
    // PixiJS will render this transparent canvas over its own background/particle layers
    state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);

    // Sync HTML HUD dimming with WebGL screen dimming
    const dimOpacity = (state.gameState === 'playing' || state.gameState === 'countdown') ? (state.globalDimOpacity || 0) : 0;
    document.documentElement.style.setProperty('--global-dim-opacity', dimOpacity);

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

    if (state.thinIceBreakerDimTimer && state.thinIceBreakerDimTimer > 0) {
      state.thinIceBreakerDimTimer--;
    }

    // Sync HTML DOM Health HUD containers with screen shake so DOM cards and Canvas Arena shake as one locked unit
    if (!_domHealthHud) _domHealthHud = document.getElementById('healthHud');
    if (!_domHealthHudLeft) _domHealthHudLeft = document.getElementById('healthHudLeft');
    if (!_domHealthHudRight) _domHealthHudRight = document.getElementById('healthHudRight');
    
    const hudTransform = (shakeX !== 0 || shakeY !== 0) ? `translate3d(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px, 0)` : '';
    if (_domHealthHud) _domHealthHud.style.transform = hudTransform;
    if (_domHealthHudLeft) _domHealthHudLeft.style.transform = hudTransform;
    if (_domHealthHudRight) _domHealthHudRight.style.transform = hudTransform;

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
      if (state.pixiApp) {
        state.pixiApp.stage.position.set(shakeX, shakeY);
      }
      
      state.globalDimEdgeColor = null; // Reset every frame
      
      drawArena();

        // ── GLOBAL ARENA CLIP ──
        // (Removed as per user request to allow visuals and dim screen effects to bleed outside the arena)
      drawStormDimScreen(); // Draw dark dim screen overlay when Zeus is charging Storm
      
      // Hook up hybrid environment renderer for WebGL full-screen dim effects
      updateHybridEnvironment();
      drawRikaSummonDimScreen(); // Draw dark cursed energy dim screen overlay when Yuta summons Rika
      drawThinIceBreakerDimScreen(); // Draw cyan/blue dark screen dim when Thin Ice Breaker lands
      // OPTIMIZED: Removed Canvas 2D dim screens for Purple and Fuga (now handled by hybridEnvironmentRenderer)

      const isGojoDomainActive = state.fighters && state.fighters.some(f => f && (f.type === 'gojo' || (f._def && f._def.id === 'gojo')) && f.domainActive);

      if (!isGojoDomainActive) {
        drawFlames(); // Draw all flames to offscreen canvas (batched for performance)
        flamewardenFlameSystem.draw(state.ctx); // Draw Flamewarden flamethrower particles
      }
      
      drawFuelPickups();
      
      if (!isGojoDomainActive) {
        drawBlackHoleEffects(); // Draw blackhole effects BEFORE fighters so they appear behind
      }
      // OPTIMIZED: Domain Expansions are now rendered exclusively in WebGL via updateHybridDomains() in hybridEnvironmentRenderer.js

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
      updateHybridProjectiles();
      updateHybridRika();
      updateHybridCronospheres();

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
        updateHybridBerserkerRage();
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

      // drawMahoragaAdaptationDimScreen() handled by hybrid environment renderer

      // Composite flame canvas onto main canvas (clipped to arena bounds)
      compositeFlameCanvas();

      drawFloatingTexts(); // Keep UI-like text on top of dim and flames

      // Restore the global arena clip so HUD and FPS logs can draw freely outside the arena
      // END GLOBAL ARENA CLIP (removed)

      // Draw FPS display and logs (if not hidden by user pressing H)
      if (!state.hideFpsLogs) {
        state.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; // Black/dark grey FPS text
        state.ctx.font = '12px monospace';
        state.ctx.textAlign = 'left';
        state.ctx.fillText(`FPS: ${state.fps}`, 10, 20);

        // Draw FPS Drop Causes as a log list
        if (state.fpsLogs && state.fpsLogs.length > 0) {
          state.ctx.font = 'bold 12px monospace';
          state.ctx.textAlign = 'left';

          // Position logs directly below the bottom of the arena
          let startY = CONFIG.arena.y + CONFIG.arena.height + 25;

          // Draw copy and hide instructions if not copied recently
          if (!state.fpsLogsCopiedTimer || state.fpsLogsCopiedTimer <= 0) {
            state.ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'; // Dark instruction text
            state.ctx.fillText('Press C to copy logs | Press H to hide', 10, startY - 12);
          }

          for (let i = 0; i < state.fpsLogs.length; i++) {
            let log = state.fpsLogs[i];
            let alpha = Math.min(1, log.timer / 60); // Fade out
            state.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`; // Black log list text
            state.ctx.fillText(log.text, 10, startY + (i * 16));
          }
        }

        // Draw copied notification
        if (state.fpsLogsCopiedTimer > 0) {
          state.ctx.font = 'bold 12px monospace';
          state.ctx.textAlign = 'left';
          let startY = CONFIG.arena.y + CONFIG.arena.height + 25;
          state.ctx.fillStyle = `rgba(100, 255, 100, ${Math.min(1, state.fpsLogsCopiedTimer / 30)})`;
          state.ctx.fillText('Copied to clipboard!', 10, startY - 12);
        }
      }


      if (state.gameState === 'playing' || state.gameState === 'countdown') {
        drawHUD();
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
    
    // PIXIJS SYNC: Tell the GPU that the offscreen 2D canvas and floating text canvas have updated this frame.
    // This allows the 2D canvas (fighters, UI) and floating texts to be rendered inside the WebGL scene graph.
    if (state.legacyCanvasSprite && state.legacyCanvasSprite.texture) {
      state.legacyCanvasSprite.texture.update();
    }
    if (state.floatingTextSprite && state.floatingTextSprite.texture) {
      state.floatingTextSprite.texture.update();
    }
}
