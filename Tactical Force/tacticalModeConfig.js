// ─────────────────────────────────────────────
// TACTICAL FORCE — GAME MODE CONFIGURATION
// Complete configuration specifications for all Tactical Shooter game modes
// ─────────────────────────────────────────────

/**
 * Enumeration of all Tactical Shooter Game Modes
 */
export const TACTICAL_GAME_MODES = {
  TACTICAL_2V2: 'Tactical 2v2',
  TACTICAL_1V1: 'Tactical 1v1',
  TACTICAL_STANDOFF: 'Tactical Stand Off',
  TACTICAL_FFA: 'Tactical FFA',
  TACTICAL_4V4: 'Tactical 4v4',
  TACTICAL_RANDOM: 'Tactical Random',
};

/**
 * Detailed Gameplay & Match Settings for each Tactical Shooter Mode
 */
export const TACTICAL_MODE_SETTINGS = {
  [TACTICAL_GAME_MODES.TACTICAL_2V2]: {
    id: 'tactical_2v2',
    label: 'Tactical 2v2',
    shortLabel: '2v2 CT vs T',
    description: 'Structured 2v2 tactical breach encounter. Counter-Terrorists (M4A1 & SPAS-12) vs Terrorist Force (Desert Eagle & AWP) on Sector 01.',
    rounds: 3,
    fixedHp: 2000,
    hpMultiplier: 1.0,
    speedMultiplier: 0.50,
    supportFourFighters: true,
    fighterCount: 4,
    arenaTheme: 'dark',
    defaultMap: 'tactical_starter_map',
    allowFriendlyFire: false,
    enableLineOfSight: true,
    teamStructure: {
      team0: ['m4a1', 'spas12'],
      team1: ['desert_eagle', 'awp']
    },
    teamColors: {
      team0: '#3b82f6', // CT Neon Electric Blue
      team1: '#ef4444', // T Neon Crimson
    },
    teamNames: {
      team0: 'COUNTER-TERRORIST',
      team1: 'TERRORIST FORCE',
    },
    hud: {
      layout: 'two_top_two_bottom',
      showNames: true,
      showHpNumbers: true,
      showDamage: true,
      showHealthBar: true,
      showSkillBars: false
    },
    maxAfterimages: 4,
    afterimageDecayMultiplier: 1.8,
  },

  [TACTICAL_GAME_MODES.TACTICAL_1V1]: {
    id: 'tactical_1v1',
    label: 'DUEL (1V1)',
    shortLabel: '1v1 Duel',
    description: 'High-precision 1v1 firearm duel. Pure tactical aim, corner slicing, and reload timing test on Sector 01.',
    rounds: 3,
    fixedHp: 100,
    hpMultiplier: 1.0,
    speedMultiplier: 1.50,
    supportFourFighters: false,
    fighterCount: 2,
    arenaTheme: 'dark',
    defaultMap: 'tactical_starter_map',
    allowFriendlyFire: false,
    enableLineOfSight: true,
    hud: {
      layout: 'two_top_two_bottom',
      showNames: true,
      showHpNumbers: true,
      showDamage: true,
      showHealthBar: true,
      showSkillBars: false
    },
    maxAfterimages: 4,
    afterimageDecayMultiplier: 1.8,
  },

  [TACTICAL_GAME_MODES.TACTICAL_STANDOFF]: {
    id: 'tactical_standoff',
    label: 'Tactical Stand Off',
    shortLabel: 'Stand Off',
    description: 'Single-round sudden death standoff with high durability operatives and high tactical stakes.',
    rounds: 1,
    fixedHp: 1500,
    hpMultiplier: 1.0,
    speedMultiplier: 1.5,
    supportFourFighters: false,
    fighterCount: 2,
    arenaTheme: 'dark',
    defaultMap: 'tactical_starter_map',
    allowFriendlyFire: false,
    enableLineOfSight: true,
    hud: {
      layout: 'side_by_side_bottom',
      showNames: true,
      showHpNumbers: true,
      showDamage: true,
      showHealthBar: true,
      showSkillBars: false
    },
    maxAfterimages: 6,
    afterimageDecayMultiplier: 1.5,
  },

  [TACTICAL_GAME_MODES.TACTICAL_FFA]: {
    id: 'tactical_ffa',
    label: 'Tactical FFA',
    shortLabel: '4-Player FFA',
    description: '4-operative tactical free-for-all deathmatch. Every operator for themselves in Sector 01.',
    rounds: 3,
    fixedHp: 100,
    hpMultiplier: 1.0,
    speedMultiplier: 1.35,
    supportFourFighters: true,
    fighterCount: 4,
    arenaTheme: 'dark',
    defaultMap: 'tactical_starter_map',
    allowFriendlyFire: true,
    enableLineOfSight: true,
    hud: {
      layout: 'two_top_two_bottom',
      showNames: true,
      showHpNumbers: true,
      showDamage: true,
      showHealthBar: true,
      showSkillBars: false
    },
    maxAfterimages: 4,
    afterimageDecayMultiplier: 1.8,
  },

  [TACTICAL_GAME_MODES.TACTICAL_4V4]: {
    id: 'tactical_4v4',
    label: 'Tactical 4v4',
    shortLabel: '4v4 Full Squad',
    description: 'Full squad combat with 4 CT operatives vs 4 T operatives in extended tactical arenas.',
    rounds: 5,
    fixedHp: 500,
    hpMultiplier: 1.0,
    speedMultiplier: 1.3,
    supportFourFighters: true,
    fighterCount: 8,
    arenaTheme: 'dark',
    defaultMap: 'tactical_starter_map',
    allowFriendlyFire: false,
    enableLineOfSight: true,
    teamColors: {
      team0: '#3b82f6',
      team1: '#f59e0b',
    },
    teamNames: {
      team0: 'COUNTER-TERRORIST SQUAD',
      team1: 'TERRORIST STRIKE FORCE',
    },
    hud: {
      layout: 'two_top_two_bottom',
      showNames: true,
      showHpNumbers: true,
      showDamage: true,
      showHealthBar: true,
      showSkillBars: false
    },
    maxAfterimages: 4,
    afterimageDecayMultiplier: 1.8,
  },

  [TACTICAL_GAME_MODES.TACTICAL_RANDOM]: {
    id: 'tactical_random',
    label: 'Tactical Random',
    shortLabel: 'Random Loadouts',
    description: 'Random firearm weapon loadouts allocated each round to test operator adaptability across all calibers.',
    rounds: 3,
    fixedHp: 500,
    hpMultiplier: 1.0,
    speedMultiplier: 1.35,
    supportFourFighters: true,
    fighterCount: 4,
    arenaTheme: 'dark',
    defaultMap: 'tactical_starter_map',
    allowFriendlyFire: false,
    enableLineOfSight: true,
    teamColors: {
      team0: '#3b82f6',
      team1: '#ef4444',
    },
    teamNames: {
      team0: 'TEAM ALPHA',
      team1: 'TEAM OMEGA',
    },
    hud: {
      layout: 'two_top_two_bottom',
      showNames: true,
      showHpNumbers: true,
      showDamage: true,
      showHealthBar: true,
      showSkillBars: false
    },
    maxAfterimages: 4,
    afterimageDecayMultiplier: 1.8,
  },
};

/**
 * Global Tactical Shooter System Rules & Physics Parameters
 */
export const TACTICAL_SYSTEM_CONFIG = {
  // Ammunition & Reload Behavior
  ammo: {
    autoReloadOnEmpty: true,
    tacticalReloadSpeedMultiplier: 1.0,
    cancelReloadOnStun: false,
  },
  // Recoil & Knockback Physics
  recoil: {
    enableScreenShake: true,
    knockbackRecoveryRate: 0.88,
    muzzleFlashDecayFrames: 4,
  },
  // 2D Line of Sight & Raycasting
  lineOfSight: {
    enabled: true,
    raycastStepSize: 4,
    wallOcclusionStopsAim: true,
    holdFireWhenOccluded: true,
  },
  // Visual Aesthetics Standards
  visuals: {
    theme: 'neon_cyberpunk',
    outerCanvasColor: '#000000',
    arenaFloorColor: '#0d1117',
    coverObstacleColor: '#1e293b',
    coverBorderColor: '#475569',
  }
};

/**
 * Checks if a given mode string corresponds to a Tactical Shooter mode.
 */
export function isTacticalMode(mode) {
  if (!mode) return false;
  return Object.values(TACTICAL_GAME_MODES).includes(mode) || String(mode).toLowerCase().startsWith('tactical');
}

/**
 * Retrieves the configuration settings for a given tactical mode string.
 */
export function getTacticalModeSettings(mode) {
  return TACTICAL_MODE_SETTINGS[mode] || TACTICAL_MODE_SETTINGS[TACTICAL_GAME_MODES.TACTICAL_2V2];
}
