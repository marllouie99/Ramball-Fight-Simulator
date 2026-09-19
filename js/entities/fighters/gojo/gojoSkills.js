import { stopSound, stopSoundBySrc, fadeOutSound, fadeOutSoundBySrc } from '../../../systems/soundSystem.js';
// ─────────────────────────────────────────────
// SATORU GOJO LIMITLESS SKILLS MODULE
// Encapsulates Reversal Red, Hollow Purple, and skill utilities
// ─────────────────────────────────────────────
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { projectileSystem } from '../../../systems/projectileSystem.js';
import { CONFIG } from '../../../core/config.js';
import { spawnSparks, spawnImpactFlash, spawnGojoRedFrontalBlast } from '../../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { getSkillSound } from '../../../soundEffects/skillSounds.js';
import { pushTrailCap } from '../../../graphics/particles/visualTrailSystem.js';

export function snapAngleToCardinal(angle) {
  if (angle === undefined || Number.isNaN(angle)) return 0;
  let norm = angle;
  while (norm > Math.PI) norm -= Math.PI * 2;
  while (norm < -Math.PI) norm += Math.PI * 2;
  if (norm >= -Math.PI / 4 && norm <= Math.PI / 4) {
    return 0; // Right
  } else if (norm > Math.PI / 4 && norm < 3 * Math.PI / 4) {
    return Math.PI / 2; // Down
  } else if (norm < -Math.PI / 4 && norm > -3 * Math.PI / 4) {
    return -Math.PI / 2; // Up
  } else {
    return Math.PI; // Left
  }
}

export function activateRed(fighter) {
  if ((fighter.redEffectTimer || 0) > 0 || fighter.redBuildupPhase || (typeof fighter.isPurpleActive === 'function' && fighter.isPurpleActive())) return;

  const buildupFrames = CONFIG.gojo?.redBuildupFrames || 100;
  const blastFadeFrames = 25;
  const totalFrames = buildupFrames + blastFadeFrames;

  fighter.redCooldown = CONFIG.gojo?.redCooldown || 1000;
  fighter.redEffectTimer = totalFrames;
  fighter.redEffectMaxTimer = totalFrames;
  fighter.redBuildupPhase = true;
  fighter.redDetonated = false;
  fighter._hasPlayedRedFlareSound = false;
  fighter._hasPlayedRedChannelingSound = false;

  // Prevent simultaneous attacks during the buildup & blast
  fighter.shootCooldown = fighter.shootCooldownMax || 40;
  fighter.meleeModeCooldown = Math.max(fighter.meleeModeCooldown || 0, totalFrames + 15);
  fighter.isMeleeMode = false;

  // Instantly stop all movement when starting Red buildup
  fighter.vx = 0;
  fighter.vy = 0;

  // Find and lock target angle towards target at any continuous 360 angle upon initiation
  const fighterY = fighter.y - (fighter.z || 0);
  let aimAngle = null;

  let targetF = (typeof fighter._findAlignedEnemyForRed === 'function')
    ? (fighter._findAlignedEnemyForRed() || fighter._redTargetRef)
    : ((typeof fighter._findVerticallyAlignedEnemy === 'function')
      ? (fighter._findVerticallyAlignedEnemy() || fighter._redTargetRef)
      : fighter._redTargetRef);

  if (!targetF && typeof state !== 'undefined' && state.fighters) {
    const myTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(fighter)) : null;
    let closestDist = Infinity;
    state.fighters.forEach((f, idx) => {
      if (f && f !== fighter && f.hp > 0 && !f.isDead && !f.dead) {
        const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
        if (isEnemy) {
          const dist = Math.hypot(f.x - fighter.x, f.y - fighter.y);
          if (dist < closestDist) {
            closestDist = dist;
            targetF = f;
          }
        }
      }
    });
  }

  fighter._redTargetRef = targetF;
  if (targetF && typeof targetF.x === 'number' && typeof targetF.y === 'number') {
    const targetY = targetF.y - (targetF.z || 0);
    const dx = targetF.x - fighter.x;
    const dy = targetY - fighterY;
    aimAngle = Math.atan2(dy, dx);
  } else if (fighter.redTargetAngle !== undefined && fighter.redTargetAngle !== null && !Number.isNaN(fighter.redTargetAngle)) {
    aimAngle = fighter.redTargetAngle;
  } else if (fighter.gunAngle !== undefined && !Number.isNaN(fighter.gunAngle)) {
    aimAngle = fighter.gunAngle;
  } else {
    aimAngle = 0;
  }

  fighter.redTargetAngle = aimAngle;
  fighter.redInitialAngle = aimAngle;
  fighter.redCommittedSide = Math.abs(aimAngle) > Math.PI / 2 ? 'left' : 'right';
  fighter.gunAngle = aimAngle;
  fighter.angle = aimAngle;

  // Light buildup sparks
  spawnSparks(fighter.x, fighter.y, 12, 'crimsonSniper');
  triggerGlobalScreenShake(4, 6);

  const now = Date.now();
  if (!fighter._hasPlayedRedChannelingSound || !fighter._lastRedSoundTime || (now - fighter._lastRedSoundTime) > 1800) {
    fighter._lastRedSoundTime = now;
    fighter._hasPlayedRedChannelingSound = true;
    const fId = fighter.characterId || fighter.id || fighter._def?.id;
    const sVoice = getSkillSound(fId, 'red_channeling');
    const redChanSnd = sVoice?.src || CONFIG.gojo?.sounds?.redChanneling || 'Assets/Sound Effects/Skills/redchanneling.mp3';
    const redChanVol = sVoice?.volume ?? (CONFIG.gojo?.soundVolumes?.redChanneling ?? 1.8);
    fighter._redChannelingSoundHandle = audioSystem.playSFX(redChanSnd, redChanVol);

    const sCharging = getSkillSound(fId, 'red_charging');
    const redChargeSnd = sCharging?.src || CONFIG.gojo?.sounds?.redCharging || 'Assets/Sound Effects/Skills/redcharging.mp3';
    const redChargeVol = sCharging?.volume ?? (CONFIG.gojo?.soundVolumes?.redCharging ?? 2.0);
    fighter._redChargingSoundHandle = audioSystem.playSFX(redChargeSnd, redChargeVol);
  }
}

export function stopGojoRedAudio(fighter) {
  if (!fighter) return;
  fighter._hasPlayedRedChannelingSound = false;
  fighter._hasPlayedRedFlareSound = false;

  // Immediately cut and stop all Red audio handles
  if (fighter._redChannelingSoundHandle) {
    stopSound(fighter._redChannelingSoundHandle);
    fighter._redChannelingSoundHandle = null;
  }
  if (fighter._redChargingSoundHandle) {
    stopSound(fighter._redChargingSoundHandle);
    fighter._redChargingSoundHandle = null;
  }
  if (fighter._redBlastSoundHandle) {
    stopSound(fighter._redBlastSoundHandle);
    fighter._redBlastSoundHandle = null;
  }

  // Immediately cut all active Red audio instances across sources
  stopSoundBySrc('redchanneling');
  stopSoundBySrc('redcharging');
  stopSoundBySrc('reddeploy');
  stopSoundBySrc('redblast');
  stopSoundBySrc('red_channeling');
  stopSoundBySrc('red_charging');
  stopSoundBySrc('red_deploy');
  stopSoundBySrc('red_blast');

  // Fallback fast fade-out for any scheduled instances
  fadeOutSoundBySrc('redchanneling', 50);
  fadeOutSoundBySrc('redcharging', 50);
  fadeOutSoundBySrc('reddeploy', 50);
  fadeOutSoundBySrc('redblast', 50);
}

export function detonateRed(fighter) {
  if (fighter.redDetonated) return;
  fighter.redDetonated = true;
  fighter.hasFiredRed = true;
  fighter._hasFiredRedAtLeastOnce = true;
  fighter.lastCastSkill = 'red';

  // Stop channeling/charging audio immediately when detonating into blast
  if (fighter._redChannelingSoundHandle) {
    stopSound(fighter._redChannelingSoundHandle);
    fighter._redChannelingSoundHandle = null;
  }
  if (fighter._redChargingSoundHandle) {
    stopSound(fighter._redChargingSoundHandle);
    fighter._redChargingSoundHandle = null;
  }
  stopSoundBySrc('redchanneling');
  stopSoundBySrc('redcharging');
  fadeOutSoundBySrc('redchanneling', 50);
  fadeOutSoundBySrc('redcharging', 50);

  // Detonate Red strictly at current facing gunAngle, no instant snapping recalculation to target
  let pushAngle;
  if (fighter.gunAngle !== undefined && !Number.isNaN(fighter.gunAngle)) {
    pushAngle = fighter.gunAngle;
  } else if (fighter.redTargetAngle !== undefined && fighter.redTargetAngle !== null && !Number.isNaN(fighter.redTargetAngle)) {
    pushAngle = fighter.redTargetAngle;
  } else {
    pushAngle = 0;
  }
  fighter.redTargetAngle = pushAngle;
  fighter.gunAngle = pushAngle;
  fighter.angle = pushAngle;

  const frontalReach = CONFIG.gojo?.redFrontalReach || CONFIG.gojo?.redRange || 650;
  const frontalArc = CONFIG.gojo?.redFrontalArc || 0.76;
  const halfArc = frontalArc / 2; // 0.38 (~21.8 deg, ~43.5 deg total cone)
  const redDamage = CONFIG.gojo?.redDamage || 100;
  const redKnockback = CONFIG.gojo?.redKnockback || 40;
  const slowDuration = CONFIG.gojo?.redSlowDuration || 120;
  const slowMultiplier = CONFIG.gojo?.redSlowMultiplier || 0.35;

  // Heavy blast sparks & screen shake
  spawnSparks(fighter.x, fighter.y, 35, 'crimsonSniper');
  triggerGlobalScreenShake(CONFIG.gojo?.redShakeIntensity || 14, CONFIG.gojo?.redShakeDuration || 25);

  const fId = fighter.characterId || fighter.id || fighter._def?.id;
  const sBlast = getSkillSound(fId, 'red_blast');
  const blastSnd = sBlast?.src || CONFIG.gojo?.sounds?.redBlast || 'Assets/Sound Effects/Skills/redblast.mp3';
  const blastVol = sBlast?.volume ?? (CONFIG.gojo?.soundVolumes?.redBlast ?? 2.5);
  fighter._redBlastSoundHandle = audioSystem.playSFX(blastSnd, blastVol);

  const myTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(fighter)) : null;

  // Query all enemy targets (fighters & illusions & driveby cars) - Rule #6 & Rule #7
  const validTargets = [];
  if (typeof state !== 'undefined') {
    if (state.fighters) {
      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (!f || f === fighter || f.hp <= 0) continue;
        const targetTeam = state.getFighterTeam ? state.getFighterTeam(i) : null;
        if (myTeam !== null && myTeam === targetTeam) continue;
        validTargets.push(f);
      }
    }
    if (state.illusions) {
      for (const ill of state.illusions) {
        if (!ill || ill === fighter || ill.hp <= 0) continue;
        if (ill.ownerIndex !== undefined) {
          const illTeam = state.getFighterTeam ? state.getFighterTeam(ill.ownerIndex) : null;
          if (myTeam !== null && myTeam === illTeam) continue;
        }
        validTargets.push(ill);
      }
    }
    if (state.cjDriveBys) {
      for (const car of state.cjDriveBys) {
        if (!car || car.dead || car.hp <= 0) continue;
        if (car.owner) {
          const carTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(car.owner)) : null;
          if (myTeam !== null && myTeam === carTeam) continue;
        }
        validTargets.push(car);
      }
    }
  }

  for (const f of validTargets) {
    const dx = f.x - fighter.x;
    const dy = f.y - fighter.y;
    const targetR = f.r || 20;

    // Project target into blast coordinate frame (forward along pushAngle, lateral perpendicular)
    const forwardDist = dx * Math.cos(pushAngle) + dy * Math.sin(pushAngle);
    const lateralDist = Math.abs(-dx * Math.sin(pushAngle) + dy * Math.cos(pushAngle));

    // Forward reach check: Must be in front of Gojo and within frontalReach (+ target radius)
    if (forwardDist >= -targetR * 0.25 && forwardDist <= frontalReach + targetR) {
      // Clamped forward distance to calculate visual cone width at target position
      const clampedX = Math.max(0, Math.min(frontalReach, forwardDist));
      // Visual half-width exactly matches drawGojoRedFrontalBlast and _drawReversalRedEffect
      // (base width 8px + atmospheric glow 8px = 16px min, expanding by clampedX * tan(halfArc))
      const visualHalfW = Math.max(16, clampedX * Math.tan(halfArc) + 8);

      if (lateralDist <= visualHalfW + targetR) {
        // Clear time-stop & infinity freeze so Red knockback actually launches target away
        f.timeStopTimer = 0;
        f.isFrozenByInfinity = false;
        f.infinityFreezeTimer = 0;
        f._timeStopFrozenAngle = null;
        f._timeStopFrozenGunAngle = null;

        // Damage target
        if (typeof f.takeDamage === 'function') {
          f.takeDamage(redDamage, fighter, { isRed: true, isSkill: true, isAdaptableSkillShot: true, skillShotId: 'red', bypassEvade: true, isGuaranteedHit: true });
        }

        // Heavy directional knockback pushing enemies away along the repulsion blast vector
        const kbVx = Math.cos(pushAngle) * redKnockback;
        const kbVy = Math.sin(pushAngle) * redKnockback;

        f.vx = kbVx;
        f.vy = kbVy;
        f.knockbackDecay = 0.92;

        if (typeof f.applyRedKnockback === 'function') {
          f.applyRedKnockback(kbVx, kbVy);
        } else if (typeof f.applyKnockback === 'function') {
          f.applyKnockback(kbVx, kbVy, { isRed: true });
        }

        // Apply hit stun (immobilizes enemy actions on impact)
        if (typeof f.applyHitStun === 'function') {
          f.applyHitStun(25);
        }

        // Post-detonation slow debuff
        if (!f.immuneToCC || f.characterId === 'toji' || f.type === 'toji') {
          if (typeof f.applySlow === 'function') {
            f.applySlow(slowDuration, slowMultiplier, { isRed: true });
          } else {
            f.slowTimer = Math.max(f.slowTimer || 0, slowDuration);
            f.slowMultiplier = slowMultiplier;
          }
          f.redSlowTimer = slowDuration;
          f.redSlowMaxTimer = slowDuration;
        }

        spawnImpactFlash(f.x, f.y, 50, 'crimsonSniper');
      }
    }
  }

  // Strictly enforce Gojo's gunAngle and facing angle remain on the committed blast vector
  fighter.redTargetAngle = pushAngle;
  fighter.gunAngle = pushAngle;
  fighter.angle = pushAngle;

  // Visual: Spawn Blazing Frontal Supersonic Red Shockwave Laser Corridor
  if (typeof spawnGojoRedFrontalBlast === 'function') {
    spawnGojoRedFrontalBlast(fighter.x, fighter.y, pushAngle, frontalReach, frontalArc);
  }

  // Dissipate blast visual quickly (0.2s) so Gojo doesn't get stuck holding the orb post-blast
  fighter.redEffectTimer = Math.min(fighter.redEffectTimer || 0, 12);
}

export function firePurple(fighter, ownerIndex) {
  fighter.isChannelingPurple = false;
  fighter.purpleChargeTimer = 0;
  fighter._hasPlayedPurpleChannelSound = false;
  if (fighter._purpleChargeSoundHandle) {
    fadeOutSound(fighter._purpleChargeSoundHandle, 300);
    fighter._purpleChargeSoundHandle = null;
  }
  fadeOutSoundBySrc('mixing', 300);

  fighter.purpleUseCount = (fighter.purpleUseCount || 0) + 1;
  fighter.hasFiredPurple = true;
  fighter._hasFiredPurpleAtLeastOnce = true;
  fighter.lastCastSkill = 'purple';
  const enableBoost = CONFIG.gojo?.enablePurpleSecondCastBoost !== false;
  const isSecondCast = enableBoost && (fighter.purpleUseCount === 2);
  const damageMult = isSecondCast ? (CONFIG.gojo?.purpleSecondCastDamageMultiplier ?? 2.0) : 1.0;
  const baseDamage = CONFIG.gojo?.purpleDamage || 70;
  const baseDPS = CONFIG.gojo?.purpleDPS || 150;


  // Once the 2nd purple releases, reset purpleUseCount back to 0 so the next cast cycles back to 100%!
  if (fighter.purpleUseCount >= 2) {
    fighter.purpleUseCount = 0;
  }

  let purpleLife = CONFIG.gojo?.purpleLife ?? 480;

  // Fire Purple strictly at current facing gunAngle, no instant snapping recalculation to target
  let releaseAngle;
  if (fighter.gunAngle !== undefined && !Number.isNaN(fighter.gunAngle)) {
    releaseAngle = fighter.gunAngle;
  } else if (fighter.purpleCastAngle !== undefined && fighter.purpleCastAngle !== null && !Number.isNaN(fighter.purpleCastAngle)) {
    releaseAngle = fighter.purpleCastAngle;
  } else {
    releaseAngle = 0;
  }

  fighter.purpleCastAngle = releaseAngle;
  fighter.gunAngle = releaseAngle;
  fighter.angle = releaseAngle;

  const recoveryDuration = fighter.purpleRecoveryDuration ?? CONFIG.gojo?.purpleRecoveryDuration ?? 50;

  if (projectileSystem && projectileSystem.fireGojoPurple) {
    const proj = projectileSystem.fireGojoPurple(
      fighter, 
      ownerIndex, 
      baseDamage * damageMult, 
      baseDPS * damageMult
    );
    if (proj) {
      proj.ownerFighter = fighter;
      fighter.activePurpleProjectile = proj;
      proj.purpleDPS = baseDPS * damageMult;
      proj.damageMult = damageMult;
      proj.is200Percent = isSecondCast;
      if (proj.life !== undefined) {
        purpleLife = proj.life;
      }
    }
  }

  // 1. Teleport away to safe distance immediately after firing Hollow Purple
  executePurpleRetreat(fighter, releaseAngle);

  // 2. Post-fire Purple Breather Recovery (Gojo stays afloat in the air during breather stasis)
  fighter.purpleRecoveryTimer = recoveryDuration;
  fighter.purpleRecoveryMaxTimer = recoveryDuration;
  fighter.purpleCooldown = CONFIG.gojo?.purpleCooldown || 1200;
  fighter.shootCooldown = fighter.shootCooldownMax ?? 60; // Reset basic attack cooldown so it resumes cleanly once purple expires

  // Maintain aerial levitation height and zero velocity (no continuous move-back / backward drift)
  fighter.z = 35;
  fighter.vx = 0;
  fighter.vy = 0;

  // When Gojo fires Purple, disable his Limitless Infinity barrier until the Purple life expires and Gojo lands
  fighter.infinityActive = false;
  fighter.infinityCooldown = 0;
  fighter.infinityActiveTimer = 0;
  fighter.infinityFadeOpacity = 0;
  fighter.infinityBlockTimer = 0;
  fighter.isMeleeMode = false;

  fighter.purpleRetreatTimer = 0;
}

export function executePurpleRetreat(fighter, releaseAngle) {
  if (!fighter || fighter.isTargetOfAmbush || (fighter.timeStopTimer || 0) > 0) return;

  const oldX = fighter.x;
  const oldY = fighter.y;

  const retreatAngle = (releaseAngle !== undefined && !Number.isNaN(releaseAngle))
    ? releaseAngle + Math.PI
    : ((fighter.gunAngle !== undefined && !Number.isNaN(fighter.gunAngle))
      ? fighter.gunAngle + Math.PI
      : ((fighter.angle || 0) + Math.PI));

  const retreatDist = CONFIG.gojo?.purpleRetreatDistance ?? 260;
  let targetX = fighter.x + Math.cos(retreatAngle) * retreatDist;
  let targetY = fighter.y + Math.sin(retreatAngle) * retreatDist;

  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
  if (arena) {
    if (arena.shape === 'circle') {
      const acx = arena.x + arena.width / 2;
      const acy = arena.y + arena.height / 2;
      const ar = Math.max(10, (arena.radius || (arena.width / 2)) - fighter.r);
      const cdx = targetX - acx;
      const cdy = targetY - acy;
      const cdist = Math.hypot(cdx, cdy);
      if (cdist > ar && cdist > 0) {
        targetX = acx + (cdx / cdist) * ar;
        targetY = acy + (cdy / cdist) * ar;
      }
    } else {
      targetX = Math.max(arena.x + fighter.r, Math.min(arena.x + arena.width - fighter.r, targetX));
      targetY = Math.max(arena.y + fighter.r, Math.min(arena.y + arena.height - fighter.r, targetY));
    }
  }

  fighter.x = targetX;
  fighter.y = targetY;
  fighter.vx = 0;
  fighter.vy = 0;
  fighter.z = 35; // Maintain levitation height in the air after teleporting away

  if (!fighter.afterImages) fighter.afterImages = [];
  const dx = targetX - oldX;
  const dy = targetY - oldY;
  const distT = Math.hypot(dx, dy);
  if (distT >= 1) {
    const pathAngle = Math.atan2(dy, dx);
    const facingAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : pathAngle;
    const steps = Math.max(4, Math.floor(distT / 12));
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

  spawnImpactFlash(oldX, oldY, 20, 'lightningTrail');
  spawnImpactFlash(targetX, targetY, 25, 'lightningTrail');
  spawnSparks(oldX, oldY, 6, '#A855F7');
  spawnSparks(targetX, targetY, 8, '#A855F7');

  const sTeleport = getSkillSound(fighter._def?.id || 'gojo', 'teleport');
  const teleportSrc = sTeleport?.src || 'Assets/Sound Effects/Skills/dash3.mp3';
  const teleportVol = sTeleport?.volume ?? 0.65;
  audioSystem.playSFX(teleportSrc, teleportVol);

  // Keep facing the direction of the fired Hollow Purple during retreat & breather recovery
  if (releaseAngle !== undefined && !Number.isNaN(releaseAngle)) {
    fighter.gunAngle = releaseAngle;
    fighter.angle = releaseAngle;
    fighter.purpleCastAngle = releaseAngle;
  }
}

export function deleteEnemyProjectilesInPurple(fighter) {
  if (!projectileSystem || !projectileSystem.projectiles) return;
  const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));

  for (let p of projectileSystem.projectiles) {
    if (p.isGojoPurple && (p.owner === state.fighters.indexOf(fighter) || state.getFighterTeam(p.owner) === myTeam)) {
      for (let ep of projectileSystem.projectiles) {
        if (ep !== p && ep.owner !== p.owner) {
          if (ep.isGojoPurple || ep.isGojoPurpleOrb || ep.behaviorType === 'gojo_purple' || ep.visual === 'gojoPurple' || ep.isGetsuga || ep.behaviorType === 'getsuga_tensho' || ep.isSukunaFurnace || ep.behaviorType === 'sukuna_furnace' || ep.behaviorType === 'yuta_pure_love_beam' || ep.visual === 'yuta_pure_love_beam' || ep.isPureLoveBeam) continue;
          const isEnemy = myTeam === null || state.getFighterTeam(ep.owner) !== myTeam;
          if (isEnemy && !ep.isVisual) {
            const dist = Math.hypot(p.x - ep.x, p.y - ep.y);
            const suctionRange = (CONFIG.gojo?.purpleRadius || 50) + 180;
            if (dist < suctionRange) {
              ep.life = 0;
              spawnSparks(ep.x, ep.y, 4, '#A020F0');
            }
          }
        }
      }
    }
  }
}
