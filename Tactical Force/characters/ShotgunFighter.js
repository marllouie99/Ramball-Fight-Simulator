// ─────────────────────────────────────────────
// TACTICAL FORCE — SHOTGUN FIGHTER
// Tactical Breacher Pointman
// 12-Gauge Multi-Pellet Buckshot Spread, Heavy Knockback & Pump Action
// ─────────────────────────────────────────────

import { TacticalBaseFighter } from './TacticalBaseFighter.js';
import { CONFIG } from '../../js/core/config.js';
import { state } from '../../js/core/state.js';
import { drawTacticalShotgunWeapon } from '../weapons/index.js';
import { drawShotgunSkin } from '../skins/index.js';

export class ShotgunFighter extends TacticalBaseFighter {
  constructor(def) {
    super(def);
    this.spinDirection = Math.random() < 0.5 ? 1 : -1;
    const cfg = CONFIG.spas12 || CONFIG.shotgun || {};
    this.setupWeapon(cfg, {
      defaultMag: 8,
      defaultReload: 55,
      defaultCooldown: 45,
      actionDuration: cfg.pumpDuration || 22,
      tipOffset: 44,
      recoilDivisor: 8.0,
      baseRecoil: 1.5,
      reloadText: 'CHAMBERED',
      screenShake: {
        intensity: cfg.screenShakeIntensity || 4.5,
        duration: cfg.screenShakeDuration || 6
      }
    });
    this.pumpDuration = this.actionDuration;
    this.pumpTimer = 0;
  }

  reset() {
    super.reset();
    const cfg = this.weaponConfig || CONFIG.spas12 || CONFIG.shotgun || {};
    this.resetTacticalWeapon(cfg, 8, 55);
    this.pumpDuration = this.actionDuration || 22;
    this.pumpTimer = 0;
  }

  /**
   * Discharges a multi-pellet buckshot spread cone.
   */
  onFireWeapon(target, ownerIndex, fireAngle, spawnX, spawnY) {
    const cfg = this.weaponConfig || CONFIG.spas12 || CONFIG.shotgun || {};
    const pelletCount = cfg.pelletCount || 6;
    const spreadAngle = cfg.spreadAngle || ((12.5 * Math.PI) / 180);
    const globalMult = CONFIG.tactical?.globalBulletSpeedMultiplier ?? 1.0;
    const baseSpeed = (CONFIG.projectile?.speed || 7) * (this._def?.projectileSpeedMultiplier || cfg.projectileSpeedMultiplier || 2.1) * globalMult;
    const dmgPerPellet = cfg.damagePerPellet || this.damage || 18;

    for (let i = 0; i < pelletCount; i++) {
      const spreadOffset = (i / (pelletCount - 1) - 0.5) * spreadAngle + (Math.random() - 0.5) * 0.04;
      const pelletAngle = fireAngle + spreadOffset;
      const pelletSpeed = baseSpeed * (0.92 + Math.random() * 0.16);

      this.createTacticalBullet(spawnX, spawnY, pelletAngle, 1.0, dmgPerPellet, ownerIndex, {
        speed: pelletSpeed,
        r: 4.5,
        length: 12,
        width: 3.0,
        radius: cfg.bulletRadius || 3.8,
        life: cfg.bulletLife || 55,
        caliberScale: 0.85,
        historyMax: 8
      });
    }
  }

  draw(ctx) {
    const isFaceOff = this._isFaceOff || (typeof state !== 'undefined' && state.gameState === 'faceoff') || this._isPreview;
    const angle = this._isWinnerReveal ? 0 : (this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0));

    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.rotate(angle);

    // Upright vertical mirroring so fighter and weapon stay upright facing left (Rule 19)
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
