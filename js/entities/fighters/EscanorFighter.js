// ─────────────────────────────────────────────
// Escanor — The Lion's Sin of Pride (Entity & Combat Engine)
// The Seven Deadly Sins (Nanatsu no Taizai)
// Adheres strictly to repository coding standards:
// - Rule 1 (TimeStop & Freeze Guards)
// - Rule 1.1 (Centralized Movement & Physics Standard)
// - Rule 5 (No Self TimeStop during combos)
// - Rule 6 (Unified Target Queries: Fighters & Illusions)
// - Rule 7 (Frontal Arc Radius AOE for Rhitta Axe Cleaves)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 18 (HUD Theme Consistency: #F59E0B)
// - Rule 19 & 20 (Fighter Skin & Hand Visibility Guards)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { MODE_SETTINGS, MODE_HP_MULTIPLIER } from '../../core/modeConfig.js';
import { drawEscanorSkin } from '../../graphics/fighters/escanorSkin.js';
import { drawCruelSunOrb, drawPrideFlareShockwave } from '../../graphics/weapons/escanorWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

export class EscanorFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'escanor';
    this.type = 'escanor';
    this.color = '#F59E0B'; // Solar Gold
    this.themeColor = '#F59E0B';
    this.secondaryColor = '#DC2626'; // Solar Flare Crimson

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};

    // Standard HP initialization
    const modeFixed = MODE_SETTINGS[state.mode]?.fixedHp || MODE_SETTINGS[state.mode]?.playerFixedHp || MODE_SETTINGS[state.mode]?.soloFixedHp;
    if (modeFixed) {
      this.maxHp = modeFixed;
    } else {
      this.maxHp = Math.round((def?.hp || 390) * (MODE_HP_MULTIPLIER[state.mode] || 1));
    }
    this.hp = this.maxHp;

    // Animation & State Timers
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 20;
    this.slashSwingImpactTimer = 10;
    this._chopHitDelivered = true;
    this.chopHitPauseTimer = 0;
    this.chopHitPauseMax = 0;
    this.chopHitPauseTarget = null;
    this.punchAnimTimer = 0;
    this.punchMaxTime = 14;
    this.hideFrontHand = false;
    this.hideBackHand = false;

    // Passive: Sunshine & Solar Pride Stacks
    this.prideStacks = 0;
    this.prideMaxStacks = cfg.prideStackMax || 5;
    this.prideChargeTimer = 0;
    this.sunshineHeatTimer = 0;

    // Skill 1: Cruel Sun (無慈悲な太陽)
    this.cruelSunCooldownMax = cfg.cruelSunCooldown || 510;
    this.cruelSunCooldown = this.cruelSunCooldownMax;
    this.activeCruelSuns = []; // Active orbs

    // Skill 2: Pride Flare (プライド・フレア)
    this.prideFlareCooldownMax = cfg.prideFlareCooldown || 660;
    this.prideFlareCooldown = this.prideFlareCooldownMax;
    this.prideFlareActiveTimer = 0;
    this.prideFlareMaxTimer = 24;

    // Ultimate: "THE ONE" — Divine Sword Escanor (天地無双)
    this.theOneCooldownMax = cfg.theOneCooldown || 1560;
    this.theOneCooldown = this.theOneCooldownMax;
    this.isTheOneActive = false;
    this.theOneTimer = 0;
    this.theOneMaxTimer = cfg.theOneDuration || 480;
    this.theOneFinisherUsed = false;

    // Declarative Skill Registration
    this.skillManager.registerSkills([
      {
        id: 'cruel_sun',
        name: 'Cruel Sun (無慈悲な太陽)',
        type: 'active',
        cooldownKey: 'cruelSunCooldown',
        cooldownMaxKey: 'cruelSunCooldownMax'
      },
      {
        id: 'pride_flare',
        name: 'Pride Flare (プライド・フレア)',
        type: 'active',
        cooldownKey: 'prideFlareCooldown',
        cooldownMaxKey: 'prideFlareCooldownMax'
      },
      {
        id: 'the_one',
        name: '"THE ONE" (天上天下唯我独尊)',
        type: 'ultimate',
        cooldownKey: 'theOneCooldown',
        cooldownMaxKey: 'theOneCooldownMax'
      }
    ]);
  }

  /**
   * Disables default projectile gun rendering since Escanor wields Divine Axe Rhitta.
   */
  drawGun(ctx) {
    // Escanor wields Divine Axe Rhitta, suppressing standard gun barrels.
  }

  /**
   * Locks aim direction only during the chop STRIKE & RECOVERY phases.
   * During lift and hold, Escanor actively tracks the target.
   * Once the axe comes down, he's committed — making the attack missable.
   */
  aim(target) {
    if (!target) return;
    if (this.slashSwingTimer > 0) {
      const strikeFrames = (typeof this.chopStrikeFrames === 'number') ? this.chopStrikeFrames : (CONFIG.escanor?.chopStrikeFrames || 20);
      const recFrames = (typeof this.chopRecoveryFrames === 'number') ? this.chopRecoveryFrames : (CONFIG.escanor?.chopRecoveryFrames || 50);
      // Lock aim only once we're past the hold phase and actively striking down / recovering
      if (this.slashSwingTimer <= strikeFrames + recFrames) return;
    }
    super.aim(target);
  }

  /**
   * Returns true while Escanor is winding up (lifting or holding) Divine Axe Rhitta.
   */
  isLiftingWeapon() {
    if (this.slashSwingTimer <= 0) return false;
    const strikeFrames = (typeof this.chopStrikeFrames === 'number') ? this.chopStrikeFrames : (CONFIG.escanor?.chopStrikeFrames || 20);
    const recFrames = (typeof this.chopRecoveryFrames === 'number') ? this.chopRecoveryFrames : (CONFIG.escanor?.chopRecoveryFrames || 50);
    return this.slashSwingTimer > (strikeFrames + recFrames);
  }

  /**
   * Super Armor: Immune to all pushback / knockback attacks while lifting Divine Axe Rhitta
   */
  applyKnockback(vx, vy, stunFrames = 0) {
    if (this.isLiftingWeapon() || (this.chopHitPauseTimer || 0) > 0) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      return; // Completely immune to pushback while lifting weapon!
    }
    super.applyKnockback(vx, vy, stunFrames);
  }

  /**
   * Super Armor: Immune to hit-stun / flinch interruptions while lifting weapon
   */
  applyHitStun(duration, opts = {}) {
    if (this.isLiftingWeapon() || (this.chopHitPauseTimer || 0) > 0) {
      return; // Unwavering solar poise
    }
    super.applyHitStun(duration, opts);
  }

  canPerformBasicAttack() {
    if ((this.chopHitPauseTimer || 0) > 0) return false;
    return super.canPerformBasicAttack();
  }

  /**
   * Holds round and match transitions active while Escanor completes his basic attack
   * (overhead lift, hold, downward strike, dramatic hit-pause, knockback blast, and recovery)
   * or active finishing moves, ensuring his full attack animation never gets cut off when the enemy dies and he wins.
   * @returns {boolean}
   */
  hasActiveFinishingAbility() {
    if (this.hp <= 0 || this.dead || this.isDead) return false;
    if ((this.slashSwingTimer && this.slashSwingTimer > 0) || (this.chopHitPauseTimer && this.chopHitPauseTimer > 0)) {
      return true;
    }
    return super.hasActiveFinishingAbility ? super.hasActiveFinishingAbility() : false;
  }

  /**
   * Manual / 2P Player Input & Base Fighter Update Trigger for Basic Attack
   * Strictly verifies melee range so Escanor never chops when out of range!
   */
  shoot(ownerIndex) {
    if (!this.canPerformBasicAttack() || this.chopHitPauseTimer > 0) return false;
    const target = this.getNearestTarget(null);
    if (!target) return false;

    const reach = (CONFIG.escanor?.rhittaReach || 100) + (target.r || 25);
    const dist = Math.hypot(target.x - this.x, target.y - this.y);

    if (dist <= reach && this.shootCooldown <= 0 && this.slashSwingTimer <= 0) {
      this.aim(target);
      this._startRhittaChop(target);
      return true;
    }
    return false;
  }

  update(opponent, ownerIndex, arena) {
    // 1. Rule 1 Freeze / TimeStop Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // ── Dramatic Axe Chop Hit-Pause (just like Nanami's 7:3 Ratio Impact) ──
    if (this.chopHitPauseTimer > 0) {
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
      this.chopHitPauseTimer--;
      this.vx = 0;
      this.vy = 0;

      // Hold Rhitta axe firmly at the exact impact frame during the pause
      const impactFrame = this.slashSwingImpactTimer || 12;
      this.slashSwingTimer = impactFrame;

      // On pause completion (the unpause release moment): blast enemy backwards with knockback & screen shake!
      if (this.chopHitPauseTimer === 0) {
        const unpauseShake = (cfg.basicUnpauseShake || 10.0) * (this.isTheOneActive ? 1.5 : 1.0);
        const unpauseDur = cfg.basicUnpauseShakeDuration || 18;
        triggerGlobalScreenShake(unpauseShake, unpauseDur);

        if (this.chopHitPauseTarget) {
          const target = this.chopHitPauseTarget;
          target.suppressFreezeOverlay = false;
          target.timeStopTimer = 0; // Release timeStop so knockback is NOT zeroed by physics!

          // Tag target for wall pin upon wall collision
          target.isWallPinnedByEscanor = true;
          target._knockedBackByEscanorBasicAttack = true;
          target._escanorAttacker = this;

          // Apply physical knockback push upon unpause
          const knockbackAngle = (this.gunAngle !== undefined) ? this.gunAngle : (this.angle || 0);
          const prideMult = 1.0 + (this.prideStacks * (cfg.prideStackDamageBonus || 0.08)) + (this.isTheOneActive ? 0.45 : 0);
          const baseKnockback = (cfg.basicKnockback || 24.0) * (this.isTheOneActive ? 1.6 : 1.0) * prideMult;

          if (typeof target.applyKnockback === 'function') {
            target.applyKnockback(Math.cos(knockbackAngle) * baseKnockback, Math.sin(knockbackAngle) * baseKnockback);
          } else {
            target.knockbackVx = Math.cos(knockbackAngle) * baseKnockback;
            target.knockbackVy = Math.sin(knockbackAngle) * baseKnockback;
            target.vx = target.knockbackVx;
            target.vy = target.knockbackVy;
          }

          // Apply hit stun so target reels in knockback
          const stunFrames = cfg.basicHitStunFrames || 18;
          if (typeof target.applyHitStun === 'function') {
            target.applyHitStun(stunFrames);
          } else {
            target.hitStunTimer = Math.max(target.hitStunTimer || 0, stunFrames);
          }

          // Crushing weight slow — stagger from divine axe impact
          if (typeof target.applySlow === 'function') {
            target.applySlow(45, 0.4); // 40% speed for ~0.75s
          }

          // Explosive unpause effects: blood burst, sparks & heavy screen shake!
          spawnBloodEffect(target.x, target.y, 8, knockbackAngle);
          spawnSparks(target.x, target.y, '#F59E0B', 10);

          try {
            audioSystem.playSpatialSound('Assets/Sound Effects/Attacks/heavypunch1.mp3', this.x, this.y, 1.0);
          } catch (e) {}

          this.chopHitPauseTarget = null;
        }
      }
      return; // Freeze Escanor's actions during the hit-pause!
    }

    // Super Armor: Zero out any incoming knockback velocity while lifting weapon
    if (this.isLiftingWeapon()) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
    }

    // Centralized Movement & Physics (Rule 1.1)
    super.update(opponent, ownerIndex, arena);

    // Cleaver / Axe Swing Timer & Exact Downward Chop Impact Delivery
    if (this.slashSwingTimer > 0) {
      this.slashSwingTimer--;
      // Deliver hit detection at frame 12/10 (exact midpoint / transition to downward strike)
      if (this.slashSwingTimer <= (this.slashSwingImpactTimer || 12) && !this._chopHitDelivered) {
        this._executeRhittaChopHit();
        this._chopHitDelivered = true;
      }
    }
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.prideFlareActiveTimer > 0) this.prideFlareActiveTimer--;

    // Skill Cooldowns
    if (this.cruelSunCooldown > 0) this.cruelSunCooldown--;
    if (this.prideFlareCooldown > 0) this.prideFlareCooldown--;
    if (this.theOneCooldown > 0 && !this.isTheOneActive) this.theOneCooldown--;

    // "The One" Transformation Timer
    if (this.isTheOneActive) {
      this.theOneTimer--;
      if (this.theOneTimer <= 0) {
        this.isTheOneActive = false;
        this.theOneCooldown = this.theOneCooldownMax;
      }
    }

    // Update Cruel Sun Projectiles
    this._updateCruelSuns(arena);

    // Passive 1: Solar Pride Escalation (Ticks over time)
    this.prideChargeTimer++;
    if (this.prideChargeTimer >= (CONFIG.escanor?.prideChargeIntervalFrames || 150)) {
      this.prideChargeTimer = 0;
      if (this.prideStacks < this.prideMaxStacks) {
        this.prideStacks++;
      }
    }

    // Passive 2: Sunshine Heat Aura (AoE burn to nearby foes)
    this._updateSunshineHeat();

    // AI & Combat Execution
    const target = this.getNearestTarget(opponent);

    // Actively track target facing direction while winding up/poised in overhead stance
    if (target && this.slashSwingTimer > 0) {
      this.aim(target);
    }

    if (!target) return;

    const dist = Math.hypot(target.x - this.x, target.y - this.y);

    // 1. Try Ultimate: "THE ONE"
    if (this.theOneCooldown <= 0 && !this.isTheOneActive && (dist < 180 || this.hp < this.maxHp * 0.65)) {
      this._activateTheOne();
      return;
    }

    // 2. Try Divine Sword Escanor during "The One"
    if (this.isTheOneActive && !this.theOneFinisherUsed && dist < 120) {
      this._executeDivineSwordEscanor(target);
      return;
    }

    // 3. Try Skill 1: Cruel Sun
    if (this.cruelSunCooldown <= 0 && dist > 70 && dist < 280) {
      this._castCruelSun(target);
      return;
    }

    // 4. Try Skill 2: Pride Flare
    if (this.prideFlareCooldown <= 0 && (dist < 110 || this.activeCruelSuns.length > 0)) {
      this._castPrideFlare();
      return;
    }

    // 5. Basic Attack: Divine Axe Rhitta Chop (Windup overhead lift -> downward chop strike)
    const reach = (CONFIG.escanor?.rhittaReach || 100) + (target.r || 25);
    if (this.shootCooldown <= 0 && this.slashSwingTimer <= 0 && dist <= reach) {
      this._startRhittaChop(target);
    }
  }

  /**
   * Passive: Radiates continuous solar heat burn
   */
  _updateSunshineHeat() {
    this.sunshineHeatTimer++;
    if (this.sunshineHeatTimer % 30 !== 0) return; // Tick every half second

    const heatRadius = (CONFIG.escanor?.sunshineHeatRadius || 65) + (this.isTheOneActive ? 30 : this.prideStacks * 5);
    const heatDmg = (CONFIG.escanor?.sunshineHeatDps || 3) * (this.isTheOneActive ? 2.0 : 1.0);

    const validTargets = this._getAllValidEnemyTargets();
    for (const tgt of validTargets) {
      const d = Math.hypot(tgt.x - this.x, tgt.y - this.y);
      if (d <= heatRadius + (tgt.r || 25)) {
        if (typeof tgt.takeDamage === 'function') {
          tgt.takeDamage(heatDmg, this);
        }
      }
    }
  }

  /**
   * Initiates the 4-Stage Divine Axe Rhitta Overhead Lift, Poised Hold & Chop (Missable)
   */
  _startRhittaChop(target) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
    const liftFrames = (typeof cfg.chopLiftFrames === 'number') ? cfg.chopLiftFrames : 8;
    const holdFrames = (typeof cfg.chopLiftHoldFrames === 'number') ? cfg.chopLiftHoldFrames : 20;
    const strikeFrames = (typeof cfg.chopStrikeFrames === 'number') ? cfg.chopStrikeFrames : 8;
    const recFrames = (typeof cfg.chopRecoveryFrames === 'number') ? cfg.chopRecoveryFrames : 12;

    this.chopLiftFrames = liftFrames;
    this.chopLiftHoldFrames = holdFrames;
    this.chopStrikeFrames = strikeFrames;
    this.chopRecoveryFrames = recFrames;

    const totalFrames = liftFrames + holdFrames + strikeFrames + recFrames;
    this.slashSwingMaxTimer = totalFrames;
    this.slashSwingTimer = totalFrames;

    // Downward chop impact lands near the end of the strike stroke:
    this.slashSwingImpactTimer = recFrames + Math.max(1, Math.floor(strikeFrames * 0.25));
    this._chopHitDelivered = false;
    this.shootCooldown = (typeof cfg.cooldown === 'number') ? cfg.cooldown : (totalFrames + 20);

    // Slow movement during lift + hold (heavy axe overhead windup)
    if (typeof this.applySlow === 'function') {
      this.applySlow(liftFrames + holdFrames, 0.3); // 30% speed while winding up
    }

    if (target) {
      this.aim(target);
    }

    try {
      audioSystem.playSpatialSound('Assets/Sound Effects/Attacks/swordswing.mp3', this.x, this.y, 0.85);
    } catch (e) {}
  }

  /**
   * Resolves Hit Detection at the Downward Chop Impact Frame (Frame 10 of 20)
   * If opponent stepped away, dashed, or dodged out of the cone during windup, IT MISSES!
   * On hit: applies instant hit-pause freeze, shockwave, and queues massive knockback for unpause.
   */
  _executeRhittaChopHit() {
    const aimAngle = (this.gunAngle !== undefined) ? this.gunAngle : (this.angle || 0);
    const arc = CONFIG.escanor?.rhittaArcAngle || (Math.PI * 0.778); // ~140 deg
    const reach = CONFIG.escanor?.rhittaReach || 100;

    const baseMin = CONFIG.escanor?.basicDamageMin || 30;
    const baseMax = CONFIG.escanor?.basicDamageMax || 38;
    const prideMult = 1.0 + (this.prideStacks * (CONFIG.escanor?.prideStackDamageBonus || 0.08)) + (this.isTheOneActive ? 0.45 : 0);
    const damage = Math.round((baseMin + Math.random() * (baseMax - baseMin)) * prideMult);

    let hitTarget = null;
    const validTargets = this._getAllValidEnemyTargets();

    for (const tgt of validTargets) {
      const dx = tgt.x - this.x;
      const dy = tgt.y - this.y;
      const dist = Math.hypot(dx, dy);
      const targetRadius = tgt.r || 25;
      const totalBodyRadius = this.r + targetRadius;

      // Close proximity & point-blank contact tolerances
      const isDirectBodyContact = dist <= (totalBodyRadius + 14);
      const isCloseProximity = dist <= (totalBodyRadius + 32);

      // Check current position in real-time at impact
      if (dist <= reach + targetRadius || isCloseProximity) {
        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = angleToTarget - aimAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // When the enemy is right in Escanor's face / touching range,
        // the colossal overhead axe sweep and body cleave catches them anywhere in front/flank (up to 240° cone or direct body contact)
        const effectiveArc = isCloseProximity ? Math.max(arc, Math.PI * 1.33) : arc;

        if (isDirectBodyContact || Math.abs(angleDiff) <= effectiveArc / 2) {
          hitTarget = tgt;
          applyDamageToTarget(tgt, damage, this, { isMelee: true, isGuaranteedHit: true });
          if (typeof tgt.takeDamage === 'function') {
            tgt.takeDamage(CONFIG.escanor?.basicBurnDamage || 6, this, { isMelee: true, isGuaranteedHit: true }); // Burn tick
          }

          // Initial connection effects at the exact moment weapon connects
          spawnImpactFlash(tgt.x, tgt.y, '#F59E0B', 50); // Golden shockwave ring
          spawnSparks(tgt.x, tgt.y, '#F59E0B', 8);

          // Cinematic Hit-Pause (just like Nanami's 7:3 Ratio impact)
          const pauseFrames = CONFIG.escanor?.chopHitPauseFrames || 14;
          this.chopHitPauseTimer = pauseFrames;
          this.chopHitPauseMax = pauseFrames;
          this.chopHitPauseTarget = tgt;

          if (typeof tgt.applyTimeStop === 'function') {
            tgt.applyTimeStop(pauseFrames);
            tgt.suppressFreezeOverlay = true;
          } else {
            tgt.timeStopTimer = Math.max(tgt.timeStopTimer || 0, pauseFrames);
            tgt.suppressFreezeOverlay = true;
          }
          tgt.vx = 0;
          tgt.vy = 0;
          this.vx = 0;
          this.vy = 0;

          break; // Primary target hit
        }
      }
    }

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
    if (hitTarget) {
      const impactShake = (cfg.basicImpactShake || 7.0) * (this.isTheOneActive ? 1.5 : 1.0);
      const impactDur = cfg.basicImpactShakeDuration || 12;
      triggerGlobalScreenShake(impactShake, impactDur);

      if (this.prideStacks < this.prideMaxStacks) {
        this.prideStacks++;
      }
    } else {
      // Heavy downward axe chop slams the ground/air with concussive miss shake
      const missShake = (cfg.basicMissShake || 4.5) * (this.isTheOneActive ? 1.5 : 1.0);
      const missDur = cfg.basicMissShakeDuration || 8;
      triggerGlobalScreenShake(missShake, missDur);

      try {
        audioSystem.playSpatialSound('Assets/Sound Effects/Attacks/swordswing.mp3', this.x, this.y, 0.6);
      } catch (e) {}
    }
  }

  /**
   * Skill 1: Cruel Sun (無慈悲な太陽)
   */
  _castCruelSun(target) {
    this.cruelSunCooldown = this.cruelSunCooldownMax;
    this.aim(target);

    const angle = this.gunAngle || 0;
    const speed = CONFIG.escanor?.cruelSunSpeed || 9.5;
    const spawnDist = this.r + 20;

    const sunOrb = {
      x: this.x + Math.cos(angle) * spawnDist,
      y: this.y + Math.sin(angle) * spawnDist,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: CONFIG.escanor?.cruelSunOrbRadius || 18,
      life: 90,
      maxLife: 90,
      damage: (CONFIG.escanor?.cruelSunDamage || 65) * (this.isTheOneActive ? 1.4 : 1.0),
      aoeRadius: CONFIG.escanor?.cruelSunAoeRadius || 80,
      aoeDamage: (CONFIG.escanor?.cruelSunAoeDamage || 38) * (this.isTheOneActive ? 1.4 : 1.0),
      owner: this
    };

    this.activeCruelSuns.push(sunOrb);
    spawnFloatingText(this.x, this.y - 30, 'CRUEL SUN!', '#F59E0B');

    try {
      audioSystem.playSpatialSound('Assets/Sound Effects/Attacks/flamespray1.mp3', this.x, this.y, 0.7);
    } catch (e) {}
  }

  /**
   * Updates Cruel Sun projectiles and checks collision
   */
  _updateCruelSuns(arena) {
    for (let i = this.activeCruelSuns.length - 1; i >= 0; i--) {
      const sun = this.activeCruelSuns[i];
      sun.x += sun.vx;
      sun.y += sun.vy;
      sun.life--;

      let shouldExplode = (sun.life <= 0);

      // Arena boundary collision
      if (arena) {
        if (sun.x - sun.r <= arena.x || sun.x + sun.r >= arena.x + arena.width ||
            sun.y - sun.r <= arena.y || sun.y + sun.r >= arena.y + arena.height) {
          shouldExplode = true;
        }
      }

      // Check hit with enemy targets (Rule 6: Check fighters & illusions)
      const validTargets = this._getAllValidEnemyTargets();
      for (const tgt of validTargets) {
        const d = Math.hypot(tgt.x - sun.x, tgt.y - sun.y);
        if (d <= sun.r + (tgt.r || 25)) {
          shouldExplode = true;
          break;
        }
      }

      if (shouldExplode) {
        this._detonateCruelSun(sun);
        this.activeCruelSuns.splice(i, 1);
      }
    }
  }

  /**
   * Detonates Cruel Sun in a massive AOE explosion
   */
  _detonateCruelSun(sun) {
    spawnImpactFlash(sun.x, sun.y, '#F59E0B', sun.aoeRadius);
    spawnSparks(sun.x, sun.y, '#FEF08A', 24);
    triggerGlobalScreenShake(10, 16);

    const validTargets = this._getAllValidEnemyTargets();
    for (const tgt of validTargets) {
      const d = Math.hypot(tgt.x - sun.x, tgt.y - sun.y);
      if (d <= sun.aoeRadius + (tgt.r || 25)) {
        const isDirect = (d <= sun.r + (tgt.r || 25));
        const dmg = isDirect ? sun.damage : sun.aoeDamage;

        applyDamageToTarget(tgt, dmg, this);
        if (typeof tgt.applyHitStun === 'function') {
          tgt.applyHitStun(16);
        }

        // Radial Knockback
        const angle = Math.atan2(tgt.y - sun.y, tgt.x - sun.x);
        const kb = CONFIG.escanor?.cruelSunKnockback || 14.0;
        tgt.isWallPinnedByEscanor = true;
        tgt._knockedBackByEscanorBasicAttack = true;
        tgt._escanorAttacker = this;
        tgt.knockbackVx = Math.cos(angle) * kb;
        tgt.knockbackVy = Math.sin(angle) * kb;
      }
    }

    try {
      audioSystem.playSpatialSound('Assets/Sound Effects/Attacks/fleshhit.mp3', sun.x, sun.y, 0.9);
    } catch (e) {}
  }

  /**
   * Skill 2: Pride Flare (プライド・フレア)
   */
  _castPrideFlare() {
    this.prideFlareCooldown = this.prideFlareCooldownMax;
    this.prideFlareActiveTimer = this.prideFlareMaxTimer;

    const radius = CONFIG.escanor?.prideFlareRadius || 110;
    const dmg = (CONFIG.escanor?.prideFlareDamage || 52) * (this.isTheOneActive ? 1.5 : 1.0);
    const kb = CONFIG.escanor?.prideFlareKnockback || 22.0;

    spawnFloatingText(this.x, this.y - 35, 'PRIDE FLARE!', '#DC2626');
    triggerGlobalScreenShake(12, 18);

    // Detonate any active Cruel Sun orbs first
    for (const sun of this.activeCruelSuns) {
      this._detonateCruelSun(sun);
    }
    this.activeCruelSuns = [];

    // Detonate Escanor's Solar Aura
    const validTargets = this._getAllValidEnemyTargets();
    for (const tgt of validTargets) {
      const d = Math.hypot(tgt.x - this.x, tgt.y - this.y);
      if (d <= radius + (tgt.r || 25)) {
        applyDamageToTarget(tgt, dmg, this);
        if (typeof tgt.applyHitStun === 'function') {
          tgt.applyHitStun(CONFIG.escanor?.prideFlareStunDuration || 36);
        }

        const angle = Math.atan2(tgt.y - this.y, tgt.x - this.x);
        tgt.isWallPinnedByEscanor = true;
        tgt._knockedBackByEscanorBasicAttack = true;
        tgt._escanorAttacker = this;
        tgt.knockbackVx = Math.cos(angle) * kb;
        tgt.knockbackVy = Math.sin(angle) * kb;

        spawnSparks(tgt.x, tgt.y, '#F59E0B', 16);
      }
    }

    try {
      audioSystem.playSpatialSound('Assets/Sound Effects/Attacks/flamespray1.mp3', this.x, this.y, 0.9);
    } catch (e) {}
  }

  /**
   * Ultimate: "THE ONE" (天上天下唯我独尊)
   */
  _activateTheOne() {
    this.isTheOneActive = true;
    this.theOneTimer = this.theOneMaxTimer;
    this.theOneFinisherUsed = false;
    this.prideStacks = this.prideMaxStacks; // Max pride stacks

    spawnFloatingText(this.x, this.y - 45, 'THE ONE — HIGH NOON!', '#FEF08A');
    triggerGlobalScreenShake(16, 24);

    spawnImpactFlash(this.x, this.y, '#FEF08A', 120);
    spawnSparks(this.x, this.y, '#F59E0B', 32);

    try {
      audioSystem.playSpatialSound('Assets/Sound Effects/Attacks/laserbeam.mp3', this.x, this.y, 0.9);
    } catch (e) {}
  }

  /**
   * Finisher during The One: Divine Sword Escanor (聖剣エスカノール)
   */
  _executeDivineSwordEscanor(target) {
    this.theOneFinisherUsed = true;
    this.slashSwingTimer = this.slashSwingMaxTimer;
    this._chopHitDelivered = true;
    this.aim(target);

    const aimAngle = this.gunAngle || 0;
    const reach = CONFIG.escanor?.theOneFinisherReach || 120;
    const dmg = CONFIG.escanor?.theOneFinisherDamage || 115;
    const kb = CONFIG.escanor?.theOneFinisherKnockback || 42.0;

    spawnFloatingText(this.x, this.y - 40, 'DIVINE SWORD ESCANOR!', '#FEF08A');
    triggerGlobalScreenShake(20, 24);

    const validTargets = this._getAllValidEnemyTargets();
    for (const tgt of validTargets) {
      const dx = tgt.x - this.x;
      const dy = tgt.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= reach + (tgt.r || 25)) {
        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = angleToTarget - aimAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Frontal linear cone (80 degrees)
        if (Math.abs(angleDiff) <= (Math.PI * 0.44)) {
          applyDamageToTarget(tgt, dmg, this);
          if (typeof tgt.applyHitStun === 'function') {
            tgt.applyHitStun(24);
          }

          tgt.isWallPinnedByEscanor = true;
          tgt._knockedBackByEscanorBasicAttack = true;
          tgt._escanorAttacker = this;
          tgt.knockbackVx = Math.cos(angleToTarget) * kb;
          tgt.knockbackVy = Math.sin(angleToTarget) * kb;

          spawnImpactFlash(tgt.x, tgt.y, '#FFFFFF', 60);
          spawnSparks(tgt.x, tgt.y, '#FEF08A', 24);
          spawnBloodEffect(tgt.x, tgt.y, 14);
        }
      }
    }

    try {
      audioSystem.playSpatialSound('Assets/Sound Effects/Attacks/heavypunch1.mp3', this.x, this.y, 1.0);
    } catch (e) {}
  }

  /**
   * Helper: Resolves nearest enemy entity or direct opponent
   */
  getNearestTarget(opponent) {
    if (opponent && !opponent.isDead && (opponent.hp || 0) > 0) return opponent;
    let nearest = null;
    let minDist = Infinity;
    const validTargets = this._getAllValidEnemyTargets();
    for (const ent of validTargets) {
      const d = Math.hypot(ent.x - this.x, ent.y - this.y);
      if (d < minDist) {
        minDist = d;
        nearest = ent;
      }
    }
    return nearest;
  }

  /**
   * Helper: Queries all valid enemy targets (fighters & illusions) per Rule 6
   */
  _getAllValidEnemyTargets() {
    const targets = [];
    if (typeof state === 'undefined') return targets;

    const myIndex = (state.fighters || []).indexOf(this);
    const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIndex) : null;

    // 1. Check state.fighters
    if (state.fighters) {
      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (!f || f === this || f.isDead || (f.hp || 0) <= 0) continue;
        if (myTeam !== null && typeof state.getFighterTeam === 'function' && state.getFighterTeam(i) === myTeam) continue;
        targets.push(f);
      }
    }

    // 2. Check state.illusions (Rule 6)
    if (state.illusions) {
      for (let i = 0; i < state.illusions.length; i++) {
        const ill = state.illusions[i];
        if (!ill || ill.isDead || (ill.hp || 0) <= 0 || ill.owner === this) continue;
        targets.push(ill);
      }
    }

    return targets;
  }

  interruptAttacks(forceCancelAll = false) {
    // Super Armor: Do not cancel weapon lift/hold on standard damage interruptions
    if (!forceCancelAll && this.isLiftingWeapon()) {
      return;
    }
    super.interruptAttacks(forceCancelAll);
    this.slashSwingTimer = 0;
    this.punchAnimTimer = 0;
    this._chopHitDelivered = true;
    if (this.chopHitPauseTarget) {
      this.chopHitPauseTarget.suppressFreezeOverlay = false;
      this.chopHitPauseTarget = null;
    }
    this.chopHitPauseTimer = 0;
  }

  draw(ctx) {
    // 1. Draw Active Cruel Sun Orbs
    for (const sun of this.activeCruelSuns) {
      drawCruelSunOrb(ctx, sun.x, sun.y, sun.r);
    }

    // 2. Draw Active Pride Flare Shockwave
    if (this.prideFlareActiveTimer > 0) {
      const p = 1.0 - (this.prideFlareActiveTimer / this.prideFlareMaxTimer);
      const currentR = p * (CONFIG.escanor?.prideFlareRadius || 110);
      drawPrideFlareShockwave(ctx, this.x, this.y, currentR, CONFIG.escanor?.prideFlareRadius || 110, 1.0 - p);
    }

    // 3. Draw Escanor Main Skin Model
    drawEscanorSkin(ctx, this);
  }
}
