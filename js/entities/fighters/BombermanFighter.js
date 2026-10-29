// ═══════════════════════════════════════════════════════════════════════════
// BOMBER MAN — Fighter Entity Class (js/entities/fighters/BombermanFighter.js)
// Implements:
//  - Tile-Centered Bomb Planting (8x8 Arena Tile Grid exact block centering)
//  - Passive: Bomb Up (1st lay = 1 active bomb; when basic attack CD is up = 2 active bombs;
//             next basic attack CD = 3 active bombs, scaling up to Max. 10)
//  - Skill 1: Fire Up (Increases bomb blast radius up to Max. 10)
//  - Skill 2: Kick (Allows Bomberman to kick his bombs so they travel across the arena and can explode mid-traveling)
//  - Ultimate: Invincible (Immune to incoming enemy attacks while active)
// ═══════════════════════════════════════════════════════════════════════════

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getTileGridInfo, getNearestTileCenter } from '../../systems/arenaTileSystem.js';
import { drawBombermanSkin } from '../../graphics/fighters/bombermanSkin.js';
import {
  spawnAnimePunchImpactFrame,
  spawnImpactFlash,
  spawnSparks,
} from '../../graphics/particles/sparkEffect.js';
import {
  drawPlantedBomb,
  drawBombExplosion,
  drawBombermanPowerupPopup,
  drawBombermanKickEffectSprite,
} from '../../graphics/weapons/bombermanWeaponGraphics.js';

export class BombermanFighter extends Fighter {
  constructor(def = {}) {
    const cfg = CONFIG.bomberman || {};
    super({
      ...def,
      r: cfg.r ?? 25,
      radius: cfg.radius ?? 25,
      hp: def.hp ?? cfg.hp ?? 360,
      maxHp: def.maxHp ?? cfg.maxHp ?? 360,
      speed: def.speed ?? cfg.speed ?? 4.8,
      color: def.color || cfg.color || '#2563EB',
    });

    this.characterId = 'bomberman';
    this.type = 'bomberman';
    this.name = def?.name || cfg.name || 'Bomber Man';
    this.displayName = def?.displayName || cfg.displayName || this.name;
    this.r = cfg.r ?? 25;
    this.radius = this.r;

    // ── Passive: Bomb Up (Max. 10 — +1 Active Bomb Capacity Every Basic Attack CD) ──
    this.maxBombsCap = cfg.maxBombsCap ?? 10;
    this.maxBombs = Math.min(this.maxBombsCap, Math.max(1, cfg.initialMaxBombs ?? 1));
    this.plantCooldownMax = Math.max(30, cfg.plantCooldown ?? 90);
    this.plantInitialCooldown = cfg.plantInitialCooldown ?? 0;
    this.plantCooldownTimer = this.plantInitialCooldown;
    this.layStepInterval = Math.max(12, cfg.layStepInterval ?? 28);
    this.layStepTimer = 0;
    this._bombsLaidInCurrentCycle = 0;
    this._waitingForPassiveBombUp = false;

    // ── Skill 1: Fire Up (Max. 10) ──
    this.maxFireLevelCap = cfg.maxFireLevelCap ?? 10;
    this.fireLevel = Math.min(this.maxFireLevelCap, Math.max(1, cfg.initialFireLevel ?? 1));
    this.fireUpCooldownMax = Math.max(60, cfg.fireUpCooldown ?? 210);
    this.fireUpInitialCooldown = cfg.fireUpInitialCooldown ?? 120;
    this.fireUpTimer = this.fireUpInitialCooldown;
    this.baseBlastRadius = cfg.baseBlastRadius ?? 65;
    this.blastRadiusPerLevel = cfg.blastRadiusPerLevel ?? 20;
    this.damagePerFireLevel = cfg.damagePerFireLevel ?? 2.5;
    this.flameArmThickness = cfg.flameArmThickness ?? 36;

    // ── Skill 2: Kick (Bomb Kick — Traveling Bombs & Mid-Travel Explosion) ──
    this.canKickBombs = cfg.canKickBombs !== false;
    this.bombKickRange = cfg.bombKickRange ?? 64;
    this.kickHitPauseFrames = cfg.kickHitPauseFrames ?? 5;
    this.kickHitPauseTimer = 0;
    this.bombKickCooldownMax = Math.max(45, cfg.bombKickCooldown ?? 150);
    this.bombKickInitialCooldown = cfg.bombKickInitialCooldown ?? 90;
    this.bombKickTimer = this.bombKickInitialCooldown;
    this.bombKickSpeed = cfg.bombKickSpeed ?? 9.5;
    this.bombKickImpactDamage = cfg.bombKickImpactDamage ?? 12;
    this.bombKickKnockback = cfg.bombKickKnockback ?? 10;
    this.kickAnimTimer = 0;

    // ── Ultimate: Invincible (Incoming Attack Immunity) ──
    this.invincibleDuration = cfg.invincibleDuration ?? 500;
    this.invincibleCooldownMax = Math.max(60, cfg.invincibleCooldown ?? 1000);
    this.invincibleInitialCooldown = cfg.invincibleInitialCooldown ?? 1000;
    this.invincibleCooldownTimer = this.invincibleInitialCooldown;
    this.invincibleTimer = 0;
    this.isInvincibleUltimate = false;
    this.invincibleSpeedMultiplier = cfg.invincibleSpeedMultiplier ?? 1.15;
    this._invincibleDeflectTextCooldown = 0;

    // ── Visual Configuration ──
    this.showHeldBomb = def.showHeldBomb ?? cfg.showHeldBomb ?? true;

    // ── Bomb Parameters & Active Arena Arrays ──
    this.bombFuseFrames = Math.max(60, cfg.bombFuseFrames ?? 150);
    this.bombRadius = cfg.bombRadius ?? 22;
    this.baseBombDamage = cfg.baseBombDamage ?? 28;
    this.chainBonusDamage = cfg.chainBonusDamage ?? 8;
    this.bombKnockback = cfg.bombKnockback ?? 0;
    this.bombStunDuration = cfg.bombStunDuration ?? 45;
    this.explosionDuration = cfg.explosionDuration ?? 28;
    this.bombSlowDuration = cfg.bombSlowDuration ?? 75;
    this.bombSlowMultiplier = cfg.bombSlowMultiplier ?? 0.5;

    this.activeBombs = [];
    this.activeVisualExplosions = [];
    this.activeVisualEffects = [];
    this._bombIdCounter = 0;
    this.walkSoundTimer = 0;

    // Register skills with universal SkillManager
    this._registerSkills();
  }

  // ── Backward-compatible static max cooldown getters & decay guards ──
  get invincibleCooldown() {
    return this.invincibleCooldownMax;
  }
  set invincibleCooldown(val) {
    if (typeof val === 'number' && val >= 60 && Math.abs(val - this.invincibleCooldownMax) > 1) {
      this.invincibleCooldownMax = val;
    }
  }

  get plantCooldown() {
    return this.plantCooldownMax;
  }
  set plantCooldown(val) {
    if (typeof val === 'number' && val >= 30 && Math.abs(val - this.plantCooldownMax) > 1) {
      this.plantCooldownMax = val;
    }
  }

  get fireUpCooldown() {
    return this.fireUpCooldownMax;
  }
  set fireUpCooldown(val) {
    if (typeof val === 'number' && val >= 60 && Math.abs(val - this.fireUpCooldownMax) > 1) {
      this.fireUpCooldownMax = val;
    }
  }

  get bombKickCooldown() {
    return this.bombKickCooldownMax;
  }
  set bombKickCooldown(val) {
    if (typeof val === 'number' && val >= 45 && Math.abs(val - this.bombKickCooldownMax) > 1) {
      this.bombKickCooldownMax = val;
    }
  }

  /**
   * Universal SkillManager declarative skill registration.
   */
  _registerSkills() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.bomberman) ? CONFIG.bomberman : bombermanConfig;
    const skills = [];

    if (this.isSkillEnabled(cfg.enableBombUp, true)) {
      skills.push({
        id: 'bomb_up',
        name: 'Bomb Up',
        type: 'passive',
        cooldownKey: 'plantCooldownTimer',
        cooldownMaxKey: 'plantCooldownMax',
        cooldownDecayMultiplier: 0, // Handled exclusively by _tickBasicAttackAndPassiveBombUp
      });
    }

    if (this.isSkillEnabled(cfg.enableFireUp, true)) {
      skills.push({
        id: 'fire_up',
        name: 'Fire Up',
        type: 'active',
        cooldownKey: 'fireUpTimer',
        cooldownMaxKey: 'fireUpCooldownMax',
      });
    }

    if (this.isSkillEnabled(cfg.enableBombKick, cfg.canKickBombs, true)) {
      skills.push({
        id: 'bomb_kick',
        name: 'Bomb Kick',
        type: 'active',
        cooldownKey: 'bombKickTimer',
        cooldownMaxKey: 'bombKickCooldownMax',
      });
    }

    if (this.isSkillEnabled(cfg.enableInvincible, true)) {
      skills.push({
        id: 'invincible',
        name: 'Invincible',
        type: 'ultimate',
        cooldownKey: 'invincibleCooldownTimer',
        cooldownMaxKey: 'invincibleCooldownMax',
        durationKey: 'invincibleTimer',
        durationMaxKey: 'invincibleDuration',
        activeKey: 'isInvincibleUltimate',
        canTickCooldown: (fighter) => (fighter.invincibleTimer || 0) <= 0,
        onExpire: (fighter) => {
          fighter.isInvincibleUltimate = false;
        },
      });
    }

    if (skills.length > 0) {
      this.skillManager.registerSkills(skills);
      // Map static max cooldown property aliases so dynamic discovery NEVER touches them
      this.skillManager.cooldownKeyMap.set('invincibleCooldown', skills.find((s) => s.id === 'invincible') || true);
      this.skillManager.cooldownKeyMap.set('plantCooldown', skills.find((s) => s.id === 'bomb_up') || true);
      this.skillManager.cooldownKeyMap.set('fireUpCooldown', skills.find((s) => s.id === 'fire_up') || true);
      this.skillManager.cooldownKeyMap.set('bombKickCooldown', skills.find((s) => s.id === 'bomb_kick') || true);
    }
  }

  /**
   * Resets Bomberman's match state, skill arrays, and active cooldowns for new rounds.
   */
  reset() {
    super.reset();
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.bomberman) ? CONFIG.bomberman : bombermanConfig;

    this.maxFireLevelCap = cfg.maxFireLevelCap ?? 10;
    this.fireLevel = Math.min(this.maxFireLevelCap, Math.max(1, cfg.initialFireLevel ?? 1));
    this.fireUpCooldownMax = Math.max(60, cfg.fireUpCooldown ?? 210);
    this.fireUpInitialCooldown = cfg.fireUpInitialCooldown ?? 120;
    this.fireUpTimer = this.fireUpInitialCooldown;

    this.maxBombsCap = cfg.maxBombsCap ?? 10;
    this.maxBombs = Math.min(this.maxBombsCap, Math.max(1, cfg.initialMaxBombs ?? 1));
    this.plantCooldownMax = Math.max(30, cfg.plantCooldown ?? 90);
    this.plantInitialCooldown = cfg.plantInitialCooldown ?? 0;
    this.plantCooldownTimer = this.plantInitialCooldown;
    this.layStepInterval = Math.max(12, cfg.layStepInterval ?? 28);
    this.layStepTimer = 0;
    this._bombsLaidInCurrentCycle = 0;
    this._waitingForPassiveBombUp = false;

    this.canKickBombs = cfg.canKickBombs !== false;
    this.bombKickCooldownMax = Math.max(45, cfg.bombKickCooldown ?? 150);
    this.bombKickInitialCooldown = cfg.bombKickInitialCooldown ?? 90;
    this.bombKickTimer = this.bombKickInitialCooldown;
    this.kickAnimTimer = 0;
    this.kickHitPauseTimer = 0;

    this.invincibleDuration = cfg.invincibleDuration ?? 500;
    this.invincibleCooldownMax = Math.max(60, cfg.invincibleCooldown ?? 1000);
    this.invincibleInitialCooldown = cfg.invincibleInitialCooldown ?? 1000;
    this.invincibleCooldownTimer = this.invincibleInitialCooldown;
    this.invincibleTimer = 0;
    this.isInvincibleUltimate = false;
    this._invincibleDeflectTextCooldown = 0;

    this.activeBombs = [];
    this.activeVisualExplosions = [];
    this.activeVisualEffects = [];
    this.walkSoundTimer = 0;
  }

  /**
   * Computes current orthogonal blast arm length (in pixels) for the current Fire Up level.
   */
  getCurrentBlastRadius() {
    return this.baseBlastRadius + (this.fireLevel - 1) * this.blastRadiusPerLevel;
  }

  /**
   * Computes current bomb explosion damage for the current Fire Up level.
   */
  getCurrentBombDamage(isChain = false) {
    const base = this.baseBombDamage + (this.fireLevel - 1) * this.damagePerFireLevel;
    return Math.round(base + (isChain ? this.chainBonusDamage : 0));
  }

  /**
   * Plays a configured Bomberman SFX safely.
   */
  _playSfx(key) {
    const cfg = CONFIG.bomberman || {};
    const path = cfg.sounds?.[key];
    const vol = cfg.soundVolumes?.[key] ?? 0.75;
    if (path && audioSystem && typeof audioSystem.playSFX === 'function') {
      return audioSystem.playSFX(path, vol);
    }
    return null;
  }

  /**
   * Rule 23: Overrides base Fighter.shoot() to suppress generic bullet projectiles.
   */
  shoot(ownerIndex) {
    // Intentionally suppresses generic bullet shooting; bomb laying is handled by the Passive Bomb Up cycle.
  }

  /**
   * Checks whether a given coordinate (x, y) is currently inside an active cross-explosion flame arm,
   * preventing newly planted bombs from immediately chain-detonating on the frame they are placed.
   */
  _isTileInActiveExplosion(tx, ty) {
    for (let i = 0; i < this.activeVisualExplosions.length; i++) {
      const exp = this.activeVisualExplosions[i];
      if (!exp || exp.timer <= 4) continue;
      const halfThick = (exp.thickness || 42) * 0.5;
      const dist = Math.hypot(tx - exp.x, ty - exp.y);
      if (dist <= (exp.centerRadius || 36)) return true;
      const inHoriz =
        Math.abs(ty - exp.y) <= halfThick &&
        tx >= exp.x - (exp.reachLeft || 65) &&
        tx <= exp.x + (exp.reachRight || 65);
      const inVert =
        Math.abs(tx - exp.x) <= halfThick &&
        ty >= exp.y - (exp.reachUp || 65) &&
        ty <= exp.y + (exp.reachDown || 65);
      if (inHoriz || inVert) return true;
    }
    return false;
  }

  /**
   * Computes the exact center of the arena tile block containing (targetX, targetY).
   * Always returns coordinates snapped strictly to `arenaX + (col + 0.5) * cellW`
   * and `arenaY + (row + 0.5) * cellH`.
   */
  getExactTileBlockCenter(targetX, targetY, arena = state.arena, allowAdjacentIfOccupied = false) {
    const activeArena = arena || state.arena || { x: 45, y: 240, width: 450, height: 450 };
    const grid = getTileGridInfo(activeArena);
    const arenaX = activeArena.x ?? 45;
    const arenaY = activeArena.y ?? 240;
    const col = Math.max(
      0,
      Math.min(grid.cols - 1, Math.floor((targetX - arenaX) / grid.cellW))
    );
    const row = Math.max(
      0,
      Math.min(grid.rows - 1, Math.floor((targetY - arenaY) / grid.cellH))
    );
    const exactX = arenaX + (col + 0.5) * grid.cellW;
    const exactY = arenaY + (row + 0.5) * grid.cellH;

    const occupiedOnThisTile = this.activeBombs.some(
      (b) => b && b.hp > 0 && !b.isTraveling && b.col === col && b.row === row
    );

    if (!occupiedOnThisTile) {
      return {
        x: exactX,
        y: exactY,
        col,
        row,
        cellW: grid.cellW,
        cellH: grid.cellH,
        alreadyOccupied: false,
      };
    }

    if (allowAdjacentIfOccupied) {
      const nearest = getNearestTileCenter(targetX, targetY, activeArena, this.activeBombs);
      const nCol = nearest.col ?? col;
      const nRow = nearest.row ?? row;
      return {
        x: arenaX + (nCol + 0.5) * grid.cellW,
        y: arenaY + (nRow + 0.5) * grid.cellH,
        col: nCol,
        row: nRow,
        cellW: grid.cellW,
        cellH: grid.cellH,
        alreadyOccupied: false,
      };
    }

    return {
      x: exactX,
      y: exactY,
      col,
      row,
      cellW: grid.cellW,
      cellH: grid.cellH,
      alreadyOccupied: true,
    };
  }

  /**
   * Plants a bomb centered strictly on the tile block in the 8x8 arena grid.
   */
  plantBomb(arena = state.arena, allowAdjacentIfOccupied = false, customX = null, customY = null) {
    if (this.activeBombs.length >= this.maxBombs) return null;

    const targetX = customX !== null ? customX : this.x;
    const targetY = customY !== null ? customY : this.y;
    const tile = this.getExactTileBlockCenter(targetX, targetY, arena, allowAdjacentIfOccupied);

    if (tile.alreadyOccupied) {
      return null;
    }

    if (this.activeBombs.some((b) => !b.isTraveling && b.col === tile.col && b.row === tile.row)) {
      return null;
    }

    // Always include Bomberman in initialOverlaps on newly planted bombs so he never
    // accidentally kicks the bomb on the exact frame he plants it
    const initialOverlapSet = new Set([this]);
    const fighters = state.fighters || [];
    for (let i = 0; i < fighters.length; i++) {
      const f = fighters[i];
      if (!f || f === this || f.hp <= 0) continue;
      const dist = Math.hypot(f.x - tile.x, f.y - tile.y);
      if (dist <= this.bombRadius + (f.r || 25) + 4) {
        initialOverlapSet.add(f);
      }
    }

    const bomb = {
      id: ++this._bombIdCounter,
      owner: this,
      x: tile.x,
      y: tile.y,
      _fixedX: tile.x,
      _fixedY: tile.y,
      col: tile.col,
      row: tile.row,
      cellW: tile.cellW,
      cellH: tile.cellH,
      r: this.bombRadius,
      hp: 1,
      fuseTimer: this.bombFuseFrames,
      maxFuse: this.bombFuseFrames,
      spawnGraceTimer: 24,
      fireLevel: this.fireLevel,
      blastRadius: this.getCurrentBlastRadius(),
      damage: this.getCurrentBombDamage(false),
      isChainTriggered: false,
      isTraveling: false,
      vx: 0,
      vy: 0,
      hitEnemiesDuringTravel: new Set(),
      initialOverlaps: initialOverlapSet,
    };

    this.activeBombs.push(bomb);
    this._playSfx('plantBomb');
    this.layStepTimer = this.layStepInterval;

    // Start the Basic Attack Cooldown once Bomberman lays his allowed active bomb(s) for this cycle
    // (or start ticking the basic attack CD immediately so when it is up, Passive Bomb Up adds +1 capacity!)
    this._bombsLaidInCurrentCycle++;
    if (
      this.activeBombs.length >= this.maxBombs ||
      this._bombsLaidInCurrentCycle >= this.maxBombs
    ) {
      if (this.plantCooldownTimer <= 0) {
        this.plantCooldownTimer = Math.max(30, this.plantCooldown || 90);
      }
      this._waitingForPassiveBombUp = true;
      this._bombsLaidInCurrentCycle = 0;
    }

    return bomb;
  }

  /**
   * Passive — Bomb Up (Triggered automatically every time the Basic Attack CD finishes):
   * - 1st lay: 1 active bomb
   * - Basic Attack CD finishes (#1): 2 active bombs
   * - Basic Attack CD finishes (#2): 3 active bombs
   * - ...so on and so forth up to Max. 10!
   */
  _triggerPassiveBombUp() {
    this._waitingForPassiveBombUp = false;
    this._bombsLaidInCurrentCycle = 0;

    if (this.maxBombs < this.maxBombsCap) {
      this.maxBombs = Math.min(this.maxBombsCap, this.maxBombs + 1);
      this._playSfx('bombUp');
      spawnFloatingText(
        this.x,
        this.y - this.r - 18,
        `BOMB UP! (${this.maxBombs}/10)`,
        '#60A5FA'
      );
      this.activeVisualEffects.push({
        type: 'bombUp',
        x: this.x,
        y: this.y - this.r - 12,
        timer: 36,
        maxTimer: 36,
        bgColor: '#3B82F6',
      });
    }
    return this.maxBombs;
  }

  /**
   * Direct helper alias for triggering Passive Bomb Up upgrade.
   */
  castBombUp() {
    return this._triggerPassiveBombUp();
  }

  /**
   * Skill 1 — Fire Up:
   * Increases the blast radius all bombs can make (Max. 10).
   */
  castFireUp(arena = state.arena) {
    if (this.fireLevel < this.maxFireLevelCap) {
      this.fireLevel = Math.min(this.maxFireLevelCap, this.fireLevel + 1);
      spawnFloatingText(
        this.x,
        this.y - this.r - 18,
        `FIRE UP! (LV.${this.fireLevel}/10)`,
        '#F97316'
      );
      this._playSfx('fireUp');
      this.activeVisualEffects.push({
        type: 'fireUp',
        x: this.x,
        y: this.y - this.r - 12,
        timer: 36,
        maxTimer: 36,
        bgColor: '#F97316',
      });
    }

    // Dynamically upgrade the blast radius and damage of any currently planted bombs
    // (without shortening their fuseTimer so they never prematurely insta-detonate!)
    const newRadius = this.getCurrentBlastRadius();
    const newDamage = this.getCurrentBombDamage(false);
    for (let i = 0; i < this.activeBombs.length; i++) {
      const b = this.activeBombs[i];
      b.fireLevel = this.fireLevel;
      b.blastRadius = newRadius;
      b.damage = newDamage;
    }

    this.fireUpTimer = Math.max(60, this.fireUpCooldownMax || this.fireUpCooldown || 210);
    return true;
  }

  /**
   * Snaps an arbitrary angle to the nearest 4-way orthogonal cardinal direction:
   * 0 (Right), PI/2 (Down), PI (Left), or -PI/2 (Up).
   */
  _snapToCardinal(rawAngle) {
    if (typeof rawAngle !== 'number' || Number.isNaN(rawAngle)) return 0;
    const a = Math.atan2(Math.sin(rawAngle), Math.cos(rawAngle));
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);

    if (Math.abs(cosA) >= Math.abs(sinA)) {
      return cosA >= 0 ? 0 : Math.PI;
    } else {
      return sinA >= 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
    }
  }

  /**
   * Kicks a specific bomb so it travels across the arena and can explode mid-traveling.
   * Trajectory strictly follows a 4-way orthogonal cardinal direction (UP, DOWN, LEFT, or RIGHT).
   * STRICT PROXIMITY RULE: Bomberman must be very close to the bomb (within touching/adjacent range) to kick it.
   */
  kickBomb(bomb, customAngleOrTarget = null, customAngle = null, force = false) {
    if (!bomb || !this.canKickBombs) return false;

    // 1. Proximity check: Bomberman MUST be very close to the bomb to kick it
    const maxKickRange = this.bombKickRange || (this.r + (bomb.r || 22) + 12);
    const dToBomb = Math.hypot(bomb.x - this.x, bomb.y - this.y);
    if (!force && dToBomb > maxKickRange) {
      return false; // Proximity gate: strictly prevent long-distance kicks
    }

    // 2. Resolve raw aim angle
    let rawAngle = null;
    if (typeof customAngle === 'number' && !Number.isNaN(customAngle)) {
      rawAngle = customAngle;
    } else if (typeof customAngleOrTarget === 'number' && !Number.isNaN(customAngleOrTarget)) {
      rawAngle = customAngleOrTarget;
    } else if (customAngleOrTarget && typeof customAngleOrTarget.x === 'number') {
      rawAngle = Math.atan2(customAngleOrTarget.y - bomb.y, customAngleOrTarget.x - bomb.x);
    } else if (dToBomb > 4) {
      rawAngle = Math.atan2(bomb.y - this.y, bomb.x - this.x);
    } else {
      rawAngle = this.gunAngle ?? this.angle ?? 0;
    }

    // 3. Strictly snap to 4 cardinal directions: UP, DOWN, LEFT, RIGHT
    const kickAngle = this._snapToCardinal(rawAngle);
    const speed = this.bombKickSpeed || 9.5;

    bomb.isTraveling = true;
    if (kickAngle === 0) {
      // Straight RIGHT (+X)
      bomb.vx = speed;
      bomb.vy = 0;
    } else if (Math.abs(kickAngle - Math.PI * 0.5) < 0.001) {
      // Straight DOWN (+Y)
      bomb.vx = 0;
      bomb.vy = speed;
    } else if (Math.abs(Math.abs(kickAngle) - Math.PI) < 0.001) {
      // Straight LEFT (-X)
      bomb.vx = -speed;
      bomb.vy = 0;
    } else {
      // Straight UP (-Y)
      bomb.vx = 0;
      bomb.vy = -speed;
    }
    bomb.kickAngle = kickAngle;

    // 4. Kick Hit Pause: Brief impact freeze between Bomberman and the bomb upon kick contact
    const pauseFrames = this.kickHitPauseFrames || 5;
    bomb.kickHitPauseTimer = pauseFrames;
    this.kickHitPauseTimer = pauseFrames;
    this.vx = 0;
    this.vy = 0;

    if (bomb.hitEnemiesDuringTravel) {
      bomb.hitEnemiesDuringTravel.clear();
    } else {
      bomb.hitEnemiesDuringTravel = new Set();
    }

    this.kickAnimTimer = 18;
    this.bombKickTimer = Math.max(45, this.bombKickCooldownMax || this.bombKickCooldown || 150);
    this._playSfx('bombKick');
    spawnFloatingText(bomb.x, bomb.y - bomb.r - 12, 'KICK!', '#EC4899');

    // 12-Frame Retro Pixel Art Kick Impact Cross-Star Flash (The Reze Model)
    const contactX = (this.x + bomb.x) * 0.5;
    const contactY = (this.y + bomb.y) * 0.5;

    if (typeof spawnImpactFlash === 'function') {
      spawnImpactFlash(contactX, contactY, 28, '#EC4899');
    }
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(1.8, 4);
    }
    this.activeVisualEffects.push({
      type: 'bombKick',
      x: this.x,
      y: this.y - this.r - 12,
      timer: 30,
      maxTimer: 30,
      bgColor: '#EC4899',
    });

    this.activeVisualEffects.push({
      type: 'kickSpark',
      x: contactX,
      y: contactY,
      angle: kickAngle,
      timer: 14,
      maxTimer: 14,
      radius: 46,
    });
    return true;
  }

  /**
   * Skill 2 — Kick (`castKick`):
   * Kicks a planted stationary bomb so it travels across the arena floor in a fixed straight direction
   * (strictly UP, DOWN, LEFT, or RIGHT) and can explode mid-traveling.
   * STRICT PROXIMITY RULE: Bomberman must be very close to the bomb (within touching/adjacent range).
   */
  castKick(opponent = this.lastTarget, arena = state.arena) {
    this.canKickBombs = true;

    const maxKickRange = this.bombKickRange || (this.r + 22 + 12);
    let candidate = null;
    let bestDist = maxKickRange; // MUST be <= maxKickRange
    for (let i = 0; i < this.activeBombs.length; i++) {
      const b = this.activeBombs[i];
      if (!b || b.isTraveling) continue;
      const d = Math.hypot(b.x - this.x, b.y - this.y);
      if (d <= bestDist) {
        bestDist = d;
        candidate = b;
      }
    }

    // No bomb close enough to kick!
    if (!candidate) return false;

    let targetAngle = null;
    if (opponent && typeof opponent.x === 'number') {
      targetAngle = Math.atan2(opponent.y - candidate.y, opponent.x - candidate.x);
    } else if (bestDist > 4) {
      targetAngle = Math.atan2(candidate.y - this.y, candidate.x - this.x);
    } else {
      targetAngle = this.gunAngle ?? this.angle ?? 0;
    }

    return this.kickBomb(candidate, targetAngle);
  }

  /**
   * Ultimate — Invincible:
   * Allows Bomberman to be immune to INCOMING ATTACKS from enemies while active.
   */
  castInvincible() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.bomberman) ? CONFIG.bomberman : bombermanConfig;
    this.invincibleTimer = this.invincibleDuration;
    this.isInvincibleUltimate = true;
    const cd = this.invincibleCooldownMax || cfg.invincibleCooldown || 1000;
    this.invincibleCooldownTimer = Math.max(60, cd);

    this.hitStunTimer = 0;
    this.paralyzeTimer = 0;
    this.slowTimer = 0;

    this._playSfx('invincibleStart');
    triggerGlobalScreenShake(4.5, 10);
    const durSec = Math.round(this.invincibleDuration / 60);
    const floatLabel = durSec > 0 ? ('INVINCIBLE! (' + durSec + 'S)') : 'INVINCIBLE!';
    spawnFloatingText(this.x, this.y - this.r - 22, floatLabel, '#FACC15');
    this.activeVisualEffects.push({
      type: 'invincible',
      x: this.x,
      y: this.y - this.r - 14,
      timer: 45,
      maxTimer: 45,
      bgColor: '#EAB308',
    });
    return true;
  }

  /**
   * Ultimate: Invincible — 100% immunity to incoming enemy attacks while `invincibleTimer > 0`.
   */
  takeDamage(amount, attacker = null, opts = {}) {
    if (this.invincibleTimer > 0 && amount > 0 && !opts?.isHeal) {
      if (this._invincibleDeflectTextCooldown <= 0) {
        this._invincibleDeflectTextCooldown = 24;
        this._playSfx('invincibleDeflect');
        spawnFloatingText(this.x, this.y - this.r - 14, 'INVINCIBLE!', '#FACC15');
      }
      return false;
    }
    return super.takeDamage(amount, attacker, opts);
  }

  applyHitStun(duration) {
    if (this.invincibleTimer > 0) return;
    super.applyHitStun(duration);
  }

  applyKnockback(vx, vy) {
    if (this.invincibleTimer > 0) return;
    super.applyKnockback(vx, vy);
  }

  applyParalyze(duration) {
    if (this.invincibleTimer > 0) return;
    super.applyParalyze(duration);
  }

  applyTimeStop(duration) {
    if (this.invincibleTimer > 0) return;
    super.applyTimeStop(duration);
  }

  /**
   * Rule 1.7: Evaluates whether an attack is blocked by Gojo's Limitless Infinity.
   */
  _isBlockedByGojoInfinity(target) {
    if (!target) return false;
    const isGojo = target.characterId === 'gojo' || target.type === 'gojo';
    if (!isGojo) return false;
    const infinityActive = (target.infinityCooldown || 0) <= 0 && !target.domainBurnout;
    return infinityActive;
  }

  /**
   * Detonates a bomb (either stationary on its tile block OR mid-traveling across the arena!)
   * in a 4-way orthogonal '+' cross pattern, triggering chain reactions on any other bombs caught in the blast.
   */
  _detonateBomb(bomb, arena = state.arena, isChain = false) {
    if (!bomb) return;
    const blastR = bomb.blastRadius || this.getCurrentBlastRadius();
    const thickness = this.flameArmThickness || 42;
    const halfThick = thickness * 0.5;

    const minX = arena ? arena.x : 0;
    const maxX = arena ? arena.x + arena.width : 540;
    const minY = arena ? arena.y : 0;
    const maxY = arena ? arena.y + arena.height : 960;

    const reachRight = Math.max(12, Math.min(blastR, maxX - bomb.x));
    const reachLeft = Math.max(12, Math.min(blastR, bomb.x - minX));
    const reachDown = Math.max(12, Math.min(blastR, maxY - bomb.y));
    const reachUp = Math.max(12, Math.min(blastR, bomb.y - minY));

    const expObj = {
      x: bomb.x,
      y: bomb.y,
      blastRadius: blastR,
      reachRight,
      reachLeft,
      reachDown,
      reachUp,
      thickness,
      centerRadius: Math.max(bomb.r || 22, thickness * 0.95),
      timer: this.explosionDuration,
      maxTimer: this.explosionDuration,
      isChain: isChain || bomb.isChainTriggered,
      damage: this.getCurrentBombDamage(isChain || bomb.isChainTriggered),
      hitEntities: new Set(),
    };

    this.activeVisualExplosions.push(expObj);

    this._playSfx(expObj.isChain ? 'chainExplode' : 'bombExplode');

    const cfg = CONFIG.bomberman || {};
    const shakeIntensity = expObj.isChain
      ? (cfg.chainExplosionShakeIntensity ?? 8.5)
      : (cfg.bombExplosionShakeIntensity ?? 6.0);
    const shakeDuration = expObj.isChain
      ? (cfg.chainExplosionShakeDuration ?? 16)
      : (cfg.bombExplosionShakeDuration ?? 12);

    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(shakeIntensity, shakeDuration);
    }

    // 1. Chain-Reaction Check on other active bombs in the cross-blast arms
    for (let i = 0; i < this.activeBombs.length; i++) {
      const other = this.activeBombs[i];
      if (!other || other === bomb || other.fuseTimer <= 0) continue;

      const otherR = other.r || 22;
      const dxOther = other.x - bomb.x;
      const dyOther = other.y - bomb.y;
      const distOther = Math.hypot(dxOther, dyOther);

      const inCenterOther = distOther <= (expObj.centerRadius + otherR);
      const inHorizArm =
        Math.abs(dyOther) <= (halfThick + otherR) &&
        other.x >= bomb.x - reachLeft - otherR &&
        other.x <= bomb.x + reachRight + otherR;
      const inVertArm =
        Math.abs(dxOther) <= (halfThick + otherR) &&
        other.y >= bomb.y - reachUp - otherR &&
        other.y <= bomb.y + reachDown + otherR;

      if (inCenterOther || inHorizArm || inVertArm) {
        other.isChainTriggered = true;
        // Domino chain delay of 8 frames so chained explosions cascade visibly
        other.fuseTimer = Math.min(other.fuseTimer, 8);
      }
    }

    // 2. Immediate hit check on frame 0
    this._checkExplosionHits(expObj);
  }

  /**
   * Evaluates collision and applies damage & slow debuff to all enemy entities
   * caught inside the cross flame arms ('+') or central epicenter disc of an explosion.
   * Uses continuous active-blast window tracking (each entity is hit at most once per explosion).
   */
  _checkExplosionHits(exp) {
    if (!exp) return;
    exp.hitEntities = exp.hitEntities || new Set();

    const blastR = exp.blastRadius || this.getCurrentBlastRadius();
    const halfThick = (exp.thickness || this.flameArmThickness || 42) * 0.5;
    const centerRadius = Math.max(exp.centerRadius || 36, halfThick * 1.5);
    const reachRight = exp.reachRight ?? blastR;
    const reachLeft = exp.reachLeft ?? blastR;
    const reachDown = exp.reachDown ?? blastR;
    const reachUp = exp.reachUp ?? blastR;

    const dmg = exp.damage || this.getCurrentBombDamage(exp.isChain);
    const candidates = [...(state.fighters || []), ...(state.illusions || [])];

    for (let i = 0; i < candidates.length; i++) {
      const target = candidates[i];
      if (!target || target === this || target.hp <= 0) continue;

      // Teammate immunity check
      if (typeof this.isTeammate === 'function') {
        if (this.isTeammate(target)) continue;
      } else if (typeof state.getFighterTeam === 'function' && state.fighters) {
        const myIdx = state.fighters.indexOf(this);
        const tgtIdx = state.fighters.indexOf(target);
        if (myIdx >= 0 && tgtIdx >= 0 && state.getFighterTeam(myIdx) === state.getFighterTeam(tgtIdx)) {
          continue;
        }
      }

      if (exp.hitEntities.has(target)) continue;

      const tr = target.r || 25;
      const dx = target.x - exp.x;
      const dy = target.y - exp.y;
      const distToCenter = Math.hypot(dx, dy);

      // 1. Central Epicenter Disc check (guarantees hit for enemies adjacent to or touching the bomb core)
      const inCenter = distToCenter <= (centerRadius + tr);

      // 2. Horizontal Flame Arm check (full circle-to-box collision along +X / -X)
      const inHoriz =
        Math.abs(dy) <= (halfThick + tr) &&
        target.x >= (exp.x - reachLeft - tr) &&
        target.x <= (exp.x + reachRight + tr);

      // 3. Vertical Flame Arm check (full circle-to-box collision along +Y / -Y)
      const inVert =
        Math.abs(dx) <= (halfThick + tr) &&
        target.y >= (exp.y - reachUp - tr) &&
        target.y <= (exp.y + reachDown + tr);

      if (!inCenter && !inHoriz && !inVert) continue;

      // Mark target as hit by this explosion so damage is not dealt multiple times
      exp.hitEntities.add(target);

      if (this._isBlockedByGojoInfinity(target)) {
        spawnFloatingText(target.x, target.y - tr - 10, 'INFINITY', '#38BDF8');
        continue;
      }

      const pushAngle = Math.atan2(dy, dx) || 0;

      // 2a. Global Hit Effects on hit target:
      if (typeof spawnAnimePunchImpactFrame === 'function') {
        spawnAnimePunchImpactFrame(target.x, target.y, 65, pushAngle, 'orange');
      }
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(target.x, target.y, 38, '#F97316');
      }
      if (typeof spawnSparks === 'function') {
        spawnSparks(target.x, target.y, 10, 'orange');
      }
      target.hitFlashTimer = 8; // Global white hit-flash on target body
      if (typeof triggerGlobalScreenShake === 'function') {
        triggerGlobalScreenShake(exp.isChain ? 5.5 : 4.5, exp.isChain ? 12 : 10);
      }
      if (audioSystem && typeof audioSystem.playSFX === 'function') {
        audioSystem.playSFX('attack_fleshhit', 0.65);
      }

      // 2b. Centralized damage application with explosion options (knockback suppressed)
      if (typeof applyDamageToTarget === 'function') {
        applyDamageToTarget(target, dmg, this, {
          isExplosion: true,
          isAOE: true,
          damageAngle: pushAngle,
          knockbackForce: 0,
          skipKnockback: true,
        });
      } else if (typeof target.takeDamage === 'function') {
        target.takeDamage(dmg, this, {
          isExplosion: true,
          isAOE: true,
          damageAngle: pushAngle,
          knockbackForce: 0,
          skipKnockback: true,
        });
      } else {
        target.hp = Math.max(0, target.hp - dmg);
      }

      // Halt the victim in place directly upon blast contact (zero knockback impulse)
      target.vx = 0;
      target.vy = 0;
      target.knockbackVx = 0;
      target.knockbackVy = 0;

      // 2c. Stun Effect on hit target (replaces explosion knockback)
      const stunDur = this.bombStunDuration || 45;
      if (typeof target.interruptAttacks === 'function') {
        target.interruptAttacks(true);
      }
      if (typeof target.applyParalyze === 'function') {
        target.applyParalyze(stunDur, { isBombStun: true });
      } else {
        target.paralyzeTimer = Math.max(target.paralyzeTimer || 0, stunDur);
      }
      if (typeof target.applyHitStun === 'function') {
        target.applyHitStun(stunDur, { isBombStun: true });
      } else {
        target.hitStunTimer = Math.max(target.hitStunTimer || 0, stunDur);
      }
      if (typeof target.applyTimeStop === 'function') {
        target.applyTimeStop(stunDur, { isBombStun: true });
      }
      target.stunTimer = Math.max(target.stunTimer || 0, stunDur);

      // 2d. Slow Debuff Mechanic on hit entities:
      const slowDur = this.bombSlowDuration || 75;
      const slowMult = this.bombSlowMultiplier || 0.5;
      if (typeof target.applySlow === 'function') {
        target.applySlow(slowDur, slowMult, { isBombermanExplosion: true });
      } else if (target.statusEffects && typeof target.statusEffects.applySlow === 'function') {
        target.statusEffects.applySlow(slowDur, slowMult, { isBombermanExplosion: true });
      } else {
        target.slowTimer = Math.max(target.slowTimer || 0, slowDur);
        target.slowMultiplier = slowMult;
      }
      spawnFloatingText(target.x, target.y - tr - 14, 'STUNNED!', '#FACC15');
    }
  }

  /**
   * Resolves interactions between bombs and fighters:
   * - When Bomberman contacts a stationary bomb (after stepping fully outside its initial plant overlap
   *   and when his Kick cooldown is ready), he kicks the bomb across the arena!
   * - When a kicked traveling bomb hits an enemy, it deals kinetic impact damage and knocks them back.
   * - Stationary bombs physically block enemy fighters.
   */
  _resolveBombCollisions(bomb, arena = state.arena) {
    const fighters = state.fighters || [];
    for (let i = 0; i < fighters.length; i++) {
      const f = fighters[i];
      if (!f || f.hp <= 0) continue;

      const fr = f.r || 25;
      const minDist = bomb.r + fr;
      const dx = f.x - bomb.x;
      const dy = f.y - bomb.y;
      const dist = Math.hypot(dx, dy);

      // Clear initial spawn overlap only after the fighter has stepped cleanly outside minDist + 8px
      if (bomb.initialOverlaps && bomb.initialOverlaps.has(f)) {
        if (dist >= minDist + 8) {
          bomb.initialOverlaps.delete(f);
        } else {
          continue;
        }
      }

      if (f === this) {
        if (
          !bomb.isTraveling &&
          this.canKickBombs &&
          this.bombKickTimer <= 0 &&
          (bomb.spawnGraceTimer || 0) <= 0 &&
          dist < minDist
        ) {
          const contactAngle = Math.atan2(bomb.y - this.y, bomb.x - this.x);
          this.kickBomb(bomb, contactAngle);
        }
        continue;
      }

      if (typeof this.isTeammate === 'function' && this.isTeammate(f)) continue;

      if (dist < minDist) {
        const nx = dist > 0.001 ? dx / dist : 1;
        const ny = dist > 0.001 ? dy / dist : 0;
        const overlap = minDist - dist;

        if (bomb.isTraveling) {
          if (bomb.hitEnemiesDuringTravel && !bomb.hitEnemiesDuringTravel.has(f)) {
            bomb.hitEnemiesDuringTravel.add(f);
            if (!this._isBlockedByGojoInfinity(f)) {
              const impactDmg = this.bombKickImpactDamage || 12;
              const kb = this.bombKickKnockback || 10;
              const contactAngle = Math.atan2(ny, nx);

              // Global Hit Effects on hit enemy
              if (typeof spawnAnimePunchImpactFrame === 'function') {
                spawnAnimePunchImpactFrame(f.x, f.y, 55, contactAngle, 'gold');
              }
              if (typeof spawnImpactFlash === 'function') {
                spawnImpactFlash(f.x, f.y, 32, '#FACC15');
              }
              if (typeof spawnSparks === 'function') {
                spawnSparks(f.x, f.y, 8, 'gold');
              }
              f.hitFlashTimer = 8;
              if (audioSystem && typeof audioSystem.playSFX === 'function') {
                audioSystem.playSFX('attack_fleshhit', 0.7);
              }

              if (typeof applyDamageToTarget === 'function') {
                applyDamageToTarget(f, impactDmg, this, {
                  isMelee: true,
                  isKnockback: true,
                  damageAngle: contactAngle,
                  knockbackForce: kb,
                });
              } else if (typeof f.takeDamage === 'function') {
                f.takeDamage(impactDmg, this, {
                  isMelee: true,
                  isKnockback: true,
                  damageAngle: contactAngle,
                  knockbackForce: kb,
                });
              } else {
                f.hp = Math.max(0, f.hp - impactDmg);
              }

              if (typeof f.applyKnockback === 'function') {
                f.applyKnockback(nx * kb, ny * kb);
              }
            }
          }

          // A kicked bomb STOPS traveling upon hitting an enemy (Classic Bomberman standard)
          // It does NOT rebounce and does NOT bulldoze or follow the enemy
          bomb.isTraveling = false;
          bomb.vx = 0;
          bomb.vy = 0;
          if (arena) {
            const nearest = getNearestTileCenter(bomb.x, bomb.y, arena, this.activeBombs.filter((b) => b !== bomb));
            bomb.x = nearest.x;
            bomb.y = nearest.y;
            bomb._fixedX = nearest.x;
            bomb._fixedY = nearest.y;
            bomb.col = nearest.col;
            bomb.row = nearest.row;
          }
          this._playSfx('bombKick');
          triggerGlobalScreenShake(1.8, 4);
        } else {
          // Stationary bombs act as solid physical obstacles for enemy fighters
          f.x += nx * overlap;
          f.y += ny * overlap;

          const vn = (f.vx || 0) * nx + (f.vy || 0) * ny;
          if (vn < 0) {
            f.vx -= vn * nx * 1.35;
            f.vy -= vn * ny * 1.35;
          }
        }

        if (arena) {
          f.x = Math.max(arena.x + fr, Math.min(arena.x + arena.width - fr, f.x));
          f.y = Math.max(arena.y + fr, Math.min(arena.y + arena.height - fr, f.y));
        }
      }
    }
  }

  /**
   * Updates all active bombs:
   * - Stationary bombs remain strictly locked to their tile block center `(cx, cy)`.
   * - Kicked bombs (`bomb.isTraveling === true`) travel across the arena in a straight line,
   *   stop on arena walls/obstacles without rebouncing, and explode when `bomb.fuseTimer <= 0`.
   */
  _updateBombs(arena = state.arena) {
    const activeArena = arena || state.arena || { x: 45, y: 240, width: 450, height: 450 };
    const grid = getTileGridInfo(activeArena);
    const arenaX = activeArena.x ?? 45;
    const arenaY = activeArena.y ?? 240;

    for (let i = this.activeBombs.length - 1; i >= 0; i--) {
      const bomb = this.activeBombs[i];
      if (!bomb) {
        this.activeBombs.splice(i, 1);
        continue;
      }

      if (bomb.spawnGraceTimer > 0) {
        bomb.spawnGraceTimer--;
      }

      bomb.cellW = grid.cellW;
      bomb.cellH = grid.cellH;

      if (bomb.isTraveling) {
        if (bomb.kickHitPauseTimer > 0) {
          bomb.kickHitPauseTimer--;
          // Pauses travel movement during the initial kick hit pause, but fuse ticks down naturally
        } else {
          bomb.x += bomb.vx || 0;
          bomb.y += bomb.vy || 0;

          const minX = arenaX + bomb.r;
          const maxX = arenaX + activeArena.width - bomb.r;
          const minY = arenaY + bomb.r;
          const maxY = arenaY + activeArena.height - bomb.r;

          let hitWall = false;
          if (bomb.x <= minX) {
            bomb.x = minX;
            hitWall = true;
          } else if (bomb.x >= maxX) {
            bomb.x = maxX;
            hitWall = true;
          }

          if (bomb.y <= minY) {
            bomb.y = minY;
            hitWall = true;
          } else if (bomb.y >= maxY) {
            bomb.y = maxY;
            hitWall = true;
          }

          if (hitWall) {
            // Strictly NO REBOUNCE: Kicked bomb stops sliding on wall impact and locks to tile
            bomb.isTraveling = false;
            bomb.vx = 0;
            bomb.vy = 0;
            const nearest = getNearestTileCenter(bomb.x, bomb.y, activeArena, this.activeBombs.filter((b) => b !== bomb));
            bomb.x = nearest.x;
            bomb.y = nearest.y;
            bomb._fixedX = nearest.x;
            bomb._fixedY = nearest.y;
            bomb.col = nearest.col;
            bomb.row = nearest.row;
            this._playSfx('bombKick');
            triggerGlobalScreenShake(1.5, 3);
          } else {
            // Check collision with other stationary bombs during travel:
            // A sliding bomb stops upon colliding with another bomb (Classic Bomberman standard)
            for (let j = 0; j < this.activeBombs.length; j++) {
              const other = this.activeBombs[j];
              if (!other || other === bomb || other.isTraveling) continue;
              const bdx = bomb.x - other.x;
              const bdy = bomb.y - other.y;
              const bDist = Math.hypot(bdx, bdy);
              const minBDist = bomb.r + other.r;
              if (bDist < minBDist) {
                bomb.isTraveling = false;
                bomb.vx = 0;
                bomb.vy = 0;
                const bnx = bDist > 0.001 ? bdx / bDist : 1;
                const bny = bDist > 0.001 ? bdy / bDist : 0;
                bomb.x = other.x + bnx * (minBDist + 2);
                bomb.y = other.y + bny * (minBDist + 2);
                const nearest = getNearestTileCenter(bomb.x, bomb.y, activeArena, this.activeBombs.filter((b) => b !== bomb));
                bomb.x = nearest.x;
                bomb.y = nearest.y;
                bomb._fixedX = nearest.x;
                bomb._fixedY = nearest.y;
                bomb.col = nearest.col;
                bomb.row = nearest.row;
                this._playSfx('bombKick');
                break;
              }
            }

            if (bomb.isTraveling) {
              bomb._fixedX = bomb.x;
              bomb._fixedY = bomb.y;
              bomb.col = Math.max(
                0,
                Math.min(grid.cols - 1, Math.floor((bomb.x - arenaX) / grid.cellW))
              );
              bomb.row = Math.max(
                0,
                Math.min(grid.rows - 1, Math.floor((bomb.y - arenaY) / grid.cellH))
              );
            }
          }
        }
      } else {
        const cx = arenaX + (bomb.col + 0.5) * grid.cellW;
        const cy = arenaY + (bomb.row + 0.5) * grid.cellH;
        bomb.x = cx;
        bomb.y = cy;
        bomb._fixedX = cx;
        bomb._fixedY = cy;
      }

      this._resolveBombCollisions(bomb, activeArena);

      bomb.fuseTimer--;
      if (bomb.fuseTimer <= 0) {
        this.activeBombs.splice(i, 1);
        this._detonateBomb(bomb, activeArena, bomb.isChainTriggered);
      }
    }
  }

  /**
   * Rule 25: Decays active visual explosions before freeze guard so visuals NEVER freeze in mid-air.
   * Also continues active flame hit detection while the cross flames are visibly burning.
   */
  _updateVisualExplosions() {
    for (let i = this.activeVisualExplosions.length - 1; i >= 0; i--) {
      const exp = this.activeVisualExplosions[i];
      exp.timer--;

      // Active flame damage window: while flame arms are blazing (first ~65% of animation)
      if (exp.timer >= (exp.maxTimer || 28) * 0.35) {
        this._checkExplosionHits(exp);
      }

      if (exp.timer <= 0) {
        this.activeVisualExplosions.splice(i, 1);
      }
    }
  }

  /**
   * Rule 25: Decays power-up tile popups before freeze guard.
   */
  _updateVisualEffects() {
    for (let i = this.activeVisualEffects.length - 1; i >= 0; i--) {
      const vfx = this.activeVisualEffects[i];
      vfx.timer--;
      if (vfx.timer <= 0) {
        this.activeVisualEffects.splice(i, 1);
      }
    }
  }

  /**
   * Cleans up transient fighter-anchored visual effect arrays upon interruption or defeat (Rule 25).
   */
  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks?.(forceCancelAll);
    this.walkSoundTimer = 0;
    if (forceCancelAll || this.hp <= 0) {
      this.activeVisualEffects.length = 0;
    }
  }

  /**
   * Advances the Basic Attack Cooldown by 1 tick and automatically triggers
   * Passive: Bomb Up (+1 active bomb capacity up to Max 10) when the cooldown finishes.
   */
  _tickBasicAttackAndPassiveBombUp() {
    if (this.layStepTimer > 0) {
      this.layStepTimer--;
    }

    if (this.plantCooldownTimer > 0) {
      this.plantCooldownTimer--;
      if (this.plantCooldownTimer <= 0 && this._waitingForPassiveBombUp) {
        this._triggerPassiveBombUp();
      }
    }
  }

  /**
   * Main 60 FPS combat update loop for Bomber Man.
   */
  update(opponent, ownerIndex, arena = state.arena) {
    // 0. Rule 25: Update visual effects & explosion lifecycles BEFORE freeze guard
    this._updateVisualExplosions();
    this._updateVisualEffects();

    if (this._invincibleDeflectTextCooldown > 0) {
      this._invincibleDeflectTextCooldown--;
    }
    if (this.kickAnimTimer > 0) {
      this.kickAnimTimer--;
    }
    this.isInvincibleUltimate = (this.invincibleTimer || 0) > 0;

    // Planted & traveling bombs continue ticking on the arena floor
    this._updateBombs(arena);

    // 1. Mandatory Rule 1.1 Freeze & TimeStop Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    if (this.hp <= 0) return;

    // 2. Decrement Basic Attack CD (which triggers Passive: Bomb Up when CD is up!) & Skill Cooldowns
    this._tickBasicAttackAndPassiveBombUp();
    if (this.kickHitPauseTimer > 0) {
      this.kickHitPauseTimer--;
      this.vx = 0;
      this.vy = 0;
      this.kickAnimTimer = Math.max(this.kickAnimTimer, 18);
    }

    // Fallback cooldown & duration decay only when SkillManager is not present
    if (!this.skillManager) {
      if (this.invincibleTimer > 0) {
        this.invincibleTimer--;
        this.isInvincibleUltimate = this.invincibleTimer > 0;
      }
      if (this.fireUpTimer > 0) this.fireUpTimer--;
      if (this.bombKickTimer > 0) this.bombKickTimer--;
      if (this.invincibleCooldownTimer > 0 && this.invincibleTimer <= 0) {
        this.invincibleCooldownTimer--;
      }
    }

    // 3. Aim toward valid target
    if (opponent && opponent.hp > 0) {
      this.lastTarget = opponent;
      this.aim(opponent);
    }

    // 4. Skill Execution Priorities
    // Ultimate: Invincible (incoming attack immunity)
    if (this.invincibleTimer <= 0 && this.invincibleCooldownTimer <= 0) {
      this.castInvincible();
    }

    // Skill 1: Fire Up (only casts while upgrading up to Max Level 10)
    if (this.fireUpTimer <= 0 && this.fireLevel < this.maxFireLevelCap) {
      this.castFireUp(arena);
    }

    // Basic Attack + Passive Bomb Up Cycle:
    // Plants a bomb centered strictly on the tile block Bomberman is currently standing on
    // (provided the tile is not already occupied or actively burning from an explosion)
    if (
      this.plantCooldownTimer <= 0 &&
      this.layStepTimer <= 0 &&
      this.activeBombs.length < this.maxBombs &&
      !this._isTileInActiveExplosion(this.x, this.y)
    ) {
      this.plantBomb(arena, false);
    }

    // Skill 2: Kick — kicks a planted bomb when ready (only after its spawn grace period)
    // PROXIMITY GATE: Only kicks if Bomberman is very close to a planted bomb!
    const maxKickRange = this.bombKickRange || (this.r + 22 + 12);
    const hasNearbyBomb = this.activeBombs.some(
      (b) =>
        b &&
        !b.isTraveling &&
        (b.spawnGraceTimer || 0) <= 0 &&
        Math.hypot(b.x - this.x, b.y - this.y) <= maxKickRange
    );
    if (this.bombKickTimer <= 0 && hasNearbyBomb) {
      this.castKick(opponent, arena);
    }

    // 5. Centralized Movement & Wall Bounce Physics (Rule 1.2)
    let speedMult = 1.0;
    if (this.kickHitPauseTimer > 0) {
      speedMult = 0;
      this.vx = 0;
      this.vy = 0;
    } else if (this.invincibleTimer > 0) {
      speedMult *= this.invincibleSpeedMultiplier;
    }

    this.applyMovementPhysics(speedMult);
    this.resolveWallBounce(arena, opponent);

    // 6. Walking SFX Cadence (Assets/Sound Effects/BombermanSFX/Walking 1.wav)
    const currentSpeed = Math.hypot(this.vx || 0, this.vy || 0);
    if (currentSpeed > 0.4 && this.kickHitPauseTimer <= 0 && this.hp > 0) {
      if (!this.walkSoundTimer || this.walkSoundTimer <= 0) {
        this._playSfx('walk');
        this.walkSoundTimer = 50; // ~0.83s step cycle matching the 0.87s audio file
      } else {
        this.walkSoundTimer--;
      }
    } else {
      this.walkSoundTimer = 0;
    }
  }

  /**
   * Rule 21: Standard body renderer hook for character previews and render passes.
   */
  drawBody(ctx) {
    drawBombermanSkin(ctx, this);
  }

  drawSkin(ctx) {
    drawBombermanSkin(ctx, this);
  }

  /**
   * Rule 21: Custom fighter draw pipeline.
   * Renders tile-centered & traveling bombs, 4-way cross explosions, Bomberman's body,
   * power-up popups, and MANDATORY overhead HP & freeze timer overlays at the end.
   */
  draw(ctx, opponent) {
    if (!ctx) return;

    for (let i = 0; i < this.activeBombs.length; i++) {
      drawPlantedBomb(ctx, this.activeBombs[i]);
    }
    for (let i = 0; i < this.activeVisualExplosions.length; i++) {
      drawBombExplosion(ctx, this.activeVisualExplosions[i]);
    }

    this.drawBody(ctx);

    for (let i = 0; i < this.activeVisualEffects.length; i++) {
      const vfx = this.activeVisualEffects[i];
      if (vfx.type === 'kickSpark') {
        const p = 1.0 - Math.max(0, vfx.timer / (vfx.maxTimer || 14));
        drawBombermanKickEffectSprite(ctx, vfx.x, vfx.y, vfx.radius || 46, p, 1.0, vfx.angle || 0);
      } else {
        drawBombermanPowerupPopup(ctx, vfx);
      }
    }

    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
