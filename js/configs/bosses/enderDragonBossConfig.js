// ─────────────────────────────────────────────
// Ender Dragon — Ruler of The End Boss Config
// ─────────────────────────────────────────────
import { baseBossConfig } from './baseBossConfig.js';
import { enderDragonConfig } from '../characters/enderDragonConfig.js';

export const enderDragonBossConfig = {
  ...baseBossConfig,
  ...enderDragonConfig,

  // ── Boss Presentation & Metadata ──
  bossTitle: 'Ruler of The End',
  bossSubtitle: 'THE END IS NEAR — BEAST OF THE VOID',
  entranceDurationFrames: 110,
  entranceCameraZoom: 1.25,
  entranceRoar: 'Assets/Sound Effects/Skills/ragescream.mp3',
  entranceRoarVolume: 1.0,
  entranceRumble: 'Assets/Sound Effects/Skills/woosh.mp3',
  entranceRumbleVolume: 0.90,
  entranceAuraColor: '#C026D3',
  themeColor: '#C026D3',
  enrageAuraColor: '#A855F7',

  // ── Boss Scaling Attributes ──
  hp: 1200,
  defaultHp: 1200,
  sizeMultiplier: 1.35,
  damageMultiplier: 0.00,
  speedMultiplier: 0.00,

  // ── Boss Mode Skill Tuning ──
  fireballCooldown: 360, // 6.0s
  fireballSpeed: 10.5,
  fireballDamage: 36,
  acidPoolDurationFrames: 240, // 4.0s
  acidDamagePerTick: 8,

  swoopCooldown: 420, // 7.0s
  swoopSpeed: 21.0,
  swoopDamage: 48,
  swoopKnockback: 24.0,

  cataclysmCooldown: 900, // 15.0s
  cataclysmShockwaveRadius: 260,
  cataclysmShockwaveDamage: 80,
  cataclysmSecondaryFireballs: 8,
};
