// ─────────────────────────────────────────────
// Engineer — Master Builder & Support Specialist Config
// ─────────────────────────────────────────────

export const engineerConfig = {
  // Base Attributes
  hp: 400,
  speed: 5.0,
  moveSpeed: 5.0,
  r: 25,
  radius: 25,
  color: '#FFB800', // Engineer Hardhat Gold / Warm Amber
  themeColor: '#FFB800',
  spinRate: 0.05,
  startX: 280,
  startY: 220,
  startVx: 1.1,
  startVy: 0.9,
  damage: 5,
  cooldown: 4,
  projectileSpeedMultiplier: 1.0,
  ability: 'Sentry & Dispenser',
  desc: 'Constructs an automated Sentry Turret to assault foes and a Dispenser to tether healing and boost reload speed.',

  // Primary Ranged Attack: Shotgun
  shotgunCooldown: 80,
  shotgunPellets: 8,
  shotgunSpread: 0.45,         // Spread angle in radians (~26°)
  shotgunDamage: 5.20,         // Damage per pellet
  shotgunSpeed: 30,            // Initial projectile velocity
  shotgunRange: 400,           // Max distance to trigger shotgun
  shotgunRecoilForce: 3.5,     // Pushback impulse on firing
  shotgunRecoilDuration: 28,   // Multi-phase weapon recoil & pump racking animation frames
  shotgunMuzzleOffset: 62,     // Distance from center to shotgun muzzle

  // Melee Weapon & Repair Tool: Wrench
  wrenchCooldown: 30,
  wrenchDamage: 15,
  wrenchRange: 85,             // Melee engagement distance
  wrenchSwipeDuration: 16,     // Animation duration in frames
  wrenchArcDegrees: 135,       // Frontal cone attack arc
  wrenchPushForce: 12,         // Knockback push force
  wrenchHitStunDuration: 8,    // Hit-stun frames applied to enemy

  // Skill 1: Sentry Turret (Primary Combat Building)
  skillCooldown: 500,          // Rebuild cooldown after destruction (~8.3s)
  turretRadius: 18,            // Physical collision radius
  turretAimSpeed: 0.08,        // Aim rotation speed in radians per frame
  turretBuildTime: 90,         // Construction duration (~1.5s)
  turretSpawnDistance: -40,    // Spawn offset distance (negative = behind)
  turretHealAmount: 30,        // Wrench repair heal amount
  turretHealCooldown: 60,      // Cooldown between wrench repairs
  turretBulletSpeed: 22,       // Bullet projectile speed
  turretRange: 360,            // Target acquisition radius
  turretReloadTime: 90,        // Frames to reload (~1.5s)
  turretAmmoBarOffsetY: 25,    // Distance above turret to draw reload/ammo UI
  turretReloadBarWidth: 32,    // Reload progress bar width
  turretReloadBarHeight: 5,    // Reload progress bar height
  turretAmmoPipWidth: 4,       // Diameter of ammo pips
  turretAmmoPipSpacing: 6,     // Spacing between ammo pips

  // Level 1 Sentry Stats (Single Barrel Cannon)
  turretLevel1Hp: 200,
  turretLevel1Damage: 2.2,     // Damage per bullet (single barrel)
  turretLevel1FireRate: 8,     // Frames between shots
  turretLevel1Ammo: 15,        // Shots per magazine

  // Level 2 Sentry Stats (Dual Gatling Miniguns)
  turretLevel2Hp: 280,
  turretLevel2Damage: 1.8,     // Damage per bullet (twin volley = 3.6)
  turretLevel2FireRate: 6,     // Faster fire rate
  turretLevel2Ammo: 25,        // Shots per magazine

  // Level 3 Sentry Stats (Dual Heavy Gatlings + Quad Rocket Pod)
  turretLevel3Hp: 380,
  turretLevel3Damage: 2.0,     // Damage per bullet (twin volley = 4.0)
  turretLevel3FireRate: 5,     // Supersonic Gatling fire rate
  turretLevel3Ammo: 35,        // High capacity drum
  turretLevel3RocketDamage: 8.0, // Area of effect damage per micro-rocket
  turretLevel3RocketInterval: 4, // Fires rocket salvo every 4 bullet volleys

  // Skill 2: Dispenser (Secondary Support Building)
  dispenserHp: 300,            // Dispenser max health
  dispenserRadius: 19,         // Physical collision radius
  dispenserBuildTime: 110,     // Construction duration (~1.8s)
  dispenserRange: 260,         // Healing field radius & tether range
  dispenserHealPerTick: 2,     // Health restored per pulse
  dispenserTickInterval: 30,   // Ticks every 0.5s (~4 HP/s)
  dispenserSpeedBuff: 1.10,    // 10% movement speed boost in zone
  dispenserHealAmount: 30,     // Wrench repair heal amount
  dispenserHealCooldown: 60,   // Cooldown between wrench repairs
  dispenserCooldown: 600,      // Rebuild cooldown after destruction (10.0s)
  dispenserSpawnDistance: 45,  // Spawn offset distance

  // Audio configuration, volume & timing delay adjustments (organized like nanamiConfig)
  sounds: {
    shotgunShot: 'Assets/Sound Effects/Attacks/shootgunshot.mp3',
    shotgunCrack: 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3',
    wrenchSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    sentryGunshot: 'Assets/Sound Effects/Skills/engineer-sentrygunshot.mp3',
    sentryDetected: 'Assets/Sound Effects/Skills/engineer-sentrydetected.mp3',
    sentryReloading: 'Assets/Sound Effects/Skills/engineer-sentryreloading.mp3',
    sentryReloaded: 'Assets/Sound Effects/Skills/engineer-sentryreloaded.mp3',
    sentryDestroyed: 'Assets/Sound Effects/Skills/engineer-sentrydestroyed.mp3',
    dispenserHeal: 'Assets/Sound Effects/Skills/engineer-sentryreloading.mp3',
    dispenserDestroyed: 'Assets/Sound Effects/Skills/machinebroken.mp3'
  },
  soundVolumes: {
    shotgunShot: 0.95,
    shotgunCrack: 0.85,
    wrenchSwing: 0.90,
    sentryGunshot: 0.80,
    sentryDetected: 0.95,
    sentryReloading: 0.90,
    sentryReloaded: 0.90,
    sentryDestroyed: 1.0,
    dispenserHeal: 0.85,
    dispenserDestroyed: 1.0
  },
  soundChances: {
    sentryDetected: 1.0
  },
  soundDelays: {
    shotgunShot: 0,
    shotgunCrack: 0,
    wrenchSwing: 0,
    sentryGunshot: 0,
    sentryDetected: 0,
    sentryReloading: 0,
    sentryReloaded: 0,
    sentryDestroyed: 0,
    dispenserHeal: 0,
    dispenserDestroyed: 0
  }
};
