// ─────────────────────────────────────────────
// Escanor — Lion's Sin of Pride Boss Config
// ─────────────────────────────────────────────
import { baseBossConfig } from './baseBossConfig.js';
import { escanorConfig } from '../characters/escanorConfig.js';

export const escanorBossConfig = {
  ...baseBossConfig,
  ...escanorConfig,

  // ── Boss Presentation & Metadata ──
  bossTitle: 'Lion Sin of Pride',
  bossSubtitle: 'THE PINNACLE OF ALL RACES — THE ONE',
  themeColor: '#F59E0B',
  entranceAuraColor: '#F59E0B',
  entranceFlashDuration: 24,

  // ── Base Attributes ──
  hp: 2700,
  maxHp: 2700,
  speed: 5.5,
  moveSpeed: 5.5,
  color: '#F59E0B',
  startX: 300,
  startY: 250,
  startVx: 1.1,
  startVy: 0.9,
  damage: 22,
  cooldown: 56,
  ability: 'Cruel Sun (無慈悲な太陽)',
  desc: 'The Lion\'s Sin of Pride. Colossal solar juggernaut wielding the Sacred Treasure Divine Axe Rhitta, signature Cruel Sun (無慈悲な太陽) blazing star, and invincible high noon ultimate "The One".',
};
