// ─────────────────────────────────────────────────────────────────────────────
// Ruby Character Config
// ─────────────────────────────────────────────────────────────────────────────

export const rubyConfig = {
  id: 'ruby',
  name: 'Ruby',
  displayName: 'Ruby',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Fantasy & Magic',
  color: '#E0115F',
  radius: 25,
  hp: 90,
  damage: 12,
  cooldown: 40,
  moveSpeed: 4.8,
  projectileSpeedMultiplier: 1.0,
  ability: 'Scythe Dance',
  desc: 'Casting abilities triggers a short dash. Swings and pulls scythe to lifesteal.',

  // Basic Attack
  scytheDamage: 10,
  scytheRange: 45, // pixels from edge
  scytheCooldown: 40,
  lifestealPercent: 0.25, // 25% of damage dealt

  // Active Skill (Pull)
  activePullRange: 200,
  activePullCooldown: 240, // 4 seconds at 60fps
  activePullForce: 12.0,
  activeSlowDuration: 20,

  // Passive Skill (360 Spin)
  passiveSpinRadius: 80,
  passiveSpinCooldown: 300, // 5 seconds at 60fps
  passiveSpinDamage: 15,
  passiveLifestealPercent: 1.00,

  // Core Mechanic (Dash)
  dashSpeedMultiplier: 3.0,
  dashDuration: 12,
};
