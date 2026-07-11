// ─────────────────────────────────────────────
// FIGHTER COLLISION
// ─────────────────────────────────────────────
import { CONFIG } from '../core/config.js';
import { GAME_MODES } from '../core/modeConfig.js';
import { projectileSystem } from './projectileSystem.js';
import { state, spawnFloatingText, recordWin, recordLoss } from '../core/state.js';
import { stopAllLoopingSounds, stopAllSounds } from './soundSystem.js';
import { spawnIllusionDeath } from '../graphics/particles/illusionDeathEffect.js';

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

  for (let i = state.illusions.length - 1; i >= 0; i--) {
    const illusion = state.illusions[i];

    // Illusions only disappear when they die (HP <= 0), not by duration
    if (illusion.hp <= 0) {
      spawnIllusionDeath(illusion); // Spawn ethereal death effect
      state.illusions.splice(i, 1);
      spawnFloatingText(illusion.x, illusion.y - illusion.r - 10, 'ILLUSION SHATTERED!', '#9b59b6');
      continue;
    }

    // Check if inside a Cronos sphere - freeze movement if so
    let insideSphere = false;
    for (const fighter of state.fighters) {
      if (!fighter || !fighter.sphereActive) continue;
      const dist = Math.hypot(illusion.x - fighter.sphereX, illusion.y - fighter.sphereY);
      if (dist <= CONFIG.cronos.sphereRadius) {
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
      const currentSpeed = Math.hypot(illusion.vx, illusion.vy);
      const targetSpeed = (illusion.owner && illusion.owner.hp > 0 ? illusion.owner.speed : null)
        || illusion.moveSpeed || 1.5;
      if (currentSpeed > 0) {
        illusion.vx = (illusion.vx / currentSpeed) * targetSpeed;
        illusion.vy = (illusion.vy / currentSpeed) * targetSpeed;
      }
    }
    // Illusions don't spin

    // Check collision with fighters and bump them
    for (const fighter of state.fighters) {
      if (!fighter || fighter.hp <= 0) continue;
      // Cronos phases through illusions while inside his own sphere
      if (fighter._isInsideOwnSphere?.()) continue;
      
      const dx = illusion.x - fighter.x;
      const dy = illusion.y - fighter.y;
      const minDist = illusion.r + fighter.r;
      
      // Bounding box culling
      if (Math.abs(dx) > minDist || Math.abs(dy) > minDist) continue;

      const dist = Math.hypot(dx, dy);
      
      if (dist < minDist && dist > 0) {
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

    // Check collision with other illusions
    for (let j = 0; j < state.illusions.length; j++) {
      if (i === j) continue;
      const otherIllusion = state.illusions[j];
      if (!otherIllusion || otherIllusion.hp <= 0) continue;
      
      const dx = illusion.x - otherIllusion.x;
      const dy = illusion.y - otherIllusion.y;
      const minDist = illusion.r + otherIllusion.r;
      
      // Bounding box culling
      if (Math.abs(dx) > minDist || Math.abs(dy) > minDist) continue;

      const dist = Math.hypot(dx, dy);
      
      if (dist < minDist && dist > 0) {
        // Bump illusions away from each other
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;
        
        illusion.x += nx * overlap * 0.5;
        illusion.y += ny * overlap * 0.5;
        otherIllusion.x -= nx * overlap * 0.5;
        otherIllusion.y -= ny * overlap * 0.5;
        
        // Bounce velocity for both illusions
        const dotProduct = illusion.vx * nx + illusion.vy * ny;
        illusion.vx -= 2 * dotProduct * nx;
        illusion.vy -= 2 * dotProduct * ny;
        
        const otherDotProduct = otherIllusion.vx * nx + otherIllusion.vy * ny;
        otherIllusion.vx -= 2 * otherDotProduct * nx;
        otherIllusion.vy -= 2 * otherDotProduct * ny;
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
      for (const fighter of state.fighters) {
        if (!fighter || fighter.hp <= 0 || fighter === illusion.owner) continue;
        const dist = Math.hypot(fighter.x - illusion.x, fighter.y - illusion.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestTarget = fighter;
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
        const d = Math.hypot(dx, dy) || 1;
        illusion.vx = (dx / d) * targetSpeed;
        illusion.vy = (dy / d) * targetSpeed;
      } else {
        // Fallback if no target exists
        const speed = Math.hypot(illusion.vx, illusion.vy) || 1;
        illusion.vx = -(illusion.vx / speed) * targetSpeed;
        illusion.vy = -(illusion.vy / speed) * targetSpeed;
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
    for (const fighter of state.fighters) {
      if (!fighter || fighter.hp <= 0 || fighter === illusion.owner) continue;
      if (fighter.invincibilityTimer > 0 || fighter.flashStepTimer > 0) continue;

      const dist = Math.hypot(fighter.x - illusion.x, fighter.y - illusion.y);
      if (dist <= illusion.r + fighter.r + CONFIG.doppleganger.swordRange && illusion.swordCooldown === 0) {
        // Attack!
        illusion.swordSwingAngle = Math.atan2(fighter.y - illusion.y, fighter.x - illusion.x);
        illusion.swordSwingActive = true;
        illusion.swordSwingTimer = CONFIG.doppleganger.swordSwingDuration;
        illusion.swordSwingCooldown = CONFIG.doppleganger.swordCooldown;
        illusion.swordCooldown = CONFIG.doppleganger.swordCooldown;
        fighter.takeDamage(illusion.damage, illusion.owner, { isMelee: true });
        spawnFloatingText(fighter.x, fighter.y - fighter.r - 5, 'ILLUSION SLASH!', '#9b59b6');
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

  const dx       = b.x - a.x;
  const dy       = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const minDist  = a.r + b.r;

  if (distance >= minDist) return;

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

  // Push circles apart equally
  const overlap = (minDist - distance) / 2;
  a.x -= nx * overlap;
  a.y -= ny * overlap;
  b.x += nx * overlap;
  b.y += ny * overlap;

  // Only apply impulse if fighters are moving toward each other
  const dvx  = b.vx - a.vx;
  const dvy  = b.vy - a.vy;
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

  a.vx -= impulse * nx + randA * impulse * tx;
  a.vy -= impulse * ny + randA * impulse * ty;
  b.vx += impulse * nx + randB * impulse * tx;
  b.vy += impulse * ny + randB * impulse * ty;

  a.normalizeSpeed();
  b.normalizeSpeed();
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

    const dx = other.x - fighter.x;
    const dy = other.y - fighter.y;
    const distance = Math.hypot(dx, dy);
    if (distance < bestDistance) {
      bestDistance = distance;
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
    const distance = Math.hypot(dx, dy);
    if (distance < bestDistance) {
      bestDistance = distance;
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
      fighter.update(opponent, fi, state.arena);
    });

    for (let i = 0; i < state.fighters.length; i++) {
      for (let j = i + 1; j < state.fighters.length; j++) {
        const a = state.fighters[i];
        const b = state.fighters[j];
        if (!a || !b || a.hp <= 0 || b.hp <= 0) continue;
        // Skip teammates in 2v2 mode
        if (state.mode === GAME_MODES.TWO_VS_TWO && state.getFighterTeam(i) === state.getFighterTeam(j)) continue;
        resolveFighterCollision(a, b);
      }
    }

    // Check collisions between fighters and illusions
    for (const fighter of state.fighters) {
      if (!fighter || fighter.hp <= 0) continue;
      // Cronos phases through illusions while inside his own sphere
      if (fighter._isInsideOwnSphere?.()) continue;
      for (const illusion of state.illusions) {
        if (!illusion || illusion.hp <= 0) continue;
        const dx = illusion.x - fighter.x;
        const dy = illusion.y - fighter.y;
        const dist = Math.hypot(dx, dy);
        const minDist = illusion.r + fighter.r;

        if (dist < minDist && dist > 0) {
          // Collision detected - trigger onCollide for the fighter
          fighter.onCollide(illusion);

          // Push them apart
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;
          fighter.x -= nx * overlap * 0.5;
          fighter.y -= ny * overlap * 0.5;
          illusion.x += nx * overlap * 0.5;
          illusion.y += ny * overlap * 0.5;
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
  }
}
