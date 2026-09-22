// ─────────────────────────────────────────────
// Yuta Okkotsu — Special Grade Sorcerer Boss Config
// ─────────────────────────────────────────────
import { baseBossConfig } from './baseBossConfig.js';
import { yutaConfig } from '../characters/yutaConfig.js';

export const yutaBossConfig = {
  ...baseBossConfig,
  ...yutaConfig,

  // ── Boss Presentation & Metadata ──
  bossTitle: 'The Bush Camper',
  bossSubtitle: 'SPECIAL GRADE SORCERER & CURSED SPIRIT QUEEN',
  themeColor: '#FF1493',
  entranceAuraColor: '#FF1493',
  entranceFlashDuration: 22,

  // ── Base Attributes ──
  hp: 2600,
  maxHp: 2600,
  speed: 5.8,
  moveSpeed: 5.8,
  r: 25,
  radius: 25,
  color: '#EEEEEE',
  damage: 12,
  cooldown: 50,
};
