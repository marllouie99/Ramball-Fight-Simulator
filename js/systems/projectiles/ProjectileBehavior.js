export class ProjectileBehavior {
  /**
   * Initialize a projectile with specific behavior parameters.
   * @param {Object} projectile The generic projectile object from the pool
   * @param {Object} params Parameters to set up the projectile
   */
  init(projectile, params) {
    // To be overridden by subclasses
  }

  /**
   * Update the projectile's position, lifetime, and logic.
   * @param {Object} projectile The projectile object
   * @param {Array} fighters The array of fighters
   * @returns {boolean} true if the projectile should be destroyed/returned to pool
   */
  update(projectile, fighters) {
    // Basic movement by default
    projectile.x += projectile.vx;
    projectile.y += projectile.vy;
    projectile.life--;
    
    if (projectile.history) {
      projectile.history.push({ x: projectile.x, y: projectile.y });
      if (projectile.history.length > (projectile.maxHistory || 10)) {
        projectile.history.shift();
      }
    }
    
    return projectile.life <= 0;
  }

  /**
   * Handle what happens when the projectile hits a target.
   * @param {Object} projectile The projectile object
   * @param {Object} target The fighter/illusion hit
   * @param {Object} attacker The owner fighter
   * @param {Array} fighters The array of all fighters
   * @returns {boolean} true if the projectile is destroyed on hit, false if it pierces
   */
  onHit(projectile, target, attacker, fighters) {
    // Default behavior: destroy on hit
    return true;
  }

  /**
   * Called to check if projectile should expire (e.g. wall collision).
   * Return true to force expire, false to force prevent expire, or null to fallback to default logic.
   */
  checkExpire(projectile, system) {
    return null;
  }
}
