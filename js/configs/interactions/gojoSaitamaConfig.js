/**
 * Special Interaction Configuration: Gojo Satoru vs Saitama
 * Contains all dedicated tuning and parameters for the Gojo vs Saitama interaction.
 */
export const gojoSaitamaConfig = {
  // ── Master Toggle ──
  enabled: true,                            // Master toggle: Enable/disable Gojo vs Saitama special interactions

  // ── Limitless Infinity Structural Durability & Cracking ──
  enableInfinityCracking: true,             // Saitama physical attacks crack the structural durability of Limitless Infinity
  barrierMaxHp: 350,                        // Total structural HP of Gojo's Limitless Infinity barrier
  normalPunchDamage: 70,                    // Structural barrier damage per Normal Punch (Tier 1 Crack at 280 HP)
  flurryPunchDamage: 35,                    // Structural barrier damage per flurry hit in Consecutive Normal Punches (Tier 2 Fracture at 245 HP)
  seriousPunchDamage: 280,                  // Structural barrier damage from Serious Punch
  finalBlowDamage: 120,                     // Structural barrier damage from combo finishing blows
  seriousCounterDamage: 99999,              // Structural barrier damage from Serious Skill Counter (instantly shatters Infinity)
  brokenLockoutCooldown: 360,               // Cooldown duration (frames) before Infinity can regenerate after being shattered

  // ── Shatter Visuals & Audio ──
  shatterGlassShards: 28,                   // Flying crystal glass shard count spawned on barrier shatter
  shatterScreenShakeIntensity: 18,          // Screen shake impulse on barrier break
  shatterScreenShakeDuration: 20,           // Screen shake frames on barrier break
  shatterSFX: 'Assets/Sound Effects/Skills/thin-ice-breaker.mp3',

  // ── Hollow Purple Evasion ──
  enablePurpleFirstImpactDodge: true,       // Saitama & Sans teleport-dodge Hollow Purple on first collision impact only
  purpleDodgeDistance: 130,                 // Distance (px) to teleport outside the Hollow Purple trajectory on first impact
};
