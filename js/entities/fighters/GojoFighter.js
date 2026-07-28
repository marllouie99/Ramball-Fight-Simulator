import { Fighter } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST, getHandSize } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { playSound, playLoopingSound, stopLoopingSound, fadeOutLoopingSound, fadeOutSound, fadeOutSoundBySrc } from '../../systems/soundSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../graphics/particles/sparkEffect.js';
import { renderGojoDomainBackground } from './gojo/gojoDomainVisuals.js';
import { activateRed as modActivateRed, detonateRed as modDetonateRed, firePurple as modFirePurple, executePurpleRetreat as modExecutePurpleRetreat, deleteEnemyProjectilesInPurple as modDeletePurpleProj } from './gojo/gojoSkills.js';
import { triggerInfinityBlock as modTriggerInfinityBlock, applyTeleportSlideBrake as modApplyTeleportSlideBrake, executeTeleportDodge as modExecuteTeleportDodge } from './gojo/gojoCombat.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { drawGojoBody } from '../../graphics/fighters/gojoSkin.js';
import { drawGojoWeapon, drawGojoOrb, drawAnamorphicLensFlare } from '../../graphics/weapons/gojoWeaponGraphics.js';

export class GojoFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'gojo';
    this.type = 'gojo';
    this.shootCooldownMax = CONFIG.gojo.blueCooldown ?? def.cooldown;
    this.cooldown = this.shootCooldownMax;
    this.infinityCooldown = 0;
    this.infinityActive = true;

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

    this.reverseCursedTechniqueCooldown = 0;
    this.reverseCursedTechniqueTriggered = false;
    this.healingAuraTimer = 0;  // Timer for healing aura visual effect
    this.isChannelingRCT = false;
    this.rctChannelTimer = 0;

    // Melee Mode (Hand-to-Hand Combat) - Start in Melee Mode for Epic Intro Clash!
    this.isMeleeMode = true;
    this.meleePunchCooldown = 0;
    this.afterImages = []; // Blue afterimages for teleport effect
    this.forcedMeleeTimer = CONFIG.gojo.forcedMeleeIntroDuration ?? 180;
    this.wasForcedMelee = true;
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
    this.reverseCursedTechniqueCooldown = 0;
    this.reverseCursedTechniqueTriggered = false;
    this.healingAuraTimer = 0;
    this.isChannelingRCT = false;
    this.rctChannelTimer = 0;
    // Melee Mode reset - Start round in Melee Mode for Epic Intro Clash!
    this.isMeleeMode = true;
    this.meleePunchCooldown = 0;
    this.hitFlameWisps = [];
    this.afterImages = [];
    this.forcedMeleeTimer = CONFIG.gojo.forcedMeleeIntroDuration ?? 180;
    this.wasForcedMelee = true;
    this.meleeModeCooldown = 0;
    this.combatAuraOpacity = 0;
    this.purpleRecoveryTimer = 0;
    this.purpleRetreatTimer = 0;
    this.redEffectTimer = 0;
    this.redBuildupPhase = false;
    this.infinityBlockTimer = 0;
    this.teleportSlideTimer = 0;
    this.initialTeleportDone = false;
  }

  isChannelingAnySkill() {
    return (
      this.isChannelingDomainExpansion ||
      this.isChannelingPurple ||
      (this.redEffectTimer || 0) > 0 ||
      this.isChannelingRCT ||
      this.domainActive ||
      (this.purpleRecoveryTimer || 0) > 0 ||
      (this.purpleRetreatTimer || 0) > 0
    );
  }

  interruptAttacks() {
    const wasChannelingDomain = this.isChannelingDomainExpansion;
    super.interruptAttacks();
    this.redEffectTimer = 0;
    this.redBuildupPhase = false;
    this.redDetonated = false;
    this.isChannelingPurple = false;
    if (this.isTargetOfAmbush) {
      this.isChannelingDomainExpansion = false;
      this.domainChargeTimer = 0;
    } else {
      this.isChannelingDomainExpansion = wasChannelingDomain;
    }
    this.isTargetOfAmbush = false;
    if (this._purpleChargeSoundHandle) {
      fadeOutSound(this._purpleChargeSoundHandle, 200);
      this._purpleChargeSoundHandle = null;
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
    if (sound) playSound(sound.src, sound.volume);
  }

  triggerInfinityBlock(hitX, hitY, attacker) {
    return modTriggerInfinityBlock(this, hitX, hitY, attacker);
  }

  takeDamage(amount, attacker, opts = {}) {
    // If getting meleed or hit by physical attack, force switch into Melee Mode to punch back
    if (opts.isMelee || (attacker && Math.hypot(attacker.x - this.x, attacker.y - this.y) <= 160)) {
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

    // Check Infinity Passive first
    if (this.infinityCooldown <= 0 && attacker && this.hp > 0 && !opts.isStorm) {
      if (attacker.characterId === 'mahoraga') {
        const totalStages = (attacker.adaptationStage?.melee || 0) + (attacker.adaptationStage?.ranged || 0) + (attacker.adaptationStage?.skill || 0);
        const hasAdapted = (attacker.adapted?.melee) || (totalStages >= 1) || attacker.isMaxAdapted || attacker.isInfinityBlitz || attacker.gojoInfinityImmune;
        
        if (!hasAdapted) {
          // Freeze Mahoraga!
          attacker.isFrozenByInfinity = true;
          attacker.infinityFreezeTimer = CONFIG.gojo?.infinityFreezeDuration || 120;
          attacker.vx = 0;
          attacker.vy = 0;
          if (typeof attacker.interruptAttacks === 'function') attacker.interruptAttacks();
          
          this.triggerInfinityBlock(attacker.x, attacker.y, attacker);
          return false;
        }
        // If hasAdapted is true, Mahoraga completely bypasses Limitless! (Skip the block, proceed to damage)
      } else {
        this.triggerInfinityBlock(attacker.x || this.x, attacker.y || this.y, attacker);
        return false;
      }
    }

    // Check RCT Death Save / Low HP trigger upon taking damage
    const result = super.takeDamage(amount, attacker, opts);
    if (!opts.isHeal && this.reverseCursedTechniqueCooldown <= 0 && !this.isDead) {
      const threshold = CONFIG.gojo.reverseCursedTechniqueHpThreshold || 0.25;
      if (this.hp / this.maxHp <= threshold && this.hp > 0) {
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
    }

    // Snappy Opening Teleport with Blue Afterimages when Countdown Ends!
    if (!this.initialTeleportDone && opponent && !opponent.isDead && typeof state !== 'undefined' && state.gameState === 'playing') {
      this.initialTeleportDone = true;
      const oldX = this.x;
      const oldY = this.y;

      const angleFromOpponent = Math.atan2(oldY - opponent.y, oldX - opponent.x);
      const flankAngle = angleFromOpponent + (Math.random() < 0.5 ? Math.PI * 0.35 : -Math.PI * 0.35);
      const approachDist = opponent.r + this.r + 14;

      let targetX = opponent.x + Math.cos(flankAngle) * approachDist;
      let targetY = opponent.y + Math.sin(flankAngle) * approachDist;

      const activeArena = arena || (state && state.arena ? state.arena : CONFIG.arena);
      if (activeArena) {
        targetX = Math.max(activeArena.x + this.r + 5, Math.min(activeArena.x + activeArena.width - this.r - 5, targetX));
        targetY = Math.max(activeArena.y + this.r + 5, Math.min(activeArena.y + activeArena.height - this.r - 5, targetY));
      }

      this._applyTeleportSlideBrake(oldX, oldY, targetX, targetY, activeArena);
      this.aim(opponent);

      spawnImpactFlash(oldX, oldY, 25, 'lightningTrail');
      spawnImpactFlash(this.x, this.y, 30, 'lightningTrail');
      playSound('Assets/Sound Effects/Skills/dash3.mp3', 0.8);
    }

    if (this.domainActive) {
      // Ultimate Domain Advantage: Gojo cannot be frozen by Time Stop inside his own domain!
      this.timeStopTimer = 0; 
    }

    if (this.isChannelingDomainExpansion && !this.isTargetOfAmbush) {
      // Unstoppable Domain Channeling Hyper-Armor: Clear hitStun & status freezes so non-Toji attacks cannot interrupt!
      this.hitStunTimer = 0;
      this.electricStunTimer = 0;
      this.dubstepStunTimer = 0;
      this.crimsonElectrifiedTimer = 0;
    } else if (this._handleTimeStop()) {
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
      return;
    }

    if (this.redEffectTimer > 0) {
      if (!this._hasPlayedRedChannelingSound) {
        this._hasPlayedRedChannelingSound = true;
        const sChan = getSkillSound(this._def?.id || 21, 'red_channeling') || getSkillSound(21, 'red_channeling');
        playSound(sChan?.src || 'Assets/Sound Effects/Skills/redchanneling.mp3', sChan?.volume ?? 2.0);
      }

      // Buildup phase: freeze nearby enemies in place (near-zero slow)
      const RED_BUILDUP_FRAMES = CONFIG.gojo.redBuildupFrames || 20;
      const redRemaining = this.redEffectTimer;
      const redMax = this.redEffectMaxTimer;
      if (this.redBuildupPhase && redRemaining > redMax - RED_BUILDUP_FRAMES) {
        // still in buildup — hard-freeze nearby enemies by damping velocity directly each frame
        const myTeam = state.getFighterTeam(state.fighters ? state.fighters.indexOf(this) : 0);
        if (state.fighters) {
          state.fighters.forEach((f, idx) => {
            if (f && f !== this && f.hp > 0 && (!f.immuneToCC || f.characterId === 'toji' || f.type === 'toji')) {
              const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
              if (isEnemy) {
                // Directly damp velocity to near-zero each frame (visible freeze)
                f.vx *= 0.05;
                f.vy *= 0.05;
                // Also set slowTimer so applyMovementPhysics won't re-accelerate
                if (typeof f.applySlow === 'function') {
                  f.applySlow(3, 0.05, { isRed: true });
                } else {
                  f.slowTimer = 3;
                  f.slowMultiplier = 0.05;
                }
              }
            }
          });
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

    if (this.infinityCooldown > 0) {
      this.infinityCooldown--;
      if (this.infinityCooldown <= 0) {
        this.infinityActive = true;
      }
    }

    if (this.teleportSlideTimer > 0) {
      this.teleportSlideTimer--;
      this.vx *= 0.64;
      this.vy *= 0.64;
      if (Math.random() < 0.4) {
        spawnSparks(this.x + (Math.random() - 0.5) * this.r, this.y + (Math.random() - 0.5) * this.r, 1, 'lightningTrail', '#00BFFF');
      }
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

    if (this.infinityCooldown > 0) {
      this.infinityCooldown--;
      if (this.infinityCooldown <= 0) this.infinityActive = true;
    }
    if ((this.redEffectTimer || 0) <= 0 && this.redCooldown > 0) this.redCooldown--;
    // Tick down red-slow ring timer on all fighters
    if (state.fighters) {
      state.fighters.forEach(f => {
        if (f && f.redSlowTimer > 0) f.redSlowTimer--;
      });
    }
    if (!this.isChannelingPurple && (this.purpleRecoveryTimer || 0) <= 0 && this.purpleCooldown > 0) this.purpleCooldown--;
    if (!this.domainActive && !this.isChannelingDomainExpansion && this.domainCooldown > 0) this.domainCooldown--;
    if (!this.isChannelingRCT && this.reverseCursedTechniqueCooldown > 0) this.reverseCursedTechniqueCooldown--;
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
        this.postDomainFadeInTimer = 90; // ~1.5 seconds of fade-in after domain ends

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

    // Check for Domain Expansion (Ultimate - disabled in demo preview mode)
    const isSilenced = (this.silenceTimer || 0) > 0;
    if (!this.isDemoFighter && !isSilenced && !this.isChannelingAnySkill() && this.domainCooldown <= 0 && this.domainUseCount < 2 && opponent && !opponent.isDead && this.forcedMeleeTimer <= 0) {
      this.isChannelingDomainExpansion = true;
      this.domainChargeTimer = 0;
      this._domainChannelAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
      this._playedDeployAudio = false;
      triggerGlobalScreenShake(6, 120);
      if (!this._hasPlayedDomainChannelSound) {
        this._hasPlayedDomainChannelSound = true;
        const channelSound = getSkillSound(this._def?.id, 'domain_channel');
        if (channelSound) playSound(channelSound.src, channelSound.volume);
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
      this.vx = 0;
      this.vy = 0;
      this.applyMovementPhysics(0);

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
      const distSq = (this.x - opponent.x) ** 2 + (this.y - opponent.y) ** 2;
      const safeDistance = 300; // Different from Sukuna's 200 to prevent simultaneous casting
      if (distSq > safeDistance ** 2) {
        this.isChannelingPurple = true;
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
                  this._purpleChargeSoundHandle = playSound(sound.src, sound.volume);
                }
              }, delayMs);
            } else {
              this._purpleChargeSoundHandle = playSound(sound.src, sound.volume);
            }
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
        playSound('Assets/Sound Effects/SkillEffects/flare.mp3', 2.0);
      }

      // Play purple deploy sound when Red & Blue have merged and Purple is about to fire (at 75% progress)
      const deployTriggerFrame = Math.floor(this.purpleChargeMax * 0.75);
      if (this.purpleChargeTimer === deployTriggerFrame) {
        const sDeploy = getSkillSound(this._def?.id, 'purple_deploy');
        playSound(sDeploy?.src || 'Assets/Sound Effects/Skills/purpledeploy.mp3', sDeploy?.volume ?? 2.5);
      }

      // 2. Levitation: Gojo rises smoothly in the air as Red and Blue mix
      const levitateProgress = Math.min(1.0, this.purpleChargeTimer / (this.purpleChargeMax * 0.4));
      const maxLevitationHeight = 35;
      this.z = Math.sin(levitateProgress * Math.PI * 0.5) * maxLevitationHeight;

      if (opponent && !opponent.isDead) {
        this.aim(opponent);
        // Lapse Blue Gravitational Distortion: Slows opponent movement by 50% while mixing Red & Blue into Purple!
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

    // Handle Purple Post-Fire Descent (Gojo STOPS during the 2s breather — no movement at all)
    if (this.purpleRecoveryTimer > 0) {
      this.purpleRecoveryTimer--;

      // Smooth sine descent from 35px down to 0px over the timer duration
      const descentProgress = this.purpleRecoveryTimer / 120; // 1.0 down to 0.0
      this.z = Math.sin(Math.min(1, descentProgress) * Math.PI * 0.5) * 35;

      // Completely stop movement during breather — no steering, no drift
      this.vx = 0;
      this.vy = 0;
    }

    // Handle delayed teleport-away after Purple fires (Gojo stays in place while Purple fires/explodes)
    if (this.purpleRetreatTimer > 0) {
      this.purpleRetreatTimer--;
      if (this.purpleRetreatTimer === 0) {
        this._executePurpleRetreat();
      }
    }

    // Handle RCT Channeling (Reverse Cursed Technique - 2.5 seconds heal duration)
    if (this.isChannelingRCT) {
      this.rctChannelTimer--;

      // Gradually heal over the 150 frames (2.5 seconds)
      const healPercent = CONFIG.gojo.reverseCursedTechniqueHealPercent || 0.35;
      const totalHealAmount = this.maxHp * healPercent;
      const healPerFrame = totalHealAmount / 150;
      this.takeDamage(-healPerFrame, this, { isHeal: true });

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
      const triggerRange = CONFIG.gojo.redRange || 100;
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

    // Handle Reversal Red Channeling & Buildup (Gojo stops completely to cast Red before doing anything else)
    if (this.redEffectTimer > 0) {
      this.vx = 0;
      this.vy = 0;
      this.applyMovementPhysics(0);
      if (opponent && !opponent.isDead) {
        this.aim(opponent);
      }
      // Repel & pause any nearby enemy so they don't stick to or push Gojo like a magnet during Red buildup
      if (state.fighters) {
        state.fighters.forEach(f => {
          if (f && f !== this && f.hp > 0) {
            const d = Math.hypot(f.x - this.x, f.y - this.y);
            const minAllowed = this.r + f.r + 15;
            if (d < minAllowed) {
              const pushAngle = Math.atan2(f.y - this.y, f.x - this.x);
              const pushDist = minAllowed - d;
              f.x += Math.cos(pushAngle) * pushDist;
              f.y += Math.sin(pushAngle) * pushDist;
              f.vx = 0;
              f.vy = 0;
              if (typeof f.applyHitStun === 'function') f.applyHitStun(6);
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
        this.vx = 0;
        this.vy = 0;
      } else if (this.meleeModeCooldown > 0) {
        // Mandatory ranged separation period after combo finisher
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
          this.meleeModeCooldown = 240;
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

    // Handle Melee Mode (Hand-to-Hand Combat)
    const canAct = (!this.hitStunTimer || this.hitStunTimer <= 0) && (!this.timeStopTimer || this.timeStopTimer <= 0) && (this.purpleRecoveryTimer <= 0);
    
    if (this.isMeleeMode) {
      if ((this.teleportSlideTimer || 0) <= 0 && canAct) {
        if (opponent && !opponent.isDead) {
          const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
          const reach = this.r + opponent.r + 15;
          if (dist > reach) {
            const dx = opponent.x - this.x;
            const dy = opponent.y - this.y;
            this.vx = (dx / dist) * (this.speed || 4.5);
            this.vy = (dy / dist) * (this.speed || 4.5);
          } else {
            this.vx = 0; // Lock movement when in punching range
            this.vy = 0;
          }
        } else {
          this.vx = 0;
          this.vy = 0;
        }
      }
      if (canAct && opponent && !opponent.isDead) {
        this._updateMeleeCombat(opponent, arena);
      }
    } else {
      // Ranged Mode - Basic attack with blue orbs
      if (this.shootCooldown > 0) {
        this.shootCooldown--;
      } else if (canAct) {
        this.shoot(ownerIndex);
        this.shootCooldown = this.shootCooldownMax;
      }
    }

    const isMovementLocked = (this.teleportSlideTimer > 0) || this.isMeleeMode || this.redBuildupPhase;
    // Hard-stop Gojo's velocity immediately when the orb starts building
    if (this.redBuildupPhase) {
      this.vx *= 0.05;
      this.vy *= 0.05;
    }
    this.applyMovementPhysics(isMovementLocked ? 0 : 1);

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
    const punchCooldown = CONFIG.gojo.meleePunchCooldown || 8;

    // Handle punch cooldown
    if (this.meleePunchCooldown > 0) {
      this.meleePunchCooldown--;

      // Pull Gojo toward opponent to stick during rapid 3-hit combos
      if (opponent && !opponent.isDead && this.meleeComboCount > 0) {
        const dx = opponent.x - this.x;
        const dy = opponent.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > this.r + opponent.r + 5) {
          this.vx += (dx / dist) * 0.8;
          this.vy += (dy / dist) * 0.8;
        }
      }
      return;
    }

    const isTojiOpponent = opponent && (opponent.characterId === 'toji' || opponent.type === 'toji' || opponent._def?.id === 'toji');
    if (!opponent || opponent.isDead || (opponent.isStealthed && !this.domainActive && !isTojiOpponent)) return;

    // Initialize combo state
    if (this.meleeComboCount === undefined) this.meleeComboCount = 0;
    if (this.meleeComboTarget === undefined) this.meleeComboTarget = Math.random() < 0.35 ? 3 : 1;

    // Check if opponent is frozen by domain effect (timeStopTimer or hitStunTimer from domain)
    const opponentIsFrozenByDomain = opponent && (
      (opponent.timeStopTimer && opponent.timeStopTimer > 0) ||
      (opponent.hitStunTimer && opponent.hitStunTimer > 0)
    );

    // Distance check: Teleport if opponent is not frozen by domain OR if out of melee reach
    const distToOpponent = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    const attackReach = this.r + opponent.r + 35;
    const isOutOfReach = distToOpponent > attackReach;

    const shouldTeleport = !opponentIsFrozenByDomain || isOutOfReach || (this.meleeComboCount % (this.meleeComboTarget || 1) === 0);
    if (shouldTeleport) {
      const oldX = this.x;
      const oldY = this.y;

      const angleFromOpponent = Math.atan2(oldY - opponent.y, oldX - opponent.x);
      const flankAngle = angleFromOpponent + (Math.random() < 0.5 ? Math.PI * 0.35 : -Math.PI * 0.35);
      const behindOffset = opponent.r + this.r + 10;
      
      let targetX = opponent.x + Math.cos(flankAngle) * behindOffset;
      let targetY = opponent.y + Math.sin(flankAngle) * behindOffset;

      if (arena) {
        targetX = Math.max(arena.x + this.r, Math.min(arena.x + arena.width - this.r, targetX));
        targetY = Math.max(arena.y + this.r, Math.min(arena.y + arena.height - this.r, targetY));
      }

      this._applyTeleportSlideBrake(oldX, oldY, targetX, targetY, arena);
      this.aim(opponent);

      spawnImpactFlash(oldX, oldY, 20, 'lightningTrail');
      spawnImpactFlash(this.x, this.y, 25, 'lightningTrail');
      playSound('Assets/Sound Effects/Skills/dash3.mp3', 0.6);
    }

    // 2. Execute punch at current position
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

    // Removed hit pause to prevent blue freeze ring on opponent

    // Set cooldown for next punch
    this.meleePunchCooldown = punchCooldown;

    // Reset combo counter and DISENGAGE to ranged mode when combo target is reached
    if (this.meleeComboCount >= this.meleeComboTarget) {
      this.meleeComboCount = 0;
      this.meleeComboTarget = Math.random() < 0.35 ? 3 : 1; // 35% chance for 3 rapid attacks, 65% chance for 1 attack
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

    // Apply a smooth breather pause before resuming Blue orb attacks (prevents snappy instant spam)
    const breatherDuration = CONFIG.gojo.modeSwitchBreatherDuration ?? 45;
    this.shootCooldown = Math.max(this.shootCooldown || 0, breatherDuration);
    this.modeSwitchBreatherTimer = breatherDuration;

    spawnImpactFlash(oldX, oldY, 20, 'lightningTrail');
    spawnImpactFlash(this.x, this.y, 25, 'lightningTrail');
    playSound('Assets/Sound Effects/Skills/dash3.mp3', 0.8);
  }

  /**
   * Execute a melee punch attack
   */
  _meleePunch(opponent) {
    const punchDamage = CONFIG.gojo.meleePunchDamage || 8;

    // Trigger smooth hand punch animation (matches Sukuna's 8-frame punch timing)
    this.punchAnimTimer = 8;
    this.punchAnimHand = this.punchAnimHand === 1 ? 0 : 1; // Strict toggle: 0 = Right hand, 1 = Left hand

    // Apply damage
    opponent.takeDamage(punchDamage, this, { isMelee: true });
    
    // Apply hit stun explicitly to interrupt their current action and prevent counter-attack during combo
    if (typeof opponent.applyHitStun === 'function') {
      opponent.applyHitStun(20);
    }

    // Visual feedback
    spawnFloatingText(opponent.x, opponent.y - opponent.r - 10, 'PUNCH!', '#00BFFF');
    spawnImpactFlash(opponent.x, opponent.y, 20, 'lightningTrail');

    // Knockback the opponent (light on combo build-up, heavy on finisher)
    // NOTE: No knockback during Domain Expansion or its immediate aftermath combo
    if (!this.domainActive && !this.wasForcedMelee) {
      const isFinalHit = this.meleeComboCount >= (this.meleeComboTarget || 1);
      const knockbackForce = isFinalHit ? 6 : 1;
      const angle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      opponent.vx += Math.cos(angle) * knockbackForce;
      opponent.vy += Math.sin(angle) * knockbackForce;
    }

    // Trigger Sakuga Anime Impact Frame (randomized angle & seed for variety)
    this.sakugaImpactTimer = 6;
    this.sakugaImpactMaxTimer = 6;
    this.sakugaImpactX = opponent.x;
    this.sakugaImpactY = opponent.y;
    this.sakugaImpactAngle = Math.random() * Math.PI * 2;
    this.sakugaImpactSeed = Math.random();

    // Spawn residual small stretched Cursed Energy flame wisps at impact point
    if (!this.hitFlameWisps) this.hitFlameWisps = [];
    const impactAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    for (let k = 0; k < 5; k++) {
      const spreadAngle = impactAngle + (Math.random() - 0.5) * 1.4;
      const stretchSpeed = 5 + Math.random() * 7;
      pushTrailCap(this.hitFlameWisps, {
        x: opponent.x + (Math.random() - 0.5) * 12,
        y: opponent.y + (Math.random() - 0.5) * 12,
        vx: Math.cos(spreadAngle) * stretchSpeed,
        vy: Math.sin(spreadAngle) * stretchSpeed,
        angle: spreadAngle,
        timer: 18,
        maxTimer: 18,
        length: 14 + Math.random() * 18,
        width: 3.5 + Math.random() * 3.5,
        color: '#00D4CC'
      }, 30);
    }

    // Screen shake for impact
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
    playSound(sBlast?.src || 'Assets/Sound Effects/Skills/redblast.mp3', sBlast?.volume ?? 2.5);

    // Repel + damage + slow all enemies in radius
    const myTeam = state.getFighterTeam(this.fighterIndex ?? state.fighters.indexOf(this));
    state.fighters.forEach((f, idx) => {
      if (f && f !== this && f.hp > 0) {
        const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
        if (isEnemy) {
          const dist = Math.hypot(this.x - f.x, this.y - f.y);
          if (dist < (CONFIG.gojo.redRange || 100) + 50) {
            // Immediately interrupt ongoing enemy actions & clear timeStop freeze so knockback physics applies immediately
            if (typeof f.interruptAttacks === 'function') {
              f.interruptAttacks();
            }
            f.timeStopTimer = 0;
            f.crimsonElectrifiedTimer = 0;
            f.electricStunTimer = 0;
            f.flurryHitsLeft = 0;
            f.flurryTimer = 0;
            f.rapidSlashHitsLeft = 0;
            f.rapidSlashTimer = 0;
            f.meleeComboCount = 0;
            f.isTeleporting = false;
            f.teleportSlideTimer = 0;
            f.isChannelingDivineFlame = false;
            if (f.isTargetOfAmbush) {
              f.isChannelingDomainExpansion = false;
              f.isChannelingDomain = false;
            }

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
            spawnMeleeClashShockwave(f.x, f.y, 110, 'yuta');

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
  }

  _firePurple(ownerIndex) {
    return modFirePurple(this, ownerIndex);
  }

  _executePurpleRetreat() {
    return modExecutePurpleRetreat(this);
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
    triggerGlobalScreenShake(12, 30);

    if (!this._playedDeployAudio) {
      this._playedDeployAudio = true;
      const activateSound = getSkillSound(this._def?.id, 'domain_activate') || getSkillSound(this._def?.id, 'domain');
      if (activateSound) playSound(activateSound.src, activateSound.volume);
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
            f.applyTimeStop(15);
          }
          f.vx = 0;
          f.vy = 0;

          // Information overload sparks around enemy head
          if (Math.random() < 0.35) {
            spawnSparks(f.x + (Math.random() - 0.5) * f.r, f.y - f.r * 0.5, 3, 'lightningTrail', '#00E5FF');
            spawnImpactFlash(f.x, f.y, 14, 'lightningTrail');
          }
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
            if (typeof ill.applyTimeStop === 'function') ill.applyTimeStop(15);
            ill.vx = 0;
            ill.vy = 0;

            if (Math.random() < 0.35) {
              spawnSparks(ill.x + (Math.random() - 0.5) * ill.r, ill.y - ill.r * 0.5, 3, 'lightningTrail', '#00E5FF');
              spawnImpactFlash(ill.x, ill.y, 14, 'lightningTrail');
            }
          }
        }
      });
    }
  }

  // PUBLIC: Draw Unlimited Void cosmic background BEFORE fighters so they aren't overlayed
  drawDomainBackground(ctx, isClashSecondary = false) {
    renderGojoDomainBackground(this, ctx, isClashSecondary);
  }

  _checkReverseCursedTechnique(opponent, arena) {
    if (this.isDead || this.isChannelingAnySkill()) return;
    if (this.reverseCursedTechniqueCooldown > 0) return;

    const threshold = CONFIG.gojo.reverseCursedTechniqueHpThreshold || 0.10;
    const hpPercent = this.hp / this.maxHp;

    // Trigger when HP drops to threshold or below
    if (hpPercent <= threshold && hpPercent > 0) {
      this._activateReverseCursedTechnique(opponent, arena);
    }
  }

  _activateReverseCursedTechnique(opponent, arena) {
    // Teleport away to a safe distance before performing RCT
    if (opponent && arena) {
      this._teleportAwayFrom(opponent, arena);
    }

    // Start 2.5 second RCT Channeling state
    this.isChannelingRCT = true;
    this.rctChannelTimer = 150; // 2.5 seconds at 60fps
    this.rctVisualMaxTimer = 150;
    this.rctVisualTimer = 150;

    // Set cooldown and aura timer
    this.reverseCursedTechniqueCooldown = CONFIG.gojo.reverseCursedTechniqueCooldown || 900;
    this.healingAuraTimer = 180;  // 3 seconds healing aura

    const healPercent = CONFIG.gojo.reverseCursedTechniqueHealPercent || 0.35;
    const totalHealAmount = this.maxHp * healPercent;

    // Visual effects - prominent green RCT heal indicator
    spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 40, 'RCT', '#00FF66');
    spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 20, '+' + Math.round(totalHealAmount), '#00FF00');

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
    if (sound) playSound(sound.src, sound.volume);
  }

  draw(ctx) {
    if (this.isDead) return;

    // Domain Expansion Channeling Visuals (Ground ring, Aura, and Header Text)
    if (this.isChannelingDomainExpansion && (this.timeStopTimer || 0) <= 0) {
      const progress = Math.min(1.0, this.domainChargeTimer / Math.max(1, this.domainChargeMax));

      ctx.save();
      ctx.translate(this.x, this.y);

      // 1. Floating Text above Gojo's head
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = `rgba(0, 229, 255, ${progress})`; // Bright Cyan text fading in
      ctx.strokeStyle = `rgba(0, 0, 0, ${progress})`;
      ctx.lineWidth = 4;
      ctx.textAlign = 'center';
      const textY = -this.r - 55 - (Math.sin(Date.now() / 150) * 5); // Floating effect
      ctx.strokeText('DOMAIN EXPANSION', 0, textY);
      ctx.fillText('DOMAIN EXPANSION', 0, textY);

      // 2. Isometric Ground Summoning Ring
      ctx.scale(1, 0.4); // Isometric perspective
      const ringRadius = 160 * progress;

      // Outer glowing cyan ring
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = `rgba(0, 229, 255, ${progress})`;
      ctx.stroke();

      // Inner rotating dashed indigo/purple ring
      ctx.rotate(Date.now() / 300);
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius * 0.85, 0, Math.PI * 2);
      ctx.setLineDash([15, 15]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = `rgba(138, 43, 226, ${progress * 1.2})`;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    }

    // Purple Recovery Stasis Ring
    if ((this.purpleRecoveryTimer || 0) > 0) {
      ctx.save();
      const pulse = 1 + Math.sin(Date.now() / 100) * 0.1;
      const ringRadius = (this.r + 10) * pulse;

      // Base glowing aura (Increased opacity for better visibility)
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(138, 43, 226, 0.35)'; // Bright BlueViolet
      ctx.fill();
      ctx.strokeStyle = 'rgba(138, 43, 226, 0.85)';
      ctx.lineWidth = 3.0;
      ctx.stroke();

      // Countdown arc
      const maxRecovery = 120; // 2 seconds
      const ratio = Math.max(0, Math.min(1, this.purpleRecoveryTimer / maxRecovery));
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringRadius + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * ratio));
      ctx.strokeStyle = '#00E5FF'; // Very bright Cyan for maximum visibility
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.restore();
    }

    // Draw Sakuga Anime Impact Frame (matches reference image style with unique angle/variation)
    if (this.sakugaImpactTimer > 0) {
      this._drawSakugaImpactFrame(
        ctx,
        this.sakugaImpactX,
        this.sakugaImpactY,
        this.sakugaImpactTimer,
        this.sakugaImpactMaxTimer,
        this.sakugaImpactAngle || 0,
        this.sakugaImpactSeed || 0
      );
    }

    // Render residual hit flame wisps (soft, flowy, curling JJK spirit flames)
    if (this.hitFlameWisps && this.hitFlameWisps.length > 0) {
      const time = Date.now();
      this.hitFlameWisps.forEach((wisp, idx) => {
        const progress = wisp.timer / wisp.maxTimer;
        ctx.save();
        ctx.translate(wisp.x, wisp.y);
        ctx.rotate(wisp.angle);
        ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.85;

        const len = wisp.length * (0.8 + (1 - progress) * 0.6);
        const width = wisp.width * progress;
        const wave = Math.sin(time * 0.015 + idx * 2.3) * 4;

        // Draw soft, S-curved fluid flame wisp
        ctx.beginPath();
        ctx.moveTo(0, 0); // Flame base
        ctx.quadraticCurveTo(len * 0.4, width * 1.8 + wave, len * 0.75, width * 0.6);
        ctx.quadraticCurveTo(len + wave * 0.5, 0, len * 0.75, -width * 0.6);
        ctx.quadraticCurveTo(len * 0.4, -width * 1.8 - wave, 0, 0);
        ctx.closePath();

        // Soft glowing cyan-teal spirit flame fill
        ctx.fillStyle = 'rgba(0, 212, 204, 0.75)';
        ctx.fill();

        // Inner bright white-mint core flame
        ctx.beginPath();
        ctx.moveTo(len * 0.1, 0);
        ctx.quadraticCurveTo(len * 0.4, width * 0.8 + wave * 0.5, len * 0.6, 0);
        ctx.quadraticCurveTo(len * 0.4, -width * 0.8 - wave * 0.5, len * 0.1, 0);
        ctx.fillStyle = 'rgba(220, 255, 245, 0.6)';
        ctx.fill();

        // Soft translucent dark ink accent edge (hand-drawn JJK wisp accent)
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0, 30, 20, 0.35)';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        ctx.restore();
      });
    }

    // Draw afterimages during dodge & teleports
    if (this.afterImages && this.afterImages.length > 0) {
      ctx.save();
      this.afterImages.forEach(img => {
        if (img && img.timer > 0) {
          const alpha = (img.timer / 8) * 0.5;
          ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
          ctx.fillStyle = img.color || '#00BFFF';
          ctx.beginPath();
          ctx.arc(img.x, img.y, img.r || this.r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();
    }

    // Draw Gojo Punch Impact Effects
    if (this.punchEffects && this.punchEffects.length > 0) {
      this.punchEffects.forEach(effect => {
        const prog = 1 - (effect.timer / effect.maxTimer);
        const alpha = Math.sin((1 - prog) * Math.PI);

        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        // 1. Outer Glowing Blue Shockwave Ring
        const ringRadius = (this.r + 5) * (0.8 + 1.2 * prog);
        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth = 5 * (1 - prog * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 2. High-contrast Black Ink Outline (makes it visible on white/light backgrounds)
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#0a0a0a';
        ctx.lineWidth = 2.5 * (1 - prog * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius * 0.94, 0, Math.PI * 2);
        ctx.stroke();

        // 3. Piercing White Impact Star Core
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        const numRays = 8;
        const innerR = 6 * (1 - prog);
        const outerR = 30 * (0.5 + 0.8 * prog);
        for (let i = 0; i < numRays; i++) {
          const a = (Math.PI * 2 / numRays) * i;
          const ra = a + Math.PI / numRays;
          ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
          ctx.lineTo(Math.cos(ra) * innerR, Math.sin(ra) * innerR);
        }
        ctx.closePath();
        ctx.fill();

        // 4. Directional Cyan Impact Sparks
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 2.5;
        for (let i = -2; i <= 2; i++) {
          const sa = i * 0.3;
          const sDist = ringRadius * 1.1;
          ctx.beginPath();
          ctx.moveTo(Math.cos(sa) * (sDist * 0.5), Math.sin(sa) * (sDist * 0.5));
          ctx.lineTo(Math.cos(sa) * sDist, Math.sin(sa) * sDist);
          ctx.stroke();
        }

        ctx.restore();
      });
    }

    // Draw afterimages during teleports & high-speed moves
    if (this.afterImages && this.afterImages.length > 0) {
      for (let i = 0; i < this.afterImages.length; i++) {
        const img = this.afterImages[i];
        if (img && img.timer > 0) {
          const maxT = img.maxTimer || 20;
          const progress = Math.max(0, Math.min(1, img.timer / maxT));
          const alpha = Math.pow(progress, 0.7) * 0.2;

          ctx.save();

          // 1. Dash Trajectory Line (Electric Cyan)
          if (img.fromX !== undefined && img.toX !== undefined) {
            ctx.save();
            ctx.globalAlpha = alpha * 0.5;
            ctx.strokeStyle = '#00BFFF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(img.fromX, img.fromY);
            ctx.lineTo(img.toX, img.toY);
            ctx.stroke();

            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(img.fromX, img.fromY);
            ctx.lineTo(img.toX, img.toY);
            ctx.stroke();
            ctx.restore();
          }

          ctx.translate(img.x, img.y);
          ctx.rotate(img.angle || 0);

          // 2. Limitless Electric Cyan Cursed Energy Glow
          ctx.save();
          // OPTIMIZED: Replaced expensive radial gradient with layered alpha circles
          ctx.beginPath();
          ctx.arc(0, 0, this.r * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 100, 255, ${alpha * 0.3})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(0, 0, this.r * 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 191, 255, ${alpha * 0.5})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(0, 0, this.r * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
          ctx.fill();
          ctx.restore();

          // 3. Body Circle Silhouette
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(0, 0, this.r * 1.1, 0, Math.PI * 2);
          ctx.fillStyle = '#00BFFF';
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // 4. Electric Blue Six Eyes Glints
          ctx.fillStyle = '#E0FFFF';
          ctx.beginPath();
          ctx.arc(this.r * 0.5, -this.r * 0.25, 3, 0, Math.PI * 2);
          ctx.arc(this.r * 0.5, this.r * 0.25, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();

          ctx.restore();
        }
      }
    }

    // (Reversal Red effect now drawn AFTER body — see below)

    // 1. Draw JJK Cursed Energy Flame Aura BEHIND body
    // Suppress aura while channeling Hollow Purple so Red & Blue orbs stand out cleanly
    // Also suppress when frozen by Gojo's own domain or when his domain is active
    const isFrozenByDomain = (this.timeStopTimer > 0) || (this.hitStunTimer > 0);
    const isInOwnDomain = this.domainActive;
    if (this.isChannelingPurple) {
      // Aura suppressed during Hollow Purple orb fusion
    } else if (this.isChannelingRCT || this.healingAuraTimer > 0) {
      this._drawJJKCursedEnergyAura(ctx, 'rct');
    } else if (!isFrozenByDomain && !isInOwnDomain && (this.combatAuraOpacity > 0 || state.gameState === 'countdown' || this._isWinnerReveal)) {
      this._drawJJKCursedEnergyAura(ctx, 'blue');
    }

    // Draw hand Cursed Energy flame blobs BEHIND body
    this._drawHandCursedEnergyAura(ctx);

    // 2. Draw fighter body
    drawGojoBody(ctx, this);

    if (!this.isChannelingPurple) {
      this.drawGun(ctx);
    }

    // 3. Draw physical circle hands + flare ON TOP of body
    this._drawHandCursedEnergy(ctx);

    // Draw Hollow Purple Red & Blue fusing orbs ON TOP of hands so hands don't cover them
    if (this.isChannelingPurple) {
      this.drawGun(ctx);
    }

    // Draw Reversal Red Orb + blast ON TOP of body and hands
    if (this.redEffectTimer > 0) {
      this._drawReversalRedEffect(ctx);
    }

    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);

    // Draw Reversal Red slow countdown rings on any affected enemies
    if (state.fighters) {
      state.fighters.forEach(f => {
        if (f && f !== this && f.redSlowTimer > 0) {
          this._drawRedSlowRing(ctx, f);
        }
      });
    }

    if (this._isWinnerReveal) {
      const t = Date.now();
      const orbitRadius = this.r + 40; 
      
      const drawOrbitingOrb = (colorType, angleOffset) => {
        const angle = (t / 600) + angleOffset;
        const ox = this.x + Math.cos(angle) * orbitRadius;
        const oy = this.y + Math.sin(angle) * orbitRadius * 0.4 - 10;
        drawGojoOrb(ctx, ox, oy, 9, t, colorType, 0);
      };
      
      drawOrbitingOrb('red', 0);
      drawOrbitingOrb('blue', (Math.PI * 2) / 3);
      drawOrbitingOrb('purple', (Math.PI * 4) / 3);
    }
  }

  // Calculate hand positions for melee punch / skill gestures
  _getHandPositions() {
    const basePosY = (this.y - (this.z || 0));

    // Champion Screen / Victory Reveal / Fighter Index Stance / Round Countdown: Hide hands completely
    const isCountdown = typeof state !== 'undefined' && state.gameState === 'countdown';
    const isWinnerScreen = this._isWinnerReveal || isCountdown || (typeof state !== 'undefined' && (state.gameState === 'matchEnd' || state.gameState === 'roundEnd' || state.gameState === 'indexDetail' || state.gameState === 'index'));
    if (isWinnerScreen) {
      return null;
    }

    // Do not display extra hands when Reversal Red is active, when target of ambush, or in ranged mode (unless using punch/purple/domain)
    if (this.redEffectTimer > 0 || this.isTargetOfAmbush) {
      return null;
    }
    const isUsingHandSkill = (this.punchAnimTimer > 0) || (this.isChannelingPurple) || (this.isChannelingDomainExpansion);
    if (!this.isMeleeMode && !isUsingHandSkill) {
      return null;
    }

    // Dynamic hand animation offsets (Left hand rests in center of body by default)
    let frontOffset = 6;
    let frontAngleOffset = 0;

    let backHandX = this.x - Math.cos(this.gunAngle + Math.PI / 2) * (this.r * 0.35);
    let backHandY = basePosY - Math.sin(this.gunAngle + Math.PI / 2) * (this.r * 0.35);
    let hideFrontHand = false;
    let hideBackHand = false;

    // 1. Snappy Melee Punch Animation (Alternating 1-2 punches with clear Left & Right fist paths)
    if (this.punchAnimTimer > 0) {
      const t = (8 - Math.min(8, this.punchAnimTimer)) / 8; // 0 to 1 progress over 8 frames
      const snap = t < 0.25 ? (t / 0.25) : Math.max(0, 1 - (t - 0.25) / 0.75); // Thrusts out 25%, smoothly retracts 75%

      if (this.punchAnimHand === 0) {
        // --- RIGHT HAND PUNCH (Strikes along right flank) ---
        frontAngleOffset = 0.22;         // Right side angle offset
        frontOffset += snap * 26;        // Right hand punches 26px forward

        // Left hand stays tucked in tight martial arts guard at chest
        const guardAngle = this.gunAngle - 0.35;
        const guardDist = this.r * 0.4;
        backHandX = this.x + Math.cos(guardAngle) * guardDist;
        backHandY = basePosY + Math.sin(guardAngle) * guardDist;
      } else {
        // --- LEFT HAND PUNCH (Strikes along left flank) ---
        const backAngle = this.gunAngle - 0.22; // Left side angle offset
        const backOffset = (this.r + 6) + snap * 26;
        backHandX = this.x + Math.cos(backAngle) * backOffset; // Left hand punches 26px forward!
        backHandY = basePosY + Math.sin(backAngle) * backOffset;

        // Right hand pulls into tight right guard at chest
        frontAngleOffset = 0.35;
        frontOffset = -this.r * 0.5;
      }
    }

    // 2. Hollow Purple Fusion Gesture - Hands dynamically cup & merge Red (+Y) and Blue (-Y) orbs
    else if (this.isChannelingPurple) {
      const mergeProgress = typeof this.getPurpleChargeProgress === 'function' ? this.getPurpleChargeProgress() : 0;
      const handDistance = this.r + 10;
      const handSpread = 14 * (1 - mergeProgress);

      // Right hand (front hand) holding Red Orb on +Y (Right side)
      const rightRotX = Math.cos(this.gunAngle) * handDistance - Math.sin(this.gunAngle) * handSpread;
      const rightRotY = Math.sin(this.gunAngle) * handDistance + Math.cos(this.gunAngle) * handSpread;
      const frontHandX = this.x + rightRotX;
      const frontHandY = basePosY + rightRotY;

      // Left hand (back hand) holding Blue Orb on -Y (Left side)
      const leftRotX = Math.cos(this.gunAngle) * handDistance - Math.sin(this.gunAngle) * (-handSpread);
      const leftRotY = Math.sin(this.gunAngle) * handDistance + Math.cos(this.gunAngle) * (-handSpread);
      backHandX = this.x + leftRotX;
      backHandY = basePosY + leftRotY;

      return { frontHandX, frontHandY, backHandX, backHandY, hideFrontHand, hideBackHand };
    }


    // 4. Domain Expansion Hand Sign Gesture
    else if (this.isChannelingDomainExpansion) {
      const domainDist = this.r + 8;
      const frontHandX = this.x + Math.cos(this.gunAngle) * domainDist - Math.sin(this.gunAngle) * 3;
      const frontHandY = basePosY + Math.sin(this.gunAngle) * domainDist + Math.cos(this.gunAngle) * 3;

      backHandX = this.x + Math.cos(this.gunAngle) * domainDist - Math.sin(this.gunAngle) * (-3);
      backHandY = basePosY + Math.sin(this.gunAngle) * domainDist + Math.cos(this.gunAngle) * (-3);

      return { frontHandX, frontHandY, backHandX, backHandY, hideFrontHand, hideBackHand };
    }

    // Front hand (Right hand) default position
    const frontAngle = this.gunAngle + frontAngleOffset;
    let frontHandX = this.x + Math.cos(frontAngle) * (this.r + frontOffset);
    let frontHandY = basePosY + Math.sin(frontAngle) * (this.r + frontOffset);

    // Safety Clamp: Prevent hands from extending above the top boundary of body circle (-this.r + 6)
    const maxTopY = basePosY - (this.r - 6);
    if (frontHandY < maxTopY && (frontOffset < 0 || Math.abs(frontAngleOffset) > 1.0)) {
      frontHandY = maxTopY;
    }
    if (backHandY < maxTopY && !this.isChannelingPurple && !this.isChannelingDomainExpansion) {
      backHandY = maxTopY;
    }

    return { frontHandX, frontHandY, backHandX, backHandY, hideFrontHand, hideBackHand };
  }

  // Render hand Cursed Energy flame aura BEHIND physical body
  _drawHandCursedEnergyAura(ctx) {
    // Hide Cursed Energy aura on hands during domain activation and domain expansion
    if (this.isChannelingDomainExpansion || this.domainActive) return;

    const hands = this._getHandPositions();
    if (!hands) return;

    const isRCT = (this.isChannelingRCT || this.healingAuraTimer > 0);
    const isPurple = (this.isChannelingPurple);
    const isFrozenByDomain = (this.timeStopTimer > 0) || (this.hitStunTimer > 0);
    const isActive = !isRCT && !isPurple && !isFrozenByDomain && ((this.combatAuraOpacity > 0.05) || (this.isMeleeMode) || (this.punchAnimTimer > 0) || (this.redEffectTimer > 0) || (state.gameState === 'countdown'));

    if (isActive) {
      // During Phase 1 (orb buildup), suppress the hand aura so the red orb stands alone.
      // During Phase 2+ blast the hand aura can show.
      const buildupFrames = (typeof CONFIG !== 'undefined' && CONFIG.gojo?.redBuildupFrames) || 20;
      const totalFrames  = this.redEffectMaxTimer || 75;
      const elapsed      = totalFrames - this.redEffectTimer;
      const isOrbBuildup = (this.redEffectTimer > 0) && this.redBuildupPhase;
      if (isOrbBuildup) return; // Suppress during buildup — orb renders on top

      const theme = (this.redEffectTimer > 0 ? 'blue' : 'blue'); // always blue for hand aura
      const blobRadius = (this.punchAnimTimer > 0) ? 15.0 : 12.0;

      if (!hands.hideFrontHand) this._drawJJKCursedEnergyAura(ctx, theme, hands.frontHandX, hands.frontHandY, blobRadius);
      if (!hands.hideBackHand) this._drawJJKCursedEnergyAura(ctx, theme, hands.backHandX, hands.backHandY, blobRadius);
    }
  }

  // Render physical circle hands ON TOP of body
  _drawHandCursedEnergy(ctx) {
    const hands = this._getHandPositions();
    if (!hands) return;

    const { frontHandX, frontHandY, backHandX, backHandY, hideFrontHand, hideBackHand } = hands;

    // Draw Physical Circle Hands ON TOP of body
    ctx.save();
    ctx.fillStyle = this.color || '#FFE4C4';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;

    if (!hideFrontHand) {
      ctx.beginPath();
      ctx.arc(frontHandX, frontHandY, getHandSize(6.5, this), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (!hideBackHand) {
      ctx.beginPath();
      ctx.arc(backHandX, backHandY, getHandSize(6.5, this), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // Draw Cursed Energy fist glow around punching hand during punch animation ON TOP of fighters (suppressed during domain)
    if (this.punchAnimTimer > 0 && !this.domainActive && !this.isChannelingDomainExpansion) {
      const strikingX = this.punchAnimHand === 0 ? frontHandX : backHandX;
      const strikingY = this.punchAnimHand === 0 ? frontHandY : backHandY;

      ctx.save();
      ctx.translate(strikingX, strikingY);

      // Glowing Cursed Energy aura around punching fist
      const auraGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
      auraGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      auraGrad.addColorStop(0.35, 'rgba(0, 229, 255, 0.85)');
      auraGrad.addColorStop(0.7, 'rgba(0, 150, 255, 0.4)');
      auraGrad.addColorStop(1, 'rgba(0, 100, 255, 0)');

      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      // Sharp Cyan Cursed Energy Ray Flares
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const rayAngle = (Math.PI / 2) * i + (Date.now() * 0.01);
        ctx.beginPath();
        ctx.moveTo(Math.cos(rayAngle) * 3, Math.sin(rayAngle) * 3);
        ctx.lineTo(Math.cos(rayAngle) * 12, Math.sin(rayAngle) * 12);
        ctx.stroke();
      }

      ctx.restore();
    }

  }

  drawOutline(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.color;
    ctx.stroke();
  }

  _drawHealingAura(ctx) {
    const progress = this.healingAuraTimer / 180; // Fade out as timer decreases
    const time = Date.now();

    // Use source-over to properly layer colors on white background
    // 'lighter' blending on white background makes colors invisible
    ctx.globalCompositeOperation = 'source-over';

    // OPTIMIZED: Replaced 5 expensive per-frame radial gradients with layered alpha circles
    // which look nearly identical but render exponentially faster.
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = progress;

    // === LAYER 1: THE DARK OUTER EDGE (Deep Blue Silhouette) ===
    const outerRadius = this.r * 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(40, 120, 255, 0.4)';
    ctx.fill();

    // === LAYER 2: SOFT SMUDGING (Rich Blue Gradient) ===
    const smokeRadius = this.r * 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, smokeRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(80, 160, 255, 0.5)';
    ctx.fill();

    // === LAYER 3: THE BRIGHT CORE (Vibrant Blue) ===
    const coreRadius = this.r * 1.1;
    ctx.beginPath();
    ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120, 200, 255, 0.6)';
    ctx.fill();

    // === LAYER 4: THE HOT CENTER (Bright Emerald Green & Cyan Core) ===
    const whiteHotRadius = this.r * 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, whiteHotRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 150, 0.7)';
    ctx.fill();
    
    ctx.restore();

    // === LAYER 5: CAST DEEP SHADOWS (Dark Shadows on Back Side) ===
    // Creates dramatic contrast by placing dark shadows on parts facing away
    ctx.save();
    ctx.translate(this.x, this.y);

    // Shadow gradient - darker on the opposite side of the energy source
    const shadowAngle = Math.atan2(-this.vy, -this.vx) || 0; // Shadow opposite to movement
    ctx.rotate(shadowAngle);

    const shadowGrad = ctx.createRadialGradient(0, 0, this.r * 0.8, 0, 0, this.r * 1.4); // Reduced from 2
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shadowGrad.addColorStop(0.5, `rgba(40, 120, 200, ${0.9 * progress})`); // Brighter blue shadow
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    // Draw shadow crescent on the back side
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 2, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.arc(0, 0, this.r * 0.8, Math.PI * 0.3, -Math.PI * 0.3, true);
    ctx.closePath();
    ctx.fillStyle = shadowGrad;
    ctx.fill();

    ctx.restore();

    // === LAYER 6: SHARP OUTLINES (Fine Whipping Wind Lines) ===
    // Sharp, whipping wind lines showing the direction the energy is flowing
    ctx.save();
    ctx.translate(this.x, this.y);

    const windLineCount = 16;
    for (let i = 0; i < windLineCount; i++) {
      const baseAngle = (Math.PI * 2 / windLineCount) * i;
      const wobble = Math.sin(time * 0.008 + i * 0.5) * 0.1;
      const angle = baseAngle + wobble;

      const startDist = this.r * (0.6 + Math.sin(time * 0.01 + i) * 0.1); // Reduced from 0.9
      const length = this.r * (0.5 + Math.sin(time * 0.012 + i * 0.7) * 0.4); // Reduced from 0.8

      const x1 = Math.cos(angle) * startDist;
      const y1 = Math.sin(angle) * startDist;
      const x2 = Math.cos(angle) * (startDist + length);
      const y2 = Math.sin(angle) * (startDist + length);

      // Draw sharp wind line with gradient - bright blue for visibility
      const windGrad = ctx.createLinearGradient(x1, y1, x2, y2);
      windGrad.addColorStop(0, `rgba(120, 200, 255, ${0.98 * progress})`);
      windGrad.addColorStop(0.5, `rgba(100, 180, 255, ${0.9 * progress})`);
      windGrad.addColorStop(1, 'rgba(80, 160, 255, 0)');

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = windGrad;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Extra sharp tip at the end - bright cyan
      ctx.beginPath();
      ctx.arc(x2, y2, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150, 220, 255, ${1.0 * progress})`;
      ctx.fill();
    }
    ctx.restore();

    // === LAYER 7: FLAME TENDRILS (The Iconic Engulfed-in-Flames Effect) ===
    ctx.save();
    ctx.translate(this.x, this.y);

    const flameCount = 8;
    for (let i = 0; i < flameCount; i++) {
      const baseAngle = (Math.PI * 2 / flameCount) * i;
      const rotation = time * 0.003; // Slow rotation
      const angle = baseAngle + rotation;

      ctx.save();
      ctx.rotate(angle);

      // Flame tendril - animated wavy shape
      const flameLength = this.r * (1.0 + Math.sin(time * 0.01 + i) * 0.3); // Reduced from 1.4
      const flameWidth = this.r * 0.3; // Reduced from 0.4

      // Create flame gradient (bright blue for visibility)
      const flameGrad = ctx.createLinearGradient(this.r * 0.6, 0, this.r * 0.6 + flameLength, 0);
      flameGrad.addColorStop(0, `rgba(120, 200, 255, ${1.0 * progress})`); // Bright blue base
      flameGrad.addColorStop(0.3, `rgba(100, 180, 255, ${0.98 * progress})`); // Vivid blue
      flameGrad.addColorStop(0.6, `rgba(80, 160, 255, ${0.9 * progress})`); // Medium blue
      flameGrad.addColorStop(1, 'rgba(60, 140, 255, 0)'); // Fade to blue

      // Draw wavy flame shape
      ctx.beginPath();
      ctx.moveTo(this.r * 0.6, 0);

      const segments = 10;
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const x = this.r * 0.6 + flameLength * t;
        const waveOffset = Math.sin(time * 0.015 + j * 0.5 + i * 0.8) * flameWidth * (1 - t * 0.5);
        const width = flameWidth * (1 - t * 0.7);

        ctx.lineTo(x, waveOffset - width * 0.5);
      }

      for (let j = segments; j >= 0; j--) {
        const t = j / segments;
        const x = this.r * 0.6 + flameLength * t;
        const waveOffset = Math.sin(time * 0.015 + j * 0.5 + i * 0.8) * flameWidth * (1 - t * 0.5);
        const width = flameWidth * (1 - t * 0.7);

        ctx.lineTo(x, waveOffset + width * 0.5);
      }

      ctx.closePath();
      ctx.fillStyle = flameGrad;
      ctx.fill();

      // Inner bright core of flame (bright cyan hot streak)
      ctx.beginPath();
      ctx.moveTo(this.r * 0.7, 0);
      const innerLength = flameLength * 0.5;
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const x = this.r * 0.7 + innerLength * t;
        const waveOffset = Math.sin(time * 0.02 + j * 0.6 + i) * flameWidth * 0.25 * (1 - t);
        ctx.lineTo(x, waveOffset);
      }
      ctx.strokeStyle = `rgba(150, 220, 255, ${1.0 * progress})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();

    // === LAYER 8: ROTATING ENERGY RINGS (Swirling Domain-like Effect) ===
    ctx.save();
    ctx.translate(this.x, this.y);

    const ringRotation = time * 0.004;
    ctx.rotate(ringRotation);

    const ringRadius = this.r * 1.2; // Reduced from 1.6

    // Draw elliptical rings at different angles
    for (let r = 0; r < 3; r++) {
      ctx.save();
      ctx.rotate(r * Math.PI / 3);

      ctx.beginPath();
      ctx.ellipse(0, 0, ringRadius, ringRadius * (0.18 + r * 0.08), 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100, 180, 255, ${(0.95 - r * 0.2) * progress})`;
      ctx.lineWidth = 3 - r * 0.5;
      
      // OPTIMIZED: Removed shadowBlur. Used an alpha layered stroke for glow effect
      ctx.stroke();
      ctx.lineWidth = (3 - r * 0.5) * 2;
      ctx.strokeStyle = `rgba(80, 160, 255, ${(0.3) * progress})`;
      ctx.stroke();

      ctx.restore();
    }

    // Counter-rotating inner rings (Green RCT Energy Swirls)
    ctx.rotate(-ringRotation * 2);
    const innerRingRadius = this.r * 0.8;

    for (let r = 0; r < 2; r++) {
      ctx.save();
      ctx.rotate(r * Math.PI / 2 + Math.PI / 4);

      ctx.beginPath();
      ctx.ellipse(0, 0, innerRingRadius, innerRingRadius * 0.15, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 136, ${(0.95 - r * 0.15) * progress})`;
      ctx.lineWidth = 2.5;
      
      // OPTIMIZED: Removed shadowBlur. Used an alpha layered stroke for glow effect
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.strokeStyle = `rgba(0, 255, 136, ${(0.3) * progress})`;
      ctx.stroke();

      ctx.restore();
    }

    ctx.shadowBlur = 0;
    ctx.restore();

    // === LAYER 9: FLOATING CURSED ENERGY PARTICLES ===
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
      const seed = i * 1337.7331;
      const angle = (time * 0.002) + seed;
      const baseDist = this.r * (0.4 + (seed % 30) / 30); // Reduced from 0.6
      const wobble = Math.sin(time * 0.008 + seed) * 8; // Reduced from 12
      const dist = baseDist + wobble;

      const px = this.x + Math.cos(angle) * dist;
      const py = this.y + Math.sin(angle) * dist;

      const particleSize = 2 + (seed % 5);
      const alpha = 0.5 + Math.sin(time * 0.01 + seed) * 0.3;

      // Particle glow - bright blue for visibility
      const particleGrad = ctx.createRadialGradient(px, py, 0, px, py, particleSize * 4);
      particleGrad.addColorStop(0, `rgba(150, 220, 255, ${alpha * progress})`);
      particleGrad.addColorStop(0.5, `rgba(120, 200, 255, ${alpha * 0.8 * progress})`);
      particleGrad.addColorStop(1, 'rgba(100, 180, 255, 0)');

      ctx.beginPath();
      ctx.arc(px, py, particleSize * 4, 0, Math.PI * 2);
      ctx.fillStyle = particleGrad;
      ctx.fill();

      // Bright core - bright cyan
      ctx.beginPath();
      ctx.arc(px, py, particleSize * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 240, 255, ${alpha * progress})`;
      ctx.fill();
    }

    // === LAYER 10: OUTER FLAME CROWN (Top Flames Rising Up) ===
    ctx.save();
    ctx.translate(this.x, this.y);

    const crownFlameCount = 12;
    for (let i = 0; i < crownFlameCount; i++) {
      const angle = (Math.PI * 2 / crownFlameCount) * i - Math.PI / 2; // Start from top
      const flameHeight = this.r * (0.4 + Math.sin(time * 0.012 + i * 0.7) * 0.25); // Reduced from 0.6

      ctx.save();
      ctx.rotate(angle);

      // Rising flame with bright blue gradient
      const crownGrad = ctx.createLinearGradient(0, -this.r, 0, -this.r - flameHeight);
      crownGrad.addColorStop(0, `rgba(120, 200, 255, ${0.98 * progress})`);
      crownGrad.addColorStop(0.4, `rgba(100, 180, 255, ${0.9 * progress})`);
      crownGrad.addColorStop(0.8, `rgba(80, 160, 255, ${0.7 * progress})`);
      crownGrad.addColorStop(1, 'rgba(60, 140, 255, 0)');

      ctx.beginPath();
      ctx.moveTo(-7, -this.r);
      ctx.quadraticCurveTo(
        Math.sin(time * 0.01 + i) * 8, -this.r - flameHeight * 0.5,
        0, -this.r - flameHeight
      );
      ctx.quadraticCurveTo(
        Math.sin(time * 0.01 + i + 1) * 8, -this.r - flameHeight * 0.5,
        7, -this.r
      );
      ctx.closePath();
      ctx.fillStyle = crownGrad;
      ctx.fill();

      // Bright cyan hot tip
      ctx.beginPath();
      ctx.arc(0, -this.r - flameHeight, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150, 220, 255, ${1.0 * progress})`;
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    // Spawn occasional healing particles while aura is active
    if (Math.random() < 0.4) {
      const angle = Math.random() * Math.PI * 2;
      const dist = this.r * (0.5 + Math.random() * 0.5);
      const px = this.x + Math.cos(angle) * dist;
      const py = this.y + Math.sin(angle) * dist;
      spawnSparks(px, py, 1, 'healing');
    }
  }

  drawGun(ctx) {
    if (this.isChannelingDomainExpansion || this.domainActive) return;
    drawGojoWeapon(ctx, this);
  }

  /**
   * Render JJK-authentic Cursed Energy Flame Aura engulfing the character.
   * Smooth, flowing flame silhouette with thick dark ink contour (not spiky).
   */
  _drawJJKCursedEnergyAura(ctx, colorTheme = 'blue', overrideX = null, overrideY = null, overrideRadius = null) {
    // Calculate smooth fade-in & fade-out progress
    let progress = 1.0;
    if (overrideX !== null) {
      progress = 1.0;
    } else if (colorTheme === 'rct') {
      progress = Math.min(1, (this.healingAuraTimer / 180) || (this.rctChannelTimer / 150) || 1);
    } else {
      progress = Math.min(1, Math.max(0, this.combatAuraOpacity || 0));
    }

    if (progress <= 0) return;

    // Stepped 30-frame anime animation loop (30 FPS Sakuga frame rate)
    const frameRate = 30;
    const frameIndex = Math.floor((Date.now() / 1000) * frameRate) % 30;
    const time = frameIndex * 120; // 30 distinct stepped frames

    ctx.save();
    const posX = overrideX !== null ? overrideX : this.x;
    const posY = overrideY !== null ? overrideY : (this.y - (this.z || 0));
    ctx.translate(posX, posY);
    ctx.globalCompositeOperation = 'source-over';

    const r = overrideRadius !== null ? overrideRadius : this.r;

    // === Luminous Body Backlight (Soft Electric Blue Bloom - Matching Yuta) ===
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const glowRadius = r + 90 + Math.sin(time * 0.005) * 8;
    const backGlow = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, glowRadius);
    if (colorTheme === 'rct') {
      backGlow.addColorStop(0, `rgba(255, 255, 255, ${0.5 * progress})`);
      backGlow.addColorStop(0.5, `rgba(50, 205, 50, ${0.3 * progress})`);
      backGlow.addColorStop(1, 'rgba(50, 205, 50, 0)');
    } else if (colorTheme === 'red') {
      backGlow.addColorStop(0, `rgba(255, 255, 255, ${0.5 * progress})`);
      backGlow.addColorStop(0.4, `rgba(255, 50, 0, ${0.4 * progress})`);
      backGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
    } else if (colorTheme === 'purple') {
      backGlow.addColorStop(0, `rgba(255, 255, 255, ${0.5 * progress})`);
      backGlow.addColorStop(0.4, `rgba(180, 50, 255, ${0.4 * progress})`);
      backGlow.addColorStop(1, 'rgba(120, 0, 255, 0)');
    } else {
      backGlow.addColorStop(0, `rgba(255, 255, 255, ${0.45 * progress})`);   // Soft white core
      backGlow.addColorStop(0.35, `rgba(0, 212, 255, ${0.40 * progress})`); // Electric cyan bloom
      backGlow.addColorStop(0.7, `rgba(0, 140, 255, ${0.18 * progress})`);  // Soft outer feathering
      backGlow.addColorStop(1, 'rgba(0, 100, 255, 0)');
    }
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = backGlow;
    ctx.fill();
    ctx.restore();

    let mainColor = '#00D4CC';
    let fillColor = `rgba(0, 212, 204, ${0.70 * progress})`;
    let coreColor = `rgba(200, 255, 250, ${0.85 * progress})`;

    if (colorTheme === 'rct') {
      mainColor = '#32CD32';
      fillColor = `rgba(50, 205, 50, ${0.70 * progress})`;
      coreColor = `rgba(144, 238, 144, ${0.85 * progress})`;
    } else if (colorTheme === 'red') {
      mainColor = '#FF1100';
      fillColor = `rgba(255, 17, 0, ${0.72 * progress})`;
      coreColor = `rgba(255, 120, 100, ${0.85 * progress})`;
    } else if (colorTheme === 'purple') {
      mainColor = '#9900FF';
      fillColor = `rgba(153, 0, 255, ${0.72 * progress})`;
      coreColor = `rgba(204, 120, 255, ${0.85 * progress})`;
    }
    const strokeColor = '#000000'; // Pure pitch black JJK ink contour

    // (Removed shadowBlur for 60 FPS performance)

    // Generate smooth flame contour points (Viscous Liquid Fire Silhouette - stretching Sakuga tongues)
    const numPoints = 28;
    const baseRadius = overrideX !== null ? (r + 9.0) : (r + 15);
    const points = [];
    const moveOffset = (this.x + this.y) * 0.015;
    const stretchMult = overrideX !== null ? 0.2 : 1.0;

    for (let i = 0; i < numPoints; i++) {
      const angle = (Math.PI * 2 / numPoints) * i;

      // Upward direction bias (flames flow upward on body, symmetrical on hands)
      const upFactor = Math.max(0, -Math.sin(angle) + 0.25) * stretchMult;
      const sideFactor = 1.0 - upFactor * 0.5;

      // Base shape evolution for stretching flame tongues
      const baseTongue1 = Math.pow(Math.sin(angle * 1.5 + time * 0.0005 - moveOffset * 0.2) * 0.5 + 0.5, 3.0) * 25 * upFactor;
      const baseTongue2 = Math.pow(Math.cos(angle * 2.2 - time * 0.0004 + moveOffset * 0.15) * 0.5 + 0.5, 2.5) * 18 * upFactor;

      // Localized height flicker
      const tongueFlicker = Math.sin(time * 0.002 + i * 1.4) * 5 * upFactor;
      const sideWave = Math.sin(time * 0.0012 + i * 0.8) * 4 * sideFactor;

      const totalRadius = baseRadius + baseTongue1 + baseTongue2 + tongueFlicker + sideWave;

      points.push({
        x: Math.cos(angle) * totalRadius,
        y: Math.sin(angle) * totalRadius
      });
    }

    // Draw smooth closed curve through midpoints (no sharp corners)
    ctx.beginPath();
    let mx = (points[numPoints - 1].x + points[0].x) / 2;
    let my = (points[numPoints - 1].y + points[0].y) / 2;
    ctx.moveTo(mx, my);

    for (let i = 0; i < numPoints; i++) {
      const p = points[i];
      const next = points[(i + 1) % numPoints];
      const midX = (p.x + next.x) / 2;
      const midY = (p.y + next.y) / 2;
      ctx.quadraticCurveTo(p.x, p.y, midX, midY);
    }
    ctx.closePath();

    // Fill with translucent cursed energy
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Ink brush stroke outline (varying thickness like calligraphy brush)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = strokeColor;
    ctx.globalAlpha = progress;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineWidth = 2.2;
    ctx.beginPath();
    let mxG = (points[numPoints - 1].x + points[0].x) / 2;
    let myG = (points[numPoints - 1].y + points[0].y) / 2;
    ctx.moveTo(mxG, myG);
    for (let i = 0; i < numPoints; i++) {
      const p = points[i];
      const next = points[(i + 1) % numPoints];
      ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
    }
    ctx.closePath();
    ctx.stroke();

    // Inner bright core wash (scaled down flame silhouette matching Yuta)
    ctx.save();
    ctx.scale(0.75, 0.75);
    ctx.beginPath();
    ctx.moveTo(mx, my);
    for (let i = 0; i < numPoints; i++) {
      const p = points[i];
      const next = points[(i + 1) % numPoints];
      const midX = (p.x + next.x) / 2;
      const midY = (p.y + next.y) / 2;
      ctx.quadraticCurveTo(p.x, p.y, midX, midY);
    }
    ctx.closePath();
    ctx.fillStyle = coreColor;
    ctx.fill();
    ctx.restore();

    // Rough, thin black ink brush cuts & hatches moving along the border contour
    ctx.globalAlpha = 0.9 * progress;
    ctx.strokeStyle = '#000000';
    ctx.lineCap = 'butt';

    // Draw 3 layers of thin, rough, broken/cut ink lines moving alongside the border
    const insetScales = [0.84, 0.91, 0.96];
    for (let layer = 0; layer < insetScales.length; layer++) {
      const scale = insetScales[layer];
      const speedDir = (layer % 2 === 0 ? 1 : -1);
      const flowTime = time * 0.003 * speedDir;

      for (let i = 0; i < numPoints; i++) {
        // Dynamic moving cuts & breaks traveling around the border over time
        const cutSeed = Math.sin(i * 17.3 + layer * 31.7 + flowTime * 2.5);
        if (cutSeed < -0.1) continue;

        const p = points[i];
        const next = points[(i + 1) % numPoints];
        const prev = points[(i - 1 + numPoints) % numPoints];

        // Dynamic animated ink jitter for flowing hand-drawn anime texture
        const jitterX = Math.sin(i * 7.9 + layer * 5.3 + time * 0.005) * 1.8;
        const jitterY = Math.cos(i * 11.3 - layer * 3.7 + time * 0.004) * 1.8;

        const midX = (p.x * scale + next.x * scale) / 2 + jitterX;
        const midY = (p.y * scale + next.y * scale) / 2 + jitterY;
        const prevMidX = (prev.x * scale + p.x * scale) / 2 - jitterX * 0.5;
        const prevMidY = (prev.y * scale + p.y * scale) / 2 - jitterY * 0.5;

        // Thinner stroke width with pulsing pressure along the movement
        const pressureNoise = Math.sin(time * 0.005 + i * 2.3 + layer * 5.1) * 0.5 + 0.5;
        ctx.lineWidth = 0.6 + pressureNoise * 1.6;

        ctx.beginPath();
        ctx.moveTo(prevMidX, prevMidY);
        ctx.quadraticCurveTo(p.x * scale + jitterX, p.y * scale + jitterY, midX, midY);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1.0;

    // Soft rising flame wisps (smooth curves, not sharp tendrils)
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 * progress;
    for (let k = 0; k < 3; k++) {
      const baseAngle = -Math.PI * 0.5 + (k - 1) * 0.5;
      const sway = Math.sin(time * 0.003 + k * 2.1) * 0.2;
      const fa = baseAngle + sway;
      const len = r + 18 + Math.sin(time * 0.004 + k * 1.7) * 5;

      ctx.beginPath();
      ctx.moveTo(Math.cos(fa) * (r + 8), Math.sin(fa) * (r + 8));
      ctx.quadraticCurveTo(
        Math.cos(fa + sway * 0.5) * (len * 0.7),
        Math.sin(fa + sway * 0.5) * (len * 0.7),
        Math.cos(fa + sway) * len,
        Math.sin(fa + sway) * len
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawSakugaImpactFrame(ctx, x, y, timer, maxTimer, angleOffset = 0, seed = 0) {
    const progress = 1 - (timer / maxTimer);
    const alpha = timer / maxTimer;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angleOffset);
    ctx.scale(0.25, 0.25);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 1.5));

    // 1. Bright white center void
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 70 * (1 + progress * 0.3), 0, Math.PI * 2);
    ctx.fill();

    // 2. Ink clusters radiating outward (varied based on seed)
    const clusters = [
      { angle: -Math.PI * 0.75 + (seed * 0.3), dist: 55 + (seed * 15), scale: 1.2, lines: 7 },
      { angle: -Math.PI * 0.25 - (seed * 0.2), dist: 75 - (seed * 10), scale: 1.5, lines: 9 },
      { angle: 0.1 + (seed * 0.4), dist: 65 + (seed * 12), scale: 0.8, lines: 5 },
      { angle: Math.PI * 0.35 - (seed * 0.3), dist: 85 - (seed * 18), scale: 1.4, lines: 8 },
      { angle: Math.PI * 0.65 + (seed * 0.2), dist: 75 + (seed * 14), scale: 1.1, lines: 7 },
      { angle: Math.PI * 0.85 - (seed * 0.4), dist: 95 - (seed * 16), scale: 1.3, lines: 8 },
      { angle: -Math.PI * 0.9 + (seed * 0.25), dist: 85 + (seed * 10), scale: 1.0, lines: 6 },
    ];

    ctx.fillStyle = '#0a0a0a';
    ctx.strokeStyle = '#0a0a0a';

    clusters.forEach(c => {
      ctx.save();
      const cx = Math.cos(c.angle) * (c.dist + progress * 20);
      const cy = Math.sin(c.angle) * (c.dist + progress * 20);
      ctx.translate(cx, cy);
      ctx.rotate(c.angle + Math.PI / 2);

      // Cluster of parallel sharp ink brush spikes
      const numLines = c.lines;
      const width = 22 * c.scale;
      for (let i = 0; i < numLines; i++) {
        const lx = (i / (numLines - 1) - 0.5) * width;
        const length = (55 + Math.sin(i * 1.5) * 30) * c.scale;
        const thick = (2 + (i % 3) * 1.2) * c.scale;

        ctx.lineWidth = thick;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, -length);
        ctx.stroke();
      }

      // Base ink blob connecting the cluster spikes
      ctx.beginPath();
      ctx.moveTo(-width * 0.5, 3);
      ctx.lineTo(width * 0.5, 3);
      ctx.lineTo(width * 0.3, -15 * c.scale);
      ctx.lineTo(-width * 0.3, -15 * c.scale);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });

    // 3. Purple & Cyan inner line-art traces (matching subtle color in reference image)
    ctx.strokeStyle = '#8A2BE2';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI * 2 / 4) * i + 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20);
      ctx.lineTo(Math.cos(a) * 50, Math.sin(a) * 50);
      ctx.stroke();
    }

    ctx.strokeStyle = '#00BFFF';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI * 2 / 4) * i + 0.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 25, Math.sin(a) * 25);
      ctx.lineTo(Math.cos(a) * 60, Math.sin(a) * 60);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Render Cursed Technique Reversal: Red — three-phase animation:
   *   Phase 1 (buildup): Red orb manifests and swells at Gojo's fingertip. Enemies are frozen.
   *   Phase 2 (BOOM): Detonation flash — orb explodes into repulsion cone + rings.
   *   Phase 3 (fade): Blast wave expands and dissipates.
   */
  _drawReversalRedEffect(ctx) {
    const totalFrames  = this.redEffectMaxTimer;           // e.g. 75
    const remaining    = this.redEffectTimer;              // counts down from totalFrames → 0
    const elapsed      = totalFrames - remaining;          // 0 → totalFrames
    const buildupEnd   = CONFIG.gojo.redBuildupFrames || 20; // first 20 frames = Phase 1
    const angle        = this.redTargetAngle || this.gunAngle || 0;
    const fingerDist   = this.r + 14;
    const time         = Date.now();
    const maxRange     = (CONFIG.gojo.redRange || 100) + 50;

    // Smooth screen dimming with deep crimson vignette overlay as Gojo charges Red
    let screenDimAlpha = 0;
    if (elapsed <= buildupEnd) {
      const buildProg = elapsed / buildupEnd; // 0 to 1
      screenDimAlpha = Math.sin(buildProg * Math.PI * 0.5) * 0.65; // Smooth ramp up to 0.65
    } else {
      const blastProg = (elapsed - buildupEnd) / Math.max(1, totalFrames - buildupEnd); // 0 to 1
      screenDimAlpha = (1 - blastProg) * 0.65; // Smooth fade out after blast
    }

    if (screenDimAlpha > 0.01) {
      ctx.save();
      const canvas = (typeof state !== 'undefined' && state.canvas) ? state.canvas : null;
      const cw = canvas ? canvas.width : 2000;
      const ch = canvas ? canvas.height : 2000;
      const maxR = Math.max(cw, ch) * 1.5;

      const redGrad = ctx.createRadialGradient(this.x, this.y - (this.z || 0), 20, this.x, this.y - (this.z || 0), maxR);
      redGrad.addColorStop(0, `rgba(140, 0, 25, ${screenDimAlpha * 0.25})`);
      redGrad.addColorStop(0.3, `rgba(70, 0, 12, ${screenDimAlpha * 0.60})`);
      redGrad.addColorStop(0.65, `rgba(25, 0, 5, ${screenDimAlpha * 0.85})`);
      redGrad.addColorStop(1, `rgba(0, 0, 0, ${screenDimAlpha * 0.95})`);

      ctx.fillStyle = redGrad;
      ctx.fillRect(-600, -600, cw + 1200, ch + 1200);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y - (this.z || 0));
    ctx.rotate(angle);

    // ─── Phase 1: Red orb manifests and swells at Gojo's fingertip ─────────
    if (elapsed <= buildupEnd) {
      const buildProg  = elapsed / buildupEnd;       // 0 → 1
      const eased      = buildProg * buildProg;       // smooth ease-in

      const baseR = getHandSize(6) * (0.2 + eased * 1.8);
      const pulse  = Math.sin(time / 120) * 0.08;
      const r2     = baseR * (1 + pulse);

      // Manifest red orb at Gojo's fingertip
      drawGojoOrb(ctx, fingerDist, 0, r2, time, 'red', 0);

      // Draw Anamorphic Red Lens Flare Beam delayed until right before explosion (final 25% of orb charge)
      if (buildProg > 0.75) {
        const flareP = (buildProg - 0.75) / 0.25; // 0.0 to 1.0 fast intense ignition right before explosion
        drawAnamorphicLensFlare(ctx, fingerDist, 0, flareP, 'red');

        if (!this._hasPlayedRedFlareSound) {
          this._hasPlayedRedFlareSound = true;
          triggerGlobalScreenShake(8, 12); // Pre-detonation flare tremor
          const sDep = getSkillSound(this._def?.id, 'red_deploy');
          playSound(sDep?.src || 'Assets/Sound Effects/Skills/reddeploy.mp3', sDep?.volume ?? 2.0);
        }
      }
    }


    // ─── Phase 2 + 3: BOOM and Fade (elapsed > buildupEnd) ──────────────────
    else {
      const blastElapsed = elapsed - buildupEnd;           // 0 → (totalFrames - buildupEnd)
      const blastTotal   = totalFrames - buildupEnd;
      const blastProg    = blastElapsed / blastTotal;      // 0 → 1

      // Fade-out alpha: peaks at 0 and fades toward 1
      const alpha = Math.max(0, Math.sin((1 - blastProg) * Math.PI));
      ctx.globalAlpha = alpha;

      const beamLength = maxRange * (0.2 + blastProg * 1.1);
      const beamSpread = 40  * (0.4 + blastProg * 0.9);

      // 1. Repulsion cone beam
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const coneGrad = ctx.createLinearGradient(fingerDist, 0, fingerDist + beamLength, 0);
      coneGrad.addColorStop(0,    'rgba(255, 255, 255, 1.0)');
      coneGrad.addColorStop(0.2,  'rgba(255, 0, 51, 0.9)');
      coneGrad.addColorStop(0.65, 'rgba(200, 0, 40, 0.45)');
      coneGrad.addColorStop(1,    'rgba(150, 0, 20, 0)');
      ctx.beginPath();
      ctx.moveTo(fingerDist, 0);
      ctx.lineTo(fingerDist + beamLength, -beamSpread);
      ctx.quadraticCurveTo(fingerDist + beamLength * 1.1, 0, fingerDist + beamLength, beamSpread);
      ctx.closePath();
      ctx.fillStyle = coneGrad;
      ctx.fill();
      ctx.restore();

      // 2. JJK ink-brush arc strokes along the repulsion wave
      ctx.strokeStyle = '#000000';
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      const numArcs = 6;
      for (let k = 0; k < numArcs; k++) {
        const arcDist    = fingerDist + 15 + k * (beamLength / numArcs) * (0.5 + blastProg * 0.6);
        const arcSpread  = (22 + k * 16 * blastProg) * (Math.PI / 180);
        const numSegs    = 16;
        for (let layer = 0; layer < 2; layer++) {
          const offsetR = arcDist * (layer === 0 ? 1.0 : 0.95);
          for (let i = 0; i < numSegs; i++) {
            const a1 = -arcSpread + (arcSpread * 2 / numSegs) * i;
            const a2 = -arcSpread + (arcSpread * 2 / numSegs) * (i + 1);
            if (Math.sin(i * 13.7 + k * 23.1 + layer * 41.5 + time * 0.01) < -0.15) continue;
            const pn = Math.sin(i * 3.1 + k * 5.7 + time * 0.02) * 0.5 + 0.5;
            ctx.lineWidth = 0.6 + pn * 2.8;
            ctx.beginPath();
            ctx.arc(Math.sin(i * 9.1 + k * 17.3) * 0.8, Math.cos(i * 11.3 + k * 19.7) * 0.8, offsetR, a1, a2);
            ctx.stroke();
          }
        }
      }

      // 3. Expanding crimson repulsion rings (centered on Gojo, fan toward target)
      ctx.save();
      ctx.strokeStyle = '#FF0033';
      ctx.lineWidth = 3.5 * (1 - blastProg * 0.5);
      for (let rIdx = 0; rIdx < 3; rIdx++) {
        const ringR = (this.r + 15) + (rIdx * 38 + blastProg * 120);
        ctx.beginPath();
        ctx.arc(0, 0, ringR, -Math.PI * 0.65, Math.PI * 0.65);
        ctx.stroke();
      }
      ctx.restore();

      // 4. Fingertip orb — shrinks and fades using same drawGojoOrb visual as blast releases
      const orbR = getHandSize(10) * (1 - blastProg * 0.85);
      if (orbR > 1) {
        ctx.globalAlpha = alpha * (1 - blastProg * 0.6);
        drawGojoOrb(ctx, fingerDist, 0, orbR, time, 'red', 0);
        ctx.globalAlpha = alpha; // restore for anything after
      }
    }

    ctx.restore();
  }

  /**
   * Draw the crimson countdown ring on a fighter that was hit by Reversal Red slow.
   * The ring shrinks from full circumference to nothing as redSlowTimer counts down.
   */
  _drawRedSlowRing(ctx, target) {
    if (!target || !target.redSlowTimer || target.redSlowTimer <= 0) return;
    const prog     = target.redSlowTimer / (target.redSlowMaxTimer || 120); // 1 → 0
    const ringR    = target.r + 8 + (1 - prog) * 4;   // expands slightly as it fades
    const arcEnd   = prog * Math.PI * 2;               // full circle → zero arc
    const alpha    = Math.min(1, prog * 1.8);

    ctx.save();
    ctx.translate(target.x, target.y);

    // Outer crimson glow ring
    ctx.strokeStyle = `rgba(255, 0, 40, ${alpha * 0.45})`;
    ctx.lineWidth   = 5;
    ctx.beginPath();
    ctx.arc(0, 0, ringR + 3, -Math.PI / 2, -Math.PI / 2 + arcEnd);
    ctx.stroke();

    // Bright crimson core ring
    ctx.strokeStyle = `rgba(255, 60, 60, ${alpha * 0.85})`;
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + arcEnd);
    ctx.stroke();

    // White hot leading edge dot
    const ledX = Math.cos(-Math.PI / 2 + arcEnd) * ringR;
    const ledY = Math.sin(-Math.PI / 2 + arcEnd) * ringR;
    ctx.fillStyle = `rgba(255, 220, 220, ${alpha})`;
    ctx.beginPath();
    ctx.arc(ledX, ledY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
