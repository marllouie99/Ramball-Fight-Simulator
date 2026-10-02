// ─────────────────────────────────────────────
// Nameless Deity / Nameless Destroyer Character Config
// Terraria: Wrath of the Gods — The Transcendent Cosmic God
// ─────────────────────────────────────────────

export const namelessDeityConfig = {
  id: 'namelessdeity',
  name: 'Nameless Deity',
  displayName: 'NAMELESS DEITY',
  category: 'Gaming',
  bossTitle: 'Transcendent Cosmic Entity',
  title: 'Transcendent Cosmic Entity',

  // Core Combat Stats
  hp: 420,
  maxHp: 420,
  speed: 4.8,
  moveSpeed: 4.8,
  radius: 28,
  r: 40,
  damage: 16,
  cooldown: 35,
  projectileSpeedMultiplier: 1.0,

  // Theme & Aesthetics Palette (Neon Cosmic Nebula Theme)
  color: '#ffffffff',          // Neon Cosmic Nebula Cyan (matching beam texture)
  themeColor: '#f0f0f0ff',     // Primary Theme Color
  secondaryColor: '#A17FE0', // Cosmic Ultraviolet / Nebula Violet
  accentCyan: '#e4e4e4ff',     // Chromatic Aberration Cyan
  accentViolet: '#A17FE0',   // Prismatic Nebula Violet
  accentWhite: '#FFFFFF',    // Blinding Starlight Core
  accentDark: '#0D0B18',     // Deep Void Ambient Ink

  ability: 'Nameless Destroyer & Cosmic Singularity',
  desc: 'The transcendent deity of light from Terraria: Wrath of the Gods. Deploys homing Prismatic Star Shards, Supercluster Star Mandalas, Gravitational Cosmic Singularities, and channels the cataclysmic "Nameless Destroyer" cosmic super-beam.',

  // ──────────────────────────────────────────
  // Basic Attack: Prismatic Light Darts (Homing Starlight Needles)
  // ──────────────────────────────────────────
  enableStarDarts: 1,
  dartDamage: 14,
  dartSpeed: 10.5,
  dartHomingStrength: 0.06,
  dartCount: 3,
  dartSpreadAngle: 0.35,

  // ──────────────────────────────────────────
  // Skill 1: Supercluster Star Mandala (Orbiting Stars & Burst)
  // ──────────────────────────────────────────
  enableSuperclusterStars: 0,
  superclusterCost: 0,
  superclusterCooldown: 400,
  superclusterStarCount: 6,
  superclusterOrbitRadius: 75,
  superclusterOrbitSpeed: 0.02,
  superclusterDuration: 240,
  superclusterDamage: 24,
  superclusterColor: '#00F0FF',

  // ──────────────────────────────────────────
  // Skill 2: Dimension Cleave (Prismatic 180° Sweep Wave)
  // ──────────────────────────────────────────
  enableDimensionCleave: 0,
  dimensionCleaveCooldown: 340,
  dimensionCleaveDamage: 32,
  dimensionCleaveReach: 140,
  dimensionCleaveArc: Math.PI * 0.95,
  dimensionCleaveKnockback: 12.0,
  dimensionCleaveColor: '#A17FE0',

  // ──────────────────────────────────────────
  // Skill 3: Cosmic Singularity (Gravitational Black Hole Vortex)
  // ──────────────────────────────────────────
  enableCosmicSingularity: 0,
  singularityCooldown: 520,
  singularityRadius: 130,
  singularityPullForce: 0.28,
  singularityDuration: 90,
  singularityCollapseDamage: 42,
  singularityCollapseRadius: 90,
  singularityColor: '#00F0FF',

  // ──────────────────────────────────────────
  // Ultimate: Nameless Destroyer (Transcendent Cosmic Super-Beam)
  // ──────────────────────────────────────────
  enableNamelessDestroyer: true,
  destroyerCooldown: 850,
  destroyerInitialCooldown: 1000, // Initial cooldown at round start (~6.67s @ 60fps) before first super-beam

  // Sequential Step-by-Step Animation Phase Frame Timers (Matched directly to Audio Durations)
  destroyerWindupFrames: 393,       // Exact duration of CosmicLaserChargeUp.ogg (6.551s = 393 frames @ 60fps)
  destroyerFlareWindupFrames: 200,  // Phase 1: Duration (frames) of pure flare wind-up & starlight gathering
  destroyerCircleFadeInFrames: 150, // Phase 2: Duration (frames) of 3D magic circle smooth fade-in while spinning (150 frames)
  destroyerHoldFrames: 43,          // Phase 3: Hold duration (frames) with fully formed circle before snap (200 + 150 + 43 = 393 frames)
  destroyerFireFrames: 500,         // Phase 4: Long continuous cosmic super-beam firing (800 frames = ~13.3s with seamless audio looping)
  destroyerRecoveryFrames: 50,      // Post-beam celestial aura fade duration

  destroyerTotalDamage: 1000,        // Total damage distributed across active beam ticks
  destroyerTickInterval: 10,         // Damage ticks every 4 frames
  destroyerBeamWidth: 142.5,        // Core beam collision half-width (matches 285px visual aperture diameter)
  destroyerBeamLength: 1400,        // Total reach (length) of the cosmic super-beam across the arena
  destroyerKnockbackPerTick: 1.8,
  destroyerCentripetalPullFactor: 0.35, // Strong gravitational suction toward beam centerline axis
  destroyerForwardImpulse: 2.5,        // Forward beam stream drag impulse
  destroyerParalyzeDuration: 12,       // Paralyze & beam stasis duration refreshed per frame
  destroyerRecoilImpulse: 2.2,
  destroyerScreenShake: 8.0,            // Initial blast eruption screen shake
  destroyerContinuousShake: 10.0,        // Continuous roaring arena shake during super-beam stream
  destroyerWindupShake: 10.0,            // Gradual building cosmic vibration shake during magic circle charge-up

  // ──────────────────────────────────────────
  // Nameless Destroyer Animation & Aesthetics Settings
  // ──────────────────────────────────────────
  destroyerScrollSpeed: 14.0,           // Forward stream velocity of the cosmic space galaxy texture
  destroyerMagicCircleSpinSpeed: 0.035, // Majestic spin rate (rad/frame) of the 3D Cosmic Light Magic Circle
  destroyerMagicCircleDiameter: 380,    // Visual pixel diameter of the magic circle portal
  destroyerCameraZoom: 0.93,            // Subtle cinematic zoom-out level during beam cast
  // ──────────────────────────────────────────
  // Sound Effects Configuration (Laser Beam & Deity SFX)
  // ──────────────────────────────────────────
  sounds: {
    laserCharge: 'Assets/Sound Effects/NamelessDeity/CosmicLaserChargeUp.ogg',
    laserStart: 'Assets/Sound Effects/NamelessDeity/CosmicLaserStart.ogg',
    laserLoop: 'Assets/Sound Effects/NamelessDeity/CosmicLaserLoop.ogg',
    chuckle: 'Assets/Sound Effects/NamelessDeity/Chuckle.ogg',
    wingFlap: 'Assets/Sound Effects/NamelessDeity/WingFlap2.ogg',
  },
  laserChargeVolume: 1.15,
  laserStartVolume: 1.30,
  laserLoopVolume: 0.95,
  chuckleVolume: 1.10,
  wingFlapVolume: 0.70,
};



