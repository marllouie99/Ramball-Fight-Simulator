// ─────────────────────────────────────────────
// TACTICAL FORCE — TACTICAL PHYSICS SYSTEM
// Isolated physics, gun collisions, obstacle resolution, and LOS checks
// ─────────────────────────────────────────────
import { CONFIG } from '../../js/core/config.js';
import { state, spawnFloatingText } from '../../js/core/state.js';
import { GAME_MODES } from '../../js/core/modeConfig.js';
import { spawnImpactFlash, spawnSparks, spawnMeleeClashShockwave } from '../../js/graphics/particles/sparkEffect.js';
import { STARTER_MAP, handleObstacleCollision, hasLineOfSight } from '../maps/index.js';

/**
 * Checks whether an entity is a tactical operative.
 */
export function isTacticalFighter(f) {
  if (!f) return false;
  if (f.isTacticalFighter) return true;
  if (f.gameCategory === 'tactical') return true;
  if (f._def && f._def.gameCategory === 'tactical') return true;
  const type = String(f.type || f.characterId || (f._def && f._def.type) || '').toLowerCase();
  return ['rifle', 'shotgun', 'pistol', 'sniper', 'barrett', 'm4a1', 'spas12', 'desert_eagle', 'deserteagle', 'awp', 'barrett50cal', 'tactical_commando', 'tactical_guerilla', 'tactical_breacher', 'tactical_gunslinger', 'tactical_infiltrator', 'tactical_marksman', 'tactical_barrett', 'tactical_sniper', 'tactical_heavy'].includes(type);
}

/**
 * Calculates physical gun barrel reach for melee collisions and clashes.
 */
export function getTacticalGunReach(f) {
  const type = String(f.type || f.characterId || (f._def && f._def.type) || '').toLowerCase();
  const scaleFactor = (f.r || 25) / 25;
  if (type.includes('barrett')) return (f.r || 25) + 55 * scaleFactor;
  if (type.includes('sniper') || type.includes('awp')) return (f.r || 25) + 52 * scaleFactor;
  if (type.includes('shotgun') || type.includes('spas')) return (f.r || 25) + 44 * scaleFactor;
  if (type.includes('rifle') || type.includes('m4a1') || type.includes('commando') || type.includes('guerilla') || type.includes('heavy')) return (f.r || 25) + 42 * scaleFactor;
  if (type.includes('pistol') || type.includes('desert') || type.includes('infiltrator') || type.includes('gunslinger')) return (f.r || 25) + 32 * scaleFactor;
  return (f.r || 25) + 42 * scaleFactor;
}

function checkLineSegmentsIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(d) < 1e-6) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;

  if (t >= 0.15 && t <= 1.0 && u >= 0.15 && u <= 1.0) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  }
  return null;
}

/**
 * Resolves physical barrel/gun collision for tactical firearms against enemy fighters & illusions.
 * Long barrels clash with opposing barrels and deliver melee muzzle-strike damage/knockback.
 */
export function resolveTacticalGunCollisions(fighters, illusions) {
  if (!fighters || fighters.length === 0) return;
  const isGunCollisionEnabled = CONFIG.tactical?.enableGunBarrelCollision ?? true;
  if (!isGunCollisionEnabled) return;

  const barrelRadius = 6.5;
  const now = Date.now();
  const bashDmg = CONFIG.tactical?.gunBashDamage ?? 25;
  const cooldownMs = (CONFIG.tactical?.gunBashCooldown ?? 22) * 16.6;
  const arena = state.arena || CONFIG.arena;

  for (let i = 0; i < fighters.length; i++) {
    const a = fighters[i];
    if (!a || a.hp <= 0) continue;
    if (!isTacticalFighter(a)) continue;

    const reachA = getTacticalGunReach(a);
    const angleA = a.gunAngle !== undefined ? a.gunAngle : (a.angle || 0);
    const cosA = Math.cos(angleA);
    const sinA = Math.sin(angleA);
    const segAx = cosA * reachA;
    const segAy = sinA * reachA;
    const segALenSq = reachA * reachA;
    const tipAx = a.x + segAx;
    const tipAy = a.y + segAy;

    if (!a._gunBashCooldowns) a._gunBashCooldowns = new Map();

    // 1. Gun Barrel vs Enemy Fighters & Weapon-to-Weapon Clashes
    for (let j = 0; j < fighters.length; j++) {
      if (i === j) continue;
      const b = fighters[j];
      if (!b || b.hp <= 0) continue;

      // Skip teammates in 2v2 mode
      if ((state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.STAND_OFF_1V2) && state.getFighterTeam(i) === state.getFighterTeam(j)) continue;

      // Check Gun Barrel vs Gun Barrel Clash
      if (isTacticalFighter(b) && j > i) {
        const reachB = getTacticalGunReach(b);
        const angleB = b.gunAngle !== undefined ? b.gunAngle : (b.angle || 0);
        const tipBx = b.x + Math.cos(angleB) * reachB;
        const tipBy = b.y + Math.sin(angleB) * reachB;

        const clashPoint = checkLineSegmentsIntersection(a.x, a.y, tipAx, tipAy, b.x, b.y, tipBx, tipBy);
        if (clashPoint) {
          if (now - (a._lastClashSparks || 0) >= 100) {
            a._lastClashSparks = now;
            b._lastClashSparks = now;
            if (typeof spawnSparks === 'function') {
              spawnSparks(clashPoint.x, clashPoint.y, 8, 'gold', '#F59E0B');
            }
            if (typeof spawnImpactFlash === 'function') {
              spawnImpactFlash(clashPoint.x, clashPoint.y, 16, '#FEF08A');
            }
          }
        }
      }

      // Check distance from B to barrel segment of A
      const bRelX = b.x - a.x;
      const bRelY = b.y - a.y;
      const t = Math.max(0, Math.min(1, (bRelX * segAx + bRelY * segAy) / segALenSq));

      // Only consider collision beyond A's own body radius
      if (t * reachA <= (a.r || 25) * 0.8) continue;

      const closestX = a.x + t * segAx;
      const closestY = a.y + t * segAy;
      const dx = b.x - closestX;
      const dy = b.y - closestY;
      const distSq = dx * dx + dy * dy;
      const minDist = (b.r || 25) + barrelRadius;

      if (distSq < minDist * minDist && distSq > 0) {
        // Melee Muzzle-Bash Strike (Debounced per target)
        const lastHit = a._gunBashCooldowns.get(b) || 0;
        if (now - lastHit >= cooldownMs) {
          a._gunBashCooldowns.set(b, now);
          b.takeDamage(bashDmg, a, { isMelee: true, isGunBash: true });

          if (typeof spawnSparks === 'function') {
            spawnSparks(closestX, closestY, 8, 'gold', '#F59E0B');
          }
          if (typeof spawnImpactFlash === 'function') {
            spawnImpactFlash(closestX, closestY, 18, '#CBD5E1');
          }
          if (typeof spawnMeleeClashShockwave === 'function') {
            spawnMeleeClashShockwave(closestX, closestY, 36, a.color || 'gold');
          }
          spawnFloatingText(closestX, closestY - 14, `-${bashDmg} BASH`, '#F59E0B');
        }

        // Clamp positions to arena & obstacles
        const activeObstacles = (state && state.activeMap && state.activeMap.obstacles) || (state && state.gameCategory === 'tactical' ? STARTER_MAP.obstacles : null);
        if (activeObstacles && activeObstacles.length > 0) {
          handleObstacleCollision(b, activeObstacles);
          handleObstacleCollision(a, activeObstacles);
        } else if (arena) {
          b.x = Math.max(arena.x + (b.r || 25), Math.min(arena.x + arena.width - (b.r || 25), b.x));
          b.y = Math.max(arena.y + (b.r || 25), Math.min(arena.y + arena.height - (b.r || 25), b.y));
          a.x = Math.max(arena.x + (a.r || 25), Math.min(arena.x + arena.width - (a.r || 25), a.x));
          a.y = Math.max(arena.y + (a.r || 25), Math.min(arena.y + arena.height - (a.r || 25), a.y));
        }
      }
    }

    // 2. Gun Barrel vs Illusions
    if (illusions && illusions.length > 0) {
      for (let k = 0; k < illusions.length; k++) {
        const ill = illusions[k];
        if (!ill || ill.hp <= 0) continue;

        const illOwnerIdx = ill.owner?.fighterIndex ?? (state.fighters ? state.fighters.indexOf(ill.owner) : -1);
        if (illOwnerIdx === i || ((state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.STAND_OFF_1V2) && state.getFighterTeam(i) === state.getFighterTeam(illOwnerIdx))) continue;

        const illRelX = ill.x - a.x;
        const illRelY = ill.y - a.y;
        const t = Math.max(0, Math.min(1, (illRelX * segAx + illRelY * segAy) / segALenSq));
        if (t * reachA <= (a.r || 25) * 0.8) continue;

        const closestX = a.x + t * segAx;
        const closestY = a.y + t * segAy;
        const dx = ill.x - closestX;
        const dy = ill.y - closestY;
        const distSq = dx * dx + dy * dy;
        const minDist = (ill.r || 20) + barrelRadius;

        if (distSq < minDist * minDist && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;

          ill.x += nx * overlap;
          ill.y += ny * overlap;

          const lastHit = a._gunBashCooldowns.get(ill) || 0;
          if (now - lastHit >= cooldownMs) {
            a._gunBashCooldowns.set(ill, now);
            if (typeof ill.takeDamage === 'function') {
              ill.takeDamage(bashDmg, a, { isMelee: true, isGunBash: true });
            }
            if (typeof spawnSparks === 'function') {
              spawnSparks(closestX, closestY, 6, 'gold', '#F59E0B');
            }
          }
        }
      }
    }
  }
}

/**
 * Handles cover obstacle collisions across active fighters in tactical mode.
 */
export function handleTacticalObstaclePass(fighters) {
  if (!fighters || fighters.length === 0) return;
  const activeObstacles = (state.activeMap && state.activeMap.obstacles) || STARTER_MAP.obstacles;
  if (!activeObstacles || activeObstacles.length === 0) return;

  for (let i = 0; i < fighters.length; i++) {
    const fighter = fighters[i];
    if (fighter && fighter.hp > 0) {
      handleObstacleCollision(fighter, activeObstacles);
      if (state.arena && typeof fighter.resolveWallBounce === 'function') {
        fighter.resolveWallBounce(state.arena);
      }
    }
  }
}

/**
 * Evaluates closest opponent targeting for Tactical Operatives, prioritizing
 * targets with clear Line-of-Sight (LOS) through cover obstacles.
 */
export function getTacticalClosestOpponent(fighter) {
  let closest = null;
  let bestDistance = Infinity;
  let closestLOS = null;
  let bestDistanceLOS = Infinity;

  const fighterIndex = fighter._stateIdx !== undefined ? fighter._stateIdx : state.fighters.indexOf(fighter);
  const fighterTeam = state.getFighterTeam(fighterIndex);
  const isTeamMode = (state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.STAND_OFF_1V2 || state.mode === 'Tactical 2v2' || state.mode === 'Tactical 4v4' || state.mode === GAME_MODES.TACTICAL_2V2 || state.mode === GAME_MODES.TACTICAL_4V4);
  const obstacles = (state.activeMap && state.activeMap.obstacles) || STARTER_MAP.obstacles;

  // Check regular fighters
  for (let i = 0; i < state.fighters.length; i++) {
    const other = state.fighters[i];
    if (!other || other === fighter || other.hp <= 0) continue;
    if (isTeamMode && fighterTeam !== null && state.getFighterTeam(i) === fighterTeam) continue;
    if (other.owner === fighter || fighter.owner === other) continue;
    if (other.owner && other.owner === fighter.owner) continue;

    const dx = other.x - fighter.x;
    const dy = other.y - fighter.y;
    const dSq = dx * dx + dy * dy;

    if (dSq < bestDistance) {
      bestDistance = dSq;
      closest = other;
    }

    if (obstacles && obstacles.length > 0) {
      if (hasLineOfSight(fighter.x, fighter.y, other.x, other.y, obstacles)) {
        if (dSq < bestDistanceLOS) {
          bestDistanceLOS = dSq;
          closestLOS = other;
        }
      }
    }
  }

  // Also check illusions
  if (state.illusions && state.illusions.length > 0) {
    for (let i = 0; i < state.illusions.length; i++) {
      const illusion = state.illusions[i];
      if (!illusion || illusion.hp <= 0 || (illusion.vanishTimer && illusion.vanishTimer > 0)) continue;
      if (illusion.owner === fighter) continue;
      if (isTeamMode && fighterTeam !== null && illusion.owner) {
        const _illOwnerIdx = illusion.owner._stateIdx !== undefined ? illusion.owner._stateIdx : state.fighters.indexOf(illusion.owner);
        const ownerTeam = state.getFighterTeam(_illOwnerIdx);
        if (ownerTeam === fighterTeam) continue;
      }
      const dx = illusion.x - fighter.x;
      const dy = illusion.y - fighter.y;
      const dSq = dx * dx + dy * dy;

      if (dSq < bestDistance) {
        bestDistance = dSq;
        closest = illusion;
      }

      if (obstacles && obstacles.length > 0) {
        if (hasLineOfSight(fighter.x, fighter.y, illusion.x, illusion.y, obstacles)) {
          if (dSq < bestDistanceLOS) {
            bestDistanceLOS = dSq;
            closestLOS = illusion;
          }
        }
      }
    }
  }

  return closestLOS || closest;
}

/**
 * Resolves fighter-to-fighter body collisions when at least one entity is a Tactical operative.
 * Applies higher tangential scatter force and triggers rotational spin reversals.
 */
export function resolveTacticalFighterCollision(a, b, impulse, nx, ny, tx, ty) {
  const scatterForce = CONFIG.tactical?.bodyBumpScatterForce ?? 0.85;
  const randA = (Math.random() - 0.5) * 2 * scatterForce;
  const randB = (Math.random() - 0.5) * 2 * scatterForce;

  if (!a.isTurret && !a.isDispenser) {
    if (!a.isInRage && !a.isMeleeMode) {
      a.vx -= impulse * nx + randA * impulse * tx;
      a.vy -= impulse * ny + randA * impulse * ty;
    }
    if (typeof a.normalizeSpeed === 'function') a.normalizeSpeed();
  }

  if (!b.isTurret && !b.isDispenser) {
    if (!b.isInRage && !b.isMeleeMode) {
      b.vx += impulse * nx + randB * impulse * tx;
      b.vy += impulse * ny + randB * impulse * ty;
    }
    if (typeof b.normalizeSpeed === 'function') b.normalizeSpeed();
  }
}

/**
 * Executes tactical mode physics passes (Gun Barrel Collisions & Cover Obstacles).
 */
export function updateTacticalPhysicsPass(fighters, illusions) {
  resolveTacticalGunCollisions(fighters, illusions);
  handleTacticalObstaclePass(fighters);
}

export { hasLineOfSight as hasTacticalLineOfSight };
