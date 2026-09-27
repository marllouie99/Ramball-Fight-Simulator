// ─────────────────────────────────────────────────────────────
// SAITAMA ARENA WALL SHATTER SYSTEM
// High-impact manga-style arena wall destruction on Serious Counter punch.
// Blows open a shattered breach in the arena line walls.
// Features natural staggered wall line fracture physics:
// - Cracked line segments that hang suspended in air / structural tension
// - Shuddering / trembling vibration before snapping and falling with gravity
// - Dangling hinge wall pieces that swing down and hang for seconds before breaking
// - Branching lightning fissures extending into intact wall borders
// - Flying supersonic debris shards, falling rubble crumbs, and dust clouds
// ─────────────────────────────────────────────────────────────

import { state, triggerGlobalScreenShake } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { spawnImpactFlash, spawnSparks } from './sparkEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { triggerHudShatter, updateHudShatters, drawBottomHudShatters, clearHudShatters, isInsideSaitamaFrontalBlast } from './hudShatterEffect.js';

/**
 * Calculates ray intersection with rectangular or circular arena boundaries.
 * @param {number} ox - Ray origin X
 * @param {number} oy - Ray origin Y
 * @param {number} angle - Ray direction angle
 * @param {object} arena - Arena configuration
 * @returns {object|null} Intersection details { x, y, wallType, t, normalAngle, tangentAngle }
 */
export function findArenaWallIntersection(ox, oy, angle, arena) {
  if (!arena) return null;

  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const isCircle = arena.shape === 'circle';

  if (isCircle) {
    const cx = arena.x + arena.width / 2;
    const cy = arena.y + arena.height / 2;
    const ar = arena.radius !== undefined ? arena.radius : (arena.width / 2);

    // Ray-circle intersection
    const dx = ox - cx;
    const dy = oy - cy;
    const b = 2 * (dx * dirX + dy * dirY);
    const c = dx * dx + dy * dy - ar * ar;
    const disc = b * b - 4 * c;

    if (disc >= 0) {
      const sqrtD = Math.sqrt(disc);
      let t = (-b + sqrtD) / 2;
      if (t < 0) t = (-b - sqrtD) / 2;
      if (t > 0) {
        const hitX = ox + t * dirX;
        const hitY = oy + t * dirY;
        const normAngle = Math.atan2(hitY - cy, hitX - cx);
        return {
          x: hitX,
          y: hitY,
          wallType: 'circle',
          t,
          normalAngle: normAngle,
          tangentAngle: normAngle + Math.PI / 2,
          cx,
          cy,
          radius: ar
        };
      }
    }
    return null;
  }

  // Rectangular arena intersection
  const minX = arena.x;
  const maxX = arena.x + arena.width;
  const minY = arena.y;
  const maxY = arena.y + arena.height;

  let bestT = Infinity;
  let bestHit = null;

  // Left wall: x = minX
  if (dirX < -0.0001) {
    const t = (minX - ox) / dirX;
    if (t > 0 && t < bestT) {
      const hitY = oy + t * dirY;
      if (hitY >= minY - 50 && hitY <= maxY + 50) {
        bestT = t;
        bestHit = { x: minX, y: hitY, wallType: 'left', t, normalAngle: 0, tangentAngle: Math.PI / 2 };
      }
    }
  }

  // Right wall: x = maxX
  if (dirX > 0.0001) {
    const t = (maxX - ox) / dirX;
    if (t > 0 && t < bestT) {
      const hitY = oy + t * dirY;
      if (hitY >= minY - 50 && hitY <= maxY + 50) {
        bestT = t;
        bestHit = { x: maxX, y: hitY, wallType: 'right', t, normalAngle: Math.PI, tangentAngle: Math.PI / 2 };
      }
    }
  }

  // Top wall: y = minY
  if (dirY < -0.0001) {
    const t = (minY - oy) / dirY;
    if (t > 0 && t < bestT) {
      const hitX = ox + t * dirX;
      if (hitX >= minX - 50 && hitX <= maxX + 50) {
        bestT = t;
        bestHit = { x: hitX, y: minY, wallType: 'top', t, normalAngle: Math.PI / 2, tangentAngle: 0 };
      }
    }
  }

  // Bottom wall: y = maxY
  if (dirY > 0.0001) {
    const t = (maxY - oy) / dirY;
    if (t > 0 && t < bestT) {
      const hitX = ox + t * dirX;
      if (hitX >= minX - 50 && hitX <= maxX + 50) {
        bestT = t;
        bestHit = { x: hitX, y: maxY, wallType: 'bottom', t, normalAngle: -Math.PI / 2, tangentAngle: 0 };
      }
    }
  }

  return bestHit;
}

/**
 * Finds ALL wall boundaries/segments that intersect the frontal supersonic cone of Saitama's punch.
 * Supports simultaneously shattering multiple walls (e.g. corner hits affecting Top + Right walls).
 * @param {number} ox - Punch origin X
 * @param {number} oy - Punch origin Y
 * @param {number} punchAngle - Serious Punch release angle
 * @param {object} arena - Arena configuration
 * @param {number} [halfArc] - Frontal half arc
 * @returns {Array<object>} Array of hit details
 */
export function findAllArenaWallIntersections(ox, oy, punchAngle, arena, halfArc) {
  if (!arena) return [];
  if (!halfArc) {
    halfArc = (CONFIG.saitama?.counterFrontalArc ?? ((28 * Math.PI) / 180)) / 2;
  }

  const isCircle = arena.shape === 'circle';
  const hits = [];

  if (isCircle) {
    const cx = arena.x + arena.width / 2;
    const cy = arena.y + arena.height / 2;
    const ar = arena.radius !== undefined ? arena.radius : (arena.width / 2);

    const steps = 180;
    const hitAngles = [];
    for (let i = 0; i < steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      const px = cx + ar * Math.cos(theta);
      const py = cy + ar * Math.sin(theta);
      if (isInsideSaitamaFrontalBlast(px, py, ox, oy, punchAngle, halfArc, 25)) {
        hitAngles.push(theta);
      }
    }

    if (hitAngles.length > 0) {
      const groups = [];
      let currentGroup = [hitAngles[0]];
      for (let k = 1; k < hitAngles.length; k++) {
        const prev = hitAngles[k - 1];
        const curr = hitAngles[k];
        if (Math.abs(curr - prev) <= (Math.PI * 2 / steps) * 1.5) {
          currentGroup.push(curr);
        } else {
          groups.push(currentGroup);
          currentGroup = [curr];
        }
      }
      if (currentGroup.length > 0) {
        if (groups.length > 0 && Math.abs((hitAngles[0] + Math.PI * 2) - hitAngles[hitAngles.length - 1]) <= (Math.PI * 2 / steps) * 1.5) {
          groups[0] = currentGroup.concat(groups[0]);
        } else {
          groups.push(currentGroup);
        }
      }

      for (const grp of groups) {
        if (grp.length < 2) continue;
        const startA = grp[0];
        const endA = grp[grp.length - 1];
        let midA = (startA + endA) / 2;
        if (startA > endA) midA = ((startA + endA + Math.PI * 2) / 2) % (Math.PI * 2);
        const hitX = cx + ar * Math.cos(midA);
        const hitY = cy + ar * Math.sin(midA);
        const arcLen = ar * Math.abs(endA - startA);
        const span = Math.max(70, Math.min(300, arcLen));
        const t = Math.hypot(hitX - ox, hitY - oy);
        const normAngle = Math.atan2(hitY - cy, hitX - cx);

        hits.push({
          x: hitX,
          y: hitY,
          wallType: 'circle',
          t,
          normalAngle: normAngle,
          tangentAngle: normAngle + Math.PI / 2,
          cx,
          cy,
          radius: ar,
          span
        });
      }
    }
  } else {
    // Rectangular Arena (Test all 4 walls: Top, Bottom, Left, Right)
    const minX = arena.x;
    const maxX = arena.x + arena.width;
    const minY = arena.y;
    const maxY = arena.y + arena.height;

    // 1. Top Wall: y = minY, x in [minX, maxX]
    let topMinX = Infinity;
    let topMaxX = -Infinity;
    const stepX = 4;
    for (let x = minX; x <= maxX; x += stepX) {
      if (isInsideSaitamaFrontalBlast(x, minY, ox, oy, punchAngle, halfArc, 25)) {
        if (x < topMinX) topMinX = x;
        if (x > topMaxX) topMaxX = x;
      }
    }
    if (topMaxX - topMinX >= 16) {
      const span = topMaxX - topMinX;
      const hitX = (topMinX + topMaxX) / 2;
      const t = Math.hypot(hitX - ox, minY - oy);
      hits.push({
        x: hitX,
        y: minY,
        wallType: 'top',
        t,
        normalAngle: Math.PI / 2,
        tangentAngle: 0,
        span
      });
    }

    // 2. Bottom Wall: y = maxY, x in [minX, maxX]
    let botMinX = Infinity;
    let botMaxX = -Infinity;
    for (let x = minX; x <= maxX; x += stepX) {
      if (isInsideSaitamaFrontalBlast(x, maxY, ox, oy, punchAngle, halfArc, 25)) {
        if (x < botMinX) botMinX = x;
        if (x > botMaxX) botMaxX = x;
      }
    }
    if (botMaxX - botMinX >= 16) {
      const span = botMaxX - botMinX;
      const hitX = (botMinX + botMaxX) / 2;
      const t = Math.hypot(hitX - ox, maxY - oy);
      hits.push({
        x: hitX,
        y: maxY,
        wallType: 'bottom',
        t,
        normalAngle: -Math.PI / 2,
        tangentAngle: 0,
        span
      });
    }

    // 3. Left Wall: x = minX, y in [minY, maxY]
    let leftMinY = Infinity;
    let leftMaxY = -Infinity;
    const stepY = 4;
    for (let y = minY; y <= maxY; y += stepY) {
      if (isInsideSaitamaFrontalBlast(minX, y, ox, oy, punchAngle, halfArc, 25)) {
        if (y < leftMinY) leftMinY = y;
        if (y > leftMaxY) leftMaxY = y;
      }
    }
    if (leftMaxY - leftMinY >= 16) {
      const span = leftMaxY - leftMinY;
      const hitY = (leftMinY + leftMaxY) / 2;
      const t = Math.hypot(minX - ox, hitY - oy);
      hits.push({
        x: minX,
        y: hitY,
        wallType: 'left',
        t,
        normalAngle: 0,
        tangentAngle: Math.PI / 2,
        span
      });
    }

    // 4. Right Wall: x = maxX, y in [minY, maxY]
    let rightMinY = Infinity;
    let rightMaxY = -Infinity;
    for (let y = minY; y <= maxY; y += stepY) {
      if (isInsideSaitamaFrontalBlast(maxX, y, ox, oy, punchAngle, halfArc, 25)) {
        if (y < rightMinY) rightMinY = y;
        if (y > rightMaxY) rightMaxY = y;
      }
    }
    if (rightMaxY - rightMinY >= 16) {
      const span = rightMaxY - rightMinY;
      const hitY = (rightMinY + rightMaxY) / 2;
      const t = Math.hypot(maxX - ox, hitY - oy);
      hits.push({
        x: maxX,
        y: hitY,
        wallType: 'right',
        t,
        normalAngle: Math.PI,
        tangentAngle: Math.PI / 2,
        span
      });
    }
  }

  // Fallback if no wall points were hit by sampling
  if (hits.length === 0) {
    const singleHit = findArenaWallIntersection(ox, oy, punchAngle, arena);
    if (singleHit) {
      const coneWidthAtWall = (singleHit.t || 200) * Math.tan(halfArc) * 2 + 40;
      singleHit.span = Math.min(260, Math.max(80, coneWidthAtWall));
      hits.push(singleHit);
    }
  }

  return hits;
}

/**
 * Generates natural branching fracture fissure lines propagating along the wall.
 */
function generateBranchingFissures(originX, originY, baseAngle, spanLength, count = 3) {
  const fissures = [];
  for (let i = 0; i < count; i++) {
    const nodes = [];
    let curX = originX;
    let curY = originY;
    const branchAngle = baseAngle + (Math.random() - 0.5) * 0.45;
    const segCount = 4 + Math.floor(Math.random() * 4);
    const totalLen = spanLength * (0.6 + Math.random() * 0.7);
    const stepLen = totalLen / segCount;

    nodes.push({ x: curX, y: curY, w: 3.5 });

    for (let s = 1; s <= segCount; s++) {
      const p = s / segCount;
      const angleJitter = (Math.random() - 0.5) * 0.9;
      const curAngle = branchAngle + angleJitter;
      curX += Math.cos(curAngle) * stepLen;
      curY += Math.sin(curAngle) * stepLen;
      const w = Math.max(0.6, 3.5 * (1.0 - p * 0.85));
      nodes.push({ x: curX, y: curY, w });
    }

    fissures.push({
      nodes,
      life: 360,
      maxLife: 360
    });
  }
  return fissures;
}

/**
 * Generates structural wall segments that simulate natural fracture, explosive blown-away physics, and gravity collapse.
 */
function generateWallSegments(hit, span, punchAngle) {
  const segments = [];
  const numSegments = 10;
  const halfSpan = span / 2;
  const tanX = Math.cos(hit.tangentAngle);
  const tanY = Math.sin(hit.tangentAngle);
  const normX = Math.cos(hit.normalAngle);
  const normY = Math.sin(hit.normalAngle);

  // Divide span into discrete irregular blocks
  const divPoints = [-halfSpan];
  for (let i = 1; i < numSegments; i++) {
    const baseP = -halfSpan + (i / numSegments) * span;
    const jitter = (Math.random() - 0.5) * (span / numSegments * 0.4);
    divPoints.push(baseP + jitter);
  }
  divPoints.push(halfSpan);

  // Designate outer segments near breach boundary as hanging danglers
  const danglerIdx = Math.random() < 0.5 ? 1 : numSegments - 2;

  for (let i = 0; i < numSegments; i++) {
    const s0 = divPoints[i];
    const s1 = divPoints[i + 1];
    const segLen = Math.abs(s1 - s0);
    const midS = (s0 + s1) / 2;
    const distFromCenter = Math.abs(midS);
    const normDist = distFromCenter / halfSpan; // 0.0 (center) to 1.0 (edge)

    const segOriginX = hit.x + tanX * midS;
    const segOriginY = hit.y + tanY * midS;

    const thickness = 3.5 + Math.random() * 2.5;
    const halfL = segLen / 2;
    const halfT = thickness / 2;

    // BLOWN AWAY vs HANGING / DANGLING PHYSICS:
    // - Core & intermediate blast zone (normDist < 0.70): Blown away violently along punch vector!
    // - Outer flank zone (normDist >= 0.70): Structural hanging / dangler strain before snapping.
    const isBlownAway = normDist < 0.70;
    let isDangler = !isBlownAway && (i === danglerIdx && normDist > 0.50);
    let hangFrames = 0;

    if (!isBlownAway && !isDangler) {
      hangFrames = 25 + Math.floor((normDist - 0.5) * 90);
    }

    // Local polygon shape with jagged break edges
    const j1 = (Math.random() - 0.5) * 3.5;
    const j2 = (Math.random() - 0.5) * 3.5;
    const localPts = [
      { x: -halfL, y: -halfT + j1 },
      { x: halfL, y: -halfT + j2 },
      { x: halfL, y: halfT + j2 },
      { x: -halfL, y: halfT + j1 }
    ];

    // Internal hairline crack lines etched across the block
    const faceCracks = [];
    const crackCount = 1 + Math.floor(Math.random() * 3);
    for (let c = 0; c < crackCount; c++) {
      const cx0 = (Math.random() - 0.5) * (segLen * 0.7);
      const cy0 = -halfT;
      const cx1 = cx0 + (Math.random() - 0.5) * 6;
      const cy1 = halfT;
      faceCracks.push({ x0: cx0, y0: cy0, x1: cx1, y1: cy1 });
    }

    // High explosive blown-away physical properties
    const blastSpeed = isBlownAway
      ? (14 + (1.0 - normDist) * 20 + Math.random() * 10)
      : ((1.0 - normDist * 0.5) * (5 + Math.random() * 7));
    const blastAngleSpread = (Math.random() - 0.5) * 0.65;
    const outwardDir = punchAngle + blastAngleSpread;
    const fallVx = Math.cos(outwardDir) * blastSpeed + (Math.random() - 0.5) * 2.0;
    const fallVy = Math.sin(outwardDir) * blastSpeed + (Math.random() - 0.5) * 2.0;
    const rotSpeed = (Math.random() - 0.5) * (isBlownAway ? 0.38 : 0.14);

    // Dangler hinge properties
    const hingeOnLeft = s0 < 0;
    const hingeLocalX = hingeOnLeft ? -halfL : halfL;
    const hingeLocalY = 0;
    const hingeWorldX = segOriginX + tanX * hingeLocalX;
    const hingeWorldY = segOriginY + tanY * hingeLocalY;

    segments.push({
      index: i,
      originX: segOriginX,
      originY: segOriginY,
      x: segOriginX,
      y: segOriginY,
      rot: 0,
      rotSpeed,
      vx: fallVx,
      vy: fallVy,
      gravity: isBlownAway ? (0.24 + Math.random() * 0.08) : (0.32 + Math.random() * 0.10),
      drag: isBlownAway ? 0.975 : 0.960,
      thickness,
      segLen,
      localPts,
      faceCracks,
      state: isBlownAway ? 'falling' : (isDangler ? 'dangling' : 'hanging'),
      isBlownAway,
      hangTimer: hangFrames,
      maxHangTimer: hangFrames,
      isDangler,
      dangleTimer: isDangler ? (70 + Math.floor(Math.random() * 45)) : 0,
      maxDangleTimer: isDangler ? 115 : 0,
      dangleAngle: 0,
      dangleAngleTarget: (hingeOnLeft ? 1 : -1) * (0.45 + Math.random() * 0.45),
      dangleVel: 0,
      hingeWorldX,
      hingeWorldY,
      hingeLocalX,
      hingeLocalY,
      trembleAmount: 0,
      alpha: 1.0,
      crumbDropTimer: Math.floor(Math.random() * 8)
    });
  }

  return segments;
}

/**
 * Triggers a massive line wall shatter effect when Saitama lands his Serious Counter punch or Consecutive Normal Punches finisher.
 * Supports simultaneous multi-wall breaches across all walls intersecting the supersonic blast cone.
 * @param {number} originX - Saitama punch X
 * @param {number} originY - Saitama punch Y
 * @param {number} punchAngle - Punch release angle
 * @param {object} arena - Arena bounds
 * @param {number} [customHalfArc] - Optional custom frontal half arc (defaults to counterFrontalArc / 2)
 */
export function triggerSaitamaWallShatter(originX, originY, punchAngle, arena, customHalfArc) {
  if (!arena && typeof state !== 'undefined') arena = state.arena;
  if (!arena) return;

  const halfArc = customHalfArc !== undefined ? customHalfArc : ((CONFIG.saitama?.counterFrontalArc ?? ((28 * Math.PI) / 180)) / 2);
  const hits = findAllArenaWallIntersections(originX, originY, punchAngle, arena, halfArc);
  if (!hits || hits.length === 0) return;

  if (!state.shatteredWalls) {
    state.shatteredWalls = [];
  }

  // ── Re-blast & Accelerate Existing Wall Segments & Shards in the Blast Cone ──
  if (state.shatteredWalls.length > 0) {
    for (const existingSW of state.shatteredWalls) {
      if (existingSW.segments) {
        for (const seg of existingSW.segments) {
          if (isInsideSaitamaFrontalBlast(seg.x, seg.y, originX, originY, punchAngle, halfArc, 35)) {
            const isHangingOrDangling = seg.state === 'hanging' || seg.state === 'dangling';
            seg.state = 'falling';
            seg.hangTimer = 0;
            seg.dangleTimer = 0;
            seg.isBlownAway = true;
            const reBlastSpeed = isHangingOrDangling ? (16 + Math.random() * 14) : (12 + Math.random() * 10);
            const spread = (Math.random() - 0.5) * 0.6;
            const outwardDir = punchAngle + spread;
            seg.vx += Math.cos(outwardDir) * reBlastSpeed;
            seg.vy += Math.sin(outwardDir) * reBlastSpeed;
            seg.rotSpeed = (Math.random() - 0.5) * 0.42;
            seg.alpha = 1.0;
          }
        }
      }
      if (existingSW.fastShards) {
        for (const shard of existingSW.fastShards) {
          if (isInsideSaitamaFrontalBlast(shard.x, shard.y, originX, originY, punchAngle, halfArc, 35)) {
            const shardBoost = 14 + Math.random() * 16;
            const spread = (Math.random() - 0.5) * 0.7;
            shard.vx += Math.cos(punchAngle + spread) * shardBoost;
            shard.vy += Math.sin(punchAngle + spread) * shardBoost;
            shard.alpha = 1.0;
          }
        }
      }
      // Refresh life of existing shattered walls if re-hit
      existingSW.life = Math.max(existingSW.life, 260);
    }
  }

  const maxLife = 380; // ~6.3 seconds duration before complete restoration

  for (const hit of hits) {
    const span = Math.min(300, Math.max(70, hit.span || 140));
    const tanX = Math.cos(hit.tangentAngle);
    const tanY = Math.sin(hit.tangentAngle);

    // 1. Generate structural hanging & blown-away wall segments
    const segments = generateWallSegments(hit, span, punchAngle);

    // 2. Generate immediate epicentral blast shards (flying needle fragments)
    const fastShards = [];
    const shardCount = 20;
    for (let i = 0; i < shardCount; i++) {
      const posAlong = (Math.random() - 0.5) * (span * 0.7);
      const startX = hit.x + tanX * posAlong;
      const startY = hit.y + tanY * posAlong;

      const speed = 10 + Math.random() * 20;
      const angleSpread = (Math.random() - 0.5) * 0.9;
      const shardAngle = punchAngle + angleSpread;

      fastShards.push({
        x: startX,
        y: startY,
        vx: Math.cos(shardAngle) * speed,
        vy: Math.sin(shardAngle) * speed,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.45,
        length: 8 + Math.random() * 24,
        thickness: 2.0 + Math.random() * 3.5,
        isChunk: Math.random() < 0.50,
        drag: 0.95 + Math.random() * 0.03,
        alpha: 1.0,
        colorVariant: Math.random() < 0.25 ? '#FFD700' : (Math.random() < 0.20 ? '#FF3300' : null)
      });
    }

    // 3. Generate branching fissures into the intact wall
    const leftEnd = { x: hit.x - tanX * (span / 2), y: hit.y - tanY * (span / 2) };
    const rightEnd = { x: hit.x + tanX * (span / 2), y: hit.y + tanY * (span / 2) };
    const fissures = [
      ...generateBranchingFissures(leftEnd.x, leftEnd.y, hit.tangentAngle + Math.PI, 80, 2),
      ...generateBranchingFissures(rightEnd.x, rightEnd.y, hit.tangentAngle, 80, 2)
    ];

    // 4. Concrete dust puffs
    const dustParticles = [];
    const dustCount = 22;
    for (let d = 0; d < dustCount; d++) {
      const posAlong = (Math.random() - 0.5) * span;
      const startX = hit.x + tanX * posAlong;
      const startY = hit.y + tanY * posAlong;
      const dSpeed = 2.5 + Math.random() * 8.5;
      const dAngle = punchAngle + (Math.random() - 0.5) * 1.3;

      dustParticles.push({
        x: startX,
        y: startY,
        vx: Math.cos(dAngle) * dSpeed,
        vy: Math.sin(dAngle) * dSpeed,
        radius: 4 + Math.random() * 12,
        maxRadius: 18 + Math.random() * 26,
        alpha: 0.85,
        life: 50 + Math.floor(Math.random() * 35),
        maxLife: 85
      });
    }

    // 5. Broken teeth at the breach ends
    const leftTeeth = generateBrokenTeeth(hit.tangentAngle, true);
    const rightTeeth = generateBrokenTeeth(hit.tangentAngle, false);

    const shatteredWall = {
      x: hit.x,
      y: hit.y,
      wallType: hit.wallType,
      punchAngle,
      tangentAngle: hit.tangentAngle,
      normalAngle: hit.normalAngle,
      span,
      halfSpan: span / 2,
      life: maxLife,
      maxLife,
      segments,
      shards: fastShards,
      fastShards,
      fissures,
      dustParticles,
      crumbs: [],
      shockwaves: [
        { radius: 10, maxRadius: 170, speed: 8.5, alpha: 0.95, width: 3.5 },
        { radius: 5, maxRadius: 250, speed: 11.0, alpha: 0.80, width: 2.5 }
      ],
      leftTeeth,
      rightTeeth,
      seed: Math.random() * 1000
    };

    state.shatteredWalls.push(shatteredWall);

    // Audiovisual feedback per breached wall
    spawnImpactFlash(hit.x, hit.y, 80, '#FFFFFF');
    spawnSparks(hit.x, hit.y, 45, 'impact', '#FFD700');
  }

  // Trigger Top Names or Bottom HUD Shatter FX (passes all hits)
  triggerHudShatter(originX, originY, punchAngle, arena, hits);

  // Intense audiovisual feedback
  triggerGlobalScreenShake(12, 28);
  const smashSnd = CONFIG.saitama?.sounds?.counterWallShatterSFX || 'Assets/Sound Effects/Attacks/groundSmash.mp3';
  const smashVol = CONFIG.saitama?.soundVolumes?.counterWallShatter ?? 2.2;
  audioSystem.playSFX(smashSnd, smashVol);
}

/**
 * Helper to generate jagged manga line fracture teeth at breach ends.
 */
function generateBrokenTeeth(tangentAngle, isStart) {
  const teeth = [];
  const count = 4;
  for (let i = 0; i < count; i++) {
    const len = 8 + Math.random() * 16;
    const perp = (Math.random() - 0.5) * 10;
    teeth.push({ len, perp });
  }
  return teeth;
}

/**
 * Updates physics for all active shattered wall effects.
 */
export function updateSaitamaWallShatters() {
  updateHudShatters();
  if (!state.shatteredWalls || state.shatteredWalls.length === 0) return;

  for (let i = 0; i < state.shatteredWalls.length; i++) {
    const sw = state.shatteredWalls[i];

    // NOTE: The shattered wall breach gap, jagged fracture teeth, and wall fissures
    // are permanent structural destruction that stays broken throughout the match and victory screen!
    // They are ONLY cleared when a new round or match is initialized.

    // ── Update Structural Wall Segments (Hang, Dangle, Snap, Fall) ──
    for (let s = 0; s < sw.segments.length; s++) {
      const seg = sw.segments[s];

      if (seg.state === 'hanging') {
        seg.hangTimer--;
        // Increasing trembling vibration as hangTimer expires (building strain)
        const strainProgress = 1.0 - Math.max(0, seg.hangTimer) / (seg.maxHangTimer || 1);
        const trembleMag = 0.5 + strainProgress * 2.2;
        seg.x = seg.originX + (Math.random() - 0.5) * trembleMag;
        seg.y = seg.originY + (Math.random() - 0.5) * trembleMag;
        seg.rot = (Math.random() - 0.5) * 0.04 * strainProgress;

        // Emit crumbling grit/pebbles while trembling
        seg.crumbDropTimer--;
        if (seg.crumbDropTimer <= 0) {
          seg.crumbDropTimer = 8 + Math.floor(Math.random() * 8);
          sw.crumbs.push({
            x: seg.x + (Math.random() - 0.5) * (seg.segLen * 0.6),
            y: seg.y + (Math.random() - 0.5) * 4,
            vx: (Math.random() - 0.5) * 1.0,
            vy: 0.5 + Math.random() * 1.5,
            radius: 1.0 + Math.random() * 1.8,
            gravity: 0.28,
            life: 45,
            maxLife: 45,
            alpha: 0.95
          });
        }

        if (seg.hangTimer <= 0) {
          // Snap! Break free and plunge into falling state
          seg.state = 'falling';
          // Small fracture spark & puff on snap
          sw.dustParticles.push({
            x: seg.x,
            y: seg.y,
            vx: (Math.random() - 0.5) * 2,
            vy: 1 + Math.random() * 2,
            radius: 3,
            maxRadius: 10,
            alpha: 0.7,
            life: 30,
            maxLife: 30
          });
        }
      } else if (seg.state === 'dangling') {
        seg.dangleTimer--;
        // Damped pendulum swinging motion
        const spring = 0.08;
        const damping = 0.92;
        const angleDiff = seg.dangleAngleTarget - seg.dangleAngle;
        seg.dangleVel = (seg.dangleVel + angleDiff * spring) * damping;
        seg.dangleAngle += seg.dangleVel;

        // Jitter near hinge as strain mounts
        const strainProgress = 1.0 - Math.max(0, seg.dangleTimer) / (seg.maxDangleTimer || 1);
        const shudder = (Math.random() - 0.5) * (strainProgress * 1.8);
        seg.rot = seg.dangleAngle + shudder * 0.05;

        // Position body rotated around hinge
        const cosR = Math.cos(seg.rot);
        const sinR = Math.sin(seg.rot);
        seg.x = seg.hingeWorldX - (cosR * seg.hingeLocalX - sinR * seg.hingeLocalY);
        seg.y = seg.hingeWorldY - (sinR * seg.hingeLocalX + cosR * seg.hingeLocalY);

        // Crumb shedding
        seg.crumbDropTimer--;
        if (seg.crumbDropTimer <= 0) {
          seg.crumbDropTimer = 10 + Math.floor(Math.random() * 10);
          sw.crumbs.push({
            x: seg.x,
            y: seg.y,
            vx: (Math.random() - 0.5) * 1.2,
            vy: 0.8 + Math.random() * 1.8,
            radius: 1.2 + Math.random() * 2.0,
            gravity: 0.30,
            life: 50,
            maxLife: 50,
            alpha: 0.9
          });
        }

        if (seg.dangleTimer <= 0) {
          // Hinge snaps! Plunges downward
          seg.state = 'falling';
          seg.vy = 2.0 + Math.random() * 2.0;
          seg.rotSpeed = (Math.random() - 0.5) * 0.18;
          sw.dustParticles.push({
            x: seg.hingeWorldX,
            y: seg.hingeWorldY,
            vx: (Math.random() - 0.5) * 3,
            vy: 1 + Math.random() * 2,
            radius: 4,
            maxRadius: 12,
            alpha: 0.8,
            life: 35,
            maxLife: 35
          });
        }
      } else if (seg.state === 'falling') {
        seg.vy += seg.gravity;
        seg.x += seg.vx;
        seg.y += seg.vy;
        seg.vx *= seg.drag;
        seg.vy *= seg.drag;
        seg.rot += seg.rotSpeed;
        seg.alpha = 1.0;
      }
    }

    // ── Update Fast Immediate Blast Shards ──
    for (let s = 0; s < sw.fastShards.length; s++) {
      const shard = sw.fastShards[s];
      shard.x += shard.vx;
      shard.y += shard.vy;
      shard.vx *= shard.drag;
      shard.vy *= shard.drag;
      shard.rot += shard.rotSpeed;
      shard.alpha = 1.0;
    }

    // ── Update Crumbs & Falling Grit ──
    for (let c = sw.crumbs.length - 1; c >= 0; c--) {
      const crumb = sw.crumbs[c];
      crumb.vy += crumb.gravity;
      crumb.x += crumb.vx;
      crumb.y += crumb.vy;
      crumb.life--;
      crumb.alpha = Math.max(0, crumb.life / crumb.maxLife);
      if (crumb.life <= 0) {
        sw.crumbs.splice(c, 1);
      }
    }

    // ── Update Dust Clouds ──
    for (let d = sw.dustParticles.length - 1; d >= 0; d--) {
      const dust = sw.dustParticles[d];
      dust.x += dust.vx;
      dust.y += dust.vy;
      dust.vx *= 0.93;
      dust.vy *= 0.93;
      dust.life--;
      const p = 1.0 - (dust.life / dust.maxLife);
      dust.currentRadius = dust.radius + (dust.maxRadius - dust.radius) * Math.sin(p * Math.PI * 0.5);
      dust.currentAlpha = Math.max(0, (dust.life / dust.maxLife) * 0.65);
      if (dust.life <= 0) {
        sw.dustParticles.splice(d, 1);
      }
    }

    // ── Update Shockwaves ──
    for (let w = 0; w < sw.shockwaves.length; w++) {
      const wave = sw.shockwaves[w];
      if (wave.radius < wave.maxRadius) {
        wave.radius += wave.speed;
        wave.currentAlpha = Math.max(0, (1.0 - (wave.radius / wave.maxRadius)) * wave.alpha);
      } else {
        wave.currentAlpha = 0;
      }
    }
  }
}

/**
 * Draws all active shattered wall effects (breach gaps, hanging/falling segments, fissures, shards, shockwaves).
 * @param {CanvasRenderingContext2D} ctx - 2D Canvas context (inside camera transform)
 * @param {boolean} isDark - Whether dark mode is active
 * @param {object} arena - Arena object
 */
export function drawSaitamaWallShatters(ctx, isDark, arena) {
  if (state.shatteredWalls && state.shatteredWalls.length > 0) {
    const hasActiveDomain = state.fighters && state.fighters.some(f => f && (f.domainActive || f.stolenDomainActive || f._mahitoDomainActive || (f.characterId === 'cj' && (f.isBaguvixActive || f.isGodModeActive))) && typeof f.drawDomainBackground === 'function');
    const isStorming = Boolean(
      (state.fighters && state.fighters.some(f => 
        f && f.hp > 0 && (
          ((f.characterId === 'zeus' || f.type === 'zeus' || f._def?.id === 'zeus') && (f.isChargingStorm || f.stormActive)) ||
          (f.characterId === 'rubbick' && f.stormActive)
        )
      )) || (state.previewFighter && (state.previewFighter.isChargingStorm || state.previewFighter.stormActive))
    );
    const suppressArenaFloor = hasActiveDomain || isStorming;
    const wallBgColor = isDark ? '#000000' : (suppressArenaFloor ? '#080808' : (CONFIG.arenaOuterBgColor || '#fff8ceff'));
    const inkColor = isDark ? 'rgba(255, 255, 255, 0.92)' : 'rgba(15, 15, 18, 0.95)';
    const crackAccentColor = isDark ? 'rgba(255, 255, 255, 0.70)' : 'rgba(40, 40, 45, 0.75)';

    for (let i = 0; i < state.shatteredWalls.length; i++) {
      const sw = state.shatteredWalls[i];
      const globalAlpha = 1.0;

      const tanX = Math.cos(sw.tangentAngle);
      const tanY = Math.sin(sw.tangentAngle);
      const normX = Math.cos(sw.normalAngle);
      const normY = Math.sin(sw.normalAngle);

      ctx.save();

      // ── 1. Draw Breach Cutout / Eraser Gap over the Wall Line ──
      const startX = sw.x - tanX * sw.halfSpan;
      const startY = sw.y - tanY * sw.halfSpan;
      const endX = sw.x + tanX * sw.halfSpan;
      const endY = sw.y + tanY * sw.halfSpan;

      const maskWidth = 16;
      ctx.strokeStyle = wallBgColor;
      ctx.lineWidth = maskWidth;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // ── 2. Draw Branching Fissure Decals on Intact Wall Borders ──
      for (const fissure of sw.fissures) {
        if (fissure.nodes && fissure.nodes.length >= 2) {
          ctx.save();
          ctx.strokeStyle = inkColor;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'miter';
          ctx.beginPath();
          for (let n = 0; n < fissure.nodes.length; n++) {
            const node = fissure.nodes[n];
            if (n === 0) ctx.moveTo(node.x, node.y);
            else ctx.lineTo(node.x, node.y);
          }
          ctx.lineWidth = 2.0;
          ctx.stroke();
          ctx.restore();
        }
      }

      // ── 3. Draw Jagged Fracture Teeth at Gap Edges ──
      const drawTeeth = (cx, cy, teeth, dirSign) => {
        ctx.fillStyle = inkColor;
        for (let t = 0; t < teeth.length; t++) {
          const tooth = teeth[t];
          const toothLen = tooth.len;
          const tipX = cx + tanX * (dirSign * toothLen) + normX * tooth.perp;
          const tipY = cy + tanY * (dirSign * toothLen) + normY * tooth.perp;

          const base1X = cx + normX * 4;
          const base1Y = cy + normY * 4;
          const base2X = cx - normX * 4;
          const base2Y = cy - normY * 4;

          ctx.beginPath();
          ctx.moveTo(base1X, base1Y);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(base2X, base2Y);
          ctx.closePath();
          ctx.fill();
        }
      };

      drawTeeth(startX, startY, sw.leftTeeth, 1);
      drawTeeth(endX, endY, sw.rightTeeth, -1);

    // ── 4. Draw Structural Hanging / Dangling / Falling Wall Line Segments ──
    for (const seg of sw.segments) {
      if (seg.alpha <= 0.01) continue;

      ctx.save();
      ctx.translate(seg.x, seg.y);
      ctx.rotate(sw.tangentAngle + seg.rot);
      ctx.globalAlpha = seg.alpha;

      // Draw solid polygon body of the cracked wall line block
      ctx.fillStyle = inkColor;
      ctx.beginPath();
      seg.localPts.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.fill();

      // Subtle 3D Depth Highlight on the top rim
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Internal hairline crack lines etched across the block
      ctx.strokeStyle = crackAccentColor;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      for (const fc of seg.faceCracks) {
        ctx.moveTo(fc.x0, fc.y0);
        ctx.lineTo(fc.x1, fc.y1);
      }
      ctx.stroke();

      // Stress spark flash at break seams while hanging in stasis
      if ((seg.state === 'hanging' || seg.state === 'dangling') && Math.random() < 0.15) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(seg.localPts[0].x, seg.localPts[0].y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // ── 5. Draw Falling Rubble Crumbs & Grit Particles ──
    for (const crumb of sw.crumbs) {
      if (crumb.alpha <= 0.01) continue;
      ctx.save();
      ctx.fillStyle = inkColor;
      ctx.globalAlpha = crumb.alpha;
      ctx.beginPath();
      ctx.arc(crumb.x, crumb.y, crumb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── 6. Draw Expanding Supersonic Shockwave Arcs into Outer Void ──
    for (const wave of sw.shockwaves) {
      if (wave.currentAlpha > 0.01) {
        ctx.save();
        ctx.strokeStyle = isDark ? `rgba(255, 255, 255, ${wave.currentAlpha})` : `rgba(20, 20, 25, ${wave.currentAlpha})`;
        ctx.lineWidth = wave.width;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, wave.radius, sw.punchAngle - Math.PI * 0.45, sw.punchAngle + Math.PI * 0.45);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── 7. Draw Outward Concrete Dust Puffs ──
    for (const dust of sw.dustParticles) {
      if (dust.currentAlpha > 0.01) {
        ctx.save();
        ctx.fillStyle = isDark
          ? `rgba(200, 210, 230, ${dust.currentAlpha * 0.35})`
          : `rgba(100, 95, 90, ${dust.currentAlpha * 0.40})`;
        ctx.beginPath();
        ctx.arc(dust.x, dust.y, dust.currentRadius || dust.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ── 8. Draw Fast Flying Sharp Line Shards & Debris Chunks ──
    for (const shard of sw.fastShards) {
      if (shard.alpha <= 0.01) continue;

      ctx.save();
      ctx.translate(shard.x, shard.y);
      ctx.rotate(shard.rot);

      const fillCol = shard.colorVariant || inkColor;

      if (shard.isChunk) {
        const hw = shard.length * 0.45;
        const hh = shard.thickness * 1.4;
        ctx.fillStyle = fillCol;
        ctx.beginPath();
        ctx.moveTo(-hw, -hh * 0.5);
        ctx.lineTo(hw * 0.4, -hh);
        ctx.lineTo(hw, hh * 0.2);
        ctx.lineTo(hw * 0.2, hh);
        ctx.lineTo(-hw * 0.8, hh * 0.7);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.0;
        ctx.stroke();
      } else {
        const halfL = shard.length / 2;
        const halfT = shard.thickness / 2;
        ctx.fillStyle = fillCol;
        ctx.beginPath();
        ctx.moveTo(-halfL, -halfT);
        ctx.lineTo(halfL, -halfT * 0.4);
        ctx.lineTo(halfL + 2, 0);
        ctx.lineTo(halfL, halfT * 0.4);
        ctx.lineTo(-halfL, halfT);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }
  }

  // Draw Bottom HUD falling debris & fracture lines
  if (state.hudShatters && state.hudShatters.bottomHudShatter) {
    drawBottomHudShatters(ctx, isDark, arena);
  }
}

/**
 * Resets all shattered wall states cleanly.
 */
export function clearSaitamaWallShatters() {
  if (state && state.shatteredWalls) {
    state.shatteredWalls.length = 0;
  }
  clearHudShatters();
}
