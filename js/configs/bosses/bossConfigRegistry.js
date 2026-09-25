// ─────────────────────────────────────────────
// BOSS CONFIG REGISTRY
// Resolves characterId to Boss configurations with fallback generation for any fighter
// ─────────────────────────────────────────────

import { baseBossConfig } from './baseBossConfig.js';
import { zeusBossConfig } from './zeusBossConfig.js';
import { sukunaBossConfig } from './sukunaBossConfig.js';
import { gojoBossConfig } from './gojoBossConfig.js';

import { mahoragaBossConfig } from './mahoragaBossConfig.js';
import { yutaBossConfig } from './yutaBossConfig.js';
import { escanorBossConfig } from './escanorBossConfig.js';
import { makimaBossConfig } from './makimaBossConfig.js';

const _bossConfigs = new Map([
  ['zeus', zeusBossConfig],
  ['sukuna', sukunaBossConfig],
  ['gojo', gojoBossConfig],
  ['mahoraga', mahoragaBossConfig],
  ['yuta', yutaBossConfig],
  ['escanor', escanorBossConfig],
  ['makima', makimaBossConfig],
]);

/**
 * Retrieves the Boss configuration for a given fighter or characterId.
 * If no custom configuration exists, returns a dynamically synthesized
 * configuration based on baseBossConfig and the fighter's base stats.
 */
export function getBossConfig(fighterOrId) {
  const characterId = typeof fighterOrId === 'string'
    ? fighterOrId.toLowerCase()
    : (fighterOrId?.characterId || fighterOrId?.type || '').toLowerCase();

  if (_bossConfigs.has(characterId)) {
    return _bossConfigs.get(characterId);
  }

  // Dynamic fallback for any selected existing fighter
  const fighterName = (typeof fighterOrId === 'object' && (fighterOrId?.name || fighterOrId?._def?.name || fighterOrId?.characterId))
    ? String(fighterOrId.name || fighterOrId._def?.name || fighterOrId.characterId).toUpperCase()
    : (characterId ? characterId.toUpperCase() : 'BOSS');

  const themeColor = (typeof fighterOrId === 'object' && (fighterOrId?.themeColor || fighterOrId?.color || fighterOrId?._def?.color))
    ? (fighterOrId.themeColor || fighterOrId.color || fighterOrId._def?.color)
    : '#EF4444';

  return {
    ...baseBossConfig,
    bossTitle: 'BOSS',
    bossSubtitle: 'BOSS',
    themeColor,
    entranceAuraColor: themeColor,
    enrageAuraColor: '#DC2626',
    defaultHp: baseBossConfig.defaultHp,
    damageMultiplier: baseBossConfig.damageMultiplier,
  };
}

/**
 * Allows dynamic registration of new Boss configurations
 */
export function registerBossConfig(characterId, config) {
  if (!characterId || !config) return;
  _bossConfigs.set(characterId.toLowerCase(), {
    ...baseBossConfig,
    ...config
  });
}
