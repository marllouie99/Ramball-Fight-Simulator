import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { spawnSpentCasing } from '../../graphics/particles/johnWickDroppedMagazine.js';
import { TurretEntity } from '../TurretEntity.js';
import { DispenserEntity } from '../DispenserEntity.js';
import { drawEngineer } from '../../graphics/weaponVisuals.js';

export class EngineerFighter extends Fighter {
  constructor(def) {
    super(def);
    this.skillCooldown = 0;
    this.shotgunCooldown = 0;
    this.wrenchCooldown = 0;
    this.dispenserCooldown = CONFIG.Engineer?.dispenserCooldown || 300;
    
    this.wrenchActive = false;
    this.wrenchTimer = 0;
    this.wrenchAngle = 0;
    this.wrenchSlashFadeTimer = 0;
    
    this.turretEntity = null; // Reference to active turret
    this.dispenserEntity = null; // Reference to active dispenser
    
    this.isBuildingTurret = false;
    this.isBuildingDispenser = false;
    this.buildTimer = 0;
    this.dispenserBuildTimer = 0;
    this.sentryBuildLevel = 1;
  }

  reset() {
    super.reset();
    this.skillCooldown = 0;
    this.shotgunCooldown = 0;
    this.wrenchCooldown = 0;
    this.dispenserCooldown = CONFIG.Engineer?.dispenserCooldown || 300;
    this.wrenchActive = false;
    this.wrenchTimer = 0;
    this.wrenchAngle = 0;
    this.wrenchSlashFadeTimer = 0;
    
    // Destroy turret on reset
    if (this.turretEntity && state && state.fighters) {
      const idx = state.fighters.indexOf(this.turretEntity);
      if (idx !== -1) {
        state.fighters.splice(idx, 1);
      }
    }
    this.turretEntity = null;

    // Destroy dispenser on reset
    if (this.dispenserEntity && state && state.fighters) {
      const dIdx = state.fighters.indexOf(this.dispenserEntity);
      if (dIdx !== -1) {
        state.fighters.splice(dIdx, 1);
      }
    }
    this.dispenserEntity = null;

    this.isBuildingTurret = false;
    this.isBuildingDispenser = false;
    this.buildTimer = 0;
    this.dispenserBuildTimer = 0;
    this.sentryBuildLevel = 1;
    this.shotgunRecoilTimer = 0;
    this._shotgunShellEjected = false;
    this.lastWeaponUsed = 'shotgun'; // 'shotgun' or 'wrench'
  }

  update(opponent, ownerIndex, arena) {
    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

    // Cancel building if incapacitated (lifted, stunned, or time-stopped)
    if (this.isBuildingTurret && (this.z > 0 || this.electricStunTimer > 0 || this.stunTimer > 0 || this.timeStopTimer > 0)) {
      this.isBuildingTurret = false;
      if (this.turretEntity && state && state.fighters) {
        const idx = state.fighters.indexOf(this.turretEntity);
        if (idx !== -1) {
          state.fighters.splice(idx, 1);
        }
      }
      this.turretEntity = null;
      this.skillCooldown = CONFIG.Engineer.skillCooldown;
    }

    if (this.isBuildingDispenser && (this.z > 0 || this.electricStunTimer > 0 || this.stunTimer > 0 || this.timeStopTimer > 0)) {
      this.isBuildingDispenser = false;
      if (this.dispenserEntity && state && state.fighters) {
        const idx = state.fighters.indexOf(this.dispenserEntity);
        if (idx !== -1) {
          state.fighters.splice(idx, 1);
        }
      }
      this.dispenserEntity = null;
      this.dispenserCooldown = CONFIG.Engineer?.dispenserCooldown || 300;
    }

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    // Check if turret is dead or removed from arena
    if (this.turretEntity && (this.turretEntity.hp <= 0 || (state.fighters && !state.fighters.includes(this.turretEntity)))) {
      this.turretEntity = null;
      this.skillCooldown = CONFIG.Engineer?.skillCooldown || 500;
    }

    // Check if dispenser is dead or removed from arena
    if (this.dispenserEntity && (this.dispenserEntity.hp <= 0 || (state.fighters && !state.fighters.includes(this.dispenserEntity)))) {
      this.dispenserEntity = null;
      this.dispenserCooldown = CONFIG.Engineer?.dispenserCooldown || 300;
    }

    const hasLiveTurret = Boolean(
      (this.turretEntity && this.turretEntity.hp > 0 && (!state.fighters || state.fighters.includes(this.turretEntity))) ||
      this.isBuildingTurret
    );

    const hasLiveDispenser = Boolean(
      (this.dispenserEntity && this.dispenserEntity.hp > 0 && (!state.fighters || state.fighters.includes(this.dispenserEntity))) ||
      this.isBuildingDispenser
    );

    // Cooldown ticks
    if (this.shotgunCooldown > 0) this.shotgunCooldown--;
    if (this.wrenchCooldown > 0) this.wrenchCooldown--;
    
    // Only tick Sentry cooldown when Sentry is DESTROYED / not alive
    if (!hasLiveTurret) {
      if (this.skillCooldown > 0) this.skillCooldown--;
    } else {
      this.skillCooldown = CONFIG.Engineer?.skillCooldown || 500;
    }

    // Only tick Dispenser cooldown when Dispenser is DESTROYED / not alive
    if (!hasLiveDispenser) {
      if (this.dispenserCooldown > 0) this.dispenserCooldown--;
    } else {
      this.dispenserCooldown = CONFIG.Engineer?.dispenserCooldown || 300;
    }
    
    // Wrench visual timer
    if (this.wrenchActive) {
      this.wrenchTimer--;
      if (this.wrenchTimer <= 0) {
        this.wrenchActive = false;
        this.wrenchSlashFadeTimer = 12; // Start the fadeout effect
      }
    }
    if (this.wrenchSlashFadeTimer > 0) {
      this.wrenchSlashFadeTimer--;
    }
    
    if (this.shotgunRecoilTimer > 0) {
      this.shotgunRecoilTimer--;
      // At pump slide-back phase (~frame 18 out of 28), eject spent 12-gauge shell and trigger pump sound
      if (this.shotgunRecoilTimer === 18 && !this._shotgunShellEjected) {
        this._shotgunShellEjected = true;
        spawnSpentCasing(this.x, this.y, this.gunAngle, '12gauge', this.r);
        const cfg = CONFIG.Engineer || {};
        const rackSfx = cfg.sounds?.shotgunCrack || 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3';
        const rackVol = cfg.soundVolumes?.shotgunCrack ?? 0.85;
        audioSystem.playSFX(rackSfx, rackVol);

        // Small chamber sparks at ejection port
        const facingLeft = Math.abs(this.gunAngle) > Math.PI / 2;
        const cosA = Math.cos(this.gunAngle);
        const sinA = Math.sin(this.gunAngle);
        const perpX = -sinA;
        const perpY = cosA;
        const chX = this.x + cosA * (this.r + 14) + perpX * (facingLeft ? 5 : -5);
        const chY = this.y + sinA * (this.r + 14) + perpY * (facingLeft ? 5 : -5);
        spawnSparks(chX, chY, 4, 'gold');
      }
    }

    // -- 1. SKILL: DEPLOY TURRET (Disabled in demo mode) --
    if (!this.isDemoFighter && this.skillCooldown <= 0 && !this.isBuildingTurret && !this.turretEntity) {
      this.isBuildingTurret = true;
      this.skillCooldown = CONFIG.Engineer?.skillCooldown || 500;
      this.buildTimer = CONFIG.Engineer?.turretBuildTime || 90;
      
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

      const currentLvl = this.sentryBuildLevel || 1;
      const turret = new TurretEntity(spawnX, spawnY, this, currentLvl);
      turret.isBuilding = true;
      turret.buildProgress = 0;
      
      // Increment next build level (cap at 3)
      this.sentryBuildLevel = Math.min(3, currentLvl + 1);
      
      if (state && state.fighters) {
        state.fighters.push(turret);
      }
      this.turretEntity = turret;
      
      const sound = getSkillSound(this._def?.id, 'deploy');
      if (sound) audioSystem.playSFX(sound.src, sound.volume);
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
      
      // Hammering animation loop with welding sparks
      if (this.buildTimer % 15 === 0) {
        this.wrenchActive = true;
        this.lastWeaponUsed = 'wrench';
        this.wrenchTimer = CONFIG.Engineer?.wrenchSwipeDuration || 16;
        this.wrenchAngle = this.gunAngle;
        
        if (this.turretEntity) {
          spawnSparks(this.turretEntity.x, this.turretEntity.y, 6, 'gold');
          spawnSparks(this.turretEntity.x, this.turretEntity.y, 4, 'silverStreak');
        }
        
        const buildSound = getSkillSound(this._def?.id, 'build');
        if (buildSound) audioSystem.playSFX(buildSound.src, buildSound.volume);
        
        triggerGlobalScreenShake(4, 5);
      }
      
      if (this.buildTimer <= 0) {
        this.isBuildingTurret = false;
        this.skillCooldown = CONFIG.Engineer.skillCooldown;
        
        if (this.turretEntity) {
          this.turretEntity.isBuilding = false;
          this.turretEntity.buildProgress = 1;
          const lvl = this.turretEntity.level || 1;
          const badgeColor = (lvl === 3) ? '#EF4444' : ((lvl === 2) ? '#F59E0B' : '#10B981');
          spawnFloatingText(this.turretEntity.x, this.turretEntity.y - 20, `SENTRY LVL ${lvl} READY!`, badgeColor);
          triggerGlobalScreenShake(15, 12);
        }
      }
      return; // Skip normal steering/attacking while building
    }

    // -- 2. SECONDARY SKILL: DEPLOY DISPENSER (When Sentry is active) --
    if (!this.isDemoFighter && !this.isBuildingTurret && !this.isBuildingDispenser &&
        this.turretEntity && this.turretEntity.hp > 0 && !this.dispenserEntity && this.dispenserCooldown <= 0) {
      this.isBuildingDispenser = true;
      this.dispenserBuildTimer = CONFIG.Engineer?.dispenserBuildTime || 110;

      // Position dispenser at an offset angle from the turret
      let turretAngle = Math.atan2(this.turretEntity.y - this.y, this.turretEntity.x - this.x);
      let dispenserAngle = turretAngle + Math.PI * 0.75; // Offset 135° to create a tactical base
      const dOffset = CONFIG.Engineer?.dispenserSpawnDistance ?? 45;
      let spawnX = this.x + Math.cos(dispenserAngle) * dOffset;
      let spawnY = this.y + Math.sin(dispenserAngle) * dOffset;

      if (arena) {
        spawnX = Math.max(arena.x + 20, Math.min(arena.x + arena.width - 20, spawnX));
        spawnY = Math.max(arena.y + 20, Math.min(arena.y + arena.height - 20, spawnY));
      }

      if (this.dispenserEntity && state && state.fighters) {
        const idx = state.fighters.indexOf(this.dispenserEntity);
        if (idx !== -1) state.fighters.splice(idx, 1);
      }

      const dispenser = new DispenserEntity(spawnX, spawnY, this);
      dispenser.isBuilding = true;
      dispenser.buildProgress = 0;

      if (state && state.fighters) {
        state.fighters.push(dispenser);
      }
      this.dispenserEntity = dispenser;

      const sound = getSkillSound(this._def?.id, 'deploy');
      if (sound) audioSystem.playSFX(sound.src, sound.volume);
    }

    if (this.isBuildingDispenser) {
      this.dispenserBuildTimer--;
      this.vx = 0;
      this.vy = 0;

      const buildTime = CONFIG.Engineer?.dispenserBuildTime || 110;
      if (this.dispenserEntity) {
        this.dispenserEntity.buildProgress = 1 - (this.dispenserBuildTimer / buildTime);
        this.gunAngle = Math.atan2(this.dispenserEntity.y - this.y, this.dispenserEntity.x - this.x);
      }

      if (this.dispenserBuildTimer % 15 === 0) {
        this.wrenchActive = true;
        this.lastWeaponUsed = 'wrench';
        this.wrenchTimer = CONFIG.Engineer?.wrenchSwipeDuration || 16;
        this.wrenchAngle = this.gunAngle;

        if (this.dispenserEntity) {
          spawnSparks(this.dispenserEntity.x, this.dispenserEntity.y, 6, 'gold');
          spawnSparks(this.dispenserEntity.x, this.dispenserEntity.y, 4, 'green');
        }

        const buildSound = getSkillSound(this._def?.id, 'build');
        if (buildSound) audioSystem.playSFX(buildSound.src, buildSound.volume);

        triggerGlobalScreenShake(4, 5);
      }

      if (this.dispenserBuildTimer <= 0) {
        this.isBuildingDispenser = false;
        this.dispenserCooldown = CONFIG.Engineer?.dispenserCooldown || 300;

        if (this.dispenserEntity) {
          this.dispenserEntity.isBuilding = false;
          this.dispenserEntity.buildProgress = 1;
          spawnFloatingText(this.dispenserEntity.x, this.dispenserEntity.y - 20, "DISPENSER DEPLOYED!", "#00FF88");
          triggerGlobalScreenShake(15, 12);
        }
      }
      return;
    }

    // -- 3. HEAL TURRET & DISPENSER ON BOUNCE (COLLISION) --
    if (this.turretEntity && this.turretEntity.healCooldownTimer <= 0) {
      const distSq = (this.x - this.turretEntity.x) ** 2 + (this.y - this.turretEntity.y) ** 2;
      const combinedR = this.r + this.turretEntity.r;
      if (distSq <= combinedR * combinedR) {
        // Collided with turret, heal it
        this.turretEntity.heal(CONFIG.Engineer.turretHealAmount);
        this.turretEntity.healCooldownTimer = CONFIG.Engineer.turretHealCooldown;
        
        // Visual text on self too
        spawnFloatingText(this.x, this.y - this.r - 5, "REPAIR!", "#00FF88");
        spawnSparks(this.turretEntity.x, this.turretEntity.y, 8, 'green');
        
        const healSound = getSkillSound(this._def?.id, 'repair');
        if (healSound) audioSystem.playSFX(healSound.src, healSound.volume);
      }
    }

    if (this.dispenserEntity && this.dispenserEntity.healCooldownTimer <= 0) {
      const distSq = (this.x - this.dispenserEntity.x) ** 2 + (this.y - this.dispenserEntity.y) ** 2;
      const combinedR = this.r + this.dispenserEntity.r;
      if (distSq <= combinedR * combinedR) {
        this.dispenserEntity.heal(CONFIG.Engineer?.dispenserHealAmount || 30);
        this.dispenserEntity.healCooldownTimer = CONFIG.Engineer?.dispenserHealCooldown || 60;

        spawnFloatingText(this.x, this.y - this.r - 5, "REPAIR!", "#00FF88");
        spawnSparks(this.dispenserEntity.x, this.dispenserEntity.y, 8, 'green');

        const healSound = getSkillSound(this._def?.id, 'repair');
        if (healSound) audioSystem.playSFX(healSound.src, healSound.volume);
      }
    }

    // -- 3. DISTANCE-BASED BASIC ATTACK --
    if (opponent) {
      const distSq = (opponent.x - this.x) ** 2 + (opponent.y - this.y) ** 2;
      const dist = Math.sqrt(distSq);
      
      this.aim(opponent);
      
      if (dist <= (CONFIG.Engineer.wrenchRange || 85)) {
        // Close range: Wrench Strike
        if (this.wrenchCooldown <= 0) {
          this._executeWrenchStrike(opponent, arena);
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
    // If stationary and not currently constructing turret, recover velocity towards opponent or arena center
    if (!this.isBuildingTurret && this.vx === 0 && this.vy === 0) {
      let recoverAngle;
      if (opponent && opponent.hp > 0) {
        recoverAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      } else if (arena) {
        recoverAngle = Math.atan2(arena.y + arena.height / 2 - this.y, arena.x + arena.width / 2 - this.x);
      } else {
        recoverAngle = this.gunAngle || this.angle || (Math.random() * Math.PI * 2);
      }
      recoverAngle += (Math.random() - 0.5) * 0.4;
      this.vx = Math.cos(recoverAngle) * this.speed;
      this.vy = Math.sin(recoverAngle) * this.speed;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate || 0.05);

    // Bouncing off walls
    this.resolveWallBounce(arena, opponent);
  }

  /**
   * Multi-Target Frontal Arc Cone Melee Strike for Wrench (Rule 7 Standard)
   */
  _executeWrenchStrike(primaryOpponent, arena) {
    const cfg = CONFIG.Engineer || {};
    const reach = (cfg.wrenchRange || 85) + (primaryOpponent?.r || 20);
    const arc = ((cfg.wrenchArcDegrees || 135) * Math.PI) / 180; // Frontal cone
    const facing = this.gunAngle;

    const candidates = [];
    if (state.fighters) {
      for (const f of state.fighters) {
        if (f && f !== this && f.hp > 0 && !this.isTeammate(f) && !f.isTurret && !f.isDispenser) candidates.push(f);
      }
    }
    if (state.illusions) {
      const myIdx = state.fighters ? state.fighters.indexOf(this) : -1;
      for (const ill of state.illusions) {
        if (ill && ill.hp > 0 && ill.owner !== myIdx && !this.isTeammate(ill.owner)) candidates.push(ill);
      }
    }

    let hitAny = false;
    for (const target of candidates) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= reach) {
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - facing;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        if (Math.abs(diff) <= arc / 2) {
          // Gojo Limitless Infinity Barrier Check
          const isTargetGojoInfinity = (target.characterId === 'gojo' || target.type === 'gojo' || target._def?.id === 'gojo') &&
            (target.infinityCooldown <= 0 || target.domainActive || !target.isMeleeMode);

          if (isTargetGojoInfinity) {
            if (typeof target.triggerInfinityBlock === 'function') {
              target.triggerInfinityBlock(this.x, this.y, this);
            }
            this.vx = -Math.cos(facing) * 12;
            this.vy = -Math.sin(facing) * 12;
            spawnSparks(target.x, target.y, 12, 'cyan', '#00E5FF');
            spawnImpactFlash(target.x, target.y, 28, 'layla');
            audioSystem.playSFX('Assets/Sound Effects/Skills/parry.mp3', 0.85);
            spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 12, 'BLOCKED!', '#00E5FF');
            continue;
          }

          // 1. Deal Melee Wrench Damage
          const dmg = cfg.wrenchDamage || 15;
          applyDamageToTarget(target, dmg, this, { isMelee: true, isBasicAttack: true });

          // 2. Physical Knockback Impulse & Hit-Stun
          const pushForce = cfg.wrenchPushForce || 12;
          target.vx = (target.vx || 0) + Math.cos(facing) * (pushForce * 0.55);
          target.vy = (target.vy || 0) + Math.sin(facing) * (pushForce * 0.55);
          if (typeof target.applyHitStun === 'function') target.applyHitStun(cfg.wrenchHitStunDuration || 8);

          // 3. Audio & Visual Impact (Industrial Welding Sparks + Metallic Flash + Blood)
          spawnFloatingText(target.x, (target.y - (target.z || 0)) - target.r - 10, 'WHACK!', '#FFD700');
          spawnSparks(target.x, target.y, 10, 'gold');
          spawnSparks(target.x, target.y, 8, 'silverStreak');
          spawnImpactFlash(target.x, target.y, 32, 'rgba(255, 200, 50, 0.85)');
          spawnBloodEffect(target, 10, facing, { minSize: 2.5, maxSize: 5.0, count: 4 });

          hitAny = true;
        }
      }
    }

    this.wrenchActive = true;
    this.lastWeaponUsed = 'wrench';
    this.wrenchTimer = cfg.wrenchSwipeDuration || 16;
    this.wrenchAngle = facing;
    this.wrenchCooldown = cfg.wrenchCooldown || 30;

    const swingSfx = cfg.sounds?.wrenchSwing || 'Assets/Sound Effects/Attacks/swordswing.mp3';
    const swingVol = cfg.soundVolumes?.wrenchSwing ?? 0.90;
    audioSystem.playSFX(swingSfx, swingVol);

    triggerGlobalScreenShake(8, 8);
  }
  
  _fireShotgun() {
    if (!projectileSystem) return;

    const cfg = CONFIG.Engineer || {};
    const pellets = cfg.shotgunPellets || 8;
    const spread = cfg.shotgunSpread || 0.45;
    const damage = cfg.shotgunDamage || 5.20;
    const baseSpeed = cfg.shotgunSpeed || 30;
    const muzzleOffset = cfg.shotgunMuzzleOffset || 62;
    const recoilForce = cfg.shotgunRecoilForce || 3.5;
    const recoilDuration = cfg.shotgunRecoilDuration || 15;
    
    // Muzzle position at the tip of the scaled shotgun
    const muzzleX = this.x + Math.cos(this.gunAngle) * (this.r + muzzleOffset);
    const muzzleY = this.y + Math.sin(this.gunAngle) * (this.r + muzzleOffset);

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
    
    triggerGlobalScreenShake(12, 10);

    // Muzzle Flash & Smoke
    spawnSparks(muzzleX, muzzleY, 8, 'orange');
    spawnSparks(muzzleX, muzzleY, 5, 'gray');

    const shotSfx = cfg.sounds?.shotgunShot || 'Assets/Sound Effects/Attacks/shootgunshot.mp3';
    const shotVol = cfg.soundVolumes?.shotgunShot ?? 0.95;
    audioSystem.playSFX(shotSfx, shotVol);
    
    this.shotgunCooldown = cfg.shotgunCooldown || 80;
    this.shotgunRecoilTimer = cfg.shotgunRecoilDuration || 28;
    this._shotgunShellEjected = false;
    
    // Heavy Pushback / Recoil
    this.vx -= Math.cos(this.gunAngle) * recoilForce;
    this.vy -= Math.sin(this.gunAngle) * recoilForce;
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
      gunAngle: this._isWinnerReveal ? 0 : this.gunAngle,
      r: this.r,
      facingRight: this._isWinnerReveal ? true : Math.abs(this.gunAngle) < Math.PI / 2,
      wrenchActive: this.wrenchActive,
      wrenchTimer: this.wrenchTimer,
      wrenchAngle: this.wrenchAngle,
      wrenchSlashFadeTimer: this.wrenchSlashFadeTimer || 0,
      shotgunRecoilTimer: this.shotgunRecoilTimer || 0,
      lastWeaponUsed: this.lastWeaponUsed || 'shotgun',
      color: this.color,
      hideHands: this.hideFrontHand || this.hideHands,
      isWinnerReveal: Boolean(this._isWinnerReveal)
    });
    
    if (this.isBuildingTurret || this.isBuildingDispenser) {
      const barWidth = 40;
      const barHeight = 6;
      const buildTime = this.isBuildingTurret
        ? (CONFIG.Engineer?.turretBuildTime || 90)
        : (CONFIG.Engineer?.dispenserBuildTime || 110);
      const curTimer = this.isBuildingTurret ? this.buildTimer : this.dispenserBuildTimer;
      const progress = 1 - (curTimer / buildTime);
      const barColor = this.isBuildingTurret ? '#ffcc00' : '#00FF88';
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(this.x - barWidth / 2, this.y - this.r - 20, barWidth, barHeight);
      
      ctx.fillStyle = barColor;
      ctx.fillRect(this.x - barWidth / 2, this.y - this.r - 20, barWidth * progress, barHeight);
      
      // Add a small border
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x - barWidth / 2, this.y - this.r - 20, barWidth, barHeight);
    }
  }
}
