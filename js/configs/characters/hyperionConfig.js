// ─────────────────────────────────────────────────────────────────────────────
// Hyperion Character Config
// Legacy roster fighter — baseline identity, grade & stats (mirrored from FIGHTER_DEFS).
// Skill-specific tuning for legacy fighters still lives inline in CONFIG (js/core/config.js).
// ─────────────────────────────────────────────────────────────────────────────

export const hyperionConfig = {
  name: 'Hyperion',
  displayName: 'Hyperion',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Greek Mythology',
  color: '#ffffff',
  radius: 25,
  hp: 80,
  damage: 15,
  cooldown: 300, // 3 seconds cooldown
  moveSpeed: 4.0,
  ability: 'Sustained Laser',
  desc: 'Fires a continuous laser beam.',
};
