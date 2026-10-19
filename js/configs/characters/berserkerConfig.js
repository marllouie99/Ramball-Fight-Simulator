// ─────────────────────────────────────────────────────────────────────────────
// Berserker Character Config
// Legacy roster fighter — baseline identity, grade & stats (mirrored from FIGHTER_DEFS).
// Skill-specific tuning for legacy fighters still lives inline in CONFIG (js/core/config.js).
// ─────────────────────────────────────────────────────────────────────────────

export const berserkerConfig = {
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
};
