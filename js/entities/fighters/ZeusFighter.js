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

export const ZEUS_CLOUD_FRAME_PATHS = [
  'Assets/model/zeus/Clouds/cloud-6.png',
  'Assets/model/zeus/Clouds/cloud-1.png',
  'Assets/model/zeus/Clouds/cloud-2.png',
  'Assets/model/zeus/Clouds/cloud-3.png',
  'Assets/model/zeus/Clouds/cloud-4.png',
  'Assets/model/zeus/Clouds/cloud-5.png'
];

const ZEUS_CLOUD_FRAME_COUNT = 6;
let _zeusCloudFrames = [];
let _zeusCloudFramesLoading = false;

export function _getZeusCloudFrames() {
  if (
    _zeusCloudFrames.length === ZEUS_CLOUD_FRAME_COUNT &&
    _zeusCloudFrames.every(img => img && img.complete && ((img.naturalWidth || img.width || 0) > 0))
  ) {
    return _zeusCloudFrames;
  }
  if (!_zeusCloudFramesLoading && typeof Image !== 'undefined') {
    _zeusCloudFramesLoading = true;
    _zeusCloudFrames = [];
    ZEUS_CLOUD_FRAME_PATHS.forEach((src, idx) => {
      const img = new Image();
      img.onload = () => {
        _zeusCloudFrames[idx] = img;
      };
      img.onerror = (e) => {
        console.warn(`Failed to load Zeus cloud frame ${idx + 1} at ${src}:`, e);
      };
      img.src = `${src}?v=1`;
      _zeusCloudFrames[idx] = img;
    });
  }
  return _zeusCloudFrames;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getZeusCloudFrames();
}

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

    // Critical Strike Mechanic on Thunder Strikes
    this.thunderCritChance = CONFIG.zeus?.thunderCritChance ?? 0.25;
    this.thunderCritMultiplier = CONFIG.zeus?.thunderCritMultiplier ?? 1.80;
    this.critChance = this.thunderCritChance;
    this.critMultiplier = this.thunderCritMultiplier;

    // Initial hovering state so clouds are positioned correctly in menus before update()
    this.z = (def && (def._isPreview || def.hideClouds || def.showSkinOnly)) ? 0 : 25;
    
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
    this.thunderCritChance = CONFIG.zeus?.thunderCritChance ?? 0.25;
    this.thunderCritMultiplier = CONFIG.zeus?.thunderCritMultiplier ?? 1.80;
    this.critChance = this.thunderCritChance;
    this.critMultiplier = this.thunderCritMultiplier;
    this.auraPhase = 0;
    this._thunderCloudSoundPlayed = false;
  }

  /**
   * Evaluates Zeus's Thunder Strike Critical Hit roll and calculates final damage.
   * Features:
   * - Base thunder crit rate & multiplier
   * - Static debuff synergy: +staticCritBonus crit chance against targets with active static
   * - Returns { finalDamage, isCrit, critMultiplier, critChance }
   * @param {number} baseDamage Unscaled base damage
   * @param {object} opts Context options { hasStatic, forceCrit, target }
   * @returns {{ finalDamage: number, isCrit: boolean, critMultiplier: number, critChance: number }}
   */
  evaluateThunderCrit(baseDamage = 20, opts = {}) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zeus) ? CONFIG.zeus : zeusConfig;
    if (!this.isSkillEnabled(cfg.enableThunderCrit, true)) {
      return { finalDamage: baseDamage, isCrit: false, critMultiplier: 1.0, critChance: 0 };
    }

    const baseChance = this.thunderCritChance !== undefined ? this.thunderCritChance : (cfg.thunderCritChance ?? 0.25);
    const staticBonus = opts.hasStatic ? (cfg.staticCritBonus ?? 0.25) : 0;
    const effectiveCritChance = Math.min(cfg.maxThunderCritChance ?? 0.75, baseChance + staticBonus);
    const effectiveCritMult = this.thunderCritMultiplier !== undefined ? this.thunderCritMultiplier : (cfg.thunderCritMultiplier ?? 1.80);

    const isCrit = Boolean(opts.forceCrit || (!opts.isCrit && Math.random() < effectiveCritChance));
    const finalDamage = isCrit ? Math.round(baseDamage * effectiveCritMult) : Math.round(baseDamage);

    return {
      finalDamage,
      isCrit,
      critMultiplier: effectiveCritMult,
      critChance: effectiveCritChance
    };
  }

  getAttackProgress() {
    if (!this.shootCooldownMax) return 1;
    return 1 - (this.shootCooldown / this.shootCooldownMax);
  }
  
  getBodyPullback() {
    if (this._isPreview || this.hideWeapon || (typeof state !== 'undefined' && state.showSkinOnly) || this._isTopHudProfile || this.hideClouds) {
      return 0;
    }
    if (this.shootCooldown <= 0 || !this.shootCooldownMax) return 0;
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
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zeus) ? CONFIG.zeus : zeusConfig;
    this.aegisCooldown = cfg.aegisCooldown ?? 300;
    
    // Deal shock damage with thunder crit evaluation
    const baseDamage = cfg.aegisShockDamage ?? 12;
    const hasStatic = Boolean((attacker.staticDebuffTimer > 0) || (attacker.zenitsuStaticDebuffTimer > 0));
    const critRes = this.evaluateThunderCrit(baseDamage, { hasStatic, target: attacker });
    const damage = critRes.finalDamage;
    const isCrit = critRes.isCrit;
    attacker.takeDamage(damage, this, { isZeusShock: true, isCrit: isCrit, isCritical: isCrit });
    
    // Apply paralyze (we'll implement this as a combination of slow and electric stun)
    if (attacker.applySlow) {
      attacker.applySlow(cfg.aegisParalyzeDuration ?? 60, cfg.paralyzeSlowMultiplier ?? 0.5);
    }
    attacker.electricStunTimer = Math.max(attacker.electricStunTimer || 0, cfg.stunDuration ?? 24);
    attacker.thunderRootsTimer = Math.max(attacker.thunderRootsTimer || 0, cfg.electricVisualDuration ?? 45);
    
    const calloutColor = isCrit ? '#FF3B30' : (cfg.themeColor ?? cfg.color ?? '#00BFFF');
    spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 20, isCrit ? 'AEGIS CRIT!' : 'AEGIS!', calloutColor);
    
    // Visuals & smiting thunderstrike on attacker
    if (!state.zeusStormStrikes) state.zeusStormStrikes = [];
    const aegisStrikeLife = cfg.stormStrikeVisualLife ?? 18;
    state.zeusStormStrikes.push({
      x: attacker.x,
      y: attacker.y,
      life: aegisStrikeLife,
      maxLife: aegisStrikeLife,
      scale: isCrit ? 1.35 : 0.95,
      isCrit: isCrit
    });

    spawnImpactFlash(attacker.x, attacker.y, isCrit ? (cfg.aegisFlashRadius ?? 40) * 1.5 : (cfg.aegisFlashRadius ?? 40), 'lightningTrail');
    spawnSparks(attacker.x, attacker.y, isCrit ? (cfg.aegisSparkCount ?? 15) * 1.5 : (cfg.aegisSparkCount ?? 15), 'thunderSpark');
    triggerGlobalScreenShake(isCrit ? (cfg.stormStrikeCritShakeIntensity ?? 7) : (cfg.aegisShakeIntensity ?? 4), isCrit ? 10 : (cfg.aegisShakeFrames ?? 5));
    
    const sound = getSkillSound(this._def?.id, 'aegis');
    if (sound) audioSystem.playSFX(sound.src, isCrit ? sound.volume * 1.2 : sound.volume);
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

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zeus) ? CONFIG.zeus : zeusConfig;

    // Calculate base damage based on static debuff
    let baseDamage = cfg.stormStrikeDamage ?? 20;
    const hasStatic = Boolean((target.staticDebuffTimer > 0) || (target.zenitsuStaticDebuffTimer > 0));
    if (hasStatic) {
      baseDamage *= (cfg.staticDamageBonus ?? 1.33);
    }

    // Evaluate Thunder Strike Critical Hit
    const critRes = this.evaluateThunderCrit(baseDamage, { hasStatic, target });
    const finalDamage = critRes.finalDamage;
    const isCrit = critRes.isCrit;
    
    target.takeDamage(finalDamage, this, { isStorm: true, isUltimate: true, isCrit: isCrit, isCritical: isCrit });
    
    // Apply static and paralyze
    target.staticDebuffTimer = cfg.staticDuration ?? 100;
    if (target.applySlow) {
      target.applySlow(cfg.paralyzeDuration ?? 50, cfg.paralyzeSlowMultiplier ?? 0.5);
    }
    
    // Apply visual thunder roots effect
    target.thunderRootsTimer = Math.max(target.thunderRootsTimer || 0, cfg.electricVisualDuration ?? 45);
    
    // Visuals & Screen Shake (intensified on critical hit)
    const shakeIntensity = isCrit ? (cfg.stormStrikeCritShakeIntensity ?? 7) : (cfg.stormStrikeShakeIntensity ?? 4);
    const shakeFrames = isCrit ? (cfg.stormStrikeCritShakeFrames ?? 14) : (cfg.stormStrikeShakeFrames ?? 10);
    triggerGlobalScreenShake(shakeIntensity, shakeFrames);

    const flashRadius = isCrit ? ((cfg.stormStrikeFlashRadius ?? 50) * 1.4) : (cfg.stormStrikeFlashRadius ?? 50);
    spawnImpactFlash(target.x, target.y, flashRadius, 'lightningTrail');

    const sparkCount = isCrit ? ((cfg.stormStrikeSparkCount ?? 10) * 2) : (cfg.stormStrikeSparkCount ?? 10);
    const sparkColor = cfg.themeColor ?? cfg.color ?? '#00BFFF';
    spawnSparks(target.x, target.y, sparkCount, 'lightningTrail', sparkColor);
    
    // Play storm strike sound for each hit (both stormstrike.mp3 & thunderstrike.mp3)
    const stormSound = getSkillSound(this._def?.id, 'storm');
    if (stormSound) audioSystem.playSFX(stormSound.src, stormSound.volume * (isCrit ? 0.9 : 0.6));

    const thunderSound = getSkillSound(this._def?.id, 'thunderstrike');
    if (thunderSound) audioSystem.playSFX(thunderSound.src, (thunderSound.volume || 1.0) * (isCrit ? 0.95 : 0.6));

    if (isCrit) {
      const punchSound = getSkillSound('zenitsu', 'ultimateImpact') || getSkillSound(this._def?.id, 'aegis');
      if (punchSound) audioSystem.playSFX(punchSound.src || punchSound, 0.75);
    }
    
    // Register storm strike visual globally
    if (!state.zeusStormStrikes) state.zeusStormStrikes = [];
    const strikeLife = cfg.stormStrikeVisualLife ?? 18;
    state.zeusStormStrikes.push({
      x: target.x,
      y: target.y,
      life: strikeLife,
      maxLife: strikeLife,
      scale: isCrit ? 1.55 : 1.25,
      isCrit: isCrit
    });
  }

  _drawClouds(ctx, isBehind) {
    // Suppress cloud rendering when explicitly hidden, in profile preview, or when showSkinOnly is enabled (e.g. top HUD frame)
    const shouldHideClouds = Boolean(
      this.hideClouds ||
      this.hideCloud ||
      (typeof state !== 'undefined' && state.showSkinOnly) ||
      this._isTopHudProfile ||
      this._isProfilePreview
    );
    if (shouldHideClouds) return;

    const zOffset = this.z || 0;
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const isStorm = Boolean(this.isChargingStorm || this.stormActive);

    // Natural buoyant drifting movement
    const driftX = Math.sin(this.auraPhase * 0.4) * 2.5;
    const driftY = Math.cos(this.auraPhase * 0.3) * 1.5;

    // Anchor cloud directly at Zeus's floating base/feet
    const cx = this.x + driftX;
    const cy = this.y - zOffset + this.r * 0.72 + driftY;

    // 1. LAYER BEHIND ZEUS: Main Animated Pixel Art Cloud Body
    if (isBehind) {
      const frames = _getZeusCloudFrames();
      const frameDuration = isStorm ? 75 : 115; // Faster billowing during storm
      const frameIndex = Math.floor(now / frameDuration) % ZEUS_CLOUD_FRAME_COUNT;
      const img = frames[frameIndex];

      const targetWidth = this.r * 3.8;
      const baseRefWidth = 355;
      const scale = targetWidth / baseRefWidth;

      ctx.save();
      ctx.imageSmoothingEnabled = false;

      // Divine atmospheric storm glow underneath the cloud when charging or active (Rule 11 compliant: NO shadowBlur)
      if (isStorm) {
        const glowR = this.r * 1.8;
        const glowGrad = ctx.createRadialGradient(cx, cy, glowR * 0.2, cx, cy, glowR * 1.3);
        glowGrad.addColorStop(0, 'rgba(0, 229, 255, 0.40)');
        glowGrad.addColorStop(0.55, 'rgba(56, 189, 248, 0.18)');
        glowGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }

      if (img && img.complete && ((img.naturalWidth || img.width || 0) > 0)) {
        const drawW = (img.naturalWidth || img.width) * scale;
        const drawH = (img.naturalHeight || img.height) * scale;
        ctx.drawImage(
          img,
          Math.round(cx - drawW / 2),
          Math.round(cy - drawH / 2),
          Math.round(drawW),
          Math.round(drawH)
        );
      } else {
        // Fallback for headless test environments or while image loads
        ctx.fillStyle = isStorm ? 'rgba(56, 189, 248, 0.70)' : 'rgba(240, 249, 255, 0.85)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, this.r * 1.8, this.r * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // 2. JAGGED THUNDER BOLT MOVING AROUND THE CLOUDS (3D Orbital Arc)
    this._drawJaggedCloudThunderbolt(ctx, cx, cy, this.r, now, isStorm, isBehind);

    // 3. ELECTRIC ARCS & IONIZED SPARKS (Behind or In-Front 3D layering)
    const flashThreshold = this.isChargingStorm ? 0.35 : (this.stormActive ? 0.20 : 0.92);
    const flashValue = Math.sin(this.auraPhase * 2.5);
    const isFlashing = flashValue > flashThreshold;

    if (isFlashing) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const branchCount = isStorm ? 3 : 1;
      const timeTick = Math.floor(now / 75);

      for (let b = 0; b < branchCount; b++) {
        // Distribute arcs: odd branches in front, even behind for depth
        const isArcBehind = (b % 2 === 0);
        if (isArcBehind !== isBehind) continue;

        const seed = timeTick * 137 + b * 53 + (isBehind ? 11 : 29);
        const pseudoRand = (n) => {
          const x = Math.sin(seed + n * 9.1) * 43758.5453;
          return x - Math.floor(x);
        };

        const sideAngle = (b / branchCount) * Math.PI + (pseudoRand(1) - 0.5) * 0.8;
        const startRad = this.r * (0.8 + pseudoRand(2) * 0.6);
        const startX = cx + Math.cos(sideAngle) * startRad;
        const startY = cy + Math.sin(sideAngle) * (startRad * 0.5);

        const dirX = (pseudoRand(3) - 0.5) * 2;
        const dirY = (pseudoRand(4) - 0.5) * 2;

        ctx.beginPath();
        ctx.moveTo(startX, startY);

        let bx = startX;
        let by = startY;
        const segments = 3 + Math.floor(pseudoRand(5) * 2);
        const branchLen = 8 + pseudoRand(6) * 12;

        for (let s = 0; s < segments; s++) {
          bx += dirX * (branchLen / segments) + (pseudoRand(7 + s) - 0.5) * 6;
          by += dirY * (branchLen / segments) + (pseudoRand(8 + s) - 0.5) * 6;
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
          const spX = bx + (pseudoRand(10) - 0.5) * 8;
          const spY = by + (pseudoRand(11) - 0.5) * 8;
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

  /**
   * Renders violent, jagged electric lightning crackling and leaping around Zeus's cloud mount.
   * Stroboscopically steps between discrete perimeter nodes (~14-21 jumps/sec) with high-frequency (45 Hz)
   * restrike micro-jitter, sharp acute-angle kinks, dendritic branch tendrils, and 3D depth-sorting.
   */
  _drawJaggedCloudThunderbolt(ctx, cx, cy, r, now, isStorm, isBehind) {
    const rx = r * 1.92;
    const ry = r * 0.98;

    // Stroboscopic stepped timing: electricity snaps instantaneously between discharge sectors
    const stepDuration = isStorm ? 48 : 72; // ms per stepped discharge
    const stepIndex = Math.floor(now / stepDuration);
    const jitterTick = Math.floor(now / 22); // 45 Hz micro-jitter restrike frequency

    // Fast integer bitwise hash for deterministic, zero-allocation procedural lightning noise
    const boltHash = (a, b, c) => {
      let h = (a * 374761393 + b * 668265263 + c * 127412617) | 0;
      h = (h ^ (h >> 13)) * 127412617;
      return ((h ^ (h >> 16)) >>> 0) / 4294967296;
    };

    const boltCount = isStorm ? 2 : 1;
    const numStepsPerRev = 14; // Complete orbit around cloud every ~1.0s (normal) or ~0.67s (storm)

    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 4;

    for (let b = 0; b < boltCount; b++) {
      const boltPhaseOffset = b * Math.PI;
      // Step around the cloud perimeter in discrete, crackling leaps
      const revProgress = (stepIndex % numStepsPerRev) / numStepsPerRev;
      const angleJitter = (boltHash(stepIndex, b, 7) - 0.5) * 0.28;
      const centerAngle = revProgress * Math.PI * 2 + boltPhaseOffset + angleJitter;

      // Arc span covers ~60 to 80 degrees of the cloud perimeter
      const arcSpan = 1.10 + (boltHash(stepIndex, b, 13) - 0.5) * 0.35;
      const startAngle = centerAngle - arcSpan * 0.5;
      const endAngle = centerAngle + arcSpan * 0.5;

      const segments = 8;
      const vertices = [];

      for (let k = 0; k <= segments; k++) {
        const u = k / segments;
        const ang = startAngle + u * (endAngle - startAngle);
        const bx = cx + Math.cos(ang) * rx;
        const by = cy + Math.sin(ang) * ry;

        // Radial normal and tangent vectors aligned to ellipse boundary
        const nx = Math.cos(ang);
        const ny = Math.sin(ang) * (rx / ry);
        const nLen = Math.hypot(nx, ny) || 1;
        const unx = nx / nLen;
        const uny = ny / nLen;
        const utx = -uny;
        const uty = unx;

        let radDisp = 0;
        let tanDisp = 0;

        if (k > 0 && k < segments) {
          // Sharp acute kinks: violent perpendicular steps with sinusoidal envelope
          const envelope = Math.sin(u * Math.PI);
          const hRad = boltHash(stepIndex, k + b * 20, jitterTick);
          const hTan = boltHash(stepIndex + 97, k + b * 20, jitterTick);
          radDisp = (hRad - 0.5) * 22 * envelope; // +/- 11px acute jagged spike
          tanDisp = (hTan - 0.5) * 10 * envelope; // +/- 5px tangential stretch
        } else {
          // Endpoint contact jitter
          const hEnd = boltHash(stepIndex, k + b * 15, jitterTick);
          radDisp = (hEnd - 0.5) * 4;
        }

        vertices.push({
          x: bx + unx * radDisp + utx * tanDisp,
          y: by + uny * radDisp + uty * tanDisp,
          baseY: by,
          ang
        });
      }

      // Filter segments matching the current depth layer (behind vs in front of Zeus)
      const activeSegments = [];
      for (let k = 0; k < segments; k++) {
        const midBaseY = (vertices[k].baseY + vertices[k + 1].baseY) * 0.5;
        const segBehind = midBaseY < cy;
        if (segBehind === isBehind) {
          activeSegments.push(k);
        }
      }

      // 1. Draw Main Jagged Trunk (if any segment is in this layer)
      if (activeSegments.length > 0) {
        // Outer vivid electric cyan ionization aura
        ctx.strokeStyle = isStorm ? 'rgba(0, 240, 255, 0.95)' : 'rgba(56, 189, 248, 0.88)';
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        for (let i = 0; i < activeSegments.length; i++) {
          const k = activeSegments[i];
          if (i === 0 || activeSegments[i - 1] !== k - 1) {
            ctx.moveTo(vertices[k].x, vertices[k].y);
          }
          ctx.lineTo(vertices[k + 1].x, vertices[k + 1].y);
        }
        ctx.stroke();

        // Inner white-hot blazing core
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // 2. Dendritic Branch Tendrils (Sharp forks shooting out into air or into cloud)
      const forkIndices = [2, 5];
      for (let f = 0; f < forkIndices.length; f++) {
        const fIdx = forkIndices[f];
        const fVertex = vertices[fIdx];
        const isForkBehind = fVertex.baseY < cy;
        if (isForkBehind !== isBehind) continue;

        const fSeed = stepIndex * 29 + fIdx * 41 + b * 17;
        const outDir = (f === 0) ? 1.0 : -0.7; // Fork 0 shoots outward into air; Fork 1 sinks inward into cloud
        const normX = (fVertex.x - cx) / rx;
        const normY = (fVertex.y - cy) / ry;
        const nLen = Math.hypot(normX, normY) || 1;
        const dirX = (normX / nLen) * outDir;
        const dirY = (normY / nLen) * outDir;
        const perpX = -dirY;
        const perpY = dirX;

        const hLen = boltHash(fSeed, 1, jitterTick);
        const branchLen = 7 + hLen * 9;
        const midKink = (boltHash(fSeed, 2, jitterTick) - 0.5) * 8;
        const endKink = (boltHash(fSeed, 3, jitterTick) - 0.5) * 8;

        const fMidX = fVertex.x + dirX * (branchLen * 0.5) + perpX * midKink;
        const fMidY = fVertex.y + dirY * (branchLen * 0.5) + perpY * midKink;
        const fEndX = fVertex.x + dirX * branchLen + perpX * endKink;
        const fEndY = fVertex.y + dirY * branchLen + perpY * endKink;

        ctx.strokeStyle = isStorm ? 'rgba(0, 240, 255, 0.85)' : 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(fVertex.x, fVertex.y);
        ctx.lineTo(fMidX, fMidY);
        ctx.lineTo(fEndX, fEndY);
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Micro spark bead at branch tip
        if (boltHash(fSeed, 4, jitterTick) > 0.45) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(Math.round(fEndX - 0.75), Math.round(fEndY - 0.75), 1.5, 1.5);
        }
      }

      // 3. Ionization Contact Sparks at Terminal Strike Nodes
      const endNodes = [vertices[0], vertices[segments]];
      for (let e = 0; e < endNodes.length; e++) {
        const ep = endNodes[e];
        const isEpBehind = ep.baseY < cy;
        if (isEpBehind !== isBehind) continue;

        const epSeed = stepIndex * 53 + e * 37 + b * 23;
        const sparkCount = 2 + Math.floor(boltHash(epSeed, 1, jitterTick) * 2);
        for (let s = 0; s < sparkCount; s++) {
          const spAngle = boltHash(epSeed, s * 2 + 2, jitterTick) * Math.PI * 2;
          const spDist = 3 + boltHash(epSeed, s * 2 + 3, jitterTick) * 7;
          const spX = ep.x + Math.cos(spAngle) * spDist;
          const spY = ep.y + Math.sin(spAngle) * spDist;
          ctx.fillStyle = (s % 2 === 0) ? '#FFFFFF' : '#00E5FF';
          ctx.fillRect(Math.round(spX - 0.75), Math.round(spY - 0.75), 1.5, 1.5);
        }
      }
    }

    ctx.restore();
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

