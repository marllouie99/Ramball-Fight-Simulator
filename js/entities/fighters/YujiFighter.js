import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { drawYujiSkin } from '../../graphics/fighters/yujiSkin.js';
import { GojoRenderer } from '../../graphics/fighters/gojoRenderer.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { modUpdateMeleeCombat } from './yuji/yujiCombat.js';
import { modUpdateComboRush, modUpdateReverseCursedTechnique } from './yuji/yujiSkills.js';
import { spawnMeleeClashShockwave } from '../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

/**
 * Yuji Itadori — The Black Flash Brawler
 */
export class YujiFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'yuji';
    this.type = 'yuji';

    // Visual aura
    this.combatAuraOpacity = 0.0;

    // Core combat variables
    this.punchAnimTimer = 0;
    this.punchMaxTime = CONFIG.yuji?.punchSpeed || 16;
    this.isRightPunch = true;
    this.hideFrontHand = false;
    this.hideBackHand = false;

    // Black Flash buildup
    this.blackFlashCharge = 0;
    this.blackFlashThreshold = CONFIG.yuji?.blackFlashThreshold || 4;
    this.blackFlashTimer = 0;
    this.blackFlashHitsLeft = 0;
    this.afterImages = []; // Zone trails afterimages array

    // Divergent Fist delayed shockwaves queue
    this.delayedShockwaves = [];

    // Skill 1: Divergent Fist Combo Rush
    this.comboRushCooldown = 0;
    this.isComboDashing = false;
    this.comboTarget = null;
    this.comboHitsLeft = 0;
    this.comboIntervalTimer = 0;

    // Soul Swap state
    this.soulSwapActive = false;
    this.soulSwapTimer = 0;
    this.soulSwapTransitionTimer = 0;
    this.hasSoulSwapped = false;
    this.hasDismantleCharge = false;

    // Skill 2: Reverse Cursed Technique (RCT)
    this.rctCooldown = 0;
    this.isChannelingRCT = false;
    this.rctChannelTimer = 0;
  }

  reset() {
    super.reset();
    this.afterImages = [];
    this.soulSwapActive = false;
    this.soulSwapTimer = 0;
    this.soulSwapTransitionTimer = 0;
    this.hasSoulSwapped = false;
    this.hasDismantleCharge = false;
  }

  update(opponent, ownerIndex, arena) {
    if (this.isDead || this.isRespawning || this.hp <= 0) {
      this.afterImages = [];
      return;
    }

    // Update existing afterimages (placed before freeze guard so they fade even if frozen!)
    if (this.afterImages && this.afterImages.length > 0) {
      fastCleanArray(this.afterImages, (img) => {
        img.timer--;
        return img.timer > 0;
      });
    }

    const isFightingSukuna = state.fighters.some(f => f && !f.isDead && f !== this && (f.characterId === 'sukuna' || f.type === 'sukuna'));

    // Auto-trigger Ultimate: Soul Swap — Sukuna Takes Over (Once per match, HP critically low)
    if (this.hp / this.maxHp <= (CONFIG.yuji?.soulSwapHpThreshold || 0.10) && !this.hasSoulSwapped && !isFightingSukuna) {
      this.hasSoulSwapped = true;
      this.soulSwapActive = true;
      this.soulSwapTimer = CONFIG.yuji?.soulSwapDuration || 500;
      this.soulSwapTransitionTimer = 45; // 0.75s animation freeze!
      this.hasDismantleCharge = true;
      
      spawnFloatingText(this.x, this.y - this.r - 28, "SUKUNA TAKES OVER!", "#CC0000");
      if (CONFIG.yuji?.transformationSound) {
        audioSystem.playSFX(
          CONFIG.yuji.transformationSound,
          CONFIG.yuji.transformationVolume ?? 2.0,
          1.0, 0,
          CONFIG.yuji.transformationDelay ?? 0
        );
      }
    }

    // Decay hit-flash visual BEFORE freeze guard so it doesn't stay stuck at max
    // while frozen (prevents permanent white overlay during Toji ambush hits).
    // We only tick hitFlashTimer here because super.update() handles the full
    // _tickCooldowns()/handlePoison()/handleBurn() and we don't want to double-call those.
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;

    // TimeStop & Freeze Guards (Rule #1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush || this.isParalyzed) {
      this.interruptAttacks();
      return;
    }

    // Ultimate transformation transition freeze (lock velocity, shake screen, skip actions)
    if (this.soulSwapTransitionTimer > 0) {
      this.soulSwapTransitionTimer--;
      this.vx = 0;
      this.vy = 0;
      
      // Trigger a violent screen shake on first frame
      if (this.soulSwapTransitionTimer === 44) {
        if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(1.5, 20);
      }
      
      // Keep decaying other animations/timers
      if (this.punchAnimTimer > 0) this.punchAnimTimer--;
      return;
    }

    super.update(opponent, ownerIndex, arena);

    // Manage Soul Swap duration & stagger on expiration
    if (this.soulSwapActive && this.soulSwapTimer > 0) {
      this.soulSwapTimer--;
      if (this.soulSwapTimer <= 0) {
        this.soulSwapActive = false;
        this.applyHitStun(60); // 60 frames (1s) stagger
        spawnFloatingText(this.x, this.y - this.r - 28, "STAGGERED!", "#CC0000");
        audioSystem.playSFX('Assets/Sound Effects/Skills/redcharging.mp3', 0.8);
      }
    }

    // Smoothly transition Yuji's Cursed Energy aura opacity
    const wantsAura = (this.punchAnimTimer > 0) || (this.blackFlashCharge > 0) || this.soulSwapActive || (this.comboHitsLeft > 0) || this.isComboDashing || this.isChannelingRCT || (this.blackFlashTimer > 0);
    if (wantsAura) {
      this.combatAuraOpacity = Math.min(1.0, this.combatAuraOpacity + 0.12);
    } else {
      this.combatAuraOpacity = Math.max(0.0, this.combatAuraOpacity - 0.05);
    }

    // Cooldown management (operating at 120% potential inside the Zone)
    const decay = (this.blackFlashTimer > 0) ? (CONFIG.blackFlash?.zone?.cooldownDecayMultiplier ?? 1.20) : 1.0;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.cooldownTimer > 0) this.cooldownTimer = Math.max(0, this.cooldownTimer - decay);
    if (this.comboRushCooldown > 0) this.comboRushCooldown = Math.max(0, this.comboRushCooldown - decay);
    if (this.rctCooldown > 0) this.rctCooldown = Math.max(0, this.rctCooldown - decay);

    // Process delayed shockwaves (Divergent Fist passive)
    if (this.delayedShockwaves) {
      for (let i = this.delayedShockwaves.length - 1; i >= 0; i--) {
        const sw = this.delayedShockwaves[i];
        sw.delay--;
        if (sw.delay <= 0) {
          // Trigger delayed shockwave impact if target is still valid
          const target = sw.target;
          if (target && !target.isDead && target.hp > 0) {
            applyDamageToTarget(target, sw.damage, this, { isDivergentFist: true });
            
            // Spawn hot-pink clash shockwave ring (Yuta style)
            const shockRadius = CONFIG.yuji?.shockwaveRadius || 40;
            spawnMeleeClashShockwave(target.x, target.y, shockRadius, 'yuta');

            // Play secondary impact sound
            audioSystem.playSFX('attack_fleshhit', 0.6);
          }
          this.delayedShockwaves.splice(i, 1);
        }
      }
    }

    // Extract targets list
    let targets = [];
    if (Array.isArray(opponent)) {
      targets = opponent;
    } else if (opponent) {
      targets = [opponent];
    }

    // Execute Skill 1 (Divergent Fist Combo Rush)
    modUpdateComboRush.call(this, targets[0]);

    // Execute Skill 2 (RCT)
    modUpdateReverseCursedTechnique.call(this);

    // Auto-trigger RCT when HP <= threshold
    const rctThreshold = CONFIG.yuji?.rctHpThreshold || 0.25;
    if (this.hp <= this.maxHp * rctThreshold && this.rctCooldown <= 0 && !this.isChannelingRCT) {
      this.triggerTertiarySkill();
    }

    if (this.isComboDashing || (this.comboHitsLeft || 0) > 0 || this.isChannelingRCT) {
      return; // Skip normal AI basic attacks/behavior during combo rush or RCT
    }

    // AI logic: drive basic attacks in melee range
    if (!this.playerControlled && targets.length > 0) {
      const target = targets[0];
      if (target) {
        this.aim(target);

        // Ranged Dismantle check if in Soul Swap
        if (this.soulSwapActive && this.hasDismantleCharge) {
          const dist = Math.hypot(target.x - this.x, target.y - this.y);
          if (dist <= 350 && (this.cooldownTimer || 0) <= 0) {
            this.shoot();
            return;
          }
        }

        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        const reach = CONFIG.yuji?.punchRange || 65;
        const maxPunchReach = this.r + target.r + reach;

        if (dist <= maxPunchReach && (this.cooldownTimer || 0) <= 0) {
          this.aim(target);
          modUpdateMeleeCombat.call(this, target);
        }
      }
    }



    if (this.blackFlashTimer > 0) {
      if (!this.afterImages) this.afterImages = [];
      pushTrailCap(this.afterImages, {
        x: this.x,
        y: this.y,
        r: this.r,
        angle: this.angle,
        color: this.color || '#D95C7E',
        timer: 16,
        maxTimer: 16
      }, 12);
    }
  }

  shoot() {
    // Player-controlled / manual basic punch attack
    if ((this.cooldownTimer || 0) > 0) return;

    // Ultimate ranged attack: single Dismantle slash if in Soul Swap state
    if (this.soulSwapActive && this.hasDismantleCharge) {
      this.hasDismantleCharge = false; // Consume charge
      
      const baseDamage = CONFIG.yuji?.punchDamage || 18;
      const dismantleDamage = baseDamage * 1.5 * (CONFIG.yuji?.soulSwapDamageMultiplier || 1.5);
      const dismantleSpeed = CONFIG.sukuna?.slashSpeed || 40;
      const ownerIndex = state.fighters.indexOf(this);
      
      import('../../systems/projectileSystem.js').then(module => {
        module.projectileSystem.fireProjectile(
          this,
          ownerIndex,
          dismantleDamage,
          false,
          dismantleSpeed,
          false,
          'ghostBlade'
        );
      });

      spawnFloatingText(this.x, this.y - this.r - 28, 'DISMANTLE!', '#E0E8FF');
      
      this.punchAnimTimer = 10;
      audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.9);
      audioSystem.playSFX('Assets/Sound Effects/Skills/backstab.mp3', 0.85);
      
      const isZone = (this.blackFlashTimer > 0);
      this.cooldownTimer = isZone
        ? (CONFIG.yuji?.blackFlashZonePunchCooldown || 14)
        : (CONFIG.yuji?.basicPunchCooldown || 25);
      return;
    }

    let bestTarget = null;
    let closestDist = Infinity;

    const allTargets = [];
    if (state && state.fighters) {
      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (!f || f === this || f.hp <= 0 || f.isIllusion) continue;
        if (state.getFighterTeam && state.getFighterTeam(state.fighters.indexOf(this)) === state.getFighterTeam(i)) continue;
        allTargets.push(f);
      }
    }
    if (state && state.illusions) {
      for (let ill of state.illusions) {
        if (!ill || ill === this || ill.hp <= 0) continue;
        if (ill.ownerIndex !== undefined && state.getFighterTeam && state.getFighterTeam(state.fighters.indexOf(this)) === state.getFighterTeam(ill.ownerIndex)) continue;
        allTargets.push(ill);
      }
    }

    const reach = CONFIG.yuji?.punchRange || 65;
    for (const target of allTargets) {
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      const maxPunchReach = this.r + target.r + reach;
      if (dist <= maxPunchReach && dist < closestDist) {
        closestDist = dist;
        bestTarget = target;
      }
    }

    if (bestTarget) {
      this.aim(bestTarget);
      modUpdateMeleeCombat.call(this, bestTarget);
    } else if (this.playerControlled) {
      // Punch the air
      modUpdateMeleeCombat.call(this, null);
    }
  }

  triggerSecondarySkill() {
    if ((this.comboRushCooldown || 0) <= 0 && !this.isComboDashing && (this.comboHitsLeft || 0) <= 0) {
      let bestTarget = null;
      let closestDist = Infinity;
      const allTargets = [];
      if (state && state.fighters) {
        for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          if (!f || f === this || f.hp <= 0 || f.isIllusion) continue;
          if (state.getFighterTeam && state.getFighterTeam(state.fighters.indexOf(this)) === state.getFighterTeam(i)) continue;
          allTargets.push(f);
        }
      }
      if (state && state.illusions) {
        for (let ill of state.illusions) {
          if (!ill || ill === this || ill.hp <= 0) continue;
          if (ill.ownerIndex !== undefined && state.getFighterTeam && state.getFighterTeam(state.fighters.indexOf(this)) === state.getFighterTeam(ill.ownerIndex)) continue;
          allTargets.push(ill);
        }
      }
      const range = CONFIG.yuji?.comboDashRange || 200;
      for (const target of allTargets) {
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        if (dist <= range && dist < closestDist) {
          closestDist = dist;
          bestTarget = target;
        }
      }
      if (bestTarget) {
        this.isComboDashing = true;
        this.comboTarget = bestTarget;
        this.comboRushCooldown = CONFIG.yuji?.comboCooldown || 400;
        audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 0.85);
      }
    }
  }

  triggerTertiarySkill() {
    // Skill 2: Reverse Cursed Technique (RCT)
    // Only usable once per round typically, requires HP < 100%, and can't be used while doing other attacks
    if (this.rctCooldown <= 0 && this.hp < this.maxHp && !this.isComboDashing && (this.comboHitsLeft || 0) <= 0) {
      // AI check: prefer using it when HP is low, but player can trigger anytime HP < 100%
      const rctChannelTime = CONFIG.yuji?.rctChannelDuration || 45;
      this.isChannelingRCT = true;
      this.rctChannelTimer = rctChannelTime;
      this.rctCooldown = CONFIG.yuji?.rctCooldown || 900;
      
      // Floating text indication
      spawnFloatingText(this.x, this.y - this.r - 30, 'RCT', '#00FF00');
    }
  }

  interruptAttacks() {
    this.punchAnimTimer = 0;
    this.delayedShockwaves = [];
    this.isComboDashing = false;
    this.comboTarget = null;
    this.comboHitsLeft = 0;
    
    // Interrupt RCT channeling
    if (this.isChannelingRCT) {
      this.isChannelingRCT = false;
      spawnFloatingText(this.x, this.y - this.r - 20, 'SKILL INTERRUPTED!', '#FF0000');
    }
    
    // Clear Black Flash zone on hard interrupt
    this.blackFlashTimer = 0;
    this.blackFlashHitsLeft = 0;
  }

  resolveWallBounce(arena, opponent) {
    let bounced = false;
    const restitution = CONFIG.collision.restitution || 0.8;

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
      if (typeof this.playWallBounceSound === 'function') this.playWallBounceSound();

      let target = opponent;
      if (!target || target.isDead || target.hp <= 0) {
        let nearest = null;
        let nearestDist = Infinity;
        const allEntities = [...(state.fighters || []), ...(state.illusions || [])];
        for (const f of allEntities) {
          if (!f || f === this || f.hp <= 0) continue;
          if (f.team === this.team) continue;
          const dist = Math.hypot(f.x - this.x, f.y - this.y);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = f;
          }
        }
        target = nearest;
      }

      const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed || 8;

      if (target) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        this.vx = (dx / dist) * currentSpeed * restitution;
        this.vy = (dy / dist) * currentSpeed * restitution;
        this.aim(target);
      } else {
        if (this.x - this.r <= arena.x || this.x + this.r >= arena.x + arena.width) {
          this.vx = -this.vx * restitution;
        }
        if (this.y - this.r <= arena.y || this.y + this.r >= arena.y + arena.height) {
          this.vy = -this.vy * restitution;
        }
      }
    }
  }

  draw(ctx) {
    if (this.hp <= 0) return;

    // Draw JJK Cursed Energy aura behind him: red during Soul Swap, green during RCT, blue otherwise
    const auraTheme = this.soulSwapActive ? 'red' : (this.isChannelingRCT ? 'rct' : 'blue');
    GojoRenderer._drawJJKCursedEnergyAura(ctx, this, auraTheme);

    drawYujiSkin(ctx, this);
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
