// ─────────────────────────────────────────────────────────────────────────────
// Musashi Character Config
// ─────────────────────────────────────────────────────────────────────────────

export const musashiConfig = {
  id: 'musashi',
  name: 'Musashi',
  displayName: 'Musashi',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Japanese',
  color: '#34495e',
  radius: 25,
  hp: 100,
  damage: 10, // (Katana + Wakizashi)
  cooldown: 45,
  moveSpeed: 4.8,
  projectileSpeedMultiplier: 1.0,
  ability: 'Dual Stances',
  desc: 'Switches between five stances (Earth, Water, Fire, Wind, Void) giving passive effects and unique skills.',

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
  earthArmorMultiplier: 1.1,
  earthSpeedMultiplier: 1.1,
  waterSpeedMultiplier: 1.3,
  waterDodgeDistance: 80,
  fireDamageMultiplier: 1.0,
  fireDamageTakenMultiplier: 1.1,
  windDeflectRadius: 100,
  voidDodgeChance: 1.0,
  voidLethalDamage: 10,

  // Active Abilities
  nitenStrikeCooldown: 300,
  nitenStrikeKnockback: 15,
  nitenStrikeDamage: 7,
  flurryCooldown: 700,
  flurryDamage: 5,
  preemptiveStrikeCooldown: 360,
  preemptiveStrikeDuration: 60,
  preemptiveCounterDamage: 7,
};
