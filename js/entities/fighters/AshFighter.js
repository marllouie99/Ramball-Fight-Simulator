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
  // Intentionally suppressed: All Ash SFX removed per user instruction
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
  constructor(owner, speciesKey, spawnX, spawnY, isMega = false) {
    const cfg = _getAshCfg();
    const spec = cfg.pokemonRoster?.[speciesKey] || ashConfig.pokemonRoster.pikachu;
    super({
      id: `pokemon_${speciesKey}`,
      name: isMega && spec.megaName ? spec.megaName : spec.name,
      displayName: isMega && spec.megaName ? spec.megaName : spec.name,
      type: `pokemon_${speciesKey}`,
      color: isMega && spec.megaColor ? spec.megaColor : spec.themeColor,
      themeColor: isMega && spec.megaColor ? spec.megaColor : spec.themeColor,
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
    this.hideHands = true;

    this.speciesId = speciesKey;
    this.spec = spec;
    this.isMega = Boolean(isMega);
    this.name = isMega && spec.megaName ? spec.megaName : spec.name;
    this.displayName = this.name;
    this.themeColor = isMega && spec.megaColor ? spec.megaColor : spec.themeColor;
    this.megaColor = spec.megaColor || '#38BDF8';
    this.color = this.themeColor;
    this.damageNumberColor = owner.damageNumberColor || '#FACC15';

    this.x = spawnX;
    this.y = spawnY;
    this.r = spec.radius || 22;
    this.radius = this.r;
    const hpMult = this.isMega ? 1.25 : 1.0;
    this.hp = Math.round((spec.hp || 170) * hpMult);
    this.maxHp = this.hp;
    this.speed = (spec.speed || 5.8) * (this.isMega ? 1.18 : 1.0);
    this.baseSpeed = this.speed;
    this.spriteScale = spec.scale || 1.5;

    const launchAngle = owner.gunAngle || 0;
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
    this.faintTimer = 0;
    this.thunderboltState = null;
    this.thunderboltTimer = 0;
    this.thunderboltHitEnemies = new Set();
  }

  shoot() {
    // Intentionally empty (Rule 23): Pokémon uses dedicated melee blitz & elemental specials
  }

  /**
   * Rule 1.4: Lock aim rotation while Pikachu is casting Thunderbolt (windup, active beam, or recovery).
   */
  canAim() {
    if (this.thunderboltState) return false;
    return super.canAim();
  }

  isStationarySkillActive() {
    return Boolean(this.thunderboltState || super.isStationarySkillActive?.());
  }

  isChannelingSkill() {
    return Boolean(this.thunderboltState || super.isChannelingSkill?.());
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

  awakenMega() {
    if (this.hp <= 0) return;
    this.isMega = true;
    if (this.spec.megaName) {
      this.name = this.spec.megaName;
      this.displayName = this.spec.megaName;
    }
    if (this.spec.megaColor) {
      this.themeColor = this.spec.megaColor;
      this.color = this.spec.megaColor;
    }
    const healAmt = Math.round(this.maxHp * (_getAshCfg().ultimatePokemonHealRatio || 0.50));
    this.hp = Math.min(this.maxHp, this.hp + healAmt);
    this.speed = (this.spec.speed || 5.8) * 1.22;
    this.baseSpeed = this.speed;
    if (this.spec.megaCryKey) {
      _playAshSound(this.spec.megaCryKey);
    }
  }

  takeDamage(amount, attacker, opts = {}) {
    // Friendly-fire immunity from owner Ash
    if (attacker && (attacker === this.owner || (attacker.teamId !== undefined && this.teamId !== undefined && attacker.teamId === this.teamId))) {
      return false;
    }
    const landed = super.takeDamage(amount, attacker, opts);
    if (landed && this.hp > 0) {
      this.hurtAnimTimer = 12;
      this.animState = 'hurt';
    }
    return landed;
  }

  update(opponent, ownerIndex, arena) {
    this.animTick = (this.animTick || 0) + 1;

    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    if (this.hp <= 0) return;

    this.handleStatusEffects();
    if (this.meleeCooldown > 0) this.meleeCooldown--;
    if (!this.thunderboltState && this.specialCooldown > 0) this.specialCooldown--;
    if (this.actionAnimTimer > 0) this.actionAnimTimer--;
    if (this.hurtAnimTimer > 0) this.hurtAnimTimer--;
    if (typeof this.thunderboltImpactTimer === 'number') {
      this.thunderboltImpactTimer++;
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
          const bonusMult = (this.thunderboltCmdMult || 1.0) * (this.isMega ? 1.25 : 1.0);
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

    // Acquire nearest valid enemy target
    const target = this.owner?._findBestTarget(opponent) || opponent;
    if (target && target.hp > 0) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      const targetAngle = Math.atan2(dy, dx);
      this.gunAngle = targetAngle;
      this.angle = targetAngle;

      // Steer toward enemy target
      const curSpd = Math.max(2.5, Math.hypot(this.vx, this.vy));
      this.vx = this.vx * 0.84 + Math.cos(targetAngle) * curSpd * 0.16;
      this.vy = this.vy * 0.84 + Math.sin(targetAngle) * curSpd * 0.16;

      // Autonomous Signature Special Skill (e.g. Pikachu's THUNDERBOLT!) when ready
      if (this.specialCooldown <= 0 && !this.thunderboltState && dist <= 550 && this.owner) {
        const cd = Math.max(this.specialCooldownMax, this.owner.commandCooldownMax || 0);
        this.specialCooldown = cd;
        this.owner.commandCooldown = cd;
        if (this.speciesId === 'pikachu') {
          this.startThunderbolt(target, false);
        } else {
          this.owner._executePokemonSpecial(this, target, false);
        }
      } else {
        // Melee Attack when within reach
        const reach = (this.spec.meleeReach || 68) + (target.r || 25);
        if (dist <= reach && this.meleeCooldown <= 0) {
          this._performMeleeStrike(target, targetAngle);
        }
      }
    }

    // Update animation state
    if (this.actionAnimTimer > 0) {
      // Keep active 'attack' or 'special' state
    } else if (this.hurtAnimTimer > 0) {
      this.animState = 'hurt';
    } else if (Math.hypot(this.vx, this.vy) > 0.6) {
      this.animState = 'walk';
    } else {
      this.animState = 'idle';
    }

    super.update(target, ownerIndex, arena);
  }

  _performMeleeStrike(target, angle) {
    this.meleeCooldown = this.meleeCooldownMax;
    this.animState = 'attack';
    this.actionAnimTimer = 18;
    this.animTick = 0;
    this.comboStep = (this.comboStep || 0) + 1;

    // Pikachu alternates between Quick Attack (high-speed dash blitz) and Iron Tail (heavy tail cleave)
    const isPikachuQuickAttack = this.speciesId === 'pikachu' && (this.comboStep % 2 === 1);
    const dashMult = isPikachuQuickAttack ? 1.60 : 1.35;
    this.vx = Math.cos(angle) * (this.speed * dashMult);
    this.vy = Math.sin(angle) * (this.speed * dashMult);

    const moveSfxKey = isPikachuQuickAttack
      ? (this.spec.altMeleeSfx || 'quickAttack')
      : (this.spec.meleeSfx || 'hitStrong');

    if (this.owner) {
      this.owner._playMoveAudioSequence(moveSfxKey);
    } else {
      _playAshSound(moveSfxKey);
    }

    const dmgMult = (this.isMega ? 1.30 : 1.0) * (this.speciesId === 'pikachu' && !isPikachuQuickAttack ? 1.15 : 1.0);
    const dmg = Math.round((this.spec.meleeDamage || 20) * dmgMult);

    if (this.owner) {
      this.owner._dealPokemonDamage(target, dmg, {
        knockback: isPikachuQuickAttack ? 8 : 12,
        angle,
        isSpecial: false
      });
      this.owner._spawnRippleEffect(
        target.x,
        target.y,
        isPikachuQuickAttack ? 36 : 46,
        isPikachuQuickAttack ? '#FFFFFF' : this.themeColor,
        'rgba(250, 204, 21, 0.16)',
        14
      );
    }
  }

  draw(ctx) {
    drawPokemonCompanion(ctx, this);
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
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

    // Ultimate: Bond Awakening / Mega Evolution & 10,000,000 Volt Thunderbolt
    this.ultimateCooldownMax = cfg.ultimateCooldownFrames || 780;
    this.ultimateCooldown = 240;
    this.ultimateActiveTimer = 0;
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
    this.ultimateActiveTimer = 0;
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
      isMega: this.ultimateActiveTimer > 0 && (speciesKey === 'charizard' || speciesKey === 'lucario')
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
    const isMega = Boolean(ball.isMega || (this.ultimateActiveTimer > 0 && (ball.speciesKey === 'charizard' || ball.speciesKey === 'lucario')));
    const pokemon = new PokemonCompanionEntity(this, ball.speciesKey, ball.targetX, ball.targetY, isMega);
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
    const cryToPlay = (isMega && pokemon.spec.megaCryKey) ? pokemon.spec.megaCryKey : pokemon.spec.cryKey;
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
   * Handles when the active Pokémon faints:
   * - Plays faint sound & recall beam
   * - Drops Ash's Honeycomb Barrier
   * - Restores Ash's movement velocity while starting the Summon Cooldown!
   */
  _onActivePokemonFainted() {
    const fainted = this.activePokemon;
    if (!fainted) return;

    _playAshSound('faint');
    this.activeVisualEffects.push({
      type: 'recallBeam',
      fromX: fainted.x,
      fromY: fainted.y,
      toX: this.x,
      toY: this.y,
      timer: 16,
      maxTimer: 16
    });
    spawnFloatingText(this.x, this.y - this.r - 20, `${fainted.name} RETURN!`, '#EF4444');

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
   * Skill 1: Trainer Command — Orders the active Pokémon to unleash its signature elemental move!
   */
  _executeTrainerCommand(opponent) {
    if (!this.activePokemon || this.activePokemon.hp <= 0) return;
    if (this.activePokemon.specialCooldown > 0 || this.activePokemon.thunderboltState || this.activePokemon.isChannelingSkill?.()) return;
    if (this.commandCooldown > 0) return;

    const cd = Math.max(this.commandCooldownMax, this.activePokemon.specialCooldownMax || 0);
    this.commandCooldown = cd;
    this.activePokemon.specialCooldown = cd;

    const target = this._findBestTarget(opponent);
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
    const cd = Math.max(p.specialCooldownMax || 0, this.commandCooldownMax || 0);
    p.specialCooldown = cd;
    this.commandCooldown = cd;

    if (p.speciesId === 'pikachu') {
      if (typeof p.startThunderbolt === 'function') {
        p.startThunderbolt(target, isTrainerCommand);
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

    const moveTitle = (p.isMega && spec.megaSpecialName) ? spec.megaSpecialName : (spec.specialName || 'THUNDERBOLT!');
    spawnFloatingText(p.x, p.y - p.r - 22, moveTitle, p.themeColor);

    // Play canonical 2-stage Empress move audio sequence (e.g. thunderbolt-1.ogg -> thunderbolt-2.ogg)
    this._playMoveAudioSequence(spec.specialSfx || 'thunderbolt');

    const cmdMult = isTrainerCommand ? (_getAshCfg().commandDamageBonus || 1.25) : 1.0;
    const bonusMult = cmdMult * (p.isMega ? 1.25 : 1.0);

    if (p.speciesId === 'charizard') {
      // Flamethrower / Blue Flare Blitz Fire Stream + AOE Burst
      const rad = spec.specialRadius || 120;
      const fireColor = p.isMega ? '#38BDF8' : '#F97316';
      const burstX = p.x + Math.cos(castAngle) * 70;
      const burstY = p.y + Math.sin(castAngle) * 70;
      this._spawnRippleEffect(burstX, burstY, rad, fireColor, 'rgba(249, 115, 22, 0.22)', 22);
      triggerGlobalScreenShake(6, 10);

      for (let i = -1; i <= 1; i++) {
        const a = castAngle + i * 0.20;
        this.activeElementalProjectiles.push({
          kind: 'fireBlast',
          isMega: p.isMega,
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
        r: p.isMega ? 19 : 15,
        life: 65,
        damage: Math.round((spec.specialDamage || 30) * bonusMult),
        knockback: 16,
        color: '#22D3EE'
      });
    }
  }

  /**
   * Ultimate: Bond Awakening / Mega Evolution & 10,000,000 Volt Thunderbolt Barrage!
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
    } else if (this.activePokemon && this.activePokemon.hp > 0) {
      this.activePokemon.awakenMega();
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
      if (this.activePokemon.hp <= 0 || this.activePokemon.dead || this.activePokemon.isDead) {
        this._onActivePokemonFainted();
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
    if (isSkillEnabled(cfg.enableMegaAwakening, true) && this.ultimateCooldown <= 0 && bestTarget) {
      this._activateMegaAwakening(bestTarget, arena);
    }

    // 5. CORE STATE MACHINE:
    // STATE A: Pokémon is Active (or Poké Ball in flight) -> ASH STOPS MOVING & PROJECTS HONEYCOMB BARRIER!
    if ((this.activePokemon && this.activePokemon.hp > 0) || this.thrownPokeball) {
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
