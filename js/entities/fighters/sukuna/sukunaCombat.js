// ─────────────────────────────────────────────
// RYOMEN SUKUNA COMBAT & MOVEMENT MODULE
// Encapsulates melee martial arts combos and teleportation evasion/repositioning
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave, spawnAnimePunchImpactFrame } from '../../../graphics/particles/sparkEffect.js';
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
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const steps = isLowQuality ? Math.max(2, Math.floor(dist / 36)) : Math.max(4, Math.floor(dist / 12));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const maxTimer = 24 - Math.floor(t * 6);
    pushTrailCap(fighter.afterImages, {
      x: oldX + dx * t,
      y: oldY + dy * t,
      r: fighter.r || 25,
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

  let targetX, targetY;
  if (fighter.isMeleeMode && attacker && !attacker.isDead) {
    // In Melee Mode: Flash-step flank pivot to the side/behind attacker (stays inside melee reach!)
    const angleToAttacker = Math.atan2(fighter.y - attacker.y, fighter.x - attacker.x);
    const flankSign = Math.random() < 0.5 ? 1 : -1;
    const angle = angleToAttacker + flankSign * (Math.PI * 0.45);
    const dist = (attacker.r || 25) + fighter.r + 12;
    targetX = attacker.x + Math.cos(angle) * dist;
    targetY = attacker.y + Math.sin(angle) * dist;
  } else {
    // In Ranged Mode: Smooth backward flash-step away from attacker
    const angle = attacker ? (Math.atan2(fighter.y - attacker.y, fighter.x - attacker.x) + (Math.random() - 0.5) * 0.35) : (Math.random() * Math.PI * 2);
    const dist = (CONFIG.sukuna?.teleportDodgeDistance ?? 85) + Math.random() * 15;
    targetX = fighter.x + Math.cos(angle) * dist;
    targetY = fighter.y + Math.sin(angle) * dist;
  }

  if (arena) {
    targetX = Math.max(arena.x + fighter.r, Math.min(arena.x + arena.width - fighter.r, targetX));
    targetY = Math.max(arena.y + fighter.r, Math.min(arena.y + arena.height - fighter.r, targetY));
  }

  fighter.x = targetX;
  fighter.y = targetY;
  if (typeof fighter.aim === 'function' && attacker) fighter.aim(attacker);
  if (attacker && typeof attacker.aim === 'function' && !attacker.isTargetOfAmbush) {
    attacker.aim(fighter);
  }
  fighter.vx = 0;
  fighter.vy = 0;

  spawnFloatingText(oldX, oldY - fighter.r - 10, 'EVADE!', '#FF2400');
  spawnImpactFlash(oldX, oldY, 22, 'crimsonSniper');
  spawnImpactFlash(fighter.x, fighter.y, 22, 'crimsonSniper');
  const dashSnd = CONFIG.sukuna?.sounds?.teleportDash || 'Assets/Sound Effects/Skills/dash3.mp3';
  const dashVol = CONFIG.sukuna?.soundVolumes?.teleportDash ?? 0.8;
  audioSystem.playSFX(dashSnd, dashVol);

  spawnTeleportAfterimages(fighter, oldX, oldY, fighter.x, fighter.y);
}

export function teleportAwayFrom(fighter, opponent, arena) {
  if (!opponent || fighter.isTargetOfAmbush || (fighter.timeStopTimer || 0) > 0) return;
  const oldX = fighter.x;
  const oldY = fighter.y;

  const angle = Math.atan2(fighter.y - opponent.y, fighter.x - opponent.x) + (Math.random() - 0.5);
  const dist = CONFIG.sukuna?.comboDisengageDistance ?? 280;
  let targetX = opponent.x + Math.cos(angle) * dist;
  let targetY = opponent.y + Math.sin(angle) * dist;

  if (arena) {
    targetX = Math.max(arena.x + fighter.r, Math.min(arena.x + arena.width - fighter.r, targetX));
    targetY = Math.max(arena.y + fighter.r, Math.min(arena.y + arena.height - fighter.r, targetY));
  }

  fighter.x = targetX;
  fighter.y = targetY;
  if (typeof fighter.aim === 'function') fighter.aim(opponent);
  if (opponent && typeof opponent.aim === 'function' && !opponent.isTargetOfAmbush) {
    opponent.aim(fighter);
  }
  fighter.vx = 0;
  fighter.vy = 0;

  // Smooth mode switch to Ranged without freezing movement
  fighter.shootCooldown = Math.max(fighter.shootCooldown || 0, 15);

  spawnTeleportAfterimages(fighter, oldX, oldY, targetX, targetY);
  spawnImpactFlash(oldX, oldY, 20, 'crimsonSniper');
  spawnImpactFlash(fighter.x, fighter.y, 25, 'crimsonSniper');
  const disengageSnd = CONFIG.sukuna?.sounds?.teleportDash || 'Assets/Sound Effects/Skills/dash3.mp3';
  const disengageVol = CONFIG.sukuna?.soundVolumes?.teleportDash ?? 0.8;
  audioSystem.playSFX(disengageSnd, disengageVol);
}

export function updateMeleeCombat(fighter, opponent, arena, ownerIndex) {
  if (fighter.isChannelingDivineFlame || fighter.isChannelingDomainExpansion || (typeof fighter.isCaughtInBeam === 'function' && fighter.isCaughtInBeam())) {
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.punchAnimTimer = 0;
    fighter.punchActiveMaxTime = 0;
    return;
  }

  // Dynamic target selection in multi-enemy/1v2 mode: prioritize closest living enemy
  let activeTarget = opponent;
  const myTeam = state.getFighterTeam(state.fighters ? state.fighters.indexOf(fighter) : 0);
  let minDist = (activeTarget && activeTarget.hp > 0) ? Math.hypot(activeTarget.x - fighter.x, activeTarget.y - fighter.y) : Infinity;

  if (state.fighters && state.fighters.length > 1) {
    for (let i = 0; i < state.fighters.length; i++) {
      const f = state.fighters[i];
      if (f && f !== fighter && f.hp > 0) {
        const isEnemy = myTeam === null || state.getFighterTeam(i) !== myTeam;
        if (isEnemy) {
          const d = Math.hypot(f.x - fighter.x, f.y - fighter.y);
          if (d < minDist) {
            minDist = d;
            activeTarget = f;
          }
        }
      }
    }
  }

  opponent = activeTarget;

  const punchCooldown = CONFIG.sukuna?.meleePunchCooldown || 9;

  // Handle punch cooldown — zero velocity so Sukuna stands completely still when punching
  if (fighter.meleePunchCooldown > 0) {
    fighter.meleePunchCooldown--;
    fighter.vx = 0;
    fighter.vy = 0;
    return;
  }

  const isTojiOpponent = opponent && (opponent.characterId === 'toji' || opponent.type === 'toji' || opponent._def?.id === 'toji');
  if (!opponent || opponent.isDead || (opponent.isStealthed && !fighter.domainActive && !isTojiOpponent)) return;

  // Initialize combo state (matches Gojo's 3-6 punch rhythm)
  if (fighter.meleeComboCount === undefined) fighter.meleeComboCount = 0;
  if (!fighter.meleeComboTarget) fighter.meleeComboTarget = Math.random() < 0.5 ? 6 : 3;

  const distToOpponent = Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y);
  const punchReach = fighter.r + opponent.r + 45;
  const isOutOfReach = distToOpponent > punchReach;

  // If out of reach, do NOT chase or follow the enemy in melee mode
  if (isOutOfReach) {
    fighter.vx = 0;
    fighter.vy = 0;
    return; // Do NOT chase or follow when the enemy is out of melee range!
  }

  // Always aim directly at the opponent when punching
  if (typeof fighter.aim === 'function') fighter.aim(opponent);

  // Execute punch strike
  fighter.meleeComboCount++;
  fighter.martialArtsComboCount = (fighter.martialArtsComboCount || 0) + 1;
  const punchDuration = CONFIG.sukuna?.meleePunchAnimDuration || CONFIG.sukuna?.meleePunchCooldown || 9;
  fighter.punchAnimTimer = punchDuration;
  fighter.punchAnimMaxTimer = punchDuration;
  fighter.punchAnimHand = (fighter.punchAnimHand === 1 ? 0 : 1);
  fighter.slashSwingTimer = 0;

  const punchDamage = CONFIG.sukuna?.meleePunchDamage || CONFIG.sukuna?.slashDamage || 15;
  const punchAngle = (opponent && !opponent.isDead) ? Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x) : (fighter.gunAngle || 0);
  const reach = fighter.r + 80; // Extended reach to ensure hits connect cleanly
  const arc = Math.PI * 0.5; // 90 degree frontal punch arc

  const validTargets = [];

  const allEntities = [
    ...(state.fighters || []),
    ...(state.illusions || [])
  ];

  for (const ent of allEntities) {
    if (!ent || ent.hp <= 0 || ent === fighter || (ent.invincibilityTimer || 0) > 0 || ent.owner === fighter) continue;

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

  // Set melee punch cooldown
  fighter.meleePunchCooldown = punchCooldown;

  for (const target of validTargets) {
    let finalDmg = punchDamage;
    let isCrit = false;
    if (typeof fighter.evaluateSlashCrit === 'function') {
      const res = fighter.evaluateSlashCrit(target, punchDamage, { isMelee: true });
      finalDmg = res.finalDamage;
      isCrit = res.isCrit;
    }
    // Pass isSkill: true (matching Gojo) to bypass basic attack flinch lock and allow dynamic target tracking
    target.takeDamage(finalDmg, fighter, { isMelee: true, isSukunaSlash: true, isCrit, isSkill: true });
    if (target && typeof target.aim === 'function' && !target.isTargetOfAmbush) {
      target.aim(fighter);
    }

    // Manga Spiky Crescent Impact Frame (matching Sukuna's crimson skin/cursed theme)
    spawnAnimePunchImpactFrame(target.x, target.y, 55, punchAngle, 'crimson');
  }

  triggerGlobalScreenShake(4, 5);

  // Check for brawler clash shockwave (when both are in melee range)
  const isBrawlerOpponent = opponent && !opponent.isDead && (opponent.characterId === 'gojo' || opponent.characterId === 'saitama' || opponent.characterId === 'yuji' || opponent.characterId === 'todo' || opponent._def?.id === 'gojo');
  if (isBrawlerOpponent) {
    if (!fighter.meleeClashCooldown) fighter.meleeClashCooldown = 0;
    if (fighter.meleeClashCooldown <= 0) {
      const midX = (fighter.x + opponent.x) / 2;
      const midY = (fighter.y + opponent.y) / 2;
      spawnMeleeClashShockwave(midX, midY, 100, 'gojo');
      triggerGlobalScreenShake(8, 10);
      fighter.meleeClashCooldown = 30;
    }
  }

  if (!fighter._slashSoundCooldown || fighter._slashSoundCooldown <= 0) {
    const punchSnd = CONFIG.sukuna?.sounds?.punch || 'Assets/Sound Effects/Attacks/punch.mp3';
    const punchVol = CONFIG.sukuna?.soundVolumes?.punch ?? 2.8;
    audioSystem.playSFX(punchSnd, punchVol);
    fighter._slashSoundCooldown = 8;
  }

  // Reset combo counter and DISENGAGE to ranged mode when combo target is reached
  if (fighter.meleeComboCount >= fighter.meleeComboTarget) {
    fighter.meleeComboCount = 0;
    fighter.meleeComboTarget = Math.random() < 0.5 ? 6 : 3;

    if (!fighter.domainActive && (fighter.forcedMeleeTimer || 0) <= 0) {
      fighter.isMeleeMode = false;
      fighter.meleeModeCooldown = CONFIG.sukuna?.meleeModeCooldown ?? 120; // Mandatory ranged separation!
    }
  }

  if (typeof fighter.resolveWallBounce === 'function') fighter.resolveWallBounce(arena);
}
