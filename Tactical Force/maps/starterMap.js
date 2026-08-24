// ─────────────────────────────────────────────
// TACTICAL FORCE — STARTER MAP
// Clean, competitive 2v2 tactical layout with spawn pockets and center barrier
// ─────────────────────────────────────────────

export const STARTER_MAP = {
  id: 'tactical_starter_map',
  name: 'TACTICAL SECTOR // 01',
  codeName: 'SECTOR 01',
  desc: 'Clean tactical arena featuring structured spawn pockets, corner barriers, and a center lane cover wall.',

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

  // ── Clean Tactical Barriers ──
  obstacles: [
    // 1. Top-Left Horizontal Barrier
    {
      id: 'top_left_wall',
      type: 'wall',
      x: 20,
      y: 250,
      w: 135,
      h: 10,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // 2. Top-Right Horizontal Barrier
    {
      id: 'top_right_wall',
      type: 'wall',
      x: 365,
      y: 250,
      w: 135,
      h: 10,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // 3. Top-Center Vertical Divider
    {
      id: 'top_center_divider',
      type: 'wall',
      x: 265,
      y: 170,
      w: 10,
      h: 100,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // 4. Center Mid-Lane Horizontal Barrier
    {
      id: 'mid_center_wall',
      type: 'wall',
      x: 185,
      y: 445,
      w: 170,
      h: 10,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // 5. Bottom-Left Horizontal Barrier
    {
      id: 'bottom_left_wall',
      type: 'wall',
      x: 20,
      y: 650,
      w: 135,
      h: 10,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // 6. Bottom-Right Horizontal Barrier
    {
      id: 'bottom_right_wall',
      type: 'wall',
      x: 365,
      y: 650,
      w: 135,
      h: 10,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // 7. Bottom-Center Vertical Divider
    {
      id: 'bottom_center_divider',
      type: 'wall',
      x: 265,
      y: 630,
      w: 10,
      h: 100,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    }
  ],

  // ── Spawn Positions (Matching the 4 Base Pockets) ──
  spawns: {
    team0: [ // Top CT Base (North)
      { x: 87.5, y: 210, angle: Math.PI * 0.5 },
      { x: 452.5, y: 210, angle: Math.PI * 0.5 }
    ],
    team1: [ // Bottom T Base (South)
      { x: 87.5, y: 690, angle: -Math.PI * 0.5 },
      { x: 452.5, y: 690, angle: -Math.PI * 0.5 }
    ],
    ffa: [
      { x: 87.5, y: 210 },
      { x: 452.5, y: 210 },
      { x: 87.5, y: 690 },
      { x: 452.5, y: 690 }
    ]
  }
};
