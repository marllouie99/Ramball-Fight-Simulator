import { CONFIG } from '../../../core/config.js';
import { applyDamageToTarget } from '../../fighter.js';
import { getSkillSound } from '../../../soundEffects/skillSounds.js';
import { state, spawnFloatingText } from '../../../core/state.js';
import { spawnImpactFlash, spawnSparks, spawnAnimePunchImpactFrame } from '../../../graphics/particles/sparkEffect.js';
import { spawnBlackFlash } from '../../../graphics/particles/blackFlashEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';

function playTodoPunchSound() {
  const soundSrc = CONFIG.todo?.punchSound || 'Assets/Sound Effects/Attacks/punch.mp3';
  const soundVol = CONFIG.todo?.punchVolume || 2.8;
  audioSystem.playSFX(soundSrc, soundVol);
}

export function modUpdateMeleeCombat(target, isCombo = false) {
  // If we are currently punching and it's not a combo trigger, we can't start a new punch
  if (!isCombo && this.punchAnimTimer > 0) return;

  // Start punch animation (snappy 10 frames for combo punches, punchSpeed for standard punches)
  this.punchAnimTimer = isCombo ? 10 : (this.punchMaxTime || 20);
  
  // Toggle fists
  this.isRightPunch = !this.isRightPunch;
  this.hideFrontHand = false;
  this.hideBackHand = false;

  if (!isCombo) {
    this.cooldownTimer = CONFIG.todo?.basicPunchCooldown || 28;
  }

  // If no target or enemy is outside punch reach distance, punch air and return (no damage or knockback)
  if (!target) {
    playTodoPunchSound();
    return;
  }

  const dist = Math.hypot(target.x - this.x, target.y - this.y);
  const maxReach = (this.r || 25) + (target.r || 25) + (CONFIG.todo?.punchRange || 60);
  if (dist > maxReach) {
    playTodoPunchSound();
    return;
  }
  
  // Calculate attack direction (if not already facing target)
  const angle = Math.atan2(target.y - this.y, target.x - this.x);

  // Black Flash mechanic & Knockback scaling
  let damage = CONFIG.todo?.punchDamage || 15;
  let baseKnockback = CONFIG.todo?.knockback || 12;
  let isBlackFlash = false;

  if (this.justSwappedTimer > 0) {
    isBlackFlash = true;
    damage *= 2;
    this.justSwappedTimer = 0; // Consume the buff
    this.blackFlashGlowTimer = 35; // Keep glowing fists during and briefly after the hit!
  }

  // Knockback scaling: keep enemy locked in place on early combo hits, moderate push on final hit
  let knockback = baseKnockback;
  if (isCombo) {
    if (this.rockCounterComboLeft > 1) {
      // Intermediate combo hit: cancel accumulated velocity so enemy stays right in front of Todo
      target.vx *= 0.1;
      target.vy *= 0.1;
      knockback = 0.5; // Micro push for hit impact feel without pushing enemy away
    } else {
      // Final finisher hit: clean pushback
      knockback = baseKnockback * 1.2;
    }
  }

  // Apply damage and knockback
  target.vx += Math.cos(angle) * knockback;
  target.vy += Math.sin(angle) * knockback;
  
  applyDamageToTarget(target, damage, this);

  if (!isCombo) {
    this.cooldownTimer = CONFIG.todo?.basicPunchCooldown || 28;
  }

  // Spiky Crescent Impact — centered on target so inner arc hugs the target circle
  spawnAnimePunchImpactFrame(target.x, target.y, isBlackFlash ? 80 : 55, angle);

  // Effects
  if (isBlackFlash) {
    // Full JJK-style Black Flash — void implosion + crimson screen flash + cursed energy bolts
    spawnBlackFlash(target.x, target.y);
    playTodoPunchSound();
    const sound = getSkillSound(this.id, 'blackflash');
    if (sound) audioSystem.playSFX(sound.src, sound.volume);
    if (typeof target.applySlow === 'function') {
      target.applySlow(
        CONFIG.blackFlash?.debuff?.slowDuration ?? 70,
        CONFIG.blackFlash?.debuff?.slowMultiplier ?? 0.45
      );
    }
    target.blackFlashDebuffTimer = CONFIG.blackFlash?.debuff?.healReductionDuration ?? 270;
    
    // Todo enters the Zone!
    if (!this.blackFlashTimer || this.blackFlashTimer <= 0) {
      spawnFloatingText(this.x, this.y - this.r - 28, "THE ZONE 120%", "#D95C7E");
    }
    this.blackFlashTimer = CONFIG.blackFlash?.zone?.duration ?? 300;
  } else {
    playTodoPunchSound();
  }

}
