// ─────────────────────────────────────────────────────────────────────────────
// Shinobi Character Config
// Legacy roster fighter — baseline identity, grade & stats (mirrored from FIGHTER_DEFS).
// Skill-specific tuning for legacy fighters still lives inline in CONFIG (js/core/config.js).
// ─────────────────────────────────────────────────────────────────────────────

export const shinobiConfig = {
  name: 'Shinobi',
  displayName: 'Shinobi',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Japanese',
  color: '#2f4f4f',
  radius: 25,
  hp: 50,
  damage: 5,
  cooldown: 25,
  moveSpeed: 5.5,
  projectileSpeedMultiplier: 1.0,
  ability: 'Shadow Arts',
  desc: 'Fighter with stealthy moves. Passively dodges projectiles. After 3 dodges, becomes invisible with speed boost and deals 2x backstab damage.',
};
