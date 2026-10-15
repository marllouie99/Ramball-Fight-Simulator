// ─────────────────────────────────────────────
// Maki Zen'in — The Awakened Demon
// Heavenly Restriction: Complete (Sakurajima Colony)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnSparks, spawnImpactFlash, spawnGroundScorch } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { drawMakiSkin, drawMakiGhostSkin } from '../../graphics/fighters/makiSkin.js';
import { drawMakiSoulSlash } from '../../graphics/weapons/makiWeaponGraphics.js';
import { resolveEntityPlusObstacleCollision } from '../../systems/arenaObstacleSystem.js';

export class MakiFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'maki';
    this.type = 'maki';
    this.name = 'Maki';
    const cfg = CONFIG.maki || {};
    this.themeColor = def?.themeColor || cfg.themeColor || '#014913ff';
    this.color = def?.color || cfg.color || '#18181B';
    this.damageNumberColor = cfg.damageNumberColor || this.themeColor;
    this.hp = cfg.hp || 440;
    this.maxHp = cfg.maxHp || 440;
    this.speed = cfg.speed || 5.4;
    this.baseSpeed = cfg.speed || 5.4;
    this.r = cfg.r || 25;
    this.hideHands = true; // Weapon & skill animations render dedicated dynamic hands; default model fists hidden

    // Heavenly Restriction & Domain Immunity
    this.domainImmunity = true;
    this.isDomainImmune = true;
    this.homingImmunity = true;

    // Passive: Atmospheric Stepping & Flow Dodge
    this.isAirStepping = false;
    this.airStepTimer = 0;
    this.airStepCooldown = 0;
    this.airStepCooldownMax = cfg.airStepCooldown || 300;
    this.isInFlowState = false;
    this.flowDodgeCooldown = 0;
    this.flowDodgeCooldownMax = cfg.flowDodgeCooldown || 480;

    // Primary Melee: Split Soul Katana
    this.swordCooldown = 0;
    this.swordCooldownMax = cfg.swordCooldown || 42;
    this.swordComboStep = 0;
    this.swordComboResetTimer = 0;
    this.swordSwingTimer = 0;
    this.swordSwingMax = 24;
    this.swordHitTremorTimer = 0;
    this.swordHitDelivered = true;
    this.swordHitConnected = false;
    this.swordSwingSoundPlayed = false;
    this.swordSwingOpponent = null;
    this.afterImages = [];

    // Skill 1: Dragon-Bone Kinetic Jet Skewer & Brutal Punch
    this.kineticCharges = 0;
    this.maxKineticCharges = cfg.maxKineticCharges || 3;
    this.dragonBoneCooldown = 0;
    this.dragonBoneCooldownMax = cfg.dragonBoneCooldown || 420;
    this.dragonBoneActive = false;
    this.dragonBonePhase = null; // 'windup', 'dash', 'stab', 'punch'
    this.dragonBonePhaseTimer = 0;
    this.dragonBonePhaseMax = CONFIG.maki?.dragonBoneWindupFrames || 12;
    this.dragonBoneTarget = null;
    this.dragonBoneTargetAngle = 0;
    this.makiLaunchedTargets = [];

    // Skill 2: Zen'in Annihilation Riposte
    this.riposteCooldown = 0;
    this.riposteCooldownMax = cfg.riposteCooldown || 540;
    this.riposteActive = false;
    this.riposteTimer = 0;

    // Ultimate: Sakurajima Awakening ("Everything is Visible")
    this.ultimateCooldown = cfg.ultimateCooldown || 2100;
    this.ultimateCooldownMax = cfg.ultimateCooldown || 2100;
    this.ultimateActive = false;
    this.ultimatePhase = null; // 'flow', 'flurry', 'execute'
    this.ultimateTimer = 0;
    this.ultimateTarget = null;
    this.ultimateFlurryStep = 0;

    // Declarative Skill Registration
    this._registerSkills();
  }

  _registerSkills() {
    this.skillManager.registerSkills([
      {
        id: 'dragonBone',
        name: 'DRAGON SKEWER PUNCH',
        type: 'basic',
        cooldownKey: 'dragonBoneCooldown',
        cooldownMax: () => this.dragonBoneCooldownMax,
        color: '#F59E0B',
        onActivate: (fighter, opponent) => {
          fighter._castDragonBone(opponent);
        }
      },
      {
        id: 'riposte',
        name: 'SOUL RIPOSTE',
        type: 'buff',
        cooldownKey: 'riposteCooldown',
        cooldownMax: () => this.riposteCooldownMax,
        durationKey: 'riposteTimer',
        durationMax: () => 22,
        activeKey: 'riposteActive',
        color: this.themeColor || '#014913ff',
        onActivate: (fighter) => {
          fighter._castRiposte();
        }
      },
      {
        id: 'ult',
        name: 'SAKURAJIMA AWAKENING',
        type: 'ultimate',
        cooldownKey: 'ultimateCooldown',
        cooldownMax: () => this.ultimateCooldownMax,
        durationKey: 'ultimateTimer',
        durationMax: () => 180,
        activeKey: 'ultimateActive',
        color: '#8B5CF6',
        onActivate: (fighter, opponent) => {
          fighter._castUltimate(opponent);
        }
      }
    ]);
  }

  reset() {
    super.reset();
    this.isAirStepping = false;
    this.airStepTimer = 0;
    this.airStepCooldown = 0;
    this.isInFlowState = false;
    this.flowDodgeCooldown = 0;
    this.swordCooldown = 0;
    this.swordComboStep = 0;
    this.swordComboResetTimer = 0;
    this.swordSwingTimer = 0;
    this.swordHitTremorTimer = 0;
    this.swordHitDelivered = true;
    this.swordHitConnected = false;
    this.swordSwingSoundPlayed = false;
    this.swordSwingOpponent = null;
    this.afterImages = [];
    this.kineticCharges = 0;
    this.dragonBoneCooldown = 0;
    this.dragonBoneActive = false;
    this.dragonBonePhase = null;
    this.dragonBonePhaseTimer = 0;
    this.dragonBonePhaseMax = CONFIG.maki?.dragonBoneWindupFrames || 12;
    this.dragonBoneTarget = null;
    this.makiLaunchedTargets = [];
    this.riposteCooldown = 0;
    this.riposteActive = false;
    this.riposteTimer = 0;
    this.ultimateCooldown = this.ultimateCooldownMax;
    this.ultimateActive = false;
    this.ultimatePhase = null;
    this.ultimateTimer = 0;
    this.ultimateTarget = null;
    this.ultimateFlurryStep = 0;
  }

  /**
   * Main Fighter Update Loop adhering to Repository Rules.
   */
  update(opponent, ownerIndex, arena) {
    // Fade afterimages every frame
    if (this.afterImages && this.afterImages.length > 0) {
      for (let i = this.afterImages.length - 1; i >= 0; i--) {
        const img = this.afterImages[i];
        img.alpha -= 0.040;
        if (img.alpha <= 0) {
          this.afterImages.splice(i, 1);
        }
      }
    }

    // Rule 25: Decay active tremor before freeze guard so visual effects never stick
    if (this.swordHitTremorTimer > 0) this.swordHitTremorTimer--;

    // Rule 1.1: Freeze & Time-Stop Early Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // Decrement Cooldowns
    if (this.swordCooldown > 0) this.swordCooldown--;
    if (this.airStepCooldown > 0) this.airStepCooldown--;
    if (this.flowDodgeCooldown > 0) this.flowDodgeCooldown--;
    if (this.dragonBoneCooldown > 0) this.dragonBoneCooldown--;
    if (this.riposteCooldown > 0) this.riposteCooldown--;
    if (this.ultimateCooldown > 0) this.ultimateCooldown--;

    if (this.swordComboResetTimer > 0) {
      this.swordComboResetTimer--;
      if (this.swordComboResetTimer <= 0) this.swordComboStep = 0;
    }
    if (this.swordSwingTimer > 0) {
      this._updateSwordSwing(opponent, arena);
    } else if (!this.dragonBoneActive && !this.ultimateActive) {
      this.isSpinning = false;
    }

    // Update launched enemies taking continuous flight tick damage
    this._updateMakiLaunchedTargets(arena);

    // Update Active Skills & Sequences
    if (this.ultimateActive) {
      this._updateUltimate(opponent, arena);
      return; // Locked in ultimate animation
    }

    if (this.dragonBoneActive) {
      this._updateDragonBone(opponent, arena);
      return;
    }

    if (this.riposteActive) {
      this._updateRiposte(opponent);
    }

    if (this.isAirStepping) {
      this._updateAirStepping();
    }

    // AI / Combat Decision Matrix
    if (opponent && !opponent.isDead) {
      this.aim(opponent);
      this._evaluateCombatAI(opponent, arena);
    }

    // Rule 1.2: Centralized movement physics
    super.update(opponent, ownerIndex, arena);
  }

  /**
   * Overrides base Fighter.shoot() to suppress default generic bullet projectiles.
   * Maki relies entirely on her Split Soul Katana melee combos and Dragon-Bone.
   */
  shoot(ownerIndex) {
    // Intentionally empty: Maki uses custom melee cursed tools (Split Soul Katana & Dragon-Bone)
  }

  isStationarySkillActive() {
    if (this.dragonBoneActive && ['windup', 'stab', 'punch', 'lift', 'throw', 'groundPin'].includes(this.dragonBonePhase)) {
      return true;
    }
    return super.isStationarySkillActive();
  }

  canAim() {
    if (this.swordSwingTimer > 0) {
      const totalF = this.swordSwingMax || 32;
      const elapsed = totalF - this.swordSwingTimer;
      const liftF = this.swordSwingLiftFrames || 8;
      const holdF = this.swordSwingHoldFrames || 3;
      // Lock committed aim throughout active cleave, impact lock, and recovery to prevent body angle twitching
      if (elapsed >= (liftF + holdF)) return false;
    }
    if (this.dragonBoneActive && this.dragonBonePhase !== 'windup') return false;
    if (this.ultimateActive) return false;
    return super.canAim();
  }

  _evaluateCombatAI(opponent, arena) {
    if (!opponent || opponent.isDead) return;

    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const dist = Math.hypot(dx, dy);

    // 1. Ultimate: Sakurajima Awakening
    if (this.ultimateCooldown <= 0 && dist < 360 && !opponent.isInvulnerable) {
      this._castUltimate(opponent);
      return;
    }

    // 2. Skill 1: Dragon-Bone Kinetic Thrust (when in range or with max charges)
    if (this.dragonBoneCooldown <= 0 && (dist < 200 || this.kineticCharges >= 2) && !this.riposteActive) {
      this._castDragonBone(opponent);
      return;
    }

    // 3. Air-Stepping Mobility Burst
    if (this.airStepCooldown <= 0 && dist > 180 && !this.isAirStepping) {
      this._triggerAirStep(opponent);
    }

    // 4. Basic Attack: Split Soul Katana Combo
    const cfg = CONFIG.maki || {};
    const reach = cfg.swordRange || 72;
    if (dist <= reach + this.r + (opponent.r || 25) && this.swordCooldown <= 0) {
      this._performSplitSoulSlash(opponent);
    }
  }

  /**
   * Split Soul Katana 3-Hit Authentic Manga Sword Combo:
   * - Hit 1: The Overhead Strike (Frame 1): High two-handed overhead chop downward
   * - Hit 2: The Underhand Uppercut (Frame 4): Low scoop rising cleave lifting enemy
   * - Hit 3: The Spinning Sweep (Frame 5): Full 360° whirlwind horizontal sweeping spin
   */
  _performSplitSoulSlash(opponent, forcedComboStep = null) {
    if (!opponent) return;

    if (forcedComboStep !== null && forcedComboStep !== undefined) {
      this.swordComboStep = forcedComboStep;
    } else {
      this.swordComboStep = (this.swordComboStep % 3) + 1;
    }

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.maki) ? CONFIG.maki : {};
    this.swordComboResetTimer = cfg.comboResetFrames || 95;

    const angle = this.gunAngle || Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.swordSlashAngle = angle;

    let dmg = 28;
    let knockback = 6.5;
    let lunge = 6.5;
    let hitPause = 2;
    let hitStun = 10;
    let shakeIntensity = 0;
    let shakeDuration = 0;
    let liftFrames = 7;
    let holdFrames = 2;
    let strikeFrames = 6;
    let pinFrames = 6;
    let recFrames = 10;

    if (this.swordComboStep === 1) {
      liftFrames = (typeof cfg.hit1LiftFrames === 'number') ? cfg.hit1LiftFrames : 8;
      holdFrames = (typeof cfg.hit1HoldFrames === 'number') ? cfg.hit1HoldFrames : 3;
      strikeFrames = (typeof cfg.hit1StrikeFrames === 'number') ? cfg.hit1StrikeFrames : 5;
      pinFrames = (typeof cfg.hit1ImpactLockFrames === 'number') ? cfg.hit1ImpactLockFrames : ((typeof cfg.hit1LockFrames === 'number') ? cfg.hit1LockFrames : ((typeof cfg.hit1PinFrames === 'number') ? cfg.hit1PinFrames : (cfg.hit1GroundPinFrames || 6)));
      recFrames = (typeof cfg.hit1RecoveryFrames === 'number') ? cfg.hit1RecoveryFrames : 10;
      dmg = (typeof cfg.hit1Damage === 'number') ? cfg.hit1Damage : (cfg.comboHit1Damage || 28);
      knockback = (typeof cfg.hit1Knockback === 'number') ? cfg.hit1Knockback : (cfg.comboHit1Knockback || 6.5);
      lunge = (typeof cfg.hit1LungeSpeed === 'number') ? cfg.hit1LungeSpeed : (cfg.comboHit1Lunge || 6.5);
      hitPause = (typeof cfg.hit1HitPauseFrames === 'number') ? cfg.hit1HitPauseFrames : 3;
      hitStun = (typeof cfg.hit1HitStunFrames === 'number') ? cfg.hit1HitStunFrames : 10;
      shakeIntensity = (typeof cfg.hit1ImpactShake === 'number') ? cfg.hit1ImpactShake : 0;
      shakeDuration = (typeof cfg.hit1ImpactShakeDuration === 'number') ? cfg.hit1ImpactShakeDuration : 0;
      this.swordCooldown = cfg.swordCooldown || 38;
    } else if (this.swordComboStep === 2) {
      liftFrames = (typeof cfg.hit2LiftFrames === 'number') ? cfg.hit2LiftFrames : 8;
      holdFrames = (typeof cfg.hit2HoldFrames === 'number') ? cfg.hit2HoldFrames : 3;
      strikeFrames = (typeof cfg.hit2StrikeFrames === 'number') ? cfg.hit2StrikeFrames : 6;
      pinFrames = (typeof cfg.hit2ImpactLockFrames === 'number') ? cfg.hit2ImpactLockFrames : ((typeof cfg.hit2LockFrames === 'number') ? cfg.hit2LockFrames : ((typeof cfg.hit2PinFrames === 'number') ? cfg.hit2PinFrames : (cfg.hit2GroundPinFrames || 5)));
      recFrames = (typeof cfg.hit2RecoveryFrames === 'number') ? cfg.hit2RecoveryFrames : 10;
      dmg = (typeof cfg.hit2Damage === 'number') ? cfg.hit2Damage : (cfg.comboHit2Damage || 34);
      knockback = (typeof cfg.hit2Knockback === 'number') ? cfg.hit2Knockback : (cfg.comboHit2Knockback || 8.5);
      lunge = (typeof cfg.hit2LungeSpeed === 'number') ? cfg.hit2LungeSpeed : (cfg.comboHit2Lunge || 7.2);
      hitPause = (typeof cfg.hit2HitPauseFrames === 'number') ? cfg.hit2HitPauseFrames : 3;
      hitStun = (typeof cfg.hit2HitStunFrames === 'number') ? cfg.hit2HitStunFrames : 14;
      shakeIntensity = (typeof cfg.hit2ImpactShake === 'number') ? cfg.hit2ImpactShake : 0;
      shakeDuration = (typeof cfg.hit2ImpactShakeDuration === 'number') ? cfg.hit2ImpactShakeDuration : 0;
      this.swordCooldown = 42;
    } else if (this.swordComboStep === 3) {
      liftFrames = (typeof cfg.hit3LiftFrames === 'number') ? cfg.hit3LiftFrames : 8;
      holdFrames = (typeof cfg.hit3HoldFrames === 'number') ? cfg.hit3HoldFrames : 4;
      strikeFrames = (typeof cfg.hit3StrikeFrames === 'number') ? cfg.hit3StrikeFrames : 22;
      pinFrames = (typeof cfg.hit3ImpactLockFrames === 'number') ? cfg.hit3ImpactLockFrames : ((typeof cfg.hit3LockFrames === 'number') ? cfg.hit3LockFrames : ((typeof cfg.hit3PinFrames === 'number') ? cfg.hit3PinFrames : (cfg.hit3GroundPinFrames || 8)));
      recFrames = (typeof cfg.hit3RecoveryFrames === 'number') ? cfg.hit3RecoveryFrames : 14;
      dmg = (typeof cfg.hit3Damage === 'number') ? cfg.hit3Damage : (cfg.comboHit3Damage || 52);
      knockback = (typeof cfg.hit3Knockback === 'number') ? cfg.hit3Knockback : (cfg.comboHit3Knockback || 16.0);
      lunge = (typeof cfg.hit3LungeSpeed === 'number') ? cfg.hit3LungeSpeed : (cfg.comboHit3Lunge || 8.5);
      hitPause = (typeof cfg.hit3HitPauseFrames === 'number') ? cfg.hit3HitPauseFrames : 4;
      hitStun = (typeof cfg.hit3HitStunFrames === 'number') ? cfg.hit3HitStunFrames : 22;
      shakeIntensity = (typeof cfg.hit3ImpactShake === 'number') ? cfg.hit3ImpactShake : 0;
      shakeDuration = (typeof cfg.hit3ImpactShakeDuration === 'number') ? cfg.hit3ImpactShakeDuration : 0;
      this.swordCooldown = 55;
    }

    const totalSwingFrames = liftFrames + holdFrames + strikeFrames + pinFrames + recFrames;
    this.swordSwingTimer = totalSwingFrames;
    this.swordSwingMax = totalSwingFrames;
    this.swordSwingLiftFrames = liftFrames;
    this.swordSwingHoldFrames = holdFrames;
    this.swordSwingStrikeFrames = strikeFrames;
    this.swordSwingImpactLockFrames = pinFrames;
    this.swordSwingLockFrames = pinFrames;
    this.swordSwingPinFrames = pinFrames;
    this.swordSwingRecFrames = recFrames;
    this.swordSwingHitPause = hitPause;
    this.swordSwingShake = shakeIntensity;
    this.swordSwingShakeDuration = shakeDuration;
    this.swordSwingDamage = dmg;
    this.swordSwingKnockback = knockback;
    this.swordSwingLunge = lunge;
    this.swordSwingHitStun = hitStun;
    this.swordHitDelivered = false;
    this.swordHitConnected = false;
    this.swordSwingSoundPlayed = false;
    this.swordSwingOpponent = opponent;

    // Anticipation coil flutter sound
    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash1', 0.4);
      }
    } catch (e) {}
  }

  /**
   * Updates active sword swing frame pacing, physical lunge, ground pin, and impact timing.
   */
  _updateSwordSwing(opponent, arena) {
    if (this.swordSwingTimer <= 0) return;

    const totalF = this.swordSwingMax || 32;
    const elapsed = totalF - this.swordSwingTimer;
    const liftF = this.swordSwingLiftFrames || 8;
    const holdF = this.swordSwingHoldFrames || 3;
    const strikeF = this.swordSwingStrikeFrames || 5;
    const pinF = this.swordSwingPinFrames || 6;
    const recF = this.swordSwingRecFrames || 10;

    const strikeStart = liftF + holdF;
    const strikeEnd = liftF + holdF + strikeF;
    const pinEnd = liftF + holdF + strikeF + pinF;

    if (this.swordComboStep === 3) {
      // ── Hit 3: Full 360° Whirlwind Spin & Sunder Impact Lock ──
      if (elapsed < strikeStart) {
        // Phase 1 & 2: Anticipation Coil & Poised Hold
        if (opponent && !opponent.isDead) {
          this.swordSlashAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        }
        const coilP = Math.min(1.0, elapsed / Math.max(1, liftF));
        const coilEase = Math.sin(coilP * Math.PI * 0.5);
        this.angle = this.swordSlashAngle - 0.35 * coilEase;
        this.gunAngle = this.angle;
        this.isSpinning = false;
      } else if (elapsed < strikeEnd) {
        // Phase 3: Hypersonic 360° Whirlwind Whip Strike Window
        const strikeElapsed = elapsed - strikeStart;
        const strikeP = strikeElapsed / Math.max(1, strikeF);
        const whipEase = Math.pow(strikeP, 1.25);

        // Maki's whole body spins 360° along with her weapon!
        this.angle = (this.swordSlashAngle - 0.35) + (Math.PI * 2 + 0.35) * whipEase;
        this.gunAngle = this.angle;
        this.isSpinning = true;

        if (!this.swordSwingSoundPlayed) {
          this.swordSwingSoundPlayed = true;
          try {
            if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
              audioSystem.playSFX('skill_spinslash', 0.90);
            }
          } catch (e) {}
          this._spawnAfterimage(5, 11);
        }

        // Forward lunging step momentum into whirlwind
        const lungeSpeed = this.swordSwingLunge || 8.5;
        const lungeDecay = Math.sin(strikeP * Math.PI);
        this.vx = Math.cos(this.swordSlashAngle) * lungeSpeed * lungeDecay;
        this.vy = Math.sin(this.swordSlashAngle) * lungeSpeed * lungeDecay;

        // Trigger impact when whirlwind cleave connects
        if (!this.swordHitDelivered && strikeP >= 0.85) {
          this._deliverSwordImpact(opponent || this.swordSwingOpponent);
        }
      } else if (elapsed < pinEnd) {
        // Phase 4: SUNDER IMPACT LOCK — Full 360° spin completed, locked firmly in cleave plane
        this.angle = this.swordSlashAngle;
        this.gunAngle = this.swordSlashAngle;
        this.isSpinning = false;

        if (!this.swordHitDelivered) {
          this._deliverSwordImpact(opponent || this.swordSwingOpponent);
        }
        this.vx = 0;
        this.vy = 0;
      } else {
        // Phase 5: Recovery & Stance Settle
        this.angle = this.swordSlashAngle;
        this.gunAngle = this.swordSlashAngle;
        this.isSpinning = false;

        if (!this.swordHitDelivered) {
          this.swordHitDelivered = true;
        }
        // Rule 30: Kinetic recoil kickback on Phase 5 extraction
        if (elapsed === pinEnd) {
          const recoilKick = 2.8;
          this.vx -= Math.cos(this.swordSlashAngle) * recoilKick;
          this.vy -= Math.sin(this.swordSlashAngle) * recoilKick;
        }
        this.vx *= 0.75;
        this.vy *= 0.75;
      }
    } else {
      // ── Hit 1 & Hit 2: Directional Cleaves ──
      this.isSpinning = false;
      if (elapsed < strikeStart) {
        // Phase 1 & 2: Anticipation Coil & Poised Hold
        if (opponent && !opponent.isDead) {
          const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
          this.swordSlashAngle = targetAngle;
        }
      } else if (elapsed < strikeEnd) {
        // Phase 3: Hypersonic Whip Strike Window
        const strikeElapsed = elapsed - strikeStart;
        const strikeP = strikeElapsed / Math.max(1, strikeF);

        if (!this.swordSwingSoundPlayed) {
          this.swordSwingSoundPlayed = true;
          try {
            if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
              audioSystem.playSFX('attack_swordswing', 0.95);
            }
          } catch (e) {}
          this._spawnAfterimage(3, 11);
        }

        // Forward lunging step momentum into the cleave
        const lungeSpeed = this.swordSwingLunge || 7.0;
        const lungeDecay = Math.sin(strikeP * Math.PI);
        this.vx = Math.cos(this.swordSlashAngle) * lungeSpeed * lungeDecay;
        this.vy = Math.sin(this.swordSlashAngle) * lungeSpeed * lungeDecay;

        // IMPACT DELIVERY: Trigger slap impact at 50% of the whip stroke
        if (!this.swordHitDelivered && strikeP >= 0.50) {
          this._deliverSwordImpact(opponent || this.swordSwingOpponent);
        }
      } else if (elapsed < pinEnd) {
        // Phase 4: MELEE GROUND PIN (Blade locked firmly in the floor before recovery!)
        if (!this.swordHitDelivered) {
          this._deliverSwordImpact(opponent || this.swordSwingOpponent);
        }
        // Zero movement while weapon is pinned into the ground
        this.vx = 0;
        this.vy = 0;
      } else {
        // Phase 5: Recovery & Stance Settle
        if (!this.swordHitDelivered) {
          this.swordHitDelivered = true;
        }
        // Rule 30: Kinetic recoil kickback on Phase 5 extraction
        if (elapsed === pinEnd) {
          const recoilKick = 2.0;
          this.vx -= Math.cos(this.swordSlashAngle) * recoilKick;
          this.vy -= Math.sin(this.swordSlashAngle) * recoilKick;
        }
        this.vx *= 0.75;
        this.vy *= 0.75;
      }
    }

    this.swordSwingTimer--;
    if (this.swordSwingTimer <= 0) {
      this.isSpinning = false;
      this.swordSwingOpponent = null;
    }
  }

  /**
   * Delivers the satisfying physical slap impact upon blade contact:
   * Layered fleshy slap & soul-cleaving sound, blade tremor, screen shake, and damage.
   */
  _deliverSwordImpact(target = null) {
    if (this.swordHitDelivered) return;
    this.swordHitDelivered = true;

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.maki) ? CONFIG.maki : {};
    const reach = (cfg.swordReach || cfg.swordRange || 75) + this.r + (this.swordComboStep === 3 ? 35 : 20);

    let targets = [];
    if (this.swordComboStep === 3) {
      targets = this._getAllEnemiesInRadius(reach);
    } else {
      const arc = (this.swordComboStep === 1)
        ? (cfg.hit1ArcAngle || ((140 * Math.PI) / 180))
        : (cfg.hit2ArcAngle || ((150 * Math.PI) / 180));
      targets = this._getTargetsInFrontalArc(reach, arc);
    }

    if (targets.length === 0 && target && !target.isDead) {
      targets = [target];
    }

    if (targets.length > 0) {
      this.swordHitConnected = true;
      const hitPause = this.swordSwingHitPause || 3;
      this.swordHitTremorTimer = hitPause + 1; // Visceral blade tremor during hit-pause!

      // ── THE VISCERAL MEATY FLESH SLAP AUDIO COMBINATION ──
      try {
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('attack_fleshhit', 1.0);  // The authentic visceral fleshy slap!
          audioSystem.playSFX('sukuna_slice', 0.90);     // Razor cutting bite of Split Soul!
          if (this.swordComboStep === 3) {
            audioSystem.playSFX('attack_heavypunch1', 0.95); // Concussive finisher slap!
          }
        }
      } catch (e) {}

      if (this.swordSwingShake > 0 && this.swordSwingShakeDuration > 0) {
        triggerGlobalScreenShake(this.swordSwingShake, this.swordSwingShakeDuration);
      }

      const comboTitles = ['OVERHEAD STRIKE!', 'UNDERHAND UPPERCUT!', 'SPINNING SWEEP!'];
      const comboColors = ['#DC2626', '#8B5CF6', '#F59E0B'];
      spawnFloatingText(this.x, this.y - this.r - 20, comboTitles[this.swordComboStep - 1], comboColors[this.swordComboStep - 1]);

      if (this.kineticCharges < this.maxKineticCharges) {
        this.kineticCharges++;
      }

      const dmg = this.swordSwingDamage || 28;
      const knockback = this.swordSwingKnockback || 6.5;
      const hitStun = this.swordSwingHitStun || 12;

      for (const t of targets) {
        applyDamageToTarget(t, dmg, this, {
          isTrueDamage: true,
          bypassDefense: true,
          damageType: 'slash'
        });

        if (typeof t.applySoulWound === 'function') {
          t.applySoulWound(cfg.soulWoundDuration || 240, cfg.soulWoundHealReduction || 0.75);
        } else {
          t.soulWoundTimer = cfg.soulWoundDuration || 240;
          t.isSoulWounded = true;
        }

        const hitAngle = Math.atan2(t.y - this.y, t.x - this.x);
        t.vx += Math.cos(hitAngle) * knockback;
        t.vy += Math.sin(hitAngle) * knockback;

        if (this.swordComboStep === 2) {
          t.vy -= (cfg.hit2VerticalLift || 4.5);
        }

        if (typeof t.applyTimeStop === 'function') {
          t.applyTimeStop(hitPause);
        }
        if (typeof t.applyHitStun === 'function') {
          t.applyHitStun(hitStun);
        }

        spawnBloodEffect(t.x, t.y, hitAngle, this.swordComboStep === 3 ? 12 : 7);
        spawnSparks(t.x, t.y, this.swordComboStep === 3 ? 8 : 4, '#DC2626');
        if (this.swordComboStep === 3) {
          spawnImpactFlash(t.x, t.y, 45, '#F59E0B');
          spawnGroundScorch(t.x, t.y, 40);
        } else if (this.swordComboStep === 1) {
          spawnGroundScorch(t.x, t.y, 25);
        }
      }
    }
  }

  /**
   * Plays a specific basic attack combo pattern on demand:
   * 1: Hit 1 — Overhead Strike (two-handed downward chop)
   * 2: Hit 2 — Underhand Uppercut (low scoop rising cleave)
   * 3: Hit 3 — Spinning Sweep (full 360° whirlwind spin)
   * @param {number} [step=1] Combo pattern step (1, 2, or 3)
   * @param {object} [target=null] Target entity
   */
  playBasicAttackPattern(step = 1, target = null) {
    const opp = target || {
      x: this.x + Math.cos(this.gunAngle || 0) * 55,
      y: this.y + Math.sin(this.gunAngle || 0) * 55,
      r: 25,
      takeDamage: () => {},
      applyKnockback: () => {},
      applyHitStun: () => {}
    };
    this._performSplitSoulSlash(opp, step);
  }

  /**
   * Universal preview demo attack hook.
   */
  triggerDemoAttack(step = null) {
    const targetStep = (step !== null && step !== undefined) ? step : ((this.swordComboStep % 3) + 1);
    this.playBasicAttackPattern(targetStep);
  }

  /**
  * Skill 1: Dragon-Bone (Ryūhoku) Kinetic Jet Skewer & Throw
  * - Phase 1: Two-handed planted windup with the blade drawn back
  * - Phase 2: High-Speed Impalement Dash pointing katana straight out
  * - Phase 3: Hold the impaled target before hoisting them
  * - Phase 4: Lift the enemy overhead, then chop down and throw them
   */
  /**
   * Clamps an entity position within the active arena bounds (rectangular or circular).
   * Returns { x, y, clamped: boolean, hitLeft: boolean, hitRight: boolean, hitTop: boolean, hitBottom: boolean }
   */
  _clampToArena(x, y, radius = this.r, arena = null) {
    const curArena = arena || (typeof state !== 'undefined' ? state.arena : null) || (typeof CONFIG !== 'undefined' ? CONFIG.arena : null);
    if (!curArena) return { x, y, clamped: false, hitLeft: false, hitRight: false, hitTop: false, hitBottom: false };

    let clamped = false;
    let newX = x;
    let newY = y;
    let hitLeft = false;
    let hitRight = false;
    let hitTop = false;
    let hitBottom = false;
    const r = radius || this.r || 25;

    if (curArena.shape === 'circle' || curArena.radius) {
      const cx = curArena.x + curArena.width / 2;
      const cy = curArena.y + curArena.height / 2;
      const maxDist = (curArena.radius || (curArena.width / 2)) - r;
      const dx = newX - cx;
      const dy = newY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > maxDist && dist > 0) {
        newX = cx + (dx / dist) * maxDist;
        newY = cy + (dy / dist) * maxDist;
        clamped = true;
      }
    } else {
      const minX = curArena.x + r;
      const maxX = curArena.x + curArena.width - r;
      const minY = curArena.y + r;
      const maxY = curArena.y + curArena.height - r;

      if (newX < minX) {
        newX = minX;
        clamped = true;
        hitLeft = true;
      } else if (newX > maxX) {
        newX = maxX;
        clamped = true;
        hitRight = true;
      }

      if (newY < minY) {
        newY = minY;
        clamped = true;
        hitTop = true;
      } else if (newY > maxY) {
        newY = maxY;
        clamped = true;
        hitBottom = true;
      }
    }

    return { x: newX, y: newY, clamped, hitLeft, hitRight, hitTop, hitBottom };
  }

  /**
   * Aligns and locks the impaled enemy directly along the Split Soul Katana blade.
   * Accurately accounts for hand local offsets, facing mirroring, and weapon rotation
   * so the hilt/guard sits at the entry wound and the blade tip protrudes through the exit side.
   * Clamps both target and Maki inside the active arena boundaries so neither ever clips into walls.
   */
  _alignPinnedTargetOnBlade(target, weaponRot = 0, arena = null) {
    if (!target || target.isDead) return;
    target.isPinnedByMaki = true;
    target.isGrabbed = true;
    target.vx = 0;
    target.vy = 0;
    target.knockbackVx = 0;
    target.knockbackVy = 0;

    const curArena = arena || (typeof state !== 'undefined' ? state.arena : null) || (typeof CONFIG !== 'undefined' ? CONFIG.arena : null);

    const facingLeft = Math.abs(Math.atan2(Math.sin(this.gunAngle || 0), Math.cos(this.gunAngle || 0))) > Math.PI / 2;
    const handLocalX = this.r * 0.82;
    const handLocalY = facingLeft ? -this.r * 0.38 : this.r * 0.38;
    const cosA = Math.cos(this.gunAngle || 0);
    const sinA = Math.sin(this.gunAngle || 0);
    const handWorldX = this.x + cosA * handLocalX - sinA * handLocalY;
    const handWorldY = this.y + sinA * handLocalX + cosA * handLocalY;

    // Blade angle in world space
    const bladeWorldAngle = (this.gunAngle || 0) + (facingLeft ? -weaponRot : weaponRot);

    // Position enemy circle center along the blade shaft
    const targetR = target.r || 25;
    const distCenter = (CONFIG.maki?.dragonBonePinGapPx ?? 24) + targetR;

    let targetX = handWorldX + Math.cos(bladeWorldAngle) * distCenter;
    let targetY = handWorldY + Math.sin(bladeWorldAngle) * distCenter;

    // Boundary check: If the pinned enemy would be pushed outside arena boundaries,
    // push Maki and the target back into the arena so the target is stopped flush at the wall.
    if (curArena) {
      const clampedTarget = this._clampToArena(targetX, targetY, targetR, curArena);
      if (clampedTarget.clamped) {
        const shiftX = clampedTarget.x - targetX;
        const shiftY = clampedTarget.y - targetY;
        this.x += shiftX;
        this.y += shiftY;
        const clampedMaki = this._clampToArena(this.x, this.y, this.r, curArena);
        this.x = clampedMaki.x;
        this.y = clampedMaki.y;

        const newHandWorldX = this.x + cosA * handLocalX - sinA * handLocalY;
        const newHandWorldY = this.y + sinA * handLocalX + cosA * handLocalY;
        targetX = newHandWorldX + Math.cos(bladeWorldAngle) * distCenter;
        targetY = newHandWorldY + Math.sin(bladeWorldAngle) * distCenter;
        const finalTarget = this._clampToArena(targetX, targetY, targetR, curArena);
        targetX = finalTarget.x;
        targetY = finalTarget.y;
      }

      // Check interior center obstacle
      resolveEntityPlusObstacleCollision(target, curArena);
      resolveEntityPlusObstacleCollision(this, curArena);
    }

    target.x = targetX;
    target.y = targetY;

    // Store pinned references for top-layer overlay rendering
    target._makiPinnedBladeAngle = bladeWorldAngle;
    target._makiPinnedBy = this;
  }

  get aimTurnRate() {
    if (this.dragonBoneActive && this.dragonBonePhase === 'windup') {
      return CONFIG.maki?.dragonBoneWindupAimTurnRate ?? 0.12;
    }
    return undefined;
  }

  _castDragonBone(opponent) {
    if (!opponent) return;
    const curArena = (typeof state !== 'undefined' ? state.arena : null) || (typeof CONFIG !== 'undefined' ? CONFIG.arena : null);
    if (curArena) {
      const clamped = this._clampToArena(this.x, this.y, this.r, curArena);
      this.x = clamped.x;
      this.y = clamped.y;
    }
    this.dragonBoneActive = true;
    this.dragonBoneCooldown = this.dragonBoneCooldownMax;
    this.dragonBonePhase = 'windup';
    this.dragonBonePhaseTimer = 0;
    this.dragonBonePhaseMax = CONFIG.maki?.dragonBoneWindupFrames || 12;
    this.dragonBoneTarget = null;
    const startingAngle = Number.isFinite(this.gunAngle) ? this.gunAngle : (this.angle || 0);
    this.dragonBoneTargetAngle = startingAngle;
    this.gunAngle = startingAngle;
    this.angle = startingAngle;

    spawnFloatingText(this.x, this.y - 30, 'RYŪHOKU JET!', '#F59E0B');
  }

  _updateDragonBone(opponent, arena) {
    this.dragonBonePhaseTimer++;
    const cfg = CONFIG.maki || {};
    const curArena = arena || (typeof state !== 'undefined' ? state.arena : null) || (typeof CONFIG !== 'undefined' ? CONFIG.arena : null);

    // ──────────────────────────────────────────
    // PHASE 1: PLANTED TWO-HANDED WINDUP
    // ──────────────────────────────────────────
    if (this.dragonBonePhase === 'windup') {
      this.vx = 0;
      this.vy = 0;
      if (curArena) {
        const clamped = this._clampToArena(this.x, this.y, this.r, curArena);
        this.x = clamped.x;
        this.y = clamped.y;
      }
      if (opponent && !opponent.isDead) {
        this.aim(opponent);
      }
      if (Number.isFinite(this.gunAngle)) {
        this.dragonBoneTargetAngle = this.gunAngle;
      }

      if (this.dragonBonePhaseTimer >= this.dragonBonePhaseMax) {
        this.dragonBoneTargetAngle = this.gunAngle;
        this.dragonBonePhase = 'dash';
        this.dragonBonePhaseTimer = 0;
        this.dragonBonePhaseMax = cfg.dragonBoneDashFrames || 16;
        triggerGlobalScreenShake(3, 10);
        audioSystem.playSFX('skill_dash', 0.9);
      }
    }
    // ──────────────────────────────────────────
    // PHASE 2: HIGH-SPEED JET SKEWER DASH
    // ──────────────────────────────────────────
    else if (this.dragonBonePhase === 'dash') {
      const speed = (cfg.dragonBoneDashSpeed || 19.0) * (1.0 + this.kineticCharges * 0.20);
      this.vx = Math.cos(this.dragonBoneTargetAngle) * speed;
      this.vy = Math.sin(this.dragonBoneTargetAngle) * speed;

      this.x += this.vx;
      this.y += this.vy;

      // Keep aim committed along dash angle
      this.gunAngle = this.dragonBoneTargetAngle;

      // Motion trail afterimages during dash
      if (this.dragonBonePhaseTimer % 2 === 0) {
        this._spawnAfterimage(2, 10);
      }

      // Check boundary collisions
      let hitWall = false;
      if (curArena) {
        const clampedMaki = this._clampToArena(this.x, this.y, this.r, curArena);
        if (clampedMaki.clamped) {
          hitWall = true;
          this.x = clampedMaki.x;
          this.y = clampedMaki.y;
        }
        if (resolveEntityPlusObstacleCollision(this, curArena)) {
          hitWall = true;
        }
      }

      // Check collision / impalement along frontal blade tip
      const reach = this.r + 52;
      const targets = this._getTargetsInFrontalArc(reach, (65 * Math.PI) / 180);
      if (targets.length > 0) {
        const hitTarget = targets[0];
        this.dragonBoneTarget = hitTarget;
        hitTarget.isPinnedByMaki = true;
        hitTarget.isGrabbed = true;
        hitTarget.vx = 0;
        hitTarget.vy = 0;
        hitTarget.knockbackVx = 0;
        hitTarget.knockbackVy = 0;

        this.dragonBonePhase = 'stab';
        this.dragonBonePhaseTimer = 0;
        this.dragonBonePhaseMax = cfg.dragonBoneStabFrames || 10;

        // Halt Maki's dash velocity upon impalement
        this.vx = 0;
        this.vy = 0;

        // Center enemy directly onto the blade shaft with arena safety clamping
        this._alignPinnedTargetOnBlade(hitTarget, 0.0, curArena);

        // Apply initial pierce true damage (suppress knockback)
        const pierceDmg = cfg.dragonBonePierceDamage || 25;
        applyDamageToTarget(hitTarget, pierceDmg, this, {
          isTrueDamage: true,
          bypassDefense: true,
          damageType: 'pierce',
          skipKnockback: true,
          noHitSound: true
        });

        if (typeof hitTarget.applyHitStun === 'function') {
          hitTarget.applyHitStun(
            this.dragonBonePhaseMax + (cfg.dragonBonePunchFrames || 18) + (cfg.dragonBoneLaunchFrames || 36) + 20
          );
        }

        spawnBloodEffect(hitTarget.x, hitTarget.y, this.dragonBoneTargetAngle, 10);
        spawnSparks(hitTarget.x, hitTarget.y, 8, '#DC2626');
        spawnImpactFlash(hitTarget.x, hitTarget.y, 45, '#F59E0B');
        triggerGlobalScreenShake(5, 10);
        audioSystem.playSFX('sword_slash_heavy', 0.95);
        spawnFloatingText(hitTarget.x, hitTarget.y - 25, 'IMPALED!', '#DC2626');
        return;
      }

      // Wall impact without impalement: gracefully halt the dash early so Maki never clips through the wall!
      if (hitWall) {
        spawnSparks(this.x, this.y, 8, '#F59E0B');
        triggerGlobalScreenShake(3, 8);
        try {
          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            audioSystem.playSFX('attack_fleshhit', 0.8);
          }
        } catch (e) {}
        this.dragonBoneActive = false;
        this.dragonBonePhase = null;
        this.vx = 0;
        this.vy = 0;
        return;
      }

      // Dash time-out without hitting anyone (whiff)
      if (this.dragonBonePhaseTimer >= this.dragonBonePhaseMax) {
        this.dragonBoneActive = false;
        this.dragonBonePhase = null;
        this.vx *= 0.3;
        this.vy *= 0.3;
      }
    }
    // ──────────────────────────────────────────
    // PHASE 3: HOLD THE IMPALED TARGET ON THE BLADE
    // ──────────────────────────────────────────
    else if (this.dragonBonePhase === 'stab') {
      const target = this.dragonBoneTarget;
      const maxT = this.dragonBonePhaseMax || cfg.dragonBoneStabFrames || 10;

      this.vx = 0;
      this.vy = 0;
      if (target && !target.isDead) {
        this._alignPinnedTargetOnBlade(target, 0.0, curArena);
      }

      if (this.dragonBonePhaseTimer >= maxT) {
        this.dragonBonePhase = 'punch';
        this.dragonBonePhaseTimer = 0;
        this.dragonBonePhaseMax = cfg.dragonBonePunchFrames || 18;
      }
    }
    // ──────────────────────────────────────────
    // PHASE 4: BRUTAL CONCUSSIVE PUNCH & LAUNCH
    // ──────────────────────────────────────────
    else if (this.dragonBonePhase === 'punch') {
      const target = this.dragonBoneTarget;
      const maxT = this.dragonBonePhaseMax || cfg.dragonBonePunchFrames || 18;
      const impactFrame = Math.max(1, Math.floor(maxT * 0.35));

      this.vx = 0;
      this.vy = 0;

      // Enemy remains pinned to the blade until the punch connects
      if (this.dragonBonePhaseTimer < impactFrame) {
        if (target && !target.isDead) {
          this._alignPinnedTargetOnBlade(target, 0.0, curArena);
        }
      } else if (this.dragonBonePhaseTimer === impactFrame) {
        // Punch connects! Heavy punch damage, dislodge from blade, push away, and initiate launching tick damage
        this._executeDragonBonePunch(target, curArena);
      }

      if (this.dragonBonePhaseTimer >= maxT) {
        this.dragonBoneActive = false;
        this.dragonBonePhase = null;
        if (this.dragonBoneTarget) {
          this.dragonBoneTarget.isPinnedByMaki = false;
          this.dragonBoneTarget.isGrabbed = false;
          this.dragonBoneTarget._makiPinnedBladeAngle = null;
          this.dragonBoneTarget._makiPinnedBy = null;
          this.dragonBoneTarget = null;
        }
      }
    }
    // Backward compatibility fallback branches for legacy external calls
    else if (this.dragonBonePhase === 'lift') {
      this.dragonBonePhase = 'punch';
      this.dragonBonePhaseTimer = 0;
      this.dragonBonePhaseMax = cfg.dragonBonePunchFrames || 18;
    }
    else if (this.dragonBonePhase === 'throw') {
      const target = this.dragonBoneTarget;
      const maxT = this.dragonBonePhaseMax || cfg.dragonBonePunchFrames || 18;
      const impactFrame = Math.max(1, Math.floor(maxT * 0.35));
      if (this.dragonBonePhaseTimer === impactFrame) {
        this._executeDragonBonePunch(target, curArena);
      }
      if (this.dragonBonePhaseTimer >= maxT) {
        this.dragonBoneActive = false;
        this.dragonBonePhase = null;
        this.dragonBoneTarget = null;
      }
    }
    else if (this.dragonBonePhase === 'groundPin') {
      this.dragonBoneActive = false;
      this.dragonBonePhase = null;
      this.dragonBoneTarget = null;
    }
  }

  _executeDragonBonePunch(target, arena = null) {
    const cfg = CONFIG.maki || {};
    const basePunchDmg = cfg.dragonBonePunchDamage || cfg.dragonBoneBaseDamage || 60;
    const bonusDmg = (this.kineticCharges / this.maxKineticCharges) * ((cfg.dragonBoneMaxDamage || 120) - basePunchDmg);
    const totalPunchDmg = Math.round(basePunchDmg + bonusDmg * 0.5);

    const launchSpeed = (cfg.dragonBoneLaunchSpeed || cfg.dragonBoneThrowSpeed || 22.0)
      * (cfg.dragonBoneThrowDistanceMultiplier ?? 1.5)
      * (1.0 + this.kineticCharges * 0.25);
    const launchAngle = this.gunAngle || this.angle || 0;
    const curArena = arena || (typeof state !== 'undefined' ? state.arena : null) || (typeof CONFIG !== 'undefined' ? CONFIG.arena : null);

    if (target && !target.isDead) {
      // 1. Dislodge enemy from being stabbed on the Split Soul Katana
      target.isPinnedByMaki = false;
      target.isGrabbed = false;
      target._makiPinnedBladeAngle = null;
      target._makiPinnedBy = null;

      // Ensure target is clamped inside arena before applying launch impulse
      if (curArena) {
        const clampedTarget = this._clampToArena(target.x, target.y, target.r || 25, curArena);
        target.x = clampedTarget.x;
        target.y = clampedTarget.y;
        resolveEntityPlusObstacleCollision(target, curArena);
      }

      // 2. Deliver Heavy Concussive Punch True Damage
      applyDamageToTarget(target, totalPunchDmg, this, {
        isTrueDamage: true,
        bypassDefense: true,
        damageType: 'heavy_punch'
      });

      // Soul Wound infliction
      if (typeof target.applySoulWound === 'function') {
        target.applySoulWound(cfg.soulWoundDuration || 240, cfg.soulWoundHealReduction || 0.75);
      } else {
        target.soulWoundTimer = cfg.soulWoundDuration || 240;
        target.isSoulWounded = true;
      }

      // 3. Launch the enemy backward from the punch
      const launchVx = Math.cos(launchAngle) * launchSpeed;
      const launchVy = Math.sin(launchAngle) * launchSpeed;
      target.vx = 0;
      target.vy = 0;
      target.knockbackVx = 0;
      target.knockbackVy = 0;
      if (typeof target.applyKnockback === 'function') {
        target.applyKnockback(launchVx, launchVy);
      } else {
        target.vx = launchVx;
        target.vy = launchVy;
        target.knockbackVx = launchVx;
        target.knockbackVy = launchVy;
      }

      if (typeof target.applySlow === 'function') {
        target.applySlow(
          cfg.dragonBoneThrowSlowFrames ?? 45,
          cfg.dragonBoneThrowSlowMultiplier ?? 0.65
        );
      }

      if (typeof target.applyHitStun === 'function') {
        target.applyHitStun(35);
      }

      // 4. Register for Launching Tick Damage
      const launchFrames = cfg.dragonBoneLaunchFrames || 36;
      const tickInterval = cfg.dragonBoneLaunchTickInterval || 4;
      const tickDmg = cfg.dragonBoneLaunchTickDamage || 8;

      if (!this.makiLaunchedTargets) {
        this.makiLaunchedTargets = [];
      }
      this.makiLaunchedTargets.push({
        target,
        timer: launchFrames,
        maxTimer: launchFrames,
        tickInterval,
        tickDamage: tickDmg,
        angle: launchAngle,
        hitWallTriggered: false
      });

      // 5. Concussive Punch Impact VFX & Audio
      const punchHitX = this.x + Math.cos(launchAngle) * (this.r + 20);
      const punchHitY = this.y + Math.sin(launchAngle) * (this.r + 20);
      spawnBloodEffect(target.x, target.y, launchAngle, 14);
      spawnSparks(punchHitX, punchHitY, 12, '#FFFFFF');
      spawnImpactFlash(punchHitX, punchHitY, 48, '#F59E0B');
      spawnFloatingText(punchHitX, punchHitY - 30, 'HEAVENLY BRUTAL PUNCH!', '#F59E0B');
    }

    triggerGlobalScreenShake(6, 12);
    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('attack_heavypunch1', 1.0);
        audioSystem.playSFX('attack_fleshhit', 1.0);
        audioSystem.playSFX('sword_slash_heavy', 0.85);
      }
    } catch (e) {}

    // Consume stored kinetic charges
    this.kineticCharges = 0;
  }

  _executeDragonBoneThrow(target, arena = null) {
    return this._executeDragonBonePunch(target, arena);
  }

  /**
   * Applies continuous tick damage to launched enemies while flying through the air.
   */
  _updateMakiLaunchedTargets(arena) {
    if (!this.makiLaunchedTargets || this.makiLaunchedTargets.length === 0) return;

    const curArena = arena || (typeof state !== 'undefined' ? state.arena : null) || (typeof CONFIG !== 'undefined' ? CONFIG.arena : null);

    for (let i = this.makiLaunchedTargets.length - 1; i >= 0; i--) {
      const entry = this.makiLaunchedTargets[i];
      const t = entry.target;

      if (!t || t.isDead || t.hp <= 0) {
        this.makiLaunchedTargets.splice(i, 1);
        continue;
      }

      // Check boundary wall impact during launch
      let hitWall = false;
      if (curArena) {
        const tr = t.r || 25;
        if (t.x <= curArena.x + tr + 2 || t.x >= curArena.x + curArena.width - tr - 2 ||
            t.y <= curArena.y + tr + 2 || t.y >= curArena.y + curArena.height - tr - 2) {
          hitWall = true;
        }
      }

      // Apply launch flight tick damage
      if (entry.timer % entry.tickInterval === 0) {
        applyDamageToTarget(t, entry.tickDamage, this, {
          isTrueDamage: true,
          bypassDefense: true,
          damageType: 'soul_rend'
        });

        // Visceral blood and kinetic friction particles
        spawnBloodEffect(t.x, t.y, entry.angle, 3);
        spawnSparks(t.x, t.y, 2, '#014913ff');
      }

      // Wall slam reaction
      if (hitWall && !entry.hitWallTriggered) {
        entry.hitWallTriggered = true;
        triggerGlobalScreenShake(4, 8);
        try {
          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            audioSystem.playSFX('attack_fleshhit', 0.9);
          }
        } catch (e) {}
        spawnGroundScorch(t.x, t.y, 28);
        spawnSparks(t.x, t.y, 6, '#F59E0B');
        applyDamageToTarget(t, Math.round(entry.tickDamage * 1.5), this, {
          isTrueDamage: true,
          bypassDefense: true,
          damageType: 'wall_impact'
        });
      }

      entry.timer--;
      if (entry.timer <= 0) {
        this.makiLaunchedTargets.splice(i, 1);
      }
    }
  }

  /**
   * Skill 2: Zen'in Annihilation Riposte Stance
   */
  _castRiposte() {
    this.riposteActive = true;
    this.riposteCooldown = this.riposteCooldownMax;
    this.riposteTimer = CONFIG.maki?.riposteStanceFrames || 22;
    spawnFloatingText(this.x, this.y - 30, 'SEVERING STANCE', '#DC2626');
  }

  _updateRiposte(opponent) {
    this.riposteTimer--;
    if (this.riposteTimer <= 0) {
      this.riposteActive = false;
    }
  }

  /**
   * Triggered when Maki parries an incoming attack during Riposte stance.
   */
  triggerRiposteCounter(attacker) {
    if (!this.riposteActive || !attacker) return false;
    this.riposteActive = false;

    // Teleport behind attacker with arena boundary safety
    const curArena = (typeof state !== 'undefined' ? state.arena : null) || (typeof CONFIG !== 'undefined' ? CONFIG.arena : null);
    const backAngle = (attacker.gunAngle || 0) + Math.PI;
    const rawX = attacker.x + Math.cos(backAngle) * 45;
    const rawY = attacker.y + Math.sin(backAngle) * 45;
    const clampedPos = this._clampToArena(rawX, rawY, this.r, curArena);
    this.x = clampedPos.x;
    this.y = clampedPos.y;
    if (curArena) {
      resolveEntityPlusObstacleCollision(this, curArena);
    }
    this.aim(attacker);

    // Deliver Vertical Bisection Cleave
    const dmg = CONFIG.maki?.riposteDamage || 70;
    applyDamageToTarget(attacker, dmg, this, {
      isTrueDamage: true,
      bypassDefense: true
    });

    if (typeof attacker.applyHitStun === 'function') {
      attacker.applyHitStun(CONFIG.maki?.riposteStaggerFrames || 45);
    }
    attacker.silenceTimer = CONFIG.maki?.riposteSilenceDuration || 90;

    spawnFloatingText(attacker.x, attacker.y - 35, 'SOUL BISECTION!', '#DC2626');
    spawnSparks(attacker.x, attacker.y, 12, '#FFFFFF');
    triggerGlobalScreenShake(6, 14);
    return true;
  }

  /**
   * Passive: Atmospheric Surface Stepping (Mid-air 360° pivot)
   */
  _triggerAirStep(target) {
    this.isAirStepping = true;
    this.airStepCooldown = this.airStepCooldownMax;
    this.airStepTimer = CONFIG.maki?.airStepDuration || 90;
    this.speed = this.baseSpeed * (CONFIG.maki?.airStepSpeedMultiplier || 1.30);

    const angle = target ? Math.atan2(target.y - this.y, target.x - this.x) : Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    spawnFloatingText(this.x, this.y - 25, 'AIR STEP', '#8B5CF6');
  }

  _updateAirStepping() {
    this.airStepTimer--;
    if (this.airStepTimer <= 0) {
      this.isAirStepping = false;
      this.speed = this.baseSpeed;
    }
  }

  /**
   * Ultimate: Sakurajima Awakening ("Everything is Visible")
   */
  _castUltimate(opponent) {
    if (!opponent) return;
    this.ultimateActive = true;
    this.ultimateCooldown = this.ultimateCooldownMax;
    this.ultimatePhase = 'flow';
    this.ultimateTimer = 0;
    this.ultimateTarget = opponent;
    this.ultimateFlurryStep = 0;

    spawnFloatingText(this.x, this.y - 40, 'EVERYTHING IS VISIBLE', '#8B5CF6');
    triggerGlobalScreenShake(10, 20);
  }

  _updateUltimate(opponent, arena) {
    this.ultimateTimer++;
    const target = this.ultimateTarget || opponent;
    if (!target || target.isDead) {
      this.ultimateActive = false;
      return;
    }

    if (this.ultimatePhase === 'flow') {
      if (this.ultimateTimer >= 20) {
        this.ultimatePhase = 'flurry';
        this.ultimateTimer = 0;
      }
    } else if (this.ultimatePhase === 'flurry') {
      if (this.ultimateTimer % 12 === 0 && this.ultimateFlurryStep < 3) {
        this.ultimateFlurryStep++;
        const angle = (this.ultimateFlurryStep * (Math.PI * 2 / 3));
        const rawX = target.x + Math.cos(angle) * 50;
        const rawY = target.y + Math.sin(angle) * 50;
        const clampedPos = this._clampToArena(rawX, rawY, this.r, arena);
        this.x = clampedPos.x;
        this.y = clampedPos.y;
        if (arena) resolveEntityPlusObstacleCollision(this, arena);
        this.aim(target);

        applyDamageToTarget(target, CONFIG.maki?.flurryHitDamage || 35, this, {
          isTrueDamage: true,
          bypassDefense: true
        });
        spawnBloodEffect(target.x, target.y, angle, 6);
        triggerGlobalScreenShake(3, 6);
      }
      if (this.ultimateFlurryStep >= 3 && this.ultimateTimer >= 45) {
        this.ultimatePhase = 'execute';
        this.ultimateTimer = 0;
      }
    } else if (this.ultimatePhase === 'execute') {
      if (this.ultimateTimer === 10) {
        // Drop from above with bisecting soul cleave
        const rawX = target.x;
        const rawY = target.y - 20;
        const clampedPos = this._clampToArena(rawX, rawY, this.r, arena);
        this.x = clampedPos.x;
        this.y = clampedPos.y;
        if (arena) resolveEntityPlusObstacleCollision(this, arena);
        this.aim(target);

        applyDamageToTarget(target, CONFIG.maki?.executionCleaveDamage || 120, this, {
          isTrueDamage: true,
          bypassDefense: true
        });

        // Obliterate enemy summons / illusions
        this._destroyAllActiveSummons();

        spawnImpactFlash(target.x, target.y, 180, '#DC2626');
        spawnGroundScorch(target.x, target.y, 60);
        triggerGlobalScreenShake(12, 24);
      }
      if (this.ultimateTimer >= 35) {
        this.ultimateActive = false;
        this.ultimatePhase = null;
      }
    }
  }

  _destroyAllActiveSummons() {
    if (typeof state === 'undefined') return;
    if (Array.isArray(state.illusions)) {
      state.illusions.length = 0;
    }
    if (Array.isArray(state.fighters)) {
      for (const f of state.fighters) {
        if (f !== this && (f.isMinion || f.isClone || f.isSummon || f.isIllusion)) {
          applyDamageToTarget(f, 9999, this, { isTrueDamage: true });
        }
      }
    }
  }

  takeDamage(amount, attacker, hitContext = {}) {
    // Riposte counter check
    if (this.riposteActive && attacker) {
      const countered = this.triggerRiposteCounter(attacker);
      if (countered) return 0;
    }

    // Passive Flow Dodge Check
    const dodgeRate = this.isInFlowState ? (CONFIG.maki?.flowStateDodgeChance || 0.40) : (CONFIG.maki?.dodgeChance || 0.15);
    if (Math.random() < dodgeRate) {
      spawnFloatingText(this.x, this.y - 25, 'FLOW DODGE!', '#8B5CF6');
      return 0;
    }

    // Kinetic Storage from absorbed hits
    if (this.kineticCharges < this.maxKineticCharges) {
      this.kineticCharges++;
    }

    return super.takeDamage(amount, attacker, hitContext);
  }

  _getTargetsInFrontalArc(reach, arcAngle) {
    const targets = [];
    const entities = [];
    if (typeof state !== 'undefined') {
      if (Array.isArray(state.fighters)) entities.push(...state.fighters);
      if (Array.isArray(state.illusions)) entities.push(...state.illusions);
    }

    for (const ent of entities) {
      if (ent === this || ent.isDead) continue;
      if (this.team !== undefined && ent.team !== undefined && this.team === ent.team) continue;

      const dx = ent.x - this.x;
      const dy = ent.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > reach + (ent.r || 25)) continue;

      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = targetAngle - (this.gunAngle || 0);
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) <= arcAngle / 2) {
        targets.push(ent);
      }
    }
    return targets;
  }

  _getAllEnemiesInRadius(radius) {
    const targets = [];
    const entities = [];
    if (typeof state !== 'undefined') {
      if (Array.isArray(state.fighters)) entities.push(...state.fighters);
      if (Array.isArray(state.illusions)) entities.push(...state.illusions);
    }

    for (const ent of entities) {
      if (ent === this || ent.isDead) continue;
      if (this.team !== undefined && ent.team !== undefined && this.team === ent.team) continue;

      const dist = Math.hypot(ent.x - this.x, ent.y - this.y);
      if (dist <= radius + (ent.r || 25)) {
        targets.push(ent);
      }
    }
    return targets;
  }

  _spawnAfterimage(count = 2, spacing = 8) {
    if (!this.afterImages) this.afterImages = [];
    const angle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
    for (let i = 1; i <= count; i++) {
      this.afterImages.push({
        x: this.x - Math.cos(angle) * (i * spacing),
        y: this.y - Math.sin(angle) * (i * spacing),
        angle: angle,
        alpha: Math.max(0.18, 0.55 - (i * 0.07))
      });
    }
    if (this.afterImages.length > 14) {
      this.afterImages.splice(0, this.afterImages.length - 14);
    }
  }

  interruptAttacks(force = false) {
    if (this.dragonBoneTarget) {
      this.dragonBoneTarget.isPinnedByMaki = false;
      this.dragonBoneTarget.isGrabbed = false;
      this.dragonBoneTarget._makiPinnedBladeAngle = null;
      this.dragonBoneTarget._makiPinnedBy = null;
      this.dragonBoneTarget = null;
    }
    this.dragonBoneActive = false;
    this.dragonBonePhase = null;
    super.interruptAttacks(force);
  }

  onDeath() {
    if (this.dragonBoneTarget) {
      this.dragonBoneTarget.isPinnedByMaki = false;
      this.dragonBoneTarget.isGrabbed = false;
      this.dragonBoneTarget._makiPinnedBladeAngle = null;
      this.dragonBoneTarget._makiPinnedBy = null;
      this.dragonBoneTarget = null;
    }
    this.dragonBoneActive = false;
    this.dragonBonePhase = null;
    super.onDeath();
  }

  drawBody(ctx) {
    drawMakiSkin(ctx, this);
  }

  /**
   * Overrides base Fighter.shoot() to suppress default generic bullet projectiles (Rule 23).
   */
  shoot(ownerIndex) {
    // Intentionally empty: Maki uses dedicated melee sword combos & Dragon-Bone skills
  }

  /**
   * Overrides base gun rendering to prevent drawing the default generic gun and duplicate hand.
   */
  drawGun(ctx) {
    // Intentionally empty: Maki wields her Split Soul Katana & Dragon-Bone
  }

  draw(ctx, opponent) {
    // Render ghost afterimages behind Maki
    if (this.afterImages && this.afterImages.length > 0) {
      for (const img of this.afterImages) {
        drawMakiGhostSkin(ctx, img.x, img.y, img.angle, this.r, img.alpha);
      }
    }

    super.draw(ctx, opponent);

    // Rule 21: Mandatory In-Game Overlay HP & Status Drawing
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
