// ─────────────────────────────────────────────
// Ulquiorra Cifer — Cuatro Espada Config
// Bleach: Arrancar / Hueco Mundo Arc
// ─────────────────────────────────────────────

export const ulquiorraConfig = {
  // ── Base Attributes ──
  hp: 240,
  speed: 6.4,
  moveSpeed: 6.4,
  r: 25,
  radius: 25,
  color: '#00FF88', // Emerald Green Reiatsu
  themeColor: '#00FF88',
  startX: 300,
  startY: 250,
  startVx: 1.2,
  startVy: 1.0,
  damage: 20,
  cooldown: 26,
  projectileSpeedMultiplier: 1.0,
  ability: 'Resurrección: Segunda Etapa',
  desc: 'The 4th Espada. Possesses High-Speed Regeneration, Hierro defense, instantaneous Sonído vanishes, emerald Cero/Cero Oscuras beams, and evolves into Segunda Etapa with Lanza del Relámpago.',

  // ── Basic Attacks & Zanpakutō Murciélago ──
  swordRange: 72,                // Frontal melee blade reach
  swordArc: 130,                 // Frontal arc degrees (Rule 7)
  swordDamage: 22,               // Base sword slash damage
  swordKnockback: 7.5,           // Knockback force
  swordCooldown: 26,             // Attack interval frames

  // ── Mid-Range Poke: Bala (Hollow Bullets) ──
  balaSpeed: 24,                 // Bullet projectile velocity
  balaDamage: 10,                // Damage per bala hit
  balaRadius: 4.5,               // Bullet collision radius
  balaBurstCount: 3,             // Shots per burst
  balaBurstDelay: 4,             // Frames between burst shots
  balaCooldown: 150,             // Cooldown between bursts

  // ── Skill 1: Sonído: Aceleración ──
  sonidoCooldown: 300,           // ~5s cooldown
  sonidoDistance: 220,           // Teleport distance
  sonidoDashFrames: 5,           // Evasion i-frames
  sonidoStrikeDamage: 28,        // Downward flank slash damage

  // ── Skill 2: Cero & Cero Oscuras ──
  ceroDamage: 65,                // Base emerald cero damage
  ceroChargeFrames: 22,          // Beam charge windup
  ceroCooldown: 420,             // ~7s cooldown
  ceroOscurasDamage: 110,        // Resurrección pitch-black Cero damage

  // ── Transformations: Resurrección & Segunda Etapa ──
  stage1HpThreshold: 0.60,       // Stage 1 trigger threshold (60% HP or full ult)
  stage2HpThreshold: 0.30,       // Segunda Etapa trigger threshold (30% HP)
  stage1SpeedMultiplier: 1.35,   // +35% speed in Murciélago
  stage2SpeedMultiplier: 1.50,   // +50% speed in Segunda Etapa
  lanzaDamage: 160,              // Lanza del Relámpago direct impact damage
  lanzaRadius: 140,              // Nuclear explosion radius
  lanzaBurnDamage: 8,            // Lingering Reishi field tick damage
  lanzaCooldown: 720,            // 12s cooldown

  // ── Passive 1: Hierro (Steel Skin) ──
  hierroDamageReduction: 0.15,   // 15% flat incoming damage mitigation
  hierroStunDecayBonus: 0.25,    // 25% faster CC recovery

  // ── Passive 2: High-Speed Regeneration ──
  regenInterval: 60,             // 1 second (60 frames)
  regenAmount: 6,                // ~2.5% max HP per tick
  regenThreshold: 0.50,          // Triggers below 50% HP or out of combat
};
