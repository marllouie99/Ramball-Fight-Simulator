// ─────────────────────────────────────────────
// Ryomen Sukuna — King of Curses Boss Config
// ─────────────────────────────────────────────
import { baseBossConfig } from './baseBossConfig.js';

export const sukunaBossConfig = {
  ...baseBossConfig,

  // ── Boss Presentation & Metadata ──
  bossTitle: 'King of Curses',
  bossSubtitle: 'DISASTER INCARNATE — RYOMEN SUKUNA',
  entranceAuraColor: '#EF4444',
  entranceMistColor: 'rgba(180, 20, 20, 0.45)',
  entranceFlashDuration: 20,

  // ── Base Attributes ──
  hp: 2800,
  speed: 5.8,
  moveSpeed: 5.8,
  r: 25,
  radius: 25,
  color: '#8B0000', // Dark Crimson
  themeColor: '#8B0000',
  startX: 300,
  startY: 250,
  startVx: 1.2,
  startVy: 1.0,
  damage: 10,
  cooldown: 80,
  projectileSpeedMultiplier: 3.0,
  ability: 'King of Curses',
  desc: 'Deploys Malevolent Shrine domain deals unblockable damage.',
  shrineWidth: 380,                 // Authentic Malevolent Shrine pixel-art model width in px
  shrineGlowRadius: 210,            // Atmospheric crimson ambient glow radius behind shrine

  // Basic Attack: Dismantle / Cleave Ranged Slashes
  slashSpeed: 40,                   // Supersonic travel speed of Dismantle and Cleave slashes (px/frame)
  slashDamage: 10,                  // Base damage per slash
  slashCooldown: 70,                // Frames between ranged basic slash attacks

  // Stacking Slash Crit Passive
  baseCritChance: 0.25,             // 10% base crit chance
  baseCritMultiplier: 0.25,         // 1.50x base crit damage multiplier
  critChancePerSlashHit: 0.01,      // +2% crit chance per landed slash hit
  critMultiplierPerSlashHit: 0.01,  // +0.05x crit multiplier per landed slash hit
  maxCritChance: 1.0,               // 80% max crit chance cap
  maxCritMultiplier: 1.0,           // 3.50x max crit damage multiplier cap

  // Reverse Cursed Technique (Passive)
  reverseCursedTechniqueHpThreshold: 0.10,  // Triggers when HP drops to 25% or below
  reverseCursedTechniqueHealAmount: 0.50,   // % of Max HP healed per RCT trigger (0.50 = 50% Max HP)
  reverseCursedTechniqueCooldown: 1500,     // 20 second cooldown before it can trigger again
  rctRevivalHealAmount: 0.50,               // % of Max HP restored on emergency revival (0.50 = 50% Max HP)

  // ── 7. Melee Mode & Hand-to-Hand Martial Arts ──
  closeRangeRadius: 110,             // Proximity distance (pixels) to enter Melee Mode (direct contact only)
  initialMeleeDuration: 150,        // Active melee clash duration in frames
  meleeModeCooldown: 300,           // Mandatory ranged separation cooldown in frames
  comboDisengageDistance: 100,      // Distance (pixels) teleported away when disengaging after clash
  meleePunchDamage: 5,              // Damage dealt per martial arts punch strike
  meleePunchCooldown: 20,           // Frames between consecutive punches during flurry
  meleePunchAnimDuration: 9,        // Punch extension and retraction animation frame duration
  meleeTeleportAngle: 1.75,         // Wide surround / flank angles for melee combo teleportation
  teleportSpeed: 15,                // Teleport movement slide speed

  // Teleport Dodge / Evade Mechanic
  teleportDodgeChance: 0.10,        // 10% chance to teleport dodge incoming attacks
  teleportDodgeCooldown: 90,        // Frames between teleport dodges
  teleportDodgeDistance: 85,        // Distance teleported on dodge
  teleportSlideSpeed: 8.5,          // Residual sliding velocity speed applied every time Sukuna teleports

  // Bleed Debuff
  bleedDamagePerStack: 2,           // Damage per bleed stack
  maxBleedStacks: 5,                // Maximum bleed stacks
  bleedDuration: 180,               // Frames bleed lasts (3 seconds)

  // Passive / Defensive Skill: Spiderweb (Cleave / Dismantle Grid)
  spiderwebRange: 100,              // Detection radius to trigger Spiderweb against surrounding enemies
  spiderwebCooldown: 300,           // Cooldown between Spiderweb activations
  spiderwebDamage: 15,              // Damage dealt by Spiderweb slashes
  spiderwebSlowDuration: 120,       // Duration in frames of movement slow on targets caught in Spiderweb
  spiderwebSlowMultiplier: 0.30,    // Movement speed multiplier while slowed (30% speed)
  spiderwebMinEnemies: 2,           // Minimum surrounding enemies required to trigger Spiderweb

  // Skill 2: Furnace (Divine Flame / Fuga) — Thermobaric Nuke
  divineFlameCooldown: 1500,        // Cooldown between Furnace uses outside Domain
  divineFlameChannelTurnRate: 0.045,// Smooth aim rotation turn rate while channeling Furnace / Fuga
  divineFlameCorridorHalfWidth: 45, // Straight corridor half-width for cardinal alignment detection
  divineFlameDetectionAngle: Math.PI * 0.08, // Maximum angular deviation from cardinal angle
  divineFlameTriggerRange: 850,     // Maximum range to initiate Furnace (Fuga)
  domainFugaCooldownReduction: 0.70,// 70% CD reduction to Fuga when inside Malevolent Shrine Domain
  domainFugaCooldownReductionPercent: 0.70,
  divineFlameDomainCooldown: 210,   // Cooldown between Fuga uses inside Domain
  domainFugaCooldownTickRate: 0.2,  // Rate multiplier for cooldown ticks inside Domain
  divineFlameChargeMax: 80,         // Charge up duration
  divineFlameDamage: 100,           // Primary direct hit nuke damage
  divineFlameExplosionRadius: 200,  // Thermobaric nuke explosion AOE blast radius in pixels
  divineFlameExplosionDamage: 50,   // Thermobaric nuke radius explosion AOE damage
  thermobaricSplashRadius: 220,     // Thermobaric explosion splash damage radius
  divineFlameSpeed: 15,             // Speed of Furnace fire arrow
  divineFlameRecoveryTime: 60,      // Recovery delay after firing
  divineFlameChannelShakeIntensity: 3.0,
  divineFlameChannelShakeDuration: 5,
  divineFlameShakeIntensity: 30,    // Impactful arena shake on Fuga nuke explosion
  divineFlameShakeDuration: 25,
  divineFlameKnockback: 10,
  divineFlameKnockbackStun: 25,
  divineFlameBurnDuration: 180,

  // Ultimate Skill: Domain Expansion — Malevolent Shrine
  domainCooldown: 2000,             // Cooldown before domain can trigger
  domainChargeMax: 100,             // Channeling duration before domain opens
  domainDuration: 500,              // Domain active duration
  domainDamage: 3,                  // Base damage per slash line hit
  domainSlashDamage: 3,             // Base damage dealt by each individual spatial cut line hit
  domainDamageInterval: 8,          // Frames between slash barrages
  domainSlashesPerTick: 3,          // Number of spatial cut lines spawned per barrage
  domainSlashShakeIntensity: 1.8,
  domainSlashShakeDuration: 3,
  domainSlashRicochetForce: 6.5,
  domainRapidSlashCooldown: 20,
  domainRadius: 240,
  domainRampRatePerSec: 0.10,

  // Audio configuration, volume & timing delays
  sounds: {
    punch: 'Assets/Sound Effects/Attacks/punch.mp3',
    swordSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    fleshSlice: 'Assets/Sound Effects/Skills/backstab.mp3',
    teleportDash: 'Assets/Sound Effects/Skills/dash3.mp3',
    ricochetHit: 'Assets/Sound Effects/Skills/parry.mp3',
    fugaChant: 'Assets/Sound Effects/Skills/fuga.mp3',
    fugaIgnite: 'Assets/Sound Effects/Skills/fugaignite.mp3',
    fugaTravel: 'Assets/Sound Effects/Skills/fugatravel.mp3',
    fugaFireball: 'Assets/Sound Effects/Attacks/flamespray1.mp3',
    fugaExplosion: 'Assets/Sound Effects/Skills/fugaexplode.mp3',
    thermobaricExplosion: 'Assets/Sound Effects/Attacks/explosion.mp3',
    domainChannel: 'Assets/Sound Effects/Skills/domainexpansion.mp3',
    domainActivate: 'Assets/Sound Effects/Skills/shrine.mp3',
    domainExpansion: 'Assets/Sound Effects/Skills/shrine.mp3',
    domainDeploy: 'Assets/Sound Effects/Skills/domainexpansion.mp3',
    spiderweb: 'Assets/Sound Effects/Skills/hookchain.mp3',
    reverseCursedTechnique: 'Assets/Sound Effects/Skills/enhance.mp3',
    rapidSlashVoiceline: 'Assets/Sound Effects/Skills/Sukuna-rapidslash-voiceline.mp3',
    championVoiceline: 'Assets/Sound Effects/Skills/Sukuna-champion-voiceline.mp3'
  },
  soundVolumes: {
    punch: 1.40,
    swordSwing: 0.50,
    fleshSlice: 0.40,
    teleportDash: 0.45,
    ricochetHit: 0.0,
    fugaChant: 2.0,
    fugaIgnite: 1.00,
    fugaTravel: 0.80,
    fugaFireball: 0.45,
    fugaExplosion: 0.80,
    thermobaricExplosion: 0.55,
    domainChannel: 2.75,
    domainActivate: 1.80,
    domainExpansion: 2.75,
    domainDeploy: 2.55,
    spiderweb: 0.40,
    reverseCursedTechnique: 0.55,
    rapidSlashVoiceline: 0.0,
    championVoiceline: 1.75
  },
  soundChances: {
    ricochetHit: 0.0
  },
  soundDelays: {
    punch: 0,
    swordSwing: 0,
    fleshSlice: 0,
    teleportDash: 0,
    ricochetHit: 0,
    fugaChant: 0,
    fugaIgnite: 0,
    fugaTravel: 0,
    fugaExplosion: 0,
    domainExpansion: 0,
    championVoiceline: 68
  },
  championVoiceline: 'Assets/Sound Effects/Skills/Sukuna-champion-voiceline.mp3',
  championVoiceVolume: 1.75,
  rapidSlashVoiceline: 'Assets/Sound Effects/Skills/Sukuna-rapidslash-voiceline.mp3',
  rapidSlashVoiceVolume: 0.0
};
