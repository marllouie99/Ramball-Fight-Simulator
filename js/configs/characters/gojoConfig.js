// ─────────────────────────────────────────────
// Gojo Satoru — Limitless Fighter Configuration
// ─────────────────────────────────────────────
export const gojoConfig = {
  // ── 1. Limitless Infinity Passive Barrier ──
  infinityCooldown: 100,                   // Recharge cooldown in frames before Infinity barrier reactivates after blocking
  infinityActiveDuration: 100,              // Frames Infinity continues to block multiple attacks after first impact
  infinityOnlyActiveInRangedMode: true,     // Infinity barrier is ONLY active in Ranged Mode; disabled in Melee Mode
  infinityRadius: 120,                      // Distance (in pixels from center) for Limitless Infinity barrier detection
  infinityFreezeChance: 0.5,               // Chance (0.0 to 1.0) to freeze incoming projectiles/slashes
  infinityFreezeDuration: 100,             // Duration in frames projectiles stay suspended mid-air on barrier contact
  infinityMeleePushForce: 8.5,             // Physical velocity impulse (rebound force) applied to push melee attackers away
  infinitySlowDuration: 45,                // Duration in frames (0.75s) of brief movement slow on barrier contact
  infinitySlowMultiplier: 0.50,            // Movement speed multiplier while slowed by Infinity barrier (50% speed)
  infinityMaxFrozenProjectiles: 2,        // Max limit of frozen projectiles allowed simultaneously to prevent FPS drops

  // ── 2. Basic Attack & Movement (Cursed Technique Lapse: Blue) ──
  blueCooldown: 40,         // Fire rate for basic attack (Blue orb) - Lower is faster
  blueSpeed: 10.5,           // Speed of Blue orb projectile
  blueRadius: 50,           // Pull radius of Blue explosion
  bluePullForce: 0.5,       // Pull strength of Blue
  modeSwitchBreatherDuration: 45, // Breather pause (frames) when Gojo switches to Ranged/Blue mode (~0.75s)
  interruptCooldown: 270,   // Penalty cooldown in frames (~4.5s) applied to a skill when interrupted

  // ── 3. Skill: Cursed Technique Reversal: Red ──
  redCooldown: 500,         // Cooldown of Red (frames)
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
  purpleCooldown: 1000,      // Cooldown of Hollow Purple
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
  purplePullRadius: 360,   // Radius in pixels for gravitational pull field around Hollow Purple
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
  domainCooldown: 1500,     // 20s Ultimate cooldown
  domainChargeMax: 130,     // 2s Channeling duration before domain opens
  domainDuration: 400,      // Domain lasts 3 seconds (paralyzes enemies)
  domainDeployAudioFrame: 80, // Frame during channeling when gojodomaindeploy.mp3 plays
  domainExpansionAudioDelay: 10, // Frames after domain deployment when gojodomainexpansion.mp3 plays

  // ── 6. Reverse Cursed Technique (RCT) Healing ──
  enableRCTHeal: true,                     // Enable Gojo's Reverse Cursed Technique healing
  reverseCursedTechniqueHpThreshold: 0.25, // Triggers RCT when HP drops to 25% or below
  reverseCursedTechniqueHealPercent: 0.25, // Heals 20% of max HP per RCT trigger
  reverseCursedTechniqueCooldown: 700,     // 15 second cooldown between RCT heals
  rctChannelDuration: 90,                  // 1.5 second channeling heal window
  enablePassiveRctRegen: false,            // Passive continuous regen disabled
  passiveRctHealRate: 0,                   // Disabled
  rctRevivalHealPercent: 0.30,             // Restores 30% max HP on emergency revival

  // ── 7. Melee Mode & Hand-to-Hand Martial Arts ──
  initialMeleeDuration: 100, // Forces hand-to-hand combat for the initial duration
  meleeModeCooldown: 300,   // 10 second cooldown before hand-to-hand combat mode can trigger again
  closeRangeRadius: 180,    // Distance at which Gojo switches to melee mode
  meleePunchDamage: 14,     // Damage dealt by each punch
  meleePunchCooldown: 9,   // Frames between punches
  teleportDelay: 5,        // Frames delay before teleport after punch
  teleportSpeed: 15,        // Speed of teleport movement
  forcedMeleeIntroDuration: 200,           // Forced melee clash at start of round
  meleeModeSeparationCooldown: 200,        // Mandatory ranged separation after combo disengage
  comboDisengageDistance: 300,             // Distance teleported away on combo finisher

  // ── 8. Teleport Dodge & Evasion Mechanics ──
  teleportDodgeChance: 0.10,               // Chance to teleport dodge incoming attacks
  teleportDodgeCooldown: 90,               // Frames (1.5 seconds) between teleport dodges
  teleportDodgeDistance: 85,               // Distance teleported on dodge
};
