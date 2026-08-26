import { STARTER_MAP } from './starterMap.js';
import { MONOLITH_MAP } from './monolithMap.js';
import { drawTacticalMap } from './tacticalMapRenderer.js';
import { state } from '../../js/core/state.js';
import { CONFIG } from '../../js/core/config.js';

export const TACTICAL_MAPS = {
  tactical_starter_map: STARTER_MAP,
  tactical_monolith_map: MONOLITH_MAP,
  starter: STARTER_MAP,
  monolith: MONOLITH_MAP
};

export function getActiveTacticalMap() {
  if (typeof state !== 'undefined' && state.activeMap) {
    return state.activeMap;
  }
  return STARTER_MAP;
}

export { STARTER_MAP, MONOLITH_MAP, drawTacticalMap };

/**
 * Checks and handles collision between a circle entity (fighter or projectile)
 * and all rectangular tactical cover obstacles in the map.
 * Uses iterative relaxation to cleanly resolve tight spaces and multi-obstacle pinches.
 * Returns true if a collision occurred.
 */
export function handleObstacleCollision(entity, obstacles, restitution = 0.95) {
  if (!obstacles || !Array.isArray(obstacles) || obstacles.length === 0 || !entity) return false;
  const er = entity.r || entity.radius || 25;
  let anyCollided = false;

  // Multi-pass iterative solver (2 iterations) to resolve corner pinches and tight pockets
  for (let iter = 0; iter < 2; iter++) {
    let iterCollided = false;

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      // Find closest point on obstacle rectangle to entity center
      const closestX = Math.max(obs.x, Math.min(entity.x, obs.x + obs.w));
      const closestY = Math.max(obs.y, Math.min(entity.y, obs.y + obs.h));

      const dx = entity.x - closestX;
      const dy = entity.y - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq === 0 || (entity.x >= obs.x && entity.x <= obs.x + obs.w && entity.y >= obs.y && entity.y <= obs.y + obs.h)) {
        // Entity center is strictly inside or overlapping the obstacle box
        const leftDist = entity.x - obs.x;
        const rightDist = (obs.x + obs.w) - entity.x;
        const topDist = entity.y - obs.y;
        const botDist = (obs.y + obs.h) - entity.y;

        const minDist = Math.min(leftDist, rightDist, topDist, botDist);
        let nx = 0, ny = 0;
        if (minDist === topDist) { ny = -1; }
        else if (minDist === botDist) { ny = 1; }
        else if (minDist === leftDist) { nx = -1; }
        else { nx = 1; }

        const penetration = er + minDist;
        entity.x += nx * penetration;
        entity.y += ny * penetration;

        if (typeof entity.vx === 'number' && typeof entity.vy === 'number') {
          const dot = entity.vx * nx + entity.vy * ny;
          if (dot < 0) {
            // Elastic specular reflection along surface normal
            entity.vx = entity.vx - (1 + restitution) * dot * nx;
            entity.vy = entity.vy - (1 + restitution) * dot * ny;

            // Subtle tangent drift if perfectly orthogonal to prevent infinite 1D bounce
            const tx = -ny, ty = nx;
            const tangential = entity.vx * tx + entity.vy * ty;
            const targetSpd = entity.speed || 5.0;
            if (Math.abs(tangential) < targetSpd * 0.15) {
              const nudge = (Math.random() < 0.5 ? 1 : -1) * targetSpd * 0.20;
              entity.vx += tx * nudge;
              entity.vy += ty * nudge;
            }
          }
        }
        iterCollided = true;
        anyCollided = true;
      } else if (distSq < er * er) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const penetration = er - dist;

        // Push entity smoothly out of obstacle
        entity.x += nx * penetration;
        entity.y += ny * penetration;

        // Natural momentum-conserving specular reflection
        if (typeof entity.vx === 'number' && typeof entity.vy === 'number') {
          const dot = entity.vx * nx + entity.vy * ny;
          if (dot < 0) {
            entity.vx = entity.vx - (1 + restitution) * dot * nx;
            entity.vy = entity.vy - (1 + restitution) * dot * ny;

            // Subtle angular variation to avoid infinite corner loops
            const tx = -ny, ty = nx;
            const tangential = entity.vx * tx + entity.vy * ty;
            const targetSpd = entity.speed || 5.0;
            if (Math.abs(tangential) < targetSpd * 0.15) {
              const nudge = (Math.random() < 0.5 ? 1 : -1) * targetSpd * 0.20;
              entity.vx += tx * nudge;
              entity.vy += ty * nudge;
            }
          }
        }

        iterCollided = true;
        anyCollided = true;
      }
    }

    if (!iterCollided) break;
  }

  if (anyCollided) {
    if (typeof entity.normalizeSpeed === 'function') {
      entity.normalizeSpeed();
    } else if (typeof entity.vx === 'number' && typeof entity.vy === 'number') {
      const spd = Math.hypot(entity.vx, entity.vy);
      const targetSpd = entity.speed || 5.0;
      if (spd > 0.05) {
        entity.vx = (entity.vx / spd) * targetSpd;
        entity.vy = (entity.vy / spd) * targetSpd;
      }
    }
  }

  return anyCollided;
}

/**
 * Fast 2D line segment vs Axis-Aligned Bounding Box (AABB) intersection check using slab method.
 * Returns true if segment from (x1, y1) to (x2, y2) intersects rectangle (rx, ry, rw, rh).
 */
export function checkLineIntersectsAABB(x1, y1, x2, y2, rx, ry, rw, rh) {
  const minX = rx;
  const maxX = rx + rw;
  const minY = ry;
  const maxY = ry + rh;

  // Bounding box early rejection
  if ((x1 < minX && x2 < minX) || (x1 > maxX && x2 > maxX) ||
      (y1 < minY && y2 < minY) || (y1 > maxY && y2 > maxY)) {
    return false;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;

  let tMin = 0;
  let tMax = 1;

  // X slab
  if (Math.abs(dx) < 1e-7) {
    if (x1 < minX || x1 > maxX) return false;
  } else {
    const invDx = 1 / dx;
    let t1 = (minX - x1) * invDx;
    let t2 = (maxX - x1) * invDx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }

  // Y slab
  if (Math.abs(dy) < 1e-7) {
    if (y1 < minY || y1 > maxY) return false;
  } else {
    const invDy = 1 / dy;
    let t1 = (minY - y1) * invDy;
    let t2 = (maxY - y1) * invDy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }

  return true;
}

/**
 * Checks whether there is a clear Line of Sight (LOS) between two points against all map obstacles.
 * Returns true if NO obstacles block the sightline.
 */
export function hasLineOfSight(x1, y1, x2, y2, obstacles = null) {
  const isTactical = typeof state !== 'undefined' && (state.gameCategory === 'tactical' || String(state.mode || '').toLowerCase().includes('tactical'));
  const obsList = obstacles || (typeof state !== 'undefined' && state.activeMap?.obstacles) || (isTactical && typeof STARTER_MAP !== 'undefined' ? STARTER_MAP.obstacles : null);
  if (!obsList || !Array.isArray(obsList) || obsList.length === 0) return true;

  for (let i = 0; i < obsList.length; i++) {
    const obs = obsList[i];
    if (checkLineIntersectsAABB(x1, y1, x2, y2, obs.x, obs.y, obs.w, obs.h)) {
      return false; // Sightline is blocked by wall
    }
  }
  return true; // Clear sightline
}

/**
 * Casts a ray from (startX, startY) at angle for maxDistance and finds the earliest intersection distance against obstacles.
 */
export function raycastToObstacles(startX, startY, angle, maxDistance = 1000, obstacles = null) {
  const isTactical = typeof state !== 'undefined' && (state.gameCategory === 'tactical' || String(state.mode || '').toLowerCase().includes('tactical'));
  const obsList = obstacles || (typeof state !== 'undefined' && state.activeMap?.obstacles) || (isTactical && typeof STARTER_MAP !== 'undefined' ? STARTER_MAP.obstacles : null);
  if (!obsList || !Array.isArray(obsList) || obsList.length === 0) return maxDistance;

  const targetX = startX + Math.cos(angle) * maxDistance;
  const targetY = startY + Math.sin(angle) * maxDistance;
  let closestDist = maxDistance;

  for (let i = 0; i < obsList.length; i++) {
    const obs = obsList[i];
    const minX = obs.x;
    const maxX = obs.x + obs.w;
    const minY = obs.y;
    const maxY = obs.y + obs.h;

    const dx = targetX - startX;
    const dy = targetY - startY;

    let tMin = 0;
    let tMax = 1;

    if (Math.abs(dx) < 1e-7) {
      if (startX < minX || startX > maxX) continue;
    } else {
      const invDx = 1 / dx;
      let t1 = (minX - startX) * invDx;
      let t2 = (maxX - startX) * invDx;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    if (Math.abs(dy) < 1e-7) {
      if (startY < minY || startY > maxY) continue;
    } else {
      const invDy = 1 / dy;
      let t1 = (minY - startY) * invDy;
      let t2 = (maxY - startY) * invDy;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    if (tMin >= 0 && tMin <= 1) {
      const hitDist = tMin * maxDistance;
      if (hitDist < closestDist) {
        closestDist = hitDist;
      }
    }
  }

  return closestDist;
}
