// ─────────────────────────────────────────────
// TACTICAL FORCE — AWP CONFIG
// .338 Lapua Heavy Bolt-Action Marksman Operative
// ─────────────────────────────────────────────

import { tacticalMainConfig } from './tacticalMainConfig.js';

export const awpConfig = {
  // ── 1. BASE ATTRIBUTES ──
  hp: 440,
  speed: tacticalMainConfig.unifiedMovementSpeed,
  r: 25,
  color: '#ef4444',              // Tactical Red
  themeColor: '#ef4444',
  secondaryColor: '#f87171',

  // ── 2. PRIMARY WEAPON: .338 AWP SNIPER ──
  magazineSize: 5,               // 5-round bolt-action mag
  fireCooldown: 85,              // Heavy manual bolt cycling interval (85 frames / 1.4s)
  boltDuration: 26,              // Manual bolt racking & crack cycle duration after firing
  damage: 105,                   // Lethal AP match round
  projectileSpeedMultiplier: 3.6,// Hyper-velocity round
  bulletRadius: 5.2,
  bulletLife: 120,
  reloadTime: 65,                // Tactical mag swap (65 frames / 1.08s)
  recoilForce: 8.0,              // Heavy physical kickback on shooter
  recoilDistance: 16.0,          // Heavy visual gun kickback
  knockbackForce: 10.0,          // .338 Lapua devastating target kinetic pushback on hit
  screenShakeIntensity: 10.0,    // Global high screen shake
  screenShakeDuration: 8,
  flashDuration: 6,
  laserSightAlpha: 0.45,         // Laser aimline opacity

  // ── 3. SOUND EFFECTS & VOLUMES ──
  sounds: {
    fire: 'Assets/Sound Effects/Attacks/awp-fire.mp3',
    bolt: 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3',
    reload: 'Assets/Sound Effects/Skills/johnwick-m4-reload.mp3',
    fleshHit: 'attack_fleshhit',
  },
  soundVolumes: {
    fire: 0.80,
    bolt: 0.35,
    reload: 0.30,
    fleshHit: 0.90,
  }
};

export const sniperConfig = awpConfig;
