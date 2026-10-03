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
  sampleNaoyaRunwaySpline
} from '../../graphics/weapons/naoyaWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

export class NaoyaFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'naoya';
    this.type = 'naoya';
    this.name = 'Naoya Zenin';

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
    this.flurryStacksGained = 0;
    this.disruptionHits = new Map(); // Target -> Disruption Hit Count
    this.frameFreezeCooldownTimer = 0;
    this.frameFreezeCooldownMax = cfg.frameFreezeCooldown !== undefined ? cfg.frameFreezeCooldown : 240;

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

    // Ultimate: 24 FPS Shutter Execution & Vehicular Run-Over
    this.ultCooldown = 0;
    this.ultCooldownMax = cfg.ultCooldown || 1440; // 24.0s
    this.isExecutingUlt = false;
    this.ultPhase = 0;
    this.ultTimer = 0;
    this.ultTarget = null;
    this.ultStrikesDone = 0;
    this.ultRunOverTimer = 0;
    this.ultBreatherTimer = 0;
    this.ultBreachAngle = 0;
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
        name: 'Frame Blitz',
        type: 'basic',
        cooldownKey: 'skill1Cooldown',
        cooldownMax: () => this.skill1CooldownMax,
        color: this.themeColor,
        onActivate: (fighter, opponent) => {
          fighter._castFrameBlitz(opponent);
        }
      },
      {
        id: 'sonic_kick',
        name: 'Sonic Rebound Kick',
        type: 'basic',
        cooldownKey: 'skill2Cooldown',
        cooldownMax: () => this.skill2CooldownMax,
        color: '#C8E64A',
        onActivate: (fighter, opponent) => {
          fighter._castSonicKick(opponent);
        }
      },
      {
        id: 'shutter_exec',
        name: 'Mach 3 Runway Breach',
        type: 'ultimate',
        cooldownKey: 'ultCooldown',
        cooldownMax: () => this.ultCooldownMax,
        color: '#00F2FE',
        isUltimate: true,
        canCast: (fighter) => {
          const cfg = CONFIG.naoya || {};
          const maxStacks = cfg.maxFrameStacks !== undefined ? cfg.maxFrameStacks : 25;
          return (fighter.frameStacks || 0) >= maxStacks;
        },
        onActivate: (fighter, opponent) => {
          fighter._castUltimate(opponent);
        }
      }
    ]);
  }

  reset() {
    super.reset();
    this.frameStacks = 0;
    this.speed = this.baseSpeed;
    const cfg = CONFIG.naoya || {};
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
    if (this.disruptionHits) this.disruptionHits.clear();
    else this.disruptionHits = new Map();
    this.frameFreezeCooldownTimer = 0;
    this.skill1Cooldown = 0;
    this.skill2Cooldown = 0;
    this.ultCooldown = 0;
    this.isDashingBlitz = false;
    this.isSonicKicking = false;
    this.isExecutingUlt = false;
    this.ultTargetX = null;
    this.ultTargetY = null;
    this.ultPathAngle = 0;
    this.ultBreatherTimer = 0;
    if (this.sonicShockwaves) this.sonicShockwaves.length = 0;
    else this.sonicShockwaves = [];
    if (this.afterimages) this.afterimages.length = 0;
    else this.afterimages = [];
    if (this.frameStepPops) this.frameStepPops.length = 0;
    else this.frameStepPops = [];
    if (this.steppedFrames) this.steppedFrames.length = 0;
    else this.steppedFrames = [];
    this.projectedFrame = null;
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
   * Applies Frame Stasis (1.0s 24 FPS Freeze) to a target.
   * @param {Object} target
   * @param {number} duration
   */
  applyFrameStasis(target, duration = 60) {
    if (!target || target.isDead || (target.hp || 0) <= 0) return;

    // Check Gojo Infinity (Rule 1.7)
    if (target.characterId === 'gojo' || target.type === 'gojo') {
      if (target.infinityCooldown <= 0) {
        spawnFloatingText(target.x, target.y - target.r - 20, 'INFINITY BLOCKED', '#4da3ff');
        return;
      }
    }

    // Check Toji Heavenly Restriction resilience (0.35s reduced freeze)
    const effectiveDuration = (target.characterId === 'toji' || target.type === 'toji') ? 22 : duration;

    target.frameFreezeTimer = effectiveDuration;
    target.isFrameFrozen = true;

    if (typeof target.applyTimeStop === 'function') {
      target.applyTimeStop(effectiveDuration);
    }

    spawnFloatingText(target.x, target.y - target.r - 20, '24 FPS FREEZE!', '#00F2FE');
    audioSystem.playSFX('enhance', 0.9);
    triggerGlobalScreenShake(4, 6);
  }

  /**
   * Casts Skill 1: Frame Blitz (Nijūyon Koma Senkō)
   */
  _castFrameBlitz(opponent) {
    if (!opponent || opponent.isDead || this.isExecutingUlt) return;

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
    if (!opponent || opponent.isDead || this.isExecutingUlt) return;

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

  /**
   * Casts Ultimate: 24 FPS Mach 3 Runway Breach (Out-of-Bounds Orbit & Breach)
   */
  _castUltimate(opponent) {
    if (!opponent || opponent.isDead || this.isExecutingUlt) return;
    const cfg = CONFIG.naoya || {};
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
    
    // Spawn runway path shooting directly out to Naoya's front based on movement velocity vector or facing angle
    const speed = Math.hypot(this.vx || 0, this.vy || 0);
    const moveAngle = speed > 0.1
      ? Math.atan2(this.vy, this.vx)
      : (this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0));
    this.ultPathAngle = (typeof cfg.ultFixedAngle === 'number')
      ? cfg.ultFixedAngle
      : moveAngle;

    // Clear any lingering combat afterimages, stepped frames, or pop particles
    if (this.afterimages) this.afterimages.length = 0;
    if (this.steppedFrames) this.steppedFrames.length = 0;
    if (this.frameStepPops) this.frameStepPops.length = 0;
    this.projectedFrame = null;
    this.lastSteppedAfterimageIndex = -1;

    // Completely stop enemy from doing anything during the ultimate runway approach!
    opponent.isCaughtInNaoyaUlt = true;
    if (typeof opponent.interruptAttacks === 'function') {
      opponent.interruptAttacks(true);
    }
    opponent.vx = 0;
    opponent.vy = 0;
    opponent.knockbackVx = 0;
    opponent.knockbackVy = 0;
    opponent.isFrameFrozen = true;
    opponent.frameFreezeTimer = 180;

    spawnFloatingText(this.x, this.y - this.r - 25, 'MACH 3 RUNWAY CHARGE!', '#00F2FE');
    audioSystem.playSFX('enhance', 1.1);
    triggerGlobalScreenShake(6, 12);
  }

  interruptAttacks(force = false) {
    if (this.ultTarget && this.ultTarget.isCaughtInNaoyaUlt) {
      this.ultTarget.isCaughtInNaoyaUlt = false;
      this.ultTarget.isFrameFrozen = false;
      this.ultTarget.frameFreezeTimer = 0;
    }
    this.ultTargetX = null;
    this.ultTargetY = null;
    this.isExecutingUlt = false;
    this.ultPhase = 0;
    this.ultTimer = 0;
    this.ultBreatherTimer = 0;
    this.isDashingBlitz = false;
    this.isSonicKicking = false;
    this.isExecutingFlurry = false;
    super.interruptAttacks(force);
  }

  /**
   * Teleports Naoya to a fresh geometric surround angle around the target (3 punches per teleport angle).
   */
  _teleportToFlurryAngle(target, arena) {
    if (!target || target.isDead) return;

    const oldX = this.x;
    const oldY = this.y;

    const cfg = CONFIG.naoya || {};
    const punchesPerTeleport = Math.max(1, cfg.flurryPunchesPerTeleport !== undefined ? cfg.flurryPunchesPerTeleport : 3);
    const tripletIndex = Math.floor((this.flurryHitsDone - 1) / punchesPerTeleport);
    const angleStep = (Math.PI * 2) / 6; // 6 distinct teleport surround positions (60° apart)
    const strikeAngle = (tripletIndex * angleStep) + ((tripletIndex % 2) * (Math.PI * 0.25));
    const orbitDist = (target.r || 25) + (this.r || 25) + (cfg.flurryOrbitDistance ?? 14);

    let targetX = target.x + Math.cos(strikeAngle) * orbitDist;
    let targetY = target.y + Math.sin(strikeAngle) * orbitDist;

    const arenaBox = arena || (typeof state !== 'undefined' ? state.arena : null) || { x: 40, y: 170, width: 460, height: 460 };
    if (arenaBox) {
      const margin = (this.r || 25) + 6;
      targetX = Math.max(arenaBox.x + margin, Math.min(arenaBox.x + arenaBox.width - margin, targetX));
      targetY = Math.max(arenaBox.y + margin, Math.min(arenaBox.y + arenaBox.height - margin, targetY));
    }

    this.x = targetX;
    this.y = targetY;
    this.vx = 0;
    this.vy = 0;

    // Face directly towards target (Rule 1.3 Re-aim Alignment)
    const faceAngle = Math.atan2(target.y - this.y, target.x - this.x);
    this.gunAngle = faceAngle;
    this.angle = faceAngle;

    // Leave a clean stepped ghost model at previous position
    this.steppedFrames.push({
      x: oldX,
      y: oldY,
      angle: faceAngle,
      alpha: 0.85,
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

    // Punch strike shockwave expanding from fist forward
    const fistDist = (this.r || 25) * 1.15;
    const fistX = this.x + Math.cos(aimAngle) * fistDist;
    const fistY = this.y + Math.sin(aimAngle) * fistDist;
    this.sonicShockwaves.push({
      x: fistX,
      y: fistY,
      currentRadius: 4,
      maxRadius: isFinisher ? 65 : 32,
      timer: 0,
      maxTimer: isFinisher ? 12 : 8
    });

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
          // Track Disruption count for 24-Frame Palm Touch Stasis (Passive with Cooldown)
          const canPassiveFreeze = (cfg.enableFrameFreeze !== false) && (this.frameFreezeCooldownTimer <= 0);
          if (canPassiveFreeze) {
            const currentHits = (this.disruptionHits.get(target) || 0) + 1;
            this.disruptionHits.set(target, currentHits);

            if (currentHits >= (cfg.maxDisruptionsForStasis || 3)) {
              this.disruptionHits.set(target, 0);
              this.frameFreezeCooldownTimer = cfg.frameFreezeCooldown !== undefined ? cfg.frameFreezeCooldown : (this.frameFreezeCooldownMax || 240);
              this.applyFrameStasis(target, cfg.frameFreezeDuration || 60);
            }
          }

          // Apply damage
          applyDamageToTarget(target, baseDmg, this, { isMelee: true });

          // Stack speed & evade up to maxStacksPerFlurry during this flurry burst
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

          // Knockback: zero on intermediate flurry hits so enemy stays locked in barrage, heavy on finisher!
          const knockback = isFinisher ? (cfg.tantoKnockback || 16) : 0;
          if (knockback > 0) {
            const kAngle = targetAngle;
            target.vx = (target.vx || 0) + Math.cos(kAngle) * knockback;
            target.vy = (target.vy || 0) + Math.sin(kAngle) * knockback;
          }

          // Spawn high-impact kinetic shockwave ring directly on target hit
          this.sonicShockwaves.push({
            x: target.x,
            y: target.y,
            currentRadius: 6,
            maxRadius: isFinisher ? 80 : 44,
            timer: 0,
            maxTimer: isFinisher ? 14 : 9
          });

          spawnBloodEffect(target.x, target.y, isFinisher ? 10 : 3);
          spawnImpactFlash(target.x, target.y, isFinisher ? 18 : 10, isFinisher ? '#FFFFFF' : this.themeColor);
        }
      }
    }

    if (this.flurryHitsDone % 2 === 0) {
      audioSystem.playSFX('swordswing', 0.85);
    } else {
      audioSystem.playSFX('attack_fleshhit', 0.80);
    }
  }

  /**
   * Executes Primary Attack (Initiates 24 FPS Hypersonic Flurry Barrage)
   */
  shoot(ownerIndex, opponent) {
    if (this.isCaughtInBeam() || this.isExecutingUlt || this.isDashingBlitz || this.isExecutingFlurry || (this.ultBreatherTimer > 0) || (this.shootCooldown > 0)) return;

    const cfg = CONFIG.naoya || {};
    const totalFlurryHits = cfg.basicComboHits || 30;

    this.isExecutingFlurry = true;
    this.flurryHitsTotal = totalFlurryHits;
    this.flurryHitsDone = 0;
    this.flurryTimer = 0;
    this.flurryTarget = opponent;
    this.flurryOwnerIndex = ownerIndex;
    this.flurryStacksGained = 0;
    this.shootCooldownMax = cfg.tantoCooldown || cfg.punchCooldown || 40;

    // Immediately trigger 1st attack at starting teleport position
    this.flurryHitsDone++;
    const isFinisher = this.flurryHitsDone >= this.flurryHitsTotal;
    const baseDmg = isFinisher ? (cfg.punchComboFinisherDamage || cfg.tantoComboFinisherDamage || 18) : (cfg.punchDamage || cfg.tantoDamage || 4);
    this._teleportToFlurryAngle(opponent, (typeof state !== 'undefined' ? state.arena : null));
    this.punchAnimTimer = 8;
    this.punchAnimMaxTimer = 8;
    this.punchAnimHand = (this.flurryHitsDone % 2);
    this._executeFlurryStrike(ownerIndex, isFinisher, baseDmg, cfg);

    if (isFinisher) {
      this.isExecutingFlurry = false;
      this.shootCooldown = this.shootCooldownMax;
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

    if (this.ultBreatherTimer > 0) {
      this.ultBreatherTimer--;
      this.shootCooldown = Math.max(this.shootCooldown || 0, this.ultBreatherTimer);
      this.isExecutingFlurry = false;

      const cfg = CONFIG.naoya || {};
      const maxBreather = cfg.ultPostStrikeBreatherFrames ?? 100;
      const minSlow = cfg.ultPostStrikeSlowMultiplier ?? 0.30;
      // Smoothly recovers from heavy slow (30% speed) back to 100% base speed as breather finishes
      const recoveryProgress = 1 - (this.ultBreatherTimer / maxBreather);
      const currentSlowMult = minSlow + (1 - minSlow) * Math.pow(recoveryProgress, 1.5);
      this.speed = this.baseSpeed * currentSlowMult;

      // Decelerate rebound inertia smoothly
      this.vx *= 0.88;
      this.vy *= 0.88;
    } else if (this.frameStacks === 0 && !this.isExecutingUlt && !this.isDashingBlitz) {
      this.speed = this.baseSpeed;
    }

    if (this.skill1Cooldown > 0) this.skill1Cooldown--;
    if (this.skill2Cooldown > 0) this.skill2Cooldown--;
    if (this.ultCooldown > 0) this.ultCooldown--;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.frameFreezeCooldownTimer > 0) this.frameFreezeCooldownTimer--;

    // 2. Update Primary Attack: 24 FPS Hypersonic Flurry Barrage (3 Punches per Teleport)
    if (this.isExecutingFlurry && this.ultBreatherTimer <= 0) {
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
          const baseDmg = isFinisher ? (cfg.punchComboFinisherDamage || cfg.tantoComboFinisherDamage || 18) : (cfg.punchDamage || cfg.tantoDamage || 4);

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

          if (this.flurryHitsDone % punchesPerTeleport === 0 || isFinisher) {
            spawnFloatingText(this.x, this.y - this.r - 22, `${this.flurryHitsDone}/${this.flurryHitsTotal} FLURRY!`, '#76E042');
          }

          if (isFinisher) {
            this.isExecutingFlurry = false;
            this.shootCooldown = cfg.punchCooldown || cfg.tantoCooldown || 40;
          }
        } else {
          this.isExecutingFlurry = false;
          this.shootCooldown = cfg.punchCooldown || cfg.tantoCooldown || 40;
        }
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
          applyDamageToTarget(this.blitzTarget, dmg, this, { isTrueDamage: false });
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
          const target = this.ultTarget;
          if (target && !target.isDead && target._carCrashRagdollTimer <= 0) {
            target.vx = 0;
            target.vy = 0;
            target.knockbackVx = 0;
            target.knockbackVy = 0;
            if (typeof this.ultTargetX === 'number' && typeof this.ultTargetY === 'number') {
              target.x = this.ultTargetX;
              target.y = this.ultTargetY;
            }
          }
          const progress = Math.min(1.0, Math.max(0, this.ultRunwayProgress || 0));

          // Progressive 24 FPS acceleration curve: starts slow and deliberate, ramping into blazing Mach 3
          const startMult = cfg.ultRunwayStartSpeedMult ?? 0.25;
          const endMult = cfg.ultRunwayEndSpeedMult ?? 2.85;
          const accelExp = cfg.ultRunwayAccelPower ?? 1.65;
          const accelMult = startMult + (endMult - startMult) * Math.pow(progress, accelExp);

          const baseSpeedRate = cfg.ultRunwaySpeedRate || 0.0055;
          this.ultRunwayProgress = (this.ultRunwayProgress || 0) + baseSpeedRate * accelMult;
          const newProgress = Math.min(1.0, this.ultRunwayProgress);

          const canvasW = (state.canvas && state.canvas.width) || 540;
          const canvasH = (state.canvas && state.canvas.height) || 960;
          const startPos = { x: this.ultStartX, y: this.ultStartY };
          const pathAngle = this.ultPathAngle || 0;
          const targetPos = {
            x: (typeof this.ultTargetX === 'number') ? this.ultTargetX : (target ? target.x : (arenaBox.x + arenaBox.width / 2)),
            y: (typeof this.ultTargetY === 'number') ? this.ultTargetY : (target ? target.y : (arenaBox.y + arenaBox.height / 2)),
            r: (target && target.r) ? target.r : 25
          };
          const points = getNaoyaScreenRunwayPoints(arenaBox, canvasW, canvasH, targetPos, startPos, pathAngle);
          const sampled = sampleNaoyaRunwaySpline(points, newProgress);

          this.x = sampled.x;
          this.y = sampled.y;

          // Smoothly align facing direction with runway forward motion without 1-frame snaps
          this.gunAngle = sampled.angle;
          this.angle = sampled.angle;

          // Stepping progression audio during runway acceleration sprint
          const numFrames = cfg.ultRunwayAfterimageCount ?? 52;
          const spacingPower = cfg.ultRunwaySpacingPower ?? 2.15;

          if (this.lastSteppedAfterimageIndex === undefined || this.lastSteppedAfterimageIndex === null) {
            this.lastSteppedAfterimageIndex = -1;
          }

          while (this.lastSteppedAfterimageIndex + 1 < numFrames) {
            const nextIdx = this.lastSteppedAfterimageIndex + 1;
            const u = numFrames > 1 ? (nextIdx / (numFrames - 1)) : 0;
            const frameT = Math.min(1.0, Math.max(0, 1.0 - Math.pow(1.0 - u, spacingPower)));

            if (newProgress >= frameT) {
              this.lastSteppedAfterimageIndex = nextIdx;
              audioSystem.playSFX('swordswing', 0.85);
            } else {
              break;
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

            // 1. Instantly release pre-impact stasis so knockback impulse physically launches the enemy (Toji 3rd sequence standard)
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

            // 4. Naoya naturally rebounds backwards from the strike impact!
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

            const reboundSpeed = cfg.ultPostStrikeReboundSpeed ?? 14.0;
            this.vx = -Math.cos(breachAngle) * reboundSpeed;
            this.vy = -Math.sin(breachAngle) * reboundSpeed;
            const breatherFrames = cfg.ultPostStrikeBreatherFrames ?? 100;
            this.ultBreatherTimer = breatherFrames;
            this.shootCooldown = breatherFrames; // Breather pause before basic attacks resume
            this.skill1Cooldown = Math.max(this.skill1Cooldown || 0, Math.round(breatherFrames * 0.75));
            this.skill2Cooldown = Math.max(this.skill2Cooldown || 0, Math.round(breatherFrames * 0.75));
            this.gunAngle = Math.atan2(target.y - this.y, target.x - this.x);
            this.angle = this.gunAngle;

            // Large expanding sonic boom shockwave ring
            this.sonicShockwaves.push({
              x: target.x,
              y: target.y,
              currentRadius: 12,
              maxRadius: 210,
              timer: 0,
              maxTimer: 22
            });

            spawnBloodEffect(target.x, target.y, 35);
            spawnImpactFlash(target.x, target.y, 45, '#FFFFFF');
            spawnFloatingText(target.x, target.y - target.r - 28, '💥 RUN OVER! MACH 3 CRASH!', '#00F2FE');
            audioSystem.playSFX('yuji-blackflash', 1.45);
            audioSystem.playSFX('groundSmash', 1.35);
            audioSystem.playSFX('sonicKick', 1.25);
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

    // Decrement Frame Freeze stasis timers on targets
    if (state.fighters && Array.isArray(state.fighters)) {
      for (const f of state.fighters) {
        if (f && f.frameFreezeTimer && f.frameFreezeTimer > 0) {
          f.frameFreezeTimer--;
          if (f.frameFreezeTimer <= 0) {
            f.isFrameFrozen = false;
          }
        }
      }
    }

    // 6. AI Decision Matrix
    if (opponent && !opponent.isDead && (opponent.hp || 0) > 0 && !this.isExecutingUlt && !this.isDashingBlitz && this.ultBreatherTimer <= 0) {
      const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      const cfg = CONFIG.naoya || {};
      const maxStacks = cfg.maxFrameStacks !== undefined ? cfg.maxFrameStacks : 25;

      // Ultimate trigger when ready and max frame stacks reached
      if (this.ultCooldown <= 0 && (this.frameStacks || 0) >= maxStacks && dist < 240) {
        this._castUltimate(opponent);
      } else if (this.skill1Cooldown <= 0 && dist < 220) {
        this._castFrameBlitz(opponent);
      } else if (this.skill2Cooldown <= 0 && dist < 180) {
        this._castSonicKick(opponent);
      }
    }

    // 7. Centralized Movement & Physics Standard (Rule 1.2)
    super.update(opponent, ownerIndex, arena);

    // 8. Projection Sorcery Forward-Projected Frame Logic (Calculated post-movement along physical forward vector)
    this._updateProjectionSorceryAheadFrame(arena);
  }

  isStationarySkillActive() {
    return Boolean(this.isDashingBlitz || this.isExecutingUlt || this.isExecutingFlurry);
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
    // 1. Ahead Frame Generation (only active during normal combat / blitz dashes; inactive during ult or breather)
    if (this.isExecutingUlt || (this.ultBreatherTimer && this.ultBreatherTimer > 0)) {
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

    // 2. Unconditionally Decay Stepped Frames on every tick
    for (let i = this.steppedFrames.length - 1; i >= 0; i--) {
      const sf = this.steppedFrames[i];
      sf.alpha -= 0.045; // Smooth fade out over ~18-20 frames
      if (sf.alpha <= 0) {
        this.steppedFrames.splice(i, 1);
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

    // 4. Record High-Speed Afterimage Ghost Trails (Subsonic / Blitz only; Ult uses dedicated runway VFX)
    if ((this.isSubsonicOverdrive || this.isDashingBlitz) && !this.isExecutingUlt) {
      this.afterimages.push({
        x: this.x,
        y: this.y,
        gunAngle: this.gunAngle,
        alpha: 0.70,
        color: this.themeColor
      });
    }

    // 5. Unconditionally Decay Active Afterimages on every frame
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].alpha -= 0.08;
      if (this.afterimages[i].alpha <= 0) {
        this.afterimages.splice(i, 1);
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

    // 0B. Draw Mach 3 Runway Out-of-Bounds Visuals & Aim Needle during Ultimate
    drawNaoyaMachRunwayVFX(ctx, this);

    // 2. Draw Projection Sorcery Forward-Projected 24 FPS Ghost Frames (Ahead of Movement)
    drawProjectionSorceryForwardFrames(ctx, this);

    // 3. Draw Trailing Ghost Model Afterimages
    for (let i = 0; i < this.afterimages.length; i++) {
      const ai = this.afterimages[i];
      if (ai && ai.alpha > 0.01) {
        drawNaoyaGhostModel(ctx, ai.x, ai.y, ai.gunAngle || 0, this.r || 25, ai.alpha * 0.60);
      }
    }

    // 4. Draw Active Sonic Boom Rings
    for (let i = 0; i < this.sonicShockwaves.length; i++) {
      const sw = this.sonicShockwaves[i];
      drawSonicBoomRing(ctx, sw.x, sw.y, sw.currentRadius, sw.maxRadius, sw.timer / sw.maxTimer);
    }

    // 5. Draw Main Body Skin
    drawNaoyaSkin(ctx, this);

    // 6. Draw 24 FPS Frame Stasis Overlay if opponent or minion is frame-frozen
    if (state.fighters && Array.isArray(state.fighters)) {
      for (const f of state.fighters) {
        if (f && f.frameFreezeTimer && f.frameFreezeTimer > 0) {
          draw24FPSFrameStasisOverlay(ctx, f, f.frameFreezeTimer);
        }
      }
    }
  }
}
