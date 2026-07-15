import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText } from '../../core/state.js';
import { playSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { drawRedSniperGun } from '../../graphics/weaponVisuals.js';

/**
 * Standard Normal Fighter
 * Retains all default behavior from the base Fighter class.
 */
export class NormalFighter extends Fighter {
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
        const reloadSound = getSkillEffectSound('crimsonsniper', 'reload');
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

          const sound = getBasicAttackSound(this._def?.id);
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
    // OPTIMIZATION: Quality-based LOD for magazine display
    const qualityLevel = state.qualityLevel || 1.0;
    const useLOD = false;

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

      // OPTIMIZED: Simplified battery drawing for LOD
      if (useLOD) {
        // Simple rectangle for low quality
        ctx.fillStyle = cellProgress > 0.5 ? '#ff1111' : '#220505';
        ctx.fillRect(cx - w, cy - h / 2, w * 2, h);
        ctx.restore();
        return;
      }

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
        ctx.globalCompositeOperation = 'lighter';

        const yOffset = emptyH;

        // Energy Core Glass / Glow
        ctx.fillStyle = '#ff1111';
        ctx.shadowBlur = 6 * cellProgress;
        ctx.shadowColor = '#ff0000';
        ctx.fillRect(cx - w + 1.5, cy - h / 2 + 4 + yOffset, w * 2 - 3, currentH);

        // Inner white hot filament (vertical line)
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fillRect(cx - 0.5, cy - h / 2 + 4.5 + yOffset, 1, Math.max(0, currentH - 0.5));

        // Horizontal energy ribs over the filament
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.8 * alpha;
        for (let rY = cy + h / 2 - 4 - 0.5; rY >= cy - h / 2 + 4 + yOffset + 0.5; rY -= 2) {
          ctx.fillRect(cx - 1.5, rY - 0.5, 3, 0.5);
        }
        ctx.globalAlpha = alpha;

        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
    };

    // OPTIMIZATION: Skip complex reload animation at low quality
    if (!useLOD && this.isReloading && progress < 0.25) {
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
          // OPTIMIZATION: Skip slide animation at low quality
          if (useLOD) {
            drawBattery(cx, startY, cellProgress, 1);
          } else {
            // As it starts filling, it drops down from above (slide in)
            const slideProgress = Math.min(1, cellProgress / 0.5); // animate entry fast
            const slideOffset = (1 - slideProgress) * -10; // drops from 10px above
            drawBattery(cx, startY + slideOffset, cellProgress, slideProgress);
          }
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
