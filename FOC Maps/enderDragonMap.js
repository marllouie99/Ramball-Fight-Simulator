// ─────────────────────────────────────────────
// FOC Maps — Ender Dragon: The End Dimension Map Config
// Dedicated Boss Map featuring 8 Perimeter End Crystal Pillar Anchors
// ─────────────────────────────────────────────

export const ENDER_DRAGON_MAP = {
  id: 'foc_ender_dragon_map',
  bossId: 'ender_dragon',
  bossTitle: 'Ruler of The End',
  bossSubtitle: 'THE END IS NEAR — BEAST OF THE VOID',
  title: "The End Dimension",
  name: "THE END DIMENSION",
  codeName: "ENDER DRAGON'S DOMAIN",
  desc: "The sacred floating obsidian realm of The End. Surrounded by 8 pulsating End Crystals atop colossal obsidian pillars.",

  // ── Arena Bounds (Standard FOC 460x460 Arena) ──
  arena: {
    x: 40,
    y: 170,
    width: 460,
    height: 460,
    wallWidth: 4,
    shape: 'square',
  },

  // ── Theme & Environmental Styling ──
  theme: {
    floorBase: '#0D0E15',          // Deep void obsidian charcoal
    floorAccent: '#161824',        // End stone floor tiles
    floorBorder: '#C026D3',        // Void magenta neon boundary
    wallColor: '#18181B',          // Obsidian wall receiver
    wallBorder: '#C026D3',         // Amethyst glowing wall outline
    pillarColor: '#101014',        // Obsidian pillar body
    pillarAccent: '#27272A',       // Obsidian rim highlight
    pillarRuneColor: '#A21CAF',     // Glowing bedrock rune
    centerPortalColor: '#581C87',  // Central bedrock portal fountain
    tetherBeamColor: '#D946EF',    // Crystal healing tether beam
    tetherCoreColor: '#F5D0FE',    // Beam white-hot core
  },

  // ── 8 Perimeter Pillar Anchors (Reference: Enderdragon.jpg) ──
  crystals: [
    // Top Row (3 Crystals)
    { id: 'crystal_tl', x: 40 + 55,  y: 170 + 55,  radius: 24, name: 'Northwest Crystal' },
    { id: 'crystal_tc', x: 40 + 230, y: 170 + 55,  radius: 24, name: 'North Crystal' },
    { id: 'crystal_tr', x: 40 + 405, y: 170 + 55,  radius: 24, name: 'Northeast Crystal' },

    // Middle Row (2 Crystals)
    { id: 'crystal_ml', x: 40 + 55,  y: 170 + 230, radius: 24, name: 'West Crystal' },
    { id: 'crystal_mr', x: 40 + 405, y: 170 + 230, radius: 24, name: 'East Crystal' },

    // Bottom Row (3 Crystals)
    { id: 'crystal_bl', x: 40 + 55,  y: 170 + 405, radius: 24, name: 'Southwest Crystal' },
    { id: 'crystal_bc', x: 40 + 230, y: 170 + 405, radius: 24, name: 'South Crystal' },
    { id: 'crystal_br', x: 40 + 405, y: 170 + 405, radius: 24, name: 'Southeast Crystal' },
  ],

  // ── Central Bedrock Portal / Perch Fountain Anchor ──
  centerAnchor: {
    x: 40 + 230, // 270
    y: 170 + 230, // 400
    radius: 42,
  },

  // ── Sprite Sheet Configuration ──
  sprites: {
    crystalSheet: 'Assets/model/Sprites/End-crystal-animation-sprite-sheet.png',
    frameCount: 6,
    frameWidth: 362,
    frameHeight: 724,
    animTicksPerFrame: 4, // Smooth rotation
    drawSize: 64,
  },

  // ── Spawn Locations ──
  spawns: {
    boss: { x: 270, y: 400, angle: 0 },
    challengers: [
      { x: 270, y: 530, angle: -Math.PI / 2 },
      { x: 170, y: 530, angle: -Math.PI / 2 },
      { x: 370, y: 530, angle: -Math.PI / 2 },
    ],
  },

  // ── Audio SFX Configuration ──
  sounds: {
    crystalHum: 'Assets/Sound Effects/Skills/purpledeploy.mp3',
    crystalDetonate: 'Assets/Sound Effects/Attacks/explosion.mp3',
    crystalHealBeam: 'Assets/Sound Effects/Skills/thunderstrike.mp3',
  },
  soundVolumes: {
    crystalHum: 0.40,
    crystalDetonate: 0.95,
    crystalHealBeam: 0.60,
  }
};
