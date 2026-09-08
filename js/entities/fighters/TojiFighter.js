import { Fighter, applyDamageToTarget, isSuppressedByGetsuga } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnSparks, spawnImpactFlash, spawnCrimsonLightningImpact, spawnMeleeClashShockwave, spawnArcaneSmoke, spawnTojiWhirlingWindDebris, spawnGroundScorch } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { drawInvertedSpear, drawSplitSoulKatana, drawPhysicsChain, drawRestedKatanaOverShoulder, drawRestedInvertedSpearAtHip, TOJI_WEAPON_CONFIG } from '../../graphics/weapons/tojiWeaponGraphics.js';
import { drawTojiSkin, drawTojiGhostSkin } from '../../graphics/fighters/tojiSkin.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { initChainPhysics as modInitChain, updateChainPhysics as modUpdateChain, performSplitSoulKatanaSlash as modKatanaSlash, performInvertedSpearStrike as modSpearStrike, tojiGetTargetsInFrontalArc } from './toji/tojiWeapons.js';
import { modSpawnTeleportAfterimages, modStartAmbushSequence, modUpdateAmbushSequence, tojiIsTargetDeadOrRemoved } from './toji/tojiAmbush.js';
import { modUpdateChannelSense, modUpdateStealth } from './toji/tojiSkills.js';
import { MODE_SPEED_MULTIPLIER } from '../../core/modeConfig.js';

/**
 * Toji Fushiguro - The Sorcerer Killer
 */
export class TojiFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'toji';
    this.type = 'toji';
    this.domainImmunity = true;
    this.isDomainImmune = true;
    this.damageNumberColor = '#e9d5ff';
    
    // Heavenly Restriction Stealth Passive (Configurable Duration & Cooldown)
    this.stealthMaxDuration = CONFIG.toji?.stealthDuration || 240;
    this.stealthMaxCooldown = CONFIG.toji?.stealthCooldown || 500;
    this.stealthTimer = this.stealthMaxDuration;
    this.stealthCooldown = 0;
    this.isStealthed = true;
    this.stealthActive = true;
    this.stealthAfterimages = [];

    // Ambush Sequence State
    this.isAmbushing = false;
    this.isSpinning = false;
    this._ultimateSlideStartX = undefined;
    this._ultimateSlideStartY = undefined;
    this._ultimateSlideTargetX = undefined;
    this._ultimateSlideTargetY = undefined;
    this._ultimateChargeFlipSign = undefined;
    this._ultimateChargeAngle = undefined;
    this.ambushPhase = null;
    this.ambushTimer = 0;

    // Inverted Spear of Heaven (Basic Attack)
    this.spearCooldown = 0;
    this.spearCooldownMax = CONFIG.toji?.spearCooldown || 75;
    this.spearRange = CONFIG.toji?.spearRange || 50;
    this.spearDamage = CONFIG.toji?.spearDamage || 15;
    this.spearSwingTimer = 0;
    this.spearSwingMax = 36;

    // Split Soul Katana
    // Physics Chain simulation
    this.chainNodes = [];
    this.ultimateCooldownMax = CONFIG.toji?.ultimateCooldown || 1500;
    this.ultimateCooldown = this.ultimateCooldownMax;
    this.ultimateActive = false;
    this.ultimatePhase = null;
    this.ultimateTimer = 0;
    this.ultimateTarget = null;
    this.ultimateAssaultCount = 0;
    this.immuneToCC = true;
    this.domainImmunity = true;
    this.isDomainImmune = true;
    this.isKnockbackStunImmune = true;
    this.postUltimateRecoveryTimer = 0;
    this._initChainPhysics();
  }

  _initChainPhysics() {
    return modInitChain(this);
  }

  /**
   * Heavenly Restriction: Zero Cursed Energy. 
   * Toji is completely immune to domain effects and sensory overload slow effects (like Gojo's Limitless).
   */
  triggerDemoAttack() {
    const fakeTarget = { x: 80, y: 0, r: 25, hp: 100, maxHp: 100, vx: 0, vy: 0, applyKnockback: () => {}, applySlow: () => {}, applyTimeStop: () => {}, takeDamage: () => {} };
    if ((state.tojiWeaponIndex || 0) === 1) {
      this.ambushPhase = 'KATANA_SLASH';
      this.katanaSlashTimer = 50;
      if (typeof this.performSplitSoulKatanaSlash === 'function') {
        this.performSplitSoulKatanaSlash(fakeTarget, 0);
      }
    } else {
      if (typeof this.performInvertedSpearStrike === 'function') {
        this.performInvertedSpearStrike(fakeTarget, 0, false);
      } else {
        this.spearSwingMax = 55;
        this.spearSwingTimer = 55;
      }
    }
  }

  isStationarySkillActive() {
    return Boolean(
      (this.ultimateActive && (this.ultimatePhase === 'CHANNELING' || this.isChargingUlt || this.isFiringUlt || (this.ultimateChargeTimer && this.ultimateChargeTimer > 0))) ||
      this.isAmbushing ||
      super.isStationarySkillActive()
    );
  }

  applySlow(frames, multiplier, options = {}) {
    // Gojo's Reversal Red spatial repulsion slow bypasses Heavenly Restriction slow immunity!
    if (options && options.isRed) {
      this.slowTimer = Math.max(this.slowTimer || 0, frames);
      this.slowMultiplier = multiplier;
      this.redSlowTimer = frames;
      this.redSlowMaxTimer = frames;
      return;
    }
    // Mahoraga's Divine Shout shockwave bypasses Heavenly Restriction slow immunity!
    if (options && options.isMahoragaShout) {
      this.slowTimer = Math.max(this.slowTimer || 0, frames);
      this.slowMultiplier = multiplier;
      this.mahoragaShoutSlowTimer = frames;
      return;
    }
    // Overridden to do nothing for standard slows
    this.slowTimer = 0;
    this.slowMultiplier = 1.0;
    return;
  }

  applyRedKnockback(vx, vy) {
    this.redKnockbackTimer = 24; // slightly longer to ensure smooth slide
    this.redKnockbackVx = vx * 1.1; // boost slightly for visual impact
    this.redKnockbackVy = vy * 1.1;
    this.vx = this.redKnockbackVx;
    this.vy = this.redKnockbackVy;
    this.isAmbushing = false;
    this.ambushPhase = null;
    this.katanaSlashTimer = 0;
    this.phantomSlashTimer = 0;
    if (this.ultimateActive) {
      this.ultimateActive = false;
      this.ultimatePhase = null;
    }
  }

  applyKnockback(vx, vy, options = {}) {
    if (options && options.isRed) {
      this.applyRedKnockback(vx, vy);
      return;
    }
    super.applyKnockback(vx, vy);
  }

  reset() {
    super.reset();
    this.immuneToCC = true;
    this.domainImmunity = true;
    this.postUltimateRecoveryTimer = 0;
    this.stealthMaxDuration = CONFIG.toji?.stealthDuration || 240;
    this.stealthMaxCooldown = CONFIG.toji?.stealthCooldown || 500;
    this.stealthTimer = this.stealthMaxDuration;
    this.stealthCooldown = 0;
    this.isStealthed = true;
    this.stealthActive = true;
    this.stealthAfterimages = [];
    this.isAmbushing = false;
    this.isSpinning = false;
    this._ultimateSlideStartX = undefined;
    this._ultimateSlideStartY = undefined;
    this._ultimateSlideTargetX = undefined;
    this._ultimateSlideTargetY = undefined;
    this._ultimateChargeFlipSign = undefined;
    this._ultimateChargeAngle = undefined;
    this.ambushTarget = null;
    this.ambushPhase = null;
    this.ambushTimer = 0;
    this.spearCooldown = 0;
    this.spearSwingTimer = 0;
    this.katanaActiveTimer = 0;
    this.katanaCooldownTimer = 0;
    this.katanaSlashTimer = 0;
    this.katanaSlashFadeTimer = 0;
    this._slashStartAngle = undefined;   // Frozen angle snapshot — cleared on reset
    this._slashStartFlipSign = undefined;
    this.ultimateCooldownMax = CONFIG.toji?.ultimateCooldown || 2500;
    this.ultimateCooldown = this.ultimateCooldownMax;
    this.ultimateActive = false;
    this.isChannelingDomain = false;
    this.ultimateChargeTimer = 0;
    this.ultimatePhase = null;
    this.ultimateTimer = 0;
    this.ultimateTarget = null;
    this.ultimateAssaultCount = 0;
    if (typeof state !== 'undefined') {
      if (state.fighters) {
        state.fighters.forEach(f => {
          if (f) f.isTargetOfAmbush = false;
        });
      }
      if (state.illusions) {
        state.illusions.forEach(ill => {
          if (ill) ill.isTargetOfAmbush = false;
        });
      }
    }
    this._initChainPhysics();
  }

  interruptAttacks(force = false) {
    if ((this.ultimateActive || this.isAmbushing) && !force) {
      return; // PROTECTED: Never cancel or interrupt active ultimate or active ambush combo!
    }
    super.interruptAttacks(force);
    this.isAmbushing = false;
    this.ambushTarget = null;
    this.ambushPhase = null;
    this.ultimateActive = false;
    this.isChannelingDomain = false;
    this.ultimatePhase = null;
    this.ultimateTarget = null;
    const isMatchEnded = typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd');
    if (force || (!isMatchEnded && (this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush))) {
      this.katanaSlashTimer = 0;
      this.katanaSlashFadeTimer = 0;
      this._lastKatanaTimer = 0;
      this.slashSwingTimer = 0;
      this.spearSwingTimer = 0;
    }
    this.phantomSlashTimer = 0;
    this.phantomStrikeCount = 0;
    this._activeSlashProgress = 0;
    this._recoveryProgress = 0;
    if (this.swordTrail) this.swordTrail.length = 0;
    if (this.stealthAfterimages) this.stealthAfterimages.length = 0;
    if (this.afterImages) this.afterImages.length = 0;
    if (typeof state !== 'undefined') {
      if (state.fighters) {
        state.fighters.forEach(f => {
          if (f) f.isTargetOfAmbush = false;
        });
      }
      if (state.illusions) {
        state.illusions.forEach(ill => {
          if (ill) ill.isTargetOfAmbush = false;
        });
      }
    }
  }

  applyTimeStop(frames) {
    if (this.ultimateActive) return;
    super.applyTimeStop(frames);
  }

  applyHitStun(frames) {
    if (this.ultimateActive) return;
    super.applyHitStun(frames);
  }

  applyParalyze(frames) {
    if (this.ultimateActive) return;
    if (typeof super.applyParalyze === 'function') super.applyParalyze(frames);
  }

  /**
   * Overrides takeDamage to implement Inverted Spear Melee Parry & Ambush Counter-Attack.
   */
  takeDamage(amount, attacker, opts = {}) {
    if (opts.isHeal) return super.takeDamage(amount, attacker, opts);

    // Check if an enemy Domain Expansion is currently active in the arena
    const myTeam = (typeof state !== 'undefined' && typeof state.getFighterTeam === 'function' && state.fighters) ? state.getFighterTeam(state.fighters.indexOf(this)) : null;
    const isEnemyDomainActive = Boolean(
      (typeof state !== 'undefined' && (state.domainActive || state.activeDomain)) ||
      (typeof state !== 'undefined' && state.fighters && state.fighters.some((f, idx) => {
        if (!f || f === this || f.hp <= 0) return false;
        const isDomainRunning = f.domainActive || f._mahitoDomainActive || f.isChannelingDomainExpansion || f.isChannelingDomain;
        if (!isDomainRunning) return false;
        const enemyTeam = state.getFighterTeam(idx);
        return myTeam === null || enemyTeam === null || myTeam !== enemyTeam;
      }))
    );

    // Heavenly Restriction / Physical Instinct Dodge: physically dodge incoming melee attacks, strikes & projectiles
    // Dodge chance significantly increases when inside an enemy Domain Expansion (0 Cursed Energy stealth mastery!)
    const isGuaranteedHit = Boolean(opts.isRatioCrit || opts.isNanamiPause || opts.undodgeable || opts.isSureKill || opts.isSaitamaCounter || opts.bypassEvade || opts.isGuaranteedHit || opts.isDivineFlame || opts.isFuga);
    const isDirectAttack = Boolean(
      opts.isProjectile ||
      opts.projectile ||
      opts.isRanged ||
      opts.isBullet ||
      opts.isLaser ||
      opts.isMelee ||
      opts.isPhysical ||
      opts.isPunch ||
      opts.isSlash ||
      opts.isBasic ||
      opts.isSkill ||
      opts.isDirect ||
      (attacker && attacker !== this && !opts.isTrueDamage && !opts.fromBlackHole && !opts.isDomainDPS && !opts.isBurn && !opts.isPoison && !opts.isDivineFlame && !opts.isFuga)
    );
    const isDodgeable = isDirectAttack && !opts.isTrueDamage && !isGuaranteedHit && !opts.fromBlackHole && !opts.isDomainDPS && !opts.isBurn && !opts.isPoison && !opts.isDivineFlame && !opts.isFuga;
    
    let dodgeChance = CONFIG.toji?.stealthDodgeChance ?? 0.25;
    if (isEnemyDomainActive) {
      const domainDodgeBonus = CONFIG.toji?.domainDodgeBonus ?? 0.75;
      const domainDodgeChance = CONFIG.toji?.domainDodgeChance ?? 1.0;
      dodgeChance = Math.min(1.0, Math.max(dodgeChance + domainDodgeBonus, domainDodgeChance));
    }
    
    if (isDodgeable && (dodgeChance >= 1.0 || Math.random() < dodgeChance)) {
      spawnFloatingText(this.x, this.y - this.r - 8, 'MISS!', '#C084FC');
      audioSystem.playSFX('skill_parry', 0.65);
      
      // Spawn standard Toji stealth flash-step afterimages
      if (!this.stealthAfterimages) this.stealthAfterimages = [];
      const moveAngle = Math.hypot(this.vx, this.vy) > 0.1 ? Math.atan2(this.vy, this.vx) : (this.angle || 0);
      const perpAngle = moveAngle + Math.PI / 2;
      
      for (let i = 0; i < 3; i++) {
        const offsetDistance = (i + 1) * 8;
        const zigzagDistance = (i % 2 === 0 ? 1 : -1) * (4 + i * 3);
        const offsetX = -Math.cos(moveAngle) * offsetDistance + Math.cos(perpAngle) * zigzagDistance;
        const offsetY = -Math.sin(moveAngle) * offsetDistance + Math.sin(perpAngle) * zigzagDistance;
        pushTrailCap(this.stealthAfterimages, {
          x: this.x + offsetX,
          y: this.y + offsetY,
          angle: this.gunAngle !== undefined ? this.gunAngle : this.angle,
          alpha: 0.60 - i * 0.15,
          initialAlpha: 0.60 - i * 0.15,
          maxTimer: 14,
          timer: 14
        }, 4);
      }
      return false; // Damage dodged & negated!
    }

    // Inverted Spear Parry & Counter-Attack (active inside enemy domains against strikes/projectiles AND domain slash ticks!)
    const parryChance = CONFIG.toji?.parryChance || 0.45;
    const canParry = isEnemyDomainActive && (opts.isMelee || opts.isPhysical || !opts.isTrueDamage) && !isGuaranteedHit && !opts.bypassShield;

    if (canParry && Math.random() < parryChance) {
      this.blockPoseTimer = 25; // 25-frame parry deflection pose
      this.parryType = Math.random() < 0.25 ? 'guard' : 'deflect';

      // Spawn Yuta-style parry sparks & dark impact flash distributed along the blade
      const baseAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
      const bladeAngle = baseAngle + Math.PI / 2;
      const hiltX = this.x + Math.cos(baseAngle) * (this.r - 14);
      const hiltY = this.y + Math.sin(baseAngle) * (this.r - 14);

      for (let i = 0; i < 10; i++) {
        const offset = 15 + Math.random() * 45;
        spawnSparks(hiltX + Math.cos(bladeAngle) * offset, hiltY + Math.sin(bladeAngle) * offset, 1, 'silver', 'rgba(255, 30, 75, 1)');
      }
      spawnImpactFlash(hiltX + Math.cos(bladeAngle) * 35, hiltY + Math.sin(bladeAngle) * 35, 55, 'dark');

      audioSystem.playSFX('skill_parry', 0.85);

      // Trigger 3-Stage Ambush Counter-Attack with cooldown so it is not spammed continuously inside domains
      let realTarget = attacker;
      if (attacker && attacker.owner) {
        // If the attacker is a projectile (does not have hp property) or is a turret, target the owner
        if (!attacker.hp || attacker.isTurret || attacker.owner.isTurret) {
          realTarget = attacker.owner;
        }
      }
      if (!this.isAmbushing && (this._parryAmbushCooldown || 0) <= 0 && !tojiIsTargetDeadOrRemoved(this, realTarget)) {
        this._parryAmbushCooldown = CONFIG.toji?.parryAmbushCooldownFrames || 360; // 6 second cooldown between parry counter-ambushes
        this.startAmbushSequence(realTarget);
      }

      return false; // Damage parried & negated!
    }

    return super.takeDamage(amount, attacker, opts);
  }

  /**
   * Triggers Toji's Ultimate: Curse Inventory - Full Arsenal Unleashed
   */
  triggerUltimate() {
    if (this.isDead || this.hp <= 0 || this.ultimateCooldown > 0 || this.isAmbushing || this.ultimateActive) return;
    
    // Cannot cast Ultimate while inside an active Domain Expansion
    const isDomainActive = state.fighters && state.fighters.some(f => f && f !== this && f.hp > 0 && (f.domainActive || f.isChannelingDomainExpansion || f.isChannelingDomain));
    if (isDomainActive) return;

    const opponents = [];
    const myTeam = (typeof state !== 'undefined' && state.fighters) ? state.getFighterTeam(state.fighters.indexOf(this)) : null;

    if (typeof state !== 'undefined') {
      if (state.fighters) {
        state.fighters.forEach((f, idx) => {
          if (!f || f === this || f.hp <= 0 || f.isDead) return;
          if (f.invincibilityTimer > 0 || f.flashStepTimer > 0) return;
          if ((state.mode === '2v2' || state.mode === '1v2 Stand Off') && myTeam !== null && state.getFighterTeam(idx) === myTeam) return;
          if (f.owner === this) return;
          opponents.push(f);
        });
      }
      if (state.illusions) {
        state.illusions.forEach(ill => {
          if (!ill || ill.hp <= 0 || ill.isDead) return;
          if (ill.owner === this) return;
          opponents.push(ill);
        });
      }
    }

    if (opponents.length === 0) return;
    
    // Find closest opponent
    let closest = null;
    let minDist = Infinity;
    for (const opp of opponents) {
      const dist = Math.hypot(opp.x - this.x, opp.y - this.y);
      if (dist < minDist) {
        minDist = dist;
        closest = opp;
      }
    }
    
    if (!closest) return;
    
    this.ultimateActive = true;
    this.ultimateCooldown = this.ultimateCooldownMax || CONFIG.toji?.ultimateCooldown || 2500;
    this.ultimatePhase = 'CHANNELING';
    this.isChannelingDomain = true;
    this.ultimateChargeTimer = 0;
    this.ultimateChargeMax = CONFIG.toji?.ultimateChargeTime || 90; // 90 frames (1.5s channel)
    this.ultimateTarget = closest;
    if (closest) {
      this.aim(closest);
      if (closest.afterImages) closest.afterImages.length = 0;
      if (closest._dashAfterimages) closest._dashAfterimages.length = 0;
      if (closest.stealthAfterimages) closest.stealthAfterimages.length = 0;
      if (closest.adaptationAfterimages) closest.adaptationAfterimages.length = 0;
      if (closest._afterImages) closest._afterImages.length = 0;
    }
    this.ultimateAssaultCount = 0;
    
    // Clear any lingering stealth afterimages so they don't get stuck on screen
    this.stealthAfterimages = [];
    
    // Global dramatic screen shake and sound for domain channeling
    triggerGlobalScreenShake(6, 90);
    const channelSound = getSkillEffectSound('toji', 'ultimatechanneling');
    const chanVol = channelSound?.volume ?? CONFIG.toji?.soundVolumes?.ultimateChanneling ?? 4.0;
    const chanSpeed = channelSound?.speed ?? 1.0;
    const chanDelay = channelSound?.delay ?? CONFIG.toji?.soundDelays?.ultimateChanneling ?? 0;
    audioSystem.playSFX(channelSound?.src || CONFIG.toji?.sounds?.ultimateChanneling || 'Assets/Sound Effects/Skills/toji-ultimatechanneling.mp3', chanVol, chanSpeed, 0, chanDelay);
  }

  /**
   * State Machine for Toji's Ultimate: Curse Inventory - Full Arsenal Unleashed
   * (Cyclical Hit-and-Run sequence ending in a Crater Slam)
   */
  updateUltimate(arena, ownerIndex) {
    if (!this.ultimateActive) return;

    if (tojiIsTargetDeadOrRemoved(this, this.ultimateTarget)) {
      let nextTarget = null;
      let minDist = Infinity;
      const allTargets = [];
      const myTeam = (typeof state !== 'undefined' && state.fighters) ? state.getFighterTeam(state.fighters.indexOf(this)) : null;
      if (typeof state !== 'undefined') {
        if (state.fighters) {
          state.fighters.forEach((f, idx) => {
            if (!f || f === this || f.hp <= 0 || f.isDead) return;
            if ((state.mode === '2v2' || state.mode === '1v2 Stand Off') && myTeam !== null && state.getFighterTeam(idx) === myTeam) return;
            if (f.owner === this) return;
            allTargets.push(f);
          });
        }
        if (state.illusions) {
          state.illusions.forEach(ill => {
            if (!ill || ill.hp <= 0 || ill.isDead) return;
            if (ill.owner === this) return;
            allTargets.push(ill);
          });
        }
      }
      for (const t of allTargets) {
        const dist = Math.hypot(t.x - this.x, t.y - this.y);
        if (dist < minDist) {
          minDist = dist;
          nextTarget = t;
        }
      }
      if (nextTarget) {
        this.ultimateTarget = nextTarget;
      } else {
        this.ultimateActive = false;
        this.ultimateCooldown = this.ultimateCooldownMax || CONFIG.toji?.ultimateCooldown || 2500;
        this.ultimateChargeTimer = 0;
        this.isChannelingDomain = false;
        this.ultimatePhase = null;
        this.ultimateTarget = null;
        this.postUltimateRecoveryTimer = 0;
        return;
      }
    }

    // Phase: CHANNELING — Toji channels his ultimate with Domain Expansion style ground ring, aura & afterimages
    if (this.ultimatePhase === 'CHANNELING') {
      this.isChannelingDomain = true;
      this.ultimateChargeTimer++;
      this.vx = 0;
      this.vy = 0;

      // Spawn domain channeling afterimages vibrating/pulsing out around Toji
      if (this.ultimateChargeTimer % 3 === 0) {
        const offsetDist = 6 + Math.sin(Date.now() / 80) * 10;
        const offAngle = Math.random() * Math.PI * 2;
        if (!this.stealthAfterimages) this.stealthAfterimages = [];
        pushTrailCap(this.stealthAfterimages, {
          x: this.x + Math.cos(offAngle) * offsetDist,
          y: this.y + Math.sin(offAngle) * offsetDist,
          angle: this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0),
          maxTimer: 16,
          timer: 16,
          initialAlpha: 0.6,
          isDomainAfterimage: true
        }, 4);
      }

      if (this.ultimateChargeTimer >= (this.ultimateChargeMax || 90)) {
        this.ultimateChargeTimer = 0;
        this.isChannelingDomain = false;
        this.ultimatePhase = 'VANISHED';
        this.ultimateTotalTimer = CONFIG.toji?.ultimateSwarmDuration || 500;
        this.ultimateCycleTimer = CONFIG.toji?.ultimateVanishDuration ?? 120; // Initial delay before the first strike
        
        const vanishSound = getSkillEffectSound('toji', 'vanish');
        if (vanishSound) audioSystem.playSFX(vanishSound.src, vanishSound.volume);
        
        // Spawn a large puff of dark smoke to signify his vanishing
        for (let i = 0; i < 4; i++) {
           const s1 = spawnArcaneSmoke(this.x + (Math.random() - 0.5) * 40, this.y + (Math.random() - 0.5) * 40, 0, 0, 'burst');
           if (s1) {
             s1.color = 'rgba(15, 15, 15, 0.8)';
             s1.size = 40 + Math.random() * 20;
             s1.targetSize = s1.size + 20 + Math.random() * 20;
           }
           
           const s2 = spawnArcaneSmoke(this.x + (Math.random() - 0.5) * 60, this.y + (Math.random() - 0.5) * 60, 0, 0, 'burst');
           if (s2) {
             s2.color = 'rgba(25, 25, 25, 0.7)';
             s2.size = 50 + Math.random() * 20;
             s2.targetSize = s2.size + 30 + Math.random() * 20;
           }
        }
        
        // Afflict the target with an intense 90% sensory-deprivation slow instead of a full time stop
        if (typeof this.ultimateTarget.applySlow === 'function') {
          this.ultimateTarget.applySlow(this.ultimateTotalTimer, 0.1); // 10% movement speed through assault
        }
        if (typeof this.ultimateTarget.interruptAttacks === 'function') {
          this.ultimateTarget.interruptAttacks(true);
        }
        this.ultimateTarget.maceCannonAnimTimer = 0;
        this.ultimateTarget._maceCannonData = null;
        this.ultimateTarget.twinScissorAnimTimer = 0;
        this.ultimateTarget._twinScissorData = null;
        this.ultimateTarget.fleshSurgeAnimTimer = 0;
        this.ultimateTarget._fleshSurgePlungeAngle = null;
        this.ultimateTarget._fleshSurgeChain = null;
        this.ultimateTarget.hideFrontHand = false;
        this.ultimateTarget.hideBackHand = false;
        
        // Dash backwards into the smoke!
        const dx = this.ultimateTarget.x - this.x;
        const dy = this.ultimateTarget.y - this.y;
        const angle = Math.atan2(dy, dx);
        const dashSpeed = 18;
        this.vx = -Math.cos(angle) * dashSpeed;
        this.vy = -Math.sin(angle) * dashSpeed;
        this.ultimateTarget.vx = 0;
        this.ultimateTarget.vy = 0;
      }
      return;
    }

    this.ultimateTotalTimer--;

    const maxStrikes = CONFIG.toji?.ultimateMaxStrikes || 8;
    
    // Transition to CRATER slam once the configured number of strikes is reached
    // We wait until he's fully in the 'VANISHED' phase after the final hit to transition smoothly
    if (this.ultimateAssaultCount >= maxStrikes && this.ultimatePhase === 'VANISHED' && this.ultimatePhase !== 'CRATER') {
      // Step 1: Slide AWAY in distance from enemy into aerial vantage position before crater slam
      this.ultimatePhase = 'CRATER_FADEIN';
      const fadeInFrames = CONFIG.toji?.ultimateCraterFadeInFrames ?? 35;
      this.ultimateCycleTimer = fadeInFrames;
      this.craterFadeInTotal = fadeInFrames;

      const finalBlowChargeSound = getSkillEffectSound('toji', 'finalblowcharging');
      const fbcVol = finalBlowChargeSound?.volume ?? CONFIG.toji?.soundVolumes?.finalBlowCharging ?? 4.5;
      const fbcSpeed = finalBlowChargeSound?.speed ?? 1.0;
      const fbcDelay = finalBlowChargeSound?.delay ?? CONFIG.toji?.soundDelays?.finalBlowCharging ?? -0.10;
      audioSystem.playSFX(finalBlowChargeSound?.src || CONFIG.toji?.sounds?.finalBlowCharging || 'Assets/Sound Effects/Skills/tojo-finalblow-charging.mp3', fbcVol, fbcSpeed, 0, fbcDelay);
      
      this.vx = 0;
      this.vy = 0;
      
      // Face the target and setup katana visual
      this.aim(this.ultimateTarget);
      this.ambushPhase = 'KATANA_CHARGE';
      this.phantomStrikeCount = 0;

      // Clear any active weapon slash trails to prevent purple outline during charge phase
      this.katanaSlashTimer = 0;
      this.katanaSlashFadeTimer = 0;

      // Snapshot starting coordinates for smooth slide-away
      this._ultimateSlideStartX = this.x;
      this._ultimateSlideStartY = this.y;

      // Calculate dramatic retreat position away in distance from the target
      const awayDist = CONFIG.toji?.ultimateCraterDistance || 320;
      let signX = (this.x < this.ultimateTarget.x) ? -1 : 1;
      if (Math.abs(this.x - this.ultimateTarget.x) < 5) {
        signX = Math.random() < 0.5 ? -1 : 1;
      }
      const awayX = signX * (awayDist * 0.85);
      const awayY = -Math.abs(awayDist * 0.52);

      let targetHoverX = this.ultimateTarget.x + awayX;
      let targetHoverY = this.ultimateTarget.y + awayY;
      let clampedHover = this._clampToArena(targetHoverX, targetHoverY);

      // Boundary check: search across candidate retreat angles to maximize vantage distance in any arena corner
      let bestX = clampedHover.x;
      let bestY = clampedHover.y;
      let bestDist = Math.hypot(bestX - this.ultimateTarget.x, bestY - this.ultimateTarget.y);

      const candidateAngles = [
        Math.atan2(awayY, awayX),
        Math.atan2(awayY, -awayX),
        Math.atan2(-awayY, awayX),
        Math.atan2(-awayY, -awayX),
        Math.atan2(this.y - this.ultimateTarget.y, this.x - this.ultimateTarget.x)
      ];

      for (const ang of candidateAngles) {
        const candX = this.ultimateTarget.x + Math.cos(ang) * awayDist;
        const candY = this.ultimateTarget.y + Math.sin(ang) * awayDist;
        const clampedCand = this._clampToArena(candX, candY);
        const candDist = Math.hypot(clampedCand.x - this.ultimateTarget.x, clampedCand.y - this.ultimateTarget.y);
        if (candDist > bestDist) {
          bestDist = candDist;
          bestX = clampedCand.x;
          bestY = clampedCand.y;
        }
      }

      this._ultimateSlideTargetX = bestX;
      this._ultimateSlideTargetY = bestY;

      return;
    }

    // Phase: Fade-in & Slide Away — Toji slides away in distance from enemy to vantage spot
    if (this.ultimatePhase === 'CRATER_FADEIN') {
      this.ultimateCycleTimer--;
      
      // Smooth non-linear ease-out slide away from enemy to distant vantage position
      const totalFrames = this.craterFadeInTotal || 35;
      const progress = Math.max(0, Math.min(1.0, 1.0 - (this.ultimateCycleTimer / totalFrames)));
      const ease = 1.0 - Math.pow(1.0 - progress, 2.5); // Fast initial burst sliding back, then smooth settle

      const startX = this._ultimateSlideStartX !== undefined ? this._ultimateSlideStartX : this.x;
      const startY = this._ultimateSlideStartY !== undefined ? this._ultimateSlideStartY : this.y;
      const slideTX = this._ultimateSlideTargetX !== undefined ? this._ultimateSlideTargetX : (this.ultimateTarget ? this.ultimateTarget.x - 220 : this.x);
      const slideTY = this._ultimateSlideTargetY !== undefined ? this._ultimateSlideTargetY : (this.ultimateTarget ? this.ultimateTarget.y - 180 : this.y);

      this.x = startX + (slideTX - startX) * ease;
      this.y = startY + (slideTY - startY) * ease;
      const clamped = this._clampToArena(this.x, this.y);
      this.x = clamped.x;
      this.y = clamped.y;

      this.vx = 0;
      this.vy = 0;
      
      // Spawn sleek shadow afterimages trailing behind him as he slides back away
      if (this.ultimateCycleTimer % 2 === 0) {
        if (!this.stealthAfterimages) this.stealthAfterimages = [];
        pushTrailCap(this.stealthAfterimages, {
          x: this.x,
          y: this.y,
          gunAngle: this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0),
          maxTimer: 16,
          timer: 16,
          initialAlpha: 0.55,
          isDomainAfterimage: true
        }, 8);
      }

      // Smooth rotation tracking toward enemy during slide away
      if (this.ultimateTarget) {
        const targetAngle = Math.atan2(this.ultimateTarget.y - this.y, this.ultimateTarget.x - this.x);
        const currentAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
        let diff = targetAngle - currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const turnRate = 0.08; // Smooth tracking
        this.gunAngle = currentAngle + diff * turnRate;
        this.angle = this.gunAngle;
      }
      
      // Spawn swirling wind debris (leaves & pebbles) around Toji as he slides back
      if (this.ultimateCycleTimer % 2 === 0) {
        spawnTojiWhirlingWindDebris(this.x, this.y, 2);
      }
      
      if (this.ultimateCycleTimer <= 0) {
        // Fully arrived at distant vantage point — transition to CRATER charge (hold stance, then dive)
        this.ultimatePhase = 'CRATER';
        
        const chargeTime = CONFIG.toji?.ultimateCraterChargeTime ?? 90;
        const diveTime = CONFIG.toji?.ultimateCraterDiveTime ?? 16;
        const spinTime = CONFIG.toji?.ultimateCraterSpinTime ?? 14;
        this.ultimateCycleTimer = chargeTime + diveTime + spinTime;
        this.ambushTimer = chargeTime;
        
        this.vx = 0;
        this.vy = 0;
      }
      return;
    }

    if (this.ultimatePhase === 'VANISHED') {
      this.ultimateCycleTimer--;
      
      // Custom slide physics
      this.x += this.vx;
      this.y += this.vy;
      const clampedVanish = this._clampToArena(this.x, this.y);
      this.x = clampedVanish.x;
      this.y = clampedVanish.y;
      this.vx *= 0.88; // Friction for smooth slide
      this.vy *= 0.88;
      
      // Continue ticking down animation timers so he finishes his follow-through swing while fading out
      if (this.spearSwingTimer > 0) this.spearSwingTimer--;
      if (this.katanaSlashTimer > 0) {
        this.katanaSlashTimer--;
        if (this.katanaSlashTimer <= 0) this.katanaSlashFadeTimer = 10;
      }
      if (this.katanaSlashFadeTimer > 0) this.katanaSlashFadeTimer--;
      
      // Spawn visual Fly Heads periodically
      if (this.ultimateTotalTimer % 4 === 0) {
        spawnSparks(
          this.ultimateTarget.x + (Math.random() - 0.5) * 800,
          this.ultimateTarget.y + (Math.random() - 0.5) * 600,
          1,
          'rgba(30, 30, 30, 0.8)',
          'rgba(0, 0, 0, 0.9)'
        );
      }
      
      if (this.ultimateCycleTimer <= 0) {
        // Prepare flash-step slide-in
        const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]; // E, S, W, N
        const angle = angles[this.ultimateAssaultCount % 4];
        
        // Spawn him further away for a dramatic high-speed slide-in
        const spawnDist = CONFIG.toji?.ultimateSlideDistance ?? 280;
        const clampedSlide = this._clampToArena(
          this.ultimateTarget.x + Math.cos(angle) * spawnDist,
          this.ultimateTarget.y + Math.sin(angle) * spawnDist
        );
        this.x = clampedSlide.x;
        this.y = clampedSlide.y;
        this.aim(this.ultimateTarget);
        
        // Huge velocity towards target to slide in quickly
        const dashSpeed = CONFIG.toji?.ultimateSlideSpeed ?? 40;
        this.vx = -Math.cos(angle) * dashSpeed;
        this.vy = -Math.sin(angle) * dashSpeed;
        
        this.ultimatePhase = 'STRIKING';
        this.ultimateCycleTimer = CONFIG.toji?.ultimateStrikeDuration ?? 22;

        const strikeSound = getSkillEffectSound('toji', 'strike');
        if (strikeSound) {
          audioSystem.playSFX(strikeSound.src, strikeSound.volume);
        } else {
          audioSystem.playSFX('skill_dash5', 1.0);
        }
      }
      return;
    }

    if (this.ultimatePhase === 'STRIKING') {
      this.ultimateCycleTimer--;
      
      // Slide in physics (he slows down as he reaches the target)
      this.x += this.vx;
      this.y += this.vy;
      const clampedStrike = this._clampToArena(this.x, this.y);
      this.x = clampedStrike.x;
      this.y = clampedStrike.y;
      this.vx *= 0.82;
      this.vy *= 0.82;

      if (this.ultimateTarget && !tojiIsTargetDeadOrRemoved(this, this.ultimateTarget)) {
        this.aim(this.ultimateTarget);
      }
      
      // Tick down animation timers so the weapon swing actually animates
      if (this.spearSwingTimer > 0) this.spearSwingTimer--;
      if (this.katanaSlashTimer > 0) {
        this.katanaSlashTimer--;
        if (this.katanaSlashTimer <= 0) this.katanaSlashFadeTimer = 10;
      }
      if (this.katanaSlashFadeTimer > 0) this.katanaSlashFadeTimer--;
      
      // Start attack animation based on configured frame
      const strikeDuration = CONFIG.toji?.ultimateStrikeDuration ?? 22;
      
      // Always trigger the weapon swing animation on the very first frame of the STRIKING phase
      if (this.ultimateCycleTimer === strikeDuration - 1) {
        // Trigger attack animation based on assault count
        if (this.ultimateAssaultCount % 2 === 0) {
           this.phantomStrikeCount = 0; // Forces Katana to be drawn
           this.katanaSlashTimer = 24;
           this.ambushPhase = 'KATANA_SLASH'; // Required to render the purple crescent arc
        } else {
           this.phantomStrikeCount = 1; // Forces Spear to be drawn
           this.spearSwingTimer = 24;
           this.ambushPhase = null;
        }
      }
      
      // The blade actually connects with the target: trigger damage, ricochet knockback, and impact effects
      // Hardcoded to frame 8 for a perfect sync with the visual swing apex
      if (this.ultimateCycleTimer === 8) {
        const colors = ['#A040FF', '#FF2040', '#404040', '#FFD700']; // Purple, Red, Grey, Gold
        const color = colors[this.ultimateAssaultCount % 4];
        
        spawnImpactFlash(this.ultimateTarget.x, this.ultimateTarget.y, 45, color);
        spawnMeleeClashShockwave(this.ultimateTarget.x, this.ultimateTarget.y, 80, 'toji');
        spawnSparks(this.ultimateTarget.x, this.ultimateTarget.y, 16, 'slashRicochet');
        spawnSparks(this.ultimateTarget.x, this.ultimateTarget.y, 12, 'parrySpark');
        audioSystem.playSFX('attack_swordswing', 0.9);
        audioSystem.playSFX('attack_fleshhit', 0.9);
        audioSystem.playSFX('skill_backstab', 0.85);
        audioSystem.playSFX('skill_parry', 0.75);
        triggerGlobalScreenShake(4, 12); // Crisp screen shake on ricochet strike
        
        // 1. Clear hard time-stop stasis so target can physically fly/ricochet across the arena
        this.ultimateTarget.timeStopTimer = 0;
        if (this.ultimateTarget.statusEffects) {
          this.ultimateTarget.statusEffects.timeStopTimer = 0;
          this.ultimateTarget.statusEffects.paralyzeTimer = 0;
        }
        this.ultimateTarget.isTargetOfAmbush = false;
        delete this.ultimateTarget._timeStopFrozenAngle;
        delete this.ultimateTarget._timeStopFrozenGunAngle;

        // 2. Apply Stun Debuff (renders 3D orbiting golden rings/stars visual and disables target actions)
        const stunDur = CONFIG.toji?.ultimateAssaultStunDuration || 35;
        this.ultimateTarget.paralyzeTimer = Math.max(this.ultimateTarget.paralyzeTimer || 0, stunDur);
        this.ultimateTarget.isParalyzed = true;
        if (this.ultimateTarget.statusEffects) {
          this.ultimateTarget.statusEffects.paralyzeTimer = Math.max(this.ultimateTarget.statusEffects.paralyzeTimer || 0, stunDur);
          this.ultimateTarget.statusEffects.isParalyzed = true;
        }

        // 3. Orient target to face attacker
        const targetHitAngle = Math.atan2(this.y - this.ultimateTarget.y, this.x - this.ultimateTarget.x);
        let angleDiff = targetHitAngle - (this.ultimateTarget.gunAngle !== undefined ? this.ultimateTarget.gunAngle : (this.ultimateTarget.angle || 0));
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        const newAngle = (this.ultimateTarget.gunAngle !== undefined ? this.ultimateTarget.gunAngle : (this.ultimateTarget.angle || 0)) + angleDiff * 0.45;
        this.ultimateTarget.gunAngle = newAngle;
        this.ultimateTarget.angle = newAngle;

        // 3. Apply kinetic ricochet knockback launch bouncing target across arena walls
        if (!this.ultimateTarget.isTurret && !this.ultimateTarget.cannotBeKnockbacked) {
          this.ultimateTarget.isFirstHitKnockback = false; // Enable ricochet wall bouncing!
          const angleToTarget = Math.atan2(this.ultimateTarget.y - this.y, this.ultimateTarget.x - this.x);
          const kbForce = CONFIG.toji?.ultimateAssaultRicochetForce || 28;
          const kbVx = Math.cos(angleToTarget) * kbForce;
          const kbVy = Math.sin(angleToTarget) * kbForce;

          this.ultimateTarget.knockbackVx = kbVx;
          this.ultimateTarget.knockbackVy = kbVy;
          this.ultimateTarget.vx = kbVx;
          this.ultimateTarget.vy = kbVy;
          this.ultimateTarget.knockbackDecay = 0.92; // Silky smooth kinetic glide/ricochet
          if (typeof this.ultimateTarget.applyKnockback === 'function') {
            this.ultimateTarget.applyKnockback(kbVx, kbVy);
          }
        }

        // 4. Interrupt active attacks without stopping target movement/ricochet
        if (typeof this.ultimateTarget.interruptAttacks === 'function') {
          this.ultimateTarget.interruptAttacks(true);
        }
        
        applyDamageToTarget(this.ultimateTarget, CONFIG.toji?.ultimateAssaultDamage || 80, this, {
          isMelee: true,
          isTrueDamage: true,
          bypassShield: true,
          isTojiUltimateAssault: true,
          isIsoh: true
        });
        
        this.ultimateAssaultCount++;
      }
      
      if (this.ultimateCycleTimer <= 0) {
        // Spawn smoke to cover his escape
        for (let i = 0; i < 4; i++) {
           const s = spawnArcaneSmoke(this.x + (Math.random() - 0.5) * 40, this.y + (Math.random() - 0.5) * 40, 0, 0, 'burst');
           if (s) {
             s.color = 'rgba(15, 15, 15, 0.8)';
             s.size = 35 + Math.random() * 20;
             s.targetSize = s.size + 20 + Math.random() * 20;
           }
        }
        
        // Stop all movement so he perfectly fades out while masked by the smoke
        this.vx = 0;
        this.vy = 0;
        
        const vanishSound = getSkillEffectSound('toji', 'vanish');
        const vanVol = vanishSound?.volume ?? CONFIG.toji?.soundVolumes?.vanish ?? 5.0;
        if (vanishSound) audioSystem.playSFX(vanishSound.src || CONFIG.toji?.sounds?.vanish || 'Assets/Sound Effects/Skills/woosh.mp3', vanVol);
        
        this.ultimatePhase = 'VANISHED';
        this.ultimateCycleTimer = CONFIG.toji?.ultimateVanishDuration ?? 120;
      }
      return;
    }

    // Phase 3: Crater Slam (Final Finisher)
    if (this.ultimatePhase === 'CRATER') {
      if (this.ambushTimer > 0) this.ambushTimer--; // Tick the native charge animation down
      
      const diveTime = CONFIG.toji?.ultimateCraterDiveTime ?? 16;
      const spinTime = CONFIG.toji?.ultimateCraterSpinTime ?? 14;
      const diveAndSpinTotal = diveTime + spinTime;
      
      if (this.ultimateCycleTimer > diveAndSpinTotal) {
        this.ultimateCycleTimer--;
        
        // Hold position at distant vantage point during charge phase
        const slideTX = this._ultimateSlideTargetX !== undefined ? this._ultimateSlideTargetX : (this.ultimateTarget ? this.ultimateTarget.x - 220 : this.x);
        const slideTY = this._ultimateSlideTargetY !== undefined ? this._ultimateSlideTargetY : (this.ultimateTarget ? this.ultimateTarget.y - 180 : this.y);
        this.x += (slideTX - this.x) * 0.15;
        this.y += (slideTY - this.y) * 0.15;
        
        this.vx = 0;
        this.vy = 0;
        
        // Subtle micro camera shake while charging power (gentle 1.8px rumble)
        if (this.ultimateCycleTimer % 5 === 0) {
          triggerGlobalScreenShake(1.8, 3);
        }
        
        // Spawn swirling wind debris (leaves & pebbles) spiraling around Toji during charge
        if (this.ultimateCycleTimer % 2 === 0) {
          spawnTojiWhirlingWindDebris(this.x, this.y, 2);
        }
        
        // Slow rotation on body tracking during ultimate charging phase
        const targetAngle = Math.atan2(this.ultimateTarget ? this.ultimateTarget.y - this.y : 0, this.ultimateTarget ? this.ultimateTarget.x - this.x : 1);
        const currentAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
        let diff = targetAngle - currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const turnRate = 0.035; // Sluggish slow tracking
        this.gunAngle = currentAngle + diff * turnRate;
        this.angle = this.gunAngle;
      } else if (this.ultimateCycleTimer === diveAndSpinTotal) {
        this.ultimateCycleTimer--;
        
        // Launch! Rocket straight to the target in diveTime frames
        const rawTargetX = this.ultimateTarget ? this.ultimateTarget.x : this.x;
        const rawTargetY = this.ultimateTarget ? this.ultimateTarget.y : this.y;
        const clampedTarget = this._clampToArena(rawTargetX, rawTargetY);
        const dx = clampedTarget.x - this.x;
        const dy = clampedTarget.y - this.y;
        this.vx = dx / diveTime;
        this.vy = dy / diveTime;

        // Step first frame of supersonic translation
        this.x += this.vx;
        this.y += this.vy;
        const clampedDive = this._clampToArena(this.x, this.y);
        this.x = clampedDive.x;
        this.y = clampedDive.y;

        // Facing direction points directly along the supersonic dive trajectory
        const diveAngle = Math.atan2(dy, dx);
        this.gunAngle = diveAngle;
        this.angle = diveAngle;
        this.isSpinning = false; // MUST NOT ROTATE TO 360 UNTIL HE REACHES ENEMY!

        // Keep Katana held ready in charge stance
        this.ambushPhase = 'KATANA_CHARGE';
        this.katanaSlashTimer = 0;

        // --- GROUND SHOCKWAVE BENEATH HIS LAUNCH POSITION ---
        triggerGlobalScreenShake(5, 10);
        
        const arenaBaseY = (CONFIG.arena?.y || 0) + (CONFIG.arena?.height || 600) - 30;
        const groundY = Math.min(arenaBaseY, Math.max(this.y + 100, this.ultimateTarget ? this.ultimateTarget.y : arenaBaseY));
        spawnImpactFlash(this.x, groundY, 75, 'rgba(255, 255, 255, 0.95)');
        audioSystem.playSFX('attack_swordswing', 0.9);
      } else if (this.ultimateCycleTimer > spinTime) {
        this.ultimateCycleTimer--;
        
        // Dive physics — straight supersonic dash toward target
        this.x += this.vx;
        this.y += this.vy;
        const clampedDive = this._clampToArena(this.x, this.y);
        this.x = clampedDive.x;
        this.y = clampedDive.y;

        // Face straight toward the target / dive direction — absolutely NO 360 rotation yet!
        const diveAngle = (this.vx !== 0 || this.vy !== 0) ? Math.atan2(this.vy, this.vx) : (this.gunAngle !== undefined ? this.gunAngle : 0);
        this.gunAngle = diveAngle;
        this.angle = diveAngle;
        this.isSpinning = false; // NOT SPINNING DURING FLIGHT!

        // Sleek shadow afterimages stream behind him as he rockets toward target
        if (!this.stealthAfterimages) this.stealthAfterimages = [];
        pushTrailCap(this.stealthAfterimages, {
          x: this.x,
          y: this.y,
          gunAngle: this.gunAngle,
          maxTimer: 14,
          timer: 14,
          initialAlpha: 0.65,
          isDomainAfterimage: true
        }, 6);
      } else if (this.ultimateCycleTimer === spinTime) {
        this.ultimateCycleTimer--;
        
        // ARRIVED AT THE ENEMY!
        if (this.ultimateTarget) {
          const clampedTarget = this._clampToArena(this.ultimateTarget.x, this.ultimateTarget.y);
          this.x = clampedTarget.x;
          this.y = clampedTarget.y;
        }
        this.vx = 0;
        this.vy = 0;

        // NOW TRIGGER THE 360 ROTATIONAL FINAL BLOW AT THE ENEMY!
        this.isSpinning = true;
        this.ambushPhase = 'KATANA_SLASH';
        this.katanaSlashTimer = spinTime;
        this._katanaMax = spinTime;
        this._diveStartAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

        // Final blow audio triggers right here as the 360 spin begins!
        const finalBlowSound = getSkillEffectSound('toji', 'ultimatefinalblow');
        const fbVol = finalBlowSound?.volume ?? CONFIG.toji?.soundVolumes?.ultimateFinalBlow ?? 4.5;
        const fbSpeed = finalBlowSound?.speed ?? 1.0;
        const fbDelay = finalBlowSound?.delay ?? CONFIG.toji?.soundDelays?.ultimateFinalBlow ?? 0;
        audioSystem.playSFX(finalBlowSound?.src || CONFIG.toji?.sounds?.ultimateFinalBlow || 'Assets/Sound Effects/Skills/toji-ultimate-finalblow.mp3', fbVol, fbSpeed, 0, fbDelay);
        audioSystem.playSFX('attack_swordswing', 1.25);
      } else if (this.ultimateCycleTimer > 0) {
        this.ultimateCycleTimer--;
        
        // 360 Spin Final Blow Execution — rotating around the enemy in place
        this.vx = 0;
        this.vy = 0;
        if (this.katanaSlashTimer > 0) this.katanaSlashTimer--;

        // 360 degree clockwise spin around the enemy!
        const spinProgress = 1 - (this.ultimateCycleTimer / spinTime);
        this.angle = this._diveStartAngle + (Math.PI * 2 * spinProgress);
        this.gunAngle = this.angle;
        this.isSpinning = true;

        if (this.ultimateCycleTimer % 3 === 0) {
          triggerGlobalScreenShake(3, 4);
          spawnSparks(this.x, this.y, 6, 'crimsonSniper');
        }
      } else {
        // Impact — he's already at the target from the smooth dive
        triggerGlobalScreenShake(12, 40);
        spawnImpactFlash(this.x, this.y, 140, 'rgba(255, 30, 75, 0.95)');
        spawnCrimsonLightningImpact(this.x, this.y, 160);
        spawnSparks(this.x, this.y, 50, 'crimsonSniper');
        audioSystem.playSFX('attack_groundsmash', 1.2);
        
        // Multi-target Frontal Arc AOE on 360 Spin Dive Final Blow (Rule 7 & Rule 6 compliant)
        const impactAngle = (this.ultimateTarget && this.ultimateTarget.hp > 0)
          ? Math.atan2(this.ultimateTarget.y - this.y, this.ultimateTarget.x - this.x)
          : (this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0));
        const finalReach = CONFIG.toji?.ultimateCraterReach || CONFIG.toji?.ultimateCraterRadius || 185;
        const finalArc = CONFIG.toji?.ultimateCraterArc || (Math.PI * 1.35); // 243° wide frontal sweeping cone
        const finalTargets = tojiGetTargetsInFrontalArc(this, this.ultimateTarget, impactAngle, finalReach, finalArc);
        const craterDamage = CONFIG.toji?.ultimateCraterDamage || 65;

        for (const hitTarget of finalTargets) {
          if (!hitTarget || hitTarget.hp <= 0) continue;
          
          applyDamageToTarget(hitTarget, craterDamage, this, {
            isMelee: true,
            isTrueDamage: true,
            bypassShield: true,
            isTojiUltimateAssault: true,
            isTojiUltimateFinalBlow: true,
            isIsoh: true
          });
          
          const hitAngle = Math.atan2(hitTarget.y - this.y, hitTarget.x - this.x);
          spawnBloodEffect(hitTarget.x, hitTarget.y, 25, '#B30000', hitAngle);
          spawnSparks(hitTarget.x, hitTarget.y, 20, 'crimsonSniper');

          // 1. Clear hard time-stop stasis so target can physically fly/ricochet across arena
          hitTarget.timeStopTimer = 0;
          if (hitTarget.statusEffects) {
            hitTarget.statusEffects.timeStopTimer = 0;
            hitTarget.statusEffects.paralyzeTimer = 0;
          }
          hitTarget.isTargetOfAmbush = false;
          delete hitTarget._timeStopFrozenAngle;
          delete hitTarget._timeStopFrozenGunAngle;

          // 2. Apply Stun Debuff (renders 3D orbiting golden rings/stars visual and disables target actions)
          const craterStunDur = 45;
          hitTarget.paralyzeTimer = Math.max(hitTarget.paralyzeTimer || 0, craterStunDur);
          hitTarget.isParalyzed = true;
          if (hitTarget.statusEffects) {
            hitTarget.statusEffects.paralyzeTimer = Math.max(hitTarget.statusEffects.paralyzeTimer || 0, craterStunDur);
            hitTarget.statusEffects.isParalyzed = true;
          }

          // 3. Keep target facing direction oriented toward crater impact center
          const targetHitAngle = Math.atan2(this.y - hitTarget.y, this.x - hitTarget.x);
          let angleDiff = targetHitAngle - (hitTarget.gunAngle !== undefined ? hitTarget.gunAngle : (hitTarget.angle || 0));
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          const newAngle = (hitTarget.gunAngle !== undefined ? hitTarget.gunAngle : (hitTarget.angle || 0)) + angleDiff * 0.45;
          hitTarget.gunAngle = newAngle;
          hitTarget.angle = newAngle;

          // 4. Apply massive kinetic ricochet knockback launch
          if (!hitTarget.isTurret && !hitTarget.cannotBeKnockbacked) {
            hitTarget.isFirstHitKnockback = false; // Enable ricochet wall bouncing!
            const kbForce = (CONFIG.toji?.ambushKnockbackForce || 48) * 1.1; // 53px/frame explosive velocity!
            const kbVx = Math.cos(hitAngle) * kbForce;
            const kbVy = Math.sin(hitAngle) * kbForce;
            hitTarget.knockbackVx = kbVx;
            hitTarget.knockbackVy = kbVy;
            hitTarget.vx = kbVx;
            hitTarget.vy = kbVy;
            hitTarget.knockbackDecay = 0.90; // Smooth kinetic deceleration
            if (typeof hitTarget.applyKnockback === 'function') {
              hitTarget.applyKnockback(kbVx, kbVy);
            }
          }
        }
        
        // ALWAYS cleanup ultimate state, even if target was killed!
        this.ultimateActive = false;
        this.ultimateCooldown = this.ultimateCooldownMax || CONFIG.toji?.ultimateCooldown || 2500;
        this.ultimateChargeTimer = 0;
        this.isSpinning = false;
        this._diveStartAngle = undefined;
        this._diveChargeBaseAngle = undefined;
        this._lastKatanaRenderAngle = undefined;
        this._ultimateSlideStartX = undefined;
        this._ultimateSlideStartY = undefined;
        this._ultimateSlideTargetX = undefined;
        this._ultimateSlideTargetY = undefined;
        this._ultimateChargeFlipSign = undefined;
        this._ultimateChargeAngle = undefined;
        this.isChannelingDomain = false;
        this.ultimatePhase = null;
        this.ultimateTarget = null;
        this.ambushPhase = null;
        this.isAmbushing = false;
        this.spearSwingTimer = 0;
        this.katanaSlashTimer = 0;
        this.katanaSlashFadeTimer = 0;
        this._hasAttemptedChannelInterrupt = false;
        this._channelInterruptCooldown = 0;
        this.phantomStrikeCount = 0;
        this.postUltimateRecoveryTimer = 0; // Immediate instant movement recovery!

        this.vx = 0;
        this.vy = 0;
        this.stealthTimer = 0;
        this.stealthCooldown = CONFIG.toji?.stealthCooldown || 600;
        this.isStealthed = false;
        this.stealthActive = false;

        // Ensure all fighters (especially Gojo) have their Infinity, freeze states, and aim cleanly restored!
        if (typeof state !== 'undefined') {
          if (state.fighters) {
            state.fighters.forEach(f => {
              if (!f) return;
              if (f !== this) {
                this._clearTargetFreeze(f);
                delete f._timeStopFrozenAngle;
                delete f._timeStopFrozenGunAngle;
                f.isTargetOfAmbush = false;
                if (typeof f.aim === 'function' && !f.dead && f.hp > 0) {
                  f.aim(this);
                }
              }
              if (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') {
                f.isMeleeMode = false;
                f.infinityActive = true;
                f.infinityCooldown = 0;
                f.infinityFadeOpacity = 1.0;
              }
            });
          }
          if (state.illusions) {
            state.illusions.forEach(ill => {
              if (ill) {
                this._clearTargetFreeze(ill);
                delete ill._timeStopFrozenAngle;
                delete ill._timeStopFrozenGunAngle;
                ill.isTargetOfAmbush = false;
              }
            });
          }
        }
      }
      return;
    }
  }

  _updateAfterImages() {
    if (this._isFrozenOrPaused()) {
      if (this.stealthAfterimages) this.stealthAfterimages.length = 0;
      if (this.afterImages) this.afterImages.length = 0;
      return;
    }
    if (!this.stealthAfterimages || this.stealthAfterimages.length === 0) return;
    fastCleanArray(this.stealthAfterimages, (img) => {
      if (!img) return false;
      img.timer--;
      const maxT = img.maxTimer || 12;
      const progress = Math.max(0, Math.min(1, img.timer / maxT));
      img.alpha = (img.initialAlpha || 0.55) * Math.pow(progress, 0.7);
      return img.timer > 0;
    });
  }

  get stealthAfterimages() {
    return this.afterImages;
  }

  set stealthAfterimages(val) {
    this.afterImages = val;
  }

  _isFrozenOrPaused() {
    if (this.ultimateActive) return false;
    return this.areAttackEffectsSuppressed() || Boolean(
      (this.statusEffects && this.statusEffects.timeStopTimer > 0) ||
      (this.mahoragaAdaptationFreezeTimer && this.mahoragaAdaptationFreezeTimer > 0) ||
      this.frozenByCronos ||
      this.isCronosStasis ||
      this.caughtInGenosFlurry ||
      this.caughtInJohnWickCombo ||
      this.caughtInPureLoveBeam ||
      (this.pureLoveBeamTimer && this.pureLoveBeamTimer > 0) ||
      (this.stunTimer && this.stunTimer > 0) ||
      (this.knockbackStunTimer && this.knockbackStunTimer > 0) ||
      this.isParalyzedByMahoraga ||
      this.isParalyzedByMahito ||
      this.isCaughtInPurple ||
      (this.purpleHitTimer && this.purpleHitTimer > 0)
    );
  }

  /**
   * Main update loop for Toji's mechanics.
   */
  update(opponent, ownerIndex, arena) {
    // 0. Ultimate Super Armor & Complete Freeze/Stasis Immunity:
    // When performing Curse Inventory - Full Arsenal Unleashed ultimate, Toji is completely immune
    // to all freeze attacks, stuns, paralyze effects, domain locks, or status interruptions.
    if (this.ultimateActive) {
      if (this.hitFlashTimer > 0) this.hitFlashTimer--;
      this.hitFlashTimer = 0; // Completely suppress white hit flash while in ultimate
      this.mahoragaAdaptationFreezeTimer = 0;
      this.isTargetOfAmbush = false;
      this.caughtInGenosFlurry = false;
      this.caughtInJohnWickCombo = false;
      this.timeStopTimer = 0;
      if (this.statusEffects) this.statusEffects.timeStopTimer = 0;
      this.paralyzeTimer = 0;
      this.isParalyzed = false;
      this.isParalyzedByMahito = false;
      this.isParalyzedByMahoraga = false;
      this.electricStunTimer = 0;
      this.hitStunTimer = 0;
      this.stunTimer = 0;
      this.knockbackStunTimer = 0;
      this.dubstepStunTimer = 0;
      this.ratioHitPauseTimer = 0;
      this.isFrozen = false;
      this.isFrozenByInfinity = false;
      this.frozenByCronos = false;
      this.isCronosStasis = false;
      this.isCaughtInPurple = false;
      this.purpleHitTimer = 0;
      this.isWallPinned = false;
      this.pureLoveBeamRecoveryTimer = 0;
      this.caughtInPureLoveBeam = false;
      this.pureLoveBeamTimer = 0;
      this._suppressFreezeTimer = 0;
      this.redKnockbackTimer = 0;
      this.redSlowTimer = 0;
      this.slowTimer = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;

      // Motion trail afterimages during ultimate
      this._updateAfterImages();
      this.updateUltimate(arena, ownerIndex);
      return;
    }

    // 1. Check Mahoraga Divine Adaptation Freeze first (bypasses Heavenly Restriction immunity)
    if (this.mahoragaAdaptationFreezeTimer > 0) {
      this.mahoragaAdaptationFreezeTimer--;
      this.vx = 0;
      this.vy = 0;
      this.interruptAttacks();
      return;
    }

    // 2. Top-of-loop Freeze / Status Effect Guard (Rule 1 Compliant: decrements timers & returns if frozen/paralyzed)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.caughtInGenosFlurry || this.caughtInJohnWickCombo || this.isTargetOfAmbush || this.isCaughtInPurple || (this.purpleHitTimer && this.purpleHitTimer > 0)) {
      this.vx = 0;
      this.vy = 0;
      this.interruptAttacks();
      return;
    }

    // Gojo Reversal Red Spatial Repulsion Knockback (bypasses Heavenly Restriction immunity!)
    if ((this.redKnockbackTimer || 0) > 0) {
      this.redKnockbackTimer--;
      this.isAmbushing = false;
      this.ambushTarget = null;
      this.ambushPhase = null;
      
      this.vx = this.redKnockbackVx || 0;
      this.vy = this.redKnockbackVy || 0;
      
      this.x += this.vx;
      this.y += this.vy;
      
      this.redKnockbackVx *= 0.90; // smooth decay
      this.redKnockbackVy *= 0.90;
      
      this.resolveWallBounce(arena, opponent);
      
      // If wall bounce inverted vx/vy, keep redKnockback aligned
      this.redKnockbackVx = this.vx;
      this.redKnockbackVy = this.vy;
      
      if (opponent && opponent.hp > 0) this.aim(opponent);
      
      // Update afterimages so he gets motion trails during the slide
      this._updateAfterImages();
      return;
    }

    // Heavenly Restriction: Toji passively purges standard slow effects, EXCEPT Gojo's Reversal Red, Hollow Purple, Limitless Infinity barrier slow, and Mahoraga's Divine Shout!
    if ((this.redSlowTimer || 0) > 0) {
      this.redSlowTimer--;
      this.slowTimer = Math.max(this.slowTimer || 0, 2);
    } else if ((this.mahoragaShoutSlowTimer || 0) > 0) {
      this.mahoragaShoutSlowTimer--;
      this.slowTimer = Math.max(this.slowTimer || 0, 2);
    } else if (this.isCaughtInPurple || (this.purpleHitTimer && this.purpleHitTimer > 0)) {
      this.slowTimer = Math.max(this.slowTimer || 0, 2);
      this.slowMultiplier = 0.40;
    } else if (this.slowTimer > 0) {
      this.slowTimer--;
    } else {
      this.slowTimer = 0;
    }

    // Update movement speed dynamically based on stealth state
    const baseTojiSpeed = this.baseSpeed * (MODE_SPEED_MULTIPLIER[state.mode] || 1.0);
    if (this.isStealthed) {
      const stealthSpeedMult = CONFIG.toji?.stealthSpeedMultiplier || 1.3;
      this.speed = baseTojiSpeed * stealthSpeedMult;
    } else {
      this.speed = baseTojiSpeed;
    }

    // Update motion trail afterimages during all states (including Ultimate and Ambushes)
    this._updateAfterImages();

    // 1. Handle base cooldowns and debuffs
    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

    // Reset standard timers purged by Heavenly Restriction (when not in specific flurries/combos/Purple)
    if (!this.isCaughtInPurple && (!this.purpleHitTimer || this.purpleHitTimer <= 0)) {
      this.timeStopTimer = 0;
      if (this.statusEffects) this.statusEffects.timeStopTimer = 0;
      this.hitStunTimer = 0;
      this.knockbackStunTimer = 0;
      this.electricStunTimer = 0;
      this.dubstepStunTimer = 0;
      this.crimsonElectrifiedTimer = 0;
      this._suppressFreezeTimer = 0;
    }

    // Tick timers
    if (this.spearCooldown > 0) this.spearCooldown--;
    if (this.spearSwingTimer > 0) this.spearSwingTimer--;
    if (this.phantomSlashTimer > 0) this.phantomSlashTimer--;
    if (this.ultimateCooldown > 0) this.ultimateCooldown--;
    if (this._parryAmbushCooldown > 0) this._parryAmbushCooldown--;
    if (this.katanaSlashTimer > 0) {
      this.katanaSlashTimer--;
      if (this.katanaSlashTimer <= 0) {
        this.katanaSlashTimer = 0;
        this.katanaSlashFadeTimer = 12;
      }
    } else if (this.katanaSlashFadeTimer > 0) {
      this.katanaSlashFadeTimer--;
    }

    // Auto-trigger ultimate when ready (AI logic)
    const isEnemyDomainActive = state.fighters && state.fighters.some(f => f && f !== this && f.hp > 0 && (f.domainActive || f.isChannelingDomainExpansion || f.isChannelingDomain));
    if (this.ultimateCooldown <= 0 && !this.ultimateActive && !this.isAmbushing && opponent && !tojiIsTargetDeadOrRemoved(this, opponent) && (this.forcedMeleeTimer || 0) <= 0 && !isEnemyDomainActive) {
      this.triggerUltimate();
      return;
    }

    // Handle active ambush sequence
    if (this.isAmbushing) {
      const target = this.ambushTarget || opponent;
      this.updateAmbushSequence(target, ownerIndex);
      return;
    }

    // --- HEAVENLY RESTRICTION SENSE: SKIPPED IN DEMO PREVIEW MODE ---
    if (!this.isDemoFighter && modUpdateChannelSense(this, opponent)) return;

    if (this.postUltimateRecoveryTimer > 0) this.postUltimateRecoveryTimer--;

    // Handle Stealth Duration & Cooldown Timers (SKIPPED IN DEMO PREVIEW MODE)
    if (!this.isDemoFighter && modUpdateStealth(this, opponent)) return;

    // Standard natural movement & arena wall bounce physics (identical to all standard fighters)
    const speedMult = this.isStealthed ? (CONFIG.toji?.stealthSpeedMultiplier || 1.30) : 1.0;
    this.applyMovementPhysics(speedMult);
    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);

    // Inverted Spear of Heaven Melee Strike Logic
    if (this.isCaughtInBeam()) {
      this.spearSwingTimer = 0;
      this.katanaSlashTimer = 0;
    } else if (!tojiIsTargetDeadOrRemoved(this, opponent)) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const dist = Math.hypot(dx, dy);
      const attackReach = this.r + opponent.r + this.spearRange;

      if (dist <= attackReach && this.spearCooldown <= 0) {
        this.performInvertedSpearStrike(opponent, ownerIndex);
      }
    }
  }

  /**
   * Simulates smooth hanging gravity physics for the chain attached to the weapon ring.
   */
  _updateChainPhysics() {
    return modUpdateChain(this);
  }

  /**
   * Universal Aiming Capability Check.
   * Toji must ALWAYS aim at his ambush target throughout ambush phases (Rule 3).
   */
  canAim() {
    if (this.hp <= 0 || this.isDead) return false;
    if (this.isTargetOfAmbush || (this.timeStopTimer > 0)) return false;
    const isHardCC = (this.paralyzeTimer && this.paralyzeTimer > 0) ||
                     (this.statusEffects && this.statusEffects.paralyzeTimer && this.statusEffects.paralyzeTimer > 0) ||
                     (this.electricStunTimer && this.electricStunTimer > 0) ||
                     (this.dubstepStunTimer && this.dubstepStunTimer > 0) ||
                     (typeof this.isCaughtInBeam === 'function' && this.isCaughtInBeam());
    if (isHardCC) return false;
    if (this.isAmbushing) return true; // Rule 3: Toji ALWAYS aims strictly at his ambush target throughout ambush phases!
    return true;
  }

  /**
   * Extends master target validation with Toji-specific removed/died entity guards.
   */
  isValidAimTarget(target) {
    if (!super.isValidAimTarget(target)) return false;
    if (tojiIsTargetDeadOrRemoved(this, target)) return false;
    return true;
  }

  /**
   * Spawns a multi-afterimage trail along a launch/teleport path with expanding ground shockwaves!
   */
  _spawnTeleportAfterimages(fromX, fromY, toX, toY, startAngle, endAngle) {
    modSpawnTeleportAfterimages(this, fromX, fromY, toX, toY, startAngle, endAngle);
  }

  /** Clamps coordinates strictly inside the arena bounds to prevent teleporting outside arena walls */
  _clampToArena(x, y, r = this.r) {
    const arena = CONFIG.arena;
    if (!arena) return { x, y };
    const margin = r + 6;
    return {
      x: Math.max(arena.x + margin, Math.min(arena.x + arena.width - margin, x)),
      y: Math.max(arena.y + margin, Math.min(arena.y + arena.height - margin, y))
    };
  }

  /**
   * Initiates the 1st Sequence Stealth Ambush Combo.
   * @param {Object} opponent 
   * @param {Boolean} isInterrupt - Whether this ambush was triggered by interrupting a skill
   */
  startAmbushSequence(opponent, isInterrupt = false) {
    modStartAmbushSequence(this, opponent, isInterrupt);
  }

  /**
   * Handles the timing transitions for the ambush sequence:
   * Front pause -> Teleport to enemy back -> Stab attack & re-enter stealth!
   */
  updateAmbushSequence(opponent, ownerIndex) {
    modUpdateAmbushSequence(this, opponent, ownerIndex);
  }

  /**
   * Completely clears any freeze/time-stop state from the target so physics knockback can propel them.
   */
  _clearTargetFreeze(target) {
    if (!target) return;
    target.isTargetOfAmbush = false;
    target.timeStopTimer = 0;
    target.paralyzeTimer = 0;
    target.hitStunTimer = 0;
    target.isParalyzed = false;
    target.isParalyzedByMahoraga = false;
    if (target.statusEffects) {
      target.statusEffects.timeStopTimer = 0;
      target.statusEffects.paralyzeTimer = 0;
      target.statusEffects.isParalyzed = false;
    }
    delete target._timeStopOriginalDuration;
    delete target._timeStopStartTime;
    delete target._timeStopFrozenAngle;
    delete target._timeStopFrozenGunAngle;
    delete target._suppressFreezeTimer;
    if (typeof target.frozenTimer === 'number') target.frozenTimer = 0;
    if (typeof target.electricStunTimer === 'number') target.electricStunTimer = 0;
  }

  /**
   * Executes Skill 2: Split Soul Katana Soul Slash.
   * Inflicts True Damage, Soul Wound anti-heal debuff, and a 2nd massive knockback!
   */
  performSplitSoulKatanaSlash(target, ownerIndex) {
    return modKatanaSlash(this, target, ownerIndex);
  }

  performInvertedSpearStrike(target, ownerIndex, isAmbushThrust = false) {
    return modSpearStrike(this, target, ownerIndex, isAmbushThrust);
  }

  /**
   * Override base gun rendering to prevent drawing the default gray gun.
   */
  drawGun(ctx) {
    // Intentionally empty: Toji uses custom cursed tools (Inverted Spear & Split Soul Katana)
  }

  /**
   * Custom drawing logic for Toji (Low Assassin Guard Stance & High-Speed Multi-Phase Attack).
   */
  draw(ctx) {
    ctx.save();

    // Performance: cache expensive lookups once per frame
    const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
    const now = Date.now();

    // Keep chain physics updated during every render frame (including countdown / pause)
    this._updateChainPhysics();

    // Render Channel Sense Interrupt Indicator above Toji's head when triggered!
    if (this.channelSenseIndicatorTimer > 0) {
      this.channelSenseIndicatorTimer--;
      // Skip decorative indicator in low quality mode
      if (!isLowQuality) {
        const alpha = Math.min(1.0, this.channelSenseIndicatorTimer / 10);
        ctx.save();

        // Sharp Anime Eye Glint Spark / Lock-on Star above head
        const headX = this.x;
        const headY = this.y - this.r - 28;

        // Outer Crimson Pulse Circle
        ctx.beginPath();
        ctx.arc(headX, headY, 12 + (35 - this.channelSenseIndicatorTimer) * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 20, 100, ${alpha * 0.8})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner Bright Gold Star / Eye Glint
        ctx.beginPath();
        ctx.arc(headX, headY, 7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 0, 60, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Crosshair Glint Spikes
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 2;
        const glintLen = 16;
        ctx.beginPath();
        ctx.moveTo(headX - glintLen, headY); ctx.lineTo(headX + glintLen, headY);
        ctx.moveTo(headX, headY - glintLen); ctx.lineTo(headX, headY + glintLen);
        ctx.stroke();

        ctx.restore();
      }
    }

    // --- DOMAIN EXPANSION STYLE CHANNELING VISUALS (Floating Text, Isometric Ground Ring, Backlight Aura) ---
    if ((this.ultimatePhase === 'CHANNELING' || (this.isChannelingDomain && !this.ultimateActive)) && (this.timeStopTimer || 0) <= 0) {
      const progress = Math.min(1.0, (this.ultimateChargeTimer || 0) / Math.max(1, this.ultimateChargeMax || 90));

      ctx.save();
      ctx.translate(this.x, this.y);

      // 2. Isometric Ground Summoning Ring
      ctx.save();
      ctx.scale(1, 0.4); // Isometric perspective
      const ringRadius = 160 * progress;

      // Outer glowing neon purple ring
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = `rgba(160, 64, 255, ${progress})`;
      ctx.stroke();

      // Inner rotating dashed dark violet ring (skip in low quality)
      if (!isLowQuality) {
        ctx.rotate(now / 300);
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius * 0.85, 0, Math.PI * 2);
        ctx.setLineDash([15, 15]);
        ctx.lineWidth = 4;
        ctx.strokeStyle = `rgba(75, 0, 130, ${progress * 1.2})`;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      // 3. Dark Shadow Purple Cursed Energy Backlight Bloom (flat fills instead of gradient for perf)
      if (!isLowQuality) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const glowRadius = this.r + 90 + Math.sin(now * 0.005) * 8;
        // Concentric flat fills simulate the gradient without allocating a gradient object
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(75, 0, 130, ${0.12 * progress})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160, 64, 255, ${0.25 * progress})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 80, 255, ${0.20 * progress})`;
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }

    const baseAngle = this.gunAngle !== undefined ? this.gunAngle : this.angle;
    const isAttacking = this.spearSwingTimer > 0;
    
    // Compute facing flip sign: when Toji faces left, drawSplitSoulKatana internally applies
    // ctx.scale(1,-1) to mirror the blade. The offsetAngle sweep must be negated to match.
    const _normBaseAngle = Math.atan2(Math.sin(baseAngle), Math.cos(baseAngle));
    const diveTime = CONFIG.toji?.ultimateCraterDiveTime ?? 16;
    const spinTime = CONFIG.toji?.ultimateCraterSpinTime ?? 14;
    const isSpinningFinalBlow = this.ultimateActive && this.ultimatePhase === 'CRATER' && (this.ultimateCycleTimer || 0) <= spinTime;
    const isCraterDive = this.ultimateActive && this.ultimatePhase === 'CRATER' && (this.ultimateCycleTimer || 0) > spinTime && (this.ultimateCycleTimer || 0) <= (diveTime + spinTime);
    const isCraterCharge = this.ultimateActive && (this.ultimatePhase === 'CRATER_FADEIN' || (this.ultimatePhase === 'CRATER' && (this.ultimateCycleTimer || 0) > (diveTime + spinTime)));
    
    const _katanaFlipSign = isSpinningFinalBlow 
      ? 1 
      : (Math.abs(_normBaseAngle) > Math.PI / 2 ? -1 : 1);

    let offsetAngle = 0.42 * _katanaFlipSign; // Lore low assassin side guard stance (mirrored when facing left)
    let thrustDistance = 0;
    let slashArcAlpha = 0;
    let attackPhaseProgress = 0;
    this._activeSlashProgress = 0; // Initialize active slash progress to 0
    this._recoveryProgress = 0;    // Initialize recovery progress to 0

    if (this.ultimateActive && this.ultimatePhase === 'CHANNELING') {
      const chargeRatio = Math.min(1.0, this.ultimateChargeTimer / (this.ultimateChargeMax || 90));
      const easeCurve = Math.sin(chargeRatio * Math.PI * 0.5);
      thrustDistance = -24 * easeCurve;
      // Coil the Inverted Spear back from idle (0.42) to deep charge stance (-1.15 rad, rotating it back by ~90 degrees)
      offsetAngle = (0.42 + (-1.15 - 0.42) * easeCurve) * _katanaFlipSign;

      // Weapon vibration tremor as energy builds up
      const tremorVal = (Math.random() - 0.5) * 1.5 * chargeRatio;
      thrustDistance += tremorVal;
      offsetAngle += (Math.random() - 0.5) * 0.025 * chargeRatio;

      // Render Charging Energy Flare at spear tip held at shoulder
      ctx.save();
      const renderAngle = baseAngle + offsetAngle;
      const tipX = this.x + Math.cos(renderAngle) * (this.r + 26 + thrustDistance);
      const tipY = this.y + Math.sin(renderAngle) * (this.r + 26 + thrustDistance);

      // A. Charging Energy Flare Outer Ring
      ctx.beginPath();
      ctx.arc(tipX, tipY, 12 + chargeRatio * 22, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(220, 30, 255, ${0.45 + chargeRatio * 0.45})`;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // B. Hyper-Bright Inner Core
      ctx.beginPath();
      ctx.arc(tipX, tipY, 5 + chargeRatio * 9, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + chargeRatio * 0.3})`;
      ctx.fill();

      // C. Radiating Energy Spikes / Rays
      if (!isLowQuality) {
        const rayCount = 8;
        ctx.strokeStyle = `rgba(180, 50, 255, ${0.5 + chargeRatio * 0.5})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let r = 0; r < rayCount; r++) {
          const rayAngle = (r / rayCount) * Math.PI * 2 + (now / 75);
          const r1 = 6;
          const r2 = 18 + chargeRatio * 20;
          ctx.moveTo(tipX + Math.cos(rayAngle) * r1, tipY + Math.sin(rayAngle) * r1);
          ctx.lineTo(tipX + Math.cos(rayAngle) * r2, tipY + Math.sin(rayAngle) * r2);
        }
        ctx.stroke();
      }
      ctx.restore();
    } else if (this.isAmbushing && (this.ambushPhase === 'BACK_CHARGE' || this.ambushPhase === 'FRONT_LAUNCH')) {
      const maxPause = CONFIG.toji?.ambushBackChargeDuration || 25;
      const chargeRatio = Math.min(1.0, 1 - (this.ambushTimer / maxPause));

      // Deep coiled weapon charging stance: hand and weapon held steady at shoulder ready to plunge straight forward
      thrustDistance = -24;
      offsetAngle = 0;

      // Render Charging Weapon Energy Flare at spear tip held at shoulder
      ctx.save();
      const renderAngle = baseAngle + offsetAngle;
      const tipX = this.x + Math.cos(renderAngle) * (this.r + 26 + thrustDistance);
      const tipY = this.y + Math.sin(renderAngle) * (this.r + 26 + thrustDistance);

      // A. Charging Energy Flare Outer Ring
      ctx.beginPath();
      ctx.arc(tipX, tipY, 10 + chargeRatio * 20, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 30, 75, ${0.5 + chargeRatio * 0.5})`;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // B. Hyper-Bright Inner Core
      ctx.beginPath();
      ctx.arc(tipX, tipY, 5 + chargeRatio * 8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + chargeRatio * 0.3})`;
      ctx.fill();

      // C. Radiating Energy Spikes / Rays (reduced count in low quality)
      if (!isLowQuality) {
        const rayCount = 8;
        ctx.strokeStyle = `rgba(160, 90, 240, ${0.6 + chargeRatio * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let r = 0; r < rayCount; r++) {
          const rayAngle = (r / rayCount) * Math.PI * 2 + (now / 80);
          const r1 = 6;
          const r2 = 18 + chargeRatio * 18;
          ctx.moveTo(tipX + Math.cos(rayAngle) * r1, tipY + Math.sin(rayAngle) * r1);
          ctx.lineTo(tipX + Math.cos(rayAngle) * r2, tipY + Math.sin(rayAngle) * r2);
        }
        ctx.stroke();
      }
      ctx.restore();
    } else if (this.ambushPhase === 'KATANA_CHARGE') {
      const fadeInTotal = this.craterFadeInTotal || 30;
      const craterChargeTotal = CONFIG.toji?.ultimateCraterChargeTime || 80;
      const fullChargeTotal = fadeInTotal + craterChargeTotal;

      let chargeRatio = 1.0;
      if (this.ultimateActive && this.ultimatePhase === 'CRATER_FADEIN') {
        const elapsed = fadeInTotal - Math.max(0, this.ultimateCycleTimer);
        chargeRatio = Math.min(1.0, Math.max(0, elapsed / fullChargeTotal));
      } else if (this.ultimateActive && this.ultimatePhase === 'CRATER') {
        const diveTime = CONFIG.toji?.ultimateCraterDiveTime ?? 16;
        const spinTime = CONFIG.toji?.ultimateCraterSpinTime ?? 14;
        const craterElapsed = craterChargeTotal - Math.max(0, this.ultimateCycleTimer - (diveTime + spinTime));
        const elapsed = fadeInTotal + craterElapsed;
        chargeRatio = Math.min(1.0, Math.max(0, elapsed / fullChargeTotal));
      } else if (this.ambushTimer > 0) {
        const maxPause = CONFIG.toji?.ambushKatanaChargeDuration || 20;
        chargeRatio = Math.min(1.0, Math.max(0, 1 - (this.ambushTimer / maxPause)));
      }

      // Smoothly animate weapon coiling back from guard stance (0.42) to deep rear charge stance (-2.25 rad, rotating sword behind back!)
      const easeCurve = Math.sin(chargeRatio * Math.PI * 0.5);
      thrustDistance = -24 * easeCurve;
      // Mirror the charge coil direction when Toji faces left so the weapon coils on the correct side
      offsetAngle = (0.42 + (-2.25 - 0.42) * easeCurve) * _katanaFlipSign;

      // Subtle weapon vibration tremor as energy builds up
      const tremorVal = (Math.random() - 0.5) * 1.5 * chargeRatio;
      thrustDistance += tremorVal;
      offsetAngle += (Math.random() - 0.5) * 0.025 * chargeRatio;

      // Render Katana Charging Soul Flare at blade tip (intensifies as he coils back!)
      ctx.save();
      const renderAngle = baseAngle + offsetAngle;
      this._lastKatanaRenderAngle = renderAngle;
      const tipX = this.x + Math.cos(renderAngle) * (this.r + 32 + thrustDistance);
      const tipY = this.y + Math.sin(renderAngle) * (this.r + 32 + thrustDistance);

        // Soft Purple Atmospheric Blade Tip Aura
        ctx.beginPath();
        ctx.arc(tipX, tipY, 6 + chargeRatio * 14, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(140, 70, 220, ${0.35 + chargeRatio * 0.35})`;
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Soft Silver-Violet Core
        ctx.beginPath();
        ctx.arc(tipX, tipY, 3 + chargeRatio * 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240, 230, 255, ${0.5 + chargeRatio * 0.3})`;
        ctx.fill();

        // Soft Radiating Energy Rays (batched into single stroke, skip in low quality)
        if (!isLowQuality) {
          const rayCount = 6;
          ctx.strokeStyle = `rgba(160, 90, 240, ${0.3 + chargeRatio * 0.35})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let r = 0; r < rayCount; r++) {
            const rayAngle = (r / rayCount) * Math.PI * 2 + (now / 80);
            const r1 = 5;
            const r2 = 12 + chargeRatio * 14;
            ctx.moveTo(tipX + Math.cos(rayAngle) * r1, tipY + Math.sin(rayAngle) * r1);
            ctx.lineTo(tipX + Math.cos(rayAngle) * r2, tipY + Math.sin(rayAngle) * r2);
          }
          ctx.stroke();
        }
        ctx.restore();

      // Render Whirling Wind Air-Stream Arcs around Toji (skip in low quality)
      if (!isLowQuality) {
        ctx.save();
        const windTime = now / 120;
        for (let w = 0; w < 4; w++) {
          const windAngle = windTime * 2.8 + (w * Math.PI / 2);
          const windRadius = this.r + 14 + w * 16 + Math.sin(windTime * 3 + w) * 6;
          const windArcLen = 0.8 + Math.sin(windTime * 2 + w) * 0.3;
          
          ctx.beginPath();
          ctx.arc(this.x, this.y, windRadius, windAngle, windAngle + windArcLen);
          ctx.strokeStyle = `rgba(220, 225, 230, ${0.25 + chargeRatio * 0.35})`;
          ctx.lineWidth = 1.5 + (w % 2) * 0.8;
          ctx.stroke();
        }
        ctx.restore();
      }
    } else if (this.ambushPhase === 'KATANA_DRAW' || this.ambushPhase === 'KATANA_CHASE') {
      thrustDistance = -8;
      offsetAngle = 0.35 * _katanaFlipSign; // Mirror guard stance when facing left

      if (this.ambushPhase === 'KATANA_DRAW') {
        const maxDraw = 12;
        const drawProgress = Math.min(1.0, 1 - (this.ambushTimer / maxDraw));

        // --- INVENTORY CURSE WEAPON SWITCH GRAPHIC ---
        const currentRenderAngle = baseAngle + offsetAngle;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(currentRenderAngle);

        // 1. Dark Purple/Black Inventory Curse Vortex Portal Ring
        ctx.beginPath();
        ctx.arc(-this.r * 0.5, 0, 14 + drawProgress * 16, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(120, 30, 180, ${0.9 - drawProgress * 0.4})`;
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(-this.r * 0.5, 0, 8 + drawProgress * 10, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(30, 10, 50, ${0.7 - drawProgress * 0.3})`;
        ctx.fill();

        // 2. Metallic Blade Unsheathe Sheen Flash (Razor white line traveling up blade)
        const sheenX = this.r + (drawProgress * 90);
        ctx.beginPath();
        ctx.arc(sheenX, 0, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${1.0 - drawProgress * 0.3})`;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(sheenX - 14, 0);
        ctx.lineTo(sheenX + 14, 0);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95})`;
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.restore();
      }
    } else if (this.ambushPhase === 'KATANA_SLASH' || (this.katanaSlashTimer && this.katanaSlashTimer > 0)) {
      // Auto-detect max timer when a new swing starts (handles 50 for normal, 24 for ultimate rapid strikes)
      if (this.katanaSlashTimer > (this._lastKatanaTimer || 0)) {
        this._katanaMax = this.katanaSlashTimer;
        // Snapshot the facing angle AND world-space origin at the moment the swing starts so the
        // crescent arc stays locked in place and never drifts or follows Toji as he moves.
        this._slashStartAngle = baseAngle;
        this._slashStartFlipSign = _katanaFlipSign;
        this._slashOriginX = this.x;
        this._slashOriginY = this.y;
      }
      this._lastKatanaTimer = this.katanaSlashTimer;

      const maxTimer = this._katanaMax || 50;
      let t = 1 - ((this.katanaSlashTimer || 0) / maxTimer);
      if (t < 0) t = 0;
      if (t > 1) t = 1;
      
      attackPhaseProgress = t;

      const spinTime = CONFIG.toji?.ultimateCraterSpinTime ?? 14;
      const isSpinningFinalBlow = this.ultimateActive && this.ultimatePhase === 'CRATER' && (this.ultimateCycleTimer || 0) <= spinTime;
      if (isSpinningFinalBlow) {
        const spinProgress = 1 - (this.ultimateCycleTimer / spinTime);
        thrustDistance = -24 + 52 * Math.min(1.0, spinProgress * 3.0);
        offsetAngle = 0; // Sword angle directly matches body spin angle with zero snap!
        slashArcAlpha = Math.min(1.0, spinProgress * 3.0) * (1 - Math.max(0, (spinProgress - 0.7) / 0.3));
        this._activeSlashProgress = spinProgress;
        this._recoveryProgress = 0;
      } else if (t < 0.08) {
        // Phase 1: High Overhead Cocked Pose (-1.40 rad)
        const p = t / 0.08;
        thrustDistance = -18 * p;
        offsetAngle = -1.40 * _katanaFlipSign;
        slashArcAlpha = 0;
        this._activeSlashProgress = 0;
        this._recoveryProgress = 0;
      } else if (t < 0.40) {
        // Phase 2: Explosive Downward Cleave Sweep (-1.40 rad down to +1.35 rad, 158 degree heavy chop!)
        // At t = 0.19 (frame 5-6), blade sweeps directly through center (0 rad) -> instant hit impact!
        const p = (t - 0.08) / 0.32;
        const sweepCurve = 1 - Math.pow(1 - p, 2.0);
        thrustDistance = -18 + 58 * Math.min(1.0, p * 2.0);
        offsetAngle = (-1.40 + 2.75 * sweepCurve) * _katanaFlipSign;
        slashArcAlpha = Math.min(1.0, p * 4.0);
        this._activeSlashProgress = p;
        this._recoveryProgress = 0;
      } else {
        // Phase 3: Heavy follow-through and recovery landing (+1.35 rad back to +0.42)
        const p = (t - 0.40) / 0.60;
        const easeP = p * (2 - p);
        thrustDistance = 40 * (1 - easeP * 0.7);
        offsetAngle = (1.35 + (0.42 - 1.35) * easeP) * _katanaFlipSign;
        // Hold full opacity through initial follow-through before smooth fade
        slashArcAlpha = p < 0.35 ? 1.0 : Math.pow(1 - (p - 0.35) / 0.65, 0.75);
        this._activeSlashProgress = 1.0;
        this._recoveryProgress = p;
      }
    } else if (isAttacking) {
      // Snapshot the facing angle AND world-space origin at the moment the spear swing starts so
      // the crescent arc stays locked in place and never drifts or follows Toji as he moves.
      if (this.spearSwingTimer > (this._lastSpearTimer || 0)) {
        this._slashStartAngle = baseAngle;
        this._slashStartFlipSign = _katanaFlipSign;
        this._slashOriginX = this.x;
        this._slashOriginY = this.y;
      }
      this._lastSpearTimer = this.spearSwingTimer;

      const maxTimer = this.spearSwingMax || (this.isAmbushThrust ? 50 : 55);
      const t = 1 - (this.spearSwingTimer / maxTimer); // 0 to 1 attack progress
      attackPhaseProgress = t;

      if (this.isAmbushThrust) {
        // --- MASSIVE AMBUSH PIERCING THRUST ANIMATION ---
        if (t < 0.12) {
          const p = t / 0.12;
          thrustDistance = -24 * (1 - p * 0.1); // Coiled far back at shoulder
          offsetAngle = 0; // Pure linear piercing thrust directly forward into enemy spine
          slashArcAlpha = 0;
        } else if (t < 0.72) {
          const p = (t - 0.12) / 0.60;
          const thrustProgress = Math.min(1.0, p * 4.0); // Drives forward in 3 frames, then HOLDS at +70px!
          thrustDistance = -24 + 94 * thrustProgress; // Plunges from -24px to +70px forward deep inside target body!
          offsetAngle = 0; // Pure linear piercing thrust directly forward into enemy spine
          slashArcAlpha = 0; // Clean piercing thrust — NO curved weapon slash effect!

          if (p > 0.05 && p < 0.35 && this.chainNodes && this.chainNodes.length > 2) {
            const whipForce = -8.0;
            for (let i = 1; i < this.chainNodes.length; i++) {
              this.chainNodes[i].vx += Math.cos(baseAngle) * (whipForce / i);
              this.chainNodes[i].vy += Math.sin(baseAngle) * (whipForce / i);
            }
          }
        } else {
          const p = (t - 0.72) / 0.28;
          const easeP = p * (2 - p);
          thrustDistance = 70 * (1 - easeP);
          offsetAngle = 0.42 * easeP * _katanaFlipSign;
          slashArcAlpha = 0;
        }
      } else {
        // Standard Melee Swing (Basic Attack — Inverted Spear of Heaven)
        // Motion: weapon snaps to upper-right (-0.80), sweeps downward arc through
        // horizontal (0) to lower-right (+0.55), then recovers to idle (+0.42).
        // Matches reference drawing: top-to-bottom chop, single clean arc.
        //
        // Phase layout: 5% instant cock-up | 47% downward arc sweep | 48% recovery
        if (t < 0.05) {
          // Phase 1: Ultra-fast snap to cocked upper-right position (reads as "already cocked")
          const p = t / 0.05;
          thrustDistance = -8 * p;
          offsetAngle = (0.42 - 1.57 * p) * _katanaFlipSign;   // 0.42 → -1.15 (upper-right, 11 o'clock)
          slashArcAlpha = 0;
          this._activeSlashProgress = 0;
          this._recoveryProgress = 0;
        } else if (t < 0.52) {
          // Phase 2: Downward arc sweep — upper-right (-1.15) through horizontal to lower-right (+1.05)
          const p = (t - 0.05) / 0.47;
          const sweepCurve = 1 - Math.pow(1 - p, 2.2); // quadratic ease-out: fast snap, smooth landing
          // thrustDistance: blade eases forward to a steady +12px and holds there during the arc.
          // No sin-pulse lunge — that was causing the thrust look.
          thrustDistance = -8 + 20 * Math.min(1.0, p * 3.0); // ramps to +12 in first 1/3, then holds
          offsetAngle = (-1.15 + 2.20 * sweepCurve) * _katanaFlipSign;            // -1.15 → +1.05 (wider top-to-bottom arc, 126 degrees)
          slashArcAlpha = Math.min(1.0, p * 4.0);              // Fades in instantly and stays at 1.0
          this._activeSlashProgress = p; // Store the progress on this for trailing erase effect
          this._recoveryProgress = 0;

          // Chain whips forward during early sweep burst
          if (p > 0.04 && p < 0.40 && this.chainNodes && this.chainNodes.length > 2) {
            const whipForce = -6.5;
            const sideAngle = baseAngle + offsetAngle;
            for (let i = 1; i < this.chainNodes.length; i++) {
              this.chainNodes[i].vx += Math.cos(sideAngle - 0.9) * (whipForce / i);
              this.chainNodes[i].vy += Math.sin(sideAngle - 0.9) * (whipForce / i);
            }
          }
        } else {
          // Phase 3: Smooth recovery — ease back from lower-right (+1.05) to idle (+0.42)
          const p = (t - 0.52) / 0.48;
          const easeP = p * (2 - p); // quadratic ease-out
          thrustDistance = 12 * (1 - easeP);                   // eases back from +12 to 0
          offsetAngle = (1.05 + (0.42 - 1.05) * easeP) * _katanaFlipSign;          // +1.05 → +0.42
          slashArcAlpha = 1 - p;                               // Fades out during recovery phase
          this._activeSlashProgress = 1.0;
          this._recoveryProgress = p; // Store recovery progress
        }
      }
    } else if (this.ambushPhase === 'PHANTOM_FLURRY' || (this.phantomSlashTimer && this.phantomSlashTimer > 0)) {
      const animMult = (TOJI_WEAPON_CONFIG?.animationSpeed || 1.0) * (TOJI_WEAPON_CONFIG?.katanaSlashAnimSpeed || 1.0);
      const maxSlashFrames = Math.max(1, (CONFIG.toji?.flurrySlashDuration || TOJI_WEAPON_CONFIG?.flurrySlashDuration || 12) / animMult);
      const timer = this.phantomSlashTimer || 0;
      let rawP = Math.min(1.0, Math.max(0, timer / maxSlashFrames));
      let p = rawP * (2 - rawP); // ease-out

      // Strictly alternate: even strike count = Katana, odd = Spear
      const isKatanaActive = (this.phantomStrikeCount % 2) === 0;
      this.pKatana = isKatanaActive ? p : 0;
      this.pSpear  = isKatanaActive ? 0 : p;

      const swingType = (this.phantomStrikeCount || 0) % 3;
      let targetOffset = 0, targetThrust = 0;
      if (swingType === 0) { targetOffset = 0.7 - (1.4 * (1 - p));  targetThrust = 8 * p; }
      else if (swingType === 1) { targetOffset = -0.7 + (1.4 * (1 - p)); targetThrust = 12 * p; }
      else { targetOffset = 1.0 * p - 0.5 * (1 - p); targetThrust = -6 + 20 * Math.sin(p * Math.PI); }

      const lerpSpeed = Math.min(1.0, 0.45 * animMult);

      // Smooth lerp for the active weapon only
      if (isKatanaActive) {
        if (this._smoothKatanaOffset === undefined) this._smoothKatanaOffset = targetOffset;
        if (this._smoothKatanaThrust === undefined) this._smoothKatanaThrust = targetThrust;
        this._smoothKatanaOffset += (targetOffset - this._smoothKatanaOffset) * lerpSpeed;
        this._smoothKatanaThrust += (targetThrust - this._smoothKatanaThrust) * lerpSpeed;
        this.katanaOffset = this._smoothKatanaOffset;
        this.katanaThrust = this._smoothKatanaThrust;
        this.spearOffset = 0; this.spearThrust = 0;
      } else {
        if (this._smoothSpearOffset === undefined) this._smoothSpearOffset = targetOffset;
        if (this._smoothSpearThrust === undefined) this._smoothSpearThrust = targetThrust;
        this._smoothSpearOffset += (targetOffset - this._smoothSpearOffset) * lerpSpeed;
        this._smoothSpearThrust += (targetThrust - this._smoothSpearThrust) * lerpSpeed;
        this.spearOffset = this._smoothSpearOffset;
        this.spearThrust = this._smoothSpearThrust;
        this.katanaOffset = 0; this.katanaThrust = 0;
      }

      slashArcAlpha = 0.3 + p * 0.7;
      offsetAngle = 0; // handled per weapon
      thrustDistance = 0;
    } else if (this.blockPoseTimer && this.blockPoseTimer > 0) {
      this.blockPoseTimer--;
      const progress = 1 - (this.blockPoseTimer / 25);
      if (this.parryType === 'deflect') {
        // Fast sharp counter-swipe rotation matching Yuta's deflection pose!
        offsetAngle = ((Math.PI / 3.5) - (Math.PI * 0.6) * Math.min(1.0, progress * 2.5)) * _katanaFlipSign;
        thrustDistance = 12 * Math.sin(progress * Math.PI);
      } else {
        // Guard Pose: Hold Inverted Spear flat across chest
        offsetAngle = (Math.PI / 2) * _katanaFlipSign;
        thrustDistance = -6;
      }
    } else {
      // Idle assassin stance breathing sway
      offsetAngle += Math.sin(now / 250) * 0.05 * _katanaFlipSign;
    }

    const renderAngle = baseAngle + offsetAngle;

    // 1. Draw motion ghosting shadow during thrust lunge (shows hand & weapon driving forward)
    if (isAttacking && attackPhaseProgress >= 0.15 && attackPhaseProgress <= 0.70 && !this._isFrozenOrPaused()) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      const ghostOffset = this.isAmbushThrust
        ? -28 + 55 * Math.sin((attackPhaseProgress - 0.15) / 0.55 * Math.PI)
        : -12 * (1 - Math.abs(attackPhaseProgress - 0.43) * 4);
      ctx.translate(this.x + Math.cos(baseAngle) * ghostOffset, this.y + Math.sin(baseAngle) * ghostOffset);
      ctx.rotate(renderAngle);
      drawInvertedSpear(ctx, 0, 0, 0, this.r, null, this.color);
      ctx.restore();
    }

    // 1.4. High-Speed Stealth & Domain Motion Trail Ghost Model Afterimages (Skin Model Ghosting)
    if (this.stealthAfterimages && this.stealthAfterimages.length > 0 && !this._isFrozenOrPaused()) {
      const skipAlternate = (typeof state !== 'undefined' && state.fps && state.fps < 45);
      const startIdx = Math.max(0, this.stealthAfterimages.length - 4);
      for (let i = startIdx; i < this.stealthAfterimages.length; i++) {
        if (skipAlternate && i % 2 === 0) continue;
        const img = this.stealthAfterimages[i];
        if (!img || img.timer <= 0) continue;

        const maxT = img.maxTimer || 20;
        const progress = Math.max(0, Math.min(1, img.timer / maxT));
        const alpha = img.alpha !== undefined ? img.alpha : ((img.initialAlpha || 0.75) * Math.pow(progress, 0.7));

        if (alpha <= 0.01) continue;

        // 1. Dash Trajectory Line (skip in low quality for perf)
        if (!isLowQuality && img.fromX !== undefined && img.toX !== undefined) {
          const lineHex = img.isDomainAfterimage ? '#A040FF' : '#FF1E56';
          ctx.save();
          ctx.globalAlpha = alpha * 0.6;
          ctx.strokeStyle = lineHex;
          ctx.lineWidth = 3.0;
          ctx.beginPath();
          ctx.moveTo(img.fromX, img.fromY);
          ctx.lineTo(img.toX, img.toY);
          ctx.stroke();

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(img.fromX, img.fromY);
          ctx.lineTo(img.toX, img.toY);
          ctx.stroke();
          ctx.restore();
        }

        // 2. Render Full Ghost Model of Toji's Skin at recorded world coordinates
        const aiAngle = img.gunAngle !== undefined ? img.gunAngle : (img.angle || 0);
        drawTojiGhostSkin(ctx, img.x, img.y, aiAngle, this.r, alpha, img.isDomainAfterimage);
      }
    }

    // 1.8. Draw Rested Weapon on BACK LAYER (Behind Toji's body circle)
    const isKatanaDrawn = (this.ambushPhase === 'KATANA_DRAW' || this.ambushPhase === 'KATANA_CHASE' || this.ambushPhase === 'KATANA_CHARGE' || this.ambushPhase === 'KATANA_SLASH' || this.ambushPhase === 'KATANA_RECOVERY') && !this.ultimateActive;
    const isKatanaActiveInHand = isKatanaDrawn || (this.ambushPhase === 'PHANTOM_FLURRY' && !this.ultimateActive);
    const isUltimateFinal = this.ultimateActive && (this.ultimatePhase === 'CRATER_FADEIN' || this.ultimatePhase === 'CRATER' || this.ultimatePhase === 'CRATER_DIVE');
    const isShowoffOrPreview = this._isFaceOff || this._isWinnerReveal || (typeof state !== 'undefined' && (state.gameState === 'countdown' || state._isFaceOffScreenActive));
    const shouldHideWeapons = (typeof state !== 'undefined' && state.showSkinOnly) || this.hideWeapon;
    if (!shouldHideWeapons) {
      if (isKatanaDrawn || isKatanaActiveInHand || isUltimateFinal) {
        // During active skill execution with Katana in hand, Inverted Spear rests at hip
        drawRestedInvertedSpearAtHip(ctx, this.x, this.y, baseAngle, this.r, this.chainNodes, '#E8BD9B');
      } else if (isShowoffOrPreview) {
        // Dual-wield pose with Katana over shoulder only shown in showoff screen / countdown / preview cards
        drawRestedKatanaOverShoulder(ctx, this.x, this.y, baseAngle, this.r, '#E8BD9B');
      }
    }

    // 2. Draw Toji's signature skin model (Rule 19 & 20 compliant)
    drawTojiSkin(ctx, this);

    // 3. Draw physics chain trailing naturally in world space
    if (!shouldHideWeapons) {
      modUpdateChain(this);
      drawPhysicsChain(ctx, this.chainNodes);
    }

    // 4. HIGH-IMPACT ANIME SLASH VISUAL EFFECTS (Impact & Recovery Phase)
    const isTojiPausedOrFrozen = this._isFrozenOrPaused();
    if (slashArcAlpha > 0 && !isTojiPausedOrFrozen && !this.isAmbushThrust) {
      ctx.save();
      // Use the world-space origin snapshotted at swing-start so the slash arc stays
      // fixed in place and does NOT follow Toji as he moves during or after the swing.
      const isSpinningFinalBlow = this.ultimateActive && this.ultimatePhase === 'CRATER' && (this.ultimateCycleTimer || 0) <= (CONFIG.toji?.ultimateCraterSpinTime ?? 14);
      const isUltimateStriking = this.ultimateActive && this.ultimatePhase === 'STRIKING';
      const _slashOriginX = (isUltimateStriking || isSpinningFinalBlow || this._slashOriginX === undefined) ? this.x : this._slashOriginX;
      const _slashOriginY = (isUltimateStriking || isSpinningFinalBlow || this._slashOriginY === undefined) ? this.y : this._slashOriginY;
      ctx.translate(_slashOriginX, _slashOriginY);

      if (this.ambushPhase === 'KATANA_SLASH' || (this.katanaSlashTimer && this.katanaSlashTimer > 0) || (this.katanaSlashFadeTimer && this.katanaSlashFadeTimer > 0)) {
        // Use the snapshotted angle from the moment the swing began so the crescent stays locked in world space
        // During 360 final blow, dynamically follow Toji's real-time rotation!
        const frozenAngle = this._slashStartAngle === undefined ? baseAngle : this._slashStartAngle;
        const finalRenderAngle = isSpinningFinalBlow ? (this.gunAngle !== undefined ? this.gunAngle : baseAngle) : frozenAngle;
        ctx.rotate(finalRenderAngle);
        const normAngle = Math.atan2(Math.sin(finalRenderAngle), Math.cos(finalRenderAngle));
        if (!isSpinningFinalBlow && Math.abs(normAngle) > Math.PI / 2) {
          ctx.scale(1, -1);
        }

        const startOffset = -1.45;
        const endOffset = 1.35;
        const totalSweep = endOffset - startOffset;

        let progress = this._activeSlashProgress !== undefined ? this._activeSlashProgress : 0;
        let trailAlpha = slashArcAlpha;

        if (this.katanaSlashFadeTimer > 0 && this.katanaSlashTimer <= 0) {
          const fadeRatio = this.katanaSlashFadeTimer / 12;
          progress = 1.0;
          trailAlpha = Math.min(1.0, fadeRatio * 1.25);
        }

        let currentTipOffset, currentTailOffset;
        if (isSpinningFinalBlow) {
          const maxTrail = 3.8;
          const trailLen = maxTrail * Math.min(1.0, progress * 1.5);
          currentTipOffset = 0.15;
          currentTailOffset = currentTipOffset - trailLen;
        } else if (progress < 0.40) {
          // Active Cleave Sweep Phase: Crescent grows down powerfully from top to bottom
          const p = Math.max(0, progress / 0.40);
          const sweepEase = 1 - Math.pow(1 - p, 2.0);
          currentTipOffset = startOffset + sweepEase * totalSweep;
          currentTailOffset = startOffset;
          trailAlpha = trailAlpha * Math.min(1.0, p * 3.5);
        } else {
          // Landing & Dissolve Recovery Phase:
          // Holds full arc length prominently in the air, then erases cleanly
          const recP = (progress - 0.40) / 0.60;
          currentTipOffset = endOffset;
          if (recP < 0.35) {
            // Full crescent locked suspended in air for immediate visual grandeur!
            currentTailOffset = startOffset;
          } else {
            // Clean dissolve wipe from tail to tip
            const eraseP = (recP - 0.35) / 0.65;
            const easedErase = Math.pow(eraseP, 1.4);
            currentTailOffset = startOffset + easedErase * totalSweep;
            trailAlpha = trailAlpha * Math.pow(1 - eraseP, 0.85);
          }
        }

        const span = currentTipOffset - currentTailOffset;
        if (Math.abs(span) >= 0.04 && trailAlpha > 0.01) {
          const outerRadius = this.r + thrustDistance + (isSpinningFinalBlow ? 146 : 140);
          const maxThick = 34.0;
          const numSteps = 36;

          // ── Helper to build double-tapered crescent path (Rule 15) ──
          const buildCrescentPath = (radOffset, thickMult, taperExp = 1.15) => {
            ctx.beginPath();
            for (let i = 0; i <= numSteps; i++) {
              const st = i / numSteps;
              const ang = currentTailOffset + st * span;
              const taper = Math.pow(Math.sin(st * Math.PI), taperExp) * (0.28 + 0.72 * st);
              const rad = outerRadius + radOffset + taper * 2.0;
              const px = Math.cos(ang) * rad;
              const py = Math.sin(ang) * rad;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            for (let i = numSteps; i >= 0; i--) {
              const st = i / numSteps;
              const ang = currentTailOffset + st * span;
              const taper = Math.pow(Math.sin(st * Math.PI), taperExp) * (0.28 + 0.72 * st);
              const rad = outerRadius + radOffset - (maxThick * thickMult * taper);
              const px = Math.cos(ang) * rad;
              const py = Math.sin(ang) * rad;
              ctx.lineTo(px, py);
            }
            ctx.closePath();
          };

          // 1. Outer Cursed Atmospheric Glow Flare
          buildCrescentPath(7.0, 1.35, 1.05);
          ctx.fillStyle = `rgba(130, 20, 220, ${(0.38 * trailAlpha).toFixed(2)})`;
          ctx.fill();

          buildCrescentPath(4.0, 1.18, 1.10);
          ctx.fillStyle = `rgba(255, 30, 86, ${(0.45 * trailAlpha).toFixed(2)})`;
          ctx.fill();

          // 2. Dark Manga Ink Contour Shell
          buildCrescentPath(1.5, 1.05, 1.15);
          ctx.fillStyle = `rgba(10, 4, 18, ${(0.96 * trailAlpha).toFixed(2)})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(10, 4, 18, ${(0.96 * trailAlpha).toFixed(2)})`;
          ctx.lineWidth = 2.4;
          ctx.stroke();

          // 3. Deep Split Soul Violet Body
          buildCrescentPath(0, 1.0, 1.15);
          ctx.fillStyle = `rgba(155, 31, 232, ${(0.92 * trailAlpha).toFixed(2)})`;
          ctx.fill();

          // 4. Vivid Crimson Cursed Energy Plasma Blade Core
          buildCrescentPath(-2.0, 0.70, 1.20);
          ctx.fillStyle = `rgba(255, 30, 86, ${(0.95 * trailAlpha).toFixed(2)})`;
          ctx.fill();

          // 5. Hyper-Bright Silver-White Razor Cutting Edge & Core Line
          buildCrescentPath(-1.0, 0.32, 1.25);
          ctx.fillStyle = `rgba(255, 255, 255, ${(0.98 * trailAlpha).toFixed(2)})`;
          ctx.fill();

          // Specular cutting edge stroke along apex
          ctx.beginPath();
          for (let i = 0; i <= numSteps; i++) {
            const st = i / numSteps;
            const ang = currentTailOffset + st * span;
            const taper = Math.pow(Math.sin(st * Math.PI), 1.25) * (0.28 + 0.72 * st);
            const rad = outerRadius - 1.5 + taper * 1.5;
            const px = Math.cos(ang) * rad;
            const py = Math.sin(ang) * rad;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.strokeStyle = `rgba(255, 255, 255, ${(0.95 * trailAlpha).toFixed(2)})`;
          ctx.lineWidth = 2.2;
          ctx.stroke();

          // 6. Trailing Cursed Sparks & Embers along the Blade Arc
          const numSparks = 10;
          for (let s = 0; s < numSparks; s++) {
            const sT = (s / numSparks + (Date.now() / 250)) % 1.0;
            const sAng = currentTailOffset + sT * span;
            const sDist = outerRadius - 4 - s * 2.5;
            const sx = Math.cos(sAng) * sDist;
            const sy = Math.sin(sAng) * sDist;
            ctx.fillStyle = (s % 3 === 0) ? '#FFFFFF' : ((s % 3 === 1) ? '#A030FF' : '#FF1E56');
            ctx.fillRect(sx - 1.5, sy - 1.5, 3.0, 3.0);
          }
        }
      } else if (this.ambushPhase === 'PHANTOM_FLURRY') {
        // --- DUAL-WIELD PHANTOM FLURRY SLASH ARCS ---
        const drawArc = (arcAngle, radius, thick, alpha, color1, color2, color3) => {
          ctx.save();
          const frozenAngle = this._slashStartAngle !== undefined ? this._slashStartAngle : baseAngle;
          ctx.rotate(frozenAngle + arcAngle);
          const normAngle = Math.atan2(Math.sin(frozenAngle), Math.cos(frozenAngle));
          if (Math.abs(normAngle) > Math.PI / 2) {
            ctx.scale(1, -1);
          }

          const animMult = (TOJI_WEAPON_CONFIG?.animationSpeed || 1.0) * (TOJI_WEAPON_CONFIG?.katanaSlashAnimSpeed || 1.0);
          const maxSlashFrames = Math.max(1, (CONFIG.toji?.flurrySlashDuration || TOJI_WEAPON_CONFIG?.flurrySlashDuration || 12) / animMult);
          const timer = this.phantomSlashTimer || 0;
          const rawP = Math.min(1.0, Math.max(0, timer / maxSlashFrames));
          const progress = 1 - rawP;

          const swingType = (this.phantomStrikeCount || 0) % 3;
          const sweepDir = (swingType === 1) ? 1 : -1;

          const maxTrailLength = Math.PI * 0.95;
          let activeTrailLength = 0;

          if (progress < 0.35) {
            activeTrailLength = maxTrailLength * (progress / 0.35);
          } else if (progress < 0.60) {
            activeTrailLength = maxTrailLength;
          } else {
            const shrink = (progress - 0.60) / 0.40;
            activeTrailLength = maxTrailLength * Math.pow(1 - shrink, 1.4);
          }

          const tailAngle = sweepDir === 1 ? -activeTrailLength : 0;
          const tipAngle = sweepDir === 1 ? 0 : activeTrailLength;
          const P = 2.0;
          const snap = (v) => Math.round(v / P) * P;
          thick = thick * (activeTrailLength / maxTrailLength);
          const span = tipAngle - tailAngle;
          const minAng = Math.min(tailAngle, tipAngle);
          const maxAng = Math.max(tailAngle, tipAngle);

          const outlineCol = `rgba(10, 4, 18, ${(0.96 * alpha).toFixed(2)})`;

          const isInsideFlurry = (rx, ry) => {
            const dist = Math.hypot(rx, ry);
            if (dist <= 0) return false;
            let ang = Math.atan2(ry, rx);
            while (ang < minAng - Math.PI) ang += Math.PI * 2;
            while (ang > maxAng + Math.PI) ang -= Math.PI * 2;
            if (ang < minAng || ang > maxAng) return false;

            const t = (ang - tailAngle) / span;
            if (t < 0 || t > 1.0) return false;

            const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
            const th = thick * taper;
            const outRad = radius + taper * 1.5;
            const inRad = outRad - th;
            return dist >= inRad && dist <= outRad;
          };

          const minX = Math.floor((-radius - P * 2) / P) * P;
          const maxX = Math.ceil((radius + P * 2) / P) * P;
          const minY = Math.floor((-radius - P * 2) / P) * P;
          const maxY = Math.ceil((radius + P * 2) / P) * P;

          for (let gy = minY; gy <= maxY; gy += P) {
            for (let gx = minX; gx <= maxX; gx += P) {
              if (!isInsideFlurry(gx, gy)) continue;

              const pxX = snap(gx);
              const pyY = snap(gy);

              const isBorder = !isInsideFlurry(gx + P, gy) ||
                               !isInsideFlurry(gx - P, gy) ||
                               !isInsideFlurry(gx, gy + P) ||
                               !isInsideFlurry(gx, gy - P);

              if (isBorder) {
                ctx.fillStyle = outlineCol;
                ctx.fillRect(pxX, pyY, P, P);
                continue;
              }

              const dist = Math.hypot(gx, gy);
              let ang = Math.atan2(gy, gx);
              while (ang < minAng - Math.PI) ang += Math.PI * 2;
              while (ang > maxAng + Math.PI) ang -= Math.PI * 2;
              const t = (ang - tailAngle) / span;
              const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
              const outRad = radius + taper * 1.5;
              const depthFromApex = outRad - dist;

              let col = (depthFromApex < P * 1.4) ? '#FFFFFF' : ((depthFromApex < P * 3.2) ? `rgb(${color2})` : `rgb(${color1})`);
              ctx.fillStyle = col;
              ctx.fillRect(pxX, pyY, P, P);
            }
          }

          ctx.restore();
        };

        // Only draw the arc for the currently active weapon (one at a time)
        const isKatanaActiveArc = (this.phantomStrikeCount % 2) === 0;
        if (isKatanaActiveArc) {
          drawArc(0.35 + (this.katanaOffset || 0), this.r + (this.katanaThrust || 0) + 122, 22, slashArcAlpha, '160, 30, 240', '220, 20, 100', '12, 4, 20');
        } else {
          drawArc(-0.35 + (this.spearOffset || 0), this.r + (this.spearThrust || 0) + 85, 18, slashArcAlpha, '160, 30, 240', '220, 20, 100', '12, 4, 20');
        }
      } else if (!this.isAmbushThrust) {
        // --- INVERTED SPEAR / SPLIT SOUL KATANA BASIC ATTACK SLASH ---
        const editP = (typeof state !== 'undefined' && state.slashEditMode && state.slashEditParams) ? state.slashEditParams : null;
        if (editP) {
          ctx.translate(editP.offsetX, editP.offsetY);
          slashArcAlpha = 1.0;
        }

        const frozenAngle = this._slashStartAngle !== undefined ? this._slashStartAngle : baseAngle;
        ctx.rotate(frozenAngle);
        const normAngle = Math.atan2(Math.sin(frozenAngle), Math.cos(frozenAngle));
        const isKatana = (this.ambushPhase === 'KATANA_SLASH' || (typeof state !== 'undefined' && state.tojiWeaponIndex === 1));
        if (isKatana && Math.abs(normAngle) > Math.PI / 2) {
          ctx.scale(1, -1);
        }

        const frozenFlip = this._slashStartFlipSign !== undefined ? this._slashStartFlipSign : _katanaFlipSign;
        
        const recP = this._recoveryProgress !== undefined ? this._recoveryProgress : 0;
        if (recP > 0) slashArcAlpha *= (1 - recP);

        const endOffset = isKatana ? 1.25 : 1.05;
        const liveOffset = isKatana ? (offsetAngle * frozenFlip) : offsetAngle;
        const currentOffset = recP > 0 ? endOffset : liveOffset;

        const startOffset = -1.15;
        const maxTrailLength = isKatana ? 1.8 : 1.6;

        let activeTrailLength = maxTrailLength;
        if (recP > 0) {
          activeTrailLength = maxTrailLength * Math.pow(1 - recP, 1.4);
        }

        const tipAngle = currentOffset;
        const tailAngle = Math.max(startOffset, currentOffset - activeTrailLength);
        const bladeReach = isKatana ? 80 : 85;
        const P = 2.0; // Discrete pixel art grid unit matching Ichigo & Saitama
        const snap = (v) => Math.round(v / P) * P;
        const outerR = (this.r + thrustDistance + bladeReach) * (editP ? editP.scale : 1.0);
        const thickScale = activeTrailLength / maxTrailLength;
        const maxThick = (isKatana ? 24 : 16) * (editP ? editP.thickness : 1.0) * thickScale;
        const span = tipAngle - tailAngle;
        const minAng = Math.min(tailAngle, tipAngle);
        const maxAng = Math.max(tailAngle, tipAngle);

        const outlineCol = `rgba(10, 4, 18, ${(0.98 * slashArcAlpha).toFixed(2)})`;

        const isInsideBasic = (rx, ry) => {
          const dist = Math.hypot(rx, ry);
          if (dist <= 0) return false;
          let ang = Math.atan2(ry, rx);
          while (ang < minAng - Math.PI) ang += Math.PI * 2;
          while (ang > maxAng + Math.PI) ang -= Math.PI * 2;
          if (ang < minAng || ang > maxAng) return false;

          const t = (ang - tailAngle) / span;
          if (t < 0 || t > 1.0) return false;

          const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.28 + 0.72 * t);
          const thick = maxThick * taper;
          const outRad = outerR + taper * 1.5;
          const inRad = outRad - thick;
          return dist >= inRad && dist <= outRad;
        };

        const minX = Math.floor((-outerR - P * 2) / P) * P;
        const maxX = Math.ceil((outerR + P * 2) / P) * P;
        const minY = Math.floor((-outerR - P * 2) / P) * P;
        const maxY = Math.ceil((outerR + P * 2) / P) * P;

        for (let gy = minY; gy <= maxY; gy += P) {
          for (let gx = minX; gx <= maxX; gx += P) {
            if (!isInsideBasic(gx, gy)) continue;

            const pxX = snap(gx);
            const pyY = snap(gy);

            const isBorder = !isInsideBasic(gx + P, gy) ||
                             !isInsideBasic(gx - P, gy) ||
                             !isInsideBasic(gx, gy + P) ||
                             !isInsideBasic(gx, gy - P);

            if (isBorder) {
              ctx.fillStyle = outlineCol;
              ctx.fillRect(pxX, pyY, P, P);
              continue;
            }

            const dist = Math.hypot(gx, gy);
            let ang = Math.atan2(gy, gx);
            while (ang < minAng - Math.PI) ang += Math.PI * 2;
            while (ang > maxAng + Math.PI) ang -= Math.PI * 2;
            const t = (ang - tailAngle) / span;
            const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.28 + 0.72 * t);
            const outRad = outerR + taper * 1.5;
            const depthFromApex = outRad - dist;

            let col;
            if (depthFromApex < P * 1.4) {
              col = '#FFFFFF';
            } else if (depthFromApex < P * 3.0) {
              col = '#E2EAF5'; // Metallic silver
            } else if (depthFromApex < P * 5.0) {
              col = '#FF1E56'; // Crimson nullification
            } else {
              col = '#9B1FE8'; // Deep cursed violet
            }

            ctx.fillStyle = col;
            ctx.fillRect(pxX, pyY, P, P);
          }
        }

        // Trailing Cursed Pixel Sparks
        const numEmbers = 8;
        for (let eb = 0; eb < numEmbers; eb++) {
          const ebT = (eb / numEmbers + (Date.now() / 300)) % 1.0;
          const ebAng = tailAngle + ebT * span;
          const ebDist = outerR - 10 - eb * 4;
          const ex = snap(Math.cos(ebAng) * ebDist);
          const ey = snap(Math.sin(ebAng) * ebDist);
          ctx.fillStyle = (eb % 2 === 0) ? '#A030FF' : '#FF1E56';
          ctx.fillRect(ex, ey, P, P);
        }
      }

      ctx.restore();
    }



    // 5. Draw Active Front Weapon (Inverted Spear of Heaven or Split Soul Katana)
    ctx.save();
    if (this.channelSenseIndicatorTimer > 0 && !isKatanaDrawn) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 20, 100, 0.4)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const isUltimateStriking = this.ultimateActive && this.ultimatePhase === 'STRIKING';
    const isPhantomFlurry = this.isAmbushing && this.ambushPhase === 'PHANTOM_FLURRY';

    if (isPhantomFlurry) {
      const isKatanaActive = (this.phantomStrikeCount % 2) === 0;
      if (isKatanaActive) {
        drawSplitSoulKatana(ctx, this.x, this.y, baseAngle + (this.katanaOffset || 0), this.r + (this.katanaThrust || 0), this.color, baseAngle);
      } else {
        drawInvertedSpear(ctx, this.x, this.y, baseAngle + (this.spearOffset || 0), this.r + (this.spearThrust || 0), this.chainNodes, this.color, baseAngle);
      }
    } else if (isUltimateStriking) {
      // Ultimate Sequence Strikes: Displayed 1 by 1 (ONLY 1 weapon drawn per strike, alternating Katana vs Spear!)
      const isKatanaActive = (this.phantomStrikeCount % 2) === 0;
      if (isKatanaActive) {
        drawSplitSoulKatana(ctx, this.x, this.y, renderAngle, this.r + thrustDistance, '#E8BD9B', baseAngle);
      } else {
        drawInvertedSpear(ctx, this.x, this.y, renderAngle, this.r + thrustDistance, this.chainNodes, '#E8BD9B', baseAngle);
      }
    } else if (isKatanaActiveInHand || isUltimateFinal) {
      const isSpinningFinalBlow = this.ultimateActive && this.ultimatePhase === 'CRATER' && (this.ultimateCycleTimer || 0) <= (CONFIG.toji?.ultimateCraterSpinTime ?? 14);
      const isCraterCharge = this.ultimateActive && (this.ultimatePhase === 'CRATER_FADEIN' || (this.ultimatePhase === 'CRATER' && (this.ultimateCycleTimer || 0) > (CONFIG.toji?.ultimateCraterSpinTime ?? 14)));
      
      // Disable scale flipping during spinning final blow (baseAngle = 0) so the blade cutting edge naturally leads the clockwise rotation
      const finalBaseAngle = isSpinningFinalBlow ? 0 : baseAngle;
      drawSplitSoulKatana(ctx, this.x, this.y, renderAngle, this.r + thrustDistance, '#E8BD9B', finalBaseAngle);
    } else {
      drawInvertedSpear(ctx, this.x, this.y, renderAngle, this.r + thrustDistance, this.chainNodes, '#E8BD9B', baseAngle);
    }
    ctx.restore();

    if (!isTojiPausedOrFrozen && (((this.isAmbushing && (this.ambushPhase === 'BACK_CHARGE' || this.ambushPhase === 'FRONT_LAUNCH')) || this.ambushPhase === 'KATANA_CHARGE'))) {
      let chargeRatio = 1.0;
      if (this.ambushPhase === 'KATANA_CHARGE') {
        const fadeInTotal = this.craterFadeInTotal || 30;
        const craterChargeTotal = CONFIG.toji?.ultimateCraterChargeTime || 80;
        const fullChargeTotal = fadeInTotal + craterChargeTotal;
        if (this.ultimateActive && this.ultimatePhase === 'CRATER_FADEIN') {
          const elapsed = fadeInTotal - Math.max(0, this.ultimateCycleTimer);
          chargeRatio = Math.min(1.0, Math.max(0, elapsed / fullChargeTotal));
        } else if (this.ultimateActive && this.ultimatePhase === 'CRATER') {
          const diveTime = CONFIG.toji?.ultimateCraterDiveTime ?? 16;
          const spinTime = CONFIG.toji?.ultimateCraterSpinTime ?? 14;
          const craterElapsed = craterChargeTotal - Math.max(0, this.ultimateCycleTimer - (diveTime + spinTime));
          const elapsed = fadeInTotal + craterElapsed;
          chargeRatio = Math.min(1.0, Math.max(0, elapsed / fullChargeTotal));
        }
      } else {
        const maxPause = CONFIG.toji?.ambushBackChargeDuration || 25;
        chargeRatio = Math.min(1.0, 1 - (this.ambushTimer / maxPause));
      }

      // Sharp Razor Blade Edge Glow Overlay (skip in low quality for perf)
      const isUltimateCharge = this.ultimateActive && (this.ultimatePhase === 'CRATER_FADEIN' || this.ultimatePhase === 'CRATER');
      if (!isLowQuality && !isUltimateCharge) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(renderAngle);
        const normRenderAngle = Math.atan2(Math.sin(baseAngle), Math.cos(baseAngle));
        if (Math.abs(normRenderAngle) > Math.PI / 2) {
          ctx.scale(1, -1);
        }

        const isKatanaActiveCharge = isKatanaDrawn || isUltimateFinal || this.ambushPhase === 'KATANA_CHARGE';

        if (isKatanaActiveCharge) {
          ctx.translate(this.r + thrustDistance - 2, 0);
          ctx.scale(0.95, 0.95);

          const bStart = 44;
          const bLen = 120;
          const bWidth = 16;
          const curveY = -35;
          const spineStartX = bStart;
          const spineStartY = -bWidth / 2;
          const tipX = bStart + bLen;
          const tipY = -bWidth / 2 + curveY;
          const T_body = 0.82;
          const bodyEndX = bStart + bLen * T_body;
          const bodyEndY = bWidth / 2 + T_body * T_body * curveY;
          const bodyStartX = bStart;
          const bodyStartY = bWidth / 2;
          const tipCtrlX = 153.2;
          const tipCtrlY = -21.2;

          ctx.beginPath();
          ctx.moveTo(spineStartX, spineStartY);
          ctx.quadraticCurveTo(bStart + bLen * 0.5, spineStartY, tipX, tipY);
          ctx.quadraticCurveTo(tipCtrlX, tipCtrlY, bodyEndX, bodyEndY);
          ctx.quadraticCurveTo(bStart + (bodyEndX - bStart) * 0.5, bodyStartY, bodyStartX, bodyStartY);
          ctx.closePath();
        } else {
          ctx.translate(this.r + thrustDistance - 4, 0);
          ctx.scale(0.75, 0.75);

          // Exact Inverted Spear Blade Profile Path
          ctx.beginPath();
          ctx.moveTo(44, -7);
          ctx.lineTo(48, -7);
          ctx.lineTo(48, -9);
          ctx.lineTo(54, -9);
          ctx.lineTo(54, -7);
          ctx.lineTo(104, -7);
          ctx.lineTo(118, 1);
          ctx.lineTo(106, 7);
          ctx.lineTo(80, 7);
          ctx.lineTo(80, 2);
          ctx.lineTo(58, 2);
          ctx.arc(58, 4, 2, -Math.PI / 2, Math.PI / 2, true);
          ctx.lineTo(74, 6);
          ctx.lineTo(80, 14);
          ctx.lineTo(66, 16);
          ctx.lineTo(52, 11);
          ctx.lineTo(48, 11);
          ctx.lineTo(48, 8);
          ctx.lineTo(44, 8);
          ctx.closePath();
        }

        const glowColor = isKatanaActiveCharge ? 'rgba(140, 70, 220, 0.45)' : 'rgba(255, 20, 80, 0.95)';
        const strokeColor = isKatanaActiveCharge ? `rgba(180, 130, 240, ${0.45 + chargeRatio * 0.25})` : `rgba(255, 30, 75, ${0.75 + chargeRatio * 0.25})`;
        const strokeWidth = isKatanaActiveCharge ? 2.0 : 3.5;
        const shimmerColor = isKatanaActiveCharge ? `rgba(240, 230, 255, ${0.55 + Math.sin(now / 40) * 0.15})` : `rgba(255, 255, 255, ${0.85 + Math.sin(now / 40) * 0.15})`;
        const shimmerWidth = isKatanaActiveCharge ? 1.0 : 1.8;

        // Outer Blade Edge Outline - Simulated Glow
        ctx.save();
        ctx.strokeStyle = glowColor.replace('0.95', '0.25').replace('0.45', '0.15');
        ctx.lineWidth = strokeWidth * 2.5;
        ctx.stroke();
        ctx.restore();

        // Outer Blade Edge Outline
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();

        // Inner Razor Edge Shimmer Line
        ctx.strokeStyle = shimmerColor;
        ctx.lineWidth = shimmerWidth;
        ctx.stroke();

        ctx.restore();
      }
    }

    // 6. Draw Health text on TOP of body, chain, and weapon
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
    
    // Heavenly Restriction Floating Text is drawn on top layer by drawUltimateChannelingTexts()
    ctx.restore();
  }

  drawBody(ctx) {
    drawTojiSkin(ctx, this);
  }
}

