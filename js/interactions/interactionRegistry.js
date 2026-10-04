/**
 * Interaction Registry & Match Query Dispatcher
 * Provides centralized helper methods to detect active cross-character match interactions.
 */

import { isNamelessDeityEntity, isSaitamaEntity as isSaitamaDeityEntity } from './deitySaitamaInteraction.js';
import { isGojoEntity, isSaitamaEntity } from './gojoSaitamaInteraction.js';

/**
 * Checks if a specific named interaction is active in the current match.
 * @param {string} interactionKey e.g. 'deitySaitama' | 'gojoSaitama'
 * @param {Object} [stateObj]
 * @returns {boolean}
 */
export function isMatchInteractionActive(interactionKey, stateObj) {
  if (!stateObj || !Array.isArray(stateObj.fighters)) return false;
  const fighters = stateObj.fighters.filter(f => f && (typeof f.isEffectivelyAlive === 'function' ? f.isEffectivelyAlive() : (f.hp > 0 && !f.dead && !f.isDead)));

  switch (interactionKey) {
    case 'deitySaitama': {
      const hasDeity = fighters.some(f => isNamelessDeityEntity(f));
      const hasSaitama = fighters.some(f => isSaitamaDeityEntity(f));
      return hasDeity && hasSaitama;
    }
    case 'gojoSaitama': {
      const hasGojo = fighters.some(f => isGojoEntity(f));
      const hasSaitama = fighters.some(f => isSaitamaEntity(f));
      return hasGojo && hasSaitama;
    }
    default:
      return false;
  }
}

/**
 * Finds the first valid living opponent matching a predicate function or type string.
 * @param {Object} fighter
 * @param {string|Function} typeOrPredicate
 * @param {Object} [stateObj]
 * @returns {Object|null}
 */
export function findMatchOpponent(fighter, typeOrPredicate, stateObj) {
  if (!stateObj || !Array.isArray(stateObj.fighters)) return null;

  const isMatch = typeof typeOrPredicate === 'function'
    ? typeOrPredicate
    : (f) => f && (f.characterId === typeOrPredicate || f.type === typeOrPredicate || f._def?.id === typeOrPredicate);

  return stateObj.fighters.find(f =>
    f && f !== fighter &&
    isMatch(f) &&
    !fighter.isTeammate?.(f) &&
    (typeof f.isEffectivelyAlive === 'function' ? f.isEffectivelyAlive() : (f.hp > 0 && !f.dead && !f.isDead))
  ) || null;
}
