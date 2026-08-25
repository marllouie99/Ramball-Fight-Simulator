// ─────────────────────────────────────────────
// TACTICAL FORCE — MONOLITH MAP (SECTOR 02)
// Tactical arena featuring 3 prominent monolithic pillars along the center axis
// with wide flanking lanes and crossfire corridors.
// ─────────────────────────────────────────────

export const MONOLITH_MAP = {
  id: 'tactical_monolith_map',
  name: 'TACTICAL SECTOR // 02: MONOLITH',
  codeName: 'SECTOR 02 // MONOLITH',
  desc: 'Massive central monolith pillar divides the arena into wide open flanking lanes and crossfire ambush corridors.',

  // ── Arena Bounds & Geometry (Elongated Tactical Arena: 440 x 680 at x:50, y:150) ──
  arena: {
    x: 50,
    y: 150,
    width: 440,
    height: 680,
    wallWidth: 6
  },

  // ── Colors & Themes (Clean, Minimalist Tactical) ──
  theme: {
    floorBase: '#0b0f19',
    floorBorder: '#334155',
    wallColor: '#1e293b',
    wallBorder: '#475569',
    team0Accent: '#3b82f6',
    team1Accent: '#ef4444'
  },

  // ── Prominent Central Monolith Pillar ──
  obstacles: [
    // Core Center Monolith (Mid Pillar)
    {
      id: 'center_monolith',
      type: 'wall',
      x: 180,
      y: 425,
      w: 180,
      h: 130,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    }
  ],

  // ── Spawn Positions (2P West/East, 3P West/East/North, 4P West/East/North/South) ──
  spawns: {
    // 2 Players: West vs East flank
    twoPlayer: [
      { x: 115, y: 490, angle: 0 },         // West Mid (facing East)
      { x: 425, y: 490, angle: Math.PI }    // East Mid (facing West)
    ],
    // 3 Players: West, East, North Corridor
    threePlayer: [
      { x: 115, y: 490, angle: 0 },         // West Mid (facing East)
      { x: 425, y: 490, angle: Math.PI },   // East Mid (facing West)
      { x: 270, y: 280, angle: Math.PI * 0.5 } // North Open Zone (facing South)
    ],
    // 4 Players: Cross configuration (West, East, North, South)
    fourPlayer: [
      { x: 115, y: 490, angle: 0 },          // West Mid (facing East)
      { x: 425, y: 490, angle: Math.PI },    // East Mid (facing West)
      { x: 270, y: 280, angle: Math.PI * 0.5 },  // North Open Zone (facing South)
      { x: 270, y: 700, angle: -Math.PI * 0.5 } // South Open Zone (facing North)
    ],
    // Team Spawns: Team 0 at West/North, Team 1 at East/South
    team0: [
      { x: 115, y: 490, angle: 0 },
      { x: 270, y: 280, angle: Math.PI * 0.5 }
    ],
    team1: [
      { x: 425, y: 490, angle: Math.PI },
      { x: 270, y: 700, angle: -Math.PI * 0.5 }
    ],
    ffa: [
      { x: 115, y: 490, angle: 0 },
      { x: 425, y: 490, angle: Math.PI },
      { x: 270, y: 280, angle: Math.PI * 0.5 },
      { x: 270, y: 700, angle: -Math.PI * 0.5 }
    ]
  }
};
