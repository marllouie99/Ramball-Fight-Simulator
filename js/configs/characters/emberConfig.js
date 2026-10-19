// ─────────────────────────────────────────────────────────────────────────────
// Ember Character Config
// Legacy roster fighter — baseline identity, grade & stats (mirrored from FIGHTER_DEFS).
// Skill-specific tuning for legacy fighters still lives inline in CONFIG (js/core/config.js).
// ─────────────────────────────────────────────────────────────────────────────

export const emberConfig = {
  name: 'Ember',
  displayName: 'Ember',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Fantasy & Magic',
  color: '#ff8c00',
  radius: 25,
  hp: 100,
  damage: 10,
  cooldown: 30,
  moveSpeed: 4.0,
  projectileSpeedMultiplier: 1.0,
  ability: 'Auto-Lock Flamethrower',
  desc: 'Burns enemies with burning effect.',
};
