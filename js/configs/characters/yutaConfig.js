// ─────────────────────────────────────────────
// Yuta Okkotsu — Special Grade Sorcerer Config
// ─────────────────────────────────────────────
export const yutaConfig = {
  assets: {
    hair: 'Assets/model/yuta/Yuta-hair.png',
    pixelSkin: 'Assets/model/yuta/Yuta-Pixel-Skin.png',
    bossMap: 'Assets/model/yuta/Yuta-bossmap.png',
    domainOverlay: 'Assets/Overlays/Yuta-domain-overlay.png',
    loveBeam: 'Assets/model/yuta/Love_beam/Love_beam-b.png',
    loveBeamOut: 'Assets/model/yuta/love_beam_out/love_beam_out-b.png',
    loveBeamWindup: 'Assets/model/yuta/Love_beam_windup/Love_beam_windup-b.png',
  },

  name: 'Yuta',
  displayName: 'Yuta',
  grade: 'SS',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)
  // ── Base Attributes ──
  hp: 200,
  speed: 5.8,
  moveSpeed: 5.8,
  r: 25,
  radius: 25,
  color: '#EEEEEE', // Soft Silver / White
  themeColor: '#FF1493', // Cursed Pink theme
  startX: 400,
  startY: 250,
  startVx: 1.2,
  startVy: 1.0,
  damage: 8,
  cooldown: 100,
  projectileSpeedMultiplier: 3.0,
  ability: 'Copy & Rika',
  bossTitle: 'The Bush Camper',
  title: 'The Bush Camper',
  desc: 'Summons Rika to assist Yuta in fight and uses Authentic Mutual Love domain.',

  // Passive: Reverse Cursed Technique (RCT) & Passive Regeneration
  enableRCT: true,                         // Master toggle for Reverse Cursed Technique
  regenRate: 0.02,                         // HP restored per frame passively (Yuta alone: 1.2 HP/s)
  rikaActiveRegenRate: 0.06,               // Base RCT healing rate per frame when Rika is active outside domain (~3.6 HP/s)
  rikaActiveRegenMultiplier: 0.2,         // Regen multiplier applied when Rika is active outside domain
  rikaActiveDamageMultiplier: 1.50,        // Damage multiplier applied when Rika is active outside domain
  rctRevivalHpThreshold: 0.05,             // Triggers RCT revival when HP drops to 5% or below
  rctRevivalHealPercent: 0.15,             // Percentage of max HP restored upon RCT revival
  rctRevivalDuration: 150,                 // Frames the revival heal process lasts (2.5 seconds at 60fps)
  rctRevivalCooldown: 99999,               // Cooldown before RCT revival can trigger again (once per match)

  // Teleport Dodge / Evade Mechanic
  enableTeleportDodge: true,               // Master toggle for Teleport Dodge / Evade Mechanic
  teleportDodgeChance: 0.30,               // 30% chance to teleport dodge incoming attacks
  teleportDodgeCooldown: 90,               // Frames (1.5 seconds) between teleport dodges
  teleportDodgeDistance: 85,               // Distance teleported on dodge

  // Basic Attack: Katana Melee
  enableKatanaMelee: true,                 // Master toggle for Basic Attack: Katana Melee
  enableMeleeCombo: true,                  // Enables 3-hit 5-phase cursed katana combo
  meleeCooldown: 34,                       // Recovery frames between full combo chains (reduced from 100 for fluid flow)
  meleeRange: 75,                          // Katana blade reach distance in pixels (matching blade scale)
  meleeDamage: 14,                         // Base damage per katana swing (fallback)
  meleeArc: Math.PI * 0.85,                // ~153-degree frontal arc cone for multi-enemy cleaves
  meleeKnockback: 4.5,                     // Outward push force on katana melee strike
  meleeHitStun: 14,                        // Hit stun frames on katana melee strike
  weaponOffsetY: 4.5,                      // Y-offset shift positioning hands & katana lower on Yuta's body/chest
  comboResetFrames: 85,                    // Frames window before combo resets back to Hit 1
  swordTremorIntensity: 2.2,               // Screen & blade tremor amplitude (px) during impact lock (Rule 30)

  // ── Hit 1: Cursed Horizontal Cross Cleave (Midsection Cleave & Impact Lock) ──
  hit1LiftFrames: 7,                       // Anticipation coil lift
  hit1HoldFrames: 2,                       // Poised hold at apex
  hit1StrikeFrames: 5,                     // Hypersonic cleave stroke
  hit1ImpactLockFrames: 5,                 // Impact lock: blade latches at cleave plane with zero velocity
  hit1RecoveryFrames: 9,                   // Extraction & recovery settle
  hit1HitPauseFrames: 3,                   // Contact freeze-frame on target
  hit1HitStunFrames: 12,                   // Hitstun on target
  hit1LungeSpeed: 6.0,                     // Forward lunging momentum step
  hit1Damage: 14,                          // Damage on Hit 1
  hit1Knockback: 4.5,                      // Horizontal push force
  hit1ImpactShake: 4.0,                    // Screenshake intensity

  // ── Hit 2: Rising Cursed Crescent Scoop (Upward Diagonal Scoop & Apex Lock) ──
  hit2LiftFrames: 6,
  hit2HoldFrames: 2,
  hit2StrikeFrames: 5,
  hit2ImpactLockFrames: 6,
  hit2RecoveryFrames: 10,
  hit2HitPauseFrames: 3,
  hit2HitStunFrames: 14,
  hit2LungeSpeed: 6.8,
  hit2Damage: 18,
  hit2Knockback: 6.5,
  hit2ImpactShake: 5.5,

  // ── Hit 3: Two-Handed Cursed Overhead Execution Chop (Decapitation Finisher) ──
  hit3LiftFrames: 8,
  hit3HoldFrames: 3,
  hit3StrikeFrames: 6,
  hit3ImpactLockFrames: 8,
  hit3RecoveryFrames: 14,
  hit3HitPauseFrames: 4,
  hit3HitStunFrames: 18,
  hit3LungeSpeed: 8.5,
  hit3Damage: 26,
  hit3Knockback: 9.0,
  hit3ImpactShake: 8.0,

  // Defensive / Counter Mechanic: Parry & Guard Stance
  enableParry: true,                       // Master toggle for Parry & Guard Stance
  parryThreatRadius: 180,                  // Detection radius in pixels for incoming projectile threats
  parryMeleeThreatRadius: 120,             // Detection radius in pixels for incoming melee threats
  parryAnticipationDuration: 45,           // Frames to raise guard posture when threat is detected
  parryGuardDuration: 90,                  // Frames to hold block pose after parrying an attack
  parryActiveChance: 0.50,                 // Probability (0-1) of parrying while actively guarding
  parryPassiveChance: 0.50,                // Probability (0-1) of parrying passively when not guarding
  parryChancePerStack: 0.05,               // +5% bonus parry probability per triggered Flurry / Thin Ice Breaker counter-attack stack
  maxParryStacks: 5,                        // Maximum parry mastery stacks (+25% bonus parry chance cap)

  // Special Mechanic: Phantom Flurry (Parry Counterattack & Basic Attack Combo)
  enablePhantomFlurry: true,               // Master toggle for Phantom Flurry
  flurryParryMin: 5,                       // Minimum successful parries required to activate Flurry
  flurryParryMax: 5,                       // Maximum random target threshold for Flurry activation
  flurryBasicHitsRequired: 10,              // Number of successful basic attack hits required to activate Flurry
  flurryHits: 7,                           // Number of rapid teleport slashes in Flurry execution
  flurryDamage: 8,                         // Damage per slash during Flurry
  flurryHitInterval: 7,                    // Frames delay between each Flurry slash
  flurrySlashFrames: 14,                   // Frames duration for each flurry katana swing animation
  flurryLiftFrames: 2,                     // Anticipation coil frames before hypersonic strike
  flurryStrikeFrames: 5,                   // Hypersonic cleave stroke frames
  flurryImpactLockFrames: 3,               // Impact lock frames (kissaki embedded, enemy in hit-pause)
  flurryRecoveryFrames: 4,                 // Dynamic tail-to-tip eraser wipe & recovery frames
  flurryHitPauseFrames: 10,                // Stasis pause duration applied to enemy upon weapon collision (Escanor mechanic)
  flurryKnockback: 0.0,                    // Outward knockback push force during flurry slashes (0 = no push)

  // Copied Techniques (Ranged Skill Cycle)
  enableCopiedTechniques: true,            // Master toggle for Copied Techniques
  cursedSpeechRadius: 150,                 // Impact shockwave radius in pixels for "DON'T MOVE!"
  cursedSpeechFreezeTime: 45,              // Frames enemies are frozen in place (0.75 seconds)
  thinIceBreakerDamage: 5,                // Damage dealt by Thin Ice Breaker spatial distortion
  thinIceBreakerSpeed: 25,                 // Speed of Thin Ice Breaker projectile
  thinIceBreakerRange: 250,                // Effective range of Thin Ice Breaker spatial blast
  thinIceBreakerKnockback: 35,             // Extreme knockback blast force applied on Thin Ice Breaker hit

  // Summon Companion: Rika Orimoto
  enableRika: true,                        // Master toggle for Summon Rika Orimoto
  rikaMaxHp: 250,                          // Maximum health pool when summoned
  rikaRadius: 40,                          // Physical body collision radius for Rika in pixels
  rikaSummonHpThreshold: 0.70,             // Triggers Rika summon for help when Yuta reaches 50% HP or lower
  rikaRechargeHpRatio: 0.20,               // HP ratio in damage required to re-summon Rika (20% of max HP)
  rikaSummonChargeDuration: 30,            // Channeling/pause duration when Yuta calls Rika (frames)
  rikaAriseDuration: 45,                  // Paused load/arise duration when Rika emerges (180 frames = 3.0 seconds)
  rikaDuration: 999999,                    // Rika stays active indefinitely as long as she is alive (HP > 0)
  rikaSpeedMultiplier: 1.3,                // Movement speed multiplier relative to Yuta's base speed
  rikaDamage: 20,                          // Physical damage dealt per attack tick by Rika
  rikaAttackRate: 30,                      // Frames between Rika's attacks (90 frames = 1.5s at 60fps)

  // Rika Full Emergence (#1) & Vengeful Death Dispersion (#8) Config Tuning
  rikaEmergenceDamage: 10,                 // AOE damage dealt when Rika completes full emergence (#1)
  rikaEmergenceRadius: 400,                // AOE blast radius in pixels for Full Emergence (#1)
  rikaEmergenceKnockback: 0,               // Outward radial knockback force on Full Emergence (#1)
  rikaEmergenceHitStun: 15,                // Hitstun duration (frames) applied by Full Emergence (#1)

  rikaHitKnockback: 0,                    // Physical smash bounce impulse applied to enemy targets hit by Rika
  rikaHitRecoil: 0,                        // Equal-and-opposite physical bounce force applied back onto Rika (0 = no recoil push)
  rikaHitStun: 12,                         // Hitstun duration (frames) applied to targets smashed by Rika

  rikaDeathExplosionDamage: 35,            // AOE damage dealt when Rika's shell shatters on death (#8)
  rikaDeathExplosionRadius: 280,           // AOE blast radius in pixels for Vengeful Death Dispersion (#8)
  rikaDeathExplosionKnockback: 0,          // Outward radial knockback force on Death Dispersion (#8)
  rikaDeathExplosionHitStun: 20,           // Hitstun duration (frames) applied by Death Dispersion (#8)

  // Ultimate Skill: Domain Expansion — Authentic Mutual Love
  enableDomain: true,                      // Master toggle for Ultimate: Domain Expansion
  domainCooldown: 0,                        // Domain is based on HP lost (no cooldown timer!)
  domainHpThreshold: 0.50,                 // 1st Domain Expansion trigger threshold (60% HP)
  domain2HpDamageRequired: 0.75,           // 2nd Domain requirement: Yuta MUST take 20% max HP damage AFTER 1st domain ends!
  domainMaxUses: 2,                        // Max number of Domain Expansion activations per round (allows 2 uses)
  domainChargeMax: 50,                     // Fast snappy channeling duration before domain opens (~0.83s at 60fps)
  domainClashChargeSpeed: 2,               // 2x charge acceleration when clashing inside another domain (~25 frames / 0.41s deploy)
  domainDuration: 800,                     // Frames domain stays active (~6.67 seconds at 60fps)
  domainRadius: 350,                       // Radius of the domain boundary in pixels
  domainCooldownReduction: 0.8,            // Technique cooldown reduction ratio inside domain (80% faster)
  domainRctHealRate: 0.90,                 // Accelerated Reverse Cursed Technique (RCT) healing rate inside domain
  domainRegenMultiplier: 0.2,              // Domain expansion baseline RCT regen multiplier (when Rika is absent)
  domainRikaRegenMultiplier: 0.2,          // Total RCT regen multiplier inside domain while Rika is alive (1.50 * 2.0 = 3.0)
  domainRikaDamageMultiplier: 1.5,         // Total damage dealt multiplier inside domain while Rika is alive (1.50 * 2.0 = 3.0)
  domainSwordRows: 4,                      // Sword grid rows (optimized for 60 FPS)
  domainSwordCols: 5,                      // Sword grid columns (optimized for 60 FPS)
  domainOverlayAlpha: 0.75,                // Semi-transparent opacity for Yuta domain overlay image (0.75 = 75% opacity)

  // Ultimate Skill: Pure Love Beam (Sacrificial Nuke)
  enablePureLoveBeam: true,                // Master toggle for Ultimate: Pure Love Beam
  pureLoveBeamHpThreshold: 0.45,           // HP ratio required to trigger beam (15%)
  pureLoveBeamCooldown: 1200,              // Cooldown frames (20 seconds) before beam can be used again
  pureLoveBeamChargeFrames: 120,            // Channeling duration before firing (1.5 seconds)
  pureLoveBeamChannelTurnRate: 0.030,      // Turn rate during beam charge/channeling (smooth tracking, reduced slightly for heavier feel)
  pureLoveBeamDuration: 450,               // Frames the beam stays active (3 seconds)
  pureLoveBeamActiveDuration: 350,         // Alias matching pureLoveBeamDuration for skill and HUD consistency
  pureLoveBeamDamagePerTick: 5,           // Rapid multi-hit damage
  pureLoveBeamWidth: 200,                  // Massive beam radius/width
  pureLoveBeamLength: 2500,                // Screen spanning length
  pureLoveBeamKnockback: 2,                // Outward push per tick
  pureLoveBeamSlowMultiplier: 0.20,        // Speed reduction multiplier applied during beam recovery phase
  pureLoveBeamStunDuration: 50,           // Recovery stun duration frames after beam exposure
  pureLoveBeamShakeIntensity: 6,            // Arena shake intensity while beam is active (decays in final 30%)
  pureLoveBeamDamageStackPerTick: 0.2,      // Permanent base damage increase for Yuta per beam hit tick
  pureLoveBeamLifestealPct: 0.5,            // Lifesteal percentage (0.1 = 10% of damage dealt) recovered as HP per beam hit tick


  // ─────────────────────────────────────────────
  // Audio & Sound Effects Configuration
  // ─────────────────────────────────────────────
  sounds: {
    katanaSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    comeRika: 'Assets/Sound Effects/Skills/comerika.mp3',
    rikaAppearance: 'Assets/Sound Effects/Skills/rikaAppearance1.mp3',
    rikaAttack: 'Assets/Sound Effects/Skills/backstab.mp3',
    rikaGroundSmash: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
    rikaGroundTremble: 'Assets/Sound Effects/SkillEffects/groundTremble.mp3',
    rikaDeath: 'Assets/Sound Effects/Skills/thin-ice-breaker.mp3',
    rikaNoises: [
      'Assets/Sound Effects/Attacks/rikanoise1.mp3',
      'Assets/Sound Effects/Attacks/rikanoise2.mp3',
      'Assets/Sound Effects/Attacks/rikanoise3.mp3'
    ],
    thinIceBreaker: 'Assets/Sound Effects/Skills/thin-ice-breaker.mp3',
    thinIceBreakerNoise: 'Assets/Sound Effects/Skills/yuta-thin-ice-breaker-noise.mp3',
    domainChannel: 'Assets/Sound Effects/Skills/yutadomainexpansion.mp3',
    domainDeploy: 'Assets/Sound Effects/Skills/gojodomainexpansion.mp3',
    phantomFlurryNoise: 'Assets/Sound Effects/Skills/yuta-flurry-noise.mp3',
    pureLoveBeamCharge: 'Assets/Sound Effects/Skills/rikaAppearance.mp3',
    pureLoveBeamFire: 'Assets/Sound Effects/Skills/yuta-lovebeam-fires.mp3',
    pureLoveBeamBackground: 'Assets/Sound Effects/Skills/yuta-lovebeam-background.mp3',
  },
  soundVolumes: {
    katanaSwing: 0.7,
    comeRika: 2.0,
    rikaAppearance: 2.5,
    rikaAttack: 0.8,
    rikaGroundSmash: 1.5,
    rikaGroundTremble: 1.8,
    rikaDeath: 0.0,
    rikaNoise: 0.80,
    thinIceBreaker: 1.5,
    thinIceBreakerNoise: 0.0,
    domainChannel: 3.5,
    domainDeploy: 3.5,
    phantomFlurryNoise: 2.0,
    pureLoveBeamCharge: 3.0,
    pureLoveBeamFire: 3.5,
    pureLoveBeamBackground: 2.0,
  },

  // ── Backward Compatibility Getters & Setters for Legacy Flat Properties ──
  get katanaSwingSound() { return this.sounds.katanaSwing; },
  set katanaSwingSound(v) { this.sounds.katanaSwing = v; },
  get katanaSwingVolume() { return this.soundVolumes.katanaSwing; },
  set katanaSwingVolume(v) { this.soundVolumes.katanaSwing = v; },
  katanaSwingDelay: 0,

  get comeRikaSound() { return this.sounds.comeRika; },
  set comeRikaSound(v) { this.sounds.comeRika = v; },
  get comeRikaVolume() { return this.soundVolumes.comeRika; },
  set comeRikaVolume(v) { this.soundVolumes.comeRika = v; },
  comeRikaDelay: 0,
  comeRikaLeadTime: 90,

  get rikaAppearanceSound() { return this.sounds.rikaAppearance; },
  set rikaAppearanceSound(v) { this.sounds.rikaAppearance = v; },
  get rikaAppearanceVolume() { return this.soundVolumes.rikaAppearance; },
  set rikaAppearanceVolume(v) { this.soundVolumes.rikaAppearance = v; },
  rikaAppearanceDelay: 0,
  rikaAppearanceChance: 0.95,

  get rikaAttackSound() { return this.sounds.rikaAttack; },
  set rikaAttackSound(v) { this.sounds.rikaAttack = v; },
  get rikaAttackVolume() { return this.soundVolumes.rikaAttack; },
  set rikaAttackVolume(v) { this.soundVolumes.rikaAttack = v; },
  rikaAttackDelay: 0,

  get rikaGroundSmashSound() { return this.sounds.rikaGroundSmash; },
  set rikaGroundSmashSound(v) { this.sounds.rikaGroundSmash = v; },
  get rikaGroundSmashVolume() { return this.soundVolumes.rikaGroundSmash; },
  set rikaGroundSmashVolume(v) { this.soundVolumes.rikaGroundSmash = v; },
  rikaGroundSmashDelay: 0,

  get rikaGroundTrembleSound() { return this.sounds.rikaGroundTremble; },
  set rikaGroundTrembleSound(v) { this.sounds.rikaGroundTremble = v; },
  get rikaGroundTrembleVolume() { return this.soundVolumes.rikaGroundTremble; },
  set rikaGroundTrembleVolume(v) { this.soundVolumes.rikaGroundTremble = v; },
  rikaGroundTrembleDelay: 0,

  get rikaDeathSound() { return this.sounds.rikaDeath; },
  set rikaDeathSound(v) { this.sounds.rikaDeath = v; },
  get rikaDeathVolume() { return this.soundVolumes.rikaDeath; },
  set rikaDeathVolume(v) { this.soundVolumes.rikaDeath = v; },
  rikaDeathDelay: 0,

  get rikaNoises() { return this.sounds.rikaNoises; },
  set rikaNoises(v) { this.sounds.rikaNoises = v; },
  get rikaNoiseVolume() { return this.soundVolumes.rikaNoise; },
  set rikaNoiseVolume(v) { this.soundVolumes.rikaNoise = v; },
  rikaNoiseDelay: 0,
  rikaNoiseCooldown: 25,
  rikaNoiseChance: 0.35,

  get thinIceBreakerSound() { return this.sounds.thinIceBreaker; },
  set thinIceBreakerSound(v) { this.sounds.thinIceBreaker = v; },
  get thinIceBreakerVolume() { return this.soundVolumes.thinIceBreaker; },
  set thinIceBreakerVolume(v) { this.soundVolumes.thinIceBreaker = v; },
  thinIceBreakerDelay: 0,
  thinIceBreakerMaxDuration: 1200,

  get thinIceBreakerNoiseSound() { return this.sounds.thinIceBreakerNoise; },
  set thinIceBreakerNoiseSound(v) { this.sounds.thinIceBreakerNoise = v; },
  get thinIceBreakerNoiseVolume() { return this.soundVolumes.thinIceBreakerNoise; },
  set thinIceBreakerNoiseVolume(v) { this.soundVolumes.thinIceBreakerNoise = v; },
  thinIceBreakerNoiseDelay: 0,
  thinIceBreakerNoiseChance: 0.35,
  thinIceBreakerNoiseMaxDuration: 750,

  get domainChannelSound() { return this.sounds.domainChannel; },
  set domainChannelSound(v) { this.sounds.domainChannel = v; },
  get domainChannelVolume() { return this.soundVolumes.domainChannel; },
  set domainChannelVolume(v) { this.soundVolumes.domainChannel = v; },
  domainChannelDelay: 0,

  get domainDeploySound() { return this.sounds.domainDeploy; },
  set domainDeploySound(v) { this.sounds.domainDeploy = v; },
  get domainDeployVolume() { return this.soundVolumes.domainDeploy; },
  set domainDeployVolume(v) { this.soundVolumes.domainDeploy = v; },
  domainDeployDelay: 0,

  get phantomFlurryNoiseSound() { return this.sounds.phantomFlurryNoise; },
  set phantomFlurryNoiseSound(v) { this.sounds.phantomFlurryNoise = v; },
  get phantomFlurryNoiseVolume() { return this.soundVolumes.phantomFlurryNoise; },
  set phantomFlurryNoiseVolume(v) { this.soundVolumes.phantomFlurryNoise = v; },
  phantomFlurryNoiseDelay: 0,
  phantomFlurryNoiseChance: 0.35,

  get pureLoveBeamChargeSound() { return this.sounds.pureLoveBeamCharge; },
  set pureLoveBeamChargeSound(v) { this.sounds.pureLoveBeamCharge = v; },
  get pureLoveBeamChargeVolume() { return this.soundVolumes.pureLoveBeamCharge; },
  set pureLoveBeamChargeVolume(v) { this.soundVolumes.pureLoveBeamCharge = v; },
  pureLoveBeamChargeOffset: 0.0,

  get pureLoveBeamFireSound() { return this.sounds.pureLoveBeamFire; },
  set pureLoveBeamFireSound(v) { this.sounds.pureLoveBeamFire = v; },
  get pureLoveBeamFireVolume() { return this.soundVolumes.pureLoveBeamFire; },
  set pureLoveBeamFireVolume(v) { this.soundVolumes.pureLoveBeamFire = v; },
  pureLoveBeamFireOffset: 0.15,

  get pureLoveBeamBackgroundSound() { return this.sounds.pureLoveBeamBackground; },
  set pureLoveBeamBackgroundSound(v) { this.sounds.pureLoveBeamBackground = v; },
  get pureLoveBeamBackgroundVolume() { return this.soundVolumes.pureLoveBeamBackground; },
  set pureLoveBeamBackgroundVolume(v) { this.soundVolumes.pureLoveBeamBackground = v; },
};
