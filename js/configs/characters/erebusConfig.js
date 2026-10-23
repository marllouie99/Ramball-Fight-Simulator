// ─────────────────────────────────────────────────────────────────────────────
// Erebus Character Config
// ─────────────────────────────────────────────────────────────────────────────

export const erebusConfig = {
  id: 'black',
  name: 'Erebus',
  displayName: 'Erebus',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Greek Mythology',
  color: '#6200a0',
  radius: 25,
  hp: 70,
  damage: 10,
  cooldown: 35,
  moveSpeed: 5.0,
  projectileSpeedMultiplier: 1.0,
  ability: 'Black Hole',
  desc: 'Summons a black hole near the opponent, dragging them in and dealing damage over time.',

  // Skill Tuning (CONFIG.black)
  shotCooldown: 35,   // frames between shots (normal fire rate)
  blackHoleChance: 0.00, // 100% chance for projectile to become black hole
  blackHoleRadius: 95,   // radius of black hole effect
  blackHoleDuration: 200, // frames the black hole lasts (4 seconds at 60 fps)
  blackHoleDamage: 5,    // damage per second while in black hole
  blackHolePullStrength: 1.0, // velocity pull strength toward black hole center
  skillCooldown: 300,    // frames between skill uses (5 seconds at 60 fps)
  skillSpawnRadius: 120, // radius around opponent to spawn black hole
  enhancedBlackHoleChance: 0.0, // increased chance when enemy is already in black hole
  enhancedShotsGranted: 0, // number of guaranteed enhanced projectiles granted when enemy is pulled in
  summonIndicatorFrames: 36, // frames for the summon fade-in/out indicator (≈0.6s)
  skillChargeDuration: 30, // frames to charge skill before summoning (1s)
  projectileSpeed: 10.0, // default speed for black projectiles when specified
};
