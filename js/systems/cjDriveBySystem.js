// ─────────────────────────────────────────────
// CJ's Skill 3: GROVESTREET4LIFE — Gang Drive-By System
// Manages Greenwood sedan physics, homie aiming & Tec-9 bullet barrages,
// tire drift skid marks, smoke particles, and burning burnout oil slow zone.
// Rule 1, Rule 6, Rule 11 & Rule 12 Compliant
// ─────────────────────────────────────────────

import { state, spawnFloatingText, triggerGlobalScreenShake } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { audioSystem } from './audioSystem.js';
import { stopSound, stopSoundBySrc } from './soundSystem.js';
import { projectileSystem } from './projectileSystem.js';
import { spawnSparks, spawnImpactFlash } from '../graphics/particles/sparkEffect.js';
import { spawnBamEffect, updateBamEffects, clearBamEffects } from '../graphics/particles/bamImpactEffect.js';
import { clearFloatingJetpacks } from '../graphics/particles/cjFloatingJetpack.js';
import { clearDroppedMiniguns } from '../graphics/particles/cjDroppedMinigun.js';
import {
  spawnCarExplosion,
  updateCarExplosions,
  drawCarExplosions,
  drawCarScorchMarks,
  clearCarExplosions
} from '../graphics/particles/cjCarExplosion.js';
import { drawMinionHealthBar } from '../graphics/statusEffects.js';
import {
  drawGroveStreetCar,
  drawCarHeadlights,
  drawCarSkidMarks,
  drawBurnoutOilPuddle,
  drawTireSmokeParticles
} from '../graphics/vehicles/groveStreetCarGraphics.js';
import { spawnSpentCasing } from '../graphics/particles/johnWickDroppedMagazine.js';

// Track previously played audio to guarantee zero back-to-back repetitions
let _lastGlobalRoamNoise = null;
let _lastGlobalArrivalVoiceline = null;

// Pre-allocate global state arrays
if (typeof state !== 'undefined') {
  if (!state.cjDriveBys) state.cjDriveBys = [];
  if (!state.cjBurnoutPuddles) state.cjBurnoutPuddles = [];
  if (!state.cjSkidTracks) state.cjSkidTracks = [];
  if (!state.cjTireSmoke) state.cjTireSmoke = [];
}

/**
 * Calculates the shortest modular angular difference (-PI to +PI)
 * to completely eliminate 360-degree wrapping spin and jitter.
 */
function shortestAngleDiff(target, current) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * Picks a random target position freely across and outside the arena boundaries
 */
function pickRandomArenaTarget(arena, currentX, currentY) {
  // Allow waypoints to extend well beyond the arena edges (-120px to +120px) so the car clips in and out freely
  const minX = arena.x - 120;
  const maxX = arena.x + arena.width + 120;
  const minY = arena.y - 100;
  const maxY = arena.y + arena.height + 100;

  let rx = minX + Math.random() * (maxX - minX);
  let ry = minY + Math.random() * (maxY - minY);

  // Pick distant points to create long, dramatic sweeping cross-arena drives
  for (let i = 0; i < 6; i++) {
    const dist = Math.hypot(rx - currentX, ry - currentY);
    if (dist > 180) break;
    rx = minX + Math.random() * (maxX - minX);
    ry = minY + Math.random() * (maxY - minY);
  }

  return { x: rx, y: ry, timer: 0 };
}

/**
 * Helper to initialize or re-initialize a drive-by roaming pass
 */
function initCarPass(car, fromLeft, passNum) {
  const arena = (CONFIG && CONFIG.arena) ? CONFIG.arena : { x: 40, y: 240, width: 450, height: 450 };
  const cfg = CONFIG.cj || {};

  const arenaCenterX = arena.x + arena.width * 0.5;
  const arenaCenterY = arena.y + arena.height * 0.5;

  let target = car.target;
  const targetY = target ? target.y : arenaCenterY;

  // Spawn position outside arena
  const spawnX = fromLeft ? (arena.x - 180) : (arena.x + arena.width + 180);
  const spawnY = Math.max(arena.y + 60, Math.min(arena.y + arena.height - 60, targetY + (fromLeft ? 60 : -60)));

  // Initial aim point into the arena
  const entryAimX = arenaCenterX + (Math.random() - 0.5) * 160;
  const entryAimY = arenaCenterY + (Math.random() - 0.5) * 160;

  const initialAngle = Math.atan2(entryAimY - spawnY, entryAimX - spawnX);
  const cruiseSpeed = 6.6;

  car.fromLeft = fromLeft;
  car.currentPass = passNum;
  car.x = spawnX;
  car.y = spawnY;
  car.vx = Math.cos(initialAngle) * cruiseSpeed;
  car.vy = Math.sin(initialAngle) * cruiseSpeed;
  car.angle = initialAngle;
  car.speed = cruiseSpeed;
  car.phase = 'ENTERING'; // 'ENTERING' | 'ROAMING' | 'EXITING' | 'WAITING_REENTER'
  car.timer = 0;
  car.stayTimer = 0;
  car.stayDuration = cfg.driveByStayDuration || 240; // Exact roaming duration in arena
  car.exitAngle = null;
  car.entryAimX = entryAimX;
  car.entryAimY = entryAimY;
  car.roamTarget = null;
  car.bulletsLeft = cfg.driveByBulletCount || 16;
  car.bulletDamage = cfg.driveByBulletDamage || 8;
  car.bulletSpeed = cfg.driveByBulletSpeed || 28.0;
  car.fireInterval = cfg.driveByBurstInterval || 22;
  car.fireCooldown = car.fireInterval;
  car.hasDroppedOil = false;
  car.homieVoiceCooldown = 60; // ~1s delay after car arrives before 1st homie noise

  // Fresh skid mark tracks for this pass
  car.skidLeftTrack = { points: [], alpha: 1.0, width: 6.2 };
  car.skidRightTrack = { points: [], alpha: 1.0, width: 6.2 };
  if (state.cjSkidTracks) {
    state.cjSkidTracks.push(car.skidLeftTrack);
    state.cjSkidTracks.push(car.skidRightTrack);
  }
}

/**
 * Spawns a Grove Street Greenwood Sedan drive-by in the arena
 * @param {Object} cjFighter The CJ fighter instance casting Skill 3
 */
export function spawnGroveStreetDriveBy(cjFighter) {
  if (!cjFighter || typeof state === 'undefined') return;
  if (!state.cjDriveBys) state.cjDriveBys = [];
  if (!state.cjBurnoutPuddles) state.cjBurnoutPuddles = [];
  if (!state.cjSkidTracks) state.cjSkidTracks = [];
  if (!state.cjTireSmoke) state.cjTireSmoke = [];

  const cfg = CONFIG.cj || {};
  const arena = (CONFIG && CONFIG.arena) ? CONFIG.arena : { x: 40, y: 240, width: 450, height: 450 };

  // Rule 6: Find primary target opponent
  let target = null;
  let minDist = Infinity;
  const myIndex = state.fighters ? state.fighters.indexOf(cjFighter) : 0;
  const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIndex) : null;

  const allCandidates = [
    ...(state.fighters || []),
    ...(state.illusions || [])
  ];

  for (const ent of allCandidates) {
    if (!ent || ent === cjFighter || ent.dead || ent.hp <= 0 || (ent.invincibilityTimer || 0) > 0 || ent.owner === cjFighter) continue;

    if (typeof state.getFighterTeam === 'function') {
      if (ent.owner) {
        const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
        if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
      } else {
        const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
        if (myTeam !== null && entTeam !== null && myTeam === entTeam) continue;
      }
    }

    const d = Math.hypot(ent.x - cjFighter.x, ent.y - cjFighter.y);
    if (d < minDist) {
      minDist = d;
      target = ent;
    }
  }

  const targetX = target ? target.x : (arena.x + arena.width * 0.5);
  const fromLeft = targetX > (arena.x + arena.width * 0.5);
  const maxCarHp = cfg.driveByCarHp || 280;

  const car = {
    owner: cjFighter,
    target: target,
    type: 'minion',
    entityType: 'minion',
    isMinion: true,
    isCarMinion: true,
    name: 'Greenwood Sedan',
    r: 38,
    hitRadius: 44,
    hp: maxCarHp,
    maxHp: maxCarHp,
    hitFlashTimer: 0,
    damageReceived: 0,
    length: 152,
    width: 72,
    wheelRotation: 0,
    passesRemaining: cfg.driveByPasses || 2, // Repeated sweeps
    currentPass: 1,
    reenterTimer: 0,
    currentHomie: 0,
    homie1Aim: 0,
    homie1Recoil: 0,
    homie1Flash: 0,
    homie2Aim: 0,
    homie2Recoil: 0,
    homie2Flash: 0,
    dead: false,

    // Status effect timers & movement freeze flags
    timeStopTimer: 0,
    hitStunTimer: 0,
    electricStunTimer: 0,
    isFrozenByInfinity: false,
    frozenByCronos: false,
    isTargetOfAmbush: false,
    caughtInSaitamaFlurry: false,
    caughtInPureLoveBeam: false,
    wasCaughtInPureLoveBeam: false,
    pureLoveBeamTimer: 0,
    pureLoveBeamRecoveryTimer: 0,
    isCaughtInPurple: false,
    purpleHitTimer: 0,
    slowMultiplier: 1.0,
    slowTimer: 0,
    vx: 0,
    vy: 0,
    knockbackVx: 0,
    knockbackVy: 0,

    applyTimeStop(duration, opts = {}) {
      duration = Number(duration) || 0;
      this.timeStopTimer = Math.max(this.timeStopTimer || 0, duration);
    },

    applyHitStun(duration) {
      duration = Number(duration) || 0;
      this.hitStunTimer = Math.max(this.hitStunTimer || 0, duration);
    },

    applyElectricStun(duration) {
      duration = Number(duration) || 0;
      this.electricStunTimer = Math.max(this.electricStunTimer || 0, duration);
    },

    applyKnockback(kx, ky) {
      this.x += Number(kx) || 0;
      this.y += Number(ky) || 0;
      this.knockbackVx = Number(kx) || 0;
      this.knockbackVy = Number(ky) || 0;
    },

    applySlow(multiplier, duration) {
      this.slowMultiplier = Number(multiplier) || 0.5;
      this.slowTimer = Number(duration) || 60;
    },

    interruptAttacks() {
      this.homie1Flash = 0;
      this.homie2Flash = 0;
    },

    takeDamage(amount, attacker, opts = {}) {
      if (this.dead || this.hp <= 0) return false;

      amount = Number(amount) || 0;
      if (amount <= 0) return false;

      const prevHp = this.hp;
      this.hp = Math.max(0, this.hp - amount);
      this.hitFlashTimer = 8;
      this.damageReceived = (this.damageReceived || 0) + amount;

      // Audio & Sparks
      audioSystem.playSFX('attack_fleshhit', 0.65);
      if (typeof spawnSparks === 'function') {
        spawnSparks(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, '#F59E0B', 4);
      }

      // Floating damage text above car
      const floatY = this.y - (this.width * 0.5 + 24);
      spawnFloatingText(this.x + (Math.random() - 0.5) * 16, floatY, `-${Math.round(amount)}`, '#EF4444');

      // If destroyed: trigger vehicle explosion
      if (this.hp <= 0 && prevHp > 0) {
        this.explode();
      }
      return true;
    },

    explode() {
      if (this.dead) return;
      this.dead = true;
      this.hp = 0;

      // Stop engine roam noise immediately
      stopSoundBySrc('cj-carroam-noise');
      if (this.roamSoundHandle) {
        stopSound(this.roamSoundHandle);
        this.roamSoundHandle = null;
      }

      // Spawn grand vehicle detonation explosion with multi-layered fireball,
      // flying burning scrap metal debris, smoke plumes, scorch crater, and AOE blast damage
      spawnCarExplosion(this.x, this.y, this.angle, this.owner);

      // Wreckage floating text
      spawnFloatingText(this.x, this.y - 25, 'CAR DESTROYED!', '#EF4444');

      // Cancel active drive-by state on owner
      if (this.owner) {
        this.owner.isDriveByActive = false;
      }
    }
  };

  initCarPass(car, fromLeft, 1);
  car.totalRoamNoisesPlayed = 0; // Strictly capped at 2 noises total per driveByCooldown invocation

  state.cjDriveBys.push(car);
  cjFighter.isDriveByActive = true;

  // Homies arrival voiceline pool when the car arrives (never repeat previous arrival voiceline)
  const arrivalSounds = CONFIG.cj?.sounds?.homiesArrivalVoicelines || (
    CONFIG.cj?.sounds?.homiesArrivalVoiceline
      ? [CONFIG.cj.sounds.homiesArrivalVoiceline]
      : [
          'Assets/Sound Effects/Skills/cj-homiesarrival-voiceline.mp3',
          'Assets/Sound Effects/Skills/cj-homiearrival-voiceline2.mp3',
          'Assets/Sound Effects/Skills/cj-homiearrival-voiceline3.mp3',
          'Assets/Sound Effects/Skills/cj-homiearrival-voiceline4.mp3'
        ]
  );
  let arrivalSound;
  if (Array.isArray(arrivalSounds) && arrivalSounds.length > 0) {
    const candidates = (arrivalSounds.length > 1 && _lastGlobalArrivalVoiceline)
      ? arrivalSounds.filter(s => s !== _lastGlobalArrivalVoiceline)
      : arrivalSounds;
    arrivalSound = candidates[Math.floor(Math.random() * candidates.length)];
    _lastGlobalArrivalVoiceline = arrivalSound;
  } else {
    arrivalSound = arrivalSounds;
  }
  const arrivalVol = CONFIG.cj?.soundVolumes?.homiesArrivalVoiceline ?? 3.0;
  audioSystem.playSFX(arrivalSound, arrivalVol);

  // Car roaming engine noise
  const roamSound = CONFIG.cj?.sounds?.carRoamNoise || 'Assets/Sound Effects/Skills/cj-carroam-noise.mp3';
  const roamVol = CONFIG.cj?.soundVolumes?.carRoamNoise !== undefined ? CONFIG.cj.soundVolumes.carRoamNoise : 1.5;
  car.roamSoundHandle = audioSystem.playSFX(roamSound, roamVol);

  // Global screen shake on entrance
  if (typeof triggerGlobalScreenShake === 'function') {
    triggerGlobalScreenShake(4, 5);
  }
}

/**
 * Updates all active Greenwood drive-by vehicles, shooting logic, skid trails,
 * tire smoke particles, and burnout oil slow debuffs.
 */
export function updateDriveBys() {
  if (typeof state === 'undefined') return;

  const cfg = CONFIG.cj || {};
  const arena = (CONFIG && CONFIG.arena) ? CONFIG.arena : { x: 40, y: 240, width: 450, height: 450 };
  const arenaCenterX = arena.x + arena.width * 0.5;
  const arenaCenterY = arena.y + arena.height * 0.5;

  // Update BAM! Comic Impact Visual Effects
  updateBamEffects();

  // Update Vehicle Detonation Explosions, Fireballs, Smoke & Shrapnel
  updateCarExplosions();

  // ── 1. UPDATE ACTIVE DRIVE-BY CARS ──
  if (state.cjDriveBys && state.cjDriveBys.length > 0) {
    for (let i = state.cjDriveBys.length - 1; i >= 0; i--) {
      const car = state.cjDriveBys[i];
      if (!car || car.dead) {
        state.cjDriveBys.splice(i, 1);
        continue;
      }

      // Handle off-screen pause before next repeated pass
      if (car.phase === 'WAITING_REENTER') {
        car.reenterTimer--;
        if (car.reenterTimer <= 0) {
          const nextFromLeft = !car.fromLeft; // Alternate side entrance
          initCarPass(car, nextFromLeft, car.currentPass + 1);
          audioSystem.playSFX('Assets/Sound Effects/Skills/dash2.mp3', 0.95);
          if (typeof triggerGlobalScreenShake === 'function') {
            triggerGlobalScreenShake(3, 4);
          }
        }
        continue; // Invisible off-screen during wait
      }

      // ── Decrement Status Effect Timers & Dynamic Stasis Auto-Recovery (Rule 1 & Rule 9) ──
      if (car.timeStopTimer && car.timeStopTimer > 0) car.timeStopTimer--;
      if (car.electricStunTimer && car.electricStunTimer > 0) car.electricStunTimer--;
      if (car.hitStunTimer && car.hitStunTimer > 0) car.hitStunTimer--;
      if (car.slowTimer && car.slowTimer > 0) car.slowTimer--;
      if (car.purpleHitTimer && car.purpleHitTimer > 0) {
        car.purpleHitTimer--;
        if (car.purpleHitTimer <= 0) car.isCaughtInPurple = false;
      }
      if (car.pureLoveBeamTimer && car.pureLoveBeamTimer > 0) {
        car.pureLoveBeamTimer--;
        if (car.pureLoveBeamTimer <= 0) car.caughtInPureLoveBeam = false;
      }
      if (car.pureLoveBeamRecoveryTimer && car.pureLoveBeamRecoveryTimer > 0) {
        car.pureLoveBeamRecoveryTimer--;
      }

      // Auto-recovery cleanup: verify if external lock attacks are still active in the arena
      if (car.caughtInSaitamaFlurry) {
        const hasActiveFlurry = state.fighters && state.fighters.some(f => f && f.isFlurrying && f.flurryHitsLeft > 0);
        if (!hasActiveFlurry) {
          car.caughtInSaitamaFlurry = false;
        }
      }

      if (car.isTargetOfAmbush) {
        const hasActiveAmbush = state.fighters && state.fighters.some(f => f && (f._counterPunchTimer > 0 || f.isAmbushing));
        if (!hasActiveAmbush) {
          car.isTargetOfAmbush = false;
        }
      }

      if (car.caughtInPureLoveBeam || (car.pureLoveBeamTimer && car.pureLoveBeamTimer > 0)) {
        const isBeamFiring = state.fighters && state.fighters.some(f => f && (f.isFiringPureLoveBeam || f.isChannelingPureLoveBeam));
        if (!isBeamFiring && (!car.pureLoveBeamTimer || car.pureLoveBeamTimer <= 0)) {
          car.caughtInPureLoveBeam = false;
        }
      }

      if (car.isCaughtInPurple || (car.purpleHitTimer && car.purpleHitTimer > 0)) {
        const hasPurple = typeof projectileSystem !== 'undefined' && projectileSystem.projectiles && projectileSystem.projectiles.some(p => p && p.isGojoPurple);
        if (!hasPurple && (!car.purpleHitTimer || car.purpleHitTimer <= 0)) {
          car.isCaughtInPurple = false;
        }
      }

      if (car.isFrozenByInfinity) {
        if (car.timeStopTimer > 0) car.timeStopTimer--;
        const hasActiveInfinity = state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && (f.infinityCooldown <= 0 || f.domainActive) && !f.isMeleeMode);
        if (!hasActiveInfinity && (!car.timeStopTimer || car.timeStopTimer <= 0)) {
          car.isFrozenByInfinity = false;
        }
      }

      if (car.frozenByCronos) {
        const hasActiveCronos = state.fighters && state.fighters.some(f => f && f.sphereActive && f.sphereTimer > 0);
        if (!hasActiveCronos) {
          car.frozenByCronos = false;
        }
      }

      // Gojo Unlimited Void Domain Expansion stasis check
      const isGojoDomainActive = state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.domainActive && f.hp > 0);
      if (isGojoDomainActive) {
        car.timeStopTimer = Math.max(car.timeStopTimer || 0, 15);
        car.speed = 0;
        car.targetSpeed = 0;
        car.vx = 0;
        car.vy = 0;
      }

      // Check if vehicle is currently frozen / paused / dragged by external beam or gravity
      const isFrozen = Boolean(
        (car.timeStopTimer && car.timeStopTimer > 0) ||
        (car.electricStunTimer && car.electricStunTimer > 0) ||
        (car.hitStunTimer && car.hitStunTimer > 0) ||
        car.isFrozenByInfinity ||
        car.frozenByCronos ||
        car.isTargetOfAmbush ||
        car.caughtInSaitamaFlurry ||
        car.isCaughtInPurple ||
        (car.purpleHitTimer && car.purpleHitTimer > 0) ||
        car.caughtInPureLoveBeam ||
        (car.pureLoveBeamTimer && car.pureLoveBeamTimer > 0)
      );

      // Process residual knockback decay on car position
      if (car.knockbackVx || car.knockbackVy) {
        car.x += car.knockbackVx;
        car.y += car.knockbackVy;
        car.knockbackVx *= 0.85;
        car.knockbackVy *= 0.85;
        if (Math.abs(car.knockbackVx) < 0.1) car.knockbackVx = 0;
        if (Math.abs(car.knockbackVy) < 0.1) car.knockbackVy = 0;
      }

      if (isFrozen) {
        // Vehicle is temporarily frozen in place / controlled by external beam or vortex: halt engine steering and firing
        car.homie1Flash = 0;
        car.homie2Flash = 0;
        continue;
      }

      car.timer++;
      car.wheelRotation += car.speed * 0.15;

      // Homie recoil & flash decay
      if (car.homie1Recoil > 0) car.homie1Recoil = Math.max(0, car.homie1Recoil - 0.7);
      if (car.homie2Recoil > 0) car.homie2Recoil = Math.max(0, car.homie2Recoil - 0.7);
      if (car.homie1Flash > 0) car.homie1Flash--;
      if (car.homie2Flash > 0) car.homie2Flash--;

      // Homie Roaming Voiceline Noises (STRICTLY ONLY 2 NOISES PER DRIVEBY COOLDOWN, NEVER REPEAT PREVIOUS)
      if ((car.phase === 'ROAMING' || car.phase === 'STAYING') && (car.totalRoamNoisesPlayed || 0) < 2) {
        car.homieVoiceCooldown = (car.homieVoiceCooldown || 0) - 1;
        if (car.homieVoiceCooldown <= 0) {
          const noises = CONFIG.cj?.sounds?.homieRoamNoises || [
            'Assets/Sound Effects/Skills/cj-homies-noise1.mp3',
            'Assets/Sound Effects/Skills/cj-homies-noise2.mp3',
            'Assets/Sound Effects/Skills/cj-homie-noise3.mp3',
            'Assets/Sound Effects/Skills/cj-homie-noise4.mp3',
            'Assets/Sound Effects/Skills/cj-homie-noise5.mp3'
          ];
          if (Array.isArray(noises) && noises.length > 0) {
            // Strictly exclude the previously played noise so it NEVER repeats back-to-back
            const previousNoise = _lastGlobalRoamNoise || car._lastHomieNoise;
            const candidates = (noises.length > 1 && previousNoise)
              ? noises.filter(n => n !== previousNoise)
              : noises;
            const selectedNoise = candidates[Math.floor(Math.random() * candidates.length)];
            _lastGlobalRoamNoise = selectedNoise;
            car._lastHomieNoise = selectedNoise;
            car.totalRoamNoisesPlayed = (car.totalRoamNoisesPlayed || 0) + 1;

            const noiseVol = CONFIG.cj?.soundVolumes?.homieRoamNoises ?? 3.0;
            audioSystem.playSFX(selectedNoise, noiseVol);

            // Space the 2nd noise by ~2.7s (160 frames) so it won't play immediately after the 1st
            car.homieVoiceCooldown = 160;
          }
        }
      }

      // Rule 6: Dynamically refresh active enemy target
      let activeTarget = car.target;
      const myTeam = (typeof state.getFighterTeam === 'function' && car.owner)
        ? state.getFighterTeam(state.fighters.indexOf(car.owner))
        : null;

      if (!activeTarget || activeTarget.dead || activeTarget.hp <= 0) {
        let minDist = Infinity;
        const allCandidates = [
          ...(state.fighters || []),
          ...(state.illusions || [])
        ];

        for (const ent of allCandidates) {
          if (!ent || ent === car.owner || ent.dead || ent.hp <= 0 || (ent.invincibilityTimer || 0) > 0 || ent.owner === car.owner) continue;

          if (typeof state.getFighterTeam === 'function') {
            if (ent.owner) {
              const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
              if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
            } else {
              const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
              if (myTeam !== null && entTeam !== null && myTeam === entTeam) continue;
            }
          }

          const d = Math.hypot(ent.x - car.x, ent.y - car.y);
          if (d < minDist) {
            minDist = d;
            activeTarget = ent;
          }
        }
        car.target = activeTarget;
      }

      // Calculate Homie aim angles towards the target with clean angular difference
      if (activeTarget && !activeTarget.dead) {
        const dx = activeTarget.x - car.x;
        const dy = activeTarget.y - car.y;
        const worldAim = Math.atan2(dy, dx);
        const relAim = shortestAngleDiff(worldAim, car.angle);

        car.homie1Aim = relAim;
        car.homie2Aim = relAim;
      } else {
        car.homie1Aim = 0;
        car.homie2Aim = 0;
      }

      // ── DRIVE-BY MOVEMENT & DRIFT STATE MACHINE ──
      const currentSpeed = (car.speed !== undefined) ? car.speed : 6.6;
      const isMoving = currentSpeed > 0.5 && !isFrozen;

      if (car.phase === 'ENTERING') {
        // High-speed arrival toward the arena roaming zone
        const distToCenter = Math.hypot(arenaCenterX - car.x, arenaCenterY - car.y);
        const toAimAngle = Math.atan2(car.entryAimY - car.y, car.entryAimX - car.x);
        const angleDiff = shortestAngleDiff(toAimAngle, car.angle);

        if (isMoving) {
          const steerFactor = Math.min(1.0, currentSpeed / 4.0);
          car.angle += Math.max(-0.06, Math.min(0.06, angleDiff * 0.12)) * steerFactor;
        }

        car.vx = Math.cos(car.angle) * car.speed;
        car.vy = Math.sin(car.angle) * car.speed;
        car.x += car.vx;
        car.y += car.vy;

        // Transition into dynamic arena roaming once inside
        if (distToCenter < 165 || car.timer > 30) {
          car.phase = 'ROAMING';
          car.stayTimer = 0;
          car.roamTarget = pickRandomArenaTarget(arena, car.x, car.y);
          audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.90);
        }
      } else if (car.phase === 'ROAMING' || car.phase === 'CRUISING') {
        // Roam completely freely and randomly across/through the arena for driveByStayDuration
        car.stayTimer++;

        // Recurring car engine roam sound
        if (car.stayTimer % 75 === 1) {
          const roamSound = CONFIG.cj?.sounds?.carRoamNoise || 'Assets/Sound Effects/Skills/cj-carroam-noise.mp3';
          const roamVol = CONFIG.cj?.soundVolumes?.carRoamNoise !== undefined ? CONFIG.cj.soundVolumes.carRoamNoise : 1.5;
          audioSystem.playSFX(roamSound, roamVol);
        }

        // 1. Pick a new random target waypoint if not set, or reached, or every ~85 frames
        const distToRoam = car.roamTarget ? Math.hypot(car.roamTarget.x - car.x, car.roamTarget.y - car.y) : 0;
        if (!car.roamTarget || distToRoam < 75 || (car.roamTarget.timer && car.roamTarget.timer > 85)) {
          car.roamTarget = pickRandomArenaTarget(arena, car.x, car.y);
        }
        if (car.roamTarget) car.roamTarget.timer = (car.roamTarget.timer || 0) + 1;

        // 2. Vector towards active random roam target (unrestricted by walls so it can clip across borders)
        let steerX = Math.cos(Math.atan2(car.roamTarget.y - car.y, car.roamTarget.x - car.x));
        let steerY = Math.sin(Math.atan2(car.roamTarget.y - car.y, car.roamTarget.x - car.x));

        // 3. Soft safety clamp ONLY if flying excessively far off-screen (>220px)
        const extremeMargin = 220;
        if (car.x < arena.x - extremeMargin) steerX += 2.0;
        if (car.x > arena.x + arena.width + extremeMargin) steerX -= 2.0;
        if (car.y < arena.y - extremeMargin) steerY += 2.0;
        if (car.y > arena.y + arena.height + extremeMargin) steerY -= 2.0;

        // 4. Clamped steering rate (ONLY steers while moving forward, never rotates on the spot when stopped)
        if (isMoving) {
          const targetHeading = Math.atan2(steerY, steerX);
          const angleDiff = shortestAngleDiff(targetHeading, car.angle);
          const maxSteerRate = 0.055;
          const steerFactor = Math.min(1.0, currentSpeed / 4.0);
          car.angle += Math.max(-maxSteerRate, Math.min(maxSteerRate, angleDiff * 0.12)) * steerFactor;
        }

        // 5. Continuous smooth drive
        car.speed = 6.6;
        car.vx = Math.cos(car.angle) * car.speed;
        car.vy = Math.sin(car.angle) * car.speed;
        car.x += car.vx;
        car.y += car.vy;

        // ── VICTORY LAP LOGIC: If round/match is over and CJ won, keep car roaming forever! ──
        const isRoundOver = state.gameState === 'roundEnd' || state.gameState === 'matchEnd' || Boolean(state.missionPassedOverlay);
        const isCjAliveWinner = Boolean(car.owner && !car.owner.dead && car.owner.hp > 0);

        if (isRoundOver && isCjAliveWinner) {
          // Continuous Victory Roam! Reset timer so car never exits
          car.stayTimer = 0;
          car.phase = 'ROAMING';
        } else if (car.stayTimer >= car.stayDuration) {
          car.phase = 'EXITING';
          car.exitAngle = car.angle; // Smooth exit along current forward trajectory
          stopSoundBySrc('cj-carroam-noise');
          if (car.roamSoundHandle) {
            stopSound(car.roamSoundHandle);
            car.roamSoundHandle = null;
          }
          audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 0.95);
        }
      } else if (car.phase === 'EXITING') {
        const isRoundOver = state.gameState === 'roundEnd' || state.gameState === 'matchEnd' || Boolean(state.missionPassedOverlay);
        const isCjAliveWinner = Boolean(car.owner && !car.owner.dead && car.owner.hp > 0);

        if (isRoundOver && isCjAliveWinner) {
          // Immediately cancel exiting and switch back to victory roaming!
          car.phase = 'ROAMING';
          car.stayTimer = 0;
          car.roamTarget = pickRandomArenaTarget(arena, car.x, car.y);
        } else {
          // Accelerate cleanly off-screen in exit direction
          car.speed = Math.min(12.0, car.speed + 0.35);
          if (isMoving && car.exitAngle !== null && car.exitAngle !== undefined) {
            const exitDiff = shortestAngleDiff(car.exitAngle, car.angle);
            const steerFactor = Math.min(1.0, currentSpeed / 4.0);
            car.angle += exitDiff * 0.08 * steerFactor;
          }

          car.vx = Math.cos(car.angle) * car.speed;
          car.vy = Math.sin(car.angle) * car.speed;
          car.x += car.vx;
          car.y += car.vy;

          // Clean up when fully off-screen
          const isFarOffscreen = (
            car.x < arena.x - 240 ||
            car.x > arena.x + arena.width + 240 ||
            car.y < arena.y - 240 ||
            car.y > arena.y + arena.height + 240
          );

          if (isFarOffscreen) {
            stopSoundBySrc('cj-carroam-noise');
            if (car.roamSoundHandle) {
              stopSound(car.roamSoundHandle);
              car.roamSoundHandle = null;
            }
            if (car.passesRemaining > 1) {
              // Repeat another roaming pass from the opposite side!
              car.passesRemaining--;
              car.phase = 'WAITING_REENTER';
              car.reenterTimer = cfg.driveByReenterDelay || 60; // 1.0s pause before next sweep
            } else {
              // All passes completed
              car.dead = true;
              if (car.owner) {
                car.owner.isDriveByActive = false;
              }
            }
          }
        }
      }

      // ── TIRE SKID MARKS & BILLOWING TIRE SMOKE ──
      if (car.phase === 'ENTERING' || car.phase === 'ROAMING' || car.phase === 'CRUISING' || car.phase === 'EXITING') {
        const cosA = Math.cos(car.angle);
        const sinA = Math.sin(car.angle);
        const perpX = -sinA;
        const perpY = cosA;
        const rearDist = -car.length * 0.28;
        const wheelHalfW = car.width * 0.44;

        const leftWheelX = car.x + cosA * rearDist - perpX * wheelHalfW;
        const leftWheelY = car.y + sinA * rearDist - perpY * wheelHalfW;
        const rightWheelX = car.x + cosA * rearDist + perpX * wheelHalfW;
        const rightWheelY = car.y + sinA * rearDist + perpY * wheelHalfW;

        // Throttled skid mark recording (every 4 frames) with compact buffer to eliminate FPS drops
        if (car.timer % 4 === 0) {
          if (car.skidLeftTrack && car.skidLeftTrack.points) {
            car.skidLeftTrack.points.push({ x: leftWheelX, y: leftWheelY });
            if (car.skidLeftTrack.points.length > 14) car.skidLeftTrack.points.shift();
          }
          if (car.skidRightTrack && car.skidRightTrack.points) {
            car.skidRightTrack.points.push({ x: rightWheelX, y: rightWheelY });
            if (car.skidRightTrack.points.length > 14) car.skidRightTrack.points.shift();
          }
        }

        // Billowing white tire smoke particles (capped at 10 active particles)
        if (state.cjTireSmoke && car.timer % 5 === 0 && state.cjTireSmoke.length < 10) {
          state.cjTireSmoke.push({
            x: leftWheelX + (Math.random() - 0.5) * 4,
            y: leftWheelY + (Math.random() - 0.5) * 4,
            vx: -car.vx * 0.08 + (Math.random() - 0.5) * 0.8,
            vy: -car.vy * 0.08 + (Math.random() - 0.5) * 0.8,
            r: 5.0,
            maxR: 14.0,
            life: 16,
            maxLife: 16,
            maxAlpha: 0.35
          });
        }
      }

      // ── VEHICULAR ENEMY RAM COLLISION, IMPACT DAMAGE & KNOCKBACK ──
      if (car.phase === 'ENTERING' || car.phase === 'ROAMING' || car.phase === 'CRUISING' || car.phase === 'EXITING') {
        const halfL = car.length * 0.5;
        const halfW = car.width * 0.5;
        const cosA = Math.cos(car.angle);
        const sinA = Math.sin(car.angle);
        const ramDamage = cfg.driveByRamDamage || 22;
        const baseKnockback = cfg.driveByRamKnockback || 18.0;

        const _processRamCollision = (ent) => {
          if (!ent || ent === car.owner || ent.dead || ent.hp <= 0 || (ent.invincibilityTimer || 0) > 0 || ent.isAmbushing || ent.owner === car.owner) return;

          // Team check
          if (typeof state.getFighterTeam === 'function' && car.owner) {
            if (ent.owner) {
              const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
              if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) return;
            } else {
              const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
              if (myTeam !== null && entTeam !== null && myTeam === entTeam) return;
            }
          }

          const dx = ent.x - car.x;
          const dy = ent.y - car.y;
          const entRadius = ent.r || 20;
          const maxReach = halfL + entRadius;

          // Fast bounding box rejection before expensive trigonometrics
          if (Math.abs(dx) > maxReach || Math.abs(dy) > maxReach) return;

          // Transform enemy world position to car local coordinates (Oriented Bounding Box)
          const localX = dx * cosA + dy * sinA;
          const localY = -dx * sinA + dy * cosA;

          const clampX = Math.max(-halfL, Math.min(halfL, localX));
          const clampY = Math.max(-halfW, Math.min(halfW, localY));
          const distSq = (localX - clampX) ** 2 + (localY - clampY) ** 2;

          if (distSq < entRadius * entRadius) {
            // Collision detected!
            const isGojoInfinity = (ent.characterId === 'gojo' || ent.type === 'gojo') &&
              !ent.isMeleeMode &&
              ((ent.infinityCooldown || 0) <= 0 || ent.infinityActive);

            if (isGojoInfinity) {
              if (typeof ent.triggerInfinityBlock === 'function') {
                ent.triggerInfinityBlock(car.x, car.y, car);
              }
              return;
            }

            const now = Date.now();
            const lastHit = ent._lastCjCarRamTime || 0;

            // Cooldown of 350ms per entity so it doesn't multi-hit every single frame
            if (now - lastHit > 350) {
              ent._lastCjCarRamTime = now;

              // Calculate directional vehicular knockback
              const carSpeed = Math.max(6.0, car.speed || 6.0);
              const knockbackForce = baseKnockback + carSpeed * 0.8;
              const collisionAngle = Math.atan2(dy, dx);
              const pushAngle = car.angle * 0.65 + collisionAngle * 0.35;
              const pushVx = Math.cos(pushAngle) * knockbackForce;
              const pushVy = Math.sin(pushAngle) * knockbackForce;

              // Apply Physical Knockback push
              if (typeof ent.applyKnockback === 'function') {
                ent.applyKnockback(pushVx, pushVy);
              } else {
                ent.knockbackVx = (ent.knockbackVx || 0) + pushVx;
                ent.knockbackVy = (ent.knockbackVy || 0) + pushVy;
              }

              // Apply Flinch / Hit Stun
              if (typeof ent.applyHitStun === 'function') {
                ent.applyHitStun(16);
              } else {
                ent.hitStunTimer = Math.max(ent.hitStunTimer || 0, 16);
              }

              // Deal Ram Impact Damage
              if (typeof ent.takeDamage === 'function') {
                ent.takeDamage(ramDamage, car.owner, { isVehicularRam: true });
              }

              // Audio: Heavy vehicular impact crash SFX
              const ramSnd = CONFIG.cj?.sounds?.carRam || 'Assets/Sound Effects/Attacks/groundSmash.mp3';
              const ramVol = CONFIG.cj?.soundVolumes?.carRam !== undefined ? CONFIG.cj.soundVolumes.carRam : 0.85;
              audioSystem.playSFX(ramSnd, ramVol);
              audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.70);

              // Visual FX: Comic "BAM!" starburst, impact flash, sparks, and screen shake
              spawnBamEffect(ent.x, ent.y, 1.25);

              if (typeof spawnImpactFlash === 'function') {
                spawnImpactFlash(ent.x, ent.y, 48, '#F59E0B');
              }
              if (typeof spawnSparks === 'function') {
                spawnSparks(ent.x, ent.y, '#F59E0B', 8);
              }
              if (typeof triggerGlobalScreenShake === 'function') {
                triggerGlobalScreenShake(5, 6);
              }

              // Floating Text
              spawnFloatingText(ent.x, ent.y - (ent.r || 20) - 16, 'RAMMED! -' + ramDamage, '#EF4444');

              // Gain Respect for CJ
              if (car.owner && typeof car.owner.gainRespect === 'function') {
                car.owner.gainRespect(cfg.driveByRamRespectGain || 4);
              }
            }
          }
        };

        if (state.fighters) {
          for (let fi = 0; fi < state.fighters.length; fi++) {
            _processRamCollision(state.fighters[fi]);
          }
        }
        if (state.illusions) {
          for (let ii = 0; ii < state.illusions.length; ii++) {
            _processRamCollision(state.illusions[ii]);
          }
        }
      }

      // ── TEC-9 LEAD STORM UNLIMITED CONTINUOUS FIRING LOGIC ──
      // Homies continuously fire non-stop until the entire driveByStayDuration ends
      if (activeTarget && !activeTarget.dead && car.phase !== 'WAITING_REENTER') {
        if (car.fireCooldown > 0) {
          car.fireCooldown--;
        } else {
          // Fire a Tec-9 tracer bullet round
          car.shotCount = (car.shotCount || 0) + 1;
          car.fireCooldown = car.fireInterval;
          const isHomie1 = (car.currentHomie === 0);
          car.currentHomie = isHomie1 ? 1 : 0; // Alternate between front and rear homies

          const cosA = Math.cos(car.angle);
          const sinA = Math.sin(car.angle);
          const perpX = -sinA;
          const perpY = cosA;

          const cabinX = -car.length * 0.06;
          const cabinW = car.length * 0.52;
          const homieOffsetAlongCar = isHomie1 ? (cabinX + cabinW * 0.12) : (cabinX - cabinW * 0.15);
          const homieSideOffset = car.width * 0.38;

          const homieX = car.x + cosA * homieOffsetAlongCar + perpX * homieSideOffset;
          const homieY = car.y + sinA * homieOffsetAlongCar + perpY * homieSideOffset;

          // Target aim angle with small natural spray spread
          const rawTargetAngle = Math.atan2(activeTarget.y - homieY, activeTarget.x - homieX);
          const spread = (Math.random() - 0.5) * 0.08;
          const bulletAngle = rawTargetAngle + spread;

          // Exact TEC-9 muzzle tip: 12.5px gun offset + (44.0 * 1.05) muzzle reach = ~58.7px along bulletAngle
          const tec9TipDist = 58.7;
          const spawnX = homieX + Math.cos(bulletAngle) * tec9TipDist;
          const spawnY = homieY + Math.sin(bulletAngle) * tec9TipDist;

          const myIndex = state.fighters ? state.fighters.indexOf(car.owner) : 0;
          const bSpeed = car.bulletSpeed || cfg.driveByBulletSpeed || 28.0;
          if (typeof projectileSystem !== 'undefined' && projectileSystem) {
            const p = projectileSystem.fireProjectile(
              car.owner,
              myIndex,
              car.bulletDamage,
              false,
              bSpeed,
              false,
              'cjUziBullet',
              spawnX,
              spawnY,
              bulletAngle
            );
            if (p) {
              p.life = 75;
              p.maxLife = 75;
            }
          }

          // Trigger homie muzzle flash and recoil kick
          if (isHomie1) {
            car.homie1Flash = 3;
            car.homie1Recoil = 5.5;
          } else {
            car.homie2Flash = 3;
            car.homie2Recoil = 5.5;
          }

          // Gunshot Audio & Shell Casing SFX
          const driveByShots = CONFIG.cj?.sounds?.carDriveByShot || [
            'Assets/Sound Effects/Attacks/revolvershot.mp3',
            'Assets/Sound Effects/Skills/engineer-sentrygunshot.mp3'
          ];
          const shotSfx = Array.isArray(driveByShots)
            ? driveByShots[car.shotCount % driveByShots.length]
            : driveByShots;
          const shotVol = CONFIG.cj?.soundVolumes?.carDriveByShot !== undefined ? CONFIG.cj.soundVolumes.carDriveByShot : 0.70;
          audioSystem.playSFX(shotSfx, shotVol);

          // Eject physical 9mm spent shell casings from car window dropping to arena floor
          if (typeof spawnSpentCasing === 'function') {
            spawnSpentCasing(homieX, homieY, bulletAngle, '9mm', 14);
          }

          if (car.shotCount % 4 === 0) {
            const shellSnd = CONFIG.cj?.sounds?.carShellDrop || 'Assets/Sound Effects/Skills/johnwick-bulleshell-drop.mp3';
            const shellVol = CONFIG.cj?.soundVolumes?.carShellDrop !== undefined ? CONFIG.cj.soundVolumes.carShellDrop : 0.50;
            audioSystem.playSFX(shellSnd, shellVol);
          }

          // Visual spark bursts at muzzle
          if (typeof spawnSparks === 'function') {
            spawnSparks(spawnX, spawnY, 3, 'gold', '#F59E0B');
          }

          // Build Respect for CJ on successful barrage firing
          if (car.owner && typeof car.owner.gainRespect === 'function') {
            car.owner.gainRespect(cfg.driveByBulletRespectGain || 1);
          }
        }
      }
    }
  }

  // ── 2. BURNOUT OIL PUDDLES REMOVED PER USER REQUEST ──
  if (state.cjBurnoutPuddles && state.cjBurnoutPuddles.length > 0) {
    state.cjBurnoutPuddles.length = 0;
  }

  // ── 3. UPDATE TIRE SMOKE PARTICLES ──
  if (state.cjTireSmoke && state.cjTireSmoke.length > 0) {
    if (state.cjTireSmoke.length > 12) {
      state.cjTireSmoke.splice(0, state.cjTireSmoke.length - 12);
    }
    for (let i = state.cjTireSmoke.length - 1; i >= 0; i--) {
      const p = state.cjTireSmoke[i];
      if (!p || p.life <= 0) {
        state.cjTireSmoke.splice(i, 1);
        continue;
      }

      p.life--;
      p.x += p.vx;
      p.y += p.vy;
      p.r += (p.maxR - p.r) * 0.08;
    }
  }

  // ── 4. DECAY SKID TRACKS ──
  if (state.cjSkidTracks && state.cjSkidTracks.length > 0) {
    if (state.cjSkidTracks.length > 12) {
      state.cjSkidTracks.splice(0, state.cjSkidTracks.length - 12);
    }
    for (let i = state.cjSkidTracks.length - 1; i >= 0; i--) {
      const track = state.cjSkidTracks[i];
      if (!track || track.alpha <= 0.02) {
        state.cjSkidTracks.splice(i, 1);
        continue;
      }
      // Clean decay over 120 frames
      track.alpha -= 0.008;
    }
  }
}

/**
 * Draws ground-level drive-by elements (skid marks, burnout oil puddle, headlight beams)
 * Rendered underneath fighters and entities.
 */
export function drawDriveByGroundEffects(ctx) {
  if (typeof state === 'undefined') return;

  // 0. Car explosion burnt scorch craters & glowing embers on asphalt
  drawCarScorchMarks(ctx);

  // 1. Skid marks on asphalt
  if (state.cjSkidTracks && state.cjSkidTracks.length > 0) {
    drawCarSkidMarks(ctx, state.cjSkidTracks);
  }


  // 3. Headlight illumination cones projecting onto the ground
  if (state.cjDriveBys && state.cjDriveBys.length > 0) {
    for (let i = 0; i < state.cjDriveBys.length; i++) {
      const car = state.cjDriveBys[i];
      if (car && !car.dead && car.phase !== 'WAITING_REENTER') {
        drawCarHeadlights(ctx, car.x, car.y, car.angle, car.length, car.width);
      }
    }
  }
}

/**
 * Draws Greenwood cars, leaning homies, and billowing tire smoke particles
 */
export function drawDriveBys(ctx) {
  if (typeof state === 'undefined') return;

  // 1. Tire smoke particles
  if (state.cjTireSmoke && state.cjTireSmoke.length > 0) {
    drawTireSmokeParticles(ctx, state.cjTireSmoke);
  }

  // 2. Greenwood sedans, homies & minion floating health bar
  if (state.cjDriveBys && state.cjDriveBys.length > 0) {
    for (let i = 0; i < state.cjDriveBys.length; i++) {
      const car = state.cjDriveBys[i];
      if (car && !car.dead && car.phase !== 'WAITING_REENTER') {
        drawGroveStreetCar(ctx, car);

        // Draw Floating Minion Health Bar above vehicle
        if (car.hp > 0) {
          const barY = car.y - (car.width * 0.5 + 16);
          drawMinionHealthBar(ctx, car.x, barY, 48, 7, car.hp, car.maxHp, '#16A34A');
        }
      }
    }
  }

  // 3. Vehicle Detonation Explosion Fireballs, Shockwaves & Flying Shrapnel
  drawCarExplosions(ctx);
}

/**
 * Clears all active drive-by entities, puddles, skid tracks, and smoke on round/match reset
 */
export function clearDriveBys() {
  if (typeof state === 'undefined') return;
  if (state.cjDriveBys) {
    for (let i = 0; i < state.cjDriveBys.length; i++) {
      const car = state.cjDriveBys[i];
      if (car && car.owner) car.owner.isDriveByActive = false;
    }
    state.cjDriveBys.length = 0;
  }
  if (state.cjBurnoutPuddles) state.cjBurnoutPuddles.length = 0;
  if (state.cjSkidTracks) state.cjSkidTracks.length = 0;
  if (state.cjTireSmoke) state.cjTireSmoke.length = 0;
  clearBamEffects();
  clearFloatingJetpacks();
  clearDroppedMiniguns();
  clearCarExplosions();
  stopSoundBySrc('cj-carroam-noise');
  _lastGlobalRoamNoise = null;
  _lastGlobalArrivalVoiceline = null;
}
