// ─────────────────────────────────────────────
// MAHITO CHARACTER CONFIGURATION
// ─────────────────────────────────────────────

export const mahitoConfig = {
  // Base Stats
  hp: 230,
  damage: 16,
  moveSpeed: 6.8,
  
  // Basic Attack: Idle Transfiguration (Melee Morph)
  punchRange: 75,             // Reach distance beyond body radius
  arcAngle: (135 * Math.PI) / 180, // 135° frontal cone sweep (Rule #7 & #8 compliant)
  basicPunchCooldown: 22,     // Frames between attack attempts
  punchSpeed: 20,             // Duration in frames of the attack animation (20 frames)
  knockbackForce: 8,          // Base physical knockback impulse
  hitStunDuration: 8,         // Base hit-stun frames applied to target
  
  // Morph Visual Settings
  bladeMorphLength: 52,       // Pixel length of the giant arm blade
  bladeMorphWidth: 16,        // Max width of blade
  maceMorphLength: 46,        // Pixel length of the spiked flesh club
  maceMorphRadius: 18,        // Radius of the spiked mace head
  
  // Passive Skill: Phantom Soul Slip (Phase-Through Claw Dash)
  soulPhaseSlip: {
    cooldown: 180,            // 3 seconds cooldown between passive dashes
    triggerRangeMin: 70,      // Minimum distance to target to trigger dash
    triggerRangeMax: 300,     // Maximum distance to target to trigger dash
    dashSpeed: 24.0,          // High supersonic dash speed
    dashDuration: 12,         // 12 frames of high-speed phase-through motion
    passThroughDistance: 100,  // Distance behind the enemy Mahito arrives at
    slashDamage: 22,          // Damage dealt when slicing as he phases through
    hitStunDuration: 14,      // Stagger stun applied to the phased target
    knockbackForce: 6,        // Push impulse
  },

  // Secondary Skill: Idle Transfiguration — Subterranean Flesh Surge
  fleshSurge: {
    cooldown: 300,            // 5 seconds cooldown
    minDistance: 140,         // Minimum distance to trigger skill (strictly long distance, never close quarters)
    reachMax: 420,            // Max reach distance across the arena
    slideFrames: 8,           // Phase 1: Momentum stop & slide duration
    plungeFrames: 10,         // Phase 2: Ground plunge punch animation
    staggerDelay: 8,          // Frame delay between sequential hump eruptions
    tendrilCountBase: 4,      // 4 humps (loops) in base form
    tendrilCountTransformed: 5,// 5 humps (loops) when transformed
    lingerDuration: 18,       // How long the humps stay fully visible/extended
    retractSpeed: 14.0,       // Retraction speed in px/frame for distance-based pullback
    explosionRadius: 48,      // Impact AOE radius per eruption point
    damage: 24,               // Base area damage
    hitStun: 12,              // Base hit-stun frames applied to targets
    knockbackForce: 8,        // Physical push impulse
    screenShake: 6,           // Impact screen shake intensity
  },

  // Third Skill: Idle Transfiguration — Mutated Mace Cannon (Stretch Arm Spiked Ball Shrapnel)
  maceCannon: {
    cooldown: 240,            // 4 seconds cooldown
    minDistance: 80,          // Can trigger when enemy is 80px+ away
    reachMax: 380,            // Max reach across the arena
    stretchSpeed: 20.0,       // Fast forward launch speed of the stretch arm in px/frame
    morphDuration: 45,        // Suspension in the air duration (0.75s) while slowly morphing into spiked ball
    maceRadiusBase: 22,       // Size of the fully morphed spiked mace head
    maceRadiusTransformed: 29,// Size of transformed chitin spiked head
    impactDamage: 30,         // Primary impact strike damage
    explosionRadius: 85,      // Shrapnel blast radius
    shrapnelCount: 10,        // Number of flying bone/flesh spikes
    shrapnelSpeed: 14.0,      // Velocity of flying spikes
    shrapnelDamage: 12,       // Damage per shrapnel spike hit
    shrapnelHitStun: 14,      // Stagger stun per spike
    knockbackForce: 13,       // Heavy knockback from explosion
    screenShake: 8,           // Screen shake intensity
  },

  // Fourth Skill: Idle Transfiguration — Dual Scythe Pincer Guillotine (Twin Stretched Blade Ambush)
  twinScissor: {
    cooldown: 360,            // 6 seconds cooldown
    minDistance: 90,          // Can trigger when enemy is 90px+ away
    reachMax: 360,            // Max reach across the arena
    flankWidth: 95,           // Flanking width left and right of the target
    stretchSpeed: 22.0,       // Outward flanking arc stretch speed in px/frame
    morphDuration: 24,        // Blade morph time at flanking points
    clampSpeed: 26.0,         // Inward scissor snap speed
    damage: 34,               // Scissor guillotine slice damage
    hitStun: 16,              // Heavy stagger stun
    knockbackForce: 10,       // Hook pull-in force towards caster
    screenShake: 8,           // Screen shake intensity
    retractSpeed: 22.0        // Pullback retraction speed
  },

  // Soul Disfigurement Mechanic
  soulDisfigurement: {
    maxStacks: 3,             // Stacks required for violent soul reshape detonation
    duration: 300,            // Stacks linger for 300 frames (5 seconds) before resetting
    burstDamage: 38,          // True unmitigated soul damage at max stacks
    burstHitStun: 14,         // Heavy stagger stun upon soul detonation
    paralyzeDuration: 45,     // Paralyze debuff duration in frames (0.75s) upon reaching max stacks
    burstKnockback: 12,       // Massive physical explosion push
    burstScreenShake: 8,      // Impact screen shake intensity
    ruptureDamage: 24,        // Final soul rupture explosion damage right before paralyze expires
    ruptureKnockback: 14,     // Outward impulse from the expiration rupture
    ruptureScreenShake: 10,   // Screen shake on rupture
  },
  
  // Theme Colors (Authentic JJK Magenta/Violet Cursed Energy)
  themeColor: '#C026D3',      // Vivid Magenta-Violet
  skinColor: '#EEF3F7',       // Sickly pale cursed spirit skin
  skinShadowColor: '#BACAD6',
  hairColor: '#9EB7C6',       // Flowing steel-blue hair
  hairDarkColor: '#678696',
  tunicColor: '#181920',      // Dark patchwork tunic
  tunicTrimColor: '#2E3242',
  stitchColor: '#181C26',     // Surgical suture stitches
  soulColor: '#D946EF',       // Luminous magenta-violet cursed soul energy
  soulDarkColor: '#581C87',   // Deep plum/violet shadow contour
  ceCoreColor: '#F5D0FE',     // Luminous lilac-white core highlight
  ceBorderColor: '#3B0764',   // Dark purple ink contour
  
  // Soul / Defense Mechanics
  soulDurabilityReduction: 0.25, // 25% passive damage reduction vs regular attacks
  
  // Transformation: Instant Spirit Body of Distorted Killing (ISBoDK)
  transformation: {
    duration: 600,            // 10 seconds active duration
    cooldown: 1200,           // 20 seconds cooldown
    defenseMultiplier: 0.50,  // Takes 50% less damage (high armor)
    damageMultiplier: 1.60,   // +60% attack power
    moveSpeedMultiplier: 0.70,// -30% movement speed penalty
    knockbackMultiplier: 1.75,// Extra heavy knockback when transformed
    hitStunMultiplier: 1.5,   // +50% hit-stun duration
    
    // Transformed Visual Palette
    carapaceColor: '#0E1322',
    carapaceHighlight: '#2A1B3D',
    bladeColor: '#D946EF',
    bladeEdgeColor: '#F5D0FE',
    eyeGlowColor: '#E879F9',
  },

  // Sound Effects
  sounds: {
    bladeSwing: 'Assets/Sound Effects/Attacks/syctheattack.mp3',
    bladeSwingAlt: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    maceSmash: 'Assets/Sound Effects/Attacks/heavypunch1.mp3',
    maceSmashAlt: 'Assets/Sound Effects/Attacks/heavypunch2.mp3',
    soulDetonate: 'Assets/Sound Effects/Skills/enhance.mp3',
    fleshHit: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    whiff: 'Assets/Sound Effects/Skills/woosh.mp3',
  },
  punchSound: 'Assets/Sound Effects/Attacks/syctheattack.mp3',
  punchVolume: 1.8,
};
