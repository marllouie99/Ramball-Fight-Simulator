// ─────────────────────────────────────────────────────────────────────────────
// Circe Character Config
// Legacy roster fighter — baseline identity, grade & stats (mirrored from FIGHTER_DEFS).
// Skill-specific tuning for legacy fighters still lives inline in CONFIG (js/core/config.js).
// ─────────────────────────────────────────────────────────────────────────────

export const circeConfig = {
  name: 'Circe',
  displayName: 'Circe',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Greek Mythology',
  color: '#4dff4d',
  radius: 25,
  hp: 75,
  damage: 15,
  cooldown: 0,
  moveSpeed: 4.7,
  ability: 'Poison Grenade',
  desc: 'Throws a poison and deals AOE damage and poisons them.',
};
