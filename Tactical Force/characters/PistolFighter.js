// ─────────────────────────────────────────────
// TACTICAL FORCE — PISTOL FIGHTER
// Tactical Sidearm Operative
// Semi-Auto Combat Handgun, High Mobility, Fast Trigger & Critical Headshots
// ─────────────────────────────────────────────

import { Fighter } from '../../js/entities/fighter.js';
import { CONFIG } from '../../js/core/config.js';
import { projectileSystem } from '../../js/systems/projectileSystem.js';
import { state, spawnFloatingText } from '../../js/core/state.js';
import { audioSystem } from '../../js/systems/audioSystem.js';
import { drawDesertEagleWeapon, drawTacticalPistolWeapon } from '../weapons/index.js';
import { drawDesertEagleSkin, drawPistolSkin } from '../skins/index.js';
import { hasLineOfSight } from '../maps/index.js';

export class PistolFighter extends Fighter {
  constructor(def) {
    super(def);
    const cfg = CONFIG.desertEagle || CONFIG.pistol || {};
    this.maxMagazine = cfg.magazineSize || 7;
    this.magazineBullets = this.maxMagazine;
    this.reloadDuration = cfg.reloadTime || 35;
    this.reloadTimer = 0;
    this.isReloading = false;
    this.muzzleFlashTimer = 0;
  }

  reset() {
    super.reset();
    const cfg = CONFIG.desertEagle || CONFIG.pistol || {};
    this.maxMagazine = cfg.magazineSize || 7;
    this.magazineBullets = this.maxMagazine;
    this.reloadDuration = cfg.reloadTime || 35;
    this.reloadTimer = 0;
    this.isReloading = false;
    this.muzzleFlashTimer = 0;
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

    const cfg = CONFIG.desertEagle || CONFIG.pistol || {};

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer--;
    }

    if (this.gunRecoil > 0) {
      this.gunRecoil = Math.max(0, this.gunRecoil - 0.08);
    }

    if (this.shootDebounce > 0) {
      this.shootDebounce--;
    }

    // Reload system
    if (this.isReloading) {
      this.reloadTimer--;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        this.magazineBullets = this.maxMagazine;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX(cfg.sounds?.reload || 'Assets/Sound Effects/Skills/johnwick-pistol-reload.mp3', cfg.soundVolumes?.reload ?? 0.30);
        }
        spawnFloatingText(this.x, this.y - this.r - 15, 'CHAMBERED', this.color || '#f59e0b');
      }
    } else if (this.magazineBullets <= 0) {
      this.isReloading = true;
      this.reloadTimer = this.reloadDuration;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash1', 0.25, 0.9);
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

      if (isAligned && !this.lastAimAligned && this.shootDebounce <= 0) {
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

    const cfg = CONFIG.desertEagle || CONFIG.pistol || {};
    this.magazineBullets--;
    this.muzzleFlashTimer = cfg.flashDuration || 4;
    this.gunRecoil = cfg.recoilDistance ? (cfg.recoilDistance / 5.0) : 1.25;

    const fireAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

    // Recoil push
    const recoilForce = cfg.recoilForce || 2.8;
    this.vx -= Math.cos(fireAngle) * recoilForce;
    this.vy -= Math.sin(fireAngle) * recoilForce;
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(1.5, 3);
    }

    // Spawn tip position (clamped so bullet never spawns behind close targets)
    const scaleFactor = (this.r / 25);
    let tipDist = this.r + 32 * scaleFactor;
    if (target && target.hp > 0) {
      const distToTarget = Math.hypot(target.x - this.x, target.y - this.y);
      const maxSafeTip = Math.max(this.r + 2, distToTarget - (target.r || 24) - 4);
      if (tipDist > maxSafeTip) {
        tipDist = maxSafeTip;
      }
    }
    const spawnX = this.x + Math.cos(fireAngle) * tipDist;
    const spawnY = this.y + Math.sin(fireAngle) * tipDist;

    // Fire magnum projectile
    const speed = (CONFIG.projectile?.speed || 7) * (this._def?.projectileSpeedMultiplier || cfg.projectileSpeedMultiplier || 2.4);
    const proj = projectileSystem.fireProjectile(this, ownerIndex, this.damage, false, speed, false, 'tacticalBullet', spawnX, spawnY);
    if (proj) {
      proj.r = 5.0 * scaleFactor;
      proj.bulletLength = 14 * scaleFactor;
      proj.bulletWidth = 3.6 * scaleFactor;
      proj.bulletRadius = (cfg.bulletRadius || 4.5) * scaleFactor;
      proj.life = cfg.bulletLife || 80;
      proj.tacticalCaliberScale = 1.1 * scaleFactor;
      proj.knockbackForce = cfg.knockbackForce || 6.0;
      proj.historyMax = 12;
    }

    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX(cfg.sounds?.fire || 'Assets/Sound Effects/Attacks/desert-eagle-fire.mp3', cfg.soundVolumes?.fire ?? 0.30, 1.0);
    }
  }

  triggerDemoAttack() {
    const cfg = CONFIG.desertEagle || CONFIG.pistol || {};
    this.muzzleFlashTimer = cfg.flashDuration || 4;
    this.gunRecoil = 1.5;
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX(cfg.sounds?.fire || 'Assets/Sound Effects/Attacks/desert-eagle-fire.mp3', cfg.soundVolumes?.fire ?? 0.30, 1.2);
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
    drawPistolSkin(ctx, this);

    // 2. Draw Weapon & Hands
    const shouldHideWeapon = (typeof state !== 'undefined' && state.showSkinOnly);
    if (!shouldHideWeapon) {
      const reloadProgress = this.isReloading ? Math.max(0, Math.min(1, 1 - (this.reloadTimer / (this.reloadDuration || 35)))) : 0;

      drawTacticalPistolWeapon(ctx, 0, 0, 0, this.r, {
        recoil: this.gunRecoil,
        isFiring: this.muzzleFlashTimer > 0,
        isReloading: this.isReloading,
        reloadProgress: reloadProgress,
        themeColor: this.color || '#f59e0b',
        showHands: !this.hideFrontHand && !shouldHideWeapon,
        hideFrontHand: this.hideFrontHand
      });
    }

    ctx.restore();

    // 3. Draw Health text on TOP of body
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
