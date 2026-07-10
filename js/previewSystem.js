// ─────────────────────────────────────────────
// PREVIEW PROJECTILE SYSTEM - For Fighter Index Demos
// ─────────────────────────────────────────────
import { CONFIG, GUN_TIP_DIST } from './config.js';

/**
 * PreviewProjectileSystem handles projectiles in the fighter index demo.
 * This is a separate system to avoid interference with the main game.
 */
export class PreviewProjectileSystem {
  constructor() {
    this.projectiles = [];
    this.impacts = [];
  }

  fireProjectile(fighter, ownerIndex, damage, isFollowUp = false, speedOverride) {
    const dirX = Math.cos(fighter.gunAngle);
    const dirY = Math.sin(fighter.gunAngle);
    const tipDist = GUN_TIP_DIST(fighter.r);
    const speed = speedOverride ?? CONFIG.projectile.speed;

    this.projectiles.push({
      x: fighter.x + dirX * tipDist,
      y: fighter.y + dirY * tipDist,
      vx: dirX * speed,
      vy: dirY * speed,
      r: CONFIG.projectile.radius,
      life: CONFIG.projectile.life,
      color: fighter.color,
      owner: ownerIndex,
      damage,
      isFollowUp,
    });
  }

  fireGrenade(fighter, ownerIndex, damage, opponent) {
    const targetX = opponent.x;
    const targetY = opponent.y;
    const dist = Math.hypot(targetX - fighter.x, targetY - fighter.y);
    const dirX = (targetX - fighter.x) / (dist || 1);
    const dirY = (targetY - fighter.y) / (dist || 1);
    const tipDist = GUN_TIP_DIST(fighter.r);
    const startX = fighter.x + dirX * tipDist;
    const startY = fighter.y + dirY * tipDist;
    const projSpeed = CONFIG.projectile.speed * 1.6;
    const life = Math.max(8, Math.floor(dist / projSpeed));
    const vx = (targetX - startX) / life;
    const vy = (targetY - startY) / life;

    this.projectiles.push({
      x: startX,
      y: startY,
      z: 15,
      vx,
      vy,
      vz: (0.5 * life) / 2,
      g: 0.5,
      r: CONFIG.projectile.radius * 1.2,
      life,
      maxLife: life,
      color: fighter.color,
      owner: ownerIndex,
      damage,
      isGrenade: true,
      aoeRadius: 60,
      history: [],
    });
  }

  detonateGrenade(projectile, fighter, target) {
    const attacker = fighter;
    const radius = projectile.aoeRadius || 60;
    const dist = Math.hypot(target.x - projectile.x, target.y - projectile.y);

    if (dist <= radius + target.r) {
      const applied = target.takeDamage(projectile.damage, attacker);
      if (applied) {
        if (typeof attacker.onDamageDealt === 'function') {
          attacker.onDamageDealt(target, projectile, 0);
        }
        if (typeof target.applyPoison === 'function') {
          target.applyPoison(attacker);
        }
      }
    }

    this.addImpact(projectile.x, projectile.y, 'rgba(77, 255, 77, 0.9)', 0, 16);
  }

  addImpact(x, y, color, radius = 0, life = 14) {
    this.impacts.push({ x, y, radius, life, color });
  }

  update(demoArea, fighter, target) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];

      if (projectile.isExplosion) {
        projectile.life -= 1;
        if (projectile.life <= 0) {
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      if (projectile.isGrenade) {
        if (!projectile.history) projectile.history = [];
        projectile.history.push({ x: projectile.x, y: projectile.y, z: projectile.z });
        if (projectile.history.length > 12) projectile.history.shift();

        projectile.x += projectile.vx;
        projectile.y += projectile.vy;
        projectile.z += projectile.vz;
        projectile.vz -= projectile.g;
        projectile.life -= 1;

        if (projectile.z < 0) projectile.z = 0;

        if (projectile.life <= 0 || projectile.z <= 0) {
          this.detonateGrenade(projectile, fighter, target);
          this.projectiles.splice(i, 1);
          continue;
        }
      } else {
        projectile.x += projectile.vx;
        projectile.y += projectile.vy;
        projectile.life -= 1;

        const dist = Math.hypot(projectile.x - target.x, projectile.y - target.y);
        if (dist < target.r + projectile.r) {
          const applied = target.takeDamage(projectile.damage, fighter);
          if (applied) {
            if (typeof fighter.onDamageDealt === 'function') {
              fighter.onDamageDealt(target, projectile, 0);
            }
            this.addImpact(target.x, target.y, '#fff', 0, 14);
          }
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      const outOfBounds =
        projectile.x < demoArea.x ||
        projectile.x > demoArea.x + demoArea.width ||
        projectile.y < demoArea.y ||
        projectile.y > demoArea.y + demoArea.height;

      if (outOfBounds || projectile.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const effect = this.impacts[i];
      effect.radius += 1.8;
      effect.life -= 1;
      if (effect.life <= 0) {
        this.impacts.splice(i, 1);
      }
    }
  }

  clear() {
    this.projectiles.length = 0;
    this.impacts.length = 0;
  }

  getProjectiles() {
    return this.projectiles;
  }

  getImpacts() {
    return this.impacts;
  }
}
