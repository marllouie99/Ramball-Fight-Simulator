// ─────────────────────────────────────────────
// TACTICAL FORCE — SHOTGUN FIGHTER
// Tactical Breacher Pointman
// 12-Gauge Multi-Pellet Buckshot Spread, Heavy Knockback & Pump Action
// ─────────────────────────────────────────────

import { Fighter } from '../../js/entities/fighter.js';
import { CONFIG } from '../../js/core/config.js';
import { projectileSystem } from '../../js/systems/projectileSystem.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../js/core/state.js';
import { audioSystem } from '../../js/systems/audioSystem.js';
import { drawSpas12Weapon, drawTacticalShotgunWeapon } from '../weapons/index.js';
import { drawSpas12Skin, drawShotgunSkin } from '../skins/index.js';
import { hasLineOfSight } from '../maps/index.js';

export class ShotgunFighter extends Fighter {
  constructor(def) {
    super(def);
    const cfg = CONFIG.spas12 || CONFIG.shotgun || {};
    this.maxMagazine = cfg.magazineSize || 8;
    this.magazineBullets = this.maxMagazine;
    this.reloadDuration = cfg.reloadTime || 55;
    this.reloadTimer = 0;
    this.isReloading = false;
    this.muzzleFlashTimer = 0;
    this.pumpDuration = cfg.pumpDuration || 22;
    this.pumpTimer = 0;
    this._pumpCrackPlayed = false;
  }

  reset() {
    super.reset();
    const cfg = CONFIG.spas12 || CONFIG.shotgun || {};
    this.maxMagazine = cfg.magazineSize || 8;
    this.magazineBullets = this.maxMagazine;
    this.reloadDuration = cfg.reloadTime || 55;
    this.reloadTimer = 0;
    this.isReloading = false;
    this.muzzleFlashTimer = 0;
    this.pumpDuration = cfg.pumpDuration || 22;
    this.pumpTimer = 0;
    this._pumpCrackPlayed = false;
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

    const cfg = CONFIG.spas12 || CONFIG.shotgun || {};

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer--;
    }

    if (this.gunRecoil > 0) {
      this.gunRecoil = Math.max(0, this.gunRecoil - 0.10);
    }

    if (this.shootDebounce > 0) {
      this.shootDebounce--;
    }

    // Shotgun pump racking cycle & crack SFX trigger
    if (this.pumpTimer > 0) {
      this.pumpTimer--;
      if (this.pumpTimer === Math.floor(this.pumpDuration / 2) && !this._pumpCrackPlayed) {
        this._pumpCrackPlayed = true;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX(cfg.sounds?.pump || 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3', cfg.soundVolumes?.pump ?? 0.30, 1.0);
        }
      }
    }

    // Reload system (Chamber shells)
    if (this.isReloading) {
      this.reloadTimer--;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        this.magazineBullets = this.maxMagazine;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX(cfg.sounds?.reload || 'Assets/Sound Effects/Skills/johnwick-shotgun-reload.mp3', cfg.soundVolumes?.reload ?? 0.30);
        }
        spawnFloatingText(this.x, this.y - this.r - 15, 'CHAMBERED', this.color || '#10b981');
      }
    } else if (this.magazineBullets <= 0) {
      this.isReloading = true;
      this.reloadTimer = this.reloadDuration;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash1', 0.25, 0.9);
      }
      spawnFloatingText(this.x, this.y - this.r - 15, 'SHELL RELOAD...', '#94a3b8');
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

    const cfg = CONFIG.spas12 || CONFIG.shotgun || {};
    this.magazineBullets--;
    this.muzzleFlashTimer = cfg.flashDuration || 5;
    this.pumpTimer = this.pumpDuration;
    this._pumpCrackPlayed = false;
    this.gunRecoil = cfg.recoilDistance ? (cfg.recoilDistance / 8.0) : 1.5;

    const fireAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

    // Heavy recoil impulse
    const recoilForce = cfg.recoilForce || 6.0;
    this.vx -= Math.cos(fireAngle) * recoilForce;
    this.vy -= Math.sin(fireAngle) * recoilForce;
    triggerGlobalScreenShake(cfg.screenShakeIntensity || 4.5, cfg.screenShakeDuration || 6);

    // Spawn tip position (clamped so pellets never spawn behind close targets)
    const scaleFactor = (this.r / 25);
    let tipDist = this.r + 44 * scaleFactor;
    if (target && target.hp > 0) {
      const distToTarget = Math.hypot(target.x - this.x, target.y - this.y);
      const maxSafeTip = Math.max(this.r + 2, distToTarget - (target.r || 24) - 4);
      if (tipDist > maxSafeTip) {
        tipDist = maxSafeTip;
      }
    }
    const spawnX = this.x + Math.cos(fireAngle) * tipDist;
    const spawnY = this.y + Math.sin(fireAngle) * tipDist;

    // Fire buckshot pellets in a spread cone
    const pelletCount = cfg.pelletCount || 6;
    const spreadAngle = cfg.spreadAngle || ((12.5 * Math.PI) / 180);
    const baseSpeed = (CONFIG.projectile?.speed || 7) * (this._def?.projectileSpeedMultiplier || cfg.projectileSpeedMultiplier || 2.1);
    const dmgPerPellet = cfg.damagePerPellet || this.damage || 18;

    for (let i = 0; i < pelletCount; i++) {
      const spreadOffset = (i / (pelletCount - 1) - 0.5) * spreadAngle + (Math.random() - 0.5) * 0.04;
      const pelletAngle = fireAngle + spreadOffset;
      const pelletSpeed = baseSpeed * (0.92 + Math.random() * 0.16);

      const proj = projectileSystem.fireProjectile(this, ownerIndex, dmgPerPellet, false, pelletSpeed, false, 'tacticalBullet', spawnX, spawnY);
      if (proj) {
        proj.r = 4.5 * scaleFactor;
        proj.vx = Math.cos(pelletAngle) * pelletSpeed;
        proj.vy = Math.sin(pelletAngle) * pelletSpeed;
        proj.bulletLength = 12 * scaleFactor;
        proj.bulletWidth = 3.0 * scaleFactor;
        proj.bulletRadius = (cfg.bulletRadius || 3.8) * scaleFactor;
        proj.life = cfg.bulletLife || 55;
        proj.tacticalCaliberScale = 0.85 * scaleFactor;
        proj.knockbackForce = cfg.knockbackForce || 3.8;
        proj.historyMax = 10;
      }
    }

    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX(cfg.sounds?.fire || 'Assets/Sound Effects/Attacks/shotgun-fire.mp3', cfg.soundVolumes?.fire ?? 0.80, 0.95);
    }
  }

  triggerDemoAttack() {
    const cfg = CONFIG.spas12 || CONFIG.shotgun || {};
    this.muzzleFlashTimer = cfg.flashDuration || 5;
    this.pumpTimer = this.pumpDuration;
    this._pumpCrackPlayed = false;
    this.gunRecoil = 1.5;
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX(cfg.sounds?.fire || 'Assets/Sound Effects/Attacks/shotgun-fire.mp3', cfg.soundVolumes?.fire ?? 0.80, 0.95);
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
    drawShotgunSkin(ctx, this);

    // 2. Draw Weapon & Hands
    const shouldHideWeapon = (typeof state !== 'undefined' && state.showSkinOnly);
    if (!shouldHideWeapon) {
      const reloadProgress = this.isReloading ? Math.max(0, Math.min(1, 1 - (this.reloadTimer / (this.reloadDuration || 55)))) : 0;
      const recoilOffset = (this.gunRecoil || 0) * 11.0;
      const reloadOffset = this.isReloading ? -Math.sin(reloadProgress * Math.PI) * 3.0 : 0;
      const netRecoil = -recoilOffset + reloadOffset;

      drawTacticalShotgunWeapon(ctx, 0, 0, 0, this.r, {
        recoil: this.gunRecoil,
        isFiring: this.muzzleFlashTimer > 0,
        pumpTimer: this.pumpTimer,
        pumpDuration: this.pumpDuration,
        isReloading: this.isReloading,
        reloadProgress: reloadProgress,
        themeColor: this.color || '#10b981'
      });

      // Tactical Hands (Rule 20) — Sized dynamically with fighter scale
      if (!this.hideFrontHand) {
        const scaleFactor = (this.r / 25);
        const handRadius = 7.5 * scaleFactor;
        const tc = this.color || '#10b981';
        ctx.fillStyle = '#064e3b';
        ctx.strokeStyle = tc;
        ctx.lineWidth = 1.8 * scaleFactor;

        // Trigger grip hand (follows recoil kick)
        ctx.beginPath();
        ctx.arc(this.r * 0.85 - 4 * scaleFactor + netRecoil, 7 * scaleFactor, handRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 2. Dynamic Pump / Loading Hand (Shell Loading -> Pump Rack -> Forend Lock)
        let pumpHandX = this.r * 0.85 + 26 * scaleFactor + netRecoil;
        let pumpHandY = 3 * scaleFactor;
        if (this.isReloading) {
          if (reloadProgress < 0.72) {
            // Loading shells into under-barrel magazine tube
            const shellP = (reloadProgress * 4.0) % 1.0;
            pumpHandX = this.r * 0.85 + (6 + shellP * 8) * scaleFactor;
            pumpHandY = (12 - shellP * 6) * scaleFactor;
          } else if (reloadProgress < 0.90) {
            // Aggressive pump rack (sliding rearward and forward)
            const rackP = (reloadProgress - 0.72) / 0.18;
            const rackOffset = Math.sin(rackP * Math.PI) * 12.0 * scaleFactor;
            pumpHandX = this.r * 0.85 + 26 * scaleFactor - rackOffset;
            pumpHandY = 3 * scaleFactor;
          } else {
            pumpHandX = this.r * 0.85 + 26 * scaleFactor;
            pumpHandY = 3 * scaleFactor;
          }
        } else if (this.pumpTimer > 0) {
          const pumpProgress = (this.pumpTimer / this.pumpDuration);
          const pumpOffset = Math.sin(pumpProgress * Math.PI) * 10.0 * scaleFactor;
          pumpHandX -= pumpOffset;
        }
        ctx.beginPath();
        ctx.arc(pumpHandX, pumpHandY, handRadius, 0, Math.PI * 2);
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
