// ─────────────────────────────────────────────────────────────────────────────
// Sharpshooter Character Config
// Legacy roster fighter — baseline identity, grade & stats (mirrored from FIGHTER_DEFS).
// Skill-specific tuning for legacy fighters still lives inline in CONFIG (js/core/config.js).
// ─────────────────────────────────────────────────────────────────────────────

export const sharpshooterConfig = {
  name: 'Sharpshooter',
  displayName: 'Sharpshooter',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Sci-Fi & Modern',
  color: '#ff4d4d',
  radius: 25,
  hp: 65,
  damage: 15,
  cooldown: 70, // 1 second at 60fps
  moveSpeed: 5.0,
  projectileSpeedMultiplier: 3.0,
  ability: 'Straight Fire',
  desc: 'Fires heavy projectiles straight ahead. High damage, slow reload rate.',
};
