// ─────────────────────────────────────────────
// TOJI FUSHIGURO WEAPONS MODULE
// Encapsulates Inverted Spear of Heaven, Split Soul Katana, and Chain Physics
// ─────────────────────────────────────────────
import { applyDamageToTarget } from '../../fighter.js';
import { CONFIG } from '../../../core/config.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { spawnSparks, spawnImpactFlash, spawnCrimsonLightningImpact, spawnMeleeClashShockwave, spawnAnimePunchImpactFrame, spawnGroundScorch } from '../../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../../graphics/particles/bloodEffect.js';
import { TOJI_WEAPON_CONFIG } from '../../../graphics/weapons/tojiWeaponGraphics.js';
import { getSkillEffectSound } from '../../../soundEffects/skillEffectSounds.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';

export function tojiGetTargetsInFrontalArc(fighter, primaryTarget, attackAngle, maxReach, arcAngle = Math.PI * 0.6) {
  const targets = new Set();
  const halfArc = arcAngle * 0.5;

  const checkTarget = (target) => {
    if (!target || target === fighter || target.hp <= 0 || target.dead || target.isDead) return false;
    if (target.isLawnmower || target.isUntargetable || target.untargetable || target.cannotBeTargeted || target.isTargetable === false) return false;
    const dx = target.x - fighter.x;
    const dy = target.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    const attackReach = (fighter.r || 25) + (target.r || 20) + maxReach;

    if (dist <= attackReach) {
      const angleToOther = Math.atan2(dy, dx);
      let diff = angleToOther - attackAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      if (Math.abs(diff) <= halfArc) {
        targets.add(target);
        return true;
      }
    }
    return false;
  };

  const rawTeam = (typeof state !== 'undefined' && typeof state.getFighterTeam === 'function' && state.fighters) 
    ? state.getFighterTeam(state.fighters.indexOf(fighter)) 
    : null;
  const fighterTeam = (rawTeam !== null && rawTeam !== undefined) ? rawTeam : null;

  if (primaryTarget && primaryTarget !== fighter && primaryTarget.hp > 0) {
    checkTarget(primaryTarget);
  }

  if (typeof state !== 'undefined' && state.fighters && state.fighters.length > 0) {
    for (const other of state.fighters) {
      if (!other || other === fighter || other.hp <= 0) continue;
      
      if (fighterTeam !== null && typeof state.getFighterTeam === 'function') {
        const otherIndex = state.fighters.indexOf(other);
        const otherTeam = otherIndex >= 0 ? state.getFighterTeam(otherIndex) : null;
        if (otherTeam !== null && otherTeam !== undefined && otherTeam === fighterTeam) continue;
      }

      checkTarget(other);
    }
  }

  if (typeof state !== 'undefined' && state.illusions) {
    for (const ill of state.illusions) {
      if (!ill || ill === fighter || ill.hp <= 0 || ill.owner === fighter) continue;
      checkTarget(ill);
    }
  }

  return Array.from(targets);
}

export function initChainPhysics(fighter) {
  fighter.chainNodes = [];
  const baseAngle = (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  const normAngle = Math.atan2(Math.sin(baseAngle), Math.cos(baseAngle));
  const isFacingLeft = Math.abs(normAngle) > Math.PI / 2;
  const flipSign = isFacingLeft ? -1 : 1;

  const renderAngle = baseAngle + (0.42 * flipSign);
  const totalRadius = (fighter.r || 25) - 4;
  const ringX = (fighter.x || 0) + Math.cos(renderAngle) * totalRadius;
  const ringY = (fighter.y || 0) + Math.sin(renderAngle) * totalRadius;
  const linkDist = 4.8;

  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const sway = Math.sin(t * Math.PI) * 2.0 * (isFacingLeft ? 1 : -1);
    fighter.chainNodes.push({
      x: ringX + sway,
      y: ringY + (i * linkDist * 0.96),
      vx: 0,
      vy: 0
    });
  }
}

export function updateChainPhysics(fighter) {
  if (!fighter.chainNodes || fighter.chainNodes.length === 0) {
    initChainPhysics(fighter);
  }

  const baseAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  const normAngle = Math.atan2(Math.sin(baseAngle), Math.cos(baseAngle));
  const isFacingLeft = Math.abs(normAngle) > Math.PI / 2;
  const flipSign = isFacingLeft ? -1 : 1;

  const isAttacking = fighter.spearSwingTimer > 0;

  let offsetAngle = 0.42 * flipSign;
  let thrustDistance = 0;

  if (isAttacking) {
    const maxTimer = fighter.spearSwingMax || (fighter.isAmbushThrust ? 36 : 26);
    const t = Math.max(0, Math.min(1.0, 1 - (fighter.spearSwingTimer / maxTimer)));

    if (fighter.isAmbushThrust) {
      if (t < 0.12) {
        const p = t / 0.12;
        thrustDistance = -24 * (1 - p * 0.1);
        offsetAngle = 0;
      } else if (t < 0.72) {
        const p = (t - 0.12) / 0.60;
        const thrustProgress = Math.min(1.0, p * 4.0);
        thrustDistance = -24 + 94 * thrustProgress;
        offsetAngle = 0;
      } else {
        const p = (t - 0.72) / 0.28;
        const easeP = p * (2 - p);
        thrustDistance = 70 * (1 - easeP);
        offsetAngle = 0.42 * easeP * flipSign;
      }
    } else {
      // 5-Phase Melee Combat & Impact Lock (Rule 30 / Chemical Katana Motion Pattern — Maki Standard)
      const isStep2 = (fighter.spearComboStep === 2);
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.toji) ? CONFIG.toji : {};
      const liftF = isStep2 ? (cfg.hit2LiftFrames ?? 3) : (cfg.hit1LiftFrames ?? 4);
      const holdF = isStep2 ? (cfg.hit2HoldFrames ?? 1) : (cfg.hit1HoldFrames ?? 1);
      const strikeF = isStep2 ? (cfg.hit2StrikeFrames ?? 5) : (cfg.hit1StrikeFrames ?? 4);
      const lockF = isStep2 ? (cfg.hit2ImpactLockFrames ?? 5) : (cfg.hit1ImpactLockFrames ?? 4);
      const recF = isStep2 ? (cfg.hit2RecoveryFrames ?? 7) : (cfg.hit1RecoveryFrames ?? 5);
      const totalF = Math.max(1, liftF + holdF + strikeF + lockF + recF);

      const t1 = liftF / totalF;
      const t2 = (liftF + holdF) / totalF;
      const t3 = (liftF + holdF + strikeF) / totalF;
      const t4 = (liftF + holdF + strikeF + lockF) / totalF;

      if (!isStep2) {
        // ── HIT 1: THE PISTON PLUNGE (Pure Linear Penetration Thrust) ──
        if (t < t1) {
          const p = t / Math.max(0.001, t1);
          const easeP = Math.sin(p * Math.PI * 0.5);
          thrustDistance = -16 * easeP;
          offsetAngle = (0.42 + (0.05 - 0.42) * easeP) * flipSign;
        } else if (t < t2) {
          thrustDistance = -16;
          offsetAngle = 0.05 * flipSign;
        } else if (t < t3) {
          const p = (t - t2) / Math.max(0.001, t3 - t2);
          const plungeCurve = 1 - Math.pow(1 - p, 2.6);
          thrustDistance = -16 + (38 - (-16)) * plungeCurve;
          offsetAngle = 0; // Pure linear alignment along aim vector!
        } else if (t < t4) {
          const pLock = (t - t3) / Math.max(0.001, t4 - t3);
          const tremorInt = (typeof cfg.spearTremorIntensity === 'number') ? cfg.spearTremorIntensity : 1.5;
          const jitter = Math.sin(pLock * Math.PI * 8.0) * (1.0 - pLock * 0.5) * tremorInt;
          const angJitter = Math.sin(pLock * Math.PI * 10.0) * (1.0 - pLock * 0.5) * (tremorInt * 0.015);
          thrustDistance = 38 + jitter;
          offsetAngle = angJitter * flipSign;
        } else {
          const recP = (t - t4) / Math.max(0.001, 1.0 - t4);
          const easeRec = Math.pow(recP, 1.8);
          const dampedWave = Math.sin(recP * Math.PI * 2.0) * Math.pow(1.0 - recP, 2.0) * 0.05;
          thrustDistance = 38 * (1.0 - easeRec);
          offsetAngle = (0.42 * easeRec + dampedWave) * flipSign;
        }
      } else {
        // ── HIT 2: THE THROAT CARVE / CROSS-RIP (Horizontal Cleave out of Puncture) ──
        if (t < t1) {
          const p = t / Math.max(0.001, t1);
          const easeP = Math.sin(p * Math.PI * 0.5);
          thrustDistance = 10 * easeP;
          offsetAngle = (0.42 + (-1.10 - 0.42) * easeP) * flipSign;
        } else if (t < t2) {
          thrustDistance = 10;
          offsetAngle = -1.10 * flipSign;
        } else if (t < t3) {
          const p = (t - t2) / Math.max(0.001, t3 - t2);
          const sweepCurve = 1 - Math.pow(1 - p, 2.4);
          thrustDistance = 10 + 18 * Math.sin(p * Math.PI * 0.70);
          offsetAngle = (-1.10 + 2.10 * sweepCurve) * flipSign; // Sweeps from -1.10 to +1.00 rad
        } else if (t < t4) {
          const pLock = (t - t3) / Math.max(0.001, t4 - t3);
          const tremorInt = (typeof cfg.spearTremorIntensity === 'number') ? cfg.spearTremorIntensity : 1.5;
          const jitter = Math.sin(pLock * Math.PI * 8.0) * (1.0 - pLock * 0.5) * tremorInt;
          const angJitter = Math.sin(pLock * Math.PI * 10.0) * (1.0 - pLock * 0.5) * (tremorInt * 0.026);
          thrustDistance = 28 + jitter;
          offsetAngle = (1.00 + angJitter) * flipSign;
        } else {
          const recP = (t - t4) / Math.max(0.001, 1.0 - t4);
          const easeRec = Math.pow(recP, 1.8);
          const dampedWave = Math.sin(recP * Math.PI * 2.0) * Math.pow(1.0 - recP, 2.0) * 0.06;
          thrustDistance = 28 * (1.0 - easeRec);
          offsetAngle = (1.00 + (0.42 - 1.00) * easeRec + dampedWave) * flipSign;
        }
      }
    }
  } else {
    offsetAngle += Math.sin(Date.now() / 250) * 0.05 * flipSign;
  }

  const renderAngle = baseAngle + offsetAngle;
  const totalRadius = (fighter.r - 4 + thrustDistance);
  const ringX = fighter.x + Math.cos(renderAngle) * totalRadius;
  const ringY = fighter.y + Math.sin(renderAngle) * totalRadius;
  const linkDist = 4.8;

  fighter.chainNodes[0].x = ringX;
  fighter.chainNodes[0].y = ringY;

  const isMoving = (Math.hypot(fighter.vx || 0, fighter.vy || 0) > 0.15) || isAttacking;

  if (!isMoving) {
    for (let i = 1; i < fighter.chainNodes.length; i++) {
      const t = i / (fighter.chainNodes.length - 1);
      const sway = Math.sin(t * Math.PI) * 2.0 * (isFacingLeft ? 1 : -1);
      const node = fighter.chainNodes[i];
      const tx = ringX + sway;
      const ty = ringY + (i * linkDist * 0.96);
      
      node.x += (tx - node.x) * 0.40;
      node.y += (ty - node.y) * 0.40;
      node.vx = 0;
      node.vy = 0;
    }
    return;
  }

  for (let i = 1; i < fighter.chainNodes.length; i++) {
    const node = fighter.chainNodes[i];
    node.vx = (node.vx + (fighter.vx * -0.03)) * 0.80;
    node.vy = (node.vy + (fighter.vy * -0.03)) * 0.80 + 0.4;
    node.x += node.vx;
    node.y += node.vy;
  }

  for (let iter = 0; iter < 12; iter++) {
    for (let i = 1; i < fighter.chainNodes.length; i++) {
      const prev = fighter.chainNodes[i - 1];
      const node = fighter.chainNodes[i];
      const dx = node.x - prev.x;
      const dy = node.y - prev.y;
      const dist = Math.hypot(dx, dy) || 0.001;

      if (dist !== linkDist) {
        const delta = (dist - linkDist) / dist;
        if (i - 1 === 0) {
          node.x -= dx * delta;
          node.y -= dy * delta;
        } else {
          node.x -= dx * delta * 0.5;
          node.y -= dy * delta * 0.5;
          prev.x += dx * delta * 0.5;
          prev.y += dy * delta * 0.5;
        }
      }
    }
  }
}

export function performSplitSoulKatanaSlash(fighter, primaryTarget, ownerIndex) {
  if (!fighter.isSkillEnabled(CONFIG.toji?.enableKatana, true)) return [];
  if (!fighter._secondSeqAudioPlayed) {
    const s2Chance = typeof CONFIG.toji?.soundChances?.secondWeaponAttack === 'number'
      ? CONFIG.toji.soundChances.secondWeaponAttack
      : 1.0;
    const isAllowed = fighter._ambushVoicelineAllowed !== undefined ? fighter._ambushVoicelineAllowed : true;
    if (isAllowed && Math.random() < s2Chance) {
      const secondSeqSound = getSkillEffectSound('toji', 'secondweaponattack');
      if (secondSeqSound) audioSystem.playSFX(secondSeqSound);
    }
  }
  fighter._secondSeqAudioPlayed = false;
  audioSystem.playSFX('attack_swordswing', 1.25);
  audioSystem.playSFX('attack_fleshhit', 1.35);
  audioSystem.playSFX('attack_groundsmash', 1.1);

  const attackAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  const reach = CONFIG.toji?.katanaRange || fighter.katanaRange || 75;
  // Wide 160 degree frontal arc cleave for Katana!
  const targets = tojiGetTargetsInFrontalArc(fighter, primaryTarget, attackAngle, reach, Math.PI * 0.88);

  if (fighter.isAmbushing && primaryTarget && primaryTarget.hp > 0 && !targets.includes(primaryTarget)) {
    targets.push(primaryTarget);
  }

  const damage = CONFIG.toji?.katanaDamage || 35;
  const soulWoundDuration = CONFIG.toji?.soulWoundDuration || 180;

  for (const target of targets) {
    const didDamage = applyDamageToTarget(target, damage, fighter, {
      isMelee: true,
      isTrueDamage: true,
      isSoulSplit: true,
      bypassShield: !!fighter.isAmbushing,
      isAmbushKatana: !!fighter.isAmbushing,
      isAdaptableSkillShot: !!fighter.isAmbushing,
      skillShotId: fighter.isAmbushing ? 'tojiAmbush' : null
    });

    const isBlockedByInfinity = !fighter.isAmbushing && didDamage === false && (typeof target.hasActiveInfinity === 'function') && target.hasActiveInfinity();

    if (isBlockedByInfinity) {
      // Split Soul Katana does NOT possess ISOH curse nullification in neutral — blocked 100% by Limitless Infinity!
      // Spawn clean deflection clash on the barrier perimeter, NOT on Gojo's body
      const blockX = target.infinityBlockX ?? target.x;
      const blockY = target.infinityBlockY ?? target.y;
      if (typeof spawnSparks === 'function') {
        spawnSparks(blockX, blockY, 20, 'cyan', '#00E5FF');
      }
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(blockX, blockY, 40, '#00E5FF');
      }
      continue;
    }

    target.soulWoundTimer = soulWoundDuration;

    if (fighter.isAmbushing && target && target.hp > 0 && !target.isDead && !target.isRevivingFromContract && !target.isShatterReviving) {
      target.isTargetOfAmbush = true;
      const katanaFreeze = CONFIG.toji?.ambushKatanaFreezeDuration || 70;
      if (typeof target.applyTimeStop === 'function') {
        target.applyTimeStop(katanaFreeze);
      }
      target.paralyzeTimer = Math.max(target.paralyzeTimer || 0, katanaFreeze);
      delete target._timeStopFrozenAngle;
      delete target._timeStopFrozenGunAngle;
    } else if (typeof fighter._clearTargetFreeze === 'function') {
      fighter._clearTargetFreeze(target);
    }
    const targetHitAngle = Math.atan2(fighter.y - target.y, fighter.x - target.x);
    let angleDiff = targetHitAngle - (target.angle || 0);
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    if (target.characterId !== 'mahoraga' && target.type !== 'mahoraga') {
      target.angle = (target.angle || 0) + angleDiff * 0.40;
    }
    target.gunAngle = target.angle;

    if (!target.isTurret && !target.cannotBeKnockbacked) {
      target.isFirstHitKnockback = false;
      const directAngle = Math.atan2(target.y - fighter.y, target.x - fighter.x);
      const sweepSlingAngle = directAngle;
      const knockbackForce = (CONFIG.toji?.ambushKnockbackForce || 52);

      const kbVx = Math.cos(sweepSlingAngle) * knockbackForce;
      const kbVy = Math.sin(sweepSlingAngle) * knockbackForce;
      target.knockbackDecay = 0.92;
      if (typeof target.applyKnockback === 'function') {
        target.applyKnockback(kbVx, kbVy);
      } else if (!target.immuneToPush && !target.immuneToKnockback && target.characterId !== 'escanor') {
        target.knockbackVx = kbVx;
        target.knockbackVy = kbVy;
        target.vx = kbVx;
        target.vy = kbVy;
      }
    }

    if (typeof spawnGroundScorch === 'function') {
      spawnGroundScorch(target.x, target.y, 65, 90, 'crimson');
    }
    spawnBloodEffect(target, 35, attackAngle);
    spawnImpactFlash(target.x, target.y, 240, 'rgba(255, 30, 75, 0.95)');
    spawnImpactFlash(target.x, target.y, 150, '#FFFFFF');
    spawnCrimsonLightningImpact(target.x, target.y, 180);
    if (typeof spawnAnimePunchImpactFrame === 'function') {
      spawnAnimePunchImpactFrame(target.x, target.y, 100, attackAngle, 'crimson');
    }
    if (typeof spawnMeleeClashShockwave === 'function') {
      spawnMeleeClashShockwave(target.x, target.y, 140, 'rgba(255, 30, 75, 0.95)');
      spawnMeleeClashShockwave(target.x, target.y, 85, '#A020F0');
    }
    spawnSparks(target.x, target.y, 70, 'crimsonSniper');
    spawnSparks(target.x, target.y, 40, 'crimson');
  }

  triggerGlobalScreenShake(16, 14);
}

export function deliverInvertedSpearImpact(fighter, primaryTarget, ownerIndex = 0, isAmbushThrust = false) {
  if (fighter.spearHitDelivered) return [];
  fighter.spearHitDelivered = true;

  const isStep2 = (fighter.spearComboStep === 2) && !isAmbushThrust;
  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.toji) ? CONFIG.toji : {};
  const attackAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  const reach = isAmbushThrust ? (cfg.ambushSpearReach || 80) : (cfg.spearRange || fighter.spearRange || 55);
  const arc = isAmbushThrust ? (Math.PI * 0.67) : (isStep2 ? (cfg.hit2ArcAngle || ((125 * Math.PI) / 180)) : (cfg.hit1ArcAngle || ((45 * Math.PI) / 180)));
  let targets = tojiGetTargetsInFrontalArc(fighter, primaryTarget, attackAngle, reach, arc);

  if (targets.length === 0 && primaryTarget && primaryTarget !== fighter && primaryTarget.hp > 0 && !primaryTarget.isDead) {
    targets = [primaryTarget];
  }

  // ── THE VISCERAL MEATY FLESH SLAP AUDIO COMBINATION (Rule 30 & Melee Animator Guide) ──
  try {
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      if (isStep2) {
        // Hit 2: The Throat Carve / Vicious Cross-Rip
        audioSystem.playSFX('attack_fleshhit', 1.15);     // Visceral meaty slap!
        audioSystem.playSFX('sukuna_slice', 1.0);         // Lethal razor cutting cleave!
        audioSystem.playSFX('attack_swordswing', 0.85);   // Swishing steel resonance
        audioSystem.playSFX('skill_backstab', 0.60);
      } else {
        // Hit 1: The Piston Plunge (Hypersonic needle puncture)
        audioSystem.playSFX('skill_backstab', 1.0);       // Signature Inverted Spear piercing puncture!
        audioSystem.playSFX('attack_fleshhit', 1.0);      // High-speed concussive body slap!
        audioSystem.playSFX('sukuna_slice', 0.50);
      }
    }
  } catch (e) {}

  const hitShake = isAmbushThrust ? 6 : (isStep2 ? (cfg.hit2ImpactShake || 4.5) : (cfg.hit1ImpactShake || 3.0));
  const hitShakeDur = isAmbushThrust ? 8 : (isStep2 ? (cfg.hit2ImpactShakeDuration || 8) : (cfg.hit1ImpactShakeDuration || 6));
  if (hitShake > 0 && hitShakeDur > 0) {
    triggerGlobalScreenShake(hitShake, hitShakeDur);
  }

  const hitPause = isAmbushThrust ? 5 : (isStep2 ? (cfg.hit2HitPauseFrames || 4) : (cfg.hit1HitPauseFrames || 3));
  fighter.spearHitTremorTimer = hitPause + 1;

  const thrustDamage = isAmbushThrust ? (cfg.ambushBackThrustDamage ?? 50) : (isStep2 ? (cfg.hit2Damage || 20) : (cfg.hit1Damage || 14));

  for (const target of targets) {
    let wasInfinityActive = false;
    if (isAmbushThrust && target.characterId === 'gojo' && target.infinityActive) {
      wasInfinityActive = true;
      target._wasInfinityActiveBeforeAmbush = true;
      target.infinityActive = false;
      target.infinityBlockTimer = 0;
      spawnSparks(target.x, target.y, 22, 'lightningTrail', '#00E5FF');
      spawnImpactFlash(target.x, target.y, 60, 'lightningTrail');
    }

    applyDamageToTarget(target, thrustDamage, fighter, {
      isMelee: true,
      isTrueDamage: true,
      isIsoh: true,
      bypassShield: true,
      isAmbushThrust: !!isAmbushThrust,
      isAdaptableSkillShot: !!fighter.isAmbushing,
      skillShotId: fighter.isAmbushing ? 'tojiAmbush' : null
    });

    delete target._timeStopFrozenAngle;
    delete target._timeStopFrozenGunAngle;
    const targetHitAngle = Math.atan2(fighter.y - target.y, fighter.x - target.x);
    let angleDiff = targetHitAngle - (target.angle || 0);
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    if (target.characterId !== 'mahoraga' && target.type !== 'mahoraga') {
      target.angle = (target.angle || 0) + angleDiff * 0.40;
    }
    target.gunAngle = target.angle;

    if (wasInfinityActive && !isAmbushThrust) {
      target.infinityActive = true;
    }

    const chanState = fighter.ambushTargetChannelState || {};
    const wasPurple = target.isChannelingPurple || chanState.purple;
    const wasDomain = target.isChannelingDomainExpansion || target.isChannelingDomain || chanState.domain;
    const wasRCT = target.isChannelingRCT || chanState.rct;
    const wasDivineFlame = target.isChannelingDivineFlame || chanState.divineFlame;
    const wasStorm = target.isChannelingStorm || chanState.storm;
    const wasGetsuga = target.isChannelingGetsuga || target.isChannelingBankai || chanState.getsuga || chanState.bankai;
    const wasGeneric = target.isChanneling || chanState.generic;

    const wasChanneling = isAmbushThrust && (fighter.ambushTargetWasChanneling || wasPurple || wasDomain || wasRCT || wasDivineFlame || wasStorm || wasGetsuga || wasGeneric);

    if (wasChanneling) {
      const silenceFrames = cfg.silenceDuration || 180;
      target.silenceTimer = silenceFrames;

      target.isChannelingPurple = false;
      target.purpleChargeTimer = 0;
      target.isChannelingDomainExpansion = false;
      target.isChannelingDomain = false;
      target.domainChargeTimer = 0;
      target.isChannelingRCT = false;
      target.rctChannelTimer = 0;
      target.isChannelingDivineFlame = false;
      target.isChannelingStorm = false;
      target.isChannelingGetsuga = false;
      target.getsugaChargeTimer = 0;
      target.getsugaSlideTimer = 0;
      target.isChannelingBankai = false;
      target.bankaiChargeTimer = 0;
      target.bankaiSlideTimer = 0;
      target.isChanneling = false;
      target.channelTimer = 0;
      if (typeof target.interruptAttacks === 'function') target.interruptAttacks(true);

      if (wasPurple && target.purpleCooldown !== undefined) target.purpleCooldown = (CONFIG.gojo?.purpleCooldown || 1500) / 2;
      if (wasDomain && target.domainCooldown !== undefined && !target.domainActive) target.domainCooldown = (CONFIG.gojo?.domainCooldown || CONFIG.sukuna?.domainCooldown || CONFIG.yuta?.domainCooldown || 1500) / 2;
      if (wasRCT && target.rctCooldown !== undefined) target.rctCooldown = (CONFIG.yuta?.rctCooldown || 600) / 2;
      if (wasDivineFlame && target.divineFlameCooldown !== undefined) target.divineFlameCooldown = (CONFIG.sukuna?.divineFlameCooldown || 1500) / 2;
      if (wasStorm && target.stormCooldown !== undefined) target.stormCooldown = (CONFIG.zeus?.stormCooldown || 1500) / 2;
      if (wasGetsuga && target.getsugaCooldown !== undefined) target.getsugaCooldown = (CONFIG.ichigo?.getsugaCooldown || 450) / 2;
      if (wasGeneric && typeof target.ultimateCooldown === 'number' && !target.ultimateActive) target.ultimateCooldown = (target.ultimateCooldownMax || 900) / 2;

      spawnSparks(target.x, target.y, 18, '#A078C8');
      spawnImpactFlash(target.x, target.y, 45, 'rgba(160, 30, 240, 0.9)');
    }

    spawnBloodEffect(target, isAmbushThrust ? 14 : 10, attackAngle);
    spawnSparks(target.x, target.y, '#A078C8', 12);
    spawnSparks(target.x, target.y, '#FF3355', 10);
    spawnSparks(target.x, target.y, 12, 'crimsonSniper');
    spawnImpactFlash(target.x, target.y, 30);

    if (typeof fighter._clearTargetFreeze === 'function') fighter._clearTargetFreeze(target);

    if (!target.isTurret && !target.cannotBeKnockbacked) {
      target.isFirstHitKnockback = isAmbushThrust;
      const pushAngle = isAmbushThrust ? Math.atan2(target.y - fighter.y, target.x - fighter.x) : attackAngle;
      const knockbackSpeed = isAmbushThrust ? (cfg.ambushSpearThrustKnockback || 8.5) : (isStep2 ? (cfg.hit2Knockback || 4.5) : (cfg.hit1Knockback || 2.2));
      
      const kbVx = Math.cos(pushAngle) * knockbackSpeed;
      const kbVy = Math.sin(pushAngle) * knockbackSpeed;
      target.knockbackDecay = isAmbushThrust ? 0.85 : 0.84;
      if (typeof target.applyKnockback === 'function') {
        target.applyKnockback(kbVx, kbVy);
      } else if (!target.immuneToPush && !target.immuneToKnockback && target.characterId !== 'escanor') {
        target.knockbackVx = kbVx;
        target.knockbackVy = kbVy;
        target.vx = kbVx;
        target.vy = kbVy;
      }
    }

    if (isAmbushThrust && target && target.hp > 0 && !target.isDead && !target.isRevivingFromContract && !target.isShatterReviving && typeof target.applyHitStun === 'function') {
      target.applyHitStun(18);
    } else if (target && target.hp > 0 && typeof target.applyTimeStop === 'function' && hitPause > 0) {
      target.applyTimeStop(hitPause);
    }

    // Apply Slow Movement debuff to target on basic attack hit
    if (target && target.hp > 0 && !target.isDead && !target.isRevivingFromContract && !target.isShatterReviving) {
      const slowFrames = cfg.spearSlowDuration ?? 90;
      const slowMultiplier = cfg.spearSlowMultiplier ?? 0.50;
      if (typeof target.applySlow === 'function') {
        target.applySlow(slowFrames, slowMultiplier);
      } else if (target.statusEffects && typeof target.statusEffects.applySlow === 'function') {
        target.statusEffects.applySlow(slowFrames, slowMultiplier);
      } else {
        target.slowTimer = Math.max(target.slowTimer || 0, slowFrames);
        target.slowMultiplier = slowMultiplier;
      }
    }

    // Apply Decrease Regen debuff to target on basic attack hit
    const regenDebuffFrames = cfg.regenDebuffDuration ?? 300;
    target.tojiRegenDebuffTimer = Math.max(target.tojiRegenDebuffTimer || 0, regenDebuffFrames);
    const now = Date.now();
    if (!target._lastTojiDebuffAppliedTime || now - target._lastTojiDebuffAppliedTime > 800) {
      spawnFloatingText(target.x, target.y - target.r - 20, 'SLOWED & REGEN DECREASED!', '#C084FC');
      target._lastTojiDebuffAppliedTime = now;
    }

    if (isAmbushThrust) {
      spawnCrimsonLightningImpact(target.x, target.y, 110);
      spawnSparks(target.x, target.y, 40, 'crimsonSniper');
    }
  }

  fighter.ambushTargetWasChanneling = false;
  fighter.ambushTargetChannelState = null;
  return Array.from(targets);
}

export function performInvertedSpearStrike(fighter, primaryTarget, ownerIndex, isAmbushThrust = false) {
  if (isAmbushThrust && !fighter.isSkillEnabled(CONFIG.toji?.enableAmbush, true)) return [];
  if (!isAmbushThrust && !fighter.isSkillEnabled(CONFIG.toji?.enableSpear, true)) return [];
  if (!fighter.canPerformBasicAttack()) return [];
  fighter.spearCooldown = fighter.spearCooldownMax;
  fighter.isAmbushThrust = isAmbushThrust;
  fighter.spearHitDelivered = false;
  fighter.spearSwingTarget = primaryTarget;
  fighter.spearSwingOwnerIndex = ownerIndex;

  if (primaryTarget && primaryTarget !== fighter) {
    const dx = primaryTarget.x - fighter.x;
    const dy = primaryTarget.y - fighter.y;
    if (Math.hypot(dx, dy) > 0.001) {
      fighter.gunAngle = Math.atan2(dy, dx);
      fighter.angle = fighter.gunAngle;
    }
  }
  const attackAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  fighter.spearCastAngle = attackAngle;
  fighter._slashStartAngle = attackAngle;
  fighter._slashStartFlipSign = Math.abs(Math.atan2(Math.sin(attackAngle), Math.cos(attackAngle))) > Math.PI / 2 ? -1 : 1;
  fighter._slashOriginX = fighter.x;
  fighter._slashOriginY = fighter.y;
  fighter._lastSpearTimer = 0;

  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.toji) ? CONFIG.toji : {};

  if (!isAmbushThrust) {
    if ((fighter.spearComboResetTimer || 0) <= 0) {
      fighter.spearComboStep = 1;
    } else {
      fighter.spearComboStep = (fighter.spearComboStep === 1) ? 2 : 1;
    }
    fighter.spearComboResetTimer = cfg.spearComboResetFrames || 60;
  }

  const isStep2 = (fighter.spearComboStep === 2) && !isAmbushThrust;
  const speedMult = TOJI_WEAPON_CONFIG?.spearSwingAnimSpeed || 1.0;
  const liftF = isStep2 ? (cfg.hit2LiftFrames ?? 3) : (cfg.hit1LiftFrames ?? 4);
  const holdF = isStep2 ? (cfg.hit2HoldFrames ?? 1) : (cfg.hit1HoldFrames ?? 1);
  const strikeF = isStep2 ? (cfg.hit2StrikeFrames ?? 5) : (cfg.hit1StrikeFrames ?? 4);
  const lockF = isStep2 ? (cfg.hit2ImpactLockFrames ?? 5) : (cfg.hit1ImpactLockFrames ?? 4);
  const recF = isStep2 ? (cfg.hit2RecoveryFrames ?? 7) : (cfg.hit1RecoveryFrames ?? 5);
  const baseSwingFrames = Math.max(1, liftF + holdF + strikeF + lockF + recF);
  fighter.spearSwingMax = Math.round((isAmbushThrust ? 36 : baseSwingFrames) / speedMult);
  fighter.spearSwingTimer = fighter.spearSwingMax;

  if (isAmbushThrust) {
    audioSystem.playSFX('attack_swordswing', 0.85);
    audioSystem.playSFX('skill_backstab', 0.85);
    return deliverInvertedSpearImpact(fighter, primaryTarget, ownerIndex, true);
  } else {
    // Phase 1 anticipation coil swoosh
    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        if (isStep2) {
          audioSystem.playSFX('attack_swordswing', 0.40);
        } else {
          audioSystem.playSFX('skill_dash1', 0.35);
        }
      }
    } catch (e) {}
    return [];
  }
}
