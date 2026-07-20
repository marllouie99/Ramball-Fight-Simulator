import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, getProjectiles, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { spawnSparks } from '../../graphics/particles/sparkEffect.js';
import { playSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { drawMusashiWeapons, drawMusashiSheaths } from '../../graphics/weapons/musashiWeaponGraphics.js';

export class MusashiFighter extends Fighter {
  constructor(def) {
    super(def);

    this.stances = ['earth', 'water', 'fire', 'wind', 'void'];
    this.stanceIndex = 1; // Start in Water stance (blue neon sword)
    this.stanceTimer = CONFIG.musashi.stanceDurationFrames;
    this.currentStance = this.stances[this.stanceIndex];

    this.attackCooldown = 0;
    this.nitenCooldown = 0;
    this.preemptiveCooldown = 0;
    this.preemptiveActiveTimer = 0;
    
    this.flurryCooldown = 0;
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    
    this.idleTimer = 0;
    this.isSheathed = false;
    
    this.nitenActiveTimer = 0;
    this.isNitenSecondHit = false;

    this.strikeTimer = 0;
    this.strikeTimer = 0;
    this.strikeAngle = 0;
    
    this.voidTimeStopApplied = false;
    this.afterImages = [];
    this.flurrySmokeTimer = 0;
  }

  reset() {
    super.reset();
    if (!this.stances) {
      this.stances = ['earth', 'water', 'fire', 'wind', 'void'];
    }
    this.stanceIndex = 1;
    this.stanceTimer = CONFIG.musashi.stanceDurationFrames;
    this.currentStance = this.stances[this.stanceIndex];
    this.attackCooldown = 0;
    this.nitenCooldown = 0;
    this.preemptiveCooldown = 0;
    this.preemptiveActiveTimer = 0;
    this.flurryCooldown = 0;
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this.idleTimer = 0;
    this.isSheathed = false;
    this.nitenActiveTimer = 0;
    this.strikeTimer = 0;
    this.voidTimeStopApplied = false;
    this.afterImages = [];
    this.slashEffects = [];
    this.flurrySmokeTimer = 0;
  }

  _cycleStance() {
    this.stanceIndex = (this.stanceIndex + 1) % this.stances.length;
    this.currentStance = this.stances[this.stanceIndex];
    this.stanceTimer = CONFIG.musashi.stanceDurationFrames;
    this.voidTimeStopApplied = false;
    
    let color = '#fff';
    if (this.currentStance === 'earth') color = '#a0522d';
    if (this.currentStance === 'water') color = '#1e90ff';
    if (this.currentStance === 'fire') color = '#ff4500';
    if (this.currentStance === 'wind') color = '#3cb371';
    if (this.currentStance === 'void') color = '#8a2be2';
    
    spawnFloatingText(this.x, this.y - this.r - 20, `${this.currentStance.toUpperCase()} STANCE`, color);
  }

  spawnSlash(type, angleOffset, sizeMult = 1.0) {
    if (!this.slashEffects) this.slashEffects = [];
    this.slashEffects.push({
      type: type,
      x: this.x,
      y: this.y,
      angle: (this.strikeAngle || this.gunAngle) + angleOffset,
      timer: 15,
      maxTimer: 15,
      stance: this.currentStance,
      size: (this.r + 25) * sizeMult
    });
    if (this.currentStance === 'void') this.takeDamage(-CONFIG.musashi.voidHealAmount, this);
  }

  interruptAttacks() {
    super.interruptAttacks();
    if (this.stances && this.stanceIndex !== undefined) {
      this.currentStance = this.stances[this.stanceIndex];
    }
  }

  takeDamage(amount, attacker, opts = {}) {
    // Preemptive Strike Active: Negate damage, teleport, and counter
    if (this.preemptiveActiveTimer > 0 && attacker && !opts.isCounter) {
      this.preemptiveActiveTimer = 0;
      spawnFloatingText(this.x, this.y - this.r - 10, 'PREEMPTIVE STRIKE!', '#ff00ff');
      
      const oldX = this.x;
      const oldY = this.y;
      
      // Teleport behind attacker
      const dx = this.x - attacker.x;
      const dy = this.y - attacker.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      this.x = attacker.x - (dx / dist) * (attacker.r + this.r + 15);
      this.y = attacker.y - (dy / dist) * (attacker.r + this.r + 15);
      const dashSound = getSkillSound('musashi', 'dash');
      if (dashSound) playSound(dashSound.src, dashSound.volume);
      
      // Spawn afterimages (closely packed trail)
      if (!this.afterImages) this.afterImages = [];
      const teleportDist = Math.sqrt((this.x - oldX)**2 + (this.y - oldY)**2);
      const numImages = Math.max(5, Math.floor(teleportDist / 12)); // Spawn an afterimage every 12 pixels
      for (let i = 0; i <= numImages; i++) {
        const t = i / numImages;
        this.afterImages.push({
          x: oldX + (this.x - oldX) * t,
          y: oldY + (this.y - oldY) * t,
          gunAngle: this.gunAngle,
          strikeTimer: this.strikeTimer,
          nitenActiveTimer: this.nitenActiveTimer,
          isNitenSecondHit: this.isNitenSecondHit,
          currentStance: this.currentStance,
          isSheathed: this.isSheathed,
          timer: 20
        });
      }
      
      attacker.takeDamage(CONFIG.musashi.preemptiveCounterDamage, this, { isMelee: true, isCounter: true });
      triggerGlobalScreenShake(8, 10);
      spawnSparks(attacker.x, attacker.y, 15, 'flash');
      return false; 
    }

    // Void Stance: 100% dodge chance (unless time stopped or stunned)
    if (this.currentStance === 'void' && !(this.timeStopTimer > 0) && !(this.electricStunTimer > 0)) {
      if (Math.random() < CONFIG.musashi.voidDodgeChance) {
        spawnFloatingText(this.x, this.y - this.r - 5, 'DODGE', '#8a2be2');
        return false;
      }
    }

    // Stance modifiers
    let finalAmount = amount;
    if (this.currentStance === 'earth') {
      finalAmount *= CONFIG.musashi.earthArmorMultiplier;
      spawnFloatingText(this.x, this.y - this.r, 'PARRY', '#a0522d');
    } else if (this.currentStance === 'fire') {
      finalAmount *= CONFIG.musashi.fireDamageTakenMultiplier;
    }

    return super.takeDamage(finalAmount, attacker, opts);
  }

  update(opponent, ownerIndex, arena) {
    this.distToTargetSq = Infinity;
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // Track position history for delayed auto-aim during flurry
    if (!this.posHistory) this.posHistory = [];
    this.posHistory.push({ x: this.x, y: this.y });
    if (this.posHistory.length > 30) this.posHistory.shift();

    if (this._handleTimeStop()) return;

    // Stance timer
    this.stanceTimer--;
    if (this.stanceTimer <= 0) {
      this._cycleStance();
    }

    // Cooldowns
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.nitenCooldown > 0) this.nitenCooldown--;
    if (this.oarCooldown > 0) this.oarCooldown--;
    if (this.preemptiveCooldown > 0) this.preemptiveCooldown--;
    if (this.preemptiveActiveTimer > 0) this.preemptiveActiveTimer--;
    if (this.strikeTimer > 0) this.strikeTimer--;
    if (this.flurryCooldown > 0) this.flurryCooldown--;
    if (this.flurrySmokeTimer > 0) this.flurrySmokeTimer--;
    if (this.dashAnimTimer > 0) this.dashAnimTimer--;

    // Phantom Flurry Execution Logic
    if (this.flurryHitsLeft > 0) {
       this.flurryGhost = this.posHistory[0] || { x: this.x, y: this.y };
       this.vx *= 0.1;
       this.vy *= 0.1;
       
       if (this.flurryTimer > 0) this.flurryTimer--;
       if (this.flurryTimer <= 0) {
         this.flurryHitsLeft--;
         this.flurryTimer = 6; // 6 frames between hits
         
         // Cycle through all 5 stances during the flurry!
         // This causes the weapon auras and the slash effects to change color on every single hit
         if (this.flurryHitsLeft <= 0) {
           // Activate smoke trail and restore real stance when flurry finishes
           this.flurryGhost = null;
           this.flurrySmokeTimer = 150; 
           this.currentStance = this.stances[this.stanceIndex];
         } else {
           const flurryStances = ['earth', 'water', 'fire', 'wind', 'void'];
           this.currentStance = flurryStances[this.flurryHitsLeft % 5];
         }
         
         // Find all valid targets (fighters and illusions) within a large jump radius
         let possibleTargets = state.fighters.filter(f => f && f !== this && f.hp > 0 && Math.hypot(f.x - this.x, f.y - this.y) < 450);
         if (state.illusions) {
           possibleTargets = possibleTargets.concat(state.illusions.filter(ill => ill && ill.hp > 0 && Math.hypot(ill.x - this.x, ill.y - this.y) < 450));
         }
         
         // Randomly pick a new target for every single hit to create an Omnislash effect
         if (possibleTargets.length > 0) {
            this.flurryTarget = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
         }

         if (this.flurryTarget && !this.flurryTarget.isDead) {
            this.strikeAngle = Math.random() * Math.PI * 2;
            
            this.flurryTarget.takeDamage(CONFIG.musashi.flurryDamage, this, {isMelee: true});
            this.flurryTarget.applyHitStun(15);
            
            const isKatana = this.flurryHitsLeft % 2 === 0;
            this.spawnSlash(isKatana ? 'slash_katana' : 'slash_wakizashi', 0, 1.4);
            spawnFloatingText(this.flurryTarget.x, this.flurryTarget.y - 10, 'SLASH!', '#fff');
            
            triggerGlobalScreenShake(6, 6);
            spawnSparks(this.flurryTarget.x, this.flurryTarget.y, 10, 'flash');
            const attackSound = getBasicAttackSound('musashi');
            if (attackSound) playSound(attackSound.src, attackSound.volume);
            
            this.strikeTimer = 10;
            this.gunAngle = this.strikeAngle; // visual weapon update
            
            // Randomly teleport around target for visual flair
            const angle = Math.random() * Math.PI * 2;
            const dist = this.flurryTarget.r + this.r + 10;
            const oldX = this.x;
            const oldY = this.y;
            this.x = this.flurryTarget.x + Math.cos(angle) * dist;
            this.y = this.flurryTarget.y + Math.sin(angle) * dist;
            
            // Spawn afterimages along the teleport path
            if (!this.afterImages) this.afterImages = [];
            const teleportDist = Math.sqrt((this.x - oldX)**2 + (this.y - oldY)**2);
            const numImages = Math.max(3, Math.floor(teleportDist / 12));
            for (let i = 0; i <= numImages; i++) {
              const t = i / numImages;
              this.afterImages.push({
                x: oldX + (this.x - oldX) * t,
                y: oldY + (this.y - oldY) * t,
                timer: 15,
                r: this.r,
                gunAngle: this.gunAngle,
                strikeTimer: 0,
                currentStance: this.currentStance,
                isSheathed: false
              });
            }

            // Dramatic hit pause on both fighters to emphasize the strike
            this.applyTimeStop(6);
            this.flurryTarget.applyTimeStop(6);
         } else {
            this.flurryHitsLeft = 0; // abort if target dies
         }
       }
       
       this.x += this.vx;
       this.y += this.vy;
       this.resolveWallBounce(arena, this.flurryTarget);
       
       // Update visual arrays so slashes still fade during flurry
       if (this.afterImages) {
         for (let i = this.afterImages.length - 1; i >= 0; i--) {
           if (--this.afterImages[i].timer <= 0) this.afterImages.splice(i, 1);
         }
       }
       if (this.slashEffects) {
         for (let i = this.slashEffects.length - 1; i >= 0; i--) {
           if (--this.slashEffects[i].timer <= 0) this.slashEffects.splice(i, 1);
         }
       }
       return; // Skip normal behavior while in flurry
    }

    // Movement speed logic
    let currentSpeed = CONFIG.musashi.baseMoveSpeed;
    if (this.currentStance === 'earth') currentSpeed *= CONFIG.musashi.earthSpeedMultiplier;
    if (this.currentStance === 'water') currentSpeed *= CONFIG.musashi.waterSpeedMultiplier;
    
    // Wind Stance: Deflect projectiles
    if (this.currentStance === 'wind') {
      const projectiles = getProjectiles();
      for (let p of projectiles) {
        if (p.owner !== ownerIndex && p.maxLife > 0) {
          const dx = p.x - this.x;
          const dy = p.y - this.y;
          if (dx * dx + dy * dy < CONFIG.musashi.windDeflectRadius * CONFIG.musashi.windDeflectRadius) {
            p.maxLife = 0; // Destroy projectile
            spawnFloatingText(p.x, p.y, 'DEFLECT', '#3cb371');
          }
        }
      }
    }
    
    // Void Stance: Apply brief time stop to enemy when first entering Void, if close
    if (this.currentStance === 'void' && !this.voidTimeStopApplied && opponent && !opponent.isDead) {
      this.voidTimeStopApplied = true;
      opponent.applyTimeStop(60); // 1 second stop
      spawnFloatingText(opponent.x, opponent.y - 20, 'VOID FREEZE', '#8a2be2');
    }



    // Niten Strike logic
    if (this.nitenActiveTimer > 0) {
      this.nitenActiveTimer--;
      if (this.nitenActiveTimer === 0 && opponent && !opponent.isDead) {
         // Second hit
        this.isNitenSecondHit = true;
        this.strikeTimer = 15;
        this.strikeAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        
        this.spawnSlash('slash_katana', 0, 1.4); // Heavy Katana Slash

        const dx = opponent.x - this.x;
        const dy = opponent.y - this.y;
        if (dx * dx + dy * dy < (CONFIG.musashi.swordRange + this.r + opponent.r + 10) ** 2) {
           opponent.takeDamage(CONFIG.musashi.nitenStrikeDamage * 0.7, this, { isMelee: true });
           opponent.vx += Math.cos(this.strikeAngle) * CONFIG.musashi.nitenStrikeKnockback;
           opponent.vy += Math.sin(this.strikeAngle) * CONFIG.musashi.nitenStrikeKnockback;
           spawnFloatingText(opponent.x, opponent.y - 15, 'NITEN HEAVY!', '#ff0000');
           triggerGlobalScreenShake(12, 10);
           spawnSparks(opponent.x, opponent.y, 20, 'flash');
        }
      }
    }

    // Attack Decision Logic
    let isAttacking = false;
    
    if (opponent && !opponent.isDead) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const distSq = dx * dx + dy * dy;
      this.distToTargetSq = distSq;
      const rangeHit = Math.pow(this.r + opponent.r + CONFIG.musashi.swordRange, 2);

      // Preemptive Strike activation
      if (this.preemptiveCooldown <= 0 && distSq < rangeHit * 4 && Math.random() < 0.05) {
        this.preemptiveActiveTimer = CONFIG.musashi.preemptiveStrikeDuration;
        this.preemptiveCooldown = CONFIG.musashi.preemptiveStrikeCooldown;
        spawnFloatingText(this.x, this.y - this.r - 10, 'COUNTER STANCE', '#a9a9a9');
      }
      
      // Phantom Flurry activation
      if (this.flurryCooldown <= 0 && distSq < rangeHit * 9 && !isAttacking) {
         this.flurryCooldown = CONFIG.musashi.flurryCooldown;
         this.flurryHitsLeft = 5;
         this.flurryTimer = 0;
         this.flurryTarget = opponent;
         
         const dx = opponent.x - this.x;
         const dy = opponent.y - this.y;
         const dist = Math.sqrt(dx*dx + dy*dy) || 1;
         const oldX = this.x;
         const oldY = this.y;
         
         this.flurryGhost = { x: oldX, y: oldY };
         this.x = opponent.x + (dx/dist) * (this.r + opponent.r + 5);
         this.y = opponent.y + (dy/dist) * (this.r + opponent.r + 5);
         this.dashAnimTimer = 15;
         const dashSound = getSkillSound('musashi', 'dash');
         if (dashSound) playSound(dashSound.src, dashSound.volume);
         
         if (!this.afterImages) this.afterImages = [];
         const teleportDist = Math.sqrt((this.x - oldX)**2 + (this.y - oldY)**2);
         const numImages = Math.max(5, Math.floor(teleportDist / 12));
         for (let i = 0; i <= numImages; i++) {
           const t = i / numImages;
           this.afterImages.push({
             x: oldX + (this.x - oldX) * t,
             y: oldY + (this.y - oldY) * t,
             gunAngle: this.gunAngle,
             strikeTimer: this.strikeTimer,
             nitenActiveTimer: this.nitenActiveTimer,
             isNitenSecondHit: this.isNitenSecondHit,
             currentStance: this.currentStance,
             isSheathed: this.isSheathed,
             timer: 20
           });
         }
         
         spawnFloatingText(this.x, this.y - 30, 'PHANTOM FLURRY!', '#ff00ff');
         const attackSound = getBasicAttackSound('musashi');
         if (attackSound) playSound(attackSound.src, attackSound.volume);
         isAttacking = true;
      }

      if (distSq <= rangeHit) {
        this.gunAngle = Math.atan2(dy, dx);
        
        // 1. Niten Strike
        if (this.nitenCooldown <= 0 && !isAttacking) {
          this.nitenCooldown = CONFIG.musashi.nitenStrikeCooldown;
          this.nitenActiveTimer = 10;
          this.isNitenSecondHit = false;
          this.strikeTimer = 15;
          this.strikeAngle = this.gunAngle;
          
          this.spawnSlash('slash_wakizashi', Math.PI / 6, 0.9); // Quick angled Wakizashi slash
          
          // First hit: guard break / light dmg
          opponent.takeDamage(CONFIG.musashi.nitenStrikeDamage * 0.3, this, { isMelee: true });
          if (opponent.shieldHealth !== undefined) opponent.shieldHealth = 0; // Guard break
          spawnFloatingText(opponent.x, opponent.y - 10, 'NITEN QUICK!', '#fff');
          triggerGlobalScreenShake(4, 5);
          spawnSparks(opponent.x, opponent.y, 8, 'flash');
          const attackSound = getBasicAttackSound('musashi');
          if (attackSound) playSound(attackSound.src, attackSound.volume);
          
          isAttacking = true;
        }
        // 2. Basic Dual Attack
        else if (this.attackCooldown <= 0 && !isAttacking) {
          this.attackCooldown = CONFIG.musashi.attackCooldown;
          this.strikeTimer = CONFIG.musashi.strikeDurationFrames;
          this.strikeAngle = this.gunAngle;
          
          // Spawn cross-slash (X pattern)
          this.spawnSlash('slash_katana', -Math.PI / 4, 1.2);
          this.spawnSlash('slash_wakizashi', Math.PI / 4, 1.0);
          
          let dmg = CONFIG.musashi.katanaDamage + CONFIG.musashi.wakizashiDamage;
          if (this.currentStance === 'fire') dmg *= CONFIG.musashi.fireDamageMultiplier;
          
          opponent.takeDamage(dmg, this, { isMelee: true });
          spawnFloatingText(opponent.x, opponent.y - 5, 'SLASH!', '#ccc');
          
          triggerGlobalScreenShake(5, 5);
          spawnSparks(opponent.x, opponent.y, 12, 'flash');
          const attackSound = getBasicAttackSound('musashi');
          if (attackSound) playSound(attackSound.src, attackSound.volume);
          
          if (this.currentStance === 'water') {
             // Dodge slide backwards or through
             this.x += Math.cos(this.gunAngle) * 30;
             this.y += Math.sin(this.gunAngle) * 30;
             const dashSound = getSkillSound('musashi', 'dash');
             if (dashSound) playSound(dashSound.src, dashSound.volume);
             this.dashAnimTimer = 15;
          }
          isAttacking = true;
        }
       }
    }

    // Normal movement
    let targetSpeed = currentSpeed;
    if (this.slowTimer > 0) {
      this.slowTimer--;
      targetSpeed *= this.slowMultiplier;
    }

    const moveSpeedSq = this.vx * this.vx + this.vy * this.vy;
    const actualSpeed = Math.sqrt(moveSpeedSq);
    
    if (actualSpeed > 0 && Math.abs(actualSpeed - targetSpeed) > 0.05) {
      const ns = actualSpeed + (targetSpeed - actualSpeed) * 0.05;
      this.vx = (this.vx / actualSpeed) * ns;
      this.vy = (this.vy / actualSpeed) * ns;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Continuous weapon trail effect when moving fast
    if (actualSpeed > 2 && !this.isSheathed) {
       if (!this.afterImages) this.afterImages = [];
       // Spawn trails frequently while running
       if (Math.random() < 0.4) {
          this.afterImages.push({
             x: this.x,
             y: this.y,
             gunAngle: this.gunAngle,
             strikeTimer: this.strikeTimer,
             nitenActiveTimer: this.nitenActiveTimer,
             isNitenSecondHit: this.isNitenSecondHit,
             currentStance: this.currentStance,
             isSheathed: this.isSheathed,
             timer: 12,
             r: this.r
          });
       }
    }
    
    // Sheathing (Nōtō) logic
    if (isAttacking || this.strikeTimer > 0 || this.nitenActiveTimer > 0 || this.flurryHitsLeft > 0 || actualSpeed > 1) {
      this.idleTimer = 0;
      if (this.isSheathed) {
         // Draw sword sound or just unsheathe
         this.isSheathed = false;
      }
    } else {
      this.idleTimer++;
      if (this.idleTimer > 120 && !this.isSheathed) {
         this.isSheathed = true;
         spawnFloatingText(this.x, this.y - 20, 'NŌTŌ', '#bbb');
      }
    }
    
    // Update afterimages
    if (this.afterImages && this.afterImages.length > 0) {
      for (let i = this.afterImages.length - 1; i >= 0; i--) {
        this.afterImages[i].timer--;
        if (this.afterImages[i].timer <= 0) {
          this.afterImages.splice(i, 1);
        }
      }
    }

    // Update slash effects
    if (this.slashEffects && this.slashEffects.length > 0) {
      for (let i = this.slashEffects.length - 1; i >= 0; i--) {
        this.slashEffects[i].timer--;
        if (this.slashEffects[i].timer <= 0) {
          this.slashEffects.splice(i, 1);
        }
      }
    }
    
    // Face opponent or movement dir
    if (!isAttacking) {
      if (opponent && moveSpeedSq < 1) {
         this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      } else {
         this.gunAngle = Math.atan2(this.vy, this.vx);
      }
    }
    
    this.angle += actualSpeed * CONFIG.spin.rate;
    this.resolveWallBounce(arena, opponent);
  }

  resolveWallBounce(arena, opponent) {
    if (!opponent || opponent.isDead) {
      super.resolveWallBounce(arena);
      return;
    }

    let bounced = false;
    let bouncedX = false;
    let bouncedY = false;

    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      bounced = true;
      bouncedX = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      bounced = true;
      bouncedX = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      bounced = true;
      bouncedY = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      bounced = true;
      bouncedY = true;
    }

    if (bounced) {
      this.playWallBounceSound();
      // Aggressive bounce towards the opponent
      const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || this.speed;
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // Maintain speed but redirect velocity perfectly toward the enemy
      this.vx = (dx / dist) * currentSpeed;
      this.vy = (dy / dist) * currentSpeed;
    }
  }

  drawBody(ctx) {
    // Draw sheaths on back (behind body but above trail)
    if (drawMusashiSheaths) {
      drawMusashiSheaths(ctx, this, this.isSheathed);
    }

    if (this.afterImages && this.afterImages.length > 0) {
      this.afterImages.forEach(img => {
        const alpha = img.timer / 20.0;
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.translate(img.x, img.y);
        ctx.beginPath();
        ctx.arc(0, 0, this.r, 0, Math.PI * 2);
        
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
      });
    }
    super.drawBody(ctx);
  }

  drawGun(ctx) {
    if (drawMusashiWeapons && !this.isSheathed) {
      drawMusashiWeapons(ctx, this);
    }
  }

  draw(ctx) {
    // Update slash effects
    if (this.slashEffects && this.slashEffects.length > 0) {
      this.slashEffects.forEach(effect => {
        const prog = 1 - (effect.timer / effect.maxTimer);
        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle);
        
        let color = '#fff';
        if (effect.stance === 'earth') color = '#a0522d';
        if (effect.stance === 'water') color = '#1e90ff';
        if (effect.stance === 'fire') color = '#ff4500';
        if (effect.stance === 'wind') color = '#3cb371';
        if (effect.stance === 'void') color = '#8a2be2';
        
        ctx.globalAlpha = 1 - prog;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        
        if (effect.type.startsWith('slash')) {
          // Anime-style tapered crescent slash
          const size = effect.size * (0.6 + 0.6 * prog); // expands outward rapidly
          const thick = (1 - Math.pow(prog, 1.5)) * (effect.type === 'slash_katana' ? 28 : 18);
          
          const drawCrescent = (radius, thickness, angleSpread) => {
             ctx.beginPath();
             const startX = radius * Math.cos(-angleSpread);
             const startY = radius * Math.sin(-angleSpread);
             const endX = radius * Math.cos(angleSpread);
             const endY = radius * Math.sin(angleSpread);
             
             ctx.moveTo(startX, startY);
             // Outer curve
             ctx.quadraticCurveTo(radius + thickness * 1.5, 0, endX, endY);
             // Inner curve
             ctx.quadraticCurveTo(radius - thickness * 0.5, 0, startX, startY);
             ctx.closePath();
          };

          // 1. Large Stance Aura Glow
          ctx.shadowBlur = 25;
          ctx.shadowColor = color;
          ctx.fillStyle = color;
          drawCrescent(size, thick, 1.3);
          ctx.fill();

          // 2. Sharp Black Ink Layer (for high-contrast anime impact)
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#0a0a0a';
          drawCrescent(size * 0.98, thick * 0.75, 1.15);
          ctx.fill();

          // 3. Piercing White Core
          ctx.fillStyle = '#ffffff';
          drawCrescent(size * 0.96, thick * 0.35, 1.0);
          ctx.fill();
        }
        
        ctx.restore();
      });
    }

    super.draw(ctx);
    
    // Stance aura
    ctx.save();
    let r = 0, g = 0, b = 0;
    if (this.currentStance === 'earth') { r = 160; g = 82; b = 45; }
    else if (this.currentStance === 'water') { r = 30; g = 144; b = 255; }
    else if (this.currentStance === 'fire') { r = 255; g = 69; b = 0; }
    else if (this.currentStance === 'wind') { r = 60; g = 179; b = 113; }
    else if (this.currentStance === 'void') { r = 138; g = 43; b = 226; }

    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r + 5, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
    ctx.stroke();
    
    // Draw preemptive counter aura if active
    if (this.preemptiveActiveTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 10, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 0, 255, 0.8)';
      ctx.stroke();
    }
    ctx.restore();
  }
}
