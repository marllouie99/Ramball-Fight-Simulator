// ─────────────────────────────────────────────
// Reze (The Bomb Devil Hybrid) Character Config
// Chainsaw Man / Soviet Assassin & Bomb Devil
// ─────────────────────────────────────────────

export const rezeConfig = {
  // Baseline Attributes
  hp: 340,
  maxHpRatio: 1.0,
  speed: 5.8,
  moveSpeed: 5.8,
  r: 25,
  radius: 25,
  color: '#FF6B1A',          // Tangerine Flame Orange
  themeColor: '#FF6B1A',
  secondaryColor: '#FFE600',  // Spark Gold
  accentCrimson: '#FF2E00',   // Molten Blast Crimson
  accentDark: '#1E1A24',      // Gunpowder Charcoal
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.0,
  damage: 22,
  cooldown: 28,
  projectileSpeedMultiplier: 1.0,
  ability: 'Bomb Devil & "Megaton Tsar Nuke"',
  desc: 'The Bomb Devil Hybrid. High-speed explosive brawler and Soviet assassin. Pulls collar pin to trigger an explosive revive and Bomb Devil transformation. Attacks with 120° blast punches, Spark Flechette projectile spreads, Decoy Bombs, Rocket Lunges, and the apocalyptic Megaton Tsar Nuke.',

  // ──────────────────────────────────────────
  // ABILITY MASTER TOGGLE SWITCHES (1/true = Enabled, 0/false = Disabled)
  // ──────────────────────────────────────────
  enableMeleeCombo: true,           // Master toggle for Basic Attack: Explosive Martial Arts
  enableSparkFlechette: true,       // Master toggle for Primary Skill: Spark Flechette Barrage
  enableDecoyBomb: true,            // Master toggle for Secondary Skill: Decapitation Decoy
  enableRocketLunge: true,          // Master toggle for Mobility Skill: Supersonic Rocket Lunge
  enableMegatonNuke: true,          // Master toggle for Ultimate: Megaton Tsar Nuke
  enableCollarPinRevive: true,      // Master toggle for Passive 1: Hybrid Physiology Collar Pin Revive
  enableBlastPropulsion: true,      // Master toggle for Passive 2: Rocket Jet Blast Dash
  enableGunpowderResidue: true,     // Master toggle for Passive 3: Gunpowder Stacks

  // Passive 1: Collar Pin Hybrid Physiology (Explosive Revive)
  maxReviveStocks: 1,               // 1 pin-pull revive per round
  reviveHpPercent: 0.50,            // Restores 50% Max HP (170 HP)
  reviveShockwaveRadius: 140,       // Radial explosion blast radius on trigger
  reviveShockwaveDamage: 40,        // Radial blast damage
  reviveShockwaveKnockback: 28,     // Repel force
  hybridModeDurationFrames: 600,    // 10.0s Bomb Devil Form duration upon revive / ultimate

  // Passive 2: Blast Propulsion
  propulsionBurnDamage: 6,          // Scorch flame damage to enemies caught in jet trail
  propulsionTrailDecay: 0.04,

  // Basic Attack: Explosive Martial Arts (120° Frontal Arc)
  punchReach: 65,                   // Normal punch reach (75px in Bomb Form)
  punchArcAngle: (120 * Math.PI) / 180, // 120° frontal arc
  punchDamage: 16,                  // Hits 1 & 2 damage
  punchFinisherDamage: 28,          // Hit 3 (Spark Slap) palm blast damage
  punchFinisherKnockback: 32,       // Palm blast physical knockback force
  punchAnimDuration: 14,            // Punch swing animation frames

  // Primary Skill: Spark Flechette Barrage (Finger Grenades)
  sparkCooldown: 180,               // 3.0s cooldown
  sparkCount: 3,                    // 3-projectile spread
  sparkSpeed: 18.0,                 // High-velocity flight speed
  sparkSpreadAngle: 0.22,           // Spread angle in radians (~12.6°)
  sparkDirectDamage: 14,            // Direct impact damage
  sparkExplosionRadius: 42,         // Mini cluster explosion radius
  sparkExplosionDamage: 22,         // Cluster explosion damage

  // Secondary Skill: Decapitation Decoy / Smoke Step
  decoyCooldown: 420,               // 7.0s cooldown
  decoyFuseFrames: 90,              // 1.5s fuse before automatic detonation
  decoyRushSpeed: 7.2,              // Decoy rushdown speed
  decoyExplosionRadius: 110,        // High-yield explosion radius
  decoyExplosionDamage: 45,         // Blast damage
  decoyExplosionKnockback: 24,      // Blast knockback
  decoySmokeDurationFrames: 180,    // 3.0s blinding smoke cloud duration

  // Mobility Skill: Supersonic Rocket Lunge
  rocketCooldown: 300,              // 5.0s cooldown
  rocketLungeSpeed: 28.0,           // Rocket dash velocity (34.0 in Bomb Form)
  rocketDurationFrames: 24,         // Max dash frame duration
  rocketHitDamage: 35,              // Impact dropkick damage
  rocketHitKnockback: 34,           // Impact knockback
  rocketCraterRadius: 55,           // Floor crater scorch decal radius

  // Ultimate: Bomb Devil Unleashed — Megaton Tsar Nuke
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
  // AUDIO CONFIGURATION & SOUND EFFECT MAPPING
  // ──────────────────────────────────────────
  sounds: {
    pinPull: 'Assets/Sound Effects/Skills/parry.mp3',
    sparkBurst: 'Assets/Sound Effects/Attacks/flamespray1.mp3',
    sparkExplosion: 'Assets/Sound Effects/Attacks/explosion.mp3',
    explosionSmall: 'Assets/Sound Effects/Attacks/explosion.mp3',
    explosionLarge: 'Assets/Sound Effects/Skills/fugaexplode.mp3',
    rocketJet: 'Assets/Sound Effects/Skills/genos-dash-noise.mp3',
    nukeCharge: 'Assets/Sound Effects/Skills/genos-ultimatecharging.mp3',
    nukeDive: 'Assets/Sound Effects/Skills/fugatravel.mp3',
    nukeImpact: 'Assets/Sound Effects/Skills/genos-selfdestruct-explosion.mp3',
  }
};
