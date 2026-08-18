import { CONFIG } from '../../../core/config.js';
import { applyDamageToTarget } from '../../fighter.js';
import { getSkillSound } from '../../../soundEffects/skillSounds.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { spawnImpactFlash, spawnSparks, spawnAnimePunchImpactFrame } from '../../../graphics/particles/sparkEffect.js';
import { spawnBlackFlash } from '../../../graphics/particles/blackFlashEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';

function playTodoPunchSound(fighter = null, isCombo = false) {
  const soundSrc = CONFIG.todo?.punchSound || 'Assets/Sound Effects/Attacks/punch.mp3';
  const soundVol = CONFIG.todo?.punchVolume || 2.8;
  audioSystem.playSFX(soundSrc, soundVol);

  // Play random punch noise on basic attack punches with configured probability (50% default)
  if (!isCombo && fighter) {
    const noiseChance = (typeof CONFIG.todo?.punchNoiseChance === 'number') ? CONFIG.todo.punchNoiseChance : 0.5;
    if (Math.random() < noiseChance) {
      const noiseList = CONFIG.todo?.punchNoiseSounds || [
        'Assets/Sound Effects/Skills/todo-punch-noise.mp3',
        'Assets/Sound Effects/Skills/todo-punch-noise2.mp3'
      ];
      if (noiseList.length > 0) {
        const selectedNoise = noiseList[Math.floor(Math.random() * noiseList.length)];
        const noiseVol = (typeof CONFIG.todo?.punchNoiseVolume === 'number') ? CONFIG.todo.punchNoiseVolume : 2.5;
        audioSystem.playFighterVoiceline(fighter, selectedNoise, noiseVol);
      }
    }
  }
}

export function modUpdateMeleeCombat(target, isCombo = false) {
  if (this.isTakadaChanneling) return;
  // If we are currently punching and it's not a combo trigger, we can't start a new punch
  if (!isCombo && this.punchAnimTimer > 0) return;

  // Start punch animation (snappy 10 frames for combo punches, punchSpeed for standard punches)
  this.punchAnimTimer = isCombo ? 10 : (this.punchMaxTime || 20);
  
  // Toggle fists
  this.isRightPunch = !this.isRightPunch;
  this.hideFrontHand = false;
  this.hideBackHand = false;

  if (!isCombo) {
    const baseCd = CONFIG.todo?.basicPunchCooldown || 28;
    const cdMult = this.isTakadaUltActive ? (CONFIG.todo?.takadaPunchCooldownMult || 0.6) : 1.0;
    this.cooldownTimer = baseCd * cdMult;
  }

  // If no target or enemy is outside punch reach distance, punch air and return (no damage or knockback)
  if (!target) {
    playTodoPunchSound(this, isCombo);
    return;
  }

  const dist = Math.hypot(target.x - this.x, target.y - this.y);
  const maxReach = (this.r || 25) + (target.r || 25) + (CONFIG.todo?.punchRange || 60);
  if (dist > maxReach) {
    playTodoPunchSound(this, isCombo);
    return;
  }
  
  // Calculate attack direction (if not already facing target)
  const angle = Math.atan2(target.y - this.y, target.x - this.x);

  // Black Flash mechanic & Knockback scaling
  let damage = CONFIG.todo?.punchDamage || 15;
  let baseKnockback = CONFIG.todo?.knockback || 12;
  let isBlackFlash = false;

  if (this.isTakadaUltActive) {
    damage *= (CONFIG.todo?.takadaDamageMultiplier || 1.5);
    isBlackFlash = true;
    this.blackFlashGlowTimer = 35;
  }

  if (this.justSwappedTimer > 0) {
    isBlackFlash = true;
    damage *= 2;
    this.justSwappedTimer = 0; // Consume the buff
    this.blackFlashGlowTimer = 35; // Keep glowing fists during and briefly after the hit!
  }

  // Knockback scaling: physical pushback on intermediate hits, explosive launcher push on final hit
  let knockback = baseKnockback;
  if (isCombo) {
    if (this.rockCounterComboLeft > 1) {
      // Intermediate combo hit: micro-flinch physics pushback & maintain 100% stop movement
      knockback = CONFIG.todo?.rockCounterComboPushback || 4.5;
      const holdFrames = (this.rockCounterComboInterval || 15) + 6;
      if (typeof target.applySlow === 'function') target.applySlow(holdFrames, 0.0);
      if (typeof target.applyHitStun === 'function') target.applyHitStun(holdFrames);
    } else {
      // Final finisher hit: explosive physics hit pushback
      knockback = CONFIG.todo?.rockCounterFinisherPushback || 24.0;
    }
  }

  const didDamage = applyDamageToTarget(target, damage, this);

  // Apply velocity pushback impulse & universal physics knockback only if attack wasn't blocked by Infinity
  if (didDamage !== false) {
    target.vx += Math.cos(angle) * knockback;
    target.vy += Math.sin(angle) * knockback;

    if (typeof target.applyKnockback === 'function') {
      target.applyKnockback(Math.cos(angle) * knockback, Math.sin(angle) * knockback);
    }

    // Apply stop movement & hit-stun to enemy on standard basic attacks as well
    if (!isCombo) {
      if (typeof target.applyHitStun === 'function') {
        const hitStunFrames = CONFIG.todo?.basicPunchHitStun || 14;
        target.applyHitStun(hitStunFrames);
      }
      if (typeof target.applySlow === 'function') {
        const slowDur = CONFIG.todo?.basicPunchSlowDuration || 20;
        const slowMult = CONFIG.todo?.basicPunchSlowMultiplier ?? 0.0;
        target.applySlow(slowDur, slowMult);
      }
    }

    // Arena Screen Shake Dispatcher
    if (typeof triggerGlobalScreenShake === 'function') {
      if (isBlackFlash) {
        const shake = CONFIG.todo?.blackFlashScreenShake || 16.0;
        triggerGlobalScreenShake(shake, 14);
      } else if (isCombo) {
        if (this.rockCounterComboLeft <= 1) {
          const shake = CONFIG.todo?.finisherScreenShake || 14.0;
          triggerGlobalScreenShake(shake, 10);
        } else {
          const shake = CONFIG.todo?.comboPunchScreenShake || 4.5;
          triggerGlobalScreenShake(shake, 4);
        }
      } else {
        const shake = CONFIG.todo?.punchScreenShake || 3.5;
        triggerGlobalScreenShake(shake, 5);
      }
    }
  }

  if (!isCombo) {
    this.cooldownTimer = CONFIG.todo?.basicPunchCooldown || 28;
  }

  // Spiky Crescent Impact — centered on target so inner arc hugs the target circle
  spawnAnimePunchImpactFrame(target.x, target.y, isBlackFlash ? 80 : 55, angle);

  // Effects
  if (isBlackFlash) {
    // Full JJK-style Black Flash — void implosion + crimson screen flash + cursed energy bolts
    spawnBlackFlash(target.x, target.y);
    playTodoPunchSound(this, isCombo);
    const bfAudioCfg = CONFIG.blackFlash?.audio || {};
    const sound = getSkillSound(this.id, 'blackflash');
    const bfVol = bfAudioCfg.volume ?? sound?.volume ?? 1.5;
    const bfElecVol = bfAudioCfg.electricVolume ?? bfVol;
    const bfSrc = bfAudioCfg.src || sound?.src || 'Assets/Sound Effects/Skills/blackflash1.mp3';
    const bfSrc2 = bfAudioCfg.src2 || sound?.src2 || 'Assets/Sound Effects/SkillEffects/blackflash-electric.mp3';
    if (bfSrc) audioSystem.playSFX(bfSrc, bfVol);
    if (bfSrc2) audioSystem.playSFX(bfSrc2, bfElecVol);
    if (didDamage !== false) {
      if (typeof target.applySlow === 'function') {
        target.applySlow(
          CONFIG.blackFlash?.debuff?.slowDuration ?? 70,
          CONFIG.blackFlash?.debuff?.slowMultiplier ?? 0.45
        );
      }
      target.blackFlashDebuffTimer = CONFIG.blackFlash?.debuff?.healReductionDuration ?? 270;
    }
    
    // Todo enters the Zone!
    this.blackFlashTimer = CONFIG.blackFlash?.zone?.duration ?? 300;
  } else {
    playTodoPunchSound(this, isCombo);
  }

}
