import { state } from '../core/state.js';
import { updateFighters, updateProjectiles } from './physics.js';
import { flamewardenFlameSystem } from '../graphics/weapons/flamewardenWeaponGraphics.js';
import { startNextRound, resetMatchWithRandom1v1Fighters, resetMatchWithRandom1v2Fighters, resetMatch, startCountdown, startMatchDirectlyFromFaceOff } from '../core/gameFlow.js';
import { triggerFaceOffSFX } from '../graphics/ui/ThumbnailFaceOffScreen.js';
import { updateDeathEffects } from '../graphics/particles/deathShatterEffect.js';
import { updateIllusionDeathEffects } from '../graphics/particles/illusionDeathEffect.js';
import { updateDoppelgangerDeathEffects } from '../graphics/particles/doppelgangerDeathEffect.js';
import { updateIllusionSpawnEffects } from '../graphics/particles/illusionSpawnEffect.js';
import { updateBerserkerRageEffects } from '../graphics/particles/berserkerRageEffect.js';
import { updateBloodEffects, clearAllBattleEffects } from '../graphics/particles/bloodEffect.js';
import { updateSparkEffects } from '../graphics/particles/sparkEffect.js';
import { updateBlackFlashEffects } from '../graphics/particles/blackFlashEffect.js';
import { updateLightningEffects } from '../graphics/particles/lightningEffects.js';
import { burnEffectSystem } from '../graphics/particles/burnEffectVisuals.js';
import { bomberExplosionSystem } from '../graphics/particles/bomberExplosionVisuals.js';
import { updateDriveBys } from './cjDriveBySystem.js';
import { FRAME_TIME } from './gameLoop.js';
import { updateArenaBgm, startArenaBgm, stopArenaBgm } from './arenaBgmSystem.js';
import { GAME_MODES } from '../core/modeConfig.js';

export function updateGame() {
    // Increment global frame count on EVERY frame across all game states
    state.frameCount = (state.frameCount || 0) + 1;

    if (state.gameState === 'faceoff') {
      state.faceOffTimer = (state.faceOffTimer || 0) + 1;
      if (state.faceOffSavedToastTimer > 0) {
        state.faceOffSavedToastTimer--;
      }

      if (state.faceOffAutoStart) {
        const isDark = (state.arenaTheme === 'dark');
        if (isDark) {
          // Dark Mode: Skip showoff screen, launch in-arena countdown directly!
          startCountdown();
          return;
        }

        // Light Mode: Full showoff with VS entrance + countdown
        if (state.faceOffTimer === 96) triggerFaceOffSFX('skill_dash5', 0.35); // VS clash
        if (state.faceOffTimer === 126) triggerFaceOffSFX('timertick', 0.90); // Countdown "3"
        if (state.faceOffTimer === 156) triggerFaceOffSFX('timertick', 0.90); // Countdown "2"
        if (state.faceOffTimer === 186) triggerFaceOffSFX('timertick', 0.90); // Countdown "1"
        if (state.faceOffTimer === 216) {
          triggerFaceOffSFX('fight', 1.0); // "FIGHT!" voice
          triggerFaceOffSFX('ringbell', 0.85); // Ring Bell gong
        }

        // When showoff countdown concludes at frame 242, launch directly into combat!
        if (state.faceOffTimer >= 242) {
          startMatchDirectlyFromFaceOff();
        }
      } else {
        // Manual thumbnail hold mode: hold at frame 120 (VS settled)
        if (state.faceOffTimer > 120) {
          state.faceOffTimer = 120;
        }
      }
      return;
    }

    // Update Logic based on state
    if (state.gameState === 'countdown') {
      const isDark = (state.arenaTheme === 'dark');
      if (isDark) {
        state.countdownTimer = (state.countdownTimer || 0) + 1;

        // Update fighters during countdown to aim guns at opponents
        updateFighters();
        const dt = Math.min(FRAME_TIME / 1000, 0.1);
        flamewardenFlameSystem.update(dt);

        if (state.countdownTimer >= 120) {
          state.gameState = 'playing';
          state._isChampionLayoutActive = false;
          state.battleStartDelayTimer = 0;
          state.countdownTimer = state.countdownDuration || 180;
          startArenaBgm(true);
          // Instant Battle Start Readiness: Clear initial spawn cooldowns so fighters attack & engage immediately
          if (state.fighters) {
            state.fighters.forEach(f => {
              if (f && f.hp > 0) {
                f._isFaceOff = false;
                f.hideHpText = false;
                f.shootCooldown = 0;
                f.cooldown = 0;
                f.meleeCooldown = 0;
                f.forcedMeleeTimer = 0;
                f.hitStunTimer = 0;
                f.knockbackStunTimer = 0;
                if (f.type === 'gojo' || (f._def && f._def.type === 'gojo')) {
                  f.combatAuraOpacity = 1;
                } else if (f.type === 'sukuna' || (f._def && f._def.type === 'sukuna')) {
                  f.combatAuraOpacity = 1;
                }
              }
            });
          }
        }
        return;
      }

      const isAnnouncerPlaying = state.announcerPlayingSequence;
      
      if (isAnnouncerPlaying) {
        state.countdownTimer = (state.countdownTimer || 0) + 1;
        // Update fighters during countdown to aim guns at opponents
        updateFighters();
        // Update flame particle system
        const dt = Math.min(FRAME_TIME / 1000, 0.1);
        flamewardenFlameSystem.update(dt);
      } else {
        state.gameState = 'playing';
        state._isChampionLayoutActive = false;
        state.battleStartDelayTimer = 22; // Small delay (22 frames / ~0.35s) before fighters start moving
        state.countdownTimer = state.countdownDuration; // Ensure countdown HUD clears/completes
        startArenaBgm(true);
        // Instant Battle Start Readiness: Clear initial spawn cooldowns so fighters attack & engage immediately when GO! hits!
        if (state.fighters) {
          state.fighters.forEach(f => {
            if (f && f.hp > 0) {
              f._isFaceOff = false;
              f.hideHpText = false;
              f.shootCooldown = 0;
              f.cooldown = 0;
              f.meleeCooldown = 0;
              f.forcedMeleeTimer = 0;
              f.hitStunTimer = 0;
              f.knockbackStunTimer = 0;
              if (f.type === 'gojo' || (f._def && f._def.type === 'gojo')) {
                f.combatAuraOpacity = 1;
              } else if (f.type === 'sukuna' || (f._def && f._def.type === 'sukuna')) {
                f.combatAuraOpacity = 1;
              }
            }
          });
        }
      }
    }
    
    if (state.gameState === 'playing') {
      const isNanamiPausing = state.fighters && state.fighters.some(f => f && (f.characterId === 'nanami' || f.type === 'nanami') && (f.ratioHitPauseTimer || 0) > 0);
      if (!isNanamiPausing) {
        state.matchTimer = (state.matchTimer || 0) + 1;
      }
      updateArenaBgm();
      updateFighters();
      updateProjectiles();
      updateDriveBys();
      if (!isNanamiPausing) {
        // Update flame particle system
        const dt = Math.min(FRAME_TIME / 1000, 0.1); // Convert to seconds, cap at 100ms
        flamewardenFlameSystem.update(dt);
      }
    } else if (state.gameState === 'roundEnd') {
      stopArenaBgm(true);
      // Keep match timer, background particles, animations, and combat systems moving naturally without pause
      state.matchTimer = (state.matchTimer || 0) + 1;
      updateFighters();
      updateProjectiles();
      updateDriveBys();
      // Update flame particle system
      const dt = Math.min(FRAME_TIME / 1000, 0.1);
      flamewardenFlameSystem.update(dt);
      state.roundEndTimer++;

      // Auto next round / match (allow full duration for SF2 Announcer -> Fighter Voiceline -> Follow For More banner)
      const hasOverlay = Boolean(state._hadMissionOverlay || (state.missionPassedOverlay && state.missionPassedOverlay.active) || (state.wastedOverlay && state.wastedOverlay.active));
      const isFFA = (state.mode === 'FFA' || state.mode === 'Tactical FFA' || state.mode === GAME_MODES.FFA || state.mode === GAME_MODES.TACTICAL_FFA);
      const isDark = Boolean(typeof state !== 'undefined' && (state.arenaTheme === 'dark' || state.darkMode));
      const autoDelay = isDark ? 180 : ((isFFA && state.ffaMatchComplete) ? (hasOverlay ? 480 : 380) : (hasOverlay ? 480 : 300));
      if (state.roundEndTimer >= autoDelay) {
        startNextRound();
      }
    } else if (state.gameState === 'matchEnd') {
      stopArenaBgm(true);
      // Keep match timer, background particles, animations, and combat systems moving naturally without pause
      state.matchTimer = (state.matchTimer || 0) + 1;
      updateFighters();
      updateProjectiles();
      updateDriveBys();
      // Update flame particle system
      const dt = Math.min(FRAME_TIME / 1000, 0.1);
      flamewardenFlameSystem.update(dt);
      state.matchEndTimer++;

      const hasOverlay = Boolean(state._hadMissionOverlay || (state.missionPassedOverlay && state.missionPassedOverlay.active) || (state.wastedOverlay && state.wastedOverlay.active));
      const blackoutFrame = hasOverlay ? 160 : 60;
      if (state.matchEndTimer === blackoutFrame) {
        clearAllBattleEffects();
      }

      // Auto next match (allow full duration for Mission Passed overlay + champion reveal)
      const isDark = Boolean(typeof state !== 'undefined' && (state.arenaTheme === 'dark' || state.darkMode));
      const matchEndAutoDelay = isDark ? 210 : (hasOverlay ? 540 : 360);
      if (state.matchEndTimer >= matchEndAutoDelay) {
        if (state.mode === '1v2 Stand Off') {
          resetMatchWithRandom1v2Fighters();
        } else if (state.mode === '1v1' || state.mode === 'Stand Off') {
          resetMatchWithRandom1v1Fighters();
        } else {
          // For 2v2 or others that might use matchEnd
          resetMatch();
        }
      }
    }

    // Update death effects (always update, even between rounds)
    updateDeathEffects();
    updateDoppelgangerDeathEffects();
    updateIllusionDeathEffects();
    updateIllusionSpawnEffects();
    updateBerserkerRageEffects();
    // Update blood effects (always update, even between rounds)
    updateBloodEffects();
    // Update spark effects (always update, even between rounds)
    updateSparkEffects();
    // Update Black Flash effects (Todo's cursed energy strike)
    updateBlackFlashEffects();
    // Update lightning effects for Zeus storm strikes
    updateLightningEffects();
    // Update burn effects (always update, even between rounds)
    const dtGlobal = Math.min(FRAME_TIME / 1000, 0.1);
    if (state.gameState !== 'title' && state.gameState !== 'select' && state.gameState !== 'index' && state.gameState !== 'leaderboard') {
      const burnFrame = (state.matchTimer || 0);
      state.fighters.forEach(fighter => {
        if (fighter && fighter.hp > 0 && fighter.burnTimer > 0 &&
            (burnFrame + (fighter.fighterIndex || 0)) % 2 === 0) {
          burnEffectSystem.spawnBurnParticles(fighter);
        }
      });
    }
    burnEffectSystem.update(dtGlobal);
    bomberExplosionSystem.update(dtGlobal);
}
