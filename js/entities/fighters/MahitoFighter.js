// ─────────────────────────────────────────────
// MAHITO FIGHTER — Cursed Spirit of Human Hatred
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { drawMahitoSkin } from '../../graphics/fighters/mahitoSkin.js';
import { spawnImpactFlash, spawnSparks } from '../../graphics/particles/sparkEffect.js';
import { spawnIllusionSpawn } from '../../graphics/particles/illusionSpawnEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { 
  executeIdleTransfigurationStrike, 
  executeSubterraneanFleshSurge, 
  executeMahitoSoulPhaseSlip,
  updateMahitoSoulPhaseSlip,
  executeMahitoMaceCannon,
  updateMahitoMaceCannon,
  executeMahitoTwinScissor,
  updateMahitoTwinScissor,
  updateMahitoFleshSurge, 
  updateSoulDisfigurementDecay,
  executeMahitoSoulMultiplicity
} from './mahito/mahitoCombat.js';

export class MahitoFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'mahito';
    this.type = 'mahito';

    // Core combat & morph state
    this.isMeleeFighter = true;
    this.punchAnimTimer = 0;
    this.punchMaxTime = CONFIG.mahito?.punchSpeed || 20;
    this.cooldownTimer = 0;
    this.isRightPunch = true;
    this.morphType = 'claw';
    this.morphAttackCount = 0;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    this.combatAuraOpacity = 0.0; // Smooth dynamic Cursed Energy aura opacity

    // Passive Skill: Phantom Soul Slip (Phase-Through Claw Dash)
    this.soulPhaseDashTimer = 0;
    this.soulPhaseDashCooldown = CONFIG.mahito?.soulPhaseSlip?.cooldown || 180;
    this.soulPhaseDashTarget = null;
    this.soulPhaseDashHit = false;
    this._dashAfterimages = [];

    // Special Morph Skills (Shared Unified Cooldown for Skills 2, 3, and 4)
    this.sharedSkillCooldown = 0;
    this.fleshSurgeCooldown = CONFIG.mahito?.sharedSkillCooldown || CONFIG.mahito?.fleshSurge?.cooldown || 300;
    this.fleshSurgeAnimTimer = 0;
    this.fleshSurgeMaxTime = CONFIG.mahito?.fleshSurge?.animDuration || 24;
    this._fleshSurgePlungeAngle = null;

    // Third Skill: Mutated Mace Cannon (Stretch Arm Spiked Ball Shrapnel)
    this.maceCannonCooldown = CONFIG.mahito?.sharedSkillCooldown || CONFIG.mahito?.maceCannon?.cooldown || 300;
    this.maceCannonAnimTimer = 0;
    this._maceCannonData = null;

    // Fourth Skill: Dual Scythe Pincer Guillotine (Twin Stretched Blade Ambush)
    this.twinScissorCooldown = CONFIG.mahito?.sharedSkillCooldown || CONFIG.mahito?.twinScissor?.cooldown || 300;
    this.twinScissorAnimTimer = 0;
    this._twinScissorData = null;

    // Fifth Skill: Soul Multiplicity & Body Repel (Independent Cooldown)
    this.soulMultiplicityCooldown = CONFIG.mahito?.soulMultiplicity?.cooldown || 400;

    // Transformation: Instant Spirit Body of Distorted Killing (ISBoDK)
    this.isTransformed = false;
    this.isDistortedKilling = false;
    this.transformDuration = 0;
    this.transformCooldown = CONFIG.mahito?.transformation?.cooldown || 1200;
    this.hasTransformed = false;
    this.noDamageTimer = 0;
    
    // Evasion Mechanic State
    this.hasTriggeredEvasion = false;
    this.isEvading = false;
    this.evasionTimer = 0;
    this.evasionBounceTimer = 0;
    this.originalRadius = this.r;
  }

  reset() {
    super.reset();
    this.punchAnimTimer = 0;
    this.cooldownTimer = 0;
    this.soulPhaseDashTimer = 0;
    this.soulPhaseDashCooldown = CONFIG.mahito?.soulPhaseSlip?.cooldown || 180;
    this.soulPhaseDashTarget = null;
    this.soulPhaseDashHit = false;
    this._dashAfterimages = [];
    this.sharedSkillCooldown = 0;
    this.fleshSurgeCooldown = CONFIG.mahito?.sharedSkillCooldown || CONFIG.mahito?.fleshSurge?.cooldown || 300;
    this.fleshSurgeAnimTimer = 0;
    this._fleshSurgePlungeAngle = null;
    this.maceCannonCooldown = CONFIG.mahito?.sharedSkillCooldown || CONFIG.mahito?.maceCannon?.cooldown || 300;
    this.maceCannonAnimTimer = 0;
    this._maceCannonData = null;
    this.twinScissorCooldown = CONFIG.mahito?.sharedSkillCooldown || CONFIG.mahito?.twinScissor?.cooldown || 300;
    this.twinScissorAnimTimer = 0;
    this._twinScissorData = null;
    this.soulMultiplicityCooldown = CONFIG.mahito?.soulMultiplicity?.cooldown || 400;
    this.isTransformed = false;
    this.isDistortedKilling = false;
    this.transformDuration = 0;
    this.transformCooldown = CONFIG.mahito?.transformation?.cooldown || 1200;
    this.hasTransformed = false;
    this.hasTriggeredEvasion = false;
    this.isEvading = false;
    this.evasionTimer = 0;
    this.evasionBounceTimer = 0;
    this.r = this.originalRadius || this.r; // Restore original scaled radius on reset
    this._originalMaxHp = null;
    this.morphType = 'claw';
    this.morphAttackCount = 0;
    this.combatAuraOpacity = 0.0;
    this.noDamageTimer = 0;
  }

  /**
   * Triggers Instant Spirit Body of Distorted Killing transformation.
   */
  activateDistortedKilling() {
    if (this.isTransformed || this.isEvading) return;
    this.isTransformed = true;
    this.isDistortedKilling = true;
    this.transformDuration = CONFIG.mahito?.transformation?.duration || 600;

    // Recover HP immediately upon transformation
    const healPct = CONFIG.mahito?.transformation?.healPercentage ?? 0.25;
    const healAmount = Math.round(this.maxHp * healPct);
    this.hp = Math.min(this.maxHp, this.hp + healAmount);

    spawnFloatingText(this.x, this.y - this.r - 28, "INSTANT SPIRIT BODY!", "#D946EF");
    spawnFloatingText(this.x, this.y - this.r - 12, `+${healAmount} HP`, "#22c55e");
    triggerGlobalScreenShake(12, 12);
    spawnImpactFlash(this.x, this.y, 90, '#D946EF');
    audioSystem.playSFX('Assets/Sound Effects/Skills/enhance.mp3', 2.0);
    audioSystem.playSFX('Assets/Sound Effects/Attacks/heavypunch1.mp3', 1.8);
  }

  /**
   * Reverts transformation back to base form.
   */
  revertTransformation() {
    this.isTransformed = false;
    this.isDistortedKilling = false;
    this.transformDuration = 0;
    this.transformCooldown = CONFIG.mahito?.transformation?.cooldown || 1200;

    spawnFloatingText(this.x, this.y - this.r - 28, "FORM REVERTED", "#A855F7");
    spawnImpactFlash(this.x, this.y, 40, 'rgba(168, 85, 247, 0.7)');
  }

  takeDamage(amount, source, opts = {}) {
    if (amount <= 0) return false;

    let finalDamage = amount;

    if (this.isTransformed) {
      // Transformed defense bonus (Takes 50% less damage)
      const defenseMult = CONFIG.mahito?.transformation?.defenseMultiplier ?? 0.50;
      finalDamage *= defenseMult;
    } else {
      // Base passive damage reduction (25% reduction vs all attacks)
      const reduction = CONFIG.mahito?.soulDurabilityReduction ?? 0.25;
      finalDamage *= (1 - reduction);
    }

    const res = super.takeDamage(finalDamage, source, opts);
    if (res) {
      this.noDamageTimer = 0;
    }

    // Auto-trigger transformation when low HP in combat if available
    const threshold = CONFIG.mahito?.transformation?.autoTransformThreshold ?? 0.10;
    if (!this.hasTransformed && (this.hp / this.maxHp) <= threshold && !this.isTransformed) {
      this.hasTransformed = true;
      this.activateDistortedKilling();
    }

    return res;
  }

  _findClosestEnemy(preferredOpponent = null) {
    if (preferredOpponent && !preferredOpponent.isDead && preferredOpponent.hp > 0) {
      return preferredOpponent;
    }
    if (typeof state === 'undefined' || !state.fighters) return null;
    const myIdx = state.fighters.indexOf(this);
    const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIdx) : this.team;
    let closest = null;
    let minDist = Infinity;
    const candidates = [...state.fighters, ...(state.illusions || [])];
    for (let i = 0; i < candidates.length; i++) {
      const ent = candidates[i];
      if (!ent || ent === this || ent.isDead || ent.hp <= 0) continue;
      const entIdx = state.fighters.indexOf(ent);
      if (entIdx !== -1) {
        const enemyTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(entIdx) : ent.team;
        if (myTeam !== null && enemyTeam === myTeam) continue;
      } else if (ent.owner) {
        const ownerIdx = state.fighters.indexOf(ent.owner);
        const ownerTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(ownerIdx) : ent.owner.team;
        if (myTeam !== null && ownerTeam === myTeam) continue;
      }
      const dist = Math.hypot(ent.x - this.x, ent.y - this.y);
      if (dist < minDist) {
        minDist = dist;
        closest = ent;
      }
    }
    return closest;
  }

  /**
   * Overrides aim to disable body & gunAngle rotation during active skill channeling until finished.
   */
  aim(opponent) {
    if (this.fleshSurgeAnimTimer > 0 || this.maceCannonAnimTimer > 0 || this.twinScissorAnimTimer > 0) return;
    super.aim(opponent);
  }

  /**
   * Prevents pushback, flinches, or minor damage from interrupting Twin Scythe Guillotine channeling (Hyper-Armor).
   */
  interruptAttacks(forceCancelAll = false) {
    if (this.twinScissorAnimTimer > 0 && !forceCancelAll) {
      return;
    }
    super.interruptAttacks(forceCancelAll);
  }

  update(opponent, ownerIndex, arena) {
    if (this.isDead || this.hp <= 0) {
      this.punchAnimTimer = 0;
      return;
    }

    if (this.isEvading) {
      if (this.evasionBounceTimer > 0) {
        this.evasionBounceTimer--;
      } else {
        // AI / Player: Force fleeing steering away from nearest enemy
        const target = this._findClosestEnemy(opponent);
        if (target) {
          const dx = this.x - target.x;
          const dy = this.y - target.y;

          // Wall avoidance force
          const pad = 50;
          let avoidX = 0;
          let avoidY = 0;
          if (arena) {
            if (this.x - this.r - arena.x < pad) avoidX = 1.2;
            else if (arena.x + arena.width - (this.x + this.r) < pad) avoidX = -1.2;
            if (this.y - this.r - arena.y < pad) avoidY = 1.2;
            else if (arena.y + arena.height - (this.y + this.r) < pad) avoidY = -1.2;
          }

          const fleeAngle = Math.atan2(dy, dx);
          let targetAngle = fleeAngle;
          if (avoidX !== 0 || avoidY !== 0) {
            const avoidAngle = Math.atan2(avoidY, avoidX);
            targetAngle = fleeAngle * 0.4 + avoidAngle * 0.6;
          }

          const finalAngle = targetAngle + (Math.random() * 0.3 - 0.15);
          // Ensure high evasion run speed
          const runSpeed = (CONFIG.mahito?.moveSpeed || 5.8) * (CONFIG.mahito?.evasion?.speedMultiplier || 1.25);
          this.vx = Math.cos(finalAngle) * runSpeed;
          this.vy = Math.sin(finalAngle) * runSpeed;
          this.gunAngle = finalAngle;
          this.angle = finalAngle;
        }
      }

      this.evasionTimer--;
      if (this.evasionTimer <= 0) {
        this.endEvasion();
      }

      super.update(opponent, ownerIndex, arena);
      return;
    }

    // ── 1. RULE #1: Freeze / TimeStop Early Exit Guard ──
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks(true);
      return;
    }

    // ── 2. Health Regeneration Mechanic ──
    this.noDamageTimer = (this.noDamageTimer || 0) + 1;
    const regenCfg = CONFIG.mahito?.regen || {};
    const regenDelay = regenCfg.delay || 60;
    const regenRate = regenCfg.rate || 0.16;

    if (this.noDamageTimer >= regenDelay && this.hp > 0 && this.hp < this.maxHp) {
      const oldHp = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + regenRate);
      const actualHealed = this.hp - oldHp;

      this._regenAccumulator = (this._regenAccumulator || 0) + actualHealed;
      this._regenAccumTimer = (this._regenAccumTimer || 0) + 1;

      if (this._regenAccumTimer >= 30) {
        this._regenAccumTimer = 0;
        const healDisplay = Math.round(this._regenAccumulator);
        this._regenAccumulator = 0;
        if (healDisplay > 0) {
          spawnFloatingText(this.x + (Math.random() - 0.5) * 16, (this.y - (this.z || 0)) - this.r - 15, `+${healDisplay}`, '#00FF66');
        }
      }

      // Periodically spawn subtle green/magenta healing wisps
      if (Math.random() < 0.20 && typeof spawnSparks === 'function') {
        spawnSparks(this.x + (Math.random() - 0.5) * this.r, this.y + (Math.random() - 0.5) * this.r, 1, 'arcaneAscendLine', '#00FF66');
      }
    } else {
      this._regenAccumulator = 0;
      this._regenAccumTimer = 0;
    }

    if (this.soulMultiplicityCooldown > 0) this.soulMultiplicityCooldown--;

    // Update active Mutated Mace Cannon (3rd Skill)
    if (this.maceCannonCooldown > 0) this.maceCannonCooldown--;
    updateMahitoMaceCannon(this);
    if (this.maceCannonAnimTimer > 0) {
      this.combatAuraOpacity = Math.min(1.0, (this.combatAuraOpacity || 0) + 0.15);
      this.hideBackHand = true;
      this.hideFrontHand = false;
    }

    // Update active Dual Scythe Pincer Guillotine (4th Skill)
    if (this.twinScissorCooldown > 0) this.twinScissorCooldown--;
    updateMahitoTwinScissor(this);
    if (this.twinScissorAnimTimer > 0) {
      this.combatAuraOpacity = Math.min(1.0, (this.combatAuraOpacity || 0) + 0.18);
      this.hideFrontHand = true;
      this.hideBackHand = true;

      const lockedAngle = (this._twinScissorData && this._twinScissorData.angle !== undefined)
        ? this._twinScissorData.angle
        : (this.gunAngle || 0);

      const originalSpeed = this.speed;
      this.speed = 0; // Prevent self-steering movement acceleration

      const hasKnockback = (this.knockbackVx !== undefined && (Math.abs(this.knockbackVx) > 0.1 || Math.abs(this.knockbackVy) > 0.1)) || (this.knockbackStunTimer > 0);
      if (!hasKnockback) {
        // Halt self-movement velocities completely if not knocked back
        this.vx = 0;
        this.vy = 0;
      }

      // Execute normal physics, status effect decays, and boundary bounces
      super.update(opponent, ownerIndex, arena);

      // Re-anchor twin scissor shoulder origins immediately to current fighter position after physics/knockback step
      if (this._twinScissorData) {
        const angle = this._twinScissorData.angle !== undefined ? this._twinScissorData.angle : lockedAngle;
        const r = this.r || 25;
        const facingLeft = Math.abs(angle) > Math.PI / 2;
        const leftOriginX = this.x + (r * 0.70 * Math.cos(angle) - (facingLeft ? r * 0.18 : -r * 0.18) * Math.sin(angle));
        const leftOriginY = this.y + (r * 0.70 * Math.sin(angle) + (facingLeft ? r * 0.18 : -r * 0.18) * Math.cos(angle));
        const rightOriginX = this.x + (r * 0.45 * Math.cos(angle) - (facingLeft ? -r * 0.18 : r * 0.18) * Math.sin(angle));
        const rightOriginY = this.y + (r * 0.45 * Math.sin(angle) + (facingLeft ? -r * 0.18 : r * 0.18) * Math.cos(angle));

        this._twinScissorData.leftOriginX = leftOriginX;
        this._twinScissorData.leftOriginY = leftOriginY;
        this._twinScissorData.rightOriginX = rightOriginX;
        this._twinScissorData.rightOriginY = rightOriginY;

        if (this._twinScissorData.leftNodes && this._twinScissorData.leftNodes.length > 0) {
          this._twinScissorData.leftNodes[0].x = leftOriginX;
          this._twinScissorData.leftNodes[0].y = leftOriginY;
        }
        if (this._twinScissorData.rightNodes && this._twinScissorData.rightNodes.length > 0) {
          this._twinScissorData.rightNodes[0].x = rightOriginX;
          this._twinScissorData.rightNodes[0].y = rightOriginY;
        }
        if (this._twinScissorData.steppedLeftNodes && this._twinScissorData.steppedLeftNodes.length > 0) {
          this._twinScissorData.steppedLeftNodes[0].x = leftOriginX;
          this._twinScissorData.steppedLeftNodes[0].y = leftOriginY;
        }
        if (this._twinScissorData.steppedRightNodes && this._twinScissorData.steppedRightNodes.length > 0) {
          this._twinScissorData.steppedRightNodes[0].x = rightOriginX;
          this._twinScissorData.steppedRightNodes[0].y = rightOriginY;
        }
      }

      // Lock body rotation and facing angle strictly to the target angle
      this.gunAngle = lockedAngle;
      this.angle = lockedAngle;
      this.speed = originalSpeed; // Restore normal movement speed

      if (this.twinScissorAnimTimer > 0) this.twinScissorAnimTimer--;
      if (this.twinScissorAnimTimer <= 0) {
        this.hideFrontHand = false;
        this.hideBackHand = false;
        this._twinScissorData = null;
      }
      if (this.cooldownTimer > 0) this.cooldownTimer--;

      // Decay active soul disfigurement timers on targets
      updateSoulDisfigurementDecay();

      // Update Transformation duration & cooldown
      if (this.isTransformed) {
        if (this.transformDuration > 0) {
          this.transformDuration--;
          if (this.transformDuration <= 0) {
            this.revertTransformation();
          }
        }
      } else if (this.transformCooldown > 0) {
        this.transformCooldown--;
      }

      // Smooth Cursed Energy opacity
      const isCountdown = typeof state !== 'undefined' && state.gameState === 'countdown';
      const isCombatActive = this.punchAnimTimer > 0 || this.twinScissorAnimTimer > 0 || this.isTransformed || isCountdown || this._isWinnerReveal;
      if (isCombatActive) {
        this.combatAuraOpacity = Math.min(1.0, (this.combatAuraOpacity || 0) + 0.12);
      } else {
        this.combatAuraOpacity = Math.max(0.0, (this.combatAuraOpacity || 0) - 0.04);
      }

      return;
    }

    // Bypasses self-steering movement and locks body rotation during Subterranean Flesh Surge
    if (this.fleshSurgeAnimTimer > 0) {
      const lockedAngle = (this._fleshSurgePlungeAngle !== null && this._fleshSurgePlungeAngle !== undefined)
        ? this._fleshSurgePlungeAngle
        : (this.gunAngle || 0);

      const originalSpeed = this.speed;
      this.speed = 0; // Prevent self-steering movement acceleration

      const hasKnockback = (this.knockbackVx !== undefined && (Math.abs(this.knockbackVx) > 0.1 || Math.abs(this.knockbackVy) > 0.1)) || (this.knockbackStunTimer > 0);
      if (!hasKnockback) {
        // Halt self-movement velocities completely if not knocked back
        this.vx = 0;
        this.vy = 0;
      }

      // Execute normal physics, status effect decays, and boundary bounces
      super.update(opponent, ownerIndex, arena);

      // Lock body rotation and facing angle strictly to the plunge direction
      this.gunAngle = lockedAngle;
      this.angle = lockedAngle;
      this.speed = originalSpeed; // Restore normal movement speed

      if (this.fleshSurgeAnimTimer > 0) this.fleshSurgeAnimTimer--;
      if (this.fleshSurgeAnimTimer <= 0) {
        this.hideFrontHand = false;
        this._fleshSurgePlungeAngle = null;
      }
      if (this.fleshSurgeCooldown > 0) this.fleshSurgeCooldown--;
      if (this.punchAnimTimer > 0) this.punchAnimTimer--;
      if (this.cooldownTimer > 0) this.cooldownTimer--;

      // Update active Subterranean Flesh Surge 3-phase staggered animation & hits
      updateMahitoFleshSurge(this);

      // Decay active soul disfigurement timers on targets
      updateSoulDisfigurementDecay();

      // Update Transformation duration & cooldown
      if (this.isTransformed) {
        if (this.transformDuration > 0) {
          this.transformDuration--;
          if (this.transformDuration <= 0) {
            this.revertTransformation();
          }
        }
      } else if (this.transformCooldown > 0) {
        this.transformCooldown--;
      }

      // Smooth Cursed Energy opacity
      const isCountdown = typeof state !== 'undefined' && state.gameState === 'countdown';
      const isCombatActive = this.punchAnimTimer > 0 || this.fleshSurgeAnimTimer > 0 || this.isTransformed || isCountdown || this._isWinnerReveal;
      if (isCombatActive) {
        this.combatAuraOpacity = Math.min(1.0, (this.combatAuraOpacity || 0) + 0.12);
      } else {
        this.combatAuraOpacity = Math.max(0.0, (this.combatAuraOpacity || 0) - 0.04);
      }

      return;
    }

    // ── Update Passive: Phantom Soul Slip (Phase-Through Claw Dash) ──
    if (this.soulPhaseDashCooldown > 0) this.soulPhaseDashCooldown--;
    updateMahitoSoulPhaseSlip(this);

    // If actively in soul phase dash, bypass normal steering physics and zero normal velocities
    if (this.soulPhaseDashTimer > 0) {
      this.vx = 0;
      this.vy = 0;
      if (this.punchAnimTimer > 0) this.punchAnimTimer--;
      if (this.cooldownTimer > 0) this.cooldownTimer--;
      if (this.fleshSurgeCooldown > 0) this.fleshSurgeCooldown--;
      this.combatAuraOpacity = Math.min(1.0, (this.combatAuraOpacity || 0) + 0.15);
      return;
    }

    super.update(opponent, ownerIndex, arena);

    // Cooldown management
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.cooldownTimer > 0) this.cooldownTimer--;
    if (this.fleshSurgeAnimTimer > 0) this.fleshSurgeAnimTimer--;
    if (this.fleshSurgeAnimTimer <= 0) {
      this.hideFrontHand = false;
    }
    if (this.sharedSkillCooldown > 0) this.sharedSkillCooldown--;
    if (this.fleshSurgeCooldown > 0) this.fleshSurgeCooldown--;
    if (this.maceCannonCooldown > 0) this.maceCannonCooldown--;
    if (this.twinScissorCooldown > 0) this.twinScissorCooldown--;

    // Dynamic Cursed Energy combat aura opacity management
    const isCountdown = typeof state !== 'undefined' && state.gameState === 'countdown';
    const isDoingClawAttack = this.punchAnimTimer > 0 && this.morphType === 'claw';
    const isCombatActive = isCountdown || this._isWinnerReveal || isDoingClawAttack;
    if (isCombatActive) {
      this.combatAuraOpacity = Math.min(1.0, (this.combatAuraOpacity || 0) + 0.12);
    } else {
      this.combatAuraOpacity = Math.max(0.0, (this.combatAuraOpacity || 0) - 0.04);
    }

    // Decay active soul disfigurement timers on targets
    updateSoulDisfigurementDecay();

    // Process active Subterranean Flesh Surge 3-phase staggered animation & hits
    updateMahitoFleshSurge(this);

    // Update Transformation duration & cooldown
    if (this.isTransformed) {
      if (this.transformDuration > 0) {
        this.transformDuration--;
        if (this.transformDuration <= 0) {
          this.revertTransformation();
        }
      }
    } else if (this.transformCooldown > 0) {
      this.transformCooldown--;
    }

    // AI Drive Melee Combat & Flesh Surge Skill Drive
    if (!this.playerControlled) {
      const target = this._findClosestEnemy(opponent);

      if (target) {
        this.aim(target);
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        const reach = CONFIG.mahito?.punchRange || 75;
        const maxReach = this.r + target.r + reach;
        const minSurgeDist = CONFIG.mahito?.fleshSurge?.minDistance || 240;
        const maxSurgeDist = CONFIG.mahito?.fleshSurge?.reachMax || 420;
        const dashRangeMin = CONFIG.mahito?.soulPhaseSlip?.triggerRangeMin || 70;
        const dashRangeMax = CONFIG.mahito?.soulPhaseSlip?.triggerRangeMax || 220;
        const maceMinDist = CONFIG.mahito?.maceCannon?.minDistance || 240;
        const maceMaxDist = CONFIG.mahito?.maceCannon?.reachMax || 380;
        const scissorMinDist = CONFIG.mahito?.twinScissor?.minDistance || 240;
        const scissorMaxDist = CONFIG.mahito?.twinScissor?.reachMax || 360;
        const sharedSkillCd = Math.max(
          this.sharedSkillCooldown || 0,
          this.fleshSurgeCooldown || 0,
          this.maceCannonCooldown || 0,
          this.twinScissorCooldown || 0
        );

        // 1. Passive Trigger: Phantom Soul Slip (Phase-Through Claw Dash) in Mid-Range
        if (dist >= dashRangeMin && dist <= dashRangeMax && (this.soulPhaseDashCooldown || 0) <= 0) {
          this.executeSoulPhaseSlip(target);
        }
        // 2. Soul Multiplicity & Body Repel (Fifth Skill - Independent Cooldown)
        //    Block summoning if previous transfigured human minions are still alive
        else if ((this.soulMultiplicityCooldown || 0) <= 0) {
          const hasLivingMinions = state.illusions && state.illusions.some(
            il => il && il.isTransfiguredHuman && il.owner === this && il.hp > 0
          );
          if (!hasLivingMinions) {
            this.executeSoulMultiplicity(target);
          }
        }
        // 3. Close-Range Combat: If enemy is near, execute Melee Strikes
        else if (dist <= maxReach) {
          if ((this.cooldownTimer || 0) <= 0) {
            this.executeIdleTransfigurationStrike(target);
          }
        }
        // 3. Special Morph Skills (Skills 2, 3, and 4): Single Shared Cooldown, Random Choice at Long Range (>= 240px)
        else if (dist >= 240 && sharedSkillCd <= 0) {
          const availableSkills = [];
          if (dist <= maxSurgeDist) availableSkills.push('fleshSurge');
          if (dist <= maceMaxDist) availableSkills.push('maceCannon');
          if (dist <= scissorMaxDist) availableSkills.push('twinScissor');

          if (availableSkills.length > 0) {
            const chosenSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
            if (chosenSkill === 'twinScissor') {
              this.executeTwinScissor(target);
            } else if (chosenSkill === 'maceCannon') {
              this.executeMaceCannon(target);
            } else {
              this.executeSubterraneanFleshSurge(target);
            }
          }
        }
      }
    }
  }

  /**
   * Executes Fourth Skill: Idle Transfiguration — Dual Scythe Pincer Guillotine (Twin Stretched Blade Ambush).
   * Guarded to prevent triggering when the enemy is in close quarters (< minScissorDist).
   */
  executeTwinScissor(target = null) {
    if (this.isEvading || (this.paralyzeTimer || 0) > 0 || this.isParalyzed || this.fleshSurgeAnimTimer > 0 || this.maceCannonAnimTimer > 0) return;

    // Proximity Guard: Do NOT trigger if target is in close quarters
    const tgt = target || this._findClosestEnemy();
    if (tgt && !tgt.isDead && tgt.hp > 0) {
      const dist = Math.hypot(tgt.x - this.x, tgt.y - this.y);
      const minScissorDist = CONFIG.mahito?.twinScissor?.minDistance || 240;
      if (dist < minScissorDist) {
        return;
      }
    }

    const sharedCd = CONFIG.mahito?.sharedSkillCooldown || 300;
    this.sharedSkillCooldown = sharedCd;
    this.fleshSurgeCooldown = sharedCd;
    this.maceCannonCooldown = sharedCd;
    this.twinScissorCooldown = sharedCd;

    executeMahitoTwinScissor(this, target);
  }

  /**
   * Executes Third Skill: Idle Transfiguration — Mutated Mace Cannon (Stretch Arm Spiked Ball Shrapnel).
   * Guarded to prevent triggering when the enemy is in close quarters (< minMaceDist).
   */
  executeMaceCannon(target = null) {
    if (this.isEvading || (this.paralyzeTimer || 0) > 0 || this.isParalyzed || this.fleshSurgeAnimTimer > 0 || this.twinScissorAnimTimer > 0) return;

    // Proximity Guard: Do NOT trigger if target is in close quarters
    const tgt = target || this._findClosestEnemy();
    if (tgt && !tgt.isDead && tgt.hp > 0) {
      const dist = Math.hypot(tgt.x - this.x, tgt.y - this.y);
      const minMaceDist = CONFIG.mahito?.maceCannon?.minDistance || 240;
      if (dist < minMaceDist) {
        return;
      }
    }

    const sharedCd = CONFIG.mahito?.sharedSkillCooldown || 300;
    this.sharedSkillCooldown = sharedCd;
    this.fleshSurgeCooldown = sharedCd;
    this.maceCannonCooldown = sharedCd;
    this.twinScissorCooldown = sharedCd;

    executeMahitoMaceCannon(this, target);
  }

  /**
   * Executes Passive: Phantom Soul Slip (Phase-Through Claw Dash).
   */
  executeSoulPhaseSlip(target = null) {
    const evasionThreshold = CONFIG.mahito?.evasion?.threshold || 0.35;
    const canEvade = (typeof state !== 'undefined' && state.gameState === 'playing') && 
                     this.hp > 0 && this.maxHp > 0 && 
                     (this.hp / this.maxHp) <= evasionThreshold && 
                     !this.hasTriggeredEvasion;

    if (!canEvade) {
      if (this.isEvading || (this.paralyzeTimer || 0) > 0 || this.isParalyzed) return;
    }

    if (canEvade) {
      this.triggerEvasion();
      return;
    }

    executeMahitoSoulPhaseSlip(this, target);
  }

  /**
   * Executes Idle Transfiguration Punch / Blade / Mace Swing adhering to Rule #7 & #8 Frontal Arc standard.
   */
  executeIdleTransfigurationStrike(target = null) {
    if (this.isEvading || (this.paralyzeTimer || 0) > 0 || this.isParalyzed || this.fleshSurgeAnimTimer > 0 || this.maceCannonAnimTimer > 0 || this.twinScissorAnimTimer > 0) return;
    executeIdleTransfigurationStrike(this, target);
  }

  /**
   * Executes Idle Transfiguration: Subterranean Flesh Surge (Underground Arm Eruption).
   * Guarded to prevent triggering when the enemy is in close quarters (< minSurgeDist).
   */
  executeSubterraneanFleshSurge(target = null) {
    if (this.isEvading || (this.paralyzeTimer || 0) > 0 || this.isParalyzed || this.maceCannonAnimTimer > 0 || this.twinScissorAnimTimer > 0) return;

    // Proximity Guard: Do NOT trigger if target is in close quarters
    const tgt = target || this._findClosestEnemy();
    if (tgt && !tgt.isDead && tgt.hp > 0) {
      const dist = Math.hypot(tgt.x - this.x, tgt.y - this.y);
      const minSurgeDist = CONFIG.mahito?.fleshSurge?.minDistance || 240;
      if (dist < minSurgeDist) {
        return;
      }
    }

    const sharedCd = CONFIG.mahito?.sharedSkillCooldown || 300;
    this.sharedSkillCooldown = sharedCd;
    this.fleshSurgeCooldown = sharedCd;
    this.maceCannonCooldown = sharedCd;
    this.twinScissorCooldown = sharedCd;

    executeSubterraneanFleshSurge(this, target);
  }

  /**
   * Executes Fifth Skill: Soul Multiplicity (Transfigured Humans) or Alt Cast: Body Repel.
   */
  executeSoulMultiplicity(target = null) {
    if (this.isEvading || (this.paralyzeTimer || 0) > 0 || this.isParalyzed || this.fleshSurgeAnimTimer > 0 || this.maceCannonAnimTimer > 0 || this.twinScissorAnimTimer > 0) return;
    executeMahitoSoulMultiplicity(this, target);
  }

  triggerDemoAttack() {
    if (this._demoToggle === undefined) {
      this._demoToggle = 0;
    }
    this._demoToggle = (this._demoToggle + 1) % 4;
    if (this._demoToggle === 1) {
      this.executeSubterraneanFleshSurge();
    } else if (this._demoToggle === 2) {
      this.executeMaceCannon();
    } else if (this._demoToggle === 3) {
      this.executeTwinScissor();
    } else {
      this.executeIdleTransfigurationStrike();
    }
  }

  triggerEvasion() {
    const evaCfg = CONFIG.mahito?.evasion || {};
    this.hasTriggeredEvasion = true;
    this.isEvading = true;
    this.evasionTimer = evaCfg.duration || 300;

    // Clear active stuns/hitstuns to let him slip out of combos
    this.hitStunTimer = 0;
    this.paralyzeTimer = 0;
    this.isParalyzed = false;

    // Shrink hurtbox
    this.originalRadius = this.r || 25;
    this._originalMaxHp = this.maxHp;
    const evasionRadius = evaCfg.radius || 8;
    this.r = evasionRadius;

    // Interrupt any active morph animations
    this.punchAnimTimer = 0;
    this.fleshSurgeAnimTimer = 0;
    this.maceCannonAnimTimer = 0;
    this.twinScissorAnimTimer = 0;
    this._twinScissorData = null;
    this._maceCannonData = null;

    // Spawn small evasion illusions
    const cloneCount = evaCfg.cloneCount || 3;
    const numCopies = Math.max(1, cloneCount - 1); // Spawn clones so total small versions is exactly cloneCount
    const speed = this.speed || 5.8;
    const color = this.color || '#C026D3';

    // Split current HP & maxHP equally among all copies (divided by cloneCount)
    const splitHp = Math.max(1, Math.round((this.hp / cloneCount) * 100) / 100);
    const splitMaxHp = Math.max(1, Math.round((this.maxHp / cloneCount) * 100) / 100);

    this.hp = splitHp;
    this.maxHp = splitMaxHp;

    for (let i = 0; i < numCopies; i++) {
      const angle = (Math.PI * 2 / cloneCount) * (i + 1);
      const copy = {
        x: this.x + Math.cos(angle) * (this.originalRadius + 10),
        y: this.y + Math.sin(angle) * (this.originalRadius + 10),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: evasionRadius,
        color: color,
        hp: splitHp,
        maxHp: splitMaxHp,
        damage: 0,
        owner: this,
        isIllusion: true,
        isEvasionMinion: true,
        isTransfiguredHuman: false,
        angle: angle,
        gunAngle: angle,
        moveSpeed: speed,
        hitFlashTimer: 0,
        timeStopTimer: 0,
        hitStunTimer: 0,
        swordCooldown: 9999,
        takeDamage(amount, attacker, opts = {}) {
          return applyDamageToTarget(this, amount, attacker, opts);
        }
      };
      if (typeof state !== 'undefined' && state.illusions) {
        state.illusions.push(copy);
        spawnIllusionSpawn(copy);
      }
    }

    spawnFloatingText(this.x, this.y - this.r - 28, "👤 SOUL SPLIT EVASION!", "#C026D3");
    triggerGlobalScreenShake(6, 10);
    audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 1.0);
  }

  endEvasion() {
    this.isEvading = false;
    this.r = this.originalRadius || 25;
    if (this._originalMaxHp) {
      this.maxHp = this._originalMaxHp;
    }

    let bestEntity = this;
    let highestHp = this.hp > 0 ? this.hp : 0;
    let totalSurvivingHp = Math.max(0, this.hp);

    if (typeof state !== 'undefined' && state.illusions) {
      const minions = state.illusions.filter(il => il && il.isEvasionMinion && il.owner === this);
      for (const minion of minions) {
        if (minion.hp > 0) {
          totalSurvivingHp += minion.hp;
          if (minion.hp > highestHp) {
            highestHp = minion.hp;
            bestEntity = minion;
          }
        }
      }

      // Reconstitute at the location of the best surviving entity
      if (bestEntity !== this) {
        this.x = bestEntity.x;
        this.y = bestEntity.y;
        this.aim(this._findClosestEnemy());
      }

      // If Mahito's original body died but clones survived, revive him
      if (totalSurvivingHp > 0) {
        this.isDead = false;
        this.hp = Math.min(this.maxHp, totalSurvivingHp);
      } else {
        // All copies died - Mahito stays dead
        this.hp = 0;
        this.isDead = true;
      }

      // Remove evasion minions
      state.illusions = state.illusions.filter(il => !(il && il.isEvasionMinion && il.owner === this));
    }

    spawnFloatingText(this.x, this.y - this.r - 28, "👤 SOUL RECONSOLIDATION!", "#C026D3");
    triggerGlobalScreenShake(6, 12);
    spawnImpactFlash(this.x, this.y, 45, '#C026D3');
    audioSystem.playSFX('Assets/Sound Effects/Skills/enhance.mp3', 1.0);
  }

  resolveWallBounce(arena, opponent) {
    const bounced = super.resolveWallBounce(arena, opponent);
    if (bounced && this.isEvading) {
      // Temporarily pause flee steering so the natural bounce velocity can execute cleanly
      this.evasionBounceTimer = 18;
    }
    return bounced;
  }

  shoot(ownerIndex) {
    if (this.isCaughtInBeam()) {
      this.interruptAttacks();
      return;
    }
    if ((this.paralyzeTimer || 0) > 0 || this.isParalyzed) return;

    // If called automatically by Fighter.js base loop for AI, do not swing unless strictly in range
    if (!this.playerControlled) {
      const target = this._findClosestEnemy();
      if (target) {
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        const reach = CONFIG.mahito?.punchRange || 75;
        const maxReach = this.r + target.r + reach;
        if (dist <= maxReach && (this.cooldownTimer || 0) <= 0) {
          this.executeIdleTransfigurationStrike(target);
        }
      }
      return;
    }

    // Player-controlled manual click
    if ((this.cooldownTimer || 0) > 0) return;
    this.executeIdleTransfigurationStrike();
  }

  draw(ctx) {
    if (this.hp <= 0) return;
    drawMahitoSkin(ctx, this);
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
