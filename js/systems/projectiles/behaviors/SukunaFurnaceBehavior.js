import { ProjectileBehavior } from '../ProjectileBehavior.js';
import { CONFIG } from '../../../core/config.js';
import { audioSystem } from '../../../systems/audioSystem.js';

export class SukunaFurnaceBehavior extends ProjectileBehavior {
  /**
   * Spawns a Sukuna Furnace arrow projectile.
   */
  static spawn(system, x, y, vx, vy, damage, ownerIndex) {
    audioSystem.playSFX('attack_fireball', 0.8);
    
    const proj = system._getPooledProjectile();
    proj.x = x;
    proj.y = y;
    proj.vx = vx;
    proj.vy = vy;
    proj.r = 18;
    proj.life = 180;
    proj.maxLife = 180;
    proj.color = '#FF4500';
    proj.owner = ownerIndex;
    proj.damage = Number.isFinite(Number(damage)) ? Number(damage) : 35;
    
    // Core visual/behavior properties
    proj.behaviorType = 'sukuna_furnace';
    proj.visual = 'sukunaFurnaceArrow';
    proj.isSukunaFurnace = true; // Kept for backwards compatibility in external logic
    
    proj.history = [];
    proj.history.push({ x: proj.x, y: proj.y });
    proj.historyMax = 12;
    
    // Initialize wind-blown flame particle system for Fuga arrow
    proj.flameParticles = [];
    proj.emberParticles = [];
    proj._fugaFlameTimer = 0;
    
    system.projectiles.push(proj);
  }

  update(projectile, fighters, system) {
    // Basic trail history (common pattern, could be abstracted later)
    projectile.history.unshift({ x: projectile.x, y: projectile.y });
    if (projectile.history.length > projectile.historyMax) {
      projectile.history.pop();
    }
    return false; // Let the standard movement/expire logic handle the rest
  }

  onHit(projectile, target, attacker, fighters, system) {
    // Triggers thermobaric explosion immediately on hit
    system.triggerThermobaricExplosion(projectile.x, projectile.y, projectile.owner, projectile.damage);
    return true; // Destroy the projectile
  }

  checkExpire(projectile, system) {
    const arena = CONFIG.arena;
    // Sukuna Furnace Arrow: triggers thermobaric explosion on wall hit or max range expiration
    if (
      projectile.life <= 0 ||
      projectile.x - projectile.r < arena.x ||
      projectile.x + projectile.r > arena.x + arena.width ||
      projectile.y - projectile.r < arena.y ||
      projectile.y + projectile.r > arena.y + arena.height
    ) {
      if (!projectile.isFrozenByInfinity) {
        system.triggerThermobaricExplosion(projectile.x, projectile.y, projectile.owner, projectile.damage);
      }
      return true; // Expire and destroy
    }
    return false;
  }
}
