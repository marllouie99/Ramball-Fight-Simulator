// ─────────────────────────────────────────────
// TOJI FUSHIGURO SKILLS MODULE
// Handles Heavenly Restriction Channel Sense and Stealth Cloaking Mechanics
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { spawnImpactFlash, spawnCrimsonLightningImpact, spawnMeleeClashShockwave } from '../../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { pushTrailCap } from '../../../graphics/particles/visualTrailSystem.js';
import { tojiIsTargetDeadOrRemoved } from './tojiAmbush.js';

/**
 * Checks if target is channeling a skill and initiates channel-interrupt ambush sequence.
 * @returns {Boolean} True if update loop should return early.
 */
export function modUpdateChannelSense(fighter, opponent) {
  if (fighter._channelInterruptCooldown > 0) fighter._channelInterruptCooldown--;

  if (!fighter.isAmbushing && !tojiIsTargetDeadOrRemoved(fighter, opponent)) {
    const isTargetChanneling = !!(
      opponent.isChannelingPurple ||
      opponent.isChannelingDomainExpansion ||
      opponent.isChannelingDomain ||
      opponent.isChannelingRCT ||
      (opponent.rctRevivalTimer || 0) > 0 ||
      opponent.isChannelingDivineFlame ||
      opponent.isChannelingStorm ||
      (opponent.isChanneling === true)
    );

    if (isTargetChanneling) {
      const detectionRadius = CONFIG.toji?.channelDetectionRadius || 600;
      const dist = Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y);

      // 1. Initial Detection & Instant Reaction
      if (dist <= detectionRadius && !fighter._hasAttemptedChannelInterrupt && !(fighter._channelInterruptCooldown > 0)) {
        fighter._hasAttemptedChannelInterrupt = true;
        const interruptChance = CONFIG.toji?.channelInterruptChance || 1.0;

        if (Math.random() <= interruptChance) {
          // Trigger reaction timer
          fighter._channelReactionTimer = CONFIG.toji?.channelReactionFrames ?? 10;
        }
      }

      // 2. Reaction Time Countdown
      if (fighter._channelReactionTimer > 0) {
        fighter._channelReactionTimer--;
        if (fighter._channelReactionTimer <= 0) {
          // Trigger visual & audio indicator for Channel Sense Interrupt!
          fighter.channelSenseIndicatorTimer = 35;
          spawnImpactFlash(fighter.x, fighter.y, 65, 'crimsonSniper');
          spawnMeleeClashShockwave(fighter.x, fighter.y, 110, 'yuta');
          spawnCrimsonLightningImpact(fighter.x, fighter.y, 80);
          audioSystem.playSFX('skill_backstab', 1.0);

          // Set cooldown so it can trigger again after 3 seconds (180 frames)
          fighter._channelInterruptCooldown = CONFIG.toji?.channelInterruptCooldownFrames || 180;

          // Forcefully break current state & launch Sequence 1 Ambush to interrupt!
          fighter.startAmbushSequence(opponent, true);
          return true; // Abort update loop
        }
      }
    } else {
      fighter._hasAttemptedChannelInterrupt = false; // Reset attempt lock when enemy is no longer channeling
      fighter._channelReactionTimer = 0; // Abort reaction if they finish casting before Toji can react!
    }
  }

  return false;
}

/**
 * Updates Stealth state, motion trails, and triggers ambush when cooldown is low.
 * @returns {Boolean} True if update loop should return early.
 */
export function modUpdateStealth(fighter, opponent) {
  if (fighter.stealthTimer > 0) {
    fighter.stealthTimer--;
    fighter.isStealthed = true;
    fighter.stealthActive = true;

    // Spawn motion trail afterimages while moving during stealth
    const speed = Math.hypot(fighter.vx || 0, fighter.vy || 0);
    if (speed > 0.15 && fighter.spearSwingTimer <= 0) {
      if (!fighter.stealthAfterimages) fighter.stealthAfterimages = [];
      pushTrailCap(fighter.stealthAfterimages, {
        x: fighter.x,
        y: fighter.y,
        angle: fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0),
        alpha: 0.60,
        initialAlpha: 0.60,
        maxTimer: 14,
        timer: 14
      }, 30);
    }

    if (fighter.stealthTimer <= 0) {
      fighter.isStealthed = false;
      fighter.stealthActive = false;
      fighter.stealthCooldown = fighter.stealthMaxCooldown;
      fighter._hasAttemptedChannelInterrupt = false;
      fighter._channelInterruptCooldown = 0;
    }
  } else if (fighter.stealthCooldown > 0) {
    const ambushTrigger = CONFIG.toji?.ambushTriggerFrames || 45;

    // Check if stealth cooldown is about to end -> launch ambush move sequence!
    if (!fighter.isAmbushing && fighter.stealthCooldown <= ambushTrigger && !tojiIsTargetDeadOrRemoved(fighter, opponent)) {
      fighter.startAmbushSequence(opponent);
      return true; // Abort update loop
    }

    fighter.stealthCooldown--;
    fighter.isStealthed = false;
    fighter.stealthActive = false;

    if (fighter.stealthCooldown <= 0) {
      fighter.stealthTimer = fighter.stealthMaxDuration;
      fighter.isStealthed = true;
      fighter.stealthActive = true;
      spawnImpactFlash(fighter.x, fighter.y, 25, '#A040FF');
    }
  }

  return false;
}
