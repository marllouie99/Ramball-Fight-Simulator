// ─────────────────────────────────────────────
// TACTICAL FORCE — MAIN GLOBAL CONFIGURATION
// Centralized configuration to adjust global attributes, unified movement speeds,
// combat tuning, and ballistics across all tactical operatives.
// ─────────────────────────────────────────────

export const tacticalMainConfig = {
  // ── 1. GLOBAL UNIFIED FIGHTER MOVEMENT SPEED ──
  // Adjust this single value to globally tune the movement speed of all tactical operatives
  unifiedMovementSpeed: 4.0,
  enableUnifiedSpeed: true,

  // ── 2. GLOBAL UNIFIED FIGHTER ATTRIBUTES ──
  unifiedRadius: 25,
  sizeMultiplier: 1.0,
  bodySpinRate: 0.08,           // Body rotational spin speed per frame
  aimAlignmentThreshold: 0.16,  // Smooth sweep alignment tolerance in radians (~9.2 degrees) when sweeping past enemy

  // ── 3. GLOBAL BALLISTICS & WEAPONS TUNING ──
  globalBulletSpeedMultiplier: 0.5,
  globalDamageMultiplier: 1.0,
  globalRecoilForceMultiplier: 1.0,
  globalReloadTimeMultiplier: 1.0,

  // ── 4. VISION & LINE OF SIGHT (LOS) ──
  enableLineOfSight: true,
  maxVisionDistance: 400,

  // ── 5. COMBAT EFFECTS & BLOOD ──
  enableThemeColoredBlood: true, // Blood effects dynamically match each fighter's theme color
  screenShakeMultiplier: 1.0,
  fleshHitSoundVolume: 0.90,

  // ── 5b. HUD VISIBILITY ──
  enableHud: false,              // Toggle tactical HUD on/off (health bars, operator cards, ammo readouts)

  // ── 6. GUN BARREL PHYSICAL COLLISION & MELEE BASH ──
  enableGunBarrelCollision: true,
  gunBashDamage: 25,             // Physical muzzle/barrel bash damage on contact
  gunBashKnockback: 4.5,         // Pushback force when struck by spinning barrel
  gunBashCooldown: 22,           // Frames between melee hits per enemy

  // ── 7. TACTICAL REBOUNCE & DIRECTIONAL PHYSICS ──
  enableDynamicRebounce: true,          // Enable natural momentum-preserving physical rebounces
  restitution: 0.95,                    // Realistic kinetic restitution upon impact
  angleDeflectionVariance: 0.08,        // Subtle organic variance in radians (~4.5 deg) preventing pure 1D ping-pong
  minTangentialNudge: 0.15,             // Subtle corner deflection nudge when hitting perpendicular surfaces

  // ── 8. BULLET RICOCHET & FIRE DISCIPLINE ──
  bulletMaxWallBounces: 2,              // Max wall/obstacle ricochets before bullet expires
  holdFireDuringBounce: false,          // Continuous fire rate based strictly on fireCooldown

  // ── 9. TACTICAL AIM TRACKING & SMOOTHING (ANTI-SNAP) ──
  aimTurnSpeedInSight: 0.24,            // Maximum angular turn rate per frame when tracking enemy in clear LOS (~13.8 deg/frame)
  aimTurnSpeedOccluded: 0.14,           // Smooth transition turn rate when enemy is occluded behind walls (~8.0 deg/frame)
  aimSmoothingInSight: 0.28,            // Organic angular lerp factor for crisp target tracking
  aimSmoothingOccluded: 0.18,           // Gentle angular lerp factor when returning to movement heading
};

export const mainTacticalConfig = tacticalMainConfig;
