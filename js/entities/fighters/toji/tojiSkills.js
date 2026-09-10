// ─────────────────────────────────────────────
// TOJI FUSHIGURO SKILLS MODULE
// Handles Heavenly Restriction Channel Sense and Stealth Cloaking Mechanics
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { spawnImpactFlash, spawnCrimsonLightningImpact, spawnMeleeClashShockwave } from '../../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { pushTrailCap } from '../../../graphics/particles/visualTrailSystem.js';
import { tojiIsTargetDeadOrRemoved } from './tojiAmbush.js';

function getTojiTarget(fighter, opponent) {
  let target = opponent;
  if (tojiIsTargetDeadOrRemoved(fighter, target)) {
    if (typeof state !== 'undefined' && state.fighters) {
      const myIdx = state.fighters.indexOf(fighter);
      const myTeam = (typeof state.getFighterTeam === 'function' && myIdx >= 0) ? state.getFighterTeam(myIdx) : (fighter.team !== undefined ? fighter.team : null);
      let closestEnemy = null;
      let closestDist = Infinity;
      const candidates = [...state.fighters, ...(state.illusions || [])];
      for (const cand of candidates) {
        if (!cand || cand === fighter || tojiIsTargetDeadOrRemoved(fighter, cand)) continue;
        const candIdx = state.fighters.indexOf(cand);
        const candTeam = (typeof state.getFighterTeam === 'function' && candIdx >= 0) ? state.getFighterTeam(candIdx) : (cand.team !== undefined ? cand.team : (cand.owner ? cand.owner.team : null));
        if (myTeam !== null && candTeam !== null && myTeam === candTeam) continue;
        const d = Math.hypot(cand.x - fighter.x, cand.y - fighter.y);
        if (d < closestDist) {
          closestDist = d;
          closestEnemy = cand;
        }
      }
      if (closestEnemy) {
        target = closestEnemy;
      }
    }
  }
  return target;
}

/**
 * Checks if target is channeling a skill and initiates channel-interrupt ambush sequence.
 * @returns {Boolean} True if update loop should return early.
 */
export function modUpdateChannelSense(fighter, opponent) {
  if (fighter.isChainedByMakima || fighter.isCaughtInPurple || (fighter.purpleHitTimer && fighter.purpleHitTimer > 0)) return false;
  if (fighter._channelInterruptCooldown > 0) fighter._channelInterruptCooldown--;

  const target = getTojiTarget(fighter, opponent);

  if (!fighter.isAmbushing && !tojiIsTargetDeadOrRemoved(fighter, target)) {
    const isTargetChanneling = !!(
      target.isChargingUlt ||
      target.isFiringUlt ||
      target.isCharging ||
      target.isChannelingPurple ||
      target.isChannelingDomainExpansion ||
      target.isChannelingDomain ||
      target.isChannelingRCT ||
      (target.rctRevivalTimer || 0) > 0 ||
      target.isChannelingDivineFlame ||
      target.isChannelingStorm ||
      target.isChargingFuga ||
      target.isFiringFuga ||
      target.isChargingSeriousPunch ||
      (target.purpleChargeTimer || 0) > 0 ||
      (target.basicPunchChargeTimer || 0) > 0 ||
      (target._counterPunchTimer || 0) > 0 ||
      (target.flurryHitsLeft || 0) > 0 ||
      target.isFlurrying ||
      target.isCastingRed ||
      target.isCastingBlue ||
      target.isPreparingChain ||
      target.isSummoningSpear ||
      target.isExecutingRitual ||
      (target.isChanneling === true) ||
      (typeof target.isPerformingSkill === 'function' && target.isPerformingSkill())
    );

    if (isTargetChanneling) {
      const detectionRadius = CONFIG.toji?.channelDetectionRadius || 550;
      const dist = Math.hypot(target.x - fighter.x, target.y - fighter.y);

      // 1. Initial Detection & Instant Reaction
      if (dist <= detectionRadius && !fighter._hasAttemptedChannelInterrupt && !(fighter._channelInterruptCooldown > 0)) {
        fighter._hasAttemptedChannelInterrupt = true;
        const interruptChance = CONFIG.toji?.channelInterruptChance ?? 0.25;

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
          spawnCrimsonLightningImpact(fighter.x, fighter.y, 80);
          audioSystem.playSFX('skill_backstab', 1.0);

          // Set cooldown based on configuration
          fighter._channelInterruptCooldown = CONFIG.toji?.channelInterruptCooldownFrames || 800;

          // Forcefully break current state & launch Sequence 1 Ambush to interrupt!
          fighter.startAmbushSequence(target, true);
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
  if (!fighter) return false;

  const target = getTojiTarget(fighter, opponent);
  const ambushTrigger = CONFIG.toji?.ambushTriggerFrames || 55;
  const isAmbushReady = (fighter.stealthCooldown <= ambushTrigger);

  const isStunnedOrPinned = Boolean(
    fighter.isFrozen ||
    fighter.isTargetOfAmbush ||
    fighter.isChainedByMakima ||
    fighter.isCaughtInPurple ||
    (fighter.purpleHitTimer && fighter.purpleHitTimer > 0) ||
    fighter.isParalyzed ||
    (fighter.paralyzeTimer && fighter.paralyzeTimer > 0) ||
    (fighter.timeStopTimer && fighter.timeStopTimer > 0) ||
    fighter.isCurrentlyWallPinnedByMakima ||
    (fighter.makimaWallPinTimer && fighter.makimaWallPinTimer > 0) ||
    fighter.isWallPinnedBySaitama ||
    (fighter.hitStunTimer && fighter.hitStunTimer > 0) ||
    (fighter.redKnockbackTimer && fighter.redKnockbackTimer > 0)
  );
  const canAmbush = !fighter.isAmbushing && !isStunnedOrPinned;

  // If Ambush is ready and target is valid, launch Ambush sequence immediately!
  if (isAmbushReady && canAmbush && !tojiIsTargetDeadOrRemoved(fighter, target)) {
    fighter.startAmbushSequence(target);
    return true; // Abort update loop
  }

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
      }, 4);
    }

    if (fighter.stealthTimer <= 0) {
      fighter.isStealthed = false;
      fighter.stealthActive = false;
      fighter.stealthCooldown = fighter.stealthMaxCooldown;
      fighter._hasAttemptedChannelInterrupt = false;
      fighter._channelInterruptCooldown = 0;
    }
  } else if (fighter.stealthCooldown > 0) {
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
