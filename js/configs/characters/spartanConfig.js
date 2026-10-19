// ─────────────────────────────────────────────
// Spartan Character Configuration
// Dory Spear Piercing Combos, Hoplon Shield & Ranged Javelin Throw
// ─────────────────────────────────────────────

export const spartanConfig = {
  name: 'Spartan',
  displayName: 'Spartan',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)
  category: 'Greek Mythology',
  color: '#b91c1c',                // Spartan crimson cloak
  themeColor: '#d97706',           // Ancient bronze gold
  damageNumberColor: '#FBBF24',
  r: 25,
  radius: 25,
  hp: 110,
  maxHp: 110,
  damage: 32,
  moveSpeed: 4.9,
  speed: 4.9,
  ability: 'Dory Spear & Javelin Hurl',
  desc: 'Fights with a long-reach Dory spear and Hoplon shield, hurling heavy piercing Javelins at distant targets.',

  assets: {
    hair: 'Assets/model/Spartan/spartan_helmet.png',
    crest: 'Assets/model/Spartan/spartan_helmet.png',
    shield: 'Assets/model/Spartan/spartan_shield.png',
    spear: 'Assets/model/Spartan/spartan_spear.png',
  },

  // ── Hoplon Round Bronze Shield (Passive Frontal Deflection) ──
  shieldBlockChance: 0.35,         // 35% passive frontal block chance with bronze shield
  blockFlashFrames: 16,
  shieldHoldFrames: 45,
  blockHitPauseFrames: 7,

  // ── Dory Spear Linear Melee Thrust (5-Phase Melee Standard: Rule 30) ──
  spearRange: 95,                  // Long melee reach (longer than swords)
  spearCooldown: 34,
  spearDamage: 32,
  spearArcAngle: 55,               // 55 degree narrow frontal thrust cone

  hitLiftFrames: 6,                // Phase 1: Draw spear back along right flank
  hitHoldFrames: 2,                // Phase 2: Poised thrust ready
  hitStrikeFrames: 5,              // Phase 3: Explosive piercing thrust lunge
  hitImpactLockFrames: 6,          // Phase 4: Impact lock / target impale freeze
  hitRecoveryFrames: 9,            // Phase 5: Spear retract to ready guard
  hitKnockback: 7.0,
  hitLungeSpeed: 6.8,
  hitHitPauseFrames: 8,            // Visceral freeze on spear impale
  hitHitStunFrames: 12,

  // ── Heavy Javelin Throw (Medium/Long Range Active Skill) ──
  javelinCooldown: 360,            // 6.0 second cooldown (360 frames @ 60 FPS)
  javelinMinRange: 110,            // Trigger throw when target is beyond 110px
  javelinDamage: 52,               // Heavy burst damage
  javelinSpeed: 17.5,              // Hypersonic throwing spear velocity
  javelinKnockback: 14.0,          // Massive pinning knockback
  javelinWindupFrames: 16,         // Committed aim windup (Rule 1.4)
  javelinRadius: 5,
  javelinLifeFrames: 120,

  // ──────────────────────────────────────────
  // AUDIO CONFIGURATION & SOUND VOLUMES
  // ──────────────────────────────────────────
  sounds: {
    spearSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    spearPierce: 'Assets/Sound Effects/Attacks/Sukuna-slice.mp3',
    fleshHit: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    shieldBlock: 'Assets/Sound Effects/Skills/shieldblock2.mp3',
    shieldBlockSecondary: 'Assets/Sound Effects/Skills/shieldblock.mp3',
    javelinThrow: 'Assets/Sound Effects/Skills/dash1.mp3',
    javelinImpact: 'Assets/Sound Effects/Attacks/heavypunch1.mp3',
    wallBounce: 'Assets/Sound Effects/Skills/dash1.mp3',
  },

  soundVolumes: {
    spearSwing: 0.90,
    spearPierce: 0.90,
    fleshHit: 1.0,
    shieldBlock: 0.95,
    shieldBlockSecondary: 0.80,
    javelinThrow: 0.85,
    javelinImpact: 0.95,
    wallBounce: 0.50,
  },

  audioVolumes: {
    spearSwing: 0.90,
    spearPierce: 0.90,
    fleshHit: 1.0,
    shieldBlock: 0.95,
    shieldBlockSecondary: 0.80,
    javelinThrow: 0.85,
    javelinImpact: 0.95,
    wallBounce: 0.50,
  },

  soundDelays: {
    spearSwing: 0,
    spearPierce: 0,
    fleshHit: 0,
    shieldBlock: 0,
    shieldBlockSecondary: 0,
    javelinThrow: 0,
    javelinImpact: 0,
    wallBounce: 0,
  },
};
