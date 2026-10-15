// ─────────────────────────────────────────────
// CANVAS & CONTEXT
// ─────────────────────────────────────────────
import { CONFIG } from './config.js';
import { GAME_MODES, MODE_SETTINGS } from './modeConfig.js';
import { audioSystem } from '../systems/audioSystem.js';

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

// Check if PixiJS is loaded (from local libs/pixi.min.js or CDN)
const hasPixi = typeof window.PIXI !== 'undefined' && typeof window.PIXI.Application === 'function';

let pixiApp = null;
let pixiLayers = {
  background: null,
  arena: null,
  shadows: null,
  environment: null,
  fighters: null,
  projectiles: null,
  particles: null,
  effects: null,
  ui: null
};
let legacyCanvasSprite = null;

const floatingTextCanvas = document.createElement('canvas');
floatingTextCanvas.width = CONFIG.canvasWidth || 540;
floatingTextCanvas.height = CONFIG.canvasHeight || 960;
const floatingTextCtx = floatingTextCanvas.getContext('2d');
let floatingTextSprite = null;

const topLevelUiCanvas = (typeof document !== 'undefined' && document.getElementById('topLevelUiCanvas') && typeof document.getElementById('topLevelUiCanvas').getContext === 'function')
  ? document.getElementById('topLevelUiCanvas')
  : ((typeof document !== 'undefined' && typeof document.createElement === 'function') ? document.createElement('canvas') : null);
if (topLevelUiCanvas) {
  topLevelUiCanvas.width = CONFIG.canvasWidth || 540;
  topLevelUiCanvas.height = CONFIG.canvasHeight || 960;
}
const topLevelUiCtx = (topLevelUiCanvas && typeof topLevelUiCanvas.getContext === 'function') ? topLevelUiCanvas.getContext('2d') : null;
let topLevelUiSprite = null;

let baseCircleTexture = null;
let bloodSquareTexture = null;

const isMobileDevice = typeof navigator !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)) && window.innerWidth < 1024));
const targetResolution = isMobileDevice ? 1.0 : Math.min(window.devicePixelRatio || 1, 2.0);

// Performance standard: On mobile devices, pure native hardware-accelerated Canvas 2D mode provides
// locked 60 FPS by eliminating 120MB/s synchronous texImage2D buffer copy stalls between CPU & GPU.
const shouldUsePixi = hasPixi && !isMobileDevice;

if (shouldUsePixi) {
  pixiApp = new window.PIXI.Application({
    width: CONFIG.canvasWidth || 540,
    height: CONFIG.canvasHeight || 960,
    backgroundColor: parsedBgColor,
    resolution: targetResolution,
    autoDensity: true,
    antialias: !isMobileDevice,
    powerPreference: 'high-performance'
  });

  pixiLayers = {
    background: new window.PIXI.Container(),
    arena: new window.PIXI.Container(),
    shadows: new window.PIXI.Container(),
    environment: new window.PIXI.Container(),
    fighters: new window.PIXI.Container(),
    projectiles: new window.PIXI.Container(),
    particles: new window.PIXI.Container(),
    effects: new window.PIXI.Container(),
    ui: new window.PIXI.Container()
  };

  // Add layers to stage in correct order
  Object.values(pixiLayers).forEach(layer => pixiApp.stage.addChild(layer));

  // Create a Sprite for the entire 2D canvas to sit in the fighters layer
  const legacyCanvasTexture = window.PIXI.Texture.from(canvas);
  legacyCanvasSprite = new window.PIXI.Sprite(legacyCanvasTexture);
  pixiLayers.fighters.addChild(legacyCanvasSprite);

  const floatingTextTexture = window.PIXI.Texture.from(floatingTextCanvas);
  floatingTextSprite = new window.PIXI.Sprite(floatingTextTexture);
  pixiLayers.ui.addChild(floatingTextSprite);

  const topLevelUiTexture = window.PIXI.Texture.from(topLevelUiCanvas);
  topLevelUiSprite = new window.PIXI.Sprite(topLevelUiTexture);
  pixiLayers.ui.addChild(topLevelUiSprite);

  // Replace the DOM canvas with Pixi's WebGL canvas
  canvas.parentNode.insertBefore(pixiApp.view, canvas);
  canvas.style.display = 'none'; // Hide the old 2D canvas (used for offscreen rendering only)

  // Handle GPU process crashes and WebGL context restoration gracefully
  if (pixiApp.view && typeof pixiApp.view.addEventListener === 'function') {
    pixiApp.view.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('⚠️ WebGL context lost (GPU reset). Attempting context restoration...');
    }, false);

    pixiApp.view.addEventListener('webglcontextrestored', () => {
      console.info('✅ WebGL context restored successfully.');
    }, false);
  }

  // --- GENERATE GLOBAL PIXI TEXTURES FOR PARTICLES ---
  const gCircle = new window.PIXI.Graphics();
  gCircle.beginFill(0xFFFFFF);
  gCircle.drawCircle(16, 16, 16);
  gCircle.endFill();
  baseCircleTexture = pixiApp.renderer.generateTexture(gCircle);

  const gSquare = new window.PIXI.Graphics();
  gSquare.beginFill(0xFFFFFF);
  gSquare.drawRect(0, 0, 16, 16);
  gSquare.endFill();
  bloodSquareTexture = pixiApp.renderer.generateTexture(gSquare);
} else {
  console.warn('PixiJS is not available. Falling back to native Canvas 2D mode.');
  canvas.style.display = 'block';
}

/**
 * Smart Auto-Detect Scaling on First Boot:
 * Automatically selects 'fit' on mobile, touch, and compact browser viewports,
 * while preserving explicit user choices saved in localStorage.
 */
export function detectOptimalAspectScaling() {
  const isTouch = (typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)));
  const isMobileUA = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  const winW = (typeof window !== 'undefined' && ((window.visualViewport && window.visualViewport.width) || window.innerWidth || (document.documentElement && document.documentElement.clientWidth))) || 540;

  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('ramball_aspect_scaling');
    if (saved === 'fit' || saved === 'fixed') {
      // If on a narrow mobile viewport (<540px), always auto-fit unless screen is wide enough
      if (saved === 'fixed' && (isMobileUA || winW < 540)) {
        return 'fit';
      }
      return saved;
    }
  }

  if (typeof window === 'undefined') return 'fit';
  if (window.electronAPI) return 'fixed';

  return 'fit';
}

import {
  SKIN_CUSTOMIZATIONS_DATABASE,
  DEFAULT_SKIN_CUSTOMIZATIONS,
  getDatabaseDefault,
  getAllDatabaseDefaults,
  generateDatabaseModuleCode
} from '../configs/skinCustomizationsDatabase.js';

import {
  WEAPON_CUSTOMIZATIONS_DATABASE,
  DEFAULT_WEAPON_CUSTOMIZATIONS,
  getWeaponDatabaseDefault,
  getAllWeaponDatabaseDefaults,
  generateWeaponDatabaseModuleCode
} from '../configs/weaponCustomizationsDatabase.js';

export {
  SKIN_CUSTOMIZATIONS_DATABASE,
  DEFAULT_SKIN_CUSTOMIZATIONS,
  getDatabaseDefault,
  getAllDatabaseDefaults,
  generateDatabaseModuleCode,
  WEAPON_CUSTOMIZATIONS_DATABASE,
  DEFAULT_WEAPON_CUSTOMIZATIONS,
  getWeaponDatabaseDefault,
  getAllWeaponDatabaseDefaults,
  generateWeaponDatabaseModuleCode
};

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

  // Master Skin & Hair Customizations Database (Active & User-Saved Defaults)
  skinCustomizations: getAllDatabaseDefaults(),
  defaultSkinCustomizations: getAllDatabaseDefaults(),

  // Dynamic Combat Tracking Camera (Boxx Arena style)
  camera: {
    enabled: true,
    mode: (typeof localStorage !== 'undefined' && localStorage.getItem('cameraMode')) || 'dynamic',
    x: (CONFIG.arena?.x ?? 40) + (CONFIG.arena?.width ?? 450) / 2,
    y: (CONFIG.arena?.y ?? 240) + (CONFIG.arena?.height ?? 450) / 2,
    zoom: 1.0,
    targetX: (CONFIG.arena?.x ?? 40) + (CONFIG.arena?.width ?? 450) / 2,
    targetY: (CONFIG.arena?.y ?? 240) + (CONFIG.arena?.height ?? 450) / 2,
    targetZoom: 1.0,
    shakeX: 0,
    shakeY: 0,
    smoothing: 0.08,
    zoomSmoothing: 0.06,
    minZoom: 1.0,
    maxZoom: 1.15,
    toastText: '',
    toastTimer: 0
  },

  // Global screen shake
  screenShake: { timer: 0, maxTimer: 0, intensity: 0 },

  // GTA San Andreas Cheat Pop-Out Notification Banner
  cheatNotification: null,

  // GTA San Andreas "MISSION PASSED! RESPECT +" Arena Overlay
  missionPassedOverlay: null,
  _isRespectMusicPlaying: false,
  _respectMusicHandle: null,

  // GTA San Andreas "WASTED" Death Overlay
  wastedOverlay: null,


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
  weaponCustomizations: getAllWeaponDatabaseDefaults(),
  defaultWeaponCustomizations: getAllWeaponDatabaseDefaults(),
  mahitoClawCustomBlades: null,

  indexCategory: 'All',
  gameCategory: 'foc', // 'foc' (Fight of Characters) | 'tactical' (Tactical Shooter)
  activeFocMap: null, // Active FOC battleground map (e.g. Yuta's Cursed Grove)
  mode: GAME_MODES.ONE_VS_ONE,
  arenaTheme: 'light', // 'light' | 'dark'
  selectedArenaFloor: (typeof localStorage !== 'undefined' && localStorage.getItem('circle_selected_arena_floor')) || 'classic_clean',
  _arenaFloorCanvasCache: {},
  testMode: false, // Disables leaderboard recording
  cinefilmFilter: false, // Retro Cinefilm 35mm filter toggle
  disableDimEffects: (typeof localStorage !== 'undefined' && localStorage.getItem('disableDimEffects') === 'true') || false, // Global dim effects toggle
  aspectScalingMode: detectOptimalAspectScaling(), // 'fit' (Auto-Fit Window, preserve 9:16) | 'fixed' (1X Fixed / Vertical Scroll)
  quickBarMode: (typeof localStorage !== 'undefined' && localStorage.getItem('quickBarMode')) || 'auto', // 'auto' | 'off' | 'on'
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

  // Face-Off & Thumbnail Overlay State
  faceOffTimer: 0,
  faceOffExiting: false,
  faceOffExitTimer: 0,
  faceOffExitDuration: 20,
  faceOffScale: 1.35,
  faceOffCleanMode: false,
  faceOffAutoStart: true,
  faceOffTheme: 'neon', // 'neon' | 'manga' | 'arena'
  faceOffSavedToastTimer: 0,
  faceOffFromSelect: false,
  faceOffParticles: [],

  // TLFS gamemode state
  tlfsAllowedEnemies: [], // Will be populated with all fighter indices
  tlfsDefeatedEnemies: 0,

  // Boss Battle gamemode state
  bossBattleNoTeammate: (typeof localStorage !== 'undefined' && localStorage.getItem('circleMiniBattleBossBattleNoTeammate') === 'true') || false,

  // Tag Match gamemode state (3v3 relay)
  tagMatch: {
    team0Roster: [], // Array of 3 fighter indices [p1, p3, p5]
    team1Roster: [], // Array of 3 fighter indices [p2, p4, p6]
    team0ActiveSlot: 0, // 0, 1, 2
    team1ActiveSlot: 0, // 0, 1, 2
    team0Eliminations: 0,
    team1Eliminations: 0,
    tagInTransition: null,
  },

  // Leaderboard for 1v1 mode - tracks wins and losses per fighter
  leaderboard: {}, // { fighterIndex: { wins: 0, losses: 0 } }

  // Viewport & Horizontal Sub-Game State
  viewOrientation: 'vertical', // 'vertical' (540x960) | 'horizontal' (960x540)
  selectedHorizontalMapId: 'colosseum',
  horizontalRosterSlots: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],

  // Team assignment: for 3v3v3v3, 2v2v2v2, 4v4, 2v2 duo, 1v2 standoff, and Tag Match
  getFighterTeam(fighterIndex) {
    if (typeof fighterIndex !== 'number' || fighterIndex < 0 || !state.fighters || fighterIndex >= state.fighters.length) return null;

    const is3v3v3v3 = state.mode === GAME_MODES.TEAMFIGHT_3V3V3V3 || state.mode === '3v3v3v3 Teamfight';
    const is2v2v2v2 = state.mode === GAME_MODES.TEAMFIGHT_2V2V2V2 || state.mode === '2v2v2v2 Quad';
    const is4v4 = state.mode === GAME_MODES.TEAM_4V4 || state.mode === '4v4 Grand War';
    const isBR8 = state.mode === GAME_MODES.BATTLE_ROYALE_8 || state.mode === '8-Fighter Battle Royale';
    const isFFA = state.mode === GAME_MODES.FFA || state.mode === 'FFA' || state.mode === GAME_MODES.TACTICAL_FFA || state.mode === 'Tactical FFA';
    const is2v2 = state.mode === GAME_MODES.TWO_VS_TWO || state.mode === '2v2';
    const is1v2 = state.mode === GAME_MODES.ONE_VS_TWO || state.mode === '1v2' || state.mode === 'Boss Battle' || state.mode === GAME_MODES.BOSS_BATTLE || state.mode === GAME_MODES.STAND_OFF_1V2 || state.mode === '1v2 Stand Off' || state.mode === 'STAND_OFF_1V2';
    const isTagMatch = state.mode === GAME_MODES.TAG_MATCH || state.mode === 'Tag Match' || state.mode === 'TAG_MATCH';
    const isH1v1 = state.mode === GAME_MODES.HORIZONTAL_1V1 || state.mode === '1v1 Widescreen Duel';

    if (is3v3v3v3) {
      return Math.floor(fighterIndex / 3); // 0..2: Team 0, 3..5: Team 1, 6..8: Team 2, 9..11: Team 3
    } else if (is2v2v2v2) {
      return Math.floor(fighterIndex / 2); // 0..1: Team 0, 2..3: Team 1, 4..5: Team 2, 6..7: Team 3
    } else if (is4v4) {
      return fighterIndex < 4 ? 0 : 1;
    } else if (isBR8 || isFFA) {
      return fighterIndex; // Free-For-All
    } else if (is2v2) {
      return fighterIndex < 2 ? 0 : 1;
    } else if (is1v2 || isTagMatch || isH1v1) {
      return fighterIndex === 0 ? 0 : 1;
    }
    return null;
  },

  // Fighters
  fighters: [],
  p1Index: 0, // Default Red Slot 1
  p2Index: 1, // Default Blue Slot 1
  p3Index: 2, // Red Slot 2
  p4Index: 3, // Blue Slot 2
  p5Index: 4, // Red Slot 3
  p6Index: 5, // Blue Slot 3
  p7Index: 6, // Green Slot 1
  p8Index: 7, // Green Slot 2
  p9Index: 8, // Green Slot 3
  p10Index: 9, // Gold Slot 1
  p11Index: 10, // Gold Slot 2
  p12Index: 11, // Gold Slot 3

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

  // Wall crack decals (from knockback collisions)
  wallCracks: [],

  // Shattered arena line wall breaches (from Saitama Serious Counter punches)
  shatteredWalls: [],

  // Illusions (for Doppleganger fighter)
  illusions: [],

  // John Wick debris (empty magazines, thrown guns, and spent bullet casings)
  droppedMagazines: [],
  thrownGuns: [],
  spentCasings: [],

  // UI state
  previewBalls: [],
  indexScroll: 0,
  indexPage: 0,
  indexInspectIndex: 0,
  weaponScroll: 0,
  weaponPage: 0,
  selectedWeapon: null,
  missionPassedOverlay: null,
  _isRespectMusicPlaying: false,
  _respectMusicHandle: null,
  cheatNotification: null,

  // FPS tracking
  fps: 0,
  fpsFrames: 0,
  fpsLastTime: 0,
  fpsLogs: [],
  allFpsLogs: [],
  hideFpsLogs: (typeof localStorage !== 'undefined') && localStorage.getItem('hideFpsLogs') === 'true',
  performanceMode: false,
  frameAudioTime: 0,

  // Dynamic quality system for performance
  qualityLevel: 1.0, // 1.0 = full quality, 0.5 = half quality, etc.
  qualityCheckTimer: 0,
  qualityCheckInterval: 10, // OPTIMIZED: Check every 10 frames for faster response to OBS frame drops
  targetFps: 55, // OPTIMIZED: Higher threshold to drop quality earlier and maintain solid 60 FPS for recording
  maxTotalParticles: 100, // OPTIMIZED: Tighter cap on particles to reduce GPU overhead while streaming

  // Match kill tracking for leaderboard
  matchKills: [[], [], [], []],

  // Counter-Strike style kill feed
  killFeed: [],

  // Machine gun casing effects
  effects: [],

  // Round start countdown (2 seconds before fighters can move)
  countdownTimer: 0,
  countdownDuration: 120, // 2 seconds at 60fps
  isCountdownActive: false,
  announcerPlayingSequence: false,
  announcerTimeoutIds: [],
  announcerSubtitle: '',

  // Skin & Asset Studio State
  studioSelectedSkinFighter: 'ichigo',
  studioSkinPreviewScale: 2.4,
  studioSkinFacing: 'right',
  studioSkinForm: 'default',
  studioSkinBg: 'white',
  studioSkinShowBody: true,
  studioSkinShowGuides: true,
  studioSkinTab: 'transform',
  skinCustomizations: JSON.parse(JSON.stringify(DEFAULT_SKIN_CUSTOMIZATIONS)),
  selectedNamelessDeitySkin: (typeof localStorage !== 'undefined' && localStorage.getItem('selectedNamelessDeitySkin')) || 'skin1',
  selectedIchigoSkin: (typeof localStorage !== 'undefined' && localStorage.getItem('selectedIchigoSkin')) || 'shikai',
  matchTimer: 0,
};

if (typeof window !== 'undefined') {
  window.state = state;
}

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

// Lazy-loaded cache for FIGHTER_CLASS_MAP to break circular dependency
let _FIGHTER_CLASS_MAP = null;

export function registerFighterClassMap(map) {
  _FIGHTER_CLASS_MAP = map;
}

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

// Helper to clear projectiles across standard systems
export function clearProjectiles() {
  if (_projectileSystem) {
    _projectileSystem.clear();
  }
  if (typeof state !== 'undefined' && state.projectiles) {
    state.projectiles.length = 0;
  }
}

// ─────────────────────────────────────────────
// SCREEN SHAKE
// ─────────────────────────────────────────────

export function isChampionScreenActive() {
  if (!state) return false;
  const isDark = Boolean(
    state.arenaTheme === 'dark' ||
    state.darkMode ||
    (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
  );
  if (isDark) return false;
  return Boolean(state._isChampionLayoutActive);
}

export function triggerGlobalScreenShake(intensity, duration) {
  if (state.performanceMode) return;
  // Allow fatal impact screen shakes during early roundEnd before podium overlay
  if (isChampionScreenActive() && (typeof state !== 'undefined' && state.roundEndTimer > 45)) return;

  const is1v2 = (typeof state !== 'undefined') && (
    state.mode === 'Boss Battle' ||
    state.mode === GAME_MODES.BOSS_BATTLE ||
    state.mode === GAME_MODES.STAND_OFF_1V2 || 
    state.mode === '1v2 Stand Off' || 
    state.mode === '1v2'
  );
  const isFFA = (typeof state !== 'undefined') && (
    state.mode === GAME_MODES.FFA ||
    state.mode === 'FFA'
  );

  let targetIntensity = Number(intensity) || 0;
  if (targetIntensity <= 0) return;

  // Safe fallback for duration if not provided or invalid
  let targetDuration = (typeof duration === 'number' && duration > 0) 
    ? Math.round(duration) 
    : Math.max(6, Math.min(24, Math.round(targetIntensity * 1.5)));

  const mult = (typeof CONFIG !== 'undefined' && CONFIG.globalScreenShakeIntensityMultiplier !== undefined) 
    ? CONFIG.globalScreenShakeIntensityMultiplier 
    : 1.0;
  if (mult <= 0) return;

  // Scale by global multiplier once
  let scaledIntensity = targetIntensity * mult;

  // Hard clamp limit so multiple rapid combat explosions never tear the screen apart
  const maxAllowedShake = (is1v2 || isFFA) ? 6.0 : 16.0;
  scaledIntensity = Math.min(maxAllowedShake, scaledIntensity);

  // Ensure state.screenShake is initialized
  if (!state.screenShake) {
    state.screenShake = { timer: 0, maxTimer: 0, intensity: 0 };
  }

  // If no shake is currently active, initialize cleanly
  if (state.screenShake.timer <= 0) {
    state.screenShake.intensity = scaledIntensity;
    state.screenShake.timer = targetDuration;
    state.screenShake.maxTimer = targetDuration;
    return;
  }

  // Calculate current instantaneous remaining shake power (decayed over time)
  const currentMax = (state.screenShake.maxTimer && state.screenShake.maxTimer > 0) ? state.screenShake.maxTimer : (state.screenShake.timer || 1);
  const currentRemainingPower = (state.screenShake.intensity || 0) * Math.max(0, state.screenShake.timer / currentMax);

  // Multiple shake effects: NEVER multiply or additively stack!
  if (scaledIntensity >= currentRemainingPower) {
    // New shake is equal or stronger than what remains of the old shake: replace with new shake cleanly
    state.screenShake.intensity = scaledIntensity;
    state.screenShake.timer = targetDuration;
    state.screenShake.maxTimer = targetDuration;
  } else {
    // Existing shake is currently stronger than the new one.
    // If the new shake wants to last longer than the current remaining timer, extend the timer
    // while keeping peak intensity capped at currentRemainingPower.
    if (targetDuration > state.screenShake.timer) {
      state.screenShake.intensity = Math.max(scaledIntensity, currentRemainingPower);
      state.screenShake.timer = targetDuration;
      state.screenShake.maxTimer = targetDuration;
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

// Auto-export weapon customizations database to disk when running in desktop Electron environment
export function autoExportWeaponDatabaseToDisk() {
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.saveWeaponDatabase === 'function') {
    try {
      const code = generateWeaponDatabaseModuleCode(state.weaponCustomizations);
      window.electronAPI.saveWeaponDatabase({ codeContent: code }).then((res) => {
        if (res && res.success) {
          console.log('💾 [Weapon Database Auto-Export] Successfully synced to', res.filePath);
        }
      }).catch((e) => {
        console.warn('Auto-export weapon database failed:', e);
      });
    } catch (e) {
      console.warn('Could not generate weapon database code for auto-export:', e);
    }
  }
}

// Save weapon customizations & user-defined defaults to localStorage and auto-export to disk
export function saveWeaponCustomizations() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('circleMiniBattleWeaponCustomizations', JSON.stringify(state.weaponCustomizations || {}));
      if (state.defaultWeaponCustomizations) {
        localStorage.setItem('circleMiniBattleWeaponDefaults', JSON.stringify(state.defaultWeaponCustomizations));
      }
    }
    autoExportWeaponDatabaseToDisk();
  } catch (e) {
    console.warn('Could not save weapon customizations:', e);
  }
}

// Load weapon customizations from database & localStorage
export function loadWeaponCustomizations() {
  try {
    // 1. Always initialize with fresh database defaults from weaponCustomizationsDatabase.js
    state.weaponCustomizations = getAllWeaponDatabaseDefaults();
    state.defaultWeaponCustomizations = getAllWeaponDatabaseDefaults();

    if (typeof localStorage !== 'undefined') {
      // 2. Load user-saved defaults if present
      const savedDefaults = localStorage.getItem('circleMiniBattleWeaponDefaults');
      if (savedDefaults) {
        const parsedDefaults = JSON.parse(savedDefaults);
        for (const k in parsedDefaults) {
          state.defaultWeaponCustomizations[k] = Object.assign({}, state.defaultWeaponCustomizations[k] || {}, parsedDefaults[k]);
          state.weaponCustomizations[k] = Object.assign({}, state.weaponCustomizations[k] || {}, parsedDefaults[k]);
        }
      }

      // 3. Load active customization sliders if present
      const saved = localStorage.getItem('circleMiniBattleWeaponCustomizations');
      if (saved) {
        const parsed = JSON.parse(saved);
        for (const k in parsed) {
          state.weaponCustomizations[k] = Object.assign({}, state.weaponCustomizations[k] || {}, parsed[k]);
        }
      }
    }

    // Sync mahitoClawCustomBlades with the loaded data
    if (state.weaponCustomizations.mahito && state.weaponCustomizations.mahito.blades) {
      state.mahitoClawCustomBlades = state.weaponCustomizations.mahito.blades;
    }
  } catch (e) {
    console.warn('Could not load weapon customizations:', e);
  }
}

/**
 * Sets the given customization as the persistent user default for a weapon.
 * @param {string} weaponKey
 * @param {Object} customObj
 */
export function setWeaponCustomAsDefault(weaponKey, customObj) {
  if (!state.defaultWeaponCustomizations) state.defaultWeaponCustomizations = getAllWeaponDatabaseDefaults();
  if (!state.weaponCustomizations) state.weaponCustomizations = getAllWeaponDatabaseDefaults();

  const cloned = JSON.parse(JSON.stringify(customObj));
  state.defaultWeaponCustomizations[weaponKey] = cloned;
  state.weaponCustomizations[weaponKey] = JSON.parse(JSON.stringify(cloned));
  if (weaponKey === 'mahito' && cloned.blades) {
    state.mahitoClawCustomBlades = state.weaponCustomizations.mahito.blades;
  }
  saveWeaponCustomizations();
}

/**
 * Restores a weapon customization to default.
 * @param {string} weaponKey
 * @param {boolean} [useFactory=false] - If true, ignores user defaults and resets directly to built-in code database.
 * @returns {Object} Restored customization object.
 */
export function resetWeaponToDefault(weaponKey, useFactory = false) {
  if (!state.weaponCustomizations) state.weaponCustomizations = getAllWeaponDatabaseDefaults();
  const def = useFactory
    ? getWeaponDatabaseDefault(weaponKey)
    : (state.defaultWeaponCustomizations?.[weaponKey] || getWeaponDatabaseDefault(weaponKey));
  state.weaponCustomizations[weaponKey] = JSON.parse(JSON.stringify(def));
  if (useFactory && state.defaultWeaponCustomizations) {
    state.defaultWeaponCustomizations[weaponKey] = JSON.parse(JSON.stringify(def));
  }
  if (weaponKey === 'mahito' && state.weaponCustomizations.mahito.blades) {
    state.mahitoClawCustomBlades = state.weaponCustomizations.mahito.blades;
  }
  saveWeaponCustomizations();
  return state.weaponCustomizations[weaponKey];
}

/**
 * Resets all weapons to default customizations.
 * @param {boolean} [useFactory=false]
 */
export function resetAllWeaponsToDefault(useFactory = false) {
  if (useFactory) {
    state.weaponCustomizations = getAllWeaponDatabaseDefaults();
    state.defaultWeaponCustomizations = getAllWeaponDatabaseDefaults();
  } else {
    state.weaponCustomizations = {};
    for (const [k, v] of Object.entries(state.defaultWeaponCustomizations || getAllWeaponDatabaseDefaults())) {
      state.weaponCustomizations[k] = JSON.parse(JSON.stringify(v));
    }
  }
  if (state.weaponCustomizations.mahito && state.weaponCustomizations.mahito.blades) {
    state.mahitoClawCustomBlades = state.weaponCustomizations.mahito.blades;
  }
  saveWeaponCustomizations();
}

// Auto-export skin customizations database to disk when running in desktop Electron environment
export function autoExportSkinDatabaseToDisk() {
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.saveSkinDatabase === 'function') {
    try {
      const code = generateDatabaseModuleCode(state.skinCustomizations);
      window.electronAPI.saveSkinDatabase({ codeContent: code }).then((res) => {
        if (res && res.success) {
          console.log('💾 [Skin Database Auto-Export] Successfully synced to', res.filePath);
        }
      }).catch((e) => {
        console.warn('Auto-export skin database failed:', e);
      });
    } catch (e) {
      console.warn('Could not generate database code for auto-export:', e);
    }
  }
}

// Save skin asset customizations & user-defined defaults to localStorage
export function saveSkinCustomizations() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('circleMiniBattleSkinCustomizations', JSON.stringify(state.skinCustomizations || {}));
      if (state.defaultSkinCustomizations) {
        localStorage.setItem('circleMiniBattleSkinDefaults', JSON.stringify(state.defaultSkinCustomizations));
      }
    }
    if (typeof window !== 'undefined' && typeof window.__clearFighterPreviewCache === 'function') {
      window.__clearFighterPreviewCache();
    }
    autoExportSkinDatabaseToDisk();
  } catch (e) {
    console.warn('Could not save skin customizations:', e);
  }
}

// Load skin asset customizations from database & localStorage
export function loadSkinCustomizations() {
  try {
    // 1. Always initialize with fresh database defaults from skinCustomizationsDatabase.js
    state.skinCustomizations = getAllDatabaseDefaults();
    state.defaultSkinCustomizations = getAllDatabaseDefaults();

    if (typeof localStorage !== 'undefined') {
      // 2. Load user-saved defaults if present
      const savedDefaults = localStorage.getItem('circleMiniBattleSkinDefaults');
      if (savedDefaults) {
        const parsedDefaults = JSON.parse(savedDefaults);
        for (const k in parsedDefaults) {
          state.defaultSkinCustomizations[k] = Object.assign({}, state.defaultSkinCustomizations[k] || {}, parsedDefaults[k]);
          state.skinCustomizations[k] = Object.assign({}, state.skinCustomizations[k] || {}, parsedDefaults[k]);
        }
      }

      // 3. Load active customization sliders if present
      const saved = localStorage.getItem('circleMiniBattleSkinCustomizations');
      if (saved) {
        const parsed = JSON.parse(saved);
        for (const k in parsed) {
          state.skinCustomizations[k] = Object.assign({}, state.skinCustomizations[k] || {}, parsed[k]);
        }
      }
    }
  } catch (e) {
    console.warn('Could not load skin customizations:', e);
  }
}

/**
 * Sets the given customization as the persistent user default for a character.
 * @param {string} fighterKey
 * @param {Object} customObj
 */
export function setFighterCustomAsDefault(fighterKey, customObj) {
  if (!state.defaultSkinCustomizations) state.defaultSkinCustomizations = getAllDatabaseDefaults();
  if (!state.skinCustomizations) state.skinCustomizations = getAllDatabaseDefaults();

  const cloned = { ...customObj };
  state.defaultSkinCustomizations[fighterKey] = { ...cloned };
  state.skinCustomizations[fighterKey] = { ...cloned };
  saveSkinCustomizations();
}

/**
 * Restores a fighter customization to default.
 * @param {string} fighterKey
 * @param {boolean} [useFactory=false] - If true, ignores user defaults and resets directly to built-in code database.
 * @returns {Object} Restored customization object.
 */
export function resetFighterToDefault(fighterKey, useFactory = false) {
  if (!state.skinCustomizations) state.skinCustomizations = getAllDatabaseDefaults();
  const def = useFactory
    ? getDatabaseDefault(fighterKey)
    : (state.defaultSkinCustomizations?.[fighterKey] || getDatabaseDefault(fighterKey));
  state.skinCustomizations[fighterKey] = { ...def };
  if (useFactory && state.defaultSkinCustomizations) {
    state.defaultSkinCustomizations[fighterKey] = { ...def };
  }
  saveSkinCustomizations();
  return state.skinCustomizations[fighterKey];
}

/**
 * Resets all fighters to default customizations.
 * @param {boolean} [useFactory=false]
 */
export function resetAllFightersToDefault(useFactory = false) {
  if (useFactory) {
    state.skinCustomizations = getAllDatabaseDefaults();
    state.defaultSkinCustomizations = getAllDatabaseDefaults();
  } else {
    state.skinCustomizations = {};
    for (const [k, v] of Object.entries(state.defaultSkinCustomizations || getAllDatabaseDefaults())) {
      state.skinCustomizations[k] = { ...v };
    }
  }
  saveSkinCustomizations();
}

// Save fighter selections per category (foc / tactical) to localStorage
export function saveFighterSelections() {
  try {
    const cat = state.gameCategory || 'foc';
    const selections = {
      p1Index: state.p1Index ?? 0,
      p2Index: state.p2Index ?? 1,
      p3Index: state.p3Index ?? 2,
      p4Index: state.p4Index ?? 3,
      p5Index: state.p5Index ?? 4,
      p6Index: state.p6Index ?? 5,
      p7Index: state.p7Index ?? 6,
      p8Index: state.p8Index ?? 7,
      p9Index: state.p9Index ?? 8,
      p10Index: state.p10Index ?? 9,
      p11Index: state.p11Index ?? 10,
      p12Index: state.p12Index ?? 11,
      horizontalRosterSlots: Array.isArray(state.horizontalRosterSlots) ? [...state.horizontalRosterSlots] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      bossBattleNoTeammate: Boolean(state.bossBattleNoTeammate)
    };
    const allSavedStr = localStorage.getItem('circleMiniBattleFighterSelections');
    const allSaved = allSavedStr ? JSON.parse(allSavedStr) : {};
    allSaved[cat] = selections;
    localStorage.setItem('circleMiniBattleFighterSelections', JSON.stringify(allSaved));
    localStorage.setItem('circleMiniBattleBossBattleNoTeammate', String(Boolean(state.bossBattleNoTeammate)));
    if (Array.isArray(state.horizontalRosterSlots)) {
      localStorage.setItem('circleMiniBattleHorizontalRoster', JSON.stringify(state.horizontalRosterSlots));
    }
  } catch (e) {
    console.warn('Could not save fighter selections:', e);
  }
}

// Load fighter selections for a specific category (or current state.gameCategory)
export function loadFighterSelections(targetCat = null) {
  try {
    const cat = targetCat || state.gameCategory || 'foc';
    const allSavedStr = localStorage.getItem('circleMiniBattleFighterSelections');
    if (allSavedStr) {
      const allSaved = JSON.parse(allSavedStr);
      if (allSaved && allSaved[cat]) {
        const sel = allSaved[cat];
        if (typeof sel.p1Index === 'number') state.p1Index = sel.p1Index;
        if (typeof sel.p2Index === 'number') state.p2Index = sel.p2Index;
        if (typeof sel.p3Index === 'number') state.p3Index = sel.p3Index;
        if (typeof sel.p4Index === 'number') state.p4Index = sel.p4Index;
        if (typeof sel.p5Index === 'number') state.p5Index = sel.p5Index;
        if (typeof sel.p6Index === 'number') state.p6Index = sel.p6Index;
        if (typeof sel.p7Index === 'number') state.p7Index = sel.p7Index;
        if (typeof sel.p8Index === 'number') state.p8Index = sel.p8Index;
        if (typeof sel.p9Index === 'number') state.p9Index = sel.p9Index;
        if (typeof sel.p10Index === 'number') state.p10Index = sel.p10Index;
        if (typeof sel.p11Index === 'number') state.p11Index = sel.p11Index;
        if (typeof sel.p12Index === 'number') state.p12Index = sel.p12Index;
        if (Array.isArray(sel.horizontalRosterSlots) && sel.horizontalRosterSlots.length > 0) {
          state.horizontalRosterSlots = [...sel.horizontalRosterSlots];
        }
        if (typeof sel.bossBattleNoTeammate === 'boolean') state.bossBattleNoTeammate = sel.bossBattleNoTeammate;
      }
    }
    const hRosterSaved = localStorage.getItem('circleMiniBattleHorizontalRoster');
    if (hRosterSaved) {
      try {
        const parsed = JSON.parse(hRosterSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          state.horizontalRosterSlots = [...parsed];
        }
      } catch (e) {}
    }
    const soloSaved = localStorage.getItem('circleMiniBattleBossBattleNoTeammate');
    if (soloSaved !== null) {
      state.bossBattleNoTeammate = (soloSaved === 'true');
    }

    if (!Array.isArray(state.horizontalRosterSlots) || state.horizontalRosterSlots.length < 12) {
      if (!Array.isArray(state.horizontalRosterSlots)) {
        state.horizontalRosterSlots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      }
      while (state.horizontalRosterSlots.length < 12) {
        state.horizontalRosterSlots.push(state.horizontalRosterSlots.length);
      }
    }
  } catch (e) {
    console.warn('Could not load fighter selections:', e);
  }
}

// Initialize on load
loadLeaderboard();
loadWeaponCustomizations();
loadSkinCustomizations();
loadFighterSelections();

// Debug hook: expose internal state for browser inspection
if (typeof window !== 'undefined') {
  window.__CMB_STATE__ = state;
  window.__CMB_SAVE_LEADERBOARD__ = saveLeaderboard;
  window.__CMB_LOAD_LEADERBOARD__ = loadLeaderboard;
}

// ─────────────────────────────────────────────
// FLOATING TEXT LABELS
// ─────────────────────────────────────────────

const MAX_FLOATING_TEXTS = 16; // Capacity for juicy arcing fountains and combo counters
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
  'MISS!',
  'MISS',
  'EVADE!',
  'COUNTER!',
  'SERIOUS COUNTER!',
  'UNLIMITED VOID',
  'REVERSAL RED',
  'HOLLOW PURPLE',
  'PURPLE 100%',
  'PURPLE 200%',
  'RETREAT!',
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
  'INCINERATE!',
  'RESPECT+',
  'GROVE STREET OG!',
  'CHEAT ACTIVATED!',
  'HESOYAM!',
  'ROCKETMAN!',
  'GROVE ST. DRIVE-BY!'
];

export function isAllowedFloatingText(text) {
  if (!text) return false;
  const upper = String(text).trim().toUpperCase();
  // ONLY Damage numbers, MISS, and CRIT variants are allowed; all status and skill announcement texts are suppressed.
  if (/^MISS/i.test(upper)) return true;
  if (/^CRIT/i.test(upper)) return true;
  if (/^[-]?\d+(\.\d+)?$/i.test(upper)) return true; // Pure numeric damage values
  return false;
}

let _floatingTextSideToggle = 1;

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
  // Support flexible argument order (text, x, y, color)
  let posX = x;
  let posY = y;
  let content = text;
  let textColor = color;
  if (typeof x === 'string' && typeof y === 'number' && typeof text === 'number') {
    content = x;
    posX = y;
    posY = text;
    textColor = (typeof color === 'string') ? color : '#ffffff';
  }

  if (!isAllowedFloatingText(content)) return;

  // Cap global performance log to prevent infinite allocations
  if (state.allFpsLogs && state.allFpsLogs.length > 100) {
    state.allFpsLogs.shift();
  }

  let displayText = String(content).trim();
  if (displayText.startsWith('-')) {
    displayText = displayText.slice(1);
  }
  const upper = displayText.toUpperCase();
  const isCrit = /^CRIT/i.test(upper) || upper.includes('💥');
  const isMiss = /^MISS/i.test(upper);
  const numericVal = parseFloat(displayText);
  const isDamage = !isMiss && !isNaN(numericVal) && isFinite(numericVal);

  // Normalize display text
  if (isCrit) {
    if (upper === 'CRIT' || upper === 'CRIT!') {
      displayText = 'CRIT!';
    }
  } else if (isMiss) {
    displayText = upper.includes('!') ? 'MISS!' : (upper === 'MISSED' ? 'MISSED' : 'MISS');
  } else if (isDamage) {
    displayText = String(Math.round(numericVal));
  } else {
    return;
  }

  // Fast Combo Stacking: Accumulate rapid damage on same target into climbing counter
  // Prevents spawning 20 floating numbers on screen at once during rapid combos (e.g. Sukuna slashes, Toji flurries, Denji shred)
  if (isDamage && !isCrit) {
    const MAX_COMBO_STACKS = 4;
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const activeText = state.floatingTexts[i];
      if (activeText && activeText.isDamage && !activeText.isCrit &&
          (activeText.stackCount || 1) < MAX_COMBO_STACKS &&
          Math.hypot(activeText.originX - posX, activeText.originY - posY) < 40 &&
          activeText.timer < 12) {
        activeText.stackCount = (activeText.stackCount || 1) + 1;
        activeText.damageValue = (activeText.damageValue || 0) + numericVal;
        activeText.text = String(Math.round(activeText.damageValue));
        activeText.popFrames = 5;
        activeText.timer = Math.min(activeText.timer, 4);
        activeText.vy = Math.max(-2.0, (activeText.vy || 0) * 0.3 - 0.6);
        if (activeText.y < activeText.originY - 24) {
          activeText.y = activeText.originY - 24;
          activeText.vy = Math.max(0, activeText.vy);
        }
        activeText.originX = posX;
        activeText.originY = posY;
        activeText.x += (posX - activeText.x) * 0.35;
        activeText.baseScale = Math.min(1.55, 1.25 + Math.log10(1 + activeText.damageValue / 20) * 0.28);
        return;
      }
    }
  }

  // Filter duplicate spam in close proximity
  const now = Date.now();
  const hashKey = fastHash(displayText, Math.round(posX / 40), Math.round(posY / 40));
  const lastSpawnedTime = spamPreventionCache.get(hashKey);
  if (lastSpawnedTime && (now - lastSpawnedTime) < FLOATING_TEXT_SPAM_COOLDOWN) {
    return;
  }
  spamPreventionCache.set(hashKey, now);

  if (spamPreventionCache.size > 100) {
    for (const [key, val] of spamPreventionCache.entries()) {
      if (now - val > 1500) spamPreventionCache.delete(key);
    }
  }

  // Prune oldest texts when at capacity
  if (state.floatingTexts.length >= MAX_FLOATING_TEXTS) {
    state.floatingTexts.shift();
  }

  _floatingTextSideToggle = -_floatingTextSideToggle;
  const spreadDir = _floatingTextSideToggle;

  let vx = 0;
  let vy = -2.4;
  let gravity = 0.04;
  let dragX = 0.98;
  let rotation = 0;
  let popAmount = 0.35;
  let popFrames = 5;
  let maxTimer = 40;
  let baseScale = 1.20;
  let finalColor = textColor;

  if (isCrit) {
    vx = spreadDir * (1.2 + Math.random() * 0.6);
    vy = -4.5;
    gravity = 0.16;
    popAmount = 0.55;
    popFrames = 6;
    rotation = spreadDir * (0.08 + Math.random() * 0.06);
    maxTimer = 46;
    baseScale = 1.30;
    if (!finalColor || finalColor === '#ffffff' || finalColor === '#fff') {
      finalColor = '#FF3B30'; // Punchy red/orange crit
    }
  } else if (isMiss) {
    vx = (Math.random() - 0.5) * 0.6;
    vy = -2.4;
    gravity = 0.04;
    popAmount = 0.30;
    popFrames = 5;
    maxTimer = 38;
    baseScale = 1.10;
    if (!finalColor || finalColor === '#ffffff' || finalColor === '#fff') {
      finalColor = '#E2E8F0'; // Clean silver/white miss
    }
  } else {
    // Standard damage number takes a parabolic fountain arc
    vx = spreadDir * (1.1 + Math.random() * 0.6);
    vy = -3.6;
    gravity = 0.14;
    popAmount = 0.40;
    popFrames = 5;
    maxTimer = 38;
    const val = isNaN(numericVal) ? 20 : Math.abs(numericVal);
    baseScale = Math.min(1.50, 1.25 + Math.log10(1 + val / 20) * 0.25);
    if (!finalColor) finalColor = '#FFFFFF';
  }

  state.floatingTexts.push({
    x: posX + (Math.random() - 0.5) * 4,
    y: posY - 6,
    vx,
    vy,
    gravity,
    dragX,
    text: displayText,
    color: finalColor,
    rotation,
    popFrames,
    popAmount,
    baseScale,
    timer: 0,
    maxTimer,
    isCrit,
    isMiss,
    isDamage,
    damageValue: isDamage ? numericVal : 0,
    stackCount: 1,
    originX: posX,
    originY: posY
  });
}

/**
 * Triggers the GTA San Andreas "mission passed! RESPECT +" center screen overlay.
 */
export function triggerMissionPassedOverlay(opts = {}) {
  // Always play the respect bgmusic immediately and let it play to natural completion
  const _playRespectMusic = () => {
    try {
      if (state._isRespectMusicPlaying) return; // Audio is already playing smoothly to its natural conclusion
      const winMusic = (typeof CONFIG !== 'undefined' && CONFIG.cj?.sounds?.respectOverlayBgMusic) || 'Assets/Sound Effects/Skills/cj-respectoverlay-bgmusic.mp3';
      const winVol = (typeof CONFIG !== 'undefined' && CONFIG.cj?.soundVolumes?.respectOverlayBgMusic) ?? 0.8;
      const sys = (typeof audioSystem !== 'undefined' && audioSystem) || (typeof window !== 'undefined' && window.audioSystem);
      if (sys && typeof sys.playSFX === 'function') {
        state._isRespectMusicPlaying = true;
        const handle = sys.playSFX(winMusic, winVol, 1.0, 0, 0, () => {
          state._isRespectMusicPlaying = false;
          state._respectMusicHandle = null;
        });
        state._respectMusicHandle = handle;
      }
    } catch (e) {}
  };

  // If overlay is already active, ensure audio is playing without resetting visual timer
  if (state.missionPassedOverlay && (state.missionPassedOverlay.active || state.missionPassedOverlay.timer > 0)) {
    if (!state._isRespectMusicPlaying) {
      _playRespectMusic();
    }
    return;
  }
  state._hadMissionOverlay = true;
  const duration = opts.timer || 180;
  state.missionPassedOverlay = {
    active: true,
    timer: duration,
    maxTimer: duration,
    title: 'mission Passed!',
    subtitle: 'RESPECT +',
    isComplete: false,
    _lastTickFrame: -1
  };
  _playRespectMusic();
}

/**
 * Triggers the GTA San Andreas "WASTED" center screen overlay with death music.
 */
export function triggerWastedOverlay(opts = {}) {
  const _playWastedMusic = () => {
    try {
      const deathSound = (typeof CONFIG !== 'undefined' && CONFIG.cj?.sounds?.deathMusic) || 'Assets/Sound Effects/Skills/cj-deathmusic.mp3';
      const deathVol = (typeof CONFIG !== 'undefined' && CONFIG.cj?.soundVolumes?.deathMusic) ?? 0.85;
      const sys = (typeof audioSystem !== 'undefined' && audioSystem) || (typeof window !== 'undefined' && window.audioSystem);
      if (sys && typeof sys.playSFX === 'function') {
        sys.playSFX(deathSound, deathVol);
      }
    } catch (e) {}
  };

  if (state.wastedOverlay && (state.wastedOverlay.active || state.wastedOverlay.timer > 0)) {
    _playWastedMusic();
    return;
  }
  state._hadMissionOverlay = true;
  const duration = opts.timer || 180;
  state.wastedOverlay = {
    active: true,
    timer: duration,
    maxTimer: duration,
    title: 'WASTED',
    isComplete: false,
    _lastTickFrame: -1
  };
  _playWastedMusic();
}

state.mahitoClawCustomBlades = state.weaponCustomizations.mahito.blades;

/**
 * Universal helper: returns true if any fighter in the match is currently causing a global hit-pause stasis (e.g. Nanami ratio hit, Escanor chop).
 * @param {Object} [stateObj=state] - The game state object
 * @param {Object} [excludeFighter=null] - Optional fighter instance to exclude from check (e.g. self)
 * @returns {boolean}
 */
export function isGlobalHitPauseActive(stateObj = state, excludeFighter = null) {
  if (!stateObj || !stateObj.fighters) return false;
  const fighters = stateObj.fighters;
  for (let i = 0; i < fighters.length; i++) {
    const f = fighters[i];
    if (f && f !== excludeFighter && f.hp > 0) {
      if ((f.characterId === 'nanami' || f.type === 'nanami') && (f.ratioHitPauseTimer || 0) > 0) return true;
      if ((f.characterId === 'escanor' || f.type === 'escanor') && (f.chopHitPauseTimer || 0) > 0) return true;
      if ((f.characterId === 'pekka' || f.type === 'pekka') && (f.cleaveHitPauseTimer || 0) > 0) return true;
    }
  }
  return false;
}

state.isGlobalHitPauseActive = (excludeFighter = null) => isGlobalHitPauseActive(state, excludeFighter);

window.state = state;
window.isGlobalHitPauseActive = isGlobalHitPauseActive;
window.triggerMissionPassedOverlay = triggerMissionPassedOverlay;
window.triggerWastedOverlay = triggerWastedOverlay;

