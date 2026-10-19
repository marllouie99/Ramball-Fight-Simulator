// ─────────────────────────────────────────────────────────────────────────────
// Hydra Character Config
// Legacy roster fighter — baseline identity, grade & stats (mirrored from FIGHTER_DEFS).
// Skill-specific tuning for legacy fighters still lives inline in CONFIG (js/core/config.js).
// ─────────────────────────────────────────────────────────────────────────────

export const hydraConfig = {
  name: 'Hydra',
  displayName: 'Hydra',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Fantasy & Magic',
  color: '#4B0082', // Dark Purple
  radius: 25, // Standard size
  hp: 1000, // 5x health
  damage: 8, // Very low base damage. When stealing a weapon, uses the copied fighter's exact damage value.
  cooldown: 0, // Doesn't fire normally
  moveSpeed: 8.5, // Slow
  projectileSpeedMultiplier: 1.0,
  ability: 'The Overdrive',
  desc: 'Extremely tanky. Steals physical weapons upon being hit (copying their exact damage). Passively destroys incoming projectiles. Ultimate grants CC immunity.',
};
