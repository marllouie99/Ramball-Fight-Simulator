import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { spawnFloatingText } from '../../core/state.js';
import { playSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { drawBerserkerDualAxes } from '../../graphics/weaponVisuals.js';
import { spawnBerserkerRageEffect } from '../../graphics/particles/berserkerRageEffect.js';
import { state } from '../../core/state.js';

/**
 * Berserker Fighter (Blood Red)
 * Dual-wielding axes with rage mechanic.
 * Gains rage when taking damage. During rage: increased damage, attack speed, movement speed, and lifesteal.
 * Auto-locks toward enemy when bouncing off walls.
 */
export class BerserkerFighter extends Fighter {
  constructor(def) {
    super(def);
    this.rage = 0;
    this.rageTimer = 0;
    this.isInRage = false;
    this.axeCooldown = 0;
    this.axeSwingActive = false;
    this.axeSwingTimer = 0;
    this.axeSwingAngle = 0;
    this.axeSlashFadeTimer = 0;
    this.axeSwingDuration = CONFIG.berserker.axeSwingDurationFrames ?? 24;
    this.rageFadeTimer = 0;
    this.axeHistory = [];
  }

  reset() {
    super.reset();
    this.rage = 0;
    this.rageTimer = 0;
    this.isInRage = false;
    this.axeCooldown = 0;
    this.axeSwingActive = false;
    this.axeSwingTimer = 0;
    this.axeSwingAngle = 0;
    this.axeSlashFadeTimer = 0;
    this.axeSwingDuration = CONFIG.berserker.axeSwingDurationFrames ?? 24;
    this.rageFadeTimer = 0;
    this.axeHistory = [];
  }

  takeDamage(amount, attacker, opts = {}) {
    const applied = super.takeDamage(amount, attacker, opts);

    // Rage meter grows based on *attacker damage value* (not number of hits).
    // `amount` already represents the damage applied by the attacker.
    if (applied && amount > 0) {
      const rageGain = amount * (CONFIG.berserker.rageFromDamageScale ?? 0);
      this.rage = Math.min(CONFIG.berserker.maxRage, this.rage + rageGain);

      // Enter rage state if meter is full
      if (this.rage >= CONFIG.berserker.maxRage && !this.isInRage) {
        this.activateRage();
      }
    }

    return applied;
  }

  activateRage() {
    this.isInRage = true;
    this.rageTimer = CONFIG.berserker.rageDuration;
    this.rage = 0;
    // Apply rage bonuses
    this.speed = this.baseSpeed * CONFIG.berserker.rageMoveSpeedMultiplier;
    spawnFloatingText(this.x, this.y - this.r - 15, 'RAGE!', '#ff0000');

    // Spawn visual effect
    spawnBerserkerRageEffect(this);

    const rageSound = getSkillSound(this._def?.id, 'rage');
    if (rageSound) {
      playSound(rageSound.src, rageSound.volume);
    }
  }

  deactivateRage() {
    this.isInRage = false;
    this.rageTimer = 0;
    this.speed = this.baseSpeed;
    this.rageFadeTimer = 45; // 45 frames of smooth fade out
  }

  onDamageDealt(target, projectile, ownerIndex) {
    // Lifesteal during rage
    if (this.isInRage) {
      const healAmount = this.damage * CONFIG.berserker.lifestealPercent;
      this.hp = Math.min(this.maxHp, this.hp + healAmount);
      spawnFloatingText(this.x, this.y - this.r - 10, `+${Math.round(healAmount)}`, '#00ff00');
    }
  }

  _tryAxeSwing(opponent, ownerIndex) {
    if (!opponent || this.axeCooldown > 0) return;
    const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    if (dist > this.r + opponent.r + CONFIG.berserker.axeRange) return;

    // Calculate damage
    let damage = CONFIG.berserker.axeDamage;
    if (this.isInRage) {
      damage *= CONFIG.berserker.rageDamageMultiplier;
    }

    // Hit!
    this.axeSwingAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.axeSwingActive = true;
    this.axeSwingDuration = CONFIG.berserker.axeSwingDurationFrames ?? 24;
    this.axeSwingTimer = this.axeSwingDuration; // frames for swing animation
    // Immediately mirror swing angle into gunAngle so visuals rotate consistently
    this.gunAngle = this.axeSwingAngle;
    this.axeCooldown = this.isInRage
      ? CONFIG.berserker.axeCooldown / CONFIG.berserker.rageAttackSpeedMultiplier
      : CONFIG.berserker.axeCooldown;

    opponent.takeDamage(damage, this, { isMelee: true });
    spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, 'SLASH!', '#8b0000');

    // Play attack sound    
    const sound = getBasicAttackSound(this._def?.id);
    this._attackSoundTimer = sound.delay;
    this._attackSoundConfig = sound;

    // Trigger onDamageDealt for lifesteal
    this.onDamageDealt(opponent, null, ownerIndex);
  }

  // Override resolveWallBounce to auto-lock toward enemy
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

      // Default snap point is opponent center.
      // During rage, snap toward a point *away* from opponent to tighten the fight
      // and effectively reduce the rebounce "away distance".
      let targetX = opponent.x;
      let targetY = opponent.y;

      if (this.isInRage) {
        const dx = this.x - opponent.x; // vector from opponent -> berserker (away direction)
        const dy = this.y - opponent.y;
        const dist = Math.hypot(dx, dy) || 1;

        const awayDist = CONFIG.berserker.rageRebounceAwayDistance ?? 0;
        // Move the target point further away from opponent along the same line.
        // Smaller awayDist => closer target => tighter re-engage.
        targetX = opponent.x - (dx / dist) * awayDist;
        targetY = opponent.y - (dy / dist) * awayDist;
      }

      const hx = targetX - this.x;
      const hy = targetY - this.y;
      const hDist = Math.hypot(hx, hy) || 1;

      this.vx = (hx / hDist) * currentSpeed;
      this.vy = (hy / hDist) * currentSpeed;
    }
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

    // Handle rage timer
    if (this.isInRage) {
      this.rageTimer--;
      if (this.rageTimer <= 0) {
        this.deactivateRage();
      }
    } else if (this.rageFadeTimer > 0) {
      this.rageFadeTimer--;
    }

    // OPTIMIZATION: Quality-based motion trail recording
    const qualityLevel = state.qualityLevel || 1.0;
    const fps = state.fps || 60;
    const useAggressiveMode = fps < 40 || qualityLevel < 0.5;

    // Record history for the motion trail
    if ((this.isInRage || this.rageFadeTimer > 0) && !useAggressiveMode) {
      this.axeHistory.push({ x: this.x, y: this.y, gunAngle: this.gunAngle });
      if (this.axeHistory.length > 6) {
        this.axeHistory.shift();
      }
    } else {
      if (this.axeHistory.length > 0) this.axeHistory = [];
    }

    // Handle axe cooldown
    if (this.axeCooldown > 0) {
      this.axeCooldown--;
    }

    // Handle axe swing animation
    if (this.axeSwingActive) {
      this.axeSwingTimer--;
      if (this.axeSwingTimer <= 0) {
        this.axeSwingActive = false;
        this.axeSlashFadeTimer = 15;
      }
    } else if (this.axeSlashFadeTimer > 0) {
      this.axeSlashFadeTimer--;
    }

    // Try axe swing if in range
    if (opponent) {
      this._tryAxeSwing(opponent, ownerIndex);
    }

    // Determine intended target speed
    let targetSpeed = this.speed;
    if (this.slowTimer > 0) {
      this.slowTimer--;
      targetSpeed *= this.slowMultiplier;
    }

    // Velocity Recovery (gradually return to target speed after knockback or slow)
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
      const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.04;
      this.vx = (this.vx / currentSpeed) * newSpeed;
      this.vy = (this.vy / currentSpeed) * newSpeed;
    }

    // Movement
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    // Aiming & Bouncing
    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);
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
    ctx.strokeStyle = this.isInRage ? '#ff0000' : '#8b0000';
    ctx.stroke();

    // Rage glow effect (extra outer ring when enraged)
    if (this.isInRage) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 5, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.stroke();
    }

    // Axe attack range ring — subtle solid ring (matching Grenadier/melee style)
    const axeRange = CONFIG.berserker.axeRange ?? 35;
    const attackRadius = this.r + axeRange;
    ctx.beginPath();
    ctx.arc(this.x, this.y, attackRadius, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.isInRage
      ? 'rgba(255, 70, 70, 0.35)'
      : 'rgba(180, 60, 60, 0.18)';
    ctx.stroke();
  }

  drawGun(ctx) {
    drawBerserkerDualAxes(ctx, this.x, this.y, this.gunAngle, this.r, this.isInRage, this.axeSwingActive, this.axeSwingTimer, this.axeSwingAngle, this.axeSwingDuration, this.axeSlashFadeTimer, this.rageFadeTimer, this.axeHistory);
  }

  drawRageBar(ctx) {
    const rageRatio = this.rage / CONFIG.berserker.maxRage;

    const barWidth = 50;
    const barHeight = 6;
    const barX = this.x - barWidth / 2;
    const barY = this.y + this.r + 15;

    ctx.save();

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Fill
    const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    gradient.addColorStop(0, '#8b0000');
    gradient.addColorStop(1, '#ff0000');
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, barWidth * rageRatio, barHeight);

    // Border
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.restore();
  }

  draw(ctx) {
    super.draw(ctx);
    this.drawRageBar(ctx);
  }
}
