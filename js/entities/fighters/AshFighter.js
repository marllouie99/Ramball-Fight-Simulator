// ─────────────────────────────────────────────
// ASH KETCHUM (POKÉMON TRAINER) FIGHTER CLASS
// World Coronation Monarch of Pallet Town
// Adheres strictly to Repository Rules:
// - Rule 1.1: Mandatory Freeze & TimeStop Guard
// - Rule 1.2: Centralized Movement & Physics (super.update)
// - Rule 1.4: Continuous 360° Skill Aiming
// - Rule 1.7: Gojo Limitless Infinity Barrier & Toji ISOH Compliance
// - Rule 20: Symmetrical Lower-Flank Canonical Hands
// - Rule 21: Mandatory In-Game Overlay HP & Freeze Timer (drawHealth, drawFreezeTimer)
// - Rule 22: Dedicated Hair Asset Model Import (Assets/model/ash/Ash-hair.png)
// - Rule 23: Basic Projectile Suppression (shoot override)
// - Rule 25: Non-Freezing Active Visual Effects Decay before Freeze Guard
// - Rule 26: Staggered Concentric Water-Ripple Shockwaves
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget, isSkillEnabled } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { ashConfig } from '../../configs/characters/ashConfig.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { drawAshSkin } from '../../graphics/fighters/ashSkin.js';
import {
  drawAshHoneycombBarrier,
  drawAshVisualEffects,
  drawPokemonCompanion, getCharizardMouthLocalOffset, updateCharizardFlameChain
} from '../../graphics/weapons/ashPokemonGraphics.js';
import { spawnImpactFlash, spawnSparks } from '../../graphics/particles/sparkEffect.js';
import {
  initPokemonTrainerState,
  resetPokemonTrainerState,
  pickRandomPokemonSpecies,
  getOtherPokemonTrainers,
  isTrainerVantagePointOccupied,
  hasTrainerVantagePointConflict,
  pickTrainerVantagePoint,
  isTrainerMovingToVantagePoint,
  updateTrainerCornerMovement,
  checkTrainerIncomingThreats,
  pickTrainerOutsideSidelineSpot,
  pickTrainerInsideLandingSpot,
  startTrainerJumpOut,
  startTrainerJumpIn,
  updateTrainerJumpPhysics,
  isTrainerUntargetable,
  startTrainerPokeballThrow,
  updateTrainerThrowPhysics,
  isActivePokemonTarget,
  getValidTrainerEnemyTargets,
  findBestPokemonTarget,
  isPokemonStationarySkill,
  updatePokemonCompanionMovement,
  updatePokemonCompanionAnimState,
  applyPokemonDamageHitEffects
} from '../../systems/pokemonTrainerSystem.js';

function _getAshCfg() {
  return (typeof CONFIG !== 'undefined' && CONFIG.ash) ? CONFIG.ash : ashConfig;
}

function _playAshSound(key) {
  const cfg = _getAshCfg();
  const src = cfg.sounds?.[key] ?? ashConfig.sounds?.[key];
  const vol = cfg.soundVolumes?.[key] ?? ashConfig.soundVolumes?.[key] ?? 0.85;
  if (src && typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
    audioSystem.playSFX(src, vol);
  }
}

// Canonical Empress Pokemon 2D Arena (audio.bytes) windup (-1.ogg) -> cast (-2.ogg) sequence table
const EMPRESS_MOVE_CAST_FOLLOWUPS = {
  thunderbolt:   { castKey: 'thunderboltCast',   delayFrames: 9 },
  ironTail:      { castKey: 'ironTailCast',      delayFrames: 7 },
  voltTackle:    { castKey: 'voltTackleCast',    delayFrames: 8 },
  waterShuriken: { castKey: 'waterShurikenCast', delayFrames: 6 },
  nightSlash:    { castKey: 'nightSlashCast',    delayFrames: 6 },
  auraSphere:    { castKey: 'auraSphereCast',    delayFrames: 8 }
};

function _distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * Computes maximum ray distance from (startX, startY) along angle to the arena walls.
 * Prevents beams and effects from clipping outside the arena boundaries without degenerate 0-distance clamps.
 */
function _getRayArenaIntersection(startX, startY, angle, arena, innerMargin = 4) {
  if (!arena) return 700;
  const wallW = arena.wallWidth || 4;
  const margin = wallW + innerMargin;

  if (arena.shape === 'circle' || arena.radius) {
    const cx = arena.x + arena.width / 2;
    const cy = arena.y + arena.height / 2;
    const r = Math.max(20, (arena.radius || arena.width / 2) - margin);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const dx = startX - cx;
    const dy = startY - cy;
    const b = 2 * (dx * cosA + dy * sinA);
    const c = dx * dx + dy * dy - r * r;
    const disc = b * b - 4 * c;
    if (disc < 0) return 700;
    const t = (-b + Math.sqrt(disc)) / 2;
    return Math.max(40, t);
  }

  const minX = arena.x + margin;
  const maxX = arena.x + arena.width - margin;
  const minY = arena.y + margin;
  const maxY = arena.y + arena.height - margin;

  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  let maxDist = Infinity;

  // Vertical boundary collisions (X-axis)
  if (cosA > 0.0001) {
    const d = (maxX - startX) / cosA;
    if (d > 0 && d < maxDist) maxDist = d;
  } else if (cosA < -0.0001) {
    const d = (minX - startX) / cosA;
    if (d > 0 && d < maxDist) maxDist = d;
  }

  // Horizontal boundary collisions (Y-axis)
  if (sinA > 0.0001) {
    const d = (maxY - startY) / sinA;
    if (d > 0 && d < maxDist) maxDist = d;
  } else if (sinA < -0.0001) {
    const d = (minY - startY) / sinA;
    if (d > 0 && d < maxDist) maxDist = d;
  }

  if (maxDist === Infinity || maxDist < 40 || Number.isNaN(maxDist)) {
    const fallbackReach = Math.min(arena.width, arena.height) || 450;
    return Math.max(120, fallbackReach * 0.9);
  }

  return maxDist;
}

/**
 * Autonomous Pokémon Companion Entity (Pikachu, Charizard, Greninja, Lucario).
 * Exists in state.fighters while deployed so enemies target and clash with the Pokémon.
 */
export class PokemonCompanionEntity extends Fighter {
  constructor(owner, speciesKey, spawnX, spawnY) {
    const cfg = _getAshCfg();
    const spec = cfg.pokemonRoster?.[speciesKey] || ashConfig.pokemonRoster.pikachu;
    super({
      id: `pokemon_${speciesKey}`,
      name: spec.name,
      displayName: spec.name,
      type: `pokemon_${speciesKey}`,
      color: spec.themeColor,
      themeColor: spec.themeColor,
      radius: spec.radius || 22,
      hp: spec.hp || 170,
      damage: spec.meleeDamage || 20,
      cooldown: spec.meleeCooldown || 35,
      moveSpeed: spec.speed || 5.8
    });

    this.owner = owner;
    this.teamId = owner.teamId;
    this.isMinion = true;
    this.isPokemon = true;
    this.isPokemonMinion = true;
    this.isPokemonCompanion = true;
    this.customHitFlash = true;
    this.suppressHitFlash = true;
    this.suppressStatusOverlays = true;
    this.suppressDebuffs = true;
    this.noBlood = true;
    this.suppressBlood = true;
    this.hideHands = true;

    this.speciesId = speciesKey;
    this.spec = spec;
    this.name = spec.name;
    this.displayName = this.name;
    this.themeColor = spec.themeColor;
    this.color = this.themeColor;
    this.damageNumberColor = owner.damageNumberColor || '#FACC15';

    this.x = spawnX;
    this.y = spawnY;
    this.r = spec.radius || 22;
    this.radius = this.r;
    this.hp = Math.round((spec.hp || 170) * 1.0);
    this.maxHp = this.hp;
    this.speed = (spec.speed || 5.8) * 1.0;
    this.baseSpeed = this.speed;
    this.spriteScale = spec.scale || 1.5;
    this.meleeMoveMaxTicks = 0;
    this.meleeMoveKey = null;
    this.meleeMoveTick = 0;
    this.meleeMoveState = null;
    this.meleeHitDone = new Set();
    this.meleeTarget = null;
    this.meleeCastAngle = 0;
    this.comboStep = 0;
    this.isTrainerCommandMove = false;
    this.z = 0;
    this.shockwaveEmerbs = [];

    const launchTarget = owner?._findBestTarget ? owner._findBestTarget(null, { x: spawnX, y: spawnY }) : null;
    const launchAngle = (launchTarget && launchTarget.hp > 0)
      ? Math.atan2(launchTarget.y - spawnY, launchTarget.x - spawnX)
      : (owner.gunAngle || 0);
    this.vx = Math.cos(launchAngle) * this.speed;
    this.vy = Math.sin(launchAngle) * this.speed;
    this.launchAngle = launchAngle;
    this.gunAngle = launchAngle;
    this.angle = launchAngle;

    this.animState = 'idle';
    this.animTick = 0;
    this.actionAnimTimer = 0;
    this.summonIntroMaxTimer = _getAshCfg().pokemonSummonIntroFrames ?? 28;
    this.summonIntroTimer = 0;
    this.isSummonIntro = false;
    const meleeInitialCd = spec.skills?.melee?.initialCooldown ?? spec.skills?.melee?.initialCooldownFrames ?? spec.initialMeleeCooldown ?? 20;
    this.meleeCooldown = meleeInitialCd;
    this.meleeCooldownMax = spec.skills?.melee?.cooldown ?? spec.meleeCooldown ?? 34;
    const specialCooldownCfg = spec.skills?.special?.cooldown ?? spec.specialCooldown ?? (_getAshCfg().pokemonRoster?.[speciesKey]?.skills?.special?.cooldown ?? 135);
    this.specialCooldownMax = specialCooldownCfg;
    const specialInitialCd = spec.skills?.special?.initialCooldown ?? spec.skills?.special?.initialCooldownFrames ?? spec.initialSpecialCooldown ?? spec.initialSpecialDelayFrames ?? 180;
    this.specialInitialCooldown = specialInitialCd;
    this.specialCooldown = specialInitialCd;
    this.isSpecialOnInitialCooldown = this.specialCooldown > 0;
    this.comboStep = 0;
    this.hurtAnimTimer = 0;
    this.hurtTick = 0;
    this.victoryPoseDelayTimer = -1;
    this._lastVictoryFrame = -1;
    this.faintTimer = 0;
    this.faintTick = 0;
    this.maxFaintTicks = 48;
    this.isFainting = false;
    this.faintCompleted = false;
    this.faintAngle = launchAngle;
    this.thunderboltState = null;
    this.thunderboltTimer = 0;
    this.thunderboltHitEnemies = new Set();
    this.flamethrowerState = null;
    this.flamethrowerTimer = 0;
    this.flamethrowerHitEnemies = new Set();
    this.flamethrowerCurrentBeamLen = null;
    this.flamethrowerClosestEnemy = null;
    this.flamethrowerImpactTimer = undefined; this.flamethrowerChainAngles = new Array(28).fill(this.flamethrowerCastAngle || 0); this.flamethrowerFlipY = Math.cos(this.flamethrowerCastAngle || 0) < -0.15 ? -1 : 1; this._smoothMouthX = undefined; this._smoothMouthY = undefined;
    this.specialCastTimer = 0;
  }

  shoot() {
    // Intentionally empty (Rule 23): Pokémon uses dedicated melee blitz & elemental specials
  }

  /**
   * Acquires the highest-priority enemy target for this Pokémon:
   * Always focuses on active enemy Pokémon first when a Pokémon battle is underway,
   * falling back to the nearest enemy fighter only when no enemy Pokémon are active.
   */
  _acquireTarget(opponent = null) {
    if (this.owner && typeof this.owner._findBestTarget === 'function') {
      const best = this.owner._findBestTarget(opponent, this);
      if (best) return best;
    }
    if (opponent && opponent.activePokemon && isActivePokemonTarget(opponent.activePokemon)) {
      return opponent.activePokemon;
    }
    return opponent;
  }

  /**
   * Starts the Pokémon summon entrance animation & visual effect sequence before moving.
   */
  startSummonIntro(durationFrames) {
    const dur = Math.max(1, durationFrames ?? (_getAshCfg().pokemonSummonIntroFrames ?? 28));
    this.summonIntroMaxTimer = dur;
    this.summonIntroTimer = dur;
    this.isSummonIntro = true;
    this.vx = 0;
    this.vy = 0;
    if (this.speciesId === 'pikachu') {
      this.animState = 'pose';
    } else if (this.speciesId === 'charizard') {
      this.animState = 'special';
    } else if (this.speciesId === 'greninja' || this.speciesId === 'lucario') {
      this.animState = 'rearUp';
    } else {
      this.animState = 'idle';
    }
  }

  /**
   * Rule 1.4: Aim rotation rules for Pokémon specials and melee moves:
   * - Pikachu locks aim during entire Thunderbolt channel.
   * - Charizard locks aim during Flamethrower windup and recovery, but actively tracks targets while firing.
   * - Close combat melee moves lock aim during execution.
   */
  canAim() {
    if (this.thunderboltState || this.meleeMoveState) return false;
    if (this.flamethrowerState === 'windup' || this.flamethrowerState === 'recovery') return false;
    return super.canAim();
  }

  isStationarySkillActive() {
    return Boolean(this.thunderboltState || this.flamethrowerState || (this.meleeMoveState === 'lock') || (this.animState === 'special' && (this.actionAnimTimer > 0 || (this.specialCastTimer || 0) > 0)) || super.isStationarySkillActive?.());
  }

  isChannelingSkill() {
    return Boolean(this.thunderboltState || this.flamethrowerState || (this.animState === 'special' && (this.actionAnimTimer > 0 || (this.specialCastTimer || 0) > 0)) || super.isChannelingSkill?.());
  }

  /**
   * Evaluates if this Pokémon is actively casting or executing any special or melee skill:
   * - Pikachu: Thunderbolt (windup, active beam)
   * - Charizard: Flamethrower (windup, active fire stream, recovery breather)
   * - Greninja: Water Shuriken (special casting frames)
   * - Lucario: Aura Sphere (special casting frames)
   * - All Pokémon: Close combat melee combos (windup, strike, lock, recovery)
   */
  isCastingSkill() {
    return Boolean(
      this.thunderboltState ||
      this.flamethrowerState ||
      this.meleeMoveState ||
      (this.specialCastTimer && this.specialCastTimer > 0) ||
      (this.animState === 'special' && (this.actionAnimTimer > 0 || (this.specialCastTimer || 0) > 0)) ||
      (this.animState === 'attack' && this.actionAnimTimer > 0)
    );
  }

  // ── Push Back, Pull, Drag, and Knockback Immunity while Casting Skills ──

  get immuneToKnockback() {
    return this.isCastingSkill() || Boolean(this._immuneToKnockback);
  }
  set immuneToKnockback(v) {
    this._immuneToKnockback = v;
  }

  get immuneToPush() {
    return this.isCastingSkill() || Boolean(this._immuneToPush);
  }
  set immuneToPush(v) {
    this._immuneToPush = v;
  }

  get immuneToPull() {
    return this.isCastingSkill() || Boolean(this._immuneToPull);
  }
  set immuneToPull(v) {
    this._immuneToPull = v;
  }

  get cannotBeKnockbacked() {
    return this.isCastingSkill() || Boolean(this._cannotBeKnockbacked);
  }
  set cannotBeKnockbacked(v) {
    this._cannotBeKnockbacked = v;
  }

  get cannotBePushed() {
    return this.isCastingSkill() || Boolean(this._cannotBePushed);
  }
  set cannotBePushed(v) {
    this._cannotBePushed = v;
  }

  get gojoBlueDragImmune() {
    return this.isCastingSkill() || Boolean(this._gojoBlueDragImmune);
  }
  set gojoBlueDragImmune(v) {
    this._gojoBlueDragImmune = v;
  }

  get isDraggedByGetsuga() {
    return !this.isCastingSkill() && Boolean(this._isDraggedByGetsuga);
  }
  set isDraggedByGetsuga(v) {
    if (this.isCastingSkill()) {
      this._isDraggedByGetsuga = false;
      return;
    }
    this._isDraggedByGetsuga = v;
  }

  get _draggedByCruelSun() {
    return !this.isCastingSkill() && Boolean(this.__draggedByCruelSun);
  }
  set _draggedByCruelSun(v) {
    if (this.isCastingSkill()) {
      this.__draggedByCruelSun = false;
      return;
    }
    this.__draggedByCruelSun = v;
  }

  get isCaughtInCruelSun() {
    return !this.isCastingSkill() && Boolean(this.__isCaughtInCruelSun);
  }
  set isCaughtInCruelSun(v) {
    if (this.isCastingSkill()) {
      this.__isCaughtInCruelSun = false;
      return;
    }
    this.__isCaughtInCruelSun = v;
  }

  isCaughtInBeam() {
    if (this.isCastingSkill()) return false;
    return super.isCaughtInBeam();
  }

  isPulledOrDragged() {
    if (this.isCastingSkill()) return false;
    return typeof super.isPulledOrDragged === 'function' ? super.isPulledOrDragged() : false;
  }

  isImmuneToGravitationalPull(vortexType = 'purple') {
    if (this.isCastingSkill()) return true;
    return super.isImmuneToGravitationalPull(vortexType);
  }

  applyKnockback(vx, vy, stunFrames = 0) {
    if (this.isCastingSkill()) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      return;
    }
    return super.applyKnockback(vx, vy, stunFrames);
  }

  applySuction(vx, vy) {
    if (this.isCastingSkill()) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      return;
    }
    if (typeof super.applySuction === 'function') {
      super.applySuction(vx, vy);
    }
  }

  interruptAttacks(forceCancelAll = false) {
    this.thunderboltState = null;
    this.thunderboltTimer = 0;
    this.thunderboltCurrentBeamLen = null;
    this.thunderboltClosestEnemy = null;
    this.thunderboltImpactTimer = undefined;
    if (this.thunderboltHitEnemies) {
      this.thunderboltHitEnemies.clear();
    }
    this.flamethrowerState = null;
    this.flamethrowerTimer = 0;
    this.flamethrowerCurrentBeamLen = null;
    this.flamethrowerClosestEnemy = null;
    this.flamethrowerImpactTimer = undefined; this.flamethrowerChainAngles = new Array(28).fill(this.flamethrowerCastAngle || 0); this.flamethrowerFlipY = Math.cos(this.flamethrowerCastAngle || 0) < -0.15 ? -1 : 1; this._smoothMouthX = undefined; this._smoothMouthY = undefined;
    if (this.flamethrowerHitEnemies) {
      this.flamethrowerHitEnemies.clear();
    }
    this.meleeMoveState = null;
    this.meleeMoveKey = null;
    this.specialCastTimer = 0;
    this.actionAnimTimer = 0;
    if (this.animState === 'special' || this.animState === 'attack') {
      this.animState = 'idle';
    }
    this.z = 0;
    if (typeof super.interruptAttacks === 'function') {
      super.interruptAttacks(forceCancelAll);
    }
  }

  /**
   * Initiates Pikachu's canonical Thunderbolt:
   * Phase 1 (Windup / "PIKA..."): Coils, cheek pouches spark violently with gathered electricity (~0.40s).
   * Phase 2 (Beam / "...CHUUUUUU!"): Massive concentrated beam of yellow lightning blasts toward target for ~1s with multi-tick damage & pushback!
   * Phase 3 (Aftermath Stun & Recovery): All victims caught in the beam suffer full electric shock stun aftermath (~0.75s).
   */
  /**
   * Evaluates if Ash has won the match or round.
   */
  _isOwnerVictory(opponent = null) {
    if (!this.owner || this.owner.hp <= 0 || this.owner.dead || this.owner.isDead) return false;
    if (this.hp <= 0 || this.isFainting) return false;

    if (typeof state !== 'undefined' && state) {
      if (state.gameState === 'roundEnd' || state.gameState === 'matchEnd') {
        const winner = state.matchWinner || state.roundWinner;
        if (!winner) return true;
        if (winner === this.owner || winner === this) return true;
        if (typeof state.getFighterTeam === 'function' && Array.isArray(state.fighters)) {
          const ownerIdx = state.fighters.indexOf(this.owner);
          const winnerIdx = state.fighters.indexOf(winner);
          if (ownerIdx !== -1 && winnerIdx !== -1) {
            return state.getFighterTeam(ownerIdx) === state.getFighterTeam(winnerIdx);
          }
        }
        return true;
      }

      if (Array.isArray(state.fighters) && state.fighters.length > 1) {
        const enemies = this.owner._getValidEnemyTargets ? this.owner._getValidEnemyTargets(opponent) : [];
        if (enemies.length === 0) {
          return true;
        }
      }
    }

    if (opponent && (opponent.dead || opponent.isDead || opponent.hp <= 0)) {
      return true;
    }

    return false;
  }

  /**
   * Handles active Pokémon victory celebration state.
   * Introduces a natural pause/delay (~45 frames, 0.75s) before triggering the pose animation,
   * preventing abrupt instantaneous pose snaps immediately upon landing the KO.
   */
  handleVictoryState(opponent = null) {
    this.interruptAttacks();
    this.z = 0;

    const cfg = _getAshCfg();
    const delayFrames = cfg?.victoryPoseDelayFrames ?? 45;

    // Initialize victory delay countdown on first victory frame
    if (this.victoryPoseDelayTimer === -1 || this.victoryPoseDelayTimer === undefined) {
      this.victoryPoseDelayTimer = delayFrames;
    }

    if (this.victoryPoseDelayTimer > 0) {
      this.victoryPoseDelayTimer--;
      this.vx *= 0.82;
      this.vy *= 0.82;
      if (Math.hypot(this.vx, this.vy) < 0.1) {
        this.vx = 0;
        this.vy = 0;
      }
      if (this.animState !== 'idle' && this.animState !== 'walk') {
        this.animState = 'idle';
      }
      return;
    }

    // Victory delay elapsed: halt completely and trigger dedicated victory animation
    this.vx = 0;
    this.vy = 0;
    if (this.speciesId === 'pikachu') {
      this.animState = 'pose';
    } else if (this.speciesId === 'charizard') {
      this.animState = 'sleep';
    } else if (this.speciesId === 'greninja') {
      this.animState = 'rearUp';
    } else if (this.speciesId === 'lucario') {
      this.animState = 'tumbleback';
    } else {
      this.animState = 'victory';
    }

    if (opponent && typeof opponent.x === 'number') {
      const winAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      this.gunAngle = winAngle;
      this.angle = winAngle;
    }
  }

  startThunderbolt(target, isTrainerCommand = false) {
    if (this.hp <= 0 || this.thunderboltState) return;
    const specSkill = this.spec.skills?.special;
    const castAngle = target
      ? Math.atan2(target.y - this.y, target.x - this.x)
      : (this.gunAngle || this.angle || 0);

    this.thunderboltState = 'windup';
    this.thunderboltTimer = specSkill?.windupFrames || 24;
    this.thunderboltMaxWindup = this.thunderboltTimer;
    this.thunderboltTarget = target;
    this.thunderboltCastAngle = castAngle;
    this.gunAngle = castAngle;
    this.angle = castAngle;
    this.animState = 'special';
    this.actionAnimTimer = this.thunderboltTimer + (specSkill?.beamDurationFrames || 58) + 16;
    this.animTick = 0;
    this.thunderboltCmdMult = isTrainerCommand ? (_getAshCfg().commandDamageBonus || 1.25) : 1.0;
    const cd = this.specialCooldownMax || this.owner?.commandCooldownMax || 135;
    this.specialCooldown = cd;
    this.isSpecialOnInitialCooldown = false;
    if (this.owner) {
      this.owner.commandCooldown = cd;
    }
    this.thunderboltCurrentBeamLen = null;
    this.thunderboltClosestEnemy = null;
    this.thunderboltImpactTimer = undefined;
    if (this.thunderboltHitEnemies) {
      this.thunderboltHitEnemies.clear();
    }

    // Tension coil brake: Pikachu plants its feet firmly to charge electricity
    this.vx = 0;
    this.vy = 0;

    // Iconic Phase 1 Callout: "PIKA..."
    const windupCallout = specSkill?.windupCallout || 'PIKA...';
    spawnFloatingText(this.x, this.y - this.r - 20, windupCallout, this.themeColor || '#FACC15');
    if (this.owner) {
      this.owner._playMoveAudioSequence(specSkill?.specialSfx || 'thunderbolt');
    }
  }

  /**
   * Initiates Charizard's canonical Flamethrower:
   * Phase 1 (Windup / "CHAR..."): Deep inhale & throat fire gathering (~0.45s), feet planted steady, aim locked.
   * Phase 2 (Active Fire Stream / "...ROOOAAAR!"): Sustained 2-second continuous raging flame torrent (120 frames at 60 FPS) with multi-tick damage & burn status!
   * Phase 3 (Breather / Smoke Exhale Recovery): Stationary breather settle (~0.40s) cooling down before moving again.
   */
  startFlamethrower(target, isTrainerCommand = false) {
    if (this.hp <= 0 || this.flamethrowerState || this.thunderboltState) return;
    const specSkill = this.spec.skills?.special;
    const castAngle = target
      ? Math.atan2(target.y - this.y, target.x - this.x)
      : (this.gunAngle || this.angle || 0);

    this.flamethrowerState = 'windup';
    this.flamethrowerTimer = specSkill?.windupFrames || 28;
    this.flamethrowerMaxWindup = this.flamethrowerTimer;
    this.flamethrowerTarget = target;
    this.flamethrowerCastAngle = castAngle;
    this.gunAngle = castAngle;
    this.angle = castAngle;
    this.animState = 'special';
    this.actionAnimTimer = this.flamethrowerTimer + (specSkill?.streamDurationFrames || 120) + (specSkill?.recoveryFrames || 24);
    this.animTick = 0;
    this.flamethrowerCmdMult = isTrainerCommand ? (_getAshCfg().commandDamageBonus || 1.25) : 1.0;
    const cd = this.specialCooldownMax || this.owner?.commandCooldownMax || 135;
    this.specialCooldown = cd;
    this.isSpecialOnInitialCooldown = false;
    if (this.owner) {
      this.owner.commandCooldown = cd;
    }
    this.flamethrowerCurrentBeamLen = null;
    this.flamethrowerClosestEnemy = null;
    this.flamethrowerImpactTimer = undefined; this.flamethrowerChainAngles = new Array(28).fill(this.flamethrowerCastAngle || 0); this.flamethrowerFlipY = Math.cos(this.flamethrowerCastAngle || 0) < -0.15 ? -1 : 1; this._smoothMouthX = undefined; this._smoothMouthY = undefined;
    if (this.flamethrowerHitEnemies) {
      this.flamethrowerHitEnemies.clear();
    }

    // Steady planted stance: Charizard plants feet firmly on the ground
    this.vx = 0;
    this.vy = 0;
    this.z = 0;

    // Iconic Phase 1 Callout: "CHAR..."
    const windupCallout = specSkill?.windupCallout || 'CHAR...';
    spawnFloatingText(this.x, this.y - this.r - 20, windupCallout, this.themeColor || '#F97316');
    _playAshSound(specSkill?.specialSfx || 'flamethrower');
  }

  takeDamage(amount, attacker, opts = {}) {
    // If already fainting or dead, ignore further damage
    if (this.isFainting || this.hp <= 0) {
      return false;
    }

    // Friendly-fire immunity from owner Ash
    if (attacker && (attacker === this.owner || (attacker.teamId !== undefined && this.teamId !== undefined && attacker.teamId === this.teamId))) {
      return false;
    }
    const isCasting = this.isCastingSkill();
    const effectiveOpts = isCasting
      ? { ...opts, skipKnockback: true, skipInterrupt: true, skipHitStun: true }
      : opts;
    const landed = super.takeDamage(amount, attacker, effectiveOpts);
    if (landed) {
      applyPokemonDamageHitEffects(this, attacker, effectiveOpts);
      if (this.hp <= 0) {
        this.startFaint();
      } else if (!isCasting) {
        this.hurtAnimTimer = 14;
        this.hurtTick = 0;
        this.animState = 'hurt';
        this.actionAnimTimer = 0; // Interrupt basic melee strike windup so hurt reaction is crisp and visible
      }
    }
    return landed;
  }

  /**
   * Overrides base Fighter.onDeath() to suppress default bloody explosion and body shatter shards.
   * Pokémon do not bleed or shatter into geometric shards; they smoothly faint and return to Poké Balls.
   */
  onDeath() {
    if (!this.isFainting) {
      this.startFaint();
    }
  }

  startFaint() {
    if (this.isFainting) return;
    this.isFainting = true;
    this.hp = 0;
    this.dead = true;
    this.isDead = true;
    this.hitFlashTimer = 0;
    this.faintTick = 0;
    this.maxFaintTicks = 48;
    this.faintCompleted = false;
    this.animState = 'faint';
    this.faintAngle = this.gunAngle || this.angle || 0;
    this.interruptAttacks(true);

    if (!this._faintSoundPlayed) {
      this._faintSoundPlayed = true;
      _playAshSound('faint');
    }

    // Initial fainting momentum: slide gently to a stop
    this.vx *= 0.35;
    this.vy *= 0.35;
  }

  updateFaint(arena) {
    this.faintTick = (this.faintTick || 0) + 1;
    this.animState = 'faint';

    // Slide smoothly to a halt
    this.vx *= 0.85;
    this.vy *= 0.85;
    if (Math.hypot(this.vx, this.vy) < 0.05) {
      this.vx = 0;
      this.vy = 0;
    }
    this.x += this.vx;
    this.y += this.vy;

    if (arena) {
      this.resolveWallBounce(arena);
    }

    // Trigger recall beam around tick 26 (once Pokémon has collapsed to the ground)
    if (this.faintTick === 26 && this.owner) {
      this.owner._triggerPokemonRecall?.(this);
    }

    if (this.faintTick >= this.maxFaintTicks) {
      this.faintCompleted = true;
      if (this.owner) {
        this.owner._onActivePokemonFainted?.(this);
      }
    }
  }

  update(opponent, ownerIndex, arena) {
    this.animTick = (this.animTick || 0) + 1;

    // Rule 1.9 / Rule 25: Decay transient visual effects at top of update
    this._updateVisualExplosions?.();
    this._updateVisualEffects?.();

    if (this.isFainting) {
      this.updateFaint(arena);
      return;
    }

    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    if (this.hp <= 0) {
      this.startFaint();
      return;
    }

    // Match Victory Check: Active Pokémon stays in arena and plays its victory animation after a brief delay
    if (this._isOwnerVictory(opponent)) {
      this.handleVictoryState(opponent);
      return;
    }

    // ── Pokémon Summon Entrance Animation & VFX Phase (Stationary Pose Before Moving) ──
    if (this.summonIntroTimer > 0) {
      // Allow synthetic Frame-1 test overrides (where specialCooldown or meleeCooldown is forced to 0) to bypass intro
      if (this.specialCooldown <= 0 || this.meleeCooldown <= 0) {
        this.summonIntroTimer = 0;
        this.isSummonIntro = false;
      } else {
        this.handleStatusEffects();
        this.summonIntroTimer--;
        this.isSummonIntro = this.summonIntroTimer > 0;
        this.vx = 0;
        this.vy = 0;
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        this.z = 0;

        const introTarget = this._acquireTarget(opponent);
        if (introTarget && introTarget.hp > 0) {
          const introAngle = Math.atan2(introTarget.y - this.y, introTarget.x - this.x);
          this.gunAngle = introAngle;
          this.angle = introAngle;
        }

        if (this.summonIntroTimer > 0) {
          if (this.speciesId === 'pikachu') {
            this.animState = 'pose';
          } else if (this.speciesId === 'charizard') {
            this.animState = 'special';
          } else if (this.speciesId === 'greninja' || this.speciesId === 'lucario') {
            this.animState = 'rearUp';
          } else {
            this.animState = 'idle';
          }
          return;
        }

        // Summon entrance finished: transition to combat pursuit & launch movement
        this.isSummonIntro = false;
        this.animState = 'idle';
        const moveAngle = this.gunAngle || this.launchAngle || 0;
        this.vx = Math.cos(moveAngle) * this.speed;
        this.vy = Math.sin(moveAngle) * this.speed;
        return;
      }
    }

    this.handleStatusEffects();
    if (!this.meleeMoveState && !this.thunderboltState && !this.flamethrowerState && this.meleeCooldown > 0) {
      this.meleeCooldown--;
    }
    if (!this.thunderboltState && !this.flamethrowerState && this.specialCooldown > 0) {
      this.specialCooldown--;
      if (this.specialCooldown <= 0) {
        this.isSpecialOnInitialCooldown = false;
      }
    }
    if (this.actionAnimTimer > 0) this.actionAnimTimer--;
    if (this.specialCastTimer > 0) this.specialCastTimer--;
    if (this.isCastingSkill()) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
    }
    if (this.hurtAnimTimer > 0) {
      this.hurtAnimTimer--;
      this.hurtTick = (this.hurtTick || 0) + 1;
    }
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer--;
    }
    if (typeof this.thunderboltImpactTimer === 'number') {
      this.thunderboltImpactTimer++;
    }
    if (typeof this.flamethrowerImpactTimer === 'number') {
      this.flamethrowerImpactTimer++;
    }

    // ── Pikachu Thunderbolt Windup, Sustained Active Beam, and Recovery Lifecycle ──
    if (this.thunderboltState) {
      const specSkill = this.spec.skills?.special;
      const target = this.thunderboltTarget || opponent;

      if (this.thunderboltState === 'windup') {
        this.thunderboltTimer--;
        this.animState = 'special';
        this.gunAngle = this.thunderboltCastAngle;
        this.angle = this.thunderboltCastAngle;
        this.vx = 0;
        this.vy = 0;

        // High-voltage cheek pouch charging micro-rumble
        if (this.thunderboltTimer % 5 === 0) {
          triggerGlobalScreenShake(1.6, 3);
        }

        if (this.thunderboltTimer <= 0) {
          this.thunderboltState = 'active';
          this.thunderboltTimer = specSkill?.beamDurationFrames || 58;
          this.thunderboltMaxActive = this.thunderboltTimer;

          // Iconic Phase 2 Callout: "...CHUUUUUU!"
          const attackCallout = specSkill?.attackCallout || '...CHUUUUUU!';
          spawnFloatingText(this.x, this.y - this.r - 20, attackCallout, '#FEF08A');
          triggerGlobalScreenShake(specSkill?.screenShake || 5.0, 10);
        }
      } else if (this.thunderboltState === 'active') {
        this.thunderboltTimer--;
        this.animState = 'special';

        // Rule 1.4: Aim rotation is disabled during Thunderbolt cast — strictly clamp angle to committed castAngle
        this.gunAngle = this.thunderboltCastAngle;
        this.angle = this.thunderboltCastAngle;

        // Stationary stance: Pikachu plants feet firmly on the ground while discharging Thunderbolt (zero recoil drift)
        const recoil = specSkill?.recoilPush || 0;
        if (recoil > 0) {
          this.vx = -Math.cos(this.thunderboltCastAngle) * recoil;
          this.vy = -Math.sin(this.thunderboltCastAngle) * recoil;
        } else {
          this.vx = 0;
          this.vy = 0;
        }

        if (this.thunderboltTimer % 4 === 0) {
          triggerGlobalScreenShake(specSkill?.screenShake || 5.0, 3);
        }

        // Calculate beam length: stops at first enemy hit (does NOT penetrate/pass through)
        // and strictly clamped to arena walls when missing so it NEVER clips outside the arena.
        const maxSkillRange = specSkill?.beamRange || 680;
        const curArena = arena || (typeof state !== 'undefined' ? state.arena : null);
        const cosA = Math.cos(this.thunderboltCastAngle);
        const sinA = Math.sin(this.thunderboltCastAngle);
        const startX = this.x + cosA * (this.r * 0.7);
        const startY = this.y - 12 + sinA * (this.r * 0.7);
        const wallDist = curArena ? _getRayArenaIntersection(startX, startY, this.thunderboltCastAngle, curArena, 8) : maxSkillRange;
        const beamRange = Math.min(maxSkillRange, Math.max(10, wallDist));
        const beamW = specSkill?.beamWidth || 42;

        // Find closest enemy along the beam path (prioritizing active enemy Pokémon in Pokémon battles)
        let closestHitEnemy = null;
        let closestHitDist = beamRange;
        let closestHitPokemon = null;
        let closestHitPokemonDist = beamRange;
        const validEnemies = this.owner ? this.owner._getValidEnemyTargets(this.thunderboltTarget) : [];

        for (const enemy of validEnemies) {
          if (!enemy || enemy.hp <= 0) continue;
          const enemyR = enemy.r || 25;
          const edx = enemy.x - startX;
          const edy = enemy.y - startY;
          const projDist = edx * cosA + edy * sinA;
          // Must be in front of Pikachu along the cast angle within wall-clamped beamRange
          if (projDist >= -enemyR && projDist <= beamRange + enemyR) {
            const perpDist = Math.abs(-edx * sinA + edy * cosA);
            if (perpDist <= (beamW / 2) + enemyR) {
              const hitContactDist = Math.max(0, projDist);
              if (isActivePokemonTarget(enemy)) {
                if (hitContactDist < closestHitPokemonDist) {
                  closestHitPokemonDist = hitContactDist;
                  closestHitPokemon = enemy;
                }
              } else if (hitContactDist < closestHitDist) {
                closestHitDist = hitContactDist;
                closestHitEnemy = enemy;
              }
            }
          }
        }
        if (closestHitPokemon) {
          closestHitEnemy = closestHitPokemon;
          closestHitDist = closestHitPokemonDist;
        }
        // Cache beam length for rendering so visual lightning terminates exactly at the hit enemy
        // or strictly at the arena wall boundary (zero clipping outside arena)
        this.thunderboltCurrentBeamLen = closestHitEnemy ? closestHitDist : beamRange;
        this.thunderboltClosestEnemy = closestHitEnemy;

        // Trigger the 12-frame impact VFX only ONCE per strike when the lightning first connects with the target
        if (closestHitEnemy && this.thunderboltImpactTimer === undefined) {
          this.thunderboltImpactTimer = 0; // Starts 1-shot 12-frame impact animation
        }

        // Multi-tick continuous lightning collision on the hit target
        const tickRate = specSkill?.beamTickRate || 5;
        if (this.thunderboltTimer % tickRate === 0 && this.owner && closestHitEnemy) {
          const bonusMult = (this.thunderboltCmdMult || 1.0);
          const dmg = Math.round((specSkill?.beamDamagePerTick || 4) * bonusMult);

          if (this.thunderboltHitEnemies) {
            this.thunderboltHitEnemies.add(closestHitEnemy);
          }
          this.owner._dealPokemonDamage(closestHitEnemy, dmg, {
            angle: this.thunderboltCastAngle,
            knockback: specSkill?.beamKnockbackPerTick || 1.6,
            paralyzeFrames: specSkill?.paralyzeFramesPerTick || 20,
            isSpecial: true
          });

          // Apply active electric shock & stasis while trapped inside beam
          closestHitEnemy.electricStunTimer = Math.max(closestHitEnemy.electricStunTimer || 0, 18);
          closestHitEnemy.paralyzeTimer = Math.max(closestHitEnemy.paralyzeTimer || 0, 18);
          closestHitEnemy.isParalyzed = true;
          if (typeof closestHitEnemy.applyTimeStop === 'function') closestHitEnemy.applyTimeStop(18);
          if (typeof closestHitEnemy.applyParalyze === 'function') closestHitEnemy.applyParalyze(18);
          spawnSparks(closestHitEnemy.x, closestHitEnemy.y, 4, 'gold', '#FACC15');
        }

        if (this.thunderboltTimer <= 0) {
          this.thunderboltState = 'recovery';
          this.thunderboltTimer = specSkill?.recoveryFrames || 16;

          // Apply Stun Effect Aftermath on all victims caught in the beam
          const stunAftermath = specSkill?.stunAftermathFrames || 45;
          if (this.thunderboltHitEnemies) {
            for (const enemy of this.thunderboltHitEnemies) {
              if (enemy && enemy.hp > 0) {
                enemy.electricStunTimer = Math.max(enemy.electricStunTimer || 0, stunAftermath);
                enemy.paralyzeTimer = Math.max(enemy.paralyzeTimer || 0, stunAftermath);
                enemy.isParalyzed = true;
                if (typeof enemy.applyTimeStop === 'function') enemy.applyTimeStop(stunAftermath);
                if (typeof enemy.applyParalyze === 'function') enemy.applyParalyze(stunAftermath);
                enemy.vx *= 0.2;
                enemy.vy *= 0.2;
              }
            }
            this.thunderboltHitEnemies.clear();
          }
        }
      } else if (this.thunderboltState === 'recovery') {
        this.thunderboltTimer--;
        this.animState = 'idle';
        this.gunAngle = this.thunderboltCastAngle;
        this.angle = this.thunderboltCastAngle;
        this.vx = 0;
        this.vy = 0;
        if (this.thunderboltTimer <= 0) {
          this.thunderboltState = null;
          this.thunderboltCurrentBeamLen = null;
          this.thunderboltClosestEnemy = null;
          this.thunderboltImpactTimer = undefined;
          const cd = this.specialCooldownMax || this.owner?.commandCooldownMax || 135;
          this.specialCooldown = cd;
          if (this.owner) {
            this.owner.commandCooldown = cd;
          }
          // Resume natural bounce velocity immediately upon exiting Thunderbolt
          const resumeAngle = this.thunderboltCastAngle + (Math.random() - 0.5) * 1.0;
          this.vx = Math.cos(resumeAngle) * this.speed;
          this.vy = Math.sin(resumeAngle) * this.speed;
        }
      }

      // Plant feet firmly: zero velocity and zero recoil displacement while casting Thunderbolt
      this.vx = 0;
      this.vy = 0;
      if (this.thunderboltState) {
        this.gunAngle = this.thunderboltCastAngle;
        this.angle = this.thunderboltCastAngle;
      }
      this.resolveWallBounce(arena, target);
      return;
    }

    // ── Charizard Flamethrower Windup, Steady 2-Second Active Flame Torrent, and Breather Lifecycle ──
    if (this.flamethrowerState) {
      const specSkill = this.spec.skills?.special;
      const target = this.flamethrowerTarget || opponent;

      if (this.flamethrowerState === 'windup') {
        this.flamethrowerTimer--;
        this.animState = 'special';
        this.gunAngle = this.flamethrowerCastAngle;
        this.angle = this.flamethrowerCastAngle;
        this.vx = 0;
        this.vy = 0;
        this.z = 0;

        // Throat fire gathering micro-rumble
        if (this.flamethrowerTimer % 6 === 0) {
          triggerGlobalScreenShake(1.6, 2);
        }

        if (this.flamethrowerTimer <= 0) {
          this.flamethrowerState = 'active';
          this.flamethrowerTimer = specSkill?.streamDurationFrames || 120;
          this.flamethrowerMaxActive = this.flamethrowerTimer;

          // Iconic Phase 2 Callout: "...ROOOAAAR!"
          const attackCallout = specSkill?.attackCallout || '...ROOOAAAR!';
          spawnFloatingText(this.x, this.y - this.r - 20, attackCallout, '#F97316');
          triggerGlobalScreenShake(specSkill?.screenShake || 4.5, 12);
        }
      } else if (this.flamethrowerState === 'active') {
        this.flamethrowerTimer--;
        this.animState = 'special';

        // Dynamic 360° aim tracking while firing Flamethrower (prioritizing active enemy Pokémon)
        const priorityTarget = this._acquireTarget(opponent);
        const activeTarget = (
          priorityTarget &&
          isActivePokemonTarget(priorityTarget) &&
          !isActivePokemonTarget(this.flamethrowerTarget)
        )
          ? priorityTarget
          : (
            (this.flamethrowerTarget && this.flamethrowerTarget.hp > 0 && !this.flamethrowerTarget.isDead && !this.flamethrowerTarget.isFainting)
              ? this.flamethrowerTarget
              : priorityTarget
          );

        if (activeTarget && activeTarget.hp > 0 && !activeTarget.isDead && (this.timeStopTimer || 0) <= 0 && !this.isTargetOfAmbush) {
          this.channelTurnRate = specSkill?.streamTurnRate ?? specSkill?.turnRate ?? 0.085;
          this.aim(activeTarget);
          this.flamethrowerCastAngle = this.gunAngle;
          this.flamethrowerTarget = activeTarget;
        } else {
          this.gunAngle = this.flamethrowerCastAngle;
          this.angle = this.flamethrowerCastAngle;
        }

        // Steady planted stance: Charizard plants feet firmly on the ground with zero drift or recoil slip
        this.vx = 0;
        this.vy = 0;
        this.z = 0;

        if (this.flamethrowerTimer % 4 === 0) {
          triggerGlobalScreenShake(specSkill?.screenShake || 4.5, 3);
        }

        // Fixed-size Flamethrower stream: constant length & width (never resizes based on enemy or wall distance)
        const fixedStreamLen = specSkill?.fixedStreamLength || 260;
        const cosA = Math.cos(this.flamethrowerCastAngle);
        const sinA = Math.sin(this.flamethrowerCastAngle);
        const mouthOffset = (updateCharizardFlameChain(this, this.flamethrowerCastAngle), getCharizardMouthLocalOffset(this, this.flamethrowerCastAngle));
        const startX = this.x + mouthOffset.originX;
        const startY = this.y - (this.z || 0) + mouthOffset.originY;
        const streamRange = fixedStreamLen;
        const streamW = specSkill?.streamWidth || 48;

        // Find closest enemy along the fixed-length flame path (prioritizing active enemy Pokémon in Pokémon battles)
        let closestHitEnemy = null;
        let closestHitDist = streamRange;
        let closestHitPokemon = null;
        let closestHitPokemonDist = streamRange;
        const validEnemies = this.owner ? this.owner._getValidEnemyTargets(this.flamethrowerTarget) : [];

        for (const enemy of validEnemies) {
          if (!enemy || enemy.hp <= 0) continue;
          const enemyR = enemy.r || 25;
          const edx = enemy.x - startX;
          const edy = enemy.y - startY;
          const projDist = edx * cosA + edy * sinA;
          if (projDist >= -enemyR && projDist <= streamRange + enemyR) {
            const perpDist = Math.abs(-edx * sinA + edy * cosA);
            if (perpDist <= (streamW / 2) + enemyR) {
              const hitContactDist = Math.max(0, projDist);
              if (isActivePokemonTarget(enemy)) {
                if (hitContactDist < closestHitPokemonDist) {
                  closestHitPokemonDist = hitContactDist;
                  closestHitPokemon = enemy;
                }
              } else if (hitContactDist < closestHitDist) {
                closestHitDist = hitContactDist;
                closestHitEnemy = enemy;
              }
            }
          }
        }
        if (closestHitPokemon) {
          closestHitEnemy = closestHitPokemon;
          closestHitDist = closestHitPokemonDist;
        }

        this.flamethrowerCurrentBeamLen = fixedStreamLen;
        this.flamethrowerClosestEnemy = closestHitEnemy;

        const slowFrames = specSkill?.slowDurationFrames || 90;
        const slowMult = specSkill?.slowMultiplier ?? 0.45;

        if (closestHitEnemy) {
          if (this.flamethrowerImpactTimer === undefined) {
            this.flamethrowerImpactTimer = 0;
          }
          // Continuously apply slow debuff to enemy caught in Charizard's Flamethrower
          if (closestHitEnemy.statusEffects && typeof closestHitEnemy.statusEffects.applySlow === 'function') {
            closestHitEnemy.statusEffects.applySlow(slowFrames, slowMult);
          } else if (typeof closestHitEnemy.applySlow === 'function') {
            closestHitEnemy.applySlow(slowFrames, slowMult);
          }
          closestHitEnemy.slowTimer = Math.max(closestHitEnemy.slowTimer || 0, slowFrames);
          closestHitEnemy.slowMultiplier = slowMult;
        }

        // Multi-tick continuous flame damage, burning & slow debuff on the hit target
        const tickRate = specSkill?.streamTickRate || 6;
        if (this.flamethrowerTimer % tickRate === 0 && this.owner && closestHitEnemy) {
          const bonusMult = (this.flamethrowerCmdMult || 1.0);
          const dmg = Math.round((specSkill?.streamDamagePerTick || 3) * bonusMult);

          if (this.flamethrowerHitEnemies) {
            this.flamethrowerHitEnemies.add(closestHitEnemy);
          }
          this.owner._dealPokemonDamage(closestHitEnemy, dmg, {
            angle: this.flamethrowerCastAngle,
            knockback: specSkill?.streamKnockbackPerTick || 1.2,
            slowFrames,
            slowMultiplier: slowMult,
            isSpecial: true
          });

          // Apply burning status condition
          const burnDps = specSkill?.burnDps || 6;
          const burnFrames = specSkill?.burnDurationFrames || 180;
          closestHitEnemy.burnTimer = Math.max(closestHitEnemy.burnTimer || 0, burnFrames);
          closestHitEnemy.burnDps = burnDps;
          closestHitEnemy.isBurning = true;

          spawnSparks(closestHitEnemy.x, closestHitEnemy.y, 5, 'fire', '#F97316');
        }

        if (this.flamethrowerTimer <= 0) {
          this.flamethrowerState = 'recovery';
          this.flamethrowerTimer = specSkill?.recoveryFrames || 24;
          spawnFloatingText(this.x, this.y - this.r - 20, '*PHEW...*', '#94A3B8');
          if (this.flamethrowerHitEnemies) {
            this.flamethrowerHitEnemies.clear();
          }
        }
      } else if (this.flamethrowerState === 'recovery') {
        // Phase 3: Breather first before moving again
        this.flamethrowerTimer--;
        this.animState = 'special';
        this.gunAngle = this.flamethrowerCastAngle;
        this.angle = this.flamethrowerCastAngle;
        this.vx = 0;
        this.vy = 0;
        this.z = 0;

        if (this.flamethrowerTimer <= 0) {
          this.flamethrowerState = null;
          this.flamethrowerCurrentBeamLen = null;
          this.flamethrowerClosestEnemy = null;
          this.flamethrowerImpactTimer = undefined; this.flamethrowerChainAngles = new Array(28).fill(this.flamethrowerCastAngle || 0); this.flamethrowerFlipY = Math.cos(this.flamethrowerCastAngle || 0) < -0.15 ? -1 : 1; this._smoothMouthX = undefined; this._smoothMouthY = undefined;
          const cd = this.specialCooldownMax || this.owner?.commandCooldownMax || 135;
          this.specialCooldown = cd;
          if (this.owner) {
            this.owner.commandCooldown = cd;
          }
          // Resume natural bounce velocity immediately upon completing breather
          const resumeAngle = this.flamethrowerCastAngle + (Math.random() - 0.5) * 1.0;
          this.vx = Math.cos(resumeAngle) * this.speed;
          this.vy = Math.sin(resumeAngle) * this.speed;
        }
      }

      // Steady planted stance: zero velocity and zero recoil displacement while casting Flamethrower
      this.vx = 0;
      this.vy = 0;
      this.z = 0;
      if (this.flamethrowerState) {
        this.gunAngle = this.flamethrowerCastAngle;
        this.angle = this.flamethrowerCastAngle;
      }
      this.resolveWallBounce(arena, target);
      return;
    }

    // ── Dedicated Close Combat Multi-Phase Combo Lifecycles (Rule 30) ──
    // Pokémon continues moving and rebouncing off walls & entity collisions like a standard Fighter while executing melee attacks
    if (this.meleeMoveState) {
      const target = this._acquireTarget(opponent);
      this._updateMeleeMove(target, arena);
    }

    // Acquire priority enemy target (focusing active enemy Pokémon first in Pokémon battles)
    const target = this._acquireTarget(opponent);
    if (target && target.hp > 0) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      const targetAngle = Math.atan2(dy, dx);
      this.gunAngle = targetAngle;
      this.angle = targetAngle;

      const reach = (this.spec.meleeReach || 68) + (target.r || 25);

      // 1. Signature Special Skill Priority: When the skill is ready, ALWAYS unleash the signature special move!
      if (this.specialCooldown <= 0 && !this.thunderboltState && !this.flamethrowerState && !this.meleeMoveState) {
        if (this.owner && typeof this.owner._executePokemonSpecial === 'function') {
          this.owner._executePokemonSpecial(this, target, false);
        } else {
          const cd = this.specialCooldownMax || this.owner?.commandCooldownMax || 135;
          this.specialCooldown = cd;
          this.isSpecialOnInitialCooldown = false;
          if (this.owner) this.owner.commandCooldown = cd;
          if (this.speciesId === 'pikachu' && typeof this.startThunderbolt === 'function') {
            this.startThunderbolt(target, false);
          } else if (this.speciesId === 'charizard' && typeof this.startFlamethrower === 'function') {
            this.startFlamethrower(target, false);
          }
        }
      }
      // 2. Close Range (Special on cooldown) -> Melee Combo Strike while preserving natural bounce physics!
      else if (dist <= reach + 20 && this.meleeCooldown <= 0 && !this.meleeMoveState) {
        this._startCloseCombatMove(target);
      }
    }

    // Centralized Pokémon companion movement physics & animation state (pokemonTrainerSystem.js)
    updatePokemonCompanionMovement(this, target, arena);
    updatePokemonCompanionAnimState(this);

    super.update(target, ownerIndex, arena);
  }

  /**
   * Overrides base Fighter._decrementSkillCooldowns() and _tickCooldowns() to prevent
   * generic property scanning (key.endsWith('Cooldown')) from double-decrementing companion cooldowns.
   * Companion cooldowns (melee, special, initial) are updated with precise channeling & stasis gating in update().
   */
  _decrementSkillCooldowns() {}

  _tickCooldowns() {}

  _startCloseCombatMove(target, forcedMoveKey = null, isTrainerCommand = false) {
    if (!target || target.hp <= 0) return;
    this.meleeCooldown = this.meleeCooldownMax;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const angle = Math.atan2(dy, dx);
    this.gunAngle = angle;
    this.angle = angle;
    this.meleeCastAngle = angle;
    this.meleeTarget = target;
    if (target && typeof target.x === 'number') {
      this.meleeTargetLastPos = { x: target.x, y: target.y };
    }
    this.meleeMoveTick = 0;
    this.meleeHitDone = new Set();
    this.isTrainerCommandMove = isTrainerCommand;
    this.comboStep = (this.comboStep || 0) + 1;
    this.z = 0; // Reset airborne offset upon initiating any melee skill

    let moveKey = forcedMoveKey;
    if (!moveKey) {
      if (this.speciesId === 'pikachu') {
        moveKey = (this.comboStep % 2 === 1) ? 'quickAttack' : 'ironTail';
      } else if (this.speciesId === 'charizard') {
        moveKey = 'dragonClaw';
      } else if (this.speciesId === 'greninja') {
        moveKey = 'nightSlash';
      } else {
        moveKey = 'closeCombat';
      }
    }
    this.meleeMoveKey = moveKey;
    this.meleeMoveState = 'windup';
    this.animState = 'attack';
    this.actionAnimTimer = 40;
    this.animTick = 0;

    let calloutText = null;
    if (moveKey === 'quickAttack') {
      calloutText = 'QUICK ATTACK!';
      _playAshSound('quickAttack');
    } else if (moveKey === 'ironTail') {
      calloutText = 'IRON TAIL!';
      _playAshSound('ironTail');
    } else if (moveKey === 'dragonClaw') {
      calloutText = 'DRAGON CLAW!';
      _playAshSound('dragonClaw');
    } else if (moveKey === 'nightSlash') {
      calloutText = 'NIGHT SLASH!';
      _playAshSound('nightSlash');
    } else if (moveKey === 'closeCombat') {
      calloutText = 'CLOSE COMBAT!';
      _playAshSound('machPunch');
    }

    if (calloutText) {
      spawnFloatingText(this.x, this.y - this.r - 22, calloutText, this.themeColor || '#FACC15');
    }
  }

  _updateMeleeMove(target, arena) {
    this.meleeMoveTick = (this.meleeMoveTick || 0) + 1;
    this.animState = 'attack';
    const tick = this.meleeMoveTick;
    const key = this.meleeMoveKey || 'quickAttack';
    const tgt = (target && target.hp > 0) ? target : (this.meleeTarget || target);
    if (tgt && typeof tgt.x === 'number') {
      this.meleeTarget = tgt;
      this.meleeTargetLastPos = { x: tgt.x, y: tgt.y };
    }
    const angle = this.meleeCastAngle || (tgt ? Math.atan2(tgt.y - this.y, tgt.x - this.x) : 0);

    const dmgMult = (this.isTrainerCommandMove ? (_getAshCfg().commandDamageBonus || 1.25) : 1.0);

    if (key === 'quickAttack') {
      this.meleeMoveMaxTicks = 38;

      // ── Stage 1: Crouch & Initial Bounding Hop (ticks 1–12) ──
      if (tick <= 4) {
        this.meleeMoveState = 'windup';
        this.z = 0;
      } else if (tick <= 12) {
        // The Hop: Low-altitude springy bound forward into rhythm
        this.meleeMoveState = 'windup';
        const hopProgress = (tick - 4) / 8; // 0.0 to 1.0
        this.z = Math.sin(hopProgress * Math.PI) * 11; // 0 -> 11px -> 0
        if (tick === 12) {
          this.z = 0;
          _playAshSound('quickAttack');
        }
      }
      // ── Stage 2: The Leapforth & Supersonic Strike Dash (ticks 13–24) ──
      else if (tick <= 24) {
        this.meleeMoveState = 'strike';
        const leapProgress = (tick - 12) / 12; // 0.0 to 1.0
        this.z = Math.sin(leapProgress * Math.PI) * 19; // 0 -> 19px -> 0 (soaring forward leap)

        const dist = tgt ? Math.hypot(tgt.x - this.x, tgt.y - this.y) : 999;
        const hitReach = (this.r || 22) + (tgt?.r || 25) + 16;
        if ((dist <= hitReach || tick === 18) && !this.meleeHitDone.has('quickAttack') && tgt && tgt.hp > 0) {
          this.meleeHitDone.add('quickAttack');
          _playAshSound('hitStrong');
          triggerGlobalScreenShake(3.5, 6);
          const dmg = Math.round(18 * dmgMult);
          if (this.owner) {
            this.owner._dealPokemonDamage(tgt, dmg, { angle, knockback: 10, isSpecial: false, isMelee: true, attacker: this });
            this.owner._spawnRippleEffect(tgt.x, tgt.y, 44, '#FFFFFF', 'rgba(255, 255, 255, 0.24)', 14);
          }
          spawnImpactFlash(tgt.x, tgt.y, '#FFFFFF');
          spawnSparks(tgt.x, tgt.y, 6, 'gold', '#FACC15');
        }
      }
      // ── Stage 3: Impact Lock & Ground Touchdown (ticks 25–32) ──
      else if (tick <= 32) {
        this.meleeMoveState = 'lock';
        this.z = 0;
      }
      // ── Stage 4: Recovery Settle (ticks 33–38) ──
      else if (tick <= 38) {
        this.meleeMoveState = 'recovery';
        this.z = 0;
      } else {
        this.meleeMoveState = null;
        this.meleeMoveKey = null;
        this.z = 0;
        this.actionAnimTimer = 0;
      }
    }
    else if (key === 'ironTail') {
      this.meleeMoveMaxTicks = 48;
      // Phase 1: Air Flip Leap & Hardened Steel Charge (ticks 1–14)
      if (tick <= 14) {
        this.meleeMoveState = 'windup';
        const p = tick / 14;
        this.z = Math.sin(p * Math.PI) * 22;
        if (tick === 14) {
          _playAshSound('ironTailCast');
        }
      }
      // Phase 2: Poised Hold at Apex (ticks 15–17)
      else if (tick <= 17) {
        this.meleeMoveState = 'windup';
        this.z = 22;
      }
      // Phase 3: Heavy Tail Cleave Strike (ticks 18–25)
      else if (tick <= 25) {
        this.meleeMoveState = 'strike';
        const strikeP = (tick - 17) / 8;
        this.z = Math.max(0, 22 * (1 - strikeP));

        if (tick === 20 && !this.meleeHitDone.has('ironTail') && tgt && tgt.hp > 0) {
          this.meleeHitDone.add('ironTail');
          _playAshSound('hitStrong');
          triggerGlobalScreenShake(5.0, 10);
          const dmg = Math.round(28 * dmgMult);
          if (this.owner) {
            this.owner._dealPokemonDamage(tgt, dmg, { angle, knockback: 14, isSpecial: false, isMelee: true, attacker: this });
            this.owner._spawnRippleEffect(tgt.x, tgt.y, 56, '#E2E8F0', 'rgba(226, 232, 240, 0.28)', 18);
          }
          if (typeof tgt.applyHitStun === 'function') tgt.applyHitStun(16);
          spawnImpactFlash(tgt.x, tgt.y, '#E2E8F0');
          spawnSparks(tgt.x, tgt.y, 7, 'silver', '#F8FAFC');
        }
      }
      // Phase 4: Impact Lock (ticks 26–36)
      else if (tick <= 36) {
        this.meleeMoveState = 'lock';
        this.z = 0;
      }
      // Phase 5: Recovery Settle (ticks 37–48)
      else if (tick <= 48) {
        this.meleeMoveState = 'recovery';
        this.z = 0;
      } else {
        this.meleeMoveState = null;
        this.meleeMoveKey = null;
        this.z = 0;
        this.actionAnimTimer = 0;
      }
    } else if (key === 'dragonClaw') {
      this.meleeMoveMaxTicks = 52;
      this.z = 0; // Charizard remains firmly grounded throughout Dragon Claw combo (zero airborne hopping)
      // Phase 1: Coil & Lunge (ticks 1–13)
      if (tick <= 13) {
        this.meleeMoveState = 'windup';
        this.z = 0;
      }
      // Phase 2: Poised Hold (ticks 14–16)
      else if (tick <= 16) {
        this.meleeMoveState = 'windup';
        this.z = 0;
      }
      // Phase 3: Double Rending Claw Cleave (ticks 17–28)
      else if (tick <= 28) {
        this.meleeMoveState = 'strike';
        this.z = 0;

        // Sub-hit 1: Right Claw (tick 19)
        if (tick === 19 && !this.meleeHitDone.has('dragonClaw1') && tgt && tgt.hp > 0) {
          this.meleeHitDone.add('dragonClaw1');
          _playAshSound('hitWeak');
          triggerGlobalScreenShake(2.5, 4);
          const dmg = Math.round(14 * dmgMult);
          if (this.owner) {
            this.owner._dealPokemonDamage(tgt, dmg, { angle: angle - 0.25, knockback: 4, isSpecial: false, isMelee: true, attacker: this });
          }
          if (typeof tgt.applyTimeStop === 'function') tgt.applyTimeStop(6);
          spawnImpactFlash(tgt.x, tgt.y, '#10B981');
          spawnSparks(tgt.x, tgt.y, 4, 'green', '#10B981');
        }

        // Sub-hit 2: Left Claw Cross-Rend (tick 25)
        if (tick === 25 && !this.meleeHitDone.has('dragonClaw2') && tgt && tgt.hp > 0) {
          this.meleeHitDone.add('dragonClaw2');
          _playAshSound('hitStrong');
          triggerGlobalScreenShake(5.5, 10);
          const dmg = Math.round(20 * dmgMult);
          if (this.owner) {
            this.owner._dealPokemonDamage(tgt, dmg, { angle: angle + 0.25, knockback: 12, isSpecial: false, isMelee: true, attacker: this });
            this.owner._spawnRippleEffect(tgt.x, tgt.y, 60, '#10B981', 'rgba(16, 185, 129, 0.22)', 18);
          }
          if (typeof tgt.applyTimeStop === 'function') tgt.applyTimeStop(12);
          spawnImpactFlash(tgt.x, tgt.y, '#10B981');
          spawnSparks(tgt.x, tgt.y, 8, 'green', '#10B981');
        }
      }
      // Phase 4: Impact Lock (ticks 29–40)
      else if (tick <= 40) {
        this.meleeMoveState = 'lock';
        this.z = 0;
      }
      // Phase 5: Recovery Settle (ticks 41–52)
      else if (tick <= 52) {
        this.meleeMoveState = 'recovery';
        this.z = 0;
      } else {
        this.meleeMoveState = null;
        this.meleeMoveKey = null;
        this.z = 0;
        this.actionAnimTimer = 0;
      }
    }
    else if (key === 'nightSlash') {
      this.meleeMoveMaxTicks = 42;
      // Phase 1: Shadow Step Dash (ticks 1–8)
      if (tick <= 8) {
        this.meleeMoveState = 'windup';
        if (tick === 8) {
          _playAshSound('nightSlashCast');
        }
      }
      // Phase 2: Poised Hold (ticks 9–11)
      else if (tick <= 11) {
        this.meleeMoveState = 'windup';
      }
      // Phase 3: Dual Dark-Blade Cross-Cleave (ticks 12–20)
      else if (tick <= 20) {
        this.meleeMoveState = 'strike';

        if (tick === 16 && !this.meleeHitDone.has('nightSlash') && tgt && tgt.hp > 0) {
          this.meleeHitDone.add('nightSlash');
          _playAshSound('hitStrong');
          triggerGlobalScreenShake(4.5, 8);
          const dmg = Math.round(26 * dmgMult);
          if (this.owner) {
            this.owner._dealPokemonDamage(tgt, dmg, { angle, knockback: 10, isSpecial: false, isMelee: true, attacker: this });
            this.owner._spawnRippleEffect(tgt.x, tgt.y, 52, '#8B5CF6', 'rgba(139, 92, 246, 0.24)', 16);
          }
          if (typeof tgt.applyHitStun === 'function') tgt.applyHitStun(14);
          spawnImpactFlash(tgt.x, tgt.y, '#8B5CF6');
          spawnSparks(tgt.x, tgt.y, 6, 'violet', '#C084FC');
        }
      }
      // Phase 4: Impact Lock (ticks 21–30)
      else if (tick <= 30) {
        this.meleeMoveState = 'lock';
      }
      // Phase 5: Recovery Settle (ticks 31–42)
      else if (tick <= 42) {
        this.meleeMoveState = 'recovery';
      } else {
        this.meleeMoveState = null;
        this.meleeMoveKey = null;
        this.actionAnimTimer = 0;
      }
    }
    else {
      // Lucario Close Combat (Infight 4-Hit Flurry Barrage)
      this.meleeMoveMaxTicks = 54;
      // Phase 1: Combat Rush (ticks 1–6)
      if (tick <= 6) {
        this.meleeMoveState = 'windup';
      }
      // Phase 3: Flurry Barrage (ticks 7–30)
      else if (tick <= 30) {
        this.meleeMoveState = 'strike';

        // Hit 1: Left Aura Jab (tick 9)
        if (tick === 9 && !this.meleeHitDone.has('cc1') && tgt && tgt.hp > 0) {
          this.meleeHitDone.add('cc1');
          _playAshSound('machPunch');
          triggerGlobalScreenShake(2.0, 3);
          const dmg = Math.round(5 * dmgMult);
          if (this.owner) this.owner._dealPokemonDamage(tgt, dmg, { angle: angle - 0.15, knockback: 2, isSpecial: false, isMelee: true, attacker: this });
          if (typeof tgt.applyTimeStop === 'function') tgt.applyTimeStop(4);
          spawnSparks(tgt.x, tgt.y, 3, 'cyan', '#22D3EE');
        }
        // Hit 2: Right Aura Hook (tick 16)
        if (tick === 16 && !this.meleeHitDone.has('cc2') && tgt && tgt.hp > 0) {
          this.meleeHitDone.add('cc2');
          _playAshSound('bulletPunch');
          triggerGlobalScreenShake(2.0, 3);
          const dmg = Math.round(5 * dmgMult);
          if (this.owner) this.owner._dealPokemonDamage(tgt, dmg, { angle: angle + 0.15, knockback: 2, isSpecial: false, isMelee: true, attacker: this });
          if (typeof tgt.applyTimeStop === 'function') tgt.applyTimeStop(4);
          spawnSparks(tgt.x, tgt.y, 3, 'cyan', '#22D3EE');
        }
        // Hit 3: Spinning Roundhouse Kick (tick 23)
        if (tick === 23 && !this.meleeHitDone.has('cc3') && tgt && tgt.hp > 0) {
          this.meleeHitDone.add('cc3');
          _playAshSound('machPunch');
          triggerGlobalScreenShake(3.0, 4);
          const dmg = Math.round(6 * dmgMult);
          if (this.owner) this.owner._dealPokemonDamage(tgt, dmg, { angle, knockback: 4, isSpecial: false, isMelee: true, attacker: this });
          if (typeof tgt.applyTimeStop === 'function') tgt.applyTimeStop(5);
          spawnSparks(tgt.x, tgt.y, 4, 'cyan', '#22D3EE');
        }
        // Hit 4: Two-Handed Finisher Aura Palm Blast (tick 30)
        if (tick === 30 && !this.meleeHitDone.has('cc4') && tgt && tgt.hp > 0) {
          this.meleeHitDone.add('cc4');
          _playAshSound('closeCombat');
          _playAshSound('hitStrong');
          triggerGlobalScreenShake(6.0, 12);
          const dmg = Math.round(18 * dmgMult);
          if (this.owner) {
            this.owner._dealPokemonDamage(tgt, dmg, { angle, knockback: 16, isSpecial: false, isMelee: true, attacker: this });
            this.owner._spawnRippleEffect(tgt.x, tgt.y, 65, '#22D3EE', 'rgba(34, 211, 238, 0.28)', 22);
          }
          if (typeof tgt.applyHitStun === 'function') tgt.applyHitStun(20);
          const auraCol = '#22D3EE';
          spawnImpactFlash(tgt.x, tgt.y, auraCol);
          spawnSparks(tgt.x, tgt.y, 8, 'cyan', auraCol);
        }
      }
      // Phase 4: Impact Lock (ticks 31–41)
      else if (tick <= 41) {
        this.meleeMoveState = 'lock';
      }
      // Phase 5: Recovery Settle (ticks 42–54)
      else if (tick <= 54) {
        this.meleeMoveState = 'recovery';
      } else {
        this.meleeMoveState = null;
        this.meleeMoveKey = null;
        this.actionAnimTimer = 0;
      }
    }
  }

  _performMeleeStrike(target, angle) {
    this._startCloseCombatMove(target);
  }

  draw(ctx) {
    drawPokemonCompanion(ctx, this);
    if (this.hp > 0) {
      this.drawFreezeTimer(ctx);
    }
  }

  /**
   * Centralized physical wall bounce reflection:
   * Pokémon rebound naturally off arena walls with standard restitution and angle jitter,
   * exactly like standard Fighter entities.
   */
  resolveWallBounce(arena, opponent) {
    return super.resolveWallBounce(arena, opponent);
  }

  drawBody(ctx) {
    drawPokemonCompanion(ctx, this);
  }
}

export class AshFighter extends Fighter {
  constructor(def) {
    super(def);
    const cfg = _getAshCfg();

    this.characterId = 'ash';
    this.type = 'ash';
    this.name = def?.name || cfg.name || 'ASH';
    this.displayName = def?.displayName || cfg.displayName || 'ASH';
    this.themeColor = cfg.themeColor || '#FACC15';
    this.color = cfg.color || '#EF4444';
    this.secondaryColor = cfg.secondaryColor || '#2563EB';
    this.damageNumberColor = cfg.damageNumberColor || '#FACC15';
    this.teamId = def?.teamId ?? def?.team;
    if (this.team === undefined && this.teamId !== undefined) this.team = this.teamId;

    // Universal Humanoid Radius (Rule 24)
    this.r = cfg.radius || cfg.r || 25;
    this.radius = this.r;
    this.hp = cfg.hp || 360;
    this.maxHp = cfg.maxHp || this.hp;
    this.speed = cfg.speed || 5.5;
    this.baseSpeed = this.speed;

    // Core Mechanic State: Honeycomb Barrier & Pokémon Deployment (Centralized Trainer System)
    this.pokemonOrder = cfg.pokemonOrder || ['pikachu', 'charizard', 'greninja', 'lucario'];
    this.nextPokemonIndex = 0;
    this.activePokemon = null;
    this.thrownPokeball = null;
    initPokemonTrainerState(this, cfg);

    // Summon Cooldown (Mobile Evasion State when > 0 and no Pokémon active)
    this.summonCooldownMax = cfg.summonCooldownFrames || 210;
    this.summonCooldown = cfg.initialSummonDelayFrames ?? 24;

    // Skill 1: Trainer Command (Signature Pokémon Special Attack)
    this.commandCooldownMax = cfg.commandCooldownFrames || 150;
    this.commandCooldown = cfg.initialCommandCooldownFrames ?? 180;

    // Ultimate: 10,000,000 Volt Thunderbolt Barrage
    this.ultimateCooldownMax = cfg.ultimateCooldownFrames || 780;
    this.ultimateCooldown = cfg.initialUltimateCooldownFrames ?? 240;
    this.ultimateDurationMax = cfg.ultimateDurationFrames || 420;

    // Non-Freezing Visual Effects, Projectiles & Queued Move Cast SFX (Rule 25)
    this.activeVisualEffects = [];
    this.activeElementalProjectiles = [];
    this._queuedSoundEffects = [];
    this._animTick = 0;
    this.isSteady = true;
    this._ashSteadyTick = 0;
  }

  reset() {
    super.reset();
    this._cleanupActivePokemon();
    this.thrownPokeball = null;
    this.nextPokemonIndex = 0;
    resetPokemonTrainerState(this);
    this.summonCooldown = _getAshCfg().initialSummonDelayFrames ?? 24;
    this.commandCooldown = _getAshCfg().initialCommandCooldownFrames ?? 180;
    this.ultimateCooldown = _getAshCfg().initialUltimateCooldownFrames ?? 240;
    this.isSteady = true;
    this._ashSteadyTick = 0;
    if (this.activeVisualEffects) this.activeVisualEffects.length = 0;
    else this.activeVisualEffects = [];
    if (this.activeElementalProjectiles) this.activeElementalProjectiles.length = 0;
    else this.activeElementalProjectiles = [];
    if (this._queuedSoundEffects) this._queuedSoundEffects.length = 0;
    else this._queuedSoundEffects = [];
  }

  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks(forceCancelAll);
    if (forceCancelAll) {
      this.thrownPokeball = null;
      if (this.activeVisualEffects) this.activeVisualEffects.length = 0;
      if (this.activeElementalProjectiles) this.activeElementalProjectiles.length = 0;
      if (this._queuedSoundEffects) this._queuedSoundEffects.length = 0;
    }
  }

  /**
   * Plays canonical Empress Pokemon 2D Arena 2-stage move audio:
   * - Plays windup (-1.ogg) immediately
   * - Queues main cast (-2.ogg) after the exact windup frame delay
   */
  _playMoveAudioSequence(moveKey) {
    // Intentionally suppressed: All Ash SFX removed per user instruction
  }

  /**
   * Rule 23: Suppress default base Fighter bullet shooting.
   */
  shoot(ownerIndex) {
    // Intentionally empty: Ash commands Pokémon and throws Poké Balls
  }

  /**
   * Reports whether Ash is intentionally stationary (while projecting his Honeycomb Forcefield Barrier
   * and commanding an active Pokémon or throwing a Poké Ball).
   */
  isStationarySkillActive() {
    if (this.isJumpedOut || this.jumpState === 'outside' || this.jumpState === 'jumping_out' || this.jumpState === 'jumping_in') {
      return true;
    }
    // If Trainer is currently walking towards their corner vantage point, they are actively moving
    if (isTrainerMovingToVantagePoint(this, 6)) {
      return false;
    }
    return Boolean(
      this.isProtectedByHoneycombBarrier ||
      (this.activePokemon && this.activePokemon.hp > 0) ||
      this.thrownPokeball ||
      super.isStationarySkillActive?.()
    );
  }

  /**
   * Dynamic Targeting & Absolute Invincibility Getters:
   * While Ash has jumped outside the arena (or is leaping out) or has an active Pokémon deployed,
   * he is completely untargetable, immune to all combat detection, time-stops, hitstuns, knockbacks, and damage.
   */
  get isUntargetable() {
    return Boolean(
      this._isUntargetable ||
      this.isJumpedOut ||
      this.jumpState === 'outside' ||
      this.jumpState === 'jumping_out' ||
      (this.activePokemon && (this.activePokemon.hp > 0 || this.activePokemon.isFainting))
    );
  }

  set isUntargetable(val) {
    this._isUntargetable = val;
  }

  get untargetable() {
    return this.isUntargetable;
  }

  set untargetable(val) {
    this._isUntargetable = val;
  }

  get cannotBeTargeted() {
    return this.isUntargetable;
  }

  set cannotBeTargeted(val) {
    this._cannotBeTargeted = val;
  }

  get isTargetable() {
    return !this.isUntargetable;
  }

  set isTargetable(val) {
    this._isTargetable = val;
  }

  get isInvulnerable() {
    return this.isUntargetable || Boolean(this._isInvulnerable);
  }

  set isInvulnerable(val) {
    this._isInvulnerable = val;
  }

  get isInvincible() {
    return this.isUntargetable || Boolean(this._isInvincible);
  }

  set isInvincible(val) {
    this._isInvincible = val;
  }

  get invincible() {
    return this.isUntargetable || Boolean(this._invincible);
  }

  set invincible(val) {
    this._invincible = val;
  }

  get invincibilityTimer() {
    return this.isUntargetable ? 999999 : (this._invincibilityTimer || 0);
  }

  set invincibilityTimer(val) {
    this._invincibilityTimer = val;
  }

  get isStealthed() {
    return this.isUntargetable || Boolean(this._isStealthed);
  }

  set isStealthed(val) {
    this._isStealthed = val;
  }

  /**
   * Universal evaluation of whether Ash is in untargetable/invincible God-Mode on the sideline
   * or leaping in/out of the arena.
   */
  _isGodModeOrOutside() {
    return Boolean(
      this.isUntargetable ||
      this.untargetable ||
      this.cannotBeTargeted ||
      this.isTargetable === false ||
      this.isJumpedOut ||
      this.jumpState === 'outside' ||
      this.jumpState === 'jumping_out' ||
      this.jumpState === 'jumping_in' ||
      this.isInvulnerable ||
      this.isInvincible ||
      this.invincible
    );
  }

  /**
   * Total immunity to gravitational vortexes and suction fields (Gojo Purple/Blue, Black Hole, Pure Love Beam).
   */
  isImmuneToGravitationalPull(vortexType = 'purple') {
    if (this._isGodModeOrOutside() || (typeof this.isCastingSkill === 'function' && this.isCastingSkill())) {
      return true;
    }
    return super.isImmuneToGravitationalPull ? super.isImmuneToGravitationalPull(vortexType) : false;
  }

  /**
   * Total immunity to beam entrapment and displacement while outside or jumping.
   */
  isCaughtInBeam() {
    if (this._isGodModeOrOutside() || (typeof this.isCastingSkill === 'function' && this.isCastingSkill())) {
      return false;
    }
    return super.isCaughtInBeam ? super.isCaughtInBeam() : false;
  }

  /**
   * Total immunity to pull and drag states while outside or jumping.
   */
  isPulledOrDragged() {
    if (this._isGodModeOrOutside() || (typeof this.isCastingSkill === 'function' && this.isCastingSkill())) {
      return false;
    }
    return typeof super.isPulledOrDragged === 'function' ? super.isPulledOrDragged() : false;
  }

  /**
   * Suppresses all knockback while untargetable outside the arena or jumping.
   */
  applyKnockback(vx, vy, stunFrames = 0) {
    if (this._isGodModeOrOutside() || (typeof this.isCastingSkill === 'function' && this.isCastingSkill())) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      return;
    }
    super.applyKnockback(vx, vy, stunFrames);
  }

  /**
   * Suppresses all hitstun while untargetable outside the arena or jumping.
   */
  applyHitStun(duration) {
    if (this._isGodModeOrOutside() || (typeof this.isCastingSkill === 'function' && this.isCastingSkill())) {
      this.hitStunTimer = 0;
      return;
    }
    super.applyHitStun(duration);
  }

  /**
   * Suppresses all time-stop effects while untargetable outside the arena or jumping.
   */
  applyTimeStop(duration) {
    if (this._isGodModeOrOutside() || (typeof this.isCastingSkill === 'function' && this.isCastingSkill())) {
      this.timeStopTimer = 0;
      return;
    }
    super.applyTimeStop(duration);
  }

  /**
   * Suppresses all suction displacement while outside or jumping.
   */
  applySuction(vx, vy) {
    if (this._isGodModeOrOutside() || (typeof this.isCastingSkill === 'function' && this.isCastingSkill())) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      return;
    }
    if (typeof super.applySuction === 'function') {
      super.applySuction(vx, vy);
    }
  }

  /**
   * Suppresses all pull displacement while outside or jumping.
   */
  applyPull(vx, vy) {
    if (this._isGodModeOrOutside() || (typeof this.isCastingSkill === 'function' && this.isCastingSkill())) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      return;
    }
    if (typeof super.applyPull === 'function') {
      super.applyPull(vx, vy);
    }
  }

  /**
   * Suppresses all movement slow debuffs while outside or jumping.
   */
  applySlow(duration, mult, opts = {}) {
    if (this._isGodModeOrOutside()) {
      this.slowTimer = 0;
      this.slowMultiplier = 1.0;
      return;
    }
    if (typeof super.applySlow === 'function') {
      super.applySlow(duration, mult, opts);
    }
  }

  /**
   * Honeycomb Forcefield Barrier Damage Interception & Untargetable Sideline Immunity:
   * While Ash has jumped out outside the arena, he is completely untargetable and immune to all attacks.
   * While Ash's Pokémon is deployed (or being thrown out), the Hexagonal Honeycomb Barrier blocks enemy attacks!
   * Only Toji's Inverted Spear of Heaven (Rule 1.7 lore exception) can pierce barriers directly.
   */
  takeDamage(amount, attacker, opts = {}) {
    if (this.isProtectedByHoneycombBarrier && this.activePokemon && this.activePokemon.hp > 0) {
      const isTojiIsoh = Boolean(attacker && (attacker.characterId === 'toji' || attacker.type === 'toji'));
      if (!isTojiIsoh && !opts.bypassHoneycombBarrier) {
        // Calculate incoming attack angle
        let atkAngle = 0;
        if (opts.angle !== undefined) {
          atkAngle = opts.angle;
        } else if (attacker && typeof attacker.x === 'number') {
          atkAngle = Math.atan2(attacker.y - this.y, attacker.x - this.x);
        } else if (attacker && typeof attacker.gunAngle === 'number') {
          atkAngle = attacker.gunAngle;
        }
        this.barrierAngle = atkAngle;
        this.barrierActiveTimer = 22; // Visible directional barrier shield
        this.barrierHitFlashTimer = 16;
        _playAshSound('barrierBlock');
        const contactX = this.x + Math.cos(atkAngle) * (this.honeycombBarrierRadius || 46);
        const contactY = this.y + Math.sin(atkAngle) * (this.honeycombBarrierRadius || 46);
        spawnSparks(contactX, contactY, 6, '#FACC15');
        if (this._barrierTextCooldown <= 0) {
          this._barrierTextCooldown = 28;
          spawnFloatingText(this.x, this.y - this.r - 18, 'HONEYCOMB BARRIER!', '#38BDF8');
        }
        return false;
      }
    }

    // If Ash is outside the arena, leaping out, jumping in, untargetable, or has an active Pokémon, he is completely immune!
    if (this._isGodModeOrOutside() || (this.activePokemon && (this.activePokemon.hp > 0 || this.activePokemon.isFainting))) {
      return false;
    }

    return super.takeDamage(amount, attacker, opts);
  }

  /**
   * Prevents bouncing or clamping Ash against arena walls while he has jumped outside onto the sideline.
   */
  resolveWallBounce(arena, opponent) {
    if (this._isGodModeOrOutside()) {
      return;
    }
    return super.resolveWallBounce(arena, opponent);
  }

  /**
   * Rule 25: Decays visual effects, elemental projectiles & queued cast SFX at the top of update() BEFORE freeze guard.
   */
  _updateVisualEffects() {
    this._animTick = (this._animTick || 0) + 1;
    if (this.barrierHitFlashTimer > 0) this.barrierHitFlashTimer--;
    if (this.barrierActiveTimer > 0) this.barrierActiveTimer--;
    if (this._barrierTextCooldown > 0) this._barrierTextCooldown--;

    // Advance smooth Poké Ball throw animation & spring-damped hand physics (Rule 25)
    updateTrainerThrowPhysics(this);

    // Process 2-stage Empress move cast audio followups (-2.ogg)
    if (Array.isArray(this._queuedSoundEffects)) {
      for (let i = this._queuedSoundEffects.length - 1; i >= 0; i--) {
        const q = this._queuedSoundEffects[i];
        q.timer--;
        if (q.timer <= 0) {
          _playAshSound(q.key);
          this._queuedSoundEffects.splice(i, 1);
        }
      }
    }

    for (let i = this.activeVisualEffects.length - 1; i >= 0; i--) {
      const fx = this.activeVisualEffects[i];
      fx.timer--;
      if (fx.timer <= 0) {
        this.activeVisualEffects.splice(i, 1);
      }
    }

    for (let i = this.activeElementalProjectiles.length - 1; i >= 0; i--) {
      const p = this.activeElementalProjectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.rot = (p.rot || 0) + 0.35;
      p.life--;

      // Homing steering for Lucario's Aura Sphere & slight electric tracking on Thunderbolt
      if (p.homing) {
        if (!p.target || p.target.hp <= 0 || p.target.isFainting || !isActivePokemonTarget(p.target)) {
          const priorityTarget = this._findBestTarget(p.target, p);
          if (priorityTarget) p.target = priorityTarget;
        }
      }
      if (p.homing && p.target && p.target.hp > 0) {
        const desiredAngle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
        const spd = Math.hypot(p.vx, p.vy) || 9.5;
        const steer = p.kind === 'thunderbolt' ? 0.08 : 0.12;
        p.vx = p.vx * (1 - steer) + Math.cos(desiredAngle) * spd * steer;
        p.vy = p.vy * (1 - steer) + Math.sin(desiredAngle) * spd * steer;
      }

      // Check collision with enemy fighters
      let hit = false;
      const enemies = this._getValidEnemyTargets();
      for (let eIdx = 0; eIdx < enemies.length; eIdx++) {
        const enemy = enemies[eIdx];
        const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
        if (dist <= (enemy.r || 25) + (p.r || 13)) {
          this._dealPokemonDamage(enemy, p.damage || 18, {
            knockback: p.knockback || 8,
            angle: Math.atan2(p.vy, p.vx),
            paralyzeFrames: p.paralyzeFrames,
            burnDps: p.burnDps,
            burnFrames: p.burnFrames,
            isSpecial: true
          });
          this._spawnRippleEffect(
            p.x,
            p.y,
            p.kind === 'thunderbolt' ? 68 : 48,
            p.color || '#FACC15',
            p.kind === 'thunderbolt' ? 'rgba(250, 204, 21, 0.25)' : 'rgba(56, 189, 248, 0.18)',
            16
          );
          hit = true;
          break;
        }
      }

      if (hit || p.life <= 0) {
        this.activeElementalProjectiles.splice(i, 1);
      }
    }
  }

  _spawnRippleEffect(x, y, maxRadius, color = '#FACC15', washColor = 'rgba(250, 204, 21, 0.18)', duration = 18) {
    this.activeVisualEffects.push({
      type: 'ripple',
      x,
      y,
      maxRadius,
      color,
      washColor,
      timer: duration,
      maxTimer: duration
    });
  }

  _spawnThunderboltStrikeEffect(fromX, fromY, targetX, targetY, maxRadius = 105, duration = 24) {
    this.activeVisualEffects.push({
      type: 'thunderboltStrike',
      fromX,
      fromY,
      x: targetX,
      y: targetY,
      maxRadius,
      color: '#FACC15',
      washColor: 'rgba(250, 204, 21, 0.26)',
      seed: Math.random() * 100,
      timer: duration,
      maxTimer: duration
    });
  }

  _getValidEnemyTargets(fallbackOpponent = null) {
    return getValidTrainerEnemyTargets(this, fallbackOpponent);
  }

  _isMatchWon(opponent = null) {
    if (this.hp <= 0 || this.dead || this.isDead) return false;
    if (typeof state !== 'undefined' && state) {
      if (state.gameState === 'roundEnd' || state.gameState === 'matchEnd') {
        const winner = state.matchWinner || state.roundWinner;
        if (!winner) return true;
        if (winner === this) return true;
        if (typeof state.getFighterTeam === 'function' && Array.isArray(state.fighters)) {
          const ownerIdx = state.fighters.indexOf(this);
          const winnerIdx = state.fighters.indexOf(winner);
          if (ownerIdx !== -1 && winnerIdx !== -1) {
            return state.getFighterTeam(ownerIdx) === state.getFighterTeam(winnerIdx);
          }
        }
        return true;
      }

      if (Array.isArray(state.fighters) && state.fighters.length > 1) {
        const enemies = this._getValidEnemyTargets(opponent);
        if (enemies.length === 0) {
          return true;
        }
      }
    }

    if (opponent && (opponent.dead || opponent.isDead || opponent.hp <= 0)) {
      return true;
    }

    return false;
  }

  _findBestTarget(fallbackOpponent = null, originEntity = null) {
    return findBestPokemonTarget(this, fallbackOpponent, originEntity);
  }

  _dealPokemonDamage(target, amount, opts = {}) {
    if (!target || target.hp <= 0) return false;
    const unifiedColor = this.damageNumberColor || '#FACC15';
    const attackerEntity = opts.attacker || this.activePokemon || this;
    const landed = applyDamageToTarget(target, amount, attackerEntity, {
      ...opts,
      damageNumberColor: unifiedColor
    });
    if (landed) {
      // Play canonical Empress impact SFX: hit_strong.ogg on specials/heavy hits, hit.ogg on standard strikes
      _playAshSound((opts.isSpecial || amount >= 24) ? 'hitStrong' : 'hit');
      spawnImpactFlash(target.x, target.y, this.themeColor, 16);
      if (opts.knockback && target.hp > 0 && !target.immuneToKnockback && !target.immuneToPush && target.characterId !== 'escanor') {
        const a = opts.angle ?? Math.atan2(target.y - attackerEntity.y, target.x - attackerEntity.x);
        target.vx = (target.vx || 0) + Math.cos(a) * opts.knockback * 0.35;
        target.vy = (target.vy || 0) + Math.sin(a) * opts.knockback * 0.35;
      }
      if (opts.paralyzeFrames) {
        target.paralyzeTimer = Math.max(target.paralyzeTimer || 0, opts.paralyzeFrames);
        target.isParalyzed = true;
        if (typeof target.applyTimeStop === 'function') {
          target.applyTimeStop(opts.paralyzeFrames);
        }
        if (typeof target.applyParalyze === 'function') {
          target.applyParalyze(opts.paralyzeFrames);
        }
      }
      if (opts.electricStunFrames) {
        target.electricStunTimer = Math.max(target.electricStunTimer || 0, opts.electricStunFrames);
      }
      if (opts.burnDps && opts.burnFrames) {
        target.burnTimer = Math.max(target.burnTimer || 0, opts.burnFrames);
        target.burnDps = opts.burnDps;
      }
      if (opts.slowFrames) {
        const slowMult = opts.slowMultiplier ?? 0.45;
        if (target.statusEffects && typeof target.statusEffects.applySlow === 'function') {
          target.statusEffects.applySlow(opts.slowFrames, slowMult);
        } else if (typeof target.applySlow === 'function') {
          target.applySlow(opts.slowFrames, slowMult);
        }
        target.slowTimer = Math.max(target.slowTimer || 0, opts.slowFrames);
        target.slowMultiplier = slowMult;
      }
    }
    return landed;
  }

  /**
   * Evaluates whether a specific Pokémon species is enabled for deployment.
   * Supports both top-level config flags (e.g. enablePikachu, enableSummonPikachu)
   * and roster-level flags (e.g. pokemonRoster.pikachu.enabled).
   *
   * @param {string} speciesKey - 'pikachu' | 'charizard' | 'greninja' | 'lucario'
   * @returns {boolean}
   */
  _isPokemonEnabled(speciesKey) {
    if (!speciesKey) return false;
    const cfg = _getAshCfg();
    const capitalized = speciesKey.charAt(0).toUpperCase() + speciesKey.slice(1).toLowerCase();
    const enableKey = `enable${capitalized}`;
    const enableSummonKey = `enableSummon${capitalized}`;
    const rosterEnabled = cfg.pokemonRoster?.[speciesKey]?.enabled;

    return isSkillEnabled(
      cfg[enableKey],
      cfg[enableSummonKey],
      rosterEnabled,
      true
    );
  }

  /**
   * Retrieves the active list of enabled Pokémon species according to rotation order.
   *
   * @returns {string[]}
   */
  _getAvailablePokemonList() {
    const cfg = _getAshCfg();
    const rawOrder = cfg.pokemonOrder || this.pokemonOrder || ['pikachu', 'charizard', 'greninja', 'lucario'];
    return rawOrder.filter(species => this._isPokemonEnabled(species));
  }

  /**
   * Throws a Poké Ball to randomly deploy a Pokémon from Ash's enabled roster.
   * Immediately locks Ash into his stationary Honeycomb Barrier Commander state!
   */
  _throwPokeball(opponent, arena) {
    const cfg = _getAshCfg();
    const available = this._getAvailablePokemonList();
    if (available.length === 0) {
      // All Pokémon summons are disabled
      return;
    }
    const speciesKey = pickRandomPokemonSpecies(this, available);
    if (!speciesKey) return;

    const target = this._findBestTarget(opponent);
    const throwAngle = target
      ? Math.atan2(target.y - this.y, target.x - this.x)
      : (this.gunAngle || 0);
    this.gunAngle = throwAngle;
    this.angle = throwAngle;

    const throwDist = cfg.pokeballThrowDistance || 95;
    let targetX = this.x + Math.cos(throwAngle) * throwDist;
    let targetY = this.y + Math.sin(throwAngle) * throwDist;

    const bounds = arena || (typeof state !== 'undefined' ? state.arena : null);
    if (bounds) {
      const pad = 34;
      targetX = Math.max(bounds.x + pad, Math.min(bounds.x + bounds.width - pad, targetX));
      targetY = Math.max(bounds.y + pad, Math.min(bounds.y + bounds.height - pad, targetY));
    }

    const flightFrames = cfg.pokeballThrowFrames || 18;
    startTrainerPokeballThrow(this, {
      speciesKey,
      targetX,
      targetY,
      throwAngle,
      flightFrames
    });

    // Stop moving & activate Honeycomb Forcefield Barrier immediately upon throwing
    this.vx = 0;
    this.vy = 0;
    this.isProtectedByHoneycombBarrier = true;

    _playAshSound('pbThrow');
    const spec = cfg.pokemonRoster?.[speciesKey] || ashConfig.pokemonRoster.pikachu;
    spawnFloatingText(this.x, this.y - this.r - 20, `I CHOOSE YOU, ${spec.name}!`, spec.themeColor || '#FACC15');
  }

  /**
   * Pops open the landed Poké Ball and spawns the active PokemonCompanionEntity into state.fighters.
   */
  _spawnPokemonFromBall(ball) {
    const cfg = _getAshCfg();
    this._cleanupActivePokemon();
    const pokemon = new PokemonCompanionEntity(this, ball.speciesKey, ball.targetX, ball.targetY);
    pokemon.startSummonIntro(cfg.pokemonSummonIntroFrames ?? 28);
    this.activePokemon = pokemon;
    // Synchronize commandCooldown with the spawned Pokémon's initial cooldown
    this.commandCooldown = Math.max(this.commandCooldown, pokemon.specialCooldown);
    this.isProtectedByHoneycombBarrier = true;
    this.vx = 0;
    this.vy = 0;

    // Pick safest trainer sideline vantage point and initiate high-arc Jump Out of the arena
    const curArena = (typeof state !== 'undefined' ? state.arena : null);
    const target = this._findBestTarget();
    startTrainerJumpOut(this, curArena, target);

    if (typeof state !== 'undefined' && Array.isArray(state.fighters) && state.fighters.includes(this)) {
      state.fighters.push(pokemon);
    }

    _playAshSound('pbRelease');
    const cryToPlay = (pokemon.speciesId === 'pikachu')
      ? (pokemon.spec.starterCryKey || pokemon.spec.cryKey || 'cryPikachuStarter')
      : pokemon.spec.cryKey;
    if (cryToPlay) {
      _playAshSound(cryToPlay);
    }

    this._spawnRippleEffect(
      ball.targetX,
      ball.targetY,
      68,
      pokemon.themeColor,
      'rgba(255, 255, 255, 0.24)',
      18
    );
    triggerGlobalScreenShake(4, 6);
  }

  /**
   * Triggers the Poké Ball recall beam when Pokémon has completed its fainting collapse.
   */
  _triggerPokemonRecall(faintedPokemon) {
    const fainted = faintedPokemon || this.activePokemon;
    if (!fainted) return;

    if (fainted && !fainted._faintSoundPlayed) {
      fainted._faintSoundPlayed = true;
      _playAshSound('faint');
    }
    this.activeVisualEffects.push({
      type: 'recallBeam',
      fromX: fainted.x,
      fromY: fainted.y,
      toX: this.x,
      toY: this.y,
      timer: 22,
      maxTimer: 22
    });
    spawnFloatingText(this.x, this.y - this.r - 20, `${fainted.name} RETURN!`, '#EF4444');
  }

  /**
   * Handles when the active Pokémon faints and finishes recall:
   * - Drops Ash's Honeycomb Barrier
   * - Restores Ash's movement velocity while starting the Summon Cooldown!
   */
  _onActivePokemonFainted(faintedPokemon) {
    const fainted = faintedPokemon || this.activePokemon;
    if (!fainted) return;

    this._cleanupActivePokemon();
    this.trainerVantagePoint = null;

    // Trigger Jump Back In inside the arena now that the active Pokémon has fainted!
    const curArena = (typeof state !== 'undefined' ? state.arena : null);
    startTrainerJumpIn(this, curArena);

    // Drop Honeycomb Barrier & Resume Ash's Mobile Evasion!
    this.isProtectedByHoneycombBarrier = false;
    this.summonCooldown = this.summonCooldownMax;

    // Do NOT assign random movement impulse while mid-jump trajectory is active!
    this.vx = 0;
    this.vy = 0;
  }

  _cleanupActivePokemon() {
    this.trainerVantagePoint = null;
    if (this.activePokemon) {
      if (typeof state !== 'undefined' && Array.isArray(state.fighters)) {
        const idx = state.fighters.indexOf(this.activePokemon);
        if (idx !== -1) state.fighters.splice(idx, 1);
      }
      this.activePokemon = null;
    }
  }

  /**
   * Returns all other living Pokémon Trainers currently in the arena via centralized trainer system.
   */
  _getOtherPokemonTrainers() {
    return getOtherPokemonTrainers(this);
  }

  /**
   * Checks whether a candidate corner spot is already claimed or occupied by another Pokémon Trainer.
   */
  _isVantagePointOccupied(cand, minSeparation = 95) {
    return isTrainerVantagePointOccupied(this, cand, minSeparation);
  }

  /**
   * Checks if this trainer's current vantage point conflicts with another trainer who has priority.
   */
  _hasVantagePointConflict(vp, minSeparation = 95) {
    return hasTrainerVantagePointConflict(this, vp, minSeparation);
  }

  /**
   * Selects the safest unoccupied corner vantage point ('top-left', 'top-right', 'bottom-left', 'bottom-right')
   * via the centralized Pokémon Trainer system.
   *
   * @param {Object} arena - Current arena bounds
   * @param {Object} [opponent] - Primary target/opponent to avoid
   * @returns {{ type: string, x: number, y: number }}
   */
  _pickTrainerVantagePoint(arena, opponent = null) {
    const cfg = _getAshCfg();
    return pickTrainerVantagePoint(this, arena, opponent, {
      pad: cfg.trainerVantagePad || 42
    });
  }

  /**
   * Skill 1: Trainer Command — Orders the active Pokémon to unleash its signature move!
   * - Close Combat (<= 180px): Orders high-speed empowered melee combo (Iron Tail, Dragon Claw, Night Slash, Close Combat)!
   * - Long Range (> 180px): Orders signature ranged elemental special (Thunderbolt, Flamethrower, Water Shuriken, Aura Sphere)!
   */
  _executeTrainerCommand(opponent) {
    if (!this.activePokemon || this.activePokemon.hp <= 0) return;
    if (this.activePokemon.thunderboltState || this.activePokemon.flamethrowerState || this.activePokemon.meleeMoveState || this.activePokemon.isChannelingSkill?.()) return;
    if (this.commandCooldown > 0) return;
    if ((this.activePokemon.specialCooldown || 0) > 0) return;

    const target = this._findBestTarget(opponent);
    if (!target) return;

    // Always unleash the active Pokémon's signature special skill when the command/skill is ready!
    this._executePokemonSpecial(this.activePokemon, target, true);
  }

  /**
   * Executes the active Pokémon's signature special skill (autonomous or Trainer Commanded):
   * - Pikachu: THUNDERBOLT! (High-speed Electric Bolt Projectile + Sky-Splitting Lightning Strike + Paralysis)
   * - Charizard: FLAMETHROWER! / BLUE FLARE BLITZ!
   * - Greninja: WATER SHURIKEN!
   * - Lucario: AURA SPHERE! / MAX AURA SPHERE!
   */
  _executePokemonSpecial(p, target, isTrainerCommand = false) {
    if (!p || p.hp <= 0) return;
    const cd = p.specialCooldownMax || this.commandCooldownMax || 135;
    p.specialCooldown = cd;
    p.isSpecialOnInitialCooldown = false;
    this.commandCooldown = cd;

    if (p.speciesId === 'pikachu') {
      if (typeof p.startThunderbolt === 'function') {
        p.startThunderbolt(target, isTrainerCommand);
        return;
      }
    } else if (p.speciesId === 'charizard') {
      if (typeof p.startFlamethrower === 'function') {
        p.startFlamethrower(target, isTrainerCommand);
        return;
      }
    }

    const spec = p.spec;
    const castAngle = target
      ? Math.atan2(target.y - p.y, target.x - p.x)
      : (p.gunAngle || this.gunAngle || 0);

    p.gunAngle = castAngle;
    p.angle = castAngle;
    p.animState = 'special';
    p.actionAnimTimer = 28;
    p.specialCastTimer = 28;
    p.animTick = 0;

    const moveTitle = spec.specialName || 'THUNDERBOLT!';
    spawnFloatingText(p.x, p.y - p.r - 22, moveTitle, p.themeColor);

    // Play canonical 2-stage Empress move audio sequence (e.g. thunderbolt-1.ogg -> thunderbolt-2.ogg)
    this._playMoveAudioSequence(spec.specialSfx || 'thunderbolt');

    const bonusMult = isTrainerCommand ? (_getAshCfg().commandDamageBonus || 1.25) : 1.0;

    if (p.speciesId === 'charizard') {
      // Flamethrower Fire Stream + AOE Burst
      const rad = spec.specialRadius || 120;
      const fireColor = '#F97316';
      const burstX = p.x + Math.cos(castAngle) * 70;
      const burstY = p.y + Math.sin(castAngle) * 70;
      this._spawnRippleEffect(burstX, burstY, rad, fireColor, 'rgba(249, 115, 22, 0.22)', 22);
      triggerGlobalScreenShake(6, 10);

      for (let i = -1; i <= 1; i++) {
        const a = castAngle + i * 0.20;
        this.activeElementalProjectiles.push({
          kind: 'fireBlast',
          x: p.x + Math.cos(a) * (p.r + 8),
          y: p.y + Math.sin(a) * (p.r + 8),
          vx: Math.cos(a) * 9.2,
          vy: Math.sin(a) * 9.2,
          r: 14,
          life: 45,
          damage: Math.round((spec.specialDamage || 32) * 0.55 * bonusMult),
          knockback: 12,
          color: fireColor,
          burnDps: spec.burnDps || 5,
          burnFrames: spec.burnDurationFrames || 150
        });
      }
    } else if (p.speciesId === 'greninja') {
      // Water Shuriken 3-Star Fan Barrage
      const count = spec.shurikenCount || 3;
      const spd = spec.shurikenSpeed || 11.5;
      for (let i = 0; i < count; i++) {
        const spread = (i - (count - 1) / 2) * 0.18;
        const a = castAngle + spread;
        this.activeElementalProjectiles.push({
          kind: 'waterShuriken',
          x: p.x + Math.cos(a) * (p.r + 6),
          y: p.y + Math.sin(a) * (p.r + 6),
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          r: 13,
          life: 50,
          damage: Math.round((spec.specialDamage || 14) * bonusMult),
          knockback: 9,
          color: '#38BDF8'
        });
      }
    } else {
      // Lucario Homing Aura Sphere
      const spd = spec.auraSphereSpeed || 9.5;
      this.activeElementalProjectiles.push({
        kind: 'auraSphere',
        homing: true,
        target,
        x: p.x + Math.cos(castAngle) * (p.r + 8),
        y: p.y + Math.sin(castAngle) * (p.r + 8),
        vx: Math.cos(castAngle) * spd,
        vy: Math.sin(castAngle) * spd,
        r: 15,
        life: 65,
        damage: Math.round((spec.specialDamage || 30) * bonusMult),
        knockback: 16,
        color: '#22D3EE'
      });
    }
  }

  /**
   * Ultimate: 10,000,000 Volt Thunderbolt Barrage!
   */
  _activateMegaAwakening(opponent, arena) {
    const cfg = _getAshCfg();
    this.ultimateCooldown = this.ultimateCooldownMax;
    this.ultimateActiveTimer = this.ultimateDurationMax;

    _playAshSound('megaFanfare');
    _playAshSound('thunder');
    this._playMoveAudioSequence('voltTackle');
    triggerGlobalScreenShake(9, 16);

    // If Ash has no active Pokémon out, instantly summon one if available!
    if ((!this.activePokemon || this.activePokemon.hp <= 0) && !this.thrownPokeball) {
      if (this._getAvailablePokemonList().length > 0) {
        this.summonCooldown = 0;
        this._throwPokeball(opponent, arena);
      }
    }

    spawnFloatingText(this.x, this.y - this.r - 28, '10,000,000 VOLT AWAKENING!', '#FACC15');
    this._spawnRippleEffect(this.x, this.y, 125, '#FACC15', 'rgba(250, 204, 21, 0.25)', 24);

    // Strike enemies with 10,000,000 Volt Thunderbolt lightning columns
    const originX = (this.activePokemon && this.activePokemon.hp > 0) ? this.activePokemon.x : this.x;
    const originY = (this.activePokemon && this.activePokemon.hp > 0) ? this.activePokemon.y : this.y;
    const enemies = this._getValidEnemyTargets(opponent);
    for (const enemy of enemies) {
      this._dealPokemonDamage(enemy, cfg.ultimateBoltDamage || 18, {
        knockback: 18,
        angle: Math.atan2(enemy.y - this.y, enemy.x - this.x),
        paralyzeFrames: 30,
        isSpecial: true
      });
      this._spawnThunderboltStrikeEffect(originX, originY, enemy.x, enemy.y, 95, 24);
    }
  }

  update(opponent, ownerIndex, arena) {
    // 0. Mandatory Rule 25: Update visual effects & projectiles BEFORE freeze check
    this._updateVisualEffects();

    // 1. Mandatory Rule 1.1: Freeze & Time-Stop Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // Cleanup if Ash died
    if (this.hp <= 0) {
      this._cleanupActivePokemon();
      this.isProtectedByHoneycombBarrier = false;
      return;
    }

    // Match Victory Check: If match is won, Ash stays proudly on sideline and halts movement
    if (this._isMatchWon(opponent)) {
      this.vx = 0;
      this.vy = 0;
      this.isSteady = true;
      return;
    }

    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();
    this.isSteady = Boolean(Math.hypot(this.vx || 0, this.vy || 0) < 0.45);

    if (this.activePokemon && this.activePokemon.hp > 0) {
      this.commandCooldown = this.activePokemon.specialCooldown;
    } else if (this.commandCooldown > 0) {
      this.commandCooldown--;
    }
    if (this.ultimateCooldown > 0) this.ultimateCooldown--;
    if (this.ultimateActiveTimer > 0) this.ultimateActiveTimer--;

    // 2. Check if active Pokémon fainted
    if (this.activePokemon) {
      if (this.activePokemon.hp <= 0 && !this.activePokemon.isFainting) {
        this.activePokemon.startFaint();
      }
      if (this.activePokemon.faintCompleted) {
        this._onActivePokemonFainted(this.activePokemon);
      } else if (typeof state !== 'undefined' && Array.isArray(state.fighters) && state.fighters.includes(this)) {
        // Re-ensure active Pokémon is in state.fighters during live matches
        if (!state.fighters.includes(this.activePokemon)) {
          state.fighters.push(this.activePokemon);
        }
      } else {
        // Standalone simulation / preview mode: update active Pokémon directly
        this.activePokemon.update(opponent, ownerIndex, arena);
      }
    }

    // 3. Advance in-flight Poké Ball throw
    if (this.thrownPokeball) {
      this.thrownPokeball.timer--;
      if (this.thrownPokeball.timer <= 0) {
        const landedBall = this.thrownPokeball;
        this.thrownPokeball = null;
        this._spawnPokemonFromBall(landedBall);
      }
    }

    const bestTarget = this._findBestTarget(opponent);
    if (bestTarget && this.jumpState !== 'outside') {
      this.aim(bestTarget);
    }

    const cfg = _getAshCfg();

    // 4. Ultimate Trigger
    if (isSkillEnabled(cfg.enableUltimate, true) && this.ultimateCooldown <= 0 && bestTarget) {
      this._activateMegaAwakening(bestTarget, arena);
    }

    // 4.5. Advance Jump Out / Jump In Trajectory Physics
    if (this.jumpState === 'jumping_out' || this.jumpState === 'jumping_in') {
      updateTrainerJumpPhysics(this, arena, bestTarget);
      return;
    }

    // 5. CORE STATE MACHINE:
    if (this.jumpState === 'outside') {
      // While jumped out outside the arena:
      // Ash is in absolute God-Mode: 100% UNTARGETABLE, IMMUNE to all attacks, suction, and pull!
      this.isJumpedOut = true;
      this.isUntargetable = true;
      this.untargetable = true;
      this.cannotBeTargeted = true;
      this.isTargetable = false;
      this.isInvulnerable = true;
      this.isInvincible = true;
      this.invincible = true;
      this.invincibilityTimer = 999999;
      this.isProtectedByHoneycombBarrier = false;
      this.vx = 0;
      this.vy = 0;
      this.z = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.isCaughtInPurple = false;
      this.isCaughtInPurpleVortex = false;
      this.purpleHitTimer = 0;
      this.isCaughtInBlue = false;
      this.isCaughtInBluePull = false;
      this.isCaughtInBlackHole = false;
      this.isDraggedByGetsuga = false;
      this.caughtInPureLoveBeam = false;
      this.wasCaughtInPureLoveBeam = false;
      this.pureLoveBeamTimer = 0;
      this.pureLoveBeamRecoveryTimer = 0;
      this.timeStopTimer = 0;
      this.hitStunTimer = 0;
      this.freezeTimer = 0;
      this.slowTimer = 0;
      this.slowMultiplier = 1.0;
      this.preventKnockbackBounce = false;

      // Position Lock: strictly anchor Ash to his designated sideline vantage point
      if (typeof this.sidelineX === 'number' && typeof this.sidelineY === 'number') {
        this.x = this.sidelineX;
        this.y = this.sidelineY;
      } else if (this.trainerVantagePoint && typeof this.trainerVantagePoint.x === 'number') {
        this.sidelineX = this.trainerVantagePoint.x;
        this.sidelineY = this.trainerVantagePoint.y;
        this.x = this.sidelineX;
        this.y = this.sidelineY;
      }

      // Stable Sideline Spectator Aim (Stably face inward toward arena, tracking active Pokémon without flipping)
      const curArena = arena || (typeof state !== 'undefined' ? state.arena : null) || { x: 45, y: 240, width: 450, height: 450 };
      const isLeftWall = this.trainerVantagePoint?.wall === 'left' || this.x < (curArena.x + curArena.width * 0.5);
      const lookTarget = (this.activePokemon && (this.activePokemon.hp > 0 || this.activePokemon.isFainting)) ? this.activePokemon : bestTarget;

      if (isLeftWall) {
        // Left sideline: Facing right (base angle 0) into arena
        let targetAngle = 0;
        if (lookTarget) {
          targetAngle = Math.atan2((lookTarget.y || this.y) - this.y, (lookTarget.x || this.x + 100) - this.x);
        }
        this.gunAngle = Math.max(-0.60, Math.min(0.60, targetAngle));
        this.angle = this.gunAngle;
      } else {
        // Right sideline: Facing left (base angle PI) into arena
        let targetAngle = Math.PI;
        if (lookTarget) {
          targetAngle = Math.atan2((lookTarget.y || this.y) - this.y, (lookTarget.x || this.x - 100) - this.x);
        }
        let diffFromPI = targetAngle > 0 ? (targetAngle - Math.PI) : (targetAngle + Math.PI);
        diffFromPI = Math.max(-0.60, Math.min(0.60, diffFromPI));
        this.gunAngle = Math.PI + diffFromPI;
        this.angle = this.gunAngle;
      }

      // Trigger Trainer Command Special Move when ready (both Ash and Pokémon must be ready and not mid-cast)
      if (this.activePokemon &&
          this.activePokemon.hp > 0 &&
          isSkillEnabled(cfg.enableTrainerCommand, true) &&
          this.commandCooldown <= 0 &&
          this.activePokemon.specialCooldown <= 0 &&
          !this.activePokemon.thunderboltState &&
          !this.activePokemon.flamethrowerState &&
          !this.activePokemon.meleeMoveState &&
          !this.activePokemon.isChannelingSkill?.()) {
        this._executeTrainerCommand(bestTarget);
      }

      // Outside arena: do not clamp or bounce against arena walls!
      return;
    }

    // STATE A: Pokémon is Active (or Poké Ball in flight or fainting/recalling)
    if ((this.activePokemon && (this.activePokemon.hp > 0 || this.activePokemon.isFainting)) || this.thrownPokeball) {
      if (this.activePokemon && !this.thrownPokeball && this.jumpState === 'inside') {
        // Pokémon has spawned: Trainer leaps up and out of the arena to the sideline!
        startTrainerJumpOut(this, arena, bestTarget);
        return;
      } else {
        // Poké Ball is in mid-throw flight -> hold still during throw animation
        this.vx = 0;
        this.vy = 0;
        this.isProtectedByHoneycombBarrier = true;
        this._checkIncomingThreats(bestTarget);
        this.resolveWallBounce(arena, bestTarget);
        return;
      }
    }

    // STATE B: No Active Pokémon -> Honeycomb Barrier OFF, Ash Moves Around Waiting for Summon Cooldown!
    this.isProtectedByHoneycombBarrier = false;

    if (this.summonCooldown > 0) {
      this.summonCooldown--;
      // Ensure Ash maintains brisk movement speed while evading on cooldown
      const curSpd = Math.hypot(this.vx, this.vy);
      if (curSpd < this.speed * 0.75) {
        const moveAngle = bestTarget
          ? Math.atan2(this.y - bestTarget.y, this.x - bestTarget.x) + 0.55
          : (this.gunAngle || 0);
        this.vx = Math.cos(moveAngle) * this.speed;
        this.vy = Math.sin(moveAngle) * this.speed;
      }
    } else {
      // Cooldown finished! Throw next Poké Ball & enter stationary Honeycomb Barrier state if summons are enabled
      const available = this._getAvailablePokemonList();
      if (available.length > 0) {
        this._throwPokeball(bestTarget, arena);
        return;
      }
      // If all Pokémon summons are disabled, keep Ash evading with standard movement
      const curSpd = Math.hypot(this.vx, this.vy);
      if (curSpd < this.speed * 0.75) {
        const moveAngle = bestTarget
          ? Math.atan2(this.y - bestTarget.y, this.x - bestTarget.x) + 0.55
          : (this.gunAngle || 0);
        this.vx = Math.cos(moveAngle) * this.speed;
        this.vy = Math.sin(moveAngle) * this.speed;
      }
    }

    // Centralized Movement Physics & Wall Bounce (Rule 1.2)
    super.update(bestTarget, ownerIndex, arena);
    this.isSteady = Boolean(Math.hypot(this.vx || 0, this.vy || 0) < 0.45);
  }

  /**
   * Evaluates incoming projectile threats or approaching enemies to activate the directional barrier shield.
   */
  _checkIncomingThreats(primaryTarget = null) {
    checkTrainerIncomingThreats(this, primaryTarget);
  }

  onDeath() {
    this._cleanupActivePokemon();
    super.onDeath();
  }

  drawBody(ctx) {
    drawAshSkin(ctx, this);
  }

  drawSkin(ctx) {
    drawAshSkin(ctx, this);
  }

  draw(ctx, opponent) {
    // 1. Draw Ash's body & held Poké Ball
    this.drawBody(ctx);

    // 2. Draw Hexagonal Honeycomb Forcefield Dome around Ash when active
    drawAshHoneycombBarrier(ctx, this);

    // 3. Draw thrown Poké Ball, elemental projectiles, and water-ripple shockwaves
    drawAshVisualEffects(ctx, this);

    // 4. If activePokemon is not yet in state.fighters (e.g. standalone preview/test harness), draw it
    if (this.activePokemon && (!state?.fighters || !state.fighters.includes(this.activePokemon))) {
      drawPokemonCompanion(ctx, this.activePokemon);
    }

    // 5. Mandatory Rule 21: Overhead HP & Freeze Timer on top layer
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
