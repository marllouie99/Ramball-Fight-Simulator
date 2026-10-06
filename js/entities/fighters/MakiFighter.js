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
    this.afterImages = [];

    // Skill 1: Dragon-Bone Kinetic Jet Skewer & Throw
    this.kineticCharges = 0;
    this.maxKineticCharges = cfg.maxKineticCharges || 3;
    this.dragonBoneCooldown = 0;
    this.dragonBoneCooldownMax = cfg.dragonBoneCooldown || 420;
    this.dragonBoneActive = false;
    this.dragonBonePhase = null; // 'windup', 'dash', 'stab', 'lift', 'throw'
    this.dragonBonePhaseTimer = 0;
    this.dragonBonePhaseMax = CONFIG.maki?.dragonBoneWindupFrames || 12;
    this.dragonBoneTarget = null;
    this.dragonBoneTargetAngle = 0;

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
        name: 'DRAGON SKEWER THROW',
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
    this.afterImages = [];
    this.kineticCharges = 0;
    this.dragonBoneCooldown = 0;
    this.dragonBoneActive = false;
    this.dragonBonePhase = null;
    this.dragonBonePhaseTimer = 0;
    this.dragonBonePhaseMax = CONFIG.maki?.dragonBoneWindupFrames || 12;
    this.dragonBoneTarget = null;
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
        img.alpha -= 0.055;
        if (img.alpha <= 0) {
          this.afterImages.splice(i, 1);
        }
      }
    }

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
      this.swordSwingTimer--;
      if (this.swordComboStep === 3) {
        this.isSpinning = true;
      }
    } else if (!this.dragonBoneActive && !this.ultimateActive) {
      this.isSpinning = false;
    }

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
    if (this.dragonBoneActive && ['windup', 'stab', 'lift', 'throw'].includes(this.dragonBonePhase)) {
      return true;
    }
    return super.isStationarySkillActive();
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
  _performSplitSoulSlash(opponent) {
    if (!opponent) return;

    this.swordComboStep = (this.swordComboStep % 3) + 1;
    this.swordComboResetTimer = 95;

    const angle = this.gunAngle || Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.swordSlashAngle = angle;

    const cfg = CONFIG.maki || {};
    let dmg = cfg.swordDamage || 28;
    let knockback = cfg.swordKnockback || 6.5;
    let maxSwingFrames = 22;

    if (this.swordComboStep === 1) {
      maxSwingFrames = 22;
      this.swordCooldown = cfg.swordCooldown || 38;
      // Hit 1: The Overhead Strike - Heavy downward lunging step
      this.vx += Math.cos(angle) * 4.2;
      this.vy += Math.sin(angle) * 4.2;
      this._spawnAfterimage(2, 6);
      audioSystem.playSFX('sword_slash_heavy', 0.9);
    } else if (this.swordComboStep === 2) {
      maxSwingFrames = 24;
      dmg = cfg.comboHit2Damage || 34;
      knockback = 8.5;
      this.swordCooldown = 42;
      // Hit 2: The Underhand Uppercut - Deep rising step
      this.vx += Math.cos(angle) * 5.4;
      this.vy += Math.sin(angle) * 5.4;
      this._spawnAfterimage(3, 8);
      audioSystem.playSFX('sword_slash_heavy', 0.95);
    } else if (this.swordComboStep === 3) {
      maxSwingFrames = 28;
      dmg = cfg.comboHit3Damage || 52;
      knockback = 16.0;
      this.swordCooldown = 55;
      this.isSpinning = true;
      // Hit 3: The Spinning Sweep - High-velocity 360° whirlwind surge
      this.vx += Math.cos(angle) * 6.2;
      this.vy += Math.sin(angle) * 6.2;
      this._spawnAfterimage(4, 10);
      audioSystem.playSFX('attack_heavyhit', 1.0);
    }

    this.swordSwingTimer = maxSwingFrames;
    this.swordSwingMax = maxSwingFrames;

    // Target Detection: 360° radius for Spinning Sweep (Hit 3), frontal arc for Hits 1 & 2
    let targets = [];
    const reach = (cfg.swordRange || 72) + this.r + (this.swordComboStep === 3 ? 35 : 20);

    if (this.swordComboStep === 3) {
      targets = this._getAllEnemiesInRadius(reach);
    } else {
      const arc = (this.swordComboStep === 1) ? ((140 * Math.PI) / 180) : ((150 * Math.PI) / 180);
      targets = this._getTargetsInFrontalArc(reach, arc);
    }

    for (const target of targets) {
      // True Damage bypassing armor / shields
      applyDamageToTarget(target, dmg, this, {
        isTrueDamage: true,
        bypassDefense: true,
        damageType: 'slash'
      });

      // Inflict Soul Wound (Anti-Heal & True DOT)
      if (typeof target.applySoulWound === 'function') {
        target.applySoulWound(cfg.soulWoundDuration || 240, cfg.soulWoundHealReduction || 0.75);
      } else {
        target.soulWoundTimer = cfg.soulWoundDuration || 240;
        target.isSoulWounded = true;
      }

      // Physics Push & Hit-Stun based on Combo Step
      const hitAngle = Math.atan2(target.y - this.y, target.x - this.x);
      target.vx += Math.cos(hitAngle) * knockback;
      target.vy += Math.sin(hitAngle) * knockback;

      // Hit 2 lifts the target slightly airborne
      if (this.swordComboStep === 2) {
        target.vy -= 4.5;
      }

      const hitStunFrames = this.swordComboStep === 3 ? 22 : (this.swordComboStep === 2 ? 14 : 10);
      if (typeof target.applyHitStun === 'function') {
        target.applyHitStun(hitStunFrames);
      }

      // Visual blood & spark flares
      spawnBloodEffect(target.x, target.y, hitAngle, this.swordComboStep === 3 ? 12 : 7);
      spawnSparks(target.x, target.y, this.swordComboStep === 3 ? 8 : 4, '#DC2626');
      if (this.swordComboStep === 3) {
        spawnImpactFlash(target.x, target.y, 45, '#F59E0B');
        spawnGroundScorch(target.x, target.y, 40);
      } else if (this.swordComboStep === 1) {
        spawnGroundScorch(target.x, target.y, 25);
      }
    }

    // Kinetic Storage on hit
    if (targets.length > 0 && this.kineticCharges < this.maxKineticCharges) {
      this.kineticCharges++;
    }

    if (targets.length > 0) {
      const shakeIntensity = this.swordComboStep === 3 ? 6 : (this.swordComboStep === 2 ? 3 : 2);
      const shakeDuration = this.swordComboStep === 3 ? 12 : 8;
      triggerGlobalScreenShake(shakeIntensity, shakeDuration);

      const comboTitles = ['OVERHEAD STRIKE!', 'UNDERHAND UPPERCUT!', 'SPINNING SWEEP!'];
      const comboColors = ['#DC2626', '#8B5CF6', '#F59E0B'];
      spawnFloatingText(this.x, this.y - this.r - 20, comboTitles[this.swordComboStep - 1], comboColors[this.swordComboStep - 1]);
    }
  }

  /**
  * Skill 1: Dragon-Bone (Ryūhoku) Kinetic Jet Skewer & Throw
  * - Phase 1: Two-handed planted windup with the blade drawn back
  * - Phase 2: High-Speed Impalement Dash pointing katana straight out
  * - Phase 3: Hold the impaled target before hoisting them
  * - Phase 4: Lift the enemy overhead, then chop down and throw them
   */
  /**
   * Aligns and locks the impaled enemy directly along the Split Soul Katana blade.
   * Accurately accounts for hand local offsets, facing mirroring, and weapon rotation
   * so the hilt/guard sits at the entry wound and the blade tip protrudes through the exit side.
   */
  _alignPinnedTargetOnBlade(target, weaponRot = 0) {
    if (!target || target.isDead) return;
    target.isPinnedByMaki = true;
    target.isGrabbed = true;
    target.vx = 0;
    target.vy = 0;
    target.knockbackVx = 0;
    target.knockbackVy = 0;

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

    target.x = handWorldX + Math.cos(bladeWorldAngle) * distCenter;
    target.y = handWorldY + Math.sin(bladeWorldAngle) * distCenter;

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

    // ──────────────────────────────────────────
    // PHASE 1: PLANTED TWO-HANDED WINDUP
    // ──────────────────────────────────────────
    if (this.dragonBonePhase === 'windup') {
      this.vx = 0;
      this.vy = 0;
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

        // Center enemy directly onto the blade shaft
        this._alignPinnedTargetOnBlade(hitTarget, 0.0);

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
            this.dragonBonePhaseMax + (cfg.dragonBoneLiftFrames || 30) + (cfg.dragonBoneThrowFrames ?? cfg.dragonBoneSlamFrames ?? 14) + 20
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
      const maxT = this.dragonBonePhaseMax || 10;

      this.vx = 0;
      this.vy = 0;
      if (target && !target.isDead) {
        this._alignPinnedTargetOnBlade(target, 0.0);
      }

      if (this.dragonBonePhaseTimer >= maxT) {
        this.dragonBonePhase = 'lift';
        this.dragonBonePhaseTimer = 0;
        this.dragonBonePhaseMax = cfg.dragonBoneLiftFrames || 30;
      }
    }
    // ──────────────────────────────────────────
    // PHASE 4: HOISTING / LIFTING IMPALED ENEMY
    // ──────────────────────────────────────────
    else if (this.dragonBonePhase === 'lift') {
      const target = this.dragonBoneTarget;
      const maxT = this.dragonBonePhaseMax || 30;
      const progress = Math.min(1.0, this.dragonBonePhaseTimer / maxT);
      const ease = Math.sin(progress * Math.PI * 0.5);

      // Halt movement during lift
      this.vx = 0;
      this.vy = 0;

      // Pin enemy right through center of the rising blade
      if (target && !target.isDead) {
        const weaponRot = -1.65 * ease; // Lifts from 0 to -1.65 rad (straight up)
        this._alignPinnedTargetOnBlade(target, weaponRot);

        // Blood drips during lift
        if (this.dragonBonePhaseTimer % 4 === 0) {
          spawnBloodEffect(target.x, target.y, Math.PI * 0.5, 3);
          spawnSparks(target.x, target.y, 2, '#F59E0B');
        }
      }

      if (this.dragonBonePhaseTimer >= maxT) {
        this.dragonBonePhase = 'throw';
        this.dragonBonePhaseTimer = 0;
        this.dragonBonePhaseMax = cfg.dragonBoneThrowFrames ?? cfg.dragonBoneSlamFrames ?? 14;
      }
    }
    // ──────────────────────────────────────────
    // PHASE 5: FORWARD THROW RELEASE
    // ──────────────────────────────────────────
    else if (this.dragonBonePhase === 'throw') {
      const target = this.dragonBoneTarget;
      const maxT = this.dragonBonePhaseMax || cfg.dragonBoneThrowFrames || 14;
      const progress = Math.min(1.0, this.dragonBonePhaseTimer / maxT);
      const releaseFrame = Math.max(1, Math.floor(maxT * 0.5));
      const chopAngle = cfg.dragonBoneThrowChopAngle ?? 0.85;

      this.vx = 0;
      this.vy = 0;

      // Keep the enemy on the blade as Maki brings it forward and chops down with force for the throw.
      if (this.dragonBonePhaseTimer < releaseFrame) {
        if (target && !target.isDead) {
          const throwProgress = this.dragonBonePhaseTimer / releaseFrame;
          const throwEase = Math.sin(throwProgress * Math.PI * 0.5);
          const currentRot = -1.65 + (1.65 + chopAngle) * throwEase;
          this._alignPinnedTargetOnBlade(target, currentRot);
        }
      } else if (this.dragonBonePhaseTimer === releaseFrame) {
        this._executeDragonBoneThrow(target);
      }

      if (this.dragonBonePhaseTimer >= maxT) {
        const pinFrames = cfg.dragonBoneGroundPinFrames ?? 14;
        if (pinFrames > 0) {
          this.dragonBonePhase = 'groundPin';
          this.dragonBonePhaseTimer = 0;
          this.dragonBonePhaseMax = pinFrames;
        } else {
          this.dragonBoneActive = false;
          this.dragonBonePhase = null;
        }
        if (this.dragonBoneTarget) {
          this.dragonBoneTarget.isPinnedByMaki = false;
          this.dragonBoneTarget.isGrabbed = false;
          this.dragonBoneTarget._makiPinnedBladeAngle = null;
          this.dragonBoneTarget._makiPinnedBy = null;
          this.dragonBoneTarget = null;
        }
      }
    }
    // ──────────────────────────────────────────
    // PHASE 6: GROUND PIN & BLADE EXTRACTION
    // ──────────────────────────────────────────
    else if (this.dragonBonePhase === 'groundPin') {
      const maxT = this.dragonBonePhaseMax || cfg.dragonBoneGroundPinFrames || 14;

      this.vx = 0;
      this.vy = 0;

      // On initial pin impact frame: spawn ground scorch fissure & spark impact
      if (this.dragonBonePhaseTimer === 0) {
        const pinAngle = this.gunAngle || 0;
        const pinDist = this.r * 1.6;
        const pinX = this.x + Math.cos(pinAngle) * pinDist;
        const pinY = this.y + Math.sin(pinAngle) * pinDist;
        spawnGroundScorch(pinX, pinY, 35);
        spawnSparks(pinX, pinY, 8, '#F59E0B');
        triggerGlobalScreenShake(3, 6);
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
  }

  _executeDragonBoneThrow(target) {
    const cfg = CONFIG.maki || {};
    const baseDmg = cfg.dragonBoneBaseDamage || 60;
    const bonusDmg = (this.kineticCharges / this.maxKineticCharges) * ((cfg.dragonBoneMaxDamage || 120) - baseDmg);
    const totalDmg = Math.round(baseDmg + bonusDmg);
    const throwSpeed = (cfg.dragonBoneThrowSpeed || 22.0)
      * (cfg.dragonBoneThrowDistanceMultiplier ?? 1.0)
      * (1.0 + this.kineticCharges * 0.25);
    const throwAngle = this.gunAngle || 0;

    if (target && !target.isDead) {
      target.isPinnedByMaki = false;
      target.isGrabbed = false;
      target._makiPinnedBladeAngle = null;
      target._makiPinnedBy = null;

      // Massive True Damage bypass
      applyDamageToTarget(target, totalDmg, this, {
        isTrueDamage: true,
        bypassDefense: true,
        damageType: 'heavy_throw'
      });

      // Soul Wound infliction
      if (typeof target.applySoulWound === 'function') {
        target.applySoulWound(cfg.soulWoundDuration || 240, cfg.soulWoundHealReduction || 0.75);
      } else {
        target.soulWoundTimer = cfg.soulWoundDuration || 240;
        target.isSoulWounded = true;
      }

      // Use the knockback channel so wall contact reflects the throw into a ricochet.
      const throwVx = Math.cos(throwAngle) * throwSpeed;
      const throwVy = Math.sin(throwAngle) * throwSpeed;
      target.vx = 0;
      target.vy = 0;
      target.knockbackVx = 0;
      target.knockbackVy = 0;
      if (typeof target.applyKnockback === 'function') {
        target.applyKnockback(throwVx, throwVy);
      } else {
        target.vx = throwVx;
        target.vy = throwVy;
        target.knockbackVx = throwVx;
        target.knockbackVy = throwVy;
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

      spawnBloodEffect(target.x, target.y, throwAngle, 14);
      spawnSparks(target.x, target.y, 10, '#FFFFFF');
      spawnImpactFlash(target.x, target.y, 32, '#F59E0B');
      spawnFloatingText(target.x, target.y - 30, 'SOUL THROW!', '#DC2626');
    }

    triggerGlobalScreenShake(5, 8);
    audioSystem.playSFX('sword_slash_heavy', 0.9);

    // Consume stored kinetic charges
    this.kineticCharges = 0;
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

    // Teleport behind attacker
    const backAngle = (attacker.gunAngle || 0) + Math.PI;
    this.x = attacker.x + Math.cos(backAngle) * 45;
    this.y = attacker.y + Math.sin(backAngle) * 45;
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
        this.x = target.x + Math.cos(angle) * 50;
        this.y = target.y + Math.sin(angle) * 50;
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
        this.x = target.x;
        this.y = target.y - 20;
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
        alpha: Math.max(0.15, 0.45 - (i * 0.08))
      });
    }
    if (this.afterImages.length > 8) {
      this.afterImages.splice(0, this.afterImages.length - 8);
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
