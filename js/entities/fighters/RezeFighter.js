// ─────────────────────────────────────────────
// Reze (The Bomb Devil Hybrid) — Entity & Combat Engine
// Chainsaw Man / Soviet Assassin & Bomb Devil
// Adheres strictly to repository coding standards:
// - Rule 1 (TimeStop & Freeze Guards)
// - Rule 5 (No Self TimeStop during combos)
// - Rule 6 (Unified Target Queries: Fighters & Illusions)
// - Rule 7 & 8 (Frontal Arc Radius AOE for Melee / Brawler Punches)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 15 (Physics & Wall-Bounce Displacement Engine)
// - Rule 16 (Manga Action Speed Line Effects)
// - Rule 18 (HUD Theme Consistency: #430363ff)
// - Rule 19 & 20 (Fighter Skin & Hand Guards)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { rezeConfig } from '../../configs/characters/rezeConfig.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { MODE_SETTINGS, MODE_HP_MULTIPLIER } from '../../core/modeConfig.js';
import { drawRezeSkin } from '../../graphics/fighters/rezeSkin.js';
import { drawRezeSpeedLines, drawSparkFlechette, drawRezeDecoy, drawRezePalmBlast, drawRezeMegatonNuke, drawRezePixelMartialArc, drawRezeKnifeSlash } from '../../graphics/weapons/rezeWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

export class RezeFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'reze';
    this.type = 'reze';
    this.color = def?.color || rezeConfig.color || '#430363ff';
    this.themeColor = def?.themeColor || rezeConfig.themeColor || '#430363ff';
    this.secondaryColor = def?.secondaryColor || rezeConfig.secondaryColor || '#FFE600';

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : rezeConfig;

    // Standard HP initialization
    const modeFixed = MODE_SETTINGS[state.mode]?.fixedHp || MODE_SETTINGS[state.mode]?.playerFixedHp || MODE_SETTINGS[state.mode]?.soloFixedHp;
    if (modeFixed) {
      this.maxHp = modeFixed;
    } else {
      this.maxHp = Math.round((def?.hp || 340) * (MODE_HP_MULTIPLIER[state.mode] || 1));
    }
    this.hp = this.maxHp;

    // Animation & Hands
    this.punchAnimTimer = 0;
    this.punchMaxTime = cfg.punchAnimDuration || 16;
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 14;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    this.punchComboCount = 0;
    this.comboResetTimer = 0;

    // Human Form: Hidden Knife & Aerial Dive Bomb
    this.activeKnifeSlashes = [];
    this.isDiveBombing = false;
    this.diveBombTimer = 0;
    this.diveBombMaxTimer = 18;
    this.diveBombCooldown = 0;
    this.diveBombCooldownMax = cfg.diveBombCooldown || 220;
    this.diveBombVx = 0;
    this.diveBombVy = 0;
    this.diveBombTarget = null;
    this.isVaulting = false;
    this.vaultTimer = 0;
    this.vaultMaxTimer = 16;

    // Passive 1: Hybrid Physiology (Collar Pin Revive)
    this.reviveStocksMax = cfg.maxReviveStocks || 1;
    this.reviveStocks = this.reviveStocksMax;
    this.isHybridModeActive = false;
    this.hybridModeTimer = 0;
    this.hybridModeMaxTimer = Infinity;

    // Primary Skill: Spark Flechette Barrage
    this.sparkCooldownMax = cfg.sparkCooldown || 180;
    this.sparkCooldown = this.sparkCooldownMax;
    this.activeFlechettes = [];

    // Secondary Skill: Decapitation Decoy / Smoke Step
    this.decoyCooldownMax = cfg.decoyCooldown || 420;
    this.decoyCooldown = this.decoyCooldownMax;
    this.activeDecoys = [];

    // Mobility Skill: Supersonic Rocket Lunge
    this.rocketCooldownMax = cfg.rocketCooldown || 300;
    this.rocketCooldown = this.rocketCooldownMax;
    this.isRocketLunging = false;
    this.rocketTimer = 0;
    this.rocketMaxTimer = cfg.rocketDurationFrames || 24;
    this.rocketLungeVx = 0;
    this.rocketLungeVy = 0;
    this.wallLungeDebounceTimer = 0;

    // Ultimate: Bomb Devil Unleashed (Megaton Tsar Nuke)
    this.nukeCooldownMax = cfg.nukeCooldown || 1500;
    this.nukeCooldown = this.nukeCooldownMax;
    this.isExecutingNuke = false;
    this.nukePhase = 'IDLE'; // 'TRANSFORM' | 'BARRAGE' | 'DIVE' | 'EXPLODE'
    this.nukeTimer = 0;
    this.nukeTarget = null;

    // Pin-Pull Transformation Engine
    this.isPullingPin = false;
    this.pinPullTimer = 0;
    this.pinPullMaxTimer = 44;
    this.pinPullTarget = null;
    this.isPinPullRevive = false;

    // Visual effect tracking
    this.activeMartialArcs = [];
    this.activePalmBlasts = [];
    this.activeNukeBlasts = [];

    // Declarative Skill Registration
    this.skillManager.registerSkills([
      {
        id: 'spark_flechette',
        name: 'Spark Flechette',
        type: 'active',
        cooldownKey: 'sparkCooldown',
        cooldownMaxKey: 'sparkCooldownMax'
      },
      {
        id: 'decoy_bomb',
        name: 'Decoy Bomb',
        type: 'active',
        cooldownKey: 'decoyCooldown',
        cooldownMaxKey: 'decoyCooldownMax'
      },
      {
        id: 'rocket_lunge',
        name: 'Rocket Lunge',
        type: 'active',
        cooldownKey: 'rocketCooldown',
        cooldownMaxKey: 'rocketCooldownMax'
      },
      {
        id: 'hybrid_mode',
        name: 'Bomb Devil Form',
        type: 'transformation',
        durationKey: 'hybridModeTimer',
        durationMaxKey: 'hybridModeMaxTimer',
        activeKey: 'isHybridModeActive',
        onExpire: (fighter) => {
          fighter.isHybridModeActive = false;
        }
      },
      {
        id: 'tsar_nuke',
        name: 'Megaton Tsar Nuke',
        type: 'ultimate',
        cooldownKey: 'nukeCooldown',
        cooldownMaxKey: 'nukeCooldownMax',
        channelingKey: 'isExecutingNuke',
        channelTimerKey: 'nukeTimer'
      }
    ]);
  }

  reset() {
    super.reset();
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    const modeFixed = MODE_SETTINGS[state.mode]?.fixedHp || MODE_SETTINGS[state.mode]?.playerFixedHp || MODE_SETTINGS[state.mode]?.soloFixedHp;
    if (modeFixed) {
      this.maxHp = modeFixed;
    } else {
      this.maxHp = Math.round((this._def?.hp || 340) * (MODE_HP_MULTIPLIER[state.mode] || 1));
    }
    this.hp = this.maxHp;

    this.reviveStocks = this.reviveStocksMax || 1;
    this.isHybridModeActive = false;
    this.hybridModeTimer = 0;
    this.isPullingPin = false;
    this.pinPullTimer = 0;
    this.pinPullTarget = null;
    this.isPinPullRevive = false;
    this.punchAnimTimer = 0;
    this.punchComboCount = 0;
    this.comboResetTimer = 0;
    this.sparkCooldown = this.sparkCooldownMax;
    this.decoyCooldown = this.decoyCooldownMax;
    this.rocketCooldown = this.rocketCooldownMax;
    this.nukeCooldown = this.nukeCooldownMax;
    this.isRocketLunging = false;
    this.isExecutingNuke = false;
    this.nukePhase = 'IDLE';
    this.wallLungeDebounceTimer = 0;
    this.activeFlechettes = [];
    this.activeDecoys = [];
    this.activeKnifeSlashes = [];
    this.isDiveBombing = false;
    this.diveBombTimer = 0;
    this.diveBombCooldown = 0;
    this.isVaulting = false;
    this.vaultTimer = 0;
    this.z = 0;
    this.activeMartialArcs = [];
    this.activePalmBlasts = [];
    this.activeNukeBlasts = [];
  }

  isStationarySkillActive() {
    return Boolean(this.isPullingPin || this.isExecutingNuke || super.isStationarySkillActive?.());
  }

  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks(forceCancelAll);
    this.isRocketLunging = false;
    this.isDiveBombing = false;
    this.isVaulting = false;
    this.z = 0;
    this.punchAnimTimer = 0;
    if (forceCancelAll) {
      this.isPullingPin = false;
      this.isExecutingNuke = false;
      this.nukePhase = 'IDLE';
      this.punchComboCount = 0;
      this.comboResetTimer = 0;
    }
  }

  isEffectivelyAlive() {
    if (this.hp > 0 && !this.isDead) return true;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    if (Boolean(cfg.enableCollarPinRevive) && this.reviveStocks > 0) return true;
    return false;
  }

  /**
   * Suppress default gun rendering (Reze attacks with concealed sleeve blade, dive bomb, and explosive martial arts).
   */
  drawGun(ctx) {}

  /**
   * Triggers basic attack (Concealed knife in Human Form, Explosive Punch in Bomb Devil Form)
   * Strictly enforces melee reach, stasis checks, and recovery cooldowns so Reze never
   * attacks into empty air across the arena!
   */
  shoot(ownerIndex) {
    if (!this.canPerformBasicAttack()) return false;
    if (this.shootCooldown > 0 || this.punchAnimTimer > 0) return false;
    if (this.isExecutingNuke || this.isRocketLunging || this.isDiveBombing || this.isVaulting || this.isPullingPin) return false;

    const target = this._findBestTarget() || (typeof state !== 'undefined' && state.fighters ? state.fighters.find(f => f && f !== this && !f.isDead) : null);
    if (!target) return false;

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    const reach = this.isHybridModeActive
      ? ((cfg.punchReach || 75) + (target.r || 25))
      : ((cfg.knifeReach || 60) + (target.r || 25));
    const dist = Math.hypot(target.x - this.x, target.y - this.y);

    if (dist <= reach) {
      this.aim(target);
      if (this.isHybridModeActive) {
        if (Boolean(cfg.enableMeleeCombo ?? true)) {
          this._performExplosivePunch(target);
          return true;
        }
      } else {
        if (Boolean(cfg.enableHiddenKnifeCombo ?? true)) {
          this._performKnifeAttack(target);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Main Fighter Update Loop
   */
  update(opponent, ownerIndex, arena) {
    // 1. Mandatory Rule 1 Freeze Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // Pin-pull transformation update early exit
    if (this.isPullingPin) {
      this._updatePinPullTransformation(arena, opponent);
      return;
    }

    // 2. Cooldown Decays
    if (this.sparkCooldown > 0) this.sparkCooldown--;
    if (this.decoyCooldown > 0) this.decoyCooldown--;
    if (this.rocketCooldown > 0) this.rocketCooldown--;
    if (this.nukeCooldown > 0) this.nukeCooldown--;
    if (this.diveBombCooldown > 0) this.diveBombCooldown--;

    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.wallLungeDebounceTimer > 0) this.wallLungeDebounceTimer--;
    if (this.comboResetTimer > 0) {
      this.comboResetTimer--;
      if (this.comboResetTimer <= 0) {
        this.punchComboCount = 0;
      }
    }

    // 3. Hybrid Mode Duration: Permanent once activated (no duration countdown to end it)
    // (Bomb Devil form persists for the remainder of the round)

    // 4. Update Active Effects & Sub-systems
    this._updateSparkFlechettes();
    this._updateDecoys();
    this._updateRocketLunge();
    this._updateMegatonNuke();
    this._updateDiveBomb();
    this._updateVault();
    this._updateVisualExplosions();

    // 5. If busy with stationary ultimate, rocket lunge, dive bomb, or vault, skip standard steering
    if (this.isExecutingNuke || this.isRocketLunging || this.isDiveBombing || this.isVaulting) {
      return;
    }

    // 6. Base AI & Combat Engine
    const target = this._findBestTarget() || opponent;
    if (target) {
      this.aim(target);
      this._updateRezeCombatAI(target);
    }

    super.update(target || opponent, ownerIndex, arena);
  }

  /**
   * Unified Target Query (Rule 6: Fighters & Illusions)
   */
  _findBestTarget() {
    let best = null;
    let minD = Infinity;

    const myTeam = (typeof state.getFighterTeam === 'function') 
      ? state.getFighterTeam(state.fighters.indexOf(this)) 
      : null;

    // Check Fighters
    if (state.fighters) {
      for (let f of state.fighters) {
        if (!f || f === this || f.isDead || (f.hp || 0) <= 0 || f.isInvulnerable) continue;
        const fIdx = state.fighters.indexOf(f);
        const fTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(fIdx) : null;
        if (myTeam !== null && fTeam !== null && myTeam === fTeam) continue;

        const d = Math.hypot(f.x - this.x, f.y - this.y);
        if (d < minD) {
          minD = d;
          best = f;
        }
      }
    }

    // Check Illusions (Rule 6)
    if (state.illusions) {
      for (let ill of state.illusions) {
        if (!ill || ill.isDead || (ill.hp || 0) <= 0) continue;
        const d = Math.hypot(ill.x - this.x, ill.y - this.y);
        if (d < minD) {
          minD = d;
          best = ill;
        }
      }
    }

    return best;
  }

  /**
   * AI Decision Matrix for Reze
   */
  _updateRezeCombatAI(target) {
    const dist = Math.hypot(target.x - this.x, target.y - this.y);
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};

    // 1. Ultimate: Megaton Tsar Nuke
    if (this.nukeCooldown <= 0 && Boolean(cfg.enableMegatonNuke) && dist < 350) {
      this._activateMegatonNuke(target);
      return;
    }

    // 2. Mobility: Supersonic Rocket Lunge (Bomb Devil Form ONLY)
    if (this.isHybridModeActive && this.rocketCooldown <= 0 && Boolean(cfg.enableRocketLunge) && dist > 140 && dist < 420) {
      this._activateRocketLunge(target);
      return;
    }

    // 3. Primary: Spark Flechette Barrage
    if (this.sparkCooldown <= 0 && Boolean(cfg.enableSparkFlechette) && dist > 80 && dist < 380) {
      this._fireSparkFlechettes(target);
      return;
    }

    // 4. Secondary: Decoy Bomb
    if (this.decoyCooldown <= 0 && Boolean(cfg.enableDecoyBomb) && dist < 220) {
      this._deployDecoyBomb(target);
      return;
    }

    // 5. Basic Attacks (Human vs Bomb Devil Hybrid Form)
    if (!this.isHybridModeActive) {
      // Human Form: Simple Knife Basic Attack when enemy is close in range
      const knifeReach = (cfg.knifeReach || 60) + (target.r || 25);
      if (dist <= knifeReach && this.shootCooldown <= 0 && this.punchAnimTimer <= 0 && Boolean(cfg.enableHiddenKnifeCombo)) {
        this._performKnifeAttack(target);
        return;
      }
    } else {
      // Hybrid Form — Basic Attack: Explosive Martial Arts (120° Frontal Arc Melee & AOE Punch Detonations)
      const punchReach = (cfg.punchReach || 75) + (target.r || 25);
      if (dist <= punchReach && this.shootCooldown <= 0 && this.punchAnimTimer <= 0 && Boolean(cfg.enableMeleeCombo ?? true)) {
        this._performExplosivePunch(target);
        return;
      }
    }
  }

  /**
   * Human Form: Simple Tactical Knife Basic Attack
   * Dynamic 3-Hit Combo:
   * - Hit 1: Overhead Downward Diagonal Chop/Slash (Clockwise sweep)
   * - Hit 2: Low-to-High Upward Backhand Riposte (Counter-clockwise sweep)
   * - Hit 3: Lunging Stiletto Precision Thrust Finisher (Supersonic piercing thrust)
   */
  _performKnifeAttack(primaryTarget) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    // 3-hit combo sequence: 1 (downward slash), 2 (upward backhand), 3 (thrust finisher)
    this.punchComboCount = (this.punchComboCount % 3) + 1;
    this.comboResetTimer = 55;

    const isThrust = (this.punchComboCount === 3);
    const animDuration = isThrust ? 16 : (cfg.knifeCooldown || 14);
    this.punchAnimTimer = animDuration;
    this.punchMaxTime = animDuration;

    // Cadence: Hits 1 and 2 allow fluid combo chaining (16 frames), while the thrust finisher has a recovery cooldown (38 frames)
    const nextCooldown = isThrust ? 38 : 16;
    this.shootCooldown = nextCooldown;
    this.shootCooldownMax = nextCooldown;

    const reach = (cfg.knifeReach || 72) + (isThrust ? 16 : 0);
    const arcAngle = isThrust ? ((50 * Math.PI) / 180) : (cfg.knifeArcAngle || ((110 * Math.PI) / 180));
    const aimAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

    // Kinetic step impulse forward into the strike
    const stepSpeed = isThrust ? 3.2 : 2.0;
    this.vx = Math.cos(aimAngle) * stepSpeed;
    this.vy = Math.sin(aimAngle) * stepSpeed;

    const dmg = isThrust ? Math.round((cfg.knifeDamage || 14) * 1.35) : (cfg.knifeDamage || 14);
    const kbForce = isThrust ? ((cfg.knifeKnockback || 6.5) * 1.45) : (cfg.knifeKnockback || 6.5);
    const stunDuration = isThrust ? 10 : (cfg.knifeHitStun || 6);

    const targets = this._getEntitiesInFrontalArc(aimAngle, arcAngle, reach);

    if (targets.length > 0) {
      const sfx = isThrust
        ? 'Assets/Sound Effects/Attacks/spikestab.mp3'
        : 'Assets/Sound Effects/Attacks/swordswing.mp3';
      try { audioSystem.playSFX(sfx, isThrust ? 0.70 : 0.55); } catch (e) {}
    } else {
      try {
        audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.25);
      } catch (e) {}
    }

    for (let target of targets) {
      applyDamageToTarget(target, dmg, this, true);
      spawnBloodEffect(target.x, target.y);
      spawnSparks(target.x, target.y, isThrust ? 12 : 6, '#FFFFFF');

      const kbAngle = Math.atan2(target.y - this.y, target.x - this.x);
      target.knockbackVx = Math.cos(kbAngle) * kbForce;
      target.knockbackVy = Math.sin(kbAngle) * kbForce;

      // Micro hit-stun for crisp flinch (Rule 5: on target only)
      if (typeof target.applyTimeStop === 'function') {
        target.applyTimeStop(stunDuration);
      }
    }

    // Spawn surgical steel knife slash visual
    const sweepDir = (this.punchComboCount === 2 ? -1 : 1);
    this.activeKnifeSlashes.push({
      x: this.x,
      y: this.y,
      angle: aimAngle,
      arc: arcAngle,
      radius: reach,
      timer: animDuration + 4,
      maxTimer: animDuration + 4,
      sweepDir: sweepDir,
      isThrust: isThrust
    });
  }

  /**
   * Backward-compatible alias for hidden knife combo calls
   */
  _performHiddenKnifeCombo(primaryTarget) {
    this._performKnifeAttack(primaryTarget);
  }

  /**
   * Human Form: Aerial Attack (Dive Bomb)
   * Leaps airborne and dives diagonally downward with knife.
   * On contact: stuns opponent and vaults acrobatically off their shoulder with reverse recoil.
   */
  _performDiveBomb(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    this.diveBombCooldown = this.diveBombCooldownMax;
    this.isDiveBombing = true;
    this.diveBombTimer = this.diveBombMaxTimer;
    this.diveBombTarget = target;
    this.z = 24; // Airborne leap height

    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    const speed = cfg.diveBombSpeed || 22.0;
    this.diveBombVx = Math.cos(angle) * speed;
    this.diveBombVy = Math.sin(angle) * speed;
    this.gunAngle = angle;

    audioSystem.playSFX('Assets/Sound Effects/Skills/dash2.mp3', 0.80);
    spawnFloatingText(this.x, this.y - 25, 'DIVE BOMB!', '#E2E8F0');
  }

  _updateDiveBomb() {
    if (!this.isDiveBombing) return;

    this.diveBombTimer--;
    this.x += this.diveBombVx;
    this.y += this.diveBombVy;

    const descentProgress = 1.0 - (this.diveBombTimer / this.diveBombMaxTimer);
    this.z = Math.max(0, 24 * (1.0 - descentProgress * 0.85));

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
    let hitTarget = null;

    for (let t of allTargets) {
      if (!t || t === this || t.isDead || (t.hp || 0) <= 0 || t.isInvulnerable) continue;
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (d <= (this.r || 25) + (t.r || 25) + 12) {
        hitTarget = t;
        break;
      }
    }

    if (hitTarget) {
      const dmg = cfg.diveBombDamage || 22;
      const stunFrames = cfg.diveBombStunDuration || 22;

      applyDamageToTarget(hitTarget, dmg, this, true);
      spawnBloodEffect(hitTarget.x, hitTarget.y);
      spawnSparks(hitTarget.x, hitTarget.y, 14, '#FFFFFF');

      audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.75);
      audioSystem.playSFX('Assets/Sound Effects/Skills/parry.mp3', 0.65);
      triggerGlobalScreenShake(3.0, 10);

      if (typeof hitTarget.applyTimeStop === 'function') {
        hitTarget.applyTimeStop(stunFrames);
      }
      hitTarget.hitStunTimer = Math.max(hitTarget.hitStunTimer || 0, stunFrames);

      const aimAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
      this.activeKnifeSlashes.push({
        x: hitTarget.x,
        y: hitTarget.y,
        angle: aimAngle,
        arc: (120 * Math.PI) / 180,
        radius: 60,
        timer: 16,
        maxTimer: 16,
        sweepDir: 1,
        isThrust: true
      });

      // Acrobatic Shoulder Vault Off Opponent
      this.isDiveBombing = false;
      this.isVaulting = true;
      this.vaultTimer = this.vaultMaxTimer;
      this.z = 28;

      const recoilAngle = aimAngle + Math.PI;
      const vaultRecoilForce = 9.5;
      this.knockbackVx = Math.cos(recoilAngle) * vaultRecoilForce;
      this.knockbackVy = Math.sin(recoilAngle) * vaultRecoilForce;

      spawnFloatingText(this.x, this.y - 30, 'VAULT!', '#FFE600');
      return;
    }

    const arena = CONFIG.arena;
    if (arena) {
      if (this.x < arena.x + this.r || this.x > arena.x + arena.width - this.r ||
          this.y < arena.y + this.r || this.y > arena.y + arena.height - this.r) {
        this.isDiveBombing = false;
        this.z = 0;
      }
    }

    if (this.diveBombTimer <= 0) {
      this.isDiveBombing = false;
      this.z = 0;
    }
  }

  _updateVault() {
    if (!this.isVaulting) return;

    this.vaultTimer--;
    const p = 1.0 - (this.vaultTimer / this.vaultMaxTimer);
    this.z = Math.max(0, Math.sin((1.0 - p) * Math.PI) * 28);

    this.knockbackVx *= 0.88;
    this.knockbackVy *= 0.88;
    this.x += this.knockbackVx;
    this.y += this.knockbackVy;

    const arena = CONFIG.arena;
    if (arena) {
      this.x = Math.max(arena.x + this.r, Math.min(arena.x + arena.width - this.r, this.x));
      this.y = Math.max(arena.y + this.r, Math.min(arena.y + arena.height - this.r, this.y));
    }

    if (this.vaultTimer <= 0) {
      this.isVaulting = false;
      this.z = 0;
    }
  }

  /**
   * Basic Attack: Explosive Martial Arts (Rule 7/8 Frontal Arc AOE + Punch Detonations)
   * In Bomb Devil Form, EVERY punch triggers an AOE explosion!
   */
  _performExplosivePunch(primaryTarget) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    this.punchComboCount = (this.punchComboCount + 1) % 3;
    this.comboResetTimer = 55;
    this.punchAnimTimer = this.punchMaxTime;

    const isFinisher = (this.punchComboCount === 0);
    // Cadence: Hits 1 and 2 allow fluid combo punches (20 frames), while the Spark Slap palm blast finisher has a deliberate recovery cooldown (48 frames)
    const nextCooldown = isFinisher ? 48 : 20;
    this.shootCooldown = nextCooldown;
    this.shootCooldownMax = nextCooldown;
    const punchReach = this.isHybridModeActive ? (isFinisher ? 85 : 75) : 65;
    const arcAngle = (120 * Math.PI) / 180; // 120° frontal cone
    const aimAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

    const dmg = isFinisher ? (cfg.punchFinisherDamage || 32) : (cfg.punchDamage || 18);
    const kbForce = isFinisher ? (cfg.punchFinisherKnockback || 34) : 14;

    // Detonation impact location along punch strike vector
    const blastDist = punchReach * 0.72;
    const blastX = this.x + Math.cos(aimAngle) * blastDist;
    const blastY = this.y + Math.sin(aimAngle) * blastDist;
    const aoeRadius = isFinisher ? (cfg.punchFinisherRadius || 100) : (cfg.punchExplosionRadius || 70);

    // Kinetic step impulse forward into the explosive strike
    const stepSpeed = isFinisher ? 2.8 : 1.6;
    this.vx += Math.cos(aimAngle) * stepSpeed;
    this.vy += Math.sin(aimAngle) * stepSpeed;

    // 1. Audio SFX: Every punch in Devil Form detonates an explosion!
    if (isFinisher) {
      audioSystem.playSFX('Assets/Sound Effects/Attacks/explosion.mp3', 0.90);
      try {
        audioSystem.playSFX(cfg.sounds?.explosionLarge || 'Assets/Sound Effects/Skills/fugaexplode.mp3', 0.65);
      } catch (e) {}
    } else {
      audioSystem.playSFX('Assets/Sound Effects/Attacks/explosion.mp3', 0.55);
      audioSystem.playSFX('Assets/Sound Effects/Attacks/heavypunch1.mp3', 0.40);
    }

    // 2. Global Screen Shake & Sparks on every punch explosion
    triggerGlobalScreenShake(isFinisher ? 4.5 : 2.2, isFinisher ? 14 : 7);
    spawnImpactFlash(blastX, blastY, isFinisher ? 55 : 38, '#FFE600');
    spawnSparks(blastX, blastY, isFinisher ? 24 : 12, '#FFE600');
    spawnSparks(blastX, blastY, isFinisher ? 18 : 8, '#FF2E00');

    if (isFinisher) {
      spawnFloatingText(this.x, this.y - 30, 'SPARK SLAP!', this.themeColor);
    }

    // 3. Multi-target AOE damage query (Frontal Arc + Blast Radius, Rule 6/7/8)
    const hitEntities = new Set();
    const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(state.fighters?.indexOf(this)) : null;
    const allEntities = [...(state.fighters || []), ...(state.illusions || [])];

    for (let ent of allEntities) {
      if (!ent || ent === this || ent.isDead || (ent.hp || 0) <= 0 || ent.isInvulnerable) continue;
      if (state.fighters) {
        const idx = state.fighters.indexOf(ent);
        if (idx !== -1 && myTeam !== null && state.getFighterTeam?.(idx) === myTeam) continue;
      }

      const entR = ent.r || 25;

      // Check A: Frontal Arc cone from Reze
      const dxArc = ent.x - this.x;
      const dyArc = ent.y - this.y;
      const distArc = Math.hypot(dxArc, dyArc);
      let inArc = false;
      if (distArc <= punchReach + entR) {
        const entAngle = Math.atan2(dyArc, dxArc);
        let diff = entAngle - aimAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) <= arcAngle / 2) {
          inArc = true;
        }
      }

      // Check B: AOE Explosion Blast Radius from (blastX, blastY)
      const distBlast = Math.hypot(ent.x - blastX, ent.y - blastY);
      const inBlast = (distBlast <= aoeRadius + entR);

      if (inArc || inBlast) {
        hitEntities.add(ent);
      }
    }

    // Apply AOE damage, knockback, and hit-stun to all targets caught in the explosion
    for (let target of hitEntities) {
      applyDamageToTarget(target, dmg, this, true);
      spawnBloodEffect(target.x, target.y);
      spawnSparks(target.x, target.y, isFinisher ? 16 : 8, this.themeColor);

      // Knockback physics blasting enemies away from Reze along the strike vector
      const kbAngle = Math.atan2(target.y - this.y, target.x - this.x);
      target.knockbackVx = Math.cos(kbAngle) * kbForce;
      target.knockbackVy = Math.sin(kbAngle) * kbForce;

      // Rule 5: Hit-pause strictly on target, never on self!
      if (typeof target.applyTimeStop === 'function') {
        target.applyTimeStop(isFinisher ? 12 : 6);
      }
    }

    // 4. Spawn 120° Frontal Pixel Martial Arc
    const sweepDir = (this.punchComboCount === 2 ? -1 : 1);
    this.activeMartialArcs.push({
      x: this.x,
      y: this.y,
      angle: aimAngle,
      arc: arcAngle,
      radius: isFinisher ? punchReach * 1.35 : punchReach * 1.15,
      timer: isFinisher ? 26 : 18,
      maxTimer: isFinisher ? 26 : 18,
      isFinisher: isFinisher,
      isHybrid: this.isHybridModeActive,
      sweepDir: sweepDir
    });

    // 5. Spawn Punch AOE Explosion Visual at impact center
    this.activePalmBlasts.push({
      x: blastX,
      y: blastY,
      radius: aoeRadius,
      timer: isFinisher ? 18 : 14,
      maxTimer: isFinisher ? 18 : 14,
      isFinisher: isFinisher,
      isPunchExplosion: true
    });
  }

  /**
   * Helper: Frontal Arc Query (Rule 7/8)
   */
  _getEntitiesInFrontalArc(facingAngle, arc, reach) {
    const list = [];
    const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(state.fighters?.indexOf(this)) : null;

    const allEntities = [...(state.fighters || []), ...(state.illusions || [])];
    for (let ent of allEntities) {
      if (!ent || ent === this || ent.isDead || (ent.hp || 0) <= 0 || ent.isInvulnerable) continue;
      if (state.fighters) {
        const idx = state.fighters.indexOf(ent);
        if (idx !== -1 && myTeam !== null && state.getFighterTeam?.(idx) === myTeam) continue;
      }

      const dx = ent.x - this.x;
      const dy = ent.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= reach + (ent.r || 25)) {
        const entAngle = Math.atan2(dy, dx);
        let diff = entAngle - facingAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) <= arc / 2) {
          list.push(ent);
        }
      }
    }
    return list;
  }

  /**
   * Primary Skill: Spark Flechette Barrage
   */
  _fireSparkFlechettes(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    this.sparkCooldown = this.sparkCooldownMax;

    const baseAngle = Math.atan2(target.y - this.y, target.x - this.x);
    const count = cfg.sparkCount || 3;
    const spread = cfg.sparkSpreadAngle || 0.22;
    const speed = cfg.sparkSpeed || 18.0;

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i - (count - 1) / 2) * spread;
      this.activeFlechettes.push({
        x: this.x + Math.cos(angle) * (this.r + 8),
        y: this.y + Math.sin(angle) * (this.r + 8),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle: angle,
        life: 45,
        damage: cfg.sparkDirectDamage || 14,
        explosionRadius: cfg.sparkExplosionRadius || 42,
        explosionDamage: cfg.sparkExplosionDamage || 22
      });
    }

    audioSystem.playSFX(cfg.sounds?.sparkBurst || 'Assets/Sound Effects/Attacks/flamespray1.mp3', 0.65);
    spawnImpactFlash(this.x, this.y, '#FFE600');
    spawnFloatingText(this.x, this.y - 25, 'SPARK FLECHETTE', '#FFE600');
  }

  _updateSparkFlechettes() {
    for (let i = this.activeFlechettes.length - 1; i >= 0; i--) {
      const f = this.activeFlechettes[i];
      f.x += f.vx;
      f.y += f.vy;
      f.life--;

      // Check collision with enemies
      let hit = false;
      const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
      for (let t of allTargets) {
        if (!t || t === this || t.isDead || (t.hp || 0) <= 0 || t.isInvulnerable) continue;
        if (Math.hypot(t.x - f.x, t.y - f.y) <= (t.r || 25) + 6) {
          this._detonateFlechette(f);
          hit = true;
          break;
        }
      }

      // Check arena boundaries
      if (!hit) {
        const arena = CONFIG.arena;
        if (arena && (f.x <= arena.x || f.x >= arena.x + arena.width || f.y <= arena.y || f.y >= arena.y + arena.height || f.life <= 0)) {
          this._detonateFlechette(f);
          hit = true;
        }
      }

      if (hit || f.life <= 0) {
        this.activeFlechettes.splice(i, 1);
      }
    }
  }

  _detonateFlechette(f) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    audioSystem.playSFX(cfg.sounds?.sparkExplosion || 'Assets/Sound Effects/Attacks/explosion.mp3', 0.40);
    spawnSparks(f.x, f.y, 14, '#FFE600');
    triggerGlobalScreenShake(2.0, 6);

    const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
    for (let t of allTargets) {
      if (!t || t === this || t.isDead || (t.hp || 0) <= 0) continue;
      const d = Math.hypot(t.x - f.x, t.y - f.y);
      if (d <= f.explosionRadius) {
        applyDamageToTarget(t, f.explosionDamage, this, false);
        spawnBloodEffect(t.x, t.y);
      }
    }
  }

  /**
   * Secondary Skill: Decoy Bomb / Smoke Step
   */
  _deployDecoyBomb(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    this.decoyCooldown = this.decoyCooldownMax;

    // Spawn decoy clone charging at opponent
    const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
    this.activeDecoys.push({
      x: this.x,
      y: this.y,
      r: this.r || 20,
      angle: angleToTarget,
      speed: cfg.decoyRushSpeed || 7.2,
      target: target,
      fuseTimer: cfg.decoyFuseFrames || 90,
      explosionRadius: cfg.decoyExplosionRadius || 110,
      damage: cfg.decoyExplosionDamage || 45,
      knockback: cfg.decoyExplosionKnockback || 24
    });

    // Reze flanks laterally
    const flankAngle = angleToTarget + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
    this.x += Math.cos(flankAngle) * 90;
    this.y += Math.sin(flankAngle) * 90;

    audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 0.75);
    spawnFloatingText(this.x, this.y - 25, 'DECOY STEP!', this.themeColor);
  }

  _updateDecoys() {
    for (let i = this.activeDecoys.length - 1; i >= 0; i--) {
      const d = this.activeDecoys[i];
      d.fuseTimer--;

      if (d.target && !d.target.isDead) {
        const ang = Math.atan2(d.target.y - d.y, d.target.x - d.x);
        d.x += Math.cos(ang) * d.speed;
        d.y += Math.sin(ang) * d.speed;
        d.angle = ang;
      }

      // Detonate if close to target or fuse expires
      const distToTarget = d.target ? Math.hypot(d.target.x - d.x, d.target.y - d.y) : Infinity;
      if (d.fuseTimer <= 0 || distToTarget < (d.r + (d.target?.r || 25))) {
        this._detonateDecoy(d);
        this.activeDecoys.splice(i, 1);
      }
    }
  }

  _detonateDecoy(d) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    audioSystem.playSFX(cfg.sounds?.explosionLarge || 'Assets/Sound Effects/Skills/fugaexplode.mp3', 0.85);
    spawnSparks(d.x, d.y, 28, '#FF2E00');
    triggerGlobalScreenShake(4.5, 14);

    const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
    for (let t of allTargets) {
      if (!t || t === this || t.isDead || (t.hp || 0) <= 0) continue;
      const dist = Math.hypot(t.x - d.x, t.y - d.y);
      if (dist <= d.explosionRadius) {
        applyDamageToTarget(t, d.damage, this, false);
        spawnBloodEffect(t.x, t.y);

        const kbAng = Math.atan2(t.y - d.y, t.x - d.x);
        t.knockbackVx = Math.cos(kbAng) * d.knockback;
        t.knockbackVy = Math.sin(kbAng) * d.knockback;

        // Rule 5: TimeStop strictly on target
        if (typeof t.applyTimeStop === 'function') {
          t.applyTimeStop(15);
        }
      }
    }
  }

  /**
   * Mobility Skill: Supersonic Rocket Lunge (Bomb Devil Form ONLY)
   */
  _activateRocketLunge(target) {
    if (!this.isHybridModeActive) return;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    this.rocketCooldown = this.rocketCooldownMax;
    this.isRocketLunging = true;
    this.rocketTimer = cfg.rocketDurationFrames || 24;

    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    const speed = cfg.rocketLungeSpeed || 34.0;
    this.rocketLungeVx = Math.cos(angle) * speed;
    this.rocketLungeVy = Math.sin(angle) * speed;
    this.gunAngle = angle;

    audioSystem.playSFX(cfg.sounds?.rocketJet || 'Assets/Sound Effects/Skills/genos-dash-noise.mp3', 0.85);
    spawnFloatingText(this.x, this.y - 25, 'ROCKET LUNGE!', this.themeColor);
  }

  _updateRocketLunge() {
    if (!this.isRocketLunging) return;

    this.x += this.rocketLungeVx;
    this.y += this.rocketLungeVy;
    this.rocketTimer--;

    // Collision check with enemies
    const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
    for (let t of allTargets) {
      if (!t || t === this || t.isDead || (t.hp || 0) <= 0) continue;
      if (Math.hypot(t.x - this.x, t.y - this.y) <= (this.r + (t.r || 25))) {
        // Impact!
        const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
        audioSystem.playSFX('Assets/Sound Effects/Attacks/explosion.mp3', 0.75);
        applyDamageToTarget(t, cfg.rocketHitDamage || 35, this, true);
        spawnBloodEffect(t.x, t.y);
        spawnSparks(t.x, t.y, 22, this.themeColor);
        triggerGlobalScreenShake(4.0, 12);

        t.knockbackVx = this.rocketLungeVx * 1.2;
        t.knockbackVy = this.rocketLungeVy * 1.2;
        if (typeof t.applyTimeStop === 'function') t.applyTimeStop(10);

        this.isRocketLunging = false;
        break;
      }
    }

    // Wall bounce check
    const arena = CONFIG.arena;
    if (arena) {
      if (this.x <= arena.x + this.r || this.x >= arena.x + arena.width - this.r ||
          this.y <= arena.y + this.r || this.y >= arena.y + arena.height - this.r) {
        this.isRocketLunging = false;
        this.x = Math.max(arena.x + this.r, Math.min(arena.x + arena.width - this.r, this.x));
        this.y = Math.max(arena.y + this.r, Math.min(arena.y + arena.height - this.r, this.y));
        if (this.isHybridModeActive) {
          const target = this._findBestTarget();
          this.resolveWallBounce(arena, target);
        } else {
          spawnSparks(this.x, this.y, 18, '#FFE600');
        }
      }
    }

    if (this.rocketTimer <= 0) {
      this.isRocketLunging = false;
    }
  }

  /**
   * Resolves arena boundary collisions.
   * During Bomb Devil Form, Reze detonates a wall blast and triggers Supersonic Rocket Lunge
   * towards her opponent upon colliding with any wall!
   */
  resolveWallBounce(arena, opponent) {
    if (!arena && typeof state !== 'undefined') arena = state.arena;
    if (!arena) return false;

    // Rule 1.2: Mandatory stasis guards
    if (this.isCaughtInBeam?.() || this.isDraggedByGetsuga || this.isWallPinnedByMakima || this.isWallPinnedBySaitama || this.isWallPinnedByEscanor || this.isCurrentlyWallPinnedByEscanor) {
      return super.resolveWallBounce(arena, opponent);
    }

    // ──────────────────────────────────────────
    // HUMAN FORM: Standard wall bounce (no custom logic needed)
    // Delegate directly to base class so velocity bounce is applied properly.
    // ──────────────────────────────────────────
    if (!this.isHybridModeActive) {
      return super.resolveWallBounce(arena, opponent);
    }

    // ──────────────────────────────────────────
    // BOMB DEVIL FORM: Custom wall detection + Rocket Lunge trigger
    // ──────────────────────────────────────────
    let collidedWall = false;
    let normalX = 0;
    let normalY = 0;

    // Check & Clamp X Bounds
    if (this.x - this.r <= arena.x) {
      this.x = arena.x + this.r;
      normalX = 1;
      collidedWall = true;
    } else if (this.x + this.r >= arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      normalX = -1;
      collidedWall = true;
    }

    // Check & Clamp Y Bounds
    if (this.y - this.r <= arena.y) {
      this.y = arena.y + this.r;
      normalY = 1;
      collidedWall = true;
    } else if (this.y + this.r >= arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      normalY = -1;
      collidedWall = true;
    }

    if (!collidedWall) {
      return false;
    }

    // Trigger Supersonic Rocket Lunge off wall (must respect skill cooldown)
    if (!this.isPullingPin && !this.isExecutingNuke && !this.isVaulting && this.rocketCooldown <= 0) {
      if ((this.wallLungeDebounceTimer || 0) <= 0) {
        this.wallLungeDebounceTimer = 18;
        this._triggerWallRocketLunge(opponent, normalX, normalY);
        return true;
      }
    }

    // Devil Form fallback bounce (cooldown active or busy with other actions).
    // Position was already clamped above, so we must apply velocity bounce manually
    // since super.resolveWallBounce won't detect the collision anymore.
    const restitution = CONFIG.collision?.restitution ?? 0.95;
    if (normalX !== 0) {
      this.vx = Math.abs(this.vx) * restitution * normalX;
      this.knockbackVx = Math.abs(this.knockbackVx) * restitution * normalX;
    }
    if (normalY !== 0) {
      this.vy = Math.abs(this.vy) * restitution * normalY;
      this.knockbackVy = Math.abs(this.knockbackVy) * restitution * normalY;
    }
    this.normalizeSpeed?.();
    return true;
  }

  /**
   * Triggers Supersonic Rocket Lunge off wall contact in Bomb Devil Form
   */
  _triggerWallRocketLunge(opponent, normalX, normalY) {
    if (!this.isHybridModeActive) return;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    const target = this._findBestTarget() || opponent;

    let lungeAngle;
    if (target && !target.isDead) {
      // Aim towards target
      let targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
      // Ensure target angle points away from the wall into arena
      const dot = Math.cos(targetAngle) * normalX + Math.sin(targetAngle) * normalY;
      if (dot < 0.15) {
        // Blend angle with wall normal so she launches away from wall towards target
        const blendedX = Math.cos(targetAngle) + normalX * 0.75;
        const blendedY = Math.sin(targetAngle) + normalY * 0.75;
        lungeAngle = Math.atan2(blendedY, blendedX);
      } else {
        lungeAngle = targetAngle;
      }
    } else {
      // Default rebound normal reflection into arena
      lungeAngle = Math.atan2(normalY, normalX);
    }

    const speed = cfg.rocketLungeSpeed || 34.0;
    this.isRocketLunging = true;
    this.rocketTimer = cfg.rocketDurationFrames || 24;
    this.rocketLungeVx = Math.cos(lungeAngle) * speed;
    this.rocketLungeVy = Math.sin(lungeAngle) * speed;
    this.vx = this.rocketLungeVx;
    this.vy = this.rocketLungeVy;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.gunAngle = lungeAngle;

    // Reset skill cooldown so HUD reflects activation
    this.rocketCooldown = this.rocketCooldownMax;

    // Detonation effects at wall contact point
    try {
      audioSystem.playSFX('Assets/Sound Effects/Attacks/explosion.mp3', 0.80);
      audioSystem.playSFX(cfg.sounds?.rocketJet || 'Assets/Sound Effects/Skills/genos-dash-noise.mp3', 0.85);
      spawnImpactFlash(this.x, this.y, 45, '#FFE600');
      spawnSparks(this.x, this.y, 24, '#FFE600');
      spawnSparks(this.x, this.y, 16, '#FF2E00');
      triggerGlobalScreenShake(3.5, 10);
      if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(this.x, this.y - 25, 'WALL ROCKET!', this.themeColor);
      }
    } catch (e) {}

    // Wall blast shockwave
    this.activePalmBlasts.push({
      x: this.x,
      y: this.y,
      radius: 65,
      timer: 14,
      maxTimer: 14,
      isPunchExplosion: true
    });
  }

  /**
   * Ultimate: Bomb Devil Unleashed — Megaton Tsar Nuke
   */
  _activateMegatonNuke(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    this.nukeCooldown = this.nukeCooldownMax;
    this.nukeTarget = target;

    // If Reze is in Human Form (!this.isHybridModeActive):
    // Play the pin-pull animation FIRST, then detonate the AOE explosion as she transforms!
    if (!this.isHybridModeActive) {
      this._startPinPullTransformation(target, false);
      return;
    }

    // Already in Bomb Devil Form: Direct living warhead dive assault
    this.isExecutingNuke = true;
    this.nukePhase = 'DIVE';
    this.nukeTimer = 22;
    audioSystem.playSFX(cfg.sounds?.nukeDive || 'Assets/Sound Effects/Skills/fugatravel.mp3', 0.85);
    triggerGlobalScreenShake(5.0, 20);
    spawnFloatingText(this.x, this.y - 35, 'MEGATON TSAR NUKE!', '#FF2E00');
  }

  /**
   * Transformation Sequence 1: Collar Pin Pull Windup
   * Reze (in Human Form) reaches to her neck choker, grasps the grenade ring, and pulls the pin outward with sparks.
   */
  _startPinPullTransformation(target, isRevive = false) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : rezeConfig;
    this.interruptAttacks();
    this.isPullingPin = true;
    this.pinPullTimer = 44;
    this.pinPullMaxTimer = 44;
    this.pinPullTarget = target;
    this.isPinPullRevive = isRevive;
    this.isExecutingNuke = false;
    this.nukePhase = 'IDLE';

    // Aim towards target immediately (Rule 3)
    if (target) {
      this.aim(target);
    }

    // Rule 5: Apply hit-pause exclusively to opponents during transformation windup (NEVER freeze attacker)
    const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
    for (let t of allTargets) {
      if (t && t !== this && typeof t.applyTimeStop === 'function') {
        t.applyTimeStop(55);
      }
    }

    // Decelerate movement to a grounded stance
    this.vx *= 0.15;
    this.vy *= 0.15;

    try {
      audioSystem.playSFX(cfg.sounds?.pinPull || 'Assets/Sound Effects/Skills/parry.mp3', 0.95);
    } catch (e) {}

    try {
      if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(this.x, this.y - 32, 'PULLING PIN...', '#FFE600');
      }
    } catch (e) {}
  }

  /**
   * Transformation Sequence Update Loop
   */
  _updatePinPullTransformation(arena, opponent) {
    if (!this.isPullingPin) return;

    this.pinPullTimer--;

    // Keep aiming at target (Rule 3)
    if (this.pinPullTarget && !this.pinPullTarget.isDead) {
      this.aim(this.pinPullTarget);
    }

    // Decelerate with friction physics (Rule 1.1)
    this.vx *= 0.82;
    this.vy *= 0.82;
    this.applyMovementPhysics(0.15);
    const effectiveArena = arena || ((typeof CONFIG !== 'undefined' && CONFIG.arena) ? CONFIG.arena : state.arena);
    this.resolveWallBounce(effectiveArena, this.pinPullTarget || opponent);

    this._updateVisualExplosions();

    // Midway event (~frame 22 of 44): hand pulls pin outward with tension, sparks spray from neck collar
    if (this.pinPullTimer === Math.round(this.pinPullMaxTimer * 0.50)) {
      try {
        audioSystem.playSFX('Assets/Sound Effects/Attacks/flamespray1.mp3', 0.55);
        spawnSparks(this.x, this.y - 6, 14, '#FFE600');
        triggerGlobalScreenShake(2.5, 8);
      } catch (e) {}
    }

    // Culmination: Pin is completely freed -> Detonate radial transformation AOE explosion!
    if (this.pinPullTimer <= 0) {
      this._detonateTransformationBlast();
    }
  }

  /**
   * Transformation Sequence 2: AOE Explosion as she transforms into Bomb Devil Form
   */
  _detonateTransformationBlast() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : rezeConfig;
    const radius = 175;
    const damage = 50;
    const knockback = 34;

    // 1. Radial Blast Shockwave Visual
    this.activeNukeBlasts.push({
      x: this.x,
      y: this.y,
      radius: radius,
      timer: 30,
      maxTimer: 30,
      isTransformationBlast: true
    });

    // 2. Audio SFX: Heavy explosion detonation
    try {
      audioSystem.playSFX(cfg.sounds?.explosionLarge || 'Assets/Sound Effects/Skills/fugaexplode.mp3', 1.0);
      audioSystem.playSFX('Assets/Sound Effects/Attacks/explosion.mp3', 0.85);
    } catch (e) {}

    // 3. Screen shake & Particle Bursts
    try {
      triggerGlobalScreenShake(7.5, 25);
      spawnSparks(this.x, this.y, 45, '#FFE600');
      spawnSparks(this.x, this.y, 35, '#FF2E00');
      spawnImpactFlash(this.x, this.y, '#FFE600');
      if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(this.x, this.y - 36, 'BOMB DEVIL AWAKENED!', '#FF2E00');
      }
    } catch (e) {}

    // 4. Multi-target AOE damage & knockback (Rule 6: fighters & illusions)
    const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
    const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(state.fighters?.indexOf(this)) : null;

    for (let t of allTargets) {
      if (!t || t === this || t.isDead || (t.hp || 0) <= 0 || t.isInvulnerable) continue;
      if (state.fighters) {
        const idx = state.fighters.indexOf(t);
        if (idx !== -1 && myTeam !== null && state.getFighterTeam?.(idx) === myTeam) continue;
      }

      const dist = Math.hypot(t.x - this.x, t.y - this.y);
      if (dist <= radius + (t.r || 25)) {
        try {
          applyDamageToTarget(t, damage, this, false);
          spawnBloodEffect(t.x, t.y);
        } catch (e) {}

        const angle = Math.atan2(t.y - this.y, t.x - this.x);
        t.knockbackVx = Math.cos(angle) * knockback;
        t.knockbackVy = Math.sin(angle) * knockback;

        if (typeof t.applyTimeStop === 'function') {
          t.applyTimeStop(20);
        }
      }
    }

    // 5. OFFICIAL TRANSFORMATION INTO BOMB DEVIL FORM
    this.isHybridModeActive = true;
    this.hybridModeTimer = Infinity;
    this.isPullingPin = false;
    this.isExecutingNuke = false;
    this.nukePhase = 'IDLE';
    this.isPinPullRevive = false;
    this.isRocketLunging = false;
    this.rocketTimer = 0;
    this.rocketCooldown = this.rocketCooldownMax || 300;
    this.shootCooldown = 30;
    this.vx = 0;
    this.vy = 0;
  }

  _updateMegatonNuke() {
    if (!this.isExecutingNuke) return;

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    this.nukeTimer--;
    if (this.nukePhase === 'TRANSFORM') {
      // Handled by _updatePinPullTransformation
    } else if (this.nukePhase === 'DIVE') {
      if (this.nukeTarget && !this.nukeTarget.isDead) {
        const ang = Math.atan2(this.nukeTarget.y - this.y, this.nukeTarget.x - this.x);
        this.x += Math.cos(ang) * 38.0;
        this.y += Math.sin(ang) * 38.0;
      }
      if (this.nukeTimer <= 0 || (this.nukeTarget && Math.hypot(this.nukeTarget.x - this.x, this.nukeTarget.y - this.y) < 40)) {
        this._detonateMegatonNuke();
        this.isExecutingNuke = false;
        this.nukePhase = 'IDLE';
      }
    }
  }

  _detonateMegatonNuke() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    const radius = cfg.nukeExplosionRadius || 220;
    const dmg = cfg.nukeDirectDamage || 130;
    const kb = cfg.nukeKnockbackForce || 48;

    this.activeNukeBlasts.push({
      x: this.x,
      y: this.y,
      radius: radius,
      timer: 30,
      maxTimer: 30
    });

    audioSystem.playSFX(cfg.sounds?.nukeImpact || 'Assets/Sound Effects/Skills/genos-selfdestruct-explosion.mp3', 1.0);
    audioSystem.playSFX('Assets/Sound Effects/Attacks/explosion.mp3', 0.8);
    triggerGlobalScreenShake(8.0, 30);
    spawnSparks(this.x, this.y, 45, '#FF2E00');

    const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
    for (let t of allTargets) {
      if (!t || t === this || t.isDead || (t.hp || 0) <= 0) continue;
      const dist = Math.hypot(t.x - this.x, t.y - this.y);
      if (dist <= radius) {
        applyDamageToTarget(t, dmg, this, false);
        spawnBloodEffect(t.x, t.y);

        const kbAng = Math.atan2(t.y - this.y, t.x - this.x);
        t.knockbackVx = Math.cos(kbAng) * kb;
        t.knockbackVy = Math.sin(kbAng) * kb;

        if (typeof t.applyTimeStop === 'function') {
          t.applyTimeStop(25);
        }
      }
    }
  }

  _updateVisualExplosions() {
    for (let i = this.activeKnifeSlashes.length - 1; i >= 0; i--) {
      const k = this.activeKnifeSlashes[i];
      k.timer--;
      if (k.timer <= 0) this.activeKnifeSlashes.splice(i, 1);
    }
    for (let i = this.activeMartialArcs.length - 1; i >= 0; i--) {
      const a = this.activeMartialArcs[i];
      a.timer--;
      if (a.timer <= 0) this.activeMartialArcs.splice(i, 1);
    }
    for (let i = this.activePalmBlasts.length - 1; i >= 0; i--) {
      const b = this.activePalmBlasts[i];
      b.timer--;
      if (b.timer <= 0) this.activePalmBlasts.splice(i, 1);
    }
    for (let i = this.activeNukeBlasts.length - 1; i >= 0; i--) {
      const n = this.activeNukeBlasts[i];
      n.timer--;
      if (n.timer <= 0) this.activeNukeBlasts.splice(i, 1);
    }
  }

  /**
   * Lethal Damage Intercept: Collar Pin Revive
   */
  takeDamage(amount, attacker, opts = {}) {
    if (this.isPullingPin) return; // Invulnerable / super armor during dramatic pin-pull transformation

    const rawDamage = typeof amount === 'number' ? amount : (amount?.damage || 0);
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : rezeConfig;
    if (this.hp <= rawDamage && this.reviveStocks > 0) {
      if (Boolean(cfg.enableCollarPinRevive)) {
        this.reviveStocks--;
        this.hp = Math.round((this.maxHp || 340) * (cfg.reviveHpPercent || 0.50));
        this.isHybridModeActive = true;
        this.hybridModeTimer = Infinity;
        this.isRocketLunging = false;
        this.rocketTimer = 0;
        this.rocketCooldown = this.rocketCooldownMax || 300;
        this.shootCooldown = 30;
        this.vx = 0;
        this.vy = 0;

        // Radial shockwave on collar pin revive
        const shockR = cfg.reviveShockwaveRadius || 140;
        const shockDmg = cfg.reviveShockwaveDamage || 40;
        const shockKb = cfg.reviveShockwaveKnockback || 28;

        this.activeNukeBlasts.push({
          x: this.x,
          y: this.y,
          radius: shockR,
          timer: 25,
          maxTimer: 25,
          isTransformationBlast: true
        });

        try {
          audioSystem.playSFX(cfg.sounds?.pinPull || 'Assets/Sound Effects/Skills/parry.mp3', 0.95);
          audioSystem.playSFX(cfg.sounds?.explosionLarge || 'Assets/Sound Effects/Skills/fugaexplode.mp3', 0.90);
        } catch (e) {}

        try {
          spawnSparks(this.x, this.y, 35, '#FFE600');
          spawnSparks(this.x, this.y, 25, '#FF2E00');
          triggerGlobalScreenShake(6.0, 20);
          if (typeof spawnFloatingText === 'function') {
            spawnFloatingText(this.x, this.y - 35, 'COLLAR PIN IGNITION!', this.themeColor);
          }
        } catch (e) {}

        const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
        for (let t of allTargets) {
          if (!t || t === this || t.isDead) continue;
          if (Math.hypot(t.x - this.x, t.y - this.y) <= shockR) {
            try {
              applyDamageToTarget(t, shockDmg, this, false);
            } catch (e) {}
            const ang = Math.atan2(t.y - this.y, t.x - this.x);
            t.knockbackVx = Math.cos(ang) * shockKb;
            t.knockbackVy = Math.sin(ang) * shockKb;
            if (typeof t.applyTimeStop === 'function') t.applyTimeStop(15);
          }
        }
        return;
      }
    }

    return super.takeDamage(amount, attacker, typeof opts === 'object' && opts !== null ? opts : {});
  }

  /**
   * Main Fighter Draw Function
   */
  draw(ctx) {
    // 1. Manga Action Speed Lines (Under fighter)
    drawRezeSpeedLines(ctx, this);

    // 2. Active Flechettes
    for (let f of this.activeFlechettes) {
      drawSparkFlechette(ctx, f);
    }

    // 3. Active Decoys
    for (let d of this.activeDecoys) {
      drawRezeDecoy(ctx, d);
    }

    // 4. Main Skin Body & Hands
    drawRezeSkin(ctx, this);

    // 5. Active Concealed Knife Slashes (Human Form)
    for (let s of this.activeKnifeSlashes) {
      drawRezeKnifeSlash(ctx, s);
    }

    // 6. Active Pixel Martial Arcs & Blast Overlays (Hybrid Form)
    for (let a of this.activeMartialArcs) {
      drawRezePixelMartialArc(ctx, a);
    }
    for (let b of this.activePalmBlasts) {
      drawRezePalmBlast(ctx, b);
    }
    for (let n of this.activeNukeBlasts) {
      drawRezeMegatonNuke(ctx, n);
    }

    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }

  onFrozenSkillDurationTick(isInsideGojoDomain) {
    // Bomb Devil Form is permanent once activated — no duration to tick down
  }
}

