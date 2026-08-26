// ─────────────────────────────────────────────
// TACTICAL FORCE — SNIPER FIGHTER
// Tactical Recon Marksman
// .338 Bolt-Action Heavy Sniper Rifle, Laser Aim Line, High AP Velocity & Devastating Damage
// ─────────────────────────────────────────────

import { TacticalBaseFighter } from './TacticalBaseFighter.js';
import { CONFIG } from '../../js/core/config.js';
import { state } from '../../js/core/state.js';
import { drawTacticalSniperWeapon } from '../weapons/index.js';
import { drawSniperSkin } from '../skins/index.js';

export class SniperFighter extends TacticalBaseFighter {
  constructor(def) {
    super(def);
    this.spinDirection = Math.random() < 0.5 ? 1 : -1;
    const cfg = CONFIG.awp || CONFIG.sniper || {};
    this.setupWeapon(cfg, {
      defaultMag: 5,
      defaultReload: 65,
      defaultCooldown: 85,
      actionDuration: cfg.boltDuration || 26,
      tipOffset: 52,
      recoilDivisor: 8.0,
      baseRecoil: 2.0,
      reloadText: 'LOCKED & LOADED',
      bulletOptions: {
        r: 6.0,
        length: 26,
        width: 4.8,
        radius: cfg.bulletRadius || 5.2,
        life: cfg.bulletLife || 120,
        caliberScale: 1.35,
        historyMax: 20
      },
      screenShake: {
        intensity: cfg.screenShakeIntensity || 10.0,
        duration: cfg.screenShakeDuration || 8
      }
    });
    this.boltDuration = this.actionDuration;
    this.boltTimer = 0;
    this.aimLaserOpacity = cfg.laserSightAlpha ?? 0.45;
  }

  reset() {
    super.reset();
    const cfg = this.weaponConfig || CONFIG.awp || CONFIG.sniper || {};
    this.resetTacticalWeapon(cfg, 5, 65);
    this.boltDuration = this.actionDuration || 26;
    this.boltTimer = 0;
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
