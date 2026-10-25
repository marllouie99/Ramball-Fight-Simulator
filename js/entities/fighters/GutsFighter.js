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

import { Fighter, isSkillEnabled } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { gutsConfig } from '../../configs/characters/gutsConfig.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { spawnGroundScorch } from '../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { drawGutsSkin } from '../../graphics/fighters/gutsSkin.js';
import { projectileSystem } from '../../systems/projectileSystem.js';

export class GutsFighter extends Fighter {
  constructor(def) {
    super(def);
    const cfg = gutsConfig;

    this.characterId = 'guts';
    this.type = 'guts';
    this.name = def?.name || cfg.name || 'Guts';
    this.displayName = def?.displayName || cfg.displayName || this.name;
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

    // Skill 1: Calamity Cleave Combo (Reference Frames 1–12)
    this.calamityCooldown = 0;
    this.calamityCooldownMax = cfg.calamityCooldownMax || cfg.skill1CooldownMax || 420;
    this.calamityActive = false;
    this.calamitySeq = 1;
    this.calamityTimer = 0;
    this.calamityMax = 0;
    this.calamityHitDelivered = false;
    this.calamityWaveSpawned = false;
    this.calamityHitPauseTimer = 0;
    this.calamityHitPauseMax = 0;
    this.calamityHitPauseTargets = [];
    this.calamityFlashTimer = 0;
    this.calamityFlashSeq = 1;
    this.activeCrescentWaves = [];
    this.activeCalamityEmbers = [];
    this.activeCalamityVortex = [];

    // Skill 2: Prosthetic Arm Cannon & Repeating Crossbow
    this.cannonCooldown = 0;
    this.cannonCooldownMax = cfg.cannonCooldownMax || cfg.skill2CooldownMax || 420;

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
    // Note: calamityTimer & calamityActive lifecycle is managed directly by _updateCalamityCleave
    // across Sequence 1 -> Sequence 2 (just like Toji's multi-phase Ambush) so SkillManager
    // never double-decrements calamityTimer or prematurely terminates Sequence 1.
    this.skillManager.registerSkills([
      {
        id: 'calamityCleave',
        name: 'CALAMITY CLEAVE',
        type: 'attack',
        cooldownKey: 'calamityCooldown',
        cooldownMax: () => this.calamityCooldownMax,
        activeKey: 'calamityActive',
        enabledKey: 'enableSkill1',
        configKey: 'enableSkill1',
        isEnabled: () => this._isCalamityEnabled(),
        color: '#f59e0b',
        onActivate: (fighter, opponent) => {
          fighter._castCalamityCleave(opponent);
        }
      },
      {
        id: 'cannon',
        name: 'WRIST CANNON / BOLTS',
        type: 'basic',
        cooldownKey: 'cannonCooldown',
        cooldownMax: () => this.cannonCooldownMax,
        enabledKey: 'enableArmCannon',
        configKey: 'enableArmCannon',
        isEnabled: () => this._isCannonEnabled(),
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
        isEnabled: () => this._isCycloneEnabled(),
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
        isEnabled: () => this._isBerserkerEnabled(),
        color: '#dc2626',
        onActivate: (fighter, opponent) => {
          fighter._castBerserkerArmor(opponent);
        }
      }
    ]);
  }


  /**
   * Resolves skill toggles respecting instance overrides, runtime CONFIG, and static gutsConfig.
   * If ANY key in the active scope is explicitly disabled (false, 0, '0', 'false', 'off', 'disabled'), returns false!
   * @param {string[]} keys
   * @returns {boolean}
   */
  _resolveToggle(keys) {
    for (const k of keys) {
      if (this[k] !== undefined && this[k] !== null) {
        if (!isSkillEnabled(this[k], true)) return false;
      }
    }
    for (const k of keys) {
      if (this[k] !== undefined && this[k] !== null) {
        if (isSkillEnabled(this[k], true)) return true;
      }
    }

    const runtimeCfg = (typeof CONFIG !== 'undefined' && (CONFIG.guts || CONFIG.Guts)) ? (CONFIG.guts || CONFIG.Guts) : null;
    if (runtimeCfg) {
      for (const k of keys) {
        if (runtimeCfg[k] !== undefined && runtimeCfg[k] !== null) {
          if (!isSkillEnabled(runtimeCfg[k], true)) return false;
        }
      }
      for (const k of keys) {
        if (runtimeCfg[k] !== undefined && runtimeCfg[k] !== null) {
          if (isSkillEnabled(runtimeCfg[k], true)) return true;
        }
      }
    }

    if (typeof gutsConfig !== 'undefined' && gutsConfig) {
      for (const k of keys) {
        if (gutsConfig[k] !== undefined && gutsConfig[k] !== null) {
          if (!isSkillEnabled(gutsConfig[k], true)) return false;
        }
      }
      for (const k of keys) {
        if (gutsConfig[k] !== undefined && gutsConfig[k] !== null) {
          if (isSkillEnabled(gutsConfig[k], true)) return true;
        }
      }
    }

    return true;
  }

  _isCalamityEnabled() {
    return this._resolveToggle(['enableSkill1', 'enableCalamityCleave']);
  }

  _isBasicAttackEnabled() {
    return this._resolveToggle(['enableDragonSlayer', 'enableSword', 'enableMeleeCombo', 'enableBasicAttack']);
  }

  _isCannonEnabled() {
    return this._resolveToggle(['enableArmCannon', 'enableCannon', 'enableSkill1']);
  }

  _isCycloneEnabled() {
    return this._resolveToggle(['enableCyclone', 'enableIronCyclone', 'enableSkill2']);
  }

  _isBerserkerEnabled() {
    return this._resolveToggle(['enableBerserkerArmor', 'enableBerserker', 'enableUltimate']);
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

    this.calamityActive = false;
    this.calamitySeq = 1;
    this.calamityTimer = 0;
    this.calamityMax = 0;
    this.calamityHitDelivered = false;
    this.calamityWaveSpawned = false;
    this.calamityHitPauseTimer = 0;
    this.calamityFlashTimer = 0;
    this.calamityFlashSeq = 1;
    if (this.activeCrescentWaves) this.activeCrescentWaves.length = 0;
    if (this.activeCalamityEmbers) this.activeCalamityEmbers.length = 0;
    if (this.activeCalamityVortex) this.activeCalamityVortex.length = 0;

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
    this.calamityActive = false;
    this.calamitySeq = 1;
    this.calamityTimer = 0;
    this.calamityHitPauseTimer = 0;
    this.calamityHitPauseTargets = [];
    this.calamityFlashTimer = 0;
    this.calamityFlashSeq = 1;
    if (this.activeCalamityVortex) this.activeCalamityVortex.length = 0;
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
    if (this.swipeActive || this.swordSwingTimer > 0 || this.swordHitPauseTimer > 0 || this.cycloneActive || this.calamityActive || this.calamityHitPauseTimer > 0) {
      return false;
    }
    return super.canAim();
  }

  /**
   * Enforces committed attack angle lock during 2-hit melee combo (Rule 1.4 & Rule 30).
   * Prevents body/gunAngle from snapping to opponent movement during attack animations.
   */
  aim(opponent) {
    if (this.swipeActive || this.swordSwingTimer > 0 || this.swordHitPauseTimer > 0 || this.cycloneActive || this.calamityActive || this.calamityHitPauseTimer > 0) {
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
    this._updateCrescentWaves(arena);
    this._updateCalamityEmbers();
    this._updateCalamityVortex();
    if (this.calamityFlashTimer > 0) this.calamityFlashTimer--;

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

    // ── Calamity Cleave Hit-Pause (Frame 4–5 Impact Stasis) ──
    if (this.calamityHitPauseTimer > 0) {
      this.calamityHitPauseTimer--;
      this.vx = 0;
      this.vy = 0;
      this.swordTremorX = 0;
      this.swordTremorY = 0;

      for (const tgt of (this.calamityHitPauseTargets || [])) {
        if (!tgt || tgt.hp <= 0 || tgt.isDead) continue;
        tgt.vx = 0;
        tgt.vy = 0;
        if (typeof tgt.applyTimeStop === 'function') {
          tgt.applyTimeStop(this.calamityHitPauseTimer);
        }
        tgt.suppressFreezeOverlay = true;
      }

      if (this.calamityHitPauseTimer === 0) {
        this._resolveCalamityUnpause();
      }
      return;
    }

    // Cooldown ticks
    if (this.calamityCooldown > 0 && !this.calamityActive) this.calamityCooldown--;
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
      this.swordTremorX = 0;
      this.swordTremorY = 0;

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

    // Update Calamity Cleave (Skill 1)
    if (this.calamityActive) {
      this._updateCalamityCleave(opponent, arena);
    }

    // AI Decision Matrix
    if (opponent && !this.swipeActive && !this.cycloneActive && !this.calamityActive) {
      const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      const cfg = gutsConfig;

      const canBerserk = this._isBerserkerEnabled();
      const canCalamity = this._isCalamityEnabled();
      const canCyclone = this._isCycloneEnabled();
      const canCannon = this._isCannonEnabled();
      const canBasicAttack = this._isBasicAttackEnabled();

      // Berserker Armor Auto-Cast on Max Od or Readied Cooldown
      if (canBerserk && (this.odGauge >= 100 || this.berserkerCooldown <= 0) && !this.isBerserkerActive && dist < 240) {
        this._castBerserkerArmor(opponent);
      }
      // Skill 1: Calamity Cleave & Supersonic Crescent Wave (Reference Frames 1–6)
      else if (canCalamity && this.calamityCooldown <= 0 && dist < 260) {
        this._castCalamityCleave(opponent);
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
      else if (canBasicAttack) {
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
    if (this.calamityActive) {
      const cfg = gutsConfig;
      const isSeq2 = (this.calamitySeq === 2);
      const windupF = isSeq2 ? (cfg.calamitySeq2WindupFrames || 18) : (cfg.calamityWindupFrames || 28);
      const strikeF = isSeq2 ? (cfg.calamitySeq2StrikeFrames || 11) : (cfg.calamityStrikeFrames || 9);
      const lockF = isSeq2 ? (cfg.calamitySeq2LockFrames || 18) : (cfg.calamityLockFrames || 18);
      const elapsed = (this.calamityMax || 79) - this.calamityTimer;
      if (elapsed >= (windupF + strikeF) && elapsed < (windupF + strikeF + lockF)) {
        this.vx = 0;
        this.vy = 0;
      }
    }

    super.update(opponent, ownerIndex, arena);

    // Firmly lock gunAngle to committed attack angle during attacks (Rule 1.4)
    if ((this.swipeActive || this.calamityActive) && this.committedAttackAngle !== undefined) {
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
    if (!this._isBasicAttackEnabled()) return;
    if (this.swipeCooldown > 0 || this.isCaughtInBeam() || this.swordSwingTimer > 0 || this.swordHitPauseTimer > 0 || this.cycloneActive || this.calamityActive) return;

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
   * Chains immediately from Hit 1 into Hit 2: Heavy Downward Launching Cleave (Overhead Top-Left -> Sky Apex -> Downward Forward Ground Slam).
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
    let lunge = cfg.hit2LungeSpeed ?? 8.0;
    const kb = cfg.hit2Knockback ?? 10.5;
    const hitPause = cfg.hit2HitPauseFrames ?? 9;
    const hitStun = cfg.hit2HitStunFrames ?? 16;

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
      }

      // Forward lunging momentum impulse (clamped when already in close contact to prevent body-collision bounce shaking)
      const distToOpp = opponent ? Math.hypot(opponent.x - this.x, opponent.y - this.y) : 999;
      const minContactGap = this.r + (opponent?.r || 25) + 28;
      if (distToOpp > minContactGap) {
        const lungeP = Math.sin(strikeP * Math.PI);
        const gapScale = Math.min(1, (distToOpp - minContactGap) / 40);
        this.vx = Math.cos(this.swordSlashAngle) * this.swordSwingLunge * lungeP * gapScale;
        this.vy = Math.sin(this.swordSlashAngle) * this.swordSwingLunge * lungeP * gapScale;
      } else {
        this.vx = 0;
        this.vy = 0;
      }

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

          // Ground scorch fissure and combat floating text
          if (this.swordComboStep === 2) {
            spawnGroundScorch(this.swordImpactX, this.swordImpactY, 35);
            spawnFloatingText(this.x, this.y - this.r - 20, 'DOWNWARD LAUNCHING CLEAVE!', this.isBerserkerActive ? '#ef4444' : '#dc2626');
          } else {
            spawnFloatingText(this.x, this.y - this.r - 20, 'HEAVY RISING CLEAVE!', this.isBerserkerActive ? '#ef4444' : '#71717a');
          }

          return;
        }
      }
    } else if (elapsed < pinEnd) {
      // Phase 4: THE IMPACT LOCK (Rule 30)
      this.vx = 0;
      this.vy = 0;
      this.swordTremorX = 0;
      this.swordTremorY = 0;
    } else {
      // Phase 5: Smooth Recovery Damping (Zero backward recoil shaking)
      this.vx *= 0.85;
      this.vy *= 0.85;
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
        tgt.vy -= (gutsConfig.hit2LaunchImpulse ?? 6.0); // Heavy downward smash rebound loft!
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
    this.swordTremorX = 0;
    this.swordTremorY = 0;
    this.swordHitPauseTargets = [];
  }

  /**
   * Computes exact sword blade angle based on 5-phase kinetic recoil lifecycle with damped spring oscillation.
   */
  _getSwordSwingAngle() {
    const cfg = gutsConfig || {};
    const startAngle = cfg.battleStanceStartAngle ?? (cfg.battleStanceAngle ?? 2.97);
    const apexAngle = cfg.battleStanceApexAngle ?? -0.70;
    const sweepArc = cfg.battleStanceSweepArc ?? (210 * Math.PI / 180);

    // Calamity Cleave (Skill 1 Reference Frames 1–12)
    if (this.calamityActive && this.calamityTimer > 0) {
      const sAngle = 2.97;          // Frame 1: Neutral battle stance (~170°)

      // ── Sequence 2: Reverse Cleave & Skyward Scoop (Reference Frames 7–12) ──
      if (this.calamitySeq === 2) {
        const windupF = cfg.calamitySeq2WindupFrames || 18;
        const strikeF = cfg.calamitySeq2StrikeFrames || 11;
        const lockF = cfg.calamitySeq2LockFrames || 18;
        const recF = cfg.calamitySeq2RecoveryFrames || 24;
        const totalF = this.calamityMax || (windupF + strikeF + lockF + recF);
        const elapsed = Math.max(0, totalF - this.calamityTimer);
        const strikeStart = windupF;
        const strikeEnd = strikeStart + strikeF;
        const lockEnd = strikeEnd + lockF;

        const seq2StartAngle = 3.833; // Start directly where Sequence 1 follow-through locked (-2.45 rad + 2π = +3.833 rad)
        const seq2CoilAngle = 3.58;   // Frame 7: High left tension coil (+205° / -155°, sword tip high-left behind shoulder)
        const seq2ScoopLow = 1.15;    // Frame 8 end / Frame 9 start: Lower-front scoop point (+66°)
        const seq2ApexAngle = -0.65;  // Frames 10–11: Skyward high-right apex (-37°)

        // Frame 7: High Left Coil & Tension Load (Smoothly coils directly from Seq 1's -2.45 rad shoulder lock without resetting!)
        if (elapsed < strikeStart) {
          const t = elapsed / Math.max(1, windupF);
          const ease = (1 - Math.cos(t * Math.PI)) * 0.5;
          return seq2StartAngle + (seq2CoilAngle - seq2StartAngle) * ease;
        }

        // Frames 8–9: Blinding Horizontal Counter-Cleave -> Skyward Scoop (11 frames - NOT snappy!)
        if (elapsed < strikeEnd) {
          const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
          if (sp < 0.45) {
            // Frame 8: Counter-cleave sweep from high-left (3.58 rad) across waist to lower-front (1.15 rad)
            const p1 = sp / 0.45;
            const ease1 = Math.pow(p1, 1.8);
            return seq2CoilAngle + (seq2ScoopLow - seq2CoilAngle) * ease1;
          } else {
            // Frame 9: Rising skyward scoop from lower-front (1.15 rad) through 0 rad up into skyward apex (-0.65 rad)
            const p2 = (sp - 0.45) / 0.55;
            const ease2 = Math.pow(p2, 1.6);
            return seq2ScoopLow + (seq2ApexAngle - seq2ScoopLow) * ease2;
          }
        }

        // Frames 10–11: Apex Impact Lock & Poised Hold
        if (elapsed < lockEnd) {
          return seq2ApexAngle;
        }

        // Frame 12: Weighted Settle back to Battle Stance (2.97 rad)
        const rp = (elapsed - lockEnd) / Math.max(1, recF);
        if (rp < 0.30) {
          return seq2ApexAngle;
        }
        const settleP = (rp - 0.30) / 0.70;
        const settleEase = (1 - Math.cos(settleP * Math.PI)) * 0.5;
        return seq2ApexAngle + (sAngle - seq2ApexAngle) * settleEase;
      }

      // ── Sequence 1: Calamity Cleave & Supersonic Crescent Wave (Reference Frames 1–6) ──
      const windupF = cfg.calamityWindupFrames ?? 28;
      const strikeF = cfg.calamityStrikeFrames ?? 9;
      const lockF = cfg.calamityLockFrames ?? 22;
      const recF = cfg.calamityRecoveryFrames ?? 0;
      const totalF = this.calamityMax || (windupF + strikeF + lockF + recF);
      const elapsed = Math.max(0, totalF - this.calamityTimer);
      const strikeStart = windupF;
      const strikeEnd = strikeStart + strikeF;

      // Canonical angles for Sequence 1 (Single monotonic backward coil -> full sweeping cleave, ZERO back-and-forth pre-swing!):
      const coilAngle = 3.32;        // Deep backward coil behind right hip/back (~190°)
      const cleaveApexAngle = -2.45; // Follow-through lock over opposite left shoulder (~ -140°)

      // Phase 1: Monotonic Backward Windup Coil & Poised Hold (Smoothly coils back from 2.97 rad to 3.32 rad)
      if (elapsed < strikeStart) {
        const t = elapsed / Math.max(1, windupF);
        const coilP = Math.min(1.0, t / 0.82); // Last 18% of windup holds poised at peak tension
        const ease = (1 - Math.cos(coilP * Math.PI)) * 0.5;
        return sAngle + (coilAngle - sAngle) * ease;
      }
      // Phase 2: Sweeping Full Cleave Stroke (Smooth continuous rotation over 9 frames from 3.32 rad to -2.45 rad)
      if (elapsed < strikeEnd) {
        const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
        const ease = Math.pow(sp, 1.8);
        return coilAngle + (cleaveApexAngle - coilAngle) * ease;
      }
      // Phase 3: Hold follow-through lock over opposite shoulder (-2.45 rad) with zero angle reset before Sequence 2!
      return cleaveApexAngle;
    }

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
        // Phase 5: Smooth Recovery Settle (Zero spring oscillation shaking)
        const rp = (elapsed - pinEnd) / Math.max(1, recF);
        const settleEase = (1 - Math.cos(rp * Math.PI)) * 0.5;
        return apexAngle + (startAngle - apexAngle) * 0.05 * settleEase;
      }
    } else {
      // Hit 2: Heavy Downward Launching Cleave (Overhead Top-Left -> Sky Apex -> Downward Forward Ground Slam)
      const hit2StartAngle = cfg.hit2StartAngle ?? -2.15; // ~ -123 deg (overhead coiled sword position matching reference diagram)
      const hit2EndAngle = cfg.hit2EndAngle ?? 0.85;       // ~ +49 deg (downward ground cleave impact angle)

      if (elapsed < liftF) {
        // Phase 1: Coil / Hoist Overhead - heave the massive iron sword from apexAngle (-0.70) up and back over head to -2.15
        const wp = elapsed / Math.max(1, liftF);
        const ease = Math.sin(wp * Math.PI * 0.5);
        return apexAngle + (hit2StartAngle - apexAngle) * ease;
      } else if (elapsed < strikeStart) {
        // Phase 2: Poised Overhead Hold - maximum potential energy (matching reference diagram)
        return hit2StartAngle;
      } else if (elapsed < strikeEnd) {
        // Phase 3: Hypersonic Whip Strike - explosive downward cleave over the head into the ground
        const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
        const ease = Math.pow(sp, 2.5);
        return hit2StartAngle + (hit2EndAngle - hit2StartAngle) * ease;
      } else if (elapsed < pinEnd) {
        // Phase 4: THE IMPACT LOCK - slammed and latched in the impact plane
        return hit2EndAngle;
      } else {
        // Phase 5: Smooth Recovery Settle back towards stance (Zero spring oscillation shaking)
        const rp = (elapsed - pinEnd) / Math.max(1, recF);
        const settleEase = (1 - Math.cos(rp * Math.PI)) * 0.5;
        return hit2EndAngle + (startAngle - hit2EndAngle) * settleEase;
      }
    }
  }

  /**
   * Computes smooth, continuous 5-phase muscular arm & hilt force offsets (lunge, offY, leverTorque).
   * Preserves 100% C1 continuity across Sequence 1 -> Sequence 2 and Hit 1 -> Hit 2
   * with zero random jitter or spring oscillation shaking (Rule 30).
   */
  _getSwordSwingOffsets() {
    // ── Skill 1: Calamity Cleave (2-Sequence Combo) ──
    if (this.calamityActive && this.calamityTimer > 0) {
      const cfg = gutsConfig || {};

      // Sequence 2 (Frames 7–12: High-Left Coil -> Counter-Cleave -> Skyward Scoop Finisher)
      if (this.calamitySeq === 2) {
        const windupF = cfg.calamitySeq2WindupFrames || 18;
        const strikeF = cfg.calamitySeq2StrikeFrames || 11;
        const lockF = cfg.calamitySeq2LockFrames || 18;
        const recF = cfg.calamitySeq2RecoveryFrames || 24;
        const totalF = this.calamityMax || (windupF + strikeF + lockF + recF);
        const elapsed = Math.max(0, totalF - this.calamityTimer);
        const strikeStart = windupF;
        const strikeEnd = strikeStart + strikeF;
        const lockEnd = strikeEnd + lockF;

        // Starts seamlessly from Sequence 1's follow-through lock (+22, -6) with zero jump!
        const seq1EndLunge = 22;
        const seq1EndOffY = -6;
        const coilLunge = -13;
        const coilOffY = -14;
        const scoopMidLunge = 16;
        const scoopMidOffY = 11;
        const apexLunge = 26;
        const apexOffY = -12;

        // Phase 1 (Frame 7): High-Left Muscular Coil
        if (elapsed < strikeStart) {
          const t = elapsed / Math.max(1, windupF);
          const ease = (1 - Math.cos(t * Math.PI)) * 0.5;
          return {
            lunge: seq1EndLunge + (coilLunge - seq1EndLunge) * ease,
            offY: seq1EndOffY + (coilOffY - seq1EndOffY) * ease,
            leverTorque: 1.0 + (-1.0 - 1.0) * ease
          };
        }

        // Phase 2 (Frames 8–9): Counter-Cleave Sweep -> Rising Skyward Scoop Thrust
        if (elapsed < strikeEnd) {
          const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
          if (sp < 0.45) {
            const p1 = sp / 0.45;
            const ease1 = Math.pow(p1, 1.8);
            return {
              lunge: coilLunge + (scoopMidLunge - coilLunge) * ease1,
              offY: coilOffY + (scoopMidOffY - coilOffY) * ease1,
              leverTorque: -1.0 + 1.6 * ease1
            };
          } else {
            const p2 = (sp - 0.45) / 0.55;
            const ease2 = Math.pow(p2, 1.6);
            return {
              lunge: scoopMidLunge + (apexLunge - scoopMidLunge) * ease2,
              offY: scoopMidOffY + (apexOffY - scoopMidOffY) * ease2,
              leverTorque: 0.6 + 0.6 * ease2
            };
          }
        }

        // Phase 3 (Frames 10–11): Skyward Apex Impact Lock (Full muscular arm extension)
        if (elapsed < lockEnd) {
          return { lunge: apexLunge, offY: apexOffY, leverTorque: 1.2 };
        }

        // Phase 4 (Frame 12): Weighted Muscular Settle back to neutral stance
        const rp = (elapsed - lockEnd) / Math.max(1, recF);
        if (rp < 0.25) {
          return { lunge: apexLunge, offY: apexOffY, leverTorque: 1.2 };
        }
        const settleP = (rp - 0.25) / 0.75;
        const settleEase = (1 - Math.cos(settleP * Math.PI)) * 0.5;
        return {
          lunge: apexLunge * (1 - settleEase),
          offY: apexOffY * (1 - settleEase),
          leverTorque: 1.2 * (1 - settleEase)
        };
      }

      // Sequence 1 (Frames 1–6: Ready Guard -> Deep Hip Coil -> Horizontal Cross Cleave)
      const windupF = cfg.calamityWindupFrames ?? 28;
      const strikeF = cfg.calamityStrikeFrames ?? 9;
      const lockF = cfg.calamityLockFrames ?? 22;
      const recF = cfg.calamityRecoveryFrames ?? 0;
      const totalF = this.calamityMax || (windupF + strikeF + lockF + recF);
      const elapsed = Math.max(0, totalF - this.calamityTimer);
      const strikeStart = windupF;
      const strikeEnd = strikeStart + strikeF;

      const coilLunge = -15;
      const coilOffY = 9;
      const cleaveEndLunge = 22;
      const cleaveEndOffY = -6;

      // Phase 1: Monotonic Deep Backward Hip Coil (ZERO forward-and-back pre-swing!)
      if (elapsed < strikeStart) {
        const t = elapsed / Math.max(1, windupF);
        const coilP = Math.min(1.0, t / 0.82); // Last 18% holds poised at peak coil tension
        const ease = (1 - Math.cos(coilP * Math.PI)) * 0.5;
        return {
          lunge: coilLunge * ease,
          offY: coilOffY * ease,
          leverTorque: -1.0 * ease
        };
      }

      // Phase 2: Explosive Horizontal Cross Cleave Drive
      if (elapsed < strikeEnd) {
        const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
        const ease = Math.pow(sp, 2.0);
        const swingArcOut = Math.sin(sp * Math.PI) * 7;
        return {
          lunge: coilLunge + (cleaveEndLunge - coilLunge) * ease,
          offY: coilOffY + (cleaveEndOffY - coilOffY) * ease + swingArcOut,
          leverTorque: -1.0 + 2.0 * ease
        };
      }

      // Phase 3: Follow-Through Lock over left shoulder (Holds for Sequence 2!)
      return { lunge: cleaveEndLunge, offY: cleaveEndOffY, leverTorque: 1.0 };
    }

    // ── Basic 2-Hit Sword Combo (Hit 1 Rising Cleave -> Hit 2 Overhead Slam) ──
    if (!this.swipeActive || this.swordSwingTimer <= 0) {
      return { lunge: 0, offY: 0, leverTorque: 0 };
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
      const coilLunge = -11;
      const coilOffY = 6;
      const apexLunge = 20;
      const apexOffY = -7;

      if (elapsed < liftF) {
        const wp = elapsed / Math.max(1, liftF);
        const ease = (1 - Math.cos(wp * Math.PI)) * 0.5;
        return { lunge: coilLunge * ease, offY: coilOffY * ease, leverTorque: -0.8 * ease };
      } else if (elapsed < strikeStart) {
        return { lunge: coilLunge, offY: coilOffY, leverTorque: -0.8 };
      } else if (elapsed < strikeEnd) {
        const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
        const ease = Math.pow(sp, 2.2);
        const arcOut = Math.sin(sp * Math.PI) * 5;
        return {
          lunge: coilLunge + (apexLunge - coilLunge) * ease,
          offY: coilOffY + (apexOffY - coilOffY) * ease + arcOut,
          leverTorque: -0.8 + 1.8 * ease
        };
      } else {
        // Hold follow-through arm extension so Hit 2 chains seamlessly without resetting!
        return { lunge: apexLunge, offY: apexOffY, leverTorque: 1.0 };
      }
    } else {
      // Hit 2 starts directly from Hit 1's follow-through (+20, -7)
      const hit1EndLunge = 20;
      const hit1EndOffY = -7;
      const hoistLunge = -12;
      const hoistOffY = -14;
      const slamLunge = 22;
      const slamOffY = 9;

      if (elapsed < liftF) {
        const wp = elapsed / Math.max(1, liftF);
        const ease = (1 - Math.cos(wp * Math.PI)) * 0.5;
        return {
          lunge: hit1EndLunge + (hoistLunge - hit1EndLunge) * ease,
          offY: hit1EndOffY + (hoistOffY - hit1EndOffY) * ease,
          leverTorque: 1.0 + (-1.0 - 1.0) * ease
        };
      } else if (elapsed < strikeStart) {
        return { lunge: hoistLunge, offY: hoistOffY, leverTorque: -1.0 };
      } else if (elapsed < strikeEnd) {
        const sp = (elapsed - strikeStart) / Math.max(1, strikeF);
        const ease = Math.pow(sp, 2.2);
        return {
          lunge: hoistLunge + (slamLunge - hoistLunge) * ease,
          offY: hoistOffY + (slamOffY - hoistOffY) * ease,
          leverTorque: -1.0 + 2.1 * ease
        };
      } else if (elapsed < pinEnd) {
        return { lunge: slamLunge, offY: slamOffY, leverTorque: 1.1 };
      } else {
        const rp = (elapsed - pinEnd) / Math.max(1, recF);
        const settleEase = (1 - Math.cos(rp * Math.PI)) * 0.5;
        return {
          lunge: slamLunge * (1 - settleEase),
          offY: slamOffY * (1 - settleEase),
          leverTorque: 1.1 * (1 - settleEase)
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

  // ──────────────────────────────────────────
  // Skill 1: Calamity Cleave Combo (Reference Frames 1–12)
  // Sequence 1: Frames 1–6 (Horizontal Cross Cleave & Supersonic Crescent Wave)
  // Sequence 2: Frames 7–12 (Reverse Cleave & Skyward Scoop Finisher)
  // ──────────────────────────────────────────
  _castCalamityCleave(opponent) {
    if (!this._isCalamityEnabled()) return;
    if (this.calamityCooldown > 0 || this.isCaughtInBeam() || this.swipeActive || this.calamityActive || this.cycloneActive) return;

    const cfg = gutsConfig;
    const windupF = cfg.calamityWindupFrames ?? 28;
    const strikeF = cfg.calamityStrikeFrames ?? 9;
    const lockF = cfg.calamityLockFrames ?? 22;
    const recF = cfg.calamityRecoveryFrames ?? 0;
    const totalF = windupF + strikeF + lockF + recF;

    this.calamitySeq = 1;
    this.calamityCooldown = this.calamityCooldownMax;
    this.calamityActive = true;
    this.calamityTimer = totalF;
    this.calamityMax = totalF;
    this.calamityHitDelivered = false;
    this.calamityWaveSpawned = false;

    const target = opponent || this;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const aim = Math.atan2(dy, dx);
    this.committedAttackAngle = aim;
    this.gunAngle = aim;
    this.angle = aim;

    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('dash1', 0.60);
      }
    } catch (e) {}
  }

  _startCalamitySeq2(opponent) {
    const cfg = gutsConfig;
    const windupF = cfg.calamitySeq2WindupFrames || 18;
    const strikeF = cfg.calamitySeq2StrikeFrames || 11;
    const lockF = cfg.calamitySeq2LockFrames || 18;
    const recF = cfg.calamitySeq2RecoveryFrames || 24;
    const totalF = windupF + strikeF + lockF + recF;

    this.calamitySeq = 2;
    this.calamityActive = true;
    this.calamityTimer = totalF;
    this.calamityMax = totalF;
    this.calamityHitDelivered = false;
    this.calamityWaveSpawned = false;

    // Target tracking re-alignment at start of Sequence 2
    const target = opponent || this;
    if (target && !target.isDead) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      if (dx !== 0 || dy !== 0) {
        const aim = Math.atan2(dy, dx);
        this.committedAttackAngle = aim;
        this.gunAngle = aim;
        this.angle = aim;
      }
    }

    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('dash1', 0.55);
      }
    } catch (e) {}
  }

  _castCalamitySeq2(opponent) {
    if (!this._isCalamityEnabled()) return;
    if (this.isCaughtInBeam() || this.cycloneActive) return;
    this.swipeActive = false;
    this.swordSwingTimer = 0;
    this.calamityCooldown = this.calamityCooldownMax;
    this._startCalamitySeq2(opponent);
  }

  _updateCalamityCleave(opponent, arena) {
    if (this.calamityTimer <= 0) {
      if (this.calamitySeq === 1) {
        this._startCalamitySeq2(opponent);
        return;
      }
      this.calamityActive = false;
      this.calamitySeq = 1;
      this.committedAttackAngle = undefined;
      return;
    }
    this.calamityTimer--;

    const cfg = gutsConfig;

    // ──────────────────────────────────────────
    // SEQUENCE 1: Horizontal Cross Cleave & Wave 1 (Frames 1–6)
    // ──────────────────────────────────────────
    if (this.calamitySeq === 1) {
      const windupF = cfg.calamityWindupFrames ?? 28;
      const strikeF = cfg.calamityStrikeFrames ?? 9;
      const lockF = cfg.calamityLockFrames ?? 22;
      const recF = cfg.calamityRecoveryFrames ?? 0;

      const totalF = this.calamityMax || (windupF + strikeF + lockF + recF);
      const elapsed = totalF - this.calamityTimer;
      const strikeStart = windupF;
      const strikeEnd = strikeStart + strikeF;
      const lockEnd = strikeEnd + lockF;

      // Phase 1 (Frames 1–3): Windup & Deep Backward Coil
      if (elapsed < strikeStart) {
        this.vx *= 0.85;
        this.vy *= 0.85;
        return;
      }

      // Phase 2 (Frame 4): Sweeping Cleave Stroke (Smooth 9 frames - NOT snappy!)
      if (elapsed >= strikeStart && elapsed < strikeEnd) {
        const strikeElapsed = elapsed - strikeStart;
        const distToOpp = opponent ? Math.hypot(opponent.x - this.x, opponent.y - this.y) : 999;
        const minContactGap = this.r + (opponent?.r || 25) + 30;
        if (distToOpp > minContactGap) {
          const lungeSpeed = cfg.calamityLungeSpeed || 5.5;
          const gapScale = Math.min(1, (distToOpp - minContactGap) / 45);
          this.vx = Math.cos(this.committedAttackAngle) * lungeSpeed * gapScale;
          this.vy = Math.sin(this.committedAttackAngle) * lungeSpeed * gapScale;
        } else {
          this.vx = 0;
          this.vy = 0;
        }

        if (strikeElapsed >= Math.floor(strikeF * 0.45)) {
          if (!this.calamityHitDelivered) {
            this.calamityHitDelivered = true;
            try {
              if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
                audioSystem.playSFX('swordswing', 1.0);
              }
            } catch (e) {}
            this._deliverCalamityMeleeHit(opponent, 1);
          }
        }
        return;
      }

      // Phase 3 (Frames 5–6): Follow-Through Lock Hold over opposite shoulder
      if (elapsed >= strikeEnd && elapsed < lockEnd) {
        this.vx = 0;
        this.vy = 0;
      } else if (elapsed >= lockEnd) {
        this.vx *= 0.85;
        this.vy *= 0.85;
      }

      // When Sequence 1 completes its follow-through lock: chain directly into Sequence 2 without resetting angle!
      if (this.calamityTimer <= 0) {
        this._startCalamitySeq2(opponent);
      }
      return;
    }

    // ──────────────────────────────────────────
    // SEQUENCE 2: Reverse Cleave & Skyward Scoop Finisher (Frames 7–12)
    // ──────────────────────────────────────────
    const windupF = cfg.calamitySeq2WindupFrames || 18;
    const strikeF = cfg.calamitySeq2StrikeFrames || 11;
    const lockF = cfg.calamitySeq2LockFrames || 18;
    const recF = cfg.calamitySeq2RecoveryFrames || 24;

    const totalF = this.calamityMax || (windupF + strikeF + lockF + recF);
    const elapsed = totalF - this.calamityTimer;
    const strikeStart = windupF;
    const strikeEnd = strikeStart + strikeF;
    const lockEnd = strikeEnd + lockF;

    // Phase 1 (Frame 7): High Left Coil
    if (elapsed < strikeStart) {
      this.vx *= 0.85;
      this.vy *= 0.85;
      return;
    }

    // Phase 2 & 3 (Frames 8–9): Counter-Cleave -> Skyward Scoop (11 frames - NOT snappy!)
    if (elapsed >= strikeStart && elapsed < strikeEnd) {
      const strikeElapsed = elapsed - strikeStart;
      const distToOpp = opponent ? Math.hypot(opponent.x - this.x, opponent.y - this.y) : 999;
      const minContactGap = this.r + (opponent?.r || 25) + 30;
      if (distToOpp > minContactGap) {
        const lungeSpeed = cfg.calamitySeq2LungeSpeed || 6.0;
        const gapScale = Math.min(1, (distToOpp - minContactGap) / 45);
        this.vx = Math.cos(this.committedAttackAngle) * lungeSpeed * gapScale;
        this.vy = Math.sin(this.committedAttackAngle) * lungeSpeed * gapScale;
      } else {
        this.vx = 0;
        this.vy = 0;
      }

      // Deliver strike at ~40% through strike
      if (strikeElapsed >= Math.floor(strikeF * 0.40)) {
        if (!this.calamityHitDelivered) {
          this.calamityHitDelivered = true;
          try {
            if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
              audioSystem.playSFX('swordswing', 1.0);
            }
          } catch (e) {}
          this._deliverCalamityMeleeHit(opponent, 2);
        }
      }
      return;
    }

    // Phase 4 (Frames 10–11): Skyward Apex Impact Lock (Zero random tremor shaking)
    if (elapsed >= strikeEnd && elapsed < lockEnd) {
      this.vx = 0;
      this.vy = 0;
      this.swordTremorX = 0;
      this.swordTremorY = 0;
      return;
    }

    // Phase 5 (Frame 12): Smooth Recovery Damping (Zero backward recoil shaking)
    if (elapsed >= lockEnd) {
      this.vx *= 0.85;
      this.vy *= 0.85;
      this.swordTremorX = 0;
      this.swordTremorY = 0;
    }

    if (this.calamityTimer <= 0) {
      this.calamityActive = false;
      this.calamitySeq = 1;
      this.committedAttackAngle = undefined;
    }
  }

  _deliverCalamityMeleeHit(opponent, seq = 1) {
    const cfg = gutsConfig;
    const weaponReach = this.getWeaponReach();
    const reach = this.r + weaponReach + (seq === 2 ? 24 : 18);
    const arc = (seq === 2 ? 180 : 160) * Math.PI / 180;
    let targets = this._getTargetsInFrontalArc(reach, arc);

    if (targets.length === 0) {
      const fallback = (opponent && !opponent.isDead && opponent.hp > 0) ? opponent : null;
      if (fallback) {
        const dx = fallback.x - this.x;
        const dy = fallback.y - this.y;
        const maxDist = this.r + (fallback.r || 25) + weaponReach + (seq === 2 ? 16 : 10);
        if ((dx * dx + dy * dy) <= maxDist * maxDist) {
          targets = [fallback];
        }
      }
    }

    if (targets.length > 0) {
      const pauseFrames = (seq === 2) ? (cfg.calamitySeq2HitPauseFrames || 10) : (cfg.calamityHitPauseFrames || 8);
      this.calamityHitPauseTimer = pauseFrames;
      this.calamityHitPauseMax = pauseFrames;
      this.calamityHitPauseTargets = targets;
      this.vx = 0;
      this.vy = 0;

      const dmg = (seq === 2) ? (cfg.calamitySeq2MeleeDamage || 85) : (cfg.calamityMeleeDamage || 65);
      for (const tgt of targets) {
        tgt.takeDamage(dmg, this, { isMelee: true });
        tgt.vx = 0;
        tgt.vy = 0;
        if (typeof tgt.applyTimeStop === 'function') {
          tgt.applyTimeStop(pauseFrames);
        }
        tgt.suppressFreezeOverlay = true;
      }

      try {
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('fleshhit', 1.0);
          audioSystem.playSFX('Sukuna-slice', 0.95);
          if (seq === 2) {
            audioSystem.playSFX('heavypunch1', 0.90);
          }
        }
      } catch (e) {}

      spawnFloatingText(this.x, this.y - this.r - 20, seq === 2 ? 'CALAMITY FINISHER!' : 'CALAMITY CLEAVE!', '#f59e0b');
    }
  }

  _resolveCalamityUnpause() {
    const isSeq2 = (this.calamitySeq === 2);
    const kb = isSeq2 ? (gutsConfig.calamitySeq2Knockback || 13.5) : (gutsConfig.calamityKnockback || 11.0);
    const aim = this.committedAttackAngle || this.gunAngle || 0;
    for (const tgt of (this.calamityHitPauseTargets || [])) {
      if (!tgt || tgt.hp <= 0 || tgt.isDead) continue;
      tgt.suppressFreezeOverlay = false;
      tgt.timeStopTimer = 0;
      tgt.vx += Math.cos(aim) * kb;
      tgt.vy += Math.sin(aim) * kb;
      if (isSeq2) {
        tgt.vy -= 4.0; // Upward loft rebound on skyward scoop impact
      }
      if (typeof tgt.applyHitStun === 'function') {
        tgt.applyHitStun(isSeq2 ? (gutsConfig.calamitySeq2HitStunFrames || 26) : (gutsConfig.calamityHitStunFrames || 18));
      }
    }
    this.calamityHitPauseTargets = [];
    this.swordTremorX = 0;
    this.swordTremorY = 0;
  }

  _spawnCrescentWave(seq = 1) {
    const cfg = gutsConfig;
    const aim = this.committedAttackAngle || this.gunAngle || 0;
    const weaponReach = this.getWeaponReach();
    const spawnDist = this.r + weaponReach * 0.75;
    const spawnX = this.x + Math.cos(aim) * spawnDist;
    const spawnY = this.y + Math.sin(aim) * spawnDist;

    const isSeq2 = (seq === 2);
    const speed = isSeq2 ? (cfg.calamitySeq2WaveSpeed || 12.0) : (cfg.calamityWaveSpeed || 10.5);
    const maxAge = isSeq2 ? (cfg.calamitySeq2WaveMaxAge || 45) : (cfg.calamityWaveMaxAge || 42);
    const width = isSeq2 ? (cfg.calamitySeq2WaveWidth || 165) : (cfg.calamityWaveWidth || 140);
    const damage = isSeq2 ? (cfg.calamitySeq2WaveDamage || 55) : (cfg.calamityWaveDamage || 45);

    this.activeCrescentWaves.push({
      x: spawnX,
      y: spawnY,
      vx: Math.cos(aim) * speed,
      vy: Math.sin(aim) * speed,
      angle: aim,
      age: 0,
      maxAge: maxAge,
      width: width,
      damage: damage,
      seq: seq,
      hitTargets: new Set(),
      isBerserker: this.isBerserkerActive === true
    });
  }

  _spawnCalamityVortex() {
    this.activeCalamityVortex = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const dist = 35 + Math.random() * 45;
      this.activeCalamityVortex.push({
        x: this.x + Math.cos(a) * dist,
        y: this.y + Math.sin(a) * dist,
        originDist: dist,
        angle: a,
        age: 0,
        maxAge: gutsConfig.calamitySeq2WindupFrames || 18,
        size: 2.0 + Math.random() * 2.5
      });
    }
  }

  _updateCalamityVortex() {
    if (!this.activeCalamityVortex || this.activeCalamityVortex.length === 0) return;
    for (let i = this.activeCalamityVortex.length - 1; i >= 0; i--) {
      const v = this.activeCalamityVortex[i];
      v.age++;
      if (v.age >= v.maxAge) {
        this.activeCalamityVortex.splice(i, 1);
        continue;
      }
      // Spiral inward towards Guts
      v.angle += 0.16;
      const progress = v.age / v.maxAge;
      const currentDist = v.originDist * (1 - Math.pow(progress, 0.8));
      v.x = this.x + Math.cos(v.angle) * currentDist;
      v.y = this.y + Math.sin(v.angle) * currentDist;
    }
  }

  _updateCrescentWaves(arena) {
    if (!this.activeCrescentWaves || this.activeCrescentWaves.length === 0) return;

    for (let i = this.activeCrescentWaves.length - 1; i >= 0; i--) {
      const wave = this.activeCrescentWaves[i];
      wave.age++;
      wave.x += wave.vx;
      wave.y += wave.vy;

      if (typeof state !== 'undefined' && state.fighters) {
        for (const f of state.fighters) {
          if (!f || f === this || f.isDead || f.hp <= 0) continue;
          if (typeof state.getFighterTeam === 'function' && state.getFighterTeam(f) === state.getFighterTeam(this)) continue;
          if (wave.hitTargets.has(f)) continue;

          const dx = f.x - wave.x;
          const dy = f.y - wave.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= (wave.width * 0.45 + (f.r || 25))) {
            wave.hitTargets.add(f);
            f.takeDamage(wave.damage, this, 'blade');
            f.vx += Math.cos(wave.angle) * 7.5;
            f.vy += Math.sin(wave.angle) * 7.5;
            if (typeof f.applyHitStun === 'function') f.applyHitStun(12);

            try {
              if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
                audioSystem.playSFX('fleshhit', 0.85);
              }
            } catch (e) {}
          }
        }
      }

      // Frame 6 reference: ribbon split & ground embers
      if (wave.age >= wave.maxAge * 0.60 && wave.age % 2 === 0) {
        const perpA = wave.angle + Math.PI / 2;
        const spread = (Math.random() - 0.5) * (wave.width * 0.5);
        this.activeCalamityEmbers.push({
          x: wave.x + Math.cos(perpA) * spread,
          y: wave.y + Math.sin(perpA) * spread,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          age: 0,
          maxAge: 16 + Math.floor(Math.random() * 8),
          size: 2.0 + Math.random() * 2.0,
          color: wave.isBerserker ? '#ef4444' : '#fbbf24'
        });
      }

      if (wave.age >= wave.maxAge) {
        this.activeCrescentWaves.splice(i, 1);
      }
    }
  }

  _updateCalamityEmbers() {
    if (!this.activeCalamityEmbers || this.activeCalamityEmbers.length === 0) return;
    for (let i = this.activeCalamityEmbers.length - 1; i >= 0; i--) {
      const e = this.activeCalamityEmbers[i];
      e.age++;
      e.x += e.vx;
      e.y += e.vy;
      e.vx *= 0.92;
      e.vy *= 0.92;
      if (e.age >= e.maxAge) {
        this.activeCalamityEmbers.splice(i, 1);
      }
    }
  }

  _castArmCannon(opponent) {
    if (!opponent) return;
    const cfg = gutsConfig;
    if (!this._isCannonEnabled()) return;

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
    if (!this._isCycloneEnabled()) return;

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
    if (!this._isBerserkerEnabled()) return;

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
