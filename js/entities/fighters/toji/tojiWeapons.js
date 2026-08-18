// ─────────────────────────────────────────────
// TOJI FUSHIGURO WEAPONS MODULE
// Encapsulates Inverted Spear of Heaven, Split Soul Katana, and Chain Physics
// ─────────────────────────────────────────────
import { applyDamageToTarget } from '../../fighter.js';
import { CONFIG } from '../../../core/config.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { spawnSparks, spawnImpactFlash, spawnCrimsonLightningImpact, spawnMeleeClashShockwave } from '../../../graphics/particles/sparkEffect.js';
import { TOJI_WEAPON_CONFIG } from '../../../graphics/weapons/tojiWeaponGraphics.js';
import { getSkillEffectSound } from '../../../soundEffects/skillEffectSounds.js';
import { state, triggerGlobalScreenShake } from '../../../core/state.js';

export function tojiGetTargetsInFrontalArc(fighter, primaryTarget, attackAngle, maxReach, arcAngle = Math.PI * 0.6) {
  const targets = new Set();
  if (primaryTarget && primaryTarget.hp > 0) {
    targets.add(primaryTarget);
  }

  if (typeof state === 'undefined') return Array.from(targets);

  const halfArc = arcAngle * 0.5;
  const fighterTeam = (typeof state.getFighterTeam === 'function' && state.fighters) 
    ? state.getFighterTeam(state.fighters.indexOf(fighter)) 
    : null;

  if (state.fighters) {
    for (const other of state.fighters) {
      if (!other || other === fighter || other.hp <= 0) continue;
      
      if (fighterTeam !== null && typeof state.getFighterTeam === 'function') {
        const otherIndex = state.fighters.indexOf(other);
        if (otherIndex >= 0 && state.getFighterTeam(otherIndex) === fighterTeam) continue;
      }

      const dx = other.x - fighter.x;
      const dy = other.y - fighter.y;
      const dist = Math.hypot(dx, dy);
      const attackReach = fighter.r + (other.r || 20) + maxReach;

      if (dist <= attackReach) {
        const angleToOther = Math.atan2(dy, dx);
        let diff = angleToOther - attackAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        if (Math.abs(diff) <= halfArc) {
          targets.add(other);
        }
      }
    }
  }

  if (state.illusions) {
    for (const ill of state.illusions) {
      if (!ill || ill === fighter || ill.hp <= 0 || ill.owner === fighter) continue;

      const dx = ill.x - fighter.x;
      const dy = ill.y - fighter.y;
      const dist = Math.hypot(dx, dy);
      const attackReach = fighter.r + (ill.r || 20) + maxReach;

      if (dist <= attackReach) {
        const angleToOther = Math.atan2(dy, dx);
        let diff = angleToOther - attackAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        if (Math.abs(diff) <= halfArc) {
          targets.add(ill);
        }
      }
    }
  }

  return Array.from(targets);
}

export function initChainPhysics(fighter) {
  fighter.chainNodes = [];
  const baseAngle = (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0)) + 0.42;
  const ringX = (fighter.x || 0) + Math.cos(baseAngle) * ((fighter.r || 25) - 4);
  const ringY = (fighter.y || 0) + Math.sin(baseAngle) * ((fighter.r || 25) - 4);

  for (let i = 0; i < 9; i++) {
    fighter.chainNodes.push({
      x: ringX - i * 4,
      y: ringY + i * 5,
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
  const isAttacking = fighter.spearSwingTimer > 0;

  let offsetAngle = 0.42;
  let thrustDistance = 0;

  if (isAttacking) {
    const t = 1 - (fighter.spearSwingTimer / 15);
    if (t < 0.25) {
      const p = t / 0.25;
      thrustDistance = -6 * p;
      offsetAngle = 0.42 + 0.15 * p;
    } else if (t < 0.65) {
      const p = (t - 0.25) / 0.4;
      thrustDistance = -6 + 32 * Math.sin(p * Math.PI);
      offsetAngle = 0.57 - 0.9 * Math.sin(p * Math.PI * 0.5);
    } else {
      const p = (t - 0.65) / 0.35;
      thrustDistance = 6 * (1 - p);
      offsetAngle = -0.33 + (0.42 - (-0.33)) * p;
    }
  } else {
    offsetAngle += Math.sin(Date.now() / 250) * 0.05;
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
      const hangAngle = renderAngle + Math.PI * (0.45 + i * 0.12);
      const node = fighter.chainNodes[i];
      const tx = ringX + Math.cos(hangAngle) * (i * linkDist * 0.75);
      const ty = ringY + Math.sin(hangAngle) * (i * linkDist * 0.75) + (i * 1.2);
      
      node.x += (tx - node.x) * 0.35;
      node.y += (ty - node.y) * 0.35;
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
  if (!fighter._secondSeqAudioPlayed) {
    const secondSeqSound = getSkillEffectSound('toji', 'secondweaponattack');
    audioSystem.playSFX(secondSeqSound);
  }
  fighter._secondSeqAudioPlayed = false;
  audioSystem.playSFX('attack_swordswing', 1.0);
  audioSystem.playSFX('attack_fleshhit', 1.2);

  const attackAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  const reach = CONFIG.toji?.katanaRange || fighter.katanaRange || 75;
  // Wide 160 degree frontal arc cleave for Katana!
  const targets = tojiGetTargetsInFrontalArc(fighter, primaryTarget, attackAngle, reach, Math.PI * 0.88);

  const damage = CONFIG.toji?.katanaDamage || 35;
  const soulWoundDuration = CONFIG.toji?.soulWoundDuration || 180;

  for (const target of targets) {
    applyDamageToTarget(target, damage, fighter, { isMelee: true, isTrueDamage: true, isSoulSplit: true, isAdaptableSkillShot: !!fighter.isAmbushing, skillShotId: fighter.isAmbushing ? 'tojiAmbush' : null });
    target.soulWoundTimer = soulWoundDuration;

    if (typeof target.applySlow === 'function') {
      const slowDur = CONFIG.toji?.katanaSlowDuration || 90;
      const slowMult = CONFIG.toji?.katanaSlowMultiplier ?? 0.40;
      target.applySlow(slowDur, slowMult);
    } else {
      target.slowTimer = CONFIG.toji?.katanaSlowDuration || 90;
      target.slowMultiplier = CONFIG.toji?.katanaSlowMultiplier ?? 0.40;
    }

    if (typeof fighter._clearTargetFreeze === 'function') fighter._clearTargetFreeze(target);
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
      const sweepSlingAngle = directAngle + 1.15;
      const knockbackForce = (CONFIG.toji?.ambushKnockbackForce || 48) * 0.95;

      const kbVx = Math.cos(sweepSlingAngle) * knockbackForce;
      const kbVy = Math.sin(sweepSlingAngle) * knockbackForce;
      target.vx = kbVx;
      target.vy = kbVy;
      target.knockbackDecay = 0.90;
      if (typeof target.applyKnockback === 'function') target.applyKnockback(kbVx, kbVy);
    }

    spawnImpactFlash(target.x, target.y, 180, 'rgba(255, 30, 75, 0.95)');
    spawnCrimsonLightningImpact(target.x, target.y, 140);
    spawnSparks(target.x, target.y, 50, 'crimsonSniper');
  }

  triggerGlobalScreenShake(8, 10);
}

export function performInvertedSpearStrike(fighter, primaryTarget, ownerIndex, isAmbushThrust = false) {
  if (!fighter.canPerformBasicAttack()) return;
  fighter.spearCooldown = fighter.spearCooldownMax;
  fighter.isAmbushThrust = isAmbushThrust;
  const speedMult = TOJI_WEAPON_CONFIG?.spearSwingAnimSpeed || 1.0;
  fighter.spearSwingMax = Math.round((isAmbushThrust ? 36 : 26) / speedMult);
  fighter.spearSwingTimer = fighter.spearSwingMax;

  audioSystem.playSFX('attack_swordswing', 0.85);
  audioSystem.playSFX('skill_backstab', 0.85);

  const attackAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  const reach = CONFIG.toji?.spearRange || fighter.spearRange || 50;
  // 120 degree frontal arc cone for Inverted Spear thrust/stab!
  const targets = tojiGetTargetsInFrontalArc(fighter, primaryTarget, attackAngle, reach, Math.PI * 0.67);

  const thrustDamage = isAmbushThrust ? (CONFIG.toji?.ambushBackThrustDamage ?? 50) : fighter.spearDamage;

  for (const target of targets) {
    let wasInfinityActive = false;
    if (target.characterId === 'gojo' && target.infinityActive) {
      wasInfinityActive = true;
      target.infinityActive = false;
      target.infinityBlockTimer = 0;
      if (isAmbushThrust) {
        spawnSparks(target.x, target.y, 22, 'lightningTrail', '#00E5FF');
        spawnImpactFlash(target.x, target.y, 60, 'lightningTrail');
      }
    }

    applyDamageToTarget(target, thrustDamage, fighter, { isMelee: true, isTrueDamage: true, isIsoh: true, isAdaptableSkillShot: !!fighter.isAmbushing, skillShotId: fighter.isAmbushing ? 'tojiAmbush' : null });

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

    if (wasInfinityActive) {
      target.infinityActive = true;
    }

    const chanState = fighter.ambushTargetChannelState || {};
    const wasPurple = target.isChannelingPurple || chanState.purple;
    const wasDomain = target.isChannelingDomainExpansion || target.isChannelingDomain || chanState.domain;
    const wasRCT = target.isChannelingRCT || chanState.rct;
    const wasDivineFlame = target.isChannelingDivineFlame || chanState.divineFlame;
    const wasStorm = target.isChannelingStorm || chanState.storm;
    const wasGeneric = target.isChanneling || chanState.generic;

    const wasChanneling = isAmbushThrust && (fighter.ambushTargetWasChanneling || wasPurple || wasDomain || wasRCT || wasDivineFlame || wasStorm || wasGeneric);

    if (wasChanneling) {
      const silenceFrames = CONFIG.toji?.silenceDuration || 180;
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
      target.isChanneling = false;
      target.channelTimer = 0;

      if (wasPurple && target.purpleCooldown !== undefined) target.purpleCooldown = (CONFIG.gojo?.purpleCooldown || 800) / 2;
      if (wasDomain && target.domainCooldown !== undefined && !target.domainActive) target.domainCooldown = (CONFIG.gojo?.domainCooldown || CONFIG.sukuna?.domainCooldown || CONFIG.yuta?.domainCooldown || 1500) / 2;
      if (wasRCT && target.rctCooldown !== undefined) target.rctCooldown = (CONFIG.yuta?.rctCooldown || 600) / 2;
      if (wasDivineFlame && target.divineFlameCooldown !== undefined) target.divineFlameCooldown = (CONFIG.sukuna?.divineFlameCooldown || 900) / 2;
      if (wasStorm && target.stormCooldown !== undefined) target.stormCooldown = (CONFIG.zeus?.stormCooldown || 900) / 2;
      if (wasGeneric && typeof target.ultimateCooldown === 'number' && !target.ultimateActive) target.ultimateCooldown = (target.ultimateCooldownMax || 900) / 2;

      spawnSparks(target.x, target.y, 18, '#A078C8');
      spawnImpactFlash(target.x, target.y, 45, 'rgba(160, 30, 240, 0.9)');
    }

    spawnSparks(target.x, target.y, '#A078C8', 12);
    spawnSparks(target.x, target.y, '#FF3355', 10);
    spawnSparks(target.x, target.y, 12, 'crimsonSniper');
    spawnImpactFlash(target.x, target.y, 30);

    if (isAmbushThrust) {
      if (typeof fighter._clearTargetFreeze === 'function') fighter._clearTargetFreeze(target);
      if (!target.isTurret && !target.cannotBeKnockbacked) {
        target.isFirstHitKnockback = true;
        const pushAngle = Math.atan2(target.y - fighter.y, target.x - fighter.x);
        const knockbackSpeed = CONFIG.toji?.ambushSpearThrustKnockback || 28;
        
        const kbVx = Math.cos(pushAngle) * knockbackSpeed;
        const kbVy = Math.sin(pushAngle) * knockbackSpeed;
        target.vx = kbVx;
        target.vy = kbVy;
        target.knockbackDecay = 0.84;
        if (typeof target.applyKnockback === 'function') target.applyKnockback(kbVx, kbVy);
      }

      spawnCrimsonLightningImpact(target.x, target.y, 110);
      spawnSparks(target.x, target.y, 40, 'crimsonSniper');
    }
  }

  fighter.ambushTargetWasChanneling = false;
  fighter.ambushTargetChannelState = null;
  triggerGlobalScreenShake(isAmbushThrust ? 6 : 3, isAmbushThrust ? 8 : 4);
}
