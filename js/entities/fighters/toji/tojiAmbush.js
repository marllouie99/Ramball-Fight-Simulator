// ─────────────────────────────────────────────
// TOJI FUSHIGURO AMBUSH SEQUENCE MODULE
// Handles the 3-stage ambush sequence (Front Launch -> Back Charge/Stab -> Katana Flurry)
// ─────────────────────────────────────────────
import { applyDamageToTarget } from '../../fighter.js';
import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { spawnSparks, spawnImpactFlash, spawnCrimsonLightningImpact, spawnMeleeClashShockwave } from '../../../graphics/particles/sparkEffect.js';
import { getSkillEffectSound } from '../../../soundEffects/skillEffectSounds.js';
import { fastCleanArray, pushTrailCap } from '../../../graphics/particles/visualTrailSystem.js';
import { tojiGetTargetsInFrontalArc } from './tojiWeapons.js';

export function tojiIsTargetDeadOrRemoved(fighter, target) {
  if (!target) return true;

  // Demo preview uses a fake target which is not in the state list
  if (fighter && fighter.isDemoFighter) {
    return target.hp <= 0;
  }

  // 1. Basic properties
  if (target.hp <= 0 || target.isDead || target._hasDied) return true;

  // 2. Special case for Yuta's Rika
  if (target.isRika) {
    if (!target.active || target.isDying || target.disappearing) return true;
  }

  // 3. Check if target is still in the active state lists
  if (typeof state !== 'undefined') {
    const inFighters = state.fighters && state.fighters.includes(target);
    const inIllusions = state.illusions && state.illusions.includes(target);
    if (!inFighters && !inIllusions) {
      return true;
    }
  }

  return false;
}

export function modSpawnTeleportAfterimages(fighter, fromX, fromY, toX, toY, startAngle, endAngle) {
  if (!fighter.stealthAfterimages) fighter.stealthAfterimages = [];

  spawnImpactFlash(fromX, fromY, 40, '#A040FF');

  spawnImpactFlash(toX, toY, 50, '#A040FF');
  spawnSparks(toX, toY, 8, 'crimsonSniper');

  const strikeSound = getSkillEffectSound('toji', 'strike');
  if (strikeSound) {
    audioSystem.playSFX(strikeSound.src, strikeSound.volume);
  } else {
    audioSystem.playSFX('skill_dash5', 1.0);
  }

  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = fromX + (toX - fromX) * t;
    const y = fromY + (toY - fromY) * t;
    const angle = startAngle + (endAngle - startAngle) * t;
    const maxTimer = 22 - Math.floor(t * 4);

    pushTrailCap(fighter.stealthAfterimages, {
      x: x,
      y: y,
      angle: angle,
      maxTimer: maxTimer,
      timer: maxTimer,
      initialAlpha: 0.85 - t * 0.15,
      fromX: fromX,
      fromY: fromY,
      toX: toX,
      toY: toY,
      progress: t,
      isDomainAfterimage: fighter.ultimateActive || fighter.isChannelingDomain
    }, 30);
  }
}

export function modStartAmbushSequence(fighter, opponent, isInterrupt = false) {
  if (tojiIsTargetDeadOrRemoved(fighter, opponent)) return;

  fighter.isAmbushing = true;
  fighter.ambushTarget = opponent;
  fighter.ambushPhase = 'FRONT_LAUNCH';
  fighter.ambushTimer = isInterrupt ? 4 : (CONFIG.toji?.ambushFirstTeleportFrames ?? CONFIG.toji?.ambushFrontPauseDuration ?? 18);
  fighter.katanaSlashTimer = 0;
  fighter.katanaSlashFadeTimer = 0;
  fighter._secondSeqAudioPlayed = false;

  opponent.isTargetOfAmbush = true;
  if (typeof opponent.interruptAttacks === 'function') {
    opponent.interruptAttacks();
  }
  opponent.slashSwingTimer = 0;
  opponent.katanaSlashTimer = 0;
  opponent.katanaSlashFadeTimer = 0;
  opponent.punchAnimTimer = 0;
  opponent.flurryHitsLeft = 0;
  opponent.flurrySlashTimer = 0;
  opponent.rapidSlashHitsLeft = 0;
  opponent.thinIceBreakerPunchTimer = 0;
  opponent.isChannelingThinIceBreaker = false;
  if (opponent.swordTrail) opponent.swordTrail.length = 0;
  if (opponent.afterImages) opponent.afterImages.length = 0;
  if (opponent.hitFlameWisps) opponent.hitFlameWisps.length = 0;
  if (opponent.punchEffects) opponent.punchEffects.length = 0;
  if (opponent.slashHitVisuals) opponent.slashHitVisuals.length = 0;

  if (!opponent.domainActive) {
    opponent.vx = 0;
    opponent.vy = 0;
  }

  fighter.ambushTargetChannelState = {
    purple: !!opponent.isChannelingPurple,
    domain: !!(opponent.isChannelingDomainExpansion || opponent.isChannelingDomain),
    rct: !!opponent.isChannelingRCT,
    divineFlame: !!opponent.isChannelingDivineFlame,
    storm: !!opponent.isChannelingStorm,
    generic: !!opponent.isChanneling
  };
  fighter.ambushTargetWasChanneling = !!(
    fighter.ambushTargetChannelState.purple ||
    fighter.ambushTargetChannelState.domain ||
    fighter.ambushTargetChannelState.rct ||
    fighter.ambushTargetChannelState.divineFlame ||
    fighter.ambushTargetChannelState.storm ||
    fighter.ambushTargetChannelState.generic
  );

  const oldX = fighter.x;
  const oldY = fighter.y;
  const startAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  const targetAngle = opponent.gunAngle !== undefined ? opponent.gunAngle : (opponent.angle || 0);
  const offsetDist = opponent.r + fighter.r + 18;

  const rawFrontX = opponent.x + Math.cos(targetAngle) * offsetDist;
  const rawFrontY = opponent.y + Math.sin(targetAngle) * offsetDist;
  const clampedFront = fighter._clampToArena(rawFrontX, rawFrontY);

  fighter.x = clampedFront.x;
  fighter.y = clampedFront.y;
  fighter.vx = 0;
  fighter.vy = 0;

  fighter.aim(opponent);

  const freezeDuration = CONFIG.toji?.ambushTargetFreezeDuration || 70;
  
  if (isInterrupt || fighter.ambushTargetWasChanneling) {
    spawnFloatingText(opponent.x, opponent.y - opponent.r - 35, 'INTERRUPTED!', '#FF1133', 35);
    spawnCrimsonLightningImpact(opponent.x, opponent.y, 90);
    spawnImpactFlash(opponent.x, opponent.y, 65, 'crimsonSniper');
  }
  if (typeof opponent.applyTimeStop === 'function') {
    opponent.applyTimeStop(freezeDuration);
  }
  opponent.vx = 0;
  opponent.vy = 0;

  modSpawnTeleportAfterimages(fighter, oldX, oldY, clampedFront.x, clampedFront.y, startAngle, fighter.gunAngle);

  spawnImpactFlash(oldX, oldY, 25, '#A040FF');
  spawnImpactFlash(fighter.x, fighter.y, 30, '#A040FF'); 
  const tpSound = getSkillEffectSound('toji', 'firstseqteleport');
  audioSystem.playSFX(tpSound?.src || 'Assets/Sound Effects/Skills/toji-firstseq-teleport.mp3', tpSound?.volume || 1.0, tpSound?.speed || 1.0, 0, tpSound?.delay || 0);
}

export function modUpdateAmbushSequence(fighter, opponent, ownerIndex) {
  if (fighter.mahoragaAdaptationFreezeTimer > 0) {
    fighter.vx = 0;
    fighter.vy = 0;
    return; // Freeze Toji mid-ambush 1-3 combo sequence during Mahoraga's wheel adaptation!
  }

  if (tojiIsTargetDeadOrRemoved(fighter, opponent) || !fighter.isAmbushing) {
    if (typeof state !== 'undefined') {
      if (state.fighters) state.fighters.forEach(f => { if (f) f.isTargetOfAmbush = false; });
      if (state.illusions) state.illusions.forEach(ill => { if (ill) ill.isTargetOfAmbush = false; });
    }
    fighter.isAmbushing = false;
    fighter.ambushTarget = null;
    fighter.ambushPhase = null;
    fighter.stealthCooldown = 0;
    fighter.katanaSlashTimer = 0;
    fighter.katanaSlashFadeTimer = 0;
    fighter._lastKatanaTimer = 0;
    fighter.slashSwingTimer = 0;
    if (fighter.swordTrail) fighter.swordTrail.length = 0;
    const angle = Math.random() * Math.PI * 2;
    fighter.vx = Math.cos(angle) * (fighter.speed || 3);
    fighter.vy = Math.sin(angle) * (fighter.speed || 3);
    fighter.normalizeSpeed();
    return;
  }

  // Target is frozen via isTargetOfAmbush, so we must manually process their knockback physics here!
  if (opponent.knockbackVx !== undefined && (Math.abs(opponent.knockbackVx) > 0.1 || Math.abs(opponent.knockbackVy) > 0.1)) {
    opponent.x += opponent.knockbackVx;
    opponent.y += opponent.knockbackVy;
    
    const arena = typeof CONFIG !== 'undefined' ? CONFIG.arena : null;
    if (arena) {
      let bounced = false;
      const bounceMult = opponent.isFirstHitKnockback ? 0.35 : 0.82;
      if (opponent.x - opponent.r < arena.x) { opponent.x = arena.x + opponent.r; opponent.knockbackVx = Math.abs(opponent.knockbackVx) * bounceMult; bounced = true; }
      if (opponent.x + opponent.r > arena.x + arena.width) { opponent.x = arena.x + arena.width - opponent.r; opponent.knockbackVx = -Math.abs(opponent.knockbackVx) * bounceMult; bounced = true; }
      if (opponent.y - opponent.r < arena.y) { opponent.y = arena.y + opponent.r; opponent.knockbackVy = Math.abs(opponent.knockbackVy) * bounceMult; bounced = true; }
      if (opponent.y + opponent.r > arena.y + arena.height) { opponent.y = arena.y + arena.height - opponent.r; opponent.knockbackVy = -Math.abs(opponent.knockbackVy) * bounceMult; bounced = true; }
    }
    
    const decay = opponent.knockbackDecay || 0.90;
    opponent.knockbackVx *= decay;
    opponent.knockbackVy *= decay;
    
    if (Math.abs(opponent.knockbackVx) <= 0.1) opponent.knockbackVx = 0;
    if (Math.abs(opponent.knockbackVy) <= 0.1) opponent.knockbackVy = 0;
  }

  opponent.isTargetOfAmbush = true;
  opponent.slashSwingTimer = 0;
  opponent.katanaSlashTimer = 0;
  opponent.katanaSlashFadeTimer = 0;
  opponent.punchAnimTimer = 0;
  opponent.flurryHitsLeft = 0;
  opponent.flurrySlashTimer = 0;
  opponent.rapidSlashHitsLeft = 0;
  opponent.thinIceBreakerPunchTimer = 0;
  opponent.isChannelingThinIceBreaker = false;

  if (fighter.stealthAfterimages && fighter.stealthAfterimages.length > 0) {
    fastCleanArray(fighter.stealthAfterimages, (img) => {
      if (!img) return false;
      img.timer--;
      const maxT = img.maxTimer || 12;
      const baseAlpha = img.initialAlpha !== undefined ? img.initialAlpha : 0.55;
      img.alpha = Math.max(0, (img.timer / maxT) * baseAlpha);
      return img.timer > 0;
    });
  }

  if (fighter.ambushPhase === 'FRONT_LAUNCH') {
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.aim(opponent);
    opponent.vx = 0;
    opponent.vy = 0;

    fighter.ambushTimer--;
    if (fighter.ambushTimer <= 0) {
      fighter.ambushPhase = 'BACK_CHARGE';
      fighter.ambushTimer = CONFIG.toji?.ambushBackChargeDuration || 30;

      const frontX = fighter.x;
      const frontY = fighter.y;
      const startAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);

      const targetAngle = opponent.gunAngle !== undefined ? opponent.gunAngle : (opponent.angle || 0);
      const offsetDist = opponent.r + fighter.r + 18;

      const rawBackX = opponent.x - Math.cos(targetAngle) * offsetDist;
      const rawBackY = opponent.y - Math.sin(targetAngle) * offsetDist;
      const clampedBack = fighter._clampToArena(rawBackX, rawBackY);

      // ── MAHORAGA ADAPTATION INTERCEPT: COUNTER-SHOUT ON BACK TELEPORT ──
      if ((opponent.characterId === 'mahoraga' || opponent.type === 'mahoraga') && 
          opponent.adaptedSkills && opponent.adaptedSkills['tojiAmbush']) {
        
        // Visual of Toji trying to teleport to the back
        modSpawnTeleportAfterimages(fighter, frontX, frontY, clampedBack.x, clampedBack.y, startAngle, fighter.gunAngle);
        
        fighter.x = clampedBack.x;
        fighter.y = clampedBack.y;
        fighter.vx = 0;
        fighter.vy = 0;
        fighter.aim(opponent);

        // Cancel ambush & put stealth on cooldown
        fighter.isAmbushing = false;
        fighter.ambushTimer = 0;
        fighter.stealthCooldown = fighter.stealthMaxCooldown || (CONFIG.toji?.stealthCooldownFrames || 600);
        fighter._hasAttemptedChannelInterrupt = true;
        
        opponent.isTargetOfAmbush = false;
        opponent.timeStopTimer = 0; // Unfreeze Mahoraga so he can roar!

        // Force Mahoraga to instantly execute a Divine Shout to blow Toji away
        spawnFloatingText(opponent.x, opponent.y - opponent.r - 45, 'ADAPTED!', '#FFD700', 45);
        if (typeof opponent._executeShout === 'function') {
          opponent._executeShout(fighter, opponent.owner);
        }
        return;
      }

      fighter.x = clampedBack.x;
      fighter.y = clampedBack.y;
      fighter.vx = 0;
      fighter.vy = 0;

      fighter.aim(opponent);

      modSpawnTeleportAfterimages(fighter, frontX, frontY, clampedBack.x, clampedBack.y, startAngle, fighter.gunAngle);

      spawnImpactFlash(frontX, frontY, 30, '#A040FF');
      spawnImpactFlash(clampedBack.x, clampedBack.y, 35, 'rgba(255, 30, 75, 0.8)');
      const strikeSound = getSkillEffectSound('toji', 'strike');
      if (strikeSound) audioSystem.playSFX(strikeSound.src, strikeSound.volume);
      audioSystem.playSFX('skill_backstab', 0.8);
    }
  } else if (fighter.ambushPhase === 'BACK_CHARGE') {
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.aim(opponent);

    if (!opponent.domainActive) {
      opponent.vx = 0;
      opponent.vy = 0;
    }

    if (Math.random() < 0.75) {
      const baseAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
      const tipX = fighter.x + Math.cos(baseAngle) * (fighter.r + 20);
      const tipY = fighter.y + Math.sin(baseAngle) * (fighter.r + 20);
      spawnSparks(tipX, tipY, 2, 'crimsonSniper');
      spawnSparks(tipX, tipY, 2, 'crimson');
    }
    if (fighter.ambushTimer % 4 === 0) {
      triggerGlobalScreenShake(1.5, 3);
    }

    fighter.ambushTimer--;
    if (fighter.ambushTimer <= 0) {
      fighter.ambushPhase = 'BACK_STAB';

      triggerGlobalScreenShake(4, 6);

      spawnImpactFlash(fighter.x, fighter.y, 110, 'rgba(255, 30, 75, 0.95)');
      spawnCrimsonLightningImpact(fighter.x, fighter.y, 80);
      spawnSparks(fighter.x, fighter.y, 25, 'crimsonSniper');
      spawnSparks(fighter.x, fighter.y, 20, 'crimson');

      const backthrustSound = getSkillEffectSound('toji', 'backthrust');
      audioSystem.playSFX(backthrustSound?.src || 'Assets/Sound Effects/Skills/toji-backthrust.mp3', backthrustSound?.volume || 1.2, backthrustSound?.speed || 1.0, 0, backthrustSound?.delay || 0);
      audioSystem.playSFX('attack_swordswing', 0.8);
      audioSystem.playSFX('attack_fleshhit', 0.8);

      fighter.performInvertedSpearStrike(opponent, ownerIndex, true);

      fighter.stealthTimer = fighter.stealthMaxDuration;
      fighter.stealthCooldown = 0;
      fighter.isStealthed = true;
      fighter.stealthActive = true;
    }
  } else if (fighter.ambushPhase === 'BACK_STAB') {
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.aim(opponent);

    if (fighter.spearSwingTimer <= 0) {
      fighter.ambushPhase = 'KATANA_DRAW';
      fighter.ambushTimer = 4;

      audioSystem.playSFX('attack_swordswing', 0.85);
      spawnImpactFlash(fighter.x, fighter.y, 45, '#E2E6EC');
      spawnSparks(fighter.x, fighter.y, 16, 'crimsonSniper');
    }
  } else if (fighter.ambushPhase === 'KATANA_DRAW') {
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.aim(opponent);

    fighter.ambushTimer--;
    if (fighter.ambushTimer <= 0) {
      fighter.ambushPhase = 'KATANA_CHASE';
      fighter.ambushTimer = 2; 
    }
  } else if (fighter.ambushPhase === 'KATANA_CHASE') {
    const oldX = fighter.x;
    const oldY = fighter.y;
    const oldAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);

    fighter.aim(opponent);
    const targetAngle = fighter.gunAngle;
    const offsetDist = opponent.r + fighter.r + 14;

    const rawChaseX = opponent.x - Math.cos(targetAngle) * offsetDist;
    const rawChaseY = opponent.y - Math.sin(targetAngle) * offsetDist;
    const clampedChase = fighter._clampToArena(rawChaseX, rawChaseY);

    fighter.x = clampedChase.x;
    fighter.y = clampedChase.y;
    fighter.vx = 0;
    fighter.vy = 0;

    const katanaFreeze = CONFIG.toji?.ambushKatanaFreezeDuration || 70;
    if (typeof opponent.applyTimeStop === 'function') {
      opponent.applyTimeStop(katanaFreeze);
    }
    if (!opponent.domainActive) {
      opponent.vx = 0;
      opponent.vy = 0;
    }

    modSpawnTeleportAfterimages(fighter, oldX, oldY, clampedChase.x, clampedChase.y, oldAngle, targetAngle);

    fighter.ambushTimer--;
    if (fighter.ambushTimer <= 0) {
      fighter.ambushPhase = 'KATANA_CHARGE';
      fighter.ambushTimer = CONFIG.toji?.ambushKatanaChargeDuration || 30;

      const strikeSound = getSkillEffectSound('toji', 'strike');
      if (strikeSound) audioSystem.playSFX(strikeSound.src, strikeSound.volume);
      spawnImpactFlash(fighter.x, fighter.y, 35, 'rgba(255, 30, 75, 0.8)');
    }
  } else if (fighter.ambushPhase === 'KATANA_CHARGE') {
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.aim(opponent);

    if (!opponent.domainActive) {
      opponent.vx = 0;
      opponent.vy = 0;
    }

    const secondSeqSound = getSkillEffectSound('toji', 'secondweaponattack');
    const soundDelay = secondSeqSound?.delay || 0;
    if (!fighter._secondSeqAudioPlayed && soundDelay < 0) {
      const advanceFrames = Math.round(Math.abs(soundDelay < -10 ? soundDelay / 1000 : soundDelay) * 60);
      if (fighter.ambushTimer <= advanceFrames) {
        fighter._secondSeqAudioPlayed = true;
        audioSystem.playSFX(secondSeqSound);
      }
    }

    if (Math.random() < 0.75) {
      const baseAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
      const tipX = fighter.x + Math.cos(baseAngle) * (fighter.r + 28);
      const tipY = fighter.y + Math.sin(baseAngle) * (fighter.r + 28);
      spawnSparks(tipX, tipY, 2, 'crimsonSniper');
      spawnSparks(tipX, tipY, 2, 'crimson');
    }
    if (fighter.ambushTimer % 4 === 0) {
      triggerGlobalScreenShake(1.5, 3);
    }

    fighter.ambushTimer--;
    if (fighter.ambushTimer <= 0) {
      fighter.ambushPhase = 'KATANA_SLASH';
      fighter.katanaSlashTimer = 22; 

      fighter.performSplitSoulKatanaSlash(opponent, ownerIndex);
    }
  } else if (fighter.ambushPhase === 'KATANA_SLASH') {
    fighter.vx = 0;
    fighter.vy = 0;

    fighter.katanaSlashTimer--;
    if (fighter.katanaSlashTimer <= 0) {
      fighter.katanaSlashTimer = 0;

      fighter.ambushPhase = 'PHANTOM_FLURRY';
      fighter.isAmbushThrust = false;
      fighter.phantomStrikeCount = 0;
      fighter.phantomMaxStrikes = CONFIG.toji?.ambushPhantomFlurryStrikes || 10;
      fighter.phantomStrikeTimer = 3; 


      fighter.phantomAngles = [
        Math.PI * 0.75,
        -Math.PI * 0.25,
        Math.PI * 0.25, 
        -Math.PI * 0.75,
        Math.PI * 0.75, 
        -Math.PI * 0.25,
      ];

      const totalFlurryFrames = fighter.phantomMaxStrikes * (CONFIG.toji?.ambushPhantomFlurryFrameRate || 8) + 10;
      if (typeof opponent.applyHitStun === 'function') opponent.applyHitStun(totalFlurryFrames);
      if (!opponent.domainActive) {
        opponent.vx = 0;
        opponent.vy = 0;
      }
    }
  } else if (fighter.ambushPhase === 'PHANTOM_FLURRY') {
    fighter.vx = 0;
    fighter.vy = 0;

    const flurryFrameRate = CONFIG.toji?.ambushPhantomFlurryFrameRate || 8;

    fighter.phantomStrikeTimer--;
    if (fighter.phantomStrikeTimer <= 0) {
      fighter.phantomStrikeCount++;
      fighter.phantomStrikeTimer = flurryFrameRate; 

      const maxStrikes = fighter.phantomMaxStrikes || 10;
      if (fighter.phantomStrikeCount <= maxStrikes) {
        const idx = (fighter.phantomStrikeCount - 1) % fighter.phantomAngles.length;
        const strikeAngle = fighter.phantomAngles[idx] + (Math.random() - 0.5) * 0.15;
        const flurryDist = CONFIG.toji?.ambushPhantomFlurryDistance ?? 8;
        const dist = opponent.r + fighter.r + flurryDist;

        const oldX = fighter.x;
        const oldY = fighter.y;
        const oldAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);

        const rawPhantomX = opponent.x + Math.cos(strikeAngle) * dist;
        const rawPhantomY = opponent.y + Math.sin(strikeAngle) * dist;
        const clampedPhantom = fighter._clampToArena(rawPhantomX, rawPhantomY);

        fighter.x = clampedPhantom.x;
        fighter.y = clampedPhantom.y;
        fighter.aim(opponent);

        delete fighter._smoothKatanaOffset;
        delete fighter._smoothKatanaThrust;
        delete fighter._smoothSpearOffset;
        delete fighter._smoothSpearThrust;

        modSpawnTeleportAfterimages(fighter, oldX, oldY, clampedPhantom.x, clampedPhantom.y, oldAngle, fighter.gunAngle);

        fighter.phantomSlashTimer = flurryFrameRate;
        fighter._flurryHitApplied = false;
        // Snapshot world-space position & aim angle for the slash visual so it stays
        // fixed at the strike location and does NOT follow Toji if he moves next frame.
        fighter._slashOriginX = fighter.x;
        fighter._slashOriginY = fighter.y;
        fighter._slashStartAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);

        audioSystem.playSFX('attack_swordswing', 1.1);
        const strikeSound = getSkillEffectSound('toji', 'strike');
        if (strikeSound) audioSystem.playSFX(strikeSound.src, strikeSound.volume * 0.7);
      } else {
        // Apply the big final knockback blast before releasing the target
        if (opponent && opponent.hp > 0 && !opponent.isTurret && !opponent.cannotBeKnockbacked) {
          const finalPushAngle = Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x);
          const finalRecoil = CONFIG.toji?.ambushFlurryFinalRecoil || 38;
          opponent.vx = Math.cos(finalPushAngle) * finalRecoil;
          opponent.vy = Math.sin(finalPushAngle) * finalRecoil;
          
          if (typeof opponent.applyKnockback === 'function') {
            opponent.applyKnockback(opponent.vx, opponent.vy);
          }
        }

        // Release ALL freeze effects so opponent can actually fly from the knockback
        if (opponent) {
          opponent.timeStopTimer = 0;
          opponent.hitStunTimer = 0;
          opponent._timeStopOriginalDuration = 0;
          opponent._timeStopStartTime = null;
        }

        opponent.isTargetOfAmbush = false; 
        const escapeAngle = Math.atan2(fighter.y - opponent.y, fighter.x - opponent.x) + (Math.random() - 0.5);
        fighter.vx = Math.cos(escapeAngle) * (fighter.speed || 3);
        fighter.vy = Math.sin(escapeAngle) * (fighter.speed || 3);
        fighter.normalizeSpeed();

        fighter.stealthTimer = CONFIG.toji?.stealthDuration || 240;
        fighter.stealthCooldown = 0;
        fighter.isStealthed = true;
        fighter.stealthActive = true;

        fighter.isAmbushing = false;
        fighter.ambushTarget = null;
        fighter.ambushPhase = null;
        fighter.katanaSlashTimer = 0;
        fighter.katanaSlashFadeTimer = 0;
        fighter._lastKatanaTimer = 0;
        fighter.slashSwingTimer = 0;
        if (fighter.swordTrail) fighter.swordTrail.length = 0;
        if (typeof state !== 'undefined') {
          if (state.fighters) state.fighters.forEach(f => { if (f) f.isTargetOfAmbush = false; });
          if (state.illusions) state.illusions.forEach(ill => { if (ill) ill.isTargetOfAmbush = false; });
        }
      }
    }

    if (fighter.ambushPhase === 'PHANTOM_FLURRY' && !fighter._flurryHitApplied && !tojiIsTargetDeadOrRemoved(fighter, opponent)) {
      const hitDelayFrame = Math.max(1, flurryFrameRate - 2);
      if (fighter.phantomStrikeTimer <= hitDelayFrame) {
        fighter._flurryHitApplied = true;

        const maxStrikes = fighter.phantomMaxStrikes || 6;
        const isFinalStrike = (fighter.phantomStrikeCount === maxStrikes);

        const attackAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
        const flurryTargets = tojiGetTargetsInFrontalArc(fighter, opponent, attackAngle, 65, Math.PI * 0.75);

        const strikeDmg = CONFIG.toji?.ambushPhantomFlurryDamage || 15;

        for (const target of flurryTargets) {
          applyDamageToTarget(target, strikeDmg, fighter, { isMelee: true, isTrueDamage: true, isAdaptableSkillShot: true, skillShotId: 'tojiAmbush' });
          target.hitFlashTimer = 8; 
          if (typeof target.applyHitStun === 'function') target.applyHitStun(flurryFrameRate + 2);

          delete target._timeStopFrozenAngle;
          delete target._timeStopFrozenGunAngle;
          const targetHitAngle = Math.atan2(fighter.y - target.y, fighter.x - target.x);
          let angleDiff = targetHitAngle - (target.angle || 0);
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          if (target.characterId !== 'mahoraga' && target.type !== 'mahoraga') {
            target.angle = (target.angle || 0) + angleDiff * 0.35;
          }
          target.gunAngle = target.angle;

          if (!target.isTurret && !target.cannotBeKnockbacked) {
            target.vx = 0;
            target.vy = 0;
            const pushAngle = Math.atan2(target.y - fighter.y, target.x - fighter.x);
            const recoilForce = isFinalStrike ? 38 : (4 + Math.random() * 2);
            target.vx = Math.cos(pushAngle) * recoilForce;
            target.vy = Math.sin(pushAngle) * recoilForce;
            if (typeof target.applyKnockback === 'function') target.applyKnockback(target.vx, target.vy);
          }
        }

        const contactX = (fighter.x + opponent.x) * 0.5;
        const contactY = (fighter.y + opponent.y) * 0.5;

        triggerGlobalScreenShake(isFinalStrike ? 8 : 4, isFinalStrike ? 8 : 4);
        spawnImpactFlash(contactX, contactY, isFinalStrike ? 75 : 40, '#E2E6EC');
        spawnSparks(contactX, contactY, isFinalStrike ? 12 : 5, 'crimsonSniper');
        
        if (isFinalStrike) {
           spawnCrimsonLightningImpact(contactX, contactY, 130);
           const finSound = getSkillEffectSound('toji', 'strike');
           if (finSound) audioSystem.playSFX(finSound.src, finSound.volume || 1.0);
           audioSystem.playSFX('attack_swordswing', 0.9);
        }
      }
    }
  }
}
