// ─────────────────────────────────────────────
// Mahoraga — Divine General Config
// ─────────────────────────────────────────────
export const mahoragaConfig = {
    isAvailableInArena: true,       // Toggle to show/hide Mahoraga in character select screen
    maxAdaptationStages: 8,         // Total adaptation stages (8 clicks = full 360° rotation of Eight-Handled Wheel)
    adaptationSpeedBoostPerStage: 0.10, // +10% movement speed multiplier per gold adaptation stage
    enableGoldenScreenDim: true,     // Toggle on/off the dark golden cinematic screen dimming overlay on wheel rotation
    goldenDimOpacity: 0.92,          // Maximum opacity of the golden dimming screen overlay (high darkness cinematic contrast)
    wheelClickDuration: 25,          // Frame duration for 1-spoke wheel click rotation animation & flare (smaller = faster rotation e.g. 10; larger = slower rotation e.g. 40)
    swordRange: 20,                 // Melee range for Sword of Extermination
    swordCooldown: 60,              // Frames between sword strikes (1 second at 60fps)
    swordDamage: 15,                // True damage dealt by Sword of Extermination
    cleaveCooldown: 600,            // 10 seconds cooldown for Active AoE Cleave
    cleaveRadius: 150,              // Range of the AoE Cleave
    cleaveDamage: 40,               // True damage of the AoE Cleave
    cleaveWindupFrames: 30,         // Windup time for active skill
    wheelRotationSpeed: 0.10,       // Passive visual rotation speed of the wheel

    // Level 8 Max Adaptation: Attack-Teleport Speed-Blitz Configs
    infinityBlitzDurationFrames: 800,   // Active duration (frames) for Level 8 Speed-Blitz stance (600 frames = 10 seconds at 60fps)
    infinityBlitzInterval: 20,        // Frame interval between continuous attacks/strikes (smaller = faster strikes e.g. 6; larger = slower e.g. 20)
    infinityBlitzAttacksPerTeleport: 5, // Number of attacks executed before teleporting to a new angle (e.g. 2 attacks -> teleport -> 2 attacks)
    infinityBlitzDamage: 15,          // Damage per True Damage strike during Level 8 speed-blitz
    infinityBlitzTeleportDistance: 18, // Teleport offset distance around opponent
    infinityBlitzWheelSpinSpeed: 0.08,  // Continuous Wheel Rotation Speed during Level 8 Speed-Blitz stance (smaller = slower majestic spin e.g. 0.06; larger = faster e.g. 0.20)
    infinityBlitzCooldownFrames: 600,   // Cooldown (frames) before Level 8 Speed-Blitz can re-trigger (10 seconds)
    infinityBlitzTeleportSpeedMultiplier: 0.20, // Travel duration speed multiplier during blitz stance teleports (smaller = faster, e.g. 0.20 * 15 frames = 3 frame travel)
    infinityBlitzStrikeSlowDurationFrames: 15, // Slow duration applied to enemy upon landing a speed-blitz strike (15 frames)
    infinityBlitzStrikeSlowMultiplier: 0.40,   // Slow movement multiplier (0.40 = 40% speed / 60% slow)

    // Divine Shout (AoE Shockwave Roar)
    shoutCooldown: 1000,             // 8 seconds cooldown between divine shouts
    shoutWindupFrames: 15,          // Windup stance plant frames before shockwave release
    shoutRadius: 180,               // Shockwave blast radius
    shoutDamage: 30,                // Damage dealt to enemies caught in shockwave
    shoutKnockback: 18,             // Knockback force applied to enemies
    shoutSlowDurationFrames: 90,     // Slow duration in frames applied to caught enemies (90 = 1.5 seconds)
    shoutSlowMultiplier: 0.50,       // Slow speed multiplier (0.50 = 50% slow movement)

    // Cursed Energy Throw (Rapid Barrage Ranged Skill)
    throwCooldown: 1000,             // 6 seconds cooldown between rapid throw barrages
    throwMinDistance: 240,          // Minimum distance required to trigger rapid throw skill
    throwBarrageCount: 10,           // Number of rapid projectiles hurled in a single barrage
    throwBarrageInterval: 10,         // Frames between each rapid throw in the barrage (snappy ~0.10s)
    throwDamage: 14,                // Damage per thrown projectile in barrage
    throwSpeed: 20,                 // Ultra-fast projectile velocity
    throwKnockback: 7.0,            // HIT PHYSICS: Physical pushback force per thrown projectile impact
    throwAimRotationSpeed: 0.06,    // HEAVY AIM ROTATION SPEED: Gradual aim tracking speed during throw barrage (smaller = slower heavy aim rotation!)

    // Hand-to-Hand Blitz Sequence (Rapid Melee Flurry + On-Demand Teleport Chase)
    blitzWindupFrames: 14,           // Windup transition frames before starting H2H flurry (~0.23s)
    blitzTotalDurationFrames: 150,   // Total max duration for the entire H2H blitz state (~2.5s)
    blitzMinStayFrames: 20,          // Minimum duration (frames) Mahoraga stays at location before teleporting again (~0.83s)
    blitzHitsCount: 10,              // Total number of rapid melee hits in H2H flurry
    blitzHitInterval: 13,            // RAPID ATTACK SPEED: Frame interval between each rapid melee hit (smaller = faster rapid strikes!)
    blitzAttackAnimDuration: 7,      // RAPID ATTACK ANIMATION SPEED: Frame duration for each punch/chop stroke animation
    blitzHitDamage: 15,              // Damage per rapid martial arts strike (Hits 1 to N-1)
    blitzHitPushbackForce: 4.5,      // HIT PHYSICS: Slow pushback distance per rapid hit (pushes enemy back gradually hit-by-hit!)
    blitzTeleportDistanceThreshold: 200, // Distance threshold to trigger on-demand teleport chase
    blitzTargetSlowMultiplier: 0.25, // ENEMY SLOW-MOTION DEBUFF: Enemy movement speed multiplier during blitz (0.25 = 25% speed / 75% heavy slow)
    afterimageLifetimeFrames: 12,    // AFTERIMAGE VANISH SPEED: Lifetime frames for teleport afterimage ghosts (12 frames = ~0.20s snappy Sukuna/Gojo vanish!)
    blitzFinisherDamage: 35,         // Damage for final finisher cleave (Final Hit)
    blitzFinisherKnockback: 35,      // Explosive knockback launch velocity for finisher

    // Neutral Close-Quarters Attack-Teleport Stance (Triggers while waiting for wheel to adapt!)
    enableCloseQuartersTeleport: true, // Toggle on/off close-quarters teleporting (set false to disable neutral teleporting completely)
    neutralAttacksPerTeleport: 3,    // Number of attacks before teleporting (e.g. 2 attacks -> teleport -> 2 attacks)
    neutralAttackInterval: 15,       // Frame interval between consecutive attacks (~0.33s at 60fps)
    neutralTeleportDelay: 5,        // Frame delay after teleporting before starting the next attack sequence (~0.20s)
    neutralTeleportDistance: 100,     // Teleport distance offset around opponent
    neutralStanceDurationFrames: 200, // Total duration (frames) close-quarters attack-teleport stance lasts before ending (~3.33s at 60fps)
    neutralStanceCooldownFrames: 550, // Recharge cooldown (frames) before close-quarters attack-teleport stance can re-trigger (~3.0s at 60fps)

    // Reverse Cursed Technique (RCT / Divine Healing at Low HP & Adaptation)
    enableRCTHeal: true,              // Toggle on/off Reverse Cursed Technique healing
    rctHealAmountPercent: 0.10,       // Fraction of max HP healed on each wheel rotation click (0.10 = 10%)
    rctHealLevelInterval: 1,          // Heal on each adaptation level (every wheel rotation!)
    rctHealPerClickPercent: 0.02,       // Heals 10% of max HP on each wheel rotation click

    // Fatal Damage Adaptation (General rolling damage window wheel click)
    fatalAdaptWindowFrames: 600,     // Rolling window duration (frames) — 10 seconds window
    fatalDamageThresholdPct: 0.10,  // 5% max HP damage threshold triggers wheel click
    fatalAdaptCooldownFrames: 45,    // Cooldown (frames) between wheel clicks (45 = 0.75s)

    // Teleportation Speed & Afterimage Visibility Settings
    afterimageOpacity: 0.50,         // Visibility / opacity of speed afterimage ghosts (0.10 faint to 1.0 solid)
    adaptationDashSpeedFrames: 15,   // Teleportation travel speed / frames during flash-dash (smaller = faster instant teleport!)

    // Parry mechanic
    parryChancePerStage: 0.08,        // +8% parry chance per gold adaptation stage (max 75%)
    parryMaxChance: 0.75,             // Maximum parry/block chance cap (75%)
    parryDurationFrames: 25,          // Duration (frames) of snappy blade parry pose
    guardDurationFrames: 60,          // Duration (frames) of crossed-arm face guard pose
};
