import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave, spawnAnimePunchImpactFrame } from '../../graphics/particles/sparkEffect.js';
import { state, triggerGlobalScreenShake, spawnFloatingText } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { playSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawMahoragaSword } from '../../graphics/weapons/mahoragaWeaponGraphics.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';

// ── Refactored Mahoraga Modules ──
import { handleAdaptationDamage, triggerAdaptation, handleInfinityFreeze } from './mahoraga/mahoragaAdaptation.js';
import { gojoPurpleTeleportDodge, gojoRedTeleportDodge, startAdaptationFlashDash, spawnTeleportAfterimages, sukunaFugaTeleportDodge, generalSkillShotTeleportDodge } from './mahoraga/mahoragaSkills.js';
import { performMeleeAttack, executeCleave, shootBladeBarrage, executeShout, getFrontRadiusTargets, playRandomHeavyPunchSound } from './mahoraga/mahoragaCombat.js';
import { drawMahoragaFighter } from './mahoraga/mahoragaVisuals.js';
import { SKILL_REGISTRY } from '../../configs/skills/skillRegistry.js';

export class MahoragaFighter extends Fighter {
  constructor(def) {
    super(def);
    
    // Adaptation Tracking (Multi-stage up to 8 wheel turns!)
    this.hitsTaken = {
      melee: 0,
      ranged: 0,
      skill: 0
    };
    
    this.adaptationStage = {
      melee: 0,
      ranged: 0,
      skill: 0
    };

    this.goldAdaptationStage = {
      melee: 0,
      ranged: 0,
      skill: 0
    };

    this.adapted = {
      melee: false,
      ranged: false,
      skill: false
    };

    // Gojo-Specific Adaptation Tracking
    this.gojoAdapted = { purple: false, red: false, blue: false };
    this._lastGojoHitType = null;
    this.gojoBlueDragImmune = false;
    this.gojoPurpleDodgeReady = false;
    this.gojoRedDodgeReady = false;
    this.totalAccumDamage = 0;
    this.accumTimer = 0;
    this.fatalAdaptCooldown = 0;
    this.gojoAdaptColorHistory = [];
    this.infinityFreezeCount = 0;
    this.gojoInfinityImmune = false;

    // Sukuna-Specific Adaptation Tracking
    this.sukunaAdapted = { divineFlame: false };
    this.sukunaFugaDodgeReady = false;
    this._lastSukunaHitType = null;

    // General Skill Shot Adaptation Tracking
    this.adaptedSkills = {};
    this.skillDodgeReady = {};
    this._lastSkillShotId = null;
    this._lastSkillShotColor = null;

    // Wheel glow color override (set by Gojo adaptation type)
    this.wheelGlowColor = null;

    // Defense Pose Variables
    this.defensePoseType = null;
    this.defensePoseTimer = 0;
    this.defensePoseMaxTimer = 0;

    // Wheel Visuals
    this.wheelRotation = 0;
    this.wheelTargetRotation = 0;
    this.wheelGlowTimer = 0;
    this.wheelClickTimer = 0;

    // Combat Mechanics
    this.swordCooldown = 0;
    this.cleaveCooldown = CONFIG.mahoraga?.cleaveCooldown || 600;
    this.isCleaving = false;
    this.cleaveWindupTimer = 0;
    this.adaptationPauseTimer = 0;
    this._pendingCounterTarget = null;

    this.shoutCooldown = CONFIG.mahoraga?.shoutCooldown || 480;
    this.isShouting = false;
    this.shoutWindupTimer = 0;

    this.throwCooldown = CONFIG.mahoraga?.initialThrowCooldown ?? (CONFIG.mahoraga?.throwCooldown || 1000);
    this.isThrowing = false;
    this.throwBarrageShotsLeft = 0;
    this.throwBarrageTimer = 0;
    this.bladeRetractProgress = 1.0;

    this.isBlitzActive = false;
    this.blitzHitsLeft = 0;
    this.blitzTimer = 0;
    this.blitzTarget = null;
    this.blitzStayTimer = 0;
    this.blitzTotalDuration = 0;
  }

  reset() {
    super.reset();
    
    this.hitsTaken = { melee: 0, ranged: 0, skill: 0 };
    this.adaptationStage = { melee: 0, ranged: 0, skill: 0 };
    this.goldAdaptationStage = { melee: 0, ranged: 0, skill: 0 };
    this.adapted = { melee: false, ranged: false, skill: false };
    
    // Gojo-Specific Adaptation Reset
    this.gojoAdapted = { purple: false, red: false, blue: false };
    this._lastGojoHitType = null;
    this.gojoBlueDragImmune = false;
    this.gojoPurpleDodgeReady = false;
    this.gojoRedDodgeReady = false;
    this.totalAccumDamage = 0;
    this.accumTimer = 0;
    this.fatalAdaptCooldown = 0;
    this.gojoAdaptColorHistory = [];
    this.infinityFreezeCount = 0;
    this.gojoInfinityImmune = false;

    // Sukuna-Specific Adaptation Reset
    this.sukunaAdapted = { divineFlame: false };
    this.sukunaFugaDodgeReady = false;
    this._lastSukunaHitType = null;
    this.wheelGlowColor = null;

    // General Skill Shot Adaptation Reset
    this.adaptedSkills = {};
    this.skillDodgeReady = {};
    this._lastSkillShotId = null;
    this._lastSkillShotColor = null;
    
    // Defense Pose Reset
    this.defensePoseType = null;
    this.defensePoseTimer = 0;
    this.defensePoseMaxTimer = 0;
    
    this.wheelRotation = 0;
    this.wheelTargetRotation = 0;
    this.wheelGlowTimer = 0;
    this.wheelClickTimer = 0;
    this.shieldIconTimer = 0;
    this.shieldIconReduction = 12;

    this.swordCooldown = 0;
    this.cleaveCooldown = CONFIG.mahoraga?.cleaveCooldown || 600;
    this.isCleaving = false;
    this.cleaveWindupTimer = 0;
    this.adaptationPauseTimer = 0;
    this._pendingCounterTarget = null;

    this.shoutCooldown = CONFIG.mahoraga?.shoutCooldown || 480;
    this.isShouting = false;
    this.shoutWindupTimer = 0;

    this.throwCooldown = CONFIG.mahoraga?.initialThrowCooldown ?? (CONFIG.mahoraga?.throwCooldown || 1000);
    this.isThrowing = false;
    this.throwBarrageShotsLeft = 0;
    this.throwBarrageTimer = 0;
    this.bladeRetractProgress = 1.0;

    this.isBlitzActive = false;
    this.blitzHitsLeft = 0;
    this.blitzTimer = 0;
    this.blitzTarget = null;
    this.blitzStayTimer = 0;
    this.blitzTotalDuration = 0;

    this.isInfinityBlitz = false;
    this.infinityBlitzDurationTimer = 0;
    this.infinityBlitzCooldownTimer = 0;
    this.infinityBlitzTimer = 0;
    this.infinityBlitzAttacksInSeq = 0;
    this.infinityBlitzSpinSpeed = 0;

    this.adaptationDashTimer = 0;
    this.adaptationDashIsCounter = false;
    this.teleportCounterPending = false;
    this.adaptationAfterimages = [];
    this.hasAnnouncedLevel2 = false;

    this.isShouting = false;
    this.shoutWindupTimer = 0;
    this.isThrowing = false;
    this.throwBarrageShotsLeft = 0;
    this.throwBarrageTimer = 0;
  }

  interruptAttacks() {
    super.interruptAttacks();
    this.isCleaving = false;
    this.cleaveWindupTimer = 0;
    this.isShouting = false;
    this.shoutWindupTimer = 0;
    this.isThrowing = false;
    this.throwBarrageShotsLeft = 0;
    this.throwBarrageTimer = 0;
    this.defensePoseTimer = 0;
  }

  /**
   * Mahoraga rotates his body (this.angle) as he aims for the target.
   * gunAngle matches this.angle so gunAngle and body orientation rotate together.
   */
  aim(opponent) {
    if (!opponent || this.isTargetOfAmbush) {
      return;
    }

    let targetX = opponent.x;
    let targetY = opponent.y;
    if (opponent.type === 'musashi' && opponent.flurryHitsLeft > 0 && opponent.flurryGhost) {
      targetX = opponent.flurryGhost.x;
      targetY = opponent.flurryGhost.y;
    }

    const targetAngle = Math.atan2(targetY - this.y, targetX - this.x);

    if (opponent.isStealthed) {
      const currentAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
      let diff = targetAngle - currentAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      const turnRate = CONFIG.toji?.stealthTurnRate || 0.035;
      this.gunAngle = currentAngle + diff * turnRate;
      this.angle = this.gunAngle;
      return;
    }

    this.gunAngle = targetAngle;
    this.angle = targetAngle;
  }

  takeDamage(amount, attacker, opts = {}) {
    if (this.hp <= 0 || (this.isAmbushing && !opts.isDomain)) return false;

    // Add dodge i-frame invincibility check!
    if (this.dodgeIFrames > 0) return false;

    // Domain Expansion Sure-Hit Bypass Check
    const isUnblockable = opts.isUnblockable || opts.isDomain;

    if (!isUnblockable && this.isFrozenByInfinity) {
      return false; // Takes no damage while completely frozen in Infinity!
    }

    if (opts.isDomain && (this.adaptationDashTimer > 0 || this.isAmbushing)) {
      return false;
    }

    // Parry Check (only if not frozen by TimeStop/Infinity/Domain stasis)
    const isFrozen = this.timeStopTimer > 0 || this.isFrozenByInfinity;
    if (!isFrozen) {
      const totalGoldStages = (this.goldAdaptationStage?.melee || 0) + 
                              (this.goldAdaptationStage?.ranged || 0) + 
                              (this.goldAdaptationStage?.skill || 0);
      
      const parryChancePerStage = CONFIG.mahoraga?.parryChancePerStage || 0.08;
      const parryMaxChance = CONFIG.mahoraga?.parryMaxChance || 0.75;
      const parryChance = Math.min(parryMaxChance, totalGoldStages * parryChancePerStage);

      // Slashes and attacks cannot be parried if they are unblockable dot ticks
      const isActuallyUnblockable = isUnblockable || opts.isPoison || opts.isBurn || opts.isFlame || opts.fromBlackHole;

      if (!isActuallyUnblockable && totalGoldStages > 0 && Math.random() < parryChance) {
        // Roll 50% chance between active blade Parry and crossed-arm Guard
        const isParry = Math.random() < 0.5;
        const totalFrames = isParry 
          ? (CONFIG.mahoraga?.parryDurationFrames || 25) 
          : (CONFIG.mahoraga?.guardDurationFrames || 60);

        this.defensePoseType = isParry ? 'parry' : 'guard';
        this.defensePoseTimer = totalFrames;
        this.defensePoseMaxTimer = totalFrames;

        const wheelY = this.y - this.r - 28;

        if (isParry) {
          spawnFloatingText(this.x, wheelY - 20, 'PARRIED!', '#FFD700');
          spawnImpactFlash(this.x, this.y, 35, '#FFD700');

          // Spawn Yuta-style golden sparks distributed along the length of his sword
          const swingAngle = Math.PI * 0.25; // Approximate starting angle of parry swing
          const bladeAngle = this.gunAngle + swingAngle;
          const shoulderX = this.x + Math.cos(this.gunAngle + Math.PI/2) * (this.r * 0.20) + Math.cos(this.gunAngle) * (this.r * 0.75);
          const shoulderY = this.y + Math.sin(this.gunAngle + Math.PI/2) * (this.r * 0.20) + Math.sin(this.gunAngle) * (this.r * 0.75);
          
          for (let i = 0; i < 14; i++) {
            const offset = 10 + Math.random() * 55;
            const sx = shoulderX + Math.cos(bladeAngle) * offset;
            const sy = shoulderY + Math.sin(bladeAngle) * offset;
            spawnSparks(sx, sy, 1, 'silver', '#FFD700');
          }

          // Spin the wheel slightly as a visual indicator
          this.wheelGlowTimer = 30;
          this.wheelRotation = (this.wheelRotation || 0) + 0.45;

          // Play parry clash sounds
          const parrySnd = getSkillSound(this.id, 'parry');
          if (parrySnd) {
            audioSystem.playSFX(parrySnd.src, parrySnd.volume);
          } else {
            audioSystem.playSFX('attack_swordswing', 0.85);
            audioSystem.playSFX('skill_dash5', 0.5);
          }
        } else {
          // Guard / Block Pose (Crossed arms covering face)
          spawnFloatingText(this.x, wheelY - 20, 'BLOCKED!', '#EBEBE6');
          spawnImpactFlash(this.x, this.y, 45, 'silver');
          spawnSparks(this.x, this.y, 10, 'silver', '#EBEBE6');

          // Spin the wheel slightly as a visual indicator
          this.wheelGlowTimer = 25;
          this.wheelRotation = (this.wheelRotation || 0) + 0.25;

          // Play heavy block impact sound
          const blockSnd = getSkillSound(this.id, 'shieldblock');
          if (blockSnd) {
            audioSystem.playSFX(blockSnd.src, blockSnd.volume);
          } else {
            audioSystem.playSFX('skill_dash5', 0.7);
          }
        }

        // Deal 0 damage to Mahoraga
        return false;
      }
    }

    // ── INSTANT DODGE INTERCEPT FOR SKILL SHOTS ──
    // If we are hit by an adaptable skill shot that we've adapted to and are ready to dodge,
    // we intercept it here to prevent frame-order bugs where the skill shot hits us before our update loop can dodge it!
    if (opts.isAdaptableSkillShot && opts.skillShotId !== 'tojiAmbush' && this.adaptedSkills && this.adaptedSkills[opts.skillShotId] && this.skillDodgeReady && this.skillDodgeReady[opts.skillShotId]) {
      const registryEntry = SKILL_REGISTRY[opts.skillShotId];
      const mockProj = opts.projectile || {
        skillShotId: opts.skillShotId,
        skillShotColor: registryEntry ? registryEntry.skillShotColor : (opts.skillShotColor || '#FFFFFF'),
        dodgeRadius: registryEntry ? registryEntry.dodgeRadius : (opts.isLaser ? (CONFIG.laser?.beamLength || 140) : (opts.dodgeRadius || 140)),
        x: attacker ? attacker.x : this.x,
        y: attacker ? attacker.y : this.y
      };
      
      this._generalSkillShotTeleportDodge(attacker, mockProj);
      return false; // Take 0 damage, dodge instantly!
    }

    const { finalAmount, type } = handleAdaptationDamage(this, amount, attacker, opts);
    const result = super.takeDamage(finalAmount, attacker, opts);
    return result;
  }

  // Delegating to module functions via thin wrappers
  _triggerAdaptation(type, attacker) { triggerAdaptation(this, type, attacker); }
  _gojoPurpleTeleportDodge(gojo, purpleOrb) { gojoPurpleTeleportDodge(this, gojo, purpleOrb); }
  _gojoRedTeleportDodge(gojo) { gojoRedTeleportDodge(this, gojo); }
  _sukunaFugaTeleportDodge(sukuna, fugaOrb) { sukunaFugaTeleportDodge(this, sukuna, fugaOrb); }
  _generalSkillShotTeleportDodge(attacker, projectile) { generalSkillShotTeleportDodge(this, attacker, projectile); }
  _startAdaptationFlashDash(attacker) { startAdaptationFlashDash(this, attacker); }
  _spawnTeleportAfterimages(oldX, oldY, newX, newY, customAngle) { spawnTeleportAfterimages(this, oldX, oldY, newX, newY, customAngle); }
  _performMeleeAttack(opponent) { performMeleeAttack(this, opponent); }
  _executeCleave(opponent) { executeCleave(this, opponent); }
  _executeShout(opponent, ownerIndex) { executeShout(this, opponent, ownerIndex); }
  _playRandomHeavyPunchSound(volume) { playRandomHeavyPunchSound(volume); }
  _getFrontRadiusTargets(maxRangeOffset, coneAngle) { return getFrontRadiusTargets(this, maxRangeOffset, coneAngle); }

  shoot(ownerIndex) { shootBladeBarrage(this, ownerIndex); }

  update(opponent, ownerIndex, arena) {
    if (this.dodgeIFrames > 0) this.dodgeIFrames--;

    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // Wheel Rotation Tick (runs even if frozen by domains for lore accuracy!)
    if (this.isInfinityBlitz) {
      this.infinityBlitzSpinSpeed = CONFIG.mahoraga?.infinityBlitzWheelSpinSpeed || 0.08;
      this.wheelRotation += this.infinityBlitzSpinSpeed;
      this.wheelTargetRotation = this.wheelRotation;
      this.wheelClickTimer = 0;
    } else if ((this.infinityBlitzSpinSpeed || 0) > 0.001) {
      this.wheelRotation += this.infinityBlitzSpinSpeed;
      this.infinityBlitzSpinSpeed *= 0.96;
      this.wheelTargetRotation = this.wheelRotation;
      if (this.infinityBlitzSpinSpeed <= 0.001) this.infinityBlitzSpinSpeed = 0;
    } else if (this.wheelClickTimer > 0) {
      this.wheelClickTimer--;
      this.wheelRotation += (this.wheelTargetRotation - this.wheelRotation) * 0.25;
    } else if (this.wheelTargetRotation !== undefined) {
      this.wheelRotation = this.wheelTargetRotation;
    }
    if (this.wheelGlowTimer > 0) this.wheelGlowTimer--;

    const isFrozen = this._handleTimeStop();
    const isInfinityFrozen = handleInfinityFreeze(this);

    if (isFrozen || isInfinityFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      this.adaptationPauseTimer = 0;
      this.adaptationDashTimer = 0;
      this._pendingCounterTarget = null;
      return; // MANDATORY: Stop update execution so fighter is frozen!
    }

    if (this.skillExposureTimer > 0) {
      this.skillExposureTimer--;
      if (this.skillExposureTimer <= 0) {
        this._triggerAdaptation(this.exposedSkillType || 'skill', this.exposedSkillAttacker);
        this.exposedSkillType = null;
        this.exposedSkillAttacker = null;
      }
    }

    // Calculate Dynamic Movement Speed based on Gold Adaptations
    const baseSpeed = this.baseSpeed || CONFIG.mahoraga?.speed || 3.5;
    const goldStages = (this.goldAdaptationStage?.melee || 0) + (this.goldAdaptationStage?.ranged || 0) + (this.goldAdaptationStage?.skill || 0);
    const speedBoost = CONFIG.mahoraga?.adaptationSpeedBoostPerStage || 0.10;
    this.speed = baseSpeed * (1.0 + (goldStages * speedBoost));

    // ── PROACTIVE GOJO ADAPTATION DODGE TRIGGERS ──
    const livePurpleOrb = (projectileSystem && projectileSystem.projectiles)
      ? projectileSystem.projectiles.find(p => p && p.isGojoPurple && (p.life || 0) > 0)
      : null;

    if (this.gojoAdapted && this.gojoAdapted.purple) {
      if (this.gojoPurpleDodgeReady && (this.adaptationDashTimer || 0) <= 0 && (this.adaptationPauseTimer || 0) <= 0) {
        if (livePurpleOrb) {
          const gojoFighter = state.fighters
            ? state.fighters.find(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.hp > 0)
            : null;
          if (gojoFighter) {
            this._gojoPurpleTeleportDodge(gojoFighter, livePurpleOrb);
          }
        }
      }
      if (!this.gojoPurpleDodgeReady && !livePurpleOrb) {
        this.gojoPurpleDodgeReady = true;
      }
    }

    // ── PROACTIVE SUKUNA FUGA ADAPTATION DODGE TRIGGERS ──
    const liveFugaOrb = (projectileSystem && projectileSystem.projectiles)
      ? projectileSystem.projectiles.find(p => p && p.isSukunaFurnace && (p.life || 0) > 0)
      : null;

    if (this.sukunaAdapted && this.sukunaAdapted.divineFlame) {
      if (this.sukunaFugaDodgeReady && (this.adaptationDashTimer || 0) <= 0 && (this.adaptationPauseTimer || 0) <= 0) {
        if (liveFugaOrb) {
          const sukunaFighter = state.fighters
            ? state.fighters.find(f => f && (f.characterId === 'sukuna' || f.type === 'sukuna') && f.hp > 0)
            : null;
          if (sukunaFighter) {
            this._sukunaFugaTeleportDodge(sukunaFighter, liveFugaOrb);
          }
        }
      }
      if (!this.sukunaFugaDodgeReady && !liveFugaOrb) {
        this.sukunaFugaDodgeReady = true;
      }
    }

    // ── PROACTIVE GENERAL SKILL SHOT DODGE TRIGGERS ──
    if (projectileSystem && projectileSystem.projectiles) {
      for (const p of projectileSystem.projectiles) {
        if (p && p.isAdaptableSkillShot && (p.life || 0) > 0) {
          const skillId = p.skillShotId;
          if (this.adaptedSkills && this.adaptedSkills[skillId] && this.skillDodgeReady && this.skillDodgeReady[skillId]) {
            if ((this.adaptationDashTimer || 0) <= 0 && (this.adaptationPauseTimer || 0) <= 0) {
              const attacker = state.fighters ? state.fighters[p.owner] : null;
              if (attacker) {
                this._generalSkillShotTeleportDodge(attacker, p);
              }
            }
          }
        }
      }
    }

    // ── PROACTIVE GENERAL SKILL SHOT DODGE TRIGGERS (OPPONENT CHARGING/FIRING STATE) ──
    if (opponent && opponent.isFiringSkillShot) {
      const skillId = opponent.isFiringSkillShot;
      if (this.adaptedSkills && this.adaptedSkills[skillId] && this.skillDodgeReady && this.skillDodgeReady[skillId]) {
        if ((this.adaptationDashTimer || 0) <= 0 && (this.adaptationPauseTimer || 0) <= 0) {
          // Construct a mock projectile representing the laser/windup to reuse the dodge function
          const registryEntry = SKILL_REGISTRY[skillId];
          const mockProj = {
            skillShotId: skillId,
            skillShotColor: registryEntry ? registryEntry.skillShotColor : (opponent.color || '#FFFFFF'),
            dodgeRadius: registryEntry ? registryEntry.dodgeRadius : (skillId === 'laser_beam' ? (CONFIG.laser?.beamLength || 140) : 140),
            x: opponent.x,
            y: opponent.y
          };
          this._generalSkillShotTeleportDodge(opponent, mockProj);
        }
      }
    }

    // ── CLEAN UP GENERAL SKILL DODGE READINESS ──
    if (this.adaptedSkills && this.skillDodgeReady) {
      for (const skillId in this.adaptedSkills) {
        const liveProj = projectileSystem?.projectiles?.some(p => p && p.isAdaptableSkillShot && p.skillShotId === skillId && p.life > 0);
        const opponentFiring = opponent && opponent.isFiringSkillShot === skillId;
        if (!liveProj && !opponentFiring && !this.skillDodgeReady[skillId]) {
          this.skillDodgeReady[skillId] = true;
        }
      }
    }

    if (this.gojoRedDodgeReady && (this.adaptationDashTimer || 0) <= 0 && (this.adaptationPauseTimer || 0) <= 0) {
      const gojoFighter = state.fighters
        ? state.fighters.find(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.hp > 0 && (f.redEffectTimer || 0) > 0)
        : null;
      if (gojoFighter) {
        this._gojoRedTeleportDodge(gojoFighter);
      }
    }

    // ── HIGH-SPEED DIVINE FLASH-DASH TICK ──
    if (this.adaptationDashTimer > 0) {
      this.adaptationDashTimer--;
      const maxDash = CONFIG.mahoraga?.adaptationDashSpeedFrames || 4;
      const progress = 1.0 - (this.adaptationDashTimer / maxDash);

      this.x = this.dashFromX + (this.dashToX - this.dashFromX) * progress;
      this.y = this.dashFromY + (this.dashToY - this.dashFromY) * progress;

      if (this.adaptationDashTarget && !this.adaptationDashTarget.isDead) {
        this.aim(this.adaptationDashTarget);
      }

      if (!this.adaptationAfterimages) this.adaptationAfterimages = [];
      this.adaptationAfterimages.push({
        x: this.x,
        y: this.y,
        gunAngle: this.gunAngle,
        timer: 12,
        maxTimer: 12
      });

      if (this.adaptationDashTimer === 0 && this.adaptationDashTarget && !this.adaptationDashTarget.isDead) {
        const target = this.adaptationDashTarget;
        this.adaptationDashTarget = null;

        this.x = this.dashToX;
        this.y = this.dashToY;
        this.aim(target);
        this.vx = 0;
        this.vy = 0;

        const activeArena = arena || (typeof state !== 'undefined' && state.arena ? state.arena : CONFIG.arena);
        if (activeArena) {
          this.x = Math.max(activeArena.x + this.r + 2, Math.min(activeArena.x + activeArena.width - this.r - 2, this.x));
          this.y = Math.max(activeArena.y + this.r + 2, Math.min(activeArena.y + activeArena.height - this.r - 2, this.y));
          
          if (this.adaptationDashIsCounter && target) {
            target.x = Math.max(activeArena.x + target.r + 2, Math.min(activeArena.x + activeArena.width - target.r - 2, target.x));
            target.y = Math.max(activeArena.y + target.r + 2, Math.min(activeArena.y + activeArena.height - target.r - 2, target.y));
          }
        }

        if (target && !target.isDead) {
          this.aim(target);
        }

        if (this.adaptationDashIsCounter && target && !target.isDead) {
          const damage = CONFIG.mahoraga?.swordDamage || 25;
          target.takeDamage(damage, this, { isMelee: true, isSkill: true });

          target.timeStopTimer = 0;
          target.mahoragaAdaptationFreezeTimer = 0;
          target.hitStunTimer = 0;
          target.knockbackStunTimer = 0;

          spawnImpactFlash(target.x, target.y, 45, '#FFFFFF');
          spawnSparks(target.x, target.y, 25, 'silver', '#FFFFFF');
          spawnMeleeClashShockwave(target.x, target.y, 110, 'silver');
          triggerGlobalScreenShake(10, 18);
          this._playRandomHeavyPunchSound(1.0);
          audioSystem.playSFX('attack_explosion', 0.8);
          audioSystem.playSFX('attack_swordswing', 1.0);

          this._executeShout(target, ownerIndex);

        const kbAngle = Math.atan2(target.y - this.y, target.x - this.x);
        const kbForce = 42.0;
        const kbVx = Math.cos(kbAngle) * kbForce;
        const kbVy = Math.sin(kbAngle) * kbForce;

        target.vx = kbVx;
        target.vy = kbVy;
        if (typeof target.applyKnockback === 'function') {
          target.applyKnockback(kbVx, kbVy);
        }

        target.x += target.vx;
        target.y += target.vy;

        this.punchAnimTimer = 22;

          if (this.throwCooldown <= 0) {
            this.isThrowing = true;
            this.throwBarrageShotsLeft = CONFIG.mahoraga?.throwBarrageCount || 10;
            this.throwBarrageTimer = CONFIG.mahoraga?.throwBarrageInterval || 5;
            spawnFloatingText(this.x, this.y - this.r - 25, 'ADAPTATION BARRAGE!', '#E0E8FF');
          } else {
            this.isBlitzActive = true;
            this.blitzWindupTimer = CONFIG.mahoraga?.blitzWindupFrames || 10;
            this.blitzHitsLeft = CONFIG.mahoraga?.blitzHitsCount || 6;
            this.blitzTimer = 0;
            this.blitzStayTimer = 999;
            this.blitzTotalDuration = CONFIG.mahoraga?.blitzTotalDurationFrames || 90;
            this.blitzTarget = target;
            spawnFloatingText(this.x, this.y - this.r - 25, 'HAND-TO-HAND BLITZ!', '#FFD700');
          }
        }

        if (this.teleportCounterPending) {
          this.teleportCounterPending = false;
          if (target && !target.isDead) {
            this.attackCount = (this.attackCount || 0) + 1;
            if (this.attackCount % 2 === 0) {
              this.leftPunchTimer = 18;
              this.leftPunchMaxTimer = 18;
              this._playRandomHeavyPunchSound(1.0);
            } else {
              this.swordCombo = (this.swordCombo || 0) + 1;
              this.punchAnimTimer = 18;
              this.punchAnimMaxTimer = 18;
              audioSystem.playSFX('attack_swordswing', 1.0);
            }

            const counterTargets = this._getFrontRadiusTargets(100, Math.PI * 1.3);
            if (target && target.hp > 0 && !target.isDead && !counterTargets.includes(target)) {
              const dist = Math.hypot(this.x - target.x, this.y - target.y);
              if (dist <= 100 + this.r + target.r) {
                counterTargets.push(target);
              }
            }
            for (const t of counterTargets) {
              t.takeDamage(22, this, { isMelee: true, isSkill: true });
            }

            spawnImpactFlash(target.x, target.y, 45, '#FFD700');
            spawnSparks(target.x, target.y, 15, 'gold', '#FFFFFF');
            spawnMeleeClashShockwave(target.x, target.y, 100, 'mahoraga');
            triggerGlobalScreenShake(8, 15);
            spawnFloatingText(this.x, this.y - this.r - 25, '⚡ TELEPORT ADAPTATION!', '#FFD700');
            audioSystem.playSFX('skill_dash5', 1.0);
            audioSystem.playSFX('attack_swordswing', 1.0);
          }
        }
        
        this.adaptationDashIsCounter = false;
      }
      return;
    }

    // ── ADAPTATION PAUSE TICK ──
    if (this.adaptationPauseTimer > 0) {
      this.adaptationPauseTimer--;
      if (this.wheelClickTimer > 0) this.wheelClickTimer--;
      this.vx = 0;
      this.vy = 0;

      if (opponent && opponent !== this && opponent.hp > 0) {
        if (typeof opponent.applyTimeStop === 'function') opponent.applyTimeStop(2);
        if (typeof opponent.applyHitStun === 'function') opponent.applyHitStun(2);
        opponent.mahoragaAdaptationFreezeTimer = 2;
        opponent.vx = 0;
        opponent.vy = 0;
      }

      if (!this.isInfinityBlitz) {
        const p = 1.0 - (this.adaptationPauseTimer / (this.adaptationPauseMax || 40));
        const easeP = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        this.wheelRotation = (this.wheelStartRotation || 0) + easeP * (Math.PI / 4);
      } else {
        this.wheelRotation += (CONFIG.mahoraga?.infinityBlitzWheelSpinSpeed || 0.08);
      }

      if (this.adaptationPauseTimer === 0 && this._pendingCounterTarget) {
        if (!this.isInfinityBlitz) this.wheelRotation = this.wheelTargetRotation;
        this._startAdaptationFlashDash(this._pendingCounterTarget);
        this._pendingCounterTarget = null;
      }
      return;
    }

    if (this.shieldIconTimer > 0) {
      this.shieldIconTimer--;
      if (Math.random() < 0.40) {
        spawnSparks(this.x + (Math.random() - 0.5) * (this.r || 30), this.y + (Math.random() - 0.5) * (this.r || 30), 2, 'arcaneAscendLine');
      }
    }
    if (this.teleportCounterCooldown > 0) this.teleportCounterCooldown--;

    if (this.isThrowing) {
      this.bladeRetractProgress += (0.0 - this.bladeRetractProgress) * 0.15;
    } else {
      this.bladeRetractProgress += (1.0 - this.bladeRetractProgress) * 0.15;
    }

    if (this.neutralStanceTimer > 0) {
      this.neutralStanceTimer--;
      if (this.neutralStanceTimer === 0) {
        this.neutralStanceCooldownTimer = CONFIG.mahoraga?.neutralStanceCooldownFrames || 180;
      }
    } else if (this.neutralStanceCooldownTimer > 0) {
      this.neutralStanceCooldownTimer--;
    }
    if (this.rctHealCooldownTimer > 0) this.rctHealCooldownTimer--;
    if (this.channelingPunishTeleportTimer > 0) this.channelingPunishTeleportTimer--;
    if (this.swordCooldown > 0) this.swordCooldown--;
    if (this.cleaveCooldown > 0) this.cleaveCooldown--;
    if (this.shoutCooldown > 0) this.shoutCooldown--;
    if (this.throwCooldown > 0) this.throwCooldown--;
    if (this.fatalAdaptCooldown > 0) this.fatalAdaptCooldown--;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.leftPunchTimer > 0) this.leftPunchTimer--;
    if (this.infinityBlitzCooldownTimer > 0) this.infinityBlitzCooldownTimer--;
    if (this.defensePoseTimer > 0) this.defensePoseTimer--;

    if (this.accumTimer > 0) {
      this.accumTimer--;
      if (this.accumTimer <= 0) {
        this.totalAccumDamage = 0;
      }
    }

    // ── LEVEL 8 MAX ADAPTATION: SPEED-BLITZ DURATION & SMOOTH WHEEL DECELERATION ──
    const totalStages = (this.adaptationStage?.melee || 0) + (this.adaptationStage?.ranged || 0) + (this.adaptationStage?.skill || 0);
    if (totalStages >= 8 && !this.isInfinityBlitz && (this.infinityBlitzCooldownTimer || 0) <= 0) {
      this.isInfinityBlitz = true;
      this.infinityBlitzDurationTimer = CONFIG.mahoraga?.infinityBlitzDurationFrames || 600;
      this.isCleaving = false;
      this.isShouting = false;
      this.isThrowing = false;
      this.isBlitzActive = false;

      const wheelY = this.y - this.r - 28;
      spawnFloatingText(this.x, wheelY - 55, '⚡ LEVEL 8 MAX ADAPTATION: SPEED-BLITZ!', '#FFD700');
      triggerGlobalScreenShake(14, 30);
      audioSystem.playSFX('skill_dash5', 1.0);
      audioSystem.playSFX('attack_swordswing', 1.0);
    }

    if (this.isInfinityBlitz || totalStages >= 8) {
      if (Math.random() < 0.6) {
        spawnSparks(this.x + (Math.random() - 0.5) * this.r * 1.6, this.y + (Math.random() - 0.5) * this.r * 1.6, 2, 'arcane', '#9D4EDD');
      }
    }

    if (this.isInfinityBlitz) {
      if (this.infinityBlitzDurationTimer > 0) {
        this.infinityBlitzDurationTimer--;
        if (this.infinityBlitzDurationTimer === 0) {
          this.isInfinityBlitz = false;
          this.infinityBlitzCooldownTimer = CONFIG.mahoraga?.infinityBlitzCooldownFrames || 600;

          this.hitsTaken = { melee: 0, ranged: 0, skill: 0 };
          this.adaptationStage = { melee: 0, ranged: 0, skill: 0 };
          this.adapted = { melee: false, ranged: false, skill: false };
          this.wheelRotation = 0;
          this.wheelTargetRotation = 0;
          this.hasAnnouncedLevel2 = false;

          this.gojoAdapted = { purple: false, red: false, blue: false };
          this.gojoBlueDragImmune = false;
          this.gojoPurpleDodgeReady = false;
          this.gojoRedDodgeReady = false;
          this.gojoInfinityImmune = false;
          this.totalAccumDamage = 0;
          this.accumTimer = 0;
          this.infinityFreezeCount = 0;
          this.gojoAdaptColorHistory = [];
          this.wheelGlowColor = null;

          this.sukunaAdapted = { divineFlame: false };
          this.sukunaFugaDodgeReady = false;
          this._lastSukunaHitType = null;

          this.adaptedSkills = {};
          this.skillDodgeReady = {};
          this._lastSkillShotId = null;
          this._lastSkillShotColor = null;

          spawnFloatingText(this.x, this.y - this.r - 25, '🔄 LEVEL 8 EXPIRED: ADAPTATIONS RESET!', '#FFD700');
          triggerGlobalScreenShake(8, 16);
          audioSystem.playSFX('skill_machinebroken', 1.0);
        }
      }
    }

    // ── LEVEL 8 INFINITY BLITZ COMBAT LOOP ──
    if (this.isInfinityBlitz) {
      this.isCleaving = false;
      this.isShouting = false;
      this.isThrowing = false;
      this.isBlitzActive = false;

      this.infinityBlitzTimer = (this.infinityBlitzTimer || 0) + 1;
      const interval = CONFIG.mahoraga?.infinityBlitzInterval || 12;

      if (opponent && opponent.hp > 0 && !opponent.isDead) {
        // Track / chase opponent between speed-blitz strikes!
        const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
        const reach = this.r + opponent.r + 15;
        if (dist > reach) {
          const dx = opponent.x - this.x;
          const dy = opponent.y - this.y;
          const walkSpeed = (CONFIG.mahoraga?.speed || 4.2) * 1.5; // High-speed blitz chase
          this.vx = (dx / dist) * walkSpeed;
          this.vy = (dy / dist) * walkSpeed;
        } else {
          this.vx = 0;
          this.vy = 0;
        }

        if (this.infinityBlitzTimer >= interval) {
          this.infinityBlitzTimer = 0;

          const distToEnemy = Math.hypot(opponent.x - this.x, opponent.y - this.y);
          const maxMeleeRange = this.r + opponent.r + (CONFIG.mahoraga?.swordRange || 60);

          const reqAttacks = CONFIG.mahoraga?.infinityBlitzAttacksPerTeleport || 2;
          const enemyEscaped = distToEnemy > maxMeleeRange;

          const isSeqComplete = (this.infinityBlitzAttacksInSeq || 0) >= reqAttacks;
          if (enemyEscaped || isSeqComplete) {
            if (isSeqComplete) {
              this.infinityBlitzAttacksInSeq = 0;
            }

            const oldX = this.x;
            const oldY = this.y;

            const flankAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x) + (Math.random() - 0.5) * Math.PI * 1.4;
            const teleOffset = CONFIG.mahoraga?.infinityBlitzTeleportDistance ?? 18;
            const teleDist = this.r + opponent.r + teleOffset;

            let teleX = opponent.x + Math.cos(flankAngle) * teleDist;
            let teleY = opponent.y + Math.sin(flankAngle) * teleDist;

            const activeArena = arena || CONFIG.arena;
            if (activeArena) {
              teleX = Math.max(activeArena.x + this.r + 5, Math.min(activeArena.x + activeArena.width - this.r - 5, teleX));
              teleY = Math.max(activeArena.y + this.r + 5, Math.min(activeArena.y + activeArena.height - this.r - 5, teleY));
            }

            // Set up smooth flash-dash travel scaling with the speed-blitz multiplier
            this.dashFromX = oldX;
            this.dashFromY = oldY;
            this.dashToX = teleX;
            this.dashToY = teleY;
            
            const baseFrames = CONFIG.mahoraga?.adaptationDashSpeedFrames || 4;
            const blitzMult = CONFIG.mahoraga?.infinityBlitzTeleportSpeedMultiplier ?? 0.20;
            const dashFrames = Math.max(1, Math.round(baseFrames * blitzMult));
            
            this.adaptationDashTimer = dashFrames;
            this.adaptationDashTarget = opponent;
            this.adaptationDashIsCounter = false;
 
            this._spawnTeleportAfterimages(oldX, oldY, teleX, teleY, this.gunAngle);
            audioSystem.playSFX('skill_dash5', 1.0);
          }

          const currentDist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
          if (currentDist <= maxMeleeRange) {
            this.infinityBlitzAttacksInSeq = (this.infinityBlitzAttacksInSeq || 0) + 1;

            this.attackCount = (this.attackCount || 0) + 1;
            if (this.attackCount % 2 === 0) {
              this.leftPunchTimer = 16;
              this.leftPunchMaxTimer = 16;
              this._playRandomHeavyPunchSound(1.0);
            } else {
              this.swordCombo = (this.swordCombo || 0) + 1;
              this.punchAnimTimer = 16;
              this.punchAnimMaxTimer = 16;
              audioSystem.playSFX('attack_swordswing', 1.0);
            }

            this.aim(opponent);
            const damage = CONFIG.mahoraga?.infinityBlitzDamage ?? (CONFIG.mahoraga?.swordDamage || 25);
            opponent.takeDamage(damage, this, { isMelee: true });

            // Apply brief heavy slow to keep them trapped in the blitz flurry
            const slowDur = CONFIG.mahoraga?.infinityBlitzStrikeSlowDurationFrames || 15;
            const slowMult = CONFIG.mahoraga?.infinityBlitzStrikeSlowMultiplier || 0.40;
            if (typeof opponent.applySlow === 'function') {
              opponent.applySlow(slowDur, slowMult, { isMahoragaShout: true });
            } else {
              opponent.slowTimer = slowDur;
              opponent.slowMultiplier = slowMult;
            }

            const angle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
            // Spawn golden spiky crescent effect for both punches and blade slash attacks!
            spawnAnimePunchImpactFrame(opponent.x, opponent.y, 55, angle, 'gold');

            const isPunch = (this.attackCount % 2 === 0);
            if (!isPunch) {
              this.sakugaImpactTimer = 12;
              this.sakugaImpactMaxTimer = 12;
              this.sakugaImpactX = opponent.x;
              this.sakugaImpactY = opponent.y;
              this.sakugaImpactAngle = Math.random() * Math.PI * 2;
              this.sakugaImpactSeed = Math.random();
            }
            spawnSparks(opponent.x, opponent.y, 15, 'gold', '#FFFFFF');
            spawnMeleeClashShockwave(opponent.x, opponent.y, 90, 'mahoraga');
            triggerGlobalScreenShake(7, 12);
            audioSystem.playSFX('attack_swordswing', 1.0);
          }
        }
      }

      this.applyMovementPhysics();
      if (arena) this.resolveWallBounce(arena);
      return;
    }

    // ── Divine Shout Windup ──
    if (this.isShouting) {
      this.shoutWindupTimer++;
      if ((this.knockbackStunTimer || 0) <= 0) {
        this.vx = 0;
        this.vy = 0;
      }
      this.applyMovementPhysics(0);

      const maxWindup = CONFIG.mahoraga?.shoutWindupFrames || 15;
      if (this.shoutWindupTimer >= maxWindup) {
        this._executeShout(opponent, ownerIndex);
        this.isShouting = false;
        this.shoutWindupTimer = 0;
        this.shoutCooldown = CONFIG.mahoraga?.shoutCooldown || 480;
      }
      return;
    }

    // ── Conditional Rapid Barrage Throw ──
    if (this.isThrowing) {
      if ((this.knockbackStunTimer || 0) <= 0) {
        this.vx = 0;
        this.vy = 0;
      }
      this.applyMovementPhysics(0);

      if (opponent && !opponent.isDead) {
        const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        const turnSpeed = CONFIG.mahoraga?.throwAimRotationSpeed ?? 0.06;
        
        let diff = targetAngle - this.gunAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        this.gunAngle += diff * turnSpeed;
      }

      this.throwBarrageTimer++;
      const interval = CONFIG.mahoraga?.throwBarrageInterval || 5;

      if (this.throwBarrageTimer >= interval) {
        this.throwBarrageTimer = 0;
        this.shoot(ownerIndex);
        this.throwBarrageShotsLeft--;

        spawnImpactFlash(this.x, this.y, 25, 'silver');
        spawnSparks(this.x, this.y, 6, 'silver', '#FFFFFF');

        if (this.throwBarrageShotsLeft <= 0) {
          this.isThrowing = false;
          this.throwCooldown = CONFIG.mahoraga?.throwCooldown ?? 1000;

          this.isBlitzActive = true;
          this.blitzWindupTimer = CONFIG.mahoraga?.blitzWindupFrames || 14;
          this.blitzHitsLeft = CONFIG.mahoraga?.blitzHitsCount || 6;
          this.blitzTimer = 0;
          this.blitzStayTimer = 999;
          this.blitzTotalDuration = CONFIG.mahoraga?.blitzTotalDurationFrames || 90;
          this.blitzTarget = opponent;
          spawnFloatingText(this.x, this.y - this.r - 25, 'HAND-TO-HAND BLITZ!', '#FFD700');
        }
      }
      return;
    }

    // ── Lore-Accurate Adaptation: Counter-activate vs enemy blitz ──
    const isEnemyBlitzing = opponent && !opponent.isDead && (
      opponent.isBlitzActive || 
      opponent.isTeleportFlurry || 
      opponent.isTeleporting ||
      (opponent.flurryHitsLeft && opponent.flurryHitsLeft > 0) ||
      (opponent.blitzHitsLeft && opponent.blitzHitsLeft > 0)
    );

    if (isEnemyBlitzing && !this.isBlitzActive && (this.blitzCooldownTimer || 0) <= 0) {
      this.isBlitzActive = true;
      this.blitzWindupTimer = 2;
      this.blitzHitsLeft = CONFIG.mahoraga?.blitzHitsCount || 10;
      this.blitzTimer = 0;
      this.blitzStayTimer = 999;
      this.blitzTotalDuration = CONFIG.mahoraga?.blitzTotalDurationFrames || 150;
      this.blitzTarget = opponent;
      spawnFloatingText(this.x, this.y - this.r - 25, 'ADAPTED BLITZ DUEL!', '#FFD700');
      playSkillEffectSound('mahoraga', 'wheelclick');
      audioSystem.playSFX('skill_dash5', 1.0);
    }

    // ── HAND-TO-HAND BLITZ SEQUENCE ──
    if (this.isBlitzActive) {
      if ((this.knockbackStunTimer || 0) <= 0) {
        this.vx = 0;
        this.vy = 0;
      }
      this.applyMovementPhysics(0);

      const target = this.blitzTarget || opponent;
      if (!target || target.isDead) {
        this.isBlitzActive = false;
        this.blitzHitsLeft = 0;
        this.blitzCooldownTimer = 180;
        return;
      }

      const slowMult = CONFIG.mahoraga?.blitzTargetSlowMultiplier ?? 0.25;
      if (typeof target.applySlow === 'function') {
        target.applySlow(15, slowMult);
      }
      target.vx *= 0.4;
      target.vy *= 0.4;

      if (this.blitzWindupTimer > 0) {
        this.blitzWindupTimer--;
        this.aim(target);
        this.bladeRetractProgress += (1.0 - this.bladeRetractProgress) * 0.15;
        return;
      }

      this.blitzStayTimer++;
      this.blitzTotalDuration--;
      if (this.blitzTotalDuration <= 0 && this.blitzHitsLeft > 1) {
        this.blitzHitsLeft = 1;
      }

      this.blitzTimer++;
      const blitzInterval = CONFIG.mahoraga?.blitzHitInterval || 7;

      if (this.blitzTimer >= blitzInterval) {
        this.blitzTimer = 0;
        this.blitzHitsLeft--;

        const activeArena = arena || (typeof state !== 'undefined' && state.arena ? state.arena : CONFIG.arena);
        const totalHits = CONFIG.mahoraga?.blitzHitsCount || 6;
        const hitIndex = totalHits - this.blitzHitsLeft;

        const distToTarget = Math.hypot(this.x - target.x, this.y - target.y);
        const maxMeleeDist = CONFIG.mahoraga?.blitzTeleportDistanceThreshold || (this.r + target.r + (CONFIG.mahoraga?.swordRange || 80) + 40);
        const minStayFrames = CONFIG.mahoraga?.blitzMinStayFrames || 20;

        const isTargetBlitzing = target && (
          target.isBlitzActive ||
          target.isTeleportFlurry ||
          target.isTeleporting ||
          (target.flurryHitsLeft && target.flurryHitsLeft > 0) ||
          (target.blitzHitsLeft && target.blitzHitsLeft > 0)
        );

        if ((distToTarget > maxMeleeDist && this.blitzStayTimer >= minStayFrames) || (isTargetBlitzing && distToTarget > 55)) {
          this.blitzStayTimer = 0;
          const angles = [0, Math.PI, -Math.PI * 0.5, Math.PI * 0.5];
          const baseAngle = angles[(hitIndex - 1) % angles.length] + (Math.random() - 0.5) * 0.4;
          const offsetDist = target.r + this.r + 14;

          let teleX = target.x + Math.cos(baseAngle) * offsetDist;
          let teleY = target.y + Math.sin(baseAngle) * offsetDist;

          if (activeArena) {
            const minX = activeArena.x + this.r + 5;
            const maxX = activeArena.x + activeArena.width - this.r - 5;
            const minY = activeArena.y + this.r + 5;
            const maxY = activeArena.y + activeArena.height - this.r - 5;

            teleX = Math.max(minX, Math.min(maxX, teleX));
            teleY = Math.max(minY, Math.min(maxY, teleY));
          }

          const oldX = this.x;
          const oldY = this.y;

           // Set up smooth flash-dash travel using the adaptationDashSpeedFrames config
           this.dashFromX = oldX;
           this.dashFromY = oldY;
           this.dashToX = teleX;
           this.dashToY = teleY;
           const dashFrames = CONFIG.mahoraga?.adaptationDashSpeedFrames || 4;
           this.adaptationDashTimer = dashFrames;
           this.adaptationDashTarget = target;
           this.adaptationDashIsCounter = false;

           this._spawnTeleportAfterimages(oldX, oldY, teleX, teleY);
           audioSystem.playSFX('skill_dash5', 1.0);
         } else {
           this.aim(target);
         }

        // 2. Perform Hand-to-Hand Martial Arts Strike / Sword Finisher
        if (hitIndex < totalHits) {
          const blitzDamage = CONFIG.mahoraga?.blitzHitDamage || 16;
          target.takeDamage(blitzDamage, this, { isMelee: true, isSkill: true });
          target.applyHitStun(10);

          const animDur = CONFIG.mahoraga?.blitzAttackAnimDuration || 7;
          if (hitIndex % 2 === 1) {
            this.leftPunchTimer = animDur;
            this.leftPunchMaxTimer = animDur;
          } else {
            this.punchAnimTimer = animDur;
            this.punchAnimMaxTimer = animDur;
            this.swordCombo = (this.swordCombo || 0) + 1;
          }

          const pushAngle = this.gunAngle !== undefined ? this.gunAngle : Math.atan2(target.y - this.y, target.x - this.x);
          // Spawn golden spiky crescent effect for both punches and blade slash attacks!
          spawnAnimePunchImpactFrame(target.x, target.y, 55, pushAngle, 'gold');

          const isPunch = (hitIndex % 2 === 1);
          if (!isPunch) {
            this.sakugaImpactTimer = 10;
            this.sakugaImpactMaxTimer = 10;
            this.sakugaImpactX = target.x;
            this.sakugaImpactY = target.y;
            this.sakugaImpactAngle = Math.random() * Math.PI * 2;
            this.sakugaImpactSeed = Math.random();
          }
          spawnMeleeClashShockwave(target.x, target.y, 65, 'mahoraga');
          spawnSparks(target.x, target.y, 18, 'gold', '#FFFFFF');
          triggerGlobalScreenShake(6, 12);

          const animeWords = ['ORA!', 'SLAM!', 'SLASH!', 'WHAM!', 'POW!'];
          const word = animeWords[(hitIndex - 1) % animeWords.length];
          spawnFloatingText(target.x + (Math.random() - 0.5) * 20, target.y - target.r - 20, word, '#FFD700');

          this._playRandomHeavyPunchSound(0.9);
          audioSystem.playSFX('attack_swordswing', 0.8);

          const pushForce = CONFIG.mahoraga?.blitzHitPushbackForce ?? 4.5;
          target.vx = Math.cos(pushAngle) * pushForce;
          target.vy = Math.sin(pushAngle) * pushForce;
          target.x += target.vx;
          target.y += target.vy;

        } else {
          // Final Hit: GRAND FINISHER CLEAVE!
          this.bladeRetractProgress = 1.0;
          const finisherDamage = CONFIG.mahoraga?.blitzFinisherDamage || 35;
          target.takeDamage(finisherDamage, this, { isMelee: true, isSkill: true });

          this.punchAnimTimer = 18;
          this.punchAnimMaxTimer = 18;
          this.swordCombo = (this.swordCombo || 0) + 1;

          this.sakugaImpactTimer = 18;
          this.sakugaImpactMaxTimer = 18;
          this.sakugaImpactX = target.x;
          this.sakugaImpactY = target.y;
          this.sakugaImpactAngle = Math.random() * Math.PI * 2;
          this.sakugaImpactSeed = Math.random();
          spawnImpactFlash(target.x, target.y, 90, '#FFD700');
          spawnMeleeClashShockwave(target.x, target.y, 180, 'mahoraga');
          spawnSparks(target.x, target.y, 40, 'gold', '#FFFFFF');
          triggerGlobalScreenShake(14, 25);
          spawnFloatingText(target.x, target.y - target.r - 35, 'FINISHER CLEAVE!!', '#FF3300');
          audioSystem.playSFX('attack_groundsmash', 1.0);
          audioSystem.playSFX('attack_explosion', 0.9);

          target.timeStopTimer = 0;
          target.mahoragaAdaptationFreezeTimer = 0;
          target.hitStunTimer = 0;

          const kbAngle = this.gunAngle;
          const kbForce = CONFIG.mahoraga?.blitzFinisherKnockback || 35.0;
          target.vx = Math.cos(kbAngle) * kbForce;
          target.vy = Math.sin(kbAngle) * kbForce;
          if (typeof target.applyKnockback === 'function') target.applyKnockback(target.vx, target.vy);
          target.x += target.vx;
          target.y += target.vy;

          spawnImpactFlash(target.x, target.y, 50, '#FFD700');
          spawnSparks(target.x, target.y, 30, 'gold', '#FFFFFF');
          spawnMeleeClashShockwave(target.x, target.y, 120, 'gold');
          triggerGlobalScreenShake(12, 22);
          audioSystem.playSFX('attack_explosion', 1.0);
          audioSystem.playSFX('attack_swordswing', 1.0);
          spawnFloatingText(target.x, target.y - 30, 'FINISHER CLEAVE!', '#FFD700');

          this.isBlitzActive = false;
          this.blitzHitsLeft = 0;

          this.aim(opponent);
          const damage = CONFIG.mahoraga?.infinityBlitzDamage ?? (CONFIG.mahoraga?.swordDamage || 25);
          const maxDist = (this.r + target.r + (CONFIG.mahoraga?.swordRange || 80) + 40) + 50;
          const blitzTargets = this._getFrontRadiusTargets(maxDist, Math.PI * 1.3);
          if (opponent && opponent.hp > 0 && !opponent.isDead && !blitzTargets.includes(opponent)) {
            const dist = Math.hypot(this.x - opponent.x, this.y - opponent.y);
            if (dist <= maxDist) {
              blitzTargets.push(opponent);
            }
          }
          for (const t of blitzTargets) {
            t.takeDamage(damage, this, { isMelee: true });
          }

          this.sakugaImpactTimer = 12;
          this.sakugaImpactMaxTimer = 12;
          this.sakugaImpactX = opponent.x;
          this.sakugaImpactY = opponent.y;
          this.sakugaImpactAngle = Math.random() * Math.PI * 2;
          this.sakugaImpactSeed = Math.random();

          spawnImpactFlash(opponent.x, opponent.y, 45, '#FFD700');
          spawnSparks(opponent.x, opponent.y, 15, 'gold', '#FFFFFF');
          spawnMeleeClashShockwave(opponent.x, opponent.y, 90, 'mahoraga');
          triggerGlobalScreenShake(7, 12);
          audioSystem.playSFX('attack_swordswing', 1.0);
        }
      }
      return;
    }

    // ── Active Cleave Skill ──
    if (this.isCleaving) {
      this.cleaveWindupTimer++;
      if ((this.knockbackStunTimer || 0) <= 0) {
        this.vx = 0;
        this.vy = 0;
      }
      this.applyMovementPhysics(0);

      const maxWindup = CONFIG.mahoraga?.cleaveWindupFrames || 30;
      if (this.cleaveWindupTimer >= maxWindup) {
        this._executeCleave(opponent);
        this.isCleaving = false;
        this.cleaveWindupTimer = 0;
        this.cleaveCooldown = CONFIG.mahoraga?.cleaveCooldown || 600;
      }
      return; 
    }

    // ── Natural Bounce Movement (no direct-chase steering) ──
    // Mahoraga uses natural wall-bounce physics like other fighters.
    // His resolveWallBounce override biases bounce direction towards the enemy.
    // Only apply friction if opponent is dead so he doesn't stop moving.
    if (!opponent || opponent.isDead) {
      this.vx *= 0.9;
      this.vy *= 0.9;
    }

    this.applyMovementPhysics();
    if ((this.punchAnimTimer > 0 || this.leftPunchTimer > 0) && (this.knockbackStunTimer || 0) <= 0) {
      this.vx = 0;
      this.vy = 0;
    }

    if (opponent && !opponent.isDead) {
      this.aim(opponent);
      const distToOpponent = Math.hypot(this.x - opponent.x, this.y - opponent.y);
      const swordRange = CONFIG.mahoraga?.swordRange || 60;
      const meleeDist = this.r + opponent.r + swordRange;



      const isEnemyChanneling = (
        opponent.isChanneling ||
        opponent.isWindingUp ||
        (opponent.domainChargeTimer && opponent.domainChargeTimer > 0) ||
        (opponent.purpleChargeTimer && opponent.purpleChargeTimer > 0) ||
        (opponent.divineFlameChargeTimer && opponent.divineFlameChargeTimer > 0) ||
        (opponent.ultimateChargeTimer && opponent.ultimateChargeTimer > 0) ||
        opponent.isCharging ||
        opponent.isChargingSkill ||
        opponent.isChannelingDomainExpansion ||
        opponent.isChannelingDivineFlame
      );

      // ── WHEEL STAGE 2+: HIGH-SPEED ADAPTATION TO ENEMY TELEPORT-ATTACK BLITZ ──
      const totalStages2 = (this.adaptationStage.melee || 0) + (this.adaptationStage.ranged || 0) + (this.adaptationStage.skill || 0);
      const currentStage = Math.max(...Object.values(this.adaptationStage || { default: 0 }));
      const hasAdaptedToTeleport = (totalStages2 >= 2 || currentStage >= 2 || this.isMaxAdapted);

      const isEnemyTeleportBlitzing = (
        opponent.isBlitzActive ||
        (opponent.rapidSlashHitsLeft && opponent.rapidSlashHitsLeft > 0) ||
        (opponent.flurryHitsLeft && opponent.flurryHitsLeft > 0) ||
        opponent.isTeleporting ||
        (opponent.teleportCooldown && opponent.teleportCooldown > 80) ||
        (opponent.tojiAmbushStage && opponent.tojiAmbushStage > 0) ||
        (opponent.lastTeleportTime && (performance.now() - opponent.lastTeleportTime < 300)) ||
        (opponent.punchAnimTimer > 0 && Math.hypot(opponent.vx, opponent.vy) > 12)
      );

      if (hasAdaptedToTeleport && isEnemyTeleportBlitzing && (this.teleportCounterCooldown || 0) <= 0 && !opponent.isAmbushing) {
        this.teleportCounterCooldown = 10;

        const oldX = this.x;
        const oldY = this.y;

        const approachAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        const backAngle = approachAngle + Math.PI + (Math.random() - 0.5) * 0.8;
        const teleDist = this.r + opponent.r + 20;
        let teleX = opponent.x + Math.cos(backAngle) * teleDist;
        let teleY = opponent.y + Math.sin(backAngle) * teleDist;

        const activeArena = arena || CONFIG.arena;
        if (activeArena) {
          teleX = Math.max(activeArena.x + this.r + 5, Math.min(activeArena.x + activeArena.width - this.r - 5, teleX));
          teleY = Math.max(activeArena.y + this.r + 5, Math.min(activeArena.y + activeArena.height - this.r - 5, teleY));
        }

        // Set up smooth flash-dash travel using the adaptationDashSpeedFrames config
        this.dashFromX = oldX;
        this.dashFromY = oldY;
        this.dashToX = teleX;
        this.dashToY = teleY;
        const dashFrames = CONFIG.mahoraga?.adaptationDashSpeedFrames || 4;
        this.adaptationDashTimer = dashFrames;
        this.adaptationDashTarget = opponent;
        this.adaptationDashIsCounter = false;
        this.teleportCounterPending = true;

        this._spawnTeleportAfterimages(oldX, oldY, teleX, teleY, this.gunAngle);
      }

      // Standard Sword of Extermination chops & Left off-hand punches
      const frontTargetsForAttack = this._getFrontRadiusTargets(CONFIG.mahoraga?.swordRange || 110, Math.PI * 1.3);
      const isAnyTargetInRange = distToOpponent <= meleeDist || frontTargetsForAttack.length > 0;

      if (this.swordCooldown <= 0 && isAnyTargetInRange) {
        this._performMeleeAttack(opponent);
      }
    }
    this._bounceTarget = opponent; // Store for resolveWallBounce override
    if (arena) this.resolveWallBounce(arena);
  }

  triggerDemoAttack() {
    this.attackCount = (this.attackCount || 0) + 1;
    if (this.attackCount % 2 === 0) {
      this.leftPunchTimer = 20;
      this.leftPunchMaxTimer = 20;
    } else {
      this.swordCombo = (this.swordCombo || 0) + 1;
      this.punchAnimTimer = 20;
    }
    this.isCleaving = true;
    this.cleaveWindupTimer = 0;
    this.wheelClickTimer = 20;
    this.wheelGlowTimer = 60;
    this.wheelTargetRotation = (this.wheelTargetRotation || 0) + (Math.PI / 4);

    setTimeout(() => {
      this.isCleaving = false;
    }, 35);
  }

  /**
   * Override wall bounce so Mahoraga bounces naturally but biases
   * his post-bounce direction towards the current enemy.
   * This gives the "rebounce forward to the enemy" feel.
   */
  resolveWallBounce(arena) {
    let bounced = false;
    const restitution = CONFIG.collision.restitution;
    const angleJitter = 3.5;

    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      this.vx = Math.abs(this.vx) * restitution;
      this.vy += (Math.random() - 0.5) * angleJitter;
      bounced = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      this.vx = -Math.abs(this.vx) * restitution;
      this.vy += (Math.random() - 0.5) * angleJitter;
      bounced = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      this.vy = Math.abs(this.vy) * restitution;
      this.vx += (Math.random() - 0.5) * angleJitter;
      bounced = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      this.vy = -Math.abs(this.vy) * restitution;
      this.vx += (Math.random() - 0.5) * angleJitter;
      bounced = true;
    }

    if (bounced) {
      const target = this._bounceTarget;
      const speed = Math.hypot(this.vx, this.vy) || this.speed;

      if (target && !target.isDead && target.hp > 0) {
        // Bias the bounce direction towards the enemy
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        const toEnemyVx = (dx / dist) * speed;
        const toEnemyVy = (dy / dist) * speed;

        // Blend: 60% towards enemy, 40% natural bounce
        const biasFactor = 0.6;
        this.vx = this.vx * (1 - biasFactor) + toEnemyVx * biasFactor;
        this.vy = this.vy * (1 - biasFactor) + toEnemyVy * biasFactor;
      }

      // Re-normalize to configured speed
      this.normalizeSpeed();
    }
  }



  drawGun(ctx) {
    if (this.isTargetOfAmbush) return;
    drawMahoragaSword(ctx, this);
  }

  // Store reference to super.draw for the visuals module to call
  _superDraw(ctx, opponent) {
    super.draw(ctx, opponent);
  }

  draw(ctx, opponent) {
    drawMahoragaFighter(ctx, this, opponent);
  }
}
