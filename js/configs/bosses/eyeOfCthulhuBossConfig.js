// ─────────────────────────────────────────────
// Eye of Cthulhu — Ancient Ocular Horror Boss Config
// ─────────────────────────────────────────────
import { baseBossConfig } from './baseBossConfig.js';
import { eyeOfCthulhuConfig } from '../characters/eyeOfCthulhuConfig.js';

export const eyeOfCthulhuBossConfig = {
  ...baseBossConfig,
  ...eyeOfCthulhuConfig,

  // ── Boss Presentation & Metadata ──
  bossTitle: 'Ancient Ocular Horror',
  bossSubtitle: 'YOU FEEL AN EVIL PRESENCE WATCHING YOU...',
  entranceDurationFrames: 110,
  entranceCameraZoom: 1.25,
  entranceRoar: 'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise3.mp3',
  entranceRoarVolume: 1.0,
  entranceRumble: 'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise1.mp3',
  entranceRumbleVolume: 0.95,
  entranceAuraColor: '#E11D48',
  themeColor: '#E11D48',
  enrageAuraColor: '#DC2626',

  // ── Boss Scaling Attributes ──
  hp: 2000,
  defaultHp: 2000,
  sizeMultiplier: 1.25,
  damageMultiplier: 0.00,
  speedMultiplier: 0.00,

  // ── Phase 1 Boss Tuning ──
  servantCountPerSpawn: 4,
  servantMaxActive: 6,
  servantHp: 180,
  servantScale: 1.0, // Companion scale multiplier for Boss mode
  ramSpeed: 18.0,
  ramCount: 3,

  // ── Phase 2 Boss Tuning ──
  phase2Threshold: 0.50,
  phase2Speed: 8.5,
  chainDashMinCount: 4,
  chainDashMaxCount: 6,
  chainDashSpeedBase: 20.0,
  chainDashSpeedMax: 24.0,
};
