// ─────────────────────────────────────────────
// Knight Character Configuration
// Broadsword Melee Combos & Tower Shield Defense
// ─────────────────────────────────────────────

export const knightConfig = {
  name: 'Knight',
  displayName: 'Knight',
  category: 'Fantasy & Magic',
  color: '#9e9e9e',
  themeColor: '#9e9e9e',
  hudSkillBarColor: '#9e9e9e',
  damageNumberColor: '#E2E8F0',
  r: 20,
  radius: 20,
  hp: 110,
  maxHp: 110,
  damage: 28,
  moveSpeed: 4.8,
  speed: 4.8,
  ability: 'Tower Shield & Broadsword',
  desc: 'Wields an HP-backed tower shield with passive DEF buff that absorbs all incoming damage until broken, leaving him vulnerable with 50% reduced DEF.',

  assets: {
    hair: 'Assets/model/Knight/Knight_hair.jpg',
    shield: 'Assets/model/Knight/Knight_shield.jpg',
    sword: 'Assets/model/Knight/Knight_sword.jpg',
  },

  // Shield Defense & Deflection Hit-Pause
  shieldBlockChance: 1.0,         // 100% block chance: tower shield passively blocks every incoming attack while active
  blockAllSkills: true,           // Passively blocks all skills, beams, lasers, spells, and explosions while shield is active
  blockFlashFrames: 18,
  shieldHoldFrames: 50,
  blockHitPauseFrames: 8,         // Guard deflection hit-pause duration when tower shield blocks an incoming attack
  blockMeleeDetectionRadius: 130,
  blockProjectileDetectionRadius: 200,

  // Shield HP, Defense Buff & Broken State Mechanics
  shieldHp: 200,                   // Starting shield HP
  shieldMaxHp: 200,                // Maximum shield HP
  shieldPassiveDefBuff: 0.40,     // 40% passive damage reduction applied while shield is active
  shieldBrokenDefPenalty: 0.50,   // Loses 50% of passive DEF buff when shield breaks (40% drops to 20%)

  // Broadsword 2-Hit Cleave & Hit-Pause
  enableMeleeCombo: true,
  swordRange: 75,
  swordCooldown: 38,
  swipeCooldown: 38,
  swipeDuration: 30,
  swordDamage: 30,
  comboResetFrames: 90,

  // Hit 1: Horizontal Cross Cleave (Rule 30: 5-Phase Timing)
  hit1LiftFrames: 7,
  hit1HoldFrames: 2,
  hit1StrikeFrames: 5,
  hit1ImpactLockFrames: 6,
  hit1RecoveryFrames: 10,
  hit1Damage: 28,
  hit1Knockback: 6.0,
  hit1LungeSpeed: 6.5,
  hit1HitPauseFrames: 7,          // Visceral impact freeze when Hit 1 connects
  hit1HitStunFrames: 10,

  // Hit 2: Upward Rising Cleave (Rule 30: 5-Phase Timing)
  hit2LiftFrames: 6,
  hit2HoldFrames: 2,
  hit2StrikeFrames: 5,
  hit2ImpactLockFrames: 7,
  hit2RecoveryFrames: 12,
  hit2Damage: 34,
  hit2Knockback: 8.5,
  hit2LungeSpeed: 7.2,
  hit2HitPauseFrames: 9,          // Heavier finisher impact freeze when Hit 2 connects
  hit2HitStunFrames: 14,

  // ──────────────────────────────────────────
  // AUDIO CONFIGURATION & SOUND VOLUMES
  // ──────────────────────────────────────────
  sounds: {
    // Tower Shield Defense & Guard Deflection
    shieldBlock: 'Assets/Sound Effects/Skills/shieldblock.mp3',
    shieldBlockSecondary: 'Assets/Sound Effects/Skills/shieldblock2.mp3',
    shieldBreak: 'Assets/Sound Effects/SkillEffects/shield-break.mp3',

    // Broadsword 5-Phase Melee Cleaves (Chemical Katana Combo)
    swordLift: 'Assets/Sound Effects/Skills/dash1.mp3',               // Phase 1: Backward anticipation coil flutter
    anticipation: 'Assets/Sound Effects/Skills/dash1.mp3',            // Alias
    swordSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',        // Phase 3: Hypersonic whip strike blade whoosh
    energySword: 'Assets/Sound Effects/Attacks/energysword2.mp3',     // Legacy basic attack energy blade swipe
    fleshHit: 'Assets/Sound Effects/Attacks/fleshhit.mp3',            // Phase 4: Visceral fleshy impact slap
    bladeSlice: 'Assets/Sound Effects/Attacks/Sukuna-slice.mp3',      // Phase 4: Blade edge cut resonance
    heavyImpact: 'Assets/Sound Effects/Attacks/heavypunch1.mp3',      // Phase 5 / Hit 2: Finisher concussive unpause sub-bass punch
    unpauseHit: 'Assets/Sound Effects/Attacks/heavypunch1.mp3',       // Alias

    // Arena Mobility & Physics
    wallBounce: 'Assets/Sound Effects/Skills/dash1.mp3',              // Arena wall bounce deflection
  },

  soundVolumes: {
    shieldBlock: 0.95,
    shieldBlockSecondary: 0.80,
    shieldBreak: 1.0,
    swordLift: 0.00,
    anticipation: 0.00,
    swordSwing: 0.95,
    energySword: 0.70,
    fleshHit: 1.0,
    bladeSlice: 0.90,
    heavyImpact: 0.85,
    unpauseHit: 0.85,
    wallBounce: 0.00,
  },

  audioVolumes: {
    shieldBlock: 0.95,
    shieldBlockSecondary: 0.80,
    shieldBreak: 1.0,
    swordLift: 0.40,
    anticipation: 0.40,
    swordSwing: 0.95,
    energySword: 0.70,
    fleshHit: 1.0,
    bladeSlice: 0.90,
    heavyImpact: 0.85,
    unpauseHit: 0.85,
    wallBounce: 0.50,
  },

  soundDelays: {
    shieldBlock: 0,
    shieldBlockSecondary: 0,
    shieldBreak: 0,
    swordLift: 0,
    anticipation: 0,
    swordSwing: 0,
    energySword: 0,
    fleshHit: 0,
    bladeSlice: 0,
    heavyImpact: 0,
    unpauseHit: 0,
    wallBounce: 0,
  },
};
