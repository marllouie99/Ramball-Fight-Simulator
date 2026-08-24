// ─────────────────────────────────────────────
// TACTICAL FORCE — RIFLE FIGHTER
// Tactical Assault Rifle Operator
// Balanced rate of fire, burst cadence, high precision tracers
// ─────────────────────────────────────────────

import { Fighter } from '../../js/entities/fighter.js';
import { CONFIG } from '../../js/core/config.js';
import { projectileSystem } from '../../js/systems/projectileSystem.js';
import { state, spawnFloatingText } from '../../js/core/state.js';
import { audioSystem } from '../../js/systems/audioSystem.js';
import { drawM4A1Weapon, drawTacticalRifleWeapon } from '../weapons/index.js';
import { drawM4A1Skin, drawRifleSkin } from '../skins/index.js';
import { hasLineOfSight } from '../maps/index.js';

export class RifleFighter extends Fighter {
  constructor(def) {
    super(def);
    const cfg = CONFIG.m4a1 || CONFIG.rifle || {};
    this.maxMagazine = cfg.magazineSize || 30;
    this.magazineBullets = this.maxMagazine;
    this.reloadDuration = cfg.reloadTime || 45;
    this.reloadTimer = 0;
    this.isReloading = false;
    this.muzzleFlashTimer = 0;
    this.burstShotsRemaining = 0;
    this.burstTimer = 0;
    this.burstTarget = null;
    this.burstOwnerIndex = 0;
  }

  reset() {
    super.reset();
    const cfg = CONFIG.m4a1 || CONFIG.rifle || {};
    this.maxMagazine = cfg.magazineSize || 30;
    this.magazineBullets = this.maxMagazine;
    this.reloadDuration = cfg.reloadTime || 45;
    this.reloadTimer = 0;
    this.isReloading = false;
    this.muzzleFlashTimer = 0;
    this.burstShotsRemaining = 0;
    this.burstTimer = 0;
    this.burstTarget = null;
    this.burstOwnerIndex = 0;
    this.lastAimAligned = false;
    this.shootDebounce = 0;
  }

  update(opponent, ownerIndex, arena) {
    // Top freeze guard (Rule 1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    const cfg = CONFIG.m4a1 || CONFIG.rifle || {};

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer--;
    }

    if (this.gunRecoil > 0) {
      this.gunRecoil = Math.max(0, this.gunRecoil - 0.12);
    }

    if (this.shootDebounce > 0) {
      this.shootDebounce--;
    }

    // 3-Round Burst Queue Execution
    if (this.burstShotsRemaining > 0 && !this.isReloading && this.magazineBullets > 0) {
      this.burstTimer--;
      if (this.burstTimer <= 0) {
        this._fireSingleBurstRound(this.burstTarget, this.burstOwnerIndex);
        this.burstShotsRemaining--;
        this.burstTimer = cfg.burstInterval || 4;
      }
    }

    // Reload system
    if (this.isReloading) {
      this.burstShotsRemaining = 0;
      this.reloadTimer--;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        this.magazineBullets = this.maxMagazine;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX(cfg.sounds?.reload || 'Assets/Sound Effects/Skills/johnwick-m4-reload.mp3', cfg.soundVolumes?.reload ?? 0.30);
        }
        spawnFloatingText(this.x, this.y - this.r - 15, 'RELOADED', this.color || '#3b82f6');
      }
    } else if (this.magazineBullets <= 0) {
      this.isReloading = true;
      this.burstShotsRemaining = 0;
      this.reloadTimer = this.reloadDuration;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash1', 0.2, 1.2);
      }
      spawnFloatingText(this.x, this.y - this.r - 15, 'RELOADING...', '#94a3b8');
    }

    // Rotational spin aim alignment sweep detection
    const canAct = (!this.hitStunTimer || this.hitStunTimer <= 0) && (!this.paralyzeTimer || this.paralyzeTimer <= 0) && !this.isCaughtInBeam();
    if (canAct && !this.isReloading && opponent && opponent.hp > 0 && !opponent.isDead) {
      const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      let angleDiff = targetAngle - this.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      const alignmentThreshold = CONFIG.tactical?.aimAlignmentThreshold || 0.14;
      const isAligned = Math.abs(angleDiff) <= alignmentThreshold;

      if (isAligned && !this.lastAimAligned && this.shootDebounce <= 0 && this.burstShotsRemaining <= 0) {
        if (hasLineOfSight(this.x, this.y, opponent.x, opponent.y)) {
          this.shoot(opponent, ownerIndex);
          this.shootDebounce = 8;
        }
      }
      this.lastAimAligned = isAligned;
    } else {
      this.lastAimAligned = false;
    }

    super.update(opponent, ownerIndex, arena);
  }

  _fireSingleBurstRound(target, ownerIndex) {
    if (this.magazineBullets <= 0) return;
    const cfg = CONFIG.m4a1 || CONFIG.rifle || {};
    this.magazineBullets--;
    this.muzzleFlashTimer = cfg.flashDuration || 4;
    this.gunRecoil = cfg.recoilDistance ? (cfg.recoilDistance / 6.0) : 1.0;

    const fireAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

    // Recoil physics
    const recoilForce = cfg.recoilForce ? (cfg.recoilForce / 2.0) : 1.75;
    this.vx -= Math.cos(fireAngle) * recoilForce;
    this.vy -= Math.sin(fireAngle) * recoilForce;

    // Subtle burst spread variance
    const spread = (Math.random() - 0.5) * 0.04;
    const shotAngle = fireAngle + spread;

    // Spawn tip position (clamped so bullet never spawns behind close targets)
    const scaleFactor = (this.r / 25);
    let tipDist = this.r + 42 * scaleFactor;
    if (target && target.hp > 0) {
      const distToTarget = Math.hypot(target.x - this.x, target.y - this.y);
      const maxSafeTip = Math.max(this.r + 2, distToTarget - (target.r || 24) - 4);
      if (tipDist > maxSafeTip) {
        tipDist = maxSafeTip;
      }
    }
    const spawnX = this.x + Math.cos(fireAngle) * tipDist;
    const spawnY = this.y + Math.sin(fireAngle) * tipDist;

    const origAngle = this.gunAngle;
    this.gunAngle = shotAngle;

    // Fire supersonic rifle projectile
    const speed = (CONFIG.projectile?.speed || 7) * (this._def?.projectileSpeedMultiplier || cfg.projectileSpeedMultiplier || 2.6);
    const proj = projectileSystem.fireProjectile(this, ownerIndex, this.damage, false, speed, false, 'tacticalBullet', spawnX, spawnY);
    if (proj) {
      proj.r = 5.5 * scaleFactor;
      proj.bulletLength = 17 * scaleFactor;
      proj.bulletWidth = 3.2 * scaleFactor;
      proj.bulletRadius = (cfg.bulletRadius || 4.8) * scaleFactor;
      proj.life = cfg.bulletLife || 95;
      proj.tacticalCaliberScale = 1.0 * scaleFactor;
      proj.knockbackForce = cfg.knockbackForce || 4.2;
      proj.historyMax = 14;
    }
    this.gunAngle = origAngle;

    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX(cfg.sounds?.fire || 'Assets/Sound Effects/Attacks/m4a1-fire.mp3', cfg.soundVolumes?.fire ?? 0.25, 1.05);
    }
  }

  shoot(target, ownerIndex) {
    if (typeof target === 'number' && ownerIndex === undefined) {
      ownerIndex = target;
      target = null;
    }
    if (ownerIndex === undefined) {
      ownerIndex = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(this) : 0;
    }

    if (this.isReloading || this.magazineBullets <= 0) return;
    if (this.hasClearLOS === false) return;
    if (target && target.hp > 0 && !hasLineOfSight(this.x, this.y, target.x, target.y)) return;

    const cfg = CONFIG.m4a1 || CONFIG.rifle || {};

    // Trigger initial burst shot
    this._fireSingleBurstRound(target, ownerIndex);

    // Queue next burst rounds
    const burstCount = cfg.burstCount || 3;
    this.burstShotsRemaining = Math.min(burstCount - 1, this.magazineBullets);
    this.burstTimer = cfg.burstInterval || 4;
    this.burstTarget = target;
    this.burstOwnerIndex = ownerIndex;
  }

  triggerDemoAttack() {
    const cfg = CONFIG.m4a1 || CONFIG.rifle || {};
    this.muzzleFlashTimer = cfg.flashDuration || 4;
    this.gunRecoil = 1.2;
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX(cfg.sounds?.fire || 'Assets/Sound Effects/Attacks/m4a1-fire.mp3', cfg.soundVolumes?.fire ?? 0.25, 1.05);
    }
  }

  draw(ctx) {
    const angle = this._isWinnerReveal ? 0 : (this.gunAngle || this.angle || 0);

    ctx.save();
    ctx.translate(this.x, this.y);

    // Standard local rotation and upright mirroring (Rule 19)
    ctx.rotate(angle);
    const facingLeft = Math.abs(angle) > Math.PI / 2;
    if (facingLeft) {
      ctx.scale(1, -1);
    }

    // 1. Draw Body Skin
    drawRifleSkin(ctx, this);

    // 2. Draw Weapon & Hands
    const shouldHideWeapon = (typeof state !== 'undefined' && state.showSkinOnly);
    if (!shouldHideWeapon) {
      const reloadProgress = this.isReloading ? Math.max(0, Math.min(1, 1 - (this.reloadTimer / (this.reloadDuration || 45)))) : 0;
      const recoilOffset = (this.gunRecoil || 0) * 8.0;
      const reloadOffset = this.isReloading ? -Math.sin(reloadProgress * Math.PI) * 3.5 : 0;
      const netRecoil = -recoilOffset + reloadOffset;

      drawTacticalRifleWeapon(ctx, 0, 0, 0, this.r, {
        recoil: this.gunRecoil,
        isFiring: this.muzzleFlashTimer > 0,
        isReloading: this.isReloading,
        reloadProgress: reloadProgress,
        themeColor: this.color || '#3b82f6'
      });

      // Tactical Hands (Rule 20) — Sized dynamically with fighter scale
      if (!this.hideFrontHand) {
        const scaleFactor = (this.r / 25);
        const handRadius = 7.5 * scaleFactor;
        const tc = this.color || '#3b82f6';
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = tc;
        ctx.lineWidth = 1.8 * scaleFactor;

        // Trigger hand (pistol grip - follows recoil kick)
        ctx.beginPath();
        ctx.arc(this.r * 0.85 - 2 * scaleFactor + netRecoil, 7 * scaleFactor, handRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Dynamic Support Hand (John Wick / MW style: Mag Release -> Insert PMAG -> Palm Slap Bolt Release -> C-Clamp Handguard)
        let supportHandX = this.r * 0.85 + 24 * scaleFactor + netRecoil;
        let supportHandY = 2 * scaleFactor;
        if (this.isReloading) {
          if (reloadProgress < 0.28) {
            // Stripping empty mag out of magwell
            const p1 = reloadProgress / 0.28;
            supportHandX = this.r * 0.85 + (8 - p1 * 4) * scaleFactor;
            supportHandY = (6 + p1 * 14) * scaleFactor;
          } else if (reloadProgress < 0.65) {
            // Feeding fresh 30-round PMAG up into magwell
            const p2 = (reloadProgress - 0.28) / 0.37;
            supportHandX = this.r * 0.85 + (4 + p2 * 4) * scaleFactor;
            supportHandY = (20 - p2 * 12) * scaleFactor;
          } else if (reloadProgress < 0.82) {
            // Slapping the left-side bolt catch / release
            supportHandX = this.r * 0.85 + 8 * scaleFactor;
            supportHandY = -2 * scaleFactor;
          } else {
            // Returning to forward quad-rail handguard
            const p4 = (reloadProgress - 0.82) / 0.18;
            supportHandX = this.r * 0.85 + (8 + p4 * 16) * scaleFactor;
            supportHandY = (-2 + p4 * 4) * scaleFactor;
          }
        }
        ctx.beginPath();
        ctx.arc(supportHandX, supportHandY, handRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();

    // 3. Draw Health text on TOP of body
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
