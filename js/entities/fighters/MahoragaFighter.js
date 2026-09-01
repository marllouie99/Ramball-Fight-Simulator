import { Fighter, isSuppressedByGetsuga } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../graphics/particles/sparkEffect.js';
import { state, triggerGlobalScreenShake, spawnFloatingText } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { playSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawMahoragaSword } from '../../graphics/weapons/mahoragaWeaponGraphics.js';
import { drawMahoragaSkin } from '../../graphics/fighters/mahoragaSkin.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';

// ── Refactored Mahoraga Modules ──
import { handleAdaptationDamage, triggerAdaptation, handleInfinityFreeze, adaptToPureLoveBeam, adaptToYutaFlurry, adaptToThinIceBreaker, adaptToSoulDisfigurement, adaptToSaitamaCounter } from './mahoraga/mahoragaAdaptation.js';
import { gojoPurpleTeleportDodge, gojoRedTeleportDodge, startAdaptationFlashDash, spawnTeleportAfterimages, sukunaFugaTeleportDodge, generalSkillShotTeleportDodge } from './mahoraga/mahoragaSkills.js';
import { performMeleeAttack, executeCleave, shootBladeBarrage, executeShout, getFrontRadiusTargets, playRandomHeavyPunchSound, initiateLevel8WallSlam, updateLevel8WallSlam } from './mahoraga/mahoragaCombat.js';
import { drawMahoragaFighter } from './mahoraga/mahoragaVisuals.js';
import { SKILL_REGISTRY } from '../../configs/skills/skillRegistry.js';

export class MahoragaFighter extends Fighter {
  constructor(def) {
    super(def);

    this.themeColor = (def && def.themeColor) || (def && def.color) || (CONFIG.mahoraga?.themeColor) || '#FFD700';
    this.skinColor = (def && def.skinColor) || (CONFIG.mahoraga?.skinColor) || '#F5F5DC';
    this.baseSpeed = (def && def.moveSpeed !== undefined) ? def.moveSpeed : (CONFIG.mahoraga?.moveSpeed ?? 6.5);
    this.speed = this.baseSpeed;
    
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

    this.shoutCooldown = CONFIG.mahoraga?.shoutCooldown || 1000;
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
    this.swordTrail = [];
    this.wallBounceCount = 0;
  }

  get goldStages() {
    return (this.goldAdaptationStage?.melee || 0) + (this.goldAdaptationStage?.ranged || 0) + (this.goldAdaptationStage?.skill || 0);
  }

  get totalAdaptationStages() {
    return (this.adaptationStage?.melee || 0) + (this.adaptationStage?.ranged || 0) + (this.adaptationStage?.skill || 0);
  }

  takeDamage(amount, attacker, opts = {}) {
    const result = super.takeDamage(amount, attacker, opts);
    // Cancel Level 8 Wall Slam sequence (impale, throw, dash, strike flurry) if hit by Gojo's Red or caught in Gojo's Purple
    const shouldCancel = (opts.isRed || opts.isPurpleDPS) && this.isWallSlamActive;
    if (shouldCancel) {
      this.isWallSlamActive = false;
      this.wallSlamPhase = null;
      this.wallSlamTimer = 0;

      // Release any grabbed targets
      const opponent = state.fighters?.find(f => f && f !== this && f.hp > 0);
      if (opponent) {
        opponent.isGrabbedByMahoraga = false;
        opponent.z = 0;
      }

      if (typeof spawnFloatingText === 'function') {
        const cancelReason = opts.isRed ? 'SLAM CANCELED!' : 'PURPLE INTERRUPT!';
        spawnFloatingText(this.x, this.y - this.r - 28, cancelReason, '#FF3D00');
      }
    }
    return result;
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
    this.pendingGetsugaAdaptation = false;
    this.pendingGetsugaAttacker = null;
    this.pendingGetsugaProj = null;
    this.getsugaExposureCount = 0;
    this._lastGetsugaExposureProjId = null;
    this.adaptedGetsuga = false;
    
    // Defense Pose Reset
    this.defensePoseType = null;
    this.defensePoseTimer = 0;
    this.defensePoseMaxTimer = 0;
    
    this.wheelRotation = 0;
    this.wheelTargetRotation = 0;
    this.wheelGlowTimer = 0;
    this.wheelClickTimer = 0;
    this.gammaRayRainbowTimer = 0;
    this.gammaRayRainbowMax = 180;
    this.shieldIconTimer = 0;
    this.shieldIconReduction = 12;

    this.swordCooldown = 0;
    this.cleaveCooldown = CONFIG.mahoraga?.cleaveCooldown || 600;
    this.isCleaving = false;
    this.cleaveWindupTimer = 0;
    this.adaptationPauseTimer = 0;
    this._pendingCounterTarget = null;

    this.shoutCooldown = CONFIG.mahoraga?.shoutCooldown || 1000;
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
    this.wallBounceCount = 0;
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
    this.punchAnimTimer = 0;
    this.leftPunchTimer = 0;
    this.currentPunchProgress = 0;
    this.sakugaImpactTimer = 0;
    if (this.adaptationAfterimages) this.adaptationAfterimages.length = 0;
  }

  /**
   * Mahoraga can aim whenever not in hard CC or Pure Love Beam recovery.
   */
  canAim() {
    if (!super.canAim()) return false;
    if (this.caughtInPureLoveBeam || (this.pureLoveBeamTimer || 0) > 0 || (this.pureLoveBeamRecoveryTimer || 0) > 0) {
      return false;
    }
    return true;
  }

  takeDamage(amount, attacker, opts = {}) {
    const isHeal = opts.isHeal || amount < 0;
    if (isHeal) {
      if (this.hp <= 0) return false;
      return super.takeDamage(amount, attacker, opts);
    }

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

    if (opts.isAdaptableSkillShot && opts.skillShotId !== 'tojiAmbush' && opts.skillShotId !== 'purple' && !opts.isPurpleDPS && !opts.isPurple && opts.skillShotId !== 'getsugaTensho' && opts.skillShotId !== 'getsuga' && !opts.isGetsuga && this.adaptedSkills && this.adaptedSkills[opts.skillShotId] && this.skillDodgeReady && this.skillDodgeReady[opts.skillShotId]) {
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

    const isBeamDamage = (
      (!this.adaptedPureLoveBeam && (opts.isPureLoveBeam || this.caughtInPureLoveBeam || (this.pureLoveBeamTimer || 0) > 0 || (this.pureLoveBeamRecoveryTimer || 0) > 0)) ||
      (opts.isPurple || opts.isPurpleDPS || this.isCaughtInPurple || (this.purpleHitTimer || 0) > 0) ||
      (!this.adaptedGenosBeam && (opts.isGenosBeam || (this.caughtInGenosBeamTimer || 0) > 0 || this.caughtInGenosFlurry))
    );

    if (isBeamDamage) {
      this.neutralStanceTimer = 0;
      this.neutralStanceCooldownTimer = 300; // 5s stance lockout delay
      this.adaptationDashTimer = 0;
      this.adaptationPauseTimer = 0;
      this.isInfinityBlitz = false;
      this.isBlitzActive = false;
      this.isWallSlamActive = false;
      this.wallSlamPhase = null;
      this.wallSlamTimer = 0;
      this.blitzHitsLeft = 0;
      this.interruptAttacks();
    }

    if (opts.isPureLoveBeam && !this.adaptedPureLoveBeam) {
      this.caughtInPureLoveBeam = true;
      this.pureLoveBeamTimer = 10;
      this.defensePoseType = null;
      this.defensePoseTimer = 0;
    }

    if (opts.isYutaFlurry && !this.adaptedYutaFlurry) {
      this._yutaFlurryHitCount = (this._yutaFlurryHitCount || 0) + 1;
      if (this._yutaFlurryHitCount >= 3) {
        adaptToYutaFlurry(this);
      }
    }

    if (opts.isThinIceBreaker && !this.adaptedThinIceBreaker) {
      adaptToThinIceBreaker(this);
    }

    if ((opts.isSaitamaCounter || (opts.isCounter && attacker && (attacker.characterId === 'saitama' || attacker.type === 'saitama'))) && !this.adaptedSaitamaCounter) {
      // Wheel clicks immediately after the punch lands (tiny beat for impact to register)
      const adaptDelay = CONFIG.mahoraga?.saitamaCounterAdaptDelay ?? 8; // ~0.13s — near-instant
      this.saitamaCounterDebuffTimer = adaptDelay;
      this.saitamaCounterAttacker = attacker;
    }

    const { finalAmount, type } = handleAdaptationDamage(this, amount, attacker, opts);
    const result = super.takeDamage(finalAmount, attacker, opts);
    return result;
  }

  // Delegating to module functions via thin wrappers
  adaptToPureLoveBeam() { adaptToPureLoveBeam(this); }
  adaptToYutaFlurry() { adaptToYutaFlurry(this); }
  adaptToThinIceBreaker() { adaptToThinIceBreaker(this); }
  adaptToSoulDisfigurement() { adaptToSoulDisfigurement(this); }
  adaptToSaitamaCounter(attacker) { adaptToSaitamaCounter(this, attacker); }
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
  _playRandomHeavyPunchSound(volume = null) {
    const vol = volume !== null ? volume : (CONFIG.mahoraga?.soundVolumes?.punch !== undefined ? CONFIG.mahoraga.soundVolumes.punch : 1.0);
    playRandomHeavyPunchSound(vol);
  }
  _getFrontRadiusTargets(maxRangeOffset, coneAngle) { return getFrontRadiusTargets(this, maxRangeOffset, coneAngle); }
  initiateLevel8WallSlam(opponent) { initiateLevel8WallSlam(this, opponent); }
  updateLevel8WallSlam(opponent, ownerIndex, arena) { updateLevel8WallSlam(this, opponent, ownerIndex, arena); }

  applySlow(frames, multiplier, opts = {}) {
    if ((opts && opts.isGetsuga) || opts?.skillShotId === 'getsugaTensho' || opts?.isGetsugaSlow) {
      if (this.adaptedGetsuga || (this.adaptedSkills && (this.adaptedSkills['getsugaTensho'] || this.adaptedSkills['getsuga']))) {
        return; // Total immunity to Getsuga Tensho slow debuff!
      }
    }
    const totalStages = (this.adaptationStage?.melee || 0) + (this.adaptationStage?.ranged || 0) + (this.adaptationStage?.skill || 0);
    const ccTenacityMult = CONFIG.mahoraga?.ccTenacityPerClickPercent || 0.05;
    const maxCcTenacity = CONFIG.mahoraga?.maxCcTenacityPercent || 0.40;
    const ccTenacity = Math.min(maxCcTenacity, totalStages * ccTenacityMult);

    if (ccTenacity > 0) {
      frames = Math.max(1, Math.round(frames * (1.0 - ccTenacity)));
      multiplier = multiplier + (1.0 - multiplier) * ccTenacity;
    }
    super.applySlow(frames, multiplier);
  }

  applyParalyze(frames, opts = {}) {
    if ((opts && opts.isGetsuga) || opts?.skillShotId === 'getsugaTensho' || (this.adaptedGetsuga || (this.adaptedSkills && (this.adaptedSkills['getsugaTensho'] || this.adaptedSkills['getsuga'])))) {
      if (this.adaptedGetsuga || (this.adaptedSkills && (this.adaptedSkills['getsugaTensho'] || this.adaptedSkills['getsuga']))) {
        return; // Total immunity to Getsuga Tensho paralyze debuff!
      }
    }
    super.applyParalyze(frames);
  }

  applyKnockback(vx, vy) {
    if (this.isWallSlamActive || this.isWallSlamBlitz || this.isBlitzActive) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      return;
    }
    super.applyKnockback(vx, vy);
  }

  get adaptationAfterimages() {
    return this.afterImages;
  }

  set adaptationAfterimages(val) {
    this.afterImages = val;
  }

  get wheelClicks() {
    return this.adaptationStage || { melee: 0, ranged: 0, skill: 0 };
  }

  set wheelClicks(val) {
    this.adaptationStage = val;
  }

  interruptAttacks(forceCancelAll = false) {
    const isSuppressed = this.areAttackEffectsSuppressed();
    const totalStages = (this.adaptationStage?.melee || 0) + (this.adaptationStage?.ranged || 0) + (this.adaptationStage?.skill || 0);
    const ccTenacityMult = CONFIG.mahoraga?.ccTenacityPerClickPercent || 0.075;
    const maxCcTenacity = CONFIG.mahoraga?.maxCcTenacityPercent || 0.60;
    const ccTenacity = Math.min(maxCcTenacity, totalStages * ccTenacityMult);
    const opponent = this._bounceTarget || (typeof state !== 'undefined' && state.fighters
      ? state.fighters.find(f => f && f !== this && f.hp > 0)
      : null);
    const inMeleeRange = opponent && Math.hypot(opponent.x - this.x, opponent.y - this.y) < (this.r + opponent.r + (CONFIG.mahoraga?.swordRange || 110));
    const canAttackUnderCC = ccTenacity > 0 && inMeleeRange && Boolean(this.adapted?.melee) && ((this.adaptationStage?.melee || 0) >= 2);

    // Preserve afterimage trail during active wall slam or blitz only when not suppressed
    const preserveAfterimages = !forceCancelAll && !isSuppressed && (this.isWallSlamActive || this.isBlitzActive || this.isWallSlamBlitz);
    const savedAfterimages = preserveAfterimages && this.afterImages ? this.afterImages.slice() : null;

    if (canAttackUnderCC && !forceCancelAll && !isSuppressed) {
      const backupMeleeSwingActive = this.meleeSwingActive;
      const backupMeleeSwingTimer = this.meleeSwingTimer;
      const backupPunchAnimTimer = this.punchAnimTimer;
      const backupLeftPunchTimer = this.leftPunchTimer;

      super.interruptAttacks(forceCancelAll);

      this.meleeSwingActive = backupMeleeSwingActive;
      this.meleeSwingTimer = backupMeleeSwingTimer;
      this.punchAnimTimer = backupPunchAnimTimer;
      this.leftPunchTimer = backupLeftPunchTimer;
    } else {
      super.interruptAttacks(forceCancelAll);
    }

    // Restore afterimages that were preserved
    if (savedAfterimages && !isSuppressed && !forceCancelAll) {
      this.afterImages = savedAfterimages;
    } else if (isSuppressed || forceCancelAll) {
      this.clearAllAfterimages();
    }
  }

  _findClosestEnemy(preferredOpponent = null) {
    if (preferredOpponent && preferredOpponent !== this && preferredOpponent.hp > 0 && !preferredOpponent.isDead) {
      return preferredOpponent;
    }
    let closest = null;
    let minDist = Infinity;
    const myIndex = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(this) : -1;
    const myTeam = (typeof state !== 'undefined' && state.getFighterTeam) ? state.getFighterTeam(myIndex) : this.team;

    const allTargets = [];
    if (typeof state !== 'undefined') {
      if (state.fighters) allTargets.push(...state.fighters);
      if (state.illusions) allTargets.push(...state.illusions);
    }

    for (const ent of allTargets) {
      if (!ent || ent === this || ent.hp <= 0 || ent.isDead || ent.isInvulnerable) continue;
      if (ent.vanishTimer && ent.vanishTimer > 0) continue;
      if (ent.owner === this) continue;
      if (myTeam !== null && myTeam !== undefined) {
        const entIdx = state.fighters ? state.fighters.indexOf(ent) : -1;
        if (entIdx !== -1 && state.getFighterTeam(entIdx) === myTeam) continue;
        if (ent.team !== undefined && ent.team === myTeam) continue;
      }

      const dist = Math.hypot(ent.x - this.x, ent.y - this.y);
      if (dist < minDist) {
        minDist = dist;
        closest = ent;
      }
    }

    return closest;
  }

  /**
   * Resolves arena boundary collisions.
   * When Mahoraga collides with any arena wall, he triggers a divine flash-dash / teleport
   * directly towards the enemy with high-speed afterimages and forward momentum.
   */
  resolveWallBounce(arena, opponent = null) {
    if (!arena) return false;
    const isBeamTrapped = (this.caughtInGenosBeamTimer > 0) || this.caughtInPureLoveBeam || ((this.pureLoveBeamTimer || 0) > 0) || this.preventKnockbackBounce || this.isDraggedByGetsuga;
    if (isBeamTrapped) {
      this.wallBounceCount = 0;
      let clamped = false;
      if (this.x - this.r < arena.x) {
        this.x = arena.x + this.r;
        this.vx = 0;
        this.vy = 0;
        clamped = true;
      } else if (this.x + this.r > arena.x + arena.width) {
        this.x = arena.x + arena.width - this.r;
        this.vx = 0;
        this.vy = 0;
        clamped = true;
      }
      if (this.y - this.r < arena.y) {
        this.y = arena.y + this.r;
        this.vx = 0;
        this.vy = 0;
        clamped = true;
      } else if (this.y + this.r > arena.y + arena.height) {
        this.y = arena.y + arena.height - this.r;
        this.vx = 0;
        this.vy = 0;
        clamped = true;
      }
      return clamped;
    }

    let bounced = false;
    const restitution = CONFIG.collision?.restitution || 0.9;
    const angleJitter = 1.2;

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

    if (bounced && !this.isDraggedByGetsuga) {
      this.wallBounceCount = (this.wallBounceCount || 0) + 1;

      // On the 2nd consecutive wall collision, trigger forward dash surge directly toward enemy
      if (this.wallBounceCount >= 2) {
        this.wallBounceCount = 0;

        const target = this._findClosestEnemy(opponent || this._bounceTarget);
        const isTargetGojoInfinity = target && (target.characterId === 'gojo' || target.type === 'gojo') && !target.isMeleeMode && ((target.infinityCooldown || 0) <= 0 || target.infinityActive) && !this.gojoInfinityImmune;

        if (target && !target.isDead && target.hp > 0 && !isTargetGojoInfinity) {
          const dx = target.x - this.x;
          const dy = target.y - this.y;
          const dist = Math.hypot(dx, dy) || 1;
          const angleToTarget = Math.atan2(dy, dx);

          // Turn and face the enemy immediately
          this.aim(target);

          // Clear any residual knockback/stun so Mahoraga immediately surges into the dash
          this.knockbackVx = 0;
          this.knockbackVy = 0;
          this.knockbackStunTimer = 0;
          this.swordCooldown = 0;

          // Apply high-speed physical forward dash surge directly toward the target
          const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed || 6.5;
          const dashSpeed = Math.max(currentSpeed * 1.5, (this.speed || 6.5) * 1.8, 14.0);
          this.vx = (dx / dist) * dashSpeed;
          this.vy = (dy / dist) * dashSpeed;

          // Visual dash burst: impact sparks, flash at wall rebound point, and motion trail afterimages
          spawnImpactFlash(this.x, this.y, 30, '#FFD700');
          spawnSparks(this.x, this.y, 12, 'silver', '#FFFFFF');
          this._spawnTeleportAfterimages(this.x, this.y, this.x + this.vx * 3.5, this.y + this.vy * 3.5, angleToTarget);
          audioSystem.playSFX('skill_dash5', 0.9);

          // Rate-limited floating text indicator
          const now = performance.now();
          if (!this._lastWallBounceDashTime || (now - this._lastWallBounceDashTime > 1500)) {
            this._lastWallBounceDashTime = now;
            spawnFloatingText(this.x, this.y - this.r - 25, '⚡ WALL REBOUND DASH!', '#FFD700');
          }

          // Trigger Hand-to-Hand Blitz Sequence if available
          const isBeamTrapped = (this.caughtInGenosBeamTimer > 0) || this.caughtInPureLoveBeam || ((this.pureLoveBeamTimer || 0) > 0);
          const canTriggerBlitz = !this.isBlitzActive && !this.isInfinityBlitz && !this.isWallSlamActive && !this.isShouting && !this.isCleaving && !this.isThrowing && !isBeamTrapped && (this.blitzCooldownTimer || 0) <= 0;
          if (canTriggerBlitz) {
            this.isBlitzActive = true;
            this.blitzWindupTimer = 2;
            this.blitzHitsLeft = CONFIG.mahoraga?.blitzHitsCount ?? 10;
            this.blitzTimer = 0;
            this.blitzStayTimer = 999;
            this.blitzTotalDuration = CONFIG.mahoraga?.blitzTotalDurationFrames ?? 150;
            this.blitzTarget = target;
          }
        }
      }
    }

    return bounced;
  }

  shoot(ownerIndex) {
    if (!this.canPerformBasicAttack() || this.isDraggedByGetsuga) return false;
    const opponent = (typeof state !== 'undefined' && state.fighters ? state.fighters.find(f => f && f !== this && f.hp > 0) : null);
    if (opponent && !opponent.isDead) {
      this.aim(opponent);
    }
    if (this.isCaughtInBeam() && !this.adaptedPureLoveBeam && !this.adaptedGenosBeam) {
      const inMeleeRange = opponent && Math.hypot(opponent.x - this.x, opponent.y - this.y) < (this.r + opponent.r + (CONFIG.mahoraga?.swordRange || 110));
      if (!inMeleeRange) {
        this.interruptAttacks();
        return;
      }
    }
    const totalStages = (this.adaptationStage?.melee || 0) + (this.adaptationStage?.ranged || 0) + (this.adaptationStage?.skill || 0);
    const isLevel8 = totalStages >= 8 || this.isMaxAdapted || this.isInfinityBlitz || (this.goldStages >= 8);
    if (isLevel8 && !this.isWallSlamActive && (this.throwCooldown || 0) <= 0) {
      if (opponent) {
        this.initiateLevel8WallSlam(opponent);
        return;
      }
    }
    shootBladeBarrage(this, ownerIndex);
  }

  onCollide(opponent) {
    if (!opponent || opponent.isDead || opponent.hp <= 0) return;
    if (this.isTeammate(opponent)) return;
    if (!this.canPerformBasicAttack()) return;
    if (this.isWallSlamActive || this.isThrowing || this.isTargetOfAmbush || this.isBlitzActive || this.isInfinityBlitz || this.isDraggedByGetsuga) return;

    this.aim(opponent);
    if ((this.swordCooldown || 0) <= 0) {
      this._performMeleeAttack(opponent);
    }
  }

  update(opponent, ownerIndex, arena) {
    const totalStages = (this.adaptationStage?.melee || 0) + (this.adaptationStage?.ranged || 0) + (this.adaptationStage?.skill || 0);
    // --- POSITION SNAP GUARD: Clear sword trail on teleport ---
    if (this._prevX !== undefined && this._prevY !== undefined) {
      const moveDist = Math.hypot(this.x - this._prevX, this.y - this._prevY);
      if (moveDist > 45) {
        this.swordTrail = [];
      }
    }
    this._prevX = this.x;
    this._prevY = this.y;

    // --- UPDATE MAHORAGA SWORD TRAIL (DECAY ONLY) ---
    if (this.swordTrail && this.swordTrail.length > 0) {
      this.swordTrail.forEach(t => {
        t.life = Math.max(0, t.life - 0.08);
      });
      this.swordTrail = this.swordTrail.filter(t => t.life > 0);
    }

    if (this.dodgeIFrames > 0) this.dodgeIFrames--;

    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();
    if (this.swordCooldown > 0) this.swordCooldown--;

    // Wheel Rotation Tick (runs even if frozen by domains for lore accuracy!)
    if (this.wheelClickTimer > 0) {
      this.wheelClickTimer--;
      this.wheelRotation += (this.wheelTargetRotation - this.wheelRotation) * 0.25;
    } else if (this.wheelTargetRotation !== undefined) {
      this.wheelRotation = this.wheelTargetRotation;
    }
    if (this.wheelGlowTimer > 0) this.wheelGlowTimer--;
    if (this.gammaRayRainbowTimer > 0) this.gammaRayRainbowTimer--;

    if (this.pendingPurpleAdaptation) {
      const livePurpleOrb = (projectileSystem && projectileSystem.projectiles)
        ? projectileSystem.projectiles.find(p => p && (p.isGojoPurple || p.isGojoPurpleOrb || p.behaviorType === 'gojo_purple' || p.skillShotId === 'purple') && (p.life || 0) > 0)
        : null;

      if (!livePurpleOrb) {
        // Purple orb has expired / despawned — trigger wheel click adaptation now!
        this.pendingPurpleAdaptation = false;
        const purpleAttacker = this.pendingPurpleAttacker;
        const purpleType = this.pendingPurpleType || 'skill';
        this.pendingPurpleAttacker = null;
        this.pendingPurpleType = null;
        this._triggerAdaptation(purpleType, purpleAttacker);
      }
    }

    if (this.pendingRedAdaptation) {
      const isKnockbackActive = (this.knockbackVx && Math.abs(this.knockbackVx) > 1.5) || 
                                (this.knockbackVy && Math.abs(this.knockbackVy) > 1.5) || 
                                (Math.hypot(this.vx, this.vy) > 3.0);

      if (!isKnockbackActive) {
        // Red blast knockback slide finished — trigger wheel click adaptation now!
        this.pendingRedAdaptation = false;
        const redAttacker = this.pendingRedAttacker;
        const redType = this.pendingRedType || 'skill';
        this.pendingRedAttacker = null;
        this.pendingRedType = null;
        this._triggerAdaptation(redType, redAttacker);
      }
    }

    // ── PENDING GETSUGA TENSHO ADAPTATION RELEASE TICK (Triggers wheel click after the 2nd Getsuga Tensho duration is done!) ──
    if (this.pendingGetsugaAdaptation) {
      const proj = this.pendingGetsugaProj;
      const isProjActive = proj && typeof projectileSystem !== 'undefined' && projectileSystem.projectiles && projectileSystem.projectiles.includes(proj) && (proj.life || 0) > 0;
      const isDragged = Boolean(this.isDraggedByGetsuga);

      if (!isProjActive && !isDragged) {
        this.pendingGetsugaAdaptation = false;
        const getsugaAttacker = this.pendingGetsugaAttacker;
        this.pendingGetsugaAttacker = null;
        this.pendingGetsugaProj = null;

        this.adaptedGetsuga = true;
        if (!this.adaptedSkills) this.adaptedSkills = {};
        this.adaptedSkills['getsugaTensho'] = true;
        this.adaptedSkills['getsuga'] = true;
        this.skillDodgeReady['getsugaTensho'] = false;
        this.skillDodgeReady['getsuga'] = false;
        this.isParalyzed = false;
        this.paralyzeTimer = 0;
        if (this.statusEffects) {
          this.statusEffects.paralyzeTimer = 0;
        }

        this._lastSkillShotId = 'getsugaTensho';
        this._lastSkillShotColor = '#FF1E00';
        this._triggerAdaptation('skill', getsugaAttacker);
      }
    }

    // ── PENDING DOMAIN ADAPTATION RELEASE TICK (Triggers 1 single click after Gojo's domain expires!) ──
    if (this.pendingDomainAdaptation) {
      const isInsideGojoDomain = typeof state !== 'undefined' && (
        state.activeDomain === 'unlimited_void' || 
        state.domainActive === 'unlimited_void' || 
        (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.domainActive))
      );

      if (!isInsideGojoDomain) {
        const queued = this.pendingDomainAdaptation;
        this.pendingDomainAdaptation = null;
        if (queued) {
          if (queued.lastGojoHitType) this._lastGojoHitType = queued.lastGojoHitType;
          if (queued.lastSukunaHitType) this._lastSukunaHitType = queued.lastSukunaHitType;
          if (queued.lastSkillShotId) this._lastSkillShotId = queued.lastSkillShotId;
          if (queued.lastSkillShotColor) this._lastSkillShotColor = queued.lastSkillShotColor;
          this._triggerAdaptation(queued.type || 'skill', queued.attacker);
        }
      }
    }

    if (this.skillExposureTimer > 0) {
      this.skillExposureTimer--;
      if (this.skillExposureTimer <= 0) {
        this._triggerAdaptation(this.exposedSkillType || 'skill', this.exposedSkillAttacker);
        this.exposedSkillType = null;
        this.exposedSkillAttacker = null;
      }
    }

    const isInsideGojoDomain = typeof state !== 'undefined' && (
      state.activeDomain === 'unlimited_void' || 
      state.domainActive === 'unlimited_void' || 
      (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.domainActive))
    );

    // Saitama Serious Counter adaptation: wheel clicks shortly after the punch lands
    // MUST tick BEFORE freeze guards — otherwise hit-stun/CC from the punch blocks the timer from counting down!
    if (this.saitamaCounterDebuffTimer > 0) {
      this.saitamaCounterDebuffTimer--;
      if (this.saitamaCounterDebuffTimer <= 0 && this.hp > 0 && !this.isDead && !this.adaptedSaitamaCounter) {
        adaptToSaitamaCounter(this, this.saitamaCounterAttacker);
        this.saitamaCounterAttacker = null;
      }
    }

    // ── WHEEL OF ADAPTATION (WOA) TIMERS TICKING (Unstoppable celestial passive progress under all CC/paralyze) ──
    if (this.fatalAdaptCooldown > 0) {
      this.fatalAdaptCooldown--;
    } else {
      const threshold = this.maxHp * (CONFIG.mahoraga?.fatalDamageThresholdPct ?? 0.15);
      if ((this.totalAccumDamage || 0) >= threshold) {
        this._triggerAdaptation('skill', null);
      }
    }
    if (this.accumTimer > 0) {
      this.accumTimer--;
      if (this.accumTimer <= 0) {
        this.totalAccumDamage = 0;
      }
    }

    const isFrozen = this._handleTimeStop();
    const isInfinityFrozen = handleInfinityFreeze(this);
    const isBeamParalyzed = (
      (!this.adaptedPureLoveBeam && (this.caughtInPureLoveBeam || (this.pureLoveBeamTimer || 0) > 0 || (this.pureLoveBeamRecoveryTimer || 0) > 0)) ||
      this.isCaughtInPurple || (this.purpleHitTimer || 0) > 0 ||
      (!this.adaptedGenosBeam && ((this.caughtInGenosBeamTimer || 0) > 0 || this.caughtInGenosFlurry))
    );

    // Rule #1 Early Exit Guard: Freeze / Gojo Domain / Ambush / Infinity / Beam Paralysis completely freezes Mahoraga!
    if (this.isTargetOfAmbush || isInsideGojoDomain || isFrozen || isInfinityFrozen || isBeamParalyzed) {
      this.interruptAttacks(true);
      this.isCleaving = false;
      this.isShouting = false;
      this.isThrowing = false;
      this.isBlitzActive = false;
      this.isInfinityBlitz = false;
      this.adaptationPauseTimer = 0;
      this.adaptationDashTimer = 0;
      this._pendingCounterTarget = null;
      this.neutralStanceTimer = 0;
      this.vx = 0;
      this.vy = 0;
      if (this.knockbackVx !== undefined) this.knockbackVx = 0;
      if (this.knockbackVy !== undefined) this.knockbackVy = 0;
      return; // MANDATORY: Complete paralyzing freeze so fighter is frozen and DOES NOT SLIDE during domain/time-stop/infinity!
    }

    // ── MID-ACTION INTERRUPT FROM GETSUGA TENSHO DRAG, HOLLOW PURPLE, PURE LOVE BEAM, OR GENOS ULTIMATE ──
    const isDraggedByGetsuga = Boolean(this.isDraggedByGetsuga);
    if (isDraggedByGetsuga) {
      this.interruptAttacks();
      this.neutralStanceTimer = 0;
      this.adaptationDashTimer = 0;
      this.adaptationDashTarget = null;
      this.adaptationDashIsCounter = false;
      this.adaptationPauseTimer = 0;
      this.isInfinityBlitz = false;
      this.isBlitzActive = false;
      this.blitzHitsLeft = 0;
      this.blitzTimer = 0;
      this.wallBounceCount = 0;
      this._pendingCounterTarget = null;
      this.isCleaving = false;
      this.isShouting = false;
      this.isThrowing = false;

      if (this.isWallSlamActive) {
        this.isWallSlamActive = false;
        this.wallSlamPhase = null;
        this.wallSlamTimer = 0;
        const grabbed = this.wallSlamTarget || (state.fighters?.find(f => f && f !== this && f.hp > 0));
        if (grabbed) {
          grabbed.isGrabbedByMahoraga = false;
          grabbed.z = 0;
        }
        spawnFloatingText(this.x, this.y - this.r - 28, 'INTERRUPTED!', '#FF3D00');
      }
    }

    const isCaughtInUltimateBeam = (
      this.isCaughtInPurple || (this.purpleHitTimer || 0) > 0 ||
      (!this.adaptedPureLoveBeam && (this.caughtInPureLoveBeam || (this.pureLoveBeamRecoveryTimer || 0) > 0)) ||
      (!this.adaptedGenosBeam && ((this.caughtInGenosBeamTimer || 0) > 0 || this.caughtInGenosFlurry))
    );

    if (isCaughtInUltimateBeam) {
      const ccTenacityMult = CONFIG.mahoraga?.ccTenacityPerClickPercent || 0.075;
      const maxCcTenacity = CONFIG.mahoraga?.maxCcTenacityPercent || 0.60;
      const ccTenacity = Math.min(maxCcTenacity, totalStages * ccTenacityMult);
      const inMeleeRange = opponent && Math.hypot(opponent.x - this.x, opponent.y - this.y) < (this.r + opponent.r + (CONFIG.mahoraga?.swordRange || 110));
      const canAttackUnderCC = ccTenacity > 0 && inMeleeRange;

      if (!canAttackUnderCC) {
        this.interruptAttacks();
        this.neutralStanceTimer = 0;
        this.adaptationDashTimer = 0;
        this.adaptationPauseTimer = 0;
        this.isInfinityBlitz = false;
        this.isBlitzActive = false;
      }

      if (this.isWallSlamActive) {
        this.isWallSlamActive = false;
        this.wallSlamPhase = null;
        this.wallSlamTimer = 0;
        const grabbed = this.wallSlamTarget || (state.fighters?.find(f => f && f !== this && f.hp > 0));
        if (grabbed) {
          grabbed.isGrabbedByMahoraga = false;
          grabbed.z = 0;
        }
        spawnFloatingText(this.x, this.y - this.r - 28, 'INTERRUPTED!', '#FF3D00');
      }
    }

    // ── LEVEL 8 TRANSFORMED THROW SKILL: WALL SLAM & DASH EXECUTE ──
    if (this.isWallSlamActive) {
      if ((this.knockbackStunTimer || 0) <= 0) {
        this.vx = 0;
        this.vy = 0;
      }
      this.applyMovementPhysics(0);
      this.updateLevel8WallSlam(opponent, ownerIndex, arena);
      return;
    }

    // Calculate Dynamic Movement Speed based on Gold Adaptations
    const baseSpeed = this.baseSpeed || CONFIG.mahoraga?.moveSpeed || 6.5;
    const goldStages = (this.goldAdaptationStage?.melee || 0) + (this.goldAdaptationStage?.ranged || 0) + (this.goldAdaptationStage?.skill || 0);
    const speedBoost = CONFIG.mahoraga?.adaptationSpeedBoostPerStage ?? 0.15;
    this.speed = baseSpeed * (1.0 + (goldStages * speedBoost));

    // ── PASSIVE RCT REGEN (Scales continuously per adaptation level / wheel click without cap!) ──
    const rctPerStage = CONFIG.mahoraga?.rctRegenPerStage ?? 0.03;
    const currentRegenRate = totalStages * rctPerStage;

    if (currentRegenRate > 0 && this.hp > 0 && !this.isDead && this.hp < this.maxHp) {
      const oldHp = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + currentRegenRate);
      const actualHealed = this.hp - oldHp;

      this._rctRegenAccumulator = (this._rctRegenAccumulator || 0) + actualHealed;
      this._rctRegenAccumTimer = (this._rctRegenAccumTimer || 0) + 1;

      if (this._rctRegenAccumTimer >= 30) {
        this._rctRegenAccumTimer = 0;
        const healDisplay = Math.round(this._rctRegenAccumulator);
        this._rctRegenAccumulator = 0;
        if (healDisplay > 0) {
          spawnFloatingText(this.x + (Math.random() - 0.5) * 16, (this.y - (this.z || 0)) - this.r - 15, `+${healDisplay}`, '#00FF66');
          this._healthBarHealTimer = 10;
        }
      }

      // Periodically spawn subtle green healing wisps floating upward
      if (Math.random() < 0.35) {
        spawnSparks(this.x + (Math.random() - 0.5) * (this.r || 30), (this.y - (this.z || 0)) + (Math.random() - 0.5) * (this.r || 30), 1, 'arcaneAscendLine', '#00FF66');
      }
    } else {
      this._rctRegenAccumulator = 0;
      this._rctRegenAccumTimer = 0;
    }

    // ── PROACTIVE GOJO ADAPTATION DODGE TRIGGERS ──
    const livePurpleOrb = (projectileSystem && projectileSystem.projectiles)
      ? projectileSystem.projectiles.find(p => p && (p.isGojoPurple || p.isGojoPurpleOrb || p.behaviorType === 'gojo_purple' || p.skillShotId === 'purple') && (p.life || 0) > 0)
      : null;

    const gojoFighter = (opponent && (opponent.characterId === 'gojo' || opponent.type === 'gojo'))
      ? opponent
      : (state.fighters ? state.fighters.find(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.hp > 0) : null);

    const isPurpleAdapted = (this.gojoAdapted && this.gojoAdapted.purple) || 
                            (this.adaptedSkills && this.adaptedSkills['purple']) ||
                            (this.gojoAdaptColorHistory && this.gojoAdaptColorHistory.includes('#8A2BE2')) ||
                            ((this.goldAdaptationStage?.skill || 0) >= 2) ||
                            ((this.adaptationStage?.skill || 0) >= 2);

    // (Purple adaptation now only provides 50% damage reduction via mahoragaAdaptation.js
    //  — Mahoraga still gets pulled and paralyzed by the gravitational vortex.)

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
        if (p && p.isAdaptableSkillShot && p.skillShotId !== 'purple' && !p.isGojoPurple && !p.isGojoPurpleOrb && p.behaviorType !== 'gojo_purple' && p.skillShotId !== 'getsugaTensho' && p.skillShotId !== 'getsuga' && !p.isGetsuga && (p.life || 0) > 0) {
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
    if (opponent && opponent.isFiringSkillShot && opponent.isFiringSkillShot !== 'purple' && opponent.isFiringSkillShot !== 'getsugaTensho' && opponent.isFiringSkillShot !== 'getsuga') {
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
        if (skillId === 'getsugaTensho' || skillId === 'getsuga') continue;
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
    if (this.adaptationDashTimer > 0 && !isCaughtInUltimateBeam && !this.isDraggedByGetsuga) {
      this.adaptationDashTimer--;
      const maxDash = this.adaptationDashMaxTimer || (CONFIG.mahoraga?.adaptationDashSpeedFrames ?? 10);
      const progress = Math.min(1.0, Math.max(0.0, 1.0 - (this.adaptationDashTimer / maxDash)));

      this.x = this.dashFromX + (this.dashToX - this.dashFromX) * progress;
      this.y = this.dashFromY + (this.dashToY - this.dashFromY) * progress;
      this.vx = 0;
      this.vy = 0;

      if (this.adaptationDashTarget && !this.adaptationDashTarget.isDead) {
        this.aim(this.adaptationDashTarget);
      }

      if (!this.adaptationAfterimages) this.adaptationAfterimages = [];
      pushTrailCap(this.adaptationAfterimages, {
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
          const damage = CONFIG.mahoraga?.swordDamage ?? 15;
          target.takeDamage(damage, this, { isMelee: true, isSkill: true });

          target.timeStopTimer = 0;
          target.mahoragaAdaptationFreezeTimer = 0;
          target.hitStunTimer = 0;
          target.knockbackStunTimer = 0;

          spawnImpactFlash(target.x, target.y, 45, '#FFFFFF');
          spawnSparks(target.x, target.y, 25, 'silver', '#FFFFFF');
          spawnMeleeClashShockwave(target.x, target.y, 110, 'silver');
          triggerGlobalScreenShake(10, 18);
          this._playRandomHeavyPunchSound();

          this._executeShout(target, ownerIndex);

        const kbAngle = Math.atan2(target.y - this.y, target.x - this.x);
        const kbForce = CONFIG.mahoraga?.adaptationStrikeKnockbackForce ?? 42.0;
        const kbVx = Math.cos(kbAngle) * kbForce;
        const kbVy = Math.sin(kbAngle) * kbForce;

        target.vx = kbVx;
        target.vy = kbVy;
        if (typeof target.applyKnockback === 'function') {
          target.applyKnockback(kbVx, kbVy);
        }

        target.x += target.vx;
        target.y += target.vy;

        if (target && !target.isDead) {
          const dmg = CONFIG.mahoraga?.swordDamage ?? 15;
          target.takeDamage(dmg, this, { isMelee: true, isSkill: true });
          this.punchAnimTimer = 22;
          this.punchAnimMaxTimer = 22;
          const swordSnd = CONFIG.mahoraga?.sounds?.swordSwing || 'attack_swordswing';
          const swordVol = CONFIG.mahoraga?.soundVolumes?.swordSwing !== undefined ? CONFIG.mahoraga.soundVolumes.swordSwing : 1.0;
          audioSystem.playSFX(swordSnd, swordVol);
          spawnImpactFlash(target.x, target.y, 45, '#FFD700');
          spawnSparks(target.x, target.y, 15, 'gold', '#FFFFFF');
          spawnFloatingText(this.x, this.y - this.r - 25, '⚡ ADAPTATION STRIKE!', '#FFD700');
        }

        if (this.teleportCounterPending) {
          this.teleportCounterPending = false;
          if (target && !target.isDead) {
            this.attackCount = (this.attackCount || 0) + 1;
            if (this.attackCount % 2 === 0) {
              this.leftPunchTimer = 18;
              this.leftPunchMaxTimer = 18;
              this._playRandomHeavyPunchSound();
            } else {
              this.swordCombo = (this.swordCombo || 0) + 1;
              this.punchAnimTimer = 18;
              this.punchAnimMaxTimer = 18;
              const swordSnd = CONFIG.mahoraga?.sounds?.swordSwing || 'attack_swordswing';
              const swordVol = CONFIG.mahoraga?.soundVolumes?.swordSwing !== undefined ? CONFIG.mahoraga.soundVolumes.swordSwing : 1.0;
              audioSystem.playSFX(swordSnd, swordVol);
            }

            const counterTargets = this._getFrontRadiusTargets(100, Math.PI * 1.3);
            if (target && target.hp > 0 && !target.isDead && !counterTargets.includes(target)) {
              const dist = Math.hypot(this.x - target.x, this.y - target.y);
              if (dist <= 100 + this.r + target.r) {
                counterTargets.push(target);
              }
            }
            for (const t of counterTargets) {
              t.takeDamage(CONFIG.mahoraga?.teleportCounterDamage ?? 22, this, { isMelee: true, isSkill: true });
            }

            spawnImpactFlash(target.x, target.y, 45, '#FFD700');
            spawnSparks(target.x, target.y, 15, 'gold', '#FFFFFF');
            spawnMeleeClashShockwave(target.x, target.y, 100, 'mahoraga');
            triggerGlobalScreenShake(8, 15);
            spawnFloatingText(this.x, this.y - this.r - 25, '⚡ TELEPORT ADAPTATION!', '#FFD700');
            audioSystem.playSFX('skill_dash5', 0.8);
          }
        }
        
        this.adaptationDashIsCounter = false;
      }
      return;
    }
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

      const p = 1.0 - (this.adaptationPauseTimer / (this.adaptationPauseMax || (CONFIG.mahoraga?.wheelClickDuration ?? 25)));
      const easeP = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      this.wheelRotation = (this.wheelStartRotation || 0) + easeP * (Math.PI / 4);

      if (this.adaptationPauseTimer === 0) {
        this.wheelRotation = this.wheelTargetRotation;
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
        this.neutralStanceCooldownTimer = CONFIG.mahoraga?.neutralStanceCooldownFrames ?? 150;
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
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.leftPunchTimer > 0) this.leftPunchTimer--;
    if (this.blitzCooldownTimer > 0) this.blitzCooldownTimer--;
    if (this.infinityBlitzCooldownTimer > 0) this.infinityBlitzCooldownTimer--;
    if (this.defensePoseTimer > 0) this.defensePoseTimer--;


    const isLevel8 = totalStages >= 8 || this.isMaxAdapted || ((this.goldAdaptationStage?.melee || 0) + (this.goldAdaptationStage?.ranged || 0) + (this.goldAdaptationStage?.skill || 0) >= 8);

    if (isLevel8 && !this.isWallSlamActive) {
      if (Math.random() < 0.6) {
        spawnSparks(this.x + (Math.random() - 0.5) * this.r * 1.6, this.y + (Math.random() - 0.5) * this.r * 1.6, 2, 'arcane', '#9D4EDD');
      }
      if (!this.hasAnnouncedLevel8) {
        this.hasAnnouncedLevel8 = true;
        spawnFloatingText(this.x, this.y - this.r - 25, '⚡ LEVEL 8 AWAKENED!', '#FFD700');
        triggerGlobalScreenShake(6, 14);
        audioSystem.playSFX('skill_enhance', 1.0);
      }
    }

    // ── Divine Shout (Instant Release on the Move) ──
    if (this.isShouting) {
      this._executeShout(opponent, ownerIndex);
      this.isShouting = false;
      this.shoutWindupTimer = 0;
      this.shoutCooldown = CONFIG.mahoraga?.shoutCooldown ?? 1000;
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
        
        let diff = targetAngle - (this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0));
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        this.gunAngle = (this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0)) + diff * turnSpeed;
        this.angle = this.gunAngle;
      }

      this.throwBarrageTimer++;
      const interval = CONFIG.mahoraga?.throwBarrageInterval ?? 10;

      if (this.throwBarrageTimer >= interval) {
        this.throwBarrageTimer = 0;
        this.shoot(ownerIndex);
        this.throwBarrageShotsLeft--;

        spawnImpactFlash(this.x, this.y, 25, 'silver');
        spawnSparks(this.x, this.y, 6, 'silver', '#FFFFFF');

        if (this.throwBarrageShotsLeft <= 0) {
          this.isThrowing = false;
          this.throwCooldown = CONFIG.mahoraga?.throwCooldown ?? 1000;
        }
      }
      return;
    }

    // ── HAND-TO-HAND BLITZ SEQUENCE ──
    if (this.isBlitzActive) {
      if (this.isDraggedByGetsuga) {
        this.isBlitzActive = false;
        this.isInfinityBlitz = false;
        this.isWallSlamBlitz = false;
        this.wallSlamBlitzInterval = 0;
        this.blitzHitsLeft = 0;
        this.blitzCooldownTimer = 180;
        return;
      }

      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.applyMovementPhysics(0);

      const target = this.blitzTarget || opponent;
      if (!target || target.isDead) {
        this.isBlitzActive = false;
        this.isWallSlamBlitz = false;
        this.wallSlamBlitzInterval = 0;
        this.blitzHitsLeft = 0;
        this.blitzCooldownTimer = 180;
        if (target) {
          target.isParalyzedByMahoraga = false;
          target.isWallSlammed = false;
          target.wallSlamPinnedX = undefined;
          target.wallSlamPinnedY = undefined;
          target.paralyzeTimer = 0;
        }
        return;
      }

      if (this.isWallSlamBlitz && target) {
        this.aim(target);
        this.vx = 0;
        this.vy = 0;
        this.knockbackVx = 0;
        this.knockbackVy = 0;

        const aimAngle = this.gunAngle !== undefined ? this.gunAngle : Math.atan2(target.y - this.y, target.x - this.x);
        const idealDist = this.r + target.r + 14;
        const idealX = target.x - Math.cos(aimAngle) * idealDist;
        const idealY = target.y - Math.sin(aimAngle) * idealDist;
        this.x = idealX;
        this.y = idealY;

        if (target.wallSlamPinnedX !== undefined && target.wallSlamPinnedY !== undefined) {
          target.x = target.wallSlamPinnedX;
          target.y = target.wallSlamPinnedY;
          target.vx = 0;
          target.vy = 0;
        }
      }

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
      const blitzInterval = this.wallSlamBlitzInterval || (CONFIG.mahoraga?.blitzHitInterval ?? 15);

      if (this.blitzTimer >= blitzInterval) {
        this.blitzTimer = 0;
        this.blitzHitsLeft--;

        const activeArena = arena || (typeof state !== 'undefined' && state.arena ? state.arena : CONFIG.arena);
        const totalHits = CONFIG.mahoraga?.blitzHitsCount ?? 10;
        const hitIndex = totalHits - this.blitzHitsLeft;

        const distToTarget = Math.hypot(this.x - target.x, this.y - target.y);
        const maxMeleeDist = CONFIG.mahoraga?.blitzTeleportDistanceThreshold || (this.r + target.r + (CONFIG.mahoraga?.swordRange || 110) + 40);
        const minStayFrames = CONFIG.mahoraga?.blitzMinStayFrames ?? 20;

        const isTargetBlitzing = target && (
          target.isBlitzActive ||
          target.isTeleportFlurry ||
          target.isTeleporting ||
          (target.flurryHitsLeft && target.flurryHitsLeft > 0) ||
          (target.blitzHitsLeft && target.blitzHitsLeft > 0)
        );

        if (this.isWallSlamBlitz && target) {
          // Mahoraga stays firmly stationed in front of the wall-pinned target
          this.vx = 0;
          this.vy = 0;
          this.aim(target);
          if (target.wallSlamPinnedX !== undefined && target.wallSlamPinnedY !== undefined) {
            target.x = target.wallSlamPinnedX;
            target.y = target.wallSlamPinnedY;
            target.vx = 0;
            target.vy = 0;
          }
        } else if (!this.isDraggedByGetsuga && ((distToTarget > maxMeleeDist && this.blitzStayTimer >= minStayFrames) || (isTargetBlitzing && distToTarget > 55))) {
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
           const dashFrames = CONFIG.mahoraga?.adaptationDashSpeedFrames ?? 10;
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
          const blitzDamage = CONFIG.mahoraga?.blitzHitDamage ?? 15;
          target.takeDamage(blitzDamage, this, { isMelee: true, isSkill: true });
          if (typeof target.applyHitStun === 'function') {
            target.applyHitStun(2);
          }
          if (target.isParalyzedByMahoraga) {
            target.paralyzeTimer = 25; // Refresh paralyze only if they were already wall-slam paralyzed
          }

          const animDur = CONFIG.mahoraga?.blitzAttackAnimDuration ?? 7;
          if (hitIndex % 2 === 1) {
            this.leftPunchTimer = animDur;
            this.leftPunchMaxTimer = animDur;
          } else {
            this.punchAnimTimer = animDur;
            this.punchAnimMaxTimer = animDur;
            this.swordCombo = (this.swordCombo || 0) + 1;
          }

          const pushAngle = this.gunAngle !== undefined ? this.gunAngle : Math.atan2(target.y - this.y, target.x - this.x);
          spawnImpactFlash(target.x, target.y, 35, '#FFD700');
          spawnMeleeClashShockwave(target.x, target.y, 65, 'mahoraga');
          triggerGlobalScreenShake(6, 12);

          const animeWords = ['ORA!', 'SLAM!', 'SLASH!', 'WHAM!', 'POW!'];
          const word = animeWords[(hitIndex - 1) % animeWords.length];
          spawnFloatingText(target.x + (Math.random() - 0.5) * 20, target.y - target.r - 20, word, '#FFD700');

          this._playRandomHeavyPunchSound();
          const swordSnd = CONFIG.mahoraga?.sounds?.swordSwing || 'attack_swordswing';
          const swordVol = (CONFIG.mahoraga?.soundVolumes?.swordSwing !== undefined ? CONFIG.mahoraga.soundVolumes.swordSwing : 1.0) * 0.8;
          audioSystem.playSFX(swordSnd, swordVol);

          const isPunchHit = (hitIndex % 2 === 1);
          const rollBlitzKnockback = isPunchHit && (Math.random() < 0.45);

          if (this.isWallSlamBlitz && target) {
            // Target is firmly pinned against the wall during Wall Slam rapid hits — NO SLIDING!
            target.vx = 0;
            target.vy = 0;
            if (target.wallSlamPinnedX !== undefined && target.wallSlamPinnedY !== undefined) {
              target.x = target.wallSlamPinnedX;
              target.y = target.wallSlamPinnedY;
            }
          } else if (rollBlitzKnockback) {
            const kbForce = CONFIG.mahoraga?.blitzKineticKnockbackForce ?? 16.0;
            target.vx = (target.vx || 0) + Math.cos(pushAngle) * kbForce;
            target.vy = (target.vy || 0) + Math.sin(pushAngle) * kbForce;
            target.x += Math.cos(pushAngle) * (kbForce * 0.35);
            target.y += Math.sin(pushAngle) * (kbForce * 0.35);
            if (typeof target.applyHitStun === 'function') target.applyHitStun(4);
            spawnFloatingText(target.x, target.y - (target.r || 20) - 22, 'KINETIC KNOCKBACK!', '#FFD700');
            triggerGlobalScreenShake(8, 12);
          } else {
            const pushForce = CONFIG.mahoraga?.blitzHitPushbackForce ?? 4.5;
            target.vx = Math.cos(pushAngle) * pushForce;
            target.vy = Math.sin(pushAngle) * pushForce;
            target.x += target.vx;
            target.y += target.vy;
          }

          if (typeof state !== 'undefined' && state.arena) {
            const minX = state.arena.x + (target.r || 20);
            const maxX = state.arena.x + state.arena.width - (target.r || 20);
            const minY = state.arena.y + (target.r || 20);
            const maxY = state.arena.y + state.arena.height - (target.r || 20);
            target.x = Math.max(minX, Math.min(maxX, target.x));
            target.y = Math.max(minY, Math.min(maxY, target.y));
          }

        } else {
          // Final Hit: GRAND FINISHER CLEAVE!
          this.bladeRetractProgress = 1.0;
          const finisherDamage = CONFIG.mahoraga?.blitzFinisherDamage ?? 35;
          target.takeDamage(finisherDamage, this, { isMelee: true, isSkill: true });

          this.punchAnimTimer = 18;
          this.punchAnimMaxTimer = 18;
          this.swordCombo = (this.swordCombo || 0) + 1;

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
          target.isParalyzedByMahoraga = false;
          target.isWallSlammed = false;
          target.wallSlamPinnedX = undefined;
          target.wallSlamPinnedY = undefined;
          target.paralyzeTimer = 0;

          const kbAngle = this.gunAngle;
          const kbForce = CONFIG.mahoraga?.blitzFinisherKnockback ?? 35.0;
          target.vx = Math.cos(kbAngle) * kbForce;
          target.vy = Math.sin(kbAngle) * kbForce;
          if (typeof target.applyKnockback === 'function') target.applyKnockback(target.vx, target.vy);
          target.x += target.vx * 0.25;
          target.y += target.vy * 0.25;

          if (typeof state !== 'undefined' && state.arena) {
            const minX = state.arena.x + (target.r || 20);
            const maxX = state.arena.x + state.arena.width - (target.r || 20);
            const minY = state.arena.y + (target.r || 20);
            const maxY = state.arena.y + state.arena.height - (target.r || 20);
            target.x = Math.max(minX, Math.min(maxX, target.x));
            target.y = Math.max(minY, Math.min(maxY, target.y));
          }

          spawnImpactFlash(target.x, target.y, 50, '#FFD700');
          spawnSparks(target.x, target.y, 30, 'gold', '#FFFFFF');
          spawnMeleeClashShockwave(target.x, target.y, 120, 'gold');
          triggerGlobalScreenShake(12, 22);
          audioSystem.playSFX('attack_explosion', 1.0);
          audioSystem.playSFX('attack_swordswing', 1.0);
          spawnFloatingText(target.x, target.y - 30, 'FINISHER CLEAVE!', '#FFD700');

          this.isBlitzActive = false;
          this.isWallSlamBlitz = false;
          this.wallSlamBlitzInterval = 0;
          this.blitzHitsLeft = 0;
          this.blitzCooldownTimer = CONFIG.mahoraga?.blitzCooldownFrames ?? 60;
        }
      }
      return;
    }

    // ── Active Cleave Skill (Instant Execution on the Move) ──
    if (this.isCleaving) {
      this._executeCleave(target || opponent);
      this.isCleaving = false;
      this.cleaveWindupTimer = 0;
      this.cleaveCooldown = CONFIG.mahoraga?.cleaveCooldown ?? 600;
    }

    // ── Natural Bounce Movement ──
    // Mahoraga uses natural wall-bounce and enemy-collision physics, counter-teleports, and attack-blitzes.
    const target = this._findClosestEnemy(opponent);
    this.isMeleeMode = false;

    this.applyMovementPhysics();

    if (target && !target.isDead) {
      // Only update facing when NOT in hit stun or knockback — prevents erratic mid-air direction flipping
      const isInHitReaction = (this.hitStunTimer || 0) > 0 || (this.knockbackStunTimer || 0) > 0 || 
                              (this.electricStunTimer || 0) > 0 || (this.dubstepStunTimer || 0) > 0;
      if (!isInHitReaction) {
        this.aim(target);
      }
      const distToOpponent = Math.hypot(this.x - target.x, this.y - target.y, (this.z || 0) - (target.z || 0));
      const swordRange = CONFIG.mahoraga?.swordRange ?? 110;
      const swordArc = CONFIG.mahoraga?.swordArcRadians ?? (Math.PI * 1.3);
      const meleeDist = this.r + target.r + swordRange;
      this.isMeleeMode = false;

      const isEnemyChanneling = (
        target.isChanneling ||
        target.isWindingUp ||
        (target.domainChargeTimer && target.domainChargeTimer > 0) ||
        (target.purpleChargeTimer && target.purpleChargeTimer > 0) ||
        (target.divineFlameChargeTimer && target.divineFlameChargeTimer > 0) ||
        (target.ultimateChargeTimer && target.ultimateChargeTimer > 0) ||
        target.isCharging ||
        target.isChargingSkill ||
        target.isChannelingDomainExpansion ||
        target.isChannelingDivineFlame
      );

      // ── AI SKILL DECISION TREE ──
      const shoutRadius = CONFIG.mahoraga?.shoutRadius || 180;
      const frontTargetsForAttack = this._getFrontRadiusTargets(swordRange, swordArc);
      const isAnyTargetInRange = distToOpponent <= meleeDist || frontTargetsForAttack.length > 0;
      const canActSkills = !isInHitReaction && !this.isShouting && !this.isCleaving && !this.isThrowing && !this.isWallSlamActive && !this.isInfinityBlitz && !this.isDraggedByGetsuga;

      if (canActSkills) {
        const minThrowDist = CONFIG.mahoraga?.throwMinDistance || 240;
        const totalStages = (this.adaptationStage?.melee || 0) + (this.adaptationStage?.ranged || 0) + (this.adaptationStage?.skill || 0);
        const hasWallSlam = totalStages >= 8 || this.isMaxAdapted || (this.goldStages >= 8);

        const shoutTriggerDist = shoutRadius + (target.r || 25);

        // Priority 0: Close-Quarters Proximity Attack (Instantly strikes when in melee contact/reach)
        if (isAnyTargetInRange && this.swordCooldown <= 0) {
          this._performMeleeAttack(target);
        }
        // Priority 1: Divine Shout (Instant AoE shockwave roar without stopping or windup pause)
        else if (this.shoutCooldown <= 0 && (distToOpponent <= shoutTriggerDist || isEnemyChanneling)) {
          this._executeShout(target, ownerIndex);
          this.shoutCooldown = CONFIG.mahoraga?.shoutCooldown ?? 1000;
          this.isShouting = false;
          this.shoutWindupTimer = 0;
        }
        // Priority 2: World Cleave (Heavy Cleave in close-medium range - Instant AoE execute on the move)
        else if (this.cleaveCooldown <= 0 && distToOpponent <= meleeDist + 40) {
          this._executeCleave(target);
          this.cleaveCooldown = CONFIG.mahoraga?.cleaveCooldown ?? 600;
          this.isCleaving = false;
          this.cleaveWindupTimer = 0;
        }
        // Priority 3: Throw Skill (Debris Throw at Level 1-7 OR Wall Slam & Dash Execute at Level 8+)
        else if (this.throwCooldown <= 0 && (distToOpponent >= minThrowDist || hasWallSlam) && !isAnyTargetInRange) {
          if (hasWallSlam) {
            this.initiateLevel8WallSlam(target);
          } else {
            this.isThrowing = true;
            this.throwBarrageShotsLeft = CONFIG.mahoraga?.throwBarrageCount ?? 10;
            this.throwBarrageTimer = 0;
          }
        }
        // Priority 4: Active Close-Quarters Attack-Teleport Stance
        else if (this.neutralStanceTimer > 0 && this.swordCooldown <= 0 && isAnyTargetInRange) {
          this._performMeleeAttack(target);
        }
      }
    } else {
      this.isMeleeMode = false;
    }
    this._bounceTarget = target || opponent; // Store for resolveWallBounce override
    if (arena) this.resolveWallBounce(arena, target || opponent);
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



  _getSwordTipPositions() {
    const r = this.r || 30;
    const bladeLength = 58;

    let swingAngle = 0;
    let extendDist = 0;

    const punchAnimTimer = this.punchAnimTimer || 0;
    const maxAnimTimer = this.punchAnimMaxTimer || 18;
    const swordCombo = this.swordCombo || 0;
    const isCleaving = this.isCleaving || false;
    const isThrowing = this.isThrowing || false;
    const bladeRetractProgress = this.bladeRetractProgress !== undefined ? this.bladeRetractProgress : 1.0;

    const isParrying = (this.defensePoseType === 'parry' && (this.defensePoseTimer || 0) > 0);
    const isGuarding = (this.defensePoseType === 'guard' && (this.defensePoseTimer || 0) > 0);

    if (punchAnimTimer > 0) {
      const maxTimer = (maxAnimTimer && maxAnimTimer > 0) ? maxAnimTimer : 18.0;
      const swingDuration = 12.0;
      const elapsed = maxTimer - punchAnimTimer;
      const comboIndex = this.isInfinityBlitz ? (1 + (swordCombo % 2)) : (swordCombo % 3);

      if (elapsed <= swingDuration) {
        const p = Math.min(1.0, elapsed / swingDuration);

        if (comboIndex === 1) {
          // Combo 1: Sweeps backhand from +0.65 to -0.55
          const easedP = 1.0 - Math.pow(1.0 - p, 2.2);
          swingAngle = (Math.PI * 0.65) - (Math.PI * 1.20) * easedP;
          extendDist = Math.sin(p * Math.PI) * 28;
        } else if (comboIndex === 2) {
          // Combo 2: Heavy Overhead Chop (Windup -0.55 -> -0.85, then heavy chop -0.85 -> +0.85)
          if (p < 0.15) {
            const w = p / 0.15;
            swingAngle = (-Math.PI * 0.55) + (-Math.PI * 0.30) * Math.sin(w * Math.PI * 0.5);
          } else {
            const s = (p - 0.15) / 0.85;
            const easedS = 1.0 - Math.pow(1.0 - s, 2.2);
            swingAngle = (-Math.PI * 0.85) + (Math.PI * 1.70) * easedS;
          }
          extendDist = Math.sin(p * Math.PI) * 30;
        } else {
          // Combo 0: Smooth windup back from idle (0 -> -0.45), then slash forward (-0.45 -> +0.65)
          if (p < 0.20) {
            const w = p / 0.20;
            swingAngle = (-Math.PI * 0.45) * Math.sin(w * Math.PI * 0.5);
          } else {
            const s = (p - 0.20) / 0.80;
            const easedS = 1.0 - Math.pow(1.0 - s, 2.2);
            swingAngle = (-Math.PI * 0.45) + (Math.PI * 1.10) * easedS;
          }
          extendDist = Math.sin(p * Math.PI) * 28;
        }
      } else {
        // Recovery phase: Smoothly return from swing end angle to 0 idle guard
        const recP = Math.min(1.0, (elapsed - swingDuration) / (maxTimer - swingDuration));
        const easeRec = recP * (2 - recP);
        let endAngle = Math.PI * 0.65;
        if (comboIndex === 1) endAngle = -Math.PI * 0.55;
        else if (comboIndex === 2) endAngle = Math.PI * 0.85;

        swingAngle = endAngle * (1.0 - easeRec);
        extendDist = (1.0 - easeRec) * 12;
      }
    } else if (isParrying) {
      const maxT = this.defensePoseMaxTimer || 25;
      const t = 1.0 - (this.defensePoseTimer / maxT);
      const p = Math.sin(t * Math.PI);
      swingAngle = Math.PI * 0.25 - p * (Math.PI * 0.45);
      extendDist = 18 + p * 15;
    } else if (isGuarding) {
      swingAngle = -Math.PI * 0.35;
      extendDist = -12;
    } else if (isThrowing) {
      const shotsLeft = this.throwBarrageShotsLeft || 0;
      const isRightArmTurn = (shotsLeft % 2 === 0);
      if (isRightArmTurn) {
        const interval = (typeof CONFIG !== 'undefined' && CONFIG.mahoraga?.throwBarrageInterval) || 10;
        const t = (this.throwBarrageTimer || 0) / interval;
        const p = Math.sin(t * Math.PI);
        swingAngle = -Math.PI * 0.25 + p * 0.45;
        extendDist = 10 + p * 38;
      } else {
        swingAngle = -Math.PI * 0.25;
        extendDist = 10;
      }
    } else if (this.isWallSlamActive && (this.wallSlamPhase === 'post_throw_delay' || this.wallSlamPhase === 'dash')) {
      let p = 1.0;
      if (this.wallSlamPhase === 'post_throw_delay') {
        const standoffDuration = (typeof CONFIG !== 'undefined' && (CONFIG.mahoraga?.wallSlamStandoffDuration || CONFIG.mahoraga?.wallSlamMenacingStandoff)) || 50;
        p = Math.min(1.0, (this.wallSlamTimer || 0) / standoffDuration);
      }
      const easeP = p * p * (3 - 2 * p);
      swingAngle = easeP * (-Math.PI * 0.65);
      extendDist = easeP * 15;
    }

    const shoulderX = r * 0.55;
    const shoulderY = 0;
    const bodyAngle = this.angle || 0;
    const cosB = Math.cos(bodyAngle);
    const sinB = Math.sin(bodyAngle);
    const rotatedShoulderX = shoulderX * cosB - shoulderY * sinB;
    const rotatedShoulderY = shoulderX * sinB + shoulderY * cosB;

    let verticalLift = 0;
    let liftTilt = 0;
    if (this.isWallSlamActive && this.wallSlamPhase === 'grab') {
      const opponentObj = (typeof state !== 'undefined' && state.fighters) ? state.fighters.find(f => f && f !== this && f.hp > 0) : null;
      if (opponentObj) {
        verticalLift = opponentObj.z || 0;
        const holdFrames = CONFIG.mahoraga?.wallSlamImpaleHoldFrames ?? 50;
        const liftP = Math.min(1.0, Math.max(0.0, (this.wallSlamTimer - 12) / (holdFrames - 12)));
        liftTilt = -0.22 * liftP;
      }
    }

    const gunAngle = this.gunAngle || 0;
    const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
    const effectiveSwingAngle = (facingLeft && !this.isSpinning) ? -swingAngle : swingAngle;
    const totalAngle = gunAngle + effectiveSwingAngle + liftTilt;

    const retractScale = isGuarding ? 0.45 : (isParrying ? 1.0 : (bladeRetractProgress !== undefined ? Math.max(0, Math.min(1, bladeRetractProgress)) : (isThrowing ? 0.0 : 1.0)));

    const localTipX = r * 0.3 + extendDist + bladeLength * retractScale;
    const localBaseX = localTipX - 16 * retractScale;

    const worldTipX = this.x + rotatedShoulderX + Math.cos(totalAngle) * localTipX;
    const worldTipY = this.y + rotatedShoulderY - verticalLift + Math.sin(totalAngle) * localTipX;

    const worldBaseX = this.x + rotatedShoulderX + Math.cos(totalAngle) * localBaseX;
    const worldBaseY = this.y + rotatedShoulderY - verticalLift + Math.sin(totalAngle) * localBaseX;

    return {
      outer: { x: worldTipX, y: worldTipY },
      inner: { x: worldBaseX, y: worldBaseY }
    };
  }



  drawGun(ctx) {
    if (this.isTargetOfAmbush) return;
    drawMahoragaSword(ctx, this);
  }

  drawBody(ctx) {
    drawMahoragaSkin(ctx, this);
  }

  drawSkin(ctx) {
    drawMahoragaSkin(ctx, this);
  }

  // Store reference to super.draw for the visuals module to call
  _superDraw(ctx, opponent) {
    super.draw(ctx, opponent);
  }

  draw(ctx, opponent) {
    drawMahoragaFighter(ctx, this, opponent);
  }
}
