// ─────────────────────────────────────────────
// PREVIEW / DEMO SHARED HELPERS
// ─────────────────────────────────────────────
import { CONFIG } from './config.js';
import { Fighter } from './fighter.js';
import { FIGHTER_CLASS_MAP } from './customFighters.js';
import { PreviewProjectileSystem } from './previewSystem.js';
import { state } from './state.js';

export let indexDetailState = null;
export let activePreviewState = null;
export const previewProjectileSystem = new PreviewProjectileSystem();

export function createPreviewFighter(def, x, y, options = {}) {
  const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
  const fighter = new FighterClass({
    ...def,
    startX: x,
    startY: y,
    startVx: 0,
    startVy: 0,
  });

  fighter.x = x;
  fighter.y = y;
  fighter.vx = options.vx ?? Math.cos(options.initialAngle ?? 0.6) * (fighter.speed || 1.5);
  fighter.vy = options.vy ?? Math.sin(options.initialAngle ?? 0.6) * (fighter.speed || 1.5);
  fighter.speed = fighter.baseSpeed || fighter.speed;
  fighter.shootCooldown = 0;
  fighter.gunAngle = options.gunAngle ?? 0;
  fighter.angle = options.angle ?? 0;
  fighter.shootCooldownMax = Math.max(18, Math.floor((def.cooldown || CONFIG.shoot.cooldown) / 3));
  fighter.meleeCooldown = 0;

  fighter.shoot = function(ownerIndex) {
    previewProjectileSystem.fireProjectile(
      this,
      ownerIndex,
      this.damage,
      false,
      this._def?.projectileSpeedMultiplier ? CONFIG.projectile.speed * this._def.projectileSpeedMultiplier : undefined
    );
  };

  fighter.shootGrenade = function(ownerIndex, opponent) {
    previewProjectileSystem.fireGrenade(this, ownerIndex, this.damage, opponent);
  };

  return fighter;
}

export function createPreviewTarget(demoArea, options = {}) {
  return {
    x: options.x ?? demoArea.x + demoArea.width - 70,
    y: options.y ?? demoArea.y + demoArea.height / 3,
    vx: options.vx ?? -0.9,
    vy: options.vy ?? 0.6,
    r: options.r ?? 10,
    hp: 999,
    takeDamage() {},
    applyPoison() {},
    onDamageDealt() {},
  };
}

export function createPreviewState(def, demoArea, options = {}) {
  const fighter = createPreviewFighter(def, options.fighterX ?? demoArea.x + 60, options.fighterY ?? demoArea.y + demoArea.height / 2, options);
  const target = createPreviewTarget(demoArea, options.target);

  return {
    index: options.index ?? state.indexInspectIndex,
    fighter,
    target,
    frame: 0,
    demoArea,
  };
}

export function resetIndexDetailState(def, demoArea) {
  indexDetailState = createPreviewState(def, demoArea, { index: state.indexInspectIndex });
  previewProjectileSystem.clear();
  return indexDetailState;
}

export function updateIndexDetailDemo(def, demoArea) {
  if (!indexDetailState || indexDetailState.index !== state.indexInspectIndex) {
    resetIndexDetailState(def, demoArea);
  }

  const pstate = indexDetailState;
  const fighter = pstate.fighter;
  const target = pstate.target;

  target.x += target.vx;
  target.y += target.vy;
  if (target.x - target.r < demoArea.x + 20) {
    target.x = demoArea.x + 20 + target.r;
    target.vx = Math.abs(target.vx);
  } else if (target.x + target.r > demoArea.x + demoArea.width - 20) {
    target.x = demoArea.x + demoArea.width - 20 - target.r;
    target.vx = -Math.abs(target.vx);
  }
  if (target.y - target.r < demoArea.y + 20) {
    target.y = demoArea.y + 20 + target.r;
    target.vy = Math.abs(target.vy);
  } else if (target.y + target.r > demoArea.y + demoArea.height - 20) {
    target.y = demoArea.y + demoArea.height - 20 - target.r;
    target.vy = -Math.abs(target.vy);
  }

  fighter.update(target, 0, demoArea);

  if (def.type === 'melee') {
    const dist = Math.hypot(target.x - fighter.x, target.y - fighter.y);
    if (dist < fighter.r + target.r + 14 && fighter.meleeCooldown === 0) {
      fighter.meleeCooldown = fighter.shootCooldownMax;
      fighter.applySpeedBoost();
      previewProjectileSystem.addImpact(fighter.x + Math.cos(fighter.gunAngle) * (fighter.r + 8), fighter.y + Math.sin(fighter.gunAngle) * (fighter.r + 8), def.color, 0, 16);
    }
  }

  previewProjectileSystem.update(demoArea, fighter, target);

  pstate.frame += 1;
  return pstate;
}
