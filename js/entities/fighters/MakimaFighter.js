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
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
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
    this.bangCooldownMax = cfg.bangCooldown || 44;
    this.bangCooldown = this.bangCooldownMax;
    this.activeBangBeams = [];

    // Aiming & Turn Rate (Controlled Aim Rotation — No Instant Snap Auto-Aim)
    this.aimTurnRate = cfg.aimTurnRate || 0.055;
    this.aimAlignmentThreshold = cfg.aimAlignmentThreshold || 0.18;

    // Skill 1: Chains of Domination (Shihai no Kusari)
    this.chainsCooldownMax = cfg.chainsCooldown || 540;
    this.chainsCooldown = this.chainsCooldownMax;
    this.isChainingActive = false;
    this.chainTimer = 0;
    this.chainMaxTimer = cfg.chainsStasisFrames || 72;
    this.chainedTargets = [];

    // Skill 2: Angel's Armory (1000-Year Holy Spear)
    this.angelCooldownMax = cfg.angelCooldown || 810;
    this.angelCooldown = this.angelCooldownMax;
    this.isSummoningSpear = false;
    this.spearTimer = 0;
    this.spearMaxTimer = cfg.thousandYearSpearChannelFrames || 50;
    this.activeHalberds = [];

    // Ultimate: Kyoto Shrine Ritual: Gravitational Splatter
    this.shrineCooldownMax = cfg.shrineCooldown || 1920;
    this.shrineCooldown = this.shrineCooldownMax;
    this.isExecutingRitual = false;
    this.ritualTimer = 0;
    this.ritualMaxTimer = cfg.shrineChannelFrames || 110;
    this.ritualTarget = null;
    this.ritualStage = 0;
  }

  reset() {
    super.reset();
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
    this.citizenLives = this.citizenLivesMax || 5;
    this.isRevivingFromContract = false;
    this.isShatterReviving = false;
    this.reviveStasisTimer = 0;
    this.shatteredPieces = null;
    this.punchAnimTimer = 0;
    this.slashSwingTimer = 0;
    this.bangCooldown = cfg.bangCooldown || 44;
    this.chainsCooldown = cfg.chainsCooldown || 540;
    this.angelCooldown = cfg.angelCooldown || 810;
    this.shrineCooldown = cfg.shrineCooldown || 1920;
    this.isChainingActive = false;
    this.chainTimer = 0;
    this.chainedTargets = [];
    this.isSummoningSpear = false;
    this.spearTimer = 0;
    this.activeHalberds = [];
    this.isExecutingRitual = false;
    this.ritualTimer = 0;
    this.ritualTarget = null;
    this.activeBangBeams = [];
    this.aimTurnRate = cfg.aimTurnRate || 0.055;
    this.aimAlignmentThreshold = cfg.aimAlignmentThreshold || 0.18;
  }

  isStationarySkillActive() {
    return Boolean(this.isExecutingRitual || this.isSummoningSpear || this.isRevivingFromContract || this.isShatterReviving || super.isStationarySkillActive?.());
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
    if (this.isExecutingRitual || this.isSummoningSpear || this.isRevivingFromContract || this.isShatterReviving || this.isChainingActive) return false;
    return super.canPerformBasicAttack ? super.canPerformBasicAttack() : true;
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
   * Overrides base Fighter.shoot() to trigger Makima's "Bang!" basic attack.
   */
  shoot(ownerIndex) {
    if (!this.canPerformBasicAttack()) return false;
    this._castBangAttack();
    return true;
  }

  /**
   * Main Fighter Update Loop.
   * Adheres strictly to Rule 1 (TimeStop Freeze Guard) and Rule 5.
   */
  update(opponent, fi, arena) {
    // ── 1. RULE 1: MANDATORY TIMESTOP & FREEZE EARLY EXIT ──
    const isFrozen = this._handleTimeStop ? this._handleTimeStop() : (this.timeStopTimer > 0 || this.freezeTimer > 0);
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // ── 2. CITIZEN CONTRACT SHATTER & REASSEMBLY STASIS HANDLING ──
    if (this.isRevivingFromContract || this.isShatterReviving) {
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
        this.hp = targetHp;

        // Radiant reassembly flash & audio burst
        spawnImpactFlash(this.x, this.y, '#FFFFFF', 45);
        spawnSparks(this.x, this.y, 22, '#F59E0B');
        triggerGlobalScreenShake(12, 16);
        audioSystem.playSFX('Assets/Sound Effects/Skills/enhance.mp3', 0.85);
        spawnFloatingText('REGENERATED (50% HP)', this.x, this.y - 32, '#10B981', 16);

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

    if (this.hp <= 0) return;

    // ── 3. ANIMATION TIMERS ──
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.slashSwingTimer > 0) this.slashSwingTimer--;
    if (this.punchAnimTimer <= 0 && this.slashSwingTimer <= 0) {
      this.isShooting = false;
    }
    if (this.bangCooldown > 0) this.bangCooldown--;
    if (this.chainsCooldown > 0) this.chainsCooldown--;
    if (this.angelCooldown > 0) this.angelCooldown--;
    if (this.shrineCooldown > 0) this.shrineCooldown--;

    // Update active visual beams
    for (let i = this.activeBangBeams.length - 1; i >= 0; i--) {
      const beam = this.activeBangBeams[i];
      beam.life--;
      if (beam.life <= 0) this.activeBangBeams.splice(i, 1);
    }

    // ── 4. SKILL CHANNEL EXECUTION ──
    if (this.isExecutingRitual) {
      this._updateKyotoShrineRitual();
      return;
    }

    if (this.isSummoningSpear) {
      this._updateAngelSpearSummon();
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
      this.aim(target);

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
      if (enableSkill1 && this.chainsCooldown <= 0 && dist <= 420 && !this.isChainingActive) {
        this._castChainsOfDomination(target);
        return;
      }

      // D. Primary Attack: "Bang!" (Config Toggle: enableBang / bangEnabled)
      const enableBang = cfg.enableBang ?? cfg.bangEnabled ?? true;
      if (enableBang && this.bangCooldown <= 0 && dist <= 1600) {
        if (this.isAimAlignedWithTarget(target)) {
          this._castBangAttack(target);
        }
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
      // Skip teammates
      if (typeof state.getFighterTeam === 'function') {
        const myTeam = state.getFighterTeam(state.fighters?.indexOf(this));
        const otherTeam = state.getFighterTeam(state.fighters?.indexOf(e));
        if (myTeam !== null && myTeam === otherTeam) continue;
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
    if (this.isRevivingFromContract || this.isShatterReviving) return false;

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
        this.isRevivingFromContract = true;
        this.isShatterReviving = true;
        this.reviveStasisMax = (typeof CONFIG !== 'undefined' && CONFIG.makima?.citizenReviveDurationFrames) ? CONFIG.makima.citizenReviveDurationFrames : 75;
        this.reviveStasisTimer = this.reviveStasisMax;
        this.vx = 0;
        this.vy = 0;
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        this.interruptAttacks(true);

        // Initialize shattered pieces for magnetic reassembly animation
        this._initShatteredPieces();

        // ── 2. SACRIFICIAL BLOOD SPLATTER & CITIZEN TRANSFER FX ──
        spawnBloodEffect(this.x, this.y, 42, '#880000');
        spawnSparks(this.x, this.y, 26, '#F59E0B');
        spawnImpactFlash(this.x, this.y, '#FFFFFF', 40);
        triggerGlobalScreenShake(14, 20);

        // Audio: Deep flesh impact + heavy cinematic bass hit
        audioSystem.playSFX('attack_fleshhit', 0.95);
        audioSystem.playSFX('Assets/Sound Effects/Skills/rubbick-groundsmash.mp3', 0.85);

        // Floating texts for sacrificial citizen contract
        spawnFloatingText('PRIME MINISTER CONTRACT', this.x, this.y - 50, '#F59E0B', 18);
        const remLivesText = this.citizenLives === 1 ? '1 LIFE LEFT' : `${this.citizenLives} LIVES LEFT`;
        spawnFloatingText(`-1 CITIZEN SACRIFICED (${remLivesText})`, this.x, this.y - 28, '#A31D24', 15);
        return true;
      } else {
        // No citizen lives left: Makima dies normally
        return super.takeDamage(effectiveAmount, attacker, opts);
      }
    }

    return super.takeDamage(effectiveAmount, attacker, opts);
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

    const angle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
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
    audioSystem.playSFX('Assets/Sound Effects/Attacks/desert-eagle-fire.mp3', 0.75);

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
        if (myTeam !== null && myTeam === projTeam) continue;
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
        applyDamageToTarget(t, directDmg, this, 'kinetic');

        // Apply massive directional knockback (Rule 15 physics)
        const kbForce = cfg.bangKnockbackForce || 46;
        t.knockbackVx = Math.cos(angle) * kbForce;
        t.knockbackVy = Math.sin(angle) * kbForce;
        t.isWallPinnedByMakima = true;
        t.isCurrentlyWallPinnedByMakima = false;
        t.preventKnockbackBounce = true;
        t.makimaKnockbackWindow = 35;
        t._makimaAttacker = this;

        spawnBloodEffect(t.x, t.y, 18, '#880000');
        spawnImpactFlash(t.x, t.y, '#F59E0B', 26);
        spawnFloatingText('BANG!', t.x, t.y - 28, '#F59E0B', 18);
      }
    }
  }

  /**
   * Skill 1: Chains of Domination (Shihai no Kusari)
   */
  _castChainsOfDomination(primaryTarget) {
    this.chainsCooldown = this.chainsCooldownMax;
    this.isChainingActive = true;
    this.chainTimer = this.chainMaxTimer;
    this.chainedTargets = [];

    const allTargets = this._getAllValidTargets();
    for (let t of allTargets) {
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (d <= 420) {
        this.chainedTargets.push(t);

        // Apply hit-pause exclusively to target per Rule 5!
        if (typeof t.applyTimeStop === 'function') {
          t.applyTimeStop(this.chainMaxTimer);
        }

        applyDamageToTarget(t, 24, this, 'curse');
        spawnFloatingText('KNEEL', t.x, t.y - 28, '#A31D24', 15);

        // Subjugate illusions / clones to fight for Makima
        if (t.isIllusion || t.isClone || t.type === 'turret') {
          t.owner = this;
          t.color = '#A31D24';
          spawnFloatingText('SUBJUGATED', t.x, t.y - 42, '#F59E0B', 14);
        }
      }
    }
  }

  _updateChainsOfDomination() {
    this.chainTimer--;
    if (this.chainTimer <= 0) {
      this.isChainingActive = false;
      this.chainedTargets = [];
      return;
    }

    // Pull tethered enemies toward Makima and apply bleed
    for (let t of this.chainedTargets) {
      if (!t || t.isDead || t.hp <= 0) continue;
      const dx = this.x - t.x;
      const dy = this.y - t.y;
      const dist = Math.hypot(dx, dy);

      if (dist > this.r + t.r + 15) {
        const pullSpeed = 10.5;
        t.x += (dx / dist) * pullSpeed;
        t.y += (dy / dist) * pullSpeed;
      }

      // Bleed tick every 15 frames
      if (this.chainTimer % 15 === 0) {
        applyDamageToTarget(t, 4, this, 'bleed');
        spawnBloodEffect(t.x, t.y, 4, '#8B0000');
      }
    }
  }

  /**
   * Skill 2: Angel's Armory (1000-Year Holy Spear)
   */
  _castAngelArmory(target) {
    this.angelCooldown = this.angelCooldownMax;
    this.isSummoningSpear = true;
    this.spearTimer = this.spearMaxTimer;
    this.spearTarget = target;
    spawnFloatingText('1000-YEAR SPEAR', this.x, this.y - 35, '#F59E0B', 16);
  }

  _updateAngelSpearSummon() {
    this.spearTimer--;

    // Charge completed: Launch the 1000-Year Spear
    if (this.spearTimer <= 0) {
      this.isSummoningSpear = false;
      if (this.spearTarget && !this.spearTarget.isDead) {
        const tx = this.spearTarget.x;
        const ty = this.spearTarget.y;

        triggerGlobalScreenShake(14, 20);
        spawnImpactFlash(tx, ty, '#FFFFFF', 45);
        spawnSparks(tx, ty, '#F59E0B', 24);

        // 1000-Year Spear True Damage Impact
        const allTargets = this._getAllValidTargets();
        for (let t of allTargets) {
          const d = Math.hypot(t.x - tx, t.y - ty);
          if (d <= 150) {
            applyDamageToTarget(t, 135, this, 'true');
            t.knockbackVx = ((t.x - tx) || 1) * 16;
            t.knockbackVy = ((t.y - ty) || 1) * 16;
            spawnBloodEffect(t.x, t.y, 22, '#A31D24');
          }
        }
      }
    }
  }

  /**
   * Ultimate: Kyoto Shrine Ritual (Sacrificial Compression Splatter)
   */
  _castKyotoShrineRitual(target) {
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

    spawnFloatingText('SHRINE COMPRESSION RITUAL', this.x, this.y - 40, '#A31D24', 18);
    triggerGlobalScreenShake(8, 16);
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

        applyDamageToTarget(t, executeDmg, this, 'true');
        spawnBloodEffect(t.x, t.y, 45, '#770000');
        spawnImpactFlash(t.x, t.y, '#A31D24', 60);
        triggerGlobalScreenShake(20, 30);

        if (t.hp <= 0 || t.hp <= maxHp * 0.25) {
          t.hp = 0;
          t.isDead = true;
          spawnFloatingText('COMPRESSED', t.x, t.y - 30, '#880000', 20);
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
            spawnBloodEffect(t.x, t.y, 22, '#880000');
            spawnSparks(t.x, t.y, 14, '#F59E0B');
            triggerGlobalScreenShake(14, 16);
            spawnFloatingText('WALL PINNED!', t.x, t.y - 25, '#F59E0B', 18);
            audioSystem.playSFX('Assets/Sound Effects/Attacks/groundSmash.mp3', 0.85);
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
      if (typeof state.getFighterTeam === 'function') {
        const myTeam = state.getFighterTeam(state.fighters?.indexOf(this));
        const otherTeam = state.getFighterTeam(state.fighters?.indexOf(e));
        if (myTeam !== null && myTeam === otherTeam) continue;
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
    this.citizenLives = this.citizenLivesMax;
    this.isRevivingFromContract = false;
    this.isShatterReviving = false;
    this.reviveStasisTimer = 0;
    this.shatteredPieces = null;
    this.bloodParticles = null;
    this.punchAnimTimer = 0;
    this.slashSwingTimer = 0;
    this.isShooting = false;
    this.isSummoningSpear = false;
    this.isChainingActive = false;
  }

  interruptAttacks() {
    this.punchAnimTimer = 0;
    this.slashSwingTimer = 0;
    this.isShooting = false;
    this.isSummoningSpear = false;
    this.isChainingActive = false;
  }

  /**
   * Main Fighter Draw Loop.
   */
  draw(ctx) {
    // 1. Draw Active "Bang!" Invisible Supersonic Beam & Kinetic Air Distortion (Rule 11 Zero shadowBlur)
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

    // 2. Draw Active Chains of Domination Tether Lines
    if (this.isChainingActive && this.chainedTargets) {
      ctx.save();
      for (let t of this.chainedTargets) {
        if (!t || t.isDead) continue;
        const chainProgress = (Date.now() * 0.008);

        ctx.strokeStyle = 'rgba(163, 29, 36, 0.85)';
        ctx.lineWidth = 2.4;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -chainProgress * 12;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();

        // Inner glowing golden link core
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.90)';
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 3. Draw 1000-Year Holy Spear Summoning Overhead
    if (this.isSummoningSpear) {
      const chargePct = 1.0 - (this.spearTimer / this.spearMaxTimer);
      ctx.save();
      ctx.translate(this.x, this.y - 55);

      // Radiant Golden Spear Glyph
      ctx.fillStyle = `rgba(245, 158, 11, ${(chargePct * 0.90).toFixed(3)})`;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -25 * chargePct);
      ctx.lineTo(6 * chargePct, 15 * chargePct);
      ctx.lineTo(0, 10 * chargePct);
      ctx.lineTo(-6 * chargePct, 15 * chargePct);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    // 4. Draw Makima Body, Hair, Uniform & Hands
    drawMakimaSkin(ctx, this);

    // 5. Draw Health HUD & Freeze Timers
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
