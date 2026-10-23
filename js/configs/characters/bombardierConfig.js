// ─────────────────────────────────────────────────────────────────────────────
// Bombardier Character Config
// ─────────────────────────────────────────────────────────────────────────────

export const bombardierConfig = {
  id: 'bomber',
  name: 'Bombardier',
  displayName: 'Bombardier',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Sci-Fi & Modern',
  color: '#6A3F1E',
  skinColor: '#5A3B1A',
  skinAccentColor: '#E0B05B',
  radius: 25,
  hp: 85,
  damage: 12,
  cooldown: 45,
  moveSpeed: 4.5,
  projectileSpeedMultiplier: 1.0,
  ability: 'Explosive Expert',
  desc: 'Throws grenades that explode on impact dealing AOE damag. Leaves a powerful C4 bomb on death.',

  // Basic attack (grenades)
  grenadeDamage: 17,         // damage per grenade explosion
  grenadeCooldown: 90,       // frames between grenade throws
  grenadeSpeed: 4.2,         // speed of thrown grenades
  grenadeRadius: 8,          // radius of grenade projectile
  grenadeLife: 120,          // frames grenade travels before auto-exploding
  explosionRadius: 70,       // AOE radius of grenade explosion
  explosionDamage: 10,       // AOE damage from grenade explosion

  // Sticky bomb (passive)
  stickyBombChance: 0.25,    // chance (0-1) to throw sticky bomb instead of grenade
  stickyBombDamage: 15,      // damage of sticky bomb explosion
  stickyBombStickDuration: 60, // frames sticky bomb stays attached before exploding
  stickyBombExplosionRadius: 65, // AOE radius of sticky bomb explosion

  // C4 skill
  c4Cooldown: 400,           // frames between C4 deployments (6.67 seconds at 60 fps)
  c4PlantDuration: 180,      // frames before C4 auto-explodes (3 seconds at 60 fps)
  c4Damage: 35,              // damage of C4 explosion
  c4ExplosionRadius: 100,    // AOE radius of C4 explosion
  c4PlantRadius: 80,         // max distance to plant C4

  // Death C4 (unique mechanic)
  deathC4Duration: 150,      // frames after death before C4 explodes (1.5 seconds)
  deathC4Damage: 25,         // damage of death C4 explosion
  deathC4ExplosionRadius: 180, // AOE radius of death C4 explosion

  // Concussive blast (knockback from explosions)
  concussiveBlast: {
    enabled: true,
    baseKnockback: 22,
    falloffExponent: 1.5,
    verticalKnockback: 0.3,
    minKnockbackRadius: 0.2,
    stunChance: 0.15,
    stunDuration: 20,
  },

  // Chain reaction (bombs trigger nearby bombs)
  chainReaction: {
    enabled: true,
    chainRadius: 60,
    maxChains: 3,
  },

  // Grenade range restrictions
  throwRadius: 400,          // max distance at which bomber can throw grenades
  restrictRadius: 130,       // min distance — bomber cannot throw grenades inside this radius
  steeringForce: 0.35,       // how strongly bomber steers toward optimal distance (0-1)
};
