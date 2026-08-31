// ─────────────────────────────────────────────
// Uryu Ishida — The Last Quincy & Sternritter "A" Config
// ─────────────────────────────────────────────
export const uryuConfig = {
  // ── Base Attributes ──
  hp: 230,
  speed: 6.2,
  moveSpeed: 6.2,
  r: 25,
  radius: 25,
  color: '#00E5FF', // Quincy Radiant Cyan
  themeColor: '#00E5FF',
  startX: 300,
  startY: 250,
  startVx: 1.2,
  startVy: 1.0,
  damage: 18,
  cooldown: 28,
  projectileSpeedMultiplier: 1.0,
  glassesScale: 1.0,             // Bold prominent scale for signature spectacles
  ability: 'The Antithesis',
  desc: 'The Last Quincy. Attacks from long range with Heilig Bogen spirit arrows, glides with Hirenkyaku, traps enemies with Sprenger, and reverses damage with Schrift "A": The Antithesis.',

  // ── Basic Attack (Heilig Bogen: Ginrei Kojaku) ──
  arrowSpeed: 22,                // Supersonic Reishi arrow projectile velocity
  arrowDamage: 18,               // Base damage per arrow hit
  arrowRadius: 5,                // Arrow collision radius
  arrowColor: '#00E5FF',         // Radiant cyan core
  arrowTrailColor: 'rgba(0, 229, 255, 0.45)',
  arrowKnockback: 4.5,           // Pushback on hit
  arrowHitStun: 8,               // Micro-stun frames
  burstCount: 3,                 // Arrows fired per volley
  burstDelay: 5,                 // Frames between volley arrows
  shootCooldown: 34,             // Base cooldown between volleys
  maxStuckArrows: 4,             // Maximum number of arrows allowed stuck in arena walls concurrently
  stuckArrowDuration: 90,        // Total frames stuck arrow remains in wall before fully dissipating
  stuckArrowFadeDuration: 30,    // Frames over which the stuck arrow fades to 0 opacity

  // ── Close-Quarters Intercept (Seele Schneider & Weapon Switch Buffer) ──
  seeleDamage: 16,               // Melee slice damage
  seeleRange: 68,                // Frontal melee reach
  seeleArc: 130,                 // Frontal arc degrees (Rule 7)
  seeleKnockback: 9.0,           // Knockback force pushing enemy back to range
  seeleCooldown: 32,             // Cooldown between parry slices
  seeleSwingDuration: 18,        // Seele Schneider swing animation duration (frames)
  seeleImpactFrame: 8,           // Mid-swing impact frame (peak velocity contact point)
  weaponSwitchDuration: 8,       // Transition buffer duration (frames) when returning to Bow mode
  weaponSwitchMeleeBuffer: 4,    // Brief transition buffer (frames) when drawing Seele Schneider
  weaponSwitchLerpIn: 0.28,      // Transition lerp speed when equipping Seele Schneider
  weaponSwitchLerpOut: 0.16,     // Transition lerp speed when de-materializing Seele Schneider
  autoSwitchToMelee: true,       // Smoothly auto-switch to Seele Schneider melee mode when enemy is in range

  // ── Skill 1: Hirenkyaku & Licht Regen ──
  hirenkyakuCooldown: 360,           // ~6s cooldown between uses
  hirenkyakuDashDistance: 240,       // Distance glided backward during Hirenkyaku
  hirenkyakuDashFrames: 5,           // Evasion duration (frames)
  afterImageDuration: 16,            // Lifespan of Hirenkyaku afterimages (frames)
  plantedPauseFrames: 6,             // Feet planting momentum stop duration (frames)
  skywardWindupFrames: 24,           // Skyward bow aiming & slow draw duration (frames)
  skywardBeaconArrowSpeed: 22,       // Flight velocity of beacon arrow soaring upward into the sky
  skywardBeaconArrowScale: 0.32,     // Visual scale of initial glowing beacon arrow
  skywardBeaconArrowLife: 60,        // Lifespan of beacon arrow (frames before reaching clouds)
  skywardAscentMaxFrames: 45,        // Maximum timeout waiting for beacon to clear top of screen before rain begins
  lichtRegenDuration: 36,            // Torrent rain channeling duration (frames, ~0.6s)
  lichtRegenArrows: 18,              // Total micro-arrows in barrage
  lichtRegenFireInterval: 3,         // Interval between consecutive arrow drops (frames)
  lichtRegenDamage: 6,               // Damage per micro-arrow
  lichtRegenArrowSpeed: 28,          // Velocity of falling micro-arrows
  lichtRegenArrowScale: 0.08,        // Visual scale of falling micro-arrows
  lichtRegenRainSpreadX: 150,        // Horizontal rain spread width over target (pixels)
  lichtRegenRainHeight: 360,         // Vertical spawn offset above target in sky (pixels)
  lichtRegenRecoveryCooldown: 50,    // Recovery frame delay before resuming basic attacks
  telegraphBeamHeight: 320,          // Visual guidance light column height (pixels)
  telegraphRadiusMult: 1.6,          // Visual reticle ground radius multiplier relative to target radius
  hirenkyakuAiTriggerRange: 150,     // Close-quarters distance threshold to trigger defensive Hirenkyaku
  hirenkyakuAiMidRange: 450,         // Maximum range to trigger offensive Hirenkyaku/Licht Regen
  hirenkyakuAiMidRangeChance: 0.006, // Random per-frame chance to trigger at mid range

  // ── Skill 2: Gintō Sprenger (Pentagram Trap) ──
  sprengerCooldown: 480,         // ~8s cooldown
  sprengerDamage: 85,            // True damage within pentagram
  sprengerRadius: 90,            // Pentagram radius

  // ── Ultimate: Vollständig & The Antithesis ──
  ultimateCooldown: 1200,        // 20s cooldown
  antithesisThreshold: 0.35,     // Trigger threshold (35% HP or manual)

  // ── Passive 1: Reishi Absorption & Sklaverei Gauge ──
  reishiMaxGauge: 100,
  piercingLightDuration: 360,     // 6 seconds of Piercing Light state
  piercingArrowSpeedMult: 1.35,   // +35% arrow velocity
  piercingDamageMult: 1.25,       // +25% arrow damage
  piercingMaxPierces: 4,          // Pierce through up to 4 targets
  piercingIgnoreArmor: 0.30,      // Ignore 30% damage reduction
  siphonProjectileGain: 0.85,     // Reishi gained from nearby enemy projectile
  siphonDomainGain: 0.65,         // Reishi gained per tick from active domains
  siphonHitGain: 4.5,             // Reishi gained on arrow hit
  siphonMeleeGain: 8.0,           // Reishi gained on Seele Schneider parry

  // ── Passive 2: Ransōtengai (Heavenly Wild Puppet Suit) ──
  ransotengaiHpThreshold: 0.30,   // Triggers at <= 30% HP
  ransotengaiDuration: 360,       // 6 seconds duration
  ransotengaiCooldown: 1200,      // 20s cooldown
  ransotengaiSpeedBoost: 1.45,    // +45% movement speed

  // ── Sound FX Configuration ──
  sounds: {
    bowShoot: 'Assets/Sound Effects/Attacks/shurikenthrow.mp3',
    arrowHit: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
    hirenkyaku: 'Assets/Sound Effects/Skills/dash1.mp3',
    seeleSlice: 'Assets/Sound Effects/Attacks/energysword.mp3',
    sprengerBoom: 'Assets/Sound Effects/Skills/redblast.mp3',
    antithesis: 'Assets/Sound Effects/Skills/domainexpansion.mp3',
    lichtRegen: 'Assets/Sound Effects/Attacks/laserpew.mp3'
  },
  soundVolumes: {
    bowDraw: 0.65,
    bowShoot: 0.85,
    arrowHit: 0.80,
    hirenkyaku: 0.75,
    seeleSlice: 0.85,
    sprengerBoom: 0.95,
    antithesis: 1.0,
    lichtRegen: 0.80
  }
};
