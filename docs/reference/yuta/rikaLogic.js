import { CONFIG } from '../../../core/config.js';
import { state } from '../../../core/state.js';

export function initRika(fighter) {
  fighter.rika = {
    active: false,
    timer: 0,
    cooldownTimer: 0,
    x: fighter.x,
    y: fighter.y,
    vx: 0,
    vy: 0,
    r: CONFIG.yuta.rikaRadius || 30,
    target: null,
    attackTimer: 0
  };
}

export function updateRika(fighter, arena) {
  if (!fighter.rika) return;

  const rk = fighter.rika;

  if (rk.cooldownTimer > 0) {
    rk.cooldownTimer--;
  }

  // Handle Rika Manifestation Duration
  if (rk.active) {
    rk.timer--;
    if (rk.timer <= 0 && !fighter.domainActive) {
      rk.active = false;
      rk.cooldownTimer = CONFIG.yuta.rikaCooldown;
    }
  }

  // If domain is active, Rika is forced active
  if (fighter.domainActive) {
    if (!rk.active) {
      rk.active = true;
      rk.x = fighter.x;
      rk.y = fighter.y;
    }
    rk.timer = 100; // Keep her timer up so she doesn't despawn immediately after domain
  }

  if (!rk.active) return;

  // Find target for Rika
  findRikaTarget(fighter, rk);

  // Move Rika
  const speed = fighter.baseSpeed * (CONFIG.yuta.rikaSpeedMultiplier || 1.3);
  
  if (rk.target) {
    // Move towards target
    const dx = rk.target.x - rk.x;
    const dy = rk.target.y - rk.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > rk.r + rk.target.r) {
      rk.vx = (dx / dist) * speed;
      rk.vy = (dy / dist) * speed;
    } else {
      rk.vx = 0;
      rk.vy = 0;
      // Melee attack target
      if (rk.attackTimer <= 0) {
        rk.target.takeDamage(CONFIG.yuta.rikaDamage, fighter, { isPhysical: true });
        // Knockback
        const pushAngle = Math.atan2(dy, dx);
        rk.target.vx += Math.cos(pushAngle) * 5;
        rk.target.vy += Math.sin(pushAngle) * 5;
        rk.attackTimer = 60; // 1 second between punches
      }
    }
  } else {
    // Follow Yuta
    const dx = fighter.x - rk.x;
    const dy = fighter.y - rk.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 60) { // Tether distance
      rk.vx = (dx / dist) * speed;
      rk.vy = (dy / dist) * speed;
    } else {
      rk.vx *= 0.8;
      rk.vy *= 0.8;
    }
  }

  // Apply velocity
  rk.x += rk.vx;
  rk.y += rk.vy;

  if (rk.attackTimer > 0) rk.attackTimer--;

  // Keep Rika in bounds
  if (rk.x < arena.x + rk.r) rk.x = arena.x + rk.r;
  if (rk.x > arena.x + arena.width - rk.r) rk.x = arena.x + arena.width - rk.r;
  if (rk.y < arena.y + rk.r) rk.y = arena.y + rk.r;
  if (rk.y > arena.y + arena.height - rk.r) rk.y = arena.y + arena.height - rk.r;
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
