// ─────────────────────────────────────────────
// Nezuko Kamado Character Config
// Demon Slayer: Kimetsu no Yaiba / Demons
// ─────────────────────────────────────────────

export const nezukoConfig = {
  // Baseline Attributes
  hp: 370,
  maxHpRatio: 1.0,
  speed: 6.0,
  moveSpeed: 6.0,
  r: 25,
  radius: 25,
  color: '#EC4899',           // Demon Sakura Pink
  themeColor: '#EC4899',
  secondaryColor: '#E11D48',   // Exploding Pyrokinesis Magenta
  accentGreen: '#22C55E',      // Bamboo Green
  accentBlack: '#18181B',      // Dark Outer Haori
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.0,
  damage: 24,
  cooldown: 26,
  projectileSpeedMultiplier: 1.0,
  ability: 'Awakened Demon & "Exploding Blood" (Bakketsu)',
  desc: 'Awakened Demon brawler with superhuman physical strength and Exploding Blood pyrokinesis. Wields 120° Demonic Axe Kicks, supersonic Flying Dropkicks that embed foes in walls, anti-demon Exploding Blood detonations, and the Full Demon Awakening frenzy ultimate.',

  // ──────────────────────────────────────────
  // ABILITY MASTER TOGGLE SWITCHES
  // ──────────────────────────────────────────
  enableDemonRegeneration: true,
  enableBakketsuEmpower: true,
  enableAxeKicks: true,
  enableFlyingDropkick: true,
  enableExplodingBlood: true,
  enableFullAwakening: true,

  // Passive 1: Demonic Regeneration & Slumber Vitality
  regenIntervalFrames: 120,    // 2.0s
  regenAmount: 10,
  lowHpRegenMultiplier: 2.0,

  // Passive 2: Blood Demon Art Empowerment
  empoweredDamageBonus: 0.20,

  // Basic Attack: Demonic Axe Kick & Claw Flurry (120° Frontal Arc)
  clawArcAngle: Math.PI * 0.667, // ~120 degrees
  clawReach: 70,
  hit1Damage: 16,
  hit1StunFrames: 6,
  hit2Damage: 20,
  hit2StunFrames: 8,
  hit3Damage: 30,
  hit3Knockback: 26,

  // Skill 1: Awakened Demon Flying Dropkick
  dropkickCooldown: 240,       // 4.0s
  dropkickSpeed: 28.0,
  dropkickDamage: 32,
  dropkickWallBonusDamage: 18,
  dropkickWallStunFrames: 12,

  // Skill 2: Blood Demon Art: Exploding Blood (Bakketsu)
  bakketsuCooldown: 330,       // 5.5s
  bakketsuRadius: 160,
  bakketsuDamage: 40,
  bakketsuBurnDps: 5,
  bakketsuBurnDurationSec: 4,

  // Ultimate: Full Demon Awakening: Crimson Lotus Frenzy
  ultimateCooldown: 1500,      // 25.0s
  ultimateStrikes: 4,
  ultimateStrikeDamage: 18,
  ultimateFinisherDamage: 70,
  ultimateFinisherKnockback: 44,
  ultimateHealAmount: 40,
};
