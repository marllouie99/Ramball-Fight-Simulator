export const genosConfig = {
  // Base Stats
  hp: 320,
  moveSpeed: 5.2,
  color: '#FF5500', // Incineration Orange
  radius: 25,

  // Basic Attack: Incineration Palms (Ranged Fire Blasts)
  blastDamage: 14,
  blastRange: 350,
  blastSpeed: 20,
  blastAoeRadius: 35,
  blastCooldown: 27, // ~0.45s at 60fps

  // Basic Attack Ammo & Stance System (Ranged Incineration Fireballs -> Melee Punches)
  maxHeatAmmo: 20,          // Maximum ranged fireball capacity before switching to melee mode
  ammoReloadFrames: 500,    // Reload cooldown duration (300 frames = 5.0 seconds at 60fps)
  maxMeleeDashes: 10,        // Maximum thruster dashes allowed during Melee Mode
  meleePunchDamage: 16,    // Base damage per melee punch in Melee Mode
  meleePunchReach: 65,     // Melee punch reach distance (px)
  meleePunchCooldown: 15,  // Cooldown between melee punches (~0.3s)

  // Skill 1: Machine Gun Blows (Flurry)
  initialFlurryCooldown: 1200,  // Starts on cooldown at match start (~8.0s at 60fps)
  flurryDamage: 10,
  flurryHitCount: 15,
  flurryReach: 65,
  flurryArcAngle: Math.PI * 0.5, // 90 degree arc
  flurryCooldown: 1200, // Cooldown duration between uses
  flurryTriggerRange: 280, // AI engagement range (px) to initiate Machine Gun Blows

  // Dash System (Unified tuning for all Genos thruster dashes)
  dashes: {
    // Skill 2: Rocket Stomp & Dash
    rocketDash: {
      cooldown: 360,     // 6 seconds at 60fps
      distance: 200,     // Distance of the dash (px)
      duration: 18,      // 0.3s dash duration (frames)
      speed: 0.25,       // Easing interpolation step per frame (0.25 = 25% smooth step)
      stompDamage: 30,   // Ground stomp damage on landing
      stompRadius: 75,   // Ground stomp radius (px)
      stompKnockback: 14, // Push velocity applied to targets caught in stomp
      triggerRange: 120, // AI distance threshold (px) to trigger Rocket Stomp
    },
    // Melee Stance Thruster Dash
    meleeThrusterDash: {
      speedMultiplier: 3.4, // Speed multiplier boost during melee wall dash
      durationFrames: 18,   // Duration of thruster boost (frames)
    },
    // Skill 1 Flurry Dash
    flurryDashOffset: 25,   // Stopping offset distance from opponent target (px)
    // After-image Thruster Ghost Trail
    afterImageMax: 5,        // Max simultaneous afterimages
    afterImageDuration: 14,  // Frames each afterimage persists
  },

  // Backwards compatibility aliases
  dashCooldown: 360,
  dashDistance: 200,
  dashDuration: 18,
  dashSpeed: 0.25,
  stompDamage: 30,
  stompRadius: 75,
  stompKnockback: 14,
  meleePunchKnockback: 9.0,
  blastProjectileRadius: 9,

  // Ultimate: Spiral Incineration Cannon
  initialUltCooldown: 1500, // Initial cooldown at match start (28s at 60fps)
  ultCooldown: 800, // 28 seconds at 60fps
  ultWindupFrames: 60, // 1.0s windup
  ultDurationFrames: 120, // 2.0s beam duration
  ultDamagePerTick: 15,
  ultTickInterval: 6, // 10 ticks per second (300 total damage)
  ultBeamWidth: 60,
  ultBeamRange: 1200, // 1200px beam range across full arena (matches Hyperion's beam length)
  ultKnockbackForce: 8, // Directional beam push speed (prevents hyper-accel rebounce)
  ultSlowMultiplier: 0.45, // Speed multiplier for targets caught in beam (0.45 = 45% speed allows moving a little)
  ultBeamCenterPull: 0.04, // Axis alignment pull strength (0.04 allows enemies to steer/move inside beam)
  ultTriggerMinRange: 180, // AI minimum distance to initiate beam
  ultTriggerMaxRange: 450, // AI maximum distance to initiate beam

  // Ultimate Screen Shake & Recovery Tuning
  ultWindupShakeIntensity: 0,   // Windup channeling shake intensity (0 = disabled)
  ultWindupShakeDuration: 0,    // Windup channeling shake duration in frames
  ultBlastShakeIntensity: 6.0,  // Initial beam release shake intensity
  ultBlastShakeDuration: 12,   // Initial beam release shake duration in frames
  ultFiringShakeIntensity: 2.5, // Continuous beam firing loop shake intensity
  ultFiringShakeDuration: 4,    // Continuous beam firing loop shake duration in frames
  ultRecoveryFrames: 45,        // Post-beam smoke cooling & recovery duration in frames (45 = 0.75s)
  postUltDashCooldown: 60,      // Grace period cooldown in frames (1.0s) before Genos can dash after recovery
  postUltFlurryCooldown: 60,    // Grace period cooldown in frames (1.0s) before Genos can flurry after recovery

  // Passive: Core Overdrive (Self-Destruct)
  selfDestructHpThreshold: 0.10,    // HP percentage threshold (0.10 = 10% HP) below which Genos initiates Core Overdrive Self-Destruct
  selfDestructCountdownFrames: 150, // 2.5 seconds
  selfDestructRadius: 200,
  selfDestructDamage: 250, // True damage explosion
  selfDestructKnockback: 20, // Push velocity applied to targets caught in blast
  selfDestructSurvivalHpPercent: 0.01, // Percentage of max HP Genos retains after explosion (1%)
  selfDestructShakeIntensity: 18,
  selfDestructShakeDuration: 50,

  //----------------------------------AUDIO CONFIG-----------------------------------------//

  // Basic Attack: Incineration Palms (Ranged Fireball)
  basicBlastSound: 'Assets/Sound Effects/Attacks/genos-range-attack.mp3',
  basicBlastVolume: 2.0,
  basicBlastEnabled: true,

  basicChargeSound: 'Assets/Sound Effects/Skills/genos-incenerate-charging.mp3',
  basicChargeVolume: 1.0,
  basicChargeEnabled: true,

  // Melee Mode Basic Attack (Close Quarters Martial Punch - Same punch sound Gojo uses)
  meleePunchSound: 'Assets/Sound Effects/Attacks/punch.mp3',
  meleePunchVolume: 2.8,
  meleePunchEnabled: true,

  // Thruster Dash Audio (plays on high-speed thruster dash with cooldown to prevent frequency spam)
  dashSound: 'Assets/Sound Effects/Skills/genos-dash-noise.mp3',
  dashSoundVolume: 1.8,
  dashSoundEnabled: true,
  dashSoundCooldownFrames: 180, // 3.0s cooldown between dash noise plays

  // Skill 1: Machine Gun Blows Voice
  flurryVoiceSound: 'Assets/Sound Effects/Skills/genos-machinegunblow-voice.mp3',
  flurryVoiceVolume: 2.0,
  flurryVoiceDelay: -0.15, // Timing delay in frames before voice plays (0 = immediate)
  flurryVoiceEnabled: true,

  // Ultimate: Spiral Incineration Cannon Audio
  ultVoiceSound: 'Assets/Sound Effects/Skills/genos-incenerate-voice.mp3',
  ultVoiceVolume: 2.2,
  ultVoiceEnabled: true,

  ultChargeSound: 'Assets/Sound Effects/Skills/genos-ultimatecharging.mp3',
  ultChargeVolume: 1.8,
  ultChargeEnabled: true,

  ultBlastSound: 'Assets/Sound Effects/Skills/genos-ultimateblast.mp3',
  ultBlastVolume: 1.8,
  ultBlastEnabled: true,

  // Ultimate Recovery Cooling SFX
  ultRecoverySound: 'Assets/Sound Effects/Skills/genos-recovery.mp3',
  ultRecoveryVolume: 0.5,
  ultRecoveryEnabled: true,
  ultRecoveryDelay: 0,

  // Passive: Self-Destruct Explosion & Charging Audio
  selfDestructChargeSound: 'Assets/Sound Effects/Skills/genos-selfdestruct-charging.mp3',
  selfDestructChargeVolume: 1.8,
  selfDestructChargeEnabled: true,
  selfDestructSound: 'Assets/Sound Effects/Skills/genos-selfdestruct-explosion.mp3',
  selfDestructVolume: 2.0,
  selfDestructDelay: 0,
  selfDestructRecoveryFrames: 90, // Breather recovery pause duration in frames (~1.5s) after exploding
};
