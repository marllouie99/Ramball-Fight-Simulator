// ─────────────────────────────────────────────
// Zeus — King of Olympus & God of Thunder Config
// ─────────────────────────────────────────────
export const zeusConfig = {
  // ── Base Attributes ──
  hp: 200,
  speed: 5.2,
  moveSpeed: 5.2,
  r: 25,
  radius: 25,
  color: '#00BFFF', // Deep Sky Blue / Olympian Cyan
  themeColor: '#00BFFF',
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 0.9,
  damage: 20,
  cooldown: 200,
  projectileSpeedMultiplier: 1.0,
  ability: 'Storm Bringer',
  bossTitle: 'King of Olympus',
  title: 'King of Olympus',
  desc: 'Throws chain lightning. Passively shocks melee attackers. Ultimate summons a map-wide thunderstorm.',

  // ── Basic Attack: Chain Lightning (Fast Projectile) ──
  enableChainLightning: true,  // Master toggle for Chain Lightning basic attack
  lightningDamage: 20,         // Base damage per lightning hit (balanced with Sukuna slashes & Gojo basic)
  lightningSpeed: 30,          // Supersonic bolt speed (px/frame)
  lightningRadius: 6,          // Radius of chain lightning bolt projectile
  lightningLife: 100,          // Lifespan of lightning projectile in frames
  chainCount: 4,               // Max target bounces (down from 6, preventing excessive AOE wipes)
  chainRange: 220,             // Search range in pixels to find next chain target
  chainDamageMultiplier: 0.8,  // Decay factor per bounce (10 -> 8 -> 6.4 -> 5.1)
  attackCooldown: 300,         // Synchronized attack cooldown (matches cooldown: 120)
  boltReleaseOffset: 20,       // Tip release distance beyond fighter body radius
  shootFlashRadius: 35,        // Flash radius on basic bolt release
  shootSparkCount: 12,         // Spark count on basic bolt release

  // ── Debuff & Stun Progressive Mechanics ──
  enableStunDebuffs: true,     // Master toggle for progressive stun & debuff system
  baseStunChance: 0.10,        // Starting stun chance (10%)
  stunChanceIncrease: 0.05,    // +5% stun chance added per landed hit (tuned from +10%)
  maxStunChance: 0.00,         // Maximum stun chance cap (50%, tuned from 80%)
  stunChance: 0.10,            // Initial fallback stun chance
  stunDuration: 50,            // Duration in frames (~0.4s) target is stunned on electric hit
  paralyzeChance: 0.10,        // 25% chance to apply paralyze slow
  paralyzeDuration: 50,        // Duration in frames (~0.83s) of paralyze slow
  paralyzeSlowMultiplier: 0.5, // Movement speed multiplier while paralyzed (50% speed)
  staticChance: 0.10,          // 40% chance to afflict target with Static debuff
  staticDuration: 100,         // Duration in frames (~1.67s) static lasts
  staticDamageBonus: 1.33,     // 33% extra damage to static targets (tuned down from 1.50)
  electricVisualDuration: 45,  // Duration in frames (~0.75s) electric shock overlay persists on target

  // ── Passive: Aegis Shield (Melee Counter) ──
  enableAegisShield: true,     // Master toggle for Aegis Shield melee counter
  aegisCooldown: 300,          // Recharge cooldown in frames (5.0s at 60fps)
  aegisShockDamage: 12,        // Shock counter damage dealt to melee attackers (tuned with Sukuna Spiderweb: 15)
  aegisParalyzeDuration: 60,   // Duration in frames (~1.0s) of slow applied to attacker
  aegisTriggerRange: 180,      // Proximity detection radius in pixels
  aegisFlashRadius: 40,        // Impact flash radius on Aegis trigger
  aegisSparkCount: 15,         // Spark count on Aegis trigger
  aegisShakeIntensity: 4,      // Screen shake impulse on Aegis trigger
  aegisShakeFrames: 5,         // Screen shake duration on Aegis trigger

  // ── Ultimate: Thunder Storm (Map-Wide Divine Wrath) ──
  enableThunderStorm: true,    // Master toggle for Thunder Storm ultimate
  stormCooldown: 1000,         // 25.0s Cooldown (balanced with Gojo Hollow Purple & Sukuna Fuga / Domain)
  stormDuration: 300,          // 5.0 seconds total active storm duration
  stormStrikesPerSec: 3,       // Frequency of lightning strikes per enemy (3 per sec = 15 strikes total)
  stormStrikeDamage: 20,        // Base damage per strike (15 strikes * 6 = 90 base dmg; ~115-120 with static bonus)

  // ── Storm Visuals & Screen FX ──
  stormTelegraphFrames: 120,   // Channeling wind-up duration before storm unleashes (2.0s at 60fps)
  stormDimOpacity: 0.92,       // Deep atmospheric darkness level across arena
  stormCastShakeIntensity: 8,  // Screen shake impulse when storm unleashes
  stormCastShakeFrames: 20,    // Duration of activation screen shake
  stormStrikeShakeIntensity: 4,// Screen shake impulse on each individual lightning strike
  stormStrikeShakeFrames: 10,  // Duration of strike impact screen shake
  stormStrikeVisualLife: 15,   // Lifespan of sky-to-ground thunder bolt particle in frames
  stormStrikeFlashRadius: 50,  // Impact flash radius on storm strike
  stormStrikeSparkCount: 10,   // Spark particle count on storm strike
};
