// ─────────────────────────────────────────────
// Ryomen Sukuna — King of Curses Config
// ─────────────────────────────────────────────
export const sukunaConfig = {
    // Stacking Slash Crit Passive
    baseCritChance: 0.25,             // 10% base crit chance
    baseCritMultiplier: 0.25,         // 1.50x base crit damage multiplier
    critChancePerSlashHit: 0.02 ,      // +2% crit chance per landed slash hit
    critMultiplierPerSlashHit: 0.02,  // +0.05x crit multiplier per landed slash hit
    maxCritChance: 1.50,              // 80% max crit chance cap
    maxCritMultiplier: 1.50,          // 3.50x max crit damage multiplier cap

    // Reverse Cursed Technique (Passive)
    reverseCursedTechniqueHpThreshold: 0.25,  // Triggers when HP drops to 30% or below
    reverseCursedTechniqueHealPercent: 0.25,   // Heals 40% of max HP
    reverseCursedTechniqueCooldown: 700,      // 20 second cooldown before it can trigger again

    // Basic Attack: Dismantle (Long Distance) & Cursed Martial Arts (Close Distance)
    slashDamage: 15,          // Base damage per Dismantle / Martial Arts strike
    slashSpeed: 50,          // Speed of Dismantle slash projectiles
    slashCooldown: 50,       // Frames between basic attacks
    meleeDistanceThreshold: 50, // Distance threshold for switching to Cursed Martial Arts
    meleePunchCooldown: 15,  // Cooldown in frames (~0.2s) between attack-teleport punches in melee mode

    // Teleport Dodge / Evade Mechanic
    teleportDodgeChance: 0.10,               // 30% chance to teleport dodge incoming attacks
    teleportDodgeCooldown: 90,               // Frames (1.5 seconds) between teleport dodges
    teleportDodgeDistance: 85,               // Distance teleported on dodge
    teleportSlideSpeed: 8.5,                 // Residual sliding velocity speed applied every time Sukuna teleports

    // Anime Melee Combat Rhythm & Disengage
    forcedMeleeIntroDuration: 180,           // Frames (3.0 seconds) forced melee clash at start of round
    meleeModeSeparationCooldown: 240,        // Frames (4.0 seconds) mandatory ranged separation after combo disengage
    comboDisengageDistance: 300,             // Distance (pixels) teleported away on combo finisher

    // Bleed Debuff
    bleedDamagePerStack: 2,  // Damage per bleed stack
    maxBleedStacks: 5,        // Maximum bleed stacks
    bleedDuration: 180,       // Frames bleed lasts (3 seconds)

    // Skill 1: Phantom Flurry + Cleave
    flurryCooldown: 700,      // Cooldown between Phantom Flurry activations
    flurryHits: 10,            // Number of strikes in flurry
    flurryDamage: 15,          // Damage per flurry strike
    flurryHitInterval: 8,     // Frames delay (~0.13s) between flurry teleport strikes
    flurryRange: 150,          // Range to trigger flurry
    flurryCleaveBonusMultiplier: 2.0, // Bonus Dismantle/Cleave damage multiplier on flurry finish
    rapidSlashCooldown: 20,     // Frames between rapid slashes after flurry (lower = faster)

    // Passive / Defensive Skill: Spiderweb (Cleave / Dismantle Grid)
    spiderwebRange: 100,      // Detection radius to trigger Spiderweb against surrounding enemies
    spiderwebCooldown: 300,   // Cooldown between Spiderweb activations (5.0 seconds at 60fps)
    spiderwebDamage: 15,      // Damage dealt by Spiderweb slashes
    spiderwebSlowDuration: 120, // Duration in frames of movement slow on targets caught in Spiderweb
    spiderwebSlowMultiplier: 0.30, // Movement speed multiplier while slowed (30% speed)
    spiderwebMinEnemies: 2,   // Minimum surrounding enemies required to trigger Spiderweb

    // Skill 2: Furnace (Divine Flame / Fuga) — Thermobaric Nuke
    divineFlameCooldown: 1500,      // Cooldown between Furnace uses (8.33 seconds)
    divineFlameChargeMax: 100,      // Charge up duration (1.5 seconds)
    divineFlameDamage: 250,         // Primary direct hit nuke damage
    divineFlameSpeed: 15,          // Speed of Furnace fire arrow
    divineFlameRecoveryTime: 60,   // Recovery delay after firing (1 second)
    divineFlameChannelShakeIntensity: 3.0, // Channeling tremor
    divineFlameChannelShakeDuration: 5,   // Tremor pulse duration
    divineFlameShakeIntensity: 30,  // Powerful impactful arena shake on Fuga nuke explosion!
    divineFlameShakeDuration: 25,   // Arena shake duration on Fuga impact
    divineFlameKnockback: 32,      // Explosive knockback velocity applied to targets hit by Fuga
    thermobaricSplashRadius: 150,  // Thermobaric explosion splash damage radius
    divineFlameBurnDuration: 180,  // Frames burn effect lasts on targets hit by Fuga (3 seconds)

    // Ultimate Skill: Domain Expansion — Malevolent Shrine
    domainCooldown: 1950,     // Cooldown before domain can trigger (25 seconds at 60 fps)
    domainChargeMax: 120,      // Charge up duration before domain opens (1.5 seconds)
    domainDuration: 500,      // Domain duration (3 seconds)
    domainDamage: 15,          // Base damage per slash tick
    domainDamageInterval: 20,  // Frames between slash ticks
    domainRapidSlashCooldown: 20, // Frames between Sukuna's rapid teleport slashes inside Domain
    domainRadius: 240,        // Radius of the open-air death zone
    domainRampRatePerSec: 0.12,// 10% damage increase per second targets stay inside
};
