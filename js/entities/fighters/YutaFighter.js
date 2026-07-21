import { Fighter } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { playSound } from '../../systems/soundSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { initRika, updateRika } from './yuta/rikaLogic.js';
import { getNextCopiedTechnique, executeCopiedTechnique } from './yuta/yutaCopyLogic.js';
import { projectileSystem } from '../../systems/projectileSystem.js';

export class YutaFighter extends Fighter {
  constructor(def) {
    super(def);
    this.meleeCooldownMax = CONFIG.yuta.meleeCooldown || 50;
    this.meleeCooldown = 0;
    this.swordTrail = [];
    this.trailGenTimer = 0;
    this.swordGlowAlpha = 0;
    
    // Domain Expansion
    this.domainCooldown = CONFIG.yuta.domainCooldown || 1500;
    this.domainActive = false;
    this.domainTimer = 0;
    this.domainChargeTimer = 0;
    this.domainChargeMax = CONFIG.yuta.domainChargeMax || 90;
    this.isChannelingDomain = false;
    
    this.techniqueCooldown = this.cooldown;
    this.copiedTechniqueIndex = 0;
    
    this.slashFadeTimer = 0;
    this.cursedEnergyAlpha = 0; // Smooth transition multiplier for Rika cursed energy aura

    // Disable Fighter.js base shoot cooldown so we can handle it ourselves
    this.shootCooldownMax = 0; 
    this.shootCooldown = 0;

    initRika(this);

    // RCT Revival
    this.hasUsedRCTRevival = false;
    this.rctRevivalTimer = 0;

    // Phantom Flurry
    this.parryCount = 0;
    this.targetParriesForFlurry = this._getRandomParryThreshold();
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this.afterImages = [];
    this.posHistory = [];
    this.sakugaImpactTimer = 0;
    this.sakugaImpactMaxTimer = 6;
    this.sakugaImpactX = 0;
    this.sakugaImpactY = 0;
    this.sakugaImpactAngle = 0;
    this.sakugaImpactSeed = 0;
  }

  _getRandomParryThreshold() {
    const min = CONFIG.yuta.flurryParryMin || 5;
    const max = CONFIG.yuta.flurryParryMax || 7;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  reset() {
    super.reset();
    this.hasUsedRCTRevival = false;
    this.rctRevivalTimer = 0;
    this.parryCount = 0;
    this.targetParriesForFlurry = this._getRandomParryThreshold();
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this.afterImages = [];
    this.posHistory = [];
    this.sakugaImpactTimer = 0;
  }

  update(opponent, ownerIndex, arena, updateProjectiles = true) {
    // If reviving, handle RCT and skip normal logic
    if (this.rctRevivalTimer > 0) {
      this.rctRevivalTimer--;
      this.vx = 0;
      this.vy = 0;
      
      const healAmount = this.maxHp / (CONFIG.yuta.rctRevivalDuration || 150);
      this.hp = Math.min(this.maxHp, this.hp + healAmount);
      
      if (this.rctRevivalTimer % 5 === 0) {
        spawnSparks(this.x, this.y, 3, '#88FF88', '#00FF00'); // Hex colors
        if (this.rctRevivalTimer % 30 === 0) {
          spawnFloatingText(this.x, this.y - 20, '+RCT', '#00FF00'); // Pop up healing text
        }
      }
      
      if (this.rctRevivalTimer === 0) {
        spawnFloatingText(this.x, this.y - 40, 'RCT COMPLETE', '#88FF88');
        triggerGlobalScreenShake(5, 10);
        spawnImpactFlash(this.x, this.y, 50, 'silver'); // Safe flash color
      }
      
      // Update pos manually since we skip super.update()
      this.x += this.vx;
      this.y += this.vy;
      
      // Bound to arena
      if (arena) {
        if (this.x < arena.x) this.x = arena.x;
        if (this.x > arena.x + arena.width) this.x = arena.x + arena.width;
        if (this.y < arena.y) this.y = arena.y;
        if (this.y > arena.y + arena.height) this.y = arena.y + arena.height;
      }
      return;
    }

    super.update(opponent, ownerIndex, arena, updateProjectiles);

    if (this.sakugaImpactTimer > 0) this.sakugaImpactTimer--;

    // Track position history for delayed auto-aim during flurry
    if (!this.posHistory) this.posHistory = [];
    this.posHistory.push({ x: this.x, y: this.y });
    if (this.posHistory.length > 30) this.posHistory.shift();

    // Phantom Flurry Execution Logic
    if (this.flurryHitsLeft > 0) {
      this.flurryGhost = this.posHistory[0] || { x: this.x, y: this.y };
      this.vx *= 0.1;
      this.vy *= 0.1;

      if (this.flurryTimer > 0) this.flurryTimer--;
      if (this.flurryTimer <= 0) {
        this.flurryHitsLeft--;
        this.flurryTimer = CONFIG.yuta.flurryHitInterval || 6;
        if (this.flurryHitsLeft <= 0) {
          this.flurryGhost = null;
          this.flurryTarget = null;
          return; // Flurry finished
        }

        if (this.flurryTarget && !this.flurryTarget.isDead) {
          this.gunAngle = Math.random() * Math.PI * 2;
          this.activeSlashType = (this.activeSlashType === undefined) ? 0 : (this.activeSlashType + 1) % 3;
          this.trailGenTimer = 40;
          this.meleeCooldown = this.meleeCooldownMax; // trigger swing animation

          this.flurryTarget.takeDamage(CONFIG.yuta.flurryDamage || 8, this, { isMelee: true });
          this.flurryTarget.applyHitStun(15);
          
          spawnFloatingText(this.flurryTarget.x, this.flurryTarget.y - 10, 'SLASH!', '#FF1493');
          triggerGlobalScreenShake(6, 6);
          spawnSparks(this.flurryTarget.x, this.flurryTarget.y, 30, 'silver', 'rgba(255, 20, 147, 1)');

          const flurryAngle = Math.atan2(this.flurryTarget.y - this.y, this.flurryTarget.x - this.x);
          this.flurryTarget.vx += Math.cos(flurryAngle) * 2;
          this.flurryTarget.vy += Math.sin(flurryAngle) * 2;

          // Teleport
          const angle = Math.random() * Math.PI * 2;
          const dist = this.flurryTarget.r + this.r + 15;
          const oldX = this.x;
          const oldY = this.y;
          this.x = this.flurryTarget.x + Math.cos(angle) * dist;
          this.y = this.flurryTarget.y + Math.sin(angle) * dist;

          if (!this.afterImages) this.afterImages = [];
          this.afterImages.push({ x: oldX, y: oldY, timer: 8 });

          spawnImpactFlash(oldX, oldY, 15, 'silver');
          spawnImpactFlash(this.x, this.y, 20, 'silver');

          // Play sword swing sound
          const swingSnd = getBasicAttackSound(this.id, this._def?.type);
          if (swingSnd) {
             playSound(swingSnd.src, swingSnd.volume);
          } else {
             playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 0.6);
          }

          if (typeof this.applyTimeStop === 'function') this.applyTimeStop(6);
          if (typeof this.flurryTarget.applyTimeStop === 'function') this.flurryTarget.applyTimeStop(6);

          this.sakugaImpactTimer = 6;
          this.sakugaImpactMaxTimer = 6;
          this.sakugaImpactX = this.flurryTarget.x;
          this.sakugaImpactY = this.flurryTarget.y;
          this.sakugaImpactAngle = Math.random() * Math.PI * 2;
          this.sakugaImpactSeed = Math.random();
        } else {
          this.flurryHitsLeft = 0;
        }
      }

      this.x += this.vx;
      this.y += this.vy;
      if (this.afterImages) {
        for (let i = this.afterImages.length - 1; i >= 0; i--) {
          if (--this.afterImages[i].timer <= 0) this.afterImages.splice(i, 1);
        }
      }
      return; 
    }

    // Smoothly fade Yuta's cursed energy in when Rika is active / domain is active, and out when done
    const isCountdown = (typeof state !== 'undefined' && state.gameState === 'countdown');
    const targetAura = (this.isChannelingDomain || this.domainActive || (this.rika && this.rika.active) || isCountdown) ? 1.0 : 0.0;
    if (this.cursedEnergyAlpha === undefined) this.cursedEnergyAlpha = 0;
    if (this.cursedEnergyAlpha < targetAura) {
      this.cursedEnergyAlpha = Math.min(targetAura, this.cursedEnergyAlpha + 0.04); // Fades in over ~25 frames
    } else if (this.cursedEnergyAlpha > targetAura) {
      this.cursedEnergyAlpha = Math.max(targetAura, this.cursedEnergyAlpha - 0.04); // Fades out
    }
    
    // Smoothly transition Yuta's sword glow alpha
    const maxCd_glow = this.meleeCooldownMax;
    const isSwinging_glow = (this.meleeCooldown > maxCd_glow - 15);
    const isBlocking_glow = (this.blockPoseTimer > 0);
    const targetGlow = (isSwinging_glow || isBlocking_glow) ? 1.0 : (this.cursedEnergyAlpha || 0);
    
    if (this.swordGlowAlpha === undefined) this.swordGlowAlpha = 0;
    if (this.swordGlowAlpha < targetGlow) {
      this.swordGlowAlpha = Math.min(targetGlow, this.swordGlowAlpha + 0.15); // Fast rise for snappy activation
    } else if (this.swordGlowAlpha > targetGlow) {
      this.swordGlowAlpha = Math.max(targetGlow, this.swordGlowAlpha - 0.06); // Smooth decay over ~16 frames (no snapping)
    }

    // Passive RCT Healing
    if (this.hp > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + (CONFIG.yuta.regenRate || 0.05));
      
      // Visual feedback for passive healing (spawns 1-2 times per second)
      if (Math.random() < 0.03) {
        spawnSparks(this.x, this.y, 1, '#88FF88', '#00FF00');
        spawnFloatingText(this.x, this.y - 20, '+1', '#00FF00');
      }
    }

    // Update Yuta's dynamic sword trail history
    if (this.swordTrail) {
      for (let i = this.swordTrail.length - 1; i >= 0; i--) {
        this.swordTrail[i].life -= 0.09; // Faster decay (fades in ~11 frames) for a tighter, quicker tail
        if (this.swordTrail[i].life <= 0) {
          this.swordTrail.splice(i, 1);
        }
      }
    }

    if (this.meleeCooldown > 0) {
      const maxCd = this.meleeCooldownMax;
      this.meleeCooldown--;
      if (this.meleeCooldown === maxCd - 15) {
        this.slashFadeTimer = 15;
      }
    }

    // Capture sword tip positions continuously after swinging to let the trail follow the sword tip
    if (this.trailGenTimer > 0) {
      this.trailGenTimer--;
      
      const pos = this._getKatanaTipPositions();
      
      let shouldAdd = true;
      if (this.swordTrail.length > 0) {
        const last = this.swordTrail[this.swordTrail.length - 1];
        const dist = Math.hypot(pos.outer.x - last.outer.x, pos.outer.y - last.outer.y);
        if (dist < 1.0) {
          shouldAdd = false; // Don't stack points if standing still
        }
      }
      
      if (shouldAdd) {
        this.swordTrail.push({
          outer: pos.outer,
          inner: pos.inner,
          life: 1.0
        });
      }
      
      // Keep trail capped for performance and styling
      if (this.swordTrail.length > 16) {
        this.swordTrail.shift();
      }
    }

    if (this.slashFadeTimer > 0) {
      this.slashFadeTimer--;
    }
    
    if (this.techniqueCooldown > 0) this.techniqueCooldown--;
    if (this.domainCooldown > 0 && !this.domainActive) this.domainCooldown--;

    if (this.isChannelingDomain) {
      // Only lock Yuta in place when he is NOT being knocked back by an attack.
      // If he has active knockback or hitstun, let the physics push him around
      // so Gojo/Sukuna rapid punches visibly stagger him.
      const hasKnockback = (Math.abs(this.knockbackVx || 0) > 0.5 || Math.abs(this.knockbackVy || 0) > 0.5);
      const isStunned    = (this.hitStunTimer > 0);
      if (!hasKnockback && !isStunned) {
        this.vx = 0;
        this.vy = 0;
      }

      // Interrupt domain charge if Yuta was just hit hard enough
      if (isStunned && this.hitStunTimer >= 10) {
        // Cancel the domain channel — the enemy disrupted his concentration
        this.isChannelingDomain = false;
        this.domainChargeTimer = 0;
        spawnFloatingText(this.x, this.y - 30, 'INTERRUPTED!', '#FF4444');
        spawnSparks(this.x, this.y, 6, 'silver');
        // Give partial cooldown refund so he can try again sooner
        this.domainCooldown = Math.floor((CONFIG.yuta.domainCooldown || 1500) * 0.4);
        return;
      }

      this.domainChargeTimer++;
      
      // Spawn some charge particles
      if (this.domainChargeTimer % 5 === 0) {
        spawnSparks(this.x, this.y, 2, 'silver');
      }

      if (this.domainChargeTimer >= this.domainChargeMax) {
        this.activateDomain();
      }
      return; // Stop other logic while channeling
    }

    if (this.domainActive) {
      this.domainTimer--;
      if (this.domainTimer <= 0) {
        this.domainActive = false;
        this.domainCooldown = CONFIG.yuta.domainCooldown || 1500;
        spawnFloatingText(this.x, this.y - 40, 'DOMAIN ENDED', '#cccccc');
      } else {
        // Domain buffs: Faster cooldowns
        if (this.techniqueCooldown > 0) {
           this.techniqueCooldown -= (1 / (1 - (CONFIG.yuta.domainCooldownReduction || 0.8))) - 1;
        }
      }
    }

    updateRika(this, arena || CONFIG.arena);

    // Domain expansion activation check
    if (this.domainCooldown <= 0 && !this.domainActive && !this.isChannelingDomain && this.hp > 0) {
      const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
      const hasEnemies = state.fighters.some((f, idx) => {
        if (!f || f.hp <= 0 || f === this) return false;
        const eTeam = state.getFighterTeam(idx);
        return myTeam === null || eTeam === null || myTeam !== eTeam;
      });

      if (hasEnemies) {
        this.isChannelingDomain = true;
        this.domainChargeTimer = 0;
        this.vx = 0;
        this.vy = 0;
        // playSound('Assets/Sound Effects/Skills/domainexpansion.mp3', 0.8);
        spawnFloatingText(this.x, this.y - 30, 'DOMAIN EXPANSION', '#FFFFFF');
      }
    }

    // --- Hyper-armor Melee Override ---
    // Allow Yuta to swing his katana even while in hitstun if an enemy is close,
    // so he doesn't get infinitely stun-locked by Gojo or Sukuna's rapid punches.
    if (this.hitStunTimer > 0 && !this.isChannelingDomain && this.hp > 0 && this.meleeCooldown <= 0) {
      let enemyInMelee = false;
      const range = CONFIG.yuta.meleeRange || 75;
      const arc = CONFIG.yuta.meleeArc || (Math.PI / 2);
      const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
      
      // Auto-aim if stunned because super.update() skips aim() during hitStun
      if (opponent) {
        this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      }

      for (let i = 0; i < state.fighters.length; i++) {
        const enemy = state.fighters[i];
        if (!enemy || enemy.hp <= 0 || enemy === this || enemy.invincibilityTimer > 0) continue;
        
        const enemyTeam = state.getFighterTeam(i);
        if (myTeam !== null && enemyTeam !== null && myTeam === enemyTeam) continue;

        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= range + enemy.r) {
          const enemyAngle = Math.atan2(dy, dx);
          let angleDiff = Math.abs(enemyAngle - this.gunAngle);
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          angleDiff = Math.abs(angleDiff);

          if (angleDiff <= arc / 2) {
            enemyInMelee = true;
            break;
          }
        }
      }

      if (enemyInMelee) {
        this.executeKatanaMelee(this.gunAngle);
      }
    }

    // --- Defensive Parry Anticipation ---
    // If Yuta is not actively swinging and isn't already holding a pose,
    // he detects incoming threats and raises his guard visually.
    if (this.hp > 0 && !this.isChannelingDomain) {
      const isSwinging = (this.meleeCooldown > this.meleeCooldownMax - 15);
      if (!isSwinging && (this.blockPoseTimer === undefined || this.blockPoseTimer <= 0)) {
        let incomingThreat = false;
        let threatX = 0, threatY = 0;
        const myIndex = state.fighters.indexOf(this);
        const myTeam = state.getFighterTeam(myIndex);
        
        // 1. Check for incoming projectiles
        const projectiles = projectileSystem.getActiveProjectiles();
        for (let i = 0; i < projectiles.length; i++) {
          const proj = projectiles[i];
          if (proj.type === 'visual' || proj.ownerIndex === myIndex) continue;
          
          const projTeam = state.getFighterTeam(proj.ownerIndex);
          if (myTeam !== null && projTeam !== null && myTeam === projTeam) continue;
          
          const dist = Math.hypot(proj.x - this.x, proj.y - this.y);
          const threatRad = CONFIG.yuta.parryThreatRadius || 180;
          if (dist < threatRad) { // Detection radius for projectiles
            incomingThreat = true;
            threatX = proj.x;
            threatY = proj.y;
            break;
          }
        }
        
        // 2. Check for nearby enemies (if melee is on cooldown and we can't just swing at them)
        if (!incomingThreat && this.meleeCooldown > 0) {
          for (let i = 0; i < state.fighters.length; i++) {
            const enemy = state.fighters[i];
            if (!enemy || enemy.hp <= 0 || enemy === this) continue;
            const enemyTeam = state.getFighterTeam(i);
            if (myTeam !== null && enemyTeam !== null && myTeam === enemyTeam) continue;
            
            const meleeThreatRad = CONFIG.yuta.parryMeleeThreatRadius || 120;
            if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < meleeThreatRad) {
              incomingThreat = true;
              threatX = enemy.x;
              threatY = enemy.y;
              break;
            }
          }
        }

        if (incomingThreat) {
          this.blockPoseTimer = CONFIG.yuta.parryAnticipationDuration || 45; // Raise guard visually
          // Turn to face the threat to make the block look intentional
          this.gunAngle = Math.atan2(threatY - this.y, threatX - this.x);
        }
      }
    }

    // Phantom flurry trigger logic is now handled in takeDamage() when he parries
  }

  takeDamage(amount, attacker, opts = {}) {
    // 25% chance to block if not currently swinging his sword (85% if actively guarding)
    const maxCd = this.meleeCooldownMax;
    const isSwinging = (this.meleeCooldown > maxCd - 15);
    
    // Ignore unblockable damage types (including Gojo's purple orb)
    const unblockable = opts.isPoison || opts.isBurn || opts.isFlame || opts.fromBlackHole || (opts.projectile && opts.projectile.type === 'purple');
    
    const isGuarding = this.blockPoseTimer > 0;
    const blockChance = isGuarding ? (CONFIG.yuta.parryActiveChance ?? 0.85) : (CONFIG.yuta.parryPassiveChance ?? 0.25);
    
    if (!isSwinging && !unblockable && this.hp > 0 && Math.random() < blockChance) {
      // Successfully blocked!
      this.parryCount++;
      if (this.parryCount >= this.targetParriesForFlurry && attacker && !attacker.isDead && !this.isChannelingDomain) {
        this.parryCount = 0;
        this.targetParriesForFlurry = this._getRandomParryThreshold();
        
        this.flurryHitsLeft = CONFIG.yuta.flurryHits || 5;
        this.flurryTimer = 0;
        this.flurryTarget = attacker;

        const dx = attacker.x - this.x;
        const dy = attacker.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        const oldX = this.x;
        const oldY = this.y;

        this.flurryGhost = { x: oldX, y: oldY };
        this.x = attacker.x + (dx / dist) * (this.r + attacker.r + 5);
        this.y = attacker.y + (dy / dist) * (this.r + attacker.r + 5);

        spawnImpactFlash(oldX, oldY, 25, 'silver');
        spawnImpactFlash(this.x, this.y, 30, 'silver');
        triggerGlobalScreenShake(8, 10);

        spawnFloatingText(this.x, this.y - 30, 'PHANTOM FLURRY!', '#FF1493');
        const attackSound = getBasicAttackSound('musashi');
        if (attackSound) playSound(attackSound.src, attackSound.volume);
        
        return 0; // Return early, damage blocked, flurry started
      }

      this.blockPoseTimer = CONFIG.yuta.parryGuardDuration || 90; // Hold block pose
      this.parryType = Math.random() < 0.20 ? 'guard' : 'deflect'; // Choose visual parry pose (80% deflection, 20% guard)
      this.trailGenTimer = this.parryType === 'deflect' ? 40 : 0;  // Generate a tip trail for 40 frames (~0.66s)
      
      // Spawn block sparks exactly along the katana blade's position
      const bladeAngle = this.gunAngle + Math.PI / 2;
      const baseDist = this.r - 18;
      const hiltX = this.x + Math.cos(this.gunAngle) * baseDist;
      const hiltY = this.y + Math.sin(this.gunAngle) * baseDist;
      
      // Spawn 12 sparks distributed along the blade length
      for (let i = 0; i < 12; i++) {
        // Blade starts around 25px from hilt and goes to ~90px
        const bladeOffset = 25 + Math.random() * 65; 
        const sparkX = hiltX + Math.cos(bladeAngle) * bladeOffset;
        const sparkY = hiltY + Math.sin(bladeAngle) * bladeOffset;
        
        // Pass pink color for Yuta's cursed energy parry sparks
        spawnSparks(sparkX, sparkY, 1, 'silver', 'rgba(255, 20, 147, 1)');
      }
      
      // Spawn a main dark impact flash at the midpoint of Yuta's guard
      const flashX = hiltX + Math.cos(bladeAngle) * 55;
      const flashY = hiltY + Math.sin(bladeAngle) * 55;
      spawnImpactFlash(flashX, flashY, 55, 'dark');
      
      triggerGlobalScreenShake(4, 10); // Parry shake
      
      // Play block sound
      const parrySnd = getSkillSound(this.id, 'parry');
      if (parrySnd) {
        playSound(parrySnd.src, parrySnd.volume);
      } else {
        playSound('Assets/Sound Effects/Skills/parry.mp3', 0.65);
      }
      
      // Spawn floating block text
      spawnFloatingText(this.x, this.y - 30, 'BLOCKED!', '#E5E8E8');
      
      // We mitigated the damage! Return false to indicate no damage was taken.
      return false;
    }

    // Otherwise, take damage normally
    this.blockPoseTimer = 0; // Guard is broken/dropped on hit!
    
    // Check for fatal blow to trigger RCT Revival
    if (!this.hasUsedRCTRevival && this.invincibilityTimer <= 0 && amount > 0) {
      if (this.hp - amount <= 0 && this.hp > 0) {
        this.hasUsedRCTRevival = true;
        const duration = CONFIG.yuta.rctRevivalDuration || 150; // 2.5 seconds by default
        this.rctRevivalTimer = duration; 
        this.invincibilityTimer = duration; // Protect while reviving
        this.hp = 1; // Survive at 1 HP
        
        spawnFloatingText(this.x, this.y - 40, 'RCT REVIVAL!', '#88FF88');
        triggerGlobalScreenShake(10, 15);
        
        // We absorbed the fatal blow
        return true; 
      }
    }

    return super.takeDamage(amount, attacker, opts);
  }

  activateDomain() {
    this.isChannelingDomain = false;
    this.domainActive = true;
    this.domainTimer = CONFIG.yuta.domainDuration || 400;
    triggerGlobalScreenShake(10, 20);
    spawnFloatingText(this.x, this.y - 50, 'AUTHENTIC MUTUAL LOVE', '#ffb6c1');
    // playSound('Assets/Sound Effects/Skills/yutadomaindeploy.mp3', 0.8); // If added
  }

  aim(opponent) {
    if (opponent) {
      // Auto-lock aim to the target
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    } else {
      this.gunAngle = this.angle;
    }
  }

  shoot(ownerIndex) {
    if (this.isChannelingDomain) return;
    if (this.timeStopTimer > 0) return;
    if (this.hp <= 0) return;

    // Check if an enemy is in melee range
    let enemyInMelee = false;
    const range = CONFIG.yuta.meleeRange || 75;
    const arc = CONFIG.yuta.meleeArc || (Math.PI / 2);
    const myTeam = state.getFighterTeam(state.fighters.indexOf(this));

    for (let i = 0; i < state.fighters.length; i++) {
      const enemy = state.fighters[i];
      if (!enemy || enemy.hp <= 0 || enemy === this || enemy.invincibilityTimer > 0) continue;
      
      const enemyTeam = state.getFighterTeam(i);
      if (myTeam !== null && enemyTeam !== null && myTeam === enemyTeam) continue;

      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= range + enemy.r) {
        const enemyAngle = Math.atan2(dy, dx);
        let angleDiff = Math.abs(enemyAngle - this.gunAngle);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        angleDiff = Math.abs(angleDiff);

        if (angleDiff <= arc / 2) {
          enemyInMelee = true;
          break;
        }
      }
    }

    if (enemyInMelee && this.meleeCooldown <= 0) {
      this.executeKatanaMelee(this.gunAngle);
      return;
    }

    // Ranged attack (Copied Technique)
    if (this.techniqueCooldown <= 0) {
      this.targetAngle = this.gunAngle;
      executeCopiedTechnique(this, this.gunAngle);
      this.techniqueCooldown = this.cooldown;
      
      // Cycle to next technique
      getNextCopiedTechnique(this);
    }
  }

  executeKatanaMelee(angle) {
    this.blockPoseTimer = 0; // Drop guard instantly if he swings
    this.meleeCooldown = this.meleeCooldownMax;
    this.targetAngle = angle;
    this.activeSlashType = (this.activeSlashType === undefined) ? 0 : (this.activeSlashType + 1) % 3;
    this.trailGenTimer = 40; // Generate trail at tip for 40 frames (~0.66s)

    // Play swing sound (using Fighter's standard delay queue)
    const swingSnd = getBasicAttackSound(this.id, this._def?.type);
    if (swingSnd) {
      this._attackSoundTimer = swingSnd.delay;
      this._attackSoundConfig = swingSnd;
    }

    const range = CONFIG.yuta.meleeRange || 75;
    const damage = CONFIG.yuta.meleeDamage || 15;
    const arc = CONFIG.yuta.meleeArc || (Math.PI / 2);

    let hitSomeone = false;
    const myTeam = state.getFighterTeam(state.fighters.indexOf(this));

    for (let i = 0; i < state.fighters.length; i++) {
      const enemy = state.fighters[i];
      if (!enemy || enemy.hp <= 0 || enemy === this || enemy.invincibilityTimer > 0) continue;
      
      const enemyTeam = state.getFighterTeam(i);
      if (myTeam !== null && enemyTeam !== null && myTeam === enemyTeam) continue;

      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= range + enemy.r) {
        const enemyAngle = Math.atan2(dy, dx);
        let angleDiff = Math.abs(enemyAngle - this.targetAngle);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        angleDiff = Math.abs(angleDiff);

        if (angleDiff <= arc / 2) {
          enemy.takeDamage(damage, this, { isPhysical: true });
          hitSomeone = true;
          
          spawnImpactFlash(enemy.x, enemy.y, 25);
          spawnBloodEffect(enemy, 10, this.targetAngle);

          const pushForce = 5;
          enemy.vx += Math.cos(this.targetAngle) * pushForce;
          enemy.vy += Math.sin(this.targetAngle) * pushForce;

          // Check for clash with Gojo or Sukuna
          if (enemy._def && (enemy._def.id === 'sukuna' || enemy._def.name === 'SukunaFighter' || enemy._def.id === 'gojo' || enemy._def.name === 'GojoFighter')) {
            const midX = (this.x + enemy.x) / 2;
            const midY = (this.y + enemy.y) / 2;
            spawnMeleeClashShockwave(midX, midY, 100);
            triggerGlobalScreenShake(8, 10);
          }
        }
      }
    }

    if (hitSomeone) {
      // playSound(getBasicAttackSound('hit'), 0.5);
    } else {
      // playSound(getBasicAttackSound('miss'), 0.3);
    }
  }

  _getKatanaTipPositions() {
    const maxCd = this.meleeCooldownMax;
    const isSwinging = (this.meleeCooldown > maxCd - 15);
    
    let currentAngle = this.gunAngle;
    const comboIndex = this.activeSlashType || 0;
    
    if (isSwinging) {
      const progress = (maxCd - this.meleeCooldown) / 15;
      if (comboIndex === 0) {
        currentAngle += (-Math.PI/4) + (Math.PI/2) * progress;
      } else if (comboIndex === 1) {
        currentAngle += (Math.PI/4) - (Math.PI/2) * progress;
      } else if (comboIndex === 2) {
        currentAngle += (-Math.PI*0.6) + (Math.PI*1.2) * progress;
      }
    }
    
    let tipX, tipY, innerX, innerY;
    
    if (this.blockPoseTimer > 0 && !isSwinging) {
      const parryType = this.parryType || 'guard';
      if (parryType === 'deflect') {
        const totalDur = CONFIG.yuta.parryGuardDuration || 90;
        const swingDur = 8; // Super fast deflect swing (8 frames)
        
        let swingProgress = Math.min(1.0, (totalDur - this.blockPoseTimer) / swingDur);
        let returnProgress = Math.max(0, (12 - this.blockPoseTimer) / 12); // Snappy return (12 frames)
        
        let deflectAngle = 0;
        let currentTranslateX = this.r - 10;
        
        if (swingProgress < 1.0) {
          deflectAngle = (Math.PI / 3.5) - (Math.PI * 0.6) * swingProgress;
          currentTranslateX = (this.r - 10) + 15 * swingProgress;
        } else {
          deflectAngle = (-Math.PI / 4) * (1 - returnProgress);
          currentTranslateX = (this.r - 10) + 15 * (1 - returnProgress);
        }
        
        const L = currentTranslateX + 81 * 1.2;
        const finalAngle = currentAngle + deflectAngle;
        
        tipX = this.x + Math.cos(finalAngle) * L;
        tipY = this.y + Math.sin(finalAngle) * L;
        
        const innerL = L - 25;
        innerX = this.x + Math.cos(finalAngle) * innerL;
        innerY = this.y + Math.sin(finalAngle) * innerL;
      } else {
        // Static Guard Pose: perpendicular guard
        const bladeAngle = currentAngle + Math.PI / 2;
        const baseDist = this.r - 18;
        const hiltX = this.x + Math.cos(currentAngle) * baseDist;
        const hiltY = this.y + Math.sin(currentAngle) * baseDist;
        
        const L = 81 * 1.2;
        tipX = hiltX + Math.cos(bladeAngle) * L;
        tipY = hiltY + Math.sin(bladeAngle) * L;
        
        const innerL = L - 25;
        innerX = hiltX + Math.cos(bladeAngle) * innerL;
        innerY = hiltY + Math.sin(bladeAngle) * innerL;
      }
    } else {
      // Normal / Swing position
      const L = (this.r - 10) + 81 * 1.2;
      tipX = this.x + Math.cos(currentAngle) * L;
      tipY = this.y + Math.sin(currentAngle) * L;
      
      const innerL = L - 25;
      innerX = this.x + Math.cos(currentAngle) * innerL;
      innerY = this.y + Math.sin(currentAngle) * innerL;
    }
    
    return {
      outer: { x: tipX, y: tipY },
      inner: { x: innerX, y: innerY }
    };
  }

  draw(ctx) {
    // Draw afterimages during flurry
    if (this.afterImages && this.afterImages.length > 0) {
      ctx.save();
      for (let i = 0; i < this.afterImages.length; i++) {
        const ai = this.afterImages[i];
        const alpha = Math.max(0, ai.timer / 10) * 0.4;
        ctx.globalAlpha = alpha;
        
        ctx.translate(ai.x, ai.y);
        ctx.fillStyle = '#FF1493'; // Deep Pink
        ctx.beginPath();
        ctx.arc(0, 0, this.r * 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.translate(-ai.x, -ai.y);
      }
      ctx.restore();
    }

    super.draw(ctx);

    // Draw Sakuga Anime Impact Frame
    if (this.sakugaImpactTimer > 0) {
      ctx.save();
      const progress = 1 - (this.sakugaImpactTimer / this.sakugaImpactMaxTimer);
      const alpha = 1 - Math.pow(progress, 3);
      
      ctx.translate(this.sakugaImpactX, this.sakugaImpactY);
      ctx.rotate(this.sakugaImpactAngle);
      
      const impactScale = 1.0 + progress * 1.5;
      ctx.scale(impactScale, impactScale);
      
      ctx.globalAlpha = alpha * 0.9;
      
      // Central black ink burst
      ctx.fillStyle = 'black';
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + (this.sakugaImpactSeed * Math.PI);
        const r = 25 + Math.sin(this.sakugaImpactSeed * 100 + i * 1.5) * 45;
        const cx = Math.cos(a) * r;
        const cy = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.closePath();
      ctx.fill();
      
      // Outer pink ink splatters
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = '#FF1493';
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - (this.sakugaImpactSeed * Math.PI);
        const r = 40 + Math.sin(this.sakugaImpactSeed * 50 + i * 2.1) * 60;
        const cx = Math.cos(a) * r;
        const cy = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    }
  }

  drawGun(ctx) {
    // Draw the chest strap here so it layers over the body but UNDER the HP text
    this._drawYutaSwordStrap(ctx);

    // Determine swing state
    const maxCd = this.meleeCooldownMax;
    let isSwinging = (this.meleeCooldown > maxCd - 15);
    let progress = 1.0;
    let fade = (this.slashFadeTimer || 0) / 15;
    
    if (isSwinging) {
      progress = (maxCd - this.meleeCooldown) / 15;
      fade = 1.0;
    }

    // --- DRAW DYNAMIC KATANA TIP TRAIL IN WORLD SPACE ---
    if (this.swordTrail && this.swordTrail.length > 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over'; // Standard blending for visibility on white arenas
      
      // Fades out smoothly only in the last 12 frames of the duration
      const trailAlpha = Math.min(1.0, (this.trailGenTimer || 0) / 12);
      ctx.globalAlpha = trailAlpha;
      
      const numSegments = this.swordTrail.length;

      // Helper function to draw a smoothed Bezier path through a list of points
      const smoothPath = (pts, selectFn) => {
        const p0 = selectFn(pts[0], 0);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < pts.length - 1; i++) {
          const pi = selectFn(pts[i], i);
          const pi1 = selectFn(pts[i + 1], i + 1);
          const xc = (pi.x + pi1.x) / 2;
          const yc = (pi.y + pi1.y) / 2;
          ctx.quadraticCurveTo(pi.x, pi.y, xc, yc);
        }
        const plast = selectFn(pts[pts.length - 1], pts.length - 1);
        ctx.lineTo(plast.x, plast.y);
      };

      // Selectors for outer, inner, and core coordinates along the trail
      const getOuter = (p) => p.outer;
      const getInner = (p) => {
        const fadeRatio = p.life;
        return {
          x: p.outer.x + (p.inner.x - p.outer.x) * fadeRatio,
          y: p.outer.y + (p.inner.y - p.outer.y) * fadeRatio
        };
      };
      const getCoreInner = (p) => {
        const fadeRatio = p.life * 0.35; // Thinner white core
        return {
          x: p.outer.x + (p.inner.x - p.outer.x) * fadeRatio,
          y: p.outer.y + (p.inner.y - p.outer.y) * fadeRatio
        };
      };
      
      // 1. Soft back-glow (saturated pink for volumetric aura feel)
      ctx.strokeStyle = 'rgba(230, 0, 120, 0.25)';
      ctx.lineWidth = 24;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      smoothPath(this.swordTrail, getOuter);
      ctx.stroke();

      // 2. Main pink crescent body fill (smooth, curved polygon)
      ctx.fillStyle = 'rgba(255, 20, 147, 0.45)'; // Vibrant deep hot pink
      ctx.beginPath();
      smoothPath(this.swordTrail, getOuter);
      const reversedTrail = [...this.swordTrail].reverse();
      const r0 = getInner(reversedTrail[0]);
      ctx.lineTo(r0.x, r0.y);
      smoothPath(reversedTrail, getInner);
      ctx.closePath();
      ctx.fill();

      // 3. Searing white-pink core fill (gives it a glowing blade center)
      ctx.fillStyle = 'rgba(255, 220, 235, 0.85)';
      ctx.beginPath();
      smoothPath(this.swordTrail, getOuter);
      const coreReversed = [...this.swordTrail].reverse();
      const cr0 = getCoreInner(coreReversed[0]);
      ctx.lineTo(cr0.x, cr0.y);
      smoothPath(coreReversed, getCoreInner);
      ctx.closePath();
      ctx.fill();

      // 4. JJK calligraphy ink outlines (segment-by-segment Bezier curves with varying pressure width)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Outer calligraphy outline
      if (numSegments > 2) {
        for (let i = 1; i < numSegments - 1; i++) {
          const p = this.swordTrail[i];
          const prev = this.swordTrail[i - 1];
          const next = this.swordTrail[i + 1];
          
          const prevMidX = (prev.outer.x + p.outer.x) / 2;
          const prevMidY = (prev.outer.y + p.outer.y) / 2;
          const midX = (p.outer.x + next.outer.x) / 2;
          const midY = (p.outer.y + next.outer.y) / 2;
          
          const pressureNoise = Math.sin(Date.now() * 0.005 + i * 1.7) * 0.5 + 0.5;
          ctx.lineWidth = (0.7 + pressureNoise * 1.5) * p.life;
          
          ctx.beginPath();
          ctx.moveTo(prevMidX, prevMidY);
          ctx.quadraticCurveTo(p.outer.x, p.outer.y, midX, midY);
          ctx.stroke();
        }
        
        // Connect start segment
        const p0 = this.swordTrail[0];
        const p1 = this.swordTrail[1];
        const startMidX = (p0.outer.x + p1.outer.x) / 2;
        const startMidY = (p0.outer.y + p1.outer.y) / 2;
        ctx.lineWidth = 0.8 * p0.life;
        ctx.beginPath();
        ctx.moveTo(p0.outer.x, p0.outer.y);
        ctx.lineTo(startMidX, startMidY);
        ctx.stroke();
        
        // Connect end segment
        const pLast = this.swordTrail[numSegments - 1];
        const pPenult = this.swordTrail[numSegments - 2];
        const endMidX = (pLast.outer.x + pPenult.outer.x) / 2;
        const endMidY = (pLast.outer.y + pPenult.outer.y) / 2;
        ctx.lineWidth = 0.8 * pLast.life;
        ctx.beginPath();
        ctx.moveTo(endMidX, endMidY);
        ctx.lineTo(pLast.outer.x, pLast.outer.y);
        ctx.stroke();
      } else {
        // Fallback for short trails
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        smoothPath(this.swordTrail, getOuter);
        ctx.stroke();
      }

      // Inner calligraphy outline
      if (numSegments > 2) {
        for (let i = 1; i < numSegments - 1; i++) {
          const p = this.swordTrail[i];
          const prev = this.swordTrail[i - 1];
          const next = this.swordTrail[i + 1];
          
          const pInner = getInner(p);
          const prevInner = getInner(prev);
          const nextInner = getInner(next);
          
          const prevMidX = (prevInner.x + pInner.x) / 2;
          const prevMidY = (prevInner.y + pInner.y) / 2;
          const midX = (pInner.x + nextInner.x) / 2;
          const midY = (pInner.y + nextInner.y) / 2;
          
          const pressureNoise = Math.sin(Date.now() * 0.005 + i * 1.7 + Math.PI) * 0.5 + 0.5;
          ctx.lineWidth = (0.4 + pressureNoise * 1.0) * p.life;
          
          ctx.beginPath();
          ctx.moveTo(prevMidX, prevMidY);
          ctx.quadraticCurveTo(pInner.x, pInner.y, midX, midY);
          ctx.stroke();
        }
        
        // Connect start segment
        const p0 = getInner(this.swordTrail[0]);
        const p1 = getInner(this.swordTrail[1]);
        const startMidX = (p0.x + p1.x) / 2;
        const startMidY = (p0.y + p1.y) / 2;
        ctx.lineWidth = 0.5 * this.swordTrail[0].life;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(startMidX, startMidY);
        ctx.stroke();
        
        // Connect end segment
        const pLast = getInner(this.swordTrail[numSegments - 1]);
        const pPenult = getInner(this.swordTrail[numSegments - 2]);
        const endMidX = (pLast.x + pPenult.x) / 2;
        const endMidY = (pLast.y + pPenult.y) / 2;
        ctx.lineWidth = 0.5 * this.swordTrail[numSegments - 1].life;
        ctx.beginPath();
        ctx.moveTo(endMidX, endMidY);
        ctx.lineTo(pLast.x, pLast.y);
        ctx.stroke();
      } else {
        // Fallback for short trails
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        smoothPath(reversedTrail, getInner);
        ctx.stroke();
      }

      // 5. Continuous interior ink speed lines (flowing along the trail center)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      smoothPath(this.swordTrail, (p) => {
        const fadeRatio = p.life;
        const innerPt = getInner(p);
        // Returns the midpoint between the outer and inner edge of the trail
        return {
          x: p.outer.x + (innerPt.x - p.outer.x) * 0.5,
          y: p.outer.y + (innerPt.y - p.outer.y) * 0.5
        };
      });
      ctx.stroke();

      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    
    let currentAngle = this.gunAngle;
    const comboIndex = this.activeSlashType || 0;
    
    if (isSwinging) {
      if (comboIndex === 0) {
        currentAngle += (-Math.PI/4) + (Math.PI/2) * progress;
      } else if (comboIndex === 1) {
        currentAngle += (Math.PI/4) - (Math.PI/2) * progress;
      } else if (comboIndex === 2) {
        currentAngle += (-Math.PI*0.6) + (Math.PI*1.2) * progress;
      }
    }
    
    ctx.rotate(currentAngle);
    if (Math.abs(currentAngle) > Math.PI / 2) {
      ctx.scale(1, -1);
    }
    
    let parryPoseActive = (this.blockPoseTimer > 0);
    let currentParryType = this.parryType || 'guard';
    
    if (parryPoseActive) {
      this.blockPoseTimer--;
      
      if (currentParryType === 'deflect') {
        // Counter-Swing Parry: A fast, sharp counter-swipe deflecting the threat
        const totalDur = CONFIG.yuta.parryGuardDuration || 90;
        const swingDur = 8; // Super fast deflect swing (8 frames)
        
        let swingProgress = Math.min(1.0, (totalDur - this.blockPoseTimer) / swingDur);
        let returnProgress = Math.max(0, (12 - this.blockPoseTimer) / 12); // Snappy return (12 frames)
        
        let deflectAngle = 0;
        let currentTranslateX = this.r - 10;
        
        if (swingProgress < 1.0) {
          deflectAngle = (Math.PI / 3.5) - (Math.PI * 0.6) * swingProgress;
          currentTranslateX = (this.r - 10) + 15 * swingProgress;
        } else {
          deflectAngle = (-Math.PI / 4) * (1 - returnProgress);
          currentTranslateX = (this.r - 10) + 15 * (1 - returnProgress);
        }
        
        ctx.translate(currentTranslateX, 0);
        ctx.rotate(deflectAngle);
      } else {
        // Static Guard Pose: Hold sword flat across chest
        ctx.translate(this.r - 18, 0);
        ctx.rotate(Math.PI / 2);
      }
    } else {
      ctx.translate(this.r - 10, 0);
    }
    
    ctx.scale(1.2, 1.2);           // scale up the entire weapon by 20%

    // === Cursed Energy Katana Aura (Rendered BEHIND the blade) ===
    // Glows pink when swinging, when blocking, or when Rika/Domain is active
    const auraOpacity = this.swordGlowAlpha || 0;
    
    if (auraOpacity > 0.01) {
    const frameRate = 30;
    // Infinite stepped frames (no modulus snapping)
    const frameIndex = Math.floor(Date.now() / (1000 / frameRate));
    const time = frameIndex * 120;
    // Add velocity/position influence so the flames react naturally as he moves
    // Kept very subtle (0.015) so it doesn't vibrate violently during fast dashes
    const moveOffset = (this.x + this.y) * 0.015;
    
    ctx.save();
    
    // === Volumetric Katana Backlight (Replicating Champion Screen) ===
    ctx.globalCompositeOperation = 'screen';
    const katanaGlow = ctx.createLinearGradient(-15, 0, 85, 0);
    katanaGlow.addColorStop(0, `rgba(255, 255, 255, ${0.4 * auraOpacity})`);
    katanaGlow.addColorStop(0.6, `rgba(255, 105, 180, ${0.2 * auraOpacity})`);
    katanaGlow.addColorStop(1, 'rgba(255, 20, 147, 0)');
    
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.quadraticCurveTo(35, 1.5, 85, -4); // Follows the blade curve
    ctx.lineWidth = 35;
    ctx.lineCap = 'round';
    ctx.strokeStyle = katanaGlow;
    ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';
    
    const mainColor = '#FF1493'; 
    const fillColor = `rgba(255, 105, 180, 0.7)`; // Fixed alpha so it doesn't double-multiply
    const coreColor = `rgba(255, 192, 203, 0.8)`; 
    const strokeColor = `rgba(0, 0, 0, 0.75)`; 
    
    ctx.shadowBlur = 15 * auraOpacity;
    ctx.shadowColor = mainColor;

    // Generate outer flame points (Viscous Liquid Fire Silhouette)
    let allPoints = [];
    
    // Top edge (left to right) - Localized flame tongues (flicker instead of slide)
    for (let x = -15; x <= 85; x += 5) {
      let cy = (x > 19) ? (x - 19) * -0.09 : 0;
      
      // Slow base shape evolution (how tongues grow/morph)
      let baseShape = Math.pow(Math.sin(x * 0.05 + time * 0.0008) * 0.5 + 0.5, 3.0) * 18;
      
      // Gentle, localized height flicker (smoothed frequency and amplitude)
      let flicker = Math.sin(time * 0.002 + x * 0.2 - moveOffset) * 0.15 + 0.85;
      
      let topWave = (baseShape * flicker + 3) * auraOpacity;
      allPoints.push({ x: x, y: cy - 4 - topWave });
    }
    
    // Bottom edge (right to left) - Localized flame tongues
    for (let x = 85; x >= -15; x -= 5) {
      let cy = (x > 19) ? (x - 19) * -0.09 : 0;
      
      let baseShape = Math.pow(Math.cos(x * 0.06 - time * 0.0006) * 0.5 + 0.5, 2.5) * 18;
      let flicker = Math.cos(time * 0.0025 - x * 0.25 + moveOffset) * 0.15 + 0.85;
      
      let botWave = (baseShape * flicker + 3) * auraOpacity;
      allPoints.push({ x: x, y: cy + 4 + botWave });
    }

    // Outer flame fill
    ctx.beginPath();
    let mx = (allPoints[allPoints.length - 1].x + allPoints[0].x) / 2;
    let my = (allPoints[allPoints.length - 1].y + allPoints[0].y) / 2;
    ctx.moveTo(mx, my);
    for(let i = 0; i < allPoints.length; i++) {
        let p = allPoints[i];
        let next = allPoints[(i + 1) % allPoints.length];
        let xc = (p.x + next.x) / 2;
        let yc = (p.y + next.y) / 2;
        ctx.quadraticCurveTo(p.x, p.y, xc, yc);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    
    // Inner glowing core (shrunk vertically towards the blade)
    ctx.beginPath();
    ctx.moveTo(mx, my * 0.4);
    for(let i = 0; i < allPoints.length; i++) {
        let p = allPoints[i];
        let next = allPoints[(i + 1) % allPoints.length];
        let xc = (p.x + next.x) / 2;
        let yc = (p.y + next.y) / 2;
        // Shrink the y-coordinates tightly around the blade
        ctx.quadraticCurveTo(p.x, p.y * 0.4, xc, yc * 0.4);
    }
    ctx.closePath();
    ctx.fillStyle = coreColor;
    ctx.fill();

    // Primary Ink brush stroke outline (varying thickness like calligraphy brush)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = strokeColor;
    ctx.globalAlpha = auraOpacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw solid outline as individual segments with varying width
    for (let i = 0; i < allPoints.length; i++) {
        const p = allPoints[i];
        const next = allPoints[(i + 1) % allPoints.length];
        const midX = (p.x + next.x) / 2;
        const midY = (p.y + next.y) / 2;
        
        // Thinner brush widths to prevent looking too bold
        const pressureNoise = Math.sin(time * 0.002 + i * 1.7) * 0.5 + 0.5;
        ctx.lineWidth = 0.8 + pressureNoise * 1.4; 
        
        ctx.beginPath();
        const prev = allPoints[(i - 1 + allPoints.length) % allPoints.length];
        const prevMidX = (prev.x + p.x) / 2;
        const prevMidY = (prev.y + p.y) / 2;
        
        ctx.moveTo(prevMidX, prevMidY);
        ctx.quadraticCurveTo(p.x, p.y, midX, midY);
        ctx.stroke();
    }

    // Chaotic, broken JJK black ink brush cuts & hatches inside the katana aura
    ctx.shadowBlur = 0;
    ctx.strokeStyle = strokeColor;
    ctx.lineCap = 'butt';
    
    const insetScales = [0.65, 0.8, 0.92]; // Scaled closer to the blade center (inside the pink)
    for (let layer = 0; layer < insetScales.length; layer++) {
      const scale = insetScales[layer];
      const speedDir = (layer % 2 === 0 ? 1 : -1);
      const flowTime = time * 0.003 * speedDir;
      
      for (let i = 0; i < allPoints.length; i++) {
        // Slow wave (for long strokes) + fast wave (for short details) = variety of longevity
        const longWave = Math.sin(i * 0.35 + layer * 8.0 + flowTime * 1.5) * 0.6;
        const shortWave = Math.sin(i * 2.5 - layer * 5.0 + flowTime * 3.5) * 0.4;
        const cutSeed = longWave + shortWave;
        if (cutSeed < 0.15) continue; // Higher threshold to reduce density and clutter

        const p = allPoints[i];
        const next = allPoints[(i + 1) % allPoints.length];
        
        // Find blade center line for both points to curve correctly
        let pCy = (p.x > 19) ? (p.x - 19) * -0.09 : 0;
        let nextCy = (next.x > 19) ? (next.x - 19) * -0.09 : 0;
        
        // Scale Y relative to the blade center line so cuts sit inside the pink aura
        let yStart = pCy + (p.y - pCy) * scale;
        let yEnd = nextCy + (next.y - nextCy) * scale;
        
        ctx.lineWidth = 0.4 + (cutSeed * 1.2);
        ctx.beginPath();
        ctx.moveTo(p.x, yStart);
        
        // Add a slight jaggedness to the cut
        const jagX = Math.cos(i * 43) * 1.5;
        const jagY = Math.sin(i * 43) * 1.5;
        
        ctx.lineTo(next.x + jagX, yEnd + jagY);
        ctx.stroke();
      }
    }

    ctx.restore();
    }

    // Draw Lore-Accurate Katana (Matching reference image)
    
    // 1. Kashira (Gold Pommel)
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(-18, -3, 3, 6);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(-18, -3, 3, 6);

    // 2. Tsuka (Black Hilt underwrap)
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(-15, -2.5, 23, 5);
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(-15, -2.5, 23, 5);

    // Menuki (Tiny gold ornaments inside the black tsuka gaps)
    ctx.fillStyle = '#DAA520';
    for (let dx = -13.25; dx <= 6; dx += 3.5) {
      ctx.fillRect(dx, -0.5, 1, 1);
    }

    // 3. Tsuka-ito (Red criss-cross wrap pattern)
    ctx.strokeStyle = '#D11A2A'; // Red wrap
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'butt';
    for (let dx = -15; dx <= 6; dx += 3.5) {
      ctx.beginPath();
      ctx.moveTo(dx, -2.5);
      ctx.lineTo(dx + 3.5, 2.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(dx + 3.5, -2.5);
      ctx.lineTo(dx, 2.5);
      ctx.stroke();
    }

    // Fuchi (Dark Golden Hilt Collar)
    ctx.fillStyle = '#8B6508';
    ctx.fillRect(8, -2.5, 2, 5);
    ctx.strokeRect(8, -2.5, 2, 5);

    // Left Seppa (Spacer washer)
    ctx.fillStyle = '#DAA520';
    ctx.fillRect(10, -4, 0.8, 8);

    // 4. Tsuba (Golden Rounded Rectangular Guard)
    ctx.fillStyle = '#C5A059'; 
    ctx.beginPath();
    ctx.moveTo(10.8, -7);
    ctx.quadraticCurveTo(10.8, -8.5, 12.3, -8.5);
    ctx.lineTo(13.3, -8.5);
    ctx.quadraticCurveTo(14.8, -8.5, 14.8, -7);
    ctx.lineTo(14.8, 7);
    ctx.quadraticCurveTo(14.8, 8.5, 13.3, 8.5);
    ctx.lineTo(12.3, 8.5);
    ctx.quadraticCurveTo(10.8, 8.5, 10.8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    // Tsuba Details (two hitsu-ana holes / engravings in the guard)
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(12.3, -4.5, 1, 1.2);
    ctx.fillRect(12.3, 3.3, 1, 1.2);

    // Right Seppa (Spacer washer)
    ctx.fillStyle = '#DAA520';
    ctx.fillRect(14.8, -4, 0.8, 8);

    // 5. Habaki (Golden Blade Collar)
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(15.6, -2, 3.4, 4);
    ctx.strokeRect(15.6, -2, 3.4, 4);

    // 6. Blade — Curved katana shape with authentic sori (gentle upward arc)
    
    // First, draw the entire blade shape in polished silver (Ha/Kissaki base)
    ctx.beginPath();
    ctx.moveTo(19, -1.8);                             // Spine start
    ctx.quadraticCurveTo(49, -4.2, 81, -8.0);         // Spine curve all the way to the tip point
    ctx.quadraticCurveTo(78, -3.5, 75, -2.2);         // Crescent tip cutting edge sweep
    ctx.quadraticCurveTo(49, 1.2, 19, 2.2);           // Main cutting edge back to habaki
    ctx.closePath();
    ctx.fillStyle = '#E5E8E8';                        // Polished silver steel
    ctx.fill();
    if (auraOpacity > 0.05) {
      ctx.fillStyle = `rgba(255, 20, 147, ${auraOpacity * 0.4})`; // Hot pink cursed glow overlay
      ctx.fill();
    }

    // Second, overlay the dark spine (Shinogi-ji) ending at the Yokote line (tip division)
    ctx.beginPath();
    ctx.moveTo(19, -1.8);
    ctx.quadraticCurveTo(49, -4.0, 75, -6.8);         // Spine top boundary
    ctx.lineTo(75, -4.2);                             // Yokote dividing line
    ctx.quadraticCurveTo(49, -0.8, 19, 0.2);          // Shinogi boundary line
    ctx.closePath();
    ctx.fillStyle = '#2F3538';                        // Dark spine steel
    ctx.fill();
    if (auraOpacity > 0.05) {
      ctx.fillStyle = `rgba(255, 105, 180, ${auraOpacity * 0.35})`; // Pink spine glow tint
      ctx.fill();
    }

    // Hamon line (temper line) — complex wavy boundary line
    ctx.beginPath();
    ctx.moveTo(19, 0.2);
    for (let x = 19; x <= 75; x += 3.5) {
      // Create a gorgeous wavy sine temper pattern
      const waveY = 0.2 - 4.4 * ((x - 19) / 56) + Math.sin(x * 0.75) * 0.45;
      ctx.lineTo(x, waveY);
    }
    ctx.strokeStyle = auraOpacity > 0.05 ? `rgba(255, 240, 245, ${0.65 + auraOpacity * 0.35})` : 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Metallic Mune Highlight — bright shine along the back spine of the blade
    ctx.beginPath();
    ctx.moveTo(19, -1.8);
    ctx.quadraticCurveTo(49, -4.2, 81, -8.0);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Third, draw a clean black stroke outline over the entire outer blade boundary
    ctx.beginPath();
    ctx.moveTo(19, -1.8);
    ctx.quadraticCurveTo(49, -4.2, 81, -8.0);         // Spine curve to tip point
    ctx.quadraticCurveTo(78, -3.5, 75, -2.2);         // Crescent tip curve
    ctx.quadraticCurveTo(49, 1.2, 19, 2.2);           // Main cutting edge back to habaki
    ctx.closePath();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // 7. Hand holding the hilt (drawn over the hilt wrapper and aura)
    ctx.beginPath();
    // Hand positioned on the long hilt
    ctx.arc(-2, 0.5, 5, 0, Math.PI * 2); 
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    
    ctx.restore();

    // --- DRAW DYNAMIC SLASH TRAIL ---
    if (fade > 0) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.gunAngle); // Base angle to align the arc

      const arcRadius = this.r + 38; // Trail extends a bit past the blade
      let fullStartAngle, fullEndAngle;
      if (comboIndex === 0) {
        fullStartAngle = -Math.PI * 0.42;
        fullEndAngle   =  Math.PI * 0.42;
      } else if (comboIndex === 1) {
        fullStartAngle =  Math.PI * 0.42;
        fullEndAngle   = -Math.PI * 0.42;
      } else if (comboIndex === 2) {
        fullStartAngle = -Math.PI * 0.75;
        fullEndAngle   =  Math.PI * 0.75;
      }

      const currentEndAngle = fullStartAngle + (fullEndAngle - fullStartAngle) * progress;
      const isAnticlockwise = fullStartAngle > fullEndAngle;
      const glowAlpha = Math.pow(fade, 0.8);

      // Clip region
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const clipOffset = isAnticlockwise ? 0.1 : -0.1;
      ctx.arc(0, 0, arcRadius + 20, fullStartAngle + clipOffset, currentEndAngle, isAnticlockwise);
      ctx.closePath();
      ctx.clip();

      // Fading tail gradient using Yuta's hot pink theme
      const fullStartY = Math.sin(fullStartAngle) * arcRadius;
      const currentY = Math.sin(currentEndAngle) * arcRadius;
      
      const tailGrad = ctx.createLinearGradient(0, fullStartY, 0, currentY + (fullStartY === currentY ? 0.1 : 0));
      tailGrad.addColorStop(0, 'rgba(255, 20, 147, 0.0)'); // Transparent hot pink
      tailGrad.addColorStop(0.7, 'rgba(255, 105, 180, 0.85)'); // Hot pink body
      tailGrad.addColorStop(1, 'rgba(255, 240, 245, 0.95)'); // Searing white-pink head

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = glowAlpha;
      
      const numSegments = 30;
      const arcWidth = currentEndAngle - fullStartAngle;

      // =====================================================
      // --- SHARP CRESCENT SLASH (Anime-style, pointed tips)
      // =====================================================
      // Thickness profile: 0 at both tips, peaks at center — true crescent silhouette.
      // Uses a bell-curve (sin) so edges taper to razor-thin points.
      const maxThickness = 28; // Half-width of the crescent at its widest
      const outerOffset  =  8; // Outer crescent is puffed outward from arcRadius
      const innerOffset  =  6; // Inner crescent cuts inward from arcRadius

      // Helper: crescent thickness weight at normalised position t∈[0,1]
      // sin(t*π) gives 0 at both ends, 1 at centre. Pow sharpens the tip taper.
      const crescentWeight = (t) => Math.pow(Math.sin(t * Math.PI), 1.5);

      // ------ 1. Main pink crescent body ------
      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      // Forward pass — outer edge
      for (let i = 0; i <= numSegments; i++) {
        const t     = i / numSegments;
        const angle = fullStartAngle + arcWidth * t;
        const w     = crescentWeight(t);
        const r     = arcRadius + outerOffset + maxThickness * w;
        if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else         ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      // Reverse pass — inner edge (creates closed crescent polygon)
      for (let i = numSegments; i >= 0; i--) {
        const t     = i / numSegments;
        const angle = fullStartAngle + arcWidth * t;
        const w     = crescentWeight(t);
        const r     = arcRadius - innerOffset - maxThickness * w;
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();

      // ------ 2. Bright white-pink core edge (thin inner blade highlight) ------
      // Sits just inside the outer edge — gives the crescent a razor-like brightness.
      const coreGrad = ctx.createLinearGradient(
        Math.cos(fullStartAngle) * arcRadius, Math.sin(fullStartAngle) * arcRadius,
        Math.cos(fullStartAngle + arcWidth) * arcRadius, Math.sin(fullStartAngle + arcWidth) * arcRadius
      );
      coreGrad.addColorStop(0,   'rgba(255, 180, 220, 0.0)');
      coreGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');
      coreGrad.addColorStop(1,   'rgba(255, 255, 255, 0.9)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      const coreMax = 7;
      for (let i = 0; i <= numSegments; i++) {
        const t     = i / numSegments;
        const angle = fullStartAngle + arcWidth * t;
        const w     = crescentWeight(t);
        const r     = arcRadius + outerOffset + maxThickness * w - 1;
        if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else         ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      for (let i = numSegments; i >= 0; i--) {
        const t     = i / numSegments;
        const angle = fullStartAngle + arcWidth * t;
        const w     = crescentWeight(t);
        const r     = arcRadius + outerOffset + maxThickness * w - 1 - coreMax * w;
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();

      // ------ 3. Sharp outer glow stroke (crescent rim glow) ------
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = 'rgba(255, 100, 200, 0.65)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= numSegments; i++) {
        const t     = i / numSegments;
        const angle = fullStartAngle + arcWidth * t;
        const w     = crescentWeight(t);
        const r     = arcRadius + outerOffset + maxThickness * w;
        if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else         ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';

      // ------ 4. Ink calligraphy strokes (sparse, interior detail) ------
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.lineCap = 'butt';
      const inkRadii = [arcRadius - 4, arcRadius + outerOffset * 0.5];
      for (let layer = 0; layer < inkRadii.length; layer++) {
        const radius   = inkRadii[layer];
        const segments = 10;
        for (let s = 0; s < segments; s++) {
          const ratio = s / segments;
          const angle = fullStartAngle + arcWidth * ratio;
          if (isAnticlockwise ? (angle < currentEndAngle) : (angle > currentEndAngle)) break;
          const inkSeed = Math.sin(ratio * 14.5 + Date.now() * 0.015 + layer * 23.3);
          if (inkSeed < 0.1) continue; // sparser gaps
          const nextAngle  = fullStartAngle + arcWidth * ((s + 1) / segments);
          const drawEndAngle = isAnticlockwise
            ? Math.max(nextAngle, currentEndAngle)
            : Math.min(nextAngle, currentEndAngle);
          ctx.lineWidth = 0.8 + (inkSeed + 1) * 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, radius + Math.sin(s * 19.7) * 2, angle, drawEndAngle, isAnticlockwise);
          ctx.stroke();
        }
      }

      // ------ 5. Radial speed-line spikes near the leading tip ------
      ctx.strokeStyle = 'rgba(255, 200, 240, 0.85)';
      ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const spikeRatio = 0.62 + i * 0.09;
        if (spikeRatio > 1.0) continue;
        const spikeAngle = fullStartAngle + arcWidth * spikeRatio;
        if (isAnticlockwise ? (spikeAngle < currentEndAngle) : (spikeAngle > currentEndAngle)) continue;
        const w       = crescentWeight(spikeRatio);
        const baseR   = arcRadius + outerOffset + maxThickness * w;
        const spikeLen = 10 + Math.abs(Math.sin(spikeRatio * 32.1 + Date.now() * 0.01)) * 18;
        const spikeSeed = Math.sin(spikeRatio * 32.1 + Date.now() * 0.01);
        ctx.lineWidth = 1.5 - i * 0.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(spikeAngle) * baseR, Math.sin(spikeAngle) * baseR);
        ctx.lineTo(
          Math.cos(spikeAngle + spikeSeed * 0.08) * (baseR + spikeLen),
          Math.sin(spikeAngle + spikeSeed * 0.08) * (baseR + spikeLen)
        );
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  draw(ctx, opponent) {
    if (this.domainActive) {
      ctx.save();
      const radius = CONFIG.yuta.domainRadius || 350;
      // Dark pulsating background for Authentic Mutual Love
      const pulse = Math.sin(Date.now() / 200) * 0.1;
      
      // Outer ring
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(50, 0, 50, ${0.3 + pulse})`;
      ctx.fill();
      
      ctx.strokeStyle = '#ffb6c1';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw scattered swords (visual only)
      for(let i=0; i<15; i++) {
        // Deterministic pseudo-random positions based on fighter ID and i
        const seed = ((this.id || 1) * i * 17) % 360;
        const dist = (seed % radius) * 0.8;
        const angle = seed * Math.PI / 180;
        const sx = this.x + Math.cos(angle) * dist;
        const sy = this.y + Math.sin(angle) * dist;
        
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(-1, -10, 2, 20); // Blade
        ctx.fillStyle = '#ffb6c1'; // Pink hilt
        ctx.fillRect(-3, -10, 6, 3); // Guard
        ctx.restore();
      }
      ctx.restore();
    }

    this._drawYutaCursedEnergyAura(ctx);

    // Draw sword bag on his back (behind body)
    this._drawYutaSwordBag(ctx);

    super.draw(ctx, opponent);

    if (this.rika && this.rika.active) {
      ctx.save();
      ctx.translate(this.rika.x, this.rika.y);
      
      // Draw Rika (dark purple/pink chaotic aura)
      const r = this.rika.r || 30;
      const wobble = Math.sin(Date.now() / 100) * 3;
      
      ctx.beginPath();
      ctx.arc(0, 0, r + wobble, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(75, 0, 130, 0.7)'; // Indigo
      ctx.fill();
      
      ctx.strokeStyle = '#ffb6c1';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Rika "eye"
      ctx.beginPath();
      ctx.arc(0, -5, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffb6c1';
      ctx.fill();

      ctx.restore();
    }
  }

  _drawYutaCursedEnergyAura(ctx) {
    // Only active when Yuta's cursed energy is manifested (summoned with Rika)
    const isRCT = (this.rctRevivalTimer > 0);
    const isCountdown = (typeof state !== 'undefined' && state.gameState === 'countdown');
    
    // Only active when Yuta's cursed energy is manifested (summoned with Rika) OR he's reviving OR countdown
    let activeMultiplier = this.cursedEnergyAlpha || 0;
    if (isRCT || isCountdown) activeMultiplier = 1.0;
    
    if (activeMultiplier <= 0.01) return;

    // Determine opacity based on technique usage or domain charging
    let progress = 0;
    if (isRCT) {
      progress = Math.min(1.0, this.rctRevivalTimer / (CONFIG.yuta.rctRevivalDuration || 150));
    } else if (this.isChannelingDomain) {
      progress = this.domainChargeTimer / this.domainChargeMax;
    } else if (this.techniqueCooldown > this.cooldown - 30) {
      // Glow briefly after using a technique
      progress = (this.techniqueCooldown - (this.cooldown - 30)) / 30;
    } else {
      // Passive weak glow (increased from 0.3 to 0.65 to fix pale colors without becoming solid plastic)
      progress = 0.65;
    }

    // Scale by the active transition multiplier
    progress *= activeMultiplier;

    if (progress <= 0) return;

    // Stepped 30-frame anime animation loop (30 FPS Sakuga frame rate)
    // Infinite stepped frames (no modulus snapping)
    const frameRate = 30;
    const frameIndex = Math.floor(Date.now() / (1000 / frameRate));
    const time = frameIndex * 120; 
    
    // Add velocity/position influence (subtle multiplier to prevent rapid wiggling)
    const moveOffset = (this.x + this.y) * 0.015;

    ctx.save();
    ctx.translate(this.x, this.y - (this.z || 0));

    // === Luminous Body Backlight (Replicating Champion Screen) ===
    ctx.globalCompositeOperation = 'screen';
    const glowRadius = this.r + 55 + Math.sin(time * 0.005) * 5;
    const backGlow = ctx.createRadialGradient(0, 0, this.r * 0.2, 0, 0, glowRadius);
    if (isRCT) {
      backGlow.addColorStop(0, `rgba(255, 255, 255, ${0.5 * progress})`);     
      backGlow.addColorStop(0.5, `rgba(50, 205, 50, ${0.25 * progress})`);    
      backGlow.addColorStop(1, 'rgba(50, 205, 50, 0)');                       
    } else {
      backGlow.addColorStop(0, `rgba(255, 255, 255, ${0.5 * progress})`);     // Brilliant white core light
      backGlow.addColorStop(0.5, `rgba(255, 105, 180, ${0.25 * progress})`);    // Soft pink diffusion
      backGlow.addColorStop(1, 'rgba(255, 20, 147, 0)');                       // Fades out
    }
    
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = backGlow;
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';

    const r = this.r;

    const mainColor = isRCT ? '#32CD32' : '#FF1493'; 
    const fillColor = isRCT ? `rgba(50, 205, 50, ${0.75 * progress})` : `rgba(255, 105, 180, ${0.75 * progress})`; 
    const coreColor = isRCT ? `rgba(144, 238, 144, ${0.85 * progress})` : `rgba(255, 192, 203, ${0.85 * progress})`; 
    const strokeColor = '#000000'; // Pure pitch black JJK ink contour

    // Soft ambient glow
    ctx.shadowBlur = 20 * progress;
    ctx.shadowColor = mainColor;

    // Generate smooth flame contour points (Viscous Liquid Fire Silhouette)
    const numPoints = 28; // Increased resolution for smoother rounded tongues
    const baseRadius = r + 15;
    const points = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (Math.PI * 2 / numPoints) * i;

      // Upward direction bias (flames flow upward)
      const upFactor = Math.max(0, -Math.sin(angle) + 0.25); // active on top, fades towards bottom
      const sideFactor = 1.0 - upFactor * 0.5; // active on sides and bottom

      // Slow base shape evolution (how tongues grow/morph)
      const baseTongue1 = Math.pow(Math.sin(angle * 1.5 + time * 0.0005 - moveOffset * 0.2) * 0.5 + 0.5, 3.0) * 25 * upFactor;
      const baseTongue2 = Math.pow(Math.cos(angle * 2.2 - time * 0.0004 + moveOffset * 0.15) * 0.5 + 0.5, 2.5) * 18 * upFactor;

      // Gentle, localized height flicker (smoothed frequency and amplitude)
      const flicker1 = Math.sin(time * 0.0018 + angle * 2.5) * 0.15 + 0.85;
      const flicker2 = Math.cos(time * 0.0022 - angle * 3.0) * 0.15 + 0.85;

      const tongue1 = baseTongue1 * flicker1;
      const tongue2 = baseTongue2 * flicker2;

      // Viscous bubbling outward on the sides/bottom
      const bubble = Math.pow(Math.sin(angle * 3.0 + time * 0.0017) * Math.cos(angle * 1.8 - time * 0.0011), 2.0) * 9 * sideFactor;

      // General slow breathing flow
      const flow = Math.sin(time * 0.0006 + angle) * 3;

      const radius = baseRadius + flow + bubble + tongue1 + tongue2;

      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }

    // Draw smooth closed curve through midpoints (no sharp corners)
    ctx.beginPath();
    let mx = (points[numPoints - 1].x + points[0].x) / 2;
    let my = (points[numPoints - 1].y + points[0].y) / 2;
    ctx.moveTo(mx, my);

    for (let i = 0; i < numPoints; i++) {
      const p = points[i];
      const next = points[(i + 1) % numPoints];
      const midX = (p.x + next.x) / 2;
      const midY = (p.y + next.y) / 2;
      ctx.quadraticCurveTo(p.x, p.y, midX, midY);
    }
    ctx.closePath();

    // Fill with translucent cursed energy
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Ink brush stroke outline (varying thickness like calligraphy brush)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = strokeColor;
    ctx.globalAlpha = progress;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw outline as individual segments with varying width
    for (let i = 0; i < numPoints; i++) {
      const p = points[i];
      const next = points[(i + 1) % numPoints];
      const midX = (p.x + next.x) / 2;
      const midY = (p.y + next.y) / 2;

      // Brush pressure varies per segment (thick in some spots, thin in others)
      const pressureNoise = Math.sin(time * 0.002 + i * 1.7) * 0.5 + 0.5; // 0 to 1
      const baseThick = 1.2 + pressureNoise * 2.5; // ranges from 1.2px to 3.7px

      ctx.lineWidth = baseThick;
      ctx.beginPath();

      // Get previous midpoint as start
      const prev = points[(i - 1 + numPoints) % numPoints];
      const prevMidX = (prev.x + p.x) / 2;
      const prevMidY = (prev.y + p.y) / 2;

      ctx.moveTo(prevMidX, prevMidY);
      ctx.quadraticCurveTo(p.x, p.y, midX, midY);
      ctx.stroke();
    }

    // Inner bright core wash (scaled down jagged flames)
    // Matches the jagged structure so the white core radiates outwards properly
    ctx.save();
    ctx.scale(0.75, 0.75); // Shrink the exact flame path to 75% size to form the core
    ctx.beginPath();
    ctx.moveTo(mx, my);
    for (let i = 0; i < numPoints; i++) {
      const p = points[i];
      const next = points[(i + 1) % numPoints];
      const midX = (p.x + next.x) / 2;
      const midY = (p.y + next.y) / 2;
      ctx.quadraticCurveTo(p.x, p.y, midX, midY);
    }
    ctx.closePath();
    ctx.fillStyle = coreColor;
    ctx.fill();
    ctx.restore();

    // Rough, thin black ink brush cuts & hatches moving along the border contour
    ctx.globalAlpha = 0.9 * progress;
    ctx.strokeStyle = '#000000';
    ctx.lineCap = 'butt';

    // Draw 3 layers of thin, rough, broken/cut ink lines moving alongside the border
    const insetScales = [0.84, 0.91, 0.96];
    for (let layer = 0; layer < insetScales.length; layer++) {
      const scale = insetScales[layer];
      const speedDir = (layer % 2 === 0 ? 1 : -1);
      const flowTime = time * 0.003 * speedDir;

      for (let i = 0; i < numPoints; i++) {
        // Slow wave (for long strokes) + fast wave (for short details) = variety of longevity
        const longWave = Math.sin(i * 0.35 + layer * 8.0 + flowTime * 1.5) * 0.6;
        const shortWave = Math.sin(i * 2.5 - layer * 5.0 + flowTime * 3.5) * 0.4;
        const cutSeed = longWave + shortWave;
        if (cutSeed < 0.15) continue; // Higher threshold to reduce density and clutter

        const p = points[i];
        const next = points[(i + 1) % numPoints];
        
        ctx.lineWidth = 0.5 + (cutSeed * 1.5);
        ctx.beginPath();
        ctx.moveTo(p.x * scale, p.y * scale);
        // Add a slight jaggedness to the cut
        const jagX = Math.cos(i * 43) * 3;
        const jagY = Math.sin(i * 43) * 3;
        ctx.lineTo(next.x * scale + jagX, next.y * scale + jagY);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  _drawYutaSwordBag(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.gunAngle); // Align with his facing direction so the back stays opposite to his target
    ctx.scale(1.2, 1.2);       // Scale bag identically to the katana

    // Calculate the bag vector based on our start and end coordinates
    const startX = -16, startY = -28; // Shoulder opening
    const endX = -20, endY = 42;      // Hanging bottom cap (shortened)
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy); // Length is now ~70 pixels
    const bagAngle = Math.atan2(dy, dx);

    ctx.save();
    // Translate to the start point and rotate so the bag runs along the local X-axis
    ctx.translate(startX, startY);
    ctx.rotate(bagAngle);

    // Now the bag extends from x=0 to x=length along the X-axis.
    // The width is along the Y-axis.

    // 1. Tapered Canvas Body Polygon (Wider at top, narrower at bottom)
    const topW = 3.5;
    const botW = 2.5;

    ctx.fillStyle = '#2C3136'; // Dark slate/charcoal canvas fabric
    ctx.strokeStyle = '#000000'; // Black outline
    ctx.lineWidth = 1.0;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(0, -topW);
    ctx.lineTo(length, -botW);
    ctx.lineTo(length, botW);
    ctx.lineTo(0, topW);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Fabric Folds and Creases (Canvas texture)
    // Dark creases
    ctx.strokeStyle = '#1D2124';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let i = 12; i < length - 12; i += 16) {
      // Diagonal folds crossing the bag
      ctx.moveTo(i, -topW + 0.5);
      ctx.lineTo(i + 4, topW - 0.5);
    }
    ctx.stroke();

    // Highlight creases (Lighter canvas reflecting light)
    ctx.strokeStyle = '#4A5057';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let i = 20; i < length - 15; i += 22) {
      ctx.moveTo(i, topW - 0.5);
      ctx.lineTo(i + 6, -topW + 0.5);
    }
    // A long subtle vertical fold down the middle
    ctx.moveTo(10, -0.5);
    ctx.lineTo(length - 10, -0.5);
    ctx.stroke();

    // 3. Stitched Reinforcement Base Cap
    ctx.fillStyle = '#1A1C1F'; // Darker base fabric
    ctx.beginPath();
    ctx.moveTo(length - 7, -botW);
    ctx.lineTo(length, -botW);
    ctx.lineTo(length, botW);
    ctx.lineTo(length - 7, botW);
    ctx.closePath();
    ctx.fill();
    ctx.stroke(); // Stroke black around base

    // 4. Zipper Detail at the Top
    ctx.strokeStyle = '#000000'; // Zipper track
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(5, -topW + 0.5);
    ctx.lineTo(5, topW - 0.5);
    ctx.stroke();

    // Silver Zipper Pull Tab
    ctx.fillStyle = '#8A8E91';
    ctx.fillRect(4.5, -0.5, 2, 2.5);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.4;
    ctx.strokeRect(4.5, -0.5, 2, 2.5);

    // 5. Metallic D-Ring Hook at the Top
    ctx.strokeStyle = '#666'; // Gunmetal ring
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -1.5);
    ctx.lineTo(-3, -1.5);
    ctx.lineTo(-3, 1.5);
    ctx.lineTo(0, 1.5);
    ctx.stroke();

    // 6. Thick Black Canvas Collar/Opening
    ctx.fillStyle = '#111111';
    ctx.fillRect(-1.5, -topW - 0.2, 2.5, topW * 2 + 0.4);
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-1.5, -topW - 0.2, 2.5, topW * 2 + 0.4);

    ctx.restore(); // Restore from bag rotation and translation
    ctx.restore(); // Restore from Yuta scaling and rotation
  }

  _drawYutaSwordStrap(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.gunAngle); // Align with his facing direction

    // Draw a thick strap over his right shoulder (+Y) and under his left arm (-Y)
    ctx.strokeStyle = '#1A1A1A'; // Thick black leather strap
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-12, -this.r + 2.5); // Top-left (shoulder region)
    ctx.lineTo(12, this.r - 2.5);   // Bottom-right (underarm region)
    ctx.stroke();

    // A small gold buckle fitting in the middle of the chest strap
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-2, -2, 4, 4);

    ctx.restore();
  }
}
