// ─────────────────────────────────────────────────────────────────────────────
// Doppelganger Character Config
// Legacy roster fighter — baseline identity, grade & stats (mirrored from FIGHTER_DEFS).
// Skill-specific tuning for legacy fighters still lives inline in CONFIG (js/core/config.js).
// ─────────────────────────────────────────────────────────────────────────────

export const doppelgangerConfig = {
  name: 'Doppelganger',
  displayName: 'Doppelganger',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Fantasy & Magic',
  color: '#9b59b6',
  radius: 25,
  hp: 100,
  damage: 15,
  cooldown: 45,
  moveSpeed: 5.5,
  projectileSpeedMultiplier: 1.0,
  ability: 'Mirror Image',
  desc: 'Summons illusions of itself every 25% health lost.',
};
