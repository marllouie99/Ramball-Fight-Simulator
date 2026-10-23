// ─────────────────────────────────────────────────────────────────────────────
// Jazz Character Config
// ─────────────────────────────────────────────────────────────────────────────

export const jazzConfig = {
  id: 'aimbot',
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

  // Skill Tuning (CONFIG.aimbot)
  followUpMinCooldown: 10, // minimum frames of cooldown forced after a follow-up shot
  electricStunDuration: 8, // frames the target is stunned after being hit (10 frames = ~0.16s)
  electricStunChance: 0.40,  // 0.0 to 1.0 chance of triggering the stun on hit (0.5 = 50%)
};
