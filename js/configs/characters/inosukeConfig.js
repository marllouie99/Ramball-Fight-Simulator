// ─────────────────────────────────────────────
// Inosuke Hashibira Character Config
// Demon Slayer: Kimetsu no Yaiba / Demon Slayer Corps
// ─────────────────────────────────────────────

export const inosukeConfig = {
  // Baseline Attributes
  hp: 350,
  maxHpRatio: 1.0,
  speed: 6.2,
  moveSpeed: 6.2,
  r: 25,
  radius: 25,
  color: '#3B82F6',           // Wild Beast Indigo
  themeColor: '#3B82F6',
  secondaryColor: '#6B7280',   // Boar Fur Slate Grey
  accentPink: '#F472B6',       // Boar Snout Pink
  accentBrown: '#78350F',      // Deer Fur Waistband
  accentNavy: '#1E293B',       // Baggy Pants Navy
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.0,
  damage: 25,
  cooldown: 25,
  projectileSpeedMultiplier: 1.0,
  ability: 'Beast Breathing ("King of the Mountain")',
  desc: 'Wild dual-serrated katana berserker with Spatial Awareness radar and dislocated joint reach. Wields 160° Dual Serrated Hacks, 360° Crazy Cutting whirlwind shredding, unstoppable Explosive Rush boar charges, and the King of the Mountain Cataclysm ultimate.',

  // ──────────────────────────────────────────
  // ABILITY MASTER TOGGLE SWITCHES
  // ──────────────────────────────────────────
  enableCrazyCutting: true,
  enableExplosiveRush: true,
  enableKingOfMountain: true,
  enableSpatialAwareness: true,
  enableDislocatedJoints: true,

  // Passive 1: Beast Spatial Awareness
  wallRicochetSpeedMultiplier: 1.25,
  antiBackstabImmunity: true,

  // Passive 2: Dislocated Joint Reach & Evasion
  projectileEvasionRate: 0.15,
  extendedReachBonus: 20,

  // Basic Attack: Beast Breathing Dual Serrated Hack (160° Frontal Arc)
  dualKatanaArcAngle: Math.PI * 0.889, // ~160 degrees
  dualKatanaReach: 85,
  hit1Damage: 16,
  hit1StunFrames: 6,
  hit2Damage: 22,
  hit2StunFrames: 8,
  hit3Damage: 32,
  hit3Knockback: 26,

  // Skill 1: Beast Breathing Fifth Fang: Crazy Cutting (Kuruizaki)
  crazyCuttingCooldown: 252,   // 4.2s
  crazyCuttingRadius: 100,
  crazyCuttingTicks: 3,
  crazyCuttingDamagePerTick: 12,

  // Skill 2: Beast Breathing Eighth Fang: Explosive Rush (Bakuretsu Mōshin)
  explosiveRushCooldown: 330,  // 5.5s
  explosiveRushSpeed: 30.0,
  explosiveRushDamage: 36,
  explosiveRushKnockback: 38,

  // Ultimate: Beast Breathing Ultimate: King of the Mountain Cataclysm
  ultimateCooldown: 1440,      // 24.0s
  ultimateComboHits: 8,
  ultimateHitDamage: 8,
  ultimateFinisherDamage: 60,
  ultimateFinisherKnockback: 46,
};
