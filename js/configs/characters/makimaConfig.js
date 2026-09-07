// ─────────────────────────────────────────────
// Makima (The Control Devil) Character Config
// Chainsaw Man / Public Safety Special Division 4
// ─────────────────────────────────────────────

export const makimaConfig = {
  // Baseline Attributes
  hp: 360,
  speed: 5.5,
  moveSpeed: 5.5,
  r: 25,
  radius: 25,
  color: '#A31D24',        // Velvet Blood Crimson
  themeColor: '#A31D24',
  secondaryColor: '#F59E0B', // Golden Halo Solar Gold
  accentDark: '#12131A',    // Dark Public Safety Charcoal
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.0,
  damage: 32,
  cooldown: 100,
  projectileSpeedMultiplier: 1.0,
  ability: 'Control Devil & "Bang!"',
  desc: 'The Control Devil. Commands absolute psychological authority. Passive: Prime Minister Accord redirects fatal blows to 5 Citizen Lives. Primary: "Bang!" supersonic kinetic hitscan shockwave with wall-bounce crush damage. Skill 1: Chains of Domination. Skill 2: Angel 1000-Year Spear. Ultimate: Kyoto Shrine Gravitational Splatter.',

  // Passive 1: Prime Minister Contract (Citizen Redirection)
  maxCitizenLives: 5,               // 5 citizen sacrifice stocks
  citizenReviveHpPercent: 0.40,     // Revives with 40% Max HP
  citizenDamageReduction: 0.20,     // 20% passive damage reduction while stocks remain
  citizenShockwaveRadius: 130,      // Repel shockwave radius on revive
  citizenShockwaveKnockback: 22,    // Repel force

  // Primary Attack: "Bang!" (Lightning-Fast Full-Screen Invisible Beam)
  bangDamage: 200,                   // Direct hit damage
  bangWallBounceDamage: 22,         // Bonus damage when slammed into arena walls
  bangKnockbackForce: 46,           // Massive directional knockback
  bangRange: 1600,                  // Full-screen lightning-fast beam reach
  bangCooldown: 200,                 // ~0.73s cooldown between shots
  bangBeamWidth: 32,                // Kinetic shockwave cylinder width
  bangPierceProjectiles: true,      // Pierces and destroys incoming enemy projectiles
  wallPinDurationFrames: 50,        // 1.5 seconds (90 frames) wall-stick duration on collision

  // Aiming & Turn Rate (Controlled Aim Rotation — No Instant Snap Auto-Aim)
  aimTurnRate: 0.055,               // Smooth rotational turn rate (~3.15°/frame)
  aimAlignmentThreshold: 0.18,      // Must be aligned within ~10° to fire "Bang!"

  // Skill 1: Chains of Domination (Shihai no Kusari)
  chainsCooldown: 540,              // 9.0s (540 frames)
  chainsRange: 420,                 // Tether reach
  chainsDamage: 24,                 // Initial latch damage
  chainsBleedDps: 8,                // Internal bleeding DPS
  chainsStasisFrames: 72,           // 1.2s target-only stasis lock (Rule 5)
  chainsPullSpeed: 11.5,            // Speed targets are reeled toward Makima
  chainsMinionHijackDuration: 360,  // 6.0s duration when hijacking enemy clones/minions

  // Skill 2: Angel's Armory (100-Year Halberds & 1000-Year Spear)
  angelCooldown: 810,               // 13.5s (810 frames)
  halberdDamage: 25,                // Damage per halberd (3 burst projectiles)
  halberdSpeed: 16.0,               // Projectile flight velocity
  thousandYearSpearDamage: 135,     // 1000-Year Spear True Damage on direct hit
  thousandYearSpearRadius: 150,     // Holy explosion AOE radius
  thousandYearSpearChannelFrames: 50, // 0.83s divine spear summon channel

  // Ultimate: Kyoto Shrine Ritual: Gravitational Splatter
  shrineCooldown: 1920,             // 32.0s (1920 frames)
  shrinePercentDamage: 0.45,        // 45% Max Target HP True Damage
  shrineFlatDamage: 280,            // 280 Flat True Damage
  shrineExecuteThreshold: 0.25,     // Instant execute if target HP <= 25%
  shrineChannelFrames: 110,         // 1.83s cinematic execution sequence
  shrineStasisDuration: 120,        // All-enemy ritual stasis lock duration
};
