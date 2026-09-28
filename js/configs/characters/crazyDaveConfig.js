// CRAZY DAVE CONFIGURATION (Plants vs. Zombies)
// Centralized tuning for Crazy Dave stats, Sun economy, and Plant abilities

export const crazyDaveConfig = {
  id: 'crazydave',
  name: 'Crazy Dave',
  displayName: 'CRAZY DAVE',
  category: 'Gaming',
  color: '#84CC16',          // Plant Lime Green
  themeColor: '#84CC16',     // Primary Theme Color
  secondaryColor: '#F59E0B', // Solar Sun Gold
  accentColor: '#22C55E',    // Emerald Leaf

  // Core Combat Stats
  hp: 390,
  maxHp: 390,
  speed: 5.2,
  moveSpeed: 5.2,
  radius: 25,
  r: 25,
  damage: 22,                // Shovel melee swing damage
  cooldown: 28,              // Shovel attack cooldown
  baseRange: 75,
  projectileSpeedMultiplier: 1.0,

  // Ability & Lore Description
  ability: 'Solar Economy & Flora Arsenal ("WABBI WABBO!")',
  desc: 'The eccentric neighbor from Plants vs. Zombies. Gathers Sun drops from the sky, basic hits, and Sunflowers. Spends accumulated Sun to plant rapid-fire Peashooters, sturdy Wall-nuts, explosive Cherry Bombs, and deploys the devastating Lawn Mower Cataclysm!',

  // Sun Economy System
  initialSun: 50,
  maxSun: 500,
  sunPickupValue: 25,
  sunDropInterval: 160,      // Natural ambient sun falls every 160 frames (~2.6s)
  sunAttractionRadius: 85,   // Magnetic pull radius for Dave towards suns
  sunAttractionSpeed: 6.5,   // Speed at which sun moves toward Dave
  shovelHitSunDropChance: 1.0,// 100% chance to pop 1 sun drop on melee hit
  sunDecayFrames: 720,       // 12 seconds before uncollected sun despawns

  // Skill 1: Sunflower
  enableSunflower: true,
  sunflowerCost: 50,
  sunflowerHp: 140,
  sunflowerInterval: 130,    // Produces a Sun drop every ~2.1s
  sunflowerCooldown: 180,    // 3.0s skill cooldown
  maxSunflowers: 2,

  // Skill 2: Combat Flora (Peashooter / Wall-nut)
  enableCombatFlora: true,
  peashooterCost: 100,
  peashooterHp: 180,
  peashooterFireRate: 22,    // Fires a pea every 22 frames (~0.36s)
  peashooterDamage: 9,       // Damage per pea
  peashooterSpeed: 9.0,      // Pea projectile speed
  peashooterRange: 460,      // Firing range
  maxPeashooters: 2,

  enableWallNut: true,
  wallNutCost: 50,
  wallNutHp: 380,            // High durability barricade
  wallNutKnockback: 10,      // Push force against enemies walking into it
  maxWallNuts: 2,
  combatFloraCooldown: 120,  // 2.0s skill cooldown

  // Skill 3: Cherry Bomb
  enableCherryBomb: true,
  cherryBombCost: 150,
  cherryBombHp: 80,
  cherryBombFuse: 45,        // 0.75s fuse before detonation
  cherryBombDamage: 110,     // Heavy explosive AOE damage
  cherryBombRadius: 115,     // Explosion blast radius
  cherryBombKnockback: 16,   // Massive blast impulse
  cherryBombCooldown: 360,   // 6.0s skill cooldown

  // Ultimate: Lawn Mower Cataclysm ("WABBI WABBO!")
  enableLawnMower: true,
  lawnMowerCost: 250,        // Costs 250 Sun (or Full Ultimate)
  lawnMowerDamage: 85,       // High grinding continuous damage
  lawnMowerSpeed: 14.0,      // Supersonic rush across the arena
  lawnMowerRadius: 30,
  lawnMowerCooldown: 800,    // 13.3s cooldown

  // Shovel Melee Frontal Arc (Rule 1.6)
  shovelReach: 68,
  shovelArcDegrees: 130,
  shovelSwingFrames: 16,
  shovelKnockback: 9.5,

  // Arena Grass Tiles (PvZ Front Lawn)
  grassTilesSpriteSrc: 'Assets/model/Sprites/Grass-tiles-sprite-sheet.png',
  grassTileSize: 64
};

