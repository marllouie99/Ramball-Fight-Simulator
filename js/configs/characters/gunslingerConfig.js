// ─────────────────────────────────────────────
// Alucard — The No-Life King (Hellsing) Config
// Dual Wielding Firearms (.454 Casull & 13mm Jackal)
// ─────────────────────────────────────────────

export const gunslingerConfig = {
  assets: {
    hair: 'Assets/model/alucard/Red-hat.png',
    hat: 'Assets/model/alucard/Red-hat.png',
    glasses: 'Assets/model/alucard/Red-eye-glasses.png',
    weaponCasull: 'Assets/model/alucard/Hellsing_.454_Casull_Pixel_Pistol.png',
    weaponJackal: 'Assets/model/alucard/Hellsing_13mm_Jackal_Pixel_Pistol.png',
    hellhoundFrames: [
      'Assets/model/alucard/Hellbound animation/Hellhound_frame1.png',
      'Assets/model/alucard/Hellbound animation/Hellhound_frame2.png',
      'Assets/model/alucard/Hellbound animation/Hellhound_frame3.png',
      'Assets/model/alucard/Hellbound animation/Hellhound_frame4.png',
      'Assets/model/alucard/Hellbound animation/Hellhound_frame5.png',
    ],
  },

  // ── Base Character Attributes ──
  id: 13,
  name: 'Alucard',
  displayName: 'Alucard',
  grade: 'S',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)
  characterId: 'gunslinger',
  category: 'Anime & Supernatural',
  title: 'The No-Life King',
  bossTitle: 'Vampire of Hellsing',
  hp: 85,                       // Aristocratic vampire HP baseline
  damage: 7,                    // Base .454 Casull holy bullet damage
  cooldown: 20,
  speed: 5.2,
  moveSpeed: 5.2,
  r: 25,
  radius: 25,
  color: '#8B0000',
  themeColor: '#B91C1C',        // Crimson red theme
  startX: 260,
  startY: 250,
  startVx: 1.4,
  startVy: -0.8,
  aimbot: false,
  spinRate: 0.03,
  projectileSpeedMultiplier: 1.0,
  ability: 'Casull & Jackal',
  desc: 'The No-Life King. Possesses Aggressive Regeneration on damage dealt, Heavy Anti-Regeneration Shots (Grievous Wounds), Baskerville Feast, invulnerable Shadow Phase cross-ups, and Mockery Illusion Counter.',

  // ── Magazine & Tactical Reload System (Casull & Jackal) ──
  enableMagazine: true,         // Master toggle for magazine system
  magazineSize: 12,             // 12 rounds total (6 Casull silver rounds, 6 Jackal explosive rounds)
  reloadTime: 70,               // Quick vampire reload (1.16s at 60 fps)
  magazineRegenRate: 0,         // Manual/tactical reload only
  reloadSpeedPenalty: 0.80,     // 20% movement slowdown during reload

  // ── Basic Attacks & Heavy Anti-Regeneration (.454 Casull & 13mm Jackal) ──
  enableBasicAttack: true,      // Master toggle for basic attack
  leftGunDelay: 8,              // Delay between alternating shots
  shotCooldown: 14,             // Frames between alternating fire (~4.3 shots/sec)
  bulletDamage: 7,              // .454 Casull sacred silver bullet damage
  jackalDamage: 8,              // 13mm Jackal explosive mercury bullet damage
  bulletSpeed: 32.0,            // Supersonic high-velocity rounds
  basicAttackKnockback: 4.5,    // Kinetic impact recoil
  grievousWoundsDuration: 180,  // Grievous Wounds / Heal Block duration (3.0s at 60 fps)

  // ── Passive: Aggressive Regeneration ──
  enablePassive: true,          // Master toggle for vampire passive
  lifestealPercent: 0.35,       // Aggressive Regeneration: 35% base damage dealt converted to HP
  lowHpLifestealPercent: 0.50,  // Aggressive Regeneration: 50% lifesteal when HP <= 50% maxHp
  critChance: 0.15,             // Base critical hit chance (15%)
  critMultiplier: 1.50,         // Base critical hit multiplier (1.50x)
  critChanceIncrease: 0.04,     // Momentum increase (+4% crit chance per crit)
  critMultiplierIncrease: 0.10, // Momentum increase (+0.10x crit multiplier per crit)
  maxCritChance: 0.50,          // Maximum crit cap (50%)
  maxCritMultiplier: 2.20,      // Maximum crit multiplier (2.20x)

  // ── Skill 1: Baskerville Feast ──
  enableSkill1: true,           // Master toggle for Baskerville Feast
  skill1Cooldown: 240,          // Hound surge cooldown (4.0s at 60 fps)
  houndDamage: 22.0,            // Baskerville Shadow Hound bite damage
  houndSpeed: 18.0,             // Screen-crossing charge speed

  // ── Skill 2: Shadow Phase ──
  enableSkill2: true,           // Master toggle for Shadow Phase
  skill2Cooldown: 320,          // Shadow Phase cooldown (5.33s at 60 fps)
  shadowPhaseDuration: 22,      // Dash duration (frames)
  shadowPhaseSpeed: 18.0,       // High-speed phase velocity
  shadowPhaseInvulnerable: true,// 100% i-frames during dash

  // ── Skill 3: Illusion Counter ──
  enableSkill3: true,           // Master toggle for Illusion Counter
  skill3Cooldown: 420,          // Illusion Counter cooldown (7.0s at 60 fps)
  counterStanceDuration: 60,    // Mockery stance parry window (1.0s at 60 fps)
  counterDamage: 26.0,          // Point-blank dual execution counter-strike damage
  counterTimeStop: 25,          // Attacker hit-pause duration (frames)

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

export const alucardConfig = gunslingerConfig;

