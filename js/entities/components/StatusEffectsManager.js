import { CONFIG } from '../../core/config.js';
import { fastCleanArray } from '../../graphics/particles/visualTrailSystem.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';

export class StatusEffectsManager {
  // Static registry for global debuff / status effect processors
  static _debuffProcessors = [];

  /** Registers a global status effect / debuff processor */
  static registerDebuff(processor) {
    if (typeof processor === 'function' && !StatusEffectsManager._debuffProcessors.includes(processor)) {
      StatusEffectsManager._debuffProcessors.push(processor);
    }
  }

  constructor(fighter) {
    this.fighter = fighter;
    this._lastStatusTickFrame = -1;
  }

  isSilenced() {
    return (this.fighter.silenceTimer || 0) > 0;
  }

  applySlow(frames, multiplier, opts = {}) {
    if (this.fighter.isBaguvixActive || this.fighter.isGodModeActive) return;
    if ((this.fighter.immuneToCC || this.fighter.domainImmunity || this.fighter.characterId === 'toji' || this.fighter.type === 'toji') && !opts.isPurple && !opts.isRed && !opts.isInfinitySlow) return;
    if (this.fighter.slowTimer < frames) this.fighter.slowTimer = frames;
    this.fighter.slowMultiplier = multiplier;
  }

  applyHitStun(frames, opts = {}) {
    if (this.fighter.isBaguvixActive || this.fighter.isGodModeActive) return;
    if ((this.fighter.immuneToCC || this.fighter.domainImmunity || this.fighter.characterId === 'toji' || this.fighter.type === 'toji') && !opts.isPurple && !opts.isRed) return;
    if (!this.fighter.hitStunTimer || this.fighter.hitStunTimer < frames) {
      this.fighter.hitStunTimer = frames;
      this.fighter.hitStunMultiplier = 0.3;
    }
  }

  applyParalyze(frames, opts = {}) {
    if (this.fighter.isBaguvixActive || this.fighter.isGodModeActive) return;
    if ((this.fighter.immuneToCC || this.fighter.domainImmunity || this.fighter.characterId === 'toji' || this.fighter.type === 'toji') && !opts.isPurple && !opts.isBlue) return;
    if (!this.fighter.paralyzeTimer || this.fighter.paralyzeTimer < frames) {
      this.fighter.paralyzeTimer = frames;
    }
  }

  // --- Poison ---
  applyPoison(attacker) {
    if (this.fighter.isBaguvixActive || this.fighter.isGodModeActive) return;
    const grenadierCfg = CONFIG.grenadier || {};
    const ticks = (typeof grenadierCfg.poisonTicks === 'number')
      ? grenadierCfg.poisonTicks
      : 2;

    this.fighter.poisonTicks = ticks;
    this.fighter.poisonTimer = 0;
    this.fighter.lastPoisonAttacker = attacker;
  }

  handlePoison() {
    if (this.fighter.isBaguvixActive || this.fighter.isGodModeActive) {
      this.fighter.poisonTicks = 0;
      this.fighter.poisonTimer = 0;
      return;
    }
    if (this.fighter.poisonTicks > 0) {
      this.fighter.poisonTimer++;

      const grenadierCfg = CONFIG.grenadier || {};
      const intervalFrames = (typeof grenadierCfg.poisonIntervalFrames === 'number')
        ? grenadierCfg.poisonIntervalFrames
        : 60;

      const damagePerTick = (typeof grenadierCfg.poisonDamagePerTick === 'number')
        ? grenadierCfg.poisonDamagePerTick
        : 2;

      if (this.fighter.poisonTimer >= intervalFrames) {
        if (typeof this.fighter.takeDamage === 'function') {
          this.fighter.takeDamage(damagePerTick, this.fighter.lastPoisonAttacker, { isPoison: true });
        }
        this.fighter.poisonTicks--;
        this.fighter.poisonTimer = 0;
      }
    }
  }

  // --- Burn ---
  applyBurn(attacker) {
    if (this.fighter.isBaguvixActive || this.fighter.isGodModeActive) return;
    this.fighter.burnTimer = CONFIG.orange?.burnDuration || 180;
    this.fighter.burnDamageTimer = 0;
    this.fighter.lastBurnAttacker = attacker;
  }

  handleBurn() {
    if (this.fighter.isBaguvixActive || this.fighter.isGodModeActive) {
      this.fighter.burnTimer = 0;
      this.fighter.burnDamageTimer = 0;
      return;
    }
    if (this.fighter.burnTimer > 0) {
      this.fighter.burnTimer--;
      this.fighter.burnDamageTimer++;
      const damageInterval = CONFIG.orange?.burnDamageInterval || 30;
      
      if (this.fighter.burnDamageTimer >= damageInterval) {
        const damage = CONFIG.orange?.burnDamagePerSecond || 5;
        if (typeof this.fighter.takeDamage === 'function') {
          this.fighter.takeDamage(damage, this.fighter.lastBurnAttacker, { isBurn: true });
        }
        this.fighter.burnDamageTimer = 0;
      }
    }
  }

  // --- Bleed ---
  applyBleed(attacker, duration, damagePerTick, intervalFrames) {
    if (this.fighter.isBaguvixActive || this.fighter.isGodModeActive) return;
    const bleedCfg = CONFIG.bleed || {};
    const finalDuration = duration ?? bleedCfg.defaultDuration ?? 180;
    const finalDamage = damagePerTick ?? bleedCfg.defaultDamagePerTick ?? 4;
    const finalInterval = intervalFrames ?? bleedCfg.defaultIntervalFrames ?? 30;

    this.fighter.bleedTimer = Math.max(this.fighter.bleedTimer || 0, finalDuration);
    this.fighter.bleedDamageTimer = 0;
    this.fighter.bleedDamagePerTick = finalDamage;
    this.fighter.bleedIntervalFrames = finalInterval;
    this.fighter.lastBleedAttacker = attacker;
  }

  handleBleed() {
    if (this.fighter.isBaguvixActive || this.fighter.isGodModeActive) {
      this.fighter.bleedTimer = 0;
      this.fighter.bleedDamageTimer = 0;
      return;
    }
    if (this.fighter.bleedTimer > 0) {
      this.fighter.bleedTimer--;
      this.fighter.bleedDamageTimer = (this.fighter.bleedDamageTimer || 0) + 1;

      const bleedCfg = CONFIG.bleed || {};
      const intervalFrames = this.fighter.bleedIntervalFrames || bleedCfg.defaultIntervalFrames || 30;
      const damage = this.fighter.bleedDamagePerTick || bleedCfg.defaultDamagePerTick || 4;
      const dripFreq = bleedCfg.dripParticleIntervalFrames || 5;

      if (this.fighter.bleedDamageTimer >= intervalFrames) {
        if (typeof this.fighter.takeDamage === 'function') {
          this.fighter.takeDamage(damage, this.fighter.lastBleedAttacker, true, { isBleed: true });
        }
        this.fighter.bleedDamageTimer = 0;
      }

      // Continuous dripping blood particles (drops every dripFreq frames while bleeding!)
      if (this.fighter.bleedTimer % dripFreq === 0) {
        const dropX = this.fighter.x + (Math.random() - 0.5) * (this.fighter.r || 25);
        const dropY = (this.fighter.y - (this.fighter.z || 0)) + (Math.random() - 0.2) * (this.fighter.r || 25);
        spawnBloodEffect({ x: dropX, y: dropY, z: 0, r: 4 }, 1, Math.PI / 2, {
          minSize: 2.2,
          maxSize: 4.0,
          count: 2
        });
      }
    }
  }

  // --- Freeze / Time Stop ---
  applyTimeStop(frames, opts = {}) {
    // Only apply if not immune
    if (this.fighter.isBaguvixActive || this.fighter.isGodModeActive || this.fighter.domainImmunity || this.fighter.characterId === 'toji' || this.fighter.type === 'toji') {
      return;
    }
    
    // Mahoraga Limitless Infinity barrier adaptation immunity (does NOT bypass Domain Expansion Unlimited Void!)
    if (this.fighter.gojoInfinityImmune && (this.fighter.characterId === 'mahoraga' || this.fighter.type === 'mahoraga') && !opts?.isDomain) {
      return;
    }

    const currentRemaining = this.fighter.timeStopTimer || 0;
    if (frames > currentRemaining) {
      this.fighter._timeStopOriginalDuration = frames;
      this.fighter.timeStopTimer = frames;
      
      // Snapshot angles on fresh timeStop to lock orientation in place
      if (currentRemaining <= 0) {
        if (typeof this.fighter._timeStopFrozenAngle !== 'number') {
          this.fighter._timeStopFrozenAngle = this.fighter.angle;
        }
        if (typeof this.fighter._timeStopFrozenGunAngle !== 'number') {
          this.fighter._timeStopFrozenGunAngle = this.fighter.gunAngle;
        }
      }
    }
  }

  handleTimeStop() {
    const fighter = this.fighter;
    if (fighter.isBaguvixActive || fighter.isGodModeActive || fighter.domainImmunity || fighter.characterId === 'toji' || fighter.type === 'toji') {
      fighter.timeStopTimer = 0;
      fighter.isFrozenByInfinity = false;
      fighter.electricStunTimer = 0;
      fighter.crimsonElectrifiedTimer = 0;
      fighter.dubstepStunTimer = 0;
      fighter.hitStunTimer = 0;
      fighter.paralyzeTimer = 0;
      return false;
    }
    const isFrozen = (fighter.crimsonElectrifiedTimer > 0) || (fighter.electricStunTimer > 0) || (fighter.dubstepStunTimer > 0) || (fighter.timeStopTimer > 0);

    if (isFrozen) {
      fighter.mahoragaAdaptationFreezeTimer = 0;
      // DECAY VISUAL TRAILS SO THEY DON'T FREEZE IN PLACE WHILE INCAPACITATED
      if (fighter.dashTrail) {
        fastCleanArray(fighter.dashTrail, (item) => {
          item.alpha -= 0.02;
          return item.alpha > 0;
        });
      }
      if (fighter.afterImages && fighter.afterImages.length > 0) {
        fastCleanArray(fighter.afterImages, (item) => {
          item.timer--;
          return item.timer > 0;
        });
      }
      if (fighter.slashEffects && fighter.slashEffects.length > 0) {
        fastCleanArray(fighter.slashEffects, (item) => {
          item.timer--;
          return item.timer > 0;
        });
      }
      if (fighter.swordTrailHistory && fighter.swordTrailHistory.length > 0) {
        fighter.swordTrailHistory.pop();
      }
      if (fighter.trailHistory && fighter.trailHistory.length > 0) {
        fighter.trailHistory.pop();
      }
    }

    // Crimson Execution Stun & DoT
    if (fighter.crimsonElectrifiedTimer > 0) {
      fighter.crimsonElectrifiedTimer--;
      
      const dmgPerSec = CONFIG.sharpshooter?.electrifiedDamagePerSec || 15;
      if (typeof fighter.takeDamage === 'function') {
        fighter.takeDamage(dmgPerSec / 60, fighter.lastCrimsonAttacker, { isElectrified: true });
      }
      
      // Apply extreme friction to stop knockback quickly
      fighter.vx *= 0.5;
      fighter.vy *= 0.5;
      fighter.x += fighter.vx;
      fighter.y += fighter.vy;
      if (typeof fighter._handleFrozenSkillCooldowns === 'function') {
        fighter._handleFrozenSkillCooldowns();
      }
      return true;
    }

    if (fighter.silenceTimer > 0) {
      fighter.silenceTimer--;
      if (typeof fighter.interruptAttacks === 'function') fighter.interruptAttacks();
    }

    // Electric stun - immobilize the fighter completely.
    if (fighter.electricStunTimer > 0) {
      fighter.electricStunTimer--;
    }
    
    if (fighter.dubstepStunTimer > 0) {
      fighter.dubstepStunTimer--;
      fighter.dubstepStunVisualTimer = 45; // 0.75 seconds of visual fade out
    } else if (fighter.dubstepStunVisualTimer > 0) {
      fighter.dubstepStunVisualTimer--;
    }
    
    if (fighter.electricStunTimer > 0 || fighter.dubstepStunTimer > 0) {
      fighter.vx *= 0.5;
      fighter.vy *= 0.5;
      fighter.x += fighter.vx;
      fighter.y += fighter.vy;
      if (typeof fighter._handleFrozenSkillCooldowns === 'function') {
        fighter._handleFrozenSkillCooldowns();
      }
      return true;
    }

    // Return true when time stop is active (and handled) to allow callers to short-circuit.
    if (fighter.timeStopTimer > 0) {
      fighter.timeStopTimer--;
      if (typeof fighter._timeStopFrozenAngle === 'number') {
        fighter.angle = fighter._timeStopFrozenAngle;
      }
      if (typeof fighter._timeStopFrozenGunAngle === 'number') {
        fighter.gunAngle = fighter._timeStopFrozenGunAngle;
      }

      // Continuously decrement skill & ultimate cooldowns while frozen (EXCEPT inside Gojo's Unlimited Void Domain)
      if (typeof fighter._handleFrozenSkillCooldowns === 'function') {
        fighter._handleFrozenSkillCooldowns();
      }

      if (fighter.timeStopTimer <= 0) {
        fighter.timeStopTimer = 0;
        fighter.isFrozenByInfinity = false;
        fighter.suppressFreezeOverlay = false;
        fighter.preventKnockbackBounce = false;
        delete fighter._suppressFreezeTimer;
        // Restore any saved velocities (from counter or sphere freezes)
        if (typeof fighter._resumeVx === 'number') {
          fighter.vx = fighter._resumeVx;
          delete fighter._resumeVx;
        }
        if (typeof fighter._resumeVy === 'number') {
          fighter.vy = fighter._resumeVy;
          delete fighter._resumeVy;
        }
        delete fighter._timeStopFrozenAngle;
        delete fighter._timeStopFrozenGunAngle;
        delete fighter._timeStopOriginalDuration;
        delete fighter._timeStopStartTime;

        // Restore baseline movement velocity if fighter is stationary and not channeling/building
        if (fighter.vx === 0 && fighter.vy === 0 && (fighter.speed || 0) > 0 && !fighter.isBuildingTurret && !fighter.isChannelingDomain && !fighter.isCountering) {
          const arenaCenterX = (typeof CONFIG !== 'undefined' && CONFIG.arena) ? (CONFIG.arena.x + CONFIG.arena.width / 2) : fighter.x;
          const arenaCenterY = (typeof CONFIG !== 'undefined' && CONFIG.arena) ? (CONFIG.arena.y + CONFIG.arena.height / 2) : fighter.y;
          const recoverAngle = Math.atan2(arenaCenterY - fighter.y, arenaCenterX - fighter.x) + (Math.random() - 0.5) * 0.4;
          fighter.vx = Math.cos(recoverAngle) * fighter.speed;
          fighter.vy = Math.sin(recoverAngle) * fighter.speed;
        }
      }
      return true;
    } else {
      fighter.isFrozenByInfinity = false;
    }
    return false;
  }

  /**
   * Unified master handler for all global status effects and debuffs.
   * Frame-safe: executes all registered debuff processors once per tick.
   */
  handleStatusEffects() {
    const currentFrame = (typeof state !== 'undefined' && typeof state.frameCount === 'number') ? state.frameCount : (this._lastStatusTickFrame + 1);
    if (this._lastStatusTickFrame === currentFrame && typeof state !== 'undefined' && typeof state.frameCount === 'number') {
      return; // Already processed this frame!
    }
    this._lastStatusTickFrame = currentFrame;

    this.handlePoison();
    this.handleBurn();
    this.handleBleed();

    // Execute any dynamically registered debuff processors
    for (let i = 0; i < StatusEffectsManager._debuffProcessors.length; i++) {
      StatusEffectsManager._debuffProcessors[i](this.fighter, this);
    }
  }

  /** Unified dispatch method for applying any status effect by name */
  applyStatusEffect(effectName, ...args) {
    switch (effectName) {
      case 'bleed': return this.applyBleed(...args);
      case 'poison': return this.applyPoison(...args);
      case 'burn': return this.applyBurn(...args);
      case 'slow': return this.applySlow(...args);
      case 'hitStun': return this.applyHitStun(...args);
      case 'paralyze': return this.applyParalyze(...args);
      case 'timeStop': return this.applyTimeStop(...args);
      default:
        console.warn(`[StatusEffectsManager] Unknown status effect: ${effectName}`);
    }
  }

  // --- Main Update ---
  update() {
    this.handleStatusEffects();
    return this.handleTimeStop();
  }
}
