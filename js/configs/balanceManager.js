// ─────────────────────────────────────────────
// Balance Manager — Centralized Fighter Multipliers & Audit Utility
// ─────────────────────────────────────────────

import balanceData from './fighter-balance-sheet.json' with { type: 'json' };

/**
 * Access the centralized fighter balance sheet data.
 */
export const BalanceManager = {
  data: balanceData,

  /**
   * Retrieve baseline balance stats for a specific character ID.
   * @param {string} characterId 
   * @returns {object|null}
   */
  getCharacterBalance(characterId) {
    if (!characterId) return null;
    const key = characterId.toLowerCase();
    return this.data.characters[key] || null;
  },

  _listeners: [],

  /**
   * Initialize and load saved multipliers from localStorage if present.
   */
  _init() {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('balance_global_multipliers');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            this.data.globalMultipliers = Object.assign({}, this.data.globalMultipliers, parsed);
          }
        }
      } catch (e) {}
    }
  },

  /**
   * Register a listener for multiplier changes.
   */
  subscribe(fn) {
    if (typeof fn === 'function') this._listeners.push(fn);
  },

  /**
   * Notify all registered listeners.
   */
  _notify() {
    for (const fn of this._listeners) {
      try { fn(this.getGlobalMultipliers()); } catch (e) {}
    }
  },

  /**
   * Get global combat scaling multipliers.
   * @returns {{ damageScale: number, knockbackScale: number, cooldownScale: number, speedScale: number }}
   */
  getGlobalMultipliers() {
    return this.data.globalMultipliers || {
      damageScale: 1.0,
      knockbackScale: 1.0,
      cooldownScale: 1.0,
      speedScale: 1.0
    };
  },

  /**
   * Set a specific global multiplier and persist to localStorage.
   * @param {'damageScale'|'knockbackScale'|'speedScale'|'cooldownScale'} key
   * @param {number} value
   */
  setGlobalMultiplier(key, value) {
    if (!this.data.globalMultipliers) {
      this.data.globalMultipliers = { damageScale: 1.0, knockbackScale: 1.0, cooldownScale: 1.0, speedScale: 1.0 };
    }
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return;
    this.data.globalMultipliers[key] = num;

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('balance_global_multipliers', JSON.stringify(this.data.globalMultipliers));
      } catch (e) {}
    }
    this._notify();
  },

  /**
   * Reset all global multipliers back to standard 1.0x.
   */
  resetGlobalMultipliers() {
    this.data.globalMultipliers = {
      damageScale: 1.0,
      knockbackScale: 1.0,
      cooldownScale: 1.0,
      speedScale: 1.0
    };
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('balance_global_multipliers');
      } catch (e) {}
    }
    this._notify();
  },

  /**
   * Apply centralized balance overrides onto a character config.
   * Modifies the config in-place with global multipliers.
   * @param {object} config 
   * @param {string} characterId 
   * @returns {object}
   */
  applyBalance(config, characterId) {
    if (!config) return config;
    const charBalance = this.getCharacterBalance(characterId);
    const globalMult = this.getGlobalMultipliers();

    if (charBalance) {
      if (charBalance.hp && config.hp) config.hp = Math.round(charBalance.hp);
      if (charBalance.speed && config.speed) config.speed = charBalance.speed * globalMult.speedScale;
      if (charBalance.baseDamage && config.damage) config.damage = Math.round(charBalance.baseDamage * globalMult.damageScale);
      if (charBalance.baseCooldown && config.cooldown) config.cooldown = Math.round(charBalance.baseCooldown * globalMult.cooldownScale);
    }
    return config;
  },

  /**
   * Audit character config against balance sheet to detect discrepancies.
   * @param {string} characterId 
   * @param {object} activeConfig 
   * @returns {{ matches: boolean, diffs: Array<{ field: string, sheetValue: any, configValue: any }> }}
   */
  auditConfig(characterId, activeConfig) {
    const sheet = this.getCharacterBalance(characterId);
    if (!sheet || !activeConfig) return { matches: true, diffs: [] };

    const diffs = [];
    if (sheet.hp !== undefined && activeConfig.hp !== undefined && sheet.hp !== activeConfig.hp) {
      diffs.push({ field: 'hp', sheetValue: sheet.hp, configValue: activeConfig.hp });
    }
    if (sheet.speed !== undefined && activeConfig.speed !== undefined && sheet.speed !== activeConfig.speed) {
      diffs.push({ field: 'speed', sheetValue: sheet.speed, configValue: activeConfig.speed });
    }
    if (sheet.radius !== undefined && activeConfig.r !== undefined && sheet.radius !== activeConfig.r) {
      diffs.push({ field: 'r', sheetValue: sheet.radius, configValue: activeConfig.r });
    }

    return {
      matches: diffs.length === 0,
      diffs
    };
  }
};

BalanceManager._init();

export default BalanceManager;
