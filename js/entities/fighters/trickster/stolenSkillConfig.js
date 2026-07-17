export const STOLEN_SKILL_CONFIG = {
  // Global multipliers applied to all stolen skills unless overridden
  global: {
    damageMultiplier: 1.2,
    cooldownMultiplier: 0.8
  },
  
  // Specific overrides for individual stolen skills
  skills: {
    orange: {
      // e.g. Trickster's stolen flamethrower
      damageMultiplier: 1.5,
      cooldownMultiplier: 0.7
    },
    cronos: {
      // e.g. Trickster's stolen time sphere
      cooldownMultiplier: 0.9,
      sphereSpeedMultiplier: 5 
    },
    bomber: {
      damageMultiplier: 1.2
    },
    darkslategray: {
      damageMultiplier: 1.1
    },
    gunslinger: {
      damageMultiplier: 1.3
    },
    grenadier: {
      damageMultiplier: 1.2
    },
    laser: {
      cooldownMultiplier: 0.8
    },
    ruby: {
      cooldownMultiplier: 0.75
    },
    musashi: {
      damageMultiplier: 1.0,
      cooldownMultiplier: 0.9
    },
    berserker: {
      damageMultiplier: 1.2, // Bonus to trickster projectiles while in rage
      cooldownMultiplier: 0.9
    },
    normal: {
      damageMultiplier: 1.5,
      cooldownMultiplier: 1.0
    }
  }
};

// Helper function to easily fetch the correct multiplier
export function getStolenMultiplier(stolenType, multiplierType) {
  if (STOLEN_SKILL_CONFIG.skills[stolenType] && STOLEN_SKILL_CONFIG.skills[stolenType][multiplierType] !== undefined) {
    return STOLEN_SKILL_CONFIG.skills[stolenType][multiplierType];
  }
  return STOLEN_SKILL_CONFIG.global[multiplierType] || 1.0;
}
