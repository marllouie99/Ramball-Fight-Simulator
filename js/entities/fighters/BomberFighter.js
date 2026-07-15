import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText } from '../../core/state.js';
import { drawBomberGrenade } from '../../graphics/weapons/bomberWeaponGraphics.js';

/**
 * Bomber Fighter (Brown)
 * Throws grenades that explode on impact with AOE damage.
 * Passive: Chance to throw sticky bombs that attach to enemies.
 * Skill: Plants C4 bombs that explode after a delay.
 * Unique: Leaves a powerful C4 bomb on death.
 */
export class BomberFighter extends Fighter {
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

    // Move slightly forward towards current movement vector (unless planting C4)
    if (this.plantingTimer === 0) {
      this.applyMovementPhysics();
    }

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
