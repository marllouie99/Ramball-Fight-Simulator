// ─────────────────────────────────────────────
// John Wick — The Baba Yaga Config
// Tactical Gun-Fu, Center Axis Relock (C.A.R.) & Assassination CQC
// ─────────────────────────────────────────────

export const johnWickConfig = {
  bossTitle: 'Baba Yaga',
  title: 'Baba Yaga',

  // ── 1. BASE ATTRIBUTES ──
  hp: 220,
  speed: 5.6,
  moveSpeed: 5.6,
  r: 25,
  radius: 25,
  color: '#2B2D31',          // Tactical Charcoal Gunmetal
  themeColor: '#64748B',     // Tactical Gunmetal Slate (Dark aesthetic with clear text readability)
  secondaryColor: '#94A3B8', // Muted Silver/Steel Accent
  muzzleFlashColor: '#F97316', // Hot Muzzle Orange
  startX: 300,
  startY: 250,
  startVx: 1.2,
  startVy: 1.0,
  damage: 6,
  cooldown: 26,
  projectileSpeedMultiplier: 6.2,
  ability: 'C.A.R. Gun-Fu & The Pencil',
  desc: 'The Baba Yaga. Master of Center Axis Relock Gun-Fu and ruthless CQC. Passive: Ballistic Tailored Suit resists ranged damage. Wields the custom TTI Pit Viper 9mm and the infamous No. 2 Pencil for armor-piercing assassination takedowns.',

  // ── 2. PASSIVE 1: BALLISTIC TAILORED SUIT & FOCUS ──
  enableBallisticSuit: true,         // Master toggle for Ballistic Tailored Suit passive
  ballisticSuitDamageReduction: 0.10, // 10% flat damage mitigation against all incoming attacks
  ballisticSuitDeflectSparks: true,   // Triggers Kevlar deflection sparks & audio on absorbing incoming hits
  ballisticSuitShimmerDuration: 14,   // Duration (frames) of hexagonal carbon-weave shimmer overlay on suit
  focusGainPerBulletHit: 6,           // Focus gained per pistol shot connected
  focusGainPerMeleeHit: 8,            // Focus gained per Gun-Fu punch
  focusGainPerPencilStab: 15,         // Focus gained per pencil assassination stab
  maxFocus: 100,                      // Maximum Focus meter (for Ultimate activation)

  // ── 3. PRIMARY WEAPON: TTI PIT VIPER 9mm (PISTOL) ──
  enablePistol: true,                 // Master toggle for TTI Pit Viper 9mm pistol
  magazineSize: 12,                   // Rounds per magazine
  fireCooldown: 26,                   // ~0.43s between shots (26 frames at 60fps)
  bulletDamage: 6,                    // Base damage per 9mm projectile (72 total per mag)
  bulletSpeed: 21.0,                  // High-velocity projectile speed
  bulletRadius: 5.0,                  // Projectile collision radius
  bulletLife: 90,                     // Lifetime frames
  reloadTime: 70,                     // 1.16s tactical speed reload duration (frames)
  recoilDistance: 8.0,                // Visual recoil kickback in pixels
  flashDuration: 5,                   // Muzzle flash visibility frames
  casingDuration: 12,                 // Ejected shell casing arc frames
  bulletHitPushback: 6.0,             // Physical knockback on bullet impact
  bulletHitShakeIntensity: 1.4,       // Screen shake on 9mm bullet hit
  bulletHitShakeDuration: 3,          // Duration of 9mm hit shake
  bulletFireShakeIntensity: 1.2,      // Screen shake on 9mm shot firing
  bulletFireShakeDuration: 3,         // Duration of 9mm firing shake
  bulletHitBloodMinSize: 2.5,         // Min pixel size of blood particles (px)
  bulletHitBloodMaxSize: 4.8,         // Max pixel size of blood particles (px)
  bulletHitBloodCount: 4,             // Number of blood droplets spawned per hit

  // ── 3.5. SECONDARY WEAPON: BENELLI M4 TACTICAL SHOTGUN ──
  enableShotgun: true,                // Master toggle for Benelli M4 shotgun
  shotgunMagazineSize: 6,             // 6 12-gauge shells per tube
  shotgunFireCooldown: 52,            // ~0.86s between shotgun blasts (52 frames)
  shotgunPelletCount: 6,              // 6 heavy buckshot pellets per blast
  shotgunPelletDamage: 3,             // 3 damage per pellet (18 total point-blank)
  shotgunPelletSpeed: 23.0,           // Buckshot velocity
  shotgunPelletRadius: 4.2,           // Pellet collision size
  shotgunPelletLife: 55,              // Range decay frames
  shotgunSpreadAngle: (24 * Math.PI) / 180, // 24° spread cone
  shotgunKnockback: 16.0,             // Heavy physical stagger knockback on target
  shotgunPelletKnockback: 3.5,        // Physical pushback impulse per buckshot pellet hit
  shotgunHitShakeIntensity: 4.0,      // Heavy screen shake on 12-gauge buckshot hit
  shotgunHitShakeDuration: 7,         // Duration of shotgun hit shake
  shotgunRecoilDistance: 20.0,        // Heavy visible kickback in pixels
  shotgunSelfPushback: 4.0,           // Physical backward impulse on John Wick per shot
  shotgunFireShakeIntensity: 3.8,     // Screen shake on 12-gauge shotgun firing
  shotgunFireShakeDuration: 8,        // Duration of shotgun firing shake
  shotgunFlashDuration: 6,            // Muzzle blast visibility frames
  shotgunCasingDuration: 24,          // Ejected 12-gauge shell flight frames
  shotgunReloadTime: 90,              // Tactical tube reload duration (90 frames total)
  shotgunFramesPerShell: 15,          // Frames to insert one individual shell into magazine tube
  shotgunSwitchDuration: 44,          // Shotgun lift & crack animation frames (~0.73s)
  weaponSwitchDuration: 36,           // Weapon equip & racking pump animation frames (~0.60s)
  gunThrowSpeed: 14.0,                // Velocity of tossed empty gun
  gunThrowSpinSpeed: 0.28,            // Rotation speed of tossed gun

  // ── 3.6. TERTIARY WEAPON: TTI M4 / BCM CARBINE (M4 RIFLE) ──
  enableRifle: true,                  // Master toggle for M4 Rifle
  rifleMagazineSize: 20,              // 20 rounds 5.56x45mm NATO per PMAG
  rifleFireCooldown: 11,              // Machine gun auto-fire cadence (~5.5 shots/s, 11 frames per shot)
  rifleBulletDamage: 4,               // Base damage per 5.56 rifle round (80 total per mag)
  rifleBulletSpeed: 24.5,             // Supersonic 5.56 rifle projectile velocity
  rifleBulletRadius: 4.8,             // Projectile collision radius
  rifleBulletLife: 95,                // Long-range trajectory frames
  rifleBulletPushback: 3.5,           // Rapid kinetic pushback per impact
  rifleHitShakeIntensity: 0.7,        // Subtle rapid vibration on 5.56 hit
  rifleHitShakeDuration: 2,           // Duration of 5.56 hit shake
  rifleFireShakeIntensity: 0.5,       // Machine gun vibration on 5.56 firing
  rifleFireShakeDuration: 2,          // Duration of 5.56 firing shake
  rifleRecoilDistance: 5.5,           // Fast crisp rifle recoil
  rifleFlashDuration: 4,              // Muzzle flash duration (frames)
  rifleCasingDuration: 12,            // 5.56 casing tumble duration (frames)
  rifleSelfPushback: 1.0,             // Physical recoil impulse pushing John Wick backwards
  rifleReloadTime: 80,                // Mag-drop & fresh PMAG insertion duration (frames)
  rifleSwitchDuration: 44,            // M4 Rifle high-ready lift & charging handle crack duration (frames)
  rifleCrackSound: 'Assets/Sound Effects/Skills/johnwick-m4-reload.mp3',
  rifleCrackVolume: 0.90,

  // ── 4. CLOSE-QUARTERS COMBAT (CQC) MARTIAL ARTS ──
  enableCQC: true,                    // Master toggle for CQC martial arts
  meleePunchReach: 85,                // 85px punch reach
  meleePunchArc: (130 * Math.PI) / 180, // 130° wide frontal arc
  meleePunchDamage: 5,                // Base CQC strike damage
  meleePunchCooldown: 20,             // Cooldown between basic punches
  meleeKnockback: 10,                 // Physical knockback force
  meleeHitBloodMinSize: 2.5,          // Min blood droplet size on punch
  meleeHitBloodMaxSize: 4.8,          // Max blood droplet size on punch
  meleeHitBloodCount: 3,              // Blood droplet count on punch

  // ── 5. SKILL 1: TACTICAL COMBAT ROLL & EVADE INTANGIBILITY ──
  enableTacticalRoll: true,           // Master toggle for Tactical Combat Roll & Evade
  rollCooldown: 240,                  // 4.0s cooldown between tactical rolls (240 frames)
  rollDistance: 150,                  // Roll dash travel distance in pixels
  rollDuration: 18,                   // 18 frames roll animation
  evadeAlwaysActive: true,            // Evade buff is always active (passive dodge/intangibility)
  evadeBuffDuration: 36,              // Active intangibility duration (frames)
  evadeChance: 0.08,                  // 8% passive dodge chance (100% during Evade Buff)
  rollInstantReload: true,            // Instantly reloads magazine on tactical combat roll
  
  // Tactical Proximity Threat Evasive Roll (Triggered ONLY when an enemy gets close)
  rollEnemyCloseDistance: 110,        // Close proximity trigger distance (px): rolls when enemy gets near
  rollSpeed: 18.0,                    // Tactical roll speed (px/frame)
  rollEvadeDuration: 22,              // Evade i-frames during tactical roll (frames)

  // ── 6. SKILL 2: THE INFAMOUS NO. 2 PENCIL (ASSASSINATION) ──
  enablePencil: true,                 // Master toggle for No. 2 Pencil assassination
  pencilCooldown: 500,                // ~8.3s cooldown (500 frames)
  pencilReach: 60,                    // 60px strike reach
  pencilDamage: 30,                   // True Damage (ignores defense/armor)
  pencilBleedDamagePerTick: 2,        // Bleed damage per tick (2 true damage every 0.5s = 4 DPS, 12 total)
  pencilBleedIntervalFrames: 30,      // Bleed damage tick interval (30 frames = 0.5s)
  pencilBleedDuration: 180,           // 3.0s bleed duration (180 frames)
  pencilSlowMultiplier: 0.60,         // 40% slow applied to victim
  pencilSlowDuration: 90,             // 1.5s slow duration (90 frames)
  pencilScale: 1.80,                  // Visual scale multiplier for No. 2 graphite pencil graphic
  cqcPencilBloodMinSize: 3.8,         // Arterial spray min droplet size
  cqcPencilBloodMaxSize: 6.8,         // Arterial spray max droplet size
  cqcPencilBloodCount: 14,            // Arterial spray droplet count

  // ── 7. PENCIL ASSASSINATION CQC COMBO (EMPTY MAGAZINE TRIGGER) ──
  outOfAmmoRollDelayFrames: 18,        // Delay frames (~0.30s) after ammo hits 0 before initiating forward dive-roll
  
  // Phase 1: Forward 360° Spin Dive-Roll
  cqcForwardRollSpeed: 20,            // Forward roll blitz speed towards target
  cqcForwardRollDuration: 20,         // Forward roll duration (frames)
  cqcForwardEvadeDuration: 24,        // 100% Evade intangibility during forward roll (frames)

  // Phase 2: Pencil Assassination (Chamber -> Forward Stab -> Pullback)
  cqcPencilWindupFrames: 14,          // Chamber / arm pullback frames before the thrust (~0.23s)
  cqcPencilThrustFrames: 8,           // Explosive forward stab frames (tip plunges into target, ~0.13s)
  cqcPencilPullbackFrames: 14,        // Pullback retraction frames after impact (~0.23s)
  cqcPencilStabDuration: 36,          // Total assassination strike frames (Windup + Thrust + Pullback, ~0.60s)
  cqcPencilImpactShakeIntensity: 4.5, // Screen shake intensity on pencil tip impact
  cqcPencilImpactShakeDuration: 12,   // Screen shake duration on pencil tip impact
  cqcPencilKnockback: 14,             // Physical knockback impulse launched on victim upon stab impact (px/frame)

  // Phase 3: Backward 360° Spin Disengage Roll & Tactical Speed Reload
  cqcBackwardRollSpeed: 16,           // Backward disengage roll speed
  cqcBackwardRollDuration: 22,        // Backward roll duration (frames)
  cqcBackwardEvadeDuration: 26,       // Evade intangibility during backward roll (frames)

  // ── 8. CINEMATIC SPOTLIGHT & ARENA DIM EFFECT ──
  cqcSpotlightDimAlpha: 0.68,         // Background arena dimming opacity during combo
  cqcSpotlightRadius: 360,            // Spotlight cutout radius centered on John Wick & victim (px)
  cqcSpotlightBloomRadius: 150,       // Underfoot Continental Gold floor glow radius (px)

  // ── 9. ULTIMATE SKILL: EXCOMMUNICADO / CONTINENTAL EXECUTION (M4 RIFLE ASCENSION) ──
  enableExcommunicado: true,               // Master toggle for Excommunicado ultimate
  excommunicadoDefMultiplier: 1.30,        // 1.3x DEF multiplier while wielding M4 Rifle
  excommunicadoEvadeMultiplier: 1.25,      // Evade boost multiplier
  excommunicadoEvadeChance: 0.10,          // 10% Evade dodge chance in Excommunicado state
  excommunicadoSpeedMultiplier: 1.25,      // +25% movement speed multiplier while wielding M4 Rifle
  excommunicadoAmmoMultiplier: 1.20,       // 1.2x magazine capacity multiplier for M4 Rifle
  excommunicadoRifleMagazineSize: 24,      // 24-round extended PMAG capacity for M4 Rifle during Excommunicado

  // ── 10. AUDIO CONFIGURATION, VOLUMES, CHANCES & TIMING DELAYS (delays measured in ms or frames) ──
  sounds: {
    pistolShot: 'Assets/Sound Effects/Skills/johnwick-pistol-shot.mp3',
    pistolReload: 'Assets/Sound Effects/Skills/johnwick-pistol-reload.mp3',
    shotgunShot: 'Assets/Sound Effects/Attacks/shootgunshot.mp3',
    shotgunCrack: 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3',
    shotgunShellReload: 'Assets/Sound Effects/Skills/johnwick-shotgun-reload.mp3',
    rifleShot: 'Assets/Sound Effects/Skills/johnwick-m4-shot.mp3',
    rifleReload: 'Assets/Sound Effects/Skills/johnwick-m4-reload.mp3',
    pencilStab: 'Assets/Sound Effects/Skills/johnwick-pencilstab.mp3',
    shellDrop: 'Assets/Sound Effects/Skills/johnwick-bulleshell-drop.mp3',
    gunDrop: 'Assets/Sound Effects/Skills/johnwick-gundrop.mp3',
    weaponSwitch: 'Assets/Sound Effects/Skills/johnwick-gunswitch.mp3',
    weaponSwitchVoice: 'Assets/Sound Effects/Skills/johnwick-switchgun-voiceline.mp3',
    rollbackVoice: 'Assets/Sound Effects/Skills/Johnwick-rollback-voiceline.mp3',
    rollForward: 'Assets/Sound Effects/Skills/dash1.mp3',
    combatRoll: 'Assets/Sound Effects/Skills/dash1.mp3',
    evadeWoosh: 'Assets/Sound Effects/Skills/woosh.mp3',
    fleshHit: 'attack_fleshhit',
    bulletDeflect: 'Assets/Sound Effects/Skills/parry.mp3'
  },
  soundVolumes: {
    pistolShot: 0.45,
    pistolReload: 0.48,
    shotgunShot: 0.52,
    shotgunCrack: 0.45,
    shotgunShellReload: 0.45,
    rifleShot: 0.42,
    rifleReload: 0.48,
    pencilStab: 0.55,
    shellDrop: 0.32,
    gunDrop: 0.45,
    weaponSwitch: 0.48,
    weaponSwitchVoice: 0.55,
    rollbackVoice: 0.55,
    rollForward: 0.45,
    combatRoll: 0.45,
    evadeWoosh: 0.0,
    fleshHit: 0.45,
    bulletDeflect: 0.45
  },
  soundChances: {
    weaponSwitchVoice: 0.55, // 55% chance to play switch weapon voiceline
    rollbackVoice: 0.50      // 50% chance to play rollback disengage voiceline
  },
  soundDelays: {
    pistolShot: 0,
    pistolReload: 220,       // Delay in ms for magazine insertion/slide rack timing
    shotgunShot: 0,
    shotgunCrack: 180,       // Delay in ms for action pump/crack after firing
    shotgunShellReload: 0,
    rifleShot: 0,
    rifleReload: 0,
    pencilStab: 0,
    shellDrop: 0,
    gunDrop: 0,
    weaponSwitch: 0,
    weaponSwitchVoice: 0,
    rollbackVoice: 0,
    rollForward: 0,
    combatRoll: 0,
    evadeWoosh: 0,
    fleshHit: 0,
    bulletDeflect: 0
  },

  // Backwards compatibility aliases
  pencilStabSound: 'Assets/Sound Effects/Skills/johnwick-pencilstab.mp3',
  pencilStabVolume: 0.55,
  shellDropSound: 'Assets/Sound Effects/Skills/johnwick-bulleshell-drop.mp3',
  shellDropVolume: 0.32,
  gunDropSound: 'Assets/Sound Effects/Skills/johnwick-gundrop.mp3',
  gunDropVolume: 0.45,
  weaponSwitchSound: 'Assets/Sound Effects/Skills/johnwick-gunswitch.mp3',
  weaponSwitchVolume: 0.48,
  weaponSwitchVoiceSound: 'Assets/Sound Effects/Skills/johnwick-switchgun-voiceline.mp3',
  weaponSwitchVoiceVolume: 0.55,
  weaponSwitchVoiceChance: 0.55,
  rollbackVoiceSound: 'Assets/Sound Effects/Skills/Johnwick-rollback-voiceline.mp3',
  rollbackVoiceVolume: 0.55,
  rollbackVoiceChance: 0.50,
  pistolFireSound: 'Assets/Sound Effects/Skills/johnwick-pistol-shot.mp3',
  pistolFireVolume: 0.45,
  pistolReloadSound: 'Assets/Sound Effects/Skills/johnwick-pistol-reload.mp3',
  pistolReloadVolume: 0.48,
  rifleFireSound: 'Assets/Sound Effects/Skills/johnwick-m4-shot.mp3',
  rifleFireVolume: 0.42,
  rifleReloadSound: 'Assets/Sound Effects/Skills/johnwick-m4-reload.mp3',
  rifleReloadVolume: 0.48,
  shotgunCrackSound: 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3',
  shotgunCrackVolume: 0.45,
  shotgunShellReloadSound: 'Assets/Sound Effects/Skills/johnwick-shotgun-reload.mp3',
  shotgunShellReloadVolume: 0.45
};
