// ─────────────────────────────────────────────
// TACTICAL FORCE — STARTER MAP
// Clean, competitive 2v2 tactical layout with spawn pockets and center barrier
// ─────────────────────────────────────────────

export const STARTER_MAP = {
  id: 'tactical_starter_map',
  name: 'TACTICAL SECTOR // 01',
  codeName: 'SECTOR 01',
  desc: 'Clean tactical arena featuring structured spawn pockets, corner barriers, and a center lane cover wall.',

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

  // ── Clean Tactical Barriers (Freestanding island covers with open 75px flank corridors) ──
  obstacles: [
    // 1. Top-Left Horizontal Barrier (Freestanding cover with 75px left flank & 60px center lane)
    {
      id: 'top_left_wall',
      type: 'wall',
      x: 125,
      y: 250,
      w: 80,
      h: 24,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // 2. Top-Right Horizontal Barrier (Freestanding cover with 75px right flank & 60px center lane)
    {
      id: 'top_right_wall',
      type: 'wall',
      x: 335,
      y: 250,
      w: 80,
      h: 24,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // 3. Top-Center Vertical Divider (Separates CT North spawn lanes)
    {
      id: 'top_center_divider',
      type: 'wall',
      x: 258,
      y: 150,
      w: 24,
      h: 80,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // 4. Center Mid-Lane Horizontal Barrier (Central heavy cover)
    {
      id: 'mid_center_wall',
      type: 'wall',
      x: 160,
      y: 478,
      w: 220,
      h: 24,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // 5. Bottom-Left Horizontal Barrier (Freestanding cover with 75px left flank & 60px center lane)
    {
      id: 'bottom_left_wall',
      type: 'wall',
      x: 125,
      y: 706,
      w: 80,
      h: 24,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // 6. Bottom-Right Horizontal Barrier (Freestanding cover with 75px right flank & 60px center lane)
    {
      id: 'bottom_right_wall',
      type: 'wall',
      x: 335,
      y: 706,
      w: 80,
      h: 24,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    },
    // 7. Bottom-Center Vertical Divider (Separates T South spawn lanes)
    {
      id: 'bottom_center_divider',
      type: 'wall',
      x: 258,
      y: 750,
      w: 24,
      h: 80,
      color: '#1e293b',
      borderColor: '#475569',
      isDestructible: false
    }
  ],

  // ── Spawn Positions (Matching the 4 Base Pockets with diagonal lane angles) ──
  spawns: {
    team0: [ // Top CT Base (North)
      { x: 165, y: 195, angle: Math.PI * 0.35 },
      { x: 375, y: 195, angle: Math.PI * 0.65 }
    ],
    team1: [ // Bottom T Base (South)
      { x: 165, y: 785, angle: -Math.PI * 0.35 },
      { x: 375, y: 785, angle: -Math.PI * 0.65 }
    ],
    ffa: [
      { x: 165, y: 195, angle: Math.PI * 0.35 },
      { x: 375, y: 195, angle: Math.PI * 0.65 },
      { x: 165, y: 785, angle: -Math.PI * 0.35 },
      { x: 375, y: 785, angle: -Math.PI * 0.65 }
    ]
  }
};
