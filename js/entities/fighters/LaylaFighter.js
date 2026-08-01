import { Fighter } from '../fighter.js';
import { CONFIG, getHandSize } from '../../core/config.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { drawLaylaGoggles, drawLaylaPigtails, drawLaylaBody } from '../../graphics/fighters/laylaSkin.js';
import { drawLaylaGun } from '../../graphics/weapons/laylaWeaponGraphics.js';

/**
 * Layla - Cosmic Marksman
 * A scaling ranged fighter who grows stronger with each successful hit.
 */
export class LaylaFighter extends Fighter {
  constructor(def) {
    super(def);
    
    // Ascending Power passive
    this.powerStacks = 0;
    this.maxStacks = CONFIG.layla.maxStacks || 10;
    this.stackTimer = 0;
    this.stackResetTime = CONFIG.layla.stackResetTime || 300; // 5 seconds at 60fps
    
    // Skill cooldowns
    this.maleficBombCooldown = 0;
    this.voidDashCooldown = 0;
    this.destructionBarrageCooldown = 0;
    
    // Ultimate state
    this.isInUltimate = false;
    this.ultimateTimer = 0;
    
    // Void dash trail
    this.dashTrail = [];
    this.isDashing = false;
    this.dashTimer = 0;
  }

  reset() {
    super.reset();
    this.powerStacks = 0;
    this.stackTimer = 0;
    this.maleficBombCooldown = 0;
    this.voidDashCooldown = 0;
    this.destructionBarrageCooldown = 0;
    this.isInUltimate = false;
    this.ultimateTimer = 0;
    this.dashTrail = [];
    this.isDashing = false;
    this.dashTimer = 0;
  }

  normalizeAngle(angle) {
    while (angle <= -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  }

  _fireWeapon(ownerIndex, isUltimateShot = false) {
    let finalSpeed = CONFIG.projectile.speed * (this._def.projectileSpeedMultiplier || 1);
    let finalDamage = this.damage;
    
    // Apply Malefic Buff range/velocity extension
    if (this.maleficBuffTimer && this.maleficBuffTimer > 0) {
      finalSpeed *= 1.35; // Extends range by increasing velocity significantly!
    }
    
    // Apply passive damage bonus
    if (this.powerStacks > 0) {
      finalDamage += this.powerStacks * (CONFIG.layla.damagePerStack || 1.5);
    }
    
    // Apply ultimate damage multiplier
    if (isUltimateShot) {
      finalDamage *= (CONFIG.layla.ultimateDamageMultiplier || 1.5);
    }
    
    const scale = 0.92;
    const baseX = this.r + 4;
    const barrelLength = this.r * 2.65 * scale;
    const customTipDist = baseX + barrelLength;
    const customSpawnX = this.x + Math.cos(this.angle) * customTipDist;
    const customSpawnY = this.y + Math.sin(this.angle) * customTipDist;
    
    const visualType = isUltimateShot ? 'layla_ultimate_bullet' : 'layla_basic_bullet';
    
    projectileSystem.fireProjectile(this, ownerIndex, finalDamage, false, finalSpeed, false, visualType, customSpawnX, customSpawnY);
    
    // Set cooldown based on whether in ultimate
    const baseCooldown = CONFIG.layla.attackCooldown || 70;
    this.shootCooldown = this.isInUltimate ? Math.floor(baseCooldown / 3) : baseCooldown;
    
    // Physics recoil
    const recoilForce = 6;
    this.vx -= Math.cos(this.angle) * recoilForce;
    this.vy -= Math.sin(this.angle) * recoilForce;
    this.gunRecoil = 1.0;
    
    const sound = getBasicAttackSound(this._def?.id);
    this._attackSoundTimer = sound.delay;
    this._attackSoundConfig = sound;
  }

  _fireMaleficBomb(ownerIndex) {
    const bombSpeed = CONFIG.layla.bombSpeed || 5;
    const bombDamage = CONFIG.layla.bombDamage || 20;
    const bombRange = CONFIG.layla.bombRange || 250;
    
    // Spawn directly from the needle syringe tip of the Malefic Cannon
    const scale = 0.92;
    const baseX = this.r + 4;
    const barrelLength = this.r * 2.65 * scale;
    const customTipDist = baseX + barrelLength;
    const customSpawnX = this.x + Math.cos(this.angle) * customTipDist;
    const customSpawnY = this.y + Math.sin(this.angle) * customTipDist;
    
    const bomb = projectileSystem.fireProjectile(this, ownerIndex, bombDamage, false, bombSpeed, false, 'layla_bomb', customSpawnX, customSpawnY);
    
    if (bomb) {
      bomb.r = 12;
      bomb.isSkillShot = true;
      bomb.skillShotId = 'layla_malefic_bomb';
      bomb.slowDuration = CONFIG.layla.bombSlowDuration || 90;
      bomb.slowMultiplier = CONFIG.layla.bombSlowMultiplier || 0.6;
      bomb.aoeRadius = 75; // Cosmic blast radius
      // Automatically detonate upon reaching 250px casting range
      bomb.life = Math.ceil(bombRange / bombSpeed);
      bomb.maxLife = bomb.life;
    }
    
    this.maleficBombCooldown = CONFIG.layla.maleficBombCooldown || 180;
    
    // Physical weapon recoil & dynamic feedback
    const recoilForce = 7.0; // Heavy instant momentum kickback!
    this.vx -= Math.cos(this.angle) * recoilForce;
    this.vy -= Math.sin(this.angle) * recoilForce;
    this.gunRecoil = 2.0; // Double normal visual recoil!
    
    // Set dedicated fire animation timers
    this.bombFireAnimTimer = 22;
    this.bombFireKickbackTimer = 14;
    
    spawnFloatingText(this.x, this.y - this.r - 15, 'MALEFIC BOMB!', '#00E5FF');
    
    const sound = getSkillSound(this._def?.id, 'malefic_bomb');
    if (sound) {
      audioSystem.playSFX(sound.src, sound.volume);
    } else {
      audioSystem.playSFX('Assets/Sound Effects/Attacks/laserpew.mp3', 0.35);
    }
  }

  triggerMaleficBombHitBuff() {
    this.maleficBuffTimer = 180; // 3 seconds of empowered range & +1 movement speed burst!
    this.speed = this.baseSpeed + 1.0;
    spawnFloatingText(this.x, this.y - this.r - 20, 'MALEFIC SURGE!', '#00E5FF');
  }

  _performVoidDash() {
    const dashDistance = CONFIG.layla.dashDistance || 80;
    
    // Store current position for trail
    this.dashTrail.push({ x: this.x, y: this.y, timer: CONFIG.layla.dashTrailDuration || 60 });
    
    // Dash in current facing direction
    this.x += Math.cos(this.angle) * dashDistance;
    this.y += Math.sin(this.angle) * dashDistance;
    
    this.isDashing = true;
    this.dashTimer = CONFIG.layla.dashDuration || 15;
    this.voidDashCooldown = CONFIG.layla.voidDashCooldown || 120;
    
    // Reset attack cooldown for instant follow-up
    this.shootCooldown = 0;
    
    spawnFloatingText(this.x, this.y - this.r - 15, 'VOID DASH!', '#00E5FF');
    
    const sound = getSkillSound(this._def?.id, 'void_dash');
    if (sound) {
      audioSystem.playSFX(sound.src, sound.volume);
    }
  }

  _activateDestructionBarrage() {
    this.isInUltimate = true;
    this.ultimateTimer = CONFIG.layla.ultimateDuration || 120;
    this.destructionBarrageCooldown = CONFIG.layla.ultimateCooldown || 600;
    
    spawnFloatingText(this.x, this.y - this.r - 25, 'DESTRUCTION BARRAGE!', '#FF00FF');
    
    const sound = getSkillSound(this._def?.id, 'ultimate');
    if (sound) {
      audioSystem.playSFX(sound.src, sound.volume);
    }
  }

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    // Time stop
    if (this._handleTimeStop()) {
      return;
    }

    // Update stack timer
    if (this.powerStacks > 0) {
      this.stackTimer++;
      if (this.stackTimer >= this.stackResetTime) {
        this.powerStacks = 0;
        this.stackTimer = 0;
        spawnFloatingText(this.x, this.y - this.r - 15, 'STACKS RESET', '#ff6666');
      }
    }

    // Update ultimate state
    if (this.isInUltimate) {
      this.ultimateTimer--;
      if (this.ultimateTimer <= 0) {
        this.isInUltimate = false;
        spawnFloatingText(this.x, this.y - this.r - 15, 'ULTIMATE ENDED', '#FF00FF');
      }
    }

    // Update dash state
    if (this.isDashing) {
      this.dashTimer--;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    }

    // Update dash trail
    this.dashTrail = this.dashTrail.filter(trail => {
      trail.timer--;
      return trail.timer > 0;
    });

    // Update fire animation timers
    if (this.bombFireAnimTimer > 0) this.bombFireAnimTimer--;
    if (this.bombFireKickbackTimer > 0) this.bombFireKickbackTimer--;

    // Update cooldowns
    if (this.maleficBombCooldown > 0) this.maleficBombCooldown--;
    if (this.voidDashCooldown > 0) this.voidDashCooldown--;
    if (this.destructionBarrageCooldown > 0) this.destructionBarrageCooldown--;

    // Handle Malefic Bomb On-Hit Buff speed boost and timers
    let speedBonus = 0;
    if (this.maleficBuffTimer > 0) {
      this.maleficBuffTimer--;
      speedBonus = 1.0; // gain 1 movement speed!
      if (this.maleficBuffTimer === 0) {
        this.speed = this.baseSpeed;
      }
    }

    // AI decision making for skills & kiting
    if (opponent) {
      const distToOpponent = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      
      // Smart Spacing: If we have Malefic buff (extended range) or enemy is close, kite!
      if (distToOpponent < 140 || (this.maleficBuffTimer > 0 && distToOpponent < 180)) {
        // Nudge velocity away from opponent
        const awayAngle = Math.atan2(this.y - opponent.y, this.x - opponent.x);
        this.vx += Math.cos(awayAngle) * 0.2;
        this.vy += Math.sin(awayAngle) * 0.2;
      }

      // Use Malefic Bomb when at appropriate range
      if (this.maleficBombCooldown === 0 && distToOpponent <= (CONFIG.layla.bombRange || 250)) {
        this._fireMaleficBomb(ownerIndex);
      }
      
      // Use Void Dash when enemy is close or for repositioning
      if (this.voidDashCooldown === 0 && distToOpponent < 100) {
        this._performVoidDash();
      }
      
      // Use Ultimate when available and have some stacks
      if (this.destructionBarrageCooldown === 0 && this.powerStacks >= 5) {
        this._activateDestructionBarrage();
      }

      // Basic attack aiming and firing
      const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      const delta = this.normalizeAngle(targetAngle - this.angle);
      const aligned = Math.abs(delta) < (CONFIG.layla.aimThreshold || 0.12);

      if (aligned && this.shootCooldown === 0) {
        this._fireWeapon(ownerIndex, this.isInUltimate);
      }
    }

    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    }

    // Decay visual recoil
    if (this.gunRecoil > 0) {
      this.gunRecoil = Math.max(0, this.gunRecoil - 0.08);
    }

    // Velocity recovery to match current target speed (including +1 speed burst!)
    const targetSpeed = this.baseSpeed + speedBonus;
    this.speed = targetSpeed;
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
      const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.08;
      this.vx = (this.vx / currentSpeed) * newSpeed;
      this.vy = (this.vy / currentSpeed) * newSpeed;
    }

    // Movement
    this.x += this.vx;
    this.y += this.vy;

    // Smooth target tracking (like Sharpshooter)
    if (opponent) {
      const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
      const diff = this.normalizeAngle(targetAngle - this.angle);
      this.angle += diff * 0.25;
    } else {
      this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);
    }

    this.aim(opponent);
    this.resolveWallBounce(arena, opponent);
  }

  onDamageDealt(target, projectile, ownerIndex) {
    // Add power stack on hit
    if (this.powerStacks < this.maxStacks) {
      this.powerStacks++;
      this.stackTimer = 0; // Reset timer on successful hit
      
      if (this.powerStacks === this.maxStacks) {
        spawnFloatingText(this.x, this.y - this.r - 20, 'MAX POWER!', '#00E5FF');
      } else if (this.powerStacks % 3 === 0) {
        spawnFloatingText(this.x, this.y - this.r - 15, `${this.powerStacks} STACKS`, '#00E5FF');
      }
    }
    
    // Standard knockback
    const knockbackStrength = CONFIG.normal.knockbackStrength;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    target.knockbackVx = (target.knockbackVx || 0) + (dx / dist) * knockbackStrength;
    target.knockbackVy = (target.knockbackVy || 0) + (dy / dist) * knockbackStrength;
  }

  onDamageTaken(damage, source) {
    super.onDamageTaken(damage, source);
    
    // Reset stacks on damage taken
    if (this.powerStacks > 0) {
      this.powerStacks = 0;
      this.stackTimer = 0;
      spawnFloatingText(this.x, this.y - this.r - 15, 'STACKS RESET', '#ff6666');
    }
  }

  drawGun(ctx) {
    if (this._isWinnerReveal) {
      // UNIQUE CHAMPION POSE: Plant weapon in the ground like a sword on her left!
      // Translate to left side (-23px) and push down (+32px) so stock top is at shoulder level (~-15px)
      const gunX = this.x - 23;
      const gunY = this.y + 32;
      const gunAngle = Math.PI * 0.5; // Pointing straight down

      drawLaylaGun(ctx, gunX, gunY, gunAngle, this.r, {
        recoil: 0,
        isInUltimate: false,
        isPreview: true, // Use preview mode to prevent horizontal mirror flipping
        scale: 0.95 // Proportional scale for the pose
      });

      // Draw her hand resting on top of the stock buttplate
      const handX = gunX;
      const handY = gunY - 50 * 0.95; // Top end of stock buttplate

      const gloveLeather = '#5D4037';
      const gloveStrap = '#3E2723';
      const cuffGold = '#E5BA73';
      const handR = getHandSize(6.5, this);

      ctx.save();
      ctx.translate(handX, handY);

      // Gold wrist cuff
      ctx.fillStyle = cuffGold;
      ctx.fillRect(-handR * 0.9, -handR * 1.5, handR * 1.8, handR * 0.8);
      ctx.strokeStyle = '#15100B';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(-handR * 0.9, -handR * 1.5, handR * 1.8, handR * 0.8);

      // Glove leather wrist band
      ctx.fillStyle = gloveStrap;
      ctx.fillRect(-handR * 0.9, -handR * 0.7, handR * 1.8, handR * 0.7);
      ctx.strokeRect(-handR * 0.9, -handR * 0.7, handR * 1.8, handR * 0.7);

      // Leather Brown hand palm resting on the stock
      ctx.fillStyle = gloveLeather;
      ctx.beginPath();
      ctx.arc(0, handR * 0.3, handR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#15100B';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.restore();
    } else {
      // Regular in-game gun drawing with bracing wind-up physics!
      drawLaylaGun(ctx, this.x, this.y, this.gunAngle, this.r, {
        recoil: this.gunRecoil || 0,
        isInUltimate: this.isInUltimate || false,
        isPreview: false,
        shootCooldown: this.shootCooldown || 0,
        maleficBuffTimer: this.maleficBuffTimer || 0
      });
    }
    
    // Draw steampunk goggles on top of head
    drawLaylaGoggles(ctx, this);
  }

  drawBody(ctx) {
    ctx.save();
    let tremorX = 0;
    let tremorY = 0;
    const currentShake = (typeof state !== 'undefined' && state.screenShake) ? (state.screenShake.intensity || 0) : 0;
    const isAnyFighterChanneling = (typeof state !== 'undefined' && state.fighters) ? state.fighters.some(f => f && (f.isChannelingDomain || f.isChannelingDomainExpansion)) : false;
    
    if (currentShake > 0 || isAnyFighterChanneling) {
      const shakeAmt = isAnyFighterChanneling ? 4.0 : Math.min(6, currentShake * 0.6);
      tremorX = (Math.random() - 0.5) * shakeAmt;
      tremorY = (Math.random() - 0.5) * shakeAmt;
    }

    // Apply visual recoil body shift: jerk backward along her firing angle
    const recoilDist = (this.gunRecoil || 0) * 12; // Jerks back up to 12px
    const recoilX = -Math.cos(this.gunAngle || 0) * recoilDist;
    const recoilY = -Math.sin(this.gunAngle || 0) * recoilDist;

    // Apply Malefic Bomb firing lean forward & kickback momentum shift
    let bombLeanX = 0;
    let bombLeanY = 0;
    if (this.bombFireAnimTimer > 0) {
      if (this.bombFireAnimTimer > 15) {
        // Firm stance, leaning forward before shooting
        const leanDist = 6;
        bombLeanX = Math.cos(this.gunAngle || 0) * leanDist;
        bombLeanY = Math.sin(this.gunAngle || 0) * leanDist;
      } else {
        // Momentum shifts back instantly
        const kickbackDist = (this.bombFireAnimTimer / 15) * -16;
        bombLeanX = Math.cos(this.gunAngle || 0) * kickbackDist;
        bombLeanY = Math.sin(this.gunAngle || 0) * kickbackDist;
      }
    }

    ctx.translate(this.x + tremorX + recoilX + bombLeanX, this.y + tremorY + recoilY + bombLeanY);
    // Kept upright: removed ctx.rotate(this.angle) and scale(1, -1) vertical flipping

    // Clip to circle so our dress drawing remains perfectly within the fighter's body circle bounds
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.clip();

    drawLaylaBody(ctx, this);

    ctx.restore(); // restore clip

    this.drawStatusOverlays(ctx, this.r);

    ctx.restore(); // restore translate/shake
  }

  draw(ctx) {
    // Draw on-hit buff aura below body
    this.drawMaleficBuff(ctx);
    
    // Draw pigtails behind the body first
    drawLaylaPigtails(ctx, this);
    
    super.draw(ctx);
    
    // Draw power stack indicator
    this.drawStackIndicator(ctx);
    
    // Draw dash trail
    this.drawDashTrail(ctx);
  }

  drawStackIndicator(ctx) {
    if (this.powerStacks === 0) return;
    
    const stackCount = this.powerStacks;
    const maxStacks = this.maxStacks;
    const stackSize = 4;
    const spacing = 6;
    
    const totalWidth = (maxStacks - 1) * spacing;
    const startX = this.x - totalWidth / 2;
    const startY = this.y - this.r - 25;
    
    for (let i = 0; i < maxStacks; i++) {
      const isActive = i < stackCount;
      const x = startX + i * spacing;
      
      ctx.fillStyle = isActive ? '#00E5FF' : '#333333';
      
      ctx.beginPath();
      ctx.arc(x, startY, stackSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawDashTrail(ctx) {
    if (this.dashTrail.length === 0) return;
    
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#9b59b6';
    
    this.dashTrail.forEach(trail => {
      const alpha = trail.timer / (CONFIG.layla.dashTrailDuration || 60);
      ctx.globalAlpha = alpha * 0.3;
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, this.r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.restore();
  }

  drawMaleficBuff(ctx) {
    if (typeof state !== 'undefined' && state.pixiApp) return; // Handled by WebGL Hybrid Renderer
    if (!this.maleficBuffTimer || this.maleficBuffTimer <= 0) return;
    drawLaylaMaleficSurgeGrid(ctx, this.x, this.y, this.r, this.maleficBuffTimer);
  }
}

export function drawLaylaMaleficSurgeGrid(ctx, x, y, r, maleficBuffTimer) {
  ctx.save();
  ctx.translate(x, y);

  let alpha = 1.0;
  if (maleficBuffTimer > 165) alpha = (180 - maleficBuffTimer) / 15;
  else if (maleficBuffTimer < 30) alpha = maleficBuffTimer / 30;

  ctx.globalAlpha = alpha;
  
  const time = Date.now();
  ctx.strokeStyle = '#00E5FF';
  ctx.lineCap = 'round';
  
  // Batch all 3 rotating arc streaks into a single stroke call - Simulated Glow
  ctx.lineWidth = 6.0;
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const speedOffset = time * 0.008 + i * (Math.PI * 2 / 3);
    const streakRadius = r * 1.3 + Math.sin(time * 0.005 + i) * 3;
    ctx.arc(0, 0, streakRadius, speedOffset, speedOffset + Math.PI * 0.4);
  }
  ctx.stroke();

  // Core stroke
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#00E5FF';
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const speedOffset = time * 0.008 + i * (Math.PI * 2 / 3);
    const streakRadius = r * 1.3 + Math.sin(time * 0.005 + i) * 3;
    ctx.arc(0, 0, streakRadius, speedOffset, speedOffset + Math.PI * 0.4);
  }
  ctx.stroke();
  const pulseScale = 1.0 + Math.sin(time * 0.006) * 0.1;
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.6 * pulseScale, 0, Math.PI * 2);
  ctx.stroke();

  const gridRadius = r * 2.2;
  ctx.rotate(-time * 0.002);
  ctx.strokeStyle = 'rgba(58, 180, 242, 0.8)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  const sides = 6;
  for (let i = 0; i < sides; i++) {
    const angle = (i * Math.PI * 2) / sides;
    const px = Math.cos(angle) * gridRadius;
    const py = Math.sin(angle) * gridRadius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  // Batch all 6 vertex tick marks into a single stroke call
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#00E5FF';
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (i * Math.PI * 2) / sides;
    const px = Math.cos(angle) * gridRadius;
    const py = Math.sin(angle) * gridRadius;
    ctx.moveTo(px * 0.9, py * 0.9);
    ctx.lineTo(px * 1.05, py * 1.05);
  }
  ctx.stroke();

  ctx.restore();
}
