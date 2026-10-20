import { CONFIG } from '../core/config.js';
import { state, isGlobalHitPauseActive } from '../core/state.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMBO TRACKER
 * Counts consecutive damaging hits per side so the HUD can slide in a combo
 * counter card at each window edge, below the TOP HUD.
 *
 * Design standards:
 * - Independent tracking per side (Side 0 = Left HUD / Player 1, Side 1 = Right HUD / Player 2)
 * - Whenever players hit the enemy, the combo counter accumulates hits and damage
 *   and WILL NOT RESET until the combo counter duration ends (timer reaches 0).
 * - Multi-hit chains, companion attacks, minion hits, and team juggles all cleanly
 *   extend the active combo chain rather than resetting it.
 * - Global hit-pause / time-stop stasis pauses duration drain so dramatic cinematics
 *   never cause combos to drop unfairly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COMBO_DEFAULTS = Object.freeze({
  enabled: true,
  useFighterTheme: true,   // Adapt banner color theme dynamically to each attacking fighter's signature color
  windowFrames: 90,        // 1.5 s at fixed 60 FPS before the chain expires
  minHits: 1,              // Shows from the first hit with active duration drain bar
  edgeInset: 45,           // px from window edge aligned with Top HUD frame & arena bounds
  topGapBelowHud: 44,      // card top = arena.y - this (sits below the TOP HUD)
  slideFrames: 10,         // slide-in / slide-out duration
  popFrames: 8,            // impact pop duration on every new hit
  tierThresholds: [1, 5, 10, 20],
  tierColors: ['#E11D2E', '#FF3B30', '#FF7A00', '#FFD400'],
});

let _cfgCache = null;
let _cfgSource = null;

/**
 * Returns the merged combo-counter config. Cached against the CONFIG reference so
 * per-frame rendering never allocates a new options object.
 */
export function getComboConfig() {
  const src = (CONFIG && CONFIG.comboCounter) || null;
  if (src !== _cfgSource) {
    _cfgSource = src;
    _cfgCache = Object.assign({}, COMBO_DEFAULTS, src || {});
    if (typeof _cfgCache.minHits !== 'number' || _cfgCache.minHits < 1) {
      _cfgCache.minHits = 1;
    }
  }
  return _cfgCache;
}

function _makeSlot(side) {
  return {
    side,
    hits: 0,
    damage: 0,
    timer: 0,
    maxTimer: 90,
    pop: 0,
    slideP: 0,
    phase: 'hidden', // 'hidden' | 'in' | 'hold' | 'out'
    attackerFighter: null,
    attackerFighterIndex: -1,
  };
}

/**
 * Lazily (re)creates the two preallocated slots on state.
 */
export function ensureComboTrackers() {
  if (!Array.isArray(state.comboTrackers) || state.comboTrackers.length !== 2) {
    state.comboTrackers = [_makeSlot(0), _makeSlot(1)];
  }
  return state.comboTrackers;
}

/**
 * Resolves any attacker entity (fighter, companion, clone, summon, minion, turret,
 * projectile, or vehicle) to its root Fighter's slot index in state.fighters.
 * @param {Object|number} attacker
 * @returns {number} 0-based index in state.fighters, or -1 if unresolvable
 */
export function resolveAttackerFighterIndex(attacker) {
  if (attacker === null || attacker === undefined) return -1;

  if (typeof attacker === 'number') {
    if (Array.isArray(state.fighters) && attacker >= 0 && attacker < state.fighters.length) {
      return attacker;
    }
    return -1;
  }

  if (typeof attacker !== 'object') return -1;

  if (Array.isArray(state.fighters)) {
    const directIdx = state.fighters.indexOf(attacker);
    if (directIdx >= 0) return directIdx;
  }

  let curr = attacker;
  let depth = 0;
  while (curr && depth < 8) {
    if (Array.isArray(state.fighters)) {
      const idx = state.fighters.indexOf(curr);
      if (idx >= 0) return idx;
    }
    if (typeof curr.owner === 'number' && Array.isArray(state.fighters) && curr.owner >= 0 && curr.owner < state.fighters.length) {
      return curr.owner;
    }
    if (curr.owner && typeof curr.owner === 'object') {
      curr = curr.owner;
    } else if (curr.creator && typeof curr.creator === 'object') {
      curr = curr.creator;
    } else if (curr.parentFighter && typeof curr.parentFighter === 'object') {
      curr = curr.parentFighter;
    } else if (curr.fighter && typeof curr.fighter === 'object') {
      curr = curr.fighter;
    } else {
      break;
    }
    depth++;
  }
  return -1;
}

/**
 * Resolves which mirrored HUD combo card (0 = Left, 1 = Right) an attacker maps to.
 * In 1v1: Player 1 (slot 0) = Left (0), Player 2 (slot 1) = Right (1).
 * In Team / Duo modes: Team 0 = Left (0), Team 1 = Right (1).
 * @param {Object|number} attacker
 * @returns {number} 0 or 1, or -1 if invalid
 */
function _resolveSide(attacker) {
  const fIdx = resolveAttackerFighterIndex(attacker);
  if (fIdx < 0) return -1;

  if (state && typeof state.getFighterTeam === 'function') {
    const team = state.getFighterTeam(fIdx);
    if (typeof team === 'number') {
      return team === 0 ? 0 : 1;
    }
  }

  return fIdx === 0 ? 0 : 1;
}

/**
 * Verifies that the target is a genuine combat enemy and not self, a teammate, or an inert prop.
 * Prevents friendly fire, self-damage, recoil, or hitting inanimate objects from activating combos.
 */
function _isEnemy(attacker, target) {
  if (!attacker || !target) return false;
  if (attacker === target) return false;

  // Inanimate props, buildings, turrets, dispensers, and lawnmowers do not count as enemy fighters
  if (target.isLawnmower || target.isBuilding || target.isTurret || target.isDispenser || target.isEndCrystal) {
    return false;
  }

  const aIdx = resolveAttackerFighterIndex(attacker);
  const tIdx = resolveAttackerFighterIndex(target);
  if (aIdx >= 0 && tIdx >= 0 && aIdx === tIdx) return false;

  if (typeof attacker.isTeammate === 'function' && attacker.isTeammate(target)) return false;
  if (typeof target.isTeammate === 'function' && target.isTeammate(attacker)) return false;

  const aTeam = (typeof attacker.team === 'number') ? attacker.team : (aIdx >= 0 && state && typeof state.getFighterTeam === 'function' ? state.getFighterTeam(aIdx) : undefined);
  const tTeam = (typeof target.team === 'number') ? target.team : (tIdx >= 0 && state && typeof state.getFighterTeam === 'function' ? state.getFighterTeam(tIdx) : undefined);
  if (typeof aTeam === 'number' && typeof tTeam === 'number') {
    if (aTeam === tTeam) return false;
  }

  return true;
}

/**
 * Registers one successful damaging hit on an enemy and advances the combo counter.
 * Crucial guarantees:
 * 1. ONLY counts when ACTUALLY dealing positive damage to an enemy combatant (blocked/absorbed hits,
 *    0 damage hits, shields absorbing 0 body HP damage, friendly fire, and props are strictly excluded).
 * 2. Whenever players hit the enemy, the active combo counter will NOT reset until its duration ends
 *    (i.e. until the combo window timer reaches 0).
 *
 * @param {Object|number} attacker Attacking entity or fighter
 * @param {Object} target Target entity taking damage
 * @param {number} actualDamage Real damage applied to target HP
 */
export function registerComboHit(attacker, target, actualDamage) {
  const cfg = getComboConfig();
  if (!cfg.enabled) return;
  if (!attacker || !target) return;
  if (typeof state === 'undefined' || state.gameState !== 'playing') return;

  // 1. Target must not be dead / eliminated corpse
  if (target.isDead) return;
  if (typeof target.hp === 'number' && target.hp <= 0 && target._hasDied) return;

  // 2. Only damage against actual active enemies counts
  if (!_isEnemy(attacker, target)) return;

  // 3. Must deal real, positive damage to the enemy's HP
  const dmg = Number(actualDamage);
  if (!Number.isFinite(dmg) || dmg <= 0) return;

  const side = _resolveSide(attacker);
  if (side !== 0 && side !== 1) return;

  const slots = ensureComboTrackers();
  const slot = slots[side];
  const windowFrames = Math.max(1, cfg.windowFrames || 90);
  slot.maxTimer = windowFrames;

  // Resolve the root attacking fighter entity so the combo banner can reflect their signature color theme
  const fIdx = resolveAttackerFighterIndex(attacker);
  let attackerFighter = null;
  if (fIdx >= 0 && Array.isArray(state.fighters) && state.fighters[fIdx]) {
    attackerFighter = state.fighters[fIdx];
  } else if (attacker && typeof attacker === 'object') {
    if (attacker.isFighter || attacker.characterId) {
      attackerFighter = attacker;
    } else if (attacker.parentFighter && (attacker.parentFighter.isFighter || attacker.parentFighter.characterId)) {
      attackerFighter = attacker.parentFighter;
    } else if (attacker.fighter && (attacker.fighter.isFighter || attacker.fighter.characterId)) {
      attackerFighter = attacker.fighter;
    } else if (attacker.owner && (attacker.owner.isFighter || attacker.owner.characterId)) {
      attackerFighter = attacker.owner;
    }
  }
  if (attackerFighter) {
    slot.attackerFighter = attackerFighter;
  }
  if (fIdx >= 0) {
    slot.attackerFighterIndex = fIdx;
  }

  // If previous combo has expired / duration ended (phase is hidden, sliding out, or timer expired):
  // Start a new combo chain
  if (slot.phase === 'hidden' || slot.phase === 'out' || slot.timer <= 0) {
    slot.hits = 1;
    slot.damage = dmg;
    slot.timer = windowFrames;
    slot.pop = cfg.popFrames || 8;
    slot.slideP = 0;
    slot.phase = 'in';
  } else {
    // ACTIVE COMBO: Duration has NOT ended!
    // Increment hit counter, accumulate damage, and refresh duration timer.
    // It will NEVER reset back to 0 until the duration timer reaches 0!
    slot.hits += 1;
    slot.damage += dmg;
    slot.timer = windowFrames; // Refresh duration back to full!
    slot.pop = cfg.popFrames || 8; // Pop effect
    if (slot.phase !== 'in') {
      slot.phase = 'hold';
    }
  }
}

let _lastTickFrame = -1;

/**
 * Advances slide, pop, and duration expiration timers for both combo slots.
 * Guaranteed to tick at most once per 60 FPS simulation frame to prevent framerate desyncs.
 * Pauses duration drain during global hit-pause or time-stop so dramatic cinematics do not drop combos.
 */
export function tickComboTrackers() {
  const cfg = getComboConfig();
  const slots = ensureComboTrackers();
  const step = 1 / Math.max(1, cfg.slideFrames || 10);

  const currentFrame = (state && typeof state.frameCount === 'number') ? state.frameCount : -1;
  const isNewFrame = (currentFrame < 0 || currentFrame !== _lastTickFrame);
  if (isNewFrame && currentFrame >= 0) {
    _lastTickFrame = currentFrame;
  }

  const isGlobalPausing = (typeof state !== 'undefined' && typeof isGlobalHitPauseActive === 'function')
    ? isGlobalHitPauseActive(state)
    : false;

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];

    if (slot.pop > 0) slot.pop--;

    if (slot.phase === 'hidden') {
      slot.hits = 0;
      slot.damage = 0;
      slot.timer = 0;
      slot.slideP = 0;
    } else if (slot.phase === 'in') {
      slot.slideP = Math.min(1, slot.slideP + step);
      if (slot.slideP >= 0.9999) {
        slot.slideP = 1;
        slot.phase = 'hold';
      }
      if (isNewFrame && !isGlobalPausing && slot.timer > 0) {
        slot.timer--;
      }
      if (slot.timer <= 0) {
        slot.phase = 'out';
      }
    } else if (slot.phase === 'hold') {
      if (isNewFrame && !isGlobalPausing && slot.timer > 0) {
        slot.timer--;
      }
      if (slot.timer <= 0) {
        slot.phase = 'out';
      }
    } else if (slot.phase === 'out') {
      slot.slideP = Math.max(0, slot.slideP - step);
      if (slot.slideP <= 0.0001) {
        slot.phase = 'hidden';
        slot.hits = 0;
        slot.damage = 0;
        slot.timer = 0;
        slot.slideP = 0;
        slot.attackerFighter = null;
        slot.attackerFighterIndex = -1;
      }
    }
  }
}

/**
 * Clears both combo chains instantly (e.g. on round/match reset).
 */
export function resetComboTrackers() {
  _lastTickFrame = -1;
  const slots = ensureComboTrackers();
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    slot.hits = 0;
    slot.damage = 0;
    slot.timer = 0;
    slot.maxTimer = 90;
    slot.pop = 0;
    slot.slideP = 0;
    slot.phase = 'hidden';
    slot.attackerFighter = null;
    slot.attackerFighterIndex = -1;
  }
}
