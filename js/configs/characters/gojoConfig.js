// ─────────────────────────────────────────────
// Gojo Satoru — Limitless Fighter Configuration
// ─────────────────────────────────────────────
export const gojoConfig = {
  // ── Base Attributes ──
  hp: 200,
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
  damage: 12,
  cooldown: 80,
  projectileSpeedMultiplier: 6.0,
  ability: 'Limitless',
  desc: 'Uses Blue to pull and Reversal Red to repel. Hollow Purple pierces everything, and Unlimited Void stuns all enemies.',

  // ── 1. Limitless Infinity Passive Barrier ──
  infinityCooldown: 100,                   // Recharge cooldown in frames before Infinity barrier reactivates after blocking
  infinityActiveDuration: 100,              // Frames Infinity continues to block multiple attacks after first impact
  infinityOnlyActiveInRangedMode: true,     // Infinity barrier is ONLY active in Ranged Mode; disabled in Melee Mode
  infinityRadius: 120,                      // Distance (in pixels from center) for Limitless Infinity barrier detection
  infinityFreezeChance: 0.9,               // Chance (0.0 to 1.0) to freeze incoming projectiles/slashes
  infinityFreezeDuration: 100,             // Duration in frames projectiles stay suspended mid-air on barrier contact
  infinityMeleePushForce: 12.5,            // Physical velocity impulse (rebound force) applied to push melee attackers away
  infinitySlowDuration: 45,                // Duration in frames (0.75s) of brief movement slow on barrier contact
  infinitySlowMultiplier: 0.50,            // Movement speed multiplier while slowed by Infinity barrier (50% speed)
  infinitySlowRange: 100,                  // Proximity distance (pixels) beyond barrier where approaching enemies get slowed
  infinitySlowMinMultiplier: 0.20,         // Maximum slow strength (20% speed / 80% slow) reached right against the barrier
  infinityMaxFrozenProjectiles: 2,        // Max limit of frozen projectiles allowed simultaneously to prevent FPS drops

  // ── 2. Basic Attack & Movement (Cursed Technique Lapse: Blue) ──
  blueCooldown: 40,         // Fire rate for basic attack (Blue orb) - Lower is faster
  blueSpeed: 10.5,          // Speed of Blue orb projectile
  blueRadius: 100,           // Pull radius & base size of Blue projectile (scaling blueRadius dynamically adjusts Blue projectile size)
  blueProjectileRadius: 10,  // Base visual & collision radius of Blue projectile orb (at default blueRadius: 50)
  blueScale: 1.5,           // Explicit scale multiplier for Blue projectile visual size and hitbox
  bluePullForce: 0.5,       // Pull strength of Blue
  modeSwitchBreatherDuration: 45, // Breather pause (frames) when Gojo switches to Ranged/Blue mode (~0.75s)
  interruptCooldown: 270,   // Penalty cooldown in frames (~4.5s) applied to a skill when interrupted

  // ── 3. Skill: Cursed Technique Reversal: Red ──
  redCooldown: 1000,         // Cooldown of Red (frames)
  redDamage: 100,            // Base damage dealt by Reversal Red blast
  redKnockback: 25,         // Knockback force of Red
  redRange: 100,            // Base range
  redTriggerRange: 80,     // Range in pixels to trigger Red against enemies
  redBlastRadius: 400,      // Explosive blast wave radius in pixels that repels enemies on detonation
  redTotalFrames: 75,       // Total frames for full Red animation (~1.25s at 60fps)
  redBuildupFrames: 100,     // Frames of orb manifestation before detonation
  redSlowDuration: 120,     // Frames the post-detonation slow lasts (~2s at 60fps)
  redSlowMultiplier: 0.35,  // Speed multiplier while slowed by Red (35% of normal)
  redShakeIntensity: 10,    // Heavy screen shake intensity on Red detonation
  redShakeDuration: 25,     // Duration of screen shake on Red detonation

  // ── 4. Secret Technique: Hollow Purple (100% & 200% Empowered Cast) ──
  purpleCooldown: 1500,      // Cooldown of Hollow Purple
  purpleChargeMax: 120,     // Frames required to mix Red and Blue into Purple (channeling duration)
  purpleDamage: 70,         // Continuous piercing damage per tick
  purpleSpeed: 6,           // Speed of Purple orb
  purpleRadius: 50,         // Radius of Purple orb
  purpleLife: 250,         // How long Purple orb stays in arena (frames)
  purpleTravelTime: 20,    // Frames the orb travels before stopping
  purpleDPS: 150,            // Damage per second dealt to enemies inside the orb
  purpleDPSInterval: 10,   // Frames between DPS ticks
  purpleSlowDuration: 60,  // Frames the slow effect lasts
  purpleSlowMultiplier: 0.5, // Speed multiplier while slowed
  purplePullRadius: 300,   // Radius in pixels for gravitational pull field around Hollow Purple
  purplePullForce: 9.5,    // How strongly enemies and illusions are dragged toward orb center
  purpleShakeIntensity: 4, // Screen shake intensity when purple orb fires
  purpleShakeDuration: 20,  // Screen shake duration when purple orb fires
  // 200% Empowered Second Cast Mechanics
  enablePurpleSecondCastBoost: true,        // Enable 200% damage boost on 2nd Hollow Purple cast
  purpleSecondCastDamageMultiplier: 2.0,   // Damage multiplier for 2nd cast (2.0 = 200%)
  purpleSecondCastChargeMax: 180,           // Channeling duration in frames for 200% Hollow Purple (~3.0s at 60fps)
  purpleSecondCastTextBanner: '200% HOLLOW PURPLE!', // Floating text displayed on 2nd cast release
  purpleSecondCastTextHeader100: 'PURPLE 100%',     // Skill HUD bar label for 100% cast
  purpleSecondCastTextHeader200: 'PURPLE 200%',     // Skill HUD bar label for 200% cast

  // ── 5. Ultimate: Domain Expansion (Unlimited Void) ──
  domainCooldown: 2000,     // 20s Ultimate cooldown
  domainChargeMax: 130,     // 2s Channeling duration before domain opens
  domainDuration: 400,      // Domain lasts 3 seconds (paralyzes enemies)
  domainDeployAudioFrame: 80, // Frame during channeling when gojodomaindeploy.mp3 plays
  domainExpansionAudioDelay: 10, // Frames after domain deployment when gojodomainexpansion.mp3 plays

  // ── 6. Reverse Cursed Technique (RCT) Healing ──
  enableRCTHeal: true,                     // Enable Gojo's Reverse Cursed Technique healing
  reverseCursedTechniqueHpThreshold: 0.25, // Triggers RCT when HP drops to 25% or below
  reverseCursedTechniqueHealAmount: 500,   // Flat HP healed per RCT trigger
  reverseCursedTechniqueCooldown: 700,     // 15 second cooldown between RCT heals
  rctChannelDuration: 90,                  // 1.5 second channeling heal window
  enablePassiveRctRegen: false,            // Passive continuous regen disabled
  passiveRctHealRate: 0,                   // Disabled
  rctRevivalHealAmount: 150,               // Flat HP restored on emergency revival

  // ── 7. Melee Mode & Hand-to-Hand Martial Arts ──
  closeRangeRadius: 220,            // Proximity distance (pixels) to enter Melee Mode
  initialMeleeDuration: 250,        // Active melee clash duration in frames (120 frames = 2.0 seconds at 60fps)
  meleeModeCooldown: 150,           // Mandatory ranged separation cooldown in frames (120 frames = 2.0 seconds at 60fps)
  comboDisengageDistance: 280,      // Distance (pixels) teleported away when disengaging after clash
  meleePunchDamage: 14,             // Damage dealt per martial arts punch strike
  meleePunchCooldown: 9,            // Frames between consecutive punches during flurry (~0.15s at 60fps)
  teleportSpeed: 15,                // Teleport movement slide speed

  // ── 8. Teleport Dodge & Evasion Mechanics ──
  teleportDodgeChance: 0.10,               // Chance to teleport dodge incoming attacks
  teleportDodgeCooldown: 90,               // Frames (1.5 seconds) between teleport dodges
  teleportDodgeDistance: 85,               // Distance teleported on dodge

  // ── 9. Audio Configuration, Volume & Delays (Organized same as Nanami) ──
  sounds: {
    // Basic Attack & Martial Arts Melee
    blueOrb: 'Assets/Sound Effects/Attacks/spaceshot.mp3',
    meleePunch: 'Assets/Sound Effects/Attacks/punch.mp3',
    teleportDash: 'Assets/Sound Effects/Skills/dash3.mp3',

    // Passive: Limitless Infinity Barrier
    infinityCollide: 'Assets/Sound Effects/SkillEffects/infinity-collide.mp3',

    // Skill 1: Cursed Technique Reversal: Red
    redChanneling: 'Assets/Sound Effects/Skills/redchanneling.mp3',
    redCharging: 'Assets/Sound Effects/Skills/redcharging.mp3',
    redDeploy: 'Assets/Sound Effects/Skills/reddeploy.mp3',
    redBlast: 'Assets/Sound Effects/Skills/redblast.mp3',

    // Skill 2: Secret Technique: Hollow Purple
    purpleCharge: 'Assets/Sound Effects/Skills/mixing.mp3',
    purpleFlare: 'Assets/Sound Effects/Skills/dash3.mp3',
    purpleDeploy: 'Assets/Sound Effects/Skills/purpledeploy.mp3',
    purpleFire: 'Assets/Sound Effects/Skills/hollowpurple.mp3',

    // Ultimate: Domain Expansion (Unlimited Void — Muryōkūsho)
    domainChannel: 'Assets/Sound Effects/Skills/gojodomain.mp3',
    domainExpansion: 'Assets/Sound Effects/Skills/gojodomainexpansion.mp3',
    domainActivate: 'Assets/Sound Effects/Skills/gojodomaindeploy.mp3',

    // Reverse Cursed Technique (RCT) Healing
    reverseCursedTechnique: 'Assets/Sound Effects/Skills/repair.mp3'
  },
  soundVolumes: {
    blueOrb: 0.60,
    meleePunch: 1.80,
    teleportDash: 0.80,
    infinityCollide: 1.00,
    redChanneling: 1.50,
    redCharging: 2.00,
    redDeploy: 2.00,
    redBlast: 1.50,
    purpleCharge: 3.00,
    purpleFlare: 0.85,
    purpleDeploy: 2.50,
    purpleFire: 1.00,
    domainChannel: 3.00,
    domainExpansion: 3.00,
    domainActivate: 3.00,
    reverseCursedTechnique: 1.00
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

