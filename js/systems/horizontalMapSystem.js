import { state } from '../core/state.js';
import { CONFIG } from '../core/config.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HORIZONTAL MAP SYSTEM
 * Custom maps for 16:9 Widescreen Grand Teamfights (inspired by Earclacks).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const HORIZONTAL_MAPS = {
  COLOSSEUM: {
    id: 'colosseum',
    name: 'Grand Colosseum',
    tagline: '4-Corner Quad Arena with Center Combat Pit',
    description: 'Expansive open oval arena with 4 colored corner team spawn pedestals and a high-energy central combat pit.',
    shape: 'colosseum',
    bounds: { x: -220, y: -430, width: 1400, height: 1400 },
    spawnPedestals: [
      { team: 0, x: 40, y: -170, r: 64, color: '#FF3366', label: 'RED TEAM' },
      { team: 1, x: 920, y: -170, r: 64, color: '#00D2FF', label: 'BLUE TEAM' },
      { team: 2, x: 40, y: 710, r: 64, color: '#00FF66', label: 'GREEN TEAM' },
      { team: 3, x: 920, y: 710, r: 64, color: '#FFD700', label: 'GOLD TEAM' },
    ],
    centerPit: { x: 480, y: 270, r: 140, color: 'rgba(255, 215, 0, 0.15)' },
  },
  CLASSIC_WIDE: {
    id: 'classic_wide',
    name: 'Classic Minimalist Arena',
    tagline: 'Wide Clean Anime Battlefield',
    description: 'Clean wide dark arena floor with manga speed borders, subtle halftone accents, and high-visibility combat spacing.',
    shape: 'rect',
    bounds: { x: -220, y: -430, width: 1400, height: 1400 },
    spawnPedestals: [
      { team: 0, x: 40, y: -170, r: 58, color: '#FF3366', label: 'RED TEAM' },
      { team: 1, x: 920, y: -170, r: 58, color: '#00D2FF', label: 'BLUE TEAM' },
      { team: 2, x: 40, y: 710, r: 58, color: '#00FF66', label: 'GREEN TEAM' },
      { team: 3, x: 920, y: 710, r: 58, color: '#FFD700', label: 'GOLD TEAM' },
    ],
    centerPit: null,
  },
};

export const HORIZONTAL_MAP_LIST = [
  HORIZONTAL_MAPS.COLOSSEUM,
  HORIZONTAL_MAPS.CLASSIC_WIDE,
];

/**
 * Gets the active horizontal map definition.
 */
export function getActiveHorizontalMap() {
  const mapId = (state.selectedHorizontalMapId || (typeof localStorage !== 'undefined' && localStorage.getItem('ramball_horizontal_map')) || 'colosseum');
  return Object.values(HORIZONTAL_MAPS).find(m => m.id === mapId) || HORIZONTAL_MAPS.COLOSSEUM;
}

/**
 * Sets the active horizontal map.
 */
export function setActiveHorizontalMap(mapId) {
  const map = Object.values(HORIZONTAL_MAPS).find(m => m.id === mapId) || HORIZONTAL_MAPS.COLOSSEUM;
  state.selectedHorizontalMapId = map.id;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('ramball_horizontal_map', map.id);
  }
  state._arenaBorderCanvas = null;
  state._arenaOuterDetailsCanvas = null;
  return map;
}

/**
 * Draws custom horizontal map features (pedestals, center pit, colosseum runes)
 * onto the arena canvas before fighters and projectiles are drawn.
 */
export function drawHorizontalMapFeatures(ctx, arena) {
  if (state.viewOrientation !== 'horizontal') return;

  const map = getActiveHorizontalMap();
  const isDark = (state.arenaTheme === 'dark');

  ctx.save();

  // 1. Draw Center Pit if present (Colosseum)
  if (map.centerPit) {
    const pit = map.centerPit;
    ctx.save();
    ctx.translate(pit.x, pit.y);

    // Subtle pulsing center energy circle
    const time = (typeof Date !== 'undefined') ? Date.now() / 1000 : 0;
    const pulse = 1 + Math.sin(time * 2) * 0.04;

    ctx.beginPath();
    ctx.arc(0, 0, pit.r * pulse, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? 'rgba(255, 215, 0, 0.05)' : 'rgba(230, 200, 100, 0.12)';
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(255, 215, 0, 0.25)' : 'rgba(180, 150, 50, 0.35)';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([8, 6]);
    ctx.stroke();

    // Center rune emblem
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? 'rgba(255, 215, 0, 0.2)' : 'rgba(200, 160, 40, 0.3)';
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // 2. Draw Spawn Pedestals (4 Corner Team Circles)
  if (map.spawnPedestals && Array.isArray(map.spawnPedestals)) {
    for (const ped of map.spawnPedestals) {
      ctx.save();
      ctx.translate(ped.x, ped.y);

      // Outer team colored ring
      ctx.beginPath();
      ctx.arc(0, 0, ped.r, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? 'rgba(20, 25, 35, 0.65)' : 'rgba(240, 240, 245, 0.85)';
      ctx.fill();
      ctx.strokeStyle = ped.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Inner corner accent ring
      ctx.beginPath();
      ctx.arc(0, 0, ped.r * 0.65, 0, Math.PI * 2);
      ctx.strokeStyle = ped.color + '66';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();

      ctx.restore();
    }
  }

  ctx.restore();
}
