// ─────────────────────────────────────────────
// Toji Fushiguro — Sorcerer Killer Config
// ─────────────────────────────────────────────
export const tojiConfig = {
    // Passive: Heavenly Restriction
    stealthDodgeChance: 0.10,    // 40% chance to physically dodge normal projectiles
    parryChance: 0.10,           // 45% chance to parry incoming strikes/projectiles with Inverted Spear
    parryAmbushCooldownFrames: 360, // Cooldown (frames) before a parry triggers a 3-Stage Ambush inside enemy domains (360 frames = 6.0s)
    domainImmunity: true,        // Ignores all Domain Expansion effects completely
    homingImmunity: true,        // Cannot be targeted by auto-aim
    stealthDuration: 240,        // Active Stealth duration in frames (240 frames = 4.0 seconds)
    stealthCooldown: 500,        // Stealth cooldown in frames (420 frames = 7.0 seconds)
    stealthTurnRate: 0.08,       // Aim tracking reaction rate when enemies aim at stealthed Toji (delayed but functional!)
    channelDetectionRadius: 550, // Detection radius (px) to sense enemy skill/domain channeling
    channelInterruptChance: 0.10, // 10% chance to force Sequence 1 ambush and interrupt channeling
    channelInterruptCooldownFrames: 800, // Cooldown (frames) for the interrupt mechanic (900 frames = ~15s)
    channelReactionFrames: 50,   // Delay in frames before Toji reacts to a channeled skill

    // Ambush Move Sequence (Stealth Cooldown Re-entry Ambush)
    ambushTriggerFrames: 55,       // Frames before stealth cooldown ends when ambush triggers
    ambushFirstTeleportFrames: 25, // 1st Sequence: 1st teleport duration (frames) in front of target before teleporting to enemy back
    ambushFrontPauseDuration: 18,   // 1st Sequence: Pause duration (frames) in front of target
    ambushBackChargeDuration: 30,  // 1st Sequence: Charging duration (frames) at back before Spear thrust (slow & heavy)
    ambushBackThrustDamage: 50,    // 1st Sequence: True Damage of the Inverted Spear backstab thrust
    ambushTargetFreezeDuration: 70, // 1st Sequence: Target freeze duration (frames) so sequence executes smoothly
    ambushKatanaChargeDuration: 30, // 2nd Sequence: Katana windup charging duration (frames) before Soul Slash
    ambushKatanaFreezeDuration: 70, // 2nd Sequence: Target freeze duration (frames) for Katana execution
    ambushKnockbackForce: 48,      // Extreme high-speed knockback force launching target flying & bouncing across arena!
    ambushPhantomFlurryStrikes: 10,   // 3rd Sequence: Number of rapid phantom afterimage flurry slashes
    ambushPhantomFlurryFrameRate: 8, // 3rd Sequence: Slower readable attack speed between each phantom strike (42 frames = 0.7s)
    ambushPhantomFlurryDamage: 15,    // 3rd Sequence: True Damage per phantom strike
    ambushPhantomFlurryDistance: 8,   // 3rd Sequence: Tight teleport distance (px) from target during flurry slashes

    // Primary Melee: Inverted Spear of Heaven
    spearRange: 50,              // Distance required to land melee hit
    spearCooldown: 75,           // Spaced frames between basic melee strikes (0.92s swing)
    spearDamage: 15,             // Base damage per swing
    silenceDuration: 180,        // Frames target is Silenced on hit (3.0 seconds at 60fps)
    pierceInfinity: true,        // Ignores Infinity and shield blocks

    // Secondary Weapon: Split Soul Katana
    katanaRange: 75,             // Wide sweep range
    katanaCooldown: 300,         // Cooldown between Soul Slashes (5 seconds at 60fps)
    katanaDamage: 35,            // Massive True Damage
    soulWoundDuration: 180,      // Frames target is afflicted with Soul Wound anti-heal (3 seconds)

    ultimateCooldown: 1500,
    ultimateSwarmDuration: 500,     // (Legacy) Total duration of the ultimate sequence (now used for slow duration)
    ultimateMaxStrikes: 6,          // Number of flash-step strikes before the final crater slam
    ultimateAssaultDamage: 30,      // Damage per flash-step strike
    ultimateCraterDamage: 65,       // Massive crater slam true damage
    ultimateCraterRadius: 180,      // Blast radius of the final slam

    // Ultimate Animation & Timings
    ultimateVanishDuration: 5,      // Frames spent invisible in the shadows between strikes
    ultimateStrikeDuration: 20,       // Total frames he is visible during a strike (smooth & readable swing!)
    ultimateSlideDistance: 100,       // How far away he spawns before sliding in
    ultimateSlideSpeed: 50,           // How fast he slides in
    ultimateCraterChargeTime: 90,     // Frames spent hovering in the air winding up the katana
    ultimateCraterDiveTime: 15,       // Frames spent diving down to the ground
    ultimateCraterFadeInFrames: 30,   // Frames for Toji to fade in before the crater slam

    // Dynamic multipliers
    ultimateDodgeMultiplier: 3.0,     // Dodge chance multiplier during ultimate
    stealthSpeedMultiplier: 1.3,      // Speed multiplier during stealth mode
};
