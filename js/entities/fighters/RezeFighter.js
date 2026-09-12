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
// - Rule 18 (HUD Theme Consistency: #FF6B1A)
// - Rule 19 & 20 (Fighter Skin & Hand Guards)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { MODE_SETTINGS, MODE_HP_MULTIPLIER } from '../../core/modeConfig.js';
import { drawRezeSkin } from '../../graphics/fighters/rezeSkin.js';
import { drawRezeSpeedLines, drawSparkFlechette, drawRezeDecoy, drawRezePalmBlast, drawRezeMegatonNuke } from '../../graphics/weapons/rezeWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

export class RezeFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'reze';
    this.type = 'reze';
    this.color = '#FF6B1A'; // Tangerine Flame Orange
    this.themeColor = '#FF6B1A';

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};

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
    this.punchMaxTime = cfg.punchAnimDuration || 14;
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 14;
    this.hideFrontHand = false;
    this.hideBackHand = false;
    this.punchComboCount = 0;

    // Passive 1: Hybrid Physiology (Collar Pin Revive)
    this.reviveStocksMax = cfg.maxReviveStocks || 1;
    this.reviveStocks = this.reviveStocksMax;
    this.isHybridModeActive = false;
    this.hybridModeTimer = 0;
    this.hybridModeMaxTimer = cfg.hybridModeDurationFrames || 600;

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

    // Ultimate: Bomb Devil Unleashed (Megaton Tsar Nuke)
    this.nukeCooldownMax = cfg.nukeCooldown || 1500;
    this.nukeCooldown = this.nukeCooldownMax;
    this.isExecutingNuke = false;
    this.nukePhase = 'IDLE'; // 'TRANSFORM' | 'BARRAGE' | 'DIVE' | 'EXPLODE'
    this.nukeTimer = 0;
    this.nukeTarget = null;

    // Visual effect tracking
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
    this.punchAnimTimer = 0;
    this.punchComboCount = 0;
    this.sparkCooldown = this.sparkCooldownMax;
    this.decoyCooldown = this.decoyCooldownMax;
    this.rocketCooldown = this.rocketCooldownMax;
    this.nukeCooldown = this.nukeCooldownMax;
    this.isRocketLunging = false;
    this.isExecutingNuke = false;
    this.nukePhase = 'IDLE';
    this.activeFlechettes = [];
    this.activeDecoys = [];
    this.activePalmBlasts = [];
    this.activeNukeBlasts = [];
  }

  isStationarySkillActive() {
    return Boolean(this.isExecutingNuke || super.isStationarySkillActive?.());
  }

  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks(forceCancelAll);
    this.isRocketLunging = false;
    if (forceCancelAll) {
      this.isExecutingNuke = false;
      this.nukePhase = 'IDLE';
    }
  }

  isEffectivelyAlive() {
    if (this.hp > 0 && !this.isDead) return true;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    if ((cfg.enableCollarPinRevive ?? true) && this.reviveStocks > 0) return true;
    return false;
  }

  /**
   * Main Fighter Update Loop
   */
  update() {
    // 1. Mandatory Rule 1 Freeze Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // 2. Cooldown Decays
    if (this.sparkCooldown > 0) this.sparkCooldown--;
    if (this.decoyCooldown > 0) this.decoyCooldown--;
    if (this.rocketCooldown > 0) this.rocketCooldown--;
    if (this.nukeCooldown > 0) this.nukeCooldown--;

    if (this.punchAnimTimer > 0) this.punchAnimTimer--;

    // 3. Hybrid Mode Duration Timer
    if (this.isHybridModeActive) {
      this.hybridModeTimer--;
      if (this.hybridModeTimer <= 0) {
        this.isHybridModeActive = false;
      }
    }

    // 4. Update Active Effects & Sub-systems
    this._updateSparkFlechettes();
    this._updateDecoys();
    this._updateRocketLunge();
    this._updateMegatonNuke();
    this._updateVisualExplosions();

    // 5. If busy with stationary ultimate or rocket lunge, skip standard steering
    if (this.isExecutingNuke || this.isRocketLunging) {
      return;
    }

    // 6. Base AI & Combat Engine
    const target = this._findBestTarget();
    if (target) {
      this.aim(target);
      this._updateRezeCombatAI(target);
    }

    super.update();
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
    if (this.nukeCooldown <= 0 && (cfg.enableMegatonNuke ?? true) && dist < 350) {
      this._activateMegatonNuke(target);
      return;
    }

    // 2. Mobility: Rocket Lunge
    if (this.rocketCooldown <= 0 && (cfg.enableRocketLunge ?? true) && dist > 140 && dist < 420) {
      this._activateRocketLunge(target);
      return;
    }

    // 3. Primary: Spark Flechette Barrage
    if (this.sparkCooldown <= 0 && (cfg.enableSparkFlechette ?? true) && dist > 80 && dist < 380) {
      this._fireSparkFlechettes(target);
      return;
    }

    // 4. Secondary: Decoy Bomb
    if (this.decoyCooldown <= 0 && (cfg.enableDecoyBomb ?? true) && dist < 220) {
      this._deployDecoyBomb(target);
      return;
    }

    // 5. Basic Attack: Explosive Martial Arts (120° Frontal Arc Melee)
    const punchReach = (this.isHybridModeActive ? 75 : 65);
    if (dist <= punchReach && this.shootCooldown <= 0) {
      this._performExplosivePunch(target);
    }
  }

  /**
   * Basic Attack: Explosive Martial Arts (Rule 7/8 Frontal Arc AOE)
   */
  _performExplosivePunch(primaryTarget) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    this.punchComboCount = (this.punchComboCount + 1) % 3;
    this.punchAnimTimer = this.punchMaxTime;
    this.shootCooldown = this.isHybridModeActive ? 18 : 26;

    const isFinisher = (this.punchComboCount === 0);
    const punchReach = this.isHybridModeActive ? 75 : 65;
    const arcAngle = (120 * Math.PI) / 180; // 120° frontal cone
    const aimAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

    const dmg = isFinisher ? (cfg.punchFinisherDamage || 28) : (cfg.punchDamage || 16);
    const kbForce = isFinisher ? (cfg.punchFinisherKnockback || 32) : 10;

    // Query all targets within 120° frontal arc (Rule 6, 7, 8)
    const targets = this._getEntitiesInFrontalArc(aimAngle, arcAngle, punchReach);

    if (targets.length > 0) {
      if (isFinisher) {
        audioSystem.playSFX('Assets/Sound Effects/Attacks/explosion.mp3', 0.85);
      } else {
        audioSystem.playSFX('Assets/Sound Effects/Attacks/heavypunch1.mp3', 0.55);
      }
    }

    for (let target of targets) {
      applyDamageToTarget(target, dmg, this, true);
      spawnBloodEffect(target.x, target.y);
      spawnSparks(target.x, target.y, isFinisher ? 16 : 8, '#FF6B1A');

      // Knockback physics
      const kbAngle = Math.atan2(target.y - this.y, target.x - this.x);
      target.knockbackVx = Math.cos(kbAngle) * kbForce;
      target.knockbackVy = Math.sin(kbAngle) * kbForce;

      // Rule 5: Hit-pause only on target, never on self!
      if (typeof target.applyTimeStop === 'function') {
        target.applyTimeStop(isFinisher ? 12 : 5);
      }
    }

    if (isFinisher) {
      // Spawn visual palm blast cone
      this.activePalmBlasts.push({
        x: this.x,
        y: this.y,
        angle: aimAngle,
        arc: arcAngle,
        radius: punchReach * 1.3,
        timer: 16,
        maxTimer: 16
      });
      triggerGlobalScreenShake(3.5, 10);
      spawnFloatingText(this.x, this.y - 30, 'SPARK SLAP!', '#FF6B1A');
    }
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
    spawnFloatingText(this.x, this.y - 25, 'DECOY STEP!', '#FF6B1A');
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
   * Mobility Skill: Supersonic Rocket Lunge
   */
  _activateRocketLunge(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    this.rocketCooldown = this.rocketCooldownMax;
    this.isRocketLunging = true;
    this.rocketTimer = cfg.rocketDurationFrames || 24;

    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    const speed = (this.isHybridModeActive ? 34.0 : 28.0);
    this.rocketLungeVx = Math.cos(angle) * speed;
    this.rocketLungeVy = Math.sin(angle) * speed;
    this.gunAngle = angle;

    audioSystem.playSFX(cfg.sounds?.rocketJet || 'Assets/Sound Effects/Skills/genos-dash-noise.mp3', 0.85);
    spawnFloatingText(this.x, this.y - 25, 'ROCKET LUNGE!', '#FF6B1A');
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
        spawnSparks(t.x, t.y, 22, '#FF6B1A');
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
      if (this.x < arena.x + this.r || this.x > arena.x + arena.width - this.r ||
          this.y < arena.y + this.r || this.y > arena.y + arena.height - this.r) {
        this.isRocketLunging = false;
        spawnSparks(this.x, this.y, 18, '#FFE600');
      }
    }

    if (this.rocketTimer <= 0) {
      this.isRocketLunging = false;
    }
  }

  /**
   * Ultimate: Bomb Devil Unleashed — Megaton Tsar Nuke
   */
  _activateMegatonNuke(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    this.nukeCooldown = this.nukeCooldownMax;
    this.isExecutingNuke = true;
    this.nukePhase = 'TRANSFORM';
    this.nukeTimer = cfg.nukeTransformPauseFrames || 35;
    this.nukeTarget = target;

    // Rule 5: Apply hit-pause exclusively to opponents during transformation shockwave
    const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
    for (let t of allTargets) {
      if (t && t !== this && typeof t.applyTimeStop === 'function') {
        t.applyTimeStop(35);
      }
    }

    this.isHybridModeActive = true;
    this.hybridModeTimer = this.hybridModeMaxTimer;

    audioSystem.playSFX(cfg.sounds?.pinPull || 'Assets/Sound Effects/Skills/parry.mp3', 0.95);
    audioSystem.playSFX(cfg.sounds?.nukeCharge || 'Assets/Sound Effects/Skills/genos-ultimatecharging.mp3', 0.85);
    triggerGlobalScreenShake(5.0, 20);
    spawnFloatingText(this.x, this.y - 35, 'MEGATON TSAR NUKE!', '#FF2E00');
  }

  _updateMegatonNuke() {
    if (!this.isExecutingNuke) return;

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    this.nukeTimer--;
    if (this.nukePhase === 'TRANSFORM') {
      if (this.nukeTimer <= 0) {
        this.nukePhase = 'DIVE';
        this.nukeTimer = 20;
        audioSystem.playSFX(cfg.sounds?.nukeDive || 'Assets/Sound Effects/Skills/fugatravel.mp3', 0.85);
      }
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
  takeDamage(damage, source, isMelee, rawDamage) {
    if (this.hp <= damage && this.reviveStocks > 0) {
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
      if (cfg.enableCollarPinRevive ?? true) {
        this.reviveStocks--;
        this.hp = Math.round(this.maxHp * (cfg.reviveHpPercent || 0.50));
        this.isHybridModeActive = true;
        this.hybridModeTimer = this.hybridModeMaxTimer;

        // Trigger radial shockwave
        const shockR = cfg.reviveShockwaveRadius || 140;
        const shockDmg = cfg.reviveShockwaveDamage || 40;
        const shockKb = cfg.reviveShockwaveKnockback || 28;

        audioSystem.playSFX(cfg.sounds?.pinPull || 'Assets/Sound Effects/Skills/parry.mp3', 0.95);
        audioSystem.playSFX(cfg.sounds?.explosionLarge || 'Assets/Sound Effects/Skills/fugaexplode.mp3', 0.90);
        spawnSparks(this.x, this.y, 35, '#FF6B1A');
        triggerGlobalScreenShake(6.0, 20);
        spawnFloatingText(this.x, this.y - 35, 'COLLAR PIN IGNITION!', '#FF6B1A');

        const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
        for (let t of allTargets) {
          if (!t || t === this || t.isDead) continue;
          if (Math.hypot(t.x - this.x, t.y - this.y) <= shockR) {
            applyDamageToTarget(t, shockDmg, this, false);
            const ang = Math.atan2(t.y - this.y, t.x - this.x);
            t.knockbackVx = Math.cos(ang) * shockKb;
            t.knockbackVy = Math.sin(ang) * shockKb;
            if (typeof t.applyTimeStop === 'function') t.applyTimeStop(15);
          }
        }
        return;
      }
    }

    super.takeDamage(damage, source, isMelee, rawDamage);
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

    // 5. Active Blast Overlays
    for (let b of this.activePalmBlasts) {
      drawRezePalmBlast(ctx, b);
    }
    for (let n of this.activeNukeBlasts) {
      drawRezeMegatonNuke(ctx, n);
    }
  }

  onFrozenSkillDurationTick(isInsideGojoDomain) {
    if (this.isHybridModeActive && this.hybridModeTimer <= 0) {
      this.isHybridModeActive = false;
    }
  }
}

