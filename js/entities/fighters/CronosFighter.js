import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, getProjectiles, clearProjectiles, spawnFloatingText } from '../../core/state.js';
import { playSound, playLoopingSound, fadeOutLoopingSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { flamewardenFlameSystem } from '../../graphics/weapons/flamewardenWeaponGraphics.js';
import { drawCronosCrescentBlade } from '../../graphics/weaponVisuals.js';
import { drawCronosPreActivateBarrier, drawCronosSphereImpact, drawCronosSphereVisual } from '../../graphics/draw.js';

// Pre-calculated trigonometry arrays for fast hexagonal grid generation
const HEX_ANGLE = Math.PI / 3;
const HEX_COS = [];
const HEX_SIN = [];
for (let i = 0; i < 6; i++) {
  HEX_COS.push(Math.cos(Math.PI / 6 + i * HEX_ANGLE));
  HEX_SIN.push(Math.sin(Math.PI / 6 + i * HEX_ANGLE));
}

export class CronosFighter extends Fighter {
  constructor(def) {
    super(def);
    this.sphereActive = false;
    this.sphereTimer = 0;
    this.sphereCooldown = CONFIG.cronos.sphereCooldown;
    this.sphereImpactTimer = 0;
    this.sphereX = 0;
    this.sphereY = 0;
    this.meleeCooldown = 0;
    this.meleeSwingActive = false;
    this.meleeSwingTimer = 0;
    this.meleeSlashFadeTimer = 0;
    this.meleeSwingAngle = 0;
    this.attackSlashEffects = [];
  }

  reset() {
    super.reset();
    this.sphereActive = false;
    this.sphereTimer = 0;
    this.sphereCooldown = CONFIG.cronos.sphereCooldown;
    this.sphereImpactTimer = 0;
    this.sphereX = 0;
    this.sphereY = 0;
    this.meleeCooldown = 0;
    this.meleeSwingActive = false;
    this.meleeSwingTimer = 0;
    this.meleeSlashFadeTimer = 0;
    this.meleeSwingAngle = 0;
    this.attackSlashEffects = [];
  }

  normalizeAngle(angle) {
    while (angle <= -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  }

  _applyCronosSpeed() {
    const distToSphere = this.sphereActive
      ? Math.hypot(this.x - this.sphereX, this.y - this.sphereY)
      : Infinity;
    const insideSphere = this.sphereActive && distToSphere <= CONFIG.cronos.sphereRadius;
    const targetSpeed = insideSphere
      ? this.baseSpeed * CONFIG.cronos.sphereSpeedMultiplier
      : this.baseSpeed;

    this.speed = targetSpeed;

    const currentMagnitude = Math.hypot(this.vx, this.vy);
    if (currentMagnitude > 0) {
      this.vx = (this.vx / currentMagnitude) * targetSpeed;
      this.vy = (this.vy / currentMagnitude) * targetSpeed;
    }
  }

  aim(opponent) {
    if (opponent) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }
  }

  // Override takeDamage to implement counter-stop passive
  takeDamage(amount, attacker, opts = {}) {
    const damageTaken = super.takeDamage(amount, attacker, opts);

    if (damageTaken !== false && attacker && attacker !== this) {
      // Counter-stop chance when attacked
      if (Math.random() < CONFIG.cronos.counterStopChance) {
        // Prevent spamming floating text and resetting state if already stopped
        if (!attacker.timeStopTimer || attacker.timeStopTimer <= 0) {
          // Apply time stop to the attacker
          attacker.applyTimeStop(CONFIG.cronos.counterStopDuration);
          attacker._suppressFreezeTimer = true;

          // Also hard-freeze attacker rotation + gun angle by zeroing movement and restoring on resume
          // (Fighter base timeStopTimer only skips movement/shooting logic; subclasses like Cronos may
          // still update rotation/aim elsewhere, leaving visual spin/locking active.)
          if (typeof attacker._resumeVx !== 'number') attacker._resumeVx = attacker.vx;
          if (typeof attacker._resumeVy !== 'number') attacker._resumeVy = attacker.vy;
          attacker.vx = 0;
          attacker.vy = 0;

          if (typeof attacker._resumeAngleVel !== 'number') attacker._resumeAngleVel = attacker.speed * (attacker._def?.spinRate ?? CONFIG.spin.rate);
          attacker._timeStoppedAngleVel = 0;

          // Keep gunAngle/angle from updating during time stop (visual freeze)
          attacker._timeStopFrozenAngle = attacker.angle;
          attacker._timeStopFrozenGunAngle = attacker.gunAngle;

          spawnFloatingText(attacker.x, attacker.y - attacker.r - 10, 'TIME STOP!', '#00F3FF');
        } else {
          // Just refresh the duration silently without spawning more text or overwriting original velocities
          attacker.applyTimeStop(CONFIG.cronos.counterStopDuration);
        }
      }
    }

    return damageTaken;
  }

  _spawnAttackSlashEffect() {
    const slashCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < slashCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = this.r * (0.6 + Math.random() * 0.35);
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;
      const slashAngle = angle + (Math.random() - 0.5) * 0.85;
      const life = 8 + Math.floor(Math.random() * 6);
      this.attackSlashEffects.push({
        x: this.x + offsetX,
        y: this.y + offsetY,
        angle: slashAngle,
        life,
        maxLife: life,
        size: 10 + Math.random() * 14,
        alpha: 0.7 + Math.random() * 0.25,
      });
    }
  }

  _updateAttackSlashEffects() {
    for (let i = this.attackSlashEffects.length - 1; i >= 0; i--) {
      const effect = this.attackSlashEffects[i];
      effect.life--;
      if (effect.life <= 0) {
        this.attackSlashEffects.splice(i, 1);
      }
    }
  }

  _drawAttackSlashEffects(ctx) {
    if (!this.attackSlashEffects.length) return;

    for (const effect of this.attackSlashEffects) {
      const progress = 1 - effect.life / effect.maxLife;
      const alpha = effect.alpha * (1 - progress);
      const scale = 0.5 + progress * 0.9;

      ctx.save();
      ctx.translate(effect.x, effect.y);
      ctx.rotate(effect.angle + Math.sin(progress * Math.PI) * 0.18);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.globalCompositeOperation = 'screen';

      // Main slash core - sharp angular blade slash with BOTH tips pointed
      const slashGradient = ctx.createLinearGradient(-effect.size * 0.6, 0, effect.size * 0.6, 0);
      slashGradient.addColorStop(0, `rgba(100, 220, 255, ${0.3 * alpha})`);
      slashGradient.addColorStop(0.15, `rgba(120, 255, 255, ${0.7 * alpha})`);
      slashGradient.addColorStop(0.5, `rgba(220, 255, 255, ${1.0 * alpha})`);
      slashGradient.addColorStop(0.85, `rgba(140, 255, 255, ${0.7 * alpha})`);
      slashGradient.addColorStop(1, `rgba(100, 220, 255, ${0.3 * alpha})`);

      ctx.strokeStyle = slashGradient;
      ctx.lineWidth = 2 + progress * 4;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      // Sharp slash with BOTH tips pointed (diamond blade shape)
      ctx.moveTo(-effect.size * 0.55, -effect.size * 0.3);
      ctx.lineTo(-effect.size * 0.15, -effect.size * 0.06);
      ctx.lineTo(effect.size * 0.15, effect.size * 0.06);
      ctx.lineTo(effect.size * 0.55, effect.size * 0.3);
      ctx.stroke();

      // Sharp BOTTOM edge highlight
      ctx.strokeStyle = `rgba(230, 255, 255, ${0.95 * alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-effect.size * 0.45, -effect.size * 0.22);
      ctx.lineTo(-effect.size * 0.1, -effect.size * 0.03);
      ctx.lineTo(effect.size * 0.1, effect.size * 0.03);
      ctx.lineTo(effect.size * 0.45, effect.size * 0.22);
      ctx.stroke();

      // Sharp TOP edge highlight
      ctx.strokeStyle = `rgba(200, 255, 255, ${0.85 * alpha})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-effect.size * 0.5, -effect.size * 0.28);
      ctx.lineTo(-effect.size * 0.12, -effect.size * 0.05);
      ctx.lineTo(effect.size * 0.12, effect.size * 0.05);
      ctx.lineTo(effect.size * 0.5, effect.size * 0.28);
      ctx.stroke();

      // Sharp LEFT tip accent (starting point)
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * alpha})`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-effect.size * 0.55, -effect.size * 0.3);
      ctx.lineTo(-effect.size * 0.35, -effect.size * 0.18);
      ctx.stroke();

      // Sharp RIGHT tip accent (ending point)
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(effect.size * 0.45, effect.size * 0.22);
      ctx.lineTo(effect.size * 0.55, effect.size * 0.3);
      ctx.stroke();

      // Clear shadow effects before drawing complex shapes and particles to prevent severe FPS drops
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // Sharp diamond/blade glow fill - BOTH tips sharp
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(140, 255, 255, ${0.45 * alpha})`;
      ctx.beginPath();
      // Left sharp tip
      ctx.moveTo(-effect.size * 0.55, -effect.size * 0.3);
      ctx.lineTo(-effect.size * 0.2, -effect.size * 0.08);
      ctx.lineTo(effect.size * 0.2, effect.size * 0.08);
      // Right sharp tip
      ctx.lineTo(effect.size * 0.55, effect.size * 0.3);
      ctx.lineTo(effect.size * 0.2, effect.size * 0.08);
      ctx.lineTo(-effect.size * 0.2, -effect.size * 0.08);
      ctx.closePath();
      ctx.fill();

      // Sharp edge particles - small angular debris flying from both tips
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(200, 255, 255, ${0.8 * alpha})`;
      // Particles from LEFT tip
      const leftParticleAngles = [-0.6, -0.3, 0.1, 0.4];
      leftParticleAngles.forEach((pAngle, idx) => {
        const pDist = effect.size * (0.25 + idx * 0.12);
        const px = -effect.size * 0.5 + Math.cos(pAngle) * pDist;
        const py = -effect.size * 0.25 + Math.sin(pAngle) * pDist;
        const pSize = (1.2 + idx * 0.4) * (1 - progress * 0.5);
        ctx.beginPath();
        // Diamond shape for sharp particles
        ctx.moveTo(px, py - pSize);
        ctx.lineTo(px + pSize * 0.5, py);
        ctx.lineTo(px, py + pSize);
        ctx.lineTo(px - pSize * 0.5, py);
        ctx.closePath();
        ctx.fill();
      });
      // Particles from RIGHT tip
      const rightParticleAngles = [2.5, 2.8, 3.1, 3.5];
      rightParticleAngles.forEach((pAngle, idx) => {
        const pDist = effect.size * (0.25 + idx * 0.12);
        const px = effect.size * 0.5 + Math.cos(pAngle) * pDist;
        const py = effect.size * 0.25 + Math.sin(pAngle) * pDist;
        const pSize = (1.2 + idx * 0.4) * (1 - progress * 0.5);
        ctx.beginPath();
        // Diamond shape for sharp particles
        ctx.moveTo(px, py - pSize);
        ctx.lineTo(px + pSize * 0.5, py);
        ctx.lineTo(px, py + pSize);
        ctx.lineTo(px - pSize * 0.5, py);
        ctx.closePath();
        ctx.fill();
      });

      ctx.restore();
    }
  }

  // Try melee attack with crescent blade
  _tryMeleeAttack(opponent, ownerIndex) {
    if (!opponent || this.meleeCooldown > 0) return;
    
    const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    if (dist > this.r + opponent.r + CONFIG.cronos.meleeRange) return;

    // Hit!
    this.meleeSwingAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.meleeSwingActive = true;
    this.meleeSwingTimer = CONFIG.cronos.meleeSwingDuration;

    const sound = getBasicAttackSound(this._def.id, this._def.type);
    this._attackSoundTimer = sound.delay;
    this._attackSoundConfig = sound;
    
    // Check if Cronos is inside his own sphere for different damage and cooldown
    let meleeDamage = CONFIG.cronos.meleeDamage;
    let meleeCooldown = CONFIG.cronos.meleeCooldown;
    let hitText = 'SLASH!';
    if (this.sphereActive) {
      const distToSphere = Math.hypot(this.x - this.sphereX, this.y - this.sphereY);
      if (distToSphere <= CONFIG.cronos.sphereRadius) {
        meleeDamage = CONFIG.cronos.sphereMeleeDamage;
        meleeCooldown = CONFIG.cronos.sphereMeleeCooldown;
        hitText = 'POWER SLASH!';
      }
    }
    this.meleeCooldown = meleeCooldown;
    this._spawnAttackSlashEffect();
    
    applyDamageToTarget(opponent, meleeDamage, this, { isMelee: true });
    spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, hitText, '#FF007F');

    // Passive stop chance on hit
    if (Math.random() < CONFIG.cronos.passiveStopChance) {
      if (opponent.applyTimeStop) {
        if (!opponent.timeStopTimer || opponent.timeStopTimer <= 0) {
          opponent.applyTimeStop(CONFIG.cronos.passiveStopDuration);
          opponent._suppressFreezeTimer = true;
          spawnFloatingText(opponent.x, opponent.y - opponent.r - 15, 'STOPPED!', '#00F3FF');
        } else {
          // Just refresh silently
          opponent.applyTimeStop(CONFIG.cronos.passiveStopDuration);
        }
      }
    }
  }

  _isInsideOwnSphere() {
    if (!this.sphereActive) return false;
    const distToSphere = Math.hypot(this.x - this.sphereX, this.y - this.sphereY);
    return distToSphere <= CONFIG.cronos.sphereRadius;
  }

  handlePoison() {
    if (this.poisonTicks > 0) {
      this.poisonTimer++;

      const grenadierCfg = CONFIG.grenadier || {};
      const intervalFrames = (typeof grenadierCfg.poisonIntervalFrames === 'number')
        ? grenadierCfg.poisonIntervalFrames
        : 60;

      const damagePerTick = (typeof grenadierCfg.poisonDamagePerTick === 'number')
        ? grenadierCfg.poisonDamagePerTick
        : 2;

      if (this.poisonTimer >= intervalFrames) {
        if (!this._isInsideOwnSphere()) {
          this.takeDamage(damagePerTick, this.lastPoisonAttacker);
          spawnFloatingText(this.x, this.y - this.r - 5, 'POISON!', '#77ff77');
          this.poisonTicks--;
        }
        this.poisonTimer = 0;
      }
    }
  }

  handleBurn() {
    if (this.burnTimer > 0) {
      this.burnTimer--;
      this.burnDamageTimer++;
      if (this.burnDamageTimer >= CONFIG.orange.burnDamageInterval) {
        if (!this._isInsideOwnSphere()) {
          const damage = CONFIG.orange.burnDamagePerSecond;
          this.takeDamage(damage, this.lastBurnAttacker, { isBurn: true });
          spawnFloatingText(this.x, this.y - this.r - 5, 'BURN!', '#ff6600');
        }
        this.burnDamageTimer = 0;
      }
    }
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    // Handle sphere cooldown
    if (this.sphereCooldown > 0) {
      this.sphereCooldown--;
    }

    // Handle melee cooldown
    if (this.meleeCooldown > 0) {
      this.meleeCooldown--;
    }

    this._updateAttackSlashEffects();

    // Handle melee swing animation
    if (this.meleeSwingActive) {
      this.meleeSwingTimer--;
      if (this.meleeSwingTimer <= 0) {
        this.meleeSwingActive = false;
        this.meleeSlashFadeTimer = 15; // Delay before it disappears (fade out)
      }
    } else if (this.meleeSlashFadeTimer > 0) {
      this.meleeSlashFadeTimer--;
    }

    // Handle active time stop sphere
    if (this.sphereActive) {
      this.sphereTimer--;
      this._applyCronosSpeed();

      // Freeze fighters that enter the sphere (re-apply each frame)
      // Stealthed assassins (invincibilityTimer or flashStepTimer > 0) are ignored by the sphere
      if (state && state.fighters) {
        for (const fighter of state.fighters) {
          if (fighter && fighter !== this && fighter.hp > 0) {
            // Skip stealthed assassins - they phase through the sphere
            if (fighter.invincibilityTimer > 0 || fighter.flashStepTimer > 0) continue;

            const dist = Math.hypot(fighter.x - this.sphereX, fighter.y - this.sphereY);
            if (dist <= CONFIG.cronos.sphereRadius) {
                // Calculate remaining frames so we don't reset visual timer when reapplying
                let remaining = fighter.timeStopTimer || 0;
                if (fighter._timeStopOriginalDuration && fighter._timeStopStartTime) {
                  const elapsedMs = performance.now() - fighter._timeStopStartTime;
                  const elapsedFrames = (elapsedMs / 1000) * 60;
                  remaining = Math.max(0, fighter._timeStopOriginalDuration - elapsedFrames);
                }
                if (remaining <= 0) {
                  fighter.applyTimeStop(CONFIG.cronos.sphereDuration);
                  // Save and zero velocities so fighters are hard-stopped by sphere
                  if (typeof fighter._resumeVx !== 'number') fighter._resumeVx = fighter.vx;
                  if (typeof fighter._resumeVy !== 'number') fighter._resumeVy = fighter.vy;
                  fighter.vx = 0;
                  fighter.vy = 0;
                  fighter._frozenByCronosSphere = true;
                }
                // Suppress per-fighter freeze timer display because the sphere shows duration
                fighter._suppressFreezeTimer = true;
            }
          }
        }
      }

      // PRIORITY LOCK: Prefer nearest fighter INSIDE the sphere over the global nearest opponent.
      // This makes Cronos chase and melee fighters trapped in his time-stop sphere first.
      // Stealthed assassins are ignored - they phase through the sphere completely.
      // Teammates are frozen by the sphere but NOT targeted for attacks.
      let sphereTarget = null;
      let sphereTargetDist = Infinity;
      if (state && state.fighters) {
        const selfIndex = state.fighters.indexOf(this);
        const selfTeam = state.getFighterTeam(selfIndex);

        for (const [fi, f] of state.fighters.entries()) {
          if (!f || f === this || f.hp <= 0) continue;
          // Skip teammates - they are frozen by sphere but not targeted for attacks
          if (state.mode === GAME_MODES.TWO_VS_TWO && selfTeam !== null && state.getFighterTeam(fi) === selfTeam) continue;
          // Skip stealthed assassins - they are invisible to Cronos
          if (f.invincibilityTimer > 0 || f.flashStepTimer > 0) continue;

          const distToSphere = Math.hypot(f.x - this.sphereX, f.y - this.sphereY);
          if (distToSphere <= CONFIG.cronos.sphereRadius) {
            const distToMe = Math.hypot(f.x - this.x, f.y - this.y);
            if (distToMe < sphereTargetDist) {
              sphereTargetDist = distToMe;
              sphereTarget = f;
            }
          }
        }
      }
      if (state && state.illusions) {
        for (const illusion of state.illusions) {
          if (!illusion || illusion.hp <= 0) continue;
          
          // Skip if owner is a teammate
          if (state.mode === GAME_MODES.TWO_VS_TWO && selfTeam !== null) {
            const ownerIndex = state.fighters.indexOf(illusion.owner);
            if (ownerIndex >= 0 && state.getFighterTeam(ownerIndex) === selfTeam) continue;
          }

          const distToSphere = Math.hypot(illusion.x - this.sphereX, illusion.y - this.sphereY);
          if (distToSphere <= CONFIG.cronos.sphereRadius) {
            const distToMe = Math.hypot(illusion.x - this.x, illusion.y - this.y);
            if (distToMe < sphereTargetDist) {
              sphereTargetDist = distToMe;
              sphereTarget = illusion;
            }
          }
        }
      }
      
      if (sphereTarget) {
        opponent = sphereTarget; // override: lock onto the fighter/illusion trapped inside the sphere
        this._targetInsideSphere = true;
      } else {
        this._targetInsideSphere = false;
      }

      // Freeze projectiles that enter the sphere
      // ── Decoupled: move them to frozenProjectiles array instead of freezing in-place ──
      const myIndex = state.fighters.indexOf(this);
      const maxFrozen = CONFIG.cronos.maxFrozenProjectiles || 25;
      const currentFrozen = projectileSystem.frozenProjectiles.filter(
        p => p && p.frozenBySphereId === myIndex
      ).length;

      for (let i = projectileSystem.projectiles.length - 1; i >= 0; i--) {
        const p = projectileSystem.projectiles[i];
        if (!p || p.frozenByCronosSphere) continue; // already frozen by some sphere
        if (currentFrozen >= maxFrozen) break;
        const dist = Math.hypot(p.x - this.sphereX, p.y - this.sphereY);
        if (dist <= CONFIG.cronos.sphereRadius) {
          // Save velocity for restoration
          p._resumeVx = p.vx;
          p._resumeVy = p.vy;
          p._resumeVz = p.vz;
          p.vx = 0;
          p.vy = 0;
          p.vz = 0;

          // Track which sphere owns this frozen projectile
          p.stoppedByCronosSphere = true;
          p.frozenByCronosSphere = true;
          p.frozenBySphereId = myIndex;
          p.frozenByFighterIndex = myIndex;

          // Move to frozen array (O(1) swap-pop)
          projectileSystem.projectiles[i] = projectileSystem.projectiles[projectileSystem.projectiles.length - 1];
          projectileSystem.projectiles.pop();
          projectileSystem.frozenProjectiles.push(p);
        }
      }
      
      // Check if sphere expired
      if (this.sphereTimer <= 0) {
        // Resume fighters that were frozen by this sphere
        if (state && state.fighters) {
          for (const fighter of state.fighters) {
            if (fighter && fighter !== this && fighter.hp > 0 && fighter.timeStopTimer > 0) {
              fighter.timeStopTimer = 0;
              // Restore velocities for fighters frozen by this sphere
              if (fighter._frozenByCronosSphere) {
                if (typeof fighter._resumeVx === 'number') fighter.vx = fighter._resumeVx;
                if (typeof fighter._resumeVy === 'number') fighter.vy = fighter._resumeVy;
                delete fighter._resumeVx;
                delete fighter._resumeVy;
                delete fighter._frozenByCronosSphere;
              }
              // Clear sphere-driven suppression so normal per-fighter timers can show again
              delete fighter._suppressFreezeTimer;
            }
          }
        }

        // Resume projectiles that were frozen by this sphere
        // ── Decoupled: use _restoreFrozenProjectiles to move them back to active array ──
        const myIndex = state.fighters.indexOf(this);
        const restored = projectileSystem._restoreFrozenProjectiles(myIndex);
        if (restored > 0) {
          // Optionally spawn a visual effect for restored projectiles
        }
        this.sphereActive = false;
        this.speed = this.baseSpeed;
        spawnFloatingText(this.sphereX, this.sphereY - CONFIG.cronos.sphereRadius - 10, 'SPHERE ENDED', '#00F3FF');
      }
    } else {
      // Normal speed when sphere is not active
      this._applyCronosSpeed();

      // Try to deploy sphere when cooldown is ready and opponent is within activation distance
      if (this.sphereCooldown === 0 && opponent) {
        const distToOpponent = Math.hypot(opponent.x - this.x, opponent.y - this.y);
        if (distToOpponent <= CONFIG.cronos.sphereActivationDistance) {
          this.deployTimeStopSphere();
        }
      }
    }

    // Decay sphere impact effect (outside if/else so it runs every frame)
    if (this.sphereImpactTimer > 0) {
      this.sphereImpactTimer--;
    }

    // Movement
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    this.aim(opponent);
    
    // Custom bounce with sphere mechanics
    this.resolveWallBounce(arena, opponent);

    // Try melee attack
    if (opponent) {
      this._tryMeleeAttack(opponent, ownerIndex);
    }
  }

  deployTimeStopSphere() {
    this.sphereActive = true;
    this.sphereTimer = CONFIG.cronos.sphereDuration;
    this.sphereCooldown = CONFIG.cronos.sphereCooldown;
    this.sphereImpactTimer = 25; // frames for impact burst effect
    this.meleeCooldown = 0; // Reset melee cooldown to remove the attack delay
    
    // Store the deployment location
    this.sphereX = this.x;
    this.sphereY = this.y;
    
    spawnFloatingText(this.x, this.y - this.r - 15, 'TIME STOP!', '#00F3FF');
    // Play cronosphere sound
    const sphereSound = getSkillSound('cronos', 'sphere');
    if (sphereSound) playSound(sphereSound.src, sphereSound.volume);
    
    // Apply time stop to all other fighters and projectiles
    if (state && state.fighters) {
      for (const fighter of state.fighters) {
        if (fighter && fighter !== this && fighter.hp > 0) {
          const dist = Math.hypot(fighter.x - this.sphereX, fighter.y - this.sphereY);
          if (dist <= CONFIG.cronos.sphereRadius) {
            // Calculate remaining frames so we don't reset visual timer when reapplying
            let remaining = fighter.timeStopTimer || 0;
            if (fighter._timeStopOriginalDuration && fighter._timeStopStartTime) {
              const elapsedMs = performance.now() - fighter._timeStopStartTime;
              const elapsedFrames = (elapsedMs / 1000) * 60;
              remaining = Math.max(0, fighter._timeStopOriginalDuration - elapsedFrames);
            }
            if (remaining <= 0) {
              fighter.applyTimeStop(CONFIG.cronos.sphereDuration);
              // Save and zero velocities so fighters are hard-stopped by sphere
              if (typeof fighter._resumeVx !== 'number') fighter._resumeVx = fighter.vx;
              if (typeof fighter._resumeVy !== 'number') fighter._resumeVy = fighter.vy;
              fighter.vx = 0;
              fighter.vy = 0;
              fighter._frozenByCronosSphere = true;
            }
            // Suppress per-fighter freeze timer display because the sphere shows duration
            fighter._suppressFreezeTimer = true;
          }
        }
      }
    }
    
    // Stop projectiles in sphere area
    // ── Decoupled: move them to frozenProjectiles array instead of freezing in-place ──
    const myIndex = state.fighters.indexOf(this);
    const maxFrozen = CONFIG.cronos.maxFrozenProjectiles || 25;
    const currentFrozen = projectileSystem.frozenProjectiles.filter(
      p => p && p.frozenBySphereId === myIndex
    ).length;

    for (let i = projectileSystem.projectiles.length - 1; i >= 0; i--) {
      const p = projectileSystem.projectiles[i];
      if (!p || p.frozenByCronosSphere) continue;
      if (currentFrozen >= maxFrozen) break;
      const dist = Math.hypot(p.x - this.sphereX, p.y - this.sphereY);
      if (dist <= CONFIG.cronos.sphereRadius) {
        // Save velocity for restoration
        p._resumeVx = p.vx;
        p._resumeVy = p.vy;
        p._resumeVz = p.vz;
        p.vx = 0;
        p.vy = 0;
        p.vz = 0;

        // Track which sphere owns this frozen projectile
        p.stoppedByCronosSphere = true;
        p.frozenByCronosSphere = true;
        p.frozenBySphereId = myIndex;
        p.frozenByFighterIndex = myIndex;

        // Move to frozen array (O(1) swap-pop)
        projectileSystem.projectiles[i] = projectileSystem.projectiles[projectileSystem.projectiles.length - 1];
        projectileSystem.projectiles.pop();
        projectileSystem.frozenProjectiles.push(p);
      }
    }
  }

  resolveWallBounce(arena, opponent) {
    let bounced = false;
    let bouncedX = false;
    let bouncedY = false;

    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      bounced = true;
      bouncedX = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      bounced = true;
      bouncedX = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      bounced = true;
      bouncedY = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      bounced = true;
      bouncedY = true;
    }

    if (this.sphereActive) {
      const distToSphere = Math.hypot(this.x - this.sphereX, this.y - this.sphereY);
      if (distToSphere > CONFIG.cronos.sphereRadius) {
        const sphereDist = Math.max(distToSphere, 0.0001);
        const nx = (this.x - this.sphereX) / sphereDist;
        const ny = (this.y - this.sphereY) / sphereDist;
        this.x = this.sphereX + nx * CONFIG.cronos.sphereRadius;
        this.y = this.sphereY + ny * CONFIG.cronos.sphereRadius;

        const dot = this.vx * nx + this.vy * ny;
        if (dot > 0) {
          this.vx -= 2 * dot * nx;
          this.vy -= 2 * dot * ny;
        }
        
        // Normalize speed and apply multiplier
        const bounceMultiplier = CONFIG.cronos.sphereBounceForce;
        let targetSpeed = (Math.hypot(this.vx, this.vy) || this.speed) * bounceMultiplier;
        
        if (opponent) {
           const dx = opponent.x - this.x;
           const dy = opponent.y - this.y;
           const dist = Math.hypot(dx, dy) || 1;
           const homingVx = (dx / dist) * targetSpeed;
           const homingVy = (dy / dist) * targetSpeed;
           
           // Check if homing direction points OUTWARD (which would make him stick to the wall)
           const dotHoming = homingVx * nx + homingVy * ny;
           if (dotHoming > 0) {
             // Reflect the homing velocity inwards!
             this.vx = homingVx - 2 * dotHoming * nx;
             this.vy = homingVy - 2 * dotHoming * ny;
           } else {
             // Safe to just point directly at the opponent
             this.vx = homingVx;
             this.vy = homingVy;
           }
        } else {
           const speedMagnitude = Math.hypot(this.vx, this.vy);
           if (speedMagnitude > 0) {
              this.vx = (this.vx / speedMagnitude) * targetSpeed;
              this.vy = (this.vy / speedMagnitude) * targetSpeed;
           }
        }

        bounced = true;
      }
    }

    if (bounced) {
      const wallBounced = bouncedX || bouncedY;
      if (wallBounced) this.playWallBounceSound();
      // Enhanced bounce inside sphere â€” lock forward toward opponent
      if (this.sphereActive) {
        const bounceMultiplier = CONFIG.cronos.sphereBounceForce;
        if (bouncedX) {
          this.vx = -this.vx * bounceMultiplier;
        }
        if (bouncedY) {
          this.vy = -this.vy * bounceMultiplier;
        }

        // Homing bounce for arena walls (opponent is always inside arena, so this is safe)
        if (bouncedX || bouncedY) {
           if (opponent) {
             const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;
             const dx = opponent.x - this.x;
             const dy = opponent.y - this.y;
             const dist = Math.hypot(dx, dy) || 1;
             this.vx = (dx / dist) * currentSpeed;
             this.vy = (dy / dist) * currentSpeed;
           } else {
             const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;
             const speedMagnitude = Math.hypot(this.vx, this.vy);
             if (speedMagnitude > 0) {
                this.vx = (this.vx / speedMagnitude) * currentSpeed;
                this.vy = (this.vy / speedMagnitude) * currentSpeed;
             }
           }
        }
      } else {
        // Normal bounce
        if (bouncedX) {
          this.vx = -this.vx;
        }
        if (bouncedY) {
          this.vy = -this.vy;
        }

        // Smart bounce toward opponent if available
        if (opponent) {
          const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;
          const dx = opponent.x - this.x;
          const dy = opponent.y - this.y;
          const dist = Math.hypot(dx, dy) || 1;
          this.vx = (dx / dist) * currentSpeed;
          this.vy = (dy / dist) * currentSpeed;
        }
      }
    }
  }

  drawBody(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const baseRadius = this.r;
    const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius);
    bodyGradient.addColorStop(0, '#b8ffff');
    bodyGradient.addColorStop(0.35, '#00d5ff');
    bodyGradient.addColorStop(1, '#081434');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const sheen = ctx.createRadialGradient(-baseRadius * 0.2, -baseRadius * 0.2, 0, 0, 0, baseRadius);
    sheen.addColorStop(0, 'rgba(255,255,255,0.24)');
    sheen.addColorStop(0.65, 'rgba(0,243,255,0.00)');
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 1;
    const hexSize = Math.max(4, baseRadius * 0.22);
    const xOffset = hexSize * 1.75;
    const yOffset = hexSize * 1.52;
    for (let row = -3; row <= 3; row++) {
      for (let col = -3; col <= 3; col++) {
        const x = col * xOffset + ((row % 2) ? xOffset * 0.5 : 0);
        const y = row * yOffset;
        if (Math.hypot(x, y) > baseRadius * 0.92) continue;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI / 6 + i * Math.PI / 3;
          const px = x + Math.cos(angle) * hexSize;
          const py = y + Math.sin(angle) * hexSize;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#00d7ff';
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,0,127,0.35)';
    ctx.lineWidth = 1.25;
    for (let i = 0; i < 5; i++) {
      const ang = i * (Math.PI * 2 / 5) + this.angle * 0.5;
      const inner = baseRadius * 0.38;
      const outer = baseRadius * 0.82;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner);
      ctx.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
      ctx.stroke();
    }
    ctx.restore();

    this.drawStatusOverlays(ctx, baseRadius);

    ctx.restore();
  }

  drawOutline(ctx) {
    // Weapon visual will be added to weaponVisuals.js
    drawCronosCrescentBlade(ctx, this.x, this.y, this.gunAngle, this.r, this.meleeSwingActive, this.meleeSwingTimer, this.meleeSwingAngle, CONFIG.cronos.meleeSwingDuration);
  }

  // Override drawGun to prevent the base class weapon from being drawn
  // Cronos uses the crescent blade visual instead
  drawGun(ctx) {
    // Empty - Cronos doesn't use a normal weapon
  }

  draw(ctx) {
    // Draw pre-activation barrier â€” stays visible from pre-activate window
    // all the way until the sphere is actually unleashed.
    const inPreWindow = this.sphereCooldown > 0 && this.sphereCooldown <= CONFIG.cronos.spherePreActivateFrames;
    const sphereReady  = !this.sphereActive && this.sphereCooldown === 0;
    if (inPreWindow || sphereReady) {
      const now = Date.now();
      const progress = sphereReady
        ? 1  // full intensity when fully charged
        : 1 - this.sphereCooldown / Math.max(1, CONFIG.cronos.spherePreActivateFrames);
      const barrierRadius = Math.max(this.r * 1.5, 55);
      drawCronosPreActivateBarrier({
        ctx,
        cx: this.x,
        cy: this.y,
        radius: barrierRadius,
        preProgress: progress,
        now,
      });
    }

    // Draw sphere impact burst when sphere is first unleashed
    if (this.sphereImpactTimer > 0) {
      const now = Date.now();
      const impactProgress = 1 - this.sphereImpactTimer / 25;
      drawCronosSphereImpact({
        ctx,
        cx: this.x,
        cy: this.y,
        radius: Math.max(this.r * 1.5, 55),
        impactProgress,
        now,
      });
    }

    // Draw time stop sphere at deployment location
    // The main sphere visual is now rendered globally via drawAllCronosSpheres()
    // so it sits at the correct z-index over illusions and fighters.
    if (this.sphereActive) {
      const now = Date.now();
      ctx.restore();
    }

    // Draw melee swing arc
    if (this.meleeSwingActive || this.meleeSlashFadeTimer > 0) {
      let swingProgress = 1.0;
      let fade = this.meleeSlashFadeTimer / 15;
      
      if (this.meleeSwingActive) {
        swingProgress = 1 - (this.meleeSwingTimer / CONFIG.cronos.meleeSwingDuration);
        fade = 1.0;
      }
      
      const arcRadius = this.r + 80;
      const innerRadius = this.r + 30;
      
      const fullStartA = -Math.PI * 0.4; // Matches start of sword swing
      const fullEndA = Math.PI * 0.4;    // Matches end of sword swing
      
      const currentEndA = fullStartA + (fullEndA - fullStartA) * swingProgress;
      
      const fullEndX = Math.cos(fullEndA) * arcRadius;
      const fullStartX = Math.cos(fullStartA) * arcRadius;
      const fullStartY = Math.sin(fullStartA) * arcRadius;
      const cx = 2 * (innerRadius - 0.25 * (fullStartX + fullEndX));
      
      const glowAlpha = Math.pow(fade, 0.8) * 0.95; 

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.meleeSwingAngle);

      // Clip region so the slash "grows" trailing the sword
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, arcRadius + 20, fullStartA - 0.1, currentEndA);
      ctx.closePath();
      ctx.clip();

      ctx.globalCompositeOperation = 'screen';
      ctx.shadowBlur = 0;

      // Draw full shape (revealed by clip)
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius, fullStartA, fullEndA);
      ctx.quadraticCurveTo(cx, 0, fullStartX, fullStartY);
      ctx.closePath();

      // Dynamic gradient that anchors bright tip to current sword position
      const currentY = Math.sin(currentEndA) * arcRadius;
      const gradEndY = Math.max(fullStartY + 0.1, currentY); 
      
      const slashGrad = ctx.createLinearGradient(0, fullStartY, 0, gradEndY);
      slashGrad.addColorStop(0, 'rgba(0, 229, 255, 0.0)');
      slashGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.4)');
      slashGrad.addColorStop(0.85, 'rgba(180, 255, 255, 0.85)');
      slashGrad.addColorStop(1, 'rgba(255, 255, 255, 0.9)');

      ctx.fillStyle = slashGrad;
      ctx.globalAlpha = glowAlpha;
      ctx.fill();
      
      // Outer edge
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius, fullStartA, fullEndA);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = glowAlpha * 0.85;
      ctx.stroke();
      
      // Inner trail
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius - 14, fullStartA * 0.8, fullEndA * 0.9);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = glowAlpha * 0.6;
      ctx.stroke();

      // Secondary clip: Restrict the honeycomb exactly to the crescent body
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius, fullStartA, fullEndA);
      ctx.quadraticCurveTo(cx, 0, fullStartX, fullStartY);
      ctx.closePath();
      ctx.clip(); // This intersects with the pie-slice clip from earlier!

      // Honeycomb Texture Overlay
      ctx.globalCompositeOperation = 'screen';
      ctx.shadowBlur = 0; // Disable shadow for clean texture lines
      
      const hexAngle = Math.PI / 3;
      const cosA = [Math.cos(Math.PI/6), Math.cos(Math.PI/6+hexAngle), Math.cos(Math.PI/6+hexAngle*2), Math.cos(Math.PI/6+hexAngle*3), Math.cos(Math.PI/6+hexAngle*4), Math.cos(Math.PI/6+hexAngle*5)];
      const sinA = [Math.sin(Math.PI/6), Math.sin(Math.PI/6+hexAngle), Math.sin(Math.PI/6+hexAngle*2), Math.sin(Math.PI/6+hexAngle*3), Math.sin(Math.PI/6+hexAngle*4), Math.sin(Math.PI/6+hexAngle*5)];
      
      const cellSize = 8;
      const cellOffsetX = cellSize * 1.75;
      const cellOffsetY = cellSize * 1.52;
      
      const minX = 0;
      const maxX = arcRadius;
      const minY = -arcRadius;
      const maxY = arcRadius;
      
      const colStart = Math.floor(minX / cellOffsetX) - 1;
      const colEnd = Math.ceil(maxX / cellOffsetX) + 1;
      const rowStart = Math.floor(minY / cellOffsetY) - 1;
      const rowEnd = Math.ceil(maxY / cellOffsetY) + 1;
      
      ctx.beginPath();
      for (let row = rowStart; row <= rowEnd; row++) {
        for (let col = colStart; col <= colEnd; col++) {
          const x = col * cellOffsetX + (row % 2 ? cellOffsetX * 0.5 : 0);
          const y = row * cellOffsetY;
          if (x < minX || x > maxX || y < minY || y > maxY) continue;
          
          for (let i = 0; i < 6; i++) {
            const px = x + cosA[i] * cellSize;
            const py = y + sinA[i] * cellSize;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        }
      }
      
      // Use the exact same dynamic gradient as the slash body so the texture smoothly fades towards the tail
      ctx.strokeStyle = slashGrad; 
      ctx.lineWidth = 1.5;
      // glowAlpha already scales the overall transparency
      ctx.globalAlpha = glowAlpha * 1.2; 
      ctx.stroke();

      ctx.restore();
    }

    super.draw(ctx);
  }
}

/**
 * Bomber Fighter (Brown)
 * Throws grenades that explode on impact with AOE damage.
 * Passive: Chance to throw sticky bombs that attach to enemies.
 * Skill: Plants C4 bombs that explode after a delay.
 * Unique: Leaves a powerful C4 bomb on death.
 */

export function drawAllCronosSpheres(ctx) {
  const now = Date.now();
  for (const fighter of state.fighters) {
    if (!fighter || !fighter.sphereActive) continue;
    const elapsed = CONFIG.cronos.sphereDuration - fighter.sphereTimer;
    const deployProgress = Math.min(1, Math.max(0, elapsed / Math.max(1, CONFIG.cronos.sphereDuration)));

    // Count frozen projectiles in this sphere for LOD
    // ── Decoupled: frozen projectiles are in the separate frozenProjectiles array ──
    let frozenCount = 0;
    if (projectileSystem && projectileSystem.frozenProjectiles) {
      for (const proj of projectileSystem.frozenProjectiles) {
        if (proj && proj.frozenBySphereId === state.fighters.indexOf(fighter)) {
          frozenCount++;
        }
      }
    }

    try {
      if (typeof drawCronosSphereVisual === 'function') {
        drawCronosSphereVisual({
          ctx,
          cx: fighter.sphereX,
          cy: fighter.sphereY,
          radius: CONFIG.cronos.sphereRadius,
          alpha: 0.9,
          deployProgress,
          now,
          frozenCount,
        });
      }
    } catch (e) {
      // Fallback simple sphere
      const pulse = Math.sin(now / 150) * 0.1 + 1;
      const alpha = 0.15 + Math.sin(now / 200) * 0.05;
      ctx.save();
      ctx.beginPath();
      ctx.arc(fighter.sphereX, fighter.sphereY, CONFIG.cronos.sphereRadius * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 243, 255, ${alpha})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
}

// Global mapping of type strings to Class definitions
