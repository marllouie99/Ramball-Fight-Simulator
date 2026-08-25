// ─────────────────────────────────────────────
// TACTICAL FORCE — BARRETT M82 FIGHTER
// .50 BMG Semi-Automatic Anti-Materiel Marksman
// ─────────────────────────────────────────────

import { TacticalBaseFighter } from './TacticalBaseFighter.js';
import { CONFIG } from '../../js/core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../js/core/state.js';
import { projectileSystem } from '../../js/systems/projectileSystem.js';
import { audioSystem } from '../../js/systems/audioSystem.js';
import { drawBarrettWeapon } from '../weapons/barrettWeapon.js';
import { drawBarrettSkin } from '../skins/barrettSkin.js';
import { hasLineOfSight } from '../maps/index.js';

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
    this.isTacticalFighter = true;
    this.gameCategory = 'tactical';
    this.spinDirection = Math.random() < 0.5 ? 1 : -1;

    this.characterId = 'barrett';
    this.name = def.name || 'BARRETT';
    this.color = def.color || color || cfg.color || '#06b6d4';
    this.themeColor = this.color;
    this.customConfig = customConfig;

    // Tactical Ammo & Magazine System
    this.maxMagazine = cfg.magazineSize || 10;
    this.magazineBullets = this.maxMagazine;
    this.reloadDuration = cfg.reloadTime || 75;
    this.reloadTimer = 0;
    this.isReloading = false;

    // Bolt Action / Reciprocating Bolt Racking & Crack Animation (Like Shotgun)
    this.boltDuration = cfg.boltDuration || 28;
    this.boltTimer = 0;
    this._boltCrackPlayed = false;

    // Recoil, Flash & Laser Aiming
    this.gunRecoil = 0;
    this.muzzleFlashTimer = 0;
    this.laserSightAlpha = cfg.laserSightAlpha || 0.50;
  }

  reset() {
    super.reset();
    const cfg = CONFIG.barrett || {};
    this.maxMagazine = cfg.magazineSize || 10;
    this.magazineBullets = this.maxMagazine;
    this.reloadDuration = cfg.reloadTime || 75;
    this.reloadTimer = 0;
    this.isReloading = false;
    this.boltDuration = cfg.boltDuration || 28;
    this.boltTimer = 0;
    this._boltCrackPlayed = false;
    this.lastAimAligned = false;
    this.shootDebounce = 0;
  }

  update(opponent, ownerIndex, arena) {
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    const cfg = CONFIG.barrett || {};

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer--;
    }
    if (this.gunRecoil > 0) {
      this.gunRecoil = Math.max(0, this.gunRecoil - 0.08);
    }

    if (this.shootDebounce > 0) {
      this.shootDebounce--;
    }

    // Heavy Reciprocating Bolt Racking & Mechanical Crack Trigger
    if (this.boltTimer > 0) {
      this.boltTimer--;
      if (this.boltTimer === Math.floor(this.boltDuration / 2) && !this._boltCrackPlayed) {
        this._boltCrackPlayed = true;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX(cfg.sounds?.bolt || 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3', cfg.soundVolumes?.bolt ?? 0.40, 0.90);
        }
      }
    }

    // Reload system
    if (this.isReloading) {
      this.reloadTimer--;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        this.magazineBullets = this.maxMagazine;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX(cfg.sounds?.reload || 'Assets/Sound Effects/Skills/johnwick-m4-reload.mp3', cfg.soundVolumes?.reload ?? 0.35);
        }
        spawnFloatingText(this.x, this.y - this.r - 15, 'CHAMBERED', this.color || '#06b6d4');
      }
    } else if (this.magazineBullets <= 0) {
      this.isReloading = true;
      this.reloadTimer = this.reloadDuration;
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash1', 0.25, 0.85);
      }
      spawnFloatingText(this.x, this.y - this.r - 15, 'RELOADING...', '#94a3b8');
    }

    // Recoil animation recovery
    if (this.gunRecoil > 0) {
      this.gunRecoil = Math.max(0, this.gunRecoil * 0.80 - 0.05);
    }

    // Rotational spin sweep aim detection
    const canAct = (!this.paralyzeTimer || this.paralyzeTimer <= 0) && !this.isCaughtInBeam() && (!this.boltTimer || this.boltTimer <= 0);
    if (canAct && !this.isReloading && opponent && opponent.hp > 0 && !opponent.isDead) {
      const isSweeping = this.checkSpinSweep(opponent, CONFIG.tactical?.aimAlignmentThreshold || 0.16);

      if (isSweeping && !this.lastAimAligned && this.shootDebounce <= 0) {
        if (hasLineOfSight(this.x, this.y, opponent.x, opponent.y)) {
          this.shoot(opponent, ownerIndex);
          this.shootDebounce = 8;
        }
      }
      this.lastAimAligned = isSweeping;
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
    if (this.boltTimer > 0) return;

    if (!target || target.hp <= 0) {
      if (typeof state !== 'undefined' && state.fighters) {
        let bestDist = Infinity;
        for (let fi = 0; fi < state.fighters.length; fi++) {
          const f = state.fighters[fi];
          if (!f || f === this || f.hp <= 0) continue;
          const d = Math.hypot(f.x - this.x, f.y - this.y);
          if (d < bestDist) {
            bestDist = d;
            target = f;
          }
        }
      }
    }

    if (target && target.hp > 0 && !hasLineOfSight(this.x, this.y, target.x, target.y)) return;

    const cfg = CONFIG.barrett || {};
    this.magazineBullets--;
    this.muzzleFlashTimer = cfg.flashDuration || 6;
    this.boltTimer = this.boltDuration;
    this._boltCrackPlayed = false;
    this.gunRecoil = cfg.recoilDistance ? (cfg.recoilDistance / 8.0) : 2.2;

    let fireAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
    if (target && target.hp > 0) {
      const targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
      let diff = targetAngle - fireAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) <= 0.22) {
        fireAngle = targetAngle;
        this.angle = targetAngle;
        this.gunAngle = targetAngle;
      }
    }

    // Trigger high-caliber shockwave shake
    triggerGlobalScreenShake(cfg.screenShakeIntensity || 11.0, cfg.screenShakeDuration || 9);

    // Spawn tip position at muzzle brake crown
    const scaleFactor = (this.r / 25);
    const tipDist = this.r + 55 * scaleFactor;
    const spawnX = this.x + Math.cos(fireAngle) * tipDist;
    const spawnY = this.y + Math.sin(fireAngle) * tipDist;

    // Fire hyper-velocity armor-piercing anti-materiel round
    const speed = (CONFIG.projectile?.speed || 7) * (this._def?.projectileSpeedMultiplier || cfg.projectileSpeedMultiplier || 3.8);
    const proj = projectileSystem.fireProjectile(this, ownerIndex, this.damage, false, speed, false, 'tacticalBullet', spawnX, spawnY, fireAngle);
    if (proj) {
      proj.r = 8.0 * scaleFactor;
      proj.bulletLength = 26 * scaleFactor;
      proj.bulletWidth = 5.0 * scaleFactor;
      proj.bulletRadius = (cfg.bulletRadius || 6.5) * scaleFactor;
      proj.life = cfg.bulletLife || 130;
      proj.tacticalCaliberScale = 1.35 * scaleFactor;
      proj.historyMax = 22;
    }

    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX(cfg.sounds?.fire || 'Assets/Sound Effects/Attacks/barrett-m82-fire.mp3', cfg.soundVolumes?.fire ?? 0.85, 0.90);
    }
  }

  triggerDemoAttack() {
    const cfg = CONFIG.barrett || {};
    this.muzzleFlashTimer = cfg.flashDuration || 6;
    this.boltTimer = this.boltDuration;
    this._boltCrackPlayed = false;
    this.gunRecoil = 2.2;
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX(cfg.sounds?.fire || 'Assets/Sound Effects/Attacks/awp-fire.mp3', cfg.soundVolumes?.fire ?? 0.85, 0.90);
    }
  }

  draw(ctx) {
    const isFaceOff = this._isFaceOff || (typeof state !== 'undefined' && state.gameState === 'faceoff') || this._isPreview;
    const angle = this._isWinnerReveal ? 0 : (this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0));

    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.rotate(angle);

    // Upright vertical mirroring for showoff / face-off screens so right-side fighters are not upside down
    const facingLeft = Math.abs(angle) > Math.PI / 2;
    if (facingLeft && (isFaceOff || !this.isSpinning)) {
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
