// ─────────────────────────────────────────────
// Yuta Okkotsu — Special Grade Sorcerer Boss Config
// ─────────────────────────────────────────────
import { baseBossConfig } from './baseBossConfig.js';
import { yutaConfig } from '../characters/yutaConfig.js';

export const yutaBossConfig = {
  ...baseBossConfig,
  ...yutaConfig,

  // ── Boss Presentation & Metadata ──
  bossTitle: 'Special Grade Bush Camper',
  bossSubtitle: 'THE BUSH CAMPER, SPECIAL GRADE SORCERER',
  themeColor: '#FF1493',
  entranceAuraColor: '#FF1493',
  entranceFlashDuration: 22,
  entranceDurationFrames: 265,      // 70f emerge delay + 177f voiceline + 18f buffer = full voiceline playback before fight begins
  entranceCameraZoom: 1.45,
  entranceVoiceline: 'Assets/Sound Effects/Boss Voiceline SFX/yuta-boss-entrance-voiceline.mp3',
  entranceVoicelineDelay: 70,
  entranceVoicelineVolume: 1.0,

  // ── Bush Camper Special Passive Interactions (Active while in bush, cleared on exit) ──
  bushStealthAlpha: 0.40,           // 40% opacity while in foliage
  bushEvadeChance: 0.75,            // 75% evasion chance against incoming attacks
  bushSpeedMultiplier: 0.65,        // Dense foliage slows movement speed down to 65% in foliage
  bushUndetected: true,             // Challengers cannot target/aim at Boss Yuta while hiding in bush

  // ── Base Boss Attributes & Scaling ──
  hp: 1000,
  maxHp: 1000,
  speed: 5.8,
  moveSpeed: 5.8,
  color: '#EEEEEE',
  damage: 12,
  cooldown: 50,

  // ── Backwards-Compatible Flat Audio Aliases ──
  entranceVoiceline: 'Assets/Sound Effects/Boss Voiceline SFX/yuta-boss-entrance-voiceline.mp3',
  entranceVoicelineDelay: 70,
  entranceVoicelineVolume: 1.0,

  // ─────────────────────────────────────────────
  // Audio configuration, volume, chance & timing delay adjustments (matching Nanami format)
  // ─────────────────────────────────────────────
  sounds: {
    // Cinematic Boss Entrance SFX & Voicelines
    entranceVoiceline: 'Assets/Sound Effects/Boss Voiceline SFX/yuta-boss-entrance-voiceline.mp3',
    entranceRustle: 'Assets/Sound Effects/Sprites SFX/walk-on-grass.mp3',
    entranceLeap: 'Assets/Sound Effects/Attacks/swordswing.mp3',
    entranceLand: 'Assets/Sound Effects/Skills/dash3.mp3',

    // Combat & Katana Basic Attacks
    katanaSwing: 'Assets/Sound Effects/Attacks/swordswing.mp3',

    // Companion Summon: Rika Orimoto
    comeRika: 'Assets/Sound Effects/Skills/comerika.mp3',
    rikaAppearance: 'Assets/Sound Effects/Skills/rikaAppearance1.mp3',
    rikaAttack: 'Assets/Sound Effects/Skills/backstab.mp3',
    rikaGroundSmash: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
    rikaGroundTremble: 'Assets/Sound Effects/SkillEffects/groundTremble.mp3',
    rikaDeath: 'Assets/Sound Effects/Skills/thin-ice-breaker.mp3',
    rikaNoises: [
      'Assets/Sound Effects/Attacks/rikanoise1.mp3',
      'Assets/Sound Effects/Attacks/rikanoise2.mp3',
      'Assets/Sound Effects/Attacks/rikanoise3.mp3'
    ],

    // Copied Techniques & Counters
    thinIceBreaker: 'Assets/Sound Effects/Skills/thin-ice-breaker.mp3',
    thinIceBreakerNoise: 'Assets/Sound Effects/Skills/yuta-thin-ice-breaker-noise.mp3',
    phantomFlurryNoise: 'Assets/Sound Effects/Skills/yuta-flurry-noise.mp3',

    // Ultimate Skills: Domain Expansion & Pure Love Beam
    domainChannel: 'Assets/Sound Effects/Skills/yutadomainexpansion.mp3',
    domainDeploy: 'Assets/Sound Effects/Skills/gojodomainexpansion.mp3',
    pureLoveBeamCharge: 'Assets/Sound Effects/Skills/rikaAppearance.mp3',
    pureLoveBeamFire: 'Assets/Sound Effects/Skills/yuta-lovebeam-fires.mp3',
    pureLoveBeamBackground: 'Assets/Sound Effects/Skills/yuta-lovebeam-background.mp3'
  },

  soundVolumes: {
    // Entrance Audio Volumes
    entranceVoiceline: 1.0,
    entranceRustle: 0.60,
    entranceLeap: 0.95,
    entranceLand: 0.70,

    // Combat & Rika Volumes
    katanaSwing: 0.70,
    comeRika: 2.0,
    rikaAppearance: 2.5,
    rikaAttack: 0.80,
    rikaGroundSmash: 1.50,
    rikaGroundTremble: 1.80,
    rikaDeath: 0.0,
    rikaNoise: 0.80,

    // Technique & Domain Volumes
    thinIceBreaker: 1.50,
    thinIceBreakerNoise: 0.0,
    phantomFlurryNoise: 2.0,
    domainChannel: 3.5,
    domainDeploy: 3.5,
    pureLoveBeamCharge: 3.0,
    pureLoveBeamFire: 3.5,
    pureLoveBeamBackground: 2.0
  },

  soundChances: {
    rikaAppearance: 0.95,
    rikaNoise: 0.35,
    thinIceBreakerNoise: 0.35,
    phantomFlurryNoise: 0.35
  },

  soundDelays: {
    entranceVoiceline: 70,      // Voiceline starts at frame 70 as Yuta emerges from bush
    entranceRustle: 12,
    entranceLeap: 65,
    entranceLand: 90,
    katanaSwing: 0,
    comeRika: 0,
    rikaAppearance: 0,
    rikaAttack: 0,
    rikaGroundSmash: 0,
    rikaGroundTremble: 0,
    thinIceBreaker: 0,
    domainChannel: 0,
    domainDeploy: 0
  },

  soundOffsets: {
    pureLoveBeamCharge: 0.0,
    pureLoveBeamFire: 0.15
  }
};
