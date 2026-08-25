// ─────────────────────────────────────────────
// TACTICAL FORCE — MAIN GLOBAL CONFIGURATION
// Centralized configuration to adjust global attributes, unified movement speeds,
// combat tuning, and ballistics across all tactical operatives.
// ─────────────────────────────────────────────

export const tacticalMainConfig = {
  // ── 1. GLOBAL UNIFIED FIGHTER MOVEMENT SPEED ──
  // Adjust this single value to globally tune the movement speed of all tactical operatives
  unifiedMovementSpeed: 5.0,
  enableUnifiedSpeed: true,

  // ── 2. GLOBAL UNIFIED FIGHTER ATTRIBUTES ──
  unifiedRadius: 25,
  sizeMultiplier: 1.0,
  bodySpinRate: 0.08,           // Body rotational spin speed per frame
  aimAlignmentThreshold: 0.16,  // Smooth sweep alignment tolerance in radians (~9.2 degrees) when sweeping past enemy

  // ── 3. GLOBAL BALLISTICS & WEAPONS TUNING ──
  globalBulletSpeedMultiplier: 0.8,
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
  enableDynamicRebounce: true,          // Enable high-variance multi-directional rebounces
  rebounceDirectionalVariance: 0.85,    // Angular spread / variance upon wall impact (0.0 = strict specular, 1.0 = wide scatter)
  rebounceTangentialFlipChance: 0.45,   // 45% chance to flip tangential sliding direction around walls/obstacles
  obstacleRebounceSpread: 0.85,         // Angular scatter spread when bouncing off cover obstacles
  minWallTangentialSpeed: 0.65,         // Multiplier of base speed for tangential deflection on walls (prevents 1D ping-pong)
  spinReverseOnBounceChance: 0.0,       // 0% - Maintain uninterrupted continuous 360 spin in single direction
  bodyBumpScatterForce: 0.85,           // Enhanced perpendicular scatter on fighter-to-fighter collisions
};

export const mainTacticalConfig = tacticalMainConfig;
