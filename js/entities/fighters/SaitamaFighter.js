import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';
import { drawSaitamaSkin } from '../../graphics/fighters/saitamaSkin.js';

/**
 * Saitama — The Caped Baldy
 */
export class SaitamaFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'saitama';
    this.type = 'saitama';
    this.suppressSketchyOutline = true; // Use clean solid dark navy stroke from drawing

    // Model visual customization
    this.color = CONFIG.saitama?.color || '#F5C400';
    const sizeMult = CONFIG.globalFighter?.sizeMultiplier ?? 1.0;
    const internalScale = CONFIG.internalScale ?? 1.0;
    const baseRadius = def.radius || CONFIG.saitama?.radius || 25;
    this.r = baseRadius * sizeMult * internalScale;
    this.hp = CONFIG.saitama?.hp || 420;
    this.maxHp = this.hp;
    this.moveSpeed = CONFIG.saitama?.moveSpeed || 6.0;

    // Martial Arts / Brawler variables
    this.isMeleeFighter = true;
    this.punchAnimTimer = 0;
    this.punchMaxTime = 22; // Smooth 22-frame punch animation cycle
    this.isRightPunch = true;
    this.hideFrontHand = false;
    this.hideBackHand = false;

    // Passive: Hero for Fun (Boredom Threshold)
    this.boredomTimer = 0;
    this.boredomStacks = 0;
    this.maxBoredomStacks = CONFIG.saitama?.boredomMaxStacks || 5;

    // Skill 1: Consecutive Normal Punches
    this.flurryCooldown = 0;
    this.isFlurrying = false;

    // Skill 2: Serious Side Hops
    this.sideHopsCooldown = 0;
    this.isSideHopping = false;

    // Ultimate: Serious Punch
    this.seriousPunchCooldown = 0;
    this.isChargingSeriousPunch = false;
    this.seriousPunchChargeTimer = 0;
    this.seriousPunchWindupMax = CONFIG.saitama?.seriousPunchWindupFrames || 90;
  }

  /**
   * Main entry point for drawing Saitama.
   * Bypasses the sketchy outline wrappers to draw crisp solid strokes.
   */
  draw(ctx) {
    if (this.hp <= 0) return;

    const zOffset = this.z || 0;
    const hasZ = zOffset > 0;

    // Draw shadow underneath Saitama if he has height (zOffset > 0)
    if (hasZ) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(1, 0.5); 
      ctx.beginPath();
      ctx.arc(0, 0, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${Math.max(0.1, 0.6 - (zOffset / 150))})`;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(this.x, this.y - zOffset);
      ctx.translate(-this.x, -this.y);
    }

    // Render body model and cape wings
    drawSaitamaSkin(ctx, this);

    if (hasZ) {
      ctx.restore();
    }

    // Render standard UI components (HP bar, freeze overlay)
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }

  /** Override base gun shoot to prevent firing bullets */
  shoot(ownerIndex) {
    // Bare fists brawler — no projectile shooting
  }

  /**
   * Passive: No Sell — Ignores basic hit-pause timeStops.
   * Only allows time-stop if flagged as a skill, ultimate, or major effect.
   */
  applyTimeStop(duration, opts = {}) {
    // If it's a basic attack hit-pause without skill/ultimate flags, Saitama ignores it!
    if (!opts.isSkill && !opts.isUltimate && !opts.isInfinity && !opts.isDomain) {
      return; // No sell!
    }
    super.applyTimeStop(duration, opts);
  }

  /**
   * Triggers alternating back-and-forth punch animation
   */
  triggerPunchAnimation() {
    this.isRightPunch = !this.isRightPunch;
    this.punchAnimTimer = this.punchMaxTime;
  }

  /**
   * Executes Saitama's Normal Punch basic attack.
   * Multi-target 90-degree frontal arc (Rule #8 & Rule #6 compliant).
   */
  executeNormalPunch(opponent) {
    this.triggerPunchAnimation();
    this.shootCooldown = CONFIG.saitama?.punchCooldown || 39;

    // Play loud, heavy dry punch audio
    audioSystem.playSFX('Assets/Sound Effects/Attacks/punch.mp3', 2.0);

    const reach = CONFIG.saitama?.punchReach || 70;
    const maxReach = this.r + reach;
    const halfArc = (CONFIG.saitama?.punchArcAngle || Math.PI * 0.5) / 2; // 45 degrees either side of aim

    // Query all valid targets (fighters & illusions) in the arena (Rule #6)
    const targetsToScan = [];
    if (typeof state !== 'undefined') {
      if (state.fighters) {
        for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          if (!f || f === this || f.hp <= 0 || f.isIllusion) continue;
          if (state.getFighterTeam && state.getFighterTeam(state.fighters.indexOf(this)) === state.getFighterTeam(i)) continue;
          targetsToScan.push(f);
        }
      }
      if (state.illusions) {
        for (const ill of state.illusions) {
          if (!ill || ill === this || ill.hp <= 0) continue;
          if (ill.ownerIndex !== undefined && state.getFighterTeam && state.getFighterTeam(state.fighters.indexOf(this)) === state.getFighterTeam(ill.ownerIndex)) continue;
          targetsToScan.push(ill);
        }
      }
    }

    let hitAny = false;
    const aimAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

    for (const target of targetsToScan) {
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      const effectiveReach = maxReach + target.r;

      if (dist <= effectiveReach) {
        const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
        let angleDiff = angleToTarget - aimAngle;

        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (Math.abs(angleDiff) <= halfArc) {
          hitAny = true;

          // Boredom passive damage bonus (+15% per stack)
          const boredomMult = 1 + (this.boredomStacks || 0) * (CONFIG.saitama?.boredomDamagePerStack || 0.15);
          const baseDmg = CONFIG.saitama?.punchDamage || 38;
          const finalDamage = Math.round(baseDmg * boredomMult);

          // Deal damage (Rule #6 compliant)
          applyDamageToTarget(target, finalDamage, this);

          // Physical knockback push
          const knockbackForce = 14;
          target.vx += Math.cos(angleToTarget) * knockbackForce;
          target.vy += Math.sin(angleToTarget) * knockbackForce;

          // Hit-pause applied EXCLUSIVELY to target (Rule #5)
          if (typeof target.applyTimeStop === 'function') {
            target.applyTimeStop(10);
          }

          // Clean white impact flash
          if (typeof spawnImpactFlash === 'function') {
            spawnImpactFlash(target.x, target.y, 'white');
          }

          // Concussive pressure shockwave push on surrounding entities (40px radius)
          const shockwaveR = CONFIG.saitama?.shockwaveRadius || 40;
          for (const other of targetsToScan) {
            if (other === target) continue;
            const otherDist = Math.hypot(other.x - target.x, other.y - target.y);
            if (otherDist <= shockwaveR + other.r && otherDist > 0) {
              const pushAngle = Math.atan2(other.y - target.y, other.x - target.x);
              other.vx += Math.cos(pushAngle) * 8;
              other.vy += Math.sin(pushAngle) * 8;
            }
          }
        }
      }
    }

    if (hitAny) {
      // Reset passive boredom stacks upon landing damage
      this.boredomStacks = 0;
      this.boredomTimer = 0;
    }
  }

  /**
   * Main Fighter update loop
   */
  update(opponent, ownerIndex, arena) {
    // Mandatory Rule #1: Freeze guard at the very top of update loop
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return; // MANDATORY: Stop update execution so fighter is frozen!
    }

    if (this.punchAnimTimer > 0) {
      this.punchAnimTimer--;
    }

    // Passive: Boredom Threshold counter (5 seconds without dealing damage = +1 stack)
    const interval = CONFIG.saitama?.boredomStackInterval || 300;
    const maxStacks = CONFIG.saitama?.boredomMaxStacks || 5;
    if (this.boredomStacks < maxStacks) {
      this.boredomTimer = (this.boredomTimer || 0) + 1;
      if (this.boredomTimer >= interval) {
        this.boredomStacks++;
        this.boredomTimer = 0;
      }
    }

    // Call base fighter update logic for movement physics, wall bounce, etc.
    super.update(opponent, ownerIndex, arena);

    // Basic attack melee punch trigger
    const canAct = !this.hitStunTimer || this.hitStunTimer <= 0;
    if (canAct && opponent && opponent.hp > 0) {
      const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      const reach = (CONFIG.saitama?.punchReach || 70) + this.r + opponent.r;

      if (dist <= reach && (this.shootCooldown <= 0 || !this.shootCooldown)) {
        this.executeNormalPunch(opponent);
      }
    }
  }
}
