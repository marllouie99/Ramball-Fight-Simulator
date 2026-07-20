// ─────────────────────────────────────────────
// CONFIG — tweak all game values here
// ─────────────────────────────────────────────
export const CONFIG = {
  arena: { x: 40, y: 100, width: 460, height: 460 },
  projectile: { speed: 5.5, radius: 5, life: 120, damage: 10 },
  gun: { baseOffset: 10, barrelLength: 12 }, // distance from fighter edge
  spin: { rate: 0.06 },                        // angle increment per frame (× fighter.speed)
  shoot: { cooldown: 24 },                      // frames between shots
  collision: { restitution: 0.95 },
  spawn: { leftXRatio: 0.25, rightXRatio: 0.75, yRatio: 0.5, verticalOffset: 32 },
  hpBar: { height: 6, yOffset: 16 },
  rounds: { max: 3 },                          // default max rounds for match (used in Fighter.takeDamage)
  globalFighter: {
    sizeMultiplier: 1.1,                       // scale the size of all fighters globally (1.0 = default)
  },

  // ─────────────────────────────────────────────
  // PER-FIGHTER TUNING
  // All attack / behaviour numbers live here so you
  // never need to touch customFighters.js for balance.
  // ─────────────────────────────────────────────

  /** Red — Normal fighter */
  normal: {
    aimThreshold: 0.12, // radians; lower = must face enemy more precisely before firing
    shotCooldown: 10,   // frames between consecutive shots (independent of base cooldown)
    knockbackStrength: 20,    // velocity impulse applied to target on each hit
    magazineSize: 7,    // number of bullets before needing to reload
    reloadTime: 130,    // frames to reload (2 seconds at 60 fps)
  },

  /** Sharpshooter / Crimson Sniper specific */
  sharpshooter: {
    enhancedDamageMultiplier: 2.5, // Damage multiplier for the final execution bullet
    enhancedSpeedMultiplier: 1.5,  // Projectile speed multiplier for the execution bullet
    electrifiedDuration: 45,       // Frames the crackling lightning effect lasts on target (45 = 0.75s)
    electrifiedDamagePerSec: 15,   // Damage per second taken while electrified
    enhancedRecoilForce: 30,       // Massive backward physics push on the shooter when the final bullet is fired
    executeWindupFrames: 30,       // Delay frames (charge up) before firing the execution bullet
  },

  /** Blue — Aimbot fighter */
  aimbot: {
    followUpMinCooldown: 10, // minimum frames of cooldown forced after a follow-up shot
    electricStunDuration: 8, // frames the target is stunned after being hit (10 frames = ~0.16s)
    electricStunChance: 0.40,  // 0.0 to 1.0 chance of triggering the stun on hit (0.5 = 50%)
  },

  /** Yellow — Melee fighter */
  melee: {
    speedBoostDuration: 120, // frames the speed burst lasts after a hit (120 = 2 s at 60 fps)
    speedBoostMultiplier: 2.5, // how many times faster Yellow moves during the boost
    trailLength: 10,  // how many past positions are kept for the ghost trail visual
    rebounceLockChance: 0.4, // chance (0-1) to aggressively dash toward the nearest target upon hitting a wall
  },


  /** Orange — Flamethrower fighter */
  orange: {
    flameCount: 5,                  // number of flame particles per burst
    flameSpread: 0.30,              // radians; half-angle of the flame cone (matches V-shape)
    flameSpeed: 0.5,                // speed of each flame particle
    flameLife: 35,                  // frames each flame particle lives
    flameDamage: 2.0,               // base damage on first flame contact tick
    flameRadius: 2.0,               // radius of each flame particle
    flameContactIntervalSeconds: 0.1, // seconds between flame contact damage ticks
    flameContactRampDamagePerSecond: 0.5, // extra damage per second of continuous flame contact
    flameContactMaxDamage: 10.0,      // max damage per tick while staying in flame
    flameHitCooldown: 0.90,         // legacy: seconds between flame contact damage ticks
    burstCooldown: 4,              // frames between flame physical projectile bursts (reduce to 4 to avoid spawning 300 projs/sec)
    // Flame size settings (independent of speed/life)
    flameRange: 100,               // pixels; maximum range of the flame cone
    flameWidth: 1.00,              // radians; full width of the flame cone (same as flameSpread * 2)
    // Burn effect settings
    burnDuration: 240,             // frames the burn effect lasts (3 seconds at 60 fps)
    burnDamagePerSecond: 2.0,       // damage per second while burning
    burnDamageInterval: 60,         // frames between burn damage ticks (1 second at 60 fps)
    burnSpreadCooldown: 120,        // frames before burn can spread again on same collision
    // Fuel mechanic settings
    maxFuel: 200,                   // maximum fuel capacity
    fuelPerBurst: 1.5,                // fuel consumed per flame burst
    fuelPickupAmount: 120,          // fuel restored per pickup
    fuelPickupRespawnTime: 500,     // frames before fuel pickup respawns (3 seconds at 60 fps)
    maxFuelPickups: 2,              // maximum number of fuel pickups in arena at once
    fuelPickupSpawnInterval: 120,   // frames between attempting to spawn new fuel pickups (2 seconds)
    fuelPickupRadius: 12,          // radius of fuel pickup for collision detection
    fuelBarWidth: 60,              // width of fuel meter bar in pixels
    fuelBarHeight: 8,              // height of fuel meter bar in pixels
    fuelBarOffsetY: 40,            // vertical offset from fighter center for fuel bar
  },

  /** White — Laser fighter */
  laser: {
    aimThreshold: 0.12,  // radians; must face enemy this precisely to start the beam
    beamDuration: 100,   // frames the beam fires for (180 = 3 s at 60 fps)
    windupDuration: 150, // frames of beam charge before firing (240 = 4 s at 60 fps)
    beamLength: 1200,  // pixels; how far the beam reaches across the arena
    slowDuration: 180,    // frames the slow debuff lasts on hit targets (60 = 1 s)
    slowMultiplier: 1.0,   // speed fraction while slowed (0.6 = 40 % slower)
    slowChance: 1.5,      // probability (0-1) that the beam applies the slow effect on hit
    beamStartKnockback: 1.8, // initial self-knockback impulse when the beam starts
    beamBackwardSpeed: 0.8, // backward drift force while the beam is active
    beamDriftRetention: 0.92, // proportion of current velocity retained each frame during beam fire
    beamDriftBlend: 0.08,   // proportion of beam recoil blended into velocity each frame
    beamRotateSpeed: 0.015, // increased to allow the beam to effectively track moving targets
    initialKnockback: 1,     // velocity impulse on the very first beam contact
    tickDamage: 5.5,     // damage applied every tick interval after the initial hit
    tickInterval: 7,    // frames between damage ticks while beam is active
    coreWidth: 4,     // base pixel width of the bright beam core (flickers ± 2 px)
    glowWidth: 12,    // base pixel width of the soft glow layer (flickers ± 4 px)
  },

  /** Green — Grenadier (grenade throw + poison DOT) */
  grenadier: {
    attackRadius: 150, // pixels; enemy must be closer than this to trigger a throw
    throwCooldown: 120, // frames between grenade throws

    // Poison DOT applied by grenade impact
    poisonTicks: 5,            // number of poison ticks
    poisonIntervalFrames: 30, // frames between poison ticks
    poisonDamagePerTick: 2,   // damage per poison tick
  },

  /** Gray — Knight fighter */
  knight: {


    swordRange: 40,   // pixels from edge; how close enemy must be for a sword swipe
    swipeCooldown: 100,  // frames between sword swipes (120 = 2 s at 60 fps)
    swipeDuration: 18,   // frames the swipe arc animation plays
    swordDamage: 20,   // damage dealt by a sword swipe
    swordDurability: 3,    // number of swipes before the sword breaks
    shieldBlockChance: 0.50, // probability (0–1) of blocking a direct incoming projectile
    blockFlashFrames: 15,   // duration of the visual flash when a block occurs
    shieldHoldFrames: 60,   // frames to keep shield in front after successfully blocking an attack
    blockProjectileDetectionRadius: 250, // radius to detect incoming projectiles for shield block visual
    blockMeleeDetectionRadius: 130, // radius to detect close enemies for shield block visual
    shieldDurability: 2,    // number of successful blocks before the shield breaks
    shieldThrowDamage: 30,  // damage dealt by thrown sword after shield breaks
    swordReturnFrames: 180, // frames until thrown sword returns (≈3s)
    dashChargeFrames: 10,   // frames Gray locks in and charges before the shield dash (≈0.8 s)
    chargeKnockback: 2.0,   // velocity applied to nearby enemies when charging begins
    chargeKnockbackRadius: 90, // radius in px for the charge knockback effect
    dashDuration: 40,   // max frames the dash itself lasts before it auto-cancels
    dashSpeed: 9,    // pixel velocity during the shield dash
    dashDamage: 20,   // damage on shield bash contact
    dashKnockback: 7,    // velocity impulse applied to target on shield bash hit
  },

  /** Black — Black Hole fighter */
  black: {
    shotCooldown: 17,   // frames between shots (medium fire rate)
    blackHoleChance: 0.01, // 100% chance for projectile to become black hole
    blackHoleRadius: 95,   // radius of black hole effect
    blackHoleDuration: 200, // frames the black hole lasts (4 seconds at 60 fps)
    blackHoleDamage: 2,    // damage per second while in black hole
    blackHolePullStrength: 1.0, // velocity pull strength toward black hole center
    skillCooldown: 300,    // frames between skill uses (5 seconds at 60 fps)
    skillSpawnRadius: 120, // radius around opponent to spawn black hole
    // Additional tuning values used by Black fighter implementation
    enhancedBlackHoleChance: 0.1, // increased chance when enemy is already in black hole
    enhancedShotsGranted: 1, // number of guaranteed enhanced projectiles granted when enemy is pulled in
    summonIndicatorFrames: 36, // frames for the summon fade-in/out indicator (≈0.6s)
    skillChargeDuration: 30, // frames to charge skill before summoning (1s)
    projectileSpeed: 4.0, // default speed for black projectiles when specified
  },

  /** DarkSlateGray — Ninja fighter */
  darkslategray: {
    // TUNING: Basic attack settings
    shurikenDamage: 5,           // damage per shuriken
    shurikenSpeed: 7.0,          // speed of shuriken projectiles
    shurikenCooldown: 25,        // frames between shuriken throws (normal fire rate)

    // TUNING: Dodge mechanics
    dodgeChance: 0.50,           // probability (0-1) of dodging incoming projectiles
    dodgeFlashDuration: 100,      // frames the flash step visual effect lasts (increased for visibility)
    dodgeCooldown: 15,           // frames minimum between dodge attempts

    // TUNING: Flame-contact stealth build
    // When DarkSlateGray is continuously in contact with Orange's flames,
    // it can (with a chance) trigger stealth mode after building up time.
    flameContactStealthBuildFrames: 72, // frames of sustained flame contact before attempting stealth (≈1.2s at 60fps)
    flameContactStealthChance: 0.45,     // chance to trigger stealth when build completes (per attempt)
    flameContactStealthCooldown: 150,    // min frames between stealth triggers from flame contact (≈2.5s at 60fps)

    // TUNING: Invincibility skill activation
    dodgesToActivate: 3,         // number of successful dodges needed to activate skill
    invincibilityDuration: 300, // frames the invincibility lasts (5 seconds at 60 fps)
    speedBoostMultiplier: 2.5,  // movement speed multiplier during invincibility

    // TUNING: Backstab mechanics
    backstabDamageMultiplier: 2.0, // damage multiplier when backstabbing during invincibility
    backstabAngle: 120,          // angle in degrees considered "behind" enemy (±60° from back)
    backstabRange: 75,          // pixels from enemy edge to trigger backstab
    meleeAttackRadius: 75,      // melee attack radius for backstab detection (INCREASED for easier testing/visibility)
    backstabRecoveryPercent: 0.15, // HP recovery on successful backstab (1.0 = 100%)
    meleeSwingDamage: 5,         // damage dealt by sword swing from any direction
    meleeSwingCooldown: 5,      // frames between sword swings (normal melee attack)
    backstabCooldown: 10,        // frames between backstab attempts
    proximityTriggerRadius: 120,  // additional distance beyond hit radius to trigger stealth dodge

    // TUNING: Weapon animations
    swingAnimationDuration: 30,  // frames for sword swing animation (increased for visibility)
    swingRotationAmount: 1.8,    // radians; total rotation during swing (increased significantly)
    backstabAnimationDuration: 20, // frames for backstab thrust animation
    backstabThrustAmount: 1.5,   // radians; rotation during backstab (increased significantly)

    // TUNING: Visual effects
    invisibilityAlpha: 0.15,    // transparency level during invincibility (0-1, lower = more transparent)
    dodgeAlpha: 0.08,           // transparency level during dodge fade
    flashStepAlpha: 0.3,        // alpha of the flash step afterimage (higher for visible dodge effects)
    flashStepCount: 5,          // number of afterimages during flash step
    weaponSwitchDuration: 12,   // frames for weapon swap animation during stealth
  },

  /** Berserker — Blood Red fighter */
  berserker: {
    // TUNING: Rage mechanic
    maxRage: 100,               // maximum rage meter

    // Rage meter grows based on *attacker damage value* (NOT number of hits)
    // rage gained = attackerDamage * rageFromDamageScale
    ragePerDamage: 0,           // legacy (disabled)
    rageFromDamageScale: 2.5,

    rageDuration: 200,          // frames rage state lasts (5 seconds at 60 fps)
    rageDamageMultiplier: 1.8, // damage multiplier during rage
    rageAttackSpeedMultiplier: 1.1, // attack speed multiplier during rage (lower cooldown)
    rageMoveSpeedMultiplier: 2.0,  // movement speed multiplier during rage
    lifestealPercent: 0.8,     // HP recovered as percentage of damage dealt during rage (0.3 = 30%)

    axeRange: 35,              // pixels from edge for axe swing attack
    axeCooldown: 25,          // frames between axe swings
    axeDamage: 5,             // base damage per axe swing
    axeSwingDurationFrames: 30, // frames for visible axe chop animation
    axeWindupDuration: 6,     // frames of wind-up anticipation before swing
    dualAxeBonus: 1.3,         // damage multiplier when both axes hit (during rage)

    // During rage, rebounce snap point is moved away from the opponent.
    // Smaller value => snap closer to opponent => tighter re-engage.
    rageRebounceAwayDistance: 2, // pixels

    // Rage radius ring size = axeRange * rageRadiusScale
    rageRadiusScale: 1.0,
  },

  /** Cronos — Time Stop fighter */
  cronos: {
    // TUNING: Time Stop Sphere mechanics
    sphereRadius: 200,         // radius of the time stop sphere
    sphereDuration: 200,       // frames the sphere lasts (3 seconds at 60 fps)
    sphereCooldown: 800,       // frames between sphere deployments (5 seconds at 60 fps)
    sphereSpeedMultiplier: 5.0, // movement speed multiplier inside sphere
    sphereActivationDistance: 120, // max distance to opponent to trigger sphere activation

    // TUNING: Passive skills
    passiveStopChance: 0.05,   // chance to stop enemy movement on hit (80%)
    passiveStopDuration: 20,   // frames enemy movement is stopped (1 second)
    counterStopChance: 0.05,  // chance to stop enemy when Cronos gets attacked (15%)
    counterStopDuration: 25,  // frames enemy movement is stopped on counter (0.75 seconds)

    // TUNING: Melee attack
    meleeRange: 50,            // pixels from edge for crescent blade attack
    meleeCooldown: 90,         // frames between melee attacks
    meleeDamage: 10,          // damage per crescent blade swing
    meleeSwingDuration: 10,   // frames for visible swing animation
    sphereMeleeDamage: 2,    // separate melee damage when inside own sphere
    sphereMeleeCooldown: 10,   // separate melee cooldown when inside own sphere
    doubleStrikeWindow: 10,    // frames window to execute the second strike
    // TUNING: Bounce mechanics inside sphere
    sphereBounceForce: 0.5,   // velocity multiplier when bouncing inside sphere
    spherePreActivateFrames: 120, // frames before cooldown ends that the barrier starts glowing
    maxFrozenProjectiles: 25,    // max projectiles frozen in time sphere (performance limit)
  },

  /** Bomber — Explosive fighter */
  bomber: {
    // TUNING: Basic attack (grenades)
    grenadeDamage: 17,         // damage per grenade explosion
    grenadeCooldown: 90,       // frames between grenade throws
    grenadeSpeed: 4.2,         // speed of thrown grenades
    grenadeRadius: 8,         // radius of grenade projectile
    grenadeLife: 120,           // frames grenade travels before auto-exploding
    explosionRadius: 70,       // AOE radius of grenade explosion
    explosionDamage: 10,       // AOE damage from grenade explosion

    // TUNING: Sticky bomb (passive)
    stickyBombChance: 0.25,    // chance (0-1) to throw sticky bomb instead of grenade
    stickyBombDamage: 15,     // damage of sticky bomb explosion
    stickyBombStickDuration: 60, // frames sticky bomb stays attached before exploding
    stickyBombExplosionRadius: 65, // AOE radius of sticky bomb explosion

    // TUNING: C4 skill
    c4Cooldown: 400,           // frames between C4 deployments (6.67 seconds at 60 fps)
    c4PlantDuration: 180,      // frames before C4 auto-explodes (3 seconds at 60 fps)
    c4Damage: 35,              // damage of C4 explosion
    c4ExplosionRadius: 100,    // AOE radius of C4 explosion
    c4PlantRadius: 80,         // max distance to plant C4

    // TUNING: Death C4 (unique mechanic)
    deathC4Duration: 150,       // frames after death before C4 explodes (1.5 seconds)
    deathC4Damage: 25,         // damage of death C4 explosion
    deathC4ExplosionRadius: 180, // AOE radius of death C4 explosion

    // TUNING: Concussive blast (knockback from explosions)
    concussiveBlast: {
      enabled: true,
      baseKnockback: 22,
      falloffExponent: 1.5,
      verticalKnockback: 0.3,
      minKnockbackRadius: 0.2,
      stunChance: 0.15,
      stunDuration: 20,
    },

    // TUNING: Chain reaction (bombs trigger nearby bombs)
    chainReaction: {
      enabled: true,
      chainRadius: 60,
      maxChains: 3,
    },

    // TUNING: Grenade range restrictions
    throwRadius: 400,        // max distance at which bomber can throw grenades
    restrictRadius: 130,      // min distance — bomber cannot throw grenades inside this radius    optimalDistance: 145,    // sweet-spot distance bomber tries to maintain from opponent
    steeringForce: 0.35,     // how strongly bomber steers toward optimal distance (0-1)
  },

  /** Gun Slinger — Dual revolver fighter */
  gunslinger: {
    // TUNING: Magazine system
    magazineSize: 24,         // number of bullets in the magazine (6 per gun)
    reloadTime: 90,           // frames to reload (1.5 seconds at 60 fps)
    magazineRegenRate: 0,     // bullets regenerated per second (0 = manual reload only)
    reloadSpeedPenalty: 0.5,  // movement speed multiplier during reload (0.5 = 50% speed)

    // TUNING: Basic attack (alternating dual revolvers)
    leftGunDelay: 8,          // frames delay for left gun shot after right gun
    shotCooldown: 15,         // frames between alternating shots (rapid fire)
    bulletDamage: 5,          // damage per bullet
    bulletSpeed: 10.0,        // speed of bullets
    basicAttackKnockback: 5.0,// very small knockback on basic attacks

    // TUNING: Passive skill (damage multiplier chance)
    critChance: 0.20,         // chance (0-1) to deal critical damage
    critMultiplier: 1.8,      // damage multiplier on critical hit

    // TUNING: Active skill (rapid sync fire) - requires full magazine
    skillCooldown: 300,       // frames between skill uses (5 seconds at 60 fps)
    skillDuration: 60,        // frames the rapid sync fire lasts (1 second at 60 fps)
    skillBurstCount: 8,       // number of bullet pairs fired during skill
    skillBurstInterval: 8,    // frames between each bullet pair during skill
    skillDamage: 2,           // damage per bullet during skill (lower but balanced)
    skillRequiresFullMag: true, // skill can only be activated with full magazine
    autoSkillThreshold: 3,     // bullets or less triggers active skill before reload
    leftGunAngleOffset: 0.3,   // default left gun aim offset when no secondary target exists
  },

  /** Doppleganger — Illusion melee fighter */
  doppleganger: {
    // TUNING: Melee attack (purple sword)
    swordRange: 40,           // pixels from edge for sword swing attack
    swordCooldown: 45,        // frames between sword swings
    swordDamage: 10,         // damage per sword swing
    swordSwingDuration: 20,   // frames for visible sword swing animation

    // TUNING: Passive skill (illusion summoning)
    illusionHealthPercent: 0.25, // health percentage threshold for summoning illusion (25%)
    maxIllusions: 4,         // maximum number of illusions that can exist at once
    illusionDamagePercent: 0.5, // illusions deal 50% of original damage
    illusionDamageReceivedMultiplier: 2.5, // illusions receive 2x damage
    illusionDuration: 600,    // frames illusions last before fading (10 seconds at 60 fps)
    illusionSpeedSync: true,  // if true, illusions spawn with current speed; if false, use base speed
  },

  /** Engineer — Turret and Shotgun/Wrench */
  Engineer: {
    // Turret config
    turretSpawnDistance: -40, // Negative means spawn BEHIND the engineer, positive means IN FRONT
    turretBuildTime: 90,

    // Shotgun stats (Range)
    shotgunCooldown: 80,
    shotgunPellets: 8,        // Increased from 5
    shotgunSpread: 0.45,      // Spread angle in radians (wider)
    shotgunDamage: 0.5,       // Lower per pellet, but more pellets total
    shotgunSpeed: 30,         // Extremely fast initial burst, slowed down by drag
    shotgunRange: 400,        // Max distance to trigger shotgun attack

    // Wrench stats (Melee)
    wrenchCooldown: 30,
    wrenchDamage: 15,
    wrenchRange: 85,          // Melee distance
    wrenchSwipeDuration: 10,  // Animation duration

    // Turret stats (Skill)
    skillCooldown: 1000,
    turretHp: 100,
    turretDamage: 0.2,
    turretFireRate: 7,
    turretRange: 350,
    turretBulletSpeed: 9,
    turretAimSpeed: 0.08,     // Radians per frame
    turretBuildTime: 150,      // Frames to build turret (1.5 seconds)
    turretHealAmount: 30,     // Healing applied when bounced into
    turretHealCooldown: 60,   // Cooldown between heal triggers per turret
    turretAmmo: 20,            // Shots per magazine before reloading
    turretReloadTime: 90,     // Frames to reload (1.5 seconds at 60fps)
    turretAmmoBarOffsetY: 25, // Distance above turret to draw ammo UI
    turretReloadBarWidth: 30, // Width of the reload progress bar
    turretReloadBarHeight: 5, // Height of the reload progress bar
    turretAmmoPipWidth: 4,    // Diameter of individual ammo pips
    turretAmmoPipSpacing: 6,  // Spacing between ammo pips
  },

  /** Ruby — Scythe fighter */
  ruby: {
    // Basic Attack
    scytheDamage: 10,
    scytheRange: 45, // pixels from edge
    scytheCooldown: 40,
    lifestealPercent: 0.25, // 25% of damage dealt

    // Active Skill (Pull)
    activePullRange: 200,
    activePullCooldown: 240, // 4 seconds at 60fps
    activePullForce: 12.0,
    activeSlowDuration: 20, // 1.5 seconds at 60fps

    // Passive Skill (360 Spin)
    passiveSpinRadius: 80,
    passiveSpinCooldown: 300, // 5 seconds at 60fps
    passiveSpinDamage: 15,
    passiveLifestealPercent: 1.00, // 50% lifesteal on spin

    // Core Mechanic (Dash)
    dashSpeedMultiplier: 3.0,
    dashDuration: 12,
  },

  /** Musashi — Dual Sword Stance Fighter */
  musashi: {
    // General
    stanceDurationFrames: 300, // 5 seconds per stance
    baseMoveSpeed: 4.8,

    // Core Attack (Dual Wielding)
    swordRange: 40,
    attackCooldown: 80, // frames between dual sword strikes
    katanaDamage: 10,
    wakizashiDamage: 8,
    strikeDurationFrames: 10,

    // Stances
    earthArmorMultiplier: 1.1,    // takes 50% damage
    earthSpeedMultiplier: 1.1,
    waterSpeedMultiplier: 1.3,
    waterDodgeDistance: 80,
    fireDamageMultiplier: 1.0,
    fireDamageTakenMultiplier: 1.1,
    windDeflectRadius: 100,
    voidDodgeChance: 1.0,         // 100% dodge
    voidLethalDamage: 10,

    // Active Abilities
    nitenStrikeCooldown: 300,
    nitenStrikeKnockback: 15,
    nitenStrikeDamage: 7, // total

    flurryCooldown: 700,
    flurryDamage: 5,

    preemptiveStrikeCooldown: 360,
    preemptiveStrikeDuration: 60, // Window to get hit and counter
    preemptiveCounterDamage: 7,
  },

  /** Trickster — Spell Steal and Arcane Magic */
  trickster: {
    // Basic Attack: Arcane Bolt
    boltDamage: 12,
    boltSpeed: 8,
    bounceCount: 4,
    bounceDamageMultiplier: 0.7, // Damage multiplier on each bounce
    attackCooldown: 100,

    // Skill 1: Telekinesis
    telekinesisCooldown: 400,
    telekinesisDuration: 90, // Frames target is held in air
    telekinesisStunRadius: 100, // AoE stun on landing
    telekinesisStunDuration: 60, // Frames enemies are stunned on landing
    telekinesisRange: 250,

    // Ultimate: Spell Steal
    spellStealCooldown: 1000,
    spellStealDuration: 1000, // 7 seconds
    spellStealRange: 350,
  },

  /** Zeus — Lightning Spell Caster */
  zeus: {
    // Basic Attack: Chain Lightning (fast projectile)
    lightningDamage: 8,
    lightningSpeed: 30,
    chainCount: 3,         // How many times it bounces
    chainRange: 150,       // Range to find next target
    chainDamageMultiplier: 0.8, // Decay per bounce
    attackCooldown: 150,

    // Debuff system
    stunChance: 1.0,
    stunDuration: 10,
    paralyzeChance: 0.3,
    paralyzeDuration: 60,
    paralyzeSlowMultiplier: 0.5,
    staticChance: 0.5,
    staticDuration: 120,
    staticDamageBonus: 1.5, // 50% extra damage to static targets

    // Passive: Aegis Shield
    aegisCooldown: 300,    // 5 seconds
    aegisShockDamage: 15,
    aegisParalyzeDuration: 90,
    aegisTriggerRange: 200, // Increased range to trigger on more attacks

    // Ultimate: Storm
    stormCooldown: 900,    // 15 seconds
    stormDuration: 130,    // 3 seconds
    stormStrikesPerSec: 3, // Per enemy
    stormStrikeDamage: 5,

    // Storm Visuals & FX
    stormTelegraphFrames: 120,       // Duration of the channeling wind-up
    stormDimOpacity: 0.7,            // How dark the arena becomes
    stormCastShakeIntensity: 8,      // Screen shake when storm activates
    stormCastShakeFrames: 20,
    stormStrikeShakeIntensity: 4,    // Screen shake on each lightning impact
    stormStrikeShakeFrames: 10,
  },

  /** Gojo Satoru — Limitless Fighter */
  gojo: {
    infinityCooldown: 240,    // Cooldown before Infinity block triggers again
    blueCooldown: 80,         // Fire rate for basic attack (Blue orb) - Lower is faster
    blueSpeed: 7.5,           // Speed of Blue orb projectile
    blueRadius: 100,           // Pull radius of Blue explosion
    bluePullForce: 6.5,       // Pull strength of Blue
    redKnockback: 25,         // Knockback force of Red
    redCooldown: 300,         // Cooldown of Red
    redRange: 100,            // Range to trigger Red
    purpleCooldown: 650,      // Cooldown of Hollow Purple
    purpleChargeMax: 100,     // Frames required to mix Red and Blue into Purple (channeling duration)
    purpleDamage: 10,         // Continuous piercing damage per tick
    purpleSpeed: 5,           // Speed of Purple orb
    purpleRadius: 50,         // Radius of Purple orb
    purpleLife: 250,         // How long Purple orb stays in arena (frames)
    purpleTravelTime: 20,    // Frames the orb travels before stopping (0 = stop immediately)
    purpleScale: 10.0,        // Scale multiplier for hit radius (visual size)
    purpleDPS: 30,            // Damage per second dealt to enemies inside the orb
    purpleDPSInterval: 10,   // Frames between DPS ticks (30 = 0.5s at 60fps)
    purpleSlowDuration: 60,  // Frames the slow effect lasts (1 second at 60fps)
    purpleSlowMultiplier: 0.5, // Speed multiplier while slowed (0.5 = 50% speed)
    purplePullForce: 5.0,    // How strongly enemies are dragged toward the orb center
    purpleShakeIntensity: 5, // Screen shake intensity when purple orb fires
    purpleShakeDuration: 30,  // Screen shake duration when purple orb fires
    domainCooldown: 1200,     // 20s Ultimate cooldown
    domainDuration: 180,      // Domain lasts 3 seconds (paralyzes enemies)
    // Reverse Cursed Technique - Self heal when at low HP
    reverseCursedTechniqueHpThreshold: 0.30,  // Triggers when HP drops to 25% or below
    reverseCursedTechniqueHealPercent: 0.20,   // Heals 35% of max HP
    reverseCursedTechniqueCooldown: 550,      // 15 second cooldown before it can trigger again
    // Melee Mode (Hand-to-Hand Combat)
    initialMeleeDuration: 100, // Forces hand-to-hand combat for the initial duration
    meleeModeCooldown: 600,   // 10 second cooldown before hand-to-hand combat mode can trigger again
    closeRangeRadius: 120,    // Distance at which Gojo switches to melee mode
    meleePunchDamage: 3,     // Damage dealt by each punch
    meleePunchCooldown: 20,   // Frames between punches
    teleportDelay: 5,        // Frames delay before teleport after punch
    teleportSpeed: 15,        // Speed of teleport movement (pixels per frame)
  },

  /** Ryomen Sukuna — King of Curses */
  sukuna: {
    // Reverse Cursed Technique (Passive)
    reverseCursedTechniqueHpThreshold: 0.30,  // Triggers when HP drops to 30% or below
    reverseCursedTechniqueHealPercent: 0.40,   // Heals 40% of max HP
    reverseCursedTechniqueCooldown: 1200,      // 20 second cooldown before it can trigger again

    // Basic Attack: Dismantle (Long Distance) & Cursed Martial Arts (Close Distance)
    slashDamage: 8,          // Base damage per Dismantle / Martial Arts strike
    slashSpeed: 50,          // Speed of Dismantle slash projectiles
    slashCooldown: 50,       // Frames between basic attacks
    meleeDistanceThreshold: 50, // Distance threshold for switching to Cursed Martial Arts
    meleePunchCooldown: 30,  // Attack speed of melee punches (lower = faster)

    // Bleed Debuff
    bleedDamagePerStack: 2,  // Damage per bleed stack
    maxBleedStacks: 5,        // Maximum bleed stacks
    bleedDuration: 180,       // Frames bleed lasts (3 seconds)

    // Skill 1: Phantom Flurry + Cleave
    flurryCooldown: 600,      // Cooldown between Phantom Flurry activations
    flurryHits: 10,            // Number of strikes in flurry
    flurryDamage: 6,          // Damage per flurry strike
    flurryHitInterval: 5,     // Frames between flurry strikes
    flurryRange: 150,          // Range to trigger flurry
    flurryCleaveBonusMultiplier: 2.0, // Bonus Dismantle/Cleave damage multiplier on flurry finish
    rapidSlashCooldown: 20,     // Frames between rapid slashes after flurry (lower = faster)

    // Skill 2: Furnace (Divine Flame / Fuga) — Thermobaric Nuke
    divineFlameCooldown: 610,      // Cooldown between Furnace uses (8.33 seconds)
    divineFlameChargeMax: 150,      // Charge up duration (1.5 seconds)
    divineFlameDamage: 30,         // Primary direct hit nuke damage
    divineFlameSpeed: 10,          // Speed of Furnace fire arrow
    divineFlameRecoveryTime: 60,   // Recovery delay after firing (1 second)
    divineFlameShakeIntensity: 16, // Screen shake intensity on impact
    divineFlameShakeDuration: 22,  // Screen shake duration
    thermobaricSplashRadius: 130,  // Thermobaric explosion splash damage radius

    // Ultimate Skill: Domain Expansion — Malevolent Shrine
    domainCooldown: 1000,     // Cooldown before domain can trigger (25 seconds at 60 fps)
    domainDuration: 2000,      // Domain duration (3 seconds)
    domainDamage: 5,          // Base damage per slash tick
    domainDamageInterval: 10,  // Frames between slash ticks
    domainRapidSlashCooldown: 20, // Frames between Sukuna's rapid teleport slashes inside Domain
    domainRadius: 240,        // Radius of the open-air death zone
    domainRampRatePerSec: 0.10,// 10% damage increase per second targets stay inside
  },
};

// ─────────────────────────────────────────────
// FIGHTER DEFINITIONS — static data only
// ─────────────────────────────────────────────
export const FIGHTER_DEFS = [
  {
    id: 1,
    name: 'Sharpshooter',
    category: 'Sci-Fi & Modern',
    color: '#ff4d4d',
    startX: 140, startY: 180,
    startVx: 1.4, startVy: 1.0,
    radius: 25,
    aimbot: false,
    spinRate: 0.01,
    type: 'normal',
    hp: 65,
    damage: 15,
    cooldown: 70, // 1 second at 60fps
    moveSpeed: 5.0,
    projectileSpeedMultiplier: 3.0,
    ability: 'Straight Fire',
    desc: 'Fires heavy projectiles straight ahead. High damage, slow reload rate.',
  },
  {
    id: 2,
    name: 'Jazz',
    category: 'Sci-Fi & Modern',
    color: '#4da3ff',
    startX: 460, startY: 280,
    startVx: -1.2, startVy: -0.9,
    radius: 25,
    aimbot: true,
    type: 'aimbot',
    hp: 60,
    damage: 5,
    cooldown: 30,  // 1 second at 60fps
    moveSpeed: 5.0,
    ability: 'Aimbot Laser',
    desc: 'Wields a dubstep gun that fires musical notes and triggers an instant follow-up projectile on hit.',
  },
  {
    id: 3,
    name: 'Spike',
    category: 'Fantasy & Magic',
    color: '#e5c158',
    startX: 300, startY: 240, // start center
    startVx: 1.6, startVy: -1.2,
    radius: 25,
    aimbot: false,
    type: 'melee',
    hp: 100,
    damage: 25,
    cooldown: 60,  // 1.5 seconds at 60fps
    moveSpeed: 5.5,
    ability: 'Spiked Shell',
    desc: 'Deals damage on collision and gain movement speed boost.',
  },
  {
    id: 4,
    name: 'Circe',
    category: 'Greek Mythology',
    color: '#4dff4d',
    startX: 220, startY: 240,
    startVx: 1.3, startVy: 1.1,
    radius: 25,
    aimbot: false,
    type: 'grenadier',
    hp: 75,
    damage: 15,
    cooldown: 0,
    moveSpeed: 4.7,
    ability: 'Poison Grenade',
    desc: 'Throws a poison and deals AOE damage and poisons them.',
  },
  {
    id: 5,
    name: 'Hyperion',
    category: 'Greek Mythology',
    color: '#ffffff',
    startX: 300, startY: 210,
    startVx: 1.4, startVy: 1.0,
    radius: 25,
    aimbot: false,
    spinRate: 0.03,
    type: 'laser',
    hp: 80,
    damage: 15,
    cooldown: 300, // 3 seconds cooldown
    moveSpeed: 4.0,
    ability: 'Sustained Laser',
    desc: 'Fires a continuous laser beam.',
  },
  {
    id: 6,
    name: 'Knight',
    category: 'Fantasy & Magic',
    color: '#9e9e9e',
    startX: 200, startY: 220,
    startVx: 0.7, startVy: 0.5,
    radius: 25,
    aimbot: false,
    type: 'knight',
    hp: 110,
    damage: 20,   // sword swipe damage (mirrors CONFIG.knight.swordDamage)
    cooldown: 180,  // not used directly; knight manages its own swipeCooldown
    moveSpeed: 3.8,
    ability: "Knight's Code",
    desc: 'Shield passively blocks projectiles. When the sword breaks, locks in and bashes with the shield.',
  },
  {
    id: 7,
    name: 'Erebus',
    category: 'Greek Mythology',
    color: '#6200a0',
    startX: 250, startY: 260,
    startVx: 1.0, startVy: 0.8,
    radius: 25,
    aimbot: false,
    spinRate: 0.07,
    type: 'black',
    hp: 70,
    damage: 5,
    cooldown: 10,
    moveSpeed: 5.0,
    projectileSpeedMultiplier: 1.0,
    ability: 'Black Hole',
    desc: 'Summons a black hole near the opponent, dragging them in and dealing damage over time.',
  },
  {
    id: 8,
    name: 'Shinobi',
    category: 'Japanese',
    color: '#2f4f4f',
    startX: 280, startY: 250,
    startVx: 1.2, startVy: -0.8,
    radius: 25,
    aimbot: false,
    spinRate: 0.05,
    type: 'darkslategray',
    hp: 50,
    damage: 5,
    cooldown: 25,
    moveSpeed: 5.5,
    projectileSpeedMultiplier: 1.0,
    ability: 'Shadow Arts',
    desc: 'Fighter with stealthy moves. Passively dodges projectiles. After 3 dodges, becomes invisible with speed boost and deals 2x backstab damage.',
  },
  {
    id: 9,
    name: 'Ember',
    category: 'Fantasy & Magic',
    color: '#ff8c00',
    startX: 300, startY: 230,
    startVx: 1.3, startVy: 1.0,
    radius: 25,
    aimbot: false,
    spinRate: 0.02,
    type: 'orange',
    hp: 100,
    damage: 10,
    cooldown: 30,
    moveSpeed: 4.0,
    projectileSpeedMultiplier: 1.0,
    ability: 'Auto-Lock Flamethrower',
    desc: 'Burns enemies with burning effect.',
  },
  {
    id: 10,
    name: 'Berserker',
    category: 'Fantasy & Magic',
    color: '#8b0000',
    startX: 320, startY: 260,
    startVx: 1.5, startVy: -1.0,
    radius: 25,
    aimbot: false,
    spinRate: 0.04,
    type: 'berserker',
    hp: 80,
    damage: 5,
    cooldown: 40,
    moveSpeed: 5.0,
    projectileSpeedMultiplier: 1.0,
    ability: 'Rage',
    desc: 'Gains rage when taking damage. During rage: increased damage, attack speed, movement speed, and lifesteal.',
  },
  {
    id: 11,
    name: 'Cronus',
    category: 'Greek Mythology',
    color: '#07cdfa',
    startX: 300, startY: 240,
    startVx: 1.2, startVy: 0.8,
    radius: 25,
    aimbot: false,
    spinRate: 0.03,
    type: 'cronos',
    hp: 120,
    damage: 10,
    cooldown: 35,
    moveSpeed: 4.8,
    projectileSpeedMultiplier: 1.0,
    ability: 'Time Stop',
    desc: 'Deploys a time stop sphere that freezes enemies. Gain movement speed and attack speed.',
  },
  {
    id: 12,
    name: 'Bombardier',
    category: 'Sci-Fi & Modern',
    color: '#6A3F1E',
    skinColor: '#5A3B1A',
    skinAccentColor: '#E0B05B',
    startX: 280, startY: 260,
    startVx: 1.3, startVy: -0.9,
    radius: 25,
    aimbot: false,
    spinRate: 0.04,
    type: 'bomber',
    hp: 85,
    damage: 12,
    cooldown: 45,
    moveSpeed: 4.5,
    projectileSpeedMultiplier: 1.0,
    ability: 'Explosive Expert',
    desc: 'Throws grenades that explode on impact dealing AOE damag. Leaves a powerful C4 bomb on death.',
  },
  {
    id: 13,
    name: 'Gun Slinger',
    category: 'Sci-Fi & Modern',
    color: '#C19A6B',
    startX: 260, startY: 250,
    startVx: 1.4, startVy: -0.8,
    radius: 25,
    aimbot: false,
    spinRate: 0.03,
    type: 'gunslinger',
    hp: 70,
    damage: 3.5,
    cooldown: 15,
    moveSpeed: 5.0,
    projectileSpeedMultiplier: 1.0,
    ability: 'Dual Revolvers',
    desc: 'Wields dual revolvers on both sides. Active skill fires both guns rapidly.',
  },
  {
    id: 14,
    name: 'Doppelganger',
    category: 'Fantasy & Magic',
    color: '#9b59b6',
    startX: 300, startY: 240,
    startVx: 1.3, startVy: -1.0,
    radius: 25,
    aimbot: false,
    spinRate: 0,
    type: 'doppleganger',
    hp: 100,
    damage: 10,
    cooldown: 45,
    moveSpeed: 5.5,
    projectileSpeedMultiplier: 1.0,
    ability: 'Mirror Image',
    desc: 'Summons illusions of itself every 25% health lost.',
  },
  {
    id: 15,
    name: 'Engineer',
    category: 'Sci-Fi & Modern',
    color: '#b8860b',
    startX: 280, startY: 220,
    startVx: 1.1, startVy: 0.9,
    radius: 25,
    aimbot: false,
    spinRate: 0.02,
    type: 'Engineer',
    hp: 100,
    damage: 5,
    cooldown: 4,
    moveSpeed: 4.4,
    ability: 'Deploy Turret',
    desc: 'Builds a Turret to assist Engineer in fight.',
  },
  {
    id: 16,
    name: 'Ruby',
    category: 'Fantasy & Magic',
    color: '#E0115F',
    startX: 310, startY: 250,
    startVx: 1.4, startVy: 0.9,
    radius: 25,
    aimbot: false,
    spinRate: 0.05,
    type: 'ruby',
    hp: 90,
    damage: 12,
    cooldown: 40,
    moveSpeed: 4.8,
    projectileSpeedMultiplier: 1.0,
    ability: 'Scythe Dance',
    desc: 'Casting abilities triggers a short dash. Swings and pulls scythe to lifesteal.',
  },
  {
    id: 17,
    name: 'Musashi',
    category: 'Japanese',
    color: '#34495e',
    startX: 290, startY: 240,
    startVx: 1.2, startVy: -1.0,
    radius: 25,
    aimbot: false,
    spinRate: 0.03,
    type: 'musashi',
    hp: 100,
    damage: 10, // (Katana + Wakizashi)
    cooldown: 45,
    moveSpeed: 4.8,
    projectileSpeedMultiplier: 1.0,
    ability: 'Dual Stances',
    desc: 'Switches between five stances (Earth, Water, Fire, Wind, Void) giving passive effects and unique skills.',
  },
  {
    id: 18,
    name: 'Trickster',
    category: 'Fantasy & Magic',
    color: '#03e631ff',
    startX: 310, startY: 230,
    startVx: -1.2, startVy: 1.0,
    radius: 25,
    aimbot: false,
    spinRate: 0.02,
    type: 'trickster',
    hp: 85,
    damage: 12,
    cooldown: 100,
    moveSpeed: 8.2,
    projectileSpeedMultiplier: 1.0,
    ability: 'Spell Steal',
    desc: 'Fires bouncing arcane bolts. Telekinetically lifts and stuns enemies. Ultimate steals the last used enemy skill.',
  },
  {
    id: 19,
    name: 'Zeus',
    category: 'Greek Mythology',
    color: '#00BFFF',
    startX: 300, startY: 250,
    startVx: 1.1, startVy: 0.9,
    radius: 25,
    aimbot: true,
    spinRate: 0,
    type: 'zeus',
    hp: 150,
    damage: 8,
    cooldown: 100,
    moveSpeed: 3.0,
    projectileSpeedMultiplier: 1.0,
    ability: 'Storm Bringer',
    desc: 'Throws chain lightning. Passively shocks melee attackers. Ultimate summons a map-wide thunderstorm.',
  },
  {
    id: 20,
    name: 'Hydra',
    category: 'Fantasy & Magic',
    color: '#4B0082', // Dark Purple
    startX: 300, startY: 250,
    startVx: 0.8, startVy: 0.7,
    radius: 25, // Standard size
    aimbot: false,
    spinRate: 0,
    type: 'hydra',
    hp: 1000, // 5x health
    damage: 8, // Very low base damage. When stealing a weapon, uses the copied fighter's exact damage value.
    cooldown: 0, // Doesn't fire normally
    moveSpeed: 8.5, // Slow
    projectileSpeedMultiplier: 1.0,
    ability: 'The Overdrive',
    desc: 'Extremely tanky. Steals physical weapons upon being hit (copying their exact damage). Passively destroys incoming projectiles. Ultimate grants CC immunity.',
  },
  {
    id: 21,
    name: 'Gojo',
    category: 'Anime',
    color: '#E0FFFF', // Light Cyan
    startX: 300, startY: 250,
    startVx: 1.1, startVy: 0.9,
    radius: 25,
    aimbot: false,
    spinRate: 0,
    type: 'gojo',
    hp: 1000,
    damage: 8,
    cooldown: 80,
    moveSpeed: 4.5,
    projectileSpeedMultiplier: 6.0,
    ability: 'Limitless',
    desc: 'Passively blocks attacks with Infinity. Uses Lapse Blue to pull and Reversal Red to repel. Hollow Purple pierces everything, and Unlimited Void stuns all enemies.',
  },
  {
    id: 22,
    name: 'Sukuna',
    category: 'Anime',
    color: '#8B0000', // Dark Crimson
    startX: 300, startY: 250,
    startVx: 1.2, startVy: 1.0,
    radius: 25,
    aimbot: false,
    spinRate: 0,
    type: 'sukuna',
    hp: 1000,
    damage: 8,
    cooldown: 80,
    moveSpeed: 4.8,
    projectileSpeedMultiplier: 3.0,
    ability: 'King of Curses',
    desc: 'Passively heals with Reverse Cursed Technique at low HP. Basic attacks apply bleed and break shields. Spiderweb triggers when surrounded. Divine Flame is a devastating fire arrow. Malevolent Shrine domain deals unblockable damage.',
  }
];

// ─────────────────────────────────────────────
// DERIVED CONSTANTS
// ─────────────────────────────────────────────

/** Total distance from fighter center to gun barrel tip. */
export const GUN_TIP_DIST = (r) => r + CONFIG.gun.baseOffset + CONFIG.gun.barrelLength;

/** Helper function to get fighter definition by ID */
export function getFighterById(id) {
  return FIGHTER_DEFS.find(def => def.id === id);
}

