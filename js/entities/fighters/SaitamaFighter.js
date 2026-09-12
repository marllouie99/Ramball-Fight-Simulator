import { Fighter, applyDamageToTarget, isSuppressedByGetsuga } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnImpactFlash, spawnSparks, spawnAnimePunchImpactFrame, spawnMeleeClashShockwave, spawnPunchWindSpeedLines, spawnSaitamaCounterFrontalBlast } from '../../graphics/particles/sparkEffect.js';
import { drawSaitamaSkin } from '../../graphics/fighters/saitamaSkin.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { fadeOutSound } from '../../systems/soundSystem.js';

/**
 * Saitama — The Caped Baldy
 */
export class SaitamaFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'saitama';
    this.type = 'saitama';
    this.suppressSketchyOutline = true; // Use clean solid dark navy stroke from drawing

    // Model visual customization
    this.color = CONFIG.saitama?.color || '#F5C400';
    this.damageNumberColor = (typeof CONFIG !== 'undefined' && (CONFIG.saitama?.damageNumberColor || CONFIG.saitama?.themeColor)) || '#F5C400';
    const sizeMult = CONFIG.globalFighter?.sizeMultiplier ?? 1.0;
    const internalScale = CONFIG.internalScale ?? 1.0;
    const baseRadius = def.radius || CONFIG.saitama?.radius || 25;
    this.r = baseRadius * sizeMult * internalScale;
    this.hp = CONFIG.saitama?.hp || 420;
    this.maxHp = this.hp;
    this.moveSpeed = CONFIG.saitama?.moveSpeed || 6.0;

    // Martial Arts / Brawler variables
    this.isMeleeFighter = true;
    this.isMeleeMode = true;
    this.isBrawler = true;
    this.punchAnimTimer = 0;
    this.punchMaxTime = CONFIG.saitama?.punchMaxTime || 22; // Smooth 22-frame punch animation cycle
    this.isRightPunch = true;
    this.hideFrontHand = false;
    this.hideBackHand = false;

    // Passive: Hero for Fun (Boredom Threshold)
    this.boredomTimer = 0;
    this.boredomStacks = 0;
    this.maxBoredomStacks = CONFIG.saitama?.boredomMaxStacks || 5;

    // Passive: Caped Baldy Reflexes (Dodge Teleport)
    this.dodgeCooldown = 0;
    this.afterImages = [];
    this._lastDodgeSideLeft = false;

    // Passive: Serious Skill Counter (Teleport Behind Punch)
    this.skillPunishCooldown = CONFIG.saitama?.initialSkillPunishCooldown ?? (CONFIG.saitama?.skillPunishCooldown || 2000);
    this._hasExecutedCounterOnce = false;
    this._counterWindupTimer = 0;   // Reaction delay before teleport fires
    this._counterPunchTimer = 0;    // Wind-up frames before the actual punch lands
    this._counterPunchTarget = null; // Target frozen during counter punch pose
    this._postCounterRecoveryTimer = 0; // Brief post-punch stall after landing

    // Skill 1: Consecutive Normal Punches
    this.flurryCooldown = CONFIG.saitama?.flurryCooldown || 540; // Start at full CD so bar ticks down from match start
    this.isFlurrying = false;
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this._flurryAimAngle = undefined;

    // Skill 2: Serious Side Hops
    this.sideHopsCooldown = 0;
    this.isSideHopping = false;

    // Ultimate: Serious Punch
    this.seriousPunchCooldown = 0;
    this.isChargingSeriousPunch = false;
    this.seriousPunchChargeTimer = 0;
    this.seriousPunchWindupMax = CONFIG.saitama?.seriousPunchWindupFrames || 90;
    this._registerSkills();
  }

  _registerSkills() {
    this.skillManager.registerSkills([
      {
        id: 'serious_punch',
        name: 'SERIOUS PUNCH',
        type: 'ultimate',
        cooldownKey: 'seriousPunchCooldown',
        cooldownMax: CONFIG.saitama?.seriousPunchCooldown || 1800,
        channelingKey: 'isChargingSeriousPunch'
      },
      {
        id: 'flurry',
        name: 'CONSECUTIVE NORMAL PUNCHES',
        type: 'offensive',
        cooldownKey: 'flurryCooldown',
        cooldownMax: CONFIG.saitama?.flurryCooldown || 540,
        activeKey: 'isFlurrying'
      },
      {
        id: 'side_hops',
        name: 'OMNI-DIRECTIONAL SIDE HOPS',
        type: 'mobility',
        cooldownKey: 'sideHopsCooldown',
        cooldownMax: CONFIG.saitama?.sideHopsCooldown || 600,
        activeKey: 'isSideHopping'
      }
    ]);
  }

  /**
   * Main entry point for drawing Saitama.
   * Bypasses the sketchy outline wrappers to draw crisp solid strokes.
   */
  draw(ctx) {
    if (this.hp <= 0) return;

    const zOffset = this.z || 0;
    const hasZ = zOffset > 0;

    // Draw shadow underneath Saitama if he has height (zOffset > 0)
    if (hasZ) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(1, 0.5); 
      ctx.beginPath();
      ctx.arc(0, 0, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${Math.max(0.1, 0.6 - (zOffset / 150))})`;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(this.x, this.y - zOffset);
      ctx.translate(-this.x, -this.y);
    }

    // Render body model and cape wings
    drawSaitamaSkin(ctx, this);

    if (hasZ) {
      ctx.restore();
    }

    // Render standard UI components (HP bar, freeze overlay)
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }

  /**
   * Checks if Saitama's Normal Punch basic attack is enabled in config.
   */
  isNormalPunchEnabled() {
    if (CONFIG.saitama?.disableNormalPunch === true) return false;
    if (CONFIG.saitama?.normalPunchEnabled !== undefined) return Boolean(CONFIG.saitama.normalPunchEnabled);
    if (CONFIG.saitama?.punchEnabled !== undefined) return Boolean(CONFIG.saitama.punchEnabled);
    return true;
  }

  /**
   * Checks if Saitama's Consecutive Normal Punches (Skill 1) is enabled in config.
   */
  isConsecutivePunchesEnabled() {
    if (CONFIG.saitama?.disableConsecutivePunches === true || CONFIG.saitama?.disableFlurry === true) return false;
    if (CONFIG.saitama?.consecutivePunchesEnabled !== undefined) return Boolean(CONFIG.saitama.consecutivePunchesEnabled);
    if (CONFIG.saitama?.flurryEnabled !== undefined) return Boolean(CONFIG.saitama.flurryEnabled);
    return true;
  }

  /**
   * Calculates the strict cardinal angle (UP / DOWN / LEFT / RIGHT STRAIGHT) towards the target.
   * Standard: 0 (Right), Math.PI (Left), Math.PI / 2 (Down), -Math.PI / 2 (Up).
   */
  _getCardinalAngle(target) {
    if (!target) return (this.gunAngle !== undefined && !Number.isNaN(this.gunAngle)) ? this.gunAngle : 0;
    const targetY = (target.y !== undefined ? target.y : this.y) - (target.z || 0);
    const myY = this.y - (this.z || 0);
    const dx = (target.x !== undefined ? target.x : this.x) - this.x;
    const dy = targetY - myY;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? 0 : Math.PI;
    } else {
      return dy >= 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }

  /**
   * Override base canPerformBasicAttack to respect normal punch config toggle.
   */
  canPerformBasicAttack() {
    if (!this.isNormalPunchEnabled()) return false;
    return super.canPerformBasicAttack();
  }

  /**
   * Universal Aim Validation Guard.
   * Disables auto-aim completely during Serious Skill Counter passive and Consecutive Normal Punches flurry.
   */
  canAim() {
    const isCounterActive = Boolean(
      this.isCountering || 
      (this._counterPunchTimer && this._counterPunchTimer > 0) || 
      (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0)
    );
    if (isCounterActive || this.isFlurrying) {
      return false;
    }
    return super.canAim();
  }

  /** Override base gun shoot to perform Saitama's Normal Punch basic attack */
  shoot(ownerIndex) {
    // Disabled! Melee characters manually trigger attacks via distance check in update().
    // Prevents Fighter.js from auto-calling executeNormalPunch every cooldown cycle.
  }

  /**
   * Passive: No Sell — Ignores basic hit-pause timeStops and grants total immunity during Serious Skill Counter,
   * UNLESS being pulled/dragged by a pulling mechanic (Gojo Blue, Hollow Purple suction, Black Hole, Getsuga drag, Telekinesis)
   * or trapped inside Gojo's deployed Unlimited Void domain.
   */
  applyTimeStop(duration, opts = {}) {
    const isInsideGojo = this._isInsideGojoDomain() || Boolean(opts.isDomain || opts.isGojoDomain);
    const isCounteringState = Boolean((this._counterPunchTimer && this._counterPunchTimer > 0) || (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0) || this.isCountering);
    if (isCounteringState) {
      if (opts.isPurple || opts.isBlue || opts.isGetsuga || opts.isPull || opts.isGravity || isInsideGojo || this._isBeingPulled()) {
        this.interruptAttacks(true);
      } else {
        return; // IMMUNITY: Serious Skill Counter cannot be frozen or time-stopped by standard attacks!
      }
    }
    // If it's a basic attack hit-pause without skill/ultimate flags, Saitama ignores it!
    if (!opts.isSkill && !opts.isUltimate && !opts.isInfinity && !opts.isDomain && !opts.isPurple && !opts.isBlue && !isInsideGojo) {
      return; // No sell!
    }
    super.applyTimeStop(duration, opts);
  }

  applyHitStun(frames, opts = {}) {
    const isInsideGojo = this._isInsideGojoDomain() || Boolean(opts.isDomain || opts.isGojoDomain);
    const isCounteringState = Boolean((this._counterPunchTimer && this._counterPunchTimer > 0) || (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0) || this.isCountering);
    if (isCounteringState) {
      if (opts.isPurple || opts.isBlue || opts.isGetsuga || opts.isPull || opts.isGravity || isInsideGojo || this._isBeingPulled()) {
        this.interruptAttacks(true);
      } else {
        return;
      }
    }
    super.applyHitStun(frames, opts);
  }

  applyParalyze(frames, opts = {}) {
    const isInsideGojo = this._isInsideGojoDomain() || Boolean(opts.isDomain || opts.isGojoDomain);
    const isCounteringState = Boolean((this._counterPunchTimer && this._counterPunchTimer > 0) || (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0) || this.isCountering);
    if (isCounteringState) {
      if (opts.isPurple || opts.isBlue || opts.isGetsuga || opts.isPull || opts.isGravity || isInsideGojo || this._isBeingPulled()) {
        this.interruptAttacks(true);
      } else {
        return;
      }
    }
    super.applyParalyze(frames, opts);
  }

  applySlow(frames, multiplier, opts = {}) {
    const isInsideGojo = this._isInsideGojoDomain() || Boolean(opts.isDomain || opts.isGojoDomain);
    const isCounteringState = Boolean((this._counterPunchTimer && this._counterPunchTimer > 0) || (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0) || this.isCountering);
    if (isCounteringState) {
      if (opts.isPurple || opts.isBlue || opts.isBlueSlow || opts.isGetsuga || opts.isPull || opts.isGravity || isInsideGojo || this._isBeingPulled()) {
        this.interruptAttacks(true);
      } else {
        return;
      }
    }
    super.applySlow(frames, multiplier, opts);
  }

  applyKnockback(vx, vy, options = {}) {
    const isInsideGojo = this._isInsideGojoDomain() || Boolean(options.isDomain || options.isGojoDomain);
    const isCounteringState = Boolean((this._counterPunchTimer && this._counterPunchTimer > 0) || (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0) || this.isCountering);
    if (isCounteringState) {
      if (options.isPull || options.isGravity || options.isBlue || options.isPurple || options.isBlackHole || options.isGetsuga || isInsideGojo || this._isBeingPulled()) {
        this.interruptAttacks(true);
      } else {
        // Saitama is completely immovable during Serious Skill Counter against regular knockback
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        return;
      }
    }
    super.applyKnockback(vx, vy, options);
  }

  applyElectricStun(frames, opts = {}) {
    const isInsideGojo = this._isInsideGojoDomain() || Boolean(opts.isDomain || opts.isGojoDomain);
    const isCounteringState = Boolean((this._counterPunchTimer && this._counterPunchTimer > 0) || (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0) || this.isCountering);
    if (isCounteringState) {
      if (isInsideGojo) this.interruptAttacks(true);
      else return;
    }
    if (typeof super.applyElectricStun === 'function') super.applyElectricStun(frames);
    else this.electricStunTimer = Math.max(this.electricStunTimer || 0, frames);
  }

  applySilence(frames, opts = {}) {
    const isInsideGojo = this._isInsideGojoDomain() || Boolean(opts.isDomain || opts.isGojoDomain);
    const isCounteringState = Boolean((this._counterPunchTimer && this._counterPunchTimer > 0) || (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0) || this.isCountering);
    if (isCounteringState) {
      if (isInsideGojo) this.interruptAttacks(true);
      else return;
    }
    if (typeof super.applySilence === 'function') super.applySilence(frames);
    else this.silenceTimer = Math.max(this.silenceTimer || 0, frames);
  }

  suppressCombatAndVisuals(options = {}) {
    const isInsideGojo = this._isInsideGojoDomain() || Boolean(options.isDomain || options.isGojoDomain);
    const isCounteringState = Boolean((this._counterPunchTimer && this._counterPunchTimer > 0) || (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0) || this.isCountering);
    if (isCounteringState && this.hp > 0 && !this._isBeingPulled() && !isInsideGojo) {
      return; // Cannot be suppressed during Serious Skill Counter unless pulled or inside Gojo domain
    }
    if (isInsideGojo && isCounteringState) {
      this.interruptAttacks(true);
    }
    super.suppressCombatAndVisuals(options);
  }

  /**
   * Evaluates if Saitama is currently being pulled, dragged, or lifted by any pulling mechanic:
   * Gojo's Lapse Blue gravitational field, Gojo's Hollow Purple suction vortex,
   * Black Hole gravitational pull, Ichigo's Getsuga Tensho wave drag, Rubbick's Telekinesis, etc.
   */
  _isBeingPulled() {
    if (this.hp <= 0) return false;

    // 1. Caught in Telekinesis (Rubbick)
    if (this.isCaughtInTelekinesis) return true;

    // 2. Caught in or dragged by Getsuga Tensho (Ichigo)
    if (this.isDraggedByGetsuga || (this._hitByGetsugaTimer && this._hitByGetsugaTimer > 0) || (typeof isSuppressedByGetsuga === 'function' && isSuppressedByGetsuga(this))) {
      return true;
    }

    // 3. Check active projectiles for gravitational / suction / pull fields
    if (typeof state !== 'undefined' && state.projectiles) {
      const myTeam = (typeof state.getFighterTeam === 'function' && state.fighters) ? state.getFighterTeam(state.fighters.indexOf(this)) : null;

      for (const p of state.projectiles) {
        if (!p || p.life <= 0) continue;

        // Skip friendly projectiles in team modes
        if (myTeam !== null && typeof p.owner === 'number' && typeof state.getFighterTeam === 'function') {
          const pTeam = state.getFighterTeam(p.owner);
          if (pTeam !== null && pTeam === myTeam) continue;
        }

        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const dist = Math.hypot(dx, dy);

        // Gojo Lapse Blue gravitational pull field
        if (p.isGojoBlue || p.behaviorType === 'gojo_blue' || p.behavior === 'gojo_blue') {
          const pullRadius = p.pullRadius || (typeof CONFIG !== 'undefined' && CONFIG.gojo?.blueRadius) || 100;
          if (dist < pullRadius + (this.r || 20)) {
            return true;
          }
        }

        // Gojo Hollow Purple gravitational suction field
        if (p.isGojoPurple || p.behaviorType === 'gojo_purple' || p.behavior === 'gojo_purple') {
          const purplePullRadius = (typeof CONFIG !== 'undefined' && CONFIG.gojo?.purplePullRadius) || 280;
          if (dist < purplePullRadius + (this.r || 20)) {
            return true;
          }
        }

        // Black Hole gravitational suction
        if (p.isBlackHole || p.behaviorType === 'black_hole' || p.behavior === 'black_hole') {
          const effectiveRadius = (p.r || 30) + (this.r || 20) + 30;
          if (dist < effectiveRadius) {
            return true;
          }
        }

        // Getsuga Tensho wave dragging
        if (p.isGetsuga || p.behaviorType === 'getsuga_tensho' || p.behavior === 'getsuga_tensho') {
          if (p.draggedTargets && p.draggedTargets.has(this)) {
            return true;
          }
        }

        // Generic pullRadius
        if (p.pullRadius && dist < p.pullRadius + (this.r || 20)) {
          return true;
        }
      }
    }

    return false;
  }

  isStationarySkillActive() {
    if (this._isBeingPulled()) return false;
    return Boolean(
      this.isFlurrying ||
      (this.flurryHitsLeft > 0) ||
      (this.flurryTimer > 0) ||
      (this._counterPunchTimer && this._counterPunchTimer > 0) ||
      (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0) ||
      this.isChargingSeriousPunch ||
      (this.seriousPunchChargeTimer > 0) ||
      (this.basicPunchChargeTimer > 0)
    );
  }

  isPerformingSkill() {
    return this.isStationarySkillActive();
  }

  isChannelingSkill() {
    return this.isStationarySkillActive();
  }

  _isInsideGojoDomain() {
    if (typeof state === 'undefined' || !state.fighters) return false;
    const myIndex = state.fighters.indexOf(this);
    const myTeam = (myIndex >= 0 && typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIndex) : null;
    return state.fighters.some((f, fIdx) => {
      if (!f || f === this || f.hp <= 0) return false;
      const isDomainActive = Boolean(f.domainActive || f.stolenDomainActive);
      if (!isDomainActive) return false;
      const isGojo = (f.isParalyzingDomain || f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo' || (f.stolenType === 'gojo_domain' && (f.stolenDomainActive || f.domainActive)));
      if (!isGojo) return false;
      if (myTeam !== null && typeof state.getFighterTeam === 'function') {
        const fTeam = state.getFighterTeam(fIdx);
        if (fTeam !== null && fTeam === myTeam) return false; // Friendly Gojo domain doesn't freeze teammates
      }
      return true;
    });
  }

  /**
   * Passive Dodge Teleport (Caped Baldy Reflexes):
   * Sidesteps a short distance left or right upon detecting incoming attacks or projectiles.
   */
  executeDodgeTeleport(attacker, isProjectile = false) {
    if (this.hp <= 0) return false;

    // DISABLE DODGING COMPLETELY INSIDE GOJO'S DOMAIN (Unlimited Void)
    if (this._isInsideGojoDomain()) {
      return false;
    }

    const isInsideDomain = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && f.domainActive);
    const isSliceLineDodge = Boolean(attacker && attacker.isSliceLine);
    const isDomainDodge = isInsideDomain || isSliceLineDodge;
    const isBeamOrTickDodge = Boolean(
      this.isCaughtInPurple || 
      (this.purpleHitTimer && this.purpleHitTimer > 0) || 
      this.caughtInPureLoveBeam || 
      (this.pureLoveBeamTimer && this.pureLoveBeamTimer > 0) ||
      this.caughtInGenosFlurry ||
      (this.caughtInGenosBeamTimer && this.caughtInGenosBeamTimer > 0)
    );

    // Disable dodge if Saitama is caught in, dragged by, or hit by Ichigo's Getsuga Tensho
    const isGetsugaCaught = Boolean(
      this.isDraggedByGetsuga ||
      (this._hitByGetsugaTimer && this._hitByGetsugaTimer > 0) ||
      isSuppressedByGetsuga(this) ||
      (attacker && (attacker.isGetsuga || attacker.behaviorType === 'getsuga_tensho'))
    );
    if (isGetsugaCaught) {
      return false;
    }

    const isExecutingSeriousCounter = Boolean(
      (this._counterPunchTimer && this._counterPunchTimer > 0) || 
      (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0) ||
      (this.isCountering && (this._counterPunchTimer > 0 || this._postCounterRecoveryTimer > 0))
    );

    // Check if Nanami is currently executing his 7:3 Ratio hit-pause
    const isNanamiPausing = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && (f.characterId === 'nanami' || f.type === 'nanami') && (f.ratioHitPauseTimer || 0) > 0);

    if ((this.dodgeCooldown > 0 && !isBeamOrTickDodge) || this.isFrozenByInfinity || this.isTargetOfAmbush || isExecutingSeriousCounter || isNanamiPausing) {
      return false;
    }
    // Block dodge if time-stopped by non-domain effects (unless dodging beam/purple tick)
    if (this.timeStopTimer > 0 && !isDomainDodge && !isBeamOrTickDodge) {
      return false;
    }

    // Passive: Caped Baldy Reflexes (Dodge Teleport)
    const dodgeChance = CONFIG.saitama?.dodgeChance ?? 0.50;
    if (Math.random() > dodgeChance) {
      return false; // Dodge failed!
    }

    const oldX = this.x;
    const oldY = this.y;

    const baseDist = CONFIG.saitama?.dodgeDistance || 100;
    let dist = baseDist;
    let perpAngle;

    if (isSliceLineDodge) {
      // For spatial slice lines, evade along the line normal perpendicular to the cut!
      const nx = attacker.normalX !== undefined ? attacker.normalX : -Math.sin(attacker.angle || 0);
      const ny = attacker.normalY !== undefined ? attacker.normalY : Math.cos(attacker.angle || 0);
      let sideSign = 1;
      if (typeof attacker.cx === 'number' && typeof attacker.cy === 'number') {
        const side = (this.x - attacker.cx) * nx + (this.y - attacker.cy) * ny;
        sideSign = side >= 0 ? 1 : -1;
      } else {
        this._lastDodgeSideLeft = !this._lastDodgeSideLeft;
        sideSign = this._lastDodgeSideLeft ? 1 : -1;
      }
      perpAngle = Math.atan2(ny * sideSign, nx * sideSign);
      dist = Math.max(baseDist, (this.r || 20) + (attacker.thickness || 3) + 75);
    } else {
      // Reference angle relative to incoming attacker/projectile or Saitama's facing angle
      let refAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
      if (attacker && attacker !== this && typeof attacker.x === 'number' && typeof attacker.y === 'number') {
        refAngle = Math.atan2(this.y - attacker.y, this.x - attacker.x);
      } else if (attacker && typeof attacker.vx === 'number' && typeof attacker.vy === 'number' && (attacker.vx !== 0 || attacker.vy !== 0)) {
        refAngle = Math.atan2(attacker.vy, attacker.vx);
      } else if (attacker && typeof attacker.angle === 'number') {
        refAngle = attacker.angle;
      }

      // Alternate left (-90 deg) and right (+90 deg) sidesteps for dynamic visual movement
      this._lastDodgeSideLeft = !this._lastDodgeSideLeft;
      const sideSign = this._lastDodgeSideLeft ? 1 : -1;
      perpAngle = refAngle + (sideSign * Math.PI / 2);

      if (isBeamOrTickDodge) {
        dist = Math.max(baseDist, 120);
      }
    }

    let targetX = this.x + Math.cos(perpAngle) * dist;
    let targetY = this.y + Math.sin(perpAngle) * dist;

    // Arena boundary check to keep Saitama strictly inside arena walls
    const arena = CONFIG.arena;
    if (arena) {
      const minX = arena.x + this.r + 10;
      const maxX = arena.x + arena.width - this.r - 10;
      const minY = arena.y + this.r + 10;
      const maxY = arena.y + arena.height - this.r - 10;

      // If primary sidestep hits boundary, attempt opposite side
      if (targetX < minX || targetX > maxX || targetY < minY || targetY > maxY) {
        perpAngle = perpAngle + Math.PI;
        targetX = this.x + Math.cos(perpAngle) * dist;
        targetY = this.y + Math.sin(perpAngle) * dist;
      }

      targetX = Math.max(minX, Math.min(maxX, targetX));
      targetY = Math.max(minY, Math.min(maxY, targetY));
    }

    // Teleport position update
    this.x = targetX;
    this.y = targetY;

    // Clear any hitStun, hit-pause, or beam/purple/flurry trap state on dodge so Saitama breaks free cleanly
    const savedTimeStop = this.timeStopTimer;
    this.hitStunTimer = 0;
    this.basicAttackHitPauseTimer = 0;
    this.timeStopTimer = 0;
    this.isCaughtInPurple = false;
    this.purpleHitTimer = 0;
    this.caughtInPureLoveBeam = false;
    this.wasCaughtInPureLoveBeam = false;
    this.pureLoveBeamTimer = 0;
    this.pureLoveBeamRecoveryTimer = 0;
    this.caughtInGenosFlurry = false;
    this.caughtInGenosBeamTimer = 0;
    this.caughtInSaitamaFlurry = false;
    this.caughtInLaserBeamTimer = 0;
    this.caughtInLaylaBeamTimer = 0;
    this.caughtInJohnWickCombo = false;
    this.paralyzeTimer = 0;
    this.isParalyzed = false;
    this.isParalyzedByMahito = false;
    this.isParalyzedByMahoraga = false;
    this.electricStunTimer = 0;
    this.dubstepStunTimer = 0;

    // If dodging inside a domain, re-apply the domain time-stop so Saitama stays immobilized between dodges
    if (isDomainDodge && savedTimeStop > 0 && !isBeamOrTickDodge && !isSliceLineDodge) {
      this.timeStopTimer = savedTimeStop;
    }

    // MANDATORY Rule #3: Always update aim facing direction relative to opponent after changing position!
    const targetOpponent = (attacker && !attacker.isSliceLine && attacker !== this && attacker.hp > 0 && typeof attacker.x === 'number')
      ? attacker 
      : ((attacker && attacker.attacker && attacker.attacker !== this && attacker.attacker.hp > 0 && typeof attacker.attacker.x === 'number')
        ? attacker.attacker
        : ((attacker && attacker.owner && attacker.owner !== this && attacker.owner.hp > 0 && typeof attacker.owner.x === 'number')
          ? attacker.owner
          : (typeof state !== 'undefined' && state.fighters ? state.fighters.find(f => f && f !== this && f.hp > 0) : null)));
    if (targetOpponent && typeof targetOpponent.x === 'number') {
      const aimAngle = Math.atan2(targetOpponent.y - this.y, targetOpponent.x - this.x);
      this.gunAngle = aimAngle;
      this.angle = aimAngle;
      if (typeof this.aim === 'function') {
        this.aim(targetOpponent);
      }
    }

    // Apply teleport chase delay to attacker (e.g. Gojo or Sukuna) so they don't snap-teleport instantly to Saitama's new dodge position
    const chaser = (attacker && !attacker.isSliceLine && attacker !== this) ? attacker : (attacker && attacker.attacker ? attacker.attacker : targetOpponent);
    if (chaser) {
      const chaseDelay = CONFIG.saitama?.attackerTeleportChaseDelayFrames ?? 5;
      chaser.teleportChaseDelayTimer = Math.max(chaser.teleportChaseDelayTimer || 0, chaseDelay);
    }

    // Spawn subtle fading ghost model skin afterimages along dodge path dynamically scaled with distance
    if (!this.afterImages) this.afterImages = [];
    const dodgeDist = Math.hypot(this.x - oldX, this.y - oldY);
    const steps = Math.min(2, Math.max(1, Math.floor(dodgeDist / 60)));
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      pushTrailCap(this.afterImages, {
        x: oldX + (this.x - oldX) * p,
        y: oldY + (this.y - oldY) * p,
        r: this.r,
        gunAngle: this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0),
        timer: 10,
        maxTimer: 10,
      }, 6);
    }

    // Clean impact flashes at old & new coordinates
    if (typeof spawnImpactFlash === 'function') {
      spawnImpactFlash(oldX, oldY, 20, '#F5C400');
      spawnImpactFlash(this.x, this.y, 25, '#FFFFFF');
    }

    // Spawn floating text "MISS!" on successful dodge
    if (typeof spawnFloatingText === 'function') {
      spawnFloatingText(this.x, this.y - this.r - 18, 'MISS!', '#A0AEC0');
    }

    // Crisp dash audio effect
    const dashSFX = CONFIG.saitama?.sounds?.dodgeSFX || 'skill_dash3';
    const dashVol = CONFIG.saitama?.soundVolumes?.dodgeSFX ?? 0.85;
    audioSystem.playSFX(dashSFX, dashVol);

    // Play Saitama Dodge Grunt / Noise with configurable chance & volume (organized like Nanami)
    const dodgeNoiseSounds = CONFIG.saitama?.sounds?.dodgeNoiseSounds || [
      'Assets/Sound Effects/Skills/saitama-dodge-noise1.mp3',
      'Assets/Sound Effects/Skills/saitama-dodge-noise2.mp3',
      'Assets/Sound Effects/Skills/saitama-dodge-noise3.mp3'
    ];
    const dodgeNoiseChance = (typeof CONFIG.saitama?.soundChances?.dodgeNoise === 'number')
      ? CONFIG.saitama.soundChances.dodgeNoise
      : ((typeof CONFIG.saitama?.dodgeNoiseChance === 'number') ? CONFIG.saitama.dodgeNoiseChance : 0.35);

    if (dodgeNoiseSounds && dodgeNoiseSounds.length > 0 && Math.random() < dodgeNoiseChance) {
      const selectedDodgeNoise = dodgeNoiseSounds[Math.floor(Math.random() * dodgeNoiseSounds.length)];
      const noiseVol = CONFIG.saitama?.soundVolumes?.dodgeNoise !== undefined 
        ? CONFIG.saitama.soundVolumes.dodgeNoise 
        : (CONFIG.saitama?.dodgeNoiseVolume !== undefined ? CONFIG.saitama.dodgeNoiseVolume : 2.5);
      // Play full audio clip without cutting off on subsequent rapid teleports
      audioSystem.playSFX(selectedDodgeNoise, noiseVol);
    }

    // Apply a subtle micro-glide velocity sideways along perpAngle so Saitama moves a little smoothly after dodging
    const microGlideSpeed = 2.2;
    this.vx = Math.cos(perpAngle) * microGlideSpeed;
    this.vy = Math.sin(perpAngle) * microGlideSpeed;
    this.dodgeStallTimer = 8; // Short 8-frame micro-glide (~0.13s)
    this.dodgeCooldown = CONFIG.saitama?.dodgeCooldown ?? 1;
    return true;
  }

  /**
   * Passive: Caped Baldy Reflexes against Sukuna's spatial cut lines
   * Allows Saitama to dodge through Malevolent Shrine slice lines.
   */
  dodgeSliceLine(lineData = {}) {
    return this.executeDodgeTeleport({
      isSliceLine: true,
      ...lineData
    });
  }

  /**
   * Passive: Serious Skill Counter — Phase 1 (Teleport + Freeze)
   * Saitama instantly teleports behind the channeling enemy and freezes them.
   * The actual punch damage lands after _counterPunchTimer counts down (Phase 2).
   */
  executeSkillCounterPunish(target) {
    if (this.hp <= 0 || !target || target.hp <= 0 || target === this) return false;
    if (this.skillPunishCooldown > 0) return false;
    const isInsideDomain = typeof state !== 'undefined' && (state.activeDomain || state.domainActive);
    const isNanamiPausing = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && (f.characterId === 'nanami' || f.type === 'nanami') && (f.ratioHitPauseTimer || 0) > 0);
    const isGetsugaSuppressed = Boolean(this.isDraggedByGetsuga || (this._hitByGetsugaTimer && this._hitByGetsugaTimer > 0) || (typeof isSuppressedByGetsuga === 'function' && isSuppressedByGetsuga(this)));
    if (this.timeStopTimer > 0 || isNanamiPausing || isGetsugaSuppressed || this.isFrozenByInfinity || this.isTargetOfAmbush || isInsideDomain || this._isInsideGojoDomain()) return false;

    // Check team alignment in 2v2/team modes ONLY.
    // getFighterTeam returns null in 1v1/FFA — null===null would falsely match as teammates, so guard with myTeam !== null.
    if (typeof state !== 'undefined' && state.getFighterTeam && state.fighters) {
      const myIdx = state.fighters.indexOf(this);
      const targetIdx = state.fighters.indexOf(target);
      if (myIdx >= 0 && targetIdx >= 0) {
        const myTeam = state.getFighterTeam(myIdx);
        const targetTeam = state.getFighterTeam(targetIdx);
        if (myTeam !== null && myTeam === targetTeam) {
          return false; // Same team — skip
        }
      }
    }

    // Range guard: Prevent triggering passive counter if target is not within counter range
    const maxRange = CONFIG.saitama?.counterTriggerDistance ?? 320;
    const currentDist = Math.hypot(target.x - this.x, target.y - this.y);
    if (currentDist > maxRange) {
      return false; // Target is out of range
    }

    const oldX = this.x;
    const oldY = this.y;

    // Calculate position directly behind the target relative to the target's facing direction
    const targetAngle = target.gunAngle !== undefined ? target.gunAngle : (target.angle || 0);
    const spacing = CONFIG.saitama?.counterTeleportDistanceOffset ?? 35;
    const offsetDist = this.r + target.r + spacing;
    const behindAngle = targetAngle + Math.PI;

    const arena = CONFIG.arena;
    let chosenX = target.x + Math.cos(behindAngle) * offsetDist;
    let chosenY = target.y + Math.sin(behindAngle) * offsetDist;

    if (arena) {
      const minX = arena.x + this.r + 10;
      const maxX = arena.x + arena.width - this.r - 10;
      const minY = arena.y + this.r + 10;
      const maxY = arena.y + arena.height - this.r - 10;

      // Check if pure behind position is within arena bounds
      const isInside = (x, y) => x >= minX && x <= maxX && y >= minY && y <= maxY;

      if (!isInside(chosenX, chosenY)) {
        // Try candidate flanking angles around the back that don't collide with the arena wall
        const candidateOffsets = [0.35, -0.35, 0.7, -0.7, 1.0, -1.0, Math.PI / 2, -Math.PI / 2];
        let foundClearAngle = false;
        for (const off of candidateOffsets) {
          const candAngle = behindAngle + off;
          const candX = target.x + Math.cos(candAngle) * offsetDist;
          const candY = target.y + Math.sin(candAngle) * offsetDist;
          if (isInside(candX, candY)) {
            chosenX = candX;
            chosenY = candY;
            foundClearAngle = true;
            break;
          }
        }

        // If target is in a deep corner, clamp and guarantee minimum physical clearance from target
        if (!foundClearAngle) {
          chosenX = Math.max(minX, Math.min(maxX, chosenX));
          chosenY = Math.max(minY, Math.min(maxY, chosenY));
          
          const curDist = Math.hypot(chosenX - target.x, chosenY - target.y);
          const minRequiredDist = this.r + target.r + 25;
          if (curDist < minRequiredDist) {
            // Push Saitama along the vector pointing from target towards arena center or open space
            let pushDir = Math.atan2(chosenY - target.y, chosenX - target.x);
            if (curDist < 0.001) {
              const arenaCenterX = arena.x + arena.width / 2;
              const arenaCenterY = arena.y + arena.height / 2;
              pushDir = Math.atan2(arenaCenterY - target.y, arenaCenterX - target.x);
            }
            chosenX = target.x + Math.cos(pushDir) * minRequiredDist;
            chosenY = target.y + Math.sin(pushDir) * minRequiredDist;
            chosenX = Math.max(minX, Math.min(maxX, chosenX));
            chosenY = Math.max(minY, Math.min(maxY, chosenY));
          }
        }
      }
    }

    // Verify the teleport destination is within melee reach of the target
    const punchReach = this.r + target.r + (CONFIG.saitama?.punchReach || 80);
    const destDist = Math.hypot(chosenX - target.x, chosenY - target.y);
    if (destDist > punchReach + 40) {
      return false; // Chosen teleport position is not within reach
    }

    // Teleport Saitama behind the target with clean physical spacing
    this.x = chosenX;
    this.y = chosenY;
    this.vx = 0;
    this.vy = 0;

    // Set counter state and clear any Infinity freeze/stasis/beam/flurry locks
    this.isCountering = true;
    this.isFrozenByInfinity = false;
    this.infinityFreezeTimer = 0;
    this.hitStunTimer = 0;
    this.basicAttackHitPauseTimer = 0;
    this.timeStopTimer = 0;
    this.caughtInGenosFlurry = false;
    this.caughtInGenosBeamTimer = 0;
    this.caughtInSaitamaFlurry = false;
    this.caughtInPureLoveBeam = false;
    this.wasCaughtInPureLoveBeam = false;
    this.pureLoveBeamTimer = 0;
    this.pureLoveBeamRecoveryTimer = 0;
    this.isCaughtInPurple = false;
    this.purpleHitTimer = 0;
    this.caughtInLaserBeamTimer = 0;
    this.caughtInLaylaBeamTimer = 0;
    this.caughtInJohnWickCombo = false;
    this.paralyzeTimer = 0;
    this.isParalyzed = false;

    // MANDATORY Rule #3: Immediately aim facing direction at the target's back along strict cardinal direction
    const behindTargetAngle = this._getCardinalAngle(target);
    this.gunAngle = behindTargetAngle;
    this.angle = behindTargetAngle;
    this._counterAimAngle = behindTargetAngle;

    // Spawn subtle fading ghost model skin afterimages along teleport trajectory dynamically scaled with distance
    if (!this.afterImages) this.afterImages = [];
    const counterDist = Math.hypot(this.x - oldX, this.y - oldY);
    const steps = Math.min(3, Math.max(1, Math.floor(counterDist / 80)));
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      const duration = 12;
      pushTrailCap(this.afterImages, {
        x: oldX + (this.x - oldX) * p,
        y: oldY + (this.y - oldY) * p,
        r: this.r,
        gunAngle: this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0),
        timer: duration,
        maxTimer: duration,
      }, 6);
    }

    // Teleport SFX
    const counterDashSFX = CONFIG.saitama?.sounds?.counterDashSFX || 'skill_dash5';
    const counterDashVol = CONFIG.saitama?.soundVolumes?.counterDash ?? 1.0;
    audioSystem.playSFX(counterDashSFX, counterDashVol);

    // Calculate wind-up duration (Idle stare + charging pose)
    const poseFrames = CONFIG.saitama?.counterPunchPoseFrames ?? 100;
    const idleFrames = CONFIG.saitama?.counterTeleportIdleFrames ?? 10;
    const counterWindupDuration = poseFrames + idleFrames;

    this.punchAnimTimer = 0;

    // Impact flash at teleport origin and behind enemy
    if (typeof spawnImpactFlash === 'function') {
      spawnImpactFlash(oldX, oldY, 25, '#F5C400');
      spawnImpactFlash(this.x, this.y, 30, '#FFFFFF');
    }

    // Store target and start Phase 2 wind-up countdown (Idle stare + charging pose)
    // NOTE: Enemies and arena entities are NOT frozen, giving them the chance to react, move, or escape!
    this._counterPunchTarget = target;
    this._counterPunchTimer = counterWindupDuration;

    // Play charging voice line and background audio
    const voiceEnabled = CONFIG.saitama?.counterPunchVoiceEnabled !== false;
    if (voiceEnabled) {
      const voiceSrc = CONFIG.saitama?.sounds?.counterPunchVoiceSFX || CONFIG.saitama?.counterPunchVoiceSFX || 'Assets/Sound Effects/Skills/saitama-seriouspunch-voiceline.mp3';
      const voiceVol = CONFIG.saitama?.soundVolumes?.counterPunchVoice ?? (CONFIG.saitama?.counterPunchVoiceVolume ?? 3.0);
      audioSystem.playSFX(voiceSrc, voiceVol);
    }

    const chargingEnabled = CONFIG.saitama?.counterPunchChargingEnabled !== false;
    if (chargingEnabled) {
      const chargingSrc = CONFIG.saitama?.sounds?.counterPunchChargingSFX || CONFIG.saitama?.counterPunchChargingSFX || 'Assets/Sound Effects/Skills/saitama-seriouspunch-charging.mp3';
      const chargingVol = CONFIG.saitama?.soundVolumes?.counterPunchCharging ?? (CONFIG.saitama?.counterPunchChargingVolume ?? 1.0);
      this._counterPunchChargeSound = audioSystem.playSFX(chargingSrc, chargingVol);
    }

    // Set cooldown now so the scan doesn't fire again mid-wind-up
    this.skillPunishCooldown = CONFIG.saitama?.skillPunishCooldown || 2000;
    this._hasExecutedCounterOnce = true;
    this.dodgeCooldown = CONFIG.saitama?.counterDodgeLockFrames ?? 20;
    return true;
  }

  /**
   * Passive: Serious Skill Counter — Phase 2 (Punch Landing)
   * Called from update() when _counterPunchTimer reaches 0.
   * Releases the frozen target and delivers the massive counter punch.
   */
  _tickCounterPunch() {
    if (this._isInsideGojoDomain()) {
      this.interruptAttacks(true);
      return;
    }

    if (this._counterPunchTimer <= 0) {
      if (this._counterPunchTarget || (this.isCountering && (!this._postCounterRecoveryTimer || this._postCounterRecoveryTimer <= 0))) {
        this._counterPunchTarget = null;
        this.isCountering = false;
        this._counterPunchTimer = 0;
        this.dodgeCooldown = 0;
      }
      return;
    }

    // If target became invalid or was removed while timer was active, cleanly reset counter state
    if (!this._counterPunchTarget) {
      this._counterPunchTimer = 0;
      this.isCountering = false;
      this._postCounterRecoveryTimer = 0;
      this.dodgeCooldown = 0;
      if (this._counterPunchChargeSound) {
        fadeOutSound(this._counterPunchChargeSound, 100);
        this._counterPunchChargeSound = null;
      }
      return;
    }

    this._counterPunchTimer--;

    // Keep Saitama locked in place and strictly hold the committed aim angle without auto-tracking or snapping to the enemy
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._counterAimAngle !== undefined) {
      this.gunAngle = this._counterAimAngle;
      this.angle = this._counterAimAngle;
    }

    // Phase 2: punch lands when timer expires
    if (this._counterPunchTimer <= 0) {
      const target = this._counterPunchTarget;
      this._counterPunchTarget = null;

      // Stop charging track if still playing
      if (this._counterPunchChargeSound) {
        fadeOutSound(this._counterPunchChargeSound, 100);
        this._counterPunchChargeSound = null;
      }

      // Play impact sound effect
      const impactEnabled = CONFIG.saitama?.counterPunchImpactEnabled !== false;
      if (impactEnabled) {
        const impactSrc = CONFIG.saitama?.sounds?.counterPunchImpactSFX || CONFIG.saitama?.counterPunchImpactSFX || 'Assets/Sound Effects/Skills/saitama-seriouspunch-impact.mp3';
        const impactVol = CONFIG.saitama?.soundVolumes?.counterPunchImpact ?? (CONFIG.saitama?.counterPunchImpactVolume ?? 1.0);
        audioSystem.playSFX(impactSrc, impactVol);
      }

      // DO NOT snap auto-aim to the enemy on punch land! Punch strictly along the locked aim angle
      const pushAngle = this._counterAimAngle !== undefined ? this._counterAimAngle : (this.gunAngle || this.angle || 0);
      this.gunAngle = pushAngle;
      this.angle = pushAngle;
      this._counterAimAngle = pushAngle;

      // Clear punchAnimTimer so _postCounterRecoveryTimer solely drives the single unified punch follow-through
      this.punchAnimTimer = 0;

      const fistX = this.x + Math.cos(pushAngle) * (this.r + 15);
      const fistY = this.y + Math.sin(pushAngle) * (this.r + 15);

      const frontalReach = CONFIG.saitama?.counterFrontalReach ?? 1000;
      const frontalArc = CONFIG.saitama?.counterFrontalArc ?? ((120 * Math.PI) / 180); // 120-degree wide frontal cone
      const halfArc = frontalArc / 2;
      const punchReach = this.r + (target?.r || 20) + (CONFIG.saitama?.punchReach || 90);
      const knockbackForce = CONFIG.saitama?.counterPunchKnockback || 55;
      const slowFrames = CONFIG.saitama?.counterPunchSlowFrames ?? 120;    // ~2s
      const slowMult = CONFIG.saitama?.counterPunchSlowMultiplier ?? 0.35; // 35% speed

      let targetHitDirectly = false;

      if (target && target.hp > 0) {
        const targetDist = Math.hypot(target.x - this.x, target.y - this.y);
        const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
        let targetAngleDiff = angleToTarget - pushAngle;
        while (targetAngleDiff < -Math.PI) targetAngleDiff += Math.PI * 2;
        while (targetAngleDiff > Math.PI) targetAngleDiff -= Math.PI * 2;
        const inFrontalArc = Math.abs(targetAngleDiff) <= halfArc;

        // Direct Melee Hit: Target is within melee punch reach and frontal cone
        if (targetDist <= punchReach && inFrontalArc) {
          targetHitDirectly = true;
          // Floating text
          if (typeof spawnFloatingText === 'function') {
            spawnFloatingText(this.x, this.y - this.r - 14, 'COUNTER!', '#FFD700');
          }

          // Massive Counter Punch Damage (calculated directly from basic attack Normal Punch * counterPunchDamageMultiplier)
          const basePunchDamage = CONFIG.saitama?.punchDamage || 100;
          const damageMult = CONFIG.saitama?.counterPunchDamageMultiplier ?? 20.0;
          const massiveDamage = Math.round(basePunchDamage * damageMult);
          applyDamageToTarget(target, massiveDamage, this, { 
            isSkill: true, 
            isCounter: true, 
            isCritical: true, 
            bypassShield: true, 
            isSaitamaCounter: true,
            bypassEvade: true,
            undodgeable: true,
            isGuaranteedHit: true,
            isTrueDamage: true
          });

          // Heavy directional knockback push toward Saitama's facing angle
          const kx = Math.cos(pushAngle) * knockbackForce;
          const ky = Math.sin(pushAngle) * knockbackForce;
          
          target._knockedBackBySaitamaBasicPunch = true;
          target.preventKnockbackBounce = true;
          target.isWallPinnedBySaitama = true;
          target.vx = kx;
          target.vy = ky;
          if (typeof target.applyKnockback === 'function') {
            target.applyKnockback(kx, ky);
          }

          // Slow movement debuff — the enemy staggers after taking the massive punch
          target.saitamaCounterDebuffTimer = slowFrames;
          target.saitamaCounterAttacker = this;
          if (target.statusEffects && typeof target.statusEffects.applySlow === 'function') {
            target.statusEffects.applySlow(slowFrames, slowMult);
          } else {
            target.slowTimer = Math.max(target.slowTimer || 0, slowFrames);
            target.slowMultiplier = slowMult;
          }
        }
      }

      // ── Wide Long Frontal Multi-Target Shockwave Corridor (Death Punch Canyon) ──
      // Query all enemy targets (fighters & illusions) in the wide long frontal cone (Rule #6 & Rule #8)
      const collateralTargets = [];
      if (typeof state !== 'undefined') {
        const myTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(this)) : null;
        if (state.fighters) {
          for (let i = 0; i < state.fighters.length; i++) {
            const f = state.fighters[i];
            if (!f || f === this || f.hp <= 0) continue;
            if (targetHitDirectly && f === target) continue; // Target already took direct massive punch
            const targetTeam = state.getFighterTeam ? state.getFighterTeam(i) : null;
            if (myTeam !== null && myTeam === targetTeam) continue; // Skip true teammates
            collateralTargets.push(f);
          }
        }
        if (state.illusions) {
          for (const ill of state.illusions) {
            if (!ill || ill === this || ill.hp <= 0 || ill === target) continue;
            if (ill.ownerIndex !== undefined) {
              const illTeam = state.getFighterTeam ? state.getFighterTeam(ill.ownerIndex) : null;
              if (myTeam !== null && myTeam === illTeam) continue;
            }
            collateralTargets.push(ill);
          }
        }
        if (state.cjDriveBys) {
          for (const car of state.cjDriveBys) {
            if (!car || car.dead || car.hp <= 0 || car === target) continue;
            if (car.owner) {
              const carTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(car.owner)) : null;
              if (myTeam !== null && myTeam === carTeam) continue;
            }
            collateralTargets.push(car);
          }
        }
      }

      // Deal collateral shockwave damage & push to any enemies in the wide long frontal path
      for (const enemy of collateralTargets) {
        const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
        const effectiveReach = frontalReach + (enemy.r || 20);
        if (dist <= effectiveReach) {
          const angleToEnemy = Math.atan2(enemy.y - this.y, enemy.x - this.x);
          let angleDiff = angleToEnemy - pushAngle;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

          if (Math.abs(angleDiff) <= halfArc || dist <= (this.r + (enemy.r || 20) + 15)) {
            // Collateral enemy caught in the supersonic shockwave canyon (full base damage regardless of distance)
            const baseCollateralDmg = CONFIG.saitama?.counterFrontalCollateralDamage || 650;
            const collateralDmg = Math.round(baseCollateralDmg);
            applyDamageToTarget(enemy, collateralDmg, this, { 
              isSkill: true, 
              isCounter: true, 
              isCritical: true, 
              bypassShield: true,
              isSaitamaCounter: true,
              bypassEvade: true,
              undodgeable: true,
              isGuaranteedHit: true,
              isTrueDamage: true
            });

            // Directional knockback push pinning them backward along punch trajectory
            const colKx = Math.cos(pushAngle) * (knockbackForce * 1.05);
            const colKy = Math.sin(pushAngle) * (knockbackForce * 1.05);
            enemy._knockedBackBySaitamaBasicPunch = true;
            enemy.preventKnockbackBounce = true;
            enemy.isWallPinnedBySaitama = true;
            enemy.vx = colKx;
            enemy.vy = colKy;
            if (typeof enemy.applyKnockback === 'function') {
              enemy.applyKnockback(colKx, colKy);
            }

            // Stagger slow debuff
            enemy.saitamaCounterDebuffTimer = slowFrames;
            enemy.saitamaCounterAttacker = this;
            if (enemy.statusEffects && typeof enemy.statusEffects.applySlow === 'function') {
              enemy.statusEffects.applySlow(slowFrames, slowMult);
            } else {
              enemy.slowTimer = Math.max(enemy.slowTimer || 0, slowFrames);
              enemy.slowMultiplier = slowMult;
            }

            if (typeof spawnImpactFlash === 'function') {
              spawnImpactFlash(enemy.x, enemy.y, 40, '#FFFFFF');
            }
          }
        }
      }

      // Visual: Spawn Wide Long Frontal Supersonic Shockwave Blast (Death Punch Canyon)
      if (typeof spawnSaitamaCounterFrontalBlast === 'function') {
        spawnSaitamaCounterFrontalBlast(this.x, this.y, pushAngle, frontalReach, frontalArc);
      }

      // Screen Shake & Sakuga Impact FX
      if (typeof triggerGlobalScreenShake === 'function') {
        const shakeIntensity = CONFIG.saitama?.counterPunchScreenShakeIntensity ?? 100.0;
        const shakeFrames = CONFIG.saitama?.counterPunchScreenShakeFrames ?? 30;
        triggerGlobalScreenShake(shakeIntensity, shakeFrames);
      }
      if (typeof spawnAnimePunchImpactFrame === 'function') {
        const impactTargetX = (target && target.x !== undefined) ? target.x : (fistX + Math.cos(pushAngle) * 45);
        const impactTargetY = (target && target.y !== undefined) ? target.y : (fistY + Math.sin(pushAngle) * 45);
        spawnAnimePunchImpactFrame(impactTargetX, impactTargetY, 85, pushAngle, 'gold');
      }
      if (typeof spawnMeleeClashShockwave === 'function') {
        const impactTargetX = (target && target.x !== undefined) ? target.x : (fistX + Math.cos(pushAngle) * 45);
        const impactTargetY = (target && target.y !== undefined) ? target.y : (fistY + Math.sin(pushAngle) * 45);
        spawnMeleeClashShockwave(impactTargetX, impactTargetY, 110, 'gojo');
      }
      if (typeof spawnImpactFlash === 'function') {
        const impactTargetX = (target && target.x !== undefined) ? target.x : (fistX + Math.cos(pushAngle) * 45);
        const impactTargetY = (target && target.y !== undefined) ? target.y : (fistY + Math.sin(pushAngle) * 45);
        spawnImpactFlash(impactTargetX, impactTargetY, 55, '#FFFFFF');
      }

      // HUD Text Snap: White → Black on punch impact (screen flashes bright white)
      this._counterPunchImpactFlashTimer = CONFIG.saitama?.counterPunchImpactFlashFrames ?? 25;

      // Saitama stops and stares briefly after landing the punch
      this.vx = 0;
      this.vy = 0;
      const recFrames = CONFIG.saitama?.counterPunchRecoveryFrames ?? 65;
      this._postCounterRecoveryTimer = recFrames;
      if (recFrames <= 0) {
        this.isCountering = false;
        this._counterPunchTarget = null;
        this._counterPunchTimer = 0;
        this.dodgeCooldown = 0;
      }
    }
  }

  /**
   * Skill 1: Consecutive Normal Punches (連続普通のパンチ / Renzoku Futsū no Panchi)
   * Rapid-fire multi-fist barrage dealing consecutive melee punches with a devastating finisher blow.
   */
  executeConsecutiveNormalPunches(opponent) {
    if (!this.isConsecutivePunchesEnabled()) return false;
    if (this.hp <= 0 || this.flurryCooldown > 0 || !opponent || opponent.hp <= 0) return false;
    const isInsideDomain = typeof state !== 'undefined' && (state.activeDomain || state.domainActive);
    const isGetsugaSuppressed = Boolean(this.isDraggedByGetsuga || (this._hitByGetsugaTimer && this._hitByGetsugaTimer > 0) || (typeof isSuppressedByGetsuga === 'function' && isSuppressedByGetsuga(this)));
    if (this.timeStopTimer > 0 || isGetsugaSuppressed || this.isFrozenByInfinity || this.isTargetOfAmbush || isInsideDomain) return false;

    // Check team alignment
    if (typeof state !== 'undefined' && state.getFighterTeam && state.fighters) {
      const myIdx = state.fighters.indexOf(this);
      const targetIdx = state.fighters.indexOf(opponent);
      if (myIdx >= 0 && targetIdx >= 0) {
        const myTeam = state.getFighterTeam(myIdx);
        const targetTeam = state.getFighterTeam(targetIdx);
        if (myTeam !== null && myTeam === targetTeam) return false;
      }
    }

    this.isFlurrying = true;
    this.flurryHitsLeft = CONFIG.saitama?.flurryHitCount || 10;
    this.flurryTimer = 0;
    this.flurryTarget = opponent;
    this.flurryCooldown = CONFIG.saitama?.flurryCooldown || 540;
    this._flurryAccumulatedDamage = 0;

    // Cancel any charging basic punch
    this.basicPunchChargeTimer = 0;
    this.basicPunchTarget = null;

    // Display floating skill announcement
    if (typeof spawnFloatingText === 'function') {
      spawnFloatingText(this.x, this.y - this.r - 28, "CONSECUTIVE NORMAL PUNCHES!", "#F5C400");
    }

    const oldX = this.x;
    const oldY = this.y;

    const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;

    // Arena boundary clamp for opponent if already near the edge
    if (arena && opponent) {
      const oppR = opponent.r || 25;
      opponent.x = Math.max(arena.x + oppR, Math.min(arena.x + arena.width - oppR, opponent.x));
      opponent.y = Math.max(arena.y + oppR, Math.min(arena.y + arena.height - oppR, opponent.y));
    }

    // Supersonic dash into close melee range along cardinal approach vector
    const flurryOffset = CONFIG.saitama?.flurryDashOffset ?? 25;
    const cardinalAngle = this._getCardinalAngle(opponent);
    let targetX = opponent.x - Math.cos(cardinalAngle) * (this.r + opponent.r + flurryOffset);
    let targetY = opponent.y - Math.sin(cardinalAngle) * (this.r + opponent.r + flurryOffset);

    // Arena boundary clamp
    if (arena) {
      const minX = arena.x + this.r + 10;
      const maxX = arena.x + arena.width - this.r - 10;
      const minY = arena.y + this.r + 10;
      const maxY = arena.y + arena.height - this.r - 10;
      targetX = Math.max(minX, Math.min(maxX, targetX));
      targetY = Math.max(minY, Math.min(maxY, targetY));
    }

    this.x = targetX;
    this.y = targetY;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.gunAngle = cardinalAngle;
    this.angle = cardinalAngle;
    this._flurryAimAngle = cardinalAngle;

    // Spawn subtle ghost afterimages along dash path dynamically scaled with distance
    if (!this.afterImages) this.afterImages = [];
    const dashDist = Math.hypot(this.x - oldX, this.y - oldY);
    const steps = Math.min(2, Math.max(1, Math.floor(dashDist / 80)));
    for (let s = 0; s <= steps; s++) {
      const p = s / steps;
      pushTrailCap(this.afterImages, {
        x: oldX + (this.x - oldX) * p,
        y: oldY + (this.y - oldY) * p,
        r: this.r,
        gunAngle: this.gunAngle || this.angle || 0,
        timer: 10,
        maxTimer: 10
      }, 6);
    }

    // Dash sound effect
    const flurryDashSFX = CONFIG.saitama?.sounds?.flurryDashSFX || 'skill_dash3';
    const flurryDashVol = CONFIG.saitama?.soundVolumes?.flurryDash ?? 0.9;
    audioSystem.playSFX(flurryDashSFX, flurryDashVol);

    // Immediately stop enemy movement and apply initial hit-pause (Rule #5: ONLY target, never attacker)
    if (opponent && opponent.hp > 0) {
      opponent.vx = 0;
      opponent.vy = 0;
      opponent.caughtInSaitamaFlurry = true;
      if (opponent.knockbackVx !== undefined) opponent.knockbackVx = 0;
      if (opponent.knockbackVy !== undefined) opponent.knockbackVy = 0;
      if (typeof opponent.applyTimeStop === 'function') {
        const hitPause = CONFIG.saitama?.flurryInitialHitPauseFrames ?? 20;
        opponent.applyTimeStop(hitPause);
      }
    }

    return true;
  }

  _decrementSkillCooldowns() {
    if (this.dodgeCooldown > 0) this.dodgeCooldown--;

    if (this.skillPunishCooldown > 0) this.skillPunishCooldown--;
    if (this.flurryCooldown > 0) this.flurryCooldown--;
    if (this.sideHopsCooldown > 0) this.sideHopsCooldown--;
    if (this.seriousPunchCooldown > 0) this.seriousPunchCooldown--;
  }

  aim(target) {
    if (!this.canAim()) {
      const isCounteringState = Boolean((this._counterPunchTimer && this._counterPunchTimer > 0) || (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0) || this.isCountering);
      if (isCounteringState && this._counterAimAngle !== undefined) {
        this.gunAngle = this._counterAimAngle;
        this.angle = this._counterAimAngle;
      } else if (this.isFlurrying && this._flurryAimAngle !== undefined) {
        this.gunAngle = this._flurryAimAngle;
        this.angle = this._flurryAimAngle;
      }
      return false;
    }
    return super.aim(target);
  }

  interruptAttacks(forceCancelAll = false) {
    const isInsideGojo = this._isInsideGojoDomain();
    const isCounteringState = Boolean((this._counterPunchTimer && this._counterPunchTimer > 0) || (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0) || this.isCountering);
    if (isCounteringState && !forceCancelAll && !isInsideGojo && this.hp > 0) {
      return; // IMMUNITY: Serious Skill Counter cannot be interrupted or cancelled by any attacks while Saitama is alive!
    }

    // Cleanly cancel and reset all Serious Skill Counter variables on interrupt
    this.isCountering = false;
    this._counterPunchTimer = 0;
    this._counterPunchTarget = null;
    this._postCounterRecoveryTimer = 0;
    this._counterWindupTimer = 0;
    this.dodgeCooldown = 0;
    if (this._counterPunchChargeSound) {
      fadeOutSound(this._counterPunchChargeSound, 100);
      this._counterPunchChargeSound = null;
    }
    if (typeof state !== 'undefined' && state.fighters) {
      state.fighters.forEach(f => {
        if (f && f.caughtInSaitamaCounter) f.caughtInSaitamaCounter = false;
      });
    }

    const isSilenced = (this.silenceTimer || 0) > 0;
    const isHardCC = forceCancelAll || this.isTargetOfAmbush || isSilenced || (this.timeStopTimer || 0) > 0 || (this.electricStunTimer || 0) > 0;

    // Hyper Armor: Consecutive Normal Punches barrage cannot be interrupted by incidental flinches
    if (this.isFlurrying && !isHardCC) {
      return;
    }

    if (this.flurryTarget) {
      this.flurryTarget.caughtInSaitamaFlurry = false;
      this.flurryTarget.timeStopTimer = 0;
    }
    this.caughtInGenosFlurry = false;
    if (typeof state !== 'undefined') {
      if (state.fighters) state.fighters.forEach(f => {
        if (f) {
          if (f.caughtInSaitamaFlurry && f.timeStopTimer > 0) f.timeStopTimer = 0;
          f.caughtInSaitamaFlurry = false;
        }
      });
      if (state.illusions) state.illusions.forEach(ill => {
        if (ill) {
          if (ill.caughtInSaitamaFlurry && ill.timeStopTimer > 0) ill.timeStopTimer = 0;
          ill.caughtInSaitamaFlurry = false;
        }
      });
      if (state.cjDriveBys) state.cjDriveBys.forEach(car => { if (car) car.caughtInSaitamaFlurry = false; });
    }
    this.isFlurrying = false;
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this._flurryAccumulatedDamage = 0;
    this._flurryAimAngle = undefined;

    if (this._counterPunchChargeSound) {
      fadeOutSound(this._counterPunchChargeSound, 150);
      this._counterPunchChargeSound = null;
    }
    super.interruptAttacks(forceCancelAll);
  }

  /**
   * Intercepts incoming attack damage to execute dodge teleport (0 damage).
   */
  takeDamage(amount, attacker, opts = {}) {
    // If inside Gojo's domain (Unlimited Void), dodging and counter punishes are completely disabled!
    const isInsideGojoDomain = this._isInsideGojoDomain();
    if (isInsideGojoDomain) {
      return super.takeDamage(amount, attacker, opts);
    }

    // If paralyzed by Nanami's guaranteed 7:3 Ratio strike / hit-pause or explicit sure-kill attack, Saitama cannot dodge or counter!
    const isInsideDomain = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && f.domainActive);
    const isDomainFreeze = isInsideDomain;
    const isBeamOrTickAttack = Boolean(opts.isPurpleDPS || opts.isPureLoveBeam || opts.isBeam || opts.isLaserBeam || opts.isLaylaBeam || opts.isGenosBeam || this.isCaughtInPurple || this.caughtInPureLoveBeam);
    const isGuaranteedHit = Boolean(opts.isRatioCrit || opts.isNanamiPause || opts.undodgeable || opts.isSureKill || opts.isSaitamaCounter || opts.bypassEvade || opts.isGuaranteedHit || opts.isDivineFlame || opts.isFuga);
    const isNanamiPausing = Boolean((attacker && (attacker.characterId === 'nanami' || attacker.type === 'nanami') && (attacker.ratioHitPauseTimer || 0) > 0) || (typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && (f.characterId === 'nanami' || f.type === 'nanami') && (f.ratioHitPauseTimer || 0) > 0)));

    const isGetsugaHit = Boolean(
      opts.isGetsuga ||
      opts.getsugaForm ||
      (opts.projectile && (opts.projectile.isGetsuga || opts.projectile.behaviorType === 'getsuga_tensho')) ||
      this.isDraggedByGetsuga ||
      (this._hitByGetsugaTimer && this._hitByGetsugaTimer > 0) ||
      isSuppressedByGetsuga(this)
    );

    // Saitama's Caped Baldy Reflexes: Sukuna's Malevolent Shrine domain slashes are physical spatial cuts — Saitama can dodge them!
    const isSukunaDomainSlash = Boolean((opts.isDomainSlash && opts.isSukunaSlash) || opts.isSukunaDomainSliceLine);

    if ((isGetsugaHit || (isGuaranteedHit && !isSukunaDomainSlash) || isNanamiPausing || (this.timeStopTimer > 0 && !isDomainFreeze && !isBeamOrTickAttack))) {
      return super.takeDamage(amount, attacker, opts);
    }

    // If incoming damage is from a skill/ultimate/channeling attack and counter is ready, execute counter punch!
    const isSkillAttack = opts.isSkill || opts.isUltimate || opts.isMachineGunBlow || opts.isChanneling;
    if (isSkillAttack && attacker && attacker !== this && this.skillPunishCooldown <= 0 && !isBeamOrTickAttack && !isGetsugaHit) {
      const maxRange = CONFIG.saitama?.counterTriggerDistance ?? 320;
      const distToAttacker = Math.hypot(attacker.x - this.x, attacker.y - this.y);
      if (distToAttacker <= maxRange) {
        const countered = this.executeSkillCounterPunish(attacker);
        if (countered) {
          return false;
        }
      }
    }

    // Ignore non-attack DOTs (poison, burn, domain environment ticks) — but Sukuna domain slashes ARE dodgeable direct attacks
    const isDirectAttack = opts.isProjectile || opts.isMelee || opts.isRanged || opts.isMachineGunBlow || opts.isPhysical || opts.isBasic || opts.isSkill || opts.isUltimate || isBeamOrTickAttack || isSukunaDomainSlash || (attacker && attacker !== this && !opts.isPoison && !opts.isBurn && !opts.fromBlackHole && !opts.isDomainDPS);

    if (isDirectAttack && !isGetsugaHit && !opts.alreadyCheckedDodge) {
      let dodgeTarget = null;
      if (opts.projectile && typeof opts.projectile.x === 'number') {
        dodgeTarget = opts.projectile;
      } else if (opts.isSukunaDomainSliceLine || opts.isDomainSlash) {
        dodgeTarget = {
          isSliceLine: true,
          angle: opts.angle,
          normalX: opts.normalX,
          normalY: opts.normalY,
          cx: opts.cx,
          cy: opts.cy,
          thickness: opts.thickness,
          attacker
        };
      } else {
        dodgeTarget = attacker || null;
      }
      const dodged = this.executeDodgeTeleport(dodgeTarget);
      if (dodged) {
        return false; // Negate damage (dodged!)
      }
    }

    return super.takeDamage(amount, attacker, opts);
  }

  /**
   * Triggers dodge sidestep as projectiles approach near-miss radius
   */
  onProjectileApproach(projectile, attacker) {
    if (this._isInsideGojoDomain()) return;
    if (projectile && (projectile.isGetsuga || projectile.behaviorType === 'getsuga_tensho')) {
      return; // Do not auto-dodge when Getsuga Tensho approaches
    }
    const src = projectile || attacker;
    this.executeDodgeTeleport(src, true);
  }

  /**
   * Triggers alternating back-and-forth punch animation
   */
  triggerPunchAnimation() {
    this.isRightPunch = !this.isRightPunch;
    this.punchAnimTimer = this.punchMaxTime;
  }

  /**
   * Starts Serious charge wind-up animation before firing basic punch attack.
   */
  startBasicPunchCharge(target) {
    if (!this.isNormalPunchEnabled()) return false;
    if (typeof this.canPerformBasicAttack === 'function' && !this.canPerformBasicAttack()) return false;
    if ((this._counterWindupTimer && this._counterWindupTimer > 0) ||
        (this._counterPunchTimer && this._counterPunchTimer > 0) ||
        (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0) ||
        (this.basicPunchChargeTimer && this.basicPunchChargeTimer > 0)) {
      return;
    }
    const windup = CONFIG.saitama?.punchWindupFrames ?? CONFIG.saitama?.punchWindup ?? 0;
    if (windup <= 0) {
      // Instant execution when windup is 0
      this.executeNormalPunch(target);
      return;
    }
    this.basicPunchChargeMaxTimer = windup;
    this.basicPunchChargeTimer = windup;
    this.basicPunchTarget = target;
    this.punchCooldownTimer = (CONFIG.saitama?.punchCooldown ?? 36) + windup;

    // Force punch hand toggle so it extends cleanly
    this.isRightPunch = !this.isRightPunch;
  }

  /**
   * Executes Saitama's Normal Punch basic attack.
   * Multi-target frontal arc (Rule #8 & Rule #6 compliant).
   */
  executeNormalPunch(opponent) {
    if (!this.isNormalPunchEnabled()) return false;
    if (!this.canPerformBasicAttack()) return false;
    // Disable basic attack while Serious Skill Counter is active
    if ((this._counterWindupTimer && this._counterWindupTimer > 0) ||
        (this._counterPunchTimer && this._counterPunchTimer > 0) ||
        (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0)) {
      return;
    }

    const reach = CONFIG.saitama?.punchReach || 80;
    const maxReach = this.r + reach;
    const halfArc = (CONFIG.saitama?.punchArcAngle ?? (Math.PI * 0.5)) / 2;

    // Trigger punch animation and audio unconditionally
    this.triggerPunchAnimation();
    this.punchCooldownTimer = CONFIG.saitama?.punchCooldown ?? 36;
    
    // Play punch sound (matching Gojo's melee punch attack audio at volume 2.8)
    if (typeof audioSystem !== 'undefined') {
      const swingSFX = CONFIG.saitama?.sounds?.punchSwing || 'Assets/Sound Effects/Attacks/punch.mp3';
      const swingVol = CONFIG.saitama?.soundVolumes?.punchSwing ?? 2.8;
      audioSystem.playSFX(swingSFX, swingVol);

      // Play Saitama Attack Grunt / Noise with configurable chance & volume (organized like Nanami)
      const attackNoiseSounds = CONFIG.saitama?.sounds?.attackNoiseSounds || [
        'Assets/Sound Effects/Attacks/saitama-attack-noise1.mp3',
        'Assets/Sound Effects/Attacks/saitama-attack-noise2.mp3',
        'Assets/Sound Effects/Attacks/saitama-attack-noise3.mp3'
      ];
      const attackNoiseChance = (typeof CONFIG.saitama?.soundChances?.attackNoise === 'number')
        ? CONFIG.saitama.soundChances.attackNoise
        : ((typeof CONFIG.saitama?.attackNoiseChance === 'number') ? CONFIG.saitama.attackNoiseChance : 0.40);

      if (attackNoiseSounds && attackNoiseSounds.length > 0 && Math.random() < attackNoiseChance) {
        const selectedAttackNoise = attackNoiseSounds[Math.floor(Math.random() * attackNoiseSounds.length)];
        const noiseVol = CONFIG.saitama?.soundVolumes?.attackNoise !== undefined 
          ? CONFIG.saitama.soundVolumes.attackNoise 
          : (CONFIG.saitama?.attackNoiseVolume !== undefined ? CONFIG.saitama.attackNoiseVolume : 2.5);
        // Play full audio clip without cutting off on subsequent rapid actions
        audioSystem.playSFX(selectedAttackNoise, noiseVol);
      }
    }

    // Query all valid targets (fighters & illusions) in the arena (Rule #6)
    const targetsToScan = [];
    if (typeof state !== 'undefined') {
      if (state.fighters) {
        const myTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(this)) : null;
        for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          if (!f || f === this || f.hp <= 0 || f.isIllusion) continue;
          const targetTeam = state.getFighterTeam ? state.getFighterTeam(i) : null;
          if (myTeam !== null && myTeam === targetTeam) continue; // Ignore true teammates
          targetsToScan.push(f);
        }
      }
      if (state.illusions) {
        const myTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(this)) : null;
        for (const ill of state.illusions) {
          if (!ill || ill === this || ill.hp <= 0) continue;
          if (ill.ownerIndex !== undefined) {
            const illTeam = state.getFighterTeam ? state.getFighterTeam(ill.ownerIndex) : null;
            if (myTeam !== null && myTeam === illTeam) continue; // Ignore true teammates' illusions
          }
          targetsToScan.push(ill);
        }
      }
      if (state.cjDriveBys) {
        const myTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(this)) : null;
        for (const car of state.cjDriveBys) {
          if (!car || car.dead || car.hp <= 0) continue;
          if (car.owner) {
            const carTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(car.owner)) : null;
            if (myTeam !== null && myTeam === carTeam) continue;
          }
          targetsToScan.push(car);
        }
      }
    }

    const punchBlastReach = CONFIG.saitama?.punchFrontalReach || 420;
    const punchBlastArc = CONFIG.saitama?.punchFrontalArc || (Math.PI * 0.65);
    const halfBlastArc = punchBlastArc / 2;
    const maxScanReach = Math.max(maxReach, punchBlastReach);

    // Target acquisition: prioritize targeted opponent if within frontal reach, otherwise find nearest valid target
    let nearestTarget = (opponent && opponent.hp > 0 && targetsToScan.includes(opponent)) ? opponent : null;
    if (nearestTarget) {
      const oppDist = Math.hypot(nearestTarget.x - this.x, nearestTarget.y - this.y);
      if (oppDist > maxScanReach + (nearestTarget.r || 20)) {
        nearestTarget = null;
      }
    }
    if (!nearestTarget) {
      let minDist = Infinity;
      for (const target of targetsToScan) {
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        if (dist <= maxScanReach + (target.r || 20) && dist < minDist) {
          minDist = dist;
          nearestTarget = target;
        }
      }
    }

    // Snap aim facing direction to nearest target so the punch lands accurately!
    let aimAngle = this.gunAngle || this.angle || 0;
    if (nearestTarget) {
      aimAngle = Math.atan2(nearestTarget.y - this.y, nearestTarget.x - this.x);
      this.gunAngle = aimAngle;
      if (typeof this.aim === 'function') {
        this.aim(nearestTarget);
      }
    }

    // Spawn Frontal Supersonic Shockwave Blast (Death Punch style) on Normal Punch
    const fistX = this.x + Math.cos(aimAngle) * (this.r + 15);
    const fistY = this.y + Math.sin(aimAngle) * (this.r + 15);
    if (typeof spawnSaitamaCounterFrontalBlast === 'function') {
      spawnSaitamaCounterFrontalBlast(fistX, fistY, aimAngle, punchBlastReach, punchBlastArc);
    }

    const validHits = [];
    for (const target of targetsToScan) {
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      const effectiveReach = punchBlastReach + (target.r || 20);

      if (dist <= effectiveReach) {
        const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
        let angleDiff = angleToTarget - aimAngle;

        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        // Hit if target is within frontal shockwave blast cone OR close melee range
        if (Math.abs(angleDiff) <= halfBlastArc || dist <= (this.r + (target.r || 20) + 15)) {
          validHits.push({ target, angleToTarget });
        }
      }
    }

    for (const { target, angleToTarget } of validHits) {
      // Boredom passive damage bonus (+15% per stack)
      const boredomMult = 1 + (this.boredomStacks || 0) * (CONFIG.saitama?.boredomDamagePerStack || 0.15);
      const baseDmg = CONFIG.saitama?.punchFrontalDamage || CONFIG.saitama?.punchDamage || 500;
      const finalDamage = Math.round(baseDmg * boredomMult);

      // Deal damage (Rule #6 compliant) - pass isMelee: true, isSkill: true to skip hit-pause
      const didDamage = applyDamageToTarget(target, finalDamage, this, {
        isMelee: true,
        isSkill: true,
        isSaitamaPunch: true,
        bypassShield: true,
        undodgeable: true
      });

      if (didDamage !== false) {
        // Physical knockback push (Massive knockback along punch trajectory!)
        const knockbackForce = CONFIG.saitama?.punchKnockback || 100;
        const kx = Math.cos(aimAngle) * knockbackForce;
        const ky = Math.sin(aimAngle) * knockbackForce;
        target._knockedBackBySaitamaBasicPunch = true;
        target.preventKnockbackBounce = true; // Pin and stick target to wall for 1 second on wall impact instead of bouncing!
        target.isWallPinnedBySaitama = true;
        if (typeof target.applyKnockback === 'function') {
          target.applyKnockback(kx, ky);
        } else {
          target.knockbackVx = kx;
          target.knockbackVy = ky;
          target.vx = kx;
          target.vy = ky;
        }

        // Play serious punch impact audio on hit with smooth fade out
        if (typeof audioSystem !== 'undefined') {
          const impactSFX = CONFIG.saitama?.punchImpactSFX || 'Assets/Sound Effects/Attacks/explosion.mp3';
          const impactVol = CONFIG.saitama?.punchImpactVolume ?? 2.0;
          const soundHandle = audioSystem.playSFX(impactSFX, impactVol);

          const fadeDelay = CONFIG.saitama?.punchImpactFadeDelayMs ?? 350;
          const fadeDuration = CONFIG.saitama?.punchImpactFadeDurationMs ?? 900;
          if (soundHandle && typeof fadeOutSound === 'function') {
            setTimeout(() => {
              fadeOutSound(soundHandle, fadeDuration);
            }, fadeDelay);
          }
        }

        // Screen shake & heavy visual impact
        if (typeof triggerGlobalScreenShake === 'function') {
          const shakeIntensity = CONFIG.saitama?.punchScreenShakeIntensity ?? 12;
          const shakeDuration = CONFIG.saitama?.punchScreenShakeDuration ?? 10;
          triggerGlobalScreenShake(shakeIntensity, shakeDuration);
        }
        if (typeof spawnImpactFlash === 'function') {
          spawnImpactFlash(target.x, target.y, 40, 'default');
        }
        if (typeof spawnAnimePunchImpactFrame === 'function') {
          spawnAnimePunchImpactFrame(target.x, target.y, 60, angleToTarget, 'gold');
        }
        if (typeof spawnMeleeClashShockwave === 'function') {
          spawnMeleeClashShockwave(target.x, target.y, 75, 'gold');
        }
        if (typeof spawnSparks === 'function') {
          spawnSparks(target.x, target.y, 14, 'crimson', '#F5C400');
        }

        // Concussive pressure shockwave push on surrounding entities (60px radius)
        const shockwaveR = CONFIG.saitama?.shockwaveRadius || 60;
        const shockwaveKb = CONFIG.saitama?.shockwaveKnockback ?? 12;
        for (const other of targetsToScan) {
          if (other === target) continue;
          const otherDist = Math.hypot(other.x - target.x, other.y - target.y);
          if (otherDist <= shockwaveR + other.r && otherDist > 0) {
            const pushAngle = Math.atan2(other.y - target.y, other.x - target.x);
            other.vx += Math.cos(pushAngle) * shockwaveKb;
            other.vy += Math.sin(pushAngle) * shockwaveKb;
          }
        }

        // Reset passive boredom stacks upon landing damage
        this.boredomStacks = 0;
        this.boredomTimer = 0;
      }
    }
  }

  reset() {
    super.reset();
    this.isMeleeFighter = true;
    this.isMeleeMode = true;
    this.isBrawler = true;
    this.shootCooldownMax = CONFIG.saitama?.punchCooldown || 500;
    this.cooldown = this.shootCooldownMax;
    this.punchCooldownTimer = 0;
    this.boredomStacks = 0;
    this.boredomTimer = 0;
    this.afterImages = [];
    this.flurryCooldown = CONFIG.saitama?.flurryCooldown || 540; // Start at full CD so bar ticks down from match start
    this.isFlurrying = false;
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;
    this._flurryAimAngle = undefined;
    this.caughtInGenosFlurry = false;
    this.caughtInGenosBeamTimer = 0;
    this.caughtInSaitamaFlurry = false;
    this.caughtInPureLoveBeam = false;
    this.wasCaughtInPureLoveBeam = false;
    this.pureLoveBeamTimer = 0;
    this.pureLoveBeamRecoveryTimer = 0;
    this.isCaughtInPurple = false;
    this.purpleHitTimer = 0;
    this.caughtInJohnWickCombo = false;
  }

  /**
   * Main Fighter update loop
   */
  update(opponent, ownerIndex, arena) {
    if (this.afterImages && this.afterImages.length > 0) {
      fastCleanArray(this.afterImages, (img) => {
        img.timer--;
        return img.timer > 0;
      });
    }

    // Always tick cooldowns and stun timers every frame even while frozen
    this._decrementSkillCooldowns();
    this._tickCooldowns();

    // Check if Nanami is currently executing his cinematic 7:3 Ratio hit-pause mechanic
    const isNanamiRatioPausing = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && (f.characterId === 'nanami' || f.type === 'nanami') && (f.ratioHitPauseTimer || 0) > 0 && (f.ratioHitPauseTarget === this || f._chopTarget === this || !f.ratioHitPauseTarget));

    // Mandatory Rule #1: Freeze / TimeStop guard at the top of update loop (bypassed only during active Serious Counter execution unless inside Gojo domain or being pulled)
    const isFrozen = this._handleTimeStop();
    const isGetsugaSuppressed = Boolean(this.isDraggedByGetsuga || (this._hitByGetsugaTimer && this._hitByGetsugaTimer > 0) || isSuppressedByGetsuga(this));
    const isBeingPulled = this._isBeingPulled();
    const isInsideGojoDomain = this._isInsideGojoDomain();
    const isCounteringState = Boolean((this._counterPunchTimer && this._counterPunchTimer > 0) || (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0) || this.isCountering);

    // Cancel Serious Skill Counter immediately upon being pulled by any pulling mechanic or caught in Gojo's deployed domain
    if ((isBeingPulled || isInsideGojoDomain) && isCounteringState) {
      this.interruptAttacks(true);
    }

    if ((isFrozen || isGetsugaSuppressed || this.isTargetOfAmbush || isNanamiRatioPausing || isBeingPulled || isInsideGojoDomain) && !this.isCountering) {
      this.interruptAttacks();
      return; // MANDATORY: Stop update execution so fighter is completely frozen/paused/pulled!
    }

    // While Serious Skill Counter is active and NOT being pulled or inside Gojo domain, maintain clean stasis immunity
    if (this.isCountering && !isBeingPulled && !isInsideGojoDomain) {
      this.isTargetOfAmbush = false;
      this.isCaughtInPurple = false;
      this.caughtInPureLoveBeam = false;
      this.caughtInGenosFlurry = false;
      this.caughtInGenosBeam = false;
      this.isFrozenByInfinity = false;
      this.timeStopTimer = 0;
      this.hitStunTimer = 0;
      this.paralyzeTimer = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
    }

    // Phase 2: count down punch wind-up and land the blow when timer expires
    this._tickCounterPunch();

    // Trigger Serious Counter (Teleport Behind Punch) when ability is ready
    if (this.skillPunishCooldown <= 0 && this.hp > 0 && !isInsideGojoDomain && !this.isFrozenByInfinity && !this.isTargetOfAmbush && !isNanamiRatioPausing && !isGetsugaSuppressed && (!this._counterPunchTimer || this._counterPunchTimer <= 0) && !this.isFlurrying) {
      const targetsToScan = [];
      if (typeof state !== 'undefined') {
        if (state.fighters) state.fighters.forEach(f => { if (f && f !== this && f.hp > 0 && !f.isIllusion) targetsToScan.push(f); });
        if (state.illusions) state.illusions.forEach(ill => { if (ill && ill !== this && ill.hp > 0) targetsToScan.push(ill); });
      }

      let bestTarget = null;
      let minDist = Infinity;
      const maxCounterRange = CONFIG.saitama?.counterTriggerDistance ?? 320;
      for (const target of targetsToScan) {
        if (typeof state !== 'undefined' && state.getFighterTeam && state.fighters) {
          const myIdx = state.fighters.indexOf(this);
          const targetIdx = state.fighters.indexOf(target);
          if (myIdx >= 0 && targetIdx >= 0) {
            const myTeam = state.getFighterTeam(myIdx);
            const targetTeam = state.getFighterTeam(targetIdx);
            if (myTeam !== null && myTeam === targetTeam) continue;
          }
        }
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        // Only target enemies strictly within Saitama's passive counter range
        if (dist <= maxCounterRange && dist < minDist) {
          minDist = dist;
          bestTarget = target;
        }
      }

      if (bestTarget) {
        this._counterWindupTimer = (this._counterWindupTimer || 0) + 1;
        const windupThreshold = CONFIG.saitama?.counterWindupFrames ?? 50;
        if (this._counterWindupTimer >= windupThreshold) {
          this._counterWindupTimer = 0;
          this.executeSkillCounterPunish(bestTarget);
        }
      } else {
        this._counterWindupTimer = 0;
      }
    } else {
      // Also reset windup if counter is on cooldown or Saitama is incapacitated
      this._counterWindupTimer = 0;
    }

    if (this.punchAnimTimer > 0) {
      this.punchAnimTimer--;
    }

    if (this.sidestepHoldTimer > 0) {
      this.sidestepHoldTimer--;
    }

    if (this._postCounterRecoveryTimer > 0) {
      this._postCounterRecoveryTimer--;
      if (this._postCounterRecoveryTimer <= 0 && (!this._counterPunchTimer || this._counterPunchTimer <= 0)) {
        this.isCountering = false;
        this._counterPunchTarget = null;
        this._counterPunchTimer = 0;
        this._postCounterRecoveryTimer = 0;
        this.dodgeCooldown = 0;
        if (typeof state !== 'undefined' && state.fighters) {
          state.fighters.forEach(f => {
            if (f && f.caughtInSaitamaCounter) f.caughtInSaitamaCounter = false;
          });
        }
        // Give Saitama movement momentum towards the opponent so he immediately walks and fights
        const opp = (opponent && opponent.hp > 0) ? opponent : (typeof state !== 'undefined' && state.fighters ? state.fighters.find(f => f && f !== this && f.hp > 0) : null);
        const chaseAngle = opp ? Math.atan2(opp.y - this.y, opp.x - this.x) : (this.gunAngle || this.angle || 0);
        const spd = this.moveSpeed || this.speed || 6.0;
        this.vx = Math.cos(chaseAngle) * (spd * 0.75);
        this.vy = Math.sin(chaseAngle) * (spd * 0.75);
      }
    }

    // Safety watchdog: If counter punch and recovery have both expired or cleared, ensure counter state and target are cleanly released
    if (this.isCountering && (!this._counterPunchTimer || this._counterPunchTimer <= 0) && (!this._postCounterRecoveryTimer || this._postCounterRecoveryTimer <= 0)) {
      this.isCountering = false;
      this._counterPunchTarget = null;
      this._counterPunchTimer = 0;
      this._postCounterRecoveryTimer = 0;
      this.dodgeCooldown = 0;
    }

    // Tick down the HUD text impact flash timer (white → black snap on punch land)
    if (this._counterPunchImpactFlashTimer > 0) {
      this._counterPunchImpactFlashTimer--;
    }

    // Passive: Boredom Threshold counter (5 seconds without dealing damage = +1 stack)
    const interval = CONFIG.saitama?.boredomStackInterval || 300;
    const maxStacks = CONFIG.saitama?.boredomMaxStacks || 5;
    if (this.boredomStacks < maxStacks) {
      this.boredomTimer = (this.boredomTimer || 0) + 1;
      if (this.boredomTimer >= interval) {
        this.boredomStacks++;
        this.boredomTimer = 0;
      }
    }

    if (this.dodgeStallTimer > 0) {
      this.dodgeStallTimer--;
    }

    const isChargingCounter = Boolean(this._counterPunchTimer && this._counterPunchTimer > 0);
    const isPostCounter = this._postCounterRecoveryTimer > 0;
    const isDodgeStalling = this.dodgeStallTimer > 0;

    // Lock Saitama completely in place during Serious Counter windup or recovery (no forward steering drift or aim tracking)
    if (isChargingCounter || isPostCounter) {
      this.vx = 0;
      this.vy = 0;
      if (this._counterAimAngle !== undefined) {
        this.gunAngle = this._counterAimAngle;
        this.angle = this._counterAimAngle;
      }
      return;
    }

    // ── Skill 1: Consecutive Normal Punches Frame Tick Update ──
    // Stop all movement and deliver the flurry barrage in place (no forward drift)
    if (this.isFlurrying) {
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;

      if (this._flurryAimAngle === undefined) {
        const currentTarget = (this.flurryTarget && this.flurryTarget.hp > 0) ? this.flurryTarget : opponent;
        this._flurryAimAngle = this._getCardinalAngle(currentTarget);
      }

      // Lock Saitama's facing/aim angle completely during Consecutive Normal Punches (strictly cardinal UP/DOWN/LEFT/RIGHT)
      this.gunAngle = this._flurryAimAngle;
      this.angle = this._flurryAimAngle;

      this.flurryTimer++;

      const reach = CONFIG.saitama?.flurryReach || 85;
      const rapidFrontalReach = CONFIG.saitama?.flurryFrontalReach || 320;
      const finalBlastReach = CONFIG.saitama?.flurryFinalFrontalReach || 560;
      const flurryArc = CONFIG.saitama?.flurryArcAngle || Math.PI * 0.65;
      const halfArc = flurryArc / 2; // Rule #8 Frontal Arc
      const finalBlastArc = CONFIG.saitama?.flurryFinalFrontalArc || (Math.PI * 0.70);
      const finalHalfArc = finalBlastArc / 2;
      const aimAngle = this._flurryAimAngle;

      // Query all valid targets (fighters & illusions) in the arena (Rule #6)
      const targetsToScan = [];
      if (typeof state !== 'undefined') {
        if (state.fighters) {
          const myTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(this)) : null;
          for (let i = 0; i < state.fighters.length; i++) {
            const f = state.fighters[i];
            if (!f || f === this || f.hp <= 0 || f.isIllusion) continue;
            const targetTeam = state.getFighterTeam ? state.getFighterTeam(i) : null;
            if (myTeam !== null && myTeam === targetTeam) continue;
            targetsToScan.push(f);
            if (f.rika && f.rika.active && !f.rika.isDying && f.rika.hp > 0 && !targetsToScan.includes(f.rika)) {
              targetsToScan.push(f.rika);
            }
          }
        }
        if (state.illusions) {
          const myTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(this)) : null;
          for (const ill of state.illusions) {
            if (!ill || ill === this || ill.hp <= 0) continue;
            if (ill.ownerIndex !== undefined) {
              const illTeam = state.getFighterTeam ? state.getFighterTeam(ill.ownerIndex) : null;
              if (myTeam !== null && myTeam === illTeam) continue;
            }
            targetsToScan.push(ill);
          }
        }
        if (state.cjDriveBys) {
          const myTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(this)) : null;
          for (const car of state.cjDriveBys) {
            if (!car || car.dead || car.hp <= 0) continue;
            if (car.owner) {
              const carTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(car.owner)) : null;
              if (myTeam !== null && myTeam === carTeam) continue;
            }
            targetsToScan.push(car);
          }
        }
      }

      // Continuously hold trapped enemies pinned during the barrage across the frontal corridor
      for (const target of targetsToScan) {
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        if (dist <= rapidFrontalReach + (target.r || 20)) {
          const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
          let angleDiff = angleToTarget - aimAngle;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

          if (Math.abs(angleDiff) <= halfArc || dist <= (this.r + (target.r || 20) + 15)) {
            if (this.flurryHitsLeft > 0) {
              target.vx = 0;
              target.vy = 0;
              target.caughtInSaitamaFlurry = true;
              if (target.knockbackVx !== undefined) target.knockbackVx = 0;
              if (target.knockbackVy !== undefined) target.knockbackVy = 0;
              if (typeof target.applyTimeStop === 'function') {
                const holdPause = CONFIG.saitama?.flurryHoldHitPauseFrames ?? 8;
                target.applyTimeStop(holdPause);
              }

              // Arena boundary clamp to ensure pinned target never clips out of the arena
              const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
              if (arena) {
                const tR = target.r || 25;
                target.x = Math.max(arena.x + tR, Math.min(arena.x + arena.width - tR, target.x));
                target.y = Math.max(arena.y + tR, Math.min(arena.y + arena.height - tR, target.y));
              }
            }
          }
        }
      }

      // Punch hits execute every flurryHitInterval (default 4 frames)
      const hitInterval = CONFIG.saitama?.flurryHitInterval || 4;
      if (this.flurryTimer % hitInterval === 0 && this.flurryHitsLeft > 0) {
        this.isRightPunch = !this.isRightPunch;
        this.punchAnimTimer = hitInterval;
        this.flurryHitsLeft--;

        const isFinalHit = this.flurryHitsLeft === 0;

        // Saitama slides forward with each punch
        const forwardStep = CONFIG.saitama?.flurryForwardSlideSpeed ?? 4.5;
        this.x += Math.cos(aimAngle) * forwardStep;
        this.y += Math.sin(aimAngle) * forwardStep;

        // Arena boundary clamp for Saitama
        const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
        if (arena) {
          const minX = arena.x + this.r + 10;
          const maxX = arena.x + arena.width - this.r - 10;
          const minY = arena.y + this.r + 10;
          const maxY = arena.y + arena.height - this.r - 10;
          this.x = Math.max(minX, Math.min(maxX, this.x));
          this.y = Math.max(minY, Math.min(maxY, this.y));
        }

        // If flurry target is pinned against the wall, keep Saitama at clean melee spacing instead of overlapping into target
        if (this.flurryTarget && this.flurryTarget.hp > 0) {
          const t = this.flurryTarget;
          const tR = t.r || 25;
          const minSpacing = this.r + tR + 5;
          const currentDist = Math.hypot(t.x - this.x, t.y - this.y);
          if (currentDist < minSpacing) {
            this.x = t.x - Math.cos(aimAngle) * minSpacing;
            this.y = t.y - Math.sin(aimAngle) * minSpacing;
            if (arena) {
              const minX = arena.x + this.r + 10;
              const maxX = arena.x + arena.width - this.r - 10;
              const minY = arena.y + this.r + 10;
              const maxY = arena.y + arena.height - this.r - 10;
              this.x = Math.max(minX, Math.min(maxX, this.x));
              this.y = Math.max(minY, Math.min(maxY, this.y));
            }
          }
        }

        // Play heavy punch audio on each hit
        if (typeof audioSystem !== 'undefined') {
          let punchSFX;
          let vol;
          if (isFinalHit) {
            punchSFX = CONFIG.saitama?.sounds?.flurryFinalImpactSFX || CONFIG.saitama?.flurryFinalImpactSFX || 'Assets/Sound Effects/Skills/saitama-seriouspunch-impact.mp3';
            vol = CONFIG.saitama?.soundVolumes?.flurryFinalImpact ?? (CONFIG.saitama?.flurryFinalImpactVolume ?? 2.2);
          } else {
            const heavyList = CONFIG.saitama?.sounds?.flurryHeavyPunchSFXList || CONFIG.saitama?.flurryHeavyPunchSFXList || [
              'Assets/Sound Effects/Attacks/heavypunch1.mp3',
              'Assets/Sound Effects/Attacks/heavypunch2.mp3',
              'Assets/Sound Effects/Attacks/heavypunch3.mp3'
            ];
            if (Array.isArray(heavyList) && heavyList.length > 0) {
              punchSFX = heavyList[Math.floor(Math.random() * heavyList.length)];
            } else {
              punchSFX = CONFIG.saitama?.sounds?.flurryPunchSFX || CONFIG.saitama?.flurryPunchSFX || 'Assets/Sound Effects/Attacks/heavypunch1.mp3';
            }
            vol = CONFIG.saitama?.soundVolumes?.flurryPunch ?? (CONFIG.saitama?.flurryPunchVolume ?? 2.0);
          }
          const handle = audioSystem.playSFX(punchSFX, vol);
          if (isFinalHit && handle && typeof fadeOutSound === 'function') {
            setTimeout(() => {
              fadeOutSound(handle, 600);
            }, 350);
          }
        }

        // Spawn forward punch wind speed lines
        if (typeof spawnPunchWindSpeedLines === 'function') {
          spawnPunchWindSpeedLines(this.x, this.y, aimAngle, isFinalHit ? 280 : 220, 'orange');
        }

        // Spawn Frontal Supersonic Shockwave Blast on Consecutive Normal Punches Final Punch
        if (isFinalHit && typeof spawnSaitamaCounterFrontalBlast === 'function') {
          const finalFistX = this.x + Math.cos(aimAngle) * (this.r + 15);
          const finalFistY = this.y + Math.sin(aimAngle) * (this.r + 15);
          spawnSaitamaCounterFrontalBlast(finalFistX, finalFistY, aimAngle, finalBlastReach, finalBlastArc);
        }

        // Boredom passive bonus
        const boredomMult = 1 + (this.boredomStacks || 0) * (CONFIG.saitama?.boredomDamagePerStack || 0.15);

        const baseDmg = CONFIG.saitama?.flurryFrontalDamage || CONFIG.saitama?.flurryDamage || 100;
        const currentReach = isFinalHit ? finalBlastReach : rapidFrontalReach;
        const currentHalfArc = isFinalHit ? finalHalfArc : halfArc;
        const slamDmg = CONFIG.saitama?.flurryFinalSlamDamage || 200;
        const rapidDamage = Math.round(baseDmg * boredomMult);
        const finalDamage = Math.round(slamDmg * boredomMult);

        for (const target of targetsToScan) {
          const dist = Math.hypot(target.x - this.x, target.y - this.y);
          if (dist <= currentReach + (target.r || 20)) {
            const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
            let angleDiff = angleToTarget - aimAngle;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            if (Math.abs(angleDiff) <= currentHalfArc || dist <= (this.r + (target.r || 20) + 15)) {
              if (isFinalHit) {
                // ── FINAL BLOW: Devastating finisher punch across entire blast cone ──
                const didDamage = applyDamageToTarget(target, finalDamage, this, {
                  isSkill: true,
                  isMelee: true,
                  isMachineGunBlow: true,
                  isSaitamaPunch: true,
                  isFinalBlow: true,
                  bypassShield: true,
                  undodgeable: true
                });

                target.caughtInSaitamaFlurry = false;
                target.timeStopTimer = 0;
                target.hitStunTimer = 0;

                // Mandatory arena boundary clamp before applying final blow knockback
                if (arena) {
                  const tR = target.r || 25;
                  target.x = Math.max(arena.x + tR, Math.min(arena.x + arena.width - tR, target.x));
                  target.y = Math.max(arena.y + tR, Math.min(arena.y + arena.height - tR, target.y));
                }

                if (didDamage !== false) {
                  // Final blow: heavy knockback push along aim trajectory & screen shake
                  const knockbackForce = CONFIG.saitama?.flurryFinalSlamKnockback || 65;
                  const kx = Math.cos(aimAngle) * knockbackForce;
                  const ky = Math.sin(aimAngle) * knockbackForce;
                  target._knockedBackBySaitamaBasicPunch = true;
                  target.preventKnockbackBounce = true;
                  target.isWallPinnedBySaitama = true;
                  target.vx = kx;
                  target.vy = ky;
                  if (typeof target.applyKnockback === 'function') {
                    target.applyKnockback(kx, ky);
                  }

                  if (typeof triggerGlobalScreenShake === 'function') {
                    const intensity = CONFIG.saitama?.flurryScreenShakeIntensity ?? 14;
                    const duration = CONFIG.saitama?.flurryScreenShakeDuration ?? 10;
                    triggerGlobalScreenShake(intensity, duration);
                  }
                  if (typeof spawnAnimePunchImpactFrame === 'function') {
                    spawnAnimePunchImpactFrame(target.x, target.y, 70, aimAngle, 'gold');
                  }
                  if (typeof spawnMeleeClashShockwave === 'function') {
                    spawnMeleeClashShockwave(target.x, target.y, 85, 'gold');
                  }
                  if (typeof spawnImpactFlash === 'function') {
                    spawnImpactFlash(target.x, target.y, 45, 'default');
                  }
                }
              } else {
                // ── NON-FINAL HIT: Apply frontal barrage punch damage + corridor micro-pushback ──
                applyDamageToTarget(target, rapidDamage, this, {
                  isSkill: true,
                  isMelee: true,
                  isMachineGunBlow: true,
                  isSaitamaPunch: true,
                  bypassShield: true,
                  undodgeable: true
                });

                const pushPerHit = CONFIG.saitama?.flurryPushbackPerHit || 7.0;
                target.x += Math.cos(aimAngle) * pushPerHit;
                target.y += Math.sin(aimAngle) * pushPerHit;

                // Mandatory arena boundary clamp to strictly prevent enemies from clipping outside the arena
                if (arena) {
                  const tR = target.r || 25;
                  target.x = Math.max(arena.x + tR, Math.min(arena.x + arena.width - tR, target.x));
                  target.y = Math.max(arena.y + tR, Math.min(arena.y + arena.height - tR, target.y));
                }

                // Visual sparks feedback
                if (typeof spawnSparks === 'function') {
                  spawnSparks(target.x, target.y, 6, 'crimson', '#F5C400');
                }
                if (typeof spawnImpactFlash === 'function') {
                  spawnImpactFlash(target.x, target.y, 25, 'default');
                }
              }
            }
          }
        }

        // Reset boredom stacks on hit
        this.boredomStacks = 0;
        this.boredomTimer = 0;

        // Conclude flurry on final hit
        if (isFinalHit) {
          this._flurryAccumulatedDamage = 0;
          if (this.flurryTarget) {
            this.flurryTarget.caughtInSaitamaFlurry = false;
            this.flurryTarget.timeStopTimer = 0;
          }
          if (typeof state !== 'undefined') {
            if (state.fighters) state.fighters.forEach(f => {
              if (f && f.caughtInSaitamaFlurry) {
                f.caughtInSaitamaFlurry = false;
                if (f.timeStopTimer > 0) f.timeStopTimer = 0;
              }
            });
            if (state.illusions) state.illusions.forEach(ill => {
              if (ill && ill.caughtInSaitamaFlurry) {
                ill.caughtInSaitamaFlurry = false;
                if (ill.timeStopTimer > 0) ill.timeStopTimer = 0;
              }
            });
            if (state.cjDriveBys) state.cjDriveBys.forEach(car => {
              if (car) car.caughtInSaitamaFlurry = false;
            });
          }
          this.isFlurrying = false;
          this.flurryTarget = null;
          this.flurryHitsLeft = 0;
          this.flurryTimer = 0; // Reset flurryTimer to 0 so isPerformingSkill() doesn't freeze Saitama!
          this._flurryAimAngle = undefined;

          // Give Saitama immediate movement velocity after the final punch
          const opp = (opponent && opponent.hp > 0) ? opponent : (typeof state !== 'undefined' && state.fighters ? state.fighters.find(f => f && f !== this && f.hp > 0) : null);
          const chaseAngle = opp ? Math.atan2(opp.y - this.y, opp.x - this.x) : aimAngle;
          const spd = this.moveSpeed || this.speed || 6.0;
          this.vx = Math.cos(chaseAngle) * (spd * 0.75);
          this.vy = Math.sin(chaseAngle) * (spd * 0.75);
        }
      }

      // Flurry update consumes this frame's action
      return;
    }

    if (isDodgeStalling) {
      // Smoothly decay sideways micro-glide velocity without auto-charging toward the enemy
      this.vx *= 0.85;
      this.vy *= 0.85;
      this.x += this.vx;
      this.y += this.vy;
      const target = (opponent && opponent.hp > 0) ? opponent : (typeof state !== 'undefined' && state.fighters ? state.fighters.find(f => f && f !== this && f.hp > 0) : null);
      if (target && target.hp > 0) {
        const aimAngle = Math.atan2(target.y - this.y, target.x - this.x);
        this.gunAngle = aimAngle;
        this.angle = aimAngle;
        if (typeof this.aim === 'function') {
          this.aim(target);
        }
      }
      this.resolveWallBounce(arena, target || opponent);
    } else {
      // Call base fighter update logic for movement physics, wall bounce, etc. ONLY when freely walking
      super.update(opponent, ownerIndex, arena);
    }

    // Tick basic attack charging wind-up phase
    if (this.basicPunchChargeTimer > 0) {
      this.basicPunchChargeTimer--;
      const punchTgt = (this.basicPunchTarget && this.basicPunchTarget.hp > 0) ? this.basicPunchTarget : opponent;
      if (this.basicPunchChargeTimer <= 0) {
        const t = this.basicPunchTarget || punchTgt;
        this.basicPunchTarget = null;
        if (t && t.hp > 0) {
          this.executeNormalPunch(t);
        }
      }
      return;
    }

    if (this.punchCooldownTimer > 0) {
      this.punchCooldownTimer--;
    }

    const isExecutingCounter = (this._counterWindupTimer && this._counterWindupTimer > 0) ||
                               (this._counterPunchTimer && this._counterPunchTimer > 0) ||
                               (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0);
    if (this.isCaughtInBeam()) {
      this.basicPunchChargeTimer = 0;
    }
    const canAct = (!this.hitStunTimer || this.hitStunTimer <= 0) && !isExecutingCounter && !this.isCaughtInBeam() && !this.isFlurrying;

    // ── AI: Skill 1 Consecutive Normal Punches Trigger ──
    if (this.isConsecutivePunchesEnabled() && canAct && this.flurryCooldown <= 0) {
      let bestFlurryTarget = opponent;
      if (!bestFlurryTarget || bestFlurryTarget.hp <= 0) {
        let minDist = Infinity;
        const myTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(this)) : null;
        for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          if (!f || f === this || f.hp <= 0 || f.isIllusion) continue;
          const targetTeam = state.getFighterTeam ? state.getFighterTeam(i) : null;
          if (myTeam !== null && myTeam === targetTeam) continue;
          const d = Math.hypot(f.x - this.x, f.y - this.y);
          if (d < minDist) {
            minDist = d;
            bestFlurryTarget = f;
          }
        }
      }

      if (bestFlurryTarget && bestFlurryTarget.hp > 0) {
        const dist = Math.hypot(bestFlurryTarget.x - this.x, bestFlurryTarget.y - this.y);
        const triggerDist = CONFIG.saitama?.flurryTriggerDistance ?? 260;
        if (dist <= triggerDist) {
          const triggered = this.executeConsecutiveNormalPunches(bestFlurryTarget);
          if (triggered) return;
        }
      }
    }

    // Basic attack melee punch trigger
    if (this.isNormalPunchEnabled() && canAct && (this.punchCooldownTimer <= 0 || !this.punchCooldownTimer)) {
      let bestTarget = opponent;
      // In FFA/1v1 modes, opponent might be null but there are other enemies, so fallback to finding the nearest
      if (!bestTarget || bestTarget.hp <= 0) {
        let minDist = Infinity;
        const myTeam = state.getFighterTeam ? state.getFighterTeam(state.fighters.indexOf(this)) : null;
        for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          if (!f || f === this || f.hp <= 0 || f.isIllusion) continue;
          const targetTeam = state.getFighterTeam ? state.getFighterTeam(i) : null;
          if (myTeam !== null && myTeam === targetTeam) continue;
          const d = Math.hypot(f.x - this.x, f.y - this.y);
          if (d < minDist) {
            minDist = d;
            bestTarget = f;
          }
        }
      }

      if (bestTarget && bestTarget.hp > 0) {
        const dist = Math.hypot(bestTarget.x - this.x, bestTarget.y - this.y);
        const triggerDist = (CONFIG.saitama?.punchTriggerDistance ?? 260) + this.r + bestTarget.r;
        if (dist <= triggerDist) {
          this.startBasicPunchCharge(bestTarget);
        }
      }
    }
  }
}
