// ─────────────────────────────────────────────────────────────────────────────
// Erebus Character Config
// Legacy roster fighter — baseline identity, grade & stats (mirrored from FIGHTER_DEFS).
// Skill-specific tuning for legacy fighters still lives inline in CONFIG (js/core/config.js).
// ─────────────────────────────────────────────────────────────────────────────

export const erebusConfig = {
  name: 'Erebus',
  displayName: 'Erebus',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Greek Mythology',
  color: '#6200a0',
  radius: 25,
  hp: 70,
  damage: 10,
  cooldown: 35,
  moveSpeed: 5.0,
  projectileSpeedMultiplier: 1.0,
  ability: 'Black Hole',
  desc: 'Summons a black hole near the opponent, dragging them in and dealing damage over time.',
};
