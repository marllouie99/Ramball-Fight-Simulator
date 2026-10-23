// ─────────────────────────────────────────────────────────────────────────────
// Ember Character Config
// ─────────────────────────────────────────────────────────────────────────────

export const emberConfig = {
  id: 'orange',
  name: 'Ember',
  displayName: 'Ember',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Fantasy & Magic',
  color: '#ff8c00',
  radius: 25,
  hp: 100,
  damage: 10,
  cooldown: 30,
  moveSpeed: 4.0,
  projectileSpeedMultiplier: 1.0,
  ability: 'Auto-Lock Flamethrower',
  desc: 'Burns enemies with burning effect.',

  // Flamethrower Tuning (CONFIG.orange)
  flameCount: 5,                  // number of flame particles per burst
  flameSpread: 0.30,              // radians; half-angle of the flame cone (matches V-shape)
  flameSpeed: 0.5,                // speed of each flame particle
  flameLife: 35,                  // frames each flame particle lives
  flameDamage: 2.0,               // base damage on first flame contact tick
  flameRadius: 2.0,               // radius of each flame particle
  flameContactIntervalSeconds: 0.1, // seconds between flame contact damage ticks
  flameContactRampDamagePerSecond: 0.5, // extra damage per second of continuous flame contact
  flameContactMaxDamage: 10.0,    // max damage per tick while staying in flame
  flameHitCooldown: 0.90,         // legacy: seconds between flame contact damage ticks
  burstCooldown: 4,               // frames between flame physical projectile bursts
  flameRange: 100,                // pixels; maximum range of the flame cone
  flameWidth: 1.00,               // radians; full width of the flame cone
  burnDuration: 240,              // frames the burn effect lasts (3 seconds at 60 fps)
  burnDamagePerSecond: 2.0,       // damage per second while burning
  burnDamageInterval: 60,         // frames between burn damage ticks (1 second at 60 fps)
  burnSpreadCooldown: 120,        // frames before burn can spread again on same collision
  maxHeat: 100,                   // maximum heat capacity before overheat trigger
  heatPerBurst: 2.0,              // heat accumulated per flame burst
  coolRatePerFrame: 0.40,         // passive heat dissipation per frame when not firing
  overheatCoolRate: 0.55,         // cooling rate per frame during full overheat lockout
  maxFuel: 100,
  fuelPerBurst: 2.0,
};
