// ─────────────────────────────────────────────
// Carl "CJ" Johnson — The Grove Street Cheatmaster Config
// GTA San Andreas Cheat Codes & Street Boxing CQC
// ─────────────────────────────────────────────

export const cjConfig = {
  // ── 1. BASE ATTRIBUTES ──
  hp: 440,
  speed: 5.5,
  r: 25,
  color: '#16A34A',            // Grove Street Families Green
  themeColor: '#16A34A',       // Unified HUD & UI Accent Green
  healthBarColor: '#FFFFFF',   // GTA San Andreas Authentic White Health Bar
  skillBarColor: '#8BB5E8',    // GTA San Andreas Authentic Sky Blue Skill/Armor Bar
  wantedStarThresholds: [50, 120, 200, 300, 420, 560], // Cumulative damage dealt thresholds for 6 Wanted Stars
  secondaryColor: '#F59E0B',   // San Andreas Sunset Gold
  skinColor: '#8D5538',        // Natural Warm Brown Skin Tone

  // ── 1.1 STAMINA & FATIGUE SYSTEM ──
  maxStamina: 100,             // 100 max stamina
  staminaDrainRate: 0.38,      // Stamina drained per frame when sprinting/punching (~4.4s full sprint)
  staminaRegenRate: 0.42,      // Stamina regenerated per frame when resting/exhausted (~4.0s full recharge)
  exhaustedSpeedMultiplier: 0.40, // Slow movement speed multiplier when out of breath

  // ── 2. PASSIVE: RESPECT+ & CHEAT DIALER ──
  respectGainPerPunch: 2,     // Respect meter gain per brass knuckle hit
  respectGainOnHit: 2,         // Respect gain when taking/blocking hits
  respectCooldownRefund: 90,   // Cooldown refund (1.5s / 90 frames) on active skills when reaching 100% OG
  maxRespect: 100,             // Max Respect threshold (Grove Street OG)
  respectSpeedBoost: 0.05,     // +5% move speed at >= 50% Respect (Permanent)
  respectAttackSpeedBoost: 0.05, // +5% attack speed at 100% OG (Permanent)
  respectDamageBoost: 0.05,    // +5% punch damage at 100% OG (Permanent)
  respectDefenseBoost: 0.02,   // +2% flat damage resistance (DEF) at 100% Respect OG (Permanent)
  cheatTypingFramesPerChar: 10,  // Typing cadence (~160ms per character) with audio clicks
  cheatTypingHoldDelay: 6,      // 6 frames (~0.10s) confirmation hold with full word displayed
  cheatActivationPostDelay: 4,  // 4 frames (~0.06s) post-activation pose delay before resuming action

  // ── 3. BASIC ATTACK: BRASS KNUCKLES STREET BOXING ──
  meleePunchReach: 50,         // 50px punch reach
  meleePunchArc: (120 * Math.PI) / 180, // 120° wide multi-target frontal arc (Rule 8)
  meleePunchDamage: 10,        // Punch damage
  meleePunchCooldown: 18,      // 18 frames (~0.30s) fast boxing cadence
  meleeKnockback: 18.0,        // Physical pushback impulse
  meleeHitShakeIntensity: 2.2, // Screen shake on brass knuckle connection
  meleeHitShakeDuration: 4,

  // ── 4. SKILL 1: HESOYAM (Health, Armor & $250k Shockwave) ──
  hesoyamHpThreshold: 0.50,    // Triggers strictly when CJ loses 50% HP (HP drops to <= 50%)
  hesoyamHealPercent: 0.50,    // Instantly restores 50% of Max HP (permanent)
  hesoyamShieldAmount: 75,     // Equips 75 HP Bulletproof Kevlar Shield (permanent until broken by damage)
  hesoyamShockwaveRadius: 160, // 160px AOE explosion of green cash & coins
  hesoyamShockwaveDamage: 35,  // Shockwave damage
  hesoyamKnockback: 22.0,      // Blast pushback
  hesoyamRespectGain: 15,      // Respect gained on successful activation

  // ── 5. SKILL 2: ROCKETMAN / YECGAA (DARPA Jetpack & Dual Micro-Uzi Strafe) ──
  jetpackCooldown: 800,        // 13.3s (800 frames)
  jetpackDuration: 600,        // 10.0s flight duration (600 frames)
  jetpackSpeedMultiplier: 0.70,// Agile jetpack flight speed
  jetpackEvadeChance: 0.10,    // Airborne evasion chance against incoming attacks
  jetpackThrusterBurnDamage: 2,// Burning damage per frame in thruster fire
  jetpackDiveDashSpeed: 5.0,   // Controlled knuckle dive boost speed
  jetpackUziFireInterval: 5,   // Rapid dual alternating fire cadence (every 5 frames = 12 bullets/sec)
  jetpackUziBulletDamage: 8,   // 8 damage per 9mm full metal jacket round
  jetpackUziBulletSpeed: 23.0, // High velocity strafe bullet speed
  jetpackUziSpread: 0.07,      // Natural Micro-SMG bullet spray spread
  jetpackUziRange: 320,        // Effective firing range while hovering
  jetpackUziKnockback: 2.8,    // Impact impulse
  jetpackRespectGain: 10,      // Respect gained on jetpack ignition
  gunHitPushback: 3.5,         // Small physical pushback knockback on all CJ gun hits (Drive-by Tec-9, Dual Uzis, Minigun)
  gunHitShakeIntensity: 1.2,   // Subtle punchy screen shake on direct bullet impact

  // ── 6. SKILL 3: GROVESTREET4LIFE (Drive-By Backup) ──
  driveByCooldown: 600,        // 10.0s (600 frames)
  driveByStayDuration: 300,    // 5.0s (300 frames) staying & drifting in arena per pass
  driveByCarHp: 100,           // Max HP minion health bar (can be targeted and damaged by enemies)
  driveByPasses: 2,            // 2 repeated drive-by sweeps per Skill 3 activation
  driveByReenterDelay: 60,     // 1.0s (60 frames) pause between passes
  driveByBulletCount: 16,      // 16 rounds per pass (32 total across both passes)
  driveByBulletDamage: 8,      // 8 damage per bullet
  driveByBulletSpeed: 30.0,    // High-velocity supersonic tracer bullet speed (~28 px/frame)
  driveByBurstInterval: 22,    // Paced rhythmic fire cadence (~2.7 shots/sec alternating between homies)
  driveByCarSpeed: 6.5,        // Cinematic lowrider cruise & drift speed
  driveByRamDamage: 22,        // 22 impact damage when running over/ramming enemies
  driveByRamKnockback: 18.0,   // Physical vehicular knockback impulse
  driveByRamRespectGain: 4,    // Respect gained when ramming enemies
  driveByBulletRespectGain: 1, // Respect gained when drive-by barrage fires
  driveBySlowDuration: 120,    // 2.0s slow in burning tire burnout oil
  driveByOilRadius: 55,        // 55px burnout oil slow zone radius
  driveByOilDuration: 240,     // 4.0s (240 frames) duration on the ground
  driveByRespectGain: 15,      // Respect gained on successful drive-by invocation

  // ── 7. ULTIMATE: BAGUVIX (God Mode & Minigun Riot Overdrive) ──
  baguvixCooldown: 2500,        // 12.0s (720 frames at 60fps) cooldown
  baguvixDuration: 800,        // 5.0s (300 frames) invulnerability
  baguvixSpeedMultiplier: 0.28,// Significantly reduced slow walking speed (~1.54 px/frame) while wielding heavy minigun
  minigunFireRate: 5,          // Ultra-fast fire (every 2 frames = 30-45 rounds/sec)
  minigunBulletDamage: 12,     // 12 damage per armor-piercing round
  minigunBulletSpeed: 26.0,    // Supersonic armor-piercing projectile speed
  minigunKnockback: 6.5,       // Physical bullet pushback impulse
  minigunSpread: 0.05,         // Tight high-velocity spread
  minigunSpinSpeed: 0.45,      // Barrel cluster rotation speed
  riotShockwaveInterval: 60,   // Every 1.0s (60 frames) trigger riot shockwave
  riotShockwaveRadius: 220,    // 220px expanding fiery pressure wave
  riotShockwaveDamage: 25,     // Shockwave explosion damage
  riotShockwaveKnockback: 22.0,// Heavy radial pushback towards arena walls
  droppedMinigunDuration: 240, // 4.0s (240 frames) duration of overheated smoking minigun on the floor

  // ── 8. AUDIO ASSETS, VOLUMES & TIMING DELAYS ──
  sounds: {
    // Street Boxing Brass Knuckles CQC
    punchHit: [
      'Assets/Sound Effects/Attacks/heavypunch1.mp3',
      'Assets/Sound Effects/Attacks/heavypunch2.mp3',
      'Assets/Sound Effects/Attacks/heavypunch3.mp3'
    ],
    parry: 'Assets/Sound Effects/Skills/parry.mp3',
    evade: 'Assets/Sound Effects/Skills/dash1.mp3',
    shieldBlock: 'Assets/Sound Effects/Skills/shieldblock.mp3',

    // Cheat Code Typing & Activation
    typeClickNoise: 'Assets/Sound Effects/Skills/cj-typeclick1letter-noise.mp3',
    cheatActivated: 'Assets/Sound Effects/Skills/cj-cheatactivated-banner.mp3',

    // Skill 1: HESOYAM
    hesoyamShockwave: 'Assets/Sound Effects/Attacks/groundSmash.mp3',

    // Skill 2: ROCKETMAN Jetpack & Dual Uzis
    jetpackIgnition: 'Assets/Sound Effects/Attacks/flamespray1.mp3',
    jetpackUziShot: 'Assets/Sound Effects/Attacks/revolvershot.mp3',
    jetpackDive: 'Assets/Sound Effects/Attacks/heavypunch3.mp3',

    // Skill 3: GROVESTREET4LIFE Greenwood Drive-By
    carRoamNoise: 'Assets/Sound Effects/Skills/cj-carroam-noise.mp3',
    carRam: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
    carDriveByShot: [
      'Assets/Sound Effects/Attacks/revolvershot.mp3',
      'Assets/Sound Effects/Skills/engineer-sentrygunshot.mp3'
    ],
    carShellDrop: 'Assets/Sound Effects/Skills/johnwick-bulleshell-drop.mp3',
    homiesArrivalVoiceline: 'Assets/Sound Effects/Skills/cj-homiesarrival-voiceline.mp3',
    homiesArrivalVoicelines: [
      'Assets/Sound Effects/Skills/cj-homiesarrival-voiceline.mp3',
      'Assets/Sound Effects/Skills/cj-homiearrival-voiceline2.mp3',
      'Assets/Sound Effects/Skills/cj-homiearrival-voiceline3.mp3',
      'Assets/Sound Effects/Skills/cj-homiearrival-voiceline4.mp3'
    ],
    homieRoamNoises: [
      'Assets/Sound Effects/Skills/cj-homies-noise1.mp3',
      'Assets/Sound Effects/Skills/cj-homies-noise2.mp3',
      'Assets/Sound Effects/Skills/cj-homie-noise3.mp3',
      'Assets/Sound Effects/Skills/cj-homie-noise4.mp3',
      'Assets/Sound Effects/Skills/cj-homie-noise5.mp3'
    ],

    // Ultimate: BAGUVIX God Mode & M134 Minigun
    minigunShot: [
      'Assets/Sound Effects/Skills/johnwick-m4-shot.mp3',
      'Assets/Sound Effects/Attacks/revolvershot.mp3',
      'Assets/Sound Effects/Skills/engineer-sentrygunshot.mp3'
    ],
    riotShockwave: 'Assets/Sound Effects/Attacks/explosion.mp3',

    // Voicelines & Music
    introVoiceline: 'Assets/Sound Effects/Skills/cj-intro-voiceline.mp3',
    groveStreetVoiceline: 'Assets/Sound Effects/Skills/cj-GROVESTREET4LIFE-voiceline.mp3',
    deathMusic: 'Assets/Sound Effects/Skills/cj-deathmusic.mp3',
    respectOverlayBgMusic: 'Assets/Sound Effects/Skills/cj-respectoverlay-bgmusic.mp3'
  },
  soundVolumes: {
    punchHit: 0.50,
    parry: 0.50,
    evade: 0.50,
    shieldBlock: 0.50,
    typeClickNoise: 0.50,
    cheatActivated: 0.50,
    hesoyamShockwave: 0.50,
    jetpackIgnition: 0.50,
    jetpackUziShot: 0.20,
    jetpackDive: 0.50,
    carRoamNoise: 0.50,
    carRam: 0.50,
    carDriveByShot: 0.20,
    carShellDrop: 0.50,
    homiesArrivalVoiceline: 3.00,
    homieRoamNoises: 3.00,
    minigunShot: 0.20,
    riotShockwave: 0.50,
    introVoiceline: 3.00,
    groveStreetVoiceline: 3.00,
    deathMusic: 1.50,
    respectOverlayBgMusic: 1.50
  },
  soundChances: {
    punchHit: 1.0,
    typeClickNoise: 1.0,
    homieRoamNoises: 0.50
  },
  soundDelays: {
    punchHit: 0,
    parry: 0,
    evade: 0,
    shieldBlock: 0,
    typeClickNoise: 0,
    cheatActivated: 0,
    hesoyamShockwave: 0,
    jetpackIgnition: 0,
    jetpackUziShot: 0,
    jetpackDive: 0,
    carRoamNoise: 0,
    carRam: 0,
    carDriveByShot: 0,
    carShellDrop: 0,
    homiesArrivalVoiceline: 0,
    homieRoamNoises: 0,
    minigunShot: 0,
    riotShockwave: 0,
    introVoiceline: 0,
    groveStreetVoiceline: 0,
    deathMusic: 0,
    respectOverlayBgMusic: 0
  }
};
