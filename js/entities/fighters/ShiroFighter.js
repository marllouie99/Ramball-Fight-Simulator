// ─────────────────────────────────────────────
// SHIRO FIGHTER CLASS
// Queen of Elkia (『　　』 Blank — No Game No Life)
// Disboard Chess Prodigy & Living Chess Troop Summoner
// Adheres strictly to Repository Rules:
// - Rule 1.1: Mandatory Freeze & TimeStop Guard
// - Rule 20: Symmetrical Hand Layering
// - Rule 21: Mandatory Overhead HP & Freeze Timer (drawHealth, drawFreezeTimer)
// - Rule 23: Basic Projectile Suppression (shoot override with RNG Chess Troops)
// - Rule 25: Non-Freezing Active Visual Effects Decay at top of update
// ─────────────────────────────────────────────

import { Fighter } from '../fighter.js';
import { shiroConfig } from '../../configs/characters/shiroConfig.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { ARENA_TILE_COUNT } from '../../systems/arenaTileGrid.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { drawShiroSkin } from '../../graphics/fighters/shiroSkin.js';
import {
  drawDisboardChessboard,
  drawTroopThreatTiles,
  drawChessTroop,
  drawChessAttackVfx,
  spawnChessTroopShatter
} from '../../graphics/weapons/shiroChessGraphics.js';

export class ShiroFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'shiro';
    this.type = 'shiro';
    this.name = shiroConfig.name || 'Shiro';
    this.displayName = shiroConfig.displayName || 'Shiro';
    this.hideHands = true;
    this.themeColor = shiroConfig.themeColor || '#8B5CF6';
    this.color = shiroConfig.color || '#A855F7';
    this.damageNumberColor = shiroConfig.damageNumberColor || '#38BDF8';

    this.hp = shiroConfig.hp || 340;
    this.maxHp = shiroConfig.maxHp || 340;
    this.speed = shiroConfig.speed || 5.6;
    this.baseSpeed = shiroConfig.speed || 5.6;
    this.r = shiroConfig.radius || shiroConfig.r || 25;
    this.radius = this.r;

    // Basic Attack Cadence (No Skills — 100% Troop Summoning)
    this.shootCooldownMax = shiroConfig.basicAttackCooldown || 75;
    this.shootCooldown = this.shootCooldownMax;
    this.throwSpeed = shiroConfig.throwSpeed || 16.0;
    this.throwSpeedMultiplier = shiroConfig.throwSpeedMultiplier || 1.0;

    // Tactical State & Minion Management
    this.activeMinions = [];
    this.activeVisualEffects = [];
    this.pityCounter = 0;
    this.centerGridTimer = 0;
    this.chessTurnCooldown = 0;
  }

  reset() {
    super.reset();
    if (this.activeMinions) {
      for (const m of this.activeMinions) {
        if (typeof state !== 'undefined' && Array.isArray(state.fighters)) {
          const idx = state.fighters.indexOf(m);
          if (idx !== -1) state.fighters.splice(idx, 1);
        }
      }
      this.activeMinions.length = 0;
    } else {
      this.activeMinions = [];
    }
    if (this.activeVisualEffects) {
      this.activeVisualEffects.length = 0;
    } else {
      this.activeVisualEffects = [];
    }
    this.pityCounter = 0;
    this.centerGridTimer = 0;
    this.chessTurnCooldown = 0;
    this.shootCooldown = this.shootCooldownMax;
    if (typeof state !== 'undefined') {
      state._shiroChessboardAlpha = 0;
      state._shiroChessboardAssembleProgress = 0;
      state._shiroChessboardShutdownTimer = 0;
      state._shiroChessboardWasActive = false;
    }
  }

  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks?.(forceCancelAll);
  }

  drawGun() {}

  _getSoundVolume(key, defaultVol = 0.85) {
    return this.config?.soundVolumes?.[key]
      ?? this.config?.audioVolumes?.[key]
      ?? shiroConfig.soundVolumes?.[key]
      ?? shiroConfig.audioVolumes?.[key]
      ?? defaultVol;
  }

  // ─────────────────────────────────────────────
  // Rule 25: Visual Effects Decay Processing
  // ─────────────────────────────────────────────
  _updateVisualEffects() {
    if (this.centerGridTimer > 0) this.centerGridTimer--;

    for (let i = this.activeVisualEffects.length - 1; i >= 0; i--) {
      const vfx = this.activeVisualEffects[i];
      vfx.timer = (vfx.timer || 0) - 1;
      if (vfx.timer <= 0) {
        this.activeVisualEffects.splice(i, 1);
      }
    }
  }

  // ─────────────────────────────────────────────
  // Rule 23: Basic Projectile Suppression & RNG Chess Troop Flick
  // ─────────────────────────────────────────────
  shoot(ownerIndex, opponent) {
    if (this.isCaughtInBeam()) return;
    if (this.shootCooldown > 0) return;

    this.shootCooldown = this.shootCooldownMax;
    this._flickChessTroop(opponent);
  }

  _flickChessTroop(opponent) {
    const angle = this.gunAngle || this.angle || 0;
    this.pityCounter++;

    // Determine Piece Type via Weighted RNG & Loaded Dice Pity System
    let pieceType = 'pawn';
    if (this.pityCounter >= shiroConfig.pityThreshold) {
      // Pity Roll: Guaranteed Rare Rook or Legendary Queen
      this.pityCounter = 0;
      pieceType = Math.random() < 0.65 ? 'rook' : 'queen';
      spawnFloatingText(this.x, this.y - this.r - 20, 'LOADED DICE!', '#FCD34D');
    } else {
      const roll = Math.random();
      const rates = shiroConfig.dropRates;
      if (roll < rates.pawn) {
        pieceType = 'pawn';
      } else if (roll < rates.pawn + rates.knight) {
        pieceType = 'knight';
      } else if (roll < rates.pawn + rates.knight + rates.bishop) {
        pieceType = 'bishop';
      } else if (roll < rates.pawn + rates.knight + rates.bishop + rates.rook) {
        pieceType = 'rook';
      } else {
        pieceType = 'queen';
        spawnFloatingText(this.x, this.y - this.r - 20, 'JACKPOT QUEEN!', '#EC4899');
      }
    }

    // ── Troop Type Cap: Max 2 active per type (Queen: max 1) ──
    // If cap is reached, downgrade to pawn
    if (pieceType !== 'pawn') {
      const maxActive = pieceType === 'queen' ? 1 : 2;
      const activeCount = this.activeMinions.filter(
        m => m && !m.dead && m.hp > 0 && m.isMinion && m.type === pieceType
      ).length;
      if (activeCount >= maxActive) {
        pieceType = 'pawn';
      }
    }

    const cfg = shiroConfig.troops[pieceType];
    const baseSpeed = (cfg.throwSpeed !== undefined ? cfg.throwSpeed : (cfg.projSpeed || this.throwSpeed || 16.0));
    const speedMult = (this.throwSpeedMultiplier !== undefined ? this.throwSpeedMultiplier : (shiroConfig.throwSpeedMultiplier || 1.0)) * (shiroConfig.projectileSpeedMultiplier || 1.0);
    const finalThrowSpeed = baseSpeed * speedMult;

    const projRadius = cfg.projectileRadius || shiroConfig.projectileRadius || 6;
    const troopFullRadius = cfg.radius || 15;

    const spawnDist = this.r + 10;
    const startX = this.x + Math.cos(angle) * spawnDist;
    const startY = this.y + Math.sin(angle) * spawnDist;

    // Spawn Projectile / Troop
    const newTroop = {
      id: Math.random().toString(36).substr(2, 9),
      type: pieceType,
      isMinion: false, // Starts as small projectile, becomes living minion on impact/land
      isChessTroop: true,
      isChessMinion: true,
      isChessPiece: true,
      noBlood: true,
      suppressBlood: true,
      bleedImmune: true,
      isBloodImmune: true,
      x: startX,
      y: startY,
      vx: Math.cos(angle) * finalThrowSpeed,
      vy: Math.sin(angle) * finalThrowSpeed,
      throwSpeed: finalThrowSpeed,
      angle: angle,
      radius: projRadius,
      r: projRadius,
      troopRadius: troopFullRadius,
      hp: cfg.hp,
      maxHp: cfg.hp,
      damage: cfg.projDmg,
      pawnDamageCount: 0,
      dead: false,
      bounces: 0,
      attackCooldown: 0,
      takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
          this.hp = 0;
          this.dead = true;
        }
      }
    };

    this.activeMinions.push(newTroop);
  }

  // ─────────────────────────────────────────────
  // Chess Occupancy & Line-of-Sight Path Helpers
  // ─────────────────────────────────────────────
  _isTileOccupied(col, row, excludeTroop = null, arena = null, ignoreEntity = null) {
    for (const minion of this.activeMinions || []) {
      if (!minion || minion === excludeTroop || !minion.isMinion || minion.dead || minion.hp <= 0) continue;
      if (minion.tileCol === col && minion.tileRow === row) return true;
      if (minion.isAttacking && minion.targetTile && minion.targetTile.col === col && minion.targetTile.row === row) return true;
    }

    const board = arena || state.arena;
    if (!board || !Array.isArray(state.fighters)) return false;

    const tileW = board.width / ARENA_TILE_COUNT;
    const tileH = board.height / ARENA_TILE_COUNT;
    for (const entity of state.fighters) {
      if (!entity || entity === this || entity === excludeTroop || entity === ignoreEntity || entity.owner === this) continue;
      if (entity.dead || entity.isDead || entity.hp <= 0) continue;
      if (!(entity.isMinion || entity.isDeployable || entity.isPlant || entity.isPlantMinion || entity.isChessTroop || entity.isChessMinion || entity.isTurret || entity.isDispenser || entity.isBuilding || entity.isBarrier)) continue;
      if (!Number.isFinite(entity.x) || !Number.isFinite(entity.y)) continue;
      if (entity.x < board.x || entity.x >= board.x + board.width || entity.y < board.y || entity.y >= board.y + board.height) continue;

      const entityCol = Math.floor((entity.x - board.x) / tileW);
      const entityRow = Math.floor((entity.y - board.y) / tileH);
      if (entityCol === col && entityRow === row) return true;
    }
    return false;
  }

  _isPathClear(startCol, startRow, endCol, endRow, excludeTroop = null, ignoreEntity = null, arena = null) {
    if (this._isTileOccupied(endCol, endRow, excludeTroop, arena, ignoreEntity)) return false;

    const stepCol = Math.sign(endCol - startCol);
    const stepRow = Math.sign(endRow - startRow);

    let currCol = startCol + stepCol;
    let currRow = startRow + stepRow;

    // Check intermediate squares along the sliding ray (Bishop, Rook, Queen)
    while (currCol !== endCol || currRow !== endRow) {
      if (this._isTileOccupied(currCol, currRow, excludeTroop, arena)) {
        return false; // Obstructed by an intervening piece!
      }
      currCol += stepCol;
      currRow += stepRow;
    }

    return true;
  }

  _isChessMinionTarget(entity) {
    return Boolean(entity && (
      entity.isMinion || entity.isMinionEntity || entity.isDeployable || entity.isPlant ||
      entity.isPlantMinion || entity.isPlantBarrier || entity.isWallnut || entity.isTurret ||
      entity.isDispenser || entity.isBuilding || entity.isBarrier || entity.isChessTroop || entity.isChessMinion
    ));
  }

  _isEnemyChessTarget(entity) {
    if (!entity || entity === this || entity.dead || entity.isDead || entity.hp <= 0) return false;
    if (entity.isLawnmower || entity.isUntargetable || entity.untargetable || entity.cannotBeTargeted || entity.isTargetable === false) return false;
    if (entity.owner === this) return false;
    if (typeof this.isTeammate === 'function' && (this.isTeammate(entity) || (entity.owner && this.isTeammate(entity.owner)))) return false;
    return true;
  }

  _getChessAttackTargets(opponent, arena) {
    const targets = new Set();
    const addTarget = (entity, minionOnly = false) => {
      if (!this._isEnemyChessTarget(entity)) return;
      if (minionOnly && !this._isChessMinionTarget(entity)) return;
      if (!Number.isFinite(entity.x) || !Number.isFinite(entity.y)) return;
      if (entity.x < arena.x || entity.x >= arena.x + arena.width || entity.y < arena.y || entity.y >= arena.y + arena.height) return;
      targets.add(entity);
    };

    addTarget(opponent);
    for (const entity of state.fighters || []) {
      addTarget(entity, true);
    }
    return [...targets];
  }

  _captureEnemyChessMinion(target) {
    if (!this._isChessMinionTarget(target) || !this._isEnemyChessTarget(target)) return false;

    const previousHp = Number(target.hp);
    const captureOptions = { isChessCapture: true, isGuaranteedHit: true, bypassShield: true };
    if (typeof target.takeDamage === 'function') {
      const damage = Math.max(1, Math.ceil(Number.isFinite(previousHp) ? previousHp : (Number(target.maxHp) || 1)));
      const result = target.takeDamage(damage, this, captureOptions);
      if (result === false && !(Number.isFinite(previousHp) && Number(target.hp) < previousHp)) return false;
    } else {
      target.hp = 0;
    }

    if (target.hp > 0) {
      target.hp = 0;
    }
    if (!target._hasDied && typeof target._processFighterDeath === 'function') {
      target._processFighterDeath(this, captureOptions);
    }
    if (target.isChessMinion || target.isChessTroop || target.isChessPiece) {
      if (!target._hasShattered) {
        target._hasShattered = true;
        spawnChessTroopShatter(target);
      }
    }
    target.dead = true;
    target.isDead = true;

    const owner = typeof target.owner === 'number' ? state.fighters?.[target.owner] : target.owner;
    for (const listName of ['activeMinions', 'activeWallnuts', 'activePeashooters', 'activeSnowPeas', 'activeTorchwoods', 'activePotatoMines']) {
      const list = owner && owner[listName];
      if (!Array.isArray(list)) continue;
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i] === target) list.splice(i, 1);
      }
    }
    if (owner?.turretEntity === target) owner.turretEntity = null;
    if (owner?.dispenserEntity === target) owner.dispenserEntity = null;
    if (Array.isArray(state.fighters)) {
      const index = state.fighters.indexOf(target);
      if (index !== -1) state.fighters.splice(index, 1);
    }
    return true;
  }

  // ─────────────────────────────────────────────
  // Snap & Plant Minion to Center of Chessboard Tile
  // ─────────────────────────────────────────────
  _plantTroopOnTileCenter(troop, arena) {
    troop.isMinion = true;
    troop.isChessTroop = true;
    troop.isChessMinion = true;
    troop.isChessPiece = true;
    troop.noBlood = true;
    troop.suppressBlood = true;
    troop.bleedImmune = true;
    troop.isBloodImmune = true;
    troop.isImmovable = true;
    troop.cannotBeKnockbacked = true;
    troop.immuneToKnockback = true;
    troop.immuneToPush = true;
    troop.cannotBePushed = true;
    troop.cannotBeDisplaced = true;
    troop.owner = this;
    troop.team = (this.team !== undefined ? this.team : null);
    troop.characterId = 'chess_' + troop.type;
    troop.isTargetable = true;
    troop.hideHpText = true;
    troop.vx = 0;
    troop.vy = 0;
    troop.knockbackVx = 0;
    troop.knockbackVy = 0;
    const fullRadius = shiroConfig.troops[troop.type]?.radius || troop.troopRadius || 15;
    troop.r = fullRadius;
    troop.radius = fullRadius;
    troop.update = (opponent, ownerIndex, arena) => {};
    troop.drawHealth = (ctx) => {};
    troop.drawFreezeTimer = (ctx) => {};
    troop.canAim = () => false;
    troop.aim = (opponent) => {};
    troop.reset = () => {};
    troop.interruptAttacks = () => {};
    troop.applyTimeStop = (duration) => {};
    troop.applySlow = (frames, mult) => {};
    troop.applyParalyze = (duration) => {};
    troop.applyKnockback = () => {
      troop.vx = 0;
      troop.vy = 0;
      troop.knockbackVx = 0;
      troop.knockbackVy = 0;
    };
    troop.applyPush = troop.applyKnockback;
    troop.hasActiveFinishingAbility = () => false;
    troop.onCollide = (other) => {};
    troop.resolveWallBounce = (arena) => {};
    troop.applyBurn = (attacker) => {};
    troop.applyHitStun = (duration) => {};

    troop.isTeammate = (other) => {
      if (!other) return false;
      if (other === this || other === troop) return true;
      if (other.owner === this) return true;
      if (typeof this.isTeammate === 'function') {
        return this.isTeammate(other);
      }
      return false;
    };

    troop.takeDamage = (amount, attacker, options = {}) => {
      if (troop.dead || troop.hp <= 0) return 0;
      // Prevent friendly fire from Shiro or teammates
      if (attacker && troop.isTeammate(attacker)) return 0;

      const dmg = Math.max(1, Math.round(amount || 0));
      troop.hp -= dmg;
      spawnFloatingText(troop.x, troop.y - 14, `-${dmg}`, '#EF4444');
      audioSystem.playSFX('attack_fleshhit', this._getSoundVolume('fleshHit', 0.80));

      if (troop.hp <= 0) {
        troop.hp = 0;
        troop.dead = true;
        spawnFloatingText(troop.x, troop.y - 18, `${troop.type.toUpperCase()} DESTROYED!`, '#EF4444');
        if (!troop._hasShattered) {
          troop._hasShattered = true;
          spawnChessTroopShatter(troop);
        }

        // Remove from state.fighters immediately upon destruction
        if (typeof state !== 'undefined' && Array.isArray(state.fighters)) {
          const idx = state.fighters.indexOf(troop);
          if (idx !== -1) state.fighters.splice(idx, 1);
        }
      }
      return dmg;
    };

    troop.draw = (ctx, opponent) => {
      drawChessTroop(ctx, troop);
    };

    if (arena) {
      const cols = ARENA_TILE_COUNT;
      const rows = ARENA_TILE_COUNT;
      const tileW = arena.width / cols;
      const tileH = arena.height / rows;

      // Calculate initial tile col and row clamped within [0, 7]
      let col = Math.max(0, Math.min(cols - 1, Math.floor((troop.x - arena.x) / tileW)));
      let row = Math.max(0, Math.min(rows - 1, Math.floor((troop.y - arena.y) / tileH)));

      // If the target tile is occupied by any active minion or deployable, use the nearest free tile.
      if (this._isTileOccupied(col, row, troop, arena)) {
        let bestDist = Infinity;
        let bestCol = col;
        let bestRow = row;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (!this._isTileOccupied(c, r, troop, arena)) {
              const d = Math.hypot(c - col, r - row);
              if (d < bestDist) {
                bestDist = d;
                bestCol = c;
                bestRow = r;
              }
            }
          }
        }
        col = bestCol;
        row = bestRow;
      }

      // Plant squarely at the exact center of the free tile
      troop.x = arena.x + (col + 0.5) * tileW;
      troop.y = arena.y + (row + 0.5) * tileH;
      troop.tileCol = col;
      troop.tileRow = row;

      // Ensure the Disboard floor grid illuminates when a piece is planted
      this.centerGridTimer = Math.max(this.centerGridTimer, 60);

      // Summon & Materialization lifecycle: Troop ascends slowly onto the square
      troop.isSummoning = true;
      troop.summonTimer = 40;
      troop.summonMaxTimer = 40;
      troop.attackCooldown = 40 + 30; // 40 frames of ascending summon + 30 frames of idle buffer before attacking

      // Trigger cinematic planting visual effect
      this.activeVisualEffects.push({
        type: 'troop_plant',
        col: col,
        row: row,
        x: troop.x,
        y: troop.y,
        pieceType: troop.type,
        timer: 40,
        maxTimer: 40
      });

      // Subtle tactical screen micro-bump on troop lock-in
      triggerGlobalScreenShake(2.5, 4);

      // Audio: Troop Appears / Materializes on Tile
      audioSystem.playSFX('shiro_troop_summon', this._getSoundVolume('troopSummon', 0.85));
    }

    // Register into state.fighters so enemies can target, attack, and collide with them
    if (typeof state !== 'undefined' && Array.isArray(state.fighters) && !state.fighters.includes(troop)) {
      state.fighters.push(troop);
    }
  }

  _recordPawnDamage(troop) {
    if (troop.type !== 'pawn') return;

    troop.pawnDamageCount = (troop.pawnDamageCount || 0) + 1;
    if (troop.pawnDamageCount < 4) return;

    const promotionTypes = ['knight', 'bishop', 'rook', 'queen'];
    const promotedType = promotionTypes[Math.floor(Math.random() * promotionTypes.length)];
    const promotedConfig = shiroConfig.troops[promotedType];

    troop.type = promotedType;
    troop.characterId = 'chess_' + promotedType;
    troop.maxHp = promotedConfig.hp;
    troop.hp = Math.min(troop.hp, troop.maxHp);
    troop.troopRadius = promotedConfig.radius;
    troop.r = promotedConfig.radius;
    troop.radius = promotedConfig.radius;
    troop.damage = promotedConfig.projDmg;
    spawnFloatingText(troop.x, troop.y - 20, `PROMOTED: ${promotedConfig.name.toUpperCase()}!`, '#FCD34D');
  }

  // ─────────────────────────────────────────────
  // Minion Update & Chess Behavior Pipeline
  // ─────────────────────────────────────────────
  _updateTroopMinions(opponent, arena) {
    if (this.chessTurnCooldown > 0) this.chessTurnCooldown--;

    // Keep max active minions clamped
    if (this.activeMinions.length > shiroConfig.maxActiveMinions + 2) {
      const removed = this.activeMinions.shift();
      if (removed && typeof state !== 'undefined' && Array.isArray(state.fighters)) {
        const idx = state.fighters.indexOf(removed);
        if (idx !== -1) state.fighters.splice(idx, 1);
      }
    }

    // Keep grid illuminated while living chess troops defend the board
    if (this.activeMinions.some(m => m.isMinion && !m.dead && m.hp > 0)) {
      this.centerGridTimer = Math.max(this.centerGridTimer, 30);
    }

    for (let i = this.activeMinions.length - 1; i >= 0; i--) {
      const troop = this.activeMinions[i];

      // 1. Remove when destroyed by enemy damage
      if (troop.hp <= 0 || troop.dead) {
        if (!troop._hasShattered) {
          troop._hasShattered = true;
          spawnChessTroopShatter(troop);
        }
        if (typeof state !== 'undefined' && Array.isArray(state.fighters)) {
          const idx = state.fighters.indexOf(troop);
          if (idx !== -1) state.fighters.splice(idx, 1);
        }
        this.activeMinions.splice(i, 1);
        continue;
      }

      // 2. Projectile Phase (Flying toward target)
      if (!troop.isMinion) {
        troop.x += troop.vx;
        troop.y += troop.vy;

        // Check Hit Against Opponent
        if (opponent && !opponent.dead) {
          const dist = Math.hypot(opponent.x - troop.x, opponent.y - troop.y);
          if (dist <= troop.radius + (opponent.r || 25)) {
            opponent.takeDamage?.(troop.damage, this);
            spawnFloatingText(troop.x, troop.y - 12, `${troop.damage}`, '#38BDF8');
            audioSystem.playSFX('attack_fleshhit', this._getSoundVolume('fleshHit', 0.80));
            // Snap & Plant Troop squarely at the center of the hit tile facing upright towards player
            this._plantTroopOnTileCenter(troop, arena);
            continue;
          }
        }

        // Check Wall Bounds
        if (arena) {
          const minX = arena.x + troop.radius;
          const maxX = arena.x + arena.width - troop.radius;
          const minY = arena.y + troop.radius;
          const maxY = arena.y + arena.height - troop.radius;

          if (troop.type === 'bishop' && (troop.x <= minX || troop.x >= maxX || troop.y <= minY || troop.y >= maxY)) {
            // Bishop bounces at 45 deg angles up to 2 times
            troop.bounces = (troop.bounces || 0) + 1;
            if (troop.x <= minX || troop.x >= maxX) troop.vx *= -1;
            if (troop.y <= minY || troop.y >= maxY) troop.vy *= -1;
            troop.angle = Math.atan2(troop.vy, troop.vx);
            if (troop.bounces > (shiroConfig.troops.bishop.maxBounces || 2)) {
              this._plantTroopOnTileCenter(troop, arena);
            }
          } else if (troop.x <= minX || troop.x >= maxX || troop.y <= minY || troop.y >= maxY) {
            troop.x = Math.max(minX, Math.min(maxX, troop.x));
            troop.y = Math.max(minY, Math.min(maxY, troop.y));
            this._plantTroopOnTileCenter(troop, arena);
          }
        }
        continue;
      }

      // 3. Living Minion Phase: Intercept Enemy Projectiles & Take Damage
      if (typeof state !== 'undefined' && Array.isArray(state.projectiles)) {
        for (let pIdx = state.projectiles.length - 1; pIdx >= 0; pIdx--) {
          const proj = state.projectiles[pIdx];
          if (!proj || proj.owner === this || proj.dead) continue;

          const pDist = Math.hypot(proj.x - troop.x, proj.y - troop.y);
          if (pDist <= troop.radius + (proj.radius || 6)) {
            const projDmg = proj.damage || 15;
            troop.takeDamage?.(projDmg, proj.owner || proj);

            proj.dead = true;
            if (typeof state.projectiles.splice === 'function') {
              state.projectiles.splice(pIdx, 1);
            }
            break;
          }
        }
      }

      if (troop.hp <= 0 || troop.dead) {
        if (typeof state !== 'undefined' && Array.isArray(state.fighters)) {
          const idx = state.fighters.indexOf(troop);
          if (idx !== -1) state.fighters.splice(idx, 1);
        }
        this.activeMinions.splice(i, 1);
        continue;
      }

      // 4. Telegraph Wind-Up Phase (Troop illuminates threat path & locks on before moving)
      if (troop.isTelegraphing && troop.telegraphTimer > 0) {
        troop.telegraphTimer--;
        if (troop.telegraphTimer <= 0) {
          troop.isTelegraphing = false;
          troop.isAttacking = true;
          troop.moveTimer = troop.moveDuration || 10;
          troop.moveMaxTimer = troop.moveDuration || 10;

          if (troop.type === 'knight' && troop.cornerTile) {
            this.activeVisualEffects.push({
              type: 'knight_trail',
              startX: troop.startTile.x,
              startY: troop.startTile.y,
              cornerX: troop.cornerTile.x,
              cornerY: troop.cornerTile.y,
              endX: troop.targetTile.x,
              endY: troop.targetTile.y,
              timer: 24,
              maxTimer: 24
            });
          }

          // Audio: Troop Moving
          audioSystem.playSFX('shiro_troop_move', this._getSoundVolume('troopMove', 0.85));
        }
        continue;
      }

      // 5. Moving Attack Phase (Troop gliding/leaping across the board to target tile)
      if (troop.isAttacking && troop.moveTimer > 0) {
        troop.moveTimer--;
        const p = 1.0 - (troop.moveTimer / (troop.moveMaxTimer || 10));

        if (troop.type === 'knight' && troop.cornerTile) {
          // Authentic Piecewise 2-Segment L-Shape Trajectory:
          // Segment 1 (0.00 to 0.60): Leap 2 squares along major axis to corner waypoint
          // Segment 2 (0.60 to 1.00): Turn 90 deg and leap 1 square along minor axis to target tile
          const split = 0.60;
          if (p <= split) {
            const segP = p / split;
            troop.x = troop.startTile.x + (troop.cornerTile.x - troop.startTile.x) * segP;
            troop.y = troop.startTile.y + (troop.cornerTile.y - troop.startTile.y) * segP;
          } else {
            const segP = (p - split) / (1.0 - split);
            troop.x = troop.cornerTile.x + (troop.targetTile.x - troop.cornerTile.x) * segP;
            troop.y = troop.cornerTile.y + (troop.targetTile.y - troop.cornerTile.y) * segP;
          }
          // Parabolic jump arc with peak height of 45px
          troop.z = Math.sin(p * Math.PI) * 45;
        } else {
          troop.x = troop.startTile.x + (troop.targetTile.x - troop.startTile.x) * p;
          troop.y = troop.startTile.y + (troop.targetTile.y - troop.startTile.y) * p;
        }

        // On Arrival at target square: Deliver attack impact / capture
        if (troop.moveTimer <= 0) {
          troop.isAttacking = false;
          troop.x = troop.targetTile.x;
          troop.y = troop.targetTile.y;
          troop.z = 0;
          troop.tileCol = troop.targetTile.col;
          troop.tileRow = troop.targetTile.row;
          troop.cornerTile = null;
          troop.attackCooldown = 40;
          this.chessTurnCooldown = shiroConfig.turnCooldown || 14; // Turn cadence before next piece can move

          const cfg = shiroConfig.troops[troop.type];
          const attackTarget = troop.attackTarget || opponent;
          troop.attackTarget = null;

          // ── Knight & Queen: ALWAYS fire AOE shockwave + area damage on landing ──
          // These are ground-slam AOE attacks — they trigger regardless of distance to opponent
          if (troop.type === 'knight') {
            const aoeRadius = cfg.leapAoe || 58;
            const slowDur = cfg.slowDuration || 90;
            const slowMult = cfg.slowMultiplier || 0.40;
            const shakeInt = cfg.screenShakeIntensity || 5.0;
            const shakeDur = cfg.screenShakeDuration || 10;

            // Audio: Knight Spawn Shockwaves
            audioSystem.playSFX('shiro_knight_slam', this._getSoundVolume('knightSlam', 0.95));
            triggerGlobalScreenShake(shakeInt, shakeDur);

            // Shockwave visual effect (ALWAYS displays on landing)
            this.activeVisualEffects.push({
              type: 'knight_shockwave',
              x: troop.x,
              y: troop.y,
              radius: aoeRadius,
              timer: 18,
              maxTimer: 18
            });

            // Find all valid enemies within AOE radius
            const validTargets = [];
            if (typeof state !== 'undefined' && Array.isArray(state.fighters)) {
              for (const ent of state.fighters) {
                if (!ent || ent.dead || ent.hp <= 0 || ent === this || (typeof this.isTeammate === 'function' && this.isTeammate(ent)) || ent.owner === this) continue;
                const d = Math.hypot(ent.x - troop.x, ent.y - troop.y);
                if (d <= aoeRadius + (ent.r || 25)) {
                  validTargets.push(ent);
                }
              }
            } else if (opponent && !opponent.dead) {
              const d = Math.hypot(opponent.x - troop.x, opponent.y - troop.y);
              if (d <= aoeRadius + (opponent.r || 25)) {
                validTargets.push(opponent);
              }
            }

            for (const target of validTargets) {
              if (this._isChessMinionTarget(target)) {
                if (this._captureEnemyChessMinion(target)) {
                  spawnFloatingText(target.x, target.y - 15, `${target.name || target.type || 'MINION'} CAPTURED!`, '#38BDF8');
                }
                continue;
              }

              target.takeDamage?.(cfg.leapDmg, this);
              target.applyHitStun?.(cfg.leapStun || 16);

              // Apply Slow Debuff
              if (typeof target.applySlow === 'function') {
                target.applySlow(slowDur, slowMult, { isKnightSlow: true });
              } else if (target.statusEffects && typeof target.statusEffects.applySlow === 'function') {
                target.statusEffects.applySlow(slowDur, slowMult, { isKnightSlow: true });
              }

              spawnFloatingText(target.x, target.y - 18, `KNIGHT SLAM! -${cfg.leapDmg} (SLOW)`, '#F59E0B');
            }
          } else if (troop.type === 'queen') {
            const aoeRadius = cfg.slashAoe || 110;
            const slowDur = cfg.slowDuration || 120;
            const slowMult = cfg.slowMultiplier || 0.35;
            const knockbackImpulse = cfg.knockbackImpulse || 20.0;
            const stunDur = cfg.stunDuration || 50;
            const bleedDur = cfg.bleedDuration || 180;
            const bleedDmg = cfg.bleedDmgPerTick || 5;
            const bleedInt = cfg.bleedInterval || 25;
            const shakeInt = cfg.screenShakeIntensity || 6.0;
            const shakeDur = cfg.screenShakeDuration || 12;

            // Audio: Queen Checkmate Ground Slam & Whirlwind Shockwave
            audioSystem.playSFX('shiro_queen_slam', this._getSoundVolume('queenSlam', 1.0));
            triggerGlobalScreenShake(shakeInt, shakeDur);

            // 8-Way Royal Crescent Whirlwind VFX (ALWAYS displays on landing)
            this.activeVisualEffects.push({
              type: 'queen_whirlwind',
              x: troop.x,
              y: troop.y,
              timer: 24,
              maxTimer: 24
            });

            // Concentric Shockwave Ring (Rule 26) (ALWAYS displays on landing)
            this.activeVisualEffects.push({
              type: 'knight_shockwave',
              x: troop.x,
              y: troop.y,
              radius: aoeRadius,
              timer: 24,
              maxTimer: 24
            });

            // Find all valid enemies within large Queen AOE radius
            const validTargets = [];
            if (typeof state !== 'undefined' && Array.isArray(state.fighters)) {
              for (const ent of state.fighters) {
                if (!ent || ent.dead || ent.hp <= 0 || ent === this || (typeof this.isTeammate === 'function' && this.isTeammate(ent)) || ent.owner === this) continue;
                const d = Math.hypot(ent.x - troop.x, ent.y - troop.y);
                if (d <= aoeRadius + (ent.r || 25)) {
                  validTargets.push(ent);
                }
              }
            } else if (opponent && !opponent.dead) {
              const d = Math.hypot(opponent.x - troop.x, opponent.y - troop.y);
              if (d <= aoeRadius + (opponent.r || 25)) {
                validTargets.push(opponent);
              }
            }

            for (const target of validTargets) {
              if (this._isChessMinionTarget(target)) {
                if (this._captureEnemyChessMinion(target)) {
                  spawnFloatingText(target.x, target.y - 15, `${target.name || target.type || 'MINION'} CAPTURED!`, '#38BDF8');
                }
                continue;
              }

              target.takeDamage?.(cfg.slashDmg, this);
              target.applyHitStun?.(16);

              // 1. Knight Slow Debuff (65% movement speed reduction)
              if (typeof target.applySlow === 'function') {
                target.applySlow(slowDur, slowMult, { isQueenSlow: true });
              } else if (target.statusEffects && typeof target.statusEffects.applySlow === 'function') {
                target.statusEffects.applySlow(slowDur, slowMult, { isQueenSlow: true });
              }

              // 2. Rook Stun Debuff (Paralyze / Stun)
              if (typeof target.applyParalyze === 'function') {
                target.applyParalyze(stunDur);
              } else if (typeof target.applyHitStun === 'function') {
                target.applyHitStun(stunDur);
              }
              if (target.statusEffects && typeof target.statusEffects.applyParalyze === 'function') {
                target.statusEffects.applyParalyze(stunDur);
              }

              // 3. Bishop Bleed Debuff (Continuous bleeding damage over 3s)
              if (typeof target.applyBleed === 'function') {
                target.applyBleed(this, bleedDur, bleedDmg, bleedInt);
              } else if (target.statusEffects && typeof target.statusEffects.applyBleed === 'function') {
                target.statusEffects.applyBleed(this, bleedDur, bleedDmg, bleedInt);
              }

              // 4. Rook Radial Knockback Blast
              const radialAngle = Math.atan2(target.y - troop.y, target.x - troop.x);
              const effAngle = (target.x === troop.x && target.y === troop.y) ? (this.gunAngle || 0) : radialAngle;
              if (typeof target.applyKnockback === 'function') {
                target.applyKnockback(Math.cos(effAngle) * knockbackImpulse, Math.sin(effAngle) * knockbackImpulse);
              } else {
                target.vx = (target.vx || 0) + Math.cos(effAngle) * knockbackImpulse;
                target.vy = (target.vy || 0) + Math.sin(effAngle) * knockbackImpulse;
              }

              spawnFloatingText(target.x, target.y - 20, `QUEEN CHECKMATE! -${cfg.slashDmg} (STUN+SLOW+BLEED)`, '#EC4899');
            }
          } else if (this._isChessMinionTarget(attackTarget)) {
            const hitDist = Math.hypot(attackTarget.x - troop.x, attackTarget.y - troop.y);
            if (this._isEnemyChessTarget(attackTarget) && hitDist <= troop.radius + (attackTarget.r || 25) + 35) {
              if (this._captureEnemyChessMinion(attackTarget)) {
                if (troop.type === 'pawn') this._recordPawnDamage(troop);
                spawnFloatingText(attackTarget.x, attackTarget.y - 15, `${attackTarget.name || attackTarget.type || 'MINION'} CAPTURED!`, '#38BDF8');
              }
            }
          } else if (attackTarget && !attackTarget.dead) {
            const opponent = attackTarget;
            // ── Pawn, Bishop, Rook: Melee-range hit check (must land close to opponent) ──
            const hitDist = Math.hypot(opponent.x - troop.x, opponent.y - troop.y);
            if (hitDist <= troop.radius + (opponent.r || 25) + 35) {
              switch (troop.type) {
                case 'pawn':
                  {
                    const previousHp = opponent.hp;
                    const damageApplied = opponent.takeDamage?.(cfg.captureDmg, this);
                    if (damageApplied === true || (Number.isFinite(previousHp) && Number.isFinite(opponent.hp) && opponent.hp < previousHp)) {
                      this._recordPawnDamage(troop);
                    }
                  }
                  opponent.applyHitStun?.(cfg.captureStun || 10);
                  spawnFloatingText(opponent.x, opponent.y - 15, `PAWN CAPTURE! ${cfg.captureDmg}`, '#38BDF8');
                  this.activeVisualEffects.push({
                    type: 'pawn_thrust',
                    startX: troop.startTile.x,
                    startY: troop.startTile.y,
                    endX: troop.x,
                    endY: troop.y,
                    timer: 10,
                    maxTimer: 10
                  });
                  break;

                case 'bishop': {
                  opponent.takeDamage?.(cfg.laserDmg, this);
                  opponent.applyHitStun?.(12);

                  // Apply Bleed Debuff
                  const bleedDur = cfg.bleedDuration || 150;
                  const bleedDmg = cfg.bleedDmgPerTick || 4;
                  const bleedInt = cfg.bleedInterval || 25;
                  if (typeof opponent.applyBleed === 'function') {
                    opponent.applyBleed(this, bleedDur, bleedDmg, bleedInt);
                  } else if (opponent.statusEffects && typeof opponent.statusEffects.applyBleed === 'function') {
                    opponent.statusEffects.applyBleed(this, bleedDur, bleedDmg, bleedInt);
                  }

                  spawnFloatingText(opponent.x, opponent.y - 16, `BISHOP BLEED! -${cfg.laserDmg}`, '#EF4444');
                  this.activeVisualEffects.push({
                    type: 'bishop_slash',
                    x: troop.x,
                    y: troop.y,
                    angle: Math.atan2(troop.targetTile.y - troop.startTile.y, troop.targetTile.x - troop.startTile.x),
                    timer: 14,
                    maxTimer: 14
                  });
                  break;
                }

                case 'rook': {
                  opponent.takeDamage?.(cfg.laserDmg, this);

                  // Apply strong Knockback Impulse
                  const pushAngle = Math.atan2(troop.targetTile.y - troop.startTile.y, troop.targetTile.x - troop.startTile.x);
                  const knockbackImpulse = cfg.knockbackImpulse || 18.0;
                  if (typeof opponent.applyKnockback === 'function') {
                    opponent.applyKnockback(Math.cos(pushAngle) * knockbackImpulse, Math.sin(pushAngle) * knockbackImpulse);
                  } else {
                    opponent.vx = (opponent.vx || 0) + Math.cos(pushAngle) * knockbackImpulse;
                    opponent.vy = (opponent.vy || 0) + Math.sin(pushAngle) * knockbackImpulse;
                  }

                  // Apply Stun Debuff (Paralyze / Stun)
                  const stunDur = cfg.stunDuration || 45;
                  if (typeof opponent.applyParalyze === 'function') {
                    opponent.applyParalyze(stunDur);
                  } else if (typeof opponent.applyHitStun === 'function') {
                    opponent.applyHitStun(stunDur);
                  }
                  if (opponent.statusEffects && typeof opponent.statusEffects.applyParalyze === 'function') {
                    opponent.statusEffects.applyParalyze(stunDur);
                  }

                  spawnFloatingText(opponent.x, opponent.y - 18, `ROOK STUN! -${cfg.laserDmg}`, '#FBBF24');
                  triggerGlobalScreenShake(3.0, 6);
                  audioSystem.playSFX('shiro_rook_ram', this._getSoundVolume('rookRam', 0.90));
                  this.activeVisualEffects.push({
                    type: 'rook_ram',
                    x: troop.x,
                    y: troop.y,
                    timer: 16,
                    maxTimer: 16
                  });
                  break;
                }
              }
            }
          }
        }
        continue;
      }

      // 5. Stationary Idle Minion Lifecycle (Summon & Attack Cooldown Ticks)
      if (troop.isMinion) {
        if (troop.summonTimer && troop.summonTimer > 0) {
          troop.summonTimer--;
          if (troop.summonTimer <= 0) {
            troop.isSummoning = false;
          }
        }
        if (!troop.isAttacking && troop.attackCooldown > 0) {
          troop.attackCooldown--;
        }
      }
    }

    // 6. Authentic Chess 1-by-1 Turn Engine:
    // Only ONE troop is permitted to move/attack at a time across the entire board!
    // Never execute attacks while any troop is actively attacking or summoning!
    const isAnyTroopAttacking = this.activeMinions.some(m => m.isMinion && ((m.isAttacking && m.moveTimer > 0) || (m.isTelegraphing && m.telegraphTimer > 0)));
    const isAnyTroopSummoning = this.activeMinions.some(m => m.isMinion && (m.isSummoning || (m.summonTimer && m.summonTimer > 0)));
    if (!isAnyTroopAttacking && !isAnyTroopSummoning && this.chessTurnCooldown <= 0 && opponent && !opponent.dead && arena) {
      this._selectAndExecuteNextChessMove(opponent, arena);
    }
  }

  // ─────────────────────────────────────────────
  // Authentic Chess 1-by-1 Move Selector
  // Evaluates all idle troops, picks the single highest priority move, and executes it.
  // ─────────────────────────────────────────────
  _selectAndExecuteNextChessMove(opponent, arena) {
    if (!this.activeMinions || !arena) return;

    // Check if any troop is still materializing/ascending onto its square
    if (this.activeMinions.some(m => m.isMinion && (m.isSummoning || (m.summonTimer && m.summonTimer > 0)))) {
      return;
    }

    const targets = this._getChessAttackTargets(opponent, arena);
    if (targets.length === 0) return;

    const cols = ARENA_TILE_COUNT;
    const rows = ARENA_TILE_COUNT;
    const tileW = arena.width / cols;
    const tileH = arena.height / rows;
    const arenaX = arena.x;
    const arenaY = arena.y;

    let bestCandidate = null;
    let bestScore = -1;

    for (const troop of this.activeMinions) {
      if (!troop.isMinion || troop.dead || troop.hp <= 0 || troop.isAttacking || troop.isTelegraphing || troop.isSummoning || (troop.summonTimer && troop.summonTimer > 0) || troop.attackCooldown > 0) {
        continue;
      }

      const myCol = troop.tileCol !== undefined ? troop.tileCol : Math.max(0, Math.min(cols - 1, Math.floor((troop.x - arenaX) / tileW)));
      const myRow = troop.tileRow !== undefined ? troop.tileRow : Math.max(0, Math.min(rows - 1, Math.floor((troop.y - arenaY) / tileH)));

      const troopCfg = shiroConfig.troops[troop.type] || {};
      for (const attackTarget of targets) {
        const targetCol = Math.max(0, Math.min(cols - 1, Math.floor((attackTarget.x - arenaX) / tileW)));
        const targetRow = Math.max(0, Math.min(rows - 1, Math.floor((attackTarget.y - arenaY) / tileH)));
        const dCol = Math.abs(targetCol - myCol);
        const dRow = Math.abs(targetRow - myRow);
        let isTargetTile = false;
        let piecePriority = 10;

        switch (troop.type) {
          case 'pawn':
            isTargetTile = (dCol === 1 && dRow === 1) && !this._isTileOccupied(targetCol, targetRow, troop, arena, attackTarget);
            piecePriority = 10;
            break;

          case 'knight':
            isTargetTile = ((dCol === 1 && dRow === 2) || (dCol === 2 && dRow === 1)) && !this._isTileOccupied(targetCol, targetRow, troop, arena, attackTarget);
            piecePriority = 20;
            break;

          case 'bishop':
            isTargetTile = (dCol === dRow && dCol > 0) && this._isPathClear(myCol, myRow, targetCol, targetRow, troop, attackTarget, arena);
            piecePriority = 30;
            break;

          case 'rook':
            isTargetTile = ((targetCol === myCol || targetRow === myRow) && !(targetCol === myCol && targetRow === myRow)) && this._isPathClear(myCol, myRow, targetCol, targetRow, troop, attackTarget, arena);
            piecePriority = 40;
            break;

          case 'queen':
            isTargetTile = ((targetCol === myCol || targetRow === myRow || dCol === dRow) && !(targetCol === myCol && targetRow === myRow)) && this._isPathClear(myCol, myRow, targetCol, targetRow, troop, attackTarget, arena);
            piecePriority = 50;
            break;
        }

        if (isTargetTile) {
          const dist = Math.hypot(targetCol - myCol, targetRow - myRow);
          const minionPriority = this._isChessMinionTarget(attackTarget) ? 25 : 0;
          const score = piecePriority * 100 - dist + minionPriority;
          if (score > bestScore) {
            bestScore = score;
            bestCandidate = {
              troop,
              attackTarget,
              myCol,
              myRow,
              targetCol,
              targetRow,
              dCol,
              dRow,
              moveDuration: troopCfg.moveDuration || 10,
              targetX: arenaX + (targetCol + 0.5) * tileW,
              targetY: arenaY + (targetRow + 0.5) * tileH
            };
          }
        }
      }
    }

    if (bestCandidate) {
      const { troop, attackTarget, myCol, myRow, targetCol, targetRow, dCol, dRow, moveDuration, targetX, targetY } = bestCandidate;

      troop.isTelegraphing = true;
      troop.isAttacking = false;
      troop.telegraphTimer = 22;
      troop.telegraphMaxTimer = 22;
      troop.moveDuration = moveDuration;
      troop.startTile = { col: myCol, row: myRow, x: troop.x, y: troop.y };
      troop.targetTile = { col: targetCol, row: targetRow, x: targetX, y: targetY };
      troop.attackTarget = attackTarget;

      if (troop.type === 'knight') {
        let cornerCol = myCol;
        let cornerRow = targetRow;
        if (dCol === 2) {
          cornerCol = targetCol;
          cornerRow = myRow;
        }
        troop.cornerTile = {
          col: cornerCol,
          row: cornerRow,
          x: arenaX + (cornerCol + 0.5) * tileW,
          y: arenaY + (cornerRow + 0.5) * tileH
        };
      }

      this.chessTurnCooldown = 12;
      // Audio: Troop Moving
      audioSystem.playSFX('shiro_troop_move', this._getSoundVolume('troopMove', 0.85));
    }
  }

  // ─────────────────────────────────────────────
  // Main Update Loop
  // ─────────────────────────────────────────────
  update(opponent, ownerIndex, arena) {
    // 0. Update visual effect decay before freeze guard (Rule 25)
    this._updateVisualEffects();

    // 1. Mandatory Freeze & TimeStop Guard (Rule 1.1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

    // Update Living Chess Minions & Projectiles
    this._updateTroopMinions(opponent, arena);

    // Standard Movement Physics & Wall Clamping
    super.update(opponent, ownerIndex, arena);
  }

  // ─────────────────────────────────────────────
  // Rendering Pipeline (Rule 21 Overhead HP & Freeze Timer)
  // ─────────────────────────────────────────────
  drawBody(ctx) {
    drawShiroSkin(ctx, this);
  }

  drawSkin(ctx) {
    drawShiroSkin(ctx, this);
  }

  draw(ctx, opponent) {
    const arena = (typeof state !== 'undefined' && state.arena) || null;

    // 1. Draw Attack Visual Effects (Beams, Shockwaves, Slashes)
    if (this.activeVisualEffects.length > 0 && arena) {
      drawChessAttackVfx(ctx, arena, this.activeVisualEffects);
    }

    // 2. Draw Active Projectiles & Minions (Planted minions registered in state.fighters are drawn depth-sorted by EntityRenderer)
    for (const troop of this.activeMinions) {
      const isDrawnByEntityRenderer = troop.isMinion && typeof state !== 'undefined' && Array.isArray(state.fighters) && state.fighters.includes(troop);
      if (!isDrawnByEntityRenderer) {
        drawChessTroop(ctx, troop);
      }
    }

    // 3. Draw Fighter Body & Skin
    super.draw(ctx, opponent);

    // 4. Mandatory Overhead HP & Freeze Timer (Rule 21)
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
