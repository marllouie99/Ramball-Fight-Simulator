import { ProjectileBehavior } from '../ProjectileBehavior.js';
import { CONFIG } from '../../../core/config.js';
import { state, triggerGlobalScreenShake } from '../../../core/state.js';
import { HitImpactSystem } from '../../hitImpactSystem.js';
import { spawnSparks, spawnImpactFlash } from '../../../graphics/particles/sparkEffect.js';

export class GojoBlueBehavior extends ProjectileBehavior {
  update(p, fighters, system) {
    const pullRadius = p.pullRadius || CONFIG.gojo?.blueRadius || 100;
    const ownerFighter = fighters[p.owner];
    const ownerTeam = state.getFighterTeam ? state.getFighterTeam(p.owner) : null;

    const allTargets = [
      ...(state.fighters || []),
      ...(state.illusions || []),
      ...(state.cjDriveBys || [])
    ];

    // 1. Gravitational pull & slow on all valid targets
    for (let i = 0; i < allTargets.length; i++) {
      const f = allTargets[i];
      if (!f || f.hp <= 0 || f.dead) continue;
      if (f === ownerFighter || (f.owner && f.owner === ownerFighter)) continue;

      let isEnemy = true;
      if (ownerTeam !== null) {
        const checkFighter = f.owner || f;
        const fi = state.fighters ? state.fighters.indexOf(checkFighter) : -1;
        if (fi !== -1 && state.getFighterTeam) {
          isEnemy = state.getFighterTeam(fi) !== ownerTeam;
        }
      }

      const isChanneling = typeof f.isChannelingSkill === 'function' ? f.isChannelingSkill() : false;
      if (isEnemy && !isChanneling && !f.immuneToCC && !f.isBaguvixActive && !f.isGodModeActive) {
        const dx = p.x - f.x;
        const dy = p.y - f.y;
        const dist = Math.hypot(dx, dy);
        if (dist < pullRadius) {
          const isWallLingering = p.isWallLingering;
          if (dist > 0) {
            const pullStrength = isWallLingering ? 4.8 : 3.5;
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

          // Apply Paralyze debuff to targets trapped in Blue's gravitational vortex
          const paralyzeFrames = CONFIG.gojo?.blueParalyzeDuration || 15;
          if (typeof f.applyParalyze === 'function') {
            f.applyParalyze(paralyzeFrames, { isBlue: true });
          } else {
            f.paralyzeTimer = Math.max(f.paralyzeTimer || 0, paralyzeFrames);
            if (f.statusEffects && typeof f.statusEffects.applyParalyze === 'function') {
              f.statusEffects.applyParalyze(paralyzeFrames, { isBlue: true });
            }
          }

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

          // Boundary clamp to ensure dragged entities never clip through arena walls
          const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
          if (arena) {
            const er = f.r || 25;
            f.x = Math.max(arena.x + er, Math.min(arena.x + arena.width - er, f.x));
            f.y = Math.max(arena.y + er, Math.min(arena.y + arena.height - er, f.y));
          }
        }
      }
    }

    // 2. Periodic DPS Tick Damage (like Hollow Purple)
    const dpsInterval = p.blueDPSInterval || CONFIG.gojo?.blueDPSInterval || 10;
    p.blueLastDPSTick = (p.blueLastDPSTick || 0) + 1;
    if (p.blueLastDPSTick >= dpsInterval) {
      p.blueLastDPSTick = 0;
      const blueDPS = p.blueDPS || CONFIG.gojo?.blueDPS || 65;
      const tickDamage = blueDPS * (dpsInterval / 60);

      for (let i = 0; i < allTargets.length; i++) {
        const ent = allTargets[i];
        if (!ent || ent.hp <= 0 || ent.dead || ent === ownerFighter) continue;
        if (ent.owner && ent.owner === ownerFighter) continue;

        let isEnemy = true;
        if (ownerTeam !== null) {
          const checkFighter = ent.owner || ent;
          const fi = state.fighters ? state.fighters.indexOf(checkFighter) : -1;
          if (fi !== -1 && state.getFighterTeam) {
            isEnemy = state.getFighterTeam(fi) !== ownerTeam;
          }
        }
        if (!isEnemy) continue;

        const dx = ent.x - p.x;
        const dy = ent.y - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist < pullRadius) {
          if (typeof ent.takeDamage === 'function') {
            ent.takeDamage(tickDamage, ownerFighter, { isBlueDPS: true, isProjectile: true, projectile: p });
          }
          spawnSparks(ent.x, ent.y, 3, 'lightningTrail', '#00D4CC');
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
    if (target && !target.isBaguvixActive && !target.isGodModeActive) {
      const paralyzeFrames = CONFIG.gojo?.blueParalyzeDuration || 20;
      if (typeof target.applyParalyze === 'function') {
        target.applyParalyze(paralyzeFrames, { isBlue: true });
      } else {
        target.paralyzeTimer = Math.max(target.paralyzeTimer || 0, paralyzeFrames);
        if (target.statusEffects && typeof target.statusEffects.applyParalyze === 'function') {
          target.statusEffects.applyParalyze(paralyzeFrames, { isBlue: true });
        }
      }
    }
    return HitImpactSystem.processProjectileHit(target, projectile, attacker, fighters);
  }

  checkExpire(projectile, system) {
    if (projectile.life <= 0) return true;

    const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
    if (!arena) return projectile.life <= 0;

    const pr = projectile.r || 15;
    const hitLeft   = projectile.x - pr <= arena.x;
    const hitRight  = projectile.x + pr >= arena.x + arena.width;
    const hitTop    = projectile.y - pr <= arena.y;
    const hitBottom = projectile.y + pr >= arena.y + arena.height;

    const isHittingWall = hitLeft || hitRight || hitTop || hitBottom;

    if (isHittingWall) {
      // Clamp to wall boundaries
      if (hitLeft)   { projectile.x = arena.x + pr; }
      if (hitRight)  { projectile.x = arena.x + arena.width - pr; }
      if (hitTop)    { projectile.y = arena.y + pr; }
      if (hitBottom) { projectile.y = arena.y + arena.height - pr; }

      // Halt linear travel so it stays pinned to the wall
      projectile.vx = 0;
      projectile.vy = 0;

      if (!projectile.isWallLingering) {
        projectile.isWallLingering = true;
        const lingerDuration = CONFIG.gojo?.blueWallLingerDuration ?? 90;
        projectile.wallLingerTimer = lingerDuration;
        spawnSparks(projectile.x, projectile.y, 8, 'lightningTrail', '#00FFFF');
        spawnImpactFlash(projectile.x, projectile.y, 25, 'lightningTrail');
        triggerGlobalScreenShake(2.5, 8);
      }

      projectile.wallLingerTimer -= 1;
      if (projectile.wallLingerTimer <= 0) {
        return true; // Expire after lingering on the wall
      }
      return false; // Stay active on the wall!
    }

    return false; // In flight, not expired
  }
}

