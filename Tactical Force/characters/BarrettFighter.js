// ─────────────────────────────────────────────
// TACTICAL FORCE — BARRETT M82 FIGHTER
// .50 BMG Semi-Automatic Anti-Materiel Marksman
// ─────────────────────────────────────────────

import { TacticalBaseFighter } from './TacticalBaseFighter.js';
import { CONFIG } from '../../js/core/config.js';
import { state } from '../../js/core/state.js';
import { drawBarrettWeapon } from '../weapons/barrettWeapon.js';
import { drawBarrettSkin } from '../skins/barrettSkin.js';

export class BarrettFighter extends TacticalBaseFighter {
  constructor(defOrX, y, radius, color, moveSpeed, customConfig = {}, fighterIndex = 0) {
    const cfg = CONFIG.barrett || {};
    let def;
    if (typeof defOrX === 'object' && defOrX !== null) {
      def = defOrX;
    } else {
      def = {
        id: 105,
        name: 'BARRETT',
        type: 'barrett',
        color: color || cfg.color || '#06b6d4',
        radius: radius || cfg.r || 25,
        hp: cfg.hp || 460,
        damage: cfg.damage || 115,
        cooldown: cfg.fireCooldown || 62,
        speed: moveSpeed || cfg.speed || 5.0
      };
    }
    super(def);
    this.spinDirection = Math.random() < 0.5 ? 1 : -1;

    this.characterId = 'barrett';
    this.name = def.name || 'BARRETT';
    this.color = def.color || color || cfg.color || '#06b6d4';
    this.themeColor = this.color;
    this.customConfig = customConfig;

    this.setupWeapon(cfg, {
      defaultMag: 10,
      defaultReload: 75,
      defaultCooldown: 100,
      actionDuration: cfg.boltDuration || 28,
      tipOffset: 55,
      recoilDivisor: 8.0,
      baseRecoil: 2.2,
      reloadText: 'CHAMBERED',
      bulletOptions: {
        r: 8.0,
        length: 26,
        width: 5.0,
        radius: cfg.bulletRadius || 6.5,
        life: cfg.bulletLife || 130,
        caliberScale: 1.35,
        historyMax: 22
      },
      screenShake: {
        intensity: cfg.screenShakeIntensity || 11.0,
        duration: cfg.screenShakeDuration || 9
      }
    });
    this.boltDuration = this.actionDuration;
    this.boltTimer = 0;
    this.laserSightAlpha = cfg.laserSightAlpha || 0.50;
  }

  reset() {
    super.reset();
    const cfg = this.weaponConfig || CONFIG.barrett || {};
    this.resetTacticalWeapon(cfg, 10, 75);
    this.boltDuration = this.actionDuration || 28;
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

    // 1. Draw Barrett Operative Body Skin
    drawBarrettSkin(ctx, this);

    // 2. Draw Weapon & Hands
    const shouldHideWeapon = (typeof state !== 'undefined' && state.showSkinOnly);
    if (!shouldHideWeapon) {
      const reloadProgress = this.isReloading ? Math.max(0, Math.min(1, 1 - (this.reloadTimer / (this.reloadDuration || 75)))) : 0;

      drawBarrettWeapon(ctx, 0, 0, 0, this.r, {
        recoil: this.gunRecoil,
        isFiring: this.muzzleFlashTimer > 0,
        isReloading: this.isReloading,
        reloadProgress: reloadProgress,
        boltTimer: this.boltTimer,
        boltDuration: this.boltDuration,
        themeColor: this.color || '#06b6d4',
        showHands: !this.hideFrontHand && !shouldHideWeapon,
        hideFrontHand: this.hideFrontHand
      });
    }

    ctx.restore();

    // 3. Draw Health & Floating HUD
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
