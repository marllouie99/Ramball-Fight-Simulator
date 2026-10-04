/**
 * Fighter Special Interactions Hub
 * Central barrel exports for all custom cross-character interactions.
 */

import {
  isNamelessDeityEntity,
  isSaitamaEntity,
  hasSaitamaEnemy,
  shouldNamelessDeityRebounce,
  shouldDisableCameraZoomForDeity,
  calculateSaitamaRetreatPosition,
  executeSaitamaCounterDeity,
  isSaitamaCounterImmuneToDeityBeam,
} from './deitySaitamaInteraction.js';

import {
  isGojoEntity,
  hasGojoEnemy,
  computeSaitamaBarrierDamage,
  applyGojoBarrierDamage,
  shatterGojoInfinityBarrier,
} from './gojoSaitamaInteraction.js';

export * from './interactionRegistry.js';
export * from './interactionManager.js';
export {
  isNamelessDeityEntity,
  isSaitamaEntity,
  hasSaitamaEnemy,
  shouldNamelessDeityRebounce,
  shouldDisableCameraZoomForDeity,
  calculateSaitamaRetreatPosition,
  executeSaitamaCounterDeity,
  isSaitamaCounterImmuneToDeityBeam,
  isGojoEntity,
  hasGojoEnemy,
  computeSaitamaBarrierDamage,
  applyGojoBarrierDamage,
  shatterGojoInfinityBarrier,
};
