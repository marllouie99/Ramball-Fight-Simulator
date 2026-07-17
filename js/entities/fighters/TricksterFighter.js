import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { spawnSparks, spawnImpactFlash, spawnTelekinesisDebris, spawnArcaneCrater, spawnArcaneSmoke, spawnArcaneShockwave, spawnArcaneFlash, spawnArcaneGlyphs, spawnSpellStealWisps } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { spawnBerserkerRageEffect } from '../../graphics/particles/berserkerRageEffect.js';
import { drawTricksterStaff } from '../../graphics/weapons/tricksterWeaponGraphics.js';
import { updateStolenRubyHook, updateStolenCronosSphere, resolveStolenCronosWallBounce } from './trickster/tricksterStealLogic.js';
import { getStolenMultiplier } from './trickster/stolenSkillConfig.js';
import { TricksterRubyTheme } from './trickster/tricksterThemes.js';
import { drawRubyScythe } from '../../graphics/weapons/rubyWeaponGraphics.js';
import { playSound } from '../../systems/soundSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';

export class TricksterFighter extends Fighter {
  constructor(def) {
    super(def);
    
    // Initial hovering state for correct display before first update()
    this.z = 25;
    
    this.attackCooldown = 0;
    this.attackSwingTimer = 0;
    this.telekinesisCooldown = 0;
    this.spellStealCooldown = CONFIG.trickster.spellStealCooldown;

    // Telekinesis state
    this.tkTarget = null;
    this.tkTimer = 0;
    this.tkOriginalScale = 1;

    // Spell Steal state
    this.stolenType = null;
    this.stolenTimer = 0;
    this.stolenWindUpTimer = 0;
    this.tricksterRageTimer = 0;
    
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this.slashEffects = [];
    this.afterImages = [];
    
    // For specific stolen skills that need internal cooldowns
    this.stolenSkillCooldown = 0;
    
    // Permanent orbiting magical debris (stops flickering caused by particle birth/death)
    this.orbitingDebris = [];
    for (let i = 0; i < 6; i++) {
      this.orbitingDebris.push({
        angle: (i / 6) * Math.PI * 2, // Evenly spaced initially
        dist: 35 + Math.random() * 7, // Wider Saturn-like orbit distance!
        speed: 0.02 + Math.random() * 0.03, // Orbit speed
        size: 5 + Math.random() * 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        color: `rgba(${100 + Math.random()*40}, ${110 + Math.random()*30}, ${100 + Math.random()*30}, 1)`,
        zPhase: Math.random() * Math.PI * 2,
        zSpeed: 0.03 + Math.random() * 0.04
      });
    }
  }

  reset() {
    super.reset();
    this.attackCooldown = 0;
    this.attackSwingTimer = 0;
    this.telekinesisCooldown = 0;
    this.spellStealCooldown = CONFIG.trickster.spellStealCooldown;
    this.tkTarget = null;
    this.tkTimer = 0;
    this.stolenType = null;
    this.stolenTimer = 0;
    this.stolenSkillCooldown = 0;
    this.tricksterRageTimer = 0;
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this.slashEffects = [];
    this.afterImages = [];
    this.activePullActive = false;
    this.activePullPhase = -1;
    this.activePullPhaseTimer = 0;
    this.activePullAngle = 0;
    this.pullTargets = [];
    this.primaryHookTarget = null;
    
    // Phase durations (frames)
    this.pullPhaseWindUp = 14;
    this.pullPhaseSwingOut = 10;
    this.pullPhaseHookGrab = 3;
    this.pullPhasePullDrag = 25;
    this.pullPhaseDisengage = 12;
  }

  update(opponent, ownerIndex, arena) {
    // Visual hovering effect: dynamically adjust the Z coordinate
    // Float high enough (25+ pixels) so the shadow is clearly visible beneath the character's body!
    this.z = 25 + Math.sin(Date.now() / 200) * 6;

    this.handlePoison();
    this.handleBurn();
    
    const isTimeStopped = this._handleTimeStop();
    if (typeof this._updateStaffTrail === 'function') this._updateStaffTrail(isTimeStopped);
    if (isTimeStopped) return;

    // Handle stolen Berserker Rage
    if (this.stolenType === 'berserker') {
      if (!this.berserkerRageActivated) {
        this.berserkerRageActivated = true;
        spawnFloatingText(this.x, this.y - this.r - 10, 'ARCANE RAGE!', '#00ff64');
        triggerGlobalScreenShake(12, 8);
        if (typeof spawnBerserkerRageEffect === 'function') {
          spawnBerserkerRageEffect(this, '#00ff64', '#00cc50');
        }
      }

      this.speed = this.baseSpeed * (CONFIG.berserker.rageMoveSpeedMultiplier || 2.0);
      
      // Spawn green afterimages (motion trails) while in rage
      if (this.stolenTimer > 0 && this.stolenTimer % 3 === 0) {
        if (!this.afterImages) this.afterImages = [];
        this.afterImages.push({
          x: this.x,
          y: this.y,
          gunAngle: this.gunAngle,
          timer: 15,
          color: '#00ff64'
        });
      }
    } else {
      this.berserkerRageActivated = false;
      this.speed = this.baseSpeed;
    }

    if (this.flurryHitsLeft > 0) {
       this.vx *= 0.1;
       this.vy *= 0.1;
       
       if (this.flurryTimer > 0) this.flurryTimer--;
       if (this.flurryTimer <= 0) {
         this.flurryHitsLeft--;
         this.flurryTimer = 6;
         
         let possibleTargets = state.fighters.filter(f => f && f !== this && f.hp > 0 && Math.hypot(f.x - this.x, f.y - this.y) < 450);
         if (state.illusions) {
           possibleTargets = possibleTargets.concat(state.illusions.filter(ill => ill && ill.hp > 0 && Math.hypot(ill.x - this.x, ill.y - this.y) < 450));
         }
         
         if (possibleTargets.length > 0) {
            this.flurryTarget = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
         }

         if (this.flurryTarget && !this.flurryTarget.isDead) {
            this.strikeAngle = Math.random() * Math.PI * 2;
            
            const flurryDmg = CONFIG.musashi.flurryDamage * getStolenMultiplier('musashi', 'damageMultiplier');
            this.flurryTarget.takeDamage(flurryDmg, this, {isMelee: true});
            this.flurryTarget.applyHitStun(15);
            
            if (!this.slashEffects) this.slashEffects = [];
            this.slashEffects.push({
              type: this.flurryHitsLeft % 2 === 0 ? 'slash_katana' : 'slash_wakizashi',
              x: this.x,
              y: this.y,
              angle: this.strikeAngle,
              timer: 15,
              maxTimer: 15,
              stance: ['earth', 'water', 'fire', 'wind', 'void'][this.flurryHitsLeft % 5],
              size: (this.r + 25) * 1.4
            });
            spawnFloatingText(this.flurryTarget.x, this.flurryTarget.y - 10, 'SLASH!', '#fff');
            
            triggerGlobalScreenShake(6, 6);
            spawnSparks(this.flurryTarget.x, this.flurryTarget.y, 10, 'flash');
            
            this.gunAngle = this.strikeAngle;
            
            const angle = Math.random() * Math.PI * 2;
            const dist = this.flurryTarget.r + this.r + 10;
            const oldX = this.x;
            const oldY = this.y;
            this.x = this.flurryTarget.x + Math.cos(angle) * dist;
            this.y = this.flurryTarget.y + Math.sin(angle) * dist;
            
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
                gunAngle: this.gunAngle
              });
            }

            this.applyTimeStop(6);
            this.flurryTarget.applyTimeStop(6);
         } else {
            this.flurryHitsLeft = 0;
         }
       }
       
       this.x += this.vx;
       this.y += this.vy;
       this.resolveWallBounce(arena, this.flurryTarget);
       return;
    }

    if (this.stolenWindUpTimer > 0) {
      this.stolenWindUpTimer--;
      this.vx = 0;
      this.vy = 0;
      if (opponent) {
        this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      }
      
      if (this.stolenWindUpTimer === 0) {
        if (!this._hasFiredStolenSkillTrick) {
          this._hasFiredStolenSkillTrick = true;
          this.fireStolenSkill(opponent, ownerIndex);
          this.attackCooldown = CONFIG.trickster.attackCooldown;
        }
        
        // Prevent the 0-velocity physics bug by giving a tiny nudge right after heavy casts
        if (this.vx === 0 && this.vy === 0) {
          this.vx = 0.1;
          this.vy = 0.1;
        }
      }
      return;
    }

    let timeMultiplier = 1;
    if (this._isInsideOwnSphere && this._isInsideOwnSphere()) {
      timeMultiplier = CONFIG.cronos.sphereSpeedMultiplier || 5;
    }

    if (this.attackCooldown > 0) this.attackCooldown -= timeMultiplier;
    if (this.attackSwingTimer > 0) this.attackSwingTimer -= timeMultiplier;
    if (this.telekinesisCooldown > 0) this.telekinesisCooldown--; // Keep ability cooldowns normal
    if (this.spellStealCooldown > 0) this.spellStealCooldown--;
    if (this.stolenSkillCooldown > 0) this.stolenSkillCooldown--;
    if (this.stolenTimer > 0) {
      this.stolenTimer--;
      if (this.stolenTimer === 0) {
        this.stolenType = null;
        spawnFloatingText(this.x, this.y - this.r - 20, 'SPELL FADED', '#2E8B57');
      }
    }

    // Telekinesis Logic
    if (this.tkTimer > 0 && this.tkTarget) {
      this.tkTimer--;

      // Stop moving while channeling
      this.vx = 0;
      this.vy = 0;
      
      // Smoothly rotate staff towards the drop location
      const targetAngle = Math.atan2(this.tkDropY - this.y, this.tkDropX - this.x);
      let diff = targetAngle - this.gunAngle;
      
      // Normalize angle difference for shortest path
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      this.gunAngle += diff * 0.15; // 0.15 gives a nice smooth snap
      
      // Spawn ascending glowing green neon particles from the drop location
      if (Math.random() < 0.6) {
        spawnSparks(
          this.tkDropX + (Math.random() - 0.5) * 60,
          this.tkDropY + (Math.random() - 0.5) * 60,
          1, 'arcaneAscendLine'
        );
      }
      
      // Immobilize the target (override their update if possible, but here we just lock their position)
      this.tkTarget.vx = 0;
      this.tkTarget.vy = 0;
      this.tkTarget.timeStopTimer = 2; // Force them to be frozen
      
      // Visual lift effect is handled in drawing if we could, but let's simulate it by adding an aura
      if (Math.random() < 0.2) {
        spawnSparks(this.tkTarget.x, this.tkTarget.y, 1, 'flash');
      }

      const tkTotalDuration = CONFIG.trickster.telekinesisDuration;
      const progress = 1 - (this.tkTimer / tkTotalDuration);
      
      // Calculate smooth movement progress (hover -> sweep -> hover -> slam)
      let moveProgress = 0;
      if (progress > 0.3 && progress <= 0.9) {
         // Smoothstep interpolation (3x^2 - 2x^3) for smooth acceleration and deceleration
         let t = (progress - 0.3) / 0.6;
         moveProgress = t * t * (3 - 2 * t);
      } else if (progress > 0.9) {
         moveProgress = 1;
      }

      const nextX = this.tkStartX + (this.tkDropX - this.tkStartX) * moveProgress;
      const nextY = this.tkStartY + (this.tkDropY - this.tkStartY) * moveProgress;
      
      const dx = this.tkTargetLastX !== undefined ? nextX - this.tkTargetLastX : 0;
      const dy = this.tkTargetLastY !== undefined ? nextY - this.tkTargetLastY : 0;

      this.tkTarget.x = nextX;
      this.tkTarget.y = nextY;
      
      this.tkTargetLastX = nextX;
      this.tkTargetLastY = nextY;

      // Drag debris along perfectly with the target
      if (dx !== 0 || dy !== 0) {
        for (const spark of state.sparkEffects) {
          if (spark.type === 'telekinesisDebris') {
            spark.x += dx;
            spark.y += dy;
          }
        }
      }

      // Animate Z for floating effect
      const maxZ = 60;
      if (this.tkTimer > tkTotalDuration - 10) {
          // Going up
          this.tkTarget.z = ((tkTotalDuration - this.tkTimer) / 10) * maxZ;
      } else if (this.tkTimer < 10) {
          // Going down
          this.tkTarget.z = (this.tkTimer / 10) * maxZ;
      } else {
          // Floating / Bobbing
          this.tkTarget.z = maxZ + Math.sin(this.tkTimer * 0.1) * 5;
      }
      
      // Floating glowing magical particles
      if (this.tkTarget.z > 0 && Math.random() < 0.6) {
        spawnSparks(this.tkTarget.x + (Math.random() - 0.5) * 40, this.tkTarget.y - this.tkTarget.z + (Math.random() - 0.5) * 40, 2, 'arcane');
      }
      
      // Ascending magical glowing lines from the ground
      if (this.tkTarget.z > 0) {
        spawnSparks(
          this.tkTarget.x + (Math.random() - 0.5) * 80, 
          this.tkTarget.y + (Math.random() - 0.5) * 80, 
          2, 'arcaneAscendLine'
        );
      }

      if (this.tkTimer === 0) {
        this.tkTarget.z = 0; // Reset Z
        
        // Spawn arcane crater impact graphic on the ground
        spawnArcaneCrater(this.tkTarget.x, this.tkTarget.y, 75);
        
        // Spawn an expanding dark green shockwave
        spawnArcaneShockwave(this.tkTarget.x, this.tkTarget.y);
        
        // Small dust burst instead of massive explosion
        for (let i = 0; i < 4; i++) {
          spawnArcaneSmoke(
            this.tkTarget.x + (Math.random() - 0.5) * 20,
            this.tkTarget.y + (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 4, 
            (Math.random() - 0.5) * 4, 
            'ground'
          );
        }
        
        // Scatter floating telekinesis debris on slam radially outwards
        for (const spark of state.sparkEffects) {
          if (spark.type === 'telekinesisDebris') {
            spark.type = 'telekinesisDebrisScattered'; // Stop bobbing and draw below fighters
            
            // Bring them back down to ground level under the fighter's feet
            const radius = Math.random() * 20;
            const angle = Math.random() * Math.PI * 2;
            spark.x = this.tkTarget.x + Math.cos(angle) * radius;
            spark.y = this.tkTarget.y + Math.sin(angle) * radius;

            const speed = 4 + Math.random() * 6; // Slower blast to keep them grouped closer
            spark.vx = Math.cos(angle) * speed;
            spark.vy = Math.sin(angle) * speed;
            spark.decay = 0.02 + Math.random() * 0.02; // Fade out slowly
            spark.friction = 0.82; // Stronger friction so they stop much sooner
          }
        }
        
        spawnFloatingText(this.tkTarget.x, this.tkTarget.y - 15, 'STUNNED!', '#50DCFF');
        triggerGlobalScreenShake(8, 12); // Quick, controlled screen shake
        
        // Arcane magical landing effects
        spawnArcaneFlash(this.tkTarget.x, this.tkTarget.y);
        spawnArcaneGlyphs(this.tkTarget.x, this.tkTarget.y, 10);

        // AoE Stun to nearby enemies (including target)
        const allEnemies = state.fighters.filter(f => f && f.hp > 0 && f !== this);
        for (let enemy of allEnemies) {
          const dx = enemy.x - this.tkTarget.x;
          const dy = enemy.y - this.tkTarget.y;
          if (dx * dx + dy * dy < CONFIG.trickster.telekinesisStunRadius * CONFIG.trickster.telekinesisStunRadius) {
            enemy.electricStunTimer = CONFIG.trickster.telekinesisStunDuration;
            spawnFloatingText(enemy.x, enemy.y - enemy.r - 5, 'STUNNED', '#FFFF00');
          }
        }
        // BUGFIX: Restore a tiny amount of velocity so the Fighter physics engine
        // can rescale the target's speed back to normal. If vx/vy are exactly 0,
        // the physics engine ignores them and the bot gets stuck forever.
        if (this.tkTarget) {
          this.tkTarget.vx = 0.1;
          this.tkTarget.vy = 0.1;
          
          if (this.tkTarget.isTurret) {
            this.tkTarget._fixedX = this.tkTarget.x;
            this.tkTarget._fixedY = this.tkTarget.y;
          }
        }

        // Also give the Trickster a bump because they stop moving during the channel too!
        this.vx = 0.1;
        this.vy = 0.1;

        this.tkTarget = null;
      }
    }

    if (opponent && !opponent.isDead && !this.tkTimer) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const distSq = dx * dx + dy * dy;

      this.gunAngle = Math.atan2(dy, dx);

      // Ultimate: Spell Steal
      if (this.spellStealCooldown <= 0 && !this.stolenType && distSq < CONFIG.trickster.spellStealRange * CONFIG.trickster.spellStealRange) {
        this.spellStealCooldown = CONFIG.trickster.spellStealCooldown;
        this.stolenType = opponent._def.type;
        this.stolenColor = opponent._def.color;
        this.stolenTimer = CONFIG.trickster.spellStealDuration;
        this.stolenSkillCooldown = 0;
        this._hasFiredStolenSkillTrick = false;
        
        spawnFloatingText(this.x, this.y - this.r - 20, `STOLEN: ${this.stolenType.toUpperCase()}!`, '#00FF00');
        
        // Cast a visual effect where magical energy drains from the target into the Trickster
        spawnSpellStealWisps(this, opponent, this.stolenColor, 15);
      }

      // Skill 1: Telekinesis
      if (this.telekinesisCooldown <= 0 && !this.stolenType && distSq < CONFIG.trickster.telekinesisRange * CONFIG.trickster.telekinesisRange) {
        this.telekinesisCooldown = CONFIG.trickster.telekinesisCooldown;
        this.tkTarget = opponent;
        this.tkTimer = CONFIG.trickster.telekinesisDuration;
        
        // Interrupt attacks (so visual slashes don't get stuck hovering in the air)
        if (typeof opponent.interruptAttacks === 'function') {
           opponent.interruptAttacks();
        }
        
        // Pre-calculate drop location (Mage wants to keep distance)
        const minDistance = 150;
        const maxDistance = 220;
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * (maxDistance - minDistance);
        
        this.tkStartX = opponent.x;
        this.tkStartY = opponent.y;
        this.tkTargetLastX = undefined;
        this.tkTargetLastY = undefined;
        
        let dropX = this.x + Math.cos(angle) * distance;
        let dropY = this.y + Math.sin(angle) * distance;
        
        // Keep in arena
        dropX = Math.max(arena.x + opponent.r, Math.min(arena.x + arena.width - opponent.r, dropX));
        dropY = Math.max(arena.y + opponent.r, Math.min(arena.y + arena.height - opponent.r, dropY));
        
        this.tkDropX = dropX;
        this.tkDropY = dropY;

        spawnFloatingText(opponent.x, opponent.y - opponent.r - 10, 'LIFTED!', '#8A2BE2');
        
        // Massive initial burst of rocks from the ground
        spawnTelekinesisDebris(opponent.x, opponent.y, 25);
      }

      // Check heavy stolen skills every frame
      let castedHeavy = false;
      if (this.stolenType && !this.tkTimer && this.stolenSkillCooldown <= 0) {
        if (['cronos', 'ruby', 'bomber', 'grenadier', 'laser', 'musashi', 'normal'].includes(this.stolenType)) {
          // It's a Heavy Spell! (One-time cast that consumes the stolen buff)
          castedHeavy = true;
          this.executeStolenSkill(opponent, ownerIndex);
        }
      }

      // Basic Attack / Spammable Stolen Attack
      if (!castedHeavy && this.attackCooldown <= 0 && !this.tkTimer) {
        this.attackCooldown = CONFIG.trickster.attackCooldown;
        this.attackSwingTimer = 15; // 15 frames of staff swing animation
        
        let castedSpammable = false;
        if (this.stolenType && ['orange', 'darkslategray', 'gunslinger'].includes(this.stolenType)) {
          castedSpammable = this.executeStolenSkill(opponent, ownerIndex);
        }
        
        if (!castedSpammable) {
          // Normal Arcane Bolt
          let dmg = CONFIG.trickster.boltDamage;
          if (this.stolenType === 'berserker') {
            // Apply Berserker Rage buffs to Arcane Bolt
            const rageAttackMultiplier = CONFIG.berserker.rageAttackSpeedMultiplier || 1.1;
            this.attackCooldown = (CONFIG.trickster.attackCooldown / rageAttackMultiplier) * getStolenMultiplier('berserker', 'cooldownMultiplier');
            dmg *= (CONFIG.berserker.rageDamageMultiplier || 1.8) * getStolenMultiplier('berserker', 'damageMultiplier');
            
            // Speed up the swing animation to match the faster attack speed
            const totalSpeedUp = rageAttackMultiplier / getStolenMultiplier('berserker', 'cooldownMultiplier');
            this.attackSwingTimer = Math.max(5, Math.floor(15 / totalSpeedUp));
            
            // Aim before swinging the visual effect
            if (opponent) {
               this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
            }
          }
          
          if (projectileSystem.fireArcaneBolt) {
             projectileSystem.fireArcaneBolt(this, ownerIndex, dmg, opponent);
          }
        }
      }
    }

    // Stop to cast: Halt movement during the attack wind-up AND the swing follow-through
    // Only apply wind-up halt for his own Arcane Bolt (which has a long cooldown).
    // Fast stolen skills (like Flamethrower or Shuriken) shouldn't permanently lock him in place.
    const isWindingUp = !this.stolenType && this.attackCooldown > 0 && this.attackCooldown <= 15;
    const isSwinging = this.attackSwingTimer > 0;
    
    if (isWindingUp || isSwinging) {
      // Don't halt if Trickster is in Berserker rage (he can move while attacking)
      // Also don't halt if hyper-accelerated inside time sphere
      if (this.stolenType !== 'berserker' && (!this._isInsideOwnSphere || !this._isInsideOwnSphere())) {
        this.vx = 0;
        this.vy = 0;
      }
      
      // Prevent the 0-velocity physics bug by giving a tiny nudge right as they finish casting completely
      let timeMultiplier = 1;
      if (this._isInsideOwnSphere && this._isInsideOwnSphere()) {
        timeMultiplier = CONFIG.cronos.sphereSpeedMultiplier || 5;
      }
      if (this.attackSwingTimer > 0 && this.attackSwingTimer <= timeMultiplier) {
        if (this.vx === 0 && this.vy === 0) {
          this.vx = 0.1;
          this.vy = 0.1;
        }
      }
    }

    this.applyMovementPhysics();
    this.resolveWallBounce(arena, opponent);

    // Update permanent orbiting debris
    for (const debris of this.orbitingDebris) {
      debris.angle += debris.speed;
      debris.rotation += debris.rotationSpeed;
      debris.zPhase += debris.zSpeed;
    }
    // Update Stolen Ruby Hook
    updateStolenRubyHook(this);
    if (this.sphereActive) {
      updateStolenCronosSphere(this);
    }

    if (this.afterImages) {
      for (let i = this.afterImages.length - 1; i >= 0; i--) {
        this.afterImages[i].timer--;
        if (this.afterImages[i].timer <= 0) this.afterImages.splice(i, 1);
      }
    }
    if (this.slashEffects) {
      for (let i = this.slashEffects.length - 1; i >= 0; i--) {
        this.slashEffects[i].timer--;
        if (this.slashEffects[i].timer <= 0) this.slashEffects.splice(i, 1);
      }
    }
  }

  executeStolenSkill(opponent, ownerIndex) {
    let skillCast = false;
    // Map of copied active skills
    switch (this.stolenType) {
      case 'musashi':
        if (this.stolenSkillCooldown <= 0) {
           if (opponent) {
             const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
             if (dist <= 250) {
               this.stolenWindUpTimer = 30; // 0.5 seconds wind-up
               skillCast = true;
             }
           }
        }
        break;
      case 'cronos':
        if (this.stolenSkillCooldown <= 0) {
           if (opponent) {
             const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
             if (dist <= (CONFIG.cronos.sphereActivationDistance || 120)) {
               this.stolenWindUpTimer = 30; // 0.5 seconds wind-up
               skillCast = true;
             }
           }
        }
        break;
      case 'ruby':
        if (this.stolenSkillCooldown <= 0) {
           if (opponent) {
             const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
             if (dist <= (CONFIG.ruby?.activePullRange || 200)) {
               this.stolenWindUpTimer = 30; // 0.5 seconds wind-up
               skillCast = true;
             }
           }
        }
        break;
      case 'bomber':
      case 'grenadier':
      case 'laser':
      case 'normal':
        // These are heavy skills! We will enter the wind-up phase first!
        if (this.stolenSkillCooldown <= 0) {
           this.stolenWindUpTimer = this.stolenType === 'normal' ? (CONFIG.sharpshooter?.executeWindupFrames || 30) : 30; 
           skillCast = true;
        }
        break;
      case 'orange':
        // Flame warden flamethrower
        projectileSystem.fireFlameProjectile(this, ownerIndex, CONFIG.orange.flameDamage * getStolenMultiplier(this.stolenType, 'damageMultiplier'), 0, undefined, undefined, undefined, '#00FFFF'); // cyan flames
        this.attackCooldown = 4 * getStolenMultiplier(this.stolenType, 'cooldownMultiplier'); // rapid fire
        skillCast = true;
        break;
      case 'darkslategray':
        // Ninja shuriken
        projectileSystem.fireProjectile(this, ownerIndex, CONFIG.darkslategray.shurikenDamage * getStolenMultiplier(this.stolenType, 'damageMultiplier'), false, CONFIG.darkslategray.shurikenSpeed, false, 'darkslategrayShuriken');
        this.attackCooldown = CONFIG.darkslategray.shurikenCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
        skillCast = true;
        break;
      case 'gunslinger':
         // Rapid fire
         projectileSystem.fireProjectile(this, ownerIndex, CONFIG.gunslinger.bulletDamage * getStolenMultiplier(this.stolenType, 'damageMultiplier'), false, CONFIG.gunslinger.bulletSpeed, false, 'gunslingerBullet');
         this.attackCooldown = CONFIG.gunslinger.shotCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
         skillCast = true;
         break;

      default:
         break;
    }
    
    // Clear the stolen skill after casting ONLY if it's a spammable skill
    if (skillCast && !['musashi', 'cronos', 'ruby', 'bomber', 'grenadier', 'laser', 'normal'].includes(this.stolenType)) {
      this.stolenType = null;
      this.stolenTimer = 0;
    }
    
    return skillCast;
  }

  fireStolenSkill(opponent, ownerIndex) {
    switch (this.stolenType) {
      case 'musashi':
         this.flurryHitsLeft = 5;
         this.flurryTimer = 0;
         this.flurryTarget = opponent;
         this.stolenSkillCooldown = CONFIG.musashi.flurryCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
         
         const dx = opponent.x - this.x;
         const dy = opponent.y - this.y;
         const dist = Math.sqrt(dx*dx + dy*dy) || 1;
         const oldX = this.x;
         const oldY = this.y;
         
         this.x = opponent.x - (dx/dist) * (this.r + opponent.r + 5);
         this.y = opponent.y - (dy/dist) * (this.r + opponent.r + 5);
         
         if (!this.afterImages) this.afterImages = [];
         const teleportDist = Math.sqrt((this.x - oldX)**2 + (this.y - oldY)**2);
         const numImages = Math.max(5, Math.floor(teleportDist / 12));
         for (let i = 0; i <= numImages; i++) {
           const t = i / numImages;
           this.afterImages.push({
             x: oldX + (this.x - oldX) * t,
             y: oldY + (this.y - oldY) * t,
             gunAngle: this.gunAngle,
             timer: 20
           });
         }
         
         spawnFloatingText(this.x, this.y - 30, 'STOLEN FLURRY!', '#ff00ff');
         break;
      case 'bomber':
        projectileSystem.fireBomberGrenade(this, ownerIndex, CONFIG.bomber.grenadeDamage * getStolenMultiplier(this.stolenType, 'damageMultiplier'), opponent, false);
        this.stolenSkillCooldown = CONFIG.bomber.grenadeCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
        break;
      case 'cronos':
        this.sphereActive = true;
        this.sphereX = this.x;
        this.sphereY = this.y;
        this.sphereTimer = CONFIG.cronos.sphereDuration;
        this.stolenSkillCooldown = CONFIG.cronos.sphereCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
        spawnFloatingText(this.x, this.y - this.r - 10, 'TIME SPHERE!', '#07cdfa');
        break;
      case 'grenadier':
        projectileSystem.fireGrenade(this, ownerIndex, (CONFIG.grenadier.poisonDamagePerTick || 10) * getStolenMultiplier(this.stolenType, 'damageMultiplier'), opponent);
        this.stolenSkillCooldown = CONFIG.grenadier.throwCooldown * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
        break;
      case 'laser':
         this.beamActive = true;
         this.beamTimer = CONFIG.laser.beamDuration;
         this.stolenSkillCooldown = 300 * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
         break;
      case 'ruby':
         if (opponent) {
           this.stolenSkillCooldown = (CONFIG.ruby?.activePullCooldown || 240) * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
           this.activePullAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
           this.gunAngle = this.activePullAngle;
           this.activePullActive = true;
           this.activePullPhase = 0; // WIND_UP
           this.activePullPhaseTimer = this.pullPhaseWindUp;
           this.pullTargets = [];
           this.primaryHookTarget = opponent;
           this.vx = 0;
           this.vy = 0;
         }
        break;
      case 'normal':
        if (opponent) {
           this.stolenSkillCooldown = (CONFIG.normal.shotCooldown || 70) * getStolenMultiplier(this.stolenType, 'cooldownMultiplier');
           const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
           this.gunAngle = targetAngle;
           
           // Fire from tip of staff
           const customTipDist = this.r + 20;
           const customSpawnX = this.x + Math.cos(this.gunAngle) * customTipDist;
           const customSpawnY = this.y + Math.sin(this.gunAngle) * customTipDist;
           
           const finalDamage = this.damage * (CONFIG.sharpshooter?.enhancedDamageMultiplier || 2.5) * getStolenMultiplier(this.stolenType, 'damageMultiplier');
           const finalSpeed = CONFIG.projectile.speed * (this._def.projectileSpeedMultiplier || 1) * (CONFIG.sharpshooter?.enhancedSpeedMultiplier || 1.5);
           
           spawnFloatingText(this.x, this.y - this.r - 20, 'EXECUTE!', '#00ff00');
           triggerGlobalScreenShake(15, 10);
           
           projectileSystem.fireProjectile(this, ownerIndex, finalDamage, false, finalSpeed, false, 'tricksterSniperBullet_enhanced', customSpawnX, customSpawnY);
           
           let recoilForce = (CONFIG.sharpshooter?.enhancedRecoilForce || 30);
           this.vx -= Math.cos(this.gunAngle) * recoilForce;
           this.vy -= Math.sin(this.gunAngle) * recoilForce;
           
           const enhanceSound = getSkillSound(1, 'enhance'); // 1 is Sharpshooter ID
           if (enhanceSound) {
             playSound(enhanceSound.src, enhanceSound.volume);
           }
        }
        break;
    }
    
    // Clear the stolen skill after casting
    this.stolenType = null;
    this.stolenTimer = 0;
  }

  _isInsideOwnSphere() {
    if (!this.sphereActive) return false;
    const distToSphere = Math.hypot(this.x - this.sphereX, this.y - this.sphereY);
    return distToSphere <= CONFIG.cronos.sphereRadius + 2; // +2 for floating point leniency at the boundary
  }

  drawGun(ctx) {
    if (this.activePullActive) {
      drawRubyScythe(ctx, this, TricksterRubyTheme);
    } else {
      drawTricksterStaff(ctx, this);
    }
  }

  _updateStaffTrail(isTimeStopped = false) {
    if (!this.staffTrail) this.staffTrail = [];
    if (!this.staffSmokeParticles) this.staffSmokeParticles = [];

    // Fade and clean up
    for (let p of this.staffTrail) p.life--;
    this.staffTrail = this.staffTrail.filter(p => p.life > 0);

    for (let p of this.staffSmokeParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.size += 0.5;
      p.angle += p.spin;
    }
    this.staffSmokeParticles = this.staffSmokeParticles.filter(p => p.life > 0);

    if (isTimeStopped || this.stolenType !== 'berserker') return;

    const isSwinging = this.attackSwingTimer > 0;
    const speed = Math.hypot(this.vx, this.vy);
    const isMoving = speed > 0.5;

    if (isSwinging || isMoving) {
       // Staff head position calculation
       const idleHover = 0; 
       const progress = isSwinging ? this.attackSwingTimer / 15 : 0;
       const swingAngle = Math.sin(progress * Math.PI) * -0.6;
       const thrustOffset = Math.sin(progress * Math.PI) * 12;

       const tx = this.r * 0.4 + thrustOffset;
       const ty = this.r * 0.85 + idleHover;
       const staffRot = Math.PI * 0.3 + swingAngle;

       const headLocalX = 0;
       const headLocalY = -50;

       const rotX = headLocalX * Math.cos(staffRot) - headLocalY * Math.sin(staffRot);
       const rotY = headLocalX * Math.sin(staffRot) + headLocalY * Math.cos(staffRot);

       const gunX = tx + rotX;
       const gunY = ty + rotY;

       const worldX = this.x + gunX * Math.cos(this.gunAngle) - gunY * Math.sin(this.gunAngle);
       const worldY = this.y + gunX * Math.sin(this.gunAngle) + gunY * Math.cos(this.gunAngle);

       let shouldPush = true;
       if (this.staffTrail.length > 0) {
           const last = this.staffTrail[this.staffTrail.length - 1];
           if (Math.hypot(worldX - last.x, worldY - last.y) < 1.0) shouldPush = false;
       }

       if (shouldPush) {
           this.staffTrail.push({
               x: worldX,
               y: worldY,
               life: 12,
               jitter: Math.random() * 4 - 2
           });

           const smokeCount = isSwinging ? 3 : 1;
           for (let i = 0; i < smokeCount; i++) {
               const staffAngle = this.gunAngle + staffRot;
               const shaftOffset = Math.random() * 35;
               const px = worldX - Math.cos(staffAngle) * shaftOffset;
               const py = worldY - Math.sin(staffAngle) * shaftOffset;

               this.staffSmokeParticles.push({
                  x: px + (Math.random() - 0.5) * 15,
                  y: py + (Math.random() - 0.5) * 15,
                  vx: (Math.random() - 0.5) * 1.5,
                  vy: (Math.random() - 0.5) * 1.5 - 0.5,
                  life: 15 + Math.random() * 10,
                  maxLife: 25,
                  size: 6 + Math.random() * 6,
                  stretch: 0.4 + Math.random() * 0.4,
                  angle: Math.random() * Math.PI * 2,
                  spin: (Math.random() - 0.5) * 0.1,
                  color: Math.random() > 0.6 ? '#000000' : (Math.random() > 0.4 ? '#004a20' : '#008840')
               });
           }
       }
    }
  }

  _drawStaffTrail(ctx) {
    if (this.stolenType !== 'berserker') return;

    if (this.staffSmokeParticles && this.staffSmokeParticles.length > 0) {
        for (const p of this.staffSmokeParticles) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            
            const lifeRatio = p.life / p.maxLife;
            ctx.globalAlpha = lifeRatio * 0.7;
            
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * p.stretch, p.size, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    if (!this.staffTrail || this.staffTrail.length < 2) return;
    
    ctx.save();
    
    const drawCrescentPolygon = (trail, r, g, b, baseThickness) => {
        const headLife = trail[trail.length - 1].life / 12;
        const globalAlpha = headLife > 0.2 ? 1.0 : (headLife / 0.2);
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${globalAlpha})`;
        ctx.beginPath();
        
        const outer = [];
        const inner = [];
        
        for (let i = 0; i < trail.length; i++) {
            const p = trail[i];
            const progress = p.life / 12; // 0 to 1
            
            let thickness = baseThickness * progress;
            if (i === trail.length - 1 || i === 0) {
                thickness = 0; 
            }
            
            thickness += (p.jitter * progress * 0.4);
            
            let prev = i > 0 ? trail[i - 1] : trail[0];
            let next = i < trail.length - 1 ? trail[i + 1] : trail[trail.length - 1];
            
            if (i === 0 && trail.length > 1) next = trail[1];
            if (i === trail.length - 1 && trail.length > 1) prev = trail[trail.length - 2];
            
            let dx = next.x - prev.x;
            let dy = next.y - prev.y;
            let len = Math.hypot(dx, dy) || 1;
            
            let nx = -dy / len;
            let ny = dx / len;
            
            outer.push({ x: p.x + nx * thickness, y: p.y + ny * thickness });
            inner.push({ x: p.x - nx * thickness, y: p.y - ny * thickness });
        }
        
        ctx.moveTo(outer[0].x, outer[0].y);
        for (let i = 1; i < outer.length; i++) ctx.lineTo(outer[i].x, outer[i].y);
        for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y);
        
        ctx.closePath();
        ctx.fill();
    };

    // Draw green anime-style trails
    drawCrescentPolygon(this.staffTrail, 0, 0, 0, 16);     // Black Aura
    drawCrescentPolygon(this.staffTrail, 0, 220, 100, 8);  // Green Aura
    drawCrescentPolygon(this.staffTrail, 255, 255, 255, 2);// White Core

    ctx.restore();
  }
  
  draw(ctx) {
    // Draw debris that is currently BEHIND the Trickster
    this._drawDebrisLayer(ctx, true);
    
    // Draw afterimages
    if (this.afterImages && this.afterImages.length > 0) {
      this.afterImages.forEach(img => {
        const alpha = img.timer / 20.0;
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.translate(img.x, img.y);
        ctx.beginPath();
        ctx.arc(0, 0, this.r, 0, Math.PI * 2);
        ctx.fillStyle = img.color || this.color;
        ctx.fill();
        ctx.restore();
      });
    }

    super.draw(ctx);
    
    // Draw debris that is currently IN FRONT of the Trickster
    this._drawDebrisLayer(ctx, false);

    // Draw telekinesis visual
    if (this.tkTarget && this.tkTimer > 0) {
      ctx.save();
      const dx = this.tkTarget.x - this.x;
      const dy = this.tkTarget.y - this.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(angle);
      
      ctx.globalCompositeOperation = 'lighter';
      
      // Draw swirling magical ribbons
      const timeStr = Date.now() / 150;
      
      // Two overlapping animated sine waves
      for (let w = 0; w < 2; w++) {
        ctx.beginPath();
        for (let i = 0; i <= dist; i += 10) {
          const amplitude = Math.sin((i / dist) * Math.PI) * 12; // Thickest in the middle
          const offset = Math.sin(timeStr * (w === 0 ? 1 : -1.2) + i * 0.05) * amplitude;
          if (i === 0) ctx.moveTo(i, offset);
          else ctx.lineTo(i, offset);
        }
        ctx.lineTo(dist, 0); // Connect precisely to target
        
        ctx.strokeStyle = w === 0 ? 'rgba(50, 255, 120, 0.8)' : 'rgba(50, 220, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.stroke();
      }
      
      ctx.restore();
      
      // Draw soft transparent green shadow indicator
      ctx.save();
      
      const radius = this.tkTarget.r * 1.5;
      const gradient = ctx.createRadialGradient(this.tkDropX, this.tkDropY, 0, this.tkDropX, this.tkDropY, radius);
      gradient.addColorStop(0, 'rgba(50, 255, 120, 0.4)');
      gradient.addColorStop(0.5, 'rgba(50, 255, 120, 0.2)');
      gradient.addColorStop(1, 'rgba(50, 255, 120, 0)');
      
      ctx.beginPath();
      ctx.arc(this.tkDropX, this.tkDropY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      ctx.restore();
      
      ctx.restore();
    }
    
    // If copied a skill, draw a faint aura of the copied class
    if (this.stolenType) {
       ctx.save();
       ctx.beginPath();
       ctx.arc(this.x, this.y, this.r + 8, 0, Math.PI * 2);
       ctx.strokeStyle = `rgba(0, 255, 0, ${0.3 + Math.sin(Date.now()/100)*0.2})`;
       ctx.lineWidth = 2;
       ctx.stroke();
       ctx.restore();
    }
    
    // Draw stolen Cronos pre-activation barrier
    if (this.stolenType === 'cronos' && typeof drawCronosPreActivateBarrier !== 'undefined') {
      const stolenSphereReady = !this.sphereActive && this.stolenSkillCooldown <= 0;
      const inPreWindow = this.stolenSkillCooldown > 0 && this.stolenSkillCooldown <= (CONFIG.cronos.spherePreActivateFrames || 30);
      
      if (stolenSphereReady || inPreWindow) {
        const now = Date.now();
        const progress = stolenSphereReady 
          ? 1  // full intensity when fully charged
          : 1 - this.stolenSkillCooldown / Math.max(1, (CONFIG.cronos.spherePreActivateFrames || 30));
          
        const barrierRadius = Math.max(this.r * 1.5, 55);
        
        drawCronosPreActivateBarrier({
          ctx,
          x: this.x,
          y: this.y,
          radius: barrierRadius,
          progress: progress,
          pulsePhase: now / 300,
          energyColor: this.stolenColor || '#00F3FF',
          shieldColor: 'rgba(0, 243, 255, 0.15)'
        });
      }
    }

    // Update and draw slash effects
    if (this.slashEffects && this.slashEffects.length > 0) {
      this.slashEffects.forEach(effect => {
        const prog = 1 - (effect.timer / effect.maxTimer);
        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle);
        
        // For Trickster's stolen ability, all slashes are a magical arcane green
        let color = '#00FF64';
        
        ctx.globalAlpha = 1 - prog;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        
        if (effect.type.startsWith('slash')) {
          const size = effect.size * (0.6 + 0.6 * prog);
          const thick = (1 - Math.pow(prog, 1.5)) * (effect.type === 'slash_katana' ? 28 : 18);
          
          const drawCrescent = (radius, thickness, angleSpread) => {
             ctx.beginPath();
             const startX = radius * Math.cos(-angleSpread);
             const startY = radius * Math.sin(-angleSpread);
             const endX = radius * Math.cos(angleSpread);
             const endY = radius * Math.sin(angleSpread);
             
             ctx.moveTo(startX, startY);
             ctx.quadraticCurveTo(radius + thickness * 1.5, 0, endX, endY);
             ctx.quadraticCurveTo(radius - thickness * 0.5, 0, startX, startY);
             ctx.closePath();
          };

          ctx.shadowBlur = 25;
          ctx.shadowColor = color;
          ctx.fillStyle = color;
          drawCrescent(size, thick, 1.3);
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.fillStyle = '#0a0a0a';
          drawCrescent(size * 0.98, thick * 0.75, 1.15);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          drawCrescent(size * 0.96, thick * 0.35, 1.0);
          ctx.fill();
        }
        
        ctx.restore();
      });
    }

    if (typeof this._drawStaffTrail === 'function') {
      this._drawStaffTrail(ctx);
    }
  }

  resolveWallBounce(arena, opponent) {
    if (this.sphereActive) {
      resolveStolenCronosWallBounce(this, arena, opponent);
    } else if (this.stolenType === 'berserker' && opponent) {
      let bounced = false;
      if (this.x - this.r < arena.x) { this.x = arena.x + this.r; bounced = true; }
      else if (this.x + this.r > arena.x + arena.width) { this.x = arena.x + arena.width - this.r; bounced = true; }

      if (this.y - this.r < arena.y) { this.y = arena.y + this.r; bounced = true; }
      else if (this.y + this.r > arena.y + arena.height) { this.y = arena.y + arena.height - this.r; bounced = true; }

      if (bounced) {
        if (typeof this.playWallBounceSound === 'function') this.playWallBounceSound();
        const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;

        // Snap toward a point *away* from opponent to tighten the fight
        const dx = this.x - opponent.x; 
        const dy = this.y - opponent.y;
        const dist = Math.hypot(dx, dy) || 1;
        const awayDist = CONFIG.berserker.rageRebounceAwayDistance ?? 0;
        
        const targetX = opponent.x - (dx / dist) * awayDist;
        const targetY = opponent.y - (dy / dist) * awayDist;

        const hx = targetX - this.x;
        const hy = targetY - this.y;
        const hDist = Math.hypot(hx, hy) || 1;

        this.vx = (hx / hDist) * currentSpeed;
        this.vy = (hy / hDist) * currentSpeed;
      }
    } else {
      super.resolveWallBounce(arena, opponent);
    }
  }

  _drawDebrisLayer(ctx, drawBehind) {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    for (const debris of this.orbitingDebris) {
      const isBehind = Math.sin(debris.angle) < 0;
      if (isBehind !== drawBehind) continue;
      
      const px = Math.cos(debris.angle) * debris.dist;
      const py = Math.sin(debris.angle) * debris.dist * 0.5; // Oval orbit for isometric perspective
      
      // Calculate floating height independently for each rock
      const pz = this.z + Math.sin(debris.zPhase) * 12;
      
      ctx.save();
      // Apply position and Z-height subtraction
      ctx.translate(px, py - pz);
      ctx.rotate(debris.rotation);
      
      const s = debris.size;
      
      // Base dark rock polygon
      ctx.beginPath();
      ctx.moveTo(-s, -s * 0.5);
      ctx.lineTo(-s * 0.3, -s * 0.9);
      ctx.lineTo(s * 0.7, -s * 0.6);
      ctx.lineTo(s, s * 0.3);
      ctx.lineTo(s * 0.4, s * 0.8);
      ctx.lineTo(-s * 0.7, s * 0.7);
      ctx.closePath();
      ctx.fillStyle = `rgba(15, 20, 15, 1)`;
      ctx.fill();
      
      // Light texture polygon
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, -s * 0.4);
      ctx.lineTo(-s * 0.3, -s * 0.8);
      ctx.lineTo(s * 0.6, -s * 0.5);
      ctx.lineTo(s * 0.1, s * 0.1);
      ctx.lineTo(-s * 0.5, 0);
      ctx.closePath();
      ctx.fillStyle = debris.color;
      ctx.fill();
      
      // Magical edge outline
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(0, 255, 100, 0.4)`;
      ctx.stroke();
      
      ctx.restore();
    }
    
    ctx.restore();
  }
}
