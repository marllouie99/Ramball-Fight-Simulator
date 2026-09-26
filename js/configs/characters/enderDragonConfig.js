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
  wingsSpriteSrc: 'Assets/model/Sprites/Dragon-wings-sprite-sheet.png',
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

  // ── Passive: Flight & Arena Physics ──
  isGhostTerrain: false,
  immuneToKnockback: false,
  immuneToPush: false,
  hoverOscillationAmp: 7.0,
  hoverOscillationFreq: 0.05,
  hoverAcceleration: 0.22,
  hoverFriction: 0.93,
  hoverTargetDistanceY: 180,
  hoverOrbitWobbleAmp: 40,
  softLeashRadius: 440,

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
