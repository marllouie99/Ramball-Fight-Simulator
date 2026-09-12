// ─────────────────────────────────────────────
// Makima (The Control Devil) — Entity & Combat Engine
// Chainsaw Man / Public Safety Special Division 4
// Adheres strictly to repository coding standards:
// - Rule 1 (TimeStop & Freeze Guards)
// - Rule 5 (No Self TimeStop during combos)
// - Rule 6 (Unified Target Queries: Fighters & Illusions)
// - Rule 11 (Zero shadowBlur CPU filtering)
// - Rule 15 (Physics & Wall-Bounce Displacement Engine)
// - Rule 18 (HUD Theme Consistency)
// - Rule 19 & 20 (Fighter Skin & Hand Guards)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { MODE_SPEED_MULTIPLIER, MODE_SETTINGS, MODE_HP_MULTIPLIER } from '../../core/modeConfig.js';
import { drawMakimaSkin } from '../../graphics/fighters/makimaSkin.js';
import { drawMakimaChainsOfDomination, drawMakimaMissedChains, getMakimaChainOrigin, resolveMakimaChainsSpeed, drawMakimaAngelSpearSummon, drawMakimaAngelSpearFlight, drawMakimaHolyCrossExplosion, spawnMakimaChainBreakEffect, drawMakimaChainBreakEffects } from '../../graphics/weapons/makimaWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect, spawnFatalBloodSplash, spawnMakimaBloodShatter } from '../../graphics/particles/bloodEffect.js';
import { spawnDeathShatter } from '../../graphics/particles/deathShatterEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

export class MakimaFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'makima';
    this.type = 'makima';
    this.color = '#A31D24'; // Velvet Blood Crimson

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};

    // In every game mode, Makima has 50% max HP based on the fixed HP in that game mode
    const hpRatio = cfg.maxHpRatio ?? 0.50;
    const modeFixed = MODE_SETTINGS[state.mode]?.fixedHp || MODE_SETTINGS[state.mode]?.playerFixedHp || MODE_SETTINGS[state.mode]?.soloFixedHp;
    if (modeFixed) {
      this.maxHp = Math.round(modeFixed * hpRatio);
    } else {
      this.maxHp = Math.round((def?.hp || 100) * (MODE_HP_MULTIPLIER[state.mode] || 1) * hpRatio);
    }
    this.hp = this.maxHp;

    // Animation & Combat States
    this.punchAnimTimer = 0;
    this.punchMaxTime = 16;
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 16;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    this.combatAuraOpacity = 0.25;

    // Passive 1: Prime Minister Contract (Citizen Redirection Stocks)
    this.citizenLivesMax = cfg.maxCitizenLives || 5;
    this.citizenLives = this.citizenLivesMax;
    this.isRevivingFromContract = false;
    this.isShatterReviving = false;
    this.reviveStasisMax = cfg.citizenReviveDurationFrames || 75;
    this.reviveStasisTimer = 0;
    this.shatteredPieces = null;

    // Primary: "Bang." (Supersonic Kinetic Shockwave)
    this.bangCooldownMax = cfg.bangCooldown || 200;
    this.bangCooldown = this.bangCooldownMax;
    this.shootCooldownMax = this.bangCooldownMax;
    this.shootCooldown = this.bangCooldownMax;
    this.activeBangBeams = [];

    // Aiming & Turn Rate (Controlled Aim Rotation — No Instant Snap Auto-Aim)
    this.aimTurnRate = cfg.aimTurnRate || 0.055;
    this.aimAlignmentThreshold = cfg.aimAlignmentThreshold || 0.18;

    // Skill 1: Chains of Domination (Shihai no Kusari)
    this.chainsCooldownMax = cfg.chainsCooldown || 500;
    this.chainsCooldown = this.chainsCooldownMax;
    const chainsSpeedInfo = resolveMakimaChainsSpeed(cfg, cfg.chainsRange || 420);
    this.chainsThrowSpeed = chainsSpeedInfo.throwSpeed;
    this.chainsLaunchFrames = chainsSpeedInfo.launchFrames;
    this.chainsWindupFrames = cfg.chainsWindupFrames !== undefined ? cfg.chainsWindupFrames : 14;
    this.isPreparingChain = false;
    this.isAboutToThrowChain = false;
    this.chainWindupTimer = 0;
    this.chainWindupMax = this.chainsWindupFrames;
    this.chainTarget = null;
    this.chainLockedAimAngle = null;
    this.isChainingActive = false;
    this.chainTimer = 0;
    this.chainMaxTimer = cfg.chainsDuration || cfg.chainsDurationFrames || cfg.chainsStasisFrames || 240;
    this.isThrowingChain = false;
    this.chainThrowAnimTimer = 0;
    this.chainThrowAnimMax = Math.max(16, this.chainsLaunchFrames + 12);
    this.chainedTargets = [];
    this.activeMissedChains = [];

    // Skill 2: Angel's Armory (1000-Year Holy Spear)
    this.angelCooldownMax = cfg.angelCooldown || 1500;
    this.angelCooldown = this.angelCooldownMax;
    this.isSummoningSpear = false;
    this.spearTimer = 0;
    this.spearMaxTimer = cfg.thousandYearSpearChannelFrames || 100;
    this.spearTarget = null;
    this.spearLaunchAngle = 0;
    this.spearLaunchDist = 550;
    this.activeSpears = [];
    this.activeHolyExplosions = [];
    this.activeHalberds = [];

    // Ultimate: Kyoto Shrine Ritual: Gravitational Splatter
    this.shrineCooldownMax = cfg.shrineCooldown || 1920;
    this.shrineCooldown = this.shrineCooldownMax;
    this.isExecutingRitual = false;
    this.ritualTimer = 0;
    this.ritualMaxTimer = cfg.shrineChannelFrames || 110;
    this.ritualTarget = null;
    this.ritualStage = 0;

    // Declarative Skill Registration
    this.skillManager.registerSkills([
      {
        id: 'bang',
        name: 'Bang!',
        type: 'active',
        cooldownKey: 'bangCooldown',
        cooldownMaxKey: 'bangCooldownMax'
      },
      {
        id: 'chains',
        name: 'Chains of Domination',
        type: 'active',
        cooldownKey: 'chainsCooldown',
        cooldownMaxKey: 'chainsCooldownMax',
        durationKey: 'chainTimer',
        durationMaxKey: 'chainMaxTimer',
        activeKey: 'isChainingActive',
        channelingKey: 'isPreparingChain',
        onExpire: (fighter) => {
          fighter.isChainingActive = false;
          fighter.chainsCooldown = fighter.chainsCooldownMax;
          for (let t of fighter.chainedTargets) {
            if (t) {
              fighter._releaseChainedTarget(t);
              if (!t.isDead && (t.hp === undefined || t.hp > 0)) {
                if (typeof spawnSparks === 'function') spawnSparks(t.x, t.y, 8, '#F59E0B');
                if (typeof spawnImpactFlash === 'function') spawnImpactFlash(t.x, t.y, '#FFFFFF', 18);
              }
            }
          }
          fighter.chainedTargets = [];
        }
      },
      {
        id: 'angel_spear',
        name: "1000-Year Holy Spear",
        type: 'active',
        cooldownKey: 'angelCooldown',
        cooldownMaxKey: 'angelCooldownMax',
        channelingKey: 'isSummoningSpear',
        channelTimerKey: 'spearTimer'
      },
      {
        id: 'shrine_ritual',
        name: 'Kyoto Shrine Ritual',
        type: 'ultimate',
        cooldownKey: 'shrineCooldown',
        cooldownMaxKey: 'shrineCooldownMax',
        channelingKey: 'isExecutingRitual',
        channelTimerKey: 'ritualTimer'
      }
    ]);
  }

  reset() {
    super.reset();
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
    const hpRatio = cfg.maxHpRatio ?? 0.50;
    const modeFixed = MODE_SETTINGS[state.mode]?.fixedHp || MODE_SETTINGS[state.mode]?.playerFixedHp || MODE_SETTINGS[state.mode]?.soloFixedHp;
    if (modeFixed) {
      this.maxHp = Math.round(modeFixed * hpRatio);
    } else {
      this.maxHp = Math.round((this._def?.hp || 100) * (MODE_HP_MULTIPLIER[state.mode] || 1) * hpRatio);
    }
    this.hp = this.maxHp;
    this.citizenLives = this.citizenLivesMax || 3;
    this.isRevivingFromContract = false;
    this.isShatterReviving = false;
    delete this._shatterLockedX;
    delete this._shatterLockedY;
    this.reviveStasisTimer = 0;
    this.shatteredPieces = null;
    this.bloodParticles = null;
    this.punchAnimTimer = 0;
    this.slashSwingTimer = 0;
    this.bangCooldownMax = cfg.bangCooldown || 200;
    this.bangCooldown = this.bangCooldownMax;
    this.shootCooldownMax = this.bangCooldownMax;
    this.shootCooldown = this.bangCooldownMax;
    this.chainsCooldownMax = cfg.chainsCooldown || 500;
    this.chainsCooldown = this.chainsCooldownMax;
    this.angelCooldownMax = cfg.angelCooldown || 1500;
    this.angelCooldown = this.angelCooldownMax;
    this.shrineCooldownMax = cfg.shrineCooldown || 1920;
    this.shrineCooldown = this.shrineCooldownMax;
    if (this.chainedTargets) {
      for (let t of this.chainedTargets) {
        this._releaseChainedTarget(t);
      }
    }
    this.chainedTargets = [];
    this.isChainingActive = false;
    this.chainTimer = 0;
    const chainsSpeedInfo = resolveMakimaChainsSpeed(cfg, cfg.chainsRange || 420);
    this.chainsThrowSpeed = chainsSpeedInfo.throwSpeed;
    this.chainsLaunchFrames = chainsSpeedInfo.launchFrames;
    this.chainsWindupFrames = cfg.chainsWindupFrames !== undefined ? cfg.chainsWindupFrames : 14;
    this.isPreparingChain = false;
    this.isAboutToThrowChain = false;
    this.chainWindupTimer = 0;
    this.chainWindupMax = this.chainsWindupFrames;
    this.chainTarget = null;
    this.chainLockedAimAngle = null;
    this.isThrowingChain = false;
    this.chainThrowAnimTimer = 0;
    this.chainThrowAnimMax = Math.max(16, this.chainsLaunchFrames + 12);
    this.activeMissedChains = [];
    this.isSummoningSpear = false;
    this.spearTimer = 0;
    this.spearTarget = null;
    this.spearLaunchAngle = 0;
    this.spearLaunchDist = 550;
    this.activeSpears = [];
    this.activeHolyExplosions = [];
    this.activeHalberds = [];
    this.isExecutingRitual = false;
    this.ritualTimer = 0;
    this.ritualTarget = null;
    this.activeBangBeams = [];
    this.aimTurnRate = cfg.aimTurnRate || 0.055;
    this.aimAlignmentThreshold = cfg.aimAlignmentThreshold || 0.18;
  }

  isStationarySkillActive() {
    return Boolean(this.isExecutingRitual || this.isSummoningSpear || this.isPreparingChain || this.isThrowingChain || (this.chainThrowAnimTimer && this.chainThrowAnimTimer > 0) || this.isRevivingFromContract || this.isShatterReviving || super.isStationarySkillActive?.());
  }

  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks(forceCancelAll);
    this.isPreparingChain = false;
    this.isThrowingChain = false;
    this.chainThrowAnimTimer = 0;
    this.chainWindupTimer = 0;
    this.isSummoningSpear = false;
    this.spearTimer = 0;
    this.isExecutingRitual = false;
    this.ritualTimer = 0;
    this.chainLockedAimAngle = null;
    this.spearLaunchAngle = undefined;
  }

  isEffectivelyAlive() {
    if (this.hp > 0 && !this.isDead) return true;
    if (this.isRevivingFromContract || this.isShatterReviving) return true;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
    const enablePassive = cfg.enableCitizenContract ?? cfg.enablePassive ?? cfg.citizenContractEnabled ?? true;
    if (enablePassive && this.citizenLives > 0) return true;
    return false;
  }

  _initShatteredPieces() {
    const r = this.r || 25;
    const bloodParticles = [];
    const count = 60;
    const goldenAngle = 2.399963229728653; // Phyllotaxis golden angle (~137.5°)

    for (let i = 0; i < count; i++) {
      // Golden ratio spiral distribution evenly covers Makima's entire body circle
      const normR = Math.sqrt((i + 0.5) / count);
      const targetDist = normR * (r * 0.94);
      const targetTheta = i * goldenAngle;
      const targetX = Math.cos(targetTheta) * targetDist;
      const targetY = Math.sin(targetTheta) * targetDist;

      // Radial scatter explosion vector outward into the arena
      const scatterAngle = targetDist > 1 ? Math.atan2(targetY, targetX) + (Math.random() - 0.5) * 0.35 : (i / count) * Math.PI * 2;
      const scatterDist = r * (1.8 + Math.random() * 3.4); // 45px to 130px burst radius
      const scatterX = Math.cos(scatterAngle) * scatterDist;
      const scatterY = Math.sin(scatterAngle) * scatterDist;

      const size = 2.0 + Math.random() * 3.5;          // 2.0px to 5.5px droplet radius
      const speedMult = 0.85 + Math.random() * 0.30;
      const delay = (i % 16) * 0.014;                  // cascading staggered return timing

      // Palette of authentic arterial & cursed blood shades
      let color;
      const roll = i % 5;
      if (roll === 0) color = '#880808';       // Dark arterial red
      else if (roll === 1) color = '#A31D24';  // Velvet Makima crimson
      else if (roll === 2) color = '#DC2626';  // Bright blood red
      else if (roll === 3) color = '#450A0A';  // Deep coagulated blood
      else color = '#F59E0B';                  // Solar gold contract essence droplet

      bloodParticles.push({
        targetX,
        targetY,
        scatterX,
        scatterY,
        size,
        speedMult,
        delay,
        color,
        hasLanded: false
      });
    }

    this.shatteredPieces = bloodParticles;
    this.bloodParticles = bloodParticles;
  }

  canPerformBasicAttack() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
    const enableBang = cfg.enableBang ?? cfg.bangEnabled ?? true;
    if (!enableBang) return false;
    if (this.isExecutingRitual || this.isSummoningSpear || this.isPreparingChain || this.isThrowingChain || this.isRevivingFromContract || this.isShatterReviving || this.isChainingActive) return false;
    return super.canPerformBasicAttack ? super.canPerformBasicAttack() : true;
  }

  /**
   * Determines whether Makima can actively rotate her aim toward a target.
   * Auto-aim rotation is STRICTLY DISABLED:
   * 1. When she is about to throw her chain (windup / preparation phase: isPreparingChain).
   * 2. While she is actively throwing her chain (isThrowingChain / chainThrowAnimTimer > 0).
   * 3. During Angel's Spear summoning and Kyoto Shrine execution rituals.
   */
  canAim() {
    if (typeof super.canAim === 'function' && !super.canAim()) return false;
    if (this.isThrowingChain || (this.chainThrowAnimTimer && this.chainThrowAnimTimer > 0)) return false;
    if (this.isSummoningSpear || this.isExecutingRitual) return false;
    return true;
  }

  _getCardinalAngle(target) {
    if (!target) return (this.gunAngle !== undefined && !Number.isNaN(this.gunAngle)) ? this.gunAngle : 0;
    const targetY = (target.y !== undefined ? target.y : this.y) - (target.z || 0);
    const makimaY = this.y - (this.z || 0);
    const dx = (target.x !== undefined ? target.x : this.x) - this.x;
    const dy = targetY - makimaY;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? 0 : Math.PI;
    } else {
      return dy >= 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }

  /**
   * Master aim override: locks gunAngle and angle during chain throw.
   * In normal combat (and when doing Bang!), aims strictly in 4 cardinal directions (Up, Down, Left, Right).
   * During chain windup / skill prep, tracks enemy directly.
   */
  aim(target) {
    if (!this.canAim()) {
      if (this.chainLockedAimAngle !== undefined && this.chainLockedAimAngle !== null) {
        this.gunAngle = this.chainLockedAimAngle;
        this.angle = this.chainLockedAimAngle;
      }
      return false;
    }

    if (this.isPreparingChain || (this.chainWindupTimer && this.chainWindupTimer > 0) || this.isSummoningSpear || this.isExecutingRitual) {
      return super.aim(target);
    }

    // Free-angle aiming when Makima has an enemy chained — Bang can fire at any angle
    if (this.isChainingActive && this.chainedTargets && this.chainedTargets.length > 0) {
      return super.aim(target);
    }

    const aimTarget = target || (typeof this._acquirePrimaryTarget === 'function' ? this._acquirePrimaryTarget() : null);
    const cardinalAngle = this._getCardinalAngle(aimTarget);
    this.gunAngle = cardinalAngle;
    this.angle = cardinalAngle;
    return true;
  }

  /**
   * Checks if Makima's current aim angle is aligned with the target within her alignment threshold.
   * Prevents firing "Bang!" off-target before she has smoothly rotated to face the enemy.
   */
  isAimAlignedWithTarget(target) {
    if (!target) return false;
    const targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
    let currentAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
    let diff = targetAngle - currentAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    const threshold = this.aimAlignmentThreshold || 0.18;
    return Math.abs(diff) <= threshold;
  }

  /**
   * Overrides base Fighter.shoot() to trigger "Bang!" along current aim direction whenever cooldown is up.
   */
  shoot(ownerIndex) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
    const enableBang = cfg.enableBang ?? cfg.bangEnabled ?? true;
    if (enableBang && this.bangCooldown <= 0) {
      const target = this._acquirePrimaryTarget();
      this._castBangAttack(target);
      return true;
    }
    return false;
  }

  /**
   * Main Fighter Update Loop.
   * Adheres strictly to Rule 1 (TimeStop Freeze Guard) and Rule 5.
   */
  update(opponent, fi, arena) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};

    // ── 1. CITIZEN CONTRACT SHATTER & REASSEMBLY STASIS HANDLING ──
    if (this.isRevivingFromContract || this.isShatterReviving) {
      // Rigidly enforce immovable coordinates and zero velocities during death shatter stasis
      if (typeof this._shatterLockedX === 'number' && typeof this._shatterLockedY === 'number') {
        this.x = this._shatterLockedX;
        this.y = this._shatterLockedY;
      }
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;

      // Clear external CC locks so resurrection animation plays smoothly without pausing
      this.isTargetOfAmbush = false;
      this.timeStopTimer = 0;
      this.freezeTimer = 0;
      this.paralyzeTimer = 0;
      this.hitStunTimer = 0;
      this.isParalyzed = false;
      this.isParalyzedByMahito = false;
      this.isParalyzedByMahoraga = false;
      this._soulDisfigurementStacks = 0;
      this._soulDisfigurementTimer = 0;
      if (this.statusEffects) {
        this.statusEffects.timeStopTimer = 0;
        this.statusEffects.paralyzeTimer = 0;
        this.statusEffects.isParalyzed = false;
      }
      delete this._timeStopOriginalDuration;
      delete this._timeStopStartTime;
      delete this._timeStopFrozenAngle;
      delete this._timeStopFrozenGunAngle;

      this.reviveStasisTimer--;
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;

      // Pulse sacrificial crimson cursed energy sparks
      if (this.reviveStasisTimer % 4 === 0) {
        spawnSparks(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, 2, 'crimsonSniper');
      }

      const elapsed = this.reviveStasisMax - this.reviveStasisTimer;
      const targetHp = Math.round(this.maxHp * ((typeof CONFIG !== 'undefined' && CONFIG.makima?.citizenReviveHpPercent) ? CONFIG.makima.citizenReviveHpPercent : 0.50));

      // Revert Phase (frames 25 to 75): smoothly fill HP bar up to 50%
      if (elapsed >= 25) {
        const fillP = Math.max(0, Math.min(1.0, (elapsed - 25) / (this.reviveStasisMax - 25)));
        this.hp = Math.round(targetHp * fillP);
      } else {
        this.hp = 0;
      }

      // Reassembly Complete: Snap whole model back to full form
      if (this.reviveStasisTimer <= 0) {
        this.isRevivingFromContract = false;
        this.isShatterReviving = false;
        this.shatteredPieces = null;
        this.bloodParticles = null;
        delete this._shatterLockedX;
        delete this._shatterLockedY;
        this.hp = targetHp;
        this.isDead = false;
        this.dead = false;
        this._hasDied = false;

        // Trigger HUD health bar floating heal bubble popup, green glow pulse, and shake
        this._lastHealAmount = targetHp;
        this._healthBarHealTimer = 35;
        this._healthBarShakeTimer = 8;

        // Radiant reassembly flash & audio burst
        spawnImpactFlash(this.x, this.y, 45, '#FFFFFF');
        spawnSparks(this.x, this.y, 22, '#F59E0B');
        triggerGlobalScreenShake(12, 16);
        const reassembleSnd = cfg.sounds?.contractReassemble || 'Assets/Sound Effects/Skills/enhance.mp3';
        const reassembleVol = cfg.soundVolumes?.contractReassemble ?? 0.85;
        audioSystem.playSFX(reassembleSnd, reassembleVol);
        spawnFloatingText(this.x, this.y - 32, `+${targetHp} (REGENERATED)`, '#10B981');

        // Play Makima Revert Voiceline (randomly selects from configured revert voicelines)
        const revertSounds = cfg.sounds?.revertVoicelines || (cfg.sounds?.revertVoiceline ? [cfg.sounds.revertVoiceline] : [
          'Assets/Sound Effects/Skills/makima-revert-voiceline.mp3',
          'Assets/Sound Effects/Skills/makima-revert-voiceline2.mp3',
          'Assets/Sound Effects/Skills/makima-revert-voiceline3.mp3'
        ]);
        const revertVoiceChance = cfg.soundChances?.revertVoiceline ?? 1.0;
        if (revertSounds && revertSounds.length > 0 && Math.random() < revertVoiceChance) {
          const selectedRevertVoice = revertSounds[Math.floor(Math.random() * revertSounds.length)];
          const revertVoiceVol = cfg.soundVolumes?.revertVoicelines ?? cfg.soundVolumes?.revertVoiceline ?? 3.5;
          if (typeof audioSystem.playFighterVoiceline === 'function') {
            audioSystem.playFighterVoiceline(this, selectedRevertVoice, revertVoiceVol);
          } else {
            audioSystem.playSFX(selectedRevertVoice, revertVoiceVol);
          }
        }

        // Radial compressional repel shockwave pushing nearby attackers away
        const repelR = (typeof CONFIG !== 'undefined' && CONFIG.makima?.citizenShockwaveRadius) ? CONFIG.makima.citizenShockwaveRadius : 150;
        const kbForce = (typeof CONFIG !== 'undefined' && CONFIG.makima?.citizenShockwaveKnockback) ? CONFIG.makima.citizenShockwaveKnockback : 24;
        const allTargets = this._getAllValidTargets();
        for (let t of allTargets) {
          const d = Math.hypot(t.x - this.x, t.y - this.y);
          if (d < repelR && d > 0) {
            const nx = (t.x - this.x) / d;
            const ny = (t.y - this.y) / d;
            t.knockbackVx = nx * kbForce;
            t.knockbackVy = ny * kbForce;
            applyDamageToTarget(t, 15, this, 'shockwave');
          }
        }
      }
      return; // Early return while in stasis
    }

    // ── 2. RULE 1: MANDATORY TIMESTOP, FREEZE & STUN EARLY EXIT ──
    const isFrozen = this._handleTimeStop ? this._handleTimeStop() : (this.timeStopTimer > 0 || this.freezeTimer > 0);
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    if (this.hp <= 0) return;

    // ── 3. ANIMATION & COOLDOWN TIMERS ──
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.slashSwingTimer > 0) this.slashSwingTimer--;
    if (this.punchAnimTimer <= 0 && this.slashSwingTimer <= 0) {
      this.isShooting = false;
    }
    if (this.chainThrowAnimTimer > 0) {
      this.chainThrowAnimTimer--;
      if (this.chainThrowAnimTimer <= 0) {
        this.isThrowingChain = false;
        this.chainLockedAimAngle = null;
      }
    }
    if (this.isThrowingChain && this.chainLockedAimAngle !== undefined && this.chainLockedAimAngle !== null) {
      this.gunAngle = this.chainLockedAimAngle;
      this.angle = this.chainLockedAimAngle;
    }
    if (!this.skillManager || !this.skillManager.hasSkill('bang')) {
      if (this.bangCooldown > 0) this.bangCooldown--;
    }
    if (!this.skillManager || !this.skillManager.hasSkill('chains')) {
      if (!this.isChainingActive && !this.isPreparingChain && !this.isThrowingChain && this.chainsCooldown > 0) {
        this.chainsCooldown--;
      }
    }
    if (!this.skillManager || !this.skillManager.hasSkill('angel_spear')) {
      if (!this.isSummoningSpear && this.angelCooldown > 0) this.angelCooldown--;
    }
    if (!this.skillManager || !this.skillManager.hasSkill('shrine_ritual')) {
      if (!this.isExecutingRitual && this.shrineCooldown > 0) this.shrineCooldown--;
    }

    // Update active visual beams
    for (let i = this.activeBangBeams.length - 1; i >= 0; i--) {
      const beam = this.activeBangBeams[i];
      beam.life--;
      if (beam.life <= 0) this.activeBangBeams.splice(i, 1);
    }

    // Update active missed chain shots (dynamically anchored to Makima as she moves)
    for (let i = this.activeMissedChains.length - 1; i >= 0; i--) {
      const mc = this.activeMissedChains[i];
      mc.life--;
      const chainAngle = (mc.angle !== undefined && mc.angle !== null) ? mc.angle : (this.gunAngle || 0);
      const origin = getMakimaChainOrigin(this, chainAngle);
      mc.startX = origin.x;
      mc.startY = origin.y;
      mc.endX = mc.startX + Math.cos(chainAngle) * (mc.range || 420);
      mc.endY = mc.startY + Math.sin(chainAngle) * (mc.range || 420);
      if (mc.life <= 0) this.activeMissedChains.splice(i, 1);
    }

    // Update active in-flight spears and holy cross explosions
    this._updateActiveSpears();
    this._updateActiveHolyExplosions();

    // ── 4. SKILL CHANNEL EXECUTION ──
    if (this.isExecutingRitual) {
      this._updateKyotoShrineRitual();
      return;
    }

    if (this.isSummoningSpear) {
      this._updateAngelSpearSummon();
      return;
    }

    if (this.isPreparingChain) {
      this._updateChainWindup();
      return;
    }

    if (this.isThrowingChain || (this.chainThrowAnimTimer && this.chainThrowAnimTimer > 0)) {
      this.vx = 0;
      this.vy = 0;
      if (this.isChainingActive) {
        this._updateChainsOfDomination();
      }
      return;
    }

    if (this.isChainingActive) {
      this._updateChainsOfDomination();
    }

    // ── 5. STANDARD FIGHTER PHYSICS & MOVEMENT ──
    super.update(opponent, fi, arena);

    // ── 6. AI COMBAT & TARGET ACQUISITION ──
    const target = this._acquirePrimaryTarget(opponent);
    if (target) {
      if (this.canAim()) {
        this.aim(target);
      }

      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
      const dist = Math.hypot(target.x - this.x, target.y - this.y);

      // A. Ultimate: Kyoto Shrine Ritual Check (Config Toggle: enableUltimate / enableShrine)
      const enableUlt = cfg.enableUltimate ?? cfg.enableShrine ?? cfg.enableShrineRitual ?? true;
      if (enableUlt && this.shrineCooldown <= 0 && (target.hp <= target.maxHp * 0.45 || this.hp <= this.maxHp * 0.50)) {
        this._castKyotoShrineRitual(target);
        return;
      }

      // B. Skill 2: Angel's Armory (1000-Year Spear) Check (Config Toggle: enableSkill2 / enableAngelArmory)
      const enableSkill2 = cfg.enableSkill2 ?? cfg.enableAngel ?? cfg.enableAngelArmory ?? cfg.enableThousandYearSpear ?? true;
      if (enableSkill2 && this.angelCooldown <= 0 && dist <= 600) {
        this._castAngelArmory(target);
        return;
      }

      // C. Skill 1: Chains of Domination Check (Config Toggle: enableSkill1 / enableChains)
      const enableSkill1 = cfg.enableSkill1 ?? cfg.enableChains ?? cfg.enableChainsOfDomination ?? true;
      if (enableSkill1 && this.chainsCooldown <= 0 && dist <= 420 && !this.isChainingActive && !this.isPreparingChain && !this.isThrowingChain) {
        this._prepareChainsOfDomination(target);
        return;
      }

      // D. Primary Attack: "Bang!" (Triggered immediately whenever CD is up along current aim direction)
      const enableBang = cfg.enableBang ?? cfg.bangEnabled ?? true;
      if (enableBang && this.bangCooldown <= 0 && dist <= (cfg.bangRange || 1600)) {
        this._castBangAttack(target);
      }
    }

    this.updateWallBounceCheck();
  }

  /**
   * Acquires the nearest valid enemy entity (Fighters & Illusions per Rule 6).
   */
  _acquirePrimaryTarget(fallbackOpponent) {
    let bestTarget = fallbackOpponent;
    let bestDist = fallbackOpponent ? Math.hypot(fallbackOpponent.x - this.x, fallbackOpponent.y - this.y) : Infinity;

    const allEntities = [];
    if (state.fighters) allEntities.push(...state.fighters);
    if (state.illusions) allEntities.push(...state.illusions);

    for (let e of allEntities) {
      if (!e || e === this || e.isDead || e.hp <= 0) continue;
      // Skip if this minion/summon is already subjugated/owned by Makima
      if ((e.isIllusion || e.isClone || e.isRika || e.type === 'turret') && (e.owner === this || e._makimaChainer === this)) continue;
      // Skip teammates
      if (typeof state.getFighterTeam === 'function') {
        const rootEntity = e.owner || e;
        const myTeam = state.getFighterTeam(state.fighters?.indexOf(this));
        const otherTeam = state.getFighterTeam(state.fighters?.indexOf(rootEntity));
        if (myTeam !== null && myTeam !== undefined && otherTeam !== null && otherTeam !== undefined && myTeam === otherTeam) continue;
      }
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < bestDist) {
        bestDist = d;
        bestTarget = e;
      }
    }
    return bestTarget;
  }

  /**
   * Passive: Contract with the Prime Minister.
   * Intercepts fatal blows, shatters body, consumes 1 citizen stock, and magnetically reassembles with 50% HP.
   */
  takeDamage(amount, attacker, opts = {}) {
    if (this.isRevivingFromContract || this.isShatterReviving) {
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      if (typeof this._shatterLockedX === 'number' && typeof this._shatterLockedY === 'number') {
        this.x = this._shatterLockedX;
        this.y = this._shatterLockedY;
      }
      return false;
    }

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
    const enablePassive = cfg.enableCitizenContract ?? cfg.enablePassive ?? cfg.citizenContractEnabled ?? true;

    // 20% flat damage reduction while citizen lives remain (if passive is enabled)
    const hasDamageReduction = enablePassive && this.citizenLives > 0;
    const effectiveAmount = hasDamageReduction ? amount * 0.80 : amount;

    if (this.hp - effectiveAmount <= 0) {
      if (enablePassive && this.citizenLives > 0) {
        // ── 1. CONSUME 1 CITIZEN LIFE & ENTER DEATH SHATTER STATE ──
        this.citizenLives--;
        this.hp = 0; // Empty HP bar at the moment of shattering!
        this._shatterLockedX = this.x;
        this._shatterLockedY = this.y;
        this.isRevivingFromContract = true;
        this.isShatterReviving = true;
        this.reviveStasisMax = (typeof CONFIG !== 'undefined' && CONFIG.makima?.citizenReviveDurationFrames) ? CONFIG.makima.citizenReviveDurationFrames : 75;
        this.reviveStasisTimer = this.reviveStasisMax;
        this.vx = 0;
        this.vy = 0;
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        this.isTargetOfAmbush = false;
        this.timeStopTimer = 0;
        this.freezeTimer = 0;
        this.paralyzeTimer = 0;
        this.hitStunTimer = 0;
        this.isParalyzed = false;
        this.isParalyzedByMahito = false;
        this.isParalyzedByMahoraga = false;
        this._soulDisfigurementStacks = 0;
        this._soulDisfigurementTimer = 0;
        this.caughtInGenosFlurry = false;
        this.caughtInJohnWickCombo = false;
        this.electricStunTimer = 0;
        this.stunTimer = 0;
        this.knockbackStunTimer = 0;
        this.dubstepStunTimer = 0;
        this.ratioHitPauseTimer = 0;
        if (this.statusEffects) {
          this.statusEffects.timeStopTimer = 0;
          this.statusEffects.paralyzeTimer = 0;
          this.statusEffects.isParalyzed = false;
        }
        delete this._timeStopOriginalDuration;
        delete this._timeStopStartTime;
        delete this._timeStopFrozenAngle;
        delete this._timeStopFrozenGunAngle;
        this.interruptAttacks(true);

        // Initialize shattered pieces for magnetic reassembly animation
        this._initShatteredPieces();

        // ── 2. NATURAL ANGLE PHYSICS BLOOD SHATTER & CITIZEN TRANSFER FX ──
        const impactAngle = (attacker && typeof attacker.x === 'number')
          ? Math.atan2(this.y - attacker.y, this.x - attacker.x)
          : (opts && opts.angle !== undefined ? opts.angle : null);
        spawnMakimaBloodShatter(this, { angle: impactAngle });
        spawnSparks(this.x, this.y, 26, '#F59E0B');
        spawnImpactFlash(this.x, this.y, '#FFFFFF', 40);
        triggerGlobalScreenShake(14, 20);

        // Audio: Deep flesh impact + heavy cinematic bass hit
        const shatterSnd = cfg.sounds?.contractShatter || 'Assets/Sound Effects/Attacks/fleshhit.mp3';
        const shatterVol = cfg.soundVolumes?.contractShatter ?? 0.95;
        audioSystem.playSFX(shatterSnd, shatterVol);

        const smashSnd = cfg.sounds?.contractSmash || 'Assets/Sound Effects/Skills/rubbick-groundsmash.mp3';
        const smashVol = cfg.soundVolumes?.contractSmash ?? 0.85;
        audioSystem.playSFX(smashSnd, smashVol);

        // Floating texts for sacrificial citizen contract
        spawnFloatingText(this.x, this.y - 50, 'PRIME MINISTER CONTRACT', '#F59E0B');
        const remLivesText = this.citizenLives === 1 ? '1 LIFE LEFT' : `${this.citizenLives} LIVES LEFT`;
        spawnFloatingText(this.x, this.y - 28, `-1 CITIZEN SACRIFICED (${remLivesText})`, '#A31D24');
        return true;
      } else {
        // No citizen lives left: Makima dies normally with natural angle blood shatter
        this._shatterLockedX = this.x;
        this._shatterLockedY = this.y;
        this.vx = 0;
        this.vy = 0;
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        const impactAngle = (attacker && typeof attacker.x === 'number')
          ? Math.atan2(this.y - attacker.y, this.x - attacker.x)
          : (opts && opts.angle !== undefined ? opts.angle : null);
        spawnMakimaBloodShatter(this, { angle: impactAngle });
        return super.takeDamage(effectiveAmount, attacker, opts);
      }
    }

    return super.takeDamage(effectiveAmount, attacker, opts);
  }

  /**
   * Universal knockback handler override.
   * Completely ignores knockback impulses during citizen contract death shatter or death.
   */
  applyKnockback(vx, vy, stunFrames = 0) {
    if (this.isRevivingFromContract || this.isShatterReviving || (this.shatteredPieces && this.shatteredPieces.length > 0) || this.isDead || this.dead || this.hp <= 0) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.vx = 0;
      this.vy = 0;
      if (typeof this._shatterLockedX === 'number' && typeof this._shatterLockedY === 'number') {
        this.x = this._shatterLockedX;
        this.y = this._shatterLockedY;
      }
      return;
    }
    super.applyKnockback(vx, vy, stunFrames);
  }

  /**
   * Primary Attack: "Bang!" (Lightning-Fast Full-Screen Invisible Beam)
   * A full-screen invisible supersonic kinetic shockwave shot from her finger.
   * Deals massive knockback, pierces through all enemies, and vaporizes all enemy projectiles in its path.
   */
  _castBangAttack(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
    this.bangCooldown = this.bangCooldownMax;
    this.shootCooldown = this.shootCooldownMax || this.bangCooldownMax;
    this.punchAnimTimer = this.punchMaxTime;
    this.slashSwingTimer = this.slashSwingMaxTimer;
    this.isShooting = true;

    // When chaining an enemy, use free-angle aim; otherwise strict cardinal (Up, Down, Left, Right)
    const aimTarget = target || (typeof this._acquirePrimaryTarget === 'function' ? this._acquirePrimaryTarget() : null);
    let angle;
    if (this.isChainingActive && this.chainedTargets && this.chainedTargets.length > 0) {
      // Free-angle: use current gunAngle which was set by aim() tracking the target
      angle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
    } else {
      const cardinalAngle = this._getCardinalAngle(aimTarget);
      angle = cardinalAngle;
    }
    this.gunAngle = angle;
    this.angle = angle;
    const range = cfg.bangRange || 1600;
    const beamW = cfg.bangBeamWidth || 32;

    const startX = this.x + Math.cos(angle) * (this.r + 16);
    const startY = this.y + Math.sin(angle) * (this.r + 16);
    const endX = startX + Math.cos(angle) * range;
    const endY = startY + Math.sin(angle) * range;

    // Register active visual beam for invisible supersonic air distortion
    this.activeBangBeams.push({
      startX, startY, endX, endY,
      angle,
      range,
      width: beamW,
      life: 10,
      maxLife: 10
    });

    // Audio SFX: High-caliber crisp gunshot "Bang!"
    const gunshotSnd = cfg.sounds?.bangGunshot || 'Assets/Sound Effects/Skills/makima-bang.mp3';
    const gunshotVol = cfg.soundVolumes?.bangGunshot ?? 1.50;
    audioSystem.playSFX(gunshotSnd, gunshotVol);

    // Kinetic muzzle shockwave & screen shake
    triggerGlobalScreenShake(8, 12);
    spawnSparks(startX, startY, '#F59E0B', 12);
    spawnImpactFlash(startX, startY, '#FFFFFF', 20);

    // ── 1. PROJECTILE PIERCING: Destroy / Vaporize all enemy projectiles along the beam line ──
    const allProjectiles = [];
    if (state.projectiles) allProjectiles.push(...state.projectiles);
    for (let p of allProjectiles) {
      if (!p || p.isDead || (p.life !== undefined && p.life <= 0)) continue;
      // Skip Makima's own projectiles / skills
      if (p.owner === this || (p.ownerFighter && p.ownerFighter === this)) continue;
      if (typeof state.getFighterTeam === 'function' && p.owner !== undefined) {
        const myTeam = state.getFighterTeam(state.fighters?.indexOf(this));
        const projTeam = state.getFighterTeam(p.owner);
        if (myTeam !== null && myTeam !== undefined && projTeam !== null && projTeam !== undefined && myTeam === projTeam) continue;
      }

      const projRadius = p.r || p.radius || 8;
      if (this._isPointNearLineSegment(p.x, p.y, startX, startY, endX, endY, projRadius + beamW * 0.5)) {
        p.life = 0;
        p.isDead = true;
        if (typeof p.destroy === 'function') p.destroy();
        spawnSparks(p.x, p.y, '#F59E0B', 6);
        spawnImpactFlash(p.x, p.y, '#FFFFFF', 14);
      }
    }

    // ── 2. ENEMY & ILLUSION PIERCING: Massive knockback + direct damage (Rule 6 & Rule 15) ──
    const targets = this._getAllValidTargets();
    for (let t of targets) {
      if (this._isPointNearLineSegment(t.x, t.y, startX, startY, endX, endY, t.r + beamW * 0.5)) {
        const directDmg = cfg.bangDamage || 34;
        const damageDealt = applyDamageToTarget(t, directDmg, this, {
          isProjectile: true,
          isRanged: true,
          isBang: true,
          isDirect: true,
          damageAngle: angle
        });

        // ONLY apply knockback, wall-pin, blood, and hit effects if the attack connected and was NOT dodged / parried!
        if (damageDealt) {
          // Apply massive directional knockback (Rule 15 physics)
          const kbForce = cfg.bangKnockbackForce || 46;
          t.knockbackVx = Math.cos(angle) * kbForce;
          t.knockbackVy = Math.sin(angle) * kbForce;
          t.isWallPinnedByMakima = true;
          t.isCurrentlyWallPinnedByMakima = false;
          t.preventKnockbackBounce = true;
          t.makimaKnockbackWindow = 35;
          t._makimaAttacker = this;

          spawnBloodEffect(t, 18, angle, { color: '#880000' });
          spawnImpactFlash(t.x, t.y, '#F59E0B', 26);
          spawnFloatingText('BANG!', t.x, t.y - 28, '#F59E0B', 18);
        }
      }
    }
  }

  /**
   * Enters the "about to throw chain" anticipation/windup state.
   * Stops movement and rotates aim to the enemy during chain preparation before throwing.
   */
  _prepareChainsOfDomination(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
    const windupFrames = cfg.chainsWindupFrames !== undefined ? cfg.chainsWindupFrames : 14;

    // If windup is explicitly set to 0, cast immediately
    if (windupFrames <= 0) {
      this._castChainsOfDomination(target);
      return;
    }

    this.isPreparingChain = true;
    this.isAboutToThrowChain = true;
    this.chainWindupMax = windupFrames;
    this.chainWindupTimer = windupFrames;
    this.chainTarget = target;
    this.vx = 0;
    this.vy = 0;

    // Movement stop -> aim rotates towards the enemy target
    if (target && this.canAim()) {
      this.aim(target);
    }

    // Audio SFX: Metallic chain links rattling before throw
    const rattleSnd = cfg.sounds?.chainsRattle || 'Assets/Sound Effects/Skills/hookchain.mp3';
    const rattleVol = cfg.soundVolumes?.chainsRattle ?? 0.70;
    audioSystem.playSFX(rattleSnd, rattleVol);

    // Visual cue: Cursed sparks at hand
    const angle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
    const startX = this.x + Math.cos(angle) * (this.r * 1.05);
    const startY = this.y + Math.sin(angle) * (this.r * 1.05);
    spawnSparks(startX, startY, 8, '#F59E0B');
  }

  /**
   * Updates the pre-throw chain windup state.
   * Stops movement and rotates aim to track the enemy target before throwing.
   */
  _updateChainWindup() {
    this.chainWindupTimer--;

    // Movement stop: stationary during windup
    this.vx = 0;
    this.vy = 0;

    // Aim rotates to the enemy target
    if (this.chainTarget && this.canAim()) {
      this.aim(this.chainTarget);
    }

    // Subtle cursed energy spark pulsation during windup
    if (this.chainWindupTimer % 4 === 0) {
      const angle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
      const px = this.x + Math.cos(angle) * (this.r * 1.05);
      const py = this.y + Math.sin(angle) * (this.r * 1.05);
      spawnSparks(px, py, 3, '#F59E0B');
    }

    // Windup completed: unleash the chain along the aimed angle!
    if (this.chainWindupTimer <= 0) {
      this.isPreparingChain = false;
      this.isAboutToThrowChain = false;
      this._castChainsOfDomination(this.chainTarget);
    }
  }

  /**
   * Helper: Determines if a target entity currently has active summons, companions (e.g. Rika),
   * illusions/clones, or living teammates.
   */
  _targetHasAlliesOrMinions(t) {
    if (!t) return false;
    // 0. Check if t is an illusion/companion/summon with an owner (owner is an ally!)
    if (t.owner && t.owner !== t && t.owner.hp > 0 && !t.owner.isDead) return true;
    // 1. Check companion/summon (Rika on Yuta)
    if (t.rika && t.rika.active && t.rika.hp > 0 && !t.rika.isDying) return true;
    // 2. Check illusions/clones/turrets owned by t
    if (state.illusions && state.illusions.some(ill => ill && ill.owner === t && ill.hp > 0 && !ill.isDying)) return true;
    // 3. Check living teammates in team modes (2v2, 1v2)
    if (typeof state.getFighterTeam === 'function' && state.fighters) {
      const rootFighter = t.owner || t;
      const tIdx = state.fighters.indexOf(rootFighter);
      const tTeam = tIdx >= 0 ? state.getFighterTeam(tIdx) : null;
      if (tTeam !== null && tTeam !== undefined) {
        for (let i = 0; i < state.fighters.length; i++) {
          if (i === tIdx) continue;
          const other = state.fighters[i];
          const otherTeam = state.getFighterTeam(i);
          if (other && other.hp > 0 && !other.isDead && otherTeam !== null && otherTeam !== undefined && otherTeam === tTeam) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /** Restores a chained summon to its original owner when domination ends. */
  _releaseChainedTarget(target) {
    if (!target) return;
    target.isChainedByMakima = false;
    target.isMindControlledByMakima = false;
    target._makimaChainer = null;
    target.timeStopTimer = 0;
    target.suppressFreezeOverlay = false;
    delete target._suppressFreezeTimer;
    delete target._timeStopFrozenAngle;
    delete target._timeStopFrozenGunAngle;

    if (target.characterId === 'gojo' || target.type === 'gojo') {
      target.infinityActive = true;
      target.infinityCooldown = 0;
      target.infinityFadeOpacity = 1.0;
    }

    if (Object.prototype.hasOwnProperty.call(target, '_makimaOriginalOwner')) {
      target.owner = target._makimaOriginalOwner;
      delete target._makimaOriginalOwner;
    }
    if (Object.prototype.hasOwnProperty.call(target, '_makimaOriginalColor')) {
      target.color = target._makimaOriginalColor;
      delete target._makimaOriginalColor;
    }
  }

  /** Makes a directly chained illusion or summon (like Rika) fight for Makima until the chain breaks. */
  _subjugateMinion(target) {
    if (!target || !(target.isIllusion || target.isClone || target.type === 'turret' || target.isRika)) return;
    if (!Object.prototype.hasOwnProperty.call(target, '_makimaOriginalOwner')) {
      target._makimaOriginalOwner = target.owner;
      target._makimaOriginalColor = target.color;
    }
    target.owner = this;
    target.color = '#A31D24';
  }

  /**
   * Skill 1: Chains of Domination (Shihai no Kusari)
   */
  _castChainsOfDomination(primaryTarget) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
    this.chainMaxTimer = cfg.chainsDuration || cfg.chainsDurationFrames || cfg.chainsStasisFrames || this.chainMaxTimer || 240;
    this.chainsCooldown = this.chainsCooldownMax;
    this.chainedTargets = [];
    this.isPreparingChain = false;
    this.isAboutToThrowChain = false;
    this.chainWindupTimer = 0;
    this.vx = 0;
    this.vy = 0;

    const range = cfg.chainsRange || 420;
    const chainWidth = cfg.chainsWidth || 48;
    const initialDamage = cfg.chainsDamage || 24;

    const chainsSpeedInfo = resolveMakimaChainsSpeed(cfg, range);
    this.chainsThrowSpeed = chainsSpeedInfo.throwSpeed;
    const launchFrames = chainsSpeedInfo.launchFrames;
    this.chainsLaunchFrames = launchFrames;

    this.isThrowingChain = true;
    this.chainThrowAnimMax = Math.max(16, launchFrames + 12);
    this.chainThrowAnimTimer = this.chainThrowAnimMax;

    // Release along current aimed angle, then lock angle during throw animation
    const throwAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
    this.chainLockedAimAngle = throwAngle;
    this.gunAngle = throwAngle;
    this.angle = throwAngle;
    const origin = getMakimaChainOrigin(this, throwAngle);
    const startX = origin.x;
    const startY = origin.y;
    const endX = startX + Math.cos(throwAngle) * range;
    const endY = startY + Math.sin(throwAngle) * range;

    // SFX: Sharp metallic chain whip rattle + deep demonic gravity pull hum from config
    const hookSnd = cfg.sounds?.chainsHook || 'Assets/Sound Effects/Skills/hookchain.mp3';
    const hookVol = cfg.soundVolumes?.chainsHook ?? 0.90;
    audioSystem.playSFX(hookSnd, hookVol);

    const gravSnd = cfg.sounds?.chainsGravity || 'Assets/Sound Effects/Skills/gravitypull.mp3';
    const gravVol = cfg.soundVolumes?.chainsGravity ?? 0.65;
    audioSystem.playSFX(gravSnd, gravVol);

    // Casting shockwave & sparks at Makima
    triggerGlobalScreenShake(7, 12);
    spawnSparks(this.x, this.y, 16, '#F59E0B');
    spawnImpactFlash(this.x, this.y, '#F59E0B', 28);

    // Check collision along the thrown chain corridor (Rule 6: fighters & illusions)
    const allTargets = this._getAllValidTargets();
    for (let t of allTargets) {
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (d <= range + (t.r || 25) && this._isPointNearLineSegment(t.x, t.y, startX, startY, endX, endY, (t.r || 25) + chainWidth * 0.5)) {
        this.chainedTargets.push(t);
        t.isChainedByMakima = true;
        t._makimaChainer = this;
        t.suppressFreezeOverlay = true;
        t._suppressFreezeTimer = true;

        if (t.characterId === 'gojo' || t.type === 'gojo') {
          t.infinityActive = false;
          t.infinityFadeOpacity = 0;
          t.infinityBlockTimer = 0;
        }

        // Force-cancel any active channeling / skill the target was doing
        if (typeof t.interruptAttacks === 'function') {
          t.interruptAttacks(true);
        }

        const hasAllies = this._targetHasAlliesOrMinions(t);
        if (hasAllies) {
          // Mind Control Puppetry: Victim is NOT frozen in time-stop; they are mind-controlled to attack their allies/minions!
          t.isMindControlledByMakima = true;
          t.timeStopTimer = 0;
          delete t._timeStopFrozenAngle;
          delete t._timeStopFrozenGunAngle;
          if (t.rika) t.rika.timeStopTimer = 0;
          if (t.owner) t.owner.timeStopTimer = 0;
          if (state.illusions) {
            state.illusions.forEach(ill => {
              if (ill && (ill.owner === t || ill === t.rika || (t.owner && ill.owner === t.owner))) ill.timeStopTimer = 0;
            });
          }
          spawnFloatingText('MIND CONTROLLED!', t.x, t.y - 42, '#F59E0B', 16);
        } else {
          // Subjugation Stasis (Solo 1v1 without summons/allies): apply hit-pause exclusively to target per Rule 5!
          t.isMindControlledByMakima = false;
          if (typeof t.applyTimeStop === 'function') {
            t.applyTimeStop(this.chainMaxTimer);
          }
          delete t._timeStopFrozenAngle;
          delete t._timeStopFrozenGunAngle;
        }

        if (t.isRika) {
          t.isMindControlledByMakima = true;
          t.timeStopTimer = 0;
          t.hitStunTimer = 0;
          t.paralyzeTimer = 0;
          t.isParalyzedByMahoraga = false;
        }

        // Allow target to aim immediately
        const aimAngle = Math.atan2(this.y - t.y, this.x - t.x);
        if (typeof t.applyAim === 'function') {
          t.applyAim(this, aimAngle);
        } else if (typeof t.aim === 'function') {
          t.aim(this);
        } else {
          t.gunAngle = aimAngle;
          t.angle = aimAngle;
        }

        applyDamageToTarget(t, initialDamage, this, 'curse');
        spawnSparks(t.x, t.y, 14, '#A31D24');
        spawnImpactFlash(t.x, t.y, '#F59E0B', 26);
        spawnFloatingText('KNEEL', t.x, t.y - 28, '#A31D24', 15);

        // Subjugate illusions / clones / Rika to fight for Makima
        if (t.isIllusion || t.isClone || t.type === 'turret' || t.isRika) {
          this._subjugateMinion(t);
          spawnFloatingText('SUBJUGATED', t.x, t.y - 42, '#F59E0B', 14);
        }
      }
    }

    if (this.chainedTargets.length > 0) {
      this.isChainingActive = true;
      this.chainTimer = this.chainMaxTimer;
      spawnFloatingText('DOMINATION CHAINS', this.x, this.y - 38, '#F59E0B', 16);

      // Play Makima Chain Voiceline ONLY when at least one enemy is successfully chained
      const chainSounds = cfg.sounds?.chainVoicelines || (cfg.sounds?.chainVoiceline ? [cfg.sounds.chainVoiceline] : [
        'Assets/Sound Effects/Skills/makima-chain-voiceline1.mp3',
        'Assets/Sound Effects/Skills/makima-chain-voiceline2.mp3',
        'Assets/Sound Effects/Skills/makima-chain-voiceline3.mp3',
        'Assets/Sound Effects/Skills/makima-chain-voiceline4.mp3'
      ]);
      const voiceChance = cfg.soundChances?.chainVoiceline ?? 1.0;
      if (chainSounds && chainSounds.length > 0 && Math.random() < voiceChance) {
        const selectedVoice = chainSounds[Math.floor(Math.random() * chainSounds.length)];
        const voiceVol = cfg.soundVolumes?.chainVoicelines ?? cfg.soundVolumes?.chainVoiceline ?? 3.5;
        if (typeof audioSystem.playFighterVoiceline === 'function') {
          audioSystem.playFighterVoiceline(this, selectedVoice, voiceVol);
        } else {
          audioSystem.playSFX(selectedVoice, voiceVol);
        }
      }
    } else {
      // Chain missed! Thrown along aim line without snapping or binding
      this.isChainingActive = false;
      this.chainTimer = 0;
      spawnFloatingText('MISSED', this.x, this.y - 38, '#94A3B8', 14);
      const missLife = Math.max(12, launchFrames + 10);
      this.activeMissedChains.push({
        startX,
        startY,
        endX,
        endY,
        angle: throwAngle,
        range,
        launchFrames,
        life: missLife,
        maxLife: missLife
      });
    }
  }

  _updateChainsOfDomination() {
    this.chainTimer--;
    if (this.chainTimer <= 0) {
      this.isChainingActive = false;
      this.chainsCooldown = this.chainsCooldownMax;
      for (let t of this.chainedTargets) {
        if (t) {
          this._releaseChainedTarget(t);
          if (!t.isDead && (t.hp === undefined || t.hp > 0)) {
            spawnSparks(t.x, t.y, 8, '#F59E0B');
            spawnImpactFlash(t.x, t.y, '#FFFFFF', 18);
          }
        }
      }
      this.chainedTargets = [];
      return;
    }

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
    const pullSpeed = cfg.chainsPullSpeed || 11.5;
    const minDistance = cfg.chainsMinDistance || cfg.chainsTetherDistance || 100;

    // Pull tethered enemies toward Makima (stopping at minDistance so they don't get too close)
    for (let i = this.chainedTargets.length - 1; i >= 0; i--) {
      const t = this.chainedTargets[i];
      if (!t || t.isDead || (t.hp !== undefined && t.hp <= 0)) {
        if (t) {
          this._releaseChainedTarget(t);
        }
        this.chainedTargets.splice(i, 1);
        continue;
      }

      t.isChainedByMakima = true;
      t._makimaChainer = this;
      t.suppressFreezeOverlay = true;
      t._suppressFreezeTimer = true;

      if (t.characterId === 'gojo' || t.type === 'gojo') {
        t.infinityActive = false;
        t.infinityFadeOpacity = 0;
        t.infinityBlockTimer = 0;
      }

      // Dynamic Mind-Control Transition: If summons/minions/allies emerge mid-chain, release stasis
      const hasAllies = this._targetHasAlliesOrMinions(t);
      if (hasAllies) {
        t.isMindControlledByMakima = true;
        t.timeStopTimer = 0;
        delete t._timeStopFrozenAngle;
        delete t._timeStopFrozenGunAngle;
        if (t.rika) t.rika.timeStopTimer = 0;
        if (t.owner) t.owner.timeStopTimer = 0;
        if (state.illusions) {
          state.illusions.forEach(ill => {
            if (ill && (ill.owner === t || ill === t.rika || (t.owner && ill.owner === t.owner))) ill.timeStopTimer = 0;
          });
        }
      }

      const dx = this.x - t.x;
      const dy = this.y - t.y;
      const dist = Math.hypot(dx, dy);

      const isMindControlled = Boolean(t.isMindControlledByMakima || t.isRika || t._makimaOriginalOwner);

      // ── CHAIN BREAK DISTANCE CHECK ──
      // If the enemy gets knocked back beyond break distance, the chain snaps and breaks!
      // (Mind-controlled minions and summons stay tethered across the arena while attacking their former master)
      const breakDist = cfg.chainsBreakDistance || cfg.chainsMaxDistance || 380;
      if (!isMindControlled && dist >= breakDist) {
        // Spawn dramatic explosive Chain Break Shatter animation & SFX
        spawnMakimaChainBreakEffect(this, t);

        this._releaseChainedTarget(t);

        this.chainedTargets.splice(i, 1);
        continue;
      }

      // Check if target is actively being knocked back (allow knockback to fling them away)
      const isKnockedBack = t.knockbackVx !== undefined && (Math.abs(t.knockbackVx) > 0.5 || Math.abs(t.knockbackVy) > 0.5);

      if (isKnockedBack) {
        t.x += t.knockbackVx;
        t.y += t.knockbackVy;
        t.knockbackVx *= 0.90;
        t.knockbackVy *= 0.90;

        const currentDist = Math.hypot(this.x - t.x, this.y - t.y);
        if (!isMindControlled && currentDist >= breakDist) {
          spawnMakimaChainBreakEffect(this, t);
          this._releaseChainedTarget(t);
          this.chainedTargets.splice(i, 1);
          continue;
        }
      } else if (!isMindControlled) {
        // Reel the enemy in smoothly up to minDistance (only for non-mind-controlled solo targets)
        const curDx = this.x - t.x;
        const curDy = this.y - t.y;
        const curDist = Math.hypot(curDx, curDy);
        if (curDist > minDistance && curDist > 0.001) {
          const step = Math.min(pullSpeed, curDist - minDistance);
          t.x += (curDx / curDist) * step;
          t.y += (curDy / curDist) * step;
        }
      }

      // Allow enemy to rotate their aim (do not lock aim rotation)
      if (typeof t.aim === 'function' && !t.isMindControlledByMakima) {
        t.aim(this);
      }

      // Arena boundary safety
      if (state.arena) {
        const tr = t.r || 25;
        t.x = Math.max(state.arena.x + tr, Math.min(state.arena.x + state.arena.width - tr, t.x));
        t.y = Math.max(state.arena.y + tr, Math.min(state.arena.y + state.arena.height - tr, t.y));
      }
    }

    if (this.chainedTargets.length === 0) {
      this.isChainingActive = false;
      this.chainTimer = 0;
      this.chainsCooldown = this.chainsCooldownMax;
      return;
    }
  }

  /**
   * Skill 2: Angel's Armory (1000-Year Life-Span Spear / Sen-nen no Yari)
   * Channels for 50 frames (~0.83s) to summon the colossal golden Angel Devil spear above her,
   * then launches it with supersonic speed to detonate into a 160px Radiant Golden Holy Cross Pillar.
   */
  _castAngelArmory(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
    this.angelCooldown = this.angelCooldownMax;
    this.isSummoningSpear = true;
    this.spearMaxTimer = cfg.thousandYearSpearChannelFrames || 50;
    this.spearTimer = this.spearMaxTimer;
    this.spearTarget = target;
    this.vx = 0;
    this.vy = 0;

    // Snapshot locked launch trajectory once at cast start (NO auto-aim tracking during channel)
    const startX = this.x;
    const startY = this.y - 75;
    let initialAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
    let targetDist = 550;

    if (target && !target.isDead) {
      initialAngle = Math.atan2(target.y - startY, target.x - startX);
      targetDist = Math.max(180, Math.hypot(target.x - startX, target.y - startY));
    }

    this.spearLaunchAngle = initialAngle;
    this.spearLaunchDist = targetDist;
    this.gunAngle = initialAngle;
    this.angle = initialAngle;

    // Visual & Audio summon activation cues
    spawnFloatingText('1000-YEAR SPEAR', this.x, this.y - 45, '#F59E0B', 16);
    triggerGlobalScreenShake(6, 10);
    spawnSparks(this.x, this.y - 75, 14, '#F59E0B');
    spawnImpactFlash(this.x, this.y - 75, '#FFFFFF', 28);

    const summonSnd = cfg.sounds?.spearSummon || 'Assets/Sound Effects/Skills/woosh.mp3';
    const summonVol = cfg.soundVolumes?.spearSummon ?? 0.85;
    audioSystem.playSFX(summonSnd, summonVol);
  }

  _updateAngelSpearSummon() {
    this.spearTimer--;
    this.vx = 0;
    this.vy = 0;

    // Lock aim angle during entire channel duration (NO live auto-aim rotation)
    if (this.spearLaunchAngle !== undefined) {
      this.gunAngle = this.spearLaunchAngle;
      this.angle = this.spearLaunchAngle;
    }

    // Summoning channel completed: Launch the supersonic 1000-Year Spear in locked direction (NO auto-aim snap on fire)
    if (this.spearTimer <= 0) {
      this.isSummoningSpear = false;

      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
      const startX = this.x;
      const startY = this.y - 75;
      const launchAngle = this.spearLaunchAngle !== undefined ? this.spearLaunchAngle : (this.gunAngle || 0);
      const targetDist = this.spearLaunchDist || 550;
      const targetX = startX + Math.cos(launchAngle) * targetDist;
      const targetY = startY + Math.sin(launchAngle) * targetDist;
      const launchSpeed = 26.0;

      // Register active in-flight spear projectile
      this.activeSpears.push({
        x: startX,
        y: startY,
        startX,
        startY,
        targetX,
        targetY,
        target: null, // projectile travels along initial trajectory without homing or snapping
        angle: launchAngle,
        speed: launchSpeed,
        vx: Math.cos(launchAngle) * launchSpeed,
        vy: Math.sin(launchAngle) * launchSpeed,
        traveled: 0,
        maxDist: Math.max(180, targetDist + 60),
        trail: [],
        life: 90
      });

      // Launch screen shake, muzzle sparks, and whoosh SFX
      triggerGlobalScreenShake(8, 14);
      spawnSparks(startX, startY, 18, '#F59E0B');
      spawnImpactFlash(startX, startY, '#FFFFFF', 32);

      const summonSnd = cfg.sounds?.spearSummon || 'Assets/Sound Effects/Skills/woosh.mp3';
      const summonVol = (cfg.soundVolumes?.spearSummon ?? 0.85) * 1.25;
      audioSystem.playSFX(summonSnd, summonVol);
    }
  }

  /**
   * Updates in-flight 1000-Year Spear projectiles across the arena.
   */
  _updateActiveSpears() {
    if (!this.activeSpears || this.activeSpears.length === 0) return;

    const allTargets = this._getAllValidTargets();

    for (let i = this.activeSpears.length - 1; i >= 0; i--) {
      const spear = this.activeSpears[i];
      if (!spear || spear.life <= 0) {
        this.activeSpears.splice(i, 1);
        continue;
      }

      // Record trail points for supersonic golden plasma ribbon
      spear.trail.unshift({ x: spear.x, y: spear.y });
      if (spear.trail.length > 12) spear.trail.pop();

      // Move spear along velocity vector
      spear.x += spear.vx;
      spear.y += spear.vy;
      spear.traveled += spear.speed;
      spear.life--;

      let hasDetonated = false;

      // Check collision with any valid enemy entity (fighters & illusions per Rule 6)
      for (let t of allTargets) {
        if (!t || t.isDead || (t.hp !== undefined && t.hp <= 0)) continue;
        const tr = t.r || 25;
        const d = Math.hypot(t.x - spear.x, t.y - spear.y);
        if (d <= tr + 24) {
          this._triggerHolyCrossImpact(spear.x, spear.y);
          hasDetonated = true;
          break;
        }
      }

      // Reached destination or arena boundary
      if (!hasDetonated) {
        if (spear.traveled >= spear.maxDist || spear.life <= 0) {
          this._triggerHolyCrossImpact(spear.x, spear.y);
          hasDetonated = true;
        } else if (state.arena) {
          const ax = state.arena.x;
          const ay = state.arena.y;
          const aw = state.arena.width;
          const ah = state.arena.height;
          if (spear.x <= ax || spear.x >= ax + aw || spear.y <= ay || spear.y >= ay + ah) {
            this._triggerHolyCrossImpact(spear.x, spear.y);
            hasDetonated = true;
          }
        }
      }

      if (hasDetonated) {
        this.activeSpears.splice(i, 1);
      }
    }
  }

  /**
   * Triggers the Radiant Golden Holy Cross Impact Detonation (160px AOE True Damage).
   */
  _triggerHolyCrossImpact(impactX, impactY) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
    const explRadius = cfg.thousandYearSpearRadius || 160;
    const spearDmg = cfg.thousandYearSpearDamage || 140;
    const kbForce = 18;

    // Register active Holy Cross Explosion visual
    this.activeHolyExplosions.push({
      x: impactX,
      y: impactY,
      life: 32,
      maxLife: 32,
      radius: explRadius
    });

    // Screen shake, brilliant flash, and sacred spark burst
    triggerGlobalScreenShake(16, 22);
    spawnImpactFlash(impactX, impactY, '#FFFFFF', 65);
    spawnSparks(impactX, impactY, 28, '#F59E0B');
    spawnSparks(impactX, impactY, 14, '#FFFFFF');

    // Audio SFX: Heavy sacred bass explosion hit
    const explosionSnd = cfg.sounds?.spearExplosion || 'Assets/Sound Effects/Attacks/explosion.mp3';
    const explosionVol = cfg.soundVolumes?.spearExplosion ?? 1.00;
    audioSystem.playSFX(explosionSnd, explosionVol);

    // 1000-Year Spear True Damage & Explosive Physical Knockback (Rule 6 & Rule 15 compliant)
    const allTargets = this._getAllValidTargets();
    for (let t of allTargets) {
      if (!t || t.isDead || (t.hp !== undefined && t.hp <= 0)) continue;
      const d = Math.hypot(t.x - impactX, t.y - impactY);
      if (d <= explRadius) {
        // Proximity scaling: full damage within 70% radius, min 75% at boundary
        const proxFactor = Math.max(0.75, 1.0 - (d / explRadius) * 0.25);
        const effDmg = Math.round(spearDmg * proxFactor);
        applyDamageToTarget(t, effDmg, this, 'true');

        // Directional explosive physical knockback (Rule 15)
        const nx = d > 1 ? (t.x - impactX) / d : 1;
        const ny = d > 1 ? (t.y - impactY) / d : 0;
        t.knockbackVx = nx * kbForce;
        t.knockbackVy = ny * kbForce;

        spawnBloodEffect(t, 24, Math.atan2(ny, nx), { color: '#880000' });
        spawnImpactFlash(t.x, t.y, '#F59E0B', 30);
      }
    }

    spawnFloatingText('1000-YEAR SPEAR', impactX, impactY - 45, '#F59E0B', 20);
    spawnFloatingText('TRUE DAMAGE', impactX, impactY - 22, '#FFFFFF', 15);
  }

  /**
   * Updates life timers of active Holy Cross Explosions.
   */
  _updateActiveHolyExplosions() {
    if (!this.activeHolyExplosions || this.activeHolyExplosions.length === 0) return;

    for (let i = this.activeHolyExplosions.length - 1; i >= 0; i--) {
      const expl = this.activeHolyExplosions[i];
      expl.life--;
      if (expl.life <= 0) {
        this.activeHolyExplosions.splice(i, 1);
      }
    }
  }

  /**
   * Ultimate: Kyoto Shrine Ritual (Sacrificial Compression Splatter)
   */
  _castKyotoShrineRitual(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
    this.shrineCooldown = this.shrineCooldownMax;
    this.isExecutingRitual = true;
    this.ritualTimer = this.ritualMaxTimer;
    this.ritualTarget = target;
    this.ritualStage = 1;

    // Lock all enemies in ritual stasis (Rule 5 compliant: freeze target only!)
    const allTargets = this._getAllValidTargets();
    for (let t of allTargets) {
      if (typeof t.applyTimeStop === 'function') {
        t.applyTimeStop(this.ritualMaxTimer);
      }
    }

    spawnFloatingText(this.x, this.y - 40, 'SHRINE COMPRESSION RITUAL', '#A31D24');
    triggerGlobalScreenShake(8, 16);

    const ritualSnd = cfg.sounds?.shrineRitual || 'Assets/Sound Effects/Skills/shrine.mp3';
    const ritualVol = cfg.soundVolumes?.shrineRitual ?? 1.20;
    audioSystem.playSFX(ritualSnd, ritualVol);
  }

  _updateKyotoShrineRitual() {
    this.ritualTimer--;

    // Final Stage: Squeeze & Meat Flattening Impact
    if (this.ritualTimer <= 15 && this.ritualStage === 1) {
      this.ritualStage = 2;
      if (this.ritualTarget && !this.ritualTarget.isDead) {
        const t = this.ritualTarget;
        const maxHp = t.maxHp || 400;
        const executeDmg = Math.round(maxHp * 0.45 + 280);

        const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
        applyDamageToTarget(t, executeDmg, this, 'true');
        spawnBloodEffect(t, 45, null, { color: '#770000' });
        spawnImpactFlash(t.x, t.y, 60, '#A31D24');
        triggerGlobalScreenShake(20, 30);

        const splatterSnd = cfg.sounds?.shrineSplatter || 'Assets/Sound Effects/Attacks/groundSmash.mp3';
        const splatterVol = cfg.soundVolumes?.shrineSplatter ?? 1.30;
        audioSystem.playSFX(splatterSnd, splatterVol);

        if (t.hp <= 0 || t.hp <= maxHp * 0.25) {
          t.hp = 0;
          t.isDead = true;
          spawnFloatingText(t.x, t.y - 30, 'COMPRESSED', '#880000');
        }
      }
    }

    if (this.ritualTimer <= 0) {
      this.isExecutingRitual = false;
      this.ritualTarget = null;
      this.ritualStage = 0;
    }
  }

  /**
   * Direct Wall-Pin Collision & Wall-Stick Damage Engine (Rule 15)
   * Prevents enemy rebounce upon wall collision and sticks targets firmly to the wall for 1.5 seconds.
   */
  updateWallBounceCheck() {
    const arena = state.arena || { x: 0, y: 0, width: state.canvas ? state.canvas.width : 1200, height: state.canvas ? state.canvas.height : 700 };

    const allTargets = this._getAllValidTargets();
    for (let t of allTargets) {
      if (!t || t.isDead || t.hp <= 0) continue;

      const tRadius = t.r || 25;
      const minX = arena.x + tRadius;
      const maxX = arena.x + arena.width - tRadius;
      const minY = arena.y + tRadius;
      const maxY = arena.y + arena.height - tRadius;

      // Handle non-fighter entities (such as illusions) that hit the wall while knocked back
      if (t.isWallPinnedByMakima && !t.isCurrentlyWallPinnedByMakima) {
        const kbSpeed = Math.hypot(t.knockbackVx || 0, t.knockbackVy || 0);
        if (kbSpeed <= 0.1) {
          t.isWallPinnedByMakima = false;
          t.preventKnockbackBounce = false;
          t._makimaAttacker = null;
          continue;
        }

        const hitLeft = (t.x <= minX + 5);
        const hitRight = (t.x >= maxX - 5);
        const hitTop = (t.y <= minY + 5);
        const hitBottom = (t.y >= maxY - 5);

        if (hitLeft || hitRight || hitTop || hitBottom) {
          if (typeof t._triggerMakimaWallPin === 'function') {
            t._triggerMakimaWallPin(arena);
          } else {
            t.isWallPinnedByMakima = false;
            t.isCurrentlyWallPinnedByMakima = true;
            t.preventKnockbackBounce = true;
            t._makimaAttacker = null;
            t.vx = 0;
            t.vy = 0;
            t.knockbackVx = 0;
            t.knockbackVy = 0;
            const pinDuration = CONFIG.makima?.wallPinDurationFrames ?? 90;
            t.makimaWallPinTimer = pinDuration;
            if (typeof t.applyTimeStop === 'function') t.applyTimeStop(pinDuration);
            else t.hitStunTimer = pinDuration;
            if (typeof t.interruptAttacks === 'function') t.interruptAttacks(true);
            const wallDmg = CONFIG.makima?.bangWallBounceDamage || 22;
            applyDamageToTarget(t, wallDmg, this, 'impact');
            spawnImpactFlash(t.x, t.y, '#F59E0B', 30);
            spawnBloodEffect(t, 22, null, { color: '#880000' });
            spawnSparks(t.x, t.y, 14, '#F59E0B');
            triggerGlobalScreenShake(14, 16);
            spawnFloatingText('WALL PINNED!', t.x, t.y - 25, '#F59E0B', 18);
            const wallPinSnd = CONFIG.makima?.sounds?.bangWallPin || 'Assets/Sound Effects/Attacks/groundSmash.mp3';
            const wallPinVol = CONFIG.makima?.soundVolumes?.bangWallPin ?? 0.85;
            audioSystem.playSFX(wallPinSnd, wallPinVol);
          }
        }
      }

      // Enforce wall pin clamping while pinned
      if (t.isCurrentlyWallPinnedByMakima) {
        if (t.makimaWallPinTimer > 0) {
          t.vx = 0;
          t.vy = 0;
          t.knockbackVx = 0;
          t.knockbackVy = 0;
          t.preventKnockbackBounce = true;
          t.x = Math.max(minX, Math.min(maxX, t.x));
          t.y = Math.max(minY, Math.min(maxY, t.y));
        } else {
          t.isCurrentlyWallPinnedByMakima = false;
          t.preventKnockbackBounce = false;
          t.suppressFreezeOverlay = false;
        }
      }
    }
  }

  /**
   * Authoritative Zoner AI Spacing.
   */
  _updateControlZonerMovement(target) {
    if (!target) return;
    const dist = Math.hypot(target.x - this.x, target.y - this.y);
    const desiredDist = 280; // Ideal spacing for Bang! and Chains

    if (dist < desiredDist - 40) {
      // Step back authoritatively
      const nx = (this.x - target.x) / dist;
      const ny = (this.y - target.y) / dist;
      this.x += nx * (this.speed * 0.85);
      this.y += ny * (this.speed * 0.85);
    } else if (dist > desiredDist + 80) {
      // Advance steadily
      const nx = (target.x - this.x) / dist;
      const ny = (target.y - this.y) / dist;
      this.x += nx * (this.speed * 0.65);
      this.y += ny * (this.speed * 0.65);
    }
  }

  _getAllValidTargets() {
    const list = [];
    const allEntities = [];
    if (state.fighters) allEntities.push(...state.fighters);
    if (state.illusions) allEntities.push(...state.illusions);

    for (let e of allEntities) {
      if (!e || e === this || e.isDead || e.hp <= 0) continue;
      // Skip if this minion/summon is already subjugated/owned by Makima
      if ((e.isIllusion || e.isClone || e.isRika || e.type === 'turret') && (e.owner === this || e._makimaChainer === this)) continue;
      if (typeof state.getFighterTeam === 'function') {
        const rootEntity = e.owner || e;
        const myTeam = state.getFighterTeam(state.fighters?.indexOf(this));
        const otherTeam = state.getFighterTeam(state.fighters?.indexOf(rootEntity));
        if (myTeam !== null && myTeam !== undefined && otherTeam !== null && otherTeam !== undefined && myTeam === otherTeam) continue;
      }
      list.push(e);
    }
    return list;
  }

  _isPointNearLineSegment(px, py, x1, y1, x2, y2, threshold) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1) <= threshold;
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    return Math.hypot(px - projX, py - projY) <= threshold;
  }

  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks(forceCancelAll);

    // Cancel and hide active Bang shooting animation & kinetic beams
    this.punchAnimTimer = 0;
    this.slashSwingTimer = 0;
    this.isShooting = false;
    this.activeBangBeams = [];

    // Cancel and hide active chain windup / throwing animations
    this.isPreparingChain = false;
    this.isAboutToThrowChain = false;
    this.chainWindupTimer = 0;
    this.chainLockedAimAngle = null;
    this.isThrowingChain = false;
    this.chainThrowAnimTimer = 0;
    this.activeMissedChains = [];

    if (this.chainedTargets) {
      for (let t of this.chainedTargets) {
        this._releaseChainedTarget(t);
      }
      this.chainedTargets = [];
    }
    this.isChainingActive = false;

    if (forceCancelAll) {
      if (this.isSummoningSpear) {
        this.isSummoningSpear = false;
        this.spearTimer = 0;
        this.spearTarget = null;
      }
      if (this.isExecutingRitual) {
        this.isExecutingRitual = false;
        this.ritualTimer = 0;
        this.ritualTarget = null;
        this.ritualStage = 0;
      }
    }
  }

  /**
   * Main Fighter Draw Loop.
   */
  draw(ctx) {
    const isSuppressed = Boolean(
      this.isTargetOfAmbush || 
      (typeof this.areAttackEffectsSuppressed === 'function' && this.areAttackEffectsSuppressed())
    );

    // 1. Draw Active "Bang!" Invisible Supersonic Beam & Kinetic Air Distortion (Rule 11 Zero shadowBlur)
    // Hidden when Makima is stunned or movement-stopped
    if (!isSuppressed && this.activeBangBeams && this.activeBangBeams.length > 0) {
      for (let beam of this.activeBangBeams) {
        const alpha = (beam.life / beam.maxLife);
        ctx.save();

        // Translucent Supersonic Mach Rings expanding along beam path
        const ringSpacing = 120;
        const totalRings = Math.floor((beam.range || 1600) / ringSpacing);
        const ringRadius = (1.0 - alpha) * 26 + 6;

        ctx.lineWidth = 1.5;
        for (let i = 1; i < totalRings; i++) {
          const ringX = beam.startX + Math.cos(beam.angle) * (i * ringSpacing);
          const ringY = beam.startY + Math.sin(beam.angle) * (i * ringSpacing);

          // Subtle Optical Shockwave Rings (Expanding Kinetic Vacuum)
          ctx.strokeStyle = `rgba(245, 158, 11, ${(alpha * 0.35).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(ringX, ringY, ringRadius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.50).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(ringX, ringY, ringRadius * 0.55, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Faint Atmospheric Air Vacuum Corridor (Subtle Invisible Beam)
        ctx.strokeStyle = `rgba(163, 29, 36, ${(alpha * 0.22).toFixed(3)})`;
        ctx.lineWidth = beam.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(beam.startX, beam.startY);
        ctx.lineTo(beam.endX, beam.endY);
        ctx.stroke();

        // Sharp Supersonic Filament Streak (Thin White Kinetic Tracer)
        ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.75).toFixed(3)})`;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(beam.startX, beam.startY);
        ctx.lineTo(beam.endX, beam.endY);
        ctx.stroke();

        // Muzzle Conical Shockwave at Fingertip
        const muzzleR = (1.0 - alpha) * 34 + 8;
        ctx.strokeStyle = `rgba(245, 158, 11, ${(alpha * 0.75).toFixed(3)})`;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(beam.startX, beam.startY, muzzleR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }
    }

    // 2. Draw Radiant Golden Holy Cross Explosions (Impact Detonations)
    for (let expl of this.activeHolyExplosions) {
      drawMakimaHolyCrossExplosion(ctx, expl);
    }

    // 3. Draw In-Flight 1000-Year Holy Spear Projectiles
    for (let spear of this.activeSpears) {
      drawMakimaAngelSpearFlight(ctx, spear);
    }

    // 4. Draw 1000-Year Holy Spear Summoning Overhead
    if (this.isSummoningSpear && !isSuppressed) {
      drawMakimaAngelSpearSummon(ctx, this);
    }

    // 5. Draw Makima Body, Hair, Uniform & Hands (with both hands in front)
    drawMakimaSkin(ctx, this);

    // 6. Draw Active Chains of Domination (Shihai no Kusari) streaming in front from the left hand
    // Hidden when Makima is stunned or movement-stopped
    if (!isSuppressed) {
      if (this.isChainingActive && this.chainedTargets && this.chainedTargets.length > 0) {
        drawMakimaChainsOfDomination(ctx, this);
      }
      if (this.activeMissedChains && this.activeMissedChains.length > 0) {
        drawMakimaMissedChains(ctx, this);
      }
    }

    // 7. Draw Explosive Chain Break Shard Animations & Particle Debris
    drawMakimaChainBreakEffects(ctx);

    // 8. Draw Health HUD & Freeze Timers
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }

  onFrozenSkillDurationTick(isInsideGojoDomain) {
    if (this.isChainingActive && this.chainTimer <= 0) {
      this.isChainingActive = false;
      this.chainsCooldown = this.chainsCooldownMax;
      for (let t of this.chainedTargets) {
        if (t) {
          this._releaseChainedTarget(t);
          if (!t.isDead && (t.hp === undefined || t.hp > 0)) {
            if (typeof spawnSparks === 'function') spawnSparks(t.x, t.y, 8, '#F59E0B');
            if (typeof spawnImpactFlash === 'function') spawnImpactFlash(t.x, t.y, '#FFFFFF', 18);
          }
        }
      }
      this.chainedTargets = [];
    }
  }
}

