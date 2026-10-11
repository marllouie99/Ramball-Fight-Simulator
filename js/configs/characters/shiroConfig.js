// ─────────────────────────────────────────────
// Shiro — Queen of Elkia (『　　』 Blank) Config
// Disboard Chess Prodigy & Living Chess Troops
// ─────────────────────────────────────────────

export const shiroConfig = {
  assets: {
    hair: 'Assets/model/shiro/shiro-hair.png',
    crown: 'Assets/model/shiro/shiro_crown.png',
    chessSpriteSheet: 'Assets/model/shiro/Pixel Chess Set Sprite Sheet.png',
  },

  name: 'Shiro',
  displayName: 'Shiro',
  // Base Attributes (Rule 24 Standard Humanoid Radius)
  hp: 340,
  maxHp: 340,
  speed: 5.6,
  moveSpeed: 5.6,
  r: 26,
  radius: 26,
  color: '#A855F7', // Soft Lavender Violet
  themeColor: '#8B5CF6', // Radiant Royal Violet
  damageNumberColor: '#38BDF8', // Crystalline Cyan
  startX: 350,
  startY: 250,
  startVx: 1.5,
  startVy: 1.5,
  damage: 24,
  cooldown: 75, // Deliberate grandmaster turn cadence (~1.25s between throws)
  projectileSpeedMultiplier: 1.0,
  ability: 'Disboard Chess Prodigy & Living Troops',
  bossTitle: 'Queen of Elkia 『　　』',
  title: 'The Chess Prodigy 『　　』',
  desc: 'Mastermind of Blank 『　　』 & Living Chess Prodigy. Commands the Disboard Chessboard, flicks living chess pieces (Pawn, Knight, Bishop, Rook, Queen), executes calculated 1-by-1 grandmaster tactical maneuvers, and calculates Checkmate in 10^120 variations!',

  // Passive 1: Center-Board Dominance (Chūō Shihai)
  enableCenterDominance: true,
  centerSlideVelocity: 28.0,
  centerZoneRadius: 45,
  centerPoiseReduction: 0.20, // 20% super-armor / knockback reduction in center
  chessboardGridDuration: 300, // 5.0s (300 frames)

  // Passive 2: Loaded Dice & Probability Pity System
  enableLoadedDice: true,
  pityThreshold: 4, // Guaranteed Rook or Queen every 4th basic attack throw

  // Passive 3: 『　　』 (Blank) Never Loses & Prediction
  predictionBonusDmg: 0.20, // +20% bonus damage on Check! status
  predictionDebuffDuration: 180, // 3.0s

  // Basic Attack: RNG Chess Troop Gacha Throw (Zero Active Skills)
  enableChessTroops: true,
  throwSpeed: 10.0, // Base piece throw/flick projectile velocity
  throwSpeedMultiplier: 1.0, // Global projectile speed multiplier for all throws
  projectileRadius: 6, // Small compact projectile collision radius during flight (distinct from planted troop size)
  projectileScale: 0.45, // Visual scale multiplier for small flying projectile pieces
  basicAttackCooldown: 200, // Deliberate Grandmaster Turn Cadence (~1.25s)
  maxActiveMinions: 16, // Max 4 concurrent living chess troops permanently defending tiles
  minionPermanent: true, // Troops stay indefinitely until destroyed by enemy attacks
  turnCooldown: 10, // Authentic chess 1-by-1 turn cadence between piece moves

  // Weighted Gacha Drop Rates
  dropRates: {
    pawn: 0.50,    // 50% Common
    knight: 0.20,  // 20% Uncommon
    bishop: 0.15,  // 15% Uncommon
    rook: 0.10,    // 10% Rare
    queen: 0.05    // 5% Jackpot
  },

  // Troop Specific Tuning (All troop movement & throw speeds set to 10)
  troops: {
    pawn: {
      name: 'Pawn',
      throwSpeed: 10.0,
      projSpeed: 15.0,
      moveSpeed: 15.0,
      moveDuration: 10,
      projectileRadius: 5.5,
      projDmg: 20,
      hp: 30,
      radius: 15,
      captureRange: 48,
      captureDmg: 14,
      captureStun: 10
    },
    knight: {
      name: 'Knight',
      throwSpeed: 10.0,
      projSpeed: 10.0,
      moveSpeed: 15.0,
      moveDuration: 10,
      projectileRadius: 6.5,
      projDmg: 18,
      hp: 40,
      radius: 17,
      leapDmg: 30,
      leapStun: 16,
      leapAoe: 58,
      slowDuration: 90, // 1.5s slow debuff
      slowMultiplier: 0.40, // 60% movement slow
      screenShakeIntensity: 5.0,
      screenShakeDuration: 10
    },
    bishop: {
      name: 'Bishop',
      throwSpeed: 10.0,
      projSpeed: 10.0,
      moveSpeed: 16.0,
      moveDuration: 10,
      projectileRadius: 6.0,
      projDmg: 30,
      hp: 35,
      radius: 16,
      laserDmg: 20,
      laserInterval: 50,
      maxBounces: 2,
      bleedDuration: 150, // 2.5s bleed debuff
      bleedDmgPerTick: 4,
      bleedInterval: 25
    },
    rook: {
      name: 'Rook',
      throwSpeed: 10.0,
      projSpeed: 10.0,
      moveSpeed: 10.0,
      moveDuration: 10,
      projectileRadius: 7.0,
      projDmg: 30,
      hp: 50, // Sturdy Fortress Bulwark
      radius: 18,
      laserDmg: 22,
      laserInterval: 60,
      knockbackImpulse: 18.0, // Strong fortress ram knockback
      stunDuration: 45 // ~0.75s stun/paralyze debuff
    },
    queen: {
      name: 'Queen',
      throwSpeed: 10.0,
      projSpeed: 10.0,
      moveSpeed: 10.0,
      moveDuration: 10,
      projectileRadius: 7.5,
      projDmg: 50,
      hp: 100, // Regal Champion
      radius: 18,
      slashDmg: 34,
      slashAoe: 110,
      slashInterval: 40,
      // Queen All-Debuff Suite (Knight Slow + Rook Stun/Knockback + Bishop Bleed + Screen Shake)
      slowDuration: 120, // 2.0s slow debuff
      slowMultiplier: 0.35, // 65% movement slow
      knockbackImpulse: 20.0, // Radial outward hurricane blast
      stunDuration: 50, // ~0.83s paralyze/stun debuff
      bleedDuration: 180, // 3.0s bleed debuff
      bleedDmgPerTick: 5,
      bleedInterval: 25,
      screenShakeIntensity: 6.0,
      screenShakeDuration: 12
    }
  },

  // ──────────────────────────────────────────
  // AUDIO CONFIGURATION & SOUND EFFECT MAPPING
  // ──────────────────────────────────────────
  sounds: {
    // 1. Troop Summon
    troopSummon: 'Assets/Sound Effects/Shiro/StarblessedPlatformActivate.ogg',

    // 2. Troop Movement
    troopMove: 'Assets/Sound Effects/Shiro/FingerSnap.ogg',

    // 3. Chessboard Appear & Shutdown
    boardAppear: 'Assets/Sound Effects/Shiro/shiro_chessboard_turnon.mp3',
    boardShutdown: 'Assets/Sound Effects/Shiro/LightFlickerOff.ogg',

    // 4. Knight Spawn Shockwaves
    knightSlam: 'Assets/Sound Effects/Attacks/groundSmash.mp3',

    // 5. Queen Checkmate Shockwave Whirlwind
    queenSlam: 'Assets/Sound Effects/Attacks/groundSmash.mp3',

    // 6. Rook Fortress Ram Impact
    rookRam: 'Assets/Sound Effects/Attacks/groundSmash.mp3'
  },

  // Audio Volume Normalization & Acoustic Balancing
  soundVolumes: {
    troopSummon: 0.50,
    troopMove: 0.85,
    boardAppear: 4.85,
    boardShutdown: 4.85,
    knightSlam: 0.95,
    queenSlam: 1.0,
    rookRam: 0.90,
    fleshHit: 0.80
  },
  audioVolumes: {
    troopSummon: 0.50,
    troopMove: 0.85,
    boardAppear: 0.85,
    boardShutdown: 0.85,
    knightSlam: 0.95,
    queenSlam: 1.0,
    rookRam: 0.90,
    fleshHit: 0.80
  }
};
