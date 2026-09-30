// ─────────────────────────────────────────────
// P.E.K.K.A Fighter Class
// Clash of Clans & Clash Royale / Supercell
// ─────────────────────────────────────────────

import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { pekkaConfig } from '../../configs/characters/pekkaConfig.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawPekkaSkin } from '../../graphics/fighters/pekkaSkin.js';

export class PekkaFighter extends Fighter {
  constructor(def = {}) {
    super(def);
    const cfg = (CONFIG && CONFIG.pekka) ? CONFIG.pekka : pekkaConfig;

    this.characterId = 'pekka';
    this.type = 'pekka';
    this.name = def.name || 'P.E.K.K.A';
    this.themeColor = cfg.themeColor || '#475569';
    this.color = this.themeColor;
    this.secondaryColor = cfg.secondaryColor || '#E879F9';
    this.damageNumberColor = cfg.damageNumberColor || '#E879F9';

    this.baseSpeed = (def.moveSpeed !== undefined) ? def.moveSpeed : (cfg.moveSpeed || 4.4);
    this.speed = this.baseSpeed;
    this.hp = def.hp || cfg.hp || 480;
    this.maxHp = this.hp;

    // Kinetic Momentum & Cleave State
    this.kineticMomentum = 0;       // 0 = none, 1 = stage 1, 2 = stage 2, 3 = stage 3 (Overclock ready)
    this.momentumDecayTimer = 0;     // Timer before momentum resets to 0
    this.cleaveCooldown = 0;

    // 4-Phase Heavyweight Attack State: Stop -> Wind Up -> Release -> Breather -> Move
    this.isCleaveWindingUp = false;
    this.cleaveWindupTimer = 0;
    this.cleaveWindupMax = cfg.cleaveWindupDuration || 20;

    this.isCleaveSwinging = false;
    this.cleaveSwingTimer = 0;
    this.cleaveSwingMax = cfg.cleaveSwingDuration || 16;

    this.isCleaveBreather = false;
    this.cleaveBreatherTimer = 0;
    this.cleaveBreatherMax = cfg.cleaveBreatherDuration || 22;

    // Escanor-Style Hit-Pause State (Blade Impact Stasis)
    this.cleaveHitPauseTimer = 0;
    this.cleaveHitPauseMax = 0;
    this.cleaveHitPauseTarget = null;
    this.cleaveHitPauseKnockback = 0;
    this.cleaveHitPauseStun = 0;
    this.cleaveHitPauseIsOverclock = false;

    this.committedAttackAngle = 0;
    this.cleavePendingTarget = null;

    // Skill 1: Butterfly Chase
    this.butterflyCooldown = 0;
    this.isChasingButterfly = false;
    this.butterflyChaseTimer = 0;
    this.butterflyTargetX = 0;
    this.butterflyTargetY = 0;
    this.butterflyVictim = null;

    // Skill 2: Electric Overload (Super P.E.K.K.A)
    this.overloadCooldown = 0;
    this.isChargingOverload = false;
    this.overloadChargeTimer = 0;
    this.overloadVfxTimer = 0;
    this.overloadVfxMax = 30;
    this.hasDetonatedDeathOverload = false;

    // Animation Tick
    this.animTick = 0;

    // Register HUD Skills
    this.skillManager.registerSkills([
      {
        id: 'butterfly_chase',
        name: 'Butterfly Chase',
        type: 'movement',
        cooldownKey: 'butterflyCooldown',
        cooldownMax: () => (CONFIG.pekka?.butterflyCooldown ?? pekkaConfig.butterflyCooldown),
        color: this.secondaryColor,
        icon: '🦋',
        onActivate: (fighter, opponent) => {
          fighter.triggerButterflyChase(opponent);
        }
      },
      {
        id: 'electric_overload',
        name: 'Electric Overload',
        type: 'ultimate',
        cooldownKey: 'overloadCooldown',
        cooldownMax: () => (CONFIG.pekka?.overloadCooldown ?? pekkaConfig.overloadCooldown),
        color: this.themeColor,
        icon: '⚡',
        onActivate: (fighter) => {
          fighter.triggerElectricOverload();
        }
      }
    ]);
  }

  reset() {
    super.reset();
    const cfg = (CONFIG && CONFIG.pekka) ? CONFIG.pekka : pekkaConfig;
    this.kineticMomentum = 0;
    this.momentumDecayTimer = 0;
    this.cleaveCooldown = 0;
    this.isCleaveWindingUp = false;
    this.cleaveWindupTimer = 0;
    this.isCleaveSwinging = false;
    this.cleaveSwingTimer = 0;
    this.isCleaveBreather = false;
    this.cleaveBreatherTimer = 0;
    this.cleaveHitPauseTimer = 0;
    this.cleaveHitPauseMax = 0;
    this.cleaveHitPauseTarget = null;
    this.cleaveHitPauseKnockback = 0;
    this.cleaveHitPauseStun = 0;
    this.cleaveHitPauseIsOverclock = false;
    this.cleavePendingTarget = null;
    this.committedAttackAngle = 0;
    this.butterflyCooldown = 0;
    this.isChasingButterfly = false;
    this.butterflyChaseTimer = 0;
    this.overloadCooldown = 0;
    this.isChargingOverload = false;
    this.overloadChargeTimer = 0;
    this.overloadVfxTimer = 0;
    this.hasDetonatedDeathOverload = false;
    this.speed = this.baseSpeed;
  }

  /**
   * Action & stationary skill guards (prevents auto-unstick movement while winding up, hit-pausing, or taking a breather)
   */
  isStationarySkillActive() {
    return Boolean(
      this.isCleaveWindingUp ||
      this.cleaveHitPauseTimer > 0 ||
      this.isCleaveSwinging ||
      this.isCleaveBreather ||
      this.isChargingOverload
    );
  }

  isPerformingSkill() {
    return Boolean(
      this.isCleaveWindingUp ||
      this.cleaveHitPauseTimer > 0 ||
      this.isCleaveSwinging ||
      this.isCleaveBreather ||
      this.isChargingOverload ||
      this.isChasingButterfly
    );
  }

  isChannelingSkill() {
    return Boolean(
      this.isCleaveWindingUp ||
      this.cleaveHitPauseTimer > 0 ||
      this.isCleaveBreather ||
      this.isChargingOverload
    );
  }

  canAim() {
    if (this.isCleaveWindingUp || this.cleaveHitPauseTimer > 0 || this.isCleaveSwinging || this.isCleaveBreather || this.isChargingOverload) {
      return false;
    }
    return super.canAim();
  }

  canPerformBasicAttack() {
    if (this.isCleaveWindingUp || this.cleaveHitPauseTimer > 0 || this.isCleaveSwinging || this.isCleaveBreather || this.isChargingOverload || this.isChasingButterfly) {
      return false;
    }
    return super.canPerformBasicAttack();
  }

  interruptAttacks(isDeath = false) {
    super.interruptAttacks(isDeath);
    if (this.cleaveHitPauseTarget) {
      this.cleaveHitPauseTarget.suppressFreezeOverlay = false;
      this.cleaveHitPauseTarget = null;
    }
    this.isCleaveWindingUp = false;
    this.cleaveWindupTimer = 0;
    this.cleaveHitPauseTimer = 0;
    this.cleaveHitPauseMax = 0;
    this.isCleaveSwinging = false;
    this.cleaveSwingTimer = 0;
    this.isCleaveBreather = false;
    this.cleaveBreatherTimer = 0;
    this.cleavePendingTarget = null;
    this.isChargingOverload = false;
    this.overloadChargeTimer = 0;
    this.isChasingButterfly = false;
    this.speed = this.baseSpeed;
  }

  /**
   * Passive: Heavy Titanium Plating
   * Deflects 25% of incoming non-true damage and resists light basic attack knockbacks.
   */
  takeDamage(amount, attacker, opts = {}) {
    const cfg = (CONFIG && CONFIG.pekka) ? CONFIG.pekka : pekkaConfig;

    if (cfg.enableArmorPlating && !opts.isTrueDamage && !opts.isHeal && amount > 0) {
      const reduction = cfg.armorDamageReduction ?? 0.25;
      amount = Math.max(1, Math.round(amount * (1.0 - reduction)));

      // Metallic armor deflection sparks & audio
      if (Math.random() < 0.40) {
        spawnSparks(this.x, this.y, 4, 'crimsonSniper', '#06B6D4');
      }
    }

    const result = super.takeDamage(amount, attacker, opts);

    // Poise: Immune to basic attack knockback pushes
    if (cfg.enableArmorPlating && cfg.ignoreBasicAttackKnockback && !opts.isSureKill && !opts.isUltimate) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
    }

    // Death Overload (Super P.E.K.K.A EMP blast on lethal blow)
    if (this.hp <= 0 && cfg.enableDeathOverload && !this.hasDetonatedDeathOverload) {
      this.hasDetonatedDeathOverload = true;
      this._detonateEmpShockwave(cfg.deathOverloadDamage || 80);
    }

    return result;
  }

  /**
   * Main Fighter Update Loop
   */
  update(opponent, ownerIndex, arena) {
    // 1. Mandatory Rule 1.1 Freeze & TimeStop Early Exit
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    this.animTick = (this.animTick || 0) + 1;
    const cfg = (CONFIG && CONFIG.pekka) ? CONFIG.pekka : pekkaConfig;

    // Decay Timers
    if (this.cleaveCooldown > 0 && !this.isCleaveWindingUp && !this.isCleaveSwinging && !this.isCleaveBreather && this.cleaveHitPauseTimer <= 0) {
      this.cleaveCooldown--;
    }
    if (this.butterflyCooldown > 0) this.butterflyCooldown--;
    if (this.overloadCooldown > 0) this.overloadCooldown--;
    if (this.overloadVfxTimer > 0) this.overloadVfxTimer--;

    // Kinetic Momentum Decay
    if (this.momentumDecayTimer > 0) {
      this.momentumDecayTimer--;
      if (this.momentumDecayTimer <= 0) {
        this.kineticMomentum = 0;
      }
    }

    // 2. Heavyweight Attack Phase 1: Pre-Attack Wind-Up (STOP MOVEMENT -> WIND UP)
    if (this.isCleaveWindingUp) {
      this.cleaveWindupTimer--;
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.gunAngle = this.committedAttackAngle;
      this.angle = this.committedAttackAngle;

      // Telegraph charging sparks
      if (this.animTick % 4 === 0) {
        const sparkDist = this.r * 1.1;
        const sx = this.x + Math.cos(this.committedAttackAngle - 0.8) * sparkDist;
        const sy = this.y + Math.sin(this.committedAttackAngle - 0.8) * sparkDist;
        spawnSparks(sx, sy, 2, 'lightningTrail', this.kineticMomentum === 2 ? '#E879F9' : '#06B6D4');
      }

      if (this.cleaveWindupTimer <= 0) {
        this.releaseColossalCleave(this.cleavePendingTarget || opponent, cfg);
      }

      super.update(opponent, ownerIndex, arena);
      return;
    }

    // 3. Escanor-Style Cinematic Hit-Pause (Blade Impact Stasis on Enemy)
    if (this.cleaveHitPauseTimer > 0) {
      this.cleaveHitPauseTimer--;
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.gunAngle = this.committedAttackAngle;
      this.angle = this.committedAttackAngle;

      // Keep target frozen in hit-pause stasis
      if (this.cleaveHitPauseTarget && !this.cleaveHitPauseTarget.isDead && this.cleaveHitPauseTarget.hp > 0) {
        this.cleaveHitPauseTarget.vx = 0;
        this.cleaveHitPauseTarget.vy = 0;
        this.cleaveHitPauseTarget.knockbackVx = 0;
        this.cleaveHitPauseTarget.knockbackVy = 0;
        if (typeof this.cleaveHitPauseTarget.applyTimeStop === 'function') {
          this.cleaveHitPauseTarget.applyTimeStop(this.cleaveHitPauseTimer);
        } else {
          this.cleaveHitPauseTarget.timeStopTimer = Math.max(this.cleaveHitPauseTarget.timeStopTimer || 0, this.cleaveHitPauseTimer);
        }
        this.cleaveHitPauseTarget.suppressFreezeOverlay = true;
      }

      // Micro-sparks crackling at blade-contact point during hit-pause
      if (this.animTick % 3 === 0 && this.cleaveHitPauseTarget) {
        const cx = this.x + (this.cleaveHitPauseTarget.x - this.x) * 0.55;
        const cy = this.y + (this.cleaveHitPauseTarget.y - this.y) * 0.55;
        spawnSparks(cx, cy, 2, 'lightningTrail', this.cleaveHitPauseIsOverclock ? '#E879F9' : '#06B6D4');
      }

      // On Hit-Pause Completion: UNPAUSE MOMENT!
      if (this.cleaveHitPauseTimer === 0) {
        this._resolveCleaveUnpause(cfg);
      }

      super.update(opponent, ownerIndex, arena);
      return;
    }

    // 4. Heavyweight Attack Phase 2: Active Swing (RELEASE THE ATTACK)
    if (this.isCleaveSwinging) {
      this.cleaveSwingTimer--;
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.gunAngle = this.committedAttackAngle;
      this.angle = this.committedAttackAngle;

      if (this.cleaveSwingTimer <= 0) {
        this.startCleaveBreather(cfg);
      }

      super.update(opponent, ownerIndex, arena);
      return;
    }

    // 5. Heavyweight Attack Phase 3: Breather Recovery (BREATHER BEFORE MOVING AGAIN)
    if (this.isCleaveBreather) {
      this.cleaveBreatherTimer--;
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.gunAngle = this.committedAttackAngle;
      this.angle = this.committedAttackAngle;

      // Vent exhaust steam puffs
      if (this.animTick % 5 === 0) {
        const backX = this.x - Math.cos(this.committedAttackAngle) * (this.r * 0.75);
        const backY = this.y - Math.sin(this.committedAttackAngle) * (this.r * 0.75);
        spawnSparks(backX, backY, 1, 'smoke', '#94A3B8');
      }

      if (this.cleaveBreatherTimer <= 0) {
        this.isCleaveBreather = false;
        this.cleaveCooldown = cfg.cleaveCooldown || 42;
        this.cleavePendingTarget = null;
        // Phase 4: STARTS MOVING AGAIN (Resumes next frame)
      }

      super.update(opponent, ownerIndex, arena);
      return;
    }

    // 5. Handle Electric Overload Charging
    if (this.isChargingOverload) {
      this.overloadChargeTimer--;
      this.vx = 0;
      this.vy = 0;

      // Electric spark charging buildup
      if (this.animTick % 4 === 0) {
        spawnSparks(this.x + (Math.random() - 0.5) * 30, this.y + (Math.random() - 0.5) * 30, 3, 'lightningTrail', '#22D3EE');
      }

      if (this.overloadChargeTimer <= 0) {
        this.isChargingOverload = false;
        this._detonateEmpShockwave(cfg.overloadDamage || 62);
      }

      super.update(opponent, ownerIndex, arena);
      return;
    }

    // 6. Handle Butterfly Chase Sprint
    if (this.isChasingButterfly) {
      this._updateButterflyChase(opponent, arena, cfg);
      super.update(opponent, ownerIndex, arena);
      return;
    }

    // 7. AI & Autonomous Skill Casting
    this._handleCombatAI(opponent, cfg);

    // 8. Basic Colossal Cleave: Initiate Windup (STOP MOVEMENT -> WIND UP)
    if (this.canPerformBasicAttack() && this.cleaveCooldown <= 0 && opponent && !opponent.isDead && opponent.hp > 0) {
      const dist = Math.hypot(this.x - opponent.x, this.y - opponent.y);
      const reach = (cfg.cleaveReach || 82) + (this.r || 28);
      if (dist <= reach) {
        this.startCleaveWindup(opponent, cfg);
        this.vx = 0;
        this.vy = 0;
        super.update(opponent, ownerIndex, arena);
        return;
      }
    }

    // 9. Delegate to centralized movement & physics (Rule 1.2: STARTS MOVING)
    super.update(opponent, ownerIndex, arena);
  }

  /**
   * Phase 1: STOP THE MOVEMENT -> WIND UP
   */
  startCleaveWindup(opponent, cfg) {
    if (!this.canPerformBasicAttack()) return false;

    this.isCleaveWindingUp = true;
    this.isCleaveSwinging = false;
    this.isCleaveBreather = false;
    this.cleaveWindupTimer = cfg.cleaveWindupDuration || 20;
    this.cleaveWindupMax = this.cleaveWindupTimer;
    this.cleavePendingTarget = opponent;

    // Immediately stop all movement
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    // Lock aim angle onto target
    const target = opponent || (state.fighters && state.fighters.find(f => f && f !== this && !f.isDead && f.hp > 0 && !this.isTeammate(f)));
    if (target) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      this.committedAttackAngle = Math.atan2(dy, dx);
    } else {
      this.committedAttackAngle = this.gunAngle || 0;
    }
    this.gunAngle = this.committedAttackAngle;
    this.angle = this.committedAttackAngle;

    // Anticipation telegraph text if next hit is stage 3 Overclock
    if (this.kineticMomentum === 2) {
      spawnFloatingText(this.x, this.y - this.r - 28, '⚠️ READYING CRUSH...', '#E879F9');
    }

    return true;
  }

  /**
   * Phase 2: RELEASE THE ATTACK
   */
  releaseColossalCleave(opponent, cfg) {
    this.isCleaveWindingUp = false;
    this.isCleaveSwinging = true;
    this.cleaveSwingTimer = cfg.cleaveSwingDuration || 16;
    this.cleaveSwingMax = this.cleaveSwingTimer;
    this.vx = 0;
    this.vy = 0;
    this.gunAngle = this.committedAttackAngle;
    this.angle = this.committedAttackAngle;

    // Advance Kinetic Momentum: 0 -> 1 -> 2 -> 3 (Overclock) -> 0
    this.kineticMomentum = (this.kineticMomentum % 3) + 1;
    this.momentumDecayTimer = cfg.comboResetDelay || 210;

    let damage = cfg.hit1Damage || 38;
    let knockback = cfg.hit1Knockback || 7;
    let isOverclock = false;

    if (this.kineticMomentum === 2) {
      damage = cfg.hit2Damage || 54;
      knockback = cfg.hit2Knockback || 11;
    } else if (this.kineticMomentum === 3) {
      damage = cfg.hit3Damage || 96;
      knockback = cfg.hit3Knockback || 24;
      isOverclock = true;
    }

    // Play initial swing whoosh & announcement
    if (isOverclock) {
      spawnFloatingText(this.x, this.y - this.r - 28, '⚡ OVERCLOCK CRUSH!', '#E879F9');
    }
    if (audioSystem.playSFX) {
      audioSystem.playSFX(cfg.sounds.swordSwing, 0.7);
    }

    // Frontal Arc AOE Query (Rule 1.6: query both fighters and illusions!)
    const reach = (cfg.cleaveReach || 82) + this.r;
    const arc = cfg.cleaveArcAngle || (Math.PI * 0.778);
    const aimAngle = this.committedAttackAngle;

    const targets = [];
    if (state.fighters) {
      state.fighters.forEach(f => {
        if (f && f !== this && !f.isDead && f.hp > 0 && !this.isTeammate(f)) {
          targets.push(f);
        }
      });
    }
    if (state.illusions) {
      state.illusions.forEach(ill => {
        if (ill && !ill.dead && ill.hp > 0 && ill.owner !== this) {
          targets.push(ill);
        }
      });
    }

    let primaryHitTarget = null;

    for (const target of targets) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      const targetRadius = target.r || target.radius || 18;

      if (dist <= reach + targetRadius) {
        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = Math.abs(angleToTarget - aimAngle);
        while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

        if (angleDiff <= arc / 2) {
          // Direct hit connected! Apply damage immediately
          target.takeDamage(damage, this, {
            isMelee: true,
            isBladeSlash: true,
            isOverclock
          });

          // Initial contact effects at the exact point of impact
          spawnImpactFlash(target.x, target.y, isOverclock ? 45 : 30, 'physical');
          spawnSparks(target.x, target.y, isOverclock ? 12 : 6, 'lightningTrail', isOverclock ? '#E879F9' : '#06B6D4');

          if (audioSystem.playSFX) {
            audioSystem.playSFX(cfg.sounds.swordHit, 0.75);
          }

          if (!primaryHitTarget) {
            primaryHitTarget = target;
          }
        }
      }
    }

    // Escanor-Style Hit-Pause Activation!
    if (primaryHitTarget && (cfg.enableCleaveHitPause ?? true)) {
      const pauseFrames = isOverclock
        ? (cfg.cleaveHitPauseOverclockFrames || 20)
        : (cfg.cleaveHitPauseFrames || 10);

      this.cleaveHitPauseTimer = pauseFrames;
      this.cleaveHitPauseMax = pauseFrames;
      this.cleaveHitPauseTarget = primaryHitTarget;
      this.cleaveHitPauseKnockback = knockback;
      this.cleaveHitPauseStun = isOverclock ? (cfg.hit3StunFrames || 24) : 10;
      this.cleaveHitPauseIsOverclock = isOverclock;

      // Freeze target immediately in contact stasis
      primaryHitTarget.vx = 0;
      primaryHitTarget.vy = 0;
      primaryHitTarget.knockbackVx = 0;
      primaryHitTarget.knockbackVy = 0;
      if (typeof primaryHitTarget.applyTimeStop === 'function') {
        primaryHitTarget.applyTimeStop(pauseFrames);
      } else {
        primaryHitTarget.timeStopTimer = Math.max(primaryHitTarget.timeStopTimer || 0, pauseFrames);
      }
      primaryHitTarget.suppressFreezeOverlay = true;

      // Contact micro-shake
      triggerGlobalScreenShake(isOverclock ? 4.0 : 2.0, 6);
    }

    return Boolean(primaryHitTarget);
  }

  /**
   * Escanor-Style Hit-Pause Resolution:
   * Detonates explosive unpause screenshake, releases time-stop stasis,
   * launches massive physical knockback, and applies hit-stun.
   */
  _resolveCleaveUnpause(cfg) {
    const isOverclock = this.cleaveHitPauseIsOverclock;
    const target = this.cleaveHitPauseTarget;
    const knockback = this.cleaveHitPauseKnockback;
    const stunFrames = this.cleaveHitPauseStun;

    // Explosive Unpause Screen Shake!
    const unpauseShake = isOverclock
      ? (cfg.unpauseOverclockShake || 12.0)
      : (cfg.unpauseShake || 8.0);
    const unpauseDur = isOverclock
      ? (cfg.unpauseOverclockShakeDuration || 20)
      : (cfg.unpauseShakeDuration || 14);
    triggerGlobalScreenShake(unpauseShake, unpauseDur);

    if (target && !target.isDead && target.hp > 0) {
      target.suppressFreezeOverlay = false;
      target.timeStopTimer = 0; // Release timeStop so knockback is NOT zeroed by physics!

      // Apply physical knockback push upon unpause along committed attack angle
      const angle = this.committedAttackAngle;
      const kx = Math.cos(angle) * knockback;
      const ky = Math.sin(angle) * knockback;

      if (typeof target.applyKnockback === 'function') {
        target.applyKnockback(kx, ky);
      } else {
        target.knockbackVx = (target.knockbackVx || 0) + kx;
        target.knockbackVy = (target.knockbackVy || 0) + ky;
      }

      // Apply hit-stun so target reels across the arena
      if (typeof target.applyHitStun === 'function') {
        target.applyHitStun(stunFrames);
      } else {
        target.hitStunTimer = Math.max(target.hitStunTimer || 0, stunFrames);
      }

      // Explosive unpause effects: impact flash, sparks, and unpause audio
      spawnImpactFlash(target.x, target.y, isOverclock ? 65 : 42, 'physical');
      spawnSparks(target.x, target.y, isOverclock ? 16 : 8, 'lightningTrail', isOverclock ? '#E879F9' : '#06B6D4');

      if (audioSystem.playSFX) {
        audioSystem.playSFX(isOverclock ? cfg.sounds.overclockSlam : cfg.sounds.swordHit, 0.9);
      }
    }

    this.cleaveHitPauseTarget = null;
    this.isCleaveSwinging = false;
    this.startCleaveBreather(cfg);
  }

  /**
   * Phase 3: BREATHER BEFORE MOVING AGAIN
   */
  startCleaveBreather(cfg) {
    this.isCleaveSwinging = false;
    this.isCleaveBreather = true;
    this.cleaveBreatherTimer = cfg.cleaveBreatherDuration || 22;
    this.cleaveBreatherMax = this.cleaveBreatherTimer;
    this.vx = 0;
    this.vy = 0;
    this.gunAngle = this.committedAttackAngle;
    this.angle = this.committedAttackAngle;
  }

  /**
   * Backwards-compatible direct execution helper
   */
  executeColossalCleave(opponent, cfg) {
    const config = cfg || ((CONFIG && CONFIG.pekka) ? CONFIG.pekka : pekkaConfig);
    const target = opponent || (state.fighters && state.fighters.find(f => f && f !== this && !f.isDead && f.hp > 0 && !this.isTeammate(f)));
    if (target) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      this.committedAttackAngle = Math.atan2(dy, dx);
      this.gunAngle = this.committedAttackAngle;
      this.angle = this.committedAttackAngle;
    }
    return this.releaseColossalCleave(target, config);
  }

  /**
   * Skill 1: Butterfly Chase ("BUTTERFLY!")
   * P.E.K.K.A enters unstoppable hyper-armor sprint chasing a fluttering butterfly.
   */
  triggerButterflyChase(opponent) {
    const cfg = (CONFIG && CONFIG.pekka) ? CONFIG.pekka : pekkaConfig;
    if (!cfg.enableButterflyChase || this.butterflyCooldown > 0) return false;

    const target = opponent || (state.fighters && state.fighters.find(f => f && f !== this && !f.isDead && f.hp > 0 && !this.isTeammate(f)));
    if (!target) return false;

    this.isChasingButterfly = true;
    this.butterflyChaseTimer = cfg.butterflyDuration || 110;
    this.butterflyCooldown = cfg.butterflyCooldown || 360;
    this.butterflyVictim = target;

    // Spawn butterfly between PEKKA and target
    this.butterflyTargetX = this.x + (target.x - this.x) * 0.4;
    this.butterflyTargetY = this.y + (target.y - this.y) * 0.4;

    spawnFloatingText(this.x, this.y - this.r - 28, cfg.butterflyText || 'BUTTERFLY!', '#22D3EE');

    if (audioSystem.playSFX) {
      audioSystem.playSFX(cfg.sounds.butterflyLaugh, 0.8);
    }

    return true;
  }

  /**
   * Update logic for Butterfly Chase pursuit sprint
   */
  _updateButterflyChase(opponent, arena, cfg) {
    this.butterflyChaseTimer--;
    const target = (this.butterflyVictim && !this.butterflyVictim.isDead && this.butterflyVictim.hp > 0)
      ? this.butterflyVictim
      : opponent;

    if (!target || this.butterflyChaseTimer <= 0) {
      this.isChasingButterfly = false;
      this.speed = this.baseSpeed;
      return;
    }

    // Butterfly flutters smoothly towards the target with slight wave motion
    const dx = target.x - this.butterflyTargetX;
    const dy = target.y - this.butterflyTargetY;
    const distToTarget = Math.hypot(dx, dy);

    if (distToTarget > 15) {
      this.butterflyTargetX += (dx / distToTarget) * 7.5;
      this.butterflyTargetY += (dy / distToTarget) * 7.5 + Math.sin(this.animTick * 0.2) * 2;
    }

    // PEKKA charges relentlessly toward butterfly at increased sprint speed
    const chaseDx = this.butterflyTargetX - this.x;
    const chaseDy = this.butterflyTargetY - this.y;
    const chaseDist = Math.hypot(chaseDx, chaseDy);

    const sprintSpeed = this.baseSpeed * (cfg.butterflySpeedMultiplier || 1.85);
    this.speed = sprintSpeed;

    if (chaseDist > 5) {
      this.vx = (chaseDx / chaseDist) * sprintSpeed;
      this.vy = (chaseDy / chaseDist) * sprintSpeed;
      this.aim({ x: this.butterflyTargetX, y: this.butterflyTargetY });
    }

    // Particle sprint trail
    if (this.animTick % 3 === 0) {
      spawnSparks(this.x - Math.cos(this.gunAngle || 0) * 15, this.y - Math.sin(this.gunAngle || 0) * 15, 2, 'lightningTrail', '#06B6D4');
    }

    // Check collision with target to deliver Overhead Decapitating Slam
    const targetDist = Math.hypot(target.x - this.x, target.y - this.y);
    const slamReach = (cfg.butterflySlamReach || 85) + (target.r || 20);

    if (targetDist <= slamReach) {
      this.isChasingButterfly = false;
      this.speed = this.baseSpeed;

      // Execute Butterfly Slam!
      const slamDmg = cfg.butterflySlamDamage || 75;
      target.takeDamage(slamDmg, this, { isMelee: true, isButterflySlam: true });

      const kbX = Math.cos(this.gunAngle || 0) * 20;
      const kbY = Math.sin(this.gunAngle || 0) * 20;
      target.knockbackVx = kbX;
      target.knockbackVy = kbY;
      target.hitStunTimer = Math.max(target.hitStunTimer || 0, cfg.butterflySlamStun || 28);

      // Advance momentum directly to stage 3!
      this.kineticMomentum = 3;
      this.momentumDecayTimer = cfg.comboResetDelay || 210;

      triggerGlobalScreenShake(6, 14);
      spawnImpactFlash(target.x, target.y, 50, 'physical');
      spawnFloatingText(target.x, target.y - 25, 'CRUSH!', '#E879F9');

      if (audioSystem.playSFX) {
        audioSystem.playSFX(cfg.sounds.overclockSlam, 0.8);
      }
    }
  }

  /**
   * Skill 2: Electric Overload (Super P.E.K.K.A EMP)
   */
  triggerElectricOverload() {
    const cfg = (CONFIG && CONFIG.pekka) ? CONFIG.pekka : pekkaConfig;
    if (!cfg.enableElectricOverload || this.overloadCooldown > 0) return false;

    this.isChargingOverload = true;
    this.overloadChargeTimer = cfg.overloadChargeFrames || 38;
    this.overloadCooldown = cfg.overloadCooldown || 720;

    spawnFloatingText(this.x, this.y - this.r - 28, '⚡ CHARGING EMP...', '#22D3EE');

    if (audioSystem.playSFX) {
      audioSystem.playSFX(cfg.sounds.electricCharge, 0.75);
    }

    return true;
  }

  /**
   * Detonates the 360° EMP Electric Shockwave
   */
  _detonateEmpShockwave(damageAmount) {
    const cfg = (CONFIG && CONFIG.pekka) ? CONFIG.pekka : pekkaConfig;
    const blastRadius = cfg.overloadRadius || 210;
    const stunDuration = cfg.overloadParalyzeDuration || 45;
    const knockback = cfg.overloadKnockback || 18;

    this.overloadVfxTimer = this.overloadVfxMax;
    this.overloadRadius = blastRadius;

    triggerGlobalScreenShake(8, 20);
    spawnImpactFlash(this.x, this.y, 75, 'arcane');

    if (audioSystem.playSFX) {
      audioSystem.playSFX(cfg.sounds.electricBlast, 0.9);
    }

    // 1. Deflect/Destroy all enemy basic projectiles within blast radius
    if (projectileSystem && Array.isArray(projectileSystem.projectiles)) {
      for (let i = projectileSystem.projectiles.length - 1; i >= 0; i--) {
        const p = projectileSystem.projectiles[i];
        if (!p || p.owner === this) continue;
        const pDist = Math.hypot(p.x - this.x, p.y - this.y);
        if (pDist <= blastRadius) {
          spawnSparks(p.x, p.y, 4, 'lightningTrail', '#22D3EE');
          projectileSystem.projectiles.splice(i, 1);
        }
      }
    }

    // 2. Shock & Paralyze all nearby enemies and illusions
    const allTargets = [];
    if (state.fighters) {
      state.fighters.forEach(f => {
        if (f && f !== this && !f.isDead && f.hp > 0 && !this.isTeammate(f)) {
          allTargets.push(f);
        }
      });
    }
    if (state.illusions) {
      state.illusions.forEach(ill => {
        if (ill && !ill.dead && ill.hp > 0 && ill.owner !== this) {
          allTargets.push(ill);
        }
      });
    }

    for (const target of allTargets) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= blastRadius) {
        target.takeDamage(damageAmount, this, {
          isSkill: true,
          isElectrified: true,
          isOverloadEMP: true
        });

        // Paralyze stun
        target.paralyzeTimer = Math.max(target.paralyzeTimer || 0, stunDuration);
        target.hitStunTimer = Math.max(target.hitStunTimer || 0, stunDuration);

        // Outward radial blast knockback
        const angle = Math.atan2(dy, dx);
        target.knockbackVx = Math.cos(angle) * knockback;
        target.knockbackVy = Math.sin(angle) * knockback;

        spawnSparks(target.x, target.y, 12, 'lightningTrail', '#E879F9');
        spawnFloatingText(target.x, target.y - 20, '⚡ PARALYZED!', '#06B6D4');
      }
    }
  }

  /**
   * AI Decision Matrix for autonomous ability activation
   */
  _handleCombatAI(opponent, cfg) {
    if (!opponent || opponent.isDead || opponent.hp <= 0) return;

    const dist = Math.hypot(this.x - opponent.x, this.y - opponent.y);

    // AI Skill 1: Cast Butterfly Chase when opponent is at medium distance (150px - 360px)
    if (this.butterflyCooldown <= 0 && dist >= 140 && dist <= (cfg.butterflyDetectRadius || 360)) {
      this.triggerButterflyChase(opponent);
      return;
    }

    // AI Skill 2: Detonate Electric Overload when opponent is in close/medium range
    if (this.overloadCooldown <= 0 && dist <= (cfg.overloadRadius || 210) * 0.8) {
      this.triggerElectricOverload();
    }
  }

  draw(ctx) {
    drawPekkaSkin(ctx, this);
  }

  drawSkin(ctx) {
    drawPekkaSkin(ctx, this);
  }
}
