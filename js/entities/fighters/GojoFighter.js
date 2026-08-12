import { GojoRenderer } from '../../graphics/fighters/gojoRenderer.js';
import { fadeOutSound, fadeOutSoundBySrc } from '../../systems/soundSystem.js';
import { Fighter } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST, getHandSize } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave, spawnAnimePunchImpactFrame } from '../../graphics/particles/sparkEffect.js';
import { renderGojoDomainBackground } from './gojo/gojoDomainVisuals.js';
import { activateRed as modActivateRed, detonateRed as modDetonateRed, firePurple as modFirePurple, executePurpleRetreat as modExecutePurpleRetreat, deleteEnemyProjectilesInPurple as modDeletePurpleProj } from './gojo/gojoSkills.js';
import { triggerInfinityBlock as modTriggerInfinityBlock, applyTeleportSlideBrake as modApplyTeleportSlideBrake, executeTeleportDodge as modExecuteTeleportDodge } from './gojo/gojoCombat.js';
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
    this.shootCooldownMax = CONFIG.gojo.blueCooldown ?? def.cooldown;
    this.cooldown = this.shootCooldownMax;
    this.infinityCooldown = 0;
    this.infinityActive = true;
    this.infinityFadeOpacity = 0;

    this.redCooldown = CONFIG.gojo.redCooldown || 1200;
    this.purpleCooldown = CONFIG.gojo.purpleCooldown || 1000; // Delay initial cast
    this.isChannelingPurple = false;
    this.purpleChargeTimer = 0;
    this.purpleChargeMax = CONFIG.gojo.purpleChargeMax || 120;
    this._hasPlayedPurpleChannelSound = false;
    this._purpleChargeSoundHandle = null;

    this.domainCooldown = CONFIG.gojo.domainCooldown ?? 1000; // Initial cast delay reads from CONFIG
    this.domainActive = false;
    this.domainTimer = 0;
    this.domainChargeTimer = 0;
    this.domainChargeMax = CONFIG.gojo.domainChargeMax || 120;
    this.isChannelingDomainExpansion = false;
    this._hasPlayedDomainChannelSound = false;
    this.domainUseCount = 0; // Allows domain to be cast up to 2 times per round

    this.reverseCursedTechniqueCooldown = CONFIG.gojo?.reverseCursedTechniqueCooldown || 900;
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
    this.redEffectTimer = 0;
    this.redEffectMaxTimer = 75;
    this.redBuildupPhase = false;
    this.redDetonated = false;
    this.infinityBlockTimer = 0;
    this.infinityBlockMaxTimer = 25;
    this.teleportSlideTimer = 0;
    this.domainSlideTimer = 0;
  }

  reset() {
    super.reset();
    this.shootCooldownMax = CONFIG.gojo.blueCooldown ?? this._def.cooldown;
    this.cooldown = this.shootCooldownMax;
    this.infinityCooldown = 0;
    this.infinityActive = true;
    this.redCooldown = CONFIG.gojo.redCooldown || 1200;
    this.purpleCooldown = CONFIG.gojo.purpleCooldown || 1000;
    this.isChannelingPurple = false;
    this.purpleChargeTimer = 0;
    this.purpleChargeMax = CONFIG.gojo.purpleChargeMax || 120;
    this.domainCooldown = CONFIG.gojo.domainCooldown ?? 1000;
    this.domainActive = false;
    this.domainTimer = 0;
    this.domainChargeTimer = 0;
    this.domainChargeMax = CONFIG.gojo.domainChargeMax || 120;
    this.isChannelingDomainExpansion = false;
    this._hasPlayedDomainChannelSound = false;
    this.domainExpansionAudioDelay = 0;
    this.domainUseCount = 0;
    this.reverseCursedTechniqueCooldown = CONFIG.gojo?.reverseCursedTechniqueCooldown || 900;
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
    this.initialTeleportDone = false;
  }

  isChannelingAnySkill() {
    return (
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
    const wasChannelingPurple = this.isChannelingPurple || (this.purpleChargeTimer || 0) > 0;
    const savedPurpleCharge = this.purpleChargeTimer;
    const savedPurpleCooldown = this.purpleCooldown;
    const wasChannelingRed = (this.redEffectTimer || 0) > 0 || this.redBuildupPhase;
    const savedDomainCharge = this.domainChargeTimer;

    super.interruptAttacks(forceCancelAll);
    this.redEffectTimer = 0;
    this.redBuildupPhase = false;
    this.redDetonated = false;

    const penaltyCD = CONFIG.gojo?.interruptCooldown ?? 270; // 4.5s penalty CD on cancellation

    if (wasChannelingRed) {
      this.redCooldown = Math.max(this.redCooldown || 0, penaltyCD);
    }

    if (forceCancelAll) {
      // Hard cancel everything — death, round end, etc.
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

    // Domain Expansion Hyper Armor: ONLY Toji (ISOH ambush/silence) can interrupt domain expansion channeling!
    if (wasChannelingDomain) {
      if (this.isTargetOfAmbush || (this.silenceTimer || 0) > 0) {
        this.isChannelingDomainExpansion = false;
        this.domainChargeTimer = 0;
        this.domainCooldown = Math.max(this.domainCooldown || 0, penaltyCD + 30);
      } else {
        this.isChannelingDomainExpansion = true;
        this.domainChargeTimer = savedDomainCharge;
      }
    }

    // Hollow Purple Hyper Armor: Normal attacks do NOT cancel Purple channeling!
    // Only Toji's ISOH ambush/silence can interrupt it.
    if (wasChannelingPurple) {
      if (this.isTargetOfAmbush || (this.silenceTimer || 0) > 0) {
        this.isChannelingPurple = false;
        this.purpleChargeTimer = 0;
        this.purpleCooldown = Math.max(this.purpleCooldown || 0, penaltyCD);
        this.z = 0; // Drop to ground when Toji cancels Purple
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

  shoot(ownerIndex) {
    if (projectileSystem && projectileSystem.fireGojoBlue) {
      projectileSystem.fireGojoBlue(this, ownerIndex, this.damage);
    }

    const releaseDist = this.r + 20;
    const rx = this.x + Math.cos(this.gunAngle) * releaseDist;
    const ry = this.y + Math.sin(this.gunAngle) * releaseDist;
    spawnImpactFlash(rx, ry, 20, 'lightningTrail');

    const sound = getBasicAttackSound(21, 'gojo');
    if (sound) audioSystem.playSFX(sound.src, sound.volume);
  }

  triggerInfinityBlock(hitX, hitY, attacker) {
    return modTriggerInfinityBlock(this, hitX, hitY, attacker);
  }

  takeDamage(amount, attacker, opts = {}) {
    // If getting meleed or hit by physical attack, force switch into Melee Mode to punch back (only if separation cooldown is inactive)
    if ((opts.isMelee || (attacker && Math.hypot(attacker.x - this.x, attacker.y - this.y) <= 160)) && (this.meleeModeCooldown || 0) <= 0) {
      if (!this.isMeleeMode && this.forcedMeleeTimer <= 0) {
        this.forcedMeleeTimer = CONFIG.gojo.initialMeleeDuration || 100;
      }
      this.isMeleeMode = true;
      this.meleeModeCooldown = 0;
    }

    // High-speed Teleport Dodge chance (30% chance when dodge cooldown is ready - disabled when targeted by Toji's ambush!)
    const isTargetOfAmbush = (attacker && attacker.isAmbushing) || (this.timeStopTimer || 0) > 0 || (this.hitStunTimer || 0) > 0 || (this.isTargetOfAmbush === true);
    if (!isTargetOfAmbush && this.dodgeCooldown <= 0 && Math.random() < (CONFIG.gojo.teleportDodgeChance ?? 0.30) && !opts.isHeal && !this.isDead && !this.domainActive && !opts.isStorm) {
      this._executeTeleportDodge(attacker, CONFIG.arena);
      this.dodgeCooldown = CONFIG.gojo.teleportDodgeCooldown ?? 90; // 1.5 second cooldown between dodges
      return false; // Negate damage
    }

    // Check Infinity Passive first (Domain sure-hit & bypassShield attacks bypass Limitless Infinity, self-damage cannot trigger Infinity)
    // Toji Fushiguro (ISOH lore exception): Inverted Spear of Heaven always pierces Limitless Infinity — skip block entirely
    const isToji = attacker && (attacker.characterId === 'toji' || attacker.type === 'toji');
    const isAttackerChannelingDomain = attacker && (attacker.isChannelingDomain || attacker.isChannelingDomainExpansion);
    const isInsideDomain = this.domainActive || (state && (state.activeDomain || state.domainActive));
    if (!this.isMeleeMode && !isInsideDomain && !isToji && !isAttackerChannelingDomain && this.infinityCooldown <= 0 && attacker && attacker !== this && this.hp > 0 && !opts.isStorm && !opts.isDomain && !opts.bypassShield) {
      const freezeChance = CONFIG.gojo?.infinityFreezeChance ?? 0.5;
      const isMahoraga = attacker.characterId === 'mahoraga' || attacker.type === 'mahoraga';
      const hasAdapted = attacker.gojoInfinityImmune || attacker.isMaxAdapted || attacker.isInfinityBlitz;

      if (!hasAdapted && Math.random() <= freezeChance) {
        this.triggerInfinityBlock(attacker.x || this.x, attacker.y || this.y, attacker);
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
    // the attack is too powerful — RCT is overwhelmed and he dies properly.
    if (!this.hasUsedRCTRevival && this.hp <= 0 && amount > 0 && !opts.isStorm && !opts.isHeal) {
      if (amount >= hpBefore) {
        // Hit was strong enough to kill him outright — no revival
        return result;
      }

      this.hasUsedRCTRevival = true;
      this.isDead = false;
      this.hp = Math.max(1, this.maxHp * (CONFIG.gojo?.rctRevivalHealPercent || 0.30));
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
    if (!opts.isHeal && (CONFIG.gojo?.enableRCTHeal !== false) && (this.reverseCursedTechniqueCooldown || 0) <= 0 && !this.isDead && this.hp > 0) {
      const threshold = CONFIG.gojo?.reverseCursedTechniqueHpThreshold || 0.30;
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
      if (this.afterImages && typeof this.afterImages.push === 'function') {
        this.afterImages.push({
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

    this.handlePoison();
    this.handleBurn();
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

    if (this.domainActive) {
      // Ultimate Domain Advantage: Gojo cannot be frozen by Time Stop inside his own domain!
      this.timeStopTimer = 0; 
    }

    if (this.isChannelingDomainExpansion && !this.isTargetOfAmbush && (this.silenceTimer || 0) <= 0) {
      // Unstoppable Domain Channeling Hyper-Armor: Clear hitStun & status freezes so non-Toji attacks cannot interrupt!
      this.hitStunTimer = 0;
      this.electricStunTimer = 0;
      this.dubstepStunTimer = 0;
      this.crimsonElectrifiedTimer = 0;
      this.timeStopTimer = 0;
    }

    const isFrozen = this._handleTimeStop() || this.isTargetOfAmbush || (this.purpleHitTimer && this.purpleHitTimer > 0) || this.isFrozenByInfinity;
    if (isFrozen) {
      if (this.isChannelingDomainExpansion && (this.isTargetOfAmbush || (this.silenceTimer || 0) > 0)) {
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
      return; // MANDATORY: Stop update execution so fighter is frozen!
    }

    if (this.redEffectTimer > 0) {
      // Trigger Red channeling SFX once when channeling starts
      if (!this._hasPlayedRedChannelingSound) {
        this._hasPlayedRedChannelingSound = true;
        const sChan = getSkillSound(this._def?.id, 'red_channeling');
        audioSystem.playSFX(sChan?.src || 'Assets/Sound Effects/Skills/redchanneling.mp3', sChan?.volume ?? 1.8);
      }

      // Buildup phase: freeze nearby enemies in place (near-zero slow)
      const RED_BUILDUP_FRAMES = CONFIG.gojo.redBuildupFrames || 20;
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
        this.redDetonated = true;
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
    if (this.reverseCursedTechniqueCooldown > 0) this.reverseCursedTechniqueCooldown--;
    if (this.healingAuraTimer > 0) this.healingAuraTimer--;

    // ── Passive Six Eyes RCT Brain Refresh (Disabled — RCT only triggers at low HP threshold) ──
    if (CONFIG.gojo?.enablePassiveRctRegen === true && this.hp > 0 && this.hp < this.maxHp && !this.isDead) {
      const passiveRate = CONFIG.gojo?.passiveRctHealRate || 0;
      if (passiveRate > 0) {
        this.hp = Math.min(this.maxHp, this.hp + passiveRate);
      }
    }

    if (this.infinityActiveTimer > 0) {
      this.infinityActiveTimer--;
      if (this.infinityActiveTimer <= 0) {
        // Active window expired, start cooldown now!
        this.infinityCooldown = CONFIG.gojo?.infinityCooldown ?? 240;
        this.infinityActive = false;
      }
    } else if (this.infinityCooldown > 0) {
      this.infinityCooldown--;
      if (this.infinityCooldown <= 0) {
        this.infinityActive = true;
      }
    }

    // Smooth fade-in & fade-out for Limitless Infinity barrier visuals
    const barrierShouldBeActive = !this.isMeleeMode && (this.infinityActive || this.infinityCooldown <= 0) && !this.isChannelingPurple && !this.domainActive && this.hp > 0;
    if (barrierShouldBeActive) {
      this.infinityFadeOpacity = Math.min(1.0, (this.infinityFadeOpacity || 0) + 0.05); // ~20 frames smooth fade-in
    } else {
      this.infinityFadeOpacity = Math.max(0.0, (this.infinityFadeOpacity || 0) - 0.08); // ~12 frames smooth fade-out
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
    const myTeam = state.getFighterTeam(state.fighters ? state.fighters.indexOf(this) : 0);
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

    if (!this.domainActive) {
      if (this.infinityCooldown > 0) {
        this.infinityCooldown--;
        if (this.infinityCooldown <= 0) this.infinityActive = true;
      }
      if ((this.redEffectTimer || 0) <= 0 && this.redCooldown > 0) this.redCooldown--;
      if (!this.isChannelingPurple && (this.purpleRecoveryTimer || 0) <= 0 && this.purpleCooldown > 0) this.purpleCooldown--;
      if (!this.isChannelingDomainExpansion && this.domainCooldown > 0) this.domainCooldown--;
      if (!this.isChannelingRCT && this.reverseCursedTechniqueCooldown > 0) this.reverseCursedTechniqueCooldown--;
    }
    if (this.healingAuraTimer > 0) this.healingAuraTimer--;

    // Completely immobilize Gojo if Toji is actively performing his ambush sequence on him
    // UNLESS Gojo is inside his own Domain Expansion (he has ultimate advantage and cannot be restrained!)
    const isActuallyBeingAmbushed = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => 
      f && f.hp > 0 && 
      f.characterId === 'toji' && 
      f.isAmbushing
    );
    if (!isActuallyBeingAmbushed || this.domainActive) {
      this.isTargetOfAmbush = false;
    } else {
      this.vx = 0;
      this.vy = 0;
      return; // Immobilize AI & abilities while Toji is actively striking Gojo in ambush
    }

    // Check for Reverse Cursed Technique (Self heal at low HP)
    this._checkReverseCursedTechnique(opponent, arena);

    // Domain active state
    if (this.domainActive) {
      this.domainTimer--;
      if (this.domainTimer <= 0) {
        this.domainActive = false;
        this.forcedMeleeTimer = 0; // Release forced melee lock so Gojo can move freely again!
        this.isMeleeMode = false; // Stop chasing in melee!
        this.meleeModeCooldown = CONFIG.gojo.meleeModeSeparationCooldown ?? 240; // Enforce separation
        this.postDomainFadeInTimer = 90; // ~1.5 seconds of fade-in after domain ends

        if (opponent && !opponent.isDead) {
          this._teleportAwayFrom(opponent, arena);
        }

        // Unfreeze all enemy fighters when Gojo's domain expires
        if (state.fighters) {
          state.fighters.forEach(f => {
            if (f && f !== this) {
              f.timeStopTimer = 0;
              f.hitStunTimer = 0;
              delete f._timeStopOriginalDuration;
              delete f._timeStopStartTime;
              delete f._timeStopFrozenAngle;
              delete f._timeStopFrozenGunAngle;
            }
          });
        }
      } else {
        // Force hand-to-hand combat during domain expansion!
        this.isMeleeMode = true;
        this.forcedMeleeTimer = Math.max(this.forcedMeleeTimer, 30);
        this.meleeModeCooldown = 0;
      }
    }

    // Stop attacking if round/match has ended or if target/opponent is dead!
    // IMPORTANT: Never interrupt mid-channel (Red buildup or Purple charge) as it would silence their charge audio.
    const isGamePlaying = typeof state !== 'undefined' && state.gameState === 'playing';
    const isTargetAlive = opponent && !opponent.isDead && opponent.hp > 0;

    if (!isGamePlaying || !isTargetAlive) {
      this.interruptAttacks(true); // Hard cancel all skills so Purple is cleared immediately when enemy dies!
      this.shootCooldown = 60;
      return;
    }

    // Check for Domain Expansion (Ultimate - disabled in demo preview mode)
    const isSilenced = (this.silenceTimer || 0) > 0;
    if (!this.isDemoFighter && !isSilenced && !this.isChannelingAnySkill() && !this.domainActive && this.domainCooldown <= 0 && this.domainUseCount < 2 && opponent && !opponent.isDead && this.forcedMeleeTimer <= 0) {
      this.isChannelingDomainExpansion = true;
      this.domainChargeTimer = 0;
      this.domainSlideTimer = 12; // 12-frame smooth friction slide before stopping to channel
      this._domainChannelAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
      this._playedDeployAudio = false;
      if (!this._hasPlayedDomainChannelSound) {
        this._hasPlayedDomainChannelSound = true;
        const channelSound = getSkillSound(this._def?.id, 'domain_channel');
        if (channelSound) audioSystem.playSFX(channelSound.src, channelSound.volume);
      }
    }

    // Handle Domain Expansion Channeling
    if (this.isChannelingDomainExpansion) {
      this.hitStunTimer = 0; // Absolute Hyper-Armor while channeling Unlimited Void!
      if (isSilenced && this.isTargetOfAmbush) {
        this.isChannelingDomainExpansion = false;
        this.domainChargeTimer = 0;
        this.domainCooldown = CONFIG.gojo?.domainCooldown || 1500;
        return;
      }
      this.domainChargeTimer++;

      // Smooth friction slide deceleration before coming to a full stop for hand sign channeling
      if ((this.domainSlideTimer || 0) > 0) {
        this.domainSlideTimer--;
        this.vx *= 0.75;
        this.vy *= 0.75;
        this.x += this.vx;
        this.y += this.vy;
        if (Math.hypot(this.vx, this.vy) > 0.5 && typeof spawnSparks === 'function' && this.domainSlideTimer % 2 === 0) {
          spawnSparks(this.x, this.y, 1, 'blue');
        }
      } else {
        this.vx = 0;
        this.vy = 0;
      }

      // Lock stance and hand sign angle fixed in place while channeling domain expansion
      if (this._domainChannelAngle !== undefined) {
        this.gunAngle = this._domainChannelAngle;
        this.angle = this._domainChannelAngle;
      }

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
      this.isChannelingPurple = true;
      this.isMeleeMode = false; // Disengage melee mode while channeling Hollow Purple!
      this.purpleChargeTimer = 0;
      spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 20, 'HOLLOW PURPLE', '#8A2BE2');

        if (!this._hasPlayedPurpleChannelSound) {
          this._hasPlayedPurpleChannelSound = true;
          const sound = getSkillSound(this._def?.id, 'purple_charge');
          if (sound) {
            const delayMs = Math.max(0, (sound.delay || 0) * 1000);
            if (delayMs > 0) {
              setTimeout(() => {
                if (this.isChannelingPurple && this.hp > 0) {
                  this._purpleChargeSoundHandle = audioSystem.playSFX(sound.src, sound.volume);
                }
              }, delayMs);
            } else {
              this._purpleChargeSoundHandle = audioSystem.playSFX(sound.src, sound.volume);
            }
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
        audioSystem.playSFX(sDeploy?.src || 'Assets/Sound Effects/Skills/purpledeploy.mp3', sDeploy?.volume ?? 0.9);
      }

      // 2. Levitation: Gojo rises smoothly in the air as Red and Blue mix
      const levitateProgress = Math.min(1.0, this.purpleChargeTimer / (this.purpleChargeMax * 0.4));
      const maxLevitationHeight = 35;
      this.z = Math.sin(levitateProgress * Math.PI * 0.5) * maxLevitationHeight;

      if (opponent && !opponent.isDead) {
        this.aim(opponent);
        // Lapse Blue Gravitational Distortion: Slows opponent movement while mixing Red & Blue into Purple!
        if (!opponent.immuneToCC && opponent.characterId !== 'toji' && opponent.type !== 'toji') {
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

    // 1. Handle delayed retreat after Purple fires (Gojo flash-steps backward away from enemy)
    if (this.purpleRetreatTimer > 0) {
      this.purpleRetreatTimer--;
      if (this.purpleRetreatTimer === 0) {
        this._executePurpleRetreat();
      }
    }

    // 2. Handle Purple Post-Fire Breather Stasis (Gojo STOPS completely at retreat position to catch his breath)
    if (this.purpleRecoveryTimer > 0) {
      this.purpleRecoveryTimer--;

      // Smooth sine descent from 35px down to 0px over the timer duration
      const descentProgress = this.purpleRecoveryTimer / (this.purpleRecoveryMaxTimer || 120); // 1.0 down to 0.0
      this.z = Math.sin(Math.min(1, descentProgress) * Math.PI * 0.5) * 35;

      // Stop all self-movement during breather stasis — zero drift toward enemy
      this.vx = 0;
      this.vy = 0;
      this.applyMovementPhysics();
      this.resolveWallBounce(arena);
      return; // Stop basic attacks, AI steering, and mode switches during the breather!
    }

    // 3. Handle Mode Switch Breather (Gojo no longer freezes movement when switching to Ranged mode)
    if (this.modeSwitchBreatherTimer > 0) {
      this.modeSwitchBreatherTimer--;
    }

    // Handle RCT Channeling (Reverse Cursed Technique - 2.5 seconds heal duration)
    if (this.isChannelingRCT) {
      this.rctChannelTimer--;

      // Gradually heal over the channel duration (0 when instant heal was already applied)
      const healPerFrame = this._rctHealPerFrame ?? ((this.maxHp * (CONFIG.gojo?.reverseCursedTechniqueHealPercent || 0.35)) / 90);
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
      const myTeam = state.getFighterTeam(state.fighters ? state.fighters.indexOf(this) : 0);
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
      // Immobilize and interrupt nearby enemies during Red buildup so they cannot flurry/spin around Gojo
      if (this.redBuildupPhase && state.fighters) {
        state.fighters.forEach((f) => {
          if (f && f !== this && f.hp > 0 && f.characterId !== 'toji' && f.type !== 'toji') {
            const isEnemy = myTeam === null || state.getFighterTeam(state.fighters.indexOf(f)) !== myTeam;
            if (isEnemy) {
              const dist = Math.hypot(f.x - this.x, f.y - this.y);
              if (dist < (CONFIG.gojo?.redRange || 100) + 180) {
                f.vx = 0;
                f.vy = 0;
                if (typeof f.interruptAttacks === 'function') f.interruptAttacks();
              }
            }
          }
        });
      }
      this.resolveWallBounce(arena);
      return; // Stop basic attacks, melee punches, and mode switches until Red finishes!
    }

    // Delete enemy projectiles if Purple is active
    this._deleteEnemyProjectilesInPurple();

    // Check if ANY enemy is currently meleeing Gojo or in close range
    let isBeingMeleed = false;
    let closestEnemyDist = Infinity;

    if (state.fighters && state.fighters.length > 0) {
      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (!f || f === this || f.hp <= 0 || (f.isStealthed && !this.domainActive)) continue;
        const isEnemy = myTeam === null || state.getFighterTeam(i) !== myTeam;
        if (!isEnemy) continue;

        const d = Math.hypot(this.x - f.x, this.y - f.y);
        if (d < closestEnemyDist) closestEnemyDist = d;

        if (d <= 180 || f.isMeleeMode || f.flurryTarget === this) {
          isBeingMeleed = true;
          break;
        }
      }
    }

    // Switch modes based on distance & melee engagement (only when not in special states)
    if (!this.isTeleporting && !this.isChannelingPurple) {
      if (this.domainActive) {
        this.isMeleeMode = true; // Force melee mode in domain
      } else if (this.meleeModeCooldown > 0) {
        // Mandatory ranged separation period (240 frames / 4.0 seconds) after combo disengage
        this.isMeleeMode = false;
      } else if (opponent && opponent.isStealthed && !this.domainActive && !(opponent.characterId === 'toji' || opponent.type === 'toji' || opponent._def?.id === 'toji')) {
        // Disengage from melee combat while non-Toji opponent is in stealth mode
        this.isMeleeMode = false;
      } else if (isBeingMeleed) {
        // Enter Melee Mode when in close melee engagement
        if (!this.isMeleeMode && this.forcedMeleeTimer <= 0) {
          this.forcedMeleeTimer = CONFIG.gojo.initialMeleeDuration || 100;
        }
        this.isMeleeMode = true;
      } else if (this.forcedMeleeTimer > 0) {
        this.wasForcedMelee = true;
        this.isMeleeMode = true;
      } else {
        if (this.isMeleeMode && closestEnemyDist > 220) {
          // Left melee range - switch back to ranged mode and teleport away
          this.isMeleeMode = false;
          this.wasForcedMelee = false;
          this.meleeModeCooldown = CONFIG.gojo?.meleeModeSeparationCooldown ?? 240;
          if (opponent && !opponent.isDead) {
            this._teleportAwayFrom(opponent, arena);
          }
        }
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
      // In Melee Mode, Gojo does NOT walk/run — teleportation handles 100% of his positional movement!
      this.vx = 0;
      this.vy = 0;
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
      if (canAct && opponent && !opponent.isDead) {
        this._updateMeleeCombat(opponent, arena);
      }
    } else {
      // Ranged Mode - Natural movement without teleport slide freezes
      speedMult = 1.0;

      // Ranged Mode - Basic attack with blue orbs
      if (this.shootCooldown > 0) {
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

    if (opponent && !opponent.isDead && !this.isTargetOfAmbush && (this.timeStopTimer || 0) <= 0 && (this.hitStunTimer || 0) <= 0) {
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
   * Handle melee combat - teleports, then 1 punch (65% chance) or 3 rapid punches (35% chance)
   */
  _updateMeleeCombat(opponent, arena) {
    if (this.isChannelingPurple || this.isChannelingDomainExpansion || this.redBuildupPhase) {
      this.vx = 0;
      this.vy = 0;
      return; // Do NOT melee punch or teleport while channeling Hollow Purple or Domain Expansion!
    }

    const punchCooldown = CONFIG.gojo.meleePunchCooldown || 8;

    // Handle punch cooldown — zero velocity so Gojo stands completely still when punching
    if (this.meleePunchCooldown > 0) {
      this.meleePunchCooldown--;
      this.vx = 0;
      this.vy = 0;
      return;
    }

    const isTojiOpponent = opponent && (opponent.characterId === 'toji' || opponent.type === 'toji' || opponent._def?.id === 'toji');
    if (!opponent || opponent.isDead || (opponent.isStealthed && !this.domainActive && !isTojiOpponent)) return;

    // Initialize combo state (6 rapid punches per combo sequence, then teleport to change angle)
    if (this.meleeComboCount === undefined) this.meleeComboCount = 0;
    const defaultComboTarget = this.domainActive ? 6 : (Math.random() < 0.5 ? 6 : 3);
    if (!this.meleeComboTarget) this.meleeComboTarget = defaultComboTarget;

    // Distance check: Teleport if out of melee reach, or if starting a new combo sequence against a target
    const distToOpponent = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    const attackReach = this.r + opponent.r + 35;
    const isOutOfReach = distToOpponent > attackReach;

    // Teleport at start of new combo sequence (when meleeComboCount === 0), if opponent moved out of reach, or periodically between strikes
    const canTeleportChase = (this.teleportChaseDelayTimer || 0) <= 0;
    const shouldTeleport = canTeleportChase && (isOutOfReach || (this.meleeComboCount === 0) || (this.meleeComboCount > 0 && this.meleeComboCount % 2 === 0));

    if (shouldTeleport) {
      const oldX = this.x;
      const oldY = this.y;

      const angleFromOpponent = Math.atan2(oldY - opponent.y, oldX - opponent.x);
      const flankAngle = angleFromOpponent + (Math.random() < 0.5 ? Math.PI * 0.45 : -Math.PI * 0.45);
      const behindOffset = opponent.r + this.r + 12; // Perfect spacing: cleanly inside punch reach, safely outside clipping repulsion
      
      let targetX = opponent.x + Math.cos(flankAngle) * behindOffset;
      let targetY = opponent.y + Math.sin(flankAngle) * behindOffset;

      if (arena) {
        targetX = Math.max(arena.x + this.r, Math.min(arena.x + arena.width - this.r, targetX));
        targetY = Math.max(arena.y + this.r, Math.min(arena.y + arena.height - this.r, targetY));
      }

      this._applyTeleportSlideBrake(oldX, oldY, targetX, targetY, arena);
      if (this.domainActive) {
        this.teleportSlideTimer = 0; // Zero slide pause during Unlimited Void speed punches
      }
      this.aim(opponent);

      spawnImpactFlash(oldX, oldY, 20, 'lightningTrail');
      spawnImpactFlash(this.x, this.y, 25, 'lightningTrail');
      audioSystem.playSFX('skill_dash3', 0.6);
    }

    // 2. Verify target is inside punch reach before striking (prevents punching empty air if target dodges away)
    const currentDist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    const punchReach = this.r + opponent.r + 45;
    if (currentDist > punchReach) {
      return; // Do NOT punch the air when target is out of reach!
    }

    // 3. Execute punch at current position
    this._meleePunch(opponent);
    this.meleeComboCount++;

    // Check for Sukuna clash shockwave (when both are in melee range)
    if (opponent && !opponent.isDead && opponent._def &&
      (opponent._def.id === 'sukuna' || opponent._def.name === 'SukunaFighter')) {
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

    // Set cooldown for next punch
    this.meleePunchCooldown = punchCooldown;

    // Reset combo counter and DISENGAGE to ranged mode when combo target is reached
    if (this.meleeComboCount >= this.meleeComboTarget) {
      this.meleeComboCount = 0;
      this.meleeComboTarget = this.domainActive ? 6 : (Math.random() < 0.5 ? 6 : 3);
      this.meleeFlankAngle = undefined; // Clear flank angle so next combo picks a fresh angle

      if (!this.domainActive && this.forcedMeleeTimer <= 0) {
        this.isMeleeMode = false;
        this.meleeModeCooldown = CONFIG.gojo.meleeModeSeparationCooldown ?? 240; // 4 seconds of mandatory ranged separation!
        if (opponent && !opponent.isDead) {
          this._teleportAwayFrom(opponent, arena);
        }
      }
    }

    this.resolveWallBounce(arena);
  }

  /**
   * Teleports Gojo away to range when transitioning out of melee mode
   */
  _teleportAwayFrom(opponent, arena) {
    if (!opponent || opponent.isAmbushing || this.isTargetOfAmbush || (this.timeStopTimer || 0) > 0) return;
    const oldX = this.x;
    const oldY = this.y;

    const angle = Math.atan2(this.y - opponent.y, this.x - opponent.x) + (Math.random() - 0.5);
    const dist = CONFIG.gojo.comboDisengageDistance ?? 300;
    let targetX = opponent.x + Math.cos(angle) * dist;
    let targetY = opponent.y + Math.sin(angle) * dist;

    if (arena) {
      targetX = Math.max(arena.x + this.r, Math.min(arena.x + arena.width - this.r, targetX));
      targetY = Math.max(arena.y + this.r, Math.min(arena.y + arena.height - this.r, targetY));
    }

    this._applyTeleportSlideBrake(oldX, oldY, targetX, targetY, arena);
    this.aim(opponent);

    // Smooth mode switch to Ranged without freezing movement
    this.shootCooldown = Math.max(this.shootCooldown || 0, 15);
    this.modeSwitchBreatherTimer = 0;

    spawnImpactFlash(oldX, oldY, 20, 'lightningTrail');
    spawnImpactFlash(this.x, this.y, 25, 'lightningTrail');
    audioSystem.playSFX('skill_dash3', 0.8);
  }

  /**
   * Execute a melee punch attack
   */
  _meleePunch(opponent) {
    if (opponent) this.target = opponent;
    const punchDamage = CONFIG.gojo.meleePunchDamage || 8;

    // Trigger smooth hand punch animation (matches Sukuna's 8-frame punch timing)
    this.punchAnimTimer = 8;
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

      const angle = Math.atan2(target.y - this.y, target.x - this.x);
      
      // Manga Spiky Crescent Impact Frame (matching Gojo's limitless blue/cursed theme)
      spawnAnimePunchImpactFrame(target.x, target.y, 55, angle, 'blue');

      // Punch hit physics: crisp pushback impulse along punch vector (disabled inside Gojo's Domain Expansion)
      if (!this.domainActive) {
        const isFinalHit = this.meleeComboCount >= (this.meleeComboTarget || 1);
        const pushForce = isFinalHit ? 14 : 7.5;

        target.vx += Math.cos(angle) * pushForce;
        target.vy += Math.sin(angle) * pushForce;

        if (target.knockbackVx !== undefined && target.knockbackVy !== undefined) {
          target.knockbackVx += Math.cos(angle) * (pushForce * 0.8);
          target.knockbackVy += Math.sin(angle) * (pushForce * 0.8);
          // Set to 0 so target can steer and move immediately
          target.knockbackStunTimer = 0;
        }
      }
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
    const knockback = CONFIG.gojo.redKnockback || 25;
    const slowDuration = CONFIG.gojo.redSlowDuration || 120;
    const slowMultiplier = CONFIG.gojo.redSlowMultiplier || 0.35;

    // BOOM! Heavy flash, intense screen shake, sparks
    spawnImpactFlash(this.x, this.y, 80, 'crimsonSniper');
    spawnSparks(this.x, this.y, 45, 'crimsonSniper');
    
    const shakeIntensity = CONFIG.gojo.redShakeIntensity || 22;
    const shakeDuration = CONFIG.gojo.redShakeDuration || 25;
    triggerGlobalScreenShake(shakeIntensity, shakeDuration);

    // Audio: Detonation blast sound
    const sBlast = getSkillSound(this._def?.id, 'red_blast');
    audioSystem.playSFX(sBlast?.src || 'Assets/Sound Effects/Skills/redblast.mp3', sBlast?.volume ?? 2.5);

    // Repel + damage + slow all enemies in radius
    const myTeam = state.getFighterTeam(this.fighterIndex ?? state.fighters.indexOf(this));
    state.fighters.forEach((f, idx) => {
      if (f && f !== this && f.hp > 0) {
        const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
        if (isEnemy) {
          const dist = Math.hypot(this.x - f.x, this.y - f.y);
          const blastRadius = CONFIG.gojo.redBlastRadius || 350;
          if (dist < blastRadius) {
            // Clear timeStop freeze so knockback physics applies immediately
            f.timeStopTimer = 0;
            f.crimsonElectrifiedTimer = 0;
            f.electricStunTimer = 0;

            // Direct repulsive blast wave knockback impulse (Explosive ground slide!)
            const angle = Math.atan2(f.y - this.y, f.x - this.x);
            const knockVx = Math.cos(angle) * knockback;
            const knockVy = Math.sin(angle) * knockback;

            f.vx = knockVx;
            f.vy = knockVy;
            f.knockbackDecay = 0.92; // Silky smooth high-speed ground slide friction
            if (typeof f.applyRedKnockback === 'function') {
              f.applyRedKnockback(knockVx, knockVy);
            } else if (typeof f.applyKnockback === 'function') {
              f.applyKnockback(knockVx, knockVy, { isRed: true });
            }

            // Spawn ground impact sparks and dust wave along slide vector
            spawnSparks(f.x, f.y, 25, 'crimsonSniper');
            spawnMeleeClashShockwave(f.x, f.y, 110, 'gojo');

            // Damage
            const redDamage = CONFIG.gojo.redDamage !== undefined ? CONFIG.gojo.redDamage : (this.damage * 2);
            f.takeDamage(redDamage, this, { isRed: true });

            // Apply Hit Stun (disables/immobilizes enemy actions for impact window)
            if (typeof f.applyHitStun === 'function') {
              f.applyHitStun(35);
            }

            // Post-detonation slow + track for red ring visual (applies to Toji even in stealth mode)
            if (!f.immuneToCC || f.characterId === 'toji' || f.type === 'toji') {
              if (typeof f.applySlow === 'function') {
                f.applySlow(slowDuration, slowMultiplier, { isRed: true });
              } else {
                f.slowTimer = Math.max(f.slowTimer || 0, slowDuration);
                f.slowMultiplier = slowMultiplier;
              }
              // Mark with red-slow so we can draw the crimson ring visual
              f.redSlowTimer = slowDuration;
              f.redSlowMaxTimer = slowDuration;
            }
          }
        }
      }
    });

    // Dissipate blast visual quickly (0.2s) so Gojo doesn't get stuck holding the orb post-blast
    this.redEffectTimer = Math.min(this.redEffectTimer || 0, 12);
  }

  _firePurple(ownerIndex) {
    return modFirePurple(this, ownerIndex);
  }

  _executePurpleRetreat() {
    return modExecutePurpleRetreat(this);
  }

  _checkInfinityCollisions() {
    const isInsideDomain = this.domainActive || this.isChannelingDomainExpansion || (state && (state.activeDomain || state.domainActive));
    if (this.isMeleeMode || isInsideDomain || this.infinityCooldown > 0 || this.hp <= 0 || this.isChannelingPurple) return;

    const barrierRadius = CONFIG.gojo?.infinityRadius ?? (this.r + 30);
    const allTargets = [...(state.fighters || []), ...(state.illusions || [])];

    for (const entity of allTargets) {
      if (!entity || entity === this || entity.hp <= 0) continue;
      if (entity.owner === this || (entity.team !== undefined && entity.team === this.team)) continue; // Don't block self, teammates, or own summons/illusions

      // Toji & Domain channelers explicitly bypass Infinity
      if (entity.type === 'toji' || entity.characterId === 'toji') continue;
      if (entity.isChannelingDomain || entity.isChannelingDomainExpansion) continue;

      // Adapted Mahoraga bypasses Infinity
      const isMahoragaAdapted = (entity.type === 'mahoraga' || entity.characterId === 'mahoraga') && 
                                (entity.gojoInfinityImmune || entity.isMaxAdapted || entity.isInfinityBlitz);
      if (isMahoragaAdapted) continue;

      const entY = entity.y - (entity.z || 0);
      const gojoY = this.y - (this.z || 0);
      const dx = entity.x - this.x;
      const dy = entY - gojoY;
      const distSq = dx * dx + dy * dy;
      const entRadius = entity.r || 25;
      const minDist = entRadius + barrierRadius;

      if (distSq < minDist * minDist) {
        if (typeof this.triggerInfinityBlock === 'function') {
          this.triggerInfinityBlock(entity.x, entity.y, entity);
        }
      }
    }
  }

  _deleteEnemyProjectilesInPurple() {
    return modDeletePurpleProj(this);
  }


  _activateDomain(arena) {
    this.isChannelingDomainExpansion = false;
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

    spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 20, 'UNLIMITED VOID', '#00E5FF');

    if (!this._playedDeployAudio) {
      this._playedDeployAudio = true;
      const activateSound = getSkillSound(this._def?.id, 'domain_activate') || getSkillSound(this._def?.id, 'domain');
      if (activateSound) audioSystem.playSFX(activateSound.src, activateSound.volume);
    }
  }

  _applyDomainEffect() {
    const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
    state.fighters.forEach((f, idx) => {
      if (f && f !== this && f.hp > 0) {
        // Heavenly Restriction: Toji has zero Cursed Energy and is 100% immune to domain sure-hit effects & traps!
        if (f.domainImmunity || f.characterId === 'toji' || f.type === 'toji') return;

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
  }

  // PUBLIC: Draw Unlimited Void cosmic background BEFORE fighters so they aren't overlayed
  drawDomainBackground(ctx, isClashSecondary = false) {
    if (typeof state !== 'undefined' && state.pixiApp) return;
    renderGojoDomainBackground(this, ctx, isClashSecondary);
  }

  _checkReverseCursedTechnique(opponent, arena) {
    if (this.isDead || this.isChannelingAnySkill() || this.isChannelingRCT) return;
    if (this.reverseCursedTechniqueCooldown > 0) return;

    const threshold = CONFIG.gojo.reverseCursedTechniqueHpThreshold || 0.10;
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
    this.reverseCursedTechniqueCooldown = CONFIG.gojo?.reverseCursedTechniqueCooldown || 900;

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

    const healPercent = CONFIG.gojo?.reverseCursedTechniqueHealPercent || 0.35;
    const totalHeal = this.maxHp * healPercent;
    this._totalRctHealTarget = totalHeal;
    this._rctHealPerFrame = 0; // no per-frame ticking — heal is applied instantly below

    // INSTANT HEAL — apply the full RCT heal right now
    this.takeDamage(-totalHeal, this, { isHeal: true, skipHealText: true });

    // Visual effects - prominent green RCT heal indicator
    if (typeof spawnFloatingText === 'function') {
      spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 40, 'RCT HEAL!', '#00FF66');
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
    if (sound) audioSystem.playSFX(sound.src, sound.volume);
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
