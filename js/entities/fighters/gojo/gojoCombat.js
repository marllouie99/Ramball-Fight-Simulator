// ─────────────────────────────────────────────
// SATORU GOJO COMBAT DEFENSE & TELEPORT MODULE
// Encapsulates Infinity passive barrier defense and teleport evasion
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { spawnSparks, spawnImpactFlash } from '../../../graphics/particles/sparkEffect.js';
import { playSound } from '../../../systems/soundSystem.js';
import { pushTrailCap } from '../../../graphics/particles/visualTrailSystem.js';

export function triggerInfinityBlock(fighter, hitX, hitY, attacker) {
  if (fighter.infinityCooldown > 0) return false;
  fighter.infinityCooldown = CONFIG.gojo?.infinityCooldown ?? 240;
  fighter.infinityActive = false;
  fighter.infinityBlockTimer = 25;
  fighter.infinityBlockMaxTimer = 25;
  fighter.infinityBlockX = hitX !== undefined ? hitX : fighter.x;
  fighter.infinityBlockY = hitY !== undefined ? hitY : fighter.y;

  spawnFloatingText(fighter.x, fighter.y - fighter.r - 20, 'INFINITY', '#E0FFFF');
  spawnImpactFlash(fighter.infinityBlockX, fighter.infinityBlockY, 40, 'lightningTrail');
  spawnSparks(fighter.infinityBlockX, fighter.infinityBlockY, 15, 'lightningTrail', '#E0FFFF');
  triggerGlobalScreenShake(3, 6);

  if (attacker && typeof attacker.applyTimeStop === 'function') {
    if (attacker.characterId !== 'toji' && attacker.type !== 'toji' && !attacker.domainImmunity) {
      attacker.applyTimeStop(CONFIG.gojo?.infinityMeleeFreezeDuration ?? 45);
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
  const slideSpeed = 13.5;

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
  fighter.teleportSlideTimer = 10;

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
  if (fighter.isDead) return;
  const oldX = fighter.x;
  const oldY = fighter.y;

  const angle = attacker ? (Math.atan2(fighter.y - attacker.y, fighter.x - attacker.x) + (Math.random() < 0.5 ? 1.2 : -1.2)) : (Math.random() * Math.PI * 2);
  const dist = (CONFIG.gojo?.teleportDodgeDistance ?? 85) + Math.random() * 20;

  let targetX = fighter.x + Math.cos(angle) * dist;
  let targetY = fighter.y + Math.sin(angle) * dist;

  if (arena) {
    targetX = Math.max(arena.x + fighter.r, Math.min(arena.x + arena.width - fighter.r, targetX));
    targetY = Math.max(arena.y + fighter.r, Math.min(arena.y + arena.height - fighter.r, targetY));
  }

  applyTeleportSlideBrake(fighter, oldX, oldY, targetX, targetY, arena);

  spawnFloatingText(oldX, oldY - fighter.r - 10, 'EVADE!', '#00BFFF');
  spawnImpactFlash(oldX, oldY, 22, 'lightningTrail');
  spawnImpactFlash(fighter.x, fighter.y, 22, 'lightningTrail');
  playSound('Assets/Sound Effects/Skills/dash3.mp3', 0.8);
}
