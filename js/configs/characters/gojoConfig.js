// ─────────────────────────────────────────────
// Gojo Satoru — Limitless Fighter Config
// ─────────────────────────────────────────────
export const gojoConfig = {
    infinityCooldown: 240,    // Cooldown before Infinity block triggers again
    blueCooldown: 40,         // Fire rate for basic attack (Blue orb) - Lower is faster
    modeSwitchBreatherDuration: 45, // Breather pause (frames) when Gojo switches to Ranged/Blue mode (~0.75s)
    blueSpeed: 10.5,           // Speed of Blue orb projectile
    blueRadius: 50,           // Pull radius of Blue explosion
    bluePullForce: 0.5,       // Pull strength of Blue
    redDamage: 50,            // Base damage dealt by Reversal Red blast
    redKnockback: 25,         // Knockback force of Red
    redCooldown: 1200,         // Cooldown of Red
    redRange: 100,            // Base range
    redTriggerRange: 280,     // Range in pixels to trigger Red against enemies (including ranged fighters)
    redBlastRadius: 400,      // Explosive blast wave radius in pixels that repels enemies on detonation
    redTotalFrames: 75,       // Total frames for full Red animation (~1.25s at 60fps)
    redBuildupFrames: 100,     // Frames of orb manifestation before the BOOM (~0.33s)
    redSlowDuration: 120,     // Frames the post-detonation slow lasts (~2s at 60fps)
    redSlowMultiplier: 0.35,  // Speed multiplier while slowed by Red (35% of normal)
    redShakeIntensity: 22,    // Heavy screen shake intensity on Red detonation
    redShakeDuration: 25,     // Duration of screen shake on Red detonation
    purpleCooldown: 1500,      // Cooldown of Hollow Purple
    purpleChargeMax: 100,     // Frames required to mix Red and Blue into Purple (channeling duration)
    purpleDamage: 20,         // Continuous piercing damage per tick
    purpleSpeed: 5,           // Speed of Purple orb
    purpleRadius: 50,         // Radius of Purple orb
    purpleLife: 250,         // How long Purple orb stays in arena (frames)
    purpleTravelTime: 20,    // Frames the orb travels before stopping (0 = stop immediately)
    purpleScale: 10.0,        // Scale multiplier for hit radius (visual size)
    purpleDPS: 30,            // Damage per second dealt to enemies inside the orb
    purpleDPSInterval: 20,   // Frames between DPS ticks (30 = 0.5s at 60fps)
    purpleSlowDuration: 60,  // Frames the slow effect lasts (1 second at 60fps)
    purpleSlowMultiplier: 0.5, // Speed multiplier while slowed (0.5 = 50% speed)
    purplePullRadius: 280,   // Radius in pixels for gravitational pull field around Hollow Purple
    purplePullForce: 8.0,    // How strongly enemies and illusions are dragged toward the orb center
    purpleShakeIntensity: 5, // Screen shake intensity when purple orb fires
    purpleShakeDuration: 30,  // Screen shake duration when purple orb fires
    domainCooldown: 1500,     // 20s Ultimate cooldown
    domainChargeMax: 150,     // 2s Channeling duration before domain opens
    domainDuration: 350,      // Domain lasts 3 seconds (paralyzes enemies)
    domainDeployAudioFrame: 80, // Frame during channeling when gojodomaindeploy.mp3 plays
    domainExpansionAudioDelay: 10, // Frames after domain deployment when gojodomainexpansion.mp3 plays
    // Reverse Cursed Technique - Self heal when at low HP
    reverseCursedTechniqueHpThreshold: 0.10,  // Triggers when HP drops to 25% or below
    reverseCursedTechniqueHealPercent: 0.20,   // Heals 35% of max HP
    reverseCursedTechniqueCooldown: 1200,      // 15 second cooldown before it can trigger again
    // Melee Mode (Hand-to-Hand Combat)
    initialMeleeDuration: 30, // Forces hand-to-hand combat for the initial duration
    meleeModeCooldown: 600,   // 10 second cooldown before hand-to-hand combat mode can trigger again
    closeRangeRadius: 120,    // Distance at which Gojo switches to melee mode
    meleePunchDamage: 10,     // Damage dealt by each punch
    meleePunchCooldown: 10,   // Frames between punches
    teleportDelay: 5,        // Frames delay before teleport after punch
    teleportSpeed: 15,        // Speed of teleport movement (pixels per frame)

    // Teleport Dodge / Evade Mechanic
    teleportDodgeChance: 0.10,               // 30% chance to teleport dodge incoming attacks
    teleportDodgeCooldown: 90,               // Frames (1.5 seconds) between teleport dodges
    teleportDodgeDistance: 85,               // Distance teleported on dodge

    // Limitless Infinity Barrier Mechanics
    infinityCooldown: 200,                   // Recharge cooldown in frames (240 = 4.0s) before Infinity barrier reactivates after blocking
    infinityActiveDuration: 100,              // Frames (1.0s) Infinity continues to block multiple attacks after first impact before going on cooldown
    infinityFreezeChance: 0.5,               // Chance (0.0 to 1.0, e.g. 1.0 = 100%, 0.5 = 50%) to freeze incoming projectiles/slashes
    infinityFreezeDuration: 50,             // Duration in frames (240 = 4.0s) projectiles stay suspended mid-air on barrier contact
    infinityMeleeFreezeDuration: 10,         // Duration in frames (45 = 0.75s) melee attackers are spatially frozen on striking barrier
    infinityMaxFrozenProjectiles: 10,        // Max limit of frozen projectiles allowed simultaneously to prevent FPS drops

    // Anime Melee Combat Rhythm & Disengage
    forcedMeleeIntroDuration: 180,           // Frames (3.0 seconds) forced melee clash at start of round
    meleeModeSeparationCooldown: 240,        // Frames (4.0 seconds) mandatory ranged separation after combo disengage
    comboDisengageDistance: 300,             // Distance (pixels) teleported away on combo finisher
    purpleFollowupMeleeDuration: 120,        // Frames (2.0 seconds) forced melee combo after firing Hollow Purple
    purpleFollowupComboPunches: 4,           // Number of rapid punch-teleports in Purple follow-up combo
};
