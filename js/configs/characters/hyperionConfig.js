// ─────────────────────────────────────────────────────────────────────────────
// Hyperion Character Config
// ─────────────────────────────────────────────────────────────────────────────

export const hyperionConfig = {
  id: 'laser',
  name: 'Hyperion',
  displayName: 'Hyperion',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Greek Mythology',
  color: '#ffffff',
  radius: 25,
  hp: 80,
  damage: 15,
  cooldown: 300, // 3 seconds cooldown
  moveSpeed: 4.0,
  ability: 'Sustained Laser',
  desc: 'Fires a continuous laser beam.',

  // Skill Tuning (CONFIG.laser)
  aimThreshold: 0.12,  // radians; must face enemy this precisely to start the beam
  beamDuration: 100,   // frames the beam fires for (180 = 3 s at 60 fps)
  windupDuration: 150, // frames of beam charge before firing (240 = 4 s at 60 fps)
  beamLength: 1200,    // pixels; how far the beam reaches across the arena
  slowDuration: 180,   // frames the slow debuff lasts on hit targets (60 = 1 s)
  slowMultiplier: 1.0, // speed fraction while slowed (0.6 = 40 % slower)
  slowChance: 1.5,     // probability (0-1) that the beam applies the slow effect on hit
  beamStartKnockback: 1.8, // initial self-knockback impulse when the beam starts
  beamBackwardSpeed: 0.8,  // backward drift force while the beam is active
  beamDriftRetention: 0.92, // proportion of current velocity retained each frame during beam fire
  beamDriftBlend: 0.08,    // proportion of beam recoil blended into velocity each frame
  beamRotateSpeed: 0.015,  // increased to allow the beam to effectively track moving targets
  initialKnockback: 1,     // velocity impulse on the very first beam contact
  tickDamage: 5.5,     // damage applied every tick interval after the initial hit
  tickInterval: 7,     // frames between damage ticks while beam is active
  coreWidth: 4,        // base pixel width of the bright beam core (flickers ± 2 px)
  glowWidth: 12,       // base pixel width of the soft glow layer (flickers ± 4 px)
};
