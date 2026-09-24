// ─────────────────────────────────────────────
// Zenitsu Agatsuma Character Config
// Demon Slayer: Kimetsu no Yaiba / Demon Slayer Corps
// ─────────────────────────────────────────────

export const zenitsuConfig = {
  bossTitle: 'Thunder Breathing Slayer',
  title: 'Thunder Breathing Slayer',

  // Baseline Attributes
  hp: 310,
  maxHpRatio: 1.0,
  speed: 6.4,
  moveSpeed: 6.4,
  r: 25,
  radius: 25,
  weaponOffsetY: 15.0,        // Y-offset positioning hands & katana lower at belt level
  color: '#F59E0B',           // Lightning Gold
  themeColor: '#F59E0B',
  secondaryColor: '#FBBF24',   // Electric Amber
  accentCyan: '#38BDF8',       // Thunder Spark Cyan
  accentWhite: '#FFFFFF',      // Triangle Haori White
  accentBlack: '#18181B',      // Corps Black
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.0,
  damage: 26,
  cooldown: 24,
  projectileSpeedMultiplier: 1.0,
  ability: 'Thunder Breathing ("Thunderclap and Flash")',
  desc: 'Thunder Breathing godspeed iai swordsman. Awakens unstoppable Battle Trance during crises. Wields 140° Thunder Iai quickdraw slashes, lightspeed First Form: Thunderclap and Flash teleport slashes, Sixfold wall-ricochet flurries, and the Flaming Thunder God dragon ultimate.',

  // Passive 1: Slumbering Thunderclap & Battle Trance
  enableBattleTrance: true,         // Master toggle for Passive 1: Battle Trance
  tranceHpThreshold: 0.35,
  tranceDamageReduction: 0.25,
  tranceCritChance: 1.0,

  // Passive 2: Hyper-Sonic Static Charge
  enableStaticCharge: true,         // Master toggle for Passive 2: Hyper-Sonic Static Charge
  maxStaticCharge: 100,
  staticBurstDamage: 20,
  staticStunFrames: 18,

  // Basic Attack: Thunder Iai Quickdraw & Sheath Flurry (140° Frontal Arc)
  enableBasicAttack: true,          // Master toggle for Basic Attack: Thunder Iai Quickdraw
  katanaArcAngle: Math.PI * 0.778, // ~140 degrees
  katanaReach: 78,
  hit1Damage: 18,
  hit1StunFrames: 6,
  hit2Damage: 22,
  hit2StunFrames: 8,
  hit3Damage: 28,
  hit3Knockback: 22,

  // Skill 1: Thunder Breathing First Form: Thunderclap and Flash (Hekireki Issen)
  enableThunderclap: true,          // Master toggle for Skill 1: Thunderclap and Flash
  thunderclapCooldown: 228,    // 3.8s
  thunderclapChannelDuration: 120,   // Wind-up channel frames (Frames 1-2 Stance & Charge animation)
  thunderclapDashCount: 4,          // 4 consecutive godspeed zig-zag slashes
  thunderclapDashDuration: 2,       // Travel frames per dash
  thunderclapDashPauseFrames: 5,    // Pause/windup frames between each consecutive dash
  thunderclapSpeed: 36.0,
  thunderclapDamage: 14,            // Damage per intermediate dash
  thunderclapFinisherDamage: 38,    // Finisher dash damage
  thunderclapStunFrames: 50,
  dashAudioFadeOutMs: 120,          // Fast audio fade-out in ms the moment all dashes are completed

  // Skill 2: Thunderclap and Flash: Sixfold (Rokuren)
  enableRokuren: false,             // Master toggle for Skill 2: Sixfold (Rokuren)
  rokurenCooldown: 420,        // 7.0s
  rokurenBounces: 6,
  rokurenDamagePerHit: 8,
  rokurenFinisherKnockback: 30,

  // Ultimate: Thunder Seventh Form: Flaming Thunder God (Honoikazuchi no Kami)
  enableFlamingThunderGod: false,   // Master toggle for Ultimate: Flaming Thunder God
  ultimateCooldown: 1440,      // 24.0s
  ultimateDamage: 85,
  ultimateKnockback: 48,
  ultimateTimeStopFrames: 30,

  // ── Audio Assets & Sound Volumes ──
  sounds: {
    // Basic Attack & Iai Slash
    katanaSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    slashHit: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    parry: 'Assets/Sound Effects/Skills/parry.mp3',

    // Skill 1: Thunder Breathing First Form: Thunderclap and Flash (Hekireki Issen)
    stance: 'Assets/Sound Effects/Skills/dash1.mp3',
    inhale: 'Assets/Sound Effects/Skills/Zenitsu-inhale.mp3',
    lockIn: 'Assets/Sound Effects/Skills/parry.mp3',
    electricNoise1: 'Assets/Sound Effects/Skills/Zenitsu-electric-noise1.mp3',
    electricNoise2: 'Assets/Sound Effects/Skills/Zenitsu-electric-noise2.mp3',
    electricNoise3: 'Assets/Sound Effects/Skills/Zenitsu-electric-noise3.mp3',
    electricNoises: [
      'Assets/Sound Effects/Skills/Zenitsu-electric-noise1.mp3',
      'Assets/Sound Effects/Skills/Zenitsu-electric-noise2.mp3',
      'Assets/Sound Effects/Skills/Zenitsu-electric-noise3.mp3'
    ],
    dashNoise: 'Assets/Sound Effects/Skills/Zenitsu-dash-noise.mp3',
    dashSFX: 'Assets/Sound Effects/Skills/Zenitsu-Dash-SFX.mp3',
    dashWhoosh: 'Assets/Sound Effects/Skills/dash1.mp3',
    thunderStrike: 'Assets/Sound Effects/Skills/Zenitsu-dash2.mp3',

    // Skill 2: Sixfold (Rokuren)
    rokurenDash: 'Assets/Sound Effects/Skills/Zenitsu-dash-noise.mp3',
    rokurenSlash: 'Assets/Sound Effects/Attacks/swordswing.mp3',

    // Ultimate: Flaming Thunder God (Honoikazuchi no Kami)
    ultimateCast: 'Assets/Sound Effects/Skills/Zenitsu-Dash-SFX.mp3',
    ultimateImpact: 'Assets/Sound Effects/Attacks/thunderstrike.mp3'
  },
  soundVolumes: {
    katanaSwing: 0.75,
    slashHit: 0.80,
    parry: 0.35,
    stance: 0.30,
    inhale: 0.85,
    lockIn: 0.35,
    electricNoise1: 0.70,
    electricNoise2: 0.70,
    electricNoise3: 0.75,
    electricNoise: 0.70,
    dashNoise: 0.85,
    dashSFX: 0.60,
    dashWhoosh: 0.35,
    thunderStrike: 0.90,
    rokurenDash: 0.85,
    ultimateCast: 1.0,
    ultimateImpact: 1.0
  }
};

