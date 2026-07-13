import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText } from '../../core/state.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { drawSpikeWeapon } from '../../graphics/weaponVisuals.js';
import { drawSpikeSkin } from '../../graphics/fighters/spikeSkin.js';

/**
 * Melee Fighter (Yellow)
 * Deals contact damage upon collision, and draws rotating spikes around its body.
 */
export class MeleeFighter extends Fighter {
  constructor(def) {
    super(def);
    this.speedBoostTimer = 0;
    this.trailHistory = [];
  }

  reset() {
    super.reset();
    this.meleeCooldown = 0;
    this.speedBoostTimer = 0;
    this.trailHistory = [];
  }


  /** Gold outline for yellow fighter. */
  drawOutline(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd700';
    ctx.stroke();
  }

  /** Draw outer spikes rotating around the body instead of a barrel. */
  drawGun(ctx) {
    drawSpikeWeapon(ctx, this.x, this.y, this.angle, this.r);
  }

  /** Contact damage hook. */
  onCollide(opponent) {
    if (this.meleeCooldown === 0) {
      // TUNING: contact damage and melee hit cooldown can be adjusted here.
      opponent.takeDamage(this.damage, this, { isMelee: true });
      spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, 'SMASH!', '#ffd700');
      // TUNING: melee attack cooldown in frames.
      this.meleeCooldown = this.shootCooldownMax;
      this.applySpeedBoost();
      const sound = getBasicAttackSound(this._def?.id);
      this._attackSoundTimer = sound.delay;
      this._attackSoundConfig = sound;
    }
  }

  applySpeedBoost() {
    this.speedBoostTimer = CONFIG.melee.speedBoostDuration;
    this.speed = this.baseSpeed * CONFIG.melee.speedBoostMultiplier;
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer--;
      if (this.speedBoostTimer === 0) {
        this.speed = this.baseSpeed;
      }
    }

    if (this.meleeCooldown > 0) {
      this.meleeCooldown--;
    }

    // Handle slow effect (from laser beam or other sources)
    let targetSpeed = this.speed;
    if (this.slowTimer > 0) {
      this.slowTimer--;
      targetSpeed *= this.slowMultiplier;
    }

    // Apply speed reduction
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
      const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.04;
      this.vx = (this.vx / currentSpeed) * newSpeed;
      this.vy = (this.vy / currentSpeed) * newSpeed;
    }

    this.trailHistory.push({ x: this.x, y: this.y, alpha: 0.5 });
    if (this.trailHistory.length > CONFIG.melee.trailLength) {
      this.trailHistory.shift();
    }

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * CONFIG.spin.rate;

    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);
  }

  resolveWallBounce(arena, opponent) {
    super.resolveWallBounce(arena);

    // Check if we hit a wall (super.resolveWallBounce clamps position to exact bounds)
    const epsilon = 0.01;
    const bounced = (Math.abs(this.x - this.r - arena.x) < epsilon) ||
      (Math.abs(this.x + this.r - (arena.x + arena.width)) < epsilon) ||
      (Math.abs(this.y - this.r - arena.y) < epsilon) ||
      (Math.abs(this.y + this.r - (arena.y + arena.height)) < epsilon);

    if (bounced) {
      const lockChance = CONFIG.melee.rebounceLockChance ?? 0;
      if (Math.random() < lockChance) {
        let target = opponent;

        // Find nearest valid target if opponent not provided or dead
        if (!target || target.hp <= 0) {
          let bestDist = Infinity;
          const myIndex = state.fighters.indexOf(this);
          const myTeam = state.getFighterTeam(myIndex);

          for (let i = 0; i < state.fighters.length; i++) {
            const f = state.fighters[i];
            if (!f || f === this || f.hp <= 0 || f.invincibilityTimer > 0) continue;

            // Skip teammates in 2v2
            if (state.mode === '2v2' && myTeam !== null && myTeam === state.getFighterTeam(i)) continue;

            const dist = Math.hypot(f.x - this.x, f.y - this.y);
            if (dist < bestDist) {
              bestDist = dist;
              target = f;
            }
          }
        }

        if (target) {
          const dx = target.x - this.x;
          const dy = target.y - this.y;
          const d = Math.hypot(dx, dy) || 1;
          const speed = Math.hypot(this.vx, this.vy) || this.speed;
          this.vx = (dx / d) * speed;
          this.vy = (dy / d) * speed;
          this.normalizeSpeed();
        }
      }
    }
  }

  drawBody(ctx) {
    drawSpikeSkin(ctx, this.x, this.y, this.r, this.angle, this.color);
    this.drawStatusOverlays(ctx, this.r);
  }

  draw(ctx) {
    if (this.speedBoostTimer > 0) {
      for (let i = 0; i < this.trailHistory.length; i++) {
        const trail = this.trailHistory[i];
        const opacity = (i + 1) / this.trailHistory.length * 0.4;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = 'gold';
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, this.r * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    super.draw(ctx);
  }
}
