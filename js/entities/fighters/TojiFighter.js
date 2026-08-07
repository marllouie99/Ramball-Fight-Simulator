import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnSparks, spawnImpactFlash, spawnCrimsonLightningImpact, spawnMeleeClashShockwave, spawnArcaneSmoke, spawnTojiWhirlingWindDebris, spawnGroundScorch } from '../../graphics/particles/sparkEffect.js';
import { drawInvertedSpear, drawSplitSoulKatana, drawPhysicsChain, drawRestedKatanaOverShoulder, drawRestedInvertedSpearAtHip, TOJI_WEAPON_CONFIG } from '../../graphics/weapons/tojiWeaponGraphics.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { initChainPhysics as modInitChain, updateChainPhysics as modUpdateChain, performSplitSoulKatanaSlash as modKatanaSlash, performInvertedSpearStrike as modSpearStrike } from './toji/tojiWeapons.js';
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
    
    // Heavenly Restriction Stealth Passive (Configurable Duration & Cooldown)
    this.stealthMaxDuration = CONFIG.toji?.stealthDuration || 240;
    this.stealthMaxCooldown = CONFIG.toji?.stealthCooldown || 420;
    this.stealthTimer = this.stealthMaxDuration;
    this.stealthCooldown = 0;
    this.isStealthed = true;
    this.stealthActive = true;
    this.stealthAfterimages = [];

    // Ambush Sequence State
    this.isAmbushing = false;
    this.isSpinning = false;
    this._ultimateSlideTargetX = undefined;
    this._ultimateSlideTargetY = undefined;
    this._ultimateChargeFlipSign = undefined;
    this._ultimateChargeAngle = undefined;
    this.ambushPhase = null;
    this.ambushTimer = 0;

    // Inverted Spear of Heaven (Basic Attack)
    this.spearCooldown = 0;
    this.spearCooldownMax = CONFIG.toji?.spearCooldown || 40;
    this.spearRange = CONFIG.toji?.spearRange || 50;
    this.spearDamage = CONFIG.toji?.spearDamage || 12;
    this.spearSwingTimer = 0;
    this.spearSwingMax = 36;

    // Split Soul Katana
    // Physics Chain simulation
    this.chainNodes = [];
    this.ultimateCooldownMax = CONFIG.toji?.ultimateCooldown || 2500;
    this.ultimateCooldown = this.ultimateCooldownMax;
    this.ultimateActive = false;
    this.ultimatePhase = null;
    this.ultimateTimer = 0;
    this.ultimateTarget = null;
    this.ultimateAssaultCount = 0;
    this.immuneToCC = true;
    this.domainImmunity = true;
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
    this.stealthMaxCooldown = CONFIG.toji?.stealthCooldown || 420;
    this.stealthTimer = this.stealthMaxDuration;
    this.stealthCooldown = 0;
    this.isStealthed = true;
    this.stealthActive = true;
    this.stealthAfterimages = [];
    this.isAmbushing = false;
    this.isSpinning = false;
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

  interruptAttacks() {
    super.interruptAttacks();
    this.isAmbushing = false;
    this.ambushTarget = null;
    this.ambushPhase = null;
    this.ultimateActive = false;
    this.isChannelingDomain = false;
    this.ultimatePhase = null;
    this.ultimateTarget = null;
    this.katanaSlashTimer = 0;
    this.katanaSlashFadeTimer = 0;
    this._lastKatanaTimer = 0;
    this.slashSwingTimer = 0;
    if (this.swordTrail) this.swordTrail.length = 0;
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

  /**
   * Overrides takeDamage to implement Inverted Spear Melee Parry & Ambush Counter-Attack.
   */
  takeDamage(amount, attacker, opts = {}) {
    if (this.isDead || this.hp <= 0) return false;

    // Stealth & Ultimate Dodge Chance: physically dodge incoming projectiles while in stealth or during ultimate
    const isDodgeable = opts.isProjectile && !opts.isTrueDamage;
    let dodgeChance = CONFIG.toji?.stealthDodgeChance || 0.10;
    if (this.ultimateActive) {
      dodgeChance *= (CONFIG.toji?.ultimateDodgeMultiplier || 3.0);
    }
    
    const canDodge = isDodgeable && (this.isStealthed || this.ultimateActive);
    if (canDodge && Math.random() < dodgeChance) {
      spawnFloatingText(this.x, this.y - this.r - 5, 'DODGE!', '#a855f7');
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
        }, 30);
      }
      return false; // Damage dodged & negated!
    }

    // Check if an enemy Domain Expansion is currently active in the arena
    const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
    const isEnemyDomainActive = state.fighters && state.fighters.some((f, idx) => {
      if (!f || f === this || f.hp <= 0 || !f.domainActive) return false;
      const enemyTeam = state.getFighterTeam(idx);
      return myTeam === null || enemyTeam === null || myTeam !== enemyTeam;
    });

    // Inverted Spear Parry & Counter-Attack (active inside enemy domains against strikes/projectiles AND domain slash ticks!)
    const parryChance = CONFIG.toji?.parryChance || 0.45;
    const canParry = isEnemyDomainActive && (opts.isMelee || opts.isPhysical || !opts.isTrueDamage);

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
    this.ultimatePhase = 'CHANNELING';
    this.isChannelingDomain = true;
    this.ultimateChargeTimer = 0;
    this.ultimateChargeMax = CONFIG.toji?.ultimateChargeTime || 90; // 90 frames (1.5s channel)
    this.ultimateCooldown = this.ultimateCooldownMax;
    this.ultimateTarget = closest;
    this.ultimateAssaultCount = 0;
    
    // Clear any lingering stealth afterimages so they don't get stuck on screen
    this.stealthAfterimages = [];
    
    // Global dramatic screen shake and sound for domain channeling
    triggerGlobalScreenShake(6, 90);
    const channelSound = getSkillEffectSound('toji', 'ultimatechanneling');
    audioSystem.playSFX(channelSound?.src || 'Assets/Sound Effects/Skills/toji-ultimatechanneling.mp3', channelSound?.volume || 1.0, channelSound?.speed || 1.0, 0, channelSound?.delay || 0);
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
      
      if (!tojiIsTargetDeadOrRemoved(this, this.ultimateTarget)) {
        this.aim(this.ultimateTarget);
      }

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
        }, 30);
      }

      if (this.ultimateChargeTimer >= (this.ultimateChargeMax || 90)) {
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

    const maxStrikes = CONFIG.toji?.ultimateMaxStrikes || 5;
    
    // Transition to CRATER slam once the configured number of strikes is reached
    // We wait until he's fully in the 'VANISHED' phase after the final hit to transition smoothly
    if (this.ultimateAssaultCount >= maxStrikes && this.ultimatePhase === 'VANISHED' && this.ultimatePhase !== 'CRATER') {
      // Step 1: Fade in ABOVE the target (elevated charge position)
      this.ultimatePhase = 'CRATER_FADEIN';
      const fadeInFrames = CONFIG.toji?.ultimateCraterFadeInFrames ?? 30;
      this.ultimateCycleTimer = fadeInFrames;
      this.craterFadeInTotal = fadeInFrames;

      const finalBlowChargeSound = getSkillEffectSound('toji', 'finalblowcharging');
      audioSystem.playSFX(finalBlowChargeSound?.src || 'Assets/Sound Effects/Skills/tojo-finalblow-charging.mp3', finalBlowChargeSound?.volume || 1.5, finalBlowChargeSound?.speed || 1.0, 0, finalBlowChargeSound?.delay || 0);
      
      this.vx = 0;
      this.vy = 0;
      
      // Face the target and setup katana visual
      this.aim(this.ultimateTarget);
      this.ambushPhase = 'KATANA_CHARGE';
      this.phantomStrikeCount = 0;

      // Clear any active weapon slash trails to prevent purple outline during charge phase
      this.katanaSlashTimer = 0;
      this.katanaSlashFadeTimer = 0;

      // Snapshot the slide target position once to let him slide naturally without following the enemy dynamically
      const targetHoverX = this.ultimateTarget.x;
      const targetHoverY = this.ultimateTarget.y - 150;
      const clampedHover = this._clampToArena(targetHoverX, targetHoverY);
      this._ultimateSlideTargetX = clampedHover.x;
      this._ultimateSlideTargetY = clampedHover.y;

      // Snapshot the facing angle and flip sign once to lock them for the entire charging sequence
      const currentBaseAngle = this.gunAngle !== undefined ? this.gunAngle : this.angle;
      const currentNormAngle = Math.atan2(Math.sin(currentBaseAngle), Math.cos(currentBaseAngle));
      this._ultimateChargeFlipSign = Math.abs(currentNormAngle) > Math.PI / 2 ? -1 : 1;
      this._ultimateChargeAngle = currentBaseAngle;

      return;
    }

    // Phase: Fade-in — Toji materializes above the target, standing still
    if (this.ultimatePhase === 'CRATER_FADEIN') {
      this.ultimateCycleTimer--;
      
      // Smooth slide to overhead position
      const slideTX = this._ultimateSlideTargetX !== undefined ? this._ultimateSlideTargetX : this.ultimateTarget.x;
      const slideTY = this._ultimateSlideTargetY !== undefined ? this._ultimateSlideTargetY : (this.ultimateTarget.y - 150);
      this.x += (slideTX - this.x) * 0.08;
      this.y += (slideTY - this.y) * 0.08;
      
      this.vx = 0;
      this.vy = 0;
      
      // Slow rotation on body tracking during ultimate charging phase
      if (this.ultimateTarget) {
        const targetAngle = Math.atan2(this.ultimateTarget.y - this.y, this.ultimateTarget.x - this.x);
        const currentAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
        let diff = targetAngle - currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const turnRate = 0.035; // Sluggish slow tracking
        this.gunAngle = currentAngle + diff * turnRate;
        this.angle = this.gunAngle;
      }
      
      // Spawn swirling wind debris (leaves & pebbles) around Toji as he materializes
      if (this.ultimateCycleTimer % 2 === 0) {
        spawnTojiWhirlingWindDebris(this.x, this.y, 2);
      }
      
      if (this.ultimateCycleTimer <= 0) {
        // Fully visible now — transition to CRATER charge (charge sword in place, then dive)
        this.ultimatePhase = 'CRATER';
        
        const chargeTime = CONFIG.toji?.ultimateCraterChargeTime ?? 30;
        const diveTime = CONFIG.toji?.ultimateCraterDiveTime ?? 15;
        this.ultimateCycleTimer = chargeTime + diveTime;
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
        this.angle = angle + Math.PI; // Face target
        this.gunAngle = this.angle;
        
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
      
      // The blade actually connects with the target: trigger damage and impact effects
      // Hardcoded to frame 8 for a perfect sync with the visual swing apex
      if (this.ultimateCycleTimer === 8) {
        const colors = ['#A040FF', '#FF2040', '#404040', '#FFD700']; // Purple, Red, Grey, Gold
        const color = colors[this.ultimateAssaultCount % 4];
        
        spawnImpactFlash(this.ultimateTarget.x, this.ultimateTarget.y, 45, color);
        spawnMeleeClashShockwave(this.ultimateTarget.x, this.ultimateTarget.y, 80, 'toji');
        audioSystem.playSFX('attack_swordswing', 0.9);
        audioSystem.playSFX('attack_fleshhit', 0.9);
        audioSystem.playSFX('skill_backstab', 0.85);
        triggerGlobalScreenShake(3, 10); // Small, crisp screen shake on hit
        
        // Apply knockback
        if (!this.ultimateTarget.isTurret && !this.ultimateTarget.cannotBeKnockbacked) {
          const angleToTarget = Math.atan2(this.ultimateTarget.y - this.y, this.ultimateTarget.x - this.x);
          const kbForce = 15;
          this.ultimateTarget.vx += Math.cos(angleToTarget) * kbForce;
          this.ultimateTarget.vy += Math.sin(angleToTarget) * kbForce;
        }
        
        applyDamageToTarget(this.ultimateTarget, CONFIG.toji?.ultimateAssaultDamage || 30, this, { isMelee: true, isTrueDamage: true });
        
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
        if (vanishSound) audioSystem.playSFX(vanishSound.src, vanishSound.volume);
        
        this.ultimatePhase = 'VANISHED';
        this.ultimateCycleTimer = CONFIG.toji?.ultimateVanishDuration ?? 120;
      }
      return;
    }

    // Phase 3: Crater Slam (Final Finisher)
    if (this.ultimatePhase === 'CRATER') {
      if (this.ambushTimer > 0) this.ambushTimer--; // Tick the native charge animation down
      
      const diveTime = CONFIG.toji?.ultimateCraterDiveTime ?? 15;
      
      if (this.ultimateCycleTimer > diveTime) {
        this.ultimateCycleTimer--;
        
        // Slide to hover position during the charge phase too, ensuring he arrives perfectly!
        const slideTX = this._ultimateSlideTargetX !== undefined ? this._ultimateSlideTargetX : this.ultimateTarget.x;
        const slideTY = this._ultimateSlideTargetY !== undefined ? this._ultimateSlideTargetY : (this.ultimateTarget.y - 150);
        this.x += (slideTX - this.x) * 0.12;
        this.y += (slideTY - this.y) * 0.12;
        
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
        const targetAngle = Math.atan2(this.ultimateTarget.y - this.y, this.ultimateTarget.x - this.x);
        const currentAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
        let diff = targetAngle - currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const turnRate = 0.035; // Sluggish slow tracking
        this.gunAngle = currentAngle + diff * turnRate;
        this.angle = this.gunAngle;
      } else if (this.ultimateCycleTimer === diveTime) {
        this.ultimateCycleTimer--;
        
        // Launch! Calculate exact velocity needed to reach target in diveTime frames
        this.ambushPhase = 'KATANA_SLASH';
        this.katanaSlashTimer = 16;
        
        const dx = this.ultimateTarget.x - this.x;
        const dy = this.ultimateTarget.y - this.y;
        // Divide distance by remaining frames so he arrives exactly on time
        this.vx = dx / diveTime;
        this.vy = dy / diveTime;

        // --- GROUND SHOCKWAVE BENEATH HIS LAUNCH POSITION ---
        triggerGlobalScreenShake(6, 12);
        
        // Calculate ground position directly beneath his aerial launch
        const arenaBaseY = (CONFIG.arena?.y || 0) + (CONFIG.arena?.height || 600) - 30;
        const groundY = Math.min(arenaBaseY, Math.max(this.y + 100, this.ultimateTarget ? this.ultimateTarget.y : arenaBaseY));
        
        spawnImpactFlash(this.x, groundY, 85, 'rgba(255, 255, 255, 0.95)');

        const finalBlowSound = getSkillEffectSound('toji', 'ultimatefinalblow');
        audioSystem.playSFX(finalBlowSound?.src || 'Assets/Sound Effects/Skills/toji-ultimate-finalblow.mp3', finalBlowSound?.volume || 1.5, finalBlowSound?.speed || 1.0, 0, finalBlowSound?.delay || 0);
        audioSystem.playSFX('attack_swordswing', 1.0);
      } else if (this.ultimateCycleTimer > 0) {
        this.ultimateCycleTimer--;
        
        // Dive physics — smooth travel toward target
        this.x += this.vx;
        this.y += this.vy;
        const clampedDive = this._clampToArena(this.x, this.y);
        this.x = clampedDive.x;
        this.y = clampedDive.y;
        if (this.katanaSlashTimer > 0) this.katanaSlashTimer--;

        // 360 degree spin while unleashing the final blow
        const diveAngle = Math.atan2(this.vy, this.vx);
        const spinProgress = 1 - (this.ultimateCycleTimer / diveTime);
        this.angle = diveAngle + (Math.PI * 2 * spinProgress);
        this.gunAngle = this.angle;
        this.isSpinning = true;
      } else {
        // Impact — he's already at the target from the smooth dive
        triggerGlobalScreenShake(12, 40);
        spawnImpactFlash(this.x, this.y, 140, 'rgba(255, 30, 75, 0.95)');
        spawnCrimsonLightningImpact(this.x, this.y, 160);
        spawnSparks(this.x, this.y, 50, 'crimsonSniper');
        audioSystem.playSFX('attack_groundsmash', 1.2);
        
        applyDamageToTarget(this.ultimateTarget, CONFIG.toji?.ultimateCraterDamage || 65, this, { isMelee: true, isTrueDamage: true });

        // Unfreeze target & apply massive kinetic ricochet knockback launch!
        if (!tojiIsTargetDeadOrRemoved(this, this.ultimateTarget)) {
          this._clearTargetFreeze(this.ultimateTarget);
          if (!this.ultimateTarget.isTurret && !this.ultimateTarget.cannotBeKnockbacked) {
            this.ultimateTarget.isFirstHitKnockback = false; // Enable ricochet wall bouncing!
            const kbAngle = Math.atan2(this.ultimateTarget.y - this.y, this.ultimateTarget.x - this.x);
            const kbForce = (CONFIG.toji?.ambushKnockbackForce || 48) * 1.1; // 53px/frame explosive velocity!
            const kbVx = Math.cos(kbAngle) * kbForce;
            const kbVy = Math.sin(kbAngle) * kbForce;
            this.ultimateTarget.vx = kbVx;
            this.ultimateTarget.vy = kbVy;
            this.ultimateTarget.knockbackDecay = 0.90; // Smooth kinetic deceleration
            if (typeof this.ultimateTarget.applyKnockback === 'function') {
              this.ultimateTarget.applyKnockback(kbVx, kbVy);
            }
          }
        }
        
        // ALWAYS cleanup ultimate state, even if target was killed!
        this._clearTargetFreeze(this);
        this.ultimateActive = false;
        this.isSpinning = false;
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
        this.stealthTimer = 40;
        this.stealthCooldown = 40; // Triggers next ambush within 1 second after ultimate finishes!
        this.isStealthed = true;
        this.stealthActive = true;
      }
      return;
    }
  }

  _updateAfterImages() {
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

  /**
   * Main update loop for Toji's mechanics.
   */
  update(opponent, ownerIndex, arena) {
    // Check Mahoraga Divine Adaptation Freeze first (bypasses Heavenly Restriction immunity)
    if (this.mahoragaAdaptationFreezeTimer > 0) {
      this.mahoragaAdaptationFreezeTimer--;
      this.vx = 0;
      this.vy = 0;
      return; // Freeze Toji mid-action during Mahoraga's 3D Wheel rotation!
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

    // Heavenly Restriction: Toji passively purges standard slow effects, EXCEPT Gojo's Reversal Red spatial repulsion slow and Mahoraga's Divine Shout!
    if ((this.redSlowTimer || 0) > 0) {
      this.redSlowTimer--;
      this.slowTimer = Math.max(this.slowTimer || 0, 2);
    } else if ((this.mahoragaShoutSlowTimer || 0) > 0) {
      this.mahoragaShoutSlowTimer--;
      this.slowTimer = Math.max(this.slowTimer || 0, 2);
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
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // Toji Heavenly Restriction Immunity: Immune to time-stop, domain freeze, hit stun, and CC
    this.timeStopTimer = 0;
    this.hitStunTimer = 0;
    this.knockbackStunTimer = 0;
    this.electricStunTimer = 0;
    this.dubstepStunTimer = 0;
    this.crimsonElectrifiedTimer = 0;
    this._suppressFreezeTimer = 0;

    if (this._handleTimeStop()) {
      return;
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
        this.katanaSlashFadeTimer = 10;
      }
    } else if (this.katanaSlashFadeTimer > 0) {
      this.katanaSlashFadeTimer--;
    }

    // Handle Ultimate Sequence
    if (this.ultimateActive) {
      // Purge knockback forces — Toji controls his own position during ultimate
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.knockbackStunTimer = 0;
      this.updateUltimate(arena, ownerIndex);
      return;
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

    // Natural movement & wall bounce physics: nudge velocity towards opponent when stopped or low speed
    if (this.postUltimateRecoveryTimer > 0) this.postUltimateRecoveryTimer--;
    if (opponent && opponent.hp > 0 && (this.knockbackStunTimer || 0) <= 0) {
      // Natural movement & wall bounce physics: nudge velocity towards opponent when stopped or low speed
      const currentSpeed = Math.hypot(this.vx || 0, this.vy || 0);
      if (currentSpeed < 0.2) {
        const dx = opponent.x - this.x;
        const dy = opponent.y - this.y;
        const moveAngle = Math.atan2(dy, dx);
        this.vx = Math.cos(moveAngle) * (this.speed || 3.5);
        this.vy = Math.sin(moveAngle) * (this.speed || 3.5);
        this.normalizeSpeed();
      }
    }

    // Handle Stealth Duration & Cooldown Timers (SKIPPED IN DEMO PREVIEW MODE)
    if (!this.isDemoFighter && modUpdateStealth(this, opponent)) return;

    // Update katana slash fade timer
    if (this.katanaSlashFadeTimer > 0) this.katanaSlashFadeTimer--;

    // Basic movement and aim logic (Pure natural bounce physics!)
    let moveVx = this.vx;
    let moveVy = this.vy;
    if (this.slowTimer > 0) {
      moveVx *= this.slowMultiplier;
      moveVy *= this.slowMultiplier;
    }
    this.x += moveVx;
    this.y += moveVy;

    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);

    // Inverted Spear of Heaven Melee Strike Logic
    if (!tojiIsTargetDeadOrRemoved(this, opponent)) {
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
   * Aim logic: rotates Toji's weapon and body angle toward the opponent.
   */
  aim(opponent) {
    if (!tojiIsTargetDeadOrRemoved(this, opponent)) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const targetAngle = Math.atan2(dy, dx);
      this.gunAngle = targetAngle;
      this.angle = targetAngle;
    } else {
      this.gunAngle = this.angle;
    }
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
    target.timeStopTimer = 0;
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
        ctx.fillStyle = `rgba(255, 255, 255, ${0.30 * progress})`;
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
    const isSpinningDive = this.ultimateActive && this.ultimatePhase === 'CRATER' && (this.ultimateCycleTimer || 0) <= (CONFIG.toji?.ultimateCraterDiveTime || 15);
    const isCraterCharge = this.ultimateActive && (this.ultimatePhase === 'CRATER_FADEIN' || (this.ultimatePhase === 'CRATER' && (this.ultimateCycleTimer || 0) > (CONFIG.toji?.ultimateCraterDiveTime || 15)));
    
    const _katanaFlipSign = isSpinningDive 
      ? 1 
      : (isCraterCharge && this._ultimateChargeFlipSign !== undefined) 
        ? this._ultimateChargeFlipSign 
        : (Math.abs(_normBaseAngle) > Math.PI / 2 ? -1 : 1);

    let offsetAngle = 0.42; // Lore low assassin side guard stance
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

      // Deep coiled weapon charging stance: hand and weapon held steady at shoulder ready to plunge
      thrustDistance = -24;
      offsetAngle = 0.50;

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
        const diveTime = CONFIG.toji?.ultimateCraterDiveTime ?? 15;
        const craterElapsed = craterChargeTotal - Math.max(0, this.ultimateCycleTimer - diveTime);
        const elapsed = fadeInTotal + craterElapsed;
        chargeRatio = Math.min(1.0, Math.max(0, elapsed / fullChargeTotal));
      } else if (this.ambushTimer > 0) {
        const maxPause = CONFIG.toji?.ambushKatanaChargeDuration || 20;
        chargeRatio = Math.min(1.0, Math.max(0, 1 - (this.ambushTimer / maxPause)));
      }

      // Smoothly animate weapon coiling back from guard stance (0.42) to deep charge stance (-0.95)
      const easeCurve = Math.sin(chargeRatio * Math.PI * 0.5);
      thrustDistance = -22 * easeCurve;
      // Mirror the charge coil direction when Toji faces left so the weapon coils on the correct side
      offsetAngle = (0.42 + (-0.95 - 0.42) * easeCurve) * _katanaFlipSign;

      // Subtle weapon vibration tremor as energy builds up
      const tremorVal = (Math.random() - 0.5) * 1.5 * chargeRatio;
      thrustDistance += tremorVal;
      offsetAngle += (Math.random() - 0.5) * 0.025 * chargeRatio;

      // Render Katana Charging Soul Flare at blade tip (intensifies as he coils back!)
      // Skip during the ultimate's charging phase to keep the blade clean.
      const isUltimateCharge = this.ultimateActive && (this.ultimatePhase === 'CRATER_FADEIN' || this.ultimatePhase === 'CRATER');
      if (!isUltimateCharge) {
        ctx.save();
        const renderAngle = baseAngle + offsetAngle;
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
      }

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

      const isSpinningDive = this.ultimateActive && this.ultimatePhase === 'CRATER' && (this.ultimateCycleTimer || 0) <= (CONFIG.toji?.ultimateCraterDiveTime || 15);
      if (isSpinningDive) {
        const diveTime = CONFIG.toji?.ultimateCraterDiveTime || 15;
        const spinProgress = 1 - (this.ultimateCycleTimer / diveTime);
        thrustDistance = 28;
        offsetAngle = 0.15;
        slashArcAlpha = Math.min(1.0, spinProgress * 3.0) * (1 - Math.max(0, (spinProgress - 0.7) / 0.3));
        this._activeSlashProgress = spinProgress;
        this._recoveryProgress = 0;
      } else if (t < 0.05) {
        // Phase 1: Ultra-fast snap to cocked upper-right position (snaps to -1.15 almost instantly)
        const p = t / 0.05;
        thrustDistance = -14 * p;
        offsetAngle = (0.42 - 1.57 * p) * _katanaFlipSign;
        slashArcAlpha = 0;
        this._activeSlashProgress = 0;
        this._recoveryProgress = 0;
      } else if (t < 0.65) {
        // Phase 2: Downward sweep
        const p = (t - 0.05) / 0.60;
        const sweepCurve = Math.sin(p * Math.PI * 0.5);
        thrustDistance = -14 + 48 * sweepCurve;
        offsetAngle = (-1.15 + 2.40 * sweepCurve) * _katanaFlipSign; // Sweeps from -1.15 to +1.25 (wider, 137 degrees)
        slashArcAlpha = Math.min(1.0, p * 4.0); // Fades in instantly and stays at 1.0
        this._activeSlashProgress = p; // Store the progress on this for trailing erase effect
        this._recoveryProgress = 0;
      } else {
        const p = (t - 0.65) / 0.35;
        const easeP = p * (2 - p);
        thrustDistance = 34 * (1 - easeP);
        offsetAngle = 1.25 * (1 - easeP) * _katanaFlipSign; // Recovery from +1.25 to 0
        slashArcAlpha = 1 - p; // Fades out during recovery phase
        this._activeSlashProgress = 1.0;
        this._recoveryProgress = p; // Store recovery progress
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
          offsetAngle = 0.50 * (1 - p);
          slashArcAlpha = 0;
        } else if (t < 0.72) {
          const p = (t - 0.12) / 0.60;
          const thrustProgress = Math.min(1.0, p * 4.0); // Drives forward in 3 frames, then HOLDS at +70px!
          thrustDistance = -24 + 94 * thrustProgress; // Plunges from -24px to +70px forward deep inside target body!
          offsetAngle = 0; // Pure linear piercing thrust directly forward into enemy spine
          slashArcAlpha = Math.sin(p * Math.PI);

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
          offsetAngle = 0.42 * easeP;
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
          offsetAngle = 0.42 - 1.57 * p;   // 0.42 → -1.15 (upper-right, 11 o'clock)
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
          offsetAngle = -1.15 + 2.20 * sweepCurve;            // -1.15 → +1.05 (wider top-to-bottom arc, 126 degrees)
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
          offsetAngle = 1.05 + (0.42 - 1.05) * easeP;          // +1.05 → +0.42
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
        offsetAngle = (Math.PI / 3.5) - (Math.PI * 0.6) * Math.min(1.0, progress * 2.5);
        thrustDistance = 12 * Math.sin(progress * Math.PI);
      } else {
        // Guard Pose: Hold Inverted Spear flat across chest
        offsetAngle = Math.PI / 2;
        thrustDistance = -6;
      }
    } else {
      // Idle assassin stance breathing sway
      offsetAngle += Math.sin(now / 250) * 0.05;
    }

    const renderAngle = baseAngle + offsetAngle;

    // 1. Draw motion ghosting shadow during thrust lunge (shows hand & weapon driving forward)
    if (isAttacking && attackPhaseProgress >= 0.15 && attackPhaseProgress <= 0.70) {
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

    // 1.4. High-Speed Stealth & Domain Motion Trail Afterimages (Matches Gojo & Sukuna teleport visual system)
    if (this.stealthAfterimages && this.stealthAfterimages.length > 0) {
      const skipAlternate = (typeof state !== 'undefined' && state.fps && state.fps < 45);
      for (let i = 0; i < this.stealthAfterimages.length; i++) {
        if (skipAlternate && i % 2 === 0) continue;
        const img = this.stealthAfterimages[i];
        if (!img || img.timer <= 0) continue;

        const maxT = img.maxTimer || 20;
        const progress = Math.max(0, Math.min(1, img.timer / maxT));
        const alpha = img.alpha !== undefined ? img.alpha : ((img.initialAlpha || 0.75) * Math.pow(progress, 0.7));

        if (alpha <= 0.01) continue;

        ctx.save();

        // 1. Dash Trajectory Line (skip in low quality for perf)
        if (!isLowQuality && img.fromX !== undefined && img.toX !== undefined) {
          const lineHex = img.isDomainAfterimage ? '#A040FF' : '#8A2BE2';
          ctx.save();
          ctx.globalAlpha = alpha * 0.6;
          ctx.strokeStyle = lineHex;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(img.fromX, img.fromY);
          ctx.lineTo(img.toX, img.toY);
          ctx.stroke();

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(img.fromX, img.fromY);
          ctx.lineTo(img.toX, img.toY);
          ctx.stroke();
          ctx.restore();
        }

        ctx.translate(img.x, img.y);
        ctx.rotate(img.angle || 0);

        // 2. Cursed Energy Aura Glow — flat concentric fills instead of radial gradient (perf: eliminates gradient allocation)
        if (!isLowQuality) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.beginPath();
          ctx.arc(0, 0, this.r * 1.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(160, 64, 255, ${alpha * 0.4})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, 0, this.r * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
          ctx.fill();
          ctx.restore();
        }

        // 3. Body Circle Silhouette & Outer Glow Ring
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(0, 0, this.r * 1.1, 0, Math.PI * 2);
        ctx.fillStyle = img.isDomainAfterimage ? '#281438' : '#1A0B26';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 4. Anime Eye Glints (skip in low quality)
        if (!isLowQuality) {
          ctx.fillStyle = '#E0FFFF';
          ctx.beginPath();
          ctx.arc(this.r * 0.5, -this.r * 0.25, 3, 0, Math.PI * 2);
          ctx.arc(this.r * 0.5, this.r * 0.25, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        ctx.restore();
      }
    }

    // 1.5. Solid Dark Shadow Purple Stealth Ring & Breather Indicator
    if (this.isStealthed) {
      ctx.save();
      
      // Pulse effect
      const pulse = 1 + Math.sin(now / 150) * 0.15;
      const ringRadius = (this.r + 8) * pulse;
      
      // Draw base glowing ring
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(160, 60, 255, 0.15)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(160, 60, 255, 0.6)';
      ctx.lineWidth = 2.0;
      ctx.stroke();
      
      // Draw countdown arc (Breather timer)
      const maxStealth = 120; // The fixed 2-second breather duration
      const ratio = Math.max(0, Math.min(1, this.stealthTimer / maxStealth));
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringRadius + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * ratio));
      ctx.strokeStyle = '#A040FF';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      ctx.restore();
    }

    // 1.8. Draw Rested Weapon on BACK LAYER (Behind Toji's body circle)
    const isKatanaDrawn = (this.ambushPhase === 'KATANA_DRAW' || this.ambushPhase === 'KATANA_CHASE' || this.ambushPhase === 'KATANA_CHARGE' || this.ambushPhase === 'KATANA_SLASH' || this.ambushPhase === 'KATANA_RECOVERY') && !this.ultimateActive;
    const isKatanaActiveInHand = isKatanaDrawn || (this.ambushPhase === 'PHANTOM_FLURRY' && !this.ultimateActive);
    const isUltimateFinal = this.ultimateActive && (this.ultimatePhase === 'CRATER_FADEIN' || this.ultimatePhase === 'CRATER' || this.ultimatePhase === 'CRATER_DIVE');
    const isCountdown = (typeof state !== 'undefined' && state.gameState === 'countdown') || this._isWinnerReveal;

    if (isKatanaDrawn) {
      drawRestedInvertedSpearAtHip(ctx, this.x, this.y, baseAngle, this.r, this.chainNodes);
    } else if (isCountdown) {
      drawRestedKatanaOverShoulder(ctx, this.x, this.y, baseAngle, this.r);
    }

    // 2. Draw base circle body and outline
    this.drawBody(ctx);
    this.drawOutline(ctx);

    // 3. Draw physics chain trailing naturally in world space
    drawPhysicsChain(ctx, this.chainNodes);

    // 4. HIGH-IMPACT ANIME SLASH VISUAL EFFECTS (Impact & Recovery Phase)
    if (slashArcAlpha > 0) {
      ctx.save();
      // Use the world-space origin snapshotted at swing-start so the slash arc stays
      // fixed in place and does NOT follow Toji as he moves during or after the swing.
      const isSpinningDive = this.ultimateActive && this.ultimatePhase === 'CRATER' && (this.ultimateCycleTimer || 0) <= (CONFIG.toji?.ultimateCraterDiveTime || 15);
      const isUltimateStriking = this.ultimateActive && this.ultimatePhase === 'STRIKING';
      const _slashOriginX = (isUltimateStriking || isSpinningDive || this._slashOriginX === undefined) ? this.x : this._slashOriginX;
      const _slashOriginY = (isUltimateStriking || isSpinningDive || this._slashOriginY === undefined) ? this.y : this._slashOriginY;
      ctx.translate(_slashOriginX, _slashOriginY);

      if (this.ambushPhase === 'KATANA_SLASH') {
        // Use the snapshotted angle from the moment the swing began so the crescent does NOT
        // follow the live gunAngle after 1 swing (which caused it to visually change direction).
        // Crucially, do NOT add offsetAngle to ctx.rotate here — offsetAngle animates the weapon position,
        // but the slash visual must stay locked at the frozen target direction for its full lifetime.
        const frozenAngle = (isSpinningDive || this._slashStartAngle === undefined) ? baseAngle : this._slashStartAngle;
        const frozenFlip  = (isSpinningDive || this._slashStartFlipSign === undefined) ? _katanaFlipSign : this._slashStartFlipSign;
        ctx.rotate(frozenAngle);
        const normAngle = Math.atan2(Math.sin(frozenAngle), Math.cos(frozenAngle));
        if (Math.abs(normAngle) > Math.PI / 2) {
          ctx.scale(1, -1);
        }

        // --- DYNAMIC SLIM, LONG, ELEGANT VOID-PURPLE ANIME CRESCENT SLASH WAVE ---
        // tipAngle dynamically tracks the weapon tip (offsetAngle * frozenFlip).
        // tailAngle stretches back to the start offset (-1.15) up to a max length of 1.8 radians.
        const p = this._activeSlashProgress !== undefined ? this._activeSlashProgress : 0;
        const recP = this._recoveryProgress !== undefined ? this._recoveryProgress : 0;

        let tipAngle, tailAngle;
        let startAngle, endAngle;
        let maxTrailLength = 1.8;
        if (isSpinningDive) {
          // Stretch and follow tip of blade during 360 spin
          maxTrailLength = 3.8;
          const trailLength = maxTrailLength * Math.min(1.0, p * 1.5);
          tipAngle = 0.15;
          tailAngle = tipAngle - trailLength;
          if (frozenFlip === 1) {
            startAngle = tipAngle - trailLength;
            endAngle = tipAngle;
          } else {
            startAngle = tipAngle;
            endAngle = tipAngle + trailLength;
          }
        } else {
          // Keep the tip locked at the end of the swing (+1.25) during recovery
          const currentOffset = recP > 0 ? 1.25 : (offsetAngle * frozenFlip);
          const startOffset = -1.15;
          maxTrailLength = 1.8;

          let activeTrailLength = maxTrailLength;
          // Erases from beginning to end during recovery phase
          if (recP > 0) {
            activeTrailLength = maxTrailLength * Math.pow(1 - recP, 1.4);
          }

          tipAngle = currentOffset;
          tailAngle = Math.max(startOffset, currentOffset - activeTrailLength);
          startAngle = tailAngle;
          endAngle = tipAngle;
        }

        const outerR = this.r + thrustDistance + (isSpinningDive ? 146 : 122); // Dynamically tracks Katana blade tip!
        const thickScale = isSpinningDive ? 1.0 : (recP > 0 ? Math.pow(1 - recP, 1.4) : 1.0);
        const maxThick = 22 * thickScale; // Slim, razor-sharp crescent thickness!
        const steps = isLowQuality ? 18 : 32;

        // 1. Outer Neon Violet Glowing Aura (Slim & Crisp)
        ctx.beginPath();
        ctx.arc(0, 0, outerR + 4, startAngle, endAngle, false);
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const angle = startAngle + (endAngle - startAngle) * t;
          const taper = Math.pow(Math.sin(t * Math.PI), 1.4) * (0.3 + 0.7 * t);
          const thick = (maxThick + 5) * taper;
          const r = (outerR + 4) - thick;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(160, 30, 240, ${slashArcAlpha * 0.70})`;
        ctx.fill();

        // 2. Inner Deep Crimson / Violet Secondary Flare
        ctx.beginPath();
        ctx.arc(0, 0, outerR + 1.5, startAngle, endAngle, false);
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const angle = startAngle + (endAngle - startAngle) * t;
          const taper = Math.pow(Math.sin(t * Math.PI), 1.4) * (0.3 + 0.7 * t);
          const thick = (maxThick + 2) * taper;
          const r = (outerR + 1.5) - thick;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(220, 20, 100, ${slashArcAlpha * 0.80})`;
        ctx.fill();

        // 3. Void-Black Pitch Dark Cursed Energy Core (Slim, Long, & Jagged Notches)
        ctx.beginPath();
        ctx.arc(0, 0, outerR, startAngle, endAngle, false);
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const angle = startAngle + (endAngle - startAngle) * t;
          const taper = Math.pow(Math.sin(t * Math.PI), 1.4) * (0.3 + 0.7 * t);
          let thick = maxThick * taper;

          // Subtle sharp inner teeth notches matching reference image
          const notchPattern = Math.sin(t * Math.PI * 10);
          if (notchPattern > 0.65 && t > 0.15 && t < 0.85) {
            thick += 4.5 * (notchPattern - 0.65);
          }

          const r = outerR - thick;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(12, 4, 20, ${slashArcAlpha * 0.96})`;
        ctx.fill();

        // 4. Electric Violet / Pure White Razor Edge Line
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const angle = startAngle + (endAngle - startAngle) * t;
          const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
          const thick = maxThick * taper;
          const r = outerR - thick * 0.25;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(235, 140, 255, ${slashArcAlpha})`;
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const angle = startAngle + (endAngle - startAngle) * t;
          const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
          const thick = maxThick * taper;
          const r = outerR - thick * 0.25;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${slashArcAlpha * 0.9})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (this.isAmbushThrust && this.ambushPhase !== 'PHANTOM_FLURRY') {
        // Lock thrust cone to the snapshotted direction at swing-start (never drifts mid-thrust)
        const thrustFrozenAngle = this._slashStartAngle !== undefined ? this._slashStartAngle : baseAngle;
        ctx.rotate(thrustFrozenAngle);
        // --- MASSIVE PIERCING THRUST CONE SHOCKWAVE ---
        const spearTipR = this.r + thrustDistance + 10;
        // A. Deep Purple Cursed Energy Outer Flare Cone
        ctx.beginPath();
        ctx.moveTo(spearTipR, -26 * slashArcAlpha);
        ctx.lineTo(spearTipR + 85 * slashArcAlpha, 0);
        ctx.lineTo(spearTipR, 26 * slashArcAlpha);
        ctx.closePath();
        ctx.fillStyle = `rgba(160, 90, 240, ${slashArcAlpha * 0.5})`;
        ctx.fill();

        // B. Crimson Nullification Energy Edge Cone
        ctx.beginPath();
        ctx.moveTo(spearTipR + 2, -18 * slashArcAlpha);
        ctx.lineTo(spearTipR + 95 * slashArcAlpha, 0);
        ctx.lineTo(spearTipR + 2, 18 * slashArcAlpha);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 30, 75, ${slashArcAlpha * 0.75})`;
        ctx.fill();

        // C. Hyper-Bright Razor White Piercing Thrust Core
        ctx.beginPath();
        ctx.moveTo(spearTipR + 5, -10 * slashArcAlpha);
        ctx.lineTo(spearTipR + 105 * slashArcAlpha, 0);
        ctx.lineTo(spearTipR + 5, 10 * slashArcAlpha);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 255, ${slashArcAlpha * 0.95})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 255, ${slashArcAlpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // D. Linear High-Speed Air Piercing Speed Lines
        const offsetys = [-18, -10, 0, 10, 18];
        ctx.strokeStyle = `rgba(255, 255, 255, ${slashArcAlpha * 0.9})`;
        ctx.lineWidth = 1.8;
        for (const oy of offsetys) {
          ctx.beginPath();
          ctx.moveTo(this.r + 10, oy);
          ctx.stroke();
        }
      } else if (this.ambushPhase === 'PHANTOM_FLURRY') {
        // --- DUAL-WIELD PHANTOM FLURRY SLASH ARCS ---
        const drawArc = (arcAngle, radius, thick, alpha, color1, color2, color3) => {
          ctx.save();
          // Use frozen angle so each flurry arc stays locked to the blade direction at strike-start
          const frozenAngle = this._slashStartAngle !== undefined ? this._slashStartAngle : baseAngle;
          ctx.rotate(frozenAngle + arcAngle);
          const normAngle = Math.atan2(Math.sin(frozenAngle), Math.cos(frozenAngle));
          if (Math.abs(normAngle) > Math.PI / 2) {
            ctx.scale(1, -1);
          }

          // Calculate swing progress: timer counts down from maxSlashFrames to 0
          const animMult = (TOJI_WEAPON_CONFIG?.animationSpeed || 1.0) * (TOJI_WEAPON_CONFIG?.katanaSlashAnimSpeed || 1.0);
          const maxSlashFrames = Math.max(1, (CONFIG.toji?.flurrySlashDuration || TOJI_WEAPON_CONFIG?.flurrySlashDuration || 12) / animMult);
          const timer = this.phantomSlashTimer || 0;
          const rawP = Math.min(1.0, Math.max(0, timer / maxSlashFrames));
          const progress = 1 - rawP; // actual progress of swing from 0 to 1

          const swingType = (this.phantomStrikeCount || 0) % 3;
          const sweepDir = (swingType === 1) ? 1 : -1;

          const maxTrailLength = Math.PI * 0.95;
          let activeTrailLength = 0;

          // Growing, sustained, and erasing trail phases
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
          const steps = isLowQuality ? 16 : 30;

          // Scale thickness proportionally with the trail length to prevent blunt bulkiness when short
          thick = thick * (activeTrailLength / maxTrailLength);

          ctx.beginPath();
          ctx.arc(0, 0, radius + 4, tailAngle, tipAngle, false);
          for (let i = steps; i >= 0; i--) {
            const t = i / steps;
            const angle = tailAngle + (tipAngle - tailAngle) * t;
            const taper = Math.pow(Math.sin(t * Math.PI), 1.4) * (0.3 + 0.7 * t);
            const th = (thick + 5) * taper;
            ctx.lineTo(Math.cos(angle) * (radius + 4 - th), Math.sin(angle) * (radius + 4 - th));
          }
          ctx.fillStyle = `rgba(${color1}, ${alpha * 0.70})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(0, 0, radius + 1.5, tailAngle, tipAngle, false);
          for (let i = steps; i >= 0; i--) {
            const t = i / steps;
            const angle = tailAngle + (tipAngle - tailAngle) * t;
            const taper = Math.pow(Math.sin(t * Math.PI), 1.4) * (0.3 + 0.7 * t);
            const th = (thick + 2) * taper;
            ctx.lineTo(Math.cos(angle) * (radius + 1.5 - th), Math.sin(angle) * (radius + 1.5 - th));
          }
          ctx.fillStyle = `rgba(${color2}, ${alpha * 0.80})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(0, 0, radius, tailAngle, tipAngle, false);
          for (let i = steps; i >= 0; i--) {
            const t = i / steps;
            const angle = tailAngle + (tipAngle - tailAngle) * t;
            const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
            let th = thick * taper;
            const notch = Math.sin(t * Math.PI * 10);
            if (notch > 0.65 && t > 0.15 && t < 0.85) th += 4.5 * (notch - 0.65);
            ctx.lineTo(Math.cos(angle) * (radius - th), Math.sin(angle) * (radius - th));
          }
          ctx.fillStyle = `rgba(${color3}, ${alpha * 0.96})`;
          ctx.fill();

          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const angle = tailAngle + (tipAngle - tailAngle) * t;
            const taper = Math.pow(Math.sin(t * Math.PI), 1.4) * (0.3 + 0.7 * t);
            const th = thick * taper;
            const rEdge = radius - th * 0.25;
            if (i === 0) ctx.moveTo(Math.cos(angle) * rEdge, Math.sin(angle) * rEdge);
            else ctx.lineTo(Math.cos(angle) * rEdge, Math.sin(angle) * rEdge);
          }
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 1.8;
          ctx.stroke();

          ctx.restore();
        };

        // Only draw the arc for the currently active weapon (one at a time)
        const isKatanaActiveArc = (this.phantomStrikeCount % 2) === 0;
        if (isKatanaActiveArc) {
          drawArc(0.35 + (this.katanaOffset || 0), this.r + (this.katanaThrust || 0) + 122, 22, slashArcAlpha, '160, 30, 240', '220, 20, 100', '12, 4, 20');
        } else {
          drawArc(-0.35 + (this.spearOffset || 0), this.r + (this.spearThrust || 0) + 85, 18, slashArcAlpha, '160, 30, 240', '220, 20, 100', '12, 4, 20');
        }
      } else {
        // --- INVERTED SPEAR / SPLIT SOUL KATANA BASIC ATTACK SLASH ---
        const editP = (typeof state !== 'undefined' && state.slashEditMode && state.slashEditParams) ? state.slashEditParams : null;
        if (editP) {
          ctx.translate(editP.offsetX, editP.offsetY);
          slashArcAlpha = 1.0;
        }

        // Use the snapshotted angle from when the swing started so the slash arc does NOT
        // drift mid-swing when Toji's gunAngle updates between frames (e.g. above/below enemy).
        // Crucially, do NOT add offsetAngle here — offsetAngle animates the weapon position,
        // but the slash visual must stay locked at the frozen target direction for its full lifetime.
        const frozenAngle = this._slashStartAngle !== undefined ? this._slashStartAngle : baseAngle;
        ctx.rotate(frozenAngle);
        const normAngle = Math.atan2(Math.sin(frozenAngle), Math.cos(frozenAngle));
        const isKatana = (this.ambushPhase === 'KATANA_SLASH' || (typeof state !== 'undefined' && state.tojiWeaponIndex === 1));
        // Only scale Y (mirror sweep direction) for the Katana since its update loop builds in _katanaFlipSign.
        // The Inverted Spear basic swing always sweeps clockwise, so its slash visual must never scale Y.
        if (isKatana && Math.abs(normAngle) > Math.PI / 2) {
          ctx.scale(1, -1);
        }

        const frozenFlip = this._slashStartFlipSign !== undefined ? this._slashStartFlipSign : _katanaFlipSign;
        
        const p = this._activeSlashProgress !== undefined ? this._activeSlashProgress : 0;
        const recP = this._recoveryProgress !== undefined ? this._recoveryProgress : 0;
        if (recP > 0) slashArcAlpha *= (1 - recP);

        // Keep the tip locked at the end of the swing (+1.25 for Katana, +1.05 for Inverted Spear) during recovery
        const endOffset = isKatana ? 1.25 : 1.05;
        const liveOffset = isKatana ? (offsetAngle * frozenFlip) : offsetAngle;
        const currentOffset = recP > 0 ? endOffset : liveOffset;

        const startOffset = -1.15; // Set starting offset to -1.15 for the wider sweep range
        const maxTrailLength = isKatana ? 1.8 : 1.6; // Increased tail length to match wider arc

        let activeTrailLength = maxTrailLength;
        // Erases from beginning to end during recovery phase
        if (recP > 0) {
          activeTrailLength = maxTrailLength * Math.pow(1 - recP, 1.4);
        }

        const tipAngle = currentOffset;
        const tailAngle = Math.max(startOffset, currentOffset - activeTrailLength);
        const bladeReach = isKatana ? 80 : 85;
        const outerR = (this.r + thrustDistance + bladeReach) * (editP ? editP.scale : 1.0); // Dynamically tracks active blade tip!
        const thickScale = activeTrailLength / maxTrailLength; // Scale thickness proportionally with length
        const maxThick = (isKatana ? 24 : 16) * (editP ? editP.thickness : 1.0) * thickScale; // Slim razor-sharp crescent thickness scaled!
        const steps = isLowQuality ? 18 : 30;

        // 1. Outer Neon Violet Glowing Aura
        ctx.beginPath();
        ctx.arc(0, 0, outerR + 4, tailAngle, tipAngle, false);
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const angle = tailAngle + (tipAngle - tailAngle) * t;
          const taper = Math.pow(Math.sin(t * Math.PI), 1.4) * (0.3 + 0.7 * t);
          const thick = (maxThick + 5) * taper;
          const r = (outerR + 4) - thick;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(160, 30, 240, ${slashArcAlpha * 0.70})`;
        ctx.fill();

        // 2. Inner Deep Crimson / Violet Secondary Energy Flare
        ctx.beginPath();
        ctx.arc(0, 0, outerR + 1.5, tailAngle, tipAngle, false);
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const angle = tailAngle + (tipAngle - tailAngle) * t;
          const taper = Math.pow(Math.sin(t * Math.PI), 1.4) * (0.3 + 0.7 * t);
          const thick = (maxThick + 2) * taper;
          const r = (outerR + 1.5) - thick;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(220, 20, 100, ${slashArcAlpha * 0.80})`;
        ctx.fill();

        // 3. Void-Black Pitch Dark Cursed Energy Core (With Jagged Teeth Notches)
        ctx.beginPath();
        ctx.arc(0, 0, outerR, tailAngle, tipAngle, false);
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const angle = tailAngle + (tipAngle - tailAngle) * t;
          const taper = Math.pow(Math.sin(t * Math.PI), 1.4) * (0.3 + 0.7 * t);
          let thick = maxThick * taper;

          const notchPattern = Math.sin(t * Math.PI * 10);
          if (notchPattern > 0.65 && t > 0.15 && t < 0.85) {
            thick += 4.5 * (notchPattern - 0.65);
          }

          const r = outerR - thick;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(12, 4, 20, ${slashArcAlpha * 0.96})`;
        ctx.fill();

        // 4. Electric Violet Outer Razor Edge Line
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const angle = tailAngle + (tipAngle - tailAngle) * t;
          const taper = Math.pow(Math.sin(t * Math.PI), 1.4) * (0.3 + 0.7 * t);
          const thick = maxThick * taper;
          const r = outerR - thick * 0.25;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(235, 140, 255, ${slashArcAlpha})`;
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 5. Pure White Razor Core Highlights
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const angle = tailAngle + (tipAngle - tailAngle) * t;
          const taper = Math.pow(Math.sin(t * Math.PI), 1.4) * (0.3 + 0.7 * t);
          const thick = maxThick * taper;
          const r = outerR - thick * 0.25;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${slashArcAlpha * 0.9})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
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
        drawSplitSoulKatana(ctx, this.x, this.y, baseAngle + 0.35 + (this.katanaOffset || 0), this.r + (this.katanaThrust || 0), this.color, baseAngle);
      } else {
        drawInvertedSpear(ctx, this.x, this.y, baseAngle - 0.35 + (this.spearOffset || 0), this.r + (this.spearThrust || 0), this.chainNodes, this.color, baseAngle);
      }
    } else if (isUltimateStriking) {
      // Ultimate Sequence Strikes: Displayed 1 by 1 (ONLY 1 weapon drawn per strike, alternating Katana vs Spear!)
      const isKatanaActive = (this.phantomStrikeCount % 2) === 0;
      if (isKatanaActive) {
        drawSplitSoulKatana(ctx, this.x, this.y, renderAngle, this.r + thrustDistance, this.color, baseAngle);
      } else {
        drawInvertedSpear(ctx, this.x, this.y, renderAngle, this.r + thrustDistance, this.chainNodes, this.color, baseAngle);
      }
    } else if (isKatanaActiveInHand || isUltimateFinal) {
      const isSpinningDive = this.ultimateActive && this.ultimatePhase === 'CRATER' && (this.ultimateCycleTimer || 0) <= (CONFIG.toji?.ultimateCraterDiveTime || 15);
      const isCraterCharge = this.ultimateActive && (this.ultimatePhase === 'CRATER_FADEIN' || (this.ultimatePhase === 'CRATER' && (this.ultimateCycleTimer || 0) > (CONFIG.toji?.ultimateCraterDiveTime || 15)));
      
      const finalBaseAngle = isSpinningDive 
        ? 0 
        : (isCraterCharge && this._ultimateChargeAngle !== undefined)
          ? this._ultimateChargeAngle
          : baseAngle;
      drawSplitSoulKatana(ctx, this.x, this.y, renderAngle, this.r + thrustDistance, this.color, finalBaseAngle);
    } else {
      drawInvertedSpear(ctx, this.x, this.y, renderAngle, this.r + thrustDistance, this.chainNodes, this.color, baseAngle);
    }
    ctx.restore();

    if ((this.isAmbushing && (this.ambushPhase === 'BACK_CHARGE' || this.ambushPhase === 'FRONT_LAUNCH')) || this.ambushPhase === 'KATANA_CHARGE') {
      let chargeRatio = 1.0;
      if (this.ambushPhase === 'KATANA_CHARGE') {
        const fadeInTotal = this.craterFadeInTotal || 30;
        const craterChargeTotal = CONFIG.toji?.ultimateCraterChargeTime || 80;
        const fullChargeTotal = fadeInTotal + craterChargeTotal;
        if (this.ultimateActive && this.ultimatePhase === 'CRATER_FADEIN') {
          const elapsed = fadeInTotal - Math.max(0, this.ultimateCycleTimer);
          chargeRatio = Math.min(1.0, Math.max(0, elapsed / fullChargeTotal));
        } else if (this.ultimateActive && this.ultimatePhase === 'CRATER') {
          const diveTime = CONFIG.toji?.ultimateCraterDiveTime ?? 15;
          const craterElapsed = craterChargeTotal - Math.max(0, this.ultimateCycleTimer - diveTime);
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
}

