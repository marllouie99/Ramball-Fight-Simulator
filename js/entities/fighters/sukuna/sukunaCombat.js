// ─────────────────────────────────────────────
// RYOMEN SUKUNA COMBAT & MOVEMENT MODULE
// Encapsulates melee martial arts combos and teleportation evasion/repositioning
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../../graphics/particles/sparkEffect.js';
import { playSound } from '../../../systems/soundSystem.js';
import { pushTrailCap } from '../../../graphics/particles/visualTrailSystem.js';
import { getBasicAttackSound } from '../../../soundEffects/basicAttackSounds.js';

export function spawnTeleportAfterimages(fighter, oldX, oldY, targetX, targetY) {
  if (!fighter.afterImages) fighter.afterImages = [];
  const dx = targetX - oldX;
  const dy = targetY - oldY;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;

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
    }, 30);
  }
}

export function executeTeleportDodge(fighter, attacker, arena) {
  if (fighter.isDead) return;
  const oldX = fighter.x;
  const oldY = fighter.y;

  const angle = attacker ? (Math.atan2(fighter.y - attacker.y, fighter.x - attacker.x) + (Math.random() < 0.5 ? 1.2 : -1.2)) : (Math.random() * Math.PI * 2);
  const dist = (CONFIG.sukuna?.teleportDodgeDistance ?? 85) + Math.random() * 20;

  let targetX = fighter.x + Math.cos(angle) * dist;
  let targetY = fighter.y + Math.sin(angle) * dist;

  if (arena) {
    targetX = Math.max(arena.x + fighter.r, Math.min(arena.x + arena.width - fighter.r, targetX));
    targetY = Math.max(arena.y + fighter.r, Math.min(arena.y + arena.height - fighter.r, targetY));
  }

  fighter.x = targetX;
  fighter.y = targetY;
  if (typeof fighter.aim === 'function' && attacker) fighter.aim(attacker);
  fighter.vx = 0;
  fighter.vy = 0;

  spawnFloatingText(oldX, oldY - fighter.r - 10, 'EVADE!', '#FF2400');
  spawnImpactFlash(oldX, oldY, 22, 'crimsonSniper');
  spawnImpactFlash(fighter.x, fighter.y, 22, 'crimsonSniper');
  playSound('Assets/Sound Effects/Skills/dash3.mp3', 0.8);

  spawnTeleportAfterimages(fighter, oldX, oldY, fighter.x, fighter.y);
}

export function teleportAwayFrom(fighter, opponent, arena) {
  if (!opponent) return;
  const oldX = fighter.x;
  const oldY = fighter.y;

  const angle = Math.atan2(fighter.y - opponent.y, fighter.x - opponent.x) + (Math.random() - 0.5);
  const dist = CONFIG.sukuna?.comboDisengageDistance ?? 300;
  let targetX = opponent.x + Math.cos(angle) * dist;
  let targetY = opponent.y + Math.sin(angle) * dist;

  if (arena) {
    targetX = Math.max(arena.x + fighter.r, Math.min(arena.x + arena.width - fighter.r, targetX));
    targetY = Math.max(arena.y + fighter.r, Math.min(arena.y + arena.height - fighter.r, targetY));
  }

  fighter.x = targetX;
  fighter.y = targetY;
  if (typeof fighter.aim === 'function') fighter.aim(opponent);
  fighter.vx = 0;
  fighter.vy = 0;

  spawnImpactFlash(oldX, oldY, 20, 'crimsonSniper');
  spawnImpactFlash(fighter.x, fighter.y, 25, 'crimsonSniper');
  playSound('Assets/Sound Effects/Skills/dash3.mp3', 0.8);
}

export function updateMeleeCombat(fighter, opponent, arena, ownerIndex) {
  const punchCooldown = CONFIG.sukuna?.meleePunchCooldown || 12;

  if (fighter.meleePunchCooldown > 0) {
    fighter.meleePunchCooldown--;
    if (opponent && !opponent.isDead && fighter.meleeComboCount > 0) {
      const dx = opponent.x - fighter.x;
      const dy = opponent.y - fighter.y;
      const dist = Math.hypot(dx, dy);
      if (dist > fighter.r + opponent.r + 5) {
        fighter.vx += (dx / dist) * 0.5;
        fighter.vy += (dy / dist) * 0.5;
      }
    }
    return;
  }

  const isTojiOpponent = opponent && (opponent.characterId === 'toji' || opponent.type === 'toji' || opponent._def?.id === 'toji');
  if (!opponent || opponent.isDead || (opponent.isStealthed && !fighter.domainActive && !isTojiOpponent)) return;

  if (fighter.meleeComboCount === undefined) fighter.meleeComboCount = 0;
  if (fighter.meleeComboTarget === undefined) fighter.meleeComboTarget = Math.random() < 0.35 ? 4 : 3;

  const oldX = fighter.x;
  const oldY = fighter.y;

  const angleToOpponent = Math.random() * Math.PI * 2;
  const behindOffset = opponent.r + fighter.r + 8;
  let targetX = opponent.x - Math.cos(angleToOpponent) * behindOffset;
  let targetY = opponent.y - Math.sin(angleToOpponent) * behindOffset;

  if (arena) {
    targetX = Math.max(arena.x + fighter.r, Math.min(arena.x + arena.width - fighter.r, targetX));
    targetY = Math.max(arena.y + fighter.r, Math.min(arena.y + arena.height - fighter.r, targetY));
  }

  fighter.x = targetX;
  fighter.y = targetY;
  if (typeof fighter.aim === 'function') fighter.aim(opponent);

  fighter.vx = 0;
  fighter.vy = 0;
  playSound('Assets/Sound Effects/Skills/dash3.mp3', 0.6);

  fighter.meleeComboCount++;
  fighter.martialArtsComboCount = (fighter.martialArtsComboCount || 0) + 1;

  const slashDamage = CONFIG.sukuna?.slashDamage ?? fighter.damage;
  opponent.takeDamage(slashDamage, fighter, { isMelee: true });
  if (typeof opponent.applyHitStun === 'function') opponent.applyHitStun(12);
  spawnSparks(opponent.x, opponent.y, 15, 'crimsonSniper', '#8B0000');
  triggerGlobalScreenShake(4, 5);

  const martialArtsAngle = Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x);

  fighter.sakugaImpactTimer = 6;
  fighter.sakugaImpactMaxTimer = 6;
  fighter.sakugaImpactX = opponent.x;
  fighter.sakugaImpactY = opponent.y;
  fighter.sakugaImpactAngle = Math.random() * Math.PI * 2;
  fighter.sakugaImpactSeed = Math.random();

  fighter.punchAnimTimer = 16;
  fighter.punchAnimHand = fighter.punchAnimHand === 1 ? 0 : 1;

  if (!fighter.punchEffects) fighter.punchEffects = [];
  fighter.punchEffects.push({
    x: opponent.x,
    y: opponent.y,
    angle: martialArtsAngle,
    timer: 12,
    maxTimer: 12
  });

  if (opponent._def && (opponent._def.id === 'gojo' || opponent._def.name === 'GojoFighter' || opponent._def.id === 'yuta' || opponent._def.name === 'YutaFighter' || opponent.type === 'yuta')) {
    if (!fighter.meleeClashCooldown) fighter.meleeClashCooldown = 0;
    if (fighter.meleeClashCooldown <= 0) {
      const midX = (fighter.x + opponent.x) / 2;
      const midY = (fighter.y + opponent.y) / 2;
      const isYuta = (opponent._def?.id === 'yuta' || opponent.type === 'yuta' || opponent._def?.name === 'YutaFighter');
      spawnMeleeClashShockwave(midX, midY, 100, isYuta ? 'yuta' : 'gojo');
      triggerGlobalScreenShake(8, 10);
      fighter.meleeClashCooldown = 30;
    }
  }

  opponent.vx += Math.cos(martialArtsAngle) * 2;
  opponent.vy += Math.sin(martialArtsAngle) * 2;

  spawnFloatingText(fighter.x, fighter.y - fighter.r - 25, 'MARTIAL ARTS', '#8B0000');

  const attackSound = getBasicAttackSound(null, 'sukuna_melee');
  if (attackSound) playSound(attackSound.src, attackSound.volume * 0.8);

  if (typeof opponent.applyTimeStop === 'function') opponent.applyTimeStop(5);

  fighter.meleePunchCooldown = punchCooldown;

  if (fighter.meleeComboCount >= fighter.meleeComboTarget) {
    fighter.meleeComboCount = 0;
    fighter.meleeComboTarget = Math.random() < 0.35 ? 4 : 3;

    if (!fighter.domainActive && (fighter.flurryHitsLeft || 0) <= 0) {
      fighter.isMeleeMode = false;
      fighter.meleeModeCooldown = CONFIG.sukuna?.meleeModeSeparationCooldown ?? 240;
      if (opponent && !opponent.isDead) {
        teleportAwayFrom(fighter, opponent, arena);
      }
    }
  }

  if (typeof fighter.resolveWallBounce === 'function') fighter.resolveWallBounce(arena);
}
