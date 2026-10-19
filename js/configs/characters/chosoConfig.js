// ─────────────────────────────────────────────
// Choso — Death Painting Eldest Brother Config
// ─────────────────────────────────────────────

export const chosoConfig = {
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)
  bossTitle: 'Death Painting Womb: Eldest Brother',
  title: 'Master of Blood Manipulation',

  // Base Attributes (Rule 24 Humanoid Standard)
  hp: 420,
  speed: 5.3,
  moveSpeed: 5.3,
  r: 25,
  radius: 25,
  color: '#A31D1D', // Deep Crimson Blood
  themeColor: '#A31D1D',
  secondaryColor: '#FF2A55', // Radiant Laser Rose
  laserCoreColor: '#FFFFFF',
  robePlumColor: '#2E2236',
  bloodStripeColor: '#5C131D',
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.1,
  damage: 22,
  cooldown: 36,
  projectileSpeedMultiplier: 1.0,
  ability: 'Blood Manipulation: Crimson Laser Matrix',
  desc: 'Eldest brother of the Cursed Womb: Death Paintings from Jujutsu Kaisen. Converts cursed energy into inexhaustible blood reserves, seeds the arena with poisonous blood droplets, and transmutates all blood particles into a deadly multi-angle piercing laser crossfire grid.',

  // Passive 1: Mugen Ketsuryū (Infinite Sanguine Reserves)
  enableInfiniteBlood: 1,
  maxBloodNodesInArena: 999, // No artificial 32 limit: converts all currently existing arena blood into beams
  bloodNodeLifespanFrames: 720, // 12.0 seconds
  bloodNodesPerDamageTakenMin: 2,
  bloodNodesPerDamageTakenMax: 4,
  bloodPoisonDurationFrames: 240, // 4.0 seconds
  bloodPoisonSlowPerStack: 0.05,  // 5% slow per stack
  bloodPoisonMaxStacks: 5,
  bloodPoisonTickDamage: 3,

  // Passive 2: Flowing Red Scale: Stack (Sekirin Ketsurui: Chō)
  enableFlowingRedScale: 1,
  redScaleHpThreshold: 0.60,      // Below 60% HP
  redScaleSpeedMultiplier: 1.25,  // +25% movement speed
  redScaleDropMultiplier: 2,      // 2x blood droplet spawning rate
  redScaleAttackSpeedMultiplier: 1.20,

  // Primary Attack: Blood Edge & Sanguine Darts (Rule 30 Melee Standard)
  meleeReach: 70,
  meleeArc: (130 * Math.PI) / 180, // 130° frontal arc
  hitLiftFrames: 7,
  hitHoldFrames: 3,
  hitStrikeFrames: 6,
  hitLockFrames: 6, // Mandatory Impact Lock / Latch Phase
  hitRecoveryFrames: 10,
  meleeDamageCombo: [22, 26, 34],
  enableBloodDarts: 0,           // Only engage in melee combos; do not shoot blood darts at range without blood
  rangedDartDamage: 18,
  rangedDartSpeed: 15,
  dartDropletsOnHit: 1,
  comboDropletsOnFinisher: 3,

  // Skill 1: Slicing Exorcist / Blood Chakram (Karisō)
  enableChakram: 1,
  skill1Cooldown: 360,           // 6.0s (360 frames)
  chakramDamage: 36,
  chakramSpeed: 11,
  chakramMaxBounces: 3,
  chakramLifespan: 90,           // 1.5 seconds
  chakramDropInterval: 6,        // Emits a droplet every 6 frames

  // Skill 2: Supernova (Chōshinsei)
  enableSupernova: 1,
  skill2Cooldown: 540,           // 9.0s (540 frames)
  supernovaOrbCount: 8,
  supernovaPelletCount: 12,
  supernovaPelletDamage: 14,
  supernovaPelletSpeed: 13,
  supernovaRange: 210,

  // ULTIMATE: Blood Transmutation: Crimson Laser Matrix (Shuren: Kōsen Ketsurui)
  // As long as Ultimate is UP, turns all active blood particles currently in the arena into piercing laser beams!
  enableLaserMatrix: true,
  ultCooldown: 840,              // 14.0s (840 frames)
  skill3Cooldown: 840,           // Synchronized alias
  laserMatrixCastFrames: 16,     // Convergence Prayer Clasp pose
  laserTelegraphFrames: 12,      // Razor needle targeting lines
  laserDischargeFrames: 22,      // Supersonic beam firing duration
  laserDamagePerNode: 14,        // True damage per active node beam
  laserMatrixMaxBeams: 999,      // No fixed limit: fires all existing blood particles
  laserMatrixStunThreshold: 3,   // 3+ beams hitting simultaneously inflicts stun
  laserMatrixStunDuration: 30,   // 0.5s stun
  enableOverdriveMicroLasers: false, // Do not auto-fire micro-lasers out of nowhere on every hit
  laserTransmutationOverdriveFrames: 300, // 5.0s active transmutation buff
  overdriveMicroLaserDamage: 8,

  // Skill 3: Piercing Blood (Teisō / Fuga)
  enablePiercingBlood: 0,    // Disabled by default so Choso does not fire blood streams when there are 0 blood particles
  enableUltimate: true,
  piercingBloodCooldown: 900,    // 15.0s (900 frames)
  ultChargeFrames: 30,           // Clasp compression phase
  ultBeamFrames: 36,             // Supersonic stream discharge
  ultBeamDamage: 125,            // Sustained armor-piercing damage
  ultBeamWidth: 26,
  ultRecoilKick: 16,             // Kinetic recoil pushback
  ultFalloutNodes: 10,           // Vapor droplets left in wake

  // Sound Effects & Audio Configuration
  sounds: {
    meleeSlash: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    fleshHit: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    dartThrow: 'Assets/Sound Effects/Attacks/shurikenthrow.mp3',
    chakramSpin: 'Assets/Sound Effects/Skills/spinslash.mp3',
    supernovaExplode: 'Assets/Sound Effects/Attacks/explosion.mp3',
    convergenceClasp: 'Assets/Sound Effects/Skills/enhance.mp3',
    laserIgnite: 'Assets/Sound Effects/Skills/woosh.mp3',
    laserFire: 'Assets/Sound Effects/Attacks/laserbeam.mp3',
    piercingBloodCannon: 'Assets/Sound Effects/Skills/redblast.mp3'
  },
  soundVolumes: {
    meleeSlash: 0.90,
    fleshHit: 1.00,
    dartThrow: 0.85,
    chakramSpin: 0.80,
    supernovaExplode: 1.15,
    convergenceClasp: 1.10,
    laserIgnite: 0.95,
    laserFire: 1.20,
    piercingBloodCannon: 1.35
  }
};
