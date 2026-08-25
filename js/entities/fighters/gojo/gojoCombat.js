// ─────────────────────────────────────────────
// SATORU GOJO COMBAT DEFENSE & TELEPORT MODULE
// Encapsulates Infinity passive barrier defense and teleport evasion
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { pushTrailCap } from '../../../graphics/particles/visualTrailSystem.js';
import { triggerAdaptation } from '../mahoraga/mahoragaAdaptation.js';

export function triggerInfinityBlock(fighter, hitX, hitY, attacker) {
  // Toji, Adapted Mahoraga, & Saitama during Serious Skill Counter immediately bypass Infinity — no barrier visuals, no freeze, no shockwave!
  if (attacker && attacker !== fighter) {
    const isToji = attacker.characterId === 'toji' || attacker.type === 'toji';
    const isSaitamaCountering = (attacker.characterId === 'saitama' || attacker.type === 'saitama') &&
      ((attacker._counterPunchTimer && attacker._counterPunchTimer > 0) ||
       (attacker._counterWindupTimer && attacker._counterWindupTimer > 0) ||
       (attacker._postCounterRecoveryTimer && attacker._postCounterRecoveryTimer > 0) ||
       attacker.isCountering);
    const totalMahoragaStages = attacker.adaptationStage ? ((attacker.adaptationStage.melee || 0) + (attacker.adaptationStage.ranged || 0) + (attacker.adaptationStage.skill || 0)) : 0;
    const isAdaptedMahoraga = (attacker.characterId === 'mahoraga' || attacker.type === 'mahoraga') && 
                              (attacker.gojoInfinityImmune || attacker.isMaxAdapted || attacker.isInfinityBlitz || attacker.isWallSlamActive || totalMahoragaStages >= 8);
    if (isToji || isAdaptedMahoraga || isSaitamaCountering) {
      attacker.infinityFreezeTimer = 0;
      attacker.isFrozenByInfinity = false;
      attacker.adaptationPauseTimer = 0;
      return false;
    }
  }

  const isDomainChanneling = fighter.isDomainPreSlide || fighter.isChannelingDomainExpansion;
  const isBreatherState = (fighter.purpleRecoveryTimer || 0) > 0 || (fighter.purpleRetreatTimer || 0) > 0;
  if (isBreatherState || isDomainChanneling) {
    fighter.infinityActive = true;
    fighter.infinityCooldown = 0;
    fighter.isMeleeMode = false;
  }

  const isInsideEnemyDomain = !fighter.domainActive && state.fighters && state.fighters.some(f => f && f !== fighter && f.domainActive && f.hp > 0);
  if (isInsideEnemyDomain && !fighter.isMeleeMode) {
    fighter.infinityActive = true;
    fighter.infinityCooldown = 0;
  }
  if (fighter.isChannelingPurple || fighter.domainActive || (fighter.isMeleeMode && !isBreatherState && !isDomainChanneling)) return false;

  fighter.infinityBlockTimer = 25;
  fighter.infinityBlockMaxTimer = 25;
  fighter.infinityBlockX = hitX !== undefined ? hitX : fighter.x;
  fighter.infinityBlockY = hitY !== undefined ? hitY : fighter.y;

  // Frame check guard: Prevent multiple barrier rebound rings and text spawns in the same frame!
  const currentFrame = (typeof state !== 'undefined' && state.frameCount !== undefined) ? state.frameCount : ((typeof state !== 'undefined' && state.matchTimer !== undefined) ? state.matchTimer : Date.now());

  // Skip visual/audio spam inside Gojo's own domain (Unlimited Void uses paralysis, not barrier bounces)
  if (!fighter.domainActive) {
    if (fighter._lastInfinityRingFrame !== currentFrame) {
      triggerGlobalScreenShake(3, 6);

      const nowSound = Date.now();
      if (!fighter._lastInfinityCollideSoundTime || nowSound - fighter._lastInfinityCollideSoundTime >= 250) {
        fighter._lastInfinityCollideSoundTime = nowSound;
        const infSnd = CONFIG.gojo?.sounds?.infinityCollide || 'effect_infinity_collide';
        const infVol = CONFIG.gojo?.soundVolumes?.infinityCollide ?? 1.0;
        audioSystem.playSFX(infSnd, infVol);
      }
     
      // Spawn visual barrier rebound ring effect at the impact position
      if (typeof spawnMeleeClashShockwave === 'function') {
        const impactX = hitX !== undefined ? hitX : fighter.x;
        const impactY = hitY !== undefined ? hitY : fighter.y;
        spawnMeleeClashShockwave(impactX, impactY, 75, 'gojo_infinity');
      }
    }
  }

  if (attacker && attacker !== fighter) {
    if (attacker.isChannelingDomain || attacker.isChannelingDomainExpansion) {
      // Domain Channeling has supreme domain hyper-armor — bypasses Infinity block completely!
      return false;
    }
    if (attacker.characterId !== 'toji' && attacker.type !== 'toji' && !attacker.domainImmunity) {
      if (attacker.type === 'mahoraga' || attacker.characterId === 'mahoraga') {
        const hasAdapted = attacker.gojoInfinityImmune || attacker.isMaxAdapted || attacker.isInfinityBlitz;
        if (hasAdapted) {
          // Mahoraga adapted to Limitless — bypasses Infinity block completely!
          attacker.infinityFreezeTimer = 0;
          attacker.isFrozenByInfinity = false;
          attacker.adaptationPauseTimer = 0;
          return false;
        }

        // Increment Limitless barrier collision counter on every contact
        const now = Date.now();
        if (!attacker._lastInfinityCollisionTime || now - attacker._lastInfinityCollisionTime >= 350) {
          attacker._lastInfinityCollisionTime = now;
          attacker.infinityCollisionCount = (attacker.infinityCollisionCount || 0) + 1;
          const collisionsNeeded = CONFIG.mahoraga?.maxAdaptationStages || 5;

          if (!attacker.gojoInfinityImmune && attacker.infinityCollisionCount >= collisionsNeeded) {
            attacker.gojoInfinityImmune = true;
            attacker.adapted.melee = true;
            attacker.adapted.skill = true;

            if (typeof triggerAdaptation === 'function') {
              triggerAdaptation(attacker, 'skill', fighter || null);
            }
            attacker.infinityFreezeTimer = 0;
            attacker.timeStopTimer = 0;
            attacker.isFrozenByInfinity = false;
            attacker.adaptationPauseTimer = 0;
            spawnFloatingText(attacker.x, attacker.y - attacker.r - 25, `⚡ LIMITLESS ADAPTED! (${collisionsNeeded}/${collisionsNeeded})`, '#00F3FF');
            return false; // Instantly bypass block on adaptation frame!
          } else if (!attacker.gojoInfinityImmune) {
            spawnFloatingText(attacker.x, attacker.y - attacker.r - 25, `⚙️ LIMITLESS (${attacker.infinityCollisionCount}/5)`, '#A0C8FF');
          }
        }
      }
      


      // Interrupt active attack channeling on barrier collision (entity is repelled, NOT frozen; only projectiles freeze)
      if (typeof attacker.interruptAttacks === 'function') {
        attacker.interruptAttacks();
      }

      // Calculate push direction away from Gojo
      let dx = attacker.x - fighter.x;
      let dy = (attacker.y - (attacker.z || 0)) - (fighter.y - (fighter.z || 0));
      let dist = Math.hypot(dx, dy);

      if (dist < 0.1) {
        const fallbackAngle = (fighter.gunAngle !== undefined) ? fighter.gunAngle + Math.PI : Math.random() * Math.PI * 2;
        dx = Math.cos(fallbackAngle);
        dy = Math.sin(fallbackAngle);
        dist = 1.0;
      }
      
      const nx = dx / dist;
      const ny = dy / dist;
      const isImmovable = fighter.isChannelingPurple || fighter.isChannelingDomainExpansion || fighter.domainActive;

      // Inside Gojo's own domain: no physical pushback (Unlimited Void uses time-stop paralysis instead)
      if (!fighter.domainActive) {
        const pushForce = CONFIG.gojo?.infinityMeleePushForce ?? 8.5; // Strong clean bounce impulse from config

        // Push the attacker back with strong outward velocity
        attacker.vx = nx * pushForce;
        attacker.vy = ny * pushForce;

        // Push Gojo back slightly in the opposite direction (if not performing major techniques/skills)
        if (!isImmovable) {
          fighter.vx = -nx * (pushForce * 0.4);
          fighter.vy = -ny * (pushForce * 0.4);
        }

        // Apply brief movement slow on Limitless Infinity barrier collision
        const slowDur = CONFIG.gojo?.infinitySlowDuration ?? 45;
        const slowMult = CONFIG.gojo?.infinitySlowMultiplier ?? 0.50;
        if (typeof attacker.applySlow === 'function') {
          attacker.applySlow(slowDur, slowMult);
        } else {
          attacker.slowTimer = Math.max(attacker.slowTimer || 0, slowDur);
          attacker.slowMultiplier = Math.min(attacker.slowMultiplier || 1.0, slowMult);
        }
      }
      
      // Resolve spatial overlap instantly to snap/slide attacker outside the barrier radius
      const barrierRadius = CONFIG.gojo?.infinityRadius ?? (fighter.r + 30);
      const attRadius = attacker.hitRadius || attacker.r || 25;
      const minDist = attRadius + barrierRadius;
      const overlap = minDist - dist;

      if (overlap > 0 && !fighter.domainActive) {
        if (!isImmovable) {
          const halfOverlap = overlap / 2;
          attacker.x += nx * (halfOverlap + 2);
          attacker.y += ny * (halfOverlap + 2);
          fighter.x -= nx * halfOverlap;
          fighter.y -= ny * halfOverlap;
        } else {
          attacker.x += nx * (overlap + 3);
          attacker.y += ny * (overlap + 3);
        }
      }
    }
  }
  return true;
}

export function applyTeleportSlideBrake(fighter, oldX, oldY, targetX, targetY, arena) {
  if (fighter.isDead) return;
  const dx = targetX - oldX;
  const dy = targetY - oldY;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;

  const nx = dx / dist;
  const ny = dy / dist;

  const slideOffset = Math.min(24, dist * 0.35);
  const slideSpeed = 3.5;

  let startX = targetX - nx * slideOffset;
  let startY = targetY - ny * slideOffset;

  if (arena) {
    startX = Math.max(arena.x + fighter.r, Math.min(arena.x + arena.width - fighter.r, startX));
    startY = Math.max(arena.y + fighter.r, Math.min(arena.y + arena.height - fighter.r, startY));
  }

  fighter.x = startX;
  fighter.y = startY;

  fighter.vx = nx * slideSpeed;
  fighter.vy = ny * slideSpeed;
  fighter.teleportSlideTimer = 0;

  if (!fighter.afterImages) fighter.afterImages = [];
  const pathAngle = Math.atan2(dy, dx);
  const facingAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : pathAngle;
  const steps = Math.max(4, Math.floor(dist / 12));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const maxTimer = 24 - Math.floor(t * 6);
    pushTrailCap(fighter.afterImages, {
      x: oldX + dx * t,
      y: oldY + dy * t,
      angle: facingAngle,
      timer: maxTimer,
      maxTimer: maxTimer,
      fromX: oldX,
      fromY: oldY,
      toX: targetX,
      toY: targetY
    }, CONFIG.gojo?.afterImageCap || 12);
  }
}

export function executeTeleportDodge(fighter, attacker, arena) {
  if (fighter.isDead || fighter.isTargetOfAmbush) return;
  const oldX = fighter.x;
  const oldY = fighter.y;

  // Evasion angle: smooth backward flash-step away from attacker (no rapid zigzag)
  const angle = attacker ? (Math.atan2(fighter.y - attacker.y, fighter.x - attacker.x) + (Math.random() - 0.5) * 0.35) : (Math.random() * Math.PI * 2);
  const dist = (CONFIG.gojo?.teleportDodgeDistance ?? 85) + Math.random() * 15;

  let targetX = fighter.x + Math.cos(angle) * dist;
  let targetY = fighter.y + Math.sin(angle) * dist;

  if (arena) {
    targetX = Math.max(arena.x + fighter.r, Math.min(arena.x + arena.width - fighter.r, targetX));
    targetY = Math.max(arena.y + fighter.r, Math.min(arena.y + arena.height - fighter.r, targetY));
  }

  applyTeleportSlideBrake(fighter, oldX, oldY, targetX, targetY, arena);
  if (attacker) {
    fighter.aim(attacker);
    if (typeof attacker.aim === 'function' && !attacker.isTargetOfAmbush) {
      attacker.aim(fighter);
    }
  }

  spawnImpactFlash(oldX, oldY, 22, 'lightningTrail');
  const dashSnd = CONFIG.gojo?.sounds?.teleportDash || 'skill_dash3';
  const dashVol = CONFIG.gojo?.soundVolumes?.teleportDash ?? 0.8;
  audioSystem.playSFX(dashSnd, dashVol);
}
