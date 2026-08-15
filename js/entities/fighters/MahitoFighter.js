// ─────────────────────────────────────────────
// MAHITO FIGHTER — Cursed Spirit of Human Hatred
// ─────────────────────────────────────────────

import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { drawMahitoSkin } from '../../graphics/fighters/mahitoSkin.js';
import { spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
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
  updateSoulDisfigurementDecay 
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

    // Secondary Skill: Subterranean Flesh Surge
    this.fleshSurgeCooldown = CONFIG.mahito?.fleshSurge?.cooldown || 300;
    this.fleshSurgeAnimTimer = 0;
    this.fleshSurgeMaxTime = CONFIG.mahito?.fleshSurge?.animDuration || 24;
    this._fleshSurgePlungeAngle = null;

    // Third Skill: Mutated Mace Cannon (Stretch Arm Spiked Ball Shrapnel)
    this.maceCannonCooldown = CONFIG.mahito?.maceCannon?.cooldown || 240;
    this.maceCannonAnimTimer = 0;
    this._maceCannonData = null;

    // Fourth Skill: Dual Scythe Pincer Guillotine (Twin Stretched Blade Ambush)
    this.twinScissorCooldown = CONFIG.mahito?.twinScissor?.cooldown || 360;
    this.twinScissorAnimTimer = 0;
    this._twinScissorData = null;

    // Transformation: Instant Spirit Body of Distorted Killing (ISBoDK)
    this.isTransformed = false;
    this.isDistortedKilling = false;
    this.transformDuration = 0;
    this.transformCooldown = CONFIG.mahito?.transformation?.cooldown || 1200;
    this.hasTransformed = false;
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
    this.fleshSurgeCooldown = CONFIG.mahito?.fleshSurge?.cooldown || 300;
    this.fleshSurgeAnimTimer = 0;
    this._fleshSurgePlungeAngle = null;
    this.maceCannonCooldown = CONFIG.mahito?.maceCannon?.cooldown || 240;
    this.maceCannonAnimTimer = 0;
    this._maceCannonData = null;
    this.twinScissorCooldown = CONFIG.mahito?.twinScissor?.cooldown || 360;
    this.twinScissorAnimTimer = 0;
    this._twinScissorData = null;
    this.isTransformed = false;
    this.isDistortedKilling = false;
    this.transformDuration = 0;
    this.transformCooldown = CONFIG.mahito?.transformation?.cooldown || 1200;
    this.hasTransformed = false;
    this.morphType = 'claw';
    this.morphAttackCount = 0;
    this.combatAuraOpacity = 0.0;
  }

  /**
   * Triggers Instant Spirit Body of Distorted Killing transformation.
   */
  activateDistortedKilling() {
    if (this.isTransformed) return;
    this.isTransformed = true;
    this.isDistortedKilling = true;
    this.transformDuration = CONFIG.mahito?.transformation?.duration || 600;

    spawnFloatingText(this.x, this.y - this.r - 28, "INSTANT SPIRIT BODY!", "#D946EF");
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

  /**
   * Custom damage mitigation handling (Passive: Soul Durability).
   */
  takeDamage(amount, source, opts = {}) {
    if (amount <= 0) return false;

    let finalDamage = amount;

    // Check if source deals "Soul" damage (e.g. Toji with Split Soul Katana or Yuji or True Soul Damage)
    const isSoulDamage = opts?.isSoulDamage || opts?.isTrueDamage || (source && (
      source.characterId === 'toji' || source.type === 'toji' ||
      source.characterId === 'yuji' || source.type === 'yuji' ||
      source.hasSoulStrikes
    ));

    if (this.isTransformed) {
      // Transformed defense bonus (Takes 50% less damage)
      const defenseMult = CONFIG.mahito?.transformation?.defenseMultiplier ?? 0.50;
      finalDamage *= defenseMult;
    } else if (!isSoulDamage) {
      // Base soul durability mitigation (25% reduction vs regular attacks)
      const reduction = CONFIG.mahito?.soulDurabilityReduction ?? 0.25;
      finalDamage *= (1 - reduction);
    }

    const res = super.takeDamage(finalDamage, source, opts);

    // Auto-trigger transformation when low HP in combat (under 35% HP) if available
    if (!this.hasTransformed && (this.hp / this.maxHp) <= 0.35 && !this.isTransformed) {
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

    // ── 1. RULE #1: Freeze / TimeStop Early Exit Guard ──
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks(true);
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

    super.update(opponent, ownerIndex, arena);

    // Cooldown management
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.cooldownTimer > 0) this.cooldownTimer--;
    if (this.fleshSurgeAnimTimer > 0) this.fleshSurgeAnimTimer--;
    if (this.fleshSurgeAnimTimer <= 0) {
      this.hideFrontHand = false;
    }
    if (this.fleshSurgeCooldown > 0) this.fleshSurgeCooldown--;

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
        const minSurgeDist = CONFIG.mahito?.fleshSurge?.minDistance || 140;
        const maxSurgeDist = CONFIG.mahito?.fleshSurge?.reachMax || 420;
        const dashRangeMin = CONFIG.mahito?.soulPhaseSlip?.triggerRangeMin || 70;
        const dashRangeMax = CONFIG.mahito?.soulPhaseSlip?.triggerRangeMax || 220;
        const maceMinDist = CONFIG.mahito?.maceCannon?.minDistance || 80;
        const maceMaxDist = CONFIG.mahito?.maceCannon?.reachMax || 380;
        const scissorMinDist = CONFIG.mahito?.twinScissor?.minDistance || 90;
        const scissorMaxDist = CONFIG.mahito?.twinScissor?.reachMax || 360;

        // 1. Passive Trigger: Phantom Soul Slip (Phase-Through Claw Dash) in Mid-Range
        if (dist >= dashRangeMin && dist <= dashRangeMax && (this.soulPhaseDashCooldown || 0) <= 0) {
          this.executeSoulPhaseSlip(target);
        }
        // 2. Fourth Skill Trigger: Dual Scythe Pincer Guillotine (Twin Stretched Blade Ambush)
        else if (dist >= scissorMinDist && dist <= scissorMaxDist && (this.twinScissorCooldown || 0) <= 0) {
          this.executeTwinScissor(target);
        }
        // 3. Third Skill Trigger: Mutated Mace Cannon (Stretch Arm Spiked Ball Shrapnel)
        else if (dist >= maceMinDist && dist <= maceMaxDist && (this.maceCannonCooldown || 0) <= 0) {
          this.executeMaceCannon(target);
        }
        // 4. Close-Range Combat: If enemy is near, execute Melee Strikes
        else if (dist <= maxReach) {
          if ((this.cooldownTimer || 0) <= 0) {
            this.executeIdleTransfigurationStrike(target);
          }
        }
        // 5. Long-Distance Combat: Trigger Subterranean Flesh Surge if enemy is strictly at long range
        else if (dist >= minSurgeDist && dist <= maxSurgeDist && (this.fleshSurgeCooldown || 0) <= 0) {
          this.executeSubterraneanFleshSurge(target);
        }
      }
    }
  }

  /**
   * Executes Fourth Skill: Idle Transfiguration — Dual Scythe Pincer Guillotine (Twin Stretched Blade Ambush).
   */
  executeTwinScissor(target = null) {
    if ((this.paralyzeTimer || 0) > 0 || this.isParalyzed || this.fleshSurgeAnimTimer > 0 || this.maceCannonAnimTimer > 0) return;
    executeMahitoTwinScissor(this, target);
  }

  /**
   * Executes Third Skill: Idle Transfiguration — Mutated Mace Cannon (Stretch Arm Spiked Ball Shrapnel).
   */
  executeMaceCannon(target = null) {
    if ((this.paralyzeTimer || 0) > 0 || this.isParalyzed || this.fleshSurgeAnimTimer > 0 || this.twinScissorAnimTimer > 0) return;
    executeMahitoMaceCannon(this, target);
  }

  /**
   * Executes Passive: Phantom Soul Slip (Phase-Through Claw Dash).
   */
  executeSoulPhaseSlip(target = null) {
    if ((this.paralyzeTimer || 0) > 0 || this.isParalyzed) return;
    executeMahitoSoulPhaseSlip(this, target);
  }

  /**
   * Executes Idle Transfiguration Punch / Blade / Mace Swing adhering to Rule #7 & #8 Frontal Arc standard.
   */
  executeIdleTransfigurationStrike(target = null) {
    if ((this.paralyzeTimer || 0) > 0 || this.isParalyzed || this.fleshSurgeAnimTimer > 0 || this.maceCannonAnimTimer > 0 || this.twinScissorAnimTimer > 0) return;
    executeIdleTransfigurationStrike(this, target);
  }

  /**
   * Executes Idle Transfiguration: Subterranean Flesh Surge (Underground Arm Eruption).
   */
  executeSubterraneanFleshSurge(target = null) {
    if ((this.paralyzeTimer || 0) > 0 || this.isParalyzed || this.maceCannonAnimTimer > 0 || this.twinScissorAnimTimer > 0) return;
    executeSubterraneanFleshSurge(this, target);
  }

  triggerDemoAttack() {
    if (this._demoToggle === undefined) {
      this._demoToggle = 0;
    }
    this._demoToggle = (this._demoToggle + 1) % 2;
    if (this._demoToggle === 1) {
      this.executeSubterraneanFleshSurge();
    } else {
      this.executeIdleTransfigurationStrike();
    }
  }

  shoot(ownerIndex) {
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
