import { spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { playSound } from '../../../systems/soundSystem.js';
import { spawnSparks, spawnImpactFlash } from '../../../graphics/particles/sparkEffect.js';

/**
 * Handles Hydra's Weapon Copy mechanic logic.
 */

export function handleWeaponSteal(fighter, attacker) {
    if (attacker && attacker._def && attacker._def.type) {
      const type = attacker._def.type;
      
      // If he already has a weapon, we switch to the new one but the timer keeps ticking down!
      if (fighter.stolenWeaponTimer <= 0) {
          fighter.stolenWeaponTimer = fighter.stolenWeaponMaxTime;
          spawnFloatingText(fighter.x, fighter.y - fighter.r - 20, 'WEAPON COPIED!', '#8B008B');
      }
      
      fighter.stolenWeaponType = type;
      fighter.stolenWeaponDamage = attacker.damage;
    }
}

export function performStolenAttack(fighter, opponent) {
    fighter.attackSwingTimer = 15;
    fighter.gunAngle = Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x);
    
    const damage = fighter.stolenWeaponDamage || (fighter.damage * 2); // Use copied damage, with a fallback
    opponent.takeDamage(damage, fighter, { isMelee: true });
    
    // Heavy dash forward
    fighter.vx += Math.cos(fighter.gunAngle) * 12;
    fighter.vy += Math.sin(fighter.gunAngle) * 12;
    
    // IMPACT FRAMES
    triggerGlobalScreenShake(5, 8);
    spawnImpactFlash(opponent.x, opponent.y, 35, 'flash');
    spawnSparks(opponent.x, opponent.y, 10, 'blood');
    
    spawnFloatingText(opponent.x, opponent.y, 'SMACK!', '#ccc');
    playSound('Assets/Sound Effects/Attacks/swordclash.mp3', 0.5);
}
