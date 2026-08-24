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
  bodySpinRate: 0.010,           // Body rotational spin speed per frame
  aimAlignmentThreshold: 0.14,  // Aim alignment tolerance in radians (~8 degrees) when pointing at enemy

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
};

export const mainTacticalConfig = tacticalMainConfig;
