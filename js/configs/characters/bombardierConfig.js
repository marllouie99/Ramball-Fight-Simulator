// ─────────────────────────────────────────────────────────────────────────────
// Bombardier Character Config
// Legacy roster fighter — baseline identity, grade & stats (mirrored from FIGHTER_DEFS).
// Skill-specific tuning for legacy fighters still lives inline in CONFIG (js/core/config.js).
// ─────────────────────────────────────────────────────────────────────────────

export const bombardierConfig = {
  name: 'Bombardier',
  displayName: 'Bombardier',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Sci-Fi & Modern',
  color: '#6A3F1E',
  skinColor: '#5A3B1A',
  skinAccentColor: '#E0B05B',
  radius: 25,
  hp: 85,
  damage: 12,
  cooldown: 45,
  moveSpeed: 4.5,
  projectileSpeedMultiplier: 1.0,
  ability: 'Explosive Expert',
  desc: 'Throws grenades that explode on impact dealing AOE damag. Leaves a powerful C4 bomb on death.',
};
