// ─────────────────────────────────────────────
// CANVAS & CONTEXT
// ─────────────────────────────────────────────
import { CONFIG } from './config.js';
import { GAME_MODES } from './modeConfig.js';

// Late-bound reference – registered by projectileSystem after all modules load
// to break the state ↔ projectileSystem circular dependency.
let _projectileSystem = null;
export function registerProjectileSystem(ps) { _projectileSystem = ps; }

const canvas = document.getElementById('arena');
const ctx    = canvas.getContext('2d');

// ─────────────────────────────────────────────
// GAME STATE — single mutable object
// All modules import this object and mutate its properties directly.
// ─────────────────────────────────────────────
export const state = {
  canvas,
  ctx,
  arena: CONFIG.arena,

  // Game flow
  gameState: 'title', // 'title' | 'select' | 'index' | 'indexDetail' | 'leaderboard' | 'weapons' | 'weaponDetail' | 'playing' | 'paused' | 'roundEnd' | 'matchEnd'
  mode: GAME_MODES.ONE_VS_ONE,
  testMode: false, // Disables leaderboard recording
  dummyAggressive: false, // Whether target dummies fight back
  dummyEnabled: true, // Whether Target Dummy appears in fighter selection
  scores: [0, 0, 0, 0],
  teamScores: [0, 0], // For 2v2 mode: [team1Score, team2Score]
  roundNum: 1,
  roundWinner: null,
  matchWinner: null,
  roundEndTimer: 0,
  matchEndTimer: 0,
  ffaMatchComplete: false,

  // Leaderboard for 1v1 mode - tracks wins and losses per fighter
  leaderboard: {}, // { fighterIndex: { wins: 0, losses: 0 } }

  // Team assignment for 2v2: fighters 0,1 are team 0; fighters 2,3 are team 1
  getFighterTeam(fighterIndex) {
    if (state.mode !== GAME_MODES.TWO_VS_TWO) return null;
    if (typeof fighterIndex !== 'number' || fighterIndex < 0 || fighterIndex >= state.fighters.length) return null;
    return fighterIndex < 2 ? 0 : 1;
  },

  // Fighters
  fighters: [],
  p1Index: 0, // Default Red
  p2Index: 1, // Default Blue
  p3Index: 2,
  p4Index: 3,

  // Floating text labels
  floatingTexts: [],

  // Fuel pickups (for Orange fighter)
  fuelPickups: [],
  fuelPickupSpawnTimer: 0,

  // Death shatter effects
  deathEffects: [],

  // Illusion death effects (ethereal dissolving)
  illusionDeathEffects: [],

  // Illusion spawn effects
  illusionSpawnEffects: [],

  // Berserker rage effects
  berserkerRageEffects: [],

  // Blood effects (damage particles)
  bloodEffects: [],

  // Spark effects (visual-only particles for bullet impacts)
  sparkEffects: [],

  // Illusions (for Doppleganger fighter)
  illusions: [],

  // UI state
  previewBalls: [],
  indexScroll: 0,
  indexInspectIndex: 0,
  weaponScroll: 0,
  selectedWeapon: null,

  // FPS tracking
  fps: 0,
  fpsFrames: 0,
  fpsLastTime: 0,

  // Round start countdown (2 seconds before fighters can move)
  countdownTimer: 0,
  countdownDuration: 120, // 2 seconds at 60fps
  isCountdownActive: false,
};

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

// Lazy-loaded cache for FIGHTER_CLASS_MAP to break circular dependency
let _FIGHTER_CLASS_MAP = null;

async function _loadFighterClassMap() {
  if (!_FIGHTER_CLASS_MAP) {
    const mod = await import('../entities/factories/fighterFactory.js');
    _FIGHTER_CLASS_MAP = mod.FIGHTER_CLASS_MAP;
  }
  return _FIGHTER_CLASS_MAP;
}

export function createFighterInstance(def, fighterIndex) {
  // This will be called after modules are fully loaded, so we can access the cached map
  if (!_FIGHTER_CLASS_MAP) {
    // If not yet loaded, this is an error - should not happen
    console.error('FIGHTER_CLASS_MAP not loaded yet in createFighterInstance');
    return null;
  }
  const FighterClass = _FIGHTER_CLASS_MAP[def.type];
  if (!FighterClass) {
    console.error(`Unknown fighter type: ${def.type}`);
    return null;
  }
  const fighter = new FighterClass(def);
  fighter.fighterIndex = fighterIndex;
  return fighter;
}

// Load the map after a microtask to ensure factory has finished loading
Promise.resolve().then(() => _loadFighterClassMap());

// Helper to get projectiles from the projectile system
export function getProjectiles() {
  return _projectileSystem ? _projectileSystem.getProjectiles() : [];
}

// Helper to clear projectiles
export function clearProjectiles() {
  if (_projectileSystem) {
    _projectileSystem.clear();
  }
}

// ─────────────────────────────────────────────
// LEADERBOARD HELPERS
// ─────────────────────────────────────────────

// Initialize leaderboard entry for a fighter
export function initLeaderboardEntry(fighterIndex) {
  if (!state.leaderboard[fighterIndex]) {
    state.leaderboard[fighterIndex] = { wins: 0, losses: 0 };
  }
}

// Record a win for a fighter
export function recordWin(fighterIndex) {
  if (state.testMode) return;
  initLeaderboardEntry(fighterIndex);
  state.leaderboard[fighterIndex].wins++;
  saveLeaderboard();
}

// Record a loss for a fighter
export function recordLoss(fighterIndex) {
  if (state.testMode) return;
  initLeaderboardEntry(fighterIndex);
  state.leaderboard[fighterIndex].losses++;
  saveLeaderboard();
}

// Get leaderboard data as array sorted by specified criteria
export function getLeaderboardData(sortBy = 'wins') {
  const entries = Object.entries(state.leaderboard).map(([index, data]) => ({
    fighterIndex: parseInt(index, 10),
    wins: data.wins,
    losses: data.losses,
    totalGames: data.wins + data.losses,
    winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses)) * 100 : 0,
  }));

  // Sort based on criteria
  switch (sortBy) {
    case 'wins':
      entries.sort((a, b) => b.wins - a.wins);
      break;
    case 'losses':
      entries.sort((a, b) => b.losses - a.losses);
      break;
    case 'winRate':
      entries.sort((a, b) => b.winRate - a.winRate);
      break;
    default:
      entries.sort((a, b) => b.wins - a.wins);
  }

  return entries;
}

// Save leaderboard to localStorage
export function saveLeaderboard() {
  try {
    localStorage.setItem('circleMiniBattleLeaderboard', JSON.stringify(state.leaderboard));
  } catch (e) {
    console.warn('Could not save leaderboard:', e);
  }
}

// Load leaderboard from localStorage
export function loadLeaderboard() {
  try {
    const saved = localStorage.getItem('circleMiniBattleLeaderboard');
    if (saved) {
      state.leaderboard = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Could not load leaderboard:', e);
    state.leaderboard = {};
  }
}

// Initialize leaderboard on load
loadLeaderboard();

// Debug hook: expose internal state for browser inspection
if (typeof window !== 'undefined') {
  window.__CMB_STATE__ = state;
  window.__CMB_SAVE_LEADERBOARD__ = saveLeaderboard;
  window.__CMB_LOAD_LEADERBOARD__ = loadLeaderboard;
}

// ─────────────────────────────────────────────
// FLOATING TEXT LABELS
// ─────────────────────────────────────────────

const MAX_FLOATING_TEXTS = 50; // Cap to prevent performance issues
const MINIMAL_FLOATING_TEXT = true; // Only show damage/heal numbers and key skill labels
const SKILL_TEXT_WHITELIST = [
  'BLACK HOLE!',
  'CHARGING...',
  'TIME STOP!',
  'STOPPED!',
  'SHADOW MODE!',
  'SHADOW END',
  'RELOADING',
  'RELOADED',
  'RAPID FIRE!',
  'SPHERE ENDED',
  'STICKY!',
  'C4 PLANTED!',
  'DEATH C4!',
  'WEAPONS RESTORED!',
  'BACKSTAB!',
  'PASS!',
  'DODGE!',
  'MELEE DODGE!',
  'NEAR MISS!',
  'HIT!',
  'SHIELD BREAK!',
  'SHIELD BASH!',
  'THROW!',
  'CRIT!',
  'BLOCK!',
  'PLANTING...'
];

function isAllowedFloatingText(text) {
  const normalizedText = String(text).trim();
  const isNumeric = /^[+-]?\d+(\.\d+)?$/.test(normalizedText);
  if (isNumeric) return true;
  if (normalizedText.startsWith('SHIELD ')) return true;
  return SKILL_TEXT_WHITELIST.includes(normalizedText);
}

export function spawnFloatingText(x, y, text, color = '#ffffff') {
  if (MINIMAL_FLOATING_TEXT && !isAllowedFloatingText(text)) return;

  // Remove oldest texts if we're at the cap
  if (state.floatingTexts.length >= MAX_FLOATING_TEXTS) {
    state.floatingTexts.shift();
  }

  // Count active texts that spawned near the same position to avoid stacking
  const nearbyCount = state.floatingTexts.filter(
    t => Math.abs(t.originX - x) < 50 && Math.abs(t.originY - y) < 50
  ).length;

  let displayText = String(text);
  // Add a minus sign if it's a raw number
  if (/^\d+(\.\d+)?$/.test(displayText)) {
    displayText = '-' + displayText;
  }

  state.floatingTexts.push({
    x: x + (Math.random() - 0.5) * 16,
    y: y - nearbyCount * 18,  // stack upward if siblings exist
    vy: -1.6,
    text: displayText,
    color,
    timer: 0,
    maxTimer: 65,
    opacity: 1,
  });
}