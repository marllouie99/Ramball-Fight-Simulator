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
  r: 26,
  radius: 30,
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

  // ──────────────────────────────────────────
  // Basic Attack: Split Soul Katana (Shakkontō) — 3-Hit Authentic Combo
  // Structured with explicit phase frame timings (similar to Escanor)
  // ──────────────────────────────────────────
  enableSplitSoulKatana: true,          // Master toggle for Split Soul Katana basic attack combo
  swordRange: 75,                       // Baseline reach in pixels (matches katana blade model & slash arc)
  swordReach: 75,                       // Alias for reach
  swordBladeRadius: 18,                 // Collision half-width radius
  swordCooldown: 100,                   // Attack cooldown between combo chains
  comboResetFrames: 95,                 // Idle frames before combo resets back to Hit 1 (~1.58s)
  swordTremorIntensity: 0.0,            // Micro-tremor amplitude (px) during hit-pause (zeroed per user request)

  // ── Hit 1: The Overhead Strike (Two-Handed Downward Chop & Ground Pin) ──
  hit1LiftFrames: 8,                    // Frames to lift katana into high overhead anticipation coil (~0.13s)
  hit1HoldFrames: 10,                    // Poised hold at overhead apex before snapping down (~0.05s)
  hit1StrikeFrames: 5,                  // Hypersonic downward whip-chop stroke (~0.08s) with power curve
  hit1ImpactLockFrames: 10,              // CANONICAL IMPACT LOCK: Exact frames weapon locks firmly at impact before recovery begins (~0.10s)
  hit1LockFrames: 6,                    // Shorthand alias
  hit1PinFrames: 6,                     // Melee floor/ground pin alias
  hit1GroundPinFrames: 6,               // Alias
  hit1RecoveryFrames: 10,               // Frames for lifting blade from impact lock & settling stance (~0.17s)
  hit1HitPauseFrames: 3,                // Meaty freeze-frame hit-pause on blade contact
  hit1LungeSpeed: 7.0,                  // Forward lunging step momentum speed during the strike
  hit1ArcAngle: (140 * Math.PI) / 180,  // ~140° frontal cleave arc
  hit1Damage: 28,                       // True damage bypassing armor & shields
  hit1Knockback: 6.5,                   // Physical push impulse
  hit1HitStunFrames: 10,                // Hit-stun duration frames
  hit1ImpactShake: 0.0,                 // Zero screen shake on hit
  hit1ImpactShakeDuration: 0,           // Zero screen shake duration in frames

  // ── Hit 2: The Underhand Uppercut (Low Scoop Rising Cleave & Apex Impact Lock) ──
  hit2LiftFrames: 8,                    // Frames to scoop blade low and back (~0.13s)
  hit2HoldFrames: 3,                    // Poised hold in low crouch load (~0.05s)
  hit2StrikeFrames: 6,                  // Hypersonic rising cleave whip stroke (~0.10s)
  hit2ImpactLockFrames: 5,              // CANONICAL IMPACT LOCK: Exact frames blade locks at apex cleave before recovery begins (~0.08s)
  hit2LockFrames: 5,                    // Shorthand alias
  hit2PinFrames: 5,                     // Alias
  hit2GroundPinFrames: 5,               // Alias
  hit2RecoveryFrames: 10,               // Frames for recovery & stance settle (~0.17s)
  hit2HitPauseFrames: 3,                // Meaty freeze-frame hit-pause on impact
  hit2LungeSpeed: 7.5,                  // Forward lunging step momentum speed
  hit2VerticalLift: 4.5,                // Vertical air-kick launch impulse lifting the enemy
  hit2ArcAngle: (150 * Math.PI) / 180,  // ~150° ascending scoop arc
  hit2Damage: 34,                       // True damage bypassing armor & shields
  hit2Knockback: 8.5,                   // Physical push impulse
  hit2HitStunFrames: 14,                // Hit-stun duration frames
  hit2ImpactShake: 0.0,                 // Zero screen shake on hit
  hit2ImpactShakeDuration: 0,           // Zero screen shake duration in frames

  // ── Hit 3: The Spinning Sweep (Full 360° Whirlwind Spin & Sunder Impact Lock) ──
  hit3LiftFrames: 8,                    // Frames to torque blade across the chest (~0.13s)
  hit3HoldFrames: 4,                    // Poised hold in torque load (~0.07s)
  hit3StrikeFrames: 10,                 // Full 360° whirlwind rotation — perfectly paced & visible (~0.37s)
  hit3ImpactLockFrames: 8,              // CANONICAL IMPACT LOCK: Exact frames blade locks near floor before re-sheathing (~0.13s)
  hit3LockFrames: 8,                    // Shorthand alias
  hit3PinFrames: 8,                     // Alias
  hit3GroundPinFrames: 8,               // Alias
  hit3RecoveryFrames: 14,               // Centrifugal follow-through rebound & re-sheath (~0.23s)
  hit3HitPauseFrames: 4,                // Heavy impact freeze-frame hit-pause on impact
  hit3LungeSpeed: 9.0,                  // High-velocity whirlwind forward surge
  hit3ArcAngle: Math.PI * 2,            // Full 360° radial sweep
  hit3Damage: 52,                       // Massive true damage finisher
  hit3Knockback: 16.0,                  // Heavy outward launch knockback
  hit3HitStunFrames: 22,                // Heavy stagger hit-stun frames
  hit3ImpactShake: 0.0,                 // Zero screen shake on hit
  hit3ImpactShakeDuration: 0,           // Zero screen shake duration in frames

  // Soul Wound (Anti-Heal & True DOT)
  soulWoundDuration: 240,               // 4.0s (240 frames)
  soulWoundHealReduction: 0.75,         // 75% reduced healing
  soulWoundTickDamage: 3,               // True damage tick every 30 frames

  // Legacy fallback aliases
  comboHit1Frames: 24,
  comboHit2Frames: 26,
  comboHit3Frames: 30,
  comboHit1Damage: 28,
  comboHit2Damage: 34,
  comboHit3Damage: 52,
  comboHit1Knockback: 6.5,
  comboHit2Knockback: 8.5,
  comboHit3Knockback: 16.0,
  comboHit1Lunge: 6.5,
  comboHit2Lunge: 7.2,
  comboHit3Lunge: 8.5,
  comboHit1Arc: (140 * Math.PI) / 180,
  comboHit2Arc: (150 * Math.PI) / 180,
  comboHit3Arc: Math.PI * 2,

  // Skill 1: Dragon-Bone (Ryūhoku) Kinetic Jet Skewer & Brutal Punch
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
  dragonBonePunchFrames: 18,
  dragonBonePunchDamage: 60,
  dragonBoneLaunchSpeed: 10.0,
  dragonBoneLaunchFrames: 36,
  dragonBoneLaunchTickInterval: 4,
  dragonBoneLaunchTickDamage: 8,
  // Legacy aliases for backward compatibility
  dragonBoneLiftFrames: 0,
  dragonBoneThrowFrames: 18,
  dragonBoneThrowChopAngle: 0.95,
  dragonBoneGroundPinFrames: 0,
  dragonBoneThrowSpeed: 22.0,
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
