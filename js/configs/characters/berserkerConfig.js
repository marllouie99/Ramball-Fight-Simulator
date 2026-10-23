// ─────────────────────────────────────────────────────────────────────────────
// Berserker Character Config
// ─────────────────────────────────────────────────────────────────────────────

export const berserkerConfig = {
  id: 'berserker',
  name: 'Berserker',
  displayName: 'Berserker',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Fantasy & Magic',
  color: '#8b0000',
  radius: 25,
  hp: 80,
  damage: 15,
  cooldown: 40,
  moveSpeed: 5.0,
  projectileSpeedMultiplier: 1.0,
  ability: 'Rage',
  desc: 'Gains rage when taking damage. During rage: increased damage, attack speed, movement speed, and lifesteal.',

  // Rage mechanic (CONFIG.berserker)
  maxRage: 100,               // maximum rage meter
  ragePerDamage: 0,           // legacy (disabled)
  rageFromDamageScale: 2.5,
  rageDuration: 200,          // frames rage state lasts (5 seconds at 60 fps)
  rageDamageMultiplier: 1.5,  // damage multiplier during rage
  rageAttackSpeedMultiplier: 1.1, // attack speed multiplier during rage (lower cooldown)
  rageMoveSpeedMultiplier: 2.0,   // movement speed multiplier during rage
  lifestealPercent: 0.5,      // HP recovered as percentage of damage dealt during rage
  axeRange: 35,               // pixels from edge for axe swing attack
  axeCooldown: 25,            // frames between axe swings
  axeDamage: 15,              // base damage per axe swing
  axeSwingDurationFrames: 30, // frames for visible axe chop animation
  axeWindupDuration: 6,       // frames of wind-up anticipation before swing
  dualAxeBonus: 1.3,          // damage multiplier when both axes hit (during rage)
  rageRebounceAwayDistance: 2, // pixels
  rageRadiusScale: 1.0,
  enableFluidTrail: true,
};
