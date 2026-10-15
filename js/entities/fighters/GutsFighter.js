// ─────────────────────────────────────────────
// GUTS FIGHTER CLASS (The Black Swordsman)
// Adheres strictly to Repository Rules:
// - Rule 1.1 & 25: Freeze guard & non-freezing visual effects decay
// - Rule 20: Canonical hand positioning
// - Rule 21: Mandatory in-game overlay HP & status drawing
// - Rule 23: Mandatory basic projectile suppression (shoot override)
// - Rule 26: Concentric supersonic shockwaves (Anti-cobweb standard)
// - Rule 27: Lifesteal healthbar-only feedback standard (No floating text)
// - Rule 30: 5-Phase melee combat animation & impact lock standard
// ─────────────────────────────────────────────

import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { gutsConfig } from '../../configs/characters/gutsConfig.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { drawGutsSkin } from '../../graphics/fighters/gutsSkin.js';
import { projectileSystem } from '../../systems/projectileSystem.js';

export class GutsFighter extends Fighter {
  constructor(def) {
    super(def);
    const cfg = gutsConfig;

    this.characterId = 'guts';
    this.type = 'guts';
    this.name = cfg.name || 'Guts';
    this.displayName = cfg.displayName || 'GUTS';
    this.themeColor = cfg.themeColor || '#71717a';
    this.color = cfg.color || '#18181b';
    this.damageNumberColor = cfg.damageNumberColor || '#dc2626';

    this.r = cfg.r || 25;
    this.radius = cfg.radius || 25;
    this.hp = cfg.hp || 460;
    this.maxHp = cfg.maxHp || 460;
    this.speed = cfg.speed || 4.6;
    this.baseSpeed = cfg.speed || 4.6;
    this.damage = cfg.damage || 36;

    // Passive 1: The Struggler (Heavy Poise & Defiance)
    this.poise = cfg.maxPoise || 100;
    this.maxPoise = cfg.maxPoise || 100;
    this.lethalDefianceCooldown = 0;
    this.deathGateInvulnTimer = 0;
    this.deathGateBuffTimer = 0;

    // Passive 2: Brand of Sacrifice & Od Gauge
    this.odGauge = 0;
    this.maxOdGauge = cfg.maxOdGauge || 100;

    // Knight-Standard 5-Phase Sword Swing & Cleave State (Rule 30)
    this.swipeCooldown = 0;
    this.swipeActive = false;
    this.swipeTimer = 0;
    this.swordComboStep = 1;
    this.comboResetTimer = 0;
    this.swordSwingTimer = 0;
    this.swordSwingMax = 0;
    this.swordHitDelivered = false;
    this.swordSwingSoundPlayed = false;
    this.swordSwingTarget = null;
    this.swordTremorX = 0;
    this.swordTremorY = 0;

    this.swordHitPauseTimer = 0;
    this.swordHitPauseMax = 0;
    this.swordHitPauseTargets = [];
    this.swordHitPauseAngle = 0;
    this.swordImpactTimer = 0;
    this.swordImpactX = 0;
    this.swordImpactY = 0;
    this.swordSlashAngle = 0;

    // Skill 1: Prosthetic Arm Cannon & Repeating Crossbow
    this.cannonCooldown = 0;
    this.cannonCooldownMax = cfg.cannonCooldownMax || 420;

    // Skill 2: Iron Cyclone Cleave
    this.cycloneCooldown = 0;
    this.cycloneCooldownMax = cfg.cycloneCooldownMax || 540;
    this.cycloneActive = false;
    this.cycloneTimer = 0;

    // Ultimate: Berserker Armor Awakening
    this.berserkerCooldown = 0;
    this.berserkerCooldownMax = cfg.berserkerCooldownMax || 1800;
    this.isBerserkerActive = false;
    this.berserkerTimer = 0;

    // Declarative Skill Registration (Rule 18 HUD Theme Consistency)
    this.skillManager.registerSkills([
      {
        id: 'cannon',
        name: 'WRIST CANNON / BOLTS',
        type: 'basic',
        cooldownKey: 'cannonCooldown',
        cooldownMax: () => this.cannonCooldownMax,
        enabledKey: 'enableArmCannon',
        configKey: 'enableArmCannon',
        isEnabled: () => gutsConfig.enableArmCannon !== false && gutsConfig.enableCannon !== false && gutsConfig.enableSkill1 !== false,
        color: '#f59e0b',
        onActivate: (fighter, opponent) => {
          fighter._castArmCannon(opponent);
        }
      },
      {
        id: 'cyclone',
        name: 'CYCLONE CLEAVE',
        type: 'buff',
        cooldownKey: 'cycloneCooldown',
        cooldownMax: () => this.cycloneCooldownMax,
        durationKey: 'cycloneTimer',
        durationMax: () => gutsConfig.cycloneDuration || 30,
        activeKey: 'cycloneActive',
        enabledKey: 'enableCyclone',
        configKey: 'enableCyclone',
        isEnabled: () => gutsConfig.enableCyclone !== false && gutsConfig.enableIronCyclone !== false && gutsConfig.enableSkill2 !== false,
        color: '#71717a',
        onActivate: (fighter, opponent) => {
          fighter._castCycloneCleave(opponent);
        }
      },
      {
        id: 'berserker',
        name: 'BERSERKER ARMOR',
        type: 'ultimate',
        isUltimate: true,
        isSignature: true,
        signature: true,
        cooldownKey: 'berserkerCooldown',
        cooldownMax: () => this.berserkerCooldownMax,
        durationKey: 'berserkerTimer',
        durationMax: () => gutsConfig.berserkerDuration || 600,
        activeKey: 'isBerserkerActive',
        enabledKey: 'enableBerserkerArmor',
        configKey: 'enableBerserkerArmor',
        isEnabled: () => gutsConfig.enableBerserkerArmor !== false && gutsConfig.enableBerserker !== false && gutsConfig.enableUltimate !== false,
        color: '#dc2626',
        onActivate: (fighter, opponent) => {
          fighter._castBerserkerArmor(opponent);
        }
      }
    ]);
  }

  // Backward-compatible melee combo state descriptor for external inspection
  get meleeComboState() {
    return {
      active: this.swipeActive,
      hitIndex: this.swordComboStep,
      phase: this._getMeleePhase(),
      progress: this._getMeleeProgress(),
      hasImpacted: this.swordHitDelivered
    };
  }

  get swordCooldown() {
    return this.swipeCooldown;
  }

  set swordCooldown(val) {
    this.swipeCooldown = val;
  }

  _getMeleePhase() {
    if (!this.swipeActive || this.swordSwingTimer <= 0) return 'idle';
    const totalF = this.swordSwingMax || 28;
    const elapsed = totalF - this.swordSwingTimer;
    const liftF = this.swordSwingLiftFrames || 7;
    const holdF = this.swordSwingHoldFrames || 2;
    const strikeF = this.swordSwingStrikeFrames || 5;
    const pinF = this.swordSwingImpactLockFrames || 6;
    if (elapsed < liftF) return 'lift';
    if (elapsed < liftF + holdF) return 'hold';
    if (elapsed < liftF + holdF + strikeF) return 'strike';
    if (elapsed < liftF + holdF + strikeF + pinF) return 'lock';
    return 'recovery';
  }

  _getMeleeProgress() {
    if (!this.swipeActive || this.swordSwingTimer <= 0) return 0;
    const totalF = this.swordSwingMax || 28;
    const elapsed = totalF - this.swordSwingTimer;
    return Math.min(1.0, elapsed / Math.max(1, totalF));
  }

  reset() {
    super.reset();
    this.poise = this.maxPoise;
    this.lethalDefianceCooldown = 0;
    this.deathGateInvulnTimer = 0;
    this.deathGateBuffTimer = 0;
    this.odGauge = 0;

    this.swipeCooldown = 0;
    this.swipeActive = false;
    this.swipeTimer = 0;
    this.swordComboStep = 1;
    this.comboResetTimer = 0;
    this.swordSwingTimer = 0;
    this.swordSwingMax = 0;
    this.swordHitDelivered = false;
    this.swordSwingSoundPlayed = false;
    this.swordSwingTarget = null;
    this.swordTremorX = 0;
    this.swordTremorY = 0;

    this.swordHitPauseTimer = 0;
    this.swordHitPauseMax = 0;
    this.swordHitPauseTargets = [];
    this.swordHitPauseAngle = 0;
    this.swordImpactTimer = 0;
    this.swordImpactX = 0;
    this.swordImpactY = 0;
    this.swordSlashAngle = 0;
    this.committedAttackAngle = undefined;

    this.cannonCooldown = 0;
    this.cycloneCooldown = 0;
    this.cycloneActive = false;
    this.cycloneTimer = 0;
    this.berserkerCooldown = 0;
    this.isBerserkerActive = false;
    this.berserkerTimer = 0;
    this.isCountdownStance = (typeof state !== 'undefined' && state.gameState === 'countdown');
  }

  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks(forceCancelAll);
    this.swordSwingTimer = 0;
    this.swipeActive = false;
    this.committedAttackAngle = undefined;
    this.swordTremorX = 0;
    this.swordTremorY = 0;
    this.swordHitPauseTimer = 0;
    this.swordHitPauseTargets = [];
  }

  /**
   * Countdown hook invoked each frame while gameState === 'countdown'.
   * Maintains Stance 1: Guts standing upright with Dragon Slayer resting across shoulder,
   * gripping the handle with his left prosthetic hand while his right arm hangs loose at his side.
   */
  onCountdown(opponent) {
    this.isCountdownStance = true;
    if (opponent) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const targetAngle = Math.atan2(dy, dx);
      this.gunAngle = targetAngle;
      this.angle = targetAngle;
    }
  }

  /**
   * Mandatory Rule 23: Suppress default generic bullet projectiles.
   * Guts uses dedicated combat skills, weapons, and 5-phase melee combos.
   */
  shoot(ownerIndex, opponent) {
    // Intentionally empty: Character uses dedicated melee combos & arm cannon skills
  }

  /**
   * Mandatory Rule 1.4: Suppress auto-aim tracking during active attacks, swings, hit pauses, and cyclone cleaves.
   */
  canAim() {
    if (this.swipeActive || this.swordSwingTimer > 0 || this.swordHitPauseTimer > 0 || this.cycloneActive) {
      return false;
    }
    return super.canAim();
  }

  /**
   * Enforces committed attack angle lock during 2-hit melee combo (Rule 1.4 & Rule 30).
   * Prevents body/gunAngle from snapping to opponent movement during attack animations.
   */
  aim(opponent) {
    if (this.swipeActive || this.swordSwingTimer > 0 || this.swordHitPauseTimer > 0 || this.cycloneActive) {
      if (this.committedAttackAngle !== undefined) {
        this.gunAngle = this.committedAttackAngle;
        this.angle = this.committedAttackAngle;
      }
      return false;
    }
    return super.aim(opponent);
  }

  takeDamage(amount, attacker, hitType = 'normal') {
    if (this.deathGateInvulnTimer > 0) {
      return 0; // Invulnerable during death gate defiance
    }

    // 18% Natural Physical Damage Mitigation from Blackened Mercenary Plate
    const mitigation = this.isBerserkerActive ? 0.30 : 0.18;
    const finalDamage = Math.max(1, Math.round(amount * (1.0 - mitigation)));

    // Charge Od gauge from taking damage (Passive 2: Brand of Sacrifice & Od Meter)
    const canOd = gutsConfig.enableBrandOfSacrifice !== false && gutsConfig.enableOdMeter !== false;
    if (canOd) {
      this.odGauge = Math.min(this.maxOdGauge, this.odGauge + finalDamage * (gutsConfig.odChargePerDamageTaken || 0.15));
    }

    // Poise damage calculation
    this.poise = Math.max(0, this.poise - finalDamage * 0.8);

    // Lethal Defiance Check: Survive at 1 HP once per 50 seconds (gated by enableTheStruggler toggle)
    const canDefyDeath = gutsConfig.enableTheStruggler !== false && gutsConfig.enableLethalDefiance !== false;
    if (canDefyDeath && this.hp - finalDamage <= 0 && this.lethalDefianceCooldown <= 0) {
      this.hp = 1;
      this.lethalDefianceCooldown = gutsConfig.lethalDefianceCooldown || 3000;
      this.deathGateInvulnTimer = gutsConfig.deathGateInvulnFrames || 72;
      this.deathGateBuffTimer = 300; // 5.0s buff
      spawnFloatingText(this.x, this.y - this.r - 25, 'STRUGGLE AGAINST DEATH!', '#dc2626');
      triggerGlobalScreenShake(8, 16);
      audioSystem.playSFX('ragescream', 1.0);
      return 0;
    }

    return super.takeDamage(finalDamage, attacker, hitType);
  }

  update(opponent, ownerIndex, arena) {
    // 0. Update transient visual effects before freeze guard (Rule 25)
    this._updateVisualExplosions?.();
    this._updateVisualEffects?.();

    // 1. Mandatory Rule 1 Freeze & TimeStop Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // Active combat state: transition to battle stance
    this.isCountdownStance = false;

    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

    // Cooldown ticks
    if (this.lethalDefianceCooldown > 0) this.lethalDefianceCooldown--;
    if (this.deathGateInvulnTimer > 0) this.deathGateInvulnTimer--;
    if (this.deathGateBuffTimer > 0) this.deathGateBuffTimer--;
    if (this.swipeCooldown > 0) this.swipeCooldown--;
    if (this.comboResetTimer > 0) this.comboResetTimer--;
    if (this.swordImpactTimer > 0) this.swordImpactTimer--;
    if (this.cannonCooldown > 0) this.cannonCooldown--;
    if (this.cycloneCooldown > 0) this.cycloneCooldown--;

    // ── Sword Hit-Pause Active (Freezes attacker & targets in impact stasis - Rule 30) ──
    if (this.swordHitPauseTimer > 0) {
      this.swordHitPauseTimer--;
      this.vx = 0;
      this.vy = 0;

      // Jitter tremor against collision resistance
      this.swordTremorX = (Math.random() - 0.5) * 2.6;
      this.swordTremorY = (Math.random() - 0.5) * 2.6;

      for (const tgt of (this.swordHitPauseTargets || [])) {
        if (!tgt || tgt.hp <= 0 || tgt.isDead) continue;
        tgt.vx = 0;
        tgt.vy = 0;
        if (typeof tgt.applyTimeStop === 'function') {
          tgt.applyTimeStop(this.swordHitPauseTimer);
        }
        tgt.suppressFreezeOverlay = true;
      }

      if (this.swordHitPauseTimer === 0) {
        this._resolveSwordUnpause();
      }
      return;
    }

    // Poise Regeneration
    if (this.poise < this.maxPoise) {
      this.poise = Math.min(this.maxPoise, this.poise + (gutsConfig.poiseRegenRate || 1.5));
    }

    // Berserker Armor State Tick
    if (this.isBerserkerActive) {
      this.berserkerTimer--;
      if (this.berserkerTimer <= 0) {
        this.isBerserkerActive = false;
        spawnFloatingText(this.x, this.y - this.r - 20, 'BERSERKER EXHAUSTION', '#71717a');
      }
    }

    // Cyclone Cleave Tick
    if (this.cycloneActive) {
      this.cycloneTimer--;
      this._updateCycloneCleave(opponent);
      if (this.cycloneTimer <= 0) {
        this.cycloneActive = false;
      }
    }

    // Update Knight-Standard Sword Swing
    if (this.swipeActive) {
      this._updateSwordSwing(opponent, arena);
    }

    // AI Decision Matrix
    if (opponent && !this.swipeActive && !this.cycloneActive) {
      const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      const cfg = gutsConfig;

      const canBerserk = cfg.enableBerserkerArmor !== false && cfg.enableBerserker !== false && cfg.enableUltimate !== false;
      const canCyclone = cfg.enableCyclone !== false && cfg.enableIronCyclone !== false && cfg.enableSkill2 !== false;
      const canCannon = cfg.enableArmCannon !== false && cfg.enableCannon !== false && cfg.enableSkill1 !== false;

      // Berserker Armor Auto-Cast on Max Od or Readied Cooldown
      if (canBerserk && (this.odGauge >= 100 || this.berserkerCooldown <= 0) && !this.isBerserkerActive && dist < 240) {
        this._castBerserkerArmor(opponent);
      }
      // Cyclone Cleave in close multi-target range
      else if (canCyclone && this.cycloneCooldown <= 0 && dist < 110) {
        this._castCycloneCleave(opponent);
      }
      // Wrist Cannon / Repeating Crossbow
      else if (canCannon && this.cannonCooldown <= 0) {
        this._castArmCannon(opponent);
      }
      // Dragon Slayer Sword Swing (Knight Standard)
      else {
        this._trySwordSwipe(opponent, ownerIndex);
      }
    }

    // Movement & Speed Tuning
    let speedMult = 1.0;
    if (this.isBerserkerActive) speedMult *= gutsConfig.berserkerSpeedMultiplier || 1.40;
    if (this.deathGateBuffTimer > 0) speedMult *= gutsConfig.deathGateSpeedBuff || 1.35;

    // Velocity Clamping during Impact Lock (Rule 30)
    if (this.swipeActive) {
      const elapsed = (this.swordSwingMax || 28) - this.swordSwingTimer;
      const strikeEnd = (this.swordSwingLiftFrames || 7) + (this.swordSwingHoldFrames || 2) + (this.swordSwingStrikeFrames || 5);
      const pinEnd = strikeEnd + (this.swordSwingImpactLockFrames || 6);
      if (elapsed >= strikeEnd && elapsed < pinEnd) {
        this.vx = 0;
        this.vy = 0;
      }
    }

    super.update(opponent, ownerIndex, arena);

    // Firmly lock gunAngle to committed attack angle during melee combo (Rule 1.4)
    if (this.swipeActive && this.committedAttackAngle !== undefined) {
      this.gunAngle = this.committedAttackAngle;
      this.angle = this.committedAttackAngle;
    }
  }

  _startMeleeCombo(opponent) {
    this._trySwordSwipe(opponent);
  }

  /**
   * Calculates dynamic melee blade reach based directly on the Dragon Slayer's physical model size.
   * Derives reach from base blade length (85px) and active Weapon Studio custom scaling (scale * lengthScale).
   * @returns {number} Physical reach from hilt to blade tip in pixels.
   */
  getWeaponReach() {
    const custom = (typeof state !== 'undefined' && state.weaponCustomizations?.guts) || {};
    const scale = custom.scale !== undefined ? custom.scale : 1.0;
    const lengthScale = custom.lengthScale !== undefined ? custom.lengthScale : 1.0;
    const baseLength = gutsConfig.baseBladeLength || 85.0;
    return baseLength * scale * lengthScale;
  }

  // ── 2 Combo Hit Attack Pattern (Matching User Diagram) ──
  // Hit 1: Heavy swing up (Half-full angle: 210 deg from down-left through bottom to up-right)
  // Hit 2: Reverse (210 deg from up-right through bottom back to down-left)
  _trySwordSwipe(opponent, ownerIndex = 0) {
    const cfg = gutsConfig;
    const canSword = cfg.enableDragonSlayer !== false && cfg.enableSword !== false && cfg.enableMeleeCombo !== false;
    if (!canSword) return;
    if (this.swipeCooldown > 0 || this.isCaughtInBeam() || this.swordSwingTimer > 0 || this.swordHitPauseTimer > 0 || this.cycloneActive) return;

    const reach = this.getWeaponReach();
    const target = this._findBestMeleeTarget(opponent, reach);
    if (!target) return;

    // Start with Hit 1: Heavy swing up (Half-full angle)
    this.swordComboStep = 1;

    const liftF = cfg.hit1LiftFrames ?? 7;
    const holdF = cfg.hit1HoldFrames ?? 2;
    const strikeF = cfg.hit1StrikeFrames ?? 5;
    const pinF = cfg.hit1ImpactLockFrames ?? 6;
    const recF = cfg.hit1RecoveryFrames ?? 10;
    let dmg = cfg.hit1Damage ?? 38;
    let lunge = cfg.hit1LungeSpeed ?? 6.5;
    const kb = cfg.hit1Knockback ?? 6.5;
    const hitPause = cfg.hit1HitPauseFrames ?? 7;
    const hitStun = cfg.hit1HitStunFrames ?? 11;

    if (this.isBerserkerActive) {
      dmg *= cfg.berserkerDamageMultiplier || 1.25;
      lunge *= 1.15;
    }

    const totalFrames = liftF + holdF + strikeF + pinF + recF;
    this.swordSwingTimer = totalFrames;
    this.swordSwingMax = totalFrames;
    this.swordSwingLiftFrames = liftF;
    this.swordSwingHoldFrames = holdF;
    this.swordSwingStrikeFrames = strikeF;
    this.swordSwingImpactLockFrames = pinF;
    this.swordSwingRecFrames = recF;
    this.swordSwingDamage = dmg;
    this.swordSwingKnockback = kb;
    this.swordSwingLunge = lunge;
    this.swordSwingHitPause = hitPause;
    this.swordSwingHitStun = hitStun;

    this.swipeActive = true;
    this.swipeTimer = totalFrames;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const aimAngle = Math.atan2(dy, dx);
    this.committedAttackAngle = aimAngle;
    this.swordSlashAngle = aimAngle;
    this.gunAngle = aimAngle;
    this.angle = aimAngle;
    this.swordSwingTarget = target;
    this.comboResetTimer = cfg.comboResetFrames ?? 90;

    // Cooldown reserves window for Hit 1 + Hit 2 sequence plus basic attack cooldown
    const hit2Total = (cfg.hit2LiftFrames ?? 6) + (cfg.hit2HoldFrames ?? 2) + (cfg.hit2StrikeFrames ?? 5) + (cfg.hit2ImpactLockFrames ?? 7) + (cfg.hit2RecoveryFrames ?? 12);
    this.swipeCooldown = totalFrames + hit2Total + (cfg.swipeCooldown ?? 36);
    this.swordHitDelivered = false;
    this.swordSwingSoundPlayed = false;
    this.swordTremorX = 0;
    this.swordTremorY = 0;

    // Anticipation flutter sound
    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('dash1', 0.40);
      }
    } catch (e) {}
  }

  /**
   * Chains immediately from Hit 1 into Hit 2: Reverse Cleave (Top-Right -> Bottom -> Down-Left back to Combat Stance).
   */
  _startSwordHit2(opponent) {
    const cfg = gutsConfig;
    this.swordComboStep = 2;

    const liftF = cfg.hit2LiftFrames ?? 6;
    const holdF = cfg.hit2HoldFrames ?? 2;
    const strikeF = cfg.hit2StrikeFrames ?? 5;
    const pinF = cfg.hit2ImpactLockFrames ?? 7;
    const recF = cfg.hit2RecoveryFrames ?? 12;
    let dmg = cfg.hit2Damage ?? 48;
    let lunge = cfg.hit2LungeSpeed ?? 7.5;
    const kb = cfg.hit2Knockback ?? 8.5;
    const hitPause = cfg.hit2HitPauseFrames ?? 9;
    const hitStun = cfg.hit2HitStunFrames ?? 15;

    if (this.isBerserkerActive) {
      dmg *= cfg.berserkerDamageMultiplier || 1.25;
      lunge *= 1.15;
    }

    const totalFrames = liftF + holdF + strikeF + pinF + recF;
    this.swordSwingTimer = totalFrames;
    this.swordSwingMax = totalFrames;
    this.swordSwingLiftFrames = liftF;
    this.swordSwingHoldFrames = holdF;
    this.swordSwingStrikeFrames = strikeF;
    this.swordSwingImpactLockFrames = pinF;
    this.swordSwingRecFrames = recF;
    this.swordSwingDamage = dmg;
    this.swordSwingKnockback = kb;
    this.swordSwingLunge = lunge;
    this.swordSwingHitPause = hitPause;
    this.swordSwingHitStun = hitStun;

    this.swipeActive = true;
    this.swipeTimer = totalFrames;
    this.swordHitDelivered = false;
    this.swordSwingSoundPlayed = false;
    this.swordTremorX = 0;
    this.swordTremorY = 0;

    // Maintain committed combat aim angle across both combo hits (Rule 1.4 - zero auto-snap between hits)
    if (this.committedAttackAngle === undefined) {
      const target = (this.swordSwingTarget && !this.swordSwingTarget.isDead && this.swordSwingTarget.hp > 0)
        ? this.swordSwingTarget
        : (opponent && !opponent.isDead && opponent.hp > 0 ? opponent : null);
      if (target) {
        this.committedAttackAngle = Math.atan2(target.y - this.y, target.x - this.x);
      } else {
        this.committedAttackAngle = this.gunAngle || this.angle || 0;
      }
    }
    this.swordSlashAngle = this.committedAttackAngle;
    this.gunAngle = this.committedAttackAngle;
    this.angle = this.committedAttackAngle;
  }

  /**
   * Updates 5-phase sword swing lifecycle, forward lunge physics, impact lock, and layered slap audio.
   */
  _updateSwordSwing(opponent, arena) {
    if (this.swordSwingTimer <= 0) return;

    const totalF = this.swordSwingMax || 30;
    const elapsed = totalF - this.swordSwingTimer;
    const liftF = this.swordSwingLiftFrames || 7;
    const holdF = this.swordSwingHoldFrames || 2;
    const strikeF = this.swordSwingStrikeFrames || 5;
    const pinF = this.swordSwingImpactLockFrames || 6;
    const recF = this.swordSwingRecFrames || 10;

    const strikeStart = liftF + holdF;
    const strikeEnd = strikeStart + strikeF;
    const pinEnd = strikeEnd + pinF;

    if (elapsed < strikeStart) {
      // Phase 1 & 2: Anticipation Coil & Poised Hold
      if (this.committedAttackAngle !== undefined) {
        this.swordSlashAngle = this.committedAttackAngle;
        this.gunAngle = this.committedAttackAngle;
        this.angle = this.committedAttackAngle;
      }
      this.vx *= 0.88;
      this.vy *= 0.88;
    } else if (elapsed < strikeEnd) {
      // Phase 3: Hypersonic Whip Strike Window
      const strikeElapsed = elapsed - strikeStart;
      const strikeP = strikeElapsed / Math.max(1, strikeF);

      if (!this.swordSwingSoundPlayed) {
        this.swordSwingSoundPlayed = true;
        try {
          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            audioSystem.playSFX('swordswing', 0.95);
          }
        } catch (e) {}
        // Physical screen rumble on swing (displacing massive air!)
        triggerGlobalScreenShake(2.5, 4);
      }

      // Forward lunging momentum impulse
      const lungeP = Math.sin(strikeP * Math.PI);
      this.vx = Math.cos(this.swordSlashAngle) * this.swordSwingLunge * lungeP;
      this.vy = Math.sin(this.swordSlashAngle) * this.swordSwingLunge * lungeP;

      // Deliver impact at mid-strike (strikeP >= 0.50)
      if (strikeP >= 0.50 && !this.swordHitDelivered) {
        this.swordHitDelivered = true;
        const weaponReach = this.getWeaponReach();
        const reach = this.r + weaponReach + 12;
        const arc = (this.swordComboStep === 1) ? ((140 * Math.PI) / 180) : ((150 * Math.PI) / 180);
        let targets = this._getTargetsInFrontalArc(reach, arc);

        if (targets.length === 0) {
          const fallback = (this.swordSwingTarget && !this.swordSwingTarget.isDead && this.swordSwingTarget.hp > 0)
            ? this.swordSwingTarget
            : (opponent && !opponent.isDead && opponent.hp > 0 ? opponent : null);
          if (fallback) {
            const dx = fallback.x - this.x;
            const dy = fallback.y - this.y;
            const maxDist = this.r + (fallback.r || 25) + weaponReach;
            if ((dx * dx + dy * dy) <= (maxDist * 1.35) * (maxDist * 1.35)) {
              targets = [fallback];
            }
          }
        }

        if (targets.length > 0) {
          // ENTER SWORD HIT-PAUSE!
          const pauseFrames = this.swordSwingHitPause || (this.swordComboStep === 2 ? 9 : 7);
          this.swordHitPauseTimer = pauseFrames;
          this.swordHitPauseMax = pauseFrames;
          this.swordHitPauseTargets = targets;
          this.swordHitPauseAngle = this.swordSlashAngle;
          this.vx = 0;
          this.vy = 0;

          // Blade impact spark point at blade tip (Rule 26)
          this.swordImpactX = this.x + Math.cos(this.swordSlashAngle) * (this.r + weaponReach);
          this.swordImpactY = this.y + Math.sin(this.swordSlashAngle) * (this.r + weaponReach);
          this.swordImpactTimer = 14;

          const cfg = gutsConfig;
          const baseDmg = this.swordSwingDamage;
          const trueDmg = Math.round(baseDmg * 0.25);
          const physicalDmg = Math.round(baseDmg * 0.75);

          for (const tgt of targets) {
            tgt.takeDamage(physicalDmg + trueDmg, this, { isMelee: true });
            tgt.vx = 0;
            tgt.vy = 0;
            if (typeof tgt.applyTimeStop === 'function') {
              tgt.applyTimeStop(pauseFrames);
            }
            tgt.suppressFreezeOverlay = true;
          }

          // Berserker Armor Vampirism (Rule 27: Healthbar-only feedback)
          if (this.isBerserkerActive) {
            const healAmount = Math.round(baseDmg * (cfg.berserkerLifestealRate || 0.35));
            this.hp = Math.min(this.maxHp, this.hp + healAmount);
            this._lastHealAmount = (this._lastHealAmount || 0) + healAmount;
            this._healthBarHealTimer = 16;
          }

          // Charge Od Gauge (Passive 2: Brand of Sacrifice & Od Meter)
          const canOd = cfg.enableBrandOfSacrifice !== false && cfg.enableOdMeter !== false;
          if (canOd) {
            this.odGauge = Math.min(this.maxOdGauge, this.odGauge + baseDmg * (cfg.odChargePerDamageDealt || 0.10));
          }

          // Rule 30: Layered fleshy slap audio
          try {
            if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
              audioSystem.playSFX('fleshhit', 1.0);
              audioSystem.playSFX('Sukuna-slice', 0.90);
              if (this.swordComboStep === 2) {
                audioSystem.playSFX('heavypunch1', 0.85);
              }
            }
          } catch (e) {}

          triggerGlobalScreenShake(this.swordComboStep === 2 ? 6 : 4, 8);
          return;
        }
      }
    } else if (elapsed < pinEnd) {
      // Phase 4: THE IMPACT LOCK (Rule 30)
      this.vx = 0;
      this.vy = 0;
      this.swordTremorX = (Math.random() - 0.5) * 2.8;
      this.swordTremorY = (Math.random() - 0.5) * 2.8;
    } else {
      // Phase 5: Extraction & Elastic Recoil Kickback on Guts' Body!
      const recElapsed = elapsed - pinEnd;
      const rp = recElapsed / Math.max(1, recF);
      const recoilKick = (1 - rp) * 2.6;
      this.vx -= Math.cos(this.swordSlashAngle) * recoilKick;
      this.vy -= Math.sin(this.swordSlashAngle) * recoilKick;
      this.swordTremorX = 0;
      this.swordTremorY = 0;
    }

    this.swordSwingTimer--;
    this.swipeTimer = this.swordSwingTimer;
    if (this.swordSwingTimer <= 0) {
      if (this.swordComboStep === 1) {
        this._startSwordHit2(opponent);
      } else {
        this.swipeActive = false;
        this.swordComboStep = 1;
        this.swordSwingTarget = null;
        this.committedAttackAngle = undefined;
        this.swipeCooldown = gutsConfig.swipeCooldown ?? 36;
      }
    }
  }

  _resolveSwordUnpause() {
    const kbAngle = this.swordHitPauseAngle || this.swordSlashAngle;
    const isStep2 = (this.swordComboStep === 2);

    for (const tgt of (this.swordHitPauseTargets || [])) {
      if (!tgt || tgt.hp <= 0 || tgt.isDead) continue;
      tgt.suppressFreezeOverlay = false;
      tgt.timeStopTimer = 0; // Release stasis so knockback takes effect

      tgt.vx += Math.cos(kbAngle) * this.swordSwingKnockback;
      tgt.vy += Math.sin(kbAngle) * this.swordSwingKnockback;
      if (isStep2) {
        tgt.vy -= 2.5; // Uppercut loft
      }

      if (typeof tgt.applyHitStun === 'function') {
        tgt.applyHitStun(this.swordSwingHitStun);
      }
    }

    if (isStep2) {
      try {
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('heavypunch1', 0.90);
        }
      } catch (e) {}
    }
    triggerGlobalScreenShake(isStep2 ? 8 : 5, 8);
    this.swordTremorX = 0;
    this.swordTremorY = 0;
    this.swordHitPauseTargets = [];
  }

  /**
   * Computes exact sword blade angle based on 5-phase kinetic recoil lifecycle with damped spring oscillation.
   */
  _getSwordSwingAngle() {
    const cfg = gutsConfig || {};
    const startAngle = cfg.battleStanceStartAngle ?? (cfg.battleStanceAngle ?? 2.97); // ~170 deg (down-left)
    const apexAngle = cfg.battleStanceApexAngle ?? -0.70; // ~ -40 deg (up-right)
    const sweepArc = cfg.battleStanceSweepArc ?? (210 * Math.PI / 180); // 210 deg (3.67 rad)

    if (!this.swipeActive || this.swordSwingTimer <= 0) {
      return startAngle;
    }

    const totalF = this.swordSwingMax || 30;
    const elapsed = Math.max(0, totalF - this.swordSwingTimer);
    const liftF = this.swordSwingLiftFrames || 7;
    const holdF = this.swordSwingHoldFrames || 2;
    const strikeF = this.swordSwingStrikeFrames || 5;
    const pinF = this.swordSwingImpactLockFrames || 6;
    const recF = this.swordSwingRecFrames || 10;

    const strikeStart = liftF + holdF;
    const strikeEnd = strikeStart + strikeF;
    const pinEnd = strikeEnd + pinF;

    if (this.swordComboStep === 1) {
      // Hit 1: Heavy swing up (down-left -> up-right)
      if (elapsed < liftF) {
        // Phase 1: Coil / Windup - hands and sword pull back into tension
        const wp = elapsed / Math.max(1, liftF);
        return startAngle + 0.25 * Math.sin(wp * Math.PI * 0.5);
      } else if (elapsed < strikeStart) {
        // Phase 2: Poised Hold - maximum potential energy
        return startAngle + 0.25;
      } else if (elapsed < strikeEnd) {
        // Phase 3: Hypersonic Whip Strike - explosive acceleration
        const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
        const ease = Math.pow(sp, 2.5);
        return (startAngle + 0.25) - (sweepArc + 0.25) * ease;
      } else if (elapsed < pinEnd) {
        // Phase 4: Impact Lock - locked at apex plane
        return apexAngle;
      } else {
        // Phase 5: Extraction & Spring Recoil Settle (The recoil!)
        const rp = (elapsed - pinEnd) / Math.max(1, recF);
        const springWave = Math.sin(rp * Math.PI * 2.2) * Math.exp(-rp * 4.2);
        const settleEase = Math.pow(1 - rp, 1.8);
        return apexAngle - 0.32 * springWave + (startAngle - apexAngle) * 0.05 * (1 - settleEase);
      }
    } else {
      // Hit 2: Reverse Cleave (up-right -> down-left)
      if (elapsed < liftF) {
        // Phase 1: Coil / Windup - pull back higher up-right
        const wp = elapsed / Math.max(1, liftF);
        return apexAngle - 0.25 * Math.sin(wp * Math.PI * 0.5);
      } else if (elapsed < strikeStart) {
        // Phase 2: Poised Hold
        return apexAngle - 0.25;
      } else if (elapsed < strikeEnd) {
        // Phase 3: Hypersonic Whip Strike - cleaving down
        const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
        const ease = Math.pow(sp, 2.5);
        return (apexAngle - 0.25) + (sweepArc + 0.25) * ease;
      } else if (elapsed < pinEnd) {
        // Phase 4: Impact Lock - slammed into impact plane
        return startAngle;
      } else {
        // Phase 5: Ground Bounce & Spring Recoil Settle
        const rp = (elapsed - pinEnd) / Math.max(1, recF);
        const springWave = Math.sin(rp * Math.PI * 2.2) * Math.exp(-rp * 4.2);
        return startAngle + 0.35 * springWave;
      }
    }
  }

  /**
   * Computes dynamic weapon & hand translation offsets (lunge, offY) for 5-phase physical kinematics.
   * Hands and blade actively drive forward during strike and spring-recoil back upon recovery.
   */
  _getSwordSwingOffsets() {
    if (!this.swipeActive || this.swordSwingTimer <= 0) {
      return { lunge: 0, offY: 0 };
    }

    const totalF = this.swordSwingMax || 30;
    const elapsed = Math.max(0, totalF - this.swordSwingTimer);
    const liftF = this.swordSwingLiftFrames || 7;
    const holdF = this.swordSwingHoldFrames || 2;
    const strikeF = this.swordSwingStrikeFrames || 5;
    const pinF = this.swordSwingImpactLockFrames || 6;
    const recF = this.swordSwingRecFrames || 10;

    const strikeStart = liftF + holdF;
    const strikeEnd = strikeStart + strikeF;
    const pinEnd = strikeEnd + pinF;

    if (this.swordComboStep === 1) {
      if (elapsed < liftF) {
        const wp = elapsed / Math.max(1, liftF);
        const ease = Math.sin(wp * Math.PI * 0.5);
        return { lunge: -12.0 * ease, offY: 4.0 * ease };
      } else if (elapsed < strikeStart) {
        return { lunge: -12.0, offY: 4.0 };
      } else if (elapsed < strikeEnd) {
        const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
        const ease = Math.pow(sp, 2.5);
        return {
          lunge: -12.0 + 38.0 * ease,
          offY: 4.0 - 18.0 * ease
        };
      } else if (elapsed < pinEnd) {
        return { lunge: 26.0, offY: -14.0 };
      } else {
        const rp = (elapsed - pinEnd) / Math.max(1, recF);
        const settleEase = Math.pow(1 - rp, 1.8);
        const springWave = Math.sin(rp * Math.PI * 2.2) * Math.exp(-rp * 4.2);
        return {
          lunge: 26.0 * settleEase - 8.0 * springWave,
          offY: -14.0 * settleEase + 5.0 * springWave
        };
      }
    } else {
      // Hit 2: Reverse downward cleave
      if (elapsed < liftF) {
        const wp = elapsed / Math.max(1, liftF);
        const ease = Math.sin(wp * Math.PI * 0.5);
        return { lunge: -10.0 * ease, offY: -10.0 * ease };
      } else if (elapsed < strikeStart) {
        return { lunge: -10.0, offY: -10.0 };
      } else if (elapsed < strikeEnd) {
        const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
        const ease = Math.pow(sp, 2.5);
        return {
          lunge: -10.0 + 36.0 * ease,
          offY: -10.0 + 24.0 * ease
        };
      } else if (elapsed < pinEnd) {
        return { lunge: 26.0, offY: 14.0 };
      } else {
        const rp = (elapsed - pinEnd) / Math.max(1, recF);
        const settleEase = Math.pow(1 - rp, 1.8);
        const springWave = Math.sin(rp * Math.PI * 2.2) * Math.exp(-rp * 4.2);
        return {
          lunge: 26.0 * settleEase - 8.0 * springWave,
          offY: 14.0 * settleEase - 5.0 * springWave
        };
      }
    }
  }

  _findBestMeleeTarget(opponent, reach) {
    if (opponent && !opponent.isDead && opponent.hp > 0) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      if (Math.hypot(dx, dy) <= reach + (opponent.r || 25) + this.r) {
        return opponent;
      }
    }
    if (typeof state !== 'undefined' && state.fighters) {
      let bestTgt = null;
      let bestDist = Infinity;
      const candidates = [...(state.fighters || []), ...(state.illusions || [])];
      for (const f of candidates) {
        if (!f || f === this || f.isDead || f.hp <= 0) continue;
        if (this.isTeammate && this.isTeammate(f)) continue;
        const d = Math.hypot(f.x - this.x, f.y - this.y);
        if (d <= reach + (f.r || 25) + this.r && d < bestDist) {
          bestDist = d;
          bestTgt = f;
        }
      }
      return bestTgt;
    }
    return null;
  }

  _getTargetsInFrontalArc(reach, arcAngle) {
    const targets = [];
    const allEnemies = [
      ...(typeof state !== 'undefined' && state.fighters ? state.fighters : []),
      ...(typeof state !== 'undefined' && state.illusions ? state.illusions : [])
    ];
    for (const enemy of allEnemies) {
      if (!enemy || enemy === this || enemy.hp <= 0 || enemy.isDead) continue;
      if (this.isTeammate && this.isTeammate(enemy)) continue;
      if (enemy.isLawnmower || enemy.isUntargetable || enemy.untargetable || enemy.cannotBeTargeted || enemy.isTargetable === false) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= reach + (enemy.r || 25)) {
        const angleToEnemy = Math.atan2(dy, dx);
        let diff = Math.abs(angleToEnemy - this.swordSlashAngle);
        while (diff > Math.PI) diff -= Math.PI * 2;
        diff = Math.abs(diff);
        if (diff <= arcAngle / 2) {
          targets.push(enemy);
        }
      }
    }
    return targets;
  }

  _castArmCannon(opponent) {
    if (!opponent) return;
    const cfg = gutsConfig;
    const canCannon = cfg.enableArmCannon !== false && cfg.enableCannon !== false && cfg.enableSkill1 !== false;
    if (!canCannon) return;

    this.cannonCooldown = this.cannonCooldownMax;

    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const dist = Math.hypot(dx, dy);
    const aim = Math.atan2(dy, dx);
    this.gunAngle = aim;

    if (dist <= 60) {
      // Point-Blank Zero-Range Wrist Cannon Blast
      const dmg = gutsConfig.cannonSweetSpotDamage || 135;
      opponent.takeDamage(dmg, this, 'explosion');
      opponent.vx += Math.cos(aim) * 16.0;
      opponent.vy += Math.sin(aim) * 16.0;

      // Heavy backward recoil impulse on Guts
      this.vx -= Math.cos(aim) * (gutsConfig.cannonRecoil || 12.0);
      this.vy -= Math.sin(aim) * (gutsConfig.cannonRecoil || 12.0);

      spawnFloatingText(this.x, this.y - this.r - 20, 'ZERO-RANGE BLAST!', '#f59e0b');
      triggerGlobalScreenShake(8, 14);
      audioSystem.playSFX('explosion', 1.0);
      audioSystem.playSFX('shootgunshot', 0.95);
    } else {
      // Repeating Crossbow Barrage (5 Piercing Bolts)
      const boltCount = gutsConfig.crossbowBolts || 5;
      const boltDmg = gutsConfig.crossbowBoltDamage || 12;

      for (let i = 0; i < boltCount; i++) {
        setTimeout(() => {
          if (!this.hp || this.hp <= 0) return;
          const spread = (Math.random() - 0.5) * 0.22;
          const boltAngle = (this.gunAngle || aim) + spread;
          if (projectileSystem && projectileSystem.fireBasicBullet) {
            projectileSystem.fireBasicBullet(this, 0, boltDmg, {
              angle: boltAngle,
              speed: gutsConfig.crossbowBoltSpeed || 16.0,
              color: '#94a3b8'
            });
          }
          audioSystem.playSFX('spikestab', 0.75);
        }, i * 65);
      }
      spawnFloatingText(this.x, this.y - this.r - 18, 'CROSSBOW VOLLEY', '#cbd5e1');
    }
  }

  _castCycloneCleave(opponent) {
    const cfg = gutsConfig;
    const canCyclone = cfg.enableCyclone !== false && cfg.enableIronCyclone !== false && cfg.enableSkill2 !== false;
    if (!canCyclone) return;

    this.cycloneCooldown = this.cycloneCooldownMax;
    this.cycloneActive = true;
    this.cycloneTimer = gutsConfig.cycloneDuration || 30;

    spawnFloatingText(this.x, this.y - this.r - 20, 'CYCLONE CLEAVE!', '#71717a');
    triggerGlobalScreenShake(4, 10);
    audioSystem.playSFX('spinslash', 1.0);
  }

  _updateCycloneCleave(opponent) {
    if (!opponent) return;

    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const dist = Math.hypot(dx, dy);
    const reach = gutsConfig.cycloneReach || 92;

    if (dist <= reach + opponent.r) {
      // Centrifugal vacuum pull
      const pullForce = gutsConfig.cycloneVacuumPullForce || 3.5;
      const pullAngle = Math.atan2(this.y - opponent.y, this.x - opponent.x);
      opponent.vx += Math.cos(pullAngle) * pullForce * 0.2;
      opponent.vy += Math.sin(pullAngle) * pullForce * 0.2;

      // Cleave damage tick every 8 frames
      if (this.cycloneTimer % 8 === 0) {
        opponent.takeDamage(gutsConfig.cycloneDamage || 40, this, 'blade');
        audioSystem.playSFX('fleshhit', 0.85);
        audioSystem.playSFX('swordswing', 0.85);
      }
    }
  }

  _castBerserkerArmor(opponent) {
    const cfg = gutsConfig;
    const canBerserk = cfg.enableBerserkerArmor !== false && cfg.enableBerserker !== false && cfg.enableUltimate !== false;
    if (!canBerserk) return;

    this.berserkerCooldown = this.berserkerCooldownMax;
    this.isBerserkerActive = true;
    this.berserkerTimer = gutsConfig.berserkerDuration || 600;
    this.odGauge = 0;

    spawnFloatingText(this.x, this.y - this.r - 25, 'BERSERKER ARMOR AWAKENED!', '#dc2626');
    triggerGlobalScreenShake(10, 20);
    audioSystem.playSFX('ragescream', 1.0);

    // Repel surrounding entities with dark od eruption
    if (opponent) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 140) {
        const pushAngle = Math.atan2(dy, dx);
        opponent.vx += Math.cos(pushAngle) * 12.0;
        opponent.vy += Math.sin(pushAngle) * 12.0;
        opponent.takeDamage(35, this, 'dark');
      }
    }
  }

  /**
   * Mandatory Rule 21: Draw method calling health & freeze timers on top layer.
   */
  draw(ctx, opponent) {
    drawGutsSkin(ctx, this);
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }

  drawBody(ctx) {
    drawGutsSkin(ctx, this);
  }

  drawSkin(ctx) {
    drawGutsSkin(ctx, this);
  }
}
