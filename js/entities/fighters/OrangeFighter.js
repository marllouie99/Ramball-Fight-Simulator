import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state } from '../../core/state.js';
import { playLoopingSound, fadeOutLoopingSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { drawOrangeFlamethrowerGun } from '../../graphics/weaponVisuals.js';
import { flamewardenFlameSystem } from '../../graphics/weapons/flamewardenWeaponGraphics.js';

/**
 * Orange Fighter
 * Automatically locks onto the opponent and draws a V-shaped aim indicator.
 */
export class OrangeFighter extends Fighter {
  constructor(def) {
    super(def);
    this.shootCooldownMax = CONFIG.orange.burstCooldown;
    this._flameSoundKey = null;
    this._isFlameSoundPlaying = false;
    // Fuel mechanic state
    this.fuel = CONFIG.orange.maxFuel;
  }

  reset() {
    super.reset();
    this.fuel = CONFIG.orange.maxFuel;
    this._flameSoundKey = null;
    this._isFlameSoundPlaying = false;
  }

  aim(opponent) {
    if (!opponent) return;
    this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
  }

  shoot(ownerIndex, opponent) {
    if (!projectileSystem) return;
    if (!opponent) return;

    const distance = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    const maxRange = CONFIG.orange.flameRange;

    if (distance > maxRange + this.r + opponent.r) {
      return; // Opponent too far to hit with flame
    }

    // Check if has enough fuel
    if (this.fuel < CONFIG.orange.fuelPerBurst) {
      return; // Cannot shoot if out of fuel
    }

    // Consume fuel
    this.fuel -= CONFIG.orange.fuelPerBurst;

    if (this.shootCooldown <= 0) {
      const flameCount = CONFIG.orange.flameCount;
      const flameSpread = CONFIG.orange.flameSpread;
      const flameSpeed = CONFIG.orange.flameSpeed;
      const flameLife = CONFIG.orange.flameLife;
      const flameRadius = CONFIG.orange.flameRadius;
      const flameDamage = CONFIG.orange.flameDamage;
      const step = flameCount > 1 ? (flameSpread * 2) / (flameCount - 1) : 0;
      const baseColor = 'rgba(255, 160, 0, 0.92)';

      for (let i = 0; i < flameCount; i++) {
        const angleOffset = -flameSpread + step * i;
        projectileSystem.fireFlameProjectile(
          this,
          ownerIndex,
          flameDamage,
          angleOffset,
          flameSpeed,
          flameRadius,
          flameLife,
          baseColor,
        );
      }
      this.shootCooldown = this.shootCooldownMax;
    }

    return true;
  }

  drawAimV(ctx) {
    const bodyTipDist = this.r + 2;
    const startX = this.x + Math.cos(this.gunAngle) * bodyTipDist;
    const startY = this.y + Math.sin(this.gunAngle) * bodyTipDist;
    const range = CONFIG.orange.flameRange;
    const angleOffset = CONFIG.orange.flameSpread;
    const end1X = startX + Math.cos(this.gunAngle + angleOffset) * range;
    const end1Y = startY + Math.sin(this.gunAngle + angleOffset) * range;
    const end2X = startX + Math.cos(this.gunAngle - angleOffset) * range;
    const end2Y = startY + Math.sin(this.gunAngle - angleOffset) * range;

    // Fan shape originating from the front of the body, serving as an aim indicator
    ctx.save();
    ctx.fillStyle = 'rgba(255, 170, 90, 0.18)';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(end1X, end1Y);
    ctx.arc(startX, startY, range, this.gunAngle - angleOffset, this.gunAngle + angleOffset);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255, 150, 0, 0.14)';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(end1X, end1Y);
    ctx.lineTo(end2X, end2Y);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(startX, startY, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 200, 100, 0.9)';
    ctx.fill();
    ctx.restore();
  }

  resolveWallBounce(arena, opponent = null) {
    // Find nearest active fuel pickup
    let nearestPickup = null;
    let nearestPickupDist = Infinity;

    if (state.fuelPickups && state.fuelPickups.length > 0) {
      for (const pickup of state.fuelPickups) {
        if (!pickup.active) continue;
        const dist = Math.hypot(pickup.x - this.x, pickup.y - this.y);
        if (dist < nearestPickupDist) {
          nearestPickupDist = dist;
          nearestPickup = pickup;
        }
      }
    }

    // Find nearest fighter (opponent) for "good fuel" re-bounce.
    // If opponent provided, prefer it, but still pick nearest for better targeting.
    let nearestFighter = null;
    let nearestFighterDist = Infinity;
    if (state.fighters && state.fighters.length > 0) {
      for (const f of state.fighters) {
        if (!f || f === this || f.hp <= 0) continue;
        const dist = Math.hypot(f.x - this.x, f.y - this.y);
        if (dist < nearestFighterDist) {
          nearestFighterDist = dist;
          nearestFighter = f;
        }
      }
    }
    if (!nearestFighter && opponent) nearestFighter = opponent;

    let bounced = false;
    const restitution = CONFIG.collision.restitution;

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
      const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;

      // Decide bounce target:
      // - when about to run out of fuel -> toward nearest fuel
      // - otherwise -> toward nearest fighter
      // Also: if the nearest fighter is DarkSlateGray and currently in stealth,
      // don't home toward them (prevents "stealth abuse" feedback loops).
      const fuelLowThreshold = CONFIG.orange.fuelPerBurst * 2; // "about to run out"
      const shouldGoToFuel = this.fuel <= fuelLowThreshold;

      const isStealthFighter = (f) => {
        if (!f || f._def?.type !== 'darkslategray') return false;
        return (f.invincibilityTimer > 0 || f.flashStepTimer > 0);
      };

      let safeNearestFighter = nearestFighter;
      if (isStealthFighter(safeNearestFighter)) {
        // find next nearest non-stealth fighter
        safeNearestFighter = null;
        let best = Infinity;
        if (state.fighters && state.fighters.length > 0) {
          for (const f of state.fighters) {
            if (!f || f === this || f.hp <= 0) continue;
            if (isStealthFighter(f)) continue;
            const dist = Math.hypot(f.x - this.x, f.y - this.y);
            if (dist < best) {
              best = dist;
              safeNearestFighter = f;
            }
          }
        }
      }

      const target = shouldGoToFuel
        ? (nearestPickup || safeNearestFighter)
        : (safeNearestFighter || nearestPickup);

      if (target) {
        const tx = target.x;
        const ty = target.y;
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        this.vx = (dx / dist) * currentSpeed * restitution;
        this.vy = (dy / dist) * currentSpeed * restitution;
      } else {
        // fallback random bounce
        const angleJitter = 3.5;
        if (this.x - this.r <= arena.x || this.x + this.r >= arena.x + arena.width) {
          this.vx = -Math.abs(this.vx) * restitution;
          this.vy += (Math.random() - 0.5) * angleJitter;
        }
        if (this.y - this.r <= arena.y || this.y + this.r >= arena.y + arena.height) {
          this.vy = -Math.abs(this.vy) * restitution;
          this.vx += (Math.random() - 0.5) * angleJitter;
        }
        this.normalizeSpeed();
      }
    }
  }

  update(opponent, ownerIndex, arena) {
    if (this._handleTimeStop()) {
      // Ensure flames are fully stopped while time-stopped
      if (this._isFlameSoundPlaying) {
        fadeOutLoopingSound(this._flameSoundKey, 300);
        this._isFlameSoundPlaying = false;
      }
      flamewardenFlameSystem.stopEmitting();
      return;
    }
    // Standard fighter updates (movement, poison, etc.)
    super.update(opponent, ownerIndex, arena);

    // Block shooting if inside a Cronos time-stop sphere
    const frozenBySphere = this.isInsideCronosSphere();

    // Override shooting behavior for continuous fire within range
    const isFiring = !frozenBySphere && this.shoot(ownerIndex, opponent);
    if (isFiring) {
      if (!this._flameSoundKey) {
        this._flameSoundKey = `orange-flame-${ownerIndex}`;
      }
      if (!this._isFlameSoundPlaying) {
        const sound = getBasicAttackSound(this._def?.id);
        playLoopingSound(this._flameSoundKey, sound.src, sound.volume);
        this._isFlameSoundPlaying = true;
      }

      // Update flame particle system - calculate nozzle position
      const nozzleDistance = this.r + 45; // Nozzle is at the tip of the gun
      const nozzleX = this.x + Math.cos(this.gunAngle) * nozzleDistance;
      const nozzleY = this.y + Math.sin(this.gunAngle) * nozzleDistance;
      flamewardenFlameSystem.startEmitting(nozzleX, nozzleY, this.gunAngle);
    } else {
      if (this._isFlameSoundPlaying) {
        fadeOutLoopingSound(this._flameSoundKey, 300);
        this._isFlameSoundPlaying = false;
      }
      flamewardenFlameSystem.stopEmitting();
    }

    // Replace base wall bounce behavior with orange's fuel-aware bounce.
    // (We re-run bounce here so it reacts immediately on edge contact.)
    this.resolveWallBounce(arena, opponent);
  }

  drawGun(ctx) {
    drawOrangeFlamethrowerGun(ctx, this.x, this.y, this.gunAngle, this.r, this.color);
  }

  drawFuelBar(ctx) {
    const fuelRatio = this.fuel / CONFIG.orange.maxFuel;

    // Curved meter settings
    const meterRadius = this.r + 18;
    const meterThickness = 8;
    const startAngle = Math.PI * 0.7;  // Start from left side
    const endAngle = Math.PI * 0.3;    // End at right side (curved upward)
    const totalAngle = startAngle - endAngle;
    const filledAngle = endAngle + (totalAngle * fuelRatio);

    ctx.save();
    ctx.translate(this.x, this.y);

    // Draw background arc (dark)
    ctx.beginPath();
    ctx.arc(0, 0, meterRadius, endAngle, startAngle);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = meterThickness;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Determine color based on fuel level
    let startColor, endColor;
    if (fuelRatio > 0.5) {
      startColor = '#ff9900';
      endColor = '#ff6600';
    } else if (fuelRatio > 0.25) {
      startColor = '#ff6600';
      endColor = '#ff4400';
    } else {
      startColor = '#ff4400';
      endColor = '#ff0000';
    }

    // Draw filled arc with gradient
    const gradient = ctx.createLinearGradient(
      Math.cos(startAngle) * meterRadius,
      Math.sin(startAngle) * meterRadius,
      Math.cos(endAngle) * meterRadius,
      Math.sin(endAngle) * meterRadius
    );
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);

    ctx.beginPath();
    ctx.arc(0, 0, meterRadius, filledAngle, startAngle);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = meterThickness;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw glow effect
    ctx.shadowColor = startColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, meterRadius, filledAngle, startAngle);
    ctx.strokeStyle = `rgba(255, 150, 0, ${0.3 + fuelRatio * 0.4})`;
    ctx.lineWidth = meterThickness + 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw fuel text in center
    ctx.fillStyle = '#ffffff00';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(this.fuel)}`, 0, 0);

    // Draw small "F" label below the meter
    ctx.fillStyle = 'rgba(255, 150, 0, 0.8)';
    ctx.font = 'bold 8px Arial';
    ctx.fillText('FUEL', 0, meterRadius + 12);

    ctx.restore();
  }

  draw(ctx) {
    super.draw(ctx);
    this.drawAimV(ctx);
    this.drawFuelBar(ctx);
  }
}
