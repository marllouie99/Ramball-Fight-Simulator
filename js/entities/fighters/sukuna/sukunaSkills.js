// ─────────────────────────────────────────────
// RYOMEN SUKUNA CURSED TECHNIQUES MODULE
// Encapsulates Spiderweb (Cleave/Dismantle grid), Divine Flame (Fuga), RCT, and Domain Slashing
// ─────────────────────────────────────────────
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { projectileSystem } from '../../../systems/projectileSystem.js';
import { CONFIG } from '../../../core/config.js';
import { spawnSparks, spawnImpactFlash, spawnAnimePunchImpactFrame } from '../../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { getSkillSound } from '../../../soundEffects/skillSounds.js';
import { fastCleanArray } from '../../../graphics/particles/visualTrailSystem.js';
import { spawnDomainSlashLines } from './sukunaDomainVisuals.js';

export function checkSpiderwebTrigger(fighter, arena) {
  if (fighter.spiderwebCooldown > 0) return;

  const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));
  const spiderwebRange = CONFIG.sukuna?.spiderwebRange || 100;
  const minEnemiesToTrigger = CONFIG.sukuna?.spiderwebMinEnemies || 2;

  let nearbyEnemies = 0;
  let totalDist = 0;

  state.fighters.forEach((f, idx) => {
    if (f && f !== fighter && f.hp > 0) {
      const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
      if (isEnemy) {
        const dist = Math.hypot(fighter.x - f.x, fighter.y - f.y);
        if (dist <= spiderwebRange) {
          nearbyEnemies++;
          totalDist += dist;
        }
      }
    }
  });

  fighter.surroundingEnemiesCount = nearbyEnemies;

  if (nearbyEnemies >= minEnemiesToTrigger) {
    activateSpiderweb(fighter);
  }
}

export function activateSpiderweb(fighter) {
  fighter.spiderwebCooldown = CONFIG.sukuna?.spiderwebCooldown || 300;

  spawnFloatingText(fighter.x, fighter.y - fighter.r - 20, 'SPIDERWEB', '#8B0000');
  spawnImpactFlash(fighter.x, fighter.y, 50, 'crimsonSniper');
  triggerGlobalScreenShake(8, 12);

  const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));
  const spiderwebRange = CONFIG.sukuna?.spiderwebRange || 100;
  const spiderwebDamage = CONFIG.sukuna?.spiderwebDamage || 15;
  const slowDuration = CONFIG.sukuna?.spiderwebSlowDuration || 120;
  const slowMultiplier = CONFIG.sukuna?.spiderwebSlowMultiplier || 0.3;

  state.fighters.forEach((f, idx) => {
    if (f && f !== fighter && f.hp > 0) {
      const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
      if (isEnemy) {
        const dist = Math.hypot(fighter.x - f.x, fighter.y - f.y);
        if (dist <= spiderwebRange) {
          let dmg = spiderwebDamage;
          let isCrit = false;
          if (typeof fighter.evaluateSlashCrit === 'function') {
            const res = fighter.evaluateSlashCrit(f, spiderwebDamage, { isSpiderweb: true });
            dmg = res.finalDamage;
            isCrit = res.isCrit;
          }
          f.takeDamage(dmg, fighter, { isSpiderweb: true, isSukunaSlash: true, isCrit });
          if (typeof f.applySlow === 'function') f.applySlow(slowDuration, slowMultiplier);
          spawnSparks(f.x, f.y, 8, 'crimsonSniper', '#8B0000');
        }
      }
    }
  });

  const sound = getSkillSound(fighter._def?.id, 'spiderweb');
  const spiderwebSnd = CONFIG.sukuna?.sounds?.spiderweb || (sound ? sound.src : 'Assets/Sound Effects/Skills/hookchain.mp3');
  const spiderwebVol = CONFIG.sukuna?.soundVolumes?.spiderweb ?? (sound ? sound.volume : 0.7);
  audioSystem.playSFX(spiderwebSnd, spiderwebVol);
}

export function fireDivineFlame(fighter, ownerIndex) {
  fighter.isChannelingDivineFlame = false;
  fighter.divineFlameChargeTimer = 0;

  if (fighter.fugaSoundKey) {
    audioSystem.emit("stopLoop", fighter.fugaSoundKey);
    fighter.fugaSoundKey = null;
  }

  const sound = getSkillSound(fighter._def?.id, 'fuga_travel');
  const fugaTravelSnd = CONFIG.sukuna?.sounds?.fugaTravel || (sound ? sound.src : 'Assets/Sound Effects/Skills/fugatravel.mp3');
  const fugaTravelVol = CONFIG.sukuna?.soundVolumes?.fugaTravel ?? (sound ? sound.volume : 1.5);
  audioSystem.playSFX(fugaTravelSnd, fugaTravelVol);

  const isDomainFuga = fighter.domainActive;
  const normalCd = CONFIG.sukuna?.divineFlameCooldown || 700;
  const cdReduction = CONFIG.sukuna?.domainFugaCooldownReduction ?? CONFIG.sukuna?.domainFugaCooldownReductionPercent ?? 0.70;
  const domainCd = CONFIG.sukuna?.divineFlameDomainCooldown ?? Math.round(normalCd * (1 - cdReduction));
  fighter.divineFlameRecoveryTimer = CONFIG.sukuna?.divineFlameRecoveryTime || 60;
  fighter.divineFlameCooldown = isDomainFuga ? domainCd : normalCd;
  const shakeIntensity = isDomainFuga ? 18 : (CONFIG.sukuna?.divineFlameShakeIntensity || 30);
  const shakeDuration = isDomainFuga ? 30 : (CONFIG.sukuna?.divineFlameShakeDuration || 25);
  triggerGlobalScreenShake(shakeIntensity, shakeDuration);

  if (isDomainFuga) {
    spawnFloatingText(fighter.x, fighter.y - fighter.r - 35, 'THERMOBARIC FUGA EXPLOSION!!', '#FF3300');
    spawnImpactFlash(fighter.x, fighter.y, 140, 'gold');
    const thermoSnd = CONFIG.sukuna?.sounds?.thermobaricExplosion || 'attack_explosion';
    const thermoVol = CONFIG.sukuna?.soundVolumes?.thermobaricExplosion ?? 1.0;
    audioSystem.playSFX(thermoSnd, thermoVol);
  }

  const baseDamage = CONFIG.sukuna?.divineFlameDamage || 250;
  const damage = isDomainFuga ? Math.round(baseDamage * 1.5) : baseDamage;

  if (fighter.divineFlameCastAngle !== undefined) {
    fighter.gunAngle = fighter.divineFlameCastAngle;
    fighter.angle = fighter.divineFlameCastAngle;
  }

  if (projectileSystem && projectileSystem.fireSukunaDivineFlame) {
    projectileSystem.fireSukunaDivineFlame(fighter, ownerIndex, damage);
  }
}

export function activateReverseCursedTechnique(fighter, attacker) {
  if (fighter.isDead) return;
  fighter.reverseCursedTechniqueCooldown = CONFIG.sukuna?.reverseCursedTechniqueCooldown || 700;

  const healAmount = CONFIG.sukuna?.reverseCursedTechniqueHealAmount ?? (CONFIG.sukuna?.reverseCursedTechniqueHealPercent ? fighter.maxHp * CONFIG.sukuna.reverseCursedTechniqueHealPercent : 125);

  fighter.hp = Math.min(fighter.maxHp, Math.max(fighter.hp, 0) + healAmount);

  fighter.rctVisualMaxTimer = 150;
  fighter.rctVisualTimer = 150;

  spawnFloatingText(fighter.x, fighter.y - fighter.r - 40, 'REVERSE', '#00FF66');
  spawnFloatingText(fighter.x, fighter.y - fighter.r - 20, '+' + Math.round(healAmount), '#00FF00');
  spawnImpactFlash(fighter.x, fighter.y, 60, 'healing');
  triggerGlobalScreenShake(6, 20);

  const sound = getSkillSound(fighter._def?.id, 'reverseCursedTechnique');
  const rctSnd = CONFIG.sukuna?.sounds?.reverseCursedTechnique || (sound ? sound.src : 'Assets/Sound Effects/Skills/enhance.mp3');
  const rctVol = CONFIG.sukuna?.soundVolumes?.reverseCursedTechnique ?? (sound ? sound.volume : 1.0);
  audioSystem.playSFX(rctSnd, rctVol);
}

export function doDomainRapidSlashes(fighter, opponent, arena, ownerIndex) {
  if (fighter.isChannelingDivineFlame || (fighter.divineFlameRecoveryTimer || 0) > 0) return; // Do not teleport or slash while channeling/firing Fuga!

  const isFrozen = (fighter.timeStopTimer > 0) || (fighter.electricStunTimer > 0) || (fighter.crimsonElectrifiedTimer > 0) || (fighter.hitStunTimer > 0) || (fighter.silenceTimer || 0) > 0 || fighter.isTargetOfAmbush;
  if (isFrozen) return;

  // ── Unified Target Resolution (Rule #6: Fighters & Illusions) ──
  let target = opponent;
  const myTeam = (typeof state !== 'undefined' && state.fighters) ? state.getFighterTeam(state.fighters.indexOf(fighter)) : null;

  if (!target || target.isDead || target.hp <= 0 || target.invincibilityTimer > 0 || target.isStealthed) {
    const validTargets = [];
    if (typeof state !== 'undefined' && state.fighters) {
      state.fighters.forEach((f, idx) => {
        if (f && f !== fighter && f.hp > 0 && f.invincibilityTimer <= 0 && !f.isStealthed) {
          const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
          if (isEnemy) validTargets.push(f);
        }
      });
    }
    if (typeof state !== 'undefined' && state.illusions) {
      state.illusions.forEach(ill => {
        if (!ill || ill.hp <= 0 || ill.owner === fighter || ill.isRika) return;
        if (myTeam !== null && ill.owner && state.getFighterTeam(state.fighters.indexOf(ill.owner)) === myTeam) return;
        validTargets.push(ill);
      });
    }
    if (validTargets.length > 0) {
      // Pick nearest valid enemy
      validTargets.sort((a, b) => Math.hypot(fighter.x - a.x, fighter.y - a.y) - Math.hypot(fighter.x - b.x, fighter.y - b.y));
      target = validTargets[0];
    } else {
      return; // No valid enemy targets remaining in arena
    }
  }

  if (fighter.rapidSlashTimer === undefined || fighter.rapidSlashTimer <= 0) {
    const aimAngle = Math.atan2(target.y - fighter.y, target.x - fighter.x);
    fighter.gunAngle = aimAngle;

    const slashSpeed = CONFIG.sukuna?.slashSpeed || 40;
    const baseDamage = CONFIG.sukuna?.slashDamage ?? fighter.damage;
    let slashDamage = baseDamage;
    let isCrit = false;
    if (typeof fighter.evaluateSlashCrit === 'function') {
      const res = fighter.evaluateSlashCrit(target, baseDamage, { isMelee: false, isDomain: true });
      slashDamage = res.finalDamage;
      isCrit = res.isCrit;
    }

    const actualOwnerIndex = (typeof ownerIndex === 'number') ? ownerIndex : (state.fighters ? state.fighters.indexOf(fighter) : 0);

    // Multi-angle arc variance per strike
    const slashAngle = aimAngle + (Math.random() - 0.5) * 0.35;

    if (typeof target.takeDamage === 'function') {
      target.takeDamage(slashDamage, fighter, {
        isMelee: true,
        isSukunaSlash: true,
        isCleave: true,
        isDomain: true,
        isCrit
      });
    }

    spawnFloatingText(fighter.x, fighter.y - 30, 'CLEAVE!', '#E0E8FF');
    spawnSparks(target.x, target.y, 16, 'crimsonSniper', '#8B0000');
    spawnSparks(target.x, target.y, 8, 'slashRicochet');
    spawnSparks(target.x, target.y, 4, 'parrySpark');
    triggerGlobalScreenShake(5, 6);

    fighter.punchAnimTimer = 0;
    fighter.slashGlowTimer = 25;
    fighter.slashSwingTimer = 14;
    fighter.slashSwingMaxTimer = 14;
    fighter.slashHand = (fighter.slashHand === 1 ? 0 : 1);

    const cleaveAngle = aimAngle;
    const cleaveForce = 7.5;
    target.knockbackDecay = 0.88;
    if (target.knockbackVx !== undefined) target.knockbackVx = Math.cos(cleaveAngle) * cleaveForce;
    if (target.knockbackVy !== undefined) target.knockbackVy = Math.sin(cleaveAngle) * cleaveForce;

    if ((fighter._slashSoundCooldown || 0) <= 0) {
      const swingSnd = CONFIG.sukuna?.sounds?.swordSwing || 'Assets/Sound Effects/Attacks/swordswing.mp3';
      const swingVol = CONFIG.sukuna?.soundVolumes?.swordSwing ?? 0.9;
      const sliceSnd = CONFIG.sukuna?.sounds?.fleshSlice || 'Assets/Sound Effects/Skills/backstab.mp3';
      const sliceVol = CONFIG.sukuna?.soundVolumes?.fleshSlice ?? 0.7;
      const ricoSnd = CONFIG.sukuna?.sounds?.ricochetHit || 'Assets/Sound Effects/Skills/parry.mp3';
      const ricoVol = CONFIG.sukuna?.soundVolumes?.ricochetHit ?? 0.75;
      audioSystem.playSFX(swingSnd, swingVol);
      audioSystem.playSFX(sliceSnd, sliceVol);
      audioSystem.playSFX(ricoSnd, ricoVol);
      fighter._slashSoundCooldown = 10;
    }

    spawnImpactFlash(fighter.x, fighter.y, 15, 'crimsonSniper');

    // ── Instant Teleport Reposition around Target ──
    const oldX = fighter.x;
    const oldY = fighter.y;

    const teleportAngle = Math.random() * Math.PI * 2;
    const targetRadius = target.r || 20;
    const teleportDist = targetRadius + fighter.r + 90 + Math.random() * 80;
    fighter.x = target.x + Math.cos(teleportAngle) * teleportDist;
    fighter.y = target.y + Math.sin(teleportAngle) * teleportDist;

    const arenaObj = (arena && arena.width) ? arena : (state.arena || CONFIG.arena);
    if (arenaObj) {
      fighter.x = Math.max(arenaObj.x + fighter.r + 20, Math.min(arenaObj.x + arenaObj.width - fighter.r - 20, fighter.x));
      fighter.y = Math.max(arenaObj.y + fighter.r + 20, Math.min(arenaObj.y + arenaObj.height - fighter.r - 20, fighter.y));
    }

    fighter.vx = 0;
    fighter.vy = 0;

    // Rule #3: Position & Target Aim Alignment immediately after teleport
    fighter.aim(target);

    if (typeof fighter._spawnTeleportAfterimages === 'function') {
      fighter._spawnTeleportAfterimages(oldX, oldY, fighter.x, fighter.y);
    }
    spawnImpactFlash(oldX, oldY, 15, 'crimsonSniper');
    spawnImpactFlash(fighter.x, fighter.y, 20, 'crimsonSniper');
    const dashSnd = CONFIG.sukuna?.sounds?.teleportDash || 'Assets/Sound Effects/Skills/dash3.mp3';
    const dashVol = CONFIG.sukuna?.soundVolumes?.teleportDash ?? 0.7;
    audioSystem.playSFX(dashSnd, dashVol);

    if (typeof target.applyHitStun === 'function') target.applyHitStun(6);
    if (typeof fighter.applyBleed === 'function') fighter.applyBleed(target, 1);

    fighter.rapidSlashTimer = CONFIG.sukuna?.domainRapidSlashCooldown || 20;
  } else {
    fighter.rapidSlashTimer--;
    fighter.aim(target);
  }

  fighter.vx = 0;
  fighter.vy = 0;
  if (typeof fighter.applyMovementPhysics === 'function') fighter.applyMovementPhysics(0);
  if (typeof fighter.resolveWallBounce === 'function') fighter.resolveWallBounce(arena, target);

  if (fighter.afterImages) {
    fastCleanArray(fighter.afterImages, (img) => {
      if (img.timer > 0) img.timer--;
      return img.timer > 0;
    });
  }
  if (fighter.slashHitVisuals) {
    fastCleanArray(fighter.slashHitVisuals, (v) => {
      v.timer--;
      return v.timer > 0;
    });
  }
}

export function applyDomainEffect(fighter, arena) {
  const domainDamageInterval = CONFIG.sukuna?.domainDamageInterval || 18;
  const slashesPerTick = CONFIG.sukuna?.domainSlashesPerTick || 3;

  fighter._domainFrame = (fighter._domainFrame || 0) + 1;

  if (fighter._domainFrame % domainDamageInterval === 0) {
    if (fighter._slashSoundCooldown === undefined || fighter._slashSoundCooldown <= 0) {
      const swingSnd = CONFIG.sukuna?.sounds?.swordSwing || 'Assets/Sound Effects/Attacks/swordswing.mp3';
      const swingVol = (CONFIG.sukuna?.soundVolumes?.swordSwing ?? 0.9) * 0.55;
      audioSystem.playSFX(swingSnd, swingVol);
      fighter._slashSoundCooldown = 12;
    }

    // Spawn arena-clipped spatial cut lines and execute physical hits for each line
    const hitAny = spawnDomainSlashLines(fighter, slashesPerTick);
    if (hitAny) {
      const sliceSnd = CONFIG.sukuna?.sounds?.fleshSlice || 'Assets/Sound Effects/Skills/backstab.mp3';
      const sliceVol = (CONFIG.sukuna?.soundVolumes?.fleshSlice ?? 0.7) * 0.65;
      audioSystem.playSFX(sliceSnd, sliceVol);
    }
  }
}
