// ─────────────────────────────────────────────
// Kento Nanami — 7:3 Ratio Sorcerer Config
// ─────────────────────────────────────────────

export const nanamiConfig = {
  bossTitle: '7:3 Ratio Sorcerer',
  title: '7:3 Ratio Sorcerer',

  // Base Attributes
  hp: 195,
  speed: 5.5,
  moveSpeed: 6.5,
  r: 25,
  radius: 25,
  color: '#D4AF37', // Refined Golden Sand / Warm Ochre
  themeColor: '#D4AF37',
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.0,
  damage: 7,
  cooldown: 55,
  projectileSpeedMultiplier: 1.0,
  ability: 'Ratio Technique (7:3)',
  desc: 'Wields a cloth-wrapped blunt cleaver. Passive: 7:3 Ratio Technique deals guaranteed True Damage critical strikes and fractures enemy defense. Enters Overtime under 40% HP or after 25s for a 120% cursed energy surge.',

  // Passive: Overtime (Jigai)
  overtimeThresholdSeconds: 25,     // Activates after 25s elapsed in the round
  overtimeHpThreshold: 0.40,        // Or when HP drops below 40%
  overtimeDamageMultiplier: 1.20,   // Balanced +20% damage boost
  overtimeSpeedMultiplier: 1.20,    // +20% move speed boost
  overtimeSpeechWalkDuration: 105,  // Duration (frames @ 60fps) to walk calmly towards enemy while finishing speech (~1.75s)
  overtimeSpeechWalkSpeed: 2.0,     // Calm steady walk speed during speech
  overtimeDamageReduction: 0.15,    // 15% incoming damage mitigation
  overtimeGuaranteedCritCooldown: 150, // 2.5s recharge between 100% auto-crits
  overtimeBaseCritChance: 0.25,     // 25% ratio crit chance on standard swings while recharging (balanced from frequent triggers)
  overtimeCritInternalCooldown: 90, // 1.5s internal cooldown between ratio crits during Overtime
  overtimeDimEnabled: true,         // Atmospheric dark golden-amber full-screen dimming active during Overtime
  overtimeDimColor: '#FFD700',      // Radiant Pure Gold theme color
  overtimeGoldenGlowColor: '#FFE150', // Brilliant Champagne Gold radiance theme
  overtimeDimOpacity: 0.94,         // Cinematic radiant golden gradient dim theme opacity level

  // Passive: Ratio Technique (7:3 — Shichisan no Jutsu)
  ratioCritMultiplier: 2.0,         // 2.0x True Damage in Standard shift
  overtimeRatioCritMultiplier: 1.80,// 1.8x True Damage in Overtime (prevents multiplicative one-shots)
  ratioBaseCritChance: 0.15,        // 15% base ratio critical rate in standard shift (balanced from 30%)
  ratioSweetSpotMaxBonus: 0.15,     // Up to +15% bonus critical chance when cleanly aligning strike on the sweet-spot center angle (15% -> 30% max)
  ratioSweetSpotPrecisionThreshold: 0.75, // Alignment ratio (>= 75% center precision) for triggering the '7:3 SWEET SPOT!' visual surge
  ratioCritInternalCooldown: 120,   // 2.0s (120 frames) internal cooldown between 7:3 Ratio Critical hits in Standard shift
  ratioAngleTolerance: 0.20,        // Angular window tolerance for hitting ratio sweet spot
  armorFractureDuration: 180,       // 3.0s duration (frames at 60fps)
  armorFractureBonusDamage: 0.20,   // +20% bonus incoming damage on fractured enemies

  // Hit-Pause & Cinematic Impact Pause on Ratio Critical Hit
  ratioCritHitPauseFrames: 30,      // Cinematic freeze frames on 7:3 Ratio Critical hit (~0.50s)
  ratioHitPauseKnockback: 16,       // Base physical knockback applied upon pause completion
  ratioHitPauseLungeKnockback: 30,  // Physical knockback applied upon lunge pause completion
  ratioHitPauseUnpauseShake: 6.0,   // Unpause impact screen shake intensity
  ratioHitPauseUnpauseShakeDuration: 14, // Unpause impact screen shake duration (frames)
  ratioUnpauseBloodParticles: 14,   // Blood particles burst bursting out of enemy on unpause
  enableRatioDimScreen: true,       // Dark cinematic vignette dimming during crit hit-pause
  enableRatioRulerOverlay: true,    // Tilted 7:3 measurement ruler & anime blood rupture overlay
  ratioDimOpacity: 0.94,            // High-contrast cinematic darkness level

  // Primary Melee: Blunt Cleaver Chop (Frontal Arc — Rule 7)
  cleaverRange: 65,                 // 65px melee reach
  cleaverArc: (130 * Math.PI) / 180,// 130° frontal arc
  cleaverDamage: 7,                 // Base chop damage
  cleaverCooldown: 50,              // Frames between swings (~0.92s)
  cleaverKnockback: 16,             // Base physical knockback force

  // Skill 1: Decisive Strike / Ratio Lunge (Shichisan Issen)
  lungeCooldown: 500,               // 7.0s (420 frames)
  lungeDamage: 14,                  // Base path cleave damage
  lungeCritDamage: 36,              // 36 True Damage on 7:3 Critical primary hit
  lungeDistance: 180,               // 180px dash travel distance
  lungeDuration: 16,                // 16 frames travel time
  lungeSpeed: 15.25,                // Dash travel speed (px per frame, e.g. 180 / 16 = 11.25)
  lungeStunDuration: 30,            // 0.5s hit-stun on hit
  lungeKnockback: 16,               // Primary target physical knockback force
  lungePathKnockback: 10,           // Secondary / path target knockback force
  lungeCooldownRefundMultiplier: 0.50, // 50% cooldown reduction on kill or during Overtime
  lungeMinRange: 0,                 // AI trigger minimum distance (0px allows point-blank and medium range execution)
  lungeMaxRange: 260,               // AI trigger maximum distance

  // Skill 2: Collapse (Tōka / Falling Rubble)
  collapseCooldown: 600,            // 10.0s (600 frames)
  collapseRadius: 200,              // 200px AOE shockwave
  collapseDamage: 24,               // 24 AOE Damage
  collapseSlowDuration: 150,        // 2.5s slowdown (150 frames)
  collapseSlowAmount: 0.40,         // 40% movement speed reduction
  collapseWindupFrames: 14,         // Downward slam windup duration (frames)
  collapseKnockback: 30,            // Physical blast knockback force
  collapseMinRange: 0,              // AI trigger minimum distance
  collapseMaxRange: 50,            // AI trigger maximum distance (guarantees target is inside 200px shockwave radius!)
  collapseScreenShake: 6.0,         // Screen tremor intensity
  collapseShakeDuration: 18,        // Screen tremor duration (frames)
  collapseDebrisCount: 16,          // Number of concrete rubble fragments
  collapseCraterDuration: 45,       // Shockwave visual persistence duration (frames)

  // Ultimate: 4-Fold Black Flash Blitz (Kokusen Renpatsu)
  ultimateCooldown: 1800,           // 25.0s (1500 frames)
  ultimateVoicelineChannelDuration: 75, // Voiceline channeling/windup duration (frames) before voiceline ends
  ultimatePostVoicelineDelay: 15,   // Delay frames after voiceline finishes before triggering the 1st Black Flash strike
  ultimateMaxStrikes: 4,            // 4 consecutive Black Flash strikes
  ultimateStrikeDamage: 14,         // 14 True Damage x 3 initial strikes = 42
  ultimateFinisherDamage: 34,       // 34 True Damage finisher = 76 total HP True Damage
  ultimateStrikeInterval: 18,       // Frames between blitz strikes
  ultimateMaxRange: 260,            // Execution range
  ultimateScreenShake: 7.5,         // Initial screen shake intensity
  ultimateScreenShakeDuration: 22,  // Initial screen shake duration
  ultimateFinisherShake: 8.5,       // Finisher screen shake intensity
  ultimateFinisherShakeDuration: 24,// Finisher screen shake duration
  ultimateFinisherKnockback: 22,    // Finisher knockback force (ricochets into wall)
  ultimateStrikeKnockback: 12,      // Flank strike knockback sliding force
  ultimateTargetHitPause: 16,       // Target hit-pause per flank strike (frames)
  ultimateFinisherHitPause: 30,     // Target hit-pause for finisher strike (frames)
  ultimateTargetHitStun: 16,        // Target hit-stun per flank strike (frames)
  ultimateFinisherHitStun: 36,      // Target hit-stun for finisher strike (frames)
  ultimateAuraDuration: 90,         // Spatial rift aura duration (frames)
  armorFractureDuration: 240,       // 4.0s Armor Fracture debuff (240 frames)
  armorFractureBonusDamage: 0.20,   // +20% bonus damage taken

  // Audio configuration, volume & timing delay adjustments (delays measured in frames @ 60fps)
  sounds: {
    cleaverSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    attackNoiseSounds: [
      'Assets/Sound Effects/Attacks/nanami-attack-noise1.mp3',
      'Assets/Sound Effects/Attacks/nanami-attack-noise2.mp3',
      'Assets/Sound Effects/Attacks/nanami-attack-noise3.mp3'
    ],
    ratioCrit: 'Assets/Sound Effects/Skills/dash1.mp3',
    ratioRulerSpin: 'Assets/Sound Effects/Skills/dash1.mp3',
    ratioBloodSplash: 'Assets/Sound Effects/Skills/nanami-bloodsplash.mp3',
    lungeDash: 'Assets/Sound Effects/Skills/dash2.mp3',
    collapseSlam: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
    collapseVoiceline: 'Assets/Sound Effects/Skills/nanami-collapse-voiceline.mp3',
    collapseVoicelineSounds: [
      'Assets/Sound Effects/Skills/nanami-collapse-voiceline.mp3',
      'Assets/Sound Effects/Skills/nanami-collapse-voiceline2.mp3'
    ],
    blackFlashImpact: 'Assets/Sound Effects/Skills/blackflash1.mp3',
    blackFlashVoiceline: 'Assets/Sound Effects/Skills/nanami-blackflash-voiceline.mp3',
    overtimeVoiceline: 'Assets/Sound Effects/Skills/nanami-overtime-voiceline.mp3'
  },
  soundVolumes: {
    cleaverSwing: 0.95,
    attackNoise: 3.2,
    ratioCrit: 1.20,
    ratioRulerSpin: 0.3,
    ratioBloodSplash: 0.3,
    lungeDash: 1.10,
    collapseSlam: 1.30,
    collapseVoiceline: 3.5,
    blackFlashImpact: 1.40,
    blackFlashVoiceline: 3.5,
    overtimeVoiceline: 3.5
  },
  soundChances: {
    attackNoise: 0.20 // 45% chance to play attack grunt/noise on basic chop
  },
  soundDelays: {
    cleaverSwing: 0,
    attackNoise: 0,
    ratioCrit: 0,
    ratioRulerSpin: 0,       // Frame delay for ruler spin SFX (0 frames = instant on hit-pause start)
    ratioBloodSplash: 9,     // Frame delay for blood splash SFX (9 frames = 30% into 30-frame pause, synchronized with visual burst)
    lungeDash: 0,
    collapseSlam: 0,
    collapseVoiceline: 0,
    blackFlashImpact: 0,
    blackFlashVoiceline: 0,
    overtimeVoiceline: 0
  }
};
