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
  drawPokemonCompanion
} from '../../graphics/weapons/ashPokemonGraphics.js';
import { spawnImpactFlash, spawnSparks } from '../../graphics/particles/sparkEffect.js';

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

    const launchTarget = owner?._findBestTarget ? owner._findBestTarget() : null;
    const launchAngle = (launchTarget && launchTarget.hp > 0)
      ? Math.atan2(launchTarget.y - spawnY, launchTarget.x - spawnX)
      : (owner.gunAngle || 0);
    this.vx = Math.cos(launchAngle) * this.speed;
    this.vy = Math.sin(launchAngle) * this.speed;
    this.gunAngle = launchAngle;
    this.angle = launchAngle;

    this.animState = 'idle';
    this.animTick = 0;
    this.actionAnimTimer = 0;
    this.meleeCooldown = 14;
    this.meleeCooldownMax = spec.meleeCooldown || 34;
    const specialCooldownCfg = spec.skills?.special?.cooldown ?? spec.specialCooldown ?? (_getAshCfg().pokemonRoster?.[speciesKey]?.skills?.special?.cooldown ?? 135);
    this.specialCooldownMax = specialCooldownCfg;
    this.specialCooldown = spec.initialSpecialDelayFrames ?? Math.min(28, this.specialCooldownMax);
    this.comboStep = 0;
    this.hurtAnimTimer = 0;
    this.hurtTick = 0;
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
    this.flamethrowerImpactTimer = undefined;
  }

  shoot() {
    // Intentionally empty (Rule 23): Pokémon uses dedicated melee blitz & elemental specials
  }

  /**
   * Rule 1.4: Lock aim rotation while Pikachu or Charizard is channeling special beams/flames.
   */
  canAim() {
    if (this.thunderboltState || this.flamethrowerState) return false;
    return super.canAim();
  }

  isStationarySkillActive() {
    return Boolean(this.thunderboltState || this.flamethrowerState || super.isStationarySkillActive?.());
  }

  isChannelingSkill() {
    return Boolean(this.thunderboltState || this.flamethrowerState || super.isChannelingSkill?.());
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
    this.flamethrowerImpactTimer = undefined;
    if (this.flamethrowerHitEnemies) {
      this.flamethrowerHitEnemies.clear();
    }
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
    const cd = Math.max(this.specialCooldownMax, this.owner?.commandCooldownMax || 0);
    this.specialCooldown = cd;
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
    const cd = Math.max(this.specialCooldownMax, this.owner?.commandCooldownMax || 0);
    this.specialCooldown = cd;
    if (this.owner) {
      this.owner.commandCooldown = cd;
    }
    this.flamethrowerCurrentBeamLen = null;
    this.flamethrowerClosestEnemy = null;
    this.flamethrowerImpactTimer = undefined;
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
    if (this.owner) {
      this.owner._playMoveAudioSequence(specSkill?.specialSfx || 'flamethrower');
    }
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
    const landed = super.takeDamage(amount, attacker, opts);
    if (landed) {
      this.hitFlashTimer = 0; // PMD sprite sheets handle their own Hurt-Anim / Faint-Anim without circular 2D flash artifacts
      if (this.hp <= 0) {
        this.startFaint();
      } else {
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

    this.handleStatusEffects();
    if (this.meleeCooldown > 0) this.meleeCooldown--;
    if (!this.thunderboltState && !this.flamethrowerState && this.specialCooldown > 0) this.specialCooldown--;
    if (this.actionAnimTimer > 0) this.actionAnimTimer--;
    if (this.hurtAnimTimer > 0) {
      this.hurtAnimTimer--;
      this.hurtTick = (this.hurtTick || 0) + 1;
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

        // Find closest enemy along the beam path
        let closestHitEnemy = null;
        let closestHitDist = beamRange;
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
              if (hitContactDist < closestHitDist) {
                closestHitDist = hitContactDist;
                closestHitEnemy = enemy;
              }
            }
          }
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
          const cd = Math.max(this.specialCooldownMax, this.owner?.commandCooldownMax || 0);
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

        // Rule 1.4: Steady aim lock — angle strictly clamped to committed castAngle
        this.gunAngle = this.flamethrowerCastAngle;
        this.angle = this.flamethrowerCastAngle;

        // Steady planted stance: Charizard plants feet firmly on the ground with zero drift or recoil slip
        this.vx = 0;
        this.vy = 0;
        this.z = 0;

        if (this.flamethrowerTimer % 4 === 0) {
          triggerGlobalScreenShake(specSkill?.screenShake || 4.5, 3);
        }

        // Calculate flame stream length: stops at first enemy hit or arena walls (zero clipping outside arena)
        const maxSkillRange = specSkill?.streamRange || 680;
        const curArena = arena || (typeof state !== 'undefined' ? state.arena : null);
        const cosA = Math.cos(this.flamethrowerCastAngle);
        const sinA = Math.sin(this.flamethrowerCastAngle);
        const startX = this.x + cosA * (this.r * 0.85);
        const startY = this.y - 26 + sinA * (this.r * 0.65);
        const wallDist = curArena ? _getRayArenaIntersection(startX, startY, this.flamethrowerCastAngle, curArena, 8) : maxSkillRange;
        const streamRange = Math.min(maxSkillRange, Math.max(10, wallDist));
        const streamW = specSkill?.streamWidth || 48;

        // Find closest enemy along the flame path
        let closestHitEnemy = null;
        let closestHitDist = streamRange;
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
              if (hitContactDist < closestHitDist) {
                closestHitDist = hitContactDist;
                closestHitEnemy = enemy;
              }
            }
          }
        }

        this.flamethrowerCurrentBeamLen = closestHitEnemy ? closestHitDist : streamRange;
        this.flamethrowerClosestEnemy = closestHitEnemy;

        if (closestHitEnemy && this.flamethrowerImpactTimer === undefined) {
          this.flamethrowerImpactTimer = 0;
        }

        // Multi-tick continuous flame damage & burning on the hit target
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
          this.flamethrowerImpactTimer = undefined;
          const cd = Math.max(this.specialCooldownMax, this.owner?.commandCooldownMax || 0);
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
    if (this.meleeMoveState) {
      const target = this.owner?._findBestTarget(opponent) || opponent;
      this._updateMeleeMove(target, arena);
      if (this.meleeMoveState) {
        if (this.meleeMoveState === 'lock') {
          this.vx = 0;
          this.vy = 0;
        }
        this.applyMovementPhysics(1.0);
        this.resolveWallBounce(arena, target);
        return;
      }
    }

    // Acquire nearest valid enemy target
    const target = this.owner?._findBestTarget(opponent) || opponent;
    if (target && target.hp > 0) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      const targetAngle = Math.atan2(dy, dx);
      this.gunAngle = targetAngle;
      this.angle = targetAngle;

      const reach = (this.spec.meleeReach || 68) + (target.r || 25);
      const closeCombatRushReach = reach * 2.2; // ~200px rush engagement zone

      // 1. Point-Blank / Close Range (dist <= reach + 20px) -> Melee Combo Priority!
      if (dist <= reach + 20 && this.meleeCooldown <= 0) {
        this._startCloseCombatMove(target);
      }
      // 2. Medium-Range Combat Zone (reach + 20 < dist <= 240px)
      else if (dist <= closeCombatRushReach) {
        // High likelihood to initiate Close Combat Rush (Quick Attack dash, Dragon Claw lunge, etc.)
        if (this.meleeCooldown <= 0 && (this.specialCooldown > 0 || Math.random() < 0.60)) {
          this._startCloseCombatMove(target);
        } else if (this.specialCooldown <= 0 && !this.thunderboltState && !this.flamethrowerState && this.owner) {
          const cd = Math.max(this.specialCooldownMax, this.owner.commandCooldownMax || 0);
          this.specialCooldown = cd;
          this.owner.commandCooldown = cd;
          if (this.speciesId === 'pikachu') {
            this.startThunderbolt(target, false);
          } else if (this.speciesId === 'charizard') {
            this.startFlamethrower(target, false);
          } else {
            this.owner._executePokemonSpecial(this, target, false);
          }
        } else {
          // Actively advance towards target to enter close combat
          const approachAngle = targetAngle + (Math.sin(this.animTick * 0.1) * 0.25);
          this.vx = Math.cos(approachAngle) * this.speed;
          this.vy = Math.sin(approachAngle) * this.speed;
        }
      }
      // 3. Long-Range Engagement (dist > 240px)
      else {
        if (this.specialCooldown <= 0 && !this.thunderboltState && !this.flamethrowerState && dist <= 550 && this.owner) {
          const cd = Math.max(this.specialCooldownMax, this.owner.commandCooldownMax || 0);
          this.specialCooldown = cd;
          this.owner.commandCooldown = cd;
          if (this.speciesId === 'pikachu') {
            this.startThunderbolt(target, false);
          } else if (this.speciesId === 'charizard') {
            this.startFlamethrower(target, false);
          } else {
            this.owner._executePokemonSpecial(this, target, false);
          }
        } else {
          // Special on cooldown: actively hunt and close in on target
          const huntAngle = targetAngle + (Math.sin(this.animTick * 0.08) * 0.30);
          this.vx = Math.cos(huntAngle) * this.speed;
          this.vy = Math.sin(huntAngle) * this.speed;
        }
      }
    }

    // Natural bounce momentum: if velocity ever stalls or drops to zero, recover natural speed immediately
    if (Math.hypot(this.vx, this.vy) < 0.2 && !this.thunderboltState && !this.flamethrowerState && !this.meleeMoveState) {
      const resumeAngle = this.gunAngle || (Math.random() * Math.PI * 2);
      this.vx = Math.cos(resumeAngle) * this.speed;
      this.vy = Math.sin(resumeAngle) * this.speed;
    }
    if (this.hurtAnimTimer > 0 && !this.thunderboltState && !this.flamethrowerState) {
      this.animState = 'hurt';
    } else if (this.actionAnimTimer > 0 || this.meleeMoveState) {
      // Keep active 'attack' or 'special' state
      this.animState = 'attack';
    } else if (Math.hypot(this.vx, this.vy) > 0.6) {
      this.animState = 'walk';
    } else {
      this.animState = 'idle';
    }

    super.update(target, ownerIndex, arena);
  }

  interruptAttacks(forceCancelAll = false) {
    if (super.interruptAttacks) super.interruptAttacks(forceCancelAll);
    this.meleeMoveState = null;
    this.meleeMoveKey = null;
    this.z = 0;
  }

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
    const angle = this.meleeCastAngle || (tgt ? Math.atan2(tgt.y - this.y, tgt.x - this.x) : 0);

    const dmgMult = (this.isTrainerCommandMove ? (_getAshCfg().commandDamageBonus || 1.25) : 1.0);

    if (key === 'quickAttack') {
      this.meleeMoveMaxTicks = 38;

      // ── Stage 1: Crouch & Initial Bounding Hop (ticks 1–12) ──
      if (tick <= 4) {
        this.meleeMoveState = 'windup';
        this.z = 0;
        this.vx = 0;
        this.vy = 0;
      } else if (tick <= 12) {
        // The Hop: Low-altitude springy bound forward into rhythm
        this.meleeMoveState = 'windup';
        const hopProgress = (tick - 4) / 8; // 0.0 to 1.0
        this.z = Math.sin(hopProgress * Math.PI) * 11; // 0 -> 11px -> 0
        const hopSpeed = this.speed * 1.4;
        this.vx = Math.cos(angle) * hopSpeed;
        this.vy = Math.sin(angle) * hopSpeed;
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

        const leapSpeed = this.speed * 2.6;
        this.vx = Math.cos(angle) * leapSpeed;
        this.vy = Math.sin(angle) * leapSpeed;

        const dist = tgt ? Math.hypot(tgt.x - this.x, tgt.y - this.y) : 999;
        const hitReach = (this.r || 22) + (tgt?.r || 25) + 16;
        if ((dist <= hitReach || tick === 18) && !this.meleeHitDone.has('quickAttack') && tgt && tgt.hp > 0) {
          this.meleeHitDone.add('quickAttack');
          _playAshSound('hitStrong');
          triggerGlobalScreenShake(3.5, 6);
          const dmg = Math.round(18 * dmgMult);
          if (this.owner) {
            this.owner._dealPokemonDamage(tgt, dmg, { angle, knockback: 10, isSpecial: false });
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
        this.vx = 0;
        this.vy = 0;
      }
      // ── Stage 4: Recovery Settle (ticks 33–38) ──
      else if (tick <= 38) {
        this.meleeMoveState = 'recovery';
        this.z = 0;
        this.vx *= 0.8;
        this.vy *= 0.8;
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
        this.vx = Math.cos(angle) * (this.speed * 0.7);
        this.vy = Math.sin(angle) * (this.speed * 0.7);
        if (tick === 14) {
          _playAshSound('ironTailCast');
        }
      }
      // Phase 2: Poised Hold at Apex (ticks 15–17)
      else if (tick <= 17) {
        this.meleeMoveState = 'windup';
        this.z = 22;
        this.vx = 0;
        this.vy = 0;
      }
      // Phase 3: Heavy Tail Cleave Strike (ticks 18–25)
      else if (tick <= 25) {
        this.meleeMoveState = 'strike';
        const strikeP = (tick - 17) / 8;
        this.z = Math.max(0, 22 * (1 - strikeP));
        this.vx = Math.cos(angle) * (this.speed * 1.5);
        this.vy = Math.sin(angle) * (this.speed * 1.5);

        if (tick === 20 && !this.meleeHitDone.has('ironTail') && tgt && tgt.hp > 0) {
          this.meleeHitDone.add('ironTail');
          _playAshSound('hitStrong');
          triggerGlobalScreenShake(5.0, 10);
          const dmg = Math.round(28 * dmgMult);
          if (this.owner) {
            this.owner._dealPokemonDamage(tgt, dmg, { angle, knockback: 14, isSpecial: false });
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
        this.vx = 0;
        this.vy = 0;
      }
      // Phase 5: Recovery Settle (ticks 37–48)
      else if (tick <= 48) {
        this.meleeMoveState = 'recovery';
        this.z = 0;
        this.vx *= 0.8;
        this.vy *= 0.8;
      } else {
        this.meleeMoveState = null;
        this.meleeMoveKey = null;
        this.z = 0;
        this.actionAnimTimer = 0;
      }    } else if (key === 'dragonClaw') {
      this.meleeMoveMaxTicks = 52;
      this.z = 0; // Charizard remains firmly grounded throughout Dragon Claw combo (zero airborne hopping)
      // Phase 1: Coil & Lunge (ticks 1–13)
      if (tick <= 13) {
        this.meleeMoveState = 'windup';
        this.z = 0;
        this.vx = Math.cos(angle) * (this.speed * 1.25);
        this.vy = Math.sin(angle) * (this.speed * 1.25);
      }

      // Phase 2: Poised Hold (ticks 14–16)
      else if (tick <= 16) {
        this.meleeMoveState = 'windup';
        this.z = 0;
        this.vx = 0;
        this.vy = 0;
      }
      // Phase 3: Double Rending Claw Cleave (ticks 17–28)
      else if (tick <= 28) {
        this.meleeMoveState = 'strike';
        this.z = 0;
        this.vx = Math.cos(angle) * (this.speed * 0.9);
        this.vy = Math.sin(angle) * (this.speed * 0.9);

        // Sub-hit 1: Right Claw (tick 19)
        if (tick === 19 && !this.meleeHitDone.has('dragonClaw1') && tgt && tgt.hp > 0) {
          this.meleeHitDone.add('dragonClaw1');
          _playAshSound('hitWeak');
          triggerGlobalScreenShake(2.5, 4);
          const dmg = Math.round(14 * dmgMult);
          if (this.owner) {
            this.owner._dealPokemonDamage(tgt, dmg, { angle: angle - 0.25, knockback: 4, isSpecial: false });
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
            this.owner._dealPokemonDamage(tgt, dmg, { angle: angle + 0.25, knockback: 12, isSpecial: false });
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
        this.vx = 0;
        this.vy = 0;
      }
      // Phase 5: Recovery Settle (ticks 41–52)
      else if (tick <= 52) {
        this.meleeMoveState = 'recovery';
        this.z = 0;
        this.vx *= 0.8;
        this.vy *= 0.8;
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
        this.vx = Math.cos(angle) * (this.speed * 2.2);
        this.vy = Math.sin(angle) * (this.speed * 2.2);
        if (tick === 8) {
          _playAshSound('nightSlashCast');
        }
      }
      // Phase 2: Poised Hold (ticks 9–11)
      else if (tick <= 11) {
        this.meleeMoveState = 'windup';
        this.vx = 0;
        this.vy = 0;
      }
      // Phase 3: Dual Dark-Blade Cross-Cleave (ticks 12–20)
      else if (tick <= 20) {
        this.meleeMoveState = 'strike';
        this.vx = Math.cos(angle) * (this.speed * 1.1);
        this.vy = Math.sin(angle) * (this.speed * 1.1);

        if (tick === 16 && !this.meleeHitDone.has('nightSlash') && tgt && tgt.hp > 0) {
          this.meleeHitDone.add('nightSlash');
          _playAshSound('hitStrong');
          triggerGlobalScreenShake(4.5, 8);
          const dmg = Math.round(26 * dmgMult);
          if (this.owner) {
            this.owner._dealPokemonDamage(tgt, dmg, { angle, knockback: 10, isSpecial: false });
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
        this.vx = 0;
        this.vy = 0;
      }
      // Phase 5: Recovery Settle (ticks 31–42)
      else if (tick <= 42) {
        this.meleeMoveState = 'recovery';
        this.vx *= 0.8;
        this.vy *= 0.8;
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
        this.vx = Math.cos(angle) * (this.speed * 1.8);
        this.vy = Math.sin(angle) * (this.speed * 1.8);
      }
      // Phase 3: Flurry Barrage (ticks 7–30)
      else if (tick <= 30) {
        this.meleeMoveState = 'strike';
        this.vx = Math.cos(angle) * (this.speed * 0.4);
        this.vy = Math.sin(angle) * (this.speed * 0.4);

        // Hit 1: Left Aura Jab (tick 9)
        if (tick === 9 && !this.meleeHitDone.has('cc1') && tgt && tgt.hp > 0) {
          this.meleeHitDone.add('cc1');
          _playAshSound('machPunch');
          triggerGlobalScreenShake(2.0, 3);
          const dmg = Math.round(5 * dmgMult);
          if (this.owner) this.owner._dealPokemonDamage(tgt, dmg, { angle: angle - 0.15, knockback: 2, isSpecial: false });
          if (typeof tgt.applyTimeStop === 'function') tgt.applyTimeStop(4);
          spawnSparks(tgt.x, tgt.y, 3, 'cyan', '#22D3EE');
        }
        // Hit 2: Right Aura Hook (tick 16)
        if (tick === 16 && !this.meleeHitDone.has('cc2') && tgt && tgt.hp > 0) {
          this.meleeHitDone.add('cc2');
          _playAshSound('bulletPunch');
          triggerGlobalScreenShake(2.0, 3);
          const dmg = Math.round(5 * dmgMult);
          if (this.owner) this.owner._dealPokemonDamage(tgt, dmg, { angle: angle + 0.15, knockback: 2, isSpecial: false });
          if (typeof tgt.applyTimeStop === 'function') tgt.applyTimeStop(4);
          spawnSparks(tgt.x, tgt.y, 3, 'cyan', '#22D3EE');
        }
        // Hit 3: Spinning Roundhouse Kick (tick 23)
        if (tick === 23 && !this.meleeHitDone.has('cc3') && tgt && tgt.hp > 0) {
          this.meleeHitDone.add('cc3');
          _playAshSound('machPunch');
          triggerGlobalScreenShake(3.0, 4);
          const dmg = Math.round(6 * dmgMult);
          if (this.owner) this.owner._dealPokemonDamage(tgt, dmg, { angle, knockback: 4, isSpecial: false });
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
            this.owner._dealPokemonDamage(tgt, dmg, { angle, knockback: 16, isSpecial: false });
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
        this.vx = 0;
        this.vy = 0;
      }
      // Phase 5: Recovery Settle (ticks 42–54)
      else if (tick <= 54) {
        this.meleeMoveState = 'recovery';
        this.vx *= 0.8;
        this.vy *= 0.8;
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
      this.drawHealth(ctx);
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

    // Universal Humanoid Radius (Rule 24)
    this.r = cfg.radius || cfg.r || 25;
    this.radius = this.r;
    this.hp = cfg.hp || 360;
    this.maxHp = cfg.maxHp || this.hp;
    this.speed = cfg.speed || 5.5;
    this.baseSpeed = this.speed;

    // Core Mechanic State: Honeycomb Barrier & Pokémon Deployment
    this.pokemonOrder = cfg.pokemonOrder || ['pikachu', 'charizard', 'greninja', 'lucario'];
    this.nextPokemonIndex = 0;
    this.activePokemon = null;
    this.thrownPokeball = null;
    this.isProtectedByHoneycombBarrier = false;
    this.honeycombBarrierRadius = cfg.honeycombBarrierRadius || 46;
    this.barrierHitFlashTimer = 0;
    this.barrierActiveTimer = 0;
    this.barrierAngle = 0;
    this._barrierTextCooldown = 0;

    // Summon Cooldown (Mobile Evasion State when > 0 and no Pokémon active)
    this.summonCooldownMax = cfg.summonCooldownFrames || 210;
    this.summonCooldown = cfg.initialSummonDelayFrames ?? 24;

    // Skill 1: Trainer Command (Signature Pokémon Special Attack)
    this.commandCooldownMax = cfg.commandCooldownFrames || 150;
    this.commandCooldown = 48;

    // Ultimate: 10,000,000 Volt Thunderbolt Barrage
    this.ultimateCooldownMax = cfg.ultimateCooldownFrames || 780;    this.ultimateCooldown = 240;
    this.ultimateDurationMax = cfg.ultimateDurationFrames || 420;

    // Non-Freezing Visual Effects, Projectiles & Queued Move Cast SFX (Rule 25)
    this.activeVisualEffects = [];
    this.activeElementalProjectiles = [];
    this._queuedSoundEffects = [];
    this._animTick = 0;
  }

  reset() {
    super.reset();
    this._cleanupActivePokemon();
    this.thrownPokeball = null;
    this.isProtectedByHoneycombBarrier = false;
    this.barrierHitFlashTimer = 0;
    this.barrierActiveTimer = 0;
    this.barrierAngle = 0;
    this.summonCooldown = _getAshCfg().initialSummonDelayFrames ?? 24;
    this.commandCooldown = 48;
    this.ultimateCooldown = 240;
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
    return Boolean(
      this.isProtectedByHoneycombBarrier ||
      (this.activePokemon && this.activePokemon.hp > 0) ||
      this.thrownPokeball ||
      super.isStationarySkillActive?.()
    );
  }

  /**
   * Honeycomb Forcefield Barrier Damage Interception:
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
    return super.takeDamage(amount, attacker, opts);
  }

  /**
   * Rule 25: Decays visual effects, elemental projectiles & queued cast SFX at the top of update() BEFORE freeze guard.
   */
  _updateVisualEffects() {
    this._animTick = (this._animTick || 0) + 1;
    if (this.barrierHitFlashTimer > 0) this.barrierHitFlashTimer--;
    if (this.barrierActiveTimer > 0) this.barrierActiveTimer--;
    if (this._barrierTextCooldown > 0) this._barrierTextCooldown--;

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
    const targets = [];
    if (typeof state !== 'undefined' && Array.isArray(state.fighters)) {
      for (const f of state.fighters) {
        if (!f || f === this || f === this.activePokemon || f.hp <= 0 || f.dead || f.isDead) continue;
        if (f.owner === this) continue;
        if (this.teamId !== undefined && f.teamId !== undefined && this.teamId === f.teamId) continue;
        targets.push(f);
      }
    }
    if (targets.length === 0 && fallbackOpponent && fallbackOpponent !== this && fallbackOpponent !== this.activePokemon && fallbackOpponent.hp > 0) {
      targets.push(fallbackOpponent);
    }
    return targets;
  }

  _findBestTarget(fallbackOpponent = null) {
    const enemies = this._getValidEnemyTargets(fallbackOpponent);
    let best = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  _dealPokemonDamage(target, amount, opts = {}) {
    if (!target || target.hp <= 0) return false;
    const unifiedColor = this.damageNumberColor || '#FACC15';
    const landed = applyDamageToTarget(target, amount, this, {
      ...opts,
      damageNumberColor: unifiedColor
    });
    if (landed) {
      // Play canonical Empress impact SFX: hit_strong.ogg on specials/heavy hits, hit.ogg on standard strikes
      _playAshSound((opts.isSpecial || amount >= 24) ? 'hitStrong' : 'hit');
      spawnImpactFlash(target.x, target.y, this.themeColor, 16);
      if (opts.knockback && target.hp > 0) {
        const a = opts.angle ?? Math.atan2(target.y - this.y, target.x - this.x);
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
    }
    return landed;
  }

  /**
   * Throws a Poké Ball to deploy the next Pokémon in Ash's rotation.
   * Immediately locks Ash into his stationary Honeycomb Barrier Commander state!
   */
  _throwPokeball(opponent, arena) {
    const cfg = _getAshCfg();
    const speciesKey = this.pokemonOrder[this.nextPokemonIndex % this.pokemonOrder.length] || 'pikachu';
    this.nextPokemonIndex = (this.nextPokemonIndex + 1) % this.pokemonOrder.length;

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
    this.thrownPokeball = {
      speciesKey,
      startX: this.x + Math.cos(throwAngle) * (this.r * 0.85),
      startY: this.y + Math.sin(throwAngle) * (this.r * 0.85),
      targetX,
      targetY,
      timer: flightFrames,
      maxTimer: flightFrames,
    };

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
    this._cleanupActivePokemon();
    const pokemon = new PokemonCompanionEntity(this, ball.speciesKey, ball.targetX, ball.targetY);
    this.activePokemon = pokemon;
    // Synchronize commandCooldown with the spawned Pokémon's initial cooldown
    this.commandCooldown = Math.max(this.commandCooldown, pokemon.specialCooldown);
    this.isProtectedByHoneycombBarrier = true;
    this.vx = 0;
    this.vy = 0;

    if (typeof state !== 'undefined' && Array.isArray(state.fighters) && state.fighters.includes(this)) {
      state.fighters.push(pokemon);
    }

    _playAshSound('pbRelease');
    const cryToPlay = pokemon.spec.cryKey;
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

    // Drop Honeycomb Barrier & Resume Ash's Mobile Evasion!
    this.isProtectedByHoneycombBarrier = false;
    this.summonCooldown = this.summonCooldownMax;

    const evadeAngle = (this.gunAngle || 0) + Math.PI + (Math.random() - 0.5) * 0.9;
    this.vx = Math.cos(evadeAngle) * this.speed;
    this.vy = Math.sin(evadeAngle) * this.speed;
  }

  _cleanupActivePokemon() {
    if (this.activePokemon) {
      if (typeof state !== 'undefined' && Array.isArray(state.fighters)) {
        const idx = state.fighters.indexOf(this.activePokemon);
        if (idx !== -1) state.fighters.splice(idx, 1);
      }
      this.activePokemon = null;
    }
  }

  /**
   * Skill 1: Trainer Command — Orders the active Pokémon to unleash its signature move!
   * - Close Combat (<= 180px): Orders high-speed empowered melee combo (Iron Tail, Dragon Claw, Night Slash, Close Combat)!
   * - Long Range (> 180px): Orders signature ranged elemental special (Thunderbolt, Flamethrower, Water Shuriken, Aura Sphere)!
   */
  _executeTrainerCommand(opponent) {
    if (!this.activePokemon || this.activePokemon.hp <= 0) return;
    if (this.activePokemon.thunderboltState || this.activePokemon.isChannelingSkill?.()) return;
    if (this.commandCooldown > 0) return;

    const cd = Math.max(this.commandCooldownMax, this.activePokemon.specialCooldownMax || 0);
    this.commandCooldown = cd;
    this.activePokemon.specialCooldown = cd;

    const target = this._findBestTarget(opponent);
    if (!target) return;

    const dist = Math.hypot(target.x - this.activePokemon.x, target.y - this.activePokemon.y);
    if (dist <= 180 && typeof this.activePokemon._startCloseCombatMove === 'function') {
      this.activePokemon._startCloseCombatMove(target, null, true);
    } else {
      this._executePokemonSpecial(this.activePokemon, target, true);
    }
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
    const cd = Math.max(p.specialCooldownMax || 0, this.commandCooldownMax || 0);
    p.specialCooldown = cd;
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

    // If Ash has no active Pokémon out, instantly summon one!
    if ((!this.activePokemon || this.activePokemon.hp <= 0) && !this.thrownPokeball) {
      this.summonCooldown = 0;
      this._throwPokeball(opponent, arena);
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

    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

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
    if (bestTarget) {
      this.aim(bestTarget);
    }

    const cfg = _getAshCfg();

    // 4. Ultimate Trigger
    if (isSkillEnabled(cfg.enableUltimate, true) && this.ultimateCooldown <= 0 && bestTarget) {
      this._activateMegaAwakening(bestTarget, arena);
    }

    // 5. CORE STATE MACHINE:
    // STATE A: Pokémon is Active (or Poké Ball in flight or fainting/recalling) -> ASH STOPS MOVING & PROJECTS HONEYCOMB BARRIER!
    if ((this.activePokemon && (this.activePokemon.hp > 0 || this.activePokemon.isFainting)) || this.thrownPokeball) {
      this.isProtectedByHoneycombBarrier = true;
      this.vx = 0;
      this.vy = 0;

      // Trigger Trainer Command Special Move when ready (both Ash and Pokémon must be ready and not mid-cast)
      if (this.activePokemon &&
          this.activePokemon.hp > 0 &&
          isSkillEnabled(cfg.enableTrainerCommand, true) &&
          this.commandCooldown <= 0 &&
          this.activePokemon.specialCooldown <= 0 &&
          !this.activePokemon.thunderboltState &&
          !this.activePokemon.isChannelingSkill?.()) {
        this._executeTrainerCommand(bestTarget);
      }

      // Check for incoming attacks or nearby threatening enemies to project the directional barrier
      this._checkIncomingThreats(bestTarget);

      // Clamp Ash within arena walls while stationary
      this.resolveWallBounce(arena, bestTarget);
      return;
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
      // Cooldown finished! Throw next Poké Ball & enter stationary Honeycomb Barrier state
      this._throwPokeball(bestTarget, arena);
      return;
    }

    // Centralized Movement Physics & Wall Bounce (Rule 1.2)
    super.update(bestTarget, ownerIndex, arena);
  }

  /**
   * Evaluates incoming projectile threats or approaching enemies to activate the directional barrier shield.
   */
  _checkIncomingThreats(primaryTarget = null) {
    if (!this.isProtectedByHoneycombBarrier) return;
    const bRadius = this.honeycombBarrierRadius || 46;
    const threatDist = bRadius + 110;

    // 1. Check incoming projectiles moving toward Ash
    if (typeof state !== 'undefined' && Array.isArray(state.projectiles)) {
      for (let i = 0; i < state.projectiles.length; i++) {
        const p = state.projectiles[i];
        if (!p || p.dead || p.life <= 0) continue;
        if (p.owner === this || p.owner === this.activePokemon) continue;
        if (this.teamId !== undefined && p.teamId !== undefined && this.teamId === p.teamId) continue;

        const pdx = this.x - p.x;
        const pdy = this.y - p.y;
        const pDist = Math.hypot(pdx, pdy);
        if (pDist <= threatDist) {
          // Check if projectile is flying toward Ash
          const dot = (p.vx || 0) * pdx + (p.vy || 0) * pdy;
          if (dot > 0 || pDist <= bRadius + 25) {
            const incomingAngle = Math.atan2(p.y - this.y, p.x - this.x);
            this.barrierAngle = incomingAngle;
            this.barrierActiveTimer = Math.max(this.barrierActiveTimer || 0, 12);
            return;
          }
        }
      }
    }

    // 2. Check nearby enemy fighters attacking or moving toward Ash
    const enemies = this._getValidEnemyTargets(primaryTarget);
    for (const enemy of enemies) {
      if (!enemy || enemy.hp <= 0) continue;
      const edx = enemy.x - this.x;
      const edy = enemy.y - this.y;
      const dist = Math.hypot(edx, edy);
      if (dist <= threatDist) {
        const enemyAimingAtAsh = Math.abs(Math.atan2(-edy, -edx) - (enemy.gunAngle || 0)) < 1.0;
        const enemyMovingToAsh = ((enemy.vx || 0) * -edx + (enemy.vy || 0) * -edy) > 0;
        if (enemyAimingAtAsh || enemyMovingToAsh || dist <= bRadius + 30) {
          const enemyAngle = Math.atan2(edy, edx);
          this.barrierAngle = enemyAngle;
          this.barrierActiveTimer = Math.max(this.barrierActiveTimer || 0, 10);
          return;
        }
      }
    }
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
