import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { playSound } from '../../systems/soundSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { drawZeusWeapon } from '../../graphics/weapons/zeusWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state } from '../../core/state.js';

export class ZeusFighter extends Fighter {
  constructor(def) {
    super(def);
    this.aegisCooldown = 0;
    this.stormCooldown = 0;
    this.stormActive = false;
    this.stormTimer = 0;
    
    // Initial hovering state so clouds are positioned correctly in menus before update()
    this.z = 25;
    
    // Aura animation state
    this.auraPhase = 0;
  }

  reset() {
    super.reset();
    this.aegisCooldown = 0;
    this.stormCooldown = 0;
    this.stormActive = false;
    this.stormTimer = 0;
    this.auraPhase = 0;
  }

  getAttackProgress() {
    if (!this.shootCooldownMax) return 1;
    return 1 - (this.shootCooldown / this.shootCooldownMax);
  }
  
  getBodyPullback() {
    const progress = this.getAttackProgress();
    if (progress >= 0.5) {
      return -8 * Math.pow((progress - 0.5) / 0.5, 2);
    } else if (progress < 0.3) {
      // Very fast snap forward, followed by quick recovery
      const p = 1 - (progress / 0.3); 
      return 10 * Math.pow(p, 3);
    }
    return 0;
  }

  shoot(ownerIndex) {
    if (projectileSystem && projectileSystem.fireChainLightning) {
      const damage = CONFIG.zeus.lightningDamage;
      const chains = CONFIG.zeus.chainCount;
      projectileSystem.fireChainLightning(this, ownerIndex, damage, chains);
    }
    
    // Flash at the release point (bolt tip)
    const releaseDist = this.r + 20; 
    const rx = this.x + Math.cos(this.gunAngle) * releaseDist;
    const ry = this.y + Math.sin(this.gunAngle) * releaseDist;
    spawnImpactFlash(rx, ry, 35, 'lightningTrail'); 
    spawnSparks(rx, ry, 12, 'lightningTrail', '#FFFFFF');
    
    // Play attack sound
    const sound = getBasicAttackSound(this._def?.id, this._def?.type);
    this._attackSoundTimer = sound?.delay || 0;
    this._attackSoundConfig = sound;
  }

  takeDamage(amount, attacker, opts = {}) {
    const applied = super.takeDamage(amount, attacker, opts);

    // Aegis Shield Passive
    if (applied && attacker && this.hp > 0 && !this.isTurret) {
      if (this.aegisCooldown <= 0) {
        this._triggerAegisShield(attacker);
      }
    }

    return applied;
  }
  
  _isAttackerInRange(attacker, range) {
    if (!attacker) return false;
    const distSq = (this.x - attacker.x) ** 2 + (this.y - attacker.y) ** 2;
    return distSq <= (range + this.r + attacker.r) ** 2;
  }

  _triggerAegisShield(attacker) {
    this.aegisCooldown = CONFIG.zeus.aegisCooldown;
    
    // Deal shock damage
    const damage = CONFIG.zeus.aegisShockDamage;
    attacker.takeDamage(damage, this, { isZeusShock: true });
    
    // Apply paralyze (we'll implement this as a combination of slow and electric stun)
    if (attacker.applySlow) {
      attacker.applySlow(CONFIG.zeus.aegisParalyzeDuration, CONFIG.zeus.paralyzeSlowMultiplier);
    }
    attacker.electricStunTimer = Math.max(attacker.electricStunTimer || 0, 15);
    
    spawnFloatingText(this.x, this.y - this.r - 20, 'AEGIS!', '#00BFFF');
    
    // Visuals
    spawnImpactFlash(attacker.x, attacker.y, 40, 'lightningTrail');
    spawnSparks(attacker.x, attacker.y, 15, 'thunderSpark');
    triggerGlobalScreenShake(4, 5);
    
    const sound = getSkillSound(this._def?.id, 'aegis');
    if (sound) playSound(sound.src, sound.volume);
  }

  update(opponent, ownerIndex, arena) {
    // Visual hovering effect: float like Trickster
    this.z = 25 + Math.sin(Date.now() / 200) * 6;
    this.auraPhase += 0.15;

    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    if (this._handleTimeStop()) {
      return;
    }
    
    if (this.aegisCooldown > 0) this.aegisCooldown--;
    if (this.stormCooldown > 0) this.stormCooldown--;
    
    // Ultimate check
    if (this.stormCooldown <= 0 && !this.stormActive && opponent) {
      this._activateStorm();
    }
    
    if (this.stormActive) {
      this.stormTimer--;
      this._processStorm();
      if (this.stormTimer <= 0) {
        this.stormActive = false;
      }
    }

    // Basic attack
    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    } else {
      this.shoot(ownerIndex);
      this.shootCooldown = this.shootCooldownMax;
    }

    this.applyMovementPhysics();
    
    // Aim directly at opponent
    if (opponent && !opponent.isDead) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    } else {
      this.aim(opponent);
    }
    
    this.resolveWallBounce(arena);
  }
  
  _activateStorm() {
    this.stormActive = true;
    this.stormTimer = CONFIG.zeus.stormDuration;
    this.stormCooldown = CONFIG.zeus.stormCooldown;
    this.stormLastStrikeTimer = 0;
    
    spawnFloatingText(this.x, this.y - this.r - 20, 'STORM!', '#FFFFFF');
    triggerGlobalScreenShake(8, 20);
    
    const sound = getSkillSound(this._def?.id, 'storm');
    if (sound) playSound(sound.src, sound.volume);
  }
  
  _processStorm() {
    // Strike periodically based on strikes per second
    this.stormLastStrikeTimer++;
    const interval = Math.floor(60 / (CONFIG.zeus.stormStrikesPerSec || 3));
    
    if (this.stormLastStrikeTimer >= interval) {
      this.stormLastStrikeTimer = 0;
      
      // Hit all living enemies
      if (state && state.fighters) {
        state.fighters.forEach((f, idx) => {
          if (f && f !== this && f.hp > 0 && state.getFighterTeam(idx) !== state.getFighterTeam(state.fighters.indexOf(this))) {
            this._strikeEnemyWithStorm(f);
          }
        });
        
        // Also hit illusions
        if (state.illusions) {
          state.illusions.forEach(ill => {
            if (ill && ill.hp > 0 && ill.owner !== this) {
               this._strikeEnemyWithStorm(ill);
            }
          });
        }
      }
    }
  }
  
  _strikeEnemyWithStorm(target) {
    // Calculate damage based on static debuff
    let damage = CONFIG.zeus.stormStrikeDamage;
    if (target.staticDebuffTimer > 0) {
      damage *= CONFIG.zeus.staticDamageBonus;
    }
    
    target.takeDamage(damage, this, { isStorm: true });
    
    // Apply static and paralyze
    target.staticDebuffTimer = CONFIG.zeus.staticDuration;
    if (target.applySlow) {
      target.applySlow(CONFIG.zeus.paralyzeDuration, CONFIG.zeus.paralyzeSlowMultiplier);
    }
    
    // Apply visual thunder roots effect
    target.thunderRootsTimer = Math.max(target.thunderRootsTimer || 0, 45);
    
    // Visuals
    spawnImpactFlash(target.x, target.y, 50, 'lightningTrail');
    spawnSparks(target.x, target.y, 10, 'lightningTrail', '#FFFFFF');
    
    // Register storm strike visual globally
    if (!state.zeusStormStrikes) state.zeusStormStrikes = [];
    state.zeusStormStrikes.push({
      x: target.x,
      y: target.y,
      life: 15,
      maxLife: 15
    });
  }

  _drawClouds(ctx, isBehind) {
    const numClouds = 10;
    const zOffset = this.z || 0;
    
    for (let i = 0; i < numClouds; i++) {
      // Fixed base position to form a tighter cluster
      const angle = (i * Math.PI * 2) / numClouds;
      // Adjusted distance multiplier to form a nice base
      const dist = (i % 3 === 0 ? 0.2 : 0.8) * this.r;
      
      const baseOffsetX = Math.cos(angle) * dist;
      const baseOffsetY = Math.sin(angle) * dist * 0.4; // Squashed for 3D ground perspective
      
      const isCloudBehind = baseOffsetY < 0;
      if (isCloudBehind !== isBehind) continue;
      
      // Natural billowing and drifting movement
      const driftX = Math.sin(this.auraPhase * 0.4 + i * 2.1) * 5;
      const driftY = Math.cos(this.auraPhase * 0.3 + i * 1.7) * 3;
      
      const cx = this.x + baseOffsetX + driftX;
      // Position clouds at the bottom edge of Zeus's hovering body
      // (this.y - zOffset is his floating center, + this.r puts them at his feet)
      const cy = this.y - zOffset + this.r * 0.8 + baseOffsetY + driftY;
      
      // Cloud puffs billow in size
      const baseSize = i % 2 === 0 ? 18 : 13;
      const cloudSize = baseSize + Math.sin(this.auraPhase * 1.2 + i) * 4;
      
      // Determine if this cloud puff is flashing with internal lightning
      const flashValue = Math.sin(this.auraPhase * 2.5 + i * 13);
      const isFlashing = flashValue > 0.92; // Short intense flash
      
      ctx.beginPath();
      ctx.arc(cx, cy, cloudSize, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cloudSize);
      
      if (isFlashing) {
        // Bright internal lightning flash
        grad.addColorStop(0, 'rgba(200, 240, 255, 0.95)');
        grad.addColorStop(1, 'rgba(50, 100, 180, 0.3)');
      } else {
        // Dark moody thundercloud
        grad.addColorStop(0, 'rgba(40, 45, 60, 0.95)');
        grad.addColorStop(1, 'rgba(15, 20, 30, 0)');
      }
      
      ctx.fillStyle = grad;
      ctx.fill();
      
      // Draw erratic branching arcs & sparks (same as weapon) when flashing
      if (isFlashing) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const now = Date.now();
        const branchCount = 2; // Arcs per flashing cloud
        
        for (let b = 0; b < branchCount; b++) {
          // Use Date.now() / 80 for that aggressive flickering effect
          const seed = Math.floor(now / 80) * 137 + b * 53 + i * 17;
          const pseudoRand = (n) => {
            const x = Math.sin(seed + n * 9.1) * 43758.5453;
            return x - Math.floor(x);
          };

          const dirX = (pseudoRand(1) - 0.5) * 2;
          const dirY = (pseudoRand(2) - 0.5) * 2;

          ctx.beginPath();
          // Start from the center of the cloud
          ctx.moveTo(cx, cy);

          let bx = cx;
          let by = cy;
          const segments = 2 + Math.floor(pseudoRand(3) * 2);
          const branchLen = 8 + pseudoRand(4) * 12;

          for (let s = 0; s < segments; s++) {
            bx += dirX * (branchLen / segments) + (pseudoRand(5 + s) - 0.5) * 8;
            by += dirY * (branchLen / segments) + (pseudoRand(6 + s) - 0.5) * 8;
            ctx.lineTo(bx, by);
          }

          ctx.strokeStyle = `rgba(0, 220, 255, ${0.5 + pseudoRand(7) * 0.5})`;
          ctx.lineWidth = 1 + pseudoRand(8) * 1.5;
          ctx.stroke();
          
          // Tiny detached grounding sparks floating near the arc
          if (pseudoRand(9) > 0.4) {
            ctx.beginPath();
            ctx.arc(bx + (pseudoRand(10) - 0.5) * 10, by + (pseudoRand(11) - 0.5) * 10, 1 + pseudoRand(12) * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = pseudoRand(13) > 0.5 ? '#FFFFFF' : '#00FFFF';
            ctx.fill();
          }
        }
        ctx.restore();
      }
    }
  }

  draw(ctx) {
    if (this.isDead) return;

    // Draw clouds that orbit behind Zeus
    this._drawClouds(ctx, true);
    
    // Draw background 3D Aegis Shield arcs
    this._drawAegisShield(ctx, true);

    const pb = this.getBodyPullback();
    const dx = Math.cos(this.gunAngle) * pb;
    const dy = Math.sin(this.gunAngle) * pb;
    
    // Temporarily shift the logical position so Fighter.js draws everything (including the black stroke) properly shifted
    const origX = this.x;
    const origY = this.y;
    this.x += dx;
    this.y += dy;
    
    super.draw(ctx);
    
    this.x = origX;
    this.y = origY;
    
    // Draw clouds that orbit in front of Zeus
    this._drawClouds(ctx, false);
    
    // Draw foreground 3D Aegis Shield arcs
    this._drawAegisShield(ctx, false);
  }

  _drawAegisShield(ctx, drawBackground) {
    if (this.aegisCooldown > 0) return;
    
    ctx.save();
    
    const time = Date.now() / 150;
    const shieldRadius = this.r + 15;
    const numOrbits = 3;
    const segments = 10;
    
    // Draw several orbiting lightning bolts in pseudo-3D space
    for (let i = 0; i < numOrbits; i++) {
      let firstZ = 0;
      
      // Determine if the *center* of the bolt is in the foreground or background
      // by sampling its 3D Z position at current time t
      {
        const t = time;
        const f1 = 1.1 + i * 0.8;
        const f2 = 1.4 + i * 0.5;
        const f3 = 1.7 + i * 0.3;
        
        let x = Math.sin(t * f1) + Math.cos(t * f2 * 0.9);
        let y = Math.sin(t * f2) + Math.cos(t * f3 * 1.1);
        let z = Math.sin(t * f3) + Math.cos(t * f1 * 1.2);
        const len = Math.sqrt(x*x + y*y + z*z) || 1;
        firstZ = z / len;
      }
      
      const isBackgroundArc = firstZ < 0;
      if (drawBackground !== isBackgroundArc) continue; // Only draw the requested layer
      
      ctx.beginPath();
      
      for (let j = 0; j <= segments; j++) {
        // Travel back in time slightly to form a tail (comet-like path)
        const t = time - j * 0.05;
        
        const f1 = 1.1 + i * 0.8;
        const f2 = 1.4 + i * 0.5;
        const f3 = 1.7 + i * 0.3;
        
        let x = Math.sin(t * f1) + Math.cos(t * f2 * 0.9);
        let y = Math.sin(t * f2) + Math.cos(t * f3 * 1.1);
        let z = Math.sin(t * f3) + Math.cos(t * f1 * 1.2);
        
        const len = Math.sqrt(x*x + y*y + z*z) || 1;
        x /= len;
        y /= len;
        
        // Add violent crackling noise to the path (like the ground roots)
        const crackleX = Math.sin(t * 30 + i * 50) * 0.15;
        const crackleY = Math.cos(t * 35 + i * 50) * 0.15;
        x += crackleX;
        y += crackleY;
        
        // Project to 2D
        // Compress Y slightly to give a pseudo-3D isometric perspective look
        const px = this.x + x * shieldRadius;
        const py = this.y + y * shieldRadius * 0.75;
        
        if (j === 0) {
           ctx.moveTo(px, py);
        } else {
           ctx.lineTo(px, py);
        }
      }
      
      ctx.lineJoin = 'miter';
      ctx.miterLimit = 2;
      
      // Make background layer arcs dimmer and thinner to force the 3D perspective
      const alphaMulti = drawBackground ? 0.3 : 1.0;
      
      // Outer cyan glow
      ctx.lineWidth = (3 + Math.random() * 2) * alphaMulti;
      ctx.strokeStyle = `rgba(0, 220, 255, ${0.7 * alphaMulti})`;
      ctx.stroke();
      
      // Inner bright core
      ctx.lineWidth = 1 + Math.random() * 1.5;
      ctx.strokeStyle = drawBackground ? `rgba(0, 255, 255, ${0.5 * alphaMulti})` : `rgba(255, 255, 255, 0.9)`;
      ctx.stroke();
    }
    
    ctx.restore();
  }

  drawOutline(ctx) {
    // Simple upward light glow onto Zeus (moves with body)
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * 1.3, 0, Math.PI * 2);
    const bodyGlow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 1.3);
    bodyGlow.addColorStop(0, 'rgba(0, 191, 255, 0.45)');
    bodyGlow.addColorStop(1, 'rgba(0, 191, 255, 0)');
    ctx.fillStyle = bodyGlow;
    ctx.globalCompositeOperation = 'screen';
    ctx.fill();
    ctx.restore();
    
    // Main fighter outline
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00BFFF';
    ctx.stroke();
  }

  drawGun(ctx) {
    // Because draw() already shifted this.x and this.y, we just draw at this.x, this.y
    drawZeusWeapon(ctx, this.x, this.y, this.gunAngle, this.r, this.auraPhase, this.getAttackProgress(), this.color);
  }
}
