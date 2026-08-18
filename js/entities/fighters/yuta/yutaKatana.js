import { audioSystem } from '../../../systems/audioSystem.js';
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
  if (fighter.isChannelingPureLoveBeam || fighter.isFiringPureLoveBeam || fighter.isChannelingDomain) return;
  fighter.blockPoseTimer = 0; // Drop guard instantly if he swings
  fighter.meleeCooldown = fighter.meleeCooldownMax;
  fighter.targetAngle = angle;
  fighter.activeSlashType = (fighter.activeSlashType === undefined) ? 0 : (fighter.activeSlashType + 1) % 3;
  fighter.trailGenTimer = 40; // Generate trail at tip for 40 frames (~0.66s)

  // Remove any active slow debuff on Yuta when swinging basic attack
  fighter.slowTimer = 0;
  fighter.slowMultiplier = 1.0;
  if (fighter.statusEffects) {
    fighter.statusEffects.slowTimer = 0;
    if (fighter.statusEffects.fighter) {
      fighter.statusEffects.fighter.slowTimer = 0;
    }
  }

  // Play swing sound (using Yuta's config and Fighter's standard delay queue)
  const swingSnd = {
    src: CONFIG.yuta?.katanaSwingSound || 'Assets/Sound Effects/Attacks/swordswing.mp3',
    volume: CONFIG.yuta?.katanaSwingVolume ?? 0.7,
    delay: CONFIG.yuta?.katanaSwingDelay ?? 0
  };
  if (swingSnd.src) {
    fighter._attackSoundTimer = swingSnd.delay;
    fighter._attackSoundConfig = swingSnd;
  }

  const range = CONFIG.yuta.meleeRange || 70;
  const bonusDmg = fighter.pureLoveBeamBonusDamage || 0;
  const damage = (CONFIG.yuta.meleeDamage || 15) + bonusDmg;
  const arc = CONFIG.yuta.meleeArc || (Math.PI * 0.75);

  let hitSomeone = false;
  const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));
  const validTargets = [];

  // Collect all enemy fighters in frontal Katana blade arc
  if (state.fighters) {
    for (let i = 0; i < state.fighters.length; i++) {
      const enemy = state.fighters[i];
      if (!enemy || enemy.hp <= 0 || enemy === fighter || enemy.invincibilityTimer > 0 || (enemy.vanishTimer && enemy.vanishTimer > 0)) continue;

      const enemyTeam = state.getFighterTeam(i);
      if (myTeam !== null && enemyTeam !== null && myTeam === enemyTeam) continue;

      const dx = enemy.x - fighter.x;
      const dy = enemy.y - fighter.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= fighter.r + enemy.r + range) {
        const enemyAngle = Math.atan2(dy, dx);
        const angleDiff = Math.abs(Math.atan2(Math.sin(enemyAngle - fighter.targetAngle), Math.cos(enemyAngle - fighter.targetAngle)));

        if (angleDiff <= arc / 2) {
          validTargets.push(enemy);
        }
      }
    }
  }

  // Collect all enemy illusions & minions in frontal Katana blade arc
  if (state.illusions) {
    for (const ill of state.illusions) {
      if (!ill || ill.hp <= 0 || ill.owner === fighter || ill.isRika || (ill.vanishTimer && ill.vanishTimer > 0)) continue;
      if (myTeam !== null && ill.owner && state.getFighterTeam(state.fighters.indexOf(ill.owner)) === myTeam) continue;

      const dx = ill.x - fighter.x;
      const dy = ill.y - fighter.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= fighter.r + (ill.r || 20) + range) {
        const enemyAngle = Math.atan2(dy, dx);
        const angleDiff = Math.abs(Math.atan2(Math.sin(enemyAngle - fighter.targetAngle), Math.cos(enemyAngle - fighter.targetAngle)));

        if (angleDiff <= arc / 2) {
          validTargets.push(ill);
        }
      }
    }
  }

  const isRikaAlive = typeof fighter.isRikaAliveInDomain === 'function' && fighter.isRikaAliveInDomain();
  const dmgMult = typeof fighter.getRikaDamageMultiplier === 'function' ? fighter.getRikaDamageMultiplier() : (isRikaAlive ? (CONFIG.yuta.domainRikaDamageMultiplier || 1.5) : 1.0);
  const finalDamage = damage * dmgMult;

  for (const enemy of validTargets) {
    enemy.takeDamage(finalDamage, fighter, { isPhysical: true });
    hitSomeone = true;

    if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(4, 6);

    if (isRikaAlive) {
      spawnFloatingText(enemy.x, enemy.y - 20, `${Math.round(finalDamage)}!`, '#FF1493');
    }

    spawnImpactFlash(enemy.x, enemy.y, 25);
    spawnBloodEffect(enemy, 10, fighter.targetAngle);

    const pushForce = CONFIG.yuta?.meleeKnockback || 6.5;
    const kbX = Math.cos(fighter.targetAngle) * pushForce;
    const kbY = Math.sin(fighter.targetAngle) * pushForce;
    if (typeof enemy.applyKnockback === 'function') {
      enemy.applyKnockback(kbX, kbY);
    } else {
      enemy.vx += kbX;
      enemy.vy += kbY;
    }
    if (typeof enemy.applyHitStun === 'function') enemy.applyHitStun(CONFIG.yuta?.meleeHitStun || 12);

    // Check for clash with Gojo or Sukuna
    if (enemy._def && (enemy._def.id === 'sukuna' || enemy._def.name === 'SukunaFighter' || enemy._def.id === 'gojo' || enemy._def.name === 'GojoFighter' || enemy.type === 'sukuna')) {
      const midX = (fighter.x + enemy.x) / 2;
      const midY = (fighter.y + enemy.y) / 2;
      const isSukuna = (enemy._def?.id === 'sukuna' || enemy.type === 'sukuna' || enemy._def?.name === 'SukunaFighter');
      spawnMeleeClashShockwave(midX, midY, 100, isSukuna ? 'yuta' : 'gojo');
      triggerGlobalScreenShake(8, 10);
    }
  }

  if (hitSomeone) {
    // audioSystem.playSFX(getBasicAttackSound('hit'), 0.5);
  } else {
    // audioSystem.playSFX(getBasicAttackSound('miss'), 0.3);
  }
}

export function modGetKatanaTipPositions(fighter) {
  const maxCd = fighter.meleeCooldownMax;
  const swingDuration = 20;
  const recoveryDuration = 16;
  const isFlurrySwinging = (fighter.flurrySlashTimer > 0);
  const isSwinging = isFlurrySwinging || ((fighter.meleeCooldown > maxCd - (swingDuration + recoveryDuration)) && (fighter.meleeCooldown <= maxCd));

  const targetOrGun = (isSwinging && fighter.targetAngle !== undefined) ? fighter.targetAngle : (fighter.gunAngle || 0);
  const facingLeft = Math.abs(targetOrGun) > Math.PI / 2;
  const baseAngle = facingLeft ? Math.PI : 0;
  let diff = targetOrGun - baseAngle;
  let normDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
  if (facingLeft) {
    normDiff = -normDiff;
  }

  let localWeaponAngle = 0;
  const comboIndex = fighter.activeSlashType || 0;
  const easeOutCubic = (t) => 1.0 - Math.pow(1.0 - t, 3);

  if (isFlurrySwinging) {
    const maxF = 14;
    const p = Math.min(1.0, Math.max(0, (maxF - fighter.flurrySlashTimer) / maxF));
    const easedP = 1.0 - Math.pow(1.0 - p, 2.2);
    if (comboIndex === 0) {
      localWeaponAngle = (-Math.PI * 0.45) + (Math.PI * 0.90) * easedP;
    } else if (comboIndex === 1) {
      localWeaponAngle = (Math.PI * 0.45) - (Math.PI * 0.90) * easedP;
    } else {
      localWeaponAngle = (-Math.PI * 0.65) + (Math.PI * 1.30) * easedP;
    }
  } else if (isSwinging) {
    const elapsed = maxCd - fighter.meleeCooldown;
    if (elapsed <= swingDuration) {
      const p = Math.min(1.0, elapsed / swingDuration);

      if (comboIndex === 0) {
        if (p < 0.20) {
          const w = p / 0.20;
          localWeaponAngle = normDiff + (-Math.PI * 0.45 - normDiff) * Math.sin(w * Math.PI * 0.5);
        } else {
          const s = (p - 0.20) / 0.80;
          const easedS = 1.0 - Math.pow(1.0 - s, 2.2);
          localWeaponAngle = (-Math.PI * 0.45) + (Math.PI * 1.10) * easedS;
        }
      } else if (comboIndex === 1) {
        const easedP = 1.0 - Math.pow(1.0 - p, 2.2);
        localWeaponAngle = (Math.PI * 0.65) - (Math.PI * 1.20) * easedP;
      } else if (comboIndex === 2) {
        if (p < 0.15) {
          const w = p / 0.15;
          localWeaponAngle = (-Math.PI * 0.55) + (-Math.PI * 0.30) * Math.sin(w * Math.PI * 0.5);
        } else {
          const s = (p - 0.15) / 0.85;
          const easedS = 1.0 - Math.pow(1.0 - s, 2.2);
          localWeaponAngle = (-Math.PI * 0.85) + (Math.PI * 1.70) * easedS;
        }
      }
    } else {
      const recP = Math.min(1.0, (elapsed - swingDuration) / recoveryDuration);
      const easeRec = recP * (2 - recP);
      let endAngle = Math.PI * 0.65;
      if (comboIndex === 1) endAngle = -Math.PI * 0.55;
      else if (comboIndex === 2) endAngle = Math.PI * 0.85;

      localWeaponAngle = endAngle * (1.0 - easeRec) + normDiff * easeRec;
    }
  } else {
    localWeaponAngle = normDiff;
  }

  // Project local coordinates (lx, ly) to world space matching drawGun
  const projectLocal = (lx, ly) => {
    const cosL = Math.cos(localWeaponAngle);
    const sinL = Math.sin(localWeaponAngle);
    let rx = lx * cosL - ly * sinL;
    let ry = lx * sinL + ly * cosL;

    if (facingLeft) {
      ry = -ry;
    }

    const cosB = Math.cos(baseAngle);
    const sinB = Math.sin(baseAngle);
    return {
      x: fighter.x + rx * cosB - ry * sinB,
      y: fighter.y + rx * sinB + ry * cosB
    };
  };

  let tipPos, innerPos;

  if (fighter.rikaCallTimer > 0) {
    // Raised summoning pose for Katana when calling Rika
    const humAngle = Math.sin(Date.now() * 0.08) * 0.08;
    const humShift = Math.cos(Date.now() * 0.1) * 2;
    const callAngle = -Math.PI * 0.35 + humAngle;

    const L = (fighter.r - 8 + humShift) + 81 * 1.2;
    const innerL = L - 14;

    const cosC = Math.cos(callAngle);
    const sinC = Math.sin(callAngle);
    tipPos = projectLocal(cosC * L, sinC * L);
    innerPos = projectLocal(cosC * innerL, sinC * innerL);
  } else if (fighter.blockPoseTimer > 0 && !isSwinging) {
    const stanceAngle = Math.PI / 2;
    const baseDist = fighter.r - 18;
    const L = 81 * 1.2;
    const innerL = L - 14;
    const cosS = Math.cos(stanceAngle);
    const sinS = Math.sin(stanceAngle);
    tipPos = projectLocal(baseDist + cosS * L, sinS * L);
    innerPos = projectLocal(baseDist + cosS * innerL, sinS * innerL);
  } else {
    // Normal / Swing position
    const px = (fighter.r - 10) + 81 * 1.2;
    const py = 0;
    tipPos = projectLocal(px, py);

    const innerPx = (fighter.r - 10) + 67.5 * 1.2;
    const innerPy = 0;
    innerPos = projectLocal(innerPx, innerPy);
  }

  return {
    outer: tipPos,
    inner: innerPos
  };
}
