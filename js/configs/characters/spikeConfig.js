// ─────────────────────────────────────────────
// Spike — Thorn Brawler & Spiked Shell Config
// ─────────────────────────────────────────────
export const spikeConfig = {
  // ── Base Character Attributes ──
  id: 3,
  name: 'Spike',
  category: 'Fantasy & Magic',
  title: 'Thorn Brawler',
  bossTitle: 'Thorn Brawler',
  hp: 100,
  damage: 25,
  speed: 5.5,
  moveSpeed: 5.5,
  r: 25,
  radius: 25,
  color: '#e5c158',
  themeColor: '#e5c158',
  startX: 300,
  startY: 240,
  startVx: 1.6,
  startVy: -1.2,
  aimbot: false,
  spinRate: 0, // Set to 0 on def so Fighter.applyMovementPhysics does not double-spin
  baseSpinRate: 0.035, // Natural, smooth rotational spin velocity in normal state (speed = 5.5)
  spinScaleWithSpeed: true, // Dynamically scales rotational velocity with current speed
  spinStackBonus: 0.12, // Extra spin acceleration per active speed stack (+12% per stack)
  maxSpinRate: 0.38, // Maximum spin velocity cap to prevent stroboscopic reverse-wheel illusion
  ability: 'Spiked Shell',
  desc: 'Deals damage on collision, freezes enemy on impact, and stacks massive movement speed with every hit.',

  // ── Melee Collision & Contact Damage ──
  enableBasicAttack: true,       // Master toggle for contact melee collision attack
  contactDamage: 25,             // Base collision smash damage
  meleeCooldown: 50,             // Frames between consecutive melee strikes (~0.83s at 60fps)
  floatingText: 'SMASH!',        // Floating combat text on contact hit
  floatingTextColor: '#ffd700',  // Gold text color

  // ── Stacking Speed Mechanic (Permanent Acceleration on Hits) ──
  enableStackingSpeed: true,     // Master toggle for stacking speed boost on hit
  speedStackPerHit: 0.85,        // Extra movement speed gained per successful hit
  maxSpeedStacks: 12,            // Maximum speed stacks (up to +10.2 extra speed!)
  permanentStacks: true,         // Speed stacks are permanent throughout the match and do not reset/decay over time
  speedBoostMultiplier: 1.25,    // Base velocity multiplier applied during active stacks

  // ── Hit-Pause / Impact Freeze Mechanic ──
  enableHitPause: true,          // Master toggle for hit-pause / time-stop on collision
  hitPauseDuration: 14,          // Frames the enemy is frozen upon impact (~0.23s at 60fps)
  selfHitPauseDuration: 14,      // Frames Spike is paused upon collision (~0.23s at 60fps)
  hitShakeIntensity: 3.5,        // Global screen shake intensity on contact smash
  hitShakeDuration: 4,           // Screen shake frame duration

  // ── Ghost Model Afterimage Visuals ──
  enableGhostAfterimages: true,  // Master toggle for ghost model afterimages
  trailLength: 5,                // Number of ghost trail positions rendered behind fighter (optimized for 60 FPS)
  ghostAlphaMultiplier: 0.55,    // Peak opacity of the closest ghost afterimage
  ghostThemeColor: '#e5c158',    // Glowing golden amber aura tint for ghost models

  // ── Arena Wall Bounce & Target Tracking ──
  rebounceLockChance: 0.40,      // Probability (0.0 to 1.0) to aggressively dash toward the nearest target on wall rebound

  // ── Weapon Visual & Geometry Settings ──
  weapon: {
    numSpikes: 6,                // Number of rotating blades around the armored body
    innerOffset: -2,             // Radial offset from body perimeter (px)
    outerExtension: 20,          // Blade length reach (px)
    spikeWidth: 6,               // Base width of each triangular blade (px)
    spikeColor: '#e0e5eb',       // Metallic silver blade body
    spikeHighlight: '#ffffff',   // Shiny glint edge
    spikeShadow: '#5a626b',      // Darker metal base contrast
    bladeOutline: '#1a1f24',     // Dark ink outline
  },

  // ── Sound Effects ──
  sounds: {
    basicAttack: 'Assets/Sound Effects/Attacks/Spikestab.mp3',
    contactHit: 'Assets/Sound Effects/Attacks/Spikestab.mp3',
  },
  soundVolumes: {
    basicAttack: 0.70,
    contactHit: 0.70,
  },
};
