// ─────────────────────────────────────────────
// Escanor Character Config
// The Seven Deadly Sins (Nanatsu no Taizai) — Lion's Sin of Pride
// ─────────────────────────────────────────────

export const escanorConfig = {
  bossTitle: 'Lion Sin of Pride',
  title: 'Lion Sin of Pride',

  // Baseline Attributes
  hp: 390,
  maxHpRatio: 1.0,
  speed: 5.7,
  moveSpeed: 5.0,
  aimTurnRate: 0.12,            // Dignified heavy turn rate (~6.9°/frame) when acquiring new targets
  r: 32,
  radius: 32,
  theOneRadiusBonus: 4,         // Physical body size expansion during "THE ONE" (+4px radius -> 36px)
  prideRadiusBonusPerStack: 1.0,// +1.0px body radius per Solar Pride stack (+2px at max 2 stacks)
  color: '#F59E0B',            // Radiant Solar Amber
  themeColor: '#F59E0B',
  secondaryColor: '#DC2626',   // Solar Flare Crimson
  accentGold: '#FBBF24',       // Holy Armor & Sacred Treasure Gold
  accentRoyalBlue: '#2563EB',  // Holy Knight Shoulder Pauldron Blue
  accentDark: '#18181B',       // Deep Manga Shadow
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.0,
  damage: 15,
  cooldown: 56,
  projectileSpeedMultiplier: 1.0,
  ability: 'Grace "Sunshine" & "The One"',
  desc: 'The Lion\'s Sin of Pride. Colossal solar juggernaut wielding the Sacred Treasure Divine Axe Rhitta. Radiates intense solar heat, gaining Solar Pride power escalation. Wields 140° Divine Slashes, Cruel Sun blazing stars, Pride Flare solar novas, and the invincible high noon ultimate: "The One" with Divine Sword Escanor.',

  // ──────────────────────────────────────────
  // ABILITY MASTER TOGGLE SWITCHES
  // ──────────────────────────────────────────
  enableSunshine: true,             // Master toggle for Passive: Grace "Sunshine" heat aura & Solar Pride escalation
  enableCruelSun: true,             // Master toggle for Skill 1: Cruel Sun (無慈悲な太陽)
  enablePrideFlare: true,           // Master toggle for Skill 2: Pride Flare (プライド・フレア)
  enableTheOne: true,               // Master toggle for Ultimate: "THE ONE" — Divine Sword Escanor (天地無双)

  // Passive 1: Grace "Sunshine" & Thermal Updraft
  sunshineHeatRadius: 100,
  sunshineHeatDps: 3,
  thermalUpdraftSlow: 0.15,

  // Passive 2: Solar Pride Escalation
  prideStackMax: 2,
  prideStackDamageBonus: 0.08,  // +8% damage per stack (max +40%)
  prideChargeIntervalFrames: 150, // 1 stack every 2.5s passively

  // Passive 3: Solar Armor & Holy Knight DEF (Damage Reduction)
  defense: 0.20,                // Base 20% flat damage reduction / armor mitigation
  prideDefBonusPerStack: 0.02,  // +2% DEF per Solar Pride stack (+10% at 5 stacks)
  theOneDefenseBonus: 0.25,     // +25% DEF bonus during "THE ONE" (invincible noon state)
  liftingDefenseBonus: 0.15,    // +15% DEF poise bonus while lifting/poised with Rhitta
  armorDeflectSparks: true,     // Golden armor deflection sparks and audio on absorbing hits

  // Basic Attack: Divine Axe Rhitta — Telegraphed Overhead Chop Strike (Missable)
  rhittaArcAngle: Math.PI * 1.15, // ~207 degrees (matches visual 208° slash sweep)
  rhittaReach: 160,             // Baseline reach in pixels at 0 pride stacks (matches weapon model & slash arc length)
  theOneReachMultiplier: 1.45,  // +45% weapon attack reach (232px reach) during "THE ONE"
  prideReachBonusPerStack: 0.06,// +6% weapon attack reach per Solar Pride stack (+30% reach at 5 stacks)
  chopLiftFrames: 80,              // Frames to lift axe up from guard to high overhead (~0.33s)
  chopLiftHoldFrames: 350,         // EXACT number of frames Escanor stays poised in high overhead lift stance before striking down (~1.67s)
  chopStrikeFrames: 24,            // Frames for the explosive downward chop stroke (~0.40s) with heavy follow-through
  chopRecoveryFrames: 20,          // Frames to recover back to resting pose & wipe slash arc (~0.47s)
  chopHitPauseFrames: 10,          // Cinematic hit-pause frame freeze upon axe impact (~0.43s)
  chopHitTremorIntensity: 1.5,     // Micro-tremor amplitude (px) during mid-chop hit-pause for visceral blade resistance
  chopBladeRadius: 24,             // Half-width radius of Rhitta's crescent blade collision capsule (eliminates phantom hits)
  chopFrontalArcLimit: 1.54,       // Max angular offset from aim angle (rad, ~77°) to register forward cleave hit
  chopLungeSpeed: 4.5,             // Physical forward step momentum speed during the downward chop strike
  basicImpactShake: 10.0,           // Concussive arena shake on initial weapon contact
  basicImpactShakeDuration: 12,
  basicUnpauseShake: 10.0,         // Heavy explosive arena shake on knockback release
  basicUnpauseShakeDuration: 18,
  basicMissShake: 4.5,             // Concussive ground shake on downward chop miss
  basicMissShakeDuration: 8,
  basicDamageMin: 100,
  basicDamageMax: 100,
  basicBurnDamage: 6,
  basicKnockback: 50.0,            // Heavy physical axe knockback launched on unpause
  basicHitStunFrames: 7,

  // Wall Pin & Stasis (When knockback drives enemy into arena boundaries)
  wallPinDurationFrames: 15,         // Adjust pinned duration in frames (60 frames = 1.0 second, 55 frames = ~0.92s)
  wallPinScreenShakeIntensity: 14.0, // Heavy concussive screen shake on wall impact
  wallPinScreenShakeDuration: 16,
  wallBounceSlowFrames: 90,          // Lingering stagger slow after unpinning (~1.5s)
  wallBounceSlowMultiplier: 0.40,    // 40% movement speed while recovering

  // Skill 1: Cruel Sun (無慈悲な太陽)
  cruelSunCooldown: 510,       // 8.5s
  cruelSunSpeed: 9.5,
  cruelSunOrbRadius: 18,
  cruelSunDamage: 65,
  cruelSunAoeRadius: 80,
  cruelSunAoeDamage: 38,
  cruelSunKnockback: 14.0,
  cruelSunBurnDps: 4,
  cruelSunBurnDurationSec: 4,

  // Skill 2: Pride Flare (プライド・フレア)
  prideFlareCooldown: 660,     // 11.0s
  prideFlareRadius: 110,
  prideFlareDamage: 52,
  prideFlareKnockback: 22.0,
  prideFlareStunDuration: 36,  // 0.6s

  // Ultimate: "THE ONE" — Divine Sword Escanor (天地無双)
  theOneCooldown: 1560,        // 26.0s
  theOneDuration: 480,         // 8.0s
  theOneDamageMultiplier: 1.45,
  theOneFinisherDamage: 115,
  theOneFinisherReach: 165,    // Expanded from 120 -> 165 to reflect his colossal giant reach during THE ONE
  theOneFinisherKnockback: 42.0,

  // ──────────────────────────────────────────
  // AUDIO CONFIGURATION & SOUND VOLUMES
  // ──────────────────────────────────────────
  sounds: {
    weaponLift: 'Assets/Sound Effects/SkillEffects/Escanor-weapon-lift.mp3',
    attack: 'Assets/Sound Effects/Attacks/Escanor-attack.mp3',
    swordSwing: 'Assets/Sound Effects/Attacks/Escanor-attack.mp3',
    chopHit: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    unpauseHit: 'Assets/Sound Effects/Attacks/heavypunch1.mp3',
    cruelSun: 'Assets/Sound Effects/Attacks/flamespray1.mp3',
    prideFlare: 'Assets/Sound Effects/Attacks/flamespray1.mp3',
    theOne: 'Assets/Sound Effects/Attacks/laserbeam.mp3',
    divineSword: 'Assets/Sound Effects/Attacks/heavypunch1.mp3',
    armorParry: 'Assets/Sound Effects/Skills/parry.mp3'
  },
  soundVolumes: {
    weaponLift: 1.0,
    attack: 1.0,
    swordSwing: 1.0,
    chopHit: 0.95,
    unpauseHit: 1.0,
    cruelSun: 0.7,
    prideFlare: 0.9,
    theOne: 0.9,
    divineSword: 1.0,
    armorParry: 0.35
  }
};