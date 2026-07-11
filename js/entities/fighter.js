// ─────────────────────────────────────────────
// BASE FIGHTER CLASS
// ─────────────────────────────────────────────
import { CONFIG, GUN_TIP_DIST } from '../core/config.js';
import { MODE_HP_MULTIPLIER, MODE_SPEED_MULTIPLIER, GAME_MODES } from '../core/modeConfig.js';
import { projectileSystem } from '../systems/projectileSystem.js';
import { playSound, stopAllSounds, stopAllLoopingSounds } from '../systems/soundSystem.js';
import { getBasicAttackSound } from '../soundEffects/basicAttackSounds.js';
import { spawnDeathShatter } from '../graphics/particles/deathShatterEffect.js';
import { spawnBloodEffect } from '../graphics/particles/bloodEffect.js';
import { spawnIllusionDeath } from '../graphics/particles/illusionDeathEffect.js';
import { getAnnouncerSound } from '../soundEffects/announcerSounds.js';
import { flamewardenFlameSystem } from '../graphics/weapons/flamewardenWeaponGraphics.js';
// Note: `state` is imported for use inside function bodies only.
// This circular dep (fighter ↔ state) is safe because state is only
// accessed at call time, never at module evaluation time.
import { state, spawnFloatingText, recordWin, recordLoss } from '../core/state.js';

export function applyDamageToTarget(target, amount, attacker, opts = {}) {
  if (!target) return false;

  if (target.isIllusion) {
    let currentHp = Number(target.hp);
    if (!Number.isFinite(currentHp)) {
      currentHp = 0;
    }

    amount = Number(amount);
    if (!Number.isFinite(amount)) {
      amount = 0;
    }

    const multiplier = Number(CONFIG.doppleganger?.illusionDamageReceivedMultiplier || 1);
    const effectiveAmount = amount * multiplier;
    const prevHp = currentHp;
    target.hp = Math.max(0, Number((currentHp - effectiveAmount).toFixed(2)));

    if (target.hp < prevHp && effectiveAmount > 0) {
      // No floating text for illusion damage
      if (target.hp <= 0) {
        spawnIllusionDeath(target);
        const idx = state.illusions?.findIndex((illusion) => illusion === target);
        if (idx >= 0) {
          state.illusions.splice(idx, 1);
        }
      }
      return true;
    }

    return false;
  }

  return target.takeDamage(amount, attacker, opts);
}

export class Fighter {
  constructor(def) {
    this._def = def;
    this.id = def.id;
    this.name = def.name;
    this.color = def.color;
    
    const sizeMult = CONFIG.globalFighter?.sizeMultiplier ?? 1.0;
    this.r = def.radius * sizeMult;
    this.aimbot = def.aimbot || false;
    this.maxHp = def.hp || 100;
    this.damage = def.damage || 10;
    this.shootCooldownMax = def.cooldown || CONFIG.shoot.cooldown;
    this.lastKilledDef = null;
    
    this.reset();
  }

  /** Restores all dynamic values to their initial states. */
  reset() {
    const d = this._def;
    this.x = d.startX;
    this.y = d.startY;

    const baseHp = Number(d.hp || 100);
    // Store original base speed before any multipliers (used for spin rate calculations)
    const originalBaseSpeed = d.moveSpeed !== undefined ? d.moveSpeed : Math.hypot(d.startVx, d.startVy) || 1;
    // Apply mode speed multiplier only to movement speed, not spin rate
    const moveSpeed = originalBaseSpeed * (MODE_SPEED_MULTIPLIER[state.mode] || 1);

    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * moveSpeed;
    this.vy = Math.sin(angle) * moveSpeed;

    this.maxHp = baseHp * (MODE_HP_MULTIPLIER[state.mode] || 1);
    if (!Number.isFinite(this.maxHp) || this.maxHp <= 0) {
      console.warn('Invalid fighter maxHp, resetting to default', d, state.mode, this.maxHp);
      this.maxHp = 100;
    }
    this.hp = this.maxHp;
    if (!Number.isFinite(this.hp)) {
      this.hp = 100;
    }
    this.angle = 0;
    this.gunAngle = 0;
    this.lastKilledDef = null;
    this.shootCooldown = 0;
    this.speed = moveSpeed;
    this.baseSpeed = originalBaseSpeed; // Original speed for spin rate calculations (not affected by mode multiplier)
    
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    this.poisonTicks = 0;
    this.poisonTimer = 0;
    this.lastPoisonAttacker = null;

    this.slowTimer = 0;
    this.slowMultiplier = 1;
    this.timeStopTimer = 0;
    this._timeStopFrozenAngle = undefined;
    this._timeStopFrozenGunAngle = undefined;
    this._bhTextCooldown = 0;
    this._flameHitCooldown = 0;
    // timestamp (ms) when this fighter last took flame contact damage
    this._lastFlameHitTime = 0;
    this._flameContactDuration = 0;
    // Health bar damage shake timer (frames)
    this._healthBarShakeTimer = 0;
    // Burn effect state
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.lastBurnAttacker = null;
    this.burnSpreadCooldown = 0;
  }

  /** Returns true if this fighter is currently inside any active Cronos time-stop sphere. */
  isInsideCronosSphere() {
    if (!state || !state.fighters) return false;
    for (const f of state.fighters) {
      if (!f || !f.sphereActive || f === this) continue;
      const dist = Math.hypot(this.x - f.sphereX, this.y - f.sphereY);
      if (dist <= CONFIG.cronos.sphereRadius) return true;
    }
    return false;
  }

  applySlow(frames, multiplier) {
    // Refresh the slow if it's longer/stronger than current
    if (this.slowTimer < frames) this.slowTimer = frames;
    this.slowMultiplier = multiplier;
  }

  applyTimeStop(frames) {
    // Ensure a numeric timer field exists for legacy code that may read it
    if (!this.timeStopTimer) this.timeStopTimer = 0;

    // Preserve angles so visual rotation and gun aim remain frozen.
    if (typeof this._timeStopFrozenAngle !== 'number') this._timeStopFrozenAngle = this.angle;
    if (typeof this._timeStopFrozenGunAngle !== 'number') this._timeStopFrozenGunAngle = this.gunAngle;

    // Compute current remaining frames based on previously stored start/original values
    let currentRemaining = this.timeStopTimer || 0;
    if (this._timeStopOriginalDuration && this._timeStopStartTime) {
      const elapsedMs = performance.now() - this._timeStopStartTime;
      const elapsedFrames = (elapsedMs / 1000) * 60;
      currentRemaining = Math.max(0, this._timeStopOriginalDuration - elapsedFrames);
    }

    // Only reset the visual timer/start time if the new duration extends the current remaining time.
    // This prevents the active sphere re-applying every frame from locking the displayed countdown.
    if (frames > currentRemaining) {
      this._timeStopOriginalDuration = frames;
      this._timeStopStartTime = performance.now();
      // update legacy frame counter too so code that relies on it sees the refreshed value
      if (this.timeStopTimer < frames) this.timeStopTimer = frames;
    } else {
      // Ensure legacy timer is at least as large as remaining if not resetting start time
      if (this.timeStopTimer < currentRemaining) this.timeStopTimer = Math.ceil(currentRemaining);
    }
  }


  _handleTimeStop() {
    // Return true when time stop is active (and handled) to allow callers to short-circuit.
    if (this.timeStopTimer > 0) {
      this.timeStopTimer--;
      if (typeof this._timeStopFrozenAngle === 'number') {
        this.angle = this._timeStopFrozenAngle;
      }
      if (typeof this._timeStopFrozenGunAngle === 'number') {
        this.gunAngle = this._timeStopFrozenGunAngle;
      }
      if (this.timeStopTimer <= 0) {
        this.timeStopTimer = 0;
        delete this._suppressFreezeTimer;
        // Restore any saved velocities (from counter or sphere freezes)
        if (typeof this._resumeVx === 'number') {
          this.vx = this._resumeVx;
          delete this._resumeVx;
        }
        if (typeof this._resumeVy === 'number') {
          this.vy = this._resumeVy;
          delete this._resumeVy;
        }
        delete this._timeStopFrozenAngle;
        delete this._timeStopFrozenGunAngle;
        delete this._timeStopOriginalDuration;
        delete this._timeStopStartTime;
      }
      return true;
    }
    return false;
  }

  applyPoison(attacker) {
    // ===== Poison tuning =====
    const grenadierCfg = CONFIG.grenadier || {};
    const ticks = (typeof grenadierCfg.poisonTicks === 'number')
      ? grenadierCfg.poisonTicks
      : 2;


    this.poisonTicks = ticks;
    this.poisonTimer = 0;
    this.lastPoisonAttacker = attacker;
  }



  applyBurn(attacker) {
    this.burnTimer = CONFIG.orange.burnDuration;
    this.burnDamageTimer = 0;
    this.lastBurnAttacker = attacker;
  }

  onDamageDealt(target, projectile, ownerIndex) {
    // Override in subclasses for special attack effects.
  }

  handlePoison() {
    if (this.poisonTicks > 0) {

      this.poisonTimer++;

      // ===== Poison tuning =====
      const grenadierCfg = CONFIG.grenadier || {};
      const intervalFrames = (typeof grenadierCfg.poisonIntervalFrames === 'number')
        ? grenadierCfg.poisonIntervalFrames
        : 60;

      const damagePerTick = (typeof grenadierCfg.poisonDamagePerTick === 'number')
        ? grenadierCfg.poisonDamagePerTick
        : 2;


      if (this.poisonTimer >= intervalFrames) {
        this.takeDamage(damagePerTick, this.lastPoisonAttacker, { isPoison: true });
        this.poisonTicks--;
        this.poisonTimer = 0;
      }
    }
  }

  handleBurn() {
    if (this.burnTimer > 0) {
      this.burnTimer--;
      this.burnDamageTimer++;
      if (this.burnDamageTimer >= CONFIG.orange.burnDamageInterval) {
        const damage = CONFIG.orange.burnDamagePerSecond;
        this.takeDamage(damage, this.lastBurnAttacker, { isBurn: true });
        this.burnDamageTimer = 0;
      }
    }
  }

  /** Per-frame housekeeping for cooldowns. */
  _tickCooldowns() {
    if (this._bhTextCooldown > 0) this._bhTextCooldown--;
    if (this._flameHitCooldown > 0) this._flameHitCooldown--;
    if (this.burnSpreadCooldown > 0) this.burnSpreadCooldown--;
    if (this._healthBarShakeTimer > 0) this._healthBarShakeTimer--;
    
    // Universal knockback physics (processed for all custom fighters without breaking their steering logic)
    if (this.knockbackVx !== undefined && (Math.abs(this.knockbackVx) > 0.1 || Math.abs(this.knockbackVy) > 0.1)) {
      this.x += this.knockbackVx;
      this.y += this.knockbackVy;
      
      // Check for wall bounce from knockback explicitly since custom fighters might not do it after this runs
      const arena = CONFIG.arena;
      if (arena) {
        let bounced = false;
        if (this.x - this.r < arena.x) { this.x = arena.x + this.r; this.knockbackVx = Math.abs(this.knockbackVx) * 0.8; bounced = true; }
        if (this.x + this.r > arena.x + arena.width) { this.x = arena.x + arena.width - this.r; this.knockbackVx = -Math.abs(this.knockbackVx) * 0.8; bounced = true; }
        if (this.y - this.r < arena.y) { this.y = arena.y + this.r; this.knockbackVy = Math.abs(this.knockbackVy) * 0.8; bounced = true; }
        if (this.y + this.r > arena.y + arena.height) { this.y = arena.y + arena.height - this.r; this.knockbackVy = -Math.abs(this.knockbackVy) * 0.8; bounced = true; }
      }
      
      // Decay knockback velocity
      this.knockbackVx *= 0.85;
      this.knockbackVy *= 0.85;
      
      if (Math.abs(this.knockbackVx) <= 0.1) this.knockbackVx = 0;
      if (Math.abs(this.knockbackVy) <= 0.1) this.knockbackVy = 0;
    }
  }

  /** Rescales velocity to maintain constant movement speed. */
  normalizeSpeed() {
    const mag = Math.hypot(this.vx, this.vy);
    if (mag > 0) {
      this.vx = (this.vx / mag) * this.speed;
      this.vy = (this.vy / mag) * this.speed;
    }
  }

  /** Centralized damage dealer and death/game over check.
   *  Returns true if damage was applied, false if it was blocked or ignored.
   */
  takeDamage(amount, attacker, opts = {}) {
    if (this.hp <= 0) return false;

    // Base fighter doesn't block; sanitize inputs before applying damage.
    let currentHp = Number(this.hp);
    if (!Number.isFinite(currentHp)) {
      console.warn('Invalid fighter HP detected, resetting to 0', this, this.hp);
      currentHp = 0;
    }

    amount = Number(amount);
    if (!Number.isFinite(amount)) {
      console.warn('Invalid damage amount detected, treating as 0', amount, attacker, opts);
      amount = 0;
    }

    const attackerIndex = state.fighters.indexOf(attacker);
    const targetIndex = state.fighters.indexOf(this);
    if (
      state.mode === '2v2' &&
      attackerIndex >= 0 &&
      targetIndex >= 0 &&
      attackerIndex !== targetIndex &&
      state.getFighterTeam(attackerIndex) === state.getFighterTeam(targetIndex)
    ) {
      return false;
    }

    const prevHp = currentHp;
    this.hp = Math.max(0, Number((currentHp - amount).toFixed(2)));
    // Spawn floating damage number when actual HP was reduced
    if (this.hp < prevHp && amount > 0) {
      const color = (attacker && attacker.color) ? attacker.color : (this.color || '#ff4444');
      const damageText = `${Math.round(amount)}`;
      this._healthBarShakeTimer = 12;
      if (!opts.fromBlackHole) {
        spawnFloatingText(this.x, this.y - this.r - 8, damageText, color);
      } else {
        const interval = opts.bhTextInterval || 60;
        if (this._bhTextCooldown <= 0) {
          spawnFloatingText(this.x, this.y - this.r - 8, damageText, color);
          this._bhTextCooldown = interval;
        }
      }
      // Calculate damage direction (from attacker to this fighter)
      let damageAngle = null;
      if (attacker) {
        damageAngle = Math.atan2(this.y - attacker.y, this.x - attacker.x);
      }
      // Spawn blood effect in the damage direction
      spawnBloodEffect(this, amount, damageAngle);
      
      // Play hit sound unless it's a DPS/continuous effect
      if (!opts.isPoison && !opts.isBurn && !opts.isFlame && !opts.fromBlackHole) {
        playSound('Assets/Sound Effects/Attacks/fleshhit.mp3', 0.6);
      }
    }
    if (this.hp === 0 && state.gameState === 'playing') {
      // Clear flame particles if the dying fighter is the Flamewarden
      if (this._def && this._def.type === 'orange') {
        flamewardenFlameSystem.clear();
      }
      spawnDeathShatter(this);
      
      // Play death sound
      const faah = getAnnouncerSound('faah');
      if (faah) playSound(faah.src, faah.volume, faah.speed, faah.offset || 0);

      // Helper: a Doppelganger with surviving illusions is still "in play"
      const _isEffectivelyAlive = (f) => {
        if (!f) return false;
        if (f.hp > 0) return true;
        if (f._def && f._def.type === 'doppleganger') {
          return state.illusions.some(ill => ill.owner === f && ill.hp > 0);
        }
        return false;
      };

      const realAttacker = (attacker && attacker.owner) ? attacker.owner : attacker;
      const recordKill = () => {
        if (realAttacker && realAttacker !== this) {
          realAttacker.lastKilledDef = this._def;
          const realIdx = state.fighters.indexOf(realAttacker);
          if (realIdx >= 0) {
            if (!state.matchKills) state.matchKills = [[], [], [], []];
            state.matchKills[realIdx].push(this._def);
          }
        }
      };

      // If the dying fighter is a Doppelganger with surviving illusions, don't end the round
      if (this._def && this._def.type === 'doppleganger' &&
          state.illusions.some(ill => ill.owner === this && ill.hp > 0)) {
        // Doppelganger died but illusions are still fighting — round continues
        recordKill();
        return true;
      }

      const aliveCount = state.fighters.filter((f) => f && _isEffectivelyAlive(f)).length;
      const attackerIndex = state.fighters.indexOf(attacker);
      const roundEnds = state.mode !== 'FFA' || aliveCount <= 1;

      recordKill();

      if (state.mode === '2v2') {
        // 2v2: check if a team is eliminated (including doppelganger illusions)
        const team0Alive = _isEffectivelyAlive(state.fighters[0]) || _isEffectivelyAlive(state.fighters[1]);
        const team1Alive = _isEffectivelyAlive(state.fighters[2]) || _isEffectivelyAlive(state.fighters[3]);
        
        if (!team0Alive || !team1Alive) {
          // A team has been eliminated - round ends
          const winningTeam = team0Alive ? 0 : 1;
          state.teamScores[winningTeam]++;
          state.roundWinner = state.fighters[winningTeam * 2]; // First fighter of winning team
          state.roundEndTimer = 0;

          // Stop all sounds when round ends
          stopAllSounds();
          stopAllLoopingSounds();

          const winThreshold = 2; // Best of 3
          if (state.teamScores[winningTeam] >= winThreshold) {
            state.matchWinner = state.fighters[winningTeam * 2];
            state.gameState = 'matchEnd';
          } else {
            state.gameState = 'roundEnd';
          }
        }
      } else if (state.mode !== 'FFA' && roundEnds) {
        if (attackerIndex >= 0) {
          state.scores[attackerIndex]++;
        }
        state.roundWinner = attacker;
        state.roundEndTimer = 0;

        // Stop all sounds when round ends
        stopAllSounds();
        stopAllLoopingSounds();

        const winThreshold = Math.ceil(CONFIG.rounds.max / 2);
        if (attackerIndex >= 0 && state.scores[attackerIndex] >= winThreshold) {
          // Record win/loss for leaderboard (1v1 mode only) when they become champion
          if (state.mode === GAME_MODES.ONE_VS_ONE && attacker) {
            const winnerFighterIndex = typeof attacker.fighterIndex === 'number' ? attacker.fighterIndex : attackerIndex;
            const loserIndex = winnerFighterIndex === 0 ? 1 : 0;
            const loserFighterIndex = typeof state.fighters[loserIndex]?.fighterIndex === 'number'
              ? state.fighters[loserIndex].fighterIndex
              : loserIndex;
            recordWin(winnerFighterIndex);
            recordLoss(loserFighterIndex);
          }

          state.matchWinner = attacker;
          state.gameState = 'matchEnd';
        } else {
          state.gameState = 'roundEnd';
        }
      }
    }
    return true;
  }

  /** Resolves wall collision and bounces back with varied angles. */
  resolveWallBounce(arena) {
    let bounced = false;
    const restitution = CONFIG.collision.restitution;
    const angleJitter = 3.5;  // Increased for more random bounce angles

    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      this.vx = Math.abs(this.vx) * restitution;
      this.vy += (Math.random() - 0.5) * angleJitter;
      bounced = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      this.vx = -Math.abs(this.vx) * restitution;
      this.vy += (Math.random() - 0.5) * angleJitter;
      bounced = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      this.vy = Math.abs(this.vy) * restitution;
      this.vx += (Math.random() - 0.5) * angleJitter;
      bounced = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      this.vy = -Math.abs(this.vy) * restitution;
      this.vx += (Math.random() - 0.5) * angleJitter;
      bounced = true;
    }

    if (bounced) {
      const speed = Math.hypot(this.vx, this.vy) || 1;
      const bias = (Math.random() - 0.5) * 2.0;  // Increased for stronger tangent adjustment
      const nx = this.vx / speed;
      const ny = this.vy / speed;
      const tangentX = -ny;
      const tangentY = nx;
      this.vx += tangentX * bias;
      this.vy += tangentY * bias;
      
      // Add extra randomized direction component to prevent bouncing back same way
      const randomDirectionBoost = (Math.random() - 0.5) * 1.5;
      const randomDirectionBoostOrthogonal = (Math.random() - 0.5) * 1.5;
      this.vx += randomDirectionBoost;
      this.vy += randomDirectionBoostOrthogonal;
      
      this.normalizeSpeed();
    }
  }

  /** Plays a wall bounce sound effect. */
  playWallBounceSound() {
    // Disabled as requested
  }

  /** Controls how the gun is aimed. Default aims in direction of body rotation. */
  aim(opponent) {
    this.gunAngle = this.angle;
  }

  /** Collision hook to trigger custom logic. Override in subclasses. */
  onCollide(opponent) {}

  /** Spawns a projectile using the projectile system. */
  shoot(ownerIndex) {
    if (projectileSystem) {
      projectileSystem.fireProjectile(this, ownerIndex, this.damage);
    }
    // Play attack sound with configurable timing for all fighter types
    const sound = getBasicAttackSound(this._def?.id, this._def?.type);
    this._attackSoundTimer = sound.delay;
    this._attackSoundConfig = sound;
  }

  /** Call this every frame to process pending attack sound timers. */
  _tickAttackSound() {
    if (this._attackSoundTimer !== undefined && this._attackSoundTimer !== null) {
      this._attackSoundTimer--;
      if (this._attackSoundTimer <= 0) {
        const sound = this._attackSoundConfig;
        if (sound) playSound(sound.src, sound.volume);
        this._attackSoundTimer = null;
        this._attackSoundConfig = null;
      }
    }
  }

  /** Standard per-frame update tick for basic movement, shooting, and physics. */
  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // Time stop - freeze movement if time stopped
    if (this._handleTimeStop()) {
      return;
    }

    // Shooting
    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    } else if (this._def.type !== 'orange') { // Prevent Orange from using this default shoot
      this.shoot(ownerIndex);
      this.shootCooldown = this.shootCooldownMax;
    }

    // Determine intended target speed
    let targetSpeed = this.speed;
    if (this.slowTimer > 0) {
      this.slowTimer--;
      targetSpeed *= this.slowMultiplier;
    }

    // Velocity Recovery (gradually return to target speed after knockback or slow)
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
      const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.04;
      this.vx = (this.vx / currentSpeed) * newSpeed;
      this.vy = (this.vy / currentSpeed) * newSpeed;
    }

    // Movement
    this.x += this.vx;
    this.y += this.vy;
    const spinRate = this._def.spinRate ?? CONFIG.spin.rate;
    this.angle += this.speed * spinRate;

    // Aiming & Bouncing
    this.aim(opponent);
    this.resolveWallBounce(arena);
  }

  /** Draws the basic circle body. Subclasses can override for custom rendering. */
  drawBody(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    // Flip vertically if facing left to prevent being upside-down
    if (Math.abs(this.angle) > Math.PI / 2) {
      ctx.scale(1, -1);
    }

    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    this.drawStatusOverlays(ctx, this.r);

    ctx.restore();
  }

  /** Centralized status overlays (slow, poison, burn molten core) */
  drawStatusOverlays(ctx, baseRadius) {
    if (this.slowTimer > 0) {
      ctx.fillStyle = 'rgba(77, 163, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.poisonTicks > 0) {
      ctx.fillStyle = 'rgba(77, 255, 77, 0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.burnTimer > 0) {
      // 1. Pulse heat glow outline (OPTIMIZED: removed shadowBlur - expensive operation)
      const glowIntensity = Math.abs(Math.sin(Date.now() / 150));
      ctx.save();
      ctx.strokeStyle = `rgba(255, 120, 0, ${0.4 + glowIntensity * 0.4})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 2. Molten Inner Body Radial Gradient
      const offset = baseRadius * 0.15;
      const grad = ctx.createRadialGradient(-offset, -offset, 0, 0, 0, baseRadius);
      const pulse = 0.05 * Math.sin(Date.now() / 100);
      grad.addColorStop(0, 'rgba(255, 255, 220, 0.65)'); // Hot-white/yellow center
      grad.addColorStop(0.35, `rgba(255, 130, 0, ${0.5 + pulse})`);
      grad.addColorStop(0.75, `rgba(200, 30, 0, ${0.35 + pulse})`);
      grad.addColorStop(1, 'rgba(100, 0, 0, 0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Draws standard fighter outline. */
  drawOutline(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.stroke();
  }

  /** Draws standard grey weapon barrel. */
  drawGun(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.gunAngle);
    
    if (Math.abs(this.gunAngle) > Math.PI / 2) {
      ctx.scale(1, -1);
    }
    
    ctx.translate(this.r + CONFIG.gun.baseOffset, 0);
    ctx.fillStyle = '#444';
    ctx.fillRect(-3, -5, 14, 10);
    ctx.fillStyle = '#222';
    ctx.fillRect(8, -2.5, 10, 5);
    ctx.restore();
  }

  /** Draws the fighter's health points in the center. */
  drawHealth(ctx) {
    if (this.hp <= 0 || this._isWinnerReveal) return;
    ctx.save();
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const hpText = Math.floor(this.hp).toString();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeText(hpText, this.x, this.y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(hpText, this.x, this.y);
    ctx.restore();
  }

  /** Draws a floating freeze timer above the fighter when time-stopped. */
  drawFreezeTimer(ctx) {
    if (this._suppressFreezeTimer) return;
    if (!this._timeStopStartTime || !this._timeStopOriginalDuration) return;
    ctx.save();
    // Calculate remaining time from elapsed time so timer counts down even while frozen.
    const elapsedMs = performance.now() - this._timeStopStartTime;
    const elapsedFrames = (elapsedMs / 1000) * 60;
    const remainingFrames = Math.max(0, this._timeStopOriginalDuration - elapsedFrames);
    const seconds = Math.ceil(remainingFrames / 60);
    const text = `⏳ ${seconds}s`;
    const yOffset = this.r + 18;
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    // Shadow / outline
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeText(text, this.x, this.y - yOffset);
    // Cyan glow
    ctx.fillStyle = '#00F3FF';
    ctx.fillText(text, this.x, this.y - yOffset);
    ctx.restore();
  }

  /** Main entry point for drawing. */
  draw(ctx) {
    const scale = this.visualScale !== undefined ? this.visualScale : 1.0;
    if (scale !== 1.0) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(scale, scale);
      ctx.translate(-this.x, -this.y);
    }

    this.drawBody(ctx);
    this.drawOutline(ctx);
    this.drawGun(ctx);
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);

    if (scale !== 1.0) {
      ctx.restore();
    }
  }
}
