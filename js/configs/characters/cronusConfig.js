// ─────────────────────────────────────────────────────────────────────────────
// Cronus Character Config
// ─────────────────────────────────────────────────────────────────────────────

export const cronusConfig = {
  id: 'cronos',
  name: 'Cronus',
  displayName: 'Cronus',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Greek Mythology',
  color: '#07cdfa',
  radius: 25,
  hp: 120,
  damage: 10,
  cooldown: 35,
  moveSpeed: 4.8,
  projectileSpeedMultiplier: 1.0,
  ability: 'Time Stop',
  desc: 'Deploys a time stop sphere that freezes enemies. Gain movement speed and attack speed.',

  // Time Stop Sphere mechanics (CONFIG.cronos)
  sphereRadius: 200,         // radius of the time stop sphere
  sphereDuration: 300,       // frames the sphere lasts (3 seconds at 60 fps)
  sphereCooldown: 800,       // frames between sphere deployments (5 seconds at 60 fps)
  sphereSpeedMultiplier: 7.0, // movement speed multiplier inside sphere
  sphereActivationDistance: 120, // max distance to opponent to trigger sphere activation

  // Passive skills
  passiveStopChance: 0.05,   // chance to stop enemy movement on hit
  passiveStopDuration: 20,   // frames enemy movement is stopped
  counterStopChance: 0.05,   // chance to stop enemy when Cronos gets attacked
  counterStopDuration: 25,   // frames enemy movement is stopped on counter

  // Melee attack
  meleeRange: 50,            // pixels from edge for crescent blade attack
  meleeCooldown: 90,         // frames between melee attacks
  meleeDamage: 10,           // damage per crescent blade swing
  meleeSwingDuration: 10,    // frames for visible swing animation
  sphereMeleeDamage: 8,      // separate melee damage when inside own sphere
  sphereMeleeCooldown: 10,   // separate melee cooldown when inside own sphere
  doubleStrikeWindow: 10,    // frames window to execute the second strike

  // Bounce mechanics inside sphere
  sphereBounceForce: 0.5,    // velocity multiplier when bouncing inside sphere
  spherePreActivateFrames: 120, // frames before cooldown ends that the barrier starts glowing
  maxFrozenProjectiles: 25,  // max projectiles frozen in time sphere
};
