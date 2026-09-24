export const genosConfig = {
  bossTitle: 'Demon Cyborg',
  title: 'Demon Cyborg',

  // Base Stats
  hp: 320,
  speed: 5.2,
  moveSpeed: 6.0,
  r: 25,
  radius: 25,
  color: '#FF5500', // Incineration Orange
  themeColor: '#FF5500',
  startX: 300,
  startY: 250,
  startVx: 1.2,
  startVy: 1.0,
  damage: 6,
  cooldown: 27,
  projectileSpeedMultiplier: 1.4,
  ability: 'Incinerate',
  desc: 'Demon Cyborg. Zones with explosive basic blasts, Rocket Stomps to close in, and uses a devastating continuous fire beam. Explodes upon defeat.',

  // Basic Attack: Incineration Palms (Ranged Fire Blasts)
  enableBlast: true,         // Master toggle for Basic Attack: Incineration Palms
  blastDamage: 6,
  blastRange: 350,
  blastSpeed: 15,
  blastAoeRadius: 35,
  blastCooldown: 40, // ~0.45s at 60fps

  // Basic Attack Ammo & Stance System (Ranged Incineration Fireballs -> Melee Punches)
  enableMeleeStance: true,   // Master toggle for Melee Stance
  maxHeatAmmo: 20,          // Maximum ranged fireball capacity before switching to melee mode
  ammoReloadFrames: 500,    // Reload cooldown duration (300 frames = 5.0 seconds at 60fps)
  maxMeleeDashes: 10,        // Maximum thruster dashes allowed during Melee Mode
  meleePunchDamage: 6,    // Base damage per melee punch in Melee Mode
  meleePunchReach: 40,     // Melee punch reach distance (px)
  meleePunchCooldown: 15,  // Cooldown between melee punches (~0.3s)

  // Skill 1: Machine Gun Blows (Flurry)
  enableFlurry: true,        // Master toggle for Skill 1: Machine Gun Blows
  initialFlurryCooldown: 1200,  // Starts on cooldown at match start (~8.0s at 60fps)
  flurryDamage: 7,
  flurryHitCount: 15,
  flurryReach: 65,
  flurryArcAngle: Math.PI * 0.5, // 90 degree arc
  flurryCooldown: 1200, // Cooldown duration between uses
  flurryTriggerRange: 280, // AI engagement range (px) to initiate Machine Gun Blows

  // Dash System (Unified tuning for all Genos thruster dashes)
  dashes: {
    // Skill 2: Rocket Stomp & Dash
    rocketDash: {
      enableRocketDash: true, // Master toggle for Skill 2: Rocket Stomp & Dash
      cooldown: 360,     // 6 seconds at 60fps
      distance: 200,     // Distance of the dash (px)
      duration: 100,      // 0.3s dash duration (frames)
      speed: 0.55,       // Easing interpolation step per frame (0.25 = 25% smooth step)
      stompDamage: 10,   // Ground stomp damage on landing
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
  stompDamage: 10,
  stompRadius: 75,
  stompKnockback: 14,
  meleePunchKnockback: 9.0,
  blastProjectileRadius: 9,

  // Ultimate: Spiral Incineration Cannon
  enableUltimate: true,      // Master toggle for Ultimate: Spiral Incineration Cannon
  initialUltCooldown: 1000, // Initial cooldown at match start (28s at 60fps)
  ultCooldown: 800, // 28 seconds at 60fps
  ultSlideFrames: 22, // Pre-ultimate cybernetic thruster friction-brake slide duration in frames (~0.36s)
  ultSlideSpeed: 8.5, // Initial slide velocity speed (px/frame)
  ultWindupFrames: 60, // 1.0s windup
  ultDurationFrames: 120, // 2.0s beam duration
  ultDamagePerTick: 4,
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

  // Ultimate Arena Overlay & Dim Tuning
  ultOverlayEnabled: true,
  ultDimOpacity: 0.92,
  ultOverlayOpacity: 0.90,
  ultOverlayZoom: 1.0,
  ultOverlayOffsetX: 0,
  ultOverlayOffsetY: 0,

  // Passive: Core Overdrive (Self-Destruct)
  enableSelfDestruct: true,  // Master toggle for Passive: Core Overdrive (Self-Destruct)
  selfDestructHpThreshold: 0.10,    // HP percentage threshold (0.10 = 10% HP) below which Genos initiates Core Overdrive Self-Destruct
  selfDestructCountdownFrames: 150, // 2.5 seconds
  selfDestructDamageReduction: 0.50, // 75% Damage Reduction (DEF) while charging core overload self-destruct
  selfDestructRadius: 200,
  selfDestructDamage: 200, // True damage explosion
  selfDestructKnockback: 20, // Push velocity applied to targets caught in blast
  selfDestructSurvivalHpPercent: 0.01, // Percentage of max HP Genos retains immediately after explosion (1%)
  selfDestructHpRecoveryPercent: 0.15, // Percentage of max HP Genos recovers upon completing cybernetic reboot reassembly (30% = +96 HP)
  selfDestructHpRecoveryFlat: 0,       // Optional flat HP amount added upon reboot recovery (0 = disabled)
  selfDestructShakeIntensity: 18,
  selfDestructShakeDuration: 50,
  selfDestructRecoveryFrames: 90, // Breather recovery pause duration in frames (~1.5s) after exploding

  // ─────────────────────────────────────────────────────────────────────────
  // AUDIO CONFIGURATION & SOUND VOLUMES
  // ─────────────────────────────────────────────────────────────────────────
  sounds: {
    // Basic Attack: Incineration Palms (Ranged Fireball) & Melee Mode Punches
    basicBlast: 'Assets/Sound Effects/Attacks/genos-range-attack.mp3',
    basicCharge: 'Assets/Sound Effects/Skills/genos-incenerate-charging.mp3',
    meleePunch: 'Assets/Sound Effects/Attacks/punch.mp3',

    // Thruster Dashes & Stomp
    dashSound: 'Assets/Sound Effects/Skills/genos-dash-noise.mp3',
    dashFallback: 'Assets/Sound Effects/Skills/dash1.mp3',
    stompSound: 'Assets/Sound Effects/Attacks/groundSmash.mp3',

    // Skill 1: Machine Gun Blows (Flurry)
    flurryVoice: 'Assets/Sound Effects/Skills/genos-machinegunblow-voice.mp3',
    flurryPunch: 'Assets/Sound Effects/Attacks/punch.mp3',

    // Ultimate: Spiral Incineration Cannon
    ultVoice: 'Assets/Sound Effects/Skills/genos-incenerate-voice.mp3',
    ultCharge: 'Assets/Sound Effects/Skills/genos-ultimatecharging.mp3',
    ultBlast: 'Assets/Sound Effects/Skills/genos-ultimateblast.mp3',
    ultRecovery: 'Assets/Sound Effects/Skills/genos-recovery.mp3',

    // Passive: Core Overdrive (Self-Destruct)
    selfDestructCharge: 'Assets/Sound Effects/Skills/genos-selfdestruct-charging.mp3',
    selfDestructExplosion: 'Assets/Sound Effects/Skills/genos-selfdestruct-explosion.mp3'
  },

  soundVolumes: {
    // Normalized SFX volume levels (balanced to prevent audio clipping & ear fatigue)
    basicBlast: 0.45,
    basicCharge: 0.40,
    meleePunch: 0.45,
    flurryPunch: 0.28,        // Balanced per-hit punch volume during 15-hit flurry
    dashSound: 0.28,
    dashFallback: 0.35,
    stompSound: 0.50,
    flurryVoice: 0.85,
    ultVoice: 0.90,
    ultCharge: 0.55,
    ultBlast: 0.65,
    ultRecovery: 0.40,
    selfDestructCharge: 0.50,
    selfDestructExplosion: 0.70
  },

  // ── Backward Compatibility Audio Keys & Volume Aliases ──
  basicBlastSound: 'Assets/Sound Effects/Attacks/genos-range-attack.mp3',
  basicBlastVolume: 0.45,
  basicBlastEnabled: true,

  basicChargeSound: 'Assets/Sound Effects/Skills/genos-incenerate-charging.mp3',
  basicChargeVolume: 0.40,
  basicChargeEnabled: true,

  meleePunchSound: 'Assets/Sound Effects/Attacks/punch.mp3',
  meleePunchVolume: 0.45,
  meleePunchEnabled: true,

  dashSound: 'Assets/Sound Effects/Skills/genos-dash-noise.mp3',
  dashSoundVolume: 0.28,
  dashSoundEnabled: true,
  dashSoundCooldownFrames: 180,

  stompSound: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
  stompVolume: 0.50,

  flurryVoiceSound: 'Assets/Sound Effects/Skills/genos-machinegunblow-voice.mp3',
  flurryVoiceVolume: 0.85,
  flurryVoiceDelay: -0.15,
  flurryVoiceEnabled: true,

  ultVoiceSound: 'Assets/Sound Effects/Skills/genos-incenerate-voice.mp3',
  ultVoiceVolume: 0.90,
  ultVoiceEnabled: true,

  ultChargeSound: 'Assets/Sound Effects/Skills/genos-ultimatecharging.mp3',
  ultChargeVolume: 0.55,
  ultChargeEnabled: true,

  ultBlastSound: 'Assets/Sound Effects/Skills/genos-ultimateblast.mp3',
  ultBlastVolume: 0.65,
  ultBlastEnabled: true,

  ultRecoverySound: 'Assets/Sound Effects/Skills/genos-recovery.mp3',
  ultRecoveryVolume: 0.40,
  ultRecoveryEnabled: true,
  ultRecoveryDelay: 0,

  selfDestructChargeSound: 'Assets/Sound Effects/Skills/genos-selfdestruct-charging.mp3',
  selfDestructChargeVolume: 0.50,
  selfDestructChargeEnabled: true,

  selfDestructSound: 'Assets/Sound Effects/Skills/genos-selfdestruct-explosion.mp3',
  selfDestructVolume: 0.70,
  selfDestructDelay: 0
};
