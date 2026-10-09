// ─────────────────────────────────────────────
// Naoya Zenin — Projection Sorcery Prodigy Config
// ─────────────────────────────────────────────

export const naoyaConfig = {
  bossTitle: 'Projection Sorcery Prodigy',
  title: 'Hei Commander',

  // Base Attributes
  hp: 190,
  speed: 6.6,
  moveSpeed: 12.6,
  r: 25,
  radius: 25,
  color: '#76E042', // Electric Lime
  themeColor: '#76E042',
  secondaryColor: '#C8E64A', // Pale Gold
  filmInkColor: '#12141A',
  shutterCyanColor: '#00F2FE',
  startX: 300,
  startY: 250,
  startVx: 1.2,
  startVy: 1.1,
  damage: 8,
  cooldown: 40,
  projectileSpeedMultiplier: 1.0,
  ability: 'Projection Sorcery (24 FPS)',
  desc: 'Inheritor of Projection Sorcery from Jujutsu Kaisen. Divides 1s into 24 frames to accelerate to supersonic speeds. Traps enemies who fail the 24 FPS rule inside frozen film frames with palm strikes, executing with Mach-speed flurry slashes.',

  // Passive: Projection Sorcery (Permanent Speed & Evade Stacking on Hit)
  enableProjectionSorcery: true,
  maxFrameStacks: 20,               // Max speed & evade stacks
  speedBonusPerStack: 0.50,         // +0.50 permanent movement speed per hit
  baseEvadeChance: 0.05,            // 5% starting base evade chance
  evadeBonusPerStack: 0.04,         // +4% permanent evade chance per hit stack
  maxEvadeChance: 0.30,             // 70% max evade cap
  subsonicOverdriveThreshold: 5,    // At 5+ stacks, gains afterimages & speed lines
  projectedFrameLeadOffset: 1.0,    // Tight forward spawn distance multiplier relative to radius
  projectedFrameStepDistance: 0.85, // Step trigger radius threshold relative to radius

  // Idle & Movement Afterimages (24 FPS Trailing Ghost Frames)
  enableMovementAfterimages: true,   // ⚡ Enable discrete afterimage trail during normal movement / combat
  movementAfterimageInterval: 10,     // ⚡ How often (frames) a trailing afterimage spawns while moving (lower = denser trail)
  movementAfterimageAlpha: 0.65,     // ⚡ Initial opacity of each movement afterimage (0.10 to 1.0)
  movementAfterimageLifespanFrames: 50, // ⚡ Duration (frames) each idle/movement afterimage lasts before fading out 1 by 1 (e.g. 15 = fast, 40 = long trail)
  movementAfterimageFadeEase: 1.15,  // ⚡ Fade-out dissolve curve (1.0 = linear, >1.0 = smooth ease-out)
  movementAfterimageMinSpeed: 0.8,   // ⚡ Minimum movement speed threshold to spawn trailing afterimages
  movementAfterimageShockwaves: false, // ⚡ Spawn expanding sonic shockwave ring when each idle/movement afterimage pops into existence (disabled)
  movementAfterimageShockwaveRadiusMult: 1.8, // ⚡ Shockwave expansion size relative to fighter radius
  movementAfterimageSFX: false,      // ⚡ Subtle step SFX on each movement afterimage pop

  // Passive: 24-Frame Palm Touch & Frame Stasis Freeze
  enableFrameFreeze: 1,             // ⚡ Enabled when tantoCooldown is UP
  frameFreezeChance: 0.25,          // ⚡ Trigger chance (0.0 to 1.0, 35% chance per flurry sequence so it doesn't trigger too frequently)
  frameFreezeCooldown: 500,         // ⚡ Synced with tantoCooldown
  frameFreezeVulnerability: 0.30,   // +30% bonus True Damage taken while frozen
  maxDisruptionsForStasis: 1,       // Triggers on flurry hit once tantoCooldown is UP
  frameShatterDamage: 18,           // AOE shatter damage upon breaking out
  frameShatterRadius: 75,

  // Primary Attack: Rapid 24 FPS Hypersonic Brawler Punch Flurry Barrage (Attack-Teleport-Attack Sequence)
  meleeReach: 72,
  meleeArc: (140 * Math.PI) / 180,  // 140° frontal arc
  basicComboHits: 10,               // ⚡ How many total punches in a flurry sequence (e.g. 10, 20, 30)
  flurryPunchesPerTeleport: 0,      // ⚡ How many punches Naoya throws at each teleport angle (e.g. 1 = teleport every punch, 3 = 3 punches per teleport)
  flurryStrikeIntervalFrames: 8,   // ⚡ Speed of each attack (lower = faster! 3 frames = 20 attacks/sec)
  flurryAngleStep: (155 * Math.PI) / 180, // ⚡ Increased teleport jump angle (~155° cross-jump across victim)
  flurryRandomAngleSpread: (110 * Math.PI) / 180, // ⚡ Increased randomness spread (±55° random jitter per teleport)
  flurryOrbitDistance: 24,         // Surround distance when teleporting around the target
  flurryRandomOrbitJitter: 16,      // ⚡ Random distance variation (px) for close/far punch depth (16px jitter)
  flurryLungeSpeed: 2.5,
  punchDamage: 5,                  // Damage per flurry punch
  punchComboFinisherDamage: 18,    // Bonus damage on the final finisher punch
  punchCooldown: 40,               // Cooldown between full flurry bursts (~0.66s)
  punchKnockback: 16,              // Knockback applied ONLY on the final finisher punch
  tantoDamage: 4,                  // Backward compatibility alias
  tantoComboFinisherDamage: 30,
  tantoCooldown: 500,
  knifeStabFrames: 50,              // ⚡ Total duration of the smooth tanto stab finisher animation (frames)
  tantoStrikeFrames: 30,
  tantoRecoveryFrames: 8,
  maxStacksPerFlurry: 5,            // ⚡ Maximum speed & evade stacks gained per flurry sequence
  flurryAfterimageLifespanFrames: 45, // ⚡ Blue projection ghost afterimage lifespan (frames) during flurry
  flurryAfterimageAlpha: 1.0,          // ⚡ Starting opacity for flurry blue projection ghost afterimages

  // Skill 1: Frame Blitz (Nijūyon Koma Senkō)
  enableFrameBlitz: 0,
  skill1Cooldown: 330,              // 5.5s (330 frames)
  skill1Damage: 24,
  skill1DashDist: 220,
  skill1DashFrames: 1,
  skill1StasisDuration: 60,

  // Skill 2: Sonic Boom Rebound Kick (Onpoku Kyaku)
  enableSonicKick: 1,
  skill2Cooldown: 480,              // 8.0s (480 frames)
  skill2Damage: 26,
  skill2WallImpactDamage: 18,
  skill2ShockwaveRadius: 150,
  skill2SlowDuration: 105,          // 1.75s (105 frames)
  skill2SlowMultiplier: 0.50,       // 50% slow

  // Ultimate: 24 FPS Mach 3 Runway Breach — Out-of-Bounds Acceleration & Sonic Shatter
  enableUltimate: 1,
  ultCooldown: 1440,                // 24.0s (1440 frames)
  ultPostComboDelayFrames: 120,     // ⚡ Buffer delay (frames) after completing a tanto stab finisher before ultimate can be cast (~2.0s cooldown buffer)
  ultStartupPauseFrames: 28,        // ⚡ Duration (frames) of the initial arena time-stop pause where Naoya stops before running (~0.45s)
  ultRunwayRadiusX: 10000,           // ⚡ Runway Path Distance (Horizontal width radius in px — increase to make path wider)
  ultRunwayRadiusY: 10000,           // ⚡ Runway Path Distance (Vertical height radius in px — increase to make path longer/taller)
  ultRunwaySpeedRate: 0.0048,       // ⚡ Fixed runway speed rate per frame (lower = longer sprint duration, higher = faster sprint)
  ultRunwayStartSpeedMult: 0.40,    // ⚡ Initial slow takeoff acceleration multiplier (ultra-smooth, slow startup glide into path)
  ultRunwayEndSpeedMult: 1.40,      // ⚡ Peak Mach 3 acceleration multiplier upon slamming into target
  ultRunwayAccelPower: 2.30,        // ⚡ Progressive acceleration curve exponent (Smooth ease-in ramp into Mach 3)
  ultRunwayAfterimageCount: 52,     // ⚡ Number of afterimages distributed along the runway path
  ultRunwaySpacingPower: 1.15,      // ⚡ Non-linear compression exponent (afterimages start far apart and get closer & closer together)
  ultAfterimageAlpha: 0.45,         // ⚡ Initial opacity for runway afterimage ghost bodies (0.15 to 0.80)
  ultAfterimageLifespanFrames: 36,  // ⚡ Duration (frames) each afterimage lasts before fading out 1 by 1 (e.g. 20 = fast fade, 50 = long trail)
  ultAfterimageFadeEase: 1.20,      // ⚡ Fade-out curve (1.0 = linear, >1.0 = smooth ease-out dissolve)
  ultFinisherDamage: 150,            // Direct Mach 3 impact True Damage
  ultTimeStopDuration: 240,         // Target freeze duration during runway sprint
  ultCameraZoom: 1.00,              // Cinematic camera zoom when tracking Naoya during runway sprint
  ultBreachStraightDist: 140,       // ⚡ Length (px) of the dedicated straight supersonic runway breach approach into the target
  ultImpactMinArmProgress: 0.92,    // ⚡ Minimum runway progress before physical collision with the target is armed
  ultImpactThresholdProgress: 0.985,// ⚡ Terminal runway progress where impact is guaranteed even if target moved
  ultPostStrikeBreatherFrames: 24,  // ⚡ Duration (frames) of Naoya's post-strike breather / recovery cooldown before basic attacks resume
  ultPostStrikeSlowMultiplier: 0.30, // ⚡ Heavy movement speed slow multiplier while recovering from Mach 3 crash (30% speed)
  ultPostStrikeReboundSpeed: 0.0,   // ⚡ Clean post-strike standstill at impact point facing the victim
  ultWallLaunchSpeed: 10.0,         // ⚡ Launch velocity pushing victim into the arena wall on impact
  ultWallPinDurationFrames: 50,    // ⚡ Duration (frames) enemy remains pinned to the wall (120 frames = 2.0s at 60fps)
  ultVictimPostCrashSlowDuration: 120, // ⚡ Duration (frames) victim is slowed after wall pin release
  ultVictimPostCrashSlowMultiplier: 0.40, // ⚡ Movement slow multiplier applied to victim (40% speed)

  // ═══════════════════════════════════════════════════════════
  // OPTION B: VENGEFUL CURSE REBIRTH & AWAKENED JET MECHANICS
  // ═══════════════════════════════════════════════════════════
  enableCurseRebirth: 0,         // ⚡ Master toggle for Vengeful Curse Rebirth upon lethal damage (hp <= 0)
  startInCurseForm: false,          // ⚡ Debug / testing toggle to start battle directly in Curse Form
  curseRebirthHpPercent: 0.50,      // ⚡ Reborn with 50% max HP (95 HP)
  curseWombDurationFrames: 60,      // ⚡ Duration (frames) of Cursed Womb cocoon phase before hatching (~1.0s)
  curseWombRepelForce: 9.5,         // ⚡ Concussive knockback impulse repelling nearby entities on cocoon spawn
  curseWombRadius: 30,              // ⚡ Visual cocoon size
  
  // Awakened Stats & Carapace
  curseSpeed: 7.2,                  // ⚡ Base speed in Curse Form
  curseMaxSpeed: 14.5,              // ⚡ Mach 3 top speed
  curseCarapaceFrontalResist: 0.20, // ⚡ Takes 20% reduced damage from frontal incoming attacks
  
  // Ramjet Mach 3 Gauge
  enableMachGauge: 0,            // ⚡ Mach 3 Overdrive Gauge (0-100%)
  machGaugeRampPerSecond: 12,       // ⚡ Passive gauge charge rate per second while moving
  machGaugePerRicochet: 25,         // ⚡ Gauge bonus on arena wall bounce
  machGaugePerHit: 20,              // ⚡ Gauge bonus when landing melee attacks
  machOverdriveDurationFrames: 180, // ⚡ Duration of 100% Mach 3 Overdrive mode (3.0s)
  machRamContactDamage: 18,         // ⚡ Collision body-check damage when rushing through enemies in Mach 3
  machRamKnockback: 14,             // ⚡ Collision pushback
  
  // Awakened Basic Attack: Turbine Carapace Slam & Cursed Claws
  curseMeleeReach: 80,
  curseMeleeArc: (140 * Math.PI) / 180,
  cursePunchDamage: 8,
  cursePunchFinisherDamage: 24,
  cursePunchCooldown: 36,

  // Awakened Skill 1: Mach 3 Supersonic Ramjet (Chōsoku Ramjet)
  enableCurseRamjet: 0,
  curseSkill1Cooldown: 390,          // 6.5s (390 frames)
  curseRamjetChargeFrames: 8,       // Spool-up windup
  curseRamjetTravelFrames: 14,      // Supersonic vector thrust
  curseRamjetDamage: 45,            // Direct pierce damage
  curseRamjetWallImpactDamage: 25,  // Wall-splat rebound damage
  curseRamjetWallPinFrames: 60,     // 1.0s wall pin

  // Awakened Skill 2: Concussive Air Turbine Inhale & Cannon Burst
  enableCurseTurbineCannon: 0,
  curseSkill2Cooldown: 480,          // 8.0s (480 frames)
  curseTurbineInhaleRadius: 220,    // Vacuum suction radius
  curseTurbineInhaleDuration: 18,   // Suction frames
  curseTurbineBurstRadius: 180,     // Shockwave explosion radius
  curseTurbineBurstDamage: 38,      // Shockwave burst damage
  curseTurbineKnockback: 18,        // Concussive repulsion

  // Awakened Ultimate: Domain Expansion — Time Cell Moon Palace (時胞月宮殿 - Tokyū Gesshōkyū)
  enableCurseDomain: 0,
  curseUltCooldown: 1440,            // 24.0s (1440 frames)
  curseDomainDurationFrames: 480,    // 8.0s Domain duration
  curseDomainCellularBleedInterval: 24, // Cellular rupture tick rate (every 24 frames = 0.4s)
  curseDomainCellularBleedDamage: 6, // Bleed true damage per moving step
  curseDomainCellularStunFrames: 6,  // Micro-hitstun on movement breach

  // Sound Configuration & Volumes
  sounds: {
    punchHit: [
      'Assets/Sound Effects/Attacks/heavypunch1.mp3',
      'Assets/Sound Effects/Attacks/heavypunch2.mp3'
    ],
    punchHits: [
      'Assets/Sound Effects/Attacks/heavypunch1.mp3',
      'Assets/Sound Effects/Attacks/heavypunch2.mp3'
    ],
    finisherPunch: 'Assets/Sound Effects/Attacks/heavypunch2.mp3',
    swordSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    runwayAfterimageShockwave: 'Assets/Sound Effects/NaoyaSFX/Naoya-pathafterimages-shockwaves.wav',
    heavySmash: 'Assets/Sound Effects/Attacks/heavypunch3.mp3',
    carCrashImpact: 'Assets/Sound Effects/Attacks/heavypunch3.mp3',
    frameStasis: 'Assets/Sound Effects/Skills/enhance.mp3',
    frameBlitz: 'Assets/Sound Effects/Skills/toji-firstseq-teleport.mp3',
    sonicKick: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
    flurryStrike: 'Assets/Sound Effects/Skills/toji-2stseq-2ndweaponAttack.mp3',
    shatterFinisher: 'Assets/Sound Effects/Skills/yuji-blackflash.mp3',
    glassBreak: 'Assets/Sound Effects/NaoyaSFX/Naoya_glass_break.mp3',
    knifeTakeoff: 'Assets/Sound Effects/NaoyaSFX/Naoya_takeoff_knife.mp3',
    knifeStabs: 'Assets/Sound Effects/NaoyaSFX/Naoya_stabs.mp3',
    curseWombPulse: 'Assets/Sound Effects/Skills/enhance.mp3',
    curseRebirthScream: 'Assets/Sound Effects/NaoyaSFX/Naoya_glass_break.mp3',
    ramjetSpool: 'Assets/Sound Effects/Skills/genos-dash-noise.mp3',
    ramjetBlast: 'Assets/Sound Effects/Attacks/explosion.mp3',
    turbineInhale: 'Assets/Sound Effects/Skills/woosh.mp3',
    domainExpansion: 'Assets/Sound Effects/Skills/enhance.mp3'
  },
  soundVolumes: {
    punchHit: 0.85,
    finisherPunch: 0.95,
    swordSwing: 0.80,
    runwayAfterimageShockwave: 1.85,
    heavySmash: 1.25,
    carCrashImpact: 1.25,
    frameStasis: 0.95,
    frameBlitz: 1.00,
    sonicKick: 1.10,
    flurryStrike: 1.05,
    shatterFinisher: 1.25,
    glassBreak: 1.00,
    knifeTakeoff: 1.05,
    knifeStabs: 1.20,
    curseWombPulse: 0.95,
    curseRebirthScream: 1.25,
    ramjetSpool: 1.00,
    ramjetBlast: 1.20,
    turbineInhale: 0.85,
    domainExpansion: 1.15
  }
};
