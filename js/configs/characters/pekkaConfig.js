// ─────────────────────────────────────────────
// P.E.K.K.A Character Config
// Clash of Clans & Clash Royale / Supercell
// ─────────────────────────────────────────────

export const pekkaConfig = {
  bossTitle: 'Heavy Armored Juggernaut',
  title: 'Heavy Armored Juggernaut',

  // Baseline Attributes
  hp: 480,
  maxHpRatio: 1.0,
  speed: 4.4,
  moveSpeed: 4.4,
  r: 28,
  radius: 28,
  color: '#475569',           // Heavy Slate-Blue Steel Armor
  themeColor: '#475569',
  secondaryColor: '#E879F9',   // Radiant Elixir Magenta / Visor & Horn Glow
  accentMagenta: '#E879F9',    // Hot Elixir Energy
  accentDark: '#151B24',       // Deep Slate Steel Crevices
  accentSteel: '#94A3B8',      // Polished Metal Edge
  damageNumberColor: '#E879F9',
  startX: 300,
  startY: 250,
  startVx: 1.0,
  startVy: 0.9,
  damage: 38,
  cooldown: 48,
  projectileSpeedMultiplier: 1.0,
  ability: 'Kinetic Momentum & Butterfly Overdrive',
  desc: 'Heavy armored samurai robot. Passive: Heavy Titanium Plating deflects 25% of all incoming damage and resists basic knockback pushes. Attacks with wide 140° Colossal Cleaves that build Kinetic Momentum up to an Overclock 3rd smash. Chases fluttering butterflies with unstoppable hyper-armor sprint and detonates an electric EMP overload.',

  // Passive 1: Heavy Titanium Plating (Defense & Poise)
  enableArmorPlating: true,          // Master toggle for passive armor
  armorDamageReduction: 0.25,        // 25% flat damage deflection
  knockbackResistance: 0.90,         // 90% resistance to incoming knockback impulses
  ignoreBasicAttackKnockback: true,  // Stands completely firm against light basic attacks

  // Basic Attack: Colossal Cleave & Kinetic Momentum
  enableCleave: true,                // Master toggle for basic attack cleave
  cleaveReach: 82,                   // Reach in pixels for greatsword arc
  cleaveArcAngle: Math.PI * 0.778,   // ~140° frontal arc
  cleaveWindupDuration: 20,          // Frame duration of pre-attack wind-up telegraph (~0.33s, movement frozen!)
  cleaveSwingDuration: 16,           // Frame duration of active strike release (~0.26s)
  cleaveBreatherDuration: 22,        // Frame duration of post-strike breather recovery (~0.36s, movement frozen!)
  cleaveCooldown: 42,                // Frame cooldown after breather before next attack sequence can begin

  // Escanor-Style Cinematic Hit-Pause (Blade Impact Stasis)
  enableCleaveHitPause: true,        // Master toggle for Escanor-style hit-pause on blade impact
  cleaveHitPauseFrames: 10,          // Hit-pause frame freeze on Stage 1 & 2 hits (~0.17s blade impact stasis)
  cleaveHitPauseOverclockFrames: 20, // Extended cinematic hit-pause on Stage 3 Overclock Crush (~0.33s)
  cleaveHitTremorIntensity: 1.4,     // Micro-tremor amplitude during blade-pause resistance
  unpauseShake: 8.0,                 // Concussive arena shake on unpause knockback release
  unpauseShakeDuration: 14,
  unpauseOverclockShake: 12.0,       // Heavy arena shake on Overclock Crush unpause
  unpauseOverclockShakeDuration: 20,
  
  // Kinetic Momentum 3-Stage Attack Scaling
  comboResetDelay: 210,              // Frames (~3.5s) without attacking before combo resets to stage 1
  hit1Damage: 38,                    // Stage 1 basic cleave
  hit1Knockback: 7,                  // Light displacement
  hit2Damage: 54,                    // Stage 2 energized cleave
  hit2Knockback: 11,                 // Medium displacement
  hit3Damage: 96,                    // Stage 3 OVERCLOCK CRUSH (Catastrophic slam!)
  hit3Knockback: 24,                 // Heavy launch knockback
  hit3StunFrames: 24,                // Stun duration on stage 3 crush
  hit3ScreenShake: 7,                // Heavy screen shake intensity
  hit3ShakeDuration: 16,

  // Skill 1: Butterfly Chase ("BUTTERFLY!")
  enableButterflyChase: true,        // Master toggle for Skill 1
  butterflyCooldown: 360,            // 6.0s skill cooldown (frames at 60fps)
  butterflyDuration: 110,            // Max chase duration in frames (~1.8s)
  butterflySpeedMultiplier: 1.85,    // +85% speed burst while chasing
  butterflyDetectRadius: 360,        // Max distance to spot and chase enemy
  butterflySlamDamage: 75,           // Crushing overhead execution slam on contact
  butterflySlamReach: 85,            // Collision trigger range to execute slam
  butterflySlamStun: 28,             // Stun frames applied on butterfly slam
  butterflyText: 'BUTTERFLY!',       // Floating text banner on cast

  // Skill 2: Electric Overload (Super P.E.K.K.A EMP)
  enableElectricOverload: true,      // Master toggle for Skill 2
  overloadCooldown: 720,             // 12.0s skill cooldown
  overloadChargeFrames: 38,          // Internal Tesla coil charge-up time (~0.63s)
  overloadRadius: 210,               // EMP blast wave radius in pixels
  overloadDamage: 62,                // EMP burst damage
  overloadParalyzeDuration: 45,      // Paralyze stun frames (~0.75s)
  overloadKnockback: 18,             // Outward electric shockwave push
  enableDeathOverload: true,         // Automatically detonate electric overload upon death (Super PEKKA mechanic!)
  deathOverloadDamage: 80,           // Final blast damage when detonated on death

  // Sound Effects
  sounds: {
    swordSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    swordHit: 'Assets/Sound Effects/Attacks/energysword2.mp3',
    armorClank: 'Assets/Sound Effects/Skills/shieldblock2.mp3',
    overclockSlam: 'Assets/Sound Effects/Attacks/Escanor-attack.mp3',
    butterflyLaugh: 'Assets/Sound Effects/Skills/enhance.mp3',
    electricCharge: 'Assets/Sound Effects/SkillEffects/thundercloudcoming.mp3',
    electricBlast: 'Assets/Sound Effects/Skills/stormstrike.mp3',
  }
};
