// ─────────────────────────────────────────────
// Ender Dragon — Ruler of The End Fighter Entity
// Authentic Void Flight Physics & Multi-Skill Combat State Machine
// ─────────────────────────────────────────────
import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { enderDragonConfig } from '../../configs/characters/enderDragonConfig.js';
import { drawEnderDragonSkin, drawDragonAcidPool } from '../../graphics/fighters/enderDragonSkin.js';
import { state, triggerGlobalScreenShake, spawnFloatingText } from '../../core/state.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { audioSystem } from '../../systems/audioSystem.js';

export const DRAGON_STATE = {
  HOVER: 'HOVER',
  PATROL: 'PATROL',                   // Dynamic sweeping perimeter patrols
  ALTITUDE_SHIFT: 'ALTITUDE_SHIFT',   // Multi-dimensional sudden altitude shifts
  INTERCEPT: 'INTERCEPT',             // Dynamic target interception & kinetic space control
  PERCH_DESCENT: 'PERCH_DESCENT',     // Grounded Intermission: Descent to anchor point
  PERCH_GROUNDED: 'PERCH_GROUNDED',   // Grounded Intermission: Perched on floor
  PERCH_TAKEOFF: 'PERCH_TAKEOFF',     // Grounded Intermission: Power flap takeoff
  FIREBALL_SPIT: 'FIREBALL_SPIT',
  SWOOP_WINDUP: 'SWOOP_WINDUP',
  SWOOP_DASH: 'SWOOP_DASH',
  SWOOP_RECOVERY: 'SWOOP_RECOVERY',
  CATACLYSM_CHANNEL: 'CATACLYSM_CHANNEL',
  // ── Off-Screen Telegraphed Divebomb Strafe ──
  DIVEBOMB_SETUP: 'DIVEBOMB_SETUP',         // Fly off-screen to setup attack vector
  DIVEBOMB_TELEGRAPH: 'DIVEBOMB_TELEGRAPH', // Hover off-screen & project ground danger corridor
  DIVEBOMB_STRIKE: 'DIVEBOMB_STRIKE',       // Extreme-velocity strafe through arena
  DIVEBOMB_RECOVERY: 'DIVEBOMB_RECOVERY',   // Decelerate off-screen on exit & bank back
};

export class EnderDragonFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'ender_dragon';
    this.type = 'ender_dragon';

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.ender_dragon)
      ? CONFIG.ender_dragon
      : enderDragonConfig;

    this.color = cfg.color || '#18181B';
    this.themeColor = cfg.themeColor || '#C026D3';
    this.damageNumberColor = cfg.themeColor || '#C026D3';

    // Circle Fighter Model: Hide generic firearms and humanoid hands (pure draconic form)
    this.hideHands = true;
    this.hideGun = true;
    this.hideFrontHand = true;
    this.hideBackHand = true;
    this.gunAngle = Math.PI / 2;
    this.angle = Math.PI / 2;

    // Arena Physics & Entity Collisions (Rule 1.2)
    this.isGhostTerrain = false;
    this.immuneToKnockback = false;
    this.immuneToPush = false;
    this.immuneToCC = false;

    // ── General Movement Behavior State (Pillars 1-4) ──
    // Altitude & Simulated 3D Depth
    this.altitude = 1.0; // 0.0 = Grounded, 1.0 = Cruise, 1.7 = High Soaring
    this.targetAltitude = 1.0;
    this.altitudeTimer = 240 + Math.floor(Math.random() * 120);
    this.isGrounded = false;

    // Pillar 1: Dynamic Flight Paths & Perimeter Patrol
    this.patrolAngle = Math.random() * Math.PI * 2;
    this.patrolDirection = Math.random() < 0.5 ? 1 : -1;
    this.patrolWobbleTime = Math.random() * Math.PI * 2;

    // Pillar 2: Target Interception & Momentum Space Control
    this.interceptCooldown = 280 + Math.floor(Math.random() * 140);
    this.isIntercepting = false;
    this.interceptTargetAngle = 0;
    this.interceptHitFighters = new Set();

    // Pillar 3: Grounded Intermissions (Perching at Central Anchor)
    this.perchCooldown = 700 + Math.floor(Math.random() * 300); // Initial perch after ~12s
    this.perchBreathTimer = 0;

    // Pillar 4: Environmental Reactivity & Health Phases
    this.currentPhase = 1;
    this.phaseSpeedMult = 1.0;

    // AI State Machine
    this.aiState = DRAGON_STATE.PATROL;
    this.stateTimer = 180;
    this.hoverOrbitTime = Math.random() * Math.PI * 2;
    this.hoverPhase = Math.random() * Math.PI * 2;

    // Skill Cooldowns
    this.fireballCooldown = Math.floor(Math.random() * 60);
    this.swoopCooldown = 120 + Math.floor(Math.random() * 90);
    this.cataclysmCooldown = 300 + Math.floor(Math.random() * 120);
    this.divebombCooldown = 200 + Math.floor(Math.random() * 100);

    // Swoop mechanics
    this.isSwooping = false;
    this.committedAimAngle = 0;
    this.afterImages = [];
    this.hitOpponentThisSwoop = false;

    // Telegraphed Off-Screen Divebomb Strafe mechanics
    this.isTelegraphingDivebomb = false;
    this.isDivebombing = false;
    this.divebombStartX = 0;
    this.divebombStartY = 0;
    this.divebombEndX = 0;
    this.divebombEndY = 0;
    this.divebombAngle = 0;
    this.divebombTelegraphProgress = 0;
    this.divebombTelegraphMax = 55;
    this.divebombHitFighters = new Set();
    this.draggedVictims = new Set();
    this.divebombAcidTimer = 0;

    // Cataclysm mechanics
    this.isChannelingCataclysm = false;
    this.cataclysmProgress = 0;
    this.hasRoaredThisCataclysm = false;

    // Lingering Acid Pools
    this.acidPools = [];

    this._registerSkills();
  }

  /**
   * Terraria/Minecraft Void Flight Physics:
   * Ender Dragon glides freely through borders and terrain, hovering and soaring outside
   * the arena and across the screen window just like the Eye of Cthulhu.
   * Never abruptly bounces or clamps against the arena wall during combat.
   */
  resolveWallBounce(arena, opponent) {
    if (!arena && typeof state !== 'undefined') arena = state.arena;
    if (!arena) return false;

    // Rule 1.2: Standard CC trapping delegates to super
    if (typeof this.isCaughtInBeam === 'function' && (this.isCaughtInBeam() || this.isDraggedByGetsuga || this.isWallPinnedByMakima || this.isWallPinnedBySaitama)) {
      return super.resolveWallBounce(arena, opponent);
    }

    const cfg = this._getConfig();
    const cx = arena.x + arena.width / 2;
    const cy = arena.y + arena.height / 2;
    const ar = (arena.radius || (arena.width / 2));

    const isMatchEnded = typeof state !== 'undefined' && (
      state.gameState === 'roundEnd' || 
      state.gameState === 'matchEnd' || 
      state.gameState === 'gameOver' || 
      state.gameState === 'champion' || 
      Boolean(this._isWinnerReveal)
    );
    const isTargetAlive = Boolean(opponent && !opponent.isDead && opponent.hp > 0);

    // If the Dragon has won the match or all targets are dead, enforce smooth return inside arena
    if (isMatchEnded || !isTargetAlive) {
      const safeRadius = Math.max(30, ar - (this.r || 36) - 25);
      const distFromCenter = Math.hypot(this.x - cx, this.y - cy);
      if (distFromCenter > safeRadius && distFromCenter > 0) {
        const nx = (cx - this.x) / distFromCenter;
        const ny = (cy - this.y) / distFromCenter;
        const pullSpeed = Math.min(8.5, Math.max(4.0, (distFromCenter - safeRadius) * 0.10));
        this.vx += nx * pullSpeed * 0.30;
        this.vy += ny * pullSpeed * 0.30;
        const currentSpeed = Math.hypot(this.vx, this.vy);
        if (currentSpeed > pullSpeed) {
          this.vx = (this.vx / currentSpeed) * pullSpeed;
          this.vy = (this.vy / currentSpeed) * pullSpeed;
        }
      } else {
        this.vx *= 0.90;
        this.vy *= 0.90;
      }
      return false;
    }

    // Allow unrestricted off-screen flight and transit during divebomb sequence
    if (this.isTelegraphingDivebomb || this.isDivebombing || this.aiState === DRAGON_STATE.DIVEBOMB_SETUP || this.aiState === DRAGON_STATE.DIVEBOMB_TELEGRAPH || this.aiState === DRAGON_STATE.DIVEBOMB_STRIKE || this.aiState === DRAGON_STATE.DIVEBOMB_RECOVERY) {
      return false;
    }

    // During active combat: soft parabolic leash allows wide clipping beyond arena walls
    const maxAllowedDist = ar + (cfg.softLeashRadius || 280);
    const distFromCenter = Math.hypot(this.x - cx, this.y - cy);
    if (distFromCenter > maxAllowedDist && distFromCenter > 0) {
      // Gentle soft steering back towards arena center (smooth parabolic curve)
      const pullForce = 0.38 * (this.phaseSpeedMult || 1.0);
      const nx = (cx - this.x) / distFromCenter;
      const ny = (cy - this.y) / distFromCenter;
      this.vx += nx * pullForce;
      this.vy += ny * pullForce;
    }
    return false;
  }

  _getConfig() {
    if (this.bossConfig) return this.bossConfig;
    if (typeof CONFIG !== 'undefined' && CONFIG.ender_dragon) return CONFIG.ender_dragon;
    return enderDragonConfig;
  }

  _playAudio(key, fallbackSrc, defaultVol = 0.85) {
    const cfg = this._getConfig();
    const src = (cfg.sounds && cfg.sounds[key]) || fallbackSrc;
    const vol = (cfg.soundVolumes && cfg.soundVolumes[key] !== undefined)
      ? cfg.soundVolumes[key]
      : defaultVol;
    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX(src, vol);
      }
    } catch (_) {}
  }

  _registerSkills() {
    const cfg = this._getConfig();
    this.skills = [
      {
        id: 'dragonsBreath',
        name: "Dragon's Breath",
        cooldown: cfg.fireballCooldown || 480,
        currentCooldown: this.fireballCooldown || 0,
        icon: '🟣',
        desc: "Spits an explosive void fireball that detonates into a lingering acid pool.",
      },
      {
        id: 'wingBuffet',
        name: 'Wing Buffet',
        cooldown: cfg.swoopCooldown || 540,
        currentCooldown: this.swoopCooldown || 0,
        icon: '🦇',
        desc: "Performs a high-velocity aerial swoop launching enemies with massive kinetic force.",
      },
      {
        id: 'divebombStrafe',
        name: 'Void Divebomb',
        cooldown: cfg.divebombCooldown || 600,
        currentCooldown: this.divebombCooldown || 0,
        icon: '⚡',
        desc: "Hovers off-screen, projects a telegraphed danger carpet, and divebombs across the arena.",
      },
      {
        id: 'voidCataclysm',
        name: 'Void Cataclysm',
        cooldown: cfg.cataclysmCooldown || 1100,
        currentCooldown: this.cataclysmCooldown || 0,
        icon: '🌌',
        isUltimate: true,
        desc: "Ascends to perch, emits an earth-shattering roar, and discharges a 360° void wave.",
      },
    ];
  }

  _getValidEnemyOpponent(passedOpponent) {
    if (passedOpponent && passedOpponent.hp > 0 && !passedOpponent.isEndCrystal && !passedOpponent.isBoss && passedOpponent !== this) {
      return passedOpponent;
    }
    const enemies = this._collectAllEnemyTargets();
    if (enemies.length === 0) return null;
    enemies.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
    return enemies[0];
  }

  // ── Rule 1.4: Committed 360° Skill Aim Lock ──
  canAim() {
    if (this.isSwooping || this.isIntercepting || this.isChannelingCataclysm || this.isTelegraphingDivebomb || this.isDivebombing || this.aiState === DRAGON_STATE.SWOOP_DASH || this.aiState === DRAGON_STATE.DIVEBOMB_SETUP || this.aiState === DRAGON_STATE.DIVEBOMB_TELEGRAPH || this.aiState === DRAGON_STATE.DIVEBOMB_STRIKE || this.aiState === DRAGON_STATE.DIVEBOMB_RECOVERY || this.aiState === DRAGON_STATE.PERCH_TAKEOFF) {
      return false;
    }
    return super.canAim ? super.canAim() : true;
  }

  aim(target) {
    if (!this.canAim()) return false;
    const opponent = this._getValidEnemyOpponent(target);
    if (!opponent || opponent.hp <= 0) return false;

    const targetZ = opponent.z || 0;
    const myZ = this.z || (this.altitude ? this.altitude * 18 : 0);
    const targetAngle = Math.atan2((opponent.y - targetZ) - (this.y - myZ), opponent.x - this.x);

    let normAngle = targetAngle;
    while (normAngle > Math.PI) normAngle -= Math.PI * 2;
    while (normAngle < -Math.PI) normAngle += Math.PI * 2;

    this.gunAngle = normAngle;
    this.angle = normAngle;
    if (typeof this.rightGunAngle !== 'undefined') this.rightGunAngle = normAngle;
    if (typeof this.leftGunAngle !== 'undefined') this.leftGunAngle = normAngle;
    return true;
  }

  onCountdown(opponent) {
    const valid = this._getValidEnemyOpponent(opponent);
    if (valid) {
      this.aim(valid);
    }
  }

  // ── Pushback, Pull & Knockback Immunity Guard ──
  applyKnockback(vx, vy, opts = 0) {
    const isDivebombActive = this.isTelegraphingDivebomb || this.isDivebombing || this.aiState === DRAGON_STATE.DIVEBOMB_SETUP || this.aiState === DRAGON_STATE.DIVEBOMB_TELEGRAPH || this.aiState === DRAGON_STATE.DIVEBOMB_STRIKE || this.aiState === DRAGON_STATE.DIVEBOMB_RECOVERY || this.isChannelingCataclysm || this.aiState === DRAGON_STATE.CATACLYSM_CHANNEL;
    if (isDivebombActive || this.immuneToKnockback || this.immuneToPush) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      return;
    }
    super.applyKnockback(vx, vy, opts);
  }

  applyPull(targetX, targetY, strength) {
    const isDivebombActive = this.isTelegraphingDivebomb || this.isDivebombing || this.aiState === DRAGON_STATE.DIVEBOMB_SETUP || this.aiState === DRAGON_STATE.DIVEBOMB_TELEGRAPH || this.aiState === DRAGON_STATE.DIVEBOMB_STRIKE || this.aiState === DRAGON_STATE.DIVEBOMB_RECOVERY || this.isChannelingCataclysm || this.aiState === DRAGON_STATE.CATACLYSM_CHANNEL;
    if (isDivebombActive || this.immuneToPull || this.immuneToPush) {
      return;
    }
    if (typeof super.applyPull === 'function') {
      super.applyPull(targetX, targetY, strength);
    }
  }

  // ── Main Update Loop ──
  update(opponent, ownerIndex, arena) {
    // Dynamic divebomb pushback and pull immunity sync
    const isDivebombActive = this.isTelegraphingDivebomb || this.isDivebombing || this.aiState === DRAGON_STATE.DIVEBOMB_SETUP || this.aiState === DRAGON_STATE.DIVEBOMB_TELEGRAPH || this.aiState === DRAGON_STATE.DIVEBOMB_STRIKE || this.aiState === DRAGON_STATE.DIVEBOMB_RECOVERY || this.isChannelingCataclysm || this.aiState === DRAGON_STATE.CATACLYSM_CHANNEL;
    this.immuneToKnockback = isDivebombActive;
    this.immuneToPush = isDivebombActive;
    this.immuneToPull = isDivebombActive;

    if (isDivebombActive) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.isDraggedByGetsuga = false;
      this.isWallPinnedByMakima = false;
      this.isWallPinnedBySaitama = false;
      this.caughtInGenosFlurry = false;
      this.caughtInSaitamaFlurry = false;
    }

    // Rule 1.1: Freeze & TimeStop Early Guard
    const isFrozen = (typeof this._handleTimeStop === 'function') ? this._handleTimeStop() : false;
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    const cfg = this._getConfig();
    const validOpponent = this._getValidEnemyOpponent(opponent);

    // ── Pillar 4: Environmental Reactivity & HP Phase Check ──
    this._evaluateEnvironmentalReactivity(cfg);

    // ── Multi-Dimensional Altitude Shift Physics ──
    this._updateAltitude(cfg);

    // Tick cooldowns
    if (this.fireballCooldown > 0) this.fireballCooldown--;
    if (this.swoopCooldown > 0) this.swoopCooldown--;
    if (this.cataclysmCooldown > 0) this.cataclysmCooldown--;
    if (this.interceptCooldown > 0) this.interceptCooldown--;
    if (this.perchCooldown > 0) this.perchCooldown--;
    if (this.divebombCooldown > 0) this.divebombCooldown--;

    if (this.skills && this.skills.length >= 4) {
      this.skills[0].currentCooldown = this.fireballCooldown;
      this.skills[1].currentCooldown = this.swoopCooldown;
      this.skills[2].currentCooldown = this.divebombCooldown;
      this.skills[3].currentCooldown = this.cataclysmCooldown;
    }

    // Update lingering acid pools
    this._updateAcidPools(validOpponent);

    // Update trailing afterimages
    this._updateAfterImages();

    // AI State Machine Execution
    switch (this.aiState) {
      case DRAGON_STATE.PATROL:
        this._updatePatrolState(validOpponent, arena, cfg);
        break;
      case DRAGON_STATE.HOVER:
        this._updateHoverState(validOpponent, arena, cfg);
        break;
      case DRAGON_STATE.ALTITUDE_SHIFT:
        this._updateAltitudeShiftState(validOpponent, arena, cfg);
        break;
      case DRAGON_STATE.INTERCEPT:
        this._updateInterceptState(validOpponent, arena, cfg);
        break;
      case DRAGON_STATE.PERCH_DESCENT:
        this._updatePerchDescent(arena, cfg);
        break;
      case DRAGON_STATE.PERCH_GROUNDED:
        this._updatePerchGrounded(validOpponent, arena, cfg);
        break;
      case DRAGON_STATE.PERCH_TAKEOFF:
        this._updatePerchTakeoff(validOpponent, arena, cfg);
        break;
      case DRAGON_STATE.DIVEBOMB_SETUP:
        this._updateDivebombSetup(validOpponent, arena, cfg);
        break;
      case DRAGON_STATE.DIVEBOMB_TELEGRAPH:
        this._updateDivebombTelegraph(validOpponent, arena, cfg);
        break;
      case DRAGON_STATE.DIVEBOMB_STRIKE:
        this._updateDivebombStrike(validOpponent, arena, cfg);
        break;
      case DRAGON_STATE.DIVEBOMB_RECOVERY:
        this._updateDivebombRecovery(validOpponent, arena, cfg);
        break;
      case DRAGON_STATE.FIREBALL_SPIT:
        this._updateFireballState(validOpponent, cfg);
        break;
      case DRAGON_STATE.SWOOP_WINDUP:
        this._updateSwoopWindup(validOpponent, cfg);
        break;
      case DRAGON_STATE.SWOOP_DASH:
        this._updateSwoopDash(validOpponent, arena, cfg);
        break;
      case DRAGON_STATE.SWOOP_RECOVERY:
        this._updateSwoopRecovery(validOpponent, cfg);
        break;
      case DRAGON_STATE.CATACLYSM_CHANNEL:
        this._updateCataclysmChannel(validOpponent, arena, cfg);
        break;
      default:
        this.aiState = DRAGON_STATE.PATROL;
        break;
    }

    // Centralized Movement & Physics (Rule 1.2)
    this.x += this.vx;
    this.y += this.vy;

    // Apply flight friction when not in high-speed swoop/intercept/divebomb
    if (!this.isSwooping && !this.isIntercepting && !this.isDivebombing && this.aiState !== DRAGON_STATE.SWOOP_DASH && this.aiState !== DRAGON_STATE.DIVEBOMB_STRIKE) {
      const friction = this.isGrounded ? 0.90 : (cfg.hoverFriction || 0.96);
      this.vx *= friction;
      this.vy *= friction;

      // Enforce continuous natural flight momentum floor during open flight
      if (this.aiState === DRAGON_STATE.PATROL || this.aiState === DRAGON_STATE.HOVER) {
        const curSpd = Math.hypot(this.vx, this.vy);
        if (curSpd < 3.2 && curSpd > 0.05) {
          const boost = 3.2 / curSpd;
          this.vx *= boost;
          this.vy *= boost;
        }
      }
    }

    // Resolve Arena Wall Bouncing & Obstacle Collisions (Rule 1.2)
    this.resolveWallBounce(arena, validOpponent);
  }

  // ── Pillar 4: Environmental Reactivity & Phase Tracking ──
  _evaluateEnvironmentalReactivity(cfg) {
    const maxHp = this.maxHp || cfg.hp || 520;
    const hpRatio = Math.max(0, this.hp / maxHp);

    let newPhase = 1;
    let newSpeedMult = 1.0;

    if (hpRatio <= (cfg.phase4HpThreshold || 0.25)) {
      newPhase = 4;
      newSpeedMult = cfg.phase4SpeedMult || 1.45;
    } else if (hpRatio <= (cfg.phase3HpThreshold || 0.50)) {
      newPhase = 3;
      newSpeedMult = cfg.phase3SpeedMult || 1.25;
    } else if (hpRatio <= (cfg.phase2HpThreshold || 0.75)) {
      newPhase = 2;
      newSpeedMult = cfg.phase2SpeedMult || 1.12;
    }

    if (newPhase !== this.currentPhase) {
      this.currentPhase = newPhase;
      this.phaseSpeedMult = newSpeedMult;

      // Environmental Enrage Surge Feedback
      triggerGlobalScreenShake(10, 25);
      spawnImpactFlash(this.x, this.y, (this.r || 36) * 3.5, '#C026D3');
      spawnSparks(this.x, this.y, '#F5D0FE', 24, 7.5);
      this._playAudio('roar', 'Assets/Sound Effects/Skills/ragescream.mp3', 1.0);

      // Shift patrol direction & tighten flight radius
      this.patrolDirection *= -1;
      this.targetAltitude = 1.7; // Sudden climb
    }

    // Environmental Support Node / End Crystal Tracking
    if (typeof state !== 'undefined' && state.fighters) {
      const activeCrystals = state.fighters.filter(f => f && f.isEndCrystal && f.hp > 0).length;
      if (this._lastCrystalCount !== undefined && activeCrystals < this._lastCrystalCount) {
        // A crystal was destroyed: immediate evasive reaction & direction shift
        this.patrolDirection *= -1;
        this.targetAltitude = 1.7;
        triggerGlobalScreenShake(8, 20);
        this._playAudio('roar', 'Assets/Sound Effects/Skills/ragescream.mp3', 0.90);
      }
      this._lastCrystalCount = activeCrystals;
    }
  }

  // ── Altitude & Simulated 3D Depth Engine ──
  _updateAltitude(cfg) {
    if (this.isGrounded) {
      this.targetAltitude = 0.0;
    }

    // Smooth altitude convergence
    this.altitude += (this.targetAltitude - this.altitude) * 0.06;
    this.z = this.altitude * 20;

    // Periodic altitude shift timer
    if (!this.isGrounded && this.aiState === DRAGON_STATE.PATROL) {
      this.altitudeTimer--;
      if (this.altitudeTimer <= 0) {
        this.altitudeTimer = (cfg.altitudeShiftInterval || 300) + Math.floor(Math.random() * 150);
        // Switch between High Soaring (1.7), Cruise (1.0), and Low Skimming (0.4)
        const rand = Math.random();
        if (rand < 0.40) {
          this.targetAltitude = cfg.highAltitude || 1.7;
          this.vx *= 1.25;
          this.vy *= 1.25;
        } else if (rand < 0.75) {
          this.targetAltitude = cfg.cruiseAltitude || 1.0;
        } else {
          this.targetAltitude = cfg.lowAltitude || 0.4;
          // Spawn air skim sparks on floor
          spawnSparks(this.x, this.y, '#E879F9', 4, 3.0);
        }
      }
    }
  }

  // ── Pillar 1: Dynamic Flight Paths & Sweeping Perimeter Patrols ──
  _updatePatrolState(opponent, arena, cfg) {
    const curArena = arena || (typeof state !== 'undefined' ? state.arena : null) || { x: 40, y: 240, width: 450, height: 450 };
    const cx = curArena.x + curArena.width / 2;
    const cy = curArena.y + curArena.height / 2;
    const baseAr = (curArena.radius || (curArena.width / 2));
    const patrolRadius = baseAr * (cfg.patrolRadiusRatio || 1.10);

    // Advance perimeter orbital angle
    const angularSpeed = (cfg.patrolAngularSpeed || 0.016) * this.phaseSpeedMult;
    this.patrolAngle += this.patrolDirection * angularSpeed;

    this.patrolWobbleTime += (cfg.patrolWobbleFreq || 0.03);
    const wobble = Math.sin(this.patrolWobbleTime) * (cfg.patrolWobbleAmp || 45);
    const effRadius = Math.max(60, patrolRadius + wobble);

    const targetX = cx + Math.cos(this.patrolAngle) * effRadius;
    const targetY = cy + Math.sin(this.patrolAngle) * (effRadius * 0.90);

    const baseSpeed = (cfg.patrolSpeed || 5.6) * this.phaseSpeedMult;

    // Continuous dynamic forward tangential momentum
    const tangentAngle = this.patrolAngle + (Math.PI / 2) * this.patrolDirection;
    const desiredVx = Math.cos(tangentAngle) * baseSpeed;
    const desiredVy = Math.sin(tangentAngle) * baseSpeed;

    // Radial correction toward elliptical perimeter
    const radDx = targetX - this.x;
    const radDy = targetY - this.y;
    const radDist = Math.hypot(radDx, radDy) || 1;

    this.vx += (desiredVx - this.vx) * 0.12 + (radDx / radDist) * 0.35 * this.phaseSpeedMult;
    this.vy += (desiredVy - this.vy) * 0.12 + (radDy / radDist) * 0.35 * this.phaseSpeedMult;

    // Align facing with flight path vector
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > 0.8) {
      const moveAngle = Math.atan2(this.vy, this.vx);
      this.gunAngle = moveAngle;
      this.angle = moveAngle;
    }

    // Periodic wing flap sound
    if (Math.random() < 0.018) {
      this._playAudio('wingFlap', 'Assets/Sound Effects/Skills/woosh.mp3', 0.55);
    }

    // Evaluate Decision Matrix
    if (this.cataclysmCooldown <= 0 && opponent && opponent.hp > 0) {
      this._initiateCataclysm(opponent, cfg);
    } else if (this.divebombCooldown <= 0 && opponent && opponent.hp > 0) {
      this._initiateDivebombSetup(opponent, curArena, cfg);
    } else if (this.interceptCooldown <= 0 && opponent && opponent.hp > 0) {
      this._initiateIntercept(opponent, cfg);
    } else if (this.swoopCooldown <= 0 && opponent && opponent.hp > 0) {
      this._initiateSwoopWindup(opponent, cfg);
    } else if (this.fireballCooldown <= 0 && opponent && opponent.hp > 0) {
      this._initiateFireball(opponent, cfg);
    } else if (this.perchCooldown <= 0 && (!opponent || opponent.hp > 0)) {
      this._initiatePerchDescent(curArena, cfg);
    }
  }

  // ── Pillar 2: Target Interception & Kinetic Space Control ──
  _initiateIntercept(opponent, cfg) {
    this.aiState = DRAGON_STATE.INTERCEPT;
    this.isIntercepting = true;
    this.interceptHitFighters.clear();

    const leadFrames = cfg.interceptLeadFrames || 14;
    const leadX = opponent.x + (opponent.vx || 0) * leadFrames;
    const leadY = opponent.y + (opponent.vy || 0) * leadFrames;

    this.interceptTargetAngle = Math.atan2(leadY - this.y, leadX - this.x);
    this.gunAngle = this.interceptTargetAngle;
    this.angle = this.interceptTargetAngle;

    const speed = (cfg.interceptSpeed || 16.5) * this.phaseSpeedMult;
    this.vx = Math.cos(this.interceptTargetAngle) * speed;
    this.vy = Math.sin(this.interceptTargetAngle) * speed;

    this.stateTimer = 26;
    this._playAudio('swoop', 'Assets/Sound Effects/Skills/dash2.mp3', 0.95);
  }

  _updateInterceptState(opponent, arena, cfg) {
    this.stateTimer--;

    // Trail high-speed afterimages
    if (this.stateTimer % 3 === 0) {
      this.afterImages.push({
        x: this.x,
        y: this.y,
        angle: this.interceptTargetAngle,
        alpha: 0.60,
      });
    }

    // Sheer Mass & Momentum Space Control: Gale-Force Wind Buffet
    const reach = cfg.interceptGaleReach || 75;
    const galeDamage = cfg.interceptGaleDamage || 16;
    const galeKnockback = (cfg.interceptGaleKnockback || 16.0) * this.phaseSpeedMult;
    const targets = this._collectAllEnemyTargets();

    for (let target of targets) {
      if (!target || target === this || target.hp <= 0) continue;
      if (this.interceptHitFighters.has(target)) continue;

      const d = Math.hypot(target.x - this.x, target.y - this.y);
      if (d <= reach + (target.r || 20)) {
        this.interceptHitFighters.add(target);

        // Apply gale brush damage & violent displacement impulse
        applyDamageToTarget(target, galeDamage, this);
        spawnFloatingText(target.x, target.y - 15, `-${galeDamage}`, '#C026D3');
        spawnSparks(target.x, target.y, '#E879F9', 10, 4.5);
        triggerGlobalScreenShake(5, 14);

        const pushAngle = Math.atan2(target.y - this.y, target.x - this.x);
        if (typeof target.applyKnockback === 'function') {
          target.applyKnockback(Math.cos(pushAngle) * galeKnockback, Math.sin(pushAngle) * galeKnockback, 12);
        }
        if (typeof target.applyTimeStop === 'function') {
          target.applyTimeStop(6);
        }
      }
    }

    if (this.stateTimer <= 0) {
      this.isIntercepting = false;
      this.targetAltitude = 1.7; // Rebound climb
      this.aiState = DRAGON_STATE.PATROL;
      this.interceptCooldown = (cfg.interceptCooldown || 360) / this.phaseSpeedMult;
      this.vx *= 0.35;
      this.vy *= 0.35;
    }
  }

  // ── Pillar 3: Low-Altitude Center Vortex Strafe Pass ──
  _initiatePerchDescent(arena, cfg) {
    this.aiState = DRAGON_STATE.PERCH_DESCENT;
    this.targetAltitude = 0.35; // Low skimming altitude
    this.stateTimer = 60;
    this._playAudio('wingFlap', 'Assets/Sound Effects/Skills/woosh.mp3', 0.80);
  }

  _updatePerchDescent(arena, cfg) {
    this.stateTimer--;
    const curArena = arena || (typeof state !== 'undefined' ? state.arena : null) || { x: 40, y: 240, width: 450, height: 450 };
    const anchorX = curArena.x + curArena.width / 2;
    const anchorY = curArena.y + curArena.height / 2;

    const dx = anchorX - this.x;
    const dy = anchorY - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    // Smooth gliding swoop inward
    this.vx += (dx / dist) * 0.35 * this.phaseSpeedMult;
    this.vy += (dy / dist) * 0.35 * this.phaseSpeedMult;
    this.gunAngle = Math.atan2(this.vy, this.vx);
    this.angle = this.gunAngle;

    // Enter active vortex strafe once close to center anchor
    if (dist <= 80 || this.stateTimer <= 0) {
      this.aiState = DRAGON_STATE.PERCH_GROUNDED;
      this.isGrounded = false;
      this.altitude = 0.35;
      this.targetAltitude = 0.35;
      this.perchVortexAngle = Math.atan2(this.y - anchorY, this.x - anchorX);
      const baseDuration = cfg.perchGroundedDuration || 110;
      this.stateTimer = Math.max(70, Math.floor(baseDuration / this.phaseSpeedMult));
      this.perchBreathTimer = 18;

      spawnSparks(this.x, this.y, '#A21CAF', 12, 4.0);
    }
  }

  _updatePerchGrounded(opponent, arena, cfg) {
    this.stateTimer--;
    const curArena = arena || (typeof state !== 'undefined' ? state.arena : null) || { x: 40, y: 240, width: 450, height: 450 };
    const cx = curArena.x + curArena.width / 2;
    const cy = curArena.y + curArena.height / 2;

    // Continuous dynamic low-altitude vortex orbit (never stops moving!)
    this.perchVortexAngle = (this.perchVortexAngle || 0) + 0.065 * this.phaseSpeedMult;
    const vortexRadius = 95;
    const targetX = cx + Math.cos(this.perchVortexAngle) * vortexRadius;
    const targetY = cy + Math.sin(this.perchVortexAngle) * (vortexRadius * 0.85);

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    this.vx += (dx / dist) * 0.55 * this.phaseSpeedMult;
    this.vy += (dy / dist) * 0.55 * this.phaseSpeedMult;

    // Minimum forward glide speed
    const spd = Math.hypot(this.vx, this.vy);
    if (spd > 7.0) {
      this.vx = (this.vx / spd) * 7.0;
      this.vy = (this.vy / spd) * 7.0;
    }
    this.gunAngle = Math.atan2(this.vy, this.vx);
    this.angle = this.gunAngle;

    // Low skimming air sparks
    if (Math.random() < 0.35) {
      spawnSparks(this.x, this.y, '#E879F9', 2, 2.5);
    }

    // Exhale sweeping breath sprays during active flight
    this.perchBreathTimer--;
    if (this.perchBreathTimer <= 0) {
      this.perchBreathTimer = cfg.perchBreathCooldown || 35;
      this._exhalePerchBreath(opponent, cfg);
    }

    if (this.stateTimer <= 0) {
      this._initiatePerchTakeoff(cfg);
    }
  }

  _exhalePerchBreath(opponent, cfg) {
    this._playAudio('fireball', 'Assets/Sound Effects/Skills/redblast.mp3', 0.65);
    const baseAngle = this.gunAngle || 0;
    const count = 3;
    for (let i = 0; i < count; i++) {
      const spread = (i - 1) * 0.22;
      const angle = baseAngle + spread;
      const speed = 7.0;
      const r = 14;

      const proj = {
        x: this.x + Math.cos(angle) * (this.r + 5),
        y: this.y + Math.sin(angle) * (this.r + 5),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: r,
        damage: 14,
        owner: this,
        color: '#D946EF',
        maxDistance: 220,
        traveled: 0,
        update() {
          this.x += this.vx;
          this.y += this.vy;
          this.traveled += speed;
          const targets = (typeof state !== 'undefined' && state.fighters) ? state.fighters : [];
          for (let f of targets) {
            if (f && f !== this.owner && f.hp > 0 && !f.isEndCrystal && !f.isBoss) {
              const d = Math.hypot(f.x - this.x, f.y - this.y);
              if (d < (f.r || 20) + this.radius) {
                applyDamageToTarget(f, this.damage, this.owner);
                spawnSparks(this.x, this.y, '#E879F9', 6, 3.0);
                return true;
              }
            }
          }
          return this.traveled >= this.maxDistance;
        },
        draw(ctx) {
          ctx.save();
          ctx.translate(this.x, this.y);
          ctx.fillStyle = '#D946EF';
          ctx.beginPath();
          ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      };

      if (typeof projectileSystem !== 'undefined' && projectileSystem.addProjectile) {
        projectileSystem.addProjectile(proj);
      } else if (typeof state !== 'undefined' && state.projectiles) {
        state.projectiles.push(proj);
      }
    }
  }

  _initiatePerchTakeoff(cfg) {
    this.aiState = DRAGON_STATE.PERCH_TAKEOFF;
    this.isGrounded = false;
    this.targetAltitude = 1.7; // Launch skyward
    this.stateTimer = 22;

    const shockwaveR = cfg.perchTakeoffShockwaveRadius || 160;
    const damage = cfg.perchTakeoffDamage || 24;
    const knockback = (cfg.perchTakeoffKnockback || 18.0) * this.phaseSpeedMult;

    // Audio & Screen Feedback
    this._playAudio('roar', 'Assets/Sound Effects/Skills/ragescream.mp3', 0.95);
    this._playAudio('wingFlap', 'Assets/Sound Effects/Skills/woosh.mp3', 0.90);
    triggerGlobalScreenShake(8, 20);
    spawnImpactFlash(this.x, this.y, shockwaveR, '#F5D0FE');
    spawnSparks(this.x, this.y, '#C026D3', 24, 7.0);

    // Radial Wind Blast Knockback on nearby ground targets
    const targets = this._collectAllEnemyTargets();
    for (let target of targets) {
      if (!target || target === this || target.hp <= 0) continue;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= shockwaveR) {
        const angle = Math.atan2(dy, dx);
        applyDamageToTarget(target, damage, this);
        spawnFloatingText(target.x, target.y - 15, `-${damage}`, '#C026D3');

        if (typeof target.applyTimeStop === 'function') {
          target.applyTimeStop(8);
        }
        if (typeof target.applyKnockback === 'function') {
          target.applyKnockback(Math.cos(angle) * knockback, Math.sin(angle) * knockback, 15);
        }
      }
    }
  }

  _updatePerchTakeoff(opponent, arena, cfg) {
    this.stateTimer--;
    this.vy -= 0.6; // Rapid upward propulsion

    if (this.stateTimer <= 0) {
      this.aiState = DRAGON_STATE.PATROL;
      this.perchCooldown = (cfg.perchInterval || 1200) / this.phaseSpeedMult;
    }
  }

  _updateAltitudeShiftState(opponent, arena, cfg) {
    this.aiState = DRAGON_STATE.PATROL;
  }

  // ── Multi-Dimensional High Altitude Screen Hovering ──
  _updateHoverState(opponent, arena, cfg) {
    if (!opponent || opponent.hp <= 0) {
      this.aiState = DRAGON_STATE.PATROL;
      return;
    }

    this.hoverOrbitTime = (this.hoverOrbitTime || 0) + (cfg.hoverOscillationFreq || 0.035) * this.phaseSpeedMult;
    this.targetAltitude = cfg.highAltitude || 1.7;

    // Fluid orbital path around opponent: continuously glides in an expanding/contracting elliptical halo
    const orbitRadius = (cfg.hoverOrbitWobbleAmp || 160) + Math.sin(this.hoverOrbitTime * 0.5) * 45;
    const targetX = opponent.x + Math.cos(this.hoverOrbitTime) * orbitRadius;
    const targetY = opponent.y - (cfg.hoverTargetDistanceY || 130) + Math.sin(this.hoverOrbitTime * 1.3) * (cfg.hoverOscillationAmp || 35);

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    const baseHoverSpeed = (cfg.speed || 4.8) * this.phaseSpeedMult;
    const steerForce = 0.38 * this.phaseSpeedMult;
    this.vx += (dx / dist) * steerForce;
    this.vy += (dy / dist) * steerForce;

    // Enforce smooth continuous cruising speed (never decelerate to 0)
    const curSpeed = Math.hypot(this.vx, this.vy);
    if (curSpeed < 3.2) {
      const angle = curSpeed > 0.1 ? Math.atan2(this.vy, this.vx) : this.hoverOrbitTime + Math.PI / 2;
      this.vx = Math.cos(angle) * 3.6;
      this.vy = Math.sin(angle) * 3.6;
    } else if (curSpeed > baseHoverSpeed * 1.35) {
      this.vx = (this.vx / curSpeed) * (baseHoverSpeed * 1.35);
      this.vy = (this.vy / curSpeed) * (baseHoverSpeed * 1.35);
    }

    // Align facing with movement direction or track aim
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > 1.2) {
      const moveAngle = Math.atan2(this.vy, this.vx);
      this.gunAngle = moveAngle;
      this.angle = moveAngle;
    } else {
      this.aim(opponent);
    }

    // Flap wings sound
    if (Math.random() < 0.02) {
      this._playAudio('wingFlap', 'Assets/Sound Effects/Skills/woosh.mp3', 0.55);
    }

    // Dynamic state transitions
    if (this.cataclysmCooldown <= 0) {
      this._initiateCataclysm(opponent, cfg);
    } else if (this.divebombCooldown <= 0) {
      this._initiateDivebombSetup(opponent, arena, cfg);
    } else if (this.swoopCooldown <= 0) {
      this._initiateSwoopWindup(opponent, cfg);
    } else if (this.interceptCooldown <= 0) {
      this._initiateIntercept(opponent, cfg);
    } else if (this.fireballCooldown <= 0) {
      this._initiateFireball(opponent, cfg);
    } else if (this.perchCooldown <= 0) {
      this._initiatePerchDescent(arena, cfg);
    }
  }

  // ── Skill 1: Dragon's Breath / Fireball ──
  _initiateFireball(opponent, cfg) {
    this.aiState = DRAGON_STATE.FIREBALL_SPIT;
    this.stateTimer = 18;
    this.committedAimAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.gunAngle = this.committedAimAngle;
    this.angle = this.committedAimAngle;
  }

  _updateFireballState(opponent, cfg) {
    this.stateTimer--;
    if (this.stateTimer === 8) {
      this._fireDragonBreath(cfg);
    }
    if (this.stateTimer <= 0) {
      this.aiState = DRAGON_STATE.HOVER;
      this.fireballCooldown = cfg.fireballCooldown || 480;
    }
  }

  _fireDragonBreath(cfg) {
    const angle = this.committedAimAngle;
    const speed = cfg.fireballSpeed || 9.0;
    const damage = cfg.fireballDamage || 28;
    const r = cfg.fireballRadius || 16;
    const sourceFighter = this;

    this._playAudio('fireball', 'Assets/Sound Effects/Skills/redblast.mp3', 0.85);

    // Spawn fireball projectile
    const proj = {
      x: this.x + Math.cos(angle) * (this.r + 10),
      y: this.y + Math.sin(angle) * (this.r + 10),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: r,
      damage: damage,
      owner: sourceFighter,
      color: '#C026D3',
      secondaryColor: '#E879F9',
      isEnderFireball: true,
      maxDistance: 600,
      traveled: 0,
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.traveled += speed;

        if (Math.random() < 0.4) {
          spawnSparks(this.x, this.y, '#D946EF', 2, 2.0);
        }

        // Check collision or max distance
        const targets = (typeof state !== 'undefined' && state.fighters) ? state.fighters : [];
        for (let f of targets) {
          if (f && f !== sourceFighter && f.hp > 0 && !f.isEndCrystal && !f.isBoss) {
            const d = Math.hypot(f.x - this.x, f.y - this.y);
            if (d < (f.r || 20) + this.radius) {
              this.detonate();
              return true; // Destroy projectile
            }
          }
        }

        if (this.traveled >= this.maxDistance) {
          this.detonate();
          return true;
        }
        return false;
      },
      detonate() {
        sourceFighter._playAudio('fireballImpact', 'Assets/Sound Effects/Skills/purpledeploy.mp3', 0.90);
        triggerGlobalScreenShake(6, 15);
        spawnImpactFlash(this.x, this.y, cfg.fireballDetonationRadius || 70, '#F5D0FE');
        spawnSparks(this.x, this.y, '#C026D3', 18, 5.0);

        // Deploy lingering acid pool
        sourceFighter.acidPools.push({
          x: this.x,
          y: this.y,
          radius: cfg.acidPoolRadius || 70,
          duration: cfg.acidPoolDurationFrames || 180,
          maxDuration: cfg.acidPoolDurationFrames || 180,
          tickTimer: 0,
          tickInterval: cfg.acidTickInterval || 15,
          damagePerTick: cfg.acidDamagePerTick || 6,
          owner: sourceFighter,
        });
      },
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#C026D3';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#F5D0FE';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#E879F9';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    };

    if (typeof projectileSystem !== 'undefined' && projectileSystem.addProjectile) {
      projectileSystem.addProjectile(proj);
    } else if (typeof state !== 'undefined' && state.projectiles) {
      state.projectiles.push(proj);
    }
  }

  // ── Skill 2: Wing Buffet / Kinetic Swoop ──
  _initiateSwoopWindup(opponent, cfg) {
    this.aiState = DRAGON_STATE.SWOOP_WINDUP;
    this.stateTimer = cfg.swoopWindupFrames || 14;
    this.committedAimAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.gunAngle = this.committedAimAngle;
    this.angle = this.committedAimAngle;
    this.vx *= 0.3;
    this.vy *= 0.3;

    this._playAudio('swoop', 'Assets/Sound Effects/Skills/dash2.mp3', 0.90);
  }

  _updateSwoopWindup(opponent, cfg) {
    this.stateTimer--;
    if (this.stateTimer <= 0) {
      this.aiState = DRAGON_STATE.SWOOP_DASH;
      this.stateTimer = cfg.swoopDurationFrames || 18;
      this.isSwooping = true;
      this.hitOpponentThisSwoop = false;

      const speed = cfg.swoopSpeed || 18.5;
      this.vx = Math.cos(this.committedAimAngle) * speed;
      this.vy = Math.sin(this.committedAimAngle) * speed;
    }
  }

  _updateSwoopDash(opponent, arena, cfg) {
    this.stateTimer--;

    // Trail afterimages
    if (this.stateTimer % 3 === 0) {
      this.afterImages.push({
        x: this.x,
        y: this.y,
        angle: this.committedAimAngle,
        alpha: 0.55,
      });
    }

    // Frontal Arc Collision Query (Rule 1.6)
    if (!this.hitOpponentThisSwoop) {
      const reach = cfg.swoopReach || 80;
      const arc = cfg.swoopArc || (120 * Math.PI / 180);
      const targets = this._collectAllEnemyTargets();

      for (let target of targets) {
        if (!target || target === this || target.hp <= 0) continue;
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= reach + (target.r || 20)) {
          const targetAngle = Math.atan2(dy, dx);
          let angleDiff = targetAngle - this.committedAimAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          if (Math.abs(angleDiff) <= arc / 2) {
            this._applySwoopHit(target, cfg);
            this.hitOpponentThisSwoop = true;
            break;
          }
        }
      }
    }

    if (this.stateTimer <= 0) {
      this.isSwooping = false;
      this.aiState = DRAGON_STATE.SWOOP_RECOVERY;
      this.stateTimer = cfg.swoopTurnaroundFrames || 8;
      this.vx *= 0.25;
      this.vy *= 0.25;
    }
  }

  _applySwoopHit(target, cfg) {
    const damage = cfg.swoopDamage || 38;
    const knockback = cfg.swoopKnockback || 20.0;
    const angle = this.committedAimAngle;

    this._playAudio('swoopHit', 'Assets/Sound Effects/Attacks/heavypunch1.mp3', 0.95);
    triggerGlobalScreenShake(8, 20);
    spawnImpactFlash(target.x, target.y, 45, '#F5D0FE');
    spawnSparks(target.x, target.y, '#C026D3', 14, 6.0);

    applyDamageToTarget(target, damage, this);
    spawnFloatingText(target.x, target.y - 20, `-${damage}`, '#C026D3');

    // Rule 1.5: Freeze / hit-pause applied to target only
    if (typeof target.applyTimeStop === 'function') {
      target.applyTimeStop(8);
    }

    if (typeof target.applyKnockback === 'function') {
      target.applyKnockback(Math.cos(angle) * knockback, Math.sin(angle) * knockback, 14);
    }
  }

  _updateSwoopRecovery(opponent, cfg) {
    this.stateTimer--;
    if (this.stateTimer <= 0) {
      this.aiState = DRAGON_STATE.HOVER;
      this.swoopCooldown = cfg.swoopCooldown || 540;
    }
  }

  // ── Skill 3 / Ultimate: Void Cataclysm & Perch ──
  _initiateCataclysm(opponent, cfg) {
    this.aiState = DRAGON_STATE.CATACLYSM_CHANNEL;
    this.stateTimer = cfg.cataclysmChannelFrames || 70;
    this.isChannelingCataclysm = true;
    this.cataclysmProgress = 0;
    this.hasRoaredThisCataclysm = false;
    this.targetAltitude = 1.8; // Dramatic skyward ascent

    // Maintain majestic circular ascent flight vector (never freezes!)
    const currentAngle = this.gunAngle || 0;
    this.vx = Math.cos(currentAngle) * 3.5;
    this.vy = Math.sin(currentAngle) * 3.5;

    this._playAudio('lightning', 'Assets/Sound Effects/Skills/thunderstrike.mp3', 0.85);
  }

  _updateCataclysmChannel(opponent, arena, cfg) {
    this.stateTimer--;
    const totalFrames = cfg.cataclysmChannelFrames || 70;
    this.cataclysmProgress = 1.0 - (this.stateTimer / totalFrames);

    // Majestic circling flight while gathering void energy
    const circleAngle = (totalFrames - this.stateTimer) * 0.08;
    this.vx = Math.cos(circleAngle) * 3.5;
    this.vy = Math.sin(circleAngle) * 2.5 - 0.3;
    this.gunAngle = Math.atan2(this.vy, this.vx);
    this.angle = this.gunAngle;

    // Roar & shockwave at frame 40
    const roarFrame = cfg.cataclysmRoarFrame || 40;
    if (this.stateTimer === (totalFrames - roarFrame) && !this.hasRoaredThisCataclysm) {
      this.hasRoaredThisCataclysm = true;
      this._dischargeCataclysmBurst(cfg);
    }

    if (this.stateTimer <= 0) {
      this.isChannelingCataclysm = false;
      this.aiState = DRAGON_STATE.HOVER;
      this.cataclysmCooldown = cfg.cataclysmCooldown || 1100;
    }
  }

  _dischargeCataclysmBurst(cfg) {
    const shockwaveR = cfg.cataclysmShockwaveRadius || 220;
    const damage = cfg.cataclysmShockwaveDamage || 65;
    const knockback = cfg.cataclysmShockwaveKnockback || 22.0;

    this._playAudio('roar', 'Assets/Sound Effects/Skills/ragescream.mp3', 1.0);
    triggerGlobalScreenShake(cfg.cataclysmScreenShake || 12, 35);
    spawnImpactFlash(this.x, this.y, shockwaveR, '#F5D0FE');
    spawnSparks(this.x, this.y, '#C026D3', 30, 9.0);

    const targets = this._collectAllEnemyTargets();
    for (let target of targets) {
      if (!target || target === this || target.hp <= 0) continue;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= shockwaveR) {
        const angle = Math.atan2(dy, dx);
        applyDamageToTarget(target, damage, this);
        spawnFloatingText(target.x, target.y - 25, `-${damage}`, '#E879F9');

        if (typeof target.applyTimeStop === 'function') {
          target.applyTimeStop(12);
        }
        if (typeof target.applyKnockback === 'function') {
          target.applyKnockback(Math.cos(angle) * knockback, Math.sin(angle) * knockback, 18);
        }
      }
    }

    // Secondary homing void fireballs in spiral
    const count = cfg.cataclysmSecondaryFireballs || 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this._fireSecondaryFireball(angle, cfg);
    }
  }

  _fireSecondaryFireball(angle, cfg) {
    const speed = cfg.cataclysmSecondarySpeed || 7.5;
    const damage = cfg.cataclysmSecondaryDamage || 18;
    const sourceFighter = this;

    const proj = {
      x: this.x + Math.cos(angle) * (this.r + 5),
      y: this.y + Math.sin(angle) * (this.r + 5),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 12,
      damage: damage,
      owner: sourceFighter,
      maxDistance: 450,
      traveled: 0,
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.traveled += speed;

        const targets = (typeof state !== 'undefined' && state.fighters) ? state.fighters : [];
        for (let f of targets) {
          if (f && f !== sourceFighter && f.hp > 0 && !f.isEndCrystal && !f.isBoss) {
            const d = Math.hypot(f.x - this.x, f.y - this.y);
            if (d < (f.r || 20) + this.radius) {
              applyDamageToTarget(f, this.damage, sourceFighter);
              spawnSparks(this.x, this.y, '#D946EF', 8, 3.5);
              return true;
            }
          }
        }
        return this.traveled >= this.maxDistance;
      },
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#D946EF';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    if (typeof projectileSystem !== 'undefined' && projectileSystem.addProjectile) {
      projectileSystem.addProjectile(proj);
    } else if (typeof state !== 'undefined' && state.projectiles) {
      state.projectiles.push(proj);
    }
  }

  // ── Acid Pools & Helpers ──
  _updateAcidPools(opponent) {
    for (let i = this.acidPools.length - 1; i >= 0; i--) {
      const pool = this.acidPools[i];
      pool.duration--;
      pool.tickTimer++;

      if (pool.tickTimer >= pool.tickInterval) {
        pool.tickTimer = 0;
        const targets = this._collectAllEnemyTargets();

        for (let target of targets) {
          if (!target || target === this || target.hp <= 0) continue;
          const d = Math.hypot(target.x - pool.x, target.y - pool.y);
          if (d <= pool.radius) {
            applyDamageToTarget(target, pool.damagePerTick, this);
            spawnFloatingText(target.x, target.y - 10, `-${pool.damagePerTick}`, '#A21CAF');
            this._playAudio('acidTick', 'Assets/Sound Effects/Attacks/fleshhit.mp3', 0.35);

            // Apply movement slow
            target.vx = (target.vx || 0) * 0.85;
            target.vy = (target.vy || 0) * 0.85;
          }
        }
      }

      if (pool.duration <= 0) {
        this.acidPools.splice(i, 1);
      }
    }
  }

  _updateAfterImages() {
    for (let i = this.afterImages.length - 1; i >= 0; i--) {
      this.afterImages[i].alpha -= 0.05;
      if (this.afterImages[i].alpha <= 0) {
        this.afterImages.splice(i, 1);
      }
    }
  }

  _collectAllEnemyTargets() {
    const targets = [];
    if (typeof state !== 'undefined') {
      if (Array.isArray(state.fighters)) {
        for (let f of state.fighters) {
          if (f && f !== this && f.hp > 0 && !f.isEndCrystal && !f.isBoss) targets.push(f);
        }
      }
      if (Array.isArray(state.illusions)) {
        for (let ill of state.illusions) {
          if (ill && ill !== this && ill.hp > 0 && !ill.isEndCrystal) targets.push(ill);
        }
      }
    }
    return targets;
  }

  _enforceArenaLeash(arena, cfg) {
    if (!arena) return;
    const margin = cfg.softLeashRadius || 440;
    const ax = arena.x + arena.width / 2;
    const ay = arena.y + arena.height / 2;
    const dist = Math.hypot(this.x - ax, this.y - ay);

    if (dist > margin) {
      const pull = 0.35;
      const angle = Math.atan2(ay - this.y, ax - this.x);
      this.vx += Math.cos(angle) * pull;
      this.vy += Math.sin(angle) * pull;
    }
  }

  // ── Skill 4: Off-Screen Telegraphed Divebomb Strafe Methods ──
  _initiateDivebombSetup(opponent, arena, cfg) {
    this.aiState = DRAGON_STATE.DIVEBOMB_SETUP;
    this.isTelegraphingDivebomb = false;
    this.isDivebombing = false;

    const curArena = arena || (typeof state !== 'undefined' ? state.arena : null) || { x: 40, y: 240, width: 450, height: 450 };
    const cx = curArena.x + curArena.width / 2;
    const cy = curArena.y + curArena.height / 2;
    const ar = (curArena.radius || (curArena.width / 2));

    // Determine natural exit flight angle based on current position and momentum
    const currentDistFromCenter = Math.hypot(this.x - cx, this.y - cy);
    let exitAngle;
    if (currentDistFromCenter > 20) {
      exitAngle = Math.atan2(this.y - cy, this.x - cx);
    } else {
      exitAngle = Math.atan2(this.vy || 1, this.vx || 0);
    }

    // Set high-altitude soaring for the off-screen bank
    this.targetAltitude = cfg.highAltitude || 1.7;
    this.stateTimer = 50; // Timeout guard for reaching perimeter

    // Smooth outward acceleration burst along natural flight vector
    const burstSpeed = 8.5 * this.phaseSpeedMult;
    this.vx = Math.cos(exitAngle) * burstSpeed;
    this.vy = Math.sin(exitAngle) * burstSpeed;
    this.gunAngle = exitAngle;
    this.angle = exitAngle;

    this._playAudio('wingFlap', 'Assets/Sound Effects/Skills/woosh.mp3', 0.85);
  }

  _updateDivebombSetup(opponent, arena, cfg) {
    this.stateTimer--;

    const curArena = arena || (typeof state !== 'undefined' ? state.arena : null) || { x: 40, y: 240, width: 450, height: 450 };
    const cx = curArena.x + curArena.width / 2;
    const cy = curArena.y + curArena.height / 2;
    const ar = (curArena.radius || (curArena.width / 2));

    // Continue smooth flight out past arena perimeter
    const distFromCenter = Math.hypot(this.x - cx, this.y - cy);
    const targetOutsideDist = ar + 220;

    if (distFromCenter < targetOutsideDist) {
      const dirX = (this.x - cx) / (distFromCenter || 1);
      const dirY = (this.y - cy) / (distFromCenter || 1);
      const accel = 0.55 * this.phaseSpeedMult;
      this.vx += dirX * accel;
      this.vy += dirY * accel;

      const spd = Math.hypot(this.vx, this.vy);
      const maxSpd = 14.0 * this.phaseSpeedMult;
      if (spd > maxSpd) {
        this.vx = (this.vx / spd) * maxSpd;
        this.vy = (this.vy / spd) * maxSpd;
      }
      this.gunAngle = Math.atan2(this.vy, this.vx);
      this.angle = this.gunAngle;
    }

    // Once clear of arena boundary (or after flight burst), seamlessly lock launch position to current coordinates without ANY snap
    if (distFromCenter >= targetOutsideDist || this.stateTimer <= 0) {
      this.divebombStartX = this.x;
      this.divebombStartY = this.y;
      this.vx *= 0.15; // Smooth deceleration to hover, NO position snapping
      this.vy *= 0.15;

      // Compute trajectory through opponent (or arena center) and out opposite side
      const targetX = (opponent && opponent.hp > 0) ? opponent.x : cx;
      const targetY = (opponent && opponent.hp > 0) ? opponent.y : cy;
      this.divebombAngle = Math.atan2(targetY - this.divebombStartY, targetX - this.divebombStartX);

      const totalLength = ar * 2.5 + 560;
      this.divebombEndX = this.divebombStartX + Math.cos(this.divebombAngle) * totalLength;
      this.divebombEndY = this.divebombStartY + Math.sin(this.divebombAngle) * totalLength;

      this.aiState = DRAGON_STATE.DIVEBOMB_TELEGRAPH;
      this.isTelegraphingDivebomb = true;
      this.isDivebombing = false;
      this.stateTimer = cfg.divebombTelegraphFrames || 55;
      this.divebombTelegraphMax = cfg.divebombTelegraphFrames || 55;
      this.divebombTelegraphProgress = 0;
      this.gunAngle = this.divebombAngle;
      this.angle = this.divebombAngle;

      this._playAudio('roar', 'Assets/Sound Effects/Skills/ragescream.mp3', 0.90);
    }
  }

  _updateDivebombTelegraph(opponent, arena, cfg) {
    this.stateTimer--;
    this.divebombTelegraphProgress = 1.0 - Math.max(0, this.stateTimer / this.divebombTelegraphMax);

    // Keep position strictly locked in place off-screen during windup (no push/drift)
    this.x = this.divebombStartX;
    this.y = this.divebombStartY;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    // Keep facing locked strictly to attack corridor vector (Rule 1.4)
    this.gunAngle = this.divebombAngle;
    this.angle = this.divebombAngle;

    // Periodic telegraph spark cue along corridor
    if (this.stateTimer % 8 === 0) {
      const sampleDist = Math.random() * (arena ? arena.width * 1.6 : 600);
      const px = this.divebombStartX + Math.cos(this.divebombAngle) * sampleDist;
      const py = this.divebombStartY + Math.sin(this.divebombAngle) * sampleDist;
      spawnSparks(px, py, '#EF4444', 2, 2.5);
    }

    if (this.stateTimer <= 0) {
      // Launch divebomb strafe seamlessly from hover position
      this.aiState = DRAGON_STATE.DIVEBOMB_STRIKE;
      this.isTelegraphingDivebomb = false;
      this.isDivebombing = true;
      this.stateTimer = cfg.divebombDurationFrames || 22;
      this.targetAltitude = cfg.lowAltitude || 0.4;
      this.divebombHitFighters.clear();
      this.divebombAcidTimer = 0;

      const strikeSpeed = (cfg.divebombSpeed || 24.5) * this.phaseSpeedMult;
      this.vx = Math.cos(this.divebombAngle) * strikeSpeed;
      this.vy = Math.sin(this.divebombAngle) * strikeSpeed;
      this.gunAngle = this.divebombAngle;
      this.angle = this.divebombAngle;

      this._playAudio('swoop', 'Assets/Sound Effects/Skills/dash2.mp3', 1.0);
      this._playAudio('roar', 'Assets/Sound Effects/Skills/ragescream.mp3', 0.95);
      triggerGlobalScreenShake(12, 28);
    }
  }

  _catchAndDragVictim(victim) {
    if (!victim || victim.isEndCrystal || victim.isBoss || victim === this || victim.hp <= 0 || victim.isDead) return;
    if (!this.draggedVictims) this.draggedVictims = new Set();
    this.draggedVictims.add(victim);
    victim.isDraggedByDragon = true;
    if (typeof victim.applyTimeStop === 'function') {
      victim.applyTimeStop(4);
    }
    if (typeof victim.applyHitStun === 'function') {
      victim.applyHitStun(4);
    }
  }

  _updateDivebombStrike(opponent, arena, cfg) {
    this.stateTimer--;

    // Trail vivid amethyst afterimages
    if (this.stateTimer % 2 === 0) {
      this.afterImages.push({
        x: this.x,
        y: this.y,
        angle: this.divebombAngle,
        alpha: 0.85,
      });
    }

    // Deploy lingering acid pool trail
    this.divebombAcidTimer++;
    if (this.divebombAcidTimer % (cfg.divebombAcidDeployInterval || 4) === 0) {
      this.acidPools.push({
        x: this.x,
        y: this.y,
        radius: (cfg.acidPoolRadius || 70) * 0.75,
        duration: cfg.acidPoolDurationFrames || 180,
        maxDuration: cfg.acidPoolDurationFrames || 180,
        tickTimer: 0,
        tickInterval: cfg.acidTickInterval || 15,
        damagePerTick: cfg.acidDamagePerTick || 6,
        owner: this,
      });
      spawnSparks(this.x, this.y, '#E879F9', 4, 3.5);
    }

    // Lock dragon flight vector: unstoppable freight train (no speed loss or deflection)
    const strikeSpeed = (cfg.divebombSpeed || 24.5) * this.phaseSpeedMult;
    this.vx = Math.cos(this.divebombAngle) * strikeSpeed;
    this.vy = Math.sin(this.divebombAngle) * strikeSpeed;
    this.gunAngle = this.divebombAngle;
    this.angle = this.divebombAngle;

    // Detect and catch any reachable targets along the dive trajectory
    const reach = cfg.divebombReach || 95;
    const targets = this._collectAllEnemyTargets();
    for (let target of targets) {
      if (!target || target === this || target.hp <= 0 || target.isDead) continue;
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      if (dist <= reach + (target.r || 20)) {
        this._catchAndDragVictim(target);
      }
    }

    // Drag caught victims along with the dragon in 1 direction
    if (this.draggedVictims && this.draggedVictims.size > 0) {
      for (let victim of this.draggedVictims) {
        if (!victim || victim.hp <= 0 || victim.isDead) {
          this.draggedVictims.delete(victim);
          continue;
        }

        // Lock victim position in front of dragon snout along dive direction
        const dragDist = (this.r || 36) + (victim.r || 20) + 6;
        victim.x = this.x + Math.cos(this.divebombAngle) * dragDist;
        victim.y = this.y + Math.sin(this.divebombAngle) * dragDist;
        victim.vx = this.vx;
        victim.vy = this.vy;
        victim.knockbackVx = this.vx;
        victim.knockbackVy = this.vy;
        victim.isDraggedByDragon = true;

        // Maintain continuous hitstun & lock during drag
        if (typeof victim.applyTimeStop === 'function') {
          victim.applyTimeStop(4);
        }
        if (typeof victim.applyHitStun === 'function') {
          victim.applyHitStun(4);
        }

        // Deal drag friction scrap damage tick
        if (this.stateTimer % 4 === 0) {
          applyDamageToTarget(victim, 6, this);
          spawnSparks(victim.x, victim.y, '#E879F9', 4, 3.5);
          triggerGlobalScreenShake(4, 8);
        }
      }
    }

    if (this.stateTimer <= 0) {
      this.isDivebombing = false;
      this.aiState = DRAGON_STATE.DIVEBOMB_RECOVERY;
      this.stateTimer = 45; // 45 frames of graceful banking, smooth aiming & arena return
      this.targetAltitude = cfg.cruiseAltitude || 1.0;
      this.vx *= 0.40;
      this.vy *= 0.40;

      // Deliver final explosive impact and launch knockback to all dragged victims
      const damage = cfg.divebombDamage || 45;
      const knockback = (cfg.divebombKnockback || 22.0) * this.phaseSpeedMult;
      if (this.draggedVictims && this.draggedVictims.size > 0) {
        for (let victim of this.draggedVictims) {
          if (victim && victim.hp > 0 && !victim.isDead) {
            this._applyDivebombHit(victim, damage, knockback, cfg);
            victim.isDraggedByDragon = false;
          }
        }
        this.draggedVictims.clear();
      }
    }
  }

  _applyDivebombHit(target, damage, knockback, cfg) {
    this._playAudio('swoopHit', 'Assets/Sound Effects/Attacks/heavypunch1.mp3', 1.0);
    this._playAudio('fireballImpact', 'Assets/Sound Effects/Skills/purpledeploy.mp3', 0.90);
    triggerGlobalScreenShake(10, 24);
    spawnImpactFlash(target.x, target.y, 65, '#F5D0FE');
    spawnSparks(target.x, target.y, '#EF4444', 20, 8.0);

    applyDamageToTarget(target, damage, this);
    spawnFloatingText(target.x, target.y - 25, `-${damage}`, '#EF4444');

    // Rule 1.5: Hitstun applied to target only
    if (typeof target.applyTimeStop === 'function') {
      target.applyTimeStop(10);
    }

    // Knockback outward from strike vector
    const pushAngle = this.divebombAngle + (Math.random() < 0.5 ? 0.35 : -0.35);
    if (typeof target.applyKnockback === 'function') {
      target.applyKnockback(Math.cos(pushAngle) * knockback, Math.sin(pushAngle) * knockback, 16);
    }
  }

  _updateDivebombRecovery(opponent, arena, cfg) {
    this.stateTimer--;

    const curArena = arena || (typeof state !== 'undefined' ? state.arena : null) || { x: 40, y: 240, width: 450, height: 450 };
    const cx = curArena.x + curArena.width / 2;
    const cy = curArena.y + curArena.height / 2;

    // 1. Smoothly rotate body to aim directly at the enemy (smooth continuous slerp)
    const targetEnemy = this._getValidEnemyOpponent(opponent);
    const targetX = (targetEnemy && targetEnemy.hp > 0) ? targetEnemy.x : cx;
    const targetY = (targetEnemy && targetEnemy.hp > 0) ? targetEnemy.y : cy;
    const targetAimAngle = Math.atan2(targetY - this.y, targetX - this.x);

    let angleDiff = targetAimAngle - (this.gunAngle || 0);
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const turnSpeed = 0.085 * this.phaseSpeedMult;
    this.gunAngle = (this.gunAngle || 0) + angleDiff * turnSpeed;
    this.angle = this.gunAngle;

    // 2. Smoothly bank and return toward the arena / opponent orbit
    const returnForce = 0.52 * this.phaseSpeedMult;
    const toTargetDist = Math.hypot(targetX - this.x, targetY - this.y) || 1;
    this.vx += ((targetX - this.x) / toTargetDist) * returnForce;
    this.vy += ((targetY - this.y) / toTargetDist) * returnForce;

    // Smooth flight drag
    this.vx *= 0.93;
    this.vy *= 0.93;

    // Periodic wing flap sound while banking
    if (this.stateTimer % 18 === 0) {
      this._playAudio('wingFlap', 'Assets/Sound Effects/Skills/woosh.mp3', 0.65);
    }

    // 3. Seamless handoff to patrol or hover
    if (this.stateTimer <= 0) {
      // Synchronize patrol angle to current position so flight path has zero hitch
      this.patrolAngle = Math.atan2(this.y - cy, this.x - cx);
      this.aiState = DRAGON_STATE.PATROL;
      this.divebombCooldown = (cfg.divebombCooldown || 600) / this.phaseSpeedMult;
    }
  }

  interruptAttacks() {
    this.isSwooping = false;
    this.isChannelingCataclysm = false;
    this.isTelegraphingDivebomb = false;
    this.isDivebombing = false;
    if (this.draggedVictims) {
      for (let victim of this.draggedVictims) {
        if (victim) victim.isDraggedByDragon = false;
      }
      this.draggedVictims.clear();
    }
    if (this.aiState !== DRAGON_STATE.HOVER) {
      this.aiState = DRAGON_STATE.HOVER;
    }
  }

  /**
   * Ground telegraph layer hook (Rule 1.4 & Rule 2.4):
   * Renders the high-visibility Danger Zone corridor carpet underneath fighters
   * during the off-screen telegraphed divebomb strafe.
   */
  drawGroundTelegraph(ctx) {
    if (!ctx || this.hp <= 0 || this.isDead) return;

    if (this.isTelegraphingDivebomb || this.aiState === DRAGON_STATE.DIVEBOMB_TELEGRAPH) {
      const startX = this.divebombStartX;
      const startY = this.divebombStartY;
      const endX = this.divebombEndX;
      const endY = this.divebombEndY;
      const angle = this.divebombAngle;
      const length = Math.hypot(endX - startX, endY - startY);
      const cfg = this._getConfig();
      const width = cfg.divebombCorridorWidth || 95;

      ctx.save();
      ctx.translate(startX, startY);
      ctx.rotate(angle);

      // 1. Semi-transparent Danger Carpet Fill with dynamic pulse
      const pulse = 0.85 + Math.sin(Date.now() * 0.008) * 0.15;
      ctx.fillStyle = `rgba(239, 68, 68, ${0.18 * pulse})`;
      ctx.fillRect(0, -width / 2, length, width);

      // 2. Charging progress fill representing countdown to strike
      const progress = Math.min(1.0, Math.max(0, this.divebombTelegraphProgress || 0));
      const filledLength = length * progress;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.38)';
      ctx.fillRect(0, -width / 2, filledLength, width);

      // 3. Leading edge charging bar (White Core & Neon Rose)
      if (filledLength > 0 && filledLength < length) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(filledLength - 3, -width / 2, 6, width);
        ctx.fillStyle = '#F43F5E';
        ctx.fillRect(filledLength - 8, -width / 2, 5, width);
      }

      // 4. Hazard Border Rails (Dashed Neon Warning Lines)
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.90 * pulse})`;
      ctx.lineWidth = 3.0;
      ctx.setLineDash([14, 8]);

      // Top rail
      ctx.beginPath();
      ctx.moveTo(0, -width / 2);
      ctx.lineTo(length, -width / 2);
      ctx.stroke();

      // Bottom rail
      ctx.beginPath();
      ctx.moveTo(0, width / 2);
      ctx.lineTo(length, width / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 5. Dynamic Directional Chevrons advancing along dive path
      const chevronSpacing = 65;
      const timeOffset = (Date.now() * 0.14) % chevronSpacing;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.70 * pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = timeOffset; x < length; x += chevronSpacing) {
        ctx.moveTo(x - 16, -width * 0.28);
        ctx.lineTo(x, 0);
        ctx.lineTo(x - 16, width * 0.28);
      }
      ctx.stroke();

      // 6. Hazard Warning Badge in corridor center
      const badgeX = length * 0.45;
      ctx.save();
      ctx.translate(badgeX, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px "Outfit", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠ DANGER ZONE ⚠', 0, 0);
      ctx.restore();

      ctx.restore();
    } else if (this.isDivebombing || this.aiState === DRAGON_STATE.DIVEBOMB_STRIKE) {
      // Energetic vacuum trail during the live supersonic strafe
      const startX = this.divebombStartX;
      const startY = this.divebombStartY;
      const endX = this.divebombEndX;
      const endY = this.divebombEndY;
      const angle = this.divebombAngle;
      const length = Math.hypot(endX - startX, endY - startY);
      const cfg = this._getConfig();
      const width = cfg.divebombCorridorWidth || 95;

      ctx.save();
      ctx.translate(startX, startY);
      ctx.rotate(angle);

      ctx.fillStyle = 'rgba(217, 70, 239, 0.20)';
      ctx.fillRect(0, -width / 2, length, width);

      ctx.strokeStyle = 'rgba(232, 121, 249, 0.65)';
      ctx.lineWidth = 2.0;
      ctx.strokeRect(0, -width / 2, length, width);

      ctx.restore();
    }
  }

  draw(ctx) {
    if (!ctx) return;

    // Draw acid pools beneath dragon
    for (let pool of this.acidPools) {
      drawDragonAcidPool(ctx, pool);
    }

    drawEnderDragonSkin(ctx, this);
  }
}
