import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { pushTrailCap } from '../../../graphics/particles/visualTrailSystem.js';
import { spawnMeleeClashShockwave, spawnImpactFlash, spawnSparks, spawnParrySparksEffect } from '../../../graphics/particles/sparkEffect.js';
import { applyDamageToTarget } from '../../fighter.js';
import { isHollowTransformationVoicelinePlaying, stopHollowTransformationVoiceline } from './ichigoHollow.js';
import { stopBankaiVoiceline } from './ichigoBankai.js';
import { fireGetsuga, isAboutToUnleashNormalGetsuga, isGetsugaActive, isGetsugaVoicelinePlaying, isFinalGetsugaVoicelinePlaying, stopFinalGetsugaVoiceline, getCardinalAimAngle, snapToCardinalAngle } from './ichigoGetsuga.js';
import { spawnIchigoSlashEffect } from '../../../graphics/weapons/ichigoWeaponGraphics.js';

/**
 * Clamps coordinates strictly inside the arena bounds to prevent flash stepping outside arena walls.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {number} x
 * @param {number} y
 * @param {number} [r]
 * @returns {{x: number, y: number}}
 */
export function clampToArena(fighter, x, y, r = fighter.r) {
  const arenaObj = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
  if (!arenaObj) return { x, y };

  const margin = r + 6;

  // Handle circular arena if present
  if (arenaObj.radius) {
    const dx = x - (arenaObj.x || 0);
    const dy = y - (arenaObj.y || 0);
    const dist = Math.hypot(dx, dy);
    const maxDist = arenaObj.radius - margin;
    if (dist > maxDist && dist > 0) {
      return {
        x: (arenaObj.x || 0) + (dx / dist) * maxDist,
        y: (arenaObj.y || 0) + (dy / dist) * maxDist
      };
    }
    return { x, y };
  }

  // Standard rectangular arena (x, y, width, height)
  const minX = (arenaObj.x || 0) + margin;
  const maxX = (arenaObj.x || 0) + (arenaObj.width || 800) - margin;
  const minY = (arenaObj.y || 0) + margin;
  const maxY = (arenaObj.y || 0) + (arenaObj.height || 600) - margin;

  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y))
  };
}

/**
 * Returns true if Ichigo is free to perform basic attacks.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {Function} [superCanPerformBasicAttack]
 * @returns {boolean}
 */
export function canPerformBasicAttack(fighter, superCanPerformBasicAttack) {
  if (isGetsugaActive(fighter)) return false;
  if (fighter.isChannelingBankai || fighter.bankaiBurstTimer > 0 || fighter.shikaiReversionBurstTimer > 0 || fighter.hollowMaskFormationTimer > 0 || fighter.hollowBurstTimer > 0 || isAboutToUnleashNormalGetsuga(fighter) || fighter.isChannelingGetsuga || fighter.getsugaRecoveryTimer > 0 || fighter.isShunpoDashing || fighter.shunpoComboActive || isFinalGetsugaVoicelinePlaying(fighter)) return false;
  return typeof superCanPerformBasicAttack === 'function' ? superCanPerformBasicAttack() : true;
}

/**
 * Evaluates whether Ichigo is currently engaged in a multi-strike Flash Step combo.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @returns {boolean}
 */
export function isShunpoComboActive(fighter) {
  return Boolean(
    fighter.shunpoComboActive ||
    fighter.isShunpoDashing ||
    fighter.isShunpoDisengaging ||
    (fighter.shunpoComboDelayTimer && fighter.shunpoComboDelayTimer > 0) ||
    (fighter.shunpoDisengageDelayTimer && fighter.shunpoDisengageDelayTimer > 0) ||
    (fighter.isChannelingGetsuga && fighter._isComboGetsuga) ||
    (fighter.getsugaRecoveryTimer && fighter.getsugaRecoveryTimer > 0 && fighter._isComboGetsuga)
  );
}

/**
 * Checks if Flash Step skill is enabled.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @returns {boolean}
 */
export function isFlashStepEnabled(fighter) {
  return fighter.isSkillEnabled(
    CONFIG.ichigo?.enableFlashStep ??
    CONFIG.ichigo?.enableShunpo ??
    CONFIG.ichigo?.flashStepEnabled ??
    CONFIG.ichigo?.shunpoEnabled,
    true
  );
}

/**
 * Checks if Shunpo multi-strike flurry is enabled.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @returns {boolean}
 */
export function isFlurryEnabled(fighter) {
  return fighter.isSkillEnabled(
    CONFIG.ichigo?.enableFlurryAttack ??
    CONFIG.ichigo?.enableFlurry ??
    CONFIG.ichigo?.flurryEnabled ??
    CONFIG.ichigo?.enableShunpoCombo ??
    CONFIG.ichigo?.shunpoComboEnabled,
    true
  );
}

/**
 * Compatibility stub for single flash step strikes.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {Object} target
 */
export function performShunpoStrike(fighter, target) {
  performShunpoGetsugaCombo(fighter, target);
}

/**
 * Initiates the Flash Step Shunpo Getsuga multi-strike combo.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {Object} target
 */
export function performShunpoGetsugaCombo(fighter, target) {
  if (!isFlashStepEnabled(fighter)) return;
  if (fighter.isDead || fighter.hp <= 0 || fighter.isTargetOfAmbush || fighter.wallSlamPinnedX !== undefined || fighter.isWallSlammed) return;
  if (fighter.shunpoCooldown > 0) return;
  if (fighter.isChannelingBankai || fighter.bankaiBurstTimer > 0 || fighter.shikaiReversionBurstTimer > 0 || fighter.hollowMaskFormationTimer > 0 || fighter.hollowBurstTimer > 0 || fighter.isChannelingGetsuga || fighter.getsugaRecoveryTimer > 0 || fighter.isShunpoDashing || fighter.shunpoComboActive || isFinalGetsugaVoicelinePlaying(fighter)) return;
  if (fighter.bankaiActive && !fighter.bankaiFinalGetsugaTriggered && fighter.bankaiTimer <= (CONFIG.ichigo?.bankaiFinalGetsugaTriggerTimer || 160)) return;
  if (!target || target.hp <= 0) return;

  // Supreme Poise: clear incoming hit-stun and pushback displacement
  fighter.hitStunTimer = 0;
  fighter.knockbackVx = 0;
  fighter.knockbackVy = 0;
  fighter.vx = 0;
  fighter.vy = 0;
  const baseAngle = Math.atan2(fighter.y - target.y, fighter.x - target.x);
  
  const isBankai = fighter.bankaiActive || fighter.skin === 'bankai';
  const isMask = fighter.hollowMaskActive;
  const flurry = isFlurryEnabled(fighter);

  let maxStrikes = 1;
  if (flurry) {
    maxStrikes = isBankai 
      ? (CONFIG.ichigo?.bankaiShunpoStrikes || 6) 
      : (CONFIG.ichigo?.shunpoStrikes || 4);
    if (isMask) {
      const maskStrikeMult = CONFIG.ichigo?.hollowShunpoStrikesMultiplier ?? 1.2;
      maxStrikes = Math.round(maxStrikes * maskStrikeMult);
    }
  }

  let cdMult = 1.0;
  if (isBankai) {
    cdMult *= (CONFIG.ichigo?.bankaiComboCooldownMultiplier ?? CONFIG.ichigo?.bankaiShunpoCooldownMultiplier ?? 0.50);
  }
  if (isMask) {
    cdMult *= (CONFIG.ichigo?.hollowComboCooldownMultiplier ?? CONFIG.ichigo?.hollowShunpoCooldownMultiplier ?? 0.25);
  }

  const baseCd = !flurry 
    ? (CONFIG.ichigo?.flashStepCooldown ?? CONFIG.ichigo?.singleShunpoCooldown ?? 320)
    : (CONFIG.ichigo?.comboCooldown || CONFIG.ichigo?.shunpoCooldown || 450);
  const cd = Math.round(baseCd * cdMult);
  fighter.shunpoCooldown = cd;
  fighter.getsugaCooldown = cd;

  // Flash Step Initiation
  fighter.shunpoTarget = target;
  fighter.shunpoComboActive = true;
  fighter.isMeleeCleave = false;
  fighter.slashSwingTimer = 0;
  fighter.slashSwingVariant = 0;
  fighter.blockPoseTimer = 0;
  fighter.parryHitAnimTimer = 0;
  fighter.shunpoComboStep = 1;
  fighter.shunpoMaxSteps = maxStrikes;
  fighter.isShunpoDisengaging = false;
  fighter.shunpoDisengageDelayTimer = 0;
  fighter._shunpoBaseAngle = baseAngle;

  const offset = target.r + (CONFIG.ichigo?.shunpoTargetOffset || 34);

  // Flash step 1: Target flank angle 1 (+110° / +1.92 rad offset)
  const angle1 = baseAngle + 1.92;
  const startClamped = clampToArena(fighter, fighter.x, fighter.y);
  fighter.shunpoStartX = startClamped.x;
  fighter.shunpoStartY = startClamped.y;
  const rawTx = target.x + Math.cos(angle1) * offset;
  const rawTy = target.y + Math.sin(angle1) * offset;
  const targetClamped = clampToArena(fighter, rawTx, rawTy);

  fighter.shunpoTargetX = targetClamped.x;
  fighter.shunpoTargetY = targetClamped.y;

  fighter.isShunpoDashing = true;
  fighter.shunpoDashTimer = isBankai ? 3 : (CONFIG.ichigo?.shunpoDashDuration || 4);

  // Immediately seed start position afterimage
  pushTrailCap(fighter.afterImages, {
    x: startClamped.x,
    y: startClamped.y,
    r: fighter.r,
    angle: fighter.angle,
    color: (isBankai || isMask) ? 'rgba(12, 4, 10, 0.75)' : 'rgba(0, 213, 255, 0.45)',
    strokeColor: (isBankai || isMask) ? 'rgba(220, 20, 20, 0.90)' : null,
    isBankai: (isBankai || isMask),
    timer: 12,
    maxTimer: 12
  }, 18);

  spawnFloatingText(fighter.x, fighter.y - fighter.r - 20, isBankai ? 'TENSA SHUNPO!' : 'SHUNPO!', isBankai ? '#DC143C' : '#FFFFFF');
  fighter._playSound('shunpoDash', 'Assets/Sound Effects/Skills/dash1.mp3', 0.85);

  if (isMask && !isHollowTransformationVoicelinePlaying(fighter)) {
    const noiseChance = CONFIG.ichigo?.soundChances?.hollowFlurryNoise ?? 0.50;
    if (Math.random() < noiseChance) {
      const hollowNoise = CONFIG.ichigo?.sounds?.hollowFlurryNoise || 'Assets/Sound Effects/Attacks/ichigo-attack-hollow-noise.mp3';
      const hollowVol = CONFIG.ichigo?.soundVolumes?.hollowFlurryNoise ?? 2.8;
      if (typeof audioSystem !== 'undefined' && typeof audioSystem.playFighterVoiceline === 'function') {
        audioSystem.playFighterVoiceline(fighter, hollowNoise, hollowVol, 1.0, 0, 0, {
          priority: 'protected',
          isProtected: true,
          durationMs: 1400
        });
      } else {
        fighter._playSound('hollowFlurryNoise', hollowNoise, hollowVol);
      }
    }
  }
}

/**
 * Initiates Ichigo's 3-Hit 5-Phase Cursed Melee Combo (Rule 30 compliant).
 * Hit 1: Heavy Diagonal Cleave (Overhead to downward cleave & impact lock)
 * Hit 2: Rising Crescent Scoop (Low crouch to upward rising scoop & apex lock)
 * Hit 3: Two-Handed Execution Sunder (Massive two-handed chop & floor impact lock)
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {Object} [target]
 */
export function performMeleeCleave(fighter, target) {
  if (!fighter.isSkillEnabled(CONFIG.ichigo?.enableMeleeCleave, true)) return;
  if (fighter.isDead || fighter.hp <= 0 || fighter.isParalyzedOrBeamTrapped() || fighter.wallSlamPinnedX !== undefined || fighter.isWallSlammed) return;
  if (isGetsugaActive(fighter)) return;
  if (fighter.isChannelingBankai || fighter.bankaiBurstTimer > 0 || fighter.shikaiReversionBurstTimer > 0 || fighter.hollowMaskFormationTimer > 0 || fighter.hollowBurstTimer > 0 || fighter.isChannelingGetsuga || fighter.getsugaRecoveryTimer > 0 || fighter.isShunpoDashing || fighter.shunpoComboActive || isFinalGetsugaVoicelinePlaying(fighter)) return;
  if (fighter.bankaiActive && !fighter.bankaiFinalGetsugaTriggered && fighter.bankaiTimer <= (CONFIG.ichigo?.bankaiFinalGetsugaTriggerTimer || 160)) return;

  const cfg = CONFIG.ichigo || {};
  const isBankai = fighter.bankaiActive || fighter.skin === 'bankai';
  const isMask = fighter.hollowMaskActive;

  // Advance combo step (1 -> 2 -> 3 -> 1)
  if (!fighter.comboResetTimer || fighter.comboResetTimer <= 0) {
    fighter.swordComboStep = 1;
  } else {
    fighter.swordComboStep = (fighter.swordComboStep % 3) + 1;
  }
  const step = fighter.swordComboStep;

  let liftF, holdF, strikeF, pinF, recF, dmg, kb, lunge, hitPause, hitStun, shake;
  if (step === 1) {
    liftF = cfg.hit1LiftFrames ?? 7;
    holdF = cfg.hit1HoldFrames ?? 2;
    strikeF = cfg.hit1StrikeFrames ?? 5;
    pinF = cfg.hit1ImpactLockFrames ?? 5;
    recF = cfg.hit1RecoveryFrames ?? 9;
    dmg = cfg.hit1Damage ?? 12;
    kb = cfg.hit1Knockback ?? 4.5;
    lunge = cfg.hit1LungeSpeed ?? 6.2;
    hitPause = cfg.hit1HitPauseFrames ?? 4;
    hitStun = cfg.hit1HitStunFrames ?? 12;
    shake = cfg.hit1ImpactShake ?? 4.0;
  } else if (step === 2) {
    liftF = cfg.hit2LiftFrames ?? 6;
    holdF = cfg.hit2HoldFrames ?? 2;
    strikeF = cfg.hit2StrikeFrames ?? 5;
    pinF = cfg.hit2ImpactLockFrames ?? 6;
    recF = cfg.hit2RecoveryFrames ?? 10;
    dmg = cfg.hit2Damage ?? 16;
    kb = cfg.hit2Knockback ?? 6.5;
    lunge = cfg.hit2LungeSpeed ?? 7.0;
    hitPause = cfg.hit2HitPauseFrames ?? 4;
    hitStun = cfg.hit2HitStunFrames ?? 14;
    shake = cfg.hit2ImpactShake ?? 5.5;
  } else {
    liftF = cfg.hit3LiftFrames ?? 8;
    holdF = cfg.hit3HoldFrames ?? 3;
    strikeF = cfg.hit3StrikeFrames ?? 6;
    pinF = cfg.hit3ImpactLockFrames ?? 8;
    recF = cfg.hit3RecoveryFrames ?? 14;
    dmg = cfg.hit3Damage ?? 24;
    kb = cfg.hit3Knockback ?? 9.0;
    lunge = cfg.hit3LungeSpeed ?? 8.5;
    hitPause = cfg.hit3HitPauseFrames ?? 5;
    hitStun = cfg.hit3HitStunFrames ?? 18;
    shake = cfg.hit3ImpactShake ?? 8.0;
  }

  // Form scaling
  if (isBankai) {
    dmg *= (cfg.bankaiDamageMultiplier || 1.2);
    lunge *= 1.25;
  }
  if (isMask) {
    dmg *= (cfg.hollowDamageMultiplier || 1.3);
    lunge *= 1.15;
  }

  const totalFrames = liftF + holdF + strikeF + pinF + recF;
  fighter.isMeleeCleave = true;
  fighter.slashSwingTimer = totalFrames;
  fighter.slashSwingMaxTimer = totalFrames;
  fighter.vx = 0;
  fighter.vy = 0;
  fighter.blockPoseTimer = 0;
  fighter.parryHitAnimTimer = 0;
  fighter.slashSwingLiftFrames = liftF;
  fighter.slashSwingHoldFrames = holdF;
  fighter.slashSwingStrikeFrames = strikeF;
  fighter.slashSwingImpactLockFrames = pinF;
  fighter.slashSwingRecFrames = recF;
  fighter.swordSwingDamage = dmg;
  fighter.swordSwingKnockback = kb;
  fighter.swordSwingLunge = lunge;
  fighter.swordSwingHitPause = hitPause;
  fighter.swordSwingHitStun = hitStun;
  fighter.swordSwingImpactShake = shake;
  fighter.slashSwingVariant = step;
  fighter.swordSlashAngle = (fighter.gunAngle !== undefined) ? fighter.gunAngle : (fighter.angle || 0);
  fighter.swordHitDelivered = false;
  fighter.swordSwingSoundPlayed = false;
  fighter.comboResetTimer = cfg.comboResetFrames ?? 85;

  let baseCooldown = cfg.swordCooldown ?? 22;
  if (isMask) {
    const maskCdMult = cfg.hollowSwordCooldownMultiplier || 0.65;
    baseCooldown = Math.round(baseCooldown * maskCdMult);
  }
  fighter.swordCooldown = totalFrames + baseCooldown;

  // Anticipation swoosh sound
  fighter._playSound('shunpoDash', 'Assets/Sound Effects/Skills/dash1.mp3', 0.35);
}

/**
 * Updates 5-phase melee combo lifecycle, forward lunging momentum, impact lock velocity clamping,
 * micro-tremor jitter, and mid-strike hit registration (Rule 30 standard).
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {Object} opponent
 * @param {Object} arena
 */
export function updateMeleeSwing(fighter, opponent, arena) {
  if (!fighter.isMeleeCleave || fighter.slashSwingTimer <= 0 || fighter.isGetsugaSlash || fighter.shunpoComboActive) {
    if (fighter.isMeleeCleave && fighter.slashSwingTimer <= 0) {
      fighter.isMeleeCleave = false;
      fighter.slashSwingVariant = 0;
      fighter.swordTremorX = 0;
      fighter.swordTremorY = 0;
      fighter.swordHitDelivered = false;
      fighter.swordSwingSoundPlayed = false;
      if (typeof fighter.resumeMovement === 'function') {
        fighter.resumeMovement(opponent);
      }
    }
    return;
  }

  const totalF = fighter.slashSwingMaxTimer || 28;
  const elapsed = Math.max(0, totalF - fighter.slashSwingTimer);
  const liftF = fighter.slashSwingLiftFrames || 7;
  const holdF = fighter.slashSwingHoldFrames || 2;
  const strikeF = fighter.slashSwingStrikeFrames || 5;
  const lockF = fighter.slashSwingImpactLockFrames || 5;
  const recF = fighter.slashSwingRecFrames || 9;

  const strikeStart = liftF + holdF;
  const strikeEnd = strikeStart + strikeF;
  const lockEnd = strikeEnd + lockF;

  if (elapsed < strikeStart) {
    // Phase 1 & 2: Anticipation Lift & Poised Hold
    if (opponent && opponent.hp > 0 && !opponent.isDead && !fighter.isAimLocked) {
      const targetAng = Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x);
      fighter.swordSlashAngle = targetAng;
      fighter.gunAngle = targetAng;
    }
    fighter.vx = 0;
    fighter.vy = 0;
  } else if (elapsed < strikeEnd) {
    // Phase 3: Hypersonic Whip Strike
    const strikeElapsed = elapsed - strikeStart;
    const strikeP = strikeElapsed / Math.max(1, strikeF);

    if (!fighter.swordSwingSoundPlayed) {
      fighter.swordSwingSoundPlayed = true;
      fighter._playSound('swordSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.90);
      spawnIchigoSlashEffect(fighter, fighter.slashSwingVariant || fighter.swordComboStep || 1);
    }

    // Forward lunging momentum step
    const lungeP = Math.sin(strikeP * Math.PI);
    const lungeSpeed = fighter.swordSwingLunge || 6.2;
    fighter.vx = Math.cos(fighter.swordSlashAngle) * lungeSpeed * lungeP;
    fighter.vy = Math.sin(fighter.swordSlashAngle) * lungeSpeed * lungeP;

    // Deliver impact at mid-strike (strikeP >= 0.50)
    if (strikeP >= 0.50 && !fighter.swordHitDelivered) {
      fighter.swordHitDelivered = true;
      _deliverMeleeImpact(fighter);
    }
  } else if (elapsed < lockEnd) {
    // Phase 4: THE IMPACT LOCK / LATCH (Rule 30)
    if (!fighter.swordHitDelivered) {
      fighter.swordHitDelivered = true;
      _deliverMeleeImpact(fighter);
    }
    // Hard collision: Zero forward velocity clamp
    fighter.vx = 0;
    fighter.vy = 0;
    const tremor = CONFIG.ichigo?.swordTremorIntensity ?? 2.2;
    fighter.swordTremorX = (Math.random() - 0.5) * tremor;
    fighter.swordTremorY = (Math.random() - 0.5) * tremor;
  } else {
    // Phase 5: Extraction & Recovery Settle
    fighter.swordTremorX = 0;
    fighter.swordTremorY = 0;
    fighter.vx *= 0.82;
    fighter.vy *= 0.82;
  }

  // NOTE: fighter.slashSwingTimer is decremented once per frame in super.update(opponent, ownerIndex, arena)
  // When timer reaches 1 (will become 0 this frame), clean up and restore movement immediately!
  if (fighter.slashSwingTimer <= 1) {
    fighter.isMeleeCleave = false;
    fighter.slashSwingVariant = 0;
    fighter.swordTremorX = 0;
    fighter.swordTremorY = 0;
    fighter.swordHitDelivered = false;
    fighter.swordSwingSoundPlayed = false;
    if (typeof fighter.resumeMovement === 'function') {
      fighter.resumeMovement(opponent);
    }
  }
}

/**
 * Delivers damage, layered fleshy slap audio, screenshake, knockback, and hitstun on melee impact.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 */
function _deliverMeleeImpact(fighter) {
  const step = fighter.swordComboStep || 1;
  const isBankai = fighter.bankaiActive || fighter.skin === 'bankai';
  const isMask = fighter.hollowMaskActive;
  const finalDamage = fighter.swordSwingDamage || (CONFIG.ichigo?.swordDamage || 12);
  const kbForce = fighter.swordSwingKnockback || 5;
  const hitPause = fighter.swordSwingHitPause || 4;
  const hitStun = fighter.swordSwingHitStun || 14;
  const arc = ((CONFIG.ichigo?.swordArc || 140) * Math.PI) / 180;
  const reach = (CONFIG.ichigo?.swordRange || 75);

  const myIndex = state.fighters.indexOf(fighter);
  const myTeam = state.getFighterTeam(myIndex);

  const candidates = [];
  if (state.fighters) {
    state.fighters.forEach((f, idx) => {
      if (f && f !== fighter && f.hp > 0 && !f.isRespawning) {
        if (myTeam === null || state.getFighterTeam(idx) !== myTeam) {
          candidates.push(f);
        }
      }
    });
  }
  if (state.illusions) {
    state.illusions.forEach((ill) => {
      if (ill && ill.hp > 0) {
        const ownerIdx = ill.ownerIndex !== undefined ? ill.ownerIndex : state.fighters.indexOf(ill.owner);
        if (myTeam === null || state.getFighterTeam(ownerIdx) !== myTeam) {
          candidates.push(ill);
        }
      }
    });
  }

  const slashAng = fighter.swordSlashAngle !== undefined ? fighter.swordSlashAngle : (fighter.gunAngle || 0);

  candidates.forEach((enemy) => {
    const dx = enemy.x - fighter.x;
    const dy = enemy.y - fighter.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= reach + enemy.r) {
      const angleToEnemy = Math.atan2(dy, dx);
      let angleDiff = angleToEnemy - slashAng;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      if (Math.abs(angleDiff) <= arc / 2) {
        // Rule #5: ALWAYS apply hit-pause exclusively to the target, NEVER to the attacker
        if (typeof enemy.applyTimeStop === 'function') {
          enemy.applyTimeStop(hitPause);
        }
        if (typeof enemy.applyHitStun === 'function') {
          enemy.applyHitStun(hitStun);
        }

        // Deal damage and knockback
        applyDamageToTarget(enemy, finalDamage, fighter, { isMelee: true });
        enemy.applyKnockback(Math.cos(angleToEnemy) * kbForce, Math.sin(angleToEnemy) * kbForce);

        // Rule 30: Layered Fleshy "Slap" Audio Palette
        try {
          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            audioSystem.playSFX('attack_fleshhit', 1.0);
            audioSystem.playSFX('sukuna_slice', 0.90);
            if (step === 3) {
              audioSystem.playSFX('attack_heavypunch1', 0.85);
            }
          }
        } catch (e) {}

        // Rule 26: Concentric compression ring & discrete spark particles
        spawnImpactFlash(enemy.x, enemy.y, (isBankai || isMask) ? 'sukuna' : 'gojo');
        spawnMeleeClashShockwave(enemy.x, enemy.y, CONFIG.ichigo?.swordShockwaveSize || 40, (isBankai || isMask) ? 'sukuna' : 'gojo');
      }
    }
  });

  const shakeIntensity = fighter.swordSwingImpactShake || (isMask ? 5.5 : (isBankai ? 5.0 : 4.0));
  if (typeof triggerGlobalScreenShake === 'function') {
    triggerGlobalScreenShake(shakeIntensity, 8);
  }
  fighter.swordHitTremorTimer = hitPause + 2;
}

/**
 * Calculates current parry chance based on form, guard pose, and enemy domain.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @returns {number}
 */
export function getParryChance(fighter) {
  if (!fighter.isSkillEnabled(CONFIG.ichigo?.enableParry, true)) return 0;
  // If trapped inside an enemy Gojo's Unlimited Void Domain Expansion, parry is completely disabled (0%)
  const myIndex = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(fighter) : -1;
  const myTeam = (myIndex >= 0 && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIndex) : null;
  const isInsideEnemyGojoDomain = typeof state !== 'undefined' && state.fighters && state.fighters.some((g, gIdx) => {
    if (!g || g === fighter || g.hp <= 0 || !g.domainActive) return false;
    const isGojo = (g.characterId === 'gojo' || g.type === 'gojo' || g._def?.id === 'gojo');
    if (!isGojo) return false;
    if (myTeam !== null && typeof state.getFighterTeam === 'function') {
      const gTeam = state.getFighterTeam(gIdx);
      if (gTeam !== null && gTeam === myTeam) return false;
    }
    return true;
  });

  if (isInsideEnemyGojoDomain) {
    return 0;
  }

  const isBankai = fighter.bankaiActive || fighter.skin === 'bankai';
  const isMask = fighter.hollowMaskActive;
  let chance = CONFIG.ichigo?.parryChance ?? 0.15;
  if (isBankai && isMask) {
    chance = CONFIG.ichigo?.bankaiHollowParryChance ?? 0.35;
  } else if (isMask) {
    chance = CONFIG.ichigo?.hollowParryChance ?? 0.30;
  } else if (isBankai) {
    chance = CONFIG.ichigo?.bankaiParryChance ?? 0.25;
  }
  if (fighter.blockPoseTimer > 0) {
    chance += 0.15;
  }
  return Math.min(0.85, chance);
}

/**
 * Handles Ichigo's takeDamage hooks: Reiatsu armor, Zanjutsu parry deflection, Hierro, and Hollow awakening.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {number} amount
 * @param {Object} attacker
 * @param {Object} opts
 * @param {Function} superTakeDamage
 * @returns {number|boolean}
 */
export function handleIchigoTakeDamage(fighter, amount, attacker, opts, superTakeDamage) {
  if (opts.isHeal || amount <= 0) {
    return superTakeDamage(amount, attacker, opts);
  }
  if (fighter.isDead || fighter.hp <= 0) {
    stopFinalGetsugaVoiceline(fighter);
    return superTakeDamage(amount, attacker, opts);
  }

  const isAboutToUnleashNormal = isAboutToUnleashNormalGetsuga(fighter);
  const isBusyWithFinalGetsuga = (fighter.isChannelingGetsuga && fighter.isFinalMassiveGetsuga) || (fighter.getsugaRecoveryTimer > 0 && fighter.isFinalGetsugaRecovery) || isFinalGetsugaVoicelinePlaying(fighter);
  const isComboActive = isShunpoComboActive(fighter);
  const isChannelingHollow = Boolean(fighter.hollowMaskFormationTimer > 0 || fighter.hollowBurstTimer > 0 || fighter._hollowVoicelineWait);
  const isChannelingBankai = Boolean(fighter.isChannelingBankai || fighter.bankaiBurstTimer > 0);

  if (!isAboutToUnleashNormal && !isBusyWithFinalGetsuga && !isComboActive && !isChannelingHollow && !isChannelingBankai && (opts.isWallSlam || fighter.isGrabbedByMahoraga || fighter.isParalyzedByMahoraga || fighter.isTargetOfAmbush)) {
    stopFinalGetsugaVoiceline(fighter);
    fighter.interruptAttacks(true);
  }

  // 1. Reiatsu Armor (50% damage reduction during Getsuga charge/recovery, 30% during Shunpo Combo & Hollow Awakening formation)
  let finalAmount = amount;
  if (isBusyWithFinalGetsuga || isAboutToUnleashNormal) {
    finalAmount *= 0.50;
  } else if (isComboActive || (fighter.hollowMaskFormationTimer && fighter.hollowMaskFormationTimer > 0)) {
    finalAmount *= 0.70;
  }

  // 2. Zanjutsu Parry Check (Blade deflection on incoming attack)
  const myIndex = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(fighter) : -1;
  const myTeam = (myIndex >= 0 && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIndex) : null;
  const isInsideEnemyGojoDomain = typeof state !== 'undefined' && state.fighters && state.fighters.some((g, gIdx) => {
    if (!g || g === fighter || g.hp <= 0 || !g.domainActive) return false;
    const isGojo = (g.characterId === 'gojo' || g.type === 'gojo' || g._def?.id === 'gojo');
    if (!isGojo) return false;
    if (myTeam !== null && typeof state.getFighterTeam === 'function') {
      const gTeam = state.getFighterTeam(gIdx);
      if (gTeam !== null && gTeam === myTeam) return false;
    }
    return true;
  });

  const isBusy = fighter.isChannelingBankai || fighter.bankaiBurstTimer > 0 || fighter.shikaiReversionBurstTimer > 0 || fighter.hollowMaskFormationTimer > 0 || fighter.hollowBurstTimer > 0 || fighter.isShunpoDashing || fighter.isFrozen || fighter.isParalyzed || fighter.isTargetOfAmbush || fighter.isChainedByMakima || isInsideEnemyGojoDomain || opts.isIsoh || opts.isSoulSplit;
  if (!isBusy && !opts.bypassShield && Math.random() < getParryChance(fighter)) {
    // Successful Parry & Deflection!
    const isBankai = fighter.bankaiActive || fighter.skin === 'bankai';
    const lastStance = fighter.parryStanceIndex || 0;
    fighter.parryStanceIndex = (lastStance + 1 + Math.floor(Math.random() * 3)) % 4;
    fighter.blockPoseTimer = CONFIG.ichigo?.parryGuardDuration || 45;
    fighter.parryHitAnimTimer = CONFIG.ichigo?.parryHitAnimDuration || 18;

    if (attacker && !attacker.isDead && typeof fighter.aim === 'function') {
      fighter.aim(attacker);
    }

    // Spark calculation along angled parry blade
    const pStance = fighter.parryStanceIndex;
    let stanceOffset = -1.15;
    if (pStance === 1) stanceOffset = 1.30;
    else if (pStance === 2) stanceOffset = 1.57;
    else if (pStance === 3) stanceOffset = -0.78;

    const bladeAngle = (fighter.gunAngle || 0) + stanceOffset;
    const sparkX = fighter.x + Math.cos(bladeAngle) * 45;
    const sparkY = fighter.y + Math.sin(bladeAngle) * 45;

    if (typeof spawnParrySparksEffect === 'function') {
      spawnParrySparksEffect(sparkX, sparkY);
    }
    if (typeof spawnSparks === 'function') {
      spawnSparks(sparkX, sparkY, 12, isBankai ? '#DC143C' : '#00E5FF');
    }

    fighter._playSound('parry', 'Assets/Sound Effects/Skills/shieldblock2.mp3', 0.85);
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(3.5, 8);
    }

    spawnFloatingText(fighter.x, fighter.y - fighter.r - 20, "PARRY!", isBankai ? "#DC143C" : "#00E5FF");
    return 0; // Fully deflected / negated damage!
  }

  // 3. Hierro (Iron Skin) Damage Reduction
  if (fighter.hollowMaskActive) {
    const defRed = CONFIG.ichigo?.hollowDamageReduction ?? 0.10;
    finalAmount = Math.max(1, finalAmount * (1.0 - defRed));
  }

  const res = superTakeDamage(finalAmount, attacker, opts);

  if (fighter.isDead || fighter.hp <= 0) {
    if (typeof fighter.stopAllSkillAudios === 'function') {
      fighter.stopAllSkillAudios(true);
    } else {
      stopFinalGetsugaVoiceline(fighter, true);
      stopHollowTransformationVoiceline(fighter, true);
      stopBankaiVoiceline(fighter, true);
    }
    fighter.interruptAttacks(true);
  } else if (isBusyWithFinalGetsuga || isAboutToUnleashNormal || isComboActive || isChannelingHollow || isChannelingBankai) {
    fighter.hitStunTimer = 0; // Supreme Poise: immune to flinch / hit-stun during Grand Finisher, Shunpo Combo, Normal Getsuga, Hollow Awakening, & Bankai
  }

  return res;
}

/**
 * Updates frame-by-frame Shunpo dash physics, afterimage interpolation, intermediate/finisher strikes, and disengage back-step.
 * Returns true if locked in active dash or combo delay.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {Object} opponent
 * @returns {boolean} isLocked
 */
export function updateShunpoCombat(fighter, opponent) {
  // 1. Shunpo Dashing Physics & Flurry Combos
  if (fighter.isShunpoDashing) {
    // If caught in a beam mid-dash, cancel dash immediately so the beam can drag Ichigo
    if (fighter.isCaughtInBeam()) {
      fighter.isShunpoDashing = false;
      fighter.isShunpoDisengaging = false;
      fighter.shunpoComboActive = false;
      fighter.shunpoTarget = null;
      fighter.shunpoDashTimer = 0;
      fighter.slashSwingTimer = 0;
      fighter.slashSwingVariant = 0;
      fighter.isMeleeCleave = false;
      return false;
    }

    fighter.shunpoDashTimer--;
    
    const dashMax = fighter.isShunpoDisengaging 
      ? (CONFIG.ichigo?.comboDisengageDashFrames || 3) 
      : (CONFIG.ichigo?.shunpoDashDuration || 4);
    const prevP = 1 - ((fighter.shunpoDashTimer + 1) / Math.max(1, dashMax));
    const curP = 1 - (fighter.shunpoDashTimer / Math.max(1, dashMax));

    const prevX = fighter.shunpoStartX + (fighter.shunpoTargetX - fighter.shunpoStartX) * prevP;
    const prevY = fighter.shunpoStartY + (fighter.shunpoTargetY - fighter.shunpoStartY) * prevP;
    const curX = fighter.shunpoStartX + (fighter.shunpoTargetX - fighter.shunpoStartX) * curP;
    const curY = fighter.shunpoStartY + (fighter.shunpoTargetY - fighter.shunpoStartY) * curP;

    const clampedCur = clampToArena(fighter, curX, curY);
    fighter.x = clampedCur.x;
    fighter.y = clampedCur.y;
    fighter.vx = 0;
    fighter.vy = 0;

    // Spawn gap-free interpolated afterimages along the dash vector
    const isMask = fighter.hollowMaskActive;
    const isBankai = fighter.bankaiActive || fighter.skin === 'bankai';
    const stepDist = Math.hypot(curX - prevX, curY - prevY);
    const stepGap = 24; // Streamlined spacing matching fighter radius
    const subSteps = Math.min(8, Math.max(1, Math.ceil(stepDist / stepGap)));

    for (let s = 1; s <= subSteps; s++) {
      const t = s / subSteps;
      const subX = prevX + (curX - prevX) * t;
      const subY = prevY + (curY - prevY) * t;
      const aiClamped = clampToArena(fighter, subX, subY, fighter.r - 2);

      pushTrailCap(fighter.afterImages, {
        x: aiClamped.x,
        y: aiClamped.y,
        r: fighter.r,
        angle: fighter.angle,
        color: (isBankai || isMask) ? 'rgba(12, 4, 10, 0.75)' : 'rgba(0, 213, 255, 0.45)',
        strokeColor: (isBankai || isMask) ? 'rgba(220, 20, 20, 0.90)' : null,
        isBankai: (isBankai || isMask),
        timer: 12,
        maxTimer: 12
      }, 18);
    }

    if (fighter.shunpoDashTimer <= 0) {
      fighter.isShunpoDashing = false;
      const finalClamped = clampToArena(fighter, fighter.shunpoTargetX, fighter.shunpoTargetY);
      fighter.x = finalClamped.x;
      fighter.y = finalClamped.y;
      
      const target = fighter.shunpoTarget;

      if (fighter.isShunpoDisengaging) {
        // Disengage Flash Step Completed: Unleash Getsuga Tensho toward target
        fighter.isShunpoDisengaging = false;
        fighter.shunpoComboActive = false;
        fighter.slashSwingTimer = 0;
        fighter.slashSwingVariant = 0;
        fighter.isMeleeCleave = false;
        if (target && target.hp > 0 && !target.isDead) {
          const targetY = (target.y !== undefined ? target.y : fighter.y) - (target.z || 0);
          const ichigoY = fighter.y - (fighter.z || 0);
          const dx = (target.x !== undefined ? target.x : fighter.x) - fighter.x;
          const dy = targetY - ichigoY;
          const castAngle = Math.atan2(dy, dx);
          fighter.gunAngle = castAngle;
          fighter.angle = castAngle;
          fireGetsuga(fighter, target, true);
        } else {
          fighter.shunpoTarget = null;
          let backwardAngle = (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0)) + Math.PI;
          if (opponent && opponent.hp > 0) {
            backwardAngle = Math.atan2(fighter.y - opponent.y, fighter.x - opponent.x);
          }
          fighter.resumeMovement(null, 1.0, backwardAngle);
        }
        return true;
      }

      if (target && target.hp > 0 && !target.isDead) {
        // Rule #3: Always update aim(target) immediately after teleport
        fighter.aim(target);

        let damageMult = 1.0;
        if (isBankai) damageMult *= (CONFIG.ichigo?.bankaiDamageMultiplier || 1.4);
        if (isMask) damageMult *= (CONFIG.ichigo?.hollowDamageMultiplier || 1.5);
        let defaultStrikes = isBankai 
          ? (CONFIG.ichigo?.bankaiShunpoStrikes || 6) 
          : (CONFIG.ichigo?.shunpoStrikes || 3);
        if (isBankai) {
          defaultStrikes = Math.round(defaultStrikes * (CONFIG.ichigo?.bankaiShunpoStrikesMultiplier || 1.8));
        }
        if (isMask) {
          defaultStrikes = Math.round(defaultStrikes * (CONFIG.ichigo?.hollowShunpoStrikesMultiplier ?? 1.2));
        }
        const maxSteps = fighter.shunpoMaxSteps || defaultStrikes;

        // Map to Rule 30 3-Hit Melee Combo: Hit 1, Hit 2, or Hit 3 Finisher
        const isFinalStep = (fighter.shunpoComboStep >= maxSteps);
        const step = isFinalStep ? 3 : (((fighter.shunpoComboStep - 1) % 2) + 1);

        fighter.swordComboStep = step;
        fighter.slashSwingVariant = step;
        fighter.isMeleeCleave = true;
        fighter.swordHitDelivered = false;
        fighter.swordSwingSoundPlayed = false;
        fighter.swordSlashAngle = (fighter.gunAngle !== undefined) ? fighter.gunAngle : (fighter.angle || 0);

        let liftF, holdF, strikeF, lockF, recF;
        if (step === 1 || step === 2) {
          liftF = 1;
          holdF = 1;
          strikeF = 2;
          lockF = isBankai ? 1 : 2;
          recF = isBankai ? 1 : 2;
        } else {
          liftF = 1;
          holdF = 1;
          strikeF = 2;
          lockF = isBankai ? 1 : 2;
          recF = 1;
        }
        const totalFrames = liftF + holdF + strikeF + lockF + recF;
        fighter.slashSwingTimer = totalFrames;
        fighter.slashSwingMaxTimer = totalFrames;
        fighter.slashSwingLiftFrames = liftF;
        fighter.slashSwingHoldFrames = holdF;
        fighter.slashSwingStrikeFrames = strikeF;
        fighter.slashSwingImpactLockFrames = lockF;
        fighter.slashSwingRecFrames = recF;

        const baseSlashDmg = (step === 3) ? (CONFIG.ichigo?.hit3Damage || 24) : (step === 2 ? (CONFIG.ichigo?.hit2Damage || 16) : (CONFIG.ichigo?.hit1Damage || 12));
        fighter.swordSwingDamage = baseSlashDmg * damageMult;
        fighter.swordSwingKnockback = (step === 3) ? (CONFIG.ichigo?.hit3Knockback || 8.0) : (step === 2 ? (CONFIG.ichigo?.hit2Knockback || 5.5) : (CONFIG.ichigo?.hit1Knockback || 4.0));
        fighter.swordSwingHitPause = (step === 3) ? 5 : 4;
        fighter.swordSwingHitStun = (step === 3) ? 18 : (step === 2 ? 14 : 12);
        fighter.swordSwingImpactShake = (step === 3) ? 7.0 : (step === 2 ? 5.0 : 3.5);

        const stepText = (step === 1) ? 'HIT 1: CLEAVE!' : (step === 2 ? 'HIT 2: RISING SCOOP!' : 'HIT 3: SUNDER!');
        spawnFloatingText(fighter.x, fighter.y - fighter.r - 20, stepText, isBankai ? '#DC143C' : (step === 3 ? '#FFD700' : '#00D5FF'));

        if (!isFinalStep) {
          fighter.shunpoComboDelayTimer = totalFrames;
        } else {
          fighter.shunpoDisengageDelayTimer = totalFrames;
        }
      } else {
        fighter.shunpoComboActive = false;
        fighter.shunpoTarget = null;
        fighter.slashSwingTimer = 0;
        fighter.slashSwingVariant = 0;
        fighter.isMeleeCleave = false;
        fighter.swordTremorX = 0;
        fighter.swordTremorY = 0;
        if (typeof fighter.resumeMovement === 'function') {
          fighter.resumeMovement(opponent);
        }
      }
    }
    return true; // Locked in dash
  }

  // 2. Advance Shunpo Flurry Combo or Trigger Disengage Back-Step
  if (fighter.shunpoComboActive && fighter.shunpoTarget) {
    const isBankai = fighter.bankaiActive || fighter.skin === 'bankai';
    const isMask = fighter.hollowMaskActive;
    let defaultStrikes = isBankai 
      ? (CONFIG.ichigo?.bankaiShunpoStrikes || 6) 
      : (CONFIG.ichigo?.shunpoStrikes || 3);
    if (isBankai) {
      defaultStrikes = Math.round(defaultStrikes * (CONFIG.ichigo?.bankaiShunpoStrikesMultiplier || 1.8));
    }
    if (isMask) {
      defaultStrikes = Math.round(defaultStrikes * (CONFIG.ichigo?.hollowShunpoStrikesMultiplier ?? 1.2));
    }
    const maxSteps = fighter.shunpoMaxSteps || defaultStrikes;

    // 5-phase melee strike mechanics during active swing
    if (fighter.slashSwingTimer > 0) {
      fighter.slashSwingTimer--;
      const totalF = fighter.slashSwingMaxTimer || 20;
      const elapsed = Math.max(0, totalF - fighter.slashSwingTimer);
      const liftF = fighter.slashSwingLiftFrames ?? 1;
      const holdF = fighter.slashSwingHoldFrames ?? 1;
      const strikeF = fighter.slashSwingStrikeFrames ?? 2;
      const lockF = fighter.slashSwingImpactLockFrames ?? 1;
      const recF = fighter.slashSwingRecFrames ?? 1;
      const strikeStart = liftF + holdF;
      const strikeEnd = strikeStart + strikeF;
      const lockEnd = strikeEnd + lockF;
      const target = fighter.shunpoTarget;
      const step = fighter.swordComboStep || 1;

      if (elapsed < strikeStart) {
        fighter.vx = 0;
        fighter.vy = 0;
      } else if (elapsed < strikeEnd) {
        const strikeElapsed = elapsed - strikeStart;
        const strikeP = strikeElapsed / Math.max(1, strikeF);

        if (!fighter.swordSwingSoundPlayed) {
          fighter.swordSwingSoundPlayed = true;
          fighter._playSound('swordSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.90);
          spawnIchigoSlashEffect(fighter, fighter.slashSwingVariant || fighter.swordComboStep || 1);
        }

        const lungeP = Math.sin(strikeP * Math.PI);
        const lungeSpeed = (step === 3 ? 5.5 : 4.0) * (isBankai ? 1.2 : 1.0);
        fighter.vx = Math.cos(fighter.swordSlashAngle) * lungeSpeed * lungeP;
        fighter.vy = Math.sin(fighter.swordSlashAngle) * lungeSpeed * lungeP;

        if (strikeP >= 0.50 && !fighter.swordHitDelivered && target && target.hp > 0 && !target.isDead) {
          fighter.swordHitDelivered = true;
          applyDamageToTarget(target, fighter.swordSwingDamage, fighter, { isSkill: true });
          if (typeof target.applyTimeStop === 'function') target.applyTimeStop(fighter.swordSwingHitPause);
          if (typeof target.applyHitStun === 'function') target.applyHitStun(fighter.swordSwingHitStun);
          if (step === 3 && typeof target.applyKnockback === 'function') {
            target.applyKnockback(Math.cos(fighter.swordSlashAngle) * fighter.swordSwingKnockback, Math.sin(fighter.swordSlashAngle) * fighter.swordSwingKnockback);
          }
          spawnImpactFlash(target.x, target.y, (isBankai || isMask) ? 'sukuna' : 'gojo');
          spawnMeleeClashShockwave(target.x, target.y, step === 3 ? 50 : 38, (isBankai || isMask) ? 'sukuna' : 'gojo');
          fighter._playSound('shunpoStrikeHit', 'Assets/Sound Effects/Attacks/fleshhit.mp3', 0.85);
          fighter._playSound('sukunaSlice', 'Assets/Sound Effects/Attacks/Sukuna-slice.mp3', 0.85);
          if (step === 3) fighter._playSound('heavyPunch', 'Assets/Sound Effects/Attacks/heavypunch1.mp3', 0.85);
          if (typeof triggerGlobalScreenShake === 'function') {
            triggerGlobalScreenShake(fighter.swordSwingImpactShake, 8);
          }
        }
      } else if (elapsed < lockEnd) {
        fighter.vx = 0;
        fighter.vy = 0;
        const tremor = step === 3 ? 2.5 : 1.8;
        fighter.swordTremorX = (Math.random() - 0.5) * tremor;
        fighter.swordTremorY = (Math.random() - 0.5) * tremor;
      } else {
        fighter.swordTremorX = 0;
        fighter.swordTremorY = 0;
        fighter.vx *= 0.82;
        fighter.vy *= 0.82;
      }
    }
    
    // Check Disengage Back-Step trigger
    if (fighter.shunpoComboStep >= maxSteps && fighter.shunpoDisengageDelayTimer > 0) {
      fighter.shunpoDisengageDelayTimer--;
      if (fighter.shunpoDisengageDelayTimer <= 0) {
        const target = fighter.shunpoTarget;
        if (target && target.hp > 0 && !target.isDead) {
          const dx = fighter.x - target.x;
          const dy = fighter.y - target.y;
          let cardinalBackAngle;
          if (Math.abs(dx) >= Math.abs(dy)) {
            cardinalBackAngle = dx >= 0 ? 0 : Math.PI;
          } else {
            cardinalBackAngle = dy >= 0 ? (Math.PI / 2) : (-Math.PI / 2);
          }
          const disengageDist = isBankai 
            ? (CONFIG.ichigo?.bankaiComboDisengageDistance || CONFIG.ichigo?.comboDisengageDistance || 350) 
            : (CONFIG.ichigo?.comboDisengageDistance || 290);

          const startClamped = clampToArena(fighter, fighter.x, fighter.y);
          fighter.shunpoStartX = startClamped.x;
          fighter.shunpoStartY = startClamped.y;
          const rawTx = target.x + Math.cos(cardinalBackAngle) * disengageDist;
          const rawTy = target.y + Math.sin(cardinalBackAngle) * disengageDist;
          const targetClamped = clampToArena(fighter, rawTx, rawTy);

          fighter.shunpoTargetX = targetClamped.x;
          fighter.shunpoTargetY = targetClamped.y;
          fighter.isShunpoDashing = true;
          fighter.isShunpoDisengaging = true;
          fighter.slashSwingTimer = 0;
          fighter.slashSwingVariant = 0;
          fighter.isMeleeCleave = false;
          fighter.swordTremorX = 0;
          fighter.swordTremorY = 0;
          fighter.shunpoDashTimer = isBankai 
            ? (CONFIG.ichigo?.bankaiComboDisengageDashFrames || 3) 
            : (CONFIG.ichigo?.comboDisengageDashFrames || 3);

          pushTrailCap(fighter.afterImages, {
            x: startClamped.x,
            y: startClamped.y,
            r: fighter.r,
            angle: fighter.angle,
            color: (isBankai || isMask) ? 'rgba(12, 4, 10, 0.75)' : 'rgba(0, 213, 255, 0.45)',
            strokeColor: (isBankai || isMask) ? 'rgba(220, 20, 20, 0.90)' : null,
            isBankai: (isBankai || isMask),
            timer: 12,
            maxTimer: 12
          }, 18);

          spawnFloatingText(fighter.x, fighter.y - fighter.r - 20, isBankai ? 'TENSA STEP!' : 'FLASH STEP!', isBankai ? '#DC143C' : '#00D5FF');
          fighter._playSound('shunpoDash', 'Assets/Sound Effects/Skills/dash1.mp3', 0.95);
          return true;
        } else {
          fighter.shunpoComboActive = false;
          fighter.shunpoTarget = null;
          fighter.slashSwingTimer = 0;
          fighter.slashSwingVariant = 0;
          fighter.isMeleeCleave = false;
          fighter.swordTremorX = 0;
          fighter.swordTremorY = 0;
          let backwardAngle = (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0)) + Math.PI;
          if (opponent && opponent.hp > 0) {
            backwardAngle = Math.atan2(fighter.y - opponent.y, fighter.x - opponent.x);
          }
          fighter.resumeMovement(null, 1.0, backwardAngle);
        }
      }
    } else if (fighter.shunpoComboStep < maxSteps && fighter.shunpoComboDelayTimer > 0) {
      fighter.shunpoComboDelayTimer--;
      if (fighter.shunpoComboDelayTimer <= 0) {
        const target = fighter.shunpoTarget;
        if (target && target.hp > 0 && !target.isDead) {
          fighter.shunpoComboStep++;
          
          const angleOffsets = [0, 1.92, -1.92, 2.80, -0.70, 0.70, 3.14];
          const baseAngle = fighter._shunpoBaseAngle !== undefined ? fighter._shunpoBaseAngle : Math.atan2(fighter.y - target.y, fighter.x - target.x);
          const stepAng = baseAngle + (angleOffsets[fighter.shunpoComboStep] !== undefined ? angleOffsets[fighter.shunpoComboStep] : (fighter.shunpoComboStep * 1.8));
          const offset = target.r + (CONFIG.ichigo?.shunpoTargetOffset || 34);

          const startClamped = clampToArena(fighter, fighter.x, fighter.y);
          fighter.shunpoStartX = startClamped.x;
          fighter.shunpoStartY = startClamped.y;
          const rawTx = target.x + Math.cos(stepAng) * offset;
          const rawTy = target.y + Math.sin(stepAng) * offset;
          const targetClamped = clampToArena(fighter, rawTx, rawTy);

          fighter.shunpoTargetX = targetClamped.x;
          fighter.shunpoTargetY = targetClamped.y;

          fighter.isShunpoDashing = true;
          fighter.slashSwingTimer = 0;
          fighter.slashSwingVariant = 0;
          fighter.isMeleeCleave = false;
          fighter.swordTremorX = 0;
          fighter.swordTremorY = 0;
          fighter.shunpoDashTimer = isBankai ? 3 : (CONFIG.ichigo?.shunpoDashDuration || 4);

          pushTrailCap(fighter.afterImages, {
            x: startClamped.x,
            y: startClamped.y,
            r: fighter.r,
            angle: fighter.angle,
            color: (isBankai || isMask) ? 'rgba(12, 4, 10, 0.75)' : 'rgba(0, 213, 255, 0.45)',
            strokeColor: (isBankai || isMask) ? 'rgba(220, 20, 20, 0.90)' : null,
            isBankai: (isBankai || isMask),
            timer: 12,
            maxTimer: 12
          }, 18);

          spawnFloatingText(fighter.x, fighter.y - fighter.r - 20, isBankai ? 'TENSA STEP!' : 'FLASH STEP!', isBankai ? '#DC143C' : '#00D5FF');
          fighter._playSound('shunpoDash', 'Assets/Sound Effects/Skills/dash1.mp3', isBankai ? 0.95 : 0.9);
          return true;
        } else {
          fighter.shunpoComboActive = false;
          fighter.shunpoTarget = null;
          fighter.slashSwingTimer = 0;
          fighter.slashSwingVariant = 0;
          fighter.isMeleeCleave = false;
          fighter.swordTremorX = 0;
          fighter.swordTremorY = 0;
          if (typeof fighter.resumeMovement === 'function') {
            fighter.resumeMovement(opponent);
          }
        }
      }
    }
  }

  return false;
}
