// ─────────────────────────────────────────────
// Megumi Fushiguro — Ten Shadows Sorcerer Config
// ─────────────────────────────────────────────

export const megumiConfig = {
  // Base Attributes
  hp: 380,
  speed: 5.8,
  moveSpeed: 5.0,
  r: 25,
  radius: 25,
  color: '#1C2D4A', // Midnight Navy
  themeColor: '#1C2D4A',
  cursedAccentColor: '#2EE6A8', // Seafoam / Jade Cursed Energy
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.0,
  damage: 16,
  cooldown: 40,
  projectileSpeedMultiplier: 1.0,
  ability: 'Ten Shadows Technique',
  desc: 'Wields the Ten Shadows Technique. Uses liquid shadow submersion, Divine Dog: Totality, Nue lightning, and Chimera Shadow Garden. Invokes untamed Mahoraga when in critical danger.',

  // Melee & Cursed Dagger Attack
  punchSpeed: 18,
  daggerRange: 55,
  daggerDamage: 14,
  daggerCooldown: 30,
  daggerArcAngle: 2.094, // 120 degrees in radians

  // Passive: Liquid Shadow Reservoir & Shadow Sink
  shadowSinkCooldown: 300, // 5.0s (300 frames)
  shadowSinkRequiredWallBounces: 1, // Number of arena wall bounces required before eruption
  shadowSinkGlideSpeedMultiplier: 1.45, // Submerged movement speed boost
  shadowSinkSinkDuration: 20, // Frames to submerge
  shadowAmbushEruptDuration: 22, // Frames to erupt
  shadowAmbushDamage: 26, // Damage dealt by Toji-style ambush thrust
  shadowAmbushSlowMultiplier: 0.15, // 85% drastic slow (moves at 15% speed)
  shadowEvadeChance: 0.50, // 50% evade buff during eruption attack sequence
  thrustKnockback: 26, // Concussive knockback impulse for shadow thrust

  // Skill 1: Divine Dog: Totality (Kon: Zen)
  totalityCooldown: 420, // 7.0s
  totalityDamage: 22,
  totalityBleedDuration: 180, // 3.0s

  // Skill 2: Nue (Thunder Bird) & Toad (Gama)
  nueCooldown: 360, // 6.0s
  nueDamage: 18,
  nueStunFrames: 45, // 0.75s electric stun
  toadCooldown: 300, // 5.0s

  // Skill 3: Max Elephant & Rabbit Escape
  maxElephantCooldown: 600, // 10.0s
  maxElephantDamage: 35,
  rabbitEscapeCooldown: 480, // 8.0s

  // Domain Expansion: Chimera Shadow Garden
  domainDuration: 600, // 10.0s
  domainSlowMultiplier: 0.50,

  // Desperation Climax: Mahoraga Ritual
  mahoragaThresholdHpPercent: 0.20, // 20% max HP
};
