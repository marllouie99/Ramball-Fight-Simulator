import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { drawTodoSkin } from '../../graphics/fighters/todoSkin.js';
import { modUpdateMeleeCombat } from './todo/todoCombat.js';
import { modUpdateBoogieWoogie, modThrowCursedRock, modUpdateCursedRocks } from './todo/todoSkills.js';

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

    // Update active cursed rocks
    modUpdateCursedRocks.call(this);

    // AI/Skill execution
    if (!this.playerControlled && targets.length > 0) {
      let target = targets[0];
      if (target) {
        this.aim(target);
        
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        
        // AI Logic: Skills skipped in demo preview mode (only basic attacks!)
        if (!this.isDemoFighter) {
          if (dist > 150 && this.rockThrowCooldown <= 0) {
            modThrowCursedRock.call(this, target);
          }

          if (this.boogieWoogieCooldown <= 0 && (dist > 250 || Math.random() < 0.02)) {
            modUpdateBoogieWoogie.call(this, targets);
          }
        }

        // Melee Combat (Basic Attack Punch)
        if (dist <= (CONFIG.todo?.punchRange || 45) && (this.cooldownTimer || 0) <= 0) {
          modUpdateMeleeCombat.call(this, target);
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
