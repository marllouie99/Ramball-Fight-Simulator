// ─────────────────────────────────────────────
// GAME MODE CONFIGURATION
// ─────────────────────────────────────────────

export const GAME_MODES = {
  ONE_VS_ONE: '1v1',
  ONE_VS_TWO: '1v2',
  STAND_OFF: 'Stand Off',
  STAND_OFF_1V2: '1v2 Stand Off',
  TWO_VS_TWO: '2v2',
  FFA: 'FFA',
  TLFS: 'TLFS',
  TAG_MATCH: 'Tag Match',
  BOSS_BATTLE: 'Boss Battle',
  TACTICAL_1V1: 'Tactical 1v1',
  TACTICAL_FFA: 'Tactical FFA',
  TACTICAL_2V2: 'Tactical 2v2',
  TACTICAL_4V4: 'Tactical 4v4',
};

export const MODE_SETTINGS = {
  [GAME_MODES.ONE_VS_ONE]: {
    label: '1v1',
    rounds: 3,
    hpMultiplier: 1.2,
    fixedHp: 200,
    speedMultiplier: 1.5,
    initialFuelPickups: 2,
    supportFourFighters: false,
  },
  [GAME_MODES.ONE_VS_TWO]: {
    label: '1v2',
    rounds: 3,
    hpMultiplier: 1.0,
    fixedHp: 200,
    speedMultiplier: 1.2,
    initialFuelPickups: 2,
    supportFourFighters: false,
  },
  [GAME_MODES.STAND_OFF]: {
    label: 'Stand Off',
    rounds: 1, // Only 1 round in Stand Off
    hpMultiplier: 1.0,
    fixedHp: 1000, // 1000 HP for both fighters
    speedMultiplier: 1.0,
    initialFuelPickups: 2,
    supportFourFighters: false,
  },
  [GAME_MODES.STAND_OFF_1V2]: {
    label: '1v2 Stand Off',
    rounds: 1,
    hpMultiplier: 1.0,
    fixedHp: 1000,
    speedMultiplier: 1.0,
    initialFuelPickups: 2,
    supportFourFighters: false,
  },
  [GAME_MODES.TLFS]: {
    label: 'TLFS',
    rounds: 1, // Only 1 round in TLFS
    hpMultiplier: 1.2,
    speedMultiplier: 1.4,
    initialFuelPickups: 2,
    supportFourFighters: false,
    playerFixedHp: 500, // Configurable fixed HP for the player
  },
  [GAME_MODES.TAG_MATCH]: {
    label: 'Tag Match',
    rounds: 1,
    hpMultiplier: 1.0,
    speedMultiplier: 1.2,
    initialFuelPickups: 2,
    supportFourFighters: false,
    teamColors: {
      team0: '#ff4d4d',
      team1: '#4da3ff',
    },
  },
  [GAME_MODES.BOSS_BATTLE]: {
    label: 'Boss Battle',
    rounds: 1,
    hpMultiplier: 1.0,
    fixedHp: 1000,
    speedMultiplier: 1.0,
    initialFuelPickups: 2,
    supportFourFighters: false,
  },
  [GAME_MODES.TWO_VS_TWO]: {
    label: '2v2',
    rounds: 5,
    hpMultiplier: 3,
    fixedHp: 3000,
    speedMultiplier: 1.1,
    initialFuelPickups: 3,
    supportFourFighters: true,
    teamColors: {
      team0: '#ff4d4d',
      team1: '#4da3ff',
    },
  },
  [GAME_MODES.FFA]: {
    label: 'FFA',
    rounds: 5,
    hpMultiplier: 2,
    fixedHp: 1000,
    speedMultiplier: 1.5,
    initialFuelPickups: 3,
    supportFourFighters: true,
  },
  [GAME_MODES.TACTICAL_1V1]: {
    label: 'Tactical 1v1',
    rounds: 3,
    hpMultiplier: 1.0,
    speedMultiplier: 1.0,
    initialFuelPickups: 2,
    supportFourFighters: false,
  },
  [GAME_MODES.TACTICAL_FFA]: {
    label: 'Tactical FFA',
    rounds: 5,
    hpMultiplier: 2,
    speedMultiplier: 1.0,
    initialFuelPickups: 3,
    supportFourFighters: true,
  },
  [GAME_MODES.TACTICAL_2V2]: {
    label: 'Tactical 2v2',
    rounds: 5,
    hpMultiplier: 3,
    speedMultiplier: 1.0,
    initialFuelPickups: 3,
    supportFourFighters: true,
    teamColors: {
      team0: '#ff4d4d',
      team1: '#4da3ff',
    },
  },
  [GAME_MODES.TACTICAL_4V4]: {
    label: 'Tactical 4v4',
    rounds: 5,
    hpMultiplier: 3,
    speedMultiplier: 1.0,
    initialFuelPickups: 4,
    supportFourFighters: true,
    teamColors: {
      team0: '#ff4d4d',
      team1: '#4da3ff',
    },
  },
};

export const MODE_ROUNDS = Object.fromEntries(
  Object.entries(MODE_SETTINGS).map(([mode, settings]) => [mode, settings.rounds])
);

export const MODE_HP_MULTIPLIER = Object.fromEntries(
  Object.entries(MODE_SETTINGS).map(([mode, settings]) => [mode, settings.hpMultiplier])
);

export const MODE_SPEED_MULTIPLIER = Object.fromEntries(
  Object.entries(MODE_SETTINGS).map(([mode, settings]) => [mode, settings.speedMultiplier])
);

export const MODE_TEAM_COLORS = {
  [GAME_MODES.TWO_VS_TWO]: MODE_SETTINGS[GAME_MODES.TWO_VS_TWO].teamColors,
  [GAME_MODES.TAG_MATCH]: MODE_SETTINGS[GAME_MODES.TAG_MATCH].teamColors,
  [GAME_MODES.TACTICAL_2V2]: MODE_SETTINGS[GAME_MODES.TACTICAL_2V2].teamColors,
  [GAME_MODES.TACTICAL_4V4]: MODE_SETTINGS[GAME_MODES.TACTICAL_4V4].teamColors,
};
