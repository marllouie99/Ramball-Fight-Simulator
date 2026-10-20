// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// CONFIG ΓÇö tweak all game values here
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
import { gojoConfig } from '../configs/characters/gojoConfig.js';
import { sukunaConfig } from '../configs/characters/sukunaConfig.js';
import { yutaConfig } from '../configs/characters/yutaConfig.js';
import { tojiConfig } from '../configs/characters/tojiConfig.js';
import { mahoragaConfig } from '../configs/characters/mahoragaConfig.js';
import { todoConfig } from '../configs/characters/todoConfig.js';
import { yujiConfig } from '../configs/characters/yujiConfig.js';
import { laylaConfig } from '../configs/characters/laylaConfig.js';
import { saitamaConfig } from '../configs/characters/saitamaConfig.js';
import { genosConfig } from '../configs/characters/genosConfig.js';
import { ichigoConfig } from '../configs/characters/ichigoConfig.js';
import { mahitoConfig } from '../configs/characters/mahitoConfig.js';
import { nanamiConfig } from '../configs/characters/nanamiConfig.js';
import { naoyaConfig } from '../configs/characters/naoyaConfig.js';
import { makiConfig } from '../configs/characters/makiConfig.js';
import { shiroConfig } from '../configs/characters/shiroConfig.js';
import { soraConfig } from '../configs/characters/soraConfig.js';
import { nobaraConfig } from '../configs/characters/nobaraConfig.js';
import { megumiConfig } from '../configs/characters/megumiConfig.js';
import { meguminConfig } from '../configs/characters/meguminConfig.js';
import { crazyDaveConfig } from '../configs/characters/crazyDaveConfig.js';
import { pekkaConfig } from '../configs/characters/pekkaConfig.js';
import { sansConfig } from '../configs/characters/sansConfig.js';
import { namelessDeityConfig } from '../configs/characters/namelessDeityConfig.js';
import { avatarOfEmptinessConfig } from '../configs/characters/avatarOfEmptinessConfig.js';
import { draedonConfig } from '../configs/characters/draedonConfig.js';
import { johnWickConfig } from '../configs/characters/johnWickConfig.js';
import { cjConfig } from '../configs/characters/cjConfig.js';
import { uryuConfig } from '../configs/characters/uryuConfig.js';
import { ulquiorraConfig } from '../configs/characters/ulquiorraConfig.js';
import { makimaConfig } from '../configs/characters/makimaConfig.js';
import { rezeConfig } from '../configs/characters/rezeConfig.js';
import { denjiConfig } from '../configs/characters/denjiConfig.js';
import { powerConfig } from '../configs/characters/powerConfig.js';
import { tanjiroConfig } from '../configs/characters/tanjiroConfig.js';
import { nezukoConfig } from '../configs/characters/nezukoConfig.js';
import { zenitsuConfig } from '../configs/characters/zenitsuConfig.js';
import { inosukeConfig } from '../configs/characters/inosukeConfig.js';
import { escanorConfig } from '../configs/characters/escanorConfig.js';
import { engineerConfig } from '../configs/characters/engineerConfig.js';
import { spikeConfig } from '../configs/characters/spikeConfig.js';
import { rubbickConfig } from '../configs/characters/rubbickConfig.js';
import { zeusConfig } from '../configs/characters/zeusConfig.js';
import { gunslingerConfig } from '../configs/characters/gunslingerConfig.js';
import { eyeOfCthulhuConfig } from '../configs/characters/eyeOfCthulhuConfig.js';
import { enderDragonConfig } from '../configs/characters/enderDragonConfig.js';
import { knightConfig } from '../configs/characters/knightConfig.js';
import { spartanConfig } from '../configs/characters/spartanConfig.js';
import { gutsConfig } from '../configs/characters/gutsConfig.js';
import { chosoConfig } from '../configs/characters/chosoConfig.js';
import { sharpshooterConfig } from '../configs/characters/sharpshooterConfig.js';
import { jazzConfig } from '../configs/characters/jazzConfig.js';
import { circeConfig } from '../configs/characters/circeConfig.js';
import { hyperionConfig } from '../configs/characters/hyperionConfig.js';
import { erebusConfig } from '../configs/characters/erebusConfig.js';
import { shinobiConfig } from '../configs/characters/shinobiConfig.js';
import { emberConfig } from '../configs/characters/emberConfig.js';
import { berserkerConfig } from '../configs/characters/berserkerConfig.js';
import { cronusConfig } from '../configs/characters/cronusConfig.js';
import { bombardierConfig } from '../configs/characters/bombardierConfig.js';
import { doppelgangerConfig } from '../configs/characters/doppelgangerConfig.js';
import { rubyConfig } from '../configs/characters/rubyConfig.js';
import { musashiConfig } from '../configs/characters/musashiConfig.js';
import { hydraConfig } from '../configs/characters/hydraConfig.js';
import { DEFAULT_GRADE } from '../configs/gradeConfig.js';
import { blackFlashConfig } from '../configs/skills/blackFlashConfig.js';
import { bloodConfig } from '../configs/bloodConfig.js';
import { interactionConfigs } from '../configs/interactions/index.js';

export const CONFIG = {
  interactions: interactionConfigs,
  blood: bloodConfig,
  spike: spikeConfig,
  Spike: spikeConfig,
  melee: spikeConfig,
  saitama: saitamaConfig,
  genos: genosConfig,
  mahito: mahitoConfig,
  nanami: nanamiConfig,
  naoya: naoyaConfig,
  Naoya: naoyaConfig,
  naoya_zenin: naoyaConfig,
  maki: makiConfig,
  Maki: makiConfig,
  maki_zenin: makiConfig,
  shiro: shiroConfig,
  Shiro: shiroConfig,
  shiro_ngnl: shiroConfig,
  sora: shiroConfig,
  Sora: shiroConfig,
  sora_ngnl: shiroConfig,
  blank: shiroConfig,
  nobara: nobaraConfig,
  megumi: megumiConfig,
  megumin: meguminConfig,
  crazydave: crazyDaveConfig,
  crazy_dave: crazyDaveConfig,
  CrazyDave: crazyDaveConfig,
  pekka: pekkaConfig,
  sans: sansConfig,
  Sans: sansConfig,
  namelessdeity: namelessDeityConfig,
  namelessDeity: namelessDeityConfig,
  nameless_deity: namelessDeityConfig,
  avatarofemptiness: avatarOfEmptinessConfig,
  avatarOfEmptiness: avatarOfEmptinessConfig,
  avatar_of_emptiness: avatarOfEmptinessConfig,
  draedon: draedonConfig,
  gojo: gojoConfig,
  sukuna: sukunaConfig,
  yuta: yutaConfig,
  toji: tojiConfig,
  mahoraga: mahoragaConfig,
  todo: todoConfig,
  yuji: yujiConfig,
  layla: laylaConfig,
  ichigo: ichigoConfig,
  uryu: uryuConfig,
  ishida: uryuConfig,
  ulquiorra: ulquiorraConfig,
  makima: makimaConfig,
  reze: rezeConfig,
  denji: denjiConfig,
  power: powerConfig,
  tanjiro: tanjiroConfig,
  nezuko: nezukoConfig,
  zenitsu: zenitsuConfig,
  inosuke: inosukeConfig,
  escanor: escanorConfig,
  rubbick: rubbickConfig,
  zeus: zeusConfig,
  eye_of_cthulhu: eyeOfCthulhuConfig,
  EyeOfCthulhu: eyeOfCthulhuConfig,
  eyeofcthulhu: eyeOfCthulhuConfig,
  ender_dragon: enderDragonConfig,
  enderDragon: enderDragonConfig,
  enderdragon: enderDragonConfig,
  john_wick: johnWickConfig,
  johnWick: johnWickConfig,
  cj: cjConfig,
  CJ: cjConfig,
  engineer: engineerConfig,
  Engineer: engineerConfig,
  shiro: shiroConfig,
  Shiro: shiroConfig,
  sora: soraConfig,
  Sora: soraConfig,
  knight: knightConfig,
  Knight: knightConfig,
  spartan: spartanConfig,
  Spartan: spartanConfig,
  guts: gutsConfig,
  Guts: gutsConfig,
  berserker: gutsConfig,
  choso: chosoConfig,
  Choso: chosoConfig,
  camera: {
    minZoom: 0.65,
    maxZoom: 1.18,
    winnerZoom: 1.10,
    smoothing: 0.085,
    zoomSmoothing: 0.048,
    zoomOutSmoothing: 0.085,
    maxPanRatio: 0.85,
    minDist: 70,
    maxDist: 520
  },
  arena: { x: 45, y: 240, width: 450, height: 450, wallWidth: 4, shape: 'rect' },
  projectile: { speed: 5.5, radius: 5, life: 120, damage: 10 },
  gun: { baseOffset: 10, barrelLength: 12 }, // distance from fighter edge
  spin: { rate: 0.06 },                        // angle increment per frame (├ù fighter.speed)
  shoot: { cooldown: 24 },                      // frames between shots
  collision: { restitution: 0.95 },
  spawn: { leftXRatio: 0.25, rightXRatio: 0.75, yRatio: 0.5, verticalOffset: 32 },
  hpBar: { height: 6, yOffset: 16 },
  rounds: { max: 3 },                          // default max rounds for match (used in Fighter.takeDamage)
  postKillAngleHoldFrames: 40,                 // frames to hold aim/strike facing angle after killing an enemy (~0.67s at 60fps) before returning to 0 rad
  globalFighter: {
    sizeMultiplier: 1.2,                       // scale the size of all fighters globally (1.0 = default)
    _defaultFocSizeMultiplier: 1.2,            // reference base size for FOC modes
    handSizeMultiplier: 1.4,                   // scale the size of all fighter hands globally (1.0 = default)
  },
  /** Global Bleed Debuff Settings */
  bleed: {
    defaultDuration: 180,                      // default duration in frames (3.0s at 60fps)
    defaultIntervalFrames: 30,                 // frames between bleed damage ticks (30 frames = 0.5s)
    defaultDamagePerTick: 4,                   // true damage per bleed tick
    dripParticleIntervalFrames: 5,             // frames between dripping blood particles
  },
  /** 1v1 Stand Off Mode Settings */
  standOff: {
    maxAfterimages: 12,                        // Maximum active afterimages / ghost trails allowed per fighter in 1v1 Stand Off mode
    afterimageDecayMultiplier: 1.2,            // Multiplier to accelerate afterimage fade rate in 1v1 Stand Off mode
  },
  /** 1v2 Mode & Stand Off 1v2 Settings */
  standOff1v2: {
    maxAfterimages: 8,                         // Maximum active afterimages / ghost trails allowed per fighter in 1v2 mode (reduces visual clutter & FPS drops)
    afterimageDecayMultiplier: 1.5,            // Multiplier to accelerate afterimage fade rate in 1v2 mode
    maxParticles: 45,                          // Max active particle cap in 1v2 mode
    particleCountScale: 0.45,                  // Particle spawn count scale in 1v2 mode
  },
  oneVsTwo: {
    maxAfterimages: 8,                         // Alias for standOff1v2.maxAfterimages
    afterimageDecayMultiplier: 1.5,
  },
  blackFlash: blackFlashConfig,
  hudShowFighterDescription: true, // Set to true to display fighter description in HUD card instead of skill progress bars
  darkModeShowHudSkillBars: 0,  // Toggle on/off to display HUD skill progress bars across Light and Dark mode (1 = show all, 0 = signature skills only, -1/hide = hide all)
  darkModeShowHudStats: 0,      // Toggle on/off to display HUD fighter stats info (DMG, SPD, ATK, etc.) across Light and Dark mode (1 = show, 0 = hide)
  hudHideAll: false,            // Master toggle: completely hide all top screen HUD cards/elements (health cards, skill bars, stats, descriptions)
  hudHideHealthBars: false,     // Toggle to completely hide top screen HUD health bars
  hudHideSkillBars: false,      // Toggle to completely hide all HUD skill progress bars with zero exceptions
  hudHideStats: false,          // Toggle to completely hide all fighter HUD stats lines
  hudHideOverheadHp: false,      // Toggle to hide overhead canvas health numbers and bars on fighters
  enableFighterInkOutline: true, // Global manga-style ink outline around live in-arena fighters
  fighterInkOutlineWidth: 2.2,   // Ink outline stroke width (2.2px cleanly frames 2.0px pixel body borders, weapons & tendrils)
  fighterInkOutlineColor: '#050609', // Dark ink outline stroke color (matches Top HUD frame badge standard #050609)
  enableFighterFloorShadow: true, // Universal ground contact depth shadow anchoring all fighters to the arena floor
  fighterFloorShadowColor: 'rgba(5, 6, 9, 0.32)', // Dark grounded ambient floor shadow color
  hudSkillBarsMode: 'all',      // 'all' = show all skill bars, 'signature' = signature only, 'none' = completely hide all skill bars
  hudGhostBarEnabled: true,      // Master toggle for fighting-game trailing damage ghost bar on healthbars

  // ── Combo Counter HUD ──
  // Mirrored "COMBO" cards that slide in at each window edge, just below the TOP HUD,
  // counting consecutive damaging hits per side (see js/systems/comboTracker.js).
  comboCounter: {
    enabled: true,             // Master toggle for the on-screen combo counter
    useFighterTheme: true,     // Dynamically adapt banner color theme to attacking fighter's signature colors
    windowFrames: 90,          // Frames without a hit before the chain expires (90 = 1.5s at 60 FPS)
    minHits: 1,                // Minimum chain length before a card is shown
    edgeInset: 45,             // Horizontal inset aligned with the Top HUD frame & arena bounds (in canvas px)
    topGapBelowHud: 44,        // Card top = arena.y - this value (keeps it below the TOP HUD)
    slideFrames: 10,           // Slide-in / slide-out animation duration, in frames
    popFrames: 8,              // Impact pop animation duration on every new hit, in frames
    tierThresholds: [1, 5, 10, 20],               // Hit counts that promote the beat-'em-up color tier
    tierColors: ['#E11D2E', '#FF3B30', '#FF7A00', '#FFD400'], // Deep red, bright red, orange, gold
  },
  hudGhostBarHoldFrames: 8,      // Responsive delay in frames (~133ms) before trailing ghost bar begins catch-up decay
  arenaDecorations: {
    enabled: true,               // Master toggle: set to false to completely disable all seasonal decorations when event ends
    theme: 'halloween',          // Active event theme: 'halloween' | 'none'
    opacity: 1.0,               // Visual opacity (0.0 to 1.0)
    scaleMultiplier: 1.0,       // Custom scale factor
    swayAnimation: true,         // Subtle atmospheric swaying on hanging spider silk
    candleFlicker: true,         // Dynamic flickering flame & warm halo on bone candles
    enableGravestoneDeath: true, // Gravestone pop & ascending ghost soul when fighters die
  },
  hudGhostBarDecaySpeed: 3.5,    // Fast linear decay rate (% per frame) for ghost bar catch-up
  hudGhostBarColor: '#dc2626',   // Trailing damage ghost bar color (fighting game red)
  basicAttackHitPauseDuration: 0, // Hit-pause duration in frames for basic attacks (0 to disable)
  globalScreenShakeIntensityMultiplier: 0.7, // Global multiplier for all hit effect & arena screen shake intensity (1.0 = normal, 0.5 = half shake, 0.0 = disable shake completely)
  camera: {
    minZoom: 1.04,
    maxZoom: 1.14,                     // Dynamic zoom cap for closer, cinematic combat tracking
    winnerZoom: 1.08,                  // Victory focus zoom
    maxPanRatio: 0.22,                 // Maximum pan offset relative to arena radius
    smoothing: 0.08,                   // Position tracking smoothing
    zoomSmoothing: 0.05,               // Zoom interpolation smoothing
    minDist: 80,                       // Combat distance for maxZoom
    maxDist: 420,                      // Combat distance for minZoom
  },
  canvasWidth: 540,                 // Logical width of the game screen
  canvasHeight: 960,                 // Logical height of the game screen (standard 9:16 portrait)
  internalScale: 1.0,               // Scale factor for active game elements (arena, fighters, projectiles, and HUD size) inside the container
  arenaXOffset: 0,                   // Horizontal offset shift (px) from center (negative = left, positive = right)
  arenaYOffset: 0,                   // Vertical offset shift (px) from center (negative = up, positive = down)
  arenaXOverride: 45,              // Absolute X override (px) - Rule 28 locked at 45
  arenaYOverride: 240,             // Absolute Y override (px) - Rule 28 locked at 240
  arenaTheme: 'light',               // Arena visual theme: 'light' | 'dark'
  canvasBgColor: '#141622',          // Canvas background color (hex string or hex number)
  arenaOuterBgColor: '#141622',      // Background color of the container area outside the arena (under HUD and sides)
  arenaInnerBgColor: '#919298ff',      // Background color inside the arena boundaries
  lightCanvasBgColor: '#141622',
  lightArenaOuterBgColor: '#141622',
  lightArenaInnerBgColor: '#3d3f51ff',
  hudTextColor: '#131313ff',         // Font color for all HUD text (title, stats, description)
  hudTitleFontSize: 22,              // Font size for fighter name in HUD (px)
  hudDescFontSize: 20,               // Font size for fighter description in HUD (px)
  hudInfoFontSize: 14.5,             // Font size for fighter info (DMG, etc.) in HUD (px)
  hudSkillFontSize: 15,              // Font size for skill bar labels in HUD (px)
  hudWidthModifier: 1.0,            // HUD width relative to raw arena width. 1.0 = full arena width; 0.95 = aligns with arena side walls (matches internalScale)
  bottomHudWidthModifier: 1.007,    // Bottom HUD width relative to raw arena width (1.007 = aligns flush with arena side borders)
  showArenaTitle: false,             // Set to true to display the "Fight of Characters / Ball Fight Simulator" title header above the arena, false to hide it

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // PER-FIGHTER TUNINGs
  // All attack / behaviour numbers live here so you
  // never need to touch customFighters.js for balance.
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  /** Red ΓÇö Normal fighter */
  normal: {
    aimThreshold: 0.12, // radians; lower = must face enemy more precisely before firing
    shotCooldown: 10,   // frames between consecutive shots (independent of base cooldown)
    knockbackStrength: 20,    // velocity impulse applied to target on each hit
    magazineSize: 7,    // number of bullets before needing to reload
    reloadTime: 130,    // frames to reload (2 seconds at 60 fps)
  },

  /** Sharpshooter / Crimson Sniper specific */
  sharpshooter: {
    enhancedDamageMultiplier: 2.5, // Damage multiplier for the final execution bullet
    enhancedSpeedMultiplier: 1.5,  // Projectile speed multiplier for the execution bullet
    electrifiedDuration: 45,       // Frames the crackling lightning effect lasts on target (45 = 0.75s)
    electrifiedDamagePerSec: 15,   // Damage per second taken while electrified
    enhancedRecoilForce: 30,       // Massive backward physics push on the shooter when the final bullet is fired
    executeWindupFrames: 30,       // Delay frames (charge up) before firing the execution bullet
  },

  /** Blue ΓÇö Aimbot fighter */
  aimbot: {
    followUpMinCooldown: 10, // minimum frames of cooldown forced after a follow-up shot
    electricStunDuration: 8, // frames the target is stunned after being hit (10 frames = ~0.16s)
    electricStunChance: 0.40,  // 0.0 to 1.0 chance of triggering the stun on hit (0.5 = 50%)
  },



  /** Orange ΓÇö Flamethrower fighter */
  orange: {
    flameCount: 5,                  // number of flame particles per burst
    flameSpread: 0.30,              // radians; half-angle of the flame cone (matches V-shape)
    flameSpeed: 0.5,                // speed of each flame particle
    flameLife: 35,                  // frames each flame particle lives
    flameDamage: 2.0,               // base damage on first flame contact tick
    flameRadius: 2.0,               // radius of each flame particle
    flameContactIntervalSeconds: 0.1, // seconds between flame contact damage ticks
    flameContactRampDamagePerSecond: 0.5, // extra damage per second of continuous flame contact
    flameContactMaxDamage: 10.0,      // max damage per tick while staying in flame
    flameHitCooldown: 0.90,         // legacy: seconds between flame contact damage ticks
    burstCooldown: 4,              // frames between flame physical projectile bursts (reduce to 4 to avoid spawning 300 projs/sec)
    // Flame size settings (independent of speed/life)
    flameRange: 100,               // pixels; maximum range of the flame cone
    flameWidth: 1.00,              // radians; full width of the flame cone (same as flameSpread * 2)
    // Burn effect settings
    burnDuration: 240,             // frames the burn effect lasts (3 seconds at 60 fps)
    burnDamagePerSecond: 2.0,       // damage per second while burning
    burnDamageInterval: 60,         // frames between burn damage ticks (1 second at 60 fps)
    burnSpreadCooldown: 120,        // frames before burn can spread again on same collision
    // Flamethrower Heat & Overheat mechanic settings
    maxHeat: 100,                   // maximum heat capacity before overheat trigger
    heatPerBurst: 2.0,              // heat accumulated per flame burst
    coolRatePerFrame: 0.40,         // passive heat dissipation per frame when not firing (~24 heat/s)
    overheatCoolRate: 0.55,         // cooling rate per frame during full overheat lockout (~33 heat/s, ~3s total)
    // Legacy fuel aliases for backward compatibility
    maxFuel: 100,
    fuelPerBurst: 2.0,
  },

  /** White ΓÇö Laser fighter */
  laser: {
    aimThreshold: 0.12,  // radians; must face enemy this precisely to start the beam
    beamDuration: 100,   // frames the beam fires for (180 = 3 s at 60 fps)
    windupDuration: 150, // frames of beam charge before firing (240 = 4 s at 60 fps)
    beamLength: 1200,  // pixels; how far the beam reaches across the arena
    slowDuration: 180,    // frames the slow debuff lasts on hit targets (60 = 1 s)
    slowMultiplier: 1.0,   // speed fraction while slowed (0.6 = 40 % slower)
    slowChance: 1.5,      // probability (0-1) that the beam applies the slow effect on hit
    beamStartKnockback: 1.8, // initial self-knockback impulse when the beam starts
    beamBackwardSpeed: 0.8, // backward drift force while the beam is active
    beamDriftRetention: 0.92, // proportion of current velocity retained each frame during beam fire
    beamDriftBlend: 0.08,   // proportion of beam recoil blended into velocity each frame
    beamRotateSpeed: 0.015, // increased to allow the beam to effectively track moving targets
    initialKnockback: 1,     // velocity impulse on the very first beam contact
    tickDamage: 5.5,     // damage applied every tick interval after the initial hit
    tickInterval: 7,    // frames between damage ticks while beam is active
    coreWidth: 4,     // base pixel width of the bright beam core (flickers ┬▒ 2 px)
    glowWidth: 12,    // base pixel width of the soft glow layer (flickers ┬▒ 4 px)
  },

  /** Green ΓÇö Grenadier (grenade throw + poison DOT) */
  grenadier: {
    attackRadius: 150, // pixels; enemy must be closer than this to trigger a throw
    throwCooldown: 120, // frames between grenade throws

    // Poison DOT applied by grenade impact
    poisonTicks: 5,            // number of poison ticks
    poisonIntervalFrames: 30, // frames between poison ticks
    poisonDamagePerTick: 2,   // damage per poison tick
  },

  /** Gray — Knight fighter */
  knight: knightConfig,
  Knight: knightConfig,

  /** Black ΓÇö Black Hole fighter */
  black: {
    shotCooldown: 35,   // frames between shots (normal fire rate)
    blackHoleChance: 0.00, // 100% chance for projectile to become black hole
    blackHoleRadius: 95,   // radius of black hole effect
    blackHoleDuration: 200, // frames the black hole lasts (4 seconds at 60 fps)
    blackHoleDamage: 5,    // damage per second while in black hole
    blackHolePullStrength: 1.0, // velocity pull strength toward black hole center
    skillCooldown: 300,    // frames between skill uses (5 seconds at 60 fps)
    skillSpawnRadius: 120, // radius around opponent to spawn black hole
    // Additional tuning values used by Black fighter implementation
    enhancedBlackHoleChance: 0.0, // increased chance when enemy is already in black hole
    enhancedShotsGranted: 0, // number of guaranteed enhanced projectiles granted when enemy is pulled in
    summonIndicatorFrames: 36, // frames for the summon fade-in/out indicator (Γëê0.6s)
    skillChargeDuration: 30, // frames to charge skill before summoning (1s)
    projectileSpeed: 10.0, // default speed for black projectiles when specified
  },

  /** DarkSlateGray ΓÇö Ninja fighter */
  darkslategray: {
    // TUNING: Basic attack settings
    shurikenDamage: 5,           // damage per shuriken
    shurikenSpeed: 7.0,          // speed of shuriken projectiles
    shurikenCooldown: 25,        // frames between shuriken throws (normal fire rate)

    // TUNING: Dodge mechanics
    dodgeChance: 0.50,           // probability (0-1) of dodging incoming projectiles
    dodgeFlashDuration: 100,      // frames the flash step visual effect lasts (increased for visibility)
    dodgeCooldown: 15,           // frames minimum between dodge attempts

    // TUNING: Flame-contact stealth build
    // When DarkSlateGray is continuously in contact with Orange's flames,
    // it can (with a chance) trigger stealth mode after building up time.
    flameContactStealthBuildFrames: 72, // frames of sustained flame contact before attempting stealth (Γëê1.2s at 60fps)
    flameContactStealthChance: 0.45,     // chance to trigger stealth when build completes (per attempt)
    flameContactStealthCooldown: 150,    // min frames between stealth triggers from flame contact (Γëê2.5s at 60fps)

    // TUNING: Invincibility skill activation
    dodgesToActivate: 3,         // number of successful dodges needed to activate skill
    invincibilityDuration: 300, // frames the invincibility lasts (5 seconds at 60 fps)
    speedBoostMultiplier: 2.5,  // movement speed multiplier during invincibility

    // TUNING: Backstab mechanics
    backstabDamageMultiplier: 2.0, // damage multiplier when backstabbing during invincibility
    backstabAngle: 120,          // angle in degrees considered "behind" enemy (┬▒60┬░ from back)
    backstabRange: 75,          // pixels from enemy edge to trigger backstab
    meleeAttackRadius: 75,      // melee attack radius for backstab detection (INCREASED for easier testing/visibility)
    backstabRecoveryPercent: 0.15, // HP recovery on successful backstab (1.0 = 100%)
    meleeSwingDamage: 5,         // damage dealt by sword swing from any direction
    meleeSwingCooldown: 5,      // frames between sword swings (normal melee attack)
    backstabCooldown: 10,        // frames between backstab attempts
    proximityTriggerRadius: 120,  // additional distance beyond hit radius to trigger stealth dodge

    // TUNING: Weapon animations
    swingAnimationDuration: 30,  // frames for sword swing animation (increased for visibility)
    swingRotationAmount: 1.8,    // radians; total rotation during swing (increased significantly)
    backstabAnimationDuration: 20, // frames for backstab thrust animation
    backstabThrustAmount: 1.5,   // radians; rotation during backstab (increased significantly)

    // TUNING: Visual effects
    invisibilityAlpha: 0.15,    // transparency level during invincibility (0-1, lower = more transparent)
    dodgeAlpha: 0.08,           // transparency level during dodge fade
    flashStepAlpha: 0.3,        // alpha of the flash step afterimage (higher for visible dodge effects)
    flashStepCount: 5,          // number of afterimages during flash step
    weaponSwitchDuration: 12,   // frames for weapon swap animation during stealth
  },

  /** Berserker ΓÇö Blood Red fighter */
  berserker: {
    // TUNING: Rage mechanic
    maxRage: 100,               // maximum rage meter

    // Rage meter grows based on *attacker damage value* (NOT number of hits)
    // rage gained = attackerDamage * rageFromDamageScale
    ragePerDamage: 0,           // legacy (disabled)
    rageFromDamageScale: 2.5,

    rageDuration: 200,          // frames rage state lasts (5 seconds at 60 fps)
    rageDamageMultiplier: 1.5, // damage multiplier during rage
    rageAttackSpeedMultiplier: 1.1, // attack speed multiplier during rage (lower cooldown)
    rageMoveSpeedMultiplier: 2.0,  // movement speed multiplier during rage
    lifestealPercent: 0.5,     // HP recovered as percentage of damage dealt during rage (0.3 = 30%)

    axeRange: 35,              // pixels from edge for axe swing attack
    axeCooldown: 25,          // frames between axe swings
    axeDamage: 15,             // base damage per axe swing
    axeSwingDurationFrames: 30, // frames for visible axe chop animation
    axeWindupDuration: 6,     // frames of wind-up anticipation before swing
    dualAxeBonus: 1.3,         // damage multiplier when both axes hit (during rage)

    // During rage, rebounce snap point is moved away from the opponent.
    // Smaller value => snap closer to opponent => tighter re-engage.
    rageRebounceAwayDistance: 2, // pixels

    // Rage radius ring size = axeRange * rageRadiusScale
    rageRadiusScale: 1.0,

    // Fluid Blood Trail VFX
    enableFluidTrail: true,
  },

  /** Cronos ΓÇö Time Stop fighter */
  cronos: {
    // TUNING: Time Stop Sphere mechanics
    sphereRadius: 200,         // radius of the time stop sphere
    sphereDuration: 300,       // frames the sphere lasts (3 seconds at 60 fps)
    sphereCooldown: 800,       // frames between sphere deployments (5 seconds at 60 fps)
    sphereSpeedMultiplier: 7.0, // movement speed multiplier inside sphere
    sphereActivationDistance: 120, // max distance to opponent to trigger sphere activation

    // TUNING: Passive skills
    passiveStopChance: 0.05,   // chance to stop enemy movement on hit (80%)
    passiveStopDuration: 20,   // frames enemy movement is stopped (1 second)
    counterStopChance: 0.05,  // chance to stop enemy when Cronos gets attacked (15%)
    counterStopDuration: 25,  // frames enemy movement is stopped on counter (0.75 seconds)

    // TUNING: Melee attack
    meleeRange: 50,            // pixels from edge for crescent blade attack
    meleeCooldown: 90,         // frames between melee attacks
    meleeDamage: 10,          // damage per crescent blade swing
    meleeSwingDuration: 10,   // frames for visible swing animation
    sphereMeleeDamage: 8,    // separate melee damage when inside own sphere
    sphereMeleeCooldown: 10,   // separate melee cooldown when inside own sphere
    doubleStrikeWindow: 10,    // frames window to execute the second strike
    // TUNING: Bounce mechanics inside sphere
    sphereBounceForce: 0.5,   // velocity multiplier when bouncing inside sphere
    spherePreActivateFrames: 120, // frames before cooldown ends that the barrier starts glowing
    maxFrozenProjectiles: 25,    // max projectiles frozen in time sphere (performance limit)
  },

  /** Bomber ΓÇö Explosive fighter */
  bomber: {
    // TUNING: Basic attack (grenades)
    grenadeDamage: 17,         // damage per grenade explosion
    grenadeCooldown: 90,       // frames between grenade throws
    grenadeSpeed: 4.2,         // speed of thrown grenades
    grenadeRadius: 8,         // radius of grenade projectile
    grenadeLife: 120,           // frames grenade travels before auto-exploding
    explosionRadius: 70,       // AOE radius of grenade explosion
    explosionDamage: 10,       // AOE damage from grenade explosion

    // TUNING: Sticky bomb (passive)
    stickyBombChance: 0.25,    // chance (0-1) to throw sticky bomb instead of grenade
    stickyBombDamage: 15,     // damage of sticky bomb explosion
    stickyBombStickDuration: 60, // frames sticky bomb stays attached before exploding
    stickyBombExplosionRadius: 65, // AOE radius of sticky bomb explosion

    // TUNING: C4 skill
    c4Cooldown: 400,           // frames between C4 deployments (6.67 seconds at 60 fps)
    c4PlantDuration: 180,      // frames before C4 auto-explodes (3 seconds at 60 fps)
    c4Damage: 35,              // damage of C4 explosion
    c4ExplosionRadius: 100,    // AOE radius of C4 explosion
    c4PlantRadius: 80,         // max distance to plant C4

    // TUNING: Death C4 (unique mechanic)
    deathC4Duration: 150,       // frames after death before C4 explodes (1.5 seconds)
    deathC4Damage: 25,         // damage of death C4 explosion
    deathC4ExplosionRadius: 180, // AOE radius of death C4 explosion

    // TUNING: Concussive blast (knockback from explosions)
    concussiveBlast: {
      enabled: true,
      baseKnockback: 22,
      falloffExponent: 1.5,
      verticalKnockback: 0.3,
      minKnockbackRadius: 0.2,
      stunChance: 0.15,
      stunDuration: 20,
    },

    // TUNING: Chain reaction (bombs trigger nearby bombs)
    chainReaction: {
      enabled: true,
      chainRadius: 60,
      maxChains: 3,
    },

    // TUNING: Grenade range restrictions
    throwRadius: 400,        // max distance at which bomber can throw grenades
    restrictRadius: 130,      // min distance ΓÇö bomber cannot throw grenades inside this radius    optimalDistance: 145,    // sweet-spot distance bomber tries to maintain from opponent
    steeringForce: 0.35,     // how strongly bomber steers toward optimal distance (0-1)
  },

  /** Alucard (The No-Life King) — Dual wielding vampire (.454 Casull & 13mm Jackal) */
  gunslinger: gunslingerConfig,
  Gunslinger: gunslingerConfig,
  alucard: gunslingerConfig,
  Alucard: gunslingerConfig,

  /** Doppleganger ΓÇö Illusion melee fighter */
  doppleganger: {
    // TUNING: Melee attack (purple sword)
    swordRange: 40,           // pixels from edge for sword swing attack
    swordCooldown: 30,        // frames between sword swings
    swordDamage: 15,         // damage per sword swing
    swordSwingDuration: 20,   // frames for visible sword swing animation

    // TUNING: Passive skill (illusion summoning)
    illusionHealthPercent: 0.02, // health percentage threshold for summoning illusion (every 2%)
    maxIllusions: 4,         // maximum number of illusions that can exist at once
    illusionDamagePercent: 0.5, // illusions deal 50% of original damage
    illusionDamageReceivedMultiplier: 3.5, // illusions receive 2x damage
    illusionDuration: 2000,    // frames illusions last before fading (10 seconds at 60 fps)
    illusionSpeedSync: true,  // if true, illusions spawn with current speed; if false, use base speed
  },

  /** Engineer — Master Builder & Support Specialist */
  Engineer: engineerConfig,
  engineer: engineerConfig,

  /** Ruby ΓÇö Scythe fighter */
  ruby: {
    // Basic Attack
    scytheDamage: 10,
    scytheRange: 45, // pixels from edge
    scytheCooldown: 40,
    lifestealPercent: 0.25, // 25% of damage dealt

    // Active Skill (Pull)
    activePullRange: 200,
    activePullCooldown: 240, // 4 seconds at 60fps
    activePullForce: 12.0,
    activeSlowDuration: 20, // 1.5 seconds at 60fps

    // Passive Skill (360 Spin)
    passiveSpinRadius: 80,
    passiveSpinCooldown: 300, // 5 seconds at 60fps
    passiveSpinDamage: 15,
    passiveLifestealPercent: 1.00, // 50% lifesteal on spin

    // Core Mechanic (Dash)
    dashSpeedMultiplier: 3.0,
    dashDuration: 12,
  },

  /** Musashi ΓÇö Dual Sword Stance Fighter */
  musashi: {
    // General
    stanceDurationFrames: 300, // 5 seconds per stance
    baseMoveSpeed: 4.8,

    // Core Attack (Dual Wielding)
    swordRange: 40,
    attackCooldown: 80, // frames between dual sword strikes
    katanaDamage: 10,
    wakizashiDamage: 8,
    strikeDurationFrames: 10,

    // Stances
    earthArmorMultiplier: 1.1,    // takes 50% damage
    earthSpeedMultiplier: 1.1,
    waterSpeedMultiplier: 1.3,
    waterDodgeDistance: 80,
    fireDamageMultiplier: 1.0,
    fireDamageTakenMultiplier: 1.1,
    windDeflectRadius: 100,
    voidDodgeChance: 1.0,         // 100% dodge
    voidLethalDamage: 10,

    // Active Abilities
    nitenStrikeCooldown: 300,
    nitenStrikeKnockback: 15,
    nitenStrikeDamage: 7, // total

    flurryCooldown: 700,
    flurryDamage: 5,

    preemptiveStrikeCooldown: 360,
    preemptiveStrikeDuration: 60, // Window to get hit and counter
    preemptiveCounterDamage: 7,
  },

  /** Rubbick — Spell Steal and Arcane Magic */
  rubbick: rubbickConfig,
  Rubbick: rubbickConfig,
  trickster: rubbickConfig,
  Trickster: rubbickConfig,

  /** Zeus — Lightning Spell Caster */
  zeus: zeusConfig,

  /** Gojo Satoru — Limitless Fighter */
  gojo: gojoConfig,

  /** Ryomen Sukuna — King of Curses */
  sukuna: sukunaConfig,

  /** Yuta Okkotsu — Special Grade Sorcerer */
  yuta: yutaConfig,

  /** Toji — Sorcerer Killer */
  toji: tojiConfig,

  /** Mahoraga — Divine General */
  mahoraga: mahoragaConfig,

  /** Aoi Todo — Boogie Woogie Brawler */
  todo: todoConfig,

  /** Yuji Itadori — Black Flash Brawler */
  yuji: yujiConfig,

  /** Layla — Cosmic Marksman */
  layla: laylaConfig,

  /** Ichigo Kurosaki — Substitute Soul Reaper */
  ichigo: ichigoConfig,

  /** Mahito — Cursed Spirit of Human Hatred */
  mahito: mahitoConfig,

  /** Megumi Fushiguro — Ten Shadows Sorcerer */
  megumi: megumiConfig,

  /** John Wick — The Baba Yaga */
  john_wick: johnWickConfig,
  johnWick: johnWickConfig,

  /** Nameless Deity — Transcendent Cosmic Entity */
  namelessdeity: namelessDeityConfig,
  namelessDeity: namelessDeityConfig,

  /** Draedon — Architect of the Exo Mechs */
  draedon: draedonConfig,
};

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// FIGHTER DEFINITIONS ΓÇö static data only
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export const FIGHTER_DEFS = [
  {
    id: 1,
    name: 'Sharpshooter',
    grade: sharpshooterConfig.grade ?? DEFAULT_GRADE,
    category: sharpshooterConfig.category ?? 'Sci-Fi & Modern',
    color: sharpshooterConfig.color ?? '#ff4d4d',
    startX: 140, startY: 180,
    startVx: 1.4, startVy: 1.0,
    radius: sharpshooterConfig.radius ?? 25,
    aimbot: false,
    spinRate: 0.01,
    type: 'normal',
    hp: sharpshooterConfig.hp ?? 65,
    damage: sharpshooterConfig.damage ?? 15,
    cooldown: sharpshooterConfig.cooldown ?? 70, // 1 second at 60fps
    moveSpeed: sharpshooterConfig.moveSpeed ?? 5.0,
    projectileSpeedMultiplier: sharpshooterConfig.projectileSpeedMultiplier ?? 3.0,
    ability: sharpshooterConfig.ability ?? 'Straight Fire',
    desc: sharpshooterConfig.desc ?? 'Fires heavy projectiles straight ahead. High damage, slow reload rate.',
  },
  {
    id: 2,
    name: 'Jazz',
    grade: jazzConfig.grade ?? DEFAULT_GRADE,
    category: jazzConfig.category ?? 'Sci-Fi & Modern',
    color: jazzConfig.color ?? '#4da3ff',
    startX: 460, startY: 280,
    startVx: -1.2, startVy: -0.9,
    radius: jazzConfig.radius ?? 25,
    aimbot: true,
    type: 'aimbot',
    hp: jazzConfig.hp ?? 60,
    damage: jazzConfig.damage ?? 5,
    cooldown: jazzConfig.cooldown ?? 30,  // 1 second at 60fps
    moveSpeed: jazzConfig.moveSpeed ?? 5.0,
    ability: jazzConfig.ability ?? 'Aimbot Laser',
    desc: jazzConfig.desc ?? 'Wields a dubstep gun that fires musical notes and triggers an instant follow-up projectile on hit.',
  },
  {
    id: 3,
    name: 'Spike',
    grade: spikeConfig.grade ?? DEFAULT_GRADE,
    category: 'Fantasy & Magic',
    color: '#e5c158',
    startX: 300, startY: 240, // start center
    startVx: 1.6, startVy: -1.2,
    radius: 25,
    aimbot: false,
    spinRate: 0,
    type: 'melee',
    hp: 100,
    damage: 25,
    cooldown: 60,  // 1.5 seconds at 60fps
    moveSpeed: 5.5,
    ability: 'Spiked Shell',
    desc: 'Deals damage on collision and gain movement speed boost.',
  },
  {
    id: 4,
    name: 'Circe',
    grade: circeConfig.grade ?? DEFAULT_GRADE,
    category: circeConfig.category ?? 'Greek Mythology',
    color: circeConfig.color ?? '#4dff4d',
    startX: 220, startY: 240,
    startVx: 1.3, startVy: 1.1,
    radius: circeConfig.radius ?? 25,
    aimbot: false,
    type: 'grenadier',
    hp: circeConfig.hp ?? 75,
    damage: circeConfig.damage ?? 15,
    cooldown: circeConfig.cooldown ?? 0,
    moveSpeed: circeConfig.moveSpeed ?? 4.7,
    ability: circeConfig.ability ?? 'Poison Grenade',
    desc: circeConfig.desc ?? 'Throws a poison and deals AOE damage and poisons them.',
  },
  {
    id: 5,
    name: 'Hyperion',
    grade: hyperionConfig.grade ?? DEFAULT_GRADE,
    category: hyperionConfig.category ?? 'Greek Mythology',
    color: hyperionConfig.color ?? '#ffffff',
    startX: 300, startY: 210,
    startVx: 1.4, startVy: 1.0,
    radius: hyperionConfig.radius ?? 25,
    aimbot: false,
    spinRate: 0.03,
    type: 'laser',
    hp: hyperionConfig.hp ?? 80,
    damage: hyperionConfig.damage ?? 15,
    cooldown: hyperionConfig.cooldown ?? 300, // 3 seconds cooldown
    moveSpeed: hyperionConfig.moveSpeed ?? 4.0,
    ability: hyperionConfig.ability ?? 'Sustained Laser',
    desc: hyperionConfig.desc ?? 'Fires a continuous laser beam.',
  },
  {
    id: 6,
    name: 'Knight',
    grade: knightConfig.grade ?? DEFAULT_GRADE,
    category: 'Fantasy & Magic',
    color: '#9e9e9e',
    themeColor: '#9e9e9e',
    startX: 200, startY: 220,
    startVx: 0.7, startVy: 0.5,
    radius: 25,
    aimbot: false,
    type: 'knight',
    hp: 110,
    damage: 30,   // sword swipe damage (mirrors CONFIG.knight.swordDamage)
    cooldown: 180,  // not used directly; knight manages its own swipeCooldown
    moveSpeed: 4.8,
    ability: "Tower Shield & Broadsword",
    desc: 'Wields an HP-backed tower shield with passive DEF buff that absorbs all incoming damage until broken, leaving him vulnerable with 50% reduced DEF.',
  },
  {
    id: 7,
    name: 'Erebus',
    grade: erebusConfig.grade ?? DEFAULT_GRADE,
    category: erebusConfig.category ?? 'Greek Mythology',
    color: erebusConfig.color ?? '#6200a0',
    startX: 250, startY: 260,
    startVx: 1.0, startVy: 0.8,
    radius: erebusConfig.radius ?? 25,
    aimbot: false,
    spinRate: 0.07,
    type: 'black',
    hp: erebusConfig.hp ?? 70,
    damage: erebusConfig.damage ?? 10,
    cooldown: erebusConfig.cooldown ?? 35,
    moveSpeed: erebusConfig.moveSpeed ?? 5.0,
    projectileSpeedMultiplier: erebusConfig.projectileSpeedMultiplier ?? 1.0,
    ability: erebusConfig.ability ?? 'Black Hole',
    desc: erebusConfig.desc ?? 'Summons a black hole near the opponent, dragging them in and dealing damage over time.',
  },
  {
    id: 8,
    name: 'Shinobi',
    grade: shinobiConfig.grade ?? DEFAULT_GRADE,
    category: shinobiConfig.category ?? 'Japanese',
    color: shinobiConfig.color ?? '#2f4f4f',
    startX: 280, startY: 250,
    startVx: 1.2, startVy: -0.8,
    radius: shinobiConfig.radius ?? 25,
    aimbot: false,
    spinRate: 0.05,
    type: 'darkslategray',
    hp: shinobiConfig.hp ?? 50,
    damage: shinobiConfig.damage ?? 5,
    cooldown: shinobiConfig.cooldown ?? 25,
    moveSpeed: shinobiConfig.moveSpeed ?? 5.5,
    projectileSpeedMultiplier: shinobiConfig.projectileSpeedMultiplier ?? 1.0,
    ability: shinobiConfig.ability ?? 'Shadow Arts',
    desc: shinobiConfig.desc ?? 'Fighter with stealthy moves. Passively dodges projectiles. After 3 dodges, becomes invisible with speed boost and deals 2x backstab damage.',
  },
  {
    id: 9,
    name: 'Ember',
    grade: emberConfig.grade ?? DEFAULT_GRADE,
    category: emberConfig.category ?? 'Fantasy & Magic',
    color: emberConfig.color ?? '#ff8c00',
    startX: 300, startY: 230,
    startVx: 1.3, startVy: 1.0,
    radius: emberConfig.radius ?? 25,
    aimbot: false,
    spinRate: 0.02,
    type: 'orange',
    hp: emberConfig.hp ?? 100,
    damage: emberConfig.damage ?? 10,
    cooldown: emberConfig.cooldown ?? 30,
    moveSpeed: emberConfig.moveSpeed ?? 4.0,
    projectileSpeedMultiplier: emberConfig.projectileSpeedMultiplier ?? 1.0,
    ability: emberConfig.ability ?? 'Auto-Lock Flamethrower',
    desc: emberConfig.desc ?? 'Burns enemies with burning effect.',
  },
  {
    id: 10,
    name: 'Berserker',
    grade: berserkerConfig.grade ?? DEFAULT_GRADE,
    category: berserkerConfig.category ?? 'Fantasy & Magic',
    color: berserkerConfig.color ?? '#8b0000',
    startX: 320, startY: 260,
    startVx: 1.5, startVy: -1.0,
    radius: berserkerConfig.radius ?? 25,
    aimbot: false,
    spinRate: 0.04,
    type: 'berserker',
    hp: berserkerConfig.hp ?? 80,
    damage: berserkerConfig.damage ?? 15,
    cooldown: berserkerConfig.cooldown ?? 40,
    moveSpeed: berserkerConfig.moveSpeed ?? 5.0,
    projectileSpeedMultiplier: berserkerConfig.projectileSpeedMultiplier ?? 1.0,
    ability: berserkerConfig.ability ?? 'Rage',
    desc: berserkerConfig.desc ?? 'Gains rage when taking damage. During rage: increased damage, attack speed, movement speed, and lifesteal.',
  },
  {
    id: 11,
    name: 'Cronus',
    grade: cronusConfig.grade ?? DEFAULT_GRADE,
    category: cronusConfig.category ?? 'Greek Mythology',
    color: cronusConfig.color ?? '#07cdfa',
    startX: 300, startY: 240,
    startVx: 1.2, startVy: 0.8,
    radius: cronusConfig.radius ?? 25,
    aimbot: false,
    spinRate: 0.03,
    type: 'cronos',
    hp: cronusConfig.hp ?? 120,
    damage: cronusConfig.damage ?? 10,
    cooldown: cronusConfig.cooldown ?? 35,
    moveSpeed: cronusConfig.moveSpeed ?? 4.8,
    projectileSpeedMultiplier: cronusConfig.projectileSpeedMultiplier ?? 1.0,
    ability: cronusConfig.ability ?? 'Time Stop',
    desc: cronusConfig.desc ?? 'Deploys a time stop sphere that freezes enemies. Gain movement speed and attack speed.',
  },
  {
    id: 12,
    name: 'Bombardier',
    grade: bombardierConfig.grade ?? DEFAULT_GRADE,
    category: bombardierConfig.category ?? 'Sci-Fi & Modern',
    color: bombardierConfig.color ?? '#6A3F1E',
    skinColor: bombardierConfig.skinColor ?? '#5A3B1A',
    skinAccentColor: bombardierConfig.skinAccentColor ?? '#E0B05B',
    startX: 280, startY: 260,
    startVx: 1.3, startVy: -0.9,
    radius: bombardierConfig.radius ?? 25,
    aimbot: false,
    spinRate: 0.04,
    type: 'bomber',
    hp: bombardierConfig.hp ?? 85,
    damage: bombardierConfig.damage ?? 12,
    cooldown: bombardierConfig.cooldown ?? 45,
    moveSpeed: bombardierConfig.moveSpeed ?? 4.5,
    projectileSpeedMultiplier: bombardierConfig.projectileSpeedMultiplier ?? 1.0,
    ability: bombardierConfig.ability ?? 'Explosive Expert',
    desc: bombardierConfig.desc ?? 'Throws grenades that explode on impact dealing AOE damag. Leaves a powerful C4 bomb on death.',
  },
  {
    id: 13,
    name: 'Alucard',
    grade: gunslingerConfig.grade ?? DEFAULT_GRADE,
    category: gunslingerConfig.category || 'Anime & Supernatural',
    color: gunslingerConfig.color || '#8B0000',
    startX: gunslingerConfig.startX || 260,
    startY: gunslingerConfig.startY || 250,
    startVx: gunslingerConfig.startVx || 1.4,
    startVy: gunslingerConfig.startVy || -0.8,
    radius: gunslingerConfig.radius || gunslingerConfig.r || 25,
    aimbot: false,
    spinRate: gunslingerConfig.spinRate || 0.03,
    type: 'gunslinger',
    hp: gunslingerConfig.hp || 85,
    damage: gunslingerConfig.damage || 7,
    cooldown: gunslingerConfig.cooldown || 20,
    moveSpeed: gunslingerConfig.moveSpeed || 5.2,
    projectileSpeedMultiplier: gunslingerConfig.projectileSpeedMultiplier || 1.0,
    ability: gunslingerConfig.ability || 'Casull & Jackal',
    desc: gunslingerConfig.desc || 'Wields the holy .454 Casull & 13mm Jackal with explosive armor-piercing rounds, vampiric blood lifesteal, and Control Art Restriction Level 1 shadow release.',
  },
  {
    id: 14,
    name: 'Doppelganger',
    grade: doppelgangerConfig.grade ?? DEFAULT_GRADE,
    category: doppelgangerConfig.category ?? 'Fantasy & Magic',
    color: doppelgangerConfig.color ?? '#9b59b6',
    startX: 300, startY: 240,
    startVx: 1.3, startVy: -1.0,
    radius: doppelgangerConfig.radius ?? 25,
    aimbot: false,
    spinRate: 0,
    type: 'doppleganger',
    hp: doppelgangerConfig.hp ?? 100,
    damage: doppelgangerConfig.damage ?? 15,
    cooldown: doppelgangerConfig.cooldown ?? 45,
    moveSpeed: doppelgangerConfig.moveSpeed ?? 5.5,
    projectileSpeedMultiplier: doppelgangerConfig.projectileSpeedMultiplier ?? 1.0,
    ability: doppelgangerConfig.ability ?? 'Mirror Image',
    desc: doppelgangerConfig.desc ?? 'Summons illusions of itself every 25% health lost.',
  },
  {
    id: 15,
    name: 'Engineer',
    grade: engineerConfig.grade ?? DEFAULT_GRADE,
    category: 'Sci-Fi & Modern',
    color: engineerConfig.color || '#b8860b',
    startX: engineerConfig.startX || 280,
    startY: engineerConfig.startY || 220,
    startVx: engineerConfig.startVx || 1.1,
    startVy: engineerConfig.startVy || 0.9,
    radius: engineerConfig.radius || engineerConfig.r || 25,
    aimbot: false,
    spinRate: engineerConfig.spinRate || 0.02,
    type: 'Engineer',
    hp: engineerConfig.hp || 100,
    damage: engineerConfig.damage || 5,
    cooldown: engineerConfig.cooldown || 4,
    moveSpeed: engineerConfig.moveSpeed || engineerConfig.speed || 4.4,
    ability: engineerConfig.ability || 'Sentry & Dispenser',
    desc: engineerConfig.desc || 'Constructs an automated Sentry Turret to assault foes and a Dispenser to tether healing and boost reload speed.',
  },
  {
    id: 16,
    name: 'Ruby',
    grade: rubyConfig.grade ?? DEFAULT_GRADE,
    category: rubyConfig.category ?? 'Fantasy & Magic',
    color: rubyConfig.color ?? '#E0115F',
    startX: 310, startY: 250,
    startVx: 1.4, startVy: 0.9,
    radius: rubyConfig.radius ?? 25,
    aimbot: false,
    spinRate: 0.05,
    type: 'ruby',
    hp: rubyConfig.hp ?? 90,
    damage: rubyConfig.damage ?? 12,
    cooldown: rubyConfig.cooldown ?? 40,
    moveSpeed: rubyConfig.moveSpeed ?? 4.8,
    projectileSpeedMultiplier: rubyConfig.projectileSpeedMultiplier ?? 1.0,
    ability: rubyConfig.ability ?? 'Scythe Dance',
    desc: rubyConfig.desc ?? 'Casting abilities triggers a short dash. Swings and pulls scythe to lifesteal.',
  },
  {
    id: 17,
    name: 'Musashi',
    grade: musashiConfig.grade ?? DEFAULT_GRADE,
    category: musashiConfig.category ?? 'Japanese',
    color: musashiConfig.color ?? '#34495e',
    startX: 290, startY: 240,
    startVx: 1.2, startVy: -1.0,
    radius: musashiConfig.radius ?? 25,
    aimbot: false,
    spinRate: 0.03,
    type: 'musashi',
    hp: musashiConfig.hp ?? 100,
    damage: musashiConfig.damage ?? 10, // (Katana + Wakizashi)
    cooldown: musashiConfig.cooldown ?? 45,
    moveSpeed: musashiConfig.moveSpeed ?? 4.8,
    projectileSpeedMultiplier: musashiConfig.projectileSpeedMultiplier ?? 1.0,
    ability: musashiConfig.ability ?? 'Dual Stances',
    desc: musashiConfig.desc ?? 'Switches between five stances (Earth, Water, Fire, Wind, Void) giving passive effects and unique skills.',
  },
  {
    id: 18,
    name: 'Rubbick',
    grade: rubbickConfig.grade ?? DEFAULT_GRADE,
    category: 'Fantasy & Magic',
    color: rubbickConfig.color || '#03e631ff',
    startX: rubbickConfig.startX || 310,
    startY: rubbickConfig.startY || 230,
    startVx: rubbickConfig.startVx || -1.2,
    startVy: rubbickConfig.startVy || 1.0,
    radius: rubbickConfig.radius || rubbickConfig.r || 25,
    aimbot: false,
    spinRate: rubbickConfig.spinRate || 0.02,
    type: 'rubbick',
    hp: rubbickConfig.hp || 85,
    damage: rubbickConfig.damage || 12,
    cooldown: rubbickConfig.cooldown || 100,
    moveSpeed: rubbickConfig.moveSpeed || rubbickConfig.speed || 8.2,
    projectileSpeedMultiplier: rubbickConfig.projectileSpeedMultiplier || 1.0,
    ability: rubbickConfig.ability || 'Spell Steal',
    desc: rubbickConfig.desc || 'Fires bouncing arcane bolts. Telekinetically lifts and stuns enemies. Ultimate steals the last used enemy skill.',
  },
  {
    id: 19,
    name: 'Zeus',
    grade: zeusConfig.grade ?? DEFAULT_GRADE,
    category: 'Greek Mythology',
    color: zeusConfig.color || '#00BFFF',
    startX: zeusConfig.startX || 300,
    startY: zeusConfig.startY || 250,
    startVx: zeusConfig.startVx || 1.1,
    startVy: zeusConfig.startVy || 0.9,
    radius: zeusConfig.radius || 25,
    aimbot: true,
    spinRate: 0,
    type: 'zeus',
    hp: zeusConfig.hp || 200,
    damage: zeusConfig.lightningDamage ?? zeusConfig.damage ?? 20,
    cooldown: zeusConfig.attackCooldown ?? zeusConfig.cooldown ?? 120,
    moveSpeed: zeusConfig.moveSpeed || 5.2,
    projectileSpeedMultiplier: zeusConfig.projectileSpeedMultiplier || 1.0,
    ability: zeusConfig.ability || 'Storm Bringer',
    desc: zeusConfig.desc || 'Throws chain lightning. Passively shocks melee attackers. Ultimate summons a map-wide thunderstorm.',
  },
  {
    id: 20,
    name: 'Hydra',
    grade: hydraConfig.grade ?? DEFAULT_GRADE,
    category: hydraConfig.category ?? 'Fantasy & Magic',
    color: hydraConfig.color ?? '#4B0082', // Dark Purple
    startX: 300, startY: 250,
    startVx: 0.8, startVy: 0.7,
    radius: hydraConfig.radius ?? 25, // Standard size
    aimbot: false,
    spinRate: 0,
    type: 'hydra',
    hp: hydraConfig.hp ?? 1000, // 5x health
    damage: hydraConfig.damage ?? 8, // Very low base damage. When stealing a weapon, uses the copied fighter's exact damage value.
    cooldown: hydraConfig.cooldown ?? 0, // Doesn't fire normally
    moveSpeed: hydraConfig.moveSpeed ?? 8.5, // Slow
    projectileSpeedMultiplier: hydraConfig.projectileSpeedMultiplier ?? 1.0,
    ability: hydraConfig.ability ?? 'The Overdrive',
    desc: hydraConfig.desc ?? 'Extremely tanky. Steals physical weapons upon being hit (copying their exact damage). Passively destroys incoming projectiles. Ultimate grants CC immunity.',
  },
  {
    id: 21,
    name: 'GOJO',
    grade: gojoConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: gojoConfig.color || '#E0FFFF', // Light Cyan
    startX: gojoConfig.startX || 300,
    startY: gojoConfig.startY || 250,
    startVx: gojoConfig.startVx || 1.1,
    startVy: gojoConfig.startVy || 0.9,
    radius: gojoConfig.radius || gojoConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'gojo',
    hp: gojoConfig.hp || 200,
    damage: gojoConfig.damage || 12,
    cooldown: gojoConfig.cooldown || 80,
    moveSpeed: gojoConfig.moveSpeed || gojoConfig.speed || 5.5,
    projectileSpeedMultiplier: gojoConfig.projectileSpeedMultiplier || 6.0,
    ability: gojoConfig.ability || 'Limitless',
    desc: gojoConfig.desc || 'Uses Blue to pull and Reversal Red to repel. Hollow Purple pierces everything, and Unlimited Void stuns all enemies.',
  },
  {
    id: 22,
    name: 'SUKUNA',
    grade: sukunaConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: sukunaConfig.color || '#8B0000', // Dark Crimson
    startX: sukunaConfig.startX || 300,
    startY: sukunaConfig.startY || 250,
    startVx: sukunaConfig.startVx || 1.2,
    startVy: sukunaConfig.startVy || 1.0,
    radius: sukunaConfig.radius || sukunaConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'sukuna',
    hp: sukunaConfig.hp || 200,
    damage: sukunaConfig.damage || 15,
    cooldown: sukunaConfig.cooldown || 80,
    moveSpeed: sukunaConfig.moveSpeed || sukunaConfig.speed || 5.8,
    projectileSpeedMultiplier: sukunaConfig.projectileSpeedMultiplier || 3.0,
    ability: sukunaConfig.ability || 'King of Curses',
    desc: sukunaConfig.desc || 'Deploys Malevolent Shrine domain deals unblockable damage.',
  },
  {
    id: 23,
    name: 'YUTA',
    grade: yutaConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: yutaConfig.color || '#EEEEEE', // Soft Silver / White
    themeColor: yutaConfig.themeColor || '#FF1493', // Cursed Pink theme
    startX: yutaConfig.startX || 400,
    startY: yutaConfig.startY || 250,
    startVx: yutaConfig.startVx || 1.2,
    startVy: yutaConfig.startVy || 1.0,
    radius: yutaConfig.radius || yutaConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'yuta',
    hp: yutaConfig.hp || 200,
    damage: yutaConfig.damage || 15,
    cooldown: yutaConfig.cooldown || 50,
    moveSpeed: yutaConfig.moveSpeed || yutaConfig.speed || 5.8,
    projectileSpeedMultiplier: yutaConfig.projectileSpeedMultiplier || 3.0,
    ability: yutaConfig.ability || 'Copy & Rika',
    desc: yutaConfig.desc || 'Summons Rika to assist Yuta in fight and uses Authentic Mutual Love domain.',
  },
  {
    id: 99,
    name:'TOJI',
    grade: tojiConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: tojiConfig.color || '#281438', // Dark Shadow Purple
    startX: tojiConfig.startX || 350,
    startY: tojiConfig.startY || 250,
    startVx: tojiConfig.startVx || 1.5,
    startVy: tojiConfig.startVy || 1.5,
    radius: tojiConfig.radius || tojiConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'toji',
    hp: tojiConfig.hp || 120,
    damage: tojiConfig.damage || 15,
    cooldown: tojiConfig.cooldown || 40,
    moveSpeed: tojiConfig.moveSpeed || tojiConfig.speed || 9.0,
    projectileSpeedMultiplier: tojiConfig.projectileSpeedMultiplier || 1.0,
    ability: tojiConfig.ability || 'Heavenly Restriction',
    desc: tojiConfig.desc || 'Zero Cursed Energy. Immune to Domains. Silences enemies with the Inverted Spear of Heaven.',
  },
  {
    id: 24,
    name: 'TODO',
    grade: todoConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: todoConfig.color || '#D2691E', // Chocolate / Brown
    startX: todoConfig.startX || 300,
    startY: todoConfig.startY || 250,
    startVx: todoConfig.startVx || 1.2,
    startVy: todoConfig.startVy || 1.0,
    radius: todoConfig.radius || todoConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'todo',
    hp: todoConfig.hp || 220,
    damage: todoConfig.damage || 12,
    cooldown: todoConfig.cooldown || 60,
    moveSpeed: todoConfig.moveSpeed || todoConfig.speed || 6.5,
    projectileSpeedMultiplier: todoConfig.projectileSpeedMultiplier || 1.0,
    ability: todoConfig.ability || 'Boogie Woogie',
    desc: todoConfig.desc || 'Claps hands to swap positions with enemies or cursed rocks. Focuses on disorienting opponents.',
  },
  {
    id: 25,
    name: 'YUJI',
    grade: yujiConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: yujiConfig.color || '#D95C7E', // Deep pink JJK uniform
    startX: yujiConfig.startX || 300,
    startY: yujiConfig.startY || 250,
    startVx: yujiConfig.startVx || 1.2,
    startVy: yujiConfig.startVy || 1.0,
    radius: yujiConfig.radius || yujiConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'yuji',
    hp: yujiConfig.hp || 230,
    damage: yujiConfig.damage || 18,
    cooldown: yujiConfig.cooldown || 18,
    moveSpeed: yujiConfig.moveSpeed || yujiConfig.speed || 7.0,
    projectileSpeedMultiplier: yujiConfig.projectileSpeedMultiplier || 1.0,
    ability: yujiConfig.ability || 'Black Flash',
    desc: yujiConfig.desc || 'Attacks with black flash.',
  },
  {
    id: 26,
    name: 'Layla',
    grade: laylaConfig.grade ?? DEFAULT_GRADE,
    category: 'Sci-Fi & Modern',
    color: laylaConfig.color || '#00E5FF', // Blue Cosmic Theme
    startX: laylaConfig.startX || 300,
    startY: laylaConfig.startY || 250,
    startVx: laylaConfig.startVx || 1.1,
    startVy: laylaConfig.startVy || 0.9,
    radius: laylaConfig.radius || laylaConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'layla',
    hp: laylaConfig.hp || 55,
    damage: laylaConfig.damage || 12,
    cooldown: laylaConfig.cooldown || 70,
    moveSpeed: laylaConfig.moveSpeed || laylaConfig.speed || 4.5,
    projectileSpeedMultiplier: laylaConfig.projectileSpeedMultiplier || 3.0,
    ability: laylaConfig.ability || 'Ascending Power',
    desc: laylaConfig.desc || 'Scaling marksman who gains damage and range with each hit. Uses Malefic Bomb, Void Dash, and Destruction Barrage ultimate.',
  },
  {
    id: 27,
    name: 'SAITAMA',
    grade: saitamaConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: saitamaConfig.color || '#F5C400', // Bright Safety Yellow
    startX: saitamaConfig.startX || 300,
    startY: saitamaConfig.startY || 250,
    startVx: saitamaConfig.startVx || 1.2,
    startVy: saitamaConfig.startVy || 1.0,
    radius: saitamaConfig.radius || saitamaConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'saitama',
    hp: saitamaConfig.hp || 420,
    damage: saitamaConfig.damage || 100,
    cooldown: saitamaConfig.cooldown || 200,
    moveSpeed: saitamaConfig.moveSpeed || saitamaConfig.speed || 6.0,
    projectileSpeedMultiplier: saitamaConfig.projectileSpeedMultiplier || 1.0,
    ability: saitamaConfig.ability || 'One Punch',
    desc: saitamaConfig.desc || 'Hero for fun. Ignores basic hit flinches. Basic hits deal massive damage. Serious Punch ultimate obliterates anything across the arena.',
  },
  {
    id: 28,
    name: 'GENOS',
    grade: genosConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: genosConfig.color || '#FF5500', // Incineration Orange
    startX: genosConfig.startX || 300,
    startY: genosConfig.startY || 250,
    startVx: genosConfig.startVx || 1.2,
    startVy: genosConfig.startVy || 1.0,
    radius: genosConfig.radius || genosConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'genos',
    hp: genosConfig.hp || 320,
    damage: genosConfig.damage || 14,
    cooldown: genosConfig.cooldown || 27,
    moveSpeed: genosConfig.moveSpeed || genosConfig.speed || 5.2,
    projectileSpeedMultiplier: genosConfig.projectileSpeedMultiplier || 1.4,
    ability: genosConfig.ability || 'Incinerate',
    desc: genosConfig.desc || 'Demon Cyborg. Zones with explosive basic blasts, Rocket Stomps to close in, and uses a devastating continuous fire beam. Explodes upon defeat.',
  },
  {
    id: 29,
    name: 'ICHIGO',
    grade: ichigoConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: ichigoConfig.color || '#FF5500', // Orange details
    startX: ichigoConfig.startX || 300,
    startY: ichigoConfig.startY || 250,
    startVx: ichigoConfig.startVx || 1.2,
    startVy: ichigoConfig.startVy || 1.0,
    radius: ichigoConfig.radius || ichigoConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'ichigo',
    hp: ichigoConfig.hp || 240,
    damage: ichigoConfig.damage || 16,
    cooldown: ichigoConfig.cooldown || 30,
    moveSpeed: ichigoConfig.moveSpeed || ichigoConfig.speed || 7.0,
    projectileSpeedMultiplier: ichigoConfig.projectileSpeedMultiplier || 1.0,
    ability: ichigoConfig.ability || 'Hollow Mask',
    desc: ichigoConfig.desc || 'Wields Zangetsu with fast frontal-arc sword slashes. Awakes Hollow Mask under 30% HP for stats boost. Ultimate unleashes Bankai: Tensa Zangetsu.',
  },
  {
    id: 30,
    name: 'MAHITO',
    grade: mahitoConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: mahitoConfig.color || '#C026D3', // Vivid Magenta-Violet / Cursed Energy
    startX: mahitoConfig.startX || 300,
    startY: mahitoConfig.startY || 250,
    startVx: mahitoConfig.startVx || 1.2,
    startVy: mahitoConfig.startVy || 1.0,
    radius: mahitoConfig.radius || mahitoConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'mahito',
    hp: mahitoConfig.hp || 230,
    damage: mahitoConfig.damage || 16,
    cooldown: mahitoConfig.cooldown || 22,
    moveSpeed: mahitoConfig.moveSpeed || mahitoConfig.speed || 5.8,
    projectileSpeedMultiplier: mahitoConfig.projectileSpeedMultiplier || 1.0,
    ability: mahitoConfig.ability || 'Soul Scalpel Claws',
    desc: mahitoConfig.desc || 'Wields 4 curved scythe-talon claws. Passive: Phantom Soul Slip phases directly through enemies with a high-speed claw cross-slice. Secondary skill unleashes Subterranean Flesh Surge; transforms into Distorted Killing form.',
  },
  {
    id: 31,
    name: 'NANAMI',
    grade: nanamiConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: nanamiConfig.color || '#D4AF37', // Refined Golden Sand / Warm Ochre
    startX: nanamiConfig.startX || 300,
    startY: nanamiConfig.startY || 250,
    startVx: nanamiConfig.startVx || 1.1,
    startVy: nanamiConfig.startVy || 1.0,
    radius: nanamiConfig.radius || nanamiConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'nanami',
    hp: nanamiConfig.hp || 420,
    damage: nanamiConfig.damage || 22,
    cooldown: nanamiConfig.cooldown || 55,
    moveSpeed: nanamiConfig.moveSpeed || nanamiConfig.speed || 5.5,
    projectileSpeedMultiplier: nanamiConfig.projectileSpeedMultiplier || 1.0,
    ability: nanamiConfig.ability || 'Ratio Technique (7:3)',
    desc: nanamiConfig.desc || 'Wields a cloth-wrapped blunt cleaver. Passive: 7:3 Ratio Technique deals guaranteed True Damage critical strikes and fractures enemy defense. Enters Overtime under 40% HP or after 25s for a 120% cursed energy surge.',
  },
  {
    id: 32,
    name: 'NOBARA',
    grade: nobaraConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: nobaraConfig.color || '#D94E68', // Deep Rose Crimson
    startX: nobaraConfig.startX || 300,
    startY: nobaraConfig.startY || 250,
    startVx: nobaraConfig.startVx || 1.1,
    startVy: nobaraConfig.startVy || 1.0,
    radius: nobaraConfig.radius || nobaraConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'nobara',
    hp: nobaraConfig.hp || 400,
    damage: nobaraConfig.damage || 24,
    cooldown: nobaraConfig.cooldown || 42,
    moveSpeed: nobaraConfig.moveSpeed || nobaraConfig.speed || 5.4,
    projectileSpeedMultiplier: nobaraConfig.projectileSpeedMultiplier || 1.0,
    ability: nobaraConfig.ability || 'Straw Doll Technique',
    desc: nobaraConfig.desc || 'Wields a steel claw hammer and cursed nails. Embeds nails in enemies and environment. Passive: Unflinching Ecstasy surges under 50% HP. Skill 1: Hairpin detonates all active nails. Skill 2: Resonance pierces soul across any distance.',
  },
  {
    id: 33,
    name: 'John Wick',
    grade: johnWickConfig.grade ?? DEFAULT_GRADE,
    category: 'Pop Culture & Action',
    color: johnWickConfig.color || '#2b2d31', // Tactical Charcoal Gunmetal
    startX: johnWickConfig.startX || 300,
    startY: johnWickConfig.startY || 250,
    startVx: johnWickConfig.startVx || 1.2,
    startVy: johnWickConfig.startVy || 1.0,
    radius: johnWickConfig.radius || johnWickConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'john_wick',
    hp: johnWickConfig.hp || 220,
    damage: johnWickConfig.damage || 6,
    cooldown: johnWickConfig.cooldown || 26,
    moveSpeed: johnWickConfig.moveSpeed || johnWickConfig.speed || 5.6,
    projectileSpeedMultiplier: johnWickConfig.projectileSpeedMultiplier || 6.2,
    ability: johnWickConfig.ability || 'C.A.R. Gun-Fu & The Pencil',
    desc: johnWickConfig.desc || 'The Baba Yaga. Master of Center Axis Relock Gun-Fu and ruthless CQC. Passive: Ballistic Tailored Suit resists ranged damage. Wields the custom TTI Pit Viper 9mm and the infamous No. 2 Pencil for armor-piercing assassination takedowns.',
  },
  {
    id: 34,
    name: 'CJ',
    grade: cjConfig.grade ?? DEFAULT_GRADE,
    category: 'Pop Culture & Action',
    color: cjConfig.color || '#16A34A', // Grove Street Families Green
    startX: cjConfig.startX || 300,
    startY: cjConfig.startY || 250,
    startVx: cjConfig.startVx || 1.2,
    startVy: cjConfig.startVy || 1.0,
    radius: cjConfig.radius || cjConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'cj',
    hp: cjConfig.hp || 440,
    damage: cjConfig.damage || 24,
    cooldown: cjConfig.cooldown || 18,
    moveSpeed: cjConfig.moveSpeed || cjConfig.speed || 5.5,
    projectileSpeedMultiplier: cjConfig.projectileSpeedMultiplier || 1.0,
    ability: cjConfig.ability || 'Brass Knuckles & Cheats',
    desc: cjConfig.desc || 'Carl Johnson from Grove Street. Master of cheats and street brawling. Wields metallic brass knuckles, HESOYAM armor bursts, Area 69 Jetpack flight, Grove Street drive-by backup, and BAGUVIX God Mode.',
  },
  {
    id: 35,
    name: 'MEGUMI',
    grade: megumiConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: megumiConfig.color || '#1C2D4A', // Midnight Navy
    startX: megumiConfig.startX || 300,
    startY: megumiConfig.startY || 250,
    startVx: megumiConfig.startVx || 1.1,
    startVy: megumiConfig.startVy || 1.0,
    radius: megumiConfig.radius || megumiConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'megumi',
    hp: megumiConfig.hp || 380,
    damage: megumiConfig.damage || 16,
    cooldown: megumiConfig.cooldown || 40,
    moveSpeed: megumiConfig.moveSpeed || megumiConfig.speed || 5.8,
    projectileSpeedMultiplier: megumiConfig.projectileSpeedMultiplier || 1.0,
    ability: megumiConfig.ability || 'Ten Shadows Technique',
    desc: megumiConfig.desc || 'Wields the Ten Shadows Technique. Uses liquid shadow submersion, Divine Dog: Totality, Nue lightning, and Chimera Shadow Garden. Invokes untamed Mahoraga when in critical danger.',
  },
  {
    id: 36,
    name: 'ISHIDA',
    grade: uryuConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: uryuConfig.color || '#00E5FF', // Quincy Radiant Cyan
    startX: uryuConfig.startX || 300,
    startY: uryuConfig.startY || 250,
    startVx: uryuConfig.startVx || 1.2,
    startVy: uryuConfig.startVy || 1.0,
    radius: uryuConfig.radius || uryuConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'uryu',
    hp: uryuConfig.hp || 230,
    damage: uryuConfig.damage || 18,
    cooldown: uryuConfig.cooldown || 28,
    moveSpeed: uryuConfig.moveSpeed || uryuConfig.speed || 6.2,
    projectileSpeedMultiplier: uryuConfig.projectileSpeedMultiplier || 1.0,
    ability: uryuConfig.ability || 'The Antithesis',
    desc: uryuConfig.desc || 'The Last Quincy. Attacks from long range with Heilig Bogen spirit arrows, glides with Hirenkyaku, traps enemies with Sprenger, and reverses damage with Schrift "A": The Antithesis.',
  },
  {
    id: 37,
    name: 'ULQUIORRA',
    grade: ulquiorraConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: ulquiorraConfig.color || '#00FF88', // Emerald Green Reiatsu
    themeColor: ulquiorraConfig.themeColor || '#00FF88',
    startX: ulquiorraConfig.startX || 300,
    startY: ulquiorraConfig.startY || 250,
    startVx: ulquiorraConfig.startVx || 1.2,
    startVy: ulquiorraConfig.startVy || 1.0,
    radius: ulquiorraConfig.radius || ulquiorraConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'ulquiorra',
    hp: ulquiorraConfig.hp || 240,
    damage: ulquiorraConfig.damage || 20,
    cooldown: ulquiorraConfig.cooldown || 26,
    moveSpeed: ulquiorraConfig.moveSpeed || ulquiorraConfig.speed || 6.4,
    projectileSpeedMultiplier: ulquiorraConfig.projectileSpeedMultiplier || 1.0,
    ability: ulquiorraConfig.ability || 'Resurrección: Segunda Etapa',
    desc: ulquiorraConfig.desc || 'The 4th Espada. Possesses High-Speed Regeneration, Hierro defense, instantaneous Sonído vanishes, emerald Cero/Cero Oscuras beams, and evolves into Segunda Etapa with Lanza del Relámpago.',
  },
  {
    id: 38,
    name: 'MAKIMA',
    grade: makimaConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: makimaConfig.color || '#A31D24', // Velvet Blood Crimson
    themeColor: makimaConfig.themeColor || '#A31D24',
    secondaryColor: makimaConfig.secondaryColor || '#F59E0B',
    startX: makimaConfig.startX || 300,
    startY: makimaConfig.startY || 250,
    startVx: makimaConfig.startVx || 1.1,
    startVy: makimaConfig.startVy || 1.0,
    radius: makimaConfig.radius || makimaConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'makima',
    hp: makimaConfig.hp || 360,
    damage: makimaConfig.damage || 32,
    cooldown: makimaConfig.cooldown || 44,
    moveSpeed: makimaConfig.moveSpeed || makimaConfig.speed || 5.5,
    projectileSpeedMultiplier: makimaConfig.projectileSpeedMultiplier || 1.0,
    ability: makimaConfig.ability || 'Control Devil & "Bang!"',
    desc: makimaConfig.desc || 'The Control Devil. Commands absolute psychological authority. Passive: Prime Minister Accord redirects fatal blows to 5 Citizen Lives. Primary: "Bang!" supersonic kinetic hitscan shockwave with wall-bounce crush damage. Skill 1: Chains of Domination. Skill 2: Angel 1000-Year Spear. Ultimate: Kyoto Shrine Gravitational Splatter.',
  },
  {
    id: 39,
    name: 'REZE',
    grade: rezeConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: rezeConfig.color || '#430363ff',
    themeColor: rezeConfig.themeColor || '#430363ff',
    secondaryColor: rezeConfig.secondaryColor || '#FFE600',
    startX: rezeConfig.startX || 300,
    startY: rezeConfig.startY || 250,
    startVx: rezeConfig.startVx || 1.1,
    startVy: rezeConfig.startVy || 1.0,
    radius: rezeConfig.radius || rezeConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'reze',
    hp: rezeConfig.hp || 340,
    damage: rezeConfig.damage || 22,
    cooldown: rezeConfig.cooldown || 28,
    moveSpeed: rezeConfig.moveSpeed || rezeConfig.speed || 5.8,
    projectileSpeedMultiplier: rezeConfig.projectileSpeedMultiplier || 1.0,
    ability: rezeConfig.ability || 'Bomb Devil & "Megaton Tsar Nuke"',
    desc: rezeConfig.desc || 'The Bomb Devil Hybrid. High-speed explosive brawler and Soviet assassin. Pulls collar pin to trigger an explosive revive and Bomb Devil transformation. Attacks with 120° blast punches, Spark Flechette projectile spreads, Decoy Bombs, Rocket Lunges, and the apocalyptic Megaton Tsar Nuke.',
  },
  {
    id: 40,
    name: 'DENJI',
    grade: denjiConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: denjiConfig.color || '#EAB308', // Chainsaw Amber Gold
    themeColor: denjiConfig.themeColor || '#EAB308',
    secondaryColor: denjiConfig.secondaryColor || '#DC2626',
    startX: denjiConfig.startX || 300,
    startY: denjiConfig.startY || 250,
    startVx: denjiConfig.startVx || 1.1,
    startVy: denjiConfig.startVy || 1.0,
    radius: denjiConfig.radius || denjiConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'denji',
    hp: denjiConfig.hp || 360,
    damage: denjiConfig.damage || 24,
    cooldown: denjiConfig.cooldown || 24,
    moveSpeed: denjiConfig.moveSpeed || denjiConfig.speed || 5.8,
    projectileSpeedMultiplier: denjiConfig.projectileSpeedMultiplier || 1.0,
    ability: denjiConfig.ability || 'Chainsaw Devil & "Massacre Engine"',
    desc: denjiConfig.desc || 'The Chainsaw Devil. Relentless high-speed berserker entering the arena already fully transformed into his Chainsaw Devil form. Wields 140° Twin Forearm Chainsaw Shreds with 25% lifesteal, Engine Rev Lunges, Extended Chain Cleaves, Pochita Heart Revive, and the Massacre Engine ultimate.',
  },
  {
    id: 41,
    name: 'POWER',
    grade: powerConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: powerConfig.color || '#EF4444', // Crimson Blood Red
    themeColor: powerConfig.themeColor || '#EF4444',
    secondaryColor: powerConfig.secondaryColor || '#FDE047',
    startX: powerConfig.startX || 300,
    startY: powerConfig.startY || 250,
    startVx: powerConfig.startVx || 1.1,
    startVy: powerConfig.startVy || 1.0,
    radius: powerConfig.radius || powerConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'power',
    hp: powerConfig.hp || 330,
    damage: powerConfig.damage || 26,
    cooldown: powerConfig.cooldown || 30,
    moveSpeed: powerConfig.moveSpeed || powerConfig.speed || 5.9,
    projectileSpeedMultiplier: powerConfig.projectileSpeedMultiplier || 1.0,
    ability: powerConfig.ability || 'Blood Fiend & "Blood Rain Cataclysm"',
    desc: powerConfig.desc || 'The Blood Fiend. Chaotic blood manipulation tactician. Generates and absorbs Blood Orbs to empower her blood arsenal. Wields 140° Gigantic Blood Hammer smashes with shockwave stuns, 360° Blood Scythe whirlwinds, Thousand Blood Daggers homing barrages, and the Blood Rain Cataclysm ultimate.',
  },
  {
    id: 42,
    name: 'TANJIRO',
    grade: tanjiroConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: tanjiroConfig.color || '#10B981',
    themeColor: tanjiroConfig.themeColor || '#10B981',
    secondaryColor: tanjiroConfig.secondaryColor || '#EF4444',
    startX: tanjiroConfig.startX || 300,
    startY: tanjiroConfig.startY || 250,
    startVx: tanjiroConfig.startVx || 1.1,
    startVy: tanjiroConfig.startVy || 1.0,
    radius: tanjiroConfig.radius || tanjiroConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'tanjiro',
    hp: tanjiroConfig.hp || 340,
    damage: tanjiroConfig.damage || 22,
    cooldown: tanjiroConfig.cooldown || 28,
    moveSpeed: tanjiroConfig.moveSpeed || tanjiroConfig.speed || 5.8,
    projectileSpeedMultiplier: tanjiroConfig.projectileSpeedMultiplier || 1.0,
    ability: tanjiroConfig.ability || 'Water & Sun Breathing ("Hinokami Kagura")',
    desc: tanjiroConfig.desc || 'Demon Slayer wielding Water Breathing & Hinokami Kagura. Senses the Opening Thread. Wields 140° Water Surface slashes, Constant Flux dragon lunges, Clear Blue Sky projectile deflections, and Dragon Sun Halo Head Dance ultimate.',
  },
  {
    id: 43,
    name: 'NEZUKO',
    grade: nezukoConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: nezukoConfig.color || '#EC4899',
    themeColor: nezukoConfig.themeColor || '#EC4899',
    secondaryColor: nezukoConfig.secondaryColor || '#E11D48',
    startX: nezukoConfig.startX || 300,
    startY: nezukoConfig.startY || 250,
    startVx: nezukoConfig.startVx || 1.1,
    startVy: nezukoConfig.startVy || 1.0,
    radius: nezukoConfig.radius || nezukoConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'nezuko',
    hp: nezukoConfig.hp || 370,
    damage: nezukoConfig.damage || 24,
    cooldown: nezukoConfig.cooldown || 26,
    moveSpeed: nezukoConfig.moveSpeed || nezukoConfig.speed || 6.0,
    projectileSpeedMultiplier: nezukoConfig.projectileSpeedMultiplier || 1.0,
    ability: nezukoConfig.ability || 'Awakened Demon & "Exploding Blood" (Bakketsu)',
    desc: nezukoConfig.desc || 'Awakened Demon brawler with superhuman physical strength and Exploding Blood pyrokinesis. Wields 120° Demonic Axe Kicks, supersonic Flying Dropkicks, Exploding Blood detonations, and Full Demon Awakening ultimate.',
  },
  {
    id: 44,
    name: 'ZENITSU',
    grade: zenitsuConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: zenitsuConfig.color || '#F59E0B',
    themeColor: zenitsuConfig.themeColor || '#F59E0B',
    secondaryColor: zenitsuConfig.secondaryColor || '#FBBF24',
    startX: zenitsuConfig.startX || 300,
    startY: zenitsuConfig.startY || 250,
    startVx: zenitsuConfig.startVx || 1.1,
    startVy: zenitsuConfig.startVy || 1.0,
    radius: zenitsuConfig.radius || zenitsuConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'zenitsu',
    hp: zenitsuConfig.hp || 310,
    damage: zenitsuConfig.damage || 26,
    cooldown: zenitsuConfig.cooldown || 24,
    moveSpeed: zenitsuConfig.moveSpeed || zenitsuConfig.speed || 6.4,
    projectileSpeedMultiplier: zenitsuConfig.projectileSpeedMultiplier || 1.0,
    ability: zenitsuConfig.ability || 'Thunder Breathing ("Thunderclap and Flash")',
    desc: zenitsuConfig.desc || 'Thunder Breathing godspeed iai swordsman. Awakens Battle Trance during crises. Wields 140° Thunder Iai quickdraw slashes, First Form: Thunderclap and Flash teleport slashes, Sixfold wall-ricochet flurries, and Flaming Thunder God dragon ultimate.',
  },
  {
    id: 45,
    name: 'INOSUKE',
    grade: inosukeConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: inosukeConfig.color || '#3B82F6',
    themeColor: inosukeConfig.themeColor || '#3B82F6',
    secondaryColor: inosukeConfig.secondaryColor || '#6B7280',
    startX: inosukeConfig.startX || 300,
    startY: inosukeConfig.startY || 250,
    startVx: inosukeConfig.startVx || 1.1,
    startVy: inosukeConfig.startVy || 1.0,
    radius: inosukeConfig.radius || inosukeConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'inosuke',
    hp: inosukeConfig.hp || 350,
    damage: inosukeConfig.damage || 25,
    cooldown: inosukeConfig.cooldown || 25,
    moveSpeed: inosukeConfig.moveSpeed || inosukeConfig.speed || 6.2,
    projectileSpeedMultiplier: inosukeConfig.projectileSpeedMultiplier || 1.0,
    ability: inosukeConfig.ability || 'Beast Breathing ("King of the Mountain")',
    desc: inosukeConfig.desc || 'Wild dual-serrated katana berserker with Spatial Awareness radar and dislocated joint reach. Wields 160° Dual Serrated Hacks, 360° Crazy Cutting whirlwind shredding, Explosive Rush boar charges, and King of the Mountain Cataclysm ultimate.',
  },
  {
    id: 46,
    name: 'ESCANOR',
    grade: escanorConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: escanorConfig.color || '#F59E0B',
    themeColor: escanorConfig.themeColor || '#F59E0B',
    secondaryColor: escanorConfig.secondaryColor || '#DC2626',
    startX: escanorConfig.startX || 300,
    startY: escanorConfig.startY || 250,
    startVx: escanorConfig.startVx || 1.1,
    startVy: escanorConfig.startVy || 1.0,
    radius: escanorConfig.radius || escanorConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'escanor',
    hp: escanorConfig.hp || 390,
    damage: escanorConfig.damage || 28,
    cooldown: escanorConfig.cooldown || 28,
    moveSpeed: escanorConfig.moveSpeed || escanorConfig.speed || 5.7,
    projectileSpeedMultiplier: escanorConfig.projectileSpeedMultiplier || 1.0,
    ability: escanorConfig.ability || 'Cruel Sun (無慈悲な太陽)',
    desc: escanorConfig.desc || 'The Lion\'s Sin of Pride. Colossal solar juggernaut wielding the Sacred Treasure Divine Axe Rhitta and signature Cruel Sun (無慈悲な太陽) blazing star. Wields 140° Divine Slashes, solar drag & paralyze vortexes, Pride Flare solar novas, and the invincible high noon ultimate: "The One" with Divine Sword Escanor.',
  },
  {
    id: 47,
    name: 'Eye of Cthulhu',
    grade: eyeOfCthulhuConfig.grade ?? DEFAULT_GRADE,
    category: 'Terraria & Bosses',
    color: eyeOfCthulhuConfig.color || '#E11D48',
    themeColor: eyeOfCthulhuConfig.themeColor || '#E11D48',
    secondaryColor: eyeOfCthulhuConfig.secondaryColor || '#06B6D4',
    startX: eyeOfCthulhuConfig.startX || 300,
    startY: eyeOfCthulhuConfig.startY || 250,
    startVx: eyeOfCthulhuConfig.startVx || 1.0,
    startVy: eyeOfCthulhuConfig.startVy || 0.8,
    radius: eyeOfCthulhuConfig.radius || eyeOfCthulhuConfig.r || 32,
    aimbot: false,
    spinRate: 0,
    type: 'eye_of_cthulhu',
    hp: eyeOfCthulhuConfig.hp || 480,
    damage: eyeOfCthulhuConfig.damage || 28,
    cooldown: eyeOfCthulhuConfig.cooldown || 90,
    moveSpeed: eyeOfCthulhuConfig.moveSpeed || eyeOfCthulhuConfig.speed || 4.6,
    projectileSpeedMultiplier: eyeOfCthulhuConfig.projectileSpeedMultiplier || 1.0,
    ability: eyeOfCthulhuConfig.ability || 'The Evil Presence',
    desc: eyeOfCthulhuConfig.desc || 'Floats freely through terrain. Summons Servants of Cthulhu and executes telegraphed triple rams. At 50% HP, tears into a ravenous berserk fanged maw.',
  },
  {
    id: 48,
    name: 'Ender Dragon',
    grade: enderDragonConfig.grade ?? DEFAULT_GRADE,
    category: 'Terraria & Bosses',
    color: enderDragonConfig.color || '#18181B',
    themeColor: enderDragonConfig.themeColor || '#C026D3',
    secondaryColor: enderDragonConfig.secondaryColor || '#E879F9',
    startX: enderDragonConfig.startX || 300,
    startY: enderDragonConfig.startY || 250,
    startVx: enderDragonConfig.startVx || 1.0,
    startVy: enderDragonConfig.startVy || 0.8,
    radius: enderDragonConfig.radius || enderDragonConfig.r || 36,
    aimbot: false,
    spinRate: 0,
    type: 'ender_dragon',
    hp: enderDragonConfig.hp || 520,
    damage: enderDragonConfig.damage || 32,
    cooldown: enderDragonConfig.cooldown || 80,
    moveSpeed: enderDragonConfig.moveSpeed || enderDragonConfig.speed || 4.4,
    projectileSpeedMultiplier: enderDragonConfig.projectileSpeedMultiplier || 1.0,
    ability: enderDragonConfig.ability || 'Ruler of The End',
    desc: enderDragonConfig.desc || 'Colossal flying draconic leviathan. Bypasses terrain with void flight, shoots lingering Dragon Breath acid pools, executes kinetic wing swoops, and unleashes cataclysmic void shockwaves.',
  },
  {
    id: 49,
    name: 'MEGUMIN',
    grade: meguminConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: meguminConfig.color || '#C81D25',
    themeColor: meguminConfig.themeColor || '#C81D25',
    secondaryColor: meguminConfig.secondaryColor || '#FFD166',
    startX: meguminConfig.startX || 300,
    startY: meguminConfig.startY || 250,
    startVx: meguminConfig.startVx || 1.0,
    startVy: meguminConfig.startVy || 0.9,
    radius: meguminConfig.radius || meguminConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'megumin',
    hp: meguminConfig.hp || 280,
    damage: meguminConfig.damage || 420,
    cooldown: meguminConfig.cooldown || 60,
    moveSpeed: meguminConfig.moveSpeed || meguminConfig.speed || 2.45,
    projectileSpeedMultiplier: meguminConfig.projectileSpeedMultiplier || 1.0,
    ability: meguminConfig.ability || 'Explosion Magic (爆裂魔法)',
    desc: meguminConfig.desc || 'The Crimson Demon Archmage. Specializes in a single apocalyptic offensive spell: EXPLOSION! Recites an extended dramatic chanting incantation with committed aim lock, unleashing cataclysmic true damage before suffering total mana burnout and collapsing into a helpless faceplant.',
  },
  {
    id: 50,
    name: 'PLANTS',
    grade: crazyDaveConfig.grade ?? DEFAULT_GRADE,
    displayName: 'PLANTS',
    category: 'Gaming',
    color: crazyDaveConfig.color || '#84CC16',
    themeColor: crazyDaveConfig.themeColor || '#84CC16',
    secondaryColor: crazyDaveConfig.secondaryColor || '#F59E0B',
    startX: crazyDaveConfig.startX || 300,
    startY: crazyDaveConfig.startY || 250,
    startVx: crazyDaveConfig.startVx || 1.0,
    startVy: crazyDaveConfig.startVy || 0.9,
    radius: crazyDaveConfig.radius || crazyDaveConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'crazydave',
    hp: crazyDaveConfig.hp || 390,
    damage: crazyDaveConfig.damage || 22,
    cooldown: crazyDaveConfig.cooldown || 28,
    moveSpeed: crazyDaveConfig.moveSpeed || crazyDaveConfig.speed || 5.2,
    projectileSpeedMultiplier: crazyDaveConfig.projectileSpeedMultiplier || 1.0,
    ability: crazyDaveConfig.ability || 'Solar Economy & Flora Arsenal ("WABBI WABBO!")',
    desc: crazyDaveConfig.desc || 'The eccentric neighbor from Plants vs. Zombies. Gathers Sun drops from the sky, basic hits, and Sunflowers. Accumulates solar energy to plant Peashooters, sturdy Wall-nuts, explosive Cherry Bombs, and deploys the devastating Lawn Mower Cataclysm!',
  },
  {
    id: 51,
    name: 'P.E.K.K.A',
    grade: pekkaConfig.grade ?? DEFAULT_GRADE,
    category: 'Gaming',
    color: pekkaConfig.color || '#8B5CF6',
    themeColor: pekkaConfig.themeColor || '#8B5CF6',
    secondaryColor: pekkaConfig.secondaryColor || '#06B6D4',
    startX: pekkaConfig.startX || 300,
    startY: pekkaConfig.startY || 250,
    startVx: pekkaConfig.startVx || 1.0,
    startVy: pekkaConfig.startVy || 0.9,
    radius: pekkaConfig.radius || pekkaConfig.r || 28,
    aimbot: false,
    spinRate: 0,
    type: 'pekka',
    hp: pekkaConfig.hp || 480,
    damage: pekkaConfig.damage || 38,
    cooldown: pekkaConfig.cooldown || 48,
    moveSpeed: pekkaConfig.moveSpeed || pekkaConfig.speed || 4.4,
    projectileSpeedMultiplier: pekkaConfig.projectileSpeedMultiplier || 1.0,
    ability: pekkaConfig.ability || 'Kinetic Momentum & Butterfly Overdrive',
    desc: pekkaConfig.desc || 'Heavy armored samurai robot. Passive: Heavy Titanium Plating deflects 25% of all incoming damage and resists basic knockback pushes. Attacks with wide 140° Colossal Cleaves that build Kinetic Momentum up to an Overclock 3rd smash. Chases fluttering butterflies with unstoppable hyper-armor sprint and detonates an electric EMP overload.',
  },
  {
    id: 52,
    name: 'NAMELESS DEITY',
    grade: namelessDeityConfig.grade ?? DEFAULT_GRADE,
    category: 'Gaming',
    color: namelessDeityConfig.color || '#00F0FF',
    themeColor: namelessDeityConfig.themeColor || '#00F0FF',
    secondaryColor: namelessDeityConfig.secondaryColor || '#A17FE0',
    startX: 300,
    startY: 250,
    startVx: 1.0,
    startVy: 0.9,
    radius: namelessDeityConfig.radius || namelessDeityConfig.r || 28,
    aimbot: false,
    spinRate: 0,
    type: 'namelessdeity',
    hp: namelessDeityConfig.hp || 420,
    damage: namelessDeityConfig.damage || 16,
    cooldown: namelessDeityConfig.cooldown || 35,
    moveSpeed: namelessDeityConfig.moveSpeed || namelessDeityConfig.speed || 4.8,
    projectileSpeedMultiplier: namelessDeityConfig.projectileSpeedMultiplier || 1.0,
    ability: namelessDeityConfig.ability || 'Nameless Destroyer & Cosmic Singularity',
    desc: namelessDeityConfig.desc || 'The transcendent cosmic entity from Terraria: Wrath of the Gods. Fires homing Prismatic Light Darts, creates Supercluster Star Mandalas, summons Gravitational Cosmic Singularities, and channels the devastating "Nameless Destroyer" cosmic death ray.',
  },
  {
    id: 53,
    name: 'DRAEDON',
    grade: draedonConfig.grade ?? DEFAULT_GRADE,
    category: 'Gaming',
    color: draedonConfig.color || '#06B6D4',
    themeColor: draedonConfig.themeColor || '#06B6D4',
    secondaryColor: draedonConfig.secondaryColor || '#F59E0B',
    startX: 300,
    startY: 250,
    startVx: 1.0,
    startVy: 0.9,
    radius: draedonConfig.radius || draedonConfig.r || 28,
    aimbot: false,
    spinRate: 0,
    type: 'draedon',
    hp: draedonConfig.hp || 430,
    damage: draedonConfig.damage || 18,
    cooldown: draedonConfig.cooldown || 32,
    moveSpeed: draedonConfig.moveSpeed || draedonConfig.speed || 4.6,
    projectileSpeedMultiplier: draedonConfig.projectileSpeedMultiplier || 1.0,
    ability: draedonConfig.ability || 'Exo Electric Disintegrator & Ares Artillery',
    desc: draedonConfig.desc || 'The supreme cybernetic mastermind from Terraria: Calamity Mod. Wields twin Exo-Pulse Blasters, commands Ares Gauss Artillery, activates Thanatos Refractive Shields, and incinerates enemies with the apocalyptic "Exo Electric Disintegrator" plasma melting ray.',
  },
  {
    id: 54,
    name: 'SANS',
    grade: sansConfig.grade ?? DEFAULT_GRADE,
    category: 'Gaming',
    color: sansConfig.color || '#03d5f1ff',
    themeColor: sansConfig.themeColor || '#03d5f1ff',
    secondaryColor: sansConfig.secondaryColor || '#FFE600',
    damageNumberColor: sansConfig.damageNumberColor || '#03d5f1ff',
    startX: 300,
    startY: 250,
    startVx: 1.0,
    startVy: 0.9,
    radius: sansConfig.radius || sansConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'sans',
    hp: sansConfig.hp || 240,
    damage: sansConfig.damage || 8,
    cooldown: sansConfig.cooldown || 26,
    moveSpeed: sansConfig.moveSpeed || sansConfig.speed || 5.2,
    projectileSpeedMultiplier: sansConfig.projectileSpeedMultiplier || 1.0,
    ability: sansConfig.ability || 'Gaster Blasters, Bone Zone & Blue Soul Gravity ("Bad Time")',
    desc: sansConfig.desc || 'The laid-back skeleton judge from Undertale. Dodges incoming attacks with instant teleportation afterimages. Attacks with rapid bone barrages, summons heavy Gaster Blaster laser cannons, applies Karmic Retribution (KR) damage over time, and controls battlefield gravity with Blue Soul telekinesis slams.',
  },
  {
    id: 55,
    name: 'AVATAR OF EMPTINESS',
    grade: avatarOfEmptinessConfig.grade ?? DEFAULT_GRADE,
    category: 'Gaming',
    color: avatarOfEmptinessConfig.color || '#9D4EDD',
    themeColor: avatarOfEmptinessConfig.themeColor || '#9D4EDD',
    secondaryColor: avatarOfEmptinessConfig.secondaryColor || '#00F5D4',
    startX: 300,
    startY: 250,
    startVx: 1.0,
    startVy: 0.9,
    radius: avatarOfEmptinessConfig.radius || avatarOfEmptinessConfig.r || 29,
    aimbot: false,
    spinRate: 0,
    type: 'avatarofemptiness',
    hp: avatarOfEmptinessConfig.hp || 460,
    damage: avatarOfEmptinessConfig.damage || 17,
    cooldown: avatarOfEmptinessConfig.cooldown || 34,
    moveSpeed: avatarOfEmptinessConfig.moveSpeed || avatarOfEmptinessConfig.speed || 4.7,
    projectileSpeedMultiplier: avatarOfEmptinessConfig.projectileSpeedMultiplier || 1.0,
    ability: avatarOfEmptinessConfig.ability || 'Universal Annihilation & Three Universes',
    desc: avatarOfEmptinessConfig.desc || 'The incomprehensible sovereign of the Dark, Cryonic, and Visceral Universes from Terraria: Wrath of the Gods. Fires homing Antimatter Void Blasts, triggers Cryonic Absolute Zero frost outbursts, summons Visceral Blood Torrents, strikes with Dark Portal Arms, and uncages the reality-shattering "Universal Annihilation" cosmic death beam.',
  },
  {
    id: 56,
    name: 'NAOYA',
    grade: naoyaConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: naoyaConfig.color || '#76E042',
    themeColor: naoyaConfig.themeColor || '#76E042',
    secondaryColor: naoyaConfig.secondaryColor || '#C8E64A',
    startX: 300,
    startY: 250,
    startVx: 1.2,
    startVy: 1.1,
    radius: naoyaConfig.radius || naoyaConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'naoya',
    hp: naoyaConfig.hp || 190,
    damage: naoyaConfig.damage || 8,
    cooldown: naoyaConfig.cooldown || 40,
    moveSpeed: naoyaConfig.moveSpeed || naoyaConfig.speed || 5.6,
    projectileSpeedMultiplier: naoyaConfig.projectileSpeedMultiplier || 1.0,
    ability: naoyaConfig.ability || 'Projection Sorcery (24 FPS)',
    desc: naoyaConfig.desc || 'Inheritor of Projection Sorcery from Jujutsu Kaisen. Divides 1s into 24 frames to accelerate to supersonic speeds. Traps enemies who fail the 24 FPS rule inside frozen film frames with palm strikes, executing with Mach-speed flurry slashes.',
  },
  {
    id: 57,
    name: 'MAKI',
    grade: makiConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: makiConfig.color || '#18181B',
    themeColor: makiConfig.themeColor || '#014913ff',
    secondaryColor: '#8B5CF6',
    startX: 300,
    startY: 250,
    startVx: 1.2,
    startVy: 1.1,
    radius: makiConfig.radius || makiConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'maki',
    hp: makiConfig.hp || 220,
    damage: makiConfig.damage || 28,
    cooldown: makiConfig.cooldown || 35,
    moveSpeed: makiConfig.moveSpeed || makiConfig.speed || 5.4,
    projectileSpeedMultiplier: makiConfig.projectileSpeedMultiplier || 1.0,
    ability: makiConfig.ability || 'Heavenly Restriction (Awakened)',
    desc: makiConfig.desc || 'Zero Cursed Energy. Slices directly into the soul with the Split Soul Katana, bypasses domains, air-steps without friction, and absorbs kinetic force with Dragon-Bone.',
  },
  {
    id: 58,
    name: 'SHIRO',
    grade: shiroConfig.grade ?? DEFAULT_GRADE,
    displayName: '『SHIRO』',
    category: 'Anime',
    color: shiroConfig.color || '#A855F7',
    themeColor: shiroConfig.themeColor || '#8B5CF6',
    secondaryColor: '#38BDF8',
    startX: 300,
    startY: 250,
    startVx: 1.2,
    startVy: 1.1,
    radius: shiroConfig.radius || shiroConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'shiro',
    hp: shiroConfig.hp || 340,
    damage: shiroConfig.damage || 24,
    cooldown: shiroConfig.cooldown || 75,
    moveSpeed: shiroConfig.moveSpeed || shiroConfig.speed || 5.6,
    projectileSpeedMultiplier: shiroConfig.projectileSpeedMultiplier || 1.0,
    ability: shiroConfig.ability || 'Disboard Chess Prodigy & Living Troops',
    desc: shiroConfig.desc || 'Mastermind of Blank 『　　』 & Living Chess Prodigy. Commands the Disboard Chessboard, flicks living chess pieces (Pawn, Knight, Bishop, Rook, Queen), executes calculated 1-by-1 grandmaster tactical maneuvers, and calculates Checkmate in 10^120 variations!',
  },
  {
    id: 59,
    name: 'SPARTAN',
    grade: spartanConfig.grade ?? DEFAULT_GRADE,
    displayName: 'SPARTAN',
    category: 'Greek Mythology',
    color: spartanConfig.color || '#b91c1c',
    themeColor: spartanConfig.themeColor || '#d97706',
    secondaryColor: '#dc2626',
    startX: 300,
    startY: 250,
    startVx: 1.2,
    startVy: 1.1,
    radius: spartanConfig.radius || spartanConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'spartan',
    hp: spartanConfig.hp || 110,
    damage: spartanConfig.damage || 32,
    cooldown: spartanConfig.spearCooldown || 34,
    moveSpeed: spartanConfig.moveSpeed || spartanConfig.speed || 4.9,
    projectileSpeedMultiplier: 1.0,
    ability: spartanConfig.ability || 'Dory Spear & Javelin Hurl',
    desc: spartanConfig.desc || 'Ancient Greek Hoplite. Wields a long-reach Dory spear and Hoplon bronze shield with passive deflection, hurling supersonic pinning Javelins at distant targets.',
  },
  {
    id: 60,
    name: 'GUTS',
    grade: gutsConfig.grade ?? DEFAULT_GRADE,
    displayName: 'GUTS',
    category: 'Anime & Dark Fantasy',
    color: gutsConfig.color || '#18181b',
    themeColor: gutsConfig.themeColor || '#71717a',
    secondaryColor: '#dc2626',
    startX: 300,
    startY: 250,
    startVx: 1.2,
    startVy: 1.1,
    radius: gutsConfig.radius || gutsConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'guts',
    hp: gutsConfig.hp || 460,
    damage: gutsConfig.damage || 36,
    cooldown: gutsConfig.cooldown || 36,
    moveSpeed: gutsConfig.moveSpeed || gutsConfig.speed || 4.6,
    projectileSpeedMultiplier: 1.0,
    ability: gutsConfig.ability || 'Dragon Slayer & Berserker Armor',
    desc: gutsConfig.desc || 'Wielder of the monstrous 400-pound Dragon Slayer. Struggles against fate with unyielding poise, a high-explosive arm cannon, and the dwarf-forged Berserker Armor.',
  },
  {
    id: 61,
    name: 'CHOSO',
    grade: chosoConfig.grade ?? DEFAULT_GRADE,
    displayName: 'CHOSO',
    category: 'Anime',
    color: chosoConfig.color || '#A31D1D',
    themeColor: chosoConfig.themeColor || '#A31D1D',
    secondaryColor: chosoConfig.secondaryColor || '#FF2A55',
    startX: 300,
    startY: 250,
    startVx: 1.1,
    startVy: 1.1,
    radius: chosoConfig.radius || chosoConfig.r || 25,
    aimbot: false,
    spinRate: 0,
    type: 'choso',
    hp: chosoConfig.hp || 420,
    damage: chosoConfig.damage || 22,
    cooldown: chosoConfig.cooldown || 36,
    moveSpeed: chosoConfig.moveSpeed || chosoConfig.speed || 5.3,
    projectileSpeedMultiplier: 1.0,
    ability: chosoConfig.ability || 'Blood Manipulation: Convergence',
    desc: chosoConfig.desc || 'Eldest brother of the Cursed Womb: Death Paintings from Jujutsu Kaisen. Converts cursed energy into inexhaustible blood reserves, seeds the arena with poisonous blood droplets, and transmutates all blood particles into a deadly multi-angle piercing laser crossfire grid.',
  }
];

// Conditionally add Mahoraga to the arena
if (CONFIG.mahoraga && CONFIG.mahoraga.isAvailableInArena) {
  FIGHTER_DEFS.push({
    id: 100,
    name: 'MAHORAGA',
    grade: mahoragaConfig.grade ?? DEFAULT_GRADE,
    category: 'Anime',
    color: mahoragaConfig.color || '#F5F5DC', // Beige / Off-White
    themeColor: mahoragaConfig.themeColor || '#FFD700',
    startX: mahoragaConfig.startX || 300,
    startY: mahoragaConfig.startY || 250,
    startVx: mahoragaConfig.startVx || 1.1,
    startVy: mahoragaConfig.startVy || 1.1,
    radius: mahoragaConfig.radius || mahoragaConfig.r || 30, // Slightly larger base size
    aimbot: false,
    spinRate: 0,
    type: 'mahoraga',
    hp: mahoragaConfig.hp || 250, // Tanky boss-like health
    damage: mahoragaConfig.damage || 15,
    cooldown: mahoragaConfig.cooldown || 60,
    moveSpeed: mahoragaConfig.moveSpeed || mahoragaConfig.speed || 6.5, // Slow but menacing
    projectileSpeedMultiplier: mahoragaConfig.projectileSpeedMultiplier || 1.0,
    ability: mahoragaConfig.ability || 'Wheel of Adaptation',
    desc: mahoragaConfig.desc || 'Adapts to damage types. Increase chance of parry and blocks to incoming attacks for each wheel rotation.',
  });
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// DERIVED CONSTANTS
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** Total distance from fighter center to gun barrel tip. */
export const GUN_TIP_DIST = (r) => r + CONFIG.gun.baseOffset + CONFIG.gun.barrelLength;

/** Helper function to get active fighter definitions */
export function getActiveFighterDefs() {
  return FIGHTER_DEFS;
}

/** Helper function to get fighter definition by ID */
export function getFighterById(id) {
  return FIGHTER_DEFS.find(def => def.id === id);
}

/** Helper function to scale hand radius globally */
export function getHandSize(baseSize = 6) {
  return baseSize * (CONFIG.globalFighter?.handSizeMultiplier ?? 1.0);
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC VIEWPORT & INTERNAL SCALE POST-PROCESSING
// Dynamically centers the arena based on canvasWidth / canvasHeight,
// and scales all active components if internalScale is configured.
// ─────────────────────────────────────────────────────────────────────────────
const scale = CONFIG.internalScale || 1.0;
const canvasWidth = CONFIG.canvasWidth || 540;
const canvasHeight = CONFIG.canvasHeight || 960;

// 1. Scale arena width and height
const originalWidth = CONFIG.arena.width || 450;
const originalHeight = CONFIG.arena.height || 450;
CONFIG.arena.width = Math.round(originalWidth * scale);
CONFIG.arena.height = Math.round(originalHeight * scale);

// 2. Dynamically center or override the arena position based on configs
// occupied height = title header (170 * scale) + arena height + bottom HUD (~190 * scale)
const occupiedHeight = (170 * scale) + CONFIG.arena.height + (190 * scale);
const verticalMargin = (canvasHeight - occupiedHeight) / 2;

// Check for absolute position overrides or apply dynamic centering + offsets
if (typeof CONFIG.arenaXOverride === 'number') {
  CONFIG.arena.x = CONFIG.arenaXOverride;
} else {
  CONFIG.arena.x = Math.round((canvasWidth - CONFIG.arena.width) / 2) + (CONFIG.arenaXOffset || 0);
}

if (typeof CONFIG.arenaYOverride === 'number') {
  CONFIG.arena.y = CONFIG.arenaYOverride;
} else {
  CONFIG.arena.y = Math.max(20, Math.round(verticalMargin + (170 * scale))) + (CONFIG.arenaYOffset || 0);
}

// 3. Scale global fighter and hand size multipliers if scale is customized
if (scale !== 1.0) {
  if (CONFIG.globalFighter) {
    CONFIG.globalFighter.sizeMultiplier = (CONFIG.globalFighter.sizeMultiplier || 1.2) * scale;
    CONFIG.globalFighter.handSizeMultiplier = (CONFIG.globalFighter.handSizeMultiplier || 1.5) * scale;
  }

  // 4. Scale default projectile and specific character projectile radii
  if (CONFIG.projectile) {
    CONFIG.projectile.radius = Math.max(1, Math.round(CONFIG.projectile.radius * scale));
  }
  if (CONFIG.orange && CONFIG.orange.flameRadius) {
    CONFIG.orange.flameRadius = Math.max(1, Math.round(CONFIG.orange.flameRadius * scale));
  }

  // 5. Scale DOM HUD Font Sizes
  CONFIG.hudTitleFontSize = Math.round(CONFIG.hudTitleFontSize * scale);
  CONFIG.hudDescFontSize = Math.round(CONFIG.hudDescFontSize * scale);
  CONFIG.hudInfoFontSize = Math.round(CONFIG.hudInfoFontSize * scale);
  CONFIG.hudSkillFontSize = Math.round(CONFIG.hudSkillFontSize * scale);
}

