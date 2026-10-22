import { survivorSystem } from './survivorSystem.js';
import { state, isGlobalHitPauseActive, triggerGlobalScreenShake } from '../core/state.js';
import { updateFighters, updateProjectiles } from './physics.js';
import { flamewardenFlameSystem } from '../graphics/weapons/flamewardenWeaponGraphics.js';
import { startNextRound, resetMatchWithRandom1v1Fighters, resetMatchWithRandom1v2Fighters, resetMatchWithRandomTagMatchFighters, resetMatch, startCountdown, startMatchDirectlyFromFaceOff, launchMatchOrBossEntrance } from '../core/gameFlow.js';
import { triggerFaceOffSFX } from '../graphics/ui/ThumbnailFaceOffScreen.js';
import { updateDeathEffects } from '../graphics/particles/deathShatterEffect.js';
import { updateIllusionDeathEffects } from '../graphics/particles/illusionDeathEffect.js';
import { updateDoppelgangerDeathEffects } from '../graphics/particles/doppelgangerDeathEffect.js';
import { updateIllusionSpawnEffects } from '../graphics/particles/illusionSpawnEffect.js';
import { updateBerserkerRageEffects } from '../graphics/particles/berserkerRageEffect.js';
import { updateBloodEffects } from '../graphics/particles/bloodEffect.js';
import { updateSparkEffects } from '../graphics/particles/sparkEffect.js';
import { updateBlackFlashEffects } from '../graphics/particles/blackFlashEffect.js';
import { updateLightningEffects } from '../graphics/particles/lightningEffects.js';
import { burnEffectSystem } from '../graphics/particles/burnEffectVisuals.js';
import { bomberExplosionSystem } from '../graphics/particles/bomberExplosionVisuals.js';
import { updateDriveBys } from './cjDriveBySystem.js';
import { FRAME_TIME } from './gameLoop.js';
import { updateArenaBgm, startArenaBgm, stopArenaBgm } from './arenaBgmSystem.js';
import { GAME_MODES, MODE_SETTINGS } from '../core/modeConfig.js';
import { getAnnouncerSound } from '../soundEffects/announcerSounds.js';
import { BossManager, BossEntranceSequence } from '../bosses/index.js';
import { audioSystem } from './audioSystem.js';
import { updateFocMap, getActiveFocMap, resetFocMapState } from '../../FOC Maps/index.js';
import { isFfaMode } from '../core/viewportManager.js';

export function updateGame() {
    // Increment global frame count on EVERY frame across all game states
    state.frameCount = (state.frameCount || 0) + 1;

    if (state.gameState === 'faceoff') {
      state.faceOffTimer = (state.faceOffTimer || 0) + 1;
      if (state.faceOffSavedToastTimer > 0) {
        state.faceOffSavedToastTimer--;
      }

      if (state.faceOffAutoStart) {
        // Launch in-arena countdown or boss entrance sequence directly!
        launchMatchOrBossEntrance();
        return;
      } else {
        // Manual thumbnail hold mode: hold at frame 120 (VS settled)
        if (state.faceOffTimer > 120) {
          state.faceOffTimer = 120;
        }
      }
      return;
    }

    if (state.gameState === 'boss_intro' || BossEntranceSequence.isActive) {
      BossEntranceSequence.update(1);
      return;
    }

    // Update Logic based on state
    if (state.gameState === 'countdown') {
      state.countdownTimer = (state.countdownTimer || 0) + 1;

      // Sequential 1-by-1 battle intro slide SFX with acoustic call-and-response pitch shifting
      if (state.countdownTimer === 1 && typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('battleintro_transitions', 1.0, 0.95); // Deep, weighty initial whoosh
      } else if (state.countdownTimer === 22 && typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('battleintro_transitions', 1.0, 1.06); // Crisp, high-velocity counter whoosh
      }

      // VS banner slam SFX and micro screen rumble at frame 44
      if (state.countdownTimer === 44) {
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('timertick', 1.0);
        }
        if (typeof triggerGlobalScreenShake === 'function') {
          triggerGlobalScreenShake(2.0, 4);
        }
      }

      // Fast, high-energy anime battle intro cinematic duration (95 frames / ~1.58s)
      const requiredCountdownFrames = 95;
      state.requiredCountdownFrames = requiredCountdownFrames;

      // Update fighters during countdown to aim guns/weapons at opponents
      updateArenaBgm();
      updateFighters();
      const dt = Math.min(FRAME_TIME / 1000, 0.1);
      flamewardenFlameSystem.update(dt);

      // FFA Countdown Center-Facing: Override every fighter's aim to face the arena center
      // during the countdown so players dramatically "stare down" the battlefield.
      if (isFfaMode(state.mode) && state.arena && state.fighters) {
        const _cX = state.arena.x + state.arena.width / 2;
        const _cY = state.arena.y + state.arena.height / 2;
        for (const f of state.fighters) {
          if (!f || f.hp <= 0 || f.dead) continue;
          const _angle = Math.atan2(_cY - f.y, _cX - f.x);
          f.gunAngle = _angle;
          f.angle = _angle;
        }
      }

      if (state.countdownTimer >= requiredCountdownFrames) {
        state.gameState = 'playing';
        state._isChampionLayoutActive = false;
        // Sequential Pre-Battle Animation:
        // Phase 1: FIGHT! banner pops first (frames 80 down to 44, duration 36 frames)
        // Phase 2: Poke Ball summon materializes fighters (frames 44 down to 0, duration 44 frames)
        state.battleStartDelayTimer = 80;
        state.battleStartDelayMax = 80;
        state.fightBannerTimer = 44;
        state.fightBannerMax = 44;
        state.countdownTimer = state.countdownDuration || 180;
        startArenaBgm(false);
        // Instant Battle Start Readiness: Clear initial spawn cooldowns so fighters attack & engage immediately
        if (state.fighters) {
          state.fighters.forEach(f => {
            if (f && f.hp > 0) {
              f._isFaceOff = false;
              f.hideHpText = true; // Hidden during Poke Ball summon
              f.shootCooldown = 0;
              f.cooldown = 0;
              f.meleeCooldown = 0;
              f.forcedMeleeTimer = 0;
              f.hitStunTimer = 0;
              f.knockbackStunTimer = 0;
              // Prevent fighters from charging directly forward into each other at battle start
              const startAngle = Math.random() * Math.PI * 2;
              const spd = f.speed || 3.0;
              f.vx = Math.cos(startAngle) * spd;
              f.vy = Math.sin(startAngle) * spd;
              if (f.type === 'gojo' || (f._def && f._def.type === 'gojo')) {
                f.combatAuraOpacity = 1;
              } else if (f.type === 'sukuna' || (f._def && f._def.type === 'sukuna')) {
                f.combatAuraOpacity = 1;
              }
            }
          });
        }
        return;
      }
      return;
    }
    
    if (state.gameState === 'playing') {
      if (state.fightBannerTimer > 0) {
        state.fightBannerTimer--;
        // Play fight announcer SFX + boxing ring bell on the FIGHT! banner slam impact (frame 5 of banner)
        if (state.fightBannerTimer === (state.fightBannerMax - 5)) {
          if (typeof triggerGlobalScreenShake === 'function') {
            triggerGlobalScreenShake(3.0, 5);
          }
          const fightSnd = getAnnouncerSound('fight');
          const bellSnd = getAnnouncerSound('ringbell');
          if (fightSnd && typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            audioSystem.playSFX(fightSnd.src, fightSnd.volume, fightSnd.speed, fightSnd.offset || 0);
          }
          if (bellSnd && typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            audioSystem.playSFX(bellSnd.src, bellSnd.volume, bellSnd.speed, bellSnd.offset || 0);
          }
        }
      }

      // Trigger fighter summon sound exactly when the fighters begin materializing (at frame 44)
      if (state.battleStartDelayTimer === 44) {
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('fighter_summon', 1.0);
        }
      }
      const isGlobalHitPausing = isGlobalHitPauseActive(state);
      if (!isGlobalHitPausing) {
        state.matchTimer = (state.matchTimer || 0) + 1;
      }
      updateArenaBgm();
      updateFighters();
      BossManager.update(1);
      updateProjectiles();
      updateDriveBys();
      if (state.mode === GAME_MODES.SURVIVOR || state.mode === 'Survivor') {
        survivorSystem.update(state.fighters[0], state.arena);
      }
      if (!isGlobalHitPausing) {
        // Update flame particle system
        const dt = Math.min(FRAME_TIME / 1000, 0.1); // Convert to seconds, cap at 100ms
        flamewardenFlameSystem.update(dt);
      }
    } else if (state.gameState === 'roundEnd') {
      const is1v1Mode = (state.mode === '1v1' || state.mode === '1 VS 1' || state.mode === '1v1 Match' || state.mode === GAME_MODES.ONE_VS_ONE || state.mode === GAME_MODES.HORIZONTAL_1V1 || state.mode === '1v1 Widescreen Duel');
      const maxWins = (state.scores && state.scores.length) ? Math.max(...state.scores) : 0;
      if (!is1v1Mode || maxWins >= 2) {
        stopArenaBgm(true);
      }
      updateArenaBgm();
      // Keep match timer, background particles, animations, and combat systems moving naturally without pause
      state.matchTimer = (state.matchTimer || 0) + 1;
      updateFighters();
      updateProjectiles();
      updateDriveBys();
      // Update flame particle system
      const dt = Math.min(FRAME_TIME / 1000, 0.1);
      flamewardenFlameSystem.update(dt);
      state.roundEndTimer++;

      // Auto next round / match (allow full duration for SF2 Announcer -> Fighter Voiceline -> Full Respect BGM playback)
      const isDragonDying = Boolean(state._hadDragonDeath || (state.deathEffects && state.deathEffects.some(e => e && (e.isEnderDragonDeath || (e.isEnderDragonXPOrb && !e.isSettled)))));
      const isSansDying = Boolean(state._hadSansDeath || (state.deathEffects && state.deathEffects.some(e => e && e.isSansHeartShatter)));
      const isRespectPlaying = Boolean(state._isRespectMusicPlaying || (state.missionPassedOverlay && state.missionPassedOverlay.active));
      const hasOverlay = Boolean(state._hadMissionOverlay || isRespectPlaying || (state.wastedOverlay && state.wastedOverlay.active));
      const isShiroDyingOrWinning = Boolean(
        state._shiroVictoryShutdown ||
        (state.fighters && state.fighters.some(f => f && (f.characterId === 'shiro' || f.type === 'shiro') && (f._hasSaidWinQuote || f.dead || f.hp <= 0)))
      );
      const autoDelay = isRespectPlaying ? 620 : (hasOverlay ? 480 : (isDragonDying ? 340 : (isSansDying ? 340 : (isShiroDyingOrWinning ? 380 : 200))));
      const isTodoUltPlaying = Boolean(state.fighters && state.fighters.some(f => 
        f && (f.characterId === 'todo' || f.type === 'todo') &&
        f.hp > 0 && !f.isDead && !f.dead &&
        ((f.takadaUltTimer > 0) || f.isTakadaUltActive || f.isTakadaChanneling || f.isTakadaBackgroundPlaying || f.takadaSongStarted)
      ));
      const isNamelessBeamActive = Boolean(state.fighters && state.fighters.some(f => 
        f && (f.characterId === 'namelessdeity' || f.characterId === 'nameless_deity' || f.type === 'namelessdeity') &&
        f.hp > 0 && !f.isDead && !f.dead &&
        (((f.destroyerFireTimer || 0) > 0) || ((f.destroyerWindupTimer || 0) > 0) || ((f.destroyerRecoveryTimer || 0) > 0))
      ));
      if (state.roundEndTimer >= autoDelay && !state._isRespectMusicPlaying && !isTodoUltPlaying && !isNamelessBeamActive) {
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

      const isDragonDying = Boolean(state._hadDragonDeath || (state.deathEffects && state.deathEffects.some(e => e && (e.isEnderDragonDeath || (e.isEnderDragonXPOrb && !e.isSettled)))));
      const isSansDying = Boolean(state._hadSansDeath || (state.deathEffects && state.deathEffects.some(e => e && e.isSansHeartShatter)));
      const isRespectPlaying = Boolean(state._isRespectMusicPlaying || (state.missionPassedOverlay && state.missionPassedOverlay.active));
      const hasOverlay = Boolean(state._hadMissionOverlay || isRespectPlaying || (state.wastedOverlay && state.wastedOverlay.active));
      const isNamelessBeamActive = Boolean(state.fighters && state.fighters.some(f => 
        f && (f.characterId === 'namelessdeity' || f.characterId === 'nameless_deity' || f.type === 'namelessdeity') &&
        f.hp > 0 && !f.isDead && !f.dead &&
        (((f.destroyerFireTimer || 0) > 0) || ((f.destroyerWindupTimer || 0) > 0) || ((f.destroyerRecoveryTimer || 0) > 0))
      ));
      // Match End: allow all death animations, particles, blood scars and celebrations to play naturally without clearing

      // Auto next match (allow full duration for SF2 Announcer -> Fighter Voiceline -> Full Respect BGM playback)
      const isShiroDyingOrWinning = Boolean(
        state._shiroVictoryShutdown ||
        (state.fighters && state.fighters.some(f => f && (f.characterId === 'shiro' || f.type === 'shiro') && (f._hasSaidWinQuote || f.dead || f.hp <= 0)))
      );
      const matchEndAutoDelay = isRespectPlaying ? 640 : (hasOverlay ? 600 : (isDragonDying ? 360 : (isSansDying ? 360 : (isShiroDyingOrWinning ? 400 : 280))));
      const isTodoUltPlaying = Boolean(state.fighters && state.fighters.some(f => 
        f && (f.characterId === 'todo' || f.type === 'todo') &&
        f.hp > 0 && !f.isDead && !f.dead &&
        ((f.takadaUltTimer > 0) || f.isTakadaUltActive || f.isTakadaChanneling || f.isTakadaBackgroundPlaying || f.takadaSongStarted)
      ));
      if (state.matchEndTimer >= matchEndAutoDelay && !state._isRespectMusicPlaying && !isTodoUltPlaying && !isNamelessBeamActive) {
        if (state.mode === '1v2 Stand Off') {
          resetMatchWithRandom1v2Fighters();
        } else if (state.mode === 'Tag Match' || state.mode === GAME_MODES.TAG_MATCH) {
          resetMatchWithRandomTagMatchFighters();
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
    // Update active FOC map physics (bush sway, rustle, leaf particles) strictly during battle
    const isBattleActive = Boolean(
      state.gameState === 'playing' ||
      state.gameState === 'countdown' ||
      state.gameState === 'roundEnd' ||
      state.gameState === 'matchEnd'
    );
    if (isBattleActive) {
      const activeFocMap = state.activeFocMap || getActiveFocMap();
      if (activeFocMap) {
        updateFocMap(1, activeFocMap);
      }
    } else {
      resetFocMapState();
    }
}
