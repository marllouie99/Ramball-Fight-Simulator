import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { playSound } from '../../systems/soundSystem.js';
import { spawnSparks, spawnImpactFlash, spawnCrimsonLightningImpact, spawnMeleeClashShockwave } from '../../graphics/particles/sparkEffect.js';
import { drawInvertedSpear, drawSplitSoulKatana, drawPhysicsChain, drawRestedKatanaOverShoulder, drawRestedInvertedSpearAtHip } from '../../graphics/weaponVisuals.js';

/**
 * Toji Fushiguro - The Sorcerer Killer
 */
export class TojiFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'toji';
    this.type = 'toji';
    
    // Heavenly Restriction Stealth Passive (Configurable Duration & Cooldown)
    this.stealthMaxDuration = CONFIG.toji?.stealthDuration || 240;
    this.stealthMaxCooldown = CONFIG.toji?.stealthCooldown || 420;
    this.stealthTimer = this.stealthMaxDuration;
    this.stealthCooldown = 0;
    this.isStealthed = true;
    this.stealthActive = true;
    this.stealthAfterimages = [];

    // Ambush Sequence State
    this.isAmbushing = false;
    this.ambushPhase = null;
    this.ambushTimer = 0;

    // Inverted Spear of Heaven (Basic Attack)
    this.spearCooldown = 0;
    this.spearCooldownMax = CONFIG.toji?.spearCooldown || 40;
    this.spearRange = CONFIG.toji?.spearRange || 50;
    this.spearDamage = CONFIG.toji?.spearDamage || 12;
    this.spearSwingTimer = 0;

    // Split Soul Katana
    // Physics Chain simulation
    this.chainNodes = [];
    this._initChainPhysics();
  }

  _initChainPhysics() {
    this.chainNodes = [];
    const baseAngle = (this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0)) + 0.42;
    const ringX = (this.x || 0) + Math.cos(baseAngle) * ((this.r || 25) - 4);
    const ringY = (this.y || 0) + Math.sin(baseAngle) * ((this.r || 25) - 4);

    for (let i = 0; i < 9; i++) {
      this.chainNodes.push({
        x: ringX - i * 4,
        y: ringY + i * 5,
        vx: 0,
        vy: 0
      });
    }
  }

  reset() {
    super.reset();
    this.stealthMaxDuration = CONFIG.toji?.stealthDuration || 240;
    this.stealthMaxCooldown = CONFIG.toji?.stealthCooldown || 420;
    this.stealthTimer = this.stealthMaxDuration;
    this.stealthCooldown = 0;
    this.isStealthed = true;
    this.stealthActive = true;
    this.stealthAfterimages = [];
    this.isAmbushing = false;
    this.ambushPhase = null;
    this.ambushTimer = 0;
    this.spearCooldown = 0;
    this.spearSwingTimer = 0;
    this.katanaActiveTimer = 0;
    this.katanaCooldownTimer = 0;
    this._initChainPhysics();
  }

  /**
   * Overrides takeDamage to implement Inverted Spear Melee Parry & Ambush Counter-Attack.
   */
  takeDamage(amount, attacker, opts = {}) {
    if (this.isDead || this.hp <= 0) return false;

    // Check if an enemy Domain Expansion is currently active in the arena
    const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
    const isEnemyDomainActive = state.fighters && state.fighters.some((f, idx) => {
      if (!f || f === this || f.hp <= 0 || !f.domainActive) return false;
      const enemyTeam = state.getFighterTeam(idx);
      return myTeam === null || enemyTeam === null || myTeam !== enemyTeam;
    });

    // Inverted Spear Parry & Counter-Attack (active inside enemy domains against strikes/projectiles, not domain slash ticks!)
    const parryChance = CONFIG.toji?.parryChance || 0.45;
    const canParry = isEnemyDomainActive && !opts.isDomain && (opts.isMelee || opts.isPhysical || !opts.isTrueDamage);

    if (canParry && Math.random() < parryChance) {
      this.blockPoseTimer = 25; // 25-frame parry deflection pose
      this.parryType = Math.random() < 0.25 ? 'guard' : 'deflect';

      spawnMeleeClashShockwave(this.x, this.y, 90, 'yuta');

      // Spawn Yuta-style parry sparks & dark impact flash distributed along the blade
      const baseAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
      const bladeAngle = baseAngle + Math.PI / 2;
      const hiltX = this.x + Math.cos(baseAngle) * (this.r - 14);
      const hiltY = this.y + Math.sin(baseAngle) * (this.r - 14);

      for (let i = 0; i < 10; i++) {
        const offset = 15 + Math.random() * 45;
        spawnSparks(hiltX + Math.cos(bladeAngle) * offset, hiltY + Math.sin(bladeAngle) * offset, 1, 'silver', 'rgba(255, 30, 75, 1)');
      }
      spawnImpactFlash(hiltX + Math.cos(bladeAngle) * 35, hiltY + Math.sin(bladeAngle) * 35, 55, 'dark');

      playSound('Assets/Sound Effects/Skills/parry.mp3', 0.85);

      // Instantly trigger 3-Stage Ambush Counter-Attack if not currently ambushing
      if (!this.isAmbushing && attacker && attacker.hp > 0) {
        this.startAmbushSequence(attacker);
      }

      return false; // Damage parried & negated!
    }

    return super.takeDamage(amount, attacker, opts);
  }

  /**
   * Main update loop for Toji's mechanics.
   */
  update(opponent, ownerIndex, arena) {
    // 1. Handle base cooldowns and debuffs
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    if (this._handleTimeStop()) {
      return;
    }

    // Tick timers
    if (this.spearCooldown > 0) this.spearCooldown--;
    if (this.spearSwingTimer > 0) this.spearSwingTimer--;
    if (this.phantomSlashTimer > 0) this.phantomSlashTimer--;

    // Handle active ambush sequence
    if (this.isAmbushing) {
      this.updateAmbushSequence(opponent, ownerIndex);
      return;
    }

    // --- HEAVENLY RESTRICTION SENSE: 30% CHANCE TO FORCE SEQUENCE 1 AMBUSH WHEN ENEMY CHANNELS A SKILL ---
    if (this._channelInterruptCooldown > 0) this._channelInterruptCooldown--;

    if (!this.isAmbushing && opponent && !opponent.isDead) {
      const isTargetChanneling = !!(
        opponent.isChannelingPurple ||
        opponent.isChannelingDomainExpansion ||
        opponent.isChannelingDomain ||
        opponent.isChannelingRCT ||
        opponent.isChannelingDivineFlame ||
        opponent.isChannelingStorm ||
        (opponent.isChanneling === true)
      );

      if (isTargetChanneling) {
        const detectionRadius = CONFIG.toji?.channelDetectionRadius || 450;
        const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);

        // 1. Initial Detection & Dice Roll
        if (dist <= detectionRadius && !this._hasAttemptedChannelInterrupt && !(this._channelInterruptCooldown > 0)) {
          this._hasAttemptedChannelInterrupt = true;
          const interruptChance = CONFIG.toji?.channelInterruptChance || 0.30;

          if (Math.random() < interruptChance) {
            // Roll succeeds! Start the reaction timer instead of instantly triggering it!
            this._channelReactionTimer = CONFIG.toji?.channelReactionFrames ?? 15;
          }
        }

        // 2. Reaction Time Countdown
        if (this._channelReactionTimer > 0) {
          this._channelReactionTimer--;
          if (this._channelReactionTimer <= 0) {
            // Trigger visual & audio indicator for Channel Sense Interrupt!
            this.channelSenseIndicatorTimer = 35; // 35-frame indicator animation (~0.6s)
            spawnImpactFlash(this.x, this.y, 65, 'crimsonSniper');
            spawnMeleeClashShockwave(this.x, this.y, 110, 'yuta');
            spawnCrimsonLightningImpact(this.x, this.y, 80);
            playSound('Assets/Sound Effects/Skills/backstab.mp3', 1.0);

            // Set cooldown so it can't trigger again for ~15 seconds (900 frames)
            this._channelInterruptCooldown = CONFIG.toji?.channelInterruptCooldownFrames || 900;

            // Forcefully break current state & launch Sequence 1 Ambush to interrupt!
            this.startAmbushSequence(opponent, true);
            return;
          }
        }
      } else {
        this._hasAttemptedChannelInterrupt = false; // Reset attempt lock when enemy is no longer channeling
        this._channelReactionTimer = 0; // Abort reaction if they finish casting before Toji can react!
      }
    }

    // Handle Stealth Duration & Cooldown Timers
    if (this.stealthTimer > 0) {
      this.stealthTimer--;
      this.isStealthed = true;
      this.stealthActive = true;

      // Spawn motion trail afterimages while moving during stealth
      if (Math.hypot(this.vx || 0, this.vy || 0) > 0.35) {
        if (this.spearSwingTimer <= 0) {
          this.stealthAfterimages.push({
            x: this.x,
            y: this.y,
            angle: this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0),
            alpha: 0.55,
            timer: 12
          });
        }
      }

      if (this.stealthTimer <= 0) {
        this.isStealthed = false;
        this.stealthActive = false;
        this.stealthCooldown = this.stealthMaxCooldown;
      }
    } else if (this.stealthCooldown > 0) {
      const ambushTrigger = CONFIG.toji?.ambushTriggerFrames || 45;

      // Check if stealth cooldown is about to end -> launch ambush move sequence!
      if (!this.isAmbushing && this.stealthCooldown <= ambushTrigger && opponent && opponent.hp > 0) {
        this.startAmbushSequence(opponent);
        return;
      }

      this.stealthCooldown--;
      this.isStealthed = false;
      this.stealthActive = false;

      if (this.stealthCooldown <= 0) {
        this.stealthTimer = this.stealthMaxDuration;
        this.isStealthed = true;
        this.stealthActive = true;
        spawnImpactFlash(this.x, this.y, 25, '#A040FF');
      }
    }

    // Update motion trail afterimages & katana slash fade timer
    if (this.katanaSlashFadeTimer > 0) this.katanaSlashFadeTimer--;
    if (this.stealthAfterimages && this.stealthAfterimages.length > 0) {
      for (let i = this.stealthAfterimages.length - 1; i >= 0; i--) {
        const img = this.stealthAfterimages[i];
        img.timer--;
        img.alpha = (img.timer / 12) * 0.55;
        if (img.timer <= 0) {
          this.stealthAfterimages.splice(i, 1);
        }
      }
    }

    // Basic movement and aim logic
    this.x += this.vx;
    this.y += this.vy;
    
    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);

    // Inverted Spear of Heaven Melee Strike Logic
    if (opponent && opponent.hp > 0) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const dist = Math.hypot(dx, dy);
      const attackReach = this.r + opponent.r + this.spearRange;

      if (dist <= attackReach && this.spearCooldown <= 0) {
        this.performInvertedSpearStrike(opponent, ownerIndex);
      }
    }
  }

  /**
   * Simulates smooth hanging gravity physics for the chain attached to the weapon ring.
   */
  _updateChainPhysics() {
    if (!this.chainNodes || this.chainNodes.length === 0) {
      this._initChainPhysics();
    }

    const baseAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
    const isAttacking = this.spearSwingTimer > 0;

    let offsetAngle = 0.42;
    let thrustDistance = 0;

    if (isAttacking) {
      const t = 1 - (this.spearSwingTimer / 15);
      if (t < 0.25) {
        const p = t / 0.25;
        thrustDistance = -6 * p;
        offsetAngle = 0.42 + 0.15 * p;
      } else if (t < 0.65) {
        const p = (t - 0.25) / 0.4;
        thrustDistance = -6 + 32 * Math.sin(p * Math.PI);
        offsetAngle = 0.57 - 0.9 * Math.sin(p * Math.PI * 0.5);
      } else {
        const p = (t - 0.65) / 0.35;
        thrustDistance = 6 * (1 - p);
        offsetAngle = -0.33 + (0.42 - (-0.33)) * p;
      }
    } else {
      offsetAngle += Math.sin(Date.now() / 250) * 0.05;
    }

    const renderAngle = baseAngle + offsetAngle;
    const totalRadius = (this.r - 4 + thrustDistance);
    const ringX = this.x + Math.cos(renderAngle) * totalRadius;
    const ringY = this.y + Math.sin(renderAngle) * totalRadius;
    const linkDist = 4.8;

    // Node 0 anchored directly to gold handle ring
    this.chainNodes[0].x = ringX;
    this.chainNodes[0].y = ringY;

    const isMoving = (Math.hypot(this.vx || 0, this.vy || 0) > 0.15) || isAttacking;

    if (!isMoving) {
      // Smooth natural hanging loop relative to ring when stationary/countdown
      for (let i = 1; i < this.chainNodes.length; i++) {
        const hangAngle = renderAngle + Math.PI * (0.45 + i * 0.12);
        const node = this.chainNodes[i];
        const tx = ringX + Math.cos(hangAngle) * (i * linkDist * 0.75);
        const ty = ringY + Math.sin(hangAngle) * (i * linkDist * 0.75) + (i * 1.2);
        
        node.x += (tx - node.x) * 0.35;
        node.y += (ty - node.y) * 0.35;
        node.vx = 0;
        node.vy = 0;
      }
      return;
    }

    // Dynamic physics update: drag velocity and gravity downward
    for (let i = 1; i < this.chainNodes.length; i++) {
      const node = this.chainNodes[i];
      node.vx = (node.vx + (this.vx * -0.03)) * 0.80;
      node.vy = (node.vy + (this.vy * -0.03)) * 0.80 + 0.4; // Natural gravity hanging downward
      node.x += node.vx;
      node.y += node.vy;
    }

    // Strict distance constraint iterations (prevents stretching gaps under rapid movement)
    for (let iter = 0; iter < 12; iter++) {
      for (let i = 1; i < this.chainNodes.length; i++) {
        const prev = this.chainNodes[i - 1];
        const node = this.chainNodes[i];
        const dx = node.x - prev.x;
        const dy = node.y - prev.y;
        const dist = Math.hypot(dx, dy) || 0.001;

        if (dist !== linkDist) {
          const delta = (dist - linkDist) / dist;
          if (i - 1 === 0) {
            node.x -= dx * delta;
            node.y -= dy * delta;
          } else {
            node.x -= dx * delta * 0.5;
            node.y -= dy * delta * 0.5;
            prev.x += dx * delta * 0.5;
            prev.y += dy * delta * 0.5;
          }
        }
      }
    }
  }

  /**
   * Aim logic: rotates Toji's weapon and body angle toward the opponent.
   */
  aim(opponent) {
    if (opponent && opponent.hp > 0) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const targetAngle = Math.atan2(dy, dx);
      this.gunAngle = targetAngle;
      this.angle = targetAngle;
    } else {
      this.gunAngle = this.angle;
    }
  }

  /**
   * Spawns a multi-afterimage trail along a launch/teleport path with expanding ground shockwaves!
   */
  _spawnTeleportAfterimages(fromX, fromY, toX, toY, startAngle, endAngle) {
    if (!this.stealthAfterimages) this.stealthAfterimages = [];

    // Ground shockwave & impact flashes at departure and arrival points
    spawnMeleeClashShockwave(fromX, fromY, 85, 'yuta');
    spawnImpactFlash(fromX, fromY, 40, '#A040FF');

    spawnMeleeClashShockwave(toX, toY, 115, 'yuta');
    spawnImpactFlash(toX, toY, 50, '#A040FF');
    spawnSparks(toX, toY, 8, 'crimsonSniper');

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = fromX + (toX - fromX) * t;
      const y = fromY + (toY - fromY) * t;
      const angle = startAngle + (endAngle - startAngle) * t;
      const maxTimer = 16 + (steps - i) * 3;

      this.stealthAfterimages.push({
        x: x,
        y: y,
        angle: angle,
        maxTimer: maxTimer,
        timer: maxTimer,
        initialAlpha: 0.75 - t * 0.15
      });
    }
  }

  /** Clamps coordinates strictly inside the arena bounds to prevent teleporting outside arena walls */
  _clampToArena(x, y, r = this.r) {
    const arena = CONFIG.arena;
    if (!arena) return { x, y };
    const margin = r + 6;
    return {
      x: Math.max(arena.x + margin, Math.min(arena.x + arena.width - margin, x)),
      y: Math.max(arena.y + margin, Math.min(arena.y + arena.height - margin, y))
    };
  }

  /**
   * Initiates the 1st Sequence Stealth Ambush Combo.
   * @param {Object} opponent 
   * @param {Boolean} isInterrupt - Whether this ambush was triggered by interrupting a skill
   */
  startAmbushSequence(opponent, isInterrupt = false) {
    if (!opponent || opponent.hp <= 0) return;

    const ownerIndex = state.fighters.indexOf(this);

    this.isAmbushing = true;
    this.ambushPhase = 'FRONT_LAUNCH';
    this.ambushTimer = CONFIG.toji?.ambushFrontPauseDuration || 10;
    this.katanaSlashTimer = 0;
    this.katanaSlashFadeTimer = 0;

    // Lock target's movement & teleport mechanics for the duration of all ambush sequences
    opponent.isTargetOfAmbush = true;
    opponent.vx = 0;
    opponent.vy = 0;

    // Capture target's channeling state at the EXACT instant ambush initiates
    this.ambushTargetWasChanneling = !!(
      opponent.isChannelingPurple ||
      opponent.isChannelingDomainExpansion ||
      opponent.isChannelingDomain ||
      opponent.isChannelingRCT ||
      opponent.isChannelingDivineFlame ||
      opponent.isChannelingStorm ||
      opponent.isChanneling
    );

    const oldX = this.x;
    const oldY = this.y;
    const startAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

    // Determine target facing angle
    const targetAngle = opponent.gunAngle !== undefined ? opponent.gunAngle : (opponent.angle || 0);
    const offsetDist = opponent.r + this.r + 18;

    // Launch/teleport directly in front of target (clamped inside arena bounds)
    const rawFrontX = opponent.x + Math.cos(targetAngle) * offsetDist;
    const rawFrontY = opponent.y + Math.sin(targetAngle) * offsetDist;
    const clampedFront = this._clampToArena(rawFrontX, rawFrontY);

    this.x = clampedFront.x;
    this.y = clampedFront.y;
    this.vx = 0;
    this.vy = 0;

    // Aim directly into enemy's eyes
    this.aim(opponent);

    // Freeze target for a brief moment so the sequence executes smoothly
    const freezeDuration = CONFIG.toji?.ambushTargetFreezeDuration || 60;
    
    // HUGE VISUAL INDICATOR IF THIS WAS AN INTERRUPT!
    if (isInterrupt || this.ambushTargetWasChanneling) {
      spawnFloatingText(opponent.x, opponent.y - opponent.r - 35, 'INTERRUPTED!', '#FF1133', 35);
      spawnMeleeClashShockwave(opponent.x, opponent.y, 130, 'yuta');
      spawnCrimsonLightningImpact(opponent.x, opponent.y, 90);
      spawnImpactFlash(opponent.x, opponent.y, 65, 'crimsonSniper');
    }
    if (typeof opponent.applyTimeStop === 'function') {
      opponent.applyTimeStop(freezeDuration);
    }
    opponent.vx = 0;
    opponent.vy = 0;

    // High-speed multi-afterimage streak along launch path
    this._spawnTeleportAfterimages(oldX, oldY, frontX, frontY, startAngle, this.gunAngle);

    spawnImpactFlash(oldX, oldY, 25, '#A040FF');
    spawnImpactFlash(this.x, this.y, 30, '#A040FF');
    spawnMeleeClashShockwave(this.x, this.y, 90, 'yuta'); // Ground shockwave on front launch landing!
    playSound('Assets/Sound Effects/Skills/backstab.mp3', 0.6);
  }

  /**
   * Handles the timing transitions for the ambush sequence:
   * Front pause -> Teleport to enemy back -> Stab attack & re-enter stealth!
   */
  updateAmbushSequence(opponent, ownerIndex) {
    if (!opponent || opponent.hp <= 0) {
      if (opponent) opponent.isTargetOfAmbush = false;
      this.isAmbushing = false;
      this.ambushPhase = null;
      this.stealthCooldown = 0;
      const angle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(angle) * (this.speed || 3);
      this.vy = Math.sin(angle) * (this.speed || 3);
      this.normalizeSpeed();
      return;
    }

    // Keep opponent locked in ambush target state
    opponent.isTargetOfAmbush = true;

    // Keep motion trail afterimages updating
    if (this.stealthAfterimages && this.stealthAfterimages.length > 0) {
      for (let i = this.stealthAfterimages.length - 1; i >= 0; i--) {
        const img = this.stealthAfterimages[i];
        img.timer--;
        const maxT = img.maxTimer || 12;
        const baseAlpha = img.initialAlpha !== undefined ? img.initialAlpha : 0.55;
        img.alpha = Math.max(0, (img.timer / maxT) * baseAlpha);
        if (img.timer <= 0) {
          this.stealthAfterimages.splice(i, 1);
        }
      }
    }

    if (this.ambushPhase === 'FRONT_LAUNCH') {
      this.vx = 0;
      this.vy = 0;
      this.aim(opponent);
      opponent.vx = 0;
      opponent.vy = 0;

      this.ambushTimer--;
      if (this.ambushTimer <= 0) {
        // Phase 2: Instant flash-step teleport behind enemy & start weapon charge!
        this.ambushPhase = 'BACK_CHARGE';
        this.ambushTimer = CONFIG.toji?.ambushBackChargeDuration || 25;

        const frontX = this.x;
        const frontY = this.y;
        const startAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

        const targetAngle = opponent.gunAngle !== undefined ? opponent.gunAngle : (opponent.angle || 0);
        const offsetDist = opponent.r + this.r + 18;

        // Position directly behind target (clamped inside arena bounds)
        const rawBackX = opponent.x - Math.cos(targetAngle) * offsetDist;
        const rawBackY = opponent.y - Math.sin(targetAngle) * offsetDist;
        const clampedBack = this._clampToArena(rawBackX, rawBackY);

        this.x = clampedBack.x;
        this.y = clampedBack.y;
        this.vx = 0;
        this.vy = 0;

        this.aim(opponent);

        // Teleport streak afterimages from front to back
        this._spawnTeleportAfterimages(frontX, frontY, clampedBack.x, clampedBack.y, startAngle, this.gunAngle);

        spawnImpactFlash(frontX, frontY, 30, '#A040FF');
        spawnImpactFlash(clampedBack.x, clampedBack.y, 35, 'rgba(255, 30, 75, 0.8)');
        spawnMeleeClashShockwave(clampedBack.x, clampedBack.y, 110, 'yuta'); // Ground shockwave on backstab landing!
        playSound('Assets/Sound Effects/Skills/backstab.mp3', 0.8);
      }
    } else if (this.ambushPhase === 'BACK_CHARGE') {
      // Stationary back position aiming at target's spine while charging weapon
      this.vx = 0;
      this.vy = 0;
      this.aim(opponent);

      // Keep target stationary
      opponent.vx = 0;
      opponent.vy = 0;

      // Spawn weapon charging energy particles & micro rumble at the back
      if (Math.random() < 0.75) {
        const baseAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
        const tipX = this.x + Math.cos(baseAngle) * (this.r + 20);
        const tipY = this.y + Math.sin(baseAngle) * (this.r + 20);
        spawnSparks(tipX, tipY, 2, 'crimsonSniper');
        spawnSparks(tipX, tipY, 2, 'crimson');
      }
      if (this.ambushTimer % 4 === 0) {
        triggerGlobalScreenShake(1.5, 3);
      }

      this.ambushTimer--;
      if (this.ambushTimer <= 0) {
        // Phase 3: UNLEASH EXPLOSIVE BACKSTAB THRUST STRIKE!
        this.ambushPhase = 'BACK_STAB';

        // --- HIGH-IMPACT SAKUGA AMBUSH STRIKE VISUAL & AUDIO EFFECTS ---
        // 1. Subtle camera punch (4px rumble for 6 frames)
        triggerGlobalScreenShake(4, 6);

        // 2. Impact flashes & Shockwaves at back impact position
        spawnImpactFlash(this.x, this.y, 110, 'rgba(255, 30, 75, 0.95)');
        spawnMeleeClashShockwave(this.x, this.y, 140, 'yuta');
        spawnCrimsonLightningImpact(this.x, this.y, 80);

        // 3. Dense spark burst & expanding shockwave
        spawnMeleeClashShockwave(this.x, this.y, 160, 'yuta');
        spawnSparks(this.x, this.y, 25, 'crimsonSniper');
        spawnSparks(this.x, this.y, 20, 'crimson');

        // 4. Heavy impact audio stack
        playSound('Assets/Sound Effects/Skills/backstab.mp3', 1.2);
        playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 1.0);
        playSound('Assets/Sound Effects/Attacks/fleshhit.mp3', 1.0);

        // Execute Inverted Spear attack (damage, silence, nullify barrier, massive ambush thrust animation!)
        this.performInvertedSpearStrike(opponent, ownerIndex, true);

        // Stealth reactivates immediately upon completion!
        this.stealthTimer = this.stealthMaxDuration;
        this.stealthCooldown = 0;
        this.isStealthed = true;
        this.stealthActive = true;
      }
    } else if (this.ambushPhase === 'BACK_STAB') {
      // Stay locked at the backstab position while thrusting Inverted Spear into target!
      this.vx = 0;
      this.vy = 0;
      this.aim(opponent);

      // When Inverted Spear thrust completes, smoothly draw Split Soul Katana before chasing!
      if (this.spearSwingTimer <= 0) {
        this.ambushPhase = 'KATANA_DRAW';
        this.ambushTimer = 4; // Lightning-fast 4-frame Katana unsheathe transition (~0.06s)

        playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 0.85);
        spawnImpactFlash(this.x, this.y, 45, '#E2E6EC');
        spawnMeleeClashShockwave(this.x, this.y, 80, 'yuta');
        spawnSparks(this.x, this.y, 16, 'crimsonSniper');
      }
    } else if (this.ambushPhase === 'KATANA_DRAW') {
      // Smoothly hold drawn Katana while tracking the flying target
      this.vx = 0;
      this.vy = 0;
      this.aim(opponent);

      this.ambushTimer--;
      if (this.ambushTimer <= 0) {
        // Flash-step pursuit to catch up with Katana drawn!
        this.ambushPhase = 'KATANA_CHASE';
        this.ambushTimer = 2; // Instantaneous 2-frame pursuit teleport!
      }
    } else if (this.ambushPhase === 'KATANA_CHASE') {
      // Flash-step pursuit to catch up to the target!
      const oldX = this.x;
      const oldY = this.y;
      const oldAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

      this.aim(opponent);
      const targetAngle = this.gunAngle;
      const offsetDist = opponent.r + this.r + 14;

      const rawChaseX = opponent.x - Math.cos(targetAngle) * offsetDist;
      const rawChaseY = opponent.y - Math.sin(targetAngle) * offsetDist;
      const clampedChase = this._clampToArena(rawChaseX, rawChaseY);

      this.x = clampedChase.x;
      this.y = clampedChase.y;
      this.vx = 0;
      this.vy = 0;

      // 2nd Sequence Freeze: Lock target in place for Katana charge pause
      const katanaFreeze = CONFIG.toji?.ambushKatanaFreezeDuration || 40;
      if (typeof opponent.applyTimeStop === 'function') {
        opponent.applyTimeStop(katanaFreeze);
      }
      opponent.vx = 0;
      opponent.vy = 0;

      this._spawnTeleportAfterimages(oldX, oldY, clampedChase.x, clampedChase.y, oldAngle, targetAngle);

      this.ambushTimer--;
      if (this.ambushTimer <= 0) {
        // Transition to KATANA_CHARGE (2nd Sequence Weapon Charging Pause)
        this.ambushPhase = 'KATANA_CHARGE';
        this.ambushTimer = CONFIG.toji?.ambushKatanaChargeDuration || 20;

        playSound('Assets/Sound Effects/Skills/backstab.mp3', 0.8);
        spawnImpactFlash(this.x, this.y, 35, 'rgba(255, 30, 75, 0.8)');
        spawnMeleeClashShockwave(this.x, this.y, 120, 'yuta'); // Ground shockwave on Katana chase landing!
      }
    } else if (this.ambushPhase === 'KATANA_CHARGE') {
      // 2nd Sequence Katana Windup Pause aiming at target
      this.vx = 0;
      this.vy = 0;
      this.aim(opponent);

      // Keep target stationary in 2nd freeze
      opponent.vx = 0;
      opponent.vy = 0;

      // Spawn Katana Cursed Energy Sparks & micro rumble
      if (Math.random() < 0.75) {
        const baseAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
        const tipX = this.x + Math.cos(baseAngle) * (this.r + 28);
        const tipY = this.y + Math.sin(baseAngle) * (this.r + 28);
        spawnSparks(tipX, tipY, 2, 'crimsonSniper');
        spawnSparks(tipX, tipY, 2, 'crimson');
      }
      if (this.ambushTimer % 4 === 0) {
        triggerGlobalScreenShake(1.5, 3);
      }

      this.ambushTimer--;
      if (this.ambushTimer <= 0) {
        // Phase 5: UNLEASH SKILL 2 SPLIT SOUL KATANA EXECUTION SLASH (2nd Hit & 2nd Knockback)!
        this.ambushPhase = 'KATANA_SLASH';
        this.katanaSlashTimer = 22; // 22-frame single crisp Katana swing duration

        this.performSplitSoulKatanaSlash(opponent, ownerIndex);
      }
    } else if (this.ambushPhase === 'KATANA_SLASH') {
      this.vx = 0;
      this.vy = 0;
      // Body angle is strictly locked during the swing (no aim call) for a crisp fixed-stance cut!

      this.katanaSlashTimer--;
      if (this.katanaSlashTimer <= 0) {
        this.katanaSlashTimer = 0;

        // Transition into Phase 3: PHANTOM FLURRY (6 Rapid Afterimage Teleport Strikes!)
        this.ambushPhase = 'PHANTOM_FLURRY';
        this.isAmbushThrust = false; // Reset so crescent slash renders instead of thrust cone!
        this.phantomStrikeCount = 0;
        this.phantomMaxStrikes = CONFIG.toji?.ambushPhantomFlurryStrikes || 6;
        this.phantomStrikeTimer = 3; // First strike in 3 frames
        this.phantomAngles = [
          Math.PI * 0.75,   // 1: Top-left       ╲
          -Math.PI * 0.25,  // 2: Bottom-right      ╲  (1st diagonal slash)
          Math.PI * 0.25,   // 3: Top-right        ╱
          -Math.PI * 0.75,  // 4: Bottom-left     ╱    (2nd diagonal slash → X complete!)
          Math.PI * 0.75,   // 5: Top-left       ╲
          -Math.PI * 0.25,  // 6: Bottom-right      ╲  (repeat 1st diagonal)
        ];

        // Freeze target in place for the full phantom flurry duration
        const totalFlurryFrames = this.phantomMaxStrikes * (CONFIG.toji?.ambushPhantomFlurryFrameRate || 4) + 10;
        if (typeof opponent.applyHitStun === 'function') opponent.applyHitStun(totalFlurryFrames);
        opponent.vx = 0;
        opponent.vy = 0;
      }
    } else if (this.ambushPhase === 'PHANTOM_FLURRY') {
      this.vx = 0;
      this.vy = 0;

      this.phantomStrikeTimer--;
      if (this.phantomStrikeTimer <= 0) {
        this.phantomStrikeCount++;
        const flurryFrameRate = CONFIG.toji?.ambushPhantomFlurryFrameRate || 4;
        this.phantomStrikeTimer = flurryFrameRate; // Configurable attack speed (frames between phantom strikes!)

         const maxStrikes = this.phantomMaxStrikes || 6;
        if (this.phantomStrikeCount <= maxStrikes) {
          const idx = (this.phantomStrikeCount - 1) % this.phantomAngles.length;
          const strikeAngle = this.phantomAngles[idx] + (Math.random() - 0.5) * 0.15;
          const flurryDist = CONFIG.toji?.ambushPhantomFlurryDistance ?? 8;
          const dist = opponent.r + this.r + flurryDist;

          // Store old position for afterimage trail
          const oldX = this.x;
          const oldY = this.y;
          const oldAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

          // Flash-teleport Toji around target at phantom angle (clamped inside arena bounds!)
          const rawPhantomX = opponent.x + Math.cos(strikeAngle) * dist;
          const rawPhantomY = opponent.y + Math.sin(strikeAngle) * dist;
          const clampedPhantom = this._clampToArena(rawPhantomX, rawPhantomY);

          this.x = clampedPhantom.x;
          this.y = clampedPhantom.y;
          this.aim(opponent);

          // Spawn phantom afterimage trail between old and new position
          this._spawnTeleportAfterimages(oldX, oldY, clampedPhantom.x, clampedPhantom.y, oldAngle, this.gunAngle);
          spawnMeleeClashShockwave(clampedPhantom.x, clampedPhantom.y, 100, 'yuta'); // Ground shockwave on phantom strike landing!

          // Apply True Damage & brief hit stun per phantom strike
          const strikeDmg = CONFIG.toji?.ambushPhantomFlurryDamage || 8;
          applyDamageToTarget(opponent, strikeDmg, this, { isMelee: true, isTrueDamage: true });
          if (typeof opponent.applyHitStun === 'function') opponent.applyHitStun(6);

          // Physics hit recoil — zero velocity first, then apply clean directional push
          opponent.vx = 0;
          opponent.vy = 0;
          const hitAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
          const recoilForce = 14 + Math.random() * 4; // Heavy jolt per hit!
          opponent.vx = Math.cos(hitAngle) * recoilForce;
          opponent.vy = Math.sin(hitAngle) * recoilForce;
          if (typeof opponent.applyKnockback === 'function') opponent.applyKnockback(opponent.vx, opponent.vy);

          // Active slash wave timer for this phantom strike
          this.phantomSlashTimer = 12;

          // Sakuga Visual & Audio Effects
          triggerGlobalScreenShake(3, 4); // Subtle micro camera rumble per phantom strike!
          spawnImpactFlash(opponent.x, opponent.y, 90, 'rgba(160, 30, 240, 0.95)');
          spawnMeleeClashShockwave(opponent.x, opponent.y, 140, 'yuta');
          spawnSparks(opponent.x, opponent.y, 18, 'crimsonSniper');
          playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 1.1);
          playSound('Assets/Sound Effects/Attacks/fleshhit.mp3', 1.0);
        } else {
          // Phase 4: Step Back & Stealth Recovery!
          opponent.isTargetOfAmbush = false; // Release target lock when ambush combo ends!
          const escapeAngle = Math.atan2(this.y - opponent.y, this.x - opponent.x) + (Math.random() - 0.5);
          this.vx = Math.cos(escapeAngle) * (this.speed || 3);
          this.vy = Math.sin(escapeAngle) * (this.speed || 3);
          this.normalizeSpeed();

          this.stealthTimer = this.stealthMaxDuration;
          this.stealthCooldown = 0;
          this.isStealthed = true;
          this.stealthActive = true;

          this.isAmbushing = false;
          this.ambushPhase = null;
        }
      }
    }
  }

  /**
   * Completely clears any freeze/time-stop state from the target so physics knockback can propel them.
   */
  _clearTargetFreeze(target) {
    if (!target) return;
    target.timeStopTimer = 0;
    delete target._timeStopOriginalDuration;
    delete target._timeStopStartTime;
    delete target._timeStopFrozenAngle;
    delete target._timeStopFrozenGunAngle;
    delete target._suppressFreezeTimer;
    if (typeof target.frozenTimer === 'number') target.frozenTimer = 0;
    if (typeof target.electricStunTimer === 'number') target.electricStunTimer = 0;
  }

  /**
   * Executes Skill 2: Split Soul Katana Soul Slash.
   * Inflicts True Damage, Soul Wound anti-heal debuff, and a 2nd massive knockback!
   */
  performSplitSoulKatanaSlash(target, ownerIndex) {
    playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 1.2);
    playSound('Assets/Sound Effects/Attacks/fleshhit.mp3', 1.2);

    // Apply Katana Skill 2 True Damage & Soul Wound anti-heal
    const damage = CONFIG.toji?.katanaDamage || 35;
    applyDamageToTarget(target, damage, this, { isMelee: true, isTrueDamage: true });

    const soulWoundDuration = CONFIG.toji?.soulWoundDuration || 180;
    target.soulWoundTimer = soulWoundDuration;

    // Apply Post-Ricochet Movement Slowdown (60% movement slow for 1.5s / 90 frames after ricocheting)
    if (typeof target.applySlow === 'function') {
      target.applySlow(90, 0.40);
    } else {
      target.slowTimer = 90;
      target.slowMultiplier = 0.40;
    }

    // Completely unfreeze target so physics knockback propels them immediately
    this._clearTargetFreeze(target);

    // 2nd WIDE-SWEEPING ARC SLING KNOCKBACK (Finale hit: Silky smooth kinetic ricochet wall-bounce physics!)
    target.isFirstHitKnockback = false; // Enable ricochet bouncing for finale hit!
    const directAngle = Math.atan2(target.y - this.y, target.x - this.x);
    const sweepSlingAngle = directAngle + 1.15;
    const knockbackForce = (CONFIG.toji?.ambushKnockbackForce || 48) * 0.95; // 45px/frame smooth velocity!

    const kbVx = Math.cos(sweepSlingAngle) * knockbackForce;
    const kbVy = Math.sin(sweepSlingAngle) * knockbackForce;
    target.vx = kbVx;
    target.vy = kbVy;
    target.knockbackDecay = 0.90; // Silky smooth kinetic deceleration curve!
    target.applyKnockback(kbVx, kbVy);

    // Sakuga Wide Sweep Visual Effects
    triggerGlobalScreenShake(8, 10);
    spawnImpactFlash(target.x, target.y, 180, 'rgba(255, 30, 75, 0.95)');
    spawnMeleeClashShockwave(target.x, target.y, 240, 'yuta');
    spawnMeleeClashShockwave(target.x, target.y, 180, 'yuta');
    spawnCrimsonLightningImpact(target.x, target.y, 140);
    spawnSparks(target.x, target.y, 50, 'crimsonSniper');
  }

  /**
   * Executes the Inverted Spear of Heaven strike.
   * Nullifies barriers (Infinity/shields) and applies Silence debuff to target.
   */
  performInvertedSpearStrike(target, ownerIndex, isAmbushThrust = false) {
    this.spearCooldown = this.spearCooldownMax;
    this.isAmbushThrust = isAmbushThrust;
    this.spearSwingTimer = isAmbushThrust ? 14 : 14; // Crisp instant thrust animation with zero delay!

    // Play attack sound
    playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 0.85);

    // Barrier Nullification (Inverted Spear forcefully cancels Infinity / Shield blocks)
    let wasInfinityActive = false;
    if (target.characterId === 'gojo' && target.infinityActive) {
      wasInfinityActive = true;
      target.infinityActive = false;
      target.infinityBlockTimer = 0;
      if (isAmbushThrust) {
        spawnSparks(target.x, target.y, 22, 'lightningTrail', '#00E5FF'); // Cyan infinity barrier shatter sparks!
        spawnImpactFlash(target.x, target.y, 60, 'lightningTrail');
      }
    }

    // Apply Damage directly to HP (True Damage / Piercing)
    const thrustDamage = isAmbushThrust ? (CONFIG.toji?.ambushBackThrustDamage ?? 25) : this.spearDamage;
    applyDamageToTarget(target, thrustDamage, this, { isMelee: true, isTrueDamage: true });

    // Restore Infinity state after piercing damage resolves (if applicable)
    if (wasInfinityActive) {
      target.infinityActive = true;
    }

    // Silence Debuff & Skill Interruption (ONLY applied during 1st Sequence Ambush Thrust WHEN target was actively channeling a skill!)
    if (isAmbushThrust) {
      const wasPurple = target.isChannelingPurple;
      const wasDomain = target.isChannelingDomainExpansion || target.isChannelingDomain;
      const wasRCT = target.isChannelingRCT;
      const wasDivineFlame = target.isChannelingDivineFlame;
      const wasStorm = target.isChannelingStorm;
      const wasGeneric = target.isChanneling;

      const wasChanneling = this.ambushTargetWasChanneling || wasPurple || wasDomain || wasRCT || wasDivineFlame || wasStorm || wasGeneric;
      this.ambushTargetWasChanneling = false;

      if (wasChanneling) {
        const silenceFrames = CONFIG.toji?.silenceDuration || 90;
        target.silenceTimer = silenceFrames;

        // Forcefully cancel any active skill or ultimate channeling
        target.isChannelingPurple = false;
        target.purpleChargeTimer = 0;
        target.isChannelingDomainExpansion = false;
        target.isChannelingDomain = false;
        target.domainChargeTimer = 0;
        target.isChannelingRCT = false;
        target.rctChannelTimer = 0;
        target.isChannelingDivineFlame = false;
        target.isChannelingStorm = false;
        target.isChanneling = false;
        target.channelTimer = 0;

        // Reset ONLY the specific interrupted skill's cooldown to HALF maximum (so they get it back faster)
        if (wasPurple && target.purpleCooldown !== undefined) target.purpleCooldown = (CONFIG.gojo?.purpleCooldown || 800) / 2;
        if (wasDomain && target.domainCooldown !== undefined && !target.domainActive) target.domainCooldown = (CONFIG.gojo?.domainCooldown || CONFIG.sukuna?.domainCooldown || CONFIG.yuta?.domainCooldown || 1500) / 2;
        if (wasRCT && target.rctCooldown !== undefined) target.rctCooldown = (CONFIG.yuta?.rctCooldown || 600) / 2;
        if (wasDivineFlame && target.divineFlameCooldown !== undefined) target.divineFlameCooldown = (CONFIG.sukuna?.divineFlameCooldown || 900) / 2;
        if (wasStorm && target.stormCooldown !== undefined) target.stormCooldown = (CONFIG.zeus?.stormCooldown || 900) / 2;
        if (wasGeneric && typeof target.ultimateCooldown === 'number' && !target.ultimateActive) target.ultimateCooldown = (target.ultimateCooldownMax || 900) / 2;

        spawnSparks(target.x, target.y, 18, '#A078C8'); // Deep purple silence pulse sparks!
        spawnImpactFlash(target.x, target.y, 45, 'rgba(160, 30, 240, 0.9)');
      }
    }
    
    // Impact visual effects & micro-screen shake
    triggerGlobalScreenShake(isAmbushThrust ? 6 : 3, isAmbushThrust ? 8 : 4);
    spawnSparks(target.x, target.y, '#A078C8', 12);
    spawnSparks(target.x, target.y, '#FF3355', 10);
    spawnSparks(target.x, target.y, 12, 'crimsonSniper');
    spawnImpactFlash(target.x, target.y, 30);

    // 1st HIT KNOCKBACK (Target slides back smoothly WITHOUT bouncing so 2nd sequence executes cleanly!)
    if (isAmbushThrust) {
      this._clearTargetFreeze(target);
      target.isFirstHitKnockback = true; // Disable wall rebounce for 1st hit!
      const pushAngle = Math.atan2(target.y - this.y, target.x - this.x);
      const knockbackSpeed = 28; // Smooth controlled distance!
      
      const kbVx = Math.cos(pushAngle) * knockbackSpeed;
      const kbVy = Math.sin(pushAngle) * knockbackSpeed;
      target.vx = kbVx;
      target.vy = kbVy;
      target.knockbackDecay = 0.84; // Smooth controlled linear slide so target stops cleanly!
      target.applyKnockback(kbVx, kbVy);

      // Heavy Knockback Blast Effects
      spawnMeleeClashShockwave(target.x, target.y, 190, 'yuta');
      spawnCrimsonLightningImpact(target.x, target.y, 110);
      spawnMeleeClashShockwave(target.x, target.y, 140, 'yuta');
      spawnSparks(target.x, target.y, 40, 'crimsonSniper');
    }
  }

  /**
   * Override base gun rendering to prevent drawing the default gray gun.
   */
  drawGun(ctx) {
    // Intentionally empty: Toji uses custom cursed tools (Inverted Spear & Split Soul Katana)
  }

  /**
   * Custom drawing logic for Toji (Low Assassin Guard Stance & High-Speed Multi-Phase Attack).
   */
  draw(ctx) {
    // Keep chain physics updated during every render frame (including countdown / pause)
    this._updateChainPhysics();

    // Render Channel Sense Interrupt Indicator above Toji's head when triggered!
    if (this.channelSenseIndicatorTimer > 0) {
      this.channelSenseIndicatorTimer--;
      const alpha = Math.min(1.0, this.channelSenseIndicatorTimer / 10);
      ctx.save();

      // Sharp Anime Eye Glint Spark / Lock-on Star above head
      const headX = this.x;
      const headY = this.y - this.r - 28;

      // Outer Crimson Pulse Circle
      ctx.beginPath();
      ctx.arc(headX, headY, 12 + (35 - this.channelSenseIndicatorTimer) * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 20, 100, ${alpha * 0.8})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Inner Bright Gold Star / Eye Glint
      ctx.beginPath();
      ctx.arc(headX, headY, 7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 0, 60, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Crosshair Glint Spikes
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2;
      const glintLen = 16;
      ctx.beginPath();
      ctx.moveTo(headX - glintLen, headY); ctx.lineTo(headX + glintLen, headY);
      ctx.moveTo(headX, headY - glintLen); ctx.lineTo(headX, headY + glintLen);
      ctx.stroke();

      ctx.restore();
    }

    const baseAngle = this.gunAngle !== undefined ? this.gunAngle : this.angle;
    const isAttacking = this.spearSwingTimer > 0;
    
    let offsetAngle = 0.42; // Lore low assassin side guard stance
    let thrustDistance = 0;
    let slashArcAlpha = 0;
    let attackPhaseProgress = 0;

    if (this.isAmbushing && (this.ambushPhase === 'BACK_CHARGE' || this.ambushPhase === 'FRONT_LAUNCH')) {
      const maxPause = CONFIG.toji?.ambushBackChargeDuration || 25;
      const chargeRatio = Math.min(1.0, 1 - (this.ambushTimer / maxPause));

      // Deep coiled weapon charging stance: hand and weapon held steady at shoulder ready to plunge
      thrustDistance = -24;
      offsetAngle = 0.50;

      // Render Charging Weapon Energy Flare at spear tip held at shoulder
      ctx.save();
      const renderAngle = baseAngle + offsetAngle;
      const tipX = this.x + Math.cos(renderAngle) * (this.r + 26 + thrustDistance);
      const tipY = this.y + Math.sin(renderAngle) * (this.r + 26 + thrustDistance);

      // A. Charging Energy Flare Outer Ring
      ctx.beginPath();
      ctx.arc(tipX, tipY, 10 + chargeRatio * 20, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 30, 75, ${0.5 + chargeRatio * 0.5})`;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // B. Hyper-Bright Inner Core
      ctx.beginPath();
      ctx.arc(tipX, tipY, 5 + chargeRatio * 8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + chargeRatio * 0.3})`;
      ctx.fill();

      // C. Radiating Energy Spikes / Rays
      const rayCount = 8;
      ctx.strokeStyle = `rgba(160, 90, 240, ${0.6 + chargeRatio * 0.4})`;
      ctx.lineWidth = 2;
      for (let r = 0; r < rayCount; r++) {
        const rayAngle = (r / rayCount) * Math.PI * 2 + (Date.now() / 80);
        const r1 = 6;
        const r2 = 18 + chargeRatio * 18;
        ctx.beginPath();
        ctx.moveTo(tipX + Math.cos(rayAngle) * r1, tipY + Math.sin(rayAngle) * r1);
        ctx.lineTo(tipX + Math.cos(rayAngle) * r2, tipY + Math.sin(rayAngle) * r2);
        ctx.stroke();
      }
      ctx.restore();
    } else if (this.ambushPhase === 'KATANA_CHARGE') {
      const maxPause = CONFIG.toji?.ambushKatanaChargeDuration || 20;
      const chargeRatio = Math.min(1.0, 1 - (this.ambushTimer / maxPause));

      thrustDistance = -16;
      offsetAngle = -0.75; // Coiled back for Katana sweep

      // Render Katana Charging Soul Flare at tip
      ctx.save();
      const renderAngle = baseAngle + offsetAngle;
      const tipX = this.x + Math.cos(renderAngle) * (this.r + 32 + thrustDistance);
      const tipY = this.y + Math.sin(renderAngle) * (this.r + 32 + thrustDistance);

      ctx.beginPath();
      ctx.arc(tipX, tipY, 10 + chargeRatio * 16, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 30, 75, ${0.6 + chargeRatio * 0.4})`;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(tipX, tipY, 5 + chargeRatio * 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + chargeRatio * 0.2})`;
      ctx.fill();
      ctx.restore();
    } else if (this.ambushPhase === 'KATANA_DRAW' || this.ambushPhase === 'KATANA_CHASE') {
      thrustDistance = -8;
      offsetAngle = 0.35;

      if (this.ambushPhase === 'KATANA_DRAW') {
        const maxDraw = 12;
        const drawProgress = Math.min(1.0, 1 - (this.ambushTimer / maxDraw));

        // --- INVENTORY CURSE WEAPON SWITCH GRAPHIC ---
        const currentRenderAngle = baseAngle + offsetAngle;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(currentRenderAngle);

        // 1. Dark Purple/Black Inventory Curse Vortex Portal Ring
        ctx.beginPath();
        ctx.arc(-this.r * 0.5, 0, 14 + drawProgress * 16, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(120, 30, 180, ${0.9 - drawProgress * 0.4})`;
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(-this.r * 0.5, 0, 8 + drawProgress * 10, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(30, 10, 50, ${0.7 - drawProgress * 0.3})`;
        ctx.fill();

        // 2. Metallic Blade Unsheathe Sheen Flash (Razor white line traveling up blade)
        const sheenX = this.r + (drawProgress * 90);
        ctx.beginPath();
        ctx.arc(sheenX, 0, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${1.0 - drawProgress * 0.3})`;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(sheenX - 14, 0);
        ctx.lineTo(sheenX + 14, 0);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95})`;
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.restore();
      }
    } else if (this.ambushPhase === 'KATANA_SLASH' || (this.katanaSlashTimer && this.katanaSlashTimer > 0)) {
      const maxTimer = 35;
      const t = 1 - ((this.katanaSlashTimer || 0) / maxTimer);
      attackPhaseProgress = t;

      if (t < 0.15) {
        const p = t / 0.15;
        thrustDistance = -14 * p;
        offsetAngle = -0.85 * p; // Coil back for wide Katana slash
        slashArcAlpha = 0.6 * p;
      } else if (t < 0.65) {
        const p = (t - 0.15) / 0.50;
        const sweepCurve = Math.sin(p * Math.PI * 0.5);
        thrustDistance = -14 + 48 * sweepCurve;
        offsetAngle = -0.85 + 1.80 * sweepCurve; // Sweeps smoothly from -0.85 to +0.95!
        slashArcAlpha = 1.0;
      } else {
        const p = (t - 0.65) / 0.35;
        thrustDistance = 34 * (1 - p);
        offsetAngle = 0.95 * (1 - p);
        slashArcAlpha = 1.0 * (1 - p); // Lingers smoothly before fading out!
      }
    } else if (isAttacking) {
      const maxTimer = this.isAmbushThrust ? 24 : 22;
      const t = 1 - (this.spearSwingTimer / maxTimer); // 0 to 1 attack progress
      attackPhaseProgress = t;

      if (this.isAmbushThrust) {
        // --- MASSIVE AMBUSH PIERCING THRUST ANIMATION ---
        if (t < 0.12) {
          const p = t / 0.12;
          thrustDistance = -24 * (1 - p * 0.1); // Coiled far back at shoulder
          offsetAngle = 0.50 * (1 - p);
        } else if (t < 0.72) {
          const p = (t - 0.12) / 0.60;
          const thrustProgress = Math.min(1.0, p * 4.0); // Drives forward in 3 frames, then HOLDS at +70px!
          thrustDistance = -24 + 94 * thrustProgress; // Plunges from -24px to +70px forward deep inside target body!
          offsetAngle = 0; // Pure linear piercing thrust directly forward into enemy spine
          slashArcAlpha = Math.sin(p * Math.PI);

          if (p > 0.05 && p < 0.35 && this.chainNodes && this.chainNodes.length > 2) {
            const whipForce = -8.0;
            for (let i = 1; i < this.chainNodes.length; i++) {
              this.chainNodes[i].vx += Math.cos(baseAngle) * (whipForce / i);
              this.chainNodes[i].vy += Math.sin(baseAngle) * (whipForce / i);
            }
          }
        } else {
          const p = (t - 0.72) / 0.28;
          thrustDistance = 70 * (1 - p);
          offsetAngle = 0.42 * p;
          slashArcAlpha = 0.85 * (1 - p);
        }
      } else {
        // Standard Melee Swing
        if (t < 0.20) {
          // Phase 1: Assassin Coil Back (Wind-up)
          const p = t / 0.20;
          thrustDistance = -12 * Math.sin(p * Math.PI * 0.5);
          offsetAngle = 0.42 + 0.35 * p; // Rotates back into coiled stance
        } else if (t < 0.65) {
          // Phase 2: Explosive Forward Snap Thrust & Wide Slash Sweep!
          const p = (t - 0.20) / 0.45;
          const snapCurve = Math.sin(p * Math.PI);
          thrustDistance = -12 + 48 * snapCurve; // Spikes out +36px past normal reach!
          offsetAngle = 0.77 - 1.40 * Math.sin(p * Math.PI * 0.5); // Wide sweeping slash across opponent
          slashArcAlpha = snapCurve;

          // Whip chain nodes outward on the initial strike snap frame
          if (p > 0.1 && p < 0.40 && this.chainNodes && this.chainNodes.length > 2) {
            const whipForce = 5.0;
            const sideAngle = baseAngle + offsetAngle;
            for (let i = 1; i < this.chainNodes.length; i++) {
              this.chainNodes[i].vx += Math.cos(sideAngle + 1.2) * (whipForce / i);
              this.chainNodes[i].vy += Math.sin(sideAngle + 1.2) * (whipForce / i);
            }
          }
        } else {
          // Phase 3: Smooth Retraction Recovery into Guard
          const p = (t - 0.65) / 0.35;
          thrustDistance = 36 * (1 - p); // Weapon smoothly retracts from +36px back to 0px
          offsetAngle = -0.63 + (0.42 - (-0.63)) * p; // Weapon rotates smoothly back to guard stance (0.42)
          slashArcAlpha = 0.85 * (1 - p); // Slash arc smoothly fades out during recovery!
        }
      }
    } else if (this.ambushPhase === 'PHANTOM_FLURRY' || (this.phantomSlashTimer && this.phantomSlashTimer > 0)) {
      const maxSlashFrames = 12;
      const timer = this.phantomSlashTimer || 0;
      let p = timer / maxSlashFrames;
      p = p * (2 - p); // ease-out

      // Strictly alternate: even strike count = Katana, odd = Spear
      const isKatanaActive = (this.phantomStrikeCount % 2) === 0;
      this.pKatana = isKatanaActive ? p : 0;
      this.pSpear  = isKatanaActive ? 0 : p;

      const swingType = (this.phantomStrikeCount || 0) % 3;
      let targetOffset = 0, targetThrust = 0;
      if (swingType === 0) { targetOffset = 0.7 - (1.4 * (1 - p));  targetThrust = 8 * p; }
      else if (swingType === 1) { targetOffset = -0.7 + (1.4 * (1 - p)); targetThrust = 12 * p; }
      else { targetOffset = 1.0 * p - 0.5 * (1 - p); targetThrust = -6 + 20 * Math.sin(p * Math.PI); }

      // Smooth lerp for the active weapon only
      if (isKatanaActive) {
        if (this._smoothKatanaOffset === undefined) this._smoothKatanaOffset = targetOffset;
        if (this._smoothKatanaThrust === undefined) this._smoothKatanaThrust = targetThrust;
        this._smoothKatanaOffset += (targetOffset - this._smoothKatanaOffset) * 0.45;
        this._smoothKatanaThrust += (targetThrust - this._smoothKatanaThrust) * 0.45;
        this.katanaOffset = this._smoothKatanaOffset;
        this.katanaThrust = this._smoothKatanaThrust;
        this.spearOffset = 0; this.spearThrust = 0;
      } else {
        if (this._smoothSpearOffset === undefined) this._smoothSpearOffset = targetOffset;
        if (this._smoothSpearThrust === undefined) this._smoothSpearThrust = targetThrust;
        this._smoothSpearOffset += (targetOffset - this._smoothSpearOffset) * 0.45;
        this._smoothSpearThrust += (targetThrust - this._smoothSpearThrust) * 0.45;
        this.spearOffset = this._smoothSpearOffset;
        this.spearThrust = this._smoothSpearThrust;
        this.katanaOffset = 0; this.katanaThrust = 0;
      }

      slashArcAlpha = 0.3 + p * 0.7;
      offsetAngle = 0; // handled per weapon
      thrustDistance = 0;
    } else if (this.blockPoseTimer && this.blockPoseTimer > 0) {
      this.blockPoseTimer--;
      const progress = 1 - (this.blockPoseTimer / 25);
      if (this.parryType === 'deflect') {
        // Fast sharp counter-swipe rotation matching Yuta's deflection pose!
        offsetAngle = (Math.PI / 3.5) - (Math.PI * 0.6) * Math.min(1.0, progress * 2.5);
        thrustDistance = 12 * Math.sin(progress * Math.PI);
      } else {
        // Guard Pose: Hold Inverted Spear flat across chest
        offsetAngle = Math.PI / 2;
        thrustDistance = -6;
      }
    } else {
      // Idle assassin stance breathing sway
      offsetAngle += Math.sin(Date.now() / 250) * 0.05;
    }

    const renderAngle = baseAngle + offsetAngle;

    // 1. Draw motion ghosting shadow during thrust lunge (shows hand & weapon driving forward)
    if (isAttacking && attackPhaseProgress >= 0.15 && attackPhaseProgress <= 0.70) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      const ghostOffset = this.isAmbushThrust
        ? -28 + 55 * Math.sin((attackPhaseProgress - 0.15) / 0.55 * Math.PI)
        : -12 * (1 - Math.abs(attackPhaseProgress - 0.43) * 4);
      ctx.translate(this.x + Math.cos(baseAngle) * ghostOffset, this.y + Math.sin(baseAngle) * ghostOffset);
      ctx.rotate(renderAngle);
      drawInvertedSpear(ctx, 0, 0, 0, this.r, null, this.color);
      ctx.restore();
    }

    // 1.4. High-Speed Stealth Motion Trail Afterimages
    if (this.stealthAfterimages && this.stealthAfterimages.length > 0) {
      for (const img of this.stealthAfterimages) {
        ctx.save();
        ctx.globalAlpha = img.alpha;
        ctx.translate(img.x, img.y);
        ctx.rotate(img.angle);
        ctx.beginPath();
        ctx.arc(0, 0, this.r, 0, Math.PI * 2);
        ctx.fillStyle = '#281438';
        ctx.fill();
        ctx.strokeStyle = '#A040FF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    }

    // 1.5. Solid Dark Shadow Purple Stealth Ring
    if (this.isStealthed) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(160, 60, 255, 0.22)';
      ctx.fill();
      ctx.strokeStyle = '#A040FF';
      ctx.lineWidth = 2.0;
      ctx.stroke();
      ctx.restore();
    }

    // 1.8. Draw Rested Weapon on BACK LAYER (Behind Toji's body circle)
    const isKatanaDrawn = this.ambushPhase === 'KATANA_DRAW' || this.ambushPhase === 'KATANA_CHASE' || this.ambushPhase === 'KATANA_CHARGE' || this.ambushPhase === 'KATANA_SLASH';

    if (isKatanaDrawn) {
      drawRestedInvertedSpearAtHip(ctx, this.x, this.y, baseAngle, this.r, this.chainNodes);
    } else {
      drawRestedKatanaOverShoulder(ctx, this.x, this.y, baseAngle, this.r);
    }

    // 2. Draw base circle body and outline
    this.drawBody(ctx);
    this.drawOutline(ctx);

    // 3. Draw physics chain trailing naturally in world space
    drawPhysicsChain(ctx, this.chainNodes);

    // 4. HIGH-IMPACT ANIME SLASH VISUAL EFFECTS (Impact & Recovery Phase)
    if (slashArcAlpha > 0) {
      ctx.save();
      ctx.translate(this.x, this.y);

      if (this.ambushPhase === 'KATANA_SLASH') {
        // Rotate directly by the active Katana blade angle so crescent is 100% locked to sword tip with ZERO delay!
        ctx.rotate(baseAngle + offsetAngle);

        // --- SLIM, LONG, ELEGANT VOID-PURPLE ANIME CRESCENT SLASH WAVE ---
        const tailAngle = -Math.PI * 0.90; // Long 165-degree trailing needle tail!
        const tipAngle = Math.PI * 0.10;   // Leading razor head at the Katana blade tip!

        const outerR = this.r + 122; // 147px radius: Spawns directly off the tip of the Split Soul Katana!
        const maxThick = 22; // Slim, razor-sharp crescent thickness!
        const steps = 32;

        // 1. Outer Neon Violet Glowing Aura (Slim & Crisp)
        ctx.beginPath();
        ctx.arc(0, 0, outerR + 4, tailAngle, tipAngle, false);
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const angle = tailAngle + (tipAngle - tailAngle) * t;
          const thick = (maxThick + 5) * Math.sin(Math.pow(t, 0.75) * Math.PI);
          const r = (outerR + 4) - thick;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(160, 30, 240, ${slashArcAlpha * 0.70})`;
        ctx.fill();

        // 2. Inner Deep Crimson / Violet Secondary Flare
        ctx.beginPath();
        ctx.arc(0, 0, outerR + 1.5, tailAngle, tipAngle, false);
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const angle = tailAngle + (tipAngle - tailAngle) * t;
          const thick = (maxThick + 2) * Math.sin(Math.pow(t, 0.75) * Math.PI);
          const r = (outerR + 1.5) - thick;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(220, 20, 100, ${slashArcAlpha * 0.80})`;
        ctx.fill();

        // 3. Void-Black Pitch Dark Cursed Energy Core (Slim, Long, & Jagged Notches)
        ctx.beginPath();
        ctx.arc(0, 0, outerR, tailAngle, tipAngle, false);
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const angle = tailAngle + (tipAngle - tailAngle) * t;
          let thick = maxThick * Math.sin(Math.pow(t, 0.75) * Math.PI);

          // Subtle sharp inner teeth notches matching reference image
          const notchPattern = Math.sin(t * Math.PI * 10);
          if (notchPattern > 0.65 && t > 0.15 && t < 0.85) {
            thick += 4.5 * (notchPattern - 0.65);
          }

          const r = outerR - thick;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(12, 4, 20, ${slashArcAlpha * 0.96})`;
        ctx.fill();

        // 4. Electric Violet / Pure White Razor Edge Line
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const angle = tailAngle + (tipAngle - tailAngle) * t;
          const thick = maxThick * Math.sin(Math.pow(t, 0.75) * Math.PI);
          const r = outerR - thick * 0.25;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(235, 140, 255, ${slashArcAlpha})`;
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const angle = tailAngle + (tipAngle - tailAngle) * t;
          const thick = maxThick * Math.sin(Math.pow(t, 0.75) * Math.PI);
          const r = outerR - thick * 0.25;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${slashArcAlpha * 0.9})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (this.isAmbushThrust && this.ambushPhase !== 'PHANTOM_FLURRY') {
        ctx.rotate(baseAngle);
        // --- MASSIVE PIERCING THRUST CONE SHOCKWAVE ---
        // A. Deep Purple Cursed Energy Outer Flare Cone
        ctx.beginPath();
        ctx.moveTo(this.r + 10, -26 * slashArcAlpha);
        ctx.lineTo(this.r + 95 * slashArcAlpha, 0);
        ctx.lineTo(this.r + 10, 26 * slashArcAlpha);
        ctx.closePath();
        ctx.fillStyle = `rgba(160, 90, 240, ${slashArcAlpha * 0.5})`;
        ctx.fill();

        // B. Crimson Nullification Energy Edge Cone
        ctx.beginPath();
        ctx.moveTo(this.r + 12, -18 * slashArcAlpha);
        ctx.lineTo(this.r + 105 * slashArcAlpha, 0);
        ctx.lineTo(this.r + 12, 18 * slashArcAlpha);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 30, 75, ${slashArcAlpha * 0.75})`;
        ctx.fill();

        // C. Hyper-Bright Razor White Piercing Thrust Core
        ctx.beginPath();
        ctx.moveTo(this.r + 15, -10 * slashArcAlpha);
        ctx.lineTo(this.r + 115 * slashArcAlpha, 0);
        ctx.lineTo(this.r + 15, 10 * slashArcAlpha);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 255, ${slashArcAlpha * 0.95})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 255, ${slashArcAlpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // D. Linear High-Speed Air Piercing Speed Lines
        const offsetys = [-18, -10, 0, 10, 18];
        ctx.strokeStyle = `rgba(255, 255, 255, ${slashArcAlpha * 0.9})`;
        ctx.lineWidth = 1.8;
        for (const oy of offsetys) {
          ctx.beginPath();
          ctx.moveTo(this.r + 10, oy);
          ctx.stroke();
        }
      } else if (this.ambushPhase === 'PHANTOM_FLURRY') {
        // --- DUAL-WIELD PHANTOM FLURRY SLASH ARCS ---
        const drawArc = (arcAngle, radius, thick, alpha, color1, color2, color3) => {
          ctx.save();
          ctx.rotate(baseAngle + arcAngle);
          const tailAngle = -Math.PI * 0.85;
          const tipAngle = Math.PI * 0.15;
          const steps = 30;

          ctx.beginPath();
          ctx.arc(0, 0, radius + 4, tailAngle, tipAngle, false);
          for (let i = steps; i >= 0; i--) {
            const t = i / steps;
            const angle = tailAngle + (tipAngle - tailAngle) * t;
            const th = (thick + 5) * Math.sin(Math.pow(t, 0.75) * Math.PI);
            ctx.lineTo(Math.cos(angle) * (radius + 4 - th), Math.sin(angle) * (radius + 4 - th));
          }
          ctx.fillStyle = `rgba(${color1}, ${alpha * 0.70})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(0, 0, radius + 1.5, tailAngle, tipAngle, false);
          for (let i = steps; i >= 0; i--) {
            const t = i / steps;
            const angle = tailAngle + (tipAngle - tailAngle) * t;
            const th = (thick + 2) * Math.sin(Math.pow(t, 0.75) * Math.PI);
            ctx.lineTo(Math.cos(angle) * (radius + 1.5 - th), Math.sin(angle) * (radius + 1.5 - th));
          }
          ctx.fillStyle = `rgba(${color2}, ${alpha * 0.80})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(0, 0, radius, tailAngle, tipAngle, false);
          for (let i = steps; i >= 0; i--) {
            const t = i / steps;
            const angle = tailAngle + (tipAngle - tailAngle) * t;
            let th = thick * Math.sin(Math.pow(t, 0.75) * Math.PI);
            const notch = Math.sin(t * Math.PI * 10);
            if (notch > 0.65 && t > 0.15 && t < 0.85) th += 4.5 * (notch - 0.65);
            ctx.lineTo(Math.cos(angle) * (radius - th), Math.sin(angle) * (radius - th));
          }
          ctx.fillStyle = `rgba(${color3}, ${alpha * 0.96})`;
          ctx.fill();

          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const angle = tailAngle + (tipAngle - tailAngle) * t;
            const th = thick * Math.sin(Math.pow(t, 0.75) * Math.PI);
            const rEdge = radius - th * 0.25;
            if (i === 0) ctx.moveTo(Math.cos(angle) * rEdge, Math.sin(angle) * rEdge);
            else ctx.lineTo(Math.cos(angle) * rEdge, Math.sin(angle) * rEdge);
          }
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 1.8;
          ctx.stroke();

          ctx.restore();
        };

        // Only draw the arc for the currently active weapon (one at a time)
        const isKatanaActiveArc = (this.phantomStrikeCount % 2) === 0;
        if (isKatanaActiveArc && this.pKatana > 0) {
          drawArc(0.35 + (this.katanaOffset || 0), this.r + 110, 22, slashArcAlpha, '160, 30, 240', '220, 20, 100', '12, 4, 20');
        } else if (!isKatanaActiveArc && this.pSpear > 0) {
          drawArc(-0.35 + (this.spearOffset || 0), this.r + 65, 18, slashArcAlpha, '160, 30, 240', '220, 20, 100', '12, 4, 20');
        }
      } else {
        // --- INVERTED SPEAR BASIC ATTACK SLASH (MATCHING 2ND SEQUENCE VOID-PURPLE CRESCENT WAVE) ---
        ctx.rotate(baseAngle + offsetAngle);

        const tailAngle = -Math.PI * 0.75; // Long trailing needle tail
        const tipAngle = Math.PI * 0.10;   // Leading razor tip at spear tip

        const outerR = this.r + 58; // 83px radius: Positioned at Inverted Spear tip!
        const maxThick = 18; // Slim razor-sharp crescent thickness!
        const steps = 30;

        // 1. Outer Neon Violet Glowing Aura
        ctx.beginPath();
        ctx.arc(0, 0, outerR + 4, tailAngle, tipAngle, false);
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const angle = tailAngle + (tipAngle - tailAngle) * t;
          const thick = (maxThick + 5) * Math.sin(Math.pow(t, 0.75) * Math.PI);
          const r = (outerR + 4) - thick;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(160, 30, 240, ${slashArcAlpha * 0.70})`;
        ctx.fill();

        // 2. Inner Deep Crimson / Violet Secondary Energy Flare
        ctx.beginPath();
        ctx.arc(0, 0, outerR + 1.5, tailAngle, tipAngle, false);
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const angle = tailAngle + (tipAngle - tailAngle) * t;
          const thick = (maxThick + 2) * Math.sin(Math.pow(t, 0.75) * Math.PI);
          const r = (outerR + 1.5) - thick;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(220, 20, 100, ${slashArcAlpha * 0.80})`;
        ctx.fill();

        // 3. Void-Black Pitch Dark Cursed Energy Core (With Jagged Teeth Notches)
        ctx.beginPath();
        ctx.arc(0, 0, outerR, tailAngle, tipAngle, false);
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const angle = tailAngle + (tipAngle - tailAngle) * t;
          let thick = maxThick * Math.sin(Math.pow(t, 0.75) * Math.PI);

          const notchPattern = Math.sin(t * Math.PI * 10);
          if (notchPattern > 0.65 && t > 0.15 && t < 0.85) {
            thick += 4.5 * (notchPattern - 0.65);
          }

          const r = outerR - thick;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(12, 4, 20, ${slashArcAlpha * 0.96})`;
        ctx.fill();

        // 4. Electric Violet Outer Razor Edge Line
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const angle = tailAngle + (tipAngle - tailAngle) * t;
          const thick = maxThick * Math.sin(Math.pow(t, 0.75) * Math.PI);
          const r = outerR - thick * 0.25;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(235, 140, 255, ${slashArcAlpha})`;
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 5. Pure White Razor Core Highlights
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const angle = tailAngle + (tipAngle - tailAngle) * t;
          const thick = maxThick * Math.sin(Math.pow(t, 0.75) * Math.PI);
          const r = outerR - thick * 0.25;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${slashArcAlpha * 0.9})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.restore();
    }



    // 5. Draw Active Front Weapon (Inverted Spear of Heaven or Split Soul Katana)
    ctx.save();
    if (this.channelSenseIndicatorTimer > 0 && !isKatanaDrawn) {
      ctx.shadowBlur = 25 + Math.sin(Date.now() / 50) * 10;
      ctx.shadowColor = 'rgba(255, 20, 100, 1)'; // Neon crimson glow indicating channel interrupt!
    }
    
    if (this.isAmbushing && this.ambushPhase === 'PHANTOM_FLURRY') {
      // One weapon swings at a time: even strike = Katana, odd = Spear
      const isKatanaActive = (this.phantomStrikeCount % 2) === 0;
      if (isKatanaActive) {
        drawSplitSoulKatana(ctx, this.x, this.y, baseAngle + 0.35 + (this.katanaOffset || 0), this.r + (this.katanaThrust || 0), this.color);
        drawInvertedSpear(ctx, this.x, this.y, baseAngle - 0.35, this.r, this.chainNodes, this.color); // resting
      } else {
        drawSplitSoulKatana(ctx, this.x, this.y, baseAngle + 0.35, this.r, this.color); // resting
        drawInvertedSpear(ctx, this.x, this.y, baseAngle - 0.35 + (this.spearOffset || 0), this.r + (this.spearThrust || 0), this.chainNodes, this.color);
      }
    } else if (isKatanaDrawn) {
      drawSplitSoulKatana(ctx, this.x, this.y, renderAngle, this.r + thrustDistance, this.color);
    } else {
      drawInvertedSpear(ctx, this.x, this.y, renderAngle, this.r + thrustDistance, this.chainNodes, this.color);
    }
    ctx.restore();

    if (this.isAmbushing && (this.ambushPhase === 'BACK_CHARGE' || this.ambushPhase === 'FRONT_LAUNCH')) {
      const maxPause = CONFIG.toji?.ambushBackChargeDuration || 25;
      const chargeRatio = Math.min(1.0, 1 - (this.ambushTimer / maxPause));

      // Sharp Razor Blade Edge Glow Overlay (Traces exact blade profile)
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(renderAngle);
      const normRenderAngle = Math.atan2(Math.sin(renderAngle), Math.cos(renderAngle));
      if (Math.abs(normRenderAngle) > Math.PI / 2) {
        ctx.scale(1, -1);
      }
      ctx.translate(this.r + thrustDistance - 4, 0);

      const scale = 0.75;
      ctx.scale(scale, scale);

      // Exact Blade Profile Edge Path
      ctx.beginPath();
      ctx.moveTo(44, -7);
      ctx.lineTo(48, -7);
      ctx.lineTo(48, -9);
      ctx.lineTo(54, -9);
      ctx.lineTo(54, -7);
      ctx.lineTo(104, -7);
      ctx.lineTo(118, 1);
      ctx.lineTo(106, 7);
      ctx.lineTo(80, 7);
      ctx.lineTo(80, 2);
      ctx.lineTo(58, 2);
      ctx.arc(58, 4, 2, -Math.PI / 2, Math.PI / 2, true);
      ctx.lineTo(74, 6);
      ctx.lineTo(80, 14);
      ctx.lineTo(66, 16);
      ctx.lineTo(52, 11);
      ctx.lineTo(48, 11);
      ctx.lineTo(48, 8);
      ctx.lineTo(44, 8);
      ctx.closePath();

      // Outer Crimson Blade Edge Outline
      ctx.strokeStyle = `rgba(255, 30, 75, ${0.75 + chargeRatio * 0.25})`;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Inner Razor White Edge Shimmer Line
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 + Math.sin(Date.now() / 40) * 0.15})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.restore();
    }

    // 6. Draw Health text on TOP of body, chain, and weapon
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}

