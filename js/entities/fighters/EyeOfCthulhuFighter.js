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

    // Phase 2 state
    this.isPhase2 = false;
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
    if (!this.isPhase2 && this.hp > 0 && (this.hp / (this.maxHp || 1)) <= (cfg.phase2Threshold || 0.50)) {
      this.isPhase2 = true;
      this._isPhase2 = true;
      this.aiState = EOC_STATE.TRANSFORMATION;
      this.stateTimer = cfg.transformationStasisFrames || 45;
      triggerGlobalScreenShake(cfg.transformationScreenShake || 8, 30);
      try {
        audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.95);
      } catch (e) {}
    }

    // 3. Floating Hover Oscillation
    this.hoverPhase += (cfg.hoverOscillationFreq || 0.06);
    this.z = Math.sin(this.hoverPhase) * (cfg.hoverOscillationAmp || 8.0);

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

    // Periodic Servant Spawning
    this.servantSpawnTimer--;
    if (this.servantSpawnTimer <= 0) {
      this.servantSpawnTimer = cfg.servantSpawnIntervalInHover || 140;
      this._spawnServantProjectile(ownerIndex, cfg);
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
    if (projectileSystem && projectileSystem.fireProjectile) {
      const pAngle = this.gunAngle + (Math.random() - 0.5) * 0.4;
      const spawnX = this.x + Math.cos(this.gunAngle) * (this.r + 5);
      const spawnY = this.y + Math.sin(this.gunAngle) * (this.r + 5);

      projectileSystem.fireProjectile(
        this,
        ownerIndex,
        cfg.servantDamage || 12,
        false,
        cfg.servantSpeed || 6.5,
        false,
        'bullet',
        spawnX,
        spawnY,
        pAngle
      );

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
    this.vx *= 0.92;
    this.vy *= 0.92;
    this.x += this.vx;
    this.y += this.vy;

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      if (this.ramsRemaining > 0) {
        this.aiState = EOC_STATE.WINDUP_RAM;
        this.stateTimer = cfg.ramWindupFrames || 24;
      } else {
        this.aiState = EOC_STATE.FATIGUE_PAUSE;
        this.stateTimer = cfg.ramFatiguePauseFrames || 45;
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
      this.aiState = EOC_STATE.HOVER;
      this.stateTimer = cfg.hoverDurationFrames || 260;
    }
  }

  _updateTransformationState(opponent, cfg) {
    this.isRamming = false;
    this.isWindupTelegraph = false;
    this.vx *= 0.85;
    this.vy *= 0.85;
    this.x += this.vx;
    this.y += this.vy;

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      this.aiState = EOC_STATE.P2_CHASE;
      this.stateTimer = 180;
    }
  }

  _updateP2ChaseState(opponent, ownerIndex, cfg) {
    this.isRamming = false;
    this.isWindupTelegraph = false;

    // High speed pursuit directly towards player
    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    const chaseSpeed = cfg.phase2Speed || 7.8;
    this.vx += (dx / dist) * 0.42;
    this.vy += (dy / dist) * 0.42;

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

    // Melee Chomp bite check
    if (dist <= (cfg.chompReach || 70) && this.p2ChompCooldown <= 0) {
      this.p2ChompCooldown = cfg.chompCooldown || 24;
      this._applyRamHit(opponent, cfg.chompDamage || 36, 8.0);
    }
    if (this.p2ChompCooldown > 0) this.p2ChompCooldown--;

    // Decrement special move cooldowns
    this.p2ChainDashCooldown--;
    if (this.p2ChainDashCooldown <= 0) {
      this.p2ChainDashCooldown = cfg.chainDashCooldown || 480;
      this.ramsRemaining = cfg.chainDashMaxCount || 5;
      this.aiState = EOC_STATE.WINDUP_RAM;
      this.stateTimer = 12; // fast telegraph in Phase 2
      return;
    }

    this.p2RoarCooldown--;
    if (this.p2RoarCooldown <= 0) {
      this.p2RoarCooldown = cfg.roarCooldown || 840;
      this.aiState = EOC_STATE.P2_ROAR;
      this.stateTimer = cfg.roarWindupFrames || 15;
    }
  }

  _updateP2ChainDashState(opponent, ownerIndex, cfg) {
    this._updateRamDashState(opponent, ownerIndex, cfg);
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
    if (this.isCaughtInBeam() || this.isDraggedByGetsuga || this.isWallPinnedByMakima || this.isWallPinnedBySaitama || this.isWallPinnedByEscanor || this.isCurrentlyWallPinnedByEscanor) {
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
