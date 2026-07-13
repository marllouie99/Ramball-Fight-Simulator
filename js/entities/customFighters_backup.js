// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  ⚠️  UNUSED BACKUP FILE - DO NOT IMPORT OR EDIT                            ║
// ║                                                                              ║
// ║  This file is kept for reference only. All fighter classes have been        ║
// ║  migrated to individual modular files in:                                   ║
// ║    → js/entities/fighters/                                                  ║
// ║                                                                              ║
// ║  The fighterFactory.js imports from the modular files, NOT this file.       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//
// ─────────────────────────────────────────────
// CUSTOM FIGHTERS (ARCHIVED)
// ─────────────────────────────────────────────
import { Fighter, applyDamageToTarget } from './fighter.js';
import { CONFIG, GUN_TIP_DIST } from './config.js';
import { GAME_MODES } from './modeConfig.js';
import { projectileSystem } from './projectileSystem.js';
import { state, spawnFloatingText } from './state.js';
import { playSound, playLoopingSound, fadeOutLoopingSound } from './soundSystem.js';
import { getBasicAttackSound } from './soundEffects/basicAttackSounds.js';
import { getSkillSound } from './soundEffects/skillSounds.js';
import { getSkillEffectSound } from './soundEffects/skillEffectSounds.js';
import {
  drawRedSniperGun,
  drawBlueAimbotGun,
  drawGreenBottleGun,
  drawGreenBoilingEffect,
  drawWhiteRailgun,
  drawWhiteChargeEffect,
  drawGrayShield,
  drawGraySword,
  drawGrayBrokenSword,
  drawDarkSlateGrayShuriken,
  drawDarkSlateGrayMelee,
  drawShurikenProjectile,
  drawOrangeFlamethrowerGun,
  drawBerserkerDualAxes,
  drawCronosCrescentBlade,
  drawSpikeWeapon,
} from './weaponVisuals.js';
import { drawGunSlingerDualRevolver, GUNSLINGER_WEAPON_GRAPHICS } from './weaponGraphic/gunSlingerWeaponGraphics.js';
import { drawCronosSphereVisual, drawCronosPreActivateBarrier, drawCronosSphereImpact } from './draw.js';
import { drawBomberGrenade } from './weaponGraphic/bomberWeaponGraphics.js';
import { drawVoidmasterWeapon } from './weaponGraphic/voidmasterWeaponGraphics.js';
import { flamewardenFlameSystem } from './weaponGraphic/flamewardenWeaponGraphics.js';
import { drawDopplegangerPurpleSword, drawDopplegangerBodyEffect } from './weaponGraphic/dopplegangerWeaponGraphics.js';

import { drawDoppelgangerSkin } from './FighterGraphic/doppelgangerSkin.js';
import { drawSpikeSkin } from './FighterGraphic/spikeSkin.js';
import { spawnIllusionSpawn } from './illusionSpawnEffect.js';
import { spawnBerserkerRageEffect } from './berserkerRageEffect.js';

/**
 * Standard Normal Fighter
 * Retains all default behavior from the base Fighter class.
 */
class NormalFighter extends Fighter {
  constructor(def) {
    super(def);
    this.lastAimAligned = false;

    // Sharpshooter (was Crimson Sniper) Magazine system
    this.isSniper = (this._def?.id === 1);
    if (this.isSniper) {
      this.magazineBullets = CONFIG.normal.magazineSize;
      this.maxMagazine = CONFIG.normal.magazineSize;
      this.reloadTimer = 0;
      this.isReloading = false;
      this.reloadFinishFlash = 0;
    }
  }

  reset() {
    super.reset();
    if (this.isSniper) {
      this.magazineBullets = this.maxMagazine;
      this.reloadTimer = 0;
      this.isReloading = false;
      this.reloadFinishFlash = 0;
    }
  }

  normalizeAngle(angle) {
    while (angle <= -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  }


  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    if (this.isSniper) {
      if (this.reloadFinishFlash > 0) this.reloadFinishFlash--;

      // Handle Reloading
      if (this.isReloading) {
        if (this.reloadTimer > 0) {
          this.reloadTimer--;
        } else {
          this.magazineBullets = this.maxMagazine;
          this.isReloading = false;
          spawnFloatingText(this.x, this.y - this.r - 20, 'RELOADED!', '#ffff00');
          this.reloadFinishFlash = 20; // Trigger a bright flash
          this.gunRecoil = 8; // Small gun kick as it chambers a round
        }
      }

      // Auto-reload when empty
      if (this.magazineBullets <= 0 && !this.isReloading) {
        this.isReloading = true;
        this.reloadTimer = CONFIG.normal.reloadTime;
        this.reloadDropX = this.x;
        this.reloadDropY = this.y;
        spawnFloatingText(this.x, this.y - this.r - 20, 'RELOADING...', '#ff3333');
        const reloadSound = getSkillEffectSound(this._def?.id, 'reload');
        if (reloadSound) {
          playSound(reloadSound.src, reloadSound.volume, reloadSound.speed || 1.0);
        }
      }
    }

    if (opponent) {
      const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      const delta = this.normalizeAngle(targetAngle - this.angle);
      const aligned = Math.abs(delta) < CONFIG.normal.aimThreshold;
      const canShoot = (!this.isSniper || !this.isReloading);

      if (aligned && !this.lastAimAligned && this.shootCooldown === 0 && canShoot) {
        const redSpeed = CONFIG.projectile.speed * (this._def.projectileSpeedMultiplier || 1);

        // Calculate exact tip position for Crimson Sniper's elongated rifle
        let customSpawnX, customSpawnY;
        let visualType = undefined;
        if (this._def?.id === 1 || this._def.type === 'normal') {
          const scale = 0.92;
          const baseX = this.r + 4;
          const barrelLength = this.r * 2.65 * scale;
          const customTipDist = baseX + barrelLength;
          customSpawnX = this.x + Math.cos(this.angle) * customTipDist;
          customSpawnY = this.y + Math.sin(this.angle) * customTipDist;
          if (this._def?.id === 1) {
            visualType = 'crimsonSniperBullet';
            this.magazineBullets--; // Consume ammo
          }
        }

        projectileSystem.fireProjectile(this, ownerIndex, this.damage, false, redSpeed, false, visualType, customSpawnX, customSpawnY);
        this.shootCooldown = CONFIG.normal.shotCooldown;

        // Play Sharpshooter shot sound with configurable timing
        if (this._def?.id === 1) {
          // Physics Recoil: Push the sniper backwards when firing
          const recoilForce = 8;
          this.vx -= Math.cos(this.angle) * recoilForce;
          this.vy -= Math.sin(this.angle) * recoilForce;

          // Set visual recoil value to animate the gun drawing
          this.gunRecoil = 1.0;

          const sound = getBasicAttackSound(this._def?.id, this._def?.type);
          this._attackSoundTimer = sound.delay;
          this._attackSoundConfig = sound;
        }
      }
      this.lastAimAligned = aligned;
    }

    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    }

    // Decay visual recoil
    if (this.gunRecoil > 0) {
      this.gunRecoil = Math.max(0, this.gunRecoil - 0.08); // decays over ~12 frames
    }

    let moveMultiplier = 1.0;
    let spinMultiplier = 1.0;

    if (this.isSniper && this.isReloading) {
      moveMultiplier = 0.2; // Move very slow
      spinMultiplier = 0.0; // Stop spinning
    }

    this.x += this.vx * moveMultiplier;
    this.y += this.vy * moveMultiplier;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate) * spinMultiplier;

    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);
  }

  onDamageDealt(target, projectile, ownerIndex) {
    // Apply standard knockback visual and physics for Normal fighters
    spawnFloatingText(target.x, target.y - target.r - 5, 'KNOCKBACK!', '#ff7733');
    const knockbackStrength = CONFIG.normal.knockbackStrength;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    target.knockbackVx = (target.knockbackVx || 0) + (dx / dist) * knockbackStrength;
    target.knockbackVy = (target.knockbackVy || 0) + (dy / dist) * knockbackStrength;
  }

  /** Custom sniper-style gun for Red. */
  drawGun(ctx) {
    drawRedSniperGun(
      ctx,
      this.x,
      this.y,
      this.gunAngle,
      this.r,
      this.gunRecoil || 0,
      this.magazineBullets,
      this.maxMagazine,
      this.reloadTimer,
      this.isReloading,
      this.reloadFinishFlash || 0
    );
  }

  draw(ctx) {
    super.draw(ctx);
    if (this.isSniper) {
      this.drawMagazineBar(ctx);
    }
  }

  drawMagazineBar(ctx) {
    const bullets = this.magazineBullets;
    const max = this.maxMagazine;

    // Position underneath the body
    const startY = this.y + this.r + 15;

    // Calculate total width to center the charges
    const chargeSpacing = 14;
    const totalWidth = (max - 1) * chargeSpacing;
    const startX = this.x - totalWidth / 2;

    const progress = this.isReloading ? 1 - (this.reloadTimer / CONFIG.normal.reloadTime) : (bullets / max);
    const fillAmount = this.isReloading ? progress * max : bullets;

    const drawBattery = (cx, cy, cellProgress, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;

      const w = 5;
      const h = 14;

      // Main Battery Casing (Chamfered Rectangle)
      ctx.fillStyle = '#1c1e21';
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - w, cy - h / 2 + 1);
      ctx.lineTo(cx - w + 1, cy - h / 2);
      ctx.lineTo(cx + w - 1, cy - h / 2);
      ctx.lineTo(cx + w, cy - h / 2 + 1);
      ctx.lineTo(cx + w, cy + h / 2 - 1);
      ctx.lineTo(cx + w - 1, cy + h / 2);
      ctx.lineTo(cx - w + 1, cy + h / 2);
      ctx.lineTo(cx - w, cy + h / 2 - 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Top Contact Node (Metallic)
      ctx.fillStyle = '#8899aa';
      ctx.fillRect(cx - 2, cy - h / 2 - 2, 4, 2);

      // Bottom Base Cap
      ctx.fillStyle = '#555';
      ctx.fillRect(cx - 3, cy + h / 2, 6, 2);

      // Tech Details (Dark panel lines on casing)
      ctx.fillStyle = '#000';
      ctx.fillRect(cx - w + 1, cy - h / 2 + 2, w * 2 - 2, 1);
      ctx.fillRect(cx - w + 1, cy + h / 2 - 3, w * 2 - 2, 1);

      const maxH = h - 8;
      const currentH = maxH * cellProgress;
      const emptyH = maxH - currentH;

      // Draw Empty Part (top)
      if (emptyH > 0) {
        ctx.fillStyle = '#220505';
        ctx.fillRect(cx - w + 1.5, cy - h / 2 + 4, w * 2 - 3, emptyH);
        ctx.fillStyle = '#110000';
        ctx.fillRect(cx - 0.5, cy - h / 2 + 4.5, 1, Math.max(0, emptyH - 0.5));
      }

      // Draw Active Filled Part (bottom)
      if (currentH > 0) {

        const yOffset = emptyH;

        // Energy Core Glass / Glow
        ctx.fillStyle = 'rgba(255, 17, 17, 0.4)';
        ctx.fillRect(cx - w + 0.5, cy - h / 2 + 3.5 + yOffset, w * 2 - 1, currentH + 1);
        ctx.fillStyle = '#ff2222';
        ctx.fillRect(cx - w + 1.5, cy - h / 2 + 4 + yOffset, w * 2 - 3, currentH);

        // Inner white hot filament (vertical line)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 0.5, cy - h / 2 + 4.5 + yOffset, 1, Math.max(0, currentH - 0.5));

        // Horizontal energy ribs over the filament
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.8 * alpha;
        for (let rY = cy + h / 2 - 4 - 0.5; rY >= cy - h / 2 + 4 + yOffset + 0.5; rY -= 2) {
          ctx.fillRect(cx - 1.5, rY - 0.5, 3, 0.5);
        }
        ctx.globalAlpha = alpha;
      }
      ctx.restore();
    };

    if (this.isReloading && progress < 0.25) {
      // Draw the old empty batteries falling away ON THE GROUND where the player reloaded
      const fallProgress = progress / 0.25;
      const fallOffset = fallProgress * 50; // drop down 50px
      const fallAlpha = 1 - fallProgress;

      const dropStartY = (this.reloadDropY || this.y) + this.r + 15;
      const dropStartX = (this.reloadDropX || this.x) - totalWidth / 2;

      for (let i = 0; i < max; i++) {
        const cx = dropStartX + i * chargeSpacing;

        // Add scatter and rotation to make it look like physical debris
        const direction = (i % 2 === 0 ? -1 : 1);
        const scatterX = direction * (i * 3 + 4) * fallProgress;
        const angle = direction * fallProgress * (Math.PI * 1.5); // Spin as they fall

        ctx.save();
        ctx.translate(cx + scatterX, dropStartY + fallOffset);
        ctx.rotate(angle);

        // Draw with 10% residual glow (cellProgress = 0.1) so they stand out against the dark ground
        drawBattery(0, 0, 0.1, fallAlpha);
        ctx.restore();
      }
    }

    // Draw the active/new batteries
    for (let i = 0; i < max; i++) {
      const cx = startX + i * chargeSpacing;

      if (this.isReloading) {
        let cellProgress = Math.max(0, Math.min(1, fillAmount - i));
        if (cellProgress > 0) {
          // As it starts filling, it drops down from above (slide in)
          const slideProgress = Math.min(1, cellProgress / 0.5); // animate entry fast
          const slideOffset = (1 - slideProgress) * -10; // drops from 10px above
          drawBattery(cx, startY + slideOffset, cellProgress, slideProgress);
        }
      } else {
        const cellProgress = (i < bullets) ? 1 : 0;
        drawBattery(cx, startY, cellProgress, 1);
      }
    }

    if (this.isReloading) {
      ctx.fillStyle = '#ff6666';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('RELOADING', this.x, startY + 12);
    }
  }
}

/**
 * Aimbot Fighter
 * Auto-aims at the opponent and displays a targeting laser,
 * custom colored gun, custom outline glow, and a badge.
 */
class AimbotFighter extends Fighter {
  constructor(def) {
    super(def);
  }

  /** Overrides aimbot behavior to lock onto opponent's position. */
  aim(opponent) {
    if (!opponent || opponent.invincibilityTimer > 0 || opponent.flashStepTimer > 0) return;
    this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
  }

  onDamageDealt(target, projectile, ownerIndex) {
    // Blue fires an immediate follow-up shot only on original projectiles.
    if (!projectile.isFollowUp && projectileSystem) {
      spawnFloatingText(target.x, target.y - target.r - 5, 'DOUBLE SHOT!', '#00eaff');

      const customTipDist = this.r + CONFIG.gun.baseOffset + 24;
      const customSpawnX = this.x + Math.cos(this.gunAngle) * customTipDist;
      const customSpawnY = this.y + Math.sin(this.gunAngle) * customTipDist;

      projectileSystem.fireProjectile(this, ownerIndex, this.damage, true, undefined, false, undefined, customSpawnX, customSpawnY);
      this.shootCooldown = Math.max(CONFIG.aimbot.followUpMinCooldown, Math.floor(this.shootCooldownMax / 2));

      // Play follow-up attack sound with same timing as the primary shot.
      const sound = getBasicAttackSound(this._def?.id, this._def?.type);
      this._attackSoundTimer = sound.delay;
      this._attackSoundConfig = sound;
    }
  }

  /** Override shoot to spawn projectiles at the custom gun tip */
  shoot(ownerIndex) {
    if (projectileSystem) {
      const customTipDist = this.r + CONFIG.gun.baseOffset + 24;
      const customSpawnX = this.x + Math.cos(this.gunAngle) * customTipDist;
      const customSpawnY = this.y + Math.sin(this.gunAngle) * customTipDist;
      projectileSystem.fireProjectile(this, ownerIndex, this.damage, false, undefined, false, undefined, customSpawnX, customSpawnY);
    }
    const sound = getBasicAttackSound(this._def?.id, this._def?.type);
    this._attackSoundTimer = sound.delay;
    this._attackSoundConfig = sound;
  }

  /** Custom outline with cyan glow. */
  drawOutline(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00eaff70';
    ctx.stroke();
  }

  /** Custom gun for Blue Aimbot. */
  drawGun(ctx) {
    drawBlueAimbotGun(ctx, this.x, this.y, this.gunAngle, this.r);
  }

  /** Draws a dashed target locking laser. */
  drawTargetingLaser(ctx, opponent) {
    const customTipDist = this.r + CONFIG.gun.baseOffset + 24;
    const tx = this.x + Math.cos(this.gunAngle) * customTipDist;
    const ty = this.y + Math.sin(this.gunAngle) * customTipDist;

    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(opponent.x, opponent.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /** Overrides standard draw to add laser. */
  draw(ctx, opponent) {
    // Note: Opponent is needed for drawing the laser
    if (opponent && opponent.invincibilityTimer === 0 && opponent.flashStepTimer === 0) {
      this.drawTargetingLaser(ctx, opponent);
    }
    super.draw(ctx);
  }
}

/**
 * Melee Fighter (Yellow)
 * Deals contact damage upon collision, and draws rotating spikes around its body.
 */
class MeleeFighter extends Fighter {
  constructor(def) {
    super(def);
    this.speedBoostTimer = 0;
    this.trailHistory = [];
  }

  reset() {
    super.reset();
    this.meleeCooldown = 0;
    this.speedBoostTimer = 0;
    this.trailHistory = [];
  }


  /** Gold outline for yellow fighter. */
  drawOutline(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd700';
    ctx.stroke();
  }

  /** Draw outer spikes rotating around the body instead of a barrel. */
  drawGun(ctx) {
    drawSpikeWeapon(ctx, this.x, this.y, this.angle, this.r);
  }

  /** Contact damage hook. */
  onCollide(opponent) {
    if (this.meleeCooldown === 0) {
      // TUNING: contact damage and melee hit cooldown can be adjusted here.
      opponent.takeDamage(this.damage, this, { isMelee: true });
      spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, 'SMASH!', '#ffd700');
      // TUNING: melee attack cooldown in frames.
      this.meleeCooldown = this.shootCooldownMax;
      this.applySpeedBoost();
      const sound = getBasicAttackSound(this._def?.id, this._def?.type);
      this._attackSoundTimer = sound.delay;
      this._attackSoundConfig = sound;
    }
  }

  applySpeedBoost() {
    this.speedBoostTimer = CONFIG.melee.speedBoostDuration;
    this.speed = this.baseSpeed * CONFIG.melee.speedBoostMultiplier;
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer--;
      if (this.speedBoostTimer === 0) {
        this.speed = this.baseSpeed;
      }
    }

    if (this.meleeCooldown > 0) {
      this.meleeCooldown--;
    }

    // Handle slow effect (from laser beam or other sources)
    let targetSpeed = this.speed;
    if (this.slowTimer > 0) {
      this.slowTimer--;
      targetSpeed *= this.slowMultiplier;
    }

    // Apply speed reduction
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
      const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.04;
      this.vx = (this.vx / currentSpeed) * newSpeed;
      this.vy = (this.vy / currentSpeed) * newSpeed;
    }

    this.trailHistory.push({ x: this.x, y: this.y, alpha: 0.5 });
    if (this.trailHistory.length > CONFIG.melee.trailLength) {
      this.trailHistory.shift();
    }

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * CONFIG.spin.rate;

    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);
  }

  resolveWallBounce(arena, opponent) {
    super.resolveWallBounce(arena);

    // Check if we hit a wall (super.resolveWallBounce clamps position to exact bounds)
    const epsilon = 0.01;
    const bounced = (Math.abs(this.x - this.r - arena.x) < epsilon) ||
      (Math.abs(this.x + this.r - (arena.x + arena.width)) < epsilon) ||
      (Math.abs(this.y - this.r - arena.y) < epsilon) ||
      (Math.abs(this.y + this.r - (arena.y + arena.height)) < epsilon);

    if (bounced) {
      const lockChance = CONFIG.melee.rebounceLockChance ?? 0;
      if (Math.random() < lockChance) {
        let target = opponent;

        // Find nearest valid target if opponent not provided or dead
        if (!target || target.hp <= 0) {
          let bestDist = Infinity;
          const myIndex = state.fighters.indexOf(this);
          const myTeam = state.getFighterTeam(myIndex);

          for (let i = 0; i < state.fighters.length; i++) {
            const f = state.fighters[i];
            if (!f || f === this || f.hp <= 0 || f.invincibilityTimer > 0) continue;

            // Skip teammates in 2v2
            if (state.mode === '2v2' && myTeam !== null && myTeam === state.getFighterTeam(i)) continue;

            const dist = Math.hypot(f.x - this.x, f.y - this.y);
            if (dist < bestDist) {
              bestDist = dist;
              target = f;
            }
          }
        }

        if (target) {
          const dx = target.x - this.x;
          const dy = target.y - this.y;
          const d = Math.hypot(dx, dy) || 1;
          const speed = Math.hypot(this.vx, this.vy) || this.speed;
          this.vx = (dx / d) * speed;
          this.vy = (dy / d) * speed;
          this.normalizeSpeed();
        }
      }
    }
  }

  drawBody(ctx) {
    drawSpikeSkin(ctx, this.x, this.y, this.r, this.angle, this.color);
    this.drawStatusOverlays(ctx, this.r);
  }

  draw(ctx) {
    if (this.speedBoostTimer > 0) {
      for (let i = 0; i < this.trailHistory.length; i++) {
        const trail = this.trailHistory[i];
        const opacity = (i + 1) / this.trailHistory.length * 0.4;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = 'gold';
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, this.r * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    super.draw(ctx);
  }
}

/**
 * Grenadier Fighter (Green)
 * Throws a grenade when the enemy enters its radius.
 * Grenade deals AOE damage and poisons the enemy.
 */
class GrenadierFighter extends Fighter {
  constructor(def) {
    super(def);
    this.attackRadius = CONFIG.grenadier.attackRadius;
    this.attackCooldown = 0;
    this.wasEnemyInRadius = false;
  }

  reset() {
    super.reset();
    this.attackCooldown = 0;
    this.wasEnemyInRadius = false;
    this.throwAnimationTimer = 0;
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    if (this.throwAnimationTimer > 0) {
      this.throwAnimationTimer--;
    }

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);

    if (!opponent) return;

    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }

    const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    const inRadius = dist <= this.attackRadius;

    if (inRadius && this.attackCooldown === 0) {
      this.shootGrenade(ownerIndex, opponent);
      this.attackCooldown = CONFIG.grenadier.throwCooldown;
    }

    this.wasEnemyInRadius = inRadius;
  }

  resolveWallBounce(arena, opponent) {
    if (!opponent) {
      super.resolveWallBounce(arena);
      return;
    }

    let bounced = false;
    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      bounced = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      bounced = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      bounced = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      bounced = true;
    }

    if (bounced) {
      this.playWallBounceSound();
      const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;
      const hx = opponent.x - this.x;
      const hy = opponent.y - this.y;
      const hDist = Math.hypot(hx, hy) || 1;
      this.vx = (hx / hDist) * currentSpeed;
      this.vy = (hy / hDist) * currentSpeed;
    }
  }

  shootGrenade(ownerIndex, opponent) {
    this.throwAnimationTimer = 15; // 15 frames for throw animation
    if (projectileSystem) {
      try {
        projectileSystem.fireGrenade(this, ownerIndex, this.damage, opponent);
      } catch (e) {
        console.error('Grenade fire error:', e);
      }
    }
  }

  onDamageDealt(target, projectile, ownerIndex) {
    spawnFloatingText(target.x, target.y - target.r - 5, 'BOOM!', '#4dff4d');
  }

  aim(opponent) {
    if (opponent) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }
  }

  drawOutline(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#4dff4d';
    ctx.stroke();

    // Draw attack radius
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.attackRadius, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(77, 255, 77, 0.2)';
    ctx.stroke();
  }

  drawGun(ctx) {
    const throwProgress = this.throwAnimationTimer > 0
      ? Math.sin((this.throwAnimationTimer / 15) * Math.PI)
      : 0;
    drawGreenBottleGun(ctx, this.x, this.y, this.gunAngle, this.r, throwProgress);
  }

  drawBoilingEffect(ctx) {
    const shouldBoil = this.wasEnemyInRadius || this.attackCooldown === 0;
    drawGreenBoilingEffect(ctx, this.x, this.y, this.gunAngle, this.r, shouldBoil);
  }

  draw(ctx) {
    super.draw(ctx);
    this.drawBoilingEffect(ctx);
  }
}

/**
 * Laser Fighter (White)
 * Fires a continuous laser beam for 3 seconds when aligned with the enemy.
 * Stops moving while the beam is firing.
 * Deals initial high damage, then continuous damage over time.
 */
class LaserFighter extends Fighter {
  constructor(def) {
    super(def);
    this.lastAimAligned = false;
    this.beamTimer = 0;
    this.beamDuration = CONFIG.laser.beamDuration;
    this.beamSlowDuration = CONFIG.laser.slowDuration;
    this.beamSlowMultiplier = CONFIG.laser.slowMultiplier;
    this.beamHitState = new Map();
    this._laserSoundKey = null;
    this._isLaserSoundPlaying = false;
  }

  reset() {
    super.reset();
    this.lastAimAligned = false;
    this.beamTimer = 0;
    this.beamHitState = new Map();
    this.beamCharge = 0;
    this._laserSoundKey = null;
    this._isLaserSoundPlaying = false;
  }

  normalizeAngle(angle) {
    while (angle <= -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  }

  aim(opponent) {
    if (opponent) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }
  }

  getBeamLine() {
    const tipDist = GUN_TIP_DIST(this.r);
    const startX = this.x + Math.cos(this.gunAngle) * tipDist;
    const startY = this.y + Math.sin(this.gunAngle) * tipDist;
    const beamLength = CONFIG.laser.beamLength;
    const endX = startX + Math.cos(this.gunAngle) * beamLength;
    const endY = startY + Math.sin(this.gunAngle) * beamLength;

    return { startX, startY, endX, endY };
  }

  getBeamHitFighters(fighters) {
    if (!fighters || fighters.length === 0) return [];

    const { startX, startY, endX, endY } = this.getBeamLine();
    const dx = endX - startX;
    const dy = endY - startY;
    const l2 = dx * dx + dy * dy;

    if (l2 === 0) return [];

    const hitFighters = [];

    for (let fi = 0; fi < fighters.length; fi++) {
      const fighter = fighters[fi];
      if (!fighter || fighter === this || fighter.hp <= 0) continue;

      let t = ((fighter.x - startX) * dx + (fighter.y - startY) * dy) / l2;
      t = Math.max(0, Math.min(1, t));

      const projX = startX + t * dx;
      const projY = startY + t * dy;
      const distToCenter = Math.hypot(fighter.x - projX, fighter.y - projY);

      if (distToCenter <= fighter.r + 4) {
        hitFighters.push(fighter);
      }
    }

    return hitFighters;
  }

  applyBeamEffectsToTarget(target, ownerIndex) {
    if (!target || target === this) return;

    let hitState = this.beamHitState.get(target);
    if (!hitState) {
      hitState = { initialHitDone: false, continuousDamageTimer: 0 };
      this.beamHitState.set(target, hitState);
    }

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (!hitState.initialHitDone) {
      // Initial hit: apply damage + slow (and optionally a tiny start push)
      const applied = target.takeDamage(this.damage, this, { isProjectile: true, isLaser: true });
      if (applied) {
        // Slow (chance)
        const slowChance = Number(CONFIG.laser.slowChance || 1);
        const shouldSlow = slowChance >= 1 ? true : (Math.random() <= slowChance);
        if (shouldSlow) {
          target.applySlow(this.beamSlowDuration, this.beamSlowMultiplier);
          spawnFloatingText(target.x, target.y - target.r - 5, 'SLOWED!', '#88ccff');
        }

        // Optional start push using existing config magnitude.
        const startPush = Number(CONFIG.laser.initialKnockback) || 0;
        if (startPush !== 0) {
          target.vx += (dx / dist) * startPush;
          target.vy += (dy / dist) * startPush;
        }

        hitState.initialHitDone = true;
        spawnFloatingText(target.x, target.y - target.r - 5, 'BEAM HIT!', '#ccffff');

        if (typeof this.onDamageDealt === 'function') {
          this.onDamageDealt(target, { damage: this.damage, isLaser: true }, ownerIndex);
        }
      }
      return;
    }

    // Continuous contact: tick damage and apply continuous push every tick interval.
    hitState.continuousDamageTimer++;
    if (hitState.continuousDamageTimer >= CONFIG.laser.tickInterval) {
      const applied = target.takeDamage(CONFIG.laser.tickDamage, this, { isProjectile: true, isLaser: true });
      if (applied) {
        // Continuous push direction (from beam owner -> target)
        const pushStrength = Number(CONFIG.laser.initialKnockback) || 0;
        if (pushStrength !== 0) {
          target.vx += (dx / dist) * pushStrength;
          target.vy += (dy / dist) * pushStrength;
        }

        spawnFloatingText(target.x, target.y - target.r - 5, 'ZZZAP!', '#ffff88');
        if (typeof this.onDamageDealt === 'function') {
          this.onDamageDealt(target, { damage: CONFIG.laser.tickDamage, isLaser: true }, ownerIndex);
        }
      }
      hitState.continuousDamageTimer = 0;
    }
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    }

    if (this.beamTimer > 0) {
      this.beamTimer--;

      // Slowly rotate toward the target while firing the beam
      if (opponent) {
        const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        const delta = this.normalizeAngle(targetAngle - this.gunAngle);
        const maxRotate = CONFIG.laser.beamRotateSpeed || 0.015;
        if (Math.abs(delta) > maxRotate) {
          this.gunAngle += Math.sign(delta) * maxRotate;
        } else {
          this.gunAngle = targetAngle;
        }
      }

      const hitFighters = this.getBeamHitFighters(state.fighters);
      for (const fighter of hitFighters) {
        this.applyBeamEffectsToTarget(fighter, ownerIndex);
      }

      // drift slowly backward while firing the beam using a gentle velocity effect.
      const backwardSpeed = Number(CONFIG.laser.beamBackwardSpeed) || 0;
      const beamRecoilX = -Math.cos(this.gunAngle) * backwardSpeed;
      const beamRecoilY = -Math.sin(this.gunAngle) * backwardSpeed;
      const retention = Number(CONFIG.laser.beamDriftRetention) || 0.92;
      const blend = Number(CONFIG.laser.beamDriftBlend) || 0.08;

      // FIX: White should not apply the *target slow* logic to himself.
      // During beam fire we only apply beam recoil/retention.
      const beamVx = this.vx * retention + beamRecoilX * blend;
      const beamVy = this.vy * retention + beamRecoilY * blend;
      this.vx = beamVx;
      this.vy = beamVy;

      this.x += this.vx;
      this.y += this.vy;
      this.resolveWallBounce(arena);
      return;
    }

    // Resume movement after the beam ends if White has no current velocity.
    if (this.vx === 0 && this.vy === 0) {
      const resumeAngle = this.gunAngle || this.angle || (Math.random() * Math.PI * 2);
      this.vx = Math.cos(resumeAngle) * this.speed;
      this.vy = Math.sin(resumeAngle) * this.speed;
    }

    if (opponent) {
      this.aim(opponent);
      const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      const delta = this.normalizeAngle(targetAngle - this.gunAngle);
      const aligned = Math.abs(delta) < CONFIG.laser.aimThreshold;

      if (aligned && this.shootCooldown === 0) {
        if (this.beamCharge === 0) {
          const chargeSound = getSkillEffectSound(this._def?.id, 'lasercharge');
          if (chargeSound) playSound(chargeSound.src, chargeSound.volume);
        }
        this.beamCharge = Math.min(this.beamCharge + 1, CONFIG.laser.windupDuration);
      } else {
        this.beamCharge = Math.max(this.beamCharge - 1, 0);
      }

      if (aligned && this.shootCooldown === 0 && this.beamCharge >= CONFIG.laser.windupDuration) {
        this.beamTimer = this.beamDuration;
        this.shootCooldown = this.shootCooldownMax;
        this.beamHitState.clear();
        this.beamCharge = 0;

        if (!this._laserSoundKey) {
          this._laserSoundKey = `ivory-laser-${ownerIndex}`;
        }
        if (!this._isLaserSoundPlaying) {
          const sound = getBasicAttackSound(this._def?.id, this._def?.type);
          playLoopingSound(this._laserSoundKey, sound.src, sound.volume);
          this._isLaserSoundPlaying = true;
        }

        // Small backward knockback when the beam starts, then slow drift backward.
        const kickback = CONFIG.laser.beamStartKnockback;
        this.vx += -Math.cos(this.gunAngle) * kickback;
        this.vy += -Math.sin(this.gunAngle) * kickback;
      }
      this.lastAimAligned = aligned;
    }

    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    this.aim(opponent);
    this.resolveWallBounce(arena);

    // Fade out the laser sound when the beam ends.
    if (this.beamTimer === 0 && this._isLaserSoundPlaying) {
      fadeOutLoopingSound(this._laserSoundKey, 300);
      this._isLaserSoundPlaying = false;
    }
  }

  draw(ctx) {
    if (this.beamCharge > 0 && this.beamTimer === 0) {
      this.drawChargeEffect(ctx);
    }

    if (this.beamTimer > 0) {
      ctx.save();
      const { startX, startY, endX, endY } = this.getBeamLine();
      const dx = endX - startX;
      const dy = endY - startY;
      const beamLen = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Use time for smooth pulsing rather than random jitter
      const time = performance.now() / 150;
      const pulse1 = Math.sin(time) * 1.5;
      const pulse2 = Math.cos(time * 1.3) * 2;
      const pulse3 = Math.sin(time * 0.8) * 3;

      // Outer wide glow (cyan)
      ctx.shadowBlur = 0; // Disabled for performance

      // Widest, faintest glow layer
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.08)';
      ctx.lineWidth = (CONFIG.laser.glowWidth || 12) + 12 + pulse3;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Inner wide glow
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
      ctx.lineWidth = (CONFIG.laser.glowWidth || 12) + 4 + pulse3;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Mid bright glow
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = 'rgba(200, 255, 255, 0.5)';
      ctx.lineWidth = (CONFIG.laser.glowWidth || 12) - 2 + pulse2;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Inner core (white)
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = (CONFIG.laser.coreWidth || 4) + pulse1;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Energy nodes traveling down the beam for dynamic flow
      const numNodes = 4;
      const speed = 0.6;
      ctx.shadowBlur = 0; // Ensure shadow blur is off for performance

      for (let i = 0; i < numNodes; i++) {
        // Calculate offset (0 to 1) that wraps around
        let offset = ((time * speed) + (i / numNodes)) % 1.0;
        let nx = startX + Math.cos(angle) * (beamLen * offset);
        let ny = startY + Math.sin(angle) * (beamLen * offset);

        // Node width pulses and is larger near the middle of the beam
        let nodeRadius = 1.5 + Math.sin(offset * Math.PI) * 3;

        // Outer glow layer
        ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(nx, ny, nodeRadius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Inner core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    super.draw(ctx);
  }

  drawChargeEffect(ctx) {
    drawWhiteChargeEffect(ctx, this.x, this.y, this.gunAngle, this.beamCharge, this.r);
  }

  drawGun(ctx) {
    drawWhiteRailgun(ctx, this.x, this.y, this.gunAngle, this.r);
  }

  onDamageDealt(target, projectile, ownerIndex) {
    // Optional: pushback effect when laser hits
    if (projectile && projectile.isLaser && !this.initialHitDone) {
      const knockbackStrength = 1.0;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      target.vx += (dx / dist) * knockbackStrength;
      target.vy += (dy / dist) * knockbackStrength;
    }
  }
}


/**
 * Knight Fighter (Gray)
 * Close-range brawler with a sword and shield.
 *
 * Normal Attack : Auto-swipes sword when enemy is in short range (15 dmg, 2 s CD)
 * Passive       : Shield has a chance to block incoming direct projectiles (no CD)
 * Skill         : On sword-break proc, stops and charges a shield dash → 20 dmg bash,
 *                 then resets sword.
 */
class KnightFighter extends Fighter {
  constructor(def) {
    super(def);
    this.swipeCooldown = 0;
    this.swipeActive = false;
    this.swipeTimer = 0;
    this.swipeAngle = 0;
    this.swordBroken = false;
    this.swordHealth = CONFIG.knight.swordDurability;
    this.shieldBroken = false;
    this.shieldHealth = CONFIG.knight.shieldDurability;
    this.canThrowSword = false; // becomes true when shield breaks
    this.swordThrown = false; // tracks whether the sword was thrown after shield break
    this.swordReturnTimer = 0;
    this.blockFlashTimer = 0;
    // dashState: 'none' | 'charging' | 'dashing'
    this.dashState = 'none';
    this.dashChargeTimer = 0;
    this.dashTimer = 0;
    this.dashVx = 0;
    this.dashVy = 0;
    this.hasHitWithDash = false;
    this.dashTargetX = null; // fixed target locked when sword breaks
    this.dashTargetY = null;
    this.shieldVisualOffset = -Math.PI / 2;
  }

  reset() {
    super.reset();
    this.swipeCooldown = 0;
    this.swipeActive = false;
    this.swipeTimer = 0;
    this.swordBroken = false;
    this.swordHealth = CONFIG.knight.swordDurability;
    this.shieldBroken = false;
    this.shieldHealth = CONFIG.knight.shieldDurability;
    this.canThrowSword = false;
    this.swordThrown = false;
    this.swordReturnTimer = 0;
    this.blockFlashTimer = 0;
    this.dashState = 'none';
    this.dashChargeTimer = 0;
    this.dashTimer = 0;
    this.dashVx = 0;
    this.dashVy = 0;
    this.hasHitWithDash = false;
    this.dashTargetX = null;
    this.dashTargetY = null;
    this.slashFadeTimer = 0;
    this.dashGlowFade = 0;
    this.shieldVisualOffset = -Math.PI / 2;
  }

  // ── Passive: shield block on direct projectile hits and melee attacks ──
  takeDamage(amount, attacker, opts = {}) {
    // Shield blocks direct projectile hits and melee attacks (not while dashing).
    // Some projectile hits pass opts.isProjectile, others provide opts.projectile.
    const isBlockableHit = !!(opts.isProjectile || opts.projectile || opts.isMelee);
    if (isBlockableHit && this.dashState === 'none' && !(this.timeStopTimer > 0)) {
      if (Math.random() < CONFIG.knight.shieldBlockChance) {
        // Shield absorbs this hit; reduce shield health and possibly break
        this.blockFlashTimer = CONFIG.knight.blockFlashFrames;
        this.shieldHealth--;
        // Play shield block sound
        const blockSound = getSkillSound(this._def?.id, 'shieldblock');
        if (blockSound) playSound(blockSound.src, blockSound.volume);
        if (this.shieldHealth <= 0 && !this.shieldBroken) {
          this.shieldBroken = true;
          this.canThrowSword = true; // allow sword throw
          spawnFloatingText(this.x, this.y - this.r - 25, 'SHIELD BREAK!', '#ff6633');
          // Attempt immediate throw so skill triggers even if stationary
          try {
            const ownerIndex = state.fighters.indexOf(this);
            if (ownerIndex >= 0 && projectileSystem) {
              projectileSystem.fireProjectile(this, ownerIndex, CONFIG.knight.shieldThrowDamage, false, CONFIG.projectile.speed * 1.2, false, 'sword');
              this.swordThrown = true;
              this.canThrowSword = false;
              this.swordBroken = true;
              this.swordHealth = 0;
              this.swordReturnTimer = CONFIG.knight.swordReturnFrames;
              spawnFloatingText(this.x + Math.cos(this.gunAngle) * (this.r + 10), this.y + Math.sin(this.gunAngle) * (this.r + 10), 'THROW!', '#ffcc66');
            }
          } catch (e) {
            // ignore
          }
        } else {
          // Keep it quiet on successful block without break
        }
        return false; // absorbed the hit
      }
    }
    return super.takeDamage(amount, attacker, opts);
  }

  // ── Sword swipe ──
  _trySwordSwipe(opponent, ownerIndex) {
    if (!opponent || this.swipeCooldown > 0 || this.swordBroken) return;
    const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    if (dist > this.r + opponent.r + CONFIG.knight.swordRange) return;

    // Hit!
    this.swipeAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.swipeActive = true;
    this.swipeTimer = CONFIG.knight.swipeDuration;
    this.swipeCooldown = CONFIG.knight.swipeCooldown;
    opponent.takeDamage(CONFIG.knight.swordDamage, this, { isMelee: true });
    spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, 'SLASH!', '#e0e0e0');
    // Play sword swing sound
    const swipeSound = getBasicAttackSound(this._def?.id, this._def?.type);
    this._attackSoundTimer = swipeSound.delay;
    this._attackSoundConfig = swipeSound;

    // Reduce durability
    this.swordHealth--;
    if (this.swordHealth <= 0) {
      this._breakSword(opponent);
    }
  }

  _breakSword(opponent) {
    this.swordBroken = true;
    this.vx = 0;
    this.vy = 0;
    // Lock dash target at moment of sword break so opponent can dodge
    if (opponent) {
      this.dashTargetX = opponent.x;
      this.dashTargetY = opponent.y;
    } else {
      // fallback: lock direction forward a set distance
      const lockDist = 220;
      this.dashTargetX = this.x + Math.cos(this.gunAngle) * lockDist;
      this.dashTargetY = this.y + Math.sin(this.gunAngle) * lockDist;
    }
    this.dashState = 'charging';
    this.dashChargeTimer = CONFIG.knight.dashChargeFrames;
    this.hasHitWithDash = false;
    spawnFloatingText(this.x, this.y - this.r - 14, 'SWORD BREAK!', '#ff9933');
    // apply a one-time knockback pulse to nearby enemies when charging begins
    try {
      this.applyChargeKnockback();
    } catch (e) {
      // ignore
    }
  }

  // ── Shield dash launch ──
  _launchDash(opponent) {
    this.dashState = 'dashing';
    this.dashTimer = CONFIG.knight.dashDuration;
    // Dash towards the locked target if present, otherwise toward opponent or current aim
    if (this.dashTargetX != null && this.dashTargetY != null) {
      const dx = this.dashTargetX - this.x;
      const dy = this.dashTargetY - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      this.dashVx = (dx / dist) * CONFIG.knight.dashSpeed;
      this.dashVy = (dy / dist) * CONFIG.knight.dashSpeed;
    } else if (opponent) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      this.dashVx = (dx / dist) * CONFIG.knight.dashSpeed;
      this.dashVy = (dy / dist) * CONFIG.knight.dashSpeed;
    } else {
      this.dashVx = Math.cos(this.gunAngle) * CONFIG.knight.dashSpeed;
      this.dashVy = Math.sin(this.gunAngle) * CONFIG.knight.dashSpeed;
    }
  }

  // One-time knockback applied when charging begins
  applyChargeKnockback() {
    if (!state || !state.fighters) return;
    const radius = CONFIG.knight.chargeKnockbackRadius || 80;
    const kb = CONFIG.knight.chargeKnockback || 2.0;
    for (let i = 0; i < state.fighters.length; i++) {
      const other = state.fighters[i];
      if (!other || other === this) continue;
      // skip dead or unspawned fighters
      if (other.hp <= 0) continue;
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d <= radius) {
        const nx = dx / d;
        const ny = dy / d;
        other.vx += nx * kb;
        other.vy += ny * kb;
        spawnFloatingText(other.x, other.y - other.r - 6, 'KNOCKBACK!', '#ffd4b2');
      }
    }
  }

  _endDash() {
    this.dashState = 'none';
    // restore weapons after dash finishes
    this.restoreWeapons();
    // Continue floating naturally in the last dash direction.
    this.vx = this.dashVx;
    this.vy = this.dashVy;
    this.dashVx = 0;
    this.dashVy = 0;
    this.dashTargetX = null;
    this.dashTargetY = null;
  }

  // ── Smart Bounce ──
  resolveWallBounce(arena, opponent) {
    if (!opponent) {
      super.resolveWallBounce(arena);
      return;
    }

    let bounced = false;
    let bouncedX = false;
    let bouncedY = false;

    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      bounced = true;
      bouncedX = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      bounced = true;
      bouncedX = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      bounced = true;
      bouncedY = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      bounced = true;
      bouncedY = true;
    }

    if (bounced) {
      this.playWallBounceSound();
      if (this.dashState === 'dashing') {
        if (bouncedX) {
          this.dashVx = -this.dashVx;
        }
        if (bouncedY) {
          this.dashVy = -this.dashVy;
        }
        this.vx = this.dashVx;
        this.vy = this.dashVy;
      } else {
        // Instead of physical reflection, bounce perfectly toward the enemy!
        const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;
        const dx = opponent.x - this.x;
        const dy = opponent.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;

        this.vx = (dx / dist) * currentSpeed;
        this.vy = (dy / dist) * currentSpeed;
      }
    }
  }

  // ── Aiming ──
  aim(opponent) {
    if (opponent) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    } else {
      this.gunAngle = Math.atan2(this.vy, this.vx);
    }
  }

  aimAt(tx, ty) {
    if (typeof tx !== 'number' || typeof ty !== 'number') return;
    this.gunAngle = Math.atan2(ty - this.y, tx - this.x);
  }

  normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  // ── Main update ──
  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();
    if (this.blockFlashTimer > 0) this.blockFlashTimer--;

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    // Shield glow fade out logic
    if (this.dashState === 'charging' || this.dashState === 'dashing') {
      this.dashGlowFade = 1.0;
    } else if (this.dashGlowFade > 0) {
      this.dashGlowFade -= 0.03; // Smooth fade out over ~30 frames
      if (this.dashGlowFade < 0) this.dashGlowFade = 0;
    }

    // — CHARGING phase: stand still, lock aim, wait —
    if (this.dashState === 'charging') {
      this.dashChargeTimer--;
      // aim at locked target (so target location is fixed during charge)
      if (this.dashTargetX != null && this.dashTargetY != null) {
        this.aimAt(this.dashTargetX, this.dashTargetY);
      } else {
        this.aim(opponent);
      }

      // Dampen velocity rapidly so he comes to a halt
      this.vx *= 0.8;
      this.vy *= 0.8;

      // allow knockback to carry the fighter slightly while charging
      this.x += this.vx;
      this.y += this.vy;
      // resolve bounce normally (no homing during charge)
      this.resolveWallBounce(arena);
      if (this.dashChargeTimer <= 0) {
        this._launchDash();
      }
      return;
    }

    // — DASHING phase: fly toward locked target —
    if (this.dashState === 'dashing') {
      this.dashTimer--;
      this.x += this.dashVx;
      this.y += this.dashVy;
      this.angle += CONFIG.knight.dashSpeed * CONFIG.spin.rate * 3; // spin fast during dash

      // We pass opponent for homing bounces!
      this.resolveWallBounce(arena, opponent);

      if (!this.hasHitWithDash && opponent) {
        const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
        if (dist <= this.r + opponent.r + 4) {
          opponent.takeDamage(CONFIG.knight.dashDamage, this, { isMelee: true });
          spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, 'SHIELD BASH!', '#88bbff');
          // Knockback
          const dx = opponent.x - this.x;
          const dy = opponent.y - this.y;
          const d = Math.hypot(dx, dy) || 1;
          opponent.vx += (dx / d) * CONFIG.knight.dashKnockback;
          opponent.vy += (dy / d) * CONFIG.knight.dashKnockback;
          this.hasHitWithDash = true;
        }
      }

      if (this.dashTimer <= 0 || this.hasHitWithDash) {
        this._endDash();
      }
      return;
    }

    // Normal movement / Deceleration
    let targetSpeed = this.speed;
    if (this.slowTimer > 0) {
      this.slowTimer--;
      targetSpeed *= this.slowMultiplier;
    }
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
      const ns = currentSpeed + (targetSpeed - currentSpeed) * 0.04;
      this.vx = (this.vx / currentSpeed) * ns;
      this.vy = (this.vy / currentSpeed) * ns;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * CONFIG.spin.rate;
    this.aim(opponent);

    // Projectile detection logic for Holy Knight front guard
    this.isDefendingFront = false;
    if (this.dashState === 'none' && typeof projectileSystem !== 'undefined' && projectileSystem && !this.swordBroken) {
      const detectRadius = this.r + (CONFIG.knight.shieldDetectRadius || 150);
      let closestProj = null;
      let minD = detectRadius;

      for (let i = 0; i < projectileSystem.projectiles.length; i++) {
        const p = projectileSystem.projectiles[i];
        if (!p || p.owner === ownerIndex) continue; // skip own projectiles

        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < minD) {
          // Check if projectile is moving towards the knight
          const toKnightX = this.x - p.x;
          const toKnightY = this.y - p.y;
          const dot = (p.vx * toKnightX + p.vy * toKnightY);

          if (dot > 0) { // moving towards
            minD = dist;
            closestProj = p;
          }
        }
      }

      if (closestProj) {
        this.isDefendingFront = true;
        const targetAngle = Math.atan2(closestProj.y - this.y, closestProj.x - this.x);
        const diff = this.normalizeAngle(targetAngle - this.gunAngle);
        this.gunAngle += diff * 0.3; // Smoothly rotate to face the incoming projectile
      }
    }

    // Smoothly transition the shield's offset angle (from side to front)
    let targetShieldOffset = -Math.PI / 2;
    if (this.dashState === 'charging' || this.dashState === 'dashing' || this.isDefendingFront) {
      targetShieldOffset = 0;
    }
    this.shieldVisualOffset += (targetShieldOffset - this.shieldVisualOffset) * 0.25;

    this.resolveWallBounce(arena, opponent);

    // Cooldown tick
    if (this.swipeCooldown > 0) this.swipeCooldown--;

    // Swipe animation tick
    if (this.swipeActive) {
      this.swipeTimer--;
      if (this.swipeTimer <= 0) {
        this.swipeActive = false;
        this.slashFadeTimer = 15; // Linger for 15 frames
      }
    } else if (this.slashFadeTimer > 0) {
      this.slashFadeTimer--;
    }

    // If shield was broken, allow a one-time sword throw while moving
    if (this.canThrowSword && !this.swordThrown) {
      const moveSpeed = Math.hypot(this.vx, this.vy);
      if (moveSpeed > 0.6) { // must be moving to throw
        if (projectileSystem) {
          projectileSystem.fireProjectile(this, ownerIndex, CONFIG.knight.shieldThrowDamage, false, CONFIG.projectile.speed * 1.2, false, 'sword');
        }
        spawnFloatingText(this.x + Math.cos(this.gunAngle) * (this.r + 10), this.y + Math.sin(this.gunAngle) * (this.r + 10), 'THROW!', '#ffcc66');
        this.swordThrown = true;
        this.canThrowSword = false;
        // Mark sword as broken/removed after throw
        this.swordBroken = true;
        this.swordHealth = 0;
        this.swordReturnTimer = CONFIG.knight.swordReturnFrames;
      }
    }

    // Handle sword return timer: restore sword after delay
    if (this.swordThrown && this.swordReturnTimer > 0) {
      this.swordReturnTimer--;
      if (this.swordReturnTimer <= 0) {
        this.restoreWeapons();
      }
    }
    // Try auto-swipe
    this._trySwordSwipe(opponent, ownerIndex);
  }

  // ── Drawing ──
  drawOutline(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#aaaaaa';
    ctx.stroke();

    // Draw sword range radius
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r + CONFIG.knight.swordRange, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(158, 158, 158, 0.35)'; // Visible gray ring
    ctx.stroke();
  }

  // Restore both sword and shield to full durability and clear thrown state
  restoreWeapons() {
    this.swordBroken = false;
    this.swordHealth = CONFIG.knight.swordDurability;
    this.swordThrown = false;
    this.canThrowSword = false;
    this.shieldBroken = false;
    this.shieldHealth = CONFIG.knight.shieldDurability;
    this.dashGlowFade = 0;
    this.swordReturnTimer = 0;
    spawnFloatingText(this.x, this.y - this.r - 12, 'WEAPONS RESTORED!', '#aaffaa');
  }

  /** Draws the sword (right) and shield (left) around the body. */
  drawGun(ctx) {
    const ga = this.gunAngle;

    // Draw shield
    drawGrayShield(ctx, this.x, this.y, ga, this.blockFlashTimer, this.dashState, this.r, this.dashGlowFade, this.shieldVisualOffset);

    // Sword: if swiping, animate the sword arc; otherwise draw normally.
    // Hide the sword completely while it is thrown.
    let swordAngle = ga;
    if (this.swipeActive && this.swipeTimer > 0) {
      const progress = 1 - this.swipeTimer / CONFIG.knight.swipeDuration; // 0 -> 1
      const swingTotal = Math.PI * 1.1; // total sweep angle for visible arc
      const swingStart = this.swipeAngle - swingTotal * 0.5;
      swordAngle = swingStart + progress * swingTotal;
    }

    if (!this.swordThrown) {
      if (!this.swordBroken) {
        drawGraySword(ctx, this.x, this.y, swordAngle, this.r, this.dashState);
      } else {
        drawGrayBrokenSword(ctx, this.x, this.y, swordAngle, this.r, this.dashState);
      }
    }
  }

  draw(ctx) {
    // ── Block expanding flash ──
    if (this.blockFlashTimer > 0) {
      const p = 1 - (this.blockFlashTimer / CONFIG.knight.blockFlashFrames);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.gunAngle - Math.PI / 2);
      ctx.translate(this.r + 5, 0);
      ctx.beginPath();
      ctx.arc(0, 0, 10 + p * 20, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 216, 255, ${0.6 * (1 - p)})`;
      ctx.fill();
      ctx.restore();
    }

    // ── Swipe arc flash ──
    if ((this.swipeActive && this.swipeTimer > 0) || this.slashFadeTimer > 0) {
      let progress = 1.0;
      let fade = this.slashFadeTimer / 15;

      if (this.swipeActive) {
        progress = 1 - (this.swipeTimer / CONFIG.knight.swipeDuration);
        fade = 1.0;
      }

      const glowAlpha = Math.pow(fade, 0.8);
      const arcRadius = this.r + 22;

      const localStartAngle = -Math.PI / 2.8;
      const localEndAngle = Math.PI / 2.8;
      const localCurrentEndAngle = localStartAngle + (localEndAngle - localStartAngle) * progress;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.swipeAngle);

      // The Growing Clip Region
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, arcRadius + 20, localStartAngle - 0.1, localCurrentEndAngle);
      ctx.closePath();
      ctx.clip();

      // Fading Tail Gradient (Golden for new aesthetic)
      const fullStartY = Math.sin(localStartAngle) * arcRadius;
      const currentY = Math.sin(localCurrentEndAngle) * arcRadius;
      const gradEndY = Math.max(fullStartY + 0.1, currentY);

      const tailGrad = ctx.createLinearGradient(0, fullStartY, 0, gradEndY);
      tailGrad.addColorStop(0, 'rgba(255, 200, 0, 0.0)');
      tailGrad.addColorStop(1, 'rgba(255, 240, 100, 1.0)');

      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = glowAlpha;
      ctx.shadowColor = 'rgba(255, 200, 50, 0.65)';
      ctx.shadowBlur = 8;

      // Main arc
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius, localStartAngle, localEndAngle);
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Secondary inner thin arc for extra glow
      ctx.globalAlpha = glowAlpha * 0.45;
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius + 8, localStartAngle, localEndAngle);
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }

    // ── Charge ring ──
    if (this.dashState === 'charging') {
      const progress = 1 - this.dashChargeTimer / CONFIG.knight.dashChargeFrames;
      const rings = 3;
      for (let i = 0; i < rings; i++) {
        const phase = (progress + i / rings) % 1;
        ctx.save();
        ctx.globalAlpha = (1 - phase) * 0.55;
        ctx.strokeStyle = '#88aaff';
        ctx.lineWidth = 2.5 - phase * 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r + 6 + phase * 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      // Direction arrow showing dash target
      ctx.save();
      ctx.globalAlpha = 0.7 * progress;
      ctx.strokeStyle = '#aaccff';
      ctx.lineWidth = 2;
      const arrowLen = this.r + 38;
      ctx.beginPath();
      ctx.moveTo(this.x + Math.cos(this.gunAngle) * (this.r + 8),
        this.y + Math.sin(this.gunAngle) * (this.r + 8));
      ctx.lineTo(this.x + Math.cos(this.gunAngle) * arrowLen,
        this.y + Math.sin(this.gunAngle) * arrowLen);
      ctx.stroke();
      ctx.restore();
    }

    // ── Dash motion blur ──
    if (this.dashState === 'dashing') {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#aabbff';
      ctx.beginPath();
      ctx.arc(this.x - this.dashVx * 3, this.y - this.dashVy * 3, this.r * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(this.x - this.dashVx * 6, this.y - this.dashVy * 6, this.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    super.draw(ctx);
  }
}

/**
 * Black Fighter (Black Hole)
 * Shoots black projectiles that can transform into black holes.
 * Skill: Summons a black hole near the opponent to drag them in.
 */
class BlackFighter extends Fighter {
  constructor(def) {
    super(def);
    this.skillCooldown = 0;
    this.blackHoleChance = CONFIG.black.blackHoleChance;
    this.enhancedBlackHoleChance = CONFIG.black.enhancedBlackHoleChance;
    this.roundStartTimer = 0;
    this.enemyInBlackHole = false;
    this.enhancedShotsRemaining = 0;
    this.skillCharging = false;
    this.skillChargeTimer = 0;
  }

  reset() {
    super.reset();
    this.skillCooldown = 0;
    this.roundStartTimer = 60; // Prevent skill use for 1 second after round start
    this.enemyInBlackHole = false;
    this.enhancedShotsRemaining = 0;
    this.skillCharging = false;
    this.skillChargeTimer = 0;
  }

  normalizeAngle(angle) {
    while (angle <= -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    // Handle skill charging state
    if (this.skillCharging) {
      this.skillChargeTimer--;

      // Still aim at opponent while charging
      this.aim(opponent);

      // Allow knockback and other velocity changes to move the fighter
      this.x += this.vx;
      this.y += this.vy;
      this.resolveWallBounce(arena);

      // When charging completes, summon the black hole
      if (this.skillChargeTimer <= 0) {
        this.skillCharging = false;
        this.summonBlackHole(opponent, ownerIndex);
      }
      return;
    }

    // Round start timer to prevent immediate skill use
    if (this.roundStartTimer > 0) {
      this.roundStartTimer--;
    }

    // Skill cooldown
    if (this.skillCooldown > 0) {
      this.skillCooldown--;
    }

    // Try to use skill when cooldown is ready (with some randomness) and not at round start
    if (this.skillCooldown === 0 && this.roundStartTimer === 0 && opponent && Math.random() < 0.15) {
      this.startSkillCharge(opponent);
    }

    // Normal shooting
    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    } else if (opponent) {
      const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      const delta = this.normalizeAngle(targetAngle - this.angle);
      const aligned = Math.abs(delta) < CONFIG.normal.aimThreshold;

      if (aligned) {
        const speed = CONFIG.black.projectileSpeed || (CONFIG.projectile.speed * (this._def.projectileSpeedMultiplier || 1));
        let isBlackHole = false;

        if (this.enhancedShotsRemaining > 0) {
          isBlackHole = true;
          this.enhancedShotsRemaining--;
        } else if (this.enemyInBlackHole) {
          // Use enhanced chance while the enemy is currently inside a black hole.
          isBlackHole = Math.random() < this.enhancedBlackHoleChance;
        } else {
          isBlackHole = Math.random() < this.blackHoleChance;
        }

        projectileSystem.fireProjectile(this, ownerIndex, this.damage, false, speed, isBlackHole);
        this.shootCooldown = CONFIG.black.shotCooldown;

        const sound = getBasicAttackSound(this._def?.id, this._def?.type);
        if (sound) playSound(sound.src, sound.volume);
      }
    }

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    this.aim(opponent);
    this.resolveWallBounce(arena);
  }

  startSkillCharge(opponent) {
    if (!opponent) return;

    this.skillCharging = true;
    this.skillChargeTimer = CONFIG.black.skillChargeDuration;

    // Stop movement immediately
    this.vx = 0;
    this.vy = 0;

    spawnFloatingText(this.x, this.y - this.r - 15, 'CHARGING...', '#9900ff');
  }

  summonBlackHole(opponent, ownerIndex) {
    if (!projectileSystem || !opponent) return;

    // Calculate a random position around the opponent's direction
    const angleToOpponent = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    const randomOffset = (Math.random() - 0.5) * Math.PI; // Random angle offset
    const spawnAngle = angleToOpponent + randomOffset;

    const spawnDist = CONFIG.black.skillSpawnRadius;
    const spawnX = opponent.x + Math.cos(spawnAngle) * spawnDist;
    const spawnY = opponent.y + Math.sin(spawnAngle) * spawnDist;

    // Fire a black hole projectile at that position
    projectileSystem.fireBlackHole(spawnX, spawnY, ownerIndex, CONFIG.black.blackHoleDamage);

    const bhSound = getSkillSound(this._def?.id, 'blackhole');
    if (bhSound) playSound(bhSound.src, bhSound.volume);

    this.skillCooldown = CONFIG.black.skillCooldown;
    spawnFloatingText(spawnX, spawnY, 'BLACK HOLE!', '#9900ff');

    // Resume gentle movement after summoning
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.baseSpeed;
    this.vy = Math.sin(angle) * this.baseSpeed;
  }

  drawOutline(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#9900ff';
    ctx.stroke();
  }

  drawGun(ctx) {
    drawVoidmasterWeapon(ctx, this.x, this.y, this.r);
  }

  draw(ctx) {
    // Draw charging indicator
    if (this.skillCharging) {
      const progress = 1 - (this.skillChargeTimer / CONFIG.black.skillChargeDuration);
      const rings = 3;

      for (let i = 0; i < rings; i++) {
        const phase = (progress + i / rings) % 1;
        ctx.save();
        ctx.globalAlpha = (1 - phase) * 0.6;
        ctx.strokeStyle = '#9900ff';
        ctx.lineWidth = 2.5 - phase * 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r + 8 + phase * 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Direction indicator
      ctx.save();
      ctx.globalAlpha = 0.7 * progress;
      ctx.strokeStyle = '#9900ff';
      ctx.lineWidth = 2;
      const arrowLen = this.r + 35;
      ctx.beginPath();
      ctx.moveTo(this.x + Math.cos(this.gunAngle) * (this.r + 8),
        this.y + Math.sin(this.gunAngle) * (this.r + 8));
      ctx.lineTo(this.x + Math.cos(this.gunAngle) * arrowLen,
        this.y + Math.sin(this.gunAngle) * arrowLen);
      ctx.stroke();
      ctx.restore();
    }

    super.draw(ctx);
  }
}

/**
 * DarkSlateGray Fighter (Ninja)
 * Stealthy ninja with shuriken throwing and dodge mechanics.
 * 
 * Basic Attack: Throws shuriken (5 damage, normal fire rate)
 * Passive Skill: Probability to dodge incoming projectiles
 * Activate Skill: After 3 successful dodges, becomes invisible with speed boost (5 seconds)
 * During Invisibility: Deals 2x damage on backstab attacks
 */
class DarkSlateGrayFighter extends Fighter {
  constructor(def) {
    super(def);
    this.dodgeCount = 0;
    this.dodgeCooldown = 0;
    this.invincibilityTimer = 0;
    this.backstabCooldown = 0;
    this.meleeSwingCooldown = 0;
    this.lastBackstabOpponent = null; // Track last backstab target
    this.lastMeleeOpponent = null;    // Track last melee target
    this.flashStepTimer = 0;
    this.afterimages = []; // Array to store afterimage data
    this.stealthTrail = [];
    this.weaponMode = 'shuriken';
    this.weaponSwitchTimer = 0;
    this.weaponSwitchFrom = 'shuriken';
    this.weaponSwitchTo = 'shuriken';
    this.swingAnimationTimer = 0;    // Timer for sword swing animation
    this.backstabAnimationTimer = 0; // Timer for backstab thrust animation
    this.attackEffectTimer = 0;      // For visual attack feedback
    this.attackEffects = [];         // Array to store active attack effect particles

    // Flame-contact → stealth build
    this._flameContactBuildTimer = 0;
    this._flameContactStealthCooldownTimer = 0;
  }

  reset() {
    super.reset();
    this.dodgeCount = 0;
    this._flameContactBuildTimer = 0;
    this._flameContactStealthCooldownTimer = 0;

    this.dodgeCooldown = 0;
    this.invincibilityTimer = 0;
    this.backstabCooldown = 0;
    this.meleeSwingCooldown = 0;
    this.lastBackstabOpponent = null;
    this.lastMeleeOpponent = null;
    this.flashStepTimer = 0;
    this.afterimages = [];
    this.stealthTrail = [];
    this.weaponMode = 'shuriken';
    this.weaponSwitchTimer = 0;
    this.weaponSwitchFrom = 'shuriken';
    this.weaponSwitchTo = 'shuriken';
    this.swingAnimationTimer = 0;
    this.backstabAnimationTimer = 0;
    this.attackEffectTimer = 0;
    this.attackEffects = [];
  }

  // Delegate to the base Fighter class method
  _isInsideCronosSphere() {
    return this.isInsideCronosSphere();
  }

  normalizeAngle(angle) {
    while (angle <= -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  }

  aim(opponent) {
    if (opponent) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }
  }

  // Override takeDamage to implement dodge mechanics
  takeDamage(amount, attacker, opts = {}) {
    const isFlameContact = !!opts.isFlame;

    // Projectiles pass through only on the first contact while in dodge or stealth.
    // Laser beams are NOT auto-dodged during stealth since they're continuous damage sources.
    // Flame projectiles are NOT auto-dodged since they're rapid-contact damage sources.
    const alreadyDodged = opts.projectile && opts.projectile.dodgedFighters && opts.projectile.dodgedFighters.has(this);
    if (opts.isProjectile && !opts.isLaser && !opts.isFlame && (this.flashStepTimer > 0 || this.invincibilityTimer > 0) && !alreadyDodged) {
      spawnFloatingText(this.x, this.y - this.r - 10, 'PASS!', '#88ff88');
      return false;
    }

    // Flame-contact stealth build: while taking sustained flame contact,
    // DarkSlateGray can (with chance) trigger stealth mode.
    // Flame damage is throttled by ProjectileSystem, so one takeDamage() call
    // represents several frames of contact rather than exactly one frame.
    if (isFlameContact) {
      // Don't build/trigger while already in stealth/dodge.
      if (this.invincibilityTimer === 0 && this.flashStepTimer === 0 && this._flameContactStealthCooldownTimer === 0) {
        const flameIntervalSeconds = Number(CONFIG.orange.flameContactIntervalSeconds ?? CONFIG.orange.flameHitCooldown ?? 0.2);
        const flameBuildFrames = Math.max(1, Math.round(Math.max(0.01, flameIntervalSeconds) * 60));
        this._flameContactBuildTimer += flameBuildFrames;

        if (this._flameContactBuildTimer >= CONFIG.darkslategray.flameContactStealthBuildFrames) {
          // Attempt stealth trigger
          const roll = Math.random();
          if (roll <= CONFIG.darkslategray.flameContactStealthChance) {
            this._flameContactBuildTimer = 0;
            this.activateInvincibility();
            this._flameContactStealthCooldownTimer = CONFIG.darkslategray.flameContactStealthCooldown;
          } else {
            // Build failed; keep a short cooldown so continuous flames can try
            // again soon, but cannot spam stealth every damage tick.
            this._flameContactBuildTimer = 0;
            this._flameContactStealthCooldownTimer = Math.max(1, Math.round(CONFIG.darkslategray.flameContactStealthCooldown * 0.35));
          }
        }
      }
    } else if (!opts.isBurn) {
      // Non-flame damage breaks the sustained-contact requirement.
      // Burn DOT should not break it because it comes from the same flame exposure.
      this._flameContactBuildTimer = 0;
    }


    // Dodge projectiles and melee attacks if dodge chance succeeds
    // Laser beams have reduced dodge chance since they're continuous damage sources.
    // Orange flames use a reduced dodge chance so DarkSlateGray can
    // still occasionally trigger stealth/dodge mode without becoming
    // nearly immune to the flamethrower.
    const flameDodgeChance = Math.max(0.08, CONFIG.darkslategray.dodgeChance * 0.6);
    const isDodgeable = (opts.isProjectile || opts.isMelee);

    // Block dodge/flash-step if inside Cronos's sphere
    const insideCronosSphere = this._isInsideCronosSphere();

    let dodgeChance = CONFIG.darkslategray.dodgeChance;
    if (opts.isLaser) {
      dodgeChance *= 0.1;
    } else if (opts.isFlame) {
      // Flames are continuous multi-hit attacks, so keep the dodge
      // rate lower than normal projectiles while still allowing
      // stealth mode to build up naturally over time.
      dodgeChance = flameDodgeChance;
    }
    // Don't trigger dodge/flash-step while inside Cronos's sphere
    if (isDodgeable && !insideCronosSphere && this.dodgeCooldown === 0 && Math.random() < dodgeChance) {
      // Successful dodge - create multiple flash-step afterimages
      const moveAngle = Math.hypot(this.vx, this.vy) > 0.1 ? Math.atan2(this.vy, this.vx) : this.angle;
      const perpAngle = moveAngle + Math.PI / 2;
      const baseOffset = 14;

      for (let i = 0; i < CONFIG.darkslategray.flashStepCount; i++) {
        const offsetDistance = baseOffset + i * 10;
        const zigzagDistance = (i % 2 === 0 ? 1 : -1) * (5 + i * 4);
        const offsetX = -Math.cos(moveAngle) * offsetDistance + Math.cos(perpAngle) * zigzagDistance;
        const offsetY = -Math.sin(moveAngle) * offsetDistance + Math.sin(perpAngle) * zigzagDistance;
        this.afterimages.push({
          x: this.x + offsetX,
          y: this.y + offsetY,
          radius: this.r * (1 - i * 0.1),
          color: this.color,
          maxTimer: CONFIG.darkslategray.dodgeFlashDuration,
          timer: CONFIG.darkslategray.dodgeFlashDuration - i * 3,
          distortion: 1 - i * 0.05 + (Math.random() * 0.06 - 0.03),
          rotation: this.angle + (i % 2 === 0 ? 0.22 : -0.22),
        });
      }

      this.dodgeCount++;
      this.dodgeCooldown = CONFIG.darkslategray.dodgeCooldown;
      this.flashStepTimer = CONFIG.darkslategray.dodgeFlashDuration;
      this.speed = this.baseSpeed * CONFIG.darkslategray.speedBoostMultiplier;
      this.startWeaponSwitch('melee');

      const stealthSound = getSkillSound(this._def?.id, 'stealthmode');
      if (stealthSound) playSound(stealthSound.src, stealthSound.volume);

      const dodgeText = opts.isMelee ? 'MELEE DODGE!' : 'DODGE!';
      spawnFloatingText(this.x, this.y - this.r - 10, dodgeText, '#88ff88');

      // Check if invincibility should activate
      if (this.dodgeCount >= CONFIG.darkslategray.dodgesToActivate) {
        this.activateInvincibility();
      }

      return false; // Damage dodged
    }

    // During invincibility, still take damage from stray attacks but with visual feedback
    if (this.invincibilityTimer > 0) {
      spawnFloatingText(this.x, this.y - this.r - 10, 'HIT!', '#ff8888');
    }

    return super.takeDamage(amount, attacker, opts);
  }

  onProjectileApproach(projectile, attacker) {
    // Completely disable proximity-based dodging for Orange flames.
    // Flame particles are too dense and repeatedly trigger near-miss logic,
    // which caused DarkSlateGray to enter nearly permanent dodge states.
    // Actual flame-hit dodging is now handled directly inside takeDamage()
    // with a tiny chance instead.
    if (projectile && projectile.isFlame) return;

    // Don't trigger near-miss dodge while inside Cronos's sphere
    if (this._isInsideCronosSphere()) return;

    if (this.invincibilityTimer > 0 || this.flashStepTimer > 0 || this.dodgeCooldown > 0) return;
    if (Math.random() >= CONFIG.darkslategray.dodgeChance) return;

    const moveAngle = Math.hypot(this.vx, this.vy) > 0.1 ? Math.atan2(this.vy, this.vx) : this.angle;
    const perpAngle = moveAngle + Math.PI / 2;
    const baseOffset = 14;

    for (let i = 0; i < CONFIG.darkslategray.flashStepCount; i++) {
      const offsetDistance = baseOffset + i * 10;
      const zigzagDistance = (i % 2 === 0 ? 1 : -1) * (5 + i * 4);
      const offsetX = -Math.cos(moveAngle) * offsetDistance + Math.cos(perpAngle) * zigzagDistance;
      const offsetY = -Math.sin(moveAngle) * offsetDistance + Math.sin(perpAngle) * zigzagDistance;
      this.afterimages.push({
        x: this.x + offsetX,
        y: this.y + offsetY,
        radius: this.r * (1 - i * 0.1),
        color: this.color,
        maxTimer: CONFIG.darkslategray.dodgeFlashDuration,
        timer: CONFIG.darkslategray.dodgeFlashDuration - i * 3,
        distortion: 1 - i * 0.05 + (Math.random() * 0.06 - 0.03),
        rotation: this.angle + (i % 2 === 0 ? 0.22 : -0.22),
      });
    }

    this.dodgeCount++;
    this.dodgeCooldown = CONFIG.darkslategray.dodgeCooldown;
    this.flashStepTimer = CONFIG.darkslategray.dodgeFlashDuration;
    this.speed = this.baseSpeed * CONFIG.darkslategray.speedBoostMultiplier;
    this.startWeaponSwitch('melee');
    spawnFloatingText(this.x, this.y - this.r - 10, 'NEAR MISS!', '#88ff88');

    if (this.dodgeCount >= CONFIG.darkslategray.dodgesToActivate) {
      this.activateInvincibility();
    }
  }

  activateInvincibility() {
    this.invincibilityTimer = CONFIG.darkslategray.invincibilityDuration;
    this.dodgeCount = 0;
    this.speed = this.baseSpeed * CONFIG.darkslategray.speedBoostMultiplier;
    this.startWeaponSwitch('melee');

    const shadowSound = getSkillSound(this._def?.id, 'shadowmode');
    if (shadowSound) playSound(shadowSound.src, shadowSound.volume);

    spawnFloatingText(this.x, this.y - this.r - 15, 'SHADOW MODE!', '#8888ff');
  }

  checkBackstab(opponent, ownerIndex) {
    if ((this.invincibilityTimer === 0 && this.flashStepTimer === 0) || this.weaponMode !== 'melee' || this.backstabCooldown > 0 || !opponent) return;

    // Prevent hitting the same opponent multiple times in quick succession
    if (this.lastBackstabOpponent === opponent) return;

    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Check if in range using configurable melee attack radius
    if (dist > CONFIG.darkslategray.meleeAttackRadius) return;

    // Check if behind opponent (within backstab angle)
    const angleToOpponent = Math.atan2(dy, dx);
    const opponentFacingAngle = opponent.angle;
    const angleDiff = this.normalizeAngle(angleToOpponent - opponentFacingAngle);
    const backstabThreshold = (CONFIG.darkslategray.backstabAngle * Math.PI / 180) / 2;

    // Behind means the angle difference is close to PI (180 degrees)
    const isBehind = Math.abs(Math.abs(angleDiff) - Math.PI) < backstabThreshold;

    if (isBehind) {
      const backstabDamage = this.damage * CONFIG.darkslategray.backstabDamageMultiplier;
      opponent.takeDamage(backstabDamage, this, { isMelee: true });

      const bsSound = getSkillSound(this._def?.id, 'backstab');
      if (bsSound) playSound(bsSound.src, bsSound.volume);

      this.backstabCooldown = CONFIG.darkslategray.backstabCooldown;
      this.meleeSwingCooldown = CONFIG.darkslategray.meleeSwingCooldown; // Prevent melee swing right after backstab
      this.lastBackstabOpponent = opponent; // Track this hit
      this.backstabAnimationTimer = CONFIG.darkslategray.backstabAnimationDuration; // Start backstab animation
      this._spawnAttackEffect(opponent, 'backstab'); // Visual effect

      // Recover HP on successful backstab based on config
      const recoveryAmount = this.maxHp * CONFIG.darkslategray.backstabRecoveryPercent;
      this.hp = Math.min(this.maxHp, this.hp + recoveryAmount);
      spawnFloatingText(this.x, this.y - this.r - 10, `+${Math.round(recoveryAmount)}`, '#00ff00');

      spawnFloatingText(opponent.x, opponent.y - opponent.r - 10, 'BACKSTAB!', '#ff44ff');

      // Break stealth mode upon attacking
      if (this.invincibilityTimer > 0) {
        this.invincibilityTimer = 1;
      }

      return; // Exit after backstab to prevent melee swing from hitting same opponent
    }
  }

  checkMeleeSwing(opponent, ownerIndex) {
    // Only swing melee if in melee mode and during stealth
    if ((this.invincibilityTimer === 0 && this.flashStepTimer === 0) || this.weaponMode !== 'melee' || this.meleeSwingCooldown > 0 || !opponent) return;

    // Prevent hitting the same opponent multiple times in quick succession
    if (this.lastMeleeOpponent === opponent) return;

    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Check if in range using configurable melee attack radius
    if (dist > CONFIG.darkslategray.meleeAttackRadius) return;

    // Deal normal damage from any direction (if no backstab was triggered)
    opponent.takeDamage(CONFIG.darkslategray.meleeSwingDamage, this, { isMelee: true });
    this.meleeSwingCooldown = CONFIG.darkslategray.meleeSwingCooldown;
    this.backstabCooldown = CONFIG.darkslategray.backstabCooldown; // Prevent backstab right after melee swing
    this.lastMeleeOpponent = opponent; // Track this hit
    this.swingAnimationTimer = CONFIG.darkslategray.swingAnimationDuration; // Start swing animation
    this._spawnAttackEffect(opponent, 'slash'); // Visual effect

    spawnFloatingText(opponent.x, opponent.y - opponent.r - 10, 'SLASH!', '#ffaa44');

    // Break stealth mode upon attacking
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer = 1;
    }
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    // Handle cooldowns
    if (this.dodgeCooldown > 0) this.dodgeCooldown--;
    if (this.backstabCooldown > 0) this.backstabCooldown--;
    if (this.meleeSwingCooldown > 0) this.meleeSwingCooldown--;
    if (this._flameContactStealthCooldownTimer > 0) this._flameContactStealthCooldownTimer--;
    if (this.weaponSwitchTimer > 0) {

      this.weaponSwitchTimer--;
      if (this.weaponSwitchTimer === 0) {
        this.weaponMode = this.weaponSwitchTo;
      }
    }
    if (this.flashStepTimer > 0) {
      this.flashStepTimer--;
      if (this.flashStepTimer === 0 && this.invincibilityTimer === 0) {
        this.speed = this.baseSpeed;
        this.startWeaponSwitch('shuriken');
        this.lastBackstabOpponent = null; // Reset tracking
        this.lastMeleeOpponent = null;
      }
    }

    // Update animation timers
    if (this.swingAnimationTimer > 0) this.swingAnimationTimer--;
    if (this.backstabAnimationTimer > 0) this.backstabAnimationTimer--;

    // Update afterimages
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].timer--;
      if (this.afterimages[i].timer <= 0) {
        this.afterimages.splice(i, 1);
      }
    }

    // Update attack effects
    for (let i = this.attackEffects.length - 1; i >= 0; i--) {
      const effect = this.attackEffects[i];
      effect.x += effect.vx;
      effect.y += effect.vy;
      effect.vy += 0.3; // Gravity
      effect.life--;
      if (effect.life <= 0) {
        this.attackEffects.splice(i, 1);
      }
    }

    // Handle invincibility timer
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer--;

      if (this.invincibilityTimer === 0) {
        // End invincibility
        this.speed = this.baseSpeed;
        this.startWeaponSwitch('shuriken');
        this.lastBackstabOpponent = null; // Reset tracking
        this.lastMeleeOpponent = null;
        spawnFloatingText(this.x, this.y - this.r - 12, 'SHADOW END', '#8888ff');
      }
    }

    // Try backstab and melee swing during stealth (invincibility or dodge)
    if (this.invincibilityTimer > 0 || this.flashStepTimer > 0) {
      this.checkBackstab(opponent, ownerIndex);
      this.checkMeleeSwing(opponent, ownerIndex);
    }

    // Shooting (shuriken throw)
    if (this.invincibilityTimer > 0 || this.flashStepTimer > 0) {
      // Do not fire while invisible from skill or dodge
      if (this.shootCooldown > 0) {
        this.shootCooldown--;
      }
    } else if (this.shootCooldown > 0) {
      this.shootCooldown--;
    } else if (opponent) {
      const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      const delta = this.normalizeAngle(targetAngle - this.angle);
      const aligned = Math.abs(delta) < CONFIG.normal.aimThreshold;

      if (aligned) {
        const shurikenSpeed = CONFIG.darkslategray.shurikenSpeed;
        projectileSystem.fireProjectile(this, ownerIndex, CONFIG.darkslategray.shurikenDamage, false, shurikenSpeed, false, 'shuriken');
        this.shootCooldown = CONFIG.darkslategray.shurikenCooldown;

        const sound = getBasicAttackSound(this._def?.id, this._def?.type);
        if (sound) playSound(sound.src, sound.volume);
      }
    }

    // Movement
    let targetSpeed = this.speed;
    if (this.slowTimer > 0) {
      this.slowTimer--;
      targetSpeed *= this.slowMultiplier;
    }

    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
      const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.04;
      this.vx = (this.vx / currentSpeed) * newSpeed;
      this.vy = (this.vy / currentSpeed) * newSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    if (this.invincibilityTimer > 0 || this.flashStepTimer > 0) {
      this.stealthTrail.push({ x: this.x, y: this.y, alpha: 0.35 });
      if (this.stealthTrail.length > 12) this.stealthTrail.shift();
    } else if (this.stealthTrail.length > 0) {
      this.stealthTrail.shift();
    }

    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);
  }

  startWeaponSwitch(target) {
    if (this.weaponMode === target || this.weaponSwitchTo === target) return;
    this.weaponSwitchFrom = this.weaponMode;
    this.weaponSwitchTo = target;
    this.weaponSwitchTimer = CONFIG.darkslategray.weaponSwitchDuration;
  }

  resolveWallBounce(arena, opponent) {
    const stealthActive = (this.invincibilityTimer > 0 || this.flashStepTimer > 0) && opponent;
    if (!stealthActive) {
      super.resolveWallBounce(arena);
      return;
    }

    // Determine if a bounce happened against the arena edges
    let bounced = false;
    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      bounced = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      bounced = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      bounced = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      bounced = true;
    }

    if (!bounced) return;
    this.playWallBounceSound();

    // Check whether the opponent is showing their back to this fighter.
    // Compute angle from opponent -> me and compare to opponent.angle + PI (their back direction).
    const dxToMe = this.x - opponent.x;
    const dyToMe = this.y - opponent.y;
    const angleFromOppToMe = Math.atan2(dyToMe, dxToMe);
    const backDir = (opponent.angle + Math.PI);
    const normalize = (a) => { while (a <= -Math.PI) a += Math.PI * 2; while (a > Math.PI) a -= Math.PI * 2; return a; };
    const angleDiff = Math.abs(normalize(angleFromOppToMe - backDir));
    const backstabThreshold = (CONFIG.darkslategray.backstabAngle * Math.PI / 180) / 2;

    // During Shadow Mode, rebounces should propel DarkSlateGray forward
    // instead of physically reflecting.
    // Always redirect velocity toward the fighter (opponent center),
    // using current speed magnitude as the boost.
    {
      const targetX = opponent.x;
      const targetY = opponent.y;
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = Math.max(Math.hypot(this.vx, this.vy), this.speed || 1);

      this.vx = (dx / dist) * speed;
      this.vy = (dy / dist) * speed;
    }
  }

  _spawnAttackEffect(opponent, type) {
    // Spawn visual effect at impact point
    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const impactX = opponent.x - (dx / dist) * opponent.r;
    const impactY = opponent.y - (dy / dist) * opponent.r;

    if (type === 'backstab') {
      // Purple stab effect
      for (let i = 0; i < 4; i++) {
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * Math.PI / 3;
        this.attackEffects.push({
          x: impactX,
          y: impactY,
          vx: Math.cos(angle) * (4 + Math.random() * 4),
          vy: Math.sin(angle) * (4 + Math.random() * 4),
          life: 15,
          maxLife: 15,
          color: '#ff44ff',
          size: 4 + Math.random() * 4,
        });
      }
    } else if (type === 'slash') {
      // Cyan slash impact effect matching the sphere visuals
      for (let i = 0; i < 6; i++) {
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * Math.PI / 2;
        this.attackEffects.push({
          x: impactX,
          y: impactY,
          vx: Math.cos(angle) * (3 + Math.random() * 5),
          vy: Math.sin(angle) * (3 + Math.random() * 5),
          life: 12,
          maxLife: 12,
          color: 'rgba(130, 255, 255, 0.95)',
          size: 4 + Math.random() * 4,
          glow: true,
        });
      }
    }
  }

  drawOutline(ctx) {
    if (this.invincibilityTimer > 0 || this.flashStepTimer > 0) {
      // During stealth mode, still show melee attack radius with full visibility
      if (this.weaponMode === 'melee') {
        ctx.save();
        ctx.globalAlpha = 1.0; // Full visibility regardless of stealth
        ctx.beginPath();
        ctx.arc(this.x, this.y, CONFIG.darkslategray.meleeAttackRadius, 0, Math.PI * 2);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)'; // Brighter for stealth mode visibility
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#4a6a6a';
    ctx.stroke();

    // Draw melee attack radius when in melee mode
    if (this.weaponMode === 'melee') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, CONFIG.darkslategray.meleeAttackRadius, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.35)'; // Semi-transparent blue ring
      ctx.stroke();
    }
  }

  drawGun(ctx) {
    const switching = this.weaponSwitchTimer > 0;
    const progress = switching ? 1 - this.weaponSwitchTimer / CONFIG.darkslategray.weaponSwitchDuration : 1;
    const fadeOld = switching ? 1 - progress : 0;
    const fadeNew = switching ? progress : 1;
    const oldWeapon = switching ? this.weaponSwitchFrom : this.weaponMode;
    const newWeapon = switching ? this.weaponSwitchTo : this.weaponMode;
    const baseAlpha = ctx.globalAlpha !== undefined ? ctx.globalAlpha : 1;

    // Calculate animation rotations for melee attacks
    let animationRotation = 0;
    let animationOffsetScale = 1.0;
    let flashIntensity = 0;
    let thrustDirection = null; // For backstab thrust direction

    if (this.swingAnimationTimer > 0) {
      // Swing animation: smooth arc with visible movement
      const swingProgress = 1 - this.swingAnimationTimer / CONFIG.darkslategray.swingAnimationDuration;
      animationRotation = Math.sin(swingProgress * Math.PI) * CONFIG.darkslategray.swingRotationAmount;
      animationOffsetScale = 1.0 + Math.sin(swingProgress * Math.PI) * 0.8; // Weapon extends significantly during swing
      flashIntensity = Math.sin(swingProgress * Math.PI) * 1.0;
    } else if (this.backstabAnimationTimer > 0) {
      // Backstab animation: thrust forward towards opponent
      const backstabProgress = 1 - this.backstabAnimationTimer / CONFIG.darkslategray.backstabAnimationDuration;
      // Quick ease-out thrust
      const thrustAmount = (1 - (1 - backstabProgress) ** 2);
      animationOffsetScale = 1.0 + thrustAmount * 1.0; // Weapon extends significantly during thrust
      flashIntensity = thrustAmount * 1.0;
      // Slight rotation for visual polish, but keep it minimal
      animationRotation = Math.sin(thrustAmount * Math.PI) * 0.3;
    }

    if (oldWeapon === 'shuriken') {
      ctx.save();
      ctx.globalAlpha = baseAlpha * fadeOld;
      drawDarkSlateGrayShuriken(ctx, this.x, this.y, this.gunAngle + progress * 0.4, this.r);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = baseAlpha * fadeOld;
      drawDarkSlateGrayMelee(ctx, this.x, this.y, this.gunAngle - progress * 0.4 + animationRotation, this.r, animationOffsetScale, flashIntensity);
      ctx.restore();
    }

    if (newWeapon === 'shuriken') {
      ctx.save();
      ctx.globalAlpha = baseAlpha * fadeNew;
      drawDarkSlateGrayShuriken(ctx, this.x, this.y, this.gunAngle - (1 - progress) * 0.4, this.r);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = baseAlpha * fadeNew;
      drawDarkSlateGrayMelee(ctx, this.x, this.y, this.gunAngle + (1 - progress) * 0.4 + animationRotation, this.r, animationOffsetScale, flashIntensity);
      ctx.restore();
    }
  }

  drawBody(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.invincibilityTimer > 0) {
      ctx.globalAlpha = CONFIG.darkslategray.invisibilityAlpha;
    }

    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    this.drawStatusOverlays(ctx, this.r);

    ctx.restore();
  }

  draw(ctx) {
    if (this.stealthTrail.length > 0) {
      for (let i = 0; i < this.stealthTrail.length; i++) {
        const trail = this.stealthTrail[i];
        const opacity = ((i + 1) / this.stealthTrail.length) * 0.4;
        ctx.save();
        ctx.globalAlpha = opacity * trail.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, this.r * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const bodyAlpha = (this.invincibilityTimer > 0 || this.flashStepTimer > 0)
      ? CONFIG.darkslategray.invisibilityAlpha
      : 1.0;
    ctx.save();
    ctx.globalAlpha = bodyAlpha;

    // Draw fighter body, outline, and weapon faded during stealth
    super.draw(ctx);
    ctx.restore();

    // Draw afterimages from dodge - positioned at the location where dodge occurred
    for (const afterimage of this.afterimages) {
      const progress = afterimage.timer / afterimage.maxTimer; // 1 to 0 as it fades
      const alpha = CONFIG.darkslategray.flashStepAlpha * progress; // Fade out over time

      // Apply slight distortion to silhouette
      const scaleVariation = afterimage.distortion;
      const radiusWithDistortion = afterimage.radius * scaleVariation;

      ctx.save();

      // Draw semi-transparent glow/halo around the afterimage
      ctx.globalAlpha = alpha * 0.25;
      ctx.fillStyle = afterimage.color;
      ctx.beginPath();
      ctx.arc(afterimage.x, afterimage.y, radiusWithDistortion * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Draw main silhouette with lower opacity
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillStyle = afterimage.color;
      ctx.beginPath();
      ctx.arc(afterimage.x, afterimage.y, radiusWithDistortion, 0, Math.PI * 2);
      ctx.fill();

      // Draw soft secondary silhouette for subtle distortion
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = afterimage.color;
      ctx.beginPath();
      ctx.arc(afterimage.x + radiusWithDistortion * 0.18, afterimage.y - radiusWithDistortion * 0.18, radiusWithDistortion * 0.92, 0, Math.PI * 2);
      ctx.fill();

      // Draw silhouette outline
      ctx.globalAlpha = alpha * 0.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(afterimage.x, afterimage.y, radiusWithDistortion, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // Draw dodge count indicator
    if (this.dodgeCount > 0 && this.invincibilityTimer === 0) {
      ctx.save();
      ctx.fillStyle = '#88ff88';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.dodgeCount}/${CONFIG.darkslategray.dodgesToActivate}`, this.x, this.y - this.r - 8);
      ctx.restore();
    }

    // Draw invincibility timer indicator
    if (this.invincibilityTimer > 0) {
      const secondsLeft = Math.ceil(this.invincibilityTimer / 60);
      ctx.save();
      ctx.fillStyle = '#8888ff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${secondsLeft}s`, this.x, this.y - this.r - 8);
      ctx.restore();
    }

    // Draw attack effect particles
    for (const effect of this.attackEffects) {
      const progress = 1 - effect.life / effect.maxLife;
      const alpha = 1 - progress; // Fade out

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = effect.color;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.fill();

      // Add glow effect for slash particles
      if (effect.glow) {
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = 'rgba(100, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha * 0.18;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 3.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // End dodge draw path; avoid drawing the fighter again opaquely.
  }
}

/**
 * Orange Fighter
 * Automatically locks onto the opponent and draws a V-shaped aim indicator.
 */
class OrangeFighter extends Fighter {
  constructor(def) {
    super(def);
    this.shootCooldownMax = CONFIG.orange.burstCooldown;
    this._flameSoundKey = null;
    this._isFlameSoundPlaying = false;
    // Fuel mechanic state
    this.fuel = CONFIG.orange.maxFuel;
  }

  reset() {
    super.reset();
    this.fuel = CONFIG.orange.maxFuel;
    this._flameSoundKey = null;
    this._isFlameSoundPlaying = false;
  }

  aim(opponent) {
    if (!opponent) return;
    this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
  }

  shoot(ownerIndex, opponent) {
    if (!projectileSystem) return;
    if (!opponent) return;

    const distance = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    const maxRange = CONFIG.orange.flameRange;

    if (distance > maxRange + this.r + opponent.r) {
      return; // Opponent too far to hit with flame
    }

    // Check if has enough fuel
    if (this.fuel < CONFIG.orange.fuelPerBurst) {
      return; // Cannot shoot if out of fuel
    }

    // Consume fuel
    this.fuel -= CONFIG.orange.fuelPerBurst;

    if (this.shootCooldown <= 0) {
      const flameCount = CONFIG.orange.flameCount;
      const flameSpread = CONFIG.orange.flameSpread;
      const flameSpeed = CONFIG.orange.flameSpeed;
      const flameLife = CONFIG.orange.flameLife;
      const flameRadius = CONFIG.orange.flameRadius;
      const flameDamage = CONFIG.orange.flameDamage;
      const step = flameCount > 1 ? (flameSpread * 2) / (flameCount - 1) : 0;
      const baseColor = 'rgba(255, 160, 0, 0.92)';

      for (let i = 0; i < flameCount; i++) {
        const angleOffset = -flameSpread + step * i;
        projectileSystem.fireFlameProjectile(
          this,
          ownerIndex,
          flameDamage,
          angleOffset,
          flameSpeed,
          flameRadius,
          flameLife,
          baseColor,
        );
      }
      this.shootCooldown = this.shootCooldownMax;
    }

    return true;
  }

  drawAimV(ctx) {
    const bodyTipDist = this.r + 2;
    const startX = this.x + Math.cos(this.gunAngle) * bodyTipDist;
    const startY = this.y + Math.sin(this.gunAngle) * bodyTipDist;
    const range = CONFIG.orange.flameRange;
    const angleOffset = CONFIG.orange.flameSpread;
    const end1X = startX + Math.cos(this.gunAngle + angleOffset) * range;
    const end1Y = startY + Math.sin(this.gunAngle + angleOffset) * range;
    const end2X = startX + Math.cos(this.gunAngle - angleOffset) * range;
    const end2Y = startY + Math.sin(this.gunAngle - angleOffset) * range;

    // Fan shape originating from the front of the body, serving as an aim indicator
    ctx.save();
    ctx.fillStyle = 'rgba(255, 170, 90, 0.18)';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(end1X, end1Y);
    ctx.arc(startX, startY, range, this.gunAngle - angleOffset, this.gunAngle + angleOffset);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255, 150, 0, 0.14)';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(end1X, end1Y);
    ctx.lineTo(end2X, end2Y);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(startX, startY, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 200, 100, 0.9)';
    ctx.fill();
    ctx.restore();
  }

  resolveWallBounce(arena, opponent = null) {
    // Find nearest active fuel pickup
    let nearestPickup = null;
    let nearestPickupDist = Infinity;

    if (state.fuelPickups && state.fuelPickups.length > 0) {
      for (const pickup of state.fuelPickups) {
        if (!pickup.active) continue;
        const dist = Math.hypot(pickup.x - this.x, pickup.y - this.y);
        if (dist < nearestPickupDist) {
          nearestPickupDist = dist;
          nearestPickup = pickup;
        }
      }
    }

    // Find nearest fighter (opponent) for "good fuel" re-bounce.
    // If opponent provided, prefer it, but still pick nearest for better targeting.
    let nearestFighter = null;
    let nearestFighterDist = Infinity;
    if (state.fighters && state.fighters.length > 0) {
      for (const f of state.fighters) {
        if (!f || f === this || f.hp <= 0) continue;
        const dist = Math.hypot(f.x - this.x, f.y - this.y);
        if (dist < nearestFighterDist) {
          nearestFighterDist = dist;
          nearestFighter = f;
        }
      }
    }
    if (!nearestFighter && opponent) nearestFighter = opponent;

    let bounced = false;
    const restitution = CONFIG.collision.restitution;

    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      bounced = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      bounced = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      bounced = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      bounced = true;
    }

    if (bounced) {
      const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;

      // Decide bounce target:
      // - when about to run out of fuel -> toward nearest fuel
      // - otherwise -> toward nearest fighter
      // Also: if the nearest fighter is DarkSlateGray and currently in stealth,
      // don't home toward them (prevents "stealth abuse" feedback loops).
      const fuelLowThreshold = CONFIG.orange.fuelPerBurst * 2; // "about to run out"
      const shouldGoToFuel = this.fuel <= fuelLowThreshold;

      const isStealthFighter = (f) => {
        if (!f || f._def?.type !== 'darkslategray') return false;
        return (f.invincibilityTimer > 0 || f.flashStepTimer > 0);
      };

      let safeNearestFighter = nearestFighter;
      if (isStealthFighter(safeNearestFighter)) {
        // find next nearest non-stealth fighter
        safeNearestFighter = null;
        let best = Infinity;
        if (state.fighters && state.fighters.length > 0) {
          for (const f of state.fighters) {
            if (!f || f === this || f.hp <= 0) continue;
            if (isStealthFighter(f)) continue;
            const dist = Math.hypot(f.x - this.x, f.y - this.y);
            if (dist < best) {
              best = dist;
              safeNearestFighter = f;
            }
          }
        }
      }

      const target = shouldGoToFuel
        ? (nearestPickup || safeNearestFighter)
        : (safeNearestFighter || nearestPickup);

      if (target) {
        const tx = target.x;
        const ty = target.y;
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        this.vx = (dx / dist) * currentSpeed * restitution;
        this.vy = (dy / dist) * currentSpeed * restitution;
      } else {
        // fallback random bounce
        const angleJitter = 3.5;
        if (this.x - this.r <= arena.x || this.x + this.r >= arena.x + arena.width) {
          this.vx = -Math.abs(this.vx) * restitution;
          this.vy += (Math.random() - 0.5) * angleJitter;
        }
        if (this.y - this.r <= arena.y || this.y + this.r >= arena.y + arena.height) {
          this.vy = -Math.abs(this.vy) * restitution;
          this.vx += (Math.random() - 0.5) * angleJitter;
        }
        this.normalizeSpeed();
      }
    }
  }

  update(opponent, ownerIndex, arena) {
    if (this._handleTimeStop()) {
      // Ensure flames are fully stopped while time-stopped
      if (this._isFlameSoundPlaying) {
        fadeOutLoopingSound(this._flameSoundKey, 300);
        this._isFlameSoundPlaying = false;
      }
      flamewardenFlameSystem.stopEmitting();
      return;
    }
    // Standard fighter updates (movement, poison, etc.)
    super.update(opponent, ownerIndex, arena);

    // Block shooting if inside a Cronos time-stop sphere
    const frozenBySphere = this.isInsideCronosSphere();

    // Override shooting behavior for continuous fire within range
    const isFiring = !frozenBySphere && this.shoot(ownerIndex, opponent);
    if (isFiring) {
      if (!this._flameSoundKey) {
        this._flameSoundKey = `orange-flame-${ownerIndex}`;
      }
      if (!this._isFlameSoundPlaying) {
        const sound = getBasicAttackSound(this._def?.id, this._def?.type);
        playLoopingSound(this._flameSoundKey, sound.src, sound.volume);
        this._isFlameSoundPlaying = true;
      }

      // Update flame particle system - calculate nozzle position
      const nozzleDistance = this.r + 45; // Nozzle is at the tip of the gun
      const nozzleX = this.x + Math.cos(this.gunAngle) * nozzleDistance;
      const nozzleY = this.y + Math.sin(this.gunAngle) * nozzleDistance;
      flamewardenFlameSystem.startEmitting(nozzleX, nozzleY, this.gunAngle);
    } else {
      if (this._isFlameSoundPlaying) {
        fadeOutLoopingSound(this._flameSoundKey, 300);
        this._isFlameSoundPlaying = false;
      }
      flamewardenFlameSystem.stopEmitting();
    }

    // Replace base wall bounce behavior with orange's fuel-aware bounce.
    // (We re-run bounce here so it reacts immediately on edge contact.)
    this.resolveWallBounce(arena, opponent);
  }

  drawGun(ctx) {
    drawOrangeFlamethrowerGun(ctx, this.x, this.y, this.gunAngle, this.r);
  }

  drawFuelBar(ctx) {
    const fuelRatio = this.fuel / CONFIG.orange.maxFuel;

    // Curved meter settings
    const meterRadius = this.r + 18;
    const meterThickness = 8;
    const startAngle = Math.PI * 0.7;  // Start from left side
    const endAngle = Math.PI * 0.3;    // End at right side (curved upward)
    const totalAngle = startAngle - endAngle;
    const filledAngle = endAngle + (totalAngle * fuelRatio);

    ctx.save();
    ctx.translate(this.x, this.y);

    // Draw background arc (dark)
    ctx.beginPath();
    ctx.arc(0, 0, meterRadius, endAngle, startAngle);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = meterThickness;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Determine color based on fuel level
    let startColor, endColor;
    if (fuelRatio > 0.5) {
      startColor = '#ff9900';
      endColor = '#ff6600';
    } else if (fuelRatio > 0.25) {
      startColor = '#ff6600';
      endColor = '#ff4400';
    } else {
      startColor = '#ff4400';
      endColor = '#ff0000';
    }

    // Draw filled arc with gradient
    const gradient = ctx.createLinearGradient(
      Math.cos(startAngle) * meterRadius,
      Math.sin(startAngle) * meterRadius,
      Math.cos(endAngle) * meterRadius,
      Math.sin(endAngle) * meterRadius
    );
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);

    ctx.beginPath();
    ctx.arc(0, 0, meterRadius, filledAngle, startAngle);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = meterThickness;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw glow effect
    ctx.shadowColor = startColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, meterRadius, filledAngle, startAngle);
    ctx.strokeStyle = `rgba(255, 150, 0, ${0.3 + fuelRatio * 0.4})`;
    ctx.lineWidth = meterThickness + 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw fuel text in center
    ctx.fillStyle = '#ffffff00';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(this.fuel)}`, 0, 0);

    // Draw small "F" label below the meter
    ctx.fillStyle = 'rgba(255, 150, 0, 0.8)';
    ctx.font = 'bold 8px Arial';
    ctx.fillText('FUEL', 0, meterRadius + 12);

    ctx.restore();
  }

  draw(ctx) {
    super.draw(ctx);
    this.drawAimV(ctx);
    this.drawFuelBar(ctx);
  }
}

/**
 * Berserker Fighter (Blood Red)
 * Dual-wielding axes with rage mechanic.
 * Gains rage when taking damage. During rage: increased damage, attack speed, movement speed, and lifesteal.
 * Auto-locks toward enemy when bouncing off walls.
 */
class BerserkerFighter extends Fighter {
  constructor(def) {
    super(def);
    this.rage = 0;
    this.rageTimer = 0;
    this.isInRage = false;
    this.axeCooldown = 0;
    this.axeSwingActive = false;
    this.axeSwingTimer = 0;
    this.axeSwingAngle = 0;
    this.axeSlashFadeTimer = 0;
    this.axeSwingDuration = CONFIG.berserker.axeSwingDurationFrames ?? 24;
    this.rageFadeTimer = 0;
    this.axeHistory = [];
  }

  reset() {
    super.reset();
    this.rage = 0;
    this.rageTimer = 0;
    this.isInRage = false;
    this.axeCooldown = 0;
    this.axeSwingActive = false;
    this.axeSwingTimer = 0;
    this.axeSwingAngle = 0;
    this.axeSlashFadeTimer = 0;
    this.axeSwingDuration = CONFIG.berserker.axeSwingDurationFrames ?? 24;
    this.rageFadeTimer = 0;
    this.axeHistory = [];
  }

  takeDamage(amount, attacker, opts = {}) {
    const applied = super.takeDamage(amount, attacker, opts);

    // Rage meter grows based on *attacker damage value* (not number of hits).
    // `amount` already represents the damage applied by the attacker.
    if (applied && amount > 0) {
      const rageGain = amount * (CONFIG.berserker.rageFromDamageScale ?? 0);
      this.rage = Math.min(CONFIG.berserker.maxRage, this.rage + rageGain);

      // Enter rage state if meter is full
      if (this.rage >= CONFIG.berserker.maxRage && !this.isInRage) {
        this.activateRage();
      }
    }

    return applied;
  }

  activateRage() {
    this.isInRage = true;
    this.rageTimer = CONFIG.berserker.rageDuration;
    this.rage = 0;
    // Apply rage bonuses
    this.speed = this.baseSpeed * CONFIG.berserker.rageMoveSpeedMultiplier;
    spawnFloatingText(this.x, this.y - this.r - 15, 'RAGE!', '#ff0000');

    // Spawn visual effect
    spawnBerserkerRageEffect(this);

    const rageSound = getSkillSound(this._def?.id, 'rage');
    if (rageSound) {
      playSound(rageSound.src, rageSound.volume);
    }
  }

  deactivateRage() {
    this.isInRage = false;
    this.rageTimer = 0;
    this.speed = this.baseSpeed;
    this.rageFadeTimer = 45; // 45 frames of smooth fade out
  }

  onDamageDealt(target, projectile, ownerIndex) {
    // Lifesteal during rage
    if (this.isInRage) {
      const healAmount = this.damage * CONFIG.berserker.lifestealPercent;
      this.hp = Math.min(this.maxHp, this.hp + healAmount);
      spawnFloatingText(this.x, this.y - this.r - 10, `+${Math.round(healAmount)}`, '#00ff00');
    }
  }

  _tryAxeSwing(opponent, ownerIndex) {
    if (!opponent || this.axeCooldown > 0) return;
    const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    if (dist > this.r + opponent.r + CONFIG.berserker.axeRange) return;

    // Calculate damage
    let damage = CONFIG.berserker.axeDamage;
    if (this.isInRage) {
      damage *= CONFIG.berserker.rageDamageMultiplier;
    }

    // Hit!
    this.axeSwingAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.axeSwingActive = true;
    this.axeSwingDuration = CONFIG.berserker.axeSwingDurationFrames ?? 24;
    this.axeSwingTimer = this.axeSwingDuration; // frames for swing animation
    // Immediately mirror swing angle into gunAngle so visuals rotate consistently
    this.gunAngle = this.axeSwingAngle;
    this.axeCooldown = this.isInRage
      ? CONFIG.berserker.axeCooldown / CONFIG.berserker.rageAttackSpeedMultiplier
      : CONFIG.berserker.axeCooldown;

    opponent.takeDamage(damage, this, { isMelee: true });
    spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, 'SLASH!', '#8b0000');

    // Play attack sound
    const sound = getBasicAttackSound(this._def?.id, this._def?.type);
    this._attackSoundTimer = sound.delay;
    this._attackSoundConfig = sound;

    // Trigger onDamageDealt for lifesteal
    this.onDamageDealt(opponent, null, ownerIndex);
  }

  // Override resolveWallBounce to auto-lock toward enemy
  resolveWallBounce(arena, opponent) {
    if (!opponent) {
      super.resolveWallBounce(arena);
      return;
    }

    let bounced = false;

    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      bounced = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      bounced = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      bounced = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      bounced = true;
    }

    if (bounced) {
      this.playWallBounceSound();
      const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;

      // Default snap point is opponent center.
      // During rage, snap toward a point *away* from opponent to tighten the fight
      // and effectively reduce the rebounce "away distance".
      let targetX = opponent.x;
      let targetY = opponent.y;

      if (this.isInRage) {
        const dx = this.x - opponent.x; // vector from opponent -> berserker (away direction)
        const dy = this.y - opponent.y;
        const dist = Math.hypot(dx, dy) || 1;

        const awayDist = CONFIG.berserker.rageRebounceAwayDistance ?? 0;
        // Move the target point further away from opponent along the same line.
        // Smaller awayDist => closer target => tighter re-engage.
        targetX = opponent.x - (dx / dist) * awayDist;
        targetY = opponent.y - (dy / dist) * awayDist;
      }

      const hx = targetX - this.x;
      const hy = targetY - this.y;
      const hDist = Math.hypot(hx, hy) || 1;

      this.vx = (hx / hDist) * currentSpeed;
      this.vy = (hy / hDist) * currentSpeed;
    }
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    // Handle rage timer
    if (this.isInRage) {
      this.rageTimer--;
      if (this.rageTimer <= 0) {
        this.deactivateRage();
      }
    } else if (this.rageFadeTimer > 0) {
      this.rageFadeTimer--;
    }

    // Record history for the motion trail
    if (this.isInRage || this.rageFadeTimer > 0) {
      this.axeHistory.push({ x: this.x, y: this.y, gunAngle: this.gunAngle });
      if (this.axeHistory.length > 6) {
        this.axeHistory.shift();
      }
    } else {
      if (this.axeHistory.length > 0) this.axeHistory = [];
    }

    // Handle axe cooldown
    if (this.axeCooldown > 0) {
      this.axeCooldown--;
    }

    // Handle axe swing animation
    if (this.axeSwingActive) {
      this.axeSwingTimer--;
      if (this.axeSwingTimer <= 0) {
        this.axeSwingActive = false;
        this.axeSlashFadeTimer = 15;
      }
    } else if (this.axeSlashFadeTimer > 0) {
      this.axeSlashFadeTimer--;
    }

    // Try axe swing if in range
    if (opponent) {
      this._tryAxeSwing(opponent, ownerIndex);
    }

    // Determine intended target speed
    let targetSpeed = this.speed;
    if (this.slowTimer > 0) {
      this.slowTimer--;
      targetSpeed *= this.slowMultiplier;
    }

    // Velocity Recovery (gradually return to target speed after knockback or slow)
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
      const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.04;
      this.vx = (this.vx / currentSpeed) * newSpeed;
      this.vy = (this.vy / currentSpeed) * newSpeed;
    }

    // Movement
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    // Aiming & Bouncing
    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);
  }

  aim(opponent) {
    if (opponent) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }
  }

  drawOutline(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.isInRage ? '#ff0000' : '#8b0000';
    ctx.stroke();

    // Rage glow effect (extra outer ring when enraged)
    if (this.isInRage) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 5, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.stroke();
    }

    // Axe attack range ring — subtle solid ring (matching Grenadier/melee style)
    const axeRange = CONFIG.berserker.axeRange ?? 35;
    const attackRadius = this.r + axeRange;
    ctx.beginPath();
    ctx.arc(this.x, this.y, attackRadius, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.isInRage
      ? 'rgba(255, 70, 70, 0.35)'
      : 'rgba(180, 60, 60, 0.18)';
    ctx.stroke();
  }

  drawGun(ctx) {
    drawBerserkerDualAxes(ctx, this.x, this.y, this.gunAngle, this.r, this.isInRage, this.axeSwingActive, this.axeSwingTimer, this.axeSwingAngle, this.axeSwingDuration, this.axeSlashFadeTimer, this.rageFadeTimer, this.axeHistory);
  }

  drawRageBar(ctx) {
    const rageRatio = this.rage / CONFIG.berserker.maxRage;

    const barWidth = 50;
    const barHeight = 6;
    const barX = this.x - barWidth / 2;
    const barY = this.y + this.r + 15;

    ctx.save();

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Fill
    const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    gradient.addColorStop(0, '#8b0000');
    gradient.addColorStop(1, '#ff0000');
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, barWidth * rageRatio, barHeight);

    // Border
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.restore();
  }

  draw(ctx) {
    super.draw(ctx);
    this.drawRageBar(ctx);
  }
}

/**
 * Cronos Fighter (Time Stop)
 * Close-combat fighter with time manipulation abilities.
 * 
 * Skill: Deploys a time stop sphere that freezes enemies and projectiles.
 * Cronos can move freely inside the sphere with increased speed.
 * Passive: Chance to stop enemy movement on hit and when attacked.
 * Can bounce inside his sphere with enhanced force.
 */
class CronosFighter extends Fighter {
  constructor(def) {
    super(def);
    this.sphereActive = false;
    this.sphereTimer = 0;
    this.sphereCooldown = CONFIG.cronos.sphereCooldown;
    this.sphereImpactTimer = 0;
    this.sphereX = 0;
    this.sphereY = 0;
    this.meleeCooldown = 0;
    this.meleeSwingActive = false;
    this.meleeSwingTimer = 0;
    this.meleeSlashFadeTimer = 0;
    this.meleeSwingAngle = 0;
    this.meleeSwingDirection = 1; // 1 = right-to-left, -1 = left-to-right
    this.doubleStrikeTimer = 0;   // Window to execute the second strike
    this.attackSlashEffects = [];
  }

  reset() {
    super.reset();
    this.sphereActive = false;
    this.sphereTimer = 0;
    this.sphereCooldown = CONFIG.cronos.sphereCooldown;
    this.sphereImpactTimer = 0;
    this.sphereX = 0;
    this.sphereY = 0;
    this.meleeCooldown = 0;
    this.meleeSwingActive = false;
    this.meleeSwingTimer = 0;
    this.meleeSlashFadeTimer = 0;
    this.meleeSwingAngle = 0;
    this.meleeSwingDirection = 1;
    this.doubleStrikeTimer = 0;
    this.attackSlashEffects = [];
  }

  normalizeAngle(angle) {
    while (angle <= -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  }

  _applyCronosSpeed() {
    const distToSphere = this.sphereActive
      ? Math.hypot(this.x - this.sphereX, this.y - this.sphereY)
      : Infinity;
    const insideSphere = this.sphereActive && distToSphere <= CONFIG.cronos.sphereRadius;
    const targetSpeed = insideSphere
      ? this.baseSpeed * CONFIG.cronos.sphereSpeedMultiplier
      : this.baseSpeed;

    this.speed = targetSpeed;

    const currentMagnitude = Math.hypot(this.vx, this.vy);
    if (currentMagnitude > 0) {
      this.vx = (this.vx / currentMagnitude) * targetSpeed;
      this.vy = (this.vy / currentMagnitude) * targetSpeed;
    }
  }

  aim(opponent) {
    if (opponent) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }
  }

  // Override takeDamage to implement counter-stop passive
  takeDamage(amount, attacker, opts = {}) {
    const damageTaken = super.takeDamage(amount, attacker, opts);

    if (damageTaken !== false && attacker && attacker !== this) {
      // Counter-stop chance when attacked
      if (Math.random() < CONFIG.cronos.counterStopChance) {
        // Prevent spamming floating text and resetting state if already stopped
        if (!attacker.timeStopTimer || attacker.timeStopTimer <= 0) {
          // Apply time stop to the attacker
          attacker.applyTimeStop(CONFIG.cronos.counterStopDuration);
          attacker._suppressFreezeTimer = true;

          // Also hard-freeze attacker rotation + gun angle by zeroing movement and restoring on resume
          // (Fighter base timeStopTimer only skips movement/shooting logic; subclasses like Cronos may
          // still update rotation/aim elsewhere, leaving visual spin/locking active.)
          if (typeof attacker._resumeVx !== 'number') attacker._resumeVx = attacker.vx;
          if (typeof attacker._resumeVy !== 'number') attacker._resumeVy = attacker.vy;
          attacker.vx = 0;
          attacker.vy = 0;

          if (typeof attacker._resumeAngleVel !== 'number') attacker._resumeAngleVel = attacker.speed * (attacker._def?.spinRate ?? CONFIG.spin.rate);
          attacker._timeStoppedAngleVel = 0;

          // Keep gunAngle/angle from updating during time stop (visual freeze)
          attacker._timeStopFrozenAngle = attacker.angle;
          attacker._timeStopFrozenGunAngle = attacker.gunAngle;

          spawnFloatingText(attacker.x, attacker.y - attacker.r - 10, 'TIME STOP!', '#00F3FF');
        } else {
          // Just refresh the duration silently without spawning more text or overwriting original velocities
          attacker.applyTimeStop(CONFIG.cronos.counterStopDuration);
        }
      }
    }

    return damageTaken;
  }

  _spawnAttackSlashEffect() {
    const slashCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < slashCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = this.r * (0.6 + Math.random() * 0.35);
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;
      const slashAngle = angle + (Math.random() - 0.5) * 0.85;
      const life = 8 + Math.floor(Math.random() * 6);
      this.attackSlashEffects.push({
        x: this.x + offsetX,
        y: this.y + offsetY,
        angle: slashAngle,
        life,
        maxLife: life,
        size: 10 + Math.random() * 14,
        alpha: 0.7 + Math.random() * 0.25,
      });
    }
  }

  _updateAttackSlashEffects() {
    for (let i = this.attackSlashEffects.length - 1; i >= 0; i--) {
      const effect = this.attackSlashEffects[i];
      effect.life--;
      if (effect.life <= 0) {
        this.attackSlashEffects.splice(i, 1);
      }
    }
  }

  _drawAttackSlashEffects(ctx) {
    if (!this.attackSlashEffects.length) return;

    for (const effect of this.attackSlashEffects) {
      const progress = 1 - effect.life / effect.maxLife;
      const alpha = effect.alpha * (1 - progress);
      const scale = 0.5 + progress * 0.9;

      ctx.save();
      ctx.translate(effect.x, effect.y);
      ctx.rotate(effect.angle + Math.sin(progress * Math.PI) * 0.18);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.globalCompositeOperation = 'screen';

      // Main slash core - sharp angular blade slash with BOTH tips pointed
      const slashGradient = ctx.createLinearGradient(-effect.size * 0.6, 0, effect.size * 0.6, 0);
      slashGradient.addColorStop(0, `rgba(100, 220, 255, ${0.3 * alpha})`);
      slashGradient.addColorStop(0.15, `rgba(120, 255, 255, ${0.7 * alpha})`);
      slashGradient.addColorStop(0.5, `rgba(220, 255, 255, ${1.0 * alpha})`);
      slashGradient.addColorStop(0.85, `rgba(140, 255, 255, ${0.7 * alpha})`);
      slashGradient.addColorStop(1, `rgba(100, 220, 255, ${0.3 * alpha})`);

      ctx.strokeStyle = slashGradient;
      ctx.lineWidth = 2 + progress * 4;
      ctx.shadowColor = 'rgba(80, 255, 255, 1.0)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      // Sharp slash with BOTH tips pointed (diamond blade shape)
      ctx.moveTo(-effect.size * 0.55, -effect.size * 0.3);
      ctx.lineTo(-effect.size * 0.15, -effect.size * 0.06);
      ctx.lineTo(effect.size * 0.15, effect.size * 0.06);
      ctx.lineTo(effect.size * 0.55, effect.size * 0.3);
      ctx.stroke();

      // Sharp BOTTOM edge highlight
      ctx.strokeStyle = `rgba(230, 255, 255, ${0.95 * alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-effect.size * 0.45, -effect.size * 0.22);
      ctx.lineTo(-effect.size * 0.1, -effect.size * 0.03);
      ctx.lineTo(effect.size * 0.1, effect.size * 0.03);
      ctx.lineTo(effect.size * 0.45, effect.size * 0.22);
      ctx.stroke();

      // Sharp TOP edge highlight
      ctx.strokeStyle = `rgba(200, 255, 255, ${0.85 * alpha})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-effect.size * 0.5, -effect.size * 0.28);
      ctx.lineTo(-effect.size * 0.12, -effect.size * 0.05);
      ctx.lineTo(effect.size * 0.12, effect.size * 0.05);
      ctx.lineTo(effect.size * 0.5, effect.size * 0.28);
      ctx.stroke();

      // Sharp LEFT tip accent (starting point)
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * alpha})`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-effect.size * 0.55, -effect.size * 0.3);
      ctx.lineTo(-effect.size * 0.35, -effect.size * 0.18);
      ctx.stroke();

      // Sharp RIGHT tip accent (ending point)
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(effect.size * 0.45, effect.size * 0.22);
      ctx.lineTo(effect.size * 0.55, effect.size * 0.3);
      ctx.stroke();

      // Clear shadow effects before drawing complex shapes and particles to prevent severe FPS drops
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // Sharp diamond/blade glow fill - BOTH tips sharp
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(140, 255, 255, ${0.45 * alpha})`;
      ctx.beginPath();
      // Left sharp tip
      ctx.moveTo(-effect.size * 0.55, -effect.size * 0.3);
      ctx.lineTo(-effect.size * 0.2, -effect.size * 0.08);
      ctx.lineTo(effect.size * 0.2, effect.size * 0.08);
      // Right sharp tip
      ctx.lineTo(effect.size * 0.55, effect.size * 0.3);
      ctx.lineTo(effect.size * 0.2, effect.size * 0.08);
      ctx.lineTo(-effect.size * 0.2, -effect.size * 0.08);
      ctx.closePath();
      ctx.fill();

      // Sharp edge particles - small angular debris flying from both tips
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(200, 255, 255, ${0.8 * alpha})`;
      // Particles from LEFT tip
      const leftParticleAngles = [-0.6, -0.3, 0.1, 0.4];
      leftParticleAngles.forEach((pAngle, idx) => {
        const pDist = effect.size * (0.25 + idx * 0.12);
        const px = -effect.size * 0.5 + Math.cos(pAngle) * pDist;
        const py = -effect.size * 0.25 + Math.sin(pAngle) * pDist;
        const pSize = (1.2 + idx * 0.4) * (1 - progress * 0.5);
        ctx.beginPath();
        // Diamond shape for sharp particles
        ctx.moveTo(px, py - pSize);
        ctx.lineTo(px + pSize * 0.5, py);
        ctx.lineTo(px, py + pSize);
        ctx.lineTo(px - pSize * 0.5, py);
        ctx.closePath();
        ctx.fill();
      });
      // Particles from RIGHT tip
      const rightParticleAngles = [2.5, 2.8, 3.1, 3.5];
      rightParticleAngles.forEach((pAngle, idx) => {
        const pDist = effect.size * (0.25 + idx * 0.12);
        const px = effect.size * 0.5 + Math.cos(pAngle) * pDist;
        const py = effect.size * 0.25 + Math.sin(pAngle) * pDist;
        const pSize = (1.2 + idx * 0.4) * (1 - progress * 0.5);
        ctx.beginPath();
        // Diamond shape for sharp particles
        ctx.moveTo(px, py - pSize);
        ctx.lineTo(px + pSize * 0.5, py);
        ctx.lineTo(px, py + pSize);
        ctx.lineTo(px - pSize * 0.5, py);
        ctx.closePath();
        ctx.fill();
      });

      ctx.restore();
    }
  }

  // Try melee attack with crescent blade
  _tryMeleeAttack(opponent, ownerIndex) {
    if (!opponent || this.meleeCooldown > 0) return;

    const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    if (dist > this.r + opponent.r + CONFIG.cronos.meleeRange) return;

    // Alternate slash directions for back-and-forth feel
    this.meleeSwingDirection = -this.meleeSwingDirection;

    // If this is the second strike of a double-slash, reset the strike queue window
    this.doubleStrikeTimer = this.doubleStrikeTimer > 0 ? 0 : 15; // 15 frames window for the return slash

    // Hit!
    this.meleeSwingAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.meleeSwingActive = true;
    this.meleeSwingTimer = CONFIG.cronos.meleeSwingDuration;

    const sound = getBasicAttackSound(this._def?.id, this._def?.type);
    this._attackSoundTimer = sound.delay;
    this._attackSoundConfig = sound;

    // Check if Cronos is inside his own sphere for different damage and cooldown
    let meleeDamage = CONFIG.cronos.meleeDamage;
    let meleeCooldown = CONFIG.cronos.meleeCooldown;
    let hitText = 'SLASH!';
    if (this.sphereActive) {
      const distToSphere = Math.hypot(this.x - this.sphereX, this.y - this.sphereY);
      if (distToSphere <= CONFIG.cronos.sphereRadius) {
        meleeDamage = CONFIG.cronos.sphereMeleeDamage;
        meleeCooldown = CONFIG.cronos.sphereMeleeCooldown;
        hitText = 'POWER SLASH!';
      }
    }
    this.meleeCooldown = meleeCooldown;

    // If queueing a double strike, use a much shorter cooldown for the rapid follow-up swing
    this.meleeCooldown = this.doubleStrikeTimer > 0 ? Math.floor(meleeCooldown * 0.3) : meleeCooldown;
    this._spawnAttackSlashEffect();

    applyDamageToTarget(opponent, meleeDamage, this, { isMelee: true });
    spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, hitText, '#FF007F');

    // Passive stop chance on hit
    if (Math.random() < CONFIG.cronos.passiveStopChance) {
      if (opponent.applyTimeStop) {
        if (!opponent.timeStopTimer || opponent.timeStopTimer <= 0) {
          opponent.applyTimeStop(CONFIG.cronos.passiveStopDuration);
          opponent._suppressFreezeTimer = true;
          spawnFloatingText(opponent.x, opponent.y - opponent.r - 15, 'STOPPED!', '#00F3FF');
        } else {
          // Just refresh silently
          opponent.applyTimeStop(CONFIG.cronos.passiveStopDuration);
        }
      }
    }
  }

  _isInsideOwnSphere() {
    if (!this.sphereActive) return false;
    const distToSphere = Math.hypot(this.x - this.sphereX, this.y - this.sphereY);
    return distToSphere <= CONFIG.cronos.sphereRadius;
  }

  handlePoison() {
    if (this.poisonTicks > 0) {
      this.poisonTimer++;

      const grenadierCfg = CONFIG.grenadier || {};
      const intervalFrames = (typeof grenadierCfg.poisonIntervalFrames === 'number')
        ? grenadierCfg.poisonIntervalFrames
        : 60;

      const damagePerTick = (typeof grenadierCfg.poisonDamagePerTick === 'number')
        ? grenadierCfg.poisonDamagePerTick
        : 2;

      if (this.poisonTimer >= intervalFrames) {
        if (!this._isInsideOwnSphere()) {
          this.takeDamage(damagePerTick, this.lastPoisonAttacker);
          spawnFloatingText(this.x, this.y - this.r - 5, 'POISON!', '#77ff77');
          this.poisonTicks--;
        }
        this.poisonTimer = 0;
      }
    }
  }

  handleBurn() {
    if (this.burnTimer > 0) {
      this.burnTimer--;
      this.burnDamageTimer++;
      if (this.burnDamageTimer >= CONFIG.orange.burnDamageInterval) {
        if (!this._isInsideOwnSphere()) {
          const damage = CONFIG.orange.burnDamagePerSecond;
          this.takeDamage(damage, this.lastBurnAttacker, { isBurn: true });
          spawnFloatingText(this.x, this.y - this.r - 5, 'BURN!', '#ff6600');
        }
        this.burnDamageTimer = 0;
      }
    }
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    // Handle sphere cooldown
    if (this.sphereCooldown > 0) {
      this.sphereCooldown--;
    }

    if (this.doubleStrikeTimer > 0) {
      this.doubleStrikeTimer--;
    }

    // Handle melee cooldown
    if (this.meleeCooldown > 0) {
      this.meleeCooldown--;
    }

    this._updateAttackSlashEffects();

    // Handle melee swing animation
    if (this.meleeSwingActive) {
      this.meleeSwingTimer--;
      if (this.meleeSwingTimer <= 0) {
        this.meleeSwingActive = false;
        this.meleeSlashFadeTimer = 15; // Delay before it disappears (fade out)
      }
    } else if (this.meleeSlashFadeTimer > 0) {
      this.meleeSlashFadeTimer--;
    }

    // Handle active time stop sphere
    if (this.sphereActive) {
      this.sphereTimer--;
      this._applyCronosSpeed();

      // Freeze fighters that enter the sphere (re-apply each frame)
      // Stealthed assassins (invincibilityTimer or flashStepTimer > 0) are ignored by the sphere
      if (state && state.fighters) {
        for (const fighter of state.fighters) {
          if (fighter && fighter !== this && fighter.hp > 0) {
            // Skip stealthed assassins - they phase through the sphere
            if (fighter.invincibilityTimer > 0 || fighter.flashStepTimer > 0) continue;

            const dist = Math.hypot(fighter.x - this.sphereX, fighter.y - this.sphereY);
            if (dist <= CONFIG.cronos.sphereRadius) {
              // Calculate remaining frames so we don't reset visual timer when reapplying
              let remaining = fighter.timeStopTimer || 0;
              if (fighter._timeStopOriginalDuration && fighter._timeStopStartTime) {
                const elapsedMs = performance.now() - fighter._timeStopStartTime;
                const elapsedFrames = (elapsedMs / 1000) * 60;
                remaining = Math.max(0, fighter._timeStopOriginalDuration - elapsedFrames);
              }
              if (remaining <= 0) {
                fighter.applyTimeStop(CONFIG.cronos.sphereDuration);
                // Save and zero velocities so fighters are hard-stopped by sphere
                if (typeof fighter._resumeVx !== 'number') fighter._resumeVx = fighter.vx;
                if (typeof fighter._resumeVy !== 'number') fighter._resumeVy = fighter.vy;
                fighter.vx = 0;
                fighter.vy = 0;
                fighter._frozenByCronosSphere = true;
              }
              // Suppress per-fighter freeze timer display because the sphere shows duration
              fighter._suppressFreezeTimer = true;
            }
          }
        }
      }

      // PRIORITY LOCK: Prefer nearest fighter INSIDE the sphere over the global nearest opponent.
      // This makes Cronos chase and melee fighters trapped in his time-stop sphere first.
      // Stealthed assassins are ignored - they phase through the sphere completely.
      // Teammates are frozen by the sphere but NOT targeted for attacks.
      let sphereTarget = null;
      let sphereTargetDist = Infinity;
      if (state && state.fighters) {
        const selfIndex = state.fighters.indexOf(this);
        const selfTeam = state.getFighterTeam(selfIndex);

        for (const [fi, f] of state.fighters.entries()) {
          if (!f || f === this || f.hp <= 0) continue;
          // Skip teammates - they are frozen by sphere but not targeted for attacks
          if (state.mode === GAME_MODES.TWO_VS_TWO && selfTeam !== null && state.getFighterTeam(fi) === selfTeam) continue;
          // Skip stealthed assassins - they are invisible to Cronos
          if (f.invincibilityTimer > 0 || f.flashStepTimer > 0) continue;

          const distToSphere = Math.hypot(f.x - this.sphereX, f.y - this.sphereY);
          if (distToSphere <= CONFIG.cronos.sphereRadius) {
            const distToMe = Math.hypot(f.x - this.x, f.y - this.y);
            if (distToMe < sphereTargetDist) {
              sphereTargetDist = distToMe;
              sphereTarget = f;
            }
          }
        }
      }
      if (state && state.illusions) {
        for (const illusion of state.illusions) {
          if (!illusion || illusion.hp <= 0) continue;

          // Skip if owner is a teammate
          if (state.mode === GAME_MODES.TWO_VS_TWO && selfTeam !== null) {
            const ownerIndex = state.fighters.indexOf(illusion.owner);
            if (ownerIndex >= 0 && state.getFighterTeam(ownerIndex) === selfTeam) continue;
          }

          const distToSphere = Math.hypot(illusion.x - this.sphereX, illusion.y - this.sphereY);
          if (distToSphere <= CONFIG.cronos.sphereRadius) {
            const distToMe = Math.hypot(illusion.x - this.x, illusion.y - this.y);
            if (distToMe < sphereTargetDist) {
              sphereTargetDist = distToMe;
              sphereTarget = illusion;
            }
          }
        }
      }

      if (sphereTarget) {
        opponent = sphereTarget; // override: lock onto the fighter/illusion trapped inside the sphere
        this._targetInsideSphere = true;
      } else {
        this._targetInsideSphere = false;
      }

      // Freeze projectiles that enter the sphere
      const projectiles = projectileSystem.getProjectiles();
      let frozenCount = 0;
      for (const p of projectiles) {
        if (p && p.timeStopped) frozenCount++;
      }
      const maxFrozen = CONFIG.cronos.maxFrozenProjectiles || 40;

      for (const projectile of projectiles) {
        if (projectile && !projectile.timeStopped) {
          if (frozenCount >= maxFrozen) break; // Optimization: stop checking if limit reached
          const dist = Math.hypot(projectile.x - this.sphereX, projectile.y - this.sphereY);
          if (dist <= CONFIG.cronos.sphereRadius) {
            frozenCount++;
            projectile._resumeVx = projectile.vx;
            projectile._resumeVy = projectile.vy;
            projectile.vx = 0;
            projectile.vy = 0;
            projectile.timeStopped = true;
            projectile.timeStopTimer = CONFIG.cronos.sphereDuration;
            projectile.stoppedByCronosSphere = true;
          }
        }
      }

      // Check if sphere expired
      if (this.sphereTimer <= 0) {
        // Resume fighters that were frozen by this sphere
        if (state && state.fighters) {
          for (const fighter of state.fighters) {
            if (fighter && fighter !== this && fighter.hp > 0 && fighter.timeStopTimer > 0) {
              fighter.timeStopTimer = 0;
              // Restore velocities for fighters frozen by this sphere
              if (fighter._frozenByCronosSphere) {
                if (typeof fighter._resumeVx === 'number') fighter.vx = fighter._resumeVx;
                if (typeof fighter._resumeVy === 'number') fighter.vy = fighter._resumeVy;
                delete fighter._resumeVx;
                delete fighter._resumeVy;
                delete fighter._frozenByCronosSphere;
              }
              // Clear sphere-driven suppression so normal per-fighter timers can show again
              delete fighter._suppressFreezeTimer;
            }
          }
        }

        // Resume projectiles that were frozen by this sphere
        for (const projectile of projectiles) {
          if (projectile && projectile.timeStopped && projectile.stoppedByCronosSphere) {
            projectile.timeStopped = false;
            projectile.stoppedByCronosSphere = false;
            projectile.timeStopTimer = 0;
            if (typeof projectile._resumeVx === 'number' && typeof projectile._resumeVy === 'number') {
              projectile.vx = projectile._resumeVx;
              projectile.vy = projectile._resumeVy;
            } else {
              const speed = Math.hypot(projectile.vx, projectile.vy) || CONFIG.projectile.speed;
              const angle = Math.atan2(projectile.vy, projectile.vx);
              projectile.vx = Math.cos(angle) * speed;
              projectile.vy = Math.sin(angle) * speed;
            }
            if (typeof projectile._resumeVz === 'number') {
              projectile.vz = projectile._resumeVz;
            }
            delete projectile._resumeVx;
            delete projectile._resumeVy;
            delete projectile._resumeVz;
          }
        }
        this.sphereActive = false;
        this.speed = this.baseSpeed;
        spawnFloatingText(this.sphereX, this.sphereY - CONFIG.cronos.sphereRadius - 10, 'SPHERE ENDED', '#00F3FF');
      }
    } else {
      // Normal speed when sphere is not active
      this._applyCronosSpeed();

      // Try to deploy sphere when cooldown is ready and opponent is within activation distance
      if (this.sphereCooldown === 0 && opponent) {
        const distToOpponent = Math.hypot(opponent.x - this.x, opponent.y - this.y);
        if (distToOpponent <= CONFIG.cronos.sphereActivationDistance) {
          this.deployTimeStopSphere();
        }
      }
    }

    // Decay sphere impact effect (outside if/else so it runs every frame)
    if (this.sphereImpactTimer > 0) {
      this.sphereImpactTimer--;
    }

    // Movement
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    this.aim(opponent);

    // Custom bounce with sphere mechanics
    this.resolveWallBounce(arena, opponent);

    // Try melee attack
    if (opponent) {
      this._tryMeleeAttack(opponent, ownerIndex);
    }
  }

  deployTimeStopSphere() {
    this.sphereActive = true;
    this.sphereTimer = CONFIG.cronos.sphereDuration;
    this.sphereCooldown = CONFIG.cronos.sphereCooldown;
    this.sphereImpactTimer = 25; // frames for impact burst effect
    this.meleeCooldown = 0; // Reset melee cooldown to remove the attack delay

    // Store the deployment location
    this.sphereX = this.x;
    this.sphereY = this.y;

    spawnFloatingText(this.x, this.y - this.r - 15, 'TIME STOP!', '#00F3FF');
    // Play cronosphere sound
    const sphereSound = getSkillSound(this._def?.id, 'sphere');
    if (sphereSound) playSound(sphereSound.src, sphereSound.volume);

    // Apply time stop to all other fighters and projectiles
    if (state && state.fighters) {
      for (const fighter of state.fighters) {
        if (fighter && fighter !== this && fighter.hp > 0) {
          const dist = Math.hypot(fighter.x - this.sphereX, fighter.y - this.sphereY);
          if (dist <= CONFIG.cronos.sphereRadius) {
            // Calculate remaining frames so we don't reset visual timer when reapplying
            let remaining = fighter.timeStopTimer || 0;
            if (fighter._timeStopOriginalDuration && fighter._timeStopStartTime) {
              const elapsedMs = performance.now() - fighter._timeStopStartTime;
              const elapsedFrames = (elapsedMs / 1000) * 60;
              remaining = Math.max(0, fighter._timeStopOriginalDuration - elapsedFrames);
            }
            if (remaining <= 0) {
              fighter.applyTimeStop(CONFIG.cronos.sphereDuration);
              // Save and zero velocities so fighters are hard-stopped by sphere
              if (typeof fighter._resumeVx !== 'number') fighter._resumeVx = fighter.vx;
              if (typeof fighter._resumeVy !== 'number') fighter._resumeVy = fighter.vy;
              fighter.vx = 0;
              fighter.vy = 0;
              fighter._frozenByCronosSphere = true;
            }
            // Suppress per-fighter freeze timer display because the sphere shows duration
            fighter._suppressFreezeTimer = true;
          }
        }
      }
    }

    // Stop projectiles in sphere area
    const projectiles = projectileSystem.getProjectiles();
    let frozenCount = 0;
    for (const p of projectiles) {
      if (p && p.timeStopped) frozenCount++;
    }
    const maxFrozen = CONFIG.cronos.maxFrozenProjectiles || 40;

    for (const projectile of projectiles) {
      if (projectile && !projectile.timeStopped) {
        if (frozenCount >= maxFrozen) break; // Check limit to avoid lag
        const dist = Math.hypot(projectile.x - this.sphereX, projectile.y - this.sphereY);
        if (dist <= CONFIG.cronos.sphereRadius) {
          frozenCount++;
          projectile._resumeVx = projectile.vx;
          projectile._resumeVy = projectile.vy;
          projectile.vx = 0;
          projectile.vy = 0;
          projectile.timeStopped = true;
          projectile.timeStopTimer = CONFIG.cronos.sphereDuration;
          projectile.stoppedByCronosSphere = true;
        }
      }
    }
  }

  resolveWallBounce(arena, opponent) {
    let bounced = false;
    let bouncedX = false;
    let bouncedY = false;

    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      bounced = true;
      bouncedX = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      bounced = true;
      bouncedX = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      bounced = true;
      bouncedY = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      bounced = true;
      bouncedY = true;
    }

    if (this.sphereActive) {
      const distToSphere = Math.hypot(this.x - this.sphereX, this.y - this.sphereY);
      if (distToSphere > CONFIG.cronos.sphereRadius) {
        const sphereDist = Math.max(distToSphere, 0.0001);
        const nx = (this.x - this.sphereX) / sphereDist;
        const ny = (this.y - this.sphereY) / sphereDist;
        this.x = this.sphereX + nx * CONFIG.cronos.sphereRadius;
        this.y = this.sphereY + ny * CONFIG.cronos.sphereRadius;

        const dot = this.vx * nx + this.vy * ny;
        if (dot > 0) {
          this.vx -= 2 * dot * nx;
          this.vy -= 2 * dot * ny;
        }

        // Normalize speed and apply multiplier
        const bounceMultiplier = CONFIG.cronos.sphereBounceForce;
        let targetSpeed = (Math.hypot(this.vx, this.vy) || this.speed) * bounceMultiplier;

        if (opponent) {
          const dx = opponent.x - this.x;
          const dy = opponent.y - this.y;
          const dist = Math.hypot(dx, dy) || 1;
          const homingVx = (dx / dist) * targetSpeed;
          const homingVy = (dy / dist) * targetSpeed;

          // Check if homing direction points OUTWARD (which would make him stick to the wall)
          const dotHoming = homingVx * nx + homingVy * ny;
          if (dotHoming > 0) {
            // Reflect the homing velocity inwards!
            this.vx = homingVx - 2 * dotHoming * nx;
            this.vy = homingVy - 2 * dotHoming * ny;
          } else {
            // Safe to just point directly at the opponent
            this.vx = homingVx;
            this.vy = homingVy;
          }
        } else {
          const speedMagnitude = Math.hypot(this.vx, this.vy);
          if (speedMagnitude > 0) {
            this.vx = (this.vx / speedMagnitude) * targetSpeed;
            this.vy = (this.vy / speedMagnitude) * targetSpeed;
          }
        }

        bounced = true;
      }
    }

    if (bounced) {
      const wallBounced = bouncedX || bouncedY;
      if (wallBounced) this.playWallBounceSound();
      // Enhanced bounce inside sphere — lock forward toward opponent
      if (this.sphereActive) {
        const bounceMultiplier = CONFIG.cronos.sphereBounceForce;
        if (bouncedX) {
          this.vx = -this.vx * bounceMultiplier;
        }
        if (bouncedY) {
          this.vy = -this.vy * bounceMultiplier;
        }

        // Homing bounce for arena walls (opponent is always inside arena, so this is safe)
        if (bouncedX || bouncedY) {
          if (opponent) {
            const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;
            const dx = opponent.x - this.x;
            const dy = opponent.y - this.y;
            const dist = Math.hypot(dx, dy) || 1;
            this.vx = (dx / dist) * currentSpeed;
            this.vy = (dy / dist) * currentSpeed;
          } else {
            const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;
            const speedMagnitude = Math.hypot(this.vx, this.vy);
            if (speedMagnitude > 0) {
              this.vx = (this.vx / speedMagnitude) * currentSpeed;
              this.vy = (this.vy / speedMagnitude) * currentSpeed;
            }
          }
        }
      } else {
        // Normal bounce
        if (bouncedX) {
          this.vx = -this.vx;
        }
        if (bouncedY) {
          this.vy = -this.vy;
        }

        // Smart bounce toward opponent if available
        if (opponent) {
          const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;
          const dx = opponent.x - this.x;
          const dy = opponent.y - this.y;
          const dist = Math.hypot(dx, dy) || 1;
          this.vx = (dx / dist) * currentSpeed;
          this.vy = (dy / dist) * currentSpeed;
        }
      }
    }
  }

  drawBody(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const baseRadius = this.r;
    const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius);
    bodyGradient.addColorStop(0, '#b8ffff');
    bodyGradient.addColorStop(0.35, '#00d5ff');
    bodyGradient.addColorStop(1, '#081434');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const sheen = ctx.createRadialGradient(-baseRadius * 0.2, -baseRadius * 0.2, 0, 0, 0, baseRadius);
    sheen.addColorStop(0, 'rgba(255,255,255,0.24)');
    sheen.addColorStop(0.65, 'rgba(0,243,255,0.00)');
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 1;
    const hexSize = Math.max(4, baseRadius * 0.22);
    const xOffset = hexSize * 1.75;
    const yOffset = hexSize * 1.52;
    for (let row = -3; row <= 3; row++) {
      for (let col = -3; col <= 3; col++) {
        const x = col * xOffset + ((row % 2) ? xOffset * 0.5 : 0);
        const y = row * yOffset;
        if (Math.hypot(x, y) > baseRadius * 0.92) continue;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI / 6 + i * Math.PI / 3;
          const px = x + Math.cos(angle) * hexSize;
          const py = y + Math.sin(angle) * hexSize;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#00d7ff';
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,0,127,0.35)';
    ctx.lineWidth = 1.25;
    for (let i = 0; i < 5; i++) {
      const ang = i * (Math.PI * 2 / 5) + this.angle * 0.5;
      const inner = baseRadius * 0.38;
      const outer = baseRadius * 0.82;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner);
      ctx.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
      ctx.stroke();
    }
    ctx.restore();

    this.drawStatusOverlays(ctx, baseRadius);

    ctx.restore();
  }

  drawOutline(ctx) {
    // Weapon visual will be added to weaponVisuals.js
    drawCronosCrescentBlade(ctx, this.x, this.y, this.gunAngle, this.r, this.meleeSwingActive, this.meleeSwingTimer, this.meleeSwingAngle, CONFIG.cronos.meleeSwingDuration, this.meleeSwingDirection);
  }

  // Override drawGun to prevent the base class weapon from being drawn
  // Cronos uses the crescent blade visual instead
  drawGun(ctx) {
    // Empty - Cronos doesn't use a normal weapon
  }

  draw(ctx) {
    // Draw pre-activation barrier — stays visible from pre-activate window
    // all the way until the sphere is actually unleashed.
    const inPreWindow = this.sphereCooldown > 0 && this.sphereCooldown <= CONFIG.cronos.spherePreActivateFrames;
    const sphereReady = !this.sphereActive && this.sphereCooldown === 0;
    if (inPreWindow || sphereReady) {
      const now = Date.now();
      const progress = sphereReady
        ? 1  // full intensity when fully charged
        : 1 - this.sphereCooldown / Math.max(1, CONFIG.cronos.spherePreActivateFrames);
      const barrierRadius = Math.max(this.r * 1.5, 55);
      drawCronosPreActivateBarrier({
        ctx,
        cx: this.x,
        cy: this.y,
        radius: barrierRadius,
        preProgress: progress,
        now,
      });
    }

    // Draw sphere impact burst when sphere is first unleashed
    if (this.sphereImpactTimer > 0) {
      const now = Date.now();
      const impactProgress = 1 - this.sphereImpactTimer / 25;
      drawCronosSphereImpact({
        ctx,
        cx: this.x,
        cy: this.y,
        radius: Math.max(this.r * 1.5, 55),
        impactProgress,
        now,
      });
    }

    // Draw time stop sphere at deployment location
    // (rendered with sync helper in draw.js)
    if (this.sphereActive) {
      const now = Date.now();
      const elapsed = CONFIG.cronos.sphereDuration - this.sphereTimer;
      const deployProgress = Math.min(1, Math.max(0, elapsed / Math.max(1, CONFIG.cronos.sphereDuration)));

      // Visual-only renderer (sync). If it fails, fall back to the original simple sphere.
      try {
        if (typeof drawCronosSphereVisual === 'function') {
          drawCronosSphereVisual({

            ctx,
            cx: this.sphereX,
            cy: this.sphereY,
            radius: CONFIG.cronos.sphereRadius,
            alpha: 0.9,
            deployProgress,
            now,
          });
        } else {
          throw new Error('drawCronosSphereVisual not found');
        }
      } catch (e) {
        const pulse = Math.sin(Date.now() / 150) * 0.1 + 1;
        const alpha = 0.15 + Math.sin(Date.now() / 200) * 0.05;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.sphereX, this.sphereY, CONFIG.cronos.sphereRadius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 243, 255, ${alpha})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.sphereX, this.sphereY, CONFIG.cronos.sphereRadius * 0.7 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 127, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Draw melee swing arc
    if (this.meleeSwingActive || this.meleeSlashFadeTimer > 0) {
      let swingProgress = 1.0;
      let fade = this.meleeSlashFadeTimer / 15;

      if (this.meleeSwingActive) {
        swingProgress = 1 - (this.meleeSwingTimer / CONFIG.cronos.meleeSwingDuration);
        fade = 1.0;
      }

      const arcRadius = this.r + 80;
      const innerRadius = this.r + 30;

      const fullStartA = -Math.PI * 0.4; // Matches start of sword swing
      const fullEndA = Math.PI * 0.4;    // Matches end of sword swing

      const currentEndA = fullStartA + (fullEndA - fullStartA) * swingProgress;

      const fullEndX = Math.cos(fullEndA) * arcRadius;
      const fullStartX = Math.cos(fullStartA) * arcRadius;
      const fullStartY = Math.sin(fullStartA) * arcRadius;
      const cx = 2 * (innerRadius - 0.25 * (fullStartX + fullEndX));

      const glowAlpha = Math.pow(fade, 0.8) * 0.95;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.meleeSwingAngle);

      // Clip region so the slash "grows" trailing the sword
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, arcRadius + 20, fullStartA - 0.1, currentEndA);
      ctx.closePath();
      ctx.clip();

      ctx.globalCompositeOperation = 'screen';
      ctx.shadowColor = 'rgba(0, 229, 255, 0.9)';
      ctx.shadowBlur = 15;

      // Draw full shape (revealed by clip)
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius, fullStartA, fullEndA);
      ctx.quadraticCurveTo(cx, 0, fullStartX, fullStartY);
      ctx.closePath();

      // Dynamic gradient that anchors bright tip to current sword position
      const currentY = Math.sin(currentEndA) * arcRadius;
      const gradEndY = Math.max(fullStartY + 0.1, currentY);

      const slashGrad = ctx.createLinearGradient(0, fullStartY, 0, gradEndY);
      slashGrad.addColorStop(0, 'rgba(0, 229, 255, 0.0)');
      slashGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.4)');
      slashGrad.addColorStop(0.85, 'rgba(180, 255, 255, 0.85)');
      slashGrad.addColorStop(1, 'rgba(255, 255, 255, 0.9)');

      ctx.fillStyle = slashGrad;
      ctx.globalAlpha = glowAlpha;
      ctx.fill();

      // Outer edge
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius, fullStartA, fullEndA);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = glowAlpha * 0.85;
      ctx.stroke();

      // Inner trail
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius - 14, fullStartA * 0.8, fullEndA * 0.9);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = glowAlpha * 0.6;
      ctx.stroke();

      // Secondary clip: Restrict the honeycomb exactly to the crescent body
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius, fullStartA, fullEndA);
      ctx.quadraticCurveTo(cx, 0, fullStartX, fullStartY);
      ctx.closePath();
      ctx.clip(); // This intersects with the pie-slice clip from earlier!

      // Honeycomb Texture Overlay
      ctx.globalCompositeOperation = 'screen';
      ctx.shadowBlur = 0; // Disable shadow for clean texture lines

      const hexAngle = Math.PI / 3;
      const cosA = [Math.cos(Math.PI / 6), Math.cos(Math.PI / 6 + hexAngle), Math.cos(Math.PI / 6 + hexAngle * 2), Math.cos(Math.PI / 6 + hexAngle * 3), Math.cos(Math.PI / 6 + hexAngle * 4), Math.cos(Math.PI / 6 + hexAngle * 5)];
      const sinA = [Math.sin(Math.PI / 6), Math.sin(Math.PI / 6 + hexAngle), Math.sin(Math.PI / 6 + hexAngle * 2), Math.sin(Math.PI / 6 + hexAngle * 3), Math.sin(Math.PI / 6 + hexAngle * 4), Math.sin(Math.PI / 6 + hexAngle * 5)];

      const cellSize = 8;
      const cellOffsetX = cellSize * 1.75;
      const cellOffsetY = cellSize * 1.52;

      const minX = 0;
      const maxX = arcRadius;
      const minY = -arcRadius;
      const maxY = arcRadius;

      const colStart = Math.floor(minX / cellOffsetX) - 1;
      const colEnd = Math.ceil(maxX / cellOffsetX) + 1;
      const rowStart = Math.floor(minY / cellOffsetY) - 1;
      const rowEnd = Math.ceil(maxY / cellOffsetY) + 1;

      ctx.beginPath();
      for (let row = rowStart; row <= rowEnd; row++) {
        for (let col = colStart; col <= colEnd; col++) {
          const x = col * cellOffsetX + (row % 2 ? cellOffsetX * 0.5 : 0);
          const y = row * cellOffsetY;
          if (x < minX || x > maxX || y < minY || y > maxY) continue;

          for (let i = 0; i < 6; i++) {
            const px = x + cosA[i] * cellSize;
            const py = y + sinA[i] * cellSize;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        }
      }

      // Use the exact same dynamic gradient as the slash body so the texture smoothly fades towards the tail
      ctx.strokeStyle = slashGrad;
      ctx.lineWidth = 1.5;
      // glowAlpha already scales the overall transparency
      ctx.globalAlpha = glowAlpha * 1.2;
      ctx.stroke();

      ctx.restore();
    }

    super.draw(ctx);
  }
}

/**
 * Bomber Fighter (Brown)
 * Throws grenades that explode on impact with AOE damage.
 * Passive: Chance to throw sticky bombs that attach to enemies.
 * Skill: Plants C4 bombs that explode after a delay.
 * Unique: Leaves a powerful C4 bomb on death.
 */
class BomberFighter extends Fighter {
  constructor(def) {
    super(def);
    this.grenadeCooldown = 0;
    this.c4Cooldown = 0;
    this.c4Active = false;
    this.plantingTimer = 0;
    // Custom skin colors for bomber (static palette)
    this.skinColor = def.skinColor || def.color || '#4A2508';
    this.skinAccentColor = def.skinAccentColor || '#FFD700';
    // Disable base class shooting — bomber only fires grenades via update()
    this.shootCooldownMax = 9999;
  }

  // Prevent the base Fighter from firing any normal projectiles.
  // Bomber must only use fireBomberGrenade / plantC4.
  shoot(ownerIndex) {
    return; // no-op (normal projectile is undesired)
  }


  reset() {
    super.reset();
    this.grenadeCooldown = 0;
    this.c4Cooldown = 0;
    this.c4Active = false;
    this.plantingTimer = 0;
  }

  /**
   * Override wall bounce to add distance-keeping steering.
   * After bouncing off a wall, the Bomber steers toward its optimal distance from the opponent.
   */
  resolveWallBounce(arena, opponent) {
    // Capture position before bounce to detect if one occurred
    const px = this.x, py = this.y;
    super.resolveWallBounce(arena, opponent);
    const bounced = (this.x !== px || this.y !== py);

    // After bouncing, steer toward optimal distance from opponent
    if (opponent && bounced) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const optimal = CONFIG.bomber.optimalDistance;
      const steering = CONFIG.bomber.steeringForce;

      // If too close, steer away; if too far, steer toward; if in range, do nothing
      if (dist < optimal - 5) {
        // Too close — push away from opponent
        const pushStrength = steering * (1 - dist / optimal);
        this.vx -= (dx / dist) * pushStrength;
        this.vy -= (dy / dist) * pushStrength;
      } else if (dist > optimal + 5) {
        // Too far — move toward opponent
        const pullStrength = steering * (1 - optimal / dist) * 0.5;
        this.vx += (dx / dist) * pullStrength;
        this.vy += (dy / dist) * pullStrength;
      }
    }
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    // Handle cooldowns
    if (this.grenadeCooldown > 0) {
      this.grenadeCooldown--;
    }
    if (this.c4Cooldown > 0) {
      this.c4Cooldown--;
    }

    // Skill: Start planting C4 when close to opponent and cooldown is ready
    if (this.c4Cooldown === 0 && opponent && this.plantingTimer === 0) {
      const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      if (dist <= CONFIG.bomber.c4PlantRadius) {
        this.plantingTimer = 40; // Freeze for ~0.6 seconds to plant

        // Save current momentum to restore later
        this.prePlantVx = this.vx;
        this.prePlantVy = this.vy;

        this.vx = 0;
        this.vy = 0;
        spawnFloatingText(this.x, this.y - this.r - 10, 'PLANTING...', '#FFAA00');
      }
    }

    if (this.plantingTimer > 0) {
      this.plantingTimer--;
      // Dampen movement strongly to keep him planted, but allow slight pushback
      this.vx *= 0.5;
      this.vy *= 0.5;

      if (this.plantingTimer === 0) {
        // Restore momentum so he doesn't get stuck forever
        let rVx = this.prePlantVx || 0;
        let rVy = this.prePlantVy || 0;
        // If he was almost completely stopped, give him a base kick
        if (Math.abs(rVx) < 0.5 && Math.abs(rVy) < 0.5) {
          const randAngle = Math.random() * Math.PI * 2;
          rVx = Math.cos(randAngle) * this.speed;
          rVy = Math.sin(randAngle) * this.speed;
        }
        this.vx = rVx;
        this.vy = rVy;

        // Plant C4 at current position once animation finishes
        projectileSystem.plantC4(this, ownerIndex, this.x, this.y, false);
        this.c4Cooldown = CONFIG.bomber.c4Cooldown;
        spawnFloatingText(this.x, this.y - this.r - 10, 'C4 PLANTED!', '#FF4444');
      }
    } else {
      // Basic attack: throw grenades in an arc (only when not planting)
      if (this.grenadeCooldown === 0 && opponent) {
        const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
        const throwRadius = CONFIG.bomber.throwRadius;
        const restrictRadius = CONFIG.bomber.restrictRadius;

        if (dist <= throwRadius && dist >= restrictRadius) {
          const isSticky = Math.random() < CONFIG.bomber.stickyBombChance;
          projectileSystem.fireBomberGrenade(this, ownerIndex, this.damage, opponent, isSticky);
          this.grenadeCooldown = CONFIG.bomber.grenadeCooldown;

          if (isSticky) {
            spawnFloatingText(this.x, this.y - this.r - 10, 'STICKY!', '#FF6600');
          }
        }
      }
    }

    // Movement
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);
  }

  aim(opponent) {
    if (opponent) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }
  }

  onDamageDealt(target, projectile, ownerIndex) {
    spawnFloatingText(target.x, target.y - target.r - 5, 'BOOM!', '#FF6600');
  }

  takeDamage(amount, attacker, opts = {}) {
    const applied = super.takeDamage(amount, attacker, opts);

    // Death C4 mechanic
    if (this.hp === 0 && applied) {
      const ownerIndex = state.fighters.indexOf(this);
      if (ownerIndex >= 0 && projectileSystem) {
        projectileSystem.plantC4(this, ownerIndex, this.x, this.y, true);
        spawnFloatingText(this.x, this.y - this.r - 15, 'DEATH C4!', '#FF0000');
      }
    }

    return applied;
  }

  drawOutline(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.skinColor || '#4A2508';
    ctx.stroke();

    // Draw throw radius (max range — green dashed)
    const throwRadius = CONFIG.bomber.throwRadius;
    ctx.beginPath();
    ctx.arc(this.x, this.y, throwRadius, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(100, 255, 100, 0.25)';
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw restrict radius (min range — red dashed)
    const restrictRadius = CONFIG.bomber.restrictRadius;
    ctx.beginPath();
    ctx.arc(this.x, this.y, restrictRadius, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.3)';
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawBody(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Base body with custom skin color
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.skinColor;
    ctx.fill();

    // TNT texture pattern
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw "TNT" text on the body
    ctx.save();
    ctx.rotate(-this.angle); // Counter-rotate to keep text upright
    ctx.fillText('TNT', 0, 0);
    ctx.restore();

    // Add explosive warning stripes
    ctx.strokeStyle = this.skinAccentColor;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((Math.PI / 2) * i);
      ctx.beginPath();
      ctx.moveTo(this.r - 5, -3);
      ctx.lineTo(this.r - 5, 3);
      ctx.stroke();
      ctx.restore();
    }

    // Apply status effects
    this.drawStatusOverlays(ctx, this.r);

    ctx.restore();
  }

  drawGun(ctx) {
    // Bomber does not carry a visible gun model
  }

  draw(ctx) {
    super.draw(ctx);

    // Draw C4 cooldown indicator
    if (this.c4Cooldown > 0) {
      const cooldownPercent = this.c4Cooldown / CONFIG.bomber.c4Cooldown;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.beginPath();
      ctx.arc(0, 0, this.r + 8, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * cooldownPercent));
      ctx.strokeStyle = `rgba(255, 68, 68, ${0.5 + cooldownPercent * 0.5})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // Draw grenade being held in hand
    this.drawHeldGrenade(ctx);
  }

  // Draw a grenade being held in the fighter's hand
  drawHeldGrenade(ctx) {
    // Hand position is near the base of the grenade launcher, not at the muzzle tip.
    const handOffset = this.r + CONFIG.gun.baseOffset + 4;
    const handX = this.x + Math.cos(this.gunAngle) * handOffset;
    const handY = this.y + Math.sin(this.gunAngle) * handOffset;

    // Offset the grenade slightly to the side of the launcher so it looks held, not pointed.
    const perpX = -Math.sin(this.gunAngle);
    const perpY = Math.cos(this.gunAngle);
    const grenadeRadius = Math.max(4, this.r * 0.35);
    const sideOffset = grenadeRadius * 0.7;
    const forwardOffset = -6;
    const gx = handX + Math.cos(this.gunAngle) * forwardOffset + perpX * sideOffset;
    const gy = handY + Math.sin(this.gunAngle) * forwardOffset + perpY * sideOffset;

    // Draw the grenade with a fixed top-facing orientation.
    drawBomberGrenade(ctx, gx, gy, grenadeRadius, {
      rotation: 0,
      isSticky: false,
      sparkPhase: Date.now() / 100,
      trailPoints: [],
      shadowAlpha: 0.15,
      zHeight: 0,
      isHeld: true,
    });

    // Draw fingers gripping the grenade (simple representation)
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(this.gunAngle);

    // Draw simple finger indicators
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // Three fingers wrapping around the grenade
    for (let i = 0; i < 3; i++) {
      const fingerY = -4 + i * 4;
      ctx.beginPath();
      ctx.arc(forwardOffset + sideOffset * 0.9, fingerY, 3, 0, Math.PI, true);
      ctx.stroke();
    }

    ctx.restore();
  }
}

/**
 * Gun Slinger Fighter
 * Dual-wields revolvers on both sides of the body.
 * Alternates shots with a delay between guns.
 * Passive: chance to deal critical damage.
 * Active skill: rapid sync fire from both guns.
 */
class GunSlingerFighter extends Fighter {
  constructor(def) {
    super(def);
    this.leftGunTimer = 0; // Timer for left gun delay
    this.muzzleFlashTimer = 0; // Timer for muzzle flash animation
    this.skillTimer = 0; // Cooldown for active skill
    this.skillActive = false; // Is skill currently active
    this.skillBurstTimer = 0; // Timer for skill burst intervals
    this.skillBurstCount = 0; // Number of bursts fired in current skill
    this.currentGun = 'right'; // Which gun fires next
    this.rightGunAngle = 0; // Aim angle for right gun
    this.leftGunAngle = 0;  // Aim angle for left gun

    // Magazine system
    this.magazineBullets = CONFIG.gunslinger.magazineSize; // Current bullets in magazine
    this.maxMagazine = CONFIG.gunslinger.magazineSize; // Max magazine capacity
    this.reloadTimer = 0; // Reload timer
    this.isReloading = false; // Is currently reloading

    // Smoke effect for skill
    this.smokeTimer = 0; // Timer for smoke effect duration
    this.smokeParticles = []; // Array of smoke particles

    // Recoil animation (separate for each gun)
    this.rightRecoilOffset = 0; // Right gun recoil offset
    this.rightRecoilTilt = 0;  // Right gun recoil tilt
    this.leftRecoilOffset = 0; // Left gun recoil offset
    this.leftRecoilTilt = 0;   // Left gun recoil tilt
  }

  reset() {
    super.reset();
    this.leftGunTimer = 0;
    this.muzzleFlashTimer = 0;
    this.skillTimer = 0;
    this.skillActive = false;
    this.skillBurstTimer = 0;
    this.skillBurstCount = 0;
    this.currentGun = 'right';
    this.rightGunAngle = 0;
    this.leftGunAngle = 0;
    this.magazineBullets = this.maxMagazine;
    this.reloadTimer = 0;
    this.isReloading = false;
    this.smokeTimer = 0;
    this.smokeParticles = [];
    this.rightRecoilOffset = 0;
    this.rightRecoilTilt = 0;
    this.leftRecoilOffset = 0;
    this.leftRecoilTilt = 0;
  }

  _spawnSmoke() {
    // Spawn smoke particles around the guns when skill is used
    const particleCount = 6; // Reduced from 8 for better performance
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 0.3 + Math.random() * 0.5;
      const offsetX = Math.cos(this.rightGunAngle) * 25;
      const offsetY = Math.sin(this.rightGunAngle) * 25;
      this.smokeParticles.push({
        x: this.x + offsetX + (Math.random() - 0.5) * 10,
        y: this.y + offsetY + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 30 + Math.random() * 20,
        size: 8 + Math.random() * 6,
      });
    }
    this.smokeTimer = 40;
  }

  _updateSmoke() {
    if (this.smokeTimer > 0) {
      this.smokeTimer--;
    }
    // Update existing particles - iterate backwards for safe removal
    let i = this.smokeParticles.length;
    while (i--) {
      const p = this.smokeParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.size += 0.15;
      p.life--;
      if (p.life <= 0) {
        this.smokeParticles[i] = this.smokeParticles[this.smokeParticles.length - 1];
        this.smokeParticles.pop();
      }
    }
  }

  _drawSmoke(ctx) {
    const count = this.smokeParticles.length;
    if (count === 0) return;

    // Pre-compute common values
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < count; i++) {
      const p = this.smokeParticles[i];
      const alpha = (p.life / p.maxLife) * 0.35;
      const size = p.size;

      // Use solid circle with alpha instead of expensive gradient
      // Inner bright core
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = '#a0a0a0';
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Outer soft ring
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = '#606060';
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawLowAmmoSmoke(ctx) {
    const ratio = this.magazineBullets / this.maxMagazine;
    const threshold = 0.3;
    if (ratio >= threshold) return;

    const intensity = 1 - ratio / threshold;
    const alpha = intensity * 0.4;

    const p = GUNSLINGER_WEAPON_GRAPHICS.positioning;
    const scale = p.scale;
    const gunOffset = this.r + p.gunOffset;
    const leftOffset = p.leftGunOffset;

    const rightMuzzleX = this.x + Math.cos(this.rightGunAngle) * (gunOffset + 26 * scale);
    const rightMuzzleY = this.y + Math.sin(this.rightGunAngle) * (gunOffset + 26 * scale);
    const leftMuzzleX = this.x + Math.cos(this.leftGunAngle) * (-gunOffset + leftOffset + 26 * scale);
    const leftMuzzleY = this.y + Math.sin(this.leftGunAngle) * (-gunOffset + leftOffset + 26 * scale);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    for (const [mx, my] of [[rightMuzzleX, rightMuzzleY], [leftMuzzleX, leftMuzzleY]]) {
      // Use solid circles instead of expensive gradient
      // Inner core
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#888888';
      ctx.beginPath();
      ctx.arc(mx, my, 8, 0, Math.PI * 2);
      ctx.fill();

      // Outer soft ring
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = '#555555';
      ctx.beginPath();
      ctx.arc(mx, my, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  aim(opponent, secondaryOpponent = null) {
    if (!opponent) return;

    this.rightGunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.gunAngle = this.rightGunAngle;

    if (secondaryOpponent) {
      this.leftGunAngle = Math.atan2(secondaryOpponent.y - this.y, secondaryOpponent.x - this.x);
    } else {
      // Both guns aim at the primary target
      this.leftGunAngle = this.rightGunAngle;
    }
  }

  getTargets() {
    const targets = [];
    const selfIndex = state.fighters.indexOf(this);
    const selfTeam = state.getFighterTeam(selfIndex);

    state.fighters.forEach((other, otherIndex) => {
      if (!other || other === this || other.hp <= 0) return;
      if (other.invincibilityTimer > 0 || other.flashStepTimer > 0) return;
      if (state.mode === GAME_MODES.TWO_VS_TWO && selfTeam !== null && state.getFighterTeam(otherIndex) === selfTeam) return;

      const dx = other.x - this.x;
      const dy = other.y - this.y;
      targets.push({ fighter: other, dist: Math.hypot(dx, dy) });
    });

    // Also include illusions as targets (but not own illusions)
    for (const illusion of state.illusions || []) {
      if (!illusion || illusion.hp <= 0 || illusion.owner === this) continue;
      const dx = illusion.x - this.x;
      const dy = illusion.y - this.y;
      targets.push({ fighter: illusion, dist: Math.hypot(dx, dy) });
    }

    targets.sort((a, b) => a.dist - b.dist);
    return targets.map((entry) => entry.fighter);
  }

  _startReload() {
    if (this.isReloading) return;
    this.isReloading = true;
    this.reloadTimer = CONFIG.gunslinger.reloadTime;
    spawnFloatingText(this.x, this.y - this.r - 10, 'RELOADING', '#66ccff');
    // Play reload sound
    const reloadSound = getSkillEffectSound(this._def?.id, 'reload');
    if (reloadSound) playSound(reloadSound.src, reloadSound.volume);
  }

  _finishReload() {
    this.magazineBullets = this.maxMagazine;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.gunSpinTimer = 20;
    this.gunSpinDuration = 20;
    spawnFloatingText(this.x, this.y - this.r - 10, 'RELOADED', '#aaffff');
  }

  fireBullet(ownerIndex, damage, isSkill = false, target = null) {
    if (!projectileSystem) return;
    if (this.isReloading && !isSkill) return;
    if (!isSkill && this.magazineBullets <= 0) {
      this._startReload();
      return;
    }

    const speed = CONFIG.gunslinger.bulletSpeed;
    const bulletDamage = isSkill ? CONFIG.gunslinger.skillDamage : damage;

    if (!isSkill) {
      this.magazineBullets = Math.max(0, this.magazineBullets - 1);
      if (this.magazineBullets === 0) {
        this._startReload();
      }
    } else {
      // Skill bullets also consume from magazine
      this.magazineBullets = Math.max(0, this.magazineBullets - 1);
    }

    const gunAngle = target
      ? Math.atan2(target.y - this.y, target.x - this.x)
      : (this.currentGun === 'right' ? this.rightGunAngle : this.leftGunAngle);

    // Calculate exact spawn position at the gun barrel tip
    const isRightGun = this.currentGun === 'right';

    // Based on gunSlingerWeaponGraphics:
    // The guns are positioned at X = r * 0.3 (forward) and Y = +/- (r * 0.6) (sides)
    // The muzzle flash is drawn at X = 26 * 0.9 = 23.4 relative to gun center
    const forwardOffset = (this.r * 0.3) + 23.4;
    const sideOffset = isRightGun ? (this.r * 0.6) : -(this.r * 0.6);

    // Convert local offsets to global coordinates based on gunAngle
    const spawnX = this.x + Math.cos(gunAngle) * forwardOffset - Math.sin(gunAngle) * sideOffset;
    const spawnY = this.y + Math.sin(gunAngle) * forwardOffset + Math.cos(gunAngle) * sideOffset;

    projectileSystem.fireProjectile(this, ownerIndex, bulletDamage, false, speed, false, null, spawnX, spawnY, gunAngle);

    // Play Gun Slinger shot sound with configurable timing
    const sound = getBasicAttackSound(this._def?.id, this._def?.type);
    this._attackSoundTimer = sound.delay;
    this._attackSoundConfig = sound;

    const isCrit = !isSkill && Math.random() < CONFIG.gunslinger.critChance;
    this._lastShotWasCrit = isCrit;

    if (this.currentGun === 'right') {
      this.currentGun = 'left';
      this.leftGunTimer = CONFIG.gunslinger.leftGunDelay;
    } else {
      this.currentGun = 'right';
    }
  }

  activateSkill(ownerIndex) {
    if (this.skillTimer > 0 || this.isReloading) return;
    const requiresFull = CONFIG.gunslinger.skillRequiresFullMag;
    const isLowMag = this.magazineBullets <= CONFIG.gunslinger.autoSkillThreshold;
    if (requiresFull && this.magazineBullets < this.maxMagazine && !isLowMag) return;

    this.skillActive = true;
    this.skillTimer = CONFIG.gunslinger.skillCooldown;
    this.skillBurstTimer = 0;
    this.skillBurstCount = 0;
    // Don't reload here — let the skill fire first, then reload when it ends

    spawnFloatingText(this.x, this.y - this.r - 10, 'RAPID FIRE!', '#ff6600');
  }

  onDamageDealt(target, projectile, ownerIndex) {
    if (!projectile.isSkill) {
      // Add a very small knockback on basic attacks
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const knockbackStrength = CONFIG.gunslinger.basicAttackKnockback;
      target.knockbackVx = (target.knockbackVx || 0) + (dx / dist) * knockbackStrength;
      target.knockbackVy = (target.knockbackVy || 0) + (dy / dist) * knockbackStrength;

      // Apply critical damage if the last shot was a crit
      if (this._lastShotWasCrit) {
        const extraDamage = this.damage * (CONFIG.gunslinger.critMultiplier - 1);
        target.takeDamage(extraDamage, this, { isCrit: true });
        spawnFloatingText(target.x, target.y - target.r - 15, 'CRIT!', '#ffaa00');
        this._lastShotWasCrit = false;
      }
    }
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    // Handle skill cooldown
    if (this.skillTimer > 0) {
      this.skillTimer--;
    }

    // Handle reload timer
    if (this.isReloading) {
      if (this.reloadTimer > 0) {
        this.reloadTimer--;
      }
      if (this.reloadTimer === 0) {
        this._finishReload();
      }
    }

    // Handle left gun delay
    if (this.leftGunTimer > 0) {
      this.leftGunTimer--;
    }

    // Handle muzzle flash timer
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer--;
    }

    // Handle gun spin timer
    if (this.gunSpinTimer > 0) {
      this.gunSpinTimer--;
    }

    // Handle recoil animation decay (separate for each gun)
    const recoilConfig = GUNSLINGER_WEAPON_GRAPHICS.recoil;

    // Right gun recoil decay
    if (this.rightRecoilOffset > 0) {
      this.rightRecoilOffset *= (1 - recoilConfig.recoilDecay);
      if (this.rightRecoilOffset < 0.1) {
        this.rightRecoilOffset = 0;
      }
    }
    if (this.rightRecoilTilt > 0) {
      this.rightRecoilTilt *= (1 - recoilConfig.tiltDecay);
      if (this.rightRecoilTilt < 0.001) {
        this.rightRecoilTilt = 0;
      }
    }

    // Left gun recoil decay
    if (this.leftRecoilOffset > 0) {
      this.leftRecoilOffset *= (1 - recoilConfig.recoilDecay);
      if (this.leftRecoilOffset < 0.1) {
        this.leftRecoilOffset = 0;
      }
    }
    if (this.leftRecoilTilt > 0) {
      this.leftRecoilTilt *= (1 - recoilConfig.tiltDecay);
      if (this.leftRecoilTilt < 0.001) {
        this.leftRecoilTilt = 0;
      }
    }

    // Update smoke particles
    this._updateSmoke();

    const targets = this.getTargets();
    const primaryTarget = targets[0] || opponent;
    const secondaryTarget = targets[1] || null;
    this.aim(primaryTarget, secondaryTarget);

    // Auto-trigger skill when magazine is low and skill is ready
    if (primaryTarget && this.skillTimer <= 0 && !this.skillActive && !this.isReloading) {
      const canActivateFromLowMag = this.magazineBullets <= CONFIG.gunslinger.autoSkillThreshold;
      const hasFullMagForSkill = this.magazineBullets === this.maxMagazine;

      if (canActivateFromLowMag) {
        // Low magazine: activate immediately
        this.activateSkill(ownerIndex);
      } else if (hasFullMagForSkill && Math.random() < 0.02) {
        // Full magazine: small random chance to activate
        this.activateSkill(ownerIndex);
      }
    }

    // Handle active skill (rapid sync fire)
    if (this.skillActive) {
      this.skillBurstTimer++;

      if (this.skillBurstTimer >= CONFIG.gunslinger.skillBurstInterval) {
        this.skillBurstTimer = 0;

        if (this.skillBurstCount < CONFIG.gunslinger.skillBurstCount) {
          // Fire both guns in sync during skill - but with slight recoil offset for visual variety
          this.currentGun = 'right';
          this.fireBullet(ownerIndex, CONFIG.gunslinger.skillDamage, true);
          this.muzzleFlashTimer = 5;
          this.rightRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil;
          this.rightRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt;
          this._spawnSmoke();
          this.currentGun = 'left';
          this.fireBullet(ownerIndex, CONFIG.gunslinger.skillDamage, true);
          this.muzzleFlashTimer = 5;
          this.leftRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil * 0.85; // Slightly different recoil
          this.leftRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt * 0.9;
          this._spawnSmoke();
          this.skillBurstCount++;
        } else {
          // Skill finished — reload now
          this.skillActive = false;
          this.skillBurstCount = 0;
          this.currentGun = 'right';
          this._startReload();
        }
      }
    } else {
      // Normal attack - alternating shots and dual-target firing when possible
      if (this.shootCooldown > 0) {
        this.shootCooldown--;
      } else if (secondaryTarget && !this.isReloading && this.magazineBullets > 1) {
        this.currentGun = 'right';
        this.fireBullet(ownerIndex, this.damage, false, primaryTarget);
        this.muzzleFlashTimer = 5;
        this.rightRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil;
        this.rightRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt;
        this.currentGun = 'left';
        this.fireBullet(ownerIndex, this.damage, false, secondaryTarget);
        this.muzzleFlashTimer = 5;
        this.leftRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil * 0.9;
        this.leftRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt * 0.85;
        this.shootCooldown = CONFIG.gunslinger.shotCooldown;
      } else if (this.leftGunTimer === 0 && !this.isReloading && this.magazineBullets > 0) {
        this.fireBullet(ownerIndex, this.damage);
        this.muzzleFlashTimer = 5;
        // Alternate which gun gets the full recoil (creates visual variety)
        if (this.currentGun === 'right') {
          this.rightRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil;
          this.rightRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt;
          this.leftRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil * 0.3; // Small secondary recoil
          this.leftRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt * 0.3;
        } else {
          this.leftRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil;
          this.leftRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt;
          this.rightRecoilOffset = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxRecoil * 0.3;
          this.rightRecoilTilt = GUNSLINGER_WEAPON_GRAPHICS.recoil.maxTilt * 0.3;
        }
        this.shootCooldown = CONFIG.gunslinger.shotCooldown;
      } else if (this.magazineBullets === 0 && !this.isReloading) {
        this._startReload();
      }
    }

    // Movement — slow down during reload
    const speedMult = this.isReloading ? CONFIG.gunslinger.reloadSpeedPenalty : 1;
    this.x += this.vx * speedMult;
    this.y += this.vy * speedMult;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    this.resolveWallBounce(arena);
  }

  drawGun(ctx) {
    const isFiring = this.muzzleFlashTimer > 0;

    let gunSpinAngle = 0;
    if (this.gunSpinTimer > 0) {
      const t = this.gunSpinTimer / this.gunSpinDuration;
      // 1 full rotation (Math.PI * 2) backward. Starts at 1, goes to 0.
      // Using t*t for a nice ease-out effect.
      gunSpinAngle = (t * t) * Math.PI * 2;
    }

    drawGunSlingerDualRevolver(
      this.x, this.y,
      this.rightGunAngle, this.leftGunAngle,
      this.r,
      isFiring,
      this.muzzleFlashTimer,
      this.rightRecoilOffset, this.rightRecoilTilt,  // Right gun recoil
      this.leftRecoilOffset, this.leftRecoilTilt,      // Left gun recoil
      gunSpinAngle
    );
    // Draw smoke effect around the guns
    this._drawSmoke(ctx);
    // Draw low ammo smoke effect
    this._drawLowAmmoSmoke(ctx);
  }

  drawMagazineBar(ctx) {
    // Determine which way the character is aiming (using primary right gun angle)
    const isFacingLeft = Math.abs(this.rightGunAngle) > Math.PI / 2;

    const magW = 16;
    const magH = 50;

    let magX;
    let bendDir;

    if (isFacingLeft) {
      // Character facing left -> put magazine on his right (behind him)
      magX = this.x + this.r + 14;
      bendDir = -1; // Curve left (towards the player)
    } else {
      // Character facing right -> put magazine on his left (behind him)
      magX = this.x - this.r - magW - 14;
      bendDir = 1; // Curve right (towards the player)
    }

    const magY = this.y - magH / 2;
    const bend = 8 * bendDir;

    ctx.save();

    // --- Depth Shadow ---
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    // --- 1. Draw Magazine Body (Dark Polymer) ---
    ctx.fillStyle = '#222428';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(magX + 2, magY + 6);
    ctx.lineTo(magX + magW, magY);
    ctx.quadraticCurveTo(magX + magW + bend, magY + magH / 2, magX + magW, magY + magH);
    ctx.lineTo(magX, magY + magH);
    ctx.quadraticCurveTo(magX + bend, magY + magH / 2, magX + 2, magY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Disable shadow for inner components
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // --- Add Magazine Ridges (Texture) ---
    ctx.strokeStyle = '#1a1b1f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let ry = magY + 15; ry < magY + magH - 5; ry += 6) {
      const t = (ry - magY) / magH;
      const curveOffset = 2 * (1 - t) * t * bend;

      ctx.moveTo(magX + 2 + curveOffset, ry);
      ctx.lineTo(magX + 6 + curveOffset, ry);
    }
    ctx.stroke();

    // --- 2. Draw Magazine Window (Transparent view) ---
    const winX = magX + 6;
    const winW = magW - 8;
    const winY = magY + 5;
    const winH = magH - 10;
    const innerBend = bend * 0.8;

    ctx.beginPath();
    ctx.moveTo(winX, winY + 2);
    ctx.lineTo(winX + winW, winY);
    ctx.quadraticCurveTo(winX + winW + innerBend, winY + winH / 2, winX + winW, winY + winH);
    ctx.lineTo(winX, winY + winH);
    ctx.quadraticCurveTo(winX + innerBend, winY + winH / 2, winX, winY + 2);
    ctx.closePath();

    // Fill the background of the window
    ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
    ctx.fill();

    // Save state before clipping
    ctx.save();
    ctx.clip(); // Clip everything inside to the window shape

    // --- 3. Draw Bullets Inside ---
    const bullets = this.magazineBullets;
    const bW = 3.5;
    const bH = 6;
    const rowSpacing = 3.1;

    // Spring follower (pushes bullets up)
    const activeRows = Math.ceil(bullets / 2);
    const followerY = winY + winH - 2 - activeRows * rowSpacing;

    ctx.fillStyle = '#ff2a2a'; // Red polymer follower
    ctx.fillRect(winX - 10, followerY, winW + 20, 4);

    // Draw each bullet
    for (let i = 0; i < bullets; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);

      const by = winY + winH - 2 - bH - row * rowSpacing;
      const t = (by - magY) / magH;
      const curveOffset = 2 * (1 - t) * t * bend;

      // Staggered double-stack + curve offset
      const bx = winX + 0.5 + col * 3.5 + curveOffset;

      // Brass casing
      ctx.fillStyle = '#f2c62c';
      ctx.fillRect(bx, by, bW, bH);

      // Casing shading
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(bx + bW - 1.5, by, 1.5, bH);

      // Copper projectile tip
      ctx.fillStyle = '#d4652f';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + bW / 2, by - 3);
      ctx.lineTo(bx + bW, by);
      ctx.closePath();
      ctx.fill();
    }

    // --- 4. Reload Animation / Overlay ---
    if (this.isReloading) {
      const reloadRatio = 1 - (this.reloadTimer / CONFIG.gunslinger.reloadTime);
      const scanY = winY + winH - (winH * reloadRatio);

      ctx.fillStyle = 'rgba(0, 255, 255, 0.35)';
      ctx.fillRect(winX - 10, scanY, winW + 20, winH);

      ctx.fillStyle = '#0ff';
      ctx.fillRect(winX - 10, scanY - 1, winW + 20, 2);
    }

    // Restore clipping
    ctx.restore();

    // Draw window border on top
    ctx.beginPath();
    ctx.moveTo(winX, winY + 2);
    ctx.lineTo(winX + winW, winY);
    ctx.quadraticCurveTo(winX + winW + innerBend, winY + winH / 2, winX + winW, winY + winH);
    ctx.lineTo(winX, winY + winH);
    ctx.quadraticCurveTo(winX + innerBend, winY + winH / 2, winX, winY + 2);
    ctx.closePath();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- 5. External Text / Glow ---
    if (this.isReloading) {
      // RELOAD Text on the side
      ctx.fillStyle = '#0ff';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.save();
      const textX = isFacingLeft ? magX + magW + 8 : magX - 8;
      ctx.translate(textX, magY + magH / 2);
      ctx.rotate(isFacingLeft ? Math.PI / 2 : -Math.PI / 2);
      ctx.fillText('RELOAD', 0, 0);
      ctx.restore();
    } else {
      // Full magazine glow accent
      if (bullets === this.maxMagazine) {
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(magX + 2, magY + 6);
        ctx.lineTo(magX + magW, magY);
        ctx.quadraticCurveTo(magX + magW + bend, magY + magH / 2, magX + magW, magY + magH);
        ctx.lineTo(magX, magY + magH);
        ctx.quadraticCurveTo(magX + bend, magY + magH / 2, magX + 2, magY + 6);
        ctx.closePath();
        ctx.stroke();
      }

      // Ammo count text below the magazine
      ctx.fillStyle = bullets <= 6 ? '#ff4444' : '#cccccc';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${bullets}`, magX + magW / 2, magY + magH + 3);
    }

    ctx.restore();
  }

  draw(ctx) {
    // Draw skill indicator when active
    if (this.skillActive) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, this.r + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    super.draw(ctx);
    this.drawMagazineBar(ctx);
  }
}

/**
 * Doppleganger — Illusion melee fighter
 * Core mechanic: Creates illusions of itself when health drops by 25%
 * Weapon: Purple crystalline sword
 */
class DopplegangerFighter extends Fighter {
  constructor(def) {
    super(def);
    this.swordCooldown = 0;
    this.swordSwingActive = false;
    this.swordSwingTimer = 0;
    this.swordSwingAngle = 0;
    this.swordSwingDuration = CONFIG.doppleganger?.swordSwingDuration ?? 20;

    // Illusion tracking
    this.lastHealthThreshold = 1.0; // Starts at 100% (1.0)
    this.illusionsSummoned = 0;
  }

  reset() {
    super.reset();
    this.swordCooldown = 0;
    this.swordSwingActive = false;
    this.swordSwingTimer = 0;
    this.swordSwingAngle = 0;
    this.swordSwingDuration = CONFIG.doppleganger?.swordSwingDuration ?? 20;
    this.lastHealthThreshold = 1.0;
    this.illusionsSummoned = 0;

    // Clear illusions on reset
    state.illusions = state.illusions.filter(ill => ill.owner !== this);
  }

  // Auto-lock toward enemy upon wall bounce
  resolveWallBounce(arena, opponent) {
    if (!opponent) {
      super.resolveWallBounce(arena);
      return;
    }

    let bounced = false;

    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      bounced = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      bounced = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      bounced = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      bounced = true;
    }

    if (bounced) {
      this.playWallBounceSound();
      // Instead of physical reflection, bounce perfectly toward the enemy
      const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.vx = (dx / d) * currentSpeed;
      this.vy = (dy / d) * currentSpeed;
    }
  }

  takeDamage(amount, attacker, opts = {}) {
    const prevHp = this.hp;
    const applied = super.takeDamage(amount, attacker, opts);

    if (applied && amount > 0) {
      const healthPercent = this.hp / this.maxHp;
      const threshold = CONFIG.doppleganger.illusionHealthPercent; // 0.25 (25%)

      // Check if we've crossed a 25% threshold
      const prevThreshold = Math.floor(prevHp / this.maxHp / threshold);
      const currentThreshold = Math.floor(healthPercent / threshold);

      if (currentThreshold < prevThreshold && this.illusionsSummoned < CONFIG.doppleganger.maxIllusions) {
        this.summonIllusion();
      }
    }

    return applied;
  }

  summonIllusion() {
    if (this.illusionsSummoned >= CONFIG.doppleganger.maxIllusions) return;

    // Spawn illusion at a random position near the Doppleganger
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 30;
    const illusionX = this.x + Math.cos(angle) * distance;
    const illusionY = this.y + Math.sin(angle) * distance;

    // Illusion health is based on current Doppleganger health
    const illusionHealth = this.hp * 0.5; // 50% of current health

    // Illusions spawn with the owner's current movement speed to match exactly
    const illusionSpeed = this.speed || this.baseSpeed || 3;

    // Lock onto nearest target initially
    let targetAngle = Math.random() * Math.PI * 2;
    let nearestDist = Infinity;
    for (const fighter of state.fighters) {
      if (!fighter || fighter.hp <= 0 || fighter === this) continue;
      const dist = Math.hypot(fighter.x - illusionX, fighter.y - illusionY);
      if (dist < nearestDist) {
        nearestDist = dist;
        targetAngle = Math.atan2(fighter.y - illusionY, fighter.x - illusionX);
      }
    }

    const illusion = {
      x: illusionX,
      y: illusionY,
      vx: Math.cos(targetAngle) * illusionSpeed,
      vy: Math.sin(targetAngle) * illusionSpeed,
      r: this.r,
      color: this.color,
      hp: illusionHealth,
      maxHp: illusionHealth,
      damage: this.damage * CONFIG.doppleganger.illusionDamagePercent,
      owner: this,
      swordCooldown: 30,
      swordSwingActive: false,
      swordSwingTimer: 0,
      swordSwingAngle: 0,
      duration: CONFIG.doppleganger.illusionDuration, // Kept for visual reference but not used for removal
      angle: 0,
      gunAngle: 0,
      moveSpeed: illusionSpeed, // Store for speed normalization after bounce
      isIllusion: true,
      takeDamage(amount, attacker, opts = {}) {
        return applyDamageToTarget(this, amount, attacker, opts);
      },
    };

    state.illusions.push(illusion);
    spawnIllusionSpawn(illusion);
    this.illusionsSummoned++;
    spawnFloatingText(this.x, this.y - this.r - 15, 'ILLUSION!', '#9b59b6');
    // Play summon illusion sound
    const illusionSound = getSkillSound(this._def?.id, 'summonillusion');
    if (illusionSound) playSound(illusionSound.src, illusionSound.volume);
  }

  _trySwordSwing(opponent, ownerIndex) {
    if (!opponent || this.swordCooldown > 0) return;
    const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    if (dist > this.r + opponent.r + CONFIG.doppleganger.swordRange) return;

    // Hit!
    this.swordSwingAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.swordSwingActive = true;
    this.swordSwingTimer = this.swordSwingDuration;
    this.swordCooldown = CONFIG.doppleganger.swordCooldown;
    // Use this.damage which is already reduced for illusions (50% of Doppleganger's damage)
    opponent.takeDamage(this.damage, this, { isMelee: true });
    spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, 'SLASH!', '#9b59b6');

    // Play attack sound
    const sound = getBasicAttackSound(this._def?.id, this._def?.type);
    this._attackSoundTimer = sound.delay;
    this._attackSoundConfig = sound;
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // Time stop - freeze movement
    if (this._handleTimeStop()) {
      return;
    }

    // Sword swing cooldown
    if (this.swordCooldown > 0) {
      this.swordCooldown--;
    }

    // Sword swing animation timer
    if (this.swordSwingActive) {
      this.swordSwingTimer--;
      if (this.swordSwingTimer <= 0) {
        this.swordSwingActive = false;
      }
    }

    // Try sword swing
    this._trySwordSwing(opponent, ownerIndex);

    // Velocity Recovery (gradually return to target speed after knockback or slow)
    // This matches the base Fighter behavior so illusions don't outrun the Doppelganger
    let targetSpeed = this.speed;
    if (this.slowTimer > 0) {
      this.slowTimer--;
      targetSpeed *= this.slowMultiplier;
    }
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
      const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.04;
      this.vx = (this.vx / currentSpeed) * newSpeed;
      this.vy = (this.vy / currentSpeed) * newSpeed;
    }

    // Movement
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);
  }

  /** Auto-locks onto opponent like Aimbot fighters */
  aim(opponent) {
    if (!opponent || opponent.hp <= 0) return;
    this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
  }

  drawBody(ctx) {
    const animTime = this.animationTime || Date.now();
    // Draw the haze and void core UNDER the body
    drawDopplegangerBodyEffect(ctx, this.x, this.y, this.r, this.angle, 'under', animTime);
    // Custom body skin
    drawDoppelgangerSkin(ctx, this.x, this.y, this.r, this.angle, animTime);
    // Draw the swirling violet smoke OVER the body
    drawDopplegangerBodyEffect(ctx, this.x, this.y, this.r, this.angle, 'over', animTime);
  }

  drawGun(ctx) {
    const animTime = this.animationTime || Date.now();
    drawDopplegangerPurpleSword(
      ctx,
      this.x, this.y,
      this.gunAngle,
      this.r,
      this.swordSwingActive,
      this.swordSwingTimer,
      this.swordSwingAngle,
      this.swordSwingDuration
    );
  }
}

// Draw all active Cronos spheres on top of everything (including illusions)
export function drawAllCronosSpheres(ctx) {
  const now = Date.now();
  for (const fighter of state.fighters) {
    if (!fighter || !fighter.sphereActive) continue;
    const elapsed = CONFIG.cronos.sphereDuration - fighter.sphereTimer;
    const deployProgress = Math.min(1, Math.max(0, elapsed / Math.max(1, CONFIG.cronos.sphereDuration)));

    try {
      if (typeof drawCronosSphereVisual === 'function') {
        drawCronosSphereVisual({
          ctx,
          cx: fighter.sphereX,
          cy: fighter.sphereY,
          radius: CONFIG.cronos.sphereRadius,
          alpha: 0.9,
          deployProgress,
          now,
        });
      }
    } catch (e) {
      // Fallback simple sphere
      const pulse = Math.sin(now / 150) * 0.1 + 1;
      const alpha = 0.15 + Math.sin(now / 200) * 0.05;
      ctx.save();
      ctx.beginPath();
      ctx.arc(fighter.sphereX, fighter.sphereY, CONFIG.cronos.sphereRadius * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 243, 255, ${alpha})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
}

/**
 * Dummy Fighter
 * Does absolutely nothing. Great for testing.
 */
class DummyFighter extends Fighter {
  constructor(def) {
    super(def);
    this.baseDamage = 5;
    this.baseCooldown = 30;
  }

  update(opponent, ownerIndex, arena) {
    if (state.dummyAggressive) {
      this.damage = this.baseDamage;
      this.cooldown = this.baseCooldown;
    } else {
      this.damage = 0;
      this.cooldown = 9999;
    }

    super.update(opponent, ownerIndex, arena);

    // Simple auto-aim and fire logic if aggressive
    if (state.dummyAggressive && opponent && !this.isDead) {
      const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);

      // Smooth aim
      let delta = targetAngle - this.angle;
      while (delta <= -Math.PI) delta += Math.PI * 2;
      while (delta > Math.PI) delta -= Math.PI * 2;
      this.angle += delta * 0.1; // Turn speed

      const aligned = Math.abs(delta) < 0.1;

      if (aligned && this.shootCooldown <= 0) {
        // Fire basic projectile
        const speed = 8;
        projectileSystem.fireProjectile(this, ownerIndex, this.damage, false, speed, false);
        this.shootCooldown = this.cooldown;
      }
    }
  }

  draw(ctx) {
    super.draw(ctx);
    if (!this.isDead) {
      // Draw a target decal
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.r * 0.5, 0, Math.PI * 2);
      ctx.moveTo(-this.r * 0.7, 0);
      ctx.lineTo(this.r * 0.7, 0);
      ctx.moveTo(0, -this.r * 0.7);
      ctx.lineTo(0, this.r * 0.7);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// Global mapping of type strings to Class definitions
export const FIGHTER_CLASS_MAP = {
  'normal': NormalFighter,
  'aimbot': AimbotFighter,
  'melee': MeleeFighter,
  'grenadier': GrenadierFighter,
  'laser': LaserFighter,
  'knight': KnightFighter,
  'black': BlackFighter,
  'darkslategray': DarkSlateGrayFighter,
  'orange': OrangeFighter,
  'berserker': BerserkerFighter,
  'cronos': CronosFighter,
  'bomber': BomberFighter,
  'gunslinger': GunSlingerFighter,
  'doppleganger': DopplegangerFighter,
  'dummy': DummyFighter,
};

export { NormalFighter, AimbotFighter, MeleeFighter, GrenadierFighter, LaserFighter, KnightFighter, DarkSlateGrayFighter, OrangeFighter, BerserkerFighter, CronosFighter, BomberFighter, GunSlingerFighter, DopplegangerFighter, DummyFighter };
