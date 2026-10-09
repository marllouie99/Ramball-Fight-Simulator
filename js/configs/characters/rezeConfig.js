// ─────────────────────────────────────────────
// Reze (The Bomb Devil Hybrid) Character Config
// Chainsaw Man / Soviet Assassin & Bomb Devil
// ─────────────────────────────────────────────

export const rezeConfig = {
  assets: {
    hair: 'Assets/model/reze/Reze-hair.png',
    skin: 'Assets/model/reze/REZE-MODEL-SKIN.png',
    weapon: 'Assets/model/reze/REZE-WEAPON.png',
  },

  name: 'Reze',
  displayName: 'Reze',
  bossTitle: 'Bomb Devil',
  title: 'Bomb Devil',

  // Baseline Attributes
  hp: 340,
  maxHpRatio: 1.0,
  speed: 5.8,
  moveSpeed: 5.8,
  r: 25,
  radius: 25,
  color: '#430363ff',          // Imperial Plum / Deep Violet
  themeColor: '#430363ff',
  secondaryColor: '#FFE600',   // Spark Gold
  accentCrimson: '#FF2E00',    // Molten Blast Crimson
  accentDark: '#1E1A24',       // Gunpowder Charcoal
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.0,
  damage: 10,
  cooldown: 28,
  projectileSpeedMultiplier: 1.0,
  ability: 'Bomb Devil & "Megaton Tsar Nuke"',
  desc: 'The Bomb Devil Hybrid. High-speed explosive brawler and Soviet assassin. Pulls collar pin to trigger an explosive revive and Bomb Devil transformation. Attacks with 120° blast punches, Spark Flechette projectile spreads, Decoy Bombs, Rocket Lunges, and the apocalyptic Megaton Tsar Nuke.',

  // Passive 1: Collar Pin Hybrid Physiology (Explosive Revive)
  enableCollarPinRevive: 0,         // Master toggle for Passive 1: Hybrid Physiology Collar Pin Revive
  maxReviveStocks: 1,               // 1 pin-pull revive per round
  reviveHpPercent: 0.50,            // Restores 50% Max HP (170 HP)
  reviveShockwaveRadius: 140,       // Radial explosion blast radius on trigger
  reviveShockwaveDamage: 40,        // Radial blast damage
  reviveShockwaveKnockback: 28,     // Repel force
  hybridModeDurationFrames: Infinity, // Permanent Bomb Devil Form once activated (no duration timer)

  // Passive 2: Blast Propulsion
  enableBlastPropulsion: 0,         // Master toggle for Passive 2: Rocket Jet Blast Dash
  propulsionBurnDamage: 6,          // Scorch flame damage to enemies caught in jet trail
  propulsionTrailDecay: 0.04,

  // Passive 3: Gunpowder Residue
  enableGunpowderResidue: 0,        // Master toggle for Passive 3: Gunpowder Stacks

  // Human Form — Basic Attack: Tactical Knife Attack
  enableHiddenKnifeCombo: 1,        // Master toggle for Basic Attack: Knife (Human)
  knifeDamage: 4,                  // Tactical knife slash damage
  knifeReach: 50,                   // Tactical knife slash reach
  knifeCooldown: 14,                // Clean 14-frame cadence
  knifeHitStun: 6,                  // Micro hit-stun duration
  knifeKnockback: 6.5,              // Flinch knockback force
  knifeArcAngle: (100 * Math.PI) / 180, // 100° frontal slash arc

  // Human Form — Aerial Attack: Dive Bomb (Shoulder Vault Stun)
  enableDiveBomb: 0,                // Master toggle for Aerial Attack: Dive Bomb (Human)
  diveBombCooldown: 220,            // ~3.6s cooldown
  diveBombDamage: 22,               // Knife dive impact damage
  diveBombSpeed: 22.0,              // High-speed aerial descent velocity
  diveBombStunDuration: 22,         // Opponent shoulder vault stun frames
  diveBombMinRange: 70,             // Minimum range to trigger aerial leap
  diveBombMaxRange: 240,            // Maximum aerial dive target acquisition range

  // Hybrid Form — Basic Attack: Explosive Martial Arts (120° Frontal Arc & AOE Punch Detonations)
  enableMeleeCombo: 1,              // Master toggle for Basic Attack: Explosive Martial Arts (Hybrid)
  punchReach: 75,                   // Punch reach in Bomb Form (65px human fallback)
  punchArcAngle: (120 * Math.PI) / 180, // 120° frontal arc
  punchDamage: 10,                  // Hits 1 & 2 damage
  punchExplosionRadius: 70,         // Hits 1 & 2 AOE explosion radius
  punchKnockback: 14,               // Hits 1 & 2 physical knockback force
  punchFinisherDamage: 20,          // Hit 3 (Spark Slap) palm blast damage
  punchFinisherRadius: 100,         // Hit 3 AOE explosion radius
  punchFinisherKnockback: 34,       // Palm blast physical knockback force
  punchAnimDuration: 16,            // Punch swing animation frames

  // Primary Skill: Spark Flechette Barrage (Finger Grenades)
  enableSparkFlechette: 0,          // Master toggle for Primary Skill: Spark Flechette Barrage
  sparkCooldown: 180,               // 3.0s cooldown
  sparkCount: 3,                    // 3-projectile spread
  sparkSpeed: 18.0,                 // High-velocity flight speed
  sparkSpreadAngle: 0.22,           // Spread angle in radians (~12.6°)
  sparkDirectDamage: 14,            // Direct impact damage
  sparkExplosionRadius: 42,         // Mini cluster explosion radius
  sparkExplosionDamage: 22,         // Cluster explosion damage
  sparkKnockback: 12,               // Mini cluster explosion physical knockback force

  // Secondary Skill: 3-Ball Cluster Bomb Spread (Throws 3 small bombs in spread that explode 1 by 1)
  enableClusterBomb: 1,             // Master toggle for Secondary Skill: 3-Ball Cluster Bomb Spread
  enableDecoyBomb: 1,               // Backward compatibility alias for Skill 2 toggle
  clusterBombCooldown: 1000,         // ~5.3s cooldown
  decoyCooldown: 320,               // Backward compatibility alias
  clusterBombCount: 5,              // 3 small bombs thrown in fanned spread
  clusterBombSpreadAngle: 0.90,     // Fanned spread angle (~23° per outer trajectory)
  clusterBombThrowSpeed: 13.5,      // Flight speed
  clusterBombFlightFrames: 16,      // Travel duration before arming
  clusterBombStaggerFrames: 8,     // Sequential delay between explosions (1 by 1)
  clusterBombExplosionRadius: 200,   // Explosion blast radius per bomb
  clusterBombExplosionDamage: 15,   // Damage per explosion
  clusterBombExplosionKnockback: 18, // Physical knockback force per blast
  decoyExplosionRadius: 85,         // Backward compatibility alias
  decoyExplosionDamage: 28,         // Backward compatibility alias
  decoyExplosionKnockback: 18,      // Backward compatibility alias

  // Mobility Skill: Supersonic Rocket Lunge
  enableRocketLunge: 1,             // Master toggle for Mobility Skill: Supersonic Rocket Lunge
  rocketCooldown: 300,              // 5.0s cooldown
  rocketLungeSpeed: 28.0,           // Rocket dash velocity (34.0 in Bomb Form)
  rocketDurationFrames: 24,         // Max dash frame duration
  rocketHitDamage: 30,              // Impact dropkick damage
  rocketHitKnockback: 34,           // Impact knockback
  rocketCraterRadius: 55,           // Floor crater scorch decal radius
  rocketFootExplosionRadius: 150,    // Foot launch explosion blast radius
  rocketFootExplosionDamage: 25,    // Foot launch explosion damage to enemies caught behind her
  rocketFootExplosionKnockback: 22, // Foot launch explosion knockback force

  // Transformation Blast (Collar Pin Pull Culmination)
  transformationExplosionRadius: 200, // Awakening radial blast radius
  transformationExplosionDamage: 50,  // Awakening radial blast damage
  transformationKnockback: 34,        // Awakening radial blast knockback force

  // Ultimate: Bomb Devil Unleashed — Megaton Tsar Nuke
  enableMegatonNuke: 1,             // Master toggle for Ultimate: Megaton Tsar Nuke
  enableUltimateFullHeal: 1,        // Master toggle: Fully heal Reze to 100% Max HP when activating Ultimate
  enableHybridLifesteal: 1,         // Master toggle: Vampiric lifesteal during Bomb Devil Form
  hybridLifestealPercent: 0.15,     // 35% of damage dealt recovered as HP during Bomb Devil Form
  nukeCooldown: 1500,               // 25.0s cooldown
  nukeTransformPauseFrames: 35,     // Transformation hit-stop on target (Rule 5 compliant)
  nukeAirborneBarrageFrames: 70,    // Carpet torpedo bombardment duration
  nukeRocketCount: 6,               // Number of raining torpedoes
  nukeRocketDamage: 20,             // Damage per aerial torpedo
  nukeDiveSpeed: 38.0,              // Living warhead supersonic dive speed
  nukeExplosionRadius: 220,         // Nuclear shockwave explosion radius
  nukeDirectDamage: 130,            // Megaton blast true damage
  nukeKnockbackForce: 48,           // Full-arena displacement knockback
  nukeLingeringFireFrames: 300,     // 5.0s lingering thermite ground fire
  nukeFireTickDamage: 5,            // Ground fire tick damage

  // ──────────────────────────────────────────
  // AUDIO CONFIGURATION, VOLUME & TIMING DELAYS (Organized same as Nanami)
  // ──────────────────────────────────────────
  sounds: {
    // Passive 1: Collar Pin Hybrid Physiology (Explosive Revive)
    revivePinPull: 'Assets/Sound Effects/RezeSFX/reze_boom_voiceline.mp3',
    reviveExplosion: 'Assets/Sound Effects/Skills/fugaexplode.mp3',

    // Human Form — Basic Attack: Tactical Knife
    knifeSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    knifeStab: 'Assets/Sound Effects/Attacks/spikestab.mp3',

    // Human Form — Aerial Attack: Dive Bomb & Shoulder Vault
    diveBombDash: 'Assets/Sound Effects/Skills/dash2.mp3',
    diveBombCut: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    diveBombParry: 'Assets/Sound Effects/Skills/parry.mp3',

    // Hybrid Form — Basic Attack: Explosive Martial Arts (Punch Detonations)
    punchSwing: 'Assets/Sound Effects/Attacks/heavypunch1.mp3',
    punchExplosion: 'Assets/Sound Effects/Attacks/explosion.mp3',
    punchFinisherExplosion: 'Assets/Sound Effects/Skills/fugaexplode.mp3',

    // Primary Skill: Spark Flechette Barrage (Finger Grenades)
    sparkBurst: 'Assets/Sound Effects/Attacks/flamespray1.mp3',
    sparkExplosion: 'Assets/Sound Effects/Attacks/explosion.mp3',

    // Secondary Skill: 3-Ball Cluster Bomb Spread
    clusterThrow: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    clusterExplosion: 'Assets/Sound Effects/Attacks/explosion.mp3',
    decoyDash: 'Assets/Sound Effects/Skills/dash3.mp3',
    decoyExplosion: 'Assets/Sound Effects/Skills/fugaexplode.mp3',

    // Mobility Skill: Supersonic Rocket Lunge
    rocketJet: 'Assets/Sound Effects/Skills/genos-dash-noise.mp3',
    rocketImpact: 'Assets/Sound Effects/Attacks/explosion.mp3',
    wallRocketBlast: 'Assets/Sound Effects/Attacks/explosion.mp3',

    // Ultimate: Bomb Devil Unleashed — Megaton Tsar Nuke
    pinPull: 'Assets/Sound Effects/RezeSFX/reze_boom_voiceline.mp3',
    pinPullSpray: 'Assets/Sound Effects/Attacks/flamespray1.mp3',
    transformationBlast: 'Assets/Sound Effects/Skills/fugaexplode.mp3',
    transformationExplosion: 'Assets/Sound Effects/Attacks/explosion.mp3',
    nukeCharge: 'Assets/Sound Effects/Skills/genos-ultimatecharging.mp3',
    nukeDive: 'Assets/Sound Effects/Skills/fugatravel.mp3',
    nukeImpact: 'Assets/Sound Effects/Skills/genos-selfdestruct-explosion.mp3',
    nukeExplosion: 'Assets/Sound Effects/Attacks/explosion.mp3',

    // Backward Compatibility Aliases
    explosionSmall: 'Assets/Sound Effects/Attacks/explosion.mp3',
    explosionLarge: 'Assets/Sound Effects/Skills/fugaexplode.mp3'
  },
  soundVolumes: {
    revivePinPull: 0.95,
    reviveExplosion: 0.90,
    knifeSwing: 0.55,
    knifeStab: 0.70,
    diveBombDash: 0.80,
    diveBombCut: 0.75,
    diveBombParry: 0.65,
    punchSwing: 0.40,
    punchExplosion: 0.55,
    punchFinisherExplosion: 0.65,
    sparkBurst: 0.65,
    sparkExplosion: 0.40,
    decoyDash: 0.75,
    decoyExplosion: 0.85,
    rocketJet: 0.00,
    rocketImpact: 0.75,
    wallRocketBlast: 0.80,
    pinPull: 0.95,
    pinPullSpray: 0.55,
    transformationBlast: 1.00,
    transformationExplosion: 0.85,
    nukeCharge: 0.85,
    nukeDive: 0.85,
    nukeImpact: 1.00,
    nukeExplosion: 0.80,
    explosionSmall: 0.55,
    explosionLarge: 0.85
  },
  soundChances: {
    revivePinPull: 1.0,
    reviveExplosion: 1.0,
    knifeSwing: 1.0,
    knifeStab: 1.0,
    diveBombDash: 1.0,
    diveBombCut: 1.0,
    diveBombParry: 1.0,
    punchSwing: 1.0,
    punchExplosion: 1.0,
    punchFinisherExplosion: 1.0,
    sparkBurst: 1.0,
    sparkExplosion: 1.0,
    decoyDash: 1.0,
    decoyExplosion: 1.0,
    rocketJet: 1.0,
    rocketImpact: 1.0,
    wallRocketBlast: 1.0,
    pinPull: 1.0,
    pinPullSpray: 1.0,
    transformationBlast: 1.0,
    transformationExplosion: 1.0,
    nukeCharge: 1.0,
    nukeDive: 1.0,
    nukeImpact: 1.0,
    nukeExplosion: 1.0
  },
  soundDelays: {
    revivePinPull: 0,
    reviveExplosion: 0,
    knifeSwing: 0,
    knifeStab: 0,
    diveBombDash: 0,
    diveBombCut: 0,
    diveBombParry: 0,
    punchSwing: 0,
    punchExplosion: 0,
    punchFinisherExplosion: 0,
    sparkBurst: 0,
    sparkExplosion: 0,
    decoyDash: 0,
    decoyExplosion: 0,
    rocketJet: 0,
    rocketImpact: 0,
    wallRocketBlast: 0,
    pinPull: 0,
    pinPullSpray: 22,
    transformationBlast: 0,
    transformationExplosion: 0,
    nukeCharge: 0,
    nukeDive: 0,
    nukeImpact: 0,
    nukeExplosion: 0
  }
};
