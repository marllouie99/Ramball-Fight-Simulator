import { CONFIG } from '../../../core/config.js';
import { applyDamageToTarget } from '../../fighter.js';
import { playSkillEffectSound } from '../../../soundEffects/skillEffectSounds.js';
import { spawnImpactFlash, spawnSparks } from '../../../graphics/particles/sparkEffect.js';

export function modUpdateMeleeCombat(target) {
  // If we are currently punching, we can't start a new punch
  if (this.punchAnimTimer > 0) return;

  // Start punch animation
  this.punchAnimTimer = this.punchMaxTime;
  
  // Calculate attack direction (if not already facing target)
  const angle = Math.atan2(target.y - this.y, target.x - this.x);

  // Black Flash mechanic
  let damage = CONFIG.todo?.punchDamage || 15;
  let knockback = CONFIG.todo?.knockback || 15;
  let isBlackFlash = false;

  if (this.justSwappedTimer > 0) {
    isBlackFlash = true;
    damage *= 2;
    knockback *= 1.5;
    this.justSwappedTimer = 0; // Consume the buff
  }

  // Apply damage and knockback
  target.vx += Math.cos(angle) * knockback;
  target.vy += Math.sin(angle) * knockback;
  
  applyDamageToTarget(this, target, damage);
  this.cooldownTimer = this.cooldown;

  // Effects
  if (isBlackFlash) {
    // Red/Black flash for Black Flash
    spawnImpactFlash(target.x, target.y, 35, '#8B0000'); // Dark red
    spawnSparks(target.x, target.y, '#000000', 8, 5); // Black sparks
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
