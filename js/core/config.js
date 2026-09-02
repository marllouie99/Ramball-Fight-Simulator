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
import { nobaraConfig } from '../configs/characters/nobaraConfig.js';
import { megumiConfig } from '../configs/characters/megumiConfig.js';
import { johnWickConfig } from '../configs/characters/johnWickConfig.js';
import { cjConfig } from '../configs/characters/cjConfig.js';
import { uryuConfig } from '../configs/characters/uryuConfig.js';
import { ulquiorraConfig } from '../configs/characters/ulquiorraConfig.js';
import { engineerConfig } from '../configs/characters/engineerConfig.js';
import { blackFlashConfig } from '../configs/skills/blackFlashConfig.js';
import { bloodConfig } from '../configs/bloodConfig.js';
import { m4a1Config, spas12Config, desertEagleConfig, awpConfig, barrettConfig, tacticalMainConfig } from '../../Tactical Force/configs/index.js';
import { TACTICAL_FIGHTER_DEFS } from '../../Tactical Force/tacticalFighterDefs.js';

export const CONFIG = {
  tactical: tacticalMainConfig,
  tacticalMain: tacticalMainConfig,
  blood: bloodConfig,
  saitama: saitamaConfig,
  genos: genosConfig,
  mahito: mahitoConfig,
  nanami: nanamiConfig,
  nobara: nobaraConfig,
  megumi: megumiConfig,
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
  john_wick: johnWickConfig,
  johnWick: johnWickConfig,
  cj: cjConfig,
  CJ: cjConfig,
  engineer: engineerConfig,
  Engineer: engineerConfig,
  m4a1: m4a1Config,
  M4A1: m4a1Config,
  rifle: m4a1Config,
  spas12: spas12Config,
  SPAS12: spas12Config,
  shotgun: spas12Config,
  desertEagle: desertEagleConfig,
  deserteagle: desertEagleConfig,
  pistol: desertEagleConfig,
  awp: awpConfig,
  AWP: awpConfig,
  sniper: awpConfig,
  barrett: barrettConfig,
  Barrett: barrettConfig,
  barrett50cal: barrettConfig,
  arena: { x: 40, y: 240, width: 450, height: 450, wallWidth: 4 },
  projectile: { speed: 5.5, radius: 5, life: 120, damage: 10 },
  gun: { baseOffset: 10, barrelLength: 12 }, // distance from fighter edge
  spin: { rate: 0.06 },                        // angle increment per frame (├ù fighter.speed)
  shoot: { cooldown: 24 },                      // frames between shots
  collision: { restitution: 0.95 },
  spawn: { leftXRatio: 0.25, rightXRatio: 0.75, yRatio: 0.5, verticalOffset: 32 },
  hpBar: { height: 6, yOffset: 16 },
  rounds: { max: 3 },                          // default max rounds for match (used in Fighter.takeDamage)
  globalFighter: {
    sizeMultiplier: 1.2,                       // scale the size of all fighters globally (1.0 = default)
    _defaultFocSizeMultiplier: 1.2,            // reference base size for FOC modes
    handSizeMultiplier: 1.4,                   // scale the size of all fighter hands globally (1.0 = default)
    unifiedMovementSpeed: tacticalMainConfig.unifiedMovementSpeed, // unified movement speed across tactical fighters
    enableUnifiedSpeed: tacticalMainConfig.enableUnifiedSpeed,
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
  darkModeShowHudSkillBars: 0,  // Toggle on/off to display HUD skill progress bars across Light and Dark mode (1 = show all, 0 = signature skills only)
  darkModeShowHudStats: 0,      // Toggle on/off to display HUD fighter stats info (DMG, SPD, ATK, etc.) across Light and Dark mode (1 = show, 0 = hide)
  basicAttackHitPauseDuration: 0, // Hit-pause duration in frames for basic attacks (0 to disable)
  globalScreenShakeIntensityMultiplier: 0.7, // Global multiplier for all hit effect & arena screen shake intensity (1.0 = normal, 0.5 = half shake, 0.0 = disable shake completely)
  canvasWidth: 540,                 // Logical width of the game screen
  canvasHeight: 1080,                // Logical height of the game screen
  internalScale: 0.95,               // Scale factor for active game elements (arena, fighters, projectiles, and HUD size) inside the container
  arenaXOffset: 0,                   // Horizontal offset shift (px) from center (negative = left, positive = right)
  arenaYOffset: -110,                // Vertical offset shift (px) from center (negative = up, positive = down)
  arenaXOverride: null,              // Absolute X override (px) - set to a number (e.g. 50) to skip centering
  arenaYOverride: null,              // Absolute Y override (px) - set to a number (e.g. 120) to skip centering
  arenaTheme: 'light',               // Arena visual theme: 'light' | 'dark'
  canvasBgColor: '#ffffffff',        // Canvas background color (hex string or hex number)
  arenaOuterBgColor: '#fffdf1ff',    // Background color of the container area outside the arena (under HUD and sides)
  arenaInnerBgColor: '#ffffffff',    // Background color inside the arena boundaries
  hudTextColor: '#131313ff',         // Font color for all HUD text (title, stats, description)
  hudTitleFontSize: 22,              // Font size for fighter name in HUD (px)
  hudDescFontSize: 20,               // Font size for fighter description in HUD (px)
  hudInfoFontSize: 14.5,             // Font size for fighter info (DMG, etc.) in HUD (px)
  hudSkillFontSize: 15,              // Font size for skill bar labels in HUD (px)
  hudWidthModifier: 1.0,            // HUD width relative to raw arena width. 1.0 = full arena width; 0.95 = aligns with arena side walls (matches internalScale)
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

  /** Yellow ΓÇö Melee fighter */
  melee: {
    speedBoostDuration: 120, // frames the speed burst lasts after a hit (120 = 2 s at 60 fps)
    speedBoostMultiplier: 2.5, // how many times faster Yellow moves during the boost
    trailLength: 10,  // how many past positions are kept for the ghost trail visual
    rebounceLockChance: 0.4, // chance (0-1) to aggressively dash toward the nearest target upon hitting a wall
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
    // Fuel mechanic settings
    maxFuel: 200,                   // maximum fuel capacity
    fuelPerBurst: 1.5,                // fuel consumed per flame burst
    fuelPickupAmount: 120,          // fuel restored per pickup
    fuelPickupRespawnTime: 500,     // frames before fuel pickup respawns (3 seconds at 60 fps)
    maxFuelPickups: 2,              // maximum number of fuel pickups in arena at once
    fuelPickupSpawnInterval: 120,   // frames between attempting to spawn new fuel pickups (2 seconds)
    fuelPickupRadius: 12,          // radius of fuel pickup for collision detection
    fuelBarWidth: 60,              // width of fuel meter bar in pixels
    fuelBarHeight: 8,              // height of fuel meter bar in pixels
    fuelBarOffsetY: 40,            // vertical offset from fighter center for fuel bar
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



  // Neutral Close-Quarters Attack-Teleport Stance (Triggers while waiting for wheel to adapt!)
  neutralAttacksPerTeleport: 2,    // Number of attacks before teleporting (e.g. 2 attacks -> teleport -> 2 attacks)
  neutralAttackInterval: 20,       // Frame interval between consecutive attacks (~0.33s at 60fps)
  neutralTeleportDelay: 12,        // Frame delay after teleporting before starting the next attack sequence (~0.20s)
  neutralTeleportDistance: 55,     // Teleport distance offset around opponent

  /** Gray ΓÇö Knight fighter */
  knight: {


    swordRange: 40,   // pixels from edge; how close enemy must be for a sword swipe
    swipeCooldown: 40,  // frames between sword swipes (120 = 2 s at 60 fps)
    swipeDuration: 18,   // frames the swipe arc animation plays
    swordDamage: 30,   // damage dealt by a sword swipe
    swordDurability: 3,    // number of swipes before the sword breaks
    shieldBlockChance: 0.50, // probability (0ΓÇô1) of blocking a direct incoming projectile
    blockFlashFrames: 15,   // duration of the visual flash when a block occurs
    shieldHoldFrames: 60,   // frames to keep shield in front after successfully blocking an attack
    blockProjectileDetectionRadius: 250, // radius to detect incoming projectiles for shield block visual
    blockMeleeDetectionRadius: 130, // radius to detect close enemies for shield block visual
    shieldDurability: 2,    // number of successful blocks before the shield breaks
    shieldThrowDamage: 30,  // damage dealt by thrown sword after shield breaks
    swordReturnFrames: 180, // frames until thrown sword returns (Γëê3s)
    dashChargeFrames: 10,   // frames Gray locks in and charges before the shield dash (Γëê0.8 s)
    chargeKnockback: 2.0,   // velocity applied to nearby enemies when charging begins
    chargeKnockbackRadius: 90, // radius in px for the charge knockback effect
    dashDuration: 40,   // max frames the dash itself lasts before it auto-cancels
    dashSpeed: 9,    // pixel velocity during the shield dash
    dashDamage: 20,   // damage on shield bash contact
    dashKnockback: 7,    // velocity impulse applied to target on shield bash hit
  },

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

  /** Gun Slinger ΓÇö Dual revolver fighter */
  gunslinger: {
    // TUNING: Magazine system
    magazineSize: 24,         // number of bullets in the magazine (6 per gun)
    reloadTime: 90,           // frames to reload (1.5 seconds at 60 fps)
    magazineRegenRate: 0,     // bullets regenerated per second (0 = manual reload only)
    reloadSpeedPenalty: 0.5,  // movement speed multiplier during reload (0.5 = 50% speed)

    // TUNING: Basic attack (alternating dual revolvers)
    leftGunDelay: 8,          // frames delay for left gun shot after right gun
    shotCooldown: 15,         // frames between alternating shots (rapid fire)
    bulletDamage: 10,          // damage per bullet
    bulletSpeed: 15.0,        // speed of bullets
    basicAttackKnockback: 5.0,// very small knockback on basic attacks

    // TUNING: Passive skill (damage multiplier chance)
    critChance: 0.20,         // chance (0-1) to deal critical damage
    critMultiplier: 1.8,      // damage multiplier on critical hit
    critChanceIncrease: 0.05, // increase in crit chance (0-1) per crit hit
    critMultiplierIncrease: 0.15, // increase in damage multiplier per crit hit
    maxCritChance: 0.80,      // maximum crit chance cap (80%)
    maxCritMultiplier: 3.5,   // maximum crit multiplier cap (3.5x)

    // TUNING: Active skill (rapid sync fire) - requires full magazine
    skillCooldown: 300,       // frames between skill uses (5 seconds at 60 fps)
    skillDuration: 60,        // frames the rapid sync fire lasts (1 second at 60 fps)
    skillBurstCount: 8,       // number of bullet pairs fired during skill
    skillBurstInterval: 8,    // frames between each bullet pair during skill
    skillDamage: 7,           // damage per bullet during skill (lower but balanced)
    skillRequiresFullMag: true, // skill can only be activated with full magazine
    autoSkillThreshold: 3,     // bullets or less triggers active skill before reload
    leftGunAngleOffset: 0.3,   // default left gun aim offset when no secondary target exists
  },

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

  /** Trickster ΓÇö Spell Steal and Arcane Magic */
  trickster: {
    // Basic Attack: Arcane Bolt
    boltDamage: 12,
    boltSpeed: 8,
    bounceCount: 4,
    bounceDamageMultiplier: 0.7, // Damage multiplier on each bounce
    attackCooldown: 100,

    // Skill 1: Telekinesis
    telekinesisCooldown: 400,
    telekinesisDuration: 90, // Frames target is held in air
    telekinesisStunRadius: 100, // AoE stun on landing
    telekinesisStunDuration: 60, // Frames enemies are stunned on landing
    telekinesisRange: 250,

    // Ultimate: Spell Steal
    spellStealCooldown: 700,
    spellStealDuration: 1000, // 7 seconds
    spellStealRange: 350,
  },

  /** Zeus ΓÇö Lightning Spell Caster */
  zeus: {
    // Basic Attack: Chain Lightning (fast projectile)
    lightningDamage: 20,
    lightningSpeed: 30,
    chainCount: 6,         // How many times it bounces
    chainRange: 250,       // Range to find next target
    chainDamageMultiplier: 0.8, // Decay per bounce
    attackCooldown: 150,

    // Debuff & Stun Chance Progressive Mechanics (Tunable)
    baseStunChance: 0.10,     // Starting stun chance (0.10 = 10%)
    stunChanceIncrease: 0.10, // Stun chance added per landed basic attack hit (+0.10 = +10% per hit)
    maxStunChance: 0.80,      // Maximum stun chance cap (0.80 = 80%)
    stunChance: 0.50,         // Initial stun chance fallback
    stunDuration: 30,         // Frames target is stunned on electric hit (18 frames = 0.3s)
    paralyzeChance: 0.3,
    paralyzeDuration: 60,
    paralyzeSlowMultiplier: 0.5,
    staticChance: 0.5,
    staticDuration: 120,
    staticDamageBonus: 1.5, // 50% extra damage to static targets

    // Passive: Aegis Shield
    aegisCooldown: 300,    // 5 seconds
    aegisShockDamage: 15,
    aegisParalyzeDuration: 90,
    aegisTriggerRange: 200, // Increased range to trigger on more attacks

    // Ultimate: Storm
    stormCooldown: 900,    // 15 seconds
    stormDuration: 130,    // 3 seconds
    stormStrikesPerSec: 3, // Per enemy
    stormStrikeDamage: 35,

    // Storm Visuals & FX
    stormTelegraphFrames: 120,       // Duration of the channeling wind-up
    stormDimOpacity: 0.7,            // How dark the arena becomes
    stormCastShakeIntensity: 8,      // Screen shake when storm activates
    stormCastShakeFrames: 20,
    stormStrikeShakeIntensity: 4,    // Screen shake on each lightning impact
    stormStrikeShakeFrames: 10,
  },

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
};

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// FIGHTER DEFINITIONS ΓÇö static data only
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export const FIGHTER_DEFS = [
  {
    id: 1,
    name: 'Sharpshooter',
    category: 'Sci-Fi & Modern',
    color: '#ff4d4d',
    startX: 140, startY: 180,
    startVx: 1.4, startVy: 1.0,
    radius: 25,
    aimbot: false,
    spinRate: 0.01,
    type: 'normal',
    hp: 65,
    damage: 15,
    cooldown: 70, // 1 second at 60fps
    moveSpeed: 5.0,
    projectileSpeedMultiplier: 3.0,
    ability: 'Straight Fire',
    desc: 'Fires heavy projectiles straight ahead. High damage, slow reload rate.',
  },
  {
    id: 2,
    name: 'Jazz',
    category: 'Sci-Fi & Modern',
    color: '#4da3ff',
    startX: 460, startY: 280,
    startVx: -1.2, startVy: -0.9,
    radius: 25,
    aimbot: true,
    type: 'aimbot',
    hp: 60,
    damage: 5,
    cooldown: 30,  // 1 second at 60fps
    moveSpeed: 5.0,
    ability: 'Aimbot Laser',
    desc: 'Wields a dubstep gun that fires musical notes and triggers an instant follow-up projectile on hit.',
  },
  {
    id: 3,
    name: 'Spike',
    category: 'Fantasy & Magic',
    color: '#e5c158',
    startX: 300, startY: 240, // start center
    startVx: 1.6, startVy: -1.2,
    radius: 25,
    aimbot: false,
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
    category: 'Greek Mythology',
    color: '#4dff4d',
    startX: 220, startY: 240,
    startVx: 1.3, startVy: 1.1,
    radius: 25,
    aimbot: false,
    type: 'grenadier',
    hp: 75,
    damage: 15,
    cooldown: 0,
    moveSpeed: 4.7,
    ability: 'Poison Grenade',
    desc: 'Throws a poison and deals AOE damage and poisons them.',
  },
  {
    id: 5,
    name: 'Hyperion',
    category: 'Greek Mythology',
    color: '#ffffff',
    startX: 300, startY: 210,
    startVx: 1.4, startVy: 1.0,
    radius: 25,
    aimbot: false,
    spinRate: 0.03,
    type: 'laser',
    hp: 80,
    damage: 15,
    cooldown: 300, // 3 seconds cooldown
    moveSpeed: 4.0,
    ability: 'Sustained Laser',
    desc: 'Fires a continuous laser beam.',
  },
  {
    id: 6,
    name: 'Knight',
    category: 'Fantasy & Magic',
    color: '#9e9e9e',
    startX: 200, startY: 220,
    startVx: 0.7, startVy: 0.5,
    radius: 25,
    aimbot: false,
    type: 'knight',
    hp: 110,
    damage: 30,   // sword swipe damage (mirrors CONFIG.knight.swordDamage)
    cooldown: 180,  // not used directly; knight manages its own swipeCooldown
    moveSpeed: 4.8,
    ability: "Knight's Code",
    desc: 'Shield passively blocks projectiles. When the sword breaks, locks in and bashes with the shield.',
  },
  {
    id: 7,
    name: 'Erebus',
    category: 'Greek Mythology',
    color: '#6200a0',
    startX: 250, startY: 260,
    startVx: 1.0, startVy: 0.8,
    radius: 25,
    aimbot: false,
    spinRate: 0.07,
    type: 'black',
    hp: 70,
    damage: 10,
    cooldown: 35,
    moveSpeed: 5.0,
    projectileSpeedMultiplier: 1.0,
    ability: 'Black Hole',
    desc: 'Summons a black hole near the opponent, dragging them in and dealing damage over time.',
  },
  {
    id: 8,
    name: 'Shinobi',
    category: 'Japanese',
    color: '#2f4f4f',
    startX: 280, startY: 250,
    startVx: 1.2, startVy: -0.8,
    radius: 25,
    aimbot: false,
    spinRate: 0.05,
    type: 'darkslategray',
    hp: 50,
    damage: 5,
    cooldown: 25,
    moveSpeed: 5.5,
    projectileSpeedMultiplier: 1.0,
    ability: 'Shadow Arts',
    desc: 'Fighter with stealthy moves. Passively dodges projectiles. After 3 dodges, becomes invisible with speed boost and deals 2x backstab damage.',
  },
  {
    id: 9,
    name: 'Ember',
    category: 'Fantasy & Magic',
    color: '#ff8c00',
    startX: 300, startY: 230,
    startVx: 1.3, startVy: 1.0,
    radius: 25,
    aimbot: false,
    spinRate: 0.02,
    type: 'orange',
    hp: 100,
    damage: 10,
    cooldown: 30,
    moveSpeed: 4.0,
    projectileSpeedMultiplier: 1.0,
    ability: 'Auto-Lock Flamethrower',
    desc: 'Burns enemies with burning effect.',
  },
  {
    id: 10,
    name: 'Berserker',
    category: 'Fantasy & Magic',
    color: '#8b0000',
    startX: 320, startY: 260,
    startVx: 1.5, startVy: -1.0,
    radius: 25,
    aimbot: false,
    spinRate: 0.04,
    type: 'berserker',
    hp: 80,
    damage: 15,
    cooldown: 40,
    moveSpeed: 5.0,
    projectileSpeedMultiplier: 1.0,
    ability: 'Rage',
    desc: 'Gains rage when taking damage. During rage: increased damage, attack speed, movement speed, and lifesteal.',
  },
  {
    id: 11,
    name: 'Cronus',
    category: 'Greek Mythology',
    color: '#07cdfa',
    startX: 300, startY: 240,
    startVx: 1.2, startVy: 0.8,
    radius: 25,
    aimbot: false,
    spinRate: 0.03,
    type: 'cronos',
    hp: 120,
    damage: 10,
    cooldown: 35,
    moveSpeed: 4.8,
    projectileSpeedMultiplier: 1.0,
    ability: 'Time Stop',
    desc: 'Deploys a time stop sphere that freezes enemies. Gain movement speed and attack speed.',
  },
  {
    id: 12,
    name: 'Bombardier',
    category: 'Sci-Fi & Modern',
    color: '#6A3F1E',
    skinColor: '#5A3B1A',
    skinAccentColor: '#E0B05B',
    startX: 280, startY: 260,
    startVx: 1.3, startVy: -0.9,
    radius: 25,
    aimbot: false,
    spinRate: 0.04,
    type: 'bomber',
    hp: 85,
    damage: 12,
    cooldown: 45,
    moveSpeed: 4.5,
    projectileSpeedMultiplier: 1.0,
    ability: 'Explosive Expert',
    desc: 'Throws grenades that explode on impact dealing AOE damag. Leaves a powerful C4 bomb on death.',
  },
  {
    id: 13,
    name: 'Gun Slinger',
    category: 'Sci-Fi & Modern',
    color: '#C19A6B',
    startX: 260, startY: 250,
    startVx: 1.4, startVy: -0.8,
    radius: 25,
    aimbot: false,
    spinRate: 0.03,
    type: 'gunslinger',
    hp: 70,
    damage: 10,
    cooldown: 15,
    moveSpeed: 5.0,
    projectileSpeedMultiplier: 1.0,
    ability: 'Dual Revolvers',
    desc: 'Wields dual revolvers on both sides. Active skill fires both guns rapidly.',
  },
  {
    id: 14,
    name: 'Doppelganger',
    category: 'Fantasy & Magic',
    color: '#9b59b6',
    startX: 300, startY: 240,
    startVx: 1.3, startVy: -1.0,
    radius: 25,
    aimbot: false,
    spinRate: 0,
    type: 'doppleganger',
    hp: 100,
    damage: 15,
    cooldown: 45,
    moveSpeed: 5.5,
    projectileSpeedMultiplier: 1.0,
    ability: 'Mirror Image',
    desc: 'Summons illusions of itself every 25% health lost.',
  },
  {
    id: 15,
    name: 'Engineer',
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
    category: 'Fantasy & Magic',
    color: '#E0115F',
    startX: 310, startY: 250,
    startVx: 1.4, startVy: 0.9,
    radius: 25,
    aimbot: false,
    spinRate: 0.05,
    type: 'ruby',
    hp: 90,
    damage: 12,
    cooldown: 40,
    moveSpeed: 4.8,
    projectileSpeedMultiplier: 1.0,
    ability: 'Scythe Dance',
    desc: 'Casting abilities triggers a short dash. Swings and pulls scythe to lifesteal.',
  },
  {
    id: 17,
    name: 'Musashi Miyamoto',
    category: 'Japanese',
    color: '#34495e',
    startX: 290, startY: 240,
    startVx: 1.2, startVy: -1.0,
    radius: 25,
    aimbot: false,
    spinRate: 0.03,
    type: 'musashi',
    hp: 100,
    damage: 10, // (Katana + Wakizashi)
    cooldown: 45,
    moveSpeed: 4.8,
    projectileSpeedMultiplier: 1.0,
    ability: 'Dual Stances',
    desc: 'Switches between five stances (Earth, Water, Fire, Wind, Void) giving passive effects and unique skills.',
  },
  {
    id: 18,
    name: 'Trickster',
    category: 'Fantasy & Magic',
    color: '#03e631ff',
    startX: 310, startY: 230,
    startVx: -1.2, startVy: 1.0,
    radius: 25,
    aimbot: false,
    spinRate: 0.02,
    type: 'trickster',
    hp: 85,
    damage: 12,
    cooldown: 100,
    moveSpeed: 8.2,
    projectileSpeedMultiplier: 1.0,
    ability: 'Spell Steal',
    desc: 'Fires bouncing arcane bolts. Telekinetically lifts and stuns enemies. Ultimate steals the last used enemy skill.',
  },
  {
    id: 19,
    name: 'Zeus',
    category: 'Greek Mythology',
    color: '#00BFFF',
    startX: 300, startY: 250,
    startVx: 1.1, startVy: 0.9,
    radius: 25,
    aimbot: true,
    spinRate: 0,
    type: 'zeus',
    hp: 150,
    damage: 20,
    cooldown: 100,
    moveSpeed: 3.0,
    projectileSpeedMultiplier: 1.0,
    ability: 'Storm Bringer',
    desc: 'Throws chain lightning. Passively shocks melee attackers. Ultimate summons a map-wide thunderstorm.',
  },
  {
    id: 20,
    name: 'Hydra',
    category: 'Fantasy & Magic',
    color: '#4B0082', // Dark Purple
    startX: 300, startY: 250,
    startVx: 0.8, startVy: 0.7,
    radius: 25, // Standard size
    aimbot: false,
    spinRate: 0,
    type: 'hydra',
    hp: 1000, // 5x health
    damage: 8, // Very low base damage. When stealing a weapon, uses the copied fighter's exact damage value.
    cooldown: 0, // Doesn't fire normally
    moveSpeed: 8.5, // Slow
    projectileSpeedMultiplier: 1.0,
    ability: 'The Overdrive',
    desc: 'Extremely tanky. Steals physical weapons upon being hit (copying their exact damage). Passively destroys incoming projectiles. Ultimate grants CC immunity.',
  },
  {
    id: 21,
    name: 'Satoru Gojo',
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
    name: 'Ryomen Sukuna',
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
    name: 'Yuta Okkotsu',
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
    name: 'Toji Fushiguro',
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
    name: 'Aoi Todo',
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
    name: 'Yuji Itadori',
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
    name: 'Saitama',
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
    name: 'Genos',
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
    name: 'Ichigo Kurosaki',
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
    name: 'Mahito',
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
    name: 'Kento Nanami',
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
    name: 'Nobara Kugisaki',
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
    hp: johnWickConfig.hp || 420,
    damage: johnWickConfig.damage || 22,
    cooldown: johnWickConfig.cooldown || 35,
    moveSpeed: johnWickConfig.moveSpeed || johnWickConfig.speed || 6.4,
    projectileSpeedMultiplier: johnWickConfig.projectileSpeedMultiplier || 6.2,
    ability: johnWickConfig.ability || 'C.A.R. Gun-Fu & The Pencil',
    desc: johnWickConfig.desc || 'The Baba Yaga. Master of Center Axis Relock Gun-Fu and ruthless CQC. Passive: Ballistic Tailored Suit resists ranged damage. Wields the custom TTI Pit Viper 9mm and the infamous No. 2 Pencil for armor-piercing assassination takedowns.',
  },
  {
    id: 34,
    name: 'CJ',
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
    name: 'Megumi Fushiguro',
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
    name: 'Uryu Ishida',
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
    name: 'Ulquiorra Cifer',
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
  }
];

// Conditionally add Mahoraga to the arena
if (CONFIG.mahoraga && CONFIG.mahoraga.isAvailableInArena) {
  FIGHTER_DEFS.push({
    id: 100,
    name: 'Mahoraga',
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

export { TACTICAL_FIGHTER_DEFS };

/** Helper function to get active fighter definitions according to active game category ('foc' | 'tactical') */
export function getActiveFighterDefs(category) {
  let cat = category;
  if (!cat && typeof window !== 'undefined' && window.state) {
    if (window.state.gameCategory) {
      cat = window.state.gameCategory;
    } else if (window.state.mode && String(window.state.mode).toLowerCase().startsWith('tactical')) {
      cat = 'tactical';
    }
  }
  return (cat === 'tactical') ? TACTICAL_FIGHTER_DEFS : FIGHTER_DEFS;
}

/** Helper function to get fighter definition by ID */
export function getFighterById(id) {
  const activeDefs = getActiveFighterDefs();
  return activeDefs.find(def => def.id === id) || FIGHTER_DEFS.find(def => def.id === id);
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
const originalWidth = CONFIG.arena.width || 460;
const originalHeight = CONFIG.arena.height || 460;
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

