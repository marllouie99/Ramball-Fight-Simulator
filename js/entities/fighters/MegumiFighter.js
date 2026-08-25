// ─────────────────────────────────────────────
// Megumi Fushiguro — Ten Shadows Sorcerer Entity
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { drawMegumiSkin, drawMegumiShadowAura, drawMegumiGhostSkin } from '../../graphics/fighters/megumiSkin.js';
import { drawMegumiSlashArc } from '../../graphics/weapons/megumiWeaponGraphics.js';
import { spawnSparks } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

export class MegumiFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'megumi';
    this.type = 'megumi';
    this.color = '#1C2D4A'; // Midnight Navy
    this.themeColor = '#1C2D4A';

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.megumi) ? CONFIG.megumi : {};

    // Combat & Animation States
    this.punchAnimTimer = 0;
    this.punchMaxTime = cfg.punchSpeed || 18;
    this.isRightPunch = true;
    this.hideFrontHand = false;
    this.hideBackHand = true;
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 18;
    this.slashSwingImpactTimer = 9;
    this._chopHitDelivered = true;
    this.meleeCooldown = 0;
    this.meleeCooldownMax = cfg.daggerCooldown || 40;
    this.combatAuraOpacity = 0.35;

    // Passive: Liquid Shadow Reservoir & Shadow Sink (Kage no Utsuwa)
    this.isSubmerged = false;
    this.submergeTimer = 0;
    this.submergeSinkDuration = cfg.shadowSinkSinkDuration || 20;
    this.submergeSinkProgress = 0.0;
    this.submergeWallBounces = 0;
    this.submergeRequiredBounces = cfg.shadowSinkRequiredWallBounces ?? 3;
    this.shadowSinkGlideSpeedMultiplier = cfg.shadowSinkGlideSpeedMultiplier || 1.45;
    this.shadowSinkCooldown = 0;
    this.shadowSinkCooldownMax = cfg.shadowSinkCooldown || 300;
    this.shadowPoolX = 0;
    this.shadowPoolY = 0;
    this.isErupting = false;
    this.eruptTimer = 0;
    this.eruptMaxTimer = cfg.shadowAmbushEruptDuration || 22;
    this.eruptRiseProgress = 0.0;
    this.shadowAmbushDamage = cfg.shadowAmbushDamage || 26;
    this.shadowAmbushSlowMultiplier = cfg.shadowAmbushSlowMultiplier ?? 0.15;
    this.shadowEvadeChance = cfg.shadowEvadeChance ?? 0.50;
    this.thrustKnockback = cfg.thrustKnockback || 26;
    this._ambushTarget = null;
    this.hasShadowEvadeBuff = false;

    // Skill 1: Divine Dog: Totality (Kon: Zen)
    this.totalityActive = false;
    this.totalityCooldown = 0;
    this.totalityCooldownMax = cfg.totalityCooldown || 420;

    // Skill 2: Nue (Thunder Bird) & Toad (Gama)
    this.nueCooldown = 0;
    this.nueCooldownMax = cfg.nueCooldown || 360;
    this.toadCooldown = 0;
    this.toadCooldownMax = cfg.toadCooldown || 300;

    // Skill 3: Max Elephant & Rabbit Escape
    this.maxElephantCooldown = 0;
    this.maxElephantCooldownMax = cfg.maxElephantCooldown || 600;
    this.rabbitEscapeCooldown = 0;
    this.rabbitEscapeCooldownMax = cfg.rabbitEscapeCooldown || 480;

    // Domain Expansion: Chimera Shadow Garden (Kango An'eitei)
    this.domainActive = false;
    this.domainTimer = 0;
    this.domainDuration = cfg.domainDuration || 600;

    // Desperation Climax: Mahoraga Ritual (Makora)
    this.mahoragaSummoned = false;
    this.isChannelingMahoraga = false;
    this.mahoragaChannelTimer = 0;

    // Visual trails & shadow afterimages
    this.afterImages = [];
  }

  reset() {
    super.reset();
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.megumi) ? CONFIG.megumi : {};
    this.punchAnimTimer = 0;
    this.slashSwingTimer = 0;
    this.slashSwingImpactTimer = 9;
    this._chopHitDelivered = true;
    this.meleeCooldown = 0;
    this.hideFrontHand = false;
    this.hideBackHand = true;
    this.isThrustAttack = false;
    this.isSubmerged = false;
    this.submergeTimer = 0;
    this.submergeSinkDuration = cfg.shadowSinkSinkDuration || 20;
    this.submergeSinkProgress = 0.0;
    this.submergeWallBounces = 0;
    this.submergeRequiredBounces = cfg.shadowSinkRequiredWallBounces ?? 3;
    this.shadowSinkGlideSpeedMultiplier = cfg.shadowSinkGlideSpeedMultiplier || 1.45;
    this.shadowSinkCooldown = 0;
    this.shadowSinkCooldownMax = cfg.shadowSinkCooldown || 300;
    this.isErupting = false;
    this.eruptTimer = 0;
    this.eruptMaxTimer = cfg.shadowAmbushEruptDuration || 22;
    this.eruptRiseProgress = 0.0;
    this.shadowAmbushDamage = cfg.shadowAmbushDamage || 26;
    this.shadowAmbushSlowMultiplier = cfg.shadowAmbushSlowMultiplier ?? 0.15;
    this.shadowEvadeChance = cfg.shadowEvadeChance ?? 0.50;
    this.thrustKnockback = cfg.thrustKnockback || 26;
    this._ambushTarget = null;
    this.hasShadowEvadeBuff = false;
    this.totalityActive = false;
    this.totalityCooldown = 0;
    this.nueCooldown = 0;
    this.toadCooldown = 0;
    this.maxElephantCooldown = 0;
    this.rabbitEscapeCooldown = 0;
    this.domainActive = false;
    this.domainTimer = 0;
    this.mahoragaSummoned = false;
    this.isChannelingMahoraga = false;
    this.mahoragaChannelTimer = 0;
    this.afterImages = [];
  }

  interruptAttacks() {
    this.punchAnimTimer = 0;
    this.slashSwingTimer = 0;
    this._chopHitDelivered = true;
    this.isThrustAttack = false;
    this.isSubmerged = false;
    this.isErupting = false;
    this.eruptTimer = 0;
    if (this._ambushTarget) {
      this._ambushTarget.slowTimer = 0;
      this._ambushTarget.slowMultiplier = 1.0;
      this._ambushTarget = null;
    }
    this.hasShadowEvadeBuff = false;
    this.isChannelingMahoraga = false;
  }

  /**
   * Overrides takeDamage to implement the 50% Shadow Evade Buff during Ambush Eruption.
   */
  takeDamage(amount, attacker, opts = {}) {
    if (this.hp <= 0 || this.isDead) return 0;
    if (this.isSubmerged || this.isInvulnerable) return 0;

    // 50% Evade Buff active during Shadow Eruption & Ambush Strike
    if (this.hasShadowEvadeBuff) {
      const isGuaranteedHit = Boolean(opts && (opts.isRatioCrit || opts.isNanamiPause || opts.undodgeable || opts.isSureKill || opts.isSaitamaCounter || opts.bypassShield || opts.bypassEvade || opts.isGuaranteedHit));
      const evadeChance = this.shadowEvadeChance ?? 0.50;
      if (!isGuaranteedHit && Math.random() < evadeChance) {
        spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 12, 'MISS!', '#2EE6A8', 18);
        spawnSparks(this.x, this.y, 8, '#1C2D4A', '#2EE6A8');
        return 0;
      }
    }

    return super.takeDamage(amount, attacker, opts);
  }

  /**
   * Suppress default gun rendering (Megumi uses shadows & cursed sword).
   */
  drawGun(ctx) {}

  /**
   * Suppress default bullet shooting (Megumi uses CQC cursed sword slashes and Ten Shadows).
   */
  shoot(ownerIndex) {}

  /**
   * Evaluates melee CQC combat across 130-degree frontal arc with Nanami-style impact timing (Rules 6 & 7).
   */
  _updateMeleeCombat() {
    if (this.hp <= 0 || this.isSubmerged || this.isErupting) return;

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.megumi) ? CONFIG.megumi : {};
    const reach = cfg.daggerRange || 60;
    const arc = cfg.daggerArcAngle || ((130 * Math.PI) / 180);
    const facing = this.gunAngle || this.angle || 0;

    // Helper to query valid enemy targets (Rule 6)
    const getTargetsInArc = () => {
      const results = [];
      const checkTarget = (target) => {
        if (!target || target === this || target.hp <= 0 || target.isDead || this.isTeammate(target)) return;

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= reach + (target.r || 25)) {
          const targetAngle = Math.atan2(dy, dx);
          let diff = targetAngle - facing;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;

          if (Math.abs(diff) <= arc / 2) {
            results.push(target);
          }
        }
      };

      if (typeof state !== 'undefined') {
        if (state.fighters) state.fighters.forEach(checkTarget);
        if (state.illusions) state.illusions.forEach(checkTarget);
      }
      return results;
    };

    // Trigger basic attack swing if enemies are in reach
    if (this.slashSwingTimer <= 0 && this.meleeCooldown <= 0) {
      const targets = getTargetsInArc();
      if (targets.length > 0) {
        this.slashSwingTimer = this.slashSwingMaxTimer || 18;
        this.isThrustAttack = false; // Standard melee uses downward chop
        this.slashSwingImpactTimer = 9; // Nanami-style decoupled midpoint impact timing
        this._chopHitDelivered = false;
        this.meleeCooldown = this.meleeCooldownMax || 40;

        if (typeof audioSystem !== 'undefined' && audioSystem.playSound) {
          audioSystem.playSound('Assets/Sound Effects/Attacks/swordswing.mp3', 0.85);
        }
      }
    }

    // Deliver midpoint impact hit effects
    if (this.slashSwingTimer > 0 && this.slashSwingImpactTimer > 0) {
      this.slashSwingImpactTimer--;
      if (this.slashSwingImpactTimer === 0 && !this._chopHitDelivered) {
        this._chopHitDelivered = true;
        const hitTargets = getTargetsInArc();
        const dmg = cfg.daggerDamage || 18;
        const pushForce = cfg.daggerKnockback || 6;

        for (let target of hitTargets) {
          applyDamageToTarget(target, dmg, this);

          // Target flinch hit-stop (Rule 5)
          if (typeof target.applyTimeStop === 'function') {
            target.applyTimeStop(4);
          }

          spawnBloodEffect(target.x, target.y, 8);
          spawnSparks(target.x, target.y, 10, '#CBD5E1', '#F1F5F9');

          // Directional knockback push
          target.vx = (target.vx || 0) + Math.cos(facing) * pushForce;
          target.vy = (target.vy || 0) + Math.sin(facing) * pushForce;
        }

        // Heavy screen shake on impact
        triggerGlobalScreenShake(3.5, 7);
      }
    }
  }

  /**
   * Passive: Liquid Shadow Reservoir & Shadow Sink Evasion (Kage no Utsuwa).
   * Glides naturally with arena wall bounces and erupts whenever near an enemy.
   */
  _updateShadowSink(opponent, arena) {
    if (this.hp <= 0) return;

    // 1. INITIATION: Dive into liquid shadow pool when ready and enemy is engaged
    if (!this.isSubmerged && !this.isErupting && this.shadowSinkCooldown <= 0 && opponent && opponent.hp > 0) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const dist = Math.hypot(dx, dy);

      // Trigger if opponent is outside immediate melee reach (closing in) or attacking
      if (dist > 75) {
        this.isSubmerged = true;
        this.isErupting = false;
        this.submergeSinkProgress = 0.0;
        this.submergeWallBounces = 0;
        this.isInvulnerable = true;
        this.shadowSinkCooldown = this.shadowSinkCooldownMax || 300;
        this.shadowPoolX = this.x;
        this.shadowPoolY = this.y;
        this.vx = 0;
        this.vy = 0;

        spawnSparks(this.x, this.y, 8, '#1C2D4A', '#2EE6A8');
        if (typeof audioSystem !== 'undefined' && audioSystem.playSound) {
          audioSystem.playSound('Assets/Sound Effects/Attacks/spaceshot.mp3', 0.50);
        }
      }
    }

    // 2. SUBMERGED GLIDE
    if (this.isSubmerged) {
      this.isInvulnerable = true;

      // Calculate smooth sinking progress (0.0 -> 1.0)
      if (this.submergeSinkProgress < 1.0) {
        this.submergeSinkProgress = Math.min(1.0, this.submergeSinkProgress + (1.0 / (this.submergeSinkDuration || 20)));
        this.vx = 0;
        this.vy = 0;
      } else {
        // Once fully submerged, glide along natural heading with full arena wall bouncing
        const glideSpeed = (this.speed || 5.8) * (this.shadowSinkGlideSpeedMultiplier || 1.45);
        if (Math.hypot(this.vx, this.vy) < 0.2) {
          const heading = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
          this.vx = Math.cos(heading) * glideSpeed;
          this.vy = Math.sin(heading) * glideSpeed;
        }

        // Apply natural movement
        this.x += this.vx;
        this.y += this.vy;

        // Maintain natural arena wall bouncing and count wall rebounces
        const arenaObj = arena || (typeof state !== 'undefined' ? state.arena : null);
        if (arenaObj && typeof this.resolveWallBounce === 'function') {
          const didBounce = this.resolveWallBounce(arenaObj);
          if (didBounce) {
            this.submergeWallBounces = (this.submergeWallBounces || 0) + 1;
            spawnSparks(this.x, this.y, 8, '#1C2D4A', '#2EE6A8');
            spawnFloatingText(this.x, this.y - 20, `BOUNCE ${this.submergeWallBounces}/${this.submergeRequiredBounces}`, '#2EE6A8', 14);
          }
        }

        // Face current movement / target
        if (opponent && opponent.hp > 0) {
          this.aim(opponent);
        }

        // Proximity Eruption: Only erupts after bouncing the configured number of times off arena walls AND getting near an enemy!
        if ((this.submergeWallBounces || 0) >= (this.submergeRequiredBounces || 3)) {
          let nearbyEnemy = null;
          let minDistance = Infinity;
          const checkCandidate = (t) => {
            if (!t || t === this || t.hp <= 0 || t.isDead || this.isTeammate(t)) return;
            const d = Math.hypot(t.x - this.x, t.y - this.y);
            if (d < minDistance) {
              minDistance = d;
              nearbyEnemy = t;
            }
          };

          if (opponent) checkCandidate(opponent);
          if (typeof state !== 'undefined') {
            if (state.fighters) state.fighters.forEach(checkCandidate);
            if (state.illusions) state.illusions.forEach(checkCandidate);
          }

          const eruptionRange = (this.r || 25) + 60; // ~85px proximity
          if (nearbyEnemy && minDistance <= eruptionRange) {
            this._startShadowAmbushEruption(nearbyEnemy);
          }
        }
      }
    }
  }

  /**
   * Starts the smooth upward eruption rising transition in place wherever the shadow puddle is located.
   * Applies drastic movement slow to enemy and grants 50% evade buff to Megumi.
   */
  _startShadowAmbushEruption(target) {
    this.isSubmerged = false;
    this.isErupting = true;
    this.eruptTimer = this.eruptMaxTimer || 22;
    this.eruptRiseProgress = 0.0;
    this._ambushTarget = target;
    this.hasShadowEvadeBuff = true; // Evade Buff granted!
    this.vx = 0;
    this.vy = 0;

    if (target && target.hp > 0) {
      // Drastic movement slow applied to enemy as Megumi erupts
      target.slowTimer = 999;
      target.slowMultiplier = this.shadowAmbushSlowMultiplier ?? 0.15;
      this.aim(target);
      const slowPercent = Math.round((1 - target.slowMultiplier) * 100);
      spawnFloatingText(target.x, target.y - 28, `SHADOW MIRE (${slowPercent}% SLOW)!`, '#2EE6A8', 16);
      spawnFloatingText(this.x, this.y - 28, `${Math.round((this.shadowEvadeChance ?? 0.5) * 100)}% EVADE BUFF`, '#2EE6A8', 16);
    }

    // Initial bubbling ink burst at eruption point
    spawnSparks(this.x, this.y, 10, '#1C2D4A', '#2EE6A8');
  }

  /**
   * Delivers the Ambush Strike after full emergence with quick snappy charge frames and high-impact Toji thrust plunge.
   */
  _executeShadowAmbushStrike(target) {
    if (!target || target.hp <= 0 || target.isDead) return;

    this.aim(target);

    // Initial charge frame windup & shadow sparks gathering at blade hilt
    spawnSparks(this.x, this.y, 8, '#1C2D4A', '#2EE6A8');

    // 22-frame Smooth Toji-Style Shadow Ambush Thrust (smooth leveling, explosive plunge, kinetic hold, fluid retraction)
    this.slashSwingTimer = 22;
    this.slashSwingMaxTimer = 22;
    this.isThrustAttack = true;
    this.slashSwingImpactTimer = 14; // Peak plunge impact delivers at frame 8
    this._chopHitDelivered = false;
    this._ambushTarget = target;
  }

  /**
   * Renders the dynamic shadow slash crescent in world space.
   */
  _drawAttackSlashEffects(ctx) {
    drawMegumiSlashArc(ctx, this);
  }

  update(opponent, ownerIndex, arena) {
    // 1. Mandatory Rule 1 Freeze / Ambush Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    if (this.hp <= 0) return;

    // Update timers
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.slashSwingTimer > 0) this.slashSwingTimer--;
    if (this.meleeCooldown > 0) this.meleeCooldown--;
    if (this.shadowSinkCooldown > 0) this.shadowSinkCooldown--;
    if (this.totalityCooldown > 0) this.totalityCooldown--;
    if (this.nueCooldown > 0) this.nueCooldown--;
    if (this.toadCooldown > 0) this.toadCooldown--;
    if (this.maxElephantCooldown > 0) this.maxElephantCooldown--;
    if (this.rabbitEscapeCooldown > 0) this.rabbitEscapeCooldown--;

    const arenaObj = arena || (typeof state !== 'undefined' ? state.arena : null);

    // Update Passive: Liquid Shadow Reservoir & Shadow Sink Evasion
    this._updateShadowSink(opponent, arenaObj);

    // Handle rising eruption progress & post-eruption ambush strike delivery
    if (this.isErupting) {
      this.eruptTimer--;
      this.eruptRiseProgress = 1.0 - (this.eruptTimer / (this.eruptMaxTimer || 22));

      // Trigger the ambush thrust attack ONLY after Megumi has fully emerged onto the arena floor
      if (this.eruptTimer <= 0) {
        this.isErupting = false;
        this.eruptRiseProgress = 1.0;
        this._executeShadowAmbushStrike(this._ambushTarget || opponent);
      }
    }

    // Process decoupled thrust impact timing (Heavy Crunchy Impact at Peak Plunge)
    if (this.slashSwingTimer > 0 && this.isThrustAttack && this.slashSwingImpactTimer > 0) {
      this.slashSwingImpactTimer--;
      if (this.slashSwingImpactTimer === 0 && !this._chopHitDelivered) {
        this._chopHitDelivered = true;
        const target = this._ambushTarget || opponent;
        if (target && target.hp > 0 && !target.isDead) {
          applyDamageToTarget(target, this.shadowAmbushDamage || 26, this);

          // 6-frame heavy target hit-stop flinch
          if (typeof target.applyTimeStop === 'function') {
            target.applyTimeStop(6);
          }

          // Directional heavy knockback impulse along thrust vector
          const facing = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
          const knockbackForce = this.thrustKnockback || 26;
          const kx = Math.cos(facing) * knockbackForce;
          const ky = Math.sin(facing) * knockbackForce;

          // Lift enemy slow debuff immediately upon hit impact so they blast backwards freely
          target.slowTimer = 0;
          target.slowMultiplier = 1.0;

          if (typeof target.applyKnockback === 'function') {
            target.applyKnockback(kx, ky);
          }
          target.knockbackVx = (target.knockbackVx || 0) + kx;
          target.knockbackVy = (target.knockbackVy || 0) + ky;
          target.vx = (target.vx || 0) + kx;
          target.vy = (target.vy || 0) + ky;

          spawnBloodEffect(target.x, target.y, 12);
          spawnSparks(target.x, target.y, 16, '#2EE6A8', '#FFFFFF');
          triggerGlobalScreenShake(5.5, 11);
          spawnFloatingText(target.x, target.y - 28, 'SHADOW THRUST!', '#2EE6A8', 20);

          if (typeof audioSystem !== 'undefined' && audioSystem.playSound) {
            audioSystem.playSound('Assets/Sound Effects/Skills/toji-backthrust.mp3', 1.10);
          }
        }
      }
    }

    // The moment the attack from Megumi is done, enemy recovers from slow and evade buff is gone
    if (this.slashSwingTimer <= 0 && !this.isErupting && this.hasShadowEvadeBuff) {
      this.hasShadowEvadeBuff = false;
      if (this._ambushTarget) {
        this._ambushTarget.slowTimer = 0;
        this._ambushTarget.slowMultiplier = 1.0;
        this._ambushTarget = null;
      }
      this.isInvulnerable = false;
    }

    // Execute standard combat movement and aiming if not submerged & not erupting
    if (!this.isSubmerged && !this.isErupting) {
      super.update(opponent, ownerIndex, arenaObj);
      this._updateMeleeCombat();
    }
  }

  draw(ctx, opponent) {
    // 1. Draw Underfoot Liquid Shadow Reservoir Aura
    drawMegumiShadowAura(ctx, this);

    // 2. Draw Megumi Circle Body Model, Upright Silhouette, Spiky Hair & Jujutsu Uniform
    drawMegumiSkin(ctx, this);

    // 3. Draw Health & Freeze Indicators
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
