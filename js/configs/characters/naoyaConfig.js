// ─────────────────────────────────────────────
// Naoya Zenin — Projection Sorcery Prodigy Config
// ─────────────────────────────────────────────

export const naoyaConfig = {
  bossTitle: 'Projection Sorcery Prodigy',
  title: 'Hei Commander',

  // Base Attributes
  hp: 190,
  speed: 6.6,
  moveSpeed: 10.6,
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
  maxFrameStacks: 30,               // Max speed & evade stacks
  speedBonusPerStack: 0.50,         // +0.50 permanent movement speed per hit
  baseEvadeChance: 0.05,            // 5% starting base evade chance
  evadeBonusPerStack: 0.04,         // +4% permanent evade chance per hit stack
  maxEvadeChance: 0.30,             // 70% max evade cap
  subsonicOverdriveThreshold: 5,    // At 5+ stacks, gains afterimages & speed lines
  projectedFrameLeadOffset: 1.0,    // Tight forward spawn distance multiplier relative to radius
  projectedFrameStepDistance: 0.85, // Step trigger radius threshold relative to radius

  // Passive: 24-Frame Palm Touch & Frame Stasis Freeze
  enableFrameFreeze: 0,
  frameFreezeDuration: 60,          // 1.0s duration (60 frames)
  frameFreezeCooldown: 1000,         // ⚡ Cooldown between passive palm touch freezes (4.0s / 240 frames)
  frameFreezeVulnerability: 0.30,   // +30% bonus True Damage taken while frozen
  maxDisruptionsForStasis: 3,       // Number of basic disruptions required to trigger stasis
  frameShatterDamage: 18,           // AOE shatter damage upon breaking out
  frameShatterRadius: 75,

  // Primary Attack: Rapid 24 FPS Hypersonic Brawler Punch Flurry Barrage (Attack-Teleport-Attack Sequence)
  meleeReach: 72,
  meleeArc: (140 * Math.PI) / 180,  // 140° frontal arc
  basicComboHits: 30,               // ⚡ How many total punches in a flurry sequence (e.g. 10, 20, 30)
  flurryPunchesPerTeleport: 0,      // ⚡ How many punches Naoya throws at each teleport angle (e.g. 1 = teleport every punch, 3 = 3 punches per teleport)
  flurryStrikeIntervalFrames: 8,   // ⚡ Speed of each attack (lower = faster! 3 frames = 20 attacks/sec)
  flurryOrbitDistance: 24,         // Surround distance when teleporting around the target
  flurryLungeSpeed: 2.5,
  punchDamage: 4,                  // Damage per flurry punch
  punchComboFinisherDamage: 18,    // Bonus damage on the final finisher punch
  punchCooldown: 40,               // Cooldown between full flurry bursts (~0.66s)
  punchKnockback: 16,              // Knockback applied ONLY on the final finisher punch
  tantoDamage: 4,                  // Backward compatibility alias
  tantoComboFinisherDamage: 18,
  tantoCooldown: 40,
  tantoKnockback: 16,
  tantoStrikeFrames: 30,
  tantoRecoveryFrames: 8,
  maxStacksPerFlurry: 4,            // ⚡ Maximum speed & evade stacks gained per flurry sequence

  // Skill 1: Frame Blitz (Nijūyon Koma Senkō)
  enableFrameBlitz: 0,
  skill1Cooldown: 330,              // 5.5s (330 frames)
  skill1Damage: 24,
  skill1DashDist: 220,
  skill1DashFrames: 1,
  skill1StasisDuration: 60,

  // Skill 2: Sonic Boom Rebound Kick (Onpoku Kyaku)
  enableSonicKick: 0,
  skill2Cooldown: 480,              // 8.0s (480 frames)
  skill2Damage: 26,
  skill2WallImpactDamage: 18,
  skill2ShockwaveRadius: 150,
  skill2SlowDuration: 105,          // 1.75s (105 frames)
  skill2SlowMultiplier: 0.50,       // 50% slow

  // Ultimate: 24 FPS Mach 3 Runway Breach — Out-of-Bounds Acceleration & Sonic Shatter
  enableUltimate: 1,
  ultCooldown: 1440,                // 24.0s (1440 frames)
  ultRunwayRadiusX: 2500,           // ⚡ Runway Path Distance (Horizontal width radius in px — increase to make path wider)
  ultRunwayRadiusY: 3000,           // ⚡ Runway Path Distance (Vertical height radius in px — increase to make path longer/taller)
  ultRunwaySpeedRate: 0.0050,       // ⚡ Fixed runway speed rate per frame (lower = longer sprint duration, higher = faster sprint)
  ultRunwayStartSpeedMult: 0.50,    // ⚡ Initial slow acceleration multiplier (smooth, slow initial slide startup)
  ultRunwayEndSpeedMult: 3.20,      // ⚡ Peak Mach 3 acceleration multiplier upon slamming into target
  ultRunwayAccelPower: 2.10,        // ⚡ Progressive acceleration curve exponent (Smooth ease-in ramp into Mach 3)
  ultRunwayAfterimageCount: 52,     // ⚡ Number of afterimages distributed along the runway path
  ultRunwaySpacingPower: 2.15,      // ⚡ Non-linear compression exponent (afterimages start far apart and get closer & closer together)
  ultAfterimageAlpha: 0.38,         // ⚡ Smooth semi-transparent opacity for runway afterimage ghost bodies (0.15 to 0.60)
  ultFinisherDamage: 75,            // Direct Mach 3 impact True Damage
  ultTimeStopDuration: 240,         // Target freeze duration during runway sprint
  ultCameraZoom: 1.00,              // Cinematic camera zoom when tracking Naoya during runway sprint
  ultBreachStraightDist: 140,       // ⚡ Length (px) of the dedicated straight supersonic runway breach approach into the target
  ultImpactMinArmProgress: 0.92,    // ⚡ Minimum runway progress before physical collision with the target is armed
  ultImpactThresholdProgress: 0.985,// ⚡ Terminal runway progress where impact is guaranteed even if target moved
  ultPostStrikeBreatherFrames: 100,  // ⚡ Duration (frames) of Naoya's post-strike breather / recovery cooldown before basic attacks resume
  ultPostStrikeSlowMultiplier: 0.30, // ⚡ Heavy movement speed slow multiplier while recovering from Mach 3 crash (30% speed)
  ultPostStrikeReboundSpeed: 14.0,  // ⚡ Natural kinetic recoil rebound velocity applied to Naoya on impact
  ultWallLaunchSpeed: 42.0,         // ⚡ Launch velocity pushing victim into the arena wall on impact
  ultWallPinDurationFrames: 50,    // ⚡ Duration (frames) enemy remains pinned to the wall (120 frames = 2.0s at 60fps)
  ultVictimPostCrashSlowDuration: 120, // ⚡ Duration (frames) victim is slowed after wall pin release
  ultVictimPostCrashSlowMultiplier: 0.40, // ⚡ Movement slow multiplier applied to victim (40% speed)

  // Sound Configuration & Volumes
  sounds: {
    swordSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    frameStasis: 'Assets/Sound Effects/Skills/enhance.mp3',
    frameBlitz: 'Assets/Sound Effects/Skills/toji-firstseq-teleport.mp3',
    sonicKick: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
    flurryStrike: 'Assets/Sound Effects/Skills/toji-2stseq-2ndweaponAttack.mp3',
    shatterFinisher: 'Assets/Sound Effects/Skills/yuji-blackflash.mp3'
  },
  soundVolumes: {
    swordSwing: 0.80,
    frameStasis: 0.95,
    frameBlitz: 1.00,
    sonicKick: 1.10,
    flurryStrike: 1.05,
    shatterFinisher: 1.25
  }
};
