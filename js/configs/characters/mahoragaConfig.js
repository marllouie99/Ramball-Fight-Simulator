// ─────────────────────────────────────────────
// Mahoraga — Divine General Config
// ─────────────────────────────────────────────
export const mahoragaConfig = {
    isAvailableInArena: true,       // Toggle to show/hide Mahoraga in character select screen
    moveSpeed: 6.5,                 // Base movement speed (before adaptation speed boosts)
    maxAdaptationStages: 8,         // Total adaptation stages (8 clicks = full 360° rotation of Eight-Handled Wheel)
    adaptationSpeedBoostPerStage: 0.15, // +10% movement speed multiplier per gold adaptation stage
    rctRegenPerStage: 0.03,          // Passive RCT HP regeneration per frame per adaptation level (0.10 HP/frame = +6 HP/sec per stage)
    maxLevelRctRegen: 0.80,          // Base ultimate passive RCT HP regeneration per frame at Level 8 (0.80 HP/frame = +48 HP/sec)
    enableGoldenScreenDim: true,     // Toggle on/off the dark golden cinematic screen dimming overlay on wheel rotation
    goldenDimOpacity: 0.92,          // Maximum opacity of the golden dimming screen overlay (high darkness cinematic contrast)
    wheelClickDuration: 25,          // Frame duration for 1-spoke wheel click rotation animation & flare (smaller = faster rotation e.g. 10; larger = slower rotation e.g. 40)
    swordRange: 110,                // Melee reach (110px frontal arc) for Sword of Extermination
    swordCooldown: 30,              // Frames between sword strikes (1 second at 60fps)
    swordDamage: 15,                // True damage dealt by Sword of Extermination
    cleaveCooldown: 600,            // 10 seconds cooldown for Active AoE Cleave
    cleaveRadius: 150,              // Range of the AoE Cleave
    cleaveDamage: 40,               // True damage of the AoE Cleave
    cleaveWindupFrames: 0,          // Instant execution without pausing/standing still
    wheelRotationSpeed: 0.10,       // Passive visual rotation speed of the wheel

    // Level 8 Max Adaptation: Attack-Teleport Speed-Blitz Configs
    infinityBlitzDurationFrames: 300,   // Active duration (frames) for Level 8 Speed-Blitz stance (600 frames = 10 seconds at 60fps)
    infinityBlitzInterval: 20,        // Frame interval between continuous attacks/strikes (smaller = faster strikes e.g. 6; larger = slower e.g. 20)
    infinityBlitzAttacksPerTeleport: 5, // Number of attacks executed before teleporting to a new angle (e.g. 2 attacks -> teleport -> 2 attacks)
    infinityBlitzDamage: 15,          // Damage per True Damage strike during Level 8 speed-blitz
    infinityBlitzTeleportDistance: 18, // Teleport offset distance around opponent
    infinityBlitzWheelSpinSpeed: 0.08,  // Continuous Wheel Rotation Speed during Level 8 Speed-Blitz stance (smaller = slower majestic spin e.g. 0.06; larger = faster e.g. 0.20)
    infinityBlitzCooldownFrames: 800,   // Cooldown (frames) before Level 8 Speed-Blitz can re-trigger (10 seconds)
    infinityBlitzTeleportSpeedMultiplier: 0.05, // Travel duration speed multiplier during blitz stance teleports (smaller = faster, e.g. 0.20 * 15 frames = 3 frame travel)
    infinityBlitzStrikeSlowDurationFrames: 15, // Slow duration applied to enemy upon landing a speed-blitz strike (15 frames)
    infinityBlitzStrikeSlowMultiplier: 0.40,   // Slow movement multiplier (0.40 = 40% speed / 60% slow)

    // Divine Shout (AoE Shockwave Roar)
    shoutCooldown: 1000,             // 8 seconds cooldown between divine shouts
    shoutWindupFrames: 0,           // Instant shockwave release without stopping or standing still
    shoutRadius: 180,               // Shockwave blast radius
    shoutDamage: 30,                // Damage dealt to enemies caught in shockwave
    shoutKnockback: 18,             // Knockback force applied to enemies
    shoutSlowDurationFrames: 120,     // Slow duration in frames applied to caught enemies (120 = 2.0 seconds)
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
    blitzHitInterval: 15,            // RAPID ATTACK SPEED: Frame interval between each rapid melee hit (smaller = faster rapid strikes!)
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
    neutralStanceCooldownFrames: 150, // Recharge cooldown (frames) before close-quarters attack-teleport stance can re-trigger (~3.0s at 60fps)

    // Reverse Cursed Technique (RCT / Divine Healing at Low HP & Adaptation)
    enableRCTHeal: true,              // Toggle on/off Reverse Cursed Technique healing
    rctHealFlatAmount: 100,            // Heals a flat 35 HP on each wheel rotation click
    rctHealLevelInterval: 1,         // Heal on each adaptation level (every wheel rotation!)
    defBuffPerClickPercent: 0.01,       // Defense boost per wheel click (0.05 = 5% damage reduction per stage)
    maxDefBuffPercent: 0.50,            // Maximum defense damage reduction cap (0.50 = 50% max reduction)
    ccTenacityPerClickPercent: 0.075,    // CC tenacity speed factor per wheel click (0.075 = 7.5% speed/KB resistance per stage)
    maxCcTenacityPercent: 0.60,         // Maximum speed/KB resistance factor under stasis (0.60 = 60% max)

    // Fatal Damage Adaptation (General rolling damage window wheel click)
    fatalAdaptWindowFrames: 400,     // Rolling window duration (frames) — ~6.6 seconds window
    fatalDamageThresholdPct: 0.15,  // 8% max HP damage threshold triggers wheel click (ensures all 8 wheel clicks & RCT heals occur)
    fatalAdaptCooldownFrames: 30,    // Cooldown (frames) between wheel clicks (30 = 0.5s)

    // Teleportation Speed & Afterimage Visibility Settings
    afterimageOpacity: 0.50,         // Visibility / opacity of speed afterimage ghosts (0.10 faint to 1.0 solid)
    adaptationDashSpeedFrames: 10,   // Teleportation travel speed / frames during flash-dash (smaller = faster instant teleport!)

    // Parry mechanic
    parryChancePerStage: 0.08,        // +8% parry chance per gold adaptation stage (max 75%)
    parryMaxChance: 0.75,             // Maximum parry/block chance cap (75%)
    parryDurationFrames: 25,          // Duration (frames) of snappy blade parry pose
    guardDurationFrames: 60,          // Duration (frames) of crossed-arm face guard pose
    parryDeflectionPushForce: 5.5,    // Pushback force applied to attacker upon blade parry
    guardDeflectionPushForce: 4.0,    // Pushback force applied to attacker upon guard block
    parryDeflectionRecoilForce: 2.0,  // Recoil force applied to Mahoraga upon blade parry
    guardDeflectionRecoilForce: 1.5,  // Recoil force applied to Mahoraga upon guard block

    // Counter & Melee Knockback Physics
    teleportCounterDamage: 22,        // Damage dealt by Stage 2+ Teleport Adaptation counter strike
    heavyPunchKnockbackForce: 18.0,   // Knockback force for heavy off-hand punch impacts
    adaptationStrikeKnockbackForce: 42.0, // Knockback launch force for Adaptation Strike counter
    blitzKineticKnockbackForce: 16.0, // Knockback force for random kinetic punch procs during blitz

    // Level 8 Wall Slam Throw Mechanics
    wallSlamImpaleLiftHeight: 35,      // Visual height (z-axis) when opponent is lifted on sword
    wallSlamImpaleHoldFrames: 50,      // Duration (frames) opponent is held in the air on the sword
    wallSlamPunchHitpause: 15,          // Frames of freeze/hitpause when the punch lands before they are launched
    wallSlamThrowSpeed: 45.0,          // Supersonic velocity at which opponent is hurled to the wall
    wallSlamImpactDamage: 20,          // Damage taken upon slamming into the wall
    wallSlamParalyzeDuration: 150,      // Duration (frames) opponent is paralyzed after hitting the wall
    wallSlamMenacingStandoff: 50,      // Delay (frames) Mahoraga waits before dashing to the paralyzed opponent
    wallSlamStandoffDuration: 50,      // Alias for menacing standoff duration (visual sync)
    wallSlamFollowupDamage: 25,        // Damage dealt on the initial execution strike upon reaching the wall-pinned target
    wallSlamBlitzHitsCount: 10,        // Total rapid hits in the Wall Slam execution flurry
    wallSlamBlitzHitInterval: 10,       // Frame interval between each rapid hit during Wall Slam flurry (smaller = faster)
    wallSlamBlitzDuration: 120,        // Total duration (frames) of the Wall Slam execution flurry

    // Divine Shout Audio
    shoutSFX: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
    shoutVolume: 2.2,
};
