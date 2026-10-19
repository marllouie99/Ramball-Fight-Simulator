// ─────────────────────────────────────────────────────────────────────────────
// Ruby Character Config
// Legacy roster fighter — baseline identity, grade & stats (mirrored from FIGHTER_DEFS).
// Skill-specific tuning for legacy fighters still lives inline in CONFIG (js/core/config.js).
// ─────────────────────────────────────────────────────────────────────────────

export const rubyConfig = {
  name: 'Ruby',
  displayName: 'Ruby',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Fantasy & Magic',
  color: '#E0115F',
  radius: 25,
  hp: 90,
  damage: 12,
  cooldown: 40,
  moveSpeed: 4.8,
  projectileSpeedMultiplier: 1.0,
  ability: 'Scythe Dance',
  desc: 'Casting abilities triggers a short dash. Swings and pulls scythe to lifesteal.',
};
