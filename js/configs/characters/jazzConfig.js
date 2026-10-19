// ─────────────────────────────────────────────────────────────────────────────
// Jazz Character Config
// Legacy roster fighter — baseline identity, grade & stats (mirrored from FIGHTER_DEFS).
// Skill-specific tuning for legacy fighters still lives inline in CONFIG (js/core/config.js).
// ─────────────────────────────────────────────────────────────────────────────

export const jazzConfig = {
  name: 'Jazz',
  displayName: 'Jazz',
  grade: 'A',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Sci-Fi & Modern',
  color: '#4da3ff',
  radius: 25,
  hp: 60,
  damage: 5,
  cooldown: 30,  // 1 second at 60fps
  moveSpeed: 5.0,
  ability: 'Aimbot Laser',
  desc: 'Wields a dubstep gun that fires musical notes and triggers an instant follow-up projectile on hit.',
};
