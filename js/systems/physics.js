// ─────────────────────────────────────────────
// FIGHTER COLLISION
// ─────────────────────────────────────────────
import { CONFIG, FIGHTER_DEFS } from '../core/config.js';
import { GAME_MODES, MODE_SETTINGS } from '../core/modeConfig.js';
import { projectileSystem } from './projectileSystem.js';
import { state, spawnFloatingText, recordWin, recordLoss, createFighterInstance, triggerMissionPassedOverlay } from '../core/state.js';
import { stopAllLoopingSounds, stopAllSounds } from './soundSystem.js';
import { audioSystem } from './audioSystem.js';
import { spawnIllusionDeath } from '../graphics/particles/illusionDeathEffect.js';
import { updateIllusions } from './illusionSystem.js';
import { triggerMahitoParalyzeExplosion } from '../entities/fighters/mahito/mahitoCombat.js';
import { spawnMahitoSoulBubbles } from '../graphics/particles/sparkEffect.js';
import { clampRikaToArena } from '../entities/fighters/yuta/rikaLogic.js';

// ─────────────────────────────────────────────
// SPATIAL PARTITIONING GRID
// ─────────────────────────────────────────────
class SpatialGrid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.activeKeys = [];
    this.pool = [];
    this.poolIndex = 0;
  }

  getArray() {
    if (this.poolIndex >= this.pool.length) {
      this.pool.push([]);
    }
    const arr = this.pool[this.poolIndex++];
    arr.length = 0;
    return arr;
  }

  clear() {
    for (let i = 0; i < this.activeKeys.length; i++) {
      const cell = this.grid.get(this.activeKeys[i]);
      if (cell) cell.length = 0;
    }
    this.activeKeys.length = 0;
    this.poolIndex = 0;
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
    if (cell.length === 0) {
      this.activeKeys.push(key);
    }
    cell.push(entity);
  }

  getNearby(x, y, radius) {
    const nearby = this.getArray();
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
  // If an entity is paralyzed by Mahito's Soul Disfigurement build-up, they remain in play until the rupture explosion detonates!
  if (fighter.isParalyzedByMahito && (fighter.paralyzeTimer || 0) > 0) {
    return true;
  }
  if (fighter.hp > 0) return true;
  // Dead doppelganger with surviving illusions is still in play
  const isDoppel = fighter.type === 'doppleganger' || fighter._def?.type === 'doppleganger' || fighter.characterId === 'doppleganger';
  if (isDoppel) {
    return state.illusions && state.illusions.some(ill => ill && ill.owner === fighter && ill.hp > 0);
  }
  const isMahitoEvading = (fighter.characterId === 'mahito' || fighter.type === 'mahito') && fighter.isEvading;
  if (isMahitoEvading) {
    return state.illusions && state.illusions.some(ill => ill && ill.owner === fighter && ill.isEvasionMinion && ill.hp > 0);
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
    let hasOrange = false;
    for (let j = 0; j < state.fighters.length; j++) {
      const f = state.fighters[j];
      if (f && f.hp > 0 && f._def.type === 'orange') {
        hasOrange = true;
        break;
      }
    }
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

  // Mahito phases directly through fighters during Phantom Soul Slip claw dash
  if ((a.soulPhaseDashTimer && a.soulPhaseDashTimer > 0) || (b.soulPhaseDashTimer && b.soulPhaseDashTimer > 0)) return;

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
  const isTodoCombo = (a.rockCounterComboLeft > 0) || (b.rockCounterComboLeft > 0);
  const effectiveOverlap = isTodoCombo ? overlap * 0.1 : overlap;
  
  const aIsGojoDomain = a.domainActive && (a.characterId === 'gojo' || a.type === 'gojo' || a._def?.id === 'gojo');
  const bIsGojoDomain = b.domainActive && (b.characterId === 'gojo' || b.type === 'gojo' || b._def?.id === 'gojo');
  
  const teamA = state.getFighterTeam(a._stateIdx !== undefined ? a._stateIdx : state.fighters.indexOf(a));
  const teamB = state.getFighterTeam(b._stateIdx !== undefined ? b._stateIdx : state.fighters.indexOf(b));
  const isEnemy = teamA === null || teamB === null || teamA !== teamB;

  // Inside Gojo's Unlimited Void domain: The frozen enemy MUST NOT be pushed back on physical contact
  if (aIsGojoDomain && isEnemy) {
    a.x -= nx * effectiveOverlap * 2;
    a.y -= ny * effectiveOverlap * 2;
    if (state && state.arena && typeof a.resolveWallBounce === 'function') a.resolveWallBounce(state.arena);
    return;
  }
  if (bIsGojoDomain && isEnemy) {
    b.x += nx * effectiveOverlap * 2;
    b.y += ny * effectiveOverlap * 2;
    if (state && state.arena && typeof b.resolveWallBounce === 'function') b.resolveWallBounce(state.arena);
    return;
  }

  const aIsFlurrying = a.isFlurrying || b.caughtInGenosFlurry || b.caughtInSaitamaFlurry;
  const bIsFlurrying = b.isFlurrying || a.caughtInGenosFlurry || a.caughtInSaitamaFlurry;

  const aIsYutaBeam = a.isChannelingPureLoveBeam || a.isFiringPureLoveBeam;
  const bIsYutaBeam = b.isChannelingPureLoveBeam || b.isFiringPureLoveBeam;

  const aIsAmbushLocked = a.isTargetOfAmbush || (a._counterPunchTimer && a._counterPunchTimer > 0);
  const bIsAmbushLocked = b.isTargetOfAmbush || (b._counterPunchTimer && b._counterPunchTimer > 0);

  if (aIsAmbushLocked && bIsAmbushLocked) {
    return; // Neither moves or bounces during ambush/counter execution
  }

  const aIsImmovable = a.isTurret || a.isDispenser || aIsFlurrying || aIsYutaBeam || aIsAmbushLocked || (a.fleshSurgeAnimTimer && a.fleshSurgeAnimTimer > 0) || a.isChannelingBankai;
  const bIsImmovable = b.isTurret || b.isDispenser || bIsFlurrying || bIsYutaBeam || bIsAmbushLocked || (b.fleshSurgeAnimTimer && b.fleshSurgeAnimTimer > 0) || b.isChannelingBankai;

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

  // Prevent bounce impulse during ambush/counter execution
  if (aIsAmbushLocked || bIsAmbushLocked) return;

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

  if (!a.isTurret && !a.isDispenser) {
    // Fighters in rage or melee mode ignore the bounce impulse so they can stick to their targets
    if (!a.isInRage && !a.isMeleeMode) {
      a.vx -= impulse * nx + randA * impulse * tx;
      a.vy -= impulse * ny + randA * impulse * ty;
    }
    a.normalizeSpeed();
  }
  
  if (!b.isTurret && !b.isDispenser) {
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
  const fighterIndex = fighter._stateIdx !== undefined ? fighter._stateIdx : state.fighters.indexOf(fighter);
  const fighterTeam = state.getFighterTeam(fighterIndex);
  const isTeamMode = (state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.STAND_OFF_1V2);

  // Check regular fighters
  for (let i = 0; i < state.fighters.length; i++) {
    const other = state.fighters[i];
    if (!other || other === fighter || other.hp <= 0) continue;
    if (isTeamMode && fighterTeam !== null && state.getFighterTeam(i) === fighterTeam) continue;
    
    // Ignore summoned entities (Turrets, etc) belonging to this fighter, and vice versa
    if (other.owner === fighter || fighter.owner === other) continue;
    if (other.owner && other.owner === fighter.owner) continue; // Same owner

    const dx = other.x - fighter.x;
    const dy = other.y - fighter.y;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestDistance) {
      bestDistance = dSq;
      closest = other;
    }
  }

  // Also check illusions - they are valid targets (but not the fighter's own illusions)
  if (state.illusions) {
    for (let i = 0; i < state.illusions.length; i++) {
      const illusion = state.illusions[i];
      if (!illusion || illusion.hp <= 0 || (illusion.vanishTimer && illusion.vanishTimer > 0)) continue;
      // Skip if this illusion belongs to the fighter (Doppleganger shouldn't target own illusions)
      if (illusion.owner === fighter) continue;
      // Skip if this illusion belongs to a teammate
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
    }
  }

  // Also check active Drive-By Car minions - valid enemy minion targets
  if (state.cjDriveBys) {
    for (let i = 0; i < state.cjDriveBys.length; i++) {
      const car = state.cjDriveBys[i];
      if (!car || car.dead || car.hp <= 0 || car.phase === 'WAITING_REENTER') continue;
      // Skip if this car belongs to the fighter or their owner
      if (car.owner === fighter || (fighter.owner && car.owner === fighter.owner)) continue;
      // Skip if this car belongs to a teammate
      if (isTeamMode && fighterTeam !== null && car.owner) {
        const _carOwnerIdx = car.owner._stateIdx !== undefined ? car.owner._stateIdx : state.fighters.indexOf(car.owner);
        const ownerTeam = state.getFighterTeam(_carOwnerIdx);
        if (ownerTeam === fighterTeam) continue;
      }
      const dx = car.x - fighter.x;
      const dy = car.y - fighter.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestDistance) {
        bestDistance = dSq;
        closest = car;
      }
    }
  }

  return closest;
}

function checkCjVictoryOverlay(winner) {
  const cjFighter = state.fighters && state.fighters.find(f => f && (f.characterId === 'cj' || f.type === 'cj' || (f._def && (f._def.id === 'cj' || f._def.type === 'cj'))));
  if (!cjFighter || cjFighter.dead || cjFighter.hp <= 0) return;

  let isCjWinner = false;
  if (winner) {
    if (winner === cjFighter || winner.characterId === 'cj' || winner.type === 'cj') {
      isCjWinner = true;
    } else if (state.getFighterTeam && typeof state.getFighterTeam === 'function') {
      const winnerIdx = state.fighters.indexOf(winner);
      const cjIdx = state.fighters.indexOf(cjFighter);
      const winnerTeam = state.getFighterTeam(winnerIdx);
      const cjTeam = state.getFighterTeam(cjIdx);
      if (winnerTeam !== null && winnerTeam === cjTeam) {
        isCjWinner = true;
      }
    }
  } else {
    isCjWinner = true;
  }

  if (isCjWinner) {
    if (typeof triggerMissionPassedOverlay === 'function') {
      triggerMissionPassedOverlay({ timer: 240 });
    }
  }
}

function endRoundIfFFAEnded() {
  if (state.mode !== GAME_MODES.FFA || state.gameState !== 'playing') return;

  let aliveCount = 0;
  let winner = null;
  for (let i = 0; i < state.fighters.length; i++) {
    const f = state.fighters[i];
    if (f && isFighterEffectivelyAlive(f)) {
      aliveCount++;
      winner = f;
    }
  }

  if (aliveCount > 1) return;

  if (aliveCount === 0) winner = null;
  state.roundWinner = winner;
  state.roundEndTimer = 0;

  let isMatchEnd = false;
  if (winner) {
    checkCjVictoryOverlay(winner);
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
  const is1v2 = (state.mode === GAME_MODES.STAND_OFF_1V2 || state.mode === '1v2 Stand Off' || state.mode === '1v2' || state.mode === 'STAND_OFF_1V2');
  const is2v2 = (state.mode === GAME_MODES.TWO_VS_TWO || state.mode === '2v2');
  if ((!is2v2 && !is1v2) || state.gameState !== 'playing') return;

  let team0Alive = false;
  let team1Alive = false;

  if (is1v2) {
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

  if (winnerFighter) {
    checkCjVictoryOverlay(winnerFighter);
  }

  const winThreshold = MODE_SETTINGS[state.mode]?.rounds ?? 1;
  const isMatchEnd = state.teamScores[winningTeam] >= winThreshold;

  // Stop all sounds when round ends, unless it is a match end (champion screen)
  if (!isMatchEnd) {
    stopAllSounds(true, 2000, 500);
    stopAllLoopingSounds();
  }

  // Play victory voicelines when winning team wins
  if (state.fighters) {
    const todoFighter = state.fighters.find(f => f && (f.characterId === 'todo' || f.type === 'todo'));
    if (todoFighter) {
      const todoIdx = state.fighters.indexOf(todoFighter);
      const todoTeam = state.getFighterTeam ? state.getFighterTeam(todoIdx) : null;
      if (todoTeam !== null && todoTeam === winningTeam) {
        const todoSnd = CONFIG.todo?.victoryVoiceSound || 'Assets/Sound Effects/SkillEffects/todo-voiceline-mybestfriend.mp3';
        const vol = CONFIG.todo?.victoryVoiceVolume ?? 3.5;
        audioSystem.playSFX(todoSnd, vol);
      }
    }

    if (isMatchEnd) {
      const saitamaFighter = state.fighters.find(f => f && (f.characterId === 'saitama' || f.type === 'saitama'));
      if (saitamaFighter) {
        const saitamaIdx = state.fighters.indexOf(saitamaFighter);
        const saitamaTeam = state.getFighterTeam ? state.getFighterTeam(saitamaIdx) : null;
        if (saitamaTeam !== null && saitamaTeam === winningTeam) {
          const saitamaSnd = CONFIG.saitama?.sounds?.championVoiceline || CONFIG.saitama?.championVoiceline || 'Assets/Sound Effects/SkillEffects/saitama-champion-voiceline.mp3';
          const vol = CONFIG.saitama?.soundVolumes?.championVoiceline ?? (CONFIG.saitama?.championVoiceVolume ?? 3.5);
          audioSystem.playSFX(saitamaSnd, vol);
        }
      }
    }
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

  let aliveCount = 0;
  let winner = null;
  for (let i = 0; i < state.fighters.length; i++) {
    const f = state.fighters[i];
    if (f && isFighterEffectivelyAlive(f)) {
      aliveCount++;
      winner = f;
    }
  }

  if (aliveCount > 1) return;

  if (aliveCount === 0) winner = null;
  state.roundWinner = winner;
  state.roundEndTimer = 0;

  let isMatchEnd = false;
  if (winner) {
    checkCjVictoryOverlay(winner);
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

  if (!player || !isFighterEffectivelyAlive(player)) {
    // Player died - show Champion Screen
    state.matchWinner = enemy;
    state.matchEndTimer = 0;
    state.gameState = 'matchEnd';
    return;
  }

  // Check if enemy died
  if (enemy && !isFighterEffectivelyAlive(enemy)) {
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
      if (fighter.vanishTimer > 0) fighter.vanishTimer--;
      if (fighter.hp <= 0) {
        if (typeof fighter._healthBarShakeTimer === 'number' && fighter._healthBarShakeTimer > 0) {
          fighter._healthBarShakeTimer--;
        }
        // If fighter is paralyzed by Mahito's Soul Disfigurement, let shivering finish and explode before match ends!
        if (fighter.isParalyzedByMahito && (fighter.paralyzeTimer || 0) > 0) {
          if (fighter.paralyzeTimer % 3 === 0 && typeof spawnMahitoSoulBubbles === 'function') {
            spawnMahitoSoulBubbles(fighter.x, fighter.y, 2);
          }
          if (fighter.paralyzeTimer === 1) {
            triggerMahitoParalyzeExplosion(fighter);
          }
          fighter.paralyzeTimer--;
          if (fighter.paralyzeTimer <= 0) {
            fighter.isParalyzedByMahito = false;
            if (typeof fighter.checkRoundOrMatchEnd === 'function') {
              fighter.checkRoundOrMatchEnd();
            }
          }
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
    // Stamp _stateIdx on each fighter so downstream functions avoid indexOf scans
    for (let si = 0; si < state.fighters.length; si++) {
      if (state.fighters[si]) state.fighters[si]._stateIdx = si;
    }
    for (let i = 0; i < state.fighters.length; i++) {
      const a = state.fighters[i];
      if (!a || a.hp <= 0) continue;

      const nearbyEntities = spatialGrid.getNearby(a.x, a.y, a.r * 2 + 50);
      for (const b of nearbyEntities) {
        if (b.isIllusion) continue; // Skip illusions in this loop
        const j = b._stateIdx !== undefined ? b._stateIdx : state.fighters.indexOf(b);
        if (j <= i) continue; // Only check each pair once
        if (!b || b.hp <= 0) continue;
        // Skip teammates in 2v2 mode
        if ((state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.STAND_OFF_1V2) && state.getFighterTeam(i) === state.getFighterTeam(j)) continue;
        
        // Skip physical collision resolution during Wall Slam grabs to prevent stuttering/zigzag physics feedback loops
        if (a.isWallSlamActive || b.isWallSlamActive || a.isGrabbedByMahoraga || b.isGrabbedByMahoraga) continue;

        resolveFighterCollision(a, b);
      }
    }

    // 2. Fighter-Illusion Collisions
    for (const fighter of state.fighters) {
      if (!fighter || fighter.hp <= 0) continue;
      // Skip during Wall Slam grab
      if (fighter.isWallSlamActive || fighter.isGrabbedByMahoraga) continue;
      // Cronos phases through illusions while inside his own sphere; Mahito phases during Phantom Soul Slip
      if (fighter._isInsideOwnSphere?.() || (fighter.soulPhaseDashTimer && fighter.soulPhaseDashTimer > 0)) continue;

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
          if (fighter.isTurret || fighter.isDispenser || (fighter.fleshSurgeAnimTimer && fighter.fleshSurgeAnimTimer > 0) || fighter.isChannelingBankai) {
            entity.x += nx * overlap;
            entity.y += ny * overlap;
          } else if (entity.isTurret || entity.isDispenser || entity.isChannelingBankai) {
            fighter.x -= nx * overlap;
            fighter.y -= ny * overlap;
          } else {
            fighter.x -= nx * overlap * 0.5;
            fighter.y -= ny * overlap * 0.5;
            entity.x += nx * overlap * 0.5;
            entity.y += ny * overlap * 0.5;
          }

          // Re-clamp entity and fighter to arena so physics push never ejects them outside the wall
          const arena = state.arena || CONFIG.arena;
          if (arena) {
            if (entity.isRika) {
              clampRikaToArena(entity, arena);
            } else {
              const eR = entity.r || 20;
              entity.x = Math.max(arena.x + eR, Math.min(arena.x + arena.width - eR, entity.x));
              entity.y = Math.max(arena.y + eR, Math.min(arena.y + arena.height - eR, entity.y));
            }
            const fR = fighter.r || 25;
            fighter.x = Math.max(arena.x + fR, Math.min(arena.x + arena.width - fR, fighter.x));
            fighter.y = Math.max(arena.y + fR, Math.min(arena.y + arena.height - fR, fighter.y));
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
