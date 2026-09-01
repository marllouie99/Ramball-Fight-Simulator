// ─────────────────────────────────────────────
// Toji Fushiguro — Sorcerer Killer Config
// ─────────────────────────────────────────────

export const tojiConfig = {
  // Base Attributes
  hp: 420,
  speed: 5.6,
  moveSpeed: 5.6,
  r: 25,
  radius: 25,
  color: '#281438', // Dark Shadow Purple
  themeColor: '#281438',
  startX: 350,
  startY: 250,
  startVx: 1.5,
  startVy: 1.5,
  damage: 15,
  cooldown: 40,
  projectileSpeedMultiplier: 1.0,
  ability: 'Heavenly Restriction',
  desc: 'Zero Cursed Energy. Immune to Domains. Silences enemies with the Inverted Spear of Heaven.',

  // Passive: Heavenly Restriction (Tenyo Jubaku)
  stealthDodgeChance: 0.35,          // Base chance (25%) to physically dodge incoming melee attacks, strikes & projectiles outside domains (displays "MISS!")
  domainDodgeChance: 0.50,           // Increased chance (100%) to physically dodge when inside an enemy Domain Expansion (Heavenly Restriction 0 Cursed Energy stealth!)
  domainDodgeBonus: 0.50,           // Bonus dodge rate added when inside an enemy domain
  parryChance: 0.10,                 // 10% chance to parry incoming strikes/projectiles with Inverted Spear
  parryAmbushCooldownFrames: 360,   // Cooldown (frames) before a parry triggers a 3-Stage Ambush inside enemy domains (360 frames = 6.0s)
  domainImmunity: true,              // Ignores all Domain Expansion effects completely
  homingImmunity: true,              // Cannot be targeted by auto-aim
  stealthDuration: 240,              // Active Stealth duration in frames (240 frames = 4.0 seconds)
  stealthCooldown: 500,              // Stealth cooldown in frames (500 frames = 8.3 seconds)
  stealthTurnRate: 0.08,             // Aim tracking reaction rate when enemies aim at stealthed Toji (delayed but functional!)
  stealthSpeedMultiplier: 1.30,      // +30% movement speed multiplier during active stealth
  channelDetectionRadius: 550,       // Detection radius (px) to sense enemy skill/domain channeling
  channelInterruptChance: 0.25,      // 25% chance to force Sequence 1 ambush and interrupt channeling
  channelInterruptCooldownFrames: 800, // Cooldown (frames) for the interrupt mechanic (~13.3s)
  channelReactionFrames: 10,         // Delay in frames before Toji reacts to a channeled skill (10 frames = ~0.16s)

  // Primary Melee: Inverted Spear of Heaven (Amanosakahoko)
  spearRange: 50,                    // Distance required to land melee hit (50px)
  spearCooldown: 75,                 // Spaced frames between basic melee strikes (0.92s swing)
  spearDamage: 15,                   // Base damage per swing
  spearKnockback: 8.5,               // Physical push velocity impulse on basic attack hit
  spearHitStun: 0,                   // Hit stun frames on basic attack hit (0 = no freeze/hit-stun on basic attacks)
  silenceDuration: 180,              // Frames target is Silenced on hit (3.0 seconds at 60fps)
  pierceInfinity: true,              // Ignores Gojo's Limitless Infinity barrier and shield blocks
  regenDebuffDuration: 300,          // Duration in frames (5.0s) for Decrease Regen debuff applied on basic attack hit
  regenDebuffMultiplier: 0.40,        // Multiplier applied to target's healing / regeneration (0.40 = 60% reduction)

  // Secondary Weapon: Split Soul Katana (Shikon Shinjitsu)
  katanaRange: 75,                   // Wide sweep reach (75px)
  katanaCooldown: 300,               // Cooldown between Soul Slashes (5.0 seconds at 60fps)
  katanaDamage: 35,                  // Massive True Damage per slash
  katanaSlowDuration: 90,            // Slow duration frames applied on Katana slash (1.5 seconds)
  katanaSlowMultiplier: 0.40,        // Movement speed multiplier on slow (40% speed)
  soulWoundDuration: 180,            // Frames target is afflicted with Soul Wound anti-heal (3.0 seconds)

  // Skill: 3-Stage Ambush Move Sequence (Fukushū no Shinsoku)
  ambushTriggerFrames: 55,           // Frames before stealth cooldown ends when ambush triggers
  ambushFirstTeleportFrames: 25,     // 1st Sequence: 1st teleport duration (frames) in front of target before backstab
  ambushFrontPauseDuration: 18,      // 1st Sequence: Pause duration (frames) in front of target
  ambushBackChargeDuration: 30,      // 1st Sequence: Charging duration (frames) at back before Spear thrust
  ambushBackThrustDamage: 50,        // 1st Sequence: True Damage of the Inverted Spear backstab thrust
  ambushTargetFreezeDuration: 70,    // 1st Sequence: Target freeze duration (frames) so sequence executes smoothly
  ambushKatanaChargeDuration: 30,    // 2nd Sequence: Katana windup charging duration (frames) before Soul Slash
  ambushKatanaFreezeDuration: 70,    // 2nd Sequence: Target freeze duration (frames) for Katana execution
  ambushKnockbackForce: 22,          // Moderate knockback force launching target cleanly across arena
  ambushSpearThrustKnockback: 16,    // Crisp physical velocity impulse on Inverted Spear backstab
  ambushPhantomFlurryStrikes: 12,    // 3rd Sequence: Number of rapid phantom afterimage flurry slashes
  ambushPhantomFlurryFrameRate: 7,   // 3rd Sequence: Slower readable attack speed between each phantom strike (8 frames)
  ambushPhantomFlurryDamage: 15,     // 3rd Sequence: True Damage per phantom strike
  ambushPhantomFlurryDistance: 8,    // 3rd Sequence: Tight teleport distance (px) from target during flurry slashes
  ambushFlurryFinalRecoil: 24,       // Clean finisher blast knockback push on target

  // Ultimate: Curse Inventory - Full Arsenal Unleashed (Kinkō Sōkō)
  ultimateCooldown: 1500,            // 25.0s cooldown (1500 frames)
  ultimateChargeTime: 90,            // 1.5s channeling windup duration before vanishing (90 frames)
  ultimateSwarmDuration: 500,        // Total sensory deprivation slow duration on target
  ultimateMaxStrikes: 8,             // Number of flash-step strikes before the final crater slam
  ultimateAssaultDamage: 80,         // True Damage per flash-step strike
  ultimateCraterDamage: 65,          // Massive crater slam True Damage
  ultimateCraterRadius: 180,         // Blast radius of the final crater slam
  ultimateCraterReach: 185,          // Frontal reach distance (px) for multi-target 360 final blow sweep
  ultimateCraterArc: Math.PI * 1.35, // 243° wide frontal sweeping arc angle
  ultimateVanishDuration: 5,         // Frames spent invisible in the shadows between strikes
  ultimateStrikeDuration: 20,        // Total frames he is visible during a strike (smooth & readable swing)
  ultimateSlideDistance: 100,        // Spawning offset distance (px) before sliding in
  ultimateSlideSpeed: 50,            // Inward slide speed
  ultimateCraterChargeTime: 90,      // Frames spent hovering in the air winding up the katana
  ultimateCraterDiveTime: 15,        // Frames spent diving down to the ground
  ultimateCraterFadeInFrames: 30,    // Frames for Toji to fade in above target before crater slam
  ultimateDodgeMultiplier: 3.0,      // Dodge chance multiplier during ultimate

  // Audio Configuration, Volume & Timing Delay Adjustments
  sounds: {
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
    spearSwing: 0.90,
    spearBackstab: 0.85,
    parryDodge: 0.65,
    firstSeqTeleport: 3.0,
    backThrust: 2.2,
    secondWeaponAttack: 2.2,
    phantomFlurry: 3.0,
    ultimateChanneling: 3.0,
    vanish: 5.0,
    dashStrike: 1.0,
    finalBlowCharging: 3.5,
    ultimateFinalBlow: 3.5,
    groundSmash: 1.2
  },
  soundChances: {
    parryDodge: 1.0
  },
  soundDelays: {
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
