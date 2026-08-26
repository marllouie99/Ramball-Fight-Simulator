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
  shunpoStrikes: 2,              // Base flurry strike count in Shikai form
  shunpoRange: 220,              // Distance dashed on initial flank step
  shunpoDashDuration: 4,         // Flash step teleport duration frames
  shunpoTargetOffset: 34,        // Distance offset from target center on teleport arrival
  shunpoStrike1Damage: 20,       // Base damage for intermediate flank slashes
  shunpoStrike1FreezeDuration: 12, // Hit-pause frames on target during intermediate strikes
  shunpoStrike1SlashDuration: 14,// Swing animation duration frames for intermediate strikes
  shunpoStrike2Multiplier: 1.35, // Finisher damage multiplier for final flurry strike
  shunpoStrike2StunDuration: 20, // Stun frames applied on finisher hit
  shunpoStrike2SlashDuration: 16,// Swing animation duration frames for final finisher strike
  shunpoStrike2Knockback: 7,     // Finisher knockback force pushing target back
  shunpoShockwaveSize: 45,       // Shockwave burst size on finisher
  shunpoScreenShake: 3,          // Screen shake intensity on finisher
  shunpoComboDelayFrames: 8,     // Delay window frames between intermediate strikes in Shikai
  shunpoCooldown: 450,           // Fallback alias for comboCooldown
  getsugaCooldown: 450,          // Fallback alias for comboCooldown

  // Phase 2: Getsuga Tensho Wave (Released after Disengage Flash Step)
  getsugaDamage: 32,             // Base damage for Getsuga Tensho wave
  getsugaTravelSpeed: 11,        // ⚡ Base travel speed of Getsuga projectile wave (pixels/frame)
  getsugaSpeed: 11,              // Base projectile speed fallback
  getsugaKnockback: 6,           // Knockback force applied
  getsugaHitStun: 18,            // Hit stun frames applied on hit
  getsugaScreenShake: 3,         // Screen shake intensity on release
  getsugaShockwaveSize: 40,      // Shockwave burst size on Getsuga hit
  getsugaSlideFrames: 8,         // Number of frames for braking skid slide before charge
  getsugaSlideDamping: 0.72,     // Velocity damping multiplier per frame during brake slide
  getsugaChargeFrames: 100,      // Default standalone charging frames fallback
  getsugaSlashDuration: 24,      // Slash swing animation duration frames upon Getsuga release
  getsugaRecoveryFrames: 24,     // Breather/recovery frames held in follow-through pose after releasing Getsuga before moving
  getsugaPierce: true,           // Pierces through enemies and destroys projectiles
  getsugaHitCooldown: 20,        // Internal re-hit cooldown frames per enemy during wave pierce
  getsugaRecoil: 3.5,            // Backward kinetic recoil impulse on release
  getsugaTriggerMinDist: 0,      // Minimum distance from enemy for AI to fire Getsuga
  getsugaTriggerMaxDist: 400,    // Maximum distance from enemy for AI to fire Getsuga
  getsugaRadius: 38,             // Base projectile radius
  getsugaColor: '#00D5FF',       // Shikai Getsuga theme color (Sky-Blue)

  // ── Passive: Hollow Mask Awakening ──
  hollowMaskThreshold: 0.30,     // Automatically activates when HP <= 30%
  hollowMaskDuration: 600,       // Mask duration in frames (10 seconds)
  hollowMaskFormationFrames: 54, // Animation duration frames for hand-to-face clutch and mask piece assembly (~0.9s)
  hollowSpeedMultiplier: 1.4,    // Speed boost multiplier
  hollowDamageMultiplier: 1.5,   // Damage multiplier boost
  hollowGetsugaDamage: 50,       // Upgraded Black Getsuga damage while mask active
  hollowGetsugaSpeed: 22,        // Hollow Mask projectile travel speed
  hollowGetsugaKnockback: 8,     // Knockback force applied
  hollowGetsugaHitStun: 20,      // Hit stun frames applied on hit
  hollowGetsugaScreenShake: 4,   // Screen shake intensity on release
  hollowGetsugaRadius: 42,       // Hollow Mask Getsuga projectile radius
  hollowGetsugaColor: '#FF1E00', // Hollow Mask Getsuga color

  // ─────────────────────────────────────────────
  // ── Ultimate: Bankai Awakening (Tensa Zangetsu) ──
  // ─────────────────────────────────────────────

  // 1. Activation & Transformation
  ultimateThreshold: 0.90,       // Automatically activates when HP <= 90%
  ultimateCooldown: 1500,        // Ultimate cooldown frames (25s)
  bankaiDuration: 800,           // Duration of Bankai form in frames (~13.3s)
  bankaiSlideFrames: 10,         // Braking skid slide frames when initiating Bankai
  bankaiSlideDamping: 0.70,      // Velocity damping per frame during brake slide
  bankaiChargeFrames: 50,        // Channeling duration frames for epic Bankai transformation
  bankaiBurstFrames: 36,         // Post-release transformation explosion & shatter burst duration
  bankaiRibbonDuration: 280,     // 3D Reiatsu floating ribbon animation duration frames
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
  bankaiGetsugaDamage: 48,       // Kuroi Getsuga damage during Bankai
  bankaiGetsugaSpeed: 22,        // Kuroi Getsuga travel speed (pixels/frame)
  bankaiGetsugaRadius: 36,       // Bankai Getsuga projectile radius
  bankaiGetsugaKnockback: 8,     // Kuroi Getsuga knockback force
  bankaiGetsugaHitStun: 20,      // Kuroi Getsuga hit stun duration
  bankaiGetsugaScreenShake: 4,   // Kuroi Getsuga screen shake intensity
  bankaiGetsugaRecoveryFrames: 18,// Recovery breather frames after releasing Getsuga in Bankai
  bankaiGetsugaColor: '#DC143C', // Bankai Getsuga color (Black-Crimson Red)

  // 5. Frontal Supersonic Reiatsu Wind Blast (Release Impact)
  bankaiWindDamage: 35,          // Frontal supersonic wind blast damage on Bankai release
  bankaiWindReach: 240,          // Range of the frontal wind blast cone
  bankaiWindArc: 140,            // Angle cone of frontal wind blast in degrees
  bankaiWindKnockback: 14,       // Knockback force blowing enemies back
  bankaiWindHitStun: 24,         // Hit stun duration applied to enemies hit by wind blast
  bankaiWindFreezeDuration: 12,  // Hit pause stasis frames on enemies hit by wind blast

  // 6. Grand Finisher: Final Massive Kuroi Getsuga (Unleashed before Bankai ends)
  bankaiFinalGetsugaTriggerTimer: 90,   // Bankai duration threshold frames when Grand Finisher triggers
  bankaiFinalGetsugaChargeFrames: 100,   // Epic gathering charge frames before firing the massive wave
  bankaiFinalGetsugaDamage: 125,        // Colossal Kuroi Getsuga damage (Ultimate Finisher)
  bankaiFinalGetsugaRadius: 65,         // Huge projectile radius
  bankaiFinalGetsugaSpeed: 24,          // Fast supersonic wave speed
  bankaiFinalGetsugaKnockback: 30,      // Massive knockback blowing targets across arena
  bankaiFinalGetsugaHitStun: 28,        // Heavy hit stun
  bankaiFinalGetsugaScreenShake: 8,     // Intense screen shake
  bankaiFinalGetsugaShockwaveSize: 110, // Colossal shockwave on hit
};


