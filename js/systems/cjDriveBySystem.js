// ─────────────────────────────────────────────
// CJ's Skill 3: GROVESTREET4LIFE — Gang Drive-By System
// Manages Greenwood sedan physics, homie aiming & Tec-9 bullet barrages,
// tire drift skid marks, smoke particles, and burning burnout oil slow zone.
// Rule 1, Rule 6, Rule 11 & Rule 12 Compliant
// ─────────────────────────────────────────────

import { state, spawnFloatingText, triggerGlobalScreenShake } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { audioSystem } from './audioSystem.js';
import { projectileSystem } from './projectileSystem.js';
import { spawnSparks, spawnImpactFlash } from '../graphics/particles/sparkEffect.js';
import { spawnBamEffect, updateBamEffects, clearBamEffects } from '../graphics/particles/bamImpactEffect.js';
import { clearFloatingJetpacks } from '../graphics/particles/cjFloatingJetpack.js';
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
  car.bulletSpeed = cfg.driveByBulletSpeed || 22.0;
  car.fireCooldown = 10;
  car.fireInterval = cfg.driveByBurstInterval || 8;
  car.hasDroppedOil = false;

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

  state.cjDriveBys.push(car);
  cjFighter.isDriveByActive = true;

  // Audio: Authentic tire screech & engine acceleration
  audioSystem.playSFX('Assets/Sound Effects/Skills/dash2.mp3', 0.95);
  audioSystem.playSFX('Assets/Sound Effects/Attacks/flamespray1.mp3', 0.65);
  audioSystem.playSFX('Assets/Sound Effects/Skills/enhance.mp3', 0.90);

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
          audioSystem.playSFX('Assets/Sound Effects/Skills/enhance.mp3', 0.90);
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

      if (car.isFrozenByInfinity) {
        const hasActiveInfinity = state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && (f.infinityCooldown <= 0 || f.domainActive));
        if (!hasActiveInfinity) {
          car.isFrozenByInfinity = false;
        }
      }

      if (car.frozenByCronos) {
        const hasActiveCronos = state.fighters && state.fighters.some(f => f && f.sphereActive && f.sphereTimer > 0);
        if (!hasActiveCronos) {
          car.frozenByCronos = false;
        }
      }

      // Check if vehicle is currently frozen / paused
      const isFrozen = Boolean(
        (car.timeStopTimer && car.timeStopTimer > 0) ||
        (car.electricStunTimer && car.electricStunTimer > 0) ||
        (car.hitStunTimer && car.hitStunTimer > 0) ||
        car.isFrozenByInfinity ||
        car.frozenByCronos ||
        car.isTargetOfAmbush ||
        car.caughtInSaitamaFlurry
      );

      if (isFrozen) {
        // Vehicle is temporarily frozen in place: halt movement, aiming, and firing until freeze expires
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
      if (car.phase === 'ENTERING') {
        // High-speed arrival toward the arena roaming zone
        const distToCenter = Math.hypot(arenaCenterX - car.x, arenaCenterY - car.y);
        const toAimAngle = Math.atan2(car.entryAimY - car.y, car.entryAimX - car.x);
        const angleDiff = shortestAngleDiff(toAimAngle, car.angle);

        car.angle += Math.max(-0.06, Math.min(0.06, angleDiff * 0.12));
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

        // 4. Clamped steering rate to eliminate all wiggling (heavy lowrider steering)
        const targetHeading = Math.atan2(steerY, steerX);
        const angleDiff = shortestAngleDiff(targetHeading, car.angle);
        const maxSteerRate = 0.055;
        car.angle += Math.max(-maxSteerRate, Math.min(maxSteerRate, angleDiff * 0.12));

        // 5. Continuous smooth drive
        car.speed = 6.6;
        car.vx = Math.cos(car.angle) * car.speed;
        car.vy = Math.sin(car.angle) * car.speed;
        car.x += car.vx;
        car.y += car.vy;

        // Drop Burnout Oil Puddle on the track at frame 60
        if (!car.hasDroppedOil && car.stayTimer > 60) {
          car.hasDroppedOil = true;
          if (state.cjBurnoutPuddles) {
            state.cjBurnoutPuddles.push({
              x: car.x,
              y: car.y,
              r: cfg.driveByOilRadius || 55,
              angle: car.angle,
              life: cfg.driveByOilDuration || 240,
              maxLife: cfg.driveByOilDuration || 240,
              maxAlpha: 0.80,
              owner: car.owner
            });
            audioSystem.playSFX('Assets/Sound Effects/Attacks/flamespray1.mp3', 0.70);
            if (typeof spawnImpactFlash === 'function') {
              spawnImpactFlash(car.x, car.y, 48, '#16A34A');
            }
          }
        }

        // Exactly when driveByStayDuration finishes, transition to EXITING
        if (car.stayTimer >= car.stayDuration) {
          car.phase = 'EXITING';
          car.exitAngle = car.angle; // Smooth exit along current forward trajectory
          audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 0.95);
          audioSystem.playSFX('Assets/Sound Effects/Skills/enhance.mp3', 0.90);
        }
      } else if (car.phase === 'EXITING') {
        // Accelerate cleanly off-screen in exit direction
        car.speed = Math.min(12.0, car.speed + 0.35);
        if (car.exitAngle !== null && car.exitAngle !== undefined) {
          const exitDiff = shortestAngleDiff(car.exitAngle, car.angle);
          car.angle += exitDiff * 0.08;
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

        if (car.skidLeftTrack && car.skidLeftTrack.points) {
          car.skidLeftTrack.points.push({ x: leftWheelX, y: leftWheelY });
          if (car.skidLeftTrack.points.length > 70) car.skidLeftTrack.points.shift();
        }
        if (car.skidRightTrack && car.skidRightTrack.points) {
          car.skidRightTrack.points.push({ x: rightWheelX, y: rightWheelY });
          if (car.skidRightTrack.points.length > 70) car.skidRightTrack.points.shift();
        }

        // Billowing white tire smoke particles
        if (state.cjTireSmoke && car.timer % 2 === 0) {
          state.cjTireSmoke.push({
            x: leftWheelX + (Math.random() - 0.5) * 8,
            y: leftWheelY + (Math.random() - 0.5) * 8,
            vx: -car.vx * 0.12 + (Math.random() - 0.5) * 1.5,
            vy: -car.vy * 0.12 + (Math.random() - 0.5) * 1.5,
            r: 6.0 + Math.random() * 4.0,
            maxR: 18 + Math.random() * 8,
            life: 26,
            maxLife: 26,
            maxAlpha: 0.50
          });
          state.cjTireSmoke.push({
            x: rightWheelX + (Math.random() - 0.5) * 8,
            y: rightWheelY + (Math.random() - 0.5) * 8,
            vx: -car.vx * 0.12 + (Math.random() - 0.5) * 1.5,
            vy: -car.vy * 0.12 + (Math.random() - 0.5) * 1.5,
            r: 6.0 + Math.random() * 4.0,
            maxR: 18 + Math.random() * 8,
            life: 26,
            maxLife: 26,
            maxAlpha: 0.50
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

        const allCandidates = [
          ...(state.fighters || []),
          ...(state.illusions || [])
        ];

        for (const ent of allCandidates) {
          if (!ent || ent === car.owner || ent.dead || ent.hp <= 0 || (ent.invincibilityTimer || 0) > 0 || ent.isAmbushing || ent.owner === car.owner) continue;

          // Team check
          if (typeof state.getFighterTeam === 'function' && car.owner) {
            if (ent.owner) {
              const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
              if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
            } else {
              const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
              if (myTeam !== null && entTeam !== null && myTeam === entTeam) continue;
            }
          }

          // Transform enemy world position to car local coordinates (Oriented Bounding Box)
          const dx = ent.x - car.x;
          const dy = ent.y - car.y;
          const localX = dx * cosA + dy * sinA;
          const localY = -dx * sinA + dy * cosA;
          const entRadius = ent.r || 20;

          const clampX = Math.max(-halfL, Math.min(halfL, localX));
          const clampY = Math.max(-halfW, Math.min(halfW, localY));
          const distSq = (localX - clampX) ** 2 + (localY - clampY) ** 2;

          if (distSq < entRadius * entRadius) {
            // Collision detected!
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
              audioSystem.playSFX('Assets/Sound Effects/Attacks/groundSmash.mp3', 0.85);
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
                car.owner.gainRespect(4);
              }
            }
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

          const spawnX = car.x + cosA * homieOffsetAlongCar + perpX * homieSideOffset;
          const spawnY = car.y + sinA * homieOffsetAlongCar + perpY * homieSideOffset;

          // Target aim angle with small natural spray spread
          const rawTargetAngle = Math.atan2(activeTarget.y - spawnY, activeTarget.x - spawnX);
          const spread = (Math.random() - 0.5) * 0.08;
          const bulletAngle = rawTargetAngle + spread;

          const myIndex = state.fighters ? state.fighters.indexOf(car.owner) : 0;
          if (typeof projectileSystem !== 'undefined' && projectileSystem) {
            const p = projectileSystem.fireProjectile(
              car.owner,
              myIndex,
              car.bulletDamage,
              false,
              car.bulletSpeed,
              false,
              'cjUziBullet',
              spawnX,
              spawnY,
              bulletAngle
            );
            if (p) {
              p.ignoreWalls = true;
              p.pierceWalls = true;
              p.life = 75; // 75 frames * 22px = 1650px (flies seamlessly through walls across the entire screen)
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
          const shotSfx = (car.shotCount % 2 === 0)
            ? 'Assets/Sound Effects/Attacks/revolvershot.mp3'
            : 'Assets/Sound Effects/Skills/engineer-sentrygunshot.mp3';
          audioSystem.playSFX(shotSfx, 0.70);

          if (car.shotCount % 4 === 0) {
            audioSystem.playSFX('Assets/Sound Effects/Skills/johnwick-bulleshell-drop.mp3', 0.50);
          }

          // Visual spark bursts at muzzle
          if (typeof spawnSparks === 'function') {
            spawnSparks(spawnX, spawnY, '#F59E0B', 3);
          }

          // Build Respect for CJ on successful barrage firing
          if (car.owner && typeof car.owner.gainRespect === 'function') {
            car.owner.gainRespect(1);
          }
        }
      }
    }
  }

  // ── 2. UPDATE BURNOUT OIL PUDDLES & ENEMY SLOW DEBUFFS ──
  if (state.cjBurnoutPuddles && state.cjBurnoutPuddles.length > 0) {
    const allCandidates = [
      ...(state.fighters || []),
      ...(state.illusions || [])
    ];

    for (let i = state.cjBurnoutPuddles.length - 1; i >= 0; i--) {
      const puddle = state.cjBurnoutPuddles[i];
      if (!puddle || puddle.life <= 0) {
        state.cjBurnoutPuddles.splice(i, 1);
        continue;
      }

      puddle.life--;

      const myTeam = (typeof state.getFighterTeam === 'function' && puddle.owner)
        ? state.getFighterTeam(state.fighters.indexOf(puddle.owner))
        : null;

      // Check if any enemy entities step into the burnout oil
      for (const ent of allCandidates) {
        if (!ent || ent === puddle.owner || ent.dead || ent.hp <= 0 || (ent.invincibilityTimer || 0) > 0 || ent.owner === puddle.owner) continue;

        if (typeof state.getFighterTeam === 'function') {
          if (ent.owner) {
            const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
            if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
          } else {
            const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
            if (myTeam !== null && entTeam !== null && myTeam === entTeam) continue;
          }
        }

        const dist = Math.hypot(ent.x - puddle.x, ent.y - puddle.y);
        if (dist <= puddle.r + (ent.r || 20)) {
          // Apply 35% Movement Slow Debuff (speed x 0.65)
          ent.vx = (ent.vx || 0) * 0.75;
          ent.vy = (ent.vy || 0) * 0.75;

          const now = Date.now();
          if (!ent._lastCjOilTextTime || now - ent._lastCjOilTextTime > 1200) {
            ent._lastCjOilTextTime = now;
            spawnFloatingText(ent.x, ent.y - (ent.r || 20) - 14, 'SLOWED (BURNOUT)', '#EAB308');
            audioSystem.playSFX('Assets/Sound Effects/Skills/dash4.mp3', 0.45);
          }

          // Small tire smoke wisps underfoot
          if (Math.random() < 0.25 && state.cjTireSmoke) {
            state.cjTireSmoke.push({
              x: ent.x + (Math.random() - 0.5) * 10,
              y: ent.y + (ent.r || 20) - 4,
              vx: (Math.random() - 0.5) * 1.0,
              vy: -0.8 - Math.random() * 0.8,
              r: 4.5,
              maxR: 12.0,
              life: 18,
              maxLife: 18,
              maxAlpha: 0.40
            });
          }
        }
      }
    }
  }

  // ── 3. UPDATE TIRE SMOKE PARTICLES ──
  if (state.cjTireSmoke && state.cjTireSmoke.length > 0) {
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
    for (let i = state.cjSkidTracks.length - 1; i >= 0; i--) {
      const track = state.cjSkidTracks[i];
      if (!track || track.alpha <= 0) {
        state.cjSkidTracks.splice(i, 1);
        continue;
      }
      // Slow gradual fade over 400 frames
      track.alpha -= 0.0025;
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

  // 2. Burnout oil puddles
  if (state.cjBurnoutPuddles && state.cjBurnoutPuddles.length > 0) {
    for (let i = 0; i < state.cjBurnoutPuddles.length; i++) {
      drawBurnoutOilPuddle(ctx, state.cjBurnoutPuddles[i]);
    }
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
  clearCarExplosions();
}
