/**
 * Special Interaction Module: Gojo Satoru vs Saitama
 * 
 * Implements:
 * 1. Saitama's physical attacks deal structural damage and crack Gojo's Limitless Infinity barrier.
 * 2. Serious Skill Counter instantly shatters Gojo's barrier with 99,999 structural damage,
 *    triggering flying glass crystal shards, thin-ice breaker audio, and penetrating to deal direct HP damage.
 * 3. Proactive first-impact teleport evasion against Gojo's Hollow Purple.
 */

import { gojoSaitamaConfig } from '../configs/interactions/gojoSaitamaConfig.js';
import { CONFIG } from '../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../core/state.js';
import { spawnInfinityGlassShards } from '../graphics/particles/deathShatterEffect.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../graphics/particles/sparkEffect.js';
import { audioSystem } from '../systems/audioSystem.js';

/**
 * Checks if an entity is Gojo Satoru.
 * @param {Object} fighter
 * @returns {boolean}
 */
export function isGojoEntity(fighter) {
  if (!fighter) return false;
  return fighter.characterId === 'gojo' || fighter.type === 'gojo' || fighter._def?.id === 'gojo';
}

/**
 * Checks if an entity is Saitama.
 * @param {Object} fighter
 * @returns {boolean}
 */
export function isSaitamaEntity(fighter) {
  if (!fighter) return false;
  return fighter.characterId === 'saitama' || fighter.type === 'saitama' || fighter._def?.id === 'saitama';
}

/**
 * Checks if Saitama is an active living enemy in the match.
 * @param {Object} fighter
 * @param {Object} [stateObj]
 * @returns {boolean}
 */
export function hasSaitamaEnemy(fighter, stateObj = state) {
  if (!fighter || !stateObj || !Array.isArray(stateObj.fighters)) return false;
  return stateObj.fighters.some(f =>
    f && f !== fighter &&
    isSaitamaEntity(f) &&
    !fighter.isTeammate?.(f) &&
    (typeof f.isEffectivelyAlive === 'function' ? f.isEffectivelyAlive() : (f.hp > 0 && !f.dead && !f.isDead))
  );
}

/**
 * Checks if Gojo is an active living enemy in the match.
 * @param {Object} fighter
 * @param {Object} [stateObj]
 * @returns {boolean}
 */
export function hasGojoEnemy(fighter, stateObj = state) {
  if (!fighter || !stateObj || !Array.isArray(stateObj.fighters)) return false;
  return stateObj.fighters.some(f =>
    f && f !== fighter &&
    isGojoEntity(f) &&
    !fighter.isTeammate?.(f) &&
    (typeof f.isEffectivelyAlive === 'function' ? f.isEffectivelyAlive() : (f.hp > 0 && !f.dead && !f.isDead))
  );
}

/**
 * Computes structural barrier damage for an incoming attack from Saitama.
 * @param {number} amount
 * @param {Object} attacker
 * @param {Object} opts
 * @returns {number}
 */
export function computeSaitamaBarrierDamage(amount, attacker, opts = {}) {
  const isSaitamaCountering = isSaitamaEntity(attacker) && (
    (attacker?._counterPunchTimer && attacker._counterPunchTimer > 0) ||
    (attacker?._counterWindupTimer && attacker._counterWindupTimer > 0) ||
    (attacker?._postCounterRecoveryTimer && attacker._postCounterRecoveryTimer > 0) ||
    opts.isCounter ||
    attacker?.isCountering
  );

  if (opts.isSaitamaCounter || isSaitamaCountering) {
    return gojoSaitamaConfig.seriousCounterDamage ?? 99999;
  }
  if (opts.isSeriousPunch) {
    return gojoSaitamaConfig.seriousPunchDamage ?? 280;
  }
  if (opts.isFinalBlow) {
    return gojoSaitamaConfig.finalBlowDamage ?? 120;
  }
  if (opts.isMachineGunBlow) {
    return gojoSaitamaConfig.flurryPunchDamage ?? 35;
  }
  if (opts.isSaitamaPunch || opts.isBasic || opts.isMelee) {
    return gojoSaitamaConfig.normalPunchDamage ?? 70;
  }
  if (typeof amount === 'number' && amount > 0) {
    return Math.max(35, Math.min(250, Math.round(amount * 0.5)));
  }
  return gojoSaitamaConfig.normalPunchDamage ?? 70;
}

/**
 * Executes the structural damage and crack pipeline on Gojo's Limitless Infinity barrier.
 * @param {Object} gojo
 * @param {number} damage
 * @param {Object} attacker
 * @param {Object} opts
 */
export function applyGojoBarrierDamage(gojo, damage, attacker, opts = {}) {
  if (!gojo) return;
  const maxHp = gojo.infinityBarrierMaxHp || gojoSaitamaConfig.barrierMaxHp || 350;
  gojo.infinityBarrierHp = Math.max(0, (gojo.infinityBarrierHp !== undefined ? gojo.infinityBarrierHp : maxHp) - damage);

  // Update visual crack tier level based on remaining barrier integrity
  const hpRatio = gojo.infinityBarrierHp / maxHp;
  if (gojo.infinityBarrierHp <= 0 || hpRatio <= 0.35) {
    gojo.infinityCrackLevel = 3;
  } else if (hpRatio <= 0.70) {
    gojo.infinityCrackLevel = 2; // Tier 2: Heavy spiderweb fractures
  } else if (hpRatio < 1.0) {
    gojo.infinityCrackLevel = 1; // Tier 1: Light hairline stress cracks
  } else {
    gojo.infinityCrackLevel = 0;
  }

  // Barrier vibration / shudder timer
  gojo.infinityCrackShakeTimer = 12;

  // Contact visual effects
  const barrierRadius = CONFIG.gojo?.infinityRadius ?? (gojo.r + 30);
  const gojoY = gojo.y - (gojo.z || 0);
  let contactAngle = (gojo.gunAngle !== undefined) ? gojo.gunAngle : 0;
  if (attacker && attacker !== gojo) {
    contactAngle = Math.atan2((attacker.y - (attacker.z || 0)) - gojoY, attacker.x - gojo.x);
  }
  const contactX = gojo.x + Math.cos(contactAngle) * barrierRadius;
  const contactY = gojoY + Math.sin(contactAngle) * barrierRadius;

  if (typeof spawnSparks === 'function') {
    spawnSparks(contactX, contactY, 12, 'cyan', '#00E5FF');
  }
  if (typeof spawnMeleeClashShockwave === 'function') {
    spawnMeleeClashShockwave(contactX, contactY, 75, 'gojo_infinity');
  }
  if (typeof spawnImpactFlash === 'function') {
    spawnImpactFlash(contactX, contactY, 35, '#FFFFFF');
  }

  // Floating text indicator
  if (typeof spawnFloatingText === 'function') {
    const crackLabel = (gojo.infinityCrackLevel === 1)
      ? '⚡ CRACK!'
      : ((gojo.infinityCrackLevel === 2) ? '⚡ FRACTURE!' : '⚡ CRITICAL STRESS!');
    spawnFloatingText(contactX, contactY - 18, crackLabel, '#00E5FF');
  }

  if (gojo.infinityBarrierHp <= 0) {
    shatterGojoInfinityBarrier(gojo, attacker, opts);
  }
}

/**
 * Shatters Gojo's Limitless Infinity barrier, putting it on broken cooldown and spawning glass shards.
 * @param {Object} gojo
 * @param {Object} attacker
 * @param {Object} [opts]
 */
export function shatterGojoInfinityBarrier(gojo, attacker, opts = {}) {
  if (!gojo) return;
  gojo.infinityActive = false;
  gojo.infinityCooldown = CONFIG.gojo?.infinityBrokenCooldown ?? (gojoSaitamaConfig.brokenLockoutCooldown ?? 360);
  gojo.infinityBarrierHp = 0;
  gojo.infinityCrackLevel = 3;
  gojo.infinityFadeOpacity = 0;
  gojo.infinityBlockTimer = 0;

  // Sound effect: thin-ice-breaker.mp3
  if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
    audioSystem.playSFX(gojoSaitamaConfig.shatterSFX || 'Assets/Sound Effects/Skills/thin-ice-breaker.mp3', 2.0);
  }

  // Spawn explosion of flying glass crystal shards
  const barrierRadius = CONFIG.gojo?.infinityRadius ?? (gojo.r + 30);
  const shardCount = gojoSaitamaConfig.shatterGlassShards ?? 28;
  if (typeof spawnInfinityGlassShards === 'function') {
    spawnInfinityGlassShards(gojo.x, gojo.y - (gojo.z || 0), barrierRadius, shardCount);
  }

  // Global screen shake on barrier shattering
  if (typeof triggerGlobalScreenShake === 'function') {
    triggerGlobalScreenShake(
      gojoSaitamaConfig.shatterScreenShakeIntensity ?? 18,
      gojoSaitamaConfig.shatterScreenShakeDuration ?? 20
    );
  }

  // Floating announcement text
  if (typeof spawnFloatingText === 'function') {
    spawnFloatingText(gojo.x, (gojo.y - (gojo.z || 0)) - gojo.r - 35, 'INFINITY SHATTERED!', '#00E5FF');
  }

  if (typeof spawnImpactFlash === 'function') {
    spawnImpactFlash(gojo.x, gojo.y - (gojo.z || 0), 60, '#00E5FF');
  }
}
