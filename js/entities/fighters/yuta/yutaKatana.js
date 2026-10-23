import { audioSystem } from '../../../systems/audioSystem.js';
// ─────────────────────────────────────────────
// YUTA OKKOTSU KATANA COMBAT MODULE
// Handles 5-Phase Melee Combos, Impact Lock Pacing & Dynamic Blade Tip Positioning
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../../graphics/particles/bloodEffect.js';
import { getBasicAttackSound } from '../../../soundEffects/basicAttackSounds.js';

/**
 * Initiates Yuta's 5-phase cursed katana combo cleave (Rule 30 standard).
 */
export function modExecuteKatanaMelee(fighter, angle) {
  if (fighter.isChannelingPureLoveBeam || fighter.isFiringPureLoveBeam || fighter.isChannelingDomain) return;
  fighter.blockPoseTimer = 0; // Drop guard instantly if he swings

  // Advance combo step (1 -> 2 -> 3 -> 1)
  if (!fighter.comboResetTimer || fighter.comboResetTimer <= 0) {
    fighter.swordComboStep = 1;
  } else {
    fighter.swordComboStep = (fighter.swordComboStep % 3) + 1;
  }

  const cfg = CONFIG.yuta || {};
  const step = fighter.swordComboStep || 1;
  let liftF, holdF, strikeF, pinF, recF, dmg, kb, lunge, hitPause, hitStun, shake;

  if (step === 1) {
    liftF = cfg.hit1LiftFrames ?? 7;
    holdF = cfg.hit1HoldFrames ?? 2;
    strikeF = cfg.hit1StrikeFrames ?? 5;
    pinF = cfg.hit1ImpactLockFrames ?? 5;
    recF = cfg.hit1RecoveryFrames ?? 9;
    dmg = cfg.hit1Damage ?? 14;
    kb = cfg.hit1Knockback ?? 4.5;
    lunge = cfg.hit1LungeSpeed ?? 6.0;
    hitPause = cfg.hit1HitPauseFrames ?? 3;
    hitStun = cfg.hit1HitStunFrames ?? 12;
    shake = cfg.hit1ImpactShake ?? 4.0;
  } else if (step === 2) {
    liftF = cfg.hit2LiftFrames ?? 6;
    holdF = cfg.hit2HoldFrames ?? 2;
    strikeF = cfg.hit2StrikeFrames ?? 5;
    pinF = cfg.hit2ImpactLockFrames ?? 6;
    recF = cfg.hit2RecoveryFrames ?? 10;
    dmg = cfg.hit2Damage ?? 18;
    kb = cfg.hit2Knockback ?? 6.5;
    lunge = cfg.hit2LungeSpeed ?? 6.8;
    hitPause = cfg.hit2HitPauseFrames ?? 3;
    hitStun = cfg.hit2HitStunFrames ?? 14;
    shake = cfg.hit2ImpactShake ?? 5.5;
  } else {
    liftF = cfg.hit3LiftFrames ?? 8;
    holdF = cfg.hit3HoldFrames ?? 3;
    strikeF = cfg.hit3StrikeFrames ?? 6;
    pinF = cfg.hit3ImpactLockFrames ?? 8;
    recF = cfg.hit3RecoveryFrames ?? 14;
    dmg = cfg.hit3Damage ?? 26;
    kb = cfg.hit3Knockback ?? 9.0;
    lunge = cfg.hit3LungeSpeed ?? 8.5;
    hitPause = cfg.hit3HitPauseFrames ?? 4;
    hitStun = cfg.hit3HitStunFrames ?? 18;
    shake = cfg.hit3ImpactShake ?? 8.0;
  }

  const totalFrames = liftF + holdF + strikeF + pinF + recF;
  fighter.swordSwingTimer = totalFrames;
  fighter.swordSwingMax = totalFrames;
  fighter.swordSwingLiftFrames = liftF;
  fighter.swordSwingHoldFrames = holdF;
  fighter.swordSwingStrikeFrames = strikeF;
  fighter.swordSwingImpactLockFrames = pinF;
  fighter.swordSwingRecFrames = recF;
  fighter.swordSwingDamage = dmg;
  fighter.swordSwingKnockback = kb;
  fighter.swordSwingLunge = lunge;
  fighter.swordSwingHitPause = hitPause;
  fighter.swordSwingHitStun = hitStun;
  fighter.swordSwingImpactShake = shake;

  fighter.swipeActive = true;
  fighter.swipeTimer = totalFrames;
  fighter.swordSlashAngle = angle;
  fighter.targetAngle = angle;
  fighter.activeSlashType = step - 1; // 0, 1, 2 for legacy callers
  fighter.comboResetTimer = cfg.comboResetFrames ?? 85;
  fighter.meleeCooldown = totalFrames + (cfg.meleeCooldown ?? 34);
  fighter.meleeCooldownMax = cfg.meleeCooldown ?? 34;
  fighter.swordHitDelivered = false;
  fighter.swordSwingSoundPlayed = false;
  fighter.swordTremorX = 0;
  fighter.swordTremorY = 0;
  fighter.trailGenTimer = 40;

  // Remove any active slow debuff on Yuta when swinging basic attack
  fighter.slowTimer = 0;
  fighter.slowMultiplier = 1.0;
  if (fighter.statusEffects) {
    fighter.statusEffects.slowTimer = 0;
    if (fighter.statusEffects.fighter) {
      fighter.statusEffects.fighter.slowTimer = 0;
    }
  }

  // Anticipation flutter swoosh
  try {
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('skill_dash1', 0.40);
    }
  } catch (e) {}
}

/**
 * Updates 5-phase melee combo lifecycle, forward lunge physics, impact lock, and layered slap audio.
 */
export function modUpdateKatanaSwing(fighter, opponent, arena) {
  if (!fighter.swipeActive || fighter.swordSwingTimer <= 0) return;

  const totalF = fighter.swordSwingMax || 30;
  const elapsed = totalF - fighter.swordSwingTimer;
  const liftF = fighter.swordSwingLiftFrames || 7;
  const holdF = fighter.swordSwingHoldFrames || 2;
  const strikeF = fighter.swordSwingStrikeFrames || 5;
  const pinF = fighter.swordSwingImpactLockFrames || 5;
  const recF = fighter.swordSwingRecFrames || 9;

  const strikeStart = liftF + holdF;
  const strikeEnd = strikeStart + strikeF;
  const pinEnd = strikeEnd + pinF;

  if (elapsed < strikeStart) {
    // Phase 1 & 2: Anticipation Coil & Poised Hold
    if (opponent && !opponent.isDead && !fighter.isAimLocked) {
      const targetAng = Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x);
      fighter.swordSlashAngle = targetAng;
      fighter.targetAngle = targetAng;
    }
    fighter.vx *= 0.88;
    fighter.vy *= 0.88;
  } else if (elapsed < strikeEnd) {
    // Phase 3: Hypersonic Whip Strike Window
    const strikeElapsed = elapsed - strikeStart;
    const strikeP = strikeElapsed / Math.max(1, strikeF);

    if (!fighter.swordSwingSoundPlayed) {
      fighter.swordSwingSoundPlayed = true;
      try {
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('attack_swordswing', 0.95);
        }
      } catch (e) {}
    }

    // Forward lunging momentum impulse
    const lungeP = Math.sin(strikeP * Math.PI);
    fighter.vx = Math.cos(fighter.swordSlashAngle) * fighter.swordSwingLunge * lungeP;
    fighter.vy = Math.sin(fighter.swordSlashAngle) * fighter.swordSwingLunge * lungeP;

    // Deliver impact at mid-strike (strikeP >= 0.50)
    if (strikeP >= 0.50 && !fighter.swordHitDelivered) {
      fighter.swordHitDelivered = true;
      _deliverKatanaImpact(fighter);
    }
  } else if (elapsed < pinEnd) {
    // Phase 4: THE IMPACT LOCK / LATCH (Rule 30)
    // Zero forward velocity clamp
    fighter.vx = 0;
    fighter.vy = 0;
    const tremor = CONFIG.yuta?.swordTremorIntensity ?? 2.2;
    fighter.swordTremorX = (Math.random() - 0.5) * tremor;
    fighter.swordTremorY = (Math.random() - 0.5) * tremor;
  } else {
    // Phase 5: Extraction & Recovery Settle
    fighter.swordTremorX = 0;
    fighter.swordTremorY = 0;
  }

  fighter.swordSwingTimer--;
  fighter.swipeTimer = fighter.swordSwingTimer;
  if (fighter.swordSwingTimer <= 0) {
    fighter.swipeActive = false;
    fighter.slashFadeTimer = 15;
  }
}

/**
 * Delivers damage, layered slap SFX, screenshake, knockback, and hitstun on melee impact.
 */
function _deliverKatanaImpact(fighter) {
  const range = CONFIG.yuta?.meleeRange || 75;
  const bonusDmg = fighter.pureLoveBeamBonusDamage || 0;
  const baseDmg = (fighter.swordSwingDamage || CONFIG.yuta?.meleeDamage || 14) + bonusDmg;
  const arc = CONFIG.yuta?.meleeArc || (Math.PI * 0.85);
  const step = fighter.swordComboStep || 1;

  const isRikaAlive = typeof fighter.isRikaAliveInDomain === 'function' && fighter.isRikaAliveInDomain();
  const dmgMult = typeof fighter.getRikaDamageMultiplier === 'function' ? fighter.getRikaDamageMultiplier() : (isRikaAlive ? (CONFIG.yuta.domainRikaDamageMultiplier || 1.5) : 1.0);
  const finalDamage = baseDmg * dmgMult;

  const myTeam = (state && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(state.fighters.indexOf(fighter)) : fighter.team;
  const validTargets = [];

  const allTargets = [
    ...(state.fighters || []),
    ...(state.illusions || [])
  ];

  for (let i = 0; i < allTargets.length; i++) {
    const enemy = allTargets[i];
    const isControlledRika = fighter.isMakimaControlledRikaTarget?.(enemy);
    if (!enemy || enemy.hp <= 0 || enemy === fighter || enemy.invincibilityTimer > 0 || (!isControlledRika && (enemy.isRika || enemy.owner === fighter)) || (enemy.vanishTimer && enemy.vanishTimer > 0) || enemy.isLawnmower || enemy.isUntargetable || enemy.untargetable || enemy.cannotBeTargeted || enemy.isTargetable === false) continue;

    if (enemy.owner) {
      const ownerTeam = (state && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(state.fighters.indexOf(enemy.owner)) : enemy.owner.team;
      if (!isControlledRika && myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
    } else {
      const enemyTeam = (state && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(state.fighters.indexOf(enemy)) : enemy.team;
      if (myTeam !== null && enemyTeam !== null && myTeam === enemyTeam) continue;
    }

    const dx = enemy.x - fighter.x;
    const dy = enemy.y - fighter.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= fighter.r + (enemy.r || 20) + range) {
      const enemyAngle = Math.atan2(dy, dx);
      const angleDiff = Math.abs(Math.atan2(Math.sin(enemyAngle - fighter.swordSlashAngle), Math.cos(enemyAngle - fighter.swordSlashAngle)));
      if (angleDiff <= arc / 2) {
        validTargets.push(enemy);
      }
    }
  }

  let hitSomeone = false;
  for (const enemy of validTargets) {
    const prevEnemyHp = enemy.hp;
    const dmgResult = enemy.takeDamage(finalDamage, fighter, { isPhysical: true, isMelee: true });
    hitSomeone = true;

    const didDamage = (enemy.hp < prevEnemyHp) || (dmgResult !== false && dmgResult > 0);
    if (didDamage && typeof fighter.registerBasicAttackHit === 'function') {
      fighter.registerBasicAttackHit(enemy);
    }

    // Rule 30: Layered fleshy slap audio
    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('attack_fleshhit', 1.0);
        audioSystem.playSFX('sukuna_slice', 0.90);
        if (step === 3) {
          audioSystem.playSFX('attack_heavypunch1', 0.85); // Sub-bass finisher punch
        }
      }
    } catch (e) {}

    // Hit Pause & Hit Stun
    const hitPause = fighter.swordSwingHitPause || 3;
    const hitStun = fighter.swordSwingHitStun || 14;
    if (typeof enemy.applyTimeStop === 'function') enemy.applyTimeStop(hitPause);
    if (typeof enemy.applyHitStun === 'function') enemy.applyHitStun(hitStun);

    // Screen Shake
    const shake = fighter.swordSwingImpactShake || (step === 3 ? 8 : (step === 2 ? 5.5 : 4.0));
    if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(shake, 8);

    if (isRikaAlive) {
      spawnFloatingText(enemy.x, enemy.y - 20, `${Math.round(finalDamage)}!`, '#FF1493');
    }

    spawnImpactFlash(enemy.x, enemy.y, 28);
    spawnBloodEffect(enemy, 12, fighter.swordSlashAngle);

    // Knockback
    const kbForce = fighter.swordSwingKnockback || (CONFIG.yuta?.meleeKnockback ?? 4.5);
    if (kbForce > 0) {
      const kbAngle = fighter.swordSlashAngle;
      const kbX = Math.cos(kbAngle) * kbForce;
      let kbY = Math.sin(kbAngle) * kbForce;
      if (step === 2) {
        kbY -= 2.5; // rising scoop loft
      }
      if (typeof enemy.applyKnockback === 'function') {
        enemy.applyKnockback(kbX, kbY);
      } else {
        enemy.vx += kbX;
        enemy.vy += kbY;
      }
    }

    // Clash with Sukuna or Gojo
    const isEnemySukuna = enemy.characterId === 'sukuna' || enemy.type === 'sukuna' || enemy._def?.id === 'sukuna' || enemy._def?.type === 'sukuna';
    const isEnemyGojo = enemy.characterId === 'gojo' || enemy.type === 'gojo' || enemy._def?.id === 'gojo' || enemy._def?.type === 'gojo';
    if (isEnemySukuna || isEnemyGojo) {
      const midX = (fighter.x + enemy.x) / 2;
      const midY = (fighter.y + enemy.y) / 2;
      spawnMeleeClashShockwave(midX, midY, 100, isEnemySukuna ? 'yuta' : 'gojo');
      triggerGlobalScreenShake(8, 10);
    }
  }

  // If Hit 3 Finisher: spawn clean concentric cursed shockwave (Rule 26) & sparks
  if (step === 3) {
    const tipDist = fighter.r + 88;
    const sparkX = fighter.x + Math.cos(fighter.swordSlashAngle) * tipDist;
    const sparkY = fighter.y + Math.sin(fighter.swordSlashAngle) * tipDist;
    spawnSparks(sparkX, sparkY, 16, '#FF1493');
    spawnMeleeClashShockwave(sparkX, sparkY, 70, 'yuta');
  }
}

/**
 * Calculates the exact real-time angle of Yuta's Katana across the 5-phase combo.
 */
export function modGetKatanaSwingAngle(fighter) {
  if (!fighter.swipeActive || fighter.swordSwingTimer <= 0) {
    return fighter.gunAngle || 0;
  }

  const totalF = fighter.swordSwingMax || 30;
  const elapsed = Math.max(0, totalF - fighter.swordSwingTimer);
  const liftF = fighter.swordSwingLiftFrames || 7;
  const holdF = fighter.swordSwingHoldFrames || 2;
  const strikeF = fighter.swordSwingStrikeFrames || 5;
  const pinF = fighter.swordSwingImpactLockFrames || 5;
  const recF = fighter.swordSwingRecFrames || 9;

  const strikeStart = liftF + holdF;
  const strikeEnd = strikeStart + strikeF;
  const pinEnd = strikeEnd + pinF;

  const baseAngle = fighter.swordSlashAngle !== undefined ? fighter.swordSlashAngle : (fighter.gunAngle || 0);
  const step = fighter.swordComboStep || 1;

  let swingTotal, startAngle, endAngle;
  if (step === 2) {
    // Hit 2: Rising Cursed Crescent Scoop (Low right diagonally up to high left)
    swingTotal = Math.PI * 1.45;
    startAngle = baseAngle + swingTotal * 0.55;
    endAngle = baseAngle - swingTotal * 0.55;
  } else if (step === 3) {
    // Hit 3: Two-Handed Overhead Execution Chop (High overhead behind shoulder down through floor)
    swingTotal = Math.PI * 1.65;
    startAngle = baseAngle - swingTotal * 0.65;
    endAngle = baseAngle + swingTotal * 0.40;
  } else {
    // Hit 1: Cursed Horizontal Cross Cleave (Left shoulder across to right)
    swingTotal = Math.PI * 1.35;
    startAngle = baseAngle - swingTotal * 0.50;
    endAngle = baseAngle + swingTotal * 0.50;
  }

  if (elapsed < liftF) {
    // Phase 1: Lift / Coil
    const p = elapsed / Math.max(1, liftF);
    return baseAngle + (startAngle - baseAngle) * Math.sin(p * Math.PI * 0.5);
  } else if (elapsed < strikeStart) {
    // Phase 2: Poised Hold
    return startAngle;
  } else if (elapsed < strikeEnd) {
    // Phase 3: Hypersonic Whip Strike
    const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
    const easePow = (step === 3) ? 2.6 : 2.4;
    const ease = Math.pow(sp, easePow);
    return startAngle + (endAngle - startAngle) * ease;
  } else if (elapsed < pinEnd) {
    // Phase 4: Impact Lock (firmly latched into cleave plane)
    return endAngle;
  } else {
    // Phase 5: Recovery Settle
    const rp = (elapsed - pinEnd) / Math.max(1, recF);
    const ease = Math.pow(1 - rp, 1.8);
    return baseAngle + (endAngle - baseAngle) * ease;
  }
}

/**
 * Calculates Yuta's 5-phase Katana angle during Phantom Flurry hypersonic cleaves.
 * Synchronizes the Katana blade angle 1:1 with the dynamic slash ribbon across all 360 degrees.
 */
export function modGetFlurryKatanaAngle(fighter) {
  const maxF = (typeof CONFIG !== 'undefined' && CONFIG.yuta?.flurrySlashFrames) ? CONFIG.yuta.flurrySlashFrames : 14;
  const elapsed = Math.max(0, maxF - (fighter.flurrySlashTimer || 0));
  const baseAngle = (fighter.flurrySlashAngle !== undefined) ? fighter.flurrySlashAngle : (fighter.gunAngle || 0);
  const facingLeft = Math.abs(baseAngle) > Math.PI / 2;
  const comboIndex = (fighter.activeSlashType || 0) % 3;

  const liftF = (typeof CONFIG !== 'undefined' && CONFIG.yuta?.flurryLiftFrames) ? CONFIG.yuta.flurryLiftFrames : 2;
  const strikeF = (typeof CONFIG !== 'undefined' && CONFIG.yuta?.flurryStrikeFrames) ? CONFIG.yuta.flurryStrikeFrames : 5;
  const pinF = (typeof CONFIG !== 'undefined' && CONFIG.yuta?.flurryImpactLockFrames) ? CONFIG.yuta.flurryImpactLockFrames : 3;
  const recF = (typeof CONFIG !== 'undefined' && CONFIG.yuta?.flurryRecoveryFrames) ? CONFIG.yuta.flurryRecoveryFrames : 4;

  const strikeStart = liftF;
  const strikeEnd = strikeStart + strikeF; // 7
  const pinEnd = strikeEnd + pinF;         // 10

  let localStart, localEnd;
  if (comboIndex === 1) {
    // Combo 1: Rising Scoop (sweeps from lower right up to high left)
    localStart = Math.PI * 0.48;
    localEnd = -Math.PI * 0.48;
  } else if (comboIndex === 2) {
    // Combo 2: Hypersonic Deep Horizontal Cross Cleave
    localStart = -Math.PI * 0.60;
    localEnd = Math.PI * 0.60;
  } else {
    // Combo 0: Diagonal Downward Cross Cleave (sweeps from top left down to right)
    localStart = -Math.PI * 0.48;
    localEnd = Math.PI * 0.48;
  }

  let localAngle;
  if (elapsed < strikeStart) {
    // Phase 1: Coil / Anticipation
    const lp = elapsed / Math.max(1, liftF);
    localAngle = localStart * Math.sin(lp * Math.PI * 0.5);
  } else if (elapsed < strikeEnd) {
    // Phase 2: Hypersonic Whip Strike
    const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
    const ease = Math.pow(sp, 2.4);
    localAngle = localStart + (localEnd - localStart) * ease;
  } else if (elapsed < pinEnd) {
    // Phase 3: Impact Lock (firmly locked in cleave plane)
    localAngle = localEnd;
  } else {
    // Phase 4: Recovery Settle
    const rp = (elapsed - pinEnd) / Math.max(1, recF);
    const ease = Math.pow(1.0 - rp, 1.8);
    localAngle = localEnd * ease;
  }

  return facingLeft ? (baseAngle - localAngle) : (baseAngle + localAngle);
}

export function modGetKatanaTipPositions(fighter) {
  const maxCd = fighter.meleeCooldownMax || 34;
  const isFlurrySwinging = (fighter.flurrySlashTimer > 0);
  const isComboSwinging = (fighter.swipeActive && fighter.swordSwingTimer > 0);
  const isSwinging = isFlurrySwinging || isComboSwinging;

  const targetOrGun = isFlurrySwinging
    ? (fighter.flurrySlashAngle !== undefined ? fighter.flurrySlashAngle : (fighter.gunAngle || 0))
    : ((isComboSwinging && fighter.swordSlashAngle !== undefined) ? fighter.swordSlashAngle : (fighter.gunAngle || 0));
  const facingLeft = Math.abs(targetOrGun) > Math.PI / 2;
  const baseAngle = facingLeft ? Math.PI : 0;
  let diff = targetOrGun - baseAngle;
  let normDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
  if (facingLeft) {
    normDiff = -normDiff;
  }

  let localWeaponAngle = 0;

  if (isFlurrySwinging) {
    const fullAngle = modGetFlurryKatanaAngle(fighter);
    let lDiff = fullAngle - baseAngle;
    let lNorm = Math.atan2(Math.sin(lDiff), Math.cos(lDiff));
    if (facingLeft) lNorm = -lNorm;
    localWeaponAngle = lNorm;
  } else if (isComboSwinging) {
    const fullAngle = modGetKatanaSwingAngle(fighter);
    let lDiff = fullAngle - baseAngle;
    let lNorm = Math.atan2(Math.sin(lDiff), Math.cos(lDiff));
    if (facingLeft) lNorm = -lNorm;
    localWeaponAngle = lNorm;
  } else {
    localWeaponAngle = normDiff;
  }

  // Project local coordinates (lx, ly) to world space matching drawGun
  const projectLocal = (lx, ly) => {
    const cosL = Math.cos(localWeaponAngle);
    const sinL = Math.sin(localWeaponAngle);
    let rx = lx * cosL - ly * sinL;
    let ry = lx * sinL + ly * cosL;

    if (facingLeft) {
      ry = -ry;
    }

    const cosB = Math.cos(baseAngle);
    const sinB = Math.sin(baseAngle);
    return {
      x: fighter.x + rx * cosB - ry * sinB,
      y: fighter.y + rx * sinB + ry * cosB
    };
  };

  let tipPos, innerPos;

  if (fighter.rikaCallTimer > 0) {
    // Raised summoning pose for Katana when calling Rika
    const humAngle = Math.sin(Date.now() * 0.08) * 0.08;
    const humShift = Math.cos(Date.now() * 0.1) * 2;
    const callAngle = -Math.PI * 0.35 + humAngle;

    const L = (fighter.r - 8 + humShift) + 81 * 1.2;
    const innerL = L - 14;

    const cosC = Math.cos(callAngle);
    const sinC = Math.sin(callAngle);
    tipPos = projectLocal(cosC * L, sinC * L);
    innerPos = projectLocal(cosC * innerL, sinC * innerL);
  } else if (fighter.blockPoseTimer > 0 && !isSwinging) {
    const stanceAngle = Math.PI / 2;
    const baseDist = fighter.r - 18;
    const L = 81 * 1.2;
    const innerL = L - 14;
    const cosS = Math.cos(stanceAngle);
    const sinS = Math.sin(stanceAngle);
    tipPos = projectLocal(baseDist + cosS * L, sinS * L);
    innerPos = projectLocal(baseDist + cosS * innerL, sinS * innerL);
  } else {
    // Normal / Swing position
    const px = (fighter.r - 10) + 81 * 1.2;
    const py = 0;
    tipPos = projectLocal(px, py);

    const innerPx = (fighter.r - 10) + 67.5 * 1.2;
    const innerPy = 0;
    innerPos = projectLocal(innerPx, innerPy);
  }

  return {
    outer: tipPos,
    inner: innerPos
  };
}
