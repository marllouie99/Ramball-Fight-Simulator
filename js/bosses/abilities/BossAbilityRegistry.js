// ─────────────────────────────────────────────
// BOSS ABILITY REGISTRY
// Maps characterId to specific boss ability managers
// ─────────────────────────────────────────────

import { ZeusBossAbilities } from './ZeusBossAbilities.js';
import { SukunaBossAbilities } from './SukunaBossAbilities.js';
import { GojoBossAbilities } from './GojoBossAbilities.js';

const _abilityHandlers = new Map([
  ['zeus', ZeusBossAbilities],
  ['sukuna', SukunaBossAbilities],
  ['gojo', GojoBossAbilities],
]);

export class BossAbilityRegistry {
  static getHandler(characterId) {
    if (!characterId) return null;
    return _abilityHandlers.get(characterId.toLowerCase()) || null;
  }

  static updateBossAbilities(boss, dt, config) {
    if (!boss || !boss.isBoss) return;
    const charId = boss.characterId || boss.type;
    const handler = this.getHandler(charId);
    if (handler && typeof handler.update === 'function') {
      handler.update(boss, dt, config);
    }
  }
}
