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
  speed: 5.8,
  moveSpeed: 5.8,
  r: 25,
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
  damage: 24,
  cooldown: 24,
  projectileSpeedMultiplier: 1.0,
  ability: 'Chainsaw Devil & "Massacre Engine"',
  desc: 'The Chainsaw Devil. Relentless high-speed berserker entering the arena already fully transformed into his Chainsaw Devil form. Wields 140° Twin Forearm Chainsaw Shreds with 25% lifesteal, Engine Rev Lunges, Extended Chain Cleaves, Pochita Heart Revive, and the Massacre Engine ultimate.',

  // Passive 1: Pochita Heart Ripcord Revive
  enablePochitaRevive: true,        // Master toggle for Passive 1: Pochita Heart Revive
  maxReviveStocks: 1,               // 1 ripcord revive per round
  reviveHpPercent: 0.50,            // Restores 50% Max HP (180 HP)
  reviveShockwaveRadius: 150,       // Radial blood blast radius on trigger
  reviveShockwaveDamage: 45,        // Radial blast damage
  reviveShockwaveKnockback: 32,     // Repel force
  hybridModeDurationFrames: 720,    // 12.0s Chainsaw Devil Form duration

  // Passive 2: Blood Lust Siphon
  enableBloodSiphon: true,          // Master toggle for Passive 2: Blood Lust Siphon (Lifesteal)
  lifestealRatio: 0.25,             // 25% base chainsaw lifesteal
  bleedingTargetLifestealRatio: 0.35,// 35% lifesteal vs bleeding enemies

  // Passive 3: Hemorrhage & Vascular Rupture
  enableHemorrhage: true,           // Master toggle for Passive 3: Stacking Bleed & Vascular Rupture
  maxHemorrhageStacks: 6,
  defenseShredPerStack: 0.05,       // 5% defense reduction per stack
  bleedDpsPerStack: 3,              // 3 damage per second per stack
  ruptureDamage: 28,                // Bonus true damage at max stacks

  // Human Form: Street Brawler Combo
  enablePunches: true,              // Master toggle for Human Form: Street Brawler 3-Hit Combo
  punch1Damage: 12,
  punch2Damage: 14,
  punch3Damage: 20,
  punchReach: 65,
  punchKnockback: 18,

  // Hybrid Form: Continuous 3-Blade Chainsaw Collision Shred
  enableChainsawShred: true,        // Master toggle for Continuous 3-Blade Chainsaw Collision Shred
  shredDamagePerTooth: 5,           // Rapid shred damage per chain tooth collision tick
  shredTickInterval: 5,             // Interval in frames between chain teeth hits (matches animation RPM)
  shredHitPauseFrames: 3,           // Micro hit-pause frames applied to enemy on each tooth strike
  sawReach: 75,
  sawHitKnockback: 6,

  // Multi-Blade Simultaneous Shred Bonus
  enableMultiBladeBonus: true,      // Master toggle for Multi-Blade Simultaneous Shred Bonus
  dualBladeDamageMultiplier: 1.6,   // 1.6x Shred Damage (+60%) when 2 blades connect simultaneously
  tripleBladeDamageMultiplier: 2.4, // 2.4x Shred Damage (+140%) when all 3 blades connect simultaneously
  dualBladeHitPauseBonus: 1,        // +1 frame hit-pause (total 4 frames) on dual blade connection
  tripleBladeHitPauseBonus: 2,      // +2 frames hit-pause (total 5 frames) on triple blade connection

  // Skill 1: Ripcord Engine Rev Lunge
  enableEngineLunge: 0,          // Master toggle for Skill 1: Ripcord Engine Rev Lunge
  lungeCooldown: 240,               // 4.0s
  lungeSpeed: 30.0,                 // Supersonic drag
  lungeMaxDistance: 300,
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
};
