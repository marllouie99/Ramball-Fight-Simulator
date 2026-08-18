// ─────────────────────────────────────────────
// Kento Nanami — 7:3 Ratio Sorcerer Config
// ─────────────────────────────────────────────

export const nanamiConfig = {
  // Base Attributes
  hp: 420,
  speed: 5.3,
  r: 25,
  color: '#D4AF37', // Refined Golden Sand / Warm Ochre

  // Passive: Overtime (Jigai)
  overtimeThresholdSeconds: 25,     // Activates after 25s elapsed in the round
  overtimeHpThreshold: 0.40,        // Or when HP drops below 40%
  overtimeDamageMultiplier: 1.25,   // Balanced +25% damage boost
  overtimeSpeedMultiplier: 1.20,    // +20% move speed boost
  overtimeSpeechWalkDuration: 105,  // Duration (frames @ 60fps) to walk calmly towards enemy while finishing speech (~1.75s)
  overtimeSpeechWalkSpeed: 2.0,     // Calm steady walk speed during speech
  overtimeDamageReduction: 0.15,    // 15% incoming damage mitigation
  overtimeGuaranteedCritCooldown: 150, // 2.5s recharge between 100% auto-crits
  overtimeBaseCritChance: 0.45,     // 45% ratio crit chance on standard swings while recharging

  // Passive: Ratio Technique (7:3 — Shichisan no Jutsu)
  ratioCritMultiplier: 2.0,         // 2.0x True Damage in Standard shift
  overtimeRatioCritMultiplier: 1.80,// 1.8x True Damage in Overtime (prevents multiplicative one-shots)
  ratioBaseCritChance: 0.30,        // 30% base ratio critical rate in standard shift
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
  cleaverDamage: 22,                // Base chop damage
  cleaverCooldown: 40,              // Frames between swings (~0.92s)
  cleaverKnockback: 16,             // Base physical knockback force

  // Skill 1: Decisive Strike / Ratio Lunge (Shichisan Issen)
  lungeCooldown: 200,               // 7.0s (420 frames)
  lungeDamage: 38,                  // Base path cleave damage
  lungeCritDamage: 95,              // 95 True Damage on 7:3 Critical primary hit
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
  collapseDamage: 45,               // 45 AOE Damage
  collapseSlowDuration: 150,        // 2.5s slowdown (150 frames)
  collapseSlowAmount: 0.40,         // 40% movement speed reduction
  collapseWindupFrames: 14,         // Downward slam windup duration (frames)
  collapseKnockback: 30,            // Physical blast knockback force
  collapseMinRange: 0,              // AI trigger minimum distance
  collapseMaxRange: 180,            // AI trigger maximum distance (guarantees target is inside 200px shockwave radius!)
  collapseScreenShake: 6.0,         // Screen tremor intensity
  collapseShakeDuration: 18,        // Screen tremor duration (frames)
  collapseDebrisCount: 16,          // Number of concrete rubble fragments
  collapseCraterDuration: 45,       // Shockwave visual persistence duration (frames)

  // Ultimate: 4-Fold Black Flash Blitz (Kokusen Renpatsu)
  ultimateCooldown: 1800,           // 25.0s (1500 frames)
  ultimateVoicelineChannelDuration: 75, // Voiceline channeling/windup duration (frames) before voiceline ends
  ultimatePostVoicelineDelay: 15,   // Delay frames after voiceline finishes before triggering the 1st Black Flash strike
  ultimateMaxStrikes: 4,            // 4 consecutive Black Flash strikes
  ultimateStrikeDamage: 30,         // 30 True Damage x 3 initial strikes = 90
  ultimateFinisherDamage: 60,       // 60 True Damage finisher = 150 total HP True Damage
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
