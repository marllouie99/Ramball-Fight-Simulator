// ─────────────────────────────────────────────
// Yuji Itadori — The Black Flash Brawler Config
// ─────────────────────────────────────────────
export const yujiConfig = {
  // ── Base Attributes ──
  hp: 230,
  speed: 7.0,
  moveSpeed: 7.0,
  r: 25,
  radius: 25,
  color: '#D95C7E', // Deep pink JJK uniform
  themeColor: '#D95C7E',
  startX: 300,
  startY: 250,
  startVx: 1.2,
  startVy: 1.0,
  damage: 18,
  cooldown: 18,
  projectileSpeedMultiplier: 1.0,
  ability: 'Black Flash',
  desc: 'Attacks with black flash.',

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
  blackFlashMultiplier: 2.5,    // Damage multiplier on Black Flash trigger
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
  baseComboDashSpeed: 15.5,     // Velocity speed during standard Divergent Fist dash
  soulSwapComboDashRange: 350,  // Extended dash engagement range while in Soul Swap mode
  soulSwapComboRushCooldown: 180, // Cooldown in frames for combo rush while in Soul Swap mode
  soulSwapDashSpeed: 22.0,      // Supersonic dash speed while in Soul Swap mode

  // Skill 2: Reverse Cursed Technique (RCT) — Passive
  rctHealPercent: 0.25,         // Percentage of max HP restored upon reverting from Sukuna transformation

  // Ultimate: Soul Swap — Sukuna Takes Over
  soulSwapHpThreshold: 0.30,       // Triggers when HP drops to 30% or below
  soulSwapDuration: 800,           // Duration of Soul Swap in frames (8 seconds at 60fps)
  soulSwapDamageMultiplier: 1.5,   // All damage multiplied while active
  soulSwapBlackFlashThreshold: 2,  // Black Flash triggers after only 2 hits during Soul Swap
  soulSwapSpeedMultiplier: 1.3,    // Movement speed boost during Soul Swap
  soulSwapRapidSlashHits: 16,      // Number of rapid 360° slash-teleport strikes Sukuna unleashes immediately on takeover
  soulSwapRapidSlashCooldown: 26,  // Pacing frames between each slash-teleport strike (~0.27s, exact Sukuna flurry timing)
  soulSwapHealPercent: 0.30,       // Percentage of max HP restored to Yuji upon swapping back after the 12 slashes
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
  victoryVoiceVolume: 3.5,
};
