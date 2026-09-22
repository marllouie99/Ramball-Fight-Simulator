// ─────────────────────────────────────────────
// Mahoraga — Boss Configuration
// ─────────────────────────────────────────────
import { baseBossConfig } from './baseBossConfig.js';
import { mahoragaConfig } from '../characters/mahoragaConfig.js';

export const mahoragaBossConfig = {
  ...baseBossConfig,
  ...mahoragaConfig,

  // ── Boss Presentation & Metadata ──
  bossTitle: 'Divine General',
  bossSubtitle: 'EIGHT-HANDLED SWORD DIVERGENT SILA',
  entranceAuraColor: '#FFD700',

  // ── Boss Overrides ──
  hp: 2800,
  maxHp: 2800,
  speed: 6.5,
  moveSpeed: 6.5,
  r: 30,
  radius: 30,
  color: '#FFD700',
  themeColor: '#FFD700',
  skinColor: '#F5F5DC',
  damage: 22,
  cooldown: 40,
  maxRctHealingPool: Infinity, // Uncapped RCT healing capacity
};
