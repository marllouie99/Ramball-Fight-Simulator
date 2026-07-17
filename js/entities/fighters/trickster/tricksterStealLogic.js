import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText } from '../../../core/state.js';
import { spatialGrid } from '../../../systems/physics.js';
import { CronosFighter } from '../CronosFighter.js';
import { spawnImpactFlash, spawnSparks } from '../../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../../graphics/particles/bloodEffect.js';

export function updateStolenRubyHook(fighter) {
  if (!fighter.activePullActive) return;

  fighter.activePullPhaseTimer--;

  // Phase-specific logic
  const targets = fighter.pullTargets || [];
  const cfg = CONFIG.ruby || {};

  if (fighter.activePullPhase === 2) {
    // HOOK_GRAB phase
    if (fighter.activePullPhaseTimer === fighter.pullPhaseHookGrab - 1) {
      
      // NOW we lock the targets that are currently in range and in the cone!
      fighter.pullTargets = [];
      const range = cfg.activePullRange || 200;
      const myIndex = state.fighters.indexOf(fighter);
      const myTeam = state.getFighterTeam(myIndex);

      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (!f || f === fighter || f.hp <= 0 || f.invincibilityTimer > 0) continue;
        if (state.mode === '2v2' && myTeam !== null && myTeam === state.getFighterTeam(i)) continue;

        const fDist = Math.hypot(f.x - fighter.x, f.y - fighter.y);
        // Give a small 15px leeway because the weapon physically extends slightly past the max range
        if (fDist <= range + 15) {
          const fAngle = Math.atan2(f.y - fighter.y, f.x - fighter.x);
          let angleDiff = Math.abs(fAngle - fighter.activePullAngle);
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          angleDiff = Math.abs(angleDiff);
          
          // Catch enemies within a 90 degree cone (±45 degrees)
          if (angleDiff < Math.PI / 4) {
            fighter.pullTargets.push(f);
          }
        }
      }
      
      // Ensure the primary targeted opponent is caught IF they are still in range
      if (fighter.primaryHookTarget && !fighter.pullTargets.includes(fighter.primaryHookTarget)) {
        const pDist = Math.hypot(fighter.primaryHookTarget.x - fighter.x, fighter.primaryHookTarget.y - fighter.y);
        if (pDist <= range + 15) {
          fighter.pullTargets.push(fighter.primaryHookTarget);
        }
      }

      // Apply visual effects and slow to the successfully caught targets
      const targets = fighter.pullTargets || [];
      const slowFrames = cfg.activeSlowDuration || 90;
      for (const target of targets) {
        if (target && target.hp > 0) {
          target.applySlow(slowFrames, 0.4);
          spawnFloatingText(target.x, target.y - target.r - 5, 'HOOKED!', '#E0115F');
          
          // Massive visual effects for the hook connection
          spawnImpactFlash(target.x, target.y, 40);
          spawnSparks(target.x, target.y, 30, 'lime');
          spawnBloodEffect(target, 40, fighter.activePullAngle);
        }
      }
    }
  }

  if (fighter.activePullPhase === 3) {
    // PULL_DRAG phase — continuously drag the target toward Trickster each frame
    for (const target of targets) {
      if (target && target.hp > 0) {
        const dx = fighter.x - target.x;
        const dy = fighter.y - target.y;
        const dist = Math.hypot(dx, dy) || 1;

        // Visual trail of sparks while being dragged
        if (fighter.activePullPhaseTimer % 2 === 0) {
          spawnSparks(target.x, target.y, 3, 'lime');
          spawnBloodEffect(target, 5);
        }

        // Kill target's own velocity so they can't resist the pull
        target.vx *= 0.3;
        target.vy *= 0.3;

        // Smooth spring pull: lerp them towards the minimum distance
        const pullLerp = 0.15; // 15% of the remaining distance per frame
        const minDistance = fighter.r + target.r + 5; // leave a 5px buffer so models don't perfectly overlap
        if (dist > minDistance) {
          // Cap the maximum move distance per frame to 14 pixels to prevent "teleporting/warping"
          const moveDist = Math.min((dist - minDistance) * pullLerp, 14.0);
          target.x += (dx / dist) * moveDist;
          target.y += (dy / dist) * moveDist;
        }
      }
    }
  }

  // Advance to next phase when timer runs out
  if (fighter.activePullPhaseTimer <= 0) {
    fighter.activePullPhase++;
    switch (fighter.activePullPhase) {
      case 1: // → SWING_OUT
        fighter.activePullPhaseTimer = fighter.pullPhaseSwingOut;
        break;
      case 2: // → HOOK_GRAB
        fighter.activePullPhaseTimer = fighter.pullPhaseHookGrab;
        break;
      case 3: // → PULL_DRAG
        fighter.activePullPhaseTimer = fighter.pullPhasePullDrag;
        break;
      case 4: // → DISENGAGE
        fighter.activePullPhaseTimer = fighter.pullPhaseDisengage;
        fighter.pullTargets = []; // release the targets
        break;
      default: // finished
        fighter.activePullActive = false;
        fighter.activePullPhase = -1;
        fighter.pullTargets = [];
        break;
    }
  }
}


// Helper to apply speed boost to Trickster when inside his stolen sphere
function applyStolenCronosSpeed(fighter) {
  let modeMult = 1.0;
  if (typeof state !== 'undefined' && state.mode) {
    if (state.mode === '1v1') modeMult = 1.2;
    else if (state.mode === '2v2') modeMult = 1.1;
  }
  
  let baseMoveSpeed = fighter.baseSpeed * modeMult;
  let targetSpeed = baseMoveSpeed;
  let targetAccel = fighter.baseAcceleration || 0.5;
  
  if (fighter.sphereActive) {
    const distToSphere = Math.hypot(fighter.x - fighter.sphereX, fighter.y - fighter.sphereY);
    const insideSphere = distToSphere <= CONFIG.cronos.sphereRadius;
    if (insideSphere) {
      targetSpeed = baseMoveSpeed * CONFIG.cronos.sphereSpeedMultiplier;
      targetAccel = (fighter.baseAcceleration || 0.5) * CONFIG.cronos.sphereSpeedMultiplier;
    }
  }
  
  fighter.speed = targetSpeed;
  fighter.acceleration = targetAccel;

  // Apply slow and hit stun effects
  if (fighter.slowTimer > 0) {
    fighter.speed *= fighter.slowMultiplier;
    fighter.acceleration *= fighter.slowMultiplier;
  }
  if (fighter.hitStunTimer > 0) {
    fighter.speed *= fighter.hitStunMultiplier;
    fighter.acceleration *= fighter.hitStunMultiplier;
  }
}

export function updateStolenCronosSphere(fighter) {
  if (fighter.sphereActive) {
    fighter.sphereTimer--;
    
    // Apply speed boost!
    applyStolenCronosSpeed(fighter);

    if (fighter.sphereTimer <= 0) {
      if (state && state.fighters) {
        for (const f of state.fighters) {
          if (f && f !== fighter) {
            if (f.timeStopTimer > 0 && f._frozenByCronosSphere) {
              f.timeStopTimer = 0;
              if (f._frozenByCronosSphere) {
                if (typeof f._resumeVx === 'number') f.vx = f._resumeVx;
                if (typeof f._resumeVy === 'number') f.vy = f._resumeVy;
                delete f._resumeVx;
                delete f._resumeVy;
                delete f._frozenByCronosSphere;
              }
              delete f._suppressFreezeTimer;
            }
          }
        }
      }
      fighter.sphereActive = false;
      fighter.speed = fighter.baseSpeed;
      fighter.acceleration = fighter.baseAcceleration || 0.5;
      spawnFloatingText(fighter.sphereX, fighter.sphereY - CONFIG.cronos.sphereRadius - 10, 'SPHERE ENDED', '#00FF00');
      return;
    }

    if (state && state.fighters) {
      const sphereRadius = CONFIG.cronos.sphereRadius;
      const nearbyFighters = spatialGrid.getNearby(fighter.sphereX, fighter.sphereY, sphereRadius);

      for (const f of nearbyFighters) {
        if (f && f !== fighter && f.hp > 0) {
          if (f.timeStopTimer > 0 && f._frozenByCronosSphere) continue; // Skip if already frozen
          if (f.invincibilityTimer > 0 || f.flashStepTimer > 0) continue; // Skip stealthed

          const dist = Math.hypot(f.x - fighter.sphereX, f.y - fighter.sphereY);
          if (dist <= sphereRadius) {
            let remaining = f.timeStopTimer || 0;
            if (f._timeStopOriginalDuration && f._timeStopStartTime) {
              const elapsedMs = performance.now() - f._timeStopStartTime;
              const elapsedFrames = (elapsedMs / 1000) * 60;
              remaining = Math.max(0, f._timeStopOriginalDuration - elapsedFrames);
            }
            if (remaining <= 0) {
              f.applyTimeStop(CONFIG.cronos.sphereDuration);
              if (typeof f._resumeVx !== 'number') f._resumeVx = f.vx;
              if (typeof f._resumeVy !== 'number') f._resumeVy = f.vy;
              f.vx = 0;
              f.vy = 0;
              f._frozenByCronosSphere = true;
            }
            f._suppressFreezeTimer = true;
          }
        }
      }
    }
  }
}

export function resolveStolenCronosWallBounce(fighter, arena, opponent) {
  // Rather than duplicating all 150 lines of bounce logic from Cronos,
  // we can simply borrow the prototype method since Trickster is a Fighter too!
  CronosFighter.prototype.resolveWallBounce.call(fighter, arena, opponent);
}
