// ─────────────────────────────────────────────
// Yuji Itadori — The Black Flash Brawler Config
// ─────────────────────────────────────────────
export const yujiConfig = {
  bossTitle: 'Tiger of West Junior High',
  title: 'Tiger of West Junior High',

  // ── Base Attributes ──
  hp: 200,
  speed: 6.0,
  moveSpeed: 6.5,
  r: 25,
  radius: 25,
  color: '#D95C7E', // Deep pink JJK uniform
  themeColor: '#D95C7E',
  startX: 300,
  startY: 250,
  startVx: 1.2,
  startVy: 1.0,
  damage: 6,
  cooldown: 18,
  projectileSpeedMultiplier: 1.0,
  ability: 'Black Flash',
  desc: 'Attacks with black flash.',

  // Passive DEF Stats (Damage Reduction)
  baseDamageReduction: 0.20,              // 5% passive damage reduction (enhanced cursed energy physique)
  blackFlashZoneDamageReduction: 0.20,    // 15% damage reduction while in the Black Flash zone
  soulSwapDamageReduction: 0.20,          // 25% damage reduction while Sukuna Soul Swap is active

  // Basic Attack: Cursed Energy Punch
  punchDamage: 6,               // Base damage per melee punch
  knockback: 6,                 // Knockback impulse on punch hit
  punchSpeed: 25,               // Animation frames for a standard punch
  punchRange: 50,               // Additional melee reach (90° arc brawler)
  basicPunchCooldown: 28,       // Cooldown in frames between basic punches (~0.46s)

  // Skill 1: Divergent Fist Dash — Gap-closing supersonic rush into punch
  divergentDashCooldown: 240,   // Cooldown in frames between dashes (4.0s at 60fps)
  divergentDashRange: 280,      // Max trigger distance for dash (px)
  divergentDashMinRange: 60,    // Min distance to initiate dash (prevents dashing when already in point-blank melee)
  divergentDashSpeed: 16.0,     // Supersonic dash velocity
  divergentDashMaxDuration: 20, // Max frames dash can persist before safety timeout
  divergentDashSound: 'Assets/Sound Effects/Skills/dash3.mp3',
  divergentDashVolume: 0.85,

  // Passive: Divergent Fist — Delayed shockwave after each punch
  shockwaveDelay: 6,            // Frames after impact before shockwave fires
  shockwaveDamage: 10,           // Damage of the delayed cursed energy shockwave (Total punch = 6 + 4 = 10)
  shockwaveRadius: 40,          // Shockwave blast radius

  // Core Mechanic: Black Flash Buildup
  blackFlashThreshold: 4,       // Hits required to trigger Black Flash
  blackFlashMultiplier: 5.5,    // Damage multiplier on Black Flash trigger (6 * 2.5 = 15 punch + 4 shockwave = 19)
  blackFlashKnockback: 14,      // Knockback on Black Flash hit
  blackFlashResetOnMiss: true,  // Charge resets if a punch whiffs
  blackFlashDuration: 300,      // Duration in frames Yuji maintains the Black Flash state (~5s)
  blackFlashZoneMaxHits: 4,     // Maximum Black Flash punches allowed within the zone duration
  blackFlashZonePunchSpeed: 35, // Animation frames for a standard punch inside the Zone
  blackFlashZonePunchCooldown: 24, // Cooldown in frames between basic punches inside the Zone

  // Skill 2: Reverse Cursed Technique (RCT) — Passive
  rctHealPercent: 0.20,         // Percentage of max HP restored upon reverting from Sukuna transformation

  // Ultimate: Soul Swap — Sukuna Takes Over
  soulSwapHpThreshold: 0.50,       // Triggers when HP drops to 30% or below
  soulSwapDuration: 500,            // Duration of Soul Swap in frames (~1.67 seconds of free Dismantle combat at 60fps)
  soulSwapDamageMultiplier: 2.0,   // Damage multiplier while Sukuna is active
  soulSwapBlackFlashThreshold: 2,  // Black Flash triggers after only 2 hits during Soul Swap
  soulSwapSpeedMultiplier: 1.15,   // Movement speed boost during Soul Swap
  soulSwapDismantleCooldown: 30,   // Fire rate / cooldown in frames between basic attack Dismantles during Soul Swap (lower = faster fire rate, e.g. 15 = rapid fire, 24 = ~0.4s at 60fps)
  soulSwapDismantleFireRate: 30,   // Fire rate alias for soulSwapDismantleCooldown
  soulSwapRapidSlashHits: 10,       // Number of rapid 360° slash-teleport strikes Sukuna unleashes before Fuga
  soulSwapLandingDelay: 8,         // Frames Sukuna lands and aims at target before unleashing Cleave (~133ms)
  soulSwapSlashRecovery: 10,       // Frames of slash follow-through recovery before next teleport (~166ms)
  soulSwapRapidSlashCooldown: 25,  // Pacing frames between each slash-teleport strike
  soulSwapFugaChargeMax: 85,       // Frames to channel Fuga flaming arrow construct (~1.4s)
  soulSwapFugaRecovery: 40,        // Recoil recovery frames after releasing Fuga arrow
  soulSwapFugaDamage: 220,         // Nuke damage of Soul Swap Fuga arrow
  soulSwapHealPercent: 0.50,       // Percentage of max HP restored to Yuji upon swapping back after the slashes
  soulSwapCooldown: 99999,         // Once per match only

  // Soul Swap Arena Overlay
  enableSoulSwapOverlay: true,                          // Toggle to enable/disable Yuji Soul Swap arena overlay
  soulSwapOverlayPath: 'Assets/Overlays/Yuji-soulswap-overlay.png', // Arena overlay PNG
  soulSwapOverlayAlpha: 0.68,                           // Semi-transparent opacity of Sukuna markings overlay inside arena
  soulSwapDimOpacity: 0.85,                             // Full-screen dark cursed crimson dim opacity
  soulSwapOverlayZoom: 1.05,                            // Proportional scaling factor for markings within arena
  soulSwapOverlayOffsetX: 0,                            // Horizontal offset in arena
  soulSwapOverlayOffsetY: 0,                            // Vertical offset in arena

  //----------------------------------AUDIO CONFIG-----------------------------------------//

  // Audio
  punchSound: 'Assets/Sound Effects/Attacks/punch.mp3',
  punchVolume: 2.5,
  punchSounds: [
    'Assets/Sound Effects/Attacks/yuji-noise1.mp3',
    'Assets/Sound Effects/Attacks/yuji-noise2.mp3',
    'Assets/Sound Effects/Attacks/yuji-noise3.mp3'
  ],
  punchSoundsVolume: 1.5,
  punchSoundsChance: 0.15, // 5% chance to play voice noises on basic attack

  // Black Flash Entrance Audio
  blackFlashEnterSound: 'Assets/Sound Effects/Skills/yuji-blackflash.mp3',
  blackFlashEnterVolume: 2.0,
  blackFlashEnterDelay: -0.10, // Delay in milliseconds before playing the sound
  blackFlashNoiseChance: 0.05, // 5% chance to play the voiceline on Black Flash

  // Transformation Audio
  transformationSound: 'Assets/Sound Effects/Skills/yuji-transformation.mp3',
  transformationVolume: 2.0,
  transformationDelay: 0,

  // Victory Voice Line (Team victory with Todo)
  victoryVoiceSound: 'Assets/Sound Effects/SkillEffects/yuji-voiceline-bestfriend.mp3',
  victoryVoiceVolume: 0.0,
};
