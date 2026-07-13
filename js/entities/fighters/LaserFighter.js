import { Fighter } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST } from '../../core/config.js';
import { state, spawnFloatingText } from '../../core/state.js';
import { playSound, playLoopingSound, fadeOutLoopingSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { drawWhiteRailgun, drawWhiteChargeEffect } from '../../graphics/weaponVisuals.js';

/**
 * Laser Fighter (White)
 * Fires a continuous laser beam for 3 seconds when aligned with the enemy.
 * Stops moving while the beam is firing.
 * Deals initial high damage, then continuous damage over time.
 */
export class LaserFighter extends Fighter {
  constructor(def) {
    super(def);
    this.lastAimAligned = false;
    this.beamTimer = 0;
    this.beamDuration = CONFIG.laser.beamDuration;
    this.beamSlowDuration = CONFIG.laser.slowDuration;
    this.beamSlowMultiplier = CONFIG.laser.slowMultiplier;
    this.beamHitState = new Map();
    this._laserSoundKey = null;
    this._isLaserSoundPlaying = false;
  }

  reset() {
    super.reset();
    this.lastAimAligned = false;
    this.beamTimer = 0;
    this.beamHitState = new Map();
    this.beamCharge = 0;
    this._laserSoundKey = null;
    this._isLaserSoundPlaying = false;
  }

  normalizeAngle(angle) {
    while (angle <= -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  }

  aim(opponent) {
    if (opponent) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }
  }

  getBeamLine() {
    const tipDist = GUN_TIP_DIST(this.r);
    const startX = this.x + Math.cos(this.gunAngle) * tipDist;
    const startY = this.y + Math.sin(this.gunAngle) * tipDist;
    const beamLength = CONFIG.laser.beamLength;
    const endX = startX + Math.cos(this.gunAngle) * beamLength;
    const endY = startY + Math.sin(this.gunAngle) * beamLength;

    return { startX, startY, endX, endY };
  }

  getBeamHitFighters(fighters) {
    if (!fighters || fighters.length === 0) return [];

    const { startX, startY, endX, endY } = this.getBeamLine();
    const dx = endX - startX;
    const dy = endY - startY;
    const l2 = dx * dx + dy * dy;

    if (l2 === 0) return [];

    const hitFighters = [];

    for (let fi = 0; fi < fighters.length; fi++) {
      const fighter = fighters[fi];
      if (!fighter || fighter === this || fighter.hp <= 0) continue;

      let t = ((fighter.x - startX) * dx + (fighter.y - startY) * dy) / l2;
      t = Math.max(0, Math.min(1, t));

      const projX = startX + t * dx;
      const projY = startY + t * dy;
      const distToCenter = Math.hypot(fighter.x - projX, fighter.y - projY);

      if (distToCenter <= fighter.r + 4) {
        hitFighters.push(fighter);
      }
    }

    return hitFighters;
  }

  applyBeamEffectsToTarget(target, ownerIndex) {
    if (!target || target === this) return;

    let hitState = this.beamHitState.get(target);
    if (!hitState) {
      hitState = { initialHitDone: false, continuousDamageTimer: 0 };
      this.beamHitState.set(target, hitState);
    }

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (!hitState.initialHitDone) {
      // Initial hit: apply damage + slow (and optionally a tiny start push)
      const applied = target.takeDamage(this.damage, this, { isProjectile: true, isLaser: true });
      if (applied) {
        // Slow (chance)
        const slowChance = Number(CONFIG.laser.slowChance || 1);
        const shouldSlow = slowChance >= 1 ? true : (Math.random() <= slowChance);
        if (shouldSlow) {
          target.applySlow(this.beamSlowDuration, this.beamSlowMultiplier);
          spawnFloatingText(target.x, target.y - target.r - 5, 'SLOWED!', '#88ccff');
        }

        // Optional start push using existing config magnitude.
        const startPush = Number(CONFIG.laser.initialKnockback) || 0;
        if (startPush !== 0) {
          target.vx += (dx / dist) * startPush;
          target.vy += (dy / dist) * startPush;
        }

        hitState.initialHitDone = true;
        spawnFloatingText(target.x, target.y - target.r - 5, 'BEAM HIT!', '#ccffff');

        if (typeof this.onDamageDealt === 'function') {
          this.onDamageDealt(target, { damage: this.damage, isLaser: true }, ownerIndex);
        }
      }
      return;
    }

    // Continuous contact: tick damage and apply continuous push every tick interval.
    hitState.continuousDamageTimer++;
    if (hitState.continuousDamageTimer >= CONFIG.laser.tickInterval) {
      const applied = target.takeDamage(CONFIG.laser.tickDamage, this, { isProjectile: true, isLaser: true });
      if (applied) {
        // Continuous push direction (from beam owner -> target)
        const pushStrength = Number(CONFIG.laser.initialKnockback) || 0;
        if (pushStrength !== 0) {
          target.vx += (dx / dist) * pushStrength;
          target.vy += (dy / dist) * pushStrength;
        }

        spawnFloatingText(target.x, target.y - target.r - 5, 'ZZZAP!', '#ffff88');
        if (typeof this.onDamageDealt === 'function') {
          this.onDamageDealt(target, { damage: CONFIG.laser.tickDamage, isLaser: true }, ownerIndex);
        }
      }
      hitState.continuousDamageTimer = 0;
    }
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    }

    if (this.beamTimer > 0) {
      this.beamTimer--;

      // Slowly rotate toward the target while firing the beam
      if (opponent) {
        const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        const delta = this.normalizeAngle(targetAngle - this.gunAngle);
        const maxRotate = CONFIG.laser.beamRotateSpeed || 0.015;
        if (Math.abs(delta) > maxRotate) {
          this.gunAngle += Math.sign(delta) * maxRotate;
        } else {
          this.gunAngle = targetAngle;
        }
      }

      const hitFighters = this.getBeamHitFighters(state.fighters);
      for (const fighter of hitFighters) {
        this.applyBeamEffectsToTarget(fighter, ownerIndex);
      }

      // drift slowly backward while firing the beam using a gentle velocity effect.
      const backwardSpeed = Number(CONFIG.laser.beamBackwardSpeed) || 0;
      const beamRecoilX = -Math.cos(this.gunAngle) * backwardSpeed;
      const beamRecoilY = -Math.sin(this.gunAngle) * backwardSpeed;
      const retention = Number(CONFIG.laser.beamDriftRetention) || 0.92;
      const blend = Number(CONFIG.laser.beamDriftBlend) || 0.08;

      // FIX: White should not apply the *target slow* logic to himself.
      // During beam fire we only apply beam recoil/retention.
      const beamVx = this.vx * retention + beamRecoilX * blend;
      const beamVy = this.vy * retention + beamRecoilY * blend;
      this.vx = beamVx;
      this.vy = beamVy;

      this.x += this.vx;
      this.y += this.vy;
      this.resolveWallBounce(arena);
      return;
    }

    // Resume movement after the beam ends if White has no current velocity.
    if (this.vx === 0 && this.vy === 0) {
      const resumeAngle = this.gunAngle || this.angle || (Math.random() * Math.PI * 2);
      this.vx = Math.cos(resumeAngle) * this.speed;
      this.vy = Math.sin(resumeAngle) * this.speed;
    }

    if (opponent) {
      this.aim(opponent);
      const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      const delta = this.normalizeAngle(targetAngle - this.gunAngle);
      const aligned = Math.abs(delta) < CONFIG.laser.aimThreshold;

      if (aligned && this.shootCooldown === 0) {
        if (this.beamCharge === 0) {
          const chargeSound = getSkillEffectSound('solarchampion', 'lasercharge');
          if (chargeSound) playSound(chargeSound.src, chargeSound.volume);
        }
        this.beamCharge = Math.min(this.beamCharge + 1, CONFIG.laser.windupDuration);
      } else {
        this.beamCharge = Math.max(this.beamCharge - 1, 0);
      }

      if (aligned && this.shootCooldown === 0 && this.beamCharge >= CONFIG.laser.windupDuration) {
        this.beamTimer = this.beamDuration;
        this.shootCooldown = this.shootCooldownMax;
        this.beamHitState.clear();
        this.beamCharge = 0;

        if (!this._laserSoundKey) {
          this._laserSoundKey = `ivory-laser-${ownerIndex}`;
        }
        if (!this._isLaserSoundPlaying) {
          const sound = getBasicAttackSound(this._def?.id, this._def?.type);
          playLoopingSound(this._laserSoundKey, sound.src, sound.volume);
          this._isLaserSoundPlaying = true;
        }

        // Small backward knockback when the beam starts, then slow drift backward.
        const kickback = CONFIG.laser.beamStartKnockback;
        this.vx += -Math.cos(this.gunAngle) * kickback;
        this.vy += -Math.sin(this.gunAngle) * kickback;
      }
      this.lastAimAligned = aligned;
    }

    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    this.aim(opponent);
    this.resolveWallBounce(arena);

    // Fade out the laser sound when the beam ends.
    if (this.beamTimer === 0 && this._isLaserSoundPlaying) {
      fadeOutLoopingSound(this._laserSoundKey, 300);
      this._isLaserSoundPlaying = false;
    }
  }

  draw(ctx) {
    if (this.beamCharge > 0 && this.beamTimer === 0) {
      this.drawChargeEffect(ctx);
    }

    if (this.beamTimer > 0) {
      ctx.save();
      const { startX, startY, endX, endY } = this.getBeamLine();
      const dx = endX - startX;
      const dy = endY - startY;
      const beamLen = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Use time for smooth pulsing rather than random jitter
      const time = performance.now() / 150;
      const pulse1 = Math.sin(time) * 1.5;
      const pulse2 = Math.cos(time * 1.3) * 2;
      const pulse3 = Math.sin(time * 0.8) * 3;

      // Outer wide glow (cyan)
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 12 + pulse3;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
      ctx.lineWidth = (CONFIG.laser.glowWidth || 12) + 6 + pulse3;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow for inner layers to keep it optimized

      // Mid bright glow
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = 'rgba(200, 255, 255, 0.5)';
      ctx.lineWidth = (CONFIG.laser.glowWidth || 12) - 2 + pulse2;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Inner core (white)
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = (CONFIG.laser.coreWidth || 4) + pulse1;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Energy nodes traveling down the beam for dynamic flow
      const numNodes = 4;
      const speed = 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ccffff';
      ctx.shadowBlur = 8;

      for (let i = 0; i < numNodes; i++) {
        // Calculate offset (0 to 1) that wraps around
        let offset = ((time * speed) + (i / numNodes)) % 1.0;
        let nx = startX + Math.cos(angle) * (beamLen * offset);
        let ny = startY + Math.sin(angle) * (beamLen * offset);

        // Node width pulses and is larger near the middle of the beam
        let nodeRadius = 1.5 + Math.sin(offset * Math.PI) * 3;

        ctx.beginPath();
        ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    super.draw(ctx);
  }

  drawChargeEffect(ctx) {
    drawWhiteChargeEffect(ctx, this.x, this.y, this.gunAngle, this.beamCharge, this.r);
  }

  drawGun(ctx) {
    drawWhiteRailgun(ctx, this.x, this.y, this.gunAngle, this.r);
  }

  onDamageDealt(target, projectile, ownerIndex) {
    // Optional: pushback effect when laser hits
    if (projectile && projectile.isLaser && !this.initialHitDone) {
      const knockbackStrength = 1.0;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      target.vx += (dx / dist) * knockbackStrength;
      target.vy += (dy / dist) * knockbackStrength;
    }
  }
}
