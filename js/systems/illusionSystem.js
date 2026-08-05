import { state, spawnFloatingText, isChampionScreenActive } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { spawnIllusionDeath } from '../graphics/particles/illusionDeathEffect.js';
import { spatialGrid } from './physics.js';

/**
 * Update active illusions (clones, Rika, etc).
 */
export function updateIllusions() {
  if (state.gameState !== 'playing' && state.gameState !== 'roundEnd' && state.gameState !== 'matchEnd') return;

  for (let i = state.illusions.length - 1; i >= 0; i--) {
    const illusion = state.illusions[i];

    // Always decrement hit flash even if dying, so they don't get stuck white
    if (illusion.hitFlashTimer > 0) {
      illusion.hitFlashTimer--;
    }

    // Illusions only disappear when they die (HP <= 0), not by duration
    if (illusion.hp <= 0) {
      if (illusion.isRika) continue; // Rika handles her own death animation
      spawnIllusionDeath(illusion); // Spawn ethereal death effect
      // High-performance swap-and-pop array cleanup instead of splice
      state.illusions[i] = state.illusions[state.illusions.length - 1];
      state.illusions.pop();
      spawnFloatingText(illusion.x, illusion.y - illusion.r - 10, 'ILLUSION SHATTERED!', '#9b59b6');
      continue;
    }

    const isChampScreen = (typeof isChampionScreenActive === 'function' && isChampionScreenActive());
    if (isChampScreen) {
      if (!illusion.isRika) {
        illusion.vx = (illusion.vx || 0) * 0.96;
        illusion.vy = (illusion.vy || 0) * 0.96;
        illusion.x += illusion.vx;
        illusion.y += illusion.vy;
      }
      const arena = state.arena;
      const minX = arena.x + illusion.r;
      const maxX = arena.x + arena.width - illusion.r;
      const minY = arena.y + illusion.r;
      const maxY = arena.y + arena.height - illusion.r;
      if (illusion.x < minX) { illusion.x = minX; illusion.vx = -illusion.vx * 0.5; }
      if (illusion.x > maxX) { illusion.x = maxX; illusion.vx = -illusion.vx * 0.5; }
      if (illusion.y < minY) { illusion.y = minY; illusion.vy = -illusion.vy * 0.5; }
      if (illusion.y > maxY) { illusion.y = maxY; illusion.vy = -illusion.vy * 0.5; }
      continue;
    }

    // MANDATORY RULE 1: TimeStop & HitStun Freeze Guard
    if (illusion.timeStopTimer > 0) {
      illusion.timeStopTimer--;
      illusion.vx = 0;
      illusion.vy = 0;
      continue; // Stop update and attack execution so illusion is completely frozen!
    }
    if (illusion.hitStunTimer > 0) {
      illusion.hitStunTimer--;
      illusion.vx = 0;
      illusion.vy = 0;
      continue;
    }

    // Check if inside a Cronos sphere - freeze movement if so
    let insideSphere = false;
    for (const fighter of state.fighters) {
      if (!fighter || !fighter.sphereActive) continue;
      const dx = illusion.x - fighter.sphereX;
      const dy = illusion.y - fighter.sphereY;
      const radius = CONFIG.cronos.sphereRadius;
      if ((dx * dx + dy * dy) <= radius * radius) {
        insideSphere = true;
        break;
      }
    }

    // Apply velocity - illusions bounce naturally off walls (frozen inside sphere)
    if (!insideSphere) {
      // Process universal knockback
      if (illusion.knockbackVx !== undefined && (Math.abs(illusion.knockbackVx) > 0.1 || Math.abs(illusion.knockbackVy) > 0.1)) {
        illusion.x += illusion.knockbackVx;
        illusion.y += illusion.knockbackVy;

        illusion.knockbackVx *= 0.85;
        illusion.knockbackVy *= 0.85;

        if (Math.abs(illusion.knockbackVx) <= 0.1) illusion.knockbackVx = 0;
        if (Math.abs(illusion.knockbackVy) <= 0.1) illusion.knockbackVy = 0;
      }

      illusion.animationTime = (illusion.animationTime || 0) + 16.666;

      // Wake up illusions if they were frozen by an ambush and are now free
      if (!illusion.isTargetOfAmbush && illusion.vx === 0 && illusion.vy === 0 && !illusion.isRika) {
        const randomAngle = Math.random() * Math.PI * 2;
        illusion.vx = Math.cos(randomAngle);
        illusion.vy = Math.sin(randomAngle);
      }

      // Only apply base movement if not being heavily knocked back
      const isKnockedBack = illusion.knockbackVx !== undefined && (Math.abs(illusion.knockbackVx) > 2 || Math.abs(illusion.knockbackVy) > 2);
      if (!isKnockedBack && !illusion.isRika) { // Rika handles her own movement
        // Freeze movement if currently targeted by ambush
        if (illusion.isTargetOfAmbush) {
          illusion.vx = 0;
          illusion.vy = 0;
        } else {
          illusion.x += illusion.vx;
          illusion.y += illusion.vy;
        }
      }

      // Normalize speed every frame to match owner's movement speed
      const speedSq = illusion.vx * illusion.vx + illusion.vy * illusion.vy;
      let targetSpeed = (illusion.owner && illusion.owner.hp > 0 ? illusion.owner.speed : null)
        || illusion.moveSpeed || 1.5;
      if (illusion.slowTimer !== undefined && illusion.slowTimer > 0) {
        illusion.slowTimer--;
        targetSpeed *= (illusion.slowMultiplier || 0.5);
      }
      if (speedSq > 0) {
        const scale = targetSpeed / Math.sqrt(speedSq);
        illusion.vx *= scale;
        illusion.vy *= scale;
      }
    }

    // OPTIMIZED: Use spatial grid for collision detection
    const nearbyEntities = spatialGrid.getNearby(illusion.x, illusion.y, illusion.r * 2 + 50);

    // Check collision with fighters and bump them
    for (const entity of nearbyEntities) {
      if (!entity || entity === illusion) continue;
      if (entity.isIllusion) continue; // Skip illusions here, handled separately
      if (!entity.hp || entity.hp <= 0) continue;
      // Cronos phases through illusions while inside his own sphere
      if (entity._isInsideOwnSphere?.()) continue;

      const dx = illusion.x - entity.x;
      const dy = illusion.y - entity.y;
      const minDist = illusion.r + entity.r;

      // Bounding box culling
      if (Math.abs(dx) > minDist || Math.abs(dy) > minDist) continue;

      const distSq = dx * dx + dy * dy;
      if (distSq < minDist * minDist && distSq > 0) {
        const dist = Math.sqrt(distSq);
        // Bump illusion away from fighter
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;

        illusion.x += nx * overlap * 0.5;
        illusion.y += ny * overlap * 0.5;

        // Bounce velocity
        const dotProduct = illusion.vx * nx + illusion.vy * ny;
        illusion.vx -= 2 * dotProduct * nx;
        illusion.vy -= 2 * dotProduct * ny;
      }
    }

    // Check collision with other illusions (only check nearby)
    for (const entity of nearbyEntities) {
      if (!entity || entity === illusion) continue;
      if (!entity.isIllusion) continue; // Skip fighters here
      if (!entity.hp || entity.hp <= 0) continue;

      const dx = illusion.x - entity.x;
      const dy = illusion.y - entity.y;
      const minDist = illusion.r + entity.r;

      // Bounding box culling
      if (Math.abs(dx) > minDist || Math.abs(dy) > minDist) continue;

      const distSq = dx * dx + dy * dy;
      if (distSq < minDist * minDist && distSq > 0) {
        const dist = Math.sqrt(distSq);
        // Bump illusions away from each other
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;

        illusion.x += nx * overlap * 0.5;
        illusion.y += ny * overlap * 0.5;
        entity.x -= nx * overlap * 0.5;
        entity.y -= ny * overlap * 0.5;

        // Bounce velocity for both illusions
        const dotProduct = illusion.vx * nx + illusion.vy * ny;
        illusion.vx -= 2 * dotProduct * nx;
        illusion.vy -= 2 * dotProduct * ny;

        const otherDotProduct = entity.vx * nx + entity.vy * ny;
        entity.vx -= 2 * otherDotProduct * nx;
        entity.vy -= 2 * otherDotProduct * ny;
      }
    }

    // Wall bounce for illusions - auto-lock onto nearest target upon bounce
    const arena = CONFIG.arena;
    let bounced = false;

    if (illusion.x - illusion.r < arena.x) {
      illusion.x = arena.x + illusion.r;
      bounced = true;
    } else if (illusion.x + illusion.r > arena.x + arena.width) {
      illusion.x = arena.x + arena.width - illusion.r;
      bounced = true;
    }
    if (illusion.y - illusion.r < arena.y) {
      illusion.y = arena.y + illusion.r;
      bounced = true;
    } else if (illusion.y + illusion.r > arena.y + arena.height) {
      illusion.y = arena.y + arena.height - illusion.r;
      bounced = true;
    }

    // Auto-aim at nearest target (excluding owner) - only if not frozen in sphere
    let nearestTarget = null;
    if (!insideSphere) {
      let nearestDist = Infinity;
      const isTargetValid = (entity) => {
        if (!entity || !entity.hp || entity.hp <= 0) return false;
        if (entity === illusion) return false;
        
        const targetOwner = entity.isIllusion ? entity.owner : entity;
        if (!targetOwner || targetOwner === illusion.owner) return false;
        
        if ((state.mode === '2v2' || state.mode === '1v2 Stand Off') && illusion.owner) {
          const entityTeam = state.getFighterTeam(state.fighters.indexOf(targetOwner));
          const ownerTeam = state.getFighterTeam(state.fighters.indexOf(illusion.owner));
          if (entityTeam !== null && entityTeam === ownerTeam) return false;
        }
        return true;
      };

      // OPTIMIZED: Only check nearby fighters instead of all fighters
      for (const entity of nearbyEntities) {
        if (!isTargetValid(entity)) continue;
        const dx = entity.x - illusion.x;
        const dy = entity.y - illusion.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < nearestDist) {
          nearestDist = dSq;
          nearestTarget = entity;
        }
      }
      // Fallback: if no nearby targets, check all fighters
      if (!nearestTarget) {
        for (const fighter of state.fighters) {
          if (!isTargetValid(fighter)) continue;
          const dx = fighter.x - illusion.x;
          const dy = fighter.y - illusion.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < nearestDist) {
            nearestDist = dSq;
            nearestTarget = fighter;
          }
        }
      }
      if (nearestTarget) {
        illusion.gunAngle = Math.atan2(nearestTarget.y - illusion.y, nearestTarget.x - illusion.x);
      }
    }

    // If bounded, steer directly towards the nearest target
    if (bounced) {
      const targetSpeed = (illusion.owner && illusion.owner.hp > 0 ? illusion.owner.speed : null) || illusion.moveSpeed || 1.5;
      if (nearestTarget && !insideSphere) {
        const dx = nearestTarget.x - illusion.x;
        const dy = nearestTarget.y - illusion.y;
        const dSq = dx * dx + dy * dy;
        const scale = targetSpeed / (dSq > 0 ? Math.sqrt(dSq) : 1);
        illusion.vx = dx * scale;
        illusion.vy = dy * scale;
      } else {
        // Fallback if no target exists
        const speedSq = illusion.vx * illusion.vx + illusion.vy * illusion.vy;
        const scale = targetSpeed / (speedSq > 0 ? Math.sqrt(speedSq) : 1);
        illusion.vx = -illusion.vx * scale;
        illusion.vy = -illusion.vy * scale;
      }
    }

    // Sword swing cooldown
    if (illusion.swordCooldown > 0) {
      illusion.swordCooldown--;
    }

    // Sword swing animation timer
    if (illusion.swordSwingActive) {
      illusion.swordSwingTimer--;
      if (illusion.swordSwingTimer <= 0) {
        illusion.swordSwingActive = false;
      }
    }

    // Skip attack if frozen inside Cronos sphere
    if (insideSphere) continue;

    // Try to attack nearby fighters (independent targeting, not following owner)
    for (const entity of nearbyEntities) {
      if (!entity || !entity.hp || entity.hp <= 0) continue;
      if (entity === illusion) continue;
      
      const targetOwner = entity.isIllusion ? entity.owner : entity;
      if (!targetOwner || targetOwner === illusion.owner) continue;

      if ((state.mode === '2v2' || state.mode === '1v2 Stand Off') && illusion.owner) {
        const entityTeam = state.getFighterTeam(state.fighters.indexOf(targetOwner));
        const ownerTeam = state.getFighterTeam(state.fighters.indexOf(illusion.owner));
        if (entityTeam !== null && entityTeam === ownerTeam) continue;
      }
      if (entity.invincibilityTimer > 0 || entity.flashStepTimer > 0) continue;

      const dx = entity.x - illusion.x;
      const dy = entity.y - illusion.y;
      const maxAttackRange = illusion.r + entity.r + CONFIG.doppleganger.swordRange;
      if ((dx * dx + dy * dy) <= maxAttackRange * maxAttackRange && illusion.swordCooldown === 0) {
        // Attack!
        illusion.swordSwingAngle = Math.atan2(entity.y - illusion.y, entity.x - illusion.x);
        illusion.swordSwingActive = true;
        illusion.swordSwingTimer = CONFIG.doppleganger.swordSwingDuration;
        illusion.swordCooldown = CONFIG.doppleganger.swordCooldown;
        entity.takeDamage(illusion.damage, illusion.owner || illusion, { isMelee: true });
        spawnFloatingText(entity.x, entity.y - entity.r - 5, 'ILLUSION SLASH!', '#9b59b6');
        break;
      }
    }
  }
}
