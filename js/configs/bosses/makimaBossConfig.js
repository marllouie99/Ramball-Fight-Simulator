// ─────────────────────────────────────────────
// Makima — Control Devil Boss Config
// ─────────────────────────────────────────────
import { baseBossConfig } from './baseBossConfig.js';
import { makimaConfig } from '../characters/makimaConfig.js';

export const makimaBossConfig = {
  ...baseBossConfig,
  ...makimaConfig,

  // ── Boss Presentation & Metadata ──
  bossTitle: 'Control Devil',
  bossSubtitle: 'PUBLIC SAFETY SPECIAL DIVISION 4 LEADER',
  themeColor: '#EF4444',
  entranceAuraColor: '#EF4444',
  entranceFlashDuration: 22,

  // ── Base Attributes ──
  hp: 2600,
  maxHp: 2600,
  speed: 5.6,
  moveSpeed: 5.6,
  r: 25,
  radius: 25,
  color: '#C2410C',
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 0.9,
  damage: 20,
  cooldown: 52,
  ability: 'Bang & Domination Chains',
  desc: 'The Control Devil. Bends opponents to her absolute will with invisible Bang force impacts, crushing Domination Chains, and divine life contracts.',
};
