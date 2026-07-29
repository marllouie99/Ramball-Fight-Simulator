import { CONFIG } from '../../../core/config.js';
import { applyDamageToTarget } from '../../fighter.js';
import { playSkillEffectSound } from '../../../soundEffects/skillEffectSounds.js';
import { spawnImpactFlash, spawnSparks } from '../../../graphics/particles/sparkEffect.js';
import { spawnBlackFlash } from '../../../graphics/particles/blackFlashEffect.js';

export function modUpdateMeleeCombat(target, isCombo = false) {
  // If we are currently punching and it's not a combo trigger, we can't start a new punch
  if (!isCombo && this.punchAnimTimer > 0) return;

  // Start punch animation (snappy 10 frames for combo punches, punchSpeed for standard punches)
  this.punchAnimTimer = isCombo ? 10 : (this.punchMaxTime || 20);
  
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

  // Effects
  if (isBlackFlash) {
    // Full JJK-style Black Flash — void implosion + crimson screen flash + cursed energy bolts
    spawnBlackFlash(target.x, target.y);
    playSkillEffectSound('todo', 'heavypunch');
    playSkillEffectSound('todo', 'blackflash');
  } else {
    spawnImpactFlash(target.x, target.y, 20, '#ffffff');
    playSkillEffectSound('todo', 'heavypunch');
  }

  // Toggle fists
  this.isRightPunch = !this.isRightPunch;
  this.hideFrontHand = false;
  this.hideBackHand = false;
}
