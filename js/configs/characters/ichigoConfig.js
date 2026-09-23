// ─────────────────────────────────────────────
// Ichigo Kurosaki — Substitute Soul Reaper Config (Unified)
// ─────────────────────────────────────────────
export const ichigoConfig = {
  bossTitle: 'Substitute Soul Reaper',
  title: 'Substitute Soul Reaper',

  // ── Base Attributes & Identity ──
  hp: 240,
  speed: 7.0,
  moveSpeed: 6.5,
  r: 25,
  radius: 25,
  color: '#FF5500', // Iconic orange hair / aura accents
  themeColor: '#FF5500',
  damageNumberColor: '#FF5500',
  hudNameColor: '#FF5500',
  hudSkillBarColor: '#FF5500',
  startX: 300,
  startY: 250,
  startVx: 1.2,
  startVy: 1.0,
  damage: 4,
  cooldown: 30,
  projectileSpeedMultiplier: 1.0,
  ability: 'Hollow Mask',
  desc: 'Wields Zangetsu with fast frontal-arc sword slashes. Awakes Hollow Mask under 60% HP for stats boost. Ultimate unleashes Bankai: Tensa Zangetsu.',

  // ── Basic Attack: Zangetsu Melee Cleave ──
  enableMeleeCleave: true,       // Master toggle for Basic Attack: Zangetsu Melee Cleave
  swordDamage: 8,               // Base damage per melee slash
  swordCooldown: 30,             // Cooldown in frames between slashes (~0.5s at 60fps)
  swordRange: 50,                // Melee reach distance
  swordArc: 140,                 // Frontal cleave arc cone in degrees
  swordFreezeDuration: 8,        // Target hit-pause freeze frames on melee strike
  swordSwingDuration: 26,        // Melee slash swing animation duration in frames
  knockback: 0,                  // Base melee knockback force
  swordScreenShake: 3.0,         // Screen shake intensity on basic melee hit
  swordShockwaveSize: 35,        // Shockwave burst size on sword hit

  // ── Skill Combo: Shunpo Blitz (Flash Step Flurry -> Disengage Back-Step -> Getsuga) ──
  enableShunpo: true,            // Toggle Flash Step teleport skill
  enableFlurry: true,            // Toggle multi-strike flurry slashes (if false, executes single strike -> backstep -> Getsuga)
  initialShunpoCooldown: 100,    // Initial cooldown in frames after round start / countdown ends before first Shunpo Blitz (~3.0s at 60fps)
  shunpoCooldown: 200,           // Cooldown in frames between combo activations (~7.5s in Shikai)
  shunpoStrikes: 4,              // Number of intermediate flurry slashes in Shikai
  shunpoRange: 220,              // Distance dashed on initial flank step
  shunpoDashDuration: 4,         // Flash step dash duration in frames
  shunpoTargetOffset: 34,        // Distance offset from target center on arrival
  shunpoStrikeDamage: 8,         // Base damage for intermediate flurry slashes
  shunpoStrike1Damage: 8,        // Backward-compatibility alias
  shunpoStrikeDuration: 16,      // Intermediate swing animation duration in frames
  shunpoFinisherMultiplier: 1.1, // Damage multiplier for final flurry strike
  shunpoStrike2Multiplier: 1.1,  // Backward-compatibility alias
  shunpoFinisherDuration: 20,    // Finisher swing animation duration in frames
  shunpoFinisherKnockback: 7,    // Finisher knockback force
  shunpoStrike2Knockback: 7,     // Backward-compatibility alias
  shunpoScreenShake: 4.0,        // Screen shake intensity on flurry finisher hit
  shunpoDisengageDistance: 290,  // Distance stepped back away from target before firing Getsuga (px)
  shunpoDisengageDashFrames: 3,  // Dash duration for backward disengage
  shunpoDisengageDelayFrames: 7, // Delay window after finisher before back-step initiates
  comboTriggerMinDist: 0,        // Minimum trigger distance for AI
  comboTriggerMaxDist: 400,      // Maximum trigger distance for AI

  // ── Special Attack: Getsuga Tensho Wave ──
  enableGetsuga: true,           // Master toggle for Getsuga Tensho Wave
  getsugaDamage: 4,              // Base damage / tick damage for Getsuga wave
  getsugaTickDamage: 3,          // Multi-tick shredding damage per hit in Shikai
  getsugaSpeed: 11,              // Base projectile travel speed (px/frame)
  getsugaTravelSpeed: 11,        // Alias
  getsugaRadius: 100,            // Base crescent projectile radius
  getsugaDuration: 90,           // Sustained duration frames pinned against arena walls (~1.5s)
  getsugaKnockback: 6,           // Knockback force applied
  getsugaHitStun: 18,            // Hit stun frames applied on hit
  getsugaSlowDuration: 90,       // Duration of movement slow debuff on hit
  getsugaSlowMultiplier: 0.40,   // Movement speed multiplier during slow (60% slow)
  getsugaHitCooldown: 4,         // Re-hit tick interval in frames (~15 ticks/sec)
  getsugaChargeFrames: 64,       // Channeling duration frames matching voiceline (~1.07s)
  channelTurnRate: 0.08,         // Aim tracking turn rate while channeling
  getsugaSlashDuration: 24,      // Slash animation duration on release
  getsugaRecoveryFrames: 24,     // Recovery frames held in follow-through pose before moving
  getsugaRecoil: 3.5,            // Backward kinetic recoil impulse on release
  getsugaScreenShake: 3.5,       // Screen shake intensity on Getsuga release/hit
  getsugaHitScreenShake: 3.5,    // Alias
  getsugaShockwaveSize: 40,      // Shockwave burst size on Getsuga hit
  getsugaColor: '#00D5FF',       // Shikai Getsuga theme color (Sky-Blue)
  postGetsugaCooldown: 120,      // Minimum delay buffer (frames) after releasing Getsuga before next Flash Step teleport (~2.0s at 60fps)
  bankaiPostGetsugaCooldown: 100,// Post-Getsuga delay buffer during Bankai (~1.67s at 60fps)
  hollowPostGetsugaCooldown: 110,// Post-Getsuga delay buffer during Hollow Mask (~1.83s at 60fps)
  bankaiHollowPostGetsugaCooldown: 120, // Post-Getsuga delay buffer during Bankai + Hollow Mask (~2.0s at 60fps)

  // ── Passive: Hollow Mask Awakening ──
  enableHollowMask: true,        // Master toggle for Hollow Mask Awakening
  hollowMaskThreshold: 0.60,     // Automatically activates when HP <= 60%
  hollowRechargeHpRatio: 0.20,   // Damage required to reactivate Hollow Mask after mask shatters (20% of max HP)
  hollowHpRecovery: 0.50,        // 50% HP recovery upon Hollow Mask transformation
  hollowMaskDuration: 800,       // Mask duration in frames (~13.3s)
  hollowMaskFormationFrames: 200,// Animation frames for mask assembly (~3.3s matching audio)
  hollowBurstFrames: 10,         // Eruption blast frames upon Hollow transformation
  hollowSpeedMultiplier: 0.50,    // 40% movement speed boost
  hollowDamageMultiplier: 0.50,   // 10% damage boost
  hollowDamageReduction: 0.10,   // 10% incoming damage mitigation (Hierro)
  hollowLifesteal: 0.2,         // 10% vampiric lifesteal heal on damage dealt
  hollowComboCooldownMultiplier: 0.60, // 40% combo cooldown reduction during Hollow Mask
  hollowGetsugaDamage: 3,        // Upgraded Black Getsuga damage
  hollowGetsugaTickDamage: 3,    // Upgraded multi-tick damage per hit in Hollow form
  hollowGetsugaSpeed: 15,        // Hollow Mask Getsuga travel speed
  hollowGetsugaRadius: 100,      // Hollow Mask Getsuga radius
  hollowGetsugaDuration: 85,     // Sustained wall duration in Hollow form
  hollowGetsugaKnockback: 8,     // Knockback force in Hollow form
  hollowGetsugaSlowDuration: 100,// Slow duration in Hollow form
  hollowGetsugaSlowMultiplier: 0.35, // Slow multiplier in Hollow form (65% slow)
  hollowGetsugaScreenShake: 5.0, // Screen shake intensity during Hollow form
  hollowGetsugaColor: '#FFFFFF', // Hollow Mask Getsuga theme color (Monochrome white/black)

  // ── Passive: Zanjutsu Blade Parry & Defense ──
  enableParry: true,             // Master toggle for Zanjutsu Blade Parry
  parryChance: 0.15,             // Base parry chance in Shikai (15%)
  bankaiParryChance: 0.25,       // Parry chance during Bankai (25%)
  hollowParryChance: 0.30,       // Parry chance during Hollow Mask (30%)
  bankaiHollowParryChance: 0.35, // Parry chance during Bankai + Hollow (35%)
  parryGuardDuration: 45,        // Frames held in parry posture (~0.75s)
  parryDeflectionPush: 7.0,      // Physical deflection push impulse applied to attacker

  // ── Ultimate: Bankai Awakening (Tensa Zangetsu) ──
  enableBankai: true,            // Master toggle for Ultimate: Bankai Awakening
  ultimateThreshold: 0.80,       // Automatically activates when HP <= 90%
  bankaiCooldown: 600,           // Cooldown in frames between Bankai activations after expiration (~10.0s at 60fps)
  bankaiRechargeHpRatio: 0.20,   // Damage required to reactivate Bankai after it expires (20% of max HP)
  bankaiDuration: 500,           // Bankai form duration in frames (~13.3s)
  bankaiChargeFrames: 66,        // Channeling duration frames for transformation (~1.10s)
  bankaiBurstFrames: 36,         // Shatter burst duration frames
  bankaiRibbonDuration: 300,     // Lifespan frames of flowing 3D ribbon
  bankaiScreenShake: 7.0,        // Screen shake intensity upon Bankai release
  bankaiSpeedMultiplier: 1.1,    // 50% movement speed boost during Bankai
  bankaiDamageMultiplier: 1.1,   // 20% melee damage boost during Bankai
  bankaiComboCooldownMultiplier: 0.65, // 35% combo cooldown reduction during Bankai
  bankaiShunpoStrikes: 8,        // Flurry strikes increased to 6 in Bankai
  bankaiShunpoStrike1Duration: 14, // Bankai intermediate flurry strike duration
  bankaiShunpoStrike2Duration: 18, // Bankai finisher strike duration
  bankaiShunpoDashDuration: 3,   // Supersonic flash step duration in Bankai
  bankaiComboDisengageDistance: 350, // Extended disengage back-step distance in Bankai
  bankaiGetsugaDamage: 6,        // Kuroi Getsuga damage during Bankai
  bankaiGetsugaTickDamage: 4,    // Multi-tick damage per hit in Bankai
  bankaiHollowGetsugaTickDamage: 6, // Multi-tick damage during Bankai + Hollow Mask (6 dmg per tick)
  bankaiGetsugaSpeed: 10,        // Bankai Getsuga travel speed
  bankaiGetsugaRadius: 110,      // Bankai Getsuga projectile radius
  bankaiGetsugaDuration: 75,     // Bankai Getsuga wall duration
  bankaiGetsugaKnockback: 8,     // Bankai Getsuga knockback force
  bankaiGetsugaSlowDuration: 100,// Bankai Getsuga slow duration
  bankaiGetsugaSlowMultiplier: 0.35, // Bankai slow speed multiplier (65% slow)
  bankaiGetsugaScreenShake: 4.5, // Bankai Getsuga screen shake intensity
  bankaiGetsugaColor: '#DC143C', // Bankai Getsuga theme color (Black-Crimson Red)

  // ── Bankai Frontal Reiatsu Wind Blast (Release Impact) ──
  bankaiWindDamage: 10,          // Frontal supersonic wind blast damage on Bankai release
  bankaiWindReach: 240,          // Range of the frontal wind blast cone
  bankaiWindArc: 140,            // Angle cone of frontal wind blast in degrees
  bankaiWindKnockback: 14,       // Knockback force blowing enemies back
  bankaiWindHitStun: 24,         // Hit stun duration from wind blast
  bankaiWindFreezeDuration: 12,  // Hit pause stasis frames from wind blast

  // ── Grand Finisher: Final Massive Kuroi Getsuga ──
  enableFinalGetsuga: true,      // Master toggle for Grand Finisher: Final Massive Kuroi Getsuga
  bankaiFinalGetsugaTriggerTimer: 108,  // Bankai duration threshold frames when Grand Finisher triggers (80 frames charge + 28 frames slash wave release -> seamlessly awakens Hollow Mask)
  bankaiFinalGetsugaChargeFrames: 80,  // Gathering charge frames matching voiceline (~1.33s)
  bankaiFinalGetsugaRecoveryFrames: 24, // Post-release slash follow-through frames
  bankaiFinalGetsugaDamage: 20,         // Final Getsuga damage
  bankaiFinalGetsugaTickDamage: 10,      // Continuous multi-hit tick damage
  bankaiFinalGetsugaSpeed: 7,           // Wave travel speed
  bankaiFinalGetsugaRadius: 100,        // Huge crescent radius
  bankaiFinalGetsugaDuration: 150,      // Wall pin duration
  bankaiFinalGetsugaKnockback: 30,      // Massive knockback blowing targets across arena
  bankaiFinalGetsugaHitStun: 28,        // Heavy hit stun
  bankaiFinalGetsugaSlowDuration: 140,  // Heavy slow duration
  bankaiFinalGetsugaSlowMultiplier: 0.20,// 80% movement speed reduction
  bankaiFinalGetsugaScreenShake: 8.5,   // Intense screen shake on release & hit
  bankaiFinalGetsugaColor: '#DC143C',   // Final Kuroi Getsuga theme color

  // ── Audio Configuration ──
  sounds: {
    swordSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    fleshHit: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    parry: 'Assets/Sound Effects/Skills/shieldblock2.mp3',
    shunpoDash: 'Assets/Sound Effects/Skills/dash1.mp3',
    shunpoStrikeHit: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    shunpoFinisherSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    shunpoFinisherHit: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    getsugaCharge: 'Assets/Sound Effects/Skills/redcharging.mp3',
    comboGetsugaVoice: [
      'Assets/Sound Effects/Skills/Ichigo-getsugatensho-flashstep-voiceline.mp3',
      'Assets/Sound Effects/Skills/ichigo-getsugatensho-flashstep-voiceline2.mp3'
    ],
    hollowGetsugaVoice: [
      'Assets/Sound Effects/Skills/Ichigo-getsugatensho-hollow-voiceline.mp3',
      'Assets/Sound Effects/Skills/Ichigo-getsugatensho-hollow-voiceline2.mp3'
    ],
    hollowFlurryNoise: 'Assets/Sound Effects/Attacks/ichigo-attack-hollow-noise.mp3',
    getsugaReleaseSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    getsugaReleaseFlare: 'Assets/Sound Effects/SkillEffects/flare.mp3',
    getsugaHit: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    hollowAwakenVoice: 'Assets/Sound Effects/Skills/ichigo-hollowtransformation-voiceline.mp3',
    hollowAwakenFlare: 'Assets/Sound Effects/SkillEffects/flare.mp3',
    bankaiCharge: 'Assets/Sound Effects/Skills/Ichigo-bankai-charging-voiceline.mp3',
    bankaiReleaseSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    bankaiReleaseFlare: 'Assets/Sound Effects/SkillEffects/flare.mp3',
    bankaiEnded: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    bankaiGetsugaVoice: 'Assets/Sound Effects/Skills/ichigo-getsugatensho-bankai.mp3',
    finalGetsugaCharge: 'Assets/Sound Effects/Skills/ichigo-getsugatensho-bankai.mp3',
    finalGetsugaVoice: 'Assets/Sound Effects/Skills/ichigo-getsugatensho-bankai.mp3',
    finalHollowGetsugaVoice: 'Assets/Sound Effects/Skills/Ichigo-getsugatensho-hollow-voiceline.mp3'
  },
  soundVolumes: {
    swordSwing: 0.50,
    fleshHit: 0.50,
    parry: 0.85,
    shunpoDash: 0.20,
    shunpoStrikeHit: 0.75,
    shunpoFinisherSwing: 0.95,
    shunpoFinisherHit: 0.90,
    getsugaCharge: 0.85,
    comboGetsugaVoice: 2.8,
    hollowGetsugaVoice: 3.0,
    hollowFlurryNoise: 2.8,
    getsugaReleaseSwing: 0.95,
    getsugaReleaseFlare: 0.85,
    getsugaHit: 0.75,
    hollowAwakenVoice: 3.0,
    hollowAwakenFlare: 0.85,
    bankaiCharge: 2.8,
    bankaiReleaseSwing: 0.95,
    bankaiReleaseFlare: 0.90,
    bankaiEnded: 0.80,
    bankaiGetsugaVoice: 3.0,
    finalGetsugaCharge: 3.0,
    finalGetsugaVoice: 3.0,
    finalHollowGetsugaVoice: 3.0
  },
  soundChances: {
    comboGetsugaVoice: 0.50, // 50% chance to play Flash Step Getsuga voiceline
    hollowGetsugaVoice: 0.50, // 50% chance to play Hollow Getsuga voiceline
    hollowFlurryNoise: 0.30,  // 30% chance for Hollow vocal noise during flurry
    bankaiGetsugaVoice: 0.50  // 50% chance for Bankai Getsuga voiceline
  }
};
