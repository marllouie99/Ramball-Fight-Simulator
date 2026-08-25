// ─────────────────────────────────────────────
// Saitama — The Caped Baldy Config
// ─────────────────────────────────────────────

export const saitamaConfig = {
  // Base stats
  hp: 420,
  moveSpeed: 6.0,
  color: '#F5C400', // Bright Safety Yellow body
  hudNameColor: '#FF2A2A', // Red HUD Fighter Name
  hudSkillBarColor: '#FF2A2A', // Red HUD Skill Progress Bars
  damageNumberColor: '#FF2A2A', // Red Floating Damage Numbers
  radius: 25,

  // Basic Attack: Normal Punch
  punchDamage: 100, // Massive basic attack damage
  punchKnockback: 100, // Massive knockback force
  punchReach: 80,
  punchArcAngle: Math.PI * 0.5, // 90 degree arc angle
  punchCooldown: 500, // ~0.5s cooldown
  punchWindup: 0,
  punchWindupFrames: 0,
  punchMaxTime: 22,                // Smooth punch animation frames
  shockwaveRadius: 60,
  shockwaveKnockback: 12,          // Concussive shockwave knockback force
  wallPinDurationFrames: 20,       // Duration (frames) enemy stays pinned to wall on hit (~1.0s at 60fps)
  wallBounceSlowFrames: 120,       // Duration (frames) movement slow lasts after wall pin (~2.0s at 60fps)
  wallBounceSlowMultiplier: 0.35,   // Speed multiplier during slow debuff (35% speed)
  wallCrackScale: 0.45,            // Size scale of wall crack decal (smaller)
  wallCrackThickness: 0.35,        // Thickness scale of crack lines (thinner)
  disableWallPinCyanOverlay: true, // Remove electric cyan freeze overlay when enemy is pinned to wall
  punchScreenShakeIntensity: 12,   // Arena screen shake intensity on basic attack punch hit
  punchScreenShakeDuration: 10,    // Arena screen shake duration (frames) on basic attack punch hit
  punchFrontalReach: 420,          // Frontal supersonic shockwave blast reach (px) on normal punch
  punchFrontalArc: Math.PI * 0.65, // Frontal shockwave blast cone angle on normal punch
  wallPinScreenShakeIntensity: 30,  // Arena screen shake intensity on wall pin impact
  wallPinScreenShakeDuration: 12,  // Arena screen shake duration (frames) on wall pin impact

  // Skill 1: Consecutive Normal Punches
  flurryDamage: 30,                 // Damage per rapid punch hit
  flurryHitCount: 10,               // 10 rapid consecutive normal punches
  flurryHitInterval: 4,             // Frames between consecutive punch hits (~0.066s)
  flurryReach: 95,                  // Range of flurry punches
  flurryArcAngle: Math.PI * 0.65,   // ~117-degree frontal cone (Rule #8)
  flurryDashOffset: 25,             // Distance offset when dashing to target
  flurryForwardSlideSpeed: 4.5,     // Forward slide step (px) Saitama advances on each punch
  flurryPushbackPerHit: 7.0,        // Backward push distance (px) applied to enemy on each punch
  flurryFinalSlamDamage: 50,        // Final devastating finisher punch
  flurryFinalSlamKnockback: 65,     // Heavy knockback on final blow
  flurryFinalFrontalReach: 560,     // Frontal supersonic shockwave blast reach (px) on flurry final punch
  flurryFinalFrontalArc: Math.PI * 0.70, // Frontal shockwave blast cone angle on flurry final punch
  flurryCooldown: 1000,              // Cooldown frames at 60fps
  flurryTriggerDistance: 260,       // AI trigger distance threshold
  flurryInitialHitPauseFrames: 20,  // Target hit-pause on flurry start
  flurryHoldHitPauseFrames: 8,      // Target hit-pause during flurry cycle
  flurryScreenShakeIntensity: 14,   // Screen shake on final punch
  flurryScreenShakeDuration: 10,

  // Skill 2: Serious Side Hops
  sideHopsCooldown: 420, // 7 seconds at 60fps
  sideHopsDistance: 100,

  // Ultimate: Serious Punch
  seriousPunchWindupFrames: 90, // 1.5 seconds at 60fps
  seriousPunchDamage: 999, // True damage one-shot
  seriousPunchBeamWidth: 80,
  seriousPunchCooldown: 2700, // 45 seconds at 60fps

  // Passive: Hero for Fun
  boredomStackInterval: 300, // 5 seconds at 60fps
  boredomMaxStacks: 5,
  boredomDamagePerStack: 0.15, // +15% per stack

  // Passive: Caped Baldy Reflexes (Dodge Teleport)
  dodgeChance: 0.50, // probability (0-1) of successfully dodging incoming attacks
  dodgeDistance: 100, // Short sidestep distance (left/right)
  dodgeCooldown: 1, // Minimum frames (~0.06s) between dodge sidesteps
  attackerTeleportChaseDelayFrames: 5, // Delay (frames) applied to teleporting chasers (Gojo/Sukuna) when Saitama dodges (~0.5s)

  // Passive: Serious Skill Counter (Teleport Behind Punch)
  counterTriggerDistance: 320,     // Max range threshold (px) within which Saitama can trigger Serious Skill Counter
  counterPunchDamageMultiplier: 20.0, // Damage multiplier based on Normal Punch basic attack (20.0x = 2000 damage with 100 base punchDamage)
  counterPunchMultiplier: 20.0,    // Alias multiplier
  counterFrontalReach: 750,        // Long frontal shockwave blast reach (px)
  counterFrontalArc: (135 * Math.PI) / 180, // Wide 135-degree frontal shockwave cone arc
  counterFrontalCollateralDamage: 650, // Damage dealt to collateral enemies caught in the wide long frontal blast
  counterWindupFrames: 50,        // Frames Saitama waits before teleporting (reaction delay)
  counterTeleportIdleFrames: 10,  // Frames Saitama stands completely still (staring) after teleporting before starting the charge
  counterTeleportDistanceOffset: 35, // Distance offset behind enemy (guarantees Saitama never overlaps the enemy's body)
  counterPunchPoseFrames: 100,     // Frames Saitama holds the punch pose before it lands (increased to 1.5s so effects are visible)
  counterPunchKnockback: 50,      // Knockback force applied to the target on punch landing
  counterPunchHitPauseFrames: 10, // Frames the target is frozen after the punch lands
  counterPunchSlowFrames: 120,    // Slow debuff duration after punch (~2s at 60fps)
  counterPunchSlowMultiplier: 0.35, // Slow debuff strength (35% speed — staggering)
  counterPunchRecoveryFrames: 65, // Frames Saitama stands still after landing (post-punch stall)
  counterDodgeLockFrames: 20,      // Dodge cooldown after counter execution
  skillPunishCooldown: 2000,       // Cooldown between consecutive counter punches (2000 frames ~33.3s at 60fps)
  initialSkillPunishCooldown: 2500, // Cooldown at the start of the round before first counter is available (2000 frames)
  counterPunchScreenShakeIntensity: 100.0, // Intensity of the screen shake
  counterPunchScreenShakeFrames: 30,     // Duration of the screen shake
  counterPunchVoiceEnabled: true,
  counterPunchChargingEnabled: true,
  counterPunchImpactEnabled: true,

  // Audio configuration, volume & timing delay adjustments (delays measured in frames @ 60fps)
  sounds: {
    punchSwing: 'Assets/Sound Effects/Attacks/punch.mp3',
    attackNoiseSounds: [
      'Assets/Sound Effects/Attacks/saitama-attack-noise1.mp3',
      'Assets/Sound Effects/Attacks/saitama-attack-noise2.mp3',
      'Assets/Sound Effects/Attacks/saitama-attack-noise3.mp3'
    ],
    punchImpact: 'Assets/Sound Effects/Skills/saitama-seriouspunch-impact.mp3',
    dodgeSFX: 'skill_dash3',
    dodgeNoiseSounds: [
      'Assets/Sound Effects/Skills/saitama-dodge-noise1.mp3',
      'Assets/Sound Effects/Skills/saitama-dodge-noise2.mp3',
      'Assets/Sound Effects/Skills/saitama-dodge-noise3.mp3'
    ],
    flurryPunchSFX: 'Assets/Sound Effects/Attacks/heavypunch1.mp3',
    flurryHeavyPunchSFXList: [
      'Assets/Sound Effects/Attacks/heavypunch1.mp3',
      'Assets/Sound Effects/Attacks/heavypunch2.mp3',
      'Assets/Sound Effects/Attacks/heavypunch3.mp3'
    ],
    flurryFinalImpactSFX: 'Assets/Sound Effects/Attacks/explosion.mp3',
    flurryDashSFX: 'skill_dash3',
    counterDashSFX: 'skill_dash5',
    counterPunchVoiceSFX: 'Assets/Sound Effects/Skills/saitama-seriouspunch-voiceline.mp3',
    counterPunchChargingSFX: 'Assets/Sound Effects/Skills/saitama-seriouspunch-charging.mp3',
    counterPunchImpactSFX: 'Assets/Sound Effects/Skills/saitama-seriouspunch-impact.mp3',
    championVoiceline: 'Assets/Sound Effects/SkillEffects/saitama-champion-voiceline.mp3'
  },
  soundVolumes: {
    punchSwing: 2.8,
    attackNoise: 2.5,
    punchImpact: 2.0,
    dodgeSFX: 0.85,
    dodgeNoise: 2.5,
    flurryPunch: 2.0,
    flurryFinalImpact: 2.2,
    flurryDash: 0.9,
    counterDash: 1.0,
    counterPunchVoice: 3.0,
    counterPunchCharging: 1.0,
    counterPunchImpact: 1.0,
    championVoiceline: 2.0
  },
  soundChances: {
    attackNoise: 0.40, // 40% chance to play attack grunt/noise on basic punch
    dodgeNoise: 0.35   // 35% chance to play dodge grunt/noise on dodge teleport
  },
  soundDelays: {
    attackNoise: 0,
    dodgeNoise: 0,
    punchSwing: 0,
    dodgeSFX: 0,
    flurryDash: 0,
    counterDash: 0,
    counterPunchVoice: 0,
    counterPunchCharging: 0,
    counterPunchImpact: 0,
    championVoiceline: 0,
    punchImpactFadeDelayMs: 350,
    punchImpactFadeDurationMs: 900
  },

  // Flat backward-compatibility audio mappings
  championVoiceline: 'Assets/Sound Effects/SkillEffects/saitama-champion-voiceline.mp3',
  championVoiceVolume: 3.5,
  punchImpactSFX: 'Assets/Sound Effects/Attacks/explosion.mp3',
  punchImpactVolume: 2.0,
  punchImpactFadeDelayMs: 350,
  punchImpactFadeDurationMs: 900,
  flurryPunchSFX: 'Assets/Sound Effects/Attacks/heavypunch1.mp3',
  flurryHeavyPunchSFXList: [
    'Assets/Sound Effects/Attacks/heavypunch1.mp3',
    'Assets/Sound Effects/Attacks/heavypunch2.mp3',
    'Assets/Sound Effects/Attacks/heavypunch3.mp3'
  ],
  flurryPunchVolume: 2.0,
  flurryFinalImpactSFX: 'Assets/Sound Effects/Attacks/explosion.mp3',
  flurryFinalImpactVolume: 2.2,
  counterPunchImpactSFX: 'Assets/Sound Effects/Skills/saitama-seriouspunch-impact.mp3',
  counterPunchImpactVolume: 1.0,
  counterPunchVoiceSFX: 'Assets/Sound Effects/Skills/saitama-seriouspunch-voiceline.mp3',
  counterPunchVoiceVolume: 3.0,
  counterPunchChargingSFX: 'Assets/Sound Effects/Skills/saitama-seriouspunch-charging.mp3',
  counterPunchChargingVolume: 1.0,
  attackNoiseSounds: [
    'Assets/Sound Effects/Attacks/saitama-attack-noise1.mp3',
    'Assets/Sound Effects/Attacks/saitama-attack-noise2.mp3',
    'Assets/Sound Effects/Attacks/saitama-attack-noise3.mp3'
  ],
  attackNoiseChance: 0.40,
  attackNoiseVolume: 2.5,
  dodgeNoiseSounds: [
    'Assets/Sound Effects/Skills/saitama-dodge-noise1.mp3',
    'Assets/Sound Effects/Skills/saitama-dodge-noise2.mp3',
    'Assets/Sound Effects/Skills/saitama-dodge-noise3.mp3'
  ],
  dodgeNoiseChance: 0.35,
  dodgeNoiseVolume: 2.5
};
