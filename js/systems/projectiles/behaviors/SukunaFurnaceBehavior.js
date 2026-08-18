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
    // Basic trail history
    projectile.history.unshift({ x: projectile.x, y: projectile.y });
    if (projectile.history.length > projectile.historyMax) {
      projectile.history.pop();
    }

    // If no living enemies exist on the battlefield, detonate immediately at current or enemy position
    const ownerIdx = projectile.owner;
    const allFighters = fighters || (typeof state !== 'undefined' ? state.fighters : []) || [];
    const allIllusions = (typeof state !== 'undefined' ? state.illusions : []) || [];
    const myTeam = (typeof state !== 'undefined' && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(ownerIdx) : null;

    const hasLivingEnemy = allFighters.some((f, idx) => {
      if (!f || f.hp <= 0 || f.isDead || idx === ownerIdx) return false;
      const fTeam = (typeof state !== 'undefined' && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(idx) : null;
      return myTeam === null || fTeam === null || myTeam !== fTeam;
    }) || allIllusions.some(ill => {
      if (!ill || ill.hp <= 0 || ill.isDead) return false;
      if (ill.owner) {
        const oIdx = allFighters.indexOf(ill.owner);
        const oTeam = (typeof state !== 'undefined' && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(oIdx) : null;
        return myTeam === null || oTeam === null || myTeam !== oTeam;
      }
      return true;
    });

    if (!hasLivingEnemy) {
      let detonateX = projectile.x;
      let detonateY = projectile.y;
      let closestDeadDist = Infinity;

      for (const f of allFighters) {
        if (!f || f === allFighters[ownerIdx]) continue;
        const d = Math.hypot(f.x - projectile.x, f.y - projectile.y);
        if (d < closestDeadDist) {
          closestDeadDist = d;
          detonateX = f.x;
          detonateY = f.y;
        }
      }

      const explosionX = (closestDeadDist < 120) ? detonateX : projectile.x;
      const explosionY = (closestDeadDist < 120) ? detonateY : projectile.y;
      system.triggerThermobaricExplosion(explosionX, explosionY, projectile.owner, projectile.damage);
      return true; // Destroy projectile immediately!
    }

    return false;
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
