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
    waka: 'Assets/Sound Effects/PacmanSFX/waka.wav',
    chomp: 'Assets/Sound Effects/PacmanSFX/chomp.wav',
    powerPellet: 'Assets/Sound Effects/PacmanSFX/power_pellet.wav',
    refill: 'Assets/Sound Effects/PacmanSFX/refill.wav',
  },
  soundVolumes: {
    waka: 0.65,
    chomp: 0.90,
    powerPellet: 0.85,
    refill: 0.80,
  },

  // ── Assets (Rule 22 Dedicated Hair / Head Asset Standard) ──
  assets: {
    hair: 'Assets/model/pacman/Pacman-hair.png',
    ghost: 'Assets/model/pacman/pacman-ghost.png',
    ghostFlash: 'Assets/model/pacman/pacman-ghost-flash.png',
  },
};

