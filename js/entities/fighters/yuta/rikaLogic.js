import { stopSound, stopSoundBySrc, fadeOutSound, fadeOutSoundBySrc } from '../../../systems/soundSystem.js';
import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake, isChampionScreenActive } from '../../../core/state.js';
import { spawnSparks, spawnImpactFlash, spawnRikaRoarShockwave } from '../../../graphics/particles/sparkEffect.js';
import { spawnDeathShatter } from '../../../graphics/particles/deathShatterEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { getSkillSound } from '../../../soundEffects/skillSounds.js';
import { getSkillEffectSound } from '../../../soundEffects/skillEffectSounds.js';

export function triggerRikaDeathShatter(rk, fighter) {
  if (!rk) return;
  const owner = fighter || rk.owner;

  // 1. Immediately cut off all Rika audio
  stopRikaAudio(owner, rk);

  // 2. Play shatter breaking audio
  const deathSnd = CONFIG.yuta?.rikaDeathSound || 'Assets/Sound Effects/Skills/thin-ice-breaker.mp3';
  const deathVol = CONFIG.yuta?.rikaDeathVolume ?? 1.0;
  const deathDelay = CONFIG.yuta?.rikaDeathDelay ?? 0;
  if (deathSnd && typeof audioSystem !== 'undefined') {
    audioSystem.playSFX(deathSnd, deathVol, 1.0, 0, deathDelay);
  }

  // 3. Spawn physical death shatter particle shards (bone white, cursed pink, dark abyss)
  if (typeof spawnDeathShatter === 'function') {
    spawnDeathShatter(rk);
  }

  // 4. Vengeful Death Dispersion Damage & Knockback
  if (typeof state !== 'undefined' && state.fighters && owner) {
    const myTeam = state.getFighterTeam(state.fighters.indexOf(owner));
    const damageGain = Math.max(0, (owner.damage || 0) - (CONFIG.yuta?.damage || 15));
    const dispersionRadius = CONFIG.yuta?.rikaDeathExplosionRadius || 280;
    const dispersionDamage = (CONFIG.yuta?.rikaDeathExplosionDamage || 35) + damageGain;
    const dispersionKnockback = CONFIG.yuta?.rikaDeathExplosionKnockback || 10;
    const dispersionHitStun = CONFIG.yuta?.rikaDeathExplosionHitStun || 20;

    state.fighters.forEach((enemy, idx) => {
      if (enemy && enemy !== owner && enemy.hp > 0) {
        const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
        if (isEnemy) {
          const dx = enemy.x - rk.x;
          const dy = enemy.y - rk.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist <= dispersionRadius) {
            enemy.takeDamage(dispersionDamage, owner, { isPhysical: true, isExplosion: true, isRikaAttack: true });
            if (typeof enemy.applyHitStun === 'function') enemy.applyHitStun(dispersionHitStun);
            enemy.vx += (dx / dist) * dispersionKnockback;
            enemy.vy += (dy / dist) * dispersionKnockback;
            if (typeof spawnFloatingText === 'function') spawnFloatingText(enemy.x, enemy.y - 30, 'CURSED DISPERSION!', '#FF0055');
          }
        }
      }
    });
  }

  // 5. Impact flashes, shockwave, sparks, and screen shake
  if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(12, 20);
  if (typeof spawnImpactFlash === 'function') {
    spawnImpactFlash(rk.x, rk.y, 50, 'dark');
    spawnImpactFlash(rk.x, rk.y, 30, 'crimsonSniper');
  }
  if (typeof spawnRikaRoarShockwave === 'function') spawnRikaRoarShockwave(rk.x, rk.y, 280);

  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const dispelSparks = isLowQuality ? 8 : 40;
  for (let i = 0; i < dispelSparks; i++) {
    spawnSparks(rk.x, rk.y, 1, 'rikaCurse');
    spawnSparks(rk.x, rk.y, 1, 'blood');
  }

  if (typeof spawnFloatingText === 'function') spawnFloatingText(rk.x, rk.y - 20, 'DISPELLED!', '#ff1a1a');

  // 6. Clean state and despawn instantly
  rk.active = false;
  rk.isDying = false;
  rk.disappearing = false;
  rk.deathTimer = 0;
  rk.hp = 0;
  rk.cooldownTimer = 0;
  rk.spawnScale = 0.05;
  rk.r = CONFIG.yuta.rikaRadius || 30;
  if (owner) {
    owner.rikaAlpha = 0;
    owner.rikaRechargeHpBaseline = owner.hp;
    if (owner.domainActive) {
      rk.killedInDomain = true;
    }
  }

  // Remove from global target arrays so AI immediately retargets
  if (typeof state !== 'undefined' && state.illusions) {
    const idx = state.illusions.indexOf(rk);
    if (idx >= 0) state.illusions.splice(idx, 1);
  }
}

export function stopRikaAudio(fighter, rk) {
  if (!fighter) return;
  const targetRk = rk || fighter.rika;

  // 1. Stop all specific audio handles on Yuta
  if (fighter.comeRikaSoundHandle) {
    stopSound(fighter.comeRikaSoundHandle);
    fighter.comeRikaSoundHandle = null;
  }
  if (fighter._pureLoveBeamChargeSoundHandle) {
    stopSound(fighter._pureLoveBeamChargeSoundHandle);
    fighter._pureLoveBeamChargeSoundHandle = null;
  }
  if (fighter.pureLoveBeamBgSoundHandle) {
    stopSound(fighter.pureLoveBeamBgSoundHandle);
    fighter.pureLoveBeamBgSoundHandle = null;
  }
  if (fighter.pureLoveBeamAudioHandle) {
    stopSound(fighter.pureLoveBeamAudioHandle);
    fighter.pureLoveBeamAudioHandle = null;
  }
  if (fighter.pureLoveBeamSoundHandle) {
    stopSound(fighter.pureLoveBeamSoundHandle);
    fighter.pureLoveBeamSoundHandle = null;
  }

  // 2. Stop audio handles on Rika
  if (targetRk) {
    if (targetRk.activeTrembleSound) {
      stopSound(targetRk.activeTrembleSound);
      targetRk.activeTrembleSound = null;
    }
    if (targetRk.activeRoarSound) {
      stopSound(targetRk.activeRoarSound);
      targetRk.activeRoarSound = null;
    }
    targetRk.trembleStopTimer = 0;
    targetRk.spawnTimer = 0;
    targetRk.chargeTimer = 0;
    targetRk.deathTimer = 0;
    targetRk.disappearTimer = 0;
    targetRk.attackTimer = 0;
    targetRk.rightArmTimer = 0;
    targetRk.leftArmTimer = 0;
  }

  // 3. Cut off all Rika and summon audio by source/name
  stopSoundBySrc('comerika');
  stopSoundBySrc('rikaappearance');
  stopSoundBySrc('rikaAppearance1');
  stopSoundBySrc('rikaAppearance');
  stopSoundBySrc('groundtremble');
  stopSoundBySrc('groundTremble');
  stopSoundBySrc('rikanoise1');
  stopSoundBySrc('rikanoise2');
  stopSoundBySrc('rikanoise3');
  stopSoundBySrc('rikanoise');
  stopSoundBySrc('groundsmash');
  stopSoundBySrc('groundSmash');
  stopSoundBySrc('yuta-lovebeam-background');
  stopSoundBySrc('yuta-lovebeam-fires');

  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.yuta) ? CONFIG.yuta : {};
  if (cfg.comeRikaSound) stopSoundBySrc(cfg.comeRikaSound);
  if (cfg.rikaAppearanceSound) stopSoundBySrc(cfg.rikaAppearanceSound);
  if (cfg.pureLoveBeamChargeSound) stopSoundBySrc(cfg.pureLoveBeamChargeSound);
  if (cfg.rikaGroundTrembleSound) stopSoundBySrc(cfg.rikaGroundTrembleSound);
  if (cfg.rikaGroundSmashSound) stopSoundBySrc(cfg.rikaGroundSmashSound);
  if (cfg.pureLoveBeamBackgroundSound) stopSoundBySrc(cfg.pureLoveBeamBackgroundSound);
  if (cfg.pureLoveBeamFireSound) stopSoundBySrc(cfg.pureLoveBeamFireSound);
}

export function initRika(fighter) {
  fighter.rika = {
    active: false,
    timer: 0,
    cooldownTimer: 0, // Disabled timer-based auto-summon (requires 50% HP or Domain Expansion)
    x: fighter.x,
    y: fighter.y,
    vx: 0,
    vy: 0,
    r: CONFIG.yuta.rikaRadius || 30,
    target: null,
    attackTimer: 0,       // Overall attack cooldown state
    rightArmTimer: 0,     // Right arm swing timer
    leftArmTimer: 0,      // Left arm swing timer
    lastArmUsed: 'left',  // Track alternating hand swings
    isDying: false,
    deathTimer: 0,
    disappearing: false,
    disappearTimer: 0,
    disappearDuration: 30,
    startX: 0,
    startY: 0,
    maxHp: CONFIG.yuta.rikaMaxHp || 500,
    hp: 0,
    isRika: true,
    owner: fighter,
    hasSummonedAt50Hp: false,
    hitStunTimer: 0,
    paralyzeTimer: 0,
    isParalyzedByMahoraga: false,
    timeStopTimer: 0,
    hitFlashTimer: 0,
    activeTrembleSound: null,
    trembleStopTimer: 0,
    knockbackVx: 0,
    knockbackVy: 0,
    damageNumberColor: '#FF1493',
    isStationarySkillActive: function() {
      return !!(this.rightArmTimer > 0 || this.leftArmTimer > 0 || this.spawnTimer > 0 || this.disappearing);
    },
    isPerformingSkill: function() {
      return !!(this.rightArmTimer > 0 || this.leftArmTimer > 0 || this.spawnTimer > 0 || this.disappearing);
    },
    applyHitStun: function(duration) {
      if (this.owner && (this.owner.isChannelingPureLoveBeam || this.owner.isFiringPureLoveBeam || (this.owner.rikaEmergingForBeamTimer > 0) || (this.owner.pureLoveBeamBreatherTimer > 0))) {
        return; // Ignore hit stun during Pure Love Beam firing
      }
      if (duration > (this.hitStunTimer || 0)) this.hitStunTimer = duration;
    },
    applyTimeStop: function(duration) {
      if (duration > (this.timeStopTimer || 0)) this.timeStopTimer = duration;
    },
    applyKnockback: function(vx, vy) {
      if (this.owner && (this.owner.isChannelingPureLoveBeam || this.owner.isFiringPureLoveBeam || (this.owner.rikaEmergingForBeamTimer > 0) || (this.owner.pureLoveBeamBreatherTimer > 0))) {
        return; // Ignore knockback push during Pure Love Beam firing
      }
      if (typeof vx === 'number') this.knockbackVx = (this.knockbackVx || 0) + vx;
      if (typeof vy === 'number') this.knockbackVy = (this.knockbackVy || 0) + vy;
    },
    applyBurn: function() {},
    applyPoison: function() {},
    applyShock: function() {},
    takeDamage: function(amount, attacker, opts = {}) {
      if (this.disappearing || !this.active || this.hp <= 0) return false;
      this.hp = Math.max(0, this.hp - (amount || 0));
      this.hitFlashTimer = 12;

      // Floating text
      if (typeof spawnFloatingText === 'function' && amount > 0) {
        const text = opts.isCrit ? `CRIT! ${Math.floor(amount)}` : Math.floor(amount);
        const color = opts.isCrit ? '#ff0000' : '#ffffff';
        spawnFloatingText(this.x, this.y - this.r - 10, text, color);
      }

      if (opts && (opts.isWallSlam || opts.isParalyzed)) {
        const stunDur = CONFIG.mahoraga?.wallSlamParalyzeDuration ?? 150;
        this.hitStunTimer = Math.max(this.hitStunTimer || 0, stunDur);
        this.paralyzeTimer = stunDur;
        this.isParalyzedByMahoraga = true;
      }

      // If Rika lost all HP, trigger instant death shatter!
      if (this.hp <= 0) {
        triggerRikaDeathShatter(this, this.owner);
        return true;
      }

      return true;
    }
  };
}

export function clampRikaToArena(rk, arena = (typeof state !== 'undefined' ? state.arena : null) || CONFIG.arena) {
  if (!rk || !arena) return false;
  const radius = rk.r || 30;
  let bounced = false;

  if (arena.shape === 'circle') {
    const acx = arena.x + arena.width / 2;
    const acy = arena.y + arena.height / 2;
    const ar = Math.max(10, (arena.radius || (arena.width / 2)) - radius);
    const dx = rk.x - acx;
    const dy = rk.y - acy;
    const dist = Math.hypot(dx, dy);
    if (dist > ar && dist > 0) {
      rk.x = acx + (dx / dist) * ar;
      rk.y = acy + (dy / dist) * ar;
      bounced = true;
      const nx = dx / dist;
      const ny = dy / dist;
      const dot = (rk.vx || 0) * nx + (rk.vy || 0) * ny;
      if (dot > 0) {
        rk.vx -= 2 * dot * nx;
        rk.vy -= 2 * dot * ny;
      }
      if (rk.knockbackVx || rk.knockbackVy) {
        const kbDot = (rk.knockbackVx || 0) * nx + (rk.knockbackVy || 0) * ny;
        if (kbDot > 0) {
          rk.knockbackVx -= 2 * kbDot * nx;
          rk.knockbackVy -= 2 * kbDot * ny;
        }
      }
    }
  } else {
    const minX = arena.x + radius;
    const maxX = arena.x + arena.width - radius;
    const minY = arena.y + radius;
    const maxY = arena.y + arena.height - radius;

    if (rk.x < minX) {
      rk.x = minX;
      rk.vx = Math.abs(rk.vx || 0);
      if (rk.knockbackVx && rk.knockbackVx < 0) rk.knockbackVx = 0;
      bounced = true;
    } else if (rk.x > maxX) {
      rk.x = maxX;
      rk.vx = -Math.abs(rk.vx || 0);
      if (rk.knockbackVx && rk.knockbackVx > 0) rk.knockbackVx = 0;
      bounced = true;
    }

    if (rk.y < minY) {
      rk.y = minY;
      rk.vy = Math.abs(rk.vy || 0);
      if (rk.knockbackVy && rk.knockbackVy < 0) rk.knockbackVy = 0;
      bounced = true;
    } else if (rk.y > maxY) {
      rk.y = maxY;
      rk.vy = -Math.abs(rk.vy || 0);
      if (rk.knockbackVy && rk.knockbackVy > 0) rk.knockbackVy = 0;
      bounced = true;
    }
  }
  return bounced;
}

export function updateRika(fighter, arena) {
  if (!fighter.rika) return;

  const rk = fighter.rika;
  const currentArena = arena || (typeof state !== 'undefined' ? state.arena : null) || CONFIG.arena;

  // If Yuta is dead or dying, immediately cut off all Rika audio and despawn Rika
  if (fighter.hp <= 0 || fighter.isDead || fighter.dead) {
    stopRikaAudio(fighter, rk);
    rk.active = false;
    rk.hp = 0;
    rk.isDying = false;
    rk.disappearing = false;
    rk.spawnTimer = 0;
    rk.chargeTimer = 0;
    if (typeof state !== 'undefined' && state.illusions) {
      const idx = state.illusions.indexOf(rk);
      if (idx >= 0) state.illusions.splice(idx, 1);
    }
    return;
  }

  clampRikaToArena(rk, currentArena);

  // If Yuta or Rika is chained or mind-controlled by Makima, ensure Rika is NOT in time-stop stasis so she can act!
  if ((fighter && (fighter.isChainedByMakima || fighter.isMindControlledByMakima)) || rk.isChainedByMakima || rk.isMindControlledByMakima) {
    rk.timeStopTimer = 0;
  }
  
  const isFrozen = (fighter.timeStopTimer > 0) || 
                   (fighter.electricStunTimer > 0) || (fighter.dubstepStunTimer > 0) || 
                   (fighter.crimsonElectrifiedTimer > 0) || (fighter.isFrozenByInfinity);
                   
  const isRikaDominated = Boolean(rk.isChainedByMakima || rk.isMindControlledByMakima);
  if (!isRikaDominated && (fighter.isChannelingPureLoveBeam || fighter.isFiringPureLoveBeam || (fighter.rikaEmergingForBeamTimer > 0) || (fighter.beamRetreatSlideTimer > 0) || fighter.pureLoveBeamBreatherTimer > 0)) {
    // Lock Rika aim rotation strictly to the straight beam firing angle
    const beamAngle = (fighter.pureLoveBeamLockedAngle !== undefined ? fighter.pureLoveBeamLockedAngle : (fighter.gunAngle || 0));
    rk.beamFollowAngle = beamAngle;

    const backAngle = beamAngle + Math.PI;
    const backDist = (fighter.r || 22) + 24;
    rk.x = fighter.x + Math.cos(backAngle) * backDist;
    rk.y = fighter.y + Math.sin(backAngle) * backDist;

    // Strict clamping within arena boundaries so Rika never clips out
    clampRikaToArena(rk, currentArena);
    rk.angle = beamAngle;
    rk.vx = 0;
    rk.vy = 0;
    rk.knockbackVx = 0;
    rk.knockbackVy = 0;
    rk.hitStunTimer = 0;
    rk.rightArmTimer = 0;
    rk.leftArmTimer = 0;
    rk.attackTimer = 0;
    return; // Skip normal Rika AI steering, attacks, and hit-reactions so she remains locked on Yuta's back!
  }

  if (isFrozen && !rk.active) {
    clampRikaToArena(rk, currentArena);
    return;
  }

  // Handle groundTremble audio timer countdown
  if (rk.trembleStopTimer > 0) {
    rk.trembleStopTimer--;
    if (rk.trembleStopTimer <= 0) {
      if (rk.activeTrembleSound) {
        fadeOutSound(rk.activeTrembleSound, 350);
        rk.activeTrembleSound = null;
      }
      fadeOutSoundBySrc('groundTremble', 350);
    }
  }

  // 50% HP Emergency Summon Trigger: Automatically call Rika for help when Yuta reaches 50% HP or lower (First Summon)
  const hpRatio = fighter.hp / (fighter.maxHp || 200);
  const hpThreshold = CONFIG.yuta?.rikaSummonHpThreshold ?? 0.60;
  const isInsideDomain = fighter.domainActive || fighter.isChannelingDomain;

  if (!rk.active && !rk.hasSummonedAt50Hp && hpRatio <= hpThreshold && !fighter.isDying && fighter.hp > 0 && !isInsideDomain) {
    rk.hasSummonedAt50Hp = true; // Lockout further HP-threshold summons
    fighter.rikaRechargeHpBaseline = undefined;
    const chargeDuration = CONFIG.yuta?.rikaSummonChargeDuration || 30;
    rk.chargeTimer = chargeDuration; // Use dedicated charge timer for the spawn animation delay

    // Trigger "Come, Rika!" audio (comerika.mp3)
    rk.playedComeRikaSound = true;
    fighter.rikaCallTimer = chargeDuration;
    const hpRatio = fighter.hp / (fighter.maxHp || 200);
    if (hpRatio <= (CONFIG.yuta?.pureLoveBeamHpThreshold ?? 0.60)) {
      fighter._rikaSummonedForBeam = true;
    }
    if (typeof spawnFloatingText === 'function') spawnFloatingText(fighter.x, fighter.y - 35, 'COME, RIKA!', '#FF1493');
    if (typeof spawnImpactFlash === 'function') spawnImpactFlash(fighter.x, fighter.y, 45, 'rgba(255, 20, 147, 0.4)');
    if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(1, 6);

    if (CONFIG.yuta?.comeRikaSound) {
      audioSystem.playSFX(
        CONFIG.yuta.comeRikaSound,
        CONFIG.yuta.comeRikaVolume ?? 2.5,
        1.0, 0,
        CONFIG.yuta.comeRikaDelay ?? 0
      );
      fighter._lastComeRikaPlayTime = state.frameCount;
    }
  } else if (!rk.active && rk.hasSummonedAt50Hp && !fighter.isDying && fighter.hp > 0 && (rk.chargeTimer || 0) <= 0) {
    // Re-summon Trigger: Fills up as Yuta takes damage (inside OR outside domain) after Rika died!
    if (fighter.rikaRechargeHpBaseline === undefined) {
      fighter.rikaRechargeHpBaseline = fighter.hp;
    }
    const reqDamage = (fighter.maxHp || 200) * (CONFIG.yuta?.rikaRechargeHpRatio ?? 0.20);
    const damageTaken = Math.max(0, fighter.rikaRechargeHpBaseline - fighter.hp);

    if (damageTaken >= reqDamage) {
      fighter.rikaRechargeHpBaseline = undefined;
      rk.killedInDomain = false;
      const chargeDuration = CONFIG.yuta?.rikaSummonChargeDuration || 30;
      rk.chargeTimer = chargeDuration;
      rk.playedComeRikaSound = true;
      fighter.rikaCallTimer = chargeDuration;
      const hpRatio = fighter.hp / (fighter.maxHp || 200);
      if (hpRatio <= (CONFIG.yuta?.pureLoveBeamHpThreshold ?? 0.60)) {
        fighter._rikaSummonedForBeam = true;
      }
      if (typeof spawnFloatingText === 'function') spawnFloatingText(fighter.x, fighter.y - 35, 'COME, RIKA!', '#FF1493');
      if (typeof spawnImpactFlash === 'function') spawnImpactFlash(fighter.x, fighter.y, 45, 'rgba(255, 20, 147, 0.4)');
      if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(1, 6);

      if (CONFIG.yuta?.comeRikaSound) {
        audioSystem.playSFX(
          CONFIG.yuta.comeRikaSound,
          CONFIG.yuta.comeRikaVolume ?? 2.5,
          1.0, 0,
          CONFIG.yuta.comeRikaDelay ?? 0
        );
        fighter._lastComeRikaPlayTime = state.frameCount;
      }
    }
  }

  // Handle the spawn delay (chargeTimer) independently from cooldown
  if (!rk.active && rk.chargeTimer > 0) {
    const isInsideDomain = fighter.domainActive || fighter.isChannelingDomain;
    if (!isInsideDomain) {
      rk.chargeTimer--;
    }

    if (rk.chargeTimer <= 0 && !isInsideDomain) {
      // NOTE: We do NOT reset hasSummonedAt50Hp here. The 50% HP summon is a one-time event!
      rk.active = true;
      rk.isDying = false;
      rk.disappearing = false;
      rk.deathTimer = 0;
      rk.disappearTimer = 0;
      rk.isSacrificingForBeam = false;
      rk.timer = CONFIG.yuta.rikaDuration || 999999;
      rk.x = fighter.x;
      rk.y = fighter.y;
      rk.hp = rk.maxHp;
      rk.playedComeRikaSound = false;
      rk.playedAriseRoarSound = false;
      const ariseMax = CONFIG.yuta?.rikaAriseDuration || 45;
      rk.spawnTimer = ariseMax; // Paused load/arise duration
      rk.spawnScale = 0.05;
      rk.isDomainSpawn = false;
      fighter.rikaAlpha = 0;

      if (typeof state !== 'undefined') {
        if (!state.illusions) state.illusions = [];
        if (!state.illusions.includes(rk)) {
          state.illusions.push(rk);
        }
      }
    }
  }

  // Handle Rika Manifestation Duration
  if (rk.active) {
    // Dynamic Size Expansion on Summon (grows from 0.05 with a dramatic pause moment midway through rise)
    if (rk.spawnTimer > 0) {
      rk.spawnTimer--;
      const ariseMax = CONFIG.yuta?.rikaAriseDuration || 45;
      const progress = 1 - (rk.spawnTimer / ariseMax);

      // Dramatic Pause Moment:
      // 0.0 -> 0.35: Surge up out of ground
      // 0.35 -> 0.65: PAUSE MOMENT! Holds position as energy surges & roar echoes
      // 0.65 -> 1.0: Elastic burst forward into combat stance
      let effectiveProgress = progress;
      if (progress >= 0.35 && progress <= 0.65) {
        const t = (progress - 0.35) / 0.30;
        effectiveProgress = 0.35 + (t * 0.05); // Holds scale/position during dramatic pause
      } else if (progress > 0.65) {
        const t = (progress - 0.65) / 0.35;
        effectiveProgress = 0.40 + (t * 0.60);
      }

      const easeOutBack = 1 + 2.70158 * Math.pow(effectiveProgress - 1, 3) + 1.70158 * Math.pow(effectiveProgress - 1, 2);
      rk.spawnScale = Math.max(0.05, Math.min(1.12, easeOutBack));

      // Continuous screen rumble as she arises into physical reality (reduced intensity)
      if (typeof triggerGlobalScreenShake === 'function') {
        const shakeIntensity = 0.5 + progress * 1.5;
        triggerGlobalScreenShake(shakeIntensity, 4);
      }

      // Play Rika arise audio (rikaAppearance1.mp3 & groundTremble.mp3) as she arises into physical reality!
      if (!rk.playedAriseRoarSound) {
        rk.playedAriseRoarSound = true;
        const appearanceChance = CONFIG.yuta?.rikaAppearanceChance ?? 0.35;
        if (Math.random() < appearanceChance && CONFIG.yuta?.rikaAppearanceSound) {
          audioSystem.playSFX(
            CONFIG.yuta.rikaAppearanceSound,
            CONFIG.yuta.rikaAppearanceVolume ?? 2.5,
            1.0, 0,
            CONFIG.yuta.rikaAppearanceDelay ?? 0
          );
        }

        if (CONFIG.yuta?.rikaGroundTrembleSound) {
          rk.activeTrembleSound = audioSystem.playSFX(
            CONFIG.yuta.rikaGroundTrembleSound,
            CONFIG.yuta.rikaGroundTrembleVolume ?? 1.8,
            1.0, 0,
            CONFIG.yuta.rikaGroundTrembleDelay ?? 0
          );
        }
      }

      const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));

      if (!isLowQuality && rk.spawnTimer % 3 === 0) {
        spawnSparks(rk.x + (Math.random() - 0.5) * 40 * rk.spawnScale, rk.y + (Math.random() - 0.5) * 40 * rk.spawnScale, 3, 'rikaCurse');
      }

      // Periodically blast roaring shockwaves & AOE roar damage as she arises
      if (rk.spawnTimer % 12 === 0 && !rk.isDomainSpawn) {
        const roarRadius = 100 + progress * 140;
        if (!isLowQuality && typeof spawnRikaRoarShockwave === 'function') {
          spawnRikaRoarShockwave(rk.x, rk.y, roarRadius);
        }

        if (typeof state !== 'undefined') {
          const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));
          const damageGain = Math.max(0, (fighter.damage || 0) - (CONFIG.yuta?.damage || 16));
          const roarPulseDamage = (CONFIG.yuta?.rikaArisePulseDamage || 10) + damageGain;

          // Hit enemy fighters in roar radius
          if (state.fighters) {
            state.fighters.forEach((enemy, idx) => {
              if (enemy && enemy !== fighter && enemy.hp > 0 && enemy.invincibilityTimer <= 0 && !(enemy.vanishTimer > 0)) {
                const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
                if (isEnemy) {
                  const dx = enemy.x - rk.x;
                  const dy = enemy.y - rk.y;
                  const dist = Math.hypot(dx, dy) || 1;
                  if (dist <= roarRadius + enemy.r) {
                    enemy.takeDamage(roarPulseDamage, fighter, { isPhysical: true, isRikaAttack: true });
                    if (typeof enemy.applyHitStun === 'function') enemy.applyHitStun(10);
                    enemy.vx += (dx / dist) * 5;
                    enemy.vy += (dy / dist) * 5;
                    if (typeof spawnImpactFlash === 'function') spawnImpactFlash(enemy.x, enemy.y, 35, 'rgba(255, 20, 147, 0.6)');
                  }
                }
              }
            });
          }

          // Hit enemy illusions in roar radius
          if (state.illusions) {
            state.illusions.forEach((ill) => {
              if (ill && ill !== rk && ill.hp > 0 && ill.owner !== fighter) {
                if (myTeam !== null && ill.owner && state.getFighterTeam(state.fighters.indexOf(ill.owner)) === myTeam) return;
                const dx = ill.x - rk.x;
                const dy = ill.y - rk.y;
                const dist = Math.hypot(dx, dy) || 1;
                if (dist <= roarRadius + (ill.r || 20)) {
                  ill.takeDamage(roarPulseDamage, fighter, { isPhysical: true, isRikaAttack: true });
                  if (typeof ill.applyHitStun === 'function') ill.applyHitStun(10);
                  ill.vx += (dx / dist) * 5;
                  ill.vy += (dy / dist) * 5;
                  if (typeof spawnImpactFlash === 'function') spawnImpactFlash(ill.x, ill.y, 35, 'rgba(255, 20, 147, 0.6)');
                }
              }
            });
          }
        }
      }

      // Heavy shockwave impact shake and triple shockwave explosion on exact frame of full emergence
      if (rk.spawnTimer === 1) {
        if (rk.activeTrembleSound) {
          fadeOutSound(rk.activeTrembleSound, 350);
          rk.activeTrembleSound = null;
        }
        fadeOutSoundBySrc('groundTremble', 350);
        
        if (!rk.isDomainSpawn) {
          if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(5, 12);
          if (typeof spawnImpactFlash === 'function') spawnImpactFlash(rk.x, rk.y, 120, 'rgba(255, 20, 147, 0.8)');
          if (typeof spawnRikaRoarShockwave === 'function') {
            if (isLowQuality) {
              spawnRikaRoarShockwave(rk.x, rk.y, 250);
            } else {
              spawnRikaRoarShockwave(rk.x, rk.y, 180);
              spawnRikaRoarShockwave(rk.x, rk.y, 250);
              spawnRikaRoarShockwave(rk.x, rk.y, 320);
            }
          }
        }

        // Spawn a burst of 30 hot pink cursed sparks (reduced in low quality)
        if (typeof spawnSparks === 'function') {
          const sparkCount = isLowQuality ? 5 : 30;
          for (let i = 0; i < sparkCount; i++) {
            spawnSparks(rk.x, rk.y, 1, 'rikaCurse');
          }
        }
        if (typeof spawnFloatingText === 'function') {
          spawnFloatingText(rk.x, rk.y - 45, 'FULL EMERGENCE!', '#FF1493');
        }

        // --- Emergence Blast Damage & Radial Knockback for Fighters & Illusions ---
        if (typeof state !== 'undefined') {
          const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));
          const damageGain = Math.max(0, (fighter.damage || 0) - (CONFIG.yuta?.damage || 15));
          const emergenceRadius = CONFIG.yuta?.rikaEmergenceRadius || 400;
          const emergenceDamage = (CONFIG.yuta?.rikaEmergenceDamage || 25) + damageGain;
          const emergenceKnockback = CONFIG.yuta?.rikaEmergenceKnockback || 8;
          const emergenceHitStun = CONFIG.yuta?.rikaEmergenceHitStun || 15;

          if (state.fighters) {
            state.fighters.forEach((enemy, idx) => {
              if (enemy && enemy !== fighter && enemy.hp > 0 && enemy.invincibilityTimer <= 0 && !(enemy.vanishTimer > 0)) {
                const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
                if (isEnemy) {
                  const dx = enemy.x - rk.x;
                  const dy = enemy.y - rk.y;
                  const dist = Math.hypot(dx, dy) || 1;
                  if (dist <= emergenceRadius + enemy.r) {
                    enemy.takeDamage(emergenceDamage, fighter, { isPhysical: true, isTrueDamage: true, isRikaAttack: true });
                    if (typeof enemy.applyHitStun === 'function') enemy.applyHitStun(emergenceHitStun);
                    const pushVx = (dx / dist) * emergenceKnockback;
                    const pushVy = (dy / dist) * emergenceKnockback;
                    enemy.vx += pushVx;
                    enemy.vy += pushVy;
                    if (typeof enemy.applyKnockback === 'function') enemy.applyKnockback(pushVx * 0.5, pushVy * 0.5);
                    if (typeof spawnFloatingText === 'function') spawnFloatingText(enemy.x, enemy.y - 30, 'EMERGENCE BLAST!', '#FF1493');
                  }
                }
              }
            });
          }

          if (state.illusions) {
            state.illusions.forEach((ill) => {
              if (ill && ill !== rk && ill.hp > 0 && ill.owner !== fighter) {
                if (myTeam !== null && ill.owner && state.getFighterTeam(state.fighters.indexOf(ill.owner)) === myTeam) return;
                const dx = ill.x - rk.x;
                const dy = ill.y - rk.y;
                const dist = Math.hypot(dx, dy) || 1;
                if (dist <= emergenceRadius + (ill.r || 20)) {
                  ill.takeDamage(emergenceDamage, fighter, { isPhysical: true, isTrueDamage: true, isRikaAttack: true });
                  if (typeof ill.applyHitStun === 'function') ill.applyHitStun(emergenceHitStun);
                  const pushVx = (dx / dist) * emergenceKnockback;
                  const pushVy = (dy / dist) * emergenceKnockback;
                  ill.vx += pushVx;
                  ill.vy += pushVy;
                  if (typeof ill.applyKnockback === 'function') ill.applyKnockback(pushVx * 0.5, pushVy * 0.5);
                  if (typeof spawnFloatingText === 'function') spawnFloatingText(ill.x, ill.y - 30, 'EMERGENCE BLAST!', '#FF1493');
                }
              }
            });
          }
        }
      }
    } else if (!rk.disappearing && !rk.isDying) {
      rk.spawnScale = 1.0;
    }

    if (rk.disappearing) {
      rk.disappearTimer--;
      
      const t = 1 - (rk.disappearTimer / rk.disappearDuration);
      rk.x = rk.startX + (fighter.x - rk.startX) * t;
      rk.y = rk.startY + (fighter.y - rk.startY) * t;
      
      const baseR = CONFIG.yuta.rikaRadius || 30;
      rk.r = baseR * (1 - t);
      rk.spawnScale = 1 - t;
      
      // Spawn particles along the way
      if (Math.random() < 0.4) {
        spawnSparks(rk.x, rk.y, 2, 'rikaCurse');
      }
      
      if (rk.disappearTimer <= 0) {
        spawnSparks(rk.x, rk.y, 12, 'rikaCurse');
        rk.active = false;
        rk.disappearing = false;
        rk.cooldownTimer = 0;
        rk.hasSummonedAt50Hp = true;
        rk.r = baseR; // Reset radius for next summon
        rk.spawnScale = 0.05;
        fighter.rikaAlpha = 0;
        fighter.rikaRechargeHpBaseline = fighter.hp;
      }
    } else {
      // Rika stays active indefinitely as long as her HP > 0 (no duration timer limit)
      if (rk.hp <= 0) {
        triggerRikaDeathShatter(rk, fighter);
        return;
      }
    }
  }

  if (!fighter.domainActive && !fighter.isChannelingDomain) {
    rk.killedInDomain = false;
  }

  // If domain is active or being channeled, Rika is forced active unless she was killed during it
  if ((fighter.domainActive || fighter.isChannelingDomain) && !rk.killedInDomain) {
    if (!rk.active) {
      rk.active = true;
      rk.x = fighter.x;
      rk.y = fighter.y;
      rk.hp = rk.maxHp; // Reset HP upon manifestation
      rk.playedComeRikaSound = false;
      rk.playedAriseRoarSound = false;
      const ariseMax = CONFIG.yuta?.rikaAriseDuration || 45;
      rk.spawnTimer = ariseMax;
      rk.spawnScale = 0.05;
      rk.isDomainSpawn = true; // Supress shockwaves for channeling/domain spawns
      
      // Play Rika Appearance sound (rikaAppearance.mp3) when Rika manifests!
      const appearanceChance = CONFIG.yuta?.rikaAppearanceChance ?? 0.35;
      if (Math.random() < appearanceChance && CONFIG.yuta?.rikaAppearanceSound) {
        audioSystem.playSFX(
          CONFIG.yuta.rikaAppearanceSound,
          CONFIG.yuta.rikaAppearanceVolume ?? 2.5,
          1.0, 0,
          CONFIG.yuta.rikaAppearanceDelay ?? 0
        );
      }

      // Add her to the global targeting pool so AI and projectiles lock onto her
      if (typeof state !== 'undefined') {
        if (!state.illusions) state.illusions = [];
        if (!state.illusions.includes(rk)) {
          state.illusions.push(rk);
        }
      }
    }
    rk.disappearing = false;
    const baseR = CONFIG.yuta.rikaRadius || 30;
    rk.r = baseR;
    rk.timer = 100; // Keep her timer up so she doesn't despawn immediately after domain
  }

  if (!rk.active) return;
  if (rk.isDying || rk.disappearing) return;

  // Smooth slide to stop on champion screen
  if (typeof isChampionScreenActive === 'function' && isChampionScreenActive()) {
    rk.vx = (rk.vx || 0) * 0.96;
    rk.vy = (rk.vy || 0) * 0.96;
    rk.x += rk.vx;
    rk.y += rk.vy;
    
    const minX = arena.x + rk.r;
    const maxX = arena.x + arena.width - rk.r;
    const minY = arena.y + rk.r;
    const maxY = arena.y + arena.height - rk.r;
    if (rk.x < minX) { rk.x = minX; rk.vx = -rk.vx * 0.5; }
    if (rk.x > maxX) { rk.x = maxX; rk.vx = -rk.vx * 0.5; }
    if (rk.y < minY) { rk.y = minY; rk.vy = -rk.vy * 0.5; }
    if (rk.y > maxY) { rk.y = maxY; rk.vy = -rk.vy * 0.5; }
    return;
  }

  // Snap Rika to Yuta's back when channeling or firing Pure Love Beam
  if (fighter.isChannelingPureLoveBeam || fighter.isFiringPureLoveBeam) {
    const angle = fighter.gunAngle || 0;
    const offsetDist = fighter.r + rk.r + 5;
    rk.x = fighter.x - Math.cos(angle) * offsetDist;
    rk.y = fighter.y - Math.sin(angle) * offsetDist;
    rk.vx = 0;
    rk.vy = 0;
    
    // Spawn energy gathering sparks on Rika too during charge phase
    if (fighter.isChannelingPureLoveBeam && fighter.pureLoveBeamChargeTimer % 3 === 0) {
      spawnSparks(rk.x, rk.y, 2, 'rikaCurse', { color: 'rgba(255, 20, 147, 1)', blendMode: 0 });
    }
    return; // Completely freeze AI during beam charge & firing phases
  }

  // Freeze Rika in place for a moment while she is loading/arising (during spawnTimer)
  if (rk.spawnTimer > 0) {
    rk.vx = 0;
    rk.vy = 0;
    clampRikaToArena(rk, currentArena);
    return; // Don't move or attack until she has fully arisen!
  }

  if (rk.hitFlashTimer > 0) {
    rk.hitFlashTimer--;
  }

  // Freeze Rika during Nanami's 7:3 Ratio Hit-Pause
  const isNanamiPausing = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && (f.characterId === 'nanami' || f.type === 'nanami') && (f.ratioHitPauseTimer || 0) > 0);
  if (isNanamiPausing) {
    rk.vx = 0;
    rk.vy = 0;
    clampRikaToArena(rk, currentArena);
    return; // Completely frozen during Nanami's 7:3 Ratio pause!
  }

  // Handle paralysis / time stop (Gojo's Domain Expansion / Unlimited Void / Mahoraga Wall Slam Paralyze)
  if (rk.timeStopTimer > 0) {
    rk.timeStopTimer--;
    rk.vx = 0;
    rk.vy = 0;
    clampRikaToArena(rk, currentArena);
    return; // Completely frozen!
  }

  if (rk.paralyzeTimer > 0) {
    rk.paralyzeTimer--;
  }

  const isRikaParalyzed = (rk.hitStunTimer || 0) > 0 || (rk.paralyzeTimer || 0) > 0 || rk.isParalyzedByMahoraga;
  if (isRikaParalyzed) {
    if (rk.hitStunTimer > 0) rk.hitStunTimer--;
    if ((rk.paralyzeTimer || 0) <= 0 && (rk.hitStunTimer || 0) <= 0) {
      rk.isParalyzedByMahoraga = false;
    }
    rk.vx = 0;
    rk.vy = 0;
    clampRikaToArena(rk, currentArena);
    return; // Completely frozen by hit stun or paralyze debuff!
  }

  // Find target for Rika
  findRikaTarget(fighter, rk);

  // Move Rika — ball-like movement: always moving, bounces off walls
  const speed = fighter.baseSpeed * (CONFIG.yuta.rikaSpeedMultiplier || 1.8);

  // Ensure Rika always has velocity (initialize if spawning or stationary)
  const currentSpeed = Math.hypot(rk.vx, rk.vy);
  if (currentSpeed < 0.1) {
    // Give her an initial velocity toward her target or a random direction
    if (rk.target) {
      const dx = rk.target.x - rk.x;
      const dy = rk.target.y - rk.y;
      const d = Math.hypot(dx, dy) || 1;
      rk.vx = (dx / d) * speed;
      rk.vy = (dy / d) * speed;
    } else {
      const angle = Math.random() * Math.PI * 2;
      rk.vx = Math.cos(angle) * speed;
      rk.vy = Math.sin(angle) * speed;
    }
  }

  // Steer toward target (gradual heading adjustment, not instant)
  if (rk.target) {
    const dx = rk.target.x - rk.x;
    const dy = rk.target.y - rk.y;
    const dist = Math.hypot(dx, dy);

    // Steer: blend current heading toward target direction
    const steerStrength = rk.target.isStealthed ? (CONFIG.toji?.stealthTurnRate || 0.035) * 0.5 : 0.08; // How aggressively she turns
    rk.vx += (dx / (dist || 1)) * speed * steerStrength;
    rk.vy += (dy / (dist || 1)) * speed * steerStrength;

    // Melee attack when in range (but don't stop!)
    if (dist <= rk.r + rk.target.r + 5 && rk.attackTimer <= 0) {
      const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
      const aoeRadius = CONFIG.yuta?.rikaAoeRadius || 85;
      const contactX = (rk.x + rk.target.x) * 0.5;
      const contactY = (rk.y + rk.target.y) * 0.5;

      const myTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(fighter)) : null;
      const aoeTargets = new Set();
      aoeTargets.add(rk.target);

      const isRikaDominated = Boolean(rk.isChainedByMakima || rk.isMindControlledByMakima);
      const isYutaDominated = Boolean(fighter && (fighter.isChainedByMakima || fighter.isMindControlledByMakima));

      // Collect all enemy fighters in AOE radius
      if (state.fighters) {
        for (let i = 0; i < state.fighters.length; i++) {
          const enemy = state.fighters[i];
          if (!enemy || enemy.hp <= 0 || enemy.invincibilityTimer > 0 || (enemy.vanishTimer && enemy.vanishTimer > 0)) continue;
          
          if (isRikaDominated) {
            if (enemy === rk._makimaChainer || (rk._makimaChainer && typeof rk._makimaChainer.isTeammate === 'function' && rk._makimaChainer.isTeammate(enemy))) continue;
          } else {
            if (enemy === fighter && !isYutaDominated) continue;
            const enemyTeam = state.getFighterTeam ? state.getFighterTeam(i) : null;
            if (myTeam !== null && enemyTeam !== null && myTeam === enemyTeam && !enemy.isChainedByMakima && !enemy.isMindControlledByMakima) continue;
          }

          const d = Math.hypot(enemy.x - contactX, enemy.y - contactY);
          if (d <= aoeRadius + enemy.r) {
            aoeTargets.add(enemy);
          }
        }
      }

      // Collect all enemy illusions/minions in AOE radius
      if (state.illusions) {
        for (const ill of state.illusions) {
          if (!ill || ill.hp <= 0 || ill.isRika) continue;
          if (isRikaDominated) {
            if (ill.owner === rk._makimaChainer || (rk._makimaChainer && typeof rk._makimaChainer.isTeammate === 'function' && rk._makimaChainer.isTeammate(ill.owner))) continue;
          } else {
            if (ill.owner === fighter && !isYutaDominated) continue;
            if (myTeam !== null && ill.owner && state.getFighterTeam) {
              const illTeam = state.getFighterTeam(state.fighters.indexOf(ill.owner));
              if (illTeam === myTeam && !ill.owner.isChainedByMakima && !ill.owner.isMindControlledByMakima) continue;
            }
          }

          const d = Math.hypot(ill.x - contactX, ill.y - contactY);
          if (d <= aoeRadius + (ill.r || 20)) {
            aoeTargets.add(ill);
          }
        }
      }

      const damageGain = Math.max(0, (fighter.damage || 0) - (CONFIG.yuta?.damage || 15));
      const rikaDmg = (CONFIG.yuta.rikaDamage || 20) + damageGain;
      const knockbackForce = CONFIG.yuta?.rikaHitKnockback || 16;
      const recoilForce = CONFIG.yuta?.rikaHitRecoil || 6;
      const hitStunDuration = CONFIG.yuta?.rikaHitStun || 12;
      const attackOwner = isRikaDominated ? (rk._makimaChainer || rk.owner) : (fighter._makimaChainer || fighter);

      for (const target of aoeTargets) {
        target.takeDamage(rikaDmg, attackOwner, { isPhysical: true, isRikaAttack: true });

        const pushAngle = Math.atan2(target.y - rk.y, target.x - rk.x);
        const smashVx = Math.cos(pushAngle) * knockbackForce;
        const smashVy = Math.sin(pushAngle) * knockbackForce;

        const isTojiTarget = target.characterId === 'toji' || target.type === 'toji' || target.domainImmunity;
        if (isTojiTarget) {
          target.vx = (target.vx || 0) + smashVx * 0.4;
          target.vy = (target.vy || 0) + smashVy * 0.4;
        } else {
          target.vx = (target.vx || 0) + smashVx;
          target.vy = (target.vy || 0) + smashVy;
          if (typeof target.applyKnockback === 'function') {
            target.applyKnockback(smashVx * 0.5, smashVy * 0.5);
          }
          if (typeof target.applyHitStun === 'function') {
            target.applyHitStun(hitStunDuration);
          }
        }

        if (typeof spawnImpactFlash === 'function') spawnImpactFlash(target.x, target.y, 50, 'rgba(255, 20, 147, 0.7)');
        if (typeof spawnSparks === 'function') spawnSparks(target.x, target.y, 8, 'rikaCurse');
      }

      // 2. Rika Equal-and-Opposite Physical Recoil (Rika bounces back off target on impact)
      const pushAngle = Math.atan2(dy, dx);
      rk.vx = -Math.cos(pushAngle) * recoilForce;
      rk.vy = -Math.sin(pushAngle) * recoilForce;

      // 3. Heavy Impact Screen Shake, Flash & Sparks
      if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(8, 10);
      if (!isLowQuality && typeof spawnRikaRoarShockwave === 'function') spawnRikaRoarShockwave(contactX, contactY, 110);
      rk.attackTimer = CONFIG.yuta.rikaAttackRate || 30;

      // Play random demonic Rika attack noise (rikanoise1.mp3, rikanoise2.mp3, rikanoise3.mp3)
      // NEVER cuts the audio! Lets the current roar audio play to 100% completion before picking a new random roar.
      const nowMs = performance.now();
      const isRoarActive = rk.roarEndTime && nowMs < rk.roarEndTime;

      if (!isRoarActive && Math.random() < (CONFIG.yuta?.rikaNoiseChance ?? 0.35)) {
        const noises = CONFIG.yuta?.rikaNoises || [
          'Assets/Sound Effects/Attacks/rikanoise1.mp3',
          'Assets/Sound Effects/Attacks/rikanoise2.mp3',
          'Assets/Sound Effects/Attacks/rikanoise3.mp3'
        ];
        const noiseList = noises.map(n => typeof n === 'string' ? { src: n } : n);

        if (Array.isArray(noiseList) && noiseList.length > 0) {
          const available = noiseList.filter(n => !rk.lastRoarSrc || n.src !== rk.lastRoarSrc);
          const pool = available.length > 0 ? available : noiseList;
          const randomNoise = pool[Math.floor(Math.random() * pool.length)];

          if (randomNoise && randomNoise.src) {
            rk.lastRoarSrc = randomNoise.src;
            const vol = CONFIG.yuta?.rikaNoiseVolume ?? 1.5;
            const handle = audioSystem.playSFX(
              randomNoise.src,
              vol,
              1.0, 0,
              CONFIG.yuta?.rikaNoiseDelay ?? 0
            );
            rk.activeRoarSound = handle;

            const durationMs = (handle && typeof handle.duration === 'number' && handle.duration > 0)
              ? (handle.duration * 1000)
              : 1200;
            rk.roarEndTime = nowMs + durationMs;
          }
        }
      }

      // Play physical claw impact sound (backstab.mp3) and groundSmash.mp3 on Rika attack
      if (CONFIG.yuta?.rikaAttackSound) {
        audioSystem.playSFX(
          CONFIG.yuta.rikaAttackSound,
          CONFIG.yuta.rikaAttackVolume ?? 0.8,
          1.0, 0,
          CONFIG.yuta.rikaAttackDelay ?? 0
        );
      }

      if (CONFIG.yuta?.rikaGroundSmashSound) {
        audioSystem.playSFX(
          CONFIG.yuta.rikaGroundSmashSound,
          CONFIG.yuta.rikaGroundSmashVolume ?? 1.5,
          1.0, 0,
          CONFIG.yuta.rikaGroundSmashDelay ?? 0
        );
      }

      // Alternate arms for fluid rapid dual-hand claw slashing!
      if (rk.lastArmUsed === 'right') {
        rk.leftArmTimer = 60;
        rk.lastArmUsed = 'left';
      } else {
        rk.rightArmTimer = 60;
        rk.lastArmUsed = 'right';
      }
    }
  } else {
    // No target — steer back toward Yuta
    const dx = fighter.x - rk.x;
    const dy = fighter.y - rk.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 60) {
      const steerStrength = 0.08;
      rk.vx += (dx / (dist || 1)) * speed * steerStrength;
      rk.vy += (dy / (dist || 1)) * speed * steerStrength;
    }
  }

  // Normalize to constant speed
  const spd = Math.hypot(rk.vx, rk.vy);
  if (spd > 0) {
    rk.vx = (rk.vx / spd) * speed;
    rk.vy = (rk.vy / spd) * speed;
  }

  // Apply velocity
  rk.x += rk.vx;
  rk.y += rk.vy;

  if (rk.attackTimer > 0) {
    rk.attackTimer--;
  }

  if (rk.noiseTimer > 0) {
    rk.noiseTimer--;
  }
  
  if (rk.rightArmTimer > 0) {
    rk.rightArmTimer--;
  }
  
  if (rk.leftArmTimer > 0) {
    rk.leftArmTimer--;
  }

  // Wall bounce & arena boundary clamping — same as arena fighters / illusions
  const bounced = clampRikaToArena(rk, currentArena);

  // On bounce — re-lock toward target (unless target is Gojo with active Infinity)
  if (bounced && rk.target) {
    const isGojoInfinity =
      (rk.target.characterId === 'gojo' || rk.target.type === 'gojo') &&
      !rk.target.isMeleeMode &&
      ((rk.target.infinityCooldown || 0) <= 0 || rk.target.infinityActive) &&
      !rk.target.isChainedByMakima;

    if (!isGojoInfinity) {
      const dx = rk.target.x - rk.x;
      const dy = rk.target.y - rk.y;
      const d = Math.hypot(dx, dy) || 1;
      rk.vx = (dx / d) * speed;
      rk.vy = (dy / d) * speed;
    }
    // else: keep the natural reflected velocity (already set by the wall clamp above)
  }
}

function findRikaTarget(fighter, rk) {
  // If Makima chains Rika directly, her domination target is the Yuta who
  // summoned her. This has priority over all regular enemy targeting.
  if (rk.isChainedByMakima || rk.isMindControlledByMakima) {
    const originalOwner = rk._makimaOriginalOwner || (rk.owner !== rk._makimaChainer ? rk.owner : null) || fighter;
    if (originalOwner && originalOwner.hp > 0 && !originalOwner.isDead) {
      rk.target = originalOwner;
      rk.timeStopTimer = 0;
      return;
    }
  }

  // Retaliation: If Yuta is chained or mind-controlled by Makima, Rika prioritizes attacking Yuta!
  if (fighter && (fighter.isChainedByMakima || fighter.isMindControlledByMakima) && fighter.hp > 0) {
    rk.target = fighter;
    rk.timeStopTimer = 0;
    return;
  }

  let closestDist = Infinity;
  let closestTarget = null;
  const isRikaDominated = Boolean(rk.isChainedByMakima || rk.isMindControlledByMakima);
  const myTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(fighter)) : null;

  // Check main enemy fighters
  for (let i = 0; i < state.fighters.length; i++) {
    const enemy = state.fighters[i];
    if (!enemy || enemy.hp <= 0 || enemy.invincibilityTimer > 0 || enemy.isStealthed || (enemy.vanishTimer && enemy.vanishTimer > 0)) continue;
    
    if (isRikaDominated) {
      if (enemy === rk._makimaChainer || (rk._makimaChainer && typeof rk._makimaChainer.isTeammate === 'function' && rk._makimaChainer.isTeammate(enemy))) continue;
    } else {
      if (enemy === fighter) continue;
      const enemyTeam = state.getFighterTeam ? state.getFighterTeam(i) : null;
      if (myTeam !== null && enemyTeam !== null && myTeam === enemyTeam && !enemy.isChainedByMakima && !enemy.isMindControlledByMakima) continue;
    }

    const dist = Math.hypot(enemy.x - rk.x, enemy.y - rk.y);
    if (dist < closestDist) {
      closestDist = dist;
      closestTarget = enemy;
    }
  }

  // Also check illusions and summoned minions (Doppelganger illusions, Hydra copies, etc.)
  if (state.illusions) {
    for (const ill of state.illusions) {
      if (!ill || ill.hp <= 0 || ill.isRika) continue;
      
      if (isRikaDominated) {
        if (ill.owner === rk._makimaChainer || (rk._makimaChainer && typeof rk._makimaChainer.isTeammate === 'function' && rk._makimaChainer.isTeammate(ill.owner))) continue;
      } else {
        if (ill.owner === fighter) continue;
        if (myTeam !== null && ill.owner && state.getFighterTeam) {
          const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ill.owner));
          if (ownerTeam === myTeam && !ill.owner.isChainedByMakima && !ill.owner.isMindControlledByMakima) continue;
        }
      }

      const dist = Math.hypot(ill.x - rk.x, ill.y - rk.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestTarget = ill;
      }
    }
  }
  
  rk.target = closestTarget;
}
