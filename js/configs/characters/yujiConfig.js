// ─────────────────────────────────────────────
// Yuji Itadori — The Black Flash Brawler Config
// ─────────────────────────────────────────────
export const yujiConfig = {
  // Basic Attack: Cursed Energy Punch
  punchDamage: 18,              // Base damage per melee punch
  knockback: 7,                 // Knockback impulse on punch hit
  punchSpeed: 25,               // Animation frames for a standard punch
  punchRange: 50,               // Additional melee reach (90° arc brawler)
  basicPunchCooldown: 35,       // Cooldown in frames between basic punches (~0.3s)

  // Passive: Divergent Fist — Delayed shockwave after each punch
  shockwaveDelay: 6,            // Frames after impact before shockwave fires
  shockwaveDamage: 10,          // Damage of the delayed cursed energy shockwave
  shockwaveRadius: 40,          // Shockwave blast radius

  // Core Mechanic: Black Flash Buildup
  blackFlashThreshold: 4,       // Hits required to trigger Black Flash
  blackFlashMultiplier: 1.5,    // Damage multiplier on Black Flash trigger
  blackFlashKnockback: 20,      // Knockback on Black Flash hit
  blackFlashResetOnMiss: true,  // Charge resets if a punch whiffs
  blackFlashDuration: 300,      // Duration in frames Yuji maintains the Black Flash state (~5s)
  blackFlashZoneMaxHits: 4,     // Maximum Black Flash punches allowed within the zone duration
  blackFlashZonePunchSpeed: 35, // Animation frames for a standard punch inside the Zone
  blackFlashZonePunchCooldown: 30, // Cooldown in frames between basic punches inside the Zone



  // Skill 1: Divergent Fist Combo Rush
  comboCooldown: 400,           // Cooldown in frames before Rush can be used again (~6.67s)
  comboHits: 6,                 // Number of rapid punches in the combo sequence
  comboDamage: 12,              // Damage per combo punch (each also triggers Divergent Fist)
  comboInterval: 30,            // Frames between each combo punch (~0.17s)
  comboDashRange: 200,          // Max range from which Yuji will dash into the target

  // Skill 2: Reverse Cursed Technique (RCT)
  rctHealPercent: 0.15,         // Percentage of max HP restored on use
  rctCooldown: 1500,             // Long cooldown in frames (15 seconds) — once per round effectively
  rctChannelDuration: 45,       // Frames Yuji must stand still channeling (~0.75s)
  rctHpThreshold: 0.20,         // Auto-trigger RCT when HP drops to or below 25%

  // Ultimate: Soul Swap — Sukuna Takes Over
  soulSwapHpThreshold: 0.30,       // Triggers when HP drops to 25% or below
  soulSwapDuration: 500,           // Duration of Soul Swap in frames (8 seconds at 60fps)
  soulSwapDamageMultiplier: 1.5,   // All damage multiplied while active
  soulSwapBlackFlashThreshold: 2,  // Black Flash triggers after only 2 hits during Soul Swap
  soulSwapSpeedMultiplier: 1.3,    // Movement speed boost during Soul Swap
  soulSwapCooldown: 99999,         // Once per match only










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
  punchSoundsChance: 0.5, // 50% chance to play the voice noises on basic attack

  // Black Flash Entrance Audio
  blackFlashEnterSound: 'Assets/Sound Effects/Skills/yuji-blackflash.mp3',
  blackFlashEnterVolume: 2.0,
  blackFlashEnterDelay: -0.10, // Delay in milliseconds before playing the sound

  // Transformation Audio
  transformationSound: 'Assets/Sound Effects/Skills/yuji-transformation.mp3',
  transformationVolume: 2.0,
  transformationDelay: 0,
};
