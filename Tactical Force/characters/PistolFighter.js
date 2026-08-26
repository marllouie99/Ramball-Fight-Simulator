// ─────────────────────────────────────────────
// TACTICAL FORCE — PISTOL FIGHTER
// Tactical Sidearm Operative
// Semi-Auto Combat Handgun, High Mobility, Fast Trigger & Critical Headshots
// ─────────────────────────────────────────────

import { TacticalBaseFighter } from './TacticalBaseFighter.js';
import { CONFIG } from '../../js/core/config.js';
import { state } from '../../js/core/state.js';
import { drawTacticalPistolWeapon } from '../weapons/index.js';
import { drawPistolSkin } from '../skins/index.js';

export class PistolFighter extends TacticalBaseFighter {
  constructor(def) {
    super(def);
    this.spinDirection = Math.random() < 0.5 ? 1 : -1;
    const cfg = CONFIG.desertEagle || CONFIG.pistol || {};
    this.setupWeapon(cfg, {
      defaultMag: 7,
      defaultReload: 35,
      defaultCooldown: 24,
      tipOffset: 32,
      recoilDivisor: 5.0,
      baseRecoil: 1.25,
      reloadText: 'CHAMBERED',
      bulletOptions: {
        r: 5.0,
        length: 14,
        width: 3.6,
        radius: cfg.bulletRadius || 4.5,
        life: cfg.bulletLife || 80,
        caliberScale: 1.1,
        historyMax: 12
      },
      screenShake: { intensity: 1.5, duration: 3 }
    });
  }

  reset() {
    super.reset();
    const cfg = this.weaponConfig || CONFIG.desertEagle || CONFIG.pistol || {};
    this.resetTacticalWeapon(cfg, 7, 35);
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
