import { ProjectileBehavior } from './ProjectileBehavior.js';

export class ProjectileBehaviorManager {
  static behaviors = {};

  /**
   * Register a behavior class for a specific projectile visual type
   * @param {string} behaviorType 
   * @param {ProjectileBehavior} behaviorClass 
   */
  static register(behaviorType, behaviorClass) {
    this.behaviors[behaviorType] = new behaviorClass();
  }

  /**
   * Apply behavior update logic
   * @param {Object} projectile 
   * @param {Array} fighters 
   * @param {Object} system The ProjectileSystem instance
   * @param {Object} ctx Any additional loop context (e.g., ownerHasEnemyInHole array)
   * @returns {boolean} true if destroyed/handled, false if not handled
   */
  static update(projectile, fighters, system, ctx = {}) {
    if (projectile.behaviorType && this.behaviors[projectile.behaviorType]) {
      return this.behaviors[projectile.behaviorType].update(projectile, fighters, system, ctx);
    }
    return false; // Not handled
  }

  /**
   * Apply behavior onHit logic
   */
  static onHit(projectile, target, attacker, fighters, system) {
    if (projectile.behaviorType && this.behaviors[projectile.behaviorType]) {
      return this.behaviors[projectile.behaviorType].onHit(projectile, target, attacker, fighters, system);
    }
    return true; // Default destroy
  }

  /**
   * Apply behavior checkExpire logic
   */
  static checkExpire(projectile, system) {
    if (projectile.behaviorType && this.behaviors[projectile.behaviorType]) {
      return this.behaviors[projectile.behaviorType].checkExpire(projectile, system);
    }
    return null; // Not handled
  }
}
