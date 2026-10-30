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
  TEAMFIGHT_3V3V3V3: '3v3v3v3 Teamfight',
  TEAMFIGHT_2V2V2V2: '2v2v2v2 Quad',
  TEAM_4V4: '4v4 Grand War',
  BATTLE_ROYALE_8: '8-Fighter Battle Royale',
  HORIZONTAL_1V1: '1v1 Widescreen Duel',
  SURVIVOR: 'Survivor',
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
    speedMultiplier: 1.2,
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
    speedMultiplier: 1.5,
    initialFuelPickups: 2,
    supportFourFighters: false,
    playerFixedHp: 2000, // Configurable fixed HP for the player
    challengerFixedHp: 500, // Configurable fixed HP for challengers in Gauntlet mode
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
    speedMultiplier: 1.0,
    initialFuelPickups: 3,
    supportFourFighters: true,
  },
  [GAME_MODES.TEAMFIGHT_3V3V3V3]: {
    label: '3v3v3v3 Teamfight',
    rounds: 1,
    hpMultiplier: 2.0,
    fixedHp: 1500,
    speedMultiplier: 1.15,
    initialFuelPickups: 4,
    supportTwelveFighters: true,
    teamCount: 4,
    fightersPerTeam: 3,
    teamColors: {
      team0: '#FF3366',
      team1: '#00D2FF',
      team2: '#00FF66',
      team3: '#FFD700',
    },
  },
  [GAME_MODES.TEAMFIGHT_2V2V2V2]: {
    label: '2v2v2v2 Quad',
    rounds: 1,
    hpMultiplier: 2.0,
    fixedHp: 1500,
    speedMultiplier: 1.15,
    initialFuelPickups: 4,
    supportEightFighters: true,
    teamCount: 4,
    fightersPerTeam: 2,
    teamColors: {
      team0: '#FF3366',
      team1: '#00D2FF',
      team2: '#00FF66',
      team3: '#FFD700',
    },
  },
  [GAME_MODES.TEAM_4V4]: {
    label: '4v4 Grand War',
    rounds: 1,
    hpMultiplier: 2.0,
    fixedHp: 1500,
    speedMultiplier: 1.15,
    initialFuelPickups: 4,
    supportEightFighters: true,
    teamCount: 2,
    fightersPerTeam: 4,
    teamColors: {
      team0: '#FF3366',
      team1: '#00D2FF',
    },
  },
  [GAME_MODES.BATTLE_ROYALE_8]: {
    label: '8-Fighter Battle Royale',
    rounds: 1,
    hpMultiplier: 2.0,
    fixedHp: 1500,
    speedMultiplier: 1.15,
    initialFuelPickups: 4,
    supportEightFighters: true,
  },
  [GAME_MODES.HORIZONTAL_1V1]: {
    label: '1v1',
    rounds: 3,
    hpMultiplier: 1.2,
    fixedHp: 1000,
    speedMultiplier: 1.0,
    initialFuelPickups: 2,
    supportFourFighters: false,
  },
  [GAME_MODES.SURVIVOR]: {
    label: 'Survivor',
    rounds: 1,
    hpMultiplier: 1.0,
    playerFixedHp: 500,
    speedMultiplier: 1.0,
    initialFuelPickups: 0,
    supportFourFighters: false,
    isSurvivorMode: true,
    isHordeMode: true,
    teamColors: {
      team0: '#00FF66',
      team1: '#FF3366',
    },

    // ─────────────────────────────────────────────────────────────────────────
    // SURVIVOR HORDE & SPAWNING CONFIGURATION
    // Configure spawn rates, density, and enemy rosters for Circle Survivor mode
    // ─────────────────────────────────────────────────────────────────────────

    // 1. SPAWN RATE CONFIGURATION:
    // • spawnInterval: Delay in frames between waves at match start (60 frames = 1 second)
    // • minSpawnInterval: Hard cap on fastest wave spawn interval as match escalates (default: 20)
    // • spawnRateMultiplier: Overall spawn frequency multiplier (e.g. 1.0 = normal, 2.0 = 2x faster spawns)
    // • spawnCountPerWave: Base number of enemies spawned per wave (default: 2)
    // • maxConcurrentMobs: Cap on maximum active horde mobs alive simultaneously (default: 40)
    spawnInterval: 60,
    minSpawnInterval: 20,
    spawnRateMultiplier: 1.0,
    spawnCountPerWave: 2,
    maxConcurrentMobs: 40,

    // 2. ENEMY ROSTER (Regular Horde Mobs):
    // List of characterId strings specifying who will spawn in the horde.
    // Each wave spawn randomly chooses an enemy from this pool.
    // Default: ['knight']
    // Example: ['knight', 'berserker', 'spartan', 'musashi']
    enemyPool: [
      'knight',
    ],

    // 3. MILESTONE BOSS ENCOUNTERS:
    // Scheduled elite mini-bosses and climax final boss.
    // Can be a characterId string (e.g. 'knight', 'escanor') or a full object definition:
    bosses: {
      // 1:00 Minute Mark Mini-Boss (Chest drop on defeat):
      miniBoss1: {
        characterId: 'knight',
        name: 'Elite Knight Commander',
        hp: 450,
        radius: 32,
        speed: 1.9,
        damage: 18,
      },
      // 2:00 Minute Mark Mini-Bosses (can be an object or array of objects):
      miniBoss2: [
        {
          characterId: 'knight',
          name: 'Paladin Champion A',
          hp: 600,
          radius: 32,
          speed: 2.1,
          damage: 22,
        },
        {
          characterId: 'knight',
          name: 'Paladin Champion B',
          hp: 600,
          radius: 32,
          speed: 2.1,
          damage: 22,
        },
      ],
      // 3:00 Minute Mark Climax Final Boss:
      finalBoss: {
        characterId: 'knight',
        name: 'The Dark Overlord',
        hp: 1800,
        radius: 42,
        speed: 2.2,
        damage: 30,
      },
    },

    // 4. MATCH RULES & PLAYER SETTINGS:
    matchDurationSec: 180,       // 3:00 minutes total duration
    miniBoss1TimeSec: 60,        // 1:00 mark
    miniBoss2TimeSec: 120,       // 2:00 mark
    finalBossTimeSec: 180,       // 3:00 mark
    startingWeapon: 'orbiters',  // 'orbiters' | 'garlic' | 'kunai' | 'thunder' | 'scythe'
  },
};

export const DEFAULT_SURVIVOR_SETTINGS = JSON.parse(JSON.stringify(MODE_SETTINGS[GAME_MODES.SURVIVOR]));

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
  [GAME_MODES.TEAMFIGHT_3V3V3V3]: MODE_SETTINGS[GAME_MODES.TEAMFIGHT_3V3V3V3].teamColors,
  [GAME_MODES.TEAMFIGHT_2V2V2V2]: MODE_SETTINGS[GAME_MODES.TEAMFIGHT_2V2V2V2].teamColors,
  [GAME_MODES.TEAM_4V4]: MODE_SETTINGS[GAME_MODES.TEAM_4V4].teamColors,
  [GAME_MODES.SURVIVOR]: MODE_SETTINGS[GAME_MODES.SURVIVOR].teamColors,
};
