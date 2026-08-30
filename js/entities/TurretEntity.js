import { Fighter } from './fighter.js';
import { CONFIG } from '../core/config.js';
import { projectileSystem } from '../systems/projectileSystem.js';
import { spawnFloatingText, state } from '../core/state.js';
import { audioSystem } from '../systems/audioSystem.js';
import { getBasicAttackSound } from '../soundEffects/basicAttackSounds.js';
import { getSkillEffectSound } from '../soundEffects/skillEffectSounds.js';
import { drawTurret } from '../graphics/weaponVisuals.js';
import { spawnSparks } from '../graphics/particles/sparkEffect.js';
import { spawnDeathShatter, spawnMachineCorpse } from '../graphics/particles/deathShatterEffect.js';
import { drawMinionHealthBar } from '../graphics/statusEffects.js';

export class TurretEntity extends Fighter {
  constructor(x, y, ownerFighter, level = 1) {
    const cfg = CONFIG.Engineer || {};
    const sentryLevel = Math.max(1, Math.min(3, level || 1));

    // Stats scaling by Sentry Level
    let maxHp = cfg.turretLevel1Hp || 200;
    let damage = cfg.turretLevel1Damage || 2.2;
    let fireRate = cfg.turretLevel1FireRate || 8;
    let ammoCount = cfg.turretLevel1Ammo || 15;

    if (sentryLevel === 2) {
      maxHp = cfg.turretLevel2Hp || 280;
      damage = cfg.turretLevel2Damage || 1.8;
      fireRate = cfg.turretLevel2FireRate || 6;
      ammoCount = cfg.turretLevel2Ammo || 25;
    } else if (sentryLevel === 3) {
      maxHp = cfg.turretLevel3Hp || 380;
      damage = cfg.turretLevel3Damage || 2.0;
      fireRate = cfg.turretLevel3FireRate || 5;
      ammoCount = cfg.turretLevel3Ammo || 35;
    }

    // Create a dummy definition for the Turret
    const def = {
      id: 999,
      name: `Sentry Lv${sentryLevel}`,
      color: '#8B4513',
      startX: x,
      startY: y,
      startVx: 0,
      startVy: 0,
      radius: cfg.turretRadius || 18,
      type: 'Turret',
      isTurret: true,
      isMinion: true,
      hp: maxHp,
      damage: damage,
      cooldown: fireRate,
      moveSpeed: 0,
      spinRate: cfg.spinRate || 0.05,
    };
    super(def);

    this.owner = ownerFighter;
    this.level = sentryLevel;
    this.isTurret = true;
    this.isMinion = true;
    this.isDeployable = true;
    this.isImmovable = true;
    this.cannotBeKnockbacked = true;
    this.hideHpText = true; // Disable HP number overlay over body
    this.maxHp = maxHp;
    this.hp = this.maxHp;
    this.damage = damage;
    this.shootCooldownMax = fireRate;
    this.healCooldownTimer = 0;
    this.recoilTimer = 0;
    this.hitFlashTimer = 0;
    this.healTimer = 0;
    this.smokeParticles = [];

    // Ammo system
    this.ammo = ammoCount;
    this.maxAmmo = ammoCount;
    this.reloadTimer = 0;
    this.isReloading = false;
    this._hasDetectedTarget = false;
    this._rocketSalvoCounter = 0;
  }

  reset() {
    super.reset();
    const cfg = CONFIG.Engineer || {};
    this.isTurret = true;
    this.isMinion = true;
    this.isDeployable = true;
    this.isImmovable = true;
    this.cannotBeKnockbacked = true;
    this.hideHpText = true;
    this.maxHp = cfg.turretHp || 200;
    this.hp = this.maxHp;
    this.ammo = cfg.turretAmmo || 20;
    this.maxAmmo = cfg.turretAmmo || 20;
    this._hasDetectedTarget = false;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
  }

  // Override to make turret immune to ALL knockback physics.
  // Also zero out vx/vy directly so callers that bypass applyKnockback
  // and set velocity directly still get neutralised on the next frame.
  applyKnockback(vx, vy) {
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.vx = 0;
    this.vy = 0;
  }

  takeDamage(amount, attacker, opts = {}) {
    // Invulnerable while still being built
    if (this.isBuilding) return false;
    // Turrets are immune to poison damage
    if (opts.isPoison) return false;

    if (opts) {
      opts.knockback = false;
      opts.knockbackVx = 0;
      opts.knockbackVy = 0;
    }

    const applied = super.takeDamage(amount, attacker, opts);
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
    if (applied && this.hp > 0) {
      this.hitFlashTimer = 10;
    }
    return applied;
  }

  applyPoison(attacker) {
    // Override to do nothing, turrets are machines
  }

  onDeath() {
    const cfg = CONFIG.Engineer || {};
    // Distinct "machine broke" animation: corpse on ground + sparks
    spawnMachineCorpse(this.x, this.y, this.gunAngle);
    for (let i = 0; i < 4; i++) {
      spawnSparks(this.x, this.y, 8, 'orange');
    }
    const deathSfx = cfg.sounds?.sentryDestroyed || 'Assets/Sound Effects/Skills/engineer-sentrydestroyed.mp3';
    const deathVol = cfg.soundVolumes?.sentryDestroyed ?? 1.0;
    audioSystem.playSFX(deathSfx, deathVol);
  }

  heal(amount) {
    if (this.hp <= 0) return;
    this.hp = Math.min(this.hp + amount, this.maxHp);
    this.healTimer = 20; // Triggers repair visual effect
  }

  update(opponent, ownerIndex, arena) {
    if (this.hp <= 0) return;
    const cfg = CONFIG.Engineer || {};

    if (this.healCooldownTimer > 0) this.healCooldownTimer--;
    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.recoilTimer > 0) this.recoilTimer--;
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;
    if (this.healTimer > 0) this.healTimer--;

    // Update smoke particles
    if (this.smokeParticles && this.smokeParticles.length > 0) {
      for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
        const p = this.smokeParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.size += 0.4; // Expand faster
        p.life--;
        if (p.life <= 0) {
          this.smokeParticles.splice(i, 1);
        }
      }
    }

    if (this._handleTimeStop() || this.isTargetOfAmbush) {
      return; // Freeze! No moving, aiming, or shooting
    }

    // ── Absolute Immovable Anchor Lock ──
    // Sentry Turret is a fixed, heavy mechanical deployable anchored to the arena floor.
    // Zero out all velocities and lock coordinates unconditionally to prevent ANY push or displacement.
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX === undefined) {
      this._fixedX = this.x;
      this._fixedY = this.y;
    } else {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }

    // Keep within arena bounds
    if (arena) {
      if (this.x - this.r < arena.x) this.x = arena.x + this.r;
      if (this.x + this.r > arena.x + arena.width) this.x = arena.x + arena.width - this.r;
      if (this.y - this.r < arena.y) this.y = arena.y + this.r;
      if (this.y + this.r > arena.y + arena.height) this.y = arena.y + arena.height - this.r;
    }

    // Overheating: Thick dark smoke and fire at <= 10% HP
    if (this.hp > 0 && this.hp <= this.maxHp * 0.1) {
      if (Math.random() < 0.6) {
        // Spawn thick dark smoke
        this.smokeParticles.push({
          x: this.x + (Math.random() - 0.5) * 20,
          y: this.y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -1 - Math.random() * 1.5, // Billows upwards
          life: 20 + Math.random() * 20,
          maxLife: 40,
          size: 4 + Math.random() * 6,
          isDark: true // Flag for drawing darker smoke
        });
      }
      if (Math.random() < 0.3) {
        const px = this.x + (Math.random() - 0.5) * 20;
        const py = this.y + (Math.random() - 0.5) * 20;
        spawnSparks(px, py, 1, 'crimson');
      }
    }

    // Don't target or shoot while still being built
    if (this.isBuilding) return;

    // --- Ammo / Reload system ---
    if (this.isReloading) {
      this.reloadTimer--;
      if (this.reloadTimer <= 0) {
        this.ammo = this.maxAmmo;
        this.isReloading = false;
        spawnFloatingText(this.x, this.y - this.r - 20, 'RELOADED!', '#ffff00');
        const reloadedSfx = cfg.sounds?.sentryReloaded || 'Assets/Sound Effects/Skills/engineer-sentryreloaded.mp3';
        const reloadedVol = cfg.soundVolumes?.sentryReloaded ?? 0.90;
        audioSystem.playSFX(reloadedSfx, reloadedVol);
      }
    }

    // Check for nearby opponent to shoot
    let target = null;
    let minDist = Infinity;

    if (state) {
      // Find the team of the owner to avoid shooting teammates
      const ownerTeam = (state.mode === '2v2' || state.mode === '1v2 Stand Off') ? state.getFighterTeam(state.fighters.indexOf(this.owner)) : null;
      const myOwnerIndex = state.fighters.indexOf(this.owner);

      const evaluateTarget = (f) => {
        if (!f || f === this || f === this.owner || f.hp <= 0) return;

        // Skip stealthed & vanished targets
        if (f.invincibilityTimer > 0 || f.flashStepTimer > 0 || f.isStealthed || (f.vanishTimer && f.vanishTimer > 0)) return;

        let fOwnerIndex = -1;
        if (f.owner && state.fighters.includes(f.owner)) {
          fOwnerIndex = state.fighters.indexOf(f.owner);
        } else if (state.fighters.includes(f)) {
          fOwnerIndex = state.fighters.indexOf(f);
        }

        // Don't target our own owner's illusions
        if (fOwnerIndex !== -1 && fOwnerIndex === myOwnerIndex) return;

        // Don't target teammates in 2v2
        if (ownerTeam !== null && fOwnerIndex !== -1 && state.getFighterTeam(fOwnerIndex) === ownerTeam) return;

        const distSq = (f.x - this.x) ** 2 + (f.y - this.y) ** 2;
        if (distSq < minDist) {
          minDist = distSq;
          target = f;
        }
      };

      if (state.fighters && Array.isArray(state.fighters)) {
        for (let i = 0; i < state.fighters.length; i++) evaluateTarget(state.fighters[i]);
      }
      if (state.illusions && Array.isArray(state.illusions)) {
        for (let i = 0; i < state.illusions.length; i++) evaluateTarget(state.illusions[i]);
      }
    }

    // Aim and shoot if target is within range
    const rangeSq = (cfg.turretRange || 350) * (cfg.turretRange || 350);
    if (target && minDist <= rangeSq) {
      this.laserTargetDist = Math.sqrt(minDist);
      if (!this._hasDetectedTarget) {
        this._hasDetectedTarget = true;
        const detectSfx = cfg.sounds?.sentryDetected || 'Assets/Sound Effects/Skills/engineer-sentrydetected.mp3';
        const detectVol = cfg.soundVolumes?.sentryDetected ?? 0.95;
        audioSystem.playSFX(detectSfx, detectVol);
      }

      const isAimed = this.aimAt(target.x, target.y);
      if (isAimed && this.shootCooldown <= 0 && !this.isReloading && this.ammo > 0) {
        this.shootAtTarget(target);
      }
    } else {
      this._hasDetectedTarget = false;
      this.laserTargetDist = cfg.turretRange || 350;
      // Idle spin
      this.angle += this.speed * (this._def.spinRate || 0.05);
      this.gunAngle += 0.02; // slowly rotate gun when idle
    }
  }

  aimAt(tx, ty) {
    const targetAngle = Math.atan2(ty - this.y, tx - this.x);
    // Smoothly rotate towards target angle
    let diff = targetAngle - this.gunAngle;

    // Normalize difference to -PI to PI
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    const aimSpeed = CONFIG.Engineer.turretAimSpeed || 0.08;

    if (Math.abs(diff) <= aimSpeed) {
      this.gunAngle = targetAngle;
    } else {
      this.gunAngle += Math.sign(diff) * aimSpeed;
    }

    // Return true if we are closely aimed at the target
    return Math.abs(diff) < 0.15;
  }

  shootAtTarget(target) {
    if (!projectileSystem) return;

    // Get index of the Engineer for projectile ownership
    const ownerIndex = state.fighters.indexOf(this.owner);
    if (ownerIndex === -1) return;

    const cfg = CONFIG.Engineer || {};
    const speed = cfg.turretBulletSpeed || 22;
    const s = this.r / 20;
    const cosA = Math.cos(this.gunAngle);
    const sinA = Math.sin(this.gunAngle);

    // Generate unique pair ID for projectiles fired in this volley
    this._shotPairCounter = (this._shotPairCounter || 0) + 1;
    const pairId = `turret_pair_${this._shotPairCounter}_${Date.now()}`;

    if (this.level === 1) {
      // ── Level 1: Single Center Barrel Shot ──
      const muzzleX = 30 * s;
      const spawnX = this.x + muzzleX * cosA;
      const spawnY = this.y + muzzleX * sinA;
      const p = projectileSystem.fireProjectile(this, ownerIndex, this.damage, false, speed, false, 'turretBullet', spawnX, spawnY, this.gunAngle);
      if (p) {
        p.shotPairId = pairId;
        p.isTurretBullet = true;
      }

      // Muzzle smoke
      for (let i = 0; i < 2; i++) {
        const angle = this.gunAngle + (Math.random() - 0.5) * 0.5;
        const spd = 0.5 + Math.random() * 1.5;
        this.smokeParticles.push({
          x: spawnX + (Math.random() - 0.5) * 3,
          y: spawnY + (Math.random() - 0.5) * 3,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: 14 + Math.random() * 8,
          maxLife: 22,
          size: 2 + Math.random() * 2
        });
      }
    } else {
      // ── Level 2 & 3: Twin Gatling Minigun Volley ──
      const muzzleX = 38 * s;
      const upperY = -5 * s;
      const lowerY = 5 * s;

      // Upper barrel projectile
      const spawnX1 = this.x + muzzleX * cosA - upperY * sinA;
      const spawnY1 = this.y + muzzleX * sinA + upperY * cosA;
      const p1 = projectileSystem.fireProjectile(this, ownerIndex, this.damage, false, speed, false, 'turretBullet', spawnX1, spawnY1, this.gunAngle);
      if (p1) {
        p1.shotPairId = pairId;
        p1.isTurretBullet = true;
      }

      // Lower barrel projectile
      const spawnX2 = this.x + muzzleX * cosA - lowerY * sinA;
      const spawnY2 = this.y + muzzleX * sinA + lowerY * cosA;
      const p2 = projectileSystem.fireProjectile(this, ownerIndex, this.damage, false, speed, false, 'turretBullet', spawnX2, spawnY2, this.gunAngle);
      if (p2) {
        p2.shotPairId = pairId;
        p2.isTurretBullet = true;
      }

      // Spawn smoke particles at the muzzle tips
      for (let i = 0; i < 4; i++) {
        const isUpper = i % 2 === 0;
        const bx = isUpper ? spawnX1 : spawnX2;
        const by = isUpper ? spawnY1 : spawnY2;
        const angle = this.gunAngle + (Math.random() - 0.5) * 0.8;
        const spd = 0.5 + Math.random() * 1.5;
        this.smokeParticles.push({
          x: bx + (Math.random() - 0.5) * 4,
          y: by + (Math.random() - 0.5) * 4,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: 15 + Math.random() * 10,
          maxLife: 25,
          size: 2 + Math.random() * 2
        });
      }

      // ── Level 3: Quad Micro-Rocket Salvo ──
      if (this.level === 3) {
        this._rocketSalvoCounter = (this._rocketSalvoCounter || 0) + 1;
        const rocketInterval = cfg.turretLevel3RocketInterval || 4;
        if (this._rocketSalvoCounter % rocketInterval === 0) {
          this._fireRocketSalvo(target, ownerIndex, cosA, sinA, s);
        }
      }
    }

    const shotSfx = cfg.sounds?.sentryGunshot || 'Assets/Sound Effects/Skills/engineer-sentrygunshot.mp3';
    const shotVol = cfg.soundVolumes?.sentryGunshot ?? 0.80;
    audioSystem.playSFX(shotSfx, shotVol);

    this.shootCooldown = this.shootCooldownMax;
    this.recoilTimer = 10;

    // Consume ammo — trigger reload when magazine is empty
    this.ammo--;
    if (this.ammo <= 0) {
      this.isReloading = true;
      this.reloadTimer = cfg.turretReloadTime || 90;
      spawnFloatingText(this.x, this.y - this.r - 20, 'RELOADING...', '#ff3333');
      const reloadSfx = cfg.sounds?.sentryReloading || 'Assets/Sound Effects/Skills/engineer-sentryreloading.mp3';
      const reloadVol = cfg.soundVolumes?.sentryReloading ?? 0.90;
      audioSystem.playSFX(reloadSfx, reloadVol);
    }

    // Turret loses HP based on its damage when it shoots
    this.hp -= this.damage;
    if (this.hp <= 0) {
      this.hp = 0;
      if (this.onDeath) this.onDeath();
    }
  }

  _fireRocketSalvo(target, ownerIndex, cosA, sinA, s) {
    const cfg = CONFIG.Engineer || {};
    const rocketDamage = cfg.turretLevel3RocketDamage || 8.0;
    const podYOffsets = [-12 * s, -8 * s, 8 * s, 12 * s];
    const podX = 10 * s;

    for (let i = 0; i < 4; i++) {
      const offY = podYOffsets[i];
      const rX = this.x + podX * cosA - offY * sinA;
      const rY = this.y + podX * sinA + offY * cosA;
      const spreadAngle = this.gunAngle + (i - 1.5) * 0.12;

      const rocket = projectileSystem.fireProjectile(
        this,
        ownerIndex,
        rocketDamage,
        false,
        18,
        false,
        'turretBullet',
        rX,
        rY,
        spreadAngle
      );

      if (rocket) {
        rocket.isRocket = true;
        rocket.isTurretBullet = true;
      }

      // Rocket backblast smoke
      spawnSparks(rX, rY, 4, 'orange');
    }

    triggerGlobalScreenShake(10, 8);
  }

  draw(ctx) {
    if (this.hp <= 0) return;

    drawTurret(ctx, this);

    // Draw smoke particles (Discrete Pixel Art)
    if (this.smokeParticles && this.smokeParticles.length > 0) {
      for (const p of this.smokeParticles) {
        const alpha = Math.max(0, p.life / p.maxLife) * (p.isDark ? 0.75 : 0.6);
        const col = p.isDark ? `rgba(30, 32, 40, ${alpha.toFixed(2)})` : `rgba(148, 163, 184, ${alpha.toFixed(2)})`;
        ctx.fillStyle = col;
        const px = Math.round(p.x / 2) * 2;
        const py = Math.round(p.y / 2) * 2;
        const ps = Math.max(2, Math.round(p.size / 2) * 2);
        ctx.fillRect(px - ps / 2, py - ps / 2, ps, ps);
      }
    }

    // Heal/repair visual effect (Discrete Pixel Art Green Crosses)
    if (this.healTimer > 0) {
      const t = this.healTimer / 20;
      ctx.save();
      ctx.translate(Math.round(this.x / 2) * 2, Math.round(this.y / 2) * 2);

      const healR = Math.round((this.r * (2.2 - t * 1.0)) / 2) * 2;
      const count = 8;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + (1 - t) * 0.5;
        const hx = Math.round(Math.cos(a) * healR / 2) * 2;
        const hy = Math.round(Math.sin(a) * healR / 2) * 2;
        ctx.fillStyle = `rgba(34, 197, 94, ${(t * 0.9).toFixed(2)})`;
        ctx.fillRect(hx - 1, hy - 3, 2, 6);
        ctx.fillRect(hx - 3, hy - 1, 6, 2);
      }

      ctx.restore();
    }

    this.drawHealth(ctx);
    this.drawAmmo(ctx);
  }

  drawHealth(ctx) {
    if (this.hp <= 0 || this.isBuilding) return;
    const floatY = (this.y - (this.z || 0)) - this.r - 18;
    drawMinionHealthBar(ctx, this.x, floatY, 36, 6, this.hp, this.maxHp);
  }

  drawAmmo(ctx) {
    if (this.isBuilding || this.hp <= 0) return;

    if (this.isReloading) {
      const startY = (this.y - (this.z || 0)) - this.r - 18;
      const progress = 1 - (this.reloadTimer / (CONFIG.Engineer.turretReloadTime || 90));
      const width = CONFIG.Engineer.turretReloadBarWidth || 32;
      const height = CONFIG.Engineer.turretReloadBarHeight || 5;
      const reloadY = startY + 8;
      const startX = this.x - width / 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(startX, reloadY, width, height);

      ctx.fillStyle = '#ff6666';
      ctx.fillRect(startX, reloadY, width * progress, height);

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, reloadY, width, height);
    }
  }

  heal(amount) {
    if (this.hp <= 0) return;
    this.hp += amount;
    if (this.hp > this.maxHp) this.hp = this.maxHp;
    this.healTimer = 20; // Trigger repair visual effect
    spawnFloatingText(this.x, this.y - this.r - 10, `+${Math.round(amount)} HP`, '#00FF00');
  }


}
