// ─────────────────────────────────────────────
// MAHITO FIGHTER — Cursed Spirit of Human Hatred
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { drawMahitoSkin } from '../../graphics/fighters/mahitoSkin.js';
import { spawnImpactFlash, spawnSparks, spawnMahitoSoulBubbles, spawnMahitoSoulExplosion } from '../../graphics/particles/sparkEffect.js';
import { spawnIllusionSpawn } from '../../graphics/particles/illusionSpawnEffect.js';
import { spawnIllusionDeath } from '../../graphics/particles/illusionDeathEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { triggerHudHealBubble } from '../../graphics/hudManager.js';
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
  executeMahitoSoulMultiplicity,
  executeMahitoDomainExpansion,
  updateMahitoDomainExpansion
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

    // Ultimate: Domain Expansion — Self-Embodiment of Perfection
    this.domainCooldown = CONFIG.mahito?.domainExpansion?.cooldown || 2000;
    this.domainActive = false;
    this.domainTimer = 0;
    this.domainChargeTimer = 0;
    this.domainChargeMax = CONFIG.mahito?.domainExpansion?.chargeMax || 120;

    
    // Evasion Mechanic State
    this.hasTriggeredEvasion = false;
    this.isEvading = false;
    this.evasionTimer = 0;
    this.evasionBounceTimer = 0;
    this.cloneNoiseTimer = 0;
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
    this.domainCooldown = CONFIG.mahito?.domainExpansion?.cooldown || 2000;
    this.domainActive = false;
    this.domainTimer = 0;
    this.domainChargeTimer = 0;
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
    const isEnabled = CONFIG.mahito?.transformation?.enabled ?? true;
    if (!isEnabled || this.isTransformed || this.isEvading) return;
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
    const mahitoCfg = CONFIG.mahito || {};
    audioSystem.playSFX(mahitoCfg.sounds?.bodyExplode || 'Assets/Sound Effects/Skills/mahito-body-explode.mp3', 2.0);
  }

  /**
   * Reverts transformation back to base form.
   */
  revertTransformation() {
    this.isTransformed = false;
    this.isDistortedKilling = false;
    this.transformDuration = 0;
    this.clawRevertTimer = 18; // Trigger shivering & boiling claw hide animation!
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

    // Auto-trigger transformation when low HP in combat if enabled
    const isTransEnabled = CONFIG.mahito?.transformation?.enabled ?? true;
    const threshold = CONFIG.mahito?.transformation?.autoTransformThreshold ?? 0.10;
    if (isTransEnabled && !this.hasTransformed && (this.hp / this.maxHp) <= threshold && !this.isTransformed) {
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
    if (this.fleshSurgeAnimTimer > 0 || this.maceCannonAnimTimer > 0 || this.twinScissorAnimTimer > 0 || this.domainChargeTimer > 0) return;
    super.aim(opponent);
  }

  /**
   * Prevents pushback, flinches, or minor damage from interrupting Twin Scythe Guillotine channeling (Hyper-Armor).
   */
  interruptAttacks(forceCancelAll = false) {
    if ((this.twinScissorAnimTimer > 0 || this.domainChargeTimer > 0) && !forceCancelAll) {
      return;
    }
    super.interruptAttacks(forceCancelAll);
  }

  update(opponent, ownerIndex, arena) {
    if (this.isDead || this.hp <= 0) {
      this.punchAnimTimer = 0;
      return;
    }

    // Handle Pre-Split Boiling & Shivering Animation before split
    if (this.isPreSplitting) {
      this.preSplitTimer--;

      if (this.preSplitTimer <= 0) {
        this.isPreSplitting = false;
        this.executeActualSplit();
      }

      super.update(opponent, ownerIndex, arena);
      return;
    }

    if (this.isEvading) {
      // Enforce evasion speedMultiplier (1.25x) from CONFIG on main body
      const evaSpeedMult = CONFIG.mahito?.evasion?.speedMultiplier || 1.25;
      const targetSpeed = (this.baseSpeed || CONFIG.mahito?.moveSpeed || 5.8) * evaSpeedMult;
      const currentSpeed = Math.hypot(this.vx, this.vy);
      if (currentSpeed > 0) {
        this.vx = (this.vx / currentSpeed) * targetSpeed;
        this.vy = (this.vy / currentSpeed) * targetSpeed;
        const moveAngle = Math.atan2(this.vy, this.vx);
        this.gunAngle = moveAngle;
        this.angle = moveAngle;
      }

      // ── Evasion Health Regeneration Buff ──
      const evaRegenRate = CONFIG.mahito?.evasion?.regenRate ?? 0.40;
      if (this.hp > 0 && this.hp < this.maxHp) {
        this.hp = Math.min(this.maxHp, Number((this.hp + evaRegenRate).toFixed(2)));
        this._evadeRegenTick = (this._evadeRegenTick || 0) + 1;
        if (this._evadeRegenTick % 30 === 0 && typeof spawnFloatingText === 'function') {
          spawnFloatingText(this.x, this.y - this.r - 18, `+${(evaRegenRate * 30).toFixed(0)} HP`, '#4ADE80');
        }
      }

      // ── Periodic Ambient Clone Noise throughout Evasion Duration ──
      if (this.cloneNoiseTimer === undefined || this.cloneNoiseTimer === null) {
        this.cloneNoiseTimer = 50;
      }
      if (this.cloneNoiseTimer > 0) {
        this.cloneNoiseTimer--;
      } else {
        const mahitoCfg = CONFIG.mahito || {};
        const interval = mahitoCfg.sounds?.cloneNoiseInterval || 50;
        this.cloneNoiseTimer = interval + Math.floor((Math.random() - 0.5) * 20); // Dynamic jitter (~40-60 frames)
        const cloneSounds = [
          mahitoCfg.sounds?.splitCloneAlt || 'Assets/Sound Effects/Skills/mahito-split-clone1.mp3',
          mahitoCfg.sounds?.splitClone || 'Assets/Sound Effects/Skills/mahito-split-clone2.mp3'
        ];
        const chosenSound = cloneSounds[Math.floor(Math.random() * cloneSounds.length)];
        const vol = mahitoCfg.sounds?.cloneNoiseVolume ?? 1.5;
        if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
          audioSystem.playSFX(chosenSound, vol);
        }
      }

      this.evasionTimer--;

      // Expansion / Reconsolidation Phase when duration is about to end (last 60 frames)
      const expansionFrames = 60;
      if (this.evasionTimer <= expansionFrames) {
        this.isEvasionExpanding = true;
        const progress = Math.min(1.0, Math.max(0.0, 1.0 - (this.evasionTimer / expansionFrames)));
        const easeProgress = Math.sin(progress * (Math.PI / 2));

        const evaCfg = CONFIG.mahito?.evasion || {};
        const smallR = evaCfg.radius || 8;
        const normalR = this.originalRadius || 25;

        // Select the chosen clone/body with highest HP for reconsolidation once
        if (!this.chosenReconsolidationTarget) {
          let bestEntity = this;
          let highestHp = this.hp > 0 ? this.hp : 0;
          if (typeof state !== 'undefined' && state.illusions) {
            const minions = state.illusions.filter(il => il && il.isEvasionMinion && il.owner === this);
            for (const minion of minions) {
              if (minion.hp > highestHp) {
                highestHp = minion.hp;
                bestEntity = minion;
              }
            }
          }
          this.chosenReconsolidationTarget = bestEntity;
        }

        const target = this.chosenReconsolidationTarget;
        if (target) {
          target.isChosenForReconsolidation = true;
          target.r = smallR + (normalR - smallR) * easeProgress;
          target.evasionExpandProgress = progress;
        }

        // Non-chosen clones stop moving, shiver & expand pre-explosion
        if (typeof state !== 'undefined' && state.illusions) {
          const minions = state.illusions.filter(il => il && il.isEvasionMinion && il.owner === this);
          for (const minion of minions) {
            if (minion !== target) {
              minion.isChosenForReconsolidation = false;
              minion.isDyingEvasion = true;
              minion.evasionExpandProgress = progress;
              minion.vx = 0; // STOP MOVING!
              minion.vy = 0; // STOP MOVING!
              minion.r = smallR + (normalR - smallR) * easeProgress; // Body expands/swells to full size!
            }
          }
        }
        if (this !== target) {
          this.isChosenForReconsolidation = false;
          this.isDyingEvasion = true;
          this.evasionExpandProgress = progress;
          this.vx = 0; // STOP MOVING!
          this.vy = 0; // STOP MOVING!
          this.r = smallR + (normalR - smallR) * easeProgress;
        }
      }

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
    const regenDelay = regenCfg.delay ?? 100;
    const regenRate = regenCfg.rate ?? 0.10;

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
    if (this.domainCooldown > 0 && !this.domainActive && this.domainChargeTimer <= 0) this.domainCooldown--;

    // Update Domain Expansion (Channeling & Active Barrier)
    updateMahitoDomainExpansion(this);
    if (this.domainChargeTimer > 0) {
      if (this._dashAfterimages) this._dashAfterimages.length = 0;
      if (this.afterImages) this.afterImages.length = 0;
      this.soulPhaseDashTimer = 0;
      this.soulPhaseDashVector = null;
      this.punchAnimTimer = 0;
      this.fleshSurgeAnimTimer = 0;
      this.maceCannonAnimTimer = 0;
      this.twinScissorAnimTimer = 0;
      this.hideFrontHand = false;
      this.hideBackHand = false;
      this.combatAuraOpacity = Math.min(1.0, (this.combatAuraOpacity || 0) + 0.18);
      // Halt velocities completely while channeling domain
      this.vx = 0;
      this.vy = 0;
      // Skip normal steering/movement updates and just resolve boundary bounds
      this.resolveWallBounce(arena);
      // Decay status effect timers during channeling
      if (this.knockbackStunTimer > 0) this.knockbackStunTimer--;
      if (this.hitStunTimer > 0) this.hitStunTimer--;
      return;
    }

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

    // Evasion Reconsolidation Transformation Delay: Stand still & play fusion morph animation before moving!
    if (this.evasionReconsolidateTimer > 0) {
      this.evasionReconsolidateTimer--;
      this.vx = 0;
      this.vy = 0;
      const t = this._findClosestEnemy(opponent);
      if (t) this.aim(t);
      if (this.punchAnimTimer > 0) this.punchAnimTimer--;
      if (this.cooldownTimer > 0) this.cooldownTimer--;
      this.combatAuraOpacity = Math.min(1.0, (this.combatAuraOpacity || 0) + 0.15);
      return;
    }

    super.update(opponent, ownerIndex, arena);

    // Cooldown management & Claw Reversion animation
    if (this.punchAnimTimer > 0) {
      if (this.punchAnimTimer === 1) {
        this.clawRevertTimer = this.domainActive ? 0 : 16; // Skip revert delay in domain for rapid continuous claw swings!
      }
      this.punchAnimTimer--;
    }
    if (this.clawRevertTimer > 0) {
      this.clawRevertTimer--;
    }
    if (this.cooldownTimer > 0) this.cooldownTimer--;
    if (this.fleshSurgeAnimTimer > 0) {
      if (this.fleshSurgeAnimTimer === 1) {
        this.clawRevertTimer = 16;
      }
      this.fleshSurgeAnimTimer--;
    }
    if (this.fleshSurgeAnimTimer <= 0) {
      this.hideFrontHand = false;
    }
    if (!this.isEvading && !this.isPreSplitting) {
      if (this.sharedSkillCooldown > 0) this.sharedSkillCooldown--;
      if (this.fleshSurgeCooldown > 0) this.fleshSurgeCooldown--;
      if (this.maceCannonCooldown > 0) this.maceCannonCooldown--;
      if (this.twinScissorCooldown > 0) this.twinScissorCooldown--;
      if (this.domainCooldown > 0) this.domainCooldown--;
      if (this.ultimateCooldown > 0) this.ultimateCooldown--;
    }

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
        let reach = CONFIG.mahito?.punchRange || 75;
        if (this.domainActive) {
          const isAnyDist = CONFIG.mahito?.domainExpansion?.anyDistanceBasicAttack ?? true;
          if (isAnyDist) {
            reach = 99999;
          } else {
            const domainReachMult = CONFIG.mahito?.domainExpansion?.punchRangeMultiplier ?? 2.00;
            reach *= domainReachMult;
          }
        }
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

        if (this.domainActive) {
          // Inside Domain (Sure-Hit Domain Effect): Trigger Idle Transfiguration skills at ANY distance across the screen!
          this.aim(target);
          if (sharedSkillCd <= 0) {
            const availableSkills = ['fleshSurge', 'maceCannon', 'twinScissor'];
            const chosenSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
            if (chosenSkill === 'twinScissor') {
              this.executeTwinScissor(target);
            } else if (chosenSkill === 'maceCannon') {
              this.executeMaceCannon(target);
            } else {
              this.executeSubterraneanFleshSurge(target);
            }
          } else if ((this.cooldownTimer || 0) <= 0) {
            this.executeIdleTransfigurationStrike(target);
          }
        } else {
          // 0. Ultimate: Domain Expansion — Self-Embodiment of Perfection
          if ((this.domainCooldown || 0) <= 0 && !this.domainActive && this.domainChargeTimer <= 0) {
            this.executeDomainExpansion(target);
          }
          // 1. Passive Trigger: Phantom Soul Slip (Phase-Through Claw Dash) in Mid-Range
          else if (dist >= dashRangeMin && dist <= dashRangeMax && (this.soulPhaseDashCooldown || 0) <= 0) {
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
    if (this.domainActive) return;
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
    if (this.domainActive) return;
    if (this.isEvading || (this.paralyzeTimer || 0) > 0 || this.isParalyzed || this.fleshSurgeAnimTimer > 0 || this.maceCannonAnimTimer > 0 || this.twinScissorAnimTimer > 0 || this.domainChargeTimer > 0) return;
    executeMahitoSoulMultiplicity(this, target);
  }

  /**
   * Executes Ultimate: Domain Expansion — Self-Embodiment of Perfection.
   */
  executeDomainExpansion(target = null) {
    if (this.domainActive) return;
    if (this.isEvading || (this.paralyzeTimer || 0) > 0 || this.isParalyzed || this.fleshSurgeAnimTimer > 0 || this.maceCannonAnimTimer > 0 || this.twinScissorAnimTimer > 0) return;
    this.punchAnimTimer = 0;
    this.fleshSurgeAnimTimer = 0;
    this._fleshSurgePlungeAngle = null;
    this.maceCannonAnimTimer = 0;
    this._maceCannonData = null;
    this.twinScissorAnimTimer = 0;
    this._twinScissorData = null;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    executeMahitoDomainExpansion(this, target);
  }

  triggerDemoAttack() {
    if (this.domainActive) {
      this.executeIdleTransfigurationStrike();
      return;
    }
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

  _decrementSkillCooldowns() {
    if (this.isEvading || this.isPreSplitting) return; // Freeze ALL skill cooldowns during Evasion state!
    super._decrementSkillCooldowns();
  }

  triggerEvasion() {
    if (this.hasTriggeredEvasion || this.isEvading || this.isPreSplitting) return;
    this.hasTriggeredEvasion = true;
    this.isPreSplitting = true;
    this.preSplitTimer = 35; // 35 frames (~0.6s) boiling & shivering charge animation before split

    // Clear active stuns/hitstuns
    this.hitStunTimer = 0;
    this.paralyzeTimer = 0;
    this.isParalyzed = false;

    // Store original properties
    this.originalRadius = this.r || 25;
    this._originalMaxHp = this.maxHp;

    // Interrupt any active morph animations
    this.punchAnimTimer = 0;
    this.fleshSurgeAnimTimer = 0;
    this.maceCannonAnimTimer = 0;
    this.twinScissorAnimTimer = 0;
    this._twinScissorData = null;
    this._maceCannonData = null;

    spawnFloatingText(this.x, this.y - this.r - 28, "👤 SOUL DISTORTION...", "#C026D3");
    triggerGlobalScreenShake(4, 8);
    const mahitoCfg = CONFIG.mahito || {};
    audioSystem.playSFX(mahitoCfg.sounds?.splitClone || 'Assets/Sound Effects/Skills/mahito-split-clone2.mp3', mahitoCfg.sounds?.splitCloneVolume ?? 1.8);
    audioSystem.playSFX(mahitoCfg.sounds?.splitCloneAlt || 'Assets/Sound Effects/Skills/mahito-split-clone1.mp3', mahitoCfg.sounds?.splitCloneVolume ?? 1.8);
  }

  executeActualSplit() {
    const evaCfg = CONFIG.mahito?.evasion || {};
    this.isEvading = true;
    this.evasionTimer = evaCfg.duration || 300;

    const evasionRadius = evaCfg.radius || 8;
    this.r = evasionRadius;

    // Spawn small evasion illusions
    const cloneCount = evaCfg.cloneCount || 3;
    const numCopies = Math.max(1, cloneCount - 1); // Spawn clones so total small versions is exactly cloneCount
    const launchSpeed = (CONFIG.mahito?.moveSpeed || 5.8) * (CONFIG.mahito?.evasion?.speedMultiplier || 1.25);
    const color = this.color || '#C026D3';

    // Split current HP & maxHP equally among all copies (divided by cloneCount)
    const splitHp = Math.max(1, Math.round((this.hp / cloneCount) * 100) / 100);
    const splitMaxHp = Math.max(1, Math.round(((this._originalMaxHp || 2000) / cloneCount) * 100) / 100);

    this.hp = splitHp;
    this.maxHp = splitMaxHp;

    const baseAngle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(baseAngle) * launchSpeed;
    this.vy = Math.sin(baseAngle) * launchSpeed;
    this.gunAngle = baseAngle;
    this.angle = baseAngle;

    // Exactly ONE clone (main body or one of the split copies) has Cursed Energy (CE) aura!
    const chosenCeIndex = Math.floor(Math.random() * cloneCount); // 0 = main body, 1..numCopies = copy
    this.hasCursedEnergyAura = (chosenCeIndex === 0);

    for (let i = 0; i < numCopies; i++) {
      const angle = baseAngle + (Math.PI * 2 / cloneCount) * (i + 1);
      const ownerStateIdx = this._stateIdx !== undefined ? this._stateIdx : (typeof state !== 'undefined' && state.fighters ? state.fighters.indexOf(this) : -1);
      const copy = {
        x: this.x + Math.cos(angle) * (this.originalRadius + 10),
        y: this.y + Math.sin(angle) * (this.originalRadius + 10),
        vx: Math.cos(angle) * launchSpeed,
        vy: Math.sin(angle) * launchSpeed,
        r: evasionRadius,
        color: color,
        hp: splitHp,
        maxHp: splitMaxHp,
        damage: 0,
        owner: this,
        ownerIndex: ownerStateIdx,
        isIllusion: true,
        isEvasionMinion: true,
        hasCursedEnergyAura: (chosenCeIndex === (i + 1)),
        isTransfiguredHuman: false,
        angle: angle,
        gunAngle: angle,
        moveSpeed: launchSpeed,
        hitFlashTimer: 0,
        timeStopTimer: 0,
        hitStunTimer: 0,
        slowTimer: 0,
        slowMultiplier: 1.0,
        knockbackVx: 0,
        knockbackVy: 0,
        hideFrontHand: true,
        hideBackHand: true,
        hideHands: true,
        punchAnimTimer: 0,
        fleshSurgeAnimTimer: 0,
        maceCannonAnimTimer: 0,
        twinScissorAnimTimer: 0,
        swordCooldown: 9999,
        takeDamage(amount, attacker, opts = {}) {
          // Dodge chance ONLY applies while active in small clone state
          if (this.isEvasionMinion && !this.isDying && !opts?.bypassEvade) {
            const dodgeChance = CONFIG.mahito?.evasion?.dodgeChance ?? 0.60;
            if (Math.random() < dodgeChance) {
              const now = Date.now();
              if (!this._lastEvadeTextTime || now - this._lastEvadeTextTime > 200) {
                this._lastEvadeTextTime = now;
                spawnFloatingText(this.x, this.y - this.r - 12, 'EVADE!', '#F5D0FE');
                audioSystem.playSFX('effect_dash', 0.5);
              }
              return false; // Attack dodged completely!
            }
          }
          return applyDamageToTarget(this, amount, attacker, opts);
        },
        applyHitStun(duration) {
          if (this.isEvasionMinion) return; // Never freeze evasion clone movement when attacked!
          this.hitStunTimer = Math.max(this.hitStunTimer || 0, duration);
        },
        applySlow(duration, multiplier) {
          this.slowTimer = Math.max(this.slowTimer || 0, duration);
          if (multiplier !== undefined) this.slowMultiplier = multiplier;
        },
        applyTimeStop(duration) {
          this.timeStopTimer = Math.max(this.timeStopTimer || 0, duration);
        },
        isPerformingSkill() { return false; },
        isCaughtInBeam() { return false; },
        normalizeSpeed() {}
      };
      if (typeof state !== 'undefined' && state.illusions) {
        state.illusions.push(copy);
      }
    }

    spawnFloatingText(this.x, this.y - this.r - 28, "👤 SOUL SPLIT EVASION!", "#C026D3");
    triggerGlobalScreenShake(6, 10);
    const mahitoCfg = CONFIG.mahito || {};
    audioSystem.playSFX(mahitoCfg.sounds?.splitClone || 'Assets/Sound Effects/Skills/mahito-split-clone2.mp3', mahitoCfg.sounds?.splitCloneVolume ?? 1.8);
    audioSystem.playSFX(mahitoCfg.sounds?.splitCloneAlt || 'Assets/Sound Effects/Skills/mahito-split-clone1.mp3', mahitoCfg.sounds?.splitCloneVolume ?? 1.8);
    this.cloneNoiseTimer = 50; // Initial interval before recurring clone chatter begins
  }

  getDisplayHp() {
    if (this.isEvading || this.isPreSplitting) {
      let totalHp = Math.max(0, this.hp);
      if (typeof state !== 'undefined' && state.illusions) {
        const minions = state.illusions.filter(il => il && il.isEvasionMinion && il.owner === this);
        for (const minion of minions) {
          if (minion.hp > 0) totalHp += minion.hp;
        }
      }
      return Math.round(totalHp);
    }
    return Math.round(this.hp);
  }

  endEvasion() {
    this.isEvading = false;
    this.isPreSplitting = false;
    this.isEvasionExpanding = false;
    this.cloneNoiseTimer = 0; // Stop clone chatter immediately when evasion ends
    delete this.evasionExpandProgress;
    const targetEntity = this.chosenReconsolidationTarget;
    delete this.chosenReconsolidationTarget;
    delete this.opacity;
    delete this.isChosenForReconsolidation;
    delete this.hasCursedEnergyAura;
    this.r = this.originalRadius || 25;
    if (this._originalMaxHp) {
      this.maxHp = this._originalMaxHp;
    }

    let bestEntity = targetEntity || this;
    let highestHp = this.hp > 0 ? this.hp : 0;
    let totalSurvivingHp = Math.max(0, this.hp);

    if (typeof state !== 'undefined' && state.illusions) {
      const minions = state.illusions.filter(il => il && il.isEvasionMinion && il.owner === this);
      for (const minion of minions) {
        if (minion.hp > 0) {
          totalSurvivingHp += minion.hp;
          if (!targetEntity && minion.hp > highestHp) {
            highestHp = minion.hp;
            bestEntity = minion;
          }
        }
      }

      // Non-chosen clones enter body swell & boil expansion phase before exploding!
      for (const minion of minions) {
        if (minion !== bestEntity && !minion.isDying) {
          minion.isDying = true;
          minion.deathTimer = 24;
          minion.maxDeathTimer = 24;
          minion.hp = 0;
        }
      }

      // If Mahito's original body was NOT chosen, trigger smooth dissolve explosion at old main body location
      if (bestEntity !== this) {
        const oldX = this.x;
        const oldY = this.y;
        if (typeof spawnIllusionDeath === 'function') {
          spawnIllusionDeath({ x: oldX, y: oldY, r: this.r || 25, color: '#D946EF' });
        }
        if (typeof spawnImpactFlash === 'function') {
          spawnImpactFlash(oldX, oldY, 35, '#D946EF');
        }
        if (typeof spawnMahitoSoulBubbles === 'function') {
          spawnMahitoSoulBubbles(oldX, oldY, 4, '#D946EF');
        }
        if (typeof spawnMahitoSoulExplosion === 'function') {
          spawnMahitoSoulExplosion(oldX, oldY, 35, true);
        }
        const mahitoCfg = CONFIG.mahito || {};
        if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
          audioSystem.playSFX(mahitoCfg.sounds?.splitClone || 'Assets/Sound Effects/Skills/mahito-split-clone2.mp3', mahitoCfg.sounds?.splitCloneVolume ?? 1.8);
          audioSystem.playSFX(mahitoCfg.sounds?.splitCloneAlt || 'Assets/Sound Effects/Skills/mahito-split-clone1.mp3', mahitoCfg.sounds?.splitCloneVolume ?? 1.8);
        }

        this.x = bestEntity.x;
        this.y = bestEntity.y;
        this.aim(this._findClosestEnemy());
      }

      // If Mahito's original body died but clones survived (or all survived), sum up all surviving HP and revive/heal
      if (totalSurvivingHp > 0) {
        this.isDead = false;
        this.hp = Math.min(this.maxHp, Number(totalSurvivingHp.toFixed(1)));
        this._healthBarHealTimer = 24;
        const finalDisplayHp = Math.round(this.hp);
        this._lastHealAmount = finalDisplayHp; // Trigger floating heal bubble on HUD bar!

        if (typeof spawnFloatingText === 'function') {
          spawnFloatingText(this.x + (Math.random() - 0.5) * 16, (this.y - (this.z || 0)) - this.r - 18, `+${finalDisplayHp} HP`, '#00FF66');
        }
      } else {
        // All copies died - Mahito stays dead
        this.hp = 0;
        this.isDead = true;
      }

      // Remove the chosen clone from state.illusions, allowing non-chosen dying clones to finish their swell phase
      state.illusions = state.illusions.filter(il => !(il && il.isEvasionMinion && il.owner === this && (il === bestEntity || !il.isDying)));
    }

    this.evasionReconsolidateTimer = 24; // 24 frames (~0.4s) reconsolidation delay before moving!
    this.evasionReconsolidateMax = 24;

    spawnFloatingText(this.x, this.y - this.r - 32, "👤 SOUL RECONSOLIDATION!", "#C026D3");
    triggerGlobalScreenShake(6, 12);
    spawnImpactFlash(this.x, this.y, 45, '#C026D3');
    const mahitoCfg = CONFIG.mahito || {};
    audioSystem.playFighterVoiceline(this, mahitoCfg.sounds?.transformBackVoiceline || 'Assets/Sound Effects/Skills/mahito-transformback-voiceline.mp3', mahitoCfg.sounds?.transformBackVoicelineVolume ?? 2.0);
  }

  resolveWallBounce(arena, opponent) {
    const bounced = super.resolveWallBounce(arena, opponent);
    if (bounced && this.isEvading) {
      const bAngle = Math.atan2(this.vy, this.vx) + (Math.random() - 0.5) * 0.20;
      const curB = Math.hypot(this.vx, this.vy);
      this.vx = Math.cos(bAngle) * curB;
      this.vy = Math.sin(bAngle) * curB;
      this.gunAngle = bAngle;
      this.angle = bAngle;
    }
    return bounced;
  }

  shoot(ownerIndex) {
    if (!this.canPerformBasicAttack()) return false;

    // If called automatically by Fighter.js base loop for AI
    if (!this.playerControlled) {
      const target = this._findClosestEnemy();
      if (target) {
        let reach = CONFIG.mahito?.punchRange || 75;
        if (this.domainActive) {
          const isAnyDist = CONFIG.mahito?.domainExpansion?.anyDistanceBasicAttack ?? true;
          if (isAnyDist) {
            reach = 99999;
          } else {
            const domainReachMult = CONFIG.mahito?.domainExpansion?.punchRangeMultiplier ?? 2.00;
            reach *= domainReachMult;
          }
        }
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        const maxReach = this.r + target.r + reach;
        if (dist <= maxReach && (this.cooldownTimer || 0) <= 0) {
          this.aim(target);
          this.executeIdleTransfigurationStrike(target);
        }
      }
      return;
    }

    // Player-controlled manual click
    if ((this.cooldownTimer || 0) > 0) return;
    const manualTarget = this._findClosestEnemy();
    if (manualTarget) this.aim(manualTarget);
    this.executeIdleTransfigurationStrike(manualTarget);
  }

  takeDamage(amount, attacker, opts = {}) {
    // Dodge chance ONLY works while actively in small clone evasion state!
    const isActivelyInCloneState = Boolean(this.isEvading && (this.evasionTimer || 0) > 0);
    if (isActivelyInCloneState && !opts?.bypassEvade) {
      const dodgeChance = CONFIG.mahito?.evasion?.dodgeChance ?? 0.60;
      if (Math.random() < dodgeChance) {
        const now = Date.now();
        if (!this._lastEvadeTextTime || now - this._lastEvadeTextTime > 200) {
          this._lastEvadeTextTime = now;
          spawnFloatingText(this.x, this.y - this.r - 12, 'EVADE!', '#E0FFFF');
          audioSystem.playSFX('effect_dash', 0.5);
        }
        return false; // Attack dodged completely!
      }
    }
    return super.takeDamage(amount, attacker, opts);
  }

  draw(ctx) {
    if (this.hp <= 0) return;
    drawMahitoSkin(ctx, this);
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
