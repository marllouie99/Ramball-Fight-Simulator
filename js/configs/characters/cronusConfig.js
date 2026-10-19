// ─────────────────────────────────────────────────────────────────────────────
// Cronus Character Config
// Legacy roster fighter — baseline identity, grade & stats (mirrored from FIGHTER_DEFS).
// Skill-specific tuning for legacy fighters still lives inline in CONFIG (js/core/config.js).
// ─────────────────────────────────────────────────────────────────────────────

export const cronusConfig = {
  name: 'Cronus',
  displayName: 'Cronus',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Greek Mythology',
  color: '#07cdfa',
  radius: 25,
  hp: 120,
  damage: 10,
  cooldown: 35,
  moveSpeed: 4.8,
  projectileSpeedMultiplier: 1.0,
  ability: 'Time Stop',
  desc: 'Deploys a time stop sphere that freezes enemies. Gain movement speed and attack speed.',
};
