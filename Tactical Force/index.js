// ─────────────────────────────────────────────
// TACTICAL FORCE — HUB INDEX
// Central export for Definitions, Characters, Skins, and Weapons
// ─────────────────────────────────────────────

// Definitions & Maps
export { TACTICAL_FIGHTER_DEFS } from './tacticalFighterDefs.js';
export { STARTER_MAP, drawTacticalMap, handleObstacleCollision } from './maps/index.js';

// Fighter Classes
export { RifleFighter } from './characters/RifleFighter.js';
export { ShotgunFighter } from './characters/ShotgunFighter.js';
export { PistolFighter } from './characters/PistolFighter.js';
export { SniperFighter } from './characters/SniperFighter.js';
export { BarrettFighter } from './characters/BarrettFighter.js';

// Fighter & Game Mode Configs
export {
  m4a1Config,
  rifleConfig,
  spas12Config,
  shotgunConfig,
  desertEagleConfig,
  pistolConfig,
  awpConfig,
  sniperConfig,
  barrettConfig,
  tacticalMainConfig,
  mainTacticalConfig,
  TACTICAL_GAME_MODES,
  TACTICAL_MODE_SETTINGS,
  TACTICAL_SYSTEM_CONFIG,
  isTacticalMode,
  getTacticalModeSettings
} from './configs/index.js';

// Character Skins
export {
  drawM4A1Skin,
  drawRifleSkin,
  drawSpas12Skin,
  drawShotgunSkin,
  drawDesertEagleSkin,
  drawPistolSkin,
  drawAwpSkin,
  drawSniperSkin
} from './skins/index.js';

// Weapon Graphics & Muzzle Flashes
export {
  drawM4A1Weapon,
  drawTacticalRifleWeapon,
  drawSpas12Weapon,
  drawTacticalShotgunWeapon,
  drawDesertEagleWeapon,
  drawTacticalPistolWeapon,
  drawAwpWeapon,
  drawTacticalSniperWeapon,
  drawBarrettWeapon,
  drawTacticalMuzzleFlash,
  drawTacticalBullet
} from './weapons/index.js';

// Dedicated Tactical Projectile System & Physics
export { TacticalProjectileSystem, tacticalProjectileSystem } from './systems/tacticalProjectileSystem.js';
export { updateTacticalPhysicsPass, isTacticalFighter, getTacticalGunReach } from './systems/tacticalPhysics.js';
