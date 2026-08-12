export const saitamaConfig = {
  // Base stats
  hp: 420,
  moveSpeed: 6.0,
  color: '#F5C400', // Bright Safety Yellow
  radius: 25,

  // Basic Attack: Normal Punch
  punchDamage: 100, // Massive basic attack damage
  punchKnockback: 100, // Massive knockback force
  punchReach: 80,
  punchArcAngle: Math.PI * 0.5, // 90 degree arc angle
  punchCooldown: 500, // ~0.5s cooldown
  punchWindup: 0,
  shockwaveRadius: 60,
  wallPinDurationFrames: 20,       // Duration (frames) enemy stays pinned to wall on hit (~1.0s at 60fps)
  wallBounceSlowFrames: 120,       // Duration (frames) movement slow lasts after wall pin (~2.0s at 60fps)
  wallBounceSlowMultiplier: 0.35,   // Speed multiplier during slow debuff (35% speed)
  wallCrackScale: 0.45,            // Size scale of wall crack decal (smaller)
  wallCrackThickness: 0.35,        // Thickness scale of crack lines (thinner)
  disableWallPinCyanOverlay: true, // Remove electric cyan freeze overlay when enemy is pinned to wall
  punchScreenShakeIntensity: 12,   // Arena screen shake intensity on basic attack punch hit
  punchScreenShakeDuration: 10,    // Arena screen shake duration (frames) on basic attack punch hit
  wallPinScreenShakeIntensity: 30,  // Arena screen shake intensity on wall pin impact
  wallPinScreenShakeDuration: 12,  // Arena screen shake duration (frames) on wall pin impact
  punchImpactSFX: 'Assets/Sound Effects/Skills/saitama-seriouspunch-impact.mp3', // Audio played when basic punch hits enemy
  punchImpactVolume: 2.0,
  punchImpactFadeDelayMs: 350,      // Delay (ms) after punch impact before audio fade out starts
  punchImpactFadeDurationMs: 900,   // Smooth fade out duration (ms) for basic attack impact audio

  // Skill 1: Consecutive Normal Punches
  flurryDamage: 22,
  flurryHitCount: 6,
  flurryFinalSlamDamage: 55,
  flurryFinalSlamRadius: 80,
  flurryCooldown: 540, // 9 seconds at 60fps

  // Skill 2: Serious Side Hops
  sideHopsCooldown: 420, // 7 seconds at 60fps
  sideHopsDistance: 100,

  // Ultimate: Serious Punch
  seriousPunchWindupFrames: 90, // 1.5 seconds at 60fps
  seriousPunchDamage: 999, // True damage one-shot
  seriousPunchBeamWidth: 80,
  seriousPunchCooldown: 2700, // 45 seconds at 60fps

  // Passive: Hero for Fun
  boredomStackInterval: 300, // 5 seconds at 60fps
  boredomMaxStacks: 5,
  boredomDamagePerStack: 0.15, // +15% per stack

  // Passive: Caped Baldy Reflexes (Dodge Teleport)
  dodgeChance: 0.95, // probability (0-1) of successfully dodging incoming attacks
  dodgeDistance: 50, // Short sidestep distance (left/right)
  dodgeCooldown: 1, // Minimum frames (~0.06s) between dodge sidesteps
  attackerTeleportChaseDelayFrames: 5, // Delay (frames) applied to teleporting chasers (Gojo/Sukuna) when Saitama dodges (~0.5s)

  // Passive: Serious Skill Counter (Teleport Behind Punch)
  counterPunchDamage: 500,        // Damage dealt by the counter punch
  counterWindupFrames: 50,        // Frames Saitama waits before teleporting (reaction delay)
  counterTeleportIdleFrames: 10,  // Frames Saitama stands completely still (staring) after teleporting before starting the charge
  counterPunchPoseFrames: 100,     // Frames Saitama holds the punch pose before it lands (increased to 1.5s so effects are visible)
  counterPunchKnockback: 50,      // Knockback force applied to the target on punch landing
  counterPunchHitPauseFrames: 10, // Frames the target is frozen after the punch lands
  counterPunchSlowFrames: 120,    // Slow debuff duration after punch (~2s at 60fps)
  counterPunchSlowMultiplier: 0.35, // Slow debuff strength (35% speed — staggering)
  counterPunchRecoveryFrames: 50, // Frames Saitama stands still after landing (post-punch stall)
  skillPunishCooldown: 2000,       // Cooldown between consecutive counter punches (2000 frames ~33.3s at 60fps)
  initialSkillPunishCooldown: 2000, // Cooldown at the start of the round before first counter is available (2000 frames)
  counterPunchScreenShakeIntensity: 100.0, // Intensity of the screen shake
  counterPunchScreenShakeFrames: 30,     // Duration of the screen shake

  // Passive: Serious Skill Counter Audio Config
  counterPunchImpactSFX: 'Assets/Sound Effects/Skills/saitama-seriouspunch-impact.mp3',
  counterPunchImpactVolume: 1.0,
  counterPunchImpactEnabled: true,

  counterPunchVoiceSFX: 'Assets/Sound Effects/Skills/saitama-seriouspunch-voiceline.mp3',
  counterPunchVoiceVolume: 3.0,
  counterPunchVoiceEnabled: true,

  counterPunchChargingSFX: 'Assets/Sound Effects/Skills/saitama-seriouspunch-charging.mp3',
  counterPunchChargingVolume: 1.0,
  counterPunchChargingEnabled: true,
};
