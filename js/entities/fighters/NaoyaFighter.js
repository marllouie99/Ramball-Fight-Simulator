// ─────────────────────────────────────────────
// Naoya Zenin — 24 FPS Projection Sorcery Fighter
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { drawNaoyaSkin, drawNaoyaGhostModel } from '../../graphics/fighters/naoyaSkin.js';
import {
  draw24FPSFrameStasisOverlay,
  drawSonicBoomRing,
  drawProjectionSorceryForwardFrames,
  drawProjectionFrameStepPops,
  drawNaoyaMachRunwayVFX,
  getNaoyaScreenRunwayPoints,
  sampleNaoyaRunwaySpline,
  triggerShutterGlassBreak,
  updateShutterGlassBreaks,
  drawShutterGlassBreaks,
  clearShutterGlassBreaks,
  drawCursedWombCocoonVFX,
  drawCurseNaoyaMachRamjetVFX,
  drawCurseTurbineCannonVFX,
  drawTimeCellMoonPalaceDomain,
  drawCurseMachGaugeHUD
} from '../../graphics/weapons/naoyaWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash, spawnAnimePunchImpactFrame } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

export class NaoyaFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'naoya';
    this.type = 'naoya';
    this.name = 'Naoya';

    const cfg = CONFIG.naoya || {};
    this.themeColor = cfg.themeColor || '#76E042';
    this.color = this.themeColor;
    this.damageNumberColor = this.themeColor;

    this.hp = cfg.hp || 190;
    this.maxHp = cfg.hp || 190;
    this.baseSpeed = cfg.speed || 5.6;
    // Projection Sorcery (Damage-Triggered Permanent Speed & Evade Stacks)
    this.frameStacks = 0;
    this.maxFrameStacks = cfg.maxFrameStacks !== undefined ? cfg.maxFrameStacks : 10;
    this.isSubsonicOverdrive = false;
    this.evadeChance = cfg.baseEvadeChance ?? 0.05;
    this.evadeBuffTimer = 0;

    // ═══════════════════════════════════════════════════════════
    // OPTION B: VENGEFUL CURSE REBIRTH & AWAKENED JET STATE
    // ═══════════════════════════════════════════════════════════
    this.hasCurseReborn = false;
    this.isCurseWomb = false;
    this.curseWombTimer = 0;
    this.curseWombMaxTimer = cfg.curseWombDurationFrames || 60;
    this.isCurseForm = Boolean(cfg.startInCurseForm);
    this.machGauge = 0;
    this.isMachOverdrive = false;
    this.machOverdriveTimer = 0;
    this.isRamjetCharging = false;
    this.ramjetChargeTimer = 0;
    this.isRamjetLunging = false;
    this.ramjetLungeTimer = 0;
    this.ramjetTarget = null;
    this.isTurbineInhaling = false;
    this.turbineInhaleTimer = 0;
    this.turbineInhaleMaxTimer = cfg.curseTurbineInhaleDuration || 18;
    this.isDomainActive = false;
    this.domainTimer = 0;
    this.domainMaxTimer = cfg.curseDomainDurationFrames || 480;
    this.cellularBleedTimer = 0;

    // Attack & Combos (Rapid 24 FPS Hypersonic Brawler Punch Flurry Barrage)
    this.comboCount = 0;
    this.punchAnimTimer = 0;
    this.punchAnimMaxTimer = 8;
    this.punchAnimHand = 0; // 0 = Right fist, 1 = Left fist (Gojo-style alternating punches)
    this.isExecutingFlurry = false;
    this.flurryHitsTotal = 0;
    this.flurryHitsDone = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this.flurryOwnerIndex = 0;
    this.flurryTriggeredStasis = false;
    this._flurryLastAngle = undefined;
    this.disruptionHits = new Map(); // Target -> Disruption Hit Count
    this.frameFreezeCooldownTimer = 0;
    this.frameFreezeCooldownMax = cfg.frameFreezeCooldown !== undefined ? cfg.frameFreezeCooldown : (cfg.tantoCooldown || 500);

    // Skills & Cooldowns
    this.skill1Cooldown = 0;
    this.skill1CooldownMax = cfg.skill1Cooldown || 330; // 5.5s
    this.isDashingBlitz = false;
    this.blitzTimer = 0;
    this.blitzDuration = cfg.skill1DashFrames || 12;
    this.blitzStartX = 0;
    this.blitzStartY = 0;
    this.blitzTargetX = 0;
    this.blitzTargetY = 0;
    this.blitzTarget = null;

    this.skill2Cooldown = 0;
    this.skill2CooldownMax = cfg.skill2Cooldown || 480; // 8.0s
    this.isSonicKicking = false;
    this.sonicKickTimer = 0;
    this.sonicShockwaves = []; // Active shockwave rings
    this.steppedRunwayFrames = []; // Runway afterimages fading out 1 by 1
    this.movementAfterimages = []; // Idle/movement afterimages fading out 1 by 1

    // Ultimate: 24 FPS Shutter Execution & Vehicular Run-Over
    this.ultCooldown = 0;
    this.ultCooldownMax = cfg.ultCooldown || 1440; // 24.0s
    this.postComboUltDelay = 0;
    this.isExecutingUlt = false;
    this.ultPhase = 0;
    this.ultTimer = 0;
    this.ultTarget = null;
    this.ultStrikesDone = 0;
    this.ultRunOverTimer = 0;
    this.ultBreatherTimer = 0;
    this.ultBreachAngle = 0;
    this.ultStartupPauseTimer = 0;
    this.skidMarks = []; // Burning asphalt tire skid tracks from car crash impact

    // Projection Sorcery Single Ahead Frame, Step Pops & Fading Stepped Frames
    this.projectedFrame = null;
    this.afterimages = [];
    this.frameStepPops = [];
    this.steppedFrames = [];

    // Declarative Skill Registration (Rule 18 HUD Theme Consistency)
    this.skillManager.registerSkills([
      {
        id: 'blitz',
        name: () => (this.isCurseForm ? 'Chōsoku Ramjet' : 'Frame Blitz'),
        type: 'basic',
        cooldownKey: 'skill1Cooldown',
        cooldownMax: () => (this.isCurseForm ? (cfg.curseSkill1Cooldown || 390) : this.skill1CooldownMax),
        color: this.themeColor,
        canCast: (fighter) => {
          const cfg = CONFIG.naoya || {};
          if (fighter.isCurseForm) {
            return Boolean(cfg.enableCurseRamjet !== false) && !fighter.isRamjetCharging && !fighter.isRamjetLunging && !fighter.isTurbineInhaling && !fighter.isCurseWomb;
          }
          return Boolean(cfg.enableFrameBlitz && cfg.enableFrameBlitz !== 0 && cfg.enableFrameBlitz !== '0' && cfg.enableFrameBlitz !== false) &&
            !fighter.isExecutingFlurry &&
            !fighter.isStabbingKnife &&
            !fighter.isExecutingUlt;
        },
        onActivate: (fighter, opponent) => {
          if (fighter.isCurseForm) fighter._castCurseRamjet(opponent);
          else fighter._castFrameBlitz(opponent);
        }
      },
      {
        id: 'sonic_kick',
        name: () => (this.isCurseForm ? 'Turbine Cannon' : 'Sonic Rebound Kick'),
        type: 'basic',
        cooldownKey: 'skill2Cooldown',
        cooldownMax: () => (this.isCurseForm ? (cfg.curseSkill2Cooldown || 480) : this.skill2CooldownMax),
        color: '#C8E64A',
        canCast: (fighter) => {
          const cfg = CONFIG.naoya || {};
          if (fighter.isCurseForm) {
            return Boolean(cfg.enableCurseTurbineCannon !== false) && !fighter.isRamjetCharging && !fighter.isRamjetLunging && !fighter.isTurbineInhaling && !fighter.isCurseWomb;
          }
          return Boolean(cfg.enableSonicKick && cfg.enableSonicKick !== 0 && cfg.enableSonicKick !== '0' && cfg.enableSonicKick !== false) &&
            !fighter.isExecutingFlurry &&
            !fighter.isStabbingKnife &&
            !fighter.isExecutingUlt;
        },
        onActivate: (fighter, opponent) => {
          if (fighter.isCurseForm) fighter._castCurseTurbineCannon(opponent);
          else fighter._castSonicKick(opponent);
        }
      },
      {
        id: 'shutter_exec',
        name: () => (this.isCurseForm ? 'Time Cell Moon Palace' : 'Mach 3 Runway Breach'),
        type: 'ultimate',
        cooldownKey: 'ultCooldown',
        cooldownMax: () => (this.isCurseForm ? (cfg.curseUltCooldown || 1440) : this.ultCooldownMax),
        color: '#00F2FE',
        isUltimate: true,
        isSignature: true,
        signature: true,
        canCast: (fighter) => {
          const cfg = CONFIG.naoya || {};
          if (fighter.isCurseForm) {
            return Boolean(cfg.enableCurseDomain !== false) && !fighter.isDomainActive && !fighter.isRamjetCharging && !fighter.isRamjetLunging && !fighter.isCurseWomb;
          }
          const maxStacks = cfg.maxFrameStacks !== undefined ? cfg.maxFrameStacks : 25;
          const isUltEnabled = Boolean(cfg.enableUltimate !== 0 && cfg.enableUltimate !== false && cfg.enableUltimate !== '0');
          return isUltEnabled &&
            (fighter.frameStacks || 0) >= maxStacks &&
            !fighter.isExecutingFlurry &&
            !fighter.isStabbingKnife &&
            (fighter.postComboUltDelay || 0) <= 0 &&
            (fighter.ultBreatherTimer || 0) <= 0;
        },
        onActivate: (fighter, opponent) => {
          if (fighter.isCurseForm) fighter._castTimeCellMoonPalace(opponent);
          else fighter._castUltimate(opponent);
        }
      }
    ]);
  }

  reset() {
    super.reset();
    const cfg = CONFIG.naoya || {};
    this.frameStacks = 0;
    this.baseSpeed = cfg.speed || 5.6;
    this.speed = this.baseSpeed;
    this.evadeChance = cfg.baseEvadeChance ?? 0.05;
    this.evadeBuffTimer = 0;
    this.isSubsonicOverdrive = false;
    this.comboCount = 0;
    this.punchAnimTimer = 0;
    this.punchAnimHand = 0;
    this.isExecutingFlurry = false;
    this.flurryHitsTotal = 0;
    this.flurryHitsDone = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this.flurryStacksGained = 0;
    this.isStabbingKnife = false;
    this.knifeStabTimer = 0;
    this.knifeStabMaxTimer = 0;
    this.knifeStabTarget = null;
    this.knifeStabHitDone = false;
    if (this.disruptionHits) this.disruptionHits.clear();
    else this.disruptionHits = new Map();
    this.frameFreezeCooldownTimer = 0;
    this.skill1Cooldown = 0;
    this.skill2Cooldown = 0;
    this.ultCooldown = 0;
    this.postComboUltDelay = 0;
    this.isDashingBlitz = false;
    this.isSonicKicking = false;
    this.isExecutingUlt = false;
    this.ultTargetX = null;
    this.ultTargetY = null;
    this.ultPathAngle = 0;
    this.ultBreatherTimer = 0;
    this.ultStartupPauseTimer = 0;

    // Reset Curse State
    this.hasCurseReborn = false;
    this.isCurseWomb = false;
    this.curseWombTimer = 0;
    this.isCurseForm = Boolean(cfg.startInCurseForm);
    this.machGauge = 0;
    this.isMachOverdrive = false;
    this.machOverdriveTimer = 0;
    this.isRamjetCharging = false;
    this.ramjetChargeTimer = 0;
    this.isRamjetLunging = false;
    this.ramjetLungeTimer = 0;
    this.ramjetTarget = null;
    this.isTurbineInhaling = false;
    this.turbineInhaleTimer = 0;
    this.isDomainActive = false;
    this.domainTimer = 0;
    this.cellularBleedTimer = 0;

    if (this.sonicShockwaves) this.sonicShockwaves.length = 0;
    else this.sonicShockwaves = [];
    if (this.afterimages) this.afterimages.length = 0;
    else this.afterimages = [];
    if (this.frameStepPops) this.frameStepPops.length = 0;
    else this.frameStepPops = [];
    if (this.steppedFrames) this.steppedFrames.length = 0;
    else this.steppedFrames = [];
    this.projectedFrame = null;
    clearShutterGlassBreaks();
  }

  isEffectivelyAlive() {
    if (this.hp > 0 && !this.isDead) return true;
    const cfg = CONFIG.naoya || {};
    if (this.isSkillEnabled(cfg.enableCurseRebirth, true) && !this.hasCurseReborn) return true;
    if (this.isCurseWomb) return true;
    return false;
  }

  takeDamage(amount, attacker, opts = {}) {
    if (this.isCurseWomb) {
      return false; // Invulnerable during Cursed Womb cocoon transformation
    }

    const cfg = CONFIG.naoya || {};

    // Frontal Carapace Damage Reduction in Curse Form (Rule 4.1)
    if (this.isCurseForm && attacker && amount > 0 && !opts.isTrueDamage) {
      const hitAngle = Math.atan2(attacker.y - this.y, attacker.x - this.x);
      const myAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
      let diff = Math.abs(hitAngle - myAngle);
      while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
      if (diff <= Math.PI / 2) {
        const resist = cfg.curseCarapaceFrontalResist || 0.20;
        amount = Math.round(amount * (1.0 - resist));
      }
    }

    // Intercept lethal damage to trigger Vengeful Curse Rebirth (Option B)
    const isHeal = Boolean(opts && (opts.isHeal || amount < 0));
    if (!isHeal && !this.hasCurseReborn && !this.isCurseForm && !this.isCurseWomb && this.isSkillEnabled(cfg.enableCurseRebirth, true)) {
      const nextHp = this.hp - (Number(amount) || 0);
      if (nextHp <= 0) {
        this.hp = 0;
        this._startCurseRebirth(attacker);
        return true;
      }
    }

    return super.takeDamage(amount, attacker, opts);
  }

  /**
   * Transformation Sequence: Begins Cursed Womb Cocoon phase upon taking fatal damage.
   * @param {Object} [attacker]
   */
  _startCurseRebirth(attacker) {
    const cfg = CONFIG.naoya || {};
    this.interruptAttacks();
    this.isCurseWomb = true;
    this.curseWombTimer = cfg.curseWombDurationFrames || 60;
    this.curseWombMaxTimer = this.curseWombTimer;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    // Clear all negative CC locks
    this.timeStopTimer = 0;
    this.freezeTimer = 0;
    this.paralyzeTimer = 0;
    this.hitStunTimer = 0;
    this.isFrameFrozen = false;
    if (this.statusEffects) {
      this.statusEffects.timeStopTimer = 0;
      this.statusEffects.paralyzeTimer = 0;
      this.statusEffects.isFrozen = false;
    }

    // Radial concussive repulsion pulse repelling nearby entities
    const repelForce = cfg.curseWombRepelForce || 9.5;
    const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
    for (const t of allTargets) {
      if (t && t !== this && !t.isDead) {
        const dx = t.x - this.x;
        const dy = t.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 260) {
          const repelAngle = Math.atan2(dy, dx);
          if (typeof t.applyKnockback === 'function') {
            t.applyKnockback(Math.cos(repelAngle) * repelForce, Math.sin(repelAngle) * repelForce, 15);
          }
        }
      }
    }

    spawnImpactFlash(this.x, this.y, 45, '#76E042');
    spawnSparks(this.x, this.y, 20, '#00F2FE');
    triggerGlobalScreenShake(8, 16);
    spawnFloatingText(this.x, this.y - this.r - 28, 'VENGEFUL CURSE REBIRTH!', '#76E042');
    const pulseSnd = cfg.sounds?.curseWombPulse || 'Assets/Sound Effects/Skills/enhance.mp3';
    const pulseVol = cfg.soundVolumes?.curseWombPulse ?? 0.95;
    audioSystem.playSFX(pulseSnd, pulseVol);
  }

  /**
   * Advances Cursed Womb cocoon timer and executes hatching into Curse Naoya.
   */
  _updateCurseWomb() {
    if (!this.isCurseWomb) return;
    const cfg = CONFIG.naoya || {};
    this.curseWombTimer--;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    if (this.curseWombTimer % 6 === 0) {
      spawnSparks(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, 3, '#76E042');
    }

    if (this.curseWombTimer <= 0) {
      // Hatch into Awakened Jet Skull Cursed Spirit!
      this.isCurseWomb = false;
      this.isCurseForm = true;
      this.hasCurseReborn = true;
      const targetHp = Math.round(this.maxHp * (cfg.curseRebirthHpPercent ?? 0.50));
      this.hp = targetHp;
      this.baseSpeed = cfg.curseSpeed || 7.2;
      this.speed = this.baseSpeed;
      this.themeColor = cfg.themeColor || '#76E042';

      this._lastHealAmount = targetHp;
      this._healthBarHealTimer = 35;
      this._healthBarShakeTimer = 8;

      triggerShutterGlassBreak(this, { isCocoon: true });
      spawnImpactFlash(this.x, this.y, 60, '#FFFFFF');
      spawnSparks(this.x, this.y, 25, '#00F2FE');
      triggerGlobalScreenShake(14, 20);

      spawnFloatingText(this.x, this.y - this.r - 30, `+${targetHp} (AWAKENED JET CURSE!)`, '#00FF66');
      const screamSnd = cfg.sounds?.curseRebirthScream || 'Assets/Sound Effects/NaoyaSFX/Naoya_glass_break.mp3';
      const screamVol = cfg.soundVolumes?.curseRebirthScream ?? 1.25;
      audioSystem.playSFX(screamSnd, screamVol);
    }
  }

  /**
   * Called whenever Naoya damages an enemy.
   * Gains permanent movement speed and evade buff per hit stack.
   * @param {Object} target
   */
  _onDamageEnemy(target) {
    if (!target) return;
    const cfg = CONFIG.naoya || {};
    const maxStacks = cfg.maxFrameStacks !== undefined ? cfg.maxFrameStacks : (this.maxFrameStacks || 10);
    if (this.frameStacks < maxStacks) {
      this.frameStacks = Math.min(maxStacks, this.frameStacks + 1);
    }
    const speedGain = cfg.speedBonusPerStack ?? 0.50;
    this.speed = this.baseSpeed + this.frameStacks * speedGain;
    this.isSubsonicOverdrive = this.frameStacks >= (cfg.subsonicOverdriveThreshold || 5);

    // Evade Buff Stacking on Hit
    const baseEvade = cfg.baseEvadeChance ?? 0.05;
    const evadeGain = cfg.evadeBonusPerStack ?? 0.04;
    const maxEvade = cfg.maxEvadeChance ?? 0.70;
    this.evadeChance = Math.min(maxEvade, baseEvade + this.frameStacks * evadeGain);
    this.evadeBuffTimer = 999999;

    const evadePct = Math.round(this.evadeChance * 100);
    const floatLabel = `24 FPS SPEED & EVADE! (${evadePct}%)`;
    spawnFloatingText(this.x, this.y - this.r - 20, floatLabel, '#76E042');
    spawnImpactFlash(this.x, this.y, 22, '#00F2FE');
    audioSystem.playSFX('enhance', 0.85);
  }

  /**
   * Evaluates 24 FPS Projection Sorcery Evasion buff against incoming attacks.
   */
  _filterDamageImmunityAndEvade(amount, attacker, opts, isGuaranteedHit) {
    if (this.evadeChance > 0 && amount > 0 && !isGuaranteedHit && !this.isChainedByMakima) {
      const isTickOrBeam = Boolean(
        opts && (
          opts.isPureLoveBeam ||
          opts.isGenosBeam ||
          opts.isLaser ||
          opts.isLaserBeam ||
          opts.isBeam ||
          opts.isContinuous ||
          opts.isTickDamage ||
          opts.isTick ||
          opts.isBleed ||
          opts.fromBleed ||
          opts.isBurn ||
          opts.fromBurn ||
          opts.isPoison ||
          opts.isPurpleDPS ||
          opts.isDivineFlame ||
          opts.isDomain ||
          opts.isDomainSlash ||
          opts.fromDomain ||
          opts.fromBlackHole
        )
      ) || (typeof this.isCaughtInBeam === 'function' && this.isCaughtInBeam());

      const isBasicAttack = !isTickOrBeam && (opts.isProjectile || opts.isMelee || opts.isBasicAttack || (!opts.isSkill && !opts.isUltimate && !opts.isDomain));
      if (isBasicAttack) {
        if (Math.random() < this.evadeChance) {
          spawnFloatingText(this.x, this.y - this.r - 12, '24 FPS DODGE!', '#00F2FE');
          spawnImpactFlash(this.x, this.y, 18, '#76E042');
          spawnSparks(this.x, this.y, 6, '#00F2FE');
          audioSystem.playSFX('enhance', 0.75);
          return false;
        }
      }
    }
    return super._filterDamageImmunityAndEvade(amount, attacker, opts, isGuaranteedHit);
  }

  /**
   * Applies Frame Stasis (24 FPS Film Freeze) to a target for the duration of the combo.
   * @param {Object} target
   * @param {number} [duration=999]
   * @returns {boolean} Whether stasis was successfully applied
   */
  applyFrameStasis(target, duration = 999) {
    if (!target || target.isDead || (target.hp || 0) <= 0) return false;

    // Check Gojo Infinity (Rule 1.7)
    if (target.characterId === 'gojo' || target.type === 'gojo') {
      const isInfinityActive = (typeof target.hasActiveInfinity === 'function') ? target.hasActiveInfinity() : (target.infinityCooldown <= 0);
      if (isInfinityActive) {
        spawnFloatingText(target.x, target.y - target.r - 20, 'INFINITY BLOCKED', '#4da3ff');
        return false;
      }
    }

    target.isFrameFrozen = true;
    target.frameFreezeTimer = duration;

    if (typeof target.applyTimeStop === 'function') {
      target.applyTimeStop(duration, { isFrameStasis: true, isNaoya: true });
    } else {
      target.timeStopTimer = Math.max(target.timeStopTimer || 0, duration);
    }

    spawnFloatingText(target.x, target.y - target.r - 20, '24 FPS FREEZE!', '#00F2FE');
    audioSystem.playSFX('enhance', 0.9);
    triggerGlobalScreenShake(4, 6);
    return true;
  }

  /**
   * Cleans up and ends 24-Frame Palm Touch Frame Stasis on a target entity,
   * triggering the glass break shatter VFX.
   * @param {Object} target
   */
  endFrameStasis(target) {
    if (!target) return;
    if (target.frameFreezeTimer > 0 || target.isFrameFrozen) {
      target.frameFreezeTimer = 0;
      target.isFrameFrozen = false;
      if (typeof target.clearTimeStop === 'function') {
        target.clearTimeStop();
      } else if (target.timeStopTimer > 0) {
        target.timeStopTimer = 0;
      }
      triggerShutterGlassBreak(target);
    }
  }

  /**
   * Casts Skill 1: Frame Blitz (Nijūyon Koma Senkō)
   */
  _castFrameBlitz(opponent) {
    if (!opponent || opponent.isDead || this.isExecutingUlt || this.isExecutingFlurry || this.isStabbingKnife) return;
    const cfg = CONFIG.naoya || {};
    if (cfg.enableFrameBlitz === 0 || cfg.enableFrameBlitz === false || cfg.enableFrameBlitz === '0') return;

    this.skill1Cooldown = this.skill1CooldownMax;
    this.isDashingBlitz = true;
    this.blitzTimer = this.blitzDuration;
    this.punchAnimTimer = this.blitzDuration;
    this.punchAnimMaxTimer = this.blitzDuration;
    this.punchAnimHand = 0;
    this.blitzStartX = Number.isFinite(this.x) ? this.x : 300;
    this.blitzStartY = Number.isFinite(this.y) ? this.y : 250;
    this.blitzTarget = opponent;

    // Commit cast angle (Rule 1.4)
    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const angle = Math.atan2(dy, dx);
    this.gunAngle = angle;
    this.angle = angle;

    const arenaBox = (typeof state !== 'undefined' && state.arena) ? state.arena : { x: 40, y: 170, width: 460, height: 460 };
    const margin = (this.r || 25) + 12;
    const rawTargetX = opponent.x + Math.cos(angle) * (opponent.r + 20);
    const rawTargetY = opponent.y + Math.sin(angle) * (opponent.r + 20);
    this.blitzTargetX = Math.max(arenaBox.x + margin, Math.min(arenaBox.x + arenaBox.width - margin, rawTargetX));
    this.blitzTargetY = Math.max(arenaBox.y + margin, Math.min(arenaBox.y + arenaBox.height - margin, rawTargetY));

    spawnFloatingText(this.x, this.y - this.r - 20, 'FRAME BLITZ!', this.themeColor);
    audioSystem.playSFX('attack_fleshhit', 1.0);
  }

  /**
   * Casts Skill 2: Sonic Boom Rebound Kick (Onpoku Kyaku)
   */
  _castSonicKick(opponent) {
    if (!opponent || opponent.isDead || this.isExecutingUlt || this.isExecutingFlurry || this.isStabbingKnife) return;
    const cfg = CONFIG.naoya || {};
    if (cfg.enableSonicKick === 0 || cfg.enableSonicKick === false || cfg.enableSonicKick === '0') return;

    this.skill2Cooldown = this.skill2CooldownMax;
    this.isSonicKicking = true;
    this.sonicKickTimer = 18;

    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const angle = Math.atan2(dy, dx);
    this.gunAngle = angle;
    this.angle = angle;

    // Kinetic impulse toward target
    const kickSpeed = 16.0;
    this.vx = Math.cos(angle) * kickSpeed;
    this.vy = Math.sin(angle) * kickSpeed;

    // Spawn Sonic Shockwave Ring
    const radius = CONFIG.naoya?.skill2ShockwaveRadius || 150;
    this.sonicShockwaves.push({
      x: this.x,
      y: this.y,
      currentRadius: 10,
      maxRadius: radius,
      timer: 0,
      maxTimer: 16
    });

    spawnFloatingText(this.x, this.y - this.r - 20, 'SONIC REBOUND!', '#C8E64A');
    audioSystem.playSFX('attack_fleshhit', 1.1);
    triggerGlobalScreenShake(6, 10);
  }

  // ═══════════════════════════════════════════════════════════
  // CURSE FORM COMBAT ABILITIES (OPTION B: AWAKENED JET CURSE)
  // ═══════════════════════════════════════════════════════════

  /**
   * Primary Attack for Curse Form: High-mass turbine carapace slam & cursed claws.
   * Builds +20% Mach Gauge per hit.
   * @param {Object} target
   */
  _performCurseTurbineBash(target) {
    if (!target || target.isDead) return;
    const cfg = CONFIG.naoya || {};
    this.punchAnimTimer = 8;
    this.punchAnimMaxTimer = 8;
    this.punchAnimHand = (this.punchAnimHand === 0 ? 1 : 0);

    const reach = (this.r || 25) + (cfg.curseMeleeReach || 80);
    const arcAngle = cfg.curseMeleeArc || ((140 * Math.PI) / 180);
    const aimAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

    // Frontal Arc Damage Query (Rule 1.6)
    const targets = [];
    if (state.fighters && Array.isArray(state.fighters)) {
      for (const f of state.fighters) {
        if (f && f !== this && !f.isDead && (f.hp || 0) > 0 && !this.isTeammate(f)) {
          targets.push(f);
        }
      }
    }
    if (state.illusions && Array.isArray(state.illusions)) {
      for (const ill of state.illusions) {
        if (ill && !ill.dead && !ill.isDead) {
          targets.push(ill);
        }
      }
    }

    let hitAny = false;
    for (const t of targets) {
      const dx = t.x - this.x;
      const dy = t.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= reach + (t.r || 25)) {
        const tAngle = Math.atan2(dy, dx);
        let angleDiff = tAngle - aimAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (Math.abs(angleDiff) <= arcAngle / 2) {
          const dmg = (this.comboCount % 3 === 2) ? (cfg.cursePunchFinisherDamage || 24) : (cfg.cursePunchDamage || 8);
          applyDamageToTarget(t, dmg, this, { isMelee: true });
          hitAny = true;

          // Rule 1.5: Hit-pause target
          if (typeof t.applyTimeStop === 'function') {
            t.applyTimeStop(6);
          }
          if (typeof t.applyKnockback === 'function') {
            t.applyKnockback(Math.cos(aimAngle) * 6, Math.sin(aimAngle) * 6, 8);
          }
          spawnBloodEffect(t.x, t.y, 8);
        }
      }
    }

    if (hitAny) {
      this.comboCount++;
      this.machGauge = Math.min(100, (this.machGauge || 0) + (cfg.machGaugePerHit || 20));
      spawnImpactFlash(this.x, this.y, 35, '#00F2FE');
      spawnSparks(this.x, this.y, 12, '#76E042');
      audioSystem.playSFX('attack_fleshhit', 0.95);
    }

    this.shootCooldown = cfg.cursePunchCooldown || 36;
    this.shootCooldownMax = this.shootCooldown;
  }

  /**
   * Skill 1: Mach 3 Supersonic Ramjet (Chōsoku Ramjet)
   * Charges for 8 frames, then blasts across the arena in a straight vector at Mach 3.
   * @param {Object} target
   */
  _castCurseRamjet(target) {
    if (!target || target.isDead || this.isRamjetCharging || this.isRamjetLunging || this.isCurseWomb) return;
    const cfg = CONFIG.naoya || {};
    this.skill1Cooldown = cfg.curseSkill1Cooldown || 390;
    this.isRamjetCharging = true;
    this.ramjetChargeTimer = cfg.curseRamjetChargeFrames || 8;
    this.ramjetTarget = target;

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const castAngle = Math.atan2(dy, dx);
    this.gunAngle = castAngle;
    this.angle = castAngle;
    this.ramjetCastAngle = castAngle;

    spawnFloatingText(this.x, this.y - this.r - 20, 'CHŌSOKU RAMJET!', '#00F2FE');
    const spoolSnd = cfg.sounds?.ramjetSpool || 'Assets/Sound Effects/Skills/genos-dash-noise.mp3';
    audioSystem.playSFX(spoolSnd, 1.0);
  }

  _updateCurseRamjet(opponent, arena) {
    if (this.isRamjetCharging) {
      this.ramjetChargeTimer--;
      this.vx = 0;
      this.vy = 0;
      if (this.ramjetTarget && !this.ramjetTarget.isDead) {
        this.aim(this.ramjetTarget);
        this.ramjetCastAngle = this.gunAngle;
      }
      if (this.ramjetChargeTimer <= 0) {
        this.isRamjetCharging = false;
        this.isRamjetLunging = true;
        const cfg = CONFIG.naoya || {};
        this.ramjetLungeTimer = cfg.curseRamjetTravelFrames || 14;

        // Launch thrust along committed vector
        const thrustSpeed = 26.0;
        this.vx = Math.cos(this.ramjetCastAngle) * thrustSpeed;
        this.vy = Math.sin(this.ramjetCastAngle) * thrustSpeed;

        this.sonicShockwaves.push({
          x: this.x,
          y: this.y,
          currentRadius: 10,
          maxRadius: 160,
          timer: 0,
          maxTimer: 18,
          angle: this.ramjetCastAngle
        });

        const blastSnd = cfg.sounds?.ramjetBlast || 'Assets/Sound Effects/Attacks/explosion.mp3';
        audioSystem.playSFX(blastSnd, 1.15);
        triggerGlobalScreenShake(8, 14);
      }
      return;
    }

    if (this.isRamjetLunging) {
      this.ramjetLungeTimer--;
      const cfg = CONFIG.naoya || {};

      // Spawn Manga needle speed lines & sparks while lunging
      spawnSparks(this.x, this.y, 4, '#00F2FE');

      // Check collision with enemies
      const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
      for (const t of allTargets) {
        if (t && t !== this && !t.isDead && !this.isTeammate(t)) {
          const dist = Math.hypot(t.x - this.x, t.y - this.y);
          if (dist <= (this.r || 25) + (t.r || 25) + 10) {
            // Impact! Pin victim to arena wall with kinetic launch
            const dmg = cfg.curseRamjetDamage || 45;
            applyDamageToTarget(t, dmg, this, { isHeavy: true, isKnockback: true });

            t._isFlyingToWallPin = true;
            t._carCrashVx = Math.cos(this.ramjetCastAngle) * 16.0;
            t._carCrashVy = Math.sin(this.ramjetCastAngle) * 16.0;
            t._carCrashRagdollTimer = 40;
            t._carCrashSpin = 0.40;

            spawnImpactFlash(t.x, t.y, 60, '#FFFFFF');
            spawnBloodEffect(t.x, t.y, 25);
            triggerGlobalScreenShake(12, 18);
            spawnFloatingText(t.x, t.y - t.r - 20, '💥 RAMJET SLAM!', '#00F2FE');

            this.isRamjetLunging = false;
            this.vx = 0;
            this.vy = 0;
            break;
          }
        }
      }

      if (this.ramjetLungeTimer <= 0) {
        this.isRamjetLunging = false;
        this.vx *= 0.2;
        this.vy *= 0.2;
      }
    }
  }

  /**
   * Skill 2: Concussive Air Turbine Inhale & Cannon Burst
   * Sucks in enemies and loose projectiles, then detonates a 360° sonic compression shockwave.
   * @param {Object} target
   */
  _castCurseTurbineCannon(target) {
    if (this.isTurbineInhaling || this.isCurseWomb) return;
    const cfg = CONFIG.naoya || {};
    this.skill2Cooldown = cfg.curseSkill2Cooldown || 480;
    this.isTurbineInhaling = true;
    this.turbineInhaleTimer = cfg.curseTurbineInhaleDuration || 18;
    this.turbineInhaleMaxTimer = this.turbineInhaleTimer;

    spawnFloatingText(this.x, this.y - this.r - 20, 'TURBINE INHALE!', '#00F2FE');
    const inhSnd = cfg.sounds?.turbineInhale || 'Assets/Sound Effects/Skills/woosh.mp3';
    audioSystem.playSFX(inhSnd, 0.95);
  }

  _updateCurseTurbineCannon(opponent, arena) {
    if (!this.isTurbineInhaling) return;
    const cfg = CONFIG.naoya || {};
    this.turbineInhaleTimer--;

    // Gravitational vacuum suction toward Curse Naoya
    const suctionRadius = cfg.curseTurbineInhaleRadius || 220;
    const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
    for (const t of allTargets) {
      if (t && t !== this && !t.isDead && !this.isTeammate(t)) {
        const dx = this.x - t.x;
        const dy = this.y - t.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= suctionRadius && dist > 20) {
          const pullSpeed = 5.5 * (1.0 - dist / suctionRadius);
          t.x += (dx / dist) * pullSpeed;
          t.y += (dy / dist) * pullSpeed;
        }
      }
    }

    if (this.turbineInhaleTimer <= 0) {
      // Detonate Concussive Shockwave Cannon Burst!
      this.isTurbineInhaling = false;
      const burstRadius = cfg.curseTurbineBurstRadius || 180;
      const burstDmg = cfg.curseTurbineBurstDamage || 38;
      const burstKb = cfg.curseTurbineKnockback || 18;

      this.sonicShockwaves.push({
        x: this.x,
        y: this.y,
        currentRadius: 10,
        maxRadius: burstRadius,
        timer: 0,
        maxTimer: 20
      });

      for (const t of allTargets) {
        if (t && t !== this && !t.isDead && !this.isTeammate(t)) {
          const dx = t.x - this.x;
          const dy = t.y - this.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= burstRadius + (t.r || 25)) {
            const kbAngle = Math.atan2(dy, dx);
            applyDamageToTarget(t, burstDmg, this, { isAOE: true, isKnockback: true });
            if (typeof t.applyKnockback === 'function') {
              t.applyKnockback(Math.cos(kbAngle) * burstKb, Math.sin(kbAngle) * burstKb, 15);
            }
          }
        }
      }

      // Clear small enemy projectiles in radius
      if (state.projectiles && Array.isArray(state.projectiles)) {
        for (let i = state.projectiles.length - 1; i >= 0; i--) {
          const p = state.projectiles[i];
          if (p && p.owner !== this) {
            const pDist = Math.hypot(p.x - this.x, p.y - this.y);
            if (pDist <= burstRadius) {
              spawnSparks(p.x, p.y, 6, '#00F2FE');
              state.projectiles.splice(i, 1);
            }
          }
        }
      }

      spawnImpactFlash(this.x, this.y, 70, '#00F2FE');
      triggerGlobalScreenShake(10, 16);
      spawnFloatingText(this.x, this.y - this.r - 25, '💨 TURBINE CANNON!', '#C8E64A');
      audioSystem.playSFX('Assets/Sound Effects/Attacks/explosion.mp3', 1.1);
    }
  }

  /**
   * Ultimate for Curse Form: Domain Expansion — Time Cell Moon Palace (時胞月宮殿 - Tokyū Gesshōkyū)
   * Sure-hit cellular 24 FPS constraint rule.
   * @param {Object} target
   */
  _castTimeCellMoonPalace(target) {
    if (this.isDomainActive || this.isCurseWomb) return;
    const cfg = CONFIG.naoya || {};
    this.ultCooldown = cfg.curseUltCooldown || 1440;
    this.isDomainActive = true;
    this.domainTimer = cfg.curseDomainDurationFrames || 480;
    this.domainMaxTimer = this.domainTimer;
    this.cellularBleedTimer = 0;

    spawnFloatingText(this.x, this.y - this.r - 30, '時胞月宮殿 — TIME CELL MOON PALACE!', '#C8E64A');
    const domSnd = cfg.sounds?.domainExpansion || 'Assets/Sound Effects/Skills/enhance.mp3';
    audioSystem.playSFX(domSnd, 1.25);
    triggerGlobalScreenShake(12, 24);
  }

  _updateTimeCellMoonPalace(opponent, arena) {
    if (!this.isDomainActive) return;
    const cfg = CONFIG.naoya || {};
    this.domainTimer--;

    if (this.domainTimer <= 0) {
      this.isDomainActive = false;
      return;
    }

    this.cellularBleedTimer++;
    const bleedInterval = cfg.curseDomainCellularBleedInterval || 24;

    // Sure-hit Cellular 24 FPS Rule Check (Rule 2.7 Compliant — NO perma-freeze)
    if (this.cellularBleedTimer % bleedInterval === 0) {
      const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
      for (const t of allTargets) {
        if (!t || t === this || t.isDead || (t.hp || 0) <= 0 || this.isTeammate(t)) continue;

        // Lore Exception: Toji Fushiguro (Heavenly Restriction 0 cursed energy) is completely undetectable & immune!
        if (t.characterId === 'toji' || t.type === 'toji') {
          continue;
        }

        // Check if target is moving or executing active actions (violating the 24 FPS cellular rule)
        const speed = Math.hypot(t.vx || 0, t.vy || 0);
        const isActionActive = speed > 0.6 || (typeof t.isPerformingSkill === 'function' && t.isPerformingSkill()) || t.punchAnimTimer > 0;

        if (isActionActive) {
          const dmg = cfg.curseDomainCellularBleedDamage || 6;
          applyDamageToTarget(t, dmg, this, { isTrueDamage: true, isBleed: true, noHitSound: false });
          spawnBloodEffect(t.x, t.y, 6);
          if (typeof t.applyTimeStop === 'function') {
            t.applyTimeStop(cfg.curseDomainCellularStunFrames || 6); // Micro-pause, NOT perma-freeze!
          }
          spawnFloatingText(t.x, t.y - (t.r || 25) - 10, 'CELLULAR RUPTURE!', '#76E042');
        }
      }
    }
  }

  /**
   * Updates Mach 3 Overdrive Gauge in Curse Form.
   */
  _updateCurseMachOverdrive(arena) {
    const cfg = CONFIG.naoya || {};
    const moveSpeed = Math.hypot(this.vx, this.vy);

    // Passive gauge ramp while moving
    if (moveSpeed > 0.8 && !this.isMachOverdrive) {
      const ramp = (cfg.machGaugeRampPerSecond || 12) / 60;
      this.machGauge = Math.min(100, (this.machGauge || 0) + ramp);
    }

    // Trigger Mach 3 Overdrive at 100%
    if (this.machGauge >= 100 && !this.isMachOverdrive) {
      this.isMachOverdrive = true;
      this.machOverdriveTimer = cfg.machOverdriveDurationFrames || 180;
      this.speed = cfg.curseMaxSpeed || 14.5;
      spawnFloatingText(this.x, this.y - this.r - 20, 'MACH 3 OVERDRIVE!', '#00F2FE');
      audioSystem.playSFX('Assets/Sound Effects/Skills/toji-firstseq-teleport.mp3', 1.0);
      triggerGlobalScreenShake(6, 12);
    }

    if (this.isMachOverdrive) {
      this.machOverdriveTimer--;
      spawnSparks(this.x, this.y, 3, '#00F2FE');

      // Collision Ram damage against enemies when passing through them
      const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
      for (const t of allTargets) {
        if (t && t !== this && !t.isDead && !this.isTeammate(t)) {
          const dist = Math.hypot(t.x - this.x, t.y - this.y);
          if (dist <= (this.r || 25) + (t.r || 25)) {
            const ramDmg = cfg.machRamContactDamage || 18;
            applyDamageToTarget(t, ramDmg, this, { isKnockback: true });
            const pushAngle = Math.atan2(t.y - this.y, t.x - this.x);
            if (typeof t.applyKnockback === 'function') {
              t.applyKnockback(Math.cos(pushAngle) * (cfg.machRamKnockback || 14), Math.sin(pushAngle) * (cfg.machRamKnockback || 14), 10);
            }
          }
        }
      }

      // Vaporize small enemy projectiles upon contact
      if (state.projectiles && Array.isArray(state.projectiles)) {
        for (let i = state.projectiles.length - 1; i >= 0; i--) {
          const p = state.projectiles[i];
          if (p && p.owner !== this) {
            const pDist = Math.hypot(p.x - this.x, p.y - this.y);
            if (pDist <= (this.r || 25) + (p.r || 10)) {
              spawnSparks(p.x, p.y, 5, '#00F2FE');
              state.projectiles.splice(i, 1);
            }
          }
        }
      }

      if (this.machOverdriveTimer <= 0) {
        this.isMachOverdrive = false;
        this.machGauge = 0;
        this.speed = cfg.curseSpeed || 7.2;
      }
    }
  }

  /**
   * AI Decision Matrix for Curse Form
   * @param {Object} opponent
   */
  _updateCurseCombatAI(opponent) {
    if (!opponent || opponent.isDead || (opponent.hp || 0) <= 0 || this.isRamjetCharging || this.isRamjetLunging || this.isTurbineInhaling || this.isCurseWomb) return;

    const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    const cfg = CONFIG.naoya || {};

    // 1. Ultimate: Time Cell Moon Palace
    if (this.ultCooldown <= 0 && this.isSkillEnabled(cfg.enableCurseDomain, true) && !this.isDomainActive && dist < 320) {
      this._castTimeCellMoonPalace(opponent);
      return;
    }

    // 2. Skill 1: Chōsoku Ramjet
    if (this.skill1Cooldown <= 0 && this.isSkillEnabled(cfg.enableCurseRamjet, true) && dist > 100 && dist < 380) {
      this._castCurseRamjet(opponent);
      return;
    }

    // 3. Skill 2: Turbine Cannon
    if (this.skill2Cooldown <= 0 && this.isSkillEnabled(cfg.enableCurseTurbineCannon, true) && dist < 200) {
      this._castCurseTurbineCannon(opponent);
      return;
    }
  }

  /**
   * Freezes all other entities in the arena during Naoya's 24 FPS Runway Ultimate.
   * @param {number} dur
   */
  _freezeArenaEntities(dur = 30) {
    if (typeof state === 'undefined') return;

    // 1. Freeze all other combatants in the match
    if (state.fighters && Array.isArray(state.fighters)) {
      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (f && f !== this && !f.isDead && (f.hp || 0) > 0) {
          f.isCaughtInNaoyaUlt = true;
          if (typeof f.interruptAttacks === 'function') f.interruptAttacks(true);
          if (typeof f.applyTimeStop === 'function') f.applyTimeStop(dur, { isUltimate: true, isDomain: true });
          else if (f.statusEffects && typeof f.statusEffects.applyTimeStop === 'function') f.statusEffects.applyTimeStop(dur);
          else f.timeStopTimer = Math.max(f.timeStopTimer || 0, dur);

          f.isFrameFrozen = true;
          f.frameFreezeTimer = Math.max(f.frameFreezeTimer || 0, dur);
          f.vx = 0;
          f.vy = 0;
          if (f.knockbackVx !== undefined) f.knockbackVx = 0;
          if (f.knockbackVy !== undefined) f.knockbackVy = 0;
        }
      }
    }

    // 2. Freeze all illusions / summons (Rika, clones, etc.)
    if (state.illusions && Array.isArray(state.illusions)) {
      for (let i = 0; i < state.illusions.length; i++) {
        const ill = state.illusions[i];
        if (ill && !ill.dead && !ill.isDead && (ill.hp || 0) > 0) {
          if (typeof ill.interruptAttacks === 'function') ill.interruptAttacks(true);
          if (typeof ill.applyTimeStop === 'function') ill.applyTimeStop(dur, { isUltimate: true });
          else ill.timeStopTimer = Math.max(ill.timeStopTimer || 0, dur);
          ill.vx = 0;
          ill.vy = 0;
        }
      }
    }

    // 3. Freeze Greenwood Sedan minion cars (CJ Drive-By)
    if (state.cjDriveBys && Array.isArray(state.cjDriveBys)) {
      for (let i = 0; i < state.cjDriveBys.length; i++) {
        const car = state.cjDriveBys[i];
        if (car && !car.dead && (car.hp || 0) > 0) {
          if (typeof car.applyTimeStop === 'function') car.applyTimeStop(dur);
          else car.timeStopTimer = Math.max(car.timeStopTimer || 0, dur);
          car.speed = 0;
          car.targetSpeed = 0;
          car.vx = 0;
          car.vy = 0;
        }
      }
    }

    // 4. Freeze active projectiles in flight
    if (state.projectiles && Array.isArray(state.projectiles)) {
      for (let i = 0; i < state.projectiles.length; i++) {
        const p = state.projectiles[i];
        if (p) {
          p.timeStopTimer = Math.max(p.timeStopTimer || 0, dur);
        }
      }
    }
  }

  /**
   * Unfreezes all arena entities when Naoya's ultimate terminates or is interrupted.
   */
  _unfreezeArenaEntities() {
    if (typeof state === 'undefined') return;

    if (state.fighters && Array.isArray(state.fighters)) {
      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (f && f !== this) {
          const hadFrameStasis = Boolean(f.isFrameFrozen || (f.frameFreezeTimer && f.frameFreezeTimer > 0));
          f.isCaughtInNaoyaUlt = false;
          f.isFrameFrozen = false;
          f.frameFreezeTimer = 0;
          f.timeStopTimer = 0;
          if (f.statusEffects) {
            f.statusEffects.timeStopTimer = 0;
            f.statusEffects.isFrozen = false;
          }
          if (typeof f.resumeMovement === 'function') f.resumeMovement();
          if (hadFrameStasis) {
            triggerShutterGlassBreak(f);
          }
        }
      }
    }

    if (state.illusions && Array.isArray(state.illusions)) {
      for (let i = 0; i < state.illusions.length; i++) {
        const ill = state.illusions[i];
        if (ill) {
          ill.timeStopTimer = 0;
          if (ill.statusEffects) ill.statusEffects.timeStopTimer = 0;
        }
      }
    }

    if (state.projectiles && Array.isArray(state.projectiles)) {
      for (let i = 0; i < state.projectiles.length; i++) {
        const p = state.projectiles[i];
        if (p && p.timeStopTimer > 0) {
          p.timeStopTimer = 0;
        }
      }
    }
  }

  /**
   * Casts Ultimate: 24 FPS Mach 3 Runway Breach (Out-of-Bounds Orbit & Breach)
   */
  _castUltimate(opponent) {
    if (!opponent || opponent.isDead || this.isExecutingUlt || this.isExecutingFlurry || this.isStabbingKnife || (this.postComboUltDelay > 0)) return;
    const cfg = CONFIG.naoya || {};
    if (cfg.enableUltimate === 0 || cfg.enableUltimate === false || cfg.enableUltimate === '0') return;
    const maxStacks = cfg.maxFrameStacks !== undefined ? cfg.maxFrameStacks : 25;
    if ((this.frameStacks || 0) < maxStacks) return;

    this.isExecutingFlurry = false;
    this.flurryHitsDone = 0;
    this.flurryTimer = 0;
    this.punchAnimTimer = 0;
    this.punchAnimHand = 0;
    this.isDashingBlitz = false;
    this.isSonicKicking = false;
    this.ultCooldown = this.ultCooldownMax;
    this.postComboUltDelay = 0;
    this.isExecutingUlt = true;
    this.ultPhase = 1;
    this.ultTimer = 0;
    this.ultRunwayProgress = 0;
    this.ultTarget = opponent;
    this.ultTargetX = Number.isFinite(opponent.x) ? opponent.x : 300;
    this.ultTargetY = Number.isFinite(opponent.y) ? opponent.y : 250;
    this.ultAimTimer = 0;
    this.ultBreachAngle = 0;
    this.ultBreatherTimer = 0;
    this.ultStartX = Number.isFinite(this.x) ? this.x : 300;
    this.ultStartY = Number.isFinite(this.y) ? this.y : 250;

    // 1. Immediately zero Naoya's movement and initiate startup pause
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.ultStartupPauseTimer = cfg.ultStartupPauseFrames ?? 28;
    
    // Spawn runway path shooting directly out to Naoya's front based on movement velocity vector or facing angle
    const speed = Math.hypot(this.vx || 0, this.vy || 0);
    const moveAngle = speed > 0.1
      ? Math.atan2(this.vy, this.vx)
      : (this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0));
    this.ultPathAngle = (typeof cfg.ultFixedAngle === 'number')
      ? cfg.ultFixedAngle
      : moveAngle;

    // Smoothly align facing direction to the start tangent of the generated runway spline
    const arenaBox = (typeof state !== 'undefined' && state.arena) ? state.arena : { x: 40, y: 170, width: 460, height: 460 };
    const canvasW = (state.canvas && state.canvas.width) || 540;
    const canvasH = (state.canvas && state.canvas.height) || 960;
    const startPos = { x: this.ultStartX, y: this.ultStartY };
    const targetPos = {
      x: this.ultTargetX,
      y: this.ultTargetY,
      r: (opponent && opponent.r) ? opponent.r : 25
    };
    const points = getNaoyaScreenRunwayPoints(arenaBox, canvasW, canvasH, targetPos, startPos, this.ultPathAngle);
    const initialSample = sampleNaoyaRunwaySpline(points, 0.0);
    this.gunAngle = initialSample.angle;
    this.angle = initialSample.angle;

    // Clear any lingering combat afterimages, stepped frames, or pop particles
    if (this.afterimages) this.afterimages.length = 0;
    if (this.steppedFrames) this.steppedFrames.length = 0;
    if (this.steppedRunwayFrames) this.steppedRunwayFrames.length = 0;
    else this.steppedRunwayFrames = [];
    if (this.frameStepPops) this.frameStepPops.length = 0;
    this.projectedFrame = null;
    this.lastSteppedAfterimageIndex = -1;

    // 2. Pause the entire arena immediately (all fighters, summons, minions, projectiles)
    this._freezeArenaEntities(180);

    spawnFloatingText(this.x, this.y - this.r - 25, '24 FPS STASIS! RUNWAY LOCK', '#00F2FE');
    audioSystem.playSFX('enhance', 1.1);
    triggerGlobalScreenShake(6, 12);
  }

  interruptAttacks(force = false) {
    this._unfreezeArenaEntities();
    this.ultStartupPauseTimer = 0;
    this.ultTargetX = null;
    this.ultTargetY = null;
    this.isExecutingUlt = false;
    this.ultPhase = 0;
    this.ultTimer = 0;
    this.ultBreatherTimer = 0;
    this.postComboUltDelay = 0;
    this.isDashingBlitz = false;
    this.isSonicKicking = false;
    if (this.flurryTarget) {
      this.endFrameStasis(this.flurryTarget);
    }
    if (this.knifeStabTarget) {
      this.endFrameStasis(this.knifeStabTarget);
    }
    this.isExecutingFlurry = false;
    this.flurryTriggeredStasis = false;
    this.isStabbingKnife = false;
    this.knifeStabTimer = 0;
    this.knifeStabHitDone = false;
    this.knifeStabTarget = null;
    this.punchAnimTimer = 0;
    super.interruptAttacks(force);
  }

  /**
   * Teleports Naoya to a fresh geometric surround angle around the target (with wide jumping angles & high entropy randomness).
   */
  _teleportToFlurryAngle(target, arena) {
    if (!target || target.isDead) return;

    const oldX = this.x;
    const oldY = this.y;

    const cfg = CONFIG.naoya || {};
    const punchesPerTeleport = Math.max(1, cfg.flurryPunchesPerTeleport ? cfg.flurryPunchesPerTeleport : 1);
    const tripletIndex = Math.floor((this.flurryHitsDone - 1) / punchesPerTeleport);

    // Dynamic wide jumping angle with high entropy randomness (Zigzag across 360° circle)
    // Large jump angle (~155°) ensures consecutive teleports jump across the enemy rather than slowly orbiting
    const baseJump = cfg.flurryAngleStep !== undefined ? cfg.flurryAngleStep : ((155 * Math.PI) / 180);
    const angleJitterMax = cfg.flurryRandomAngleSpread !== undefined ? cfg.flurryRandomAngleSpread : ((110 * Math.PI) / 180);
    const randomJitter = (Math.random() - 0.5) * angleJitterMax;
    
    // Combine base wide angle progression with randomized scatter
    const strikeAngle = (this._flurryLastAngle !== undefined ? (this._flurryLastAngle + baseJump) : (Math.random() * Math.PI * 2)) + randomJitter;
    this._flurryLastAngle = strikeAngle;

    // Randomized orbit distance variation for close/far punch depth
    const baseOrbit = (target.r || 25) + (this.r || 25) + (cfg.flurryOrbitDistance ?? 20);
    const orbitJitterMax = cfg.flurryRandomOrbitJitter ?? 16;
    const orbitJitter = (Math.random() - 0.5) * orbitJitterMax;
    const orbitDist = Math.max((target.r || 25) + (this.r || 25) + 4, baseOrbit + orbitJitter);

    let targetX = target.x + Math.cos(strikeAngle) * orbitDist;
    let targetY = target.y + Math.sin(strikeAngle) * orbitDist;

    const arenaBox = arena || (typeof state !== 'undefined' ? state.arena : null) || { x: 40, y: 170, width: 460, height: 460 };
    if (arenaBox) {
      const margin = (this.r || 25) + 6;
      targetX = Math.max(arenaBox.x + margin, Math.min(arenaBox.x + arenaBox.width - margin, targetX));
      targetY = Math.max(arenaBox.y + margin, Math.min(arenaBox.y + arenaBox.height - margin, targetY));
    }

    // Facing angle from the ghost's previous position towards the target
    const oldAngle = Math.atan2(target.y - oldY, target.x - oldX);

    this.x = targetX;
    this.y = targetY;
    this.vx = 0;
    this.vy = 0;

    // Face directly towards target from new position (Rule 1.3 Re-aim Alignment)
    const faceAngle = Math.atan2(target.y - this.y, target.x - this.x);
    this.gunAngle = faceAngle;
    this.angle = faceAngle;

    // Leave a clean stepped blue projection ghost model at previous position aimed at target
    const maxLife = cfg.flurryAfterimageLifespanFrames ?? 45;
    const startAlpha = cfg.flurryAfterimageAlpha ?? 1.0;
    this.steppedFrames.push({
      x: oldX,
      y: oldY,
      angle: oldAngle,
      alpha: startAlpha,
      maxAlpha: startAlpha,
      lifeTimer: 0,
      maxLife: maxLife,
      stepCount: tripletIndex + 1
    });
  }

  /**
   * Executes a single strike within the rapid 24 FPS Hypersonic Flurry Barrage.
   */
  _executeFlurryStrike(ownerIndex, isFinisher, baseDmg, cfg) {
    const reach = (this.r || 25) + (cfg.meleeReach || 48);
    const arcAngle = cfg.meleeArc || ((140 * Math.PI) / 180);
    const aimAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

    // Frontal Arc Melee Execution (Rule 1.6: Checks both fighters and illusions)
    const targets = [];
    if (state.fighters && Array.isArray(state.fighters)) {
      for (const f of state.fighters) {
        if (f && f !== this && !f.isDead && (f.hp || 0) > 0 && !this.isTeammate(f)) {
          targets.push(f);
        }
      }
    }
    if (state.illusions && Array.isArray(state.illusions)) {
      for (const ill of state.illusions) {
        if (ill && ill.ownerIndex !== ownerIndex && !ill.dead && !ill.isDead) {
          targets.push(ill);
        }
      }
    }

    for (const target of targets) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      const totalReach = reach + (target.r || 25);

      if (dist <= totalReach) {
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - aimAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        if (Math.abs(angleDiff) <= arcAngle / 2) {
          // Apply damage to determine if target took damage or successfully dodged/blocked
          const hitSuccess = applyDamageToTarget(target, baseDmg, this, { isMelee: true });

          if (hitSuccess) {
            // Passive: 24-Frame Palm Touch & Frame Stasis Freeze
            // Triggers with a configurable chance once tantoCooldown is UP so it doesn't trigger too frequently
            const isFreezeEnabled = cfg.enableFrameFreeze === 1 || cfg.enableFrameFreeze === true || (cfg.enableFrameFreeze !== 0 && cfg.enableFrameFreeze !== false);
            if (isFreezeEnabled && !this.flurryTriggeredStasis) {
              const freezeChance = cfg.frameFreezeChance !== undefined ? cfg.frameFreezeChance : 0.35;
              if (Math.random() < freezeChance) {
                const applied = this.applyFrameStasis(target);
                if (applied) {
                  this.flurryTriggeredStasis = true;
                }
              }
            }

            // Stack speed & evade up to maxStacksPerFlurry during this flurry burst ONLY upon successful damage dealt
            const maxFlurryStacks = cfg.maxStacksPerFlurry !== undefined ? cfg.maxStacksPerFlurry : 4;
            if (this.flurryStacksGained < maxFlurryStacks) {
              this.flurryStacksGained++;
              this._onDamageEnemy(target);
            }

            // True damage bonus if target is already Frame Frozen
            if (target.isFrameFrozen) {
              const bonusTrueDmg = Math.round(baseDmg * (cfg.frameFreezeVulnerability || 0.30));
              applyDamageToTarget(target, bonusTrueDmg, this, { isTrueDamage: true });
              spawnFloatingText(target.x, target.y - target.r - 12, `+${bonusTrueDmg} CRIT!`, '#00F2FE');
              spawnSparks(target.x, target.y, 6, '#00F2FE');
            }

            // Knockback: zero on flurry punch hits so enemy stays locked in barrage until the knife stab finisher
            const knockback = 0;
            if (knockback > 0) {
              const kAngle = targetAngle;
              target.vx = (target.vx || 0) + Math.cos(kAngle) * knockback;
              target.vy = (target.vy || 0) + Math.sin(kAngle) * knockback;
            }

            spawnBloodEffect(target.x, target.y, isFinisher ? 10 : 3);
            spawnImpactFlash(target.x, target.y, isFinisher ? 18 : 10, isFinisher ? '#FFFFFF' : this.themeColor);
          }
        }
      }
    }

    let punchSfx = 'Assets/Sound Effects/Attacks/heavypunch1.mp3';
    if (isFinisher) {
      punchSfx = cfg.sounds?.finisherPunch || 'Assets/Sound Effects/Attacks/heavypunch2.mp3';
    } else {
      const punchList = Array.isArray(cfg.sounds?.punchHit)
        ? cfg.sounds.punchHit
        : (Array.isArray(cfg.sounds?.punchHits)
          ? cfg.sounds.punchHits
          : (cfg.sounds?.punchHit ? [cfg.sounds.punchHit] : [
              'Assets/Sound Effects/Attacks/heavypunch1.mp3',
              'Assets/Sound Effects/Attacks/heavypunch2.mp3'
            ]));
      punchSfx = punchList[Math.floor(Math.random() * punchList.length)] || 'Assets/Sound Effects/Attacks/heavypunch1.mp3';
    }
    const punchVol = isFinisher ? (cfg.soundVolumes?.finisherPunch ?? 0.95) : (cfg.soundVolumes?.punchHit ?? 0.85);
    audioSystem.playSFX(punchSfx, punchVol);
  }

  /**
   * Executes Primary Attack (Initiates 24 FPS Hypersonic Flurry Barrage)
   */
  shoot(ownerIndex, opponent) {
    if (this.isCurseWomb) return;
    if (this.isCurseForm) {
      if (this.isRamjetCharging || this.isRamjetLunging || this.isTurbineInhaling || this.shootCooldown > 0) return;
      const target = opponent || (state.fighters ? state.fighters.find(f => f && f !== this && !f.isDead && !this.isTeammate(f)) : null);
      if (target) {
        this.aim(target);
        this._performCurseTurbineBash(target);
      }
      return;
    }

    if (this.isCaughtInBeam() || this.isExecutingUlt || this.isDashingBlitz || this.isExecutingFlurry || this.isStabbingKnife || (this.ultBreatherTimer > 0) || (this.shootCooldown > 0)) return;

    const cfg = CONFIG.naoya || {};
    const totalFlurryHits = cfg.basicComboHits || 30;

    this.isExecutingFlurry = true;
    this.flurryHitsTotal = totalFlurryHits;
    this.flurryHitsDone = 0;
    this.flurryTimer = 0;
    this.flurryTarget = opponent;
    this.flurryOwnerIndex = ownerIndex;
    this.flurryStacksGained = 0;
    this.flurryTriggeredStasis = false;
    this._flurryLastAngle = Math.random() * Math.PI * 2;
    const tantoCd = cfg.tantoCooldown !== undefined ? cfg.tantoCooldown : (cfg.punchCooldown || 40);
    this.shootCooldownMax = tantoCd;
    this.shootCooldown = 0; // Cooldown starts ticking ONLY after flurry and knife stab complete!

    // Immediately trigger 1st attack at starting teleport position
    this.flurryHitsDone++;
    const isFinisher = this.flurryHitsDone >= this.flurryHitsTotal;
    const baseDmg = cfg.punchDamage || cfg.tantoDamage || 4;
    this._teleportToFlurryAngle(opponent, (typeof state !== 'undefined' ? state.arena : null));
    this.punchAnimTimer = 8;
    this.punchAnimMaxTimer = 8;
    this.punchAnimHand = (this.flurryHitsDone % 2);
    this._executeFlurryStrike(ownerIndex, isFinisher, baseDmg, cfg);

    if (isFinisher) {
      this._evaluateFlurryFinisher(opponent, ownerIndex, cfg);
    }
  }

  update(opponent, ownerIndex, arena) {
    // 1. Mandatory freeze / time-stop guard (Rule 1.1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

    // ── OPTION B: CURSED WOMB COCOON STATE ──
    if (this.isCurseWomb) {
      this._updateCurseWomb();
      return;
    }

    // ── OPTION B: CURSE FORM COMBAT LOOP ──
    if (this.isCurseForm) {
      if (this.skill1Cooldown > 0) this.skill1Cooldown--;
      if (this.skill2Cooldown > 0) this.skill2Cooldown--;
      if (this.ultCooldown > 0) this.ultCooldown--;
      if (this.punchAnimTimer > 0) this.punchAnimTimer--;
      if (this.shootCooldown > 0) this.shootCooldown--;

      this._updateCurseMachOverdrive(arena);
      this._updateCurseRamjet(opponent, arena);
      this._updateCurseTurbineCannon(opponent, arena);
      this._updateTimeCellMoonPalace(opponent, arena);
      this._updateCurseCombatAI(opponent);

      if (this.isRamjetCharging || this.isTurbineInhaling) {
        this.vx = 0;
        this.vy = 0;
      }

      // Centralized Movement & Physics Standard (Rule 1.2)
      this.applyMovementPhysics(1.0);
      this.resolveWallBounce(arena, opponent);

      if (opponent && !opponent.isDead && this.canAim()) {
        this.aim(opponent);
      }
      return;
    }

    if (this.ultBreatherTimer > 0) {
      this.ultBreatherTimer--;
      this.shootCooldown = Math.max(this.shootCooldown || 0, this.ultBreatherTimer);
      this.isExecutingFlurry = false;
      this.vx = 0;
      this.vy = 0;

      const cfg = CONFIG.naoya || {};
      const maxBreather = cfg.ultPostStrikeBreatherFrames ?? 24;
      const minSlow = cfg.ultPostStrikeSlowMultiplier ?? 0.30;
      // Smoothly recovers from heavy slow (30% speed) back to 100% base speed as breather finishes
      const recoveryProgress = 1 - (this.ultBreatherTimer / maxBreather);
      const currentSlowMult = minSlow + (1 - minSlow) * Math.pow(recoveryProgress, 1.5);
      this.speed = this.baseSpeed * currentSlowMult;
    } else if (this.frameStacks === 0 && !this.isExecutingUlt && !this.isDashingBlitz) {
      this.speed = this.baseSpeed;
    }

    // Age and fade any remaining runway afterimages 1 by 1 post-strike
    if (this.steppedRunwayFrames && this.steppedRunwayFrames.length > 0 && !this.isExecutingUlt) {
      const cfg = CONFIG.naoya || {};
      const fadeEase = cfg.ultAfterimageFadeEase ?? 1.20;
      for (let i = this.steppedRunwayFrames.length - 1; i >= 0; i--) {
        const af = this.steppedRunwayFrames[i];
        af.lifeTimer++;
        const prog = Math.min(1.0, af.lifeTimer / af.maxLife);
        af.alpha = af.maxAlpha * Math.pow(1.0 - prog, fadeEase);
        if (af.lifeTimer >= af.maxLife || af.alpha <= 0.005) {
          this.steppedRunwayFrames.splice(i, 1);
        }
      }
    }

    if (this.skill1Cooldown > 0) this.skill1Cooldown--;
    if (this.skill2Cooldown > 0) this.skill2Cooldown--;
    if (this.ultCooldown > 0) this.ultCooldown--;
    if (this.postComboUltDelay > 0) this.postComboUltDelay--;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.frameFreezeCooldownTimer > 0) this.frameFreezeCooldownTimer--;
    // Basic Attack Cooldown (tantoCooldown) ticks down only when not actively executing a flurry
    if (this.shootCooldown > 0 && !this.isExecutingFlurry) this.shootCooldown--;

    // 2. Update Primary Attack: 24 FPS Hypersonic Flurry Barrage (3 Punches per Teleport)
    if (this.isExecutingFlurry && this.ultBreatherTimer <= 0) {
      this.vx = 0;
      this.vy = 0;
      const cfg = CONFIG.naoya || {};
      const strikeInterval = Math.max(1, cfg.flurryStrikeIntervalFrames || 5);
      this.flurryTimer++;

      if (this.flurryTimer % strikeInterval === 0 && this.flurryHitsDone < this.flurryHitsTotal) {
        // Auto-retarget to nearest living enemy if target is dead so all hits continue
        if (!this.flurryTarget || this.flurryTarget.isDead || (this.flurryTarget.hp || 0) <= 0) {
          if (state.fighters && Array.isArray(state.fighters)) {
            let nextTarget = null;
            let minDist = Infinity;
            for (const f of state.fighters) {
              if (f && f !== this && !f.isDead && (f.hp || 0) > 0 && !this.isTeammate(f)) {
                const d = Math.hypot(f.x - this.x, f.y - this.y);
                if (d < minDist) {
                  minDist = d;
                  nextTarget = f;
                }
              }
            }
            if (nextTarget) {
              this.flurryTarget = nextTarget;
            }
          }
        }

        if (this.flurryTarget && !this.flurryTarget.isDead && (this.flurryTarget.hp || 0) > 0) {
          this.flurryHitsDone++;
          const isFinisher = this.flurryHitsDone >= this.flurryHitsTotal;
          const baseDmg = cfg.punchDamage || cfg.tantoDamage || 4;

          // Teleport only on every Nth punch cycle (flurryPunchesPerTeleport punches per teleport angle)
          const punchesPerTeleport = Math.max(1, cfg.flurryPunchesPerTeleport !== undefined ? cfg.flurryPunchesPerTeleport : 3);
          const shouldTeleport = (this.flurryHitsDone - 1) % punchesPerTeleport === 0;
          if (shouldTeleport) {
            this._teleportToFlurryAngle(this.flurryTarget, arena);
          } else {
            // Smoothly align aim angle toward target from current stance
            const faceAngle = Math.atan2(this.flurryTarget.y - this.y, this.flurryTarget.x - this.x);
            this.gunAngle = faceAngle;
            this.angle = faceAngle;
          }

          this.punchAnimTimer = 8;
          this.punchAnimMaxTimer = 8;
          this.punchAnimHand = (this.flurryHitsDone % 2);
          this._executeFlurryStrike(this.flurryOwnerIndex ?? ownerIndex, isFinisher, baseDmg, cfg);

          if (this.flurryHitsDone % punchesPerTeleport === 0 && !isFinisher) {
            spawnFloatingText(this.x, this.y - this.r - 22, `${this.flurryHitsDone}/${this.flurryHitsTotal} FLURRY!`, '#76E042');
          }

          if (isFinisher) {
            this._evaluateFlurryFinisher(this.flurryTarget, this.flurryOwnerIndex ?? ownerIndex, cfg);
          }
        } else {
          this.isExecutingFlurry = false;
          const tantoCd = cfg.tantoCooldown !== undefined ? cfg.tantoCooldown : (cfg.punchCooldown || 40);
          this.shootCooldown = tantoCd;
          this.shootCooldownMax = tantoCd;
          this.postComboUltDelay = cfg.ultPostComboDelayFrames !== undefined ? cfg.ultPostComboDelayFrames : 120;
        }
      }
    }

    // 2.5 Update Final Strike: Cursed Tanto Knife Stab
    if (this.isStabbingKnife && this.ultBreatherTimer <= 0) {
      // Strictly halt all movement while doing the stab animation
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;

      this.knifeStabTimer--;
      const maxT = this.knifeStabMaxTimer || 38;
      const rawProgress = 1.0 - Math.max(0, this.knifeStabTimer / maxT);

      if (this.knifeStabTarget && !this.knifeStabTarget.isDead && (this.knifeStabTarget.hp || 0) > 0) {
        const dx = this.knifeStabTarget.x - this.x;
        const dy = (this.knifeStabTarget.y - (this.knifeStabTarget.z || 0)) - (this.y - (this.z || 0));
        const faceAngle = Math.atan2(dy, dx);
        this.gunAngle = faceAngle;
        this.angle = faceAngle;
      }

      // Phase 2 (rawProgress >= 0.45): Execute the smooth knife stab into the enemy in the front!
      if (rawProgress >= 0.45 && !this.knifeStabHitDone) {
        this.knifeStabHitDone = true;
        const cfg = CONFIG.naoya || {};

        // Play authentic knife stab sound effect
        audioSystem.playSFX('naoya_stabs', cfg.soundVolumes?.knifeStabs ?? 1.20);

        if (this.knifeStabTarget && !this.knifeStabTarget.isDead && (this.knifeStabTarget.hp || 0) > 0) {
          const stabDmg = cfg.tantoComboFinisherDamage || cfg.punchComboFinisherDamage || 30;
          const hitSuccess = applyDamageToTarget(this.knifeStabTarget, stabDmg, this, {
            isTrueDamage: false,
            isMelee: true,
            isFinisher: true,
            knockback: cfg.tantoKnockback || 16,
            knockbackAngle: this.gunAngle
          });

          if (hitSuccess) {
            this._onDamageEnemy(this.knifeStabTarget);
            // Passive: 24-Frame Palm Touch & Frame Stasis Freeze ends after Naoya stabs the enemy with his knife!
            this.endFrameStasis(this.knifeStabTarget);
            spawnBloodEffect(this.knifeStabTarget.x, this.knifeStabTarget.y, 16);
            spawnImpactFlash(this.knifeStabTarget.x, this.knifeStabTarget.y, 28, '#76E042');
            triggerGlobalScreenShake(4, 8);
            spawnFloatingText(this.knifeStabTarget.x, this.knifeStabTarget.y - (this.knifeStabTarget.r || 25) - 22, 'TANTO STAB FINISHER!', '#76E042');
          } else {
            this.endFrameStasis(this.knifeStabTarget);
          }
        }
      }

      if (this.knifeStabTimer <= 0) {
        if (this.knifeStabTarget) {
          this.endFrameStasis(this.knifeStabTarget);
        }
        this.isStabbingKnife = false;
        this.knifeStabHitDone = false;
        const cfg = CONFIG.naoya || {};
        const tantoCd = cfg.tantoCooldown !== undefined ? cfg.tantoCooldown : (cfg.punchCooldown || 40);
        this.shootCooldown = tantoCd;
        this.shootCooldownMax = tantoCd;
        this.postComboUltDelay = cfg.ultPostComboDelayFrames !== undefined ? cfg.ultPostComboDelayFrames : 120;
      }
    }

    // 3. Update Skill 1: Frame Blitz Dash
    if (this.isDashingBlitz) {
      this.blitzTimer--;
      const progress = 1 - Math.max(0, this.blitzTimer / this.blitzDuration);

      this.x = this.blitzStartX + (this.blitzTargetX - this.blitzStartX) * progress;
      this.y = this.blitzStartY + (this.blitzTargetY - this.blitzStartY) * progress;

      if (this.blitzTimer <= 0 || !this.blitzTarget || this.blitzTarget.isDead || (this.blitzTarget.hp || 0) <= 0) {
        this.isDashingBlitz = false;
        if (this.blitzTarget && !this.blitzTarget.isDead && (this.blitzTarget.hp || 0) > 0) {
          const dmg = CONFIG.naoya?.skill1Damage || 24;
          const hitSuccess = applyDamageToTarget(this.blitzTarget, dmg, this, { isTrueDamage: false });
          if (hitSuccess) {
            this._onDamageEnemy(this.blitzTarget);
            this.applyFrameStasis(this.blitzTarget, CONFIG.naoya?.skill1StasisDuration || 60);
            spawnBloodEffect(this.blitzTarget.x, this.blitzTarget.y, 12);
            this.sonicShockwaves.push({
              x: this.blitzTarget.x,
              y: this.blitzTarget.y,
              currentRadius: 8,
              maxRadius: 85,
              timer: 0,
              maxTimer: 14
            });
          }
        }
      }
    }

    // 4. Update Skill 2: Sonic Kick & Shockwaves
    if (this.isSonicKicking) {
      this.sonicKickTimer--;
      if (this.sonicKickTimer <= 0) {
        this.isSonicKicking = false;
      }
    }

    // Update Shockwave Rings & Clear Projectiles
    for (let i = this.sonicShockwaves.length - 1; i >= 0; i--) {
      const sw = this.sonicShockwaves[i];
      sw.timer++;
      const p = sw.timer / sw.maxTimer;
      sw.currentRadius = sw.maxRadius * p;

      // Projectile clearing within sonic shockwave radius
      if (state.projectiles && Array.isArray(state.projectiles)) {
        for (let j = state.projectiles.length - 1; j >= 0; j--) {
          const proj = state.projectiles[j];
          if (proj && proj.ownerIndex !== ownerIndex) {
            const dist = Math.hypot(proj.x - sw.x, proj.y - sw.y);
            if (dist <= sw.currentRadius) {
              state.projectiles.splice(j, 1);
              spawnSparks(proj.x, proj.y, 4, '#00F2FE');
            }
          }
        }
      }

      if (sw.timer >= sw.maxTimer) {
        this.sonicShockwaves.splice(i, 1);
      }
    }

    // 5. Update Ultimate: 24 FPS Mach 3 Runway Breach (Out-of-Bounds Orbit & Breach)
    if (this.isExecutingUlt) {
      if (!this.ultTarget || this.ultTarget.isDead || (this.ultTarget.hp || 0) <= 0) {
        this.isExecutingUlt = false;
        this.ultPhase = 0;
        this.ultTimer = 0;
      } else {
        this.ultTimer++;
        const cfg = CONFIG.naoya || {};
        const arenaBox = arena || (typeof state !== 'undefined' ? state.arena : null) || { x: 40, y: 170, width: 460, height: 460 };
        const centerX = arenaBox.x + arenaBox.width / 2;
        const centerY = arenaBox.y + arenaBox.height / 2;
        const outerOffset = cfg.ultOrbitOuterOffset || 42;
        const hw = arenaBox.width / 2 + outerOffset;
        const hh = arenaBox.height / 2 + outerOffset;

        // Phase 1: Screen-Wide Colossal Runway Acceleration Sprint Leading Directly into Enemy
        if (this.ultPhase === 1) {
          // Maintain global arena time stop every frame
          this._freezeArenaEntities(20);

          const canvasW = (state.canvas && state.canvas.width) || 540;
          const canvasH = (state.canvas && state.canvas.height) || 960;
          const startPos = { x: this.ultStartX, y: this.ultStartY };
          const pathAngle = this.ultPathAngle || 0;
          const target = this.ultTarget;
          const targetPos = {
            x: (typeof this.ultTargetX === 'number') ? this.ultTargetX : (target ? target.x : (arenaBox.x + arenaBox.width / 2)),
            y: (typeof this.ultTargetY === 'number') ? this.ultTargetY : (target ? target.y : (arenaBox.y + arenaBox.height / 2)),
            r: (target && target.r) ? target.r : 25
          };
          const points = getNaoyaScreenRunwayPoints(arenaBox, canvasW, canvasH, targetPos, startPos, pathAngle);

          // ── Subphase 1A: Startup Stasis Pause (Naoya stops movement for a moment while entire arena pauses) ──
          if (this.ultStartupPauseTimer > 0) {
            this.ultStartupPauseTimer--;
            this.vx = 0;
            this.vy = 0;
            this.x = this.ultStartX;
            this.y = this.ultStartY;

            const initialSample = sampleNaoyaRunwaySpline(points, 0.0);
            this.gunAngle = initialSample.angle;
            this.angle = initialSample.angle;
            return; // Pause during startup windup
          }

          // ── Subphase 1B: Runway Sprint (Slowly starting towards afterimages path, progressively accelerating to Mach 3) ──
          const progress = Math.min(1.0, Math.max(0, this.ultRunwayProgress || 0));

          // Progressive 24 FPS acceleration curve: starts ultra-slow and deliberate, ramping into blazing Mach 3
          const startMult = cfg.ultRunwayStartSpeedMult ?? 0.08;
          const endMult = cfg.ultRunwayEndSpeedMult ?? 3.40;
          const accelExp = cfg.ultRunwayAccelPower ?? 2.30;
          const accelMult = startMult + (endMult - startMult) * Math.pow(progress, accelExp);

          const baseSpeedRate = cfg.ultRunwaySpeedRate || 0.0048;
          this.ultRunwayProgress = (this.ultRunwayProgress || 0) + baseSpeedRate * accelMult;
          const newProgress = Math.min(1.0, this.ultRunwayProgress);

          const sampled = sampleNaoyaRunwaySpline(points, newProgress);

          this.x = sampled.x;
          this.y = sampled.y;

          // Smoothly align facing direction with runway forward motion without 1-frame snaps
          this.gunAngle = sampled.angle;
          this.angle = sampled.angle;

          // Stepping progression audio and 1-by-1 fading afterimages during runway sprint
          const numFrames = cfg.ultRunwayAfterimageCount ?? 52;
          const spacingPower = cfg.ultRunwaySpacingPower ?? 1.15;
          const lifespan = cfg.ultAfterimageLifespanFrames ?? 36;
          const baseAlpha = cfg.ultAfterimageAlpha ?? 0.45;

          if (this.lastSteppedAfterimageIndex === undefined || this.lastSteppedAfterimageIndex === null) {
            this.lastSteppedAfterimageIndex = -1;
          }
          if (!this.steppedRunwayFrames) {
            this.steppedRunwayFrames = [];
          }

          while (this.lastSteppedAfterimageIndex + 1 < numFrames) {
            const nextIdx = this.lastSteppedAfterimageIndex + 1;
            const u = numFrames > 1 ? (nextIdx / (numFrames - 1)) : 0;
            const frameT = Math.min(1.0, Math.max(0, 1.0 - Math.pow(1.0 - u, spacingPower)));

            if (newProgress >= frameT) {
              this.lastSteppedAfterimageIndex = nextIdx;
              const stepSfx = cfg.sounds?.runwayAfterimageShockwave || 'Assets/Sound Effects/NaoyaSFX/Naoya-pathafterimages-shockwaves.wav';
              const stepVol = cfg.soundVolumes?.runwayAfterimageShockwave ?? 0.85;
              audioSystem.playSFX(stepSfx, stepVol);

              const stepPt = sampleNaoyaRunwaySpline(points, frameT);

              // 1. Spawn dynamic expanding sonic boom shockwave ring at stepped afterimage location
              this.sonicShockwaves.push({
                x: stepPt.x,
                y: stepPt.y,
                currentRadius: 6,
                maxRadius: (this.r || 25) * 2.2,
                timer: 0,
                maxTimer: 16
              });

              // 2. Spawn stepped afterimage that fades out 1 by 1
              this.steppedRunwayFrames.push({
                x: stepPt.x,
                y: stepPt.y,
                angle: stepPt.angle || this.gunAngle || 0,
                alpha: baseAlpha,
                maxAlpha: baseAlpha,
                lifeTimer: 0,
                maxLife: lifespan,
                frameT: frameT
              });
            } else {
              break;
            }
          }

          // Age and fade stepped afterimages 1 by 1
          const fadeEase = cfg.ultAfterimageFadeEase ?? 1.20;
          for (let i = this.steppedRunwayFrames.length - 1; i >= 0; i--) {
            const af = this.steppedRunwayFrames[i];
            af.lifeTimer++;
            const prog = Math.min(1.0, af.lifeTimer / af.maxLife);
            af.alpha = af.maxAlpha * Math.pow(1.0 - prog, fadeEase);
            if (af.lifeTimer >= af.maxLife || af.alpha <= 0.005) {
              this.steppedRunwayFrames.splice(i, 1);
            }
          }

          // Check if reached end of path or collided directly with enemy
          const distToTarget = Math.hypot(target.x - this.x, target.y - this.y);
          const hitReach = (this.r || 25) + (target.r || 25);
          const minArmProgress = cfg.ultImpactMinArmProgress ?? 0.92;
          const maxCompleteProgress = cfg.ultImpactThresholdProgress ?? 0.985;

          if (this.ultRunwayProgress >= maxCompleteProgress || (newProgress >= minArmProgress && distToTarget <= hitReach)) {
            // DIRECT IMPACT: STEAMROLL / RUN OVER THE ENEMY LIKE A CAR ACCIDENT!
            const finisherDmg = cfg.ultFinisherDamage || 75;
            let breachAngle = (sampled && typeof sampled.angle === 'number' && !isNaN(sampled.angle)) ? sampled.angle : Math.atan2(target.y - this.y, target.x - this.x);
            if (isNaN(breachAngle)) breachAngle = this.gunAngle || this.angle || 0;
            this.ultBreachAngle = breachAngle;

            // 1. Unfreeze all arena entities and release target stasis
            this._unfreezeArenaEntities();
            target.isCaughtInNaoyaUlt = false;
            target.isFrameFrozen = false;
            target.frameFreezeTimer = 0;
            target.timeStopTimer = 0;
            target.paralyzeTimer = 0;
            target.hitStunTimer = 0;
            target.isParalyzed = false;
            target.isParalyzedByMahoraga = false;
            if (target.statusEffects) {
              target.statusEffects.timeStopTimer = 0;
              target.statusEffects.isFrozen = false;
              target.statusEffects.isParalyzed = false;
            }
            delete target._timeStopOriginalDuration;
            delete target._timeStopFrozenAngle;
            delete target._timeStopFrozenGunAngle;

            if (typeof target.resumeMovement === 'function') {
              target.resumeMovement();
            }
            if (typeof target.interruptAttacks === 'function') {
              target.interruptAttacks(true);
            }

            // 2. Apply massive direct True Damage
            applyDamageToTarget(target, finisherDmg, this, { isTrueDamage: true, isUltimate: true });

            // Reset frame stacks back to 0 upon ultimate release
            this.frameStacks = 0;
            this.speed = this.baseSpeed;
            this.evadeChance = cfg.baseEvadeChance ?? 0.05;
            this.isSubsonicOverdrive = false;

            // 3. Devastating vehicular launch towards the arena wall (Toji 3rd sequence ambush standard)!
            const launchSpeed = cfg.ultWallLaunchSpeed ?? (CONFIG.toji?.ambushFlurryFinalRecoil || 38);
            const launchVx = Math.cos(breachAngle) * launchSpeed;
            const launchVy = Math.sin(breachAngle) * launchSpeed;
            target._carCrashVx = launchVx;
            target._carCrashVy = launchVy;
            target.vx = launchVx;
            target.vy = launchVy;
            target.knockbackVx = launchVx;
            target.knockbackVy = launchVy;
            target.knockbackDecay = 0.90;
            if (typeof target.applyKnockback === 'function') {
              target.applyKnockback(launchVx, launchVy);
            }
            target._carCrashRagdollTimer = 60; // Max flight frames to wall
            target._isFlyingToWallPin = true;
            target._carCrashSpin = 0.50;
            target.isCurrentlyWallPinnedByNaoya = false;
            target.naoyaWallPinTimer = 0;
            target.pinnedWallX = undefined;
            target.pinnedWallY = undefined;

            // 4. Naoya cleanly positions right at the strike contact point facing the target!
            this.ultTargetX = null;
            this.ultTargetY = null;
            this.isExecutingUlt = false;
            this.ultPhase = 0;
            this.ultTimer = 0;
            this.isExecutingFlurry = false;
            this.flurryHitsDone = 0;
            this.flurryTimer = 0;
            this.slashSwingTimer = 0;

            // Clear afterimages, stepped frames, and pop bursts so nothing remains stuck on screen
            if (this.afterimages) this.afterimages.length = 0;
            if (this.steppedFrames) this.steppedFrames.length = 0;
            if (this.frameStepPops) this.frameStepPops.length = 0;
            this.projectedFrame = null;
            this.lastSteppedAfterimageIndex = -1;

            // Firmly lock Naoya at the contact position facing the victim without slingshotting or snapping
            const contactDist = (this.r || 25) + (target.r || 25) + 4;
            this.x = target.x - Math.cos(breachAngle) * contactDist;
            this.y = target.y - Math.sin(breachAngle) * contactDist;
            this.vx = 0;
            this.vy = 0;
            this.knockbackVx = 0;
            this.knockbackVy = 0;

            const breatherFrames = cfg.ultPostStrikeBreatherFrames ?? 24;
            this.ultBreatherTimer = breatherFrames;
            this.shootCooldown = breatherFrames; // Breather pause before basic attacks resume
            this.skill1Cooldown = Math.max(this.skill1Cooldown || 0, Math.round(breatherFrames * 0.75));
            this.skill2Cooldown = Math.max(this.skill2Cooldown || 0, Math.round(breatherFrames * 0.75));
            this.gunAngle = breachAngle;
            this.angle = breachAngle;

            // Large expanding sonic boom shockwave ring
            this.sonicShockwaves.push({
              x: target.x,
              y: target.y,
              currentRadius: 12,
              maxRadius: 210,
              timer: 0,
              maxTimer: 22,
              angle: breachAngle
            });

            spawnAnimePunchImpactFrame(target.x, target.y, 110, breachAngle, 'gold');

            spawnBloodEffect(target.x, target.y, 35);
            spawnFloatingText(target.x, target.y - target.r - 28, '💥 RUN OVER! MACH 3 CRASH!', '#00F2FE');
            const strikeSfx = cfg.sounds?.heavySmash || 'Assets/Sound Effects/Attacks/heavypunch3.mp3';
            const strikeVol = cfg.soundVolumes?.heavySmash ?? 1.25;
            audioSystem.playSFX(strikeSfx, strikeVol);
            triggerGlobalScreenShake(20, 30);
          }
        }
      }
    }

    // Update Victim Wall-Launch & Wall-Pin Physics
    if (state.fighters && Array.isArray(state.fighters)) {
      const arenaBox = arena || (typeof state !== 'undefined' ? state.arena : null) || { x: 40, y: 170, width: 460, height: 460 };
      const cfg = CONFIG.naoya || {};
      for (const target of state.fighters) {
        if (target && target._isFlyingToWallPin) {
          const lvx = (typeof target._carCrashVx === 'number') ? target._carCrashVx : (target.vx || 0);
          const lvy = (typeof target._carCrashVy === 'number') ? target._carCrashVy : (target.vy || 0);

          target.x += lvx;
          target.y += lvy;
          target.vx = lvx;
          target.vy = lvy;
          target.angle = (target.angle || 0) + (target._carCrashSpin || 0.45);
          target.gunAngle = target.angle; // Ensure all fighter models and skins spin continuously during launch

          const tr = target.r || 25;
          let hitWall = false;

          if (arenaBox.shape === 'circle') {
            const cx = arenaBox.x + arenaBox.width / 2;
            const cy = arenaBox.y + arenaBox.height / 2;
            const ar = arenaBox.radius || (arenaBox.width / 2);
            const d = Math.hypot(target.x - cx, target.y - cy);
            const dot = (target.x - cx) * lvx + (target.y - cy) * lvy;
            if (d + tr >= ar && dot > 0) {
              const nx = (target.x - cx) / (d || 1);
              const ny = (target.y - cy) / (d || 1);
              target.x = cx + nx * (ar - tr);
              target.y = cy + ny * (ar - tr);
              hitWall = true;
            }
          } else {
            const minX = arenaBox.x + tr;
            const maxX = arenaBox.x + arenaBox.width - tr;
            const minY = arenaBox.y + tr;
            const maxY = arenaBox.y + arenaBox.height - tr;

            if (target.x <= minX && lvx < 0) { target.x = minX; hitWall = true; }
            else if (target.x >= maxX && lvx > 0) { target.x = maxX; hitWall = true; }
            if (target.y <= minY && lvy < 0) { target.y = minY; hitWall = true; }
            else if (target.y >= maxY && lvy > 0) { target.y = maxY; hitWall = true; }
          }

          target._carCrashRagdollTimer = (target._carCrashRagdollTimer || 60) - 1;

          if (hitWall || target._carCrashRagdollTimer <= 0) {
            // SNAP AND PIN TO THE ARENA WALL!
            target._isFlyingToWallPin = false;
            target._carCrashRagdollTimer = 0;
            target._carCrashVx = 0;
            target._carCrashVy = 0;
            target.isCurrentlyWallPinnedByNaoya = true;
            target.naoyaWallPinTimer = cfg.ultWallPinDurationFrames ?? 120; // Config-driven wall-pin duration!
            target.pinnedWallX = target.x;
            target.pinnedWallY = target.y;
            target.vx = 0;
            target.vy = 0;
            target.knockbackVx = 0;
            target.knockbackVy = 0;

            // Face inward toward the arena interior while pinned to the wall
            const cx = arenaBox.x + arenaBox.width / 2;
            const cy = arenaBox.y + arenaBox.height / 2;
            const inwardAngle = Math.atan2(cy - target.y, cx - target.x);
            target.angle = inwardAngle;
            target.gunAngle = inwardAngle;

            if (typeof target.interruptAttacks === 'function') {
              target.interruptAttacks(true);
            }

            // Heavy wall impact smash & VFX
            spawnBloodEffect(target.x, target.y, 35);
            spawnImpactFlash(target.x, target.y, 65, '#FFFFFF');
            spawnSparks(target.x, target.y, 18, '#00F2FE');
            spawnFloatingText(target.x, target.y - (target.r || 25) - 20, '💥 CRUSHED & WALL PINNED!', '#00F2FE');
            audioSystem.playSFX('groundSmash', 1.4);
            audioSystem.playSFX('yuji-blackflash', 1.25);
            triggerGlobalScreenShake(18, 24);
          }
        } else if (target && target.naoyaWallPinTimer > 0) {
          target.naoyaWallPinTimer--;
          if (target.naoyaWallPinTimer <= 0) {
            target.isCurrentlyWallPinnedByNaoya = false;
            target.pinnedWallX = undefined;
            target.pinnedWallY = undefined;
            const slowDur = cfg.ultVictimPostCrashSlowDuration ?? 120;
            const slowMult = cfg.ultVictimPostCrashSlowMultiplier ?? 0.40;
            if (typeof target.applySlow === 'function') {
              target.applySlow(slowDur, slowMult);
            } else if (target.statusEffects && typeof target.statusEffects.applySlow === 'function') {
              target.statusEffects.applySlow(slowDur, slowMult);
            } else {
              target.slowTimer = slowDur;
              target.slowMultiplier = slowMult;
            }
          } else {
            // Keep strictly anchored at the pinned wall position
            if (target.pinnedWallX !== undefined && target.pinnedWallY !== undefined) {
              target.x = target.pinnedWallX;
              target.y = target.pinnedWallY;
            }
            target.vx = 0;
            target.vy = 0;
            target.knockbackVx = 0;
            target.knockbackVy = 0;

            if (target.naoyaWallPinTimer % 12 === 0) {
              spawnSparks(target.x, target.y, 2, '#00F2FE');
            }
          }
        }
      }
    }

    // Update active 24 FPS Frame Stasis targets
    const updateFreezeEntity = (entity) => {
      if (entity && (entity.frameFreezeTimer > 0 || entity.isFrameFrozen)) {
        const isCurrentComboVictim = (this.isExecutingFlurry && (this.flurryTarget === entity || (state.fighters && state.fighters.includes(entity) && !this.isTeammate(entity)))) ||
                                     (this.isStabbingKnife && this.knifeStabTarget === entity);
        if (isCurrentComboVictim) {
          // Maintain active time-stop lock on combo victim
          entity.isFrameFrozen = true;
          if (typeof entity.applyTimeStop === 'function') {
            entity.applyTimeStop(30, { isFrameStasis: true, isNaoya: true });
          } else {
            entity.timeStopTimer = Math.max(entity.timeStopTimer || 0, 30);
          }
          return;
        }

        // If not a combo victim, tick down independent frameFreezeTimer
        if (entity.frameFreezeTimer > 0 && entity.frameFreezeTimer < 900) {
          entity.frameFreezeTimer--;
          if (entity.frameFreezeTimer <= 0) {
            this.endFrameStasis(entity);
          }
        } else if (!this.isExecutingFlurry && !this.isStabbingKnife && !this.isExecutingUlt) {
          this.endFrameStasis(entity);
        }
      }
    };
    if (state.fighters && Array.isArray(state.fighters)) {
      for (const f of state.fighters) updateFreezeEntity(f);
    }
    if (state.illusions && Array.isArray(state.illusions)) {
      for (const ill of state.illusions) updateFreezeEntity(ill);
    }

    // Update active 24 FPS shutter glass break animations
    updateShutterGlassBreaks();

    // 6. AI Decision Matrix
    if (
      opponent &&
      !opponent.isDead &&
      (opponent.hp || 0) > 0 &&
      !this.isExecutingUlt &&
      !this.isDashingBlitz &&
      !this.isExecutingFlurry &&
      !this.isStabbingKnife &&
      (this.postComboUltDelay || 0) <= 0 &&
      this.ultBreatherTimer <= 0
    ) {
      const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      const cfg = CONFIG.naoya || {};
      const maxStacks = cfg.maxFrameStacks !== undefined ? cfg.maxFrameStacks : 25;
      const isUltEnabled = Boolean(cfg.enableUltimate !== 0 && cfg.enableUltimate !== false && cfg.enableUltimate !== '0');
      const canBlitz = Boolean(cfg.enableFrameBlitz && cfg.enableFrameBlitz !== 0 && cfg.enableFrameBlitz !== '0' && cfg.enableFrameBlitz !== false);
      const canSonicKick = Boolean(cfg.enableSonicKick && cfg.enableSonicKick !== 0 && cfg.enableSonicKick !== '0' && cfg.enableSonicKick !== false);

      // Ultimate trigger when ready, max frame stacks reached, not executing flurry or stab, and post-combo delay expired
      if (isUltEnabled && this.ultCooldown <= 0 && (this.frameStacks || 0) >= maxStacks && !this.isExecutingFlurry && !this.isStabbingKnife && (this.postComboUltDelay || 0) <= 0 && dist < 240) {
        this._castUltimate(opponent);
      } else if (canBlitz && !this.isExecutingFlurry && !this.isStabbingKnife && this.skill1Cooldown <= 0 && dist < 220) {
        this._castFrameBlitz(opponent);
      } else if (canSonicKick && !this.isExecutingFlurry && !this.isStabbingKnife && this.skill2Cooldown <= 0 && dist < 180) {
        this._castSonicKick(opponent);
      }
    }

    if (this.isStationarySkillActive()) {
      this.vx = 0;
      this.vy = 0;
    }

    // 7. Centralized Movement & Physics Standard (Rule 1.2)
    super.update(opponent, ownerIndex, arena);

    // 8. Projection Sorcery Forward-Projected Frame Logic (Calculated post-movement along physical forward vector)
    this._updateProjectionSorceryAheadFrame(arena);
  }

  isStationarySkillActive() {
    return Boolean(
      this.isCurseWomb ||
      this.isTurbineInhaling ||
      this.isRamjetCharging ||
      this.isExecutingFlurry ||
      this.isStabbingKnife ||
      this.isDashingBlitz ||
      this.isExecutingUlt ||
      (this.ultBreatherTimer && this.ultBreatherTimer > 0) ||
      super.isStationarySkillActive?.()
    );
  }

  canAim() {
    if (
      this.isCurseWomb ||
      this.isRamjetCharging ||
      this.isRamjetLunging ||
      this.isTurbineInhaling ||
      this.isExecutingUlt ||
      this.isExecutingFlurry ||
      this.isDashingBlitz ||
      this.isStabbingKnife ||
      (this.ultBreatherTimer && this.ultBreatherTimer > 0)
    ) {
      return false;
    }
    return super.canAim();
  }

  /**
   * Centralized wall bounce handler (Rule 1.2).
   * In Curse Form, high-speed kinetic wall impacts generate +25% Mach Gauge.
   */
  resolveWallBounce(arena, opponent) {
    if (this.isCaughtInBeam?.() || this.isDraggedByGetsuga || this.isWallPinnedByMakima || this.isWallPinnedBySaitama) {
      return super.resolveWallBounce(arena, opponent);
    }
    const bounced = super.resolveWallBounce(arena, opponent);
    if (bounced && this.isCurseForm) {
      const cfg = CONFIG.naoya || {};
      const bonus = cfg.machGaugePerRicochet || 25;
      this.machGauge = Math.min(100, (this.machGauge || 0) + bonus);
      spawnSparks(this.x, this.y, 6, '#00F2FE');
    }
    return bounced;
  }

  /**
   * Evaluates if Naoya's movement speed is slowed or hindered by any attack or status effect debuff.
   * @returns {boolean}
   */
  isMovementSlowed() {
    // 1. Direct slow timer or slow multiplier
    if (this.slowTimer > 0 || (this.slowMultiplier !== undefined && this.slowMultiplier < 0.99)) return true;

    // 2. StatusEffectsManager slow tracking
    if (this.statusEffects) {
      if (this.statusEffects.slowTimer > 0 || (this.statusEffects.slowMultiplier !== undefined && this.statusEffects.slowMultiplier < 0.99) || this.statusEffects.isSlowed) {
        return true;
      }
    }

    // 3. Stun / Paralyze / Freeze / Time-stop / Hit-stun CCs
    if (this.hitStunTimer > 0 || this.paralyzeTimer > 0 || this.timeStopTimer > 0 || this.frameFreezeTimer > 0) return true;
    if (this.statusEffects && (this.statusEffects.hitStunTimer > 0 || this.statusEffects.paralyzeTimer > 0 || this.statusEffects.timeStopTimer > 0 || this.statusEffects.isFrozen || this.statusEffects.isParalyzed)) return true;

    // 4. Trapped in external beams / grabs / drags
    if (typeof this.isCaughtInBeam === 'function' && this.isCaughtInBeam()) return true;
    if (this.isDraggedByGetsuga || this.isWallPinnedByMakima || this.isWallPinnedBySaitama) return true;
    if ((this.caughtInLaserBeamTimer || 0) > 0 || (this.caughtInLaylaBeamTimer || 0) > 0 || (this.caughtInNamelessBeamTimer || 0) > 0) return true;
    if (this.isTargetOfAmbush) return true;

    // 5. Post-ultimate crash breather recovery slow
    if (this.ultBreatherTimer && this.ultBreatherTimer > 0) return true;

    return false;
  }

  /**
   * Evaluates the completion of a flurry barrage:
   * ONLY executes the Cursed Tanto Knife Stab Finisher if Naoya successfully put the enemy
   * in 24-Frame Palm Touch: Frame Freeze Stasis during the combo.
   * Otherwise, the flurry concludes naturally with regular cooldowns.
   * @param {Object} target
   * @param {number} ownerIndex
   * @param {Object} [cfg]
   */
  _evaluateFlurryFinisher(target, ownerIndex, cfg = CONFIG.naoya || {}) {
    const isTargetFrozen = Boolean(target && !target.isDead && (target.isFrameFrozen || (target.frameFreezeTimer && target.frameFreezeTimer > 0)));
    if (this.flurryTriggeredStasis && isTargetFrozen) {
      this._triggerKnifeStabFinisher(target, ownerIndex);
    } else {
      this.isExecutingFlurry = false;
      this.punchAnimTimer = 0;
      const tantoCd = cfg.tantoCooldown !== undefined ? cfg.tantoCooldown : (cfg.punchCooldown || 40);
      this.shootCooldown = tantoCd;
      this.shootCooldownMax = tantoCd;
      this.postComboUltDelay = cfg.ultPostComboDelayFrames !== undefined ? cfg.ultPostComboDelayFrames : 120;
      if (target && !isTargetFrozen) {
        this.endFrameStasis(target);
      }
    }
  }

  /**
   * Final Strike: Naoya unsheathes his concealed cursed tanto knife and smoothly stabs the enemy in the front.
   * ONLY executed when the target is trapped in 24-Frame Palm Touch Frame Freeze Stasis.
   * @param {Object} target
   * @param {number} ownerIndex
   */
  _triggerKnifeStabFinisher(target, ownerIndex) {
    const cfg = CONFIG.naoya || {};
    const isTargetFrozen = Boolean(target && !target.isDead && (target.isFrameFrozen || (target.frameFreezeTimer && target.frameFreezeTimer > 0)));
    if (!isTargetFrozen) {
      this.isExecutingFlurry = false;
      this.punchAnimTimer = 0;
      const tantoCd = cfg.tantoCooldown !== undefined ? cfg.tantoCooldown : (cfg.punchCooldown || 40);
      this.shootCooldown = tantoCd;
      this.shootCooldownMax = tantoCd;
      this.postComboUltDelay = cfg.ultPostComboDelayFrames !== undefined ? cfg.ultPostComboDelayFrames : 120;
      return;
    }

    const stabFrames = cfg.knifeStabFrames || 38;
    this.isExecutingFlurry = false;
    this.isStabbingKnife = true;
    this.knifeStabTimer = stabFrames;
    this.knifeStabMaxTimer = stabFrames;
    this.knifeStabTarget = target;
    this.knifeStabOwnerIndex = ownerIndex;
    this.knifeStabHitDone = false;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    // Smoothly reposition directly in front of target
    this._positionForKnifeStab(target);

    // Audio SFX 1: Take off / Unsheathe Knife
    audioSystem.playSFX('naoya_takeoff_knife', cfg.soundVolumes?.knifeTakeoff ?? 1.05);
  }

  _positionForKnifeStab(target) {
    if (!target || target.isDead) return;
    const dx = target.x - this.x;
    const dy = (target.y - (target.z || 0)) - (this.y - (this.z || 0));
    const angle = Math.atan2(dy, dx);
    this.gunAngle = angle;
    this.angle = angle;

    const targetDist = (this.r || 25) + (target.r || 25) + 12;
    const arena = (typeof state !== 'undefined' ? state.arena : null);
    let newX = target.x - Math.cos(angle) * targetDist;
    let newY = target.y - Math.sin(angle) * targetDist;

    if (arena) {
      const margin = (this.r || 25) + 10;
      newX = Math.max(arena.x + margin, Math.min(arena.x + arena.width - margin, newX));
      newY = Math.max(arena.y + margin, Math.min(arena.y + arena.height - margin, newY));
    }

    this.x = newX;
    this.y = newY;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.aim(target);
  }

  applyMovementPhysics(extraMultiplier = 1) {
    if (this.isStationarySkillActive()) {
      this.vx = 0;
      this.vy = 0;
      return;
    }
    // High-speed safety clamp to prevent coordinate tunneling / corner-wedging
    const effectiveSpeed = Math.min(22.0, this.speed);
    const speedRatio = this.speed > 0 ? effectiveSpeed / this.speed : 1;
    super.applyMovementPhysics(extraMultiplier * speedRatio);
  }

  resolveWallBounce(arena, opponent) {
    if (this.isStationarySkillActive()) {
      return false;
    }
    return super.resolveWallBounce(arena, opponent);
  }

  /**
   * Updates Projection Sorcery 24-FPS single ahead frame.
   * Spawns strictly in the direction Naoya is moving forward (velocity vector).
   * Every time Naoya steps on the ahead frame, a new frame spawns further forward.
   * @param {Object} arena
   */
  _updateProjectionSorceryAheadFrame(arena) {
    // 1. Ahead Frame Generation (only active during normal combat / blitz dashes; inactive during ult, breather, or when slowed)
    if (this.isExecutingUlt || (this.ultBreatherTimer && this.ultBreatherTimer > 0) || this.isMovementSlowed()) {
      this.projectedFrame = null;
    } else {
      const moveSpeed = Math.hypot(this.vx, this.vy);
      const isMoving = moveSpeed > 0.3 || this.isDashingBlitz || this.isSonicKicking;

      if (isMoving) {
        // Where he is moving forward (strictly velocity travel vector or blitz dash)
        let movingForwardAngle;
        if (this.isDashingBlitz) {
          movingForwardAngle = Math.atan2(this.blitzTargetY - this.blitzStartY, this.blitzTargetX - this.blitzStartX);
        } else if (moveSpeed > 0.15) {
          movingForwardAngle = Math.atan2(this.vy, this.vx);
        } else {
          movingForwardAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
        }

        const cfgLeadMult = CONFIG.naoya?.projectedFrameLeadOffset ?? 1.0;
        const leadDist = (this.r || 25) * cfgLeadMult + Math.min(14, (this.speed || 5.6) * 1.2);
        const arenaBox = arena || state.arena || { x: 40, y: 170, width: 460, height: 460 };
        const margin = (this.r || 25) + 8;

        let targetFrameX = this.x + Math.cos(movingForwardAngle) * leadDist;
        let targetFrameY = this.y + Math.sin(movingForwardAngle) * leadDist;

        if (arenaBox) {
          targetFrameX = Math.max(arenaBox.x + margin, Math.min(arenaBox.x + arenaBox.width - margin, targetFrameX));
          targetFrameY = Math.max(arenaBox.y + margin, Math.min(arenaBox.y + arenaBox.height - margin, targetFrameY));
        }

        if (!this.projectedFrame || !this.projectedFrame.active) {
          this.projectedFrame = {
            x: targetFrameX,
            y: targetFrameY,
            angle: movingForwardAngle,
            alpha: 0.95,
            popTimer: 0,
            lifeTimer: 0,
            stepCount: 1,
            active: true
          };
        } else {
          this.projectedFrame.lifeTimer = (this.projectedFrame.lifeTimer || 0) + 1;
          const distToFrame = Math.hypot(this.x - this.projectedFrame.x, this.y - this.projectedFrame.y);
          const stepThreshold = (this.r || 25) * (CONFIG.naoya?.projectedFrameStepDistance ?? 0.85);
          const hasSteppedOnFrame = distToFrame <= stepThreshold;

          // Check if movement trajectory turned significantly away from the previous frame
          const angleToOldFrame = Math.atan2(this.projectedFrame.y - this.y, this.projectedFrame.x - this.x);
          let headingDiff = Math.abs(movingForwardAngle - angleToOldFrame);
          while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
          headingDiff = Math.abs(headingDiff);

          // If stepped on frame, or turned trajectory, or frame lingered: spawn new frame forward!
          if (hasSteppedOnFrame || headingDiff > 1.05 || this.projectedFrame.lifeTimer > 18) {
            const isCyan = (this.projectedFrame.stepCount || 1) % 2 === 0;

            if (hasSteppedOnFrame) {
              // Preserve stepped afterimage frame to smoothly fade out in place
              this.steppedFrames.push({
                x: this.projectedFrame.x,
                y: this.projectedFrame.y,
                angle: this.projectedFrame.angle || movingForwardAngle,
                alpha: 0.85,
                stepCount: this.projectedFrame.stepCount || 1
              });
            }

            this.projectedFrame.stepCount++;
            this.projectedFrame.popTimer = 8;
            this.projectedFrame.lifeTimer = 0;
            this.projectedFrame.x = targetFrameX;
            this.projectedFrame.y = targetFrameY;
            this.projectedFrame.angle = movingForwardAngle;
            this.projectedFrame.alpha = 0.95;
            this.projectedFrame.active = true;
          }

          if (this.projectedFrame.popTimer > 0) {
            this.projectedFrame.popTimer--;
          }
        }
      } else {
        if (this.projectedFrame && this.projectedFrame.active) {
          this.projectedFrame.alpha -= 0.05;
          if (this.projectedFrame.alpha <= 0) {
            this.projectedFrame.active = false;
          }
        }
      }
    }

    // 2. Unconditionally Decay Stepped Frames on every tick (smoothly fade out over their full lifespan)
    for (let i = this.steppedFrames.length - 1; i >= 0; i--) {
      const sf = this.steppedFrames[i];
      if (sf.maxLife && sf.maxLife > 0) {
        sf.lifeTimer = (sf.lifeTimer || 0) + 1;
        const prog = Math.min(1.0, sf.lifeTimer / sf.maxLife);
        sf.alpha = (sf.maxAlpha || 1.0) * Math.pow(1.0 - prog, 1.25);
        if (sf.lifeTimer >= sf.maxLife || sf.alpha <= 0.01) {
          this.steppedFrames.splice(i, 1);
        }
      } else {
        sf.alpha -= 0.035; // Smooth fade out over ~28 frames
        if (sf.alpha <= 0.01) {
          this.steppedFrames.splice(i, 1);
        }
      }
    }

    // 3. Unconditionally Update Step Pop Particle Animations
    for (let i = this.frameStepPops.length - 1; i >= 0; i--) {
      const pop = this.frameStepPops[i];
      pop.timer++;
      if (pop.timer >= pop.maxTimer) {
        this.frameStepPops.splice(i, 1);
      }
    }

    // 4. Record High-Speed & Idle Movement Afterimages fading 1 by 1
    const cfg = CONFIG.naoya || {};
    const enableMovementAI = cfg.enableMovementAfterimages !== false;
    const isSlowed = this.isMovementSlowed();

    if (isSlowed && !this.isExecutingFlurry && !this.isStabbingKnife) {
      // If movement is slowed by any attack or debuff, hide and clear idle movement afterimages
      this.movementAfterimages = [];
      this.afterimages = [];
    } else if (enableMovementAI && !this.isExecutingUlt) {
      const moveSpeed = Math.hypot(this.vx, this.vy);
      const minSpeed = cfg.movementAfterimageMinSpeed ?? 0.8;
      const interval = Math.max(1, cfg.movementAfterimageInterval ?? 4);
      const maxLife = cfg.movementAfterimageLifespanFrames ?? 24;
      const startAlpha = cfg.movementAfterimageAlpha ?? 0.65;

      if (!this.movementAfterimages) this.movementAfterimages = [];
      if (this._movementAfterimageTick === undefined) this._movementAfterimageTick = 0;

      const isMovingActive = moveSpeed >= minSpeed || this.isDashingBlitz || this.isSonicKicking || (this.isExecutingFlurry && this.ultBreatherTimer <= 0) || this.isSubsonicOverdrive;

      if (isMovingActive) {
        this._movementAfterimageTick++;
        if (this._movementAfterimageTick % interval === 0) {
          this.movementAfterimages.push({
            x: this.x,
            y: this.y,
            gunAngle: this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0),
            alpha: startAlpha,
            maxAlpha: startAlpha,
            lifeTimer: 0,
            maxLife: maxLife
          });

          // Pop shockwave ring on each movement afterimage step (matching ultimate runway rhythm pop)
          const enableShockwave = cfg.movementAfterimageShockwaves !== false;
          if (enableShockwave) {
            const shockwaveMult = cfg.movementAfterimageShockwaveRadiusMult ?? 1.8;
            if (!this.sonicShockwaves) this.sonicShockwaves = [];
            this.sonicShockwaves.push({
              x: this.x,
              y: this.y,
              currentRadius: 4,
              maxRadius: (this.r || 25) * shockwaveMult,
              timer: 0,
              maxTimer: 14
            });
          }

          if (cfg.movementAfterimageSFX) {
            audioSystem.playSFX('swordswing', 0.40);
          }
        }
      }

      // Age and fade movement/idle afterimages 1 by 1
      const fadeEase = cfg.movementAfterimageFadeEase ?? 1.15;
      for (let i = this.movementAfterimages.length - 1; i >= 0; i--) {
        const af = this.movementAfterimages[i];
        af.lifeTimer++;
        const prog = Math.min(1.0, af.lifeTimer / Math.max(1, af.maxLife));
        af.alpha = af.maxAlpha * Math.pow(1.0 - prog, fadeEase);
        if (af.lifeTimer >= af.maxLife || af.alpha <= 0.005) {
          this.movementAfterimages.splice(i, 1);
        }
      }
    }

    // 6. Unconditionally Decay Burning Asphalt Tire Skid Marks
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      const sm = this.skidMarks[i];
      sm.timer--;
      sm.alpha = Math.max(0, sm.timer / 120);
      if (sm.timer <= 0) {
        this.skidMarks.splice(i, 1);
      }
    }
  }

  draw(ctx, opponent) {
    // 00. Domain Expansion Visuals: Time Cell Moon Palace (Tokyū Gesshōkyū)
    if (this.isDomainActive) {
      drawTimeCellMoonPalaceDomain(ctx, this);
    }

    // 0A. Draw Burning Asphalt Tire Skid Marks on the ground
    if (this.skidMarks && this.skidMarks.length > 0) {
      for (let i = 0; i < this.skidMarks.length; i++) {
        const sm = this.skidMarks[i];
        if (sm.alpha <= 0.01) continue;
        ctx.save();
        // Thick black rubber skid
        ctx.strokeStyle = `rgba(15, 23, 42, ${sm.alpha * 0.85})`;
        ctx.lineWidth = 4.0;
        ctx.beginPath();
        ctx.moveTo(sm.x1, sm.y1);
        ctx.lineTo(sm.x2, sm.y2);
        ctx.stroke();

        // Neon cyan friction ember core
        ctx.strokeStyle = `rgba(0, 242, 254, ${sm.alpha * 0.45})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
      }
    }

    // 0B. Draw Mach 3 Runway Out-of-Bounds Visuals & Aim Needle during Ultimate (Human form)
    if (!this.isCurseForm) {
      drawNaoyaMachRunwayVFX(ctx, this);
    }

    // 0C. Draw Curse Form Ramjet Vector & Inhale VFX
    if (this.isCurseForm) {
      if (this.isRamjetCharging || this.isRamjetLunging) {
        drawCurseNaoyaMachRamjetVFX(ctx, this);
      }
      if (this.isTurbineInhaling) {
        drawCurseTurbineCannonVFX(ctx, this);
      }
    }

    // 1. Draw Cocoon if in Womb Phase
    if (this.isCurseWomb) {
      drawCursedWombCocoonVFX(ctx, this);
    }

    // 2. Draw Projection Sorcery Forward-Projected 24 FPS Ghost Frames & Flurry Stepped Afterimages (Human form)
    if (!this.isCurseForm) {
      drawProjectionSorceryForwardFrames(ctx, this);
    }

    // 3. Draw Trailing Ghost Model Afterimages (Fading out 1 by 1)
    if (!this.isMovementSlowed() || this.isExecutingFlurry) {
      if (this.movementAfterimages && this.movementAfterimages.length > 0) {
        for (let i = 0; i < this.movementAfterimages.length; i++) {
          const af = this.movementAfterimages[i];
          if (af && af.alpha > 0.01) {
            drawNaoyaGhostModel(ctx, af.x, af.y, af.gunAngle || 0, this.r || 25, af.alpha);
          }
        }
      }
      for (let i = 0; i < this.afterimages.length; i++) {
        const ai = this.afterimages[i];
        if (ai && ai.alpha > 0.01) {
          drawNaoyaGhostModel(ctx, ai.x, ai.y, ai.gunAngle || 0, this.r || 25, ai.alpha * 0.60);
        }
      }
    }

    // 4. Draw Active Sonic Boom Rings
    for (let i = 0; i < this.sonicShockwaves.length; i++) {
      const sw = this.sonicShockwaves[i];
      drawSonicBoomRing(ctx, sw.x, sw.y, sw.currentRadius, sw.maxRadius, sw.timer / sw.maxTimer, sw.angle || 0);
    }

    // 5. Draw Main Body Skin (handles cocoon, curse skin, human skin)
    drawNaoyaSkin(ctx, this);

    // 5B. Draw Curse Mach Gauge HUD if in Curse Form
    if (this.isCurseForm) {
      drawCurseMachGaugeHUD(ctx, this);
    }

    // 6. Draw 24 FPS Frame Stasis Overlay if opponent or minion is frame-frozen
    if (state.fighters && Array.isArray(state.fighters)) {
      for (const f of state.fighters) {
        if (f && (f.frameFreezeTimer > 0 || f.isFrameFrozen)) {
          draw24FPSFrameStasisOverlay(ctx, f, f.frameFreezeTimer || 60);
        }
      }
    }
    if (state.illusions && Array.isArray(state.illusions)) {
      for (const ill of state.illusions) {
        if (ill && (ill.frameFreezeTimer > 0 || ill.isFrameFrozen)) {
          draw24FPSFrameStasisOverlay(ctx, ill, ill.frameFreezeTimer || 60);
        }
      }
    }

    // 7. Draw Active 24 FPS Shutter Glass Break Effects
    drawShutterGlassBreaks(ctx);

    // 8. Draw Overlay Health Text and Freeze Timer on top layer (Rule 21)
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }

  drawBody(ctx) {
    drawNaoyaSkin(ctx, this);
  }

  /**
   * Helper to trigger shutter glass break animation on a target entity.
   * @param {Object} [target=null]
   * @param {Object} [opts={}]
   */
  triggerShutterGlassBreak(target = null, opts = {}) {
    triggerShutterGlassBreak(target || this, opts);
  }
}

