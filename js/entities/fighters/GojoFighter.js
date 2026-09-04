import { GojoRenderer } from '../../graphics/fighters/gojoRenderer.js';
import { fadeOutSound, fadeOutSoundBySrc } from '../../systems/soundSystem.js';
import { Fighter, isSuppressedByGetsuga } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST, getHandSize } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave, spawnAnimePunchImpactFrame } from '../../graphics/particles/sparkEffect.js';
import { renderGojoDomainBackground } from './gojo/gojoDomainVisuals.js';
import { activateRed as modActivateRed, detonateRed as modDetonateRed, firePurple as modFirePurple, executePurpleRetreat as modExecutePurpleRetreat, deleteEnemyProjectilesInPurple as modDeletePurpleProj } from './gojo/gojoSkills.js';
import { triggerInfinityBlock as modTriggerInfinityBlock, applyTeleportSlideBrake as modApplyTeleportSlideBrake, executeTeleportDodge as modExecuteTeleportDodge, clampEntityToArenaBounds } from './gojo/gojoCombat.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { drawGojoBody } from '../../graphics/fighters/gojoSkin.js';
import { drawGojoWeapon, drawGojoOrb, drawAnamorphicLensFlare } from '../../graphics/weapons/gojoWeaponGraphics.js';
import { spatialGrid } from '../../systems/physics.js';

export class GojoFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'gojo';
    this.type = 'gojo';
    this.skinColor = '#FFE0BD';
    this.color = '#00E5FF'; // Electric Cyan damage floating text theme
    this.shootCooldownMax = CONFIG.gojo?.blueCooldown ?? def.cooldown ?? 60;
    this.shootCooldown = 0;
    this._blueOrbDisplayAlpha = 1.0;
    this.cooldown = this.shootCooldownMax;
    this.infinityCooldown = 0;
    this.infinityActive = true;
    this.infinityFadeOpacity = 0;

    this.redCooldown = CONFIG.gojo.redCooldown || 1000;
    this.purpleCooldown = CONFIG.gojo.purpleCooldown || 1500; // Delay initial cast
    this.isChannelingPurple = false;
    this.purpleChargeTimer = 0;
    this.purpleChargeMax = CONFIG.gojo.purpleChargeMax || 120;
    this._hasPlayedPurpleChannelSound = false;
    this._purpleChargeSoundHandle = null;

    this.domainCooldown = CONFIG.gojo.domainCooldown ?? 2000; // Initial cast delay reads from CONFIG
    this.domainActive = false;
    this.domainTimer = 0;
    this.domainChargeTimer = 0;
    this.domainChargeMax = CONFIG.gojo.domainChargeMax || 130;
    this.isChannelingDomainExpansion = false;
    this._hasPlayedDomainChannelSound = false;
    this.domainUseCount = 0; // Allows domain to be cast up to 2 times per round

    this.reverseCursedTechniqueCooldown = CONFIG.gojo?.reverseCursedTechniqueCooldown || 700;
    this.reverseCursedTechniqueTriggered = false;
    this.healingAuraTimer = 0;  // Timer for healing aura visual effect
    this.isChannelingRCT = false;
    this.rctChannelTimer = 0;

    // Melee Mode (Hand-to-Hand Combat) - Start in Ranged Mode first
    this.isMeleeMode = false;
    this.meleePunchCooldown = 0;
    this.afterImages = []; // Blue afterimages for teleport effect
    this.forcedMeleeTimer = 0;
    this.wasForcedMelee = false;
    this.meleeModeCooldown = 0;
    this.hitFlameWisps = []; // Residual stretched Cursed Energy flame wisps on hit
    this.combatAuraOpacity = 0; // Smooth fade-in & fade-out opacity for Cursed Energy aura
    this.postDomainFadeInTimer = 0; // Timer to fade in CE after domain ends
    this.purpleRecoveryTimer = 0; // 2.5s recovery stasis after firing Purple
    this.purpleRetreatTimer = 0; // Delay before teleport-away after firing Purple
    this.hasFiredPurple = false;
    this._hasFiredPurpleAtLeastOnce = false;
    this.redEffectTimer = 0;
    this.redEffectMaxTimer = 75;
    this.redBuildupPhase = false;
    this.redDetonated = false;
    this.infinityBlockTimer = 0;
    this.infinityBlockMaxTimer = 25;
    this.teleportSlideTimer = 0;
    this.domainSlideTimer = 0;
    this.isDomainPreSlide = false;
    this.domainPreSlideTimer = 0;
    this.purpleUseCount = 0;
    this.is200PercentChannel = false;
  }

  reset() {
    super.reset();
    this.shootCooldownMax = CONFIG.gojo.blueCooldown ?? this._def.cooldown;
    this.cooldown = this.shootCooldownMax;
    this.infinityCooldown = 0;
    this.infinityActive = true;
    this.redCooldown = CONFIG.gojo.redCooldown || 1000;
    this.purpleCooldown = CONFIG.gojo.purpleCooldown || 1500;
    this.purpleUseCount = 0;
    this.hasFiredPurple = false;
    this._hasFiredPurpleAtLeastOnce = false;
    this.isChannelingPurple = false;
    this.is200PercentChannel = false;
    this.purpleChargeTimer = 0;
    this.purpleChargeMax = CONFIG.gojo.purpleChargeMax || 120;
    this.domainCooldown = CONFIG.gojo.domainCooldown ?? 2000;
    this.domainActive = false;
    this.domainTimer = 0;
    this.domainChargeTimer = 0;
    this.domainChargeMax = CONFIG.gojo.domainChargeMax || 130;
    this.isChannelingDomainExpansion = false;
    this._hasPlayedDomainChannelSound = false;
    this.domainExpansionAudioDelay = 0;
    this.domainUseCount = 0;
    this.reverseCursedTechniqueCooldown = CONFIG.gojo?.reverseCursedTechniqueCooldown || 700;
    this.reverseCursedTechniqueTriggered = false;
    this.healingAuraTimer = 0;
    this.isChannelingRCT = false;
    this.rctChannelTimer = 0;
    // Melee Mode reset - Start round in Ranged Mode first
    this.isMeleeMode = false;
    this.meleePunchCooldown = 0;
    this.hitFlameWisps = [];
    this.afterImages = [];
    this.forcedMeleeTimer = 0;
    this.wasForcedMelee = false;
    this.meleeModeCooldown = 0;
    this.combatAuraOpacity = 0;
    this.purpleRecoveryTimer = 0;
    this.purpleRetreatTimer = 0;
    this.redEffectTimer = 0;
    this.redBuildupPhase = false;
    this.infinityBlockTimer = 0;
    this.teleportSlideTimer = 0;
    this.domainSlideTimer = 0;
    this.isDomainPreSlide = false;
    this.domainPreSlideTimer = 0;
    this.initialTeleportDone = false;
  }

  isChannelingAnySkill() {
    return (
      this.isDomainPreSlide ||
      this.isChannelingDomainExpansion ||
      this.isChannelingPurple ||
      (this.redEffectTimer || 0) > 0 ||
      this.isChannelingRCT ||
      (this.purpleRecoveryTimer || 0) > 0 ||
      (this.purpleRetreatTimer || 0) > 0
    );
  }

  interruptAttacks(forceCancelAll = false) {
    const wasChannelingDomain = this.isChannelingDomainExpansion;
    const wasChannelingPurple = this.isChannelingPurple;
    const savedPurpleCharge = this.purpleChargeTimer;
    const savedPurpleCooldown = this.purpleCooldown;
    const wasChannelingRed = (this.redEffectTimer || 0) > 0 || this.redBuildupPhase;
    const savedRedTimer = this.redEffectTimer;
    const savedRedMaxTimer = this.redEffectMaxTimer;
    const savedRedBuildup = this.redBuildupPhase;
    const savedRedAudio = this._hasPlayedRedChannelingSound;
    const savedDomainCharge = this.domainChargeTimer;

    super.interruptAttacks(forceCancelAll);
    this.isDomainPreSlide = false;
    this.domainPreSlideTimer = 0;

    const penaltyCD = CONFIG.gojo?.interruptCooldown ?? 270; // 4.5s penalty CD on cancellation

    if (forceCancelAll || this.isTargetOfAmbush || (this.silenceTimer || 0) > 0) {
      this._hasPlayedRedChannelingSound = false;
      this.redEffectTimer = 0;
      this.redBuildupPhase = false;
      this.redDetonated = false;
      if (wasChannelingRed) {
        this.redCooldown = Math.max(this.redCooldown || 0, penaltyCD);
      }
      if (wasChannelingDomain) {
        this.domainCooldown = Math.max(this.domainCooldown || 0, penaltyCD + 30);
      }
      if (wasChannelingPurple) {
        this.purpleCooldown = Math.max(this.purpleCooldown || 0, penaltyCD);
      }
      this.isChannelingPurple = false;
      this.purpleChargeTimer = 0;
      this.z = 0; // Drop to ground on hard cancel
      this.isChannelingDomainExpansion = false;
      this.domainChargeTimer = 0;
      if (this._purpleChargeSoundHandle) {
        fadeOutSound(this._purpleChargeSoundHandle, 200);
        this._purpleChargeSoundHandle = null;
      }
      return;
    }

    if (wasChannelingRed) {
      this.redEffectTimer = savedRedTimer;
      this.redEffectMaxTimer = savedRedMaxTimer;
      this.redBuildupPhase = savedRedBuildup;
      this._hasPlayedRedChannelingSound = savedRedAudio || true;
    }

    const isHitByGetsuga = Boolean(this.isDraggedByGetsuga || (this._hitByGetsugaTimer && this._hitByGetsugaTimer > 0) || isSuppressedByGetsuga(this));

    // Domain Expansion Hyper Armor: ONLY Toji (ISOH ambush/silence) or Getsuga wave can interrupt domain expansion channeling!
    if (wasChannelingDomain) {
      if (this.isTargetOfAmbush || (this.silenceTimer || 0) > 0 || isHitByGetsuga) {
        this.isChannelingDomainExpansion = false;
        this.domainChargeTimer = 0;
        this.domainCooldown = Math.max(this.domainCooldown || 0, penaltyCD + 30);
      } else {
        this.isChannelingDomainExpansion = true;
        this.domainChargeTimer = savedDomainCharge;
      }
    }

    // Hollow Purple Hyper Armor: Normal attacks do NOT cancel Purple channeling!
    // Toji's ISOH ambush/silence or Getsuga wave cancels it.
    if (wasChannelingPurple) {
      if (this.isTargetOfAmbush || (this.silenceTimer || 0) > 0 || isHitByGetsuga) {
        this.isChannelingPurple = false;
        this.purpleChargeTimer = 0;
        this.purpleCooldown = Math.max(this.purpleCooldown || 0, penaltyCD);
        this.z = 0; // Drop to ground when cancelled
        if (this._purpleChargeSoundHandle) {
          fadeOutSound(this._purpleChargeSoundHandle, 200);
          this._purpleChargeSoundHandle = null;
        }
      } else {
        // HYPER ARMOR: Keep Purple channel active and preserve charge progress!
        this.isChannelingPurple = true;
        this.purpleChargeTimer = savedPurpleCharge;
        this.purpleCooldown = savedPurpleCooldown; // Restore existing cooldown!
      }
    } else {
      // Not channeling Purple — safe to kill the sound handle if lingering
      if (this._purpleChargeSoundHandle) {
        fadeOutSound(this._purpleChargeSoundHandle, 200);
        this._purpleChargeSoundHandle = null;
      }
    }
  }

  getAttackProgress() {
    if (!this.shootCooldownMax) return 1;
    return 1 - (this.shootCooldown / this.shootCooldownMax);
  }

  getBodyPullback() {
    const progress = this.getAttackProgress();
    if (progress >= 0.5) {
      return -8 * Math.pow((progress - 0.5) / 0.5, 2);
    } else if (progress < 0.3) {
      const p = 1 - (progress / 0.3);
      return 10 * Math.pow(p, 3);
    }
    return 0;
  }

  getPurpleChargeProgress() {
    if (!this.isChannelingPurple) return 0;
    return Math.min(1, this.purpleChargeTimer / this.purpleChargeMax);
  }

  isPurpleActive() {
    if (this.activePurpleProjectile) {
      if ((this.activePurpleProjectile.life || 0) > 0 && projectileSystem?.projectiles?.includes(this.activePurpleProjectile)) {
        return true;
      } else {
        this.activePurpleProjectile = null;
      }
    }
    if (projectileSystem?.projectiles) {
      const myIdx = state.fighters ? state.fighters.indexOf(this) : -1;
      const found = projectileSystem.projectiles.find(p => p && (p.isGojoPurple || p.behaviorType === 'gojo_purple') && (p.owner === myIdx || p.ownerFighter === this) && (p.life || 0) > 0);
      if (found) {
        this.activePurpleProjectile = found;
        return true;
      }
    }
    return false;
  }

  canPerformBasicAttack() {
    if (this.isPurpleActive()) return false;
    if (this.isChannelingPurple || this.isChannelingDomainExpansion || (this.redEffectTimer || 0) > 0 || this.redBuildupPhase) return false;
    return super.canPerformBasicAttack();
  }

  shoot(ownerIndex) {
    if (!this.canPerformBasicAttack()) return false;
    if (projectileSystem && projectileSystem.fireGojoBlue) {
      projectileSystem.fireGojoBlue(this, ownerIndex, this.damage);
    }

    const releaseDist = this.r + 20;
    const rx = this.x + Math.cos(this.gunAngle) * releaseDist;
    const ry = this.y + Math.sin(this.gunAngle) * releaseDist;
    spawnImpactFlash(rx, ry, 20, 'lightningTrail');

    const sound = getBasicAttackSound(21, 'gojo');
    const sndSrc = sound?.src || CONFIG.gojo?.sounds?.blueOrb || 'Assets/Sound Effects/Attacks/spaceshot.mp3';
    const sndVol = sound?.volume ?? (CONFIG.gojo?.soundVolumes?.blueOrb ?? 0.6);
    audioSystem.playSFX(sndSrc, sndVol);
  }

  triggerInfinityBlock(hitX, hitY, attacker) {
    return modTriggerInfinityBlock(this, hitX, hitY, attacker);
  }

  takeDamage(amount, attacker, opts = {}) {
    const isSpatialOrRanged = Boolean(opts.isDomain || opts.isDomainSlash || opts.isSukunaSlash || opts.isProjectile || opts.isGetsuga || opts.isFlame || opts.isDivineFlame || opts.fromDomain || opts.isTick || opts.isTickDamage || opts.isContinuous);
    const closeRangeRadius = CONFIG.gojo?.closeRangeRadius ?? 85;
    const isAttackerAmbushing = attacker && (attacker.isAmbushing || (attacker.isStealthed && !this.domainActive));
    if (!isSpatialOrRanged && !isAttackerAmbushing && (opts.isMelee || (attacker && Math.hypot(attacker.x - this.x, attacker.y - this.y) <= closeRangeRadius)) && (this.meleeModeCooldown || 0) <= 0) {
      if (!this.isMeleeMode && (this.forcedMeleeTimer || 0) <= 0) {
        this.forcedMeleeTimer = CONFIG.gojo?.initialMeleeDuration ?? 120;
        this.isMeleeMode = true;
      }
    }

    const isPurple = Boolean(opts.isPurpleDPS || opts.isPurpleExplosion || opts.isPurple || opts?.projectile?.isGojoPurple || opts?.projectile?.isGojoPurpleOrb || opts?.projectile?.behaviorType === 'gojo_purple' || opts?.projectile?.colorTheme === 'green');
    const isGuaranteedHit = Boolean(isPurple || (opts && (opts.isRatioCrit || opts.isNanamiPause || opts.undodgeable || opts.isSureKill || opts.isSaitamaCounter || opts.bypassEvade || opts.isGuaranteedHit || opts.isDomain || opts.isDomainSlash || opts.isSukunaSlash || opts.bypassShield || opts.isIsoh || opts.isAmbush || opts.isAmbushThrust || opts.isSoulSplit)) || (attacker && attacker.isAmbushing));
    const isSaitamaCountering = attacker && (attacker.characterId === 'saitama' || attacker.type === 'saitama') &&
      ((attacker._counterPunchTimer && attacker._counterPunchTimer > 0) ||
       (attacker._counterWindupTimer && attacker._counterWindupTimer > 0) ||
       (attacker._postCounterRecoveryTimer && attacker._postCounterRecoveryTimer > 0) ||
       opts.isCounter ||
       attacker.isCountering);
    const isAttackerChannelingDomain = attacker && (attacker.isChannelingDomain || attacker.isChannelingDomainExpansion);
    const isDomainChanneling = this.isDomainPreSlide || this.isChannelingDomainExpansion;
    const isBreatherState = (this.purpleRecoveryTimer || 0) > 0 || (this.purpleRetreatTimer || 0) > 0;
    if (isBreatherState || isDomainChanneling) {
      this.infinityActive = true;
      this.infinityCooldown = 0;
      this.isMeleeMode = false;
    }
    const isInsideEnemyDomain = !this.domainActive && state.fighters && state.fighters.some(f => f && f !== this && f.domainActive && f.hp > 0);
    if (!isPurple && (!this.isMeleeMode || isBreatherState || isDomainChanneling || this.domainActive) && !this.isChannelingPurple && !isSaitamaCountering && !isGuaranteedHit && !isAttackerChannelingDomain && attacker && attacker !== this && this.hp > 0 && !opts.isStorm && !opts.isDomain && !opts.bypassShield && !opts?.projectile?.infinityBypassed) {
      const freezeChance = CONFIG.gojo?.infinityFreezeChance ?? 0.90;
      const totalMahoragaStages = attacker.adaptationStage ? ((attacker.adaptationStage.melee || 0) + (attacker.adaptationStage.ranged || 0) + (attacker.adaptationStage.skill || 0)) : 0;
      const hasAdapted = attacker.gojoInfinityImmune || attacker.isMaxAdapted || attacker.isInfinityBlitz || attacker.isWallSlamActive || totalMahoragaStages >= 8;

      if (!hasAdapted && Math.random() <= freezeChance) {
        const contactX = opts?.projectile ? opts.projectile.x : (attacker.x || this.x);
        const contactY = opts?.projectile ? opts.projectile.y : (attacker.y || this.y);
        const physicalAttacker = (opts?.projectile || opts?.isProjectile || opts?.isGetsuga) ? null : attacker;
        this.triggerInfinityBlock(contactX, contactY, physicalAttacker);

        // Immediately freeze incoming projectile (such as Getsuga Tensho) in Limitless stasis
        if (opts?.projectile && !opts.projectile.infinityBypassed && !isPurple) {
          const p = opts.projectile;
          p.isFrozenByInfinity = true;
          const freezeDuration = CONFIG.gojo?.infinityFreezeDuration ?? 240;
          p.infinityFreezeTimer = freezeDuration;
          p.life = freezeDuration;
          p.maxLife = freezeDuration;
          p._resumeVx = p.vx;
          p._resumeVy = p.vy;
          p.lastAngle = (p.vx !== 0 || p.vy !== 0) ? Math.atan2(p.vy, p.vx) : (p.lastAngle !== undefined ? p.lastAngle : (p.angle || 0));
          p.angle = p.lastAngle;
          p.vx = 0;
          p.vy = 0;
          p.damage = 0; // Nullify tick damage immediately
          p.isVisual = true; // Disable all further damage collisions
          if (p.draggedTargets && p.draggedTargets.size > 0) {
            for (const [target] of p.draggedTargets.entries()) {
              if (target) {
                target.isDraggedByGetsuga = false;
                target.preventKnockbackBounce = false;
                target.z = 0;
              }
            }
            p.draggedTargets.clear();
          }
          if (p.hitTargets) {
            p.hitTargets.clear();
          }
        }
        return false;
      }
    }

    // Snapshot HP before damage so the overpowering check is accurate
    const hpBefore = this.hp;

    // Check RCT Death Save / Low HP trigger upon taking damage
    // NOTE: Purple channeling has HYPER ARMOR — super.takeDamage() calls interruptAttacks()
    // which restores isChannelingPurple via the hyper armor logic. z-reset is handled there too.
    const result = super.takeDamage(amount, attacker, opts);

    // Emergency RCT Revival check on fatal damage (once per match)
    // FATAL OVERRIDE: If the single hit alone was enough to kill Gojo (amount >= his HP before the hit),
    // or if the attack is a sure kill (Saitama counter / Serious punch), RCT is overwhelmed and he dies properly.
    if (!this.hasUsedRCTRevival && this.hp <= 0 && amount > 0 && !opts.isStorm && !opts.isHeal) {
      if (amount >= hpBefore || opts.isSaitamaCounter || opts.isSeriousPunch) {
        // Hit was strong enough to kill him outright — no revival
        return result;
      }

      this.hasUsedRCTRevival = true;
      this.isDead = false;
      const revivalAmount = CONFIG.gojo?.rctRevivalHealAmount ?? (CONFIG.gojo?.rctRevivalHealPercent ? this.maxHp * CONFIG.gojo.rctRevivalHealPercent : 150);
      this.hp = Math.min(this.maxHp, Math.max(1, revivalAmount));
      this.invincibilityTimer = 60; // 1.0s invincibility during emergency revival
      const opponent = attacker || (state.fighters ? state.fighters.find(f => f && f !== this && f.hp > 0) : null);
      this._activateReverseCursedTechnique(opponent, CONFIG.arena);
      if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 45, 'RCT REVIVAL!', '#00FF66');
      }
      return false; // Prevent death
    }

    // Low-HP RCT Healing Auto-Trigger
    // The cooldown sentinel is set immediately inside _activateReverseCursedTechnique before any logic runs,
    // so back-to-back hits in the same frame cannot double-trigger.
    if (!opts.isHeal && !opts.isSaitamaCounter && !opts.isSeriousPunch && (CONFIG.gojo?.enableRCTHeal !== false) && (this.reverseCursedTechniqueCooldown || 0) <= 0 && !this.isDead && this.hp > 0) {
      const threshold = CONFIG.gojo?.reverseCursedTechniqueHpThreshold || 0.25;
      if (this.hp / this.maxHp <= threshold) {
        const opponent = attacker || (state.fighters ? state.fighters.find(f => f && f !== this && f.hp > 0) : null);
        this._activateReverseCursedTechnique(opponent, CONFIG.arena);
      }
    }
    return result;
  }

  _applyTeleportSlideBrake(oldX, oldY, targetX, targetY, arena) {
    return modApplyTeleportSlideBrake(this, oldX, oldY, targetX, targetY, arena);
  }

  _executeTeleportDodge(attacker, arena) {
    return modExecuteTeleportDodge(this, attacker, arena);
  }

  update(opponent, ownerIndex, arena) {
    const myIdx = ownerIndex !== undefined ? ownerIndex : (state.fighters ? state.fighters.indexOf(this) : 0);
    const myTeam = (state.getFighterTeam && myIdx >= 0) ? state.getFighterTeam(myIdx) : (this.team !== undefined ? this.team : null);

    this._checkInfinityCollisions();

    // Intro Wall Rebound Stage
    if (this.introReboundActive) {
      if (this.introReboundTimer === undefined) {
        this.introReboundTimer = 18;
      }
      this.introReboundTimer--;

      if (opponent) {
        this.aim(opponent);
      }

      this.applyMovementPhysics(0);
      const didBounce = this.resolveWallBounce(arena);

      // Spawn blue afterimages for dramatic slide effect
      if (this.afterImages) {
        pushTrailCap(this.afterImages, {
          x: this.x,
          y: this.y,
          angle: this.angle,
          timer: 10,
          maxTimer: 10
        });
      }

      if (didBounce) {
        if (typeof audioSystem !== 'undefined') {
          audioSystem.playSFX('skill_dash3', 0.8);
        }
        this.introReboundActive = false;
      } else if (this.introReboundTimer <= 0) {
        this.introReboundActive = false;
      }
      return;
    }

    if (this.mahoragaAdaptationFreezeTimer > 0) {
      this.mahoragaAdaptationFreezeTimer--;
      this.vx = 0;
      this.vy = 0;
      if (this.afterImages && this.afterImages.length > 0) {
        fastCleanArray(this.afterImages, (img) => {
          img.timer--;
          return img.timer > 0;
        });
      }
      return; // Hold Gojo in stasis during Mahoraga's 3D Wheel Adaptation Game Pause!
    }
    if (this.hp <= 0) {
      if (this.isChannelingPurple) {
        this.isChannelingPurple = false;
        this._hasPlayedPurpleChannelSound = false;
        if (this._purpleChargeSoundHandle) {
          fadeOutSound(this._purpleChargeSoundHandle, 200);
          this._purpleChargeSoundHandle = null;
        }
        fadeOutSoundBySrc('mixing', 200);
      }
      return;
    }

    // ── UNLIMITED VOID: DOMAIN COOLDOWN & PROGRESSION EXCEPTION ──
    // Unlimited Void domainCooldown MUST ALWAYS tick down every frame,
    // even if Gojo is paralyzed, frozen, time-stopped, or hit by Getsuga Tensho / Beams / Stun!
    if (!this.domainActive && !this.isChannelingDomainExpansion && this.domainCooldown > 0) {
      this.domainCooldown--;
    }

    // Reverse Cursed Technique Cooldown Exception: reverseCursedTechniqueCooldown MUST ALWAYS tick down every frame,
    // even if Gojo is paralyzed, frozen, time-stopped, or hit by Getsuga Tensho / Beams / Stun!
    if (!this.isChannelingRCT && this.reverseCursedTechniqueCooldown > 0) {
      this.reverseCursedTechniqueCooldown--;
    }

    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

    // Fade afterimages every frame
    if (this.afterImages && this.afterImages.length > 0) {
      fastCleanArray(this.afterImages, (img) => {
        img.timer--;
        return img.timer > 0;
      });
    }

    // Update Sakuga impact frame & Red effect timers (must tick even during timeStop/hitStun!)
    if (this.sakugaImpactTimer > 0) {
      this.sakugaImpactTimer--;
    }
    if (this.domainActive) {
      this._applyDomainEffect();
    }

    if (this.redEffectTimer > 0) {
      this.redEffectTimer--;
      if (this.redEffectTimer <= 0) {
        this.orbTransition = 0; // Trigger smooth fade in of blue orb / hollow on hands
      }
    }
    // Check if we reached the opponent to finalize initial round-start positioning
    if (!this.initialTeleportDone && opponent && !opponent.isDead && typeof state !== 'undefined' && state.gameState === 'playing') {
      const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      const reach = this.r + opponent.r + 15;
      if (dist <= reach) {
        this.initialTeleportDone = true;
      }
    }

    if (this.domainActive && !this.isTargetOfAmbush) {
      // Ultimate Domain Advantage: Gojo cannot be frozen by Time Stop inside his own domain UNLESS caught in stealth ambush!
      this.timeStopTimer = 0; 
    }

    if ((this.isChannelingPurple || this.isChannelingDomainExpansion || this.redEffectTimer > 0 || this.redBuildupPhase) && !this.isTargetOfAmbush && (this.silenceTimer || 0) <= 0) {
      // Unstoppable Hyper-Armor during Purple Channeling, Domain Channeling & Red Buildup: Clear hitStun & status freezes so non-Toji attacks cannot interrupt!
      this.hitStunTimer = 0;
      this.electricStunTimer = 0;
      this.dubstepStunTimer = 0;
      this.crimsonElectrifiedTimer = 0;
      this.timeStopTimer = 0;
      this.purpleHitTimer = 0;
      this.isCaughtInPurple = false;
      this.caughtInPureLoveBeam = false;
      this.pureLoveBeamTimer = 0;
      this._hitByGetsugaTimer = 0;
      this.paralyzeTimer = 0;
      this.isParalyzed = false;
      this.isParalyzedByMahito = false;
      this.isParalyzedByMahoraga = false;
      this.isWallSlammed = false;
    }

    const isGetsugaSuppressed = Boolean(this.isDraggedByGetsuga || (this._hitByGetsugaTimer && this._hitByGetsugaTimer > 0) || isSuppressedByGetsuga(this));
    const isFrozen = this._handleTimeStop() || this.isTargetOfAmbush || (this.purpleHitTimer && this.purpleHitTimer > 0) || this.isFrozenByInfinity || isGetsugaSuppressed;
    if (isFrozen) {
      this.z = 0;
      if (this.isDomainPreSlide) {
        this.isDomainPreSlide = false;
        this.domainPreSlideTimer = 0;
      }
      if (this.isChannelingDomainExpansion) {
        this.isChannelingDomainExpansion = false;
        this.domainChargeTimer = 0;
      }
      if (this.isChannelingPurple) {
        this.isChannelingPurple = false;
        this.purpleChargeTimer = 0;
        this._hasPlayedPurpleChannelSound = false;
        if (this._purpleChargeSoundHandle) {
          fadeOutSound(this._purpleChargeSoundHandle, 200);
          this._purpleChargeSoundHandle = null;
        }
        fadeOutSoundBySrc('mixing', 200);
      }
      // Rule #1: Cancel active channeling/skills
      this.interruptAttacks();
      if (isGetsugaSuppressed) {
        // Rule #3: Keep facing direction tracking target while dragged
        if (opponent && !opponent.isDead) {
          const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
          this.gunAngle = targetAngle;
          this.angle = targetAngle;
        }
      }
      return; // MANDATORY: Stop update execution so fighter is frozen/carried!
    }

    if (this.redEffectTimer > 0) {
      // Buildup phase: freeze nearby enemies in place (near-zero slow)
      const RED_BUILDUP_FRAMES = CONFIG.gojo.redBuildupFrames || 100;
      const redRemaining = this.redEffectTimer;
      const redMax = this.redEffectMaxTimer;
      if (this.redBuildupPhase && redRemaining > redMax - RED_BUILDUP_FRAMES) {
        
        // Dynamically track target so Red fires in the correct direction
        if (this._redTargetRef && this._redTargetRef.hp > 0) {
          this.redTargetAngle = Math.atan2(this._redTargetRef.y - this.y, this._redTargetRef.x - this.x);
        } else {
          // Fallback if target died or didn't exist
          const myTeam = state.getFighterTeam(state.fighters ? state.fighters.indexOf(this) : 0);
          let newTarget = null;
          state.fighters.forEach((f, idx) => {
            if (f && f !== this && f.hp > 0) {
              const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
              if (isEnemy) {
                const dist = Math.hypot(f.x - this.x, f.y - this.y);
                if (!newTarget || dist < Math.hypot(newTarget.x - this.x, newTarget.y - this.y)) {
                  newTarget = f;
                }
              }
            }
          });
          if (newTarget) {
            this._redTargetRef = newTarget;
            this.redTargetAngle = Math.atan2(newTarget.y - this.y, newTarget.x - this.x);
          }
        }

      }

      // Detonation threshold — trigger exactly once when buildup window ends
      if (this.redBuildupPhase && redRemaining <= redMax - RED_BUILDUP_FRAMES && !this.redDetonated) {
        this.redBuildupPhase = false;
        this._detonateRed();
      }
    }
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.infinityBlockTimer > 0) {
      this.infinityBlockTimer--;
    }

    // Update punch effects & hit flame wisps so they animate even during hit pause
    if (this.punchEffects && this.punchEffects.length > 0) {
      fastCleanArray(this.punchEffects, (p) => {
        p.timer--;
        return p.timer > 0;
      });
    }

    if (this.hitFlameWisps && this.hitFlameWisps.length > 0) {
      fastCleanArray(this.hitFlameWisps, (wisp, i) => {
        wisp.x += wisp.vx;
        wisp.y += wisp.vy;
        wisp.vy -= 0.18; // Soft upward flame buoyancy
        wisp.angle += Math.sin(wisp.timer * 0.25 + i * 1.7) * 0.05; // Fluid curling sway
        wisp.vx *= 0.90;
        wisp.vy *= 0.90;
        wisp.timer--;
        return wisp.timer > 0;
      });
    }

    if (!this.isChannelingDomainExpansion) this._hasPlayedDomainChannelSound = false;
    if (!this.isChannelingPurple) this._hasPlayedPurpleChannelSound = false;
    if (this.redEffectTimer <= 0) this._hasPlayedRedChannelingSound = false;

    if (this.forcedMeleeTimer > 0) this.forcedMeleeTimer--;
    if (this.meleeModeCooldown > 0) this.meleeModeCooldown--;
    if (this.meleeClashCooldown > 0) this.meleeClashCooldown--;
    if (this.dodgeCooldown > 0) this.dodgeCooldown--;
    if (this.hitStunTimer > 0) this.hitStunTimer--;

    // ── Passive Six Eyes RCT Brain Refresh (Disabled — RCT only triggers at low HP threshold) ──
    if (CONFIG.gojo?.enablePassiveRctRegen === true && this.hp > 0 && this.hp < this.maxHp && !this.isDead) {
      const passiveRate = CONFIG.gojo?.passiveRctHealRate || 0;
      if (passiveRate > 0) {
        this.hp = Math.min(this.maxHp, this.hp + passiveRate);
      }
    }

    // In Ranged Mode (when not in melee mode), Gojo's Limitless Infinity barrier is ALWAYS active!
    if (!this.isMeleeMode && !this.isTargetOfAmbush && this.hp > 0) {
      this.infinityActive = true;
      this.infinityCooldown = 0;
      this.infinityActiveTimer = 0;
    }

    const isDomainChanneling = this.isDomainPreSlide || this.isChannelingDomainExpansion;
    const isBreatherState = (this.purpleRecoveryTimer || 0) > 0 || (this.purpleRetreatTimer || 0) > 0;
    if (isBreatherState || isDomainChanneling) {
      this.infinityActive = true;
      this.infinityCooldown = 0;
      this.isMeleeMode = false;
    }

    // Smooth fade-in & fade-out for Limitless Infinity barrier visuals
    const isSaitamaCounterActive = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => 
      f && (f.characterId === 'saitama' || f.type === 'saitama') && 
      ((f._counterPunchTimer && f._counterPunchTimer > 0) || 
       (f._postCounterRecoveryTimer && f._postCounterRecoveryTimer > 0) || 
       (f._counterWindupTimer && f._counterWindupTimer > 0) ||
       f.isCountering)
    );
    const isUnderAmbush = Boolean(this.isTargetOfAmbush || this.caughtInSaitamaCounter || isSaitamaCounterActive);

    // Detect if Gojo is inside an ENEMY's domain (not his own)
    const isInsideEnemyDomain = !this.domainActive && state.fighters && state.fighters.some(f => f && f !== this && f.domainActive && f.hp > 0);

    // Force Infinity active inside enemy domains only when NOT in melee mode
    if (isInsideEnemyDomain && !isUnderAmbush && !this.isMeleeMode) {
      this.infinityActive = true;
      this.infinityCooldown = 0;
    }

    const barrierShouldBeActive = !isUnderAmbush && (!this.isMeleeMode || isBreatherState || isDomainChanneling) && !this.isChannelingPurple && !this.domainActive && this.hp > 0;
    if (barrierShouldBeActive) {
      this.infinityFadeOpacity = Math.min(1.0, (this.infinityFadeOpacity || 0) + 0.05); // ~20 frames smooth fade-in
    } else {
      this.infinityFadeOpacity = isUnderAmbush ? 0 : Math.max(0.0, (this.infinityFadeOpacity || 0) - 0.08); // ~12 frames smooth fade-out
    }

    if (isUnderAmbush) {
      this.infinityBlockTimer = 0;
    }

    if (this.teleportSlideTimer > 0) {
      this.teleportSlideTimer--;
      this.vx *= 0.64;
      this.vy *= 0.64;
    }

    if (this.afterImages && this.afterImages.length > 0) {
      fastCleanArray(this.afterImages, (img) => {
        img.timer--;
        return img.timer > 0;
      });
    }

    // Distance check to closest opponent for melee range combat aura
    const meleeDistanceThreshold = 220;
    let inMeleeRange = false;
    if (state.fighters) {
      state.fighters.forEach((f, idx) => {
        if (f && f !== this && f.hp > 0) {
          const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
          if (isEnemy && Math.hypot(f.x - this.x, f.y - this.y) <= meleeDistanceThreshold) {
            inMeleeRange = true;
          }
        }
      });
    }
    this.inMeleeRange = inMeleeRange;

    // Smooth fade IN & fade OUT for Cursed Energy combat aura
    if (this.combatAuraOpacity === undefined) this.combatAuraOpacity = 0;
    if (state.gameState === 'countdown') {
      // Keep aura at full opacity during countdown for dramatic effect
      this.combatAuraOpacity = 1.0;
    } else if (this.isChannelingPurple) {
      // Smoothly fade OUT body aura while mixing Red & Blue into Purple (focusing energy into the orbs)
      this.combatAuraOpacity = Math.max(0, this.combatAuraOpacity - 0.05);
    } else if (this.inMeleeRange || this.forcedMeleeTimer > 0 || this.domainActive || this.postDomainFadeInTimer > 0) {
      // Fade IN smoothly (+0.08 per frame) when in melee, domain active, or during post-domain fade-in
      this.combatAuraOpacity = Math.min(1.0, this.combatAuraOpacity + 0.08);
    } else {
      // Fade OUT smoothly (-0.035 per frame)
      this.combatAuraOpacity = Math.max(0, this.combatAuraOpacity - 0.035);
    }

    // Countdown post-domain fade-in timer
    if (this.postDomainFadeInTimer > 0) {
      this.postDomainFadeInTimer--;
    }

    if (this.infinityCooldown > 0) {
      this.infinityCooldown--;
      if (this.infinityCooldown <= 0) this.infinityActive = true;
    }

    // Decrement skill cooldowns (Red, Purple, RCT, Blue, Domain, Melee) when not afflicted with paralyze debuff
    // Skill CDs are FROZEN while Gojo's Domain Expansion (Unlimited Void) is active
    if (!this.isParalyzedDebuffActive() && !this.domainActive) {
      if (this.cooldown > 0) this.cooldown--;
      if ((this.redEffectTimer || 0) <= 0 && this.redCooldown > 0) this.redCooldown--;
      if (!this.isChannelingPurple && (this.purpleRecoveryTimer || 0) <= 0 && this.purpleCooldown > 0) this.purpleCooldown--;
      if (this.healingAuraTimer > 0) this.healingAuraTimer--;
      if (this.forcedMeleeTimer > 0) this.forcedMeleeTimer--;
      if (this.meleeModeCooldown > 0) this.meleeModeCooldown--;
      if (this.teleportChaseDelayTimer > 0) this.teleportChaseDelayTimer--;
      if (this.meleeClashCooldown > 0) this.meleeClashCooldown--;
      if (this.teleportDodgeCooldown > 0) this.teleportDodgeCooldown--;
    }
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;

    // Immobilize Gojo if he is actively caught in an ambush sequence or Saitama counter
    if (this.isTargetOfAmbush || this.caughtInSaitamaCounter) {
      this.vx = 0;
      this.vy = 0;
      return; // Immobilize AI & abilities while actively caught in ambush stasis
    }

    // Check for Reverse Cursed Technique (Self heal at low HP)
    this._checkReverseCursedTechnique(opponent, arena);

    // Domain active state
    if (this.domainActive) {
      this.domainTimer--;
      if (this.domainTimer <= 0) {
        this.domainActive = false;
        this.forcedMeleeTimer = 0; // Release forced melee lock so Gojo can move freely again!
        this.isMeleeMode = false;
        this.meleeModeCooldown = CONFIG.gojo?.meleeModeCooldown ?? CONFIG.gojo?.meleeModeSeparationCooldown ?? 120; // Enforce separation
        this.postDomainFadeInTimer = 90; // ~1.5 seconds of fade-in after domain ends

        // Unfreeze all enemy fighters when Gojo's domain expires and apply slow movement debuff!
        const slowDur = CONFIG.gojo?.domainPostSlowDuration ?? 180; // 3.0s slow
        const slowMult = CONFIG.gojo?.domainPostSlowMultiplier ?? 0.35; // 35% movement speed

        if (state.fighters) {
          state.fighters.forEach(f => {
            if (f && f !== this && f.hp > 0) {
              const isEnemy = myTeam === null || (state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(f)) !== myTeam : f.team !== this.team);
              f.timeStopTimer = 0;
              f.hitStunTimer = 0;
              delete f._timeStopOriginalDuration;
              delete f._timeStopStartTime;
              delete f._timeStopFrozenAngle;
              delete f._timeStopFrozenGunAngle;

              if (isEnemy && (!f.domainImmunity && !f.gojoDomainAdapted && !f.gojoAdapted?.domain && f.characterId !== 'toji' && f.type !== 'toji')) {
                if (typeof f.applySlow === 'function') {
                  f.applySlow(slowDur, slowMult, { isDomainSlow: true });
                } else {
                  f.slowTimer = Math.max(f.slowTimer || 0, slowDur);
                  f.slowMultiplier = Math.min(f.slowMultiplier || 1.0, slowMult);
                }
                if (typeof spawnFloatingText === 'function') {
                  spawnFloatingText(f.x, f.y - f.r - 20, 'SLOWED!', '#BF5AF2', 20);
                }
              }
            }
          });
        }
        if (state.illusions) {
          state.illusions.forEach(ill => {
            if (ill && ill.owner !== this && ill.hp > 0) {
              ill.timeStopTimer = 0;
              ill.hitStunTimer = 0;
              if (typeof ill.applySlow === 'function') {
                ill.applySlow(slowDur, slowMult, { isDomainSlow: true });
              } else {
                ill.slowTimer = Math.max(ill.slowTimer || 0, slowDur);
                ill.slowMultiplier = Math.min(ill.slowMultiplier || 1.0, slowMult);
              }
            }
          });
        }
      } else {
        // Force hand-to-hand combat during domain expansion!
        this.isMeleeMode = true;
        this.forcedMeleeTimer = Math.max(this.forcedMeleeTimer, 30);
        this.meleeModeCooldown = 0;
        this._applyDomainEffect();
      }
    }

    // Stop attacking if round/match has ended or if all enemies are dead!
    // IMPORTANT: Never interrupt mid-channel (Red buildup or Purple charge) as it would silence their charge audio.
    const isGamePlaying = typeof state !== 'undefined' && state.gameState === 'playing';
    let hasLivingEnemies = opponent && !opponent.isDead && opponent.hp > 0;
    if (!hasLivingEnemies && state.fighters) {
      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (f && f !== this && f.hp > 0) {
          const isEnemy = myTeam === null || (state.getFighterTeam ? state.getFighterTeam(i) !== myTeam : f.team !== this.team);
          if (isEnemy) {
            hasLivingEnemies = true;
            break;
          }
        }
      }
    }

    if (!isGamePlaying || !hasLivingEnemies) {
      this.interruptAttacks(false); // Cancel channeling skills without hard-canceling punch animation
      if (this.punchAnimTimer > 0) this.punchAnimTimer--;
      this.shootCooldown = 60;
      this.applyMovementPhysics();
      this.resolveWallBounce(arena);
      return;
    }

    // Check for Domain Expansion (Ultimate - disabled in demo preview mode)
    const isSilenced = (this.silenceTimer || 0) > 0;

    // Handle Pre-Domain Slide Phase (smooth slide before stopping to channel)
    if (this.isDomainPreSlide) {
      this.hitStunTimer = 0; // Hyper-armor while preparing Domain Expansion
      if (isSilenced && this.isTargetOfAmbush) {
        this.isDomainPreSlide = false;
        this.domainPreSlideTimer = 0;
        this.domainCooldown = CONFIG.gojo?.domainCooldown || 2000;
        return;
      }

      this.domainPreSlideTimer--;

      // Smooth friction deceleration towards full stop
      this.vx *= 0.82;
      this.vy *= 0.82;
      this.x += this.vx;
      this.y += this.vy;

      if (opponent && !opponent.isDead) {
        this.aim(opponent);
      }

      if (this.afterImages && this.domainPreSlideTimer % 2 === 0) {
        pushTrailCap(this.afterImages, {
          x: this.x,
          y: this.y,
          angle: this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0),
          timer: 12,
          maxTimer: 12
        }, CONFIG.gojo?.afterImageCap || 12);
      }

      if (Math.hypot(this.vx, this.vy) > 0.3 && typeof spawnSparks === 'function' && this.domainPreSlideTimer % 2 === 0) {
        spawnSparks(this.x, this.y, 1, 'blue');
      }

      this.resolveWallBounce(arena);

      if (this.domainPreSlideTimer <= 0) {
        this.isDomainPreSlide = false;
        this.vx = 0;
        this.vy = 0;

        // Slide complete -> Stop move -> Channel Domain (facing camera/player)
        this.isChannelingDomainExpansion = true;
        this.domainChargeTimer = 0;
        this.gunAngle = Math.PI / 2;
        this.angle = Math.PI / 2;
        this._domainChannelAngle = Math.PI / 2;
        this._playedDeployAudio = false;
        if (!this._hasPlayedDomainChannelSound) {
          this._hasPlayedDomainChannelSound = true;
          const channelSound = getSkillSound(this._def?.id, 'domain_channel');
          const chanSrc = channelSound?.src || CONFIG.gojo?.sounds?.domainChannel || 'Assets/Sound Effects/Skills/gojodomain.mp3';
          const chanVol = channelSound?.volume ?? (CONFIG.gojo?.soundVolumes?.domainChannel ?? 5.0);
          audioSystem.playSFX(chanSrc, chanVol);
        }
      }
      return;
    }

    if (!this.isDemoFighter && !isSilenced && !this.isChannelingAnySkill() && !this.domainActive && this.domainCooldown <= 0 && this.domainUseCount < 2 && opponent && !opponent.isDead && this.forcedMeleeTimer <= 0) {
      // Initiate smooth Pre-Domain Slide Phase before stopping to channel
      this.isDomainPreSlide = true;
      this.domainPreSlideTimer = 18; // ~18 frames smooth glide deceleration

      // Calculate directional slide vector towards/past opponent
      const slideAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      const currentSpeed = Math.hypot(this.vx, this.vy);
      const initialSpeed = Math.max(9.5, currentSpeed * 1.5);
      this.vx = Math.cos(slideAngle) * initialSpeed;
      this.vy = Math.sin(slideAngle) * initialSpeed;

      const dashSnd = CONFIG.gojo?.sounds?.teleportDash || 'skill_dash3';
      const dashVol = CONFIG.gojo?.soundVolumes?.teleportDash ?? 0.6;
      audioSystem.playSFX(dashSnd, dashVol);
      return;
    }

    // Handle Domain Expansion Channeling (locked stance in hand sign pose after stopping)
    if (this.isChannelingDomainExpansion) {
      this.hitStunTimer = 0; // Absolute Hyper-Armor while channeling Unlimited Void!
      if (isSilenced && this.isTargetOfAmbush) {
        this.isChannelingDomainExpansion = false;
        this.domainChargeTimer = 0;
        this.domainCooldown = CONFIG.gojo?.domainCooldown || 1500;
        return;
      }
      this.domainChargeTimer++;

      // Complete stop during hand sign channeling stance
      this.vx = 0;
      this.vy = 0;

      // Lock stance facing camera/player while channeling domain expansion
      this.gunAngle = Math.PI / 2;
      this.angle = Math.PI / 2;

      if (this.domainChargeTimer >= this.domainChargeMax) {
        this.isChannelingDomainExpansion = false;
        this._activateDomain(arena);
      }

      this.resolveWallBounce(arena);
      return;
    }

    // Check for Hollow Purple (Skill)
    // Don't cast if Sukuna is already channeling Fuga to prevent simultaneous freezes
    if (!this.isChannelingAnySkill() && this.purpleCooldown <= 0 && opponent && this.forcedMeleeTimer <= 0 && !opponent.isChannelingDivineFlame) {
      if (opponent && !opponent.isDead) {
        super.aim(opponent); // Aim at target once at cast start
      }
      this.purpleCastAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
      this.isChannelingPurple = true;
      this.is200PercentChannel = (this.purpleUseCount === 1);
      const baseCharge = CONFIG.gojo?.purpleChargeMax || 120;
      const secondCastCharge = CONFIG.gojo?.purpleSecondCastChargeMax || 180;
      this.purpleChargeMax = this.is200PercentChannel ? secondCastCharge : baseCharge;
      this.isMeleeMode = false; // Disengage melee mode while channeling Hollow Purple!
      this.purpleChargeTimer = 0;
      spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 20, 'HOLLOW PURPLE', '#8A2BE2');

        if (!this._hasPlayedPurpleChannelSound) {
          this._hasPlayedPurpleChannelSound = true;
          const sound = getSkillSound(this._def?.id, 'purple_charge');
          const chargeSrc = sound?.src || CONFIG.gojo?.sounds?.purpleCharge || 'Assets/Sound Effects/Skills/mixing.mp3';
          const chargeVol = sound?.volume ?? (CONFIG.gojo?.soundVolumes?.purpleCharge ?? 5.0);
          const delayMs = Math.max(0, ((sound?.delay !== undefined ? sound.delay : (CONFIG.gojo?.soundDelays?.purpleCharge || 0)) || 0) * 1000);
          if (delayMs > 0) {
            setTimeout(() => {
              if (this.isChannelingPurple && this.hp > 0) {
                this._purpleChargeSoundHandle = audioSystem.playSFX(chargeSrc, chargeVol);
              }
            }, delayMs);
          } else {
            this._purpleChargeSoundHandle = audioSystem.playSFX(chargeSrc, chargeVol);
          }
        }
      }

    // Handle Purple Channeling
    if (this.isChannelingPurple) {
      this.purpleChargeTimer++;

      // 1. Instantly stop all movement when starting Red + Blue mix
      this.vx = 0;
      this.vy = 0;
      this.applyMovementPhysics(0);

      // Play flare sound exactly when the flare shows up (at 50% progress)
      const flareTriggerFrame = Math.floor(this.purpleChargeMax * 0.5);
      if (this.purpleChargeTimer === flareTriggerFrame) {
        audioSystem.playSFX('effect_flare', 0.85);
      }

      // Play purple deploy sound when Red & Blue have merged and Purple is about to fire (at 75% progress)
      const deployTriggerFrame = Math.floor(this.purpleChargeMax * 0.75);
      if (this.purpleChargeTimer === deployTriggerFrame) {
        const sDeploy = getSkillSound(this._def?.id, 'purple_deploy');
        const deploySrc = sDeploy?.src || CONFIG.gojo?.sounds?.purpleDeploy || 'Assets/Sound Effects/Skills/purpledeploy.mp3';
        const deployVol = sDeploy?.volume ?? (CONFIG.gojo?.soundVolumes?.purpleDeploy ?? 2.5);
        audioSystem.playSFX(deploySrc, deployVol);
      }

      // 2. Levitation: Gojo rises smoothly in the air as Red and Blue mix
      const levitateProgress = Math.min(1.0, this.purpleChargeTimer / (this.purpleChargeMax * 0.4));
      const maxLevitationHeight = 35;
      this.z = Math.sin(levitateProgress * Math.PI * 0.5) * maxLevitationHeight;

      // Centralized smooth aim rotation while channeling Hollow Purple (continuous tracking without snapping)
      const aimTarget = (opponent && !opponent.isDead && opponent.hp > 0) ? opponent : (typeof this._findClosestEnemy === 'function' ? this._findClosestEnemy() : null);
      if (aimTarget && aimTarget.hp > 0) {
        this.aim(aimTarget);
        this.purpleCastAngle = this.gunAngle;
      }

      if (opponent && !opponent.isDead) {
        // Lapse Blue Gravitational Distortion: Slows opponent movement while mixing Red & Blue into Purple!
        if (!opponent.immuneToCC) {
          if (typeof opponent.applySlow === 'function') {
            opponent.applySlow(10, 0.50);
          } else {
            opponent.slowTimer = 10;
            opponent.slowMultiplier = 0.50;
          }
        }
      }

      if (this.purpleChargeTimer >= this.purpleChargeMax) {
        this._firePurple(ownerIndex);
      }

      this.resolveWallBounce(arena);
      return; // Don't do basic attacks while channeling
    }

    // Post-fire breather removed per user request: Gojo does not freeze or catch his breath after Purple
    if (this.purpleRecoveryTimer > 0) {
      this.purpleRecoveryTimer = 0;
      this.z = 0;
    }

    // 3. Handle Mode Switch Breather (Gojo no longer freezes movement when switching to Ranged mode)
    if (this.modeSwitchBreatherTimer > 0) {
      this.modeSwitchBreatherTimer--;
    }

    // Handle RCT Channeling (Reverse Cursed Technique - 2.5 seconds heal duration)
    if (this.isChannelingRCT) {
      this.rctChannelTimer--;

      // Gradually heal over the channel duration (0 when instant heal was already applied)
      const totalRctAmount = CONFIG.gojo?.reverseCursedTechniqueHealAmount ?? (CONFIG.gojo?.reverseCursedTechniqueHealPercent ? this.maxHp * CONFIG.gojo.reverseCursedTechniqueHealPercent : 125);
      const healPerFrame = this._rctHealPerFrame ?? (totalRctAmount / 90);
      if (healPerFrame > 0) {
        this.takeDamage(-healPerFrame, this, { isHeal: true });
      }

      // Spawn continuous green healing particles while channeling RCT
      if (Math.random() < 0.5) {
        const angle = Math.random() * Math.PI * 2;
        const dist = this.r * (0.4 + Math.random() * 0.8);
        const px = this.x + Math.cos(angle) * dist;
        const py = this.y + Math.sin(angle) * dist;
        spawnSparks(px, py, 2, 'healing');
      }

      if (opponent && !opponent.isDead) {
        this.aim(opponent);
      }

      if (this.rctChannelTimer <= 0) {
        this.isChannelingRCT = false;
      }
    }

    // Check for Red (Close-range repel: holds Red ready until an enemy gets nearby)
    if (!this.isChannelingAnySkill() && this.redCooldown <= 0 && this.forcedMeleeTimer <= 0) {
      const triggerRange = CONFIG.gojo.redTriggerRange || 280;
      let hasNearbyEnemy = false;

      if (state.fighters) {
        for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          if (f && f !== this && f.hp > 0 && (!f.isStealthed || this.domainActive)) {
            const isEnemy = myTeam === null || state.getFighterTeam(i) !== myTeam;
            if (isEnemy) {
              const distSq = (this.x - f.x) ** 2 + (this.y - f.y) ** 2;
              if (distSq <= triggerRange ** 2) {
                hasNearbyEnemy = true;
                break;
              }
            }
          }
        }
      }

      if (hasNearbyEnemy) {
        this._activateRed();
      }
    }

    // Handle Reversal Red Channeling & Buildup (Gojo stops completely to cast Red)
    if (this.redEffectTimer > 0) {
      this.vx = 0;
      this.vy = 0;
      this.applyMovementPhysics(0);
      if (opponent && !opponent.isDead) {
        this.aim(opponent);
      }
      this.resolveWallBounce(arena);
      return; // Stop basic attacks, melee punches, and mode switches until Red finishes!
    }

    // Delete enemy projectiles if Purple is active
    this._deleteEnemyProjectilesInPurple();

    // Check if ANY enemy is currently meleeing Gojo or in direct punch contact
    let isBeingMeleed = false;
    let closestEnemyDist = Infinity;
    const closeRangeRadius = CONFIG.gojo?.closeRangeRadius ?? 85;
    const leaveMeleeRadius = closeRangeRadius + 30;

    if (state.fighters && state.fighters.length > 0) {
      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (!f || f === this || f.hp <= 0 || (f.isStealthed && !this.domainActive)) continue;
        const isEnemy = myTeam === null || state.getFighterTeam(i) !== myTeam;
        if (!isEnemy) continue;

        const d = Math.hypot(this.x - f.x, this.y - f.y);
        if (d < closestEnemyDist) closestEnemyDist = d;

        if (d <= closeRangeRadius) {
          isBeingMeleed = true;
          break;
        }
      }
    }

    // Switch modes based on distance & melee engagement (only when not in special states)
    if (!this.isTeleporting && !this.isChannelingPurple && !this.isPurpleActive()) {
      if (this.domainActive) {
        this.isMeleeMode = true; // Always force melee mode during Domain Expansion
      } else if (opponent && (opponent.isStealthed || opponent.isAmbushing) && !this.domainActive) {
        // Disengage from melee combat while opponent is in stealth or ambush mode so Gojo moves and can dodge
        this.isMeleeMode = false;
        this.forcedMeleeTimer = 0;
      } else if (this.meleeModeCooldown > 0) {
        // MANDATORY RANGED SEPARATION: strictly stay in Ranged Mode until cooldown expires!
        if (this.isMeleeMode) {
          this.isMeleeMode = false;
          this.forcedMeleeTimer = 0;
        }
      } else if (this.isMeleeMode) {
        // Gojo is currently in Melee Mode: Check if duration expired or enemy moved far away
        if (this.forcedMeleeTimer <= 0) {
          // DURATION EXPIRED: Disengage to Ranged Mode and start separation cooldown!
          this.isMeleeMode = false;
          this.meleeModeCooldown = CONFIG.gojo?.meleeModeCooldown ?? 120;
        } else if (closestEnemyDist > leaveMeleeRadius) {
          // Enemy left melee range early: Disengage to Ranged Mode
          this.isMeleeMode = false;
          this.forcedMeleeTimer = 0;
          this.meleeModeCooldown = CONFIG.gojo?.meleeModeCooldown ?? 120;
        }
      } else if (isBeingMeleed && this.meleeModeCooldown <= 0) {
        // Cooldown is READY and enemy is in melee range: ENTER MELEE MODE!
        this.isMeleeMode = true;
        this.forcedMeleeTimer = CONFIG.gojo?.initialMeleeDuration ?? 120;
      }
    }

    // Smooth transition for blue orb / fists
    if (this.isMeleeMode) {
      this.orbTransition = Math.max(0, (this.orbTransition !== undefined ? this.orbTransition : 1) - 0.1);
    } else {
      this.orbTransition = Math.min(1, (this.orbTransition !== undefined ? this.orbTransition : 0) + 0.1);
    }

    const canAct = (!this.hitStunTimer || this.hitStunTimer <= 0) && (!this.timeStopTimer || this.timeStopTimer <= 0) && (this.purpleRecoveryTimer <= 0) && !this.isChannelingPurple && !this.isChannelingDomainExpansion && !this.redBuildupPhase;
    let speedMult = 1.0;

    if (this.isMeleeMode) {
      if (this.domainActive && opponent && !opponent.isDead) {
        // DURING DOMAIN EXPANSION: Gojo teleports from angle to angle delivering relentless strikes!
        const dx = opponent.x - this.x;
        const dy = opponent.y - this.y;
        const dist = Math.hypot(dx, dy);
        const punchReach = this.r + (opponent.r || 25) + 35;

        if (dist > punchReach) {
          // If out of reach, instantly flash-teleport to target's flank angle!
          this._teleportToDomainAngle(opponent, arena);
        } else {
          this.vx = 0;
          this.vy = 0;
        }

        speedMult = 0;

        if (canAct) {
          this._updateMeleeCombat(opponent, arena);
        }
      } else {
        // Regular Melee Mode: Gojo moves naturally while brawling
        speedMult = 1.0;
        if (canAct && opponent && !opponent.isDead) {
          const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
          const minDistance = this.r + opponent.r + 2;

          if (dist < minDistance) {
            // Contact Repulsion Buffer: Push Gojo back slightly ONLY if he physically clips inside target circle
            const pushX = (this.x - opponent.x) / (dist || 1);
            const pushY = (this.y - opponent.y) / (dist || 1);
            this.vx = pushX * 2.0;
            this.vy = pushY * 2.0;
          }
        }
        if (canAct) {
          this._updateMeleeCombat(opponent, arena);
        }
      }
    } else {
      // Ranged Mode - Natural movement without teleport slide freezes
      speedMult = 1.0;

      // Ranged Mode - Basic attack with blue orbs (Paused during active Purple duration, resumes immediately when Purple ends)
      if (this.isPurpleActive()) {
        this.shootCooldown = Math.max(this.shootCooldown || 0, 10);
      } else if (this.shootCooldown > 0) {
        this.shootCooldown--;
      } else if (canAct) {
        this.shoot(ownerIndex);
        this.shootCooldown = this.shootCooldownMax;
      }
    }

    // Hard-stop Gojo's velocity immediately when the orb starts building
    if (this.redBuildupPhase) {
      this.vx *= 0.05;
      this.vy *= 0.05;
      speedMult = 0;
    }
    this.applyMovementPhysics(speedMult);

    if (opponent && !opponent.isDead && !this.isTargetOfAmbush && (this.timeStopTimer || 0) <= 0) {
      this.aim(opponent);
    }

    // Update afterimages
    if (this.afterImages && this.afterImages.length > 0) {
      fastCleanArray(this.afterImages, (img) => {
        img.timer--;
        return img.timer > 0;
      });
    }

    // Update punch effects
    if (this.punchEffects && this.punchEffects.length > 0) {
      fastCleanArray(this.punchEffects, (p) => {
        p.timer--;
        return p.timer > 0;
      });
    }

    this.resolveWallBounce(arena);
  }

  /**
   * Domain Expansion Flurry: Teleports Gojo instantly to a fresh angle around the target
   */
  _teleportToDomainAngle(opponent, arena) {
    if (!opponent || opponent.isDead || this.isTargetOfAmbush || (this.timeStopTimer || 0) > 0) return;

    const oldX = this.x;
    const oldY = this.y;

    const angles = [
      0,                  // 3 o'clock (Right)
      Math.PI,            // 9 o'clock (Left)
      -Math.PI * 0.5,     // 12 o'clock (Top)
      Math.PI * 0.5,      // 6 o'clock (Bottom)
      -Math.PI * 0.75,    // 10:30 (Upper-Left)
      Math.PI * 0.25,     // 4:30 (Lower-Right)
      -Math.PI * 0.25,    // 1:30 (Upper-Right)
      Math.PI * 0.75      // 7:30 (Lower-Left)
    ];

    if (this._domainAngleIndex === undefined) {
      this._domainAngleIndex = Math.floor(Math.random() * angles.length);
    } else {
      // Pick a distinct next angle across the circle
      this._domainAngleIndex = (this._domainAngleIndex + 1 + Math.floor(Math.random() * (angles.length - 2))) % angles.length;
    }

    const baseAngle = angles[this._domainAngleIndex] + (Math.random() - 0.5) * 0.2;
    const offsetDist = (opponent.r || 25) + this.r + 14;

    let targetX = opponent.x + Math.cos(baseAngle) * offsetDist;
    let targetY = opponent.y + Math.sin(baseAngle) * offsetDist;

    if (arena) {
      if (arena.shape === 'circle') {
        const acx = arena.x + arena.width / 2;
        const acy = arena.y + arena.height / 2;
        const ar = Math.max(10, (arena.radius || (arena.width / 2)) - this.r);
        const cdx = targetX - acx;
        const cdy = targetY - acy;
        const cdist = Math.hypot(cdx, cdy);
        if (cdist > ar && cdist > 0) {
          targetX = acx + (cdx / cdist) * ar;
          targetY = acy + (cdy / cdist) * ar;
        }
      } else {
        targetX = Math.max(arena.x + this.r, Math.min(arena.x + arena.width - this.r, targetX));
        targetY = Math.max(arena.y + this.r, Math.min(arena.y + arena.height - this.r, targetY));
      }
    }

    this._applyTeleportSlideBrake(oldX, oldY, targetX, targetY, arena);
    this.aim(opponent);
    if (typeof opponent.aim === 'function' && !opponent.isTargetOfAmbush && (opponent.timeStopTimer || 0) <= 0) {
      opponent.aim(this);
    }

    spawnImpactFlash(oldX, oldY, 25, 'lightningTrail');
    spawnImpactFlash(this.x, this.y, 25, 'lightningTrail');
    spawnSparks(this.x, this.y, 10, 'lightningTrail', '#00FFFF');
    const dashSnd = CONFIG.gojo?.sounds?.teleportDash || 'skill_dash3';
    const dashVol = CONFIG.gojo?.soundVolumes?.teleportDash ?? 0.8;
    audioSystem.playSFX(dashSnd, dashVol);
  }

  _applyTeleportSlideBrake(oldX, oldY, targetX, targetY, arena) {
    modApplyTeleportSlideBrake(this, oldX, oldY, targetX, targetY, arena);
  }

  /**
   * Handle melee combat - teleports, then 1 punch (65% chance) or 3 rapid punches (35% chance)
   */
  _updateMeleeCombat(opponent, arena) {
    if (this.isChannelingPurple || this.isChannelingDomainExpansion || this.redBuildupPhase || this.isCaughtInBeam() || this.isPurpleActive()) {
      this.vx = 0;
      this.vy = 0;
      this.punchAnimTimer = 0;
      this.punchActiveMaxTime = 0;
      return; // Do NOT melee punch or teleport while channeling Hollow Purple or while Purple is active!
    }

    // Dynamic target selection in 1v2 / multi-enemy mode: always prioritize the closest living enemy
    let activeTarget = opponent;
    const myTeam = state.getFighterTeam(state.fighters ? state.fighters.indexOf(this) : 0);
    let minDist = (activeTarget && activeTarget.hp > 0) ? Math.hypot(activeTarget.x - this.x, activeTarget.y - this.y) : Infinity;

    if (state.fighters && state.fighters.length > 1) {
      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (f && f !== this && f.hp > 0) {
          const isEnemy = myTeam === null || state.getFighterTeam(i) !== myTeam;
          if (isEnemy) {
            const d = Math.hypot(f.x - this.x, f.y - this.y);
            if (d < minDist) {
              minDist = d;
              activeTarget = f;
            }
          }
        }
      }
    }

    opponent = activeTarget;

    const punchCooldown = CONFIG.gojo?.meleePunchCooldown ?? 15;

    // Handle punch cooldown
    if (this.meleePunchCooldown > 0) {
      this.meleePunchCooldown--;
      return;
    }

    const isTojiOpponent = opponent && (opponent.characterId === 'toji' || opponent.type === 'toji' || opponent._def?.id === 'toji');
    if (!opponent || opponent.isDead || (opponent.isStealthed && !this.domainActive && !isTojiOpponent)) return;

    // Initialize combo state (continuous rapid punches during domain, or 3-6 punches outside domain)
    if (this.meleeComboCount === undefined) this.meleeComboCount = 0;
    const defaultComboTarget = this.domainActive ? 999 : (Math.random() < 0.5 ? 6 : 3);
    if (!this.meleeComboTarget || this.domainActive) this.meleeComboTarget = defaultComboTarget;

    // Distance check: Punch only when target is within reach
    const distToOpponent = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    const punchReach = this.r + (opponent.r || 25) + (this.domainActive ? 50 : 45);
    const isOutOfReach = distToOpponent > punchReach;

    if (isOutOfReach) {
      if (this.domainActive) {
        this._teleportToDomainAngle(opponent, arena);
      }
      return;
    }

    // Always aim directly at the opponent when punching
    this.aim(opponent);

    // 3. Execute punch at current position
    this._meleePunch(opponent);
    this.meleeComboCount++;

    // Check for brawler clash shockwave (when both are in melee range)
    const isBrawlerOpponent = opponent && !opponent.isDead && (opponent.characterId === 'sukuna' || opponent.characterId === 'saitama' || opponent.characterId === 'yuji' || opponent.characterId === 'todo' || opponent._def?.id === 'sukuna');
    if (isBrawlerOpponent) {
      if (!this.meleeClashCooldown) this.meleeClashCooldown = 0;
      if (this.meleeClashCooldown <= 0) {
        // Spawn shockwave at midpoint between fighters
        const midX = (this.x + opponent.x) / 2;
        const midY = (this.y + opponent.y) / 2;
        spawnMeleeClashShockwave(midX, midY, 100);
        triggerGlobalScreenShake(8, 10);
        this.meleeClashCooldown = 30; // ~0.5 second cooldown
      }
    }

    if (this.domainActive) {
      // IN UNLIMITED VOID: After landing an attack, instantly flash-teleport to a different angle around the target!
      this._teleportToDomainAngle(opponent, arena);
      this.meleePunchCooldown = punchCooldown; // Strictly base attack cadence on Section 7 meleePunchCooldown
    } else {
      // Set cooldown for next punch
      this.meleePunchCooldown = punchCooldown;
    }

    // Reset combo counter and DISENGAGE to ranged mode when combo target is reached
    if (this.meleeComboCount >= this.meleeComboTarget) {
      this.meleeComboCount = 0;
      this.meleeComboTarget = this.domainActive ? 999 : (Math.random() < 0.5 ? 6 : 3);
      this.meleeFlankAngle = undefined; // Clear flank angle so next combo picks a fresh angle

      if (!this.domainActive && this.forcedMeleeTimer <= 0) {
        this.isMeleeMode = false;
        this.meleeModeCooldown = CONFIG.gojo?.meleeModeCooldown ?? CONFIG.gojo?.meleeModeSeparationCooldown ?? 120; // Mandatory ranged separation!
      }
    }

    this.resolveWallBounce(arena);
  }

  /**
   * Teleports Gojo away to range when transitioning out of melee mode
   */
  _teleportAwayFrom(opponent, arena) {
    if (!opponent || this.isTargetOfAmbush || (this.timeStopTimer || 0) > 0) return;
    const oldX = this.x;
    const oldY = this.y;

    const angle = Math.atan2(this.y - opponent.y, this.x - opponent.x) + (Math.random() - 0.5);
    const dist = CONFIG.gojo.comboDisengageDistance ?? 300;
    let targetX = opponent.x + Math.cos(angle) * dist;
    let targetY = opponent.y + Math.sin(angle) * dist;

    if (arena) {
      if (arena.shape === 'circle') {
        const acx = arena.x + arena.width / 2;
        const acy = arena.y + arena.height / 2;
        const ar = Math.max(10, (arena.radius || (arena.width / 2)) - this.r);
        const cdx = targetX - acx;
        const cdy = targetY - acy;
        const cdist = Math.hypot(cdx, cdy);
        if (cdist > ar && cdist > 0) {
          targetX = acx + (cdx / cdist) * ar;
          targetY = acy + (cdy / cdist) * ar;
        }
      } else {
        targetX = Math.max(arena.x + this.r, Math.min(arena.x + arena.width - this.r, targetX));
        targetY = Math.max(arena.y + this.r, Math.min(arena.y + arena.height - this.r, targetY));
      }
    }

    this._applyTeleportSlideBrake(oldX, oldY, targetX, targetY, arena);
    this.aim(opponent);
    if (opponent && !opponent.isDead && typeof opponent.aim === 'function' && !opponent.isTargetOfAmbush) {
      opponent.aim(this);
    }

    // Smooth mode switch to Ranged without freezing movement
    this.shootCooldown = Math.max(this.shootCooldown || 0, 15);
    this.modeSwitchBreatherTimer = 0;

    spawnImpactFlash(oldX, oldY, 20, 'lightningTrail');
    spawnImpactFlash(this.x, this.y, 25, 'lightningTrail');
    const dashSnd = CONFIG.gojo?.sounds?.teleportDash || 'skill_dash3';
    const dashVol = CONFIG.gojo?.soundVolumes?.teleportDash ?? 0.8;
    audioSystem.playSFX(dashSnd, dashVol);
  }

  canAim() {
    if (this.isChannelingDomainExpansion) {
      return false; // Disable auto-aim while channeling Domain Expansion!
    }
    return super.canAim();
  }

  aim(opponent) {
    if (this.isChannelingDomainExpansion) {
      this.gunAngle = Math.PI / 2;
      this.angle = Math.PI / 2;
      return false;
    }
    super.aim(opponent);
  }

  /**
   * Execute a melee punch attack
   */
  _meleePunch(opponent) {
    if (opponent) this.target = opponent;
    const basePunchDamage = CONFIG.gojo?.meleePunchDamage ?? 14;
    const punchDamage = this.domainActive ? Math.round(basePunchDamage * 1.5) : basePunchDamage;

    // Trigger smooth hand punch animation with alternating fists basing strictly on Section 7 config
    const punchDuration = CONFIG.gojo?.meleePunchAnimDuration ?? 10;
    this.punchAnimTimer = punchDuration;
    this.punchActiveMaxTime = punchDuration;
    this.punchAnimHand = this.punchAnimHand === 1 ? 0 : 1; // Strict toggle: 0 = Right hand, 1 = Left hand

    // Gather all valid enemy targets (fighters & illusions) in Gojo's punch frontal arc (90 degrees, 80px reach)
    const reach = this.r + 80; // Extended reach to ensure hits connect cleanly after teleport slide brakes!
    const arc = Math.PI * 0.5; // 90 degree frontal punch arc
    const punchAngle = (opponent && !opponent.isDead) ? Math.atan2(opponent.y - this.y, opponent.x - this.x) : (this.gunAngle || 0);

    const validTargets = [];
    const myTeam = state.getFighterTeam(state.fighters.indexOf(this));

    const allEntities = [
      ...(state.fighters || []),
      ...(state.illusions || [])
    ];

    for (const ent of allEntities) {
      if (!ent || ent.hp <= 0 || ent === this || (ent.invincibilityTimer || 0) > 0 || ent.owner === this) continue;

      if (ent.owner) {
        const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
        if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
      } else {
        const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
        if (myTeam !== null && entTeam !== null && myTeam === entTeam) continue;
      }

      const dx = ent.x - this.x;
      const dy = ent.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= reach + (ent.r || 20)) {
        const entAngle = Math.atan2(dy, dx);
        let angleDiff = Math.abs(entAngle - punchAngle);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        angleDiff = Math.abs(angleDiff);

        if (angleDiff <= arc / 2) {
          validTargets.push(ent);
        }
      }
    }

    if (validTargets.length === 0 && opponent && !opponent.isDead) {
      validTargets.push(opponent);
    }

    for (const target of validTargets) {
      // Pass isSkill: true to bypass the basic attack hit-pause (which locks target updates)
      target.takeDamage(punchDamage, this, { isMelee: true, isDomain: this.domainActive, isSkill: true });
      if (target && !target.isDead && typeof target.aim === 'function' && !target.isTargetOfAmbush) {
        target.aim(this);
      }

      const angle = Math.atan2(target.y - this.y, target.x - this.x);
      
      // Manga Spiky Crescent Impact Frame (matching Gojo's limitless blue/cursed theme)
      spawnAnimePunchImpactFrame(target.x, target.y, 55, angle, 'blue');

      // Punch hit physics: pushback disabled for basic/melee hits

    }

    const primaryTarget = validTargets[0] || opponent;
    if (primaryTarget) {
      this.sakugaImpactTimer = 6;
      this.sakugaImpactMaxTimer = 6;
      this.sakugaImpactX = primaryTarget.x;
      this.sakugaImpactY = primaryTarget.y;
      this.sakugaImpactAngle = Math.random() * Math.PI * 2;
      this.sakugaImpactSeed = Math.random();
    }

    triggerGlobalScreenShake(6, 6);

    // Sound effect
    const sound = getBasicAttackSound(null, 'gojo_melee');
    if (sound) {
      this._attackSoundTimer = sound.delay || 0;
      this._attackSoundConfig = sound;
    }
  }

  _activateRed() {
    return modActivateRed(this);
  }

  _detonateRed() {
    return modDetonateRed(this);
  }

  _firePurple(ownerIndex) {
    return modFirePurple(this, ownerIndex);
  }

  _executePurpleRetreat() {
    return modExecutePurpleRetreat(this);
  }

  _checkInfinityCollisions() {
    const isDomainChanneling = this.isDomainPreSlide || this.isChannelingDomainExpansion;
    const isBreatherState = (this.purpleRecoveryTimer || 0) > 0 || (this.purpleRetreatTimer || 0) > 0;
    if (isBreatherState || isDomainChanneling) {
      this.infinityActive = true;
      this.infinityCooldown = 0;
      this.isMeleeMode = false;
    }
    const isInsideEnemyDomain = !this.domainActive && state.fighters && state.fighters.some(f => f && f !== this && f.domainActive && f.hp > 0);
    if (isInsideEnemyDomain && !this.isTargetOfAmbush && !this.isMeleeMode) {
      this.infinityActive = true;
      this.infinityCooldown = 0;
    }
    if ((this.isMeleeMode && !isBreatherState && !isDomainChanneling && !this.domainActive) || this.hp <= 0 || this.isChannelingPurple) return;

    const barrierRadius = CONFIG.gojo?.infinityRadius ?? (this.r + 30);
    const slowRange = CONFIG.gojo?.infinitySlowRange || 140;
    const slowOuterRadius = barrierRadius + slowRange;

    const allTargets = [
      ...(state.fighters || []),
      ...(state.illusions || []),
      ...(state.cjDriveBys || [])
    ];

    for (const entity of allTargets) {
      if (!entity || entity === this || entity.hp <= 0 || entity.dead) continue;
      if (entity.owner === this || (entity.team !== undefined && entity.team === this.team)) continue; // Don't block self, teammates, or own summons/illusions

      const isChanneling = typeof entity.isChannelingSkill === 'function' ? entity.isChannelingSkill() : false;
      if (isChanneling || entity.isChannelingDomain || entity.isChannelingDomainExpansion) continue;

      // Saitama during Serious Skill Counter explicitly bypasses Infinity
      const isSaitamaCountering = (entity.type === 'saitama' || entity.characterId === 'saitama') &&
        ((entity._counterPunchTimer && entity._counterPunchTimer > 0) ||
         (entity._counterWindupTimer && entity._counterWindupTimer > 0) ||
         (entity._postCounterRecoveryTimer && entity._postCounterRecoveryTimer > 0) ||
         entity.isCountering);
      if (isSaitamaCountering) continue;

      // Adapted Mahoraga bypasses Infinity
      const totalMahoragaStages = entity.adaptationStage ? ((entity.adaptationStage.melee || 0) + (entity.adaptationStage.ranged || 0) + (entity.adaptationStage.skill || 0)) : 0;
      const isMahoragaAdapted = (entity.type === 'mahoraga' || entity.characterId === 'mahoraga') && 
                                (entity.gojoInfinityImmune || entity.isMaxAdapted || entity.isInfinityBlitz || entity.isWallSlamActive || totalMahoragaStages >= 8);
      if (isMahoragaAdapted) continue;

      const entY = entity.y - (entity.z || 0);
      const gojoY = this.y - (this.z || 0);
      const dx = entity.x - this.x;
      const dy = entY - gojoY;
      const distSq = dx * dx + dy * dy;
      const entRadius = entity.hitRadius || entity.r || 25;
      const minDist = entRadius + barrierRadius;
      const slowDist = entRadius + slowOuterRadius;

      if (distSq < minDist * minDist) {
        if (typeof this.triggerInfinityBlock === 'function') {
          const dist = Math.sqrt(distSq) || 1;
          const contactX = this.x + (dx / dist) * barrierRadius;
          const contactY = gojoY + (dy / dist) * barrierRadius;
          this.triggerInfinityBlock(contactX, contactY, entity);
        }
      } else if (distSq < slowDist * slowDist) {
        // Proximity Approach Slow: The closer the enemy gets to the barrier, the slower they move (Limitless Infinity paradox)
        const dist = Math.sqrt(distSq);
        const distFromBarrier = Math.max(0, dist - minDist);
        const proximityRatio = 1.0 - Math.min(1.0, distFromBarrier / slowRange); // 0.0 at outer edge -> 1.0 at barrier edge
        const minSlowMult = CONFIG.gojo?.infinitySlowMinMultiplier ?? 0.20;
        const slowMult = Math.max(minSlowMult, 1.0 - proximityRatio * (1.0 - minSlowMult));

        // Apply slow debuff
        if (typeof entity.applySlow === 'function') {
          entity.applySlow(3, slowMult, { isInfinitySlow: true });
        } else if (entity.statusEffects && typeof entity.statusEffects.applySlow === 'function') {
          entity.statusEffects.applySlow(3, slowMult);
        } else {
          entity.slowTimer = Math.max(entity.slowTimer || 0, 3);
          entity.slowMultiplier = slowMult;
        }

        // Subtle spatial distortion particles while slowed near barrier
        if (Math.random() < 0.15 && typeof spawnSparks === 'function') {
          spawnSparks(entity.x, entY, 1, '#00E5FF', '#FFFFFF');
        }
      }
    }
  }

  _deleteEnemyProjectilesInPurple() {
    return modDeletePurpleProj(this);
  }


  _activateDomain(arena) {
    this.isChannelingDomainExpansion = false;
    this.domainChargeTimer = 0;
    this._hasPlayedDomainChannelSound = false;
    this.domainActive = true;
    this.domainActivationTime = Date.now();
    this.domainUseCount++;
    this.domainTimer = CONFIG.gojo.domainDuration || 300;
    this.domainCooldown = CONFIG.gojo.domainCooldown || 1200;
    this.domainExpansionAudioDelay = CONFIG.gojo.domainExpansionAudioDelay ?? 90; // Delay (in frames) after deployment before gojodomainexpansion.mp3 plays
    this.postDomainFadeInTimer = 0; // Reset fade-in timer when domain activates

    // Force Melee Mode (Hand-to-Hand Combat) for the domain duration
    this.isMeleeMode = true;
    this.forcedMeleeTimer = this.domainTimer;
    this.wasForcedMelee = true;
    this.meleeModeCooldown = 0;
    this.meleeComboCount = 0;

    if (!this._playedDeployAudio) {
      this._playedDeployAudio = true;
      const activateSound = getSkillSound(this._def?.id, 'domain_activate') || getSkillSound(this._def?.id, 'domain');
      const actSrc = activateSound?.src || CONFIG.gojo?.sounds?.domainActivate || 'Assets/Sound Effects/Skills/gojodomaindeploy.mp3';
      const actVol = activateSound?.volume ?? (CONFIG.gojo?.soundVolumes?.domainActivate ?? 5.0);
      audioSystem.playSFX(actSrc, actVol);
    }
  }

  _applyDomainEffect() {
    const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
    state.fighters.forEach((f, idx) => {
      if (f && f !== this && f.hp > 0) {
        // Heavenly Restriction & Mahoraga Domain Adaptation: Immune to domain sure-hit effects & traps!
        if (f.domainImmunity || f.gojoDomainAdapted || (f.gojoAdapted && f.gojoAdapted.domain) || f.characterId === 'toji' || f.type === 'toji') return;

        const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
        if (true) { // Freeze EVERYONE (including teammates)
          // Absolute paralysis / brain overload from Unlimited Void
          if (typeof f.applyHitStun === 'function') {
            f.applyHitStun(15);
          }
          if (typeof f.applyTimeStop === 'function') {
            f.applyTimeStop(15, { isDomain: true, isUltimate: true });
          }
          f.vx = 0;
          f.vy = 0;
          if (f.knockbackVx !== undefined) f.knockbackVx = 0;
          if (f.knockbackVy !== undefined) f.knockbackVy = 0;
        }
      }
    });

    // Also apply domain paralysis to valid enemy illusions (like Rika)
    if (state.illusions) {
      state.illusions.forEach((ill) => {
        if (ill && ill.hp > 0 && typeof ill.takeDamage === 'function') {
          let isEnemy = true;
          if (myTeam !== null) {
            let illOwnerIndex = -1;
            if (ill.ownerIndex !== undefined) {
              illOwnerIndex = ill.ownerIndex;
            } else if (ill.owner && state.fighters.indexOf(ill.owner) !== -1) {
              illOwnerIndex = state.fighters.indexOf(ill.owner);
            }
            if (illOwnerIndex !== -1) {
              isEnemy = state.getFighterTeam(illOwnerIndex) !== myTeam;
            }
          }
          
          if (true) { // Freeze EVERYONE (including teammates' illusions)
            if (typeof ill.applyHitStun === 'function') ill.applyHitStun(15);
            else ill.hitStunTimer = Math.max(ill.hitStunTimer || 0, 15);

            if (typeof ill.applyTimeStop === 'function') ill.applyTimeStop(15);
            else ill.timeStopTimer = Math.max(ill.timeStopTimer || 0, 15);

            ill.vx = 0;
            ill.vy = 0;
          }
        }
      });
    }

    // Also apply domain paralysis to Greenwood Sedan minion cars (CJ Drive-By)
    if (state.cjDriveBys && state.cjDriveBys.length > 0) {
      state.cjDriveBys.forEach((car) => {
        if (car && !car.dead && car.hp > 0) {
          if (typeof car.applyHitStun === 'function') car.applyHitStun(15);
          else car.hitStunTimer = Math.max(car.hitStunTimer || 0, 15);

          if (typeof car.applyTimeStop === 'function') car.applyTimeStop(15);
          else car.timeStopTimer = Math.max(car.timeStopTimer || 0, 15);

          car.speed = 0;
          car.targetSpeed = 0;
          car.vx = 0;
          car.vy = 0;
        }
      });
    }
  }



  // PUBLIC: Draw Unlimited Void cosmic background BEFORE fighters so they aren't overlayed
  drawDomainBackground(ctx, isClashSecondary = false) {
    if (typeof state !== 'undefined' && state.pixiApp) return;
    renderGojoDomainBackground(this, ctx, isClashSecondary);
  }

  _checkReverseCursedTechnique(opponent, arena) {
    if (this.isDead || this.isChannelingAnySkill() || this.isChannelingRCT) return;
    if (this.reverseCursedTechniqueCooldown > 0) return;

    const threshold = CONFIG.gojo?.reverseCursedTechniqueHpThreshold || 0.25;
    const hpPercent = this.hp / this.maxHp;

    // Trigger when HP drops to threshold or below
    if (hpPercent <= threshold && hpPercent > 0) {
      this._activateReverseCursedTechnique(opponent, arena);
    }
  }

  _activateReverseCursedTechnique(opponent, arena) {
    // Guard: bail immediately if already cooling down or already channeling RCT — prevents double-heal from re-entrant calls
    if (this.isDead || this.hp <= 0) return;
    if ((this.reverseCursedTechniqueCooldown || 0) > 0 || this.isChannelingRCT) return;
    // Set cooldown immediately as sentinel before ANY heal/visual logic runs
    this.reverseCursedTechniqueCooldown = CONFIG.gojo?.reverseCursedTechniqueCooldown || 700;

    // Teleport away to a safe distance before performing RCT
    if (opponent && arena) {
      this._teleportAwayFrom(opponent, arena);
    }

    const duration = CONFIG.gojo?.rctChannelDuration || 90; // visual-only duration (no longer gates the heal)
    this.isChannelingRCT = true;
    this.rctChannelTimer = duration;
    this.rctVisualMaxTimer = duration;
    this.rctVisualTimer = duration;

    // Aura timer (cooldown already locked at top of this method)
    this.healingAuraTimer = 180;  // 3 seconds healing aura

    const totalHeal = CONFIG.gojo?.reverseCursedTechniqueHealAmount ?? (CONFIG.gojo?.reverseCursedTechniqueHealPercent ? this.maxHp * CONFIG.gojo.reverseCursedTechniqueHealPercent : 125);
    this._totalRctHealTarget = totalHeal;
    this._rctHealPerFrame = 0; // no per-frame ticking — heal is applied instantly below

    // INSTANT HEAL — apply the full RCT heal right now
    this.takeDamage(-totalHeal, this, { isHeal: true, skipHealText: true });

    // Visual effects - prominent green RCT heal indicator
    if (typeof spawnFloatingText === 'function') {
      spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 20, '+' + Math.round(totalHeal), '#00FF00');
    }

    // Dramatic screen shake
    triggerGlobalScreenShake(6, 25);

    // Central bright flash
    spawnImpactFlash(this.x, this.y, 80, 'lightningTrail');

    // Expanding ring of particles (healing energy wave)
    const ringParticleCount = 24;
    for (let i = 0; i < ringParticleCount; i++) {
      const angle = (Math.PI * 2 / ringParticleCount) * i;
      const dist = this.r + 10;
      const px = this.x + Math.cos(angle) * dist;
      const py = this.y + Math.sin(angle) * dist;
      spawnSparks(px, py, 2, 'healing');
    }

    // Second expanding ring (slightly delayed, different color)
    setTimeout(() => {
      if (this.isDead) return;
      for (let i = 0; i < 16; i++) {
        const angle = (Math.PI * 2 / 16) * i;
        const dist = this.r + 30;
        const px = this.x + Math.cos(angle) * dist;
        const py = this.y + Math.sin(angle) * dist;
        spawnSparks(px, py, 2, 'healing');
      }
    }, 100);

    // Third ring with white particles
    setTimeout(() => {
      if (this.isDead) return;
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 / 12) * i;
        const dist = this.r + 50;
        const px = this.x + Math.cos(angle) * dist;
        const py = this.y + Math.sin(angle) * dist;
        spawnSparks(px, py, 3, 'healing');
      }
    }, 200);

    // Burst of particles from center
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      const px = this.x + Math.cos(angle) * 20;
      const py = this.y + Math.sin(angle) * 20;
      spawnSparks(px, py, 1, 'healing');
    }

    // Play sound effect
    const sound = getSkillSound(this._def?.id, 'reverseCursedTechnique');
    const rctSrc = sound?.src || CONFIG.gojo?.sounds?.reverseCursedTechnique || 'Assets/Sound Effects/Skills/repair.mp3';
    const rctVol = sound?.volume ?? (CONFIG.gojo?.soundVolumes?.reverseCursedTechnique ?? 1.0);
    audioSystem.playSFX(rctSrc, rctVol);
  }
  triggerDemoAttack() {
    const punchDuration = CONFIG.gojo?.meleePunchAnimDuration || 12;
    this.punchAnimTimer = punchDuration;
    this.punchActiveMaxTime = punchDuration;
    this.punchAnimHand = this.punchAnimHand === 1 ? 0 : 1;
    try {
      const sound = getBasicAttackSound(this.id, this._def?.type);
      if (sound) audioSystem.playSFX(sound.src, sound.volume);
    } catch (e) {}
  }
  draw(ctx) { GojoRenderer.draw(ctx, this); }
  _getHandPositions() { return GojoRenderer._getHandPositions(this); }
  _drawHandCursedEnergyAura(ctx) { GojoRenderer._drawHandCursedEnergyAura(ctx, this); }
  _drawHandCursedEnergy(ctx) { GojoRenderer._drawHandCursedEnergy(ctx, this); }
  drawOutline(ctx) { GojoRenderer.drawOutline(ctx, this); }
  _drawHealingAura(ctx) { GojoRenderer._drawHealingAura(ctx, this); }
  drawGun(ctx) { GojoRenderer.drawGun(ctx, this); }
  _drawJJKCursedEnergyAura(ctx, colorTheme = 'blue', overrideX = null, overrideY = null, overrideRadius = null) { GojoRenderer._drawJJKCursedEnergyAura(ctx, this, colorTheme, overrideX, overrideY, overrideRadius); }
  _drawSakugaImpactFrame(ctx, x, y, timer, maxTimer, angleOffset = 0, seed = 0) { GojoRenderer._drawSakugaImpactFrame(ctx, this, x, y, timer, maxTimer, angleOffset, seed); }
  _drawReversalRedEffect(ctx) { GojoRenderer._drawReversalRedEffect(ctx, this); }
  _drawRedSlowRing(ctx, target) { GojoRenderer._drawRedSlowRing(ctx, this, target); }
}
