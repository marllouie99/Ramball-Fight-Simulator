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
  // 3. Enemy Projectiles
  
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
    life: CONFIG.todo?.rockLife || 180,
    radius: 8,
    isRock: true
  };

  this.cursedRocks.push(newRock);
  this.rockThrowCooldown = this.rockThrowCooldownMax;
}

export function modUpdateCursedRocks() {
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

    if (rock.life <= 0) {
      this.cursedRocks.splice(i, 1);
    }
  }
}
