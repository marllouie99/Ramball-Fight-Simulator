/**
 * Interaction Event Hook & Lifecycle Manager
 * Decouples fighter logic from specific matchup interactions using an event hook system.
 */

class InteractionManager {
  constructor() {
    this.hooks = {
      onCounterTeleport: [],
      onUltimatePreCast: [],
      onBeamHitVictim: [],
      onBeamEvade: [],
      onCameraZoomOverride: [],
    };
  }

  /**
   * Register a callback for a specific interaction hook.
   * @param {'onCounterTeleport'|'onUltimatePreCast'|'onBeamHitVictim'|'onBeamEvade'|'onCameraZoomOverride'} hookName
   * @param {Function} handler
   */
  registerHook(hookName, handler) {
    if (!this.hooks[hookName]) {
      this.hooks[hookName] = [];
    }
    this.hooks[hookName].push(handler);
  }

  /**
   * Dispatches counter teleport hook. Returns true if a special interaction handled the counter.
   * @param {Object} attacker
   * @param {Object} target
   * @param {Object} [arena]
   * @param {number} [oldX]
   * @param {number} [oldY]
   * @returns {boolean}
   */
  handleCounterTeleport(attacker, target, arena, oldX, oldY) {
    for (const handler of this.hooks.onCounterTeleport) {
      const handled = handler(attacker, target, arena, oldX, oldY);
      if (handled) return true;
    }
    return false;
  }

  /**
   * Dispatches ultimate pre-cast hook (e.g. center rebounce or cinematic repositioning).
   * Returns true if a special interaction handled the pre-cast behavior.
   * @param {Object} caster
   * @param {Object} opponent
   * @param {Object} [stateObj]
   * @param {boolean} [bypass]
   * @returns {boolean}
   */
  handleUltimatePreCast(caster, opponent, stateObj, bypass) {
    for (const handler of this.hooks.onUltimatePreCast) {
      const handled = handler(caster, opponent, stateObj, bypass);
      if (handled) return true;
    }
    return false;
  }

  /**
   * Checks if the victim entity has super-armor or immunity against a beam attack.
   * @param {Object} victim
   * @param {Object} attacker
   * @param {string} beamType
   * @returns {boolean}
   */
  isBeamImmune(victim, attacker, beamType) {
    for (const handler of this.hooks.onBeamHitVictim) {
      const immune = handler(victim, attacker, beamType);
      if (immune) return true;
    }
    return false;
  }

  /**
   * Dispatches beam evasion hook. Returns true if a special interaction or dodge evades the beam.
   * @param {Object} victim
   * @param {Object} attacker
   * @param {Object} beamData
   * @returns {boolean}
   */
  handleBeamEvade(victim, attacker, beamData) {
    for (const handler of this.hooks.onBeamEvade) {
      const evaded = handler(victim, attacker, beamData);
      if (evaded) return true;
    }
    return false;
  }

  /**
   * Checks if camera zoom should be overridden during skill/ultimate channeling.
   * @param {Object} caster
   * @param {Array<Object>} fighters
   * @returns {boolean}
   */
  shouldOverrideCameraZoom(caster, fighters) {
    for (const handler of this.hooks.onCameraZoomOverride) {
      const override = handler(caster, fighters);
      if (override) return true;
    }
    return false;
  }

  /**
   * Clears all registered hooks (useful for unit tests & resets).
   */
  clearHooks() {
    for (const key of Object.keys(this.hooks)) {
      this.hooks[key] = [];
    }
  }
}

export const interactionManager = new InteractionManager();
