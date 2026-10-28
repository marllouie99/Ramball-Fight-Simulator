// ─────────────────────────────────────────────
// Unarmed — The Legendary Weaponless Sphere
// Based on Earclacks Fighting Wiki (https://earclacks-fighting.fandom.com/wiki/Unarmed)
// ─────────────────────────────────────────────

export const unarmedConfig = {
  id: 'unarmed',
  name: 'Unarmed',
  displayName: 'Unarmed',
  grade: 'SSR', // Fighter Grade: 'B' | 'A' | 'S' | 'SS' | 'SSR'
  category: 'Gaming',

  // Baseline Attributes
  hp: 1100,
  maxHp: 1100,
  speed: 5.0,
  moveSpeed: 5.0,
  r: 25,
  radius: 25,
  hideHands: true,                  // Official Earclacks standard: Unarmed is a pure weaponless & handless physics ball
  hideWeapon: true,                 // Suppresses default gun and hand weapon rendering
  color: '#CFCFCF', // Official Earclacks neutral grey sphere (#CFCFCF)
  themeColor: '#71717A', // Muted steel silver
  superColor: '#FFFFFF', // Super Unarmed white ball
  superOutlineColor: '#D4D4D8', // Super Unarmed light grey outline
  hpOverlayMode: 'percentage', // 'percentage' (100 -> 0 per Earclacks standard) | 'actual' (e.g. 1100 -> 0)
  hudNameColor: '#E4E4E7',
  hudSkillBarColor: '#9CA3AF',
  damageNumberColor: '#E4E4E7',
  startX: 300,
  startY: 250,
  startVx: 2.2,
  startVy: 1.8,
  damage: 35,
  cooldown: 40,
  projectileSpeedMultiplier: 1.0,
  ability: 'Permanent Momentum Scaling & Super Unarmed',
  bossTitle: 'The Weaponless Legend',
  title: 'The Weaponless Legend',
  desc: 'The iconic weaponless ball from Earclacks Fighting. Strikes directly with its body so its hits cannot be weapon-parried. Permanently gains maximum speed and damage with every enemy hit, turning into an unstoppable blur culminating in the Super Unarmed form. Gains stacking evasion chance with each hit.',

  assets: {
    hair: 'Assets/model/unarmed/Unarmed-hair.png',
  },

  // Audio references (Official Earclacks wall bump THUD & concussive impacts)
  sounds: {
    slam: 'Assets/Sound Effects/Attacks/heavypunch2.mp3',
    wallBounce: 'Assets/Sound Effects/UnarmedSFX/unarmed_wall_bump.mp3',
    kineticSurge: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
    terminalVelocity: 'Assets/Sound Effects/Attacks/heavypunch3.mp3',
  },
  soundVolumes: {
    slam: 0.95,
    wallBounce: 0.90,
    kineticSurge: 0.85,
    terminalVelocity: 1.0,
  },

  // ── 1. Official Earclacks Gimmick: Permanent Momentum & Speed Scaling ──
  enableMomentumScaling: true,      // Master toggle for Permanent Momentum & Speed Scaling
  enableBallSteering: false,        // Pure natural physical ricochets without artificial steering towards opponent
  maxMomentumStacks: null,          // Uncapped: Momentum stacks scale infinitely with every hit connected (zero cap)
  speedPerHit: 1.00,                // +1.00 permanent max speed per enemy hit
  damagePerHit: 1.0,                // +1.0 permanent damage per momentum level
  maxTerminalVelocity: null,        // Uncapped: Speed scales infinitely without terminal velocity limits (zero cap)
  wallBounceMultiplier: 1.0,        // Wall bounces conserve natural velocity without artificial acceleration
  permanentSpeedScaling: true,      // Gained speed and momentum never decay over time
  baseCollisionDamage: 30,          // Base kinetic damage on opponent collision
  speedDamageScale: 1.0,            // Additional damage per unit of velocity above base
  collisionKnockbackBase: 14,       // Base knockback impulse
  collisionKnockbackScale: 1.5,     // Knockback multiplier per unit of velocity
  hitMomentumLoss: 0,               // Stacks are permanent; taking a hit only causes momentary velocity drop

  // ── 2. Basic Attack: Kinetic Bump (Deals damage & gains speed on primed bumps) ──
  enableKineticBump: true,          // Master toggle for Basic Attack: Kinetic Bump
  basicAttackName: 'Kinetic Bump',
  basicAttackDesc: 'Bumps into the enemy to deal kinetic damage after rebouncing off the wall, permanently scaling speed and damage.',
  collisionCooldownMax: 18,         // Recovery frames between consecutive bumps (~0.30s)

  // ── 3. Hit Slow Dynamics (Momentary movement slow for both fighters on impact) ──
  enableHitSlow: true,              // Master toggle for Momentary Hit Slow Movement on both entities
  hitSlowDuration: 14,              // ~0.23s duration of slowed movement on impact
  hitSlowMultiplier: 0.35,          // 35% movement speed multiplier during the brief hit slow
  enemyHitSlowDuration: 14,         // ~0.23s slow applied to the enemy on impact
  enemyHitSlowMultiplier: 0.35,     // 35% speed multiplier for enemy

  // ── 4. Skill 1: Kinetic Surge (Rapid directional rocket propulsion) ──
  enableKineticSurge: true,         // Master toggle for Skill: Kinetic Surge burst dash
  kineticSurgeCooldownMax: 280,     // ~4.6s cooldown
  kineticSurgeSpeed: 16.0,          // Burst speed
  kineticSurgeDuration: 18,         // Surge active frames (~0.30s)
  kineticSurgeDamage: 65,           // Burst impact damage
  kineticSurgeBonusStacks: 2,       // Immediately adds 2 momentum stacks

  // ── 5. Skill 2 / Ultimate: Super Unarmed (Official Earclacks Super Form) ──
  enableSuperUnarmed: true,         // Master toggle for Ultimate: Super Unarmed Overdrive
  superUnarmedCooldownMax: 600,     // 10.0s cooldown
  superUnarmedDuration: 240,        // 4.0s overdrive duration
  superUnarmedSpeed: 18.0,          // Top speed throughout Super Form
  superUnarmedDamageMult: 1.6,      // 60% bonus collision damage
  superUnarmedShockwaveRadius: 85,  // Shockwave radius on wall/target slam

  // ── 6. Evade Mechanic: Kinetic Evasion (Gains evade chance for each hit) ──
  enableEvade: true,                // Master toggle for Evade mechanic
  baseEvadeChance: 0.05,            // 5% baseline evade chance
  evadeBonusPerHit: 0.03,           // +3% evade chance gained per hit
  maxEvadeChance: 0.65,             // 65% max evade cap
  maxEvadeStacks: 20,               // Max hits counted for evade scaling

  // ── 7. Visual Trail Settings ──
  afterimageMaxAlpha: 0.38,         // Soft translucent afterimage peak opacity
  afterimageSuperMaxAlpha: 0.48,    // Translucent afterimage peak opacity during Super Form

  // ── 8. Rebound Damage Mechanic (Earclacks Standard) ──
  requireWallBounceForDamage: true,   // Damage strictly requires rebouncing off the wall first
  wallBounceHoming: 0.0,              // Pure natural specular reflection (0.0 = 100% natural, no homing)

  // Melee & Punch parameters
  punchReach: 52,
  punchArcAngle: Math.PI * 0.55,    // ~100 deg punch cone
  punchDamage: 40,
  punchKnockback: 12,
  punchCooldown: 32,
};
