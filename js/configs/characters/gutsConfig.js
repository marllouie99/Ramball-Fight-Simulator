// ─────────────────────────────────────────────
// GUTS — THE BLACK SWORDSMAN CONFIG
// Anime & Dark Fantasy (Berserk)
// Wielder of the Dragon Slayer & Berserker Armor
// ─────────────────────────────────────────────

export const gutsConfig = {
  name: 'Guts',
  displayName: 'GUTS',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)
  category: 'Anime & Dark Fantasy',
  color: '#18181b', // Deep Obsidian Black
  themeColor: '#71717a', // Cold Steel / Iron Gray
  hudSkillBarColor: '#dc2626', // Visceral Blood Crimson
  damageNumberColor: '#dc2626',
  r: 30,
  radius: 30,
  hp: 460,
  maxHp: 460,
  damage: 36,
  moveSpeed: 4.6,
  speed: 4.6,
  ability: 'Dragon Slayer & Berserker Armor',
  bossTitle: 'The Black Swordsman',
  title: 'The Struggler',
  desc: 'Wielder of the monstrous 400-pound Dragon Slayer. Struggles against fate with unyielding poise, a high-explosive arm cannon, and the dwarf-forged Berserker Armor.',

  assets: {
    hair: 'Assets/model/guts/Guts-hair.png',
    helmet: 'Assets/model/guts/Guts_helmet.png',
    sword: 'Assets/model/guts/Guts_heavy_sword.png',
    helmetJpg: 'Assets/model/guts/Guts_helmet.jpg',
    swordJpg: 'Assets/model/guts/Guts_heavy_sword.jpg',
    slashEffect: 'Assets/model/guts/Guts_heavy_sword_slash_effect.jpg',
    neutralCountdown: 'Assets/model/guts/Guts_neutral_countdown.png',
    battleStance: 'Assets/model/guts/Guts_battle_stance.png',
    doll: 'Assets/model/guts/Guts_battle_stance.png',
    dollCountdown: 'Assets/model/guts/Guts_neutral_countdown.png',
  },

  // ──────────────────────────────────────────
  // Passive 1: The Struggler (Heavy Poise & Defiance)
  // ──────────────────────────────────────────
  enableTheStruggler: true,      // Master toggle for Passive 1 (Heavy Poise & Lethal Defiance 1-HP survival)
  enableLethalDefiance: true,   // Alias toggle for 1-HP survival gate
  maxPoise: 100,
  poiseRegenRate: 1.5,
  lethalDefianceCooldown: 3000, // 50.0s
  deathGateInvulnFrames: 72,     // 1.2s invulnerability on surviving fatal hit
  deathGateSpeedBuff: 1.35,
  deathGateDamageBuff: 1.30,

  // ──────────────────────────────────────────
  // Passive 2: Brand of Sacrifice & Od Meter
  // ──────────────────────────────────────────
  enableBrandOfSacrifice: true, // Master toggle for Passive 2 (Od Meter charging from combat damage)
  enableOdMeter: true,          // Alias toggle for Od Meter
  maxOdGauge: 100,
  odChargePerDamageTaken: 0.15,
  odChargePerDamageDealt: 0.10,

  // ──────────────────────────────────────────
  // Basic Attack: Dragon Slayer 2-Hit Melee Cleaves (Knight Standard 5-Phase Swing)
  // ──────────────────────────────────────────
  enableDragonSlayer: true,     // Master toggle for Basic Attack (Dragon Slayer Sword Swing)
  enableSword: true,            // Alias toggle for Dragon Slayer
  enableMeleeCombo: true,       // Alias toggle
  baseBladeLength: 85,          // Baseline Dragon Slayer blade length (px); dynamic reach scales directly with weapon size (scale * lengthScale)
  swordBladeRadius: 22,
  swordCooldown: 36,
  swipeCooldown: 36,
  swipeDuration: 28,
  comboResetFrames: 90,
  swordTremorIntensity: 2.2, // Tremor jitter amplitude (px) during impact latch

  // Combat Battle Stance & 2-Hit Jaw Cleave Pattern (Matching reference diagram)
  battleStanceMouthX: 0,
  battleStanceMouthY: 0.55, // fraction of r (mouth/teeth height)
  battleStanceAngle: 2.97,  // radians (~170 deg, down-left pointing blade in combat stance)
  battleStanceStartAngle: 2.97, // ~170 deg (down-left start position)
  battleStanceApexAngle: -0.70, // ~ -40 deg (up-right apex position)
  battleStanceSweepArc: (250 * Math.PI) / 250, // 210 deg (Half-full angle)

  // Hit 1: Heavy swing up (Half-full angle: Down-Left -> Bottom -> Up-Right)
  hit1LiftFrames: 7,
  hit1HoldFrames: 2,
  hit1StrikeFrames: 5,
  hit1ImpactLockFrames: 6,
  hit1LockFrames: 6,
  hit1RecoveryFrames: 10,
  hit1Damage: 38,
  hit1Knockback: 6.5,
  hit1LungeSpeed: 6.5,
  hit1ArcAngle: (210 * Math.PI) / 180,
  hit1HitPauseFrames: 7,
  hit1HitStunFrames: 11,

  // Hit 2: Heavy Downward Launching Cleave (Overhead Top-Left -> Sky Apex -> Downward Forward Ground Slam)
  hit2StartAngle: -2.15, // ~ -123 deg (overhead coiled sword position matching reference diagram)
  hit2EndAngle: 0.85,    // ~ +49 deg (downward ground cleave impact angle)
  hit2LiftFrames: 6,
  hit2HoldFrames: 2,
  hit2StrikeFrames: 5,
  hit2ImpactLockFrames: 7,
  hit2LockFrames: 7,
  hit2RecoveryFrames: 12,
  hit2Damage: 48,
  hit2Knockback: 10.5,
  hit2LaunchImpulse: 6.0, // Upward loft impulse launching enemy on impact
  hit2LungeSpeed: 8.0,
  hit2ArcAngle: (210 * Math.PI) / 180,
  hit2HitPauseFrames: 9,
  hit2HitStunFrames: 16,


  // ──────────────────────────────────────────
  // Skill 1: Prosthetic Arm Cannon & Repeating Crossbow
  // ──────────────────────────────────────────
  enableArmCannon: true,        // Master toggle for Skill 1 (Prosthetic Arm Cannon & Repeating Crossbow)
  enableCannon: true,           // Alias toggle for Arm Cannon
  enableSkill1: true,           // Alias toggle for Skill 1
  cannonCooldownMax: 420, // 7.0s
  cannonDamage: 95,
  cannonSweetSpotDamage: 135,
  cannonSweetSpotRadius: 55,
  cannonRecoil: 12.0,
  crossbowBolts: 5,
  crossbowBoltDamage: 12,
  crossbowBoltSpeed: 16.0,
  crossbowSlowMultiplier: 0.70,
  crossbowSlowDuration: 90, // 1.5s

  // ──────────────────────────────────────────
  // Skill 2: Iron Cyclone / Cleaving Rush
  // ──────────────────────────────────────────
  enableCyclone: true,          // Master toggle for Skill 2 (Iron Cyclone / Cleaving Rush)
  enableIronCyclone: true,      // Alias toggle for Iron Cyclone
  enableSkill2: true,           // Alias toggle for Skill 2
  cycloneCooldownMax: 540, // 9.0s
  cycloneDuration: 30,     // 0.5s spin
  cycloneDamage: 40,
  cycloneReach: 92,
  cycloneVacuumPullForce: 3.5,

  // ──────────────────────────────────────────
  // Ultimate Skill: Awakening of the Beast (Berserker Armor)
  // ──────────────────────────────────────────
  enableBerserkerArmor: true,   // Master toggle for Ultimate (Berserker Armor Awakening)
  enableBerserker: true,        // Alias toggle for Berserker Armor
  enableUltimate: true,         // Alias toggle for Ultimate
  berserkerCooldownMax: 1800, // 30.0s
  berserkerDuration: 600,     // 10.0s (600 frames)
  berserkerSpeedMultiplier: 1.40,
  berserkerAttackSpeedMultiplier: 1.30,
  berserkerDamageMultiplier: 1.25,
  berserkerLifestealRate: 0.35, // Rule 27 healthbar-only vampirism
  berserkerSpikeDamage: 20,
  berserkerSpikeHeal: 25,
  eclipseSeveranceDamage: 165
};
