// ─────────────────────────────────────────────
// Yuta Okkotsu — Special Grade Sorcerer Config
// ─────────────────────────────────────────────
export const yutaConfig = {
  // Passive: Reverse Cursed Technique (RCT) & Passive Regeneration
  regenRate: 0.03,                         // HP restored per frame passively
  rctRevivalHpThreshold: 0.05,             // Triggers RCT revival when HP drops to 5% or below
  rctRevivalHealPercent: 0.15,             // Percentage of max HP restored upon RCT revival
  rctRevivalDuration: 150,                 // Frames the revival heal process lasts (2.5 seconds at 60fps)
  rctRevivalCooldown: 99999,               // Cooldown before RCT revival can trigger again (once per match)

  // Teleport Dodge / Evade Mechanic
  teleportDodgeChance: 0.30,               // 30% chance to teleport dodge incoming attacks
  teleportDodgeCooldown: 90,               // Frames (1.5 seconds) between teleport dodges
  teleportDodgeDistance: 85,               // Distance teleported on dodge

  // Basic Attack: Katana Melee
  meleeCooldown: 50,                       // Frames between katana strikes
  meleeRange: 70,                          // Katana blade length reach distance in pixels
  meleeDamage: 15,                         // Base damage per katana swing
  meleeArc: Math.PI * 0.75,                // 135-degree frontal arc radius cone for multi-enemy cleave

  // Defensive / Counter Mechanic: Parry & Guard Stance
  parryThreatRadius: 180,                  // Detection radius in pixels for incoming projectile threats
  parryMeleeThreatRadius: 120,             // Detection radius in pixels for incoming melee threats
  parryAnticipationDuration: 45,           // Frames to raise guard posture when threat is detected
  parryGuardDuration: 90,                  // Frames to hold block pose after parrying an attack
  parryActiveChance: 0.90,                 // Probability (0-1) of parrying while actively guarding
  parryPassiveChance: 0.90,                // Probability (0-1) of parrying passively when not guarding
  parryChancePerStack: 0.05,               // +5% bonus parry probability per triggered Flurry / Thin Ice Breaker counter-attack stack
  maxParryStacks: 5,                        // Maximum parry mastery stacks (+25% bonus parry chance cap)

  // Special Mechanic: Phantom Flurry (Parry Counterattack)
  flurryParryMin: 2,                       // Minimum successful parries required to activate Flurry
  flurryParryMax: 2,                       // Maximum random target threshold for Flurry activation
  flurryHits: 7,                           // Number of rapid teleport slashes in Flurry execution
  flurryDamage: 15,                         // Damage per slash during Flurry
  flurryHitInterval: 7,                    // Frames delay between each Flurry slash

  // Copied Techniques (Ranged Skill Cycle)
  cursedSpeechRadius: 150,                 // Impact shockwave radius in pixels for "DON'T MOVE!"
  cursedSpeechFreezeTime: 45,              // Frames enemies are frozen in place (0.75 seconds)
  thinIceBreakerDamage: 25,                // Damage dealt by Thin Ice Breaker spatial distortion
  thinIceBreakerSpeed: 25,                 // Speed of Thin Ice Breaker projectile

  // Summon Companion: Rika Orimoto
  rikaMaxHp: 500,                          // Maximum health pool when summoned
  rikaRadius: 30,                          // Physical body collision radius for Rika in pixels
  rikaCooldown: 600,                       // Cooldown between Rika actions/manifestations (frames)
  rikaSummonHpThreshold: 0.50,             // Triggers Rika summon for help when Yuta reaches 50% HP or lower
  rikaSummonChargeDuration: 30,            // Channeling/pause duration when Yuta calls Rika (frames)
  rikaAriseDuration: 45,                  // Paused load/arise duration when Rika emerges (180 frames = 3.0 seconds)
  rikaDuration: 1000,                      // Frames Rika stays active when summoned (60 frames = 1 second)
  rikaSpeedMultiplier: 1.8,                // Movement speed multiplier relative to Yuta's base speed
  rikaDamage: 25,                          // Physical damage dealt per attack tick by Rika
  rikaAttackRate: 30,                      // Frames between Rika's attacks (90 frames = 1.5s at 60fps)

  // Rika Full Emergence (#1) & Vengeful Death Dispersion (#8) Config Tuning
  rikaEmergenceDamage: 25,                 // AOE damage dealt when Rika completes full emergence (#1)
  rikaEmergenceRadius: 250,                // AOE blast radius in pixels for Full Emergence (#1)
  rikaEmergenceKnockback: 8,               // Outward radial knockback force on Full Emergence (#1)
  rikaEmergenceHitStun: 15,                // Hitstun duration (frames) applied by Full Emergence (#1)

  rikaHitKnockback: 16,                    // Physical smash bounce impulse applied to enemy targets hit by Rika
  rikaHitRecoil: 6,                        // Equal-and-opposite physical bounce force applied back onto Rika
  rikaHitStun: 12,                         // Hitstun duration (frames) applied to targets smashed by Rika

  rikaDeathExplosionDamage: 35,            // AOE damage dealt when Rika's shell shatters on death (#8)
  rikaDeathExplosionRadius: 280,           // AOE blast radius in pixels for Vengeful Death Dispersion (#8)
  rikaDeathExplosionKnockback: 10,          // Outward radial knockback force on Death Dispersion (#8)
  rikaDeathExplosionHitStun: 20,           // Hitstun duration (frames) applied by Death Dispersion (#8)

  // Ultimate Skill: Domain Expansion — Authentic Mutual Love
  domainCooldown: 1300,                     // Cooldown before 2nd domain can trigger (~13 seconds)
  domainHpThreshold: 0.25,                 // Triggers Yuta's Domain Expansion and Rika re-summon at 25% HP
  domainMaxUses: 2,                        // Max number of Domain Expansion activations per round (allows 2 uses)
  domainChargeMax: 90,                     // Channeling duration before domain opens (1.5 seconds)
  domainDuration: 800,                     // Frames domain stays active (~6.67 seconds at 60fps)
  domainRadius: 350,                       // Radius of the domain boundary in pixels
  domainCooldownReduction: 0.8,            // Technique cooldown reduction ratio inside domain (80% faster)
  domainRctHealRate: 0.50,                 // Accelerated Reverse Cursed Technique (RCT) healing rate inside domain
  domainRikaRegenMultiplier: 1.2,          // 2x RCT regen multiplier inside domain while Rika is alive
  domainRikaDamageMultiplier: 2.0,         // 1.5x damage dealt multiplier inside domain while Rika is alive
  domainSwordRows: 4,                      // Sword grid rows (optimized for 60 FPS)
  domainSwordCols: 5,                      // Sword grid columns (optimized for 60 FPS)

  //----------------------------------AUDIO CONFIG-----------------------------------------//

  // Basic Attack: Katana Swing
  katanaSwingSound: 'Assets/Sound Effects/Attacks/swordswing.mp3',
  katanaSwingVolume: 0.7,
  katanaSwingDelay: 0,

  // Summon Companion: Rika Orimoto
  comeRikaSound: 'Assets/Sound Effects/Skills/comerika.mp3',
  comeRikaVolume: 2.5,
  comeRikaDelay: 0,
  comeRikaLeadTime: 90,                  // Frames before Rika emerges to play "Come, Rika!"

  rikaAppearanceSound: 'Assets/Sound Effects/Skills/rikaAppearance1.mp3',
  rikaAppearanceVolume: 2.5,
  rikaAppearanceDelay: 0,

  rikaAttackSound: 'Assets/Sound Effects/Skills/backstab.mp3',
  rikaAttackVolume: 0.8,
  rikaAttackDelay: 0,

  rikaGroundSmashSound: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
  rikaGroundSmashVolume: 1.5,
  rikaGroundSmashDelay: 0,

  rikaGroundTrembleSound: 'Assets/Sound Effects/SkillEffects/groundTremble.mp3',
  rikaGroundTrembleVolume: 1.8,
  rikaGroundTrembleDelay: 0,

  rikaNoises: [
    'Assets/Sound Effects/Attacks/rikanoise1.mp3',
    'Assets/Sound Effects/Attacks/rikanoise2.mp3',
    'Assets/Sound Effects/Attacks/rikanoise3.mp3'
  ],
  rikaNoiseVolume: 1.5,
  rikaNoiseDelay: 0,
  rikaNoiseCooldown: 25,                 // Cooldown in frames between Rika attack roars
  rikaNoiseChance: 0.35,

  // Thin Ice Breaker
  thinIceBreakerSound: 'Assets/Sound Effects/Skills/thin-ice-breaker.mp3',
  thinIceBreakerVolume: 1.5,
  thinIceBreakerDelay: 0,
  thinIceBreakerMaxDuration: 1200, // Stop playback after 1000ms

  thinIceBreakerNoiseSound: 'Assets/Sound Effects/Skills/yuta-thin-ice-breaker-noise.mp3',
  thinIceBreakerNoiseVolume: 1.5,
  thinIceBreakerNoiseDelay: 0,
  thinIceBreakerNoiseChance: 0.35,
  thinIceBreakerNoiseMaxDuration: 750, // Stop voice line after 750ms

  // Ultimate: Domain Expansion
  domainChannelSound: 'Assets/Sound Effects/Skills/yutadomainexpansion.mp3',
  domainChannelVolume: 3.5,
  domainChannelDelay: 0,

  domainDeploySound: 'Assets/Sound Effects/Skills/gojodomainexpansion.mp3',
  domainDeployVolume: 3.5,
  domainDeployDelay: 0,

  // Phantom Flurry Counter
  phantomFlurryNoiseSound: 'Assets/Sound Effects/Skills/yuta-flurry-noise.mp3',
  phantomFlurryNoiseVolume: 2.0,
  phantomFlurryNoiseDelay: 0,
  phantomFlurryNoiseChance: 0.35,
};
