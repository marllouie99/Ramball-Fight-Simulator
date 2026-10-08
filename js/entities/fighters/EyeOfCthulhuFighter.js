// ─────────────────────────────────────────────
// Eye of Cthulhu — Ancient Ocular Horror Fighter Entity
// Authentic Terraria Flight Physics & Multi-Phase AI State Machine
// ─────────────────────────────────────────────
import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { eyeOfCthulhuConfig } from '../../configs/characters/eyeOfCthulhuConfig.js';
import { drawEyeOfCthulhuSkin, EOC_SHATTER_SPRITES } from '../../graphics/fighters/eyeOfCthulhuSkin.js';
import { state, triggerGlobalScreenShake, spawnFloatingText } from '../../core/state.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { shatterEyeOfCthulhuActiveAllies } from '../../graphics/particles/deathShatterEffect.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { audioSystem } from '../../systems/audioSystem.js';

export const EOC_STATE = {
  HOVER: 'HOVER',
  WINDUP_RAM: 'WINDUP_RAM',
  RAM_DASH: 'RAM_DASH',
  TURNAROUND: 'TURNAROUND',
  FATIGUE_PAUSE: 'FATIGUE_PAUSE',
  TRANSFORMATION: 'TRANSFORMATION',
  P2_CHASE: 'P2_CHASE',
  P2_CHAIN_DASH: 'P2_CHAIN_DASH',
  P2_CHOMP: 'P2_CHOMP',
  P2_ROAR: 'P2_ROAR',
};

export class EyeOfCthulhuFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'eye_of_cthulhu';
    this.type = 'eye_of_cthulhu';

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.eye_of_cthulhu)
      ? CONFIG.eye_of_cthulhu
      : eyeOfCthulhuConfig;

    this.color = cfg.color || '#E11D48';
    this.themeColor = cfg.themeColor || '#E11D48';
    this.damageNumberColor = cfg.themeColor || '#E11D48';

    // Disable default hand & gun rendering for pure monster body
    this.hideHands = true;
    this.hideGun = true;
    this.hideFrontHand = true;
    this.hideBackHand = true;

    // Terrain & Obstacle intangibility (Terraria ghost flight)
    this.isGhostTerrain = true;
    this.immuneToKnockback = true;
    this.immuneToPush = true;
    this.immuneToCC = true;

    // AI State Machine
    this.aiState = EOC_STATE.HOVER;
    this.stateTimer = cfg.hoverDurationFrames || 260;
    this.hoverOrbitTime = Math.random() * Math.PI * 2;
    this.hoverPhase = Math.random() * Math.PI * 2;
    this.servantSpawnTimer = cfg.servantSpawnIntervalInHover || 140;

    // Ramming mechanics
    this.ramsRemaining = 0;
    this.committedRamAngle = 0;
    this.isRamming = false;
    this.isWindupTelegraph = false;
    this.hitOpponentThisRam = false;

    // Phase 2 & Transformation state
    this.isPhase2 = false;
    this._isPhase2 = false;
    this.isTransforming = false;
    this.hasTransformed = false;
    this._phase2Pending = false;
    this.hasShedPupil = false;
    this.transformationSpinAngle = 0;
    this.transformationProgress = 0;
    this.shedGoreParticles = [];
    this.afterImages = [];
    this.p2ChainDashCooldown = cfg.chainDashCooldown || 480;
    this.p2RoarCooldown = cfg.roarCooldown || 840;
    this.p2ChompCooldown = 0;
    this.actionNoiseCooldown = 0;
    this.lastActionNoise = null;

    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.slowTimer = 0;
    this.slowMultiplier = 1.0;
    this.purpleHitTimer = 0;
    this.isCaughtInPurple = false;
    this.isCaughtInPurpleVortex = false;

    this._registerSkills();
  }

  isTrappedInVortexOrBeam() {
    return Boolean(
      this.isCaughtInPurple ||
      this.isCaughtInPurpleVortex ||
      (this.purpleHitTimer && this.purpleHitTimer > 0) ||
      (typeof this.isCaughtInBeam === 'function' && this.isCaughtInBeam()) ||
      this.isDraggedByGetsuga ||
      this._draggedByCruelSun ||
      this.isCaughtInCruelSun ||
      this.isCaughtInBlackHole ||
      this._insideBlackHole ||
      this.caughtInPureLoveBeam
    );
  }

  // ── Unyielding Boss Poise: Zero Hit-Pause, Zero Flinch & Zero Basic Knockback ──
  get basicAttackHitPauseTimer() {
    return 0;
  }
  set basicAttackHitPauseTimer(_) {}

  get knockbackStunTimer() {
    return 0;
  }
  set knockbackStunTimer(_) {}

  get hitStunTimer() {
    return 0;
  }
  set hitStunTimer(_) {}

  applyKnockback(vx, vy, stunFrames = 0, opts = {}) {
    const options = (typeof stunFrames === 'object' && stunFrames !== null)
      ? stunFrames
      : (typeof opts === 'object' && opts !== null ? opts : {});

    // Preserve pulling / dragging / beam suction / vortex mechanics (Getsuga, Pure Love Beam, Cruel Sun, Vortex, Black Hole, Hollow Purple)
    const isPullOrDrag = Boolean(
      options.isPull ||
      options.isDrag ||
      options.isBeam ||
      options.isPureLoveBeam ||
      options.isGetsuga ||
      options.isCruelSun ||
      options.isVortex ||
      options.isPurple ||
      options.fromBlackHole ||
      this.isDraggedByGetsuga ||
      this._draggedByCruelSun ||
      this.isCaughtInCruelSun ||
      (typeof this.isCaughtInBeam === 'function' && this.isCaughtInBeam()) ||
      this.isCaughtInBlackHole ||
      this._insideBlackHole ||
      this.isCaughtInPurple ||
      this.isCaughtInPurpleVortex ||
      (this.purpleHitTimer && this.purpleHitTimer > 0)
    );

    if (isPullOrDrag) {
      const stun = typeof stunFrames === 'number' ? stunFrames : (options.stunDuration || 0);
      return super.applyKnockback(vx, vy, stun);
    }
    // 100% Immune to standard hit knockback & push back from basic strikes and bullets
    return;
  }

  applyRedKnockback(vx, vy) {
    this.knockbackVx = vx;
    this.knockbackVy = vy;
  }

  applyHitStun(duration, opts = {}) {
    const options = (typeof duration === 'object' && duration !== null)
      ? duration
      : (typeof opts === 'object' && opts !== null ? opts : {});
    const isPullOrDrag = Boolean(
      options.isPull ||
      options.isDrag ||
      options.isBeam ||
      options.isPureLoveBeam ||
      options.isGetsuga ||
      options.isCruelSun ||
      options.isVortex ||
      options.fromBlackHole
    );
    if (isPullOrDrag) {
      return super.applyHitStun(typeof duration === 'number' ? duration : 0, options);
    }
    return;
  }

  takeDamage(amount, attacker, opts = {}) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.eye_of_cthulhu)
      ? CONFIG.eye_of_cthulhu
      : eyeOfCthulhuConfig;

    // Phase 1 has 15% DR from its protective outer lens; Phase 2 drops defense completely to 0 (100% full unmitigated damage)
    if (!this.isPhase2 && !this.isTransforming) {
      const dr = (cfg.defenseReductionPhase1 !== undefined) ? cfg.defenseReductionPhase1 : 0.15;
      amount = Math.max(1, amount * (1 - dr));
    }

    const passOpts = (opts && typeof opts === 'object') ? { ...opts } : {};
    passOpts.skipKnockback = true;
    passOpts.skipHitStun = true;
    passOpts.skipInterrupt = true;

    return super.takeDamage(amount, attacker, passOpts);
  }

  _registerSkills() {
    this.skills = [
      {
        id: 'servants_of_cthulhu',
        name: 'Servants of Cthulhu',
        cooldown: 720,
        currentCooldown: 0,
        icon: '👁️',
        description: 'Summons mini Servant eyeballs to swarm the target.'
      },
      {
        id: 'triple_ram',
        name: 'Triple Ram Charge',
        cooldown: 600,
        currentCooldown: 0,
        icon: '⚡',
        description: 'Winds up and executes 3 sequential high-speed rams.'
      }
    ];
  }

  _playAudio(soundKey, defaultPath, defaultVol = 1.0) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.eye_of_cthulhu)
      ? CONFIG.eye_of_cthulhu
      : eyeOfCthulhuConfig;
    const soundPath = cfg?.sounds?.[soundKey] || defaultPath;
    const volume = cfg?.soundVolumes?.[soundKey] !== undefined ? cfg.soundVolumes[soundKey] : defaultVol;
    if (audioSystem && soundPath) {
      try {
        audioSystem.playSFX(soundPath, volume);
      } catch (e) {}
    }
  }

  _playActionNoise(force = false) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.eye_of_cthulhu)
      ? CONFIG.eye_of_cthulhu
      : eyeOfCthulhuConfig;

    const minCooldown = (typeof cfg?.actionNoiseCooldown === 'number')
      ? cfg.actionNoiseCooldown
      : ((typeof cfg?.sounds?.actionNoiseCooldown === 'number') ? cfg.sounds.actionNoiseCooldown : 50);

    // If noise cooldown is still active, strictly prevent overlapping sounds
    if (this.actionNoiseCooldown > 0) {
      if (!force || this.actionNoiseCooldown > (minCooldown - 15)) {
        return;
      }
    }

    const noiseSounds = cfg?.sounds?.actionNoises || [
      'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise1.mp3',
      'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise2.mp3',
      'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise3.mp3',
    ];
    const chance = (typeof cfg?.soundChances?.actionNoise === 'number')
      ? cfg.soundChances.actionNoise
      : ((typeof cfg?.actionNoiseChance === 'number') ? cfg.actionNoiseChance : 0.30);

    if (force || Math.random() < chance) {
      if (noiseSounds && noiseSounds.length > 0 && audioSystem && typeof audioSystem.playSFX === 'function') {
        const candidates = (noiseSounds.length > 1 && this.lastActionNoise)
          ? noiseSounds.filter(s => s !== this.lastActionNoise)
          : noiseSounds;
        const sound = candidates[Math.floor(Math.random() * candidates.length)];
        const vol = cfg?.soundVolumes?.actionNoise !== undefined
          ? cfg.soundVolumes.actionNoise
          : (cfg?.actionNoiseVolume !== undefined ? cfg.actionNoiseVolume : 0.85);
        try {
          audioSystem.playSFX(sound, vol);
          this.lastActionNoise = sound;
          this.actionNoiseCooldown = minCooldown;
        } catch (e) {}
      }
    }
  }

  isStationarySkillActive() {
    return Boolean(
      this.isTransforming ||
      this.aiState === EOC_STATE.TRANSFORMATION ||
      this.aiState === EOC_STATE.TRIPLE_RAM_WINDUP ||
      super.isStationarySkillActive()
    );
  }

  update(opponent, ownerIndex, arena) {
    // 1. Process external knockback / vortex pull physics (Rule 1.2)
    if (Math.abs(this.knockbackVx || 0) > 0.1 || Math.abs(this.knockbackVy || 0) > 0.1) {
      this.x += this.knockbackVx;
      this.y += this.knockbackVy;
      this.knockbackVx *= 0.88;
      this.knockbackVy *= 0.88;
    } else {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
    }

    if (this.purpleHitTimer > 0) {
      this.purpleHitTimer--;
      if (this.purpleHitTimer <= 0) {
        this.isCaughtInPurple = false;
        this.isCaughtInPurpleVortex = false;
      }
    } else {
      this.isCaughtInPurple = false;
      this.isCaughtInPurpleVortex = false;
    }

    if (this.slowTimer > 0) {
      this.slowTimer--;
      if (this.slowTimer <= 0) {
        this.slowMultiplier = 1.0;
      }
    }

    // 2. Universal Freeze & TimeStop Guard (Rule 1.1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // Decrement action noise cooldown timer
    if (this.actionNoiseCooldown > 0) {
      this.actionNoiseCooldown--;
    }

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.eye_of_cthulhu)
      ? CONFIG.eye_of_cthulhu
      : eyeOfCthulhuConfig;

    // 2. Check Phase 2 Transformation Threshold (50% HP)
    if (!this.hasTransformed && this.hp > 0 && (this.hp / (this.maxHp || 1)) <= (cfg.phase2Threshold || 0.50)) {
      this._phase2Pending = true;
    }
    const isInsideGojoDomain = typeof state !== 'undefined' && state.fighters && state.fighters.some(f =>
      f && f !== this && (f.isParalyzingDomain || f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive && f.hp > 0
    );
    if (!this.hasTransformed && this._phase2Pending && !isInsideGojoDomain) {
      this._phase2Pending = false;
      this.hasTransformed = true;
      this.isTransforming = true;
      this.hasShedPupil = false;
      this.transformationProgress = 0;
      this.transformationSpinAngle = this.gunAngle || this.angle || 0;
      this.aiState = EOC_STATE.TRANSFORMATION;
      this.stateTimer = cfg.transformationDurationFrames || 75;
      this.vx = 0;
      this.vy = 0;
      try {
        spawnFloatingText(this.x, this.y - this.r - 20, 'TRANSFORMATION!', '#E11D48');
        this._playAudio('transformationStart', 'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise1.mp3', 0.95);
        this.actionNoiseCooldown = cfg.actionNoiseCooldown || 50;
        this.lastActionNoise = 'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise1.mp3';
      } catch (e) {}
    }

    // 3. Floating Hover Oscillation (skipped when transforming to stay completely stationary)
    if (!this.isTransforming) {
      this.hoverPhase += (cfg.hoverOscillationFreq || 0.06);
      this.z = Math.sin(this.hoverPhase) * (cfg.hoverOscillationAmp || 8.0);
    } else {
      this.z = 0;
    }

    const isMatchEnded = typeof state !== 'undefined' && (
      state.gameState === 'roundEnd' || 
      state.gameState === 'matchEnd' || 
      state.gameState === 'gameOver' || 
      state.gameState === 'champion' || 
      Boolean(this._isWinnerReveal)
    );
    const isTargetAlive = Boolean(opponent && !opponent.isDead && opponent.hp > 0);

    // 4. State Machine Execution
    if (isTargetAlive && !isMatchEnded) {
      this._updateTerrariaAI(opponent, ownerIndex, arena, cfg);
    } else {
      // Return smoothly inside the arena and idle float when enemy is eliminated / match won
      this._updateVictoryReturnInside(arena, cfg);
    }

    // Always update active gore particles and dash afterimages
    this._updateShedGoreParticles();
    this._updateAfterImages();

    // Periodic ambient action noise / vocalization
    if (!this.isTransforming && isTargetAlive && !isMatchEnded) {
      if (this.ambientNoiseTimer === undefined) {
        this.ambientNoiseTimer = 180 + Math.floor(Math.random() * 120);
      }
      this.ambientNoiseTimer--;
      if (this.ambientNoiseTimer <= 0) {
        this.ambientNoiseTimer = 180 + Math.floor(Math.random() * 120);
        this._playActionNoise();
      }
    }

    // 5. Natural Arena Wall Rebouncing (Follows the game's centralized rebouncing mechanics)
    this.resolveWallBounce(arena, opponent);
  }

  _updateVictoryReturnInside(arena, cfg) {
    if (!arena && typeof state !== 'undefined') arena = state.arena;
    if (!arena) {
      this.vx *= 0.92;
      this.vy *= 0.92;
      this.x += this.vx;
      this.y += this.vy;
      return;
    }

    const cx = arena.x + arena.width / 2;
    const cy = arena.y + arena.height / 2;
    const ar = (arena.radius || (arena.width / 2));
    const safeRadius = Math.max(30, ar - this.r - 35);

    const dx = cx - this.x;
    const dy = cy - this.y;
    const distFromCenter = Math.hypot(dx, dy);

    if (distFromCenter > safeRadius && distFromCenter > 0) {
      // Outside or near the wall: fly smoothly inward back inside the arena
      const nx = dx / distFromCenter;
      const ny = dy / distFromCenter;
      const returnSpeed = Math.min(8.5, Math.max(4.0, (distFromCenter - safeRadius) * 0.08 + 3.0));
      this.vx = this.vx * 0.88 + nx * returnSpeed * 0.18;
      this.vy = this.vy * 0.88 + ny * returnSpeed * 0.18;
      const currentSpeed = Math.hypot(this.vx, this.vy);
      if (currentSpeed > returnSpeed) {
        this.vx = (this.vx / currentSpeed) * returnSpeed;
        this.vy = (this.vy / currentSpeed) * returnSpeed;
      }
      this.gunAngle = Math.atan2(this.vy, this.vx);
      this.angle = this.gunAngle;
    } else {
      // Comfortably inside the arena: smoothly decelerate to an upright idle
      this.vx *= 0.90;
      this.vy *= 0.90;
      // Settle facing upright towards player (angle 0)
      this.gunAngle = 0;
      this.angle = 0;
    }

    this.x += this.vx;
    this.y += this.vy;
  }

  _updateTerrariaAI(opponent, ownerIndex, arena, cfg) {
    // If trapped in Hollow Purple vortex, beam, or gravitational pull, interrupt dashing
    if (this.isTrappedInVortexOrBeam()) {
      this.isRamming = false;
      this.isWindupTelegraph = false;
      this.ramsRemaining = 0;
      if (this.aiState === EOC_STATE.RAM_DASH || this.aiState === EOC_STATE.P2_CHAIN_DASH || this.aiState === EOC_STATE.WINDUP_RAM) {
        this.aiState = this.isPhase2 ? EOC_STATE.P2_CHASE : EOC_STATE.HOVER;
        this.stateTimer = this.isPhase2 ? (cfg.p2RamRecoveryPauseFrames || 15) : (cfg.hoverDurationFrames || 120);
      }

      this.vx *= 0.85;
      this.vy *= 0.85;
      this.x += this.vx;
      this.y += this.vy;

      if (opponent) {
        const aimAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        this.gunAngle = aimAngle;
        this.angle = aimAngle;
      }
      return;
    }

    switch (this.aiState) {
      case EOC_STATE.HOVER:
        this._updateHoverState(opponent, ownerIndex, arena, cfg);
        break;

      case EOC_STATE.WINDUP_RAM:
        this._updateWindupState(opponent, cfg);
        break;

      case EOC_STATE.RAM_DASH:
        this._updateRamDashState(opponent, ownerIndex, cfg);
        break;

      case EOC_STATE.TURNAROUND:
        this._updateTurnaroundState(opponent, cfg);
        break;

      case EOC_STATE.FATIGUE_PAUSE:
        this._updateFatigueState(cfg);
        break;

      case EOC_STATE.TRANSFORMATION:
        this._updateTransformationState(opponent, cfg);
        break;

      case EOC_STATE.P2_CHASE:
        this._updateP2ChaseState(opponent, ownerIndex, cfg);
        break;

      case EOC_STATE.P2_CHAIN_DASH:
        this._updateP2ChainDashState(opponent, ownerIndex, cfg);
        break;

      case EOC_STATE.P2_ROAR:
        this._updateP2RoarState(opponent, ownerIndex, cfg);
        break;

      default:
        this.aiState = EOC_STATE.HOVER;
        break;
    }
  }

  _updateHoverState(opponent, ownerIndex, arena, cfg) {
    if (this.isPhase2) {
      this.aiState = EOC_STATE.P2_CHASE;
      this.stateTimer = cfg.p2RamRecoveryPauseFrames || 12;
      return;
    }

    this.isRamming = false;
    this.isWindupTelegraph = false;
    this.hoverOrbitTime += 0.035;

    // Target position: orbiting above the player, safely bounded inside the arena
    let targetX = opponent.x + Math.sin(this.hoverOrbitTime) * (cfg.hoverOrbitWobbleAmp || 45);
    let targetY = opponent.y - (cfg.hoverTargetDistanceY || 175) + Math.cos(this.hoverOrbitTime * 0.5) * 20;

    if (arena) {
      const margin = (this.r || 32) + 15;
      targetX = Math.max(arena.x + margin, Math.min(arena.x + arena.width - margin, targetX));
      targetY = Math.max(arena.y + margin, Math.min(arena.y + arena.height - margin, targetY));
    }

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    const slow = (this.slowTimer > 0 && typeof this.slowMultiplier === 'number') ? this.slowMultiplier : 1.0;
    const accel = (cfg.hoverAcceleration || 0.24) * slow;
    this.vx += (dx / dist) * accel;
    this.vy += (dy / dist) * accel;
    this.vx *= (cfg.hoverFriction || 0.94);
    this.vy *= (cfg.hoverFriction || 0.94);

    this.x += this.vx;
    this.y += this.vy;

    // Pupil dynamically tracks the player
    const aimAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.gunAngle = aimAngle;
    this.angle = aimAngle;

    // Periodic Servant Spawning (Phase 1 only)
    if (!this.isPhase2 && !this.isTransforming) {
      this.servantSpawnTimer--;
      if (this.servantSpawnTimer <= 0) {
        this.servantSpawnTimer = cfg.servantSpawnIntervalInHover || 140;
        this._spawnServantMinion(ownerIndex, cfg);
      }
    }

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      // Transition to Triple Ram sequence
      this.ramsRemaining = cfg.ramCount || 3;
      this.aiState = EOC_STATE.WINDUP_RAM;
      this.stateTimer = cfg.ramWindupFrames || 24;
    }
  }

  _spawnServantMinion(ownerIndex, cfg) {
    if (this.isPhase2 || this.isTransforming || this.hp <= 0) return; // Strict zero minions in Phase 2
    if (!state.illusions) state.illusions = [];

    const activeServants = state.illusions.filter(ill => ill && ill.isServantOfCthulhu && ill.owner === this && ill.hp > 0).length;
    const maxActive = cfg.servantMaxActive || 4;
    if (activeServants >= maxActive) return;

    const spawnCount = Math.min(cfg.servantCountPerSpawn || 1, maxActive - activeServants);
    const servantScale = (typeof cfg.servantScale === 'number') ? cfg.servantScale : ((typeof cfg.servantSizeMultiplier === 'number') ? cfg.servantSizeMultiplier : 1.0);
    const servantRadius = (cfg.servantRadius !== undefined ? cfg.servantRadius : 10) * servantScale;

    for (let s = 0; s < spawnCount; s++) {
      const pAngle = this.gunAngle + (Math.random() - 0.5) * 0.6;
      const spawnX = this.x + Math.cos(this.gunAngle) * (this.r + 8 * servantScale) + (Math.random() - 0.5) * 6;
      const spawnY = this.y + Math.sin(this.gunAngle) * (this.r + 8 * servantScale) + (Math.random() - 0.5) * 6;
      const initSpeed = cfg.servantInitialSpeed || 2.2;

      const minion = {
        x: spawnX,
        y: spawnY,
        vx: Math.cos(pAngle) * initSpeed,
        vy: Math.sin(pAngle) * initSpeed,
        r: servantRadius,
        scale: servantScale,
        hp: cfg.servantHp || 120,
        maxHp: cfg.servantHp || 120,
        damage: cfg.servantDamage || 12,
        owner: this,
        ownerIndex: (typeof ownerIndex === 'number') ? ownerIndex : (state.fighters ? state.fighters.indexOf(this) : 0),
        team: this.team,
        isMinion: true,
        isIllusion: true,
        isServantOfCthulhu: true,
        isGhostTerrain: true,
        color: cfg.color || '#E11D48',
        themeColor: cfg.themeColor || '#E11D48',
        angle: pAngle,
        gunAngle: pAngle,
        moveSpeed: cfg.servantSpeed || 3.4,
        turnRate: cfg.servantTurnRate || 0.08,
        attackCooldown: 0,
        attackInterval: cfg.servantAttackInterval || 24,
        hoverAngle: Math.random() * Math.PI * 2,
        hoverOrbitSpeed: 0.035 + Math.random() * 0.02,
        hoverDistance: ((cfg.servantHoverRadius || 20) * servantScale) + Math.random() * 8,
        hitFlashTimer: 0,
        timeStopTimer: 0,
        hitStunTimer: 0,
        knockbackVx: 0,
        knockbackVy: 0,
        applyTimeStop(duration) { this.timeStopTimer = Math.max(this.timeStopTimer || 0, duration); },
        applyHitStun(duration) { this.hitStunTimer = Math.max(this.hitStunTimer || 0, duration); },
        applyKnockback(vx, vy) { this.knockbackVx = vx; this.knockbackVy = vy; },
        takeDamage(amount, attacker, opts = {}) {
          return applyDamageToTarget(this, amount, attacker, opts);
        },
      };

      state.illusions.push(minion);
      spawnSparks(spawnX, spawnY, 8, 'bloodSpark', '#E11D48');
    }

    this._playAudio('servantSpawn', 'Assets/Sound Effects/Skills/dash1.mp3', 0.45);
    this._playActionNoise();
  }

  _updateWindupState(opponent, cfg) {
    this.isRamming = false;
    this.isWindupTelegraph = true;

    // Rapid deceleration in place
    this.vx *= (cfg.ramWindupDecel || 0.88);
    this.vy *= (cfg.ramWindupDecel || 0.88);
    this.x += this.vx;
    this.y += this.vy;

    // Lock facing directly at target
    this.committedRamAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.gunAngle = this.committedRamAngle;
    this.angle = this.committedRamAngle;

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      this.aiState = EOC_STATE.RAM_DASH;
      this.stateTimer = cfg.ramDuration || 18;
      this.isRamming = true;
      this.isWindupTelegraph = false;
      this.hitOpponentThisRam = false;
      this._playAudio('ramDash', 'Assets/Sound Effects/Skills/dash1.mp3', 0.85);
      this._playActionNoise();
    }
  }

  _updateRamDashState(opponent, ownerIndex, cfg) {
    if (this.isTrappedInVortexOrBeam()) {
      this.isRamming = false;
      this.ramsRemaining = 0;
      this.aiState = EOC_STATE.TURNAROUND;
      this.stateTimer = cfg.ramTurnaroundFrames || 12;
      return;
    }

    this.isRamming = true;
    this.isWindupTelegraph = false;

    // Strict Committed Aim Lock (Rule 1.4)
    this.gunAngle = this.committedRamAngle;
    this.angle = this.committedRamAngle;

    const baseSpeed = cfg.ramSpeed || 17.5;
    const slow = (this.slowTimer > 0 && typeof this.slowMultiplier === 'number') ? this.slowMultiplier : 1.0;
    const speed = baseSpeed * slow;
    this.vx = Math.cos(this.committedRamAngle) * speed;
    this.vy = Math.sin(this.committedRamAngle) * speed;

    this.x += this.vx;
    this.y += this.vy;

    // Contact Damage check
    if (!this.hitOpponentThisRam) {
      const isTargetGojoInfinity = opponent && (
        (opponent.characterId === 'gojo' || opponent.type === 'gojo') &&
        (!opponent.infinityCooldown || opponent.infinityCooldown <= 0) &&
        (typeof opponent.hasActiveInfinity !== 'function' || opponent.hasActiveInfinity())
      );
      const effectiveReach = isTargetGojoInfinity ? (this.r + (CONFIG.gojo?.infinityRadius ?? (opponent.r + 30))) : (this.r + opponent.r);
      const dist = Math.hypot(this.x - opponent.x, this.y - opponent.y);
      if (dist <= effectiveReach) {
        this.hitOpponentThisRam = true;
        this._applyRamHit(opponent, cfg.ramDamage || 28, cfg.ramKnockback || 14.0);
      }
    }

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      this.ramsRemaining--;
      this.aiState = EOC_STATE.TURNAROUND;
      this.stateTimer = cfg.ramTurnaroundFrames || 12;
    }
  }

  _applyRamHit(opponent, damage, knockback) {
    if (!opponent || typeof opponent.takeDamage !== 'function') return;

    // Gojo Infinity Barrier check (Rule 1.7)
    const isTargetGojoInfinity = opponent && (
      (opponent.characterId === 'gojo' || opponent.type === 'gojo') &&
      (!opponent.infinityCooldown || opponent.infinityCooldown <= 0) &&
      (typeof opponent.hasActiveInfinity !== 'function' || opponent.hasActiveInfinity())
    );
    if (isTargetGojoInfinity && !this.gojoInfinityImmune) {
      if (typeof opponent.triggerInfinityBlock === 'function') {
        opponent.triggerInfinityBlock(this.x, this.y, this);
      } else {
        spawnImpactFlash(this.x, this.y, 40, 'infinitySpark');
        spawnSparks(this.x, this.y, 16, 'infinitySpark', '#38BDF8');
      }

      // Rebound Eye velocity backwards off the spatial barrier
      const currentSpeed = Math.hypot(this.vx, this.vy);
      const reboundSpeed = Math.max(7.0, currentSpeed * 0.5);
      const dx = this.x - opponent.x;
      const dy = this.y - opponent.y;
      const dist = Math.hypot(dx, dy) || 1;
      this.vx = (dx / dist) * reboundSpeed;
      this.vy = (dy / dist) * reboundSpeed;

      // Immediately cancel ram charge and transition to turnaround recovery
      if (this.isRamming) {
        this.isRamming = false;
        this.aiState = EOC_STATE.TURNAROUND;
        this.stateTimer = this.isPhase2
          ? (eyeOfCthulhuConfig?.p2RamTurnaroundFrames || 8)
          : (eyeOfCthulhuConfig?.ramTurnaroundFrames || 14);
      }
      return;
    }

    // Escanor Solar Poise check (Rule 10 Interaction)
    if (opponent.characterId === 'escanor' && opponent.isTheOneActive) {
      opponent.takeDamage(damage, this);
      this.vx = -this.vx * 0.5;
      this.vy = -this.vy * 0.5;
      return;
    }

    opponent.takeDamage(damage, this, { knockback });

    // Knockback push away from charge vector
    if (typeof opponent.applyKnockback === 'function') {
      opponent.applyKnockback(Math.cos(this.committedRamAngle) * knockback, Math.sin(this.committedRamAngle) * knockback);
    }

    spawnSparks(opponent.x, opponent.y, 14, 'bloodSpark', '#E11D48');
    spawnImpactFlash(opponent.x, opponent.y, 35, 'bloodExplosion');
    this._playAudio('ramHit', 'Assets/Sound Effects/Attacks/heavypunch1.mp3', 0.90);
    this._playActionNoise();
  }

  _updateTurnaroundState(opponent, cfg) {
    this.isRamming = false;
    this.vx *= 0.88;
    this.vy *= 0.88;
    this.x += this.vx;
    this.y += this.vy;

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      if (this.isPhase2) {
        if (this.ramsRemaining > 0) {
          // Immediately chain next high-speed physical charge
          this.committedRamAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
          this.gunAngle = this.committedRamAngle;
          this.angle = this.committedRamAngle;
          this.aiState = EOC_STATE.P2_CHAIN_DASH;
          this.stateTimer = cfg.p2RamDuration || 15;
          this.isRamming = true;
          this.hitOpponentThisRam = false;
          this._playAudio('p2ChainDash', 'Assets/Sound Effects/Skills/dash2.mp3', 0.95);
          this._playActionNoise();
        } else {
          // Sequence complete — brief 12-frame alignment reset before next chain
          this.aiState = EOC_STATE.P2_CHASE;
          this.stateTimer = cfg.p2RamRecoveryPauseFrames || 12;
        }
      } else {
        if (this.ramsRemaining > 0) {
          this.aiState = EOC_STATE.WINDUP_RAM;
          this.stateTimer = cfg.ramWindupFrames || 24;
          this._playActionNoise();
        } else {
          this.aiState = EOC_STATE.FATIGUE_PAUSE;
          this.stateTimer = cfg.ramFatiguePauseFrames || 45;
        }
      }
    }
  }

  _updateFatigueState(cfg) {
    this.isRamming = false;
    this.isWindupTelegraph = false;
    this.vx *= 0.90;
    this.vy *= 0.90;
    this.x += this.vx;
    this.y += this.vy;

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      if (this.isPhase2) {
        this.aiState = EOC_STATE.P2_CHASE;
        this.stateTimer = cfg.p2RamRecoveryPauseFrames || 12;
      } else {
        this.aiState = EOC_STATE.HOVER;
        this.stateTimer = cfg.hoverDurationFrames || 260;
      }
    }
  }

  _updateTransformationState(opponent, cfg) {
    this.isRamming = false;
    this.isWindupTelegraph = false;
    this.isTransforming = true;

    // Completely stationary in mid-air (vulnerable to attack)
    this.vx = 0;
    this.vy = 0;

    const totalDuration = cfg.transformationDurationFrames || 75;
    this.transformationProgress = Math.min(1, Math.max(0, 1 - (this.stateTimer / totalDuration)));

    // Rapid axial spin
    const spinSpeed = cfg.transformationSpinSpeed || 0.55;
    this.transformationSpinAngle = (this.transformationSpinAngle || 0) + spinSpeed;
    this.angle = this.transformationSpinAngle;
    this.gunAngle = this.transformationSpinAngle;

    // Screech noises and centrifugal blood sparks flung outwards from spinning body
    if (this.stateTimer % 35 === 0 && this.actionNoiseCooldown <= 0) {
      this._playActionNoise(true);
    }
    const bloodInterval = cfg.transformationBloodSparkInterval || 4;
    if (this.stateTimer % bloodInterval === 0) {
      const spawnDist = this.r * (0.8 + Math.random() * 0.4);
      const bx = this.x + Math.cos(this.transformationSpinAngle) * spawnDist;
      const by = this.y + Math.sin(this.transformationSpinAngle) * spawnDist;
      spawnSparks(bx, by, 3, 'crimson', '#E11D48');
    }

    // Midpoint Shedding Event (~frame 36 / 48% progress)
    const shedThreshold = cfg.transformationShedThreshold || 0.48;
    if (this.transformationProgress >= shedThreshold && !this.hasShedPupil) {
      this.hasShedPupil = true;
      this.isPhase2 = true;
      this._isPhase2 = true;
      this._spawnSheddingGore(cfg);
      triggerGlobalScreenShake(6, 12);
      try {
        spawnImpactFlash(this.x, this.y, 45, 'crimsonSniper');
        this._playAudio('pupilShed', 'Assets/Sound Effects/Skills/mahito-body-explode.mp3', 0.85);
        this.actionNoiseCooldown = cfg.actionNoiseCooldown || 50;
      } catch (e) {}
    }

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      // Transformation complete! Climax Roar & Shockwave
      this.isTransforming = false;
      this.isPhase2 = true;
      this._isPhase2 = true;
      triggerGlobalScreenShake(cfg.transformationScreenShake || 10, 25);
      spawnImpactFlash(this.x, this.y, cfg.transformationShockwaveRadius || 190, 'crimsonSniper');
      spawnSparks(this.x, this.y, cfg.transformationBloodBurstCount || 20, 'crimson', '#E11D48');

      // Radial pushback on opponent if nearby
      if (opponent && !opponent.isDead) {
        const dx = opponent.x - this.x;
        const dy = opponent.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        const shockRadius = cfg.transformationShockwaveRadius || 190;
        if (dist <= shockRadius) {
          const isTargetGojoInfinity = opponent && (
            (opponent.characterId === 'gojo' || opponent.type === 'gojo') &&
            (!opponent.infinityCooldown || opponent.infinityCooldown <= 0) &&
            (typeof opponent.hasActiveInfinity !== 'function' || opponent.hasActiveInfinity())
          );
          if (isTargetGojoInfinity && !this.gojoInfinityImmune) {
            if (typeof opponent.triggerInfinityBlock === 'function') {
              opponent.triggerInfinityBlock(this.x, this.y, this);
            }
          } else {
            const pushForce = cfg.transformationShockwaveKnockback || 18;
            if (typeof opponent.applyKnockback === 'function') {
              opponent.applyKnockback((dx / dist) * pushForce, (dy / dist) * pushForce);
            }
          }
        }
      }

      try {
        spawnFloatingText(this.x, this.y - this.r - 25, 'ROAAAR!', '#E11D48');
        this._playAudio('transformationRoar', 'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise3.mp3', 1.0);
        this.actionNoiseCooldown = cfg.actionNoiseCooldown || 50;
        this.lastActionNoise = 'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise3.mp3';
      } catch (e) {}

      this.aiState = EOC_STATE.P2_CHASE;
      this.stateTimer = 120;
    }
  }

  _spawnSheddingGore(cfg) {
    const baseR = this.r || 32;
    const goreDefs = [
      // 1. Torn Sclera / Cornea curved shell shards
      { type: 'eoc_sclera_shell', spriteFrame: EOC_SHATTER_SPRITES.scleraShells[0], scale: (baseR * 1.2) / 75, size: baseR * 0.52, color: '#F8FAFC', speedMult: 1.25 },
      { type: 'eoc_sclera_shell', spriteFrame: EOC_SHATTER_SPRITES.scleraShells[1], scale: (baseR * 1.2) / 75, size: baseR * 0.48, color: '#E2E8F0', speedMult: 1.20 },
      { type: 'eoc_sclera_shell', spriteFrame: EOC_SHATTER_SPRITES.scleraShells[3], scale: (baseR * 1.1) / 70, size: baseR * 0.45, color: '#F8FAFC', speedMult: 1.15 },
    ];

    // Flesh ribbons
    for (let r = 0; r < 3; r++) {
      goreDefs.push({
        type: 'eoc_flesh_ribbon',
        spriteFrame: EOC_SHATTER_SPRITES.fleshRibbons[r % EOC_SHATTER_SPRITES.fleshRibbons.length],
        scale: (baseR * 1.1) / 65,
        size: baseR * 0.35,
        color: '#991B1B',
        speedMult: 1.1 + r * 0.1,
      });
    }

    // Visceral debris chunks
    const gibColors = ['#DC2626', '#991B1B', '#881337', '#06B6D4', '#F8FAFC', '#7F1D1D', '#4C0519'];
    const gibCount = cfg.transformationGoreChunkCount || 10;
    for (let g = 0; g < gibCount; g++) {
      goreDefs.push({
        type: 'eoc_visceral_chunk',
        spriteFrame: EOC_SHATTER_SPRITES.debrisChunks[g % EOC_SHATTER_SPRITES.debrisChunks.length],
        scale: (baseR * 1.0) / 20,
        size: baseR * (0.16 + Math.random() * 0.18),
        color: gibColors[g % gibColors.length],
        speedMult: 0.9 + Math.random() * 0.75,
      });
    }

    if (!state.deathEffects) state.deathEffects = [];

    // Radial explosive blood splash burst
    try {
      spawnSparks(this.x, this.y, 35, 'bloodSpark', '#E11D48');
      spawnSparks(this.x, this.y, 22, 'bloodSpark', '#991B1B');
    } catch (e) {}

    for (let i = 0; i < goreDefs.length; i++) {
      const def = goreDefs[i];
      const angle = (i / goreDefs.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = (9.5 + Math.random() * 6.5) * (def.speedMult || 1.0);
      const piece = {
        x: this.x + Math.cos(angle) * (baseR * 0.45),
        y: this.y + Math.sin(angle) * (baseR * 0.45),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (4.5 + Math.random() * 6.0), // High upward explosive launch
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.65,
        size: def.size,
        scale: def.scale || 1.0,
        spriteFrame: def.spriteFrame || null,
        color: def.color,
        goreType: def.type,
        isEyeOfCthulhuGore: true,
        isPermanentGore: true,
        restitution: 0.35 + Math.random() * 0.15,
        life: 1.0,
        maxLife: 1.0,
        decay: 0, // Permanent on arena floor
        gravity: 0.40, // Drops all the way down to arena floor
        isSettled: false,
      };

      state.deathEffects.push(piece);
    }
  }

  _updateShedGoreParticles() {
    if (!this.shedGoreParticles || this.shedGoreParticles.length === 0) return;
    for (let i = this.shedGoreParticles.length - 1; i >= 0; i--) {
      const p = this.shedGoreParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.rotation += p.rotSpeed;
      p.life--;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.shedGoreParticles.splice(i, 1);
      }
    }
  }

  _updateAfterImages() {
    if (!this.afterImages) this.afterImages = [];

    // Push new ghost snapshot while actively charging/ramming
    if (this.isRamming && !this.isTransforming) {
      this.afterImages.push({
        x: this.x,
        y: this.y - (this.z || 0),
        angle: this.gunAngle || this.angle || 0,
        r: this.r || 32,
        isPhase2: Boolean(this.isPhase2 || this._isPhase2),
        timer: 14,
        maxTimer: 14
      });
      if (this.afterImages.length > 7) {
        this.afterImages.shift();
      }
    }

    // Decay existing afterimages
    if (this.afterImages.length > 0) {
      for (let i = this.afterImages.length - 1; i >= 0; i--) {
        this.afterImages[i].timer--;
        if (this.afterImages[i].timer <= 0) {
          this.afterImages.splice(i, 1);
        }
      }
    }
  }



  _updateP2ChaseState(opponent, ownerIndex, cfg) {
    this.isRamming = false;
    this.isWindupTelegraph = false;

    // High speed pursuit and alignment towards player
    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    const baseChaseSpeed = cfg.p2Speed || cfg.phase2Speed || 8.5;
    const slow = (this.slowTimer > 0 && typeof this.slowMultiplier === 'number') ? this.slowMultiplier : 1.0;
    const chaseSpeed = baseChaseSpeed * slow;
    const accel = 0.55 * slow;

    this.vx += (dx / dist) * accel;
    this.vy += (dy / dist) * accel;

    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > chaseSpeed) {
      this.vx = (this.vx / currentSpeed) * chaseSpeed;
      this.vy = (this.vy / currentSpeed) * chaseSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;

    const aimAngle = Math.atan2(dy, dx);
    this.gunAngle = aimAngle;
    this.angle = aimAngle;

    // Melee Chomp bite check if opponent is in proximity
    if (dist <= (cfg.chompReach || 75) && this.p2ChompCooldown <= 0) {
      this.p2ChompCooldown = cfg.chompCooldown || 20;
      this._applyRamHit(opponent, cfg.chompDamage || 40, 10.0);
      this._playAudio('p2Chomp', 'Assets/Sound Effects/Skills/backstab.mp3', 0.85);
      this._playActionNoise();
    }
    if (this.p2ChompCooldown > 0) this.p2ChompCooldown--;

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      // Initiate continuous physical charge sequence
      const hpRatio = (this.hp / (this.maxHp || 1));
      const chainCount = hpRatio < 0.25 ? (cfg.p2RamChainMax || 6) : (cfg.p2RamChainMin || 3);
      this.ramsRemaining = chainCount;
      this.committedRamAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      this.gunAngle = this.committedRamAngle;
      this.angle = this.committedRamAngle;
      this.aiState = EOC_STATE.P2_CHAIN_DASH;
      this.stateTimer = cfg.p2RamDuration || 15;
      this.isRamming = true;
      this.hitOpponentThisRam = false;
      this._playAudio('p2ChainDash', 'Assets/Sound Effects/Skills/dash2.mp3', 0.95);
      this._playActionNoise();
    }
  }

  _updateP2ChainDashState(opponent, ownerIndex, cfg) {
    if (this.isTrappedInVortexOrBeam()) {
      this.isRamming = false;
      this.ramsRemaining = 0;
      this.aiState = EOC_STATE.P2_CHASE;
      this.stateTimer = cfg.p2RamRecoveryPauseFrames || 15;
      return;
    }

    this.isRamming = true;
    this.isWindupTelegraph = false;

    // Strict Committed Aim Lock (Rule 1.4)
    this.gunAngle = this.committedRamAngle;
    this.angle = this.committedRamAngle;

    // Speed scales based on current health (Expert mode enrage scaling)
    const hpRatio = (this.hp / (this.maxHp || 1));
    const baseSpeed = hpRatio < 0.25 ? (cfg.p2RamSpeedEnraged || 23.5) : (cfg.p2RamSpeedBase || 19.5);
    const slow = (this.slowTimer > 0 && typeof this.slowMultiplier === 'number') ? this.slowMultiplier : 1.0;
    const speed = baseSpeed * slow;

    this.vx = Math.cos(this.committedRamAngle) * speed;
    this.vy = Math.sin(this.committedRamAngle) * speed;

    this.x += this.vx;
    this.y += this.vy;

    // Contact Damage check (Phase 2 contact damage boosted to 40)
    if (!this.hitOpponentThisRam) {
      const isTargetGojoInfinity = opponent && (
        (opponent.characterId === 'gojo' || opponent.type === 'gojo') &&
        (!opponent.infinityCooldown || opponent.infinityCooldown <= 0) &&
        (typeof opponent.hasActiveInfinity !== 'function' || opponent.hasActiveInfinity())
      );
      const effectiveReach = isTargetGojoInfinity ? (this.r + (CONFIG.gojo?.infinityRadius ?? (opponent.r + 30))) : (this.r + opponent.r);
      const dist = Math.hypot(this.x - opponent.x, this.y - opponent.y);
      if (dist <= effectiveReach) {
        this.hitOpponentThisRam = true;
        this._applyRamHit(opponent, cfg.p2ContactDamage || 40, cfg.p2ContactKnockback || 16.0);
      }
    }

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      this.ramsRemaining--;
      this.aiState = EOC_STATE.TURNAROUND;
      this.stateTimer = cfg.p2RamTurnaroundFrames || 6;
    }
  }

  _updateP2RoarState(opponent, ownerIndex, cfg) {
    this.vx *= 0.85;
    this.vy *= 0.85;
    this.x += this.vx;
    this.y += this.vy;

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      // Release 360° Blood Spike burst
      triggerGlobalScreenShake(6, 15);
      this._playAudio('p2Roar', 'Assets/Sound Effects/Skills/ragescream.mp3', 1.0);
      this._playAudio('spikeBurst', 'Assets/Sound Effects/Attacks/spikestab.mp3', 0.75);
      this.actionNoiseCooldown = cfg.actionNoiseCooldown || 50;
      if (projectileSystem && projectileSystem.fireProjectile) {
        const spikeCount = cfg.roarSpikeCount || 12;
        for (let i = 0; i < spikeCount; i++) {
          const sAngle = (i / spikeCount) * Math.PI * 2;
          projectileSystem.fireProjectile(
            this,
            ownerIndex,
            cfg.roarSpikeDamage || 22,
            false,
            cfg.roarSpikeSpeed || 12.0,
            false,
            'bullet',
            this.x,
            this.y,
            sAngle
          );
        }
      }
      this.aiState = EOC_STATE.P2_CHASE;
    }
  }

  /**
   * Resolves arena wall collision using the game's natural rebouncing mechanics.
   * When colliding with arena walls, the Eye naturally rebounces back into the arena.
   */
  resolveWallBounce(arena, opponent) {
    if (!arena && typeof state !== 'undefined') arena = state.arena;
    if (!arena) return false;

    // Rule 1.2: Standard CC trapping delegates to super
    if (typeof this.isCaughtInBeam === 'function' && (this.isCaughtInBeam() || this.isDraggedByGetsuga || this.isWallPinnedByMakima || this.isWallPinnedBySaitama)) {
      return super.resolveWallBounce(arena, opponent);
    }

    // Support circular arena if shape is circle
    if (arena.shape === 'circle') {
      const cx = arena.x + arena.width / 2;
      const cy = arena.y + arena.height / 2;
      const ar = arena.radius || (arena.width / 2);
      const d = Math.hypot(this.x - cx, this.y - cy);
      if (d + this.r >= ar && d > 0) {
        const nx = (this.x - cx) / d;
        const ny = (this.y - cy) / d;
        this.x = cx + nx * (ar - this.r);
        this.y = cy + ny * (ar - this.r);
        const restitution = CONFIG.collision?.restitution ?? 0.95;
        const dot = this.vx * nx + this.vy * ny;
        if (dot > 0) {
          this.vx = (this.vx - 2 * dot * nx) * restitution;
          this.vy = (this.vy - 2 * dot * ny) * restitution;
        }
        this._onWallRebounce();
        return true;
      }
      return false;
    }

    const bounced = super.resolveWallBounce(arena, opponent);
    if (bounced) {
      this._onWallRebounce();
    }
    return bounced;
  }

  _onWallRebounce() {
    const newSpeed = Math.hypot(this.vx, this.vy);
    if (newSpeed > 0.1) {
      const bounceAngle = Math.atan2(this.vy, this.vx);
      if (this.isRamming) {
        this.committedRamAngle = bounceAngle;
      }
      this.gunAngle = bounceAngle;
      this.angle = bounceAngle;
    }
    if (typeof spawnSparks === 'function') {
      spawnSparks(this.x, this.y, 6, 'bloodSpark', '#E11D48');
    }
    if (this.isRamming && this.actionNoiseCooldown <= 0) {
      this._playActionNoise();
    }
  }

  onDeath() {
    this._playAudio('death', 'Assets/Sound Effects/Skills/mahito-body-explode.mp3', 1.0);
    triggerGlobalScreenShake(10, 25);
    if (typeof spawnImpactFlash === 'function') {
      spawnImpactFlash(this.x, this.y, 70, 'crimsonSniper');
    }
    if (typeof spawnSparks === 'function') {
      spawnSparks(this.x, this.y, 25, 'bloodSpark', '#E11D48');
    }
    if (typeof spawnFloatingText === 'function') {
      spawnFloatingText(this.x, this.y - this.r - 20, 'EYE DEFEATED! 👁️💀', '#E11D48');
    }

    // Instantly shatter and kill all active Servants of Cthulhu and minions
    this.shatterActiveAllies();

    super.onDeath();
  }

  shatterActiveAllies() {
    if (typeof shatterEyeOfCthulhuActiveAllies === 'function') {
      shatterEyeOfCthulhuActiveAllies(this);
    }
  }

  drawSkin(ctx) {
    drawEyeOfCthulhuSkin(ctx, this);
  }

  drawBody(ctx) {
    drawEyeOfCthulhuSkin(ctx, this);
  }

  drawGun() {
    // Monster entity - no gun barrel
  }
}
