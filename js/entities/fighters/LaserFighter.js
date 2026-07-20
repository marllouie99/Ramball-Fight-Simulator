import { Fighter } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST } from '../../core/config.js';
import { state, spawnFloatingText } from '../../core/state.js';
import { playSound, playLoopingSound, fadeOutLoopingSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { drawWhiteRailgun, drawWhiteChargeEffect } from '../../graphics/weaponVisuals.js';
import { spawnSparks, spawnLaserSmoke } from '../../graphics/particles/sparkEffect.js';

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
      const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      
      // Initialize gunAngle if undefined
      if (this.gunAngle === undefined) {
        this.gunAngle = targetAngle;
      }

      const delta = this.normalizeAngle(targetAngle - this.gunAngle);
      // Slowly rotate towards the target. 
      // We can use a slightly faster speed for aiming than for firing, 
      // or just use the config value. Let's use config value * 2 for aiming.
      const maxRotate = (CONFIG.laser.beamRotateSpeed || 0.015) * 2; 

      if (Math.abs(delta) > maxRotate) {
        this.gunAngle += Math.sign(delta) * maxRotate;
      } else {
        this.gunAngle = targetAngle;
      }
    }
  }

  getBeamLine() {
    // Solar Champion railgun muzzle tip: baseX(-5) + 160 * scale(0.35) = 51 from fighter edge
    const tipDist = this.r + 51;
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

  interruptAttacks() {
    super.interruptAttacks();
    this.beamTimer = 0;
    this.beamCharge = 0;
    this.skillActive = false;
    
    // Stop the laser sound immediately if it's playing
    if (this._isLaserSoundPlaying && this._laserSoundKey) {
      fadeOutLoopingSound(this._laserSoundKey, 100);
      this._isLaserSoundPlaying = false;
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

      // Continuous violent screen shake while firing
      if (!state.screenShake || state.screenShake.timer <= 1) {
        state.screenShake = { timer: 5, intensity: 6 };
      }

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

      // Check all valid targets, including fighters and illusions/clones
      const allTargets = state.fighters.concat(state.illusions || []);
      const hitFighters = this.getBeamHitFighters(allTargets);
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

      // Charge the beam as long as the cooldown is ready, regardless of alignment.
      // This prevents the charge from constantly resetting while trying to track a moving target.
      if (this.shootCooldown === 0) {
        if (this.beamCharge === 0) {
          const chargeSound = getSkillEffectSound('solarchampion', 'lasercharge');
          if (chargeSound) playSound(chargeSound.src, chargeSound.volume);
        }
        this.beamCharge = Math.min(this.beamCharge + 1, CONFIG.laser.windupDuration);
        
        // Tremor screen shake during charge
        const chargeRatio = this.beamCharge / CONFIG.laser.windupDuration;
        if (chargeRatio > 0.4 && (!state.screenShake || state.screenShake.intensity < chargeRatio * 4)) {
          state.screenShake = { timer: 2, intensity: chargeRatio * 4 };
        }
      } else {
        this.beamCharge = Math.max(this.beamCharge - 1, 0);
      }

      if (aligned && this.shootCooldown === 0 && this.beamCharge >= CONFIG.laser.windupDuration) {
        this.beamTimer = this.beamDuration;
        this.shootCooldown = this.shootCooldownMax;
        this.beamHitState.clear();
        this.beamCharge = 0;

        // Massive screen shake when beam fires
        state.screenShake = { timer: 20, intensity: 15 };

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
    
    // Emit smoke smoothly during the beam firing, getting thicker as the gun heats up
    if (this.beamTimer > 0) {
      const heatRatio = 1 - (this.beamTimer / this.beamDuration); // 0 to 1
      if (Math.random() < heatRatio * 0.9) {
        const tipDist = this.r + 51;
        const muzzleX = this.x + Math.cos(this.gunAngle) * tipDist;
        const muzzleY = this.y + Math.sin(this.gunAngle) * tipDist;
        const smokeVx = Math.cos(this.gunAngle) * (4 + Math.random() * 2);
        const smokeVy = Math.sin(this.gunAngle) * (4 + Math.random() * 2);
        spawnLaserSmoke(muzzleX, muzzleY, smokeVx, smokeVy);
      }
    } 
    // Cool down smoke effect right after firing
    // The beam fires for beamDuration frames, during which shootCooldown ticks down.
    // So when the beam ends, shootCooldown is at shootCooldownMax - beamDuration.
    else if (this.beamTimer === 0 && this.shootCooldown > 0 && this.shootCooldown > this.shootCooldownMax - (this.beamDuration + 30)) {
      // For the first 30 frames after the beam finishes, emit intense smoke from the muzzle
      if (Math.random() < 0.6) {
        // Calculate muzzle tip position
        const tipDist = this.r + 51;
        const muzzleX = this.x + Math.cos(this.gunAngle) * tipDist;
        const muzzleY = this.y + Math.sin(this.gunAngle) * tipDist;
        
        // Smoke escapes forward and slightly randomly
        const smokeVx = Math.cos(this.gunAngle) * 3;
        const smokeVy = Math.sin(this.gunAngle) * 3;
        
        spawnLaserSmoke(muzzleX, muzzleY, smokeVx, smokeVy);
      }
    }
  }

  draw(ctx) {
    if (this.hp <= 0) return;

    if (this.beamCharge > 0 && this.beamTimer === 0) {
      this.drawChargeEffect(ctx);
    }

    super.draw(ctx);
  }

  // Draw the beam and hit glows ON TOP of all fighters
  drawBeamOverlay(ctx) {
    if (this.hp <= 0 || this.beamTimer <= 0) return;
      ctx.save();
      
      // Smooth fade in over the first 8 frames, and fade out over the last 8 frames
      const fadeOutMultiplier = Math.min(1, this.beamTimer / 8);
      const timeFired = this.beamDuration - this.beamTimer;
      const fadeInMultiplier = Math.min(1, timeFired / 8);
      const fadeMultiplier = fadeOutMultiplier * fadeInMultiplier;
      
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

      // Outer huge bloom (orange)
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = (25 + pulse3 * 2) * fadeMultiplier;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `rgba(255, 120, 0, ${0.3 * fadeMultiplier})`;
      ctx.lineWidth = ((CONFIG.laser.glowWidth || 12) + 16 + pulse3 * 1.5) * fadeMultiplier;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Secondary wide glow (bright orange)
      ctx.shadowBlur = (15 + pulse2) * fadeMultiplier;
      ctx.shadowColor = '#ffaa00';
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `rgba(255, 180, 50, ${0.5 * fadeMultiplier})`;
      ctx.lineWidth = ((CONFIG.laser.glowWidth || 12) + 4 + pulse2) * fadeMultiplier;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow for inner layers to keep it optimized

      // Mid bright glow
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `rgba(255, 220, 150, ${0.8 * fadeMultiplier})`;
      ctx.lineWidth = ((CONFIG.laser.glowWidth || 12) - 2 + pulse2) * fadeMultiplier;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Inner core (white)
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10 * fadeMultiplier;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `rgba(255, 255, 255, ${fadeMultiplier})`;
      ctx.lineWidth = ((CONFIG.laser.coreWidth || 4) + pulse1 + 1.5) * fadeMultiplier;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Energy nodes traveling down the beam for dynamic flow
      const numNodes = 6; // More nodes
      const speed = 1.0;  // Faster nodes
      ctx.fillStyle = `rgba(255, 255, 255, ${fadeMultiplier})`;
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 15 * fadeMultiplier; // Brighter node glow

      for (let i = 0; i < numNodes; i++) {
        // Calculate offset (0 to 1) that wraps around
        let offset = ((time * speed) + (i / numNodes)) % 1.0;
        let nx = startX + Math.cos(angle) * (beamLen * offset);
        let ny = startY + Math.sin(angle) * (beamLen * offset);

        // Node width pulses and is larger near the middle of the beam
        let nodeRadius = (2 + Math.sin(offset * Math.PI) * 4) * fadeMultiplier;

        ctx.beginPath();
        ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Draw massive glow around targets currently being hit by the beam
      for (const [target, hitState] of this.beamHitState.entries()) {
        if (!target || target.hp <= 0) continue;
        
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        // Large radial bloom around the target
        const hitGlow = ctx.createRadialGradient(target.x, target.y, target.r * 0.2, target.x, target.y, target.r * 3);
        hitGlow.addColorStop(0, `rgba(255, 255, 255, ${(0.8 + Math.random() * 0.2) * fadeMultiplier})`);
        hitGlow.addColorStop(0.2, `rgba(255, 150, 50, ${(0.6 + Math.random() * 0.2) * fadeMultiplier})`);
        hitGlow.addColorStop(1, 'rgba(255, 50, 0, 0)');
        
        ctx.fillStyle = hitGlow;
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.r * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw proximity illumination on ANY fighter near the beam
      if (state && state.fighters) {
        const l2 = dx * dx + dy * dy;
        if (l2 > 0) {
          for (const f of state.fighters) {
            if (!f || f.hp <= 0 || f === this) continue;

            let t = ((f.x - startX) * dx + (f.y - startY) * dy) / l2;
            t = Math.max(0, Math.min(1, t));
            const projX = startX + t * dx;
            const projY = startY + t * dy;
            const dist = Math.hypot(f.x - projX, f.y - projY);

            // If within 150 pixels of the beam center, cast light on them
            const maxLightDist = 150;
            if (dist < maxLightDist && !this.beamHitState.has(f)) {
              // Calculate light intensity (0 to 1) based on distance
              const intensity = 1 - (dist / maxLightDist);
              
              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              const shineGlow = ctx.createRadialGradient(f.x, f.y, f.r * 0.5, f.x, f.y, f.r * 1.5);
              
              // Orange/yellow cast light
              shineGlow.addColorStop(0, `rgba(255, 180, 50, ${intensity * 0.5 * fadeMultiplier})`);
              shineGlow.addColorStop(1, 'rgba(255, 100, 0, 0)');
              
              ctx.fillStyle = shineGlow;
              ctx.beginPath();
              ctx.arc(f.x, f.y, f.r * 1.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }
        }
      }
  }

  drawChargeEffect(ctx) {
    drawWhiteChargeEffect(ctx, this.x, this.y, this.gunAngle, this.beamCharge, this.r);
  }

  drawGun(ctx) {
    drawWhiteRailgun(ctx, this.x, this.y, this.gunAngle, this.r, this.beamCharge, this.beamTimer);
    
    // Draw Hand holding the gun
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.gunAngle);
    if (Math.abs(this.gunAngle) > Math.PI / 2) {
      ctx.scale(1, -1);
    }
    
    // Position hand on the gun grip
    ctx.translate(this.r + 6, 0);
    ctx.beginPath();
    ctx.arc(0, 3, 6, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.restore();
  }

  onDamageDealt(target, projectile, ownerIndex) {
    if (projectile && projectile.isLaser) {
      // Spawn intense sparks at the hit location
      spawnSparks(target.x, target.y, 3, 'laserHit');

      // Optional: pushback effect when laser hits
      if (!this.initialHitDone) {
        const knockbackStrength = 1.0;
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        target.vx += (dx / dist) * knockbackStrength;
        target.vy += (dy / dist) * knockbackStrength;
      }
    }
  }
}
