// ─────────────────────────────────────────────
// Ender Dragon — Ruler of The End Character Config
// ─────────────────────────────────────────────
export const enderDragonConfig = {
  // ── Base Attributes ──
  hp: 520,
  speed: 4.4,
  moveSpeed: 4.4,
  r: 36,
  radius: 36,
  damage: 32,
  cooldown: 80,
  projectileSpeedMultiplier: 1.0,
  color: '#18181B', // Obsidian Charcoal
  themeColor: '#C026D3', // Void Magenta
  secondaryColor: '#E879F9', // Light Amethyst Glow
  eyeColor: '#D946EF', // Glowing Ender Amethyst
  acidColor: '#A21CAF', // Dragon's Breath Acid Purple
  damageNumberColor: '#C026D3',
  name: 'Ender Dragon',
  ability: 'Ruler of The End',
  bossTitle: 'Ruler of The End',
  title: 'Ruler of The End',
  desc: 'Colossal flying draconic leviathan. Bypasses terrain with void flight, shoots lingering Dragon Breath acid pools, executes kinetic wing swoops, and unleashes cataclysmic void shockwaves.',

  // ── Asset Paths ──
  textureSkinSrc: 'Assets/model/Sprites/dragon-texture-skin.png',
  wingsSpriteSrc: 'Assets/model/Sprites/Dragon-wings-sprite-sheet.png',
  tailsSpriteSrc: 'Assets/model/Sprites/Dragon-tail-segmented-sheet.png',
  movementSpriteSrc: 'Assets/model/Sprites/Dragon-wings-sprite-sheet.png',
  disintegrationSrc1: 'Assets/model/Sprites/Ender-dragon-Disintegration-Sequence.png',
  disintegrationSrc2: 'Assets/model/Sprites/Ender-dragon-Disintegration-Sequence2.png',

  // ── Sprite Slicing & Animation ──
  spriteSheetWidth: 1536,
  spriteSheetHeight: 1024,
  spriteRows: 2,
  spriteCols: 3,
  spriteCellWidth: 512,
  spriteCellHeight: 512,
  spriteFrameCount: 6,
  spriteTicksPerFrame: 5,
  swoopTicksPerFrame: 3,
  tailScale: 2.25,
  wingScale: 5.2,

  // ── Passive: Flight & Arena Physics (Window Screen Hovering & Free Arena Clipping) ──
  isGhostTerrain: true,
  immuneToKnockback: false,
  immuneToPush: false,
  hoverOscillationAmp: 25.0,
  hoverOscillationFreq: 0.04,
  hoverAcceleration: 0.28,
  hoverFriction: 0.93,
  hoverTargetDistanceY: 220,
  hoverOrbitWobbleAmp: 65,
  softLeashRadius: 280,

  // ── General Movement Behavior (Pillars 1-4) ──
  // 1. Dynamic Flight Paths (Perimeter Patrol & Altitude Shifts)
  patrolSpeed: 5.6,
  patrolAngularSpeed: 0.016,
  patrolRadiusRatio: 1.10,
  patrolWobbleFreq: 0.03,
  patrolWobbleAmp: 45,
  altitudeShiftInterval: 300,
  cruiseAltitude: 1.0,
  highAltitude: 1.7,
  lowAltitude: 0.4,

  // 2. Target Interception (Momentum & Kinetic Space Control)
  interceptCooldown: 360,
  interceptSpeed: 16.5,
  interceptLeadFrames: 14,
  interceptGaleReach: 75,
  interceptGaleDamage: 16,
  interceptGaleKnockback: 16.0,

  // 3. Grounded Intermissions (Perching at Central Anchor)
  perchInterval: 1200,
  perchGroundedDuration: 150,
  perchDescentSpeed: 3.5,
  perchBreathCooldown: 40,
  perchTakeoffShockwaveRadius: 160,
  perchTakeoffDamage: 24,
  perchTakeoffKnockback: 18.0,

  // 4. Environmental Reactivity & Phase Multipliers
  phase2HpThreshold: 0.75,
  phase3HpThreshold: 0.50,
  phase4HpThreshold: 0.25,
  phase2SpeedMult: 1.12,
  phase3SpeedMult: 1.25,
  phase4SpeedMult: 1.45,

  // ── Skill 1: Dragon's Breath / Fireball (dragonsBreath) ──
  fireballCooldown: 480, // 8.0s
  fireballSpeed: 9.0,
  fireballRadius: 16,
  fireballDamage: 28,
  fireballDetonationRadius: 70,
  acidPoolDurationFrames: 180, // 3.0s lingering hazard
  acidPoolRadius: 70,
  acidTickInterval: 15, // damage tick every 0.25s
  acidDamagePerTick: 6,
  acidSlowMultiplier: 0.75, // 25% movement slow inside cloud

  // ── Skill 2: Wing Buffet / Kinetic Swoop (wingBuffet) ──
  swoopCooldown: 540, // 9.0s
  swoopWindupFrames: 14,
  swoopDurationFrames: 18,
  swoopSpeed: 18.5,
  swoopDamage: 38,
  swoopKnockback: 20.0,
  swoopReach: 80,
  swoopArc: 120 * (Math.PI / 180),
  swoopTurnaroundFrames: 8,

  // ── Skill 3 / Ultimate: Void Cataclysm & Perch (voidCataclysm) ──
  cataclysmCooldown: 1100, // ~18.3s
  cataclysmChannelFrames: 70,
  cataclysmRoarFrame: 40,
  cataclysmScreenShake: 12,
  cataclysmShockwaveRadius: 220,
  cataclysmShockwaveDamage: 65,
  cataclysmShockwaveKnockback: 22.0,
  cataclysmSecondaryFireballs: 6,
  cataclysmSecondarySpeed: 7.5,
  cataclysmSecondaryDamage: 18,

  // ── Skill 4: Off-Screen Telegraphed Divebomb Strafe (divebombStrafe) ──
  divebombCooldown: 600, // 10.0s
  divebombTelegraphFrames: 55, // ~0.91s ground danger corridor warning
  divebombDurationFrames: 22,
  divebombSpeed: 24.5,
  divebombCorridorWidth: 95,
  divebombDamage: 45,
  divebombKnockback: 22.0,
  divebombReach: 95,
  divebombAcidDeployInterval: 4,

  // ── Death Sequence ──
  deathAscentFrames: 90,
  deathBeamCount: 8,
  deathExplosionRadius: 180,

  // ── Audio SFX Configuration ──
  sounds: {
    roar: 'Assets/Sound Effects/Skills/ragescream.mp3',
    fireball: 'Assets/Sound Effects/Skills/redblast.mp3',
    fireballImpact: 'Assets/Sound Effects/Skills/purpledeploy.mp3',
    wingFlap: 'Assets/Sound Effects/Skills/woosh.mp3',
    swoop: 'Assets/Sound Effects/Skills/dash2.mp3',
    swoopHit: 'Assets/Sound Effects/Attacks/heavypunch1.mp3',
    acidTick: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    lightning: 'Assets/Sound Effects/Skills/thunderstrike.mp3',
    disintegration: 'Assets/Sound Effects/Skills/purpledeploy.mp3',
  },
  soundVolumes: {
    roar: 1.0,
    fireball: 0.85,
    fireballImpact: 0.90,
    wingFlap: 0.65,
    swoop: 0.90,
    swoopHit: 0.95,
    acidTick: 0.50,
    lightning: 0.85,
    disintegration: 1.0,
  }
};
