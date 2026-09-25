// ─────────────────────────────────────────────
// Eye of Cthulhu — Ancient Ocular Horror Config
// ─────────────────────────────────────────────
export const eyeOfCthulhuConfig = {
  // ── Base Attributes ──
  hp: 480,
  speed: 4.6,
  moveSpeed: 4.6,
  r: 32,
  radius: 32,
  color: '#E11D48', // Crimson Rose
  themeColor: '#E11D48',
  secondaryColor: '#06B6D4', // Iris Cyan
  tendrilColor: '#881337', // Optic Nerve Tendril Maroon
  startX: 300,
  startY: 250,
  startVx: 1.0,
  startVy: 0.8,
  damage: 28,
  cooldown: 90,
  projectileSpeedMultiplier: 1.0,
  ability: 'The Evil Presence',
  bossTitle: 'Ancient Ocular Horror',
  title: 'Ancient Ocular Horror',
  desc: 'Floats freely through terrain. Summons Servants of Cthulhu and executes telegraphed triple rams. At 50% HP, tears into a ravenous berserk fanged maw.',

  // ── Sprites & Texture Paths ──
  phase1SpriteSrc: 'Assets/model/Eye of Cthulhu.png',
  phase2SpriteSrc: 'Assets/model/eye of cthulhu phase 2.png',
  spriteFrameCount: 6,
  spriteTicksPerFramePhase1: 8,
  spriteTicksPerFramePhase2: 4,
  spriteSheetWidth: 1774,
  spriteSheetHeight: 887,
  spriteFrameYMin: 345,
  spriteFrameYMax: 544,
  spriteFrameHeight: 198,

  // ── Passive: Flight & Terrain Intangibility (Terraria Physics) ──
  isGhostTerrain: true,
  hoverOscillationAmp: 8.0,
  hoverOscillationFreq: 0.06,
  hoverAcceleration: 0.24,
  hoverFriction: 0.94,
  hoverTargetDistanceY: 175,
  hoverOrbitWobbleAmp: 45,
  softLeashRadius: 420,
  defensePhase1: 12,
  defenseReductionPhase1: 0.15,

  // ── Phase 1: Servant of Cthulhu Summons ──
  servantSpawnCooldown: 720, // 12.0s at 60 FPS
  servantSpawnIntervalInHover: 140, // spawns a minion every ~2.3s during hover state
  servantCountPerSpawn: 1,
  servantMaxActive: 4,
  servantHp: 120,
  servantRadius: 10,             // Base collision & visual radius in px
  servantScale: 1.5,              // Scale multiplier for companion size (e.g. 0.8, 1.0, 1.5, 2.0)
  servantInitialSpeed: 7.2,
  servantSpeed: 7.4, // controlled pursuit speed (tight body tracking)
  servantTurnRate: 0.08, // responsive turning without wide slingshot overshoots
  servantDamage: 12,
  servantAttackInterval: 24, // bite attack tick interval when hovering on target (0.4s)
  servantHoverRadius: 20, // close body hovering distance
  servantHealOrbValue: 80,

  // ── Phase 1: Telegraphed Triple Ram (Terraria State Machine) ──
  hoverDurationFrames: 260, // ~4.3s hovering before initiating ram sequence
  ramCooldown: 600, // 10.0s
  ramWindupFrames: 24, // 0.4s telegraph windup
  ramWindupDecel: 0.88,
  ramCount: 3,
  ramSpeed: 17.5,
  ramDuration: 18, // frames per ram charge
  ramTurnaroundFrames: 12,
  ramPauseBetween: 8, // micro-gap between rams
  ramFatiguePauseFrames: 45, // 0.75s punishment opening after 3rd ram
  ramDamage: 28,
  ramKnockback: 14.0,

  // ── Phase Transition (50% HP Threshold) ──
  phase2Threshold: 0.50,
  transformationDurationFrames: 75, // 1.25s stationary vulnerability window
  transformationStasisFrames: 75,
  transformationSpinSpeed: 0.55, // rapid axial 360° rotation (~5.2 full revolutions)
  transformationShedThreshold: 0.48, // fraction of duration when pupil sheds (reveals maw)
  transformationScreenShake: 10,
  transformationShockwaveRadius: 190,
  transformationShockwaveKnockback: 18,
  transformationGoreChunkCount: 6,
  transformationBloodSparkInterval: 4,

  // ── Phase 2: Defense Drop & Contact Damage Boost ──
  defensePhase1: 12,
  defenseReductionPhase1: 0.15, // 15% damage reduction in Phase 1
  defensePhase2: 0,
  defenseReductionPhase2: 0.00, // 0 defense / 0% DR: takes 100% full unmitigated damage
  p2ContactDamage: 40, // increased physical contact / ram damage (boosted from Phase 1's 28)
  p2ContactKnockback: 16.0,
  p2Speed: 8.5,
  phase2Speed: 8.5,
  p2Radius: 36,
  phase2Radius: 36,

  // ── Phase 2: Relentless Continuous Physical Charges ──
  p2RamWindupFrames: 10, // rapid telegraph before each charge (0.16s)
  p2RamSpeedBase: 19.5, // initial charge speed
  p2RamSpeedEnraged: 23.5, // sub-25% HP berserk speed
  p2RamDuration: 15, // charge duration frames
  p2RamTurnaroundFrames: 6, // tight turnaround between chain rams (0.10s)
  p2RamChainMin: 3, // minimum rams per sequence
  p2RamChainMax: 6, // maximum rams per sequence (scales with lower HP)
  p2RamRecoveryPauseFrames: 12, // brief alignment breather before next charge chain (0.20s)

  // ── Phase 2: Basic Attack (Ravenous Chomp) ──
  chompDamage: 40,
  chompReach: 75,
  chompArc: 120 * (Math.PI / 180),
  chompCooldown: 20,
  bleedDurationFrames: 180, // 3.0s
  bleedTickInterval: 30, // 0.5s
  bleedDamagePerTick: 15,
  bleedHealReduction: 0.50,

  // ── Phase 2: Crimson Roar & Blood Spike Burst ──
  roarCooldown: 840, // 14.0s
  roarWindupFrames: 15,
  roarShockwaveRadius: 160,
  roarSpikeCount: 12,
  roarSpikeSpeed: 12.0,
  roarSpikeDamage: 22,
  roarSpikeRange: 320,

  // ── Ultimate: True Night Horrors (Blood Moon Frenzy) ──
  bloodMoonCooldown: 2100, // 35.0s
  bloodMoonDuration: 360, // 6.0s
  bloodMoonIchorPoolDuration: 240, // 4.0s
  bloodMoonIchorDamagePerTick: 8,

  // ──────────────────────────────────────────
  // AUDIO CONFIGURATION & SOUND VOLUMES
  // ──────────────────────────────────────────
  sounds: {
    transformationStart: 'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise1.mp3',
    pupilShed: 'Assets/Sound Effects/Skills/mahito-body-explode.mp3',
    transformationRoar: 'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise3.mp3',
    ramDash: 'Assets/Sound Effects/Skills/dash1.mp3',
    ramHit: 'Assets/Sound Effects/Attacks/heavypunch1.mp3',
    fleshHitLight: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    servantSpawn: 'Assets/Sound Effects/Skills/dash1.mp3',
    servantImpact: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    p2ChainDash: 'Assets/Sound Effects/Skills/dash2.mp3',
    p2Chomp: 'Assets/Sound Effects/Skills/backstab.mp3',
    p2Roar: 'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise2.mp3',
    spikeBurst: 'Assets/Sound Effects/Attacks/spikestab.mp3',
    death: 'Assets/Sound Effects/Skills/mahito-body-explode.mp3',
    actionNoises: [
      'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise1.mp3',
      'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise2.mp3',
      'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise3.mp3',
    ],
  },
  soundVolumes: {
    transformationStart: 0.95,
    pupilShed: 0.85,
    transformationRoar: 1.0,
    ramDash: 0.85,
    ramHit: 0.90,
    fleshHitLight: 0.60,
    servantSpawn: 0.45,
    servantImpact: 0.60,
    p2ChainDash: 0.95,
    p2Chomp: 0.85,
    p2Roar: 1.0,
    spikeBurst: 0.75,
    death: 1.0,
    actionNoise: 0.85,
  },
  soundChances: {
    actionNoise: 0.30,
  },
  actionNoiseChance: 0.30,
  actionNoiseVolume: 0.85,
  actionNoiseCooldown: 500, // Minimum cooldown frames (~0.83s) between action noises to prevent overlapping audio
};
