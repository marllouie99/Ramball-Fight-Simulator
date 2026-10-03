// ─────────────────────────────────────────────
// Sans Character Config
// Undertale / Deltarune by Toby Fox
// ─────────────────────────────────────────────

export const sansConfig = {
  bossTitle: 'The Judge of the Underground',
  title: 'The Judge of the Underground',

  // Baseline Attributes
  hp: 240,                     // Balanced glass-cannon HP pool
  maxHpRatio: 1.0,
  speed: 5.2,
  moveSpeed: 5.2,
  r: 35,
  radius: 25,
  color: '#00F5FF',           // Electric Cyan / Bad Time Eye Glow
  themeColor: '#00F5FF',
  secondaryColor: '#FFE600',   // Flashing Bad Time Eye Yellow
  accentDark: '#0E0F14',       // Manga Ink Outline
  accentPink: '#F472B6',       // Fluffy Slippers
  damageNumberColor: '#00F5FF',
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
  enableKarma: 0,
  karmaTickDamage: 1,
  karmaTickInterval: 14,       // Frames between poison ticks (~0.23s)
  karmaMaxStacks: 12,          // Up to 12 stacks for sustained pressure
  karmaDuration: 180,          // Total KR duration (~3.0s)

  // Passive 2: Teleport Dodge & Stamina
  enableTeleportDodge: true,
  dodgeChance: 0.85,           // Probability (0-1) of dodging incoming attacks when stamina is available (85%)
  domainDodgeChance: 0.80,     // Probability (0-1) of dodging spatial slice lines inside enemy Domain Expansions (80%)
  dodgeStaminaMax: 100,
  dodgeStaminaCost: 20,        // 5 dodges from full pool
  dodgeStaminaRegen: 0.20,     // Stamina recovery per frame (~12/sec)
  dodgeCooldown: 16,           // Min frames between consecutive dodges
  dodgeDistance: 85,           // Distance in pixels jumped during teleport
  dodgeAfterimageDuration: 14,
  dodgeText: 'MISS',

  // Basic Attack: Bone Toss (Disabled)
  enableBasicBone: 1,
  basicBoneDamage: 8,          // Balanced poke damage (8 + KR)
  basicBoneSpeed: 8.5,
  basicBoneReach: 420,
  basicBoneCooldown: 100,       // Rapid chip barrage

  // Skill 1: Gaster Blaster Arsenal (3 Authentic Undertale Patterns)
  enableGasterBlaster: true,
  blasterCooldown: 320,        // ~5.3s cooldown
  
  // Pattern 1: Sequential Orbiting Carousel (Arena Perimeter Circle)
  blasterCircleChainCount: 10, // Total blasters in sequential orbiting chain (10 blasters)
  blasterBadTimeChainCount: 10,// Total blasters during Bad Time (10 blasters)
  blasterCircleRadius: 210,    // Distance from arena center in pixels (encircles the arena)
  blasterOrbitSpeed: 0.628,    // Angular step per spawn along the orbit (2*PI / 10 = ~0.628 rad for a clean 360-degree loop)
  blasterSpawnInterval: 4,     // Frames between consecutive blaster spawns (~0.066s)
  blasterCarouselChargeTime: 16,// Rapid telegraph charge frames (~0.26s)
  blasterCarouselFireDuration: 22,// Active beam firing frames (~0.36s)
  blasterCarouselDamage: 9,    // Damage per beam tick
  blasterCarouselBeamWidth: 32,// Beam thickness

  // Pattern 2: 360° Simultaneous Radial Ring (Arena Perimeter Ring)
  blasterRingCount: 8,         // 8 blasters surrounding arena simultaneously
  blasterRingRadius: 215,      // Distance from arena center in pixels (encircles the arena)
  blasterRingChargeTime: 28,   // Synchronized pre-fire telegraph (~0.46s)
  blasterRingFireDuration: 28, // Inward beam firing frames (~0.46s)
  blasterRingDamage: 11,       // Damage per beam tick
  blasterRingBeamWidth: 36,    // Beam thickness

  // Pattern 3: Colossal Titan Gigablaster (Massive 2.6x Super Laser)
  blasterGigaScale: 2.6,        // Massive skull sprite scale
  blasterGigaChargeTime: 32,    // Heavy charge telegraph build-up (~0.53s)
  blasterGigaFireDuration: 36,  // Prolonged apocalyptic laser beam (~0.60s)
  blasterGigaDamage: 20,        // High devastating beam damage per tick
  blasterGigaBeamWidth: 120,    // Giant 120px-wide laser beam
  blasterGigaReach: 1000,       // Full arena corridor reach

  // General Laser Tuning
  blasterLaserReach: 800,      // Max laser length
  blasterKnockback: 0,

  // Skill 2: Bone Zone & Rising Spears
  enableBoneZone: true,
  boneZoneCooldown: 240,       // ~4.0s cooldown
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
  gravitySlamCooldown: 580,    // ~9.6s cooldown
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
