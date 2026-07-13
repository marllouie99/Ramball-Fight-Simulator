import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText } from '../../core/state.js';
import { playSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { drawGunSlingerDualRevolver, GUNSLINGER_WEAPON_GRAPHICS } from '../../graphics/weapons/gunSlingerWeaponGraphics.js';
import { spatialGrid } from '../../systems/physics.js';

/**
 * Gun Slinger Fighter
 * Dual-wields revolvers on both sides of the body.
 * Alternates shots with a delay between guns.
 * Passive: chance to deal critical damage.
 * Active skill: rapid sync fire from both guns.
 */
export class GunSlingerFighter extends Fighter {
  constructor(def) {
    super(def);
    this.leftGunTimer = 0; // Timer for left gun delay
    this.muzzleFlashTimer = 0; // Timer for muzzle flash animation
    this.skillTimer = 0; // Cooldown for active skill
    this.skillActive = false; // Is skill currently active
    this.skillBurstTimer = 0; // Timer for skill burst intervals
    this.skillBurstCount = 0; // Number of bursts fired in current skill
    this.currentGun = 'right'; // Which gun fires next
    this.rightGunAngle = 0; // Aim angle for right gun
    this.leftGunAngle = 0;  // Aim angle for left gun

    // Magazine system
    this.magazineBullets = CONFIG.gunslinger.magazineSize; // Current bullets in magazine
    this.maxMagazine = CONFIG.gunslinger.magazineSize; // Max magazine capacity
    this.reloadTimer = 0; // Reload timer
    this.isReloading = false; // Is currently reloading

    // Smoke effect for skill
    this.smokeTimer = 0; // Timer for smoke effect duration
    this.smokeParticles = []; // Array of smoke particles

    // Recoil animation (separate for each gun)
    this.rightRecoilOffset = 0; // Right gun recoil offset
    this.rightRecoilTilt = 0;  // Right gun recoil tilt
    this.leftRecoilOffset = 0; // Left gun recoil offset
    this.leftRecoilTilt = 0;   // Left gun recoil tilt
  }

  reset() {
    super.reset();
    this.leftGunTimer = 0;
    this.muzzleFlashTimer = 0;
    this.skillTimer = 0;
    this.skillActive = false;
    this.skillBurstTimer = 0;
    this.skillBurstCount = 0;
    this.currentGun = 'right';
    this.rightGunAngle = 0;
    this.leftGunAngle = 0;
    this.magazineBullets = this.maxMagazine;
    this.reloadTimer = 0;
    this.isReloading = false;
    this.smokeTimer = 0;
    this.smokeParticles = [];
    this.rightRecoilOffset = 0;
    this.rightRecoilTilt = 0;
    this.leftRecoilOffset = 0;
    this.leftRecoilTilt = 0;
  }

  _spawnSmoke() {
    // Spawn smoke particles around the guns when skill is used
    const particleCount = 6; // Reduced from 8 for better performance
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 0.3 + Math.random() * 0.5;
      const offsetX = Math.cos(this.rightGunAngle) * 25;
      const offsetY = Math.sin(this.rightGunAngle) * 25;
      this.smokeParticles.push({
        x: this.x + offsetX + (Math.random() - 0.5) * 10,
        y: this.y + offsetY + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 30 + Math.random() * 20,
        size: 8 + Math.random() * 6,
      });
    }
    this.smokeTimer = 40;
  }

  _updateSmoke() {
    // OPTIMIZATION: Quality-based smoke updates
    const qualityLevel = state.qualityLevel || 1.0;
    const fps = state.fps || 60;
    const useAggressiveMode = fps < 40 || qualityLevel < 0.5;

    if (useAggressiveMode && Math.random() > 0.5) return;

    if (this.smokeTimer > 0) {
      this.smokeTimer--;
    }
    // Update existing particles - iterate backwards for safe removal
    let i = this.smokeParticles.length;
    while (i--) {
      const p = this.smokeParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.size += 0.15;
      p.life--;
      if (p.life <= 0) {
        this.smokeParticles[i] = this.smokeParticles[this.smokeParticles.length - 1];
        this.smokeParticles.pop();
      }
    }
  }

  _drawSmoke(ctx) {
    const count = this.smokeParticles.length;
    if (count === 0) return;

    // Pre-compute common values
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < count; i++) {
      const p = this.smokeParticles[i];
      const alpha = (p.life / p.maxLife) * 0.35;
      const size = p.size;

      // Use solid circle with alpha instead of expensive gradient
      // Inner bright core
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = '#a0a0a0';
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Outer soft ring
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = '#606060';
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawLowAmmoSmoke(ctx) {
    const ratio = this.magazineBullets / this.maxMagazine;
    const threshold = 0.3;
    if (ratio >= threshold) return;

    const intensity = 1 - ratio / threshold;
    const alpha = intensity * 0.4;

    const p = GUNSLINGER_WEAPON_GRAPHICS.positioning;
    const scale = p.scale;
    const gunOffset = this.r + p.gunOffset;
    const leftOffset = p.leftGunOffset;

    const rightMuzzleX = this.x + Math.cos(this.rightGunAngle) * (gunOffset + 26 * scale);
    const rightMuzzleY = this.y + Math.sin(this.rightGunAngle) * (gunOffset + 26 * scale);
    const leftMuzzleX = this.x + Math.cos(this.leftGunAngle) * (-gunOffset + leftOffset + 26 * scale);
    const leftMuzzleY = this.y + Math.sin(this.leftGunAngle) * (-gunOffset + leftOffset + 26 * scale);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    for (const [mx, my] of [[rightMuzzleX, rightMuzzleY], [leftMuzzleX, leftMuzzleY]]) {
      // Use solid circles instead of expensive gradient
      // Inner core
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#888888';
      ctx.beginPath();
      ctx.arc(mx, my, 8, 0, Math.PI * 2);
      ctx.fill();

      // Outer soft ring
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = '#555555';
      ctx.beginPath();
      ctx.arc(mx, my, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  aim(opponent, secondaryOpponent = null) {
    if (!opponent) return;

    this.rightGunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.gunAngle = this.rightGunAngle;

    if (secondaryOpponent) {
      this.leftGunAngle = Math.atan2(secondaryOpponent.y - this.y, secondaryOpponent.x - this.x);
    } else {
      // Both guns aim at the primary target
      this.leftGunAngle = this.rightGunAngle;
    }
  }

  getTargets() {
    // OPTIMIZATION: Use spatial grid to get nearby targets instead of checking all
    const targets = [];
    const selfIndex = state.fighters.indexOf(this);
    const selfTeam = state.getFighterTeam(selfIndex);

    // Get nearby fighters using spatial grid (large radius for targeting)
    const nearbyFighters = spatialGrid.getNearby(this.x, this.y, 800);

    for (const other of nearbyFighters) {
      if (!other || other === this || other.hp <= 0) continue;
      if (other.invincibilityTimer > 0 || other.flashStepTimer > 0) continue;

      const otherIndex = state.fighters.indexOf(other);
      if (state.mode === GAME_MODES.TWO_VS_TWO && selfTeam !== null && state.getFighterTeam(otherIndex) === selfTeam) continue;

      const dx = other.x - this.x;
      const dy = other.y - this.y;
      targets.push({ fighter: other, dist: Math.hypot(dx, dy) });
    }

    // Also include illusions as targets (but not own illusions)
    for (const illusion of state.illusions || []) {
      if (!illusion || illusion.hp <= 0 || illusion.owner === this) continue;
      const dx = illusion.x - this.x;
      const dy = illusion.y - this.y;
      targets.push({ fighter: illusion, dist: Math.hypot(dx, dy) });
    }

    targets.sort((a, b) => a.dist - b.dist);
    return targets.map((entry) => entry.fighter);
  }

  _startReload() {
    if (this.isReloading) return;
    this.isReloading = true;
    this.reloadTimer = CONFIG.gunslinger.reloadTime;
    spawnFloatingText(this.x, this.y - this.r - 10, 'RELOADING', '#66ccff');
    // Play reload sound
    const reloadSound = getSkillEffectSound('gunslinger', 'reload');
    if (reloadSound) playSound(reloadSound.src, reloadSound.volume);
  }

  _finishReload() {
    this.magazineBullets = this.maxMagazine;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.gunSpinTimer = 20;
    this.gunSpinDuration = 20;
    spawnFloatingText(this.x, this.y - this.r - 10, 'RELOADED', '#aaffff');
  }

  fireBullet(ownerIndex, damage, isSkill = false, target = null) {
    if (!projectileSystem) return;
    if (this.isReloading && !isSkill) return;
    if (!isSkill && this.magazineBullets <= 0) {
      this._startReload();
      return;
    }

    const speed = CONFIG.gunslinger.bulletSpeed;
    const bulletDamage = isSkill ? CONFIG.gunslinger.skillDamage : damage;

    if (!isSkill) {
      this.magazineBullets = Math.max(0, this.magazineBullets - 1);
      if (this.magazineBullets === 0) {
        this._startReload();
      }
    } else {
      // Skill bullets also consume from magazine
      this.magazineBullets = Math.max(0, this.magazineBullets - 1);
    }

    const gunAngle = target
      ? Math.atan2(target.y - this.y, target.x - this.x)
      : (this.currentGun === 'right' ? this.rightGunAngle : this.leftGunAngle);

    // Calculate exact spawn position at the gun barrel tip
    const isRightGun = this.currentGun === 'right';

    // Based on gunSlingerWeaponGraphics:
    // The guns are positioned at X = r * 0.3 (forward) and Y = +/- (r * 0.6) (sides)
    // The muzzle flash is drawn at X = 26 * 0.9 = 23.4 relative to gun center
    const forwardOffset = (this.r * 0.3) + 23.4;
    const sideOffset = isRightGun ? (this.r * 0.6) : -(this.r * 0.6);

    // Convert local offsets to global coordinates based on gunAngle
    const spawnX = this.x + Math.cos(gunAngle) * forwardOffset - Math.sin(gunAngle) * sideOffset;
    const spawnY = this.y + Math.sin(gunAngle) * forwardOffset + Math.cos(gunAngle) * sideOffset;

    projectileSystem.fireProjectile(this, ownerIndex, bulletDamage, false, speed, false, null, spawnX, spawnY, gunAngle);

    // Play Gun Slinger shot sound with configurable timing
    const sound = getBasicAttackSound(this._def?.id, this._def?.type);
    this._attackSoundTimer = sound.delay;
    this._attackSoundConfig = sound;

    const isCrit = !isSkill && Math.random() < CONFIG.gunslinger.critChance;
    this._lastShotWasCrit = isCrit;

    if (this.currentGun === 'right') {
      this.currentGun = 'left';
      this.leftGunTimer = CONFIG.gunslinger.leftGunDelay;
    } else {
      this.currentGun = 'right';
    }
  }

  activateSkill(ownerIndex) {
    if (this.skillTimer > 0 || this.isReloading) return;
    const requiresFull = CONFIG.gunslinger.skillRequiresFullMag;
    const isLowMag = this.magazineBullets <= CONFIG.gunslinger.autoSkillThreshold;
    if (requiresFull && this.magazineBullets < this.maxMagazine && !isLowMag) return;

    this.skillActive = true;
    this.skillTimer = CONFIG.gunslinger.skillCooldown;
    this.skillBurstTimer = 0;
    this.skillBurstCount = 0;
    // Don't reload here — let the skill fire first, then reload when it ends

    spawnFloatingText(this.x, this.y - this.r - 10, 'RAPID FIRE!', '#ff6600');
  }

  onDamageDealt(target, projectile, ownerIndex) {
    if (!projectile.isSkill) {
      // Add a very small knockback on basic attacks
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const knockbackStrength = CONFIG.gunslinger.basicAttackKnockback;
      target.knockbackVx = (target.knockbackVx || 0) + (dx / dist) * knockbackStrength;
      target.knockbackVy = (target.knockbackVy || 0) + (dy / dist) * knockbackStrength;

      // Apply critical damage if the last shot was a crit
      if (this._lastShotWasCrit) {
        const extraDamage = this.damage * (CONFIG.gunslinger.critMultiplier - 1);
        target.takeDamage(extraDamage, this, { isCrit: true });
        spawnFloatingText(target.x, target.y - target.r - 15, 'CRIT!', '#ffaa00');
        this._lastShotWasCrit = false;
      }
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

    // Handle skill cooldown
    if (this.skillTimer > 0) {
      this.skillTimer--;
    }

    // Handle reload timer
    if (this.isReloading) {
      if (this.reloadTimer > 0) {
        this.reloadTimer--;
      }
      if (this.reloadTimer === 0) {
        this._finishReload();
      }
    }

    // Handle left gun delay
    if (this.leftGunTimer > 0) {
      this.leftGunTimer--;
    }

    // Handle muzzle flash timer
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer--;
    }

    // Handle gun spin timer
    if (this.gunSpinTimer > 0) {
      this.gunSpinTimer--;
    }

    // Handle recoil animation decay (separate for each gun)
    const recoilConfig = GUNSLINGER_WEAPON_GRAPHICS.recoil;

    // Right gun recoil decay
    if (this.rightRecoilOffset > 0) {
      this.rightRecoilOffset *= (1 - recoilConfig.recoilDecay);
      if (this.rightRecoilOffset < 0.1) {
        this.rightRecoilOffset = 0;
      }
    }
    if (this.rightRecoilTilt > 0) {
      this.rightRecoilTilt *= (1 - recoilConfig.tiltDecay);
      if (this.rightRecoilTilt < 0.001) {
        this.rightRecoilTilt = 0;
      }
    }

    // Left gun recoil decay
    if (this.leftRecoilOffset > 0) {
      this.leftRecoilOffset *= (1 - recoilConfig.recoilDecay);
      if (this.leftRecoilOffset < 0.1) {
        this.leftRecoilOffset = 0;
      }
    }
    if (this.leftRecoilTilt > 0) {
      this.leftRecoilTilt *= (1 - recoilConfig.tiltDecay);
      if (this.leftRecoilTilt < 0.001) {
        this.leftRecoilTilt = 0;
      }
    }

    // Update smoke particles
    this._updateSmoke();

    const targets = this.getTargets();
    const primaryTarget = targets[0] || opponent;
    const secondaryTarget = targets[1] || null;
    this.aim(primaryTarget, secondaryTarget);

    // Auto-trigger skill when magazine is low and skill is ready
    if (primaryTarget && this.skillTimer <= 0 && !this.skillActive && !this.isReloading) {
      const canActivateFromLowMag = this.magazineBullets <= CONFIG.gunslinger.autoSkillThreshold;
      const hasFullMagForSkill = this.magazineBullets === this.maxMagazine;

      if (canActivateFromLowMag) {
        // Low magazine: activate immediately
        this.activateSkill(ownerIndex);
      } else if (hasFullMagForSkill && Math.random() < 0.02) {
        // Full magazine: small random chance to activate
        this.activateSkill(ownerIndex);
      }
    }

    // Handle active skill (rapid sync fire)
    if (this.skillActive) {
      this.skillBurstTimer++;

      if (this.skillBurstTimer >= CONFIG.gunslinger.skillBurstInterval) {
        this.skillBurstTimer = 0;

        if (this.skillBurstCount < CONFIG.gunslinger.skillBurstCount) {
          // Fire both guns in sync during skill - but with slight recoil offset for visual variety
          this.currentGun = 'right';
          this.fireBullet(ownerIndex, CONFIG.gunslinger.skillDamage, true);
          this.muzzleFlashTimer = 5;
          this.rightRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil;
          this.rightRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt;
          this._spawnSmoke();
          this.currentGun = 'left';
          this.fireBullet(ownerIndex, CONFIG.gunslinger.skillDamage, true);
          this.muzzleFlashTimer = 5;
          this.leftRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil * 0.85; // Slightly different recoil
          this.leftRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt * 0.9;
          this._spawnSmoke();
          this.skillBurstCount++;
        } else {
          // Skill finished — reload now
          this.skillActive = false;
          this.skillBurstCount = 0;
          this.currentGun = 'right';
          this._startReload();
        }
      }
    } else {
      // Normal attack - alternating shots and dual-target firing when possible
      if (this.shootCooldown > 0) {
        this.shootCooldown--;
      } else if (secondaryTarget && !this.isReloading && this.magazineBullets > 1) {
        this.currentGun = 'right';
        this.fireBullet(ownerIndex, this.damage, false, primaryTarget);
        this.muzzleFlashTimer = 5;
        this.rightRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil;
        this.rightRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt;
        this.currentGun = 'left';
        this.fireBullet(ownerIndex, this.damage, false, secondaryTarget);
        this.muzzleFlashTimer = 5;
        this.leftRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil * 0.9;
        this.leftRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt * 0.85;
        this.shootCooldown = CONFIG.gunslinger.shotCooldown;
      } else if (this.leftGunTimer === 0 && !this.isReloading && this.magazineBullets > 0) {
        this.fireBullet(ownerIndex, this.damage);
        this.muzzleFlashTimer = 5;
        // Alternate which gun gets the full recoil (creates visual variety)
        if (this.currentGun === 'right') {
          this.rightRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil;
          this.rightRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt;
          this.leftRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil * 0.3; // Small secondary recoil
          this.leftRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt * 0.3;
        } else {
          this.leftRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil;
          this.leftRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt;
          this.rightRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil * 0.3;
          this.rightRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt * 0.3;
        }
        this.shootCooldown = CONFIG.gunslinger.shotCooldown;
      } else if (this.magazineBullets === 0 && !this.isReloading) {
        this._startReload();
      }
    }

    // Movement — slow down during reload
    const speedMult = this.isReloading ? CONFIG.gunslinger.reloadSpeedPenalty : 1;
    this.x += this.vx * speedMult;
    this.y += this.vy * speedMult;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    this.resolveWallBounce(arena);
  }

  drawGun(ctx) {
    const isFiring = this.muzzleFlashTimer > 0;

    let gunSpinAngle = 0;
    if (this.gunSpinTimer > 0) {
      const t = this.gunSpinTimer / this.gunSpinDuration;
      // 1 full rotation (Math.PI * 2) backward. Starts at 1, goes to 0.
      // Using t*t for a nice ease-out effect.
      gunSpinAngle = (t * t) * Math.PI * 2;
    }

    drawGunSlingerDualRevolver(
      this.x, this.y,
      this.rightGunAngle, this.leftGunAngle,
      this.r,
      isFiring,
      this.muzzleFlashTimer,
      this.rightRecoilOffset, this.rightRecoilTilt,  // Right gun recoil
      this.leftRecoilOffset, this.leftRecoilTilt,      // Left gun recoil
      gunSpinAngle
    );
    // Draw smoke effect around the guns
    this._drawSmoke(ctx);
    // Draw low ammo smoke effect
    this._drawLowAmmoSmoke(ctx);
  }

  drawMagazineBar(ctx) {
    // Determine which way the character is aiming (using primary right gun angle)
    const isFacingLeft = Math.abs(this.rightGunAngle) > Math.PI / 2;

    const magW = 16;
    const magH = 50;

    let magX;
    let bendDir;

    if (isFacingLeft) {
      // Character facing left -> put magazine on his right (behind him)
      magX = this.x + this.r + 14;
      bendDir = -1; // Curve left (towards the player)
    } else {
      // Character facing right -> put magazine on his left (behind him)
      magX = this.x - this.r - magW - 14;
      bendDir = 1; // Curve right (towards the player)
    }

    const magY = this.y - magH / 2;
    const bend = 8 * bendDir;

    ctx.save();

    // --- Depth Shadow ---
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    // --- 1. Draw Magazine Body (Dark Polymer) ---
    ctx.fillStyle = '#222428';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(magX + 2, magY + 6);
    ctx.lineTo(magX + magW, magY);
    ctx.quadraticCurveTo(magX + magW + bend, magY + magH / 2, magX + magW, magY + magH);
    ctx.lineTo(magX, magY + magH);
    ctx.quadraticCurveTo(magX + bend, magY + magH / 2, magX + 2, magY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Disable shadow for inner components
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // --- Add Magazine Ridges (Texture) ---
    ctx.strokeStyle = '#1a1b1f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let ry = magY + 15; ry < magY + magH - 5; ry += 6) {
      const t = (ry - magY) / magH;
      const curveOffset = 2 * (1 - t) * t * bend;

      ctx.moveTo(magX + 2 + curveOffset, ry);
      ctx.lineTo(magX + 6 + curveOffset, ry);
    }
    ctx.stroke();

    // --- 2. Draw Magazine Window (Transparent view) ---
    const winX = magX + 6;
    const winW = magW - 8;
    const winY = magY + 5;
    const winH = magH - 10;
    const innerBend = bend * 0.8;

    ctx.beginPath();
    ctx.moveTo(winX, winY + 2);
    ctx.lineTo(winX + winW, winY);
    ctx.quadraticCurveTo(winX + winW + innerBend, winY + winH / 2, winX + winW, winY + winH);
    ctx.lineTo(winX, winY + winH);
    ctx.quadraticCurveTo(winX + innerBend, winY + winH / 2, winX, winY + 2);
    ctx.closePath();

    // Fill the background of the window
    ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
    ctx.fill();

    // Save state before clipping
    ctx.save();
    ctx.clip(); // Clip everything inside to the window shape

    // --- 3. Draw Bullets Inside ---
    const bullets = this.magazineBullets;
    const bW = 3.5;
    const bH = 6;
    const rowSpacing = 3.1;

    // Spring follower (pushes bullets up)
    const activeRows = Math.ceil(bullets / 2);
    const followerY = winY + winH - 2 - activeRows * rowSpacing;

    ctx.fillStyle = '#ff2a2a'; // Red polymer follower
    ctx.fillRect(winX - 10, followerY, winW + 20, 4);

    // Draw each bullet
    for (let i = 0; i < bullets; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);

      const by = winY + winH - 2 - bH - row * rowSpacing;
      const t = (by - magY) / magH;
      const curveOffset = 2 * (1 - t) * t * bend;

      // Staggered double-stack + curve offset
      const bx = winX + 0.5 + col * 3.5 + curveOffset;

      // Brass casing
      ctx.fillStyle = '#f2c62c';
      ctx.fillRect(bx, by, bW, bH);

      // Casing shading
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(bx + bW - 1.5, by, 1.5, bH);

      // Copper projectile tip
      ctx.fillStyle = '#d4652f';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + bW / 2, by - 3);
      ctx.lineTo(bx + bW, by);
      ctx.closePath();
      ctx.fill();
    }

    // --- 4. Reload Animation / Overlay ---
    if (this.isReloading) {
      const reloadRatio = 1 - (this.reloadTimer / CONFIG.gunslinger.reloadTime);
      const scanY = winY + winH - (winH * reloadRatio);

      ctx.fillStyle = 'rgba(0, 255, 255, 0.35)';
      ctx.fillRect(winX - 10, scanY, winW + 20, winH);

      ctx.fillStyle = '#0ff';
      ctx.fillRect(winX - 10, scanY - 1, winW + 20, 2);
    }

    // Restore clipping
    ctx.restore();

    // Draw window border on top
    ctx.beginPath();
    ctx.moveTo(winX, winY + 2);
    ctx.lineTo(winX + winW, winY);
    ctx.quadraticCurveTo(winX + winW + innerBend, winY + winH / 2, winX + winW, winY + winH);
    ctx.lineTo(winX, winY + winH);
    ctx.quadraticCurveTo(winX + innerBend, winY + winH / 2, winX, winY + 2);
    ctx.closePath();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- 5. External Text / Glow ---
    if (this.isReloading) {
      // RELOAD Text on the side
      ctx.fillStyle = '#0ff';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.save();
      const textX = isFacingLeft ? magX + magW + 8 : magX - 8;
      ctx.translate(textX, magY + magH / 2);
      ctx.rotate(isFacingLeft ? Math.PI / 2 : -Math.PI / 2);
      ctx.fillText('RELOAD', 0, 0);
      ctx.restore();
    } else {
      // Full magazine glow accent
      if (bullets === this.maxMagazine) {
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(magX + 2, magY + 6);
        ctx.lineTo(magX + magW, magY);
        ctx.quadraticCurveTo(magX + magW + bend, magY + magH / 2, magX + magW, magY + magH);
        ctx.lineTo(magX, magY + magH);
        ctx.quadraticCurveTo(magX + bend, magY + magH / 2, magX + 2, magY + 6);
        ctx.closePath();
        ctx.stroke();
      }

      // Ammo count text below the magazine
      ctx.fillStyle = bullets <= 6 ? '#ff4444' : '#cccccc';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${bullets}`, magX + magW / 2, magY + magH + 3);
    }

    ctx.restore();
  }

  draw(ctx) {
    // Draw skill indicator when active
    if (this.skillActive) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, this.r + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    super.draw(ctx);
    this.drawMagazineBar(ctx);
  }
}
