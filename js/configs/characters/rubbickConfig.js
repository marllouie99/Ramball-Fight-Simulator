// ─────────────────────────────────────────────
// Rubbick — Arcane Mage & Spell Steal Config
// ─────────────────────────────────────────────
export const rubbickConfig = {
  // ── Base Attributes ──
  hp: 85,
  speed: 8.2,
  moveSpeed: 8.2,
  r: 25,
  radius: 25,
  color: '#03e631ff',
  themeColor: '#00FF64',
  startX: 310,
  startY: 230,
  startVx: -1.2,
  startVy: 1.0,
  damage: 12,
  cooldown: 100,
  projectileSpeedMultiplier: 1.0,
  spinRate: 0.02,
  ability: 'Spell Steal',
  desc: 'Fires bouncing arcane bolts. Telekinetically lifts and stuns enemies. Ultimate steals the last used enemy skill.',

  // ── Basic Attack: Arcane Bolt ──
  boltDamage: 12,
  boltSpeed: 8,
  bounceCount: 4,
  bounceDamageMultiplier: 0.7, // Damage multiplier on each bounce
  attackCooldown: 100,
  flurryDamage: 10,

  // ── Skill 1: Telekinesis ──
  telekinesisCooldown: 400,
  telekinesisDuration: 90, // Frames target is held in air
  telekinesisStunRadius: 100, // AoE stun on landing
  telekinesisStunDuration: 60, // Frames enemies are stunned on landing
  telekinesisRange: 250,
  telekinesisLandDamage: 75, // Impact damage dealt when slammed onto the ground

  // ── Ultimate: Spell Steal ──
  spellStealCooldown: 700,
  spellStealDuration: 1000, // Duration stolen skill remains active (frames)
  spellStealRange: 350,
  spellStealCastDelay: 45, // Delay in frames before casting a newly stolen skill
};

export const tricksterConfig = rubbickConfig;

