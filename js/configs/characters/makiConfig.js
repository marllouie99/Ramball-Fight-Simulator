// ─────────────────────────────────────────────
// Maki Zen'in — The Awakened Demon Config
// Heavenly Restriction: Complete (Sakurajima Colony)
// ─────────────────────────────────────────────

export const makiConfig = {
  assets: {
    hair: 'Assets/model/maki/Maki-hair.png',
    weapon: 'Assets/model/maki/Maki-weapon.png',
  },

  name: 'Maki',
  displayName: 'Maki',
  // Base Attributes
  hp: 440,
  maxHp: 440,
  speed: 5.4,
  moveSpeed: 8.4,
  r: 25,
  radius: 25,
  color: '#18181B', // Deep Obsidian
  themeColor: '#014913ff', // Deep Emerald Green
  damageNumberColor: '#014913ff',
  startX: 350,
  startY: 250,
  startVx: 1.5,
  startVy: 1.5,
  damage: 28,
  cooldown: 35,
  projectileSpeedMultiplier: 1.0,
  ability: 'Heavenly Restriction (Awakened)',
  bossTitle: 'The Awakened Demon',
  title: 'Heavenly Restriction Complete',
  desc: 'Zero Cursed Energy. Slices directly into the soul with the Split Soul Katana, bypasses domains, air-steps without friction, and absorbs kinetic force with Dragon-Bone.',

  // Passive: Heavenly Restriction Complete & Domain Invisibility
  enableHeavenlyRestriction: true,
  domainImmunity: true,
  homingImmunity: true,
  dodgeChance: 0.15,
  flowStateDodgeChance: 0.40,
  airStepCooldown: 300, // 5.0s (300 frames)
  airStepSpeedMultiplier: 1.30,
  airStepDuration: 90, // 1.5s
  flowDodgeCooldown: 480, // 8.0s

  // Primary Weapon: Split Soul Katana (Shakkontō)
  enableSplitSoulKatana: true,
  swordRange: 72,
  swordArc: (135 * Math.PI) / 180, // 135 deg arc
  swordCooldown: 42,
  swordDamage: 28,
  comboHit2Damage: 34,
  comboHit3Damage: 48,
  swordKnockback: 6.5,
  soulWoundDuration: 240, // 4.0s (240 frames)
  soulWoundHealReduction: 0.75, // 75% reduced healing
  soulWoundTickDamage: 3, // True damage tick every 30 frames

  // Skill 1: Dragon-Bone (Ryūhoku) Kinetic Jet Skewer & Throw
  enableDragonBone: true,
  dragonBoneCooldown: 420, // 7.0s
  maxKineticCharges: 3,
  dragonBoneBaseDamage: 60,
  dragonBoneMaxDamage: 120,
  dragonBonePierceDamage: 25,
  dragonBonePinGapPx: 24,
  dragonBoneWindupFrames: 50,
  dragonBoneWindupAimTurnRate: 0.12,
  dragonBoneDashSpeed: 19.0,
  dragonBoneDashFrames: 16,
  dragonBoneStabFrames: 30,
  dragonBoneLiftFrames: 30,
  dragonBoneThrowFrames: 10,
  dragonBoneThrowChopAngle: 0.95,
  dragonBoneGroundPinFrames: 20,
  dragonBoneThrowSpeed: 5.0,
  dragonBoneThrowDistanceMultiplier: 1.5,
  dragonBoneThrowSlowFrames: 45,
  dragonBoneThrowSlowMultiplier: 0.65,

  // Skill 2: Zen'in Annihilation Riposte
  enableRiposte: true,
  riposteCooldown: 540, // 9.0s
  riposteStanceFrames: 22, // 0.36s parry window
  riposteDamage: 70,
  riposteStaggerFrames: 45,
  riposteSilenceDuration: 90, // 1.5s silence

  // Ultimate: Sakurajima Awakening ("Everything is Visible")
  enableUltimate: true,
  ultimateCooldown: 2100, // 35.0s
  ultimateRange: 380,
  flurryHitDamage: 35,
  flurryHitCount: 3,
  executionCleaveDamage: 120, // Total = 3 * 35 + 120 = 225 True Damage
  ultimateCraterRadius: 180,
};
