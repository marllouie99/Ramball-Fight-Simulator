import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText } from '../../core/state.js';
import { playSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { TurretEntity } from '../TurretEntity.js';
import { drawEngineer } from '../../graphics/weaponVisuals.js';

export class EngineerFighter extends Fighter {
  constructor(def) {
    super(def);
    this.skillCooldown = 0;
    this.shotgunCooldown = 0;
    this.wrenchCooldown = 0;
    
    this.wrenchActive = false;
    this.wrenchTimer = 0;
    this.wrenchAngle = 0;
    
    this.turretEntity = null; // Reference to active turret
    
    this.isBuildingTurret = false;
    this.buildTimer = 0;
  }

  reset() {
    super.reset();
    this.skillCooldown = 0;
    this.shotgunCooldown = 0;
    this.wrenchCooldown = 0;
    this.wrenchActive = false;
    this.wrenchTimer = 0;
    this.wrenchAngle = 0;
    
    // Destroy turret on reset
    if (this.turretEntity && state && state.fighters) {
      const idx = state.fighters.indexOf(this.turretEntity);
      if (idx !== -1) {
        state.fighters.splice(idx, 1);
      }
    }
    this.turretEntity = null;
    this.isBuildingTurret = false;
    this.buildTimer = 0;
    this.shotgunRecoilTimer = 0;
    this.lastWeaponUsed = 'shotgun'; // 'shotgun' or 'wrench'
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
    if (this.shotgunCooldown > 0) this.shotgunCooldown--;
    if (this.wrenchCooldown > 0) this.wrenchCooldown--;
    if (this.skillCooldown > 0) this.skillCooldown--;
    
    // Wrench visual timer
    if (this.wrenchActive) {
      this.wrenchTimer--;
      if (this.wrenchTimer <= 0) {
        this.wrenchActive = false;
      }
    }
    
    if (this.shotgunRecoilTimer > 0) {
      this.shotgunRecoilTimer--;
    }

    // Check if turret is dead or removed
    if (this.turretEntity && (this.turretEntity.hp <= 0 || !state.fighters.includes(this.turretEntity))) {
      this.turretEntity = null;
    }

    // -- 1. SKILL: DEPLOY TURRET --
    if (this.skillCooldown <= 0 && !this.isBuildingTurret && !this.turretEntity) {
      this.isBuildingTurret = true;
      this.buildTimer = CONFIG.Engineer.turretBuildTime || 90;
      
      // Direction to build the turret
      let spawnAngle = this.gunAngle;
      if (opponent) {
        spawnAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      }
      
      const offset = CONFIG.Engineer.turretSpawnDistance ?? -40;
      let spawnX = this.x + Math.cos(spawnAngle) * offset;
      let spawnY = this.y + Math.sin(spawnAngle) * offset;

      // Ensure turret stays fully within arena limits, accounting for its radius (approx 20)
      if (arena) {
        spawnX = Math.max(arena.x + 20, Math.min(arena.x + arena.width - 20, spawnX));
        spawnY = Math.max(arena.y + 20, Math.min(arena.y + arena.height - 20, spawnY));
      }

      // Destroy old turret if exists
      if (this.turretEntity && state && state.fighters) {
        const idx = state.fighters.indexOf(this.turretEntity);
        if (idx !== -1) {
          state.fighters.splice(idx, 1);
        }
      }

      const turret = new TurretEntity(spawnX, spawnY, this);
      turret.isBuilding = true;
      turret.buildProgress = 0;
      
      if (state && state.fighters) {
        state.fighters.push(turret);
      }
      this.turretEntity = turret;
      
      const sound = getSkillSound(this._def?.id, 'deploy');
      if (sound) playSound(sound.src, sound.volume);
    }

    if (this.isBuildingTurret) {
      this.buildTimer--;
      this.vx = 0;
      this.vy = 0;
      
      const buildTime = CONFIG.Engineer.turretBuildTime || 90;
      if (this.turretEntity) {
        this.turretEntity.buildProgress = 1 - (this.buildTimer / buildTime);
      }
      
      // Aim at the turret we are building
      if (this.turretEntity) {
        this.gunAngle = Math.atan2(this.turretEntity.y - this.y, this.turretEntity.x - this.x);
      }
      
      // Hammering animation loop
      if (this.buildTimer % 15 === 0) {
        this.wrenchActive = true;
        this.lastWeaponUsed = 'wrench';
        this.wrenchTimer = CONFIG.Engineer.wrenchSwipeDuration || 10;
        this.wrenchAngle = this.gunAngle;
        
        const buildSound = getSkillSound(this._def?.id, 'build');
        if (buildSound) playSound(buildSound.src, buildSound.volume);
      }
      
      if (this.buildTimer <= 0) {
        this.isBuildingTurret = false;
        this.skillCooldown = CONFIG.Engineer.skillCooldown;
        
        if (this.turretEntity) {
          this.turretEntity.isBuilding = false;
          this.turretEntity.buildProgress = 1;
          spawnFloatingText(this.turretEntity.x, this.turretEntity.y - 20, "DEPLOYED!", "#8B4513");
        }
      }
      return; // Skip normal steering/attacking while building
    }

    // -- 2. HEAL TURRET ON BOUNCE (COLLISION) --
    if (this.turretEntity && this.turretEntity.healCooldownTimer <= 0) {
      const distSq = (this.x - this.turretEntity.x) ** 2 + (this.y - this.turretEntity.y) ** 2;
      const combinedR = this.r + this.turretEntity.r;
      if (distSq <= combinedR * combinedR) {
        // Collided with turret, heal it
        this.turretEntity.heal(CONFIG.Engineer.turretHealAmount);
        this.turretEntity.healCooldownTimer = CONFIG.Engineer.turretHealCooldown;
        
        // Visual text on self too
        spawnFloatingText(this.x, this.y - this.r - 5, "HEAL!", "#00FF00");
        
        const healSound = getSkillSound(this._def?.id, 'repair');
        if (healSound) playSound(healSound.src, healSound.volume);
      }
    }

    // -- 3. DISTANCE-BASED BASIC ATTACK --
    if (opponent) {
      const distSq = (opponent.x - this.x) ** 2 + (opponent.y - this.y) ** 2;
      const dist = Math.sqrt(distSq);
      
      this.aim(opponent);
      
      if (dist <= CONFIG.Engineer.wrenchRange) {
        // Close range: Wrench
        if (this.wrenchCooldown <= 0) {
          this.wrenchActive = true;
          this.lastWeaponUsed = 'wrench';
          this.wrenchTimer = CONFIG.Engineer.wrenchSwipeDuration;
          this.wrenchAngle = this.gunAngle; // Lock angle for visual swipe
          this.wrenchCooldown = CONFIG.Engineer.wrenchCooldown;
          
          opponent.takeDamage(CONFIG.Engineer.wrenchDamage, this, { isMelee: true });
          spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, 'WHACK!', '#FFD700');
          
          const hitSound = getBasicAttackSound(this._def?.id, 'melee'); // Default melee or specific
          if (hitSound) playSound(hitSound.src, hitSound.volume);
        }
      } else if (dist <= CONFIG.Engineer.shotgunRange) {
        // Range: Shotgun
        if (this.shotgunCooldown <= 0) {
          this.lastWeaponUsed = 'shotgun';
          this._fireShotgun();
        }
      }
    } else {
      this.gunAngle = Math.atan2(this.vy, this.vx);
    }

    // -- 4. MOVEMENT & BOUNCE --
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate || 0.05);

    // Bouncing off walls
    this.resolveWallBounce(arena, opponent);
  }
  
  _fireShotgun() {
    if (!projectileSystem) return;

    // A real shotgun blast: more pellets, randomized spread, varied speeds
    const pellets = CONFIG.Engineer.shotgunPellets || 8;
    const spread = CONFIG.Engineer.shotgunSpread || 0.45;
    const damage = CONFIG.Engineer.shotgunDamage;
    const baseSpeed = CONFIG.Engineer.shotgunSpeed || 14;
    
    // Muzzle position
    const muzzleX = this.x + Math.cos(this.gunAngle) * (this.r + 20);
    const muzzleY = this.y + Math.sin(this.gunAngle) * (this.r + 20);

    // Spawn projectiles in a randomized cone
    for (let i = 0; i < pellets; i++) {
      // Chaotic spread: centered mostly around the middle, with outliers
      const angleVariance = (Math.random() - 0.5) * spread + (Math.random() - 0.5) * (spread * 0.5);
      const pAngle = this.gunAngle + angleVariance;
      
      // Varied speed: some pellets are faster than others
      const speedVariance = baseSpeed * (0.8 + Math.random() * 0.4);
      
      // Calculate individual spawn offset slightly so they don't all perfectly stack
      const spawnX = muzzleX + (Math.random() - 0.5) * 6;
      const spawnY = muzzleY + (Math.random() - 0.5) * 6;
      
      projectileSystem.fireProjectile(this, state.fighters.indexOf(this), damage, false, speedVariance, false, 'EngineerBullet', spawnX, spawnY, pAngle);
    }

    // Muzzle Flash & Smoke
    import('../../graphics/particles/sparkEffect.js').then(module => {
      // Huge fiery burst
      for(let i=0; i<4; i++) {
         module.spawnSparks(muzzleX, muzzleY, 3, 'orange');
      }
      module.spawnSparks(muzzleX, muzzleY, 5, 'gray'); // smoke
    });

    const shotSound = getBasicAttackSound(this._def?.id);
    if (shotSound) playSound(shotSound.src, shotSound.volume);
    this.shotgunCooldown = CONFIG.Engineer.shotgunCooldown;
    this.shotgunRecoilTimer = 15;
    
    // Heavy Pushback / Recoil
    const recoilForce = 3.5; // Punchy recoil
    this.vx -= Math.cos(this.gunAngle) * recoilForce;
    this.vy -= Math.sin(this.gunAngle) * recoilForce;
    
    const sound = getBasicAttackSound(this._def?.id, 'shotgun');
    if (sound) playSound(sound.src, sound.volume);
  }

  aim(opponent) {
    if (opponent) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }
  }

  drawGun(ctx) {
    drawEngineer(ctx, {
      x: this.x,
      y: this.y,
      gunAngle: this.gunAngle,
      r: this.r,
      facingRight: Math.abs(this.gunAngle) < Math.PI / 2,
      wrenchActive: this.wrenchActive,
      wrenchTimer: this.wrenchTimer,
      wrenchAngle: this.wrenchAngle,
      shotgunRecoilTimer: this.shotgunRecoilTimer || 0,
      lastWeaponUsed: this.lastWeaponUsed || 'shotgun'
    });
    
    if (this.isBuildingTurret) {
      const barWidth = 40;
      const barHeight = 6;
      const buildTime = CONFIG.Engineer.turretBuildTime || 90;
      const progress = 1 - (this.buildTimer / buildTime);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(this.x - barWidth / 2, this.y - this.r - 20, barWidth, barHeight);
      
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(this.x - barWidth / 2, this.y - this.r - 20, barWidth * progress, barHeight);
      
      // Add a small border
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x - barWidth / 2, this.y - this.r - 20, barWidth, barHeight);
    }
  }
}
