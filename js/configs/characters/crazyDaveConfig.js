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
  desc: 'Crazy Dave has no direct basic attack! He navigates the arena collecting falling Sun drops to deploy rapid-fire Peashooters and chilling Snow Peas that fight on his behalf.',

  // Sun Economy System
  initialSun: 50,
  maxSun: 500,
  sunRadius: 30,             // Sized large and prominent to fill 76.6px grass tiles
  sunPickupValue: 25,
  sunDropInterval: 110,      // Natural ambient sun falls every 110 frames (~1.8s at 60fps)
  sunFallSpeed: 2.2,         // Smooth vertical descent speed
  sunAttractionRadius: 95,   // Magnetic pull radius for Dave towards suns
  sunAttractionSpeed: 7.0,   // Speed at which sun moves toward Dave
  sunDecayFrames: 720,       // 12 seconds before uncollected sun despawns

  // Skill 1: Plant Peashooter (Regular Damage)
  enablePeashooter: true,
  peashooterCost: 100,       // Costs 100 Sun
  peashooterHp: 180,
  peashooterFireRate: 22,    // Fires a pea every 22 frames (~0.36s)
  peashooterDamage: 10,      // Regular damage per pea
  peashooterSpeed: 9.5,      // Pea projectile speed
  peashooterRange: 460,      // Firing range
  plantLaneTolerance: 85,    // Straight horizontal lane detection width
  peashooterCooldown: 120,   // 2.0s skill cooldown
  maxPeashooters: 3,         // Maximum simultaneous active Peashooters

  // Skill 2: Plant Snow Pea (Ice Damage + Enemy Slow)
  enableSnowPea: true,
  snowPeaCost: 175,          // Costs 175 Sun
  snowPeaHp: 200,
  snowPeaFireRate: 24,       // Fires a frozen pea every 24 frames (~0.40s)
  snowPeaDamage: 12,         // Ice damage per frozen pea
  snowPeaSpeed: 9.5,         // Snow pea projectile speed
  snowPeaRange: 460,         // Firing range
  snowPeaSlowDuration: 90,   // 1.5s slow debuff on hit
  snowPeaSlowMultiplier: 0.45, // Slows enemy move speed down to 45%
  snowPeaCooldown: 180,      // 3.0s skill cooldown
  maxSnowPeas: 3,            // Maximum simultaneous active Snow Peas

  // Sprite Asset Sources
  sunSpriteSrc: 'Assets/model/Sprites/Sun-economy-sprite.png',
  peashooterIdleSpriteSrc: 'Assets/model/Sprites/Peashooter-sprite-sheet.png',
  peashooterShootSpriteSrc: 'Assets/model/Sprites/peashooter-about2shoot-sprite-sheet.png',
  peashooterProjSpriteSrc: 'Assets/model/Sprites/Peashooter-projectile.png',
  snowPeaIdleSpriteSrc: 'Assets/model/Sprites/Snowpea-sprite-sheet.png',
  snowPeaShootSpriteSrc: 'Assets/model/Sprites/snowpea-about2shoot-sprite-sheet.png',
  snowPeaProjSpriteSrc: 'Assets/model/Sprites/snowpea-projectile.png',

  // Arena Grass Tiles (PvZ Front Lawn)
  grassTilesSpriteSrc: 'Assets/model/Sprites/Grass-tiles-sprite-sheet.png',
  grassTileSize: 76.6
};
