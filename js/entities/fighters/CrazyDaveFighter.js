// CRAZY DAVE FIGHTER ENTITY (Plants vs. Zombies)
// Mechanics: Gathers Sun drops from the sky, basic hits, and Sunflowers.
// Spends accumulated Sun to plant Peashooters, Wall-nuts, Cherry Bombs, and deploys Lawn Mowers.

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { crazyDaveConfig } from '../../configs/characters/crazyDaveConfig.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawCrazyDaveSkin } from '../../graphics/fighters/crazyDaveSkin.js';
import { drawMinionHealthBar } from '../../graphics/statusEffects.js';
import {
  drawPeashooter,
  drawSunflower,
  drawWallNut,
  drawCherryBomb,
  drawLawnMower,
  drawSunDrop
} from '../../graphics/weapons/crazyDaveWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';

// ─────────────────────────────────────────────────────────────────────────────
// PLANT ENTITY: SUNFLOWER (Produces radiant Sun drops periodically)
// ─────────────────────────────────────────────────────────────────────────────
export class SunflowerEntity extends Fighter {
  constructor(x, y, ownerFighter) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const maxHp = cfg.sunflowerHp || 140;
    const def = {
      id: 994,
      name: 'Sunflower',
      color: '#FACC15',
      startX: x,
      startY: y,
      startVx: 0,
      startVy: 0,
      radius: 18,
      type: 'Sunflower',
      isDeployable: true,
      isMinion: true,
      isPlant: true,
      isPlantMinion: true,
      hp: maxHp,
      damage: 0,
      cooldown: 0,
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
    this.productionTimer = 40; // Quick first production
    this.productionInterval = cfg.sunflowerInterval || 130;
    this.hitFlashTimer = 0;
  }

  takeDamage(amount, attacker, opts = {}) {
    if (opts) {
      opts.knockback = false;
      opts.knockbackVx = 0;
      opts.knockbackVy = 0;
    }
    const applied = super.takeDamage(amount, attacker, opts);
    if (applied) this.hitFlashTimer = 6;
    return applied;
  }

  update(opponent, ownerIndex, arena) {
    if (this.hp <= 0) return;
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;

    this.productionTimer++;
    if (this.productionTimer >= this.productionInterval) {
      this.productionTimer = 0;
      if (this.owner && typeof this.owner.spawnSunDrop === 'function') {
        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetDist = 20 + Math.random() * 25;
        this.owner.spawnSunDrop(
          this.x + Math.cos(offsetAngle) * offsetDist,
          this.y + Math.sin(offsetAngle) * offsetDist,
          25
        );
        spawnFloatingText(this.x, this.y - 20, '+25 ☀️', '#FEF08A');
      }
    }
  }

  draw(ctx) {
    drawSunflower(ctx, this);
    if (this.hp < this.maxHp && this.hp > 0) {
      drawMinionHealthBar(ctx, this.x, this.y - this.r - 8, 34, 5, this.hp, this.maxHp);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANT ENTITY: PEASHOOTER (Fires rapid kinetic pea projectiles at enemies)
// ─────────────────────────────────────────────────────────────────────────────
export class PeashooterEntity extends Fighter {
  constructor(x, y, ownerFighter) {
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
      damage: cfg.peashooterDamage || 9,
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
    this.shootCooldown = 15;
    this.shootCooldownMax = cfg.peashooterFireRate || 22;
    this.shootAnimTimer = 0;
    this.hitFlashTimer = 0;
    this.gunAngle = 0;
  }

  takeDamage(amount, attacker, opts = {}) {
    if (opts) {
      opts.knockback = false;
      opts.knockbackVx = 0;
      opts.knockbackVy = 0;
    }
    const applied = super.takeDamage(amount, attacker, opts);
    if (applied) this.hitFlashTimer = 6;
    return applied;
  }

  update(opponent, ownerIndex, arena) {
    if (this.hp <= 0) return;
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;
    if (this.shootAnimTimer > 0) this.shootAnimTimer--;

    // Target acquisition
    let target = opponent;
    if (!target || target.hp <= 0) {
      if (state && state.fighters) {
        target = state.fighters.find(f => f && f !== this && f !== this.owner && !f.isMinion && !f.isDeployable && f.hp > 0);
      }
    }

    if (target && target.hp > 0) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      this.gunAngle = Math.atan2(dy, dx);

      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
      const range = cfg.peashooterRange || 460;

      if (dist <= range) {
        if (this.shootCooldown > 0) {
          this.shootCooldown--;
        } else {
          this.shootCooldown = this.shootCooldownMax;
          this.shootAnimTimer = 8;
          this._firePea(this.gunAngle, ownerIndex);
        }
      }
    }
  }

  _firePea(angle, ownerIndex) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const speed = cfg.peashooterSpeed || 9.0;
    const dmg = cfg.peashooterDamage || 9;
    const spawnX = this.x + Math.cos(angle) * (this.r + 10);
    const spawnY = this.y + Math.sin(angle) * (this.r + 10);

    const peaProj = {
      x: spawnX,
      y: spawnY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 5.5,
      radius: 5.5,
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
      audioSystem.playSound('punch', 0.5);
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
// PLANT ENTITY: WALL-NUT (Barricade with high HP, absorbs fire & blocks foes)
// ─────────────────────────────────────────────────────────────────────────────
export class WallNutEntity extends Fighter {
  constructor(x, y, ownerFighter) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const maxHp = cfg.wallNutHp || 380;
    const def = {
      id: 992,
      name: 'Wall-nut',
      color: '#854D0E',
      startX: x,
      startY: y,
      startVx: 0,
      startVy: 0,
      radius: 20,
      type: 'WallNut',
      isDeployable: true,
      isMinion: true,
      isPlant: true,
      isPlantMinion: true,
      hp: maxHp,
      damage: 0,
      cooldown: 0,
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
    this.hitFlashTimer = 0;
  }

  takeDamage(amount, attacker, opts = {}) {
    if (opts) {
      opts.knockback = false;
      opts.knockbackVx = 0;
      opts.knockbackVy = 0;
    }
    const applied = super.takeDamage(amount, attacker, opts);
    if (applied) this.hitFlashTimer = 6;
    return applied;
  }

  update(opponent, ownerIndex, arena) {
    if (this.hp <= 0) return;
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;

    // Collision push against encroaching enemy fighters
    if (state && state.fighters) {
      state.fighters.forEach(f => {
        if (!f || f === this || f === this.owner || f.isMinion || f.isDeployable || f.hp <= 0) return;
        const dx = f.x - this.x;
        const dy = f.y - this.y;
        const dist = Math.hypot(dx, dy);
        const minDist = this.r + (f.r || 25);

        if (dist < minDist && dist > 0.001) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          f.x += nx * overlap;
          f.y += ny * overlap;
          if (typeof f.applyKnockback === 'function') {
            f.applyKnockback(nx * 6, ny * 6);
          }
        }
      });
    }
  }

  draw(ctx) {
    drawWallNut(ctx, this);
    if (this.hp < this.maxHp && this.hp > 0) {
      drawMinionHealthBar(ctx, this.x, this.y - this.r - 8, 38, 5, this.hp, this.maxHp);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANT ENTITY: CHERRY BOMB (Agitated ticking fuse, massive explosive AOE)
// ─────────────────────────────────────────────────────────────────────────────
export class CherryBombEntity extends Fighter {
  constructor(x, y, ownerFighter) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const def = {
      id: 991,
      name: 'Cherry Bomb',
      color: '#DC2626',
      startX: x,
      startY: y,
      startVx: 0,
      startVy: 0,
      radius: 16,
      type: 'CherryBomb',
      isDeployable: true,
      isMinion: true,
      isPlant: true,
      isPlantMinion: true,
      hp: cfg.cherryBombHp || 80,
      damage: cfg.cherryBombDamage || 110,
      cooldown: 0,
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
    this.maxFuse = cfg.cherryBombFuse || 45;
    this.fuseTimer = this.maxFuse;
    this.hasExploded = false;
  }

  update(opponent, ownerIndex, arena) {
    if (this.hasExploded) return;
    this.fuseTimer--;

    if (this.fuseTimer <= 0) {
      this._detonate();
    }
  }

  _detonate() {
    this.hasExploded = true;
    this.hp = 0;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const blastRadius = cfg.cherryBombRadius || 115;
    const dmg = cfg.cherryBombDamage || 110;
    const kb = cfg.cherryBombKnockback || 16;

    triggerGlobalScreenShake(10, 18);
    spawnImpactFlash(this.x, this.y, blastRadius * 1.2, '#EF4444');
    spawnSparks(this.x, this.y, 24, '#FACC15');

    if (audioSystem && typeof audioSystem.playSound === 'function') {
      audioSystem.playSound('explosion', 1.0);
    }

    // AOE damage to all enemy fighters and illusions
    const targets = [];
    if (state && state.fighters) {
      state.fighters.forEach(f => {
        if (f && f !== this && f !== this.owner && f.hp > 0 && !f.isDeployable && !f.isMinion) {
          targets.push(f);
        }
      });
    }
    if (state && state.illusions) {
      state.illusions.forEach(ill => {
        if (ill && ill.hp > 0) targets.push(ill);
      });
    }

    targets.forEach(target => {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= blastRadius + (target.r || 25)) {
        const falloff = 1.0 - (dist / (blastRadius + (target.r || 25))) * 0.4;
        const totalDmg = Math.round(dmg * falloff);
        const nx = dist > 0.001 ? (dx / dist) : 1;
        const ny = dist > 0.001 ? (dy / dist) : 0;

        applyDamageToTarget(target, totalDmg, this.owner || this, {
          isExplosion: true,
          knockback: true,
          knockbackVx: nx * kb,
          knockbackVy: ny * kb,
        });
      }
    });

    // Remove from fighters array
    if (state && state.fighters) {
      const idx = state.fighters.indexOf(this);
      if (idx !== -1) state.fighters.splice(idx, 1);
    }
  }

  draw(ctx) {
    drawCherryBomb(ctx, this);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANT ENTITY: LAWN MOWER (Supersonic charge grinding all foes in line)
// ─────────────────────────────────────────────────────────────────────────────
export class LawnMowerEntity extends Fighter {
  constructor(x, y, angle, ownerFighter) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const speed = cfg.lawnMowerSpeed || 14.0;
    const def = {
      id: 990,
      name: 'Lawn Mower',
      color: '#DC2626',
      startX: x,
      startY: y,
      startVx: Math.cos(angle) * speed,
      startVy: Math.sin(angle) * speed,
      radius: 24,
      type: 'LawnMower',
      isDeployable: true,
      isMinion: true,
      isPlant: true,
      isPlantMinion: true,
      hp: 999,
      damage: cfg.lawnMowerDamage || 85,
      cooldown: 0,
      moveSpeed: speed,
      spinRate: 0,
    };
    super(def);

    this.owner = ownerFighter;
    this.ownerIndex = ownerFighter?.fighterIndex ?? 0;
    this.characterId = 'crazydave_plant';
    this.angle = angle;
    this.speed = speed;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.isDeployable = true;
    this.isMinion = true;
    this.isPlant = true;
    this.isPlantMinion = true;
    this.hideHpText = true;
    this.lifetime = 140;
    this.hitTargets = new Set();
  }

  update(opponent, ownerIndex, arena) {
    this.lifetime--;
    if (this.lifetime <= 0) {
      this._destroy();
      return;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Check boundary
    if (arena) {
      const pad = 40;
      if (this.x < arena.x - pad || this.x > arena.x + arena.width + pad ||
          this.y < arena.y - pad || this.y > arena.y + arena.height + pad) {
        this._destroy();
        return;
      }
    }

    // Shred enemy projectiles in path
    if (state && state.projectiles) {
      state.projectiles = state.projectiles.filter(p => {
        if (!p || p.ownerFighter === this.owner) return true;
        const dist = Math.hypot(p.x - this.x, p.y - this.y);
        return dist > this.r + (p.r || 5);
      });
    }

    // Collision with enemies
    if (state && state.fighters) {
      state.fighters.forEach(f => {
        if (!f || f === this || f === this.owner || f.isDeployable || f.isMinion || f.hp <= 0) return;
        const dist = Math.hypot(f.x - this.x, f.y - this.y);
        if (dist <= this.r + (f.r || 25)) {
          if (!this.hitTargets.has(f) || this.lifetime % 10 === 0) {
            this.hitTargets.add(f);
            const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
            const dmg = cfg.lawnMowerDamage || 85;
            triggerGlobalScreenShake(6, 10);
            spawnSparks(f.x, f.y, 16, '#DC2626');

            applyDamageToTarget(f, dmg, this.owner || this, {
              isMelee: true,
              isMinion: true,
              knockback: true,
              knockbackVx: Math.cos(this.angle) * 14,
              knockbackVy: Math.sin(this.angle) * 14,
            });
          }
        }
      });
    }
  }

  _destroy() {
    this.hp = 0;
    if (state) {
      if (state.fighters) {
        const idx = state.fighters.indexOf(this);
        if (idx !== -1) state.fighters.splice(idx, 1);
      }
      if (state.illusions) {
        const idx = state.illusions.indexOf(this);
        if (idx !== -1) state.illusions.splice(idx, 1);
      }
    }
  }

  draw(ctx) {
    drawLawnMower(ctx, this);
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

    // Sun Economy State
    this.sunCount = cfg.initialSun || 50;
    this.maxSun = cfg.maxSun || 500;
    this.suns = [];
    this.ambientSunTimer = 0;
    this.ambientSunInterval = cfg.sunDropInterval || 160;

    // Combat & Skills Cooldowns
    this.shovelSwingTimer = 0;
    this.sunflowerCooldown = 0;
    this.combatFloraCooldown = 0;
    this.cherryBombCooldown = 0;
    this.lawnMowerCooldown = 0;

    // Plant Roster References
    this.activeSunflowers = [];
    this.activePeashooters = [];
    this.activeWallNuts = [];

    // Register Declarative Skills for HUD
    this._registerSkills();
  }

  _registerSkills() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const skills = [];

    if (this.isSkillEnabled(cfg.enableSunflower, true)) {
      skills.push({
        id: 'sunflower',
        name: 'Sunflower (50☀️)',
        type: 'basic',
        cooldownKey: 'sunflowerCooldown',
        cooldownMax: () => cfg.sunflowerCooldown || 180,
        color: '#FACC15',
        onActivate: (fighter, opponent) => {
          fighter.plantSunflower();
        }
      });
    }

    if (this.isSkillEnabled(cfg.enableCombatFlora, true)) {
      skills.push({
        id: 'combatFlora',
        name: 'Combat Flora (Pea/Nut)',
        type: 'basic',
        cooldownKey: 'combatFloraCooldown',
        cooldownMax: () => cfg.combatFloraCooldown || 120,
        color: '#4ADE80',
        onActivate: (fighter, opponent) => {
          fighter.plantCombatFlora(opponent);
        }
      });
    }

    if (this.isSkillEnabled(cfg.enableCherryBomb, true)) {
      skills.push({
        id: 'cherryBomb',
        name: 'Cherry Bomb (150☀️)',
        type: 'basic',
        cooldownKey: 'cherryBombCooldown',
        cooldownMax: () => cfg.cherryBombCooldown || 360,
        color: '#EF4444',
        onActivate: (fighter, opponent) => {
          fighter.plantCherryBomb(opponent);
        }
      });
    }

    if (this.isSkillEnabled(cfg.enableLawnMower, true)) {
      skills.push({
        id: 'lawnMower',
        name: 'WABBI WABBO! (250☀️)',
        type: 'ultimate',
        cooldownKey: 'lawnMowerCooldown',
        cooldownMax: () => cfg.lawnMowerCooldown || 800,
        color: '#DC2626',
        onActivate: (fighter, opponent) => {
          fighter.launchLawnMower(opponent);
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
    this.shovelSwingTimer = 0;
    this.sunflowerCooldown = 0;
    this.combatFloraCooldown = 0;
    this.cherryBombCooldown = 0;
    this.lawnMowerCooldown = 0;

    // Clean up active deployed plant entities from state.fighters and state.illusions
    if (state) {
      if (Array.isArray(state.fighters)) {
        state.fighters = state.fighters.filter(f => {
          if (!f) return false;
          return !(f.owner === this && (f.isDeployable || f.isMinion));
        });
      }
      if (Array.isArray(state.illusions)) {
        state.illusions = state.illusions.filter(f => {
          if (!f) return false;
          return !(f.owner === this && (f.isDeployable || f.isMinion));
        });
      }
    }

    this.activeSunflowers = [];
    this.activePeashooters = [];
    this.activeWallNuts = [];
  }

  takeDamage(amount, attacker, opts = {}) {
    const applied = super.takeDamage(amount, attacker, opts);
    if (this.hp <= 0) {
      if (this.activeSunflowers) this.activeSunflowers.forEach(s => { if (s) s.hp = 0; });
      if (this.activePeashooters) this.activePeashooters.forEach(p => { if (p) p.hp = 0; });
      if (this.activeWallNuts) this.activeWallNuts.forEach(w => { if (w) w.hp = 0; });
      this.activeSunflowers = [];
      this.activePeashooters = [];
      this.activeWallNuts = [];
      if (state && Array.isArray(state.illusions)) {
        state.illusions = state.illusions.filter(f => !(f && f.owner === this));
      }
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
   * Plant Skill 1: Sunflower (Costs 50 Sun)
   */
  plantSunflower() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const cost = cfg.sunflowerCost || 50;
    if (this.sunCount < cost) {
      spawnFloatingText(this.x, this.y - 25, `Need ${cost}☀️!`, '#EF4444');
      return false;
    }

    this.sunCount -= cost;
    this.sunflowerCooldown = cfg.sunflowerCooldown || 180;

    // Prune excess sunflowers
    this.activeSunflowers = this.activeSunflowers.filter(s => s && s.hp > 0);
    if (this.activeSunflowers.length >= (cfg.maxSunflowers || 2)) {
      const oldest = this.activeSunflowers.shift();
      if (oldest) oldest.hp = 0;
    }

    const plantX = this.x - Math.cos(this.gunAngle || 0) * 30;
    const plantY = this.y - Math.sin(this.gunAngle || 0) * 30;
    const sunflower = new SunflowerEntity(plantX, plantY, this);
    this.activeSunflowers.push(sunflower);

    if (state) {
      if (!state.illusions) state.illusions = [];
      if (!state.illusions.includes(sunflower)) state.illusions.push(sunflower);
      if (Array.isArray(state.fighters) && !state.fighters.includes(sunflower)) {
        state.fighters.push(sunflower);
      }
    }

    spawnFloatingText(this.x, this.y - 25, '-50 ☀️ Planted!', '#FACC15');
    if (audioSystem && typeof audioSystem.playSound === 'function') {
      audioSystem.playSound('powerup', 0.8);
    }
    return true;
  }

  /**
   * Plant Skill 2: Combat Flora (Peashooter 100 ☀️ / Wall-nut 50 ☀️)
   */
  plantCombatFlora(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const peashooterCost = cfg.peashooterCost || 100;
    const wallNutCost = cfg.wallNutCost || 50;

    const dist = opponent ? Math.hypot(opponent.x - this.x, opponent.y - this.y) : 200;
    const wantsWallNut = dist < 120 || this.hp < this.maxHp * 0.45;

    if (wantsWallNut && this.sunCount >= wallNutCost) {
      // Plant Wall-nut
      return this.plantWallNut();
    } else if (this.sunCount >= peashooterCost) {
      // Plant Peashooter
      return this.plantPeashooter();
    } else {
      spawnFloatingText(this.x, this.y - 25, `Need Sun! (☀️ ${this.sunCount})`, '#EF4444');
      return false;
    }
  }

  /**
   * Directly plants a Peashooter minion.
   */
  plantPeashooter() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const peashooterCost = cfg.peashooterCost || 100;
    if (this.sunCount < peashooterCost) {
      spawnFloatingText(this.x, this.y - 25, `Need ${peashooterCost}☀️!`, '#EF4444');
      return false;
    }
    this.sunCount -= peashooterCost;
    this.combatFloraCooldown = cfg.combatFloraCooldown || 120;

    this.activePeashooters = this.activePeashooters.filter(p => p && p.hp > 0);
    if (this.activePeashooters.length >= (cfg.maxPeashooters || 2)) {
      const oldest = this.activePeashooters.shift();
      if (oldest) oldest.hp = 0;
    }

    const plantX = this.x + Math.cos(this.gunAngle || 0) * 30;
    const plantY = this.y + Math.sin(this.gunAngle || 0) * 30;
    const peashooter = new PeashooterEntity(plantX, plantY, this);
    this.activePeashooters.push(peashooter);

    if (state) {
      if (!state.illusions) state.illusions = [];
      if (!state.illusions.includes(peashooter)) state.illusions.push(peashooter);
      if (Array.isArray(state.fighters) && !state.fighters.includes(peashooter)) {
        state.fighters.push(peashooter);
      }
    }

    spawnFloatingText(this.x, this.y - 25, '-100 ☀️ Peashooter!', '#4ADE80');
    if (audioSystem && typeof audioSystem.playSound === 'function') {
      audioSystem.playSound('powerup', 0.8);
    }
    return true;
  }

  /**
   * Directly plants a Wall-nut minion.
   */
  plantWallNut() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const wallNutCost = cfg.wallNutCost || 50;
    if (this.sunCount < wallNutCost) {
      spawnFloatingText(this.x, this.y - 25, `Need ${wallNutCost}☀️!`, '#EF4444');
      return false;
    }
    this.sunCount -= wallNutCost;
    this.combatFloraCooldown = cfg.combatFloraCooldown || 120;

    this.activeWallNuts = this.activeWallNuts.filter(w => w && w.hp > 0);
    if (this.activeWallNuts.length >= (cfg.maxWallNuts || 2)) {
      const oldest = this.activeWallNuts.shift();
      if (oldest) oldest.hp = 0;
    }

    const plantX = this.x + Math.cos(this.gunAngle || 0) * 28;
    const plantY = this.y + Math.sin(this.gunAngle || 0) * 28;
    const wallnut = new WallNutEntity(plantX, plantY, this);
    this.activeWallNuts.push(wallnut);

    if (state) {
      if (!state.illusions) state.illusions = [];
      if (!state.illusions.includes(wallnut)) state.illusions.push(wallnut);
      if (Array.isArray(state.fighters) && !state.fighters.includes(wallnut)) {
        state.fighters.push(wallnut);
      }
    }

    spawnFloatingText(this.x, this.y - 25, '-50 ☀️ Wall-nut!', '#A16207');
    if (audioSystem && typeof audioSystem.playSound === 'function') {
      audioSystem.playSound('shield_block', 0.8);
    }
    return true;
  }

  /**
   * Plant Skill 3: Cherry Bomb (Costs 150 Sun)
   */
  plantCherryBomb(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const cost = cfg.cherryBombCost || 150;
    if (this.sunCount < cost) {
      spawnFloatingText(this.x, this.y - 25, `Need ${cost}☀️!`, '#EF4444');
      return false;
    }

    this.sunCount -= cost;
    this.cherryBombCooldown = cfg.cherryBombCooldown || 360;

    const spawnDist = opponent ? Math.min(60, Math.hypot(opponent.x - this.x, opponent.y - this.y) * 0.5) : 35;
    const plantX = this.x + Math.cos(this.gunAngle || 0) * spawnDist;
    const plantY = this.y + Math.sin(this.gunAngle || 0) * spawnDist;
    const cherryBomb = new CherryBombEntity(plantX, plantY, this);

    if (state) {
      if (!state.illusions) state.illusions = [];
      if (!state.illusions.includes(cherryBomb)) state.illusions.push(cherryBomb);
      if (Array.isArray(state.fighters) && !state.fighters.includes(cherryBomb)) {
        state.fighters.push(cherryBomb);
      }
    }

    spawnFloatingText(this.x, this.y - 25, '-150 ☀️ CHERRY BOMB!', '#EF4444');
    if (audioSystem && typeof audioSystem.playSound === 'function') {
      audioSystem.playSound('c4_beep', 0.9);
    }
    return true;
  }

  /**
   * Ultimate: WABBI WABBO! Lawn Mower Cataclysm (Costs 250 Sun)
   */
  launchLawnMower(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const cost = cfg.lawnMowerCost || 250;
    if (this.sunCount < cost) {
      spawnFloatingText(this.x, this.y - 25, `Need ${cost}☀️!`, '#EF4444');
      return false;
    }

    this.sunCount -= cost;
    this.lawnMowerCooldown = cfg.lawnMowerCooldown || 800;

    const angle = this.gunAngle || 0;
    const mower = new LawnMowerEntity(this.x, this.y, angle, this);

    if (state) {
      if (!state.illusions) state.illusions = [];
      if (!state.illusions.includes(mower)) state.illusions.push(mower);
      if (Array.isArray(state.fighters) && !state.fighters.includes(mower)) {
        state.fighters.push(mower);
      }
    }

    spawnFloatingText(this.x, this.y - 35, '"WABBI WABBO!"', '#FEF08A');
    triggerGlobalScreenShake(8, 14);
    if (audioSystem && typeof audioSystem.playSound === 'function') {
      audioSystem.playSound('rocket_thruster', 1.0);
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
    if (this.sunflowerCooldown > 0) this.sunflowerCooldown--;
    if (this.combatFloraCooldown > 0) this.combatFloraCooldown--;
    if (this.cherryBombCooldown > 0) this.cherryBombCooldown--;
    if (this.lawnMowerCooldown > 0) this.lawnMowerCooldown--;
    if (this.shovelSwingTimer > 0) this.shovelSwingTimer--;

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
    const magnetRadius = cfg.sunAttractionRadius || 85;
    const magnetSpeed = cfg.sunAttractionSpeed || 6.5;

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
      if (dist < (this.r + sun.r + 6)) {
        this.sunCount = Math.min(cfg.maxSun || 500, this.sunCount + (sun.value || 25));
        spawnFloatingText(this.x, this.y - 20, `+${sun.value || 25} ☀️`, '#FEF08A');
        spawnSparks(sun.x, sun.y, 8, '#FACC15');
        if (audioSystem && typeof audioSystem.playSound === 'function') {
          audioSystem.playSound('powerup', 0.4);
        }
        this.suns.splice(i, 1);
      }
    }

    // 4. Melee Shovel Combat (Frontal Arc AOE)
    if (opponent && opponent.hp > 0) {
      const distToOpp = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      const reach = (cfg.shovelReach || 68);

      if (distToOpp <= reach && this.shootCooldown <= 0) {
        this.shootCooldown = cfg.cooldown || 28;
        this.shovelSwingTimer = cfg.shovelSwingFrames || 16;
        const arcAngle = ((cfg.shovelArcDegrees || 130) * Math.PI) / 180;
        const dmg = cfg.damage || 22;

        const hitCount = this.executeFrontalArcMelee(opponent, reach, arcAngle, dmg, {
          isBladeSlash: false,
          knockbackForce: cfg.shovelKnockback || 9.5,
        });

        // 100% chance on hit to pop a bouncy Sun drop out of the opponent!
        if (hitCount > 0) {
          this.spawnSunDrop(opponent.x, opponent.y, 25);
          spawnFloatingText(opponent.x, opponent.y - 20, '+25 ☀️ POP!', '#FEF08A');
        }
      }

      // 5. Tactical AI Planting Decision Matrix
      if (this.sunflowerCooldown <= 0 && this.sunCount >= (cfg.sunflowerCost || 50) && this.activeSunflowers.length < (cfg.maxSunflowers || 2)) {
        this.plantSunflower();
      } else if (this.lawnMowerCooldown <= 0 && this.sunCount >= (cfg.lawnMowerCost || 250) && distToOpp < 320) {
        this.launchLawnMower(opponent);
      } else if (this.cherryBombCooldown <= 0 && this.sunCount >= (cfg.cherryBombCost || 150) && distToOpp < 90) {
        this.plantCherryBomb(opponent);
      } else if (this.combatFloraCooldown <= 0 && this.sunCount >= (cfg.peashooterCost || 100)) {
        this.plantCombatFlora(opponent);
      }
    }

    // 6. Centralized Movement & Physics Standard (Rule 1.2)
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

    // 2. Draw Dave's Body, Pot, Shovel & Overhead Sun Pill
    drawCrazyDaveSkin(ctx, this);
  }
}
