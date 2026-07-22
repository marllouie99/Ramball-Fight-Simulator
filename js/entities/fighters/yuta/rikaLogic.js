import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { spawnSparks, spawnImpactFlash } from '../../../graphics/particles/sparkEffect.js';

export function initRika(fighter) {
  fighter.rika = {
    active: false,
    timer: 0,
    cooldownTimer: CONFIG.yuta.rikaCooldown || 1000,
    x: fighter.x,
    y: fighter.y,
    vx: 0,
    vy: 0,
    r: CONFIG.yuta.rikaRadius || 30,
    target: null,
    attackTimer: 0,       // Overall attack cooldown state
    rightArmTimer: 0,     // Right arm swing timer
    leftArmTimer: 0,      // Left arm swing timer
    lastArmUsed: 'left',  // Track alternating hand swings
    isDying: false,
    deathTimer: 0,
    disappearing: false,
    disappearTimer: 0,
    disappearDuration: 30,
    startX: 0,
    startY: 0,
    maxHp: CONFIG.yuta.rikaMaxHp || 500,
    hp: 0,
    isRika: true,
    owner: fighter,
    hitStunTimer: 0,
    timeStopTimer: 0,
    applyHitStun: function(duration) {
      if (duration > this.hitStunTimer) this.hitStunTimer = duration;
    },
    applyTimeStop: function(duration) {
      if (duration > this.timeStopTimer) this.timeStopTimer = duration;
    },
    applyKnockback: function(vx, vy) {
      if (typeof vx === 'number') this.vx = (this.vx || 0) + vx;
      if (typeof vy === 'number') this.vy = (this.vy || 0) + vy;
    },
    applyBurn: function() {},
    applyPoison: function() {},
    applyShock: function() {},
    takeDamage: function(amount, attacker, opts = {}) {
      if (this.disappearing || !this.active || this.hp <= 0) return false;
      this.hp -= amount;
      
      // Floating text
      if (typeof spawnFloatingText === 'function') {
        const text = opts.isCrit ? `CRIT! ${Math.floor(amount)}` : Math.floor(amount);
        const color = opts.isCrit ? '#ff0000' : '#ffffff';
        spawnFloatingText(this.x, this.y - this.r - 10, text, color);
      }
      return true;
    }
  };
}

export function updateRika(fighter, arena) {
  if (!fighter.rika) return;

  const rk = fighter.rika;

  if (!rk.active && rk.cooldownTimer > 0) {
    rk.cooldownTimer--;
  }

  // Handle Rika Manifestation Duration
  if (rk.active) {
    if (rk.isDying) {
      rk.deathTimer--;
      rk.vx = 0;
      rk.vy = 0;
      
      // Death animation visuals (continuous sparks leaking)
      if (rk.deathTimer % 4 === 0) {
        spawnSparks(rk.x + (Math.random() - 0.5) * 30, rk.y + (Math.random() - 0.5) * 30, 2, 'rikaCurse');
      }

      if (rk.deathTimer <= 0) {
        // Final explosive scatter
        if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(12, 20);
        if (typeof spawnImpactFlash === 'function') spawnImpactFlash(rk.x, rk.y, 50, 'dark');
        if (typeof spawnImpactFlash === 'function') spawnImpactFlash(rk.x, rk.y, 30, 'crimsonSniper');
        
        for (let i = 0; i < 40; i++) {
          spawnSparks(rk.x, rk.y, 1, 'rikaCurse');
          spawnSparks(rk.x, rk.y, 1, 'blood'); 
        }
        
        if (typeof spawnFloatingText === 'function') spawnFloatingText(rk.x, rk.y - 20, 'DISPELLED!', '#ff1a1a');

        rk.active = false;
        rk.isDying = false;
        rk.disappearing = false;
        rk.cooldownTimer = CONFIG.yuta.rikaCooldown;
        rk.r = CONFIG.yuta.rikaRadius || 30;

        if (fighter.domainActive) {
          rk.killedInDomain = true;
        }
      }
      return; // Skip normal update logic while dying
    }

    if (rk.disappearing) {
      rk.disappearTimer--;
      
      const t = 1 - (rk.disappearTimer / rk.disappearDuration);
      rk.x = rk.startX + (fighter.x - rk.startX) * t;
      rk.y = rk.startY + (fighter.y - rk.startY) * t;
      
      const baseR = CONFIG.yuta.rikaRadius || 30;
      rk.r = baseR * (1 - t);
      
      // Spawn particles along the way
      if (Math.random() < 0.4) {
        spawnSparks(rk.x, rk.y, 2, 'rikaCurse');
      }
      
      if (rk.disappearTimer <= 0) {
        spawnSparks(rk.x, rk.y, 12, 'rikaCurse');
        rk.active = false;
        rk.disappearing = false;
        rk.cooldownTimer = CONFIG.yuta.rikaCooldown;
        rk.r = baseR; // Reset radius for next summon
      }
    } else {
      rk.timer--;
      
      // Handle death by HP or timer expiration
      if ((rk.timer <= 0 && !fighter.domainActive) || rk.hp <= 0) {
        // Remove from global target arrays so AI instantly stops attacking her
        if (state.illusions) {
          const idx = state.illusions.indexOf(rk);
          if (idx >= 0) state.illusions.splice(idx, 1);
        }

        if (rk.hp <= 0) {
          // ENTER DYING STATE
          rk.isDying = true;
          rk.deathTimer = 90; // 1.5 seconds of dying animation before explosion
        } else {
          // GRACEFUL SHRINK (Timer Expiration)
          rk.disappearing = true;
          rk.disappearDuration = 30; // 30 frames
          rk.disappearTimer = 30;
          rk.startX = rk.x;
          rk.startY = rk.y;
        }
      }
    }
  }

  if (!fighter.domainActive) {
    rk.killedInDomain = false;
  }

  // If domain is active, Rika is forced active unless she was killed during it
  if (fighter.domainActive && !rk.killedInDomain) {
    if (!rk.active) {
      rk.active = true;
      rk.x = fighter.x;
      rk.y = fighter.y;
      rk.hp = rk.maxHp; // Reset HP upon manifestation
      
      // Add her to the global targeting pool so AI and projectiles lock onto her
      if (typeof state !== 'undefined') {
        if (!state.illusions) state.illusions = [];
        if (!state.illusions.includes(rk)) {
          state.illusions.push(rk);
        }
      }
    }
    rk.disappearing = false;
    const baseR = CONFIG.yuta.rikaRadius || 30;
    rk.r = baseR;
    rk.timer = 100; // Keep her timer up so she doesn't despawn immediately after domain
  }

  if (!rk.active) return;
  if (rk.isDying || rk.disappearing) return;

  // Handle paralysis / time stop (Gojo's Domain Expansion / Unlimited Void)
  if (rk.timeStopTimer > 0) {
    rk.timeStopTimer--;
    rk.vx = 0;
    rk.vy = 0;
    return; // Completely frozen!
  }
  if (rk.hitStunTimer > 0) {
    rk.hitStunTimer--;
    rk.vx = 0;
    rk.vy = 0;
    return; // Stunned!
  }

  // Find target for Rika
  findRikaTarget(fighter, rk);

  // Move Rika — ball-like movement: always moving, bounces off walls
  const speed = fighter.baseSpeed * (CONFIG.yuta.rikaSpeedMultiplier || 1.3);

  // Ensure Rika always has velocity (initialize if spawning or stationary)
  const currentSpeed = Math.hypot(rk.vx, rk.vy);
  if (currentSpeed < 0.1) {
    // Give her an initial velocity toward her target or a random direction
    if (rk.target) {
      const dx = rk.target.x - rk.x;
      const dy = rk.target.y - rk.y;
      const d = Math.hypot(dx, dy) || 1;
      rk.vx = (dx / d) * speed;
      rk.vy = (dy / d) * speed;
    } else {
      const angle = Math.random() * Math.PI * 2;
      rk.vx = Math.cos(angle) * speed;
      rk.vy = Math.sin(angle) * speed;
    }
  }

  // Steer toward target (gradual heading adjustment, not instant)
  if (rk.target) {
    const dx = rk.target.x - rk.x;
    const dy = rk.target.y - rk.y;
    const dist = Math.hypot(dx, dy);

    // Steer: blend current heading toward target direction
    const steerStrength = 0.08; // How aggressively she turns
    rk.vx += (dx / (dist || 1)) * speed * steerStrength;
    rk.vy += (dy / (dist || 1)) * speed * steerStrength;

    // Melee attack when in range (but don't stop!)
    if (dist <= rk.r + rk.target.r + 5 && rk.attackTimer <= 0) {
      rk.target.takeDamage(CONFIG.yuta.rikaDamage, fighter, { isPhysical: true });
      // Knockback
      const pushAngle = Math.atan2(dy, dx);
      rk.target.vx += Math.cos(pushAngle) * 5;
      rk.target.vy += Math.sin(pushAngle) * 5;
      rk.attackTimer = CONFIG.yuta.rikaAttackRate || 40;

      // Alternate arms for fluid rapid dual-hand claw slashing!
      if (rk.lastArmUsed === 'right') {
        rk.leftArmTimer = 60;
        rk.lastArmUsed = 'left';
      } else {
        rk.rightArmTimer = 60;
        rk.lastArmUsed = 'right';
      }
    }
  } else {
    // No target — steer back toward Yuta
    const dx = fighter.x - rk.x;
    const dy = fighter.y - rk.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 60) {
      const steerStrength = 0.08;
      rk.vx += (dx / (dist || 1)) * speed * steerStrength;
      rk.vy += (dy / (dist || 1)) * speed * steerStrength;
    }
  }

  // Normalize to constant speed
  const spd = Math.hypot(rk.vx, rk.vy);
  if (spd > 0) {
    rk.vx = (rk.vx / spd) * speed;
    rk.vy = (rk.vy / spd) * speed;
  }

  // Apply velocity
  rk.x += rk.vx;
  rk.y += rk.vy;

  if (rk.attackTimer > 0) {
    rk.attackTimer--;
  }
  
  if (rk.rightArmTimer > 0) {
    rk.rightArmTimer--;
  }
  
  if (rk.leftArmTimer > 0) {
    rk.leftArmTimer--;
  }

  // Wall bounce — same as arena fighters / illusions
  let bounced = false;

  if (rk.x < arena.x + rk.r) {
    rk.x = arena.x + rk.r;
    rk.vx = Math.abs(rk.vx);
    bounced = true;
  } else if (rk.x > arena.x + arena.width - rk.r) {
    rk.x = arena.x + arena.width - rk.r;
    rk.vx = -Math.abs(rk.vx);
    bounced = true;
  }

  if (rk.y < arena.y + rk.r) {
    rk.y = arena.y + rk.r;
    rk.vy = Math.abs(rk.vy);
    bounced = true;
  } else if (rk.y > arena.y + arena.height - rk.r) {
    rk.y = arena.y + arena.height - rk.r;
    rk.vy = -Math.abs(rk.vy);
    bounced = true;
  }

  // On bounce — re-lock toward target (like illusions do)
  if (bounced && rk.target) {
    const dx = rk.target.x - rk.x;
    const dy = rk.target.y - rk.y;
    const d = Math.hypot(dx, dy) || 1;
    rk.vx = (dx / d) * speed;
    rk.vy = (dy / d) * speed;
  }
}

function findRikaTarget(fighter, rk) {
  let closestDist = Infinity;
  let closestTarget = null;
  const myTeam = state.getFighterTeam(state.fighters.indexOf(fighter));

  for (let i = 0; i < state.fighters.length; i++) {
    const enemy = state.fighters[i];
    if (!enemy || enemy.hp <= 0 || enemy === fighter || enemy.invincibilityTimer > 0) continue;
    
    const enemyTeam = state.getFighterTeam(i);
    if (myTeam !== null && enemyTeam !== null && myTeam === enemyTeam) continue;

    const dist = Math.hypot(enemy.x - rk.x, enemy.y - rk.y);
    if (dist < closestDist && dist < 400) { // Rika aggro range
      closestDist = dist;
      closestTarget = enemy;
    }
  }
  
  rk.target = closestTarget;
}
