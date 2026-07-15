import { Fighter } from './fighter.js';
import { CONFIG } from '../core/config.js';
import { projectileSystem } from '../systems/projectileSystem.js';
import { spawnFloatingText, state } from '../core/state.js';
import { playSound } from '../systems/soundSystem.js';
import { getBasicAttackSound } from '../soundEffects/basicAttackSounds.js';
import { drawTurret } from '../graphics/weaponVisuals.js';
import { spawnSparks } from '../graphics/particles/sparkEffect.js';
import { spawnDeathShatter, spawnMachineCorpse } from '../graphics/particles/deathShatterEffect.js';

export class TurretEntity extends Fighter {
  constructor(x, y, ownerFighter) {
    // Create a dummy definition for the Turret
    const def = {
      id: 999,
      name: 'Turret',
      color: '#8B4513', // Brown/Metallic color
      startX: x,
      startY: y,
      startVx: 0,
      startVy: 0,
      radius: 18,
      type: 'Turret',
      hp: CONFIG.Engineer.turretHp,
      damage: CONFIG.Engineer.turretDamage,
      cooldown: CONFIG.Engineer.turretFireRate,
      moveSpeed: 0,
      spinRate: 0.05,
    };
    super(def);
    
    this.owner = ownerFighter;
    this.isTurret = true;
    this.healCooldownTimer = 0;
    this.recoilTimer = 0;
    this.hitFlashTimer = 0;
    this.healTimer = 0;
    this.smokeParticles = [];
    
    // Ammo system
    this.ammo = CONFIG.Engineer.turretAmmo;
    this.maxAmmo = CONFIG.Engineer.turretAmmo;
    this.reloadTimer = 0;
    this.isReloading = false;
  }

  // Override to make turret immune to knockback physics
  applyKnockback(vx, vy) {
    this.knockbackVx = 0;
    this.knockbackVy = 0;
  }

  takeDamage(amount, attacker, opts = {}) {
    // Invulnerable while still being built
    if (this.isBuilding) return false;
    // Turrets are immune to poison damage
    if (opts.isPoison) return false;
    
    const applied = super.takeDamage(amount, attacker, opts);
    if (applied && this.hp > 0) {
      this.hitFlashTimer = 10;
    }
    return applied;
  }
  
  applyPoison(attacker) {
    // Override to do nothing, turrets are machines
  }

  onDeath() {
    // Distinct "machine broke" animation: corpse on ground + sparks
    spawnMachineCorpse(this.x, this.y, this.gunAngle);
    for (let i = 0; i < 4; i++) {
      spawnSparks(this.x, this.y, 8, 'orange');
    }
  }

  heal(amount) {
    if (this.hp <= 0) return;
    this.hp = Math.min(this.hp + amount, this.maxHp);
    this.healTimer = 20; // Triggers repair visual effect
  }

  update(opponent, ownerIndex, arena) {
    if (this.hp <= 0) return;

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

    if (this._handleTimeStop()) {
      return; // Freeze! No moving, aiming, or shooting
    }

    const oldX = this.x;
    const oldY = this.y;
    
    // Apply blackhole velocity and friction
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.8;
    this.vy *= 0.8;

    // Absolute position lock to prevent ANY physics pushes
    if (Math.abs(this.vx) < 0.1 && Math.abs(this.vy) < 0.1) {
      if (this._fixedX === undefined) {
        this._fixedX = this.x;
        this._fixedY = this.y;
      } else {
        this.x = this._fixedX;
        this.y = this._fixedY;
      }
    } else {
      // It's moving via blackhole, update the fixed anchor point
      this._fixedX = this.x;
      this._fixedY = this.y;
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
      }
    }

    // Check for nearby opponent to shoot
    let target = null;
    let minDist = Infinity;
    
    if (state) {
      // Find the team of the owner to avoid shooting teammates
      const ownerTeam = state.mode === '2v2' ? state.getFighterTeam(state.fighters.indexOf(this.owner)) : null;
      const myOwnerIndex = state.fighters.indexOf(this.owner);

      const evaluateTarget = (f) => {
        if (!f || f === this || f === this.owner || f.hp <= 0) return;
        
        // Skip stealthed targets (if property exists and is > 0)
        if (f.invincibilityTimer > 0 || f.flashStepTimer > 0) return;

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
    const rangeSq = CONFIG.Engineer.turretRange * CONFIG.Engineer.turretRange;
    if (target && minDist <= rangeSq) {
      const isAimed = this.aimAt(target.x, target.y);
      if (isAimed && this.shootCooldown <= 0 && !this.isReloading && this.ammo > 0) {
        this.shootAtTarget(target);
      }
    } else {
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

    const speed = CONFIG.Engineer.turretBulletSpeed;

    // Calculate exact spawn positions from both barrel clusters
    const s = this.r / 20;
    const muzzleX = 38 * s; // barrelStartX(18) + barrelLen(20)
    const upperY = -5 * s;  // upper barrel cluster (barrelSpacing)
    const lowerY = 5 * s;   // lower barrel cluster

    const cosA = Math.cos(this.gunAngle);
    const sinA = Math.sin(this.gunAngle);

    // Upper barrel projectile
    const spawnX1 = this.x + muzzleX * cosA - upperY * sinA;
    const spawnY1 = this.y + muzzleX * sinA + upperY * cosA;
    projectileSystem.fireProjectile(this, ownerIndex, this.damage, false, speed, false, 'gunslingerBullet', spawnX1, spawnY1, this.gunAngle);

    // Lower barrel projectile
    const spawnX2 = this.x + muzzleX * cosA - lowerY * sinA;
    const spawnY2 = this.y + muzzleX * sinA + lowerY * cosA;
    projectileSystem.fireProjectile(this, ownerIndex, this.damage, false, speed, false, 'gunslingerBullet', spawnX2, spawnY2, this.gunAngle);
    
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

    this.shootCooldown = this.shootCooldownMax;
    this.recoilTimer = 10; // Add recoil animation timer
    
    // Consume ammo — trigger reload when magazine is empty
    this.ammo--;
    if (this.ammo <= 0) {
      this.isReloading = true;
      this.reloadTimer = CONFIG.Engineer.turretReloadTime;
      spawnFloatingText(this.x, this.y - this.r - 20, 'RELOADING...', '#ff3333');
    }
    
    // Turret loses HP based on its damage when it shoots
    this.hp -= this.damage;
    if (this.hp <= 0) {
      this.hp = 0;
      if (this.onDeath) this.onDeath();
    }
    
    // Play sound
    const sound = getBasicAttackSound(this.owner._def.id, 'aimbot'); // Reusing aimbot sound for turret
    if (sound) {
      playSound(sound.src, sound.volume * 0.7);
      this._attackSoundTimer = sound.delay;
      this._attackSoundConfig = sound;
    }
  }
  
  draw(ctx) {
    if (this.hp <= 0) return;
    
    drawTurret(ctx, this);

    // Draw smoke particles
    if (this.smokeParticles && this.smokeParticles.length > 0) {
      for (const p of this.smokeParticles) {
        let alpha, fillStyle;
        if (p.isDark) {
          // Thick black/dark grey smoke for overheating
          alpha = Math.max(0, p.life / p.maxLife) * 0.75;
          fillStyle = `rgba(40, 40, 40, ${alpha})`;
        } else {
          // Standard grey smoke for shooting, made more opaque to contrast with white background
          alpha = Math.max(0, p.life / p.maxLife) * 0.6;
          fillStyle = `rgba(130, 130, 130, ${alpha})`;
        }
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Heal/repair visual effect
    if (this.healTimer > 0) {
      const t = this.healTimer / 20; // 0..1
      ctx.save();
      ctx.translate(this.x, this.y);

      // Expanding green pulse ring
      ctx.beginPath();
      ctx.arc(0, 0, this.r * (2.5 - t * 1.2), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 80, ${t * 0.7})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner green glow
      ctx.beginPath();
      ctx.arc(0, 0, this.r * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 80, ${t * 0.2})`;
      ctx.fill();

      // Rotating wrench sparks
      const sparkCount = 6;
      const baseAngle = (1 - t) * Math.PI * 3; // spin as it fades
      ctx.fillStyle = `rgba(100, 255, 100, ${t})`;
      for (let i = 0; i < sparkCount; i++) {
        const a = baseAngle + (i / sparkCount) * Math.PI * 2;
        const dist = this.r * (1.0 + (1 - t) * 0.8);
        const sx = Math.cos(a) * dist;
        const sy = Math.sin(a) * dist;
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }

      ctx.restore();
    }

    this.drawHealth(ctx);
    this.drawAmmo(ctx);
  }

  drawAmmo(ctx) {
    if (this.isBuilding) return;

    const startY = this.y - this.r - (CONFIG.Engineer.turretAmmoBarOffsetY || 25);
    
    if (this.isReloading) {
      const progress = 1 - (this.reloadTimer / CONFIG.Engineer.turretReloadTime);
      const width = CONFIG.Engineer.turretReloadBarWidth || 30;
      const height = CONFIG.Engineer.turretReloadBarHeight || 5;
      const startX = this.x - width / 2;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(startX, startY, width, height);
      
      ctx.fillStyle = '#ff6666';
      ctx.fillRect(startX, startY, width * progress, height);
      
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, startY, width, height);
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
