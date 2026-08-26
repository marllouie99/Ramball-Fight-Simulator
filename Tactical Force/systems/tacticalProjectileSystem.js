// ─────────────────────────────────────────────
// TACTICAL FORCE — DEDICATED PROJECTILE SYSTEM
// Self-contained ballistics, pooling, 2-bounce specular ricochets, and damage resolution
// ─────────────────────────────────────────────

import { CONFIG } from '../../js/core/config.js';
import { state, triggerGlobalScreenShake, registerTacticalProjectileSystem } from '../../js/core/state.js';
import { applyDamageToTarget } from '../../js/entities/fighter.js';
import { spawnSparks, spawnImpactFlash } from '../../js/graphics/particles/sparkEffect.js';
import { drawTacticalBullet } from '../weapons/tacticalWeaponGraphics.js';
import { STARTER_MAP } from '../maps/index.js';
import { tacticalMainConfig } from '../configs/tacticalMainConfig.js';

export class TacticalProjectileSystem {
  constructor() {
    this.projectiles = [];
    this.poolSize = 200;
    this.pool = Array.from({ length: this.poolSize }, (_, i) => ({ id: `tac_proj_${i}` }));
    this.poolIndex = 0;
  }

  _getProjectile() {
    if (this.poolIndex < this.pool.length) {
      const p = this.pool[this.poolIndex++];
      this._initProjectile(p);
      return p;
    }
    const p = { id: `tac_proj_${this.pool.length}` };
    this.pool.push(p);
    this.poolIndex++;
    this._initProjectile(p);
    return p;
  }

  _initProjectile(p) {
    p.x = 0;
    p.y = 0;
    p.vx = 0;
    p.vy = 0;
    p.r = 5;
    p.damage = 10;
    p.owner = 0;
    p.ownerFighter = null;
    p.visual = 'tacticalBullet';
    p.wallBounces = 0;
    p.life = 99999;
    p.maxLife = 99999;
    p.fadingOut = false;
    p.fadingAlpha = 1.0;
    p._bounceCooldown = 0;
    p.bulletLength = 16;
    p.bulletWidth = 3.2;
    p.bulletRadius = 4.5;
    p.tacticalCaliberScale = 1.0;
    p.historyMax = 14;
    if (p.history) p.history.length = 0;
    else p.history = [];
  }

  _returnProjectile(p) {
    if (this.poolIndex > 0) {
      this.poolIndex--;
      this.pool[this.poolIndex] = p;
    }
  }

  /**
   * Swept raycast continuous collision test from (startX, startY) along (vx, vy)
   * against all rectangular obstacles expanded by projectile radius pr.
   * Returns exact hit parameter t [0, 1], entry surface normal (nx, ny), and hit obstacle.
   */
  _sweptObstacleCollision(startX, startY, vx, vy, obstacles, pr) {
    let closestT = 1.0;
    let hitNormalX = 0;
    let hitNormalY = 0;
    let hitObs = null;
    let hit = false;

    if (!obstacles || !Array.isArray(obstacles) || obstacles.length === 0) {
      return { hit: false };
    }

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      const minX = obs.x - pr;
      const maxX = obs.x + obs.w + pr;
      const minY = obs.y - pr;
      const maxY = obs.y + obs.h + pr;

      // If bullet is already inside/overlapping this obstacle boundary (e.g. edge case)
      if (startX >= minX && startX <= maxX && startY >= minY && startY <= maxY) {
        const leftD  = Math.abs(startX - minX);
        const rightD = Math.abs(maxX - startX);
        const topD   = Math.abs(startY - minY);
        const botD   = Math.abs(maxY - startY);
        const minD   = Math.min(leftD, rightD, topD, botD);

        let nx = 0, ny = 0;
        if (minD === leftD) nx = -1;
        else if (minD === rightD) nx = 1;
        else if (minD === topD) ny = -1;
        else ny = 1;

        return { hit: true, t: 0, nx, ny, obs };
      }

      let tMin = 0;
      let tMax = 1;
      let entryNx = 0;
      let entryNy = 0;

      // X-slab intersection
      if (Math.abs(vx) < 1e-7) {
        if (startX < minX || startX > maxX) continue;
      } else {
        let t1 = (minX - startX) / vx;
        let t2 = (maxX - startX) / vx;
        let n1 = -1, n2 = 1;
        if (t1 > t2) {
          const tmp = t1; t1 = t2; t2 = tmp;
          n1 = 1; n2 = -1;
        }
        if (t1 > tMin) {
          tMin = t1;
          entryNx = n1;
          entryNy = 0;
        }
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) continue;
      }

      // Y-slab intersection
      if (Math.abs(vy) < 1e-7) {
        if (startY < minY || startY > maxY) continue;
      } else {
        let t1 = (minY - startY) / vy;
        let t2 = (maxY - startY) / vy;
        let n1 = -1, n2 = 1;
        if (t1 > t2) {
          const tmp = t1; t1 = t2; t2 = tmp;
          n1 = 1; n2 = -1;
        }
        if (t1 > tMin) {
          tMin = t1;
          entryNx = 0;
          entryNy = n1;
        }
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) continue;
      }

      if (tMin >= 0 && tMin <= 1 && tMin < closestT) {
        closestT = tMin;
        hitNormalX = entryNx;
        hitNormalY = entryNy;
        hitObs = obs;
        hit = true;
      }
    }

    return { hit, t: closestT, nx: hitNormalX, ny: hitNormalY, obs: hitObs };
  }

  /**
   * Swept raycast continuous collision test against outer arena boundary walls.
   */
  _sweptArenaCollision(startX, startY, vx, vy, arena, pr) {
    let closestT = 1.0;
    let hitNormalX = 0;
    let hitNormalY = 0;
    let hit = false;

    if (!arena) return { hit: false };

    const minX = arena.x + pr;
    const maxX = arena.x + arena.width - pr;
    const minY = arena.y + pr;
    const maxY = arena.y + arena.height - pr;

    // Check if start point is already at or outside arena borders
    if (startX <= minX && vx < 0) {
      return { hit: true, t: 0, nx: 1, ny: 0 };
    }
    if (startX >= maxX && vx > 0) {
      return { hit: true, t: 0, nx: -1, ny: 0 };
    }
    if (startY <= minY && vy < 0) {
      return { hit: true, t: 0, nx: 0, ny: 1 };
    }
    if (startY >= maxY && vy > 0) {
      return { hit: true, t: 0, nx: 0, ny: -1 };
    }

    // Left wall
    if (vx < 0) {
      const t = (minX - startX) / vx;
      if (t >= 0 && t <= 1 && t < closestT) {
        closestT = t;
        hitNormalX = 1;
        hitNormalY = 0;
        hit = true;
      }
    } else if (vx > 0) { // Right wall
      const t = (maxX - startX) / vx;
      if (t >= 0 && t <= 1 && t < closestT) {
        closestT = t;
        hitNormalX = -1;
        hitNormalY = 0;
        hit = true;
      }
    }

    // Top wall
    if (vy < 0) {
      const t = (minY - startY) / vy;
      if (t >= 0 && t <= 1 && t < closestT) {
        closestT = t;
        hitNormalX = 0;
        hitNormalY = 1;
        hit = true;
      }
    } else if (vy > 0) { // Bottom wall
      const t = (maxY - startY) / vy;
      if (t >= 0 && t <= 1 && t < closestT) {
        closestT = t;
        hitNormalX = 0;
        hitNormalY = -1;
        hit = true;
      }
    }

    return { hit, t: closestT, nx: hitNormalX, ny: hitNormalY };
  }

  /**
   * Spawns a high-velocity tactical bullet with muzzle spawn clamping to prevent wall or arena penetration.
   */
  fireTacticalBullet(ownerFighter, ownerIndex, damage, bulletSpeed, spawnX, spawnY, fireAngle, options = {}) {
    const p = this._getProjectile();
    p.owner = ownerIndex !== undefined ? ownerIndex : 0;
    p.ownerFighter = ownerFighter || null;
    p.damage = damage !== undefined ? damage : (ownerFighter?.damage || 15);
    p.color = options.color || ownerFighter?.color || '#3b82f6';
    p.r = options.r || 5.0;
    p.bulletLength = options.bulletLength || 16;
    p.bulletWidth = options.bulletWidth || 3.2;
    p.bulletRadius = options.bulletRadius || 4.5;
    p.tacticalCaliberScale = options.tacticalCaliberScale || 1.0;
    p.historyMax = options.historyMax || 14;
    p.wallBounces = 0;
    p.life = 99999;
    p.fadingOut = false;
    p.fadingAlpha = 1.0;
    p._bounceCooldown = 0;

    // 1. Clamp muzzle spawn point against arena boundaries
    const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
    if (arena) {
      if (ownerFighter) {
        const fromX = ownerFighter.x;
        const fromY = ownerFighter.y;
        const muzzleDx = spawnX - fromX;
        const muzzleDy = spawnY - fromY;
        const sweptArena = this._sweptArenaCollision(fromX, fromY, muzzleDx, muzzleDy, arena, p.r);
        if (sweptArena.hit) {
          const safeT = Math.max(0, sweptArena.t - 0.05);
          spawnX = fromX + muzzleDx * safeT;
          spawnY = fromY + muzzleDy * safeT;
        }
      }
      const minX = arena.x + p.r + 2;
      const maxX = arena.x + arena.width - p.r - 2;
      const minY = arena.y + p.r + 2;
      const maxY = arena.y + arena.height - p.r - 2;
      spawnX = Math.max(minX, Math.min(maxX, spawnX));
      spawnY = Math.max(minY, Math.min(maxY, spawnY));
    }

    // 2. Clamp muzzle spawn point if owner fighter is up against a cover obstacle
    const obstacles = (typeof state !== 'undefined' && state.activeMap?.obstacles) || (typeof STARTER_MAP !== 'undefined' ? STARTER_MAP.obstacles : null);
    if (ownerFighter && obstacles && obstacles.length > 0) {
      const fromX = ownerFighter.x;
      const fromY = ownerFighter.y;
      const muzzleDx = spawnX - fromX;
      const muzzleDy = spawnY - fromY;
      const sweptSpawn = this._sweptObstacleCollision(fromX, fromY, muzzleDx, muzzleDy, obstacles, p.r);
      if (sweptSpawn.hit) {
        const safeT = Math.max(0, sweptSpawn.t - 0.05);
        spawnX = fromX + muzzleDx * safeT;
        spawnY = fromY + muzzleDy * safeT;
      }
    }

    p.x = spawnX;
    p.y = spawnY;
    p.vx = Math.cos(fireAngle) * bulletSpeed;
    p.vy = Math.sin(fireAngle) * bulletSpeed;

    if (p.history) {
      p.history.length = 0;
      p.history.push({ x: spawnX, y: spawnY });
    }

    this.projectiles.push(p);
    return p;
  }

  /**
   * Evaluates obstacle and arena wall collisions using continuous swept raycasting
   * to guarantee projectiles NEVER tunnel, jump, or clip through map walls.
   */
  _checkWallAndObstacleCollisions(p, arena, obstacles) {
    const maxBounces = tacticalMainConfig.bulletMaxWallBounces ?? 2;
    const pr = p.r || 5;
    const restitution = tacticalMainConfig.restitution || 0.95;

    // Check obstacle collision along swept movement vector
    const obsHit = this._sweptObstacleCollision(p.x, p.y, p.vx, p.vy, obstacles, pr);
    // Check arena boundary collision along swept movement vector
    const arenaHit = this._sweptArenaCollision(p.x, p.y, p.vx, p.vy, arena, pr);

    let hitResult = null;
    if (obsHit.hit && arenaHit.hit) {
      hitResult = obsHit.t <= arenaHit.t ? obsHit : arenaHit;
    } else if (obsHit.hit) {
      hitResult = obsHit;
    } else if (arenaHit.hit) {
      hitResult = arenaHit;
    }

    if (hitResult && hitResult.hit) {
      // Snap position precisely to the impact face
      const tHit = Math.max(0, Math.min(1, hitResult.t));
      p.x = p.x + p.vx * tHit + hitResult.nx * 2;
      p.y = p.y + p.vy * tHit + hitResult.ny * 2;

      if (p.wallBounces < maxBounces) {
        // Reflect velocity according to exact contact normal
        if (hitResult.nx !== 0) {
          p.vx = Math.sign(hitResult.nx) * Math.abs(p.vx) * restitution;
        }
        if (hitResult.ny !== 0) {
          p.vy = Math.sign(hitResult.ny) * Math.abs(p.vy) * restitution;
        }

        // Apply subtle organic bounce variance
        const variance = (Math.random() - 0.5) * (tacticalMainConfig.angleDeflectionVariance || 0.08);
        const currentSpeed = Math.hypot(p.vx, p.vy);
        const currentAngle = Math.atan2(p.vy, p.vx) + variance;
        p.vx = Math.cos(currentAngle) * currentSpeed;
        p.vy = Math.sin(currentAngle) * currentSpeed;

        // Advance remaining frame step fraction along reflected vector
        const remainingT = 1.0 - tHit;
        p.x += p.vx * remainingT;
        p.y += p.vy * remainingT;

        p.wallBounces++;
        p.life = 99999;

        if (p.history && p.history.length > 0) {
          p.history.push({ x: p.x, y: p.y });
        }

        if (typeof spawnSparks === 'function') {
          spawnSparks(p.x, p.y, 7, 'gold', '#F59E0B');
        }
        if (typeof spawnImpactFlash === 'function') {
          spawnImpactFlash(p.x, p.y, 14, '#F59E0B');
        }
        return false; // Bounced, not expired
      }

      // Terminal Destruction on max bounces reached
      if (typeof spawnSparks === 'function') {
        spawnSparks(p.x, p.y, 8, 'gold', '#F59E0B');
      }
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(p.x, p.y, 18, '#F59E0B');
      }
      return true; // Expired
    }

    // Advance position if no collision occurred
    p.x += p.vx;
    p.y += p.vy;

    // Out of bounds safety fallback
    const margin = 350;
    if (arena && (p.x < arena.x - margin || p.x > arena.x + arena.width + margin ||
                  p.y < arena.y - margin || p.y > arena.y + arena.height + margin)) {
      return true;
    }

    return false;
  }

  /**
   * Main tactical projectile update loop: advances movement, records trails,
   * evaluates 2-bounce physics, and applies damage upon hitting opponents.
   */
  update(fighters = []) {
    const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
    const obstacles = (typeof state !== 'undefined' && state.activeMap?.obstacles) || STARTER_MAP.obstacles;

    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];

      // Handle fading out trails
      if (p.fadingOut) {
        if (p.history && p.history.length > 0) {
          p.history.shift();
        }
        if (p.fadingAlpha === undefined) p.fadingAlpha = 1.0;
        p.fadingAlpha -= 0.08;
        if (p.fadingAlpha <= 0 || !p.history || p.history.length <= 1) {
          this._returnProjectile(p);
          this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
          this.projectiles.pop();
          i--;
        }
        continue;
      }

      // Record high-speed motion streak history
      if (!p.history) p.history = [];
      p.history.push({ x: p.x, y: p.y });
      const maxHist = p.historyMax || 14;
      while (p.history.length > maxHist) {
        p.history.shift();
      }

      // 1. Check fighter impact
      let hitFighter = null;
      for (let fi = 0; fi < fighters.length; fi++) {
        const f = fighters[fi];
        if (!f || f.hp <= 0 || f.isDead) continue;
        if (f === p.ownerFighter || fi === p.owner) continue;

        const distSq = (p.x - f.x) ** 2 + (p.y - f.y) ** 2;
        const hitRadius = (f.r || 25) + (p.r || 5);
        if (distSq <= hitRadius * hitRadius) {
          hitFighter = f;
          break;
        }
      }

      if (hitFighter) {
        const attackerFighter = p.ownerFighter || (typeof state !== 'undefined' && state.fighters ? state.fighters[p.owner] : null);
        // Apply direct damage
        applyDamageToTarget(hitFighter, p.damage, attackerFighter, { isTacticalBullet: true, projectile: p });

        // Blood / Impact Sparks
        if (typeof spawnSparks === 'function') {
          spawnSparks(p.x, p.y, 10, 'blood', p.color || '#ef4444');
          spawnSparks(p.x, p.y, 6, 'gold', '#F59E0B');
        }
        if (typeof spawnImpactFlash === 'function') {
          spawnImpactFlash(p.x, p.y, 22, p.color || '#ef4444');
        }
        if (typeof triggerGlobalScreenShake === 'function') {
          triggerGlobalScreenShake(2.5, 4);
        }

        // Dissolve into fade-out trail
        p.fadingOut = true;
        p._resumeVx = p.vx;
        p._resumeVy = p.vy;
        p.vx = 0;
        p.vy = 0;
        continue;
      }

      // 2. Check wall & obstacle bounce / expiration via continuous swept collision
      const expired = this._checkWallAndObstacleCollisions(p, arena, obstacles);
      if (expired) {
        p.fadingOut = true;
        p._resumeVx = p.vx;
        p._resumeVy = p.vy;
        p.vx = 0;
        p.vy = 0;
      }
    }
  }

  /**
   * Renders all active tactical bullets onto the canvas context.
   */
  draw(ctx) {
    if (!this.projectiles || this.projectiles.length === 0) return;
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      drawTacticalBullet(ctx, p);
    }
  }

  /**
   * Cleanly returns all active projectiles to the pool on match restart.
   */
  reset() {
    for (let i = 0; i < this.projectiles.length; i++) {
      this._returnProjectile(this.projectiles[i]);
    }
    this.projectiles.length = 0;
  }

  clear() {
    this.reset();
  }

  /**
   * Returns true if a specific fighter has an active projectile in flight or bouncing.
   */
  hasActiveBouncingProjectile(fighter) {
    if (!tacticalMainConfig.holdFireDuringBounce) return false;
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      if (!p || p.fadingOut || p.life <= 0) continue;
      if (p.ownerFighter === fighter) {
        return true;
      }
    }
    return false;
  }
}

// Global Singleton Instance
export const tacticalProjectileSystem = new TacticalProjectileSystem();

// Register with core state for automatic match/round clear
if (typeof registerTacticalProjectileSystem === 'function') {
  registerTacticalProjectileSystem(tacticalProjectileSystem);
}
