import { fadeOutLoopingSound, playLoopingSound } from '../../systems/soundSystem.js';
import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { drawOrangeFlamethrowerGun } from '../../graphics/weaponVisuals.js';
import { flamewardenFlameSystem } from '../../graphics/weapons/flamewardenWeaponGraphics.js';
import { drawEmberSkin } from '../../graphics/fighters/flamewardenSkin.js';

/**
 * Orange Fighter (Ember)
 * Automatically locks onto the opponent and draws a V-shaped aim indicator.
 * Features a Flamethrower Heat & Overheat Cooldown mechanic.
 */
export class OrangeFighter extends Fighter {
  constructor(def) {
    super(def);
    this.shootCooldownMax = CONFIG.orange.burstCooldown;
    this._flameSoundKey = null;
    this._isFlameSoundPlaying = false;

    // Flamethrower Heat & Overheat mechanic
    this.heat = 0;
    this.maxHeat = CONFIG.orange.maxHeat || 100;
    this.isOverheated = false;
    this.heatPerBurst = CONFIG.orange.heatPerBurst || 2.0;
    this.coolRatePerFrame = CONFIG.orange.coolRatePerFrame || 0.40;
    this.overheatCoolRate = CONFIG.orange.overheatCoolRate || 0.55;
    this.hideHands = true; // Weapon renders custom themed volcanic pixel hands
  }

  // Backward compatibility fuel getter/setter
  get fuel() {
    return Math.max(0, (1 - this.heat / this.maxHeat) * (CONFIG.orange.maxFuel || 100));
  }

  set fuel(val) {
    const maxF = CONFIG.orange.maxFuel || 100;
    const ratio = Math.max(0, Math.min(1.0, val / maxF));
    this.heat = (1 - ratio) * this.maxHeat;
  }

  reset() {
    super.reset();
    this.heat = 0;
    this.isOverheated = false;
    this._flameSoundKey = null;
    this._isFlameSoundPlaying = false;
  }

  shoot(ownerIndex, opponent) {
    if (!projectileSystem || this.isCaughtInBeam() || !opponent) return false;
    if (this.isOverheated) return false; // Cannot fire while weapon is overheated

    const distance = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    const maxRange = CONFIG.orange.flameRange;

    if (distance > maxRange + this.r + opponent.r) {
      return false; // Opponent too far to hit with flame
    }

    // Accumulate heat per burst
    this.heat = Math.min(this.maxHeat, this.heat + this.heatPerBurst);
    if (this.heat >= this.maxHeat) {
      this.isOverheated = true;
      this.heat = this.maxHeat;
      spawnFloatingText(this.x, this.y - this.r - 12, 'OVERHEAT!', '#FF3300');
    }

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
    ctx.fillStyle = this.isOverheated ? 'rgba(255, 60, 0, 0.08)' : 'rgba(255, 170, 90, 0.18)';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(end1X, end1Y);
    ctx.arc(startX, startY, range, this.gunAngle - angleOffset, this.gunAngle + angleOffset);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = this.isOverheated ? 'rgba(255, 40, 0, 0.06)' : 'rgba(255, 150, 0, 0.14)';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(end1X, end1Y);
    ctx.lineTo(end2X, end2Y);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(startX, startY, 4, 0, Math.PI * 2);
    ctx.fillStyle = this.isOverheated ? 'rgba(255, 50, 50, 0.8)' : 'rgba(255, 200, 100, 0.9)';
    ctx.fill();
    ctx.restore();
  }

  resolveWallBounce(arena, opponent = null) {
    if (this.isCaughtInBeam() || this.isDraggedByGetsuga || this.isWallPinnedByMakima || this.isWallPinnedBySaitama || this.isWallPinnedByEscanor || this.isCurrentlyWallPinnedByEscanor) {
      return super.resolveWallBounce(arena, opponent);
    }

    // Find nearest valid opponent target
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

      const isStealthFighter = (f) => {
        if (!f || f._def?.type !== 'darkslategray') return false;
        return (f.invincibilityTimer > 0 || f.flashStepTimer > 0);
      };

      let safeTarget = nearestFighter;
      if (isStealthFighter(safeTarget)) {
        safeTarget = null;
        let best = Infinity;
        if (state.fighters && state.fighters.length > 0) {
          for (const f of state.fighters) {
            if (!f || f === this || f.hp <= 0) continue;
            if (isStealthFighter(f)) continue;
            const dist = Math.hypot(f.x - this.x, f.y - this.y);
            if (dist < best) {
              best = dist;
              safeTarget = f;
            }
          }
        }
      }

      if (safeTarget) {
        const tx = safeTarget.x;
        const ty = safeTarget.y;
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        this.vx = (dx / dist) * currentSpeed * restitution;
        this.vy = (dy / dist) * currentSpeed * restitution;
      } else {
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
      if (this._isFlameSoundPlaying) {
        fadeOutLoopingSound(this._flameSoundKey, 300);
        this._isFlameSoundPlaying = false;
      }
      flamewardenFlameSystem.stopEmitting();
      return;
    }

    super.update(opponent, ownerIndex, arena);

    // Overheat recovery vs passive cooling
    if (this.isOverheated) {
      this.heat = Math.max(0, this.heat - this.overheatCoolRate);
      if (this.heat <= 0) {
        this.isOverheated = false;
        this.heat = 0;
        spawnFloatingText(this.x, this.y - this.r - 10, 'READY', '#00FF66');
      }
    }

    const frozenBySphere = this.isInsideCronosSphere();
    const canAttemptShot = !frozenBySphere && !this.isCaughtInBeam() && !this.isOverheated;
    const isFiring = canAttemptShot && this.shoot(ownerIndex, opponent);

    if (!isFiring && !this.isOverheated) {
      // Passive cooling when not actively shooting
      this.heat = Math.max(0, this.heat - this.coolRatePerFrame);
    }

    if (isFiring) {
      if (!this._flameSoundKey) {
        this._flameSoundKey = `orange-flame-${ownerIndex}`;
      }
      if (!this._isFlameSoundPlaying) {
        const sound = getBasicAttackSound(this._def?.id, this._def?.type);
        playLoopingSound(this._flameSoundKey, sound.src, sound.volume);
        this._isFlameSoundPlaying = true;
      }

      // Update flame particle system - calculate nozzle position
      const nozzleDistance = this.r + 45;
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

    this.resolveWallBounce(arena, opponent);
  }

  drawSkin(ctx) {
    drawEmberSkin(ctx, this);
  }

  drawBody(ctx) {
    drawEmberSkin(ctx, this);
  }

  drawGun(ctx) {
    drawOrangeFlamethrowerGun(ctx, this.x, this.y, this.gunAngle, this.r);
  }

  drawHeatBar(ctx) {
    const heatRatio = Math.max(0, Math.min(1.0, this.heat / this.maxHeat));

    // Curved meter settings
    const meterRadius = this.r + 18;
    const meterThickness = 8;
    const startAngle = Math.PI * 0.7;  // Start from left side
    const endAngle = Math.PI * 0.3;    // End at right side (curved upward)
    const totalAngle = startAngle - endAngle;
    const filledAngle = endAngle + (totalAngle * (1 - heatRatio));

    ctx.save();
    ctx.translate(this.x, this.y);

    // Draw background arc (dark obsidian)
    ctx.beginPath();
    ctx.arc(0, 0, meterRadius, endAngle, startAngle);
    ctx.strokeStyle = 'rgba(10, 10, 15, 0.75)';
    ctx.lineWidth = meterThickness;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Determine color gradient based on heat status
    let startColor, endColor;
    if (this.isOverheated) {
      const flash = (Math.sin(Date.now() / 100) > 0);
      startColor = flash ? '#FF0000' : '#FF6600';
      endColor = flash ? '#FFFFFF' : '#FF0000';
    } else if (heatRatio > 0.75) {
      startColor = '#FF4400';
      endColor = '#FF0000';
    } else if (heatRatio > 0.40) {
      startColor = '#FF9900';
      endColor = '#FF5500';
    } else {
      startColor = '#FFD700';
      endColor = '#FF8C00';
    }

    if (heatRatio > 0.02) {
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

      // Outer glow simulation (Rule 11 compliant: layered concentric strokes, zero shadowBlur)
      ctx.beginPath();
      ctx.arc(0, 0, meterRadius, filledAngle, startAngle);
      ctx.strokeStyle = this.isOverheated
        ? `rgba(255, 50, 0, ${(0.3 + 0.2 * Math.sin(Date.now() / 80)).toFixed(2)})`
        : `rgba(255, 140, 0, ${(0.15 + heatRatio * 0.25).toFixed(2)})`;
      ctx.lineWidth = meterThickness + 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, meterRadius, filledAngle, startAngle);
      ctx.strokeStyle = this.isOverheated
        ? 'rgba(255, 200, 200, 0.4)'
        : `rgba(255, 200, 50, ${(0.20 + heatRatio * 0.25).toFixed(2)})`;
      ctx.lineWidth = meterThickness + 1.5;
      ctx.stroke();
    }

    // Status label below the meter
    ctx.font = 'bold 9px "Silkscreen", Arial, sans-serif';
    ctx.textAlign = 'center';
    if (this.isOverheated) {
      const blink = (Math.sin(Date.now() / 120) > 0);
      ctx.fillStyle = blink ? '#FF3300' : '#FFAA00';
      ctx.fillText('OVERHEAT', 0, meterRadius + 14);
    } else if (heatRatio > 0.05) {
      ctx.fillStyle = heatRatio > 0.75 ? '#FF5500' : '#FFAA00';
      ctx.fillText(`HEAT ${Math.round(heatRatio * 100)}%`, 0, meterRadius + 14);
    }

    ctx.restore();
  }

  drawFuelBar(ctx) {
    this.drawHeatBar(ctx);
  }

  draw(ctx) {
    super.draw(ctx);
    this.drawAimV(ctx);
    this.drawHeatBar(ctx);
  }
}

