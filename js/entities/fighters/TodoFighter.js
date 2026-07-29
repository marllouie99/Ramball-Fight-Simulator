import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { drawTodoSkin } from '../../graphics/fighters/todoSkin.js';
import { modUpdateMeleeCombat } from './todo/todoCombat.js';
import { modUpdateBoogieWoogie, modThrowCursedRock, modUpdateCursedRocks, modRepositionDisengage } from './todo/todoSkills.js';

/**
 * Aoi Todo - The Boogie Woogie Brawler
 */
export class TodoFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'todo';
    this.type = 'todo';
    
    // Core Combat Variables
    this.punchAnimTimer = 0;
    this.punchMaxTime = CONFIG.todo?.punchSpeed || 20;
    this.isRightPunch = true;
    this.hideFrontHand = false;
    this.hideBackHand = false;

    // Boogie Woogie Skill
    this.boogieWoogieCooldown = 0;
    this.boogieWoogieCooldownMax = CONFIG.todo?.clapCooldown || 60;
    this.justSwappedTimer = 0; // Window for Black Flash

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

  update(opponent, ownerIndex, arena) {
    if (this.isDead || this.isRespawning) return;

    // TimeStop & Freeze Guards (Rule 1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush || this.isParalyzed) {
      this.interruptAttacks();
      return;
    }

    super.update(opponent, ownerIndex, arena);

    // Provide targets array for AI logic by extracting them from state or fallback to opponent array if that's what opponent represents
    let targets = [];
    if (Array.isArray(opponent)) {
       targets = opponent;
    } else if (opponent) {
       targets = [opponent];
    }

    // Decrease cooldowns
    if (this.boogieWoogieCooldown > 0) this.boogieWoogieCooldown--;
    if (this.rockThrowCooldown > 0) this.rockThrowCooldown--;
    if (this.justSwappedTimer > 0) this.justSwappedTimer--;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.cooldownTimer > 0) this.cooldownTimer--;

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
  }

  shoot() {
    // Player controlled skill triggering
    if (this.playerControlled) {
      // Primary Skill: Boogie Woogie
      if (this.boogieWoogieCooldown <= 0) {
        modUpdateBoogieWoogie.call(this, []);
      }
    }
  }

  triggerSecondarySkill() {
    if (this.rockThrowCooldown <= 0) {
      modThrowCursedRock.call(this, null);
    }
  }

  interruptAttacks() {
    this.punchAnimTimer = 0;
  }

  draw(ctx) {
    // Only skip drawing if the fighter is dead (HP <= 0)
    if (this.hp <= 0) return;
    
    drawTodoSkin(ctx, this);
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
