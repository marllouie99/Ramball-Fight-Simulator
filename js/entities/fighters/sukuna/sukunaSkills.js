// ─────────────────────────────────────────────
// RYOMEN SUKUNA CURSED TECHNIQUES MODULE
// Encapsulates Spiderweb (Cleave/Dismantle grid), Divine Flame (Fuga), RCT, and Domain Slashing
// ─────────────────────────────────────────────
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { projectileSystem } from '../../../systems/projectileSystem.js';
import { CONFIG } from '../../../core/config.js';
import { spawnSparks, spawnImpactFlash } from '../../../graphics/particles/sparkEffect.js';
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
          f.takeDamage(spiderwebDamage, fighter, { isSpiderweb: true });
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
  const normalCd = CONFIG.sukuna?.divineFlameCooldown || 500;
  fighter.divineFlameRecoveryTimer = CONFIG.sukuna?.divineFlameRecoveryTime || 60;
  fighter.divineFlameCooldown = normalCd;
  const shakeIntensity = isDomainFuga ? 18 : (CONFIG.sukuna?.divineFlameShakeIntensity || 10);
  const shakeDuration = isDomainFuga ? 30 : (CONFIG.sukuna?.divineFlameShakeDuration || 15);
  triggerGlobalScreenShake(shakeIntensity, shakeDuration);

  if (isDomainFuga) {
    spawnFloatingText(fighter.x, fighter.y - fighter.r - 35, 'THERMOBARIC FUGA EXPLOSION!!', '#FF3300');
    spawnImpactFlash(fighter.x, fighter.y, 140, 'gold');
    audioSystem.playSFX('attack_explosion', 1.0);
  }

  const baseDamage = CONFIG.sukuna?.divineFlameDamage || 25;
  const damage = isDomainFuga ? Math.round(baseDamage * 1.5) : baseDamage;

  if (projectileSystem && projectileSystem.fireSukunaDivineFlame) {
    projectileSystem.fireSukunaDivineFlame(fighter, ownerIndex, damage);
  }
}

export function activateReverseCursedTechnique(fighter, attacker) {
  fighter.reverseCursedTechniqueCooldown = CONFIG.sukuna?.reverseCursedTechniqueCooldown || 1200;

  const healPercent = CONFIG.sukuna?.reverseCursedTechniqueHealPercent || 0.40;
  const healAmount = fighter.maxHp * healPercent;

  if (fighter.hp <= 0) {
    fighter.hp = healAmount;
    fighter.isDead = false;
  } else {
    fighter.hp = Math.min(fighter.maxHp, fighter.hp + healAmount);
  }

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
  if (!opponent || opponent.isDead) return;
  if (fighter.isChannelingDivineFlame || (fighter.divineFlameRecoveryTimer || 0) > 0) return; // Do not teleport or slash while channeling/firing Fuga!

  const isFrozen = (fighter.timeStopTimer > 0) || (fighter.electricStunTimer > 0) || (fighter.crimsonElectrifiedTimer > 0);

  if (fighter.rapidSlashTimer === undefined || fighter.rapidSlashTimer <= 0) {
    const aimAngle = Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x);
    if (!isFrozen) {
      fighter.gunAngle = aimAngle;
    }

    const slashSpeed = CONFIG.sukuna?.slashSpeed ?? (CONFIG.projectile.speed * 1.5);
    const slashDamage = CONFIG.sukuna?.slashDamage ?? fighter.damage;

    if (projectileSystem) {
      projectileSystem.fireProjectile(
        fighter,
        ownerIndex,
        slashDamage,
        false,
        slashSpeed,
        false,
        'ghostBlade',
        fighter.x,
        fighter.y,
        aimAngle
      );
    }

    spawnFloatingText(fighter.x, fighter.y - 30, 'CLEAVE!', '#E0E8FF');
    triggerGlobalScreenShake(6, 8);
    spawnSparks(opponent.x, opponent.y, 4, 'crimsonSniper', '#8B0000');
    fighter.slashGlowTimer = 25;
    fighter.slashSwingTimer = 10;
    fighter.slashHand = fighter.slashHand === 1 ? 0 : 1;

    const cleaveAngle = aimAngle;
    opponent.vx += Math.cos(cleaveAngle) * 3;
    opponent.vy += Math.sin(cleaveAngle) * 3;

    if (!fighter.slashHitVisuals) fighter.slashHitVisuals = [];
    fighter.slashHitVisuals.push({
      x: opponent.x,
      y: opponent.y,
      angle: aimAngle,
      timer: 12,
      maxTimer: 12,
      scale: 1.0 + Math.random() * 0.3
    });

    if (fighter._slashSoundCooldown <= 0) {
      audioSystem.playSFX('attack_swordswing', 0.6);
      audioSystem.playSFX('skill_backstab', 0.5);
      fighter._slashSoundCooldown = 15;
    }

    spawnImpactFlash(fighter.x, fighter.y, 4, 'crimsonSniper');

    if (!isFrozen) {
      const oldX = fighter.x;
      const oldY = fighter.y;

      const teleportAngle = Math.random() * Math.PI * 2;
      const teleportDist = 120 + Math.random() * 150;
      fighter.x = fighter.x + Math.cos(teleportAngle) * teleportDist;
      fighter.y = fighter.y + Math.sin(teleportAngle) * teleportDist;

      if (arena) {
        fighter.x = Math.max(arena.x + fighter.r, Math.min(arena.x + arena.width - fighter.r, fighter.x));
        fighter.y = Math.max(arena.y + fighter.r, Math.min(arena.y + arena.height - fighter.r, fighter.y));
      }

      fighter.vx = 0;
      fighter.vy = 0;

      if (typeof fighter._spawnTeleportAfterimages === 'function') {
        fighter._spawnTeleportAfterimages(oldX, oldY, fighter.x, fighter.y);
      }

      spawnImpactFlash(oldX, oldY, 5, 'crimsonSniper');
      spawnImpactFlash(fighter.x, fighter.y, 5, 'crimsonSniper');
    }

    fighter.rapidSlashTimer = CONFIG.sukuna?.domainRapidSlashCooldown || 10;
  } else {
    fighter.rapidSlashTimer--;
  }

  if (!isFrozen) {
    fighter.vx = 0;
    fighter.vy = 0;
    if (typeof fighter.applyMovementPhysics === 'function') fighter.applyMovementPhysics(0);
    if (typeof fighter.resolveWallBounce === 'function') fighter.resolveWallBounce(arena, opponent);
  }

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
  const domainDamage = CONFIG.sukuna?.domainDamage || 4;
  const domainDamageInterval = CONFIG.sukuna?.domainDamageInterval || 8;

  if (!fighter.domainTimeInsideMap) fighter.domainTimeInsideMap = new Map();
  fighter._domainFrame = (fighter._domainFrame || 0) + 1;

  if (fighter._domainFrame % domainDamageInterval === 0) {
    let playedSwordSwing = false;
    if (fighter._slashSoundCooldown === undefined || fighter._slashSoundCooldown <= 0) {
      audioSystem.playSFX('attack_swordswing', 0.5);
      fighter._slashSoundCooldown = 15;
      playedSwordSwing = true;
    }

    if (!fighter.slashHitVisuals) fighter.slashHitVisuals = [];
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

          f.takeDamage(finalDamage, fighter, { isDomain: true, bypassShield: true });
          if (f.characterId !== 'toji' && f.type !== 'toji' && !f.domainImmunity && !f.immuneToCC) {
            if (typeof f.applyHitStun === 'function') f.applyHitStun(2);
          }

          spawnSparks(f.x, f.y, 6, 'crimsonSniper', '#8B0000');
          spawnImpactFlash(f.x, f.y, 22, 'crimsonSniper');
          
          // Spawn visual ghost blade slash directly on the enemy being shredded!
          fighter.slashHitVisuals.push({
            x: f.x + (Math.random() - 0.5) * f.r,
            y: f.y + (Math.random() - 0.5) * f.r,
            angle: aimAngle + (Math.random() - 0.5) * 0.6,
            timer: 8 + Math.floor(Math.random() * 4),
            maxTimer: 12,
            scale: 0.8 + Math.random() * 0.5
          });
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

            ill.takeDamage(finalDamage, fighter, { isDomain: true, bypassShield: true });
            if (typeof ill.applyHitStun === 'function') ill.applyHitStun(6);

            spawnSparks(ill.x, ill.y, 6, 'crimsonSniper', '#8B0000');
            spawnImpactFlash(ill.x, ill.y, 22, 'crimsonSniper');

            fighter.slashHitVisuals.push({
              x: ill.x + (Math.random() - 0.5) * ill.r,
              y: ill.y + (Math.random() - 0.5) * ill.r,
              angle: aimAngle + (Math.random() - 0.5) * 0.6,
              timer: 8 + Math.floor(Math.random() * 4),
              maxTimer: 12,
              scale: 0.8 + Math.random() * 0.5
            });
          }
        }
      });
    }

    if (hitEnemyThisTick && playedSwordSwing) {
      audioSystem.playSFX('skill_backstab', 0.4);
    }
  }
}
