// ─────────────────────────────────────────────
// Gun Slinger — Dual Revolver Outlaw Config
// ─────────────────────────────────────────────

export const gunslingerConfig = {
  // ── Base Character Attributes ──
  id: 13,
  name: 'Gun Slinger',
  characterId: 'gunslinger',
  category: 'Sci-Fi & Modern',
  title: 'Western Outlaw',
  bossTitle: 'Western Outlaw',
  hp: 80,                       // Balanced baseline HP (increased from 70)
  damage: 6,                    // Base bullet damage (tuned from 10 to 6 for ~24 DPS)
  cooldown: 25,
  speed: 5.0,
  moveSpeed: 5.0,
  r: 25,
  radius: 25,
  color: '#C19A6B',
  themeColor: '#C19A6B',
  startX: 260,
  startY: 250,
  startVx: 1.4,
  startVy: -0.8,
  aimbot: false,
  spinRate: 0.03,
  projectileSpeedMultiplier: 1.0,
  ability: 'Dual Revolvers',
  desc: 'Wields dual revolvers on both sides. Alternates rapid-fire shots and activates rapid sync fire.',

  // ── Magazine & Reload System (Twin 6-Shooters) ──
  enableMagazine: true,         // Master toggle for magazine system
  magazineSize: 12,             // 12 bullets total (authentic 6 rounds per cylinder)
  reloadTime: 75,               // Frames to reload (1.25s at 60 fps)
  magazineRegenRate: 0,         // Bullets regenerated per second (0 = manual reload only)
  reloadSpeedPenalty: 0.75,     // Movement speed multiplier during reload (25% slowdown)

  // ── Basic Attack (Alternating Dual Revolvers) ──
  enableBasicAttack: true,      // Master toggle for basic attack
  leftGunDelay: 8,              // Frames delay for left gun shot after right gun
  shotCooldown: 15,             // Frames between alternating shots (4 shots/sec)
  bulletDamage: 6,              // Damage per bullet
  bulletSpeed: 30.0,            // Speed of bullets
  basicAttackKnockback: 4.0,    // Micro-recoil impulse on basic attacks

  // ── Passive Skill (Critical Hits & Momentum Scaling) ──
  enablePassive: true,          // Master toggle for crit passive
  critChance: 0.15,             // Base chance (15%) to deal critical damage
  critMultiplier: 1.50,         // Base damage multiplier on critical hit (1.5x = 9.0 dmg)
  critChanceIncrease: 0.03,     // Increase in crit chance (+3%) per crit hit
  critMultiplierIncrease: 0.08, // Increase in damage multiplier (+0.08x) per crit hit
  maxCritChance: 0.50,          // Maximum crit chance cap (50%)
  maxCritMultiplier: 2.20,      // Maximum crit multiplier cap (2.20x = 13.2 dmg)

  // ── Active Skill (Rapid Sync Fire) ──
  enableActiveSkill: true,      // Master toggle for active skill
  skillCooldown: 360,           // Frames between skill uses (6.0s at 60 fps)
  skillDuration: 50,            // Frames the rapid sync fire lasts
  skillBurstCount: 6,           // Number of bullet pairs fired during skill (12 bullets total)
  skillBurstInterval: 8,        // Frames between each bullet pair during skill
  skillDamage: 4.0,             // Damage per bullet during skill (48 total burst damage)
  skillRequiresFullMag: true,   // Skill can only be activated with full magazine
  autoSkillThreshold: 2,        // Bullets or less triggers active skill before reload
  leftGunAngleOffset: 0.3,      // Default left gun aim offset when no secondary target exists

  // ── Sound Effects & Audio Tuning ──
  sounds: {
    shot: 'Assets/Sound Effects/Attacks/revolvershot.mp3',
    reload: 'Assets/Sound Effects/SkillEffects/pistolreload.mp3'
  },
  soundVolumes: {
    shot: 0.50,
    reload: 0.60
  }
};
