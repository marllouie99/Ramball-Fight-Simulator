// ─────────────────────────────────────────────
// TACTICAL FORCE — DESERT EAGLE CONFIG
// .50 Action Express Magnum Sidearm Operative
// ─────────────────────────────────────────────

import { tacticalMainConfig } from './tacticalMainConfig.js';

export const desertEagleConfig = {
  // ── 1. BASE ATTRIBUTES ──
  hp: 460,
  speed: tacticalMainConfig.unifiedMovementSpeed,
  r: 24,
  color: '#f59e0b',              // Tactical Amber
  themeColor: '#f59e0b',
  secondaryColor: '#fbbf24',

  // ── 2. PRIMARY WEAPON: DESERT EAGLE .50 ──
  magazineSize: 7,               // Authentic 7-round .50 AE magazine
  fireCooldown: 80,              // Heavy .50 AE semi-auto hand cannon cadence (24 frames / 0.4s)
  damage: 15,                    // Flat bullet damage
  projectileSpeedMultiplier: 2.4,
  bulletRadius: 4.5,
  bulletLife: 80,
  reloadTime: 35,                // Ultra-fast mag swap (35 frames / 0.58s)
  recoilForce: 2.8,
  recoilDistance: 7.0,
  knockbackForce: 6.0,           // .50 AE Magnum target kinetic pushback on hit
  flashDuration: 4,

  // ── 3. SOUND EFFECTS & VOLUMES ──
  sounds: {
    fire: 'Assets/Sound Effects/Attacks/desert-eagle-fire.mp3',
    reload: 'Assets/Sound Effects/Skills/johnwick-pistol-reload.mp3',
    fleshHit: 'attack_fleshhit',
  },
  soundVolumes: {
    fire: 0.30,
    reload: 0.30,
    fleshHit: 0.90,
  }
};

export const pistolConfig = desertEagleConfig;
