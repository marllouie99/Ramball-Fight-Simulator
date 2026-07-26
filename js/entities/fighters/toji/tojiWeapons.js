// ─────────────────────────────────────────────
// TOJI FUSHIGURO WEAPONS MODULE
// Encapsulates Inverted Spear of Heaven, Split Soul Katana, and Chain Physics
// ─────────────────────────────────────────────
import { applyDamageToTarget } from '../../fighter.js';
import { CONFIG } from '../../../core/config.js';
import { playSound } from '../../../systems/soundSystem.js';
import { spawnSparks, spawnImpactFlash, spawnCrimsonLightningImpact, spawnMeleeClashShockwave } from '../../../graphics/particles/sparkEffect.js';
import { TOJI_WEAPON_CONFIG } from '../../../graphics/weapons/tojiWeaponGraphics.js';
import { getSkillEffectSound } from '../../../soundEffects/skillEffectSounds.js';
import { triggerGlobalScreenShake } from '../../../core/state.js';

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

export function performSplitSoulKatanaSlash(fighter, target, ownerIndex) {
  if (!fighter._secondSeqAudioPlayed) {
    const secondSeqSound = getSkillEffectSound('toji', 'secondweaponattack');
    playSound(secondSeqSound);
  }
  fighter._secondSeqAudioPlayed = false;
  playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 1.0);
  playSound('Assets/Sound Effects/Attacks/fleshhit.mp3', 1.2);

  const damage = CONFIG.toji?.katanaDamage || 35;
  applyDamageToTarget(target, damage, fighter, { isMelee: true, isTrueDamage: true });

  const soulWoundDuration = CONFIG.toji?.soulWoundDuration || 180;
  target.soulWoundTimer = soulWoundDuration;

  if (typeof target.applySlow === 'function') {
    target.applySlow(90, 0.40);
  } else {
    target.slowTimer = 90;
    target.slowMultiplier = 0.40;
  }

  if (typeof fighter._clearTargetFreeze === 'function') fighter._clearTargetFreeze(target);
  const targetHitAngle = Math.atan2(fighter.y - target.y, fighter.x - target.x);
  let angleDiff = targetHitAngle - (target.angle || 0);
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  target.angle = (target.angle || 0) + angleDiff * 0.40;
  target.gunAngle = target.angle;

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

  triggerGlobalScreenShake(8, 10);
  spawnImpactFlash(target.x, target.y, 180, 'rgba(255, 30, 75, 0.95)');
  spawnMeleeClashShockwave(target.x, target.y, 240, 'yuta');
  spawnMeleeClashShockwave(target.x, target.y, 180, 'yuta');
  spawnCrimsonLightningImpact(target.x, target.y, 140);
  spawnSparks(target.x, target.y, 50, 'crimsonSniper');
}

export function performInvertedSpearStrike(fighter, target, ownerIndex, isAmbushThrust = false) {
  fighter.spearCooldown = fighter.spearCooldownMax;
  fighter.isAmbushThrust = isAmbushThrust;
  const speedMult = TOJI_WEAPON_CONFIG?.spearSwingAnimSpeed || 1.0;
  fighter.spearSwingMax = Math.round((isAmbushThrust ? 36 : 26) / speedMult);
  fighter.spearSwingTimer = fighter.spearSwingMax;

  playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 0.85);
  playSound('Assets/Sound Effects/Skills/backstab.mp3', 0.85);

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

  const thrustDamage = isAmbushThrust ? (CONFIG.toji?.ambushBackThrustDamage ?? 25) : fighter.spearDamage;
  applyDamageToTarget(target, thrustDamage, fighter, { isMelee: true, isTrueDamage: true });

  delete target._timeStopFrozenAngle;
  delete target._timeStopFrozenGunAngle;
  const targetHitAngle = Math.atan2(fighter.y - target.y, fighter.x - target.x);
  let angleDiff = targetHitAngle - (target.angle || 0);
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  target.angle = (target.angle || 0) + angleDiff * 0.40;
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
  fighter.ambushTargetWasChanneling = false;
  fighter.ambushTargetChannelState = null;

  if (wasChanneling) {
    const silenceFrames = CONFIG.toji?.silenceDuration || 90;
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
  
  triggerGlobalScreenShake(isAmbushThrust ? 6 : 3, isAmbushThrust ? 8 : 4);
  spawnSparks(target.x, target.y, '#A078C8', 12);
  spawnSparks(target.x, target.y, '#FF3355', 10);
  spawnSparks(target.x, target.y, 12, 'crimsonSniper');
  spawnImpactFlash(target.x, target.y, 30);

  if (isAmbushThrust) {
    if (typeof fighter._clearTargetFreeze === 'function') fighter._clearTargetFreeze(target);
    target.isFirstHitKnockback = true;
    const pushAngle = Math.atan2(target.y - fighter.y, target.x - fighter.x);
    const knockbackSpeed = 28;
    
    const kbVx = Math.cos(pushAngle) * knockbackSpeed;
    const kbVy = Math.sin(pushAngle) * knockbackSpeed;
    target.vx = kbVx;
    target.vy = kbVy;
    target.knockbackDecay = 0.84;
    if (typeof target.applyKnockback === 'function') target.applyKnockback(kbVx, kbVy);

    spawnMeleeClashShockwave(target.x, target.y, 190, 'yuta');
    spawnCrimsonLightningImpact(target.x, target.y, 110);
    spawnMeleeClashShockwave(target.x, target.y, 140, 'yuta');
    spawnSparks(target.x, target.y, 40, 'crimsonSniper');
  }
}
