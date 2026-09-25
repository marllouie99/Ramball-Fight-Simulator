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
  servantCountPerSpawn: 3,
  servantMaxActive: 4,
  servantHp: 120,
  servantRadius: 10,
  servantSpeed: 6.5,
  servantDamage: 12,
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

  // ── Phase 2: Ravenous Maw Rushdown & Stat Shift ──
  phase2Speed: 7.8,
  phase2DefenseMod: -0.25, // takes 25% extra damage
  phase2Radius: 36,

  // ── Phase 2: Basic Attack (Ravenous Chomp) ──
  chompDamage: 36,
  chompReach: 70,
  chompArc: 120 * (Math.PI / 180),
  chompCooldown: 24,
  bleedDurationFrames: 180, // 3.0s
  bleedTickInterval: 30, // 0.5s
  bleedDamagePerTick: 15,
  bleedHealReduction: 0.50,

  // ── Phase 2: Expert Chain Zig-Zag Dashes ──
  chainDashCooldown: 480, // 8.0s
  chainDashMinCount: 4,
  chainDashMaxCount: 6,
  chainDashSpeedBase: 18.0,
  chainDashSpeedMax: 22.0,
  chainDashDuration: 14,
  chainDashPauseBetween: 4,
  chainDashDamage: 32,

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
};
