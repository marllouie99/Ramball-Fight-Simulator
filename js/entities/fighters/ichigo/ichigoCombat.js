import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { pushTrailCap } from '../../../graphics/particles/visualTrailSystem.js';
import { spawnMeleeClashShockwave, spawnImpactFlash, spawnSparks, spawnParrySparksEffect } from '../../../graphics/particles/sparkEffect.js';
import { applyDamageToTarget } from '../../fighter.js';
import { applyHollowLifesteal, activateHollowMask } from './ichigoHollow.js';
import { fireGetsuga, isAboutToUnleashNormalGetsuga, isGetsugaActive, isGetsugaVoicelinePlaying, isFinalGetsugaVoicelinePlaying, stopFinalGetsugaVoiceline } from './ichigoGetsuga.js';

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
  return Boolean(
    CONFIG.ichigo?.enableFlashStep ??
    CONFIG.ichigo?.enableShunpo ??
    CONFIG.ichigo?.flashStepEnabled ??
    CONFIG.ichigo?.shunpoEnabled ??
    true
  );
}

/**
 * Checks if Shunpo multi-strike flurry is enabled.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @returns {boolean}
 */
export function isFlurryEnabled(fighter) {
  const val = CONFIG.ichigo?.enableFlurryAttack ??
    CONFIG.ichigo?.enableFlurry ??
    CONFIG.ichigo?.flurryEnabled ??
    CONFIG.ichigo?.enableShunpoCombo ??
    CONFIG.ichigo?.shunpoComboEnabled;
  return val === undefined ? true : Boolean(val);
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
    timer: 16,
    maxTimer: 16
  }, 32);

  spawnFloatingText(fighter.x, fighter.y - fighter.r - 20, isBankai ? 'TENSA SHUNPO!' : 'SHUNPO!', isBankai ? '#DC143C' : '#FFFFFF');
  fighter._playSound('shunpoDash', 'Assets/Sound Effects/Skills/dash1.mp3', 0.85);

  if (isMask) {
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
 * Close-quarters Tensa Zangetsu blade sweep adhering to Rule 7 (Frontal Arc AOE).
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @param {Object} target
 */
export function performMeleeCleave(fighter, target) {
  if (fighter.isDead || fighter.hp <= 0 || fighter.isParalyzedOrBeamTrapped() || fighter.wallSlamPinnedX !== undefined || fighter.isWallSlammed) return;
  if (isGetsugaActive(fighter)) return;
  if (fighter.isChannelingBankai || fighter.bankaiBurstTimer > 0 || fighter.shikaiReversionBurstTimer > 0 || fighter.hollowMaskFormationTimer > 0 || fighter.hollowBurstTimer > 0 || fighter.isChannelingGetsuga || fighter.getsugaRecoveryTimer > 0 || fighter.isShunpoDashing || fighter.shunpoComboActive || isFinalGetsugaVoicelinePlaying(fighter)) return;
  if (fighter.bankaiActive && !fighter.bankaiFinalGetsugaTriggered && fighter.bankaiTimer <= (CONFIG.ichigo?.bankaiFinalGetsugaTriggerTimer || 160)) return;

  const isBankai = fighter.bankaiActive || fighter.skin === 'bankai';
  const isMask = fighter.hollowMaskActive;
  let damageMult = 1.0;
  if (isBankai) damageMult *= (CONFIG.ichigo?.bankaiDamageMultiplier || 1.4);
  if (isMask) damageMult *= (CONFIG.ichigo?.hollowDamageMultiplier || 1.5);
  const baseDamage = CONFIG.ichigo?.swordDamage || 16;
  const finalDamage = baseDamage * damageMult;

  let baseCooldown = CONFIG.ichigo?.swordCooldown || 30;
  if (isMask) {
    const maskCdMult = CONFIG.ichigo?.hollowSwordCooldownMultiplier || 0.65;
    baseCooldown = Math.round(baseCooldown * maskCdMult);
  }
  fighter.swordCooldown = baseCooldown;
  const swingDur = CONFIG.ichigo?.swordSwingDuration || 22;
  fighter.slashSwingTimer = swingDur;
  fighter.slashSwingMaxTimer = swingDur;

  fighter._playSound('swordSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.8);

  // Rule #7: Frontal Arc Radius AOE for Melee Weapon Users
  const arc = ((CONFIG.ichigo?.swordArc || 140) * Math.PI) / 180;
  const reach = CONFIG.ichigo?.swordRange || 70;
  const myIndex = state.fighters.indexOf(fighter);
  const myTeam = state.getFighterTeam(myIndex);

  // Check all valid targets (fighters & illusions)
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

  const aimAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);

  candidates.forEach((enemy) => {
    const dx = enemy.x - fighter.x;
    const dy = enemy.y - fighter.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= reach + enemy.r) {
      // Calculate angle relative to aim direction
      const angleToEnemy = Math.atan2(dy, dx);
      let angleDiff = angleToEnemy - fighter.gunAngle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      if (Math.abs(angleDiff) <= arc / 2) {
        // Rule #5: ALWAYS apply hit-pause/time-stop exclusively to the target, NEVER to the attacker
        if (typeof enemy.applyTimeStop === 'function') {
          enemy.applyTimeStop(CONFIG.ichigo?.swordFreezeDuration || 8);
        }

        // Deal damage and knockback
        applyDamageToTarget(enemy, finalDamage, fighter, { isMelee: true });
        applyHollowLifesteal(fighter, finalDamage, enemy);
        
        const kbForce = CONFIG.ichigo?.knockback || 6;
        enemy.applyKnockback(Math.cos(angleToEnemy) * kbForce, Math.sin(angleToEnemy) * kbForce);
        
        spawnImpactFlash(enemy.x, enemy.y, isMask ? 'sukuna' : 'gojo');
        spawnMeleeClashShockwave(enemy.x, enemy.y, CONFIG.ichigo?.swordShockwaveSize || 35, isMask ? 'sukuna' : 'gojo');

        if (typeof triggerGlobalScreenShake === 'function') {
          const shakeIntensity = isMask
            ? (CONFIG.ichigo?.hollowSwordHitScreenShake ?? 4.5)
            : (isBankai ? (CONFIG.ichigo?.bankaiSwordHitScreenShake ?? 4.0) : (CONFIG.ichigo?.swordHitScreenShake ?? 3.0));
          const shakeDuration = CONFIG.ichigo?.swordHitShakeDuration ?? 6;
          triggerGlobalScreenShake(shakeIntensity, shakeDuration);
        }
      }
    }
  });
}

/**
 * Calculates current parry chance based on form, guard pose, and enemy domain.
 * @param {import('../IchigoFighter.js').IchigoFighter} fighter
 * @returns {number}
 */
export function getParryChance(fighter) {
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
  if (!isAboutToUnleashNormal && !isBusyWithFinalGetsuga && !isComboActive && (opts.isWallSlam || fighter.isGrabbedByMahoraga || fighter.isParalyzedByMahoraga || fighter.isTargetOfAmbush)) {
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

  const isBusy = fighter.isChannelingBankai || fighter.bankaiBurstTimer > 0 || fighter.shikaiReversionBurstTimer > 0 || fighter.hollowMaskFormationTimer > 0 || fighter.hollowBurstTimer > 0 || fighter.isShunpoDashing || fighter.isFrozen || fighter.isParalyzed || fighter.isTargetOfAmbush || isInsideEnemyGojoDomain || opts.isIsoh || opts.isSoulSplit;
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
    stopFinalGetsugaVoiceline(fighter);
    fighter.interruptAttacks(true);
  } else if (isBusyWithFinalGetsuga || isAboutToUnleashNormal || isComboActive) {
    fighter.hitStunTimer = 0; // Supreme Poise: immune to flinch / hit-stun during Grand Finisher, Shunpo Combo & Normal Getsuga unleash
  }

  // Immediate Hollow Mask trigger upon taking critical damage below 70% HP
  const finalThreshold = CONFIG.ichigo?.bankaiFinalGetsugaTriggerTimer || 160;
  const isPendingFinalGetsuga = fighter.bankaiActive && !fighter.bankaiFinalGetsugaTriggered && fighter.bankaiTimer > 0 && fighter.bankaiTimer <= finalThreshold;
  const canHollowAwaken = Boolean(fighter.bankaiActive || fighter.bankaiUsed);
  const isBusyWithGetsuga = isAboutToUnleashNormal || fighter.isChannelingGetsuga || isBusyWithFinalGetsuga || isGetsugaVoicelinePlaying(fighter);
  if (canHollowAwaken && !fighter.hollowMaskUsed && !fighter.isTargetOfAmbush && !isBusyWithGetsuga && !isPendingFinalGetsuga && !fighter.isChannelingBankai && !fighter.isParalyzedOrBeamTrapped() && fighter.hp > 0 && fighter.hp / fighter.maxHp <= (CONFIG.ichigo?.hollowMaskThreshold ?? 0.70)) {
    activateHollowMask(fighter);
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
    const subSteps = Math.max(1, Math.ceil(stepDist / 14));

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
        timer: 16,
        maxTimer: 16
      }, 32);
    }

    if (fighter.shunpoDashTimer <= 0) {
      fighter.isShunpoDashing = false;
      const finalClamped = clampToArena(fighter, fighter.shunpoTargetX, fighter.shunpoTargetY);
      fighter.x = finalClamped.x;
      fighter.y = finalClamped.y;
      
      const target = fighter.shunpoTarget;

      if (fighter.isShunpoDisengaging) {
        // Disengage Flash Step Completed: Unleash Getsuga Tensho
        fighter.isShunpoDisengaging = false;
        fighter.shunpoComboActive = false;
        if (target && target.hp > 0 && !target.isDead) {
          fighter.aim(target);
          fireGetsuga(fighter, target, true);
        } else {
          fighter.shunpoTarget = null;
          fighter.resumeMovement(opponent);
        }
        return true;
      }

      if (target && target.hp > 0 && !target.isDead) {
        // Rule #3: Always update aim(target) immediately after teleport
        fighter.aim(target);

        let damageMult = 1.0;
        if (isBankai) damageMult *= (CONFIG.ichigo?.bankaiDamageMultiplier || 1.4);
        if (isMask) damageMult *= (CONFIG.ichigo?.hollowDamageMultiplier || 1.5);
        const baseSlashDmg = CONFIG.ichigo?.shunpoStrike1Damage || 20;
        let defaultStrikes = isBankai 
          ? (CONFIG.ichigo?.bankaiShunpoStrikes || 6) 
          : (CONFIG.ichigo?.shunpoStrikes || 2);
        if (isBankai) {
          defaultStrikes = Math.round(defaultStrikes * (CONFIG.ichigo?.bankaiShunpoStrikesMultiplier || 1.8));
        }
        if (isMask) {
          defaultStrikes = Math.round(defaultStrikes * (CONFIG.ichigo?.hollowShunpoStrikesMultiplier ?? 1.2));
        }
        const maxSteps = fighter.shunpoMaxSteps || defaultStrikes;

        if (fighter.shunpoComboStep < maxSteps) {
          // Intermediate Flurry Strike
          const s1Duration = isBankai ? (CONFIG.ichigo?.bankaiShunpoStrike1Duration || 10) : (CONFIG.ichigo?.shunpoStrike1SlashDuration || 14);
          fighter.slashSwingTimer = s1Duration;
          fighter.slashSwingMaxTimer = s1Duration;
          fighter._playSound('swordSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.85);

          if (typeof target.applyHitStun === 'function') {
            target.applyHitStun(2);
          }

          applyDamageToTarget(target, baseSlashDmg * damageMult, fighter, { isSkill: true });
          applyHollowLifesteal(fighter, baseSlashDmg * damageMult, target);
          spawnImpactFlash(target.x, target.y, (isBankai || isMask) ? 'sukuna' : 'gojo');
          fighter._playSound('shunpoStrikeHit', 'Assets/Sound Effects/Attacks/fleshhit.mp3', 0.75);
          if (typeof triggerGlobalScreenShake === 'function') {
            const strikeShake = isBankai
              ? (CONFIG.ichigo?.bankaiShunpoStrike1ScreenShake ?? 3.5)
              : (CONFIG.ichigo?.shunpoStrike1ScreenShake ?? 2.5);
            const strikeDur = CONFIG.ichigo?.shunpoStrike1ShakeDuration ?? 6;
            triggerGlobalScreenShake(strikeShake, strikeDur);
          }

          fighter.shunpoComboDelayTimer = isBankai 
            ? (CONFIG.ichigo?.bankaiShunpoComboDelayFrames || 5) 
            : (CONFIG.ichigo?.shunpoComboDelayFrames || 8);
        } else {
          // Final Finisher Strike
          const s2Duration = isBankai ? (CONFIG.ichigo?.bankaiShunpoStrike2Duration || 14) : (CONFIG.ichigo?.shunpoStrike2SlashDuration || 16);
          fighter.slashSwingTimer = s2Duration;
          fighter.slashSwingMaxTimer = s2Duration;
          fighter._playSound('shunpoFinisherSwing', 'Assets/Sound Effects/Attacks/swordswing.mp3', 0.95);

          const strike2Mult = CONFIG.ichigo?.shunpoStrike2Multiplier || 1.35;
          const finisherDmg = baseSlashDmg * strike2Mult * damageMult;
          applyDamageToTarget(target, finisherDmg, fighter, { isSkill: true });
          applyHollowLifesteal(fighter, finisherDmg, target);
          const finStun = isBankai ? (CONFIG.ichigo?.bankaiShunpoStunDuration || 8) : (CONFIG.ichigo?.shunpoStrike2StunDuration || 8);
          target.applyHitStun(finStun);

          const aimAngle = fighter.gunAngle || 0;
          const kbForce = CONFIG.ichigo?.shunpoStrike2Knockback || 7;
          if (typeof target.applyKnockback === 'function') {
            target.applyKnockback(Math.cos(aimAngle) * kbForce, Math.sin(aimAngle) * kbForce);
          }

          spawnImpactFlash(target.x, target.y, (isBankai || isMask) ? 'sukuna' : 'gojo');
          spawnMeleeClashShockwave(target.x, target.y, CONFIG.ichigo?.shunpoShockwaveSize || 45, (isBankai || isMask) ? 'sukuna' : 'gojo');
          fighter._playSound('shunpoFinisherHit', 'Assets/Sound Effects/Attacks/fleshhit.mp3', 0.90);
          if (typeof triggerGlobalScreenShake === 'function') {
            const finShake = isBankai
              ? (CONFIG.ichigo?.bankaiShunpoFinisherScreenShake ?? 5.5)
              : (isMask ? (CONFIG.ichigo?.hollowShunpoFinisherScreenShake ?? 5.0) : (CONFIG.ichigo?.shunpoScreenShake ?? 4.0));
            const finDur = CONFIG.ichigo?.shunpoFinisherShakeDuration ?? 10;
            triggerGlobalScreenShake(finShake, finDur);
          }

          // Schedule Disengage Back-Step Flash Step
          fighter.shunpoDisengageDelayTimer = isBankai 
            ? (CONFIG.ichigo?.bankaiComboDisengageDelayFrames || 5) 
            : (CONFIG.ichigo?.comboDisengageDelayFrames || 7);
        }
      } else {
        fighter.shunpoComboActive = false;
        fighter.shunpoTarget = null;
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
      : (CONFIG.ichigo?.shunpoStrikes || 2);
    if (isBankai) {
      defaultStrikes = Math.round(defaultStrikes * (CONFIG.ichigo?.bankaiShunpoStrikesMultiplier || 1.8));
    }
    if (isMask) {
      defaultStrikes = Math.round(defaultStrikes * (CONFIG.ichigo?.hollowShunpoStrikesMultiplier ?? 1.2));
    }
    const maxSteps = fighter.shunpoMaxSteps || defaultStrikes;
    
    // Check Disengage Back-Step trigger
    if (fighter.shunpoComboStep >= maxSteps && fighter.shunpoDisengageDelayTimer > 0) {
      fighter.shunpoDisengageDelayTimer--;
      if (fighter.shunpoDisengageDelayTimer <= 0) {
        const target = fighter.shunpoTarget;
        if (target && target.hp > 0 && !target.isDead) {
          const backAngle = Math.atan2(fighter.y - target.y, fighter.x - target.x);
          const disengageDist = isBankai 
            ? (CONFIG.ichigo?.bankaiComboDisengageDistance || CONFIG.ichigo?.comboDisengageDistance || 350) 
            : (CONFIG.ichigo?.comboDisengageDistance || 290);

          const startClamped = clampToArena(fighter, fighter.x, fighter.y);
          fighter.shunpoStartX = startClamped.x;
          fighter.shunpoStartY = startClamped.y;
          const rawTx = target.x + Math.cos(backAngle) * disengageDist;
          const rawTy = target.y + Math.sin(backAngle) * disengageDist;
          const targetClamped = clampToArena(fighter, rawTx, rawTy);

          fighter.shunpoTargetX = targetClamped.x;
          fighter.shunpoTargetY = targetClamped.y;
          fighter.isShunpoDashing = true;
          fighter.isShunpoDisengaging = true;
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
            timer: 16,
            maxTimer: 16
          }, 32);

          spawnFloatingText(fighter.x, fighter.y - fighter.r - 20, isBankai ? 'TENSA STEP!' : 'FLASH STEP!', isBankai ? '#DC143C' : '#00D5FF');
          fighter._playSound('shunpoDash', 'Assets/Sound Effects/Skills/dash1.mp3', 0.95);
          return true;
        } else {
          fighter.shunpoComboActive = false;
          fighter.shunpoTarget = null;
          fighter.resumeMovement(opponent);
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
          fighter.shunpoDashTimer = isBankai ? 3 : (CONFIG.ichigo?.shunpoDashDuration || 4);

          pushTrailCap(fighter.afterImages, {
            x: startClamped.x,
            y: startClamped.y,
            r: fighter.r,
            angle: fighter.angle,
            color: (isBankai || isMask) ? 'rgba(12, 4, 10, 0.75)' : 'rgba(0, 213, 255, 0.45)',
            strokeColor: (isBankai || isMask) ? 'rgba(220, 20, 20, 0.90)' : null,
            isBankai: (isBankai || isMask),
            timer: 16,
            maxTimer: 16
          }, 32);

          const isFinalStep = fighter.shunpoComboStep === maxSteps;
          const labels = ['', 'FLANK SLASH!', 'CROSS STRIKE!', 'LIGHTNING FLASH!', 'SHADOW PIERCE!', 'TENSA BLITZ!', 'CROSS SLASH!'];
          const stepText = isFinalStep ? 'CROSS SLASH!' : (labels[fighter.shunpoComboStep] || 'FLASH STRIKE!');
          spawnFloatingText(fighter.x, fighter.y - fighter.r - 20, stepText, isBankai ? '#DC143C' : '#FFD700');
          fighter._playSound('shunpoDash', 'Assets/Sound Effects/Skills/dash1.mp3', isBankai ? 0.95 : 0.9);
          return true;
        } else {
          fighter.shunpoComboActive = false;
          fighter.shunpoTarget = null;
          fighter.resumeMovement(opponent);
        }
      }
    }
  }

  return false;
}
