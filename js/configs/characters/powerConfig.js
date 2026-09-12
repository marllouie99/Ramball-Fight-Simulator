// ─────────────────────────────────────────────
// Power (The Blood Fiend) Character Config
// Chainsaw Man / Public Safety Special Division 4
// ─────────────────────────────────────────────

export const powerConfig = {
  // Baseline Attributes
  hp: 330,
  maxHpRatio: 1.0,
  speed: 5.9,
  moveSpeed: 5.9,
  r: 25,
  radius: 25,
  color: '#EF4444',           // Crimson Blood Red
  themeColor: '#EF4444',
  secondaryColor: '#FDE047',   // Fiend Strawberry Gold
  accentBurgundy: '#991B1B',   // Deep Fiend Burgundy
  accentDark: '#110E14',       // Dark Blood Ink
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.0,
  damage: 26,
  cooldown: 30,
  projectileSpeedMultiplier: 1.0,
  ability: 'Blood Fiend & "Blood Rain Cataclysm"',
  desc: 'The Blood Fiend. Chaotic blood manipulation tactician. Generates and absorbs Blood Orbs to empower her blood arsenal. Wields 140° Gigantic Blood Hammer smashes with shockwave stuns, 360° Blood Scythe whirlwinds, Thousand Blood Daggers homing barrages, and the arena-wide Blood Rain Cataclysm ultimate.',

  // ──────────────────────────────────────────
  // ABILITY MASTER TOGGLE SWITCHES (1/true = Enabled, 0/false = Disabled)
  // ──────────────────────────────────────────
  enableBloodHammer: true,          // Master toggle for Basic Attack: Gigantic Blood Hammer (140° Cleave)
  enableBloodScythe: true,          // Master toggle for Skill 1: Blood Scythe Whirlwind
  enableBloodDaggers: true,         // Master toggle for Skill 2: Thousand Blood Daggers
  enableBloodRainCataclysm: true,   // Master toggle for Ultimate: Blood Rain Cataclysm
  enableBloodReservoir: true,       // Master toggle for Passive 1: Blood Orbs & Reservoir Gauge
  enableFiendArrogance: true,       // Master toggle for Passive 2: Damage bonus vs bleeding & evasion

  // Passive 1: Blood Reservoir
  maxBloodReservoir: 100,
  damageBonusPer25Blood: 0.05,      // +5% damage per 25 blood
  speedBonusPer25Blood: 0.03,       // +3% speed per 25 blood
  bloodOrbHeal: 8,
  bloodOrbGaugeGain: 15,

  // Passive 2: Fiend Arrogance
  bonusDamageVsBleeding: 0.20,      // 20% bonus dmg vs bleeding targets
  evasionCaltropsDamage: 18,

  // Basic Attack: Gigantic Blood Hammer (140° Frontal Arc)
  hammerArcAngle: Math.PI * 0.778,  // ~140 degrees
  hammerReach: 85,
  hammerHit1Damage: 24,
  hammerHit1StunFrames: 12,
  hammerHit2Damage: 24,
  hammerHit2Knockback: 22,
  hammerHit3Damage: 36,
  hammerHit3StunFrames: 18,
  hammerShockwaveRadius: 110,

  // Skill 1: Blood Scythe Whirlwind
  scytheCooldown: 240,              // 4.0s
  scytheReach: 90,
  scytheSpinDamage: 22,             // 2 spins = 44 dmg
  scytheWaveSpeed: 20.0,
  scytheWaveDamage: 26,
  scytheBleedDps: 4,
  scytheBleedDurationSec: 5,

  // Skill 2: Thousand Blood Daggers
  daggersCooldown: 380,             // 6.3s
  daggerCount: 6,
  daggerSpeed: 26.0,
  daggerDamage: 12,                 // 72 total
  daggerPinDurationFrames: 20,

  // Ultimate: Prime Blood Devil Eruption — Blood Rain Cataclysm
  ultimateCooldown: 1500,           // 25.0s
  ultimateTimeStopFrames: 35,
  ultimateSpearCount: 6,
  ultimateSpearDamage: 18,
  ultimatePillarRadius: 200,
  ultimatePillarDamage: 80,
  ultimatePillarKnockback: 48,
};
