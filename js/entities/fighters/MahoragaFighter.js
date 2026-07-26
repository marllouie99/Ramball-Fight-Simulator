import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../graphics/particles/sparkEffect.js';
import { state, triggerGlobalScreenShake, spawnFloatingText } from '../../core/state.js';
import { playSound } from '../../systems/soundSystem.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawMahoraga3DWheel, drawMahoragaSword } from '../../graphics/weapons/mahoragaWeaponGraphics.js';
import { drawMahoragaFaceWings, drawMahoragaChestNecklace } from '../../graphics/fighters/mahoragaSkin.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';

export class MahoragaFighter extends Fighter {
  constructor(def) {
    super(def);
    
    // Adaptation Tracking (Multi-stage up to 8 wheel turns!)
    this.hitsTaken = {
      melee: 0,
      ranged: 0,
      skill: 0
    };
    
    this.adaptationStage = {
      melee: 0,
      ranged: 0,
      skill: 0
    };

    this.adapted = {
      melee: false,
      ranged: false,
      skill: false
    };

    // Wheel Visuals
    this.wheelRotation = 0;
    this.wheelTargetRotation = 0;
    this.wheelGlowTimer = 0; // Glows when adapting
    this.wheelClickTimer = 0; // Visual click indicator

    // Combat Mechanics
    this.swordCooldown = 0;
    this.cleaveCooldown = CONFIG.mahoraga?.cleaveCooldown || 600;
    this.isCleaving = false;
    this.cleaveWindupTimer = 0;
    this.adaptationPauseTimer = 0;
    this._pendingCounterTarget = null;

    this.shoutCooldown = CONFIG.mahoraga?.shoutCooldown || 480;
    this.isShouting = false;
    this.shoutWindupTimer = 0;

    this.throwCooldown = CONFIG.mahoraga?.initialThrowCooldown ?? (CONFIG.mahoraga?.throwCooldown || 1000);
    this.isThrowing = false;
    this.throwBarrageShotsLeft = 0;
    this.throwBarrageTimer = 0;
    this.bladeRetractProgress = 1.0; // 1.0 = extended, 0.0 = retracted into forearm

    this.isBlitzActive = false;
    this.blitzHitsLeft = 0;
    this.blitzTimer = 0;
    this.blitzTarget = null;
    this.blitzStayTimer = 0;
    this.blitzTotalDuration = 0;
  }

  reset() {
    super.reset();
    
    this.hitsTaken = { melee: 0, ranged: 0, skill: 0 };
    this.adaptationStage = { melee: 0, ranged: 0, skill: 0 };
    this.adapted = { melee: false, ranged: false, skill: false };
    
    this.wheelRotation = 0;
    this.wheelTargetRotation = 0;
    this.wheelGlowTimer = 0;
    this.wheelClickTimer = 0;
    this.shieldIconTimer = 0;
    this.shieldIconReduction = 12;

    this.swordCooldown = 0;
    this.cleaveCooldown = CONFIG.mahoraga?.cleaveCooldown || 600;
    this.isCleaving = false;
    this.cleaveWindupTimer = 0;
    this.adaptationPauseTimer = 0;
    this._pendingCounterTarget = null;

    this.shoutCooldown = CONFIG.mahoraga?.shoutCooldown || 480;
    this.isShouting = false;
    this.shoutWindupTimer = 0;

    this.throwCooldown = CONFIG.mahoraga?.initialThrowCooldown ?? (CONFIG.mahoraga?.throwCooldown || 1000);
    this.isThrowing = false;
    this.throwBarrageShotsLeft = 0;
    this.throwBarrageTimer = 0;
    this.bladeRetractProgress = 1.0;

    this.isBlitzActive = false;
    this.blitzHitsLeft = 0;
    this.blitzTimer = 0;
    this.blitzTarget = null;
    this.blitzStayTimer = 0;
    this.blitzTotalDuration = 0;
  }

  interruptAttacks() {
    super.interruptAttacks();
    this.isCleaving = false;
    this.cleaveWindupTimer = 0;
    this.isShouting = false;
    this.shoutWindupTimer = 0;
    this.isThrowing = false;
    this.throwBarrageShotsLeft = 0;
    this.throwBarrageTimer = 0;
  }

  takeDamage(amount, attacker, opts = {}) {
    const type = opts.isMelee ? 'melee' : (opts.isSkill || opts.isUltimate || opts.isTrueDamage || opts.isExplosion ? 'skill' : 'ranged');
    const reductionPerStage = CONFIG.mahoraga?.adaptationReductionPerStage || 0.12;
    const adaptThreshold = CONFIG.mahoraga?.hitsToAdapt || 3;
    const maxStages = CONFIG.mahoraga?.maxAdaptationStages || 8;
    const rotateOnlyOnAdapt = CONFIG.mahoraga?.rotateOnlyOnAdaptation ?? true;
    const clickDuration = CONFIG.mahoraga?.wheelClickDuration || 25;

    let finalAmount = amount;
    const currentStage = this.adaptationStage[type] || 0;

    // Apply adaptation reduction if already adapted (stage >= 1)
    if (currentStage > 0) {
      const reduction = Math.min(0.96, currentStage * reductionPerStage);
      finalAmount = amount * (1.0 - reduction);
    }

    // Increment hit counter for this attack type
    this.hitsTaken[type] += 1;

    // Rotate wheel on basic hit ONLY IF rotateOnlyOnAdaptation is false in config
    if (!rotateOnlyOnAdapt) {
      this.wheelClickTimer = clickDuration;
      this.wheelTargetRotation = (this.wheelTargetRotation || 0) + (Math.PI / 4);
      this.wheelGlowTimer = 35;
    }

    // Check if adaptation threshold reached for a NEW wheel rotation & stage advancement!
    if (this.hitsTaken[type] % adaptThreshold === 0 && currentStage < maxStages) {
      this._triggerAdaptation(type, attacker);
    }

    const result = super.takeDamage(finalAmount, attacker, opts);

    // --- REVERSE CURSED TECHNIQUE (RCT / DIVINE HEALING AT 25% HP) ---
    const enableRCT = CONFIG.mahoraga?.enableRCTHeal ?? true;
    const thresholdPct = CONFIG.mahoraga?.rctHealThresholdHpPercent ?? 0.25;
    if (enableRCT && this.hp > 0 && !this.isDead && (this.hp / this.maxHp) <= thresholdPct && (this.rctHealCooldownTimer || 0) <= 0) {
      const healHp = Math.round(this.maxHp * (CONFIG.mahoraga?.rctHealAmountPercent || 0.35));
      this.hp = Math.min(this.maxHp, this.hp + healHp);
      this.rctHealCooldownTimer = CONFIG.mahoraga?.rctHealCooldownFrames || 1200;

      spawnFloatingText(this.x, this.y - this.r - 25, `✨ RCT HEAL! +${healHp}`, '#00FF66');
      spawnImpactFlash(this.x, this.y, 65, 'healing');
      spawnSparks(this.x, this.y, 25, 'gold', '#00FF66');
      triggerGlobalScreenShake(8, 12);

      playSound('Assets/Sound Effects/Skills/dash3.mp3', 0.9);
      playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 0.6);
    }

    return result;
  }

  _triggerAdaptation(type, attacker) {
    this.adapted[type] = true;
    this.adaptationStage[type] = (this.adaptationStage[type] || 0) + 1;
    const currentStage = this.adaptationStage[type];
    const clickDuration = CONFIG.mahoraga?.wheelClickDuration || 25;
    const reductionPerStage = CONFIG.mahoraga?.adaptationReductionPerStage || 0.12;
    const reductionPct = Math.round(Math.min(0.96, currentStage * reductionPerStage) * 100);
    
    // ----------------------------------------------------
    // DRAMATIC ADAPTATION PAUSE MOMENT (Golden Dim + Wheel rotates BEFORE Teleport!)
    // ----------------------------------------------------
    const pauseFrames = 40; // 40 frames = 0.66s smooth cinematic pause
    this.adaptationPauseTimer = pauseFrames;
    this.adaptationPauseMax = pauseFrames;
    this.wheelGlowTimer = 65;
    this.wheelClickTimer = pauseFrames;
    this.wheelStartRotation = this.wheelRotation || 0;
    this.wheelTargetRotation = this.wheelStartRotation + (Math.PI / 4);
    this.shieldIconTimer = 90;
    this.shieldIconReduction = reductionPct;

    // Freeze all enemy targets on screen (applyTimeStop + applyHitStun + zero velocity)
    const targetsToFreeze = [];
    if (attacker && attacker !== this && attacker.hp > 0) targetsToFreeze.push(attacker);
    if (typeof state !== 'undefined' && state.fighters) {
      state.fighters.forEach(f => {
        if (f && f !== this && f.hp > 0 && !targetsToFreeze.includes(f)) {
          targetsToFreeze.push(f);
        }
      });
    }

    targetsToFreeze.forEach(f => {
      if (typeof f.applyTimeStop === 'function') f.applyTimeStop(pauseFrames);
      if (typeof f.applyHitStun === 'function') f.applyHitStun(pauseFrames);
      f.mahoragaAdaptationFreezeTimer = pauseFrames; // Freezes Toji even during 1-3 ambush sequence combos!
      f.vx = 0;
      f.vy = 0;
    });

    triggerGlobalScreenShake(6, 18);

    const wheelY = this.y - this.r - 28;
    spawnFloatingText(this.x, wheelY - 25, `🛡️ -${reductionPct}% DAMAGE REDUCTION!`, '#FFD700');
    playSound('Assets/Sound Effects/Skills/dash3.mp3', 0.9);
    playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 1.0);

    // Save attacker for smooth divine flash-dash counter as soon as wheel rotation completes!
    if (attacker && !attacker.isDead && attacker !== this) {
      this._pendingCounterTarget = attacker;
    }
  }

  _spawnTeleportAfterimages(fromX, fromY, toX, toY, customAngle = null) {
    if (!this.adaptationAfterimages) this.adaptationAfterimages = [];
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;

    const pathAngle = Math.atan2(dy, dx);
    const facingAngle = customAngle !== null ? customAngle : (this.gunAngle !== undefined ? this.gunAngle : pathAngle);
    const steps = Math.max(5, Math.floor(dist / 14));

    const baseMax = CONFIG.mahoraga?.afterimageLifetimeFrames || 12;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const maxTimer = Math.max(4, Math.floor(baseMax - t * 4));
      pushTrailCap(this.adaptationAfterimages, {
        x: fromX + dx * t,
        y: fromY + dy * t,
        gunAngle: facingAngle,
        timer: maxTimer,
        maxTimer: maxTimer,
        fromX: fromX,
        fromY: fromY,
        toX: toX,
        toY: toY
      }, 35);
    }
  }

  _startAdaptationFlashDash(attacker) {
    if (!attacker || attacker.isDead || attacker === this) return;

    // Reset adaptation pause timers
    this.adaptationPauseTimer = 0;
    this.wheelGlowTimer = 0;
    this.wheelClickTimer = 0;

    const fromX = this.x;
    const fromY = this.y;

    const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;

    // Calculate angle from attacker toward Mahoraga's current position
    const angleToMahoraga = Math.atan2(fromY - attacker.y, fromX - attacker.x);
    // Blind spot is directly behind attacker's back (opposite side of Mahoraga: angleToMahoraga + PI)
    const behindAngle = angleToMahoraga + Math.PI;
    const offsetDist = attacker.r + this.r + 18;

    let toX = attacker.x + Math.cos(behindAngle) * offsetDist;
    let toY = attacker.y + Math.sin(behindAngle) * offsetDist;

    // ARENA BOUNDARY PROTECTION (Prevents clipping outside arena wall when enemy is near edge!)
    if (arena) {
      const minX = arena.x + this.r + 5;
      const maxX = arena.x + arena.width - this.r - 5;
      const minY = arena.y + this.r + 5;
      const maxY = arena.y + arena.height - this.r - 5;

      if (toX < minX || toX > maxX || toY < minY || toY > maxY) {
        // Attacker is up against the wall! Calculate safe flank position inside arena facing toward center
        const centerAngle = Math.atan2(arena.y + arena.height / 2 - attacker.y, arena.x + arena.width / 2 - attacker.x);
        toX = attacker.x + Math.cos(centerAngle + Math.PI * 0.4) * offsetDist;
        toY = attacker.y + Math.sin(centerAngle + Math.PI * 0.4) * offsetDist;

        toX = Math.max(minX, Math.min(maxX, toX));
        toY = Math.max(minY, Math.min(maxY, toY));
      }
    }

    this.dashFromX = fromX;
    this.dashFromY = fromY;
    this.dashToX = toX;
    this.dashToY = toY;
    const dashFrames = CONFIG.mahoraga?.adaptationDashSpeedFrames || 4;
    this.adaptationDashTimer = dashFrames;
    this.adaptationDashTarget = attacker;

    // Spawn afterimages along flash-dash trajectory (Matches Gojo & Sukuna visual system!)
    this._spawnTeleportAfterimages(fromX, fromY, toX, toY);

    // Sonic dash sound & departure spark burst
    spawnImpactFlash(fromX, fromY, 28, '#E0E0E0');
    spawnSparks(fromX, fromY, 12, 'silver', '#FFFFFF');
    playSound('Assets/Sound Effects/Skills/dash3.mp3', 1.0);
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // ----------------------------------------------------
    // HIGH-SPEED DIVINE FLASH-DASH TICK (Smooth Motion Interpolation)
    // ----------------------------------------------------
    if (this.adaptationDashTimer > 0) {
      this.adaptationDashTimer--;
      const maxDash = CONFIG.mahoraga?.adaptationDashSpeedFrames || 4;
      const progress = 1.0 - (this.adaptationDashTimer / maxDash);

      // Smooth position lerp from departure to destination!
      this.x = this.dashFromX + (this.dashToX - this.dashFromX) * progress;
      this.y = this.dashFromY + (this.dashToY - this.dashFromY) * progress;

      // MANDATORY RULE 3: Keep aim updated during flash-dash
      if (this.adaptationDashTarget && !this.adaptationDashTarget.isDead) {
        this.aim(this.adaptationDashTarget);
      }

      // Record fading afterimage ghosts along motion trail
      if (!this.adaptationAfterimages) this.adaptationAfterimages = [];
      this.adaptationAfterimages.push({
        x: this.x,
        y: this.y,
        gunAngle: this.gunAngle,
        timer: 12,
        maxTimer: 12
      });

      // Arrival Frame -> Snap to back, aim target (Rule 3), long-distance knockback & Rapid Throw Barrage!
      if (this.adaptationDashTimer === 0 && this.adaptationDashTarget && !this.adaptationDashTarget.isDead) {
        const target = this.adaptationDashTarget;
        this.adaptationDashTarget = null;

        // Snap position behind target
        this.x = this.dashToX;
        this.y = this.dashToY;

        // MANDATORY RULE 3: Instantly align aim to target from new position!
        this.aim(target);
        this.vx = 0;
        this.vy = 0;

        // ARENA BOUNDARY CLAMPING: Ensure both fighters stay 100% inside arena walls!
        const activeArena = arena || (typeof state !== 'undefined' && state.arena ? state.arena : CONFIG.arena);
        if (activeArena) {
          this.x = Math.max(activeArena.x + this.r + 2, Math.min(activeArena.x + activeArena.width - this.r - 2, this.x));
          this.y = Math.max(activeArena.y + this.r + 2, Math.min(activeArena.y + activeArena.height - this.r - 2, this.y));

          target.x = Math.max(activeArena.x + target.r + 2, Math.min(activeArena.x + activeArena.width - target.r - 2, target.x));
          target.y = Math.max(activeArena.y + target.r + 2, Math.min(activeArena.y + activeArena.height - target.r - 2, target.y));
        }

        // MANDATORY RULE 3: Instantly align aim to target from new position!
        this.aim(target);

        // 1. Heavy Blast Strike at target's back + Divine Shout Shockwave Roar!
        const damage = CONFIG.mahoraga?.swordDamage || 25;
        target.takeDamage(damage, this, { isMelee: true, isSkill: true });

        // Unfreeze target completely so knockback velocity fires INSTANTLY on frame 0 with ZERO delay!
        target.timeStopTimer = 0;
        target.mahoragaAdaptationFreezeTimer = 0;
        target.hitStunTimer = 0;
        target.knockbackStunTimer = 0;

        // Visual & Sound Impact
        spawnImpactFlash(target.x, target.y, 45, '#FFFFFF');
        spawnSparks(target.x, target.y, 25, 'silver', '#FFFFFF');
        spawnMeleeClashShockwave(target.x, target.y, 110, 'silver');
        triggerGlobalScreenShake(10, 18);
        playSound('Assets/Sound Effects/Attacks/fleshhit.mp3', 1.0);
        playSound('Assets/Sound Effects/Attacks/explosion.mp3', 0.8);
        playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 1.0);

        // Unleash Divine Shout Shockwave Roar on impact!
        this._executeShout(target, ownerIndex);

        // MASSIVE INSTANT ZERO-DELAY KNOCKBACK (Launches enemy far across the arena away from Mahoraga!)
        const kbAngle = Math.atan2(target.y - this.y, target.x - this.x);
        const kbForce = 42.0; // 42px/frame instant explosive launch!
        const kbVx = Math.cos(kbAngle) * kbForce;
        const kbVy = Math.sin(kbAngle) * kbForce;

        target.vx = kbVx;
        target.vy = kbVy;
        if (typeof target.applyKnockback === 'function') {
          target.applyKnockback(kbVx, kbVy);
        }

        // Immediate position step on frame 0 for instant zero-delay reaction!
        target.x += target.vx;
        target.y += target.vy;

        this.punchAnimTimer = 22;

        // 2. IMMEDIATE FOLLOW-UP: UNLEASH RAPID THROW BARRAGE (OR BLITZ IF THROW ON COOLDOWN) AT FLYING ENEMY!
        if (this.throwCooldown <= 0) {
          this.isThrowing = true;
          this.throwBarrageShotsLeft = CONFIG.mahoraga?.throwBarrageCount || 10;
          this.throwBarrageTimer = CONFIG.mahoraga?.throwBarrageInterval || 5; // Fire first shot immediately!
          spawnFloatingText(this.x, this.y - this.r - 25, 'ADAPTATION BARRAGE!', '#E0E8FF');
        } else {
          // THROW IS ON COOLDOWN -> FALL BACK TO BLITZ INSTEAD!
          this.isBlitzActive = true;
          this.blitzWindupTimer = CONFIG.mahoraga?.blitzWindupFrames || 10;
          this.blitzHitsLeft = CONFIG.mahoraga?.blitzHitsCount || 6;
          this.blitzTimer = 0;
          this.blitzStayTimer = 999;
          this.blitzTotalDuration = CONFIG.mahoraga?.blitzTotalDurationFrames || 90;
          this.blitzTarget = target;
          spawnFloatingText(this.x, this.y - this.r - 25, 'HAND-TO-HAND BLITZ!', '#FFD700');
        }
      }
      return; // Skip normal physics during flash-dash!
    }

    // ----------------------------------------------------
    // ADAPTATION PAUSE TICK: Wheel rotates 45 degrees BEFORE teleport occurs!
    // ----------------------------------------------------
    if (this.adaptationPauseTimer > 0) {
      this.adaptationPauseTimer--;
      this.vx = 0;
      this.vy = 0;

      // Also freeze opponent passed to update loop
      if (opponent && opponent !== this && opponent.hp > 0) {
        if (typeof opponent.applyTimeStop === 'function') opponent.applyTimeStop(2);
        if (typeof opponent.applyHitStun === 'function') opponent.applyHitStun(2);
        opponent.mahoragaAdaptationFreezeTimer = 2;
        opponent.vx = 0;
        opponent.vy = 0;
      }

      // Smooth easeInOutCubic wheel rotation progressing across the pause
      const p = 1.0 - (this.adaptationPauseTimer / (this.adaptationPauseMax || 40));
      const easeP = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      this.wheelRotation = (this.wheelStartRotation || 0) + easeP * (Math.PI / 4);

      // EXACT FRAME WHEEL FINISHES ROTATING 45 DEGREES -> START FLASH-DASH LERP!
      if (this.adaptationPauseTimer === 0 && this._pendingCounterTarget) {
        this.wheelRotation = this.wheelTargetRotation;
        this._startAdaptationFlashDash(this._pendingCounterTarget);
        this._pendingCounterTarget = null;
      }
      return; // Hold update loop during Adaptation Time-Freeze!
    }

    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // Wheel Rotation Tick
    if (this.wheelClickTimer > 0) {
      this.wheelClickTimer--;
      this.wheelRotation += (this.wheelTargetRotation - this.wheelRotation) * 0.25;
    } else if (this.wheelTargetRotation !== undefined) {
      this.wheelRotation = this.wheelTargetRotation;
    }

    if (this.wheelGlowTimer > 0) this.wheelGlowTimer--;
    if (this.shieldIconTimer > 0) this.shieldIconTimer--;

    // Smooth retractable blade interpolation (hides blade back into forearm when throwing)
    if (this.isThrowing) {
      this.bladeRetractProgress += (0.0 - this.bladeRetractProgress) * 0.15;
    } else {
      this.bladeRetractProgress += (1.0 - this.bladeRetractProgress) * 0.15;
    }

    if (this.neutralStanceTimer > 0) {
      this.neutralStanceTimer--;
      if (this.neutralStanceTimer === 0) {
        // Active stance duration ended -> Trigger full cooldown!
        this.neutralStanceCooldownTimer = CONFIG.mahoraga?.neutralStanceCooldownFrames || 180;
      }
    } else if (this.neutralStanceCooldownTimer > 0) {
      // Cooldown ONLY ticks down AFTER active stance duration has completely ended!
      this.neutralStanceCooldownTimer--;
    }
    if (this.rctHealCooldownTimer > 0) this.rctHealCooldownTimer--;
    if (this.channelingPunishTeleportTimer > 0) this.channelingPunishTeleportTimer--;
    if (this.swordCooldown > 0) this.swordCooldown--;
    if (this.cleaveCooldown > 0) this.cleaveCooldown--;
    if (this.shoutCooldown > 0) this.shoutCooldown--;
    if (this.throwCooldown > 0) this.throwCooldown--;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.leftPunchTimer > 0) this.leftPunchTimer--;

    // Divine Shout Windup (AoE Shockwave Roar)
    if (this.isShouting) {
      this.shoutWindupTimer++;
      this.vx = 0;
      this.vy = 0;
      this.applyMovementPhysics(0);

      const maxWindup = CONFIG.mahoraga?.shoutWindupFrames || 15;
      if (this.shoutWindupTimer >= maxWindup) {
        this._executeShout(opponent, ownerIndex);
        this.isShouting = false;
        this.shoutWindupTimer = 0;
        this.shoutCooldown = CONFIG.mahoraga?.shoutCooldown || 480;
      }
      return;
    }

    // Conditional Rapid Barrage Throw (Plants feet & hurls rapid high-speed projectiles!)
    if (this.isThrowing) {
      this.vx = 0;
      this.vy = 0;
      this.applyMovementPhysics(0);

      if (opponent && !opponent.isDead) {
        // Heavy slow gradual aim tracking during throw stance!
        const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        const turnSpeed = CONFIG.mahoraga?.throwAimRotationSpeed ?? 0.06;
        
        let diff = targetAngle - this.gunAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        this.gunAngle += diff * turnSpeed;
      }

      this.throwBarrageTimer++;
      const interval = CONFIG.mahoraga?.throwBarrageInterval || 5;

      if (this.throwBarrageTimer >= interval) {
        this.throwBarrageTimer = 0;
        this.shoot(ownerIndex);
        this.throwBarrageShotsLeft--;

        // Visual spark burst & recoil on each rapid throw
        spawnImpactFlash(this.x, this.y, 25, 'silver');
        spawnSparks(this.x, this.y, 6, 'silver', '#FFFFFF');

        if (this.throwBarrageShotsLeft <= 0) {
          this.isThrowing = false;
          this.throwCooldown = CONFIG.mahoraga?.throwCooldown ?? 1000;

          // SMOOTH TRANSITION TO HAND-TO-HAND BLITZ (Attack-Teleport-Attack-Teleport Sequence!)
          this.isBlitzActive = true;
          this.blitzWindupTimer = CONFIG.mahoraga?.blitzWindupFrames || 14; // Configurable windup transition
          this.blitzHitsLeft = CONFIG.mahoraga?.blitzHitsCount || 6;
          this.blitzTimer = 0;
          this.blitzStayTimer = 999; // Allow instant teleport on 1st hit after throw barrage
          this.blitzTotalDuration = CONFIG.mahoraga?.blitzTotalDurationFrames || 90;
          this.blitzTarget = opponent;
          spawnFloatingText(this.x, this.y - this.r - 25, 'HAND-TO-HAND BLITZ!', '#FFD700');
        }
      }
      return; // Hold planted stance during entire rapid barrage!
    }

    // ----------------------------------------------------
    // HAND-TO-HAND BLITZ SEQUENCE (Attack-Teleport-Attack-Teleport!)
    // ----------------------------------------------------
    if (this.isBlitzActive) {
      this.vx = 0;
      this.vy = 0;
      this.applyMovementPhysics(0);

      const target = this.blitzTarget || opponent;
      if (!target || target.isDead) {
        this.isBlitzActive = false;
        this.blitzHitsLeft = 0;
        return;
      }

      // Apply heavy slow-motion debuff to target during blitz sequence!
      const slowMult = CONFIG.mahoraga?.blitzTargetSlowMultiplier ?? 0.25;
      if (typeof target.applySlow === 'function') {
        target.applySlow(15, slowMult);
      }
      target.vx *= 0.4;
      target.vy *= 0.4;

      // Smooth Windup Transition (Mahoraga readies stance & aims at target before 1st blitz hit!)
      if (this.blitzWindupTimer > 0) {
        this.blitzWindupTimer--;
        this.aim(target);
        this.bladeRetractProgress += (1.0 - this.bladeRetractProgress) * 0.15; // Smoothly extend blade
        return;
      }

      this.blitzStayTimer++;
      this.blitzTotalDuration--;
      if (this.blitzTotalDuration <= 0 && this.blitzHitsLeft > 1) {
        this.blitzHitsLeft = 1; // Force final finisher cleave when total blitz duration expires!
      }

      this.blitzTimer++;
      const blitzInterval = CONFIG.mahoraga?.blitzHitInterval || 7; // Rapid melee rhythm (~0.11s)

      if (this.blitzTimer >= blitzInterval) {
        this.blitzTimer = 0;
        this.blitzHitsLeft--;

        const activeArena = arena || (typeof state !== 'undefined' && state.arena ? state.arena : CONFIG.arena);
        const totalHits = CONFIG.mahoraga?.blitzHitsCount || 6;
        const hitIndex = totalHits - this.blitzHitsLeft; // 1, 2, 3, 4, 5, 6

        // 1. Check distance & minimum stay duration: ONLY TELEPORT WHEN ENEMY IS FAR AWAY AND STAY DURATION EXPIRED!
        const distToTarget = Math.hypot(this.x - target.x, this.y - target.y);
        const maxMeleeDist = CONFIG.mahoraga?.blitzTeleportDistanceThreshold || (this.r + target.r + (CONFIG.mahoraga?.swordRange || 80) + 40);
        const minStayFrames = CONFIG.mahoraga?.blitzMinStayFrames || 20;

        if (distToTarget > maxMeleeDist && this.blitzStayTimer >= minStayFrames) {
          this.blitzStayTimer = 0; // Reset stay duration timer on teleport!
          // Enemy is getting far away! Flash-teleport right next to target to continue the rapid melee flurry!
          const angles = [0, Math.PI, -Math.PI * 0.5, Math.PI * 0.5];
          const baseAngle = angles[(hitIndex - 1) % angles.length] + (Math.random() - 0.5) * 0.4;
          const offsetDist = target.r + this.r + 14;

          let teleX = target.x + Math.cos(baseAngle) * offsetDist;
          let teleY = target.y + Math.sin(baseAngle) * offsetDist;

          // ARENA BOUNDARY PROTECTION (Clamps position securely within arena padding)
          if (activeArena) {
            const minX = activeArena.x + this.r + 5;
            const maxX = activeArena.x + activeArena.width - this.r - 5;
            const minY = activeArena.y + this.r + 5;
            const maxY = activeArena.y + activeArena.height - this.r - 5;

            teleX = Math.max(minX, Math.min(maxX, teleX));
            teleY = Math.max(minY, Math.min(maxY, teleY));
          }

          const oldX = this.x;
          const oldY = this.y;

          // Teleport Mahoraga to new position right next to target!
          this.x = teleX;
          this.y = teleY;

          // MANDATORY RULE 3: Immediately align aim to target from new position!
          this.aim(target);
          this.vx = 0;
          this.vy = 0;

          // Spawn dense afterimages along teleport vector path (Matches Gojo & Sukuna visual system!)
          this._spawnTeleportAfterimages(oldX, oldY, teleX, teleY);

          // MANDATORY RULE 3: Immediately align aim to target from new position!
          this.aim(target);

          playSound('Assets/Sound Effects/Skills/dash3.mp3', 0.9);
        } else {
          // Already in close range! Keep aim aligned to target
          this.aim(target);
        }

        // 2. Perform Hand-to-Hand Martial Arts Strike / Sword Finisher
        if (hitIndex < totalHits) {
          // Hits 1 to N-1: Rapid Bare-Handed Martial Arts Flurry (Left punch / Right chop)
          const blitzDamage = CONFIG.mahoraga?.blitzHitDamage || 16;
          target.takeDamage(blitzDamage, this, { isMelee: true, isSkill: true });
          target.applyHitStun(10); // Keep target pinned during rapid melee flurry

          const animDur = CONFIG.mahoraga?.blitzAttackAnimDuration || 7;
          if (hitIndex % 2 === 1) {
            this.leftPunchTimer = animDur; // Off-hand punch
          } else {
            this.punchAnimTimer = animDur; // Right hand martial chop
            this.swordCombo = (this.swordCombo || 0) + 1;
          }

          // High-Octane Anime Action Visual Effects & Sound Layers
          spawnImpactFlash(target.x, target.y, 38, '#FFFFFF');
          spawnMeleeClashShockwave(target.x, target.y, 65, 'mahoraga');
          spawnSparks(target.x, target.y, 18, 'gold', '#FFFFFF');
          triggerGlobalScreenShake(6, 12);

          // Manga Action Words Floating Text
          const animeWords = ['ORA!', 'SLAM!', 'SLASH!', 'WHAM!', 'POW!'];
          const word = animeWords[(hitIndex - 1) % animeWords.length];
          spawnFloatingText(target.x + (Math.random() - 0.5) * 20, target.y - target.r - 20, word, '#FFD700');

          // Audio layers (punch sound + razor swing)
          playSound('Assets/Sound Effects/Attacks/punch.mp3', 0.9);
          playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 0.8);

          // Slow gradual pushback physics on each rapid hit (pushes enemy back gradually hit-by-hit!)
          const pushForce = CONFIG.mahoraga?.blitzHitPushbackForce ?? 4.5;
          const pushAngle = this.gunAngle !== undefined ? this.gunAngle : Math.atan2(target.y - this.y, target.x - this.x);
          target.vx = Math.cos(pushAngle) * pushForce;
          target.vy = Math.sin(pushAngle) * pushForce;
          target.x += target.vx;
          target.y += target.vy;

        } else {
          // Final Hit: GRAND FINISHER CLEAVE! Extend Sword of Extermination and deliver massive impact launch!
          this.bladeRetractProgress = 1.0; // Extend sword for finisher!
          const finisherDamage = CONFIG.mahoraga?.blitzFinisherDamage || 35;
          target.takeDamage(finisherDamage, this, { isMelee: true, isSkill: true });

          this.punchAnimTimer = 18;
          this.swordCombo = (this.swordCombo || 0) + 1;

          // Anime Finisher Burst Effects!
          spawnImpactFlash(target.x, target.y, 90, '#FFD700');
          spawnMeleeClashShockwave(target.x, target.y, 180, 'mahoraga');
          spawnSparks(target.x, target.y, 40, 'gold', '#FFFFFF');
          triggerGlobalScreenShake(14, 25);
          spawnFloatingText(target.x, target.y - target.r - 35, 'FINISHER CLEAVE!!', '#FF3300');
          playSound('Assets/Sound Effects/Attacks/groundSmash.mp3', 1.0);
          playSound('Assets/Sound Effects/Attacks/explosion.mp3', 0.9);

          // Unfreeze target & apply massive zero-delay knockback launch!
          target.timeStopTimer = 0;
          target.mahoragaAdaptationFreezeTimer = 0;
          target.hitStunTimer = 0;

          const kbAngle = this.gunAngle;
          const kbForce = CONFIG.mahoraga?.blitzFinisherKnockback || 35.0;
          target.vx = Math.cos(kbAngle) * kbForce;
          target.vy = Math.sin(kbAngle) * kbForce;
          if (typeof target.applyKnockback === 'function') target.applyKnockback(target.vx, target.vy);
          target.x += target.vx;
          target.y += target.vy;

          // Epic Finisher visual & sound effects
          spawnImpactFlash(target.x, target.y, 50, '#FFD700');
          spawnSparks(target.x, target.y, 30, 'gold', '#FFFFFF');
          spawnMeleeClashShockwave(target.x, target.y, 120, 'gold');
          triggerGlobalScreenShake(12, 22);
          playSound('Assets/Sound Effects/Attacks/explosion.mp3', 1.0);
          playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 1.0);
          spawnFloatingText(target.x, target.y - 30, 'FINISHER CLEAVE!', '#FFD700');

          this.isBlitzActive = false;
          this.blitzHitsLeft = 0;
        }
      }
      return; // Hold movement during Hand-to-Hand Blitz Sequence!
    }

    // Active Cleave Skill (Sword of Extermination AoE)
    if (this.isCleaving) {
      this.cleaveWindupTimer++;
      this.vx = 0;
      this.vy = 0;
      this.applyMovementPhysics(0);

      const maxWindup = CONFIG.mahoraga?.cleaveWindupFrames || 30;

      if (this.cleaveWindupTimer >= maxWindup) {
        this._executeCleave(opponent);
        this.isCleaving = false;
        this.cleaveWindupTimer = 0;
        this.cleaveCooldown = CONFIG.mahoraga?.cleaveCooldown || 600;
      }
      return; 
    }

    this.applyMovementPhysics();
    if (this.punchAnimTimer > 0 || this.leftPunchTimer > 0) {
      this.vx = 0;
      this.vy = 0;
    }

    if (opponent && !opponent.isDead) {
      this.aim(opponent);
      const distToOpponent = Math.hypot(this.x - opponent.x, this.y - opponent.y);
      const swordRange = CONFIG.mahoraga?.swordRange || 60;
      const meleeDist = this.r + opponent.r + swordRange;

      // Detect if opponent is currently channeling/casting a skill
      const isEnemyChanneling = (
        opponent.isChanneling ||
        opponent.isWindingUp ||
        (opponent.domainChargeTimer && opponent.domainChargeTimer > 0) ||
        (opponent.purpleChargeTimer && opponent.purpleChargeTimer > 0) ||
        (opponent.divineFlameChargeTimer && opponent.divineFlameChargeTimer > 0) ||
        (opponent.ultimateChargeTimer && opponent.ultimateChargeTimer > 0) ||
        opponent.isCharging ||
        opponent.isChargingSkill ||
        opponent.isChannelingDomainExpansion ||
        opponent.isChannelingDivineFlame
      );

      const enableTeleport = CONFIG.mahoraga?.enableCloseQuartersTeleport ?? true;
      const isStanceOnCooldown = (this.neutralStanceCooldownTimer || 0) > 0;

      // IF ENEMY IS CHANNELING A SKILL FAR AWAY AND STANCE IS NOT ON COOLDOWN -> TELEPORT INSTANTLY ONCE RIGHT TO THEM!
      if (enableTeleport && !isStanceOnCooldown && isEnemyChanneling && distToOpponent > meleeDist + 15 && (this.channelingPunishTeleportTimer || 0) <= 0) {
        this.channelingPunishTeleportTimer = 60; // 1-time teleport trigger guard
        const oldX = this.x;
        const oldY = this.y;

        const approachAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        const offsetDist = this.r + opponent.r + 15;
        let teleX = opponent.x - Math.cos(approachAngle) * offsetDist;
        let teleY = opponent.y - Math.sin(approachAngle) * offsetDist;

        // Clamp inside arena boundaries
        const activeArena = arena || CONFIG.arena;
        if (activeArena) {
          teleX = Math.max(activeArena.x + this.r + 5, Math.min(activeArena.x + activeArena.width - this.r - 5, teleX));
          teleY = Math.max(activeArena.y + this.r + 5, Math.min(activeArena.y + activeArena.height - this.r - 5, teleY));
        }

        this.x = teleX;
        this.y = teleY;
        this.aim(opponent);
        this.vx = 0;
        this.vy = 0;

        this._spawnTeleportAfterimages(oldX, oldY, teleX, teleY, this.gunAngle);
        spawnFloatingText(this.x, this.y - this.r - 20, 'PUNISH!', '#FF4500');
        playSound('Assets/Sound Effects/Skills/dash3.mp3', 0.9);
        spawnImpactFlash(this.x, this.y, 30, '#FF4500');
      }

      // Neutral Combat: Sword of Extermination chops & Left off-hand punches
      if (this.swordCooldown <= 0 && distToOpponent <= meleeDist) {
        this._performMeleeAttack(opponent);
      }
    }
    if (arena) this.resolveWallBounce(arena);
  }

  triggerDemoAttack() {
    this.attackCount = (this.attackCount || 0) + 1;
    if (this.attackCount % 2 === 0) {
      this.leftPunchTimer = 20;
    } else {
      this.swordCombo = (this.swordCombo || 0) + 1;
      this.punchAnimTimer = 20;
    }
    this.isCleaving = true;
    this.cleaveWindupTimer = 0;
    this.wheelClickTimer = 20;
    this.wheelGlowTimer = 60;
    this.wheelTargetRotation = (this.wheelTargetRotation || 0) + (Math.PI / 4);

    playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 1.0);
    playSound('Assets/Sound Effects/Skills/dash3.mp3', 0.8);
    playSound('Assets/Sound Effects/Attacks/fleshhit.mp3', 0.8);
  }

  _spawnTeleportAfterimages(oldX, oldY, newX, newY, customAngle = null) {
    if (!this.adaptationAfterimages) this.adaptationAfterimages = [];
    const dist = Math.hypot(newX - oldX, newY - oldY);
    const steps = Math.max(3, Math.floor(dist / 14));
    const lifetime = CONFIG.mahoraga?.afterimageLifetimeFrames || 14;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const stepX = oldX + (newX - oldX) * t;
      const stepY = oldY + (newY - oldY) * t;

      pushTrailCap(this.adaptationAfterimages, {
        x: stepX,
        y: stepY,
        fromX: i > 0 ? oldX + (newX - oldX) * ((i - 1) / steps) : oldX,
        fromY: i > 0 ? oldY + (newY - oldY) * ((i - 1) / steps) : oldY,
        toX: stepX,
        toY: stepY,
        gunAngle: customAngle !== null ? customAngle : (this.gunAngle || 0),
        timer: lifetime - Math.floor(t * 4),
        maxTimer: lifetime
      }, 40);
    }
  }

  _performMeleeAttack(opponent) {
    this.vx = 0;
    this.vy = 0;

    const attackInterval = CONFIG.mahoraga?.neutralAttackInterval || 20;
    const attacksPerTeleport = CONFIG.mahoraga?.neutralAttacksPerTeleport || 2;
    const teleportDelay = CONFIG.mahoraga?.neutralTeleportDelay || 12;
    const teleportDist = CONFIG.mahoraga?.neutralTeleportDistance || 55;

    // Track stance duration window and cooldown
    const isStanceOnCooldown = (this.neutralStanceCooldownTimer || 0) > 0;
    const maxStanceDuration = CONFIG.mahoraga?.neutralStanceDurationFrames || 200;

    if (!isStanceOnCooldown && (this.neutralStanceTimer === undefined || this.neutralStanceTimer <= 0)) {
      this.neutralStanceTimer = maxStanceDuration;
    }

    // WHILE STANCE IS ON COOLDOWN -> ZERO OUT ATTACK SEQUENCE COUNTER TO STOP ALL TELEPORTATION!
    if (isStanceOnCooldown) {
      this.neutralAttacksInSequence = 0;
    }

    // Active rapid stance vs Normal basic attack pacing
    const isStanceActive = !isStanceOnCooldown && (this.neutralStanceTimer || 0) > 0;
    const normalCooldown = CONFIG.mahoraga?.swordCooldown || 60;
    const rapidInterval = CONFIG.mahoraga?.neutralAttackInterval || 20;

    // Use rapid attack interval ONLY while stance is active; fallback to normal basic cooldown when stance ends / on cooldown!
    this.swordCooldown = isStanceActive ? rapidInterval : normalCooldown;
    this.attackCount = (this.attackCount || 0) + 1;
    this.neutralAttacksInSequence = (this.neutralAttacksInSequence || 0) + 1;

    const damage = CONFIG.mahoraga?.swordDamage || 25;
    const currentDist = Math.hypot(this.x - opponent.x, this.y - opponent.y);
    const maxHitRange = this.r + opponent.r + (CONFIG.mahoraga?.swordRange || 20);

    // Only apply hit & damage if opponent is strictly within actual swordRange!
    if (currentDist > maxHitRange) {
      return;
    }

    if (this.attackCount % 2 === 0) {
      this.leftPunchTimer = 18;

      playSound('Assets/Sound Effects/Attacks/punch.mp3', 1.0);
      playSound('Assets/Sound Effects/Skills/dash3.mp3', 0.7);

      opponent.takeDamage(damage, this, { isMelee: true });
      opponent.applyHitStun(14);

      spawnImpactFlash(opponent.x, opponent.y, 28, 'gold');
      spawnSparks(opponent.x, opponent.y, 18, 'gold', '#FFFFFF');
      triggerGlobalScreenShake(6, 12);

      const angle = this.gunAngle !== undefined ? this.gunAngle : Math.atan2(opponent.y - this.y, opponent.x - this.x);
      opponent.vx += Math.cos(angle) * 15.0;
      opponent.vy += Math.sin(angle) * 15.0;

    } else {
      this.swordCombo = (this.swordCombo || 0) + 1;
      const comboIndex = this.swordCombo % 3;
      
      playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 0.6);
      playSound('Assets/Sound Effects/Attacks/fleshhit.mp3', 0.8);
      
      opponent.takeDamage(damage, this, { isMelee: true });
      
      this.punchAnimTimer = 18;
      spawnImpactFlash(opponent.x, opponent.y, 25, 'silver');
      spawnSparks(opponent.x, opponent.y, 15, 'gold', '#F5F5DC');
      triggerGlobalScreenShake(8, 15);
      
      const baseAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      let knockbackAngle = baseAngle;
      let knockbackForce = 12.0;

      if (comboIndex === 0) {
        knockbackAngle = this.gunAngle !== undefined ? this.gunAngle : baseAngle;
        knockbackForce = 16.0;
        opponent.applyHitStun(12);
      } else if (comboIndex === 1) {
        knockbackAngle = baseAngle + Math.PI * 0.25;
        knockbackForce = 12.5;
        opponent.applyHitStun(10);
      } else {
        knockbackAngle = baseAngle - Math.PI * 0.15;
        knockbackForce = 14.0;
        opponent.applyHitStun(16);
      }

      opponent.vx += Math.cos(knockbackAngle) * knockbackForce;
      opponent.vy += Math.sin(knockbackAngle) * knockbackForce;
    }

    // Detect if opponent is currently channeling/casting a skill
    const isEnemyChanneling = opponent && (
      opponent.isChanneling ||
      opponent.isWindingUp ||
      (opponent.domainChargeTimer && opponent.domainChargeTimer > 0) ||
      (opponent.purpleChargeTimer && opponent.purpleChargeTimer > 0) ||
      (opponent.divineFlameChargeTimer && opponent.divineFlameChargeTimer > 0) ||
      (opponent.ultimateChargeTimer && opponent.ultimateChargeTimer > 0) ||
      opponent.isCharging ||
      opponent.isChargingSkill ||
      opponent.isChannelingDomainExpansion ||
      opponent.isChannelingDivineFlame
    );

    // If opponent is channeling a skill, PUNISH THEM! Skip unnecessary teleports & continue close-range melee assault!
    if (isEnemyChanneling) {
      this.neutralAttacksInSequence = 0;
    }

    // --- NEUTRAL ATTACK-TELEPORT SEQUENCE (e.g. 2 Attacks -> Teleport -> 2 Attacks -> Teleport) ---
    // Only execute teleport sequence while stance is active and NOT on cooldown!
    const enableTeleport = CONFIG.mahoraga?.enableCloseQuartersTeleport ?? true;
    if (enableTeleport && !isStanceOnCooldown && (this.neutralStanceTimer || 0) > 0 && this.neutralAttacksInSequence >= attacksPerTeleport) {
      this.neutralAttacksInSequence = 0;

      const oldX = this.x;
      const oldY = this.y;

      // Teleport to a random flank or behind position relative to opponent
      const flankAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x) + (Math.random() - 0.5) * Math.PI * 1.2;
      const targetDist = opponent.r + this.r + teleportDist;

      let targetX = opponent.x + Math.cos(flankAngle) * targetDist;
      let targetY = opponent.y + Math.sin(flankAngle) * targetDist;

      // Clamp position inside arena boundaries
      const arena = CONFIG.arena;
      if (arena) {
        targetX = Math.max(arena.x + this.r + 5, Math.min(arena.x + arena.width - this.r - 5, targetX));
        targetY = Math.max(arena.y + this.r + 5, Math.min(arena.y + arena.height - this.r - 5, targetY));
      }

      this.x = targetX;
      this.y = targetY;

      // MANDATORY RULE 3: Instantly align aim angle to target from new position!
      this.aim(opponent);
      this.vx = 0;
      this.vy = 0;

      // Spawn transparent speed afterimages along teleport line
      this._spawnTeleportAfterimages(oldX, oldY, this.x, this.y, this.gunAngle);

      playSound('Assets/Sound Effects/Skills/dash3.mp3', 0.8);
      spawnImpactFlash(this.x, this.y, 25, 'silver');

      // Post-teleport cooldown delay before starting next attack sequence
      this.swordCooldown = teleportDelay;
    }
  }

  _executeCleave(opponent) {
    triggerGlobalScreenShake(8, 15);
    playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 1.0);
    playSound('Assets/Sound Effects/Attacks/explosion.mp3', 0.6);

    const cleaveRadius = CONFIG.mahoraga?.cleaveRadius || 150;
    const damage = CONFIG.mahoraga?.cleaveDamage || 40;

    spawnImpactFlash(this.x, this.y, cleaveRadius, 'silver');
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      spawnSparks(this.x + Math.cos(angle) * cleaveRadius * 0.5, this.y + Math.sin(angle) * cleaveRadius * 0.5, 5, 'gold', '#F5F5DC');
    }

    if (opponent && !opponent.isDead) {
      const dist = Math.hypot(this.x - opponent.x, this.y - opponent.y);
      if (dist <= cleaveRadius) {
        opponent.takeDamage(damage, this, { isMelee: true });
        opponent.applyHitStun(20);
        const pushAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        opponent.vx += Math.cos(pushAngle) * 20;
        opponent.vy += Math.sin(pushAngle) * 20;
      }
    }
  }

  // ─── Cursed Energy Throw (Ranged Projectile Attack) ───
  shoot(ownerIndex) {
    if (!projectileSystem) return;

    const throwDamage = CONFIG.mahoraga?.throwDamage || 14;
    const throwSpeed = CONFIG.mahoraga?.throwSpeed || 25;

    // Throw spread angle: add slight randomized fan spread so thrown rocks scatter dynamically!
    const spreadAngle = (Math.random() - 0.5) * (CONFIG.mahoraga?.throwSpreadAngle || 0.28);
    const customAngle = (this.gunAngle !== undefined ? this.gunAngle : 0) + spreadAngle;

    // Anime Shibuya Throw Barrage: Randomly hurl dark cursed-energy basalt monoliths, cracked asphalt fragments, and burning rubble chunks!
    const throwVisuals = ['mahoragaBasaltMonolith', 'mahoragaRuinConcrete', 'mahoragaLavaRubble'];
    const visual = throwVisuals[Math.floor(Math.random() * throwVisuals.length)];

    projectileSystem.fireProjectile(
      this,
      ownerIndex,
      throwDamage,
      false,
      throwSpeed,
      false,
      visual,
      undefined,
      undefined,
      customAngle
    );

    playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 0.6);
  }

  // ─── Divine Shout (AoE Shockwave Roar) ───
  _executeShout(opponent, ownerIndex) {
    const shoutRadius = CONFIG.mahoraga?.shoutRadius || 180;
    const shoutDamage = CONFIG.mahoraga?.shoutDamage || 30;
    const shoutKnockback = CONFIG.mahoraga?.shoutKnockback || 18;

    triggerGlobalScreenShake(10, 20);
    playSound('Assets/Sound Effects/Attacks/explosion.mp3', 0.8);
    playSound('Assets/Sound Effects/Skills/dash3.mp3', 0.9);

    // Expanding shockwave ring visual
    spawnMeleeClashShockwave(this.x, this.y, shoutRadius, 'silver');
    spawnImpactFlash(this.x, this.y, shoutRadius * 0.7, '#E0E0E0');

    // Radial spark burst
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const dist = shoutRadius * 0.4;
      spawnSparks(
        this.x + Math.cos(angle) * dist,
        this.y + Math.sin(angle) * dist,
        4, 'silver', '#FFFFFF'
      );
    }

    spawnFloatingText(this.x, this.y - this.r - 25, 'DIVINE SHOUT!', '#E0E8FF');

    // Damage all enemies within shout radius
    if (state.fighters) {
      const myIndex = state.fighters.indexOf(this);
      const myTeam = state.getFighterTeam(myIndex);

      state.fighters.forEach((f, idx) => {
        if (!f || f === this || f.hp <= 0) return;
        const enemyTeam = state.getFighterTeam(idx);
        if (myTeam !== null && enemyTeam === myTeam) return; // Skip teammates

        const dist = Math.hypot(this.x - f.x, this.y - f.y);
        if (dist <= shoutRadius) {
          f.takeDamage(shoutDamage, this, { isSkill: true });
          f.applyHitStun(18);

          // Knockback away from Mahoraga
          const pushAngle = Math.atan2(f.y - this.y, f.x - this.x);
          f.vx += Math.cos(pushAngle) * shoutKnockback;
          f.vy += Math.sin(pushAngle) * shoutKnockback;
        }
      });
    }
  }

  drawGun(ctx) {
    if (this.isTargetOfAmbush) return;
    drawMahoragaSword(ctx, this.x, this.y, this.gunAngle, this.r, this.punchAnimTimer, this.isCleaving, this.color, this.swordCombo || 0, this.isThrowing, this.bladeRetractProgress);
  }

  draw(ctx, opponent) {
    // 0. Render fading divine flash-dash afterimage ghosts along motion trail (Matches Gojo & Sukuna visual system)
    if (this.adaptationAfterimages && this.adaptationAfterimages.length > 0) {
      fastCleanArray(this.adaptationAfterimages, (img) => {
        if (!img || img.timer <= 0) return false;
        
        const maxT = img.maxTimer || 28;
        const progress = Math.max(0, Math.min(1, img.timer / maxT));
        const baseOpacity = (typeof CONFIG !== 'undefined' && CONFIG.mahoraga) ? (CONFIG.mahoraga.afterimageOpacity ?? 0.50) : 0.50;
        const alpha = Math.pow(progress, 0.7) * baseOpacity;

        // 1. Dash Trajectory Motion Beam Line (With Dark Shadow for White Arena Contrast!)
        if (img.fromX !== undefined && img.toX !== undefined) {
          ctx.save();
          // Dark Shadow Beam Underlayer (Ensures visibility on white arena background!)
          ctx.globalAlpha = alpha * 0.5;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.lineWidth = 5.0;
          ctx.beginPath();
          ctx.moveTo(img.fromX, img.fromY);
          ctx.lineTo(img.toX, img.toY);
          ctx.stroke();

          // Silver & White Blazing Core Beams
          ctx.strokeStyle = '#64748B'; // Charcoal slate accent
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(img.fromX, img.fromY);
          ctx.lineTo(img.toX, img.toY);
          ctx.stroke();

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(img.fromX, img.fromY);
          ctx.lineTo(img.toX, img.toY);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.translate(img.x, img.y);
        ctx.rotate(img.gunAngle || 0);

        // 2. DARK GROUND DROP SHADOW (Paints dark shadow ellipse beneath phantom feet!)
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, this.r * 0.75, this.r * 1.2, this.r * 0.45, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.4})`;
        ctx.fill();
        ctx.restore();

        // 3. Divine Aura Energy Glow Circles
        ctx.beginPath();
        ctx.arc(0, 0, this.r * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(30, 41, 59, ${alpha * 0.25})`; // Soft dark slate contrast glow
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, this.r * 1.0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224, 232, 255, ${alpha * 0.45})`;
        ctx.fill();

        // 4. HIGH-CONTRAST BODY SILHOUETTE (Dark Charcoal Underlayer + Crisp White Stroke)
        ctx.beginPath();
        ctx.arc(0, 0, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(15, 23, 42, ${alpha * 0.50})`; // Soft translucent navy-charcoal phantom body
        ctx.fill();

        // Outer Dark Shadow Stroke
        ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.55})`;
        ctx.lineWidth = 3.2;
        ctx.stroke();

        // Inner White Stroke
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.70})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 5. 3D WHEEL SILHOUETTE (Dark Shadow Outline + White Ring Highlight)
        ctx.beginPath();
        ctx.ellipse(0, -this.r - 20, 16, 6, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.55})`;
        ctx.lineWidth = 2.8;
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.75})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.restore();

        img.timer--;
        return img.timer > 0;
      });
    }

    // 0b. Dark Screen Dim Overlay (Drawn BEFORE Mahoraga's body so Mahoraga stays 100% bright, crisp & undimmed!)
    if (this.adaptationPauseTimer > 0) {
      ctx.save();
      const canvas = ctx.canvas;
      if (canvas) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.restore();
    }

    // 1. Draw base fighter body & wrist blade (Paints Mahoraga bright & clear ON TOP of screen dim!)
    super.draw(ctx, opponent);

    // 2. Draw Eye-Socket Face Wings ON TOP OF BODY (Chaotic bony wings sprouting from eye sockets!)
    drawMahoragaFaceWings(ctx, this);

    // 3. Draw Left Off-Hand Punch ON TOP OF BODY (Visible ONLY when punching with massive floating extension!)
    if (this.leftPunchTimer > 0) {
      drawMahoragaLeftPunch(ctx, this);
    }

    // 3. Draw Shinto Ritual Chest Necklace & Amulet
    drawMahoragaChestNecklace(ctx, this);

    // 4. Draw 3D Wheel of Adaptation & Surrounding Golden Ring Highlight
    drawMahoraga3DWheel(ctx, this);

    // 5. Draw Cleave Windup Visual
    if (this.isCleaving) {
      const maxWindup = CONFIG.mahoraga?.cleaveWindupFrames || 30;
      const progress = this.cleaveWindupTimer / maxWindup;
      const radius = (CONFIG.mahoraga?.cleaveRadius || 150) * progress;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(218, 165, 32, ${1 - progress})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // 6. Draw Neutral Close-Quarters Attack-Teleport Stance & Cooldown Ring Timer HUD
    if (this.neutralStanceTimer > 0) {
      const maxT = CONFIG.mahoraga?.neutralStanceDurationFrames || 180;
      const progress = Math.max(0, Math.min(1, this.neutralStanceTimer / maxT));
      const ringRadius = this.r + 15;

      ctx.save();
      ctx.translate(this.x, this.y);

      // Dark background ring track
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = 4.5;
      ctx.stroke();

      // Active glowing golden stance ring arc (depletes clockwise)
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + progress * Math.PI * 2;

      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, startAngle, endAngle);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.95)';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // White inner core line
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, startAngle, endAngle);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Glowing tip indicator orb
      const tipX = Math.cos(endAngle) * ringRadius;
      const tipY = Math.sin(endAngle) * ringRadius;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    } else if (this.neutralStanceCooldownTimer > 0) {
      const maxCd = CONFIG.mahoraga?.neutralStanceCooldownFrames || 250;
      const progress = Math.max(0, Math.min(1, 1.0 - (this.neutralStanceCooldownTimer / maxCd)));
      const ringRadius = this.r + 15;

      ctx.save();
      ctx.translate(this.x, this.y);

      // Cooldown background track
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Recharging crimson cooldown ring arc (fills clockwise)
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + progress * Math.PI * 2;

      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, startAngle, endAngle);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.80)';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.restore();
    }

    // Always draw Health Text on TOP of body additions, wings, necklace, and wheel!
    this.drawHealth(ctx);
  }
}
