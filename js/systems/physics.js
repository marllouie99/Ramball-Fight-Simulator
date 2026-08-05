// ─────────────────────────────────────────────
// FIGHTER COLLISION
// ─────────────────────────────────────────────
import { CONFIG, FIGHTER_DEFS } from '../core/config.js';
import { GAME_MODES, MODE_SETTINGS } from '../core/modeConfig.js';
import { projectileSystem } from './projectileSystem.js';
import { state, spawnFloatingText, recordWin, recordLoss, createFighterInstance } from '../core/state.js';
import { stopAllLoopingSounds, stopAllSounds } from './soundSystem.js';
import { spawnIllusionDeath } from '../graphics/particles/illusionDeathEffect.js';
import { updateIllusions } from './illusionSystem.js';

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
    const cellX = (x / this.cellSize) | 0;
    const cellY = (y / this.cellSize) | 0;
    return (((cellX + 2000) & 0xFFFF) << 16) | ((cellY + 2000) & 0xFFFF);
  }

  insert(entity) {
    const key = this.getKey(entity.x, entity.y);
    let cell = this.grid.get(key);
    if (!cell) {
      cell = [];
      this.grid.set(key, cell);
    }
    cell.push(entity);
  }

  getNearby(x, y, radius) {
    const nearby = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const cellX = (x / this.cellSize) | 0;
    const cellY = (y / this.cellSize) | 0;

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = ((((cellX + dx) + 2000) & 0xFFFF) << 16) | (((cellY + dy) + 2000) & 0xFFFF);
        const cell = this.grid.get(key);
        if (cell) {
          for (let i = 0, len = cell.length; i < len; i++) {
            nearby.push(cell[i]);
          }
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
  const isDoppel = fighter.type === 'doppleganger' || fighter._def?.type === 'doppleganger' || fighter.characterId === 'doppleganger';
  if (isDoppel) {
    return state.illusions && state.illusions.some(ill => ill && ill.owner === fighter && ill.hp > 0);
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

  // Toji phases through fighters during his Ultimate sequence (ethereal assassin)
  if (a.ultimateActive && (a.name === 'Toji Fushiguro' || a.id === 'toji')) return;
  if (b.ultimateActive && (b.name === 'Toji Fushiguro' || b.id === 'toji')) return;

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
  
  const aIsGojoDomain = a.domainActive && a._def?.id === 'gojo';
  const bIsGojoDomain = b.domainActive && b._def?.id === 'gojo';
  
  const teamA = state.getFighterTeam(state.fighters.indexOf(a));
  const teamB = state.getFighterTeam(state.fighters.indexOf(b));
  const isEnemy = teamA === null || teamB === null || teamA !== teamB;

  const aIsImmovable = a.isTurret || (bIsGojoDomain && isEnemy);
  const bIsImmovable = b.isTurret || (aIsGojoDomain && isEnemy);

  const isTodoCombo = (a.rockCounterComboLeft > 0) || (b.rockCounterComboLeft > 0);
  const effectiveOverlap = isTodoCombo ? overlap * 0.1 : overlap;

  if (aIsImmovable || bIsImmovable) {
    if (aIsImmovable && !bIsImmovable) {
      b.x += nx * effectiveOverlap * 2;
      b.y += ny * effectiveOverlap * 2;
    } else if (bIsImmovable && !aIsImmovable) {
      a.x -= nx * effectiveOverlap * 2;
      a.y -= ny * effectiveOverlap * 2;
    }
  } else {
    a.x -= nx * effectiveOverlap;
    a.y -= ny * effectiveOverlap;
    b.x += nx * effectiveOverlap;
    b.y += ny * effectiveOverlap;
  }

  // Force both fighters to stay within the arena immediately after collision push
  if (state && state.arena) {
    if (typeof a.resolveWallBounce === 'function') a.resolveWallBounce(state.arena);
    if (typeof b.resolveWallBounce === 'function') b.resolveWallBounce(state.arena);
  }

  // Only apply impulse if fighters are moving toward each other
  const dvx = b.vx - a.vx;
  const dvy = b.vy - a.vy;
  const dotN = dvx * nx + dvy * ny;
  if (dotN >= 0) return;

  // Prevent bounce response while Todo is delivering his combo so they don't bounce apart
  if ((a.rockCounterComboLeft > 0) || (b.rockCounterComboLeft > 0)) return;

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
    if ((state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.STAND_OFF_1V2) && fighterTeam !== null && state.getFighterTeam(otherIndex) === fighterTeam) return;
    
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
    // Skip if this illusion belongs to a teammate
    if ((state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.STAND_OFF_1V2) && fighterTeam !== null && illusion.owner) {
      const ownerTeam = state.getFighterTeam(state.fighters.indexOf(illusion.owner));
      if (ownerTeam === fighterTeam) continue;
    }
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

  let isMatchEnd = false;
  if (winner) {
    const winnerIndex = state.fighters.indexOf(winner);
    if (winnerIndex >= 0) {
      const winThreshold = 2;
      if (state.scores[winnerIndex] + 1 >= winThreshold) {
        isMatchEnd = true;
      }
    }
  }

  // Stop all sounds when round ends, unless it is a match end (champion screen)
  if (!isMatchEnd) {
    stopAllSounds();
    stopAllLoopingSounds();
  }

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
  if ((state.mode !== GAME_MODES.TWO_VS_TWO && state.mode !== GAME_MODES.STAND_OFF_1V2) || state.gameState !== 'playing') return;

  let team0Alive = false;
  let team1Alive = false;

  if (state.mode === GAME_MODES.STAND_OFF_1V2) {
    team0Alive = isFighterEffectivelyAlive(state.fighters[0]);
    team1Alive = isFighterEffectivelyAlive(state.fighters[1]) || isFighterEffectivelyAlive(state.fighters[2]);
  } else {
    team0Alive = isFighterEffectivelyAlive(state.fighters[0]) || isFighterEffectivelyAlive(state.fighters[1]);
    team1Alive = isFighterEffectivelyAlive(state.fighters[2]) || isFighterEffectivelyAlive(state.fighters[3]);
  }

  // Round ends when one team is eliminated (including all illusions)
  if (team0Alive && team1Alive) return;

  const winningTeam = team0Alive ? 0 : 1;
  state.teamScores[winningTeam]++;
  
  // Find effective winning fighter (alive fighter or fallback)
  const winnerFighter = state.fighters.find((f, idx) => f && isFighterEffectivelyAlive(f) && state.getFighterTeam(idx) === winningTeam)
    || state.fighters.find((f, idx) => f && state.getFighterTeam(idx) === winningTeam)
    || state.fighters[0];

  state.roundWinner = winnerFighter;
  state.roundEndTimer = 0;

  const winThreshold = MODE_SETTINGS[state.mode]?.rounds ?? 2;
  const isMatchEnd = state.teamScores[winningTeam] >= winThreshold;

  // Stop all sounds when round ends, unless it is a match end (champion screen)
  if (!isMatchEnd) {
    stopAllSounds();
    stopAllLoopingSounds();
  }

  if (isMatchEnd) {
    state.matchWinner = winnerFighter;
    state.matchEndTimer = 0;
    state.gameState = 'matchEnd';
  } else {
    state.gameState = 'roundEnd';
  }
}

function endRoundIf1v1Ended() {
  if ((state.mode !== GAME_MODES.ONE_VS_ONE && state.mode !== GAME_MODES.STAND_OFF) || state.gameState !== 'playing') return;

  const effectivelyAlive = state.fighters.filter((f) => f && isFighterEffectivelyAlive(f));
  if (effectivelyAlive.length > 1) return;

  const winner = effectivelyAlive[0] || null;
  state.roundWinner = winner;
  state.roundEndTimer = 0;

  let isMatchEnd = false;
  if (winner) {
    const winnerIndex = state.fighters.indexOf(winner);
    if (winnerIndex >= 0) {
      const winThreshold = MODE_SETTINGS[state.mode]?.rounds === 1 ? 1 : 2;
      if (state.scores[winnerIndex] + 1 >= winThreshold) {
        isMatchEnd = true;
      }
    }
  }

  // Stop all sounds when round ends, unless it is a match end (champion screen)
  if (!isMatchEnd) {
    stopAllSounds();
    stopAllLoopingSounds();
  }

  if (winner) {
    const winnerIndex = state.fighters.indexOf(winner);
    if (winnerIndex >= 0) {
      state.scores[winnerIndex]++;
      const winThreshold = MODE_SETTINGS[state.mode]?.rounds === 1 ? 1 : 2;

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

  // Continue movement during roundEnd and matchEnd for visual effect
  if (state.gameState === 'roundEnd' || state.gameState === 'matchEnd' || state.gameState === 'playing') {
    state.fighters.forEach((fighter, fi) => {
      if (!fighter) return;
      if (fighter.hp <= 0) {
        if (typeof fighter._healthBarShakeTimer === 'number' && fighter._healthBarShakeTimer > 0) {
          fighter._healthBarShakeTimer--;
        }
        return;
      }
      const opponent = getClosestOpponent(fighter);
      fighter.update(opponent, fi, state.arena);
    });

    // OPTIMIZED: Build spatial grid ONCE per frame for ALL entities (fighters + illusions)
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

    // 1. Fighter-Fighter Collisions
    for (let i = 0; i < state.fighters.length; i++) {
      const a = state.fighters[i];
      if (!a || a.hp <= 0) continue;

      const nearbyEntities = spatialGrid.getNearby(a.x, a.y, a.r * 2 + 50);
      for (const b of nearbyEntities) {
        if (b.isIllusion) continue; // Skip illusions in this loop
        const j = state.fighters.indexOf(b);
        if (j <= i) continue; // Only check each pair once
        if (!b || b.hp <= 0) continue;
        // Skip teammates in 2v2 mode
        if ((state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.STAND_OFF_1V2) && state.getFighterTeam(i) === state.getFighterTeam(j)) continue;
        resolveFighterCollision(a, b);
      }
    }

    // 2. Fighter-Illusion Collisions
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
          if (fighter.isTurret) {
            entity.x += nx * overlap;
            entity.y += ny * overlap;
          } else if (entity.isTurret) {
            fighter.x -= nx * overlap;
            fighter.y -= ny * overlap;
          } else {
            fighter.x -= nx * overlap * 0.5;
            fighter.y -= ny * overlap * 0.5;
            entity.x += nx * overlap * 0.5;
            entity.y += ny * overlap * 0.5;
          }
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
