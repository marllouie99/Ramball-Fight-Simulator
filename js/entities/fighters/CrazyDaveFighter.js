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
import { getNearestGrassTileCenter, getRandomGrassTileCenter } from '../../graphics/renderers/grassFloorRenderer.js';
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
    this.immuneToKnockback = true;
    this.immuneToPull = true;
    this.immuneToPush = true;
    this.cannotBeDisplaced = true;
    this.immuneToCC = true;
    this.domainImmunity = true;
    this.immuneToBurn = true;
    this.immuneToPoison = true;
    this.immuneToBleed = true;
    this.isDebuffImmune = true;
    this.gojoBlueDragImmune = true;
    this.gojoInfinityImmune = true;
    this.phasesThroughEntities = true;
    this.ignoreFighterCollisions = true;
    this.hideHpText = true;
    this.maxHp = maxHp;
    this.hp = maxHp;

    // Complete debuff timer suppression
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.poisonTicks = 0;
    this.poisonTimer = 0;
    this.bleedTimer = 0;
    this.bleedDamageTimer = 0;
    this.paralyzeTimer = 0;
    this.slowTimer = 0;
    this.slowMultiplier = 1.0;
    this.hitStunTimer = 0;
    this.timeStopTimer = 0;
    this.silenceTimer = 0;
    this.electricStunTimer = 0;
    this.crimsonElectrifiedTimer = 0;
    this.dubstepStunTimer = 0;
    this.dubstepStunVisualTimer = 0;
    this.thunderRootsTimer = 0;
    this.staticDebuffTimer = 0;
    this.nanamiArmorFractureTimer = 0;
    this.blackFlashDebuffTimer = 0;
    this.voidMarkTimer = 0;
    this.isParalyzed = false;
    this.isParalyzedByMahito = false;
    this.isParalyzedByMahoraga = false;
    this.isFrozenByInfinity = false;
    this.isChainedByMakima = false;
    this.isWallPinnedByMakima = false;
    this.isWallPinnedBySaitama = false;
    this.isDraggedByGetsuga = false;
    this.caughtInSaitamaCounter = false;
    this.caughtInGenosFlurry = false;
    this.caughtInJohnWickCombo = false;
    this.frozenByCronos = false;
    this.isCronosStasis = false;
    this._hitByFugaTimer = 0;
    this._hitByDivineFlameTimer = 0;

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

  onCollide(opponent) {
    // Entities pass through plants without collision push
  }

  // ── Complete Debuff & Status Effect Neutralization ──
  _handleTimeStop() { return false; }
  applyHitStun() { this.hitStunTimer = 0; return; }
  applyTimeStop() { this.timeStopTimer = 0; return; }
  applySlow() { this.slowTimer = 0; this.slowMultiplier = 1.0; return; }
  applyParalyze() { this.paralyzeTimer = 0; this.isParalyzed = false; return; }
  applyBurn() { this.burnTimer = 0; this.burnDamageTimer = 0; return; }
  applyPoison() { this.poisonTicks = 0; this.poisonTimer = 0; return; }
  applyBleed() { this.bleedTimer = 0; this.bleedDamageTimer = 0; return; }
  applyStatusEffect() { return; }
  applySoulDisfigurement() { return; }
  applyTelekinesis() { return; }
  applyChain() { return; }
  applyRatioCrit() { return; }
  applyDomainStasis() { return; }
  applyGetsugaDrag() { return; }
  applySilence() { this.silenceTimer = 0; return; }
  isSilenced() { return false; }
  isParalyzedDebuffActive() { return false; }
  suppressCombatAndVisuals() { return; }
  interruptAttacks() { return; }

  // ── Complete Movement & Physics Neutralization ──
  applyKnockback() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyPush() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyPull() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applySuction() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyDrag() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }

  // ── Master Debuff Ticks Override ──
  handleStatusEffects() {
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.poisonTicks = 0;
    this.poisonTimer = 0;
    this.bleedTimer = 0;
    this.bleedDamageTimer = 0;
    this.paralyzeTimer = 0;
    this.slowTimer = 0;
    this.slowMultiplier = 1.0;
    this.hitStunTimer = 0;
    this.timeStopTimer = 0;
    this.silenceTimer = 0;
    this.electricStunTimer = 0;
    this.crimsonElectrifiedTimer = 0;
    this.dubstepStunTimer = 0;
    this.thunderRootsTimer = 0;
    this.staticDebuffTimer = 0;
    this.nanamiArmorFractureTimer = 0;
    this.blackFlashDebuffTimer = 0;
    this.voidMarkTimer = 0;
  }
  handlePoison() { return; }
  handleBurn() { return; }
  handleBleed() { return; }

  // ── Overhead & Status Renderers ──
  drawStatusOverlays() { /* Plants are immune to debuffs & overlays */ }
  drawFreezeTimer() { /* Plants are immune to freeze */ }
  drawSlowEffect() { return; }
  drawPoisonEffect() { return; }
  drawBurnEffect() { return; }
  drawBleedEffect() { return; }
  drawElectricStunEffect() { return; }
  drawCrimsonElectrifiedEffect() { return; }
  drawDubstepStunEffect() { return; }
  drawThunderRootsEffect() { return; }
  drawSilenceEffect() { return; }

  resolveWallBounce(arena, opponent) {
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
  }

  takeDamage(amount, attacker, opts = {}) {
    // Friendly fire check: ignore damage from other plants or Crazy Dave
    if (attacker && (attacker.isPlant || attacker.isPlantMinion || attacker === this.owner || (this.owner && attacker.owner === this.owner) || attacker.characterId === 'crazydave')) {
      return false;
    }
    // Ignore debuff DoT tick damages (poison ticks, burn ticks, bleed ticks, electrified ticks)
    if (opts) {
      if (opts.isPoison || opts.isBurn || opts.isBleed || opts.isElectrified) {
        return false;
      }
      if (opts.projectile && (opts.projectile.isPlantProjectile || opts.projectile.visual === 'peaBullet' || opts.projectile.visual === 'snowPeaBullet')) {
        return false;
      }
      opts.knockback = false;
      opts.skipKnockback = true;
      opts.skipInterrupt = true;
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

  _processFighterDeath(attacker, opts) {
    this._hasDied = true;
    this.dead = true;
    this.isDead = true;
    this.onDeath();
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
      isPlantProjectile: true,
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

    if (audioSystem && typeof audioSystem.playSFX === 'function') {
      audioSystem.playSFX('Assets/Sound Effects/Attacks/crazydave-peashooter-shot.mp3', 0.80);
    } else if (audioSystem && typeof audioSystem.playSound === 'function') {
      audioSystem.playSound('Assets/Sound Effects/Attacks/crazydave-peashooter-shot.mp3', 0.80);
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
    this.immuneToKnockback = true;
    this.immuneToPull = true;
    this.immuneToPush = true;
    this.cannotBeDisplaced = true;
    this.immuneToCC = true;
    this.domainImmunity = true;
    this.immuneToBurn = true;
    this.immuneToPoison = true;
    this.immuneToBleed = true;
    this.isDebuffImmune = true;
    this.gojoBlueDragImmune = true;
    this.gojoInfinityImmune = true;
    this.phasesThroughEntities = true;
    this.ignoreFighterCollisions = true;
    this.hideHpText = true;
    this.maxHp = maxHp;
    this.hp = maxHp;

    // Complete debuff timer suppression
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.poisonTicks = 0;
    this.poisonTimer = 0;
    this.bleedTimer = 0;
    this.bleedDamageTimer = 0;
    this.paralyzeTimer = 0;
    this.slowTimer = 0;
    this.slowMultiplier = 1.0;
    this.hitStunTimer = 0;
    this.timeStopTimer = 0;
    this.silenceTimer = 0;
    this.electricStunTimer = 0;
    this.crimsonElectrifiedTimer = 0;
    this.dubstepStunTimer = 0;
    this.dubstepStunVisualTimer = 0;
    this.thunderRootsTimer = 0;
    this.staticDebuffTimer = 0;
    this.nanamiArmorFractureTimer = 0;
    this.blackFlashDebuffTimer = 0;
    this.voidMarkTimer = 0;
    this.isParalyzed = false;
    this.isParalyzedByMahito = false;
    this.isParalyzedByMahoraga = false;
    this.isFrozenByInfinity = false;
    this.isChainedByMakima = false;
    this.isWallPinnedByMakima = false;
    this.isWallPinnedBySaitama = false;
    this.isDraggedByGetsuga = false;
    this.caughtInSaitamaCounter = false;
    this.caughtInGenosFlurry = false;
    this.caughtInJohnWickCombo = false;
    this.frozenByCronos = false;
    this.isCronosStasis = false;
    this._hitByFugaTimer = 0;
    this._hitByDivineFlameTimer = 0;

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

  onCollide(opponent) {
    // Entities pass through plants without collision push
  }

  // ── Complete Debuff & Status Effect Neutralization ──
  _handleTimeStop() { return false; }
  applyHitStun() { this.hitStunTimer = 0; return; }
  applyTimeStop() { this.timeStopTimer = 0; return; }
  applySlow() { this.slowTimer = 0; this.slowMultiplier = 1.0; return; }
  applyParalyze() { this.paralyzeTimer = 0; this.isParalyzed = false; return; }
  applyBurn() { this.burnTimer = 0; this.burnDamageTimer = 0; return; }
  applyPoison() { this.poisonTicks = 0; this.poisonTimer = 0; return; }
  applyBleed() { this.bleedTimer = 0; this.bleedDamageTimer = 0; return; }
  applyStatusEffect() { return; }
  applySoulDisfigurement() { return; }
  applyTelekinesis() { return; }
  applyChain() { return; }
  applyRatioCrit() { return; }
  applyDomainStasis() { return; }
  applyGetsugaDrag() { return; }
  applySilence() { this.silenceTimer = 0; return; }
  isSilenced() { return false; }
  isParalyzedDebuffActive() { return false; }
  suppressCombatAndVisuals() { return; }
  interruptAttacks() { return; }

  // ── Complete Movement & Physics Neutralization ──
  applyKnockback() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyPush() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyPull() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applySuction() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyDrag() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }

  // ── Master Debuff Ticks Override ──
  handleStatusEffects() {
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.poisonTicks = 0;
    this.poisonTimer = 0;
    this.bleedTimer = 0;
    this.bleedDamageTimer = 0;
    this.paralyzeTimer = 0;
    this.slowTimer = 0;
    this.slowMultiplier = 1.0;
    this.hitStunTimer = 0;
    this.timeStopTimer = 0;
    this.silenceTimer = 0;
    this.electricStunTimer = 0;
    this.crimsonElectrifiedTimer = 0;
    this.dubstepStunTimer = 0;
    this.thunderRootsTimer = 0;
    this.staticDebuffTimer = 0;
    this.nanamiArmorFractureTimer = 0;
    this.blackFlashDebuffTimer = 0;
    this.voidMarkTimer = 0;
  }
  handlePoison() { return; }
  handleBurn() { return; }
  handleBleed() { return; }

  // ── Overhead & Status Renderers ──
  drawStatusOverlays() { /* Plants are immune to debuffs & overlays */ }
  drawFreezeTimer() { /* Plants are immune to freeze */ }
  drawSlowEffect() { return; }
  drawPoisonEffect() { return; }
  drawBurnEffect() { return; }
  drawBleedEffect() { return; }
  drawElectricStunEffect() { return; }
  drawCrimsonElectrifiedEffect() { return; }
  drawDubstepStunEffect() { return; }
  drawThunderRootsEffect() { return; }
  drawSilenceEffect() { return; }

  resolveWallBounce(arena, opponent) {
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
  }

  takeDamage(amount, attacker, opts = {}) {
    // Friendly fire check: ignore damage from other plants or Crazy Dave
    if (attacker && (attacker.isPlant || attacker.isPlantMinion || attacker === this.owner || (this.owner && attacker.owner === this.owner) || attacker.characterId === 'crazydave')) {
      return false;
    }
    // Ignore debuff DoT tick damages (poison ticks, burn ticks, bleed ticks, electrified ticks)
    if (opts) {
      if (opts.isPoison || opts.isBurn || opts.isBleed || opts.isElectrified) {
        return false;
      }
      if (opts.projectile && (opts.projectile.isPlantProjectile || opts.projectile.visual === 'peaBullet' || opts.projectile.visual === 'snowPeaBullet')) {
        return false;
      }
      opts.knockback = false;
      opts.skipKnockback = true;
      opts.skipInterrupt = true;
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

  _processFighterDeath(attacker, opts) {
    this._hasDied = true;
    this.dead = true;
    this.isDead = true;
    this.onDeath();
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
      isPlantProjectile: true,
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

    // Zero basic attack (Dave does not attack directly; orientation flips horizontally without rotation)
    this.damage = 0;
    this.cooldown = 999999;
    this.shootCooldown = 999999;
    this.shootCooldownMax = 999999;
    this.canShoot = false;
    this.angle = 0;
    this.gunAngle = 0;
    this.facingLeft = false;
    this.plantingPauseTimer = 0;
    this.plantingAnimTimer = 0;
    this.plantingAnimDuration = 20;
    this.shovelSwingTimer = 0;

    // Sun Economy State
    this.sunCount = cfg.initialSun || 50;
    this.maxSun = cfg.maxSun || 500;
    this.suns = [];
    this.ambientSunTimer = 0;
    this.ambientSunInterval = cfg.sunDropInterval || 110;

    // Skill Cooldowns (2 Flora Abilities)
    this.peashooterCooldown = 0;
    this.snowPeaCooldown = 0;

    // Plant Roster References & Selection History
    this.activePeashooters = [];
    this.activeSnowPeas = [];
    this.lastPlantedType = null;

    // Register Declarative Skills for HUD
    this._registerSkills();
  }

  canAim() {
    return true;
  }

  aim(opponent) {
    if (!opponent) return;
    // Dave does NOT rotate at diagonal angles; body orientation is strictly horizontal (0 or PI)
    this.angle = 0;
    if (opponent.x !== undefined) {
      this.facingLeft = opponent.x < this.x;
      this.gunAngle = this.facingLeft ? Math.PI : 0;
    }
  }

  shoot(ownerIndex) {
    // Dave has NO basic attack and never shoots projectiles
    this.shootCooldown = 999999;
    return false;
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
    this.plantingPauseTimer = 0;
    this.shootCooldown = 999999;
    this.shootCooldownMax = 999999;
    this.angle = 0;
    this.gunAngle = 0;

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
    this.lastPlantedType = null;
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
   * Spawns a Sun drop outside the top of the arena that falls down to land on the center of a grass tile.
   */
  spawnSunDrop(targetX, targetY, value = 25) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const arena = (state && state.arena) ? state.arena : { x: 0, y: 0, width: 460, height: 460 };

    let destX = targetX;
    let destY = targetY;
    if (destX === undefined || destX === null || destY === undefined || destY === null) {
      const tile = getRandomGrassTileCenter(arena);
      destX = tile.x;
      destY = tile.y;
    }

    // Spawn at the top outside of the arena and drop down to the grass tile center
    const startY = (arena && arena.y !== undefined) ? (arena.y - 45) : (destY - 220);
    const fallSpeed = cfg.sunFallSpeed || 2.2;

    const sun = {
      x: destX,
      y: startY,
      targetX: destX,
      targetY: destY,
      vx: 0,
      vy: fallSpeed,
      isLanding: true,
      r: cfg.sunRadius || 30,
      value: value,
      life: cfg.sunDecayFrames || 720,
      pulse: 0,
      rotAngle: Math.random() * Math.PI,
    };
    this.suns.push(sun);
    return sun;
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
    if (audioSystem && typeof audioSystem.playSFX === 'function') {
      audioSystem.playSFX('Assets/Sound Effects/SkillEffects/crazydave-Planting.ogg', 0.85);
    } else if (audioSystem && typeof audioSystem.playSound === 'function') {
      audioSystem.playSound('Assets/Sound Effects/SkillEffects/crazydave-Planting.ogg', 0.85);
    }

    // Stop Dave's movement momentarily upon planting and play shovel dig animation
    this.lastPlantedType = 'peashooter';
    this.plantingPauseTimer = 20;
    this.plantingAnimTimer = 20;
    this.plantingAnimDuration = 20;
    this.shovelSwingTimer = 20;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;

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
    if (audioSystem && typeof audioSystem.playSFX === 'function') {
      audioSystem.playSFX('Assets/Sound Effects/SkillEffects/crazydave-Planting.ogg', 0.85);
    } else if (audioSystem && typeof audioSystem.playSound === 'function') {
      audioSystem.playSound('Assets/Sound Effects/SkillEffects/crazydave-Planting.ogg', 0.85);
    }

    // Stop Dave's movement momentarily upon planting and play shovel dig animation
    this.lastPlantedType = 'snowpea';
    this.plantingPauseTimer = 20;
    this.plantingAnimTimer = 20;
    this.plantingAnimDuration = 20;
    this.shovelSwingTimer = 20;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    return true;
  }

  _updateSunDrops(arena, cfg) {
    if (!cfg) {
      cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    }

    // 1. Ambient Sun Falling from the Sky
    this.ambientSunTimer++;
    if (this.ambientSunTimer >= this.ambientSunInterval) {
      this.ambientSunTimer = 0;
      const tile = getRandomGrassTileCenter(arena);
      this.spawnSunDrop(tile.x, tile.y, 25);
    }

    // 2. Sun Drops Physics & Magnetic Pickup Loop
    const magnetRadius = cfg.sunAttractionRadius || 95;
    const magnetSpeed = cfg.sunAttractionSpeed || 7.0;

    for (let i = this.suns.length - 1; i >= 0; i--) {
      const sun = this.suns[i];
      sun.life--;
      if (sun.life <= 0) {
        this.suns.splice(i, 1);
        continue;
      }

      sun.rotAngle += 0.03;

      // Distance to Crazy Dave
      const dx = this.x - sun.x;
      const dy = this.y - sun.y;
      const dist = Math.hypot(dx, dy);

      // Magnetic Attraction (pulls toward Dave and interrupts landing descent)
      if (dist < magnetRadius && dist > 0.001) {
        sun.isLanding = false;
        const pull = (1.0 - dist / magnetRadius) * magnetSpeed;
        sun.vx = (sun.vx || 0) * 0.92 + (dx / dist) * pull;
        sun.vy = (sun.vy || 0) * 0.92 + (dy / dist) * pull;
        sun.x += sun.vx;
        sun.y += sun.vy;
      } else if (sun.isLanding) {
        // Falling down from the sky outside the top of the arena
        sun.y += (sun.vy || cfg.sunFallSpeed || 2.2);
        sun.x = sun.targetX;
        if (sun.y >= sun.targetY) {
          sun.y = sun.targetY;
          sun.vy = 0;
          sun.vx = 0;
          sun.isLanding = false;
        }
      } else {
        // Settled on grass tile center
        sun.x = sun.targetX;
        sun.y = sun.targetY;
        sun.vx = 0;
        sun.vy = 0;
      }

      // Pickup Collision
      if (dist < (this.r + sun.r + 8)) {
        this.sunCount = Math.min(cfg.maxSun || 500, this.sunCount + (sun.value || 25));
        spawnFloatingText(this.x, this.y - 20, `+${sun.value || 25} ☀️`, '#FEF08A');
        spawnSparks(sun.x, sun.y, 8, '#FACC15');
        if (audioSystem && typeof audioSystem.playSFX === 'function') {
          audioSystem.playSFX('Assets/Sound Effects/Sprites SFX/crazydave-sun-pickup.mp3', 0.85);
        } else if (audioSystem && typeof audioSystem.playSound === 'function') {
          audioSystem.playSound('Assets/Sound Effects/Sprites SFX/crazydave-sun-pickup.mp3', 0.85);
        }
        this.suns.splice(i, 1);
      }
    }
  }

  update(opponent, ownerIndex, arena) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;

    // Environmental sun drops physics & ambient falling loop MUST update even if Dave is frozen or CC'd
    this._updateSunDrops(arena, cfg);

    // 1. Freeze / Time-Stop Guard (Rule 1.1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // Enforce strictly zero angular rotation and update horizontal facing direction
    this.angle = 0;
    if (Math.abs(this.vx) > 0.3) {
      this.facingLeft = this.vx < 0;
      this.gunAngle = this.facingLeft ? Math.PI : 0;
    } else if (opponent && opponent.x !== undefined && opponent.hp > 0) {
      this.facingLeft = opponent.x < this.x;
      this.gunAngle = this.facingLeft ? Math.PI : 0;
    }
    this.shootCooldown = 999999;

    // Shovel planting animation timer & dirt particle puff
    if (this.plantingAnimTimer > 0) {
      this.plantingAnimTimer--;
      this.shovelSwingTimer = this.plantingAnimTimer;
      if (this.plantingAnimTimer === 10) {
        // Shovel scoops dirt: spawn small soil particles
        const dirtX = this.x + (this.facingLeft ? -this.r * 1.2 : this.r * 1.2);
        const dirtY = this.y + this.r * 0.55;
        spawnSparks(dirtX, dirtY, 4, '#15803D');
        spawnSparks(dirtX, dirtY, 4, '#78350F');
      }
    }

    // Cooldown updates
    if (this.peashooterCooldown > 0) this.peashooterCooldown--;
    if (this.snowPeaCooldown > 0) this.snowPeaCooldown--;

    // Planting Pause: stop Dave's movement for a moment when planting
    if (this.plantingPauseTimer > 0) {
      this.plantingPauseTimer--;
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.resolveWallBounce(arena, opponent);
      return;
    }

    // 4. AI Planting Decisions (Anti-Repetition & Balanced Flora Arsenal Standard)
    if (opponent && opponent.hp > 0) {
      const peashooterCost = cfg.peashooterCost || 100;
      const snowPeaCost = cfg.snowPeaCost || 175;
      const peashooterEnabled = isSkillEnabled(cfg.enablePeashooter, true);
      const snowPeaEnabled = isSkillEnabled(cfg.enableSnowPea, true);

      const activePeas = (this.activePeashooters || []).filter(p => p && p.hp > 0).length;
      const activeSnow = (this.activeSnowPeas || []).filter(s => s && s.hp > 0).length;
      const maxPeas = cfg.maxPeashooters || 3;
      const maxSnow = cfg.maxSnowPeas || 3;

      let chooseType = null;

      if (peashooterEnabled && snowPeaEnabled) {
        // Both flora skills enabled: Ensure Dave does NOT repeatedly choose the same plant.
        // Balances field composition and strictly alternates selections.
        if (activePeas >= maxPeas && activeSnow < maxSnow) {
          chooseType = 'snowpea';
        } else if (activeSnow >= maxSnow && activePeas < maxPeas) {
          chooseType = 'peashooter';
        } else if (activePeas > activeSnow) {
          // More Peashooters than Snow Peas -> prioritize Snow Pea
          chooseType = 'snowpea';
        } else if (activeSnow > activePeas) {
          // More Snow Peas than Peashooters -> prioritize Peashooter
          chooseType = 'peashooter';
        } else {
          // Equal counts on field: strictly alternate from last planted plant
          if (this.lastPlantedType === 'peashooter') {
            chooseType = 'snowpea';
          } else if (this.lastPlantedType === 'snowpea') {
            chooseType = 'peashooter';
          } else {
            // Initial plant of match: Peashooter for early defense
            chooseType = 'peashooter';
          }
        }
      } else if (peashooterEnabled && activePeas < maxPeas) {
        chooseType = 'peashooter';
      } else if (snowPeaEnabled && activeSnow < maxSnow) {
        chooseType = 'snowpea';
      }

      // Execute planting for chosen plant
      if (chooseType === 'snowpea') {
        if (this.snowPeaCooldown <= 0 && this.sunCount >= snowPeaCost) {
          this.plantSnowPea(opponent);
        }
      } else if (chooseType === 'peashooter') {
        if (this.peashooterCooldown <= 0 && this.sunCount >= peashooterCost) {
          this.plantPeashooter(opponent);
        }
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
