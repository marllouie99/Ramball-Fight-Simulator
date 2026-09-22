// ─────────────────────────────────────────────
// Gojo Satoru — Limitless Fighter Boss Config
// ─────────────────────────────────────────────
import { baseBossConfig } from './baseBossConfig.js';

export const gojoBossConfig = {
  ...baseBossConfig,

  // ── Boss Presentation & Metadata ──
  bossTitle: 'The Honored One',
  bossSubtitle: 'LIMITLESS JUJUTSU SORCERER — SATORU GOJO',
  entranceAuraColor: '#00F0FF',
  entranceRippleRings: 4,
  entranceFlashDuration: 22,

  // ── Base Attributes ──
  hp: 2700,
  speed: 5.5,
  moveSpeed: 5.5,
  r: 25,
  radius: 25,
  color: '#E0FFFF', // Light Cyan
  themeColor: '#E0FFFF',
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 0.9,
  damage: 6,
  cooldown: 80,
  projectileSpeedMultiplier: 6.0,
  ability: 'Limitless',
  desc: 'Uses Blue to pull and Reversal Red to repel. Hollow Purple pierces everything, and Unlimited Void stuns all enemies.',

  // ── 1. Limitless Infinity Passive Barrier ──
  infinityCooldown: 100,                   // Recharge cooldown in frames before Infinity barrier reactivates after blocking
  infinityActiveDuration: 100,             // Frames Infinity continues to block multiple attacks after first impact
  infinityOnlyActiveInRangedMode: true,    // Infinity barrier is ONLY active in Ranged Mode; disabled in Melee Mode
  infinityRadius: 80,                      // Distance (in pixels from center) for Limitless Infinity barrier detection
  infinityFreezeChance: 0.5,              // Chance (0.0 to 1.0) to freeze incoming projectiles/slashes
  infinityFreezeDuration: 100,            // Duration in frames projectiles stay suspended mid-air on barrier contact
  infinityMeleePushForce: 0,              // No pushback impulse on barrier contact; slows movement instead
  infinitySlowDuration: 20,               // Duration in frames (~0.33s) of movement slow on barrier contact
  infinitySlowMultiplier: 0.10,           // Movement speed multiplier while slowed by Infinity barrier (35% speed)
  infinitySlowRange: 100,                 // Proximity distance (pixels) beyond barrier where approaching enemies get slowed
  infinitySlowMinMultiplier: 0.05,        // Maximum slow strength reached right against the barrier
  infinityMaxFrozenProjectiles: 2,        // Max limit of frozen projectiles allowed simultaneously
  infinityShockwaveCooldownFrames: 6,     // Minimum frames between barrier rebound shockwave ring spawns
  infinityMaxActiveShockwaves: 2,         // Max limit of concurrent active barrier shockwave rings
  infinityBounceForce: 5,                 // Knockback velocity force applied to enemies on Infinity barrier collision
  
  // ── 2. Basic Attack & Movement (Cursed Technique Lapse: Blue) ──
  blueCooldown: 300,        // Fire rate for basic attack (Blue orb)
  blueSpeed: 10.5,          // Speed of Blue orb projectile
  blueRadius: 50,           // Pull radius & base size of Blue projectile
  blueProjectileRadius: 15, // Base visual & collision radius of Blue projectile orb
  blueScale: 1.5,           // Explicit scale multiplier for Blue projectile visual size and hitbox
  bluePullForce: 0.1,       // Pull strength of Blue
  blueDPS: 10,              // Continuous damage per second dealt to enemies caught in Blue's gravitational vortex
  blueDPSInterval: 10,      // Frames between DPS ticks
  blueParalyzeDuration: 15, // Duration in frames of Paralyze debuff applied while caught in Blue field
  blueWallLingerDuration: 50,// Frames Blue orb stays pinned on the wall after colliding
  modeSwitchBreatherDuration: 45, // Breather pause when Gojo switches to Ranged/Blue mode
  interruptCooldown: 270,   // Penalty cooldown in frames applied to a skill when interrupted

  // ── 3. Skill: Cursed Technique Reversal: Red ──
  redCooldown: 1000,        // Cooldown of Red (frames)
  redDamage: 100,           // Base damage dealt by Reversal Red blast
  redKnockback: 10,         // Supersonic knockback force of Red
  redRange: 650,            // Base range
  redFrontalReach: 650,     // Long frontal reach corridor in pixels
  redFrontalArc: 0.40,      // Frontal cone angle in radians
  redTriggerRange: 350,     // Range in pixels to trigger Red against enemies
  redBlastRadius: 650,      // Frontal blast reach in pixels
  redVerticalDetectionAngle: Math.PI * 0.08,
  redVerticalCorridorHalfWidth: 40,
  redHorizontalDetectionAngle: Math.PI * 0.08,
  redHorizontalCorridorHalfHeight: 100,
  redDetectionAngle: Math.PI * 0.08,
  redTotalFrames: 125,      // Total frames for full Red animation
  redBuildupFrames: 100,    // Frames of orb manifestation before detonation
  redSlowDuration: 120,     // Frames the post-detonation slow lasts
  redSlowMultiplier: 0.35,  // Speed multiplier while slowed by Red
  redChannelTurnRate: 0.045,// Smooth aim rotation turn rate while channeling Reversal Red
  redShakeIntensity: 14,    // Heavy screen shake intensity on Red detonation
  redShakeDuration: 25,     // Duration of screen shake on Red detonation
  redDimOpacity: 0.94,      // Opacity of the full-screen Reversal Red dim effect
  redDimColor: '#060002',   // Deep obsidian-crimson tone of the Red dim backdrop

  // ── 4. Secret Technique: Hollow Purple (100% & 200% Empowered Cast) ──
  purpleCooldown: 1500,     // Cooldown of Hollow Purple
  purpleChargeMax: 100,     // Frames required to mix Red and Blue into Purple
  purpleChannelTurnRate: 0.045, // Smooth aim rotation turn rate while channeling Hollow Purple
  purpleDamage: 35,         // Continuous piercing damage per tick
  purpleSpeed: 6,           // Speed of Purple orb
  purpleRadius: 50,         // Radius of Purple orb
  purpleLife: 200,          // How long Purple orb stays in arena
  purpleTravelTime: 20,     // Frames the orb travels before stopping
  purpleDPS: 35,            // Damage per second dealt to enemies inside the orb
  purpleDPSInterval: 10,    // Frames between DPS ticks
  purpleSlowDuration: 60,   // Frames the slow effect lasts
  purpleSlowMultiplier: 0.20,// Speed multiplier while slowed
  purplePullRadius: 150,    // Radius in pixels for gravitational pull field around Hollow Purple
  purplePullForce: 20.5,    // How strongly enemies and illusions are dragged toward orb center
  purpleShakeIntensity: 4,  // Screen shake intensity when purple orb fires
  purpleShakeDuration: 20,  // Screen shake duration when purple orb fires
  purpleExplosionDamage: 100,// Blast explosion damage when Hollow Purple detonates upon expiring
  purpleExplosionRadius: 280,// Blast explosion radius in pixels
  purpleExplosionKnockback: 10,
  purpleExplosionShakeIntensity: 8,
  purpleExplosionShakeDuration: 30,
  purpleRecoveryDuration: 100,
  purpleRetreatDistance: 260,
  purpleHorizontalDetectionAngle: Math.PI * 0.08,
  purpleHorizontalCorridorHalfHeight: 40,
  purpleDimOpacity: 0.95,
  purpleDimColor: '#04000a',
  purple200DimOpacity: 0.98,
  enablePurpleSecondCastBoost: true,
  purpleSecondCastDamageMultiplier: 5.0,
  purpleSecondCastChargeMax: 120,
  purpleSecondCastTextBanner: '200% HOLLOW PURPLE!',
  purpleSecondCastTextHeader100: 'PURPLE 100%',
  purpleSecondCastTextHeader200: 'PURPLE 200%',

  // ── 5. Ultimate: Domain Expansion (Unlimited Void) ──
  domainCooldown: 2000,     // 20s Ultimate cooldown
  domainChargeMax: 130,     // 2s Channeling duration before domain opens
  domainDuration: 300,      // Domain lasts ~6.6 seconds
  domainDeployAudioFrame: 80,
  domainExpansionAudioDelay: 10,
  domainPostSlowDuration: 180,
  domainPostSlowMultiplier: 0.35,
  domainPunchDamageMultiplier: 1.0,

  // ── 6. Reverse Cursed Technique (RCT) Healing ──
  enableRCTHeal: true,
  reverseCursedTechniqueHpThreshold: 0.10,
  reverseCursedTechniqueHealPercent: 0.50,
  reverseCursedTechniqueCooldown: 1500,
  rctChannelDuration: 90,
  enablePassiveRctRegen: false,
  passiveRctHealRate: 0,
  rctRevivalHealAmount: 150,

  // ── 7. Melee Mode & Hand-to-Hand Martial Arts ──
  closeRangeRadius: 110,
  initialMeleeDuration: 100,
  meleeModeCooldown: 300,
  comboDisengageDistance: 100,
  meleePunchDamage: 6,
  meleePunchCooldown: 16,
  meleePunchAnimDuration: 15,
  meleeTeleportAngle: 1.75,
  teleportSpeed: 15,

  // ── 8. Teleport Dodge & Evasion Mechanics (Disabled) ──
  teleportDodgeChance: 0.0,
  teleportDodgeCooldown: 90,
  teleportDodgeDistance: 85,

  // ── 9. Audio Configuration, Volume & Delays ──
  sounds: {
    blueOrb: 'Assets/Sound Effects/Attacks/spaceshot.mp3',
    meleePunch: 'Assets/Sound Effects/Attacks/punch.mp3',
    teleportDash: 'Assets/Sound Effects/Skills/dash3.mp3',
    infinityCollide: 'Assets/Sound Effects/SkillEffects/infinity-collide.mp3',
    redChanneling: 'Assets/Sound Effects/Skills/redchanneling.mp3',
    redCharging: 'Assets/Sound Effects/Skills/redcharging.mp3',
    redDeploy: 'Assets/Sound Effects/Skills/reddeploy.mp3',
    redBlast: 'Assets/Sound Effects/Skills/redblast.mp3',
    purpleCharge: 'Assets/Sound Effects/Skills/mixing.mp3',
    purpleFlare: 'Assets/Sound Effects/Skills/dash3.mp3',
    purpleDeploy: 'Assets/Sound Effects/Skills/purpledeploy.mp3',
    purpleFire: 'Assets/Sound Effects/Skills/hollowpurple.mp3',
    domainChannel: 'Assets/Sound Effects/Skills/gojodomain.mp3',
    domainExpansion: 'Assets/Sound Effects/Skills/gojodomainexpansion.mp3',
    domainActivate: 'Assets/Sound Effects/Skills/gojodomaindeploy.mp3',
    reverseCursedTechnique: 'Assets/Sound Effects/Skills/repair.mp3'
  },
  soundVolumes: {
    blueOrb: 0.35,
    meleePunch: 0.90,
    teleportDash: 0.45,
    infinityCollide: 0.55,
    redChanneling: 2.50,
    redCharging: 2.50,
    redDeploy: 2.50,
    redBlast: 0.80,
    purpleCharge: 2.50,
    purpleFlare: 0.45,
    purpleDeploy: 2.50,
    purpleFire: 0.55,
    domainChannel: 2.70,
    domainExpansion: 2.70,
    domainActivate: 2.70,
    reverseCursedTechnique: 0.55
  },
  soundDelays: {
    blueOrb: 0,
    meleePunch: 0,
    teleportDash: 0,
    infinityCollide: 0,
    redChanneling: 0,
    redCharging: 0,
    redDeploy: 0,
    redBlast: 0,
    purpleCharge: -0.10,
    purpleFlare: 0,
    purpleDeploy: 0,
    purpleFire: 0,
    domainChannel: 0,
    domainExpansion: 0,
    domainActivate: -0.10,
    reverseCursedTechnique: 0
  }
};
