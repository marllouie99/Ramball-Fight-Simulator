// ─────────────────────────────────────────────
// Ichigo Kurosaki — Substitute Soul Reaper Config
// ─────────────────────────────────────────────
export const ichigoConfig = {
  // Basic Attack: Zangetsu Cleave
  swordDamage: 16,               // Base damage per melee slash
  swordCooldown: 30,             // Cooldown in frames between slashes (~0.5s)
  swordRange: 70,                // Melee reach (140° frontal arc)
  swordArc: 140,                 // Frontal cleave arc cone angle in degrees (Rule #7)
  swordFreezeDuration: 8,        // Target hit-pause freeze frames on melee strike (Rule #5)
  knockback: 6,                  // Knockback on hit
  swordShockwaveSize: 35,        // Shockwave burst size on basic sword hit

  // Skill 1: Getsuga Tensho (Speed, Channeling, Slide, & Release)
  getsugaCooldown: 1000,          // Cooldown in frames (~6s)
  getsugaDamage: 30,             // Base damage for Getsuga Tensho wave
  getsugaTravelSpeed: 10,        // ⚡ Base travel speed of Getsuga projectile wave (pixels/frame)
  getsugaSpeed: 10,              // Base projectile speed fallback
  getsugaKnockback: 6,           // Knockback force applied
  getsugaHitStun: 16,            // Hit stun frames applied on hit
  getsugaScreenShake: 3,         // Screen shake intensity on release
  getsugaSlideFrames: 8,         // Number of frames for braking skid slide before charge
  getsugaSlideDamping: 0.72,     // Velocity damping multiplier per frame during brake slide
  getsugaChargeFrames: 50,       // Charging frames in 2-handed high chamber stance
  getsugaPierce: true,           // Pierces through enemies and destroys projectiles
  getsugaHitCooldown: 20,        // Internal re-hit cooldown frames per enemy during wave pierce
  getsugaRecoil: 3.5,            // Backward kinetic recoil impulse on release
  getsugaTriggerMinDist: 120,    // Minimum distance from enemy for AI to fire Getsuga
  getsugaTriggerMaxDist: 400,    // Maximum distance from enemy for AI to fire Getsuga
  getsugaRadius: 38,             // Base projectile radius
  getsugaColor: '#00D5FF',       // Shikai Getsuga theme color

  // Skill 2: Flash Step (Shunpo) 2-Strike Flurry
  shunpoCooldown: 500,           // Cooldown in frames (~5s)
  shunpoRange: 220,              // Distance dashed
  shunpoDashDuration: 4,         // Flash step teleport duration frames
  shunpoTargetOffset: 34,        // Distance offset from target center on teleport arrival
  shunpoStrike1Damage: 22,       // Base damage for Step 1 flank slash
  shunpoStrike1FreezeDuration: 12, // Hit-pause frames on target during Strike 1
  shunpoStrike1SlashDuration: 14,// Swing animation duration frames for Strike 1
  shunpoStrike2Multiplier: 1.35, // Finisher damage multiplier for Step 2 cross slash
  shunpoStrike2StunDuration: 22, // Stun frames applied on finisher hit
  shunpoStrike2SlashDuration: 18,// Swing animation duration frames for Strike 2
  shunpoStrike2Knockback: 9,     // Finisher knockback force
  shunpoShockwaveSize: 45,       // Shockwave burst size on finisher
  shunpoScreenShake: 3,          // Screen shake intensity on finisher
  shunpoComboDelayFrames: 10,    // Delay window frames between Strike 1 and Strike 2
  shunpoTriggerMinDist: 180,     // Minimum distance from enemy for AI to use Shunpo
  shunpoTriggerMaxDist: 350,     // Maximum distance from enemy for AI to use Shunpo

  // Passive: Hollow Mask Awakening
  hollowMaskThreshold: 0.30,     // Automatically activates when HP <= 30%
  hollowMaskDuration: 600,       // Mask duration in frames (10 seconds)
  hollowSpeedMultiplier: 1.4,    // Speed boost multiplier
  hollowDamageMultiplier: 1.5,   // Damage multiplier boost
  hollowGetsugaDamage: 50,       // Upgraded Black Getsuga damage while mask active
  hollowGetsugaSpeed: 22,        // Hollow Mask projectile travel speed
  hollowGetsugaKnockback: 8,     // Knockback force applied
  hollowGetsugaHitStun: 20,      // Hit stun frames applied on hit
  hollowGetsugaScreenShake: 4,   // Screen shake intensity on release
  hollowGetsugaRadius: 42,       // Hollow Mask Getsuga projectile radius
  hollowGetsugaColor: '#FF1E00', // Hollow Mask Getsuga color

  // Ultimate: Bankai Awakening (Tensa Zangetsu)
  ultimateThreshold: 0.50,       // Automatically activates when HP <= 50%
  ultimateCooldown: 1500,        // Ultimate cooldown frames (25s)
  bankaiDuration: 600,           // Duration of Bankai form (10s)
  bankaiSlideFrames: 10,         // Braking skid slide frames when initiating Bankai
  bankaiSlideDamping: 0.70,      // Velocity damping per frame during brake slide
  bankaiChargeFrames: 50,        // Channeling duration frames for epic Bankai transformation
  bankaiBurstFrames: 36,         // Post-release transformation explosion & shatter burst duration
  bankaiSpeedMultiplier: 1.5,    // Extra speed multiplier during Bankai
  bankaiDamageMultiplier: 1.4,   // Extra melee damage multiplier during Bankai
  bankaiAuraShockwaveSize: 95,   // Shockwave burst size on Bankai activation
  bankaiScreenShake: 7,          // Screen shake intensity upon Bankai release
  bankaiGetsugaDamage: 45,       // Kuroi Getsuga damage during Bankai
  bankaiGetsugaSpeed: 22,        // Kuroi Getsuga travel speed (pixels/frame)
  bankaiGetsugaKnockback: 8,     // Kuroi Getsuga knockback force
  bankaiGetsugaHitStun: 20,      // Kuroi Getsuga hit stun duration
  bankaiGetsugaScreenShake: 4,   // Kuroi Getsuga screen shake intensity
  bankaiGetsugaRadius: 36,       // Bankai Getsuga projectile radius
  bankaiGetsugaColor: '#00E5FF', // Bankai Getsuga color
};


