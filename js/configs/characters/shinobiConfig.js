// ─────────────────────────────────────────────────────────────────────────────
// Shinobi Character Config
// ─────────────────────────────────────────────────────────────────────────────

export const shinobiConfig = {
  id: 'darkslategray',
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

  // Basic attack settings
  shurikenDamage: 5,           // damage per shuriken
  shurikenSpeed: 7.0,          // speed of shuriken projectiles
  shurikenCooldown: 25,        // frames between shuriken throws (normal fire rate)

  // Dodge mechanics
  dodgeChance: 0.50,           // probability (0-1) of dodging incoming projectiles
  dodgeFlashDuration: 100,     // frames the flash step visual effect lasts (increased for visibility)
  dodgeCooldown: 15,           // frames minimum between dodge attempts

  // Flame-contact stealth build
  flameContactStealthBuildFrames: 72, // frames of sustained flame contact before attempting stealth (≈1.2s at 60fps)
  flameContactStealthChance: 0.45,     // chance to trigger stealth when build completes (per attempt)
  flameContactStealthCooldown: 150,    // min frames between stealth triggers from flame contact (≈2.5s at 60fps)

  // Invincibility skill activation
  dodgesToActivate: 3,         // number of successful dodges needed to activate skill
  invincibilityDuration: 300,  // frames the invincibility lasts (5 seconds at 60 fps)
  speedBoostMultiplier: 2.5,   // movement speed multiplier during invincibility

  // Backstab mechanics
  backstabDamageMultiplier: 2.0, // damage multiplier when backstabbing during invincibility
  backstabAngle: 120,          // angle in degrees considered "behind" enemy (±60° from back)
  backstabRange: 75,           // pixels from enemy edge to trigger backstab
  meleeAttackRadius: 75,       // melee attack radius for backstab detection
  backstabRecoveryPercent: 0.15, // HP recovery on successful backstab (1.0 = 100%)
  meleeSwingDamage: 5,         // damage dealt by sword swing from any direction
  meleeSwingCooldown: 5,       // frames between sword swings (normal melee attack)
  backstabCooldown: 10,        // frames between backstab attempts
  proximityTriggerRadius: 120, // additional distance beyond hit radius to trigger stealth dodge

  // Weapon animations
  swingAnimationDuration: 30,  // frames for sword swing animation
  swingRotationAmount: 1.8,    // radians; total rotation during swing
  backstabAnimationDuration: 20, // frames for backstab thrust animation
  backstabThrustAmount: 1.5,   // radians; rotation during backstab

  // Visual effects
  invisibilityAlpha: 0.15,     // transparency level during invincibility (0-1, lower = more transparent)
  dodgeAlpha: 0.08,            // transparency level during dodge fade
  flashStepAlpha: 0.3,         // alpha of the flash step afterimage
  flashStepCount: 5,           // number of afterimages during flash step
  weaponSwitchDuration: 12,    // frames for weapon swap animation during stealth
};
