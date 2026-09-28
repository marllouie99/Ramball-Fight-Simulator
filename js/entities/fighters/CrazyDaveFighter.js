// CRAZY DAVE FIGHTER ENTITY (Plants vs. Zombies)
// Mechanics: Dave has NO direct basic attack. He navigates the arena collecting falling Sun drops.
// Spends accumulated Sun on 2 abilities:
// 1. Plant Peashooter (100 ☀️): Rapid-fire kinetic pea projectiles dealing regular damage.
// 2. Plant Snow Pea (175 ☀️): Chilling frozen pea projectiles dealing ice damage and slowing enemies.

import { Fighter, applyDamageToTarget, isSkillEnabled } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { crazyDaveConfig } from '../../configs/characters/crazyDaveConfig.js';
import { state, spawnFloatingText } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawCrazyDaveSkin } from '../../graphics/fighters/crazyDaveSkin.js';
import { drawMinionHealthBar } from '../../graphics/statusEffects.js';
import {
  drawPeashooter,
  drawSnowPea,
  drawSunDrop
} from '../../graphics/weapons/crazyDaveWeaponGraphics.js';
import { getNearestGrassTileCenter } from '../../graphics/renderers/grassFloorRenderer.js';
import { spawnSparks } from '../../graphics/particles/sparkEffect.js';

// ─────────────────────────────────────────────────────────────────────────────
// PLANT ENTITY: PEASHOOTER (Fires rapid kinetic pea projectiles dealing regular damage)
// ─────────────────────────────────────────────────────────────────────────────
export class PeashooterEntity extends Fighter {
  constructor(x, y, ownerFighter, facingDirection = 1) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const maxHp = cfg.peashooterHp || 180;
    const def = {
      id: 993,
      name: 'Peashooter',
      color: '#4ADE80',
      startX: x,
      startY: y,
      startVx: 0,
      startVy: 0,
      radius: 18,
      type: 'Peashooter',
      isDeployable: true,
      isMinion: true,
      isPlant: true,
      isPlantMinion: true,
      hp: maxHp,
      damage: cfg.peashooterDamage || 10,
      cooldown: cfg.peashooterFireRate || 22,
      moveSpeed: 0,
      spinRate: 0,
    };
    super(def);

    this.owner = ownerFighter;
    this.ownerIndex = ownerFighter?.fighterIndex ?? 0;
    this.characterId = 'crazydave_plant';
    this.isDeployable = true;
    this.isMinion = true;
    this.isPlant = true;
    this.isPlantMinion = true;
    this.isImmovable = true;
    this.cannotBeKnockbacked = true;
    this.hideHpText = true;
    this.maxHp = maxHp;
    this.hp = maxHp;

    // Anchor plant immovably to centered grass tile position
    this._fixedX = x;
    this._fixedY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;

    // Committed 1-direction facing: never changes angle once planted
    this.facingDirection = (facingDirection === -1 || facingDirection === Math.PI) ? -1 : 1;
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;

    this.shootCooldown = 0;
    this.shootCooldownMax = cfg.peashooterFireRate || 22;
    this.hitFlashTimer = 0;
    this.animTick = Math.floor(Math.random() * 30);
  }

  canAim() {
    return false;
  }

  aim() {
    // Strictly locked to committed 1-direction facing; no auto-aim
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;
  }

  applyKnockback(vx, vy) {
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.vx = 0;
    this.vy = 0;
  }

  takeDamage(amount, attacker, opts = {}) {
    if (opts) {
      opts.knockback = false;
      opts.knockbackVx = 0;
      opts.knockbackVy = 0;
    }
    const applied = super.takeDamage(amount, attacker, opts);
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
    if (applied) this.hitFlashTimer = 6;
    return applied;
  }

  update(opponent, ownerIndex, arena) {
    if (this.hp <= 0) return;
    this.animTick++;
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;

    // Strict immovable anchor & committed angle: plants NEVER drift, bounce, or tilt
    this.angle = 0;
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }

    if (this._handleTimeStop() || this.isTargetOfAmbush) {
      return;
    }

    // Lane Target acquisition: only detect enemies in the 1 straight committed direction in front
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const range = cfg.peashooterRange || 460;
    const laneTolerance = cfg.plantLaneTolerance || 85;

    let targetInLane = null;
    let closestDist = Infinity;

    const evaluateTarget = (f) => {
      if (!f || f === this || f === this.owner || f.isDeployable || f.isMinion || f.hp <= 0 || f.dead) return;
      const dx = f.x - this.x;
      const dy = f.y - this.y;

      // Check if enemy is ahead in the straight committed direction
      const isAhead = (this.facingDirection === 1) ? (dx > 0) : (dx < 0);
      if (!isAhead) return; // Behind the plant!

      const forwardDist = Math.abs(dx);
      const laneDist = Math.abs(dy);

      if (forwardDist <= range && laneDist <= laneTolerance) {
        if (forwardDist < closestDist) {
          closestDist = forwardDist;
          targetInLane = f;
        }
      }
    };

    if (state && Array.isArray(state.fighters)) {
      for (const f of state.fighters) evaluateTarget(f);
    } else if (opponent) {
      evaluateTarget(opponent);
    }

    // Only shoot if a valid enemy is detected in the straight forward direction
    if (targetInLane) {
      if (this.shootCooldown > 0) {
        this.shootCooldown--;
      } else {
        this.shootCooldown = this.shootCooldownMax;
        this._firePea(this.gunAngle, ownerIndex);
      }
    } else {
      if (this.shootCooldown > 0) this.shootCooldown--;
    }
  }

  _firePea(angle, ownerIndex) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const speed = cfg.peashooterSpeed || 9.5;
    const dmg = cfg.peashooterDamage || 10;
    const isLeft = this.facingDirection === -1;
    // Snout mouth position on sprite: x offset +-22px, y offset -17px
    const spawnX = this.x + (isLeft ? -22 : 22);
    const spawnY = this.y - 17;

    const peaProj = {
      x: spawnX,
      y: spawnY,
      vx: (isLeft ? -1 : 1) * speed,
      vy: 0, // Straight horizontal flight
      angle: isLeft ? Math.PI : 0,
      r: 6.0,
      radius: 6.0,
      damage: dmg,
      owner: ownerIndex !== undefined ? ownerIndex : 0,
      ownerFighter: this.owner || this,
      color: '#22C55E',
      visual: 'peaBullet',
      life: 60,
      maxLife: 60,
      penetration: 1,
      knockbackForce: 4.5,
    };

    if (typeof projectileSystem !== 'undefined' && Array.isArray(projectileSystem.projectiles)) {
      projectileSystem.projectiles.push(peaProj);
    } else if (state && Array.isArray(state.projectiles)) {
      state.projectiles.push(peaProj);
    }

    if (audioSystem && typeof audioSystem.playSound === 'function') {
      audioSystem.playSound('punch', 0.45);
    }
  }

  draw(ctx) {
    drawPeashooter(ctx, this);
    if (this.hp < this.maxHp && this.hp > 0) {
      drawMinionHealthBar(ctx, this.x, this.y - this.r - 8, 34, 5, this.hp, this.maxHp);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANT ENTITY: SNOW PEA (Fires frozen ice pea projectiles dealing damage + slowing foes)
// ─────────────────────────────────────────────────────────────────────────────
export class SnowPeaEntity extends Fighter {
  constructor(x, y, ownerFighter, facingDirection = 1) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const maxHp = cfg.snowPeaHp || 200;
    const def = {
      id: 995,
      name: 'Snow Pea',
      color: '#38BDF8',
      startX: x,
      startY: y,
      startVx: 0,
      startVy: 0,
      radius: 18,
      type: 'SnowPea',
      isDeployable: true,
      isMinion: true,
      isPlant: true,
      isPlantMinion: true,
      hp: maxHp,
      damage: cfg.snowPeaDamage || 12,
      cooldown: cfg.snowPeaFireRate || 24,
      moveSpeed: 0,
      spinRate: 0,
    };
    super(def);

    this.owner = ownerFighter;
    this.ownerIndex = ownerFighter?.fighterIndex ?? 0;
    this.characterId = 'crazydave_plant';
    this.isDeployable = true;
    this.isMinion = true;
    this.isPlant = true;
    this.isPlantMinion = true;
    this.isImmovable = true;
    this.cannotBeKnockbacked = true;
    this.hideHpText = true;
    this.maxHp = maxHp;
    this.hp = maxHp;

    // Anchor plant immovably to centered grass tile position
    this._fixedX = x;
    this._fixedY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;

    // Committed 1-direction facing: never changes angle once planted
    this.facingDirection = (facingDirection === -1 || facingDirection === Math.PI) ? -1 : 1;
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;

    this.shootCooldown = 0;
    this.shootCooldownMax = cfg.snowPeaFireRate || 24;
    this.hitFlashTimer = 0;
    this.animTick = Math.floor(Math.random() * 30);
  }

  canAim() {
    return false;
  }

  aim() {
    // Strictly locked to committed 1-direction facing; no auto-aim
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;
  }

  applyKnockback(vx, vy) {
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.vx = 0;
    this.vy = 0;
  }

  takeDamage(amount, attacker, opts = {}) {
    if (opts) {
      opts.knockback = false;
      opts.knockbackVx = 0;
      opts.knockbackVy = 0;
    }
    const applied = super.takeDamage(amount, attacker, opts);
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
    if (applied) this.hitFlashTimer = 6;
    return applied;
  }

  update(opponent, ownerIndex, arena) {
    if (this.hp <= 0) return;
    this.animTick++;
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;

    // Strict immovable anchor & committed angle: plants NEVER drift, bounce, or tilt
    this.angle = 0;
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }

    if (this._handleTimeStop() || this.isTargetOfAmbush) {
      return;
    }

    // Lane Target acquisition: only detect enemies in the 1 straight committed direction in front
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const range = cfg.snowPeaRange || 460;
    const laneTolerance = cfg.plantLaneTolerance || 85;

    let targetInLane = null;
    let closestDist = Infinity;

    const evaluateTarget = (f) => {
      if (!f || f === this || f === this.owner || f.isDeployable || f.isMinion || f.hp <= 0 || f.dead) return;
      const dx = f.x - this.x;
      const dy = f.y - this.y;

      // Check if enemy is ahead in the straight committed direction
      const isAhead = (this.facingDirection === 1) ? (dx > 0) : (dx < 0);
      if (!isAhead) return; // Behind the plant!

      const forwardDist = Math.abs(dx);
      const laneDist = Math.abs(dy);

      if (forwardDist <= range && laneDist <= laneTolerance) {
        if (forwardDist < closestDist) {
          closestDist = forwardDist;
          targetInLane = f;
        }
      }
    };

    if (state && Array.isArray(state.fighters)) {
      for (const f of state.fighters) evaluateTarget(f);
    } else if (opponent) {
      evaluateTarget(opponent);
    }

    // Only shoot if a valid enemy is detected in the straight forward direction
    if (targetInLane) {
      if (this.shootCooldown > 0) {
        this.shootCooldown--;
      } else {
        this.shootCooldown = this.shootCooldownMax;
        this._fireSnowPea(this.gunAngle, ownerIndex);
      }
    } else {
      if (this.shootCooldown > 0) this.shootCooldown--;
    }
  }

  _fireSnowPea(angle, ownerIndex) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const speed = cfg.snowPeaSpeed || 9.5;
    const dmg = cfg.snowPeaDamage || 12;
    const isLeft = this.facingDirection === -1;
    // Snout mouth position on sprite: x offset +-22px, y offset -19px
    const spawnX = this.x + (isLeft ? -22 : 22);
    const spawnY = this.y - 19;

    const snowPeaProj = {
      x: spawnX,
      y: spawnY,
      vx: (isLeft ? -1 : 1) * speed,
      vy: 0, // Straight horizontal flight
      angle: isLeft ? Math.PI : 0,
      r: 5.5,
      radius: 5.5,
      damage: dmg,
      owner: ownerIndex !== undefined ? ownerIndex : 0,
      ownerFighter: this.owner || this,
      color: '#38BDF8',
      visual: 'snowPeaBullet',
      life: 60,
      maxLife: 60,
      penetration: 1,
      knockbackForce: 4.0,
      // Special Snow Pea Hit Callback: applies 1.5s Chill Slow
      onHit: (target) => {
        if (target && typeof target.applySlow === 'function') {
          target.applySlow(
            cfg.snowPeaSlowDuration || 90,
            cfg.snowPeaSlowMultiplier || 0.45,
            { isChill: true, isSnowPea: true }
          );
        }
        spawnSparks(target.x || spawnX, target.y || spawnY, 10, '#38BDF8');
      }
    };

    if (typeof projectileSystem !== 'undefined' && Array.isArray(projectileSystem.projectiles)) {
      projectileSystem.projectiles.push(snowPeaProj);
    } else if (state && Array.isArray(state.projectiles)) {
      state.projectiles.push(snowPeaProj);
    }

    if (audioSystem && typeof audioSystem.playSound === 'function') {
      audioSystem.playSound('ice_shard', 0.55);
    }
  }

  draw(ctx) {
    drawSnowPea(ctx, this);
    if (this.hp < this.maxHp && this.hp > 0) {
      drawMinionHealthBar(ctx, this.x, this.y - this.r - 8, 34, 5, this.hp, this.maxHp);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CRAZY DAVE FIGHTER CLASS
// ─────────────────────────────────────────────────────────────────────────────
export class CrazyDaveFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'crazydave';
    this.type = 'crazydave';
    this.name = 'Crazy Dave';

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    this.color = def?.color || cfg.color || '#84CC16';
    this.themeColor = def?.themeColor || cfg.themeColor || '#84CC16';
    this.secondaryColor = def?.secondaryColor || cfg.secondaryColor || '#F59E0B';
    this.damageNumberColor = '#84CC16';

    this.hp = cfg.hp || 390;
    this.maxHp = cfg.hp || 390;
    this.speed = cfg.speed || 5.2;
    this.baseSpeed = cfg.speed || 5.2;

    // Zero basic attack (Dave does not attack directly)
    this.damage = 0;
    this.cooldown = 0;
    this.canShoot = false;

    // Sun Economy State
    this.sunCount = cfg.initialSun || 50;
    this.maxSun = cfg.maxSun || 500;
    this.suns = [];
    this.ambientSunTimer = 0;
    this.ambientSunInterval = cfg.sunDropInterval || 110;

    // Skill Cooldowns (2 Flora Abilities)
    this.peashooterCooldown = 0;
    this.snowPeaCooldown = 0;

    // Plant Roster References
    this.activePeashooters = [];
    this.activeSnowPeas = [];

    // Register Declarative Skills for HUD
    this._registerSkills();
  }

  _registerSkills() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const skills = [];

    if (isSkillEnabled(cfg.enablePeashooter, true)) {
      skills.push({
        id: 'peashooter',
        name: 'Peashooter (100☀️)',
        type: 'basic',
        cooldownKey: 'peashooterCooldown',
        cooldownMax: () => cfg.peashooterCooldown || 120,
        color: '#4ADE80',
        onActivate: (fighter, opponent) => {
          fighter.plantPeashooter(opponent);
        }
      });
    }

    if (isSkillEnabled(cfg.enableSnowPea, true)) {
      skills.push({
        id: 'snowPea',
        name: 'Snow Pea (175☀️)',
        type: 'ultimate',
        cooldownKey: 'snowPeaCooldown',
        cooldownMax: () => cfg.snowPeaCooldown || 180,
        color: '#38BDF8',
        onActivate: (fighter, opponent) => {
          fighter.plantSnowPea(opponent);
        }
      });
    }

    if (skills.length > 0 && this.skillManager) {
      this.skillManager.registerSkills(skills);
    }
  }

  reset() {
    super.reset();
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    this.sunCount = cfg.initialSun || 50;
    this.suns = [];
    this.ambientSunTimer = 0;
    this.peashooterCooldown = 0;
    this.snowPeaCooldown = 0;

    if (this.activePeashooters) {
      this.activePeashooters.forEach(p => {
        if (p) {
          p.hp = 0;
          if (state && Array.isArray(state.fighters)) {
            const idx = state.fighters.indexOf(p);
            if (idx !== -1) state.fighters.splice(idx, 1);
          }
        }
      });
    }
    if (this.activeSnowPeas) {
      this.activeSnowPeas.forEach(s => {
        if (s) {
          s.hp = 0;
          if (state && Array.isArray(state.fighters)) {
            const idx = state.fighters.indexOf(s);
            if (idx !== -1) state.fighters.splice(idx, 1);
          }
        }
      });
    }
    this.activePeashooters = [];
    this.activeSnowPeas = [];
  }

  takeDamage(amount, attacker, opts = {}) {
    const applied = super.takeDamage(amount, attacker, opts);
    if (this.hp <= 0) {
      if (this.activePeashooters) {
        this.activePeashooters.forEach(p => {
          if (p) {
            p.hp = 0;
            if (state && Array.isArray(state.fighters)) {
              const idx = state.fighters.indexOf(p);
              if (idx !== -1) state.fighters.splice(idx, 1);
            }
          }
        });
      }
      if (this.activeSnowPeas) {
        this.activeSnowPeas.forEach(s => {
          if (s) {
            s.hp = 0;
            if (state && Array.isArray(state.fighters)) {
              const idx = state.fighters.indexOf(s);
              if (idx !== -1) state.fighters.splice(idx, 1);
            }
          }
        });
      }
      this.activePeashooters = [];
      this.activeSnowPeas = [];
    }
    return applied;
  }

  /**
   * Spawns a bouncing Sun drop at (x, y) with the given value.
   */
  spawnSunDrop(x, y, value = 25) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const sun = {
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -1.5 - Math.random() * 1.5, // Initial float-up bounce
      r: 14,
      value: value,
      life: cfg.sunDecayFrames || 720,
      pulse: 0,
      rotAngle: Math.random() * Math.PI,
    };
    this.suns.push(sun);
  }

  /**
   * Plant Ability 1: Peashooter (Costs 100 ☀️)
   */
  plantPeashooter(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const peashooterCost = cfg.peashooterCost || 100;
    if (this.sunCount < peashooterCost) {
      spawnFloatingText(this.x, this.y - 25, `Need ${peashooterCost}☀️!`, '#EF4444');
      return false;
    }
    this.sunCount -= peashooterCost;
    this.peashooterCooldown = cfg.peashooterCooldown || 120;

    this.activePeashooters = this.activePeashooters.filter(p => p && p.hp > 0);
    if (this.activePeashooters.length >= (cfg.maxPeashooters || 3)) {
      const oldest = this.activePeashooters.shift();
      if (oldest) {
        oldest.hp = 0;
        if (state && Array.isArray(state.fighters)) {
          const idx = state.fighters.indexOf(oldest);
          if (idx !== -1) state.fighters.splice(idx, 1);
        }
      }
    }

    const arena = (state && state.arena) ? state.arena : { x: 0, y: 0, width: 460, height: 460 };
    const rawX = this.x + Math.cos(this.gunAngle || 0) * 32;
    const rawY = this.y + Math.sin(this.gunAngle || 0) * 32;
    const activePlants = [...(this.activePeashooters || []), ...(this.activeSnowPeas || [])].filter(p => p && p.hp > 0);
    const tileCenter = getNearestGrassTileCenter(rawX, rawY, arena, activePlants);

    // Compute committed 1-direction facing (Left = -1, Right = +1)
    let facingDirection = 1;
    let targetEnemy = (opponent && opponent.hp > 0 && opponent !== this) ? opponent : null;
    if (!targetEnemy && state && Array.isArray(state.fighters)) {
      let closestDist = Infinity;
      for (const f of state.fighters) {
        if (f && f !== this && !f.isDeployable && !f.isMinion && f.hp > 0 && !f.dead) {
          const d = Math.hypot(f.x - tileCenter.x, f.y - tileCenter.y);
          if (d < closestDist) {
            closestDist = d;
            targetEnemy = f;
          }
        }
      }
    }
    if (targetEnemy) {
      facingDirection = (targetEnemy.x < tileCenter.x) ? -1 : 1;
    } else if (this.gunAngle !== undefined) {
      facingDirection = (Math.abs(this.gunAngle) > Math.PI / 2) ? -1 : 1;
    } else {
      const arenaMidX = arena.x + arena.width / 2;
      facingDirection = (tileCenter.x > arenaMidX) ? -1 : 1;
    }

    const peashooter = new PeashooterEntity(tileCenter.x, tileCenter.y, this, facingDirection);
    this.activePeashooters.push(peashooter);

    if (state && Array.isArray(state.fighters) && !state.fighters.includes(peashooter)) {
      state.fighters.push(peashooter);
    }

    spawnFloatingText(this.x, this.y - 25, '-100 ☀️ Peashooter!', '#4ADE80');
    if (audioSystem && typeof audioSystem.playSound === 'function') {
      audioSystem.playSound('powerup', 0.8);
    }
    return true;
  }

  /**
   * Plant Ability 2: Snow Pea (Costs 175 ☀️)
   */
  plantSnowPea(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const snowPeaCost = cfg.snowPeaCost || 175;
    if (this.sunCount < snowPeaCost) {
      spawnFloatingText(this.x, this.y - 25, `Need ${snowPeaCost}☀️!`, '#EF4444');
      return false;
    }
    this.sunCount -= snowPeaCost;
    this.snowPeaCooldown = cfg.snowPeaCooldown || 180;

    this.activeSnowPeas = this.activeSnowPeas.filter(s => s && s.hp > 0);
    if (this.activeSnowPeas.length >= (cfg.maxSnowPeas || 3)) {
      const oldest = this.activeSnowPeas.shift();
      if (oldest) {
        oldest.hp = 0;
        if (state && Array.isArray(state.fighters)) {
          const idx = state.fighters.indexOf(oldest);
          if (idx !== -1) state.fighters.splice(idx, 1);
        }
      }
    }

    const arena = (state && state.arena) ? state.arena : { x: 0, y: 0, width: 460, height: 460 };
    const rawX = this.x + Math.cos(this.gunAngle || 0) * 32;
    const rawY = this.y + Math.sin(this.gunAngle || 0) * 32;
    const activePlants = [...(this.activePeashooters || []), ...(this.activeSnowPeas || [])].filter(p => p && p.hp > 0);
    const tileCenter = getNearestGrassTileCenter(rawX, rawY, arena, activePlants);

    // Compute committed 1-direction facing (Left = -1, Right = +1)
    let facingDirection = 1;
    let targetEnemy = (opponent && opponent.hp > 0 && opponent !== this) ? opponent : null;
    if (!targetEnemy && state && Array.isArray(state.fighters)) {
      let closestDist = Infinity;
      for (const f of state.fighters) {
        if (f && f !== this && !f.isDeployable && !f.isMinion && f.hp > 0 && !f.dead) {
          const d = Math.hypot(f.x - tileCenter.x, f.y - tileCenter.y);
          if (d < closestDist) {
            closestDist = d;
            targetEnemy = f;
          }
        }
      }
    }
    if (targetEnemy) {
      facingDirection = (targetEnemy.x < tileCenter.x) ? -1 : 1;
    } else if (this.gunAngle !== undefined) {
      facingDirection = (Math.abs(this.gunAngle) > Math.PI / 2) ? -1 : 1;
    } else {
      const arenaMidX = arena.x + arena.width / 2;
      facingDirection = (tileCenter.x > arenaMidX) ? -1 : 1;
    }

    const snowpea = new SnowPeaEntity(tileCenter.x, tileCenter.y, this, facingDirection);
    this.activeSnowPeas.push(snowpea);

    if (state && Array.isArray(state.fighters) && !state.fighters.includes(snowpea)) {
      state.fighters.push(snowpea);
    }

    spawnFloatingText(this.x, this.y - 25, '-175 ☀️ Snow Pea!', '#38BDF8');
    if (audioSystem && typeof audioSystem.playSound === 'function') {
      audioSystem.playSound('powerup', 0.8);
    }
    return true;
  }

  update(opponent, ownerIndex, arena) {
    // 1. Freeze / Time-Stop Guard (Rule 1.1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;

    // Cooldown updates
    if (this.peashooterCooldown > 0) this.peashooterCooldown--;
    if (this.snowPeaCooldown > 0) this.snowPeaCooldown--;

    // 2. Ambient Sun Falling from the Sky
    this.ambientSunTimer++;
    if (this.ambientSunTimer >= this.ambientSunInterval) {
      this.ambientSunTimer = 0;
      if (arena) {
        const dropX = arena.x + 30 + Math.random() * (arena.width - 60);
        const dropY = arena.y + 30 + Math.random() * (arena.height - 60);
        this.spawnSunDrop(dropX, dropY, 25);
      }
    }

    // 3. Sun Drops Physics & Magnetic Pickup Loop
    const magnetRadius = cfg.sunAttractionRadius || 95;
    const magnetSpeed = cfg.sunAttractionSpeed || 7.0;

    for (let i = this.suns.length - 1; i >= 0; i--) {
      const sun = this.suns[i];
      sun.life--;
      if (sun.life <= 0) {
        this.suns.splice(i, 1);
        continue;
      }

      // Drag / float physics
      sun.x += sun.vx;
      sun.y += sun.vy;
      sun.vx *= 0.92;
      sun.vy *= 0.92;
      sun.rotAngle += 0.03;

      // Distance to Crazy Dave
      const dx = this.x - sun.x;
      const dy = this.y - sun.y;
      const dist = Math.hypot(dx, dy);

      // Magnetic Attraction
      if (dist < magnetRadius && dist > 0.001) {
        const pull = (1.0 - dist / magnetRadius) * magnetSpeed;
        sun.vx += (dx / dist) * pull;
        sun.vy += (dy / dist) * pull;
      }

      // Pickup Collision
      if (dist < (this.r + sun.r + 8)) {
        this.sunCount = Math.min(cfg.maxSun || 500, this.sunCount + (sun.value || 25));
        spawnFloatingText(this.x, this.y - 20, `+${sun.value || 25} ☀️`, '#FEF08A');
        spawnSparks(sun.x, sun.y, 8, '#FACC15');
        if (audioSystem && typeof audioSystem.playSound === 'function') {
          audioSystem.playSound('powerup', 0.4);
        }
        this.suns.splice(i, 1);
      }
    }

    // 4. Tactical AI Navigation (Collects suns, avoids close-range enemy melee)
    if (this.suns.length > 0) {
      // Find closest sun drop
      let closestSun = null;
      let minDist = Infinity;
      for (let s of this.suns) {
        const d = Math.hypot(s.x - this.x, s.y - this.y);
        if (d < minDist) {
          minDist = d;
          closestSun = s;
        }
      }
      if (closestSun && minDist > 10) {
        const toSunAngle = Math.atan2(closestSun.y - this.y, closestSun.x - this.x);
        this.vx += Math.cos(toSunAngle) * 0.45;
        this.vy += Math.sin(toSunAngle) * 0.45;
      }
    }

    // AI Planting Decisions
    if (opponent && opponent.hp > 0) {
      if (this.snowPeaCooldown <= 0 && this.sunCount >= (cfg.snowPeaCost || 175)) {
        this.plantSnowPea(opponent);
      } else if (this.peashooterCooldown <= 0 && this.sunCount >= (cfg.peashooterCost || 100)) {
        this.plantPeashooter(opponent);
      }
    }

    // 5. Centralized Movement & Physics Standard (Rule 1.2)
    super.update(opponent, ownerIndex, arena);
  }

  /**
   * Main Draw method for Crazy Dave.
   */
  draw(ctx) {
    // 1. Draw Active Sun Drops in World Space
    if (Array.isArray(this.suns) && this.suns.length > 0) {
      this.suns.forEach(sun => {
        drawSunDrop(ctx, sun);
      });
    }

    // 2. Draw Dave's Body, Pot & Overhead Sun Pill
    drawCrazyDaveSkin(ctx, this);
  }
}
