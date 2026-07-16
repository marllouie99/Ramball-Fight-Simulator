import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { playSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { drawRubyScythe } from '../../graphics/weapons/rubyWeaponGraphics.js';
import { spawnSparks, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../../graphics/particles/bloodEffect.js';

/**
 * Ruby Fighter — Scythe wielder with lifesteal, hook-pull, and 360 spin.
 *
 * Active Pull phases:
 *   0 = SWING_OUT   — scythe arcs outward toward the target
 *   1 = HOOK_GRAB   — brief pause, blade rotates to hook around target
 *   2 = PULL_DRAG   — shaft retracts, blade drags the target back
 *   3 = DISENGAGE   — blade rotates away, recovery motion
 */
export class RubyFighter extends Fighter {
  constructor(def) {
    super(def);
    this.initStates();
  }

  reset() {
    super.reset();
    this.initStates();
  }

  initStates() {
    // Basic attack
    this.scytheCooldown = 0;
    this.scytheSwingActive = false;
    this.scytheSwingTimer = 0;
    this.scytheSwingAngle = 0;
    this.scytheSwingDuration = 20;

    // Active pull — multi-phase hook
    this.activePullCooldown = 0;
    this.activePullActive = false;
    this.activePullPhase = -1;       // current phase index (0-3)
    this.activePullPhaseTimer = 0;   // frames remaining in current phase
    this.activePullAngle = 0;        // angle toward the target at moment of cast
    this.pullTargets = [];           // array of references to hooked opponents

    // Phase durations (frames)
    this.pullPhaseWindUp = 14;
    this.pullPhaseSwingOut = 10;
    this.pullPhaseHookGrab = 3;
    this.pullPhasePullDrag = 15;
    this.pullPhaseDisengage = 7;
    this.activePullTotalDuration = this.pullPhaseWindUp + this.pullPhaseSwingOut + this.pullPhaseHookGrab
      + this.pullPhasePullDrag + this.pullPhaseDisengage; // 43

    // Passive spin
    this.passiveSpinCooldownTimer = 0;
    
    // Trail for dash
    this.dashTrail = [];
    this.passiveSpinActive = false;
    this.passiveSpinTimer = 0;
    this.passiveSpinDuration = 30;

    // Core mechanic dash
    this.dashTimer = 0;
    this.dashVector = { x: 0, y: 0 };
  }

  // ── helpers ──────────────────────────────────────────

  triggerDash() {
    const dashCfg = CONFIG.ruby || {};
    this.dashTimer = dashCfg.dashDuration || 12;
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > 0.1) {
      this.dashVector = { x: this.vx / currentSpeed, y: this.vy / currentSpeed };
    } else {
      this.dashVector = { x: Math.cos(this.angle), y: Math.sin(this.angle) };
    }

    const sound = getSkillSound(this._def?.id, 'dash');
    if (sound) playSound(sound.src, sound.volume);
  }

  heal(amount) {
    if (amount <= 0 || this.hp <= 0) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    spawnFloatingText(this.x, this.y - this.r - 10, `+${Math.round(amount)}`, '#00ff00');
  }

  /** Returns the total frames elapsed since the pull started. */
  get pullElapsed() {
    return this.activePullTotalDuration - this._pullRemainingFrames();
  }

  _pullRemainingFrames() {
    if (!this.activePullActive) return 0;
    let remaining = this.activePullPhaseTimer;
    // Add remaining phases after the current one
    const phases = [this.pullPhaseWindUp, this.pullPhaseSwingOut, this.pullPhaseHookGrab, this.pullPhasePullDrag, this.pullPhaseDisengage];
    for (let i = this.activePullPhase + 1; i < phases.length; i++) {
      remaining += phases[i];
    }
    return remaining;
  }

  // ── basic attack ────────────────────────────────────

  _tryScytheSwing(opponent, ownerIndex) {
    if (!opponent || this.scytheCooldown > 0) return;

    const cfg = CONFIG.ruby || {};
    const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    const range = this.r + opponent.r + (cfg.scytheRange || 45);
    if (dist > range) return;

    this.scytheSwingAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.gunAngle = this.scytheSwingAngle;
    this.scytheSwingActive = true;
    this.scytheSwingTimer = this.scytheSwingDuration;
    this.scytheCooldown = cfg.scytheCooldown || 40;

    const damage = cfg.scytheDamage || 12;
    const lifesteal = cfg.lifestealPercent || 0.25;

    const applied = applyDamageToTarget(opponent, damage, this, { isMelee: true });
    if (applied) {
      spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, 'SLASH!', '#E0115F');
      this.heal(damage * lifesteal);
      triggerGlobalScreenShake(5, 6);
    }

    const sound = getBasicAttackSound(this._def?.id);
    this._attackSoundTimer = sound.delay;
    this._attackSoundConfig = sound;
  }

  // ── active pull (hook) ──────────────────────────────

  _tryActivePull(opponent, ownerIndex) {
    if (!opponent || this.activePullCooldown > 0) return;

    const cfg = CONFIG.ruby || {};
    const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    const range = cfg.activePullRange || 200;
    if (dist > range) return;

    // Lock-in the angle and target
    this.activePullAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.gunAngle = this.activePullAngle;
    this.activePullActive = true;
    this.activePullPhase = 0; // WIND_UP
    this.activePullPhaseTimer = this.pullPhaseWindUp;
    // Do not lock targets yet. We will lock them when the hook actually extends and grabs (phase 2)
    this.pullTargets = [];
    // We store the primary opponent just in case we want to give them priority later,
    // but we will verify their distance again when the hook lands.
    this.primaryHookTarget = opponent;
    
    this.activePullCooldown = cfg.activePullCooldown || 240;

    // We do NOT trigger the core dash here because pulling requires her to brace herself.
    // Dashing forward while pulling feels contradictory.
    
    // Stop her movement while casting the hook
    this.vx = 0;
    this.vy = 0;

    const sound = getSkillSound(this._def?.id, 'pull');
    if (sound) playSound(sound.src, sound.volume);
  }

  /** Advance the multi-phase pull each frame. */
  _updateActivePull(opponent) {
    if (!this.activePullActive) return;

    this.activePullPhaseTimer--;

    // Phase-specific logic
    const targets = this.pullTargets || [];
    const cfg = CONFIG.ruby || {};

    if (this.activePullPhase === 2) {
      // HOOK_GRAB phase
      if (this.activePullPhaseTimer === this.pullPhaseHookGrab - 1) {
        
        // NOW we lock the targets that are currently in range and in the cone!
        this.pullTargets = [];
        const range = cfg.activePullRange || 200;
        const myIndex = state.fighters.indexOf(this);
        const myTeam = state.getFighterTeam(myIndex);

        for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          if (!f || f === this || f.hp <= 0 || f.invincibilityTimer > 0) continue;
          if (state.mode === '2v2' && myTeam !== null && myTeam === state.getFighterTeam(i)) continue;

          const fDist = Math.hypot(f.x - this.x, f.y - this.y);
          // Give a small 15px leeway because the weapon physically extends slightly past the max range
          if (fDist <= range + 15) {
            const fAngle = Math.atan2(f.y - this.y, f.x - this.x);
            let angleDiff = Math.abs(fAngle - this.activePullAngle);
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            angleDiff = Math.abs(angleDiff);
            
            // Catch enemies within a 90 degree cone (±45 degrees)
            if (angleDiff < Math.PI / 4) {
              this.pullTargets.push(f);
            }
          }
        }
        
        // Ensure the primary targeted opponent is caught IF they are still in range
        if (this.primaryHookTarget && !this.pullTargets.includes(this.primaryHookTarget)) {
          const pDist = Math.hypot(this.primaryHookTarget.x - this.x, this.primaryHookTarget.y - this.y);
          if (pDist <= range + 15) {
            this.pullTargets.push(this.primaryHookTarget);
          }
        }

        // Apply visual effects and slow to the successfully caught targets
        const targets = this.pullTargets || [];
        const slowFrames = cfg.activeSlowDuration || 90;
        for (const target of targets) {
          if (target && target.hp > 0) {
            target.applySlow(slowFrames, 0.4);
            spawnFloatingText(target.x, target.y - target.r - 5, 'HOOKED!', '#E0115F');
            
            // Massive visual effects for the hook connection
            spawnImpactFlash(target.x, target.y, 40);
            spawnSparks(target.x, target.y, 30, 'crimson');
            spawnBloodEffect(target, 40, this.activePullAngle);
          }
        }
      }
    }

    if (this.activePullPhase === 3) {
      // PULL_DRAG phase — continuously drag the target toward Ruby each frame
      for (const target of targets) {
        if (target && target.hp > 0) {
          const dx = this.x - target.x;
          const dy = this.y - target.y;
          const dist = Math.hypot(dx, dy) || 1;

          // Visual trail of sparks while being dragged
          if (this.activePullPhaseTimer % 2 === 0) {
            spawnSparks(target.x, target.y, 3, 'crimson');
            spawnBloodEffect(target, 5);
          }

          // Kill target's own velocity so they can't resist the pull
          target.vx *= 0.3;
          target.vy *= 0.3;

          // Smooth spring pull: lerp them towards the minimum distance
          const pullLerp = 0.15; // 15% of the remaining distance per frame
          const minDistance = this.r + target.r + 5; // leave a 5px buffer so models don't perfectly overlap
          if (dist > minDistance) {
            // Cap the maximum move distance per frame to 14 pixels to prevent "teleporting/warping"
            const moveDist = Math.min((dist - minDistance) * pullLerp, 14.0);
            target.x += (dx / dist) * moveDist;
            target.y += (dy / dist) * moveDist;
          }
        }
      }
    }

    // Advance to next phase when timer runs out
    if (this.activePullPhaseTimer <= 0) {
      this.activePullPhase++;
      switch (this.activePullPhase) {
        case 1: // → SWING_OUT
          this.activePullPhaseTimer = this.pullPhaseSwingOut;
          break;
        case 2: // → HOOK_GRAB
          this.activePullPhaseTimer = this.pullPhaseHookGrab;
          break;
        case 3: // → PULL_DRAG
          this.activePullPhaseTimer = this.pullPhasePullDrag;
          break;
        case 4: // → DISENGAGE
          this.activePullPhaseTimer = this.pullPhaseDisengage;
          this.pullTargets = []; // release the targets
          break;
        default: // finished
          this.activePullActive = false;
          this.activePullPhase = -1;
          this.pullTargets = [];
          break;
      }
    }
  }

  // ── passive spin ────────────────────────────────────

  _tryPassiveSpin(opponent, ownerIndex) {
    if (!opponent || this.passiveSpinCooldownTimer > 0) return;

    const cfg = CONFIG.ruby || {};
    const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    const range = this.r + opponent.r + (cfg.passiveSpinRadius || 80);
    if (dist > range) return;

    this.passiveSpinActive = true;
    this.passiveSpinTimer = this.passiveSpinDuration;
    this.passiveSpinCooldownTimer = cfg.passiveSpinCooldown || 300;

    this.triggerDash();

    const damage = cfg.passiveSpinDamage || 18;
    const lifesteal = cfg.passiveLifestealPercent || 0.50;

    let totalHeal = 0;
    const myIndex = state.fighters.indexOf(this);
    const myTeam = state.getFighterTeam(myIndex);

    for (let i = 0; i < state.fighters.length; i++) {
      const f = state.fighters[i];
      if (!f || f === this || f.hp <= 0 || f.invincibilityTimer > 0) continue;
      if (state.mode === '2v2' && myTeam !== null && myTeam === state.getFighterTeam(i)) continue;

      const fDist = Math.hypot(f.x - this.x, f.y - this.y);
      if (fDist <= range) {
        const applied = applyDamageToTarget(f, damage, this, { isMelee: true });
        if (applied) {
          totalHeal += damage * lifesteal;
          spawnFloatingText(f.x, f.y - f.r - 5, 'SPIN!', '#E0115F');
          triggerGlobalScreenShake(8, 8);
          
          // Pull target closer
          const dx = this.x - f.x;
          const dy = this.y - f.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minDistance = this.r + f.r;
          if (dist > minDistance) {
            // Pull them a fixed distance towards Ruby
            const pullAmount = cfg.passiveSpinPullAmount || 30;
            const moveDist = Math.min(pullAmount, dist - minDistance);
            f.x += (dx / dist) * moveDist;
            f.y += (dy / dist) * moveDist;
          }
          
          // Apply 1-second slow
          const slowFrames = cfg.passiveSpinSlowDuration || 60;
          f.applySlow(slowFrames, 0.4);
        }
      }
    }

    if (totalHeal > 0) this.heal(totalHeal);

    const sound = getSkillSound(this._def?.id, 'spin');
    if (sound) playSound(sound.src, sound.volume);
  }

  // ── main update ─────────────────────────────────────

  update(opponent, ownerIndex, arena) {
    this.handlePoison();
    this.handleBurn();
    this._tickCooldowns();
    this._tickAttackSound();

    if (this._handleTimeStop()) return;

    // Cooldowns
    if (this.scytheCooldown > 0) this.scytheCooldown--;
    if (this.activePullCooldown > 0) this.activePullCooldown--;
    if (this.passiveSpinCooldownTimer > 0) this.passiveSpinCooldownTimer--;

    // Animation timers
    if (this.scytheSwingActive) {
      this.scytheSwingTimer--;
      if (this.scytheSwingTimer <= 0) this.scytheSwingActive = false;
    }

    // Multi-phase pull update
    this._updateActivePull(opponent);

    if (this.passiveSpinActive) {
      this.passiveSpinTimer--;
      if (this.passiveSpinTimer <= 0) this.passiveSpinActive = false;
    }

    // Actions (priority order)
    if (opponent) {
      this._tryPassiveSpin(opponent, ownerIndex);
      if (!this.passiveSpinActive) this._tryActivePull(opponent, ownerIndex);
      if (!this.passiveSpinActive && !this.activePullActive) this._tryScytheSwing(opponent, ownerIndex);
    }

    // Movement & Dash
    let targetSpeed = this.speed;
    const cfg = CONFIG.ruby || {};

    // Age dash trail
    if (this.dashTrail) {
      for (let i = this.dashTrail.length - 1; i >= 0; i--) {
        this.dashTrail[i].alpha -= 0.02;
        if (this.dashTrail[i].alpha <= 0) {
          this.dashTrail.splice(i, 1);
        }
      }
    }

    if (this.dashTimer > 0) {
      this.dashTimer--;
      targetSpeed = this.baseSpeed * (cfg.dashSpeedMultiplier || 3.0);
      
      // Spawn trail when moving fast, not just when dashing
      if (this.dashTimer > 0) {
        if (this.dashTimer % 2 === 0) {
          if (!this.dashTrail) this.dashTrail = [];
          this.dashTrail.push({ x: this.x, y: this.y, alpha: 0.6 });
        }
      } else {
        const currentSpeed = Math.hypot(this.vx, this.vy);
        if (currentSpeed > 1) { // Any significant movement
          if (Math.random() > 0.5) { // Spawn less frequently than dash
            if (!this.dashTrail) this.dashTrail = [];
            this.dashTrail.push({ x: this.x, y: this.y, alpha: 0.25 });
          }
        }
      }

      this.vx = this.dashVector.x * targetSpeed;
      this.vy = this.dashVector.y * targetSpeed;
    } else {
      if (this.slowTimer > 0) {
        this.slowTimer--;
        targetSpeed *= this.slowMultiplier;
      }
      
      const currentSpeed = Math.hypot(this.vx, this.vy);
      
      // Also spawn trail when moving fast here
      if (currentSpeed > 1) {
        if (Math.random() > 0.5) {
          if (!this.dashTrail) this.dashTrail = [];
          this.dashTrail.push({ x: this.x, y: this.y, alpha: 0.25 });
        }
      }
      if (currentSpeed === 0 && !this.activePullActive) {
        // Kickstart her movement if she was stopped by the hook
        const angle = this.angle || (Math.random() * Math.PI * 2);
        this.vx = Math.cos(angle) * targetSpeed;
        this.vy = Math.sin(angle) * targetSpeed;
      } else if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
        const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.04;
        this.vx = (this.vx / currentSpeed) * newSpeed;
        this.vy = (this.vy / currentSpeed) * newSpeed;
      }
    }

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

    if (opponent) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }

    this.resolveWallBounce(arena);
  }

  // ── drawing ─────────────────────────────────────────

  drawBody(ctx) {
    // Draw after-images below the main body
    if (this.dashTrail && this.dashTrail.length > 0) {
      for (const trail of this.dashTrail) {
        ctx.save();
        ctx.translate(trail.x, trail.y);
        ctx.beginPath();
        ctx.arc(0, 0, this.r, 0, Math.PI * 2);
        ctx.globalAlpha = trail.alpha;
        ctx.fillStyle = '#E0115F'; // Crimson color
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.restore();
      }
    }
    
    super.drawBody(ctx);
  }

  drawOutline(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#E0115F';
    ctx.stroke();

    if (this.activePullCooldown <= 0) {
      const cfg = CONFIG.ruby || {};
      ctx.beginPath();
      ctx.arc(this.x, this.y, cfg.activePullRange || 200, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(224, 17, 95, 0.15)';
      ctx.stroke();
    }
  }

  drawGun(ctx) {
    // Draw hook tether + target ring BEFORE the scythe so it layers behind
    this._drawHookEffects(ctx);
    drawRubyScythe(ctx, this);
  }

  /** Draws a visible crimson tether and glowing ring around the hooked target. */
  _drawHookEffects(ctx) {
    if (!this.activePullActive) return;
    const phase = this.activePullPhase;
    const targets = this.pullTargets || [];

    // Phases 2 (HOOK_GRAB) and 3 (PULL_DRAG) show the tether + ring
    if (phase === 2 || phase === 3) {
      for (const target of targets) {
        if (target && target.hp > 0) {
          ctx.save();

          // ── Dark-Pink Chain Tether ──
          const dx = target.x - this.x;
          const dy = target.y - this.y;
          const dist = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);

          ctx.save();
          ctx.translate(this.x, this.y);
          ctx.rotate(angle);

          // Glowing background line behind the chain
          ctx.strokeStyle = 'rgba(139, 0, 84, 0.5)'; // Dark pink glow
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(dist, 0);
          ctx.stroke();

          // Interlocking chain links
          const linkSpacing = 14;
          const numLinks = Math.floor(dist / linkSpacing);

          for (let i = 0; i <= numLinks; i++) {
            const linkX = i * linkSpacing;
            ctx.save();
            ctx.translate(linkX, 0);
            
            if (i % 2 === 0) {
              // Flat horizontal link
              ctx.strokeStyle = '#4A0024'; // Very dark pink outline
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
              ctx.stroke();

              ctx.strokeStyle = '#D81B60'; // Bright dark-pink inner
              ctx.lineWidth = 1;
              ctx.stroke();
            } else {
              // Vertical interlocking link (drawn thin to simulate 3D rotation)
              ctx.strokeStyle = '#3E001E'; 
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.ellipse(0, 0, 3, 6, 0, 0, Math.PI * 2);
              ctx.stroke();

              ctx.strokeStyle = '#C2185B'; 
              ctx.lineWidth = 1;
              ctx.stroke();
            }
            
            ctx.restore();
          }
          ctx.restore();

          // ── Pulsing ring around the hooked target ──
          const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.02); // fast pulse
          const ringRadius = target.r + 8 + pulse * 6;

          // Outer glow ring
          ctx.strokeStyle = `rgba(224, 17, 95, ${0.3 * pulse})`;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(target.x, target.y, ringRadius + 4, 0, Math.PI * 2);
          ctx.stroke();

          // Main ring
          ctx.strokeStyle = '#E0115F';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(target.x, target.y, ringRadius, 0, Math.PI * 2);
          ctx.stroke();

          // "HOOKED" indicator glow behind the target
          const glowRadius = target.r * 1.8;
          const gradient = ctx.createRadialGradient(
            target.x, target.y, 0,
            target.x, target.y, glowRadius
          );
          gradient.addColorStop(0, `rgba(224, 17, 95, ${0.35 * pulse})`);
          gradient.addColorStop(1, 'rgba(224, 17, 95, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(target.x, target.y, glowRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      }
    }

    // Phase 1 (SWING_OUT) — chain shooting outward
    if (phase === 1) {
      ctx.save();
      const t = 1 - (this.activePullPhaseTimer / this.pullPhaseSwingOut);
      const easeOut = 1 - Math.pow(1 - t, 3);
      
      const maxStretch = (CONFIG.ruby.activePullRange || 200) - this.r;
      const currentDist = maxStretch * easeOut;
      
      ctx.translate(this.x, this.y);
      ctx.rotate(this.activePullAngle);

      // Glowing background line behind the chain
      ctx.strokeStyle = `rgba(139, 0, 84, ${0.5 * t})`; // Fade in
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(currentDist, 0);
      ctx.stroke();

      // Interlocking chain links extending out
      const linkSpacing = 14;
      const numLinks = Math.floor(currentDist / linkSpacing);

      for (let i = 0; i <= numLinks; i++) {
        const linkX = i * linkSpacing;
        ctx.save();
        ctx.translate(linkX, 0);
        
        if (i % 2 === 0) {
          ctx.strokeStyle = '#4A0024';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = '#D81B60';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#3E001E'; 
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(0, 0, 3, 6, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = '#C2185B'; 
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    }
  }
}
