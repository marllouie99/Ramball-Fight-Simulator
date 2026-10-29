// ═══════════════════════════════════════════════════════════════════════════
// BOMBER MAN (Hudson Soft / Classic Bomberman) — Character Configuration
// ═══════════════════════════════════════════════════════════════════════════

export const bombermanConfig = {
  id: 'bomberman',
  name: 'Bomber Man',
  displayName: 'Bomber Man',
  grade: 'S',
  category: 'Gaming',
  description:
    'Tactical grid trap-zoner whose Passive (Bomb Up) increases his active bomb limit by +1 every time his basic attack cooldown finishes (1 -> 2 -> 3 -> Max 10), upgrades blast radius with Fire Up (Max 10), kicks bombs so they travel and can explode mid-traveling, and activates an Invincible Ultimate.',

  // ── Base Stats (Rule 24 Universal Baseline Radius: 25) ──
  r: 30,
  radius: 30,
  hp: 360,
  maxHp: 360,
  speed: 4.8,
  moveSpeed: 4.8,
  color: '#2563EB', // Cobalt Blue Tunic
  themeColor: '#2563EB',
  secondaryColor: '#EC4899', // Magenta-Pink Antenna & Boots
  damageNumberColor: '#F97316', // Fiery Blast Orange

  // ── Basic Attack: Tile-Centered Bomb Plant & Passive Bomb Up Cadence ──
  showHeldBomb: true, // When true, displays bomb resting cleanly in right hand when ready to plant (set false for pure classic two-hand symmetry)
  plantCooldown: 90, // 1.50s basic attack cooldown; each time this CD finishes, Passive Bomb Up adds +1 active bomb capacity!
  plantInitialCooldown: 90, // Initial delay (frames) before first bomb plant (0 = immediate first lay)
  layStepInterval: 28, // ~0.47s minimum step delay between dropping individual bombs across tiles
  bombFuseFrames: 150, // 2.50s fuse before cross-explosion (classic readable ticking bomb)
  bombRadius: 22, // Visual & physical obstacle collision radius for enemies
  baseBombDamage: 28, // Base damage per cross-explosion hit
  chainBonusDamage: 8, // Bonus damage when triggered via chain reaction
  bombKnockback: 14, // Outward blast impulse
  explosionDuration: 28, // Visual duration of cross-flame & shockwave rings
  bombSlowDuration: 75, // 1.25s slow debuff applied to entities struck by bomb explosions (~75 frames at 60 FPS)
  bombSlowMultiplier: 0.50, // 50% movement speed reduction during slow debuff (target moves at half speed)
  bombExplosionShakeIntensity: 6.0, // Impactful arena shake intensity on standard bomb explosion
  bombExplosionShakeDuration: 12, // Arena shake duration in frames (~0.20s)
  chainExplosionShakeIntensity: 8.5, // Heavier arena shake intensity on chain reaction domino explosions
  chainExplosionShakeDuration: 16, // Chain reaction shake duration in frames (~0.27s)

  // ── Passive: Bomb Up (Max. 10 — Scales +1 Every Basic Attack Cooldown) ──
  enableBombUp: true,
  initialMaxBombs: 1, // First lay: 1 active bomb; after 1st basic CD: 2 active bombs; after 2nd basic CD: 3 active bombs, etc.
  maxBombsCap: 10, // Hard cap: Max 10 simultaneous active bombs

  // ── Skill 1: Fire Up (Max. 10) ──
  enableFireUp: true,
  initialFireLevel: 1, // Starts at Level 1 blast reach (~1.15 tiles)
  maxFireLevelCap: 20, // Hard cap: Max Level 10 full-arena cross reach
  fireUpCooldown: 210, // ~3.50s between Fire Up power-up activations
  fireUpInitialCooldown: 120, // Initial cooldown at round start (2.0s / 120 frames) before first Fire Up
  baseBlastRadius: 65, // Level 1 arm length in pixels (~1.15 tiles)
  blastRadiusPerLevel: 20, // +20px per Fire Up level (Lv. 10 = 245px per arm)
  damagePerFireLevel: 2.5, // +2.5 damage per Fire Up level (Lv. 10 = ~50.5 dmg)
  flameArmThickness: 42, // Width of each orthogonal cross-flame pillar (generous tile corridor coverage)

  // ── Skill 2: Kick (Bomb Kick — Traveling Bombs & Mid-Travel Explosion) ──
  enableBombKick: true,
  canKickBombs: true, // Allows Bomberman to kick planted bombs across the arena
  bombKickRange: 64, // Must be very close to the bomb (within touching/adjacent boot range) to kick it
  kickHitPauseFrames: 5, // Small kick impact freeze between Bomberman and the bomb upon kick contact (~83ms)
  bombKickCooldown: 150, // 2.50s cooldown between kicks
  bombKickInitialCooldown: 150, // Initial cooldown at round start (1.5s / 90 frames) before first Kick
  bombKickSpeed: 9.5, // Sliding travel speed of kicked bombs (px/frame)
  bombKickImpactDamage: 12, // Direct collision damage when a traveling bomb hits an enemy
  bombKickKnockback: 10, // Knockback dealt on direct traveling bomb collision

  // ── Ultimate: Invincible (Incoming Attack Immunity) ──
  enableInvincible: true,
  invincibleDuration: 200, // ~8.33s incoming attack immunity at 60 FPS (500 frames)
  invincibleCooldown: 1500, // ~16.67s cooldown after activation (1000 frames)
  invincibleInitialCooldown: 1000, // ~16.67s initial charge before first Ultimate cast (1000 frames)
  invincibleSpeedMultiplier: 1.15, // Slight heroic pace boost during Invincible

  // ── Assets (Rule 22 & 12-Frame Animation Standard) ──
  assets: {
    hair: 'Assets/model/bomberman/Bomberman-hair.png',
    kick: 'Assets/model/bomberman/kick/kick-b.png',
    bombGif: 'Assets/model/bomberman/ADHWK1.gif',
    explosionGif: 'Assets/model/bomberman/dFOsRT.gif',
    bombFrames: [
      'Assets/model/bomberman/bomb/bomb-1.png',
      'Assets/model/bomberman/bomb/bomb-2.png',
      'Assets/model/bomberman/bomb/bomb-3.png',
    ],
    bombSheet: 'Assets/model/bomberman/bomb/bomb-sheet.png',
    explosionFrames: [
      'Assets/model/bomberman/explosion/explosion-1.png',
      'Assets/model/bomberman/explosion/explosion-2.png',
      'Assets/model/bomberman/explosion/explosion-3.png',
      'Assets/model/bomberman/explosion/explosion-4.png',
      'Assets/model/bomberman/explosion/explosion-5.png',
      'Assets/model/bomberman/explosion/explosion-6.png',
      'Assets/model/bomberman/explosion/explosion-7.png',
      'Assets/model/bomberman/explosion/explosion-8.png',
      'Assets/model/bomberman/explosion/explosion-9.png',
      'Assets/model/bomberman/explosion/explosion-10.png',
      'Assets/model/bomberman/explosion/explosion-11.png',
      'Assets/model/bomberman/explosion/explosion-12.png',
    ],
    explosionStrip: 'Assets/model/bomberman/explosion/explosion-b.png',
  },

  // ── Audio SFX Paths & Volumes ──
  sounds: {
    plantBomb: 'Assets/Sound Effects/BombermanSFX/Place Bomb.wav',
    bombExplode: 'Assets/Sound Effects/Attacks/explosion.mp3',
    chainExplode: 'Assets/Sound Effects/Attacks/explosion.mp3',
    walk: 'Assets/Sound Effects/BombermanSFX/Walking 1.wav',
    bombUp: 'Assets/Sound Effects/Sprites SFX/crazydave-sun-pickup.mp3',
    fireUp: 'Assets/Sound Effects/BombermanSFX/era_vera-easter22-gun-melee-summon.wav',
    bombKick: 'Assets/Sound Effects/BombermanSFX/Kick - Pressure Block.wav',
    invincibleStart: 'Assets/Sound Effects/Skills/shieldcharge.mp3',
    invincibleDeflect: 'Assets/Sound Effects/Skills/parry.mp3',
  },
  soundVolumes: {
    plantBomb: 0.85,
    bombExplode: 0.85,
    chainExplode: 0.9,
    walk: 0.5,
    bombUp: 0.0,
    fireUp: 0.0,
    bombKick: 0.85,
    invincibleStart: 0.9,
    invincibleDeflect: 0.0,
  },
};
