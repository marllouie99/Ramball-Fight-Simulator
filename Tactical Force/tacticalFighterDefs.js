// ─────────────────────────────────────────────
// TACTICAL FORCE — STARTER FIGHTER DEFINITIONS
// Specific Firearm Weapon Names:
// 1. M4A1 (Rifle)
// 2. SPAS-12 (Shotgun)
// 3. Desert Eagle (Pistol)
// 4. AWP (Sniper)
// ─────────────────────────────────────────────

import { m4a1Config, spas12Config, desertEagleConfig, awpConfig, barrettConfig, tacticalMainConfig } from './configs/index.js';

export const TACTICAL_FIGHTER_DEFS = [
  {
    id: 101,
    name: 'M4A1',
    category: 'Assault',
    color: m4a1Config.color,
    startX: 160, startY: 240,
    startVx: 1.3, startVy: 1.0,
    radius: m4a1Config.r,
    aimbot: false,
    type: 'rifle',
    hp: m4a1Config.hp,
    damage: m4a1Config.damage,
    cooldown: m4a1Config.fireCooldown, // 3-round burst cadence (66 dmg per burst, 24 frames cooldown)
    moveSpeed: m4a1Config.speed,
    projectileSpeedMultiplier: m4a1Config.projectileSpeedMultiplier,
    ability: '5.56mm 3-Round Burst',
    desc: 'Elite tactical assault carbine. Fires precise high-velocity 3-round 5.56mm NATO bursts with balanced recoil and high stopping power.',
  },
  {
    id: 102,
    name: 'SPAS-12',
    category: 'Breacher',
    color: spas12Config.color,
    startX: 380, startY: 240,
    startVx: -1.2, startVy: 1.1,
    radius: spas12Config.r,
    aimbot: false,
    type: 'shotgun',
    hp: spas12Config.hp,
    damage: spas12Config.damagePerPellet,
    cooldown: spas12Config.fireCooldown, // Deliberate pump-action cadence (~1.33 shots/sec)
    moveSpeed: spas12Config.speed,
    projectileSpeedMultiplier: spas12Config.projectileSpeedMultiplier,
    ability: '12-Gauge Buckshot Blast',
    desc: 'Heavy 12-gauge tactical pump shotgun. Discharges lethal 6-pellet buckshot spreads with authentic pump racking rhythm.',
  },
  {
    id: 103,
    name: 'Desert Eagle',
    category: 'Sidearm',
    color: desertEagleConfig.color,
    startX: 200, startY: 300,
    startVx: 1.5, startVy: -1.2,
    radius: desertEagleConfig.r,
    aimbot: false,
    type: 'pistol',
    hp: desertEagleConfig.hp,
    damage: desertEagleConfig.damage,
    cooldown: desertEagleConfig.fireCooldown, // Heavy .50 AE semi-auto hand cannon cadence (~2.5 shots/sec)
    moveSpeed: desertEagleConfig.speed,
    projectileSpeedMultiplier: desertEagleConfig.projectileSpeedMultiplier,
    ability: '.50 AE Magnum Tap',
    desc: 'High-caliber magnum semi-automatic pistol. Delivers massive single-shot stopping power, authentic 7-round magazine, and critical headshots.',
  },
  {
    id: 104,
    name: 'AWP',
    category: 'Marksman',
    color: awpConfig.color,
    startX: 340, startY: 180,
    startVx: -1.1, startVy: -1.0,
    radius: awpConfig.r,
    aimbot: false,
    type: 'sniper',
    hp: awpConfig.hp,
    damage: awpConfig.damage,
    cooldown: awpConfig.fireCooldown, // Heavy manual bolt-action chambering cadence (~1.4s per shot)
    moveSpeed: awpConfig.speed,
    projectileSpeedMultiplier: awpConfig.projectileSpeedMultiplier,
    ability: '.338 Lapua AP Shot',
    desc: 'Iconic heavy bolt-action sniper rifle. Delivers devastating 105-damage armor-piercing match rounds with high-stakes bolt pacing.',
  },
  {
    id: 105,
    name: 'Barrett M82',
    category: 'Anti-Materiel',
    color: barrettConfig.color,
    startX: 240, startY: 160,
    startVx: 1.1, startVy: 1.2,
    radius: barrettConfig.r,
    aimbot: false,
    type: 'barrett',
    hp: barrettConfig.hp,
    damage: barrettConfig.damage,
    cooldown: barrettConfig.fireCooldown, // .50 BMG semi-auto anti-materiel cadence (~1.0s per shot)
    moveSpeed: barrettConfig.speed,
    projectileSpeedMultiplier: barrettConfig.projectileSpeedMultiplier,
    ability: '.50 BMG Anti-Materiel Round',
    desc: 'High-caliber semi-automatic anti-materiel sniper rifle. Fires devastating 115-damage .50 BMG kinetic rounds with 10-round steel box magazine.',
  }
];
