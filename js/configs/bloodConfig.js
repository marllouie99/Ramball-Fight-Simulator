// ─────────────────────────────────────────────
// BLOOD EFFECT CONFIGURATION
// Fine-tune all arena blood splash, droplet, and splatter adjustments here
// ─────────────────────────────────────────────

export const bloodConfig = {
  // ── 1. GLOBAL BLOOD PARTICLE SIZE ADJUSTMENT ──
  // Multiplies the rendered width and height of ALL blood particles globally in the arena
  // (e.g. 1.0 = standard retro pixel size, 1.5 = 50% larger, 2.0 = double size, 0.7 = smaller mist)
  globalSizeMultiplier: 1.0,

  // Global Active Blood Particle Limits in the Arena
  limits: {
    maxParticles1v1: 40,        // Max active blood particles in 1v1 / Training
    maxParticlesStandOff: 25,   // Max active blood particles in Stand Off mode
    maxParticles1v2: 25,        // Max active blood particles in 1v2 mode
    maxParticlesFFA: 30,        // Max active blood particles in FFA mode
    maxParticlesMulti: 35,      // Max active blood particles in 2v2 / Multi modes
  },

  // Standard Damage Hit Blood Splash (Basic attacks, skills, punches, bullets)
  hit: {
    minDroplets: 1,             // Minimum blood droplets spawned on hit
    maxDroplets: 3,             // Maximum blood droplets spawned on normal hit
    damageDivisor: 12.0,        // Damage divisor to scale droplet count (higher = fewer particles)
    minSize: 5.0,               // Minimum pixel square droplet size (px) — ADJUST HIT PARTICLE SIZE HERE
    maxSize: 5.4,               // Maximum pixel square droplet size (px) — ADJUST HIT PARTICLE SIZE HERE
    baseSpeed: 4.0,             // Base ejection velocity
    speedVariance: 8.0,         // Random speed variance added to base speed
    spreadAngle: 0.5,           // Spread cone angle in radians (relative to damage vector)
    upwardImpulse: 0.5,         // Slight vertical pop arc (px/frame)
    upwardImpulseVariance: 1.5, // Random variance in upward pop
  },

  // Fatal Blood Splash Explosion (When a fighter dies / is splashed to death)
  fatal: {
    count1v1: 22,               // Droplet count for 1v1 / Training
    countStandOff: 14,          // Droplet count for Stand Off mode
    count1v2: 16,               // Droplet count for 1v2 mode
    countFFA: 16,               // Droplet count for FFA mode
    countMulti: 18,             // Droplet count for 2v2 / Multi modes
    minSize: 3.0,               // Minimum pixel square size for fatal droplets (px) — ADJUST FATAL PARTICLE SIZE HERE
    maxSize: 5.0,               // Maximum pixel square size for fatal droplets (px) — ADJUST FATAL PARTICLE SIZE HERE
    baseSpeed: 6.0,             // Base radial explosion speed
    speedVariance: 12.0,        // Random speed variance added to base speed
    maxActiveLimit1v1: 65,      // Max active particles ceiling during fatal burst (1v1)
    maxActiveLimitStandOff: 45, // Max active particles ceiling during fatal burst (Stand Off)
    maxActiveLimit1v2: 45,      // Max active particles ceiling during fatal burst (1v2)
    maxActiveLimitFFA: 50,      // Max active particles ceiling during fatal burst (FFA)
    maxActiveLimitMulti: 55,    // Max active particles ceiling during fatal burst (Multi)
  },

  // Physics & Arena Floor Landing Dynamics
  physics: {
    gravity: 0.38,              // Downward gravity pull towards the bottom arena border
    airResistance: 0.95,        // Velocity damping in air per frame
    floorFriction: 0.85,        // Horizontal friction once landed on arena floor
    floorDecayRate1v1: 0.010,   // Fade rate on floor for 1v1 (~1.5s linger)
    floorDecayRateStandOff: 0.014, // Fade rate on floor for Stand Off (~1.0s linger)
  },

  // Authentic Visceral Blood Palette (RGB Hex Numbers)
  palette: [
    0xE60000, // Vibrant Crimson
    0xDC2626, // Arterial Red
    0x990000, // Deep Blood
    0x800000, // Dark Maroon
    0xCC0000, // Pure Crimson
    0xB91C1C  // Dark Visceral Red
  ]
};
