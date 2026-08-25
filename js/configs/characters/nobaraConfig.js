// ─────────────────────────────────────────────
// Nobara Kugisaki — Straw Doll Sorcerer Config
// ─────────────────────────────────────────────

export const nobaraConfig = {
  // Base Attributes
  hp: 400,
  speed: 5.4,
  moveSpeed: 5.4,
  r: 25,
  radius: 25,
  color: '#D94E68', // Deep Rose Crimson
  themeColor: '#D94E68',
  secondaryColor: '#FF6B81', // Cursed Flame Coral
  goldAccent: '#D4AF37', // Straw Gold
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.0,
  damage: 24,
  cooldown: 42,
  projectileSpeedMultiplier: 1.0,
  ability: 'Straw Doll Technique',
  desc: 'Wields a steel claw hammer and cursed nails. Embeds nails in enemies and environment. Passive: Unflinching Ecstasy surges under 50% HP. Skill 1: Hairpin detonates all active nails. Skill 2: Resonance pierces soul across any distance.',

  // Passive: Unflinching Ecstasy (Kōyō no Shinshō)
  ecstasyHpThreshold: 0.50,         // Triggers under 50% HP
  ecstasySpeedMultiplier: 1.20,     // +20% movement speed
  ecstasyProjectileSpeedMultiplier: 1.25, // +25% nail flight velocity
  ecstasyCooldownReduction: 0.30,   // 30% faster cooldowns/reloads
  ecstasyDamageMitigation: 0.15,    // 15% damage mitigation during skill channels

  // Passive: Straw Doll Technique (Embedded Nails)
  maxEmbeddedNails: 5,              // Max nails per target
  nailDurationFrames: 480,          // 8.0s nail lifetime (refreshed on hit)
  maxTerrainNails: 8,               // Max persistent terrain landmines

  // Primary Ranged: Nail Snipe (Kugi Uchi)
  nailDamage: 18,                   // Base nail projectile damage
  nailSpeed: 14.5,                  // Projectile velocity
  nailRadius: 4.5,                  // Collision radius
  nailShootCooldown: 42,            // ~0.70s between nail tosses

  // Primary Melee: Steel Hammer Cleave (Frontal Arc — Rule 7)
  hammerRange: 65,                  // 65px reach
  hammerArc: (120 * Math.PI) / 180, // 120° frontal arc
  hammerDamage: 24,                 // Blunt physical damage
  hammerCooldown: 42,               // Frames between melee swings (~0.70s)
  hammerKnockback: 18,              // Physical push force
  hammerNailsEmbedded: 2,           // Injects 2 nails on melee contact

  // Skill 1: Hairpin (Kanzashi)
  hairpinCooldown: 330,             // 5.5s (330 frames)
  hairpinDamagePerNail: 28,         // 28 damage per embedded nail (up to 140 at 5 stacks)
  hairpinTerrainDamage: 35,         // AOE damage for terrain landmine explosions
  hairpinTerrainRadius: 75,         // 75px detonation radius
  hairpinStunDuration: 27,          // 0.45s hit stun
  hairpinKnockback: 20,             // Physical blast knockback

  // Skill 2: Straw Doll Technique: Resonance (Tomonari)
  resonanceCooldown: 600,           // 10.0s (600 frames)
  resonanceBaseDamage: 60,          // 60 base True Damage
  resonanceDamagePerNail: 11,       // +11 damage per nail on target (up to 115)
  resonanceChannelFrames: 45,       // 0.75s straw doll impalement channel
  resonanceStaggerSlow: 0.60,       // 60% movement slow during curse rot
  resonanceStaggerDuration: 60,     // 1.0s stagger duration
  resonanceCloneEchoRatio: 0.75,    // 75% damage echoed back to real caster on clone strike

  // Ultimate: Black Flash & Supreme Resonance (Kokusen: Dai Tomonari)
  ultimateCooldown: 1920,           // 32.0s (1920 frames)
  ultimateBlitzDamage: 65,          // Black Flash hammer blitz damage
  ultimateResonanceDamage: 130,     // Giant Straw Doll explosion True Damage
  ultimateDashDistance: 220,        // Supersonic blitz range
  ultimateDashDuration: 14,         // 14 frames travel time
  ultimateHitPauseFrames: 36,       // Cinematic hit-pause on Black Flash strike
};
