// ─────────────────────────────────────────────
// Mahoraga — Divine General Config
// ─────────────────────────────────────────────
export const mahoragaConfig = {
    // ── Base Attributes ──
    hp: 250,
    speed: 6.5,
    moveSpeed: 6.5,
    r: 30,
    radius: 30,
    color: '#F5F5DC', // Beige / Off-White
    themeColor: '#F5F5DC',
    startX: 300,
    startY: 250,
    startVx: 1.1,
    startVy: 1.1,
    damage: 15,
    cooldown: 60,
    projectileSpeedMultiplier: 1.0,
    isAvailableInArena: true,       // Toggle to show/hide Mahoraga in character select screen
    ability: 'Wheel of Adaptation',
    desc: 'Adapts to damage types. Increase chance of parry and blocks to incoming attacks for each wheel rotation.',

    // ── Neutral Close-Quarters Attack-Teleport Stance ──
    neutralAttacksPerTeleport: 2,
    neutralAttackInterval: 20,
    neutralTeleportDelay: 12,
    neutralTeleportDistance: 55,

    // ── Throw Barrage & Blitz Finishing ──
    throwCooldown: 1000,
    throwMinDistance: 180,
    throwSpreadAngle: 0.28,
    throwDamage: 14,
    throwSpeed: 25,
    throwKnockback: 6.0,
    throwBarrageCount: 10,
    throwBarrageInterval: 5,
    throwAimRotationSpeed: 0.06,
    blitzHitsCount: 6,
    blitzHitDamage: 16,
    blitzFinisherDamage: 35,
    blitzFinisherKnockback: 35.0,

    // ── Adaptation & RCT Mechanics ──
    maxAdaptationStages: 8,         // Total adaptation stages (8 clicks = full 360° rotation of Eight-Handled Wheel)
    adaptationSpeedBoostPerStage: 0.15, // +15% movement speed multiplier per gold adaptation stage
    rctRegenPerStage: 0.03,          // Passive RCT HP regeneration per frame per adaptation level (+1.8 HP/sec per stage)
    enableRCTHeal: true,             // Toggle on/off Reverse Cursed Technique flat healing on wheel click
    rctHealFlatAmount: 100,          // Heals a flat 100 HP on each wheel rotation click
    defBuffPerClickPercent: 0.01,    // Defense boost per wheel click (0.01 = 1% damage reduction per stage)
    maxDefBuffPercent: 0.50,         // Maximum defense damage reduction cap (0.50 = 50% max reduction)
    ccTenacityPerClickPercent: 0.075,// CC tenacity resistance factor per wheel click (+7.5% resistance per stage)
    maxCcTenacityPercent: 0.60,      // Maximum speed/KB resistance factor under stasis (60% max)
    fatalAdaptWindowFrames: 400,     // Rolling damage accumulator window (~6.6 seconds at 60fps)
    fatalDamageThresholdPct: 0.15,   // 15% max HP damage threshold within window triggers wheel adaptation click
    fatalAdaptCooldownFrames: 30,    // Cooldown frames between wheel clicks (30 frames = 0.5s)

    // ── Visuals, Screen Dim & Afterimages ──
    enableGoldenScreenDim: true,     // Toggle on/off dark golden cinematic screen dimming on wheel rotation
    goldenDimOpacity: 0.92,          // Maximum opacity of the golden dimming screen overlay
    wheelClickDuration: 25,          // Frame duration for 1-spoke wheel click rotation animation & flare
    afterimageOpacity: 0.50,         // Visibility / opacity of speed afterimage ghosts (0.10 to 1.0)
    afterimageLifetimeFrames: 12,    // Lifetime frames for teleport afterimage ghosts (12 frames = ~0.20s)
    adaptationDashSpeedFrames: 10,   // Supersonic flash-dash travel frame duration (smaller = faster)

    // ── Sword of Extermination & Basic Melee Attacks ──
    swordRange: 110,                // Melee reach (110px frontal arc) for Sword of Extermination
    swordCooldown: 25,              // Frames between sword strikes (0.5s at 60fps)
    swordDamage: 15,                // True damage dealt by Sword of Extermination
    swordArcRadians: Math.PI * 1.3, // Frontal arc angle (in radians) for multi-target melee swings (~234°)
    swordAnimFrames: 18,            // Duration (frames) of sword chop swing animation
    punchAnimFrames: 18,            // Duration (frames) of off-hand heavy punch animation
    punchFrequencyStance: 7,        // Every Nth basic attack is a heavy punch inside stance
    punchFrequencyNormal: 5,        // Every Nth basic attack is a heavy punch outside stance
    punchBaseKnockbackChance: 0.40, // Base chance (40%) for heavy punch to trigger explosive knockback
    punchKnockbackChancePerStage: 0.04, // +4% knockback chance per adaptation stage
    punchMaxKnockbackChance: 0.65,  // Maximum knockback chance cap (65%)
    punchHitStunFrames: 16,         // Hit stun frames applied to targets hit by heavy punch knockback
    swordHitStunFrames: 8,          // Hit stun frames applied to targets hit by normal sword strikes
    swordBasePushForce: 4.0,        // Normal pushback velocity for basic strikes
    heavyPunchKnockbackForce: 18.0, // Knockback force for heavy off-hand punch impacts
    sakugaImpactDurationFrames: 8,  // Duration (frames) of Sakuga anime impact frame on sword combo hits
    approachSteerForce: 0.45,       // Approach steering force towards opponent in melee combat

    // ── Blade Parry & Guard Mechanics ──
    parryChancePerStage: 0.08,       // +8% parry/block chance per gold adaptation stage
    parryMaxChance: 0.75,            // Maximum parry/block chance cap (75%)
    parryDurationFrames: 25,         // Duration (frames) of snappy blade parry pose
    guardDurationFrames: 60,         // Duration (frames) of crossed-arm face guard pose
    parryDeflectionPushForce: 5.5,   // Pushback force applied to attacker upon blade parry
    guardDeflectionPushForce: 4.0,   // Pushback force applied to attacker upon guard block
    parryDeflectionRecoilForce: 2.0, // Recoil force applied to Mahoraga upon blade parry
    guardDeflectionRecoilForce: 1.5, // Recoil force applied to Mahoraga upon guard block

    // ── Active AoE Cleave Skill ──
    cleaveCooldown: 600,             // 10 seconds cooldown for Active AoE Cleave
    cleaveRadius: 150,               // Range radius of the AoE Cleave
    cleaveDamage: 40,                // True damage dealt by AoE Cleave
    cleaveWindupFrames: 0,           // Windup frames before Cleave (0 = instant release on the move)

    // ── Divine Shout (AoE Shockwave Roar) ──
    shoutCooldown: 1000,             // Cooldown (frames) between divine shouts (~16.6s)
    shoutRadius: 180,                // Shockwave blast radius
    shoutDamage: 30,                 // Damage dealt to enemies caught in shockwave
    shoutKnockback: 18,              // Knockback force applied to caught enemies
    shoutSlowDurationFrames: 120,    // Slow duration in frames applied to caught enemies (120 = 2.0s)
    shoutSlowMultiplier: 0.50,       // Slow speed multiplier (0.50 = 50% slow movement)

    // ── Cursed Energy Debris Throw (Rapid Barrage Ranged Skill) ──
    throwCooldown: 1000,             // Cooldown between rapid throw barrages
    throwMinDistance: 240,           // Minimum distance required to trigger rapid throw skill
    throwBarrageCount: 10,           // Number of rapid projectiles hurled in a single barrage
    throwBarrageInterval: 10,        // Frames between each rapid throw in the barrage (~0.16s)
    throwDamage: 14,                 // Damage per thrown projectile in barrage
    throwSpeed: 20,                  // Projectile velocity
    throwKnockback: 7.0,             // Physical pushback force per projectile impact
    throwAimRotationSpeed: 0.06,     // Aim tracking rotation speed during throw barrage

    // ── Hand-to-Hand Blitz Sequence (Melee Flurry + Teleport Chase) ──
    blitzWindupFrames: 14,           // Windup transition frames before starting H2H flurry (~0.23s)
    blitzTotalDurationFrames: 150,   // Total max duration for the entire H2H blitz state (~2.5s)
    blitzMinStayFrames: 20,          // Minimum duration (frames) Mahoraga stays at location before teleporting again
    blitzHitsCount: 10,              // Total number of rapid melee hits in H2H flurry
    blitzHitInterval: 15,            // Frame interval between each rapid melee hit
    blitzAttackAnimDuration: 7,      // Frame duration for each punch/chop stroke animation
    blitzHitDamage: 15,              // Damage per rapid martial arts strike
    blitzHitPushbackForce: 4.5,      // Slow pushback distance per rapid hit
    blitzTeleportDistanceThreshold: 200, // Distance threshold to trigger on-demand teleport chase
    blitzFinisherDamage: 35,         // Damage for final finisher cleave
    blitzFinisherKnockback: 35,      // Explosive knockback launch velocity for finisher

    // ── Neutral Close-Quarters Attack-Teleport Stance ──
    enableCloseQuartersTeleport: true, // Toggle on/off close-quarters teleporting
    neutralAttacksPerTeleport: 3,    // Number of attacks before teleporting to a flank angle
    neutralAttackInterval: 50,       // Frame interval between consecutive attacks (matches swordCooldown: 50)
    neutralTeleportDelay: 5,         // Frame delay after teleporting before starting next attack sequence
    neutralTeleportDistance: 100,    // Teleport distance offset around opponent
    neutralStanceDurationFrames: 200,// Total active duration (frames) of close-quarters stance (~3.33s)
    neutralStanceCooldownFrames: 150,// Recharge cooldown (frames) before stance can re-trigger (~2.5s)

    // ── Level 8 Wall Slam & Supersonic Execution Combo ──
    wallSlamImpaleLiftHeight: 35,     // Visual height (z-axis) when opponent is hoisted on sword
    wallSlamImpaleHoldFrames: 50,     // Duration (frames) opponent is held in the air on the sword
    wallSlamPunchHitpause: 15,        // Frames of freeze/hitpause when the punch lands before wall launch
    wallSlamThrowSpeed: 45.0,         // Supersonic velocity at which opponent is hurled to the wall
    wallSlamImpactDamage: 20,         // Damage taken upon slamming into the wall
    wallSlamParalyzeDuration: 150,     // Duration (frames) opponent is paralyzed on wall contact
    wallSlamMenacingStandoff: 50,     // Delay (frames) Mahoraga pauses menacingly before dashing to the wall-pinned target
    wallSlamFollowupDamage: 25,       // Damage dealt on the initial execution strike upon reaching target
    wallSlamBlitzHitsCount: 10,       // Total rapid hits in the Wall Slam execution flurry
    wallSlamBlitzHitInterval: 10,      // Frame interval between each rapid hit during Wall Slam flurry
    wallSlamBlitzDuration: 120,       // Total duration (frames) of the Wall Slam execution flurry

    // ── Level 8 Max Adaptation: Speed-Blitz Mode ──
    infinityBlitzDurationFrames: 300,  // Active duration (frames) for Level 8 Speed-Blitz stance (5 seconds at 60fps)
    infinityBlitzInterval: 20,         // Frame interval between continuous strikes
    infinityBlitzAttacksPerTeleport: 5,// Number of attacks executed before teleporting to a new angle
    infinityBlitzDamage: 15,           // Damage per strike during Level 8 speed-blitz
    infinityBlitzTeleportDistance: 18, // Teleport offset distance around opponent
    infinityBlitzCooldownFrames: 800,  // Cooldown (frames) before Speed-Blitz can re-trigger (~13.3s)
    infinityBlitzTeleportSpeedMultiplier: 0.05, // Speed multiplier for instant position snaps during blitz
    infinityBlitzStrikeSlowDurationFrames: 15,  // Slow duration applied to enemy upon landing a speed-blitz strike
    infinityBlitzStrikeSlowMultiplier: 0.40,    // Slow movement multiplier (0.40 = 60% slow)

    // ── Counter & Melee Knockback Physics ──
    teleportCounterDamage: 22,         // Damage dealt by Stage 2+ Teleport Adaptation counter strike
    heavyPunchKnockbackForce: 18.0,    // Knockback force for heavy off-hand punch impacts
    adaptationStrikeKnockbackForce: 42.0, // Knockback launch force for Adaptation Strike counter
    blitzKineticKnockbackForce: 16.0,  // Knockback force for random kinetic punch procs during blitz

    // ── Audio configuration, volume & timing delay adjustments (delays measured in frames @ 60fps) ──
    sounds: {
        // Dharma Wheel Adaptation
        wheelClick: 'Assets/Sound Effects/Skills/mahoraga-wheelclick.mp3',
        wheelEnhance: 'Assets/Sound Effects/Skills/enhance.mp3',

        // Sword of Extermination & Melee Combat
        swordSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
        fleshHit: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
        punchSounds: [
            'Assets/Sound Effects/Attacks/heavypunch1.mp3',
            'Assets/Sound Effects/Attacks/heavypunch2.mp3',
            'Assets/Sound Effects/Attacks/heavypunch3.mp3'
        ],
        parry: 'Assets/Sound Effects/Skills/shieldblock2.mp3',
        shieldBlock: 'Assets/Sound Effects/Skills/shieldblock2.mp3',

        // Movement, Teleport & Flash Blitz
        dash: 'Assets/Sound Effects/Skills/dash5.mp3',
        teleportDash: 'Assets/Sound Effects/Skills/dash3.mp3',

        // Divine Shout & Ground Impact
        shout: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
        shoutImpact: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
        shoutExplosion: 'Assets/Sound Effects/Attacks/explosion.mp3',

        // Level 8 Wall Slam & Supersonic Execution Combo
        wallSlamLunge: 'Assets/Sound Effects/Skills/dash5.mp3',
        wallSlamImpale: 'Assets/Sound Effects/Skills/backstab.mp3',
        wallSlamImpact: 'Assets/Sound Effects/Attacks/fleshhit.mp3'
    },
    soundVolumes: {
        wheelClick: 0.50,
        wheelEnhance: 0.50,
        swordSwing: 0.50,
        fleshHit: 0.50,
        punch: 0.20,
        parry: 0.50,
        shieldBlock: 0.50,
        dash: 0.50,
        teleportDash: 0.50,
        shout: 0.50,
        shoutImpact: 0.50,
        shoutExplosion: 0.50,
        wallSlamLunge: 0.50,
        wallSlamImpale: 0.50,
        wallSlamImpact: 0.50
    },
    soundDelays: {
        wheelClick: 0,
        wheelEnhance: 0,
        swordSwing: 0,
        fleshHit: 0,
        punch: 0,
        parry: 0,
        shieldBlock: 0,
        dash: 0,
        teleportDash: 0,
        shout: 0,
        shoutImpact: 0,
        shoutExplosion: 0,
        wallSlamLunge: 0,
        wallSlamImpale: 0,
        wallSlamImpact: 0
    }
};

