import { ProjectileBehavior } from '../ProjectileBehavior.js';
import { CONFIG } from '../../../core/config.js';
import { state, triggerGlobalScreenShake } from '../../../core/state.js';
import { HitImpactSystem } from '../../hitImpactSystem.js';
import { spawnSparks, spawnImpactFlash } from '../../../graphics/particles/sparkEffect.js';
import { areOnSameTeam as areOnSameTeamByIndex } from '../../../core/teamUtils.js';
import { isEntityImmuneToGravitationalPull } from '../../../entities/fighter.js';
import { resolveProjectilePlusObstacleCollision, resolveEntityPlusObstacleCollision } from '../../../systems/arenaObstacleSystem.js';

const areOnSameTeam = (ownerIndex, targetIndex) => areOnSameTeamByIndex(state, ownerIndex, targetIndex);

export class GojoBlueBehavior extends ProjectileBehavior {
  update(p, fighters, system) {
    const pullRadius = p.pullRadius || CONFIG.gojo?.bluePullRadius || CONFIG.gojo?.blueRadius || 100;
    const ownerIndex = (typeof p.owner === 'number') ? p.owner : (state.fighters ? state.fighters.indexOf(p.owner) : -1);
    const ownerFighter = (typeof p.owner === 'number' && fighters) ? fighters[p.owner] : (p.ownerFighter || p.owner);

    const isMatchOver = (typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd'));

    // If the round or match has ended (enemy died from Blue or other attack), let Blue continue active trajectory/wall-linger
    if (isMatchOver) {
      p.life -= 1;
      if (p.life <= 0) {
        this._releasePulledTargets(p);
        return true;
      }

      if (!p.isWallLingering) {
        p.x += p.vx;
        p.y += p.vy;
      }

      if (!p.history) p.history = [];
      p.history.push({ x: p.x, y: p.y });
      if (p.history.length > (p.historyMax || 10)) {
        p.history.shift();
      }

      return this.checkExpire(p, system);
    }

    const allTargets = [
      ...(state.fighters || []),
      ...(state.illusions || []),
      ...(state.cjDriveBys || [])
    ];

    // 1. Gravitational pull & slow on all valid targets (never pull teammates in 1v2 / 2v2)
    for (let i = 0; i < allTargets.length; i++) {
      const f = allTargets[i];
      if (!f || f.hp <= 0 || f.dead) continue;
      if (f === ownerFighter || (f.owner && f.owner === ownerFighter)) continue;

      if (ownerFighter && typeof ownerFighter.isTeammate === 'function') {
        if (ownerFighter.isTeammate(f) || (f.owner && ownerFighter.isTeammate(f.owner))) continue;
      }
      const checkFighter = f.owner || f;
      const fi = state.fighters ? state.fighters.indexOf(checkFighter) : -1;
      if (ownerIndex !== -1 && fi !== -1 && areOnSameTeam(ownerIndex, fi)) continue;

      if (!isEntityImmuneToGravitationalPull(f, 'blue')) {
        const dx = p.x - f.x;
        const dy = p.y - f.y;
        const dist = Math.hypot(dx, dy);
        if (dist < pullRadius) {
          f.isCaughtInBlue = true;
          f.isCaughtInBluePull = true;
          if (!p.pulledTargets) p.pulledTargets = new Set();
          p.pulledTargets.add(f);
          const isWallLingering = p.isWallLingering;
          if (dist > 0) {
            const pullStrength = isWallLingering ? 6.5 : 5.5;
            const force = (pullRadius - dist) / pullRadius * pullStrength;
            f.x += (dx / dist) * force;
            f.y += (dy / dist) * force;
          }

          // Apply slow while caught in Blue's gravitational field
          if (typeof f.applySlow === 'function') {
            f.applySlow(10, 0.45, { isBlueSlow: true });
          } else {
            f.slowTimer = Math.max(f.slowTimer || 0, 10);
            f.slowMultiplier = Math.min(f.slowMultiplier || 1.0, 0.45);
          }

          // Interrupt attacks ONLY if target is NOT actively channeling a skill
          const isChanneling = Boolean(
            (typeof f.isChannelingSkill === 'function' && f.isChannelingSkill()) ||
            (typeof f.isStationarySkillActive === 'function' && f.isStationarySkillActive()) ||
            f.isChannelingDivineFlame || f.isChannelingFuga || (f.fugaChargeTimer && f.fugaChargeTimer > 0) ||
            f.isChannelingPurple || (f.purpleChargeTimer && f.purpleChargeTimer > 0) ||
            f.isChannelingDomain || f.isChannelingDomainExpansion || (f.domainChargeTimer && f.domainChargeTimer > 0) ||
            f.isChannelingRCT || f.isChannelingBankai || f.isChannelingGetsuga ||
            f.isChannelingIncinerate || f.isChannelingSelfDestruct || f.isChannelingPureLoveBeam
          );

          if (!isChanneling) {
            if (typeof f.interruptAttacks === 'function') {
              f.interruptAttacks();
            }

            if (isWallLingering) {
              // Drag toward stationary vortex on wall
              const dirX = dist > 0 ? dx / dist : 0;
              const dirY = dist > 0 ? dy / dist : 0;
              f.vx = (f.vx || 0) * 0.35 + dirX * 2.5;
              f.vy = (f.vy || 0) * 0.35 + dirY * 2.5;
            } else {
              // Drag along traveling projectile
              const dragSpeed = 0.55;
              f.vx = (f.vx || 0) * 0.4 + p.vx * dragSpeed;
              f.vy = (f.vy || 0) * 0.4 + p.vy * dragSpeed;
            }
          }

          // Boundary clamp to ensure dragged entities never clip through arena walls
          const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
          if (arena) {
            const er = f.r || 25;
            f.x = Math.max(arena.x + er, Math.min(arena.x + arena.width - er, f.x));
            f.y = Math.max(arena.y + er, Math.min(arena.y + arena.height - er, f.y));
            resolveEntityPlusObstacleCollision(f, arena);
          }
        } else if (p.pulledTargets && p.pulledTargets.has(f)) {
          p.pulledTargets.delete(f);
          f.isCaughtInBlue = false;
          f.isCaughtInBluePull = false;
        }
      } else if (p.pulledTargets && p.pulledTargets.has(f)) {
        p.pulledTargets.delete(f);
        f.isCaughtInBlue = false;
        f.isCaughtInBluePull = false;
      }
    }

    // 2. Periodic DPS Tick Damage (smooth continuous vortex grinding)
    const dpsInterval = p.blueDPSInterval || CONFIG.gojo?.blueDPSInterval || 12;
    p.blueLastDPSTick = (p.blueLastDPSTick || 0) + 1;
    if (p.blueLastDPSTick >= dpsInterval) {
      p.blueLastDPSTick = 0;
      const blueDPS = (p.blueDPS !== undefined) ? p.blueDPS : (CONFIG.gojo?.blueDPS ?? 10);
      const tickDamage = Number((blueDPS * (dpsInterval / 60)).toFixed(1));

      if (tickDamage > 0) {
        for (let i = 0; i < allTargets.length; i++) {
          const ent = allTargets[i];
          if (!ent || ent.hp <= 0 || ent.dead || ent === ownerFighter) continue;
          if (ent.owner && ent.owner === ownerFighter) continue;

          if (ownerFighter && typeof ownerFighter.isTeammate === 'function') {
            if (ownerFighter.isTeammate(ent) || (ent.owner && ownerFighter.isTeammate(ent.owner))) continue;
          }
          const checkFighter = ent.owner || ent;
          const fi = state.fighters ? state.fighters.indexOf(checkFighter) : -1;
          if (ownerIndex !== -1 && fi !== -1 && areOnSameTeam(ownerIndex, fi)) continue;

          const dx = ent.x - p.x;
          const dy = ent.y - p.y;
          const dist = Math.hypot(dx, dy);

          if (dist < pullRadius) {
            if (typeof ent.takeDamage === 'function') {
              ent.takeDamage(tickDamage, ownerFighter, {
                isBlueDPS: true,
                isProjectile: true,
                projectile: p,
                isContinuous: true,
                suppressBlood: true,
                damageNumberColor: '#00FFFF'
              });
            }
            spawnSparks(ent.x, ent.y, 3, 'lightningTrail', '#00D4CC');
          }
        }
      }
    }

    // Wall linger particle pulses
    if (p.isWallLingering && Math.random() < 0.35) {
      spawnSparks(p.x, p.y, 2, 'lightningTrail', '#00FFFF');
    }

    return false; // Continue with standard movement & hit checks
  }

  onHit(projectile, target, attacker, fighters, system) {
    if (attacker && typeof attacker.isTeammate === 'function' && attacker.isTeammate(target)) {
      return false;
    }
    const isChanneling = Boolean(
      (typeof target.isChannelingSkill === 'function' && target.isChannelingSkill()) ||
      (typeof target.isPerformingSkill === 'function' && target.isPerformingSkill()) ||
      (typeof target.isStationarySkillActive === 'function' && target.isStationarySkillActive()) ||
      target.isChannelingDivineFlame || target.isChannelingFuga || (target.fugaChargeTimer && target.fugaChargeTimer > 0) ||
      target.isChannelingPurple || (target.purpleChargeTimer && target.purpleChargeTimer > 0) ||
      target.redBuildupPhase || (target.redEffectTimer && target.redEffectTimer > 0) ||
      target.isChannelingDomain || target.isChannelingDomainExpansion || (target.domainChargeTimer && target.domainChargeTimer > 0) ||
      target.isChannelingRCT || target.isChannelingBankai || target.isChannelingGetsuga ||
      target.isChannelingIncinerate || target.isChannelingSelfDestruct || target.isChannelingPureLoveBeam ||
      target.isCountering || (target._counterPunchTimer && target._counterPunchTimer > 0) ||
      (target._counterWindupTimer && target._counterWindupTimer > 0) || (target._postCounterRecoveryTimer && target._postCounterRecoveryTimer > 0)
    );

    if (!isChanneling && typeof target.interruptAttacks === 'function') {
      target.interruptAttacks();
    }

    if (typeof target.applyParalyze === 'function') {
      const paralyzeDuration = CONFIG.gojo?.blueParalyzeDuration ?? 15;
      target.applyParalyze(paralyzeDuration);
    }

    HitImpactSystem.processProjectileHit(target, projectile, attacker, fighters);
    return false; // Gojo Blue is piercing and travels through targets until reaching an arena wall
  }

  _releasePulledTargets(projectile) {
    if (projectile.pulledTargets) {
      for (const ent of projectile.pulledTargets) {
        if (ent) {
          ent.isCaughtInBlue = false;
          ent.isCaughtInBluePull = false;
        }
      }
      projectile.pulledTargets.clear();
    }
  }

  checkExpire(projectile, system) {
    if (projectile.life <= 0) {
      this._releasePulledTargets(projectile);
      return true;
    }

    // If already pinned to an arena wall or obstacle, process linger countdown
    if (projectile.isWallLingering) {
      projectile.vx = 0;
      projectile.vy = 0;
      projectile.wallLingerTimer = (projectile.wallLingerTimer ?? 0) - 1;
      if (projectile.wallLingerTimer <= 0) {
        this._releasePulledTargets(projectile);
        return true; // Expire after lingering on the wall
      }
      return false; // Stay active on the wall!
    }

    const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
    if (!arena) {
      return false;
    }

    // Physical core radius of the Blue orb for wall contact (not full 100px gravitational pull field)
    const wallR = Math.min(22, (CONFIG.gojo?.blueProjectileRadius ?? 25));
    let isHittingWall = false;

    // 1. Center plus obstacle swept-collision check
    const tempP = { x: projectile.x, y: projectile.y, vx: projectile.vx, vy: projectile.vy, r: wallR };
    const obsHit = resolveProjectilePlusObstacleCollision(tempP, arena);
    if (obsHit && (obsHit.normalX * projectile.vx + obsHit.normalY * projectile.vy < 0)) {
      projectile.x = obsHit.wallX;
      projectile.y = obsHit.wallY;
      isHittingWall = true;
    } else if (arena.shape === 'circle') {
      // 2. Circular arena perimeter collision
      const cx = arena.x + arena.width / 2;
      const cy = arena.y + arena.height / 2;
      const ar = arena.radius || (arena.width / 2);
      const d = Math.hypot(projectile.x - cx, projectile.y - cy);
      if (d + wallR >= ar && d > 0) {
        const nx = (projectile.x - cx) / d;
        const ny = (projectile.y - cy) / d;
        const movingOutward = (projectile.vx * nx + projectile.vy * ny) > 0;
        if (movingOutward) {
          projectile.x = cx + nx * (ar - wallR);
          projectile.y = cy + ny * (ar - wallR);
          isHittingWall = true;
        }
      }
    } else {
      // 3. Rectangular arena boundary collision with directional velocity gating
      const hitLeft   = projectile.x - wallR <= arena.x;
      const hitRight  = projectile.x + wallR >= arena.x + arena.width;
      const hitTop    = projectile.y - wallR <= arena.y;
      const hitBottom = projectile.y + wallR >= arena.y + arena.height;

      const collidesLeft   = hitLeft && projectile.vx < 0;
      const collidesRight  = hitRight && projectile.vx > 0;
      const collidesTop    = hitTop && projectile.vy < 0;
      const collidesBottom = hitBottom && projectile.vy > 0;

      if (collidesLeft || collidesRight || collidesTop || collidesBottom) {
        if (collidesLeft)   projectile.x = arena.x + wallR;
        if (collidesRight)  projectile.x = arena.x + arena.width - wallR;
        if (collidesTop)    projectile.y = arena.y + wallR;
        if (collidesBottom) projectile.y = arena.y + arena.height - wallR;
        isHittingWall = true;
      }
    }

    if (isHittingWall) {
      // Halt linear travel and pin to the wall
      projectile.vx = 0;
      projectile.vy = 0;
      projectile.isWallLingering = true;
      const lingerDuration = CONFIG.gojo?.blueWallLingerDuration ?? 90;
      projectile.wallLingerTimer = lingerDuration;
      spawnSparks(projectile.x, projectile.y, 8, 'lightningTrail', '#00FFFF');
      spawnImpactFlash(projectile.x, projectile.y, 25, 'lightningTrail');
      triggerGlobalScreenShake(2.5, 8);
      return false; // Stay active on the wall!
    }

    return false; // In flight, traveling toward wall
  }
}

