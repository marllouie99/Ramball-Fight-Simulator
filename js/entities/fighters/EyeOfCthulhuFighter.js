// ─────────────────────────────────────────────
// Eye of Cthulhu — Ancient Ocular Horror Fighter Entity
// Authentic Terraria Flight Physics & Multi-Phase AI State Machine
// ─────────────────────────────────────────────
import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { eyeOfCthulhuConfig } from '../../configs/characters/eyeOfCthulhuConfig.js';
import { drawEyeOfCthulhuSkin } from '../../graphics/fighters/eyeOfCthulhuSkin.js';
import { state, triggerGlobalScreenShake, spawnFloatingText } from '../../core/state.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { audioSystem } from '../../systems/audioSystem.js';

export const EOC_STATE = {
  HOVER: 'HOVER',
  WINDUP_RAM: 'WINDUP_RAM',
  RAM_DASH: 'RAM_DASH',
  TURNAROUND: 'TURNAROUND',
  FATIGUE_PAUSE: 'FATIGUE_PAUSE',
  TRANSFORMATION: 'TRANSFORMATION',
  P2_CHASE: 'P2_CHASE',
  P2_CHAIN_DASH: 'P2_CHAIN_DASH',
  P2_CHOMP: 'P2_CHOMP',
  P2_ROAR: 'P2_ROAR',
};

export class EyeOfCthulhuFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'eye_of_cthulhu';
    this.type = 'eye_of_cthulhu';

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.eye_of_cthulhu)
      ? CONFIG.eye_of_cthulhu
      : eyeOfCthulhuConfig;

    this.color = cfg.color || '#E11D48';
    this.themeColor = cfg.themeColor || '#E11D48';
    this.damageNumberColor = cfg.themeColor || '#E11D48';

    // Disable default hand & gun rendering for pure monster body
    this.hideHands = true;
    this.hideGun = true;
    this.hideFrontHand = true;
    this.hideBackHand = true;

    // Terrain & Obstacle intangibility (Terraria ghost flight)
    this.isGhostTerrain = true;

    // AI State Machine
    this.aiState = EOC_STATE.HOVER;
    this.stateTimer = cfg.hoverDurationFrames || 260;
    this.hoverOrbitTime = Math.random() * Math.PI * 2;
    this.hoverPhase = Math.random() * Math.PI * 2;
    this.servantSpawnTimer = cfg.servantSpawnIntervalInHover || 140;

    // Ramming mechanics
    this.ramsRemaining = 0;
    this.committedRamAngle = 0;
    this.isRamming = false;
    this.isWindupTelegraph = false;
    this.hitOpponentThisRam = false;

    // Phase 2 & Transformation state
    this.isPhase2 = false;
    this._isPhase2 = false;
    this.isTransforming = false;
    this.hasTransformed = false;
    this.hasShedPupil = false;
    this.transformationSpinAngle = 0;
    this.transformationProgress = 0;
    this.shedGoreParticles = [];
    this.p2ChainDashCooldown = cfg.chainDashCooldown || 480;
    this.p2RoarCooldown = cfg.roarCooldown || 840;
    this.p2ChompCooldown = 0;

    this._registerSkills();
  }

  _registerSkills() {
    this.skills = [
      {
        id: 'servants_of_cthulhu',
        name: 'Servants of Cthulhu',
        cooldown: 720,
        currentCooldown: 0,
        icon: '👁️',
        description: 'Summons mini Servant eyeballs to swarm the target.'
      },
      {
        id: 'triple_ram',
        name: 'Triple Ram Charge',
        cooldown: 600,
        currentCooldown: 0,
        icon: '⚡',
        description: 'Winds up and executes 3 sequential high-speed rams.'
      }
    ];
  }

  update(opponent, ownerIndex, arena) {
    // 1. Universal Freeze & TimeStop Guard (Rule 1.1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.eye_of_cthulhu)
      ? CONFIG.eye_of_cthulhu
      : eyeOfCthulhuConfig;

    // 2. Check Phase 2 Transformation Threshold (50% HP)
    if (!this.hasTransformed && this.hp > 0 && (this.hp / (this.maxHp || 1)) <= (cfg.phase2Threshold || 0.50)) {
      this.hasTransformed = true;
      this.isTransforming = true;
      this.hasShedPupil = false;
      this.transformationProgress = 0;
      this.transformationSpinAngle = this.gunAngle || this.angle || 0;
      this.aiState = EOC_STATE.TRANSFORMATION;
      this.stateTimer = cfg.transformationDurationFrames || 75;
      this.vx = 0;
      this.vy = 0;
      try {
        spawnFloatingText(this.x, this.y - this.r - 20, 'TRANSFORMATION!', '#E11D48');
        audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.95);
      } catch (e) {}
    }

    // 3. Floating Hover Oscillation (skipped when transforming to stay completely stationary)
    if (!this.isTransforming) {
      this.hoverPhase += (cfg.hoverOscillationFreq || 0.06);
      this.z = Math.sin(this.hoverPhase) * (cfg.hoverOscillationAmp || 8.0);
    } else {
      this.z = 0;
    }

    const isTargetAlive = Boolean(opponent && !opponent.isDead && opponent.hp > 0);

    // 4. State Machine Execution
    if (isTargetAlive) {
      this._updateTerrariaAI(opponent, ownerIndex, arena, cfg);
    } else {
      // Idle float when target is down
      this.vx *= 0.92;
      this.vy *= 0.92;
      this.x += this.vx;
      this.y += this.vy;
    }

    // Always update active gore particles
    this._updateShedGoreParticles();

    // 5. Soft Arena Leashing (Bypass standard rigid wall bounce)
    this.resolveWallBounce(arena, opponent);
  }

  _updateTerrariaAI(opponent, ownerIndex, arena, cfg) {
    switch (this.aiState) {
      case EOC_STATE.HOVER:
        this._updateHoverState(opponent, ownerIndex, cfg);
        break;

      case EOC_STATE.WINDUP_RAM:
        this._updateWindupState(opponent, cfg);
        break;

      case EOC_STATE.RAM_DASH:
        this._updateRamDashState(opponent, ownerIndex, cfg);
        break;

      case EOC_STATE.TURNAROUND:
        this._updateTurnaroundState(opponent, cfg);
        break;

      case EOC_STATE.FATIGUE_PAUSE:
        this._updateFatigueState(cfg);
        break;

      case EOC_STATE.TRANSFORMATION:
        this._updateTransformationState(opponent, cfg);
        break;

      case EOC_STATE.P2_CHASE:
        this._updateP2ChaseState(opponent, ownerIndex, cfg);
        break;

      case EOC_STATE.P2_CHAIN_DASH:
        this._updateP2ChainDashState(opponent, ownerIndex, cfg);
        break;

      case EOC_STATE.P2_ROAR:
        this._updateP2RoarState(opponent, ownerIndex, cfg);
        break;

      default:
        this.aiState = EOC_STATE.HOVER;
        break;
    }
  }

  _updateHoverState(opponent, ownerIndex, cfg) {
    if (this.isPhase2) {
      this.aiState = EOC_STATE.P2_CHASE;
      this.stateTimer = cfg.p2RamRecoveryPauseFrames || 12;
      return;
    }

    this.isRamming = false;
    this.isWindupTelegraph = false;
    this.hoverOrbitTime += 0.035;

    // Target position: orbiting above the player
    const targetX = opponent.x + Math.sin(this.hoverOrbitTime) * (cfg.hoverOrbitWobbleAmp || 45);
    const targetY = opponent.y - (cfg.hoverTargetDistanceY || 175) + Math.cos(this.hoverOrbitTime * 0.5) * 20;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    const accel = cfg.hoverAcceleration || 0.24;
    this.vx += (dx / dist) * accel;
    this.vy += (dy / dist) * accel;
    this.vx *= (cfg.hoverFriction || 0.94);
    this.vy *= (cfg.hoverFriction || 0.94);

    this.x += this.vx;
    this.y += this.vy;

    // Pupil dynamically tracks the player
    const aimAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.gunAngle = aimAngle;
    this.angle = aimAngle;

    // Periodic Servant Spawning (Phase 1 only)
    if (!this.isPhase2 && !this.isTransforming) {
      this.servantSpawnTimer--;
      if (this.servantSpawnTimer <= 0) {
        this.servantSpawnTimer = cfg.servantSpawnIntervalInHover || 140;
        this._spawnServantProjectile(ownerIndex, cfg);
      }
    }

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      // Transition to Triple Ram sequence
      this.ramsRemaining = cfg.ramCount || 3;
      this.aiState = EOC_STATE.WINDUP_RAM;
      this.stateTimer = cfg.ramWindupFrames || 24;
    }
  }

  _spawnServantProjectile(ownerIndex, cfg) {
    if (this.isPhase2 || this.isTransforming) return; // Strict zero minions in Phase 2

    if (projectileSystem && projectileSystem.fireProjectile) {
      const pAngle = this.gunAngle + (Math.random() - 0.5) * 0.4;
      const spawnX = this.x + Math.cos(this.gunAngle) * (this.r + 5);
      const spawnY = this.y + Math.sin(this.gunAngle) * (this.r + 5);

      const p = projectileSystem.fireProjectile(
        this,
        ownerIndex,
        cfg.servantDamage || 12,
        false,
        cfg.servantSpeed || 6.5,
        false,
        'servantOfCthulhu',
        spawnX,
        spawnY,
        pAngle
      );

      if (p) {
        p.isServantOfCthulhu = true;
        p.visual = 'servantOfCthulhu';
        p.r = cfg.servantRadius || 11;
        p.color = '#E11D48';
      }

      spawnSparks(spawnX, spawnY, 8, 'bloodSpark', '#E11D48');
    }
  }

  _updateWindupState(opponent, cfg) {
    this.isRamming = false;
    this.isWindupTelegraph = true;

    // Rapid deceleration in place
    this.vx *= (cfg.ramWindupDecel || 0.88);
    this.vy *= (cfg.ramWindupDecel || 0.88);
    this.x += this.vx;
    this.y += this.vy;

    // Lock facing directly at target
    this.committedRamAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.gunAngle = this.committedRamAngle;
    this.angle = this.committedRamAngle;

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      this.aiState = EOC_STATE.RAM_DASH;
      this.stateTimer = cfg.ramDuration || 18;
      this.isRamming = true;
      this.isWindupTelegraph = false;
      this.hitOpponentThisRam = false;
    }
  }

  _updateRamDashState(opponent, ownerIndex, cfg) {
    this.isRamming = true;
    this.isWindupTelegraph = false;

    // Strict Committed Aim Lock (Rule 1.4)
    this.gunAngle = this.committedRamAngle;
    this.angle = this.committedRamAngle;

    const speed = cfg.ramSpeed || 17.5;
    this.vx = Math.cos(this.committedRamAngle) * speed;
    this.vy = Math.sin(this.committedRamAngle) * speed;

    this.x += this.vx;
    this.y += this.vy;

    // Contact Damage check
    if (!this.hitOpponentThisRam) {
      const dist = Math.hypot(this.x - opponent.x, this.y - opponent.y);
      if (dist <= this.r + opponent.r) {
        this.hitOpponentThisRam = true;
        this._applyRamHit(opponent, cfg.ramDamage || 28, cfg.ramKnockback || 14.0);
      }
    }

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      this.ramsRemaining--;
      this.aiState = EOC_STATE.TURNAROUND;
      this.stateTimer = cfg.ramTurnaroundFrames || 12;
    }
  }

  _applyRamHit(opponent, damage, knockback) {
    if (!opponent || typeof opponent.takeDamage !== 'function') return;

    // Gojo Infinity Barrier check (Rule 1.7)
    if (opponent.characterId === 'gojo' && (!opponent.infinityCooldown || opponent.infinityCooldown <= 0)) {
      spawnImpactFlash(this.x, this.y, 40, 'infinitySpark');
      spawnSparks(this.x, this.y, 16, 'infinitySpark', '#38BDF8');
      return;
    }

    // Escanor Solar Poise check (Rule 10 Interaction)
    if (opponent.characterId === 'escanor' && opponent.isTheOneActive) {
      opponent.takeDamage(damage, this);
      this.vx = -this.vx * 0.5;
      this.vy = -this.vy * 0.5;
      return;
    }

    opponent.takeDamage(damage, this, { knockback });

    // Knockback push away from charge vector
    if (typeof opponent.applyKnockback === 'function') {
      opponent.applyKnockback(Math.cos(this.committedRamAngle) * knockback, Math.sin(this.committedRamAngle) * knockback);
    }

    spawnSparks(opponent.x, opponent.y, 14, 'bloodSpark', '#E11D48');
    spawnImpactFlash(opponent.x, opponent.y, 35, 'bloodExplosion');
  }

  _updateTurnaroundState(opponent, cfg) {
    this.isRamming = false;
    this.vx *= 0.88;
    this.vy *= 0.88;
    this.x += this.vx;
    this.y += this.vy;

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      if (this.isPhase2) {
        if (this.ramsRemaining > 0) {
          // Immediately chain next high-speed physical charge
          this.committedRamAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
          this.gunAngle = this.committedRamAngle;
          this.angle = this.committedRamAngle;
          this.aiState = EOC_STATE.P2_CHAIN_DASH;
          this.stateTimer = cfg.p2RamDuration || 15;
          this.isRamming = true;
          this.hitOpponentThisRam = false;
        } else {
          // Sequence complete — brief 12-frame alignment reset before next chain
          this.aiState = EOC_STATE.P2_CHASE;
          this.stateTimer = cfg.p2RamRecoveryPauseFrames || 12;
        }
      } else {
        if (this.ramsRemaining > 0) {
          this.aiState = EOC_STATE.WINDUP_RAM;
          this.stateTimer = cfg.ramWindupFrames || 24;
        } else {
          this.aiState = EOC_STATE.FATIGUE_PAUSE;
          this.stateTimer = cfg.ramFatiguePauseFrames || 45;
        }
      }
    }
  }

  _updateFatigueState(cfg) {
    this.isRamming = false;
    this.isWindupTelegraph = false;
    this.vx *= 0.90;
    this.vy *= 0.90;
    this.x += this.vx;
    this.y += this.vy;

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      if (this.isPhase2) {
        this.aiState = EOC_STATE.P2_CHASE;
        this.stateTimer = cfg.p2RamRecoveryPauseFrames || 12;
      } else {
        this.aiState = EOC_STATE.HOVER;
        this.stateTimer = cfg.hoverDurationFrames || 260;
      }
    }
  }

  _updateTransformationState(opponent, cfg) {
    this.isRamming = false;
    this.isWindupTelegraph = false;
    this.isTransforming = true;

    // Completely stationary in mid-air (vulnerable to attack)
    this.vx = 0;
    this.vy = 0;

    const totalDuration = cfg.transformationDurationFrames || 75;
    this.transformationProgress = Math.min(1, Math.max(0, 1 - (this.stateTimer / totalDuration)));

    // Rapid axial spin
    const spinSpeed = cfg.transformationSpinSpeed || 0.55;
    this.transformationSpinAngle = (this.transformationSpinAngle || 0) + spinSpeed;
    this.angle = this.transformationSpinAngle;
    this.gunAngle = this.transformationSpinAngle;

    // Centrifugal blood sparks flung outwards from spinning body
    const bloodInterval = cfg.transformationBloodSparkInterval || 4;
    if (this.stateTimer % bloodInterval === 0) {
      const spawnDist = this.r * (0.8 + Math.random() * 0.4);
      const bx = this.x + Math.cos(this.transformationSpinAngle) * spawnDist;
      const by = this.y + Math.sin(this.transformationSpinAngle) * spawnDist;
      spawnSparks(bx, by, 3, 'crimson', '#E11D48');
    }

    // Midpoint Shedding Event (~frame 36 / 48% progress)
    const shedThreshold = cfg.transformationShedThreshold || 0.48;
    if (this.transformationProgress >= shedThreshold && !this.hasShedPupil) {
      this.hasShedPupil = true;
      this.isPhase2 = true;
      this._isPhase2 = true;
      this._spawnSheddingGore(cfg);
      triggerGlobalScreenShake(6, 12);
      try {
        spawnImpactFlash(this.x, this.y, 45, 'crimsonSniper');
        audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 1.0);
      } catch (e) {}
    }

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      // Transformation complete! Climax Roar & Shockwave
      this.isTransforming = false;
      this.isPhase2 = true;
      this._isPhase2 = true;
      triggerGlobalScreenShake(cfg.transformationScreenShake || 10, 25);
      spawnImpactFlash(this.x, this.y, cfg.transformationShockwaveRadius || 190, 'crimsonSniper');
      spawnSparks(this.x, this.y, cfg.transformationBloodBurstCount || 20, 'crimson', '#E11D48');

      // Radial pushback on opponent if nearby
      if (opponent && !opponent.isDead) {
        const dx = opponent.x - this.x;
        const dy = opponent.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        const shockRadius = cfg.transformationShockwaveRadius || 190;
        if (dist <= shockRadius) {
          const pushForce = cfg.transformationShockwaveKnockback || 18;
          if (typeof opponent.applyKnockback === 'function') {
            opponent.applyKnockback((dx / dist) * pushForce, (dy / dist) * pushForce);
          }
        }
      }

      try {
        spawnFloatingText(this.x, this.y - this.r - 25, 'ROAAAR!', '#E11D48');
        audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 1.0);
      } catch (e) {}

      this.aiState = EOC_STATE.P2_CHASE;
      this.stateTimer = 120;
    }
  }

  _spawnSheddingGore(cfg) {
    const chunkCount = cfg.transformationGoreChunkCount || 6;
    for (let i = 0; i < chunkCount; i++) {
      const angle = (i / chunkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 4.5 + Math.random() * 4.0;
      this.shedGoreParticles.push({
        x: this.x + Math.cos(angle) * (this.r * 0.5),
        y: this.y + Math.sin(angle) * (this.r * 0.5),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.35,
        size: 5 + Math.random() * 5,
        color: i % 2 === 0 ? '#06B6D4' : '#DC2626', // Iris Cyan / Cornea Red
        alpha: 1.0,
        life: 45,
        maxLife: 45
      });
    }
  }

  _updateShedGoreParticles() {
    if (!this.shedGoreParticles || this.shedGoreParticles.length === 0) return;
    for (let i = this.shedGoreParticles.length - 1; i >= 0; i--) {
      const p = this.shedGoreParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.rotation += p.rotSpeed;
      p.life--;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.shedGoreParticles.splice(i, 1);
      }
    }
  }

  applyKnockback(vx, vy, stunFrames = 0, opts = {}) {
    const options = (typeof stunFrames === 'object' && stunFrames !== null)
      ? stunFrames
      : (typeof opts === 'object' && opts !== null ? opts : {});

    // Preserve pulling / dragging / beam suction mechanics (Getsuga, Pure Love Beam, Cruel Sun, Vortex, Black Hole)
    const isPullOrDrag = Boolean(
      options.isPull ||
      options.isDrag ||
      options.isBeam ||
      options.isPureLoveBeam ||
      options.isGetsuga ||
      options.isCruelSun ||
      options.isVortex ||
      options.fromBlackHole ||
      this.isDraggedByGetsuga ||
      this._draggedByCruelSun ||
      this.isCaughtInCruelSun ||
      (typeof this.isCaughtInBeam === 'function' && this.isCaughtInBeam()) ||
      this.isCaughtInBlackHole ||
      this._insideBlackHole
    );

    if (isPullOrDrag) {
      const stun = typeof stunFrames === 'number' ? stunFrames : (options.stunDuration || 0);
      return super.applyKnockback(vx, vy, stun);
    }
    // 100% Immune to standard hit knockback & push back from strikes, bullets, and explosions
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    return;
  }

  takeDamage(amount, attacker, opts = {}) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.eye_of_cthulhu)
      ? CONFIG.eye_of_cthulhu
      : eyeOfCthulhuConfig;

    // Phase 1 has 15% DR from its protective outer lens; Phase 2 drops defense completely to 0 (100% full unmitigated damage)
    if (!this.isPhase2 && !this.isTransforming) {
      const dr = (cfg.defenseReductionPhase1 !== undefined) ? cfg.defenseReductionPhase1 : 0.15;
      amount = Math.max(1, amount * (1 - dr));
    }

    if (opts && typeof opts === 'object') {
      opts.skipKnockback = true;
    }

    return super.takeDamage(amount, attacker, opts);
  }

  _updateP2ChaseState(opponent, ownerIndex, cfg) {
    this.isRamming = false;
    this.isWindupTelegraph = false;

    // High speed pursuit and alignment towards player
    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    const chaseSpeed = cfg.p2Speed || cfg.phase2Speed || 8.5;
    this.vx += (dx / dist) * 0.55;
    this.vy += (dy / dist) * 0.55;

    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > chaseSpeed) {
      this.vx = (this.vx / currentSpeed) * chaseSpeed;
      this.vy = (this.vy / currentSpeed) * chaseSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;

    const aimAngle = Math.atan2(dy, dx);
    this.gunAngle = aimAngle;
    this.angle = aimAngle;

    // Melee Chomp bite check if opponent is in proximity
    if (dist <= (cfg.chompReach || 75) && this.p2ChompCooldown <= 0) {
      this.p2ChompCooldown = cfg.chompCooldown || 20;
      this._applyRamHit(opponent, cfg.chompDamage || 40, 10.0);
    }
    if (this.p2ChompCooldown > 0) this.p2ChompCooldown--;

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      // Initiate continuous physical charge sequence
      const hpRatio = (this.hp / (this.maxHp || 1));
      const chainCount = hpRatio < 0.25 ? (cfg.p2RamChainMax || 6) : (cfg.p2RamChainMin || 3);
      this.ramsRemaining = chainCount;
      this.committedRamAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      this.gunAngle = this.committedRamAngle;
      this.angle = this.committedRamAngle;
      this.aiState = EOC_STATE.P2_CHAIN_DASH;
      this.stateTimer = cfg.p2RamDuration || 15;
      this.isRamming = true;
      this.hitOpponentThisRam = false;
    }
  }

  _updateP2ChainDashState(opponent, ownerIndex, cfg) {
    this.isRamming = true;
    this.isWindupTelegraph = false;

    // Strict Committed Aim Lock (Rule 1.4)
    this.gunAngle = this.committedRamAngle;
    this.angle = this.committedRamAngle;

    // Speed scales based on current health (Expert mode enrage scaling)
    const hpRatio = (this.hp / (this.maxHp || 1));
    const speed = hpRatio < 0.25 ? (cfg.p2RamSpeedEnraged || 23.5) : (cfg.p2RamSpeedBase || 19.5);

    this.vx = Math.cos(this.committedRamAngle) * speed;
    this.vy = Math.sin(this.committedRamAngle) * speed;

    this.x += this.vx;
    this.y += this.vy;

    // Contact Damage check (Phase 2 contact damage boosted to 40)
    if (!this.hitOpponentThisRam) {
      const dist = Math.hypot(this.x - opponent.x, this.y - opponent.y);
      if (dist <= this.r + opponent.r) {
        this.hitOpponentThisRam = true;
        this._applyRamHit(opponent, cfg.p2ContactDamage || 40, cfg.p2ContactKnockback || 16.0);
      }
    }

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      this.ramsRemaining--;
      this.aiState = EOC_STATE.TURNAROUND;
      this.stateTimer = cfg.p2RamTurnaroundFrames || 6;
    }
  }

  _updateP2RoarState(opponent, ownerIndex, cfg) {
    this.vx *= 0.85;
    this.vy *= 0.85;
    this.x += this.vx;
    this.y += this.vy;

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      // Release 360° Blood Spike burst
      triggerGlobalScreenShake(6, 15);
      if (projectileSystem && projectileSystem.fireProjectile) {
        const spikeCount = cfg.roarSpikeCount || 12;
        for (let i = 0; i < spikeCount; i++) {
          const sAngle = (i / spikeCount) * Math.PI * 2;
          projectileSystem.fireProjectile(
            this,
            ownerIndex,
            cfg.roarSpikeDamage || 22,
            false,
            cfg.roarSpikeSpeed || 12.0,
            false,
            'bullet',
            this.x,
            this.y,
            sAngle
          );
        }
      }
      this.aiState = EOC_STATE.P2_CHASE;
    }
  }

  resolveWallBounce(arena, opponent) {
    if (this.isCaughtInBeam() || this.isDraggedByGetsuga || this._draggedByCruelSun || this.isCaughtInCruelSun || this.isWallPinnedByMakima || this.isWallPinnedBySaitama || this.isWallPinnedByEscanor || this.isCurrentlyWallPinnedByEscanor) {
      return super.resolveWallBounce(arena, opponent);
    }
    // Terraria-accurate flight: zero rigid wall reflections
    if (!arena && typeof state !== 'undefined') arena = state.arena;
    if (!arena) return false;

    const cx = arena.x + arena.width / 2;
    const cy = arena.y + arena.height / 2;
    const ar = (arena.radius || (arena.width / 2));
    const maxAllowedDist = ar + (eyeOfCthulhuConfig.softLeashRadius || 100);

    const distFromCenter = Math.hypot(this.x - cx, this.y - cy);
    if (distFromCenter > maxAllowedDist && distFromCenter > 0) {
      // Gentle soft steering back towards arena center (smooth parabolic tether)
      const pullForce = 0.45;
      const nx = (cx - this.x) / distFromCenter;
      const ny = (cy - this.y) / distFromCenter;
      this.vx += nx * pullForce;
      this.vy += ny * pullForce;
    }
    return false;
  }

  drawSkin(ctx) {
    drawEyeOfCthulhuSkin(ctx, this);
  }

  drawBody(ctx) {
    drawEyeOfCthulhuSkin(ctx, this);
  }

  drawGun() {
    // Monster entity - no gun barrel
  }
}
