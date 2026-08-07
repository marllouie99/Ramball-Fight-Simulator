// ─────────────────────────────────────────────
// SATORU GOJO COMBAT DEFENSE & TELEPORT MODULE
// Encapsulates Infinity passive barrier defense and teleport evasion
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { pushTrailCap } from '../../../graphics/particles/visualTrailSystem.js';

export function triggerInfinityBlock(fighter, hitX, hitY, attacker) {
  if (fighter.isMeleeMode || (fighter.infinityCooldown > 0 && (fighter.infinityActiveTimer || 0) <= 0)) return false;
  
  if ((fighter.infinityActiveTimer || 0) <= 0) {
    fighter.infinityActiveTimer = CONFIG.gojo?.infinityActiveDuration ?? 60;
  }

  fighter.infinityBlockTimer = 25;
  fighter.infinityBlockMaxTimer = 25;
  fighter.infinityBlockX = hitX !== undefined ? hitX : fighter.x;
  fighter.infinityBlockY = hitY !== undefined ? hitY : fighter.y;

  spawnFloatingText(fighter.x, fighter.y - fighter.r - 20, 'INFINITY', '#E0FFFF');
  triggerGlobalScreenShake(3, 6);
 
  // Spawn visual barrier rebound ring effect at the impact position
  if (typeof spawnMeleeClashShockwave === 'function') {
    const impactX = hitX !== undefined ? hitX : fighter.x;
    const impactY = hitY !== undefined ? hitY : fighter.y;
    spawnMeleeClashShockwave(impactX, impactY, 75, 'gojo_infinity');
  }

  if (attacker && attacker !== fighter) {
    if (attacker.isChannelingDomain || attacker.isChannelingDomainExpansion) {
      // Domain Channeling has supreme domain hyper-armor — bypasses Infinity block completely!
      return false;
    }
    if (attacker.characterId !== 'toji' && attacker.type !== 'toji' && !attacker.domainImmunity) {
      if (attacker.type === 'mahoraga' || attacker.characterId === 'mahoraga') {
        const hasAdapted = attacker.adapted?.melee || attacker.gojoInfinityImmune || attacker.isMaxAdapted;
        if (hasAdapted) {
          // Mahoraga adapted to Limitless — bypasses Infinity block completely!
          return false;
        }
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
      const pushForce = CONFIG.gojo?.infinityMeleePushForce ?? 10.5; // Strong clean bounce impulse from config
      const isImmovable = fighter.isChannelingPurple || fighter.isChannelingDomainExpansion || fighter.domainActive;

      // Push the attacker back with strong outward velocity
      attacker.vx = nx * pushForce;
      attacker.vy = ny * pushForce;

      // Push Gojo back slightly in the opposite direction (if not performing major techniques/skills)
      if (!isImmovable) {
        fighter.vx = -nx * (pushForce * 0.4);
        fighter.vy = -ny * (pushForce * 0.4);
      }
      
      // Resolve spatial overlap instantly to snap/slide attacker outside the barrier radius
      const barrierRadius = CONFIG.gojo?.infinityRadius ?? (fighter.r + 30);
      const attRadius = attacker.r || 25;
      const minDist = attRadius + barrierRadius;
      const overlap = minDist - dist;

      if (overlap > 0) {
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
  fighter.teleportSlideTimer = 6;

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
  const dist = (CONFIG.gojo?.teleportDodgeDistance ?? 75) + Math.random() * 15;

  let targetX = fighter.x + Math.cos(angle) * dist;
  let targetY = fighter.y + Math.sin(angle) * dist;

  if (arena) {
    targetX = Math.max(arena.x + fighter.r, Math.min(arena.x + arena.width - fighter.r, targetX));
    targetY = Math.max(arena.y + fighter.r, Math.min(arena.y + arena.height - fighter.r, targetY));
  }

  applyTeleportSlideBrake(fighter, oldX, oldY, targetX, targetY, arena);
  if (attacker) {
    fighter.aim(attacker);
  }

  spawnFloatingText(oldX, oldY - fighter.r - 10, 'EVADE!', '#00BFFF');
  spawnImpactFlash(oldX, oldY, 22, 'lightningTrail');
  spawnImpactFlash(fighter.x, fighter.y, 22, 'lightningTrail');
  audioSystem.playSFX('skill_dash3', 0.8);
}
