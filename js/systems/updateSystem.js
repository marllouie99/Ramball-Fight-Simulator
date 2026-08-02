import { state } from '../core/state.js';
import { updateFighters, updateProjectiles } from './physics.js';
import { flamewardenFlameSystem } from '../graphics/weapons/flamewardenWeaponGraphics.js';
import { startNextRound, resetMatchWithRandom1v1Fighters, resetMatchWithRandom1v2Fighters, resetMatch } from '../core/gameFlow.js';
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
import { FRAME_TIME } from './gameLoop.js';

export function updateGame() {
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

    // OPTIMIZATION: Quality-based particle system updates
    const qualityLevel = state.qualityLevel || 1.0;
    const fps = state.fps || 60;
    const useAggressiveParticleMode = fps < 35 || qualityLevel < 0.4;

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
    // Update Black Flash effects (Todo's cursed energy strike)
    updateBlackFlashEffects();
    // Update lightning effects for Zeus storm strikes
    updateLightningEffects();
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
}
