// ─────────────────────────────────────────────
// TACTICAL FORCE — SNIPER FIGHTER
// Tactical Recon Marksman
// .338 Bolt-Action Heavy Sniper Rifle, Laser Aim Line, High AP Velocity & Devastating Damage
// ─────────────────────────────────────────────

import { Fighter } from '../../js/entities/fighter.js';
import { CONFIG } from '../../js/core/config.js';
import { projectileSystem } from '../../js/systems/projectileSystem.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../js/core/state.js';
import { audioSystem } from '../../js/systems/audioSystem.js';
import { drawAwpWeapon, drawTacticalSniperWeapon } from '../weapons/index.js';
import { drawAwpSkin, drawSniperSkin } from '../skins/index.js';
import { hasLineOfSight } from '../maps/index.js';

export class SniperFighter extends Fighter {
  constructor(def) {
    super(def);
    const cfg = CONFIG.awp || CONFIG.sniper || {};
    this.maxMagazine = cfg.magazineSize || 5;
    this.magazineBullets = this.maxMagazine;
    this.reloadDuration = cfg.reloadTime || 65;
    this.reloadTimer = 0;
    this.isReloading = false;
    this.muzzleFlashTimer = 0;
    this.boltDuration = cfg.boltDuration || 26;
    this.boltTimer = 0;
    this._boltCrackPlayed = false;
    this.aimLaserOpacity = cfg.laserSightAlpha ?? 0.45;
  }

  reset() {
    super.reset();
    const cfg = CONFIG.awp || CONFIG.sniper || {};
    this.maxMagazine = cfg.magazineSize || 5;
    this.magazineBullets = this.maxMagazine;
    this.reloadDuration = cfg.reloadTime || 65;
    this.reloadTimer = 0;
    this.isReloading = false;
    this.muzzleFlashTimer = 0;
    this.boltDuration = cfg.boltDuration || 26;
    this.boltTimer = 0;
    this._boltCrackPlayed = false;
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

    const cfg = CONFIG.awp || CONFIG.sniper || {};

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer--;
    }

    if (this.gunRecoil > 0) {
      this.gunRecoil = Math.max(0, this.gunRecoil - 0.08);
    }

    if (this.shootDebounce > 0) {
      this.shootDebounce--;
    }

    // Manual Bolt Racking & Crack SFX Trigger (Like Shotgun)
    if (this.boltTimer > 0) {
      this.boltTimer--;
      if (this.boltTimer === Math.floor(this.boltDuration / 2) && !this._boltCrackPlayed) {
        this._boltCrackPlayed = true;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX(cfg.sounds?.bolt || 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3', cfg.soundVolumes?.bolt ?? 0.35, 1.1);
        }
      }
    }

    // Magazine Reload
    if (this.isReloading) {
      this.reloadTimer--;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        this.magazineBullets = this.maxMagazine;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX(cfg.sounds?.reload || 'Assets/Sound Effects/Skills/johnwick-m4-reload.mp3', cfg.soundVolumes?.reload ?? 0.30);
        }
        spawnFloatingText(this.x, this.y - this.r - 15, 'LOCKED & LOADED', this.color || '#ef4444');
      }
    } else if (this.magazineBullets <= 0) {
      this.isReloading = true;
      this.reloadTimer = this.reloadDuration; // ~1.08s bolt action reload
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash1', 0.25, 0.8);
      }
      spawnFloatingText(this.x, this.y - this.r - 15, 'BOLT CYCLE...', '#94a3b8');
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

    const cfg = CONFIG.awp || CONFIG.sniper || {};
    this.magazineBullets--;
    this.muzzleFlashTimer = cfg.flashDuration || 6;
    this.boltTimer = this.boltDuration;
    this._boltCrackPlayed = false;
    this.gunRecoil = cfg.recoilDistance ? (cfg.recoilDistance / 8.0) : 2.0;

    const fireAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

    // Massive bolt-action sniper recoil kick
    const recoilForce = cfg.recoilForce || 8.0;
    this.vx -= Math.cos(fireAngle) * recoilForce;
    this.vy -= Math.sin(fireAngle) * recoilForce;

    // Trigger sniper screen shake
    triggerGlobalScreenShake(cfg.screenShakeIntensity || 10.0, cfg.screenShakeDuration || 8);

    // Spawn tip position (clamped so bullet never spawns behind close targets)
    const scaleFactor = (this.r / 25);
    let tipDist = this.r + 52 * scaleFactor;
    if (target && target.hp > 0) {
      const distToTarget = Math.hypot(target.x - this.x, target.y - this.y);
      const maxSafeTip = Math.max(this.r + 2, distToTarget - (target.r || 24) - 4);
      if (tipDist > maxSafeTip) {
        tipDist = maxSafeTip;
      }
    }
    const spawnX = this.x + Math.cos(fireAngle) * tipDist;
    const spawnY = this.y + Math.sin(fireAngle) * tipDist;

    // Fire hyper-velocity armor-piercing round
    const speed = (CONFIG.projectile?.speed || 7) * (this._def?.projectileSpeedMultiplier || cfg.projectileSpeedMultiplier || 3.6);
    const proj = projectileSystem.fireProjectile(this, ownerIndex, this.damage, false, speed, false, 'tacticalBullet', spawnX, spawnY);
    if (proj) {
      proj.r = 6.0 * scaleFactor;
      proj.bulletLength = 26 * scaleFactor;
      proj.bulletWidth = 4.8 * scaleFactor;
      proj.bulletRadius = (cfg.bulletRadius || 5.2) * scaleFactor;
      proj.life = cfg.bulletLife || 120;
      proj.tacticalCaliberScale = 1.35 * scaleFactor;
      proj.knockbackForce = cfg.knockbackForce || 10.0;
      proj.historyMax = 20;
    }

    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX(cfg.sounds?.fire || 'Assets/Sound Effects/Attacks/awp-fire.mp3', cfg.soundVolumes?.fire ?? 0.80, 0.85);
    }
  }

  triggerDemoAttack() {
    const cfg = CONFIG.awp || CONFIG.sniper || {};
    this.muzzleFlashTimer = cfg.flashDuration || 6;
    this.boltTimer = this.boltDuration;
    this._boltCrackPlayed = false;
    this.gunRecoil = 2.0;
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX(cfg.sounds?.fire || 'Assets/Sound Effects/Attacks/awp-fire.mp3', cfg.soundVolumes?.fire ?? 0.80, 0.85);
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
    drawSniperSkin(ctx, this);

    // 2. Draw Weapon & Hands
    const shouldHideWeapon = (typeof state !== 'undefined' && state.showSkinOnly);
    if (!shouldHideWeapon) {
      const reloadProgress = this.isReloading ? Math.max(0, Math.min(1, 1 - (this.reloadTimer / (this.reloadDuration || 65)))) : 0;
      const recoilOffset = (this.gunRecoil || 0) * 14.0;
      const reloadOffset = this.isReloading ? -Math.sin(reloadProgress * Math.PI) * 4.0 : 0;
      const netRecoil = -recoilOffset + reloadOffset;

      drawTacticalSniperWeapon(ctx, 0, 0, 0, this.r, {
        recoil: this.gunRecoil,
        isFiring: this.muzzleFlashTimer > 0,
        isReloading: this.isReloading,
        reloadProgress: reloadProgress,
        boltTimer: this.boltTimer,
        boltDuration: this.boltDuration,
        themeColor: this.color || '#ef4444'
      });

      // Tactical Hands (Rule 20) — Sized dynamically with fighter scale
      if (!this.hideFrontHand) {
        const scaleFactor = (this.r / 25);
        const handRadius = 7.5 * scaleFactor;
        const tc = this.color || '#ef4444';
        ctx.fillStyle = '#062029';
        ctx.strokeStyle = tc;
        ctx.lineWidth = 1.8 * scaleFactor;

        // Trigger grip hand (follows recoil kick)
        ctx.beginPath();
        ctx.arc(this.r * 0.55 + 6 * scaleFactor + netRecoil, 6 * scaleFactor, handRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Forward support hand (Dynamic Bolt Racking & Reload Animation)
        let supportHandX = this.r * 0.55 + 46 * scaleFactor + netRecoil;
        let supportHandY = 4 * scaleFactor;
        if (this.isReloading) {
          if (reloadProgress < 0.25) {
            // Reaching up and pulling bolt handle rearward
            const p1 = reloadProgress / 0.25;
            supportHandX = this.r * 0.55 + (16 - p1 * 8) * scaleFactor;
            supportHandY = -4 * scaleFactor;
          } else if (reloadProgress < 0.65) {
            // Guiding fresh box magazine up into Arctic Warfare chassis
            const p2 = (reloadProgress - 0.25) / 0.40;
            supportHandX = this.r * 0.55 + (12 + p2 * 6) * scaleFactor;
            supportHandY = (16 - p2 * 10) * scaleFactor;
          } else if (reloadProgress < 0.88) {
            // Slamming bolt handle forward and locking it down
            const p3 = (reloadProgress - 0.65) / 0.23;
            supportHandX = this.r * 0.55 + (12 + p3 * 6) * scaleFactor;
            supportHandY = (-4 + p3 * 4) * scaleFactor;
          } else {
            // Returning to forward precision forend
            const p4 = (reloadProgress - 0.88) / 0.12;
            supportHandX = this.r * 0.55 + (18 + p4 * 28) * scaleFactor;
            supportHandY = (0 + p4 * 4) * scaleFactor;
          }
        } else if (this.boltTimer > 0) {
          // Dynamic bolt racking cycle after firing (Like Shotgun pump)
          const bp = 1.0 - (this.boltTimer / (this.boltDuration || 26));
          const rackReach = Math.sin(bp * Math.PI);
          supportHandX = this.r * 0.55 + 46 * scaleFactor + netRecoil - rackReach * 34 * scaleFactor;
          supportHandY = 4 * scaleFactor - rackReach * 8 * scaleFactor;
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
