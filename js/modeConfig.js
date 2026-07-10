// ─────────────────────────────────────────────
// GAME MODE CONFIGURATION
// ─────────────────────────────────────────────

export const GAME_MODES = {
  ONE_VS_ONE: '1v1',
  TWO_VS_TWO: '2v2',
  FFA: 'FFA',
};

export const MODE_SETTINGS = {
  [GAME_MODES.ONE_VS_ONE]: {
    label: '1v1',
    rounds: 3,
    hpMultiplier: 1.2,
    speedMultiplier: 1,
    initialFuelPickups: 2,
    supportFourFighters: false,
  },
  [GAME_MODES.TWO_VS_TWO]: {
    label: '2v2',
    rounds: 5,
    hpMultiplier: 3,
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
    speedMultiplier: 1,
    initialFuelPickups: 3,
    supportFourFighters: true,
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
};
