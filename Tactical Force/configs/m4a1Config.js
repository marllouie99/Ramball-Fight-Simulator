// ─────────────────────────────────────────────
// TACTICAL FORCE — M4A1 CONFIG
// 5.56mm Tactical Assault Rifle Operative
// ─────────────────────────────────────────────

import { tacticalMainConfig } from './tacticalMainConfig.js';

export const m4a1Config = {
  // ── 1. BASE ATTRIBUTES ──
  hp: 520,
  speed: tacticalMainConfig.unifiedMovementSpeed,
  r: 25,
  color: '#3b82f6',              // Tactical Blue
  themeColor: '#3b82f6',
  secondaryColor: '#60a5fa',

  // ── 2. PRIMARY WEAPON: M4A1 CARBINE ──
  magazineSize: 30,              // 30 rounds per PMAG (10 bursts)
  burstCount: 3,                 // 3 rounds per burst trigger
  burstInterval: 4,              // 4 frames between each round in burst
  fireCooldown: 24,              // Cooldown between bursts (24 frames / 0.4s)
  damage: 22,                    // Damage per 5.56 round (66 dmg per burst)
  projectileSpeedMultiplier: 2.6,// Supersonic bullet velocity
  bulletRadius: 4.8,             // Projectile collision radius
  bulletLife: 95,
  reloadTime: 45,                // Tactical reload duration (45 frames / 0.75s)
  recoilForce: 3.5,              // Physical pushback on shooter
  recoilDistance: 6.0,           // Visual gun kickback (px)
  knockbackForce: 4.2,           // Target kinetic pushback on hit
  flashDuration: 4,              // Muzzle flash visibility frames

  // ── 3. SOUND EFFECTS & VOLUMES ──
  sounds: {
    fire: 'Assets/Sound Effects/Skills/johnwick-m4-shot.mp3',
    reload: 'Assets/Sound Effects/Skills/johnwick-m4-reload.mp3',
    fleshHit: 'attack_fleshhit',
  },
  soundVolumes: {
    fire: 0.30,
    reload: 0.30,
    fleshHit: 0.90,
  }
};

export const rifleConfig = m4a1Config;
