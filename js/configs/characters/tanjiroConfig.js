// ─────────────────────────────────────────────
// Tanjiro Kamado Character Config
// Demon Slayer: Kimetsu no Yaiba / Demon Slayer Corps
// ─────────────────────────────────────────────

export const tanjiroConfig = {
  // Baseline Attributes
  hp: 340,
  maxHpRatio: 1.0,
  speed: 5.8,
  moveSpeed: 5.8,
  r: 25,
  radius: 25,
  color: '#10B981',           // Emerald Green
  themeColor: '#10B981',
  secondaryColor: '#EF4444',   // Sunfire Crimson
  accentBlack: '#18181B',      // Checkered Black
  accentWhite: '#F8FAFC',      // White Trim
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.0,
  damage: 22,
  cooldown: 28,
  projectileSpeedMultiplier: 1.0,
  ability: 'Water & Sun Breathing ("Hinokami Kagura")',
  desc: 'Demon Slayer wielding Water Breathing & Hinokami Kagura (Sun Breathing). Senses the luminous Opening Thread in enemy defenses. Wields 140° Water Surface slashes, Constant Flux spiraling dragon lunges, Clear Blue Sky projectile deflections, and the Dragon Sun Halo Head Dance ultimate.',

  // ──────────────────────────────────────────
  // ABILITY MASTER TOGGLE SWITCHES
  // ──────────────────────────────────────────
  enableWaterBreathing: true,
  enableConstantFlux: true,
  enableClearBlueSky: true,
  enableDragonSunDance: true,
  enableOpeningThread: true,
  enableTotalConcentration: true,

  // Passive 1: Scent of the Opening Thread
  threadHpThreshold: 0.40,     // Triggers below 40% enemy HP
  threadCritChance: 0.25,      // +25% crit chance
  threadArmorPen: 0.35,        // 35% armor penetration

  // Passive 2: Total Concentration: Constant
  concentrationSpeedBonus: 0.12,
  concentrationCdrBonus: 0.15,

  // Basic Attack: Water Breathing 3-Hit Flow (140° Frontal Arc)
  katanaArcAngle: Math.PI * 0.778, // ~140 degrees
  katanaReach: 80,
  hit1Damage: 18,
  hit1StunFrames: 8,
  hit2Damage: 22,
  hit2StunFrames: 10,
  hit3Damage: 28,
  hit3Knockback: 24,

  // Skill 1: Water Tenth Form: Constant Flux
  fluxCooldown: 270,           // 4.5s
  fluxReach: 90,
  fluxHit1Damage: 16,
  fluxHit2Damage: 22,
  fluxHit3Damage: 32,

  // Skill 2: Sun Breathing: Clear Blue Sky
  sunCooldown: 360,            // 6.0s
  sunRadius: 75,
  sunDamage: 35,
  sunBurnDps: 4,
  sunBurnDurationSec: 3,

  // Ultimate: Hinokami Kagura: Dragon Sun Halo Head Dance
  ultimateCooldown: 1440,      // 24.0s
  ultimateStrikes: 4,
  ultimateStrikeDamage: 20,
  ultimateFinisherDamage: 65,
  ultimateFinisherKnockback: 40,
};
