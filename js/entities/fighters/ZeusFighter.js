import { Fighter, isEntityOutsideArena } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { zeusConfig } from '../../configs/characters/zeusConfig.js';
import { spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { drawZeusWeapon } from '../../graphics/weapons/zeusWeaponGraphics.js';
import { drawZeusSkin } from '../../graphics/fighters/zeusSkin.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state } from '../../core/state.js';

export class ZeusFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'zeus';
    this.type = 'zeus';
    this.damageNumberColor = CONFIG.zeus?.damageNumberColor ?? CONFIG.zeus?.themeColor ?? CONFIG.zeus?.color ?? '#00BFFF';
    this.aegisCooldown = 0;
    this.stormCooldown = CONFIG.zeus?.stormCooldown ?? 1500;
    this.stormActive = false;
    this.stormTimer = 0;
    this.shootCooldownMax = CONFIG.zeus?.attackCooldown ?? CONFIG.zeus?.cooldown ?? this._def?.cooldown ?? 120;
    this.shootCooldown = 0;
    
    // Progressive Stun Chance Mechanic
    this.baseStunChance = CONFIG.zeus?.baseStunChance ?? 0.10;
    this.stunChance = this.baseStunChance;
    this.maxStunChance = CONFIG.zeus?.maxStunChance ?? 0.50;
    this.stunChanceIncrease = CONFIG.zeus?.stunChanceIncrease ?? 0.05;

    // Initial hovering state so clouds are positioned correctly in menus before update()
    this.z = 25;
    
    // Aura animation state
    this.auraPhase = 0;

    // Rule 20: Canonical symmetrical pixel hands enabled (Zeus skin & weapon renderers handle placement)
    this.hideHands = false;
    
    // Thunder cloud sound flag (play once when throwing thunderbolt to sky)
    this._thunderCloudSoundPlayed = false;

    // Declarative Skill Registration
    this._registerSkills();
  }

  _registerSkills() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zeus) ? CONFIG.zeus : zeusConfig;
    const skills = [];

    if (this.isSkillEnabled(cfg.enableThunderStorm, true)) {
      skills.push({
        id: 'storm',
        name: 'Thunder Storm',
        type: 'ultimate',
        isSignature: true,
        signature: true,
        isUltimate: true,
        cooldownKey: 'stormCooldown',
        cooldownMax: () => CONFIG.zeus.stormCooldown,
        durationKey: 'stormTimer',
        durationMax: () => CONFIG.zeus.stormDuration,
        activeKey: 'stormActive',
        canTickInFreeze: true,
        onExpire: (fighter) => {
          fighter.stormActive = false;
          fighter.isChargingStorm = false;
        }
      });
    }

    this.skillManager.registerSkills(skills);
  }

  interruptAttacks(forceCancelAll = false) {
    const isDead = (this.hp !== undefined && this.hp <= 0) || this.isDead || this.dead;
    const isMatchEnded = typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd');
    const shouldPreserveStorm = !isDead && !isMatchEnded && (this.stormActive || this.isChargingStorm);
    
    const savedStormActive = this.stormActive;
    const savedStormTimer = this.stormTimer;
    const savedStormLastStrikeTimer = this.stormLastStrikeTimer;
    const savedIsChargingStorm = this.isChargingStorm;
    const savedStormCooldown = this.stormCooldown;

    super.interruptAttacks(forceCancelAll);

    if (shouldPreserveStorm) {
      this.stormActive = savedStormActive;
      this.stormTimer = savedStormTimer;
      this.stormLastStrikeTimer = savedStormLastStrikeTimer;
      this.isChargingStorm = savedIsChargingStorm;
      this.stormCooldown = savedStormCooldown;
    }
  }

  reset() {
    super.reset();
    this.z = 25;
    this.aegisCooldown = 0;
    this.stormCooldown = CONFIG.zeus?.stormCooldown ?? 1500;
    this.stormActive = false;
    this.isChargingStorm = false;
    this.stormTimer = 0;
    this.shootCooldownMax = CONFIG.zeus?.attackCooldown ?? CONFIG.zeus?.cooldown ?? this._def?.cooldown ?? 120;
    this.shootCooldown = 0;
    this.baseStunChance = CONFIG.zeus?.baseStunChance ?? 0.10;
    this.stunChance = this.baseStunChance;
    this.maxStunChance = CONFIG.zeus?.maxStunChance ?? 0.50;
    this.stunChanceIncrease = CONFIG.zeus?.stunChanceIncrease ?? 0.05;
    this.auraPhase = 0;
    this._thunderCloudSoundPlayed = false;
  }

  getAttackProgress() {
    if (!this.shootCooldownMax) return 1;
    return 1 - (this.shootCooldown / this.shootCooldownMax);
  }
  
  getBodyPullback() {
    const progress = this.getAttackProgress();
    if (progress >= 0.5) {
      return -8 * Math.pow((progress - 0.5) / 0.5, 2);
    } else if (progress < 0.3) {
      // Very fast snap forward, followed by quick recovery
      const p = 1 - (progress / 0.3); 
      return 10 * Math.pow(p, 3);
    }
    return 0;
  }

  shoot(ownerIndex) {
    if (this.isCaughtInBeam()) return;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zeus) ? CONFIG.zeus : zeusConfig;
    if (!this.isSkillEnabled(cfg.enableChainLightning, true)) return;
    if (projectileSystem && projectileSystem.fireChainLightning) {
      const damage = cfg.lightningDamage ?? cfg.damage ?? 20;
      const chains = cfg.chainCount ?? 4;
      projectileSystem.fireChainLightning(this, ownerIndex, damage, chains);
    }
    
    // Flash at the release point (bolt tip)
    const releaseDist = this.r + (cfg.boltReleaseOffset ?? 20); 
    const rx = this.x + Math.cos(this.gunAngle) * releaseDist;
    const ry = (this.y - (this.z || 0)) + Math.sin(this.gunAngle) * releaseDist;
    spawnImpactFlash(rx, ry, cfg.shootFlashRadius ?? 35, 'lightningTrail'); 
    spawnSparks(rx, ry, cfg.shootSparkCount ?? 12, 'lightningTrail', cfg.themeColor ?? cfg.color ?? '#00BFFF');
    
    // Play attack sound
    const sound = getBasicAttackSound(this._def?.id, this._def?.type);
    this._attackSoundTimer = sound?.delay || 0;
    this._attackSoundConfig = sound;
  }

  takeDamage(amount, attacker, opts = {}) {
    const isGuaranteedHit = Boolean(opts && (opts.isRatioCrit || opts.isNanamiPause || opts.undodgeable || opts.isSureKill || opts.isSaitamaCounter || opts.bypassShield || opts.bypassEvade || opts.isGuaranteedHit));
    const applied = super.takeDamage(amount, attacker, opts);

    // Aegis Shield Passive (gated by master toggle)
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zeus) ? CONFIG.zeus : zeusConfig;
    if (this.isSkillEnabled(cfg.enableAegisShield, true) && applied && attacker && this.hp > 0 && !this.isTurret && !opts.isSaitamaCounter && !opts.isCounter && !isGuaranteedHit) {
      if (this.aegisCooldown <= 0 && this._isAttackerInRange(attacker, cfg.aegisTriggerRange ?? 180)) {
        this._triggerAegisShield(attacker);
      }
    }

    return applied;
  }
  
  _isAttackerInRange(attacker, range) {
    if (!attacker) return false;
    const distSq = (this.x - attacker.x) ** 2 + (this.y - attacker.y) ** 2;
    return distSq <= (range + this.r + attacker.r) ** 2;
  }

  _triggerAegisShield(attacker) {
    this.aegisCooldown = CONFIG.zeus?.aegisCooldown ?? 300;
    
    // Deal shock damage
    const damage = CONFIG.zeus?.aegisShockDamage ?? 12;
    attacker.takeDamage(damage, this, { isZeusShock: true });
    
    // Apply paralyze (we'll implement this as a combination of slow and electric stun)
    if (attacker.applySlow) {
      attacker.applySlow(CONFIG.zeus?.aegisParalyzeDuration ?? 60, CONFIG.zeus?.paralyzeSlowMultiplier ?? 0.5);
    }
    attacker.electricStunTimer = Math.max(attacker.electricStunTimer || 0, CONFIG.zeus?.stunDuration ?? 24);
    attacker.thunderRootsTimer = Math.max(attacker.thunderRootsTimer || 0, CONFIG.zeus?.electricVisualDuration ?? 45);
    
    spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 20, 'AEGIS!', CONFIG.zeus?.themeColor ?? CONFIG.zeus?.color ?? '#00BFFF');
    
    // Visuals & smiting thunderstrike on attacker
    if (!state.zeusStormStrikes) state.zeusStormStrikes = [];
    const aegisStrikeLife = CONFIG.zeus?.stormStrikeVisualLife ?? 18;
    state.zeusStormStrikes.push({
      x: attacker.x,
      y: attacker.y,
      life: aegisStrikeLife,
      maxLife: aegisStrikeLife,
      scale: 0.95
    });

    spawnImpactFlash(attacker.x, attacker.y, CONFIG.zeus?.aegisFlashRadius ?? 40, 'lightningTrail');
    spawnSparks(attacker.x, attacker.y, CONFIG.zeus?.aegisSparkCount ?? 15, 'thunderSpark');
    triggerGlobalScreenShake(CONFIG.zeus?.aegisShakeIntensity ?? 4, CONFIG.zeus?.aegisShakeFrames ?? 5);
    
    const sound = getSkillSound(this._def?.id, 'aegis');
    if (sound) audioSystem.playSFX(sound.src, sound.volume);
  }

  update(opponent, ownerIndex, arena) {
    // Visual hovering effect: float like Rubbick
    this.z = 25 + Math.sin(Date.now() / 200) * 6;

    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zeus) ? CONFIG.zeus : zeusConfig;

    // Tick storm cooldown and charging state before freeze check so charging/casting cannot be frozen/stuck
    if (this.stormCooldown > 0) {
      this.stormCooldown--;
      
      // Telegraph animation triggers when exactly TelegraphFrames remain
      if (this.stormCooldown === (CONFIG.zeus?.stormTelegraphFrames ?? 120)) {
        spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 20, 'CHARGING STORM...', CONFIG.zeus?.themeColor ?? CONFIG.zeus?.color ?? '#00BFFF');
        // Play an ominous gathering sound if available, otherwise reuse aegis logic
        const sound = getSkillSound(this._def?.id, 'aegis');
        if (sound) audioSystem.playSFX(sound.src, sound.volume * 0.7);
      }
    }
    
    // Are we in the telegraph window before storm casts?
    this.isChargingStorm = this.stormCooldown > 0 && this.stormCooldown <= (CONFIG.zeus?.stormTelegraphFrames ?? 120);
    
    // Play thundercloud sound once when throwing thunderbolt to the sky
    if (this.isChargingStorm && !this._thunderCloudSoundPlayed) {
      this._thunderCloudSoundPlayed = true;
      const cloudSound = getSkillEffectSound('zeus', 'thundercloud');
      if (cloudSound) audioSystem.playSFX(cloudSound.src, cloudSound.volume);
    }
    // Reset flag when not charging
    if (!this.isChargingStorm) {
      this._thunderCloudSoundPlayed = false;
    }
    
    // If charging, the clouds billow and flash wildly
    this.auraPhase += this.isChargingStorm ? 0.45 : 0.15;
    
    // Ultimate check (gated by master toggle): Activate storm once charging completes
    if (this.isSkillEnabled(cfg.enableThunderStorm, true) && this.stormCooldown <= 0 && !this.stormActive && opponent) {
      this._activateStorm();
    }
    
    // Process active Divine Thunder Storm strikes continuously (Rule 25: Map-wide ultimate persists and strikes even while Zeus or enemies are stunned/frozen)
    if (this.stormActive) {
      this.stormTimer--;
      this._processStorm();
      if (this.stormTimer <= 0) {
        this.stormActive = false;
        if (opponent) {
          this.resumeMovement(opponent);
        }
      }
    }

    // Mandatory Rule 1 Freeze & TimeStop Guard: CC freezes Zeus's movement/actions, but active storm in the sky continues striking
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }
    
    if (this.aegisCooldown > 0) this.aegisCooldown--;

    // Immobilize, face front toward player/camera (0), and stop shooting during ultimate cast
    if (this.isChargingStorm || this.stormActive) {
      this.vx *= 0.5; // Rapidly halt movement
      this.vy *= 0.5;
      this.applyMovementPhysics(0); // Set target speed to 0 to prevent input override
      this.gunAngle = 0;
      this.angle = 0;
    } else {
      // Basic attack (gated by enableChainLightning master toggle)
      if (this.shootCooldown > 0) {
        this.shootCooldown--;
      } else if (this.isSkillEnabled(cfg.enableChainLightning, true)) {
        if (!opponent || !isEntityOutsideArena(opponent, arena)) {
          this.shoot(ownerIndex);
          this.shootCooldown = this.shootCooldownMax;
        }
      }
      this.applyMovementPhysics();
    }
    
    // Aim directly at opponent using master aim pipeline (automatically disabled during storm channeling)
    this.aim(opponent);
    
    this.resolveWallBounce(arena);

    if (this.isChargingStorm || this.stormActive) {
      this.gunAngle = 0;
      this.angle = 0;
    }
  }

  canAim() {
    if (this.isChargingStorm || this.stormActive) return false;
    return super.canAim();
  }

  aim(opponent) {
    if (this.isChargingStorm || this.stormActive) {
      this.gunAngle = 0;
      this.angle = 0;
      return false; // Disable auto-aim and lock facing directly towards player/camera (0) while casting ultimate!
    }
    return super.aim(opponent);
  }
  
  _activateStorm() {
    this.stormActive = true;
    this.stormTimer = CONFIG.zeus?.stormDuration ?? 300;
    this.stormCooldown = CONFIG.zeus?.stormCooldown ?? 1500;
    this.stormLastStrikeTimer = 0;
    this.gunAngle = 0;
    this.angle = 0;
    
    spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 20, 'STORM!', '#FFFFFF');
    triggerGlobalScreenShake(CONFIG.zeus?.stormCastShakeIntensity ?? 8, CONFIG.zeus?.stormCastShakeFrames ?? 20);
    
    const sound = getSkillSound(this._def?.id, 'storm');
    if (sound) audioSystem.playSFX(sound.src, sound.volume);
  }
  
  _processStorm() {
    // Strike periodically based on strikes per second
    this.stormLastStrikeTimer = (this.stormLastStrikeTimer || 0) + 1;
    const strikesPerSec = (CONFIG.zeus?.stormStrikesPerSec ?? 3);
    const interval = Math.max(1, Math.floor(60 / strikesPerSec));
    
    if (this.stormLastStrikeTimer >= interval) {
      this.stormLastStrikeTimer = 0;
      
      // Hit all living enemies
      if (state && state.fighters) {
        const myIdx = state.fighters.indexOf(this);
        const myTeam = state.getFighterTeam ? state.getFighterTeam(myIdx >= 0 ? myIdx : 0) : (this.team !== undefined ? this.team : null);

        state.fighters.forEach((f, idx) => {
          if (f && f !== this && f.hp > 0 && !f.isDead && !f.dead) {
            const isEnemy = myTeam === null || (state.getFighterTeam ? state.getFighterTeam(idx) !== myTeam : f.team !== this.team);
            if (isEnemy) {
              this._strikeEnemyWithStorm(f);
            }
          }
        });
        
        // Also hit illusions
        if (state.illusions) {
          state.illusions.forEach(ill => {
            if (ill && ill.hp > 0 && !ill.isDead && !ill.dead && ill.owner !== this) {
              const illOwnerTeam = (state.getFighterTeam && ill.owner) ? state.getFighterTeam(state.fighters.indexOf(ill.owner)) : null;
              const isEnemy = myTeam === null || illOwnerTeam !== myTeam;
              if (isEnemy) {
                 this._strikeEnemyWithStorm(ill);
              }
            }
          });
        }
      }
    }
  }
  
  _strikeEnemyWithStorm(target) {
    if (!target || target.hp <= 0 || target.isDead || target.dead) return;

    // Calculate damage based on static debuff
    let damage = CONFIG.zeus?.stormStrikeDamage ?? 20;
    if (target.staticDebuffTimer > 0) {
      damage *= (CONFIG.zeus?.staticDamageBonus ?? 1.33);
    }
    
    target.takeDamage(damage, this, { isStorm: true, isUltimate: true });
    
    // Apply static and paralyze
    target.staticDebuffTimer = CONFIG.zeus?.staticDuration ?? 100;
    if (target.applySlow) {
      target.applySlow(CONFIG.zeus?.paralyzeDuration ?? 50, CONFIG.zeus?.paralyzeSlowMultiplier ?? 0.5);
    }
    
    // Apply visual thunder roots effect
    target.thunderRootsTimer = Math.max(target.thunderRootsTimer || 0, CONFIG.zeus?.electricVisualDuration ?? 45);
    
    // Visuals
    triggerGlobalScreenShake(CONFIG.zeus?.stormStrikeShakeIntensity ?? 4, CONFIG.zeus?.stormStrikeShakeFrames ?? 10);
    spawnImpactFlash(target.x, target.y, CONFIG.zeus?.stormStrikeFlashRadius ?? 50, 'lightningTrail');
    spawnSparks(target.x, target.y, CONFIG.zeus?.stormStrikeSparkCount ?? 10, 'lightningTrail', CONFIG.zeus?.themeColor ?? CONFIG.zeus?.color ?? '#00BFFF');
    
    // Play storm strike sound for each hit (both stormstrike.mp3 & thunderstrike.mp3)
    const stormSound = getSkillSound(this._def?.id, 'storm');
    if (stormSound) audioSystem.playSFX(stormSound.src, stormSound.volume * 0.6);

    const thunderSound = getSkillSound(this._def?.id, 'thunderstrike');
    if (thunderSound) audioSystem.playSFX(thunderSound.src, (thunderSound.volume || 1.0) * 0.6);
    
    // Register storm strike visual globally
    if (!state.zeusStormStrikes) state.zeusStormStrikes = [];
    const strikeLife = CONFIG.zeus?.stormStrikeVisualLife ?? 18;
    state.zeusStormStrikes.push({
      x: target.x,
      y: target.y,
      life: strikeLife,
      maxLife: strikeLife,
      scale: 1.25
    });
  }

  _drawClouds(ctx, isBehind) {
    const numClouds = 10;
    const zOffset = this.z || 0;
    
    for (let i = 0; i < numClouds; i++) {
      // Fixed base position to form a tighter cluster
      const angle = (i * Math.PI * 2) / numClouds;
      // Adjusted distance multiplier to form a nice base
      const dist = (i % 3 === 0 ? 0.2 : 0.8) * this.r;
      
      const baseOffsetX = Math.cos(angle) * dist;
      const baseOffsetY = Math.sin(angle) * dist * 0.4; // Squashed for 3D ground perspective
      
      const isCloudBehind = baseOffsetY < 0;
      if (isCloudBehind !== isBehind) continue;
      
      // Natural billowing and drifting movement
      const driftX = Math.sin(this.auraPhase * 0.4 + i * 2.1) * 5;
      const driftY = Math.cos(this.auraPhase * 0.3 + i * 1.7) * 3;
      
      const cx = this.x + baseOffsetX + driftX;
      // Position clouds at the bottom edge of Zeus's hovering body
      // (this.y - zOffset is his floating center, + this.r puts them at his feet)
      const cy = this.y - zOffset + this.r * 0.8 + baseOffsetY + driftY;
      
      // Cloud puffs billow in size
      const baseSize = i % 2 === 0 ? 18 : 13;
      const cloudSize = baseSize + Math.sin(this.auraPhase * 1.2 + i) * 4;
      
      // Determine if this cloud puff is flashing with internal lightning
      let flashThreshold = 0.92; // Short intense flash
      if (this.isChargingStorm) {
        flashThreshold = 0.4; // Flash very frequently while charging
      } else if (this.stormActive) {
        flashThreshold = 0.2; // Almost constantly flashing during the storm
      }
      
      const flashValue = Math.sin(this.auraPhase * 2.5 + i * 13);
      const isFlashing = flashValue > flashThreshold;

      // ── VOLUMETRIC ORGANIC CUMULUS CLOUD PUFF (Smooth Non-Pixel Art) ──
      const rad = Math.max(8, cloudSize);

      ctx.save();
      if (isFlashing) {
        // High-energy ionized lightning cloud puff
        // 1. Soft atmospheric outer ion bloom wash
        const bloomGrad = ctx.createRadialGradient(cx, cy, rad * 0.3, cx, cy, rad * 1.4);
        bloomGrad.addColorStop(0, 'rgba(0, 229, 255, 0.45)');
        bloomGrad.addColorStop(0.65, 'rgba(56, 189, 248, 0.22)');
        bloomGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
        ctx.beginPath();
        ctx.arc(cx, cy, rad * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = bloomGrad;
        ctx.fill();

        // 2. Main illuminated cloud disc with soft electric gradient
        const puffGrad = ctx.createRadialGradient(cx, cy - rad * 0.2, rad * 0.1, cx, cy, rad);
        puffGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
        puffGrad.addColorStop(0.45, 'rgba(224, 247, 255, 0.92)');
        puffGrad.addColorStop(0.85, 'rgba(0, 229, 255, 0.85)');
        puffGrad.addColorStop(1, 'rgba(0, 180, 240, 0.55)');
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fillStyle = puffGrad;
        ctx.fill();

        // 3. Crisp white-hot core
        ctx.beginPath();
        ctx.arc(cx, cy - rad * 0.15, rad * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();
      } else {
        // Organic Cumulus Cloud Puff: Volumetric depth, soft base shading, sky tint, and silver-lining rim
        // 1. Soft ambient outer fog rim
        const ambientGrad = ctx.createRadialGradient(cx, cy, rad * 0.5, cx, cy, rad * 1.25);
        const ambientColor = this.stormActive ? 'rgba(2, 132, 199, 0.25)' : 'rgba(186, 230, 253, 0.25)';
        ambientGrad.addColorStop(0, ambientColor);
        ambientGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
        ctx.beginPath();
        ctx.arc(cx, cy, rad * 1.25, 0, Math.PI * 2);
        ctx.fillStyle = ambientGrad;
        ctx.fill();

        // 2. Lower under-belly storm shadow (soft crescent wash on bottom)
        const shadowGrad = ctx.createRadialGradient(cx, cy + rad * 0.35, rad * 0.1, cx, cy + rad * 0.2, rad * 0.9);
        if (this.stormActive) {
          shadowGrad.addColorStop(0, 'rgba(3, 105, 161, 0.70)');
          shadowGrad.addColorStop(0.7, 'rgba(2, 132, 199, 0.50)');
          shadowGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
        } else {
          shadowGrad.addColorStop(0, 'rgba(100, 116, 139, 0.55)');
          shadowGrad.addColorStop(0.7, 'rgba(148, 163, 184, 0.35)');
          shadowGrad.addColorStop(1, 'rgba(203, 213, 225, 0)');
        }
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fillStyle = shadowGrad;
        ctx.fill();

        // 3. Volumetric main body (smooth spherical radial gradient shifted slightly upward)
        const bodyGrad = ctx.createRadialGradient(cx, cy - rad * 0.3, rad * 0.1, cx, cy, rad);
        if (this.stormActive) {
          bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          bodyGrad.addColorStop(0.4, 'rgba(186, 230, 253, 0.88)');
          bodyGrad.addColorStop(0.8, 'rgba(56, 189, 248, 0.78)');
          bodyGrad.addColorStop(1, 'rgba(2, 132, 199, 0.60)');
        } else {
          bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
          bodyGrad.addColorStop(0.45, 'rgba(240, 249, 255, 0.90)');
          bodyGrad.addColorStop(0.85, 'rgba(186, 230, 253, 0.80)');
          bodyGrad.addColorStop(1, 'rgba(148, 163, 184, 0.45)');
        }
        ctx.beginPath();
        ctx.arc(cx, cy, rad - 1.2, 0, Math.PI * 2);
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // 4. Upper silver-lining crown glint
        const crownGrad = ctx.createRadialGradient(cx, cy - rad * 0.45, 0, cx, cy - rad * 0.45, rad * 0.55);
        crownGrad.addColorStop(0, 'rgba(255, 255, 255, 0.90)');
        crownGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.45)');
        crownGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(cx, cy - rad * 0.35, rad * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = crownGrad;
        ctx.fill();
      }
      ctx.restore();

      // Smooth electric arcs & organic sparks when flashing
      if (isFlashing) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const now = Date.now();
        const branchCount = 2; // Arcs per flashing cloud

        for (let b = 0; b < branchCount; b++) {
          const seed = Math.floor(now / 80) * 137 + b * 53 + i * 17;
          const pseudoRand = (n) => {
            const x = Math.sin(seed + n * 9.1) * 43758.5453;
            return x - Math.floor(x);
          };

          const dirX = (pseudoRand(1) - 0.5) * 2;
          const dirY = (pseudoRand(2) - 0.5) * 2;

          ctx.beginPath();
          ctx.moveTo(cx, cy);

          let bx = cx;
          let by = cy;
          const segments = 3 + Math.floor(pseudoRand(3) * 2);
          const branchLen = 8 + pseudoRand(4) * 12;

          for (let s = 0; s < segments; s++) {
            bx += dirX * (branchLen / segments) + (pseudoRand(5 + s) - 0.5) * 6;
            by += dirY * (branchLen / segments) + (pseudoRand(6 + s) - 0.5) * 6;
            ctx.lineTo(bx, by);
          }

          // Outer cyan ionization glow
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
          ctx.lineWidth = 2.0;
          ctx.stroke();

          // Inner white-hot core
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Organic round detached sparks
          if (pseudoRand(9) > 0.4) {
            const spX = bx + (pseudoRand(10) - 0.5) * 10;
            const spY = by + (pseudoRand(11) - 0.5) * 10;
            const sparkR = 1.0 + pseudoRand(12) * 1.0;
            ctx.beginPath();
            ctx.arc(spX, spY, sparkR, 0, Math.PI * 2);
            ctx.fillStyle = pseudoRand(13) > 0.5 ? '#FFFFFF' : '#00FFFF';
            ctx.fill();
          }
        }
        ctx.restore();
      }
    }
  }

  draw(ctx) {
    if (this.isDead) return;

    // Draw clouds that orbit behind Zeus
    this._drawClouds(ctx, true);
    
    // Draw background 3D Aegis Shield arcs
    this._drawAegisShield(ctx, true);

    // Draw background Storm Telegraph vortex
    this._drawStormTelegraph(ctx, true);

    const pb = this.getBodyPullback();
    const dx = Math.cos(this.gunAngle) * pb;
    const dy = Math.sin(this.gunAngle) * pb;
    
    // Temporarily shift the logical position so Fighter.js draws everything (including the black stroke) properly shifted
    const origX = this.x;
    const origY = this.y;
    this.x += dx;
    this.y += dy;
    
    super.draw(ctx);
    
    this.x = origX;
    this.y = origY;
    
    // Draw clouds that orbit in front of Zeus
    this._drawClouds(ctx, false);
    
    // Draw foreground 3D Aegis Shield arcs
    this._drawAegisShield(ctx, false);
    
    // Draw foreground Storm Telegraph vortex
    this._drawStormTelegraph(ctx, false);
  }
  
  _drawStormTelegraph(ctx, drawBackground) {
    if (!this.isChargingStorm) return;
    if (!drawBackground) return; // The flat ring is drawn behind Zeus
    
    const chargeProgress = 1.0 - (this.stormCooldown / (CONFIG.zeus?.stormTelegraphFrames ?? 120)); // 0.0 to 1.0
    const zOffset = this.z || 0;
    ctx.save();
    ctx.translate(this.x, this.y - zOffset);
    ctx.rotate(Date.now() / 200);
    
    ctx.beginPath();
    // Ring shrinks from 3x radius down to his body radius
    const ringRadius = this.r * 3 * (1 - chargeProgress) + this.r;
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    
    ctx.strokeStyle = `rgba(0, 255, 255, ${chargeProgress * 0.8})`;
    ctx.lineWidth = 2 + chargeProgress * 5;
    ctx.setLineDash([15, 15]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Inner intense glow that builds up
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 1.5 + chargeProgress * 20, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 200, 255, ${chargeProgress * 0.4})`;
    ctx.fill();
    
    ctx.restore();
  }

  _drawAegisShield(ctx, drawBackground) {
    if (this.aegisCooldown > 0) return;
    
    ctx.save();
    
    const time = Date.now() / 150;
    const shieldRadius = this.r + 15;
    const numOrbits = 3;
    const segments = 10;
    const zOffset = this.z || 0;
    
    // Draw several orbiting lightning bolts in pseudo-3D space
    for (let i = 0; i < numOrbits; i++) {
      let firstZ = 0;
      
      // Determine if the *center* of the bolt is in the foreground or background
      // by sampling its 3D Z position at current time t
      {
        const t = time;
        const f1 = 1.1 + i * 0.8;
        const f2 = 1.4 + i * 0.5;
        const f3 = 1.7 + i * 0.3;
        
        let x = Math.sin(t * f1) + Math.cos(t * f2 * 0.9);
        let y = Math.sin(t * f2) + Math.cos(t * f3 * 1.1);
        let z = Math.sin(t * f3) + Math.cos(t * f1 * 1.2);
        const len = Math.sqrt(x*x + y*y + z*z) || 1;
        firstZ = z / len;
      }
      
      const isBackgroundArc = firstZ < 0;
      if (drawBackground !== isBackgroundArc) continue; // Only draw the requested layer
      
      ctx.beginPath();
      
      for (let j = 0; j <= segments; j++) {
        // Travel back in time slightly to form a tail (comet-like path)
        const t = time - j * 0.05;
        
        const f1 = 1.1 + i * 0.8;
        const f2 = 1.4 + i * 0.5;
        const f3 = 1.7 + i * 0.3;
        
        let x = Math.sin(t * f1) + Math.cos(t * f2 * 0.9);
        let y = Math.sin(t * f2) + Math.cos(t * f3 * 1.1);
        let z = Math.sin(t * f3) + Math.cos(t * f1 * 1.2);
        
        const len = Math.sqrt(x*x + y*y + z*z) || 1;
        x /= len;
        y /= len;
        
        // Add violent crackling noise to the path (like the ground roots)
        const crackleX = Math.sin(t * 30 + i * 50) * 0.15;
        const crackleY = Math.cos(t * 35 + i * 50) * 0.15;
        x += crackleX;
        y += crackleY;
        
        // Project to 2D
        // Compress Y slightly to give a pseudo-3D isometric perspective look
        const px = this.x + x * shieldRadius;
        const py = (this.y - zOffset) + y * shieldRadius * 0.75;
        
        if (j === 0) {
           ctx.moveTo(px, py);
        } else {
           ctx.lineTo(px, py);
        }
      }
      
      ctx.lineJoin = 'miter';
      ctx.miterLimit = 2;
      
      // Make background layer arcs dimmer and thinner to force the 3D perspective
      const alphaMulti = drawBackground ? 0.3 : 1.0;
      
      // Outer cyan glow
      ctx.lineWidth = Math.max(1, Math.round(2.5 * alphaMulti));
      ctx.strokeStyle = `rgba(0, 220, 255, ${0.75 * alphaMulti})`;
      ctx.stroke();
      
      // Inner bright core
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = drawBackground ? `rgba(0, 255, 255, ${0.5 * alphaMulti})` : 'rgba(255, 255, 255, 0.95)';
      ctx.stroke();
    }
    
    ctx.restore();
  }

  drawBody(ctx) {
    drawZeusSkin(ctx, this);
  }

  drawOutline(ctx) {
    // Replaced with authentic stepped pixel art outline in drawZeusSkin
  }

  drawGun(ctx) {
    if (typeof state !== 'undefined' && state.showSkinOnly) return;
    let chargeProgress = 0;
    if (this.isChargingStorm) {
      chargeProgress = 1.0 - (this.stormCooldown / (CONFIG.zeus?.stormTelegraphFrames ?? 120));
    } else if (this.stormActive) {
      chargeProgress = 1.0;
    }
    
    const isChanneling = this.isChargingStorm || this.stormActive;
    
    // Because draw() already shifted this.x and this.y, we just draw at this.x, this.y
    drawZeusWeapon(ctx, this.x, this.y, this.gunAngle, this.r, this.auraPhase, this.getAttackProgress(), this.color, isChanneling, chargeProgress);
  }

  onFrozenSkillDurationTick(isInsideGojoDomain) {
    if (this.stormActive && this.stormTimer <= 0) {
      this.stormActive = false;
      this.isChargingStorm = false;
    }
  }
}

