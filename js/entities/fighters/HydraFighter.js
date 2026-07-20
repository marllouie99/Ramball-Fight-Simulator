import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { playSound } from '../../systems/soundSystem.js';
import { drawHydraBody } from '../../graphics/fighters/hydraSkin.js';
import { drawHydraGun } from '../../graphics/weapons/hydraWeaponGraphics.js';
import { handleWeaponSteal, performStolenAttack as performStolenAttackLogic } from './hydra/hydraCopyMechanic.js';

export class HydraFighter extends Fighter {
  constructor(def) {
    super(def);
    
    // Weapon Steal mechanic
    this.stolenWeaponType = null;
    this.stolenWeaponTimer = 0;
    this.stolenWeaponMaxTime = 300; // 5 seconds
    
    // Revenge Drive mechanic
    this.revengeMeter = 0;
    this.revengeMax = 100;
    
    // Overdrive (Ultimate)
    this.overdriveActive = false;
    this.overdriveTimer = 0;
    
    // Visuals
    this.textureOffset = 0;
  }

  reset() {
    super.reset();
    this.stolenWeaponType = null;
    this.stolenWeaponTimer = 0;
    this.revengeMeter = 0;
    this.overdriveActive = false;
    this.overdriveTimer = 0;
    this.immuneToCC = false;
    this.attackCooldown = 0;
    this.cooldown = 0;
    this.attackSwingTimer = 0;
    
    // Meter requires taking 90% of max HP in damage to fill
    this.revengeMax = this.maxHp * 0.9;
  }

  takeDamage(amount, attacker, opts = {}) {
    // CC immunity ignores knockbacks, handled in Fighter._tickCooldowns
    // But we also prevent taking hit stun directly in applyHitStun
    
    const tookDamage = super.takeDamage(amount, attacker, opts);
    
    if (tookDamage && amount > 0) {
      // Revenge Drive: fill meter based on exact damage taken (1:1)
      if (!this.overdriveActive) {
        this.revengeMeter = Math.min(this.revengeMax, this.revengeMeter + amount);
        
        // Trigger Massive Counter when full
        if (this.revengeMeter >= this.revengeMax) {
          this.triggerMassiveCounter();
        }
      }
      
      // Weapon Steal: if hit by any attack from an enemy
      if (attacker) {
        this.stealWeapon(attacker);
      }
    }
    
    return tookDamage;
  }
  
  stealWeapon(attacker) {
    handleWeaponSteal(this, attacker);
  }
  
  triggerMassiveCounter() {
    this.revengeMeter = 0;
    spawnFloatingText(this.x, this.y - this.r - 30, 'REVENGE SHOCKWAVE!', '#ff0000');
    triggerGlobalScreenShake(15, 12);
    
    const shockwaveRadius = 200;
    const damage = 50;
    
    // Visual shockwave
    if (!state.sparkEffects) state.sparkEffects = [];
    for (let i = 0; i < 30; i++) {
      spawnSparks(this.x, this.y, 2, 'blood'); // Using blood/red sparks for now
    }
    
    // Damage nearby enemies
    for (const f of state.fighters) {
      if (f && f !== this && f.hp > 0) {
        const dx = f.x - this.x;
        const dy = f.y - this.y;
        if (dx * dx + dy * dy <= shockwaveRadius * shockwaveRadius) {
           f.takeDamage(damage, this, { isMelee: false });
           // Apply massive knockback
           const dist = Math.hypot(dx, dy) || 1;
           f.knockbackVx = (dx / dist) * 15;
           f.knockbackVy = (dy / dist) * 15;
        }
      }
    }
  }

  aim(opponent) {
    if (opponent && this.attackSwingTimer <= 0) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }
  }

  performStolenAttack(opponent) {
    performStolenAttackLogic(this, opponent);
  }

  performBasicBash(opponent) {
    this.attackSwingTimer = 15;
    this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    
    const damage = this.damage * 0.5; // Very low damage base attack
    opponent.takeDamage(damage, this, { isMelee: true });
    
    // Bounce/Lunge forward to the target
    this.vx += Math.cos(this.gunAngle) * 14;
    this.vy += Math.sin(this.gunAngle) * 14;
    
    // IMPACT FRAMES: screen shake and intense visual flash
    triggerGlobalScreenShake(4, 6);
    spawnImpactFlash(opponent.x, opponent.y, 25, 'flesh');
    spawnSparks(opponent.x, opponent.y, 8, 'blood');
    
    spawnFloatingText(opponent.x, opponent.y, 'PUNCH!', '#fff');
    playSound('Assets/Sound Effects/Attacks/fleshhit.mp3', 0.5);
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();
    
    if (this._handleTimeStop()) return;

    this.aim(opponent);

    // Overdrive logic
    if (this.overdriveTimer > 0) {
      this.overdriveTimer--;
      this.speed = this.baseSpeed * 1.5;
      if (this.overdriveTimer === 0) {
        this.overdriveActive = false;
        this.immuneToCC = false;
        spawnFloatingText(this.x, this.y - this.r - 20, 'OVERDRIVE ENDED', '#aaa');
      }
    } else {
      this.speed = this.baseSpeed;
    }

    // Weapon steal timer
    if (this.stolenWeaponTimer > 0) {
      this.stolenWeaponTimer--;
      if (this.stolenWeaponTimer === 0) {
        this.stolenWeaponType = null;
        spawnFloatingText(this.x, this.y - this.r - 10, 'WEAPON LOST', '#aaa');
      } else if (Math.random() < 0.4) {
        // Weapon emits a subtle ghost trail while held
        const wx = this.x + Math.cos(this.gunAngle) * this.r * 1.5;
        const wy = this.y + Math.sin(this.gunAngle) * this.r * 1.5;
        spawnSparks(wx, wy, 1, 'ghostTrail');
      }
    }

    // Passive 1: Endless Regrowth (Cut incoming projectiles)
    this.cutIncomingProjectiles();

    // Ultimate Activation (Overdrive: triggers when HP drops to 10% or below)
    if (!this.overdriveActive && this.cooldown <= 0) {
      if (this.hp <= this.maxHp * 0.10) {
         this.activateOverdrive();
         this.cooldown = 999999; // Only activates once per life when hitting the threshold
      }
    }
    if (this.cooldown > 0) this.cooldown--;
    
    // Basic Attack Logic
    if (opponent && this.attackCooldown <= 0) {
      const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      if (dist < this.r + opponent.r + 30) {
        if (this.stolenWeaponType) {
          this.performStolenAttack(opponent);
        } else {
          this.performBasicBash(opponent);
        }
        this.attackCooldown = 45;
      }
    }
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.attackSwingTimer > 0) this.attackSwingTimer--;

    // Texture animation
    this.textureOffset += 0.5;

    this.applyMovementPhysics();
    this.resolveWallBounce(arena, opponent);
  }
  
  activateOverdrive() {
    this.overdriveActive = true;
    this.immuneToCC = true;
    this.overdriveTimer = 300; // 5 seconds
    spawnFloatingText(this.x, this.y - this.r - 20, 'OVERDRIVE!', '#ff00ff');
    triggerGlobalScreenShake(10, 8);
  }
  
  cutIncomingProjectiles() {
    const range = this.r + 40;
    for (const proj of projectileSystem.projectiles) {
      if (!proj.active || proj.owner === this) continue;
      
      const dx = proj.x - this.x;
      const dy = proj.y - this.y;
      if (dx * dx + dy * dy < range * range) {
        if (Math.random() < 0.05) { // 5% chance per frame while in range to cut it
          proj.active = false; // destroy projectile
          spawnSparks(proj.x, proj.y, 5, 'flash');
          spawnFloatingText(proj.x, proj.y, 'CUT!', '#fff');
        }
      }
    }
  }
  
  performStolenAttack(opponent) {
    this.attackSwingTimer = 15;
    this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    
    const damage = this.damage * 2; // Deal some damage with the stolen weapon
    opponent.takeDamage(damage, this, { isMelee: true });
    
    // Tiny dash forward
    this.vx += Math.cos(this.gunAngle) * 3;
    this.vy += Math.sin(this.gunAngle) * 3;
    
    spawnFloatingText(opponent.x, opponent.y, 'SMACK!', '#ccc');
    playSound('Assets/Sound Effects/Attacks/swordclash.mp3', 0.5);
  }

  drawBody(ctx) {
    drawHydraBody(ctx, this);
  }

  drawGun(ctx) {
    drawHydraGun(ctx, this);
  }

  drawHealth(ctx) {
    super.drawHealth(ctx);
    
    // Draw Revenge Meter
    if (this.revengeMeter > 0 && !this.overdriveActive && !this._isWinnerReveal) {
       const barWidth = 40;
       const barHeight = 4;
       const barX = this.x - barWidth / 2;
       const barY = this.y + this.r + 12;
       
       ctx.fillStyle = '#333';
       ctx.fillRect(barX, barY, barWidth, barHeight);
       
       ctx.fillStyle = '#ff0000';
       ctx.fillRect(barX, barY, barWidth * (this.revengeMeter / this.revengeMax), barHeight);
    }
  }
}
