// ─────────────────────────────────────────────────────────────────────────────
// Doppelganger Character Config
// ─────────────────────────────────────────────────────────────────────────────

export const doppelgangerConfig = {
  id: 'doppleganger',
  name: 'Doppelganger',
  displayName: 'Doppelganger',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Fantasy & Magic',
  color: '#9b59b6',
  radius: 25,
  hp: 100,
  damage: 15,
  cooldown: 45,
  moveSpeed: 5.5,
  projectileSpeedMultiplier: 1.0,
  ability: 'Mirror Image',
  desc: 'Summons illusions of itself every 25% health lost.',

  // Melee attack (purple sword)
  swordRange: 40,           // pixels from edge for sword swing attack
  swordCooldown: 30,        // frames between sword swings
  swordDamage: 15,          // damage per sword swing
  swordSwingDuration: 20,   // frames for visible sword swing animation

  // Passive skill (illusion summoning)
  illusionHealthPercent: 0.02, // health percentage threshold for summoning illusion (every 2%)
  maxIllusions: 4,          // maximum number of illusions that can exist at once
  illusionDamagePercent: 0.5, // illusions deal 50% of original damage
  illusionDamageReceivedMultiplier: 3.5, // illusions receive 3.5x damage
  illusionDuration: 2000,   // frames illusions last before fading
  illusionSpeedSync: true,  // if true, illusions spawn with current speed
};
