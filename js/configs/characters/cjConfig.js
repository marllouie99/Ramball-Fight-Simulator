// ─────────────────────────────────────────────
// Carl "CJ" Johnson — The Grove Street Cheatmaster Config
// GTA San Andreas Cheat Codes & Street Boxing CQC
// ─────────────────────────────────────────────

export const cjConfig = {
  // ── 1. BASE ATTRIBUTES ──
  hp: 440,
  speed: 6.0,
  r: 25,
  color: '#16A34A',            // Grove Street Families Green
  themeColor: '#16A34A',       // Unified HUD & UI Accent Green
  secondaryColor: '#F59E0B',   // San Andreas Sunset Gold
  skinColor: '#8D5538',        // Natural Warm Brown Skin Tone

  // ── 2. PASSIVE: RESPECT+ & CHEAT DIALER ──
  respectGainPerPunch: 10,     // Respect meter gain per brass knuckle hit
  respectGainOnHit: 4,         // Respect gain when taking/blocking hits
  maxRespect: 100,             // Max Respect threshold (Grove Street OG)
  respectSpeedBoost: 0.15,     // +15% move speed at >= 50% Respect (Permanent)
  respectAttackSpeedBoost: 0.25, // +25% attack speed at 100% OG (Permanent)
  respectDamageBoost: 0.15,    // +15% punch damage at 100% OG (Permanent)
  cheatTypingFramesPerChar: 14, // Natural typing cadence (~0.23s per character)
  cheatTypingHoldDelay: 24,     // 24 frames (~0.40s) hold delay with full word displayed before activating
  cheatActivationPostDelay: 18, // 18 frames (~0.30s) post-activation pose delay before resuming action

  // ── 3. BASIC ATTACK: BRASS KNUCKLES STREET BOXING ──
  meleePunchReach: 80,         // 80px punch reach
  meleePunchArc: (120 * Math.PI) / 180, // 120° wide multi-target frontal arc (Rule 8)
  meleePunchDamage: 24,        // Punch damage
  meleePunchCooldown: 18,      // 18 frames (~0.30s) fast boxing cadence
  meleeKnockback: 18.0,        // Physical pushback impulse
  meleeHitShakeIntensity: 2.2, // Screen shake on brass knuckle connection
  meleeHitShakeDuration: 4,

  // ── 4. SKILL 1: HESOYAM (Health, Armor & $250k Shockwave) ──
  hesoyamCooldown: 420,        // 7.0s (420 frames at 60fps)
  hesoyamHealPercent: 0.50,    // Instantly restores 50% of Max HP (permanent)
  hesoyamShieldAmount: 75,     // Equips 75 HP Bulletproof Kevlar Shield (permanent until broken by damage)
  hesoyamShockwaveRadius: 160, // 160px AOE explosion of green cash & coins
  hesoyamShockwaveDamage: 35,  // Shockwave damage
  hesoyamKnockback: 22.0,      // Blast pushback
  hesoyamHpThreshold: 0.70,    // Triggers strictly when HP drops to <= 70%
  hesoyamMinLostPercent: 0.25, // Minimum lost HP percent (25%) required to activate
  hesoyamRespectGain: 15,      // Respect gained on successful activation

  // ── 5. SKILL 2: ROCKETMAN / YECGAA (DARPA Jetpack & Dual Micro-Uzi Strafe) ──
  jetpackCooldown: 570,        // 9.5s (570 frames)
  jetpackDuration: 270,        // 4.5s flight duration (270 frames)
  jetpackSpeedMultiplier: 1.30, // High-speed omni-directional hover
  jetpackEvadeChance: 0.50,    // 50% airborne evasion chance against incoming attacks
  jetpackThrusterBurnDamage: 6, // Burning damage per frame in thruster fire
  jetpackDiveDashSpeed: 16.0,  // Supersonic knuckle dive boost speed
  jetpackUziFireInterval: 5,   // Rapid dual alternating fire cadence (every 5 frames = 12 bullets/sec)
  jetpackUziBulletDamage: 8,   // 8 damage per 9mm full metal jacket round
  jetpackUziBulletSpeed: 23.0, // High velocity strafe bullet speed
  jetpackUziSpread: 0.07,      // Natural Micro-SMG bullet spray spread
  jetpackUziRange: 320,        // Effective firing range while hovering
  jetpackUziKnockback: 2.8,    // Impact impulse

  // ── 6. SKILL 3: GROVESTREET4LIFE (Drive-By Backup) ──
  driveByCooldown: 600,        // 10.0s (600 frames)
  driveByBulletCount: 20,      // Rapid 20-round Tec-9 burst
  driveByBulletDamage: 8,      // 8 damage per bullet
  driveByBulletSpeed: 22.0,
  driveBySlowDuration: 120,    // 2.0s slow in burning tire burnout oil

  // ── 7. ULTIMATE: BAGUVIX (God Mode & Minigun Riot Overdrive) ──
  baguvixDuration: 300,        // 5.0s (300 frames) invulnerability
  minigunFireRate: 2,          // Ultra-fast fire (every 2 frames)
  minigunBulletDamage: 12,     // 12 damage per armor-piercing round
  minigunBulletSpeed: 26.0,
  minigunKnockback: 6.5,

  // ── 8. AUDIO ASSETS & VOLUMES ──
  sounds: {
    cheatActivated: 'Assets/Sound Effects/Skills/cheat-activated.mp3',
    respectPassed: 'Assets/Sound Effects/Skills/mission-passed.mp3',
    punchHit: 'Assets/Sound Effects/Attacks/punch-heavy.mp3',
  },
  soundVolumes: {
    cheatActivated: 0.95,
    respectPassed: 1.0,
    punchHit: 0.85,
  }
};
