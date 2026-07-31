import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { drawTodoSkin } from '../../graphics/fighters/todoSkin.js';
import { GojoRenderer } from '../../graphics/fighters/gojoRenderer.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { modUpdateMeleeCombat } from './todo/todoCombat.js';
import { modUpdateBoogieWoogie, modThrowCursedRock, modUpdateCursedRocks, modRepositionDisengage, modExecutePendingSwap } from './todo/todoSkills.js';
import { state } from '../../core/state.js';

/**
 * Aoi Todo - The Boogie Woogie Brawler
 */
export class TodoFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'todo';
    this.type = 'todo';
    this.combatAuraOpacity = 0.0; // Starts at 0, builds up dynamically during claps/attacks
    
    // Core Combat Variables
    this.punchAnimTimer = 0;
    this.punchMaxTime = CONFIG.todo?.punchSpeed || 20;
    this.clapAnimTimer = 0;
    this.clapWindupTimer = 0;
    this.pendingSwapData = null;
    this.isRightPunch = true;
    this.hideFrontHand = false;
    this.hideBackHand = false;

    // Boogie Woogie Skill
    this.boogieWoogieCooldown = 0;
    this.boogieWoogieCooldownMax = CONFIG.todo?.clapCooldown || 60;
    this.justSwappedTimer = 0; // Window for Black Flash
    this.blackFlashGlowTimer = 0; // Visual lingering glow timer
    this.afterImages = []; // Zone trails afterimages array

    // Cursed Rock Skill (1v1 tool)
    this.rockThrowCooldown = 0;
    this.rockThrowCooldownMax = CONFIG.todo?.rockCooldown || 300;
    this.cursedRocks = [];

    // Rock Counter-Attack Combo state
    this.rockCounterComboLeft = 0;
    this.rockCounterComboTarget = null;
    this.rockCounterComboInterval = CONFIG.todo?.rockCounterComboInterval || 12;
    this.rockCounterComboTimer = 0;
    this.disengageDelayTimer = 0;

    this.postUltimateRecoveryTimer = 0;
  }

  reset() {
    super.reset();
    this.afterImages = [];
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

    // TimeStop & Freeze Guards (Rule 1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush || this.isParalyzed) {
      this.interruptAttacks();
      return;
    }

    super.update(opponent, ownerIndex, arena);

    // Smoothly transition Todo's Cursed Energy aura opacity
    const wantsAura = (this.clapAnimTimer > 0) || (this.clapWindupTimer > 0) || (this.rockCounterComboLeft > 0) || (this.punchAnimTimer > 0) || (this.justSwappedTimer > 0);
    if (wantsAura) {
      this.combatAuraOpacity = Math.min(1.0, this.combatAuraOpacity + 0.12);
    } else {
      this.combatAuraOpacity = Math.max(0.0, this.combatAuraOpacity - 0.05); // Smooth fade-out
    }

    // Provide targets array for AI logic by extracting them from state or fallback to opponent array if that's what opponent represents
    let targets = [];
    if (Array.isArray(opponent)) {
       targets = opponent;
    } else if (opponent) {
       targets = [opponent];
    }

    // Decrease cooldowns (operating at 120% potential inside the Zone)
    const decay = (this.blackFlashTimer > 0) ? (CONFIG.blackFlash?.zone?.cooldownDecayMultiplier ?? 1.20) : 1.0;
    if (this.boogieWoogieCooldown > 0) this.boogieWoogieCooldown = Math.max(0, this.boogieWoogieCooldown - decay);
    if (this.rockThrowCooldown > 0) this.rockThrowCooldown = Math.max(0, this.rockThrowCooldown - decay);
    if (this.justSwappedTimer > 0) this.justSwappedTimer--;
    if (this.blackFlashGlowTimer > 0) this.blackFlashGlowTimer--;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.clapAnimTimer > 0) this.clapAnimTimer--;
    if (this.cooldownTimer > 0) this.cooldownTimer = Math.max(0, this.cooldownTimer - decay);

    // Process clap windup advance frames: when hands collide at end of windup, execute the swap!
    if (this.clapWindupTimer > 0) {
      this.clapWindupTimer--;
      if (this.clapWindupTimer <= 0 && this.pendingSwapData) {
        modExecutePendingSwap.call(this);
      }
    }

    // Update active cursed rocks (pass targets so proximity detection works)
    modUpdateCursedRocks.call(this, targets);

    // Drive rock counter-attack combo punches (stay planted in place while punching)
    if (this.rockCounterComboLeft > 0) {
      this.vx = 0;
      this.vy = 0;
      this.rockCounterComboTimer--;
      if (this.rockCounterComboTimer <= 0) {
        const comboTarget = this.rockCounterComboTarget;
        // Make sure the target is still alive and in bounds
        if (comboTarget && !comboTarget.isDead && comboTarget.hp > 0) {
          this.aim(comboTarget);
          modUpdateMeleeCombat.call(this, comboTarget, true); // isCombo = true
        }
        this.rockCounterComboLeft--;
        this.rockCounterComboTimer = this.rockCounterComboInterval;

        // When final punch completes: set delay timer before clapping away for breather!
        if (this.rockCounterComboLeft <= 0 && comboTarget) {
          this.disengageDelayTimer = CONFIG.todo?.disengageDelayFrames || 18;
        }
      }
    }

    // Delay pause after final punch before clapping away for breather
    if (this.disengageDelayTimer > 0) {
      this.vx = 0;
      this.vy = 0;
      this.disengageDelayTimer--;
      if (this.disengageDelayTimer <= 0 && this.rockCounterComboTarget) {
        modRepositionDisengage.call(this, this.rockCounterComboTarget);
        this.rockCounterComboTarget = null;
      }
    }

    // AI/Skill execution
    if (!this.playerControlled && targets.length > 0) {
      let target = targets[0];
      if (target) {
        this.aim(target);
        
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        
        // AI Logic: Skills skipped in demo preview mode (only basic attacks!)
        if (!this.isDemoFighter) {
          // Todo throws rocks at range to set up his clap combo sequence (max 1 rock active)
          if (dist > 60 && this.rockThrowCooldown <= 0 && this.cursedRocks.length === 0) {
            modThrowCursedRock.call(this, target);
          }
        }

        // Melee Combat (Basic Attack Punch if naturally in range)
        const punchMaxRange = (this.r || 25) + (target.r || 25) + (CONFIG.todo?.punchRange || 60);
        if (dist <= punchMaxRange && (this.cooldownTimer || 0) <= 0 && (this.rockCounterComboLeft || 0) <= 0 && (this.disengageDelayTimer || 0) <= 0) {
          this.aim(target);
          modUpdateMeleeCombat.call(this, target, false);
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
        color: this.color || '#D2691E',
        timer: 16,
        maxTimer: 16
      }, 12);
    }
  }

  shoot() {
    // Basic Attack: Melee Punch
    if ((this.cooldownTimer || 0) > 0 || (this.rockCounterComboLeft || 0) > 0 || (this.disengageDelayTimer || 0) > 0) return;

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

    // Find the closest valid target within punch range
    for (let target of allTargets) {
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      const punchMaxRange = (this.r || 25) + (target.r || 25) + (CONFIG.todo?.punchRange || 60);
      if (dist <= punchMaxRange && dist < closestDist) {
        closestDist = dist;
        bestTarget = target;
      }
    }

    // If an enemy is in range, aim and punch. Otherwise punch the air!
    if (bestTarget) {
      this.aim(bestTarget);
      modUpdateMeleeCombat.call(this, bestTarget, false);
    } else if (this.playerControlled) {
      // Allow player to punch the air manually if they click
      modUpdateMeleeCombat.call(this, null, false);
    }
  }

  triggerSecondarySkill() {
    if (this.rockThrowCooldown <= 0) {
      modThrowCursedRock.call(this, null);
    }
  }

  interruptAttacks() {
    this.punchAnimTimer = 0;
    this.clapAnimTimer = 0;
    this.clapWindupTimer = 0;
    this.pendingSwapData = null;
  }

  draw(ctx) {
    // Only skip drawing if the fighter is dead (HP <= 0)
    if (this.hp <= 0) return;
    
    // Draw exact JJK Cursed Energy Sakuga Flame Aura (matching Gojo and Sukuna)
    GojoRenderer._drawJJKCursedEnergyAura(ctx, this, 'blue');

    drawTodoSkin(ctx, this);
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
