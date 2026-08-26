// ─────────────────────────────────────────────
// TACTICAL FORCE — MONOLITH MAP (SECTOR 02)
// Tactical arena featuring 4 prominent monolithic pillars arranged in a 2x2 grid
// with center crossfire intersection corridors and wide flanking lanes.
// ─────────────────────────────────────────────

export const MONOLITH_MAP = {
  id: 'tactical_monolith_map',
  name: 'TACTICAL SECTOR // 02: MONOLITH',
  codeName: 'SECTOR 02 // MONOLITH',
  desc: 'Quad central monolith pillars divided by a crossfire intersection, creating 4-way cover pockets and dynamic tactical shootouts.',

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

  // ── Prominent Quad Monolith Pillars (2x2 Grid with Expanded Crossfire Gap) ──
  obstacles: [
    // Top-Left Monolith Pillar
    {
      id: 'monolith_nw',
      type: 'wall',
      x: 138,
      y: 365,
      w: 80,
      h: 75,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // Top-Right Monolith Pillar
    {
      id: 'monolith_ne',
      type: 'wall',
      x: 322,
      y: 365,
      w: 80,
      h: 75,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // Bottom-Left Monolith Pillar
    {
      id: 'monolith_sw',
      type: 'wall',
      x: 138,
      y: 540,
      w: 80,
      h: 75,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // Bottom-Right Monolith Pillar
    {
      id: 'monolith_se',
      type: 'wall',
      x: 322,
      y: 540,
      w: 80,
      h: 75,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    }
  ],

  // ── Spawn Positions (Pinwheel Layout: West-NW, East-SE, North-NE, South-SW) ──
  spawns: {
    // 2 Players: West-NW vs East-SE diagonal flank
    twoPlayer: [
      { x: 94, y: 400, angle: 0 },           // West (beside NW Monolith, facing East)
      { x: 446, y: 580, angle: Math.PI }     // East (beside SE Monolith, facing West)
    ],
    // 3 Players: West-NW, East-SE, North-NE
    threePlayer: [
      { x: 94, y: 400, angle: 0 },           // West (beside NW Monolith, facing East)
      { x: 446, y: 580, angle: Math.PI },    // East (beside SE Monolith, facing West)
      { x: 362, y: 260, angle: Math.PI * 0.5 } // North (above NE Monolith, facing South)
    ],
    // 4 Players: Pinwheel configuration (West-NW, East-SE, North-NE, South-SW)
    fourPlayer: [
      { x: 94, y: 400, angle: 0 },           // West (beside NW Monolith, facing East)
      { x: 446, y: 580, angle: Math.PI },    // East (beside SE Monolith, facing West)
      { x: 362, y: 260, angle: Math.PI * 0.5 },  // North (above NE Monolith, facing South)
      { x: 178, y: 720, angle: -Math.PI * 0.5 } // South (below SW Monolith, facing North)
    ],
    // Team Spawns: Team 0 at West-NW / North-NE, Team 1 at East-SE / South-SW
    team0: [
      { x: 94, y: 400, angle: 0 },
      { x: 362, y: 260, angle: Math.PI * 0.5 }
    ],
    team1: [
      { x: 446, y: 580, angle: Math.PI },
      { x: 178, y: 720, angle: -Math.PI * 0.5 }
    ],
    ffa: [
      { x: 94, y: 400, angle: 0 },
      { x: 446, y: 580, angle: Math.PI },
      { x: 362, y: 260, angle: Math.PI * 0.5 },
      { x: 178, y: 720, angle: -Math.PI * 0.5 }
    ]
  }
};
