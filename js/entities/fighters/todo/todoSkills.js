import { CONFIG } from '../../../core/config.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { playSkillEffectSound } from '../../../soundEffects/skillEffectSounds.js';
import { projectileSystem } from '../../../systems/projectileSystem.js';
import { state, spawnFloatingText } from '../../../core/state.js';
import { spawnImpactFlash, spawnMeleeClashShockwave, spawnSparks, spawnBoogieWoogieSwapEffect, spawnTodoClapCEParticles } from '../../../graphics/particles/sparkEffect.js';

export function modUpdateBoogieWoogie(targets) {
  if (this.isTakadaChanneling) return;
  // If no targets provided directly (player mode), use state fighters
  let potentialTargets = targets && targets.length > 0 ? targets : state.fighters.filter(f => f.id !== this.id && !f.isDead);

  let swapTarget = null;
  if (this.cursedRocks.length > 0) {
    swapTarget = this.cursedRocks[0]; // grab the oldest active rock
  } else if (potentialTargets.length > 0) {
    let closestDist = Infinity;
    for (const pTarget of potentialTargets) {
      const d = Math.hypot(pTarget.x - this.x, pTarget.y - this.y);
      if (d < closestDist) {
        closestDist = d;
        swapTarget = pTarget;
      }
    }
  }

  // Queue clap windup: hands close together in advance frames before teleporting!
  this.clapAnimTimer = 20;
  this.clapWindupTimer = 7;

  if (swapTarget) {
    this.pendingSwapData = { type: 'boogie', swapTarget, potentialTargets };
    this.boogieWoogieCooldown = this.boogieWoogieCooldownMax;
  } else {
    // Fake clap! (Mind game)
    this.pendingSwapData = { type: 'fake' };
    this.boogieWoogieCooldown = this.boogieWoogieCooldownMax / 2;
  }
}

export function hasLiveTeammate(fighter) {
  if (!state || !state.fighters) return false;
  const myIndex = state.fighters.indexOf(fighter);
  if (myIndex < 0) {
    if (fighter.team !== undefined) {
      return state.fighters.some(other => other && other !== fighter && !other.isDead && (other.hp || 0) > 0 && !other.isTurret && !other.isIllusion && other.team === fighter.team);
    }
    return false;
  }
  const myTeam = state.getFighterTeam ? state.getFighterTeam(myIndex) : null;
  if (myTeam !== null && myTeam !== undefined) {
    return state.fighters.some((other, idx) => idx !== myIndex && other && !other.isDead && (other.hp || 0) > 0 && !other.isTurret && !other.isIllusion && state.getFighterTeam(idx) === myTeam);
  }
  if (fighter.team !== undefined) {
    return state.fighters.some(other => other && other !== fighter && !other.isDead && (other.hp || 0) > 0 && !other.isTurret && !other.isIllusion && other.team === fighter.team);
  }
  return false;
}

export function modThrowCursedRock(target) {
  // Disable rock throw while Todo has an active live teammate (Todo swaps with teammate naturally!)
  if (hasLiveTeammate(this)) return;

  // Only 1 active rock allowed at a time when solo/teammate dead
  if (this.cursedRocks && this.cursedRocks.length >= (CONFIG.todo?.maxRocks || 1)) return;

  // Angle
  let angle = this.gunAngle;
  if (target) {
    angle = Math.atan2(target.y - this.y, target.x - this.x);
  } else if (this.playerControlled && state.mouseX !== undefined) {
     angle = Math.atan2(state.mouseY - this.y, state.mouseX - this.x);
  }

  const speed = CONFIG.todo?.rockSpeed || 12;
  const rad = 8;
  let spawnX = this.x + Math.cos(angle) * this.r;
  let spawnY = this.y + Math.sin(angle) * this.r;

  const arena = CONFIG.arena;
  if (arena) {
    const wallW = arena.wallWidth || 4;
    spawnX = Math.max(arena.x + wallW + rad, Math.min(arena.x + arena.width - wallW - rad, spawnX));
    spawnY = Math.max(arena.y + wallW + rad, Math.min(arena.y + arena.height - wallW - rad, spawnY));
  }

  const newRock = {
    x: spawnX,
    y: spawnY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: CONFIG.todo?.rockLife || 240,
    radius: rad,
    isRock: true,
    hasTriggeredTeleport: false
  };

  this.cursedRocks.push(newRock);
  this.rockThrowCooldown = this.rockThrowCooldownMax;
}

export function modUpdateCursedRocks(targets) {
  const enemies = targets && targets.length > 0
    ? targets
    : state.fighters.filter(f => f.id !== this.id && !f.isDead && f.hp > 0);

  const rockProximityTriggerDist = CONFIG.todo?.rockProximityTriggerDist || 75;

  for (let i = this.cursedRocks.length - 1; i >= 0; i--) {
    let rock = this.cursedRocks[i];
    rock.x += rock.vx;
    rock.y += rock.vy;
    rock.life--;

    // Bounce off walls
    const arena = CONFIG.arena;
    if (rock.x - rock.radius < arena.x + arena.wallWidth) { rock.x = arena.x + arena.wallWidth + rock.radius; rock.vx *= -1; }
    if (rock.x + rock.radius > arena.x + arena.width - arena.wallWidth) { rock.x = arena.x + arena.width - arena.wallWidth - rock.radius; rock.vx *= -1; }
    if (rock.y - rock.radius < arena.y + arena.wallWidth) { rock.y = arena.y + arena.wallWidth + rock.radius; rock.vy *= -1; }
    if (rock.y + rock.radius > arena.y + arena.height - arena.wallWidth) { rock.y = arena.y + arena.height - arena.wallWidth - rock.radius; rock.vy *= -1; }

    if (!this.isDemoFighter && !this.rockCounterComboLeft && !rock.hasTriggeredTeleport && !this.clapWindupTimer && !this.clapHoldTimer) {
      for (const enemy of enemies) {
        const distToEnemy = Math.hypot(rock.x - enemy.x, rock.y - enemy.y);
        if (distToEnemy <= rockProximityTriggerDist) {
          rock.hasTriggeredTeleport = true; // Mark so rock doesn't re-trigger continuously

          // Advance windup frames: hands slam together before teleport!
          this.clapAnimTimer = 20;
          this.clapWindupTimer = 7;
          this.pendingSwapData = { type: 'rock', rock, enemy };
          break;
        }
      }
    }

    if (rock.life <= 0) {
      this.cursedRocks.splice(i, 1);
    }
  }
}

export function modRepositionDisengage(target) {
  // Self swap disengage escape disabled as requested
  return;
}

/**
 * Applies a global attack reaction delay to all enemies when Todo or his partner swaps.
 */
export function applyBoogieDisorientation(todoFighter) {
  if (!state || !state.fighters) return;
  const myIdx = state.fighters.indexOf(todoFighter);
  const myTeam = (state.getFighterTeam && myIdx >= 0) ? state.getFighterTeam(myIdx) : todoFighter.team;
  const disorientFrames = CONFIG.todo?.swapDisorientationFrames ?? 20;

  // Process fighters first (use loop index for team check — no indexOf needed)
  for (let fi = 0; fi < state.fighters.length; fi++) {
    const enemy = state.fighters[fi];
    if (!enemy || enemy === todoFighter || enemy.hp <= 0) continue;
    const isTeammate = (state.getFighterTeam && myIdx >= 0)
      ? (state.getFighterTeam(fi) === myTeam)
      : (enemy.team === todoFighter.team);
    if (isTeammate) continue;

    if ('shootCooldown' in enemy) enemy.shootCooldown = Math.max(enemy.shootCooldown || 0, disorientFrames);
    if ('cooldown' in enemy) enemy.cooldown = Math.max(enemy.cooldown || 0, disorientFrames);
    if ('cooldownTimer' in enemy) enemy.cooldownTimer = Math.max(enemy.cooldownTimer || 0, disorientFrames);
    if ('meleePunchCooldown' in enemy) enemy.meleePunchCooldown = Math.max(enemy.meleePunchCooldown || 0, disorientFrames);
    if ('swordCooldown' in enemy) enemy.swordCooldown = Math.max(enemy.swordCooldown || 0, disorientFrames);
    if ('attackCooldown' in enemy) enemy.attackCooldown = Math.max(enemy.attackCooldown || 0, disorientFrames);
  }

  // Process illusions separately (derive team from owner — no indexOf on illusions)
  if (state.illusions) {
    for (let ii = 0; ii < state.illusions.length; ii++) {
      const enemy = state.illusions[ii];
      if (!enemy || enemy === todoFighter || enemy.hp <= 0) continue;
      // Check if illusion's owner is a teammate
      if (enemy.owner && myTeam !== null && myTeam !== undefined) {
        const ownerIdx = state.fighters.indexOf(enemy.owner);
        const ownerTeam = (state.getFighterTeam && ownerIdx >= 0) ? state.getFighterTeam(ownerIdx) : enemy.owner.team;
        if (ownerTeam === myTeam) continue;
      }

      if ('shootCooldown' in enemy) enemy.shootCooldown = Math.max(enemy.shootCooldown || 0, disorientFrames);
      if ('cooldown' in enemy) enemy.cooldown = Math.max(enemy.cooldown || 0, disorientFrames);
      if ('cooldownTimer' in enemy) enemy.cooldownTimer = Math.max(enemy.cooldownTimer || 0, disorientFrames);
      if ('meleePunchCooldown' in enemy) enemy.meleePunchCooldown = Math.max(enemy.meleePunchCooldown || 0, disorientFrames);
      if ('swordCooldown' in enemy) enemy.swordCooldown = Math.max(enemy.swordCooldown || 0, disorientFrames);
      if ('attackCooldown' in enemy) enemy.attackCooldown = Math.max(enemy.attackCooldown || 0, disorientFrames);
    }
  }
}

/**
 * Grants an evasion buff against basic attacks to Todo and his active teammate when swapping via Boogie Woogie.
 */
export function applyBoogieEvadeBuff(todoFighter) {
  if (!state || !state.fighters) return;
  const myIdx = state.fighters.indexOf(todoFighter);
  const myTeam = (state.getFighterTeam && myIdx >= 0) ? state.getFighterTeam(myIdx) : todoFighter.team;
  const duration = CONFIG.todo?.evadeBuffDurationFrames ?? 75; // ~1.25s
  const chance = CONFIG.todo?.evadeChance ?? 0.60;

  // Apply to Todo
  todoFighter.evadeBuffTimer = Math.max(todoFighter.evadeBuffTimer || 0, duration);
  todoFighter.evadeChance = chance;
  spawnSparks(todoFighter.x, todoFighter.y, 8, 'lightningTrail', '#00E5FF');

  // Apply to living teammates
  for (let i = 0; i < state.fighters.length; i++) {
    const f = state.fighters[i];
    if (!f || f === todoFighter || f.hp <= 0) continue;
    const isTeammate = (state.getFighterTeam && myIdx >= 0)
      ? (state.getFighterTeam(i) === myTeam)
      : (f.team === todoFighter.team);
    if (isTeammate) {
      f.evadeBuffTimer = Math.max(f.evadeBuffTimer || 0, duration);
      f.evadeChance = chance;
      spawnSparks(f.x, f.y, 8, 'lightningTrail', '#00E5FF');
    }
  }
}

export function modExecutePendingSwap() {
  if (!this.pendingSwapData) return;
  const data = this.pendingSwapData;
  this.pendingSwapData = null;

  // CLAP SOUND & VISUAL EFFECT! Triggered at hands collision point
  let clapAudioHandle = null;
  if (CONFIG.todo?.clapSound) {
    clapAudioHandle = audioSystem.playSFX(CONFIG.todo.clapSound, CONFIG.todo.clapVolume ?? 2.0);
  } else {
    clapAudioHandle = playSkillEffectSound('todo', 'clap');
  }

  // Smooth fade-out effect on the clap audio tail
  const fadeMs = CONFIG.todo?.clapFadeDurationMs ?? 400;
  if (clapAudioHandle && fadeMs > 0) {
    setTimeout(() => {
      audioSystem.fadeOutSFX(clapAudioHandle, fadeMs);
    }, 100);
  }

  spawnMeleeClashShockwave(this.x, this.y, 90, 'todo');
  spawnSparks(this.x, this.y, 16, 'lightningTrail', '#00E5FF');
  spawnImpactFlash(this.x, this.y, 35, '#00E5FF');
  spawnTodoClapCEParticles(this.x, this.y, this.gunAngle || 0);

  const vanishFrames = CONFIG.todo?.vanishDurationFrames ?? 3;

  if (data.type === 'fake') {
    this.vanishTimer = vanishFrames;
    return;
  }

  if (data.type === 'boogie') {
    const swapTarget = data.swapTarget;
    if (swapTarget && (swapTarget.hp > 0 || swapTarget.isRock)) {
      const oldTodoX = this.x;
      const oldTodoY = this.y;
      const oldTargetX = swapTarget.x;
      const oldTargetY = swapTarget.y;

      spawnMeleeClashShockwave(oldTargetX, oldTargetY, 80, 'todo');
      spawnSparks(oldTargetX, oldTargetY, 12, 'lightningTrail', '#00E5FF');
      spawnImpactFlash(oldTodoX, oldTodoY, 15, '#4da3ff');
      spawnImpactFlash(oldTargetX, oldTargetY, 15, '#4da3ff');
      spawnTodoClapCEParticles(oldTargetX, oldTargetY, 0);

      this.x = oldTargetX;
      this.y = oldTargetY;
      swapTarget.x = oldTodoX;
      swapTarget.y = oldTodoY;

      // Flash vanish delay where both entities become invisible during swap
      this.vanishTimer = vanishFrames;
      if (swapTarget.characterId || !swapTarget.isRock) {
        swapTarget.vanishTimer = vanishFrames;
      }

      // Trigger full Boogie Woogie Swap Visual Beam ONLY for fighter/partner swaps (not rocks)
      if (!swapTarget.isRock) {
        spawnBoogieWoogieSwapEffect(oldTodoX, oldTodoY, oldTargetX, oldTargetY);
      }

      const arena = CONFIG.arena;
      if (arena) {
        const wallW = arena.wallWidth || 4;
        const myR = this.r || 25;
        this.x = Math.max(arena.x + wallW + myR, Math.min(arena.x + arena.width - wallW - myR, this.x));
        this.y = Math.max(arena.y + wallW + myR, Math.min(arena.y + arena.height - wallW - myR, this.y));
      }

      if (swapTarget.characterId) {
        this.aim(swapTarget);
      } else if (data.potentialTargets && data.potentialTargets.length > 0) {
        this.aim(data.potentialTargets[0]);
      }

      this.justSwappedTimer = CONFIG.todo?.blackFlashWindow || 45;
      this.blackFlashGlowTimer = this.justSwappedTimer;

      // Apply global attack reaction delay to enemies
      applyBoogieDisorientation(this);
      // Apply evasion buff to Todo and active teammate
      applyBoogieEvadeBuff(this);
    }
  } else if (data.type === 'rescueTeammate') {
    const teammate = data.swapTarget;
    if (teammate && teammate.hp > 0) {
      const distToTeammate = Math.hypot(this.x - teammate.x, this.y - teammate.y);
      const minSwapDist = CONFIG.todo?.minTeammateSwapDistance || 120;
      if (distToTeammate < minSwapDist) return;

      const oldTodoX = this.x;
      const oldTodoY = this.y;
      const oldTeamX = teammate.x;
      const oldTeamY = teammate.y;

      this.x = oldTeamX;
      this.y = oldTeamY;
      teammate.x = oldTodoX;
      teammate.y = oldTodoY;

      // Flash vanish delay where both Todo and partner become invisible during rescue swap
      this.vanishTimer = vanishFrames;
      teammate.vanishTimer = vanishFrames;

      // Spawn Expanding Boogie Woogie Shockwave Rings at BOTH swap positions!
      spawnMeleeClashShockwave(oldTodoX, oldTodoY, 130, 'todo');
      spawnMeleeClashShockwave(oldTeamX, oldTeamY, 130, 'todo');
      spawnMeleeClashShockwave(oldTeamX, oldTeamY, 165, 'gojo'); // Partner rescue protection ring

      spawnSparks(oldTodoX, oldTodoY, 18, 'lightningTrail', '#00E5FF');
      spawnSparks(oldTeamX, oldTeamY, 18, 'lightningTrail', '#00E5FF');
      spawnImpactFlash(oldTodoX, oldTodoY, 40, '#00E5FF');
      spawnImpactFlash(oldTeamX, oldTeamY, 40, '#00E5FF');
      spawnTodoClapCEParticles(oldTeamX, oldTeamY, 0);

      // Trigger full Boogie Woogie Swap Visual Beam between original positions!
      spawnBoogieWoogieSwapEffect(oldTodoX, oldTodoY, oldTeamX, oldTeamY);

      const arena = CONFIG.arena;
      if (arena) {
        const wallW = arena.wallWidth || 4;
        const myR = this.r || 25;
        this.x = Math.max(arena.x + wallW + myR, Math.min(arena.x + arena.width - wallW - myR, this.x));
        this.y = Math.max(arena.y + wallW + myR, Math.min(arena.y + arena.height - wallW - myR, this.y));
        const teamR = teammate.r || 25;
        teammate.x = Math.max(arena.x + wallW + teamR, Math.min(arena.x + arena.width - wallW - teamR, teammate.x));
        teammate.y = Math.max(arena.y + wallW + teamR, Math.min(arena.y + arena.height - wallW - teamR, teammate.y));
      }

      // Rescued teammate gains invulnerability buffer to survive the fatal hit!
      const invulnFrames = CONFIG.todo?.rescueInvulnerableFrames || 45;
      teammate.invulnerableTimer = Math.max(teammate.invulnerableTimer || 0, invulnFrames);

      // Aim Todo at nearest enemy to immediately step in and unleash combo flurry!
      let nearestEnemy = data.targetEnemy;
      if (!nearestEnemy || nearestEnemy.hp <= 0) {
        let minDist = Infinity;
        if (state && state.fighters) {
          const myIdx = state.fighters.indexOf(this);
          const myTeam = state.getFighterTeam ? state.getFighterTeam(myIdx) : null;
          for (let i = 0; i < state.fighters.length; i++) {
            const f = state.fighters[i];
            if (f && f.hp > 0 && state.getFighterTeam(i) !== myTeam) {
              const d = Math.hypot(f.x - this.x, f.y - this.y);
              if (d < minDist) {
                minDist = d;
                nearestEnemy = f;
              }
            }
          }
        }
      }

      if (nearestEnemy) {
        this.aim(nearestEnemy);
        // Initiate Todo's Brawler Counter-Attack Flurry upon swapping in!
        this.rockCounterComboLeft = CONFIG.todo?.rockCounterComboHits || 7;
        this.rockCounterComboTarget = nearestEnemy;
        this.rockCounterComboInterval = CONFIG.todo?.rockCounterComboInterval || 10;
        this.rockCounterComboTimer = 0;
      }

      this.justSwappedTimer = CONFIG.todo?.blackFlashWindow || 45;
      this.blackFlashGlowTimer = this.justSwappedTimer;

      // Apply global attack reaction delay to enemies
      applyBoogieDisorientation(this);
      // Apply evasion buff to Todo and active teammate
      applyBoogieEvadeBuff(this);
    }
  } else if (data.type === 'rock') {
    const { rock, enemy } = data;
    if (enemy && enemy.hp > 0) {
      spawnMeleeClashShockwave(rock.x, rock.y, 80, 'todo');
      spawnSparks(rock.x, rock.y, 14, 'lightningTrail', '#00E5FF');
      spawnImpactFlash(this.x, this.y, 20, '#4da3ff');
      spawnImpactFlash(rock.x, rock.y, 30, '#4da3ff');

      this.vx = 0;
      this.vy = 0;

      const approachAngle = Math.atan2(rock.y - enemy.y, rock.x - enemy.x);
      const attackDist = (this.r || 25) + (enemy.r || 25) + 5;

      this.x = enemy.x + Math.cos(approachAngle) * attackDist;
      this.y = enemy.y + Math.sin(approachAngle) * attackDist;
      this.vanishTimer = vanishFrames;

      const arena = CONFIG.arena;
      if (arena) {
        const wallW = arena.wallWidth || 4;
        const myR = this.r || 25;
        this.x = Math.max(arena.x + wallW + myR, Math.min(arena.x + arena.width - wallW - myR, this.x));
        this.y = Math.max(arena.y + wallW + myR, Math.min(arena.y + arena.height - wallW - myR, this.y));
      }

      // Initial arrival physics pushback impulse on Rock Proximity swap arrival
      const isGojoInfinity = enemy && (enemy.characterId === 'gojo' || enemy.type === 'gojo') && (enemy.infinityCooldown <= 0 || enemy.infinityActive) && !enemy.isMeleeMode;

      if (!isGojoInfinity) {
        const pushAngle = Math.atan2(enemy.y - rock.y, enemy.x - rock.x);
        const arrivalPush = CONFIG.todo?.rockArrivalPushback || 8.0;
        enemy.vx = Math.cos(pushAngle) * arrivalPush;
        enemy.vy = Math.sin(pushAngle) * arrivalPush;
        if (typeof enemy.applyKnockback === 'function') {
          enemy.applyKnockback(Math.cos(pushAngle) * arrivalPush, Math.sin(pushAngle) * arrivalPush);
        }

        const slowDur = CONFIG.todo?.slowDuration || 60;
        const slowMult = CONFIG.todo?.slowMultiplier || 0.25;
        const hitStun = CONFIG.todo?.hitStunFrames || 20;

        if (typeof enemy.applySlow === 'function') {
          enemy.applySlow(slowDur, slowMult);
        } else {
          enemy.slowTimer = slowDur;
          enemy.slowMultiplier = slowMult;
        }

        if (typeof enemy.applyHitStun === 'function') {
          enemy.applyHitStun(hitStun);
        }
      } else {
        // Gojo blocks rock swap arrival with Limitless Infinity barrier!
        if (typeof enemy.triggerInfinityBlock === 'function') {
          enemy.triggerInfinityBlock(this.x, this.y, this);
        }
      }

      this.aim(enemy);
      this.justSwappedTimer = CONFIG.todo?.blackFlashWindow || 45;
      this.blackFlashGlowTimer = this.justSwappedTimer;

      this.rockCounterComboLeft = CONFIG.todo?.rockCounterComboHits || 3;
      this.rockCounterComboTarget = enemy;
      this.rockCounterComboInterval = CONFIG.todo?.rockCounterComboInterval || 12;
      this.rockCounterComboTimer = 0;

      // Apply global attack reaction delay to enemies
      applyBoogieDisorientation(this);
      // Apply evasion buff to Todo and active teammate
      applyBoogieEvadeBuff(this);
    }
  } else if (data.type === 'disengage') {
    const target = data.target;
    spawnImpactFlash(this.x, this.y, 25, '#4da3ff');

    let swappedWithRock = false;
    const oldX = this.x;
    const oldY = this.y;

    if (this.cursedRocks && this.cursedRocks.length > 0) {
      let bestIndex = -1;
      let maxDist = -1;

      for (let i = 0; i < this.cursedRocks.length; i++) {
        const r = this.cursedRocks[i];
        const distToEnemy = target ? Math.hypot(r.x - target.x, r.y - target.y) : 200;
        if (distToEnemy > maxDist) {
          maxDist = distToEnemy;
          bestIndex = i;
        }
      }

      if (bestIndex >= 0) {
        const rock = this.cursedRocks[bestIndex];
        this.x = rock.x;
        this.y = rock.y;
        this.vx = 0;
        this.vy = 0;
        this.cursedRocks.splice(bestIndex, 1);
        swappedWithRock = true;
        spawnImpactFlash(this.x, this.y, 30, '#4da3ff');
      }
    }

    if (target && !target.isDead) {
      this.aim(target);
      target.slowTimer = 0;
      target.slowMultiplier = 1.0;
      if (target.hitStunTimer !== undefined) {
        target.hitStunTimer = 0;
      }
    }

    const seqCd = CONFIG.todo?.sequenceCooldown || 300;
    this.boogieWoogieCooldown = seqCd;
    this.rockThrowCooldown = seqCd;
  }
}

/**
 * Monitors Todo's teammate in pair team modes (1v2, 2v2).
 * Triggers Boogie Woogie rescue swap if teammate takes >= 35 damage or HP drops to <= 30% within a 2-second window.
 */
export function modCheckTeammateRescue() {
  if (!state || !state.fighters) return false;
  if (this.isTakadaChanneling) return false;
  if (this.boogieWoogieCooldown > 0 || this.clapWindupTimer > 0 || this.clapHoldTimer > 0 || (this.rockCounterComboLeft || 0) > 0) return false;
  if (this.timeStopTimer > 0 || this.electricStunTimer > 0 || this.isTargetOfAmbush) return false;

  const myIndex = state.fighters.indexOf(this);
  if (myIndex < 0) return false;
  const myTeam = state.getFighterTeam ? state.getFighterTeam(myIndex) : null;
  if (myTeam === null || myTeam === undefined) return false;

  // Find live teammate
  let teammate = null;
  for (let i = 0; i < state.fighters.length; i++) {
    const f = state.fighters[i];
    if (f && f !== this && f.hp > 0 && !f.isIllusion) {
      if (state.getFighterTeam(i) === myTeam) {
        teammate = f;
        break;
      }
    }
  }

  if (!teammate) return false;

  // RULE 1: Do NOT swap if Todo and his partner are in close distance to each other!
  const distToTeammate = Math.hypot(this.x - teammate.x, this.y - teammate.y);
  const minSwapDist = CONFIG.todo?.minTeammateSwapDistance || 140;
  if (distToTeammate < minSwapDist) return false;

  // RULE 2: Todo should swap whenever his partner OR him is very close distance to the enemy!
  const proximityThreshold = CONFIG.todo?.enemyProximitySwapDistance || 130;
  
  let closestEnemyToPartner = null;
  let distPartnerToEnemy = Infinity;
  let closestEnemyToTodo = null;
  let distTodoToEnemy = Infinity;

  for (let i = 0; i < state.fighters.length; i++) {
    const f = state.fighters[i];
    if (f && f.hp > 0 && !f.isIllusion && state.getFighterTeam(i) !== myTeam) {
      const dPartner = Math.hypot(f.x - teammate.x, f.y - teammate.y);
      if (dPartner < distPartnerToEnemy) {
        distPartnerToEnemy = dPartner;
        closestEnemyToPartner = f;
      }
      const dTodo = Math.hypot(f.x - this.x, f.y - this.y);
      if (dTodo < distTodoToEnemy) {
        distTodoToEnemy = dTodo;
        closestEnemyToTodo = f;
      }
    }
  }

  // Check if either partner is in close distance to an enemy OR Todo is in close distance to an enemy
  const partnerCloseReach = (teammate.r || 25) + proximityThreshold;
  const todoCloseReach = (this.r || 25) + proximityThreshold;
  const isPartnerCloseToEnemy = closestEnemyToPartner && (distPartnerToEnemy <= partnerCloseReach);
  const isTodoCloseToEnemy = closestEnemyToTodo && (distTodoToEnemy <= todoCloseReach);

  // Also track emergency damage taken by partner in rolling 2-second window
  const now = Date.now();
  if (!teammate._rescueDamageHistory) {
    teammate._rescueDamageHistory = [];
  }
  if (teammate._lastRescueHp === undefined) {
    teammate._lastRescueHp = teammate.hp;
  }

  const hpLoss = teammate._lastRescueHp - teammate.hp;
  if (hpLoss > 0) {
    teammate._rescueDamageHistory.push({ time: now, damage: hpLoss });
  }
  teammate._lastRescueHp = teammate.hp;

  teammate._rescueDamageHistory = teammate._rescueDamageHistory.filter(hit => now - hit.time <= 2000);

  const damageIn2Sec = teammate._rescueDamageHistory.reduce((sum, hit) => sum + hit.damage, 0);
  const hpRatio = teammate.hp / (teammate.maxHp || 100);
  const isTakingHeavyDamage = hpLoss > 0 || damageIn2Sec >= 15 || hpRatio <= 0.45;

  // Trigger natural Boogie Woogie teammate swap when partner OR Todo is close to an enemy!
  if (isPartnerCloseToEnemy || isTodoCloseToEnemy || isTakingHeavyDamage) {
    this.clapAnimTimer = 20;
    this.clapWindupTimer = 7;
    this.boogieWoogieCooldown = CONFIG.todo?.clapCooldown || 60;
    const targetEnemy = isPartnerCloseToEnemy ? closestEnemyToPartner : closestEnemyToTodo;
    this.pendingSwapData = { type: 'rescueTeammate', swapTarget: teammate, targetEnemy };

    // Play Todo's "Brother!" voiceline on teammate swap based on config chance
    const brotherChance = CONFIG.todo?.brotherVoiceChance ?? 0.25;
    if (Math.random() < brotherChance) {
      const brotherSnd = CONFIG.todo?.brotherVoiceSound || 'Assets/Sound Effects/Skills/todo-brother-voiceline.mp3';
      const brotherVol = CONFIG.todo?.brotherVoiceVolume ?? 2.5;
      audioSystem.playSFX(brotherSnd, brotherVol);
    }

    teammate._rescueDamageHistory = [];
    return true;
  }

  return false;
}

/**
 * Starts Aoi Todo's 3-second (180 frames) Takada-chan Imagination channeling phase.
 * Plays his channeling voiceline and schedules the background song fade-in!
 */
export function modStartTakadaChanneling(force = false) {
  if ((this.takadaUltCooldown || 0) > 0 || this.isTakadaChanneling || this.isTakadaUltActive) return false;

  // Strict 50% HP threshold check: Cannot auto-trigger ultimate if HP is above 50%!
  const hpThreshold = CONFIG.todo?.hpThresholdUltTrigger ?? 0.50;
  const hpUltEnabled = CONFIG.todo?.enableHpThresholdUlt !== false;
  if (!force && hpUltEnabled && (this.hp / (this.maxHp || 100)) > hpThreshold) {
    return false;
  }

  const channelFrames = CONFIG.todo?.channelDuration || 180;
  this.isTakadaChanneling = true;
  this.takadaChannelTimer = channelFrames;
  this.takadaSongStarted = false;
  this.takadaSongHandle = null;
  this.takadaSongFadedOut = false;
  this.takadaUltCooldown = CONFIG.todo?.ultCooldown || 1200;
  this.pureLoveBeamRecoveryTimer = 0;
  this.hitStunTimer = 0;

  spawnImpactFlash(this.x, this.y, 45, '#ec4899');
  spawnFloatingText(this.x, this.y - (this.r || 25) - 30, "530,000 IQ CPU THINKING...", "#ec4899");

  // Play 3.0s channeling voice line
  const channelVoice = CONFIG.todo?.takadaChannelingVoiceline || 'Assets/Sound Effects/Skills/todo-tadakaimagination-voiceline.mp3';
  const voiceVol = CONFIG.todo?.takadaChannelingVoiceVolume ?? 3.5;
  audioSystem.playSFX('skill_todotadakachannelvoice', voiceVol);
  audioSystem.playSFX(channelVoice, voiceVol);

  return true;
}

/**
 * Activates Takada-chan Idol Ultimate mode after the 3-second channeling phase finishes.
 */
export function modActivateTakadaUltimate() {
  this.isTakadaChanneling = false;
  const dur = CONFIG.todo?.ultDuration ?? 5000;
  this.isTakadaUltActive = true;
  this.takadaUltTimer = dur;

  spawnImpactFlash(this.x, this.y, 60, '#ec4899');
  spawnMeleeClashShockwave(this.x, this.y, 140, 'pink');
  spawnSparks(this.x, this.y, 30, 'lightningTrail', '#ff66cc');
  spawnFloatingText(this.x, this.y - (this.r || 25) - 30, "TAKADA-CHAN 530,000 IQ!", "#ec4899");
}

export function modTriggerTakadaUltimate() {
  return modStartTakadaChanneling.call(this, true);
}
