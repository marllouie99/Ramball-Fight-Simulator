// ─────────────────────────────────────────────
// TACTICAL FORCE — SPAS-12 CONFIG
// 12-Gauge Heavy Breacher Shotgun Operative
// ─────────────────────────────────────────────

import { tacticalMainConfig } from './tacticalMainConfig.js';

export const spas12Config = {
  // ── 1. BASE ATTRIBUTES ──
  hp: 580,
  speed: tacticalMainConfig.unifiedMovementSpeed,
  r: 26,
  color: '#10b981',              // Tactical Emerald
  themeColor: '#10b981',
  secondaryColor: '#34d399',

  // ── 2. PRIMARY WEAPON: SPAS-12 SHOTGUN ──
  magazineSize: 8,               // 8 shells in tubular mag
  fireCooldown: 100,              // Deliberate pump-action interval (45 frames / 0.75s)
  pelletCount: 6,                // 6 buckshot pellets per blast
  damagePerPellet: 8,           // 18 damage per pellet (108 total point-blank)
  spreadAngle: (12.5 * Math.PI) / 180, // 12.5° cone spread
  projectileSpeedMultiplier: 2.1,
  bulletRadius: 4.2,
  bulletLife: 60,
  reloadTime: 55,                // Tube reload duration (55 frames)
  recoilForce: 6.0,              // Physical pushback on shooter
  recoilDistance: 12.0,          // Visual gun kickback
  knockbackForce: 6.5,           // Heavy target kinetic pushback per pellet on hit
  screenShakeIntensity: 4.5,     // Screen shake on blast
  screenShakeDuration: 6,
  pumpDuration: 14,              // Pump cycling animation frames
  flashDuration: 5,

  // ── 3. SOUND EFFECTS & VOLUMES ──
  sounds: {
    fire: 'Assets/Sound Effects/Attacks/shootgunshot.mp3',
    pump: 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3',
    reload: 'Assets/Sound Effects/Skills/johnwick-shotgun-reload.mp3',
    fleshHit: 'attack_fleshhit',
  },
  soundVolumes: {
    fire: 0.30,
    pump: 0.30,
    reload: 0.30,
    fleshHit: 0.90,
  }
};

export const shotgunConfig = spas12Config;
