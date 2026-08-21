import { state } from '../core/state.js';
import { updateFighters, updateProjectiles } from './physics.js';
import { flamewardenFlameSystem } from '../graphics/weapons/flamewardenWeaponGraphics.js';
import { startNextRound, resetMatchWithRandom1v1Fighters, resetMatchWithRandom1v2Fighters, resetMatch } from '../core/gameFlow.js';
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
import { FRAME_TIME } from './gameLoop.js';

export function updateGame() {
    // Increment global frame count on EVERY frame across all game states
    state.frameCount = (state.frameCount || 0) + 1;

    // Update Logic based on state
    if (state.gameState === 'countdown') {
      const isAnnouncerPlaying = state.announcerPlayingSequence;
      
      if (isAnnouncerPlaying) {
        // Update fighters during countdown to aim guns at opponents
        updateFighters();
        // Update flame particle system
        const dt = Math.min(FRAME_TIME / 1000, 0.1);
        flamewardenFlameSystem.update(dt);
      } else {
        state.gameState = 'playing';
        state.countdownTimer = state.countdownDuration; // Ensure countdown HUD clears/completes
        // Instant Battle Start Readiness: Clear initial spawn cooldowns so fighters attack & engage immediately when GO! hits!
        if (state.fighters) {
          state.fighters.forEach(f => {
            if (f && f.hp > 0) {
              f.shootCooldown = 0;
              f.cooldown = 0;
              f.meleeCooldown = 0;
              f.forcedMeleeTimer = 0;
              f.hitStunTimer = 0;
              f.knockbackStunTimer = 0;

            }
          });
        }
      }
    }
    
    if (state.gameState === 'playing') {
      state.matchTimer = (state.matchTimer || 0) + 1;
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

      // Auto next round / match (allow full duration for Mission Passed overlay + winner reveal)
      const hasOverlay = Boolean(state.missionPassedOverlay);
      const autoDelay = (state.mode === 'FFA' && state.ffaMatchComplete) ? 320 : (hasOverlay ? 280 : 180);
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

      // At frame 60 the black overlay starts fading in — clear ALL lingering visual
      // effects at this exact moment so blood, sparks, wisps, and texts vanish
      // together with the blackout instead of bleeding through on top of it.
      if (state.matchEndTimer === 60) {
        clearAllBattleEffects();
      }

      // Auto next match (allow full duration for Mission Passed overlay + champion reveal)
      const hasOverlay = Boolean(state.missionPassedOverlay);
      const matchEndAutoDelay = hasOverlay ? 440 : 360;
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
