export const saitamaConfig = {
  // Base stats
  hp: 420,
  moveSpeed: 6.0,
  color: '#F5C400', // Bright Safety Yellow
  radius: 25,

  // Basic Attack: Normal Punch
  punchDamage: 38,
  punchReach: 70,
  punchArcAngle: Math.PI * 0.5, // 90 degree arc angle
  punchCooldown: 100, // ~0.65s at 60fps
  punchWindup: 8,
  shockwaveRadius: 40,

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
};
