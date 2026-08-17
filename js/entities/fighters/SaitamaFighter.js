import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnImpactFlash, spawnSparks, spawnAnimePunchImpactFrame, spawnMeleeClashShockwave } from '../../graphics/particles/sparkEffect.js';
import { drawSaitamaSkin } from '../../graphics/fighters/saitamaSkin.js';
import { fastCleanArray } from '../../graphics/particles/visualTrailSystem.js';
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
    const sizeMult = CONFIG.globalFighter?.sizeMultiplier ?? 1.0;
    const internalScale = CONFIG.internalScale ?? 1.0;
    const baseRadius = def.radius || CONFIG.saitama?.radius || 25;
    this.r = baseRadius * sizeMult * internalScale;
    this.hp = CONFIG.saitama?.hp || 420;
    this.maxHp = this.hp;
    this.moveSpeed = CONFIG.saitama?.moveSpeed || 6.0;

    // Martial Arts / Brawler variables
    this.isMeleeFighter = true;
    this.punchAnimTimer = 0;
    this.punchMaxTime = 22; // Smooth 22-frame punch animation cycle
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
    this.skillPunishCooldown = CONFIG.saitama?.initialSkillPunishCooldown ?? (CONFIG.saitama?.skillPunishCooldown || 600);
    this._hasExecutedCounterOnce = false;
    this._counterWindupTimer = 0;   // Reaction delay before teleport fires
    this._counterPunchTimer = 0;    // Wind-up frames before the actual punch lands
    this._counterPunchTarget = null; // Target frozen during counter punch pose
    this._postCounterRecoveryTimer = 0; // Brief post-punch stall after landing

    // Skill 1: Consecutive Normal Punches
    this.flurryCooldown = 0;
    this.isFlurrying = false;

    // Skill 2: Serious Side Hops
    this.sideHopsCooldown = 0;
    this.isSideHopping = false;

    // Ultimate: Serious Punch
    this.seriousPunchCooldown = 0;
    this.isChargingSeriousPunch = false;
    this.seriousPunchChargeTimer = 0;
    this.seriousPunchWindupMax = CONFIG.saitama?.seriousPunchWindupFrames || 90;
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

  /** Override base gun shoot to perform Saitama's Normal Punch basic attack */
  shoot(ownerIndex) {
    // Disabled! Melee characters manually trigger attacks via distance check in update().
    // Prevents Fighter.js from auto-calling executeNormalPunch every cooldown cycle.
  }

  /**
   * Passive: No Sell — Ignores basic hit-pause timeStops.
   * Only allows time-stop if flagged as a skill, ultimate, or major effect.
   */
  applyTimeStop(duration, opts = {}) {
    // If it's a basic attack hit-pause without skill/ultimate flags, Saitama ignores it!
    if (!opts.isSkill && !opts.isUltimate && !opts.isInfinity && !opts.isDomain && !opts.isPurple) {
      return; // No sell!
    }
    super.applyTimeStop(duration, opts);
  }

  /**
   * Passive Dodge Teleport (Caped Baldy Reflexes):
   * Sidesteps a short distance left or right upon detecting incoming attacks or projectiles.
   */
  executeDodgeTeleport(attacker, isProjectile = false) {
    if (this.hp <= 0) return false;
    // Check if ANY fighter has an active domain (domain state lives on each fighter, not on state)
    const isInsideDomain = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && f.domainActive);

    // Allow Caped Baldy Reflexes to work inside Gojo's domain:
    // Saitama can reactively dodge punches while frozen, but stays immobilized otherwise.
    const isDomainDodge = isInsideDomain && this.timeStopTimer > 0;

    const isExecutingSeriousCounter = (this._counterPunchTimer && this._counterPunchTimer > 0) || !!this._counterPunchTarget || (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0);

    if (this.dodgeCooldown > 0 || this.isCaughtInPurple || (this.purpleHitTimer && this.purpleHitTimer > 0) || this.isFrozenByInfinity || this.isTargetOfAmbush || isExecutingSeriousCounter) {
      return false;
    }
    // Block dodge if time-stopped by non-domain effects
    if (this.timeStopTimer > 0 && !isDomainDodge) {
      return false;
    }

    // Apply dodge chance from config (default 50%)
    const dodgeChance = CONFIG.saitama?.dodgeChance ?? 0.50;
    if (Math.random() > dodgeChance) {
      return false; // Dodge failed!
    }

    const oldX = this.x;
    const oldY = this.y;

    // Reference angle relative to incoming attacker/projectile or Saitama's facing angle
    let refAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
    if (attacker && attacker !== this && typeof attacker.x === 'number') {
      refAngle = Math.atan2(this.y - attacker.y, this.x - attacker.x);
    } else if (attacker && typeof attacker.vx === 'number' && typeof attacker.vy === 'number') {
      refAngle = Math.atan2(attacker.vy, attacker.vx);
    }

    // Alternate left (-90 deg) and right (+90 deg) sidesteps for dynamic visual movement
    this._lastDodgeSideLeft = !this._lastDodgeSideLeft;
    const sideSign = this._lastDodgeSideLeft ? 1 : -1;
    let perpAngle = refAngle + (sideSign * Math.PI / 2);

    const dist = CONFIG.saitama?.dodgeDistance || 50;
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
        perpAngle = refAngle - (sideSign * Math.PI / 2);
        targetX = this.x + Math.cos(perpAngle) * dist;
        targetY = this.y + Math.sin(perpAngle) * dist;
      }

      targetX = Math.max(minX, Math.min(maxX, targetX));
      targetY = Math.max(minY, Math.min(maxY, targetY));
    }

    // Teleport position update
    this.x = targetX;
    this.y = targetY;

    // Clear any hitStun or hit-pause on dodge so Saitama maintains Caped Baldy reflexes
    const savedTimeStop = this.timeStopTimer;
    this.hitStunTimer = 0;
    this.basicAttackHitPauseTimer = 0;
    this.timeStopTimer = 0;

    // If dodging inside a domain, re-apply the freeze so Saitama stays immobilized
    // He can reactively sidestep punches but can't move/attack between dodges
    if (isDomainDodge && savedTimeStop > 0) {
      this.timeStopTimer = savedTimeStop;
    }

    // MANDATORY Rule #3: Always update aim facing direction relative to opponent after changing position!
    const targetOpponent = (attacker && attacker !== this && attacker.hp > 0 && typeof attacker.x === 'number') ? attacker : (state.fighters ? state.fighters.find(f => f && f !== this && f.hp > 0) : null);
    if (targetOpponent && typeof this.aim === 'function') {
      this.aim(targetOpponent);
    }

    // Apply teleport chase delay to attacker (e.g. Gojo or Sukuna) so they don't snap-teleport instantly to Saitama's new dodge position
    const chaser = (attacker && attacker !== this) ? attacker : targetOpponent;
    if (chaser) {
      const chaseDelay = CONFIG.saitama?.attackerTeleportChaseDelayFrames ?? 30;
      chaser.teleportChaseDelayTimer = Math.max(chaser.teleportChaseDelayTimer || 0, chaseDelay);
    }

    // Spawn smooth fading ghost model skin afterimages along dodge path
    if (!this.afterImages) this.afterImages = [];
    const steps = 1; // Decreased from 3 for cleaner visuals and performance
    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      this.afterImages.push({
        x: oldX + (this.x - oldX) * p,
        y: oldY + (this.y - oldY) * p,
        r: this.r,
        gunAngle: this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0),
        timer: 15,
        maxTimer: 15,
      });
    }

    // Clean impact flashes at old & new coordinates
    if (typeof spawnImpactFlash === 'function') {
      spawnImpactFlash(oldX, oldY, 20, '#F5C400');
      spawnImpactFlash(this.x, this.y, 25, '#FFFFFF');
    }

    // Crisp dash audio effect
    audioSystem.playSFX('skill_dash3', 0.85);

    // Apply a subtle micro-glide velocity sideways along perpAngle so Saitama moves a little smoothly after dodging
    const microGlideSpeed = 2.2;
    this.vx = Math.cos(perpAngle) * microGlideSpeed;
    this.vy = Math.sin(perpAngle) * microGlideSpeed;
    this.dodgeStallTimer = 8; // Short 8-frame micro-glide (~0.13s)
    this.dodgeCooldown = CONFIG.saitama?.dodgeCooldown ?? 10;
    return true;
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
    if (this.timeStopTimer > 0 || this.isCaughtInPurple || (this.purpleHitTimer && this.purpleHitTimer > 0) || this.isFrozenByInfinity || this.isTargetOfAmbush || isInsideDomain) return false;

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

    const oldX = this.x;
    const oldY = this.y;

    // Calculate position directly behind the target relative to the target's facing direction
    const targetAngle = target.gunAngle !== undefined ? target.gunAngle : (target.angle || 0);
    const offsetDist = this.r + target.r + 15;
    let behindX = target.x - Math.cos(targetAngle) * offsetDist;
    let behindY = target.y - Math.sin(targetAngle) * offsetDist;

    // Arena boundary clamp
    const arena = CONFIG.arena;
    if (arena) {
      const minX = arena.x + this.r + 10;
      const maxX = arena.x + arena.width - this.r - 10;
      const minY = arena.y + this.r + 10;
      const maxY = arena.y + arena.height - this.r - 10;
      behindX = Math.max(minX, Math.min(maxX, behindX));
      behindY = Math.max(minY, Math.min(maxY, behindY));
    }

    // Teleport Saitama behind the target
    this.x = behindX;
    this.y = behindY;
    this.vx = 0;
    this.vy = 0;

    // Clear any hit-stun or hit-pause on Saitama
    this.hitStunTimer = 0;
    this.basicAttackHitPauseTimer = 0;
    this.timeStopTimer = 0;

    // MANDATORY Rule #3: Immediately aim facing direction at the target's back
    if (typeof this.aim === 'function') {
      this.aim(target);
    }

    // Spawn ghost model skin afterimages along teleport trajectory
    if (!this.afterImages) this.afterImages = [];
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      this.afterImages.push({
        x: oldX + (this.x - oldX) * p,
        y: oldY + (this.y - oldY) * p,
        r: this.r,
        gunAngle: this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0),
        timer: 14 + i * 3,
        maxTimer: 14 + i * 3,
      });
    }

    // Teleport SFX
    audioSystem.playSFX('skill_dash5', 1.0);

    // Interrupt the enemy's skill channel immediately
    if (typeof target.interruptAttacks === 'function') {
      target.interruptAttacks(true);
    }
    target.isFlurrying = false;
    target.isChargingUlt = false;
    target.isFiringUlt = false;
    target.isCharging = false;
    target.isDashing = false;
    target.vx = 0;
    target.vy = 0;

    // Freeze target in place during Saitama's punch wind-up (like Toji's ambush)
    target.isTargetOfAmbush = true;
    const poseFrames = CONFIG.saitama?.counterPunchPoseFrames ?? 90;
    const idleFrames = CONFIG.saitama?.counterTeleportIdleFrames ?? 30;
    const counterFreezeDuration = poseFrames + idleFrames;
    if (typeof target.applyTimeStop === 'function') {
      target.applyTimeStop(counterFreezeDuration, { isSkill: true });
    } else {
      target.timeStopTimer = counterFreezeDuration;
    }

    // Force the counter punch to use the FRONT hand (rendered on top) and reset active punch animation
    this.isRightPunch = true;
    this.punchAnimTimer = 0;

    // Impact flash at teleport origin and behind enemy
    if (typeof spawnImpactFlash === 'function') {
      spawnImpactFlash(oldX, oldY, 25, '#F5C400');
      spawnImpactFlash(this.x, this.y, 30, '#FFFFFF');
    }

    // Store target and start Phase 2 wind-up countdown (Idle stare + charging pose)
    this._counterPunchTarget = target;
    this._counterPunchTimer = counterFreezeDuration;

    // Play charging voice line and background audio
    const voiceEnabled = CONFIG.saitama?.counterPunchVoiceEnabled !== false;
    if (voiceEnabled) {
      const voiceSrc = CONFIG.saitama?.counterPunchVoiceSFX || 'Assets/Sound Effects/Skills/saitama-seriouspunch-voiceline.mp3';
      const voiceVol = CONFIG.saitama?.counterPunchVoiceVolume ?? 2.0;
      audioSystem.playSFX(voiceSrc, voiceVol);
    }

    const chargingEnabled = CONFIG.saitama?.counterPunchChargingEnabled !== false;
    if (chargingEnabled) {
      const chargingSrc = CONFIG.saitama?.counterPunchChargingSFX || 'Assets/Sound Effects/Skills/saitama-seriouspunch-charging.mp3';
      const chargingVol = CONFIG.saitama?.counterPunchChargingVolume ?? 2.0;
      this._counterPunchChargeSound = audioSystem.playSFX(chargingSrc, chargingVol);
    }

    // Set cooldown now so the scan doesn't fire again mid-wind-up
    this.skillPunishCooldown = CONFIG.saitama?.skillPunishCooldown || 2000;
    this._hasExecutedCounterOnce = true;
    this.dodgeCooldown = 20;
    return true;
  }

  /**
   * Passive: Serious Skill Counter — Phase 2 (Punch Landing)
   * Called from update() when _counterPunchTimer reaches 0.
   * Releases the frozen target and delivers the massive counter punch.
   */
  _tickCounterPunch() {
    if (this._counterPunchTimer <= 0 || !this._counterPunchTarget) return;

    this._counterPunchTimer--;

    // Keep Saitama locked in place facing the target during wind-up
    const target = this._counterPunchTarget;
    if (target && target.hp > 0) {
      this.vx = 0;
      this.vy = 0;
      if (typeof this.aim === 'function') this.aim(target);
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
        const impactSrc = CONFIG.saitama?.counterPunchImpactSFX || 'Assets/Sound Effects/Skills/saitama-seriouspunch-impact.mp3';
        const impactVol = CONFIG.saitama?.counterPunchImpactVolume ?? 2.0;
        audioSystem.playSFX(impactSrc, impactVol);
      }

      // Release target freeze
      if (target) {
        target.isTargetOfAmbush = false;
      }

      if (!target || target.hp <= 0) return; // Target died during wind-up

      // Floating text
      if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(this.x, this.y - this.r - 14, 'COUNTER!', '#FFD700');
      }

      // Visually trigger the hand extension animation now that the wind-up is complete
      this.punchAnimTimer = this.punchMaxTime || 22;

      // Massive Counter Punch Damage (150 damage)
      const massiveDamage = CONFIG.saitama?.counterPunchDamage || 150;
      applyDamageToTarget(target, massiveDamage, this, { isSkill: true, isCounter: true, isCritical: true });

      // Heavy directional knockback push toward Saitama's facing angle
      const pushAngle = this.gunAngle !== undefined ? this.gunAngle : 0;
      const knockbackForce = CONFIG.saitama?.counterPunchKnockback || 50;
      
      // Let them bounce off walls naturally
      
      if (typeof target.applyKnockback === 'function') {
        target.applyKnockback(Math.cos(pushAngle) * knockbackForce, Math.sin(pushAngle) * knockbackForce);
      } else {
        target.vx += Math.cos(pushAngle) * knockbackForce;
        target.vy += Math.sin(pushAngle) * knockbackForce;
      }

      // Hit-pause applied EXCLUSIVELY to target (Rule #5)
      if (typeof target.applyTimeStop === 'function') {
        target.applyTimeStop(CONFIG.saitama?.counterPunchHitPauseFrames ?? 22);
      }

      // Slow movement debuff — the enemy staggers after taking the massive punch
      const slowFrames = CONFIG.saitama?.counterPunchSlowFrames ?? 120;    // ~2s
      const slowMult = CONFIG.saitama?.counterPunchSlowMultiplier ?? 0.35; // 35% speed
      if (target.statusEffects && typeof target.statusEffects.applySlow === 'function') {
        target.statusEffects.applySlow(slowFrames, slowMult);
      } else {
        target.slowTimer = Math.max(target.slowTimer || 0, slowFrames);
        target.slowMultiplier = slowMult;
      }

      // Screen Shake & Sakuga Impact FX
      if (typeof triggerGlobalScreenShake === 'function') {
        const shakeIntensity = CONFIG.saitama?.counterPunchScreenShakeIntensity ?? 4.0;
        const shakeFrames = CONFIG.saitama?.counterPunchScreenShakeFrames ?? 20;
        triggerGlobalScreenShake(shakeIntensity, shakeFrames);
      }
      if (typeof spawnAnimePunchImpactFrame === 'function') {
        spawnAnimePunchImpactFrame(target.x, target.y, 65, pushAngle, 'gold');
      }
      if (typeof spawnMeleeClashShockwave === 'function') {
        spawnMeleeClashShockwave(target.x, target.y, 80, 'gojo');
      }
      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(target.x, target.y, 45, '#FFFFFF');
      }

      // Saitama stops and stares briefly after landing the punch
      this.vx = 0;
      this.vy = 0;
      this._postCounterRecoveryTimer = CONFIG.saitama?.counterPunchRecoveryFrames ?? 40;
    }
  }

  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks(forceCancelAll);
    if (this._counterPunchChargeSound) {
      fadeOutSound(this._counterPunchChargeSound, 150);
      this._counterPunchChargeSound = null;
    }
  }

  /**
   * Intercepts incoming attack damage to execute dodge teleport (0 damage).
   */
  takeDamage(amount, attacker, opts = {}) {
    // If paralyzed by Gojo's Purple or time stop, Saitama cannot dodge or counter!
    // EXCEPTION: Inside a domain, Saitama's Caped Baldy Reflexes still allow reactive dodges against melee punches.
    const isInsideDomain = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && f.domainActive);
    const isDomainFreeze = isInsideDomain && this.timeStopTimer > 0;
    if (opts.isPurpleDPS || this.isCaughtInPurple || (this.purpleHitTimer && this.purpleHitTimer > 0) || (this.timeStopTimer > 0 && !isDomainFreeze)) {
      return super.takeDamage(amount, attacker, opts);
    }

    // If incoming damage is from a skill/ultimate/channeling attack and counter is ready, execute counter punch!
    const isSkillAttack = opts.isSkill || opts.isUltimate || opts.isMachineGunBlow || opts.isChanneling;
    if (isSkillAttack && attacker && attacker !== this && this.skillPunishCooldown <= 0) {
      const countered = this.executeSkillCounterPunish(attacker);
      if (countered) {
        return false;
      }
    }

    // Ignore non-attack DOTs (poison, burn, domain environment ticks)
    const isDirectAttack = opts.isProjectile || opts.isMelee || opts.isRanged || opts.isMachineGunBlow || opts.isPhysical || opts.isBasic || opts.isSkill || opts.isUltimate || (attacker && attacker !== this && !opts.isPoison && !opts.isBurn && !opts.fromBlackHole && !opts.isDomainDPS);

    if (isDirectAttack) {
      const dodged = this.executeDodgeTeleport(attacker);
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
    // Do NOT dodge Gojo's Hollow Purple — Saitama gets caught in the vortex!
    if (projectile && (projectile.isGojoPurple || projectile.isGojoPurpleOrb || projectile.behaviorType === 'gojo_purple')) {
      return;
    }
    const src = attacker || projectile;
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
    if (typeof this.canPerformBasicAttack === 'function' && !this.canPerformBasicAttack()) return false;
    if ((this._counterWindupTimer && this._counterWindupTimer > 0) ||
        (this._counterPunchTimer && this._counterPunchTimer > 0) ||
        (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0) ||
        (this.basicPunchChargeTimer && this.basicPunchChargeTimer > 0)) {
      return;
    }
    const windup = CONFIG.saitama?.punchWindupFrames || 18;
    this.basicPunchChargeMaxTimer = windup;
    this.basicPunchChargeTimer = windup;
    this.basicPunchTarget = target;
    this.punchCooldownTimer = (CONFIG.saitama?.punchCooldown ?? 100) + windup;

    // Force punch hand toggle so it extends cleanly
    this.isRightPunch = !this.isRightPunch;
  }

  /**
   * Executes Saitama's Normal Punch basic attack.
   * Multi-target 90-degree frontal arc (Rule #8 & Rule #6 compliant).
   */
  executeNormalPunch(opponent) {
    if (!this.canPerformBasicAttack()) return false;
    // Disable basic attack while Serious Skill Counter is active
    if ((this._counterWindupTimer && this._counterWindupTimer > 0) ||
        (this._counterPunchTimer && this._counterPunchTimer > 0) ||
        (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0)) {
      return;
    }

    const reach = CONFIG.saitama?.punchReach || 80;
    const maxReach = this.r + reach;
    const halfArc = Math.PI * 0.5; // 90 degree arc (180 deg total cone) for reliable hits

    // Trigger punch animation and audio unconditionally
    this.triggerPunchAnimation();
    this.punchCooldownTimer = CONFIG.saitama?.punchCooldown ?? 100;
    
    // Play punch sound (matching Gojo's melee punch attack audio at volume 2.8)
    if (typeof audioSystem !== 'undefined') {
      audioSystem.playSFX('Assets/Sound Effects/Attacks/punch.mp3', 2.8);
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
    }

    // Find nearest target within reach
    let nearestTarget = null;
    let minDist = Infinity;
    for (const target of targetsToScan) {
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      if (dist <= maxReach + target.r && dist < minDist) {
        minDist = dist;
        nearestTarget = target;
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

    const validHits = [];
    for (const target of targetsToScan) {
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      const effectiveReach = maxReach + target.r;

      if (dist <= effectiveReach) {
        const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
        let angleDiff = angleToTarget - aimAngle;

        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (Math.abs(angleDiff) <= halfArc) {
          validHits.push({ target, angleToTarget });
        }
      }
    }

    for (const { target, angleToTarget } of validHits) {
      // Boredom passive damage bonus (+15% per stack)
      const boredomMult = 1 + (this.boredomStacks || 0) * (CONFIG.saitama?.boredomDamagePerStack || 0.15);
      const baseDmg = CONFIG.saitama?.punchDamage || 150;
      const finalDamage = Math.round(baseDmg * boredomMult);

      // Deal damage (Rule #6 compliant) - pass isMelee: true, isSkill: true to skip hit-pause
      applyDamageToTarget(target, finalDamage, this, { isMelee: true, isSkill: true });

      // Physical knockback push (Massive knockback!)
      const knockbackForce = CONFIG.saitama?.punchKnockback || 50;
      const kx = Math.cos(angleToTarget) * knockbackForce;
      const ky = Math.sin(angleToTarget) * knockbackForce;
      target._knockedBackBySaitamaBasicPunch = true;
      target.preventKnockbackBounce = true; // Pin and stick target to wall for 1 second on wall impact instead of bouncing!
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
        const impactSFX = CONFIG.saitama?.punchImpactSFX || 'Assets/Sound Effects/Skills/saitama-seriouspunch-impact.mp3';
        const impactVol = CONFIG.saitama?.punchImpactVolume ?? 2.0;
        const soundHandle = audioSystem.playSFX(impactSFX, impactVol);

        const fadeDelay = CONFIG.saitama?.punchImpactFadeDelayMs ?? 350;
        const fadeDuration = CONFIG.saitama?.punchImpactFadeDurationMs ?? 600;
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
      for (const other of targetsToScan) {
        if (other === target) continue;
        const otherDist = Math.hypot(other.x - target.x, other.y - target.y);
        if (otherDist <= shockwaveR + other.r && otherDist > 0) {
          const pushAngle = Math.atan2(other.y - target.y, other.x - target.x);
          other.vx += Math.cos(pushAngle) * 12;
          other.vy += Math.sin(pushAngle) * 12;
        }
      }
    }

    // Reset passive boredom stacks upon landing damage
    this.boredomStacks = 0;
    this.boredomTimer = 0;
  }

  reset() {
    super.reset();
    this.shootCooldownMax = CONFIG.saitama?.punchCooldown || 100;
    this.cooldown = this.shootCooldownMax;
    this.punchCooldownTimer = 0;
    this.boredomStacks = 0;
    this.boredomTimer = 0;
    this.afterImages = [];
  }

  /**
   * Main Fighter update loop
   */
  update(opponent, ownerIndex, arena) {
    // Redundant manual decrements removed (handled by _decrementSkillCooldowns and super.update)


    if (this.afterImages && this.afterImages.length > 0) {
      fastCleanArray(this.afterImages, (img) => {
        img.timer--;
        return img.timer > 0;
      });
    }

    // Trigger Serious Counter (Teleport Behind Punch) when ability is ready
    if (this.skillPunishCooldown <= 0 && this.hp > 0 && !this.isFrozenByInfinity && !this.isTargetOfAmbush && (!this._counterPunchTimer || this._counterPunchTimer <= 0)) {
      const targetsToScan = [];
      if (typeof state !== 'undefined') {
        if (state.fighters) state.fighters.forEach(f => { if (f && f !== this && f.hp > 0 && !f.isIllusion) targetsToScan.push(f); });
        if (state.illusions) state.illusions.forEach(ill => { if (ill && ill !== this && ill.hp > 0) targetsToScan.push(ill); });
      }

      let bestTarget = null;
      let minDist = Infinity;
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
        if (dist < minDist) {
          minDist = dist;
          bestTarget = target;
        }
      }

      if (bestTarget) {
        this._counterWindupTimer = (this._counterWindupTimer || 0) + 1;
        const windupThreshold = CONFIG.saitama?.counterWindupFrames ?? 35;
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

    // Phase 2: count down punch wind-up and land the blow when timer expires
    this._tickCounterPunch();

    // Always tick cooldowns and stun timers every frame even while frozen
    this._decrementSkillCooldowns();
    this._tickCooldowns();

    // Mandatory Rule #1: Freeze guard at the very top of update loop
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush || (this.purpleHitTimer && this.purpleHitTimer > 0)) {
      this.interruptAttacks();
      return; // MANDATORY: Stop update execution so fighter is frozen!
    }

    if (this.punchAnimTimer > 0) {
      this.punchAnimTimer--;
    }

    if (this.sidestepHoldTimer > 0) {
      this.sidestepHoldTimer--;
    }

    if (this._postCounterRecoveryTimer > 0) {
      this._postCounterRecoveryTimer--;
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

    const isPostCounter = this._postCounterRecoveryTimer > 0;
    const isDodgeStalling = this.dodgeStallTimer > 0;

    // Call base fighter update logic for movement physics, wall bounce, etc.
    super.update(opponent, ownerIndex, arena);

    if (isDodgeStalling) {
      // Smoothly decay sideways micro-glide velocity without auto-charging toward the enemy
      this.vx *= 0.85;
      this.vy *= 0.85;
      this.x += this.vx;
      this.y += this.vy;
    } else if (isPostCounter) {
      // Post-counter recovery stall: keep Saitama pinned in place
      this.vx = 0;
      this.vy = 0;
    }

    // Tick basic attack charging wind-up phase
    if (this.basicPunchChargeTimer > 0) {
      this.basicPunchChargeTimer--;
      if (this.basicPunchTarget && this.basicPunchTarget.hp > 0 && typeof this.aim === 'function') {
        this.aim(this.basicPunchTarget);
      }
      if (this.basicPunchChargeTimer <= 0) {
        const t = this.basicPunchTarget;
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

    // Basic attack melee punch trigger
    const isExecutingCounter = (this._counterWindupTimer && this._counterWindupTimer > 0) ||
                               (this._counterPunchTimer && this._counterPunchTimer > 0) ||
                               (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0);
    if (this.isCaughtInBeam()) {
      this.basicPunchChargeTimer = 0;
    }
    const canAct = (!this.hitStunTimer || this.hitStunTimer <= 0) && !isExecutingCounter && !this.isCaughtInBeam();
    if (canAct && (this.punchCooldownTimer <= 0 || !this.punchCooldownTimer)) {
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
        const reach = (CONFIG.saitama?.punchReach || 80) + this.r + bestTarget.r;
        if (dist <= reach) {
          this.startBasicPunchCharge(bestTarget);
        }
      }
    }
  }
}
