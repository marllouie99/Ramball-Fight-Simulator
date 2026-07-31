import { CONFIG } from '../../../core/config.js';
import { modUpdateMeleeCombat } from './yujiCombat.js';
import { audioSystem } from '../../../systems/audioSystem.js';

/**
 * Handles Yuji Itadori's Skill 1: Divergent Fist Combo Rush.
 * Dashes to target, then triggers a rapid 6-hit punch flurry.
 */
export function modUpdateComboRush(target) {
  // ── 1. TRIGGER CHECK ──
  if (!this.isComboDashing && (this.comboHitsLeft || 0) <= 0 && (this.comboRushCooldown || 0) <= 0 && target) {
    const dist = Math.hypot(target.x - this.x, target.y - this.y);
    const range = CONFIG.yuji?.comboDashRange || 200;
    
    // Only dash if not already in standard melee range
    if (dist <= range && dist > (this.r + target.r + 30)) {
      this.isComboDashing = true;
      this.comboTarget = target;
      this.comboRushCooldown = CONFIG.yuji?.comboCooldown || 400;
      
      // Play a quick dash whoosh sound
      audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 0.85);
    }
  }

  // ── 2. DASHING TO TARGET ──
  if (this.isComboDashing) {
    const t = this.comboTarget;
    if (!t || t.isDead || t.hp <= 0) {
      this.isComboDashing = false;
      this.comboTarget = null;
      return;
    }

    this.aim(t);
    const angle = Math.atan2(t.y - this.y, t.x - this.x);
    const dashSpeed = 15.5;
    this.vx = Math.cos(angle) * dashSpeed;
    this.vy = Math.sin(angle) * dashSpeed;

    const dist = Math.hypot(t.x - this.x, t.y - this.y);
    if (dist <= (this.r + t.r + 35)) {
      // Arrived at target: start punch combo
      this.isComboDashing = false;
      this.comboHitsLeft = CONFIG.yuji?.comboHits || 6;
      this.comboIntervalTimer = 1; // Immediately fire the first punch
      this.vx = 0;
      this.vy = 0;
    }
  }

  // ── 3. COMBO PUNCH FLURRY ──
  if ((this.comboHitsLeft || 0) > 0) {
    const t = this.comboTarget;
    if (!t || t.isDead || t.hp <= 0) {
      this.comboHitsLeft = 0;
      this.comboTarget = null;
      return;
    }

    // Check if enemy escaped out of reach (adding a small buffer for punch knockbacks)
    const dist = Math.hypot(t.x - this.x, t.y - this.y);
    if (dist > (this.r + t.r + 45)) {
      this.comboHitsLeft = 0;
      this.comboTarget = null;
      return;
    }

    // Freeze movement during punch combo
    this.vx = 0;
    this.vy = 0;
    this.aim(t);

    this.comboIntervalTimer--;
    if (this.comboIntervalTimer <= 0) {
      modUpdateMeleeCombat.call(this, t, true); // true = combo flurry hit
      this.comboHitsLeft--;
      this.comboIntervalTimer = CONFIG.yuji?.comboInterval || 10;
    }
  }
}

/**
 * Handles Yuji Itadori's Skill 2: Reverse Cursed Technique (RCT).
 * Channels for 45 frames (0.75s) to heal 15% Max HP. Only usable once per round.
 */
export function modUpdateReverseCursedTechnique() {
  if (this.isChannelingRCT) {
    this.rctChannelTimer--;

    // Cancel all movement and AI basic attacks while channeling
    this.vx = 0;
    this.vy = 0;
    
    // Play charging aura sound periodically
    if (this.rctChannelTimer % 15 === 0) {
      audioSystem.playSFX('Assets/Sound Effects/Skills/redcharging.mp3', 0.6);
    }

    if (this.rctChannelTimer <= 0) {
      // Channel complete - apply heal
      this.isChannelingRCT = false;
      const healAmount = Math.floor(this.maxHp * (CONFIG.yuji?.rctHealPercent || 0.15));
      
      // Use fighter.heal to automatically trigger HP bar glow and floating text
      if (typeof this.heal === 'function') {
        this.heal(healAmount, { color: '#00FF00' });
      } else {
        this.hp = Math.min(this.maxHp, this.hp + healAmount);
        import('../../../core/state.js').then(module => {
          module.spawnFloatingText(this.x, this.y - this.r - 20, `+${healAmount}`, '#00FF00');
        });
      }

      // Play heal sound
      audioSystem.playSFX('Assets/Sound Effects/Skills/enhance.mp3', 1.0);
    }
  }
}
