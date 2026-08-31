import { ProjectileBehavior } from '../ProjectileBehavior.js';
import { CONFIG } from '../../../core/config.js';
import { state } from '../../../core/state.js';
import { applyDamageToTarget } from '../../../entities/fighter.js';

// Re-implement areOnSameTeam locally or export it from a shared utils
function areOnSameTeam(ownerIndex, targetIndex) {
  if (ownerIndex === targetIndex) return true;
  if (!state.mode) return false;
  const isTeamMode = state.mode === '2v2' || state.mode === 'Stand Off';
  if (!isTeamMode) return false;
  const team1 = state.getFighterTeam ? state.getFighterTeam(ownerIndex) : null;
  const team2 = state.getFighterTeam ? state.getFighterTeam(targetIndex) : null;
  return team1 !== null && team1 === team2;
}

export class BlackHoleBehavior extends ProjectileBehavior {
  init(projectile, params) {
    const { x, y, ownerIndex, damage } = params;
    projectile.x = x;
    projectile.y = y;
    projectile.vx = 0;
    projectile.vy = 0;
    projectile.r = CONFIG.black.blackHoleRadius;
    projectile.life = CONFIG.black.blackHoleDuration;
    projectile.maxLife = CONFIG.black.blackHoleDuration;
    projectile.color = 'rgba(153,0,255,0.9)';
    projectile.owner = ownerIndex;
    projectile.damage = damage || CONFIG.black.blackHoleDamage;
    projectile.isBlackHole = true;
    projectile.transformed = true;
    projectile.tickTimer = 0;
    projectile.indicatorTimer = CONFIG.black.summonIndicatorFrames;
    projectile.indicatorLife = CONFIG.black.summonIndicatorFrames;
    projectile.behaviorType = 'black_hole';
  }

  update(p, fighters, system, ctx) {
    // ── Decoupled: Frozen black holes are in frozenProjectiles array, not here ──

    // Advance visual time for animations so they can freeze smoothly
    p.visualTime = (p.visualTime || Date.now()) + 16.667;

    // If not yet transformed, move as a projectile until timer expires
    if (!p.transformed) {
      p.x += p.vx;
      p.y += p.vy;
      p.transformTimer = (p.transformTimer || 0) - 1;
      p.life -= 1;

      if (p.transformTimer <= 0) {
        p.transformed = true;
        p.vx = 0;
        p.vy = 0;
        p.life = CONFIG.black.blackHoleDuration;
        p.maxLife = CONFIG.black.blackHoleDuration;
        p.r = CONFIG.black.blackHoleRadius;
        p.tickTimer = 0;
      }

      const hit = system.checkProjectileHits(p, fighters);
      const expired = system.isProjectileExpired(p);
      if (expired) {
        return true; // Mark as destroyed, system will clean it up
      }
      return false; // Still active
    }

    // Transformed black hole: apply pull and periodic damage
    p.life -= 1;
    p.tickTimer = (p.tickTimer || 0) + 1;
    if (p.indicatorTimer > 0) p.indicatorTimer--;

    const ownerIndex = p.owner;
    const tickInterval = p.maxLife <= 60 ? 1 : 60;
    const ownerHasEnemyInHole = ctx.ownerHasEnemyInHole;

    // Apply pull to fighters
    for (let fi = 0; fi < fighters.length; fi++) {
      if (!fighters[fi] || fi === ownerIndex) continue;
      const f = fighters[fi];
      const dx = p.x - f.x;
      const dy = p.y - f.y;
      const effectiveRadius = p.r + f.r;
      
      if (Math.abs(dx) > effectiveRadius || Math.abs(dy) > effectiveRadius) continue;
      const dist = Math.hypot(dx, dy);

      if (dist < effectiveRadius) {
        if (!f.immuneToCC && !f.isBaguvixActive && !f.isGodModeActive) {
          const nx = dist > 0 ? dx / dist : 0;
          const ny = dist > 0 ? dy / dist : 0;
          const speedFactor = Math.max(1, f.speed / (f.baseSpeed || f.speed || 1));
          const pullStrength = CONFIG.black.blackHolePullStrength * speedFactor * (1 - dist / effectiveRadius);

          const minScale = CONFIG.black.blackHoleVisualShrinkMin ?? 0.3;
          const targetScale = minScale + (1 - minScale) * (dist / effectiveRadius);
          if (f.visualScaleTarget === undefined || targetScale < f.visualScaleTarget) {
            f.visualScaleTarget = targetScale;
          }

          const radialVelocity = f.vx * nx + f.vy * ny;
          if (radialVelocity < 0) {
            const correction = -radialVelocity * 1.2;
            f.vx += nx * correction;
            f.vy += ny * correction;
          }
          f.vx += nx * pullStrength;
          f.vy += ny * pullStrength;
        }

        if (ownerHasEnemyInHole) ownerHasEnemyInHole[ownerIndex] = true;

        if (p.tickTimer % tickInterval === 0) {
          try {
            if (!areOnSameTeam(ownerIndex, fi)) {
              f.takeDamage(CONFIG.black.blackHoleDamage, fighters[ownerIndex], { fromBlackHole: true, bhTextInterval: tickInterval });
            }
          } catch (e) { console.error('Black hole damage error', e); }
        }
      }
    }

    // Apply pull to illusions
    if (state && state.illusions) {
      for (const illusion of state.illusions) {
        if (!illusion || illusion.hp <= 0) continue;
        const illusionOwnerIndex = illusion.owner?.fighterIndex ?? state.fighters?.indexOf(illusion.owner);
        if (illusionOwnerIndex !== undefined && illusionOwnerIndex !== -1) {
          if (ownerIndex === illusionOwnerIndex || areOnSameTeam(ownerIndex, illusionOwnerIndex)) continue;
        }

        const dx = p.x - illusion.x;
        const dy = p.y - illusion.y;
        const effectiveRadius = p.r + illusion.r;

        if (Math.abs(dx) > effectiveRadius || Math.abs(dy) > effectiveRadius) continue;
        const dist = Math.hypot(dx, dy);

        if (dist < effectiveRadius) {
          const nx = dist > 0 ? dx / dist : 0;
          const ny = dist > 0 ? dy / dist : 0;
          const speedFactor = Math.max(1, (illusion.speed || illusion.moveSpeed || 1) / (illusion.baseSpeed || illusion.moveSpeed || 1));
          const pullStrength = CONFIG.black.blackHolePullStrength * speedFactor * (1 - dist / effectiveRadius);

          const minScale = CONFIG.black.blackHoleVisualShrinkMin ?? 0.3;
          const targetScale = minScale + (1 - minScale) * (dist / effectiveRadius);
          if (illusion.visualScaleTarget === undefined || targetScale < illusion.visualScaleTarget) {
            illusion.visualScaleTarget = targetScale;
          }

          const radialVelocity = (illusion.vx || 0) * nx + (illusion.vy || 0) * ny;
          if (radialVelocity < 0) {
            const correction = -radialVelocity * 1.2;
            illusion.vx = (illusion.vx || 0) + nx * correction;
            illusion.vy = (illusion.vy || 0) + ny * correction;
          }
          illusion.vx = (illusion.vx || 0) + nx * pullStrength;
          illusion.vy = (illusion.vy || 0) + ny * pullStrength;

          if (ownerHasEnemyInHole) ownerHasEnemyInHole[ownerIndex] = true;

          if (p.tickTimer % tickInterval === 0) {
            try {
              applyDamageToTarget(illusion, CONFIG.black.blackHoleDamage, fighters[ownerIndex], { fromBlackHole: true, bhTextInterval: tickInterval });
            } catch (e) { console.error('Black hole damage error', e); }
          }
        }
      }
    }

    // Apply pull to other projectiles
    for (let j = 0; j < system.projectiles.length; j++) {
      const otherProj = system.projectiles[j];
      if (otherProj === p || otherProj.isVisual || otherProj.isExplosion || otherProj.isPoisonSpill || otherProj.isBlackHole || otherProj.behaviorType === 'yuta_pure_love_beam' || otherProj.visual === 'yuta_pure_love_beam' || otherProj.isPureLoveBeam) continue;
      
      const otherProjOwner = fighters[otherProj.owner];
      if (otherProjOwner && otherProjOwner._def && otherProjOwner._def.type === 'black') continue;

      const dx = p.x - otherProj.x;
      const dy = p.y - otherProj.y;
      const effectiveRadius = p.r * 2.5;

      if (Math.abs(dx) > effectiveRadius || Math.abs(dy) > effectiveRadius) continue;
      const distSq = dx * dx + dy * dy;

      if (distSq < effectiveRadius * effectiveRadius) {
        const dist = Math.sqrt(distSq);
        const minProjScale = CONFIG.black?.blackHoleProjShrinkMin ?? 0.15;
        const targetScale = minProjScale + (1 - minProjScale) * Math.min(1, dist / effectiveRadius);
        if (otherProj.visualScaleTarget === undefined || targetScale < otherProj.visualScaleTarget) {
          otherProj.visualScaleTarget = targetScale;
        }

        if (distSq < p.r * p.r * 0.25) {
          if (otherProj.isExplosion) {
            system._returnProjectile(otherProj);
            // Splice for safety since popping might shift iteration
            system.projectiles.splice(j, 1);
            j--;
            continue;
          }

          if (!otherProj.capturedByBlackHole) {
            otherProj.capturedByBlackHole = p;
            otherProj.orbitRadius = dist;
            otherProj.orbitAngle = Math.atan2(otherProj.y - p.y, otherProj.x - p.x);
            const currentSpeed = Math.hypot(otherProj.vx, otherProj.vy);
            otherProj.originalSpeed = Math.max(currentSpeed, otherProj.speed || 0, CONFIG.black?.blackHoleReleaseSpeed || 7.0);
          }
        } else {
          const nx = dx / dist;
          const ny = dy / dist;
          const pullStrength = CONFIG.black.blackHolePullStrength * 2.5 * (1 - dist / effectiveRadius);
          otherProj.vx += nx * pullStrength;
          otherProj.vy += ny * pullStrength;

          if (otherProj.angle !== undefined && !otherProj.isGrenade && !otherProj.isC4) {
            otherProj.angle = Math.atan2(otherProj.vy, otherProj.vx);
          }
        }
      }
    }

    if (p.life <= 0) {
      // Release captured projectiles
      for (let k = 0; k < system.projectiles.length; k++) {
        const capturedProj = system.projectiles[k];
        if (capturedProj.capturedByBlackHole === p) {
          capturedProj.capturedByBlackHole = null;
          const releaseSpeed = capturedProj.originalSpeed || CONFIG.black?.blackHoleReleaseSpeed || 7.0;
          capturedProj.vx = Math.cos(capturedProj.orbitAngle + Math.PI / 2) * releaseSpeed;
          capturedProj.vy = Math.sin(capturedProj.orbitAngle + Math.PI / 2) * releaseSpeed;
          if (capturedProj.angle !== undefined) {
            capturedProj.angle = Math.atan2(capturedProj.vy, capturedProj.vx);
          }
        }
      }
      return true; // Mark as destroyed
    }

    return false; // Did not expire
  }
}
