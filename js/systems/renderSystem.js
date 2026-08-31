import { state, isChampionScreenActive } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { GAME_MODES } from '../core/modeConfig.js';
import {
  drawTitleScreen, drawSelectScreen, drawIndexScreen, drawIndexDetailScreen, 
  drawLeaderboardScreen, drawWeaponMenu, drawWeaponDetailScreen, drawWeaponStudioScreen, drawFaceOffThumbnailScreen, drawHUD, 
  drawPauseScreen, drawRoundEndScreen, drawMatchEndScreen, drawCountdown, drawMissionPassedOverlay, drawWastedOverlay, drawKillFeed
} from '../graphics/ui.js';
import {
  drawArena, drawProjectiles, drawFuelPickups, drawFighters, drawFloatingTexts, drawUltimateChannelingTexts,
  drawFlames, drawDeathEffects, drawBlackHoleEffects, drawBloodEffects, drawDroppedMagazines, drawIllusions, 
  drawIllusionDeathEffects, drawIllusionSpawnEffects, drawBerserkerRageEffects, 
  drawSparkEffects, drawPurpleDimScreen, drawStormDimScreen, drawFurnaceDimScreen, 
  drawRikaSummonDimScreen, drawCjBaguvixDimScreen, drawMahitoDomainOverlay, drawTojiUltimateOverlay, drawMahoragaAdaptationDimScreen, drawMahoragaLevel8DimScreen,
  drawAllCronosSpheres, drawThermobaricExplosions, drawThinIceBreakerDimScreen,
  drawGenosSpeedLines, drawMahoragaSpeedLines, drawNanamiSpeedLines, drawSaitamaSpeedLines, drawIchigoBankaiSpeedLines, drawSaitamaSeriousPunchDimScreen, drawGenosSelfDestructDimScreen,
  drawTodoTakadaIdolScreenOverlay, drawNanamiRatioCritDimScreen, drawBankaiImpactDimScreen,
  drawDriveBys, drawDriveByGroundEffects, drawBamEffects,
  drawFloatingJetpacks, updateFloatingJetpacks,
  drawDroppedMiniguns, updateDroppedMiniguns
} from '../graphics/draw.js';
import { compositeFlameCanvas } from '../graphics/canvasManager.js';
import { drawDoppelgangerDeathEffects } from '../graphics/particles/doppelgangerDeathEffect.js';
import { drawBlackFlashEffects } from '../graphics/particles/blackFlashEffect.js';
import { drawLightningEffects } from '../graphics/particles/lightningEffects.js';
import { drawGetsugaImpactEffects, updateGetsugaImpactEffects } from '../graphics/particles/getsugaImpactEffect.js';
import { renderYutaSukunaDomainClashRift } from '../entities/fighters/yuta/yutaDomainVisuals.js';
import { flamewardenFlameSystem } from '../graphics/weapons/flamewardenWeaponGraphics.js';
import { burnEffectSystem } from '../graphics/particles/burnEffectVisuals.js';
import { bomberExplosionSystem } from '../graphics/particles/bomberExplosionVisuals.js';
import { updateHybridProjectiles, updateHybridRika, updateHybridSukunaFuga } from '../graphics/renderers/hybridProjectileRenderer.js';
import { updateHybridEnvironment, updateHybridCronospheres, updateHybridBerserkerRage } from '../graphics/renderers/hybridEnvironmentRenderer.js';
import { updateDroppedMagazines } from '../graphics/particles/johnWickDroppedMagazine.js';



export function renderGame() {
    // Clear the offscreen 2D canvas at the start of every frame so it's fully transparent
    // PixiJS will render this transparent canvas over its own background/particle layers
    state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);

    if (state.topLevelUiCtx) {
      state.topLevelUiCtx.clearRect(0, 0, state.topLevelUiCanvas.width, state.topLevelUiCanvas.height);
    }

    // Toggle WebGL layers visibility based on game state to prevent leftover battle visuals
    // and dim effects from glitching behind/above panels on menu/select/index screens.
    const isBattleState = !['title', 'select', 'index', 'indexDetail', 'leaderboard', 'weapons', 'weaponDetail', 'weaponStudio', 'faceoff'].includes(state.gameState);
    if (state.pixiLayers) {
      if (state.pixiLayers.background) state.pixiLayers.background.visible = isBattleState;
      if (state.pixiLayers.arena) state.pixiLayers.arena.visible = isBattleState;
      if (state.pixiLayers.shadows) state.pixiLayers.shadows.visible = isBattleState;
      if (state.pixiLayers.environment) state.pixiLayers.environment.visible = isBattleState;
      if (state.pixiLayers.projectiles) state.pixiLayers.projectiles.visible = isBattleState;
      if (state.pixiLayers.particles) state.pixiLayers.particles.visible = isBattleState;
      if (state.pixiLayers.effects) state.pixiLayers.effects.visible = isBattleState;
    }

    let stateDim = 0;
    const hasMissionOverlay = Boolean(state._hadMissionOverlay || (state.missionPassedOverlay && state.missionPassedOverlay.active) || (state.wastedOverlay && state.wastedOverlay.active));
    const dimStartFrame = hasMissionOverlay ? 160 : 60;
    if (state.gameState === 'matchEnd') {
      const timer = state.matchEndTimer || 0;
      const delayedTimer = Math.max(0, timer - dimStartFrame);
      stateDim = Math.min(0.96, (delayedTimer / 45) * 0.96);
    } else if (state.gameState === 'roundEnd') {
      const timer = state.roundEndTimer || 0;
      const delayedTimer = Math.max(0, timer - dimStartFrame);
      stateDim = Math.min(0.96, (delayedTimer / 45) * 0.96);
    }

    const baseDim = state.globalDimOpacity || 0;
    const targetDim = Math.max(baseDim, stateDim);

    // Smoothly interpolate current HUD dim opacity to eliminate sudden jumps
    if (state.currentHUDDimOpacity === undefined) {
      state.currentHUDDimOpacity = 0;
    }
    state.currentHUDDimOpacity += (targetDim - state.currentHUDDimOpacity) * 0.08;
    if (Math.abs(state.currentHUDDimOpacity - targetDim) < 0.005) {
      state.currentHUDDimOpacity = targetDim;
    }

    document.documentElement.style.setProperty('--global-dim-opacity', state.currentHUDDimOpacity);

    // Apply global screen shake (dampened smoothly back to zero as timer expires)
    let shakeX = 0, shakeY = 0;
    if (isChampionScreenActive() && state.screenShake) {
      state.screenShake.timer = 0;
      state.screenShake.maxTimer = 0;
      state.screenShake.intensity = 0;
    }
    if (state.screenShake && state.screenShake.timer > 0) {
      const maxTimer = state.screenShake.maxTimer || state.screenShake.timer;
      const dampRatio = maxTimer > 0 ? (state.screenShake.timer / maxTimer) : 1.0;
      const mult = (typeof CONFIG !== 'undefined' && CONFIG.globalScreenShakeIntensityMultiplier !== undefined) ? CONFIG.globalScreenShakeIntensityMultiplier : 1.0;
      
      const is1v2OrFFA = (typeof state !== 'undefined') && (
        state.mode === GAME_MODES.STAND_OFF_1V2 || 
        state.mode === '1v2 Stand Off' || 
        state.mode === '1v2' ||
        state.mode === GAME_MODES.FFA ||
        state.mode === 'FFA'
      );

      let effectiveIntensity = state.screenShake.intensity;
      if (is1v2OrFFA) {
        effectiveIntensity = Math.min(3.5, effectiveIntensity);
      }

      const currentIntensity = effectiveIntensity * dampRatio * mult;
      
      shakeX = (Math.random() - 0.5) * currentIntensity * 2;
      shakeY = (Math.random() - 0.5) * currentIntensity * 2;

      if (is1v2OrFFA) {
        const clampLimit = 3.5;
        shakeX = Math.max(-clampLimit, Math.min(clampLimit, shakeX));
        shakeY = Math.max(-clampLimit, Math.min(clampLimit, shakeY));
      }

      state.screenShake.timer--;
      if (state.screenShake.timer <= 0) {
        state.screenShake.intensity = 0;
        state.screenShake.maxTimer = 0;
      }
    }

    state.shakeX = shakeX;
    state.shakeY = shakeY;

    if (state.thinIceBreakerDimTimer && state.thinIceBreakerDimTimer > 0) {
      state.thinIceBreakerDimTimer--;
    }


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
    } else if (state.gameState === 'weaponStudio') {
      drawWeaponStudioScreen();
    } else if (state.gameState === 'faceoff') {
      // Hide gameplay WebGL layers and DOM HUD elements so they never linger on the showoff screen
      if (state.floatingTextSprite) state.floatingTextSprite.visible = false;
      if (state.floatingTextCtx && state.floatingTextCanvas) {
        state.floatingTextCtx.clearRect(0, 0, state.floatingTextCanvas.width, state.floatingTextCanvas.height);
      }
      if (state.pixiLayers) {
        if (state.pixiLayers.projectiles) state.pixiLayers.projectiles.visible = false;
        if (state.pixiLayers.particles) state.pixiLayers.particles.visible = false;
        if (state.pixiLayers.effects) state.pixiLayers.effects.visible = false;
        if (state.pixiLayers.environment) state.pixiLayers.environment.visible = false;
      }
      const hudTop = document.getElementById('hudTopContainer');
      const hudBot = document.getElementById('hudBottomContainer');
      const hudMain = document.getElementById('healthHud');
      const hudLeft = document.getElementById('healthHudLeft');
      const hudRight = document.getElementById('healthHudRight');
      if (hudTop) { hudTop.style.display = 'none'; hudTop.style.visibility = 'hidden'; }
      if (hudBot) { hudBot.style.display = 'none'; hudBot.style.visibility = 'hidden'; }
      if (hudMain) { hudMain.style.display = 'none'; hudMain.style.visibility = 'hidden'; }
      if (hudLeft) { hudLeft.style.display = 'none'; hudLeft.style.visibility = 'hidden'; }
      if (hudRight) { hudRight.style.display = 'none'; hudRight.style.visibility = 'hidden'; }

      drawFaceOffThumbnailScreen();
    } else {
      if (state.pixiLayers) {
        // Restore gameplay WebGL layers that were hidden during faceoff/menu screens
        if (state.pixiLayers.projectiles) state.pixiLayers.projectiles.visible = true;
        if (state.pixiLayers.particles) state.pixiLayers.particles.visible = true;
        if (state.pixiLayers.effects) state.pixiLayers.effects.visible = true;
        if (state.pixiLayers.environment) state.pixiLayers.environment.visible = true;
        // Stop shaking the arena layer (keep outer background static)
        if (state.pixiLayers.arena?.position?.set) state.pixiLayers.arena.position.set(0, 0);
        // OPTIMIZED: Only set positions if currently shaking or if we need to reset them to 0
        const hasShake = (shakeX !== 0 || shakeY !== 0);
        if (hasShake || state._lastShakeX !== 0 || state._lastShakeY !== 0) {
          if (state.pixiLayers.environment?.position?.set) state.pixiLayers.environment.position.set(shakeX, shakeY);
          if (state.pixiLayers.projectiles?.position?.set) state.pixiLayers.projectiles.position.set(shakeX, shakeY);
          if (state.pixiLayers.particles?.position?.set) state.pixiLayers.particles.position.set(shakeX, shakeY);
          if (state.pixiLayers.effects?.position?.set) state.pixiLayers.effects.position.set(shakeX, shakeY);
          state._lastShakeX = shakeX;
          state._lastShakeY = shakeY;
        }
      }
      if (state.pixiApp) {
        // Reset main stage position so external UI/elements do not shake
        state.pixiApp.stage.position.set(0, 0);
      }
      
      state.globalDimEdgeColor = null; // Reset every frame

      // Ensure 2D context transform matrix is clean before drawing
      state.ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      drawArena();

      // Translate 2D context for inside-arena shake ONLY when shaking
      const isShaking = (shakeX !== 0 || shakeY !== 0);
      state.ctx.save();
      if (isShaking) {
        state.ctx.translate(shakeX, shakeY);
      }

      try {

        // ── Clip all dim effects & WebGL overlays strictly to arena boundaries ──
        const hasArenaClip = Boolean(state.arena);
        if (hasArenaClip) {
          state.ctx.save();
          state.ctx.beginPath();
          if (state.arena.shape === 'circle') {
            const cx = state.arena.x + state.arena.width / 2;
            const cy = state.arena.y + state.arena.height / 2;
            const ar = state.arena.radius || (state.arena.width / 2);
            state.ctx.arc(cx, cy, ar, 0, Math.PI * 2);
          } else {
            state.ctx.rect(state.arena.x, state.arena.y, state.arena.width, state.arena.height);
          }
          state.ctx.clip();

          // Apply PIXI mask on WebGL effects and environment layers to clip dim/ring sprites to arena
          if (state.pixiLayers && (state.pixiLayers.effects || state.pixiLayers.environment) && state.arena) {
            if (!state._darkDimMask) {
              state._darkDimMask = new window.PIXI.Graphics();
            }
            state._darkDimMask.clear();
            state._darkDimMask.beginFill(0xffffff);
            if (state.arena.shape === 'circle') {
              const cx = state.arena.x + state.arena.width / 2;
              const cy = state.arena.y + state.arena.height / 2;
              const ar = state.arena.radius || (state.arena.width / 2);
              state._darkDimMask.drawCircle(cx, cy, ar);
            } else {
              state._darkDimMask.drawRect(state.arena.x, state.arena.y, state.arena.width, state.arena.height);
            }
            state._darkDimMask.endFill();
            if (state.pixiLayers.effects) state.pixiLayers.effects.mask = state._darkDimMask;
            if (state.pixiLayers.environment) state.pixiLayers.environment.mask = state._darkDimMask;
          }
        }

        // ── FULL-SCREEN DIM EFFECTS & DOMAIN BACKGROUNDS (Rendered behind fighters so fighters stay un-tinted) ──
        drawStormDimScreen(); // Draw dark dim screen overlay when Zeus is charging Storm
        updateHybridEnvironment(); // WebGL & 2D full-screen dim effects (Gojo Purple, Sukuna Fuga, Mahoraga adaptation)
        drawPurpleDimScreen(); // 2D Gojo Hollow Purple radial dim overlay
        drawFurnaceDimScreen(); // 2D Sukuna Fuga Furnace radial dim overlay
        drawRikaSummonDimScreen(); // Draw dark cursed energy dim screen overlay when Yuta summons Rika
        drawCjBaguvixDimScreen(); // 2D CJ BAGUVIX God Mode dark Grove Street emerald green radial dim overlay
        drawThinIceBreakerDimScreen(); // Draw cyan/blue dark screen dim when Thin Ice Breaker lands
        drawMahoragaAdaptationDimScreen();
        drawMahoragaLevel8DimScreen();
        drawTojiUltimateOverlay();
        drawSaitamaSeriousPunchDimScreen();
        drawGenosSelfDestructDimScreen(); // Smooth dim on charge + cyan starburst on explosion
        drawBankaiImpactDimScreen(); // Short black-crimson radial dim on Ichigo Bankai lightning impact

        // ── Restore clip after dim effects ──
        if (hasArenaClip) {
          state.ctx.restore();
          // Remove PIXI mask so other WebGL layers are unaffected
          if (state.pixiLayers?.effects) {
            state.pixiLayers.effects.mask = null;
          }
          if (state.pixiLayers?.environment) {
            state.pixiLayers.environment.mask = null;
          }
        }

        const isGojoDomainActive = state.fighters && state.fighters.some(f => f && (f.type === 'gojo' || (f._def && f._def.id === 'gojo')) && f.domainActive);

        if (!isGojoDomainActive) {
          drawFlames(); // Draw all flames to offscreen canvas (batched for performance)
        }
        
        drawFuelPickups();
        
        if (!isGojoDomainActive) {
          drawBlackHoleEffects(); // Draw blackhole effects BEFORE fighters so they appear behind
        }
        // OPTIMIZED: Domain Expansions are now rendered exclusively in WebGL via updateHybridDomains() in hybridEnvironmentRenderer.js

        // Draw thermobaric explosion shockwaves (Fuga) on the ground, before fighters
        if (!isGojoDomainActive) {
          drawThermobaricExplosions(state.ctx); 
        }

        // Draw active domain foreground structures (e.g. Sukuna's Malevolent Shrine) on top of the arena border & floor, but behind fighters
        if (state.fighters) {
          for (const f of state.fighters) {
            if (f && f.domainActive && typeof f.drawDomainForeground === 'function') {
              f.drawDomainForeground(state.ctx);
            }
          }
        }

        // Draw drive-by skid marks, burnout oil puddle & headlights on the ground, before fighters
        drawDriveByGroundEffects(state.ctx);

        drawGenosSpeedLines(); // Full-screen anime action speed lines during Machine Gun Blows
        drawNanamiSpeedLines(); // Supersonic manga action speed lines during Nanami blitz/lunges
        drawSaitamaSpeedLines(); // Manga action speed lines during Consecutive Normal Punches
        drawIchigoBankaiSpeedLines(); // Supersonic Bankai manga speed lines during Ichigo dashes/swings
        drawMahoragaSpeedLines(); // Supersonic manga action speed lines during Mahoraga wall slam dash/strike/blitz
        // Draw character ground telegraphs & targeting reticles UNDERNEATH fighters
        if (state.fighters) {
          for (const f of state.fighters) {
            if (f && typeof f.drawGroundTelegraph === 'function') {
              f.drawGroundTelegraph(state.ctx);
            }
          }
        }

        drawTodoTakadaIdolScreenOverlay(); // Dreamy Takada-chan idol screen overlay during Todo's channeling/ultimate
        drawFighters(); // Draw fighters ON TOP of dim screens so Gojo & fighters stay 100% visible & un-tinted!
        drawDriveBys(state.ctx); // Draw Greenwood sedan, homies & tire burnout smoke
        drawIllusions(); // Draw Doppleganger illusions
        drawAllCronosSpheres(state.ctx); // Draw Cronos spheres on top of illusions
        drawProjectiles(); // Draw projectiles AFTER fighters so they appear on top of body
        updateHybridProjectiles();
        updateHybridRika();
        updateHybridSukunaFuga();
        updateHybridCronospheres();



        const isDomainClash = state.fighters && (state.fighters.filter(f => f && f.domainActive).length > 1);

        // WebGL particles are rendered automatically by the PixiJS scene graph.

        drawDeathEffects(); // Draw death shatter effects on top of everything
        drawDoppelgangerDeathEffects();
        drawIllusionDeathEffects(); // Draw illusion death effects
        drawIllusionSpawnEffects(); // Draw illusion spawn effects
        drawBerserkerRageEffects(); // Draw berserker rage effects
        updateHybridBerserkerRage();

        drawBloodEffects(); // Draw blood effects on top of everything
        updateDroppedMagazines();
        drawDroppedMagazines(state.ctx); // Draw John Wick dropped magazines on the arena floor
        updateFloatingJetpacks();
        drawFloatingJetpacks(state.ctx); // Draw CJ dropped 360 rotating floating Jetpack pickups on the arena floor
        updateDroppedMiniguns();
        drawDroppedMiniguns(state.ctx); // Draw CJ dropped overheated Minigun on the arena floor
        drawSparkEffects(); // Draw spark effects on top of everything
        drawBamEffects(state.ctx); // Draw comic BAM! impact effects on top of collisions
        drawBlackFlashEffects(state.ctx); // Draw Black Flash cursed energy impact
        drawLightningEffects(state.ctx); // Draw Zeus storm lightning strikes
        updateGetsugaImpactEffects();
        drawGetsugaImpactEffects(state.ctx); // Draw Bleach Getsuga Tensho spatial cleave impact effects

        // Nanami 7:3 Ratio Ruler & Blood Rupture overlay renders ON TOP of all fighters & entities
        drawNanamiRatioCritDimScreen();

        // Composite flame canvas onto main canvas (clipped to arena bounds)
        compositeFlameCanvas();

        if (state.floatingTextSprite) state.floatingTextSprite.visible = true;
        drawFloatingTexts(); 
        drawUltimateChannelingTexts();

        // Draw FPS display and logs (if not hidden by user pressing H)
        if (!state.hideFpsLogs) {
          const isDark = Boolean(typeof state !== 'undefined' && (state.arenaTheme === 'dark' || state.darkMode || (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))));
          state.ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)'; // Light FPS text in dark mode, dark in light mode
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
              state.ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)';
              state.ctx.fillText('Press C to copy logs | Press H to hide', 10, startY - 12);
            }

            for (let i = 0; i < state.fpsLogs.length; i++) {
              let log = state.fpsLogs[i];
              let alpha = Math.min(1, log.timer / 60); // Fade out
              state.ctx.fillStyle = isDark ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
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
      } finally {
        state.ctx.restore();
        state.ctx.setTransform(1, 0, 0, 1, 0, 0); // Always reset transform matrix cleanly
      }

      const originalCtx = state.ctx;
      const originalCanvas = state.canvas;

      // Swap to top-level UI context/canvas for UI rendering
      state.ctx = state.topLevelUiCtx;
      state.canvas = state.topLevelUiCanvas;

      if (state.topLevelUiCtx) {
        state.topLevelUiCtx.setTransform(1, 0, 0, 1, 0, 0);
      }

      if (state.gameState === 'playing' || state.gameState === 'countdown') {
        drawHUD();
      }

      if (state.gameState === 'playing') {
        const isDarkPlaying = (state.arenaTheme === 'dark');

        // Smooth White Flash Veil Dissolve when entering arena from Face-Off Countdown (disabled in Dark Mode)
        if (!isDarkPlaying && state.battleStartFadeTimer && state.battleStartFadeTimer > 0) {
          state.battleStartFadeTimer--;
          const uiCtx = state.topLevelUiCtx || state.ctx;
          const flashAlpha = Math.max(0, state.battleStartFadeTimer / 16);
          uiCtx.save();
          uiCtx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.95})`;
          uiCtx.fillRect(0, 0, state.canvas.width, state.canvas.height);
          uiCtx.restore();
        }
        // Dark Mode: Skip white flash but still tick down the timer
        if (isDarkPlaying && state.battleStartFadeTimer && state.battleStartFadeTimer > 0) {
          state.battleStartFadeTimer = 0;
        }
      } else if (state.gameState === 'countdown') {
        drawCountdown();

        // Smooth Arena Entrance Flash Fade
        if ((state.countdownTimer || 0) < 14) {
          const uiCtx = state.topLevelUiCtx || state.ctx;
          const flashAlpha = Math.max(0, 1 - (state.countdownTimer || 0) / 14);
          uiCtx.save();
          uiCtx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.95})`;
          uiCtx.fillRect(0, 0, state.canvas.width, state.canvas.height);
          uiCtx.restore();
        }
      } else if (state.gameState === 'paused') {
        drawPauseScreen();
      } else if (state.gameState === 'roundEnd') {
        drawRoundEndScreen();
      } else if (state.gameState === 'matchEnd') {
        drawMatchEndScreen();
      }

      // Render GTA San Andreas "mission passed! RESPECT +" and "WASTED" overlays on top level before champion reveal
      drawMissionPassedOverlay(state.topLevelUiCtx || state.ctx);
      drawWastedOverlay(state.topLevelUiCtx || state.ctx);

      // Render Counter-Strike style kill feed in top-right arena corner
      drawKillFeed(state.topLevelUiCtx || state.ctx);

      // Restore original context and canvas
      state.ctx = originalCtx;
      state.canvas = originalCanvas;
    }
    
    // PIXIJS SYNC: Tell the GPU that the offscreen 2D canvas and floating text canvas have updated this frame.
    // This allows the 2D canvas (fighters, UI) and floating texts to be rendered inside the WebGL scene graph.
    if (state.legacyCanvasSprite && state.legacyCanvasSprite.texture) {
      state.legacyCanvasSprite.texture.update();
    }
    if (state.floatingTextSprite && state.floatingTextSprite.texture) {
      state.floatingTextSprite.texture.update();
    }
    if (state.topLevelUiSprite && state.topLevelUiSprite.texture) {
      state.topLevelUiSprite.texture.update();
    }
}
