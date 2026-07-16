import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { playSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { drawBerserkerDualAxes } from '../../graphics/weaponVisuals.js';
import { spawnBerserkerRageEffect } from '../../graphics/particles/berserkerRageEffect.js';
import { spawnSparks } from '../../graphics/particles/sparkEffect.js';
import { state } from '../../core/state.js';

/**
 * Berserker Fighter (Blood Red)
 * Dual-wielding axes with rage mechanic.
 * Gains rage when taking damage. During rage: increased damage, attack speed, movement speed, and lifesteal.
 * Auto-locks toward enemy when bouncing off walls.
 */
export class BerserkerFighter extends Fighter {
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
    // Wind-up and shake for impactful swing
    this.axeWindupTimer = 0;
    this.axeWindupDuration = CONFIG.berserker.axeWindupDuration ?? 6;
    this.axeHitShakeX = 0;
    this.axeHitShakeY = 0;
    this.axeHitShakeTimer = 0;
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
    this.axeWindupTimer = 0;
    this.axeWindupDuration = CONFIG.berserker.axeWindupDuration ?? 6;
    this.axeHitShakeX = 0;
    this.axeHitShakeY = 0;
    this.axeHitShakeTimer = 0;
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

    // Hit! Start wind-up phase first (anticipation)
    let baseAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    // Add random angle for madman swings (wider spread during rage)
    const randomSpread = this.isInRage ? Math.PI : Math.PI / 2; // +/- 90 degrees in rage, +/- 45 normally
    this.axeSwingAngle = baseAngle + (Math.random() - 0.5) * randomSpread;
    this.gunAngle = this.axeSwingAngle;
    this.axeWindupTimer = this.axeWindupDuration; // Brief wind-up before swing
    this.axeSwingActive = false; // Swing starts after wind-up
    this.axeSwingDuration = CONFIG.berserker.axeSwingDurationFrames ?? 24;
    this.axeSwingTimer = this.axeSwingDuration;
    this.axeSlashFadeTimer = 0;
    this.axeCooldown = this.isInRage
      ? CONFIG.berserker.axeCooldown / CONFIG.berserker.rageAttackSpeedMultiplier
      : CONFIG.berserker.axeCooldown;

    // Deal damage and effects immediately on hit
    opponent.takeDamage(damage, this, { isMelee: true });
    spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, 'SLASH!', '#8b0000');

    // IMPACT EFFECTS: Screen shake + sparks
    const shakeIntensity = this.isInRage ? 8 : 5;
    this.axeHitShakeX = (Math.random() - 0.5) * shakeIntensity;
    this.axeHitShakeY = (Math.random() - 0.5) * shakeIntensity;
    this.axeHitShakeTimer = 8;
    
    // Global arena shake
    triggerGlobalScreenShake(this.isInRage ? 12 : 8, 8);

    // Spawn sparks at impact point
    const sparkCount = this.isInRage ? 15 : 10;
    spawnSparks(opponent.x, opponent.y, sparkCount, this.isInRage ? 'crimson' : 'flash');

    // Play attack sound    
    const sound = getBasicAttackSound(this._def?.id);
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

    // OPTIMIZATION: Quality-based motion trail recording
    const qualityLevel = state.qualityLevel || 1.0;
    const fps = state.fps || 60;
    const useAggressiveMode = false;

    // Handle axe cooldown
    if (this.axeCooldown > 0) {
      this.axeCooldown--;
    }

    // Handle axe wind-up (brief anticipation before swing)
    if (this.axeWindupTimer > 0) {
      this.axeWindupTimer--;
      if (this.axeWindupTimer <= 0) {
        // Wind-up done, start the actual swing
        this.axeSwingActive = true;
      }
    }

    // Handle hit shake decay
    if (this.axeHitShakeTimer > 0) {
      this.axeHitShakeTimer--;
      this.axeHitShakeX *= 0.7;
      this.axeHitShakeY *= 0.7;
      if (this.axeHitShakeTimer <= 0) {
        this.axeHitShakeX = 0;
        this.axeHitShakeY = 0;
      }
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

    this._updateAxeParticles(useAggressiveMode);

    // Try axe swing if in range
    if (opponent) {
      this._tryAxeSwing(opponent, ownerIndex);
    }

    if (this.isInRage && opponent) {
      // Actively steer towards the opponent instead of just bouncing
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        // Determine intended target speed for steering
        let targetSpeed = this.speed;
        if (this.slowTimer > 0) targetSpeed *= this.slowMultiplier;
        if (this.hitStunTimer > 0) targetSpeed *= this.hitStunMultiplier;

        // Smoothly steer velocity towards target
        const steerFactor = 0.08; 
        const desiredVx = (dx / dist) * targetSpeed;
        const desiredVy = (dy / dist) * targetSpeed;
        
        this.vx += (desiredVx - this.vx) * steerFactor;
        this.vy += (desiredVy - this.vy) * steerFactor;
        
        // Normalize speed so he doesn't slow down or speed up unintentionally while turning
        const currentSpeed = Math.hypot(this.vx, this.vy) || 1;
        this.vx = (this.vx / currentSpeed) * targetSpeed;
        this.vy = (this.vy / currentSpeed) * targetSpeed;
      }
    }

    // Unified physics movement handles slow/hit-stun/velocity-recovery/position/angle update
    this.applyMovementPhysics();

    // Aiming & Bouncing
    this.aim(opponent);
    
    // When steering during rage, use standard bounce (slides along walls)
    // Otherwise, use the Berserker's special bounce (rebounces toward opponent)
    if (this.isInRage) {
      super.resolveWallBounce(arena);
    } else {
      this.resolveWallBounce(arena, opponent);
    }
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
    // Apply hit shake offset for impact feedback
    const shakeX = this.axeHitShakeX || 0;
    const shakeY = this.axeHitShakeY || 0;
    drawBerserkerDualAxes(ctx, this.x + shakeX, this.y + shakeY, this.gunAngle, this.r, this.isInRage, this.axeSwingActive, this.axeSwingTimer, this.axeSwingAngle, this.axeSwingDuration, this.axeSlashFadeTimer, this.rageFadeTimer, this.axeHistory, this.axeWindupTimer, this.axeWindupDuration);
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
    this._drawAxeParticles(ctx);
    this.drawRageBar(ctx);
  }

  _updateAxeParticles(useAggressiveMode) {
    if (!this.rightAxeTrail) this.rightAxeTrail = [];
    if (!this.leftAxeTrail) this.leftAxeTrail = [];
    if (!this.axeSmokeParticles) this.axeSmokeParticles = [];

    // Fade and clean up sharp trails
    for (let p of this.rightAxeTrail) p.life--;
    this.rightAxeTrail = this.rightAxeTrail.filter(p => p.life > 0);
    for (let p of this.leftAxeTrail) p.life--;
    this.leftAxeTrail = this.leftAxeTrail.filter(p => p.life > 0);

    // Fade and clean up demonic smoke
    for (let p of this.axeSmokeParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.size += 0.5; // Slowly billows
      p.angle += p.spin; // slowly rotate the smudge
    }
    this.axeSmokeParticles = this.axeSmokeParticles.filter(p => p.life > 0);

    // Spawn new trails if swinging OR moving
    const speed = Math.hypot(this.vx, this.vy);
    const isMoving = speed > 0.5;
    const isSwinging = this.axeSwingActive;

    if ((isSwinging || isMoving) && !useAggressiveMode) {
      const duration = this.axeSwingDuration || 24;
      const t = 1 - (this.axeSwingTimer / duration);
      
      const getBladePos = (isLeft) => {
        if (isSwinging) {
            let progress = isLeft ? (t - 0.2) / 0.8 : t / 0.8;
            // If the axe is actively in its swing arc phase
            if (progress >= 0.25 && progress <= 0.75) {
                const sweep = (progress - 0.25) / 0.50; 
                const ease = sweep * sweep * (3 - 2 * sweep);
                let angleOffset = 1.2 - ease * 2.4; 
                if (isLeft) angleOffset = -angleOffset; 
                
                const angle = this.axeSwingAngle + angleOffset;
                const dist = this.r + 25 + Math.sin(sweep * Math.PI) * 20;
                
                return { 
                    x: this.x + Math.cos(angle) * dist, 
                    y: this.y + Math.sin(angle) * dist,
                    angle: angle // Return angle so we can spawn along the shaft
                };
            }
        }
        
        // Idle/Moving position (when not actively sweeping the blade)
        const sideDir = isLeft ? -Math.PI * 0.45 : Math.PI * 0.45;
        const holdDist = this.r + 12;
        const bladeFwd = 18;
        
        const hx = this.x + Math.cos(this.gunAngle + sideDir) * holdDist;
        const hy = this.y + Math.sin(this.gunAngle + sideDir) * holdDist;
        
        return {
           x: hx + Math.cos(this.gunAngle) * bladeFwd,
           y: hy + Math.sin(this.gunAngle) * bladeFwd,
           angle: this.gunAngle // Forward facing angle
        };
      };

      // Helper to push trail and spawn thick demonic smoke
      const spawnAt = (pos, trailArray, isLeft) => {
          if (!pos) return;
          
          // Only push to trail if it moved sufficiently (prevents the trail from knotting up when standing still)
          let shouldPush = true;
          if (trailArray.length > 0) {
              const last = trailArray[trailArray.length - 1];
              const distToLast = Math.hypot(pos.x - last.x, pos.y - last.y);
              if (distToLast < 1.0) shouldPush = false;
          }
          
          if (shouldPush) {
              trailArray.push({ x: pos.x, y: pos.y, life: 12, jitter: Math.random() * 8 });
          }
          
          if (shouldPush) {
              // Reduced smoke counts significantly to avoid making it too intense
              let smokeCount = 0;
              if (this.isInRage) {
                  smokeCount = isSwinging ? 3 : 1;
              } else {
                  smokeCount = isSwinging ? 2 : (Math.random() > 0.5 ? 1 : 0); 
              }
              
              for (let i = 0; i < smokeCount; i++) { 
                 const isRage = this.isInRage;
                 
                 // Distribute the smoke along the entire length of the axe (from tip backward 35 pixels to the handle)
                 const shaftOffset = Math.random() * 35; 
                 const px = pos.x - Math.cos(pos.angle) * shaftOffset;
                 const py = pos.y - Math.sin(pos.angle) * shaftOffset;
                 
                 this.axeSmokeParticles.push({
                    x: px + (Math.random() - 0.5) * (isRage ? 15 : 8), // Tighter spread
                    y: py + (Math.random() - 0.5) * (isRage ? 15 : 8),
                    vx: (Math.random() - 0.5) * (isRage ? 1.5 : 1.0),
                    vy: (Math.random() - 0.5) * (isRage ? 1.5 : 1.0) - (isRage ? 0.5 : 0.2),
                    life: 15 + Math.random() * 10, 
                    maxLife: 25,
                    size: isRage ? (6 + Math.random() * 6) : (4 + Math.random() * 4), // Smaller puffs
                    stretch: 0.4 + Math.random() * 0.4, 
                    angle: Math.random() * Math.PI * 2, 
                    spin: (Math.random() - 0.5) * 0.1, 
                    color: isRage 
                        ? (Math.random() > 0.6 ? '#000000' : (Math.random() > 0.4 ? '#4a0000' : '#880000'))
                        : (Math.random() > 0.5 ? '#000000' : '#1a1a1a') // Pitch black and dark charcoal
                 });
              }
          }
      };

      spawnAt(getBladePos(false), this.rightAxeTrail, false);
      spawnAt(getBladePos(true), this.leftAxeTrail, true);
    }
  }

  _drawAxeParticles(ctx) {
    // 1. Draw thick demonic smoke clouds (organic smudges)
    if (this.axeSmokeParticles) {
        for (const p of this.axeSmokeParticles) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            
            const progress = p.life / p.maxLife; // 1 to 0
            // Reduced alpha slightly so the black smoke isn't completely opaque and overbearing
            ctx.globalAlpha = progress * 0.7; 
            ctx.fillStyle = p.color;
            
            // Draw an elongated, random oval/smudge instead of a perfect circle
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * p.stretch, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // 2. Draw sharp, vibrating anime slashes (using filled polygons to prevent 'sausage' ends)
    ctx.save();
    
    const drawCrescentPolygon = (trail, r, g, b, baseThickness) => {
        if (!trail || trail.length < 2) return;
        
        // The slash stays mostly solid
        const headLife = trail[trail.length - 1].life / 12;
        const globalAlpha = headLife > 0.2 ? 1.0 : (headLife / 0.2);
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${globalAlpha})`;
        ctx.beginPath();
        
        const outer = [];
        const inner = [];
        
        for (let i = 0; i < trail.length; i++) {
            const p = trail[i];
            const progress = p.life / 12; // 0 to 1
            
            // Thickness tapers to 0 at the tail, is thickest in the middle, and tapers sharply to 0 at the head
            let thickness = baseThickness * progress;
            if (i === trail.length - 1 || i === 0) {
                thickness = 0; // Razor sharp tips at both ends! (no sausage)
            }
            
            // Only add chaotic vibration/jitter if in rage mode!
            if (this.isInRage) {
                thickness += (p.jitter * progress * 0.4);
            }
            
            // Compute normal
            let prev = i > 0 ? trail[i - 1] : trail[0];
            let next = i < trail.length - 1 ? trail[i + 1] : trail[trail.length - 1];
            
            // Fallback for endpoints
            if (i === 0 && trail.length > 1) next = trail[1];
            if (i === trail.length - 1 && trail.length > 1) prev = trail[trail.length - 2];
            
            let dx = next.x - prev.x;
            let dy = next.y - prev.y;
            let len = Math.hypot(dx, dy) || 1;
            
            // Outward normal
            let nx = -dy / len;
            let ny = dx / len;
            
            outer.push({ x: p.x + nx * thickness, y: p.y + ny * thickness });
            inner.push({ x: p.x - nx * thickness, y: p.y - ny * thickness });
        }
        
        // Connect outer curve
        ctx.moveTo(outer[0].x, outer[0].y);
        for (let i = 1; i < outer.length; i++) {
            ctx.lineTo(outer[i].x, outer[i].y);
        }
        // Connect inner curve (in reverse)
        for (let i = inner.length - 1; i >= 0; i--) {
            ctx.lineTo(inner[i].x, inner[i].y);
        }
        
        ctx.closePath();
        ctx.fill();
    };

    if (this.isInRage) {
        // Draw the massive 3 layers for the anime style: Black Aura, Crimson Aura, White Core
        drawCrescentPolygon(this.rightAxeTrail, 0, 0, 0, 16);
        drawCrescentPolygon(this.rightAxeTrail, 220, 0, 0, 8);
        drawCrescentPolygon(this.rightAxeTrail, 255, 255, 255, 2);

        drawCrescentPolygon(this.leftAxeTrail, 0, 0, 0, 16);
        drawCrescentPolygon(this.leftAxeTrail, 220, 0, 0, 8);
        drawCrescentPolygon(this.leftAxeTrail, 255, 255, 255, 2);
    } else {
        // Draw a dark "black neon" trail for normal non-rage swings
        drawCrescentPolygon(this.rightAxeTrail, 0, 0, 0, 4); // Pitch black outer aura
        drawCrescentPolygon(this.rightAxeTrail, 51, 51, 51, 2); // #333333 inner core (matches axe)

        drawCrescentPolygon(this.leftAxeTrail, 0, 0, 0, 4);
        drawCrescentPolygon(this.leftAxeTrail, 51, 51, 51, 2);
    }
    
    ctx.restore();
  }
}
