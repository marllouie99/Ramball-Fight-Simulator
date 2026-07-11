import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, getProjectiles, clearProjectiles, spawnFloatingText } from '../../core/state.js';
import { playSound, playLoopingSound, fadeOutLoopingSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { flamewardenFlameSystem } from '../../graphics/weapons/flamewardenWeaponGraphics.js';
import { drawMachineGun } from '../../graphics/weaponVisuals.js';

export class MachineGunFighter extends Fighter {
  constructor(def) {
    super(def);
    this.heat = 0;
    this.isOverheated = false;
    this.overheatTimer = 0;
    this.skillCooldown = 0;
    this.isRolling = false;
    this.rollTimer = 0;
    this.rollVx = 0;
    this.rollVy = 0;
    this.lastFiredFrame = 0;
    this.barrelRotation = 0;
    this.barrelSpeed = 0; // Rotational speed of barrel (increases when firing, decays when resting)
    this.gunShakeX = 0;
    this.gunShakeY = 0;
    this.recoilVx = 0; // Pushback velocity from firing
    this.recoilVy = 0;
  }

  reset() {
    super.reset();
    this.heat = 0;
    this.isOverheated = false;
    this.overheatTimer = 0;
    this.skillCooldown = 0;
    this.isRolling = false;
    this.rollTimer = 0;
    this.rollVx = 0;
    this.rollVy = 0;
    this.lastFiredFrame = 0;
    this.barrelRotation = 0;
    this.barrelSpeed = 0;
    this.gunShakeX = 0;
    this.gunShakeY = 0;
    this.recoilVx = 0;
    this.recoilVy = 0;
  }

  normalizeAngle(angle) {
    while (angle <= -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
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

    // Cooldown ticks
    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.skillCooldown > 0) this.skillCooldown--;

    // â”€â”€ 1. ACTIVE SKILL: TACTICAL ROLL & SUPPRESSIVE SWEEP â”€â”€
    if (this.isRolling) {
      this.rollTimer--;
      
      // Slide along locked roll direction
      this.x += this.rollVx;
      this.y += this.rollVy;
      this.angle += 0.25; // Roll spin effect

      // Spray bullets in a sweeping cone without generating heat
      if (this.rollTimer % 3 === 0 && opponent) {
        const speed = CONFIG.machinegun.bulletSpeed;
        const sweepOffset = Math.sin(this.rollTimer * 0.4) * 0.25; // Sweeping spray angle
        const angle = this.gunAngle + sweepOffset;
        
        const spawnX = this.x + Math.cos(angle) * (this.r + 28);
        const spawnY = this.y + Math.sin(angle) * (this.r + 28);
        
        projectileSystem.fireProjectile(this, ownerIndex, this.damage, false, speed, false, null, spawnX, spawnY, angle);
        
        // Boost barrel speed during roll spray
        this.barrelSpeed = Math.min(this.barrelSpeed + 0.2, 2.5);
        // Extra shake during roll
        this.gunShakeX = (Math.random() - 0.5) * 5;
        this.gunShakeY = (Math.random() - 0.5) * 5;

        // Play quick firing sound
        const sound = getBasicAttackSound(this._def?.id, this._def?.type);
        if (sound) playSound(sound.src, sound.volume * 0.8);
      }

      this.resolveWallBounce(arena);

      if (this.rollTimer <= 0) {
        this.isRolling = false;
        // Recover normal velocity direction
        const speedMag = Math.hypot(this.rollVx, this.rollVy) || this.speed;
        this.vx = (this.rollVx / speedMag) * this.speed;
        this.vy = (this.rollVy / speedMag) * this.speed;
      }
      return;
    }

    // â”€â”€ 2. KINETIC FEEDBACK & RECOIL ENGINE â”€â”€
    // Track if currently firing for kinetic effects
    const isCurrentlyFiring = this.shootCooldown > 0 && !this.isOverheated;
    
    // â”€â”€ 2a. Rotational Barrel Spin â”€â”€
    if (isCurrentlyFiring) {
      // Accelerate barrel spin when firing (fast spin up)
      this.barrelSpeed = Math.min(this.barrelSpeed + 0.15, 2.5);
    } else {
      // Decay barrel speed when resting (slow spin down)
      this.barrelSpeed = Math.max(this.barrelSpeed - 0.03, 0);
    }
    // Update barrel rotation based on current speed
    this.barrelRotation += this.barrelSpeed;
    
    // â”€â”€ 2b. Gun Shake (Jitter) â”€â”€
    if (isCurrentlyFiring) {
      // High-frequency jitter when firing (intense vibration)
      this.gunShakeX = (Math.random() - 0.5) * 4;
      this.gunShakeY = (Math.random() - 0.5) * 4;
    } else {
      // Decay shake when not firing
      this.gunShakeX *= 0.85;
      this.gunShakeY *= 0.85;
    }
    
    // â”€â”€ 2c. Subtle Pushback (Recoil Force) â”€â”€
    if (isCurrentlyFiring) {
      // Apply constant backward force opposite to gun direction
      const recoilForce = 0.15;
      this.recoilVx = -Math.cos(this.gunAngle) * recoilForce;
      this.recoilVy = -Math.sin(this.gunAngle) * recoilForce;
    } else {
      // Decay recoil force
      this.recoilVx *= 0.9;
      this.recoilVy *= 0.9;
    }
    
    // â”€â”€ 3. HEAT & OVERHEAT THERMAL ENGINE â”€â”€
    if (this.isOverheated) {
      this.overheatTimer--;
      this.heat = Math.max(0, 100 * (this.overheatTimer / CONFIG.machinegun.overheatDuration));
      
      if (this.overheatTimer <= 0) {
        this.isOverheated = false;
        spawnFloatingText(this.x, this.y - this.r - 20, 'COOLED!', '#00ff66');
      }
    } else {
      // Passive cooling when not firing
      const framesSinceLastFire = state.frameSingleStep ? 1 : 1; 
      this.heat = Math.max(0, this.heat - CONFIG.machinegun.coolRate);
    }

    // Trigger tactical roll if skill is off cooldown and opponent gets close
    if (this.skillCooldown === 0 && opponent) {
      const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      if (dist < 130 && Math.random() < 0.08) {
        this.isRolling = true;
        this.rollTimer = CONFIG.machinegun.skillDuration;
        this.skillCooldown = CONFIG.machinegun.skillCooldown;
        
        // Roll in current movement direction (or toward target if stationary)
        const moveMag = Math.hypot(this.vx, this.vy);
        const rollAngle = moveMag > 0.1 ? Math.atan2(this.vy, this.vx) : Math.atan2(opponent.y - this.y, opponent.x - this.x);
        
        this.rollVx = Math.cos(rollAngle) * CONFIG.machinegun.skillRollSpeed;
        this.rollVy = Math.sin(rollAngle) * CONFIG.machinegun.skillRollSpeed;
        
        spawnFloatingText(this.x, this.y - this.r - 20, 'SWEEP & ROLL!', '#b8860b');
        
        const rollSound = getSkillSound('machinegun', 'roll');
        if (rollSound) playSound(rollSound.src, rollSound.volume);
      }
    }

    // â”€â”€ 3. STANDARD SHOOTING & AIMING â”€â”€
    if (opponent) {
      const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      const delta = this.normalizeAngle(targetAngle - this.angle);
      const aligned = Math.abs(delta) < CONFIG.normal.aimThreshold;
      
      if (aligned && this.shootCooldown === 0 && !this.isOverheated) {
        const speed = CONFIG.machinegun.bulletSpeed;
        const spawnX = this.x + Math.cos(this.gunAngle) * (this.r + 28);
        const spawnY = this.y + Math.sin(this.gunAngle) * (this.r + 28);

        projectileSystem.fireProjectile(this, ownerIndex, this.damage, false, speed, false, null, spawnX, spawnY);
        this.shootCooldown = CONFIG.machinegun.shotCooldown;
        
        // Add heat and check for overheat
        this.heat += CONFIG.machinegun.heatPerShot;
        // Barrel rotation and gun shake are now handled by kinetic feedback engine above

        if (this.heat >= 100) {
          this.heat = 100;
          this.isOverheated = true;
          this.overheatTimer = CONFIG.machinegun.overheatDuration;
          spawnFloatingText(this.x, this.y - this.r - 20, 'OVERHEAT!', '#ff3300');
          
          const jamSound = getSkillEffectSound('machinegun', 'jam');
          if (jamSound) playSound(jamSound.src, jamSound.volume);
        } else {
          // Trigger quick light machine gun sound
          const sound = getBasicAttackSound(this._def?.id, this._def?.type);
          this._attackSoundTimer = sound.delay;
          this._attackSoundConfig = sound;
        }
      }
    }

    // Move slower during overheat
    const moveSpeedMultiplier = this.isOverheated ? CONFIG.machinegun.slowMultiplier : 1.0;
    this.x += this.vx * moveSpeedMultiplier;
    this.y += this.vy * moveSpeedMultiplier;
    
    // Apply recoil pushback (subtle constant force pushing fighter backward when firing)
    this.x += this.recoilVx;
    this.y += this.recoilVy;
    
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate) * moveSpeedMultiplier;

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
    ctx.strokeStyle = '#b8860b';
    ctx.stroke();
  }

  drawGun(ctx) {
    ctx.save();
    ctx.translate(this.x + this.gunShakeX, this.y + this.gunShakeY);
    ctx.rotate(this.gunAngle);

    // Determine if currently firing (for muzzle flash)
    const isFiring = this.shootCooldown > 0 && this.shootCooldown <= 4 && !this.isOverheated;

    // Draw the tactical minigun using the dedicated graphics module
    drawMachineGun(ctx, {
      x: 0,
      y: 0,
      r: this.r,
      barrelRotation: this.barrelRotation,
      heat: this.heat,
      isOverheated: this.isOverheated,
      isFiring: isFiring,
      facingRight: true
    });

    ctx.restore();
  }

  drawHeatMeter(ctx) {
    const heatRatio = this.heat / 100;
    const meterRadius = this.r + 14;
    const thickness = 5;
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 0.25;
    const totalAngle = startAngle - endAngle;
    const filledAngle = endAngle + (totalAngle * (1 - heatRatio));

    ctx.save();
    ctx.translate(this.x, this.y);

    // Underheat background tracking
    ctx.beginPath();
    ctx.arc(0, 0, meterRadius, endAngle, startAngle);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Filled thermal bar
    if (this.heat > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, meterRadius, filledAngle, startAngle);
      ctx.strokeStyle = this.isOverheated ? '#ff3300' : `hsl(${120 - heatRatio * 120}, 100%, 50%)`;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    ctx.restore();
  }

  draw(ctx) {
    // Draw tactical rolling dash wind trails
    if (this.isRolling) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#b8860b';
      ctx.beginPath();
      ctx.arc(this.x - this.rollVx * 2.2, this.y - this.rollVy * 2.2, this.r * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    super.draw(ctx);
    this.drawHeatMeter(ctx);
  }
}

// Draw all active Cronos spheres on top of everything (including illusions)
