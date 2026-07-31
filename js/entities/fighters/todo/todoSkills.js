import { CONFIG } from '../../../core/config.js';
import { playSkillEffectSound } from '../../../soundEffects/skillEffectSounds.js';
import { projectileSystem } from '../../../systems/projectileSystem.js';
import { state } from '../../../core/state.js';
import { spawnImpactFlash, spawnMeleeClashShockwave, spawnSparks } from '../../../graphics/particles/sparkEffect.js';

export function modUpdateBoogieWoogie(targets) {
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

export function modThrowCursedRock(target) {
  // Only 1 active rock allowed at a time
  if (this.cursedRocks && this.cursedRocks.length >= (CONFIG.todo?.maxRocks || 1)) return;

  // Angle
  let angle = this.gunAngle;
  if (target) {
    angle = Math.atan2(target.y - this.y, target.x - this.x);
  } else if (this.playerControlled && state.mouseX !== undefined) {
     angle = Math.atan2(state.mouseY - this.y, state.mouseX - this.x);
  }

  const speed = CONFIG.todo?.rockSpeed || 12;
  const newRock = {
    x: this.x + Math.cos(angle) * this.r,
    y: this.y + Math.sin(angle) * this.r,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: CONFIG.todo?.rockLife || 240,
    radius: 8,
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

    if (!this.isDemoFighter && !this.rockCounterComboLeft && !rock.hasTriggeredTeleport && !this.clapWindupTimer) {
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
  // Advance windup frames: hands slam together before teleport!
  this.clapAnimTimer = 20;
  this.clapWindupTimer = 7;
  this.pendingSwapData = { type: 'disengage', target };
}

export function modExecutePendingSwap() {
  if (!this.pendingSwapData) return;
  const data = this.pendingSwapData;
  this.pendingSwapData = null;

  // CLAP SOUND & VISUAL EFFECT! Triggered at hands collision point
  playSkillEffectSound('todo', 'clap');
  spawnMeleeClashShockwave(this.x, this.y, 90, 'todo');
  spawnSparks(this.x, this.y, 16, 'lightningTrail', '#00E5FF');
  spawnImpactFlash(this.x, this.y, 35, '#00E5FF');

  if (data.type === 'fake') {
    return;
  }

  if (data.type === 'boogie') {
    const swapTarget = data.swapTarget;
    if (swapTarget && swapTarget.hp > 0) {
      spawnMeleeClashShockwave(swapTarget.x, swapTarget.y, 80, 'todo');
      spawnSparks(swapTarget.x, swapTarget.y, 12, 'lightningTrail', '#00E5FF');
      spawnImpactFlash(this.x, this.y, 15, '#4da3ff');
      spawnImpactFlash(swapTarget.x, swapTarget.y, 15, '#4da3ff');

      const tempX = this.x;
      const tempY = this.y;

      this.x = swapTarget.x;
      this.y = swapTarget.y;

      swapTarget.x = tempX;
      swapTarget.y = tempY;

      if (swapTarget.characterId) {
        this.aim(swapTarget);
      } else if (data.potentialTargets && data.potentialTargets.length > 0) {
        this.aim(data.potentialTargets[0]);
      }

      this.justSwappedTimer = CONFIG.todo?.blackFlashWindow || 45;
      this.blackFlashGlowTimer = this.justSwappedTimer;
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

      enemy.vx *= 0.1;
      enemy.vy *= 0.1;

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

      this.aim(enemy);
      this.justSwappedTimer = CONFIG.todo?.blackFlashWindow || 45;
      this.blackFlashGlowTimer = this.justSwappedTimer;

      this.rockCounterComboLeft = CONFIG.todo?.rockCounterComboHits || 3;
      this.rockCounterComboTarget = enemy;
      this.rockCounterComboInterval = CONFIG.todo?.rockCounterComboInterval || 12;
      this.rockCounterComboTimer = 0;
    }
  } else if (data.type === 'disengage') {
    const target = data.target;
    spawnImpactFlash(this.x, this.y, 25, '#4da3ff');

    let swappedWithRock = false;

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

    if (!swappedWithRock && target) {
      const awayAngle = Math.atan2(this.y - target.y, this.x - target.x);
      const disengageDist = CONFIG.todo?.disengageDistance || 180;

      let destX = this.x + Math.cos(awayAngle) * disengageDist;
      let destY = this.y + Math.sin(awayAngle) * disengageDist;

      const arena = CONFIG.arena;
      destX = Math.max(arena.x + arena.wallWidth + 30, Math.min(arena.x + arena.width - arena.wallWidth - 30, destX));
      destY = Math.max(arena.y + arena.wallWidth + 30, Math.min(arena.y + arena.height - arena.wallWidth - 30, destY));

      this.x = destX;
      this.y = destY;
      this.vx = Math.cos(awayAngle) * 3;
      this.vy = Math.sin(awayAngle) * 3;

      spawnImpactFlash(this.x, this.y, 30, '#4da3ff');
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
