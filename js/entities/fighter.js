import { stopAllSounds, stopAllLoopingSounds, stopSound, fadeOutSound, stopLoopingSound } from '../systems/soundSystem.js';
// ─────────────────────────────────────────────
// BASE FIGHTER CLASS
// ─────────────────────────────────────────────
import { CONFIG, GUN_TIP_DIST, getHandSize } from '../core/config.js';
import { MODE_HP_MULTIPLIER, MODE_SPEED_MULTIPLIER, MODE_SETTINGS, GAME_MODES } from '../core/modeConfig.js';
import { projectileSystem } from '../systems/projectileSystem.js';
import { audioSystem } from '../systems/audioSystem.js';
import { getBasicAttackSound } from '../soundEffects/basicAttackSounds.js';
import { spawnDeathShatter } from '../graphics/particles/deathShatterEffect.js';
import { spawnBloodEffect } from '../graphics/particles/bloodEffect.js';
import { spawnIllusionDeath } from '../graphics/particles/illusionDeathEffect.js';
import { getAnnouncerSound } from '../soundEffects/announcerSounds.js';
import { flamewardenFlameSystem } from '../graphics/weapons/flamewardenWeaponGraphics.js';
import { StatusEffectsManager } from './components/StatusEffectsManager.js';
import { FighterRenderer } from '../graphics/renderers/fighterRenderer.js';
// Note: `state` is imported for use inside function bodies only.
// This circular dep (fighter ↔ state) is safe because state is only
// accessed at call time, never at module evaluation time.
import { state, spawnFloatingText, recordWin, recordLoss, triggerGlobalScreenShake, isChampionScreenActive } from '../core/state.js';
import { spawnImpactFlash, spawnSparks, spawnMeleeClashShockwave, spawnAnimePunchImpactFrame } from '../graphics/particles/sparkEffect.js';
import { drawSlowEffect, drawElectricStunEffect, drawCrimsonElectrifiedEffect, drawPoisonEffect, drawBurnEffect, drawDubstepStunEffect, drawThunderRootsEffect, drawSilenceEffect } from '../graphics/statusEffects.js';
import { fastCleanArray } from '../graphics/particles/visualTrailSystem.js';

export function applyDamageToTarget(target, amount, attacker, opts = {}) {
  if (!target) return false;

  if (target.isIllusion) {
    let currentHp = Number(target.hp);
    if (!Number.isFinite(currentHp)) {
      currentHp = 0;
    }

    amount = Number(amount);
    if (!Number.isFinite(amount)) {
      amount = 0;
    }

    const multiplier = Number(CONFIG.doppleganger?.illusionDamageReceivedMultiplier || 1);
    const effectiveAmount = amount * multiplier;
    const prevHp = currentHp;
    target.hp = Math.max(0, Number((currentHp - effectiveAmount).toFixed(2)));

    if (target.hp < prevHp && effectiveAmount > 0) {
      // Trigger global white hit flash visual effect
      target.hitFlashTimer = 8;

      // Play flesh hit audio effect unless it's a continuous DPS/dot effect
      if (!opts.isPoison && !opts.isBurn && !opts.isFlame && !opts.fromBlackHole && !opts.isPurpleDPS && !opts.isDomainDPS && !opts.isElectrified) {
        audioSystem.playSFX('attack_fleshhit', 0.6);
      } else if (opts.isPurpleDPS || opts.isDomainDPS) {
        const now = Date.now();
        if (!target._lastPurpleHitSoundTime || (now - target._lastPurpleHitSoundTime > 130)) {
          target._lastPurpleHitSoundTime = now;
          audioSystem.playSFX('attack_fleshhit', 0.5);
        }
      }

      // Spawn blood/impact particle visual effect in damage direction
      const damageAngle = opts.damageAngle ?? (attacker ? Math.atan2(target.y - attacker.y, target.x - attacker.x) : Math.random() * Math.PI * 2);
      if (typeof spawnBloodEffect === 'function') {
        const bloodAmount = opts.isRikaAttack ? Math.max(1, Math.round(effectiveAmount * 0.16)) : effectiveAmount;
        spawnBloodEffect(target, bloodAmount, damageAngle);
      } else if (typeof spawnSparks === 'function') {
        spawnSparks(target.x, target.y, 6, 'crimsonSniper');
      }

      // Apply global basic attack hit-pause if configured
      const isBasicAttack = !opts.isPoison && !opts.isBurn && !opts.isFlame && !opts.fromBlackHole && 
                            !opts.isPurpleDPS && !opts.isElectrified && !opts.isDomainDPS && 
                            !opts.isSkill && !opts.isUltimate && !opts.isRikaAttack && 
                            !opts.isExplosion && !opts.isAOE;
      if (isBasicAttack && CONFIG.basicAttackHitPauseDuration > 0) {
        if (typeof target.isPerformingSkill !== 'function' || !target.isPerformingSkill()) {
          if (typeof target.applyTimeStop === 'function') {
            target.applyTimeStop(CONFIG.basicAttackHitPauseDuration);
          }
        }
      }

      // No floating text for illusion damage.
      // NOTE: Do NOT remove the illusion here — let illusionSystem.js detect hp <= 0
      // next frame and handle death (split-on-death, particles, floating text).
      // Removing here would bypass the split mechanic entirely.
      return true;
    }

    return false;
  }

  if (typeof target.takeDamage === 'function') {
    return target.takeDamage(amount, attacker, opts);
  }

  if (typeof target.hp === 'number') {
    target.hp = Math.max(0, target.hp - (Number(amount) || 0));
    return true;
  }

  return false;
}

export class Fighter {
  constructor(def) {
    this._def = def;
    this.id = def.id;
    this.type = def.type;
    this.name = def.name;
    this.color = def.color;
    
    const sizeMult = CONFIG.globalFighter?.sizeMultiplier ?? 1.0;
    const internalScale = CONFIG.internalScale ?? 1.0;
    this.r = def.radius * sizeMult * internalScale;
    this.aimbot = def.aimbot || false;
    this.maxHp = def.hp || 100;
    this.damage = def.damage || 10;
    this.shootCooldownMax = def.cooldown || CONFIG.shoot.cooldown;
    this.lastKilledDef = null;
    
    this.reset();
  }

  get hp() {
    return this._hp;
  }

  set hp(value) {
    const oldHp = this._hp;
    if (oldHp !== undefined && value > oldHp) {
      if (this.blackFlashDebuffTimer > 0) {
        if (state && state.gameState === 'playing') {
          const healingAmount = value - oldHp;
          const reducedHealing = healingAmount * (CONFIG.blackFlash?.debuff?.healReductionMultiplier ?? 0.5);
          value = oldHp + reducedHealing;
          
          const now = Date.now();
          if (!this._lastReducedHealTextTime || now - this._lastReducedHealTextTime > 400) {
            spawnFloatingText(this.x, this.y - this.r - 28, "RCT Reduced", "#FF0000");
            this._lastReducedHealTextTime = now;
          }
        }
      }
    }
    if (Number.isFinite(value) && Number.isFinite(this.maxHp) && this.maxHp > 0) {
      value = Math.min(this.maxHp, value);
    }
    this._hp = value;
  }

  get punchAnimTimer() {
    return this._punchAnimTimer || 0;
  }

  set punchAnimTimer(value) {
    const old = this._punchAnimTimer || 0;
    this._punchAnimTimer = value;
    if (value > 0) {
      if (value > old) {
        this.punchActiveMaxTime = value;
      }
    } else {
      this.punchActiveMaxTime = 0;
    }
  }

  /** Default demo attack trigger for menu preview (can be overridden by subclasses). */
  triggerDemoAttack() {
    this.spearSwingTimer = 45;
    this.punchAnimTimer = 35;
    this.recoilTimer = 25;
    try {
      const sound = getBasicAttackSound(this.id, this._def?.type);
      if (sound) audioSystem.playSFX(sound.src, sound.volume);
    } catch (e) {}
  }

  /** Restores all dynamic values to their initial states. */
  reset() {
    const d = this._def;
    this.x = d.startX;
    this.y = d.startY;

    const baseHp = Number(d.hp || 100);
    // Store original base speed before any multipliers (used for spin rate calculations)
    const startVx = d.startVx || 0, startVy = d.startVy || 0;
    const originalBaseSpeed = d.moveSpeed !== undefined ? d.moveSpeed : Math.sqrt(startVx * startVx + startVy * startVy) || 1;
    // Apply mode speed multiplier only to movement speed, not spin rate
    const moveSpeed = originalBaseSpeed * (MODE_SPEED_MULTIPLIER[state.mode] || 1);

    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * moveSpeed;
    this.vy = Math.sin(angle) * moveSpeed;

    if (MODE_SETTINGS[state.mode]?.fixedHp) {
      this.maxHp = MODE_SETTINGS[state.mode].fixedHp;
    } else {
      this.maxHp = baseHp * (MODE_HP_MULTIPLIER[state.mode] || 1);
    }
    if (!Number.isFinite(this.maxHp) || this.maxHp <= 0) {
      console.warn('Invalid fighter maxHp, resetting to default', d, state.mode, this.maxHp);
      this.maxHp = 100;
    }
    this.hp = this.maxHp;
    if (!Number.isFinite(this.hp)) {
      this.hp = 100;
    }
    this.angle = 0;
    this.gunAngle = 0;
    this.lastKilledDef = null;
    this.shootCooldown = 0;
    this.speed = moveSpeed;
    this.baseSpeed = originalBaseSpeed; // Original speed for spin rate calculations (not affected by mode multiplier)
    
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    this.statusEffects = new StatusEffectsManager(this);

    this.rctVisualTimer = 0;
    this.rctVisualMaxTimer = 60;
    this.basicAttackHitPauseTimer = 0;

    this.poisonTicks = 0;
    this.poisonTimer = 0;
    this.lastPoisonAttacker = null;

    this.slowTimer = 0;
    this.voidMarkTimer = 0;
    this.slowMultiplier = 1;
    this.hitStunTimer = 0;
    this.hitStunMultiplier = 1;
    this.dubstepStunTimer = 0;
    this.timeStopTimer = 0;
    this._timeStopFrozenAngle = undefined;
    this._timeStopFrozenGunAngle = undefined;
    this._bhTextCooldown = 0;
    this._flameHitCooldown = 0;
    // timestamp (ms) when this fighter last took flame contact damage
    this._lastFlameHitTime = 0;
    this._flameContactDuration = 0;
    // Health bar damage shake and hit/heal edge glow timers (frames)
    this._healthBarShakeTimer = 0;
    this._healthBarHitTimer = 0;
    this._healthBarHealTimer = 0;
    this._lastHp = this.hp;
    // Burn effect state
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.lastBurnAttacker = null;
    this.burnSpreadCooldown = 0;
    // Silence effect state
    this.silenceTimer = 0;
    this.blackFlashDebuffTimer = 0;
    this.paralyzeTimer = 0;
    this.isGrabbedByMahoraga = false;

    this.damageDealt = 0;
    this.damageReceived = 0;
  }

  /** Returns true if this fighter is currently silenced by anti-technique effects (e.g. Inverted Spear of Heaven). */
  isSilenced() {
    return this.statusEffects.isSilenced();
  }

  /** Returns true if this fighter is currently inside any active Cronos time-stop sphere. */
  isInsideCronosSphere() {
    if (!state || !state.fighters) return false;
    for (const f of state.fighters) {
      if (!f || !f.sphereActive || f === this) continue;
      const dx = this.x - f.sphereX;
      const dy = this.y - f.sphereY;
      const range = CONFIG.cronos.sphereRadius;
      if ((dx * dx + dy * dy) <= range * range) return true;
    }
    return false;
  }

  applySlow(frames, multiplier) {
    this.statusEffects.applySlow(frames, multiplier);
  }

  applyHitStun(frames) {
    this.statusEffects.applyHitStun(frames);
  }

  interruptAttacks(forceCancelAll = false) {
    const isChanneling = this.isChannelingDivineFlame || this.isChannelingDomainExpansion || 
                         this.isChannelingDomain || this.isChannelingPurple || 
                         (this.purpleChargeTimer || 0) > 0 || (this.redEffectTimer || 0) > 0 || 
                         this.redBuildupPhase || this.isChannelingRCT || 
                         (this.divineFlameChargeTimer || 0) > 0 || (this.domainChargeTimer || 0) > 0;

    // Apply universal 4.5s penalty cooldown (270 frames) to skill cooldowns if interrupted mid-channeling
    if (isChanneling || forceCancelAll) {
      const penaltyCD = 270;
      for (const key in this) {
        if (key.endsWith('Cooldown') || key.endsWith('CooldownTimer')) {
          if (key === 'timeStopTimer' || key === 'basicAttackHitPauseTimer' || key === 'hitStunTimer' || key === 'electricStunTimer' || key === 'dubstepStunTimer' || key === 'shootCooldown' || key === 'attackCooldown' || key === 'meleePunchCooldown') continue;
          if (typeof this[key] === 'number') {
            this[key] = Math.max(this[key] || 0, penaltyCD);
          }
        }
      }
    }

    // Stop active skill sound handles
    if (this.soundHandle) { stopSound(this.soundHandle); this.soundHandle = null; }
    if (this._purpleChargeSoundHandle) { fadeOutSound(this._purpleChargeSoundHandle, 150); this._purpleChargeSoundHandle = null; }
    if (this.fugaSoundKey) { stopLoopingSound(this.fugaSoundKey); this.fugaSoundKey = null; }
    if (this.channelSoundHandle) { stopSound(this.channelSoundHandle); this.channelSoundHandle = null; }
    if (this.beamSoundHandle) { stopSound(this.beamSoundHandle); this.beamSoundHandle = null; }
    if (this.chargeSoundHandle) { stopSound(this.chargeSoundHandle); this.chargeSoundHandle = null; }

    // Universal interrupts
    this.meleeSwingActive = false;
    this.meleeSwingTimer = 0;
    this.meleeSlashFadeTimer = 0;
    this.attackSwingTimer = 0;
    this.dashTimer = 0;
    this.scytheSwingActive = false;
    this.scytheSwingTimer = 0;
    this.stolenWindUpTimer = 0;

    // Musashi
    this.flurryHitsLeft = 0;
    this.flurryGhost = null;

    // Zeus
    this.stormActive = false;
    this.aegisActive = false;

    // Knight
    this.swipeActive = false;
    this.swipeTimer = 0;

    // Cronos
    this.sphereActive = false;

    // Ruby
    this.flameActive = false;

    // Laser / Doppler
    this.beamActive = false;
    this.skillActive = false;

    // Berserker
    this.axeSwingActive = false;

    // Sukuna / Gojo / Martial Arts
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.rapidSlashHitsLeft = 0;
    this.rapidSlashTimer = 0;
    this.meleeComboCount = 0;
    this.teleportSlideTimer = 0;
    this.punchAnimTimer = 0;
    this.slashSwingTimer = 0;
    this.isChannelingDivineFlame = false;
    this.divineFlameChargeTimer = 0;
    this.isChannelingDomainExpansion = false;
    this.isChannelingDomain = false;
    this.isChannelingPurple = false;
    this.purpleChargeTimer = 0;
    this.redEffectTimer = 0;
    this.shootCooldown = 60;
  }


  applyTimeStop(frames) {
    this.statusEffects.applyTimeStop(frames);
  }

  _handleTimeStop() {
    if (this.paralyzeTimer > 0) {
      this.paralyzeTimer--;
      this.vx = 0;
      this.vy = 0;
      return true;
    }
    if (this.isGrabbedByMahoraga) {
      this.vx = 0;
      this.vy = 0;
      return true;
    }
    if (this.isTargetOfAmbush) {
      this.vx = 0;
      this.vy = 0;
      return true;
    }
    if (this.basicAttackHitPauseTimer > 0) {
      this.basicAttackHitPauseTimer--;
      this.vx = 0;
      this.vy = 0;
      return true;
    }
    return this.statusEffects.handleTimeStop();
  }

  isPerformingSkill() {
    if (this.isRika) {
      return !!(this.rightArmTimer > 0 || this.leftArmTimer > 0 || this.spawnTimer > 0 || this.disappearing);
    }
    return !!(
      this.isAmbushing ||
      this.ultimateActive ||
      this.isChargingUlt ||
      this.isFiringUlt ||
      this.isFlurrying ||
      this.isDashing ||
      this.isCharging ||
      this.isChargingPurple ||
      this.isFiringPurple ||
      this.isCastingRed ||
      this.isCastingBlue ||
      this.isChargingFuga ||
      this.isFiringFuga ||
      this.isChargingSeriousPunch ||
      this.isSideHopping ||
      this.isChannelingDomain ||
      this.isChannelingDomainExpansion ||
      this.isChannelingDivineFlame ||
      this.isChannelingPurple ||
      this.isChannelingRCT ||
      this.isChannelingStorm ||
      this.isChanneling ||
      this.redBuildupPhase ||
      this.blueBuildupPhase ||
      this.meleeSwingActive ||
      this.scytheSwingActive ||
      this.swipeActive ||
      this.axeSwingActive ||
      this.flameActive ||
      this.beamActive ||
      this.skillActive ||
      (this.flurryHitsLeft > 0) ||
      (this.rapidSlashHitsLeft > 0) ||
      (this.dashTimer > 0) ||
      (this.ultTimer > 0) ||
      (this.flurryTimer > 0) ||
      (this.purpleChargeTimer > 0) ||
      (this.redEffectTimer > 0) ||
      (this.domainChargeTimer > 0) ||
      (this.ultimateChargeTimer > 0) ||
      (this.divineFlameChargeTimer > 0) ||
      (this.thinIceBreakerChargeTimer > 0)
    );
  }

  applyPoison(attacker) {
    this.statusEffects.applyPoison(attacker);
  }

  applyBurn(attacker) {
    this.statusEffects.applyBurn(attacker);
  }

  onDamageDealt(target, projectile, ownerIndex) {
    // Override in subclasses for special attack effects.
  }

  onDeath() {
    this.interruptAttacks(true);
    // Default death effect
    spawnDeathShatter(this);
  }

  // Knockback is now applied directly to fighter's position, so physics engines of custom fighters can't interfere.
  // Knockback is applied directly to fighter's position, so physics engines of custom fighters can't interfere.
  applyKnockback(vx, vy) {
    this.knockbackVx = vx;
    this.knockbackVy = vy;
    this.vx = vx;
    this.vy = vy;
    // Domain Immunity should NOT make you immune to physical knockback sliding!
    if (this.characterId !== 'toji' && this.type !== 'toji') {
      this.knockbackStunTimer = 20; // Steering freeze for normal fighters so knockback slides cleanly
    }
  }

  handlePoison() {
    this.statusEffects.handlePoison();
  }

  handleBurn() {
    this.statusEffects.handleBurn();
  }

  _decrementSkillCooldowns() {
    // Universal helper to ensure skill and ultimate cooldowns continue counting down
    // even while time-stopped, hit-stunned, or frozen by Limitless Infinity!
    for (const key in this) {
      if (key.endsWith('Cooldown') || key.endsWith('CooldownTimer') || key === 'shootCooldown' || key === 'attackCooldown') {
        if (key === 'timeStopTimer' || key === 'basicAttackHitPauseTimer' || key === 'hitStunTimer' || key === 'electricStunTimer' || key === 'dubstepStunTimer') continue;
        if (typeof this[key] === 'number' && this[key] > 0) {
          this[key]--;
        }
      }
    }
  }

  /** Per-frame housekeeping for cooldowns. */
  _tickCooldowns() {
    if (this.purpleHitTimer > 0) {
      this.purpleHitTimer--;
      if (this.purpleHitTimer <= 0) {
        this.isCaughtInPurple = false;
      }
    } else {
      this.isCaughtInPurple = false;
    }
    if (this.hitStunTimer > 0) this.hitStunTimer--;
    if (this.electricStunTimer > 0) this.electricStunTimer--;
    if (this.dubstepStunTimer > 0) this.dubstepStunTimer--;
    if (this.crimsonElectrifiedTimer > 0) this.crimsonElectrifiedTimer--;
    if (this._bhTextCooldown > 0) this._bhTextCooldown--;
    if (this._flameHitCooldown > 0) this._flameHitCooldown--;
    if (this.burnSpreadCooldown > 0) this.burnSpreadCooldown--;
    if (this._healthBarShakeTimer > 0) this._healthBarShakeTimer--;
    if (this._healthBarHitTimer > 0) this._healthBarHitTimer--;
    if (this._healthBarHealTimer > 0) this._healthBarHealTimer--;
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;
    if (this.rctVisualTimer > 0) this.rctVisualTimer--;
    if (this.blackFlashDebuffTimer > 0) this.blackFlashDebuffTimer--;
    if (this.blackFlashTimer > 0) this.blackFlashTimer--;
    if (this.teleportChaseDelayTimer > 0) this.teleportChaseDelayTimer--;
    
    // Knockback Stun: Disable AI steering velocity during knockback so ricochet executes cleanly
    if (this.knockbackStunTimer > 0) {
      this.knockbackStunTimer--;
      this.vx = 0;
      this.vy = 0;
    }

    // Universal knockback physics (processed for all custom fighters without breaking their steering logic)
    if (this.knockbackVx !== undefined && (Math.abs(this.knockbackVx) > 0.1 || Math.abs(this.knockbackVy) > 0.1)) {
      this.x += this.knockbackVx;
      this.y += this.knockbackVy;
      
      // Check for wall bounce from knockback explicitly since custom fighters might not do it after this runs
      const arena = CONFIG.arena;
      if (arena) {
        let bounced = false;
        const currentSpeed = Math.hypot(this.knockbackVx, this.knockbackVy);

        // Silky Smooth Kinetic Ricochet Wall Bounce (0.82 smooth velocity reflection)
        let bounceMult = this.isFirstHitKnockback ? 0.35 : 0.82;
        if (this.preventKnockbackBounce) bounceMult = 0; // Stick to the wall instead of bouncing

        if (this.x - this.r < arena.x) { this.x = arena.x + this.r; this.knockbackVx = Math.abs(this.knockbackVx) * bounceMult; bounced = true; }
        if (this.x + this.r > arena.x + arena.width) { this.x = arena.x + arena.width - this.r; this.knockbackVx = -Math.abs(this.knockbackVx) * bounceMult; bounced = true; }
        if (this.y - this.r < arena.y) { this.y = arena.y + this.r; this.knockbackVy = Math.abs(this.knockbackVy) * bounceMult; bounced = true; }
        if (this.y + this.r > arena.y + arena.height) { this.y = arena.y + arena.height - this.r; this.knockbackVy = -Math.abs(this.knockbackVy) * bounceMult; bounced = true; }

        if (bounced) {
          if (this._knockedBackBySaitamaBasicPunch) {
            this._knockedBackBySaitamaBasicPunch = false;
            const slowFrames = CONFIG.saitama?.wallBounceSlowFrames ?? 120;
            const slowMult = CONFIG.saitama?.wallBounceSlowMultiplier ?? 0.35;
            if (this.statusEffects && typeof this.statusEffects.applySlow === 'function') {
              this.statusEffects.applySlow(slowFrames, slowMult);
            } else {
              this.slowTimer = Math.max(this.slowTimer || 0, slowFrames);
              this.slowMultiplier = slowMult;
            }
            if (typeof spawnFloatingText === 'function') {
              spawnFloatingText(this.x, this.y - (this.r || 25) - 14, "SLOWED!", "#FFD700");
            }
          }

          if (this.preventKnockbackBounce) {
            // They hit the wall while pinned! Stick them to the wall for wallPinDurationFrames
            const pinDuration = CONFIG.saitama?.wallPinDurationFrames ?? 60;
            if (CONFIG.saitama?.disableWallPinCyanOverlay !== false) {
              this.suppressFreezeOverlay = true;
            }
            if (typeof this.applyTimeStop === 'function') {
              this.applyTimeStop(pinDuration);
            } else {
              this.hitStunTimer = pinDuration;
            }
            this.knockbackVx = 0;
            this.knockbackVy = 0;
            
            // Forcefully interrupt any ongoing dashes, teleports, or abilities
            if (typeof this.interruptAttacks === 'function') {
              this.interruptAttacks(true);
            }
            
            const wallPinShakeIntensity = CONFIG.saitama?.wallPinScreenShakeIntensity ?? 8;
            const wallPinShakeDuration = CONFIG.saitama?.wallPinScreenShakeDuration ?? 12;
            triggerGlobalScreenShake(wallPinShakeIntensity, wallPinShakeDuration);
            audioSystem.playSFX('attack_fleshhit', 1.0);
            spawnImpactFlash(this.x, this.y, 60, 'rgba(255, 50, 50, 0.9)');
            spawnMeleeClashShockwave(this.x, this.y, 120, 'gold');
            
            // Create a persistent wall crack decal
            if (typeof state !== 'undefined' && arena) {
              if (!state.wallCracks) state.wallCracks = [];
              let angle = 0;
              let crackX = this.x;
              let crackY = this.y;
              
              if (this.x - this.r <= arena.x + 5) { angle = 0; crackX = arena.x; } // Left wall (cracks expand left/outside)
              else if (this.x + this.r >= arena.x + arena.width - 5) { angle = Math.PI; crackX = arena.x + arena.width; } // Right wall
              else if (this.y - this.r <= arena.y + 5) { angle = Math.PI / 2; crackY = arena.y; } // Top wall
              else if (this.y + this.r >= arena.y + arena.height - 5) { angle = -Math.PI / 2; crackY = arena.y + arena.height; } // Bottom wall
              
              state.wallCracks.push({
                x: crackX,
                y: crackY,
                angle: angle,
                life: 600, // 10 seconds
                maxLife: 600,
                seed: Math.random() * 1000,
                scale: CONFIG.saitama?.wallCrackScale ?? 0.45,
                thickness: CONFIG.saitama?.wallCrackThickness ?? 0.35,
              });
            }
          } else if (!this.isFirstHitKnockback && currentSpeed > 6) {
            triggerGlobalScreenShake(5, 6); // Subtle micro camera punch for smooth motion!
            audioSystem.playSFX('attack_fleshhit', 0.9);
            spawnImpactFlash(this.x, this.y, 45, 'rgba(255, 20, 80, 0.7)');
            spawnSparks(this.x, this.y, 14, 'crimsonSniper');
            spawnMeleeClashShockwave(this.x, this.y, 100, 'gojo');
          }
        }
      }
      
      // Decay knockback velocity smoothly (uses knockbackDecay if specified, default 0.90 for silky smooth gliding)
      const decay = this.knockbackDecay || 0.90;
      this.knockbackVx *= decay;
      this.knockbackVy *= decay;
      
      if (Math.abs(this.knockbackVx) <= 0.1) this.knockbackVx = 0;
      if (Math.abs(this.knockbackVy) <= 0.1) this.knockbackVy = 0;
      if (this.knockbackVx === 0 && this.knockbackVy === 0) {
        this._knockedBackBySaitamaBasicPunch = false;
        if (this.timeStopTimer <= 0) {
          this.suppressFreezeOverlay = false;
        }
      }
    } else {
      // Clear flag when knockback completes
      this.preventKnockbackBounce = false;
      this._knockedBackBySaitamaBasicPunch = false;
      if (this.timeStopTimer <= 0) {
        this.suppressFreezeOverlay = false;
      }
    }
  }

  /** Rescales velocity to maintain constant movement speed. */
  normalizeSpeed() {
    const mag = Math.hypot(this.vx, this.vy);
    if (mag > 0) {
      this.vx = (this.vx / mag) * this.speed;
      this.vy = (this.vy / mag) * this.speed;
    }
  }

  /** Centralized damage dealer and death/game over check.
   *  Returns true if damage was applied, false if it was blocked or ignored.
   */
  takeDamage(amount, attacker, opts = {}) {
    if (this.hp <= 0 || (this.isAmbushing && !opts.isDomain)) return false;

    // Base fighter doesn't block; sanitize inputs before applying damage.
    let currentHp = Number(this.hp);
    if (!Number.isFinite(currentHp)) {
      console.warn('Invalid fighter HP detected, resetting to 0', this, this.hp);
      currentHp = 0;
    }

    amount = Number(amount);
    if (!Number.isFinite(amount)) {
      console.warn('Invalid damage amount detected, treating as 0', amount, attacker, opts);
      amount = 0;
    }

    const attackerIndex = state.fighters.indexOf(attacker);
    const targetIndex = state.fighters.indexOf(this);
    if (
      (state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.STAND_OFF_1V2) &&
      attackerIndex >= 0 &&
      targetIndex >= 0 &&
      attackerIndex !== targetIndex &&
      state.getFighterTeam(attackerIndex) === state.getFighterTeam(targetIndex)
    ) {
      return false;
    }

    const prevHp = currentHp;
    this.hp = Math.max(0, Number((currentHp - amount).toFixed(2)));
    const actualDamage = prevHp - this.hp;
    if (actualDamage > 0) {
      this.damageReceived = (this.damageReceived || 0) + actualDamage;
      if (attacker) {
        let actualAttacker = attacker;
        if (attacker.isIllusion && attacker.owner) {
          actualAttacker = attacker.owner;
        }
        actualAttacker.damageDealt = (actualAttacker.damageDealt || 0) + actualDamage;
      }
    }
    // Spawn floating damage number when actual HP was reduced
    if (this.hp < prevHp && amount > 0 && !opts.skipStandardDamageText) {
      let color = (attacker && attacker.color) ? attacker.color : (this.color || '#ff4444');
      if (attacker && (attacker.characterId === 'toji' || attacker.type === 'toji')) {
        color = '#e9d5ff'; // Highly visible bright lavender for Toji
      } else if (attacker && (attacker.characterId === 'gojo' || attacker.type === 'gojo')) {
        color = '#00E5FF'; // Electric Cyan for Gojo
      } else if (attacker && (attacker.characterId === 'sukuna' || attacker.type === 'sukuna')) {
        color = '#ff4455'; // Bright Crimson Flame for Sukuna
      } else if (opts.isPurpleDPS) {
        color = '#bf5af2'; // Bright electric purple for Hollow Purple DPS
      }
      const damageText = `${Math.round(amount)}`;
      this._healthBarShakeTimer = 12;
      this._healthBarHitTimer = 14;
      
      if (!opts.fromBlackHole) {
        spawnFloatingText(this.x, this.y - this.r - 8, damageText, color);
      } else {
        const interval = opts.bhTextInterval || 60;
        if (this._bhTextCooldown <= 0) {
          spawnFloatingText(this.x, this.y - this.r - 8, damageText, color);
          this._bhTextCooldown = interval;
        }
      }
    } else if (this.hp > prevHp || (opts.isHeal && amount < 0)) {
      // Spawn floating green heal number when actual HP increases
      const healAmount = Math.round(Math.abs(amount < 0 ? amount : (this.hp - prevHp)));
      if (healAmount > 0 && !opts.skipHealText) {
        spawnFloatingText(this.x + (Math.random() - 0.5) * 16, (this.y - (this.z || 0)) - this.r - 12, `+${healAmount}`, '#00FF66');
      }
    }

      // Calculate damage direction (from attacker to this fighter)
      let damageAngle = null;
      if (attacker) {
        damageAngle = Math.atan2(this.y - attacker.y, this.x - attacker.x);
      }
      // Spawn blood effect in the damage direction (unless it's a turret or thermobaric/flame/domain DPS)
      const isExplosionOrFlame = opts.isExplosion || opts.isDivineFlame || opts.isFlame || opts.isBurn || opts.isPurpleDPS || opts.isDomainDPS || opts.isDomain;
      if (!this.isTurret && !isExplosionOrFlame) {
        const bloodAmount = opts.isRikaAttack ? Math.max(1, Math.round(amount * 0.16)) : amount;
        spawnBloodEffect(this, bloodAmount, damageAngle);
      }
      
      // Global blast / knockback / explosion skill interruption & penalty cooldown
      const isBlastOrKnockback = opts.isExplosion || opts.isDivineFlame || opts.isRed || opts.isKnockback || opts.isAOE || (opts.knockback && Math.hypot(opts.knockbackVx || 0, opts.knockbackVy || 0) > 2);
      if (isBlastOrKnockback && !this.isTurret) {
        this.interruptAttacks(true);
      }

      // Apply global basic attack hit-pause if configured
      const isBasicAttack = !opts.isPoison && !opts.isBurn && !opts.isFlame && !opts.fromBlackHole && 
                            !opts.isPurpleDPS && !opts.isElectrified && !opts.isDomainDPS && 
                            !opts.isSkill && !opts.isUltimate && !opts.isRikaAttack && 
                            !opts.isExplosion && !opts.isAOE;
      if (isBasicAttack && CONFIG.basicAttackHitPauseDuration > 0 && !this.isTurret) {
        if (!this.isPerformingSkill()) {
          this.basicAttackHitPauseTimer = CONFIG.basicAttackHitPauseDuration;
        }
      }

      // Play hit sound and trigger hit flash
      if (!opts.isPoison && !opts.isBurn && !opts.isFlame && !opts.fromBlackHole && !opts.isPurpleDPS && !opts.isElectrified && !opts.isDomainDPS) {
        if (!this.isTurret) {
          audioSystem.playSFX('attack_fleshhit', 0.6);
          this.hitFlashTimer = 8;
        }
      } else if (opts.isPurpleDPS || opts.isDomainDPS) {
        if (!this.isTurret) {
          this.hitFlashTimer = 6;
          const now = Date.now();
          if (!this._lastPurpleHitSoundTime || (now - this._lastPurpleHitSoundTime > 130)) {
            this._lastPurpleHitSoundTime = now;
            audioSystem.playSFX('attack_fleshhit', 0.5);
          }
        }
      }
    if (this.hp === 0 && !this._hasDied) {
      this._hasDied = true;
      // Clear flame particles if the dying fighter is the Flamewarden
      if (this._def && this._def.type === 'orange') {
        flamewardenFlameSystem.clear();
      }
      this.onDeath();
      
      if (this.isTurret) {
        return true;
      }

      // Play death sound
      const faah = getAnnouncerSound('faah');
      if (faah) audioSystem.playSFX(faah.src, faah.volume, faah.speed, faah.offset || 0);

      // Helper: a Doppelganger with surviving illusions is still "in play"
      const _isEffectivelyAlive = (f) => {
        if (!f || f.isTurret) return false;
        if (f.hp > 0) return true;
        const isDoppel = f.type === 'doppleganger' || f._def?.type === 'doppleganger' || f.characterId === 'doppleganger';
        if (isDoppel) {
          return state.illusions && state.illusions.some(ill => ill && ill.owner === f && ill.hp > 0);
        }
        return false;
      };

      const realAttacker = (attacker && attacker.owner) ? attacker.owner : attacker;
      const recordKill = () => {
        if (realAttacker && realAttacker !== this) {
          realAttacker.lastKilledDef = this._def;
          const realIdx = state.fighters.indexOf(realAttacker);
          if (realIdx >= 0) {
            state.matchKills[realIdx].push(this._def);
          }
        }
      };

      // If the dying fighter is a Doppelganger with surviving illusions, don't end the round
      const isThisDoppel = this.type === 'doppleganger' || this._def?.type === 'doppleganger' || this.characterId === 'doppleganger';
      if (isThisDoppel && state.illusions && state.illusions.some(ill => ill && ill.owner === this && ill.hp > 0)) {
        // Doppelganger died but illusions are still fighting — round continues
        recordKill();
        return true;
      }

      recordKill();

      // Only check for round/match transitions if we are still playing
      if (state.gameState === 'playing') {
        const aliveCount = state.fighters.filter((f) => f && _isEffectivelyAlive(f)).length;
        // Use realAttacker (owner of the turret/illusion) to properly track scores and wins
        const realAttackerIndex = state.fighters.indexOf(realAttacker);
        const roundEnds = state.mode !== 'FFA' || aliveCount <= 1;

        if (state.mode === '2v2' || state.mode === '1v2 Stand Off') {
          // 2v2 & 1v2: check if a team is eliminated (including doppelganger illusions)
          let team0Alive = false;
          let team1Alive = false;

          if (state.mode === '1v2 Stand Off') {
            team0Alive = _isEffectivelyAlive(state.fighters[0]);
            team1Alive = _isEffectivelyAlive(state.fighters[1]) || _isEffectivelyAlive(state.fighters[2]);
          } else {
            team0Alive = _isEffectivelyAlive(state.fighters[0]) || _isEffectivelyAlive(state.fighters[1]);
            team1Alive = _isEffectivelyAlive(state.fighters[2]) || _isEffectivelyAlive(state.fighters[3]);
          }
          
          if (!team0Alive || !team1Alive) {
            // A team has been eliminated - round ends
            const winningTeam = team0Alive ? 0 : 1;
            state.teamScores[winningTeam]++;

            const winnerFighter = state.fighters.find((f, idx) => f && _isEffectivelyAlive(f) && state.getFighterTeam(idx) === winningTeam)
              || state.fighters.find((f, idx) => f && state.getFighterTeam(idx) === winningTeam)
              || state.fighters[0];

            state.roundWinner = winnerFighter;
            state.roundEndTimer = 0;

            const winThreshold = MODE_SETTINGS[state.mode]?.rounds ?? 2;
            const isMatchEnd = state.teamScores[winningTeam] >= winThreshold;

            // Stop all sounds when round ends, unless it is a match end (champion screen)
            if (!isMatchEnd) {
              stopAllSounds();
              stopAllLoopingSounds();
            }

            if (isMatchEnd) {
              state.matchWinner = winnerFighter;
              state.gameState = 'matchEnd';
            } else {
              state.gameState = 'roundEnd';
            }
          }
        } else if (state.mode !== 'FFA' && roundEnds) {
          // Identify the actual surviving opponent for 1v1 / Stand Off modes
          const survivor = state.fighters.find(f => f && f !== this && _isEffectivelyAlive(f));
          const winnerFighter = survivor || ((realAttacker && realAttacker !== this && _isEffectivelyAlive(realAttacker)) ? realAttacker : null);
          const winnerIndex = winnerFighter ? state.fighters.indexOf(winnerFighter) : -1;

          if (winnerIndex >= 0) {
            state.scores[winnerIndex]++;
          }
          state.roundWinner = winnerFighter;
          state.roundEndTimer = 0;

          const modeRounds = MODE_SETTINGS[state.mode]?.rounds || CONFIG.rounds.max;
          const winThreshold = modeRounds === 1 ? 1 : Math.ceil(CONFIG.rounds.max / 2);
          const isMatchEnd = winnerIndex >= 0 && state.scores[winnerIndex] >= winThreshold;

          // Stop all sounds when round ends, unless it is a match end (champion screen)
          if (!isMatchEnd) {
            stopAllSounds();
            stopAllLoopingSounds();
          }

          if (isMatchEnd && winnerFighter) {
            // Record win/loss for leaderboard (1v1 mode only) when they become champion
            if (state.mode === GAME_MODES.ONE_VS_ONE && winnerFighter) {
              const winnerFighterIndex = typeof winnerFighter.fighterIndex === 'number' ? winnerFighter.fighterIndex : winnerIndex;
              const loserIndex = winnerFighterIndex === 0 ? 1 : 0;
              const loserFighterIndex = typeof state.fighters[loserIndex]?.fighterIndex === 'number'
                ? state.fighters[loserIndex].fighterIndex
                : loserIndex;
              recordWin(winnerFighterIndex);
              recordLoss(loserFighterIndex);
            }

            state.matchWinner = winnerFighter;
            state.gameState = 'matchEnd';
          } else {
            state.gameState = 'roundEnd';
          }
        } else if (state.mode === 'FFA' && roundEnds) {
          state.roundWinner = realAttacker;
          state.roundEndTimer = 0;
          state.ffaMatchComplete = true; // Signals main.js to show leaderboards

          // Stop all sounds when round ends, unless it is a match end (champion screen)
          if (!state.ffaMatchComplete) {
            stopAllSounds();
            stopAllLoopingSounds();
          }

          state.gameState = 'roundEnd';
        }
      }
    }
    return true;
  }

  /** Heals the fighter by a given amount and triggers the green health bar edge glow effect. */
  heal(amount, opts = {}) {
    if (this.hp <= 0 || amount <= 0) return false;
    const prevHp = Number(this.hp) || 0;
    this.hp = Math.min(this.maxHp, Number((prevHp + amount).toFixed(2)));
    const actualHealed = this.hp - prevHp;
    if (actualHealed > 0) {
      this._healthBarHealTimer = 14;
      if (!opts.silent) {
        const color = opts.color || '#22c55e';
        spawnFloatingText(this.x, this.y - this.r - 8, `+${Math.round(actualHealed)}`, color);
      }
      return true;
    }
    return false;
  }

  /** Resolves wall collision and bounces back with varied angles. */
  resolveWallBounce(arena) {
    if (this.caughtInGenosBeamTimer > 0 || this.preventKnockbackBounce) {
      // Pin trapped target against wall bounds without bouncing back or adding random angle jitter
      let clamped = false;
      if (this.x - this.r < arena.x) {
        this.x = arena.x + this.r;
        this.vx = 0;
        clamped = true;
      } else if (this.x + this.r > arena.x + arena.width) {
        this.x = arena.x + arena.width - this.r;
        this.vx = 0;
        clamped = true;
      }
      if (this.y - this.r < arena.y) {
        this.y = arena.y + this.r;
        this.vy = 0;
        clamped = true;
      } else if (this.y + this.r > arena.y + arena.height) {
        this.y = arena.y + arena.height - this.r;
        this.vy = 0;
        clamped = true;
      }
      return clamped;
    }

    let bounced = false;
    const restitution = CONFIG.collision.restitution;
    const angleJitter = 3.5;  // Increased for more random bounce angles

    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      this.vx = Math.abs(this.vx) * restitution;
      this.vy += (Math.random() - 0.5) * angleJitter;
      bounced = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      this.vx = -Math.abs(this.vx) * restitution;
      this.vy += (Math.random() - 0.5) * angleJitter;
      bounced = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      this.vy = Math.abs(this.vy) * restitution;
      this.vx += (Math.random() - 0.5) * angleJitter;
      bounced = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      this.vy = -Math.abs(this.vy) * restitution;
      this.vx += (Math.random() - 0.5) * angleJitter;
      bounced = true;
    }

    if (bounced) {
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
      const bias = (Math.random() - 0.5) * 2.0;  // Increased for stronger tangent adjustment
      const nx = this.vx / speed;
      const ny = this.vy / speed;
      const tangentX = -ny;
      const tangentY = nx;
      this.vx += tangentX * bias;
      this.vy += tangentY * bias;
      
      // Add extra randomized direction component to prevent bouncing back same way
      const randomDirectionBoost = (Math.random() - 0.5) * 1.5;
      const randomDirectionBoostOrthogonal = (Math.random() - 0.5) * 1.5;
      this.vx += randomDirectionBoost;
      this.vy += randomDirectionBoostOrthogonal;
      
      this.normalizeSpeed();
    }
  }

  /** Plays a wall bounce sound effect. */
  playWallBounceSound() {
    // Disabled as requested
  }

  /** Controls how the gun is aimed. Default aims in direction of opponent with delayed reaction time if stealthed. */
  aim(opponent) {
    if (!opponent || this.isTargetOfAmbush || (this.knockbackStunTimer > 0) || (this.hitStunTimer > 0) || (this.timeStopTimer > 0)) {
      return;
    }

    // Target Musashi's ghost if he is flurrying
    let targetX = opponent.x;
    let targetY = opponent.y;
    if (opponent.type === 'musashi' && opponent.flurryHitsLeft > 0 && opponent.flurryGhost) {
      targetX = opponent.flurryGhost.x;
      targetY = opponent.flurryGhost.y;
    }

    const targetAngle = Math.atan2(targetY - this.y, targetX - this.x);

    // If opponent is stealthed (e.g. Toji Heavenly Restriction), aim tracking has a sluggish delayed reaction time!
    if (opponent.isStealthed) {
      const currentAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
      let diff = targetAngle - currentAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      const turnRate = CONFIG.toji?.stealthTurnRate || 0.035;
      this.gunAngle = currentAngle + diff * turnRate;
      this.angle = this.gunAngle;
      return;
    }

    this.gunAngle = targetAngle;
    this.angle = targetAngle;
  }

  /** Collision hook to trigger custom logic. Override in subclasses. */
  onCollide(opponent) {}

  /** Spawns a projectile using the projectile system. */
  shoot(ownerIndex) {
    if (typeof state !== 'undefined' && state.gameState !== 'playing') {
      return;
    }
    if (projectileSystem) {
      projectileSystem.fireProjectile(this, ownerIndex, this.damage);
    }
    // Play attack sound with configurable timing for all fighter types
    const sound = getBasicAttackSound(this._def?.id, this._def?.type);
    this._attackSoundTimer = sound.delay;
    this._attackSoundConfig = sound;
  }

  /** Call this every frame to process pending attack sound timers. */
  _tickAttackSound() {
    if (this._attackSoundTimer !== undefined && this._attackSoundTimer !== null) {
      this._attackSoundTimer--;
      if (this._attackSoundTimer <= 0) {
        const sound = this._attackSoundConfig;
        if (sound) {
          if (Array.isArray(sound.src)) {
            if (this._soundIndex === undefined) this._soundIndex = 0;
            audioSystem.playSFX(sound.src[this._soundIndex], sound.volume);
            this._soundIndex = (this._soundIndex + 1) % sound.src.length;
          } else {
            audioSystem.playSFX(sound.src, sound.volume);
          }
        }
        this._attackSoundTimer = null;
        this._attackSoundConfig = null;
      }
    }
  }

  /**
   * Applies slow timer, hit stun, velocity recovery, and basic position update.
   * Extracted so subclasses that override update() can still use base physics.
   * @param {number} extraMultiplier - Extra speed multiplier (e.g. for reloading)
   */
  applyMovementPhysics(extraMultiplier = 1) {
    // Determine intended target speed
    let targetSpeed = this.speed;
    if (typeof isChampionScreenActive === 'function' && isChampionScreenActive()) {
      targetSpeed = 0;
    }
    if (this.blackFlashTimer > 0) {
      targetSpeed *= (CONFIG.blackFlash?.zone?.speedMultiplier ?? 1.20); // 120% speed inside "The Zone"
    }
    if (this.soulSwapActive) {
      targetSpeed *= (CONFIG.yuji?.soulSwapSpeedMultiplier ?? 1.30); // noticeable speed boost during Soul Swap
    }
    if (this.slowTimer > 0) {
      this.slowTimer--;
      targetSpeed *= this.slowMultiplier;
    }
    // Hit stun slows the fighter significantly on impact
    if (this.hitStunTimer > 0) {
      this.hitStunTimer--;
      targetSpeed *= this.hitStunMultiplier;
    }
    // Crimson electrified visual timer
    if (this.crimsonElectrifiedTimer > 0) {
      this.crimsonElectrifiedTimer--;
    }
    
    targetSpeed *= extraMultiplier;

    // Velocity Recovery (gradually return to target speed after knockback or slow)
    let currentSpeed = Math.hypot(this.vx, this.vy);
    
    // Auto-recover from zero velocity if we should be moving
    if (targetSpeed > 0 && currentSpeed < 0.05) {
      // Nudge in the direction of our facing angle
      const nudgeAngle = this.angle || this.gunAngle || 0;
      this.vx = Math.cos(nudgeAngle) * 0.1;
      this.vy = Math.sin(nudgeAngle) * 0.1;
      currentSpeed = 0.1;
    }
    
    if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
      const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.04;
      this.vx = (this.vx / currentSpeed) * newSpeed;
      this.vy = (this.vy / currentSpeed) * newSpeed;
    }

    // Movement
    this.x += this.vx;
    this.y += this.vy;
    if (!this.hitStunTimer || this.hitStunTimer <= 0) {
      const spinRate = this._def.spinRate ?? CONFIG.spin.rate;
      this.angle += this.speed * spinRate;
    }
  }

  /** Standard per-frame update tick for basic movement, shooting, and physics. */
  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();
    
    // Black hole shrinking visual logic
    if (this.visualScale === undefined) this.visualScale = 1.0;
    if (this.visualScaleTarget === undefined) this.visualScaleTarget = 1.0;

    const shrinkSpeed = CONFIG.black?.blackHoleVisualShrinkSpeed ?? 0.05;
    if (Math.abs(this.visualScale - this.visualScaleTarget) > 0.01) {
      this.visualScale += (this.visualScaleTarget - this.visualScale) * shrinkSpeed;
    } else {
      this.visualScale = this.visualScaleTarget;
    }
    // Reset target to 1.0; projectile system will lower it if currently inside a black hole
    this.visualScaleTarget = 1.0;

    if (this.thunderRootsTimer > 0) {
      this.thunderRootsTimer--;
    }

    if (this.voidMarkTimer > 0) {
      this.voidMarkTimer--;
    }

    if (this.caughtInGenosBeamTimer > 0) {
      this.caughtInGenosBeamTimer--;
    }

    // Time stop - freeze movement if time stopped
    if (this._handleTimeStop()) {
      return;
    }

    // Stop attacking if round/match has ended or if target/opponent is dead!
    const isGamePlaying = typeof state !== 'undefined' && state.gameState === 'playing';
    const isTargetAlive = opponent && !opponent.isDead && opponent.hp > 0;

    if (!isGamePlaying || !isTargetAlive) {
      this.interruptAttacks();
      this.shootCooldown = 60;
      return;
    }

    // Shooting
    const canAct = !this.hitStunTimer || this.hitStunTimer <= 0;
    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    } else if (this._def.type !== 'orange' && canAct) { // Prevent Orange from using this default shoot
      this.shoot(ownerIndex);
      this.shootCooldown = this.shootCooldownMax;
    }

    this.applyMovementPhysics();

    // Aiming & Bouncing
    if (canAct) {
      this.aim(opponent);
    }
    this.resolveWallBounce(arena, opponent);
  }

  /** Draws the basic circle body. Subclasses can override for custom rendering. */
  drawBody(ctx) {
    FighterRenderer.drawBody(ctx, this);
  }

  drawStatusOverlays(ctx, baseRadius) {
    FighterRenderer.drawStatusOverlays(ctx, this);
  }

  drawOutline(ctx) {
    FighterRenderer.drawOutline(ctx, this);
  }

  /** Draws standard grey weapon barrel. */
  drawGun(ctx) {
    FighterRenderer.drawGun(ctx, this);
  }

  drawHealth(ctx) {
    FighterRenderer.drawHealth(ctx, this);
  }

  drawFreezeTimer(ctx) {
    FighterRenderer.drawFreezeTimer(ctx, this);
  }

  /** Main entry point for drawing. */
  draw(ctx) {
    FighterRenderer.draw(ctx, this);
  }

  /** Draws concentric green rings and aura for Reverse Cursed Technique. */
  _drawRCTVisuals(ctx) {
    const prog = 1 - (this.rctVisualTimer / this.rctVisualMaxTimer); // 0 to 1
    const alpha = Math.sin((1 - prog) * Math.PI); // fade in and out

    ctx.save();
    ctx.translate(this.x, this.y);
    // Removed 'lighter' composite operation because it turns white on bright backgrounds

    // Draw 3 concentric green rings expanding
    for (let i = 0; i < 3; i++) {
      const ringProg = (prog + i * 0.3) % 1.0;
      const ringRadius = this.r + (ringProg * 60);
      const ringAlpha = alpha * (1 - ringProg);

      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.lineWidth = 4 + (1 - ringProg) * 6; // Thicker lines
      ctx.strokeStyle = `rgba(0, 255, 100, ${ringAlpha})`; // Brighter neon green
      ctx.stroke();
    }

    // Add a soft green core glow
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.r * 2);
    coreGrad.addColorStop(0, `rgba(0, 255, 100, ${alpha * 0.6})`);
    coreGrad.addColorStop(1, 'rgba(0, 255, 100, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
