import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnImpactFlash, spawnSparks, spawnAnimePunchImpactFrame, spawnMeleeClashShockwave, spawnPunchWindSpeedLines } from '../../graphics/particles/sparkEffect.js';
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

    // Check if Nanami is currently executing his 7:3 Ratio hit-pause
    const isNanamiPausing = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && (f.characterId === 'nanami' || f.type === 'nanami') && (f.ratioHitPauseTimer || 0) > 0);

    if (this.dodgeCooldown > 0 || this.isCaughtInPurple || (this.purpleHitTimer && this.purpleHitTimer > 0) || this.isFrozenByInfinity || this.isTargetOfAmbush || isExecutingSeriousCounter || isNanamiPausing) {
      return false;
    }
    // Block dodge if time-stopped by non-domain effects
    if (this.timeStopTimer > 0 && !isDomainDodge) {
      return false;
    }

    // Apply dodge chance from config (default 95%)
    const dodgeChance = CONFIG.saitama?.dodgeChance ?? 0.95;
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
      const chaseDelay = CONFIG.saitama?.attackerTeleportChaseDelayFrames ?? 5;
      chaser.teleportChaseDelayTimer = Math.max(chaser.teleportChaseDelayTimer || 0, chaseDelay);
    }

    // Spawn smooth fading ghost model skin afterimages along dodge path dynamically scaled with distance
    if (!this.afterImages) this.afterImages = [];
    const dodgeDist = Math.hypot(this.x - oldX, this.y - oldY);
    const steps = Math.min(10, Math.max(3, Math.floor(dodgeDist / 25)));
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      this.afterImages.push({
        x: oldX + (this.x - oldX) * p,
        y: oldY + (this.y - oldY) * p,
        r: this.r,
        gunAngle: this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0),
        timer: 18,
        maxTimer: 18,
      });
    }

    // Clean impact flashes at old & new coordinates
    if (typeof spawnImpactFlash === 'function') {
      spawnImpactFlash(oldX, oldY, 20, '#F5C400');
      spawnImpactFlash(this.x, this.y, 25, '#FFFFFF');
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
   * Passive: Serious Skill Counter — Phase 1 (Teleport + Freeze)
   * Saitama instantly teleports behind the channeling enemy and freezes them.
   * The actual punch damage lands after _counterPunchTimer counts down (Phase 2).
   */
  executeSkillCounterPunish(target) {
    if (this.hp <= 0 || !target || target.hp <= 0 || target === this) return false;
    if (this.skillPunishCooldown > 0) return false;
    const isInsideDomain = typeof state !== 'undefined' && (state.activeDomain || state.domainActive);
    const isNanamiPausing = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && (f.characterId === 'nanami' || f.type === 'nanami') && (f.ratioHitPauseTimer || 0) > 0);
    if (this.timeStopTimer > 0 || isNanamiPausing || this.isCaughtInPurple || (this.purpleHitTimer && this.purpleHitTimer > 0) || this.isFrozenByInfinity || this.isTargetOfAmbush || isInsideDomain) return false;

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

    // Set counter state and clear any Infinity freeze/stasis
    this.isCountering = true;
    this.isFrozenByInfinity = false;
    this.infinityFreezeTimer = 0;
    this.hitStunTimer = 0;
    this.basicAttackHitPauseTimer = 0;
    this.timeStopTimer = 0;

    // MANDATORY Rule #3: Immediately aim facing direction at the target's back
    if (typeof this.aim === 'function') {
      this.aim(target);
    }

    // Spawn ghost model skin afterimages along teleport trajectory dynamically scaled with distance
    if (!this.afterImages) this.afterImages = [];
    const counterDist = Math.hypot(this.x - oldX, this.y - oldY);
    const steps = Math.min(18, Math.max(6, Math.floor(counterDist / 30)));
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      const duration = 22 + Math.floor(p * 8);
      this.afterImages.push({
        x: oldX + (this.x - oldX) * p,
        y: oldY + (this.y - oldY) * p,
        r: this.r,
        gunAngle: this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0),
        timer: duration,
        maxTimer: duration,
      });
    }

    // Teleport SFX
    const counterDashSFX = CONFIG.saitama?.sounds?.counterDashSFX || 'skill_dash5';
    const counterDashVol = CONFIG.saitama?.soundVolumes?.counterDash ?? 1.0;
    audioSystem.playSFX(counterDashSFX, counterDashVol);

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
    const poseFrames = CONFIG.saitama?.counterPunchPoseFrames ?? 100;
    const idleFrames = CONFIG.saitama?.counterTeleportIdleFrames ?? 10;
    const counterFreezeDuration = poseFrames + idleFrames;
    if (typeof target.applyTimeStop === 'function') {
      target.applyTimeStop(counterFreezeDuration, { isSkill: true });
    } else {
      target.timeStopTimer = counterFreezeDuration;
    }

    // Aim face at target
    if (typeof this.aim === 'function') {
      this.aim(target);
    }
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
        const impactSrc = CONFIG.saitama?.sounds?.counterPunchImpactSFX || CONFIG.saitama?.counterPunchImpactSFX || 'Assets/Sound Effects/Skills/saitama-seriouspunch-impact.mp3';
        const impactVol = CONFIG.saitama?.soundVolumes?.counterPunchImpact ?? (CONFIG.saitama?.counterPunchImpactVolume ?? 1.0);
        audioSystem.playSFX(impactSrc, impactVol);
      }

      // Release target freeze completely on impact so knockback takes full effect
      if (target) {
        target.isTargetOfAmbush = false;
        target.timeStopTimer = 0;
        target.hitStunTimer = 0;
        if (target.statusEffects && typeof target.statusEffects.timeStopTimer !== 'undefined') {
          target.statusEffects.timeStopTimer = 0;
        }
      }

      if (!target || target.hp <= 0) return; // Target died during wind-up

      // Floating text
      if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(this.x, this.y - this.r - 14, 'COUNTER!', '#FFD700');
      }

      // Clear punchAnimTimer so _postCounterRecoveryTimer solely drives the single unified punch follow-through
      this.punchAnimTimer = 0;

      // Massive Counter Punch Damage (1000 damage) — bypasses Limitless Infinity barrier
      const massiveDamage = CONFIG.saitama?.counterPunchDamage || 1000;
      applyDamageToTarget(target, massiveDamage, this, { isSkill: true, isCounter: true, isCritical: true, bypassShield: true, isSaitamaCounter: true });

      // Heavy directional knockback push toward Saitama's facing angle
      const pushAngle = this.gunAngle !== undefined ? this.gunAngle : 0;
      const knockbackForce = CONFIG.saitama?.counterPunchKnockback || 50;
      const kx = Math.cos(pushAngle) * knockbackForce;
      const ky = Math.sin(pushAngle) * knockbackForce;
      
      target.vx = kx;
      target.vy = ky;
      if (typeof target.applyKnockback === 'function') {
        target.applyKnockback(kx, ky);
      }

      // Slow movement debuff — the enemy staggers after taking the massive punch
      const slowFrames = CONFIG.saitama?.counterPunchSlowFrames ?? 120;    // ~2s
      const slowMult = CONFIG.saitama?.counterPunchSlowMultiplier ?? 0.35; // 35% speed
      target.saitamaCounterDebuffTimer = slowFrames;
      target.saitamaCounterAttacker = this;
      if (target.statusEffects && typeof target.statusEffects.applySlow === 'function') {
        target.statusEffects.applySlow(slowFrames, slowMult);
      } else {
        target.slowTimer = Math.max(target.slowTimer || 0, slowFrames);
        target.slowMultiplier = slowMult;
      }

      // Screen Shake & Sakuga Impact FX
      if (typeof triggerGlobalScreenShake === 'function') {
        const shakeIntensity = CONFIG.saitama?.counterPunchScreenShakeIntensity ?? 100.0;
        const shakeFrames = CONFIG.saitama?.counterPunchScreenShakeFrames ?? 30;
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
      this._postCounterRecoveryTimer = CONFIG.saitama?.counterPunchRecoveryFrames ?? 50;
    }
  }

  /**
   * Skill 1: Consecutive Normal Punches (連続普通のパンチ / Renzoku Futsū no Panchi)
   * Rapid-fire multi-fist barrage dealing consecutive melee punches with a devastating finisher blow.
   */
  executeConsecutiveNormalPunches(opponent) {
    if (this.hp <= 0 || this.flurryCooldown > 0 || !opponent || opponent.hp <= 0) return false;
    const isInsideDomain = typeof state !== 'undefined' && (state.activeDomain || state.domainActive);
    if (this.timeStopTimer > 0 || this.isCaughtInPurple || (this.purpleHitTimer && this.purpleHitTimer > 0) || this.isFrozenByInfinity || this.isTargetOfAmbush || isInsideDomain) return false;

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

    // Cancel any charging basic punch
    this.basicPunchChargeTimer = 0;
    this.basicPunchTarget = null;

    // Display floating skill announcement
    if (typeof spawnFloatingText === 'function') {
      spawnFloatingText(this.x, this.y - this.r - 28, "CONSECUTIVE NORMAL PUNCHES!", "#F5C400");
    }

    const oldX = this.x;
    const oldY = this.y;

    // Supersonic dash into close melee range
    const flurryOffset = CONFIG.saitama?.flurryDashOffset ?? 25;
    const angleToTarget = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    let targetX = opponent.x - Math.cos(angleToTarget) * (this.r + opponent.r + flurryOffset);
    let targetY = opponent.y - Math.sin(angleToTarget) * (this.r + opponent.r + flurryOffset);

    // Arena boundary clamp
    const arena = CONFIG.arena;
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
    if (typeof this.aim === 'function') {
      this.aim(opponent);
    }

    // Spawn ghost afterimages along dash path dynamically scaled with distance
    if (!this.afterImages) this.afterImages = [];
    const dashDist = Math.hypot(this.x - oldX, this.y - oldY);
    const steps = Math.min(14, Math.max(4, Math.floor(dashDist / 25)));
    for (let s = 0; s <= steps; s++) {
      const p = s / steps;
      this.afterImages.push({
        x: oldX + (this.x - oldX) * p,
        y: oldY + (this.y - oldY) * p,
        r: this.r,
        gunAngle: this.gunAngle || this.angle || 0,
        timer: 16,
        maxTimer: 16
      });
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

  interruptAttacks(forceCancelAll = false) {
    if (this.flurryTarget) {
      this.flurryTarget.caughtInSaitamaFlurry = false;
    }
    this.isFlurrying = false;
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;

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
    // If paralyzed by Gojo's Purple, time stop, Nanami's guaranteed 7:3 Ratio strike / hit-pause, or sure-hit attack, Saitama cannot dodge or counter!
    // EXCEPTION: Inside a domain, Saitama's Caped Baldy Reflexes still allow reactive dodges against melee punches.
    const isInsideDomain = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && f.domainActive);
    const isDomainFreeze = isInsideDomain && this.timeStopTimer > 0;
    const isGuaranteedHit = Boolean(opts.isRatioCrit || opts.isNanamiPause || opts.undodgeable || opts.isSureKill || opts.isSaitamaCounter);
    const isNanamiPausing = Boolean((attacker && (attacker.characterId === 'nanami' || attacker.type === 'nanami') && (attacker.ratioHitPauseTimer || 0) > 0) || (typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && (f.characterId === 'nanami' || f.type === 'nanami') && (f.ratioHitPauseTimer || 0) > 0)));

    if (opts.isPurpleDPS || this.isCaughtInPurple || (this.purpleHitTimer && this.purpleHitTimer > 0) || isGuaranteedHit || isNanamiPausing || (this.timeStopTimer > 0 && !isDomainFreeze)) {
      return super.takeDamage(amount, attacker, opts);
    }

    // If incoming damage is from a skill/ultimate/channeling attack and counter is ready, execute counter punch!
    const isSkillAttack = opts.isSkill || opts.isUltimate || opts.isMachineGunBlow || opts.isChanneling;
    if (isSkillAttack && attacker && attacker !== this && this.skillPunishCooldown <= 0) {
      const maxRange = CONFIG.saitama?.counterTriggerDistance ?? 320;
      const distToAttacker = Math.hypot(attacker.x - this.x, attacker.y - this.y);
      if (distToAttacker <= maxRange) {
        const countered = this.executeSkillCounterPunish(attacker);
        if (countered) {
          return false;
        }
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
    const windup = CONFIG.saitama?.punchWindupFrames ?? CONFIG.saitama?.punchWindup ?? 0;
    if (windup <= 0) {
      // Instant execution when windup is 0
      this.executeNormalPunch(target);
      return;
    }
    this.basicPunchChargeMaxTimer = windup;
    this.basicPunchChargeTimer = windup;
    this.basicPunchTarget = target;
    this.punchCooldownTimer = (CONFIG.saitama?.punchCooldown ?? 500) + windup;

    // Force punch hand toggle so it extends cleanly
    this.isRightPunch = !this.isRightPunch;
  }

  /**
   * Executes Saitama's Normal Punch basic attack.
   * Multi-target frontal arc (Rule #8 & Rule #6 compliant).
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
    const halfArc = (CONFIG.saitama?.punchArcAngle ?? (Math.PI * 0.5)) / 2;

    // Trigger punch animation and audio unconditionally
    this.triggerPunchAnimation();
    this.punchCooldownTimer = CONFIG.saitama?.punchCooldown ?? 500;
    
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
      const baseDmg = CONFIG.saitama?.punchDamage || 100;
      const finalDamage = Math.round(baseDmg * boredomMult);

      // Deal damage (Rule #6 compliant) - pass isMelee: true, isSkill: true to skip hit-pause
      applyDamageToTarget(target, finalDamage, this, { isMelee: true, isSkill: true });

      // Physical knockback push (Massive knockback!)
      const knockbackForce = CONFIG.saitama?.punchKnockback || 100;
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
    }

    // Reset passive boredom stacks upon landing damage
    this.boredomStacks = 0;
    this.boredomTimer = 0;
  }

  reset() {
    super.reset();
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

    // Mandatory Rule #1: Freeze / TimeStop guard at the top of update loop (bypassed only during active Serious Counter execution)
    const isFrozen = this._handleTimeStop();
    const isCounteringState = Boolean((this._counterPunchTimer && this._counterPunchTimer > 0) || (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0) || this.isCountering);
    if ((isFrozen || this.isTargetOfAmbush || isNanamiRatioPausing || (this.purpleHitTimer && this.purpleHitTimer > 0)) && !isCounteringState) {
      this.interruptAttacks();
      return; // MANDATORY: Stop update execution so fighter is completely frozen/paused!
    }

    // Phase 2: count down punch wind-up and land the blow when timer expires
    this._tickCounterPunch();

    // Trigger Serious Counter (Teleport Behind Punch) when ability is ready
    if (this.skillPunishCooldown <= 0 && this.hp > 0 && !this.isFrozenByInfinity && !this.isTargetOfAmbush && !isNanamiRatioPausing && (!this._counterPunchTimer || this._counterPunchTimer <= 0) && !this.isFlurrying) {
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
      }
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

    // Lock Saitama completely in place during Serious Counter windup or recovery (no forward steering drift)
    if (isChargingCounter || isPostCounter) {
      this.vx = 0;
      this.vy = 0;
      const target = this._counterPunchTarget || opponent;
      if (target && target.hp > 0 && typeof this.aim === 'function') {
        this.aim(target);
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

      const currentTarget = (this.flurryTarget && this.flurryTarget.hp > 0) ? this.flurryTarget : opponent;
      if (currentTarget && currentTarget.hp > 0 && typeof this.aim === 'function') {
        this.aim(currentTarget);
      }

      this.flurryTimer++;

      const reach = CONFIG.saitama?.flurryReach || 85;
      const maxReach = this.r + reach;
      const halfArc = (CONFIG.saitama?.flurryArcAngle || Math.PI * 0.65) / 2; // Rule #8 Frontal Arc
      const aimAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

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
      }

      // Continuously hold trapped enemies pinned during the barrage
      for (const target of targetsToScan) {
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        if (dist <= maxReach + target.r) {
          const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
          let angleDiff = angleToTarget - aimAngle;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

          if (Math.abs(angleDiff) <= halfArc) {
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
        const arena = CONFIG.arena;
        if (arena) {
          const minX = arena.x + this.r + 10;
          const maxX = arena.x + arena.width - this.r - 10;
          const minY = arena.y + this.r + 10;
          const maxY = arena.y + arena.height - this.r - 10;
          this.x = Math.max(minX, Math.min(maxX, this.x));
          this.y = Math.max(minY, Math.min(maxY, this.y));
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
          spawnPunchWindSpeedLines(this.x, this.y, aimAngle, isFinalHit ? 220 : 150, 'orange');
        }

        // Boredom passive bonus
        const boredomMult = 1 + (this.boredomStacks || 0) * (CONFIG.saitama?.boredomDamagePerStack || 0.15);

        for (const target of targetsToScan) {
          const dist = Math.hypot(target.x - this.x, target.y - this.y);
          if (dist <= maxReach + target.r) {
            const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
            let angleDiff = angleToTarget - aimAngle;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            if (Math.abs(angleDiff) <= halfArc) {
              const baseDmg = isFinalHit ? (CONFIG.saitama?.flurryFinalSlamDamage || 85) : (CONFIG.saitama?.flurryDamage || 24);
              const finalDamage = Math.round(baseDmg * boredomMult);

              applyDamageToTarget(target, finalDamage, this, { isSkill: true, isMelee: true, isMachineGunBlow: true });

              if (isFinalHit) {
                target.caughtInSaitamaFlurry = false;
                target.timeStopTimer = 0;
                target.hitStunTimer = 0;
                // Final blow: heavy knockback push & screen shake
                const knockbackForce = CONFIG.saitama?.flurryFinalSlamKnockback || 65;
                const kx = Math.cos(angleToTarget) * knockbackForce;
                const ky = Math.sin(angleToTarget) * knockbackForce;
                target._knockedBackBySaitamaBasicPunch = true;
                target.preventKnockbackBounce = true;
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
                  spawnAnimePunchImpactFrame(target.x, target.y, 70, angleToTarget, 'gold');
                }
                if (typeof spawnMeleeClashShockwave === 'function') {
                  spawnMeleeClashShockwave(target.x, target.y, 85, 'gold');
                }
                if (typeof spawnImpactFlash === 'function') {
                  spawnImpactFlash(target.x, target.y, 45, 'default');
                }
              } else {
                // Non-final rapid punch: push enemy back a little on each punch
                const pushbackDist = CONFIG.saitama?.flurryPushbackPerHit ?? 7.0;
                target.x += Math.cos(angleToTarget) * pushbackDist;
                target.y += Math.sin(angleToTarget) * pushbackDist;

                // Arena clamp for target
                if (arena) {
                  const tMinX = arena.x + target.r + 10;
                  const tMaxX = arena.x + arena.width - target.r - 10;
                  const tMinY = arena.y + target.r + 10;
                  const tMaxY = arena.y + arena.height - target.r - 10;
                  target.x = Math.max(tMinX, Math.min(tMaxX, target.x));
                  target.y = Math.max(tMinY, Math.min(tMaxY, target.y));
                }

                // Non-final rapid punch visual feedback
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
          if (this.flurryTarget) {
            this.flurryTarget.caughtInSaitamaFlurry = false;
          }
          this.isFlurrying = false;
          this.flurryTarget = null;
          this.flurryHitsLeft = 0;
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
    } else {
      // Call base fighter update logic for movement physics, wall bounce, etc. ONLY when freely walking
      super.update(opponent, ownerIndex, arena);
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

    const isExecutingCounter = (this._counterWindupTimer && this._counterWindupTimer > 0) ||
                               (this._counterPunchTimer && this._counterPunchTimer > 0) ||
                               (this._postCounterRecoveryTimer && this._postCounterRecoveryTimer > 0);
    if (this.isCaughtInBeam()) {
      this.basicPunchChargeTimer = 0;
    }
    const canAct = (!this.hitStunTimer || this.hitStunTimer <= 0) && !isExecutingCounter && !this.isCaughtInBeam() && !this.isFlurrying;

    // ── AI: Skill 1 Consecutive Normal Punches Trigger ──
    if (canAct && this.flurryCooldown <= 0) {
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
