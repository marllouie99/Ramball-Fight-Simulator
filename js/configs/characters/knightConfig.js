// ─────────────────────────────────────────────
// Knight Character Configuration
// Broadsword Melee Combos & Tower Shield Defense
// ─────────────────────────────────────────────

export const knightConfig = {
  name: 'Knight',
  displayName: 'Knight',
  category: 'Fantasy & Magic',
  color: '#9e9e9e',
  themeColor: '#718096',
  damageNumberColor: '#E2E8F0',
  r: 25,
  radius: 25,
  hp: 110,
  maxHp: 110,
  damage: 28,
  moveSpeed: 4.8,
  speed: 4.8,
  ability: 'Tower Shield & Broadsword',
  desc: 'Passively blocks incoming direct projectile and melee attacks with a sturdy tower shield, striking with heavy broadsword cleaves and visceral hit-pause impact.',

  assets: {
    hair: 'Assets/model/Knight/Knight_hair.jpg',
    shield: 'Assets/model/Knight/Knight_shield.jpg',
    sword: 'Assets/model/Knight/Knight_sword.jpg',
  },

  // Shield Defense & Deflection Hit-Pause
  shieldBlockChance: 0.50,
  blockFlashFrames: 18,
  shieldHoldFrames: 50,
  blockHitPauseFrames: 8,         // Guard deflection hit-pause duration when tower shield blocks an incoming attack
  blockMeleeDetectionRadius: 130,
  blockProjectileDetectionRadius: 200,
  shieldDurability: 2,
  shieldThrowDamage: 30,
  shieldReturnFrames: 180,
  swordReturnFrames: 180,
  dashChargeFrames: 10,
  chargeKnockback: 2.0,
  chargeKnockbackRadius: 90,
  dashDuration: 40,
  dashSpeed: 9.5,
  dashDamage: 35,
  dashKnockback: 10.5,

  // Broadsword 2-Hit Cleave & Hit-Pause
  enableMeleeCombo: true,
  swordRange: 75,
  swordCooldown: 38,
  swipeCooldown: 38,
  swipeDuration: 30,
  swordDamage: 30,
  swordDurability: 3,
  comboResetFrames: 90,

  // Hit 1: Horizontal Cross Cleave (Rule 30: 5-Phase Timing)
  hit1LiftFrames: 7,
  hit1HoldFrames: 2,
  hit1StrikeFrames: 5,
  hit1ImpactLockFrames: 6,
  hit1RecoveryFrames: 10,
  hit1Damage: 28,
  hit1Knockback: 6.0,
  hit1LungeSpeed: 6.5,
  hit1HitPauseFrames: 7,          // Visceral impact freeze when Hit 1 connects
  hit1HitStunFrames: 10,

  // Hit 2: Upward Rising Cleave (Rule 30: 5-Phase Timing)
  hit2LiftFrames: 6,
  hit2HoldFrames: 2,
  hit2StrikeFrames: 5,
  hit2ImpactLockFrames: 7,
  hit2RecoveryFrames: 12,
  hit2Damage: 34,
  hit2Knockback: 8.5,
  hit2LungeSpeed: 7.2,
  hit2HitPauseFrames: 9,          // Heavier finisher impact freeze when Hit 2 connects
  hit2HitStunFrames: 14,
};
