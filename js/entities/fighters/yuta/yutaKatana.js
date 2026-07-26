// ─────────────────────────────────────────────
// YUTA OKKOTSU KATANA COMBAT MODULE
// Handles Katana melee hit detection and dynamic blade tip positioning
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../../graphics/particles/bloodEffect.js';
import { getBasicAttackSound } from '../../../soundEffects/basicAttackSounds.js';

export function modExecuteKatanaMelee(fighter, angle) {
  fighter.blockPoseTimer = 0; // Drop guard instantly if he swings
  fighter.meleeCooldown = fighter.meleeCooldownMax;
  fighter.targetAngle = angle;
  fighter.activeSlashType = (fighter.activeSlashType === undefined) ? 0 : (fighter.activeSlashType + 1) % 3;
  fighter.trailGenTimer = 40; // Generate trail at tip for 40 frames (~0.66s)

  // Play swing sound (using Fighter's standard delay queue)
  const swingSnd = getBasicAttackSound(fighter.id, fighter._def?.type);
  if (swingSnd) {
    fighter._attackSoundTimer = swingSnd.delay;
    fighter._attackSoundConfig = swingSnd;
  }

  const range = CONFIG.yuta.meleeRange || 75;
  const damage = CONFIG.yuta.meleeDamage || 15;
  const arc = CONFIG.yuta.meleeArc || (Math.PI / 2);

  let hitSomeone = false;
  const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));

  for (let i = 0; i < state.fighters.length; i++) {
    const enemy = state.fighters[i];
    if (!enemy || enemy.hp <= 0 || enemy === fighter || enemy.invincibilityTimer > 0) continue;

    const enemyTeam = state.getFighterTeam(i);
    if (myTeam !== null && enemyTeam !== null && myTeam === enemyTeam) continue;

    const dx = enemy.x - fighter.x;
    const dy = enemy.y - fighter.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= range + enemy.r) {
      const enemyAngle = Math.atan2(dy, dx);
      let angleDiff = Math.abs(enemyAngle - fighter.targetAngle);
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      angleDiff = Math.abs(angleDiff);

      if (angleDiff <= arc / 2) {
        const isRikaAlive = typeof fighter.isRikaAliveInDomain === 'function' && fighter.isRikaAliveInDomain();
        const dmgMult = isRikaAlive ? (CONFIG.yuta.domainRikaDamageMultiplier || 1.5) : 1.0;
        const finalDamage = damage * dmgMult;

        enemy.takeDamage(finalDamage, fighter, { isPhysical: true });
        hitSomeone = true;
        if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(4, 6);

        if (isRikaAlive) {
          spawnFloatingText(enemy.x, enemy.y - 20, `${Math.round(finalDamage)}!`, '#FF1493');
        }

        spawnImpactFlash(enemy.x, enemy.y, 25);
        spawnBloodEffect(enemy, 10, fighter.targetAngle);

        const pushForce = 5;
        enemy.vx += Math.cos(fighter.targetAngle) * pushForce;
        enemy.vy += Math.sin(fighter.targetAngle) * pushForce;

        // Check for clash with Gojo or Sukuna
        if (enemy._def && (enemy._def.id === 'sukuna' || enemy._def.name === 'SukunaFighter' || enemy._def.id === 'gojo' || enemy._def.name === 'GojoFighter' || enemy.type === 'sukuna')) {
          const midX = (fighter.x + enemy.x) / 2;
          const midY = (fighter.y + enemy.y) / 2;
          const isSukuna = (enemy._def?.id === 'sukuna' || enemy.type === 'sukuna' || enemy._def?.name === 'SukunaFighter');
          spawnMeleeClashShockwave(midX, midY, 100, isSukuna ? 'yuta' : 'gojo');
          triggerGlobalScreenShake(8, 10);
        }
      }
    }
  }

  if (hitSomeone) {
    // playSound(getBasicAttackSound('hit'), 0.5);
  } else {
    // playSound(getBasicAttackSound('miss'), 0.3);
  }
}

export function modGetKatanaTipPositions(fighter) {
  const maxCd = fighter.meleeCooldownMax;
  const isSwinging = (fighter.meleeCooldown > maxCd - 15);

  let currentAngle = fighter.gunAngle;
  const comboIndex = fighter.activeSlashType || 0;

  if (isSwinging) {
    const progress = (maxCd - fighter.meleeCooldown) / 15;
    if (comboIndex === 0) {
      currentAngle += (-Math.PI / 4) + (Math.PI / 2) * progress;
    } else if (comboIndex === 1) {
      currentAngle += (Math.PI / 4) - (Math.PI / 2) * progress;
    } else if (comboIndex === 2) {
      currentAngle += (-Math.PI * 0.6) + (Math.PI * 1.2) * progress;
    }
  }

  let tipX, tipY, innerX, innerY;

  if (fighter.rikaCallTimer > 0) {
    // Raised summoning pose for Katana when calling Rika
    const humAngle = Math.sin(Date.now() * 0.08) * 0.08;
    const humShift = Math.cos(Date.now() * 0.1) * 2;
    const callAngle = currentAngle - Math.PI * 0.35 + humAngle;

    const L = (fighter.r - 8 + humShift) + 81 * 1.2;
    tipX = fighter.x + Math.cos(callAngle) * L;
    tipY = fighter.y + Math.sin(callAngle) * L;

    const innerL = L - 25;
    innerX = fighter.x + Math.cos(callAngle) * innerL;
    innerY = fighter.y + Math.sin(callAngle) * innerL;
  } else if (fighter.blockPoseTimer > 0 && !isSwinging) {
    const parryType = fighter.parryType || 'guard';
    if (parryType === 'deflect') {
      const totalDur = CONFIG.yuta.parryGuardDuration || 90;
      const swingDur = 8; // Super fast deflect swing (8 frames)

      let swingProgress = Math.min(1.0, (totalDur - fighter.blockPoseTimer) / swingDur);
      let returnProgress = Math.max(0, (12 - fighter.blockPoseTimer) / 12); // Snappy return (12 frames)

      let deflectAngle = 0;
      let currentTranslateX = fighter.r - 10;

      if (swingProgress < 1.0) {
        deflectAngle = (Math.PI / 3.5) - (Math.PI * 0.6) * swingProgress;
        currentTranslateX = (fighter.r - 10) + 15 * swingProgress;
      } else {
        deflectAngle = (-Math.PI / 4) * (1 - returnProgress);
        currentTranslateX = (fighter.r - 10) + 15 * (1 - returnProgress);
      }

      const L = currentTranslateX + 81 * 1.2;
      const finalAngle = currentAngle + deflectAngle;

      tipX = fighter.x + Math.cos(finalAngle) * L;
      tipY = fighter.y + Math.sin(finalAngle) * L;

      const innerL = L - 25;
      innerX = fighter.x + Math.cos(finalAngle) * innerL;
      innerY = fighter.y + Math.sin(finalAngle) * innerL;
    } else {
      // Static Guard Pose: perpendicular guard
      const bladeAngle = currentAngle + Math.PI / 2;
      const baseDist = fighter.r - 18;
      const hiltX = fighter.x + Math.cos(currentAngle) * baseDist;
      const hiltY = fighter.y + Math.sin(currentAngle) * baseDist;

      const L = 81 * 1.2;
      tipX = hiltX + Math.cos(bladeAngle) * L;
      tipY = hiltY + Math.sin(bladeAngle) * L;

      const innerL = L - 25;
      innerX = hiltX + Math.cos(bladeAngle) * innerL;
      innerY = hiltY + Math.sin(bladeAngle) * innerL;
    }
  } else {
    // Normal / Swing position
    const flipY = (Math.abs(currentAngle) > Math.PI / 2) ? -1 : 1;

    // Exact transformed coordinates matching drawGun transforms
    const px = (fighter.r - 10) + 81 * 1.2;
    const py = -8.0 * 1.2 * flipY;

    tipX = fighter.x + Math.cos(currentAngle) * px - Math.sin(currentAngle) * py;
    tipY = fighter.y + Math.sin(currentAngle) * px + Math.cos(currentAngle) * py;

    const innerPx = (fighter.r - 10) + 52 * 1.2;
    const innerPy = -2.2 * 1.2 * flipY;

    innerX = fighter.x + Math.cos(currentAngle) * innerPx - Math.sin(currentAngle) * innerPy;
    innerY = fighter.y + Math.sin(currentAngle) * innerPx + Math.cos(currentAngle) * innerPy;
  }

  return {
    outer: { x: tipX, y: tipY },
    inner: { x: innerX, y: innerY }
  };
}
