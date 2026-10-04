// ─────────────────────────────────────────────
// Megumin (The Crimson Demon Archmage) Character Config
// KonoSuba: God's Blessing on this Wonderful World!
// Single-Spell Nuclear Artillery & Tactical Nuker
// ─────────────────────────────────────────────

export const meguminConfig = {
  name: 'Megumin',
  displayName: 'Megumin',
  bossTitle: 'Crimson Archmage',
  title: 'Crimson Demon',

  // Baseline Attributes
  hp: 280,
  maxHpRatio: 1.0,
  speed: 2.45,
  moveSpeed: 2.45,
  r: 25,
  radius: 25,
  color: '#C81D25',            // Crimson Red
  themeColor: '#C81D25',
  secondaryColor: '#FFD166',   // Arcane Gold
  accentCrimson: '#7B0828',    // Deep Crimson-Plum
  accentGold: '#FFE600',       // Solar Mana Gold
  accentDark: '#14080E',       // Charcoal Mana Ink
  startX: 300,
  startY: 250,
  startVx: 1.0,
  startVy: 0.9,
  damage: 420,
  cooldown: 60,
  projectileSpeedMultiplier: 1.0,
  ability: 'Explosion Magic (爆裂魔法)',
  desc: 'The Crimson Demon Archmage. Specializes in a single apocalyptic offensive spell: EXPLOSION! Recites an extended dramatic chanting incantation with committed aim lock, unleashing cataclysmic true damage before suffering total mana burnout and collapsing into a helpless faceplant.',

  // ──────────────────────────────────────────
  // ABILITY TOGGLES (EXPLOSION IS THE DEFAULT OFFENSIVE ABILITY)
  // ──────────────────────────────────────────

  // Passive 1: The One True Path (Single-Spell Constraint)
  enableOneTruePath: 1,             // Master toggle for Single Offensive Spell Constraint

  // Passive 2: Incantation Resonance (Chant Scaling)
  enableIncantationResonance: 0,    // Master toggle for Chant Power & Radius Scaling
  chantMaxFrames: 240,              // 4.0s full chanting duration
  chantMinFrames: 120,              // 2.0s minimum threshold for partial detonation
  chantAimLock: 1,                  // Commits 360° omnidirectional aim lock upon initiation

  // Passive 3: Total Mana Burnout (The Faceplant)
  enableFaceplantBurnout: 0,        // Master toggle for Post-Explosion Exhaustion Collapse
  faceplantDurationFrames: 360,     // 6.0s helpless prone duration

  // Passive 4: Chuunibyou Dramatic Posturing
  enableChuunibyouPosturing: 0,     // Master toggle for Dramatic Anime Posing Chant Acceleration

  // Basic Action: Staff Twirl Parry & Panic Hop (Non-Damaging Defense)
  enableStaffTwirlParry: 0,         // Master toggle for Staff Spinning Projectile Deflection
  enablePanicHop: 0,                // Master toggle for Evasive Backward Hop
  staffParryDuration: 18,           // 18-frame active spinning deflection window
  staffParryCooldown: 45,           // 0.75s parry cooldown
  panicHopDistance: 60,             // 60px backward reposition distance

  // Skill 1: Chuunibyou Focus & Arcane Barrier
  enableChuunibyouFocus: 0,         // Master toggle for Skill 1: Chanting Acceleration Barrier
  focusCooldown: 300,               // 5.0s cooldown
  focusMaxFrames: 120,              // 2.0s channeled focus duration
  focusShieldHp: 90,                // Barrier absorption health
  focusChantMultiplier: 2.5,        // 2.5× faster chanting while focusing

  // Skill 2: Eyepatch Seal Release: Crimson Gleam
  enableCrimsonGleam: 0,            // Master toggle for Skill 2: Blinding Flash Crowd Control
  gleamCooldown: 420,               // 7.0s cooldown
  gleamRadius: 140,                 // 140px flash cone reach
  gleamBlindDuration: 35,           // 35-frame attack interrupt & blind
  gleamPushDistance: 80,            // 80px melee pushback force

  // Mobility: Archmage Cape Flutter Dash
  enableCapeDash: 0,                // Master toggle for Mobility: Cape Flutter Dash
  capeDashCooldown: 160,            // 2.6s cooldown
  capeDashDistance: 110,            // 110px dash travel distance
  capeDashInvulnFrames: 12,         // 12 i-frames during dash

  // THE SOLE OFFENSIVE SPELL / ULTIMATE: "EXPLOSION!"
  enableExplosion: 1,               // Master toggle for Ultimate: Apocalyptic Explosion
  enableUltimate: 0,                // Master ultimate registration flag
  explosionCooldown: 2400,          // 40.0s cooldown
  explosionWindupFrames: 240,       // 4.0s chant windup
  explosionSingularityPullFrames: 30, // 0.5s pre-blast vortex suction
  explosionSingularityRadius: 200,  // Gravitational pull radius
  explosionPullSpeed: 6,            // Maximum inward vortex speed in pixels per frame
  explosionBlastRadius: 260,        // Core blast radius
  explosionCoreRadius: 120,         // Epicenter radius for the stronger blast
  explosionTrueDamage: 420,         // Direct epicenter True Damage
  explosionOuterDamage: 260,        // Outer shockwave damage
  explosionKnockbackForce: 45,      // Wall-bounce impact force
  explosionDetonationFrames: 24,    // Blast visual duration
  explosionLingeringFireFrames: 180,// 3.0s ground crater burning
  explosionFireRadius: 120,         // Radius of the lingering crater
  explosionFireTickIntervalFrames: 30, // Fire damage interval
  explosionFireTickDamage: 8,       // Crater burn tick damage

  // ──────────────────────────────────────────
  // AUDIO CONFIGURATION & SOUND EFFECT MAPPING
  // ──────────────────────────────────────────
  sounds: {
    staffParry: 'Assets/Sound Effects/Skills/parry.mp3',
    panicHop: 'Assets/Sound Effects/Skills/dash1.mp3',
    eyepatchFlash: 'Assets/Sound Effects/Skills/enhance.mp3',
    arcaneBarrier: 'Assets/Sound Effects/Skills/shieldcharge.mp3',
    chantDrone: 'Assets/Sound Effects/Skills/genos-ultimatecharging.mp3',
    manaVortex: 'Assets/Sound Effects/Skills/gravitypull.mp3',
    explosionBlast: 'Assets/Sound Effects/Skills/fugaexplode.mp3',
    explosionHeavy: 'Assets/Sound Effects/Skills/genos-selfdestruct-explosion.mp3',
    staffDrop: 'Assets/Sound Effects/Skills/johnwick-gundrop.mp3'
  }
};
