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
  if (sound) audioSystem.playSFX(sound.src, sound.volume);
}

export function fireDivineFlame(fighter, ownerIndex) {
  fighter.isChannelingDivineFlame = false;

  if (fighter.fugaSoundKey) {
    audioSystem.emit("stopLoop", fighter.fugaSoundKey);
    fighter.fugaSoundKey = null;
  }

  const sound = getSkillSound(fighter._def?.id, 'fuga_travel');
  if (sound) audioSystem.playSFX(sound.src, sound.volume);

  const isDomainFuga = fighter.domainActive;
  const normalCd = CONFIG.sukuna?.divineFlameCooldown || 1500;
  fighter.divineFlameRecoveryTimer = CONFIG.sukuna?.divineFlameRecoveryTime || 60;
  fighter.divineFlameCooldown = normalCd;
  const shakeIntensity = isDomainFuga ? 18 : (CONFIG.sukuna?.divineFlameShakeIntensity || 30);
  const shakeDuration = isDomainFuga ? 30 : (CONFIG.sukuna?.divineFlameShakeDuration || 25);
  triggerGlobalScreenShake(shakeIntensity, shakeDuration);

  if (isDomainFuga) {
    spawnFloatingText(fighter.x, fighter.y - fighter.r - 35, 'THERMOBARIC FUGA EXPLOSION!!', '#FF3300');
    spawnImpactFlash(fighter.x, fighter.y, 140, 'gold');
    audioSystem.playSFX('attack_explosion', 1.0);
  }

  const baseDamage = CONFIG.sukuna?.divineFlameDamage || 250;
  const damage = isDomainFuga ? Math.round(baseDamage * 1.5) : baseDamage;

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
  if (sound) audioSystem.playSFX(sound.src, sound.volume);
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

    const slashSpeed = CONFIG.sukuna?.slashSpeed ?? (CONFIG.projectile.speed * 1.5);
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

    if (projectileSystem) {
      projectileSystem.fireProjectile(
        fighter,
        actualOwnerIndex,
        slashDamage,
        false,
        slashSpeed,
        false,
        'ghostBlade',
        fighter.x,
        fighter.y,
        slashAngle
      );
    }

    spawnFloatingText(fighter.x, fighter.y - 30, 'CLEAVE!', '#E0E8FF');
    spawnSparks(target.x, target.y, 16, 'crimsonSniper', '#8B0000');
    triggerGlobalScreenShake(5, 6);

    fighter.punchAnimTimer = 0;
    fighter.slashGlowTimer = 25;
    fighter.slashSwingTimer = 14;
    fighter.slashSwingMaxTimer = 14;
    fighter.slashHand = (fighter.slashHand === 1 ? 0 : 1);

    const cleaveAngle = aimAngle;
    target.vx = (target.vx || 0) + Math.cos(cleaveAngle) * 3;
    target.vy = (target.vy || 0) + Math.sin(cleaveAngle) * 3;

    if ((fighter._slashSoundCooldown || 0) <= 0) {
      audioSystem.playSFX('attack_swordswing', 0.9);
      audioSystem.playSFX('skill_backstab', 0.7);
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
    audioSystem.playSFX('skill_dash3', 0.7);

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
  const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));
  const domainDamage = CONFIG.sukuna?.domainDamage || 15;
  const domainDamageInterval = CONFIG.sukuna?.domainDamageInterval || 20;

  if (!fighter.domainTimeInsideMap) fighter.domainTimeInsideMap = new Map();
  fighter._domainFrame = (fighter._domainFrame || 0) + 1;

  if (fighter._domainFrame % domainDamageInterval === 0) {
    let playedSwordSwing = false;
    if (fighter._slashSoundCooldown === undefined || fighter._slashSoundCooldown <= 0) {
      audioSystem.playSFX('attack_swordswing', 0.5);
      fighter._slashSoundCooldown = 15;
      playedSwordSwing = true;
    }

    let hitEnemyThisTick = false;
    const ownerIdx = state.fighters.indexOf(fighter);
    const shrineX = fighter.domainX || fighter.x;
    const shrineY = fighter.domainY || fighter.y;
    const slashSpeed = CONFIG.sukuna?.slashSpeed ?? (CONFIG.projectile?.speed ? CONFIG.projectile.speed * 1.6 : 22);

    state.fighters.forEach((f, idx) => {
      if (f && f !== fighter && f.hp > 0) {
        if (f.domainImmunity && f.characterId !== 'toji' && f.type !== 'toji') return;

        const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
        if (true) { // Hit EVERYONE in the domain (stray slashes hurt teammates)
          if (isEnemy) hitEnemyThisTick = true; // Only enemies trigger the specific hit sounds
          const timeInside = (fighter.domainTimeInsideMap.get(f) || 0) + domainDamageInterval;
          fighter.domainTimeInsideMap.set(f, timeInside);

          const rampMultiplier = 1 + (timeInside / 60) * 0.10;
          const finalDamage = domainDamage * rampMultiplier;

          // Fire a single visible ghostBlade projectile directly from Malevolent Shrine towards the target!
          const aimAngle = Math.atan2(f.y - (shrineY - 40), f.x - shrineX);
          if (projectileSystem) {
            projectileSystem.fireProjectile(
              fighter,
              ownerIdx,
              0, // 0 damage so the projectile is just a visual effect (domain deals instant damage below)
              false,
              55 + Math.random() * 20, // fast speed
              false,
              'ghostBlade',
              shrineX + (Math.random() - 0.5) * 120,
              shrineY - 60 + (Math.random() - 0.5) * 60,
              aimAngle
            );
          }

          let dmg = finalDamage;
          let isCrit = false;
          if (typeof fighter.evaluateSlashCrit === 'function') {
            const res = fighter.evaluateSlashCrit(f, finalDamage, { isDomain: true });
            dmg = res.finalDamage;
            isCrit = res.isCrit;
          }
          f.takeDamage(dmg, fighter, { isDomain: true, bypassShield: true, isSukunaSlash: true, isCrit });

          spawnSparks(f.x, f.y, 6, 'crimsonSniper', '#8B0000');
          spawnImpactFlash(f.x, f.y, 22, 'crimsonSniper');
        }
      }
    });

    if (state.illusions) {
      state.illusions.forEach((ill) => {
        if (ill && ill.hp > 0 && typeof ill.takeDamage === 'function') {
          let isEnemy = true;
          if (myTeam !== null) {
            let illOwnerIndex = -1;
            if (ill.ownerIndex !== undefined) {
              illOwnerIndex = ill.ownerIndex;
            } else if (ill.owner && state.fighters.indexOf(ill.owner) !== -1) {
              illOwnerIndex = state.fighters.indexOf(ill.owner);
            }
            if (illOwnerIndex !== -1) {
              isEnemy = state.getFighterTeam(illOwnerIndex) !== myTeam;
            }
          }
          if (true) { // Hit EVERYONE'S illusions in the domain
            if (isEnemy) hitEnemyThisTick = true;
            const timeInside = (fighter.domainTimeInsideMap.get(ill) || 0) + domainDamageInterval;
            fighter.domainTimeInsideMap.set(ill, timeInside);

            const rampMultiplier = 1 + (timeInside / 60) * 0.10;
            const finalDamage = domainDamage * rampMultiplier;

            // Fire a single visible ghostBlade projectile directly from Malevolent Shrine towards the illusion!
            const aimAngle = Math.atan2(ill.y - (shrineY - 40), ill.x - shrineX);
            if (projectileSystem) {
              projectileSystem.fireProjectile(
                fighter,
                ownerIdx,
                0, // 0 damage
                false,
                55 + Math.random() * 20, // fast speed
                false,
                'ghostBlade',
                shrineX + (Math.random() - 0.5) * 120,
                shrineY - 60 + (Math.random() - 0.5) * 60,
                aimAngle
              );
            }

            let dmg = finalDamage;
            let isCrit = false;
            if (typeof fighter.evaluateSlashCrit === 'function') {
              const res = fighter.evaluateSlashCrit(ill, finalDamage, { isDomain: true });
              dmg = res.finalDamage;
              isCrit = res.isCrit;
            }
            ill.takeDamage(dmg, fighter, { isDomain: true, bypassShield: true, isSukunaSlash: true, isCrit });

            spawnSparks(ill.x, ill.y, 6, 'crimsonSniper', '#8B0000');
            spawnImpactFlash(ill.x, ill.y, 22, 'crimsonSniper');
          }
        }
      });
    }

    if (hitEnemyThisTick && playedSwordSwing) {
      audioSystem.playSFX('skill_backstab', 0.4);
    }
  }
}
