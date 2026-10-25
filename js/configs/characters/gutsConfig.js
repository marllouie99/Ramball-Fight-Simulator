// ─────────────────────────────────────────────
// GUTS — THE BLACK SWORDSMAN CONFIG
// Anime & Dark Fantasy (Berserk)
// Wielder of the Dragon Slayer & Berserker Armor
// ─────────────────────────────────────────────

export const gutsConfig = {
  name: 'Guts',
  displayName: 'GUTS',
  grade: 'SS',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)
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
  ability: 'Dragon Slayer & Calamity Cleave',
  bossTitle: 'The Black Swordsman',
  title: 'The Struggler',
  desc: 'Wielder of the monstrous 400-pound Dragon Slayer. Slices through fate with the supersonic Calamity Cleave, ejecting golden crescent shockwaves with unyielding poise.',

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
  enableDragonSlayer: 0,     // Master toggle for Basic Attack (Dragon Slayer Sword Swing)
  enableSword: true,            // Alias toggle for Dragon Slayer
  enableMeleeCombo: true,       // Alias toggle
  enableBasicAttack: true,      // Standard alias
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
  // Skill 1: Calamity Cleave Combo (Reference Frames 1–12)
  // Sequence 1 (Frames 1–6): Calamity Cleave & Supersonic Crescent Wave
  //   Frame 1–3: Golden blade ignition & deep backward coil (28f)
  //   Frame 4: Hypersonic screen-wide horizontal flash & forward lunge (9f)
  //   Frame 5: Detached golden crescent wave ejection & follow-through lock (18f)
  //   Frame 6: Twin-ribbon split, discrete ember dissipation & follow-through hold (24f)
  // Sequence 2 (Frames 7–12): Reverse Cleave & Skyward Scoop Finisher
  //   Frame 7: High left coil & inward golden vortex energy surge (18f)
  //   Frames 8–9: Blinding horizontal counter-cleave (5f) -> rising skyward scoop (6f) (11f total - NOT snappy!)
  //   Frames 10–11: Skyward apex impact lock, secondary wave detonation & radiant blade hold (18f)
  //   Frame 12: Poised settle & smooth weighted return to neutral battle stance (24f)
  // ──────────────────────────────────────────
  enableSkill1: true,            // Master toggle for Skill 1
  enableCalamityCleave: true,    // Alias toggle for Calamity Cleave
  skill1CooldownMax: 420,        // 7.0s cooldown
  calamityCooldownMax: 420,

  // Sequence 1 Timing & Combat Values (Frames 1–6)
  calamityWindupFrames: 28,      // Frames 1–3: Frame 2 ready tilt (12f) & Frame 3 deep coil (16f) - smooth buildup
  calamityStrikeFrames: 9,       // Frame 4: Visible, sweeping cleave stroke (smooth cleave, not snappy!)
  calamityLockFrames: 22,        // Frames 5–6: Solid follow-through lock over opposite shoulder (-140°) while Wave 1 flies
  calamityRecoveryFrames: 0,     // 0 recovery frames on Seq 1 so sword angle does NOT reset before Sequence 2 follow-up!
  calamityMeleeDamage: 65,       // Direct point-blank cleave damage
  calamityWaveDamage: 45,        // Ejected travelling crescent wave damage
  calamityKnockback: 11.0,       // Forward knockback impulse
  calamityLungeSpeed: 7.5,       // Forward lunge momentum during strike
  calamityHitPauseFrames: 3,     // Attacker & target impact lock stasis
  calamityHitStunFrames: 3,     // Target hit stun
  calamityWaveSpeed: 10.5,       // Fluid crescent travel speed (px/frame)
  calamityWaveMaxAge: 42,        // Travel lifetime (~440px reach, perfectly synced with Guts' recovery settle)
  calamityWaveWidth: 140,        // Crescent width (px)

  // Sequence 2 Timing & Combat Values (Frames 7–12)
  calamitySeq2WindupFrames: 18,    // Frame 7: High left coil & golden vortex energy surge (never < 16f)
  calamitySeq2StrikeFrames: 9,    // Frames 8–9: Blinding horizontal counter-cleave (5f) -> rising skyward scoop (6f) (11f total - NOT snappy!)
  calamitySeq2LockFrames: 18,      // Frames 10–11: Apex impact lock & radiant blade hold at high-right
  calamitySeq2RecoveryFrames: 24,  // Frame 12: Poised settle back to neutral battle stance
  calamitySeq2MeleeDamage: 85,     // Heavy finisher melee damage
  calamitySeq2WaveDamage: 55,      // Travelling Wave 2 damage
  calamitySeq2Knockback: 13.5,     // Stronger knockback impulse
  calamitySeq2LungeSpeed: 8.5,     // Lunging step momentum
  calamitySeq2HitPauseFrames: 3,  // Impact lock hit pause
  calamitySeq2HitStunFrames: 3,   // Target hit stun
  calamitySeq2WaveSpeed: 12.0,     // Faster secondary wave
  calamitySeq2WaveMaxAge: 45,      // Wave 2 lifetime
  calamitySeq2WaveWidth: 165,      // Wider secondary wave

  // ──────────────────────────────────────────
  // Skill 2: Prosthetic Arm Cannon & Repeating Crossbow
  // ──────────────────────────────────────────
  enableSkill2: 0,              // Master toggle for Skill 2 (0 = off while testing Skill 1)
  enableArmCannon: true,        // Alias toggle for Arm Cannon
  enableCannon: true,           // Alias toggle for Arm Cannon
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
  enableCyclone: 0,             // Master toggle for Skill 2 (Iron Cyclone / Cleaving Rush)
  enableIronCyclone: true,      // Alias toggle for Iron Cyclone
  enableSkill2: 0,              // Alias toggle for Skill 2
  cycloneCooldownMax: 540, // 9.0s
  cycloneDuration: 30,     // 0.5s spin
  cycloneDamage: 40,
  cycloneReach: 92,
  cycloneVacuumPullForce: 3.5,

  // ──────────────────────────────────────────
  // Ultimate Skill: Awakening of the Beast (Berserker Armor)
  // ──────────────────────────────────────────
  enableBerserkerArmor: 0,   // Master toggle for Ultimate (Berserker Armor Awakening)
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
