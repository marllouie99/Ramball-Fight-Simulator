// ─────────────────────────────────────────────
// Aoi Todo — Boogie Woogie Brawler Config
// ─────────────────────────────────────────────
export const todoConfig = {
    // ── Base Attributes ──
    hp: 220,
    speed: 6.5,
    moveSpeed: 6.5,
    r: 25,
    radius: 25,
    color: '#D2691E', // Chocolate / Brown
    themeColor: '#D2691E',
    startX: 300,
    startY: 250,
    startVx: 1.2,
    startVy: 1.0,
    damage: 12,
    cooldown: 60,
    projectileSpeedMultiplier: 1.0,
    ability: 'Boogie Woogie',
    desc: 'Claps hands to swap positions with enemies or cursed rocks. Focuses on disorienting opponents.',

    // Basic Combat & Stats
    baseDamageReduction: 0.05,    // 20% passive damage reduction (Grade 1 Cursed Energy brawler physique)
    zoneDamageReduction: 0.05,    // 35% damage reduction while in the Zone / Black Flash window
    counterStanceDamageReduction: 0.05, // 40% damage reduction during Rock Proximity Counter-Attack sequence
    punchDamage: 15,              // Base damage per melee punch strike
    knockback: 6,                 // Moderate knockback impulse applied on hit
    punchSpeed: 22,               // Animation frames for a smooth punch
    punchRange: 60,               // Additional melee reach distance for reliable basic attacks
    basicPunchCooldown: 20,       // Cooldown in frames between basic punches while waiting for skill sequence (~0.33s)
    basicPunchHitStun: 14,        // Hit-stun frames applied on basic punch hit
    basicPunchSlowDuration: 20,   // Movement stop duration in frames on basic punch hit
    basicPunchSlowMultiplier: 0.0, // 0.0 = 100% stop movement on basic punch hit
    punchScreenShake: 3.5,        // Base arena screen shake intensity on melee punch hit
    blackFlashScreenShake: 2.0,  // Massive arena screen shake on Black Flash punch

    // Skill 1: Boogie Woogie (Clap Teleport & Teammate Rescue)
    clapCooldown: 120,            // Cooldown in frames between Boogie Woogie claps (2.0 seconds at 60fps)
    blackFlashWindow: 45,         // Window in frames after swapping where next punch triggers Black Flash (0.75 seconds)
    vanishDurationFrames: 15,     // Duration in frames (at 60fps) where Todo and swapped entities vanish during swap (~0.05s)
    swapDisorientationFrames: 20, // Attack reaction delay in frames applied to enemies when Todo/partner reappears from a swap (~0.33s)
    evadeBuffDurationFrames: 50,  // Duration in frames (~1.25s) where Todo and teammate gain evasion buff after swap
    evadeChance: 0.60,            // 60% chance to completely evade/miss incoming enemy basic attacks
    disengageDistance: 180,       // Distance teleported away when clapping to take a breather after combo
    disengageDelayFrames: 18,     // Delay in frames after final punch before Todo claps away for breather (~0.3s pause)
    rescueDamageThreshold: 35,    // Cumulative damage taken by teammate in 2.0s window that triggers emergency rescue swap
    rescueHpRatioThreshold: 0.30, // Teammate HP ratio (30%) threshold that triggers emergency rescue swap
    rescueInvulnerableFrames: 45, // Invulnerability frames granted to rescued teammate upon swap (0.75s)
    minTeammateSwapDistance: 140, // Minimum distance in pixels required between Todo and teammate to allow a swap (prevents swapping when close together)
    minRockSwapDistance: 80,      // Minimum distance in pixels required between Todo and cursed rock to allow a swap
    enemyProximitySwapDistance: 130, // Distance to enemy at which Todo or partner triggers Boogie Woogie swap (swaps when either is very close to enemy)

    // Skill 2: Cursed Rock & Sequence Tuning
    maxRocks: 1,                  // Maximum active rocks allowed in arena at any time
    rockCooldown: 180,            // Base cooldown in frames between rock sequence attempts (3.0 seconds at 60fps)
    sequenceCooldown: 180,        // Cooldown in frames after completing a combo disengage before starting next sequence (3.0s)
    rockSpeed: 12,                // Velocity of hurled cursed rock
    rockDamage: 12,               // Impact damage if rock directly hits target
    rockLife: 240,                // Lifetime in frames that rock continues bouncing in arena (4.0 seconds)

    // Rock Proximity Counter-Attack Sequence
    rockCounterCooldown: 600,     // Cooldown in frames (3.0s at 60fps) between Rock Proximity Counter-Attack triggers
    rockProximityTriggerDist: 75, // Distance threshold between rock and enemy that triggers auto-clap teleport
    rockCounterComboHits: 6,      // Number of rapid punches delivered upon teleporting in
    rockCounterComboInterval: 15, // Frames between combo punches during the attack sequence
    rockArrivalPushback: 8.0,     // Initial physics hit pushback applied upon rock proximity arrival
    rockArrivalScreenShake: 2.0,  // Arena screen shake on rock proximity arrival
    rockCounterComboPushback: 4.5, // Intermediate punch physics hit pushback per strike during sequence
    comboPunchScreenShake: 4.5,   // Arena screen shake on intermediate combo flurry punches
    rockCounterFinisherPushback: 30.0, // Final finisher punch physics hit pushback launching enemy back
    finisherScreenShake: 2.0,    // Explosive arena screen shake on final launcher finisher punch
    slowDuration: 60,             // Duration in frames enemy is heavily slowed when Todo teleports to them (1.0 second)
    slowMultiplier: 0.25,         // Speed multiplier during slow (0.25 = 75% movement slow)
    hitStunFrames: 20,            // Hitstun frames applied to enemy on arrival

    // Ultimate Skill: Takada-chan Idol Imagination (530,000 IQ Idol Multiplier)
    ultCooldown: 1200,            // Ultimate cooldown in frames (20.0 seconds at 60fps)
    ultDuration: 3000,            // Ultimate active duration in frames (8.0 seconds at 60fps)
    channelDuration: 180,         // Channeling windup duration in frames (3.0 seconds at 60fps)
    hpThresholdUltTrigger: 0.65,  // HP ratio threshold (0.50 = 50% HP) that automatically triggers Takada-chan ultimate channeling
    enableHpThresholdUlt: true,   // Toggle to enable/disable 50% HP threshold auto-activation
    takadaDamageMultiplier: 1.5,  // 1.5x damage output multiplier on all punches & attacks
    takadaSpeedMultiplier: 1.1,   // 1.5x movement speed boost multiplier
    takadaPunchCooldownMult: 0.2, // 40% faster punches (0.6x cooldown between basic attacks)
    takadaClapCooldownMult: 0.7,  // 50% reduced cooldown for Skill 1 (Boogie Woogie) during ultimate (~1.0s vs 2.0s)

    // ─────────────────────────────────────────────
    // Audio & Sound Effects Configuration
    // ─────────────────────────────────────────────
    // Basic Attacks & Combat SFX
    punchSound: 'Assets/Sound Effects/Attacks/punch.mp3',   // Melee punch sound effect
    punchVolume: 2.8,                                       // Punch SFX volume
    punchNoiseSounds: [
      'Assets/Sound Effects/Skills/todo-punch-noise.mp3',
      'Assets/Sound Effects/Skills/todo-punch-noise2.mp3'
    ],
    punchNoiseVolume: 3.5,                                  // Punch grunt/noise volume
    punchNoiseChance: 0.20,                                  // 50% chance to play punch noise on basic attack

    // Rock Proximity Counter-Attack Voicelines
    comboVoiceSounds: [
      'Assets/Sound Effects/Skills/todo-combo-voiceline.mp3',
      'Assets/Sound Effects/Skills/todo-combo-voiceline2.mp3'
    ],
    comboVoiceVolume: 3.8,                                  // Combo flurry voiceline volume
    comboVoiceChance: 1.00,                                  // 50% chance to play combo voiceline on Rock Proximity Counter-Attack

    // Skill 1: Boogie Woogie Clap SFX
    clapSound: 'Assets/Sound Effects/Skills/todo-clap.mp3', // Boogie Woogie clap sound effect
    clapVolume: 3.0,                                        // Clap SFX volume
    clapFadeDurationMs: 300,                                // Smooth fade-out duration in ms for clap SFX after impact

    // Teammate Swap Voicelines
    brotherVoiceSound: 'Assets/Sound Effects/Skills/todo-brother-voiceline.mp3', // Todo teammate swap voice line ("Brother!")
    brotherVoiceVolume: 2.5,                                                     // Swap voice line volume
    brotherVoiceChance: 0.05,                                                    // 15% probability to trigger "Brother!" voice line on swap

    // Victory Voicelines
    victoryVoiceSound: 'Assets/Sound Effects/SkillEffects/todo-voiceline-mybestfriend.mp3', // Todo victory voice line ("MY BEST FRIEND!")
    victoryVoiceVolume: 3.0,                                                                // Victory voice line volume

    // Ultimate: Takada-chan Voicelines & BGM
    takadaChannelingVoiceline: 'Assets/Sound Effects/Skills/todo-tadakaimagination-voiceline.mp3', // 3.0s channeling voice line
    takadaChannelingVoiceVolume: 1.0,                              // Channeling voice line volume
    takadaBackgroundSong: 'Assets/Sound Effects/Skills/todo-tadaka-background-song.mp3',           // Takada idol BGM (fades in & out)
    takadaBackgroundSongVolume: 0.1 ,                               // Background song volume
    takadaSongFadeInMs: 4500,     // Ultra smooth fade-in duration in ms (3.5s) so music swells gently under voiceline
    takadaSongFadeOutMs: 2500,    // Smooth fade-out duration in ms (2.5s) at end of ultimate
    takadaDeathSongFadeOutMs: 1200 // Smooth fade-out duration in ms (1.2s) when Todo dies during ultimate/channeling
};
