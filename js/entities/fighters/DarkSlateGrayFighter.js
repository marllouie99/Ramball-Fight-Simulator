import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText } from '../../core/state.js';
import { playSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { drawDarkSlateGrayShuriken, drawDarkSlateGrayMelee } from '../../graphics/weaponVisuals.js';

/**
 * DarkSlateGray Fighter (Ninja)
 * Stealthy ninja with shuriken throwing and dodge mechanics.
 * 
 * Basic Attack: Throws shuriken (5 damage, normal fire rate)
 * Passive Skill: Probability to dodge incoming projectiles
 * Activate Skill: After 3 successful dodges, becomes invisible with speed boost (5 seconds)
 * During Invisibility: Deals 2x damage on backstab attacks
 */
export class DarkSlateGrayFighter extends Fighter {
  constructor(def) {
    super(def);
    this.dodgeCount = 0;
    this.dodgeCooldown = 0;
    this.invincibilityTimer = 0;
    this.backstabCooldown = 0;
    this.meleeSwingCooldown = 0;
    this.lastBackstabOpponent = null; // Track last backstab target
    this.lastMeleeOpponent = null;    // Track last melee target
    this.flashStepTimer = 0;
    this.afterimages = []; // Array to store afterimage data
    this.stealthTrail = [];
    this.weaponMode = 'shuriken';
    this.weaponSwitchTimer = 0;
    this.weaponSwitchFrom = 'shuriken';
    this.weaponSwitchTo = 'shuriken';
    this.swingAnimationTimer = 0;    // Timer for sword swing animation
    this.backstabAnimationTimer = 0; // Timer for backstab thrust animation
    this.attackEffectTimer = 0;      // For visual attack feedback
    this.attackEffects = [];         // Array to store active attack effect particles

    // Flame-contact → stealth build
    this._flameContactBuildTimer = 0;
    this._flameContactStealthCooldownTimer = 0;
    
    this.throwAnimationTimer = 0;
  }

  reset() {
    super.reset();
    this.dodgeCount = 0;
    this._flameContactBuildTimer = 0;
    this._flameContactStealthCooldownTimer = 0;

    this.dodgeCooldown = 0;
    this.invincibilityTimer = 0;
    this.backstabCooldown = 0;
    this.meleeSwingCooldown = 0;
    this.lastBackstabOpponent = null;
    this.lastMeleeOpponent = null;
    this.flashStepTimer = 0;
    this.afterimages = [];
    this.stealthTrail = [];
    this.weaponMode = 'shuriken';
    this.weaponSwitchTimer = 0;
    this.weaponSwitchFrom = 'shuriken';
    this.weaponSwitchTo = 'shuriken';
    this.swingAnimationTimer = 0;
    this.backstabAnimationTimer = 0;
    this.attackEffectTimer = 0;
    this.attackEffects = [];
    this.throwAnimationTimer = 0;
  }

  // Delegate to the base Fighter class method
  _isInsideCronosSphere() {
    return this.isInsideCronosSphere();
  }

  normalizeAngle(angle) {
    while (angle <= -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  }

  aim(opponent) {
    if (opponent) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }
  }

  // Override takeDamage to implement dodge mechanics
  takeDamage(amount, attacker, opts = {}) {
    const isFlameContact = !!opts.isFlame;

    // Projectiles pass through only on the first contact while in dodge or stealth.
    // Laser beams are NOT auto-dodged during stealth since they're continuous damage sources.
    // Flame projectiles are NOT auto-dodged since they're rapid-contact damage sources.
    const alreadyDodged = opts.projectile && opts.projectile.dodgedFighters && opts.projectile.dodgedFighters.has(this);
    if (opts.isProjectile && !opts.isLaser && !opts.isFlame && (this.flashStepTimer > 0 || this.invincibilityTimer > 0) && !alreadyDodged) {
      spawnFloatingText(this.x, this.y - this.r - 10, 'PASS!', '#88ff88');
      return false;
    }

    // Flame-contact stealth build: while taking sustained flame contact,
    // DarkSlateGray can (with chance) trigger stealth mode.
    // Flame damage is throttled by ProjectileSystem, so one takeDamage() call
    // represents several frames of contact rather than exactly one frame.
    if (isFlameContact) {
      // Don't build/trigger while already in stealth/dodge.
      if (this.invincibilityTimer === 0 && this.flashStepTimer === 0 && this._flameContactStealthCooldownTimer === 0) {
        const flameIntervalSeconds = Number(CONFIG.orange.flameContactIntervalSeconds ?? CONFIG.orange.flameHitCooldown ?? 0.2);
        const flameBuildFrames = Math.max(1, Math.round(Math.max(0.01, flameIntervalSeconds) * 60));
        this._flameContactBuildTimer += flameBuildFrames;

        if (this._flameContactBuildTimer >= CONFIG.darkslategray.flameContactStealthBuildFrames) {
          // Attempt stealth trigger
          const roll = Math.random();
          if (roll <= CONFIG.darkslategray.flameContactStealthChance) {
            this._flameContactBuildTimer = 0;
            this.activateInvincibility();
            this._flameContactStealthCooldownTimer = CONFIG.darkslategray.flameContactStealthCooldown;
          } else {
            // Build failed; keep a short cooldown so continuous flames can try
            // again soon, but cannot spam stealth every damage tick.
            this._flameContactBuildTimer = 0;
            this._flameContactStealthCooldownTimer = Math.max(1, Math.round(CONFIG.darkslategray.flameContactStealthCooldown * 0.35));
          }
        }
      }
    } else if (!opts.isBurn) {
      // Non-flame damage breaks the sustained-contact requirement.
      // Burn DOT should not break it because it comes from the same flame exposure.
      this._flameContactBuildTimer = 0;
    }


    // Dodge projectiles and melee attacks if dodge chance succeeds
    // Laser beams have reduced dodge chance since they're continuous damage sources.
    // Orange flames use a reduced dodge chance so DarkSlateGray can
    // still occasionally trigger stealth/dodge mode without becoming
    // nearly immune to the flamethrower.
    const flameDodgeChance = Math.max(0.08, CONFIG.darkslategray.dodgeChance * 0.6);
    const isDodgeable = (opts.isProjectile || opts.isMelee);

    // Block dodge/flash-step if inside Cronos's sphere
    const insideCronosSphere = this._isInsideCronosSphere();

    let dodgeChance = CONFIG.darkslategray.dodgeChance;
    if (opts.isLaser) {
      dodgeChance *= 0.1;
    } else if (opts.isFlame) {
      // Flames are continuous multi-hit attacks, so keep the dodge
      // rate lower than normal projectiles while still allowing
      // stealth mode to build up naturally over time.
      dodgeChance = flameDodgeChance;
    }
    // Don't trigger dodge/flash-step while inside Cronos's sphere
    if (isDodgeable && !insideCronosSphere && this.dodgeCooldown === 0 && Math.random() < dodgeChance) {
      // Successful dodge - create multiple flash-step afterimages
      const moveAngle = Math.hypot(this.vx, this.vy) > 0.1 ? Math.atan2(this.vy, this.vx) : this.angle;
      const perpAngle = moveAngle + Math.PI / 2;
      const baseOffset = 14;

      for (let i = 0; i < CONFIG.darkslategray.flashStepCount; i++) {
        const offsetDistance = baseOffset + i * 10;
        const zigzagDistance = (i % 2 === 0 ? 1 : -1) * (5 + i * 4);
        const offsetX = -Math.cos(moveAngle) * offsetDistance + Math.cos(perpAngle) * zigzagDistance;
        const offsetY = -Math.sin(moveAngle) * offsetDistance + Math.sin(perpAngle) * zigzagDistance;
        this.afterimages.push({
          x: this.x + offsetX,
          y: this.y + offsetY,
          radius: this.r * (1 - i * 0.1),
          color: this.color,
          maxTimer: CONFIG.darkslategray.dodgeFlashDuration,
          timer: CONFIG.darkslategray.dodgeFlashDuration - i * 3,
          distortion: 1 - i * 0.05 + (Math.random() * 0.06 - 0.03),
          rotation: this.angle + (i % 2 === 0 ? 0.22 : -0.22),
        });
      }

      this.dodgeCount++;
      this.dodgeCooldown = CONFIG.darkslategray.dodgeCooldown;
      this.flashStepTimer = CONFIG.darkslategray.dodgeFlashDuration;
      this.speed = this.baseSpeed * CONFIG.darkslategray.speedBoostMultiplier;
      this.startWeaponSwitch('melee');

      const stealthSound = getSkillSound(this._def?.id, 'stealthmode');
      if (stealthSound) playSound(stealthSound.src, stealthSound.volume);

      const dodgeText = opts.isMelee ? 'MELEE DODGE!' : 'DODGE!';
      spawnFloatingText(this.x, this.y - this.r - 10, dodgeText, '#88ff88');

      // Check if invincibility should activate
      if (this.dodgeCount >= CONFIG.darkslategray.dodgesToActivate) {
        this.activateInvincibility();
      }

      return false; // Damage dodged
    }

    // During invincibility, still take damage from stray attacks but with visual feedback
    if (this.invincibilityTimer > 0) {
      spawnFloatingText(this.x, this.y - this.r - 10, 'HIT!', '#ff8888');
    }

    return super.takeDamage(amount, attacker, opts);
  }

  onProjectileApproach(projectile, attacker) {
    // Completely disable proximity-based dodging for Orange flames.
    // Flame particles are too dense and repeatedly trigger near-miss logic,
    // which caused DarkSlateGray to enter nearly permanent dodge states.
    // Actual flame-hit dodging is now handled directly inside takeDamage()
    // with a tiny chance instead.
    if (projectile && projectile.isFlame) return;

    // Don't trigger near-miss dodge while inside Cronos's sphere
    if (this._isInsideCronosSphere()) return;

    if (this.invincibilityTimer > 0 || this.flashStepTimer > 0 || this.dodgeCooldown > 0) return;
    if (Math.random() >= CONFIG.darkslategray.dodgeChance) return;

    const moveAngle = Math.hypot(this.vx, this.vy) > 0.1 ? Math.atan2(this.vy, this.vx) : this.angle;
    const perpAngle = moveAngle + Math.PI / 2;
    const baseOffset = 14;

    for (let i = 0; i < CONFIG.darkslategray.flashStepCount; i++) {
      const offsetDistance = baseOffset + i * 10;
      const zigzagDistance = (i % 2 === 0 ? 1 : -1) * (5 + i * 4);
      const offsetX = -Math.cos(moveAngle) * offsetDistance + Math.cos(perpAngle) * zigzagDistance;
      const offsetY = -Math.sin(moveAngle) * offsetDistance + Math.sin(perpAngle) * zigzagDistance;
      this.afterimages.push({
        x: this.x + offsetX,
        y: this.y + offsetY,
        radius: this.r * (1 - i * 0.1),
        color: this.color,
        maxTimer: CONFIG.darkslategray.dodgeFlashDuration,
        timer: CONFIG.darkslategray.dodgeFlashDuration - i * 3,
        distortion: 1 - i * 0.05 + (Math.random() * 0.06 - 0.03),
        rotation: this.angle + (i % 2 === 0 ? 0.22 : -0.22),
      });
    }

    this.dodgeCount++;
    this.dodgeCooldown = CONFIG.darkslategray.dodgeCooldown;
    this.flashStepTimer = CONFIG.darkslategray.dodgeFlashDuration;
    this.speed = this.baseSpeed * CONFIG.darkslategray.speedBoostMultiplier;
    this.startWeaponSwitch('melee');
    spawnFloatingText(this.x, this.y - this.r - 10, 'NEAR MISS!', '#88ff88');

    if (this.dodgeCount >= CONFIG.darkslategray.dodgesToActivate) {
      this.activateInvincibility();
    }
  }

  activateInvincibility() {
    this.invincibilityTimer = CONFIG.darkslategray.invincibilityDuration;
    this.dodgeCount = 0;
    this.speed = this.baseSpeed * CONFIG.darkslategray.speedBoostMultiplier;
    this.startWeaponSwitch('melee');

    const shadowSound = getSkillSound(this._def?.id, 'shadowmode');
    if (shadowSound) playSound(shadowSound.src, shadowSound.volume);

    spawnFloatingText(this.x, this.y - this.r - 15, 'SHADOW MODE!', '#8888ff');
  }

  checkBackstab(opponent, ownerIndex) {
    if ((this.invincibilityTimer === 0 && this.flashStepTimer === 0) || this.weaponMode !== 'melee' || this.backstabCooldown > 0 || !opponent) return;

    // Prevent hitting the same opponent multiple times in quick succession
    if (this.lastBackstabOpponent === opponent) return;

    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Check if in range using configurable melee attack radius
    if (dist > CONFIG.darkslategray.meleeAttackRadius) return;

    // Check if behind opponent (within backstab angle)
    const angleToOpponent = Math.atan2(dy, dx);
    const opponentFacingAngle = opponent.angle;
    const angleDiff = this.normalizeAngle(angleToOpponent - opponentFacingAngle);
    const backstabThreshold = (CONFIG.darkslategray.backstabAngle * Math.PI / 180) / 2;

    // Behind means the angle difference is close to PI (180 degrees)
    const isBehind = Math.abs(Math.abs(angleDiff) - Math.PI) < backstabThreshold;

    if (isBehind) {
      const backstabDamage = this.damage * CONFIG.darkslategray.backstabDamageMultiplier;
      opponent.takeDamage(backstabDamage, this, { isMelee: true });

      const bsSound = getSkillSound(this._def?.id, 'backstab');
      if (bsSound) playSound(bsSound.src, bsSound.volume);

      this.backstabCooldown = CONFIG.darkslategray.backstabCooldown;
      this.meleeSwingCooldown = CONFIG.darkslategray.meleeSwingCooldown; // Prevent melee swing right after backstab
      this.lastBackstabOpponent = opponent; // Track this hit
      this.backstabAnimationTimer = CONFIG.darkslategray.backstabAnimationDuration; // Start backstab animation
      this._spawnAttackEffect(opponent, 'backstab'); // Visual effect

      // Recover HP on successful backstab based on config
      const recoveryAmount = this.maxHp * CONFIG.darkslategray.backstabRecoveryPercent;
      this.hp = Math.min(this.maxHp, this.hp + recoveryAmount);
      spawnFloatingText(this.x, this.y - this.r - 10, `+${Math.round(recoveryAmount)}`, '#00ff00');

      spawnFloatingText(opponent.x, opponent.y - opponent.r - 10, 'BACKSTAB!', '#ff44ff');

      // Break stealth mode upon attacking
      if (this.invincibilityTimer > 0) {
        this.invincibilityTimer = 1;
      }

      return; // Exit after backstab to prevent melee swing from hitting same opponent
    }
  }

  checkMeleeSwing(opponent, ownerIndex) {
    // Only swing melee if in melee mode and during stealth
    if ((this.invincibilityTimer === 0 && this.flashStepTimer === 0) || this.weaponMode !== 'melee' || this.meleeSwingCooldown > 0 || !opponent) return;

    // Prevent hitting the same opponent multiple times in quick succession
    if (this.lastMeleeOpponent === opponent) return;

    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Check if in range using configurable melee attack radius
    if (dist > CONFIG.darkslategray.meleeAttackRadius) return;

    // Deal normal damage from any direction (if no backstab was triggered)
    opponent.takeDamage(CONFIG.darkslategray.meleeSwingDamage, this, { isMelee: true });
    this.meleeSwingCooldown = CONFIG.darkslategray.meleeSwingCooldown;
    this.backstabCooldown = CONFIG.darkslategray.backstabCooldown; // Prevent backstab right after melee swing
    this.lastMeleeOpponent = opponent; // Track this hit
    this.swingAnimationTimer = CONFIG.darkslategray.swingAnimationDuration; // Start swing animation
    this._spawnAttackEffect(opponent, 'slash'); // Visual effect

    spawnFloatingText(opponent.x, opponent.y - opponent.r - 10, 'SLASH!', '#ffaa44');

    // Break stealth mode upon attacking
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer = 1;
    }
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    // Handle cooldowns
    if (this.dodgeCooldown > 0) this.dodgeCooldown--;
    if (this.backstabCooldown > 0) this.backstabCooldown--;
    if (this.meleeSwingCooldown > 0) this.meleeSwingCooldown--;
    if (this._flameContactStealthCooldownTimer > 0) this._flameContactStealthCooldownTimer--;
    if (this.weaponSwitchTimer > 0) {

      this.weaponSwitchTimer--;
      if (this.weaponSwitchTimer === 0) {
        this.weaponMode = this.weaponSwitchTo;
      }
    }
    if (this.flashStepTimer > 0) {
      this.flashStepTimer--;
      if (this.flashStepTimer === 0 && this.invincibilityTimer === 0) {
        this.speed = this.baseSpeed;
        this.startWeaponSwitch('shuriken');
        this.lastBackstabOpponent = null; // Reset tracking
        this.lastMeleeOpponent = null;
      }
    }

    // Update animation timers
    if (this.swingAnimationTimer > 0) this.swingAnimationTimer--;
    if (this.backstabAnimationTimer > 0) this.backstabAnimationTimer--;

    // Update afterimages
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].timer--;
      if (this.afterimages[i].timer <= 0) {
        this.afterimages.splice(i, 1);
      }
    }

    // Update attack effects
    for (let i = this.attackEffects.length - 1; i >= 0; i--) {
      const effect = this.attackEffects[i];
      effect.x += effect.vx;
      effect.y += effect.vy;
      effect.vy += 0.3; // Gravity
      effect.life--;
      if (effect.life <= 0) {
        this.attackEffects.splice(i, 1);
      }
    }
    
    if (this.throwAnimationTimer > 0) {
      this.throwAnimationTimer--;
    }

    // Handle invincibility timer
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer--;

      if (this.invincibilityTimer === 0) {
        // End invincibility
        this.speed = this.baseSpeed;
        this.startWeaponSwitch('shuriken');
        this.lastBackstabOpponent = null; // Reset tracking
        this.lastMeleeOpponent = null;
        spawnFloatingText(this.x, this.y - this.r - 12, 'SHADOW END', '#8888ff');
      }
    }

    // Try backstab and melee swing during stealth (invincibility or dodge)
    if (this.invincibilityTimer > 0 || this.flashStepTimer > 0) {
      this.checkBackstab(opponent, ownerIndex);
      this.checkMeleeSwing(opponent, ownerIndex);
    }

    // Shooting (shuriken throw)
    if (this.invincibilityTimer > 0 || this.flashStepTimer > 0) {
      // Do not fire while invisible from skill or dodge
      if (this.shootCooldown > 0) {
        this.shootCooldown--;
      }
    } else if (this.shootCooldown > 0) {
      this.shootCooldown--;
    } else if (opponent) {
      const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      const delta = this.normalizeAngle(targetAngle - this.angle);
      const aligned = Math.abs(delta) < CONFIG.normal.aimThreshold;

      if (aligned) {
        const shurikenSpeed = CONFIG.darkslategray.shurikenSpeed;
        projectileSystem.fireProjectile(this, ownerIndex, CONFIG.darkslategray.shurikenDamage, false, shurikenSpeed, false, 'shuriken');
        this.shootCooldown = CONFIG.darkslategray.shurikenCooldown;
        this.throwAnimationTimer = 15;

        const sound = getBasicAttackSound(this._def?.id);
        if (sound) playSound(sound.src, sound.volume);
      }
    }

    // Movement
    let targetSpeed = this.speed;
    if (this.slowTimer > 0) {
      this.slowTimer--;
      targetSpeed *= this.slowMultiplier;
    }

    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
      const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.04;
      this.vx = (this.vx / currentSpeed) * newSpeed;
      this.vy = (this.vy / currentSpeed) * newSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    if (this.invincibilityTimer > 0 || this.flashStepTimer > 0) {
      this.stealthTrail.push({ x: this.x, y: this.y, alpha: 0.35 });
      if (this.stealthTrail.length > 12) this.stealthTrail.shift();
    } else if (this.stealthTrail.length > 0) {
      this.stealthTrail.shift();
    }

    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);
  }

  startWeaponSwitch(target) {
    if (this.weaponMode === target || this.weaponSwitchTo === target) return;
    this.weaponSwitchFrom = this.weaponMode;
    this.weaponSwitchTo = target;
    this.weaponSwitchTimer = CONFIG.darkslategray.weaponSwitchDuration;
  }

  resolveWallBounce(arena, opponent) {
    const stealthActive = (this.invincibilityTimer > 0 || this.flashStepTimer > 0) && opponent;
    if (!stealthActive) {
      super.resolveWallBounce(arena);
      return;
    }

    // Determine if a bounce happened against the arena edges
    let bounced = false;
    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      bounced = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      bounced = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      bounced = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      bounced = true;
    }

    if (!bounced) return;
    this.playWallBounceSound();

    // Check whether the opponent is showing their back to this fighter.
    // Compute angle from opponent -> me and compare to opponent.angle + PI (their back direction).
    const dxToMe = this.x - opponent.x;
    const dyToMe = this.y - opponent.y;
    const angleFromOppToMe = Math.atan2(dyToMe, dxToMe);
    const backDir = (opponent.angle + Math.PI);
    const normalize = (a) => { while (a <= -Math.PI) a += Math.PI * 2; while (a > Math.PI) a -= Math.PI * 2; return a; };
    const angleDiff = Math.abs(normalize(angleFromOppToMe - backDir));
    const backstabThreshold = (CONFIG.darkslategray.backstabAngle * Math.PI / 180) / 2;

    // During Shadow Mode, rebounces should propel DarkSlateGray forward
    // instead of physically reflecting.
    // Always redirect velocity toward the fighter (opponent center),
    // using current speed magnitude as the boost.
    {
      const targetX = opponent.x;
      const targetY = opponent.y;
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = Math.max(Math.hypot(this.vx, this.vy), this.speed || 1);

      this.vx = (dx / dist) * speed;
      this.vy = (dy / dist) * speed;
    }
  }

  _spawnAttackEffect(opponent, type) {
    // Spawn visual effect at impact point
    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const impactX = opponent.x - (dx / dist) * opponent.r;
    const impactY = opponent.y - (dy / dist) * opponent.r;

    if (type === 'backstab') {
      // Purple stab effect
      for (let i = 0; i < 4; i++) {
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * Math.PI / 3;
        this.attackEffects.push({
          x: impactX,
          y: impactY,
          vx: Math.cos(angle) * (4 + Math.random() * 4),
          vy: Math.sin(angle) * (4 + Math.random() * 4),
          life: 15,
          maxLife: 15,
          color: '#ff44ff',
          size: 4 + Math.random() * 4,
        });
      }
    } else if (type === 'slash') {
      // Cyan slash impact effect matching the sphere visuals
      for (let i = 0; i < 6; i++) {
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * Math.PI / 2;
        this.attackEffects.push({
          x: impactX,
          y: impactY,
          vx: Math.cos(angle) * (3 + Math.random() * 5),
          vy: Math.sin(angle) * (3 + Math.random() * 5),
          life: 12,
          maxLife: 12,
          color: 'rgba(130, 255, 255, 0.95)',
          size: 4 + Math.random() * 4,
          glow: true,
        });
      }
    }
  }

  drawOutline(ctx) {
    if (this.invincibilityTimer > 0 || this.flashStepTimer > 0) {
      // During stealth mode, still show melee attack radius with full visibility
      if (this.weaponMode === 'melee') {
        ctx.save();
        ctx.globalAlpha = 1.0; // Full visibility regardless of stealth
        ctx.beginPath();
        ctx.arc(this.x, this.y, CONFIG.darkslategray.meleeAttackRadius, 0, Math.PI * 2);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)'; // Brighter for stealth mode visibility
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#4a6a6a';
    ctx.stroke();

    // Draw melee attack radius when in melee mode
    if (this.weaponMode === 'melee') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, CONFIG.darkslategray.meleeAttackRadius, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.35)'; // Semi-transparent blue ring
      ctx.stroke();
    }
  }

  drawGun(ctx) {
    const switching = this.weaponSwitchTimer > 0;
    const progress = switching ? 1 - this.weaponSwitchTimer / CONFIG.darkslategray.weaponSwitchDuration : 1;
    const fadeOld = switching ? 1 - progress : 0;
    const fadeNew = switching ? progress : 1;
    const oldWeapon = switching ? this.weaponSwitchFrom : this.weaponMode;
    const newWeapon = switching ? this.weaponSwitchTo : this.weaponMode;
    const baseAlpha = ctx.globalAlpha !== undefined ? ctx.globalAlpha : 1;

    // Calculate animation rotations for melee attacks
    let animationRotation = 0;
    let animationOffsetScale = 1.0;
    let flashIntensity = 0;
    let thrustDirection = null; // For backstab thrust direction

    if (this.swingAnimationTimer > 0) {
      // Swing animation: smooth arc with visible movement
      const swingProgress = 1 - this.swingAnimationTimer / CONFIG.darkslategray.swingAnimationDuration;
      animationRotation = Math.sin(swingProgress * Math.PI) * CONFIG.darkslategray.swingRotationAmount;
      animationOffsetScale = 1.0 + Math.sin(swingProgress * Math.PI) * 0.8; // Weapon extends significantly during swing
      flashIntensity = Math.sin(swingProgress * Math.PI) * 1.0;
    } else if (this.backstabAnimationTimer > 0) {
      // Backstab animation: thrust forward towards opponent
      const backstabProgress = 1 - this.backstabAnimationTimer / CONFIG.darkslategray.backstabAnimationDuration;
      // Quick ease-out thrust
      const thrustAmount = (1 - (1 - backstabProgress) ** 2);
      animationOffsetScale = 1.0 + thrustAmount * 1.0; // Weapon extends significantly during thrust
      flashIntensity = thrustAmount * 1.0;
      // Slight rotation for visual polish, but keep it minimal
      animationRotation = Math.sin(thrustAmount * Math.PI) * 0.3;
    }

    if (oldWeapon === 'shuriken') {
      const throwProgress = this.throwAnimationTimer > 0 ? Math.sin((this.throwAnimationTimer / 15) * Math.PI) : 0;
      const throwOffset = throwProgress * 10;
      const throwRotation = throwProgress * Math.PI;

      ctx.save();
      ctx.globalAlpha = baseAlpha * fadeOld;
      ctx.translate(Math.cos(this.gunAngle) * throwOffset, Math.sin(this.gunAngle) * throwOffset);
      drawDarkSlateGrayShuriken(ctx, this.x, this.y, this.gunAngle + progress * 0.4 + throwRotation, this.r, this.color);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = baseAlpha * fadeOld;
      drawDarkSlateGrayMelee(ctx, this.x, this.y, this.gunAngle - progress * 0.4 + animationRotation, this.r, animationOffsetScale, flashIntensity, this.color);
      ctx.restore();
    }

    if (newWeapon === 'shuriken') {
      const throwProgress = this.throwAnimationTimer > 0 ? Math.sin((this.throwAnimationTimer / 15) * Math.PI) : 0;
      const throwOffset = throwProgress * 10;
      const throwRotation = throwProgress * Math.PI;

      ctx.save();
      ctx.globalAlpha = baseAlpha * fadeNew;
      ctx.translate(Math.cos(this.gunAngle) * throwOffset, Math.sin(this.gunAngle) * throwOffset);
      drawDarkSlateGrayShuriken(ctx, this.x, this.y, this.gunAngle - (1 - progress) * 0.4 + throwRotation, this.r, this.color);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = baseAlpha * fadeNew;
      drawDarkSlateGrayMelee(ctx, this.x, this.y, this.gunAngle + (1 - progress) * 0.4 + animationRotation, this.r, animationOffsetScale, flashIntensity, this.color);
      ctx.restore();
    }
  }

  drawBody(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.invincibilityTimer > 0) {
      ctx.globalAlpha = CONFIG.darkslategray.invisibilityAlpha;
    }

    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    this.drawStatusOverlays(ctx, this.r);

    ctx.restore();
  }

  draw(ctx) {
    if (this.stealthTrail.length > 0) {
      for (let i = 0; i < this.stealthTrail.length; i++) {
        const trail = this.stealthTrail[i];
        const opacity = ((i + 1) / this.stealthTrail.length) * 0.4;
        ctx.save();
        ctx.globalAlpha = opacity * trail.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, this.r * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const bodyAlpha = (this.invincibilityTimer > 0 || this.flashStepTimer > 0)
      ? CONFIG.darkslategray.invisibilityAlpha
      : 1.0;
    ctx.save();
    ctx.globalAlpha = bodyAlpha;

    // Draw fighter body, outline, and weapon faded during stealth
    super.draw(ctx);
    ctx.restore();

    // Draw afterimages from dodge - positioned at the location where dodge occurred
    for (const afterimage of this.afterimages) {
      const progress = afterimage.timer / afterimage.maxTimer; // 1 to 0 as it fades
      const alpha = CONFIG.darkslategray.flashStepAlpha * progress; // Fade out over time

      // Apply slight distortion to silhouette
      const scaleVariation = afterimage.distortion;
      const radiusWithDistortion = afterimage.radius * scaleVariation;

      ctx.save();

      // Draw semi-transparent glow/halo around the afterimage
      ctx.globalAlpha = alpha * 0.25;
      ctx.fillStyle = afterimage.color;
      ctx.beginPath();
      ctx.arc(afterimage.x, afterimage.y, radiusWithDistortion * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Draw main silhouette with lower opacity
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillStyle = afterimage.color;
      ctx.beginPath();
      ctx.arc(afterimage.x, afterimage.y, radiusWithDistortion, 0, Math.PI * 2);
      ctx.fill();

      // Draw soft secondary silhouette for subtle distortion
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = afterimage.color;
      ctx.beginPath();
      ctx.arc(afterimage.x + radiusWithDistortion * 0.18, afterimage.y - radiusWithDistortion * 0.18, radiusWithDistortion * 0.92, 0, Math.PI * 2);
      ctx.fill();

      // Draw silhouette outline
      ctx.globalAlpha = alpha * 0.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(afterimage.x, afterimage.y, radiusWithDistortion, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // Draw dodge count indicator
    if (this.dodgeCount > 0 && this.invincibilityTimer === 0) {
      ctx.save();
      ctx.fillStyle = '#88ff88';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.dodgeCount}/${CONFIG.darkslategray.dodgesToActivate}`, this.x, this.y - this.r - 8);
      ctx.restore();
    }

    // Draw invincibility timer indicator
    if (this.invincibilityTimer > 0) {
      const secondsLeft = Math.ceil(this.invincibilityTimer / 60);
      ctx.save();
      ctx.fillStyle = '#8888ff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${secondsLeft}s`, this.x, this.y - this.r - 8);
      ctx.restore();
    }

    // Draw attack effect particles
    for (const effect of this.attackEffects) {
      const progress = 1 - effect.life / effect.maxLife;
      const alpha = 1 - progress; // Fade out

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = effect.color;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.fill();

      // Add glow effect for slash particles
      if (effect.glow) {
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = 'rgba(100, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha * 0.18;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 3.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // End dodge draw path; avoid drawing the fighter again opaquely.
  }
}
