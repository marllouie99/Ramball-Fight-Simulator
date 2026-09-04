// ─────────────────────────────────────────────
// Ryomen Sukuna — King of Curses Config
// ─────────────────────────────────────────────
export const sukunaConfig = {
    // ── Base Attributes ──
    hp: 200,
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
    damage: 15,
    cooldown: 80,
    projectileSpeedMultiplier: 3.0,
    ability: 'King of Curses',
    desc: 'Deploys Malevolent Shrine domain deals unblockable damage.',

    // Basic Attack: Dismantle / Cleave Ranged Slashes
    slashSpeed: 40,                   // Supersonic travel speed of Dismantle and Cleave slashes (px/frame)
    slashDamage: 18,                  // Base damage per slash
    slashCooldown: 30,                // Frames between ranged basic slash attacks

    // Stacking Slash Crit Passive
    baseCritChance: 0.25,             // 10% base crit chance
    baseCritMultiplier: 0.25,         // 1.50x base crit damage multiplier
    critChancePerSlashHit: 0.02 ,      // +2% crit chance per landed slash hit
    critMultiplierPerSlashHit: 0.02,  // +0.05x crit multiplier per landed slash hit
    maxCritChance: 1.50,              // 80% max crit chance cap
    maxCritMultiplier: 1.50,          // 3.50x max crit damage multiplier cap

    // Reverse Cursed Technique (Passive)
    reverseCursedTechniqueHpThreshold: 0.25,  // Triggers when HP drops to 25% or below
    reverseCursedTechniqueHealAmount: 125,    // Flat HP healed per RCT trigger
    reverseCursedTechniqueCooldown: 700,      // 20 second cooldown before it can trigger again
    rctRevivalHealAmount: 125,                // Flat HP restored on emergency revival

    // ── 7. Melee Mode & Hand-to-Hand Martial Arts ──
    closeRangeRadius: 85,             // Proximity distance (pixels) to enter Melee Mode (direct contact only)
    initialMeleeDuration: 50,        // Active melee clash duration in frames (120 frames = 2.0 seconds at 60fps)
    meleeModeCooldown: 500,           // Mandatory ranged separation cooldown in frames (120 frames = 2.0 seconds at 60fps)
    comboDisengageDistance: 0,      // Distance (pixels) teleported away when disengaging after clash
    meleePunchDamage: 15,             // Damage dealt per martial arts punch strike
    meleePunchCooldown: 9,            // Frames between consecutive punches during flurry (~0.15s at 60fps)
    meleePunchAnimDuration: 9,        // Punch extension and retraction animation frame duration
    teleportSpeed: 15,                // Teleport movement slide speed

    // Teleport Dodge / Evade Mechanic
    teleportDodgeChance: 0.10,               // 10% chance to teleport dodge incoming attacks
    teleportDodgeCooldown: 90,               // Frames (1.5 seconds) between teleport dodges
    teleportDodgeDistance: 85,               // Distance teleported on dodge
    teleportSlideSpeed: 8.5,                 // Residual sliding velocity speed applied every time Sukuna teleports

    // Bleed Debuff
    bleedDamagePerStack: 2,  // Damage per bleed stack
    maxBleedStacks: 5,        // Maximum bleed stacks
    bleedDuration: 180,       // Frames bleed lasts (3 seconds)



    // Passive / Defensive Skill: Spiderweb (Cleave / Dismantle Grid)
    spiderwebRange: 100,      // Detection radius to trigger Spiderweb against surrounding enemies
    spiderwebCooldown: 300,   // Cooldown between Spiderweb activations (5.0 seconds at 60fps)
    spiderwebDamage: 15,      // Damage dealt by Spiderweb slashes
    spiderwebSlowDuration: 120, // Duration in frames of movement slow on targets caught in Spiderweb
    spiderwebSlowMultiplier: 0.30, // Movement speed multiplier while slowed (30% speed)
    spiderwebMinEnemies: 2,   // Minimum surrounding enemies required to trigger Spiderweb

    // Skill 2: Furnace (Divine Flame / Fuga) — Thermobaric Nuke
    divineFlameCooldown: 700,      // Cooldown between Furnace uses outside Domain (~11.6 seconds at 60fps)
    divineFlameChannelTurnRate: 0.045, // Smooth aim rotation turn rate while channeling Furnace / Fuga
    domainFugaCooldownReduction: 0.70, // 70% CD reduction to Fuga when inside Malevolent Shrine Domain
    domainFugaCooldownReductionPercent: 0.70, // 70% CD reduction
    divineFlameDomainCooldown: 210, // Cooldown between Fuga uses inside Domain (~3.5 seconds at 60fps)
    domainFugaCooldownTickRate: 0.2,  // Rate multiplier for cooldown ticks inside Domain (4x faster recharge)
    divineFlameChargeMax: 100,      // Charge up duration (1.5 seconds)
    divineFlameDamage: 1000,         // Primary direct hit nuke damage
    divineFlameExplosionRadius: 200, // Thermobaric nuke explosion AOE blast radius in pixels
    divineFlameExplosionDamage: 300, // Thermobaric nuke radius explosion AOE damage dealt to all surrounding enemies
    thermobaricSplashRadius: 220,  // Thermobaric explosion splash damage radius
    divineFlameSpeed: 15,          // Speed of Furnace fire arrow
    divineFlameRecoveryTime: 60,   // Recovery delay after firing (1 second)
    divineFlameChannelShakeIntensity: 3.0, // Channeling tremor
    divineFlameChannelShakeDuration: 5,   // Tremor pulse duration
    divineFlameShakeIntensity: 30,  // Powerful impactful arena shake on Fuga nuke explosion!
    divineFlameShakeDuration: 25,   // Arena shake duration on Fuga impact
    divineFlameKnockback: 20,      // Explosive knockback velocity applied to targets hit by Fuga
    divineFlameBurnDuration: 180,  // Frames burn effect lasts on targets hit by Fuga (3 seconds)

    // Ultimate Skill: Domain Expansion — Malevolent Shrine
    domainCooldown: 1500,         // Cooldown before domain can trigger (~16.6s at 60 fps)
    domainChargeMax: 120,         // Channeling duration before domain opens (2.0s at 60 fps)
    domainDuration: 800,          // Domain active duration (~8.33s at 60 fps)
    domainDamage: 15,             // Base damage per slash line hit (legacy fallback)
    domainSlashDamage: 15,        // Base damage dealt by each individual spatial cut line hit
    domainDamageInterval: 18,     // Frames between slash barrages (~3.3 waves per second)
    domainSlashesPerTick: 3,      // Number of spatial cut lines spawned per barrage
    domainSlashShakeIntensity: 1.8, // Small arena screen shake when Malevolent Shrine cut lines slash
    domainSlashShakeDuration: 3,    // Duration of cut line arena shake (in frames)
    domainSlashRicochetForce: 6.5,  // Kinetic deflection ricochet push force applied to sliced enemies
    domainRapidSlashCooldown: 20, // Frames between Sukuna's rapid teleport slashes inside Domain
    domainRadius: 240,            // Target proximity radius around shrine (0 or arena-wide if open-barrier)
    domainRampRatePerSec: 0.10,   // Damage ramp multiplier per second target stays inside domain (10% per sec)

    // Audio configuration, volume & timing delay adjustments (delays measured in frames @ 60fps)
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
      fugaChant: 1.75,
      fugaIgnite: 1.00,
      fugaTravel: 0.80,
      fugaFireball: 0.45,
      fugaExplosion: 0.80,
      thermobaricExplosion: 0.55,
      domainChannel: 2.75,
      domainActivate: 0.80,
      domainExpansion: 1.75,
      domainDeploy: 0.55,
      spiderweb: 0.40,
      reverseCursedTechnique: 0.55,
      rapidSlashVoiceline: 0.0,
      championVoiceline: 1.75
    },
    soundChances: {
      ricochetHit: 0.0 // 100% chance to play parry/ricochet slice audio on cut line hit
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

