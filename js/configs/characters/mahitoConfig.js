// ─────────────────────────────────────────────────────────────────────────────
// MAHITO CHARACTER CONFIGURATION (Idle Transfiguration / JJK)
// ─────────────────────────────────────────────────────────────────────────────

export const mahitoConfig = {
  // ── 1. BASE ATTRIBUTES & CORE STATS ────────────────────────────────────────
  hp: 230,
  damage: 14,
  moveSpeed: 5.8,
  
  // Basic Attack: Idle Transfiguration (Melee Morph)
  arcAngle: (135 * Math.PI) / 180, // 135° frontal cone sweep (Rule #7 & #8 compliant)
  basicPunchCooldown: 70,          // Frames between attack attempts
  punchSpeed: 50,                  // Duration in frames of the attack animation
  knockbackForce: 8,               // Base physical knockback impulse
  hitStunDuration: 8,              // Base hit-stun frames applied to target
  
  // Morph Visual Settings
  bladeMorphLength: 52,            // Pixel length of the giant arm blade
  bladeMorphWidth: 16,             // Max width of blade
  maceMorphLength: 46,             // Pixel length of the spiked flesh club
  maceMorphRadius: 18,             // Radius of the spiked mace head

  // Shared Morph Skill Cooldown (Skills 2, 3, and 4 share one unified cooldown)
  sharedSkillCooldown: 300,        // 5 seconds cooldown

  // ── 2. PASSIVE: PHANTOM SOUL SLIP (Phase-Through Claw Dash) ────────────────
  soulPhaseSlip: {
    cooldown: 100,                 // 3 seconds cooldown between passive dashes
    triggerRangeMin: 70,           // Minimum distance to target to trigger dash
    triggerRangeMax: 300,          // Maximum distance to target to trigger dash
    dashSpeed: 24.0,               // High supersonic dash speed
    dashDuration: 12,              // 12 frames of high-speed phase-through motion
    passThroughDistance: 100,      // Distance behind the enemy Mahito arrives at
    slashDamage: 22,               // Damage dealt when slicing as he phases through
    hitStunDuration: 14,           // Stagger stun applied to the phased target
    knockbackForce: 6,             // Push impulse
  },

  // ── 3. SKILL 2: SUBTERRANEAN FLESH SURGE (Underground Arm Eruption) ────────
  fleshSurge: {
    cooldown: 300,                 // 5 seconds cooldown
    minDistance: 240,              // Minimum distance to trigger skill (strictly long distance >= 240px)
    reachMax: 420,                 // Max reach distance across the arena
    slideFrames: 8,                // Phase 1: Momentum stop & slide duration
    plungeFrames: 10,              // Phase 2: Ground plunge punch animation
    staggerDelay: 8,               // Frame delay between sequential hump eruptions
    tendrilCountBase: 4,           // 4 humps (loops) in base form
    tendrilCountTransformed: 5,    // 5 humps (loops) when transformed
    lingerDuration: 18,            // How long the humps stay fully visible/extended
    retractSpeed: 14.0,            // Retraction speed in px/frame for distance-based pullback
    explosionRadius: 48,           // Impact AOE radius per eruption point
    damage: 24,                    // Base area damage
    hitStun: 12,                   // Base hit-stun frames applied to targets
    knockbackForce: 8,             // Physical push impulse
    screenShake: 6,                // Impact screen shake intensity
  },

  // ── 4. SKILL 3: MUTATED MACE CANNON (Spiked Flesh Ball Shrapnel) ───────────
  maceCannon: {
    cooldown: 300,                 // 5 seconds cooldown (shares unified cooldown)
    minDistance: 240,              // Minimum distance to trigger skill (strictly long distance >= 240px)
    reachMax: 380,                 // Max reach across the arena
    stretchSpeed: 25.0,            // Fast forward launch speed of the stretch arm in px/frame
    morphDuration: 45,             // Suspension duration (0.75s) while slowly morphing into spiked ball
    maceRadiusBase: 22,            // Size of the fully morphed spiked mace head
    maceRadiusTransformed: 29,     // Size of transformed chitin spiked head
    impactDamage: 30,              // Primary impact strike damage
    explosionRadius: 85,           // Shrapnel blast radius
    shrapnelCount: 10,             // Number of flying bone/flesh spikes
    shrapnelSpeed: 14.0,           // Velocity of flying spikes
    shrapnelDamage: 12,            // Damage per shrapnel spike hit
    shrapnelHitStun: 14,           // Stagger stun per spike
    knockbackForce: 13,            // Heavy knockback from explosion
    screenShake: 8,                // Screen shake intensity
  },

  // ── 5. SKILL 4: DUAL SCYTHE PINCER GUILLOTINE (Twin Blade Ambush) ──────────
  twinScissor: {
    cooldown: 300,                 // 5 seconds cooldown (shares unified cooldown)
    minDistance: 240,              // Minimum distance to trigger skill (strictly long distance >= 240px)
    reachMax: 360,                 // Max reach across the arena
    flankWidth: 95,                // Flanking width left and right of the target
    stretchSpeed: 25.0,            // Outward flanking arc stretch speed in px/frame
    morphDuration: 24,             // Blade morph time at flanking points
    clampSpeed: 26.0,              // Inward scissor snap speed
    damage: 34,                    // Scissor guillotine slice damage
    hitStun: 45,                   // Heavy stagger stun
    stunDuration: 45,              // Stun duration applied to enemy (45 frames / 0.75s)
    knockbackForce: 10,            // Hook pull-in force towards caster
    screenShake: 8,                // Screen shake intensity
    retractSpeed: 22.0             // Pullback retraction speed
  },

  // ── 6. SKILL 5: SOUL MULTIPLICITY & BODY REPEL ─────────────────────────────
  soulMultiplicity: {
    cooldown: 1000,                 // Cooldown in frames (approx. 8.3s)
    minDistanceAlt: 250,           // Below this: summon minions. Above this: fire Body Repel projectile.
    summonCount: 1,                // Summons Transfigured Humans
    minionHp: 50,                  // HP per summoned Transfigured Human
    minionDamage: 10,              // Base bite damage
    minionSpeed: 1.8,              // Active homing chase speed
    minionBiteCooldown: 10,        // Frames cooldown between bite attacks
    minionSize: 30,                // Minion body circle radius
    minionDeathDuration: 50,       // Swelling/expansion animation duration in frames
    minionExpandMaxScale: 1.5,     // Maximum visual scale expansion before popping
    minionExplosionRadius: 100,    // AOE explosion radius
    minionExplosionDamage: 50,     // AOE explosion damage
    minionExplosionKnockback: 12,  // AOE knockback push force
    bodyRepelDamage: 50,           // Body Repel direct projectile damage
    bodyRepelSpeed: 10.0,          // Body Repel projectile movement speed
    bodyRepelRadius: 50,           // Body Repel collision check radius
    bodyRepelLife: 90,             // Projectile frame duration limit
    bodyRepelKnockback: 20,        // Heavy knockback push force
  },

  // ── 7. SOUL DISFIGUREMENT & RUPTURE MECHANICS ──────────────────────────────
  soulDisfigurement: {
    maxStacks: 5,                  // Stacks required for violent soul reshape detonation
    duration: 300,                 // Stacks linger for 300 frames (5s) before resetting
    burstDamage: 100,               // True unmitigated soul damage at max stacks
    burstHitStun: 300,             // Heavy stagger stun upon soul detonation
    paralyzeDuration: 45,          // Paralyze debuff duration in frames (0.75s) upon reaching max stacks
    burstKnockback: 20,            // Massive physical explosion push
    burstScreenShake: 8,           // Impact screen shake intensity
    ruptureDamage: 24,             // Final soul rupture explosion damage right before paralyze expires
    ruptureKnockback: 14,          // Outward impulse from the expiration rupture
    ruptureScreenShake: 10,        // Screen shake on rupture
    shiverIntensity: 10,           // Intensity of shivering vibration applied to afflicted/paralyzed enemies (pixels)
    paralyzeShiverIntensity: 8.0,  // Shivering vibration intensity during full soul paralysis build-up (pixels)
    stackShiverIntensity: 0,       // Shivering vibration intensity scaling per Soul Disfigurement stack
    shiverFramesBeforeExplosion: 50,// Frame threshold before the paralyze explosion when shivering starts
    executeThreshold: 0.10,        // Target HP percentage threshold for soul execution
    executeDamagePercent: 0.20,    // Executing true damage percent of target's max HP
    stitchIndicatorScale: 1.70     // Visual size/scale of the stitch stack indicator above enemy heads (1.70 = 170% size)
  },
  
  // Shivering Tremor Intensity (Configurable Enemy Vibration)
  shiverIntensity: 4.2,
  
  // Soul / Defense Mechanics
  soulDurabilityReduction: 0.02,   // Passive damage reduction vs regular attacks

  // ── 8. SURVIVAL & REGENERATION MECHANICS ───────────────────────────────────
  regen: {
    delay: 100,                    // Frames without receiving damage before regen triggers
    rate: 0.10,                    // Health regenerated per frame
  },

  evasion: {
    threshold: 0.75,               // HP percentage below which Evasion triggers on next dash
    duration: 300,                 // Evasion state duration in frames (5s)
    cloneCount: 3,                 // Number of small evasion clones spawned
    radius: 16,                    // Shrunk hurtbox radius for the clones and main body
    scale: 1.00,                   // Visual scale of the miniature models
    speedMultiplier: 1.50,         // Speed boost multiplier while fleeing in evasion state
    regenRate: 0.05,               // Health regenerated per frame during evasion (~24 HP/sec)
    dodgeChance: 0.60              // Dodge chance to completely evade incoming attacks during evasion (60%)
  },

  // ── 9. TRANSFORMATION: INSTANT SPIRIT BODY OF DISTORTED KILLING (ISBoDK) ───
  transformation: {
    enabled: false,                 // Master toggle to enable or disable Distorted Killing transformation (set to false to disable)
    duration: 600,                 // 10 seconds active duration
    cooldown: 1200,                // 20 seconds cooldown
    defenseMultiplier: 0.50,       // Takes 50% less damage (high armor)
    damageMultiplier: 1.60,        // +60% attack power
    moveSpeedMultiplier: 0.70,     // -30% movement speed penalty
    autoTransformThreshold: 0.10,  // Automatically transform when HP drops to 10% or less
    healPercentage: 0.25,          // Recover 25% of max HP on transformation
    knockbackMultiplier: 1.75,     // Extra heavy knockback when transformed
    hitStunMultiplier: 1.5,        // +50% hit-stun duration
    
    // Transformed Visual Palette
    carapaceColor: '#0E1322',
    carapaceHighlight: '#2A1B3D',
    bladeColor: '#D946EF',
    bladeEdgeColor: '#F5D0FE',
    eyeGlowColor: '#E879F9',
  },

  // ── 10. THEME COLORS & VISUAL PALETTES (Authentic JJK Magenta/Violet) ──────
  themeColor: '#C026D3',           // Vivid Magenta-Violet
  skinColor: '#EEF3F7',            // Sickly pale cursed spirit skin
  skinShadowColor: '#BACAD6',
  hairColor: '#9EB7C6',            // Flowing steel-blue hair
  hairDarkColor: '#678696',
  tunicColor: '#181920',           // Dark patchwork tunic
  tunicTrimColor: '#2E3242',
  stitchColor: '#181C26',          // Surgical suture stitches
  soulColor: '#D946EF',            // Luminous magenta-violet cursed soul energy
  soulDarkColor: '#581C87',        // Deep plum/violet shadow contour
  ceCoreColor: '#F5D0FE',          // Luminous lilac-white core highlight
  ceBorderColor: '#3B0764',        // Dark purple ink contour

  // ── 11. ULTIMATE: DOMAIN EXPANSION ──────────────────────────────
  domainExpansion: {
    cooldown: 2000,                // 33 seconds cooldown
    chargeMax: 120,                // 2 seconds channeling duration before domain opens
    duration: 600,                 // 6.6 seconds of paralyzing stasis
    radius: 9999,                  // Closed barrier - covers the whole screen
    executionDamageMultiplier: 0,// Execution strike deals 50% max HP true damage
    executionHitStun: 60,          // Massive hit stun on execution
    executionKnockback: 35,        // Massive knockback on execution
    executionScreenShake: 16,      // Massive screen shake
    slowMultiplier: 0.15,          // Move speed multiplier for trapped targets inside domain (85% slow)
    velocityDampening: 0.85,       // Velocity damping rate per frame inside domain
    basicAttackCooldownMultiplier: 1.50, // Basic attack speed multiplier inside domain (1.50 = 1.5x faster hit & damage rate, 2.0 = 2x faster, 3.0 = 3x faster)
    attacksToTriggerDisfigurement: 5,    // Basic attack hits required inside domain to trigger Soul Disfigurement & Rupture
    disfigurementDamageMultiplier: 1.50, // Damage multiplier for Soul Disfigurement burst damage inside domain (1.50 = +50% damage)
    ruptureDamageMultiplier: 5.0,       // Damage multiplier for Soul Rupture explosion damage inside domain (1.50 = +50% damage)
    anyDistanceBasicAttack: true,       // Inside domain, Idle Transfiguration basic attack triggers at ANY distance (Sure-Hit domain effect)
    punchRangeMultiplier: 99999,        // Reach multiplier inside domain (99999 = unlimited reach across entire screen)
    domainRangeBoost: 200,              // Displayed attack reach boost inside domain (+200px reach)
  },

  // ── 12. SOUND EFFECTS & AUDIO VOLUME ADJUSTMENTS ───────────────────────────
  sounds: {
    // Basic Attack & Weapon Morphs
    bladeSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    bladeSwingAlt: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    bladeSwingVolume: 1.6,

    maceSmash: 'Assets/Sound Effects/Attacks/groundsmash.mp3',
    maceSmashAlt: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    maceSmashVolume: 1.8,

    fleshHit: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    fleshHitVolume: 1.8,

    subterraneanHumpSound: 'Assets/Sound Effects/Attacks/heavypunch1.mp3',

    whiff: 'Assets/Sound Effects/Skills/woosh.mp3',
    whiffVolume: 1.2,

    // Soul Disfigurement & Detonation
    soulDetonate: null,
    soulDetonateVolume: 1.8,

    farewellVoiceline: 'Assets/Sound Effects/Skills/mahito-farewell-voiceline.mp3',
    farewellVoicelineVolume: 3.2,
    farewellVoicelineChance: 0.10, // Occasional trigger on Soul Disfigurement paralysis

    bodyExplode: 'Assets/Sound Effects/Skills/mahito-body-explode.mp3',
    bodyExplodeVolume: 2.0,

    // Domain Expansion & Ultimates
    domainChannelSound: 'Assets/Sound Effects/Skills/mahito-domainchanneling-voiceline.mp3',
    domainChannelVolume: 3.5,
    domainDeploySound: 'Assets/Sound Effects/Skills/mahito-domaindeploy-voiceline.mp3',
    domainDeployVolume: 3.5,
    domainDeployAltSound: 'Assets/Sound Effects/Skills/gojodomainexpansion.mp3',
    domainDeployAltVolume: 1.0,
    domainExecuteSound: 'Assets/Sound Effects/Skills/mahito-body-explode.mp3',
    domainExecuteVolume: 3.5,

    // Clone Split & Evasion SFX
    splitClone: 'Assets/Sound Effects/Skills/mahito-split-clone2.mp3',
    splitCloneAlt: 'Assets/Sound Effects/Skills/mahito-split-clone1.mp3',
    transformBackVoiceline: 'Assets/Sound Effects/Skills/mahito-transformback-voiceline.mp3',
    transformBackVoicelineVolume: 2.0,
    splitCloneVolume: 1.8,
    cloneNoiseVolume: 1.5,
    cloneNoiseInterval: 50,

    // Passive Dash & Skill Voicelines
    dashVoiceline: 'Assets/Sound Effects/Skills/mahito-dash-voiceline.mp3',
    dashVoicelineVolume: 2.0,
    dashVoicelineChance: 0.05, // Rare/infrequent trigger on passive dash (15%)

    skillVoiceline: 'Assets/Sound Effects/Skills/mahito-skill2-voiceline.mp3',
    skillVoicelineVolume: 2.2,
    skillVoicelineChance: 0.20, // 20% chance to play on skill 2, 3, or 4

    // Minion Summoning & Explosions
    minionsThrowVoiceline: 'Assets/Sound Effects/Skills/mahito-minionsthrow-voiceline.mp3',
    minionsThrowVoicelineVolume: 2.0,
    minionSummon: 'Assets/Sound Effects/Skills/mahito-minion-summon.mp3',
    minionSummonAlt: 'Assets/Sound Effects/Skills/mahito-minion-summon1.mp3',
    minionSummonAlt2: 'Assets/Sound Effects/Skills/mahito-minion-summo2.mp3',
    minionSummons: [
      'Assets/Sound Effects/Skills/mahito-minion-summon.mp3',
      'Assets/Sound Effects/Skills/mahito-minion-summon1.mp3',
      'Assets/Sound Effects/Skills/mahito-minion-summo2.mp3',
    ],
    minionSummonVolume: 1.8,
    minionNoiseVolume: 1.5,
    minionNoiseInterval: 55,
    minionExplosionVolume: 0.5,

    // Skill & Stance SFX Volumes
    subterraneanSurgeVolume: 1.8,
    twinScissorVolume: 1.8,
    drillChargeVolume: 1.8,
    domainVolume: 3.5,
    transformationVolume: 2.2,
  },

  // Legacy Punch Sound Aliases
  punchSound: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
  punchVolume: 1.8,
};
