// ─────────────────────────────────────────────────────────────────────────────
// Sharpshooter Character Config
// ─────────────────────────────────────────────────────────────────────────────

export const sharpshooterConfig = {
  id: 'normal',
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

  // Basic Rifle Tuning (CONFIG.normal)
  aimThreshold: 0.12, // radians; lower = must face enemy more precisely before firing
  shotCooldown: 10,   // frames between consecutive shots (independent of base cooldown)
  knockbackStrength: 20, // velocity impulse applied to target on each hit
  magazineSize: 7,    // number of bullets before needing to reload
  reloadTime: 130,    // frames to reload (2 seconds at 60 fps)

  // Execution Bullet Tuning (CONFIG.sharpshooter)
  enhancedDamageMultiplier: 2.5, // Damage multiplier for the final execution bullet
  enhancedSpeedMultiplier: 1.5,  // Projectile speed multiplier for the execution bullet
  electrifiedDuration: 45,       // Frames the crackling lightning effect lasts on target (45 = 0.75s)
  electrifiedDamagePerSec: 15,   // Damage per second taken while electrified
  enhancedRecoilForce: 30,       // Massive backward physics push on the shooter when the final bullet is fired
  executeWindupFrames: 30,       // Delay frames (charge up) before firing the execution bullet
};
