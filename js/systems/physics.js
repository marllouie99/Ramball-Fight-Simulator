// ─────────────────────────────────────────────
// FIGHTER COLLISION
// ─────────────────────────────────────────────
import { CONFIG, FIGHTER_DEFS } from '../core/config.js';
import { GAME_MODES } from '../core/modeConfig.js';
import { projectileSystem } from './projectileSystem.js';
import { state, spawnFloatingText, recordWin, recordLoss, createFighterInstance } from '../core/state.js';
import { stopAllLoopingSounds, stopAllSounds } from './soundSystem.js';
import { spawnIllusionDeath } from '../graphics/particles/illusionDeathEffect.js';

// ─────────────────────────────────────────────
// SPATIAL PARTITIONING GRID
// ─────────────────────────────────────────────
class SpatialGrid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  clear() {
    this.grid.clear();
  }

  getKey(x, y) {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  insert(entity) {
    const key = this.getKey(entity.x, entity.y);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key).push(entity);
  }

  getNearby(x, y, radius) {
    const nearby = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const cell = this.grid.get(key);
        if (cell) {
          nearby.push(...cell);
        }
      }
    }
    return nearby;
  }
}

const spatialGrid = new SpatialGrid(100);

// Export spatial grid for use in other systems (e.g., projectile collision optimization)
export { spatialGrid };

// ─────────────────────────────────────────────
// DOPPELGANGER ILLUSION ALIVE CHECK
// ─────────────────────────────────────────────

/**
 * Returns true if the fighter should be considered "in play" for round-end purposes.
 * A Doppelganger with living illusions counts as effectively alive even if its own HP is 0.
 */
export function isFighterEffectivelyAlive(fighter) {
  if (!fighter) return false;
  if (fighter.hp > 0) return true;
  // Dead doppelganger with surviving illusions is still in play
  if (fighter._def && fighter._def.type === 'doppleganger') {
    return state.illusions.some(ill => ill.owner === fighter && ill.hp > 0);
  }
  return false;
}

// ─────────────────────────────────────────────
// FUEL PICKUP SYSTEM
// ─────────────────────────────────────────────

/**
 * Spawns a fuel pickup at a random position within the arena.
 */
export function spawnFuelPickup() {
  const arena = CONFIG.arena;
  const padding = 30;
  const x = arena.x + padding + Math.random() * (arena.width - padding * 2);
  const y = arena.y + padding + Math.random() * (arena.height - padding * 2);

  state.fuelPickups.push({
    x,
    y,
    radius: CONFIG.orange.fuelPickupRadius,
    respawnTimer: 0,
    active: true,
    pulsePhase: Math.random() * Math.PI * 2,
  });
}

/**
 * Updates illusions (for Doppleganger fighter).
 * Illusions have independent wandering movement and only disappear when HP reaches 0.
 */
export function updateIllusions() {
  if (state.gameState !== 'playing' && state.gameState !== 'roundEnd') return;

  // Build spatial grid for optimized collision detection
  spatialGrid.clear();
  for (const illusion of state.illusions) {
    if (illusion.hp > 0) {
      spatialGrid.insert(illusion);
    }
  }
  for (const fighter of state.fighters) {
    if (fighter && fighter.hp > 0) {
      spatialGrid.insert(fighter);
    }
  }

  for (let i = state.illusions.length - 1; i >= 0; i--) {
    const illusion = state.illusions[i];

    // Illusions only disappear when they die (HP <= 0), not by duration
    if (illusion.hp <= 0) {
      spawnIllusionDeath(illusion); // Spawn ethereal death effect
      // High-performance swap-and-pop array cleanup instead of splice
      state.illusions[i] = state.illusions[state.illusions.length - 1];
      state.illusions.pop();
      spawnFloatingText(illusion.x, illusion.y - illusion.r - 10, 'ILLUSION SHATTERED!', '#9b59b6');
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

      // Only apply base movement if not being heavily knocked back
      const isKnockedBack = illusion.knockbackVx !== undefined && (Math.abs(illusion.knockbackVx) > 2 || Math.abs(illusion.knockbackVy) > 2);
      if (!isKnockedBack) {
        illusion.x += illusion.vx;
        illusion.y += illusion.vy;
      }

      // Normalize speed every frame to match owner's movement speed
      const speedSq = illusion.vx * illusion.vx + illusion.vy * illusion.vy;
      const targetSpeed = (illusion.owner && illusion.owner.hp > 0 ? illusion.owner.speed : null)
        || illusion.moveSpeed || 1.5;
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
      // OPTIMIZED: Only check nearby fighters instead of all fighters
      for (const entity of nearbyEntities) {
        if (!entity || entity.isIllusion || !entity.hp || entity.hp <= 0) continue;
        if (entity === illusion.owner) continue;
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
          if (!fighter || fighter.hp <= 0 || fighter === illusion.owner) continue;
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
    // OPTIMIZED: Only check nearby entities
    for (const entity of nearbyEntities) {
      if (!entity || entity.isIllusion) continue;
      if (!entity.hp || entity.hp <= 0 || entity === illusion.owner) continue;
      if (entity.invincibilityTimer > 0 || entity.flashStepTimer > 0) continue;

      const dx = entity.x - illusion.x;
      const dy = entity.y - illusion.y;
      const maxAttackRange = illusion.r + entity.r + CONFIG.doppleganger.swordRange;
      if ((dx * dx + dy * dy) <= maxAttackRange * maxAttackRange && illusion.swordCooldown === 0) {
        // Attack!
        illusion.swordSwingAngle = Math.atan2(entity.y - illusion.y, entity.x - illusion.x);
        illusion.swordSwingActive = true;
        illusion.swordSwingTimer = CONFIG.doppleganger.swordSwingDuration;
        illusion.swordSwingCooldown = CONFIG.doppleganger.swordCooldown;
        illusion.swordCooldown = CONFIG.doppleganger.swordCooldown;
        entity.takeDamage(illusion.damage, illusion.owner, { isMelee: true });
        spawnFloatingText(entity.x, entity.y - entity.r - 5, 'ILLUSION SLASH!', '#9b59b6');
        break;
      }
    }
  }
}

/**
 * Updates fuel pickups (handles respawning and collision with fighters).
 */
export function updateFuelPickups() {
  if (state.gameState !== 'playing') return;

  // Spawn new fuel pickups periodically
  state.fuelPickupSpawnTimer++;
  if (state.fuelPickupSpawnTimer >= CONFIG.orange.fuelPickupSpawnInterval) {
    state.fuelPickupSpawnTimer = 0;

    // Only spawn if we haven't reached max pickups
    const activePickups = state.fuelPickups.filter(p => p.active).length;
    if (activePickups < CONFIG.orange.maxFuelPickups) {
      spawnFuelPickup();
    }
  }

  // Update existing pickups
  for (let i = state.fuelPickups.length - 1; i >= 0; i--) {
    const pickup = state.fuelPickups[i];

    if (!pickup.active) {
      pickup.respawnTimer--;
      if (pickup.respawnTimer <= 0) {
        pickup.active = true;
        pickup.x = CONFIG.arena.x + 30 + Math.random() * (CONFIG.arena.width - 60);
        pickup.y = CONFIG.arena.y + 30 + Math.random() * (CONFIG.arena.height - 60);
      }
      continue;
    }

    // Check collision with Orange fighters (fuel should only exist in arena when Orange is present)
    const hasOrange = state.fighters.some(f => f && f.hp > 0 && f._def.type === 'orange');
    if (!hasOrange) {
      pickup.active = false;
      continue;
    }

    for (const fighter of state.fighters) {
      if (!fighter || fighter.hp <= 0 || fighter._def.type !== 'orange') continue;


      const dist = Math.hypot(fighter.x - pickup.x, fighter.y - pickup.y);
      if (dist < fighter.r + pickup.radius) {
        // Pickup collected
        const fuelAmount = CONFIG.orange.fuelPickupAmount;
        fighter.fuel = Math.min(CONFIG.orange.maxFuel, fighter.fuel + fuelAmount);
        spawnFloatingText(fighter.x, fighter.y - fighter.r - 10, `+${fuelAmount} FUEL`, '#ff6600');

        // Deactivate pickup and start respawn timer
        pickup.active = false;
        pickup.respawnTimer = CONFIG.orange.fuelPickupRespawnTime;
        break;
      }
    }

    // Update pulse animation
    pickup.pulsePhase += 0.1;
  }
}

/**
 * Resolves an elastic collision between two fighters.
 * Separates overlapping circles and applies impulse along the collision normal.
 */
export function resolveFighterCollision(a, b) {
  // Guard: ensure both fighters exist
  if (!a || !b) return;

  // Cronos phases through fighters while inside his own sphere
  const aPhases = a._isInsideOwnSphere?.() ?? false;
  const bPhases = b._isInsideOwnSphere?.() ?? false;
  if (aPhases || bPhases) return;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distSq = dx * dx + dy * dy;
  const minDist = a.r + b.r;
  const minDistSq = minDist * minDist;

  if (distSq >= minDistSq) return;
  const distance = Math.sqrt(distSq);

  // Collision hooks (for contact damage, etc.)
  a.onCollide(b);
  b.onCollide(a);

  // Burn spread: if one fighter is burning and the other is not (and cooldown allows)
  if (a.burnTimer > 0 && b.burnTimer === 0 && a.burnSpreadCooldown === 0) {
    b.applyBurn(a);
    a.burnSpreadCooldown = CONFIG.orange.burnSpreadCooldown;
    spawnFloatingText(b.x, b.y - b.r - 8, 'BURN SPREAD!', '#ff6600');
  }
  if (b.burnTimer > 0 && a.burnTimer === 0 && b.burnSpreadCooldown === 0) {
    a.applyBurn(b);
    b.burnSpreadCooldown = CONFIG.orange.burnSpreadCooldown;
    spawnFloatingText(a.x, a.y - a.r - 8, 'BURN SPREAD!', '#ff6600');
  }

  // Collision normal (unit vector from a → b)
  const nx = distance > 0 ? dx / distance : 1;
  const ny = distance > 0 ? dy / distance : 0;

  // Tangent vector (perpendicular to the collision normal)
  const tx = -ny;
  const ty = nx;

  const overlap = (minDist - distance) / 2;
  if (a.isTurret || b.isTurret) {
    if (a.isTurret && !b.isTurret) {
      b.x += nx * overlap * 2;
      b.y += ny * overlap * 2;
    } else if (b.isTurret && !a.isTurret) {
      a.x -= nx * overlap * 2;
      a.y -= ny * overlap * 2;
    }
  } else if (!a.isTurret && !b.isTurret) {
    a.x -= nx * overlap;
    a.y -= ny * overlap;
    b.x += nx * overlap;
    b.y += ny * overlap;
  }

  // Only apply impulse if fighters are moving toward each other
  const dvx = b.vx - a.vx;
  const dvy = b.vy - a.vy;
  const dotN = dvx * nx + dvy * ny;
  if (dotN >= 0) return;

  // Laser slow should feel like a drag, not a push.
  // When either fighter is slowed, damp the collision impulse heavily.
  const slowActive = (a.slowTimer > 0) || (b.slowTimer > 0);

  const { restitution } = CONFIG.collision;
  const rawImpulse = -(1 + restitution) * dotN / 2;
  const impulse = slowActive ? rawImpulse * 0.15 : rawImpulse;

  // ── Varied bounce: add random tangent component so fighters don't always
  //    bounce back along the exact collision normal ──────────────────────────
  const tangentStrength = 0.4; // how much perpendicular randomness to add
  const randA = (Math.random() - 0.5) * 2 * tangentStrength;
  const randB = (Math.random() - 0.5) * 2 * tangentStrength;

  if (!a.isTurret) {
    // Fighters in rage or melee mode ignore the bounce impulse so they can stick to their targets
    if (!a.isInRage && !a.isMeleeMode) {
      a.vx -= impulse * nx + randA * impulse * tx;
      a.vy -= impulse * ny + randA * impulse * ty;
    }
    a.normalizeSpeed();
  }
  
  if (!b.isTurret) {
    if (!b.isInRage && !b.isMeleeMode) {
      b.vx += impulse * nx + randB * impulse * tx;
      b.vy += impulse * ny + randB * impulse * ty;
    }
    b.normalizeSpeed();
  }
}

// ─────────────────────────────────────────────
// PROJECTILE UPDATE (main loop step)
// ─────────────────────────────────────────────

export function updateProjectiles() {
  if (projectileSystem) {
    projectileSystem.update(state.fighters);
  }
}

function getClosestOpponent(fighter) {
  let closest = null;
  let bestDistance = Infinity;
  const fighterIndex = state.fighters.indexOf(fighter);
  const fighterTeam = state.getFighterTeam(fighterIndex);

  // Check regular fighters
  state.fighters.forEach((other, otherIndex) => {
    if (!other || other === fighter || other.hp <= 0) return;
    if (other.invincibilityTimer > 0 || other.flashStepTimer > 0) return;
    if (state.mode === GAME_MODES.TWO_VS_TWO && fighterTeam !== null && state.getFighterTeam(otherIndex) === fighterTeam) return;
    
    // Ignore summoned entities (Turrets, etc) belonging to this fighter, and vice versa
    if (other.owner === fighter || fighter.owner === other) return;
    if (other.owner && other.owner === fighter.owner) return; // Same owner

    const dx = other.x - fighter.x;
    const dy = other.y - fighter.y;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestDistance) {
      bestDistance = dSq;
      closest = other;
    }
  });

  // Also check illusions - they are valid targets (but not the fighter's own illusions)
  for (const illusion of state.illusions || []) {
    if (!illusion || illusion.hp <= 0) continue;
    // Skip if this illusion belongs to the fighter (Doppleganger shouldn't target own illusions)
    if (illusion.owner === fighter) continue;
    const dx = illusion.x - fighter.x;
    const dy = illusion.y - fighter.y;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestDistance) {
      bestDistance = dSq;
      closest = illusion;
    }
  }

  return closest;
}

function endRoundIfFFAEnded() {
  if (state.mode !== GAME_MODES.FFA || state.gameState !== 'playing') return;

  const effectivelyAlive = state.fighters.filter((f) => isFighterEffectivelyAlive(f));
  if (effectivelyAlive.length > 1) return;

  const winner = effectivelyAlive[0] || null;
  state.roundWinner = winner;
  state.roundEndTimer = 0;

  // Stop all sounds when round ends
  stopAllSounds();
  stopAllLoopingSounds();

  if (winner) {
    const winnerIndex = state.fighters.indexOf(winner);
    if (winnerIndex >= 0) {
      state.scores[winnerIndex]++;
      const winThreshold = 2;
      if (state.scores[winnerIndex] >= winThreshold) {
        state.ffaMatchComplete = true;
      }
    }
  }

  state.gameState = 'roundEnd';
}

function endRoundIf2v2Ended() {
  if (state.mode !== GAME_MODES.TWO_VS_TWO || state.gameState !== 'playing') return;

  const team0Alive = isFighterEffectivelyAlive(state.fighters[0]) || isFighterEffectivelyAlive(state.fighters[1]);
  const team1Alive = isFighterEffectivelyAlive(state.fighters[2]) || isFighterEffectivelyAlive(state.fighters[3]);

  // Round ends when one team is eliminated (including all illusions)
  if (team0Alive && team1Alive) return;

  const winningTeam = team0Alive ? 0 : 1;
  state.teamScores[winningTeam]++;
  state.roundWinner = state.fighters[winningTeam * 2];
  state.roundEndTimer = 0;

  // Stop all sounds when round ends
  stopAllSounds();
  stopAllLoopingSounds();

  const winThreshold = 2;
  if (state.teamScores[winningTeam] >= winThreshold) {
    state.matchWinner = state.fighters[winningTeam * 2];
    state.matchEndTimer = 0;
    state.gameState = 'matchEnd';
  } else {
    state.gameState = 'roundEnd';
  }
}

function endRoundIf1v1Ended() {
  if (state.mode !== GAME_MODES.ONE_VS_ONE || state.gameState !== 'playing') return;

  const effectivelyAlive = state.fighters.filter((f) => f && isFighterEffectivelyAlive(f));
  if (effectivelyAlive.length > 1) return;

  const winner = effectivelyAlive[0] || null;
  state.roundWinner = winner;
  state.roundEndTimer = 0;

  // Stop all sounds when round ends
  stopAllSounds();
  stopAllLoopingSounds();

  if (winner) {
    const winnerIndex = state.fighters.indexOf(winner);
    if (winnerIndex >= 0) {
      state.scores[winnerIndex]++;
      const winThreshold = 2;

      const loserIndex = winnerIndex === 0 ? 1 : 0;
      const winnerFighterIndex = typeof winner.fighterIndex === 'number' ? winner.fighterIndex : winnerIndex;
      const loserFighterIndex = typeof state.fighters[loserIndex]?.fighterIndex === 'number'
        ? state.fighters[loserIndex].fighterIndex
        : loserIndex;

      if (state.scores[winnerIndex] >= winThreshold) {
        // Record a win/loss for the resolved 1v1 match so the
        // leaderboard updates when a decisive match completes.
        recordWin(winnerFighterIndex);
        recordLoss(loserFighterIndex);

        state.matchWinner = winner;
        state.matchEndTimer = 0;
        state.gameState = 'matchEnd';
      } else {
        state.gameState = 'roundEnd';
      }
    }
  } else {
    // Both dead (including all illusions) - draw, end round without winner
    state.gameState = 'roundEnd';
  }
}

function endRoundIfTlfsEnded() {
  if (state.mode !== 'TLFS' || state.gameState !== 'playing') return;

  const player = state.fighters[0];
  let enemy = state.fighters[1];

  if (!player || player.hp <= 0) {
    // Player died - show Champion Screen
    state.matchWinner = enemy;
    state.matchEndTimer = 0;
    state.gameState = 'matchEnd';
    return;
  }

  // Check if enemy died
  if (enemy && enemy.hp <= 0) {
    // Enemy died - increment defeated count
    state.tlfsDefeatedEnemies = (state.tlfsDefeatedEnemies || 0) + 1;

    if (state.tlfsDefeatedEnemies >= 5) {
      // Player won the gauntlet
      state.matchWinner = player;
      state.matchEndTimer = 0;
      state.gameState = 'matchEnd';
      
      // Stop sounds
      stopAllSounds();
      stopAllLoopingSounds();
    } else {
      // Clean up dead enemy so they don't interact while we wait for next tick?
      // Actually, we can just instantly spawn a new one in their place!
      let nextEnemyIndex = 1; // fallback
      if (state.tlfsAllowedEnemies && state.tlfsAllowedEnemies.length > 0) {
        nextEnemyIndex = state.tlfsAllowedEnemies[Math.floor(Math.random() * state.tlfsAllowedEnemies.length)];
      }

      state.p2Index = nextEnemyIndex;
      const newEnemy = createFighterInstance(FIGHTER_DEFS[nextEnemyIndex], nextEnemyIndex);
      if (newEnemy) {
        newEnemy.reset();
        
        // Spawn them on the right side
        const arena = state.arena;
        newEnemy.x = arena.x + arena.width * 0.75;
        newEnemy.y = arena.y + arena.height * 0.5;
        newEnemy.angle = Math.PI;
        newEnemy.gunAngle = Math.PI;
        newEnemy.rightGunAngle = Math.PI;
        newEnemy.leftGunAngle = Math.PI;
        newEnemy.vx = -newEnemy.speed;
        newEnemy.vy = 0;

        // Replace the old enemy
        state.fighters[1] = newEnemy;
        
        // Spawn "NEXT FIGHTER!" text
        spawnFloatingText(newEnemy.x, newEnemy.y - newEnemy.r - 20, 'NEW CHALLENGER!', '#ff4d4d');
      }
    }
  }
}

// ─────────────────────────────────────────────
// FIGHTER UPDATE (main loop step)
// ─────────────────────────────────────────────

export function updateFighters() {
  // During countdown, only update visual effects but don't allow movement
  if (state.gameState === 'countdown') {
    // Keep bodies upright and update gun angles for all fighters so they face opponents during countdown
    state.fighters.forEach((fighter) => {
      if (!fighter || fighter.hp <= 0) return;
      const opponent = getClosestOpponent(fighter);
      if (opponent) {
        fighter.aim(opponent, null);
      }
    });
    // Still update fuel pickups for visual pulsing during countdown
    updateFuelPickups();
    return;
  }

  // Continue movement during roundEnd for visual effect
  if (state.gameState === 'roundEnd' || state.gameState === 'playing') {
    state.fighters.forEach((fighter, fi) => {
      if (!fighter) return;
      if (fighter.hp <= 0) {
        if (typeof fighter._healthBarShakeTimer === 'number' && fighter._healthBarShakeTimer > 0) {
          fighter._healthBarShakeTimer--;
        }
        return;
      }
      // Black hole shrinking visual logic - applied globally so custom fighters don't miss it
      if (fighter.visualScale === undefined) fighter.visualScale = 1.0;
      if (fighter.visualScaleTarget === undefined) fighter.visualScaleTarget = 1.0;

      const shrinkSpeed = CONFIG.black?.blackHoleVisualShrinkSpeed ?? 0.05;
      if (Math.abs(fighter.visualScale - fighter.visualScaleTarget) > 0.01) {
        fighter.visualScale += (fighter.visualScaleTarget - fighter.visualScale) * shrinkSpeed;
      } else {
        fighter.visualScale = fighter.visualScaleTarget;
      }
      // Reset target to 1.0; projectile system will lower it if currently inside a black hole
      fighter.visualScaleTarget = 1.0;

      const opponent = getClosestOpponent(fighter);
      let effectiveOpponent = opponent;
      // If the target is Musashi and he is flurrying, delay enemy reaction time by making them target his ghost trail
      if (opponent && opponent.type === 'musashi' && opponent.flurryHitsLeft > 0 && opponent.flurryGhost) {
         effectiveOpponent = new Proxy(opponent, {
            get(target, prop) {
               if (prop === 'x') return target.flurryGhost.x;
               if (prop === 'y') return target.flurryGhost.y;
               const value = target[prop];
               return typeof value === 'function' ? value.bind(target) : value;
            }
         });
      }
      fighter.update(effectiveOpponent, fi, state.arena);
    });

    // OPTIMIZED: Use spatial grid for fighter-fighter collisions
    spatialGrid.clear();
    for (const fighter of state.fighters) {
      if (fighter && fighter.hp > 0) {
        spatialGrid.insert(fighter);
      }
    }

    for (let i = 0; i < state.fighters.length; i++) {
      const a = state.fighters[i];
      if (!a || a.hp <= 0) continue;

      const nearbyFighters = spatialGrid.getNearby(a.x, a.y, a.r * 2 + 50);
      for (const b of nearbyFighters) {
        const j = state.fighters.indexOf(b);
        if (j <= i) continue; // Only check each pair once
        if (!b || b.hp <= 0) continue;
        // Skip teammates in 2v2 mode
        if (state.mode === GAME_MODES.TWO_VS_TWO && state.getFighterTeam(i) === state.getFighterTeam(j)) continue;
        resolveFighterCollision(a, b);
      }
    }

    // OPTIMIZED: Check collisions between fighters and illusions using spatial grid
    // Rebuild spatial grid with both fighters and illusions
    spatialGrid.clear();
    for (const fighter of state.fighters) {
      if (fighter && fighter.hp > 0) {
        spatialGrid.insert(fighter);
      }
    }
    for (const illusion of state.illusions) {
      if (illusion && illusion.hp > 0) {
        spatialGrid.insert(illusion);
      }
    }

    for (const fighter of state.fighters) {
      if (!fighter || fighter.hp <= 0) continue;
      // Cronos phases through illusions while inside his own sphere
      if (fighter._isInsideOwnSphere?.()) continue;

      const nearbyEntities = spatialGrid.getNearby(fighter.x, fighter.y, fighter.r * 2 + 50);
      for (const entity of nearbyEntities) {
        if (!entity || entity === fighter) continue;
        if (!entity.isIllusion) continue; // Skip fighter-fighter collisions (already handled)
        if (!entity.hp || entity.hp <= 0) continue;

        const dx = entity.x - fighter.x;
        const dy = entity.y - fighter.y;
        const minDist = entity.r + fighter.r;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDist * minDist && distSq > 0) {
          const dist = Math.sqrt(distSq);
          // Collision detected - trigger onCollide for the fighter
          fighter.onCollide(entity);

          // Push them apart
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;
          fighter.x -= nx * overlap * 0.5;
          fighter.y -= ny * overlap * 0.5;
          entity.x += nx * overlap * 0.5;
          entity.y += ny * overlap * 0.5;
        }
      }
    }

    updateFuelPickups();
    updateIllusions();
  }

  if (state.gameState === 'playing') {
    endRoundIfFFAEnded();
    endRoundIf2v2Ended();
    endRoundIf1v1Ended();
    endRoundIfTlfsEnded();
  }
}
