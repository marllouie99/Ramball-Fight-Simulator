import { CONFIG } from '../../core/config.js';
import { fastCleanArray } from '../../graphics/particles/visualTrailSystem.js';

export class StatusEffectsManager {
  constructor(fighter) {
    this.fighter = fighter;
  }

  isSilenced() {
    return (this.fighter.silenceTimer || 0) > 0;
  }

  applySlow(frames, multiplier) {
    if (this.fighter.immuneToCC || this.fighter.domainImmunity || this.fighter.characterId === 'toji' || this.fighter.type === 'toji') return;
    if (this.fighter.slowTimer < frames) this.fighter.slowTimer = frames;
    this.fighter.slowMultiplier = multiplier;
  }

  applyHitStun(frames) {
    if (this.fighter.immuneToCC || this.fighter.domainImmunity || this.fighter.characterId === 'toji' || this.fighter.type === 'toji') return;
    if (!this.fighter.hitStunTimer || this.fighter.hitStunTimer < frames) {
      this.fighter.hitStunTimer = frames;
      this.fighter.hitStunMultiplier = 0.3;
    }
  }

  // --- Poison ---
  applyPoison(attacker) {
    const grenadierCfg = CONFIG.grenadier || {};
    const ticks = (typeof grenadierCfg.poisonTicks === 'number')
      ? grenadierCfg.poisonTicks
      : 2;

    this.fighter.poisonTicks = ticks;
    this.fighter.poisonTimer = 0;
    this.fighter.lastPoisonAttacker = attacker;
  }

  handlePoison() {
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
    this.fighter.burnTimer = CONFIG.orange?.burnDuration || 180;
    this.fighter.burnDamageTimer = 0;
    this.fighter.lastBurnAttacker = attacker;
  }

  handleBurn() {
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

  // --- Freeze / Time Stop ---
  applyTimeStop(frames) {
    // Only apply if not immune
    if (this.fighter.domainImmunity || this.fighter.characterId === 'toji' || this.fighter.type === 'toji') {
      return;
    }
    
    // Mahoraga adaptation logic bypass
    if (this.fighter.gojoInfinityImmune && this.fighter.characterId === 'mahoraga') {
      return;
    }

    const currentRemaining = this.fighter.timeStopTimer || 0;
    // Overwrite only if the new duration is greater than what's left, 
    // or if we are applying a fresh freeze.
    // We do NOT want to overwrite a 60-frame remaining freeze with a 2-frame hit-pause.
    if (frames > currentRemaining) {
      this.fighter._timeStopOriginalDuration = frames;
      this.fighter.timeStopTimer = frames;
    }
  }

  handleTimeStop() {
    const fighter = this.fighter;
    if (fighter.domainImmunity || fighter.characterId === 'toji' || fighter.type === 'toji') {
      fighter.timeStopTimer = 0;
      fighter.electricStunTimer = 0;
      fighter.crimsonElectrifiedTimer = 0;
      fighter.dubstepStunTimer = 0;
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
      if (fighter.timeStopTimer <= 0) {
        fighter.timeStopTimer = 0;
        fighter.isFrozenByInfinity = false;
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
      }
      return true;
    }
    return false;
  }

  // --- Main Update ---
  update() {
    this.handlePoison();
    this.handleBurn();
    return this.handleTimeStop();
  }
}
