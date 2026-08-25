import { fadeOutSound, fadeOutSoundBySrc } from '../../../systems/soundSystem.js';
// ─────────────────────────────────────────────
// SATORU GOJO LIMITLESS SKILLS MODULE
// Encapsulates Reversal Red, Hollow Purple, and skill utilities
// ─────────────────────────────────────────────
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { projectileSystem } from '../../../systems/projectileSystem.js';
import { CONFIG } from '../../../core/config.js';
import { spawnSparks, spawnImpactFlash } from '../../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { getSkillSound } from '../../../soundEffects/skillSounds.js';

export function activateRed(fighter) {
  if ((fighter.redEffectTimer || 0) > 0 || fighter.redBuildupPhase) return;

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


  // Find and lock target angle toward nearest enemy
  const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));
  let targetF = null;
  state.fighters.forEach((f, idx) => {
    if (f && f !== fighter && f.hp > 0) {
      const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
      if (isEnemy) {
        const dist = Math.hypot(f.x - fighter.x, f.y - fighter.y);
        if (!targetF || dist < Math.hypot(targetF.x - fighter.x, targetF.y - fighter.y)) {
          targetF = f;
        }
        // Pause & immobilize enemy movement during Red buildup so they don't run into Gojo
        if (dist < (CONFIG.gojo?.redRange || 100) + 200) {
          f.vx = 0;
          f.vy = 0;
        }
      }
    }
  });
  
  fighter._redTargetRef = targetF;
  fighter.redTargetAngle = targetF ? Math.atan2(targetF.y - fighter.y, targetF.x - fighter.x) : fighter.gunAngle;

  // Light buildup sparks
  spawnSparks(fighter.x, fighter.y, 12, 'crimsonSniper');
  triggerGlobalScreenShake(4, 6);

  const now = Date.now();
  if (!fighter._hasPlayedRedChannelingSound || !fighter._lastRedSoundTime || (now - fighter._lastRedSoundTime) > 1800) {
    fighter._lastRedSoundTime = now;
    fighter._hasPlayedRedChannelingSound = true;
    const sVoice = getSkillSound(fighter._def?.id, 'red_channeling');
    const redChanSnd = sVoice?.src || CONFIG.gojo?.sounds?.redChanneling || 'Assets/Sound Effects/Skills/redchanneling.mp3';
    const redChanVol = sVoice?.volume ?? (CONFIG.gojo?.soundVolumes?.redChanneling ?? 1.8);
    audioSystem.playSFX(redChanSnd, redChanVol);

    const sCharging = getSkillSound(fighter._def?.id, 'red_charging');
    const redChargeSnd = sCharging?.src || CONFIG.gojo?.sounds?.redCharging || 'Assets/Sound Effects/Skills/redcharging.mp3';
    const redChargeVol = sCharging?.volume ?? (CONFIG.gojo?.soundVolumes?.redCharging ?? 2.0);
    audioSystem.playSFX(redChargeSnd, redChargeVol);
  }
}

export function detonateRed(fighter) {
  if (fighter.redDetonated) return;
  fighter.redDetonated = true;

  const redRange = CONFIG.gojo?.redRange || 100;
  const redDamage = CONFIG.gojo?.redDamage || 100;
  const redKnockback = CONFIG.gojo?.redKnockback || 25;

  // Heavy blast sparks & screen shake
  spawnSparks(fighter.x, fighter.y, 35, 'crimsonSniper');
  triggerGlobalScreenShake(12, 18);

  const sBlast = getSkillSound(fighter._def?.id, 'red_blast');
  const blastSnd = sBlast?.src || CONFIG.gojo?.sounds?.redBlast || 'Assets/Sound Effects/Skills/redblast.mp3';
  const blastVol = sBlast?.volume ?? (CONFIG.gojo?.soundVolumes?.redBlast ?? 2.5);
  audioSystem.playSFX(blastSnd, blastVol);

  const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));
  const arena = CONFIG.arena;

  state.fighters.forEach((f, idx) => {
    if (f && f !== fighter && f.hp > 0) {
      const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
      if (isEnemy) {
        const dist = Math.hypot(f.x - fighter.x, f.y - fighter.y);
        if (dist < redRange + f.r) {
          const angle = Math.atan2(f.y - fighter.y, f.x - fighter.x);
          
          // Clear time-stop & infinity freeze so Red knockback actually launches target away
          f.timeStopTimer = 0;
          f.isFrozenByInfinity = false;
          f.infinityFreezeTimer = 0;
          f._timeStopFrozenAngle = null;
          f._timeStopFrozenGunAngle = null;

          f.takeDamage(redDamage, fighter, { isRed: true, isAdaptableSkillShot: true, skillShotId: 'red' });

          const kbVx = Math.cos(angle) * redKnockback;
          const kbVy = Math.sin(angle) * redKnockback;

          if (typeof f.applyRedKnockback === 'function') {
            f.applyRedKnockback(kbVx, kbVy);
          } else if (typeof f.applyKnockback === 'function') {
            f.applyKnockback(kbVx, kbVy, { isRed: true });
          }

          const targetX = f.x + Math.cos(angle) * redKnockback * 8;
          const targetY = f.y + Math.sin(angle) * redKnockback * 8;
          if (typeof f.applyTeleportSlideBrake === 'function') {
            f.applyTeleportSlideBrake(f.x, f.y, targetX, targetY, arena, 12);
          } else {
            f.vx = kbVx;
            f.vy = kbVy;
          }

          const slowDuration = CONFIG.gojo?.redSlowDuration || 120;
          const slowMultiplier = CONFIG.gojo?.redSlowMultiplier || 0.35;
          if (typeof f.applySlow === 'function') {
            f.applySlow(slowDuration, slowMultiplier, { isRed: true });
          }
          spawnImpactFlash(f.x, f.y, 45, 'crimsonSniper');
        }
      }
    }
  });

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
  const enableBoost = CONFIG.gojo?.enablePurpleSecondCastBoost !== false;
  const isSecondCast = enableBoost && (fighter.purpleUseCount === 2);
  const damageMult = isSecondCast ? (CONFIG.gojo?.purpleSecondCastDamageMultiplier ?? 2.0) : 1.0;
  const baseDamage = CONFIG.gojo?.purpleDamage || 70;
  const baseDPS = CONFIG.gojo?.purpleDPS || 150;


  // Once the 2nd purple releases, reset purpleUseCount back to 0 so the next cast cycles back to 100%!
  if (fighter.purpleUseCount >= 2) {
    fighter.purpleUseCount = 0;
  }

  let purpleLife = CONFIG.gojo?.purpleLife || 250;
  const opponent = (typeof state !== 'undefined' && state.fighters) ? state.fighters.find(f => f && f !== fighter && f.hp > 0) : null;
  if (opponent && !opponent.isDead) {
    const fireAngle = Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x);
    fighter.gunAngle = fireAngle;
    fighter.angle = fireAngle;
  }
  if (projectileSystem && projectileSystem.fireGojoPurple) {
    const proj = projectileSystem.fireGojoPurple(
      fighter, 
      ownerIndex, 
      baseDamage * damageMult, 
      baseDPS * damageMult
    );
    if (proj) {
      proj.purpleDPS = baseDPS * damageMult;
      proj.damageMult = damageMult;
      proj.is200Percent = isSecondCast;
      if (proj.life !== undefined) {
        purpleLife = proj.life;
      }
    }
  }

  // Gojo's breather stasis after firing is based directly on purpleLife
  fighter.purpleRecoveryTimer = purpleLife;
  fighter.purpleRecoveryMaxTimer = purpleLife;
  fighter.purpleCooldown = CONFIG.gojo?.purpleCooldown || 1500;
  fighter.z = 35; // Start descent from hovering altitude

  // Ensure Limitless Infinity barrier is IMMEDIATELY active during post-Purple breather state!
  fighter.infinityCooldown = 0;
  fighter.infinityActive = true;
  fighter.infinityActiveTimer = purpleLife;
  fighter.infinityFadeOpacity = 1.0;
  fighter.isMeleeMode = false;

  triggerGlobalScreenShake(CONFIG.gojo?.purpleShakeIntensity || 15, CONFIG.gojo?.purpleShakeDuration || 20);

  fighter.purpleRetreatTimer = CONFIG.gojo?.purpleRetreatDelay ?? 20;
}

export function executePurpleRetreat(fighter) {
  const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));
  let opponent = null;
  if (state.fighters) {
    let minDist = Infinity;
    state.fighters.forEach((f, idx) => {
      if (f && f !== fighter && f.hp > 0) {
        const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
        if (isEnemy) {
          const d = Math.hypot(fighter.x - f.x, fighter.y - f.y);
          if (d < minDist) {
            minDist = d;
            opponent = f;
          }
        }
      }
    });
  }

  if (opponent && !opponent.isDead) {
    const oldX = fighter.x;
    const oldY = fighter.y;

    const angleAway = Math.atan2(fighter.y - opponent.y, fighter.x - opponent.x);
    const retreatDist = CONFIG.gojo?.purpleRetreatDistance ?? 280;
    let targetX = fighter.x + Math.cos(angleAway) * retreatDist;
    let targetY = fighter.y + Math.sin(angleAway) * retreatDist;

    const arena = CONFIG.arena;
    if (arena) {
      targetX = Math.max(arena.x + fighter.r, Math.min(arena.x + arena.width - fighter.r, targetX));
      targetY = Math.max(arena.y + fighter.r, Math.min(arena.y + arena.height - fighter.r, targetY));
    }

    fighter.x = targetX;
    fighter.y = targetY;
    fighter.vx = 0;
    fighter.vy = 0;
    if (typeof fighter.aim === 'function') fighter.aim(opponent);

    const breatherDuration = CONFIG.gojo?.modeSwitchBreatherDuration ?? 45;
    fighter.modeSwitchBreatherTimer = breatherDuration;
    spawnImpactFlash(oldX, oldY, 25, 'lightningTrail');
    spawnImpactFlash(fighter.x, fighter.y, 30, 'lightningTrail');
    const dashSnd = CONFIG.gojo?.sounds?.teleportDash || 'skill_dash3';
    const dashVol = CONFIG.gojo?.soundVolumes?.teleportDash ?? 0.9;
    audioSystem.playSFX(dashSnd, dashVol);
  }
}

export function deleteEnemyProjectilesInPurple(fighter) {
  if (!projectileSystem || !projectileSystem.projectiles) return;
  const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));

  for (let p of projectileSystem.projectiles) {
    if (p.isGojoPurple && (p.owner === state.fighters.indexOf(fighter) || state.getFighterTeam(p.owner) === myTeam)) {
      for (let ep of projectileSystem.projectiles) {
        if (ep !== p && ep.owner !== p.owner) {
          const isEnemy = myTeam === null || state.getFighterTeam(ep.owner) !== myTeam;
          if (isEnemy && !ep.isVisual) {
            const dist = Math.hypot(p.x - ep.x, p.y - ep.y);
            const suctionRange = (CONFIG.gojo?.purpleRadius || 50) + 180;
            if (dist < suctionRange) {
              ep.toRemove = true;
              spawnSparks(ep.x, ep.y, 4, '#A020F0');
            }
          }
        }
      }
    }
  }
}
