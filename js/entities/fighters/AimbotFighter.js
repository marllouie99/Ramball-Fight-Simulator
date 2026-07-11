import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG, GUN_TIP_DIST } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, getProjectiles, clearProjectiles, spawnFloatingText } from '../../core/state.js';
import { playSound, playLoopingSound, fadeOutLoopingSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { flamewardenFlameSystem } from '../../graphics/weapons/flamewardenWeaponGraphics.js';
import { drawBlueAimbotGun } from '../../graphics/weaponVisuals.js';

export class AimbotFighter extends Fighter {
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
      const sound = getBasicAttackSound(this._def.id, this._def.type);
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
    const sound = getBasicAttackSound(this._def.id, this._def.type);
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
