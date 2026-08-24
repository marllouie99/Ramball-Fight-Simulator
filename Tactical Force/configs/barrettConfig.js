// ─────────────────────────────────────────────
// TACTICAL FORCE — BARRETT M82 CONFIG
// .50 BMG Semi-Automatic Anti-Materiel Sniper Operative
// ─────────────────────────────────────────────

import { tacticalMainConfig } from './tacticalMainConfig.js';

export const barrettConfig = {
  // ── 1. BASE ATTRIBUTES ──
  hp: 460,
  speed: tacticalMainConfig.unifiedMovementSpeed,
  r: 25,
  color: '#06b6d4',              // Tactical Cyan / Phantom
  themeColor: '#06b6d4',
  secondaryColor: '#22d3ee',

  // ── 2. PRIMARY WEAPON: BARRETT M82 .50 BMG ──
  magazineSize: 10,              // 10-round angled steel box magazine
  fireCooldown: 100,             // Heavy .50 BMG semi-auto cadence (~1.03s)
  boltDuration: 28,              // Heavy bolt cycle & crack animation duration after firing
  damage: 200,                   // Anti-materiel kinetic round
  projectileSpeedMultiplier: 3.8,// Supersonic heavy round
  bulletRadius: 5.6,
  bulletLife: 130,
  reloadTime: 75,                // Heavy box mag swap & bolt catch (~1.25s)
  recoilForce: 9.0,              // Massive physical kickback
  recoilDistance: 18.0,          // Heavy visual barrel & frame kickback
  knockbackForce: 12.5,          // .50 BMG Anti-materiel target kinetic pushback on hit
  screenShakeIntensity: 11.0,    // High-impact shockwave screen shake
  screenShakeDuration: 9,
  flashDuration: 6,
  laserSightAlpha: 0.50,         // High-clarity cyan precision targeting line

  // ── 3. SOUND EFFECTS & VOLUMES ──
  sounds: {
    fire: 'Assets/Sound Effects/Attacks/awp-fire.mp3',
    bolt: 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3',
    reload: 'Assets/Sound Effects/Skills/johnwick-m4-reload.mp3',
    fleshHit: 'attack_fleshhit',
  },
  soundVolumes: {
    fire: 0.85,
    bolt: 0.40,
    reload: 0.35,
    fleshHit: 0.90,
  }
};
