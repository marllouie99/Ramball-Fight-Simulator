// ─────────────────────────────────────────────
// Denji (The Chainsaw Devil Hybrid) Character Config
// Chainsaw Man / Public Safety Special Division 4
// ─────────────────────────────────────────────

export const denjiConfig = {
  assets: {
    skin: 'Assets/model/denji/denji-devilform-model-skin.png',
  },
  name: 'Denji',
  displayName: 'Denji',
  bossTitle: 'Chainsaw Man',
  title: 'Chainsaw Man',

  // Baseline Attributes
  hp: 360,
  maxHpRatio: 1.0,
  speed: 6.0,
  moveSpeed: 5.8,
  r: 26,
  radius: 25,
  color: '#EAB308',           // Chainsaw Amber Gold
  themeColor: '#EAB308',
  secondaryColor: '#DC2626',   // Blood Engine Crimson
  accentOrange: '#F97316',     // Spark Orange
  accentDark: '#0F172A',       // Gunmetal Ink
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.0,
  damage: 5,
  cooldown: 24,
  projectileSpeedMultiplier: 1.0,
  ability: 'Chainsaw Devil & "Massacre Engine"',
  desc: 'The Chainsaw Devil. Relentless high-speed berserker entering the arena already fully transformed into his Chainsaw Devil form. Wields 140° Twin Forearm Chainsaw Shreds with 25% lifesteal, Engine Rev Lunges, Extended Chain Cleaves, Pochita Heart Revive, and the Massacre Engine ultimate.',

  // Passive 1: Pochita Heart Ripcord Revive
  enablePochitaRevive: 0,        // Master toggle for Passive 1: Pochita Heart Revive
  maxReviveStocks: 1,               // 1 ripcord revive per round
  reviveHpPercent: 0.50,            // Restores 50% Max HP (180 HP)
  reviveShockwaveRadius: 150,       // Radial blood blast radius on trigger
  reviveShockwaveDamage: 45,        // Radial blast damage
  reviveShockwaveKnockback: 32,     // Repel force
  hybridModeDurationFrames: 720,    // 12.0s Chainsaw Devil Form duration

  // Passive 2: Blood Lust Siphon
  enableBloodSiphon: true,          // Master toggle for Passive 2: Blood Lust Siphon (Lifesteal)
  lifestealRatio: 0.01,             // 25% base chainsaw lifesteal
  bleedingTargetLifestealRatio: 0.01,// 35% lifesteal vs bleeding enemies

  // Passive 3: Hemorrhage & Vascular Rupture
  enableHemorrhage: 0,           // Master toggle for Passive 3: Stacking Bleed & Vascular Rupture
  maxHemorrhageStacks: 6,
  defenseShredPerStack: 0.05,       // 5% defense reduction per stack
  bleedDpsPerStack: 3,              // 3 damage per second per stack
  ruptureDamage: 10,                // Bonus true damage at max stacks

  // Human Form: Street Brawler Combo
  enablePunches: 0,              // Master toggle for Human Form: Street Brawler 3-Hit Combo
  punch1Damage: 2,
  punch2Damage: 2,
  punch3Damage: 2,
  punchReach: 65,
  punchKnockback: 18,

  // Hybrid Form: Continuous 3-Blade Chainsaw Collision Shred
  enableChainsawShred: true,        // Master toggle for Continuous 3-Blade Chainsaw Collision Shred
  shredDamagePerTooth: 3,           // Rapid shred damage per chain tooth collision tick
  shredTickInterval: 5,             // Interval in frames between chain teeth hits (matches animation RPM)
  shredHitPauseFrames: 2,           // Micro hit-pause frames applied to enemy on each tooth strike
  shredArenaShakeIntensity: 6.0,    // Arena / screen shake intensity on each shred tick
  shredAudioLingerFrames: 4,        // Debounce frames (~66ms) to prevent single-frame physics micro-gaps
  shredLoopStartSec: 0.0,           // Start of active grinding loop
  shredLoopEndSec: 4.0,             // Loop end point before natural fade-out (0:04 mark)
  shredTailOffsetSec: 4.0,          // Natural fade-out / wind-down tail start timestamp (0:04)
  sawReach: 75,
  sawHitKnockback: 6,

  // Chainsaw Overheat & Continuous Shred Steam Smoke Effect
  enableChainsawSmoke: true,            // Master toggle for continuous shred steam smoke effect
  enableChainsawOverheatSmoke: true,    // Alias toggle
  continuousShredSmokeStartFrames: 4,   // Frames (~0.06s) after initial shred contact when wisps of steam smoke begin emerging
  continuousShredSmokeRampFrames: 90,   // Frames (~1.5s) continuous shred duration where smoke density steadily scales up
  continuousShredMaxSmokeFrames: 150,   // Frames (~2.5s) continuous shred duration for max steam density and glowing embers
  chainsawSmokeCooldownRate: 2,          // Frame decay per tick when not continuously shredding
  chainsawSmokeMaxParticles: 45,         // Particle array ceiling for 60 FPS performance

  // Multi-Blade Simultaneous Shred Bonus
  enableMultiBladeBonus: true,      // Master toggle for Multi-Blade Simultaneous Shred Bonus
  dualBladeDamageMultiplier: 1.5,   // 1.6x Shred Damage (+60%) when 2 blades connect simultaneously
  tripleBladeDamageMultiplier: 1.5, // 2.4x Shred Damage (+140%) when all 3 blades connect simultaneously
  dualBladeHitPauseBonus: 1,        // +1 frame hit-pause (total 4 frames) on dual blade connection
  tripleBladeHitPauseBonus: 2,      // +2 frames hit-pause (total 5 frames) on triple blade connection

  // Skill 1: Ripcord Engine Rev Lunge
  enableEngineLunge: 1,          // Master toggle for Skill 1: Ripcord Engine Rev Lunge
  lungeCooldown: 1000,               // 4.0s
  lungeWindupFrames: 30,            // Wind-up / engine rev preparation pause before launching forward (~0.23s)
  lungeHitRecoveryFrames: 100,       // Post-hit impact pause frames where Denji stops moving on impact (~0.26s)
  lungeSpeed: 15.0,                 // Supersonic drag
  lungeMaxDistance: 300,
  lungeDamage: 20,                  // Direct collision ram damage
  lungeStunDuration: 100,           // Stun duration in frames applied to enemy on lunge impact
  lungePostSpeedBoostFrames: 200,    // Temporary speed boost duration in frames (1.0s) after breather completes
  lungePostSpeedBoostMultiplier: 1.45, // Speed boost multiplier (1.45x)
  lungeWallDamage: 38,
  lungeWallStunFrames: 16,

  // Skill 2: Blood Intoxication Cleave
  enableBloodCleave: 0,          // Master toggle for Skill 2: Blood Intoxication Cleave
  cleaveCooldown: 360,              // 6.0s
  cleaveRange: 160,
  cleaveDamage: 28,
  cleavePullDistance: 40,
  cleaveStaggerFrames: 12,

  // Ultimate: Chainsaw Devil Awakening — Massacre Engine
  enableMassacreEngine: 0,       // Master toggle for Ultimate: Massacre Engine
  ultimateCooldown: 1500,           // 25.0s
  ultimateTimeStopFrames: 35,
  ultimateCycloneRadius: 120,
  ultimateCycloneTicks: 6,
  ultimateCycloneTickDamage: 15,
  ultimatePlungeRadius: 180,
  ultimatePlungeDamage: 65,
  ultimatePlungeHeal: 40,
  ultimatePlungeKnockback: 40,

  // Audio configuration, volume & timing delay adjustments (delays measured in frames @ 60fps)
  sounds: {
    engineIdle: 'Assets/Sound Effects/DenjiSFX/Denji_chainsaw_engine_noise.mp3',
    lungeDash: 'Assets/Sound Effects/DenjiSFX/Denji_chainsaw_dash_noise.mp3',
    dash: 'Assets/Sound Effects/DenjiSFX/Denji_chainsaw_dash_noise.mp3',
    dashVocal: 'Assets/Sound Effects/DenjiSFX/Denji_dash_vocal_noise.mp3',
    dashVoice: 'Assets/Sound Effects/DenjiSFX/Denji_dash_vocal_noise.mp3',
    shredHit: 'Assets/Sound Effects/DenjiSFX/Denji_chainsaw_shred_noise.mp3',
    lungeImpact: 'Assets/Sound Effects/Attacks/heavypunch1.mp3',
    reviveParry: 'Assets/Sound Effects/Skills/parry.mp3',
    reviveBlast: 'Assets/Sound Effects/Skills/genos-dash-noise.mp3',
    cleaveCut: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    massacreCyclone: 'Assets/Sound Effects/Attacks/heavypunch1.mp3',
    massacrePlunge: 'Assets/Sound Effects/Attacks/groundSmash.mp3'
  },
  soundVolumes: {
    engineIdle: 0.0,
    lungeDash: 0.85,
    dash: 0.55,
    dashVocal: 0.0,
    dashVoice: 0.0,
    shredHit: 0.60,
    lungeImpact: 0.80,
    reviveParry: 0.90,
    reviveBlast: 0.80,
    cleaveCut: 0.85,
    massacreCyclone: 0.70,
    massacrePlunge: 1.00
  },
  soundChances: {
    engineIdle: 1.0,
    lungeDash: 1.0,
    dash: 1.0,
    dashVocal: 1.0,
    dashVoice: 1.0,
    shredHit: 1.0,
    lungeImpact: 1.0,
    reviveParry: 1.0,
    reviveBlast: 1.0,
    cleaveCut: 1.0,
    massacreCyclone: 1.0,
    massacrePlunge: 1.0
  },
  soundDelays: {
    engineIdle: 0,
    lungeDash: 0,
    dash: 0,
    dashVocal: 0,
    dashVoice: 0,
    shredHit: 0,
    lungeImpact: 0,
    reviveParry: 0,
    reviveBlast: 0,
    cleaveCut: 0,
    massacreCyclone: 0,
    massacrePlunge: 0
  }
};
