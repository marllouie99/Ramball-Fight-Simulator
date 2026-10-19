// ─────────────────────────────────────────────────────────────────────────────
// Musashi Character Config
// Legacy roster fighter — baseline identity, grade & stats (mirrored from FIGHTER_DEFS).
// Skill-specific tuning for legacy fighters still lives inline in CONFIG (js/core/config.js).
// ─────────────────────────────────────────────────────────────────────────────

export const musashiConfig = {
  name: 'Musashi',
  displayName: 'Musashi',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Japanese',
  color: '#34495e',
  radius: 25,
  hp: 100,
  damage: 10, // (Katana + Wakizashi)
  cooldown: 45,
  moveSpeed: 4.8,
  projectileSpeedMultiplier: 1.0,
  ability: 'Dual Stances',
  desc: 'Switches between five stances (Earth, Water, Fire, Wind, Void) giving passive effects and unique skills.',
};
