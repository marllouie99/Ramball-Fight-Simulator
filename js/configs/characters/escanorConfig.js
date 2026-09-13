// ─────────────────────────────────────────────
// Escanor Character Config
// The Seven Deadly Sins (Nanatsu no Taizai) — Lion's Sin of Pride
// ─────────────────────────────────────────────

export const escanorConfig = {
  // Baseline Attributes
  hp: 390,
  maxHpRatio: 1.0,
  speed: 5.7,
  moveSpeed: 5.0,
  r: 25,
  radius: 25,
  color: '#F59E0B',            // Radiant Solar Amber
  themeColor: '#F59E0B',
  secondaryColor: '#DC2626',   // Solar Flare Crimson
  accentGold: '#FBBF24',       // Holy Armor & Sacred Treasure Gold
  accentRoyalBlue: '#2563EB',  // Holy Knight Shoulder Pauldron Blue
  accentDark: '#18181B',       // Deep Manga Shadow
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 1.0,
  damage: 15,
  cooldown: 56,
  projectileSpeedMultiplier: 1.0,
  ability: 'Grace "Sunshine" & "The One"',
  desc: 'The Lion\'s Sin of Pride. Colossal solar juggernaut wielding the Sacred Treasure Divine Axe Rhitta. Radiates intense solar heat, gaining Solar Pride power escalation. Wields 140° Divine Slashes, Cruel Sun blazing stars, Pride Flare solar novas, and the invincible high noon ultimate: "The One" with Divine Sword Escanor.',

  // ──────────────────────────────────────────
  // ABILITY MASTER TOGGLE SWITCHES
  // ──────────────────────────────────────────
  enableSunshine: 0,
  enableCruelSun: 0,
  enablePrideFlare: 0,
  enableTheOne: 0,

  // Passive 1: Grace "Sunshine" & Thermal Updraft
  sunshineHeatRadius: 65,
  sunshineHeatDps: 3,
  thermalUpdraftSlow: 0.15,

  // Passive 2: Solar Pride Escalation
  prideStackMax: 5,
  prideStackDamageBonus: 0.08,  // +8% damage per stack (max +40%)
  prideChargeIntervalFrames: 150, // 1 stack every 2.5s passively

  // Basic Attack: Divine Axe Rhitta — Telegraphed Overhead Chop Strike (Missable)
  rhittaArcAngle: Math.PI * 0.778, // ~140 degrees
  rhittaReach: 100,
  chopLiftFrames: 80,              // Frames to lift axe up from guard to high overhead (~0.33s)
  chopLiftHoldFrames: 100,         // EXACT number of frames Escanor stays poised in high overhead lift stance before striking down (~1.67s)
  chopStrikeFrames: 20,             // Frames for the explosive downward chop stroke (~0.13s)
  chopRecoveryFrames: 50,          // Frames to recover back to resting pose (~0.20s)
  chopHitPauseFrames: 14,          // Cinematic hit-pause frame freeze upon axe impact (like Nanami's ratio impact)
  basicImpactShake: 7.0,           // Concussive arena shake on initial weapon contact
  basicImpactShakeDuration: 12,
  basicUnpauseShake: 10.0,         // Heavy explosive arena shake on knockback release
  basicUnpauseShakeDuration: 18,
  basicMissShake: 4.5,             // Concussive ground shake on downward chop miss
  basicMissShakeDuration: 8,
  basicDamageMin: 30,
  basicDamageMax: 38,
  basicBurnDamage: 6,
  basicKnockback: 50.0,            // Heavy physical axe knockback launched on unpause
  basicHitStunFrames: 7,

  // Wall Pin & Stasis (When knockback drives enemy into arena boundaries)
  wallPinDurationFrames: 15,         // Adjust pinned duration in frames (60 frames = 1.0 second, 55 frames = ~0.92s)
  wallPinScreenShakeIntensity: 14.0, // Heavy concussive screen shake on wall impact
  wallPinScreenShakeDuration: 16,
  wallBounceSlowFrames: 90,          // Lingering stagger slow after unpinning (~1.5s)
  wallBounceSlowMultiplier: 0.40,    // 40% movement speed while recovering

  // Skill 1: Cruel Sun (無慈悲な太陽)
  cruelSunCooldown: 510,       // 8.5s
  cruelSunSpeed: 9.5,
  cruelSunOrbRadius: 18,
  cruelSunDamage: 65,
  cruelSunAoeRadius: 80,
  cruelSunAoeDamage: 38,
  cruelSunKnockback: 14.0,
  cruelSunBurnDps: 4,
  cruelSunBurnDurationSec: 4,

  // Skill 2: Pride Flare (プライド・フレア)
  prideFlareCooldown: 660,     // 11.0s
  prideFlareRadius: 110,
  prideFlareDamage: 52,
  prideFlareKnockback: 22.0,
  prideFlareStunDuration: 36,  // 0.6s

  // Ultimate: "THE ONE" — Divine Sword Escanor (天地無双)
  theOneCooldown: 1560,        // 26.0s
  theOneDuration: 480,         // 8.0s
  theOneDamageMultiplier: 1.45,
  theOneFinisherDamage: 115,
  theOneFinisherReach: 120,
  theOneFinisherKnockback: 42.0,
};
