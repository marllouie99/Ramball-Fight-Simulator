// ─────────────────────────────────────────────
// FOC Maps — Yuta Okkotsu: Cursed Grove Map Config
// ─────────────────────────────────────────────

export const YUTA_BUSH_MAP = {
  id: 'foc_yuta_bush_map',
  bossId: 'yuta',
  bossTitle: 'The Bush Camper',
  bossSubtitle: 'THE BUSH CAMPER, SPECIAL GRADE SORCERER',
  title: "Yuta's Cursed Grove",
  name: "YUTA'S CURSED GROVE",
  codeName: 'BUSH CAMPER ARENA',
  desc: 'Special Grade sorcerer proving grounds featuring thick tactical foliage clustered in all four corners.',

  // ── Arena Bounds (Standard FOC 460x460 Square Arena) ──
  arena: {
    x: 40,
    y: 170,
    width: 460,
    height: 460,
    wallWidth: 4,
    shape: 'square'
  },

  // ── Theme & Environmental Styling ──
  theme: {
    floorBase: '#FFFFFF',
    floorBorder: '#111114',
    wallColor: '#111114',
    wallBorder: '#111114',
    bushShadowColor: 'rgba(15, 23, 42, 0.42)',
    bushOutlineColor: '#0E230A'
  },

  // ── Foliage & Interactive Mechanics Tuning ──
  foliage: {
    defaultRadius: 48,
    drawSizeMultiplier: 2.45,
    maxRustleTimer: 24,
    rustleIncrement: 3,
    swayDamping: 0.86,
    swayMaxX: 4.0,
    swayMaxY: 2.5,
    swaySpeedMultX: 0.7,
    swaySpeedMultY: 0.4,
    leafSpawnChance: 0.22,
    maxActiveLeaves: 32,
    leafColors: ['#3B8226', '#225E16', '#84CC16', '#143D0F', '#4ADE80', '#15803D']
  },

  // ── Boss Yuta Special Bush Interactions (Active while inside bush, removed on exit) ──
  bossInteractions: {
    stealthAlpha: 0.40,          // Boss Yuta becomes slightly transparent (40% opacity) while in bush
    evadeChance: 0.75,           // 75% evasion chance against incoming enemy basic attacks & projectiles
    speedMultiplier: 0.65,       // Dense foliage drag slows movement speed down to 65% while inside bush
    undetectedInBush: true,      // Challengers cannot target or auto-aim at Boss Yuta while hiding in bush
    camoFadeSpeed: 0.12,         // Smooth transition rate into/out of camouflage
    showStatusNotification: true // Shows 'BUSH CAMOUFLAGE!' popup upon entering foliage
  },

  // ── Sprite Sheets & Visual Asset Configuration ──
  sprites: {
    singleBush: 'Assets/model/Sprites/Bush-sprite.png',
    rustleSheet: 'Assets/model/Sprites/Bush- Rustling Pixel Bush Sprite Sheet.png',
    drawSizeMultiplier: 2.45,
    animFrameRateDivider: 4,
    rustleAnimSequence: [1, 2, 5, 3, 4, 2, 1],
    frameBoundingBoxes: [
      { sx: 50, sy: 101, sw: 420, sh: 420 },   // Frame 0: Default compact
      { sx: 551, sy: 103, sw: 420, sh: 420 },  // Frame 1: Rustle left
      { sx: 1060, sy: 104, sw: 420, sh: 420 }, // Frame 2: Rustle right with loose leaves
      { sx: 62, sy: 540, sw: 420, sh: 420 },   // Frame 3: Rustle both sides
      { sx: 561, sy: 549, sw: 420, sh: 420 },  // Frame 4: Rustle top
      { sx: 1062, sy: 554, sw: 420, sh: 420 }  // Frame 5: Intense rustle shake
    ]
  },

  // ── 12 Corner Bushes (3 per corner in tightly clustered L-shapes matching reference layout) ──
  bushes: [
    // Top-Left Corner Cluster (3 Bushes)
    { id: 'tl_corner', x: 40 + 50, y: 170 + 50, radius: 48, swayX: 0, swayY: 0, rustleTimer: 0 },
    { id: 'tl_top',    x: 40 + 122, y: 170 + 50, radius: 48, swayX: 0, swayY: 0, rustleTimer: 0 },
    { id: 'tl_left',   x: 40 + 50, y: 170 + 122, radius: 48, swayX: 0, swayY: 0, rustleTimer: 0 },

    // Top-Right Corner Cluster (3 Bushes)
    { id: 'tr_corner', x: 40 + 460 - 50, y: 170 + 50, radius: 48, swayX: 0, swayY: 0, rustleTimer: 0 },
    { id: 'tr_top',    x: 40 + 460 - 122, y: 170 + 50, radius: 48, swayX: 0, swayY: 0, rustleTimer: 0 },
    { id: 'tr_right',  x: 40 + 460 - 50, y: 170 + 122, radius: 48, swayX: 0, swayY: 0, rustleTimer: 0 },

    // Bottom-Left Corner Cluster (3 Bushes)
    { id: 'bl_corner', x: 40 + 50, y: 170 + 460 - 50, radius: 48, swayX: 0, swayY: 0, rustleTimer: 0 },
    { id: 'bl_bottom', x: 40 + 122, y: 170 + 460 - 50, radius: 48, swayX: 0, swayY: 0, rustleTimer: 0 },
    { id: 'bl_left',   x: 40 + 50, y: 170 + 460 - 122, radius: 48, swayX: 0, swayY: 0, rustleTimer: 0 },

    // Bottom-Right Corner Cluster (3 Bushes)
    { id: 'br_corner', x: 40 + 460 - 50, y: 170 + 460 - 50, radius: 48, swayX: 0, swayY: 0, rustleTimer: 0 },
    { id: 'br_bottom', x: 40 + 460 - 122, y: 170 + 460 - 50, radius: 48, swayX: 0, swayY: 0, rustleTimer: 0 },
    { id: 'br_right',  x: 40 + 460 - 50, y: 170 + 460 - 122, radius: 48, swayX: 0, swayY: 0, rustleTimer: 0 },
  ],

  // ── Spawn Locations ──
  spawns: {
    boss: { x: 270, y: 400, angle: 0 },
    challengers: [
      { x: 270, y: 530, angle: -Math.PI / 2 },
      { x: 170, y: 530, angle: -Math.PI / 2 },
      { x: 370, y: 530, angle: -Math.PI / 2 }
    ]
  },

  // ── Audio Configuration, Volume, Speed, Chance & Timing Delays ──
  sounds: {
    bushRustle: 'Assets/Sound Effects/Sprites SFX/walk-on-grass.mp3',
    leafFlutter: 'Assets/Sound Effects/Sprites SFX/walk-on-grass.mp3'
  },
  soundVolumes: {
    bushRustle: 0.48,
    leafFlutter: 0.25
  },
  soundSpeeds: {
    bushRustle: 1.0,
    leafFlutter: 1.15
  },
  soundChances: {
    bushRustle: 1.0,
    leafFlutter: 0.22
  },
  soundDelays: {
    debounceFrames: 24,       // Minimum frames between consecutive step SFX (prevents rapid-fire trigger)
    strideDistance: 38,       // Minimum distance (px) walked inside foliage to trigger next step sound
    pitchVariation: 0.12      // Subtle pitch variation range (+/- 6%) for organic non-repetitive steps
  }
};
