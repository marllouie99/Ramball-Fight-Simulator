// ─────────────────────────────────────────────
// FOC MAPS — MAIN MODULE REGISTRY
// Central orchestrator for Boss-specific and FOC battleground maps
// ─────────────────────────────────────────────

import { YUTA_BUSH_MAP } from './yutaBushMap.js';
import { ENDER_DRAGON_MAP } from './enderDragonMap.js';
import { drawFocMap, updateFocMap, getBushSprite, resetFocMapState } from './focMapRenderer.js';
import { state } from '../js/core/state.js';

export const FOC_MAPS = {
  foc_yuta_bush_map: YUTA_BUSH_MAP,
  yuta: YUTA_BUSH_MAP,
  foc_ender_dragon_map: ENDER_DRAGON_MAP,
  ender_dragon: ENDER_DRAGON_MAP,
  enderdragon: ENDER_DRAGON_MAP,
};

/**
 * Returns the dedicated unique FOC Map for a given Boss
 */
export function getFocMapForBoss(bossIdOrFighter) {
  if (!bossIdOrFighter) return null;
  const characterId = typeof bossIdOrFighter === 'string'
    ? bossIdOrFighter.toLowerCase()
    : (bossIdOrFighter.characterId || bossIdOrFighter.type || '').toLowerCase();

  if (characterId === 'yuta' || characterId === 'yuta_okkotsu') {
    return YUTA_BUSH_MAP;
  }
  if (characterId === 'ender_dragon' || characterId === 'enderdragon') {
    return ENDER_DRAGON_MAP;
  }

  return FOC_MAPS[characterId] || null;
}

/**
 * Returns currently active FOC map
 */
export function getActiveFocMap() {
  if (typeof state !== 'undefined' && state.activeFocMap) {
    return state.activeFocMap;
  }
  if (typeof state !== 'undefined' && state.fighters) {
    const bossFighter = state.fighters.find(f => f && f.isBoss);
    if (bossFighter) {
      return getFocMapForBoss(bossFighter);
    }
  }
  return null;
}

export {
  YUTA_BUSH_MAP,
  drawFocMap,
  updateFocMap,
  getBushSprite,
  resetFocMapState
};
