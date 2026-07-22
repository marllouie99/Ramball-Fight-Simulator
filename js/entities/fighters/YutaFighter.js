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

    // RCT Revival & Healing
    this.hasUsedRCTRevival = false;
    this.rctRevivalTimer = 0;
    this.rctCooldown = 0;
    this.damageWindow = [];

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
    this.rctCooldown = 0;
    this.damageWindow = [];
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
    if (this.rctCooldown > 0) this.rctCooldown--;

    // If reviving/healing via RCT, handle RCT and skip normal logic
    if (this.rctRevivalTimer > 0) {
      this.rctRevivalTimer--;
      this.vx = 0;
      this.vy = 0;

      const targetHp = this.maxHp * (CONFIG.yuta.rctRevivalHealPercent || 0.15);
      const healAmount = targetHp / (CONFIG.yuta.rctRevivalDuration || 150);
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

    if (this._handleTimeStop()) return;

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
          const rk = this.rika;
          if (rk.cooldownTimer <= 0 && !rk.active) {
            rk.active = true;
            rk.timer = CONFIG.yuta.rikaDuration || 600;
            rk.x = this.x;
            rk.y = this.y;
            rk.hp = rk.maxHp; // Restore her HP
            
            // Add her to the global targeting pool so AI and projectiles lock onto her
            if (typeof state !== 'undefined') {
              if (!state.illusions) state.illusions = [];
              if (!state.illusions.includes(rk)) {
                state.illusions.push(rk);
              }
            }
          }
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

    // Smoothly fade Rika herself in/out to prevent snappy appearances
    if (this.rikaAlpha === undefined) this.rikaAlpha = 0;
    const targetRika = (this.rika && this.rika.active) ? 1.0 : 0.0;
    if (this.rikaAlpha < targetRika) {
      this.rikaAlpha = Math.min(targetRika, this.rikaAlpha + 0.05); // Fades in over 20 frames
    } else if (this.rikaAlpha > targetRika) {
      this.rikaAlpha = Math.max(targetRika, this.rikaAlpha - 0.05); // Fades out over 20 frames
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
      const isStunned = (this.hitStunTimer > 0);
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
      if (this.domainChargeTimer % 3 === 0) {
        spawnSparks(this.x + (Math.random()-0.5)*30, this.y + (Math.random()-0.5)*30, 3, 'silver', 'rgba(255, 105, 180, 1)');
      }
      if (this.domainChargeTimer % 15 === 0) {
        spawnImpactFlash(this.x, this.y, 45, 'rgba(255, 20, 147, 0.4)');
        triggerGlobalScreenShake(2, 5); // Micro-shakes as he concentrates
      }

      // Play domain_activate audio before deploying
      const deployAudioFrame = CONFIG.yuta.domainDeployAudioFrame ?? this.domainChargeMax;
      if (this.domainChargeTimer === deployAudioFrame && !this._playedDeployAudio) {
        this._playedDeployAudio = true;
        const activateSound = getSkillSound(this._def?.id, 'domain_activate') || getSkillSound(this._def?.id, 'domain');
        if (activateSound) playSound(activateSound.src, activateSound.volume);
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
        this._playedDeployAudio = false;
        
        triggerGlobalScreenShake(6, 120); // Long screen shake matching Gojo/Sukuna
        const channelSound = getSkillSound(this._def?.id, 'domain_channel');
        if (channelSound) playSound(channelSound.src, channelSound.volume);
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
    if (this.hp > 0 && !this.isChannelingDomain && !this.domainActive) {
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

    if (!this.domainActive && !isSwinging && !unblockable && this.hp > 0 && Math.random() < blockChance) {
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

    // Track 3-second damage window for non-fatal heavy damage RCT heal trigger
    if (amount > 0 && this.invincibilityTimer <= 0) {
      const now = Date.now();
      if (!this.damageWindow) this.damageWindow = [];
      this.damageWindow.push({ amount, time: now });

      // Keep only damage entries from the last 3000ms (3 seconds)
      this.damageWindow = this.damageWindow.filter(d => now - d.time <= 3000);

      const totalDamageIn3s = this.damageWindow.reduce((sum, d) => sum + d.amount, 0);
      const rctDamageThreshold = this.maxHp * 0.20; // 20% of max HP taken within 3 seconds

      if (totalDamageIn3s >= rctDamageThreshold && (this.rctCooldown || 0) <= 0 && this.rctRevivalTimer <= 0) {
        const duration = CONFIG.yuta.rctRevivalDuration || 150;
        this.rctRevivalTimer = duration;
        this.invincibilityTimer = duration;
        this.rctCooldown = 600; // 10 second cooldown between heavy damage RCT triggers
        this.damageWindow = [];

        spawnFloatingText(this.x, this.y - 40, 'RCT HEAL!', '#00FF66');
        triggerGlobalScreenShake(6, 10);
      }
    }

    return super.takeDamage(amount, attacker, opts);
  }

  activateDomain() {
    this.isChannelingDomain = false;
    this.domainActive = true;
    this.domainActivationTime = Date.now();
    this.domainTimer = CONFIG.yuta.domainDuration || 400;
    this.domainX = this.x;
    this.domainY = this.y;

    // Refresh Rika so she manifests immediately when the domain opens
    if (this.rika) {
      this.rika.cooldownTimer = 0;
      this.rika.killedInDomain = false;
    }

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
        currentAngle += (-Math.PI / 4) + (Math.PI / 2) * progress;
      } else if (comboIndex === 1) {
        currentAngle += (Math.PI / 4) - (Math.PI / 2) * progress;
      } else if (comboIndex === 2) {
        currentAngle += (-Math.PI * 0.6) + (Math.PI * 1.2) * progress;
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
        currentAngle += (-Math.PI / 4) + (Math.PI / 2) * progress;
      } else if (comboIndex === 1) {
        currentAngle += (Math.PI / 4) - (Math.PI / 2) * progress;
      } else if (comboIndex === 2) {
        currentAngle += (-Math.PI * 0.6) + (Math.PI * 1.2) * progress;
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

      // (Removed shadowBlur for 60 FPS performance)

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
      for (let i = 0; i < allPoints.length; i++) {
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
      for (let i = 0; i < allPoints.length; i++) {
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

      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let mxS = (allPoints[allPoints.length - 1].x + allPoints[0].x) / 2;
      let myS = (allPoints[allPoints.length - 1].y + allPoints[0].y) / 2;
      ctx.moveTo(mxS, myS);
      for (let i = 0; i < allPoints.length; i++) {
        const p = allPoints[i];
        const next = allPoints[(i + 1) % allPoints.length];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
      }
      ctx.closePath();
      ctx.stroke();

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
        fullEndAngle = Math.PI * 0.42;
      } else if (comboIndex === 1) {
        fullStartAngle = Math.PI * 0.42;
        fullEndAngle = -Math.PI * 0.42;
      } else if (comboIndex === 2) {
        fullStartAngle = -Math.PI * 0.75;
        fullEndAngle = Math.PI * 0.75;
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
      const outerOffset = 8; // Outer crescent is puffed outward from arcRadius
      const innerOffset = 6; // Inner crescent cuts inward from arcRadius

      // Helper: crescent thickness weight at normalised position t∈[0,1]
      // sin(t*π) gives 0 at both ends, 1 at centre. Pow sharpens the tip taper.
      const crescentWeight = (t) => Math.pow(Math.sin(t * Math.PI), 1.5);

      // ------ 1. Main pink crescent body ------
      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      // Forward pass — outer edge
      for (let i = 0; i <= numSegments; i++) {
        const t = i / numSegments;
        const angle = fullStartAngle + arcWidth * t;
        const w = crescentWeight(t);
        const r = arcRadius + outerOffset + maxThickness * w;
        if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      // Reverse pass — inner edge (creates closed crescent polygon)
      for (let i = numSegments; i >= 0; i--) {
        const t = i / numSegments;
        const angle = fullStartAngle + arcWidth * t;
        const w = crescentWeight(t);
        const r = arcRadius - innerOffset - maxThickness * w;
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
      coreGrad.addColorStop(0, 'rgba(255, 180, 220, 0.0)');
      coreGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      const coreMax = 7;
      for (let i = 0; i <= numSegments; i++) {
        const t = i / numSegments;
        const angle = fullStartAngle + arcWidth * t;
        const w = crescentWeight(t);
        const r = arcRadius + outerOffset + maxThickness * w - 1;
        if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      for (let i = numSegments; i >= 0; i--) {
        const t = i / numSegments;
        const angle = fullStartAngle + arcWidth * t;
        const w = crescentWeight(t);
        const r = arcRadius + outerOffset + maxThickness * w - 1 - coreMax * w;
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
        const t = i / numSegments;
        const angle = fullStartAngle + arcWidth * t;
        const w = crescentWeight(t);
        const r = arcRadius + outerOffset + maxThickness * w;
        if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';

      // ------ 4. Ink calligraphy strokes (sparse, interior detail) ------
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.lineCap = 'butt';
      const inkRadii = [arcRadius - 4, arcRadius + outerOffset * 0.5];
      for (let layer = 0; layer < inkRadii.length; layer++) {
        const radius = inkRadii[layer];
        const segments = 10;
        for (let s = 0; s < segments; s++) {
          const ratio = s / segments;
          const angle = fullStartAngle + arcWidth * ratio;
          if (isAnticlockwise ? (angle < currentEndAngle) : (angle > currentEndAngle)) break;
          const inkSeed = Math.sin(ratio * 14.5 + Date.now() * 0.015 + layer * 23.3);
          if (inkSeed < 0.1) continue; // sparser gaps
          const nextAngle = fullStartAngle + arcWidth * ((s + 1) / segments);
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
        const w = crescentWeight(spikeRatio);
        const baseR = arcRadius + outerOffset + maxThickness * w;
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

  drawDomainBackground(ctx, isClashSecondary = false) {
    const isRikaVisible = (this.rika && (this.rika.active || (this.rikaAlpha && this.rikaAlpha > 0.05)));
    if (this.domainActive || isRikaVisible) {
      ctx.save();
      const time = Date.now();
      const pulse = Math.sin(time / 300) * 0.04;
      const alphaMult = this.domainActive ? 1.0 : Math.min(1.0, this.rikaAlpha || 1.0);

      // Anchor domain structure to the center of the arena so pillars always frame the arena box perfectly
      const arena = CONFIG.arena;
      const centerX = arena ? (arena.x + arena.width / 2) : (this.domainActive && this.domainX !== undefined ? this.domainX : this.x);
      const centerY = arena ? (arena.y + arena.height / 2) : (this.domainActive && this.domainY !== undefined ? this.domainY : this.y);
      const arenaW = arena ? arena.width : 800;
      const arenaH = arena ? arena.height : 600;

      const domX = centerX;
      const domY = centerY;

      let midX = domX;
      let midY = domY;

      const domainRadius = CONFIG.yuta.domainRadius || 350;

      // ── 1. DARK ATMOSPHERIC VOID & ROSY AMBIENT GLOW ──
      ctx.save();

      if (!isClashSecondary) {
        const bgGrad = ctx.createRadialGradient(midX, midY, 40, midX, midY, 650);
        bgGrad.addColorStop(0, `rgba(55, 10, 32, ${(0.65 + pulse) * alphaMult})`);   // Dark rose core
        bgGrad.addColorStop(0.35, `rgba(28, 6, 18, ${(0.78 + pulse) * alphaMult})`); // Deep magenta-black
        bgGrad.addColorStop(0.75, `rgba(12, 3, 9, ${(0.88 + pulse) * alphaMult})`);  // Charcoal void
        bgGrad.addColorStop(1, `rgba(4, 1, 4, ${(0.95 + pulse) * alphaMult})`);      // Deep black outer edge

        ctx.fillStyle = bgGrad;
        ctx.fillRect(midX - 1000, midY - 1000, 2000, 2000);
      }

      if (this.domainActive) {
        // ── 2. DOMAIN BARRIER BOUNDARY ──
        // (Removed ring per user request)

        // ── 2.5 DARK ATMOSPHERIC VORTEX ──
        ctx.save();
        ctx.globalAlpha = (0.6 + pulse * 2) * alphaMult;
        
        // Draw a massive dark vortex in the top center of the domain
        const vortexGradient = ctx.createRadialGradient(domX, domY - arenaH * 0.45, 50, domX, domY - arenaH * 0.45, 600);
        vortexGradient.addColorStop(0, '#000000');
        vortexGradient.addColorStop(0.2, '#0c0207');
        vortexGradient.addColorStop(0.6, 'rgba(20, 5, 15, 0.6)');
        vortexGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = vortexGradient;
        ctx.beginPath();
        ctx.arc(domX, domY - arenaH * 0.45, 600, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw swirling rings for the vortex (skip heavy ring loops during domain clashes for 60 FPS)
        const isMultiDomain = (state.fighters && state.fighters.filter(f => f && f.domainActive).length > 1);
        if (!isMultiDomain) {
          ctx.strokeStyle = 'rgba(50, 10, 30, 0.3)';
          for (let i = 0; i < 6; i++) {
            ctx.lineWidth = 15 + i * 8;
            ctx.beginPath();
            ctx.ellipse(domX, domY - arenaH * 0.45, 120 + i * 90, 50 + i * 35, (time * 0.0003) + (i * 0.5), 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.restore();

        // ── 3. INFINITE FIELD OF GROUND-PIERCED KATANAS (Pre-cached for 60 FPS performance) ──
        ctx.save();
        
        // Cache blade gradient to prevent FPS drops
        const fgBladeGrad = ctx.createLinearGradient(-1.5, 0, 1.5, 0);
        fgBladeGrad.addColorStop(0, '#ffffff');
        fgBladeGrad.addColorStop(0.5, '#d8d8d8');
        fgBladeGrad.addColorStop(1, '#909090');

        // Pre-calculate & render entire katana field ONCE to offscreen canvas for hardware acceleration
        const cacheKey = `${arenaW}_${arenaH}_${domX}_${domY}`;
        if (!this._cachedSwordsCanvas || this._cachedSwordsKey !== cacheKey) {
          this._cachedSwordsKey = cacheKey;
          const cvsW = (typeof state !== 'undefined' && state.canvas && state.canvas.width) ? state.canvas.width : 1200;
          const cvsH = (typeof state !== 'undefined' && state.canvas && state.canvas.height) ? state.canvas.height : 900;
          
          this._cachedSwordsCanvas = document.createElement('canvas');
          this._cachedSwordsCanvas.width = cvsW;
          this._cachedSwordsCanvas.height = cvsH;
          const offCtx = this._cachedSwordsCanvas.getContext('2d');

          const pillarLayout = [
            { dx: -arenaW * 0.38, dy:  arenaH * 0.25 },
            { dx: -arenaW * 0.28, dy: -arenaH * 0.08 },
            { dx: -arenaW * 0.14, dy: -arenaH * 0.34 },
            { dx:  arenaW * 0.14, dy: -arenaH * 0.34 },
            { dx:  arenaW * 0.28, dy: -arenaH * 0.08 },
            { dx:  arenaW * 0.38, dy:  arenaH * 0.25 }
          ];

          const swords = [];
          const rows = 6;
          const cols = 6;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const index = r * cols + c;
              const jitterX = (Math.sin(index * 17.3 + 1.2) * 0.35 + 0.5);
              const jitterY = (Math.cos(index * 13.7 + 2.4) * 0.35 + 0.5);

              const gridX = (c + jitterX) / cols;
              const gridY = (r + jitterY) / rows;

              const sx = arena ? (arena.x + 35 + gridX * (arena.width - 70)) : (domX - 300 + gridX * 600);
              const sy = arena ? (arena.y + 35 + gridY * (arena.height - 70)) : (domY - 220 + gridY * 440);

              let overlapsPillar = false;
              for (let p = 0; p < pillarLayout.length; p++) {
                const px = domX + pillarLayout[p].dx;
                const py = domY + pillarLayout[p].dy;
                if (Math.abs(sx - px) < 55 && sy <= py + 20 && sy >= py - 220) {
                  overlapsPillar = true;
                  break;
                }
              }
              if (overlapsPillar) continue;

              const depthProgress = arena ? Math.max(0, Math.min(1, (sy - arena.y) / arena.height)) : gridY;
              const kScale = 0.28 + Math.pow(depthProgress, 1.3) * 1.55;
              const tiltAngle = (index % 5 - 2) * 0.12;

              swords.push({ sx, sy, kScale, tiltAngle, index });
            }
          }
          swords.sort((a, b) => a.sy - b.sy);

          const offBladeGrad = offCtx.createLinearGradient(-1.5, 0, 1.5, 0);
          offBladeGrad.addColorStop(0, '#ffffff');
          offBladeGrad.addColorStop(0.5, '#d8d8d8');
          offBladeGrad.addColorStop(1, '#909090');

          swords.forEach(sword => {
            const { sx, sy, kScale, tiltAngle } = sword;

            offCtx.save();
            offCtx.translate(sx, sy);
            offCtx.scale(kScale, kScale);

            // Dirt crack notch where blade stabs into earth
            offCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            offCtx.beginPath();
            offCtx.ellipse(0, 1, 6, 2.5, 0, 0, Math.PI * 2);
            offCtx.fill();

            // Subtle pink ground glow
            offCtx.fillStyle = 'rgba(255, 105, 180, 0.35)';
            offCtx.beginPath();
            offCtx.ellipse(0, 1, 9, 4, 0, 0, Math.PI * 2);
            offCtx.fill();

            // Angled entry into dirt
            offCtx.rotate(tiltAngle);

            // Sharp blade angling into dirt
            offCtx.fillStyle = offBladeGrad;
            offCtx.beginPath();
            offCtx.moveTo(-1.5, -16);
            offCtx.lineTo(1.5, -16);
            offCtx.lineTo(0.5, 0);
            offCtx.lineTo(-0.5, 0);
            offCtx.closePath();
            offCtx.fill();

            // Hamon line on blade
            offCtx.strokeStyle = 'rgba(255, 105, 180, 0.7)';
            offCtx.lineWidth = 0.8;
            offCtx.beginPath();
            offCtx.moveTo(-1.2, -16);
            offCtx.lineTo(-0.4, 0);
            offCtx.stroke();

            // Tsuba (Golden Guard)
            offCtx.fillStyle = '#b8860b';
            offCtx.strokeStyle = '#5c4008';
            offCtx.lineWidth = 0.8;
            offCtx.beginPath();
            offCtx.ellipse(0, -16, 5, 2, 0, 0, Math.PI * 2);
            offCtx.fill();
            offCtx.stroke();

            // Detailed Handle (Tsuka) wrapped in diamond pattern grips
            const hiltH = 12;
            const hiltY = -16 - hiltH;

            // Black ray skin underlayer
            offCtx.fillStyle = '#111111';
            offCtx.fillRect(-1.8, hiltY, 3.6, hiltH);

            // Diamond pattern cord wrap (batched into single path draw)
            offCtx.fillStyle = '#ff69b4';
            offCtx.beginPath();
            for (let d = 0; d < 3; d++) {
              const dy = hiltY + 1.5 + d * 3.5;
              offCtx.moveTo(0, dy);
              offCtx.lineTo(1.6, dy + 1.5);
              offCtx.lineTo(0, dy + 3);
              offCtx.lineTo(-1.6, dy + 1.5);
              offCtx.closePath();
            }
            offCtx.fill();

            // Kashira (Golden Pommel Cap)
            offCtx.fillStyle = '#d4af37';
            offCtx.fillRect(-2, hiltY - 2, 4, 2);

            offCtx.restore();
          });
        }

        if (this._cachedSwordsCanvas) {
          ctx.drawImage(this._cachedSwordsCanvas, 0, 0);
        }

        ctx.restore();

        // ── 3. TOWERING CROSS PILLARS ──
        ctx.save();
        const crossPillars = [];
        // Horseshoe arch formation matching user's sketch, scaled to arena dimensions:
        // Lower-left -> Mid-left -> Top-left -> Top-right -> Mid-right -> Lower-right
        const layout = [
          { dx: -arenaW * 0.38, dy:  arenaH * 0.25, tilt: -0.14 }, // 0: Lower-left (Tilted left)
          { dx: -arenaW * 0.28, dy: -arenaH * 0.08, tilt:  0.00 }, // 1: Mid-left (Standing straight)
          { dx: -arenaW * 0.14, dy: -arenaH * 0.34, tilt:  0.10 }, // 2: Top-left (Tilted right)
          { dx:  arenaW * 0.14, dy: -arenaH * 0.34, tilt:  0.00 }, // 3: Top-right (Standing straight)
          { dx:  arenaW * 0.28, dy: -arenaH * 0.08, tilt: -0.12 }, // 4: Mid-right (Tilted left)
          { dx:  arenaW * 0.38, dy:  arenaH * 0.25, tilt:  0.00 }  // 5: Lower-right (Standing straight)
        ];
        
        for (let p = 0; p < layout.length; p++) {
          const px = domX + layout[p].dx;
          const py = domY + layout[p].dy;
          
          const depth = py - domY; 
          // Scale from ~1.1x in back up to ~3.5x in front for 3D perspective
          const scale = 1.1 + ((depth + arenaH * 0.34) / (arenaH * 0.6)) * 2.4; 
          
          const tiltAngle = layout[p].tilt;
          
          crossPillars.push({ px, py, scale, seed: p, id: p, tiltAngle });
        }
        
        // Continuous chain connecting sequentially from left to right along the horseshoe arch
        const chainConnections = [
          [0, 1], // Lower-left to Mid-left
          [1, 2], // Mid-left to Top-left
          [2, 3], // Top-left to Top-right (drapes across the top)
          [3, 4], // Top-right to Mid-right
          [4, 5]  // Mid-right to Lower-right
        ];
        
        // Draw Chains between pillars BEFORE sorting, so chains render behind pillar bodies
        ctx.save();
        ctx.lineCap = 'round';
        for (const [i1, i2] of chainConnections) {
          const p1 = crossPillars[i1];
          const p2 = crossPillars[i2];
          
          // Account for pillar tilt angle in attachment points
          const attachX1 = p1.px - Math.sin(p1.tiltAngle) * (45 * p1.scale);
          const attachY1 = p1.py - Math.cos(p1.tiltAngle) * (45 * p1.scale);
          const attachX2 = p2.px - Math.sin(p2.tiltAngle) * (45 * p2.scale);
          const attachY2 = p2.py - Math.cos(p2.tiltAngle) * (45 * p2.scale);
          
          const dist = Math.hypot(attachX2 - attachX1, attachY2 - attachY1);
          
          // control point for droop
          const cpX = (attachX1 + attachX2) / 2;
          const cpY = (attachY1 + attachY2) / 2 + Math.min(120, dist * 0.32); // Smooth droop curve
          
          // Base dark shadow chain
          ctx.strokeStyle = '#050204';
          ctx.lineWidth = Math.max(2, 3.5 * ((p1.scale + p2.scale) / 2));
          ctx.beginPath();
          ctx.moveTo(attachX1, attachY1);
          ctx.quadraticCurveTo(cpX, cpY, attachX2, attachY2);
          ctx.stroke();
          
          // Chain links (dashed metallic)
          ctx.strokeStyle = '#5a4d56';
          ctx.lineWidth = Math.max(1.5, 2.5 * ((p1.scale + p2.scale) / 2));
          ctx.setLineDash([5, 8]);
          ctx.beginPath();
          ctx.moveTo(attachX1, attachY1);
          ctx.quadraticCurveTo(cpX, cpY, attachX2, attachY2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
        
        // Sort pillars by depth (Y) so foreground pillars overlap background elements
        crossPillars.sort((a, b) => a.py - b.py);
        
        // Cache dimensions and gradients outside the loop to fix FPS drop
        const w = 10;
        const h = 55;
        const beamW = 34;
        const beamH = 8;
        const beamY = -h + 12;

        const pillarGrad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
        pillarGrad.addColorStop(0, '#110c14');
        pillarGrad.addColorStop(0.2, '#2e2233');
        pillarGrad.addColorStop(0.7, '#43344a');
        pillarGrad.addColorStop(1, '#1b1420');
        
        const beamGrad = ctx.createLinearGradient(0, beamY, 0, beamY + beamH);
        beamGrad.addColorStop(0, '#43344a');
        beamGrad.addColorStop(0.5, '#2e2233');
        beamGrad.addColorStop(1, '#110c14');

        crossPillars.forEach(pillar => {
          ctx.save();
          ctx.translate(pillar.px, pillar.py);
          ctx.rotate(pillar.tiltAngle);
          ctx.scale(pillar.scale, pillar.scale);
          
          // Ground shadow & impact crater at pillar base to ground the pillar firmly into earth
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.beginPath();
          ctx.ellipse(0, 2, w * 1.8, w * 0.65, 0, 0, Math.PI * 2);
          ctx.fill();

          // Radiating ground cracks around pillar base
          ctx.strokeStyle = 'rgba(10, 3, 12, 0.85)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(-w * 0.8, 1); ctx.lineTo(-w * 1.9, 6);
          ctx.moveTo(w * 0.8, 1); ctx.lineTo(w * 1.9, 7);
          ctx.moveTo(0, 2); ctx.lineTo(0, 10);
          ctx.stroke();
          ctx.restore();

          // Draw vertical pillar body
          ctx.fillStyle = pillarGrad;
          ctx.strokeStyle = '#050205';
          ctx.lineWidth = 0.8;
          
          ctx.beginPath();
          ctx.rect(-w/2, -h, w, h + 2);
          ctx.fill();
          ctx.stroke();
          
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.rect(-beamW/2, beamY, beamW, beamH);
          ctx.fill();
          ctx.stroke();

          // Stone Rubble & Debris Mound piled around pillar base (roots pillar into ground)
          ctx.fillStyle = '#221828';
          ctx.strokeStyle = '#0c0710';
          ctx.lineWidth = 0.6;

          // Left rock debris
          ctx.beginPath();
          ctx.moveTo(-w * 1.3, 2);
          ctx.lineTo(-w * 0.6, -6);
          ctx.lineTo(-w * 0.1, 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Right rock debris
          ctx.beginPath();
          ctx.moveTo(0, 2);
          ctx.lineTo(w * 0.65, -7);
          ctx.lineTo(w * 1.3, 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Front stone highlight rubble
          ctx.fillStyle = '#3a2b42';
          ctx.beginPath();
          ctx.moveTo(-w * 0.45, 3);
          ctx.lineTo(0, -3);
          ctx.lineTo(w * 0.45, 3);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Stone Textures & Detailed Jagged Cracks (Clipped strictly inside pillar stone)
          ctx.save();
          
          // Clip stippling & cracks strictly to the pillar & beam geometry so nothing spills outside
          ctx.beginPath();
          ctx.rect(-w/2 + 0.5, -h + 0.5, w - 1, h);
          ctx.rect(-beamW/2 + 0.5, beamY + 0.5, beamW - 1, beamH - 1);
          ctx.clip();

          // 1. Stippling / Rough stone texture
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          for(let i = 0; i < 8; i++) {
             const tx = (((pillar.seed * 7.1 + i * 3.3) * 13) % (w - 2)) - (w/2 - 1);
             const ty = -h + 4 + ((((pillar.seed * 2.3 + i * 4.1) * 17) % 1) * (h - 8));
             ctx.fillRect(tx, ty, 1.2, 1.2);
          }
          
          // 2. Jagged deep cracks (shadow + highlight for 3D etched depth)
          const drawCrackPath = (offsetX, offsetY, color, width) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'miter';
            ctx.beginPath();
            
            const seed = pillar.seed;
            // Vertical main crack down stone shaft
            const x = (Math.sin(seed * 4.1) * (w * 0.22)) + offsetX;
            const y = -h + 5 + offsetY;
            ctx.moveTo(x, y);
            ctx.lineTo(x + 1.8, y + 10);
            ctx.lineTo(x - 1.8, y + 22);
            ctx.lineTo(x + 1.2, y + 35);
            ctx.lineTo(x - 1.0, y + 46);

            // Branch fracture
            const bx = x - 1.8;
            const by = y + 22;
            ctx.moveTo(bx, by);
            ctx.lineTo(bx - 2.2, by + 10);
            ctx.lineTo(bx - 0.8, by + 18);

            // Horizontal crossbeam cracks
            ctx.moveTo(-beamW * 0.32 + offsetX, beamY + 1.5 + offsetY);
            ctx.lineTo(-beamW * 0.24 + offsetX, beamY + 4.0 + offsetY);
            ctx.lineTo(-beamW * 0.29 + offsetX, beamY + 6.5 + offsetY);

            ctx.moveTo(beamW * 0.22 + offsetX, beamY + 1.5 + offsetY);
            ctx.lineTo(beamW * 0.28 + offsetX, beamY + 4.5 + offsetY);
            ctx.lineTo(beamW * 0.24 + offsetX, beamY + 6.5 + offsetY);

            ctx.stroke();
          };

          // 3D Shadow layer (dark deep fracture)
          drawCrackPath(0, 0, 'rgba(5, 2, 7, 0.95)', 0.8);
          // 3D Highlight layer (subtle stone rim light on crack edge)
          drawCrackPath(0.4, 0.4, 'rgba(190, 170, 210, 0.3)', 0.5);

          ctx.restore();
          
          ctx.restore();
        });
        
        ctx.restore();



        // ── 5. ATMOSPHERIC FLOATING PETALS ──
        ctx.save();
        for (let p = 0; p < 16; p++) {
          const px = domX + Math.sin(time * 0.0006 + p * 1.7) * (domainRadius * 0.85);
          const py = domY + Math.cos(time * 0.0005 + p * 2.3) * (domainRadius * 0.85);
          const pAlpha = 0.25 + Math.sin(time * 0.002 + p) * 0.15;

          ctx.fillStyle = `rgba(255, 182, 193, ${pAlpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore(); // Restore arena clip
      ctx.restore(); // Restore background save
    }
  }

  draw(ctx, opponent) {
    if (this.isChannelingDomain) {
      this._drawDomainChannelAura(ctx);
    }

    this._drawYutaCursedEnergyAura(ctx);

    // Draw sword bag on his back (behind body)
    this._drawYutaSwordBag(ctx);

    super.draw(ctx, opponent);

    if (this.rika && this.rikaAlpha > 0) {
      if (this.hp <= 0) {
        // Trigger retracting/shrinking instantly if Yuta dies
        if (this.rika.active && !this.rika.disappearing) {
          this.rika.disappearing = true;
          this.rika.disappearDuration = 30;
          this.rika.disappearTimer = 30;
          this.rika.startX = this.rika.x;
          this.rika.startY = this.rika.y;
        }

        // Run updateRika since normal update loop bypasses dead fighters
        if (this.rika.active) {
          updateRika(this, CONFIG.arena);
        }

        // Gradually fade rikaAlpha to 0 once Rika starts disappearing on death
        if (this.rika.disappearing) {
          this.rikaAlpha = Math.max(0, this.rikaAlpha - 0.04);
        }
      }

      ctx.save();
      ctx.globalAlpha = this.rikaAlpha;
      this._drawRikaCursedEnergyAura(ctx, opponent);
      this._drawRika(ctx, opponent);
      ctx.restore();
    }
  }

  _drawDomainChannelAura(ctx) {
    const progress = Math.min(1.0, this.domainChargeTimer / Math.max(1, this.domainChargeMax));

    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. Floating Text above Yuta's head with glowing pink aura
    ctx.font = '900 26px "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    const textY = -this.r - 55 - (Math.sin(Date.now() / 150) * 5);

    // Fake glow for text
    ctx.strokeStyle = `rgba(255, 20, 147, ${progress * 0.4})`;
    ctx.lineWidth = 9;
    ctx.strokeText('DOMAIN EXPANSION', 0, textY);

    ctx.strokeStyle = `rgba(0, 0, 0, ${progress * 0.9})`;
    ctx.lineWidth = 5;
    ctx.strokeText('DOMAIN EXPANSION', 0, textY);

    ctx.fillStyle = `rgba(255, 255, 255, ${progress})`;
    ctx.fillText('DOMAIN EXPANSION', 0, textY);

    // 2. Isometric Ground Summoning Ring
    ctx.scale(1, 0.45);
    const ringRadius = 140 * progress;

    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    
    // Fake glow for ring
    ctx.lineWidth = 15;
    ctx.strokeStyle = `rgba(255, 20, 147, ${progress * 0.3})`;
    ctx.stroke();

    ctx.lineWidth = 5;
    ctx.strokeStyle = `rgba(255, 20, 147, ${progress})`;
    ctx.stroke();

    ctx.restore();
  }

  _drawRika(ctx, opponent) {
    if (!this.rika) return;

    ctx.save();
    ctx.translate(this.rika.x, this.rika.y);

    const rk = this.rika;
    const r = (rk.r !== undefined && rk.r !== null) ? Math.max(0.1, rk.r) : 30;
    const now = Date.now();
    const pulse = Math.sin(now / 150) * (r * 0.06);

    // Determine facing angle towards target or movement direction (bird's-eye view facing angle)
    let targetAngle = 0;
    
    if (rk.timeStopTimer > 0 || rk.hitStunTimer > 0 || rk.isDying) {
      // Freeze rotation when paralyzed or dying
      targetAngle = rk.angle || 0;
    } else {
      if (opponent && !opponent.isDead) {
        targetAngle = Math.atan2(opponent.y - rk.y, opponent.x - rk.x);
      } else if (Math.hypot(rk.vx, rk.vy) > 0.1) {
        targetAngle = Math.atan2(rk.vy, rk.vx);
      } else {
        targetAngle = rk.angle || 0;
      }
      rk.angle = targetAngle; // Save for next frame
    }

    // Rotate context so +x is forward facing
    ctx.rotate(targetAngle);

    // 2. Stretching Tail / Tether connecting Rika back to Yuta
    ctx.save();
    // Calculate Yuta's position relative to Rika's local space (we're already translated to rk.x, rk.y and rotated)
    const yutaDx = this.x - rk.x;
    const yutaDy = this.y - rk.y;
    // Transform Yuta's relative position into Rika's rotated coordinate system
    const cosA = Math.cos(-targetAngle);
    const sinA = Math.sin(-targetAngle);
    const localYutaX = yutaDx * cosA - yutaDy * sinA;
    const localYutaY = yutaDx * sinA + yutaDy * cosA;

    const tailDist = Math.hypot(localYutaX, localYutaY);
    const tailWave1 = Math.sin(now / 100) * 7;
    const tailWave2 = Math.cos(now / 130) * 9;

    // Tail thickness tapers from Rika (thick) to Yuta (thin)
    const baseWidth = r * 0.22;
    const tipWidth = r * 0.06;

    // Draw filled tail shape using two bezier curves (top edge and bottom edge)
    ctx.beginPath();
    // Top edge: from Rika's back toward Yuta
    ctx.moveTo(-r * 0.4, -baseWidth);
    ctx.bezierCurveTo(
      localYutaX * 0.35, localYutaY * 0.35 - baseWidth * 0.7 + tailWave1,
      localYutaX * 0.7, localYutaY * 0.7 - tipWidth * 1.5 + tailWave2,
      localYutaX, localYutaY - tipWidth
    );
    // Bottom edge: back from Yuta to Rika
    ctx.lineTo(localYutaX, localYutaY + tipWidth);
    ctx.bezierCurveTo(
      localYutaX * 0.7, localYutaY * 0.7 + tipWidth * 1.5 + tailWave2,
      localYutaX * 0.35, localYutaY * 0.35 + baseWidth * 0.7 + tailWave1,
      -r * 0.4, baseWidth
    );
    ctx.closePath();

    const tailGrad = ctx.createLinearGradient(-r * 0.4, 0, localYutaX, localYutaY);
    tailGrad.addColorStop(0, '#420E63');
    tailGrad.addColorStop(0.4, '#210638');
    tailGrad.addColorStop(0.8, '#0A0016');
    tailGrad.addColorStop(1, 'rgba(10, 0, 22, 0.3)');
    ctx.fillStyle = tailGrad;
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    const attackTimer = rk.attackTimer || 0;
    const isAttacking = (attackTimer > 0 || (rk.leftArmTimer || 0) > 0);

    // 3. Left & Right Top-Down Arms and Claws (reaching forward on both sides)
    // Arms alternate: right fires immediately, left fires 30 frames later via its own timer.
    const rightArmTimer = rk.rightArmTimer || 0;
    const leftArmTimer = rk.leftArmTimer || 0;

    // Left Arm (-y side)
    this._drawTopDownArmAndClaw(ctx, r * 0.2, -r * 1.1, r * 1.3, -r * 1.3, true, leftArmTimer);
    // Right Arm (+y side)
    this._drawTopDownArmAndClaw(ctx, r * 0.2, r * 1.1, r * 1.3, r * 1.3, false, rightArmTimer);

    // 4. Main Torso Circle (Base Hull from top-down)
    ctx.beginPath();
    ctx.arc(0, 0, r + pulse * 0.5, 0, Math.PI * 2);
    const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.2, 0, 0, r);
    bodyGrad.addColorStop(0, '#F6F2FA');   // Bone highlight
    bodyGrad.addColorStop(0.65, '#D2C8DC'); // Muscle grey
    bodyGrad.addColorStop(1, '#4D3E5E');   // Outer shadow
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ribcage / Skeletal overlay on shoulders/back
    ctx.save();
    ctx.strokeStyle = 'rgba(70, 50, 90, 0.4)';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(i * 4, 0, r * 0.6, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
    }
    ctx.restore();

    // 5. Crown Tendrils / Tubes (sweeping back over shoulders/spine)
    // Draw black outline pass first, then white tendrils on top
    for (let pass = 0; pass < 2; pass++) {
      ctx.save();
      ctx.strokeStyle = pass === 0 ? '#000000' : '#EBE5F2';
      ctx.lineWidth = pass === 0 ? 5.5 : 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = -2; i <= 2; i++) {
        const offset = i * 8; // Base y-spread

        ctx.beginPath();
        ctx.moveTo(r * 0.4, offset * 0.5); // Root on head

        const numSegments = 12;
        const tendrilLength = r * 2.5;

        for (let s = 1; s <= numSegments; s++) {
          const progress = s / numSegments;
          const currentX = r * 0.4 - (tendrilLength * progress); // Extending backwards

          // Wave amplitude grows towards the tip
          const waveAmplitude = 14 * Math.pow(progress, 1.5);

          // Traveling sine wave along the tendril's length
          // -progress * 6 creates the spatial "S" ripples
          // + i offsets the phase of each strand
          const waveY = Math.sin((now / 120) - (progress * 6) + i) * waveAmplitude;

          // Tendrils spread out slightly more at the tips
          const currentY = (offset * 0.5) + (offset * progress * 0.8) + waveY;

          ctx.lineTo(currentX, currentY);
        }
        ctx.stroke();
      }
      ctx.restore();
    } // end pass loop

    // 6. Top-Down Head & Gaping Teeth Maw (Front Center at +x)
    ctx.save();
    // Head dome
    ctx.beginPath();
    ctx.ellipse(r * 0.5, 0, r * 0.45, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#F8F5FA';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head Shell Rib Lines
    ctx.strokeStyle = 'rgba(120, 100, 140, 0.4)';
    ctx.lineWidth = 1.5;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.arc(r * 0.5, k * 4, r * 0.35, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
    }

    // Gaping Maw
    const mouthOpen = isAttacking ? 16 : 8;
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -mouthOpen * 0.5);
    ctx.lineTo(r * 1.1, 0);
    ctx.lineTo(r * 0.7, mouthOpen * 0.5);
    ctx.closePath();
    ctx.fillStyle = '#1A000A';
    ctx.fill();

    // Sharp Teeth inside maw (Top & Bottom halves)
    ctx.fillStyle = '#FFFEE0';
    for (let t = -3; t <= 3; t++) {
      if (t === 0) continue;
      const toothY = t * (mouthOpen * 0.12);
      ctx.beginPath();
      ctx.moveTo(r * 0.75, toothY);
      ctx.lineTo(r * 0.9, toothY + (t > 0 ? 1 : -1));
      ctx.lineTo(r * 0.8, toothY + (t > 0 ? 2 : -2));
      ctx.fill();
    }
    ctx.restore();

    // Attack Slash Ring Effect
    if (isAttacking) {
      ctx.strokeStyle = 'rgba(255, 180, 220, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r * 1.3, 0, 22, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
    }

    // 8. Draw Spectacular Triple-Claw Slash Visuals on top of everything
    const rikaArmsForVisual = [ 
      { timer: rk.rightArmTimer || 0, isLeft: false }, 
      { timer: rk.leftArmTimer || 0, isLeft: true } 
    ];
    
    try {
      rikaArmsForVisual.forEach(arm => {
        const armAttackTimer = arm.timer;
        const isLeftArm = arm.isLeft;
        if (armAttackTimer > 0) {
          const sideSign = isLeftArm ? -1 : 1;
          const startAng = 0.75 * sideSign;
          const targetAng = -0.75 * sideSign;
          
          const idleDx = r * 1.1; 
          const idleDy = r * 0.2 * sideSign;
          const idleAngle = Math.atan2(idleDy, idleDx);
          
          let slashActive = false;
          let slashProgress = 0;
          let slashAlpha = 0;
          let angleOffset = 0;
          
          const p = Math.min(60, armAttackTimer);
          if (p > 52) {
             // Wind up phase
          } else if (p > 42) {
             // Active swing phase
             const t = (52 - p) / 10;
             const eased = 1 - Math.pow(1 - t, 3);
             angleOffset = startAng + (targetAng - startAng) * eased;
             // Fade IN dynamically during swing
             slashAlpha = Math.min(1.0, t * 1.5) * 0.95;
             slashActive = true;
             slashProgress = t;
          } else {
             // Linger and fade phase
             if (p > 22) {
               slashActive = true;
               slashProgress = 1.0;
               // Fade OUT gracefully over 20 frames
               slashAlpha = ((p - 22) / 20) * 0.95;
               angleOffset = targetAng;
             }
          }
          
          if (slashActive && slashAlpha > 0.05) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            
            const clawRadii = [r * 1.5, r * 1.85, r * 2.2];
            
            const startAngle = idleAngle + startAng;
            const endAngle = idleAngle + (slashProgress === 1.0 ? targetAng : angleOffset);
            const anticlockwise = !isLeftArm;
            
            clawRadii.forEach((radius, index) => {
               // Layer 1: Bright Purple outer backing
               ctx.strokeStyle = `rgba(138, 43, 226, ${slashAlpha * 0.6})`;
               ctx.lineWidth = 10 - index * 1.5;
               ctx.lineCap = 'round';
               ctx.beginPath();
               ctx.arc(0, 0, radius, startAngle, endAngle, anticlockwise);
               ctx.stroke();
               
               // Layer 2: Glowing Hot pink mid-layer
               ctx.strokeStyle = `rgba(255, 20, 147, ${slashAlpha * 0.9})`;
               ctx.lineWidth = 6 - index;
               ctx.beginPath();
               ctx.arc(0, 0, radius, startAngle, endAngle, anticlockwise);
               ctx.stroke();
               
               // Layer 3: White-hot inner core
               ctx.strokeStyle = `rgba(255, 255, 255, ${slashAlpha})`;
               ctx.lineWidth = 2.5;
               ctx.beginPath();
               ctx.arc(0, 0, radius, startAngle, endAngle, anticlockwise);
               ctx.stroke();
            });
            ctx.restore();
          }
        }
      });
    } catch (e) {
      console.error("Error drawing Rika slash visual:", e);
    }

    // 9. Draw Health Bar
    if (rk.maxHp > 0 && rk.hp > 0) {
      ctx.save();
      ctx.rotate(-targetAngle); // Un-rotate so health bar draws horizontally flat
      
      const hpRatio = Math.max(0, rk.hp / rk.maxHp);
      const barW = r * 2.5;
      const barH = 5.5;
      const barX = -barW / 2;
      const barY = -r - 22; // Position clearly above her head

      // Background frame
      ctx.fillStyle = '#111';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      
      // Health fill color
      ctx.fillStyle = (hpRatio > 0.5) ? '#2ecc71' : (hpRatio > 0.25) ? '#f1c40f' : '#e74c3c'; // Green for high health
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
      
      ctx.restore();
    }

    ctx.restore(); // Restore main transform
  }

  _drawTopDownArmAndClaw(ctx, shoulderX, shoulderY, handX, handY, isLeft, attackTimer) {
    ctx.save();

    const sideSign = isLeft ? -1 : 1;
    const now = Date.now();

    // Compute the idle arm vector (from shoulder to hand)
    const idleDx = handX - shoulderX;
    const idleDy = handY - shoulderY;
    const armLen = Math.sqrt(idleDx * idleDx + idleDy * idleDy);
    const idleAngle = Math.atan2(idleDy, idleDx); // angle of idle arm

    let angleOffset = 0;
    let slashTrailAlpha = 0;
    let clawSpread = 0;

    const startAng = 0.75 * sideSign;   // Outward wind-up angle offset (pull back)
    const targetAng = -0.75 * sideSign; // Forward crossed slash angle offset (IN FRONT!)

    let isSlashing = false;
    let slashProgress = 0;

    if (attackTimer > 0) {
      const p = Math.min(60, attackTimer);
      if (p > 52) {
        const t = (60 - p) / 8;
        const eased = t * t;
        angleOffset = startAng * eased;
        clawSpread = 0.6 * eased;
      } else if (p > 42) {
        const t = (52 - p) / 10;
        const eased = 1 - Math.pow(1 - t, 3);
        angleOffset = startAng + (targetAng - startAng) * eased;
        slashTrailAlpha = (1 - t) * 0.95;
        clawSpread = 0.6 - (1.1 * eased);
        isSlashing = true;
        slashProgress = t;
      } else {
        const t = p / 42;
        const eased = t * t;
        angleOffset = targetAng * eased;
        clawSpread = -0.3 * eased;
        // Let the claw slash trail linger and fade out over 20 frames
        if (p > 22) {
          isSlashing = true;
          slashProgress = 1.0;
          slashTrailAlpha = ((p - 22) / 20) * 0.95;
        }
      }
    }

    const idleBreath = (attackTimer === 0) ? Math.sin(now / 800) * 0.03 : 0;
    const currentAngle = idleAngle + angleOffset + idleBreath;

    const finalHandX = shoulderX + Math.cos(currentAngle) * armLen;
    const finalHandY = shoulderY + Math.sin(currentAngle) * armLen;

    const elbowX = (shoulderX + finalHandX) * 0.5 + 10;
    const elbowY = (shoulderY + finalHandY) * 0.5 + (20 * sideSign);

    const wShoulder = 7;
    const wWrist = 4.5;
    const fingersData = [
      { name: 'Thumb', baseX: 7, baseY: isLeft ? 5.5 : -5.5, len: 19, baseAngle: isLeft ? 0.65 : -0.65, thick: 4.2 },
      { name: 'Index', baseX: 15, baseY: isLeft ? 3.5 : -3.5, len: 26, baseAngle: isLeft ? 0.22 : -0.22, thick: 4.0 },
      { name: 'Middle', baseX: 16, baseY: 0, len: 29, baseAngle: 0, thick: 4.2 },
      { name: 'Ring', baseX: 15, baseY: isLeft ? -3.5 : 3.5, len: 26, baseAngle: isLeft ? -0.22 : 0.22, thick: 3.8 },
      { name: 'Pinky', baseX: 13, baseY: isLeft ? -5.5 : 5.5, len: 21, baseAngle: isLeft ? -0.45 : 0.45, thick: 3.2 }
    ];
    const flexIdle = (attackTimer === 0) ? Math.sin(now / 400) * 0.05 : 0;

    // Claw slash visual has been moved to the end of _drawRika for correct layering on top of the torso

    // Muscular Arm with tapering organic outline
    ctx.save();
    const armAngle = Math.atan2(finalHandY - shoulderY, finalHandX - shoulderX);
    const nx = -Math.sin(armAngle);
    const ny = Math.cos(armAngle);

    ctx.beginPath();
    ctx.moveTo(shoulderX + nx * wShoulder, shoulderY + ny * wShoulder);
    ctx.quadraticCurveTo(elbowX + nx * 6, elbowY + ny * 6, finalHandX + nx * wWrist, finalHandY + ny * wWrist);
    ctx.lineTo(finalHandX - nx * wWrist, finalHandY - ny * wWrist);
    ctx.quadraticCurveTo(elbowX - nx * 6, elbowY - ny * 6, shoulderX - nx * wShoulder, shoulderY - ny * wShoulder);
    ctx.closePath();

    const armGrad = ctx.createLinearGradient(shoulderX, shoulderY, finalHandX, finalHandY);
    armGrad.addColorStop(0, '#EAE3F2');
    armGrad.addColorStop(0.7, '#D3C8DC');
    armGrad.addColorStop(1, '#B5A6C4');
    ctx.fillStyle = armGrad;
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Muscle / Tendon line art on forearm
    ctx.beginPath();
    ctx.moveTo(shoulderX + nx * 2, shoulderY + ny * 2);
    ctx.quadraticCurveTo(elbowX, elbowY, finalHandX + nx * 1, finalHandY + ny * 1);
    ctx.strokeStyle = 'rgba(70, 45, 90, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // Hand Palm & Claws (Image 2 style organic hand rendering)
    ctx.save();
    ctx.translate(finalHandX, finalHandY);

    // Rotate to point along forearm towards hand
    const palmAngle = currentAngle;
    ctx.rotate(palmAngle);

    // 1. Organic Palm (Fleshy contoured palm base)
    ctx.beginPath();
    ctx.moveTo(0, -wWrist);
    ctx.bezierCurveTo(6, -wWrist * 1.3, 12, -wWrist * 1.2, 16, -6);
    ctx.bezierCurveTo(18, -2, 18, 2, 16, 6);
    ctx.bezierCurveTo(10, wWrist * 1.3, 4, wWrist * 1.1, 0, wWrist);
    ctx.closePath();

    const palmGrad = ctx.createRadialGradient(8, 0, 2, 8, 0, 16);
    palmGrad.addColorStop(0, '#F6F2FA');
    palmGrad.addColorStop(0.6, '#D6CCE0');
    palmGrad.addColorStop(1, '#8A779E');
    ctx.fillStyle = palmGrad;
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Palm Crease & Muscle Line Art (matching sketch style in Image 2)
    ctx.beginPath();
    ctx.moveTo(4, -3);
    ctx.bezierCurveTo(9, -1, 13, 2, 15, 4);
    ctx.moveTo(6, 3);
    ctx.bezierCurveTo(10, 4, 13, 1, 15, -2);
    ctx.strokeStyle = 'rgba(50, 30, 70, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 2. Organic Clawed Fingers (5 Digits matching Image 2 gesture)
    fingersData.forEach((f, idx) => {
      ctx.save();
      ctx.translate(f.baseX, f.baseY);

      const curAngle = f.baseAngle + flexIdle + (clawSpread * (idx - 2) * 0.15);
      ctx.rotate(curAngle);

      const l = f.len;
      const w = f.thick;

      const p1x = l * 0.4;
      const p1y = isLeft ? -1.5 : 1.5;

      const p2x = l * 0.75;
      const p2y = isLeft ? 1.0 : -1.0;

      const tipX = l * 1.15;
      const tipY = isLeft ? 3.5 : -3.5;

      // Draw Organic Finger Body (Polygon / Path)
      ctx.beginPath();
      ctx.moveTo(0, -w * 0.5);
      ctx.quadraticCurveTo(p1x, p1y - w * 0.45, p2x, p2y - w * 0.35);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(p2x, p2y + w * 0.35);
      ctx.quadraticCurveTo(p1x, p1y + w * 0.45, 0, w * 0.5);
      ctx.closePath();

      const fingerGrad = ctx.createLinearGradient(0, 0, tipX, tipY);
      fingerGrad.addColorStop(0, '#F8F5FA');
      fingerGrad.addColorStop(0.5, '#D2C6DE');
      fingerGrad.addColorStop(0.85, '#68547C');
      fingerGrad.addColorStop(1, '#1E1029');
      ctx.fillStyle = fingerGrad;
      ctx.fill();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Rounded Knuckle Bulge (Joint 1)
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = '#E3D8EB';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Middle Joint (Joint 2) Crease Lines (Image 2 style)
      ctx.beginPath();
      ctx.moveTo(p1x, p1y - w * 0.4);
      ctx.lineTo(p1x, p1y + w * 0.4);
      ctx.moveTo(p1x + 2, p1y - w * 0.35);
      ctx.lineTo(p1x + 2, p1y + w * 0.35);
      ctx.strokeStyle = 'rgba(50, 25, 70, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Distal Talon / Nail highlight at tip
      ctx.beginPath();
      ctx.moveTo(p2x, p2y);
      ctx.lineTo(tipX, tipY);
      ctx.strokeStyle = '#12081A';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.restore();
    });

    ctx.restore();
    ctx.restore();
  }

  _drawRikaCursedEnergyAura(ctx, opponent) {
    const rk = this.rika;
    if (!rk) return;

    const showAura = (typeof state !== 'undefined' && state.previewShowCursedEnergy) || (this.cursedEnergyAlpha || 0) > 0.05 || this.domainActive;
    if (!showAura) return;

    const r = (rk.r !== undefined && rk.r !== null) ? Math.max(0.1, rk.r) : 30;
    const now = Date.now();

    // Stepped 30-frame anime animation loop (matching Yuta's 30fps Sakuga frame rate)
    const frameRate = 30;
    const frameIndex = Math.floor(Date.now() / (1000 / frameRate));
    const time = frameIndex * 120;

    let targetAngle = 0;
    if (opponent && !opponent.isDead) {
      targetAngle = Math.atan2(opponent.y - rk.y, opponent.x - rk.x);
    } else if (Math.hypot(rk.vx, rk.vy) > 0.1) {
      targetAngle = Math.atan2(rk.vy, rk.vx);
    }

    const yutaDx = this.x - rk.x;
    const yutaDy = this.y - rk.y;
    const cosA = Math.cos(-targetAngle);
    const sinA = Math.sin(-targetAngle);
    const localYutaX = yutaDx * cosA - yutaDy * sinA;
    const localYutaY = yutaDx * sinA + yutaDy * cosA;

    const rightArmTimer = rk.rightArmTimer || 0;
    const leftArmTimer = rk.leftArmTimer || 0;

    ctx.save();
    ctx.translate(rk.x, rk.y);

    // === 1. Luminous Backlight (Soft Natural Pink Diffusion) ===
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const glowRadius = Math.max(0.1, r * 4.5 + Math.sin(time * 0.005) * (r * 0.3));
    const backGlow = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, glowRadius);
    backGlow.addColorStop(0, 'rgba(255, 255, 255, 0.4)');     // Soft white core
    backGlow.addColorStop(0.3, 'rgba(255, 105, 180, 0.35)');  // Natural pink diffusion
    backGlow.addColorStop(0.7, 'rgba(255, 20, 147, 0.15)');   // Subtle outer feathering
    backGlow.addColorStop(1, 'rgba(255, 20, 147, 0)');         // Smooth blend into environment
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = backGlow;
    ctx.fill();
    ctx.restore();

    ctx.rotate(targetAngle);

    // Helper: Draw a form-fitting Yuta-style flame path around points
    const drawFlamePath = (pts, fillAlpha = 0.75) => {
      const numPts = pts.length;
      if (numPts < 3) return;

      // Outer Hot Pink Glow & Fill
      ctx.save();
      ctx.fillStyle = `rgba(255, 105, 180, ${fillAlpha})`;

      ctx.beginPath();
      let mx = (pts[numPts - 1].x + pts[0].x) / 2;
      let my = (pts[numPts - 1].y + pts[0].y) / 2;
      ctx.moveTo(mx, my);
      for (let i = 0; i < numPts; i++) {
        const p = pts[i];
        const next = pts[(i + 1) % numPts];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
      }
      ctx.closePath();
      ctx.fill();

      // === Yuta's Per-Segment Variable-Pressure Calligraphy Ink Brush Outline ===
      ctx.strokeStyle = '#000000';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.lineWidth = 2.2;
      ctx.beginPath();
      mx = (pts[numPts - 1].x + pts[0].x) / 2;
      my = (pts[numPts - 1].y + pts[0].y) / 2;
      ctx.moveTo(mx, my);
      for (let i = 0; i < numPts; i++) {
        const p = pts[i];
        const next = pts[(i + 1) % numPts];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
      }
      ctx.closePath();
      ctx.stroke();

      // Inner Light Pink Core Wash (Inset fill at 70% towards center)
      let cx = 0, cy = 0;
      pts.forEach(p => { cx += p.x; cy += p.y; });
      cx /= numPts; cy /= numPts;

      ctx.fillStyle = 'rgba(255, 192, 203, 0.85)';
      ctx.beginPath();
      let mx2 = (pts[numPts - 1].x + pts[0].x) / 2;
      let my2 = (pts[numPts - 1].y + pts[0].y) / 2;
      ctx.moveTo(cx + (mx2 - cx) * 0.7, cy + (my2 - cy) * 0.7);
      for (let i = 0; i < numPts; i++) {
        const p = pts[i];
        const next = pts[(i + 1) % numPts];
        const midX = (p.x + next.x) / 2;
        const midY = (p.y + next.y) / 2;
        const px = cx + (p.x - cx) * 0.7;
        const py = cy + (p.y - cy) * 0.7;
        const nx = cx + (midX - cx) * 0.7;
        const ny = cy + (midY - cy) * 0.7;
        ctx.quadraticCurveTo(px, py, nx, ny);
      }
      ctx.closePath();
      ctx.fill();

      // === Yuta's 3-Layer Inset Rough Ink Brush Hatch Cuts Along Border ===
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#000000';
      ctx.lineCap = 'butt';

      const insetScales = [0.84, 0.91, 0.96];
      for (let layer = 0; layer < insetScales.length; layer++) {
        const scale = insetScales[layer];
        const speedDir = (layer % 2 === 0 ? 1 : -1);
        const flowTime = time * 0.003 * speedDir;

        for (let i = 0; i < numPts; i++) {
          // Slow wave (long strokes) + fast wave (short details) = variety
          const longWave = Math.sin(i * 0.35 + layer * 8.0 + flowTime * 1.5) * 0.6;
          const shortWave = Math.sin(i * 2.5 - layer * 5.0 + flowTime * 3.5) * 0.4;
          const cutSeed = longWave + shortWave;
          if (cutSeed < 0.15) continue; // Higher threshold to reduce density

          const p = pts[i];
          const next = pts[(i + 1) % numPts];

          // Scale points towards center for inset placement
          const psx = cx + (p.x - cx) * scale;
          const psy = cy + (p.y - cy) * scale;
          const nsx = cx + (next.x - cx) * scale;
          const nsy = cy + (next.y - cy) * scale;

          ctx.lineWidth = 0.5 + (cutSeed * 1.5);
          ctx.beginPath();
          ctx.moveTo(psx, psy);
          // Add slight jaggedness to the cut
          const jagX = Math.cos(i * 43) * 3;
          const jagY = Math.sin(i * 43) * 3;
          ctx.lineTo(nsx + jagX, nsy + jagY);
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    // Helper: Draw a form-fitting Yuta-style flame along a spine (for tendrils and tethers)
    const drawFlameStroke = (spinePts, startW, endW) => {
      const len = spinePts.length;
      if (len < 2) return;

      const extrude = (scale) => {
        const poly = [];
        for (let i = 0; i < len; i++) {
          const p = spinePts[i];
          let dx, dy;
          if (i < len - 1) { dx = spinePts[i+1].x - p.x; dy = spinePts[i+1].y - p.y; }
          else { dx = p.x - spinePts[i-1].x; dy = p.y - spinePts[i-1].y; }
          const dist = Math.hypot(dx, dy);
          let nx = 0, ny = -1;
          if (dist > 0) { nx = -dy/dist; ny = dx/dist; }
          const w = (startW + (endW - startW) * (i / (len - 1))) * scale;
          poly.push({ x: p.x + nx * w, y: p.y + ny * w });
        }
        for (let i = len - 1; i >= 0; i--) {
          const p = spinePts[i];
          let dx, dy;
          if (i > 0) { dx = p.x - spinePts[i-1].x; dy = p.y - spinePts[i-1].y; }
          else { dx = spinePts[i+1].x - p.x; dy = spinePts[i+1].y - p.y; }
          const dist = Math.hypot(dx, dy);
          let nx = 0, ny = 1;
          if (dist > 0) { nx = dy/dist; ny = -dx/dist; }
          const w = (startW + (endW - startW) * (i / (len - 1))) * scale;
          poly.push({ x: p.x + nx * w, y: p.y + ny * w });
        }
        return poly;
      };

      const fillPoly = extrude(1.0);
      
      ctx.save();
      ctx.fillStyle = 'rgba(255, 105, 180, 0.75)';
      ctx.beginPath();
      ctx.moveTo(fillPoly[0].x, fillPoly[0].y);
      for (let i = 1; i < fillPoly.length; i++) ctx.lineTo(fillPoly[i].x, fillPoly[i].y);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#000000';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < fillPoly.length - 1; i++) {
        const pressureNoise = Math.sin(time * 0.002 + i * 1.7) * 0.5 + 0.5;
        ctx.lineWidth = 1.0 + pressureNoise * 2.2;
        ctx.beginPath();
        ctx.moveTo(fillPoly[i].x, fillPoly[i].y);
        ctx.lineTo(fillPoly[i+1].x, fillPoly[i+1].y);
        ctx.stroke();
      }

      const corePoly = extrude(0.7);
      ctx.fillStyle = 'rgba(255, 192, 203, 0.85)';
      ctx.beginPath();
      ctx.moveTo(corePoly[0].x, corePoly[0].y);
      for (let i = 1; i < corePoly.length; i++) ctx.lineTo(corePoly[i].x, corePoly[i].y);
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#000000';
      ctx.lineCap = 'butt';
      const insetScales = [0.84, 0.91, 0.96];
      for (let layer = 0; layer < insetScales.length; layer++) {
        const scale = insetScales[layer];
        const cutPoly = extrude(scale);
        const speedDir = (layer % 2 === 0 ? 1 : -1);
        const flowTime = time * 0.003 * speedDir;

        for (let i = 0; i < cutPoly.length - 1; i++) {
          const longWave = Math.sin(i * 0.35 + layer * 8.0 + flowTime * 1.5) * 0.6;
          const shortWave = Math.sin(i * 2.5 - layer * 5.0 + flowTime * 3.5) * 0.4;
          const cutSeed = longWave + shortWave;
          if (cutSeed < 0.15) continue;

          ctx.lineWidth = 0.5 + (cutSeed * 1.5);
          ctx.beginPath();
          ctx.moveTo(cutPoly[i].x, cutPoly[i].y);
          const jagX = Math.cos(i * 43) * 2;
          const jagY = Math.sin(i * 43) * 2;
          ctx.lineTo(cutPoly[i+1].x + jagX, cutPoly[i+1].y + jagY);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    // === 2. Tail Tether Flame ===
    const tailWave1 = Math.sin(now / 100) * 7;
    const tailWave2 = Math.cos(now / 130) * 9;
    
    const getBezierPt = (t, p0, p1, p2, p3) => {
      const mt = 1 - t;
      return {
        x: mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x,
        y: mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y
      };
    };

    const tetherSpine = [];
    const ts0 = { x: -r * 0.4, y: 0 };
    const ts1 = { x: localYutaX * 0.35, y: localYutaY * 0.35 + tailWave1 };
    const ts2 = { x: localYutaX * 0.7, y: localYutaY * 0.7 + tailWave2 };
    const ts3 = { x: localYutaX, y: localYutaY };
    for (let i = 0; i <= 12; i++) tetherSpine.push(getBezierPt(i/12, ts0, ts1, ts2, ts3));

    drawFlameStroke(tetherSpine, r * 0.22 + 8, r * 0.06 + 5);

    // === 3. Torso & Head Dome Form-Fitting Flame Body ===
    const torsoHeadPts = [];
    const numTH = 24;
    for (let i = 0; i < numTH; i++) {
      const a = (Math.PI * 2 / numTH) * i;
      const cosA = Math.cos(a);
      const headBonus = (cosA > 0) ? r * 0.45 * cosA : 0;
      const baseR = r * 1.3 + headBonus;

      const noise = Math.sin(a * 3.0 + time * 0.001) * 6 + Math.cos(a * 2.0 - time * 0.0012) * 4;
      const radius = baseR + noise;

      torsoHeadPts.push({
        x: Math.cos(a) * radius,
        y: Math.sin(a) * radius
      });
    }
    drawFlamePath(torsoHeadPts);

    // === 4. Wavy Crown Hair Tendrils Form-Fitting Flame Tubes ===
    for (let i = -2; i <= 2; i++) {
      const offset = i * 8;
      const numSegments = 12;
      const tendrilLength = r * 2.5;

      const tendrilSpine = [{ x: r * 0.4, y: offset * 0.5 }];
      for (let s = 1; s <= numSegments; s++) {
        const progress = s / numSegments;
        const currentX = r * 0.4 - (tendrilLength * progress);
        const waveAmplitude = 14 * Math.pow(progress, 1.5);
        const waveY = Math.sin((now / 120) - (progress * 6) + i) * waveAmplitude;
        const currentY = (offset * 0.5) + (offset * progress * 0.8) + waveY;
        const flicker = Math.sin(time * 0.002 + s * 0.4 + i) * 2.5;
        tendrilSpine.push({ x: currentX, y: currentY + flicker });
      }
      
      drawFlameStroke(tendrilSpine, 6, 2.5);
    }

    // === 5. Left & Right Form-Fitting Arm & Claw Flame Sleeves ===
    const buildArmPoints = (isLeft, timer) => {
      const sideSign = isLeft ? -1 : 1;
      const shoulderX = r * 0.2;
      const shoulderY = r * 1.1 * sideSign;
      const handX = r * 1.3;
      const handY = r * 1.3 * sideSign;

      const idleDx = handX - shoulderX;
      const idleDy = handY - shoulderY;
      const armLen = Math.hypot(idleDx, idleDy);
      const idleAngle = Math.atan2(idleDy, idleDx);

      let angleOffset = 0;
      let clawSpread = 0;
      const startAng = 0.75 * sideSign;
      const targetAng = -0.75 * sideSign;

      if (timer > 0) {
        const p = Math.min(60, timer);
        if (p > 52) {
          const t = (60 - p) / 8;
          angleOffset = startAng * (t * t);
          clawSpread = 0.6 * (t * t);
        } else if (p > 42) {
          const t = (52 - p) / 10;
          const eased = 1 - Math.pow(1 - t, 3);
          angleOffset = startAng + (targetAng - startAng) * eased;
          clawSpread = 0.6 - (1.1 * eased);
        } else {
          const t = p / 42;
          angleOffset = targetAng * (t * t);
          clawSpread = -0.3 * (t * t);
        }
      }

      const idleBreath = (timer === 0) ? Math.sin(now / 800) * 0.03 : 0;
      const currentAngle = idleAngle + angleOffset + idleBreath;

      const finalHandX = shoulderX + Math.cos(currentAngle) * armLen;
      const finalHandY = shoulderY + Math.sin(currentAngle) * armLen;

      const elbowX = (shoulderX + finalHandX) * 0.5 + 10;
      const elbowY = (shoulderY + finalHandY) * 0.5 + (20 * sideSign);

      const fingersData = [
        { baseX: 7, baseY: isLeft ? 5.5 : -5.5, len: 19, baseAngle: isLeft ? 0.65 : -0.65 },
        { baseX: 15, baseY: isLeft ? 3.5 : -3.5, len: 26, baseAngle: isLeft ? 0.22 : -0.22 },
        { baseX: 16, baseY: 0, len: 29, baseAngle: 0 },
        { baseX: 15, baseY: isLeft ? -3.5 : 3.5, len: 26, baseAngle: isLeft ? -0.22 : 0.22 },
        { baseX: 13, baseY: isLeft ? -5.5 : 5.5, len: 21, baseAngle: isLeft ? -0.45 : 0.45 }
      ];

      const cosP = Math.cos(currentAngle);
      const sinP = Math.sin(currentAngle);
      const flexIdle = (timer === 0) ? Math.sin(now / 400) * 0.05 : 0;

      const fingerTips = fingersData.map((f, idx) => {
        const curAngle = f.baseAngle + flexIdle + (clawSpread * (idx - 2) * 0.15);
        const tipL = f.len * 1.15;
        const localX = f.baseX + Math.cos(curAngle) * tipL;
        const localY = f.baseY + Math.sin(curAngle) * tipL;
        return {
          x: finalHandX + (localX * cosP - localY * sinP),
          y: finalHandY + (localX * sinP + localY * cosP)
        };
      });

      const pad = 10;
      const rawPts = [];
      rawPts.push({ x: shoulderX, y: shoulderY - pad * sideSign });
      rawPts.push({ x: elbowX, y: elbowY - pad * 1.2 * sideSign });
      rawPts.push({ x: finalHandX, y: finalHandY - pad * 1.1 * sideSign });

      const order = isLeft ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
      order.forEach(i => {
        rawPts.push({
          x: fingerTips[i].x + Math.cos(currentAngle) * pad * 0.8,
          y: fingerTips[i].y + Math.sin(currentAngle) * pad * 0.8
        });
      });

      rawPts.push({ x: finalHandX, y: finalHandY + pad * 1.1 * sideSign });
      rawPts.push({ x: elbowX, y: elbowY + pad * 1.2 * sideSign });
      rawPts.push({ x: shoulderX, y: shoulderY + pad * sideSign });

      return rawPts.map((p, idx) => {
        const noise = Math.sin(idx * 2.3 + time * 0.0015) * 4;
        return { x: p.x + noise, y: p.y + noise };
      });
    };

    drawFlamePath(buildArmPoints(true, leftArmTimer));
    drawFlamePath(buildArmPoints(false, rightArmTimer));

    ctx.restore();
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

    // === Luminous Body Backlight (Soft Natural Pink Glow) ===
    ctx.globalCompositeOperation = 'screen';
    const glowRadius = this.r + 90 + Math.sin(time * 0.005) * 8;
    const backGlow = ctx.createRadialGradient(0, 0, this.r * 0.1, 0, 0, glowRadius);
    if (isRCT) {
      backGlow.addColorStop(0, `rgba(255, 255, 255, ${0.5 * progress})`);
      backGlow.addColorStop(0.5, `rgba(50, 205, 50, ${0.3 * progress})`);
      backGlow.addColorStop(1, 'rgba(50, 205, 50, 0)');
    } else {
      backGlow.addColorStop(0, `rgba(255, 255, 255, ${0.45 * progress})`);   // Soft white core
      backGlow.addColorStop(0.35, `rgba(255, 105, 180, ${0.35 * progress})`);// Natural pink bloom
      backGlow.addColorStop(0.7, `rgba(255, 20, 147, ${0.15 * progress})`);  // Soft outer feathering
      backGlow.addColorStop(1, 'rgba(255, 20, 147, 0)');                     // Smooth blend into environment
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
    ctx.strokeStyle = strokeColor;
    ctx.globalAlpha = progress;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineWidth = 2.2;
    ctx.beginPath();
    let mxA = (points[numPoints - 1].x + points[0].x) / 2;
    let myA = (points[numPoints - 1].y + points[0].y) / 2;
    ctx.moveTo(mxA, myA);
    for (let i = 0; i < numPoints; i++) {
      const p = points[i];
      const next = points[(i + 1) % numPoints];
      ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
    }
    ctx.closePath();
    ctx.stroke();

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
