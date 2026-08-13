// ─────────────────────────────────────────────
// Ichigo Kurosaki — Substitute Soul Reaper Config
// ─────────────────────────────────────────────
export const ichigoConfig = {
  // Basic Attack: Tensa Zangetsu Cleave
  swordDamage: 16,               // Base damage per melee slash
  swordCooldown: 30,             // Cooldown in frames between slashes (~0.5s)
  swordRange: 70,                // Melee reach (120° frontal arc)
  knockback: 6,                  // Knockback on hit

  // Skill 1: Getsuga Tensho
  getsugaCooldown: 360,          // Cooldown in frames (~6s)
  getsugaDamage: 30,             // Base damage for Getsuga projectile
  getsugaSpeed: 16,              // Projectile speed
  getsugaWidth: 12,              // Visual width/size of the wave
  getsugaPierce: true,           // Pierces through enemies/projectiles

  // Skill 2: Flash Step (Shunpo) Assault
  shunpoCooldown: 240,           // Cooldown in frames (~4s)
  shunpoRange: 220,              // Distance dashed
  shunpoSlashDamage: 25,         // Damage dealt to targets passed through
  shunpoStunDuration: 20,        // Stun frames applied on backstab/dash hit

  // Passive: Hollow Mask Awakening
  hollowMaskThreshold: 0.30,     // Automatically activates when HP <= 30%
  hollowMaskDuration: 600,       // Mask duration in frames (10 seconds)
  hollowSpeedMultiplier: 1.4,    // Speed boost multiplier
  hollowDamageMultiplier: 1.5,   // Damage multiplier boost
  hollowGetsugaDamage: 50,       // Upgraded Getsuga damage
  hollowGetsugaSpeed: 22,        // Upgraded Getsuga projectile speed

  // Ultimate: Vasto Lorde Awakening
  ultimateCooldown: 1500,        // Ultimate cooldown frames (25s)
  ultimateDuration: 480,         // Duration of Vasto Lorde form (8s)
  vastoLordeHpRegen: 1.2,        // HP healed per frame (at 60fps, ~72 HP/sec)
  vastoLordeSpeedMult: 1.6,      // Extra speed multiplier during ultimate
  ceroDamage: 85,                // Base damage of point-blank Cero finisher
  ceroWidth: 80,                 // Width of the Cero blast beam
  ceroFreezeDuration: 75,        // Target freeze duration during point-blank execution
};
