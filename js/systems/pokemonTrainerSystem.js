import { state } from '../core/state.js';
import { spawnImpactFlash, spawnSparks } from '../graphics/particles/sparkEffect.js';
import { audioSystem } from './audioSystem.js';

/**
 * Centralized Pokémon Trainer System
 * ----------------------------------------------------------------------------
 * Shared arena corner positioning, multi-trainer occupancy avoidance, dynamic
 * conflict resolution, and directional Honeycomb Barrier threat detection for
 * all current and future Pokémon Trainer fighters (e.g., Ash, Red, Cynthia).
 */

/**
 * Determines whether an entity is a Pokémon Trainer fighter (excluding summoned Pokémon companions).
 *
 * @param {Object} entity
 * @returns {boolean}
 */
export function isPokemonTrainer(entity) {
  if (!entity || entity.isPokemon || entity.isPokemonMinion) return false;
  return Boolean(
    entity.isPokemonTrainer ||
    entity.characterId === 'ash' ||
    entity.type === 'ash' ||
    (entity._def && (
      entity._def.isPokemonTrainer ||
      entity._def.id === 'ash' ||
      entity._def.type === 'ash'
    ))
  );
}

/**
 * Creates a fresh spring-damped hand and torso physics state for a Pokémon Trainer.
 *
 * @returns {Object}
 */
export function createTrainerHandPhysicsState() {
  return {
    leftOffsetX: 0,
    leftOffsetY: 0,
    leftVx: 0,
    leftVy: 0,
    rightOffsetX: 0,
    rightOffsetY: 0,
    rightVx: 0,
    rightVy: 0,
    rightScale: 1.0,
    leftScale: 1.0,
    torsoOffsetX: 0,
    torsoOffsetY: 0,
    torsoRot: 0,
    torsoVx: 0,
    torsoVy: 0,
    torsoVRot: 0,
    swingTick: 0
  };
}

/**
 * Initializes standard Pokémon Trainer state properties on a fighter instance.
 *
 * @param {Object} trainer - Fighter instance
 * @param {Object} [cfg={}] - Character configuration object
 */
export function initPokemonTrainerState(trainer, cfg = {}) {
  if (!trainer) return;
  trainer.isPokemonTrainer = true;
  trainer.trainerVantagePoint = null;
  trainer.trainerVantagePad = cfg.trainerVantagePad || 42;
  trainer.trainerSlowMoveMultiplier = cfg.trainerSlowMoveMultiplier ?? 0.28;
  trainer.isProtectedByHoneycombBarrier = false;
  trainer.honeycombBarrierRadius = cfg.honeycombBarrierRadius || 46;
  trainer.barrierHitFlashTimer = 0;
  trainer.barrierActiveTimer = 0;
  trainer.barrierAngle = 0;
  trainer._barrierTextCooldown = 0;
  trainer.lastSummonedPokemon = null;
  trainer.pokeballThrowAnimTimer = 0;
  trainer.pokeballThrowAnimMax = cfg.pokeballThrowAnimFrames || 30;
  trainer.pokeballThrowPhase = null;
  trainer.pokeballThrowAngle = 0;
  trainer.handPhysics = createTrainerHandPhysicsState();
  trainer.jumpState = 'inside'; // 'inside' | 'jumping_out' | 'outside' | 'jumping_in'
  trainer.isJumpedOut = false;
  trainer.sidelineX = null;
  trainer.sidelineY = null;
  trainer.jumpTimer = 0;
  trainer.jumpDuration = 30;
  trainer.jumpStartX = trainer.x || 0;
  trainer.jumpStartY = trainer.y || 0;
  trainer.jumpTargetX = trainer.x || 0;
  trainer.jumpTargetY = trainer.y || 0;
  trainer.isUntargetable = false;
  trainer.untargetable = false;
  trainer.cannotBeTargeted = false;
  trainer.isTargetable = true;
  trainer.isInvulnerable = false;
  trainer.z = 0;
}

/**
 * Resets Pokémon Trainer positioning and barrier state on round/match reset.
 *
 * @param {Object} trainer - Fighter instance
 */
export function resetPokemonTrainerState(trainer) {
  if (!trainer) return;
  trainer.isPokemonTrainer = true;
  trainer.trainerVantagePoint = null;
  trainer.isProtectedByHoneycombBarrier = false;
  trainer.barrierHitFlashTimer = 0;
  trainer.barrierActiveTimer = 0;
  trainer.barrierAngle = 0;
  trainer._barrierTextCooldown = 0;
  trainer.lastSummonedPokemon = null;
  trainer.pokeballThrowAnimTimer = 0;
  trainer.pokeballThrowPhase = null;
  trainer.pokeballThrowAngle = 0;
  trainer.handPhysics = createTrainerHandPhysicsState();
  trainer.jumpState = 'inside'; // 'inside' | 'jumping_out' | 'outside' | 'jumping_in'
  trainer.isJumpedOut = false;
  trainer.sidelineX = null;
  trainer.sidelineY = null;
  trainer.jumpTimer = 0;
  trainer.jumpDuration = 30;
  trainer.jumpStartX = trainer.x || 0;
  trainer.jumpStartY = trainer.y || 0;
  trainer.jumpTargetX = trainer.x || 0;
  trainer.jumpTargetY = trainer.y || 0;
  trainer.isUntargetable = false;
  trainer.untargetable = false;
  trainer.cannotBeTargeted = false;
  trainer.isTargetable = true;
  trainer.isInvulnerable = false;
  trainer.z = 0;
}

/**
 * Randomly selects the next Pokémon species to summon from the trainer's enabled pool.
 * Avoids repeating the immediately previous summon when 2 or more species are enabled.
 *
 * @param {Object} trainer - The Pokémon Trainer fighter instance
 * @param {Array<string>} availableList - List of currently enabled Pokémon species keys
 * @returns {string|null}
 */
export function pickRandomPokemonSpecies(trainer, availableList) {
  if (!Array.isArray(availableList) || availableList.length === 0) return null;
  if (availableList.length === 1) {
    const only = availableList[0];
    if (trainer) {
      trainer.lastSummonedPokemon = only;
      trainer.nextPokemonIndex = 0;
    }
    return only;
  }

  const last = trainer ? trainer.lastSummonedPokemon : null;
  const candidates = (last && availableList.includes(last))
    ? availableList.filter(species => species !== last)
    : availableList;
  const pool = candidates.length > 0 ? candidates : availableList;
  const randomIdx = Math.floor(Math.random() * pool.length);
  const chosen = pool[randomIdx] || availableList[0];

  if (trainer) {
    trainer.lastSummonedPokemon = chosen;
    const orderIdx = availableList.indexOf(chosen);
    if (orderIdx !== -1) {
      trainer.nextPokemonIndex = orderIdx;
    }
  }
  return chosen;
}

/**
 * Returns the minimum safe separation distance between two Pokémon Trainers at corners.
 *
 * @param {Object} trainer
 * @param {number} [customMinSeparation]
 * @returns {number}
 */
export function getTrainerMinSeparation(trainer, customMinSeparation) {
  if (typeof customMinSeparation === 'number' && customMinSeparation > 0) {
    return customMinSeparation;
  }
  const barrierRadius = (trainer && trainer.honeycombBarrierRadius) || 46;
  return Math.max(95, barrierRadius * 2.1);
}

/**
 * Returns all other living Pokémon Trainers currently in the arena (supports any trainer character).
 *
 * @param {Object} trainer - The querying trainer instance
 * @param {Array} [fightersList] - Optional explicit fighter list (defaults to state.fighters)
 * @returns {Array<Object>}
 */
export function getOtherPokemonTrainers(trainer, fightersList = null) {
  const list = fightersList || (typeof state !== 'undefined' && Array.isArray(state.fighters) ? state.fighters : null);
  if (!list) return [];
  const trainers = [];
  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    if (!f || f === trainer || f.hp <= 0 || f.dead || f.isDead) continue;
    if (isPokemonTrainer(f)) {
      trainers.push(f);
    }
  }
  return trainers;
}

/**
 * Checks whether a candidate corner/sideline spot is already claimed or physically occupied
 * by another living Pokémon Trainer.
 *
 * @param {Object} trainer - The querying trainer instance
 * @param {{ x: number, y: number }} cand - Candidate vantage point
 * @param {number} [minSeparation] - Minimum distance required between trainers
 * @returns {boolean}
 */
export function isTrainerVantagePointOccupied(trainer, cand, minSeparation) {
  if (!cand) return false;
  const minSep = getTrainerMinSeparation(trainer, minSeparation);
  const others = getOtherPokemonTrainers(trainer);
  for (let i = 0; i < others.length; i++) {
    const other = others[i];
    if (other.trainerVantagePoint) {
      const dVp = Math.hypot(other.trainerVantagePoint.x - cand.x, other.trainerVantagePoint.y - cand.y);
      if (dVp < minSep) return true;
    }
    const dPos = Math.hypot(other.x - cand.x, other.y - cand.y);
    if (dPos < minSep) return true;
  }
  return false;
}

/**
 * Checks if a trainer's current vantage point conflicts with another Pokémon Trainer who has priority
 * (either already closer to that corner, or tied within 4px and earlier in fighter order),
 * or if another trainer is physically stationed inside the spot.
 *
 * @param {Object} trainer - The querying trainer instance
 * @param {{ x: number, y: number }} vp - Current vantage point
 * @param {number} [minSeparation] - Minimum distance required between trainers
 * @returns {boolean}
 */
export function hasTrainerVantagePointConflict(trainer, vp, minSeparation) {
  if (!trainer || !vp) return true;
  const others = getOtherPokemonTrainers(trainer);
  if (others.length === 0) return false;

  const minSep = getTrainerMinSeparation(trainer, minSeparation);
  const fighters = (typeof state !== 'undefined' && Array.isArray(state.fighters)) ? state.fighters : null;
  const myIdx = fighters ? fighters.indexOf(trainer) : -1;
  const myDist = Math.hypot(vp.x - trainer.x, vp.y - trainer.y);

  for (let i = 0; i < others.length; i++) {
    const other = others[i];
    const otherVp = other.trainerVantagePoint;
    if (otherVp) {
      const distBetweenVps = Math.hypot(otherVp.x - vp.x, otherVp.y - vp.y);
      if (distBetweenVps < minSep) {
        const otherDist = Math.hypot(otherVp.x - other.x, otherVp.y - other.y);
        const otherIdx = fighters ? fighters.indexOf(other) : -1;
        if (
          otherDist + 4 < myDist ||
          (Math.abs(otherDist - myDist) <= 4 && otherIdx !== -1 && myIdx !== -1 && otherIdx < myIdx)
        ) {
          return true;
        }
      }
    } else {
      const distToOtherBody = Math.hypot(other.x - vp.x, other.y - vp.y);
      if (distToOtherBody < minSep && distToOtherBody + 4 < myDist) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Builds the 4 canonical arena corner vantage points ('top-left', 'top-right', 'bottom-left', 'bottom-right'),
 * plus optional sideline midpoints if more than 4 Pokémon Trainers are active simultaneously.
 *
 * @param {Object} arena - Arena bounds
 * @param {number} [pad=42] - Wall inset padding
 * @param {boolean} [includeSidelineOverflow=false] - Whether to append sideline midpoints for 5+ trainers
 * @returns {Array<{ type: string, x: number, y: number, isPrimary: boolean }>}
 */
export function getArenaCornerCandidates(arena, pad = 42, includeSidelineOverflow = false) {
  const isCircle = arena.shape === 'circle' || arena.radius !== undefined;
  const midX = arena.x + arena.width * 0.5;
  const midY = arena.y + arena.height * 0.5;

  if (isCircle) {
    const ar = (arena.radius !== undefined ? arena.radius : arena.width * 0.5) - pad;
    const diag = ar * Math.SQRT1_2;
    const candidates = [
      { type: 'top-left', x: midX - diag, y: midY - diag, isPrimary: true },
      { type: 'top-right', x: midX + diag, y: midY - diag, isPrimary: true },
      { type: 'bottom-left', x: midX - diag, y: midY + diag, isPrimary: true },
      { type: 'bottom-right', x: midX + diag, y: midY + diag, isPrimary: true }
    ];
    if (includeSidelineOverflow) {
      candidates.push(
        { type: 'top-left', x: midX, y: midY - ar, isPrimary: false },
        { type: 'bottom-left', x: midX - ar, y: midY, isPrimary: false },
        { type: 'top-right', x: midX + ar, y: midY, isPrimary: false },
        { type: 'bottom-right', x: midX, y: midY + ar, isPrimary: false }
      );
    }
    return candidates;
  }

  const minX = arena.x + pad;
  const maxX = arena.x + arena.width - pad;
  const minY = arena.y + pad;
  const maxY = arena.y + arena.height - pad;
  const candidates = [
    { type: 'top-left', x: minX, y: minY, isPrimary: true },
    { type: 'top-right', x: maxX, y: minY, isPrimary: true },
    { type: 'bottom-left', x: minX, y: maxY, isPrimary: true },
    { type: 'bottom-right', x: maxX, y: maxY, isPrimary: true }
  ];
  if (includeSidelineOverflow) {
    candidates.push(
      { type: 'top-left', x: midX, y: minY, isPrimary: false },
      { type: 'bottom-left', x: minX, y: midY, isPrimary: false },
      { type: 'top-right', x: maxX, y: midY, isPrimary: false },
      { type: 'bottom-right', x: midX, y: maxY, isPrimary: false }
    );
  }
  return candidates;
}

/**
 * Selects the safest unoccupied corner vantage point ('top-left', 'top-right', 'bottom-left', 'bottom-right')
 * for a Pokémon Trainer to move to while their summoned Pokémon battles in the arena.
 * Guarantees that when 2 or more Pokémon Trainers are present, each trainer claims an unoccupied corner.
 *
 * @param {Object} trainer - The Pokémon Trainer fighter instance
 * @param {Object} [arena] - Current arena bounds
 * @param {Object} [opponent] - Primary enemy target to avoid
 * @param {Object} [opts={}] - Optional overrides ({ pad, minSeparation })
 * @returns {{ type: string, x: number, y: number }}
 */
export function pickTrainerVantagePoint(trainer, arena, opponent = null, opts = {}) {
  const curArena = arena || (typeof state !== 'undefined' ? state.arena : null);
  const pad = opts.pad ?? trainer?.trainerVantagePad ?? 42;
  const minSeparation = getTrainerMinSeparation(trainer, opts.minSeparation);

  if (!curArena) {
    return {
      type: 'top-left',
      x: Math.max(30, (trainer?.x || 150) - 120),
      y: Math.max(30, (trainer?.y || 150) - 120)
    };
  }

  const otherTrainers = getOtherPokemonTrainers(trainer);
  const candidates = getArenaCornerCandidates(curArena, pad, otherTrainers.length >= 4);

  // Filter out corners already occupied/claimed by another Pokémon Trainer when unoccupied corners exist
  const unoccupied = otherTrainers.length > 0
    ? candidates.filter(c => !isTrainerVantagePointOccupied(trainer, c, minSeparation))
    : candidates;
  const pool = unoccupied.length > 0 ? unoccupied : candidates;

  // If no opponent exists or opponent is defeated, pick unoccupied corner closest to trainer's current spot
  if (!opponent || opponent.hp <= 0 || opponent.dead) {
    let closest = pool[0];
    let minDist = Infinity;
    for (const cand of pool) {
      const d = Math.hypot(cand.x - trainer.x, cand.y - trainer.y) - (cand.isPrimary ? 25 : 0);
      if (d < minDist) {
        minDist = d;
        closest = cand;
      }
    }
    return { type: closest.type, x: closest.x, y: closest.y };
  }

  // Score corners: maximize distance from opponent & other trainers while minimizing travel distance from trainer
  let bestCand = pool[0];
  let bestScore = -Infinity;

  for (const cand of pool) {
    const distToEnemy = Math.hypot(cand.x - opponent.x, cand.y - opponent.y);
    const distFromTrainer = Math.hypot(cand.x - trainer.x, cand.y - trainer.y);

    // Reward distance from opponent (1.5x weight) and deduct travel distance from trainer
    let score = distToEnemy * 1.5 - distFromTrainer + (cand.isPrimary ? 40 : 0);

    // Heavy penalty if candidate corner is within close danger zone (< 120px) of enemy
    if (distToEnemy < 120) {
      score -= 500;
    }

    // Keep comfortable spacing from any other Pokémon Trainers
    for (let i = 0; i < otherTrainers.length; i++) {
      const other = otherTrainers[i];
      const refX = other.trainerVantagePoint ? other.trainerVantagePoint.x : other.x;
      const refY = other.trainerVantagePoint ? other.trainerVantagePoint.y : other.y;
      const distToOther = Math.hypot(cand.x - refX, cand.y - refY);
      if (distToOther < minSeparation) {
        score -= 10000 - distToOther;
      } else if (distToOther < minSeparation * 1.5) {
        score -= (minSeparation * 1.5 - distToOther) * 4;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCand = cand;
    }
  }

  return { type: bestCand.type, x: bestCand.x, y: bestCand.y };
}

/**
 * Checks whether a Pokémon Trainer is currently walking toward their assigned corner vantage point.
 *
 * @param {Object} trainer
 * @param {number} [arrivalThreshold=6]
 * @returns {boolean}
 */
export function isTrainerMovingToVantagePoint(trainer, arrivalThreshold = 6) {
  if (!trainer || !trainer.trainerVantagePoint) return false;
  return Math.hypot(trainer.trainerVantagePoint.x - trainer.x, trainer.trainerVantagePoint.y - trainer.y) > arrivalThreshold;
}

/**
 * Updates a Pokémon Trainer's per-frame movement toward their assigned corner vantage point,
 * automatically resolving multi-trainer corner conflicts if another trainer claims or occupies the corner.
 *
 * @param {Object} trainer - The Pokémon Trainer fighter instance
 * @param {Object} [arena] - Current arena bounds
 * @param {Object} [opponent] - Primary enemy target to avoid
 * @param {Object} [opts={}] - Optional overrides ({ pad, slowMoveMultiplier, minSeparation, arrivalThreshold })
 */
export function updateTrainerCornerMovement(trainer, arena, opponent = null, opts = {}) {
  if (!trainer) return;
  const minSeparation = getTrainerMinSeparation(trainer, opts.minSeparation);

  if (!trainer.trainerVantagePoint || hasTrainerVantagePointConflict(trainer, trainer.trainerVantagePoint, minSeparation)) {
    trainer.trainerVantagePoint = pickTrainerVantagePoint(trainer, arena, opponent, {
      pad: opts.pad ?? trainer.trainerVantagePad ?? 42,
      minSeparation
    });
  }

  if (!trainer.trainerVantagePoint) {
    trainer.vx = 0;
    trainer.vy = 0;
    return;
  }

  const dx = trainer.trainerVantagePoint.x - trainer.x;
  const dy = trainer.trainerVantagePoint.y - trainer.y;
  const dist = Math.hypot(dx, dy);

  const slowMult = opts.slowMoveMultiplier ?? trainer.trainerSlowMoveMultiplier ?? 0.28;
  const slowSpeed = Math.max(1.0, (trainer.speed || 5.0) * slowMult);
  const arrivalThreshold = opts.arrivalThreshold ?? 6;

  if (dist <= arrivalThreshold || dist <= slowSpeed) {
    trainer.vx = 0;
    trainer.vy = 0;
  } else {
    trainer.vx = (dx / dist) * slowSpeed;
    trainer.vy = (dy / dist) * slowSpeed;
    if (typeof trainer.applyMovementPhysics === 'function') {
      trainer.applyMovementPhysics(slowMult);
    }
    if (Math.hypot(trainer.trainerVantagePoint.x - trainer.x, trainer.trainerVantagePoint.y - trainer.y) <= arrivalThreshold) {
      trainer.vx = 0;
      trainer.vy = 0;
    }
  }
}

/**
 * Calculates a safe, designated sideline vantage point located OUTSIDE the arena perimeter
 * at either the LEFT or RIGHT arena wall (whichever is nearer to the trainer) where a
 * Pokémon Trainer stands while their summoned Pokémon battles in the arena.
 *
 * @param {Object} trainer - The Pokémon Trainer fighter instance
 * @param {Object} [arena] - Current arena bounds
 * @param {Object} [opponent=null] - Primary enemy target
 * @returns {{ type: string, wall: string, x: number, y: number }}
 */
export function pickTrainerOutsideSidelineSpot(trainer, arena, opponent = null) {
  const curArena = arena || (typeof state !== 'undefined' ? state.arena : null) || { x: 45, y: 240, width: 450, height: 450 };
  const isCircle = curArena.shape === 'circle' || curArena.radius !== undefined;

  const fighters = (typeof state !== 'undefined' && Array.isArray(state.fighters)) ? state.fighters : [];
  const otherTrainers = fighters.filter(f => f && f !== trainer && isPokemonTrainer(f));
  if (opponent && isPokemonTrainer(opponent) && !otherTrainers.includes(opponent)) {
    otherTrainers.push(opponent);
  }

  // Determine whether another trainer is an ENEMY (versus teammate)
  const isEnemyTrainer = (ot) => {
    if (!ot || ot === trainer) return false;
    if (typeof trainer?.isTeammate === 'function' && trainer.isTeammate(ot)) return false;
    if (typeof ot?.isTeammate === 'function' && ot.isTeammate(trainer)) return false;
    const myTeam = trainer?.teamId ?? trainer?.team;
    const otherTeam = ot?.teamId ?? ot?.team;
    if (myTeam !== undefined && otherTeam !== undefined) {
      return myTeam !== otherTeam;
    }
    if (typeof state !== 'undefined' && typeof state.getFighterTeam === 'function' && Array.isArray(state.fighters)) {
      const myIdx = state.fighters.indexOf(trainer);
      const otherIdx = state.fighters.indexOf(ot);
      if (myIdx !== -1 && otherIdx !== -1) {
        const t1 = state.getFighterTeam(myIdx);
        const t2 = state.getFighterTeam(otherIdx);
        if (t1 !== null && t2 !== null) {
          return t1 !== t2;
        }
      }
    }
    // Default in 1v1 / FFA matches: other trainers are enemies
    return true;
  };

  const getTrainerOccupiedWall = (ot, centerX) => {
    if (!ot) return null;
    if (ot.trainerVantagePoint && (ot.trainerVantagePoint.wall === 'left' || ot.trainerVantagePoint.wall === 'right')) {
      return ot.trainerVantagePoint.wall;
    }
    if (ot.isJumpedOut || ot.jumpState === 'outside' || ot.jumpState === 'jumping_out') {
      const ox = ot.trainerVantagePoint?.x ?? ot.jumpTargetX ?? ot.x;
      return ox < centerX ? 'left' : 'right';
    }
    return null;
  };

  const enemyTrainers = otherTrainers.filter(ot => isEnemyTrainer(ot));

  if (isCircle) {
    const cx = curArena.x + curArena.width * 0.5;
    const cy = curArena.y + curArena.height * 0.5;
    const r = (curArena.radius !== undefined ? curArena.radius : curArena.width * 0.5);
    const outsideR = r + 28;

    const tx = typeof trainer?.x === 'number' ? trainer.x : cx;
    const ty = typeof trainer?.y === 'number' ? trainer.y : cy;

    // Count enemy trainers occupying each side flank
    let enemyLeftCount = 0;
    let enemyRightCount = 0;
    for (const ot of enemyTrainers) {
      const occWall = getTrainerOccupiedWall(ot, cx);
      if (occWall === 'left') enemyLeftCount++;
      else if (occWall === 'right') enemyRightCount++;
    }

    // Strictly leap to either the LEFT or RIGHT flank of the circle.
    // If an enemy trainer is occupying one side, leap to the opposite side!
    let isLeft = (tx < cx);
    if (enemyLeftCount > enemyRightCount) {
      isLeft = false; // Enemy occupies the left flank -> leap to right flank!
    } else if (enemyRightCount > enemyLeftCount) {
      isLeft = true;  // Enemy occupies the right flank -> leap to left flank!
    } else if (enemyLeftCount === 0 && enemyRightCount === 0 && enemyTrainers.length > 0) {
      const primaryEnemy = (opponent && isPokemonTrainer(opponent)) ? opponent : enemyTrainers[0];
      if (primaryEnemy && typeof primaryEnemy.x === 'number') {
        if (primaryEnemy.x < cx && tx >= cx) isLeft = false;
        else if (primaryEnemy.x > cx && tx <= cx) isLeft = true;
      }
    }

    let baseAngle = isLeft ? Math.PI : 0;
    const dy = ty - cy;
    const normalizedY = Math.max(-0.55, Math.min(0.55, dy / r));
    baseAngle += (isLeft ? -normalizedY * 0.75 : normalizedY * 0.75);

    // Check separation against other trainers outside the circle
    let chosenAngle = baseAngle;
    const angleOffsets = [0, 0.35, -0.35, 0.70, -0.70, 1.05, -1.05];
    for (const offset of angleOffsets) {
      const testAng = baseAngle + offset;
      const testX = cx + Math.cos(testAng) * outsideR;
      const testY = cy + Math.sin(testAng) * outsideR;
      const conflict = otherTrainers.some(ot => {
        const ox = ot.trainerVantagePoint?.x ?? ot.jumpTargetX ?? ot.x;
        const oy = ot.trainerVantagePoint?.y ?? ot.jumpTargetY ?? ot.y;
        return (ot.isJumpedOut || ot.jumpState === 'outside' || ot.jumpState === 'jumping_out') && Math.hypot(ox - testX, oy - testY) < 55;
      });
      if (!conflict) {
        chosenAngle = testAng;
        break;
      }
    }

    return {
      type: isLeft ? 'outside-left' : 'outside-right',
      wall: isLeft ? 'left' : 'right',
      x: cx + Math.cos(chosenAngle) * outsideR,
      y: cy + Math.sin(chosenAngle) * outsideR
    };
  }

  // Rectangular Arena: Evaluate ONLY the LEFT and RIGHT walls
  const cx = curArena.x + curArena.width * 0.5;
  const tx = typeof trainer?.x === 'number' ? trainer.x : cx;
  const ty = typeof trainer?.y === 'number' ? trainer.y : (curArena.y + curArena.height * 0.5);

  const distLeft = Math.max(0, tx - curArena.x);
  const distRight = Math.max(0, (curArena.x + curArena.width) - tx);

  // Count enemy trainers occupying each side wall
  let enemyLeftCount = 0;
  let enemyRightCount = 0;
  for (const ot of enemyTrainers) {
    const occWall = getTrainerOccupiedWall(ot, cx);
    if (occWall === 'left') enemyLeftCount++;
    else if (occWall === 'right') enemyRightCount++;
  }

  let candidateWalls = [];
  if (enemyLeftCount > enemyRightCount) {
    // Enemy occupies the left sideline -> Leap to the opposite (right) wall!
    candidateWalls = [
      { wall: 'right', dist: distRight },
      { wall: 'left', dist: distLeft }
    ];
  } else if (enemyRightCount > enemyLeftCount) {
    // Enemy occupies the right sideline -> Leap to the opposite (left) wall!
    candidateWalls = [
      { wall: 'left', dist: distLeft },
      { wall: 'right', dist: distRight }
    ];
  } else {
    // Neither side is occupied by an enemy (or equal enemies on both sides).
    // If no enemy is outside yet, but primary enemy trainer is positioned on one side, prefer opposite side
    if (enemyLeftCount === 0 && enemyRightCount === 0 && enemyTrainers.length > 0) {
      const primaryEnemy = (opponent && isPokemonTrainer(opponent)) ? opponent : enemyTrainers[0];
      if (primaryEnemy && typeof primaryEnemy.x === 'number') {
        if (primaryEnemy.x < cx && tx >= cx) {
          candidateWalls = [
            { wall: 'right', dist: distRight },
            { wall: 'left', dist: distLeft }
          ];
        } else if (primaryEnemy.x > cx && tx <= cx) {
          candidateWalls = [
            { wall: 'left', dist: distLeft },
            { wall: 'right', dist: distRight }
          ];
        }
      }
    }
    if (candidateWalls.length === 0) {
      candidateWalls = [
        { wall: 'left', dist: distLeft },
        { wall: 'right', dist: distRight }
      ];
      candidateWalls.sort((a, b) => a.dist - b.dist);
    }
  }

  const wallMargin = 26; // Distance outside the arena side wall
  const cornerPad = 38;  // Margin from top/bottom arena corners

  // Helper to compute coordinate for a side wall with vertical shift along the wall
  const computeSpotOnWall = (wallName, shift = 0) => {
    const clampedY = Math.max(curArena.y + cornerPad, Math.min(curArena.y + curArena.height - cornerPad, ty + shift));
    if (wallName === 'left') {
      return {
        type: 'outside-left',
        wall: 'left',
        x: curArena.x - wallMargin,
        y: clampedY
      };
    }
    return {
      type: 'outside-right',
      wall: 'right',
      x: curArena.x + curArena.width + wallMargin,
      y: clampedY
    };
  };

  // Test candidate side walls in order of nearest distance, with along-wall shifts for multi-trainer separation
  const shifts = [0, 65, -65, 130, -130, 195, -195];

  for (const cand of candidateWalls) {
    for (const shift of shifts) {
      const spot = computeSpotOnWall(cand.wall, shift);
      // Check if spot conflicts with another trainer who is outside or leaping out
      const hasConflict = otherTrainers.some(ot => {
        const ox = ot.trainerVantagePoint?.x ?? ot.jumpTargetX ?? ot.x;
        const oy = ot.trainerVantagePoint?.y ?? ot.jumpTargetY ?? ot.y;
        return (ot.isJumpedOut || ot.jumpState === 'outside' || ot.jumpState === 'jumping_out') && Math.hypot(ox - spot.x, oy - spot.y) < 55;
      });

      if (!hasConflict) {
        return spot;
      }
    }
  }

  // Fallback: Use unshifted spot on the nearest side wall
  return computeSpotOnWall(candidateWalls[0].wall, 0);
}

/**
 * Calculates a safe landing coordinate inside the arena perimeter when a Pokémon Trainer
 * jumps back into combat after their Pokémon has fainted.
 * Leaps back in across the side wall (left or right) where the trainer was stationed.
 *
 * @param {Object} trainer
 * @param {Object} [arena]
 * @returns {{ x: number, y: number }}
 */
export function pickTrainerInsideLandingSpot(trainer, arena) {
  const curArena = arena || (typeof state !== 'undefined' ? state.arena : null) || { x: 45, y: 240, width: 450, height: 450 };
  const isCircle = curArena.shape === 'circle' || curArena.radius !== undefined;

  const tx = typeof trainer?.x === 'number' ? trainer.x : (curArena.x + curArena.width * 0.5);
  const ty = typeof trainer?.y === 'number' ? trainer.y : (curArena.y + curArena.height * 0.5);

  if (isCircle) {
    const cx = curArena.x + curArena.width * 0.5;
    const cy = curArena.y + curArena.height * 0.5;
    const r = (curArena.radius !== undefined ? curArena.radius : curArena.width * 0.5);
    const insideR = Math.max(30, r - 55);
    const ang = Math.atan2((trainer.y || cy) - cy, (trainer.x || cx) - cx);
    return {
      x: cx + Math.cos(ang) * insideR,
      y: cy + Math.sin(ang) * insideR
    };
  }

  const landingMargin = 50; // Distance inside the arena perimeter
  const cornerPad = 45;
  const vpWall = trainer?.trainerVantagePoint?.wall;

  // Determine whether the trainer is stationed on the left or right sideline:
  if (vpWall === 'left' || tx < curArena.x + curArena.width * 0.5) {
    return {
      x: curArena.x + landingMargin,
      y: Math.max(curArena.y + cornerPad, Math.min(curArena.y + curArena.height - cornerPad, ty))
    };
  }

  // Right wall
  return {
    x: curArena.x + curArena.width - landingMargin,
    y: Math.max(curArena.y + cornerPad, Math.min(curArena.y + curArena.height - cornerPad, ty))
  };
}

/**
 * Initiates a high-parabolic leap for a Pokémon Trainer jumping out of the arena to the sideline.
 * Grants immediate untargetability, invulnerability, and detection immunity.
 *
 * @param {Object} trainer - The Pokémon Trainer fighter instance
 * @param {Object} [arena] - Current arena bounds
 * @param {Object} [opponent=null] - Primary opponent
 */
export function startTrainerJumpOut(trainer, arena, opponent = null) {
  if (!trainer || trainer.jumpState === 'jumping_out' || trainer.jumpState === 'outside') return;
  const curArena = arena || (typeof state !== 'undefined' ? state.arena : null);
  const outSpot = pickTrainerOutsideSidelineSpot(trainer, curArena, opponent);

  trainer.jumpState = 'jumping_out';
  trainer.isJumpedOut = true;
  trainer.isUntargetable = true;
  trainer.untargetable = true;
  trainer.cannotBeTargeted = true;
  trainer.isTargetable = false;
  trainer.isInvulnerable = true;
  trainer.isInvincible = true;
  trainer.invincible = true;
  trainer.invincibilityTimer = 999999;
  trainer.isProtectedByHoneycombBarrier = false;

  const jumpDist = Math.hypot(outSpot.x - trainer.x, outSpot.y - trainer.y);
  trainer.jumpTimer = 0;
  trainer.jumpDuration = Math.round(Math.max(18, Math.min(30, jumpDist * 0.18 + 14)));
  trainer.jumpPeakZ = Math.min(75, Math.max(45, jumpDist * 0.55));
  trainer.jumpStartX = trainer.x;
  trainer.jumpStartY = trainer.y;
  trainer.jumpTargetX = outSpot.x;
  trainer.jumpTargetY = outSpot.y;
  trainer.sidelineX = outSpot.x;
  trainer.sidelineY = outSpot.y;
  trainer.trainerVantagePoint = { type: outSpot.type, wall: outSpot.wall, x: outSpot.x, y: outSpot.y };

  if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
    audioSystem.playSFX('skill_dash1', 0.5);
  }
  if (typeof spawnSparks === 'function') {
    spawnSparks(trainer.x, trainer.y, 6, '#F8FAFC');
  }
}

/**
 * Initiates a high-parabolic leap for a Pokémon Trainer jumping from the outside sideline back into the arena
 * once their summoned Pokémon has fainted.
 *
 * @param {Object} trainer - The Pokémon Trainer fighter instance
 * @param {Object} [arena] - Current arena bounds
 */
export function startTrainerJumpIn(trainer, arena) {
  if (!trainer || trainer.jumpState === 'jumping_in' || trainer.jumpState === 'inside') return;
  const curArena = arena || (typeof state !== 'undefined' ? state.arena : null);
  const inSpot = pickTrainerInsideLandingSpot(trainer, curArena);

  const jumpDist = Math.hypot(inSpot.x - trainer.x, inSpot.y - trainer.y);
  trainer.jumpState = 'jumping_in';
  trainer.jumpTimer = 0;
  trainer.jumpDuration = Math.round(Math.max(18, Math.min(28, jumpDist * 0.18 + 14)));
  trainer.jumpPeakZ = Math.min(72, Math.max(45, jumpDist * 0.55));
  trainer.jumpStartX = trainer.x;
  trainer.jumpStartY = trainer.y;
  trainer.jumpTargetX = inSpot.x;
  trainer.jumpTargetY = inSpot.y;
  trainer.sidelineX = null;
  trainer.sidelineY = null;
  trainer.trainerVantagePoint = null;

  if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
    audioSystem.playSFX('skill_dash1', 0.5);
  }
  if (typeof spawnSparks === 'function') {
    spawnSparks(trainer.x, trainer.y, 4, '#F8FAFC');
  }
}

/**
 * Integrates per-frame 3D parabolic trajectory physics for a Pokémon Trainer jumping out or back into the arena.
 *
 * @param {Object} trainer - The Pokémon Trainer fighter instance
 * @param {Object} [arena] - Current arena bounds
 * @param {Object} [opponent=null] - Primary opponent
 */
export function updateTrainerJumpPhysics(trainer, arena, opponent = null) {
  if (!trainer) return;

  if (trainer.jumpState === 'jumping_out') {
    trainer.jumpTimer++;
    const p = Math.min(1.0, trainer.jumpTimer / Math.max(1, trainer.jumpDuration));
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

    trainer.x = trainer.jumpStartX + (trainer.jumpTargetX - trainer.jumpStartX) * e;
    trainer.y = trainer.jumpStartY + (trainer.jumpTargetY - trainer.jumpStartY) * e;
    trainer.z = Math.sin(p * Math.PI) * (trainer.jumpPeakZ || 75); // Soaring 3D parabolic arc over arena wall

    trainer.vx = (trainer.jumpTargetX - trainer.jumpStartX) / trainer.jumpDuration;
    trainer.vy = (trainer.jumpTargetY - trainer.jumpStartY) / trainer.jumpDuration;

    if (trainer.activePokemon) {
      trainer.aim(trainer.activePokemon);
    } else if (opponent) {
      trainer.aim(opponent);
    }

    if (p >= 1.0) {
      trainer.x = trainer.jumpTargetX;
      trainer.y = trainer.jumpTargetY;
      trainer.z = 0;
      trainer.vx = 0;
      trainer.vy = 0;
      trainer.jumpState = 'outside';
      trainer.isJumpedOut = true;
      trainer.isUntargetable = true;
      trainer.untargetable = true;
      trainer.cannotBeTargeted = true;
      trainer.isTargetable = false;
      trainer.isInvulnerable = true;
      trainer.isInvincible = true;
      trainer.invincible = true;
      trainer.invincibilityTimer = 999999;

      if (typeof spawnSparks === 'function') {
        spawnSparks(trainer.x, trainer.y, 6, '#F8FAFC');
      }
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(trainer.x, trainer.y, 25, '#FFFFFF');
      }
    }
    return;
  }

  if (trainer.jumpState === 'jumping_in') {
    trainer.jumpTimer++;
    const p = Math.min(1.0, trainer.jumpTimer / Math.max(1, trainer.jumpDuration));
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

    trainer.x = trainer.jumpStartX + (trainer.jumpTargetX - trainer.jumpStartX) * e;
    trainer.y = trainer.jumpStartY + (trainer.jumpTargetY - trainer.jumpStartY) * e;
    trainer.z = Math.sin(p * Math.PI) * (trainer.jumpPeakZ || 72);

    trainer.vx = (trainer.jumpTargetX - trainer.jumpStartX) / trainer.jumpDuration;
    trainer.vy = (trainer.jumpTargetY - trainer.jumpStartY) / trainer.jumpDuration;

    if (opponent) {
      trainer.aim(opponent);
    }

    if (p >= 1.0) {
      trainer.x = trainer.jumpTargetX;
      trainer.y = trainer.jumpTargetY;
      trainer.z = 0;
      trainer.vx = 0;
      trainer.vy = 0;
      trainer.jumpState = 'inside';
      trainer.isJumpedOut = false;
      trainer.isUntargetable = false;
      trainer.untargetable = false;
      trainer.cannotBeTargeted = false;
      trainer.isTargetable = true;
      trainer.isInvulnerable = false;
      trainer.isInvincible = false;
      trainer.invincible = false;
      trainer.invincibilityTimer = 0;
      trainer.trainerVantagePoint = null;

      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(trainer.x, trainer.y, 35, '#FFFFFF');
      }
      if (typeof spawnSparks === 'function') {
        spawnSparks(trainer.x, trainer.y, 8, '#F8FAFC');
      }
    }
    return;
  }
}

/**
 * Checks whether a Pokémon Trainer is currently jumped out or leaping outside the arena
 * and therefore completely untargetable and immune to incoming damage/detection.
 *
 * @param {Object} trainer
 * @returns {boolean}
 */
export function isTrainerUntargetable(trainer) {
  if (!trainer) return false;
  return Boolean(
    trainer.isJumpedOut ||
    trainer.jumpState === 'outside' ||
    trainer.jumpState === 'jumping_out' ||
    trainer.isUntargetable ||
    trainer.untargetable ||
    trainer.cannotBeTargeted ||
    trainer.isTargetable === false ||
    trainer.isInvulnerable ||
    trainer.isInvincible ||
    trainer.invincible ||
    (trainer.invincibilityTimer && trainer.invincibilityTimer > 0) ||
    (trainer.isPokemonTrainer && trainer.activePokemon && (trainer.activePokemon.hp > 0 || trainer.activePokemon.isFainting))
  );
}

/**
 * Evaluates incoming projectile threats or approaching enemies to orient a Pokémon Trainer's
 * directional Honeycomb Barrier shield.
 *
 * @param {Object} trainer - The Pokémon Trainer fighter instance
 * @param {Object} [primaryTarget=null] - Primary opponent fallback
 * @param {Array<Object>} [enemiesList=null] - Precomputed valid enemies list
 */
export function checkTrainerIncomingThreats(trainer, primaryTarget = null, enemiesList = null) {
  if (!trainer || !trainer.isProtectedByHoneycombBarrier) return;
  const bRadius = trainer.honeycombBarrierRadius || 46;
  const threatDist = bRadius + 110;

  // 1. Check incoming projectiles moving toward the trainer
  if (typeof state !== 'undefined' && Array.isArray(state.projectiles)) {
    for (let i = 0; i < state.projectiles.length; i++) {
      const p = state.projectiles[i];
      if (!p || p.dead || p.life <= 0) continue;
      if (p.owner === trainer || p.owner === trainer.activePokemon) continue;
      if (trainer.teamId !== undefined && p.teamId !== undefined && trainer.teamId === p.teamId) continue;

      const pdx = trainer.x - p.x;
      const pdy = trainer.y - p.y;
      const pDist = Math.hypot(pdx, pdy);
      if (pDist <= threatDist) {
        const dot = (p.vx || 0) * pdx + (p.vy || 0) * pdy;
        if (dot > 0 || pDist <= bRadius + 25) {
          trainer.barrierAngle = Math.atan2(p.y - trainer.y, p.x - trainer.x);
          trainer.barrierActiveTimer = Math.max(trainer.barrierActiveTimer || 0, 12);
          return;
        }
      }
    }
  }

  // 2. Check nearby enemy fighters attacking or moving toward the trainer
  const enemies = enemiesList || (typeof trainer._getValidEnemyTargets === 'function'
    ? trainer._getValidEnemyTargets(primaryTarget)
    : (primaryTarget ? [primaryTarget] : []));

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (!enemy || enemy.hp <= 0) continue;
    const edx = enemy.x - trainer.x;
    const edy = enemy.y - trainer.y;
    const dist = Math.hypot(edx, edy);
    if (dist <= threatDist) {
      const enemyAimingAtTrainer = Math.abs(Math.atan2(-edy, -edx) - (enemy.gunAngle || 0)) < 1.0;
      const enemyMovingToTrainer = ((enemy.vx || 0) * -edx + (enemy.vy || 0) * -edy) > 0;
      if (enemyAimingAtTrainer || enemyMovingToTrainer || dist <= bRadius + 30) {
        trainer.barrierAngle = Math.atan2(edy, edx);
        trainer.barrierActiveTimer = Math.max(trainer.barrierActiveTimer || 0, 10);
        return;
      }
    }
  }
}

/**
 * Fraction of `thrownPokeball.maxTimer` at which the Poké Ball detaches from the trainer's
 * whipping hand and launches into airborne trajectory.
 */
export const POKEBALL_THROW_RELEASE_RATIO = 0.28;

/**
 * Converts a local point `(lx, ly)` in trainer skin space (`+X` forward, `-Y` up, `+Y` down)
 * into world coordinates `(worldX, worldY)`.
 *
 * @param {Object} trainer
 * @param {number} lx
 * @param {number} ly
 * @param {number} [angleOverride]
 * @returns {{ x: number, y: number }}
 */
export function trainerLocalToWorld(trainer, lx, ly, angleOverride = undefined) {
  const angle = angleOverride !== undefined ? angleOverride : (trainer?.gunAngle || 0);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  const flipY = facingLeft ? -1 : 1;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const fy = ly * flipY;
  return {
    x: (trainer?.x || 0) + lx * cosA - fy * sinA,
    y: ((trainer?.y || 0) - (trainer?.z || 0)) + lx * sinA + fy * cosA
  };
}

/**
 * Computes the target 4-phase throw kinematics (`windup` -> `whip` -> `followThrough` -> `settle`)
 * in local trainer coordinate space (`+X` forward, `-Y` up, `+Y` down).
 *
 * @param {number} throwProgress - Normalized progress in [0, 1] across the full throw animation
 * @param {number} [r=25] - Trainer body radius
 * @returns {Object}
 */
export function computeTrainerThrowTargetKinematics(throwProgress, r = 25) {
  const p = Math.max(0, Math.min(1, throwProgress));

  if (p <= 0 || p >= 1) {
    return {
      phase: 'idle',
      leftOffsetX: 0,
      leftOffsetY: 0,
      leftScale: 1.0,
      rightOffsetX: 0,
      rightOffsetY: 0,
      rightScale: 1.0,
      torsoOffsetX: 0,
      torsoOffsetY: 0,
      torsoRot: 0,
      whipIntensity: 0
    };
  }

  // Phase 1: Windup Coil (0.00 <= p < 0.18)
  // Right hand (holding Poké Ball) coils back and up behind the trainer's shoulder;
  // Left hand extends forward as a lead sighting counter-balance.
  if (p < 0.18) {
    const t = p / 0.18;
    const ease = 1 - Math.pow(1 - t, 3);
    return {
      phase: 'windup',
      leftOffsetX: (+r * 1.68) * ease,
      leftOffsetY: (-r * 0.34) * ease,
      leftScale: 1.0 + 0.04 * ease,
      rightOffsetX: (-r * 1.28) * ease,
      rightOffsetY: (-r * 0.78) * ease,
      rightScale: 1.0 + 0.10 * ease,
      torsoOffsetX: (-r * 0.12) * ease,
      torsoOffsetY: (+r * 0.04) * ease,
      torsoRot: -0.12 * ease,
      whipIntensity: 0
    };
  }

  // Phase 2: Overhead / Sidearm Whip to Release Apex (0.18 <= p < 0.36)
  // Right hand whips overhead with exponential acceleration; left hand pulls back to hip for lever torque.
  if (p < 0.36) {
    const t = (p - 0.18) / 0.18;
    const whipP = Math.pow(t, 1.85);
    const arcLift = Math.sin(t * Math.PI) * (r * 0.42);
    return {
      phase: 'whip',
      leftOffsetX: (+r * 1.68) * (1 - whipP) + (-r * 0.16) * whipP,
      leftOffsetY: (-r * 0.34) * (1 - whipP) + (+r * 0.08) * whipP,
      leftScale: 1.04 - 0.04 * whipP,
      rightOffsetX: (-r * 1.28) + (r * 1.88) * whipP,
      rightOffsetY: (-r * 0.78) + (r * 0.30) * whipP - arcLift,
      rightScale: 1.10 + 0.08 * Math.sin(t * Math.PI),
      torsoOffsetX: (-r * 0.12) * (1 - whipP) + (+r * 0.16) * whipP,
      torsoOffsetY: (+r * 0.04) * (1 - whipP) + (-r * 0.05) * whipP,
      torsoRot: (-0.12) * (1 - whipP) + (+0.14) * whipP,
      whipIntensity: Math.sin(t * Math.PI)
    };
  }

  // Phase 3: Outstretched Follow-Through & Wrist Snap Lock (0.36 <= p < 0.64)
  // Right hand holds the iconic outstretched "I CHOOSE YOU!" release follow-through with wrist snap.
  if (p < 0.64) {
    const t = (p - 0.36) / 0.28;
    const snapP = 1 - Math.pow(1 - t, 2.2);
    return {
      phase: 'followThrough',
      leftOffsetX: -r * 0.16,
      leftOffsetY: +r * 0.08,
      leftScale: 1.0,
      rightOffsetX: (+r * 0.60) + (+r * 0.06) * Math.sin(t * Math.PI),
      rightOffsetY: (-r * 0.48) + (+r * 0.22) * snapP,
      rightScale: 1.08 - 0.06 * snapP,
      torsoOffsetX: (+r * 0.16) * (1 - 0.25 * snapP),
      torsoOffsetY: (-r * 0.05) * (1 - 0.25 * snapP),
      torsoRot: (+0.14) * (1 - 0.25 * snapP),
      whipIntensity: Math.max(0, (1 - t * 1.8) * 0.45)
    };
  }

  // Phase 4: Spring-Damped Settle Back to Canonical Stance (0.64 <= p <= 1.00)
  const t = (p - 0.64) / 0.36;
  const decay = Math.pow(1 - t, 2);
  const springWave = Math.cos(t * Math.PI * 2.2) * decay;
  return {
    phase: 'settle',
    leftOffsetX: (-r * 0.16) * springWave,
    leftOffsetY: (+r * 0.08) * springWave,
    leftScale: 1.0,
    rightOffsetX: (+r * 0.60) * springWave,
    rightOffsetY: (-r * 0.26) * springWave,
    rightScale: 1.0,
    torsoOffsetX: (+r * 0.12) * springWave,
    torsoOffsetY: (-r * 0.04) * springWave,
    torsoRot: (+0.10) * springWave,
    whipIntensity: 0
  };
}

/**
 * Initiates a smooth multi-phase Poké Ball throw animation and primes the trainer's spring-damped hand physics.
 *
 * @param {Object} trainer - Pokémon Trainer fighter instance
 * @param {Object} params - { speciesKey, targetX, targetY, throwAngle, flightFrames }
 * @returns {Object} The created `thrownPokeball` state object
 */
export function startTrainerPokeballThrow(trainer, params = {}) {
  if (!trainer) return null;
  if (!trainer.handPhysics) {
    trainer.handPhysics = createTrainerHandPhysicsState();
  }

  const r = trainer.r || 25;
  const throwAngle = params.throwAngle ?? trainer.gunAngle ?? 0;
  const flightFrames = params.flightFrames || 18;
  const animFrames = Math.max(flightFrames + 12, params.animFrames || 30);

  trainer.pokeballThrowAngle = throwAngle;
  trainer.pokeballThrowAnimMax = animFrames;
  trainer.pokeballThrowAnimTimer = animFrames;
  trainer.pokeballThrowPhase = 'windup';

  // Impulse-prime the spring velocities so the windup coil starts with organic physical snap
  trainer.handPhysics.rightVx = -r * 0.18;
  trainer.handPhysics.rightVy = -r * 0.12;
  trainer.handPhysics.leftVx = +r * 0.20;
  trainer.handPhysics.leftVy = -r * 0.06;

  // Release world point corresponds to the outstretched right hand apex (+1.42r, -0.10r)
  const releaseWorld = trainerLocalToWorld(trainer, r * 1.42, -r * 0.10, throwAngle);

  const ball = {
    speciesKey: params.speciesKey,
    startX: releaseWorld.x,
    startY: releaseWorld.y,
    targetX: params.targetX,
    targetY: params.targetY,
    timer: flightFrames,
    maxTimer: flightFrames,
    releaseRatio: POKEBALL_THROW_RELEASE_RATIO,
    throwAngle
  };

  trainer.thrownPokeball = ball;
  return ball;
}

/**
 * Advances the Pokémon Trainer's throw animation timer and integrates Hooke's Law spring-damper
 * hand & torso physics each frame. Safe to call at the top of `update()` before freeze guards (Rule 25).
 *
 * @param {Object} trainer - Pokémon Trainer fighter instance
 */
export function updateTrainerThrowPhysics(trainer) {
  if (!trainer) return;
  if (!trainer.handPhysics) {
    trainer.handPhysics = createTrainerHandPhysicsState();
  }

  const hp = trainer.handPhysics;
  const r = trainer.r || 25;

  let throwProgress = 0;
  if (trainer.pokeballThrowAnimTimer > 0) {
    trainer.pokeballThrowAnimTimer--;
    const maxT = Math.max(1, trainer.pokeballThrowAnimMax || 30);
    throwProgress = 1.0 - (trainer.pokeballThrowAnimTimer / maxT);
  } else if (trainer.thrownPokeball) {
    const ball = trainer.thrownPokeball;
    const ballP = 1.0 - (ball.timer / Math.max(1, ball.maxTimer || 18));
    throwProgress = Math.min(0.65, ballP * 0.65);
  }

  const targetKin = computeTrainerThrowTargetKinematics(throwProgress, r);
  trainer.pokeballThrowPhase = targetKin.phase === 'idle' ? null : targetKin.phase;

  // Trainer hands remain strictly stationary at canonical Rule 20 flanks during walk/evade/movement.
  // Arms and hands only move during active Poké Ball throws (targetKin.phase !== 'idle').
  const targetLeftX = targetKin.leftOffsetX;
  const targetLeftY = targetKin.leftOffsetY;
  const targetRightX = targetKin.rightOffsetX;
  const targetRightY = targetKin.rightOffsetY;

  // Hooke's Law spring-damper integration (stiffer during active whip for crisp responsiveness, softer on settle)
  const stiffness = (targetKin.phase === 'whip' || targetKin.phase === 'windup') ? 0.42 : 0.24;
  const damping = (targetKin.phase === 'whip') ? 0.68 : 0.74;

  hp.leftVx = (hp.leftVx + (targetLeftX - hp.leftOffsetX) * stiffness) * damping;
  hp.leftVy = (hp.leftVy + (targetLeftY - hp.leftOffsetY) * stiffness) * damping;
  hp.leftOffsetX += hp.leftVx;
  hp.leftOffsetY += hp.leftVy;
  hp.leftScale = targetKin.leftScale;

  hp.rightVx = (hp.rightVx + (targetRightX - hp.rightOffsetX) * stiffness) * damping;
  hp.rightVy = (hp.rightVy + (targetRightY - hp.rightOffsetY) * stiffness) * damping;
  hp.rightOffsetX += hp.rightVx;
  hp.rightOffsetY += hp.rightVy;
  hp.rightScale = targetKin.rightScale;

  hp.torsoVx = (hp.torsoVx + (targetKin.torsoOffsetX - hp.torsoOffsetX) * stiffness) * damping;
  hp.torsoVy = (hp.torsoVy + (targetKin.torsoOffsetY - hp.torsoOffsetY) * stiffness) * damping;
  hp.torsoVRot = (hp.torsoVRot + (targetKin.torsoRot - hp.torsoRot) * stiffness) * damping;
  hp.torsoOffsetX += hp.torsoVx;
  hp.torsoOffsetY += hp.torsoVy;
  hp.torsoRot += hp.torsoVRot;

  // Snap idle spring offsets cleanly when small so spring oscillation terminates completely (Anti-Jitter)
  if (targetKin.phase === 'idle') {
    if (Math.abs(hp.torsoOffsetX) < 0.05 && Math.abs(hp.torsoVx) < 0.05) {
      hp.torsoOffsetX = 0;
      hp.torsoVx = 0;
    }
    if (Math.abs(hp.torsoOffsetY) < 0.05 && Math.abs(hp.torsoVy) < 0.05) {
      hp.torsoOffsetY = 0;
      hp.torsoVy = 0;
    }
    if (Math.abs(hp.torsoRot) < 0.02 && Math.abs(hp.torsoVRot) < 0.02) {
      hp.torsoRot = 0;
      hp.torsoVRot = 0;
    }
    if (Math.abs(hp.leftOffsetX) < 0.05 && Math.abs(hp.leftVx) < 0.05) {
      hp.leftOffsetX = 0;
      hp.leftVx = 0;
    }
    if (Math.abs(hp.leftOffsetY) < 0.05 && Math.abs(hp.leftVy) < 0.05) {
      hp.leftOffsetY = 0;
      hp.leftVy = 0;
    }
    if (Math.abs(hp.rightOffsetX) < 0.05 && Math.abs(hp.rightVx) < 0.05) {
      hp.rightOffsetX = 0;
      hp.rightVx = 0;
    }
    if (Math.abs(hp.rightOffsetY) < 0.05 && Math.abs(hp.rightVy) < 0.05) {
      hp.rightOffsetY = 0;
      hp.rightVy = 0;
    }
  }

  // Keep thrownPokeball launch origin synchronized with the trainer's right hand until the release frame
  if (trainer.thrownPokeball) {
    const ball = trainer.thrownPokeball;
    const ballP = 1.0 - (ball.timer / Math.max(1, ball.maxTimer || 18));
    const releaseRatio = ball.releaseRatio ?? POKEBALL_THROW_RELEASE_RATIO;
    if (ballP <= releaseRatio) {
      const rightHandLocalX = r * 0.82 + hp.rightOffsetX;
      const rightHandLocalY = r * 0.38 + hp.rightOffsetY;
      const handWorld = trainerLocalToWorld(trainer, rightHandLocalX, rightHandLocalY, ball.throwAngle ?? trainer.gunAngle);
      ball.startX = handWorld.x;
      ball.startY = handWorld.y;
    }
  }
}

/**
 * Solves 2-bone analytical Inverse Kinematics (IK) for a trainer's arm from shoulder to hand.
 *
 * @param {number} sx - Shoulder X
 * @param {number} sy - Shoulder Y
 * @param {number} hx - Hand X
 * @param {number} hy - Hand Y
 * @param {number} r - Trainer body radius
 * @param {number} [bendDir=1] - +1 or -1 outward elbow bend direction
 * @returns {{ x: number, y: number }} Elbow coordinate in local trainer space
 */
function _solveTrainerElbowIK(sx, sy, hx, hy, r, bendDir = 1) {
  const dx = hx - sx;
  const dy = hy - sy;
  const dist = Math.hypot(dx, dy) || 0.001;
  // Scale elbow outward bend smoothly with arm extension so short distances have gentle natural bend
  const extRatio = Math.max(0, Math.min(1, (dist - r * 0.22) / (r * 0.85)));
  const elbowPop = (r * 0.26) * (1 - extRatio * 0.55) * extRatio;
  const nx = -dy / dist;
  const ny = dx / dist;
  return {
    x: (sx + hx) * 0.5 + nx * elbowPop * bendDir,
    y: (sy + hy) * 0.5 + ny * elbowPop * bendDir
  };
}

/**
 * Computes the complete render-ready hand, elbow, shoulder, torso, and held Poké Ball state
 * for a Pokémon Trainer in local character coordinates (Rule 20 & Rule 30 compliant).
 *
 * @param {Object} trainer - Pokémon Trainer fighter instance
 * @param {number} [r=25] - Body radius
 * @returns {Object}
 */
export function getTrainerHandRenderState(trainer, r = 25) {
  const baseLeftX = -r * 0.82;
  const baseLeftY = r * 0.38;
  const baseRightX = r * 0.82;
  const baseRightY = r * 0.38;

  const leftShoulder = { x: -r * 0.64, y: r * 0.24 };
  const rightShoulder = { x: r * 0.64, y: r * 0.24 };

  // Determine active throw progress from either pokeballThrowAnimTimer or thrownPokeball
  let throwProgress = 0;
  if (trainer && (trainer.pokeballThrowAnimTimer || 0) > 0) {
    const maxT = Math.max(1, trainer.pokeballThrowAnimMax || 30);
    throwProgress = 1.0 - (trainer.pokeballThrowAnimTimer / maxT);
  } else if (trainer && trainer.thrownPokeball) {
    const ball = trainer.thrownPokeball;
    const ballP = 1.0 - (ball.timer / Math.max(1, ball.maxTimer || 18));
    throwProgress = Math.min(0.60, Math.max(0.08, ballP * 0.60));
  }

  const targetKin = computeTrainerThrowTargetKinematics(throwProgress, r);
  const hp = trainer?.handPhysics;

  // Blend live spring-damper physics with deterministic target kinematics (ensures frame-0 preview & test accuracy)
  const hasSpringOffset = Boolean(
    hp && (
      Math.abs(hp.rightOffsetX) > 0.05 ||
      Math.abs(hp.rightOffsetY) > 0.05 ||
      Math.abs(hp.leftOffsetX) > 0.05 ||
      Math.abs(hp.leftOffsetY) > 0.05
    )
  );

  const leftOffX = hasSpringOffset ? (hp.leftOffsetX * 0.72 + targetKin.leftOffsetX * 0.28) : targetKin.leftOffsetX;
  const leftOffY = hasSpringOffset ? (hp.leftOffsetY * 0.72 + targetKin.leftOffsetY * 0.28) : targetKin.leftOffsetY;
  const rightOffX = hasSpringOffset ? (hp.rightOffsetX * 0.72 + targetKin.rightOffsetX * 0.28) : targetKin.rightOffsetX;
  const rightOffY = hasSpringOffset ? (hp.rightOffsetY * 0.72 + targetKin.rightOffsetY * 0.28) : targetKin.rightOffsetY;

  const torsoOffX = hasSpringOffset ? (hp.torsoOffsetX * 0.72 + targetKin.torsoOffsetX * 0.28) : targetKin.torsoOffsetX;
  const torsoOffY = hasSpringOffset ? (hp.torsoOffsetY * 0.72 + targetKin.torsoOffsetY * 0.28) : targetKin.torsoOffsetY;
  const torsoRot = hasSpringOffset ? (hp.torsoRot * 0.72 + targetKin.torsoRot * 0.28) : targetKin.torsoRot;

  const leftHandX = baseLeftX + leftOffX;
  const leftHandY = baseLeftY + leftOffY;
  const rightHandX = baseRightX + rightOffX;
  const rightHandY = baseRightY + rightOffY;

  const leftElbow = _solveTrainerElbowIK(leftShoulder.x, leftShoulder.y, leftHandX, leftHandY, r, -1);
  const rightElbow = _solveTrainerElbowIK(rightShoulder.x, rightShoulder.y, rightHandX, rightHandY, r, +1);

  // Determine whether the Poké Ball is currently held in the trainer's right hand:
  // - Held during idle when no Pokémon is out and not in post-throw follow-through
  // - Held during the 'windup' and early 'whip' phases of a throw before releaseRatio
  // - Hidden once the ball leaves the hand in mid-air or while a Pokémon is active on the field
  let isBallInHand = false;
  if (trainer?._isWinnerReveal) {
    isBallInHand = true;
  } else if (trainer?.thrownPokeball) {
    const ball = trainer.thrownPokeball;
    const ballP = 1.0 - (ball.timer / Math.max(1, ball.maxTimer || 18));
    const releaseRatio = ball.releaseRatio ?? POKEBALL_THROW_RELEASE_RATIO;
    isBallInHand = ballP < releaseRatio;
  } else if ((trainer?.pokeballThrowAnimTimer || 0) > 0) {
    // Ball has already been released; hand is in followThrough / settle
    isBallInHand = false;
  } else if (!trainer?.activePokemon) {
    isBallInHand = true;
  }

  return {
    phase: targetKin.phase,
    throwProgress,
    whipIntensity: targetKin.whipIntensity || 0,
    isThrowing: targetKin.phase !== 'idle',
    isBallInHand,
    torso: {
      x: torsoOffX,
      y: torsoOffY,
      rot: torsoRot
    },
    leftShoulder,
    leftElbow,
    leftHand: {
      x: leftHandX,
      y: leftHandY,
      scale: hp?.leftScale || targetKin.leftScale || 1.0
    },
    rightShoulder,
    rightElbow,
    rightHand: {
      x: rightHandX,
      y: rightHandY,
      scale: hp?.rightScale || targetKin.rightScale || 1.0
    }
  };
}

/**
 * Draws a 2-segment muscular trainer jacket sleeve & forearm linkage connecting the shoulder
 * through the IK elbow to the hand (Rule 30 Physical Force Drive).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} shoulder - { x, y }
 * @param {Object} elbow - { x, y }
 * @param {Object} hand - { x, y }
 * @param {number} r - Trainer body radius
 * @param {Object} [palette={}] - { sleeveColor, cuffColor, skinColor, outlineColor }
 */
export function drawTrainerArmLinkage(ctx, shoulder, elbow, hand, r = 25, palette = {}) {
  const dist = Math.hypot(hand.x - shoulder.x, hand.y - shoulder.y);
  // Only render visible extended arm linkage when hand extends noticeably beyond resting flank overlap
  if (dist < r * 0.42) return;

  const sleeveColor = palette.sleeveColor || '#1D4ED8';
  const skinColor = palette.skinColor || '#E8BD9B';
  const outlineColor = palette.outlineColor || '#0E0F14';

  const upperW = Math.max(5.0, r * 0.25);
  const foreW = Math.max(4.2, r * 0.20);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Forearm (Elbow -> Hand): Manga ink outer stroke + skin tone fill
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = foreW + 2.8;
  ctx.beginPath();
  ctx.moveTo(elbow.x, elbow.y);
  ctx.lineTo(hand.x, hand.y);
  ctx.stroke();

  ctx.strokeStyle = skinColor;
  ctx.lineWidth = foreW;
  ctx.beginPath();
  ctx.moveTo(elbow.x, elbow.y);
  ctx.lineTo(hand.x, hand.y);
  ctx.stroke();

  // 2. Upper Arm Trainer Jacket Sleeve (Shoulder -> Elbow): Manga ink stroke + sleeve fill
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = upperW + 3.0;
  ctx.beginPath();
  ctx.moveTo(shoulder.x, shoulder.y);
  ctx.lineTo(elbow.x, elbow.y);
  ctx.stroke();

  ctx.strokeStyle = sleeveColor;
  ctx.lineWidth = upperW;
  ctx.beginPath();
  ctx.moveTo(shoulder.x, shoulder.y);
  ctx.lineTo(elbow.x, elbow.y);
  ctx.stroke();

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Pokémon Battle Targeting Priority System (Active Pokémon First)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the entity is a living, non-fainting summoned Pokémon companion.
 *
 * @param {Object} entity
 * @returns {boolean}
 */
export function isActivePokemonTarget(entity) {
  return Boolean(
    entity &&
    entity.isPokemonCompanion &&
    entity.hp > 0 &&
    !entity.dead &&
    !entity.isDead &&
    !entity.isFainting
  );
}

/**
 * Gathers all valid enemy targets for a Pokémon Trainer and their active Pokémon.
 * Automatically includes an enemy trainer's activePokemon even if only the trainer
 * was passed as fallbackOpponent in standalone tests.
 *
 * @param {Object} trainer - The Pokémon Trainer fighter
 * @param {Object} [fallbackOpponent=null] - Optional fallback opponent
 * @returns {Array<Object>}
 */
export function getValidTrainerEnemyTargets(trainer, fallbackOpponent = null) {
  const targets = [];
  if (!trainer) return targets;

  const isFriendly = (entity) => {
    if (!entity || entity === trainer || entity === trainer.activePokemon) return true;
    if (entity.owner === trainer) return true;
    if (typeof trainer.isTeammate === 'function' && trainer.isTeammate(entity)) return true;
    if (trainer.teamId !== undefined && entity.teamId !== undefined && trainer.teamId === entity.teamId) return true;
    if (
      typeof state !== 'undefined' &&
      typeof state.getFighterTeam === 'function' &&
      Array.isArray(state.fighters)
    ) {
      const trainerIdx = trainer._stateIdx !== undefined ? trainer._stateIdx : state.fighters.indexOf(trainer);
      const entityRef = entity.owner || entity;
      const entityIdx = entityRef._stateIdx !== undefined ? entityRef._stateIdx : state.fighters.indexOf(entityRef);
      if (trainerIdx !== -1 && entityIdx !== -1) {
        const tTeam = state.getFighterTeam(trainerIdx);
        const eTeam = state.getFighterTeam(entityIdx);
        if (tTeam !== null && eTeam !== null && tTeam === eTeam) return true;
      }
    }
    return false;
  };

  const addCandidate = (candidate) => {
    if (!candidate || candidate.hp <= 0 || candidate.dead || candidate.isDead || candidate.isFainting) return;
    if (isFriendly(candidate)) return;

    // Do not target trainers or entities who are untargetable / jumped out outside the arena
    const isUntargetableCandidate = Boolean(
      candidate.isUntargetable ||
      candidate.untargetable ||
      candidate.cannotBeTargeted ||
      candidate.isTargetable === false ||
      candidate.isJumpedOut ||
      candidate.jumpState === 'outside' ||
      candidate.jumpState === 'jumping_out'
    );

    if (!isUntargetableCandidate && !targets.includes(candidate)) {
      targets.push(candidate);
    }
    // If this enemy is a Pokémon Trainer with an active Pokémon out, ensure their active Pokémon is also in the candidate list
    if (candidate.activePokemon && isActivePokemonTarget(candidate.activePokemon) && !isFriendly(candidate.activePokemon)) {
      if (!targets.includes(candidate.activePokemon)) {
        targets.push(candidate.activePokemon);
      }
    }
  };

  if (typeof state !== 'undefined' && Array.isArray(state.fighters)) {
    for (let i = 0; i < state.fighters.length; i++) {
      addCandidate(state.fighters[i]);
    }
  }

  if (fallbackOpponent) {
    addCandidate(fallbackOpponent);
  }

  return targets;
}

/**
 * Finds the best combat target for a Pokémon or Pokémon Trainer.
 * Rule: When there is an active enemy Pokémon on the field (a Pokémon battle),
 * Pokémon ALWAYS prioritize attacking active enemy Pokémon over any nearest fighter or Trainer!
 * Only when no enemy Pokémon are active on the field does targeting fall back to the nearest enemy fighter.
 *
 * @param {Object} trainer - The Pokémon Trainer fighter
 * @param {Object} [fallbackOpponent=null] - Fallback opponent
 * @param {Object} [originEntity=null] - Reference entity to measure distance from (defaults to activePokemon or trainer)
 * @returns {Object|null}
 */
export function findBestPokemonTarget(trainer, fallbackOpponent = null, originEntity = null) {
  const enemies = getValidTrainerEnemyTargets(trainer, fallbackOpponent);
  if (enemies.length === 0) return null;

  const ref = originEntity || (trainer?.activePokemon && trainer.activePokemon.hp > 0 ? trainer.activePokemon : trainer);
  const refX = typeof ref?.x === 'number' ? ref.x : (trainer?.x || 0);
  const refY = typeof ref?.y === 'number' ? ref.y : (trainer?.y || 0);

  // 1. Prioritize active enemy Pokémon first!
  let bestPokemon = null;
  let bestPokemonDist = Infinity;
  let bestFallback = null;
  let bestFallbackDist = Infinity;

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e || e.hp <= 0 || e.dead || e.isDead || e.isFainting) continue;
    const d = Math.hypot(e.x - refX, e.y - refY);

    if (isActivePokemonTarget(e)) {
      if (d < bestPokemonDist) {
        bestPokemonDist = d;
        bestPokemon = e;
      }
    } else if (d < bestFallbackDist) {
      bestFallbackDist = d;
      bestFallback = e;
    }
  }

  return bestPokemon || bestFallback;
}

/**
 * Checks whether a Pokémon is currently channeling or casting a stationary skill
 * (such as Pikachu's Thunderbolt or Charizard's Flamethrower) during which
 * autonomous movement and velocity adjustments are suspended.
 *
 * @param {Object} pokemon
 * @returns {boolean}
 */
export function isPokemonStationarySkill(pokemon) {
  if (!pokemon) return false;
  return Boolean(
    pokemon.thunderboltState ||
    pokemon.flamethrowerState ||
    pokemon.isStationarySkillActive ||
    (typeof pokemon.stationarySkillTimer === 'number' && pokemon.stationarySkillTimer > 0)
  );
}

/**
 * Centralized companion movement physics for current and future Pokémon:
 * Preserves standard Fighter bounce momentum across wall and fighter collisions,
 * recovering launch speed if velocity ever stalls near zero while not channeling a stationary skill.
 *
 * @param {Object} pokemon - The Pokémon companion entity
 * @param {Object} [target=null] - The target being pursued/attacked
 * @param {Object} [arena=null] - The arena boundary definition
 */
export function updatePokemonCompanionMovement(pokemon, target, arena) {
  if (!pokemon || isPokemonStationarySkill(pokemon)) return;

  const curSpeed = Math.hypot(pokemon.vx || 0, pokemon.vy || 0);
  if (curSpeed < 0.2) {
    const resumeAngle = pokemon.gunAngle || pokemon.angle || (Math.random() * Math.PI * 2);
    const speed = pokemon.speed || pokemon.baseSpeed || 5.5;
    pokemon.vx = Math.cos(resumeAngle) * speed;
    pokemon.vy = Math.sin(resumeAngle) * speed;
  } else if (typeof pokemon.normalizeSpeed === 'function') {
    pokemon.normalizeSpeed();
  }
}

/**
 * Updates a Pokémon companion's animation state based on its current action, movement, and hurt status.
 *
 * @param {Object} pokemon
 */
export function updatePokemonCompanionAnimState(pokemon) {
  if (!pokemon) return;
  if (pokemon.hurtAnimTimer > 0 && !isPokemonStationarySkill(pokemon)) {
    pokemon.animState = 'hurt';
  } else if (pokemon.actionAnimTimer > 0 || pokemon.meleeMoveState) {
    pokemon.animState = 'attack';
  } else if (Math.hypot(pokemon.vx || 0, pokemon.vy || 0) > 0.6) {
    pokemon.animState = 'walk';
  } else {
    pokemon.animState = 'idle';
  }
}

/**
 * Standardized global hit effect applicator for Pokémon companions:
 * Activates hitFlashTimer and triggers global impact flash & sparks for non-DoT hits,
 * matching regular combat fighters while respecting blood suppression.
 *
 * @param {Object} pokemon - The Pokémon entity taking damage
 * @param {Object} [attacker=null] - Attacker entity
 * @param {Object} [opts={}] - Damage options
 */
export function applyPokemonDamageHitEffects(pokemon, attacker, opts = {}) {
  if (!pokemon) return;

  const isDoTHit = Boolean(opts.isPoison || opts.isBurn || opts.isFlame || opts.isBleed || opts.source === 'bleed');
  if (!isDoTHit) {
    pokemon.hitFlashTimer = 8;
    const r = pokemon.r || pokemon.radius || 22;
    if (typeof spawnImpactFlash === 'function') {
      spawnImpactFlash(pokemon.x, pokemon.y, Math.max(22, r * 1.15), '#FFFFFF');
    }
    if (typeof spawnSparks === 'function') {
      spawnSparks(pokemon.x, pokemon.y, 6, 'crimsonSniper');
    }
  }
}

// Dedicated offscreen buffer for pixel-perfect sprite hit-flash silhouette (Rule 29 / Arcade standard)
let _pokeFlashCanvas = null;
let _pokeFlashCtx = null;

function _ensurePokeFlashBuffer(w, h) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  // Node.js test environment guard (e.g. testAllFighters / testInteractions mock canvases)
  if (typeof process !== 'undefined' && process.versions && process.versions.node) return null;

  const targetW = Math.max(160, Math.ceil(w));
  const targetH = Math.max(160, Math.ceil(h));

  if (!_pokeFlashCanvas) {
    _pokeFlashCanvas = document.createElement('canvas');
    _pokeFlashCanvas.width = targetW;
    _pokeFlashCanvas.height = targetH;
    _pokeFlashCtx = _pokeFlashCanvas.getContext('2d', { willReadFrequently: false });
    if (_pokeFlashCtx) _pokeFlashCtx.imageSmoothingEnabled = false;
  } else if (_pokeFlashCanvas.width < targetW || _pokeFlashCanvas.height < targetH) {
    _pokeFlashCanvas.width = Math.max(_pokeFlashCanvas.width, targetW);
    _pokeFlashCanvas.height = Math.max(_pokeFlashCanvas.height, targetH);
    if (_pokeFlashCtx) _pokeFlashCtx.imageSmoothingEnabled = false;
  }
  return _pokeFlashCtx ? { canvas: _pokeFlashCanvas, ctx: _pokeFlashCtx } : null;
}

/**
 * Centralized global white hit-flash overlay rendering for Pokémon companions:
 * Masks and renders a 1:1 pixel-perfect white silhouette of the Pokémon's EXACT sprite model
 * (ears, wings, tail, horns, scarf, claws) whenever hitFlashTimer is active, matching
 * authentic 2D sprite fighting game hit-flash visuals with zero circular artifacts.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context (translated to pokemon.x, pokemon.y - z)
 * @param {Object} pokemon - The Pokémon entity
 * @param {HTMLImageElement|ImageBitmap|CanvasImageSource} [sheetImg=null] - The PMD sprite sheet image
 * @param {number} [sx=0] - Frame source X on sheet
 * @param {number} [sy=0] - Frame source Y on sheet
 * @param {number} [fw=0] - Frame width on sheet
 * @param {number} [fh=0] - Frame height on sheet
 * @param {number} [dx=0] - Destination draw X relative to entity center
 * @param {number} [dy=0] - Destination draw Y relative to entity center
 * @param {number} [dw=0] - Destination draw width
 * @param {number} [dh=0] - Destination draw height
 */
export function renderPokemonHitFlash(ctx, pokemon, sheetImg = null, sx = 0, sy = 0, fw = 0, fh = 0, dx = 0, dy = 0, dw = 0, dh = 0) {
  if (!pokemon || !pokemon.hitFlashTimer || pokemon.hitFlashTimer <= 0 || pokemon.isFainting || pokemon.isDead) return;

  const alpha = Math.min(1.0, (pokemon.hitFlashTimer / 8) * 0.92);
  if (alpha <= 0.01) return;

  if (sheetImg && fw > 0 && fh > 0) {
    const buffer = _ensurePokeFlashBuffer(fw, fh);
    if (buffer) {
      const { canvas: silCanvas, ctx: silCtx } = buffer;
      silCtx.clearRect(0, 0, fw, fh);
      // 1. Draw raw sprite frame to offscreen buffer
      silCtx.drawImage(sheetImg, sx, sy, fw, fh, 0, 0, fw, fh);
      // 2. Mask and tint only the non-transparent pixels to solid white
      silCtx.globalCompositeOperation = 'source-in';
      silCtx.fillStyle = '#FFFFFF';
      silCtx.fillRect(0, 0, fw, fh);
      silCtx.globalCompositeOperation = 'source-over';

      // 3. Draw the solid white Pokémon sprite silhouette over the character
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(silCanvas, 0, 0, fw, fh, dx, dy, dw, dh);
      ctx.restore();
      return;
    }

    // Node.js / headless test fallback: additive blend of sprite frame directly
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    ctx.drawImage(sheetImg, sx, sy, fw, fh, dx, dy, dw, dh);
    ctx.restore();
    return;
  }

  // Fallback for procedural circles if sheet image is not loaded
  const r = pokemon.r || pokemon.radius || 22;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}



