// ─────────────────────────────────────────────
// CANVAS & CONTEXT
// ─────────────────────────────────────────────
import { CONFIG } from './config.js';
import { GAME_MODES, MODE_SETTINGS } from './modeConfig.js';

// Late-bound reference – registered by projectileSystem after all modules load
// to break the state ↔ projectileSystem circular dependency.
let _projectileSystem = null;
export function registerProjectileSystem(ps) { _projectileSystem = ps; }

const canvas = document.getElementById('arena');
canvas.width = CONFIG.canvasWidth || 540;
canvas.height = CONFIG.canvasHeight || 960;
const ctx    = canvas.getContext('2d');

// --- PIXI.JS SETUP ---
// We initialize a Pixi Application that will replace the 2D canvas in the DOM.
// The old 2D canvas is kept for offscreen rendering of complex fighters, 
// then uploaded to Pixi as a texture.
let parsedBgColor = 0x000000;
if (CONFIG.canvasBgColor) {
  if (typeof CONFIG.canvasBgColor === 'number') {
    parsedBgColor = CONFIG.canvasBgColor;
  } else if (typeof CONFIG.canvasBgColor === 'string') {
    let hexStr = CONFIG.canvasBgColor.replace('#', '');
    if (hexStr.length === 8) hexStr = hexStr.substring(0, 6);
    parsedBgColor = parseInt(hexStr, 16);
    if (isNaN(parsedBgColor)) {
      parsedBgColor = 0x000000;
    }
  }
}

const pixiApp = new window.PIXI.Application({
  width: CONFIG.canvasWidth || 540,
  height: CONFIG.canvasHeight || 960,
  backgroundColor: parsedBgColor,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
  antialias: true
});

// Create scene graph layers to preserve Z-indexing
const pixiLayers = {
  background: new window.PIXI.Container(),
  arena: new window.PIXI.Container(),
  shadows: new window.PIXI.Container(),
  environment: new window.PIXI.Container(), // WebGL full-screen dim effects
  fighters: new window.PIXI.Container(), // Where offscreen 2D canvas sprite goes
  projectiles: new window.PIXI.Container(), // WebGL hybrid projectiles
  particles: new window.PIXI.Container(),
  effects: new window.PIXI.Container(),
  ui: new window.PIXI.Container()
};

// Add layers to stage in correct order
Object.values(pixiLayers).forEach(layer => pixiApp.stage.addChild(layer));

// Create a Sprite for the entire 2D canvas to sit in the fighters layer
const legacyCanvasTexture = window.PIXI.Texture.from(canvas);
const legacyCanvasSprite = new window.PIXI.Sprite(legacyCanvasTexture);
pixiLayers.fighters.addChild(legacyCanvasSprite);

// Create a separate offscreen canvas for floating texts to ensure they render on top of all WebGL layers
const floatingTextCanvas = document.createElement('canvas');
floatingTextCanvas.width = CONFIG.canvasWidth || 540;
floatingTextCanvas.height = CONFIG.canvasHeight || 960;
const floatingTextCtx = floatingTextCanvas.getContext('2d');

const floatingTextTexture = window.PIXI.Texture.from(floatingTextCanvas);
const floatingTextSprite = new window.PIXI.Sprite(floatingTextTexture);
pixiLayers.ui.addChild(floatingTextSprite);

// Create a separate offscreen canvas for top-level UI (HUD, game over, round end, pause) to ensure they render on top of all WebGL layers and projectiles/particles
const topLevelUiCanvas = document.createElement('canvas');
topLevelUiCanvas.width = CONFIG.canvasWidth || 540;
topLevelUiCanvas.height = CONFIG.canvasHeight || 960;
const topLevelUiCtx = topLevelUiCanvas.getContext('2d');

const topLevelUiTexture = window.PIXI.Texture.from(topLevelUiCanvas);
const topLevelUiSprite = new window.PIXI.Sprite(topLevelUiTexture);
pixiLayers.ui.addChild(topLevelUiSprite);

// Replace the DOM canvas with Pixi's WebGL canvas
canvas.parentNode.insertBefore(pixiApp.view, canvas);
canvas.style.display = 'none'; // Hide the old 2D canvas (used for offscreen rendering only)

// --- GENERATE GLOBAL PIXI TEXTURES FOR PARTICLES ---
const gCircle = new window.PIXI.Graphics();
gCircle.beginFill(0xFFFFFF);
gCircle.drawCircle(16, 16, 16);
gCircle.endFill();
const baseCircleTexture = pixiApp.renderer.generateTexture(gCircle);

const gSquare = new window.PIXI.Graphics();
gSquare.lineStyle(2, 0x000000, 0.7); // Dark stroke
gSquare.beginFill(0xFFFFFF);
gSquare.drawRect(0, 0, 16, 16);
gSquare.endFill();
const bloodSquareTexture = pixiApp.renderer.generateTexture(gSquare);

// ─────────────────────────────────────────────
// GAME STATE — single mutable object
// All modules import this object and mutate its properties directly.
// ─────────────────────────────────────────────
export const state = {
  canvas,
  ctx,
  pixiApp,
  pixiLayers,
  legacyCanvasSprite,
  floatingTextCanvas,
  floatingTextCtx,
  floatingTextSprite,
  topLevelUiCanvas,
  topLevelUiCtx,
  topLevelUiSprite,
  baseCircleTexture,
  bloodSquareTexture,
  arena: CONFIG.arena,



  // Global screen shake
  screenShake: { timer: 0, maxTimer: 0, intensity: 0 },

  // Game flow
  gameState: 'title', // 'title' | 'select' | 'index' | 'indexDetail' | 'leaderboard' | 'weapons' | 'weaponDetail' | 'playing' | 'paused' | 'roundEnd' | 'matchEnd'
  
  // Interactive Slash Visual Studio Editor State
  slashEditMode: false,
  slashAutoLoop: false,
  slashEditParams: {
    offsetX: 0,
    offsetY: 0,
    scale: 1.0,
    thickness: 1.0,
    duration: 35,
    arcStart: -0.75,
    arcEnd: 0.85,
    speedMult: 1.0
  },

  // Unified Weapon Customizer / Studio State
  weaponCustomizations: {
    mahito: {
      blades: [
        { idx: 0, knuckleX: 3.0, knuckleY: -6.5, fanAngle: -0.32, length: 82, heelWidth: 14.0, topArchY: -14.0, tipY: 16.0 },
        { idx: 1, knuckleX: 5.0, knuckleY: -3.8, fanAngle: -0.22, length: 88, heelWidth: 15.5, topArchY: -9.0, tipY: 18.0 },
        { idx: 2, knuckleX: 6.0, knuckleY: -0.8, fanAngle: -0.06, length: 84, heelWidth: 15.0, topArchY: -3.0, tipY: 24.0 },
        { idx: 3, knuckleX: 1.5, knuckleY: 9.0, fanAngle: 0.48, length: 80, heelWidth: 14.5, topArchY: 18.0, tipY: -22.0 }
      ]
    },
    yuta: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
    toji: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
    cronos: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
    ruby: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 }
  },
  mahitoClawCustomBlades: null,

  indexCategory: 'All',
  mode: GAME_MODES.ONE_VS_ONE,
  testMode: false, // Disables leaderboard recording
  cinefilmFilter: false, // Retro Cinefilm 35mm filter toggle
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

  // TLFS gamemode state
  tlfsAllowedEnemies: [], // Will be populated with all fighter indices
  tlfsDefeatedEnemies: 0,

  // Leaderboard for 1v1 mode - tracks wins and losses per fighter
  leaderboard: {}, // { fighterIndex: { wins: 0, losses: 0 } }

  // Team assignment for 2v2: fighters 0,1 are team 0; fighters 2,3 are team 1
  getFighterTeam(fighterIndex) {
    if (state.mode === GAME_MODES.TWO_VS_TWO) {
      if (typeof fighterIndex !== 'number' || fighterIndex < 0 || fighterIndex >= state.fighters.length) return null;
      return fighterIndex < 2 ? 0 : 1;
    } else if (state.mode === GAME_MODES.STAND_OFF_1V2) {
      if (typeof fighterIndex !== 'number' || fighterIndex < 0 || fighterIndex >= state.fighters.length) return null;
      return fighterIndex === 0 ? 0 : 1;
    }
    return null;
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

  // Doppelganger death effects
  doppelgangerDeathEffects: [],

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
  indexPage: 0,
  indexInspectIndex: 0,
  weaponScroll: 0,
  weaponPage: 0,
  selectedWeapon: null,

  // FPS tracking
  fps: 0,
  fpsFrames: 0,
  fpsLastTime: 0,
  fpsLogs: [],
  allFpsLogs: [],
  hideFpsLogs: localStorage.getItem('hideFpsLogs') === 'true',
  performanceMode: false,

  // Dynamic quality system for performance
  qualityLevel: 1.0, // 1.0 = full quality, 0.5 = half quality, etc.
  qualityCheckTimer: 0,
  qualityCheckInterval: 10, // OPTIMIZED: Check every 10 frames for faster response to OBS frame drops
  targetFps: 55, // OPTIMIZED: Higher threshold to drop quality earlier and maintain solid 60 FPS for recording
  maxTotalParticles: 100, // OPTIMIZED: Tighter cap on particles to reduce GPU overhead while streaming

  // Match kill tracking for leaderboard
  matchKills: [[], [], [], []],

  // Machine gun casing effects
  effects: [],

  // Round start countdown (2 seconds before fighters can move)
  countdownTimer: 0,
  countdownDuration: 120, // 2 seconds at 60fps
  isCountdownActive: false,
  announcerPlayingSequence: false,
  announcerTimeoutIds: [],
  announcerSubtitle: '',
  matchTimer: 0,
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
// SCREEN SHAKE
// ─────────────────────────────────────────────

export function isChampionScreenActive() {
  if (!state) return false;
  if (state.gameState === 'matchEnd') return true;
  if (state.ffaMatchComplete) return true;
  
  if (state.gameState === 'roundEnd') {
    const roundWinner = state.roundWinner;
    const winnerIndex = roundWinner ? state.fighters.indexOf(roundWinner) : -1;
    const modeRounds = MODE_SETTINGS[state.mode]?.rounds || 3;
    const winThresholdForReveal = modeRounds === 1 ? 1 : 2;
    const hasTwoWins = winnerIndex >= 0 && state.scores && state.scores[winnerIndex] >= winThresholdForReveal;
    if (hasTwoWins && roundWinner) {
      return true;
    }
  }
  return false;
}

export function triggerGlobalScreenShake(intensity, duration) {
  if (state.performanceMode) return;
  if (isChampionScreenActive()) return;

  const mult = (typeof CONFIG !== 'undefined' && CONFIG.globalScreenShakeIntensityMultiplier !== undefined) 
    ? CONFIG.globalScreenShakeIntensityMultiplier 
    : 1.0;
  if (mult <= 0) return;

  const scaledIntensity = intensity * mult;

  if (scaledIntensity >= state.screenShake.intensity || state.screenShake.timer <= 0) {
    state.screenShake.intensity = scaledIntensity;
    state.screenShake.timer = duration;
    state.screenShake.maxTimer = duration;
  } else {
    if (state.screenShake.timer < duration) {
      state.screenShake.timer = duration;
      state.screenShake.maxTimer = Math.max(state.screenShake.maxTimer, duration);
    }
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

// Save weapon customizations to localStorage
export function saveWeaponCustomizations() {
  try {
    localStorage.setItem('circleMiniBattleWeaponCustomizations', JSON.stringify(state.weaponCustomizations));
  } catch (e) {
    console.warn('Could not save weapon customizations:', e);
  }
}

// Load weapon customizations from localStorage
export function loadWeaponCustomizations() {
  try {
    const saved = localStorage.getItem('circleMiniBattleWeaponCustomizations');
    if (saved) {
      state.weaponCustomizations = JSON.parse(saved);
      // Sync mahitoClawCustomBlades with the loaded data
      if (state.weaponCustomizations.mahito && state.weaponCustomizations.mahito.blades) {
        state.mahitoClawCustomBlades = state.weaponCustomizations.mahito.blades;
      }
    }
  } catch (e) {
    console.warn('Could not load weapon customizations:', e);
  }
}

// Initialize on load
loadLeaderboard();
loadWeaponCustomizations();

// Debug hook: expose internal state for browser inspection
if (typeof window !== 'undefined') {
  window.__CMB_STATE__ = state;
  window.__CMB_SAVE_LEADERBOARD__ = saveLeaderboard;
  window.__CMB_LOAD_LEADERBOARD__ = loadLeaderboard;
}

// ─────────────────────────────────────────────
// FLOATING TEXT LABELS
// ─────────────────────────────────────────────

const MAX_FLOATING_TEXTS = 10; // Aggressively lowered to avoid layouts inside recording hook
const MINIMAL_FLOATING_TEXT = true; // Only show damage/heal numbers and key skill labels
const SKILL_TEXT_WHITELIST = [
  'BLACK FLASH',
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
  'PLANTING...',
  'RCT',
  'SILENCED!',
  'INVERTED SPEAR PARRY!',
  'INFINITY NULLIFIED!',
  'SPLIT SOUL SWEEP!',
  'PHANTOM FLURRY!',
  'SOUL WOUNDED!',
  'SKILL INTERRUPTED!',
  'COOLDOWN RESET!',
  'SPIRAL INCINERATION CANNON!',
  'INCINERATION CANNON!',
  'INCINERATING...',
  'MAXIMUM INCINERATION!',
  'MACHINE GUN BLOWS!',
  'MACHINE GUN BLOWS',
  'ROCKET STOMP!',
  'ROCKET STOMP',
  'INCINERATE!'
];

function isAllowedFloatingText(text) {
  const normalizedText = String(text).trim();
  const isNumeric = /^[+-]?\d+(\.\d+)?$/.test(normalizedText);
  if (isNumeric) return true;
  if (normalizedText.startsWith('SHIELD ') || normalizedText.startsWith('CRIT!') || normalizedText.includes('CRIT')) return true;
  if (normalizedText.includes('SILENCED') || normalizedText.includes('PARRY') || normalizedText.includes('FLURRY') || normalizedText.includes('INCINERAT') || normalizedText.includes('MACHINE GUN') || normalizedText.includes('CANNON') || normalizedText.includes('STOMP') || normalizedText.includes('MISS') || normalizedText.includes('EVASION') || normalizedText.includes('EVADE')) return true;
  return SKILL_TEXT_WHITELIST.includes(normalizedText);
}

const FLOATING_TEXT_SPAM_COOLDOWN = 50; // ms window to filter identical messages in close proximity
const spamPreventionCache = new Map();

// CRC32-like fast hashing helper to avoid string garbage generation in loops
function fastHash(text, x, y) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
  }
  return hash ^ (x & 0xFFFF) ^ ((y & 0xFFFF) << 16);
}

function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function parseColorToRgb(colorStr) {
  colorStr = colorStr.trim().toLowerCase();
  if (colorStr.startsWith('#')) {
    return hexToRgb(colorStr);
  }
  if (colorStr.startsWith('rgb')) {
    const match = colorStr.match(/\d+/g);
    if (match && match.length >= 3) {
      return { r: parseInt(match[0]), g: parseInt(match[1]), b: parseInt(match[2]) };
    }
  }
  const namedColors = {
    white: {r: 255, g: 255, b: 255},
    black: {r: 0, g: 0, b: 0},
    red: {r: 255, g: 0, b: 0},
    green: {r: 0, g: 255, b: 0},
    blue: {r: 0, g: 0, b: 255},
    yellow: {r: 255, g: 255, b: 0},
    magenta: {r: 255, g: 0, b: 255},
    cyan: {r: 0, g: 255, b: 255},
    purple: {r: 128, g: 0, b: 128},
    orange: {r: 255, g: 165, b: 0},
    gold: {r: 255, g: 215, b: 0},
    pink: {r: 255, g: 192, b: 203},
    chocolate: {r: 210, g: 105, b: 30}
  };
  return namedColors[colorStr] || null;
}

function getContrastColor(colorStr, backgroundIsDark) {
  const rgb = parseColorToRgb(colorStr);
  if (!rgb) return colorStr;

  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  if (s === 0) {
    // True grayscale / monochrome color: maintain 0% saturation so gray stays pure gray / silver
    if (backgroundIsDark) {
      if (l < 70) l = 78;
    } else {
      if (l > 55) l = 42;
    }
    return `hsl(0, 0%, ${l}%)`;
  }

  if (backgroundIsDark) {
    // If background is dark: ensure text is bright (lightness >= 78%)
    if (l < 70) {
      l = 78;
      s = Math.max(s, 50); // maintain saturation
    }
  } else {
    // If background is light: ensure text is dark enough (lightness <= 42%)
    if (l > 55) {
      l = 42;
      s = Math.max(s, 50); // maintain saturation
    }
  }

  return `hsl(${h}, ${s}%, ${l}%)`;
}

export function spawnFloatingText(x, y, text, color = '#ffffff') {
  if (MINIMAL_FLOATING_TEXT && !isAllowedFloatingText(text)) return;

  const normalizedUpper = String(text).trim().toUpperCase();
  if (normalizedUpper === 'MISS!' || normalizedUpper === 'MISS' || normalizedUpper === 'NEAR MISS!' || normalizedUpper.includes('MISS')) {
    color = '#A0AEC0'; // Combat Gray / Silver
  }

  const hasActiveDomain = state.fighters && state.fighters.some(f => f && f.domainActive);
  const backgroundIsDark = hasActiveDomain || (state.currentHUDDimOpacity && state.currentHUDDimOpacity > 0.3);
  const adjustedColor = getContrastColor(color, backgroundIsDark);

  // Cap the global performance log to prevent infinite string allocation leaks
  if (state.allFpsLogs.length > 100) {
    state.allFpsLogs.shift();
  }

  // Filter duplicates to prevent FPS drops under dense damage ticks or status applications
  const now = Date.now();
  const hashKey = fastHash(text, Math.round(x / 40), Math.round(y / 40));
  const lastSpawnedTime = spamPreventionCache.get(hashKey);
  if (lastSpawnedTime && (now - lastSpawnedTime) < FLOATING_TEXT_SPAM_COOLDOWN) {
    return;
  }
  spamPreventionCache.set(hashKey, now);

  // Periodic garbage collection sweep of the static cache map
  if (spamPreventionCache.size > 200) {
    for (const [key, val] of spamPreventionCache.entries()) {
      if (now - val > 2000) spamPreventionCache.delete(key);
    }
  }

  // Remove oldest texts if we're at the cap
  if (state.floatingTexts.length >= MAX_FLOATING_TEXTS) {
    const removed = state.floatingTexts.shift();
    if (removed && removed.pixiText && removed.pixiText.parent) {
      removed.pixiText.parent.removeChild(removed.pixiText);
      removed.pixiText.destroy();
    }
  }

  // Count active texts that spawned near the same position to avoid stacking (using zero-allocation loop)
  let nearbyCount = 0;
  for (let i = 0; i < state.floatingTexts.length; i++) {
    const t = state.floatingTexts[i];
    if (Math.abs(t.originX - x) < 50 && Math.abs(t.originY - y) < 50) {
      nearbyCount++;
    }
  }

  let displayText = String(text);
  // Add a minus sign if it's a raw number
  if (/^\d+(\.\d+)?$/.test(displayText)) {
    displayText = '-' + displayText;
  }

  // Detect if this text contains numbers (needs readable font like Architects Daughter instead of Glast Blitch)
  const isDamage = /\d/.test(displayText);

  state.floatingTexts.push({
    x: x + (Math.random() - 0.5) * 12,
    y: y - Math.min(nearbyCount, 3) * 6,  // compact stacking near target
    vy: isDamage ? -0.7 : -1.0,           // gentle upward drift so numbers stay close to target
    text: displayText,
    color: adjustedColor,
    timer: 0,
    maxTimer: isDamage ? 40 : 60,         // crisp ~40 frame duration for damage numbers
    opacity: 1,
    isDamage,
    originX: x,
    originY: y
  });
}

state.mahitoClawCustomBlades = state.weaponCustomizations.mahito.blades;
window.state = state;