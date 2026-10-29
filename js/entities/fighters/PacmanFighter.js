// ═══════════════════════════════════════════════════════════════════════════
// PAC-MAN (Namco / Retro Arcade Legend) — Character Class Implementation
// ═══════════════════════════════════════════════════════════════════════════

import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { pacmanConfig } from '../../configs/characters/pacmanConfig.js';
import {
  state,
  spawnFloatingText,
  triggerGlobalScreenShake,
} from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getTileGridInfo } from '../../systems/arenaTileSystem.js';
import { drawPacmanSkin } from '../../graphics/fighters/pacmanSkin.js';

export class PacmanFighter extends Fighter {
  constructor(def = {}) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.pacman) ? CONFIG.pacman : pacmanConfig;
    super({
      ...def,
      r: cfg.r ?? 25,
      radius: cfg.radius ?? 25,
      hp: def.hp ?? cfg.hp ?? 350,
      maxHp: def.maxHp ?? cfg.maxHp ?? 350,
      speed: def.speed ?? cfg.speed ?? 4.8,
      color: def.color || cfg.color || '#FACC15',
    });

    this.characterId = 'pacman';
    this.type = 'pacman';
    this.name = def?.name || cfg.name || 'Pac-Man';
    this.displayName = def?.displayName || cfg.displayName || this.name;
    this.themeColor = cfg.themeColor || '#FACC15';
    this.r = cfg.r ?? 25;
    this.radius = this.r;
    this.hideHands = true; // Classic arcade ball form (hands hidden)
    this.hideWeapon = true;

    // ── Dot-Eating & Arena Tile Parameters ──
    this.dotRadius = cfg.dotRadius ?? 4;
    this.dotEatRadius = cfg.dotEatRadius ?? 28;
    this.powerPelletRadius = cfg.powerPelletRadius ?? 8;
    this.dotColor = cfg.dotColor || '#FFE082';
    this.powerPelletColor = cfg.powerPelletColor || '#FACC15';

    this.dots = [];
    this.totalDots = 0;
    this.dotsEaten = 0;
    this._dotsInitialized = false;

    // ── Chomp Mode (Empowered 30% Attack State) ──
    this.isChompModeActive = false;
    this.chompModeDuration = cfg.chompModeDuration ?? 360;
    this.chompModeTimer = 0;
    this.chompDamagePercent = cfg.chompDamagePercent ?? 0.30;
    this.chompSpeedMultiplier = cfg.chompSpeedMultiplier ?? 1.25;
    this.chompAttackCooldown = 0;
    this.chompKnockback = cfg.chompKnockback ?? 14;
    this.chompHitStun = cfg.chompHitStun ?? 24;

    // ── Visual & Animation State ──
    this._mouthAnimTicks = 0;
    this.activeVisualEffects = [];
    this._wakaSoundDebounce = 0;

    // ── Sound Configuration ──
    this.sounds = { ...(cfg.sounds || {}) };
    this.soundVolumes = { ...(cfg.soundVolumes || {}) };

    // Declarative registration with SkillManager
    this._registerSkills();
  }

  // ── Backward-compatible getters & setters ──
  get chompModeDurationMax() {
    return this.chompModeDuration;
  }
  set chompModeDurationMax(val) {
    if (typeof val === 'number') this.chompModeDuration = val;
  }

  /**
   * Universal SkillManager declarative skill registration.
   */
  _registerSkills() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.pacman) ? CONFIG.pacman : pacmanConfig;
    const skills = [];

    skills.push({
      id: 'dots',
      name: 'Pac-Dots',
      type: 'passive',
      activeKey: 'isChompModeActive',
    });

    skills.push({
      id: 'chomp_mode',
      name: 'Super Chomp Mode',
      type: 'ultimate',
      durationKey: 'chompModeTimer',
      durationMaxKey: 'chompModeDuration',
      activeKey: 'isChompModeActive',
      onExpire: (fighter) => {
        fighter.isChompModeActive = false;
        if (fighter.dotsEaten >= fighter.totalDots) {
          fighter.refillDots(state.arena);
        }
      },
    });

    if (skills.length > 0) {
      this.skillManager.registerSkills(skills);
    }
  }

  /**
   * Resets Pac-Man's match state, dots grid, and timers for new rounds.
   */
  reset() {
    super.reset();
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.pacman) ? CONFIG.pacman : pacmanConfig;

    this.isChompModeActive = false;
    this.chompModeDuration = cfg.chompModeDuration ?? 360;
    this.chompModeTimer = 0;
    this.chompAttackCooldown = 0;
    this._mouthAnimTicks = 0;
    this._wakaSoundDebounce = 0;
    this.activeVisualEffects = [];

    this.dots = [];
    this.dotsEaten = 0;
    this.powerPelletsEaten = 0;
    this.totalDots = 0;
    this._dotsInitialized = false;

    if (state.arena) {
      this.initDots(state.arena);
    }
  }

  /**
   * Overrides base Fighter.shoot() to suppress default generic bullet projectiles (Rule 23).
   * The ONLY offensive mechanic of Pac-Man is during Super Chomp Mode.
   */
  shoot(ownerIndex) {
    // Intentionally empty: Pac-Man uses dedicated dot-eating and Chomp Mode mechanics
  }

  /**
   * Initializes all dots across the arena tile grid (8x8 grid = 64 dots).
   */
  initDots(arena = state.arena) {
    const activeArena = arena || state.arena || { x: 45, y: 240, width: 450, height: 450 };
    const grid = getTileGridInfo(activeArena);
    const cols = grid.cols || 8;
    const rows = grid.rows || 8;

    this.dots = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const cx = activeArena.x + (c + 0.5) * grid.cellW;
        const cy = activeArena.y + (r + 0.5) * grid.cellH;

        // 4 strategic corner energizers (classic Pac-Man power pellets)
        const isPowerPellet =
          (c === 1 && r === 1) ||
          (c === cols - 2 && r === 1) ||
          (c === 1 && r === rows - 2) ||
          (c === cols - 2 && r === rows - 2);

        this.dots.push({
          id: `${c}_${r}`,
          col: c,
          row: r,
          x: cx,
          y: cy,
          r: isPowerPellet ? this.powerPelletRadius : this.dotRadius,
          isPowerPellet,
          eaten: false,
        });
      }
    }

    this.totalDots = this.dots.length;
    this.dotsEaten = 0;
    this.powerPelletsEaten = 0;
    this._dotsInitialized = true;
  }

  /**
   * Refills all dots on each arena tile when Chomp Mode expires.
   */
  refillDots(arena = state.arena) {
    const activeArena = arena || state.arena || { x: 45, y: 240, width: 450, height: 450 };
    if (!this._dotsInitialized || this.dots.length === 0) {
      this.initDots(activeArena);
    } else {
      for (let i = 0; i < this.dots.length; i++) {
        this.dots[i].eaten = false;
      }
      this.dotsEaten = 0;
      this.powerPelletsEaten = 0;
    }

    this._playSfx('refill');
    spawnFloatingText(this.x, this.y - this.r - 20, 'DOTS REFILLED!', '#FFE082');

    // Visual refill pulse ring on floor
    this.activeVisualEffects.push({
      type: 'refillWave',
      x: activeArena.x + activeArena.width * 0.5,
      y: activeArena.y + activeArena.height * 0.5,
      timer: 24,
      maxTimer: 24,
      radius: activeArena.width * 0.55,
    });
  }

  /**
   * Triggers or refreshes Super Chomp Mode when Pac-Man eats a Power Pellet (big dot) or clears all dots.
   * Enables the 30% Max HP chomp bite attack upon physical contact with an enemy.
   * @param {string} [source='powerPellet'] - Activation trigger source ('powerPellet' or 'allDots')
   */
  activateChompMode(source = 'powerPellet') {
    this.isChompModeActive = true;
    this.chompModeTimer = this.chompModeDuration;
    this.chompAttackCooldown = 0;

    this._playSfx('powerPellet');
    triggerGlobalScreenShake(4.5, 10);
    const label = source === 'allDots' ? 'ALL DOTS CLEARED! (30% CHOMP)' : 'POWER PELLET! (30% CHOMP)';
    spawnFloatingText(this.x, this.y - this.r - 22, label, '#FACC15');

    // Flashy energizer shockwave (Rule 26)
    this.activeVisualEffects.push({
      type: 'energizerBloom',
      x: this.x,
      y: this.y,
      timer: 30,
      maxTimer: 30,
      radius: this.r * 2.8,
    });
  }

  /**
   * Internal sound trigger helper with safe volume resolution.
   */
  _playSfx(type) {
    const sfxPath = this.sounds?.[type] || CONFIG.pacman?.sounds?.[type];
    const volume = this.soundVolumes?.[type] ?? CONFIG.pacman?.soundVolumes?.[type] ?? 0.8;
    if (sfxPath && typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
      audioSystem.playSFX(sfxPath, volume);
    }
  }

  /**
   * Plays the iconic waka munch sound with a small frame debounce to prevent audio clipping.
   */
  _playWakaSfx() {
    if (this._wakaSoundDebounce <= 0) {
      this._playSfx('waka');
      this._wakaSoundDebounce = 6;
    }
  }

  /**
   * Checks for dots eaten by Pac-Man during this frame.
   * Eating ANY of the 4 big Power Pellets immediately activates Super Chomp Mode (30% damage bite).
   * Consuming all dots across the arena also triggers Super Chomp Mode and prepares the arena refill.
   */
  _checkDotEating() {
    if (!this.dots || this.dots.length === 0) return;

    for (let i = 0; i < this.dots.length; i++) {
      const dot = this.dots[i];
      if (dot.eaten) continue;

      const d = Math.hypot(dot.x - this.x, dot.y - this.y);
      const eatThreshold = this.r + dot.r + 6;

      if (d <= eatThreshold) {
        dot.eaten = true;
        this.dotsEaten++;
        this._mouthAnimTicks += 6;

        if (dot.isPowerPellet) {
          this.powerPelletsEaten = (this.powerPelletsEaten || 0) + 1;
          this.activateChompMode('powerPellet');
        } else {
          this._playWakaSfx();
        }

        // Add subtle munch visual spark
        this.activeVisualEffects.push({
          type: 'munchSpark',
          x: dot.x,
          y: dot.y,
          timer: 10,
          maxTimer: 10,
          color: dot.isPowerPellet ? '#FACC15' : '#FFE082',
        });

        // Check if all dots have been eaten!
        if (this.dotsEaten >= this.totalDots) {
          this.activateChompMode('allDots');
          break;
        }
      }
    }
  }

  /**
   * The ONLY offensive mechanic of Pac-Man:
   * Executes a devastating 30% damage chomp attack upon contacting the enemy during Chomp Mode.
   */
  _executeChompAttack(opponent) {
    if (!opponent || opponent.hp <= 0 || !this.isChompModeActive) return false;
    if (this.chompAttackCooldown > 0) return false;

    const contactDist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    const hitReach = this.r + (opponent.r || 25) + 14;

    if (contactDist > hitReach) return false;

    // 1. Calculate 30% damage (based on opponent maxHp)
    const targetMaxHp = opponent.maxHp || 1000;
    const dmg = Math.max(1, Math.round(targetMaxHp * this.chompDamagePercent));

    // 2. Deliver damage
    if (typeof opponent.takeDamage === 'function') {
      opponent.takeDamage(dmg, this, { isChomp: true, isMelee: true });
    } else {
      opponent.hp = Math.max(0, opponent.hp - dmg);
    }

    // 3. Audio & Haptic Feedback
    this._playSfx('chomp');
    triggerGlobalScreenShake(4.5, 12);
    opponent.hitFlashTimer = 10;

    // 4. Knockback & Hit Stun
    const pushAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x) || 0;
    const kb = this.chompKnockback || 14;
    if (typeof opponent.applyKnockback === 'function') {
      opponent.applyKnockback(Math.cos(pushAngle) * kb, Math.sin(pushAngle) * kb);
    } else if (typeof opponent.vx === 'number' && typeof opponent.vy === 'number') {
      opponent.vx += Math.cos(pushAngle) * kb * 0.7;
      opponent.vy += Math.sin(pushAngle) * kb * 0.7;
    }

    if (typeof opponent.applyHitStun === 'function') {
      opponent.applyHitStun(this.chompHitStun || 24);
    }

    // Natural elastic recoil bounce for Pac-Man upon landing a bite
    const reboundSpeed = Math.max(2.5, (this.speed || 4.8) * 0.85);
    this.vx = -Math.cos(pushAngle) * reboundSpeed;
    this.vy = -Math.sin(pushAngle) * reboundSpeed;

    // 5. Floating combat text & visual bite fx
    spawnFloatingText(opponent.x, opponent.y - (opponent.r || 25) - 18, `30% CHOMP! (-${dmg})`, '#FACC15');

    const contactX = (this.x + opponent.x) * 0.5;
    const contactY = (this.y + opponent.y) * 0.5;
    this.activeVisualEffects.push({
      type: 'chompImpact',
      x: contactX,
      y: contactY,
      angle: pushAngle,
      timer: 16,
      maxTimer: 16,
      radius: 52,
    });

    this.chompAttackCooldown = 45; // ~0.75s between bites
    this._mouthAnimTicks += 18;
    return true;
  }

  /**
   * Collision callback when physical circle-circle contact occurs with another entity (physics.js).
   */
  onCollide(other) {
    if (this.isChompModeActive && other && other.hp > 0) {
      this._executeChompAttack(other);
    }
  }

  /**
   * Rule 25: Decay transient visual effects before freeze guard.
   */
  _updateVisualEffects() {
    for (let i = this.activeVisualEffects.length - 1; i >= 0; i--) {
      const vfx = this.activeVisualEffects[i];
      vfx.timer--;
      if (vfx.timer <= 0) {
        this.activeVisualEffects.splice(i, 1);
      }
    }
  }

  /**
   * Cleans up transient fighter-anchored visual effect arrays upon interruption or defeat (Rule 25).
   */
  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks?.(forceCancelAll);
    if (forceCancelAll || this.hp <= 0) {
      this.activeVisualEffects.length = 0;
    }
  }

  /**
   * Main 60 FPS combat update loop for Pac-Man.
   * Adheres to natural arena rebouncing standards (moving & bouncing naturally like an ordinary fighter).
   */
  update(opponent, ownerIndex, arena = state.arena) {
    const activeArena = arena || state.arena || { x: 45, y: 240, width: 450, height: 450 };

    // 0. Rule 25: Update visual effects lifecycles BEFORE freeze guard
    this._updateVisualEffects();

    if (!this._dotsInitialized) {
      this.initDots(activeArena);
    }

    if (this._wakaSoundDebounce > 0) {
      this._wakaSoundDebounce--;
    }
    if (this.chompAttackCooldown > 0) {
      this.chompAttackCooldown--;
    }

    // 1. Mandatory Rule 1.1 Freeze & TimeStop Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    if (this.hp <= 0) return;

    // 2. Check dot eating (Pac-Man eats dots & power pellets during both normal and chomp states)
    this._checkDotEating();

    // 3. Super Chomp Mode State Management (The ONLY offensive mechanic)
    if (this.isChompModeActive) {
      // Fallback timer decay when SkillManager is not present
      if (!this.skillManager && this.chompModeTimer > 0) {
        this.chompModeTimer--;
      }

      // Check for expiration
      if (this.chompModeTimer <= 0) {
        this.isChompModeActive = false;
        // When Chomp Mode expires, if all arena dots were cleared, refill the whole arena grid
        if (this.dotsEaten >= this.totalDots) {
          this.refillDots(activeArena);
        }
      } else if (opponent && opponent.hp > 0) {
        // If Pac-Man makes contact with the enemy during Chomp Mode, deliver the 30% chomp
        this._executeChompAttack(opponent);
      }
    }

    // 3. Centralized Movement & Natural Arena Rebouncing (Rule 1.2)
    // Pac-Man follows standard arena rules: bounces naturally off walls and opponents exactly like an ordinary fighter
    const speedMult = this.isChompModeActive ? this.chompSpeedMultiplier : 1.0;
    this.applyMovementPhysics(speedMult);
    this.resolveWallBounce(activeArena, opponent);

    // 4. Update mouth animation and face the direction of natural movement
    const currentSpeed = Math.hypot(this.vx || 0, this.vy || 0);
    if (currentSpeed > 0.2) {
      const moveAngle = Math.atan2(this.vy, this.vx);
      this.gunAngle = moveAngle;
      this.angle = moveAngle;
      this._mouthAnimTicks += this.isChompModeActive ? 1.6 : 1.0;
    }
  }

  /**
   * Rule 21: Standard body renderer hook for character previews and render passes.
   */
  drawBody(ctx) {
    drawPacmanSkin(ctx, this);
  }

  /**
   * Custom fighter draw pipeline:
   * 1. Renders arena tile dots (standard pellets & pulsing power pellets).
   * 2. Renders Pac-Man's character body (with animated chomp mouth).
   * 3. Renders transient chomp impacts and visual blooms.
   * 4. MANDATORY in-game overhead HP & freeze timer overlays (Rule 21).
   */
  draw(ctx, opponent) {
    if (!ctx) return;

    // 1. Draw all active uneaten dots on the arena floor
    if (this.dots && this.dots.length > 0) {
      const now = Date.now();
      for (let i = 0; i < this.dots.length; i++) {
        const dot = this.dots[i];
        if (dot.eaten) continue;

        ctx.save();
        if (dot.isPowerPellet) {
          // Pulsing glowing energizer pellet
          const pulse = Math.sin(now * 0.008 + dot.col + dot.row) * 1.5;
          const r = Math.max(4, dot.r + pulse);

          ctx.fillStyle = this.powerPelletColor;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
          ctx.fill();

          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();
        } else {
          // Standard circular Pac-Dot
          ctx.fillStyle = this.dotColor;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
          ctx.fill();

          ctx.lineWidth = 1.0;
          ctx.strokeStyle = '#D97706';
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // 2. Draw Pac-Man's character body (Rule 32: drawPacmanSkin translates to world space internally)
    this.drawBody(ctx);

    // 3. Draw transient visual effects
    for (let i = 0; i < this.activeVisualEffects.length; i++) {
      const vfx = this.activeVisualEffects[i];
      const p = 1.0 - Math.max(0, vfx.timer / (vfx.maxTimer || 16));

      ctx.save();
      if (vfx.type === 'chompImpact') {
        const currentR = vfx.radius * Math.pow(p, 0.6);
        ctx.translate(vfx.x, vfx.y);
        ctx.rotate(vfx.angle || 0);

        ctx.strokeStyle = `rgba(250, 204, 21, ${1.0 - p})`;
        ctx.lineWidth = 3.5 * (1.0 - p);
        ctx.beginPath();
        ctx.arc(0, 0, currentR, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();

        ctx.fillStyle = `rgba(239, 68, 68, ${0.8 * (1.0 - p)})`;
        ctx.fillRect(-6, -6, 12, 12);
      } else if (vfx.type === 'energizerBloom') {
        const currentR = vfx.radius * Math.pow(p, 0.7);
        ctx.strokeStyle = `rgba(250, 204, 21, ${1.0 - p})`;
        ctx.lineWidth = 3.0 * (1.0 - p);
        ctx.beginPath();
        ctx.arc(vfx.x, vfx.y, currentR, 0, Math.PI * 2);
        ctx.stroke();
      } else if (vfx.type === 'refillWave') {
        const currentR = vfx.radius * p;
        ctx.strokeStyle = `rgba(254, 240, 138, ${0.7 * (1.0 - p)})`;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(vfx.x, vfx.y, currentR, 0, Math.PI * 2);
        ctx.stroke();
      } else if (vfx.type === 'munchSpark') {
        ctx.fillStyle = vfx.color || '#FFE082';
        ctx.fillRect(vfx.x - 2, vfx.y - 2, 4, 4);
      }
      ctx.restore();
    }

    // 4. Mandatory Rule 21: In-game floating overhead HP & freeze timer
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
