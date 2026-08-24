// ─────────────────────────────────────────────
// TACTICAL FORCE — MONOLITH MAP (SECTOR 02)
// Tactical arena featuring 3 prominent monolithic pillars along the center axis
// with wide flanking lanes and crossfire corridors.
// ─────────────────────────────────────────────

export const MONOLITH_MAP = {
  id: 'tactical_monolith_map',
  name: 'TACTICAL SECTOR // 02: MONOLITH',
  codeName: 'SECTOR 02 // MONOLITH',
  desc: 'Three massive vertical monolith pillars divide the arena into dual flanking lanes and tight crossfire ambush corridors.',

  // ── Arena Bounds & Geometry (Scaled Tactical Battleground: 500 x 560 at x:20, y:170) ──
  arena: {
    x: 20,
    y: 170,
    width: 500,
    height: 560,
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

  // ── 3 Prominent Central Monolith Pillars ──
  obstacles: [
    // 1. Top Monolith (North Pillar)
    {
      id: 'north_monolith',
      type: 'wall',
      x: 200,
      y: 170,
      w: 140,
      h: 95,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // 2. Core Center Monolith (Mid Pillar)
    {
      id: 'center_monolith',
      type: 'wall',
      x: 200,
      y: 395,
      w: 140,
      h: 110,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // 3. Bottom Monolith (South Pillar)
    {
      id: 'south_monolith',
      type: 'wall',
      x: 200,
      y: 635,
      w: 140,
      h: 95,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    }
  ],

  // ── Spawn Positions (2P West/East, 3P West/East/North, 4P West/East/North/South) ──
  spawns: {
    // 2 Players: West vs East flank
    twoPlayer: [
      { x: 95, y: 450, angle: 0 },         // West Mid (facing East)
      { x: 445, y: 450, angle: Math.PI }    // East Mid (facing West)
    ],
    // 3 Players: West, East, North Corridor
    threePlayer: [
      { x: 95, y: 450, angle: 0 },         // West Mid (facing East)
      { x: 445, y: 450, angle: Math.PI },   // East Mid (facing West)
      { x: 270, y: 315, angle: Math.PI * 0.5 } // North Mid Corridor (facing South)
    ],
    // 4 Players: Cross configuration (West, East, North, South)
    fourPlayer: [
      { x: 95, y: 450, angle: 0 },          // West Mid (facing East)
      { x: 445, y: 450, angle: Math.PI },    // East Mid (facing West)
      { x: 270, y: 315, angle: Math.PI * 0.5 },  // North Mid Corridor (facing South)
      { x: 270, y: 585, angle: -Math.PI * 0.5 } // South Mid Corridor (facing North)
    ],
    // Team Spawns: Team 0 at West/North, Team 1 at East/South
    team0: [
      { x: 95, y: 450, angle: 0 },
      { x: 270, y: 315, angle: Math.PI * 0.5 }
    ],
    team1: [
      { x: 445, y: 450, angle: Math.PI },
      { x: 270, y: 585, angle: -Math.PI * 0.5 }
    ],
    ffa: [
      { x: 95, y: 450, angle: 0 },
      { x: 445, y: 450, angle: Math.PI },
      { x: 270, y: 315, angle: Math.PI * 0.5 },
      { x: 270, y: 585, angle: -Math.PI * 0.5 }
    ]
  }
};
