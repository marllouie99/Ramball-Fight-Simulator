import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { drawSpikeWeapon } from '../../graphics/weaponVisuals.js';
import { drawSpikeSkin, drawSpikeGhostModel } from '../../graphics/fighters/spikeSkin.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';

/**
 * Melee Fighter (Spike / Thorn Brawler)
 * Deals contact damage upon collision, freezes opponent, stacks speed on hit,
 * spins as it moves, and renders ghost model afterimages while accelerating.
 */
export class MeleeFighter extends Fighter {
  constructor(def) {
    super(def);
    this.speedBoostTimer = 0;
    this.speedStacks = 0;
    this.trailHistory = [];
  }

  reset() {
    super.reset();
    this.meleeCooldown = 0;
    this.speedBoostTimer = 0;
    this.speedStacks = 0;
    this.speed = this.baseSpeed;
    this.trailHistory = [];
  }

  /** Gold outline (removed per global stroke removal standard). */
  drawOutline(ctx) {
    // Global fighter body outline stroke removed
  }

  /** Draw outer spikes rotating around the body instead of a barrel. */
  drawGun(ctx) {
    drawSpikeWeapon(ctx, this.x, this.y, this.angle, this.r);
  }

  /** Contact damage hook with hit-pause and stacking speed. */
  onCollide(opponent) {
    if (this.isCaughtInBeam()) return;
    if (this.isTeammate(opponent)) return;
    if (this.meleeCooldown === 0) {
      const cfg = CONFIG.spike || CONFIG.melee || {};
      const dmg = cfg.contactDamage ?? this.damage;
      opponent.takeDamage(dmg, this, { isMelee: true });

      // 1. Pause Hit Mechanic (Freeze both the enemy and Spike upon collision)
      const pauseDuration = cfg.hitPauseDuration || 14;
      if (typeof opponent.applyTimeStop === 'function') {
        opponent.applyTimeStop(pauseDuration);
      } else if (typeof opponent.applyHitStun === 'function') {
        opponent.applyHitStun(pauseDuration);
      }

      // Spike pauses as well upon impact
      const selfPauseDuration = cfg.selfHitPauseDuration ?? pauseDuration;
      if (typeof this.applyTimeStop === 'function') {
        this.applyTimeStop(selfPauseDuration);
      }

      // 2. Increment Stacking Speed Boost
      const maxStacks = cfg.maxSpeedStacks || 12;
      this.speedStacks = Math.min(maxStacks, (this.speedStacks || 0) + 1);
      this.applySpeedBoost();

      // 3. Floating Text & Visual Feedback
      const floatLabel = (this.speedStacks > 1) ? `SMASH! x${this.speedStacks}` : (cfg.floatingText || 'SMASH!');
      spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, floatLabel, cfg.floatingTextColor || '#ffd700');
      spawnSparks(opponent.x, opponent.y, 8, 'gold');
      spawnImpactFlash(opponent.x, opponent.y, 28, '#E5C158');
      triggerGlobalScreenShake(cfg.hitShakeIntensity || 3.5, cfg.hitShakeDuration || 4);

      // 4. Cooldown & Audio SFX
      this.meleeCooldown = cfg.meleeCooldown ?? this.shootCooldownMax;
      const sound = getBasicAttackSound(this._def?.id);
      if (sound) {
        this._attackSoundTimer = sound.delay;
        this._attackSoundConfig = sound;
      }
    }
  }

  applySpeedBoost() {
    const cfg = CONFIG.spike || CONFIG.melee || {};
    const stackGains = (this.speedStacks || 1) * (cfg.speedStackPerHit || 0.85);
    const burstMult = cfg.speedBoostMultiplier || 1.25;
    this.speed = (this.baseSpeed + stackGains) * burstMult;
    this.normalizeSpeed();
  }

  aim(opponent) {
    if (!this.canAim() || !this.isValidAimTarget(opponent)) return;
    const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.gunAngle = targetAngle;
    // Note: this.angle is reserved for continuous movement spin roll
  }

  /**
   * Override turnToNormalPosition: Spike keeps spinning smoothly upon killing enemies or winning the match.
   */
  turnToNormalPosition(turnRate) {
    const cfg = CONFIG.spike || CONFIG.melee || {};
    const baseSpin = cfg.baseSpinRate || 0.035;
    const speedMag = Math.hypot(this.vx, this.vy) || this.speed || 5.5;
    const baseSpd = this.baseSpeed || 5.5;
    const speedRatio = Math.max(1.0, speedMag / baseSpd);
    const stackBonus = 1.0 + (this.speedStacks || 0) * (cfg.spinStackBonus ?? 0.12);
    const maxSpin = cfg.maxSpinRate || 0.38;
    const effectiveSpinRate = Math.min(maxSpin, baseSpin * speedRatio * stackBonus);
    this.angle += effectiveSpinRate;
  }

  update(opponent, ownerIndex, arena) {
    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

    const isFrozen = this._handleTimeStop();
    // Time stop - freeze ALL movement, spinning, and actions
    if (isFrozen) {
      this.trailHistory.length = 0; // Hide afterimages when frozen
      return;
    }

    if (this.meleeCooldown > 0) {
      this.meleeCooldown--;
    }

    this.applyMovementPhysics();

    // Continuous Spin as he moves and during post-kill / match win celebration
    const cfg = CONFIG.spike || CONFIG.melee || {};
    const isStopped = Math.abs(this.vx) < 0.05 && Math.abs(this.vy) < 0.05;
    const isMatchOver = typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd' || state.matchWinner || state.roundWinner);
    if (!isStopped || isMatchOver) {
      const speedMag = Math.hypot(this.vx, this.vy) || this.speed || 5.5;
      const baseSpd = this.baseSpeed || 5.5;
      const speedRatio = Math.max(1.0, speedMag / baseSpd);
      const stackBonus = 1.0 + (this.speedStacks || 0) * (cfg.spinStackBonus ?? 0.12);
      const baseSpin = cfg.baseSpinRate || 0.035;
      const maxSpin = cfg.maxSpinRate || 0.38;
      const effectiveSpinRate = Math.min(maxSpin, baseSpin * speedRatio * stackBonus);
      this.angle += effectiveSpinRate;
    }

    // Afterimages Management: active whenever he has speed stacks, hidden when stopped
    if (isStopped || (this.speedStacks || 0) <= 0) {
      this.trailHistory.length = 0;
    } else {
      const lastPoint = this.trailHistory[this.trailHistory.length - 1];
      const distFromLast = lastPoint ? Math.hypot(this.x - lastPoint.x, this.y - lastPoint.y) : 999;
      if (distFromLast >= 6) {
        this.trailHistory.push({ x: this.x, y: this.y, angle: this.angle, r: this.r });
        const maxTrail = cfg.trailLength ?? 5;
        if (this.trailHistory.length > maxTrail) {
          this.trailHistory.shift();
        }
      }
    }

    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);
  }

  resolveWallBounce(arena, opponent) {
    super.resolveWallBounce(arena);

    // Check if we hit a wall (super.resolveWallBounce clamps position to exact bounds)
    const epsilon = 0.01;
    const bounced = (Math.abs(this.x - this.r - arena.x) < epsilon) ||
      (Math.abs(this.x + this.r - (arena.x + arena.width)) < epsilon) ||
      (Math.abs(this.y - this.r - arena.y) < epsilon) ||
      (Math.abs(this.y + this.r - (arena.y + arena.height)) < epsilon);

    if (bounced) {
      const cfg = CONFIG.spike || CONFIG.melee || {};
      const lockChance = cfg.rebounceLockChance ?? 0.40;
      if (Math.random() < lockChance) {
        let target = opponent;

        // Find nearest valid target if opponent not provided or dead
        if (!target || target.hp <= 0) {
          let bestDist = Infinity;
          const myIndex = state.fighters.indexOf(this);
          const myTeam = state.getFighterTeam(myIndex);

          for (let i = 0; i < state.fighters.length; i++) {
            const f = state.fighters[i];
            if (!f || f === this || f.hp <= 0 || f.invincibilityTimer > 0) continue;

            // Skip teammates in 2v2
            if ((state.mode === '2v2' || state.mode === '1v2 Stand Off') && myTeam !== null && myTeam === state.getFighterTeam(i)) continue;

            const dist = Math.hypot(f.x - this.x, f.y - this.y);
            if (dist < bestDist) {
              bestDist = dist;
              target = f;
            }
          }
        }

        const isTojiAmbushing = (this.characterId === 'toji' || this.type === 'toji') && this.isAmbushing;
        const isTargetGojoInfinity = target && (typeof target.hasActiveInfinity === 'function') && target.hasActiveInfinity() && !isTojiAmbushing && !this.gojoInfinityImmune;

        if (target && !isTargetGojoInfinity) {
          const dx = target.x - this.x;
          const dy = target.y - this.y;
          const d = Math.hypot(dx, dy) || 1;
          const speed = Math.hypot(this.vx, this.vy) || this.speed;
          this.vx = (dx / d) * speed;
          this.vy = (dy / d) * speed;
          this.normalizeSpeed();
        }
      }
    }
  }

  drawBody(ctx) {
    drawSpikeSkin(ctx, this.x, this.y, this.r, this.angle, this.color);
    ctx.save();
    ctx.translate(this.x, this.y);
    this.drawStatusOverlays(ctx, this.r);
    ctx.restore();
  }

  draw(ctx) {
    const isFrozen = this._handleTimeStop();
    const isStopped = Math.abs(this.vx) < 0.05 && Math.abs(this.vy) < 0.05;

    // Render Ghost Model Afterimages (active when he has speed stacks, hidden when stopped or frozen)
    if ((this.speedStacks || 0) > 0 && !isFrozen && !isStopped && this.trailHistory.length > 0) {
      const cfg = CONFIG.spike || CONFIG.melee || {};
      const alphaMult = cfg.ghostAlphaMultiplier ?? 0.55;
      const ghostColor = cfg.ghostThemeColor || '#e5c158';

      for (let i = 0; i < this.trailHistory.length; i++) {
        const trail = this.trailHistory[i];
        const progress = (i + 1) / this.trailHistory.length;
        const alpha = progress * alphaMult;
        drawSpikeGhostModel(ctx, trail.x, trail.y, trail.r || this.r, trail.angle || 0, alpha, ghostColor);
      }
    }

    super.draw(ctx);
  }
}
