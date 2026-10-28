// ─────────────────────────────────────────────
// Toji Fushiguro — Sorcerer Killer Config
// ─────────────────────────────────────────────

export const tojiConfig = {
  assets: {
    hair: 'Assets/model/toji/toji-hair.png',
    skin: 'Assets/model/toji/Toji-skin.png',
    ultimateOverlay: 'Assets/Overlays/toji-ultimate-overlay.png',
    pistol: 'Assets/model/alucard/Alucard-pistol-gun.png',
  },

  name: 'Toji',
  displayName: 'Toji',
  grade: 'SS',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)
  // Base Attributes
  hp: 420,
  speed: 5.6,
  moveSpeed: 8.6,
  r: 25,
  radius: 25,
  color: '#281438', // Dark Shadow Purple
  themeColor: '#281438',
  startX: 350,
  startY: 250,
  startVx: 1.5,
  startVy: 1.5,
  damage: 8,
  cooldown: 10,
  projectileSpeedMultiplier: 1.0,
  ability: 'Heavenly Restriction',
  bossTitle: 'Sorcerer Killer',
  title: 'Sorcerer Killer',
  desc: 'Zero Cursed Energy. Immune to Domains. Silences, slows, and reduces healing of enemies with the Inverted Spear of Heaven.',

  // Passive: Heavenly Restriction (Tenyo Jubaku)
  enableHeavenlyRestriction: true,   // Master toggle for Heavenly Restriction
  stealthDodgeChance: 0.10,          // Base chance (25%) to physically dodge incoming melee attacks, strikes & projectiles outside domains (displays "MISS!")
  domainDodgeChance: 0.50,           // Increased chance (100%) to physically dodge when inside an enemy Domain Expansion (Heavenly Restriction 0 Cursed Energy stealth!)
  domainDodgeBonus: 0.50,           // Bonus dodge rate added when inside an enemy domain
  parryChance: 0.10,                 // 10% chance to parry incoming strikes/projectiles with Inverted Spear
  parryAmbushCooldownFrames: 360,   // Cooldown (frames) before a parry triggers a 3-Stage Ambush inside enemy domains (360 frames = 6.0s)
  domainImmunity: true,              // Ignores all Domain Expansion effects completely
  homingImmunity: true,              // Cannot be targeted by auto-aim
  stealthDuration: 240,              // Active Stealth duration in frames (240 frames = 4.0 seconds)
  stealthCooldown: 500,              // Stealth cooldown in frames (500 frames = 8.3 seconds)
  stealthCooldownFrames: 600,        // Stealth cooldown on ambush completion or dodge miss (600 frames = 10.0s)
  stealthTurnRate: 0.00,             // Aim tracking reaction rate when enemies aim at stealthed Toji (delayed but functional!)
  stealthSpeedMultiplier: 0,      // +30% movement speed multiplier during active stealth
  channelDetectionRadius: 550,       // Detection radius (px) to sense enemy skill/domain channeling
  channelInterruptChance: 0.25,      // 25% chance to force Sequence 1 ambush and interrupt channeling
  channelReactionFrames: 0,          // Delay in frames before Toji reacts to a channeled skill (0 frames = instant)
  postUltimateBreatherDuration: 60,  // Post-ultimate breather recovery frames before offensive actions (~1.0s) while moving naturally
  postUltimateInitialSlowMultiplier: 0.20, // Initial slow movement multiplier (20% speed) immediately after final blow before accelerating back to normal
  ultimateCraterSlashFadeFrames: 28, // Smooth visual follow-through and dissipation fadeout duration (frames) for 360 final blow crescent slash

  // Primary Weapon: Tactical Pistol (Basic Attack)
  enablePistol: true,                // Master toggle for Primary Weapon: Tactical Handgun / Pistol (Basic Attack)
  pistolDamage: 14,                  // Base ballistic true damage per pistol bullet
  pistolCooldown: 22,                // Crisp semi-automatic cadence (~2.7 shots/sec at 60fps)
  pistolRange: 460,                  // Tactical shooting engagement range (px)
  pistolBulletSpeed: 18,             // High-velocity ballistic bullet speed (px/frame)
  pistolRecoil: 1.4,                 // Physical recoil impulse kicking backward on fire
  pistolBulletRadius: 3.5,           // Projectile collision hit radius
  pistolMuzzleLength: 49,            // Distance from center to pistol muzzle tip

  // Secondary Cursed Tool: Inverted Spear of Heaven (Amanosakahoko — Ambush Thrust & Skills)
  enableSpear: true,                 // Master toggle for Inverted Spear of Heaven
  spearRange: 50,                    // Distance required to land melee hit (50px reach)
  spearReach: 50,                    // Alias for reach
  spearCooldown: 32,                 // Crisp assassin attack cooldown (~0.53s swing cadence)
  spearTremorIntensity: 1.8,         // Micro-tremor amplitude (px) during impact lock (±1.8px)

  // ── Hit 1: The Chemical Cleave (High-Angle Shoulder Coil & Hypersonic Slash — Maki Standard) ──
  hit1LiftFrames: 5,                 // Frames to lift weapon into high shoulder anticipation coil (~0.08s)
  hit1HoldFrames: 2,                 // Poised hold at overhead apex before snapping down (~0.03s)
  hit1StrikeFrames: 6,               // Hypersonic downward whip-chop stroke (~0.10s) with power curve
  hit1ImpactLockFrames: 6,           // CANONICAL IMPACT LOCK: Exact frames weapon locks firmly at impact before recovery begins (~0.10s)
  hit1LockFrames: 6,                 // Shorthand alias
  hit1PinFrames: 6,                  // Melee floor/ground pin alias
  hit1GroundPinFrames: 6,            // Alias
  hit1RecoveryFrames: 9,             // Frames for lifting blade from impact lock & settling stance (~0.15s)
  hit1HitPauseFrames: 3,             // Meaty freeze-frame hit-pause on blade contact
  hit1LungeSpeed: 5.5,               // Forward lunging step momentum speed during the strike
  hit1ArcAngle: (160 * Math.PI) / 180, // ~160° frontal cleave arc
  hit1Damage: 14,                    // Base true damage per swing
  hit1Knockback: 2.5,                // Physical push velocity impulse on basic attack hit
  hit1HitStunFrames: 0,              // Hit stun frames on basic attack hit (0 = no freeze/hit-stun on basic attacks)
  hit1ImpactShake: 3.5,              // Concussive screen shake on hit (Rule 30 satisfying slap)
  hit1ImpactShakeDuration: 8,        // Screen shake duration in frames

  // Direct spear* aliases for full backward compatibility
  spearLiftFrames: 5,
  spearHoldFrames: 2,
  spearStrikeFrames: 6,
  spearImpactLockFrames: 6,
  spearRecoveryFrames: 9,
  spearDamage: 14,
  spearKnockback: 2.5,
  spearHitStun: 0,

  // Legacy fallback aliases
  comboHit1Frames: 28,
  comboHit1Damage: 14,
  comboHit1Knockback: 2.5,
  comboHit1Lunge: 5.5,
  comboHit1Arc: (160 * Math.PI) / 180,
  silenceDuration: 180,              // Frames target is Silenced on hit (3.0 seconds at 60fps)
  pierceInfinity: false,             // Does not bypass Gojo's Limitless Infinity barrier
  regenDebuffDuration: 300,          // Duration in frames (5.0s) for Decrease Regen debuff applied on basic attack hit
  regenDebuffMultiplier: 0.40,        // Multiplier applied to target's healing / regeneration (0.40 = 60% reduction)
  spearSlowDuration: 10,             // Duration in frames (1.5s) for slow movement debuff applied on basic attack hit
  spearSlowMultiplier: 0.10,         // Movement speed multiplier when slowed by basic attack (50% speed)
  basicAttackSlowDuration: 10,       // Alias duration (frames) for basic attack slow debuff
  basicAttackSlowMultiplier: 0.10,   // Alias multiplier for basic attack slow debuff

  // Secondary Weapon: Split Soul Katana (Shikon Shinjitsu)
  enableKatana: true,                // Master toggle for Secondary Weapon: Split Soul Katana
  katanaRange: 75,                   // Wide sweep reach (75px)
  katanaCooldown: 300,               // Cooldown between Soul Slashes (5.0 seconds at 60fps)
  katanaDamage: 35,                  // Massive True Damage per slash
  katanaSlowDuration: 90,            // Slow duration frames applied on Katana slash (1.5 seconds)
  katanaSlowMultiplier: 0.40,        // Movement speed multiplier on slow (40% speed)
  soulWoundDuration: 180,            // Frames target is afflicted with Soul Wound anti-heal (3.0 seconds)

  // Skill: 3-Stage Ambush Move Sequence (Fukushū no Shinsoku)
  enableAmbush: true,                // Master toggle for 3-Stage Ambush Sequence
  ambushVoiceChance: 0.50,           // 50% chance to play Toji voiceline during 3-Stage Ambush Move Sequence
  ambushTriggerFrames: 55,           // Frames before stealth cooldown ends when ambush triggers
  ambushFirstTeleportFrames: 25,     // 1st Sequence: 1st teleport duration (frames) in front of target before backstab
  ambushFrontPauseDuration: 18,      // 1st Sequence: Pause duration (frames) in front of target
  ambushBackChargeDuration: 30,      // 1st Sequence: Charging duration (frames) at back before Spear thrust
  ambushSpearReach: 80,              // 1st Sequence: Reach distance (px) for Inverted Spear backstab thrust hit detection
  ambushSpearArc: Math.PI * 0.67,    // 1st Sequence: 120° frontal arc cone angle for Inverted Spear backstab thrust
  ambushBackThrustDamage: 15,        // 1st Sequence: True Damage of the Inverted Spear backstab thrust
  ambushTargetFreezeDuration: 70,    // 1st Sequence: Target freeze duration (frames) applied upon successful back thrust hit
  ambushKatanaChargeDuration: 25,    // 2nd Sequence: Katana windup charging duration (frames) before Soul Slash
  ambushKatanaFreezeDuration: 70,    // 2nd Sequence: Target freeze duration (frames) for Katana execution
  ambushKnockbackForce: 30,          // Massive knockback force launching target cleanly across arena
  ambushSpearThrustKnockback: 8.5,   // Controlled physical flinch impulse on Inverted Spear backstab thrust
  ambushPhantomFlurryStrikes: 8,    // 3rd Sequence: Number of rapid phantom afterimage flurry slashes
  ambushPhantomFlurryFrameRate: 7,   // 3rd Sequence: Slower readable attack speed between each phantom strike (8 frames)
  ambushPhantomFlurryDamage: 8,     // 3rd Sequence: True Damage per phantom strike
  ambushPhantomFlurryDistance: 8,    // 3rd Sequence: Tight teleport distance (px) from target during flurry slashes
  ambushFlurryFinalRecoil: 20,       // Clean finisher blast knockback push on target

  // Ultimate: Curse Inventory - Full Arsenal Unleashed (Kinkō Sōkō)
  enableUltimate: true,              // Master toggle for Ultimate: Full Arsenal Unleashed
  ultimateCooldown: 1500,            // 25.0s cooldown (1500 frames)
  ultimateChargeTime: 90,            // 1.5s channeling windup duration before vanishing (90 frames)
  ultimateSwarmDuration: 500,        // Total ultimate duration (frames)
  ultimateMaxStrikes: 8,             // Number of flash-step strikes before the final crater slam
  ultimateAssaultDamage: 15,         // True Damage per flash-step strike
  ultimateAssaultRicochetForce: 10,  // Kinetic ricochet knockback force launching enemy across arena into wall bounces
  ultimateCraterDamage: 100,          // Massive crater slam True Damage
  ultimateCraterRadius: 180,         // Blast radius of the final crater slam
  ultimateCraterReach: 185,          // Frontal reach distance (px) for multi-target 360 final blow sweep
  ultimateCraterArc: Math.PI * 2,    // 360° full omnidirectional sweeping arc angle
  ultimateCraterDistance: 320,       // Distance (px) Toji slides away from target into aerial vantage position before final crater slam
  ultimateVanishDuration: 5,         // Frames spent invisible in the shadows between strikes
  ultimateStrikeDuration: 22,        // Total frames he is visible during a strike (smooth & readable swing)
  ultimateSlideDistance: 240,        // Spawning offset distance (px) before sliding in (balanced cinematic runway)
  ultimateSlideSpeed: 42,            // Inward slide speed
  ultimateCraterChargeTime: 90,      // Frames spent hovering in the air winding up the katana
  ultimateCraterAimTurnRate: 0.12,   // Controlled turn rate (rad/frame) for auto-aim tracking during final blow windup
  ultimateCraterDiveTime: 16,        // Frames spent diving straight towards the enemy
  ultimateCraterSpinTime: 14,        // Frames spent executing the 360 final blow rotation at the enemy
  ultimateCraterFadeInFrames: 35,    // Frames spent sliding away to the distant vantage position
  ultimateDodgeMultiplier: 3.0,      // Dodge chance multiplier during ultimate
  ultimateDimOpacity: 1.0,           // Opacity of the full-screen solid black dim effect (1.0 = 100% solid black)
  ultimateDimColor: '#000000',       // Color tone of the dim effect (pure solid black)
  ultimateOverlayZoom: 1.80,         // Zoom scale multiplier for the arena PNG overlay image (Assets/Overlays/Toji-ultimate-overlay.png)
  ultimateOverlayOffsetX: 0,         // Horizontal pixel offset adjustment for Toji ultimate overlay image
  ultimateOverlayOffsetY: -45,       // Vertical pixel offset adjustment for Toji ultimate overlay image (negative = up)
  ultimateOverlayDarkness: 0.00,      // Opacity of the dark/black overlay on top layer of the arena image (0.0 to 1.0)
  ultimateOverlayAlpha: 0.75,        // Semi-transparent opacity for Toji ultimate overlay image (0.75 = 75% opacity)

  // Audio Configuration, Volume & Timing Delay Adjustments
  sounds: {
    pistolShot: 'Assets/Sound Effects/Skills/johnwick-pistol-shot.mp3',
    spearSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    spearBackstab: 'Assets/Sound Effects/Skills/backstab.mp3',
    parryDodge: 'Assets/Sound Effects/Skills/parry.mp3',
    firstSeqTeleport: 'Assets/Sound Effects/Skills/toji-firstseq-teleport.mp3',
    backThrust: 'Assets/Sound Effects/Skills/toji-backthrust.mp3',
    secondWeaponAttack: 'Assets/Sound Effects/Skills/toji-2stseq-2ndweaponAttack.mp3',
    phantomFlurry: 'Assets/Sound Effects/Skills/toji-3rdseq-phantomflurry.mp3',
    ultimateChanneling: 'Assets/Sound Effects/Skills/toji-ultimatechanneling.mp3',
    vanish: 'Assets/Sound Effects/Skills/woosh.mp3',
    dashStrike: 'Assets/Sound Effects/Skills/dash5.mp3',
    finalBlowCharging: 'Assets/Sound Effects/Skills/tojo-finalblow-charging.mp3',
    ultimateFinalBlow: 'Assets/Sound Effects/Skills/toji-ultimate-finalblow.mp3',
    groundSmash: 'Assets/Sound Effects/Attacks/groundSmash.mp3'
  },
  soundVolumes: {
    pistolShot: 0.95,
    spearSwing: 0.90,
    spearBackstab: 0.85,
    parryDodge: 0.65,
    firstSeqTeleport: 3.0,
    backThrust: 2.2,
    secondWeaponAttack: 2.2,
    phantomFlurry: 3.0,
    ultimateChanneling: 1.0,
    vanish: 5.0,
    dashStrike: 1.0,
    finalBlowCharging: 3.5,
    ultimateFinalBlow: 3.5,
    groundSmash: 1.2
  },
  soundChances: {
    parryDodge: 1.0,
    ambushVoiceline: 0.50,           // 50% chance to play voicelines during 3-Stage Ambush Move Sequence
    firstSeqTeleport: 0.50,          // 50% chance for 1st sequence teleport voiceline
    backThrust: 0.50,                // 50% chance for 1st sequence backthrust voiceline
    secondWeaponAttack: 0.50,        // 50% chance for 2nd sequence Katana attack voiceline
    phantomFlurry: 0.0              // 50% chance for 3rd sequence Phantom Flurry voiceline
  },
  soundDelays: {
    pistolShot: 0,
    spearSwing: 0,
    spearBackstab: 0,
    parryDodge: 0,
    firstSeqTeleport: 0,
    backThrust: 0,
    secondWeaponAttack: 0,
    phantomFlurry: 0,
    ultimateChanneling: 0,
    vanish: 0,
    dashStrike: 0,
    finalBlowCharging: 0,
    ultimateFinalBlow: 0,
    groundSmash: 0
  }
};
