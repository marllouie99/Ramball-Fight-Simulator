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

import { Fighter, resolveDamageNumberColor } from '../fighter.js';
import { shiroConfig } from '../../configs/characters/shiroConfig.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { ARENA_TILE_COUNT } from '../../systems/arenaTileGrid.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { stopSound, stopSoundBySrc } from '../../systems/soundSystem.js';
import { drawShiroSkin } from '../../graphics/fighters/shiroSkin.js';
import { spawnImpactFlash, spawnSparks } from '../../graphics/particles/sparkEffect.js';
import {
  drawDisboardChessboard,
  drawTroopThreatTiles,
  drawChessTroop,
  drawChessAttackVfx,
  spawnChessTroopShatter,
  drawShiroSpeechBubble
} from '../../graphics/weapons/shiroChessGraphics.js';

export class ShiroFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'shiro';
    this.type = 'shiro';
    this.name = shiroConfig.name || 'Shiro';
    this.displayName = shiroConfig.displayName || '『SHIRO』';
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

    // Passive 3: 『　　』 (Blank) Never Loses & Prediction
    this.blankCooldownMax = shiroConfig.blankCooldown || 480;
    this.blankCooldown = shiroConfig.blankInitialCooldown !== undefined ? shiroConfig.blankInitialCooldown : 120;
    this.blankActiveTimer = 0;
    this.blankActiveMaxTimer = shiroConfig.blankBuffDuration || 240;
    this.blankWindupTimer = 0;
    this.blankWindupMax = shiroConfig.blankVoicelineDuration || 120; // 0:00:02 duration for shiro_troop_buff_voiceline
    this._blankWindupStarted = false;
    this._hasPlayedBlankVoiceline = false;
    this._blankVoiceHandle = null;

    // Victory Dialogue Speech Bubble & Chat Animation ("Checkmate!")
    this.speechBubble = null;
    this._speechCooldown = 0;
    this._hasSaidWinQuote = false;
    this._hasHandledDefeat = false;
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
    this.blankCooldownMax = shiroConfig.blankCooldown || 480;
    this.blankCooldown = shiroConfig.blankInitialCooldown !== undefined ? shiroConfig.blankInitialCooldown : 120;
    this.blankActiveTimer = 0;
    this.blankActiveMaxTimer = shiroConfig.blankBuffDuration || 240;
    this.blankWindupTimer = 0;
    this.blankWindupMax = shiroConfig.blankVoicelineDuration || 120;
    this._blankWindupStarted = false;
    this._hasPlayedBlankVoiceline = false;
    this._cutOffBlankVoiceline('reset');
    this.speechBubble = null;
    this._speechCooldown = 0;
    this._hasSaidWinQuote = false;
    this._hasHandledDefeat = false;
    if (typeof state !== 'undefined') {
      state._shiroChessboardAlpha = 0;
      state._shiroChessboardAssembleProgress = 0;
      state._shiroChessboardShutdownTimer = 0;
      state._shiroChessboardWasActive = false;
      state._shiroVictoryShutdown = false;
      state._shiroDefeatShutdown = false;
      state._shiroChessboardShutdownStartAlpha = null;
      state._isShiroTroopBuffVoicePlaying = false;
    }
  }

  /**
   * Universal evaluation of whether Shiro is currently afflicted by any stun, hit-stun, CC, or immobility.
   * Does NOT invoke _handleTimeStop() directly to prevent double-ticking fighter cooldowns.
   */
  _isShiroStunned() {
    if (this.hp <= 0 || this.dead) return true;
    if (this.isTargetOfAmbush) return true;
    if ((this.knockbackStunTimer || 0) > 0) return true;
    if ((this.hitStunTimer || 0) > 0) return true;
    if ((this.stunTimer || 0) > 0) return true;
    if ((this.basicAttackHitPauseTimer || 0) > 0) return true;
    if ((this.paralyzeTimer || 0) > 0 || this.isParalyzed) return true;
    if ((this.timeStopTimer || 0) > 0) return true;
    if ((this.freezeTimer || 0) > 0 || (this.iceFreezeTimer || 0) > 0 || this.isFrozen || this.isFrozenBySnowPea || this.isFrozenByInfinity || this.isFrozenByBlueBone) return true;
    if ((this.electricStunTimer || 0) > 0 || (this.crimsonElectrifiedTimer || 0) > 0 || (this.dubstepStunTimer || 0) > 0) return true;
    if (this.isParalyzedByMahito || this.isParalyzedByMahoraga || this.isGrabbedByMahoraga) return true;
    if (this.isPinnedByMaki || this.isChainedByMakima) return true;
    if (this.isWallPinned || this.isWallSlammed || this.isWallPinnedByMakima || this.isCurrentlyWallPinnedByMakima || ((this.makimaWallPinTimer || 0) > 0) || this.isWallPinnedByEscanor || this.isCurrentlyWallPinnedByEscanor || ((this.escanorWallPinTimer || 0) > 0) || this.isCurrentlyWallPinnedByNaoya || ((this.naoyaWallPinTimer || 0) > 0) || this._isFlyingToWallPin) return true;
    if (this.caughtInJohnWickCombo || this.caughtInYujiFlurry || this.caughtInOmniPunch || this.caughtInSaitamaCounter) return true;
    if ((this.ratioHitPauseTimer || 0) > 0) return true;
    if (this.statusEffects && (this.statusEffects.hitStunTimer > 0 || this.statusEffects.paralyzeTimer > 0 || this.statusEffects.timeStopTimer > 0 || this.statusEffects.isParalyzed)) return true;
    if (typeof this.areAttackEffectsSuppressed === 'function' && this.areAttackEffectsSuppressed()) return true;
    return false;
  }

  /**
   * Immediately cuts off Shiro's troop buff voiceline and cancels active prediction windup.
   * Invoked upon any stun, hit-stun, knockback, time-stop, CC, or combat interrupt.
   */
  _cutOffBlankVoiceline(reason = 'stun') {
    const wasPlayingOrWindup = Boolean(this._blankVoiceHandle || this._blankWindupStarted || this.blankWindupTimer > 0);

    if (this._blankVoiceHandle) {
      if (typeof stopSound === 'function') {
        stopSound(this._blankVoiceHandle, true);
      }
      this._blankVoiceHandle = null;
    }

    if (typeof stopSoundBySrc === 'function') {
      stopSoundBySrc('shiro_troop_buff_voiceline', true);
    }

    if (typeof state !== 'undefined') {
      state._isShiroTroopBuffVoicePlaying = false;
    }

    if (this._blankWindupStarted || this.blankWindupTimer > 0) {
      this._blankWindupStarted = false;
      this.blankWindupTimer = 0;
      // Put Passive 3 on cooldown if interrupted mid-windup so it doesn't immediately re-cast without penalty
      this.blankCooldown = Math.max(this.blankCooldown || 0, 180);
      if (wasPlayingOrWindup && typeof spawnFloatingText === 'function') {
        spawnFloatingText(this.x, this.y - this.r - 24, 'INTERRUPTED!', '#EF4444');
      }
    }
  }

  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks?.(forceCancelAll);
    this._cutOffBlankVoiceline('interruptAttacks');
  }

  applyKnockback(vx, vy, stunFrames = 0) {
    super.applyKnockback(vx, vy, stunFrames);
    if (stunFrames > 0 || (this.knockbackStunTimer && this.knockbackStunTimer > 0)) {
      this._cutOffBlankVoiceline('knockbackStun');
    }
  }

  applyHitStun(frames, opts = {}) {
    super.applyHitStun?.(frames, opts);
    if (frames > 0) {
      this._cutOffBlankVoiceline('hitStun');
    }
  }

  applyParalyze(frames, opts = {}) {
    super.applyParalyze?.(frames, opts);
    if (frames > 0) {
      this._cutOffBlankVoiceline('paralyze');
    }
  }

  applyTimeStop(frames) {
    super.applyTimeStop?.(frames);
    if (frames > 0) {
      this._cutOffBlankVoiceline('timeStop');
    }
  }

  takeDamage(amount, attacker, opts = {}) {
    const res = super.takeDamage(amount, attacker, opts);
    if (this._isShiroStunned() || opts?.isHeavy || opts?.isKnockback || opts?.isExplosion || opts?.isStun) {
      this._cutOffBlankVoiceline('takeDamageStun');
    }
    return res;
  }

  onDeath() {
    super.onDeath();
    this._hasHandledDefeat = true;
    this.speechBubble = null;
    this._cutOffBlankVoiceline('death');
    this.destroyAllActiveTroops(true);
    this._triggerDefeatChessboardShutdown();
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
      noHitSound: true,
      suppressHitSound: true,
      suppressDebuffs: true,
      suppressStatusOverlays: true,
      suppressFreezeOverlay: true,
      suppressFreezeTimer: true,
      suppressStunVisual: true,
      suppressParalyzeVisual: true,
      suppressHitFlash: true,
      customHitFlash: true,
      isStatusImmune: true,
      drawStatusOverlays: () => {},
      drawFreezeTimer: () => {},
      drawHealth: () => {},
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
      blankBuffTimer: 0,
      blankBuffMaxTimer: shiroConfig.blankBuffDuration || 240,
      isBuffed: false,
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
        audioSystem.playSFX(shiroConfig.sounds?.troopDestroyed || 'Assets/Sound Effects/Shiro/PermafrostKeepSealMine1.ogg', this._getSoundVolume('troopDestroyed', 0.90));
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
    troop.noHitSound = true;
    troop.suppressHitSound = true;
    troop.suppressDebuffs = true;
    troop.suppressStatusOverlays = true;
    troop.suppressFreezeOverlay = true;
    troop.suppressFreezeTimer = true;
    troop.suppressStunVisual = true;
    troop.suppressParalyzeVisual = true;
    troop.suppressHitFlash = true;
    troop.customHitFlash = true;
    troop.isStatusImmune = true;
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
    troop.drawStatusOverlays = (ctx) => {};
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
      const damageColor = resolveDamageNumberColor(attacker, options, '#EF4444');
      spawnFloatingText(troop.x, troop.y - 14, `-${dmg}`, damageColor);

      if (troop.hp <= 0) {
        troop.hp = 0;
        troop.dead = true;
        spawnFloatingText(troop.x, troop.y - 18, `${troop.type.toUpperCase()} DESTROYED!`, '#EF4444');
        if (!troop._hasShattered) {
          troop._hasShattered = true;
          spawnChessTroopShatter(troop);
          audioSystem.playSFX(shiroConfig.sounds?.troopDestroyed || 'Assets/Sound Effects/Shiro/PermafrostKeepSealMine1.ogg', this._getSoundVolume('troopDestroyed', 0.90));
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

    troop.drawBody = (ctx) => {
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
      const troopCfg = shiroConfig.troops?.[troop.type] || {};
      const summonFrames = troopCfg.summonDuration ?? shiroConfig.troopTiming?.summonDuration ?? shiroConfig.troopSummonDuration ?? 40;
      const summonIdleBuffer = troopCfg.postSummonPause ?? shiroConfig.troopTiming?.postSummonPause ?? shiroConfig.troopPostSummonPause ?? 30;

      troop.isSummoning = true;
      troop.summonTimer = summonFrames;
      troop.summonMaxTimer = summonFrames;
      troop.attackCooldown = summonFrames + summonIdleBuffer;

      // Maintain active Blank Never Loses buff only if this troop was ALREADY buffed upon activation
      if (troop.blankBuffTimer > 0) {
        troop.isBuffed = true;
      } else {
        troop.blankBuffTimer = 0;
        troop.isBuffed = false;
      }

      // Trigger cinematic planting visual effect
      this.activeVisualEffects.push({
        type: 'troop_plant',
        col: col,
        row: row,
        x: troop.x,
        y: troop.y,
        pieceType: troop.type,
        timer: summonFrames,
        maxTimer: summonFrames
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

    // Retain existing Blank buff upon promotion only if this troop was previously buffed
    if (troop.blankBuffTimer > 0) {
      troop.isBuffed = true;
      this.activeVisualEffects.push({
        type: 'blank_troop_buff',
        troop: troop,
        x: troop.x,
        y: troop.y,
        r: troop.r || 16,
        timer: 45,
        maxTimer: 45
      });
    }

    spawnFloatingText(troop.x, troop.y - 20, `PROMOTED: ${promotedConfig.name.toUpperCase()}!`, '#FCD34D');
  }

  // ─────────────────────────────────────────────
  // Minion Update & Chess Behavior Pipeline
  // ─────────────────────────────────────────────
  _updateTroopMinions(opponent, arena) {
    if (this.chessTurnCooldown > 0) this.chessTurnCooldown--;

    // Passive 3 Duration & Cooldown Ticks:
    // Cooldown MUST NOT tick down while the active buff duration is running!
    if (this.blankActiveTimer > 0) {
      this.blankActiveTimer--;
      // Freeze cooldown at maximum until active duration finishes
      this.blankCooldown = this.blankCooldownMax;
      this.blankWindupTimer = 0;
      this._blankWindupStarted = false;
    } else if (this.blankWindupTimer > 0) {
      // Windup / Voiceline Phase (0:00:02 / 120 frames): Audio is playing, preparing troop buff
      this.blankWindupTimer--;
      this.blankCooldown = 0;
    } else if (this.blankCooldown > 0) {
      // Cooldown only ticks down after the active duration has fully ended
      this.blankCooldown--;
    }

    // Retrieval of active living minions currently stationed on the board
    const getActiveTroops = () => {
      const troopSet = new Set();
      if (Array.isArray(this.activeMinions)) {
        for (const m of this.activeMinions) {
          if (m && m.isMinion && !m.dead && !m.isDead && (m.hp || 0) > 0) {
            troopSet.add(m);
          }
        }
      }
      if (typeof state !== 'undefined' && Array.isArray(state.fighters)) {
        for (const f of state.fighters) {
          if (f && f !== this && (f.owner === this || f.owner === this.fighterIndex) && (f.isChessTroop || f.isChessMinion || f.isMinion) && f.isMinion && !f.dead && !f.isDead && (f.hp || 0) > 0) {
            troopSet.add(f);
          }
        }
      }
      return Array.from(troopSet);
    };

    // Check if match/round or fight is over (never trigger Passive 3 voiceline or buff after match ends)
    const isMatchActive = typeof state === 'undefined' || !state.gameState || state.gameState === 'playing';
    const isMatchEnded = typeof state !== 'undefined' && (
      state.gameState === 'roundEnd' ||
      state.gameState === 'matchEnd' ||
      state.gameState === 'champion' ||
      Boolean(state.matchWinner) ||
      Boolean(state.roundWinner)
    );
    const isOpponentDefeated = opponent && (opponent.dead || (opponent.hp || 0) <= 0);
    const isFightOver = !isMatchActive || isMatchEnded || isOpponentDefeated || this.dead || (this.hp || 0) <= 0;

    // If fight/match is over, cancel any pending voiceline windup immediately
    if (isFightOver) {
      if (this._blankWindupStarted) {
        this._blankWindupStarted = false;
        this.blankWindupTimer = 0;
      }
      if (this._blankVoiceHandle) {
        if (typeof stopSound === 'function') stopSound(this._blankVoiceHandle);
        this._blankVoiceHandle = null;
      }
      if (typeof state !== 'undefined') state._isShiroTroopBuffVoicePlaying = false;
    }

    // Passive 3: 『　　』 (Blank) Never Loses & Prediction Activation
    if (!isFightOver && this.blankCooldown <= 0 && this.blankActiveTimer <= 0 && this.isSkillEnabled(shiroConfig.enableBlankNeverLoses, true) && !this.dead && (this.hp || 0) > 0) {
      const activeLivingTroops = getActiveTroops();
      if (activeLivingTroops.length > 0) {
        if (this.blankWindupTimer > 0) {
          // In the 2-second voiceline windup phase — calculating!
          if (this.blankWindupTimer % 15 === 0) {
            spawnSparks(this.x, this.y, 4, 'gold', '#FCD34D');
          }
        } else if (this._blankWindupStarted) {
          // 0:00:02 voiceline finished! Unleash the troop buff!
          this._blankWindupStarted = false;
          this.blankCooldown = this.blankCooldownMax;
          this.blankActiveTimer = shiroConfig.blankBuffDuration || 240;
          this.blankActiveMaxTimer = shiroConfig.blankBuffDuration || 240;
          this._blankVoiceHandle = null;
          if (typeof state !== 'undefined') state._isShiroTroopBuffVoicePlaying = false;

          // Shiro Visuals, Voice & Screen Shake
          spawnFloatingText(this.x, this.y - this.r - 24, '『　　』 NEVER LOSES!', '#FCD34D');
          audioSystem.playSFX(shiroConfig.sounds?.blankBuff || 'Assets/Sound Effects/Shiro/BookSynthFirstTier.ogg', this._getSoundVolume('blankBuff', 0.90));
          triggerGlobalScreenShake(3.0, 8);
          spawnImpactFlash(this.x, this.y, 18, '#FCD34D');
          spawnSparks(this.x, this.y, 14, 'gold', '#FCD34D');

          // Apply Golden Buff & Trigger Buff Animation strictly to active living troops already present on the board
          for (const troop of activeLivingTroops) {
            troop.blankBuffTimer = shiroConfig.blankBuffDuration || 240;
            troop.blankBuffMaxTimer = shiroConfig.blankBuffDuration || 240;
            troop.isBuffed = true;
            troop._blankBuffVfxPlayed = true;
            spawnFloatingText(troop.x, troop.y - (troop.r || 16) - 16, '👑 PREDICTION!', '#FCD34D');
            spawnSparks(troop.x, troop.y, 8, 'gold', '#FCD34D');

            this.activeVisualEffects.push({
              type: 'blank_troop_buff',
              troop: troop,
              x: troop.x,
              y: troop.y,
              r: troop.r || 16,
              timer: 45,
              maxTimer: 45
            });
          }
        } else {
          // Guard: If Shiro is stunned or unable to act, do not start voiceline or windup
          if (this._isShiroStunned()) {
            return;
          }

          // Shiro is about to use Passive 3!
          // Trigger the 0:00:02 voiceline audio!
          this._blankWindupStarted = true;
          this.blankWindupTimer = shiroConfig.blankVoicelineDuration || 120; // 0:00:02 (120 frames at 60 FPS)
          this.blankWindupMax = shiroConfig.blankVoicelineDuration || 120;

          // STRICT SINGLE-PLAY & DEDUPLICATION: Only 1 of this voiceline plays per match/round! Avoid dupes!
          const isGlobalVoicePlaying = typeof state !== 'undefined' && Boolean(state._isShiroTroopBuffVoicePlaying);
          if (!this._hasPlayedBlankVoiceline && !isGlobalVoicePlaying) {
            this._hasPlayedBlankVoiceline = true;
            if (typeof state !== 'undefined') state._isShiroTroopBuffVoicePlaying = true;

            const voiceSrc = shiroConfig.sounds?.blankVoiceline || 'Assets/Sound Effects/Shiro/shiro_troop_buff_voiceline.mp3';
            this._blankVoiceHandle = audioSystem.playSFX(voiceSrc, this._getSoundVolume('blankVoiceline', 1.0), 1.0, 0, 0, () => {
              if (typeof state !== 'undefined') state._isShiroTroopBuffVoicePlaying = false;
              this._blankVoiceHandle = null;
            });
          }

          spawnFloatingText(this.x, this.y - this.r - 24, '『　　』 PREDICTING...', '#FCD34D');
          spawnImpactFlash(this.x, this.y, 14, '#FCD34D');
          spawnSparks(this.x, this.y, 8, 'gold', '#FCD34D');
        }
      } else {
        // No living troops on board — cancel windup if started
        if (this._blankWindupStarted) {
          this._cutOffBlankVoiceline('noLivingTroops');
        }
      }
    }

    if (this.blankActiveTimer <= 0) {
      // Cooldown phase: reset animation play guards so future activations trigger fresh animations
      for (const troop of this.activeMinions || []) {
        troop._blankBuffVfxPlayed = false;
      }
    }

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
          audioSystem.playSFX(shiroConfig.sounds?.troopDestroyed || 'Assets/Sound Effects/Shiro/PermafrostKeepSealMine1.ogg', this._getSoundVolume('troopDestroyed', 0.90));
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
            let finalThrowDmg = troop.damage;
            const isBuffedThrow = Boolean(troop.blankBuffTimer > 0);
            if (isBuffedThrow) {
              finalThrowDmg = Math.round(finalThrowDmg * (shiroConfig.blankBuffDamageMultiplier || 1.35));
            }
            opponent.takeDamage?.(finalThrowDmg, this);
            const hitLabel = isBuffedThrow ? `${finalThrowDmg} (PREDICTED)` : `${troop.damage}`;
            const hitColor = isBuffedThrow ? '#FCD34D' : '#38BDF8';
            spawnFloatingText(troop.x, troop.y - 12, hitLabel, hitColor);
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
          const cfg = shiroConfig.troops?.[troop.type] || {};
          const postAttackCooldown = cfg.postAttackCooldown ?? shiroConfig.troopTiming?.postAttackCooldown ?? shiroConfig.troopPostAttackCooldown ?? 40;
          troop.attackCooldown = postAttackCooldown;
          this.chessTurnCooldown = cfg.turnCooldown ?? shiroConfig.troopTiming?.turnCooldown ?? shiroConfig.turnCooldown ?? 14;

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

              const previousHp = target.hp;
              let finalLeapDmg = cfg.leapDmg;
              const isBuffedHit = Boolean(troop.blankBuffTimer > 0);
              if (isBuffedHit) {
                finalLeapDmg = Math.round(finalLeapDmg * (shiroConfig.blankBuffDamageMultiplier || 1.35));
              }
              const dmgResult = target.takeDamage?.(finalLeapDmg, this);
              const damageLanded = (dmgResult === true || (typeof dmgResult === 'number' && dmgResult > 0) || (Number.isFinite(previousHp) && Number.isFinite(target.hp) && target.hp < previousHp));

              if (damageLanded) {
                target.applyHitStun?.(cfg.leapStun || 16);

                // Apply Slow Debuff
                if (typeof target.applySlow === 'function') {
                  target.applySlow(slowDur, slowMult, { isKnightSlow: true });
                } else if (target.statusEffects && typeof target.statusEffects.applySlow === 'function') {
                  target.statusEffects.applySlow(slowDur, slowMult, { isKnightSlow: true });
                }

                const hitLabel = isBuffedHit ? `KNIGHT SLAM! -${finalLeapDmg} (PREDICTED)` : `KNIGHT SLAM! -${cfg.leapDmg} (SLOW)`;
                const hitColor = isBuffedHit ? '#FCD34D' : '#F59E0B';
                spawnFloatingText(target.x, target.y - 18, hitLabel, hitColor);
              }
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

              const previousHp = target.hp;
              let finalSlashDmg = cfg.slashDmg;
              const isBuffedHit = Boolean(troop.blankBuffTimer > 0);
              if (isBuffedHit) {
                finalSlashDmg = Math.round(finalSlashDmg * (shiroConfig.blankBuffDamageMultiplier || 1.35));
              }
              const dmgResult = target.takeDamage?.(finalSlashDmg, this);
              const damageLanded = (dmgResult === true || (typeof dmgResult === 'number' && dmgResult > 0) || (Number.isFinite(previousHp) && Number.isFinite(target.hp) && target.hp < previousHp));

              if (damageLanded) {
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

                const hitLabel = isBuffedHit ? `QUEEN CHECKMATE! -${finalSlashDmg} (CRIT/PREDICTED)` : `QUEEN CHECKMATE! -${cfg.slashDmg} (STUN+SLOW+BLEED)`;
                const hitColor = isBuffedHit ? '#FCD34D' : '#EC4899';
                spawnFloatingText(target.x, target.y - 20, hitLabel, hitColor);
              }
            }
          } else if (troop.type === 'pawn') {
            const aoeRadius = cfg.aoeRadius || cfg.captureRange || 46;
            const aoeDmg = cfg.captureDmg || cfg.aoeDmg || 14;
            const aoeStun = cfg.captureStun || cfg.aoeStun || 10;
            const shakeInt = cfg.screenShakeIntensity || 2.5;
            const shakeDur = cfg.screenShakeDuration || 6;

            triggerGlobalScreenShake(shakeInt, shakeDur);
            audioSystem.playSFX('attack_fleshhit', this._getSoundVolume('fleshHit', 0.80));

            // Thrust vector visual effect
            this.activeVisualEffects.push({
              type: 'pawn_thrust',
              startX: troop.startTile ? troop.startTile.x : troop.x,
              startY: troop.startTile ? troop.startTile.y : troop.y,
              endX: troop.x,
              endY: troop.y,
              timer: 14,
              maxTimer: 14
            });

            // Radial mint/cyan AOE wave visual effect (Rule 26)
            this.activeVisualEffects.push({
              type: 'pawn_shockwave',
              x: troop.x,
              y: troop.y,
              radius: aoeRadius,
              timer: 16,
              maxTimer: 16
            });

            // Query all valid enemies in the Pawn AOE zone
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
                  this._recordPawnDamage(troop);
                  spawnFloatingText(target.x, target.y - 15, `${target.name || target.type || 'MINION'} CAPTURED!`, '#38BDF8');
                }
                continue;
              }

              const previousHp = target.hp;
              let finalAoeDmg = aoeDmg;
              const isBuffedHit = Boolean(troop.blankBuffTimer > 0);
              if (isBuffedHit) {
                finalAoeDmg = Math.round(finalAoeDmg * (shiroConfig.blankBuffDamageMultiplier || 1.35));
              }
              const damageApplied = target.takeDamage?.(finalAoeDmg, this);
              if (damageApplied === true || (Number.isFinite(previousHp) && Number.isFinite(target.hp) && target.hp < previousHp)) {
                this._recordPawnDamage(troop);
              }
              target.applyHitStun?.(aoeStun);
              const hitLabel = isBuffedHit ? `PAWN AOE! -${finalAoeDmg} (PREDICTED)` : `PAWN AOE! -${aoeDmg}`;
              const hitColor = isBuffedHit ? '#FCD34D' : '#38BDF8';
              spawnFloatingText(target.x, target.y - 15, hitLabel, hitColor);
            }
          } else if (this._isChessMinionTarget(attackTarget)) {
            const hitDist = Math.hypot(attackTarget.x - troop.x, attackTarget.y - troop.y);
            if (this._isEnemyChessTarget(attackTarget) && hitDist <= troop.radius + (attackTarget.r || 25) + 35) {
              if (this._captureEnemyChessMinion(attackTarget)) {
                spawnFloatingText(attackTarget.x, attackTarget.y - 15, `${attackTarget.name || attackTarget.type || 'MINION'} CAPTURED!`, '#38BDF8');
              }
            }
          } else if (attackTarget && !attackTarget.dead) {
            const opponent = attackTarget;
            // ── Bishop, Rook: Melee-range hit check (must land close to opponent) ──
            const hitDist = Math.hypot(opponent.x - troop.x, opponent.y - troop.y);
            if (hitDist <= troop.radius + (opponent.r || 25) + 35) {
              switch (troop.type) {
                case 'bishop': {
                  const previousHp = opponent.hp;
                  let finalLaserDmg = cfg.laserDmg;
                  const isBuffedHit = Boolean(troop.blankBuffTimer > 0);
                  if (isBuffedHit) {
                    finalLaserDmg = Math.round(finalLaserDmg * (shiroConfig.blankBuffDamageMultiplier || 1.35));
                  }
                  const dmgResult = opponent.takeDamage?.(finalLaserDmg, this);
                  const damageLanded = (dmgResult === true || (typeof dmgResult === 'number' && dmgResult > 0) || (Number.isFinite(previousHp) && Number.isFinite(opponent.hp) && opponent.hp < previousHp));

                  if (damageLanded) {
                    opponent.applyHitStun?.(12);

                    // Apply Bleed Debuff strictly when damage successfully lands on player/target
                    const bleedDur = cfg.bleedDuration || 150;
                    const bleedDmg = cfg.bleedDmgPerTick || 4;
                    const bleedInt = cfg.bleedInterval || 25;
                    if (typeof opponent.applyBleed === 'function') {
                      opponent.applyBleed(this, bleedDur, bleedDmg, bleedInt);
                    } else if (opponent.statusEffects && typeof opponent.statusEffects.applyBleed === 'function') {
                      opponent.statusEffects.applyBleed(this, bleedDur, bleedDmg, bleedInt);
                    }

                    const hitLabel = isBuffedHit ? `BISHOP BLEED! -${finalLaserDmg} (CRIT/PREDICTED)` : `BISHOP BLEED! -${cfg.laserDmg}`;
                    const hitColor = isBuffedHit ? '#FCD34D' : '#EF4444';
                    spawnFloatingText(opponent.x, opponent.y - 16, hitLabel, hitColor);
                  }
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
                  const previousHp = opponent.hp;
                  let finalRamDmg = cfg.laserDmg;
                  const isBuffedHit = Boolean(troop.blankBuffTimer > 0);
                  if (isBuffedHit) {
                    finalRamDmg = Math.round(finalRamDmg * (shiroConfig.blankBuffDamageMultiplier || 1.35));
                  }
                  const dmgResult = opponent.takeDamage?.(finalRamDmg, this);
                  const damageLanded = (dmgResult === true || (typeof dmgResult === 'number' && dmgResult > 0) || (Number.isFinite(previousHp) && Number.isFinite(opponent.hp) && opponent.hp < previousHp));

                  if (damageLanded) {
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

                    const hitLabel = isBuffedHit ? `ROOK STUN! -${finalRamDmg} (CRIT/PREDICTED)` : `ROOK STUN! -${cfg.laserDmg}`;
                    const hitColor = isBuffedHit ? '#FCD34D' : '#FBBF24';
                    spawnFloatingText(opponent.x, opponent.y - 18, hitLabel, hitColor);
                    triggerGlobalScreenShake(3.0, 6);
                    audioSystem.playSFX('shiro_rook_ram', this._getSoundVolume('rookRam', 0.90));
                  }
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

      // 5. Stationary Idle Minion Lifecycle (Summon, Attack & Buff Cooldown Ticks)
      if (troop.isMinion) {
        if (troop.blankBuffTimer && troop.blankBuffTimer > 0) {
          troop.blankBuffTimer--;
          troop.isBuffed = (troop.blankBuffTimer > 0);
        }
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

      const troopCfg = shiroConfig.troops?.[troop.type] || {};
      const telegraphFrames = troopCfg.telegraphDuration ?? shiroConfig.troopTiming?.telegraphDuration ?? shiroConfig.troopTelegraphDuration ?? 22;

      troop.isTelegraphing = true;
      troop.isAttacking = false;
      troop.telegraphTimer = telegraphFrames;
      troop.telegraphMaxTimer = telegraphFrames;
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

      this.chessTurnCooldown = troopCfg.turnCooldown ?? shiroConfig.troopTiming?.turnCooldown ?? shiroConfig.turnCooldown ?? 12;
      // Audio: Troop Moving
      audioSystem.playSFX('shiro_troop_move', this._getSoundVolume('troopMove', 0.85));
    }
  }

  // ─────────────────────────────────────────────
  // Speech & Victory Chat Animation ("Checkmate!")
  // ─────────────────────────────────────────────
  /**
   * Triggers an anime dialogue speech bubble above Shiro with typewriter text animation.
   */
  speak(text, duration = 180, force = false) {
    if (!text) return;
    if (this.dead || this.hp <= 0 || (typeof state !== 'undefined' && state._shiroDefeatShutdown)) return;
    if (!force && this._speechCooldown > 0 && this.speechBubble && this.speechBubble.timer > 0) return;
    this.speechBubble = {
      text: '',
      fullText: String(text),
      charIndex: 0,
      timer: duration,
      maxTimer: duration,
      charTimer: 0,
      blipInterval: 3
    };
    this._speechCooldown = duration + 35;
    // Play Shiro's iconic FingerSnap SFX on dialogue trigger
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
      audioSystem.playSFX('Assets/Sound Effects/Shiro/FingerSnap.ogg', 0.95);
    }
  }

  /**
   * Updates typewriter reveal progress and speech blip SFX.
   */
  _updateSpeech() {
    if (this.dead || this.hp <= 0 || (typeof state !== 'undefined' && state._shiroDefeatShutdown)) {
      this.speechBubble = null;
      return;
    }
    if (this._speechCooldown > 0) this._speechCooldown--;
    if (!this.speechBubble || this.speechBubble.timer <= 0) return;
    this.speechBubble.timer--;
    if (this.speechBubble.charIndex < this.speechBubble.fullText.length) {
      this.speechBubble.charTimer++;
      if (this.speechBubble.charTimer >= this.speechBubble.blipInterval) {
        this.speechBubble.charTimer = 0;
        this.speechBubble.charIndex = Math.min(this.speechBubble.fullText.length, this.speechBubble.charIndex + 1);
        this.speechBubble.text = this.speechBubble.fullText.slice(0, this.speechBubble.charIndex);
        const char = this.speechBubble.fullText[this.speechBubble.charIndex - 1];
        if (char && char !== ' ' && this.speechBubble.charIndex % 2 === 0) {
          if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
            audioSystem.playSFX('Assets/Sound Effects/Sans/SansSpeak.ogg', 0.40);
          }
        }
      }
    }
  }

  /**
   * Detects match/round victory or defeat to handle quotes, troop cleanup, and chessboard shutdown.
   */
  _checkMatchVictory(opponent) {
    if (this._hasHandledDefeat) return;

    let isShiroWinner = false;
    let isShiroDefeated = false;

    if (this.hp <= 0 || this.dead) {
      isShiroDefeated = true;
    } else if (typeof state !== 'undefined') {
      if (state.matchWinner === this || state.roundWinner === this) {
        isShiroWinner = true;
      } else if ((state.matchWinner || state.roundWinner) && state.getFighterTeam && typeof state.getFighterTeam === 'function' && Array.isArray(state.fighters)) {
        const winner = state.matchWinner || state.roundWinner;
        const winnerIdx = state.fighters.indexOf(winner);
        const myIdx = state.fighters.indexOf(this);
        if (winnerIdx !== -1 && myIdx !== -1 && state.getFighterTeam(winnerIdx) === state.getFighterTeam(myIdx)) {
          isShiroWinner = true;
        } else {
          isShiroDefeated = true;
        }
      } else if (state.matchWinner && state.matchWinner !== this) {
        isShiroDefeated = true;
      } else if (state.roundWinner && state.roundWinner !== this) {
        isShiroDefeated = true;
      } else if (state.gameState === 'roundEnd' || state.gameState === 'matchEnd') {
        const opponentDefeated = !opponent || opponent.dead || opponent.hp <= 0;
        if (opponentDefeated) {
          isShiroWinner = true;
        } else {
          isShiroDefeated = true;
        }
      }
    }

    if (isShiroDefeated) {
      this._hasHandledDefeat = true;
      this.speechBubble = null;
      this._blankWindupStarted = false;
      this.blankWindupTimer = 0;
      this.destroyAllActiveTroops(true);
      this._triggerDefeatChessboardShutdown();
      return;
    }

    if (isShiroWinner && !this._hasSaidWinQuote) {
      // Mandatory sequence: faah.mp3 (120f) -> YOU WIN! announcer (80f) -> shutdown voiceline!
      const endTimer = (typeof state !== 'undefined' && (
        state.gameState === 'matchEnd' 
          ? (state.matchEndTimer || 0) 
          : (state.roundEndTimer || state.matchEndTimer || 0)
      )) || 0;
      if (endTimer < 200) {
        return; // Wait for faah.mp3 (120f) and YOU WIN! announcer (80f) to finish completely before shutdown voiceline!
      }
      this._hasSaidWinQuote = true;
      this.speak('Checkmate!', 180, true);
      this._triggerVictoryChessboardShutdown();
    }
  }

  /**
   * Destroys and shatters all active living chess troops on the arena tiles.
   */
  destroyAllActiveTroops(playSfx = true) {
    let shatteredAny = false;

    if (this.activeMinions && Array.isArray(this.activeMinions)) {
      for (let i = this.activeMinions.length - 1; i >= 0; i--) {
        const troop = this.activeMinions[i];
        if (troop && !troop.dead) {
          troop.hp = 0;
          troop.dead = true;
          if (!troop._hasShattered) {
            troop._hasShattered = true;
            spawnChessTroopShatter(troop);
            shatteredAny = true;
          }
          if (typeof state !== 'undefined' && Array.isArray(state.fighters)) {
            const idx = state.fighters.indexOf(troop);
            if (idx !== -1) state.fighters.splice(idx, 1);
          }
        }
      }
      this.activeMinions.length = 0;
    }

    if (typeof state !== 'undefined' && Array.isArray(state.fighters)) {
      for (let i = state.fighters.length - 1; i >= 0; i--) {
        const f = state.fighters[i];
        if (f && (f.owner === this || f.owner === this.fighterIndex) && (f.isChessTroop || f.isChessMinion) && !f.dead) {
          f.hp = 0;
          f.dead = true;
          if (!f._hasShattered) {
            f._hasShattered = true;
            spawnChessTroopShatter(f);
            shatteredAny = true;
          }
          state.fighters.splice(i, 1);
        }
      }
    }

    if (shatteredAny && playSfx) {
      if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
        const destroySound = shiroConfig.sounds?.troopDestroyed || 'Assets/Sound Effects/Shiro/PermafrostKeepSealMine1.ogg';
        audioSystem.playSFX(destroySound, this._getSoundVolume('troopDestroyed', 0.90));
      }
    }
  }

  /**
   * Triggers the CRT television / game console power-off shutdown animation for the Disboard chessboard on victory.
   */
  _triggerVictoryChessboardShutdown() {
    if (typeof state === 'undefined') return;
    if (this.dead || this.hp <= 0 || state._shiroDefeatShutdown) return;
    state._shiroVictoryShutdown = true;
    const cb = shiroConfig?.chessboard || CONFIG?.shiro?.chessboard || {};
    const SHUTDOWN_DURATION = cb.shutdownDuration ?? 50;

    // Destroy all active troops when the chessboard shuts down
    this.destroyAllActiveTroops(true);

    // Only initiate shutdown if the chessboard was actually active/visible in this match
    if (state._shiroChessboardAlpha > 0.05 || state._shiroChessboardWasActive) {
      state._shiroChessboardShutdownTimer = SHUTDOWN_DURATION;
      state._shiroChessboardShutdownDuration = SHUTDOWN_DURATION;
      state._shiroChessboardShutdownStartAlpha = state._shiroChessboardAlpha || 1.0;
      state._shiroChessboardAssembleProgress = 1.0;
      if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
        const vol = shiroConfig.soundVolumes?.boardShutdown ?? 0.85;
        audioSystem.playSFX('shiro_board_shutdown', vol);
        const voiceVol = shiroConfig.soundVolumes?.boardShutdownVoiceline ?? 1.0;
        const voiceSrc = shiroConfig.sounds?.boardShutdownVoiceline || 'Assets/Sound Effects/Shiro/shiro_chessboard_shutdown_voiceline.mp3';
        audioSystem.playSFX(voiceSrc, voiceVol);
      }
    }
  }

  /**
   * Triggers the CRT television power-off shutdown animation for the Disboard chessboard on defeat.
   * STRICT AUDIO RULE: NEVER play shiro_chessboard_shutdown_voiceline.mp3 or victory quotes on defeat!
   */
  _triggerDefeatChessboardShutdown() {
    if (typeof state === 'undefined') return;
    state._shiroVictoryShutdown = false;
    state._shiroDefeatShutdown = true;
    this.speechBubble = null;
    this._cutOffBlankVoiceline('defeat');

    // Destroy all active troops immediately on defeat
    this.destroyAllActiveTroops(true);

    const cb = shiroConfig?.chessboard || CONFIG?.shiro?.chessboard || {};
    const SHUTDOWN_DURATION = cb.shutdownDuration ?? 50;

    // Only initiate shutdown if the chessboard was actually active/visible in this match
    if ((state._shiroChessboardAlpha > 0.05 || state._shiroChessboardWasActive) && state._shiroChessboardShutdownTimer === 0) {
      state._shiroChessboardShutdownTimer = SHUTDOWN_DURATION;
      state._shiroChessboardShutdownDuration = SHUTDOWN_DURATION;
      state._shiroChessboardShutdownStartAlpha = state._shiroChessboardAlpha || 1.0;
      state._shiroChessboardAssembleProgress = 1.0;
      if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
        const vol = shiroConfig.soundVolumes?.boardShutdown ?? 0.85;
        audioSystem.playSFX('shiro_board_shutdown', vol);
        // STRICT AUDIO SUPPRESSION: NEVER play shiro_chessboard_shutdown_voiceline.mp3 on defeat!
      }
    }
  }

  // ─────────────────────────────────────────────
  // Main Update Loop
  // ─────────────────────────────────────────────
  update(opponent, ownerIndex, arena) {
    // 0. Update visual effect decay before freeze guard (Rule 25)
    this._updateVisualEffects();
    this._updateSpeech();
    this._checkMatchVictory(opponent);

    // If defeated, destroy active troops immediately and trigger defeat chessboard shutdown
    if (this.hp <= 0 || this.dead) {
      this.speechBubble = null;
      this._cutOffBlankVoiceline('defeat');
      if (this.activeMinions && this.activeMinions.length > 0) {
        this.destroyAllActiveTroops(true);
      }
      if (!this._hasHandledDefeat) {
        this._hasHandledDefeat = true;
        this._triggerDefeatChessboardShutdown();
      }
    }

    // 1. Mandatory Freeze & TimeStop Guard (Rule 1.1)
    const isFrozen = this._handleTimeStop();
    const isStunned = isFrozen || this.isTargetOfAmbush || this._isShiroStunned();
    if (isStunned) {
      this._cutOffBlankVoiceline('stunnedDuringUpdate');
      this.interruptAttacks(true);
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

    // 5. Victory Dialogue Speech Bubble ("Checkmate!")
    drawShiroSpeechBubble(ctx, this);
  }
}
