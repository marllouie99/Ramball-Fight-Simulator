// ─────────────────────────────────────────────
// Sans Character Config
// Undertale / Deltarune by Toby Fox
// ─────────────────────────────────────────────

export const sansConfig = {
  assets: {
    gasterBlasterSheet: 'Assets/model/sans/Sans-gaster-blaster-sprite-sheet.png',
  },

  name: 'sans',
  displayName: 'sans',
  grade: 'SS',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)
  bossTitle: 'The Judge of the Underground',
  title: 'The Judge of the Underground',

  // Baseline Attributes
  hp: 1,                     // Balanced glass-cannon HP pool
  maxHpRatio: 1.0,
  speed: 4.0,
  moveSpeed: 5.2,
  r: 35,
  radius: 25,
  color: '#03d5f1ff',           // Electric Cyan / Bad Time Eye Glow
  themeColor: '#03d5f1ff',
  secondaryColor: '#FFE600',   // Flashing Bad Time Eye Yellow
  accentDark: '#0E0F14',       // Manga Ink Outline
  accentPink: '#F472B6',       // Fluffy Slippers
  damageNumberColor: '#03d5f1ff',
  startX: 300,
  startY: 250,
  startVx: 1.0,
  startVy: 0.9,
  damage: 8,                   // Base damage per standard hit
  cooldown: 26,                // Base attack cooldown (frames)
  projectileSpeedMultiplier: 1.0,
  ability: 'Gaster Blasters, Bone Zone & Blue Soul Gravity ("Bad Time")',
  desc: 'The laid-back skeleton judge from Undertale. Dodges incoming attacks with instant teleportation afterimages. Attacks with rapid bone barrages, summons heavy Gaster Blaster laser cannons, applies Karmic Retribution (KR) damage over time, and controls battlefield gravity with Blue Soul telekinesis slams.',

  // Passive 1: Karmic Retribution (KR)
  enableKarma: 1,
  karmaTickDamage: 1,
  karmaTickInterval: 14,       // Frames between poison ticks (~0.23s)
  karmaMaxStacks: 12,          // Up to 12 stacks for sustained pressure
  karmaDuration: 180,          // Total KR duration (~3.0s)

  // Passive 2: Teleport Dodge & Stamina
  enableTeleportDodge: true,
  dodgeChance: 1.0,           // Probability (0-1) of dodging incoming attacks (100%)
  domainDodgeChance: 1.00,     // Probability (0-1) of dodging spatial slice lines inside enemy Domain Expansions (100%)
  dodgeStaminaMax: 100,       // Max dodge stamina pool (replaces HP bar in HUD)
  dodgeStaminaCost: 10,       // Baseline / fallback dodge stamina cost
  damageStaminaCostMultiplier: 0.10, // Dynamic stamina cost ratio: 10% of incoming attack damage (e.g. 100 dmg -> 10 stamina)
  minDodgeStaminaCost: 1,     // Minimum stamina cost per dodge (1 stamina)
  domainDodgeStaminaCost: 1,  // Special Interaction: Stamina/Mana cost is 1 only when Sukuna's domain is open!
  dodgeStaminaRegen: 0.02,    // Stamina recovery per frame (~10/sec)
  dodgeStaminaRegenDelay: 20, // "Catch Breath" delay: frames after dodging before stamina begins recovering (~0.83s at 60fps)
  dodgeCooldown: 0,           // Min frames between consecutive dodges
  shotgunDodgeGraceWindow: 16,// Grace window (frames) where subsequent pellets from a shotgun spread/volley cost 0 stamina
  dodgeDistance: 150,         // Distance in pixels jumped during teleport
  dodgeAfterimageCount: 2,    // Number of afterimage silhouettes spawned per teleport dodge
  dodgeAfterimages: 2,        // Alias for dodgeAfterimageCount
  dodgeMaxAfterimages: 16,    // Maximum simultaneous active afterimages in arena buffer
  dodgeAfterimageDuration: 20,// Lifespan of each dodge afterimage ghost (frames)
  dodgeAfterimageAlpha: 0.40, // Base opacity / visibility of afterimage ghosts
  dodgeStallDuration: 12,     // Frames movement stops during a dodge (repositioning is done solely by teleport)
  dodgeText: 'MISS',

  // Basic Attack: Bone Toss (Disabled)
  enableBasicBone: 1,
  basicBoneDamage: 8,          // Balanced poke damage (8 + KR)
  basicBoneSpeed: 8.5,
  basicBoneReach: 420,
  basicBoneCooldown: 80,       // Rapid chip barrage

  // Skill 1: Gaster Blaster Arsenal (3 Authentic Undertale Patterns)
  enableGasterBlaster: true,
  blasterCooldown: 300,        // ~5.3s cooldown
  initialBlasterCooldown: 320, // Initial cooldown at round start (~3.0s at 60fps) before first Gaster Blaster barrage
  blasterInitialCooldown: 180, // Alias for initialBlasterCooldown
  blasterStaminaCost: 10,      // Stamina exhaustion cost per Gaster Blaster barrage (25 / 100 Stamina)
  blasterHpCost: 0,            // Deprecated: Stamina is consumed instead of HP
  
  // Stamina Recovery on Gaster Blaster Hit
  blasterStaminaRecoverOnHit: 2,        // Stamina recovered on first impact hit per blaster
  blasterHitStaminaRecover: 2,          // Backward-compatibility alias
  blasterContinuousStaminaRecover: 1,   // Stamina recovered on continuous beam contact ticks
  blasterGigaStaminaRecoverOnHit: 1,    // Stamina recovered on Gigablaster first impact
  blasterGigaContinuousStaminaRecover: 1, // Stamina recovered on Gigablaster continuous tick
  
  // General Beam Dimension & Height Tuning
  blasterBeamHeight: 36,       // Standard Gaster Blaster beam thickness / vertical height (pixels)
  blasterBeamWidth: 36,        // Alias for blasterBeamHeight
  blasterLaserHeight: 1500,     // Standard Gaster Blaster beam corridor length / reach (pixels)
  blasterLaserReach: 800,      // Alias for blasterLaserHeight
  blasterKnockback: 0,
  blasterBeamDamage: 20,       // Fallback base damage per blaster

  // Impact and Continuous Damage Tuning (100% First Impact, 50% Continuous Beam Damage)
  blasterFirstImpactRatio: 1.0,        // 100% damage on first impact
  blasterContinuousDamageRatio: 0.5,   // 50% damage on continuous beam contact ticks
  blasterContinuousRatio: 0.5,         // Alias for blasterContinuousDamageRatio
  blasterTickInterval: 6,              // Frames between continuous beam damage ticks (~0.10s)

  // Pattern 1: Sequential Orbiting Carousel (Arena Perimeter Circle)
  blasterCircleChainCount: 10, // Total blasters in sequential orbiting chain (10 blasters)
  blasterBadTimeChainCount: 10,// Total blasters during Bad Time (10 blasters)
  blasterCircleRadius: 210,    // Distance from arena center in pixels (encircles the arena)
  blasterOrbitSpeed: 0.628,    // Angular step per spawn along the orbit (2*PI / 10 = ~0.628 rad for a clean 360-degree loop)
  blasterSpawnInterval: 6,     // Frames between consecutive blaster spawns (~0.066s)
  blasterCarouselChargeTime: 16,// Rapid telegraph charge frames (~0.26s)
  blasterCarouselFireDuration: 22,// Active beam firing frames (~0.36s)
  blasterCarouselDamage: 20,    // Base damage per blaster (100% first impact = 20, 50% continuous = 10)
  blasterCarouselBeamHeight: 32,// Pattern 1 Carousel beam thickness / height (pixels)
  blasterCarouselBeamWidth: 32, // Alias for blasterCarouselBeamHeight

  // Pattern 2: 360° Simultaneous Radial Ring (Arena Perimeter Ring)
  blasterRingCount: 8,         // 8 blasters surrounding arena simultaneously
  blasterRingRadius: 215,      // Distance from arena center in pixels (encircles the arena)
  blasterRingChargeTime: 28,   // Synchronized pre-fire telegraph (~0.46s)
  blasterRingFireDuration: 28, // Inward beam firing frames (~0.46s)
  blasterRingDamage: 20,       // Base damage per blaster (100% first impact = 20, 50% continuous = 10)
  blasterRingBeamHeight: 36,   // Pattern 2 Ring beam thickness / height (pixels)
  blasterRingBeamWidth: 36,    // Alias for blasterRingBeamHeight

  // Pattern 3: Colossal Titan Gigablaster (Massive 2.6x Super Laser)
  blasterGigaScale: 2.6,        // Massive skull sprite scale
  blasterGigaChargeTime: 32,    // Heavy charge telegraph build-up (~0.53s)
  blasterGigaFireDuration: 36,  // Prolonged apocalyptic laser beam (~0.60s)
  blasterGigaDamage: 30,        // Base damage per blaster (100% first impact = 30, 50% continuous = 15)
  blasterGigaBeamHeight: 120,   // Pattern 3 Giant titan laser beam thickness / height (pixels)
  blasterGigaBeamWidth: 120,    // Alias for blasterGigaBeamHeight
  blasterGigaLaserHeight: 1000, // Giant titan laser corridor length / reach (pixels)
  blasterGigaReach: 1000,       // Alias for blasterGigaLaserHeight

  // Skill 2: Bone Zone & Rising Spears
  enableBoneZone: true,
  boneZoneCooldown: 240,       // ~4.0s cooldown
  initialBoneZoneCooldown: 240,// Initial cooldown at round start (~3.0s at 60fps) before first Bone Zone wave
  boneZoneInitialCooldown: 180,// Alias for initialBoneZoneCooldown
  boneCount: 6,
  boneSpeed: 7.5,
  boneDamage: 5,               // 5 dmg per bone (6-bone wave = up to 30 max point blank)
  boneWaveSpread: 0.60,        // Fan spread angle in radians
  enableBlueBone: true,        // Blue bones that freeze moving enemies
  blueBoneFreezeDuration: 24,  // ~0.40s freeze
  enableGroundSpears: true,    // Erupting bone spears under opponent
  groundSpearWarnFrames: 24,
  groundSpearDamage: 16,       // Balanced ground stab damage

  // Ultimate / Skill 3: Blue Soul Gravity Slam ("Bad Time")
  enableGravitySlam: true,
  gravitySlamCooldown: 800,    // ~9.6s cooldown
  initialGravitySlamCooldown: 800, // Initial cooldown at round start (~8.0s at 60fps) before Bad Time / Gravity Slam
  gravitySlamInitialCooldown: 480, // Alias for initialGravitySlamCooldown
  initialBadTimeCooldown: 480,     // Alias for initialGravitySlamCooldown
  badTimeInitialCooldown: 480,     // Alias for initialGravitySlamCooldown
  gravitySlamDuration: 80,     // Total channeling duration
  gravityForce: 18,            // Physics impulse slammed into walls
  gravitySlamDamage: 22,       // Balanced initial slam impact damage
  gravityWallImpactDamage: 8,  // Wall impact damage (2-3 hits = 16-24 bonus)
  badTimeDuration: 360,        // 6.0s Bad Time mode buff duration
  badTimeSpeedMultiplier: 1.20,
  badTimeCooldownReduction: 0.25,

  // Sound Effects
  sounds: {
    gasterBlast: 'Assets/Sound Effects/Sans/GasterBlast.ogg',
    gasterBlaster: 'Assets/Sound Effects/Sans/GasterBlaster.ogg',
    slam: 'Assets/Sound Effects/Sans/Slam.ogg',
    boneStab: 'Assets/Sound Effects/Sans/BoneStab.ogg',
    flash: 'Assets/Sound Effects/Sans/Flash.ogg',
    ding: 'Assets/Sound Effects/Sans/Ding.ogg',
    sansSpeak: 'Assets/Sound Effects/Sans/SansSpeak.ogg',
    warning: 'Assets/Sound Effects/Sans/Warning.ogg',
    heartSplit: 'Assets/Sound Effects/Sans/HeartSplit.ogg',
    heartShatter: 'Assets/Sound Effects/Sans/HeartShatter.ogg',
    megalovania: 'Assets/Sound Effects/Sans/mus_zz_megalovania.ogg'
  }
};
