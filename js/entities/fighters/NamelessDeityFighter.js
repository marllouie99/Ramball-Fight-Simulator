// ─────────────────────────────────────────────
// Nameless Deity Fighter Entity (Terraria: Wrath of the Gods)
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget, isSkillEnabled } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { namelessDeityConfig } from '../../configs/characters/namelessDeityConfig.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { playSound, playLoopingSound, stopLoopingSound, fadeOutLoopingSound } from '../../systems/soundSystem.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawNamelessDeitySkin } from '../../graphics/fighters/namelessDeitySkin.js';
import {
  drawNamelessDestroyerWeapon,
  drawNamelessDestroyerBeam,
  drawNamelessDestroyerCharge
} from '../../graphics/weapons/namelessDeityWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';

function getNamelessSetting(config, key) {
  return config?.[key] ?? namelessDeityConfig[key];
}

export class NamelessDeityFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'namelessdeity';
    this.type = 'namelessdeity';
    this.name = 'Nameless Deity';

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.namelessdeity) ? CONFIG.namelessdeity : namelessDeityConfig;
    this.color = def?.color ?? getNamelessSetting(cfg, 'color');
    this.themeColor = def?.themeColor ?? getNamelessSetting(cfg, 'themeColor');
    this.secondaryColor = def?.secondaryColor ?? getNamelessSetting(cfg, 'secondaryColor');
    this.damageNumberColor = getNamelessSetting(cfg, 'color');

    this.hp = getNamelessSetting(cfg, 'hp');
    this.maxHp = getNamelessSetting(cfg, 'maxHp');
    this.speed = getNamelessSetting(cfg, 'speed');
    this.baseSpeed = getNamelessSetting(cfg, 'speed');
    this.r = getNamelessSetting(cfg, 'r') || 28;
    this.radius = this.r;
    this.usesCustomHands = true;
    this.hideHands = true;
    this.skinVariant = def?.skinVariant || (typeof state !== 'undefined' ? (state.selectedNamelessDeitySkin || 'skin1') : 'skin1');

    // Combat Stats & Timers
    this.damage = getNamelessSetting(cfg, 'damage');
    this.cooldown = getNamelessSetting(cfg, 'cooldown');

    // Skill Cooldowns
    this.superclusterCooldown = 0;
    this.superclusterActiveTimer = 0;
    this.dimensionCleaveCooldown = 0;
    this.singularityCooldown = 0;
    this.activeSingularities = [];

    // Ultimate: Nameless Destroyer Beam States & Audio Handles
    this.destroyerCooldown = getNamelessSetting(cfg, 'destroyerInitialCooldown') ?? 400;
    this.destroyerWindupTimer = 0;
    this.destroyerWindupMax = 0;
    this.destroyerFireTimer = 0;
    this.destroyerRecoveryTimer = 0;
    this.destroyerBeamWidth = getNamelessSetting(cfg, 'destroyerBeamWidth');
    this.destroyerBeamLength = getNamelessSetting(cfg, 'destroyerBeamLength') ?? 1400;
    this.destroyerScrollSpeed = getNamelessSetting(cfg, 'destroyerScrollSpeed') ?? 14.0;
    this.destroyerMagicCircleSpinSpeed = getNamelessSetting(cfg, 'destroyerMagicCircleSpinSpeed') ?? 0.035;
    this.destroyerMagicCircleDiameter = getNamelessSetting(cfg, 'destroyerMagicCircleDiameter') ?? 380;
    this.destroyerFlareWindupFrames = getNamelessSetting(cfg, 'destroyerFlareWindupFrames') ?? 200;
    this.destroyerCircleFadeInFrames = getNamelessSetting(cfg, 'destroyerCircleFadeInFrames') ?? 150;
    this.destroyerHoldFrames = getNamelessSetting(cfg, 'destroyerHoldFrames') ?? 43;
    this.destroyerFireFrames = getNamelessSetting(cfg, 'destroyerFireFrames') ?? 800;
    this.destroyerLoopSoundKey = null;
    this.wingAnimationTimer = 0;

    // Transcendent Celestial God Poise: Complete immunity to knockback, pull, push, and body displacement
    this.isImmovable = true;
    this.isKnockbackImmune = true;
    this.cannotBeKnockbacked = true;
    this.cannotBePushed = true;
    this.isSuperArmorActive = true;

    this._registerSkills();
  }

  canAim() {
    // Disable auto-aim tracking strictly during active super-beam firing (Rule 1.4)
    if (this.destroyerFireTimer > 0) {
      return false;
    }
    return super.canAim ? super.canAim() : true;
  }

  hasActiveFinishingAbility() {
    if (this.hp <= 0 || this.isDead || this.dead) return false;
    if (
      (this.destroyerWindupTimer || 0) > 0 ||
      (this.destroyerFireTimer || 0) > 0 ||
      (this.destroyerRecoveryTimer || 0) > 0
    ) {
      return true;
    }
    return super.hasActiveFinishingAbility ? super.hasActiveFinishingAbility() : false;
  }

  isStationarySkillActive() {
    return Boolean(
      (this.destroyerWindupTimer && this.destroyerWindupTimer > 0) ||
      (this.destroyerFireTimer && this.destroyerFireTimer > 0) ||
      super.isStationarySkillActive?.()
    );
  }

  aim(opponent) {
    if (this.destroyerFireTimer > 0) {
      // Locked committed aim while firing beam (no tracking, no snapping)
      this.gunAngle = this.destroyerCastAngle;
      this.angle = this.destroyerCastAngle;
      return;
    }
    if (this.destroyerWindupTimer > 0) {
      // Smooth tracking auto-aim while channeling/winding up the flare and magic circle
      if (opponent && opponent.hp > 0 && !this.isTeammate(opponent)) {
        const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        let angleDiff = targetAngle - (this.gunAngle || 0);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        const turnSpeed = 0.08;
        this.gunAngle = (this.gunAngle || 0) + angleDiff * turnSpeed;
        this.angle = this.gunAngle;
        this.destroyerCastAngle = this.gunAngle;
      }
      return;
    }
    super.aim(opponent);
  }

  applyKnockback(vx, vy, stunFrames = 0) {
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    return;
  }

  applyRedKnockback(vx, vy) {
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    return;
  }

  applyHitStun(duration, opts = {}) {
    return;
  }

  applyParalyze(frames, opts = {}) {
    return;
  }

  applyStun(frames, opts = {}) {
    return;
  }

  applyElectricStun(frames, opts = {}) {
    return;
  }

  applyMovementPhysics(speedMultiplier = 1.0) {
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this.destroyerWindupTimer > 0 || this.destroyerFireTimer > 0) {
      this.vx = 0;
      this.vy = 0;
      return;
    }
    super.applyMovementPhysics(speedMultiplier);
  }

  takeDamage(amount, attacker, opts = {}) {
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    return super.takeDamage(amount, attacker, opts);
  }

  _registerSkills() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.namelessdeity) ? CONFIG.namelessdeity : namelessDeityConfig;
    const skills = [];

    if (isSkillEnabled(cfg.enableSuperclusterStars, true)) {
      skills.push({
        id: 'supercluster',
        name: 'Star Mandala',
        type: 'defense',
        cooldownKey: 'superclusterCooldown',
        cooldownMax: () => getNamelessSetting(cfg, 'superclusterCooldown'),
        color: getNamelessSetting(cfg, 'superclusterColor') || '#00F0FF',
        onActivate: (fighter, opponent) => {
          fighter.castSuperclusterStars(opponent);
        }
      });
    }

    if (isSkillEnabled(cfg.enableDimensionCleave, true)) {
      skills.push({
        id: 'dimensionCleave',
        name: 'Dimension Cleave',
        type: 'special',
        cooldownKey: 'dimensionCleaveCooldown',
        cooldownMax: () => getNamelessSetting(cfg, 'dimensionCleaveCooldown'),
        color: getNamelessSetting(cfg, 'dimensionCleaveColor') || '#A17FE0',
        onActivate: (fighter, opponent) => {
          fighter.castDimensionCleave(opponent);
        }
      });
    }

    if (isSkillEnabled(cfg.enableCosmicSingularity, true)) {
      skills.push({
        id: 'singularity',
        name: 'Cosmic Singularity',
        type: 'special',
        cooldownKey: 'singularityCooldown',
        cooldownMax: () => getNamelessSetting(cfg, 'singularityCooldown'),
        color: getNamelessSetting(cfg, 'singularityColor') || '#00F0FF',
        onActivate: (fighter, opponent) => {
          fighter.castCosmicSingularity(opponent);
        }
      });
    }

    if (isSkillEnabled(cfg.enableNamelessDestroyer, true)) {
      skills.push({
        id: 'namelessDestroyer',
        name: 'Nameless Destroyer',
        type: 'ultimate',
        cooldownKey: 'destroyerCooldown',
        cooldownMax: () => getNamelessSetting(cfg, 'destroyerCooldown'),
        color: getNamelessSetting(cfg, 'destroyerColor') || '#00F0FF',
        onActivate: (fighter, opponent) => {
          fighter.castNamelessDestroyer(opponent);
        }
      });
    }

    if (skills.length > 0 && this.skillManager) {
      this.skillManager.registerSkills(skills);
    }
  }

  _stopDestroyerLoopSounds(fadeMs = 0) {
    if (this.destroyerLoopSoundKey) {
      if (fadeMs > 0) fadeOutLoopingSound(this.destroyerLoopSoundKey, fadeMs);
      else stopLoopingSound(this.destroyerLoopSoundKey);
      this.destroyerLoopSoundKey = null;
    }
  }

  interruptAttacks(forceCancelAll = false) {
    if (!forceCancelAll && (this.destroyerWindupTimer > 0 || this.destroyerFireTimer > 0)) {
      return; // Transcendent Celestial Hyper-Armor: Never cancel Nameless Destroyer beam from transient hits/stuns
    }
    this._stopDestroyerLoopSounds(0);
    this.destroyerWindupTimer = 0;
    this.destroyerFireTimer = 0;
    super.interruptAttacks?.(forceCancelAll);
  }

  onDeath() {
    this._stopDestroyerLoopSounds(0);
    this.destroyerWindupTimer = 0;
    this.destroyerFireTimer = 0;
    super.onDeath?.();
  }

  reset() {
    this._stopDestroyerLoopSounds(0);
    super.reset();
    this.superclusterCooldown = 0;
    this.superclusterActiveTimer = 0;
    this.dimensionCleaveCooldown = 0;
    this.singularityCooldown = 0;
    this.activeSingularities = [];
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.namelessdeity) ? CONFIG.namelessdeity : namelessDeityConfig;
    this.damage = getNamelessSetting(cfg, 'damage') || 14;
    this.destroyerCooldown = getNamelessSetting(cfg, 'destroyerInitialCooldown') ?? 400;
    this.destroyerWindupTimer = 0;
    this.destroyerFireTimer = 0;
    this.destroyerRecoveryTimer = 0;
    this.wingAnimationTimer = 0;
  }

  shoot(ownerIndex) {
    if (this.destroyerWindupTimer > 0 || this.destroyerFireTimer > 0 || this.destroyerRecoveryTimer > 0) {
      return; // Suppress basic star darts while channeling transcendent super-beam
    }
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.namelessdeity) ? CONFIG.namelessdeity : namelessDeityConfig;
    if (!isSkillEnabled(cfg.enableStarDarts, true)) {
      return super.shoot(ownerIndex);
    }

    const dartCount = getNamelessSetting(cfg, 'dartCount') || 3;
    const spread = getNamelessSetting(cfg, 'dartSpreadAngle') || 0.35;
    const speed = getNamelessSetting(cfg, 'dartSpeed') || 10.5;
    const baseAngle = this.gunAngle || 0;

    for (let i = 0; i < dartCount; i++) {
      const offsetAngle = (i - (dartCount - 1) / 2) * spread;
      const angle = baseAngle + offsetAngle;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const spawnX = this.x + Math.cos(angle) * (this.r + 12);
      const spawnY = this.y + Math.sin(angle) * (this.r + 12);

      const proj = {
        x: spawnX,
        y: spawnY,
        vx,
        vy,
        radius: 5,
        damage: getNamelessSetting(cfg, 'dartDamage') || 14,
        color: '#00F0FF',
        owner: ownerIndex !== undefined ? ownerIndex : 0,
        ownerFighter: this,
        visual: 'starlightDart',
        life: 120,
        isHoming: true,
        homingStrength: getNamelessSetting(cfg, 'dartHomingStrength') || 0.06,
        draw: (ctx) => {
          ctx.save();
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#00F0FF';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      };

      if (typeof projectileSystem !== 'undefined' && projectileSystem.addProjectile) {
        projectileSystem.addProjectile(proj);
      } else if (state && Array.isArray(state.projectiles)) {
        state.projectiles.push(proj);
      }
    }

    spawnSparks(this.x + Math.cos(baseAngle) * this.r, this.y + Math.sin(baseAngle) * this.r, 5, '#00F0FF');
    return true;
  }

  castSuperclusterStars(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.namelessdeity) ? CONFIG.namelessdeity : namelessDeityConfig;
    this.superclusterCooldown = getNamelessSetting(cfg, 'superclusterCooldown');
    this.superclusterActiveTimer = getNamelessSetting(cfg, 'superclusterDuration');
    spawnFloatingText(this.x, this.y - 25, 'Supercluster Mandala!', '#00F0FF');
    return true;
  }

  castDimensionCleave(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.namelessdeity) ? CONFIG.namelessdeity : namelessDeityConfig;
    this.dimensionCleaveCooldown = getNamelessSetting(cfg, 'dimensionCleaveCooldown');

    const reach = getNamelessSetting(cfg, 'dimensionCleaveReach') || 140;
    const arc = getNamelessSetting(cfg, 'dimensionCleaveArc') || Math.PI * 0.95;
    const dmg = getNamelessSetting(cfg, 'dimensionCleaveDamage') || 32;
    const kb = getNamelessSetting(cfg, 'dimensionCleaveKnockback') || 12.0;
    const aimAngle = this.gunAngle || 0;

    // Multi-target Frontal Arc Query (Rule 1.6)
    const targets = [];
    if (state && Array.isArray(state.fighters)) {
      for (const f of state.fighters) {
        if (f && f !== this && f.hp > 0 && !f.dead && !f.isDead && !this.isTeammate(f)) {
          targets.push(f);
        }
      }
    }
    if (state && Array.isArray(state.illusions)) {
      for (const ill of state.illusions) {
        if (ill && ill.hp > 0 && !this.isTeammate(ill)) targets.push(ill);
      }
    }

    for (const target of targets) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= reach + (target.r || 20)) {
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - aimAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        if (Math.abs(angleDiff) <= arc / 2) {
          applyDamageToTarget(target, dmg, this);
          target.vx = Math.cos(targetAngle) * kb;
          target.vy = Math.sin(targetAngle) * kb;
          spawnImpactFlash(target.x, target.y, '#A17FE0');
          spawnSparks(target.x, target.y, 10, '#00F0FF');
        }
      }
    }

    triggerGlobalScreenShake(4.0, 8);
    spawnFloatingText(this.x, this.y - 25, 'Dimension Cleave!', '#A17FE0');
    return true;
  }

  castCosmicSingularity(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.namelessdeity) ? CONFIG.namelessdeity : namelessDeityConfig;
    this.singularityCooldown = getNamelessSetting(cfg, 'singularityCooldown');

    const destX = opponent ? opponent.x : (this.x + Math.cos(this.gunAngle || 0) * 150);
    const destY = opponent ? opponent.y : (this.y + Math.sin(this.gunAngle || 0) * 150);

    this.activeSingularities.push({
      x: destX,
      y: destY,
      timer: getNamelessSetting(cfg, 'singularityDuration') || 90,
      radius: getNamelessSetting(cfg, 'singularityRadius') || 130,
      pullForce: getNamelessSetting(cfg, 'singularityPullForce') || 0.28,
      collapseDamage: getNamelessSetting(cfg, 'singularityCollapseDamage') || 42,
    });

    spawnFloatingText(this.x, this.y - 25, 'Cosmic Singularity!', '#00F0FF');
    return true;
  }

  castNamelessDestroyer(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.namelessdeity) ? CONFIG.namelessdeity : namelessDeityConfig;

    // Snapshot committed 360° omnidirectional aim angle (Rule 1.4)
    let targetAngle = this.gunAngle || 0;
    if (opponent && opponent.x !== undefined && opponent.hp > 0) {
      targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }
    this.destroyerCastAngle = targetAngle;
    this.gunAngle = targetAngle;
    this.angle = targetAngle;

    const flareFrames = getNamelessSetting(cfg, 'destroyerFlareWindupFrames') ?? 200;
    const circleFrames = getNamelessSetting(cfg, 'destroyerCircleFadeInFrames') ?? 150;
    const holdFrames = getNamelessSetting(cfg, 'destroyerHoldFrames') ?? 43;
    const totalWindup = Math.max(1, flareFrames + circleFrames + holdFrames);
    const fireFrames = (typeof this.destroyerFireFrames === 'number' && this.destroyerFireFrames > 0)
      ? this.destroyerFireFrames
      : (getNamelessSetting(cfg, 'destroyerFireFrames') ?? 800);
    const baseCooldown = getNamelessSetting(cfg, 'destroyerCooldown') || 850;

    this.destroyerCooldown = Math.max(baseCooldown, totalWindup + fireFrames + 300);

    this.destroyerFlareWindupFrames = flareFrames;
    this.destroyerCircleFadeInFrames = circleFrames;
    this.destroyerHoldFrames = holdFrames;
    this.destroyerWindupMax = totalWindup;
    this.destroyerWindupTimer = totalWindup;
    this.destroyerFireTimer = 0;
    this.destroyerRecoveryTimer = 0;

    // 1. laserCharge SFX: Cosmic Laser Charge-up at wind-up initiation
    playSound(getNamelessSetting(cfg, 'sounds')?.laserCharge || 'Assets/Sound Effects/NamelessDeity/CosmicLaserChargeUp.ogg', getNamelessSetting(cfg, 'laserChargeVolume') || 1.15);

    spawnFloatingText(this.x, this.y - 25, 'NAMELESS DESTROYER!', '#00F0FF');
    return true;
  }

  update(opponent, ownerIndex, arena) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.namelessdeity) ? CONFIG.namelessdeity : namelessDeityConfig;

    // 1. Freeze / Time-Stop Guard (Rule 1.1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks(true);
      return;
    }

    // Wings Flap Cycle & Synchronized Downstroke Audio (Wrath of the Gods timing: completion = 0.50, frame 24/48)
    if (this.hp > 0 && !this.dead && !this.isDead) {
      this.wingAnimationTimer = (this.wingAnimationTimer || 0) + 1;
      const flapCycleDuration = 48;
      const isFiringBeam = (this.destroyerFireTimer > 0);
      if (this.wingAnimationTimer % flapCycleDuration === 24 && !isFiringBeam) {
        playSound(getNamelessSetting(cfg, 'sounds')?.wingFlap || 'Assets/Sound Effects/NamelessDeity/WingFlap2.ogg', getNamelessSetting(cfg, 'wingFlapVolume') || 0.70);
      }
    }

    // Cooldown decrements
    if (this.superclusterCooldown > 0) this.superclusterCooldown--;
    if (this.dimensionCleaveCooldown > 0) this.dimensionCleaveCooldown--;
    if (this.singularityCooldown > 0) this.singularityCooldown--;
    if (this.destroyerCooldown > 0) this.destroyerCooldown--;

    // Active Supercluster Star Mandala
    if (this.superclusterActiveTimer > 0) {
      this.superclusterActiveTimer--;
      // Periodic contact burst
      if (opponent && opponent.hp > 0 && !this.isTeammate(opponent)) {
        const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
        if (dist < 85) {
          applyDamageToTarget(opponent, 3, this);
          spawnSparks(opponent.x, opponent.y, 2, '#00F0FF');
        }
      }
    }

    // Active Singularities Gravitational Pull & Collapse
    for (let i = this.activeSingularities.length - 1; i >= 0; i--) {
      const sing = this.activeSingularities[i];
      sing.timer--;

      // Gravitational suction on non-teammates
      if (state && Array.isArray(state.fighters)) {
        for (const f of state.fighters) {
          if (f && f !== this && f.hp > 0 && !f.dead && !this.isTeammate(f)) {
            const dx = sing.x - f.x;
            const dy = sing.y - f.y;
            const d = Math.hypot(dx, dy);
            if (d < sing.radius && d > 1) {
              f.x += (dx / d) * sing.pullForce * 4.0;
              f.y += (dy / d) * sing.pullForce * 4.0;
            }
          }
        }
      }

      // Collapse Explosion
      if (sing.timer <= 0) {
        triggerGlobalScreenShake(5.0, 10);
        spawnImpactFlash(sing.x, sing.y, '#00F0FF');
        spawnSparks(sing.x, sing.y, 16, '#00F0FF');
        if (state && Array.isArray(state.fighters)) {
          for (const f of state.fighters) {
            if (f && f !== this && f.hp > 0 && !f.dead && !this.isTeammate(f)) {
              const d = Math.hypot(f.x - sing.x, f.y - sing.y);
              if (d < sing.radius * 0.75) {
                applyDamageToTarget(f, sing.collapseDamage, this);
              }
            }
          }
        }
        this.activeSingularities.splice(i, 1);
      }
    }

    // Ultimate: Nameless Destroyer Beam Pipeline
    if (this.destroyerWindupTimer > 0) {
      this.destroyerWindupTimer--;
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;

      // Smooth auto-aim tracking towards opponent while channeling windup
      if (opponent && opponent.hp > 0 && !this.isTeammate(opponent)) {
        this.aim(opponent);
      }

      // Smooth building cosmic vibration during the final phase of windup charge
      const windupMax = this.destroyerWindupMax || 393;
      const windupProgress = 1 - (this.destroyerWindupTimer / windupMax);
      if (windupProgress > 0.40) {
        const buildShake = ((windupProgress - 0.40) / 0.60) * (getNamelessSetting(cfg, 'destroyerWindupShake') || 3.0);
        if (state && state.screenShake) {
          state.screenShake.intensity = Math.max(state.screenShake.intensity || 0, buildShake);
          state.screenShake.timer = Math.max(state.screenShake.timer || 0, 2);
          state.screenShake.maxTimer = Math.max(state.screenShake.maxTimer || 0, 2);
        }
      }

      if (this.destroyerWindupTimer === 0) {
        // Wind-up complete: SNAP spawn the super-beam along current aimed direction without snap jumping!
        this.destroyerCastAngle = this.gunAngle || 0;
        this.destroyerFireTimer = (typeof this.destroyerFireFrames === 'number' && this.destroyerFireFrames > 0)
          ? this.destroyerFireFrames
          : (getNamelessSetting(cfg, 'destroyerFireFrames') ?? 800);

        // 2. laserStart SFX: Initial cosmic blast burst
        playSound(getNamelessSetting(cfg, 'sounds')?.laserStart || 'Assets/Sound Effects/NamelessDeity/CosmicLaserStart.ogg', getNamelessSetting(cfg, 'laserStartVolume') || 1.30);
        
        // 3. laserLoop SFX: Continuous roaring cosmic beam loop
        this._stopDestroyerLoopSounds(0);
        this.destroyerLoopSoundKey = `nameless_laser_loop_${this.characterId}_${this.ownerIndex || 0}_${Date.now()}`;
        playLoopingSound(this.destroyerLoopSoundKey, getNamelessSetting(cfg, 'sounds')?.laserLoop || 'Assets/Sound Effects/NamelessDeity/CosmicLaserLoop.ogg', getNamelessSetting(cfg, 'laserLoopVolume') || 0.95, 1.0, 60);

        triggerGlobalScreenShake(getNamelessSetting(cfg, 'destroyerScreenShake') || 8.0, 25);
        spawnImpactFlash(this.x, this.y, '#FFFFFF');
      }
    } else if (this.destroyerFireTimer > 0) {
      this.destroyerFireTimer--;
      this.gunAngle = this.destroyerCastAngle;
      this.angle = this.destroyerCastAngle;

      // Continuous apocalyptic cosmic arena shake while super-beam is tearing through the arena
      const continuousShake = getNamelessSetting(cfg, 'destroyerContinuousShake') || 5.0;
      if (state && state.screenShake) {
        state.screenShake.intensity = Math.max(state.screenShake.intensity || 0, continuousShake);
        state.screenShake.timer = Math.max(state.screenShake.timer || 0, 2);
        state.screenShake.maxTimer = Math.max(state.screenShake.maxTimer || 0, 2);
      } else if (typeof triggerGlobalScreenShake === 'function') {
        triggerGlobalScreenShake(continuousShake, 2);
      }

      // Deity anchored in place while channeling beam through magic circle
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;

      if (this.destroyerFireTimer === 0) {
        this.destroyerRecoveryTimer = getNamelessSetting(cfg, 'destroyerRecoveryFrames') || 25;
        this.destroyerRecoveryMax = this.destroyerRecoveryTimer;
        this._stopDestroyerLoopSounds(350);
        playSound(getNamelessSetting(cfg, 'sounds')?.chuckle || 'Assets/Sound Effects/NamelessDeity/Chuckle.ogg', getNamelessSetting(cfg, 'chuckleVolume') || 1.10);
        if (this.destroyerRecoveryTimer === 0) {
          const livingCount = (typeof state !== 'undefined' && state.fighters)
            ? state.fighters.filter(f => f && (typeof f.isEffectivelyAlive === 'function' ? f.isEffectivelyAlive() : (f.hp > 0 && !f.dead))).length
            : 0;
          if (livingCount <= 1 && typeof this.checkRoundOrMatchEnd === 'function') {
            this.checkRoundOrMatchEnd();
          }
        }
      }

      // Continuous Beam Hit-Detection, Gravitational Centerline Pull & Paralyze Stasis
      const fireFramesTotal = (typeof this.destroyerFireFrames === 'number' && this.destroyerFireFrames > 0)
        ? this.destroyerFireFrames
        : (getNamelessSetting(cfg, 'destroyerFireFrames') ?? 800);
      const tickInterval = getNamelessSetting(cfg, 'destroyerTickInterval') || 4;
      const isTickFrame = (this.destroyerFireTimer % tickInterval === 0);
      const totalDamage = getNamelessSetting(cfg, 'destroyerTotalDamage') || 130;
      const totalTicks = Math.max(1, Math.floor(fireFramesTotal / tickInterval));
      const dmgPerTick = totalDamage / totalTicks;

      // On every beam damage tick, HUD DMG stat multiplies by 128
      if (isTickFrame) {
        this.damage = (Number(this.damage) || getNamelessSetting(cfg, 'damage') || 14) * 128;
      }

      // Exact visual aperture half-height of the magic circle (142.5px = 285px visual cylinder diameter)
      const circleDiameter = (typeof this.destroyerMagicCircleDiameter === 'number')
        ? this.destroyerMagicCircleDiameter
        : (getNamelessSetting(cfg, 'destroyerMagicCircleDiameter') ?? 380);
      const visualHalfWidth = (circleDiameter * 0.5) * 0.60 * 1.25; // 142.5px
      const beamHalfWidth = (typeof this.destroyerBeamWidth === 'number' && this.destroyerBeamWidth > 0)
        ? this.destroyerBeamWidth
        : (getNamelessSetting(cfg, 'destroyerBeamWidth') ?? visualHalfWidth);

      const startX = this.x;
      const startY = this.y;
      const beamLen = this.destroyerBeamLength || getNamelessSetting(cfg, 'destroyerBeamLength') || 1400;
      const pullFactor = getNamelessSetting(cfg, 'destroyerCentripetalPullFactor') ?? 0.35;
      const forwardImpulse = getNamelessSetting(cfg, 'destroyerForwardImpulse') ?? 2.5;
      const paralyzeDur = getNamelessSetting(cfg, 'destroyerParalyzeDuration') ?? 12;

      const targets = [];
      if (state && Array.isArray(state.fighters)) {
        for (const f of state.fighters) {
          if (f && f !== this && f.hp > 0 && !f.dead && !f.isDead && !this.isTeammate(f)) {
            targets.push(f);
          }
        }
      }
      if (state && Array.isArray(state.illusions)) {
        for (const ill of state.illusions) {
          if (ill && ill.hp > 0 && !this.isTeammate(ill)) targets.push(ill);
        }
      }

      for (const f of targets) {
        // Project target onto beam ray
        const dx = f.x - startX;
        const dy = f.y - startY;
        const projLen = dx * Math.cos(this.destroyerCastAngle) + dy * Math.sin(this.destroyerCastAngle);
        if (projLen >= 0 && projLen <= beamLen) {
          const perpDist = Math.abs(-dx * Math.sin(this.destroyerCastAngle) + dy * Math.cos(this.destroyerCastAngle));
          if (perpDist <= beamHalfWidth + (f.r || 20)) {
            // 1. Cosmic Gravitational Suction: Pull target directly into the beam's central axis
            const lineX = startX + Math.cos(this.destroyerCastAngle) * projLen;
            const lineY = startY + Math.sin(this.destroyerCastAngle) * projLen;
            f.x += (lineX - f.x) * pullFactor;
            f.y += (lineY - f.y) * pullFactor;

            // 2. Forward stream push / drag along the beam length
            f.x += Math.cos(this.destroyerCastAngle) * forwardImpulse;
            f.y += Math.sin(this.destroyerCastAngle) * forwardImpulse;

            // 3. Absolute Paralyze / Beam Stasis: Lock velocities and disable movement/actions
            f.vx = 0;
            f.vy = 0;
            f.knockbackVx = 0;
            f.knockbackVy = 0;
            f.caughtInNamelessBeamTimer = paralyzeDur;
            f.isCaughtInNamelessBeam = true;
            if (typeof f.applyParalyze === 'function') {
              f.applyParalyze(paralyzeDur, { isSilent: true });
            }
            if (typeof f.interruptAttacks === 'function') {
              f.interruptAttacks(true);
            }
            if (f.statusEffects) {
              f.statusEffects.paralyzeTimer = Math.max(f.statusEffects.paralyzeTimer || 0, paralyzeDur);
            }

            // 4. Tick Damage & Sparks (Silent celestial disintegration without global hit sound or death sound)
            if (isTickFrame) {
              applyDamageToTarget(f, dmgPerTick, this, {
                noHitSound: true,
                suppressHitSound: true,
                isNamelessBeam: true,
                isSilent: true,
                isBeamDPS: true,
                noBlood: true,
                suppressBlood: true,
                noDeathSound: true,
                suppressDeathSound: true
              });
              spawnSparks(f.x, f.y, 4, '#00F0FF');
            }
          }
        }
      }
    } else if (this.destroyerRecoveryTimer > 0) {
      this.destroyerRecoveryTimer--;
      if (this.destroyerRecoveryTimer === 0) {
        const livingCount = (typeof state !== 'undefined' && state.fighters)
          ? state.fighters.filter(f => f && (typeof f.isEffectivelyAlive === 'function' ? f.isEffectivelyAlive() : (f.hp > 0 && !f.dead))).length
          : 0;
        if (livingCount <= 1 && typeof this.checkRoundOrMatchEnd === 'function') {
          this.checkRoundOrMatchEnd();
        }
      }
    }

    // AI Skill Decision Matrix (Strictly locked during active windup, firing, and recovery)
    const isChannelingDestroyer = (this.destroyerWindupTimer > 0 || this.destroyerFireTimer > 0 || this.destroyerRecoveryTimer > 0);
    if (!isChannelingDestroyer && opponent && opponent.hp > 0 && !this.isTeammate(opponent)) {
      const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      if (this.destroyerCooldown <= 0 && isSkillEnabled(cfg.enableNamelessDestroyer, true)) {
        this.castNamelessDestroyer(opponent);
      } else if (dist < 150 && this.dimensionCleaveCooldown <= 0 && isSkillEnabled(cfg.enableDimensionCleave, true)) {
        this.castDimensionCleave(opponent);
      } else if (dist > 180 && this.singularityCooldown <= 0 && isSkillEnabled(cfg.enableCosmicSingularity, true)) {
        this.castCosmicSingularity(opponent);
      } else if (this.superclusterCooldown <= 0 && isSkillEnabled(cfg.enableSuperclusterStars, true)) {
        this.castSuperclusterStars(opponent);
      }
    }

    if (isChannelingDestroyer) {
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.shootCooldown = Math.max(this.shootCooldown || 0, 30);
      return;
    }

    // Centralized Movement & Physics (Rule 1.2)
    super.update(opponent, ownerIndex, arena);
  }

  draw(ctx) {
    // 1. Draw Active Singularities in World Space
    for (const sing of this.activeSingularities) {
      ctx.save();
      ctx.strokeStyle = '#00F0FF';
      ctx.fillStyle = 'rgba(13, 11, 24, 0.7)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(sing.x, sing.y, sing.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Body Skin & Weapon (Behind beam and portal)
    drawNamelessDeitySkin(ctx, this);
    drawNamelessDestroyerWeapon(ctx, this);

    // 3. Draw Nameless Destroyer Charging Portal or Super-Beam (Fallback for standalone test runners)
    const isRenderGameActive = (typeof state !== 'undefined' && state.gameState && state.gameState !== 'test');
    if (!isRenderGameActive) {
      if (this.destroyerWindupTimer > 0) {
        drawNamelessDestroyerCharge(ctx, this, this.destroyerCastAngle);
      } else if (this.destroyerFireTimer > 0) {
        drawNamelessDestroyerBeam(ctx, this, this.destroyerCastAngle, (state && state.arena));
      }
    }

    this.drawHealth(ctx);
  }

  /**
   * Renders the Nameless Destroyer super-beam and windup portal on the absolute top layer in renderSystem.js,
   * guaranteeing the flare buildup, spinning magic circle, and galaxy beam stream overlay ALL fighters, minions,
   * projectiles, particles, and blood across the entire battlefield.
   */
  drawTopLayerBeams(ctx) {
    if (this.hp <= 0) return;
    if (this.destroyerWindupTimer > 0) {
      drawNamelessDestroyerCharge(ctx, this, this.destroyerCastAngle);
    } else if (this.destroyerFireTimer > 0) {
      drawNamelessDestroyerBeam(ctx, this, this.destroyerCastAngle, (state && state.arena));
    }
  }

  drawBody(ctx) {
    drawNamelessDeitySkin(ctx, this);
  }

  drawOutline(ctx) {}

  drawGun(ctx) {
    // Suppress default gun & pixel hand; Nameless Deity uses authentic cosmic arsenal
  }
}
