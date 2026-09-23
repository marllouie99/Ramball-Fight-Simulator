// ─────────────────────────────────────────────
// Zenitsu Agatsuma Character Config
// Demon Slayer: Kimetsu no Yaiba / Demon Slayer Corps
// ─────────────────────────────────────────────

export const zenitsuConfig = {
  bossTitle: 'Thunder Breathing Slayer',
  title: 'Thunder Breathing Slayer',

  // Baseline Attributes
  hp: 310,
  maxHpRatio: 1.0,
  speed: 6.4,
  moveSpeed: 6.4,
  r: 25,
  radius: 25,
  color: '#F59E0B',           // Lightning Gold
  themeColor: '#F59E0B',
  secondaryColor: '#FBBF24',   // Electric Amber
  accentCyan: '#38BDF8',       // Thunder Spark Cyan
  accentWhite: '#FFFFFF',      // Triangle Haori White
  accentBlack: '#18181B',      // Corps Black
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.0,
  damage: 26,
  cooldown: 24,
  projectileSpeedMultiplier: 1.0,
  ability: 'Thunder Breathing ("Thunderclap and Flash")',
  desc: 'Thunder Breathing godspeed iai swordsman. Awakens unstoppable Battle Trance during crises. Wields 140° Thunder Iai quickdraw slashes, lightspeed First Form: Thunderclap and Flash teleport slashes, Sixfold wall-ricochet flurries, and the Flaming Thunder God dragon ultimate.',

  // Passive 1: Slumbering Thunderclap & Battle Trance
  enableBattleTrance: true,         // Master toggle for Passive 1: Battle Trance
  tranceHpThreshold: 0.35,
  tranceDamageReduction: 0.25,
  tranceCritChance: 1.0,

  // Passive 2: Hyper-Sonic Static Charge
  enableStaticCharge: true,         // Master toggle for Passive 2: Hyper-Sonic Static Charge
  maxStaticCharge: 100,
  staticBurstDamage: 20,
  staticStunFrames: 18,

  // Basic Attack: Thunder Iai Quickdraw & Sheath Flurry (140° Frontal Arc)
  enableBasicAttack: true,          // Master toggle for Basic Attack: Thunder Iai Quickdraw
  katanaArcAngle: Math.PI * 0.778, // ~140 degrees
  katanaReach: 78,
  hit1Damage: 18,
  hit1StunFrames: 6,
  hit2Damage: 22,
  hit2StunFrames: 8,
  hit3Damage: 28,
  hit3Knockback: 22,

  // Skill 1: Thunder Breathing First Form: Thunderclap and Flash (Hekireki Issen)
  enableThunderclap: true,          // Master toggle for Skill 1: Thunderclap and Flash
  thunderclapCooldown: 228,    // 3.8s
  thunderclapSpeed: 36.0,
  thunderclapDamage: 38,
  thunderclapStunFrames: 12,

  // Skill 2: Thunderclap and Flash: Sixfold (Rokuren)
  enableRokuren: false,             // Master toggle for Skill 2: Sixfold (Rokuren)
  rokurenCooldown: 420,        // 7.0s
  rokurenBounces: 6,
  rokurenDamagePerHit: 8,
  rokurenFinisherKnockback: 30,

  // Ultimate: Thunder Seventh Form: Flaming Thunder God (Honoikazuchi no Kami)
  enableFlamingThunderGod: false,   // Master toggle for Ultimate: Flaming Thunder God
  ultimateCooldown: 1440,      // 24.0s
  ultimateDamage: 85,
  ultimateKnockback: 48,
  ultimateTimeStopFrames: 30,
};
