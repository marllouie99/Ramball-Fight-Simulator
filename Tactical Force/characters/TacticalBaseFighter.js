// ─────────────────────────────────────────────
// TACTICAL FORCE — BASE TACTICAL FIGHTER CLASS
// Dedicated base class encapsulating continuous body spin,
// obstacle navigation, tangential rebounding, and LOS checks.
// ─────────────────────────────────────────────
import { Fighter } from '../../js/entities/fighter.js';
import { CONFIG } from '../../js/core/config.js';
import { state, spawnFloatingText } from '../../js/core/state.js';
import { spawnMeleeClashShockwave } from '../../js/graphics/particles/sparkEffect.js';
import { STARTER_MAP, handleObstacleCollision, hasLineOfSight } from '../maps/index.js';

export class TacticalBaseFighter extends Fighter {
  constructor(def) {
    super(def);
    this.isTacticalFighter = true;
    this.gameCategory = 'tactical';
    this.isSpinning = true;
    this.spinDirection = (def.spinDirection !== undefined) ? def.spinDirection : 1;
    this.spinDebounce = 0;
    this.bodySpinRate = (CONFIG.tactical?.bodySpinRate !== undefined) ? CONFIG.tactical.bodySpinRate : (def.bodySpinRate ?? 0.08);
    this.isReloading = false;
    this.reloadTimer = 0;
    this.hasClearLOS = true;
  }

  onCountdown(opponent) {
    const tacticalSpinRate = (CONFIG.tactical?.bodySpinRate !== undefined) ? CONFIG.tactical.bodySpinRate : (this._def?.bodySpinRate ?? this.bodySpinRate ?? 0.08);
    const spinDir = (this.spinDirection !== undefined) ? this.spinDirection : 1;
    this.angle += tacticalSpinRate * spinDir;
    while (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
    while (this.angle < 0) this.angle += Math.PI * 2;
    this.gunAngle = this.angle;
  }

  /**
   * Reverses rotational body spin direction (Disabled for constant continuous 360 spin).
   */
  reverseSpin(debounceFrames = 8) {
    // Continuous 360 spin maintains constant rotational spin without flipping on collisions
    return;
  }

  /**
   * Disables physical knockback/pushback displacement while rendering the kinetic shockwave ring visual.
   */
  applyKnockback(vx, vy) {
    const force = Math.hypot(vx || 0, vy || 0);
    if (force > 0.3 && typeof spawnMeleeClashShockwave === 'function') {
      const swRadius = Math.min(65, Math.max(32, (this.r || 25) * 1.4 + force * 2.5));
      spawnMeleeClashShockwave(this.x, this.y, swRadius, this.color || 'gold');
    }
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.knockbackStunTimer = 0;
  }

  /**
   * Tactical Wall Rebounding:
   * Enforces non-zero tangential velocity and open-lane deflections to navigate around rectangular covers.
   */
  resolveWallBounce(arena) {
    if (!arena) return;
    const isBeamTrapped = (this.caughtInGenosBeamTimer > 0) || this.caughtInPureLoveBeam || ((this.pureLoveBeamTimer || 0) > 0) || this.preventKnockbackBounce;
    if (isBeamTrapped) {
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
    const baseSpeed = this.speed || 5.0;
    const minBounceSpd = baseSpeed * 0.75;
    const variance = (CONFIG.tactical?.rebounceDirectionalVariance !== undefined) ? CONFIG.tactical.rebounceDirectionalVariance : 0.85;
    const flipChance = (CONFIG.tactical?.rebounceTangentialFlipChance !== undefined) ? CONFIG.tactical.rebounceTangentialFlipChance : 0.45;
    const minTangentialSpd = baseSpeed * (CONFIG.tactical?.minWallTangentialSpeed ?? 0.65);

    if (this.x - this.r <= arena.x) {
      this.x = arena.x + this.r;
      this.vx = Math.max(Math.abs(this.vx), minBounceSpd);

      // Dynamic tangential / angular scattering
      if (Math.random() < flipChance && Math.abs(this.vy) > 0.1) {
        this.vy = -this.vy;
      }
      this.vy += (Math.random() - 0.5) * 2 * variance * baseSpeed;
      if (Math.abs(this.vy) < minTangentialSpd) {
        const dir = (Math.random() < 0.5) ? 1 : -1;
        this.vy = dir * (minTangentialSpd + Math.random() * baseSpeed * 0.35);
      }
      bounced = true;
    } else if (this.x + this.r >= arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      this.vx = -Math.max(Math.abs(this.vx), minBounceSpd);

      if (Math.random() < flipChance && Math.abs(this.vy) > 0.1) {
        this.vy = -this.vy;
      }
      this.vy += (Math.random() - 0.5) * 2 * variance * baseSpeed;
      if (Math.abs(this.vy) < minTangentialSpd) {
        const dir = (Math.random() < 0.5) ? 1 : -1;
        this.vy = dir * (minTangentialSpd + Math.random() * baseSpeed * 0.35);
      }
      bounced = true;
    }

    if (this.y - this.r <= arena.y) {
      this.y = arena.y + this.r;
      this.vy = Math.max(Math.abs(this.vy), minBounceSpd);

      if (Math.random() < flipChance && Math.abs(this.vx) > 0.1) {
        this.vx = -this.vx;
      }
      this.vx += (Math.random() - 0.5) * 2 * variance * baseSpeed;
      if (Math.abs(this.vx) < minTangentialSpd) {
        const dir = (Math.random() < 0.5) ? 1 : -1;
        this.vx = dir * (minTangentialSpd + Math.random() * baseSpeed * 0.35);
      }
      bounced = true;
    } else if (this.y + this.r >= arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      this.vy = -Math.max(Math.abs(this.vy), minBounceSpd);

      if (Math.random() < flipChance && Math.abs(this.vx) > 0.1) {
        this.vx = -this.vx;
      }
      this.vx += (Math.random() - 0.5) * 2 * variance * baseSpeed;
      if (Math.abs(this.vx) < minTangentialSpd) {
        const dir = (Math.random() < 0.5) ? 1 : -1;
        this.vx = dir * (minTangentialSpd + Math.random() * baseSpeed * 0.35);
      }
      bounced = true;
    }

    if (bounced) {
      this.normalizeSpeed();
    }
  }

  /**
   * Tactical Movement & Continuous Spin Physics:
   * Body continuously rotates at defined spin rate and evaluates cover obstacle collisions.
   */
  applyMovementPhysics() {
    if (this.spinDebounce > 0) {
      this.spinDebounce--;
    }

    let targetSpeed = this.speed || 5.0;
    let extraMultiplier = 1.0;

    if (this.speedMultiplier !== undefined && this.speedMultiplier !== 1) {
      targetSpeed *= this.speedMultiplier;
    }
    if (this.slowTimer > 0) {
      this.slowTimer--;
      targetSpeed *= this.slowMultiplier;
    }
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer--;
      targetSpeed *= (this.speedBoostMultiplier || 1.35);
    }

    const damp = this.damping !== undefined ? this.damping : 0.98;
    if (damp < 1.0) {
      const dampMult = Math.pow(damp, 1.0);
      this.vx *= dampMult;
      this.vy *= dampMult;
    }
    
    targetSpeed *= extraMultiplier;

    let currentSpeed = Math.hypot(this.vx, this.vy);
    
    // Low-velocity recovery toward arena center to prevent stalling
    if (targetSpeed > 0 && currentSpeed < 0.5) {
      if (typeof state !== 'undefined' && state.arena) {
        const centerX = state.arena.x + state.arena.width / 2;
        const centerY = state.arena.y + state.arena.height / 2;
        const centerAngle = Math.atan2(centerY - this.y, centerX - this.x);
        this.vx = Math.cos(centerAngle) * targetSpeed;
        this.vy = Math.sin(centerAngle) * targetSpeed;
        currentSpeed = targetSpeed;
      } else {
        const nudgeAngle = this.angle || this.gunAngle || 0;
        this.vx = Math.cos(nudgeAngle) * targetSpeed * 0.5;
        this.vy = Math.sin(nudgeAngle) * targetSpeed * 0.5;
        currentSpeed = targetSpeed * 0.5;
      }
    }
    
    if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
      const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.08;
      this.vx = (this.vx / currentSpeed) * newSpeed;
      this.vy = (this.vy / currentSpeed) * newSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Obstacle collision resolution
    const activeObstacles = (typeof state !== 'undefined' && state.activeMap && state.activeMap.obstacles) || (typeof STARTER_MAP !== 'undefined' ? STARTER_MAP.obstacles : null);
    if (activeObstacles && activeObstacles.length > 0) {
      handleObstacleCollision(this, activeObstacles);
    }

    // Continuous 360° rotational body spin (uninterrupted by hit-stun)
    this._prevAngle = this.angle;
    const tacticalSpinRate = (CONFIG.tactical?.bodySpinRate !== undefined) ? CONFIG.tactical.bodySpinRate : (this._def?.bodySpinRate ?? this.bodySpinRate ?? 0.08);
    const spinDir = (this.spinDirection !== undefined) ? this.spinDirection : 1;
    this.angle += tacticalSpinRate * spinDir;
    while (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
    while (this.angle < 0) this.angle += Math.PI * 2;
    this.gunAngle = this.angle;
  }

  /**
   * Tactical Aiming:
   * Gun angle is locked to the spinning body angle, with line-of-sight evaluated against obstacles.
   */
  aim(opponent) {
    this.gunAngle = this.angle;
    if (opponent && opponent.hp > 0 && !opponent.isDead) {
      this.hasClearLOS = hasLineOfSight(this.x, this.y, opponent.x, opponent.y);
    }
  }

  /**
   * Evaluates aim alignment between spinning gun barrel and opponent.
   */
  isAimAlignedWith(opponent, tolerance = 0.16) {
    if (!opponent || opponent.hp <= 0 || opponent.isDead) return false;
    const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    let angleDiff = targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    return Math.abs(angleDiff) <= tolerance;
  }

  /**
   * Evaluates whether the spinning gun barrel swept across the opponent's angular position
   * during this rotational step, ensuring frame-rate independent, seamless hit triggers.
   */
  checkSpinSweep(opponent, tolerance = 0.16) {
    if (!opponent || opponent.hp <= 0 || opponent.isDead) return false;
    const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);

    let angleDiff = targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    if (Math.abs(angleDiff) <= tolerance) {
      return true;
    }

    if (this._prevAngle !== undefined) {
      let pDiff = targetAngle - this._prevAngle;
      while (pDiff > Math.PI) pDiff -= Math.PI * 2;
      while (pDiff < -Math.PI) pDiff += Math.PI * 2;

      // Crossed the target vector between last frame and current frame
      if (Math.sign(pDiff) !== Math.sign(angleDiff) && Math.abs(pDiff - angleDiff) < 0.40) {
        return true;
      }
    }

    return false;
  }
}
