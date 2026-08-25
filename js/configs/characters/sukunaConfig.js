// ─────────────────────────────────────────────
// Ryomen Sukuna — King of Curses Config
// ─────────────────────────────────────────────
export const sukunaConfig = {
    // Basic Attack: Dismantle / Cleave Ranged Slashes
    slashSpeed: 40,                   // Supersonic travel speed of Dismantle and Cleave slashes (px/frame)
    slashDamage: 18,                  // Base damage per slash
    slashCooldown: 50,                // Frames between ranged basic slash attacks

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
    closeRangeRadius: 220,            // Proximity distance (pixels) to enter Melee Mode
    initialMeleeDuration: 120,        // Active melee clash duration in frames (120 frames = 2.0 seconds at 60fps)
    meleeModeCooldown: 120,           // Mandatory ranged separation cooldown in frames (120 frames = 2.0 seconds at 60fps)
    comboDisengageDistance: 280,      // Distance (pixels) teleported away when disengaging after clash
    meleePunchDamage: 15,             // Damage dealt per martial arts punch strike
    meleePunchCooldown: 9,            // Frames between consecutive punches during flurry (~0.15s at 60fps)
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
