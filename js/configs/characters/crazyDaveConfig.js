// CRAZY DAVE CONFIGURATION (Plants vs. Zombies)
// Centralized tuning for Crazy Dave stats, Sun economy, and Flora Arsenal
// Dave has NO basic attack — he moves around collecting Sun drops to deploy combat plants!

export const crazyDaveConfig = {
  id: 'crazydave',
  name: 'Crazy Dave',
  displayName: 'CRAZY DAVE',
  category: 'Gaming',
  color: '#84CC16',          // Plant Lime Green
  themeColor: '#84CC16',     // Primary Theme Color
  secondaryColor: '#F59E0B', // Solar Sun Gold
  accentColor: '#38BDF8',    // Frost Blue (Snow Pea)

  // Core Combat Stats (No basic attack)
  hp: 390,
  maxHp: 390,
  speed: 5.2,
  moveSpeed: 5.2,
  radius: 25,
  r: 25,
  damage: 0,                 // Zero basic attack damage (Dave does not attack directly)
  cooldown: 0,               // No basic attack cooldown
  canShoot: false,
  baseRange: 0,
  projectileSpeedMultiplier: 1.0,

  // Ability & Lore Description
  ability: 'Solar Economy & Flora Arsenal ("WABBI WABBO!")',
  desc: 'Crazy Dave has no direct basic attack! He navigates the arena collecting falling Sun drops to deploy sturdy Wall-nut barriers, rapid-fire Peashooters, and chilling Snow Peas that fight on his behalf.',

  // Sun Economy System
  initialSun: 50,
  maxSun: 500,
  sunRadius: 30,             // Sized large and prominent to fill 76.6px grass tiles
  sunPickupValue: 50,
  sunSpawnRate: 70,         // Frames between ambient Sun drops (~1.8s at 60fps)
  sunFallSpeed: 2.2,         // Smooth vertical descent speed
  sunAttractionRadius: 95,   // Magnetic pull radius for Dave towards suns
  sunAttractionSpeed: 7.0,   // Speed at which sun moves toward Dave
  sunDecayFrames: 720,       // 12 seconds before uncollected sun despawns

  // Skill 1: Plant Wall-nut (Barrier Shield Defense Mechanism — Solid Immovable Obstacle)
  enableWallnut: true,
  wallnutCost: 100,           // Costs 50 Sun (PvZ authentic cost)
  wallnutColor: '#CA8A04',   // Nut Amber / Gold
  wallnutHp: 200,            // Massive barrier HP to absorb attacks and block melee charges
  wallnutRadius: 24,         // Solid collision barrier radius
  maxActiveWallnuts: 2,      // Maximum living Wall-nuts Dave can keep active
  wallnutCooldown: 1000,      // Cooldown for planting next Wall-nut
  wallnutSpriteSrc: 'Assets/model/Sprites/Wallnut-sprite-sheet.png',

  // Skill 2: Plant Peashooter (Regular Damage)
  enablePeashooter: true,
  peashooterCost: 100,       // Costs 100 Sun
  peashooterColor: '#4ADE80',
  peashooterHp: 100,
  peashooterFireRate: 22,    // Fires a pea every 22 frames (~0.36s)
  peashooterDamage: 10,      // Regular damage per pea
  peashooterSpeed: 9.5,      // Pea projectile speed
  peashooterRange: 460,      // Firing range
  peashooterRadius: 18,
  peashooterProjectileRadius: 6,
  peashooterProjectileLife: 60,
  peashooterKnockback: 0.5,
  peashooterMuzzleOffsetX: 22,
  peashooterMuzzleOffsetY: -17,
  plantLaneTolerance: 85,    // Straight horizontal lane detection width
  peashooterCooldown: 500,   // 2.0s skill cooldown

  // Skill 3: Plant Snow Pea (Ice Damage + Enemy Slow & Freeze Chance)
  enableSnowPea: true,
  snowPeaCost: 100,          // Costs 175 Sun
  snowPeaColor: '#38BDF8',
  snowPeaHp: 100,
  snowPeaFireRate: 24,       // Fires a frozen pea every 24 frames (~0.40s)
  snowPeaDamage: 12,         // Ice damage per frozen pea
  snowPeaSpeed: 9.5,         // Snow pea projectile speed
  snowPeaRange: 460,         // Firing range
  snowPeaRadius: 18,
  snowPeaProjectileRadius: 5.5,
  snowPeaProjectileLife: 60,
  snowPeaKnockback: 0.0,
  snowPeaMuzzleOffsetX: 22,
  snowPeaMuzzleOffsetY: -19,
  snowPeaSlowDuration: 90,   // 1.5s slow debuff on hit
  snowPeaSlowMultiplier: 0.45, // Slows enemy move speed down to 45%
  snowPeaFreezeChance: 0.25, // 25% chance to completely freeze enemy on hit
  snowPeaFreezeDuration: 60, // 1.0s (60 frames) full freeze stasis duration
  snowPeaCooldown: 500,      // 3.0s skill cooldown

  // Skill 4: Plant Torchwood (Ignites passing peas / melts ice peas)
  enableTorchwood: true,
  torchwoodCost: 100,         // Costs 175 Sun (PvZ authentic cost)
  torchwoodColor: '#F97316',  // Blazing Orange
  torchwoodHp: 100,           // Moderate barrier HP for the burning stump
  torchwoodRadius: 22,        // Robust tree stump radius matching authentic PvZ proportions
  maxActiveTorchwoods: 2,     // Maximum living Torchwoods Dave can keep active
  torchwoodCooldown: 600,     // 10s skill cooldown
  torchwoodInterceptRadius: 42,  // Radius around torchwood that intercepts passing peas
  torchwoodBurnRadius: 70,     // Enemies entering this radius are ignited
  torchwoodBurnDuration: 180,  // Reapply the burn when the current burn expires
  torchwoodFireDamageMultiplier: 2.0,  // Fire peas deal 2x damage
  torchwoodFirePeaSplashRadius: 45,    // Fire pea splash AoE radius on hit
  torchwoodFirePeaSplashDamage: 0.5,   // Splash deals 50% of fire pea damage
  torchwoodFirePeaColor: '#EF4444',    // Fiery Red
  torchwoodSpriteSrc: 'Assets/model/Sprites/torchwood-sprite-sheet.png',

  // Skill 5: Plant Potato Mine (Proximity Explosive Trap — PvZ Classic Area Denial)
  enablePotatoMine: true,
  potatoMineCost: 75,              // Costs 75 Sun (balanced mid-range)
  potatoMineColor: '#A16207',      // Earthy Ochre Brown
  potatoMineHp: 80,                // Low HP — fragile
  potatoMineRadius: 20,            // Modest visual radius on the grass tile
  maxActivePotatoMines: 2,         // Maximum living Potato Mines on field
  potatoMineCooldown: 600,         // 10s skill cooldown between plantings
  potatoMineArmDelay: 0,           // 0 delay — instant arming, explodes immediately when enemy gets close
  potatoMineTriggerRadius: 55,     // Proximity detection radius for enemy fighters
  potatoMineExplosionDamage: 150,  // Massive single-burst explosion damage (SPUDOW!)
  potatoMineExplosionRadius: 120,  // Blast radius for splash AOE damage
  potatoMineExplosionKnockback: 14, // Strong knockback impulse on detonation
  potatoMineSpriteSrc: 'Assets/model/Sprites/potato-mine-sprite-sheet.png',

  // Lawnmower Baseline Defense System (PvZ Signature Final Defense)
  enableLawnmower: true,
  lawnmowerDamage: 100,        // Devastating steamroller damage (PvZ 1800 damage equivalent)
  lawnmowerSpeed: 11.5,        // Fast horizontal charging speed across the lawn
  lawnmowerRadius: 18,         // Collision hitbox radius
  lawnmowerTriggerRadius: 38,  // Proximity trigger distance from baseline
  lawnmowerBaselineOffset: 2,  // Keep parked mowers tucked against the arena wall
  lawnmowerColor: '#DC2626',   // Classic cherry red mower
  lawnmowerStunDuration: 45,   // Stun frames applied to enemies hit by mower (≈0.75s at 60fps)
  lawnmowerSpriteSrc: 'Assets/model/Sprites/lawnmower-sprite-sheet.png',

  // Shared plant deployment and audio tuning
  plantingDuration: 20,
  plantSpawnOffset: 32,
  sunDropSpawnOffset: 45,
  sunDropFallbackOffset: 220,

  sounds: {
    planting: 'Assets/Sound Effects/SkillEffects/crazydave-Planting.ogg',
    plantingVoiceLines: [
      'Assets/Sound Effects/Boss Voiceline SFX/crazydave-noise1 (1).ogg',
      'Assets/Sound Effects/Boss Voiceline SFX/crazydave-noise1 (2).ogg',
      'Assets/Sound Effects/Boss Voiceline SFX/crazydave-noise1 (3).ogg'
    ],
    sunPickup: 'Assets/Sound Effects/Sprites SFX/crazydave-sun-pickup.mp3',
    peashooterAttack: 'Assets/Sound Effects/Attacks/crazydave-peashooter-shot.mp3',
    snowPeaAttack: 'Assets/Sound Effects/Attacks/crazydave-snow_pea_sparkles.ogg',
    snowPeaFreeze: 'Assets/Sound Effects/SkillEffects/crazydave-snowpea-freeze.mp3',
    plantHit: 'Assets/Sound Effects/SkillEffects/splat3.ogg',
    wallnutHit: 'Assets/Sound Effects/Skills/shieldblock.mp3',
    wallnutCrumble: 'Assets/Sound Effects/Skills/shieldblock2.mp3',
    lawnmowerEngine: 'Assets/Sound Effects/Sprites SFX/Lawn Mower.mp3',
    lawnmowerHit: 'Assets/Sound Effects/Skills/spinslash.mp3',
    potatoMineArm: 'Assets/Sound Effects/SkillEffects/crazydave-Planting.ogg',
    potatoMineExplode: 'Assets/Sound Effects/Skills/fugaexplode.mp3'
  },
  soundVolumes: {
    planting: 0.85,
    plantingVoiceLines: 0.85,
    sunPickup: 0.85,
    peashooterAttack: 0.80,
    snowPeaAttack: 0.85,
    snowPeaFreeze: 0.85,
    plantHit: 0.85,
    wallnutHit: 0.85,
    wallnutCrumble: 0.90,
    lawnmowerEngine: 0.85,
    lawnmowerHit: 0.90,
    potatoMineArm: 0.75,
    potatoMineExplode: 0.95
  },

  // Sprite Asset Sources
  sunSpriteSrc: 'Assets/model/Sprites/Sun-economy-sprite.png',
  wallnutSpriteSrc: 'Assets/model/Sprites/Wallnut-sprite-sheet.png',
  peashooterIdleSpriteSrc: 'Assets/model/Sprites/Peashooter-sprite-sheet.png',
  peashooterShootSpriteSrc: 'Assets/model/Sprites/peashooter-about2shoot-sprite-sheet.png',
  peashooterProjSpriteSrc: 'Assets/model/Sprites/Peashooter-projectile.png',
  snowPeaIdleSpriteSrc: 'Assets/model/Sprites/Snowpea-sprite-sheet.png',
  snowPeaShootSpriteSrc: 'Assets/model/Sprites/snowpea-about2shoot-sprite-sheet.png',
  snowPeaProjSpriteSrc: 'Assets/model/Sprites/snowpea-projectile.png',
  torchwoodSpriteSrc: 'Assets/model/Sprites/torchwood-sprite-sheet.png',
  firePeaProjSpriteSrc: 'Assets/model/Sprites/Six-Frame Pixel Fireball Animation.png',
  lawnmowerSpriteSrc: 'Assets/model/Sprites/lawnmower-sprite-sheet.png',
  iceFreezeSpriteSrc: 'Assets/model/Sprites/ice-freeze-sprite.png',
  potatoMineSpriteSrc: 'Assets/model/Sprites/potato-mine-sprite-sheet.png',

  // Arena Grass Tiles (PvZ Front Lawn)
  grassTilesSpriteSrc: 'Assets/model/Tiles/Grass-tiles-sprite-sheet.png',
  grassTileSize: 76.6
};
