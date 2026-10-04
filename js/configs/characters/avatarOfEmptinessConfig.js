// ─────────────────────────────────────────────
// Avatar of Emptiness Character Config
// Terraria: Wrath of the Gods — The Final Manifestation
// ─────────────────────────────────────────────

export const avatarOfEmptinessConfig = {
  id: 'avatarofemptiness',
  name: 'Avatar of Emptiness',
  displayName: 'Avatar of Emptiness',
  category: 'Gaming',
  bossTitle: 'Sovereign of the Three Universes',
  title: 'Sovereign of the Three Universes',

  // Core Combat Stats
  hp: 460,
  maxHp: 460,
  speed: 4.7,
  moveSpeed: 4.7,
  radius: 29,
  r: 42,
  damage: 17,
  cooldown: 34,
  projectileSpeedMultiplier: 1.0,

  // Theme & Aesthetics Palette
  color: '#9D4EDD',            // Abyssal Void Amethyst
  themeColor: '#9D4EDD',       // Primary Theme Color
  secondaryColor: '#00F5D4',   // Cryonic Rift Cyan
  accentCrimson: '#FF0055',    // Visceral Blood Red
  accentCyan: '#00F5D4',       // Cryonic Cyan
  accentViolet: '#9D4EDD',     // Abyssal Amethyst
  accentDark: '#06070B',       // Antishadow Obsidian
  accentWhite: '#FFFFFF',      // Singularity Core

  ability: 'Universal Annihilation & Three Universes',
  desc: 'The incomprehensible sovereign of the Dark, Cryonic, and Visceral Universes from Terraria: Wrath of the Gods. Fires homing Antimatter Void Blasts, triggers Cryonic Absolute Zero frost outbursts, summons Visceral Blood Torrents, strikes with Dark Portal Arms, and uncages the reality-shattering "Universal Annihilation" cosmic death beam.',

  // ──────────────────────────────────────────
  // Basic Attack: Antimatter Void Blasts
  // ──────────────────────────────────────────
  enableVoidBlasts: 1,
  blastDamage: 15,
  blastSpeed: 11.0,
  blastHomingStrength: 0.065,
  blastCount: 3,
  blastSpreadAngle: 0.35,
  blastLife: 140,
  blastRadius: 7,
  blastColor: '#9D4EDD',

  // ──────────────────────────────────────────
  // Skill 1: Cryonic Absolute Zero (Frost Pulse & Columns)
  // ──────────────────────────────────────────
  enableCryonicZero: 1,
  cryonicCost: 0,
  cryonicCooldown: 360,
  cryonicDuration: 150,
  cryonicDamage: 30,
  cryonicRadius: 130,
  cryonicChillSlowPct: 0.45,
  cryonicColumnsCount: 3,

  // ──────────────────────────────────────────
  // Skill 2: Visceral Blood Torrent (Vortex Whirlpool)
  // ──────────────────────────────────────────
  enableVisceralTorrent: 1,
  visceralCost: 0,
  visceralCooldown: 390,
  visceralDuration: 90,
  visceralDamage: 38,
  visceralReach: 155,
  visceralArc: Math.PI * 0.88,
  visceralKnockback: 13.0,

  // ──────────────────────────────────────────
  // Skill 3: Dark Dimension Portal Strikes (Arm Jut Out)
  // ──────────────────────────────────────────
  enablePortalStrikes: 1,
  portalCost: 0,
  portalCooldown: 480,
  portalStrikesCount: 4,
  portalStrikeDamage: 12,
  portalStrikeInterval: 14,
  portalStrikeRange: 260,

  // ──────────────────────────────────────────
  // Ultimate: Universal Annihilation (Apocalyptic Reality Shatter)
  // ──────────────────────────────────────────
  enableUniversalAnnihilation: 1,
  annihilationCost: 0,
  annihilationCooldown: 880,
  annihilationWindupFrames: 50,
  annihilationFireFrames: 95,
  annihilationRecoveryFrames: 30,
  annihilationDamageTick: 6,
  annihilationTickRate: 4,
  annihilationBeamWidth: 52,
  annihilationBeamLength: 1300,
  annihilationScreenShake: 7.0,
  annihilationRecoil: 3.5,

  // ──────────────────────────────────────────
  // AI Spacing & Decision Thresholds
  // ──────────────────────────────────────────
  aiPreferredDistMin: 140,
  aiPreferredDistMax: 300,
  aiAggression: 0.85
};
