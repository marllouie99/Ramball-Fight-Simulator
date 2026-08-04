// ─────────────────────────────────────────────
// RYOMEN SUKUNA COMBAT & MOVEMENT MODULE
// Encapsulates melee martial arts combos and teleportation evasion/repositioning
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';
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
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5) || (state.fps && state.fps < 52)));
  const steps = isLowQuality ? Math.max(2, Math.floor(dist / 36)) : Math.max(4, Math.floor(dist / 12));
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
  if (fighter.isDead || fighter.isTargetOfAmbush) return;
  const oldX = fighter.x;
  const oldY = fighter.y;

  // Evasion angle: smooth backward flash-step away from attacker (no rapid zigzag)
  const angle = attacker ? (Math.atan2(fighter.y - attacker.y, fighter.x - attacker.x) + (Math.random() - 0.5) * 0.35) : (Math.random() * Math.PI * 2);
  const dist = (CONFIG.sukuna?.teleportDodgeDistance ?? 75) + Math.random() * 15;

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
  audioSystem.playSFX('skill_dash3', 0.8);

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

  spawnTeleportAfterimages(fighter, oldX, oldY, targetX, targetY);
  spawnImpactFlash(oldX, oldY, 20, 'crimsonSniper');
  spawnImpactFlash(fighter.x, fighter.y, 25, 'crimsonSniper');
  audioSystem.playSFX('skill_dash3', 0.8);
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

  const distToOpponent = Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y);
  const attackReach = fighter.r + opponent.r + 35;
  const isOutOfReach = distToOpponent > attackReach;
  
  const isInitialMove = !fighter.initialTeleportDone;
  if (isInitialMove && !isOutOfReach) {
    fighter.initialTeleportDone = true;
  }

  const shouldTeleport = !isInitialMove && (isOutOfReach || (fighter.meleeComboCount % (fighter.meleeComboTarget || 1) === 0));

  if (shouldTeleport) {
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
    spawnTeleportAfterimages(fighter, oldX, oldY, targetX, targetY);
    spawnImpactFlash(oldX, oldY, 20, 'crimsonSniper');
    spawnImpactFlash(fighter.x, fighter.y, 25, 'crimsonSniper');
    audioSystem.playSFX('skill_dash3', 0.6);
  } else {
    if (typeof fighter.aim === 'function') fighter.aim(opponent);
    
    // Fallback normal movement if out of reach but not teleporting (e.g. during initial round start)
    if (isOutOfReach) {
      const dx = opponent.x - fighter.x;
      const dy = opponent.y - fighter.y;
      const d = distToOpponent || 1;
      fighter.vx = (dx / d) * (fighter.speed || 4.5);
      fighter.vy = (dy / d) * (fighter.speed || 4.5);
    }
  }

  fighter.meleeComboCount++;
  fighter.martialArtsComboCount = (fighter.martialArtsComboCount || 0) + 1;

  const slashDamage = CONFIG.sukuna?.slashDamage ?? fighter.damage;
  const punchAngle = (opponent && !opponent.isDead) ? Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x) : (fighter.gunAngle || 0);
  const reach = fighter.r + 65;
  const arc = Math.PI * 0.5; // 90 degree frontal punch arc

  const validTargets = [];
  const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));

  const allEntities = [
    ...(state.fighters || []),
    ...(state.illusions || [])
  ];

  for (const ent of allEntities) {
    if (!ent || ent.hp <= 0 || ent === fighter || (ent.invincibilityTimer || 0) > 0 || ent.isRika || ent.owner === fighter) continue;

    if (ent.owner) {
      const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
      if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
    } else {
      const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
      if (myTeam !== null && entTeam !== null && myTeam === entTeam) continue;
    }

    const dx = ent.x - fighter.x;
    const dy = ent.y - fighter.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= reach + (ent.r || 20)) {
      const entAngle = Math.atan2(dy, dx);
      let angleDiff = Math.abs(entAngle - punchAngle);
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      angleDiff = Math.abs(angleDiff);

      if (angleDiff <= arc / 2) {
        validTargets.push(ent);
      }
    }
  }

  if (validTargets.length === 0 && opponent && !opponent.isDead) {
    validTargets.push(opponent);
  }

  for (const target of validTargets) {
    target.takeDamage(slashDamage, fighter, { isMelee: true });
    if (typeof target.applyHitStun === 'function') target.applyHitStun(12);
    spawnSparks(target.x, target.y, 15, 'crimsonSniper', '#8B0000');

    const pushForce = 4;
    target.vx += Math.cos(punchAngle) * pushForce;
    target.vy += Math.sin(punchAngle) * pushForce;
  }

  triggerGlobalScreenShake(4, 5);

  const primaryTarget = validTargets[0] || opponent;
  if (primaryTarget) {
    fighter.sakugaImpactTimer = 6;
    fighter.sakugaImpactMaxTimer = 6;
    fighter.sakugaImpactX = primaryTarget.x;
    fighter.sakugaImpactY = primaryTarget.y;
    fighter.sakugaImpactAngle = Math.random() * Math.PI * 2;
    fighter.sakugaImpactSeed = Math.random();
  }

  fighter.punchAnimTimer = 16;
  fighter.punchAnimHand = fighter.punchAnimHand === 1 ? 0 : 1;

  if (!fighter.punchEffects) fighter.punchEffects = [];
  fighter.punchEffects.push({
    x: opponent.x,
    y: opponent.y,
    angle: punchAngle,
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

  opponent.vx += Math.cos(punchAngle) * 2;
  opponent.vy += Math.sin(punchAngle) * 2;

  spawnFloatingText(fighter.x, fighter.y - fighter.r - 25, 'MARTIAL ARTS', '#8B0000');

  const attackSound = getBasicAttackSound(null, 'sukuna_melee');
  if (attackSound) audioSystem.playSFX(attackSound.src, attackSound.volume * 0.8);

  // Time stop removed here so it does not cancel ultimates / domain channeling via hard CC!
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
