// ─────────────────────────────────────────────
// TACTICAL FORCE — RIFLE FIGHTER
// Tactical Assault Rifle Operator
// Balanced rate of fire, burst cadence, high precision tracers
// ─────────────────────────────────────────────

import { TacticalBaseFighter } from './TacticalBaseFighter.js';
import { CONFIG } from '../../js/core/config.js';
import { state } from '../../js/core/state.js';
import { audioSystem } from '../../js/systems/audioSystem.js';
import { drawTacticalRifleWeapon } from '../weapons/index.js';
import { drawRifleSkin } from '../skins/index.js';

export class RifleFighter extends TacticalBaseFighter {
  constructor(def) {
    super(def);
    this.spinDirection = Math.random() < 0.5 ? 1 : -1;
    const cfg = CONFIG.m4a1 || CONFIG.rifle || {};
    this.setupWeapon(cfg, {
      defaultMag: 30,
      defaultReload: 45,
      defaultCooldown: 24,
      tipOffset: 42,
      recoilDivisor: 6.0,
      baseRecoil: 1.0,
      reloadText: 'RELOADED'
    });
    this.burstShotsRemaining = 0;
    this.burstTimer = 0;
    this.burstTarget = null;
    this.burstOwnerIndex = 0;
  }

  reset() {
    super.reset();
    const cfg = this.weaponConfig || CONFIG.m4a1 || CONFIG.rifle || {};
    this.resetTacticalWeapon(cfg, 30, 45);
    this.burstShotsRemaining = 0;
    this.burstTimer = 0;
    this.burstTarget = null;
    this.burstOwnerIndex = 0;
  }

  /**
   * Advances burst queue every frame.
   */
  onUpdateWeaponAction(opponent, ownerIndex) {
    if (this.burstShotsRemaining > 0 && !this.isReloading && this.magazineBullets > 0) {
      this.burstTimer--;
      if (this.burstTimer <= 0) {
        this._fireSingleBurstRound(this.burstTarget, this.burstOwnerIndex);
        this.burstShotsRemaining--;
        const cfg = this.weaponConfig || CONFIG.m4a1 || CONFIG.rifle || {};
        this.burstTimer = cfg.burstInterval || 4;
      }
    }
  }

  /**
   * Initializes 3-round burst on weapon discharge.
   */
  onFireWeapon(target, ownerIndex, fireAngle, spawnX, spawnY) {
    const cfg = this.weaponConfig || CONFIG.m4a1 || CONFIG.rifle || {};
    // Initial burst round
    this._fireSingleBurstRound(target, ownerIndex);

    // Queue next burst rounds
    const burstCount = cfg.burstCount || 3;
    this.burstShotsRemaining = Math.min(burstCount - 1, this.magazineBullets);
    this.burstTimer = cfg.burstInterval || 4;
    this.burstTarget = target;
    this.burstOwnerIndex = ownerIndex;
  }

  _fireSingleBurstRound(target, ownerIndex) {
    if (this.magazineBullets <= 0) return;
    const cfg = this.weaponConfig || CONFIG.m4a1 || CONFIG.rifle || {};
    this.magazineBullets--;
    this.muzzleFlashTimer = cfg.flashDuration || 4;
    this.gunRecoil = cfg.recoilDistance ? (cfg.recoilDistance / 6.0) : 1.0;

    // Ensure cooldown remains locked during burst
    if (this.burstShotsRemaining <= 1) {
      this.shootCooldown = this.shootCooldownMax || cfg.fireCooldown || 24;
    } else {
      this.shootCooldown = cfg.fireCooldown || 24;
    }

    const fireAngle = this.getFireAngle(target);

    // Subtle burst spread variance
    const spread = (Math.random() - 0.5) * 0.03;
    const shotAngle = fireAngle + spread;

    // Spawn tip position at muzzle
    const muzzle = this.getMuzzlePosition(shotAngle, 42);

    // Fire supersonic rifle projectile using centralized factory
    this.createTacticalBullet(muzzle.x, muzzle.y, shotAngle, cfg.projectileSpeedMultiplier || 2.6, this.damage, ownerIndex, {
      r: 5.5,
      length: 17,
      width: 3.2,
      radius: cfg.bulletRadius || 4.8,
      life: cfg.bulletLife || 95,
      caliberScale: 1.0,
      historyMax: 14
    });

    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX(cfg.sounds?.fire || 'Assets/Sound Effects/Attacks/m4a1-fire.mp3', cfg.soundVolumes?.fire ?? 0.25, 1.05);
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
