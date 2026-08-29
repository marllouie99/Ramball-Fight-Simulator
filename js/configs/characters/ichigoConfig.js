// ─────────────────────────────────────────────
// Ichigo Kurosaki — Substitute Soul Reaper Config
// ─────────────────────────────────────────────
export const ichigoConfig = {
  // ── Base Attributes ──
  hp: 240,
  speed: 7.0,
  moveSpeed: 7.0,
  r: 25,
  radius: 25,
  color: '#FF5500', // Orange details
  themeColor: '#FF5500',
  startX: 300,
  startY: 250,
  startVx: 1.2,
  startVy: 1.0,
  damage: 16,
  cooldown: 30,
  projectileSpeedMultiplier: 1.0,
  ability: 'Hollow Mask',
  desc: 'Wields Zangetsu with fast frontal-arc sword slashes. Awakes Hollow Mask under 30% HP for stats boost. Ultimate unleashes Bankai: Tensa Zangetsu.',

  // Basic Attack: Zangetsu Cleave
  swordDamage: 16,               // Base damage per melee slash
  swordCooldown: 30,             // Cooldown in frames between slashes (~0.5s)
  swordRange: 70,                // Melee reach (140° frontal arc)
  swordArc: 140,                 // Frontal cleave arc cone angle in degrees (Rule #7)
  swordFreezeDuration: 8,        // Target hit-pause freeze frames on melee strike (Rule #5)
  swordSwingDuration: 22,        // Melee slash swing animation duration in frames
  swordHitScreenShake: 3.0,      // Arena screen shake intensity on basic melee hit
  swordHitShakeDuration: 6,      // Shake duration in frames on basic melee hit
  bankaiSwordHitScreenShake: 4.0,// Arena screen shake intensity on Bankai melee hit
  hollowSwordHitScreenShake: 4.5,// Arena screen shake intensity on Hollow Mask melee hit
  knockback: 6,                  // Knockback on hit
  swordShockwaveSize: 35,        // Shockwave burst size on basic sword hit

  // ── Unified Skill Combo: Shunpo Getsuga Blitz (Flash Step Flurry -> Disengage Back-Step -> Getsuga Tensho) ──
  comboCooldown: 450,            // Base cooldown in frames between combo activations (~7.5s)
  comboDisengageDistance: 290,   // Increased distance flash-stepped backward away from target before firing Getsuga (px)
  comboDisengageDashFrames: 3,   // Flash step duration frames for the backward disengage
  comboDisengageDelayFrames: 7,  // Delay window frames after finisher before initiating back-step in Shikai
  comboTriggerMinDist: 0,        // Minimum trigger distance (0 = point-blank / melee range)
  comboTriggerMaxDist: 400,      // Maximum trigger distance (gap-closes with Flash Step)

  // Phase 1: Flash Step Multi-Strike Flurry
  shunpoStrikes: 4,              // Base flurry strike count in Shikai form
  shunpoRange: 220,              // Distance dashed on initial flank step
  shunpoDashDuration: 4,         // Flash step teleport duration frames
  shunpoTargetOffset: 34,        // Distance offset from target center on teleport arrival
  shunpoStrike1Damage: 20,       // Base damage for intermediate flank slashes
  shunpoStrike1FreezeDuration: 0,  // Hit-pause frames on target during intermediate strikes (0 = allow enemy aiming and reactions)
  shunpoStrike1SlashDuration: 14,// Swing animation duration frames for intermediate strikes
  shunpoStrike1ScreenShake: 2.5, // Arena screen shake intensity on intermediate flurry strike hit
  shunpoStrike1ShakeDuration: 6, // Shake duration in frames on intermediate strike hit
  bankaiShunpoStrike1ScreenShake: 3.5, // Bankai intermediate flurry strike hit shake
  shunpoStrike2Multiplier: 1.35, // Finisher damage multiplier for final flurry strike
  shunpoStrike2StunDuration: 8,  // Stun frames applied on finisher hit
  bankaiShunpoStunDuration: 8,   // Stun frames on Bankai finisher hit
  shunpoStrike2SlashDuration: 16,// Swing animation duration frames for final finisher strike
  shunpoStrike2Knockback: 7,     // Finisher knockback force pushing target back
  shunpoShockwaveSize: 45,       // Shockwave burst size on finisher
  shunpoScreenShake: 4.0,        // Screen shake intensity on finisher hit
  shunpoFinisherShakeDuration: 10, // Finisher shake duration in frames
  bankaiShunpoFinisherScreenShake: 5.5, // Screen shake intensity on Bankai finisher hit
  hollowShunpoFinisherScreenShake: 5.0, // Screen shake intensity on Hollow Mask finisher hit
  shunpoComboDelayFrames: 8,     // Delay window frames between intermediate strikes in Shikai
  shunpoCooldown: 450,           // Fallback alias for comboCooldown
  getsugaCooldown: 450,          // Fallback alias for comboCooldown

  // Phase 2: Getsuga Tensho Wave (Released after Disengage Flash Step)
  getsugaDamage: 32,             // Base damage for Getsuga Tensho wave
  getsugaTravelSpeed: 11,        // ⚡ Base travel speed of Getsuga projectile wave (pixels/frame)
  getsugaSpeed: 11,              // Base projectile speed fallback
  getsugaKnockback: 6,           // Knockback force applied
  getsugaHitStun: 18,            // Hit stun frames applied on hit
  getsugaSlowDuration: 90,       // Duration of movement slow debuff applied on hit (1.5s)
  getsugaSlowMultiplier: 0.40,   // Movement speed multiplier during slow (60% slow)
  getsugaDragFrames: 14,         // Number of frames the enemy is actively dragged with the wave
  getsugaScreenShake: 3.5,       // Screen shake intensity on release
  getsugaHitScreenShake: 3.5,    // Screen shake intensity on projectile hit
  getsugaShockwaveSize: 40,      // Shockwave burst size on Getsuga hit
  getsugaSlideFrames: 8,         // Number of frames for braking skid slide before charge
  getsugaSlideDamping: 0.72,     // Velocity damping multiplier per frame during brake slide
  getsugaChargeFrames: 64,       // Channeling duration frames for Getsuga Tensho wave matching voiceline (~1.07s)
  getsugaSlashDuration: 24,      // Slash swing animation duration frames upon Getsuga release
  getsugaRecoveryFrames: 24,     // Breather/recovery frames held in follow-through pose after releasing Getsuga before moving
  getsugaPierce: true,           // Pierces through enemies and destroys projectiles
  getsugaHitCooldown: 20,        // Internal re-hit cooldown frames per enemy during wave pierce
  getsugaRecoil: 3.5,            // Backward kinetic recoil impulse on release
  getsugaTriggerMinDist: 0,      // Minimum distance from enemy for AI to fire Getsuga
  getsugaTriggerMaxDist: 400,    // Maximum distance from enemy for AI to fire Getsuga
  getsugaRadius: 100,             // Base projectile radius (increased scale)
  getsugaColor: '#00D5FF',       // Shikai Getsuga theme color (Sky-Blue)

  // ── Passive: Hollow Mask Awakening ──
  hollowMaskThreshold: 0.70,     // Automatically activates when HP <= 30%
  hollowMaskDuration: 800,       // Mask duration in frames (10 seconds)
  hollowMaskFormationFrames: 325,// Animation duration frames for hand-to-face clutch and mask assembly (~5.4s, matching exact 5.35s audio duration of voiceline)
  hollowBurstFrames: 36,         // Sky burst eruption duration frames upon Hollow transformation
  hollowSpeedMultiplier: 1.4,    // Speed boost multiplier
  hollowDamageMultiplier: 1.5,   // Damage multiplier boost
  hollowDamageReduction: 0.10,   // 20% incoming damage mitigation (Hierro) during Hollow Mask
  hollowLifesteal: 0.10,         // 15% vampiric lifesteal heal on damage dealt during Hollow Mask
  hollowShunpoStrikesMultiplier: 1.5, // Multiplier to increase Shunpo flurry strikes during Hollow form (e.g. 2 -> 3 in Shikai, 6 -> 9 in Bankai)
  hollowSwordCooldownMultiplier: 0.65, // Multiplier reducing melee sword cooldown (e.g. 30 * 0.65 = ~19 frames for faster rapid slashing)
  hollowComboCooldownMultiplier: 0.50, // 25% cooldown reduction multiplier for Shunpo Getsuga Blitz combo during Hollow Mask (e.g. 450 * 0.75 = ~337 frames)
  hollowGetsugaChargeMultiplier: 0.70, // Reduction multiplier reducing Getsuga Tensho charging frames during Hollow form (50% faster charge)
  hollowGetsugaVoice1ChargeFrames: 80,  // Charging frames dynamically synchronized to when "...TENSHO!" peaks & finishes in Voice 1 (~1.33s)
  hollowGetsugaVoice2ChargeFrames: 34,  // Charging frames dynamically synchronized to when fast "TENSHO!" peaks & finishes in Voice 2 (~0.57s)
  hollowGetsugaDamage: 100,       // Upgraded Black Getsuga damage while mask active
  hollowGetsugaSpeed: 22,        // Hollow Mask projectile travel speed
  hollowGetsugaKnockback: 8,     // Knockback force applied
  hollowGetsugaHitStun: 20,      // Hit stun frames applied on hit
  hollowGetsugaSlowDuration: 100,// Hollow Mask slow debuff duration (frames)
  hollowGetsugaSlowMultiplier: 0.35, // Hollow Mask slow speed multiplier (65% slow)
  hollowGetsugaDragFrames: 18,   // Hollow Mask drag frames
  hollowGetsugaScreenShake: 5.0, // Screen shake intensity on release
  hollowGetsugaHitScreenShake: 4.5, // Screen shake intensity on projectile hit
  hollowGetsugaRadius: 110,       // Hollow Mask Getsuga projectile radius (increased scale)
  hollowGetsugaColor: '#FF1E00', // Hollow Mask Getsuga color

  // ── Passive: Zanjutsu Parry & Defense Mechanics ──
  parryChance: 0.15,             // Base parry chance in Shikai (15%)
  bankaiParryChance: 0.25,       // Parry chance during Bankai (25%)
  hollowParryChance: 0.30,       // Parry chance during Hollow Mask (30%)
  bankaiHollowParryChance: 0.35, // Parry chance during Bankai + Hollow (35%)
  parryGuardDuration: 45,        // Frames held in defensive parry posture (~0.75s)
  parryHitAnimDuration: 18,      // Frame duration for blade deflection impact jitter
  parryDeflectionPush: 7.0,      // Physical deflection push impulse applied to attacker

  // ─────────────────────────────────────────────
  // ── Ultimate: Bankai Awakening (Tensa Zangetsu) ──
  // ─────────────────────────────────────────────

  // 1. Activation & Transformation
  ultimateThreshold: 0.90,       // Automatically activates when HP <= 90%
  bankaiRechargeHpRatio: 0.20,   // Damage required after Bankai expires to reactivate Bankai (20% of max HP)
  ultimateCooldown: 1500,        // Fallback cooldown frames (25s)
  bankaiDuration: 800,           // Duration of Bankai form in frames (~13.3s)
  bankaiSlideFrames: 10,         // Braking skid slide frames when initiating Bankai
  bankaiSlideDamping: 0.70,      // Velocity damping per frame during brake slide
  bankaiChargeFrames: 66,        // Channeling duration frames for epic Bankai transformation (~1.10s, exact audio duration of voiceline)
  bankaiBurstFrames: 36,         // Post-release transformation explosion & shatter burst duration
  shikaiReversionBurstFrames: 42,// Post-Bankai Shikai reversion sonic skyward blast duration (~0.70s)
  shikaiReversionRecoveryFrames: 42, // Post-Bankai Shikai reversion breather / recovery frames before actions
  bankaiRibbonDuration: 300,     // Total lifespan frames of the flowing 3D ribbon after Bankai release
  bankaiAuraShockwaveSize: 95,   // Shockwave burst size on Bankai activation
  bankaiScreenShake: 7,          // Screen shake intensity upon Bankai release

  // 2. Stat Multipliers & Combat Buffs
  bankaiSpeedMultiplier: 1.5,    // Movement speed multiplier during Bankai
  bankaiDamageMultiplier: 1.4,   // Melee damage multiplier boost during Bankai

  // 3. Bankai Combo Modifiers (Tensa Getsuga Blitz)
  bankaiComboCooldownMultiplier: 0.50, // 50% Combo cooldown reduction during Bankai (~3.75s cooldown)
  bankaiShunpoCooldownMultiplier: 0.50,// Fallback alias
  bankaiShunpoStrikes: 6,        // Flurry strike count increased from 2 to 6 during Bankai
  bankaiShunpoDashDuration: 3,   // Supersonic flash step dash duration frames during Bankai
  bankaiShunpoStrike1Duration: 10,// Faster intermediate flurry swing animation in Bankai
  bankaiShunpoStrike2Duration: 14,// Faster finisher swing animation in Bankai
  bankaiShunpoComboDelayFrames: 5,// Faster delay window between strikes in Bankai (supersonic blitz)
  bankaiComboDisengageDistance: 350,   // Extended disengage flash step distance in Bankai form (px)
  bankaiComboDisengageDashFrames: 3,   // Faster disengage flash step frames in Bankai
  bankaiComboDisengageDelayFrames: 5,  // Faster disengage back-step trigger delay in Bankai

  // 4. Kuroi Getsuga Tensho Wave (Bankai Combo Release)
  bankaiGetsugaChargeFrames: 30, // Reduced faster Getsuga charging frames during Bankai form (frames)
  bankaiGetsugaDamage: 100,       // Kuroi Getsuga damage during Bankai
  bankaiHollowGetsugaDamage: 150,// Kuroi Getsuga damage during Bankai + Hollow Mask (100 * 1.5)
  bankaiGetsugaSpeed: 22,        // Kuroi Getsuga travel speed (pixels/frame)
  bankaiGetsugaRadius: 110,       // Bankai Getsuga projectile radius (increased scale)
  bankaiHollowGetsugaRadius: 68, // Bankai + Hollow Mask Getsuga projectile radius (increased scale)
  bankaiGetsugaKnockback: 8,     // Kuroi Getsuga knockback force
  bankaiGetsugaHitStun: 20,      // Kuroi Getsuga hit stun duration
  bankaiGetsugaSlowDuration: 100,// Bankai slow debuff duration (frames)
  bankaiGetsugaSlowMultiplier: 0.35, // Bankai slow speed multiplier (65% slow)
  bankaiGetsugaDragFrames: 16,   // Number of frames enemy is actively dragged with Bankai wave
  bankaiGetsugaShockwaveSize: 42,// Shockwave burst size on Bankai Getsuga hit
  bankaiGetsugaScreenShake: 4.5, // Kuroi Getsuga screen shake intensity on release
  bankaiGetsugaHitScreenShake: 4.5, // Kuroi Getsuga screen shake intensity on projectile hit
  bankaiHollowGetsugaScreenShake: 5.5, // Screen shake on Bankai + Hollow Getsuga release
  bankaiHollowGetsugaHitScreenShake: 5.5, // Screen shake on Bankai + Hollow Getsuga hit
  bankaiGetsugaRecoveryFrames: 20,// Recovery breather frames after releasing Getsuga in Bankai
  bankaiGetsugaColor: '#DC143C', // Bankai Getsuga color (Black-Crimson Red)

  // 5. Frontal Supersonic Reiatsu Wind Blast (Release Impact)
  bankaiWindDamage: 35,          // Frontal supersonic wind blast damage on Bankai release
  bankaiWindReach: 240,          // Range of the frontal wind blast cone
  bankaiWindArc: 140,            // Angle cone of frontal wind blast in degrees
  bankaiWindKnockback: 14,       // Knockback force blowing enemies back
  bankaiWindHitStun: 24,         // Hit stun duration applied to enemies hit by wind blast
  bankaiWindFreezeDuration: 12,  // Hit pause stasis frames on enemies hit by wind blast
  bankaiWindHitScreenShake: 6.0, // Arena screen shake intensity on wind blast hit
  bankaiWindHitShakeDuration: 12,// Arena screen shake duration frames on wind blast hit

  // 6. Grand Finisher: Final Massive Kuroi Getsuga (Unleashed before Bankai ends)
  bankaiFinalGetsugaTriggerTimer: 160,  // Bankai duration threshold frames when Grand Finisher triggers
  bankaiFinalGetsugaChargeFrames: 80,  // Epic gathering charge frames matching exact voiceline duration (~2.46s)
  bankaiFinalGetsugaDamage: 180,        // Total Colossal Kuroi Getsuga damage potential
  bankaiFinalGetsugaTickDamage: 26,     // Continuous shredding damage per tick (multi-hit tick damage)
  bankaiFinalGetsugaHitCooldown: 4,     // Re-hit tick interval frames (ticks every 4 frames / ~15 hits/sec)
  bankaiFinalGetsugaParalyzeDuration: 28, // Paralyze debuff frames applied on hit preventing actions during tick damage
  bankaiFinalGetsugaRadius: 100,         // Huge projectile radius (increased scale)
  bankaiFinalGetsugaDuration: 140,      // Sustained duration frames while staying pinned against the arena wall (~2.3s)
  bankaiFinalGetsugaSpeed: 7,          // Fast supersonic wave speed
  bankaiFinalGetsugaKnockback: 30,      // Massive knockback blowing targets across arena
  bankaiFinalGetsugaHitStun: 28,        // Heavy hit stun
  bankaiFinalGetsugaSlowDuration: 140,  // Heavy slow duration from Final Getsuga
  bankaiFinalGetsugaSlowMultiplier: 0.20,// 80% movement speed reduction
  bankaiFinalGetsugaDragFrames: 24,     // Extensive drag frames across the battlefield
  bankaiFinalGetsugaRecoveryFrames: 48, // Breather / recovery frames held in follow-through pose after unleashing Grand Finisher (~0.8s)
  bankaiFinalGetsugaSlashDuration: 30,  // Extended heavy cleave follow-through swing duration frames
  bankaiFinalGetsugaScreenShake: 8.5,   // Intense screen shake on release
  bankaiFinalGetsugaHitScreenShake: 8.5,// Intense screen shake on projectile hit
  bankaiFinalGetsugaShockwaveSize: 110, // Colossal shockwave on hit
  bankaiFinalGetsugaColor: '#DC143C',   // Final Kuroi Getsuga color theme

  // ─────────────────────────────────────────────
  // ── Audio Configuration, Volumes, Chances & Delays ──
  // ─────────────────────────────────────────────
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
    finalGetsugaCharge: 'Assets/Sound Effects/Skills/ichigo-getsugatensho-voiceline.mp3',
    finalGetsugaVoice: 'Assets/Sound Effects/Skills/ichigo-getsugatensho-voiceline.mp3'
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
    finalGetsugaCharge: 3.0,
    finalGetsugaVoice: 3.0
  },
  soundChances: {
    parry: 1.0,
    swordSwing: 1.0,
    shunpoDash: 1.0,
    comboGetsugaVoice: 0.50, // 50% chance to play Flash Step Getsuga voiceline on Phase 2
    hollowGetsugaVoice: 0.50, // 50% chance to play Hollow Getsuga voiceline on Phase 2
    hollowFlurryNoise: 0.50,  // 50% chance to play Hollow attack noise during Flash Step flurry
    hollowAwakenVoice: 1.0,
    bankaiCharge: 1.0,
    finalGetsugaVoice: 1.0
  },
  soundDelays: {
    swordSwing: 0,
    fleshHit: 0,
    parry: 0,
    shunpoDash: 0,
    shunpoStrikeHit: 0,
    shunpoFinisherSwing: 0,
    shunpoFinisherHit: 0,
    getsugaCharge: 0,
    getsugaReleaseSwing: 0,
    getsugaReleaseFlare: 0,
    getsugaHit: 0,
    hollowAwakenFlare: 0,
    bankaiCharge: 0,
    bankaiReleaseSwing: 0,
    bankaiReleaseFlare: 0,
    bankaiEnded: 0,
    finalGetsugaCharge: 0
  }
};


