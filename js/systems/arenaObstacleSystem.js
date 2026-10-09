import { state } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { GAME_MODES } from '../core/modeConfig.js';
import { isFfaMode } from '../core/viewportManager.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ARENA OBSTACLE SYSTEM
 * Manages interior arena obstacles, including the FFA Center Plus (+) Wall.
 * Handles rendering, mathematical boundary collision detection, velocity
 * reflection, and projectile impacts with 100% mathematical precision.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const DEFAULT_FFA_PLUS_OBSTACLE = {
  type: 'plus',
  size: 280,       // Total length/span of horizontal & vertical arms
  thickness: 90,   // Thickness of arms
};

/**
 * Retrieves the active center obstacle definition for the given arena, if any.
 */
export function getArenaCenterObstacle(arena) {
  const ar = arena || (typeof state !== 'undefined' ? state.arena : null) || CONFIG.arena;
  if (!ar) return null;

  if (ar.centerObstacle) {
    const obs = ar.centerObstacle;
    const cx = ar.x + ar.width / 2;
    const cy = ar.y + ar.height / 2;
    const size = obs.size || DEFAULT_FFA_PLUS_OBSTACLE.size;
    const thickness = obs.thickness || DEFAULT_FFA_PLUS_OBSTACLE.thickness;
    return {
      type: obs.type || 'plus',
      cx,
      cy,
      size,
      thickness,
      halfSize: size / 2,
      halfThick: thickness / 2,
    };
  }

  // Auto-enable plus obstacle in FFA modes with large arenas (>= 600px)
  const isFfa = isFfaMode((typeof state !== 'undefined' && state.mode) ? state.mode : '');
  if (isFfa && ar.width >= 600) {
    const cx = ar.x + ar.width / 2;
    const cy = ar.y + ar.height / 2;
    const size = DEFAULT_FFA_PLUS_OBSTACLE.size;
    const thickness = DEFAULT_FFA_PLUS_OBSTACLE.thickness;
    return {
      type: 'plus',
      cx,
      cy,
      size,
      thickness,
      halfSize: size / 2,
      halfThick: thickness / 2,
    };
  }

  return null;
}

/**
 * Generates the 12 polygon vertices for a plus (+) obstacle in world coordinates.
 */
export function getPlusObstacleVertices(cx, cy, size, thickness) {
  const S = size / 2;
  const T = thickness / 2;
  return [
    { x: cx - T, y: cy - S }, // 0: Top arm top-left
    { x: cx + T, y: cy - S }, // 1: Top arm top-right
    { x: cx + T, y: cy - T }, // 2: Top-right inner corner
    { x: cx + S, y: cy - T }, // 3: Right arm top-right
    { x: cx + S, y: cy + T }, // 4: Right arm bottom-right
    { x: cx + T, y: cy + T }, // 5: Bottom-right inner corner
    { x: cx + T, y: cy + S }, // 6: Bottom arm bottom-right
    { x: cx - T, y: cy + S }, // 7: Bottom arm bottom-left
    { x: cx - T, y: cy + T }, // 8: Bottom-left inner corner
    { x: cx - S, y: cy + T }, // 9: Left arm bottom-left
    { x: cx - S, y: cy - T }, // 10: Left arm top-left
    { x: cx - T, y: cy - T }, // 11: Top-left inner corner
  ];
}

/**
 * Returns balanced quadrant spawn coordinates nested inside the 4 pockets of the + wall.
 */
export function getFfaPlusQuadrantSpawns(arena) {
  const ar = arena || (typeof state !== 'undefined' ? state.arena : null) || CONFIG.arena || { x: 80, y: -130, width: 800, height: 800 };
  const cx = ar.x + ar.width / 2;
  const cy = ar.y + ar.height / 2;
  const offset = 115; // Offset from center into each corner pocket

  return [
    { x: cx - offset, y: cy - offset }, // Top-Left pocket
    { x: cx + offset, y: cy - offset }, // Top-Right pocket
    { x: cx - offset, y: cy + offset }, // Bottom-Left pocket
    { x: cx + offset, y: cy + offset }, // Bottom-Right pocket
  ];
}

/**
 * Checks if a 2D point (x, y) is inside the plus obstacle.
 */
export function isPointInsidePlusObstacle(px, py, cx, cy, halfSize, halfThick) {
  const dx = Math.abs(px - cx);
  const dy = Math.abs(py - cy);
  return (dx <= halfThick && dy <= halfSize) || (dx <= halfSize && dy <= halfThick);
}

/**
 * Resolves collision between an entity circle (fighter / minion / boss) and the arena center plus obstacle.
 * Returns true if a collision occurred and position/velocity was adjusted.
 */
export function resolveEntityPlusObstacleCollision(entity, arena) {
  if (!entity || !Number.isFinite(entity.x) || !Number.isFinite(entity.y)) return false;
  const obs = getArenaCenterObstacle(arena);
  if (!obs || obs.type !== 'plus') return false;

  const r = Number.isFinite(entity.r) ? entity.r : 25;
  const cx = obs.cx;
  const cy = obs.cy;
  const S = obs.halfSize;
  const T = obs.halfThick;

  const dx = entity.x - cx;
  const dy = entity.y - cy;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const signX = (dx >= 0) ? 1 : -1;
  const signY = (dy >= 0) ? 1 : -1;

  // Broadphase bounding box test
  if (absX > S + r + 4 || absY > S + r + 4) {
    return false;
  }

  let bounced = false;
  let normalX = 0;
  let normalY = 0;

  // Case 1: In the 4 outer corner pocket regions (absX > T and absY > T)
  if (absX > T && absY > T) {
    if (absX >= S && absY >= S) {
      // Outside outer arm tips
      return false;
    } else if (absX >= S && absY <= S) {
      // Approaching horizontal arm outer tip from side
      if (absX < S + r) {
        entity.x = cx + signX * (S + r);
        normalX = signX;
        normalY = 0;
        bounced = true;
      }
    } else if (absY >= S && absX <= S) {
      // Approaching vertical arm outer tip from side
      if (absY < S + r) {
        entity.y = cy + signY * (S + r);
        normalX = 0;
        normalY = signY;
        bounced = true;
      }
    } else {
      // Inside the pocket [T < absX < S, T < absY < S]
      const penX = absX - T;
      const penY = absY - T;

      if (penX < r && penY < r) {
        // Near inner corner (T, T)
        const distSq = penX * penX + penY * penY;
        if (distSq < r * r) {
          const dist = Math.sqrt(distSq) || 1;
          normalX = (penX / dist) * signX;
          normalY = (penY / dist) * signY;
          entity.x = cx + signX * (T + (penX / dist) * r);
          entity.y = cy + signY * (T + (penY / dist) * r);
          bounced = true;
        }
      } else if (penX < r) {
        // Hitting the vertical arm wall (x = T)
        entity.x = cx + signX * (T + r);
        normalX = signX;
        normalY = 0;
        bounced = true;
      } else if (penY < r) {
        // Hitting the horizontal arm wall (y = T)
        entity.y = cy + signY * (T + r);
        normalX = 0;
        normalY = signY;
        bounced = true;
      }
    }
  } else if (absX <= T && absY > T) {
    // Top or Bottom vertical arm segment
    if (absY >= S) {
      // Outer vertical cap
      if (absY < S + r) {
        entity.y = cy + signY * (S + r);
        normalX = 0;
        normalY = signY;
        bounced = true;
      }
    } else {
      // Inside vertical arm extension (push out horizontally)
      entity.x = cx + signX * (T + r);
      normalX = signX;
      normalY = 0;
      bounced = true;
    }
  } else if (absY <= T && absX > T) {
    // Left or Right horizontal arm segment
    if (absX >= S) {
      // Outer horizontal cap
      if (absX < S + r) {
        entity.x = cx + signX * (S + r);
        normalX = signX;
        normalY = 0;
        bounced = true;
      }
    } else {
      // Inside horizontal arm extension (push out vertically)
      entity.y = cy + signY * (T + r);
      normalX = 0;
      normalY = signY;
      bounced = true;
    }
  } else {
    // Deep inside central intersection (absX <= T and absY <= T)
    const penX = T - absX;
    const penY = T - absY;
    if (penX <= penY) {
      entity.x = cx + signX * (T + r);
      normalX = signX;
      normalY = 0;
    } else {
      entity.y = cy + signY * (T + r);
      normalX = 0;
      normalY = signY;
    }
    bounced = true;
  }

  if (bounced) {
    const restitution = CONFIG.collision?.restitution ?? 0.92;
    if (Number.isFinite(entity.vx) && Number.isFinite(entity.vy)) {
      const dot = entity.vx * normalX + entity.vy * normalY;
      if (dot < 0) {
        entity.vx = (entity.vx - 2 * dot * normalX) * restitution;
        entity.vy = (entity.vy - 2 * dot * normalY) * restitution;
        entity.vx += (Math.random() - 0.5) * 0.3;
        entity.vy += (Math.random() - 0.5) * 0.3;
      }
    }

    if (Number.isFinite(entity.knockbackVx) && Number.isFinite(entity.knockbackVy)) {
      const kbDot = entity.knockbackVx * normalX + entity.knockbackVy * normalY;
      if (kbDot < 0) {
        entity.knockbackVx = (entity.knockbackVx - 2 * kbDot * normalX) * 0.85;
        entity.knockbackVy = (entity.knockbackVy - 2 * kbDot * normalY) * 0.85;
      }
    }
  }

  return bounced;
}

/**
 * Checks if a line segment / ray from (x1, y1) to (x2, y2) intersects the plus (+) obstacle.
 * Returns intersection details or null if no intersection.
 */
export function checkRayIntersectsPlusObstacle(x1, y1, x2, y2, arena, padding = 0) {
  const obs = getArenaCenterObstacle(arena);
  if (!obs || obs.type !== 'plus') return null;

  const cx = obs.cx;
  const cy = obs.cy;
  const S = obs.halfSize + padding;
  const T = obs.halfThick + padding;

  // 1. Check if start point is already inside
  if (isPointInsidePlusObstacle(x1, y1, cx, cy, S, T)) {
    let normalX = 0;
    let normalY = 0;
    const dx = x1 - cx;
    const dy = y1 - cy;
    if (Math.abs(dx) > Math.abs(dy)) {
      normalX = dx >= 0 ? 1 : -1;
    } else {
      normalY = dy >= 0 ? 1 : -1;
    }
    return { hit: true, t: 0, hitX: x1, hitY: y1, normalX, normalY };
  }

  // 2. Broadphase bounding box check
  const minRayX = Math.min(x1, x2);
  const maxRayX = Math.max(x1, x2);
  const minRayY = Math.min(y1, y2);
  const maxRayY = Math.max(y1, y2);

  if (maxRayX < cx - S || minRayX > cx + S || maxRayY < cy - S || minRayY > cy + S) {
    return null;
  }

  // 3. 12 Segments of the Plus Polygon
  const verts = [
    { x: cx - T, y: cy - S }, // 0
    { x: cx + T, y: cy - S }, // 1
    { x: cx + T, y: cy - T }, // 2
    { x: cx + S, y: cy - T }, // 3
    { x: cx + S, y: cy + T }, // 4
    { x: cx + T, y: cy + T }, // 5
    { x: cx + T, y: cy + S }, // 6
    { x: cx - T, y: cy + S }, // 7
    { x: cx - T, y: cy + T }, // 8
    { x: cx - S, y: cy + T }, // 9
    { x: cx - S, y: cy - T }, // 10
    { x: cx - T, y: cy - T }, // 11
  ];

  const normals = [
    { nx: 0,  ny: -1 }, // 0->1
    { nx: 1,  ny: 0  }, // 1->2
    { nx: 0,  ny: -1 }, // 2->3
    { nx: 1,  ny: 0  }, // 3->4
    { nx: 0,  ny: 1  }, // 4->5
    { nx: 1,  ny: 0  }, // 5->6
    { nx: 0,  ny: 1  }, // 6->7
    { nx: -1, ny: 0  }, // 7->8
    { nx: 0,  ny: 1  }, // 8->9
    { nx: -1, ny: 0  }, // 9->10
    { nx: 0,  ny: -1 }, // 10->11
    { nx: -1, ny: 0  }, // 11->0
  ];

  let minT = Infinity;
  let bestHit = null;

  const dx1 = x2 - x1;
  const dy1 = y2 - y1;

  for (let i = 0; i < 12; i++) {
    const q1 = verts[i];
    const q2 = verts[(i + 1) % 12];
    const dx2 = q2.x - q1.x;
    const dy2 = q2.y - q1.y;

    const denom = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(denom) < 1e-9) continue;

    const s = ((q1.x - x1) * dy2 - (q1.y - y1) * dx2) / denom;
    const t = ((q1.x - x1) * dy1 - (q1.y - y1) * dx1) / denom;

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
      if (s < minT) {
        minT = s;
        bestHit = {
          hit: true,
          t: s,
          hitX: x1 + s * dx1,
          hitY: y1 + s * dy1,
          normalX: normals[i].nx,
          normalY: normals[i].ny,
        };
      }
    }
  }

  // Also check if end point (x2, y2) ended up inside the plus
  if (!bestHit && isPointInsidePlusObstacle(x2, y2, cx, cy, S, T)) {
    let normalX = 0;
    let normalY = 0;
    const dx = x2 - cx;
    const dy = y2 - cy;
    if (Math.abs(dx) > Math.abs(dy)) {
      normalX = dx >= 0 ? 1 : -1;
    } else {
      normalY = dy >= 0 ? 1 : -1;
    }
    return { hit: true, t: 1, hitX: x2, hitY: y2, normalX, normalY };
  }

  return bestHit;
}

/**
 * Checks if direct line of sight between (x1, y1) and (x2, y2) is blocked by the center obstacle.
 */
export function isLineOfSightBlockedByObstacle(x1, y1, x2, y2, arena, padding = 0) {
  const hit = checkRayIntersectsPlusObstacle(x1, y1, x2, y2, arena, padding);
  return hit !== null && hit.hit;
}

/**
 * Clips a ray from (x1, y1) to (x2, y2) against the arena center obstacle.
 * Returns the clipped endpoint { x, y } and whether it hit.
 */
export function clipRayAgainstArenaObstacles(x1, y1, x2, y2, arena, padding = 0) {
  const hit = checkRayIntersectsPlusObstacle(x1, y1, x2, y2, arena, padding);
  if (hit) {
    return { x: hit.hitX, y: hit.hitY, hit: true, normalX: hit.normalX, normalY: hit.normalY };
  }
  return { x: x2, y: y2, hit: false, normalX: 0, normalY: 0 };
}

/**
 * Resolves projectile collision against the center plus obstacle.
 * Uses continuous swept-ray testing from (p.x - p.vx, p.y - p.vy) to (p.x, p.y)
 * so high-speed bullets never tunnel or skip through the obstacle.
 * Returns { hit: true, normalX, normalY, wallX, wallY } or false.
 */
export function resolveProjectilePlusObstacleCollision(p, arena) {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
  const obs = getArenaCenterObstacle(arena);
  if (!obs || obs.type !== 'plus') return false;

  const pr = p.r || p.radius || 4;
  const prevX = (typeof p.vx === 'number' && Number.isFinite(p.vx)) ? (p.x - p.vx) : p.x;
  const prevY = (typeof p.vy === 'number' && Number.isFinite(p.vy)) ? (p.y - p.vy) : p.y;

  const hit = checkRayIntersectsPlusObstacle(prevX, prevY, p.x, p.y, arena, pr);
  if (hit) {
    return {
      hit: true,
      normalX: hit.normalX,
      normalY: hit.normalY,
      wallX: hit.hitX,
      wallY: hit.hitY,
      t: hit.t
    };
  }

  return false;
}

/**
 * Draws the plus (+) center obstacle on the arena context.
 */
export function drawCenterPlusObstacle(ctx, arena, isDark = false) {
  const obs = getArenaCenterObstacle(arena);
  if (!obs || obs.type !== 'plus') return;

  const cx = obs.cx;
  const cy = obs.cy;
  const S = obs.halfSize;
  const T = obs.halfThick;

  const borderColor = isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(15, 15, 18, 0.85)';
  const outerBg = isDark ? '#000000' : (CONFIG.arenaOuterBgColor || '#fff8ceff');

  ctx.save();

  // 1. Fill center wall interior with outer boundary background tone (solid void wall)
  ctx.fillStyle = outerBg;
  ctx.beginPath();
  _tracePlusPath(ctx, cx, cy, S, T);
  ctx.fill();

  // 2. Stroke with the exact same arena border style (lineWidth 2.5, miter join, square cap)
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'square';
  ctx.beginPath();
  _tracePlusPath(ctx, cx, cy, S, T);
  ctx.stroke();

  ctx.restore();
}

/**
 * Helper to trace the 12-vertex path of a plus (+) shape.
 */
function _tracePlusPath(ctx, cx, cy, S, T) {
  ctx.moveTo(cx - T, cy - S);
  ctx.lineTo(cx + T, cy - S);
  ctx.lineTo(cx + T, cy - T);
  ctx.lineTo(cx + S, cy - T);
  ctx.lineTo(cx + S, cy + T);
  ctx.lineTo(cx + T, cy + T);
  ctx.lineTo(cx + T, cy + S);
  ctx.lineTo(cx - T, cy + S);
  ctx.lineTo(cx - T, cy + T);
  ctx.lineTo(cx - S, cy + T);
  ctx.lineTo(cx - S, cy - T);
  ctx.lineTo(cx - T, cy - T);
  ctx.closePath();
}
