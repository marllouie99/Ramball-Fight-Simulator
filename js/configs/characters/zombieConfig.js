// ZOMBIE CONFIGURATION (Plants vs. Zombies)
// Centralized tuning for Zombie stats, Chomp melee combat, Armor Upgrades, and Undead Horde summons.

export const zombieConfig = {
  assets: {
    hair: 'Assets/model/zombie/zombie-hair.png',
    walkSheet: 'Assets/model/zombie/zombie-walk-sprite-sheet.png',
    attackSheet: 'Assets/model/zombie/zombie-attack-sprite-sheet.png',
    cone: 'Assets/model/zombie/zombie-cone.png',
    bucket: 'Assets/model/zombie/zombie-bucket.png',
    gravestone: 'Assets/model/zombie/zombie-gravestone.png',
    flag: 'Assets/model/zombie/zombie-flag.png',
    screendoor: 'Assets/model/zombie/zombie-screendoor.png',
    newspaper: 'Assets/model/zombie/zombie-newspaper.png',
    pole: 'Assets/model/zombie/zombie-pole.png',
    football: 'Assets/model/zombie/zombie-football-helmet.png',
    trophy: 'Assets/model/zombie/zombie-trophy.png',
  },

  id: 'zombie',
  name: 'Zombie',
  displayName: 'Zombie',
  grade: 'A',
  category: 'Gaming',
  color: '#65A30D',          // Rotten Olive Green
  themeColor: '#65A30D',     // Primary Theme Color
  secondaryColor: '#EA580C', // Hazard Cone Orange
  accentColor: '#94A3B8',    // Galvanized Bucket Steel
  damageNumberColor: '#65A30D',

  // Core Combat Stats
  hp: 420,
  maxHp: 420,
  speed: 4.8,
  moveSpeed: 4.8,
  radius: 25,
  r: 25,
  damage: 26,                // Basic chomp bite damage
  cooldown: 32,              // Basic melee cooldown
  canShoot: false,           // Rule 23: Melee brawler, suppresses default bullets
  baseRange: 65,
  projectileSpeedMultiplier: 1.0,

  // Lore & Ability Descriptions
  ability: 'PvZ Wave Survival ("THE ZOMBIES ARE COMING!")',
  desc: 'Authentic Plants vs. Zombies survival onslaught. Every 20 seconds, a new massive wave of zombies erupts across the lawn with new varieties (Screen Door, Newspaper, Buckethead, Pole Vaulter). When the match timer reaches 1 minute, the FINAL WAVE arrives! The only way to win is to survive the full onslaught.',

  // 5-Phase Melee Combat Tuning (Rule 30 compliant)
  hitLiftFrames: 8,
  hitHoldFrames: 3,
  hitStrikeFrames: 7,
  hitImpactLockFrames: 7,
  hitRecoveryFrames: 12,
  chompReach: 68,
  chompArc: Math.PI * 0.65, // ~117° frontal cleave
  biteLifesteal: 12,        // Heals 12 HP per chomp (Rule 27 compliant: healthbar only)

  // PvZ Wave Survival Timeline (60 FPS: 20s = 1200f, 40s = 2400f, 60s = 3600f)
  waveIntervalFrames: 1200,   // 20.0 seconds per wave
  finalWaveFrames: 3600,       // 1 minute (60.0s) Final Wave trigger
  finalWaveSurvivalFrames: 900,// 15 seconds to survive / clear final wave after 1:00

  // Zombie Minion & Variety Stats
  varieties: {
    regular: { hp: 120, speed: 3.8, damage: 14, name: 'Zombie' },
    conehead: { hp: 260, speed: 3.6, damage: 16, name: 'Conehead Zombie', armorReduction: 0.30 },
    buckethead: { hp: 450, speed: 3.3, damage: 18, name: 'Buckethead Zombie', armorReduction: 0.50 },
    screendoor: { hp: 320, shieldHp: 220, speed: 3.2, damage: 16, name: 'Screen Door Zombie' },
    newspaper: { hp: 160, paperHp: 90, calmSpeed: 2.4, rageSpeed: 6.2, damage: 22, name: 'Newspaper Zombie' },
    polevaulter: { hp: 200, speed: 5.6, jumpDistance: 130, damage: 18, name: 'Pole Vaulting Zombie' },
    football: { hp: 480, speed: 5.2, damage: 20, name: 'Football Zombie', knockback: 12 },
    flag: { hp: 240, speed: 4.6, damage: 18, name: 'Flag Zombie', auraSpeedBuff: 1.25 },
  },

  // Skill 1: Armor Upgrade (Conehead / Buckethead)
  armorCooldownFrames: 450, // 7.5s cooldown
  coneArmorShield: 90,
  bucketArmorShield: 170,
  armorDamageReduction: 0.30,

  // Skill 2: Grave Awakening (Summon Zombie Minion)
  summonCooldownFrames: 360, // 6.0s cooldown
  maxMinions: 8,
  minionHp: 120,
  minionDamage: 14,
  minionSpeed: 3.8,
  minionDurationFrames: 1800, // 30 seconds

  // Ultimate: "A Huge Wave of Zombies is Approaching!"
  ultimateCost: 100,
  ultimateDurationFrames: 360, // 6 seconds
  ultimateSpeedBuff: 1.35,
  ultimateCooldownFrames: 900,
};
