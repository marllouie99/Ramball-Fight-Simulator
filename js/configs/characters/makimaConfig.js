// ─────────────────────────────────────────────
// Makima (The Control Devil) Character Config
// Chainsaw Man / Public Safety Special Division 4
// ─────────────────────────────────────────────

export const makimaConfig = {
  bossTitle: 'Control Devil',
  title: 'Control Devil',

  // Baseline Attributes
  hp: 360,
  maxHpRatio: 1.00,         // Makima has 100% max HP based on the fixed HP in the game mode
  speed: 5.5,
  moveSpeed: 5.5,
  r: 25,
  radius: 25,
  color: '#A31D24',        // Velvet Blood Crimson
  themeColor: '#A31D24',
  secondaryColor: '#F59E0B', // Golden Halo Solar Gold
  accentDark: '#12131A',    // Dark Public Safety Charcoal
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.0,
  damage: 40,
  cooldown: 100,
  projectileSpeedMultiplier: 1.0,
  ability: 'Control Devil & "Bang!"',
  desc: 'The Control Devil. Commands absolute psychological authority. Passive: Prime Minister Accord redirects fatal blows to 5 Citizen Lives. Primary: "Bang!" supersonic kinetic hitscan shockwave with wall-bounce crush damage. Skill 1: Chains of Domination. Skill 2: Angel 1000-Year Spear. Ultimate: Kyoto Shrine Gravitational Splatter.',

  // ──────────────────────────────────────────
  // ABILITY MASTER TOGGLE SWITCHES (true = Enabled, false = Disabled)
  // ──────────────────────────────────────────
  enableBang: true,                 // Master toggle for Primary Attack: "Bang!"
  enableSkill1: 1,                  // Master toggle for Skill 1: Chains of Domination (Shihai no Kusari)
  enableSkill2: 0,                  // Master toggle for Skill 2: Angel's Armory (1000-Year Holy Spear)
  enableUltimate: 1,                // Master toggle for Ultimate: Crucifixion (Drop of Dominion)
  enableCrucifixion: true,          // Alias toggle for Crucifixion
  enableCitizenContract: true,      // Master toggle for Passive 1: Prime Minister Contract & Shatter Revive

  // Passive 1: Prime Minister Contract (Citizen Redirection)
  maxCitizenLives: 3,               // 5 citizen sacrifice stocks
  citizenReviveHpPercent: 0.50,     // Revives with 100% Max HP
  citizenReviveDurationFrames: 75,  // 1.25s death shatter & magnetic reassembly duration
  citizenDamageReduction: 0.20,     // 20% passive damage reduction while stocks remain
  citizenShockwaveRadius: 150,      // Repel shockwave radius on revive
  citizenShockwaveKnockback: 24,    // Repel force

  // Primary Attack: "Bang!" (Lightning-Fast Full-Screen Invisible Beam)
  bangDamage: 40,                   // Direct hit damage
  bangWallBounceDamage: 22,         // Bonus damage when slammed into arena walls
  bangKnockbackForce: 46,           // Massive directional knockback
  bangRange: 1600,                  // Full-screen lightning-fast beam reach
  bangCooldown: 300,                 // ~0.73s cooldown between shots
  bangBeamWidth: 32,                // Kinetic shockwave cylinder width
  bangPierceProjectiles: true,      // Pierces and destroys incoming enemy projectiles
  wallPinDurationFrames: 20,        // 1.5 seconds (90 frames) wall-stick duration on collision

  // Aiming & Turn Rate (Controlled Aim Rotation — No Instant Snap Auto-Aim)
  aimTurnRate: 0.095,               // Smooth rotational turn rate (~3.15°/frame)
  aimAlignmentThreshold: 0.18,      // Must be aligned within ~10° to fire "Bang!"

  // Skill 1: Chains of Domination (Shihai no Kusari)
  enableChains: true,               // Alias toggle for Skill 1
  chainsCooldown: 500,              // 9.0s (540 frames)
  chainsRange: 400,                 // Tether reach in pixels
  chainsWindupFrames: 14,           // Windup / telegraph duration in frames before chain throw (auto-aim disabled so target can dodge)
  chainsThrowSpeed: 0.40,           // Chain throw projectile speed (0.10 = 10% speed / ~1.55s slow throw, 1.0 or 45 = default fast throw)
  // chainsLaunchFrames: 9,         // Optional: explicit throw animation duration in frames (overridden by chainsThrowSpeed if set)
  chainsMinDistance: 175,           // Minimum leash distance to prevent enemies getting too close to Makima
  chainsDamage: 2,                 // Initial latch damage
  chainsBleedDps: 0,                // Internal bleeding DPS
  chainsDuration: 300,              // 4.0s (240 frames) tether & stasis duration for enemy fighters
  chainsDurationFrames: 300,        // Alias duration in frames for fighters
  chainsStasisFrames: 240,          // Alias duration in frames for fighters
  chainsPullSpeed: 7.5,            // Speed targets are reeled toward Makima
  chainsBreakDistance: 550,         // Distance in pixels at which the chain snaps and breaks when enemy is knocked back
  chainsMinionHijackDuration: 360,  // 6.0s duration when hijacking enemy clones/minions

  // Skill 2: Angel's Armory (100-Year Halberds & 1000-Year Spear)
  enableAngelArmory: true,          // Alias toggle for Skill 2
  enableThousandYearSpear: true,    // Alias toggle for 1000-Year Spear
  angelCooldown: 1500,               // 13.5s (810 frames)
  halberdDamage: 25,                // Damage per halberd (3 burst projectiles)
  halberdSpeed: 16.0,               // Projectile flight velocity
  thousandYearSpearDamage: 140,     // 1000-Year Spear True Damage on direct hit
  thousandYearSpearRadius: 160,     // Holy explosion AOE radius
  thousandYearSpearChannelFrames: 100, // 0.83s divine spear summon channel

  // Ultimate: Crucifixion (Drop of Dominion) / Kyoto Shrine Ritual
  enableShrine: true,               // Alias toggle for Ultimate
  enableShrineRitual: true,         // Alias toggle for Ultimate
  crucifixionCooldown: 1000,        // 32.0s (1920 frames)
  shrineCooldown: 100,             // Backward compatibility alias
  crucifixionSlideDurationFrames: 16,// Smooth momentum deceleration slide before casting Crucifixion (~0.26s)
  enableCrucifixionSlide: true,      // Master toggle for smooth slide before casting Crucifixion
  crucifixionDurationFrames: 140,   // Total cinematic sequence duration (~2.33s)
  crucifixionImpactFrame: 80,       // Frame at which heavy sword drops and strikes target
  crucifixionCameraZoom: 1.0,       // Fixed full arena zoom (1.0) showing entire arena spectacle
  crucifixionFixedCamera: true,     // Fixed full arena camera view when enemy gets crucified until spear drop finishes
  crucifixionFocusEnemy: false,     // Disabled in favor of Fixed Full Arena view
  crucifixionPercentDamage: 0.45,   // 45% Max Target HP True Damage
  crucifixionFlatDamage: 100,       // 280 Flat True Damage
  crucifixionExecuteThreshold: 0.25,// Instant execute if target HP <= 25%
  shrinePercentDamage: 0.45,        // Backward compatibility
  shrineFlatDamage: 280,            // Backward compatibility
  shrineExecuteThreshold: 0.25,     // Backward compatibility
  shrineChannelFrames: 140,         // Backward compatibility
  shrineStasisDuration: 140,        // Stasis lock duration

  // ──────────────────────────────────────────
  // AUDIO CONFIGURATION, VOLUME & TIMING DELAYS (Organized same as Nanami)
  // ──────────────────────────────────────────
  sounds: {
    // Primary Attack: "Bang!"
    bangGunshot: 'Assets/Sound Effects/Skills/makima-bang.mp3',
    bangWallPin: 'Assets/Sound Effects/Attacks/groundSmash.mp3',

    // Passive 1: Prime Minister Contract & Shatter Reassembly
    contractShatter: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    contractSmash: 'Assets/Sound Effects/Skills/rubbick-groundsmash.mp3',
    contractReassemble: 'Assets/Sound Effects/Skills/enhance.mp3',
    revertVoicelines: [
      'Assets/Sound Effects/Skills/makima-revert-voiceline.mp3',
      'Assets/Sound Effects/Skills/makima-revert-voiceline2.mp3',
      'Assets/Sound Effects/Skills/makima-revert-voiceline3.mp3'
    ],
    revertVoiceline: 'Assets/Sound Effects/Skills/makima-revert-voiceline.mp3',

    // Skill 1: Chains of Domination (Shihai no Kusari)
    chainsHook: 'Assets/Sound Effects/Skills/hookchain.mp3',
    chainsGravity: 'Assets/Sound Effects/Skills/gravitypull.mp3',
    chainsRattle: 'Assets/Sound Effects/Skills/hookchain.mp3',
    chainsBleed: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    chainVoicelines: [
      'Assets/Sound Effects/Skills/makima-chain-voiceline1.mp3',
      'Assets/Sound Effects/Skills/makima-chain-voiceline2.mp3',
      'Assets/Sound Effects/Skills/makima-chain-voiceline3.mp3',
      'Assets/Sound Effects/Skills/makima-chain-voiceline4.mp3'
    ],
    chainVoiceline: 'Assets/Sound Effects/Skills/makima-chain-voiceline1.mp3',

    // Skill 2: Angel's Armory (1000-Year Holy Spear)
    spearSummon: 'Assets/Sound Effects/Skills/woosh.mp3',
    spearExplosion: 'Assets/Sound Effects/Attacks/explosion.mp3',

    // Ultimate: Crucifixion (Drop of Dominion) / Kyoto Shrine Ritual
    crucifixionVoiceline: 'Assets/Sound Effects/Skills/makima-chain-voiceline1.mp3',
    crucifixionRift: 'Assets/Sound Effects/Skills/shrine.mp3',
    crucifixionChains: 'Assets/Sound Effects/Skills/hookchain.mp3',
    crucifixionGravity: 'Assets/Sound Effects/Skills/gravitypull.mp3',
    crucifixionDescent: 'Assets/Sound Effects/Skills/woosh.mp3',
    crucifixionImpact: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
    crucifixionHeavyImpact: 'Assets/Sound Effects/Skills/Makima-crucifix-heavy-impact.mp3',
    crucifixionShatter: 'Assets/Sound Effects/Attacks/explosion.mp3',
    shrineRitual: 'Assets/Sound Effects/Skills/shrine.mp3',
    shrineSplatter: 'Assets/Sound Effects/Attacks/groundSmash.mp3'
  },
  soundVolumes: {
    bangGunshot: 1.50,
    bangWallPin: 0.85,
    contractShatter: 0.95,
    contractSmash: 0.85,
    contractReassemble: 0.85,
    revertVoicelines: 3.5,
    revertVoiceline: 3.5,
    chainsHook: 0.90,
    chainsGravity: 0.65,
    chainsRattle: 0.70,
    chainsBleed: 0.55,
    chainVoicelines: 3.5,
    chainVoiceline: 3.5,
    spearSummon: 0.85,
    spearExplosion: 1.00,
    crucifixionVoiceline: 3.2,
    crucifixionRift: 1.25,
    crucifixionChains: 1.10,
    crucifixionGravity: 0.90,
    crucifixionDescent: 1.15,
    crucifixionImpact: 1.40,
    crucifixionHeavyImpact: 1.50,
    crucifixionShatter: 1.10,
    shrineRitual: 1.20,
    shrineSplatter: 1.30
  },
  soundChances: {
    revertVoiceline: 1.0, // 100% chance to play one of Makima's revert voicelines upon reassembling
    chainVoiceline: 0.50, // 50% chance to play one of Makima's chain voicelines when chaining an enemy
    crucifixionVoiceline: 1.0
  },
  soundDelays: {
    bangGunshot: 0,
    bangWallPin: 0,
    contractShatter: 0,
    contractSmash: 0,
    contractReassemble: 0,
    revertVoiceline: 0,
    chainsHook: 0,
    chainsGravity: 0,
    chainsBleed: 0,
    chainVoiceline: 0,
    spearSummon: 0,
    spearExplosion: 0,
    crucifixionVoiceline: 0,
    crucifixionRift: 0,
    crucifixionChains: 0,
    crucifixionGravity: 0,
    crucifixionDescent: 0,
    crucifixionImpact: 0,
    crucifixionHeavyImpact: 0,
    crucifixionShatter: 0,
    shrineRitual: 0,
    shrineSplatter: 0
  }
};
