// ═══════════════════════════════════════════════════════════════════════════
// CREEPER (Minecraft) — Character Configuration
// Adheres strictly to Rule 18 (HUD Theme Consistency), Rule 24 (Toji Standard r=25),
// Rule 23 (Basic Shoot Suppression), and Rule 32 (Universal Black Outline).
// ═══════════════════════════════════════════════════════════════════════════

export const creeperConfig = {
  id: 'creeper',
  name: 'Creeper',
  displayName: 'Creeper',
  grade: 'A',
  category: 'Gaming',
  description:
    'Iconic silent Minecraft stalker with no basic attack. His sole offensive mechanism is stalking opponents and self-detonating with a devastating white-flashing concussive blast (sacrificing HP per explosion), tossing bouncing TNT blocks, and channeling celestial lightning to awaken as Charged Creeper.',

  // ── Base Stats (Rule 24 Universal Baseline Radius: 25) ──
  r: 32,
  radius: 32,
  hp: 380,
  maxHp: 380,
  speed: 4.2,
  moveSpeed: 4.2,
  chargedSpeed: 5.4, // +28% movement pace during Charged Creeper Ultimate
  color: '#22C55E', // Minecraft Foliage Green
  themeColor: '#22C55E',
  secondaryColor: '#38BDF8', // Charged Electric Plasma Cyan
  damageNumberColor: '#22C55E',
  hideHands: true, // Creeper is a handless Minecraft mob

  // ── Basic Attack: Suppressed (Rule 23 — No Basic Attack per Minecraft Lore) ──
  basicAttackCooldown: 999999,
  basicAttackDamage: 0,
  basicAttackReach: 0,
  basicAttackKnockback: 0,

  // ── Passive: Silent Stalker & Gunpowder Core ──
  enableSilentStalker: true,
  backStalkSpeedMultiplier: 1.15, // +15% speed when closing in from behind enemy
  enableDeathDetonation: true,
  deathDetonationFrames: 45, // 0.75s hyper-flashing death sequence before final retaliatory nuke
  deathDetonationRadius: 150,
  deathDetonationDamage: 95,

  // ── Skill 1: "Tssssss..." (Primed Concussive Detonation — Main Offensive Mechanism) ──
  enablePrimedDetonation: true,
  detonationCooldown: 210, // ~3.5s cooldown between self-detonations
  detonationInitialCooldown: 60, // 1.0s initial delay at match start
  primeDurationFrames: 55, // ~0.9s priming inflation and white flashing
  primeVisualScaleMax: 1.28, // Inflates to 1.28x size before blast
  baseBlastRadius: 135, // 135px 360-degree blast zone
  baseBlastDamage: 90, // Direct explosion damage
  selfDetonationHpCost: 65, // Mandatory: Creeper loses 65 HP per self-detonation
  blastKnockback: 18, // Heavy outward velocity impulse
  blastShakeIntensity: 7.5,
  blastShakeDuration: 14,

  // ── Skill 2: Primed TNT Block Toss ──
  enableTntToss: true,
  tntCooldown: 450, // 7.5s cooldown
  tntInitialCooldown: 180, // 3.0s initial delay
  tntThrowSpeed: 7.5,
  tntFuseFrames: 135, // ~2.25s fuse
  tntBlastRadius: 110,
  tntBlastDamage: 65,
  tntKnockback: 14,
  tntBounceCount: 2,

  // ── Ultimate: Charged Creeper (Lightning Awakening) ──
  enableChargedCreeper: true,
  chargedDuration: 1200, // 20.0s charged state at 60 FPS
  chargedCooldown: 1800, // 30.0s cooldown after activation
  chargedInitialCooldown: 1080, // 18.0s initial charge at round start
  chargedDamageMultiplier: 2.47, // Detonation damage boosted to ~210 dmg
  chargedRadiusMultiplier: 1.85, // Explosion radius boosted to ~240px
  chargedElectricShockDamage: 6, // Passive contact shock tick every 15 frames to touching enemies
  chargedElectricShockInterval: 15,

  // ── Assets ──
  assets: {},
};
