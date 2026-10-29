// ═══════════════════════════════════════════════════════════════════════════
// PAC-MAN (Namco / Retro Arcade Legend) — Character Configuration
// ═══════════════════════════════════════════════════════════════════════════

export const pacmanConfig = {
  id: 'pacman',
  name: 'Pac-Man',
  displayName: 'Pac-Man',
  grade: 'S',
  category: 'Gaming',
  description:
    'Retro arcade legend who navigates the arena eating dots on every tile. Once all arena dots are consumed, Pac-Man enters Super Chomp mode, gaining temporary attack power to hunt and bite enemies for 30% damage before refilling the arena with dots.',

  // ── Base Stats (Rule 24 Universal Baseline Radius: 25) ──
  r: 32,
  radius: 32,
  hp: 350,
  maxHp: 350,
  speed: 4.8,
  moveSpeed: 4.8,
  color: '#F2F000', // Classic Pac-Man Yellow
  themeColor: '#F2F000',
  secondaryColor: '#EF4444', // Retro Arcade Red
  damageNumberColor: '#F2F000',
  hideHands: true, // Classic round arcade ball body (hands hidden)
  hideWeapon: true,
  hideHair: true, // Classic faceless 8-bit sphere (no headband)

  // ── Core Dot-Eating & Arena Tile Mechanic ──
  dotRadius: 4,
  dotEatRadius: 28, // Proximity threshold for Pac-Man to gobble a dot
  powerPelletRadius: 8, // Larger energizer dots at corner tiles
  dotColor: '#FFE082', // Retro pellet cream-yellow
  powerPelletColor: '#F2F000',

  // ── Chomp Mode (Empowered 30% Attack State) ──
  enableChompMode: true,
  chompModeDuration: 150, // ~6.0s duration at 60 FPS
  chompDamagePercent: 0.20, // 30% damage on contact
  chompSpeedMultiplier: 1.25, // 25% movement speed boost while chasing enemies
  chompAttackCooldown: 45, // Delay between consecutive chomps (~0.75s)
  chompKnockback: 14, // Outward knockback impulse delivered to bitten enemies
  chompHitStun: 24, // Hit stun frames on target bitten by Pac-Man

  // ── Ghost Transformation Debuff (Enemy Frightened State) ──
  enableGhostTransformation: true,
  ghostDuration: 360, // Duration enemy remains in ghost state (matching Chomp Mode)

  // ── Swallowed Enemy Digestion (Damage Per Second) ──
  enableSwallowedDps: true,
  swallowedDpsInterval: 60, // Damage tick interval in frames (60 frames = 1.0 second)
  swallowedDamagePercentPerSecond: 0.05, // Deals 5% max HP damage every second while swallowed
  swallowedDpsFlatDamage: 25, // Fallback flat damage if maxHp is unavailable

  // ── Audio SFX Configuration ──
  sounds: {
    waka: 'Assets/Sound Effects/PacmanSFX/pac-man_eat_fruits.mp3',
    eatDot: 'Assets/Sound Effects/PacmanSFX/pac-man_eat_fruits.mp3',
    eatFruit: 'Assets/Sound Effects/PacmanSFX/pac-man_eat_fruits.mp3',
    powerPellet: 'Assets/Sound Effects/PacmanSFX/PAC-MAN - Eating The Big Fruit.mp3',
    eatBigFruit: 'Assets/Sound Effects/PacmanSFX/PAC-MAN - Eating The Big Fruit.mp3',
    ghostTurnBlue: 'Assets/Sound Effects/PacmanSFX/Ghost - Turn to Blue.mp3',
    eatGhost: 'Assets/Sound Effects/PacmanSFX/PAC-MAN - Eating The Ghost.mp3',
    death: 'Assets/Sound Effects/PacmanSFX/pac-man-death-sound.mp3',
    chomp: 'Assets/Sound Effects/PacmanSFX/chomp.wav',
    refill: 'Assets/Sound Effects/PacmanSFX/refill.wav',
  },
  soundVolumes: {
    waka: 0.70,
    eatDot: 0.70,
    eatFruit: 0.70,
    powerPellet: 0.90,
    eatBigFruit: 0.90,
    ghostTurnBlue: 0.85,
    eatGhost: 0.95,
    death: 1.00,
    chomp: 0.90,
    refill: 0.80,
  },

  // ── Backward-compatible Sound Getters & Setters ──
  get deathSound() { return this.sounds.death; },
  set deathSound(v) { this.sounds.death = v; },
  get deathVolume() { return this.soundVolumes.death; },
  set deathVolume(v) { this.soundVolumes.death = v; },
  get eatDotSound() { return this.sounds.eatDot; },
  set eatDotSound(v) { this.sounds.eatDot = v; },
  get eatDotVolume() { return this.soundVolumes.eatDot; },
  set eatDotVolume(v) { this.soundVolumes.eatDot = v; },
  get eatBigFruitSound() { return this.sounds.eatBigFruit; },
  set eatBigFruitSound(v) { this.sounds.eatBigFruit = v; },
  get eatBigFruitVolume() { return this.soundVolumes.eatBigFruit; },
  set eatBigFruitVolume(v) { this.soundVolumes.eatBigFruit = v; },
  get ghostTurnBlueSound() { return this.sounds.ghostTurnBlue; },
  set ghostTurnBlueSound(v) { this.sounds.ghostTurnBlue = v; },
  get ghostTurnBlueVolume() { return this.soundVolumes.ghostTurnBlue; },
  set ghostTurnBlueVolume(v) { this.soundVolumes.ghostTurnBlue = v; },
  get eatGhostSound() { return this.sounds.eatGhost; },
  set eatGhostSound(v) { this.sounds.eatGhost = v; },
  get eatGhostVolume() { return this.soundVolumes.eatGhost; },
  set eatGhostVolume(v) { this.soundVolumes.eatGhost = v; },

  // ── Assets (Rule 22 Dedicated Hair / Head Asset Standard) ──
  assets: {
    hair: 'Assets/model/pacman/Pacman-hair.png',
    ghost: 'Assets/model/pacman/pacman-ghost.png',
    ghostFlash: 'Assets/model/pacman/pacman-ghost-flash.png',
  },
};

