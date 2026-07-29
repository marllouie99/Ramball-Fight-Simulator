import { CONFIG } from '../../../core/config.js';
import { playSkillEffectSound } from '../../../soundEffects/skillEffectSounds.js';
import { projectileSystem } from '../../../systems/projectileSystem.js';
import { state } from '../../../core/state.js';
import { spawnImpactFlash } from '../../../graphics/particles/sparkEffect.js';

export function modUpdateBoogieWoogie(targets) {
  // If no targets provided directly (player mode), use state fighters
  let potentialTargets = targets && targets.length > 0 ? targets : state.fighters.filter(f => f.id !== this.id && !f.isDead);

  // We can swap with:
  // 1. Cursed Rocks
  // 2. Enemy Fighters
  
  let swapTarget = null;

  // Prioritize active rocks
  if (this.cursedRocks.length > 0) {
    swapTarget = this.cursedRocks[0]; // grab the oldest active rock
  } else if (potentialTargets.length > 0) {
    // Pick the closest enemy
    let closestDist = Infinity;
    for (const pTarget of potentialTargets) {
      const d = Math.hypot(pTarget.x - this.x, pTarget.y - this.y);
      if (d < closestDist) {
        closestDist = d;
        swapTarget = pTarget;
      }
    }
  }

  // Swap!
  if (swapTarget) {
    // Play clap sound
    playSkillEffectSound('todo', 'clap');

    // Visuals at old position
    spawnImpactFlash(this.x, this.y, 15, '#4da3ff');
    spawnImpactFlash(swapTarget.x, swapTarget.y, 15, '#4da3ff');

    const tempX = this.x;
    const tempY = this.y;

    this.x = swapTarget.x;
    this.y = swapTarget.y;

    swapTarget.x = tempX;
    swapTarget.y = tempY;

    // Rule 3: Position & Target Aim Alignment
    if (swapTarget.characterId) { // It's a fighter
      this.aim(swapTarget);
    } else {
      // It was a rock or object, aim at closest enemy
      if (potentialTargets.length > 0) {
        this.aim(potentialTargets[0]);
      }
    }

    // Apply Black Flash window buff
    this.justSwappedTimer = CONFIG.todo?.blackFlashWindow || 45;
    
    // Put on cooldown
    this.boogieWoogieCooldown = this.boogieWoogieCooldownMax;
  } else {
    // Fake clap! (Mind game)
    playSkillEffectSound('todo', 'clap');
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
  // Build a list of valid enemy targets for proximity detection
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

    // --- Rock Proximity Counter-Attack ---
    // Sequence:
    // 1. Rock gets close to enemy -> Todo claps & teleports to the rock
    // 2. The rock CONTINUES to bounce around in the arena (do NOT destroy it!)
    // 3. Todo delivers attacks
    // 4. When done, he claps to get away/reposition
    if (!this.isDemoFighter && !this.rockCounterComboLeft && !rock.hasTriggeredTeleport) {
      for (const enemy of enemies) {
        const distToEnemy = Math.hypot(rock.x - enemy.x, rock.y - enemy.y);
        if (distToEnemy <= rockProximityTriggerDist) {
          rock.hasTriggeredTeleport = true; // Mark so rock doesn't re-trigger continuously

          // CLAP! Play clap sound
          playSkillEffectSound('todo', 'clap');

          // Flash at current position (departure) and at rock position (arrival)
          spawnImpactFlash(this.x, this.y, 20, '#4da3ff');
          spawnImpactFlash(rock.x, rock.y, 30, '#4da3ff');

          // Teleport Todo to where the rock is — zero velocity so he stops completely
          this.vx = 0;
          this.vy = 0;

          // Position Todo at optimal punching distance right in front of enemy
          const approachAngle = Math.atan2(rock.y - enemy.y, rock.x - enemy.x);
          const attackDist = (this.r || 25) + (enemy.r || 25) + 5;
          this.x = enemy.x + Math.cos(approachAngle) * attackDist;
          this.y = enemy.y + Math.sin(approachAngle) * attackDist;

          // Briefly dampen enemy velocity and apply heavy movement slow + hitstun so they are caught off-guard
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

          // Rule 3: Align aim immediately after teleport
          this.aim(enemy);

          // NOTE: The rock is NOT destroyed! It continues bouncing in the arena!

          // Grant Black Flash buff window — next punch deals doubled damage
          this.justSwappedTimer = CONFIG.todo?.blackFlashWindow || 45;

          // Queue up rapid follow-up punch combo
          this.rockCounterComboLeft = CONFIG.todo?.rockCounterComboHits || 3;
          this.rockCounterComboTarget = enemy;
          this.rockCounterComboInterval = CONFIG.todo?.rockCounterComboInterval || 12;
          this.rockCounterComboTimer = 0;

          break; // Only one teleport trigger per frame
        }
      }
    }

    if (rock.life <= 0) {
      this.cursedRocks.splice(i, 1);
    }
  }
}

export function modRepositionDisengage(target) {
  // CLAP!
  playSkillEffectSound('todo', 'clap');

  // Spark visuals at current position (departure)
  spawnImpactFlash(this.x, this.y, 25, '#4da3ff');

  let swappedWithRock = false;

  // 1. Look for any active bouncing rock to swap with
  if (this.cursedRocks && this.cursedRocks.length > 0) {
    // Pick the rock farthest from the enemy to maximize disengage breather distance
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
      
      // Teleport Todo to the rock's position
      this.x = rock.x;
      this.y = rock.y;
      this.vx = 0;
      this.vy = 0;

      // Consume the rock upon swapping to it
      this.cursedRocks.splice(bestIndex, 1);
      swappedWithRock = true;

      // Visual flash at arrival
      spawnImpactFlash(this.x, this.y, 30, '#4da3ff');
    }
  }

  // 2. If no rock is active, teleport backward/away from enemy (fallback breather)
  if (!swappedWithRock && target) {
    const awayAngle = Math.atan2(this.y - target.y, this.x - target.x);
    const disengageDist = CONFIG.todo?.disengageDistance || 180;
    
    let destX = this.x + Math.cos(awayAngle) * disengageDist;
    let destY = this.y + Math.sin(awayAngle) * disengageDist;

    // Clamp inside arena bounds
    const arena = CONFIG.arena;
    destX = Math.max(arena.x + arena.wallWidth + 30, Math.min(arena.x + arena.width - arena.wallWidth - 30, destX));
    destY = Math.max(arena.y + arena.wallWidth + 30, Math.min(arena.y + arena.height - arena.wallWidth - 30, destY));

    this.x = destX;
    this.y = destY;
    this.vx = Math.cos(awayAngle) * 3;
    this.vy = Math.sin(awayAngle) * 3;

    spawnImpactFlash(this.x, this.y, 30, '#4da3ff');
  }

  // Rule 3: Re-align aim towards target from new position
  if (target && !target.isDead) {
    this.aim(target);
    // Instantly remove slow & hitstun effects from target as soon as Todo teleports away
    target.slowTimer = 0;
    target.slowMultiplier = 1.0;
    if (target.hitStunTimer !== undefined) {
      target.hitStunTimer = 0;
    }
  }

  // Put skills on full sequence cooldown so Todo takes a proper breather before starting the next sequence
  const seqCd = CONFIG.todo?.sequenceCooldown || 300;
  this.boogieWoogieCooldown = seqCd;
  this.rockThrowCooldown = seqCd;
}
