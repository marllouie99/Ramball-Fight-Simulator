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
    knockbackStrength: 8,    // velocity impulse applied to target on each hit
    magazineSize: 5,    // number of bullets before needing to reload
    reloadTime: 130,    // frames to reload (2 seconds at 60 fps)
  },

  /** Blue — Aimbot fighter */
  aimbot: {
    followUpMinCooldown: 10, // minimum frames of cooldown forced after a follow-up shot
  },

  /** Yellow — Melee fighter */
  melee: {
    speedBoostDuration: 120, // frames the speed burst lasts after a hit (120 = 2 s at 60 fps)
    speedBoostMultiplier: 2.5, // how many times faster Yellow moves during the boost
    trailLength: 10,  // how many past positions are kept for the ghost trail visual
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
    windupDuration: 240, // frames of beam charge before firing (240 = 4 s at 60 fps)
    beamLength: 1200,  // pixels; how far the beam reaches across the arena
    slowDuration: 180,    // frames the slow debuff lasts on hit targets (60 = 1 s)
    slowMultiplier: 1.0,   // speed fraction while slowed (0.6 = 40 % slower)
    slowChance: 1.5,      // probability (0-1) that the beam applies the slow effect on hit
    beamStartKnockback: 1.8, // initial self-knockback impulse when the beam starts
    beamBackwardSpeed: 0.8, // backward drift force while the beam is active
    beamDriftRetention: 0.92, // proportion of current velocity retained each frame during beam fire
    beamDriftBlend: 0.08,   // proportion of beam recoil blended into velocity each frame
    beamRotateSpeed: 0.003, // max radians per frame the beam can rotate toward the target while firing
    initialKnockback: 1,     // velocity impulse on the very first beam contact
    tickDamage: 2.5,     // damage applied every tick interval after the initial hit
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
    swipeCooldown: 60,  // frames between sword swipes (120 = 2 s at 60 fps)
    swipeDuration: 18,   // frames the swipe arc animation plays
    swordDamage: 25,   // damage dealt by a sword swipe
    swordDurability: 3,    // number of swipes before the sword breaks
    shieldBlockChance: 0.30, // probability (0–1) of blocking a direct incoming projectile
    blockFlashFrames: 15,   // duration of the visual flash when a block occurs
    shieldDurability: 2,    // number of successful blocks before the shield breaks
    shieldThrowDamage: 30,  // damage dealt by thrown sword after shield breaks
    swordReturnFrames: 180, // frames until thrown sword returns (≈3s)
    dashChargeFrames: 30,   // frames Gray locks in and charges before the shield dash (≈0.8 s)
    chargeKnockback: 2.0,   // velocity applied to nearby enemies when charging begins
    chargeKnockbackRadius: 90, // radius in px for the charge knockback effect
    dashDuration: 40,   // max frames the dash itself lasts before it auto-cancels
    dashSpeed: 9,    // pixel velocity during the shield dash
    dashDamage: 20,   // damage on shield bash contact
    dashKnockback: 7,    // velocity impulse applied to target on shield bash hit
  },

  /** Black — Black Hole fighter */
  black: {
    shotCooldown: 15,   // frames between shots (medium fire rate)
    blackHoleChance: 0.01, // 100% chance for projectile to become black hole
    blackHoleRadius: 95,   // radius of black hole effect
    blackHoleDuration: 200, // frames the black hole lasts (4 seconds at 60 fps)
    blackHoleDamage: 2,    // damage per second while in black hole
    blackHolePullStrength: 1.0, // velocity pull strength toward black hole center
    skillCooldown: 300,    // frames between skill uses (5 seconds at 60 fps)
    skillSpawnRadius: 120, // radius around opponent to spawn black hole
    // Additional tuning values used by Black fighter implementation
    enhancedBlackHoleChance: 0.2, // increased chance when enemy is already in black hole
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
    dodgeChance: 0.30,           // probability (0-1) of dodging incoming projectiles
    dodgeFlashDuration: 180,      // frames the flash step visual effect lasts (increased for visibility)
    dodgeCooldown: 15,           // frames minimum between dodge attempts

    // TUNING: Flame-contact stealth build
    // When DarkSlateGray is continuously in contact with Orange's flames,
    // it can (with a chance) trigger stealth mode after building up time.
    flameContactStealthBuildFrames: 72, // frames of sustained flame contact before attempting stealth (≈1.2s at 60fps)
    flameContactStealthChance: 0.45,     // chance to trigger stealth when build completes (per attempt)
    flameContactStealthCooldown: 150,    // min frames between stealth triggers from flame contact (≈2.5s at 60fps)


    // TUNING: Invincibility skill activation
    dodgesToActivate: 3,         // number of successful dodges needed to activate skill
    invincibilityDuration: 500, // frames the invincibility lasts (5 seconds at 60 fps)
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

    rageDuration: 350,          // frames rage state lasts (5 seconds at 60 fps)
    rageDamageMultiplier: 1.8, // damage multiplier during rage
    rageAttackSpeedMultiplier: 1.5, // attack speed multiplier during rage (lower cooldown)
    rageMoveSpeedMultiplier: 2.0,  // movement speed multiplier during rage
    lifestealPercent: 0.8,     // HP recovered as percentage of damage dealt during rage (0.3 = 30%)

    axeRange: 35,              // pixels from edge for axe swing attack
    axeCooldown: 25,          // frames between axe swings
    axeDamage: 5,             // base damage per axe swing
    axeSwingDurationFrames: 24, // frames for visible axe chop animation
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
    meleeDamage: 12,          // damage per crescent blade swing
    meleeSwingDuration: 10,   // frames for visible swing animation
    sphereMeleeDamage: 15,    // separate melee damage when inside own sphere
    sphereMeleeCooldown: 6,   // separate melee cooldown when inside own sphere
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

  /** DarkGoldenRod — Machine Gun fighter */
  machinegun: {
    shotCooldown: 4,          // Extremely fast fire rate (every 4 frames)
    bulletDamage: 1.8,        // Low damage per bullet to offset high rate of fire
    bulletSpeed: 11.5,        // Very fast bullet velocity
    heatPerShot: 3.2,         // Builds up heat quickly
    coolRate: 0.6,            // Normal cooling speed when not firing
    overheatCoolRate: 0.8,    // Cooling speed when locked in overheat state
    overheatDuration: 120,    // Jammed duration (2 seconds at 60fps)
    slowMultiplier: 0.4,      // Moves slower when gun is overheated
    skillCooldown: 280,       // Cooldown of Suppressive Sweep roll (4.6 seconds)
    skillRollSpeed: 8.5,      // High speed glide during the roll action
    skillDuration: 30,        // Active frames of rolling
  },
};

// ─────────────────────────────────────────────
// FIGHTER DEFINITIONS — static data only
// ─────────────────────────────────────────────
export const FIGHTER_DEFS = [
  {
    id: 1,
    name: 'Sharpshooter',
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
    name: 'Ranger',
    color: '#4da3ff',
    startX: 460, startY: 280,
    startVx: -1.2, startVy: -0.9,
    radius: 25,
    aimbot: true,
    type: 'aimbot',
    hp: 60,
    damage: 5,
    cooldown: 40,  // 1 second at 60fps
    moveSpeed: 5.0,
    ability: 'Aimbot Laser',
    desc: 'Fires an instant follow up projectile everytime he hits an enemy.',
  },
  {
    id: 3,
    name: 'Spike',
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
    name: 'Alchemist',
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
    name: 'Solar Champion',
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
    color: '#9e9e9e',
    startX: 200, startY: 220,
    startVx: 0.7, startVy: 0.5,
    radius: 25,
    aimbot: false,
    type: 'knight',
    hp: 110,
    damage: 15,   // sword swipe damage (mirrors CONFIG.knight.swordDamage)
    cooldown: 180,  // not used directly; knight manages its own swipeCooldown
    moveSpeed: 3.8,
    ability: "Knight's Code",
    desc: 'Shield passively blocks projectiles. When the sword breaks, locks in and bashes with the shield.',
  },
  {
    id: 7,
    name: 'Void Master',
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
    name: 'Ninja',
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
    name: 'Flame Warden',
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
    name: 'Cronos',
    color: '#07cdfa',
    startX: 300, startY: 240,
    startVx: 1.2, startVy: 0.8,
    radius: 25,
    aimbot: false,
    spinRate: 0.03,
    type: 'cronos',
    hp: 120,
    damage: 15,
    cooldown: 35,
    moveSpeed: 4.8,
    projectileSpeedMultiplier: 1.0,
    ability: 'Time Stop',
    desc: 'Deploys a time stop sphere that freezes enemies. Gain movement speed and attack speed.',
  },
  {
    id: 12,
    name: 'Bomber',
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
    name: 'Storm Commando',
    color: '#b8860b',
    startX: 280, startY: 220,
    startVx: 1.1, startVy: 0.9,
    radius: 25,
    aimbot: false,
    spinRate: 0.02,
    type: 'machinegun',
    hp: 85,
    damage: 1.8,
    cooldown: 4,
    moveSpeed: 4.4,
    ability: 'Suppressive Sweep',
    desc: 'Wields a heavy machine gun with a Heat meter. Active skill triggers a tactical roll while spraying bullets.',
  },
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
