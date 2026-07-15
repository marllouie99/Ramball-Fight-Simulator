import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { spawnFloatingText } from '../../core/state.js';
import { drawGreenBottleGun, drawGreenBoilingEffect } from '../../graphics/weaponVisuals.js';

/**
 * Grenadier Fighter (Green)
 * Throws a grenade when the enemy enters its radius.
 * Grenade deals AOE damage and poisons the enemy.
 */
export class GrenadierFighter extends Fighter {
  constructor(def) {
    super(def);
    this.attackRadius = CONFIG.grenadier.attackRadius;
    this.attackCooldown = 0;
    this.wasEnemyInRadius = false;
  }

  reset() {
    super.reset();
    this.attackCooldown = 0;
    this.wasEnemyInRadius = false;
    this.throwAnimationTimer = 0;
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    if (this.throwAnimationTimer > 0) {
      this.throwAnimationTimer--;
    }

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }
    this.applyMovementPhysics();

    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);

    if (!opponent) return;

    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }

    const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    const inRadius = dist <= this.attackRadius;

    if (inRadius && this.attackCooldown === 0) {
      this.shootGrenade(ownerIndex, opponent);
      this.attackCooldown = CONFIG.grenadier.throwCooldown;
    }

    this.wasEnemyInRadius = inRadius;
  }

  resolveWallBounce(arena, opponent) {
    if (!opponent) {
      super.resolveWallBounce(arena);
      return;
    }

    let bounced = false;
    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      bounced = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      bounced = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      bounced = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      bounced = true;
    }

    if (bounced) {
      this.playWallBounceSound();
      const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;
      const hx = opponent.x - this.x;
      const hy = opponent.y - this.y;
      const hDist = Math.hypot(hx, hy) || 1;
      this.vx = (hx / hDist) * currentSpeed;
      this.vy = (hy / hDist) * currentSpeed;
    }
  }

  shootGrenade(ownerIndex, opponent) {
    this.throwAnimationTimer = 15; // 15 frames for throw animation
    if (projectileSystem) {
      try {
        projectileSystem.fireGrenade(this, ownerIndex, this.damage, opponent);
      } catch (e) {
        console.error('Grenade fire error:', e);
      }
    }
  }

  onDamageDealt(target, projectile, ownerIndex) {
    spawnFloatingText(target.x, target.y - target.r - 5, 'BOOM!', '#4dff4d');
  }

  aim(opponent) {
    if (opponent) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }
  }

  drawOutline(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#4dff4d';
    ctx.stroke();

    // Draw attack radius
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.attackRadius, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(77, 255, 77, 0.2)';
    ctx.stroke();
  }

  drawGun(ctx) {
    const throwProgress = this.throwAnimationTimer > 0
      ? Math.sin((this.throwAnimationTimer / 15) * Math.PI)
      : 0;
    drawGreenBottleGun(ctx, this.x, this.y, this.gunAngle, this.r, throwProgress);
  }

  drawBoilingEffect(ctx) {
    const shouldBoil = this.wasEnemyInRadius || this.attackCooldown === 0;
    drawGreenBoilingEffect(ctx, this.x, this.y, this.gunAngle, this.r, shouldBoil);
  }

  draw(ctx) {
    super.draw(ctx);
    this.drawBoilingEffect(ctx);
  }
}
