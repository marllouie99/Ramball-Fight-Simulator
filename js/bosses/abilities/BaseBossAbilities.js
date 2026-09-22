// ─────────────────────────────────────────────
// BASE BOSS ABILITIES
// Universal boss mechanics: Enrage Shockwave, Super-Armor, and Knockback Mitigation
// ─────────────────────────────────────────────

import { state, triggerGlobalScreenShake, spawnFloatingText } from '../../core/state.js';
import { spawnImpactFlash, spawnSparks } from '../../graphics/particles/sparkEffect.js';

export class BaseBossAbilities {
  /**
   * Triggers an explosive radial energy wave when the Boss enters Phase 2 Enrage.
   * Displaces nearby challengers, cancels enemy attacks, and shakes the arena.
   */
  static triggerEnrageShockwave(boss, config) {
    if (!boss || !state.arena) return;

    const shockRadius = config?.enrageShockwaveRadius || 240;
    const shockForce = config?.enrageShockwaveForce || 16;
    const shakeIntensity = config?.enrageShakeIntensity || 8;
    const shakeFrames = config?.enrageShakeFrames || 16;

    // 1. Global Screen Tremor
    triggerGlobalScreenShake(shakeIntensity, shakeFrames);

    // 2. Visual FX: Concentric shockwave sparks & flash
    spawnImpactFlash(boss.x, boss.y, boss.r * 2.2, config.enrageAuraColor || '#FF3344');
    spawnSparks(boss.x, boss.y, 24, config.enrageAuraColor || '#FF3344', 8);

    // 3. Floating Announcement Text
    spawnFloatingText('✦ PHASE 2: ENRAGED! ✦', boss.x, boss.y - boss.r - 20, config.enrageAuraColor || '#FF3344', 24);

    // 4. Pushback & Hit-Stun onto all opponents in radius
    const opponents = (state.fighters || []).filter(f => f && f !== boss && f.hp > 0 && !f.isTurret);
    opponents.forEach(target => {
      const dx = target.x - boss.x;
      const dy = target.y - boss.y;
      const dist = Math.hypot(dx, dy) || 1;

      if (dist <= shockRadius) {
        const factor = (1 - dist / shockRadius) * shockForce;
        const pushX = (dx / dist) * factor;
        const pushY = (dy / dist) * factor;

        target.vx = (target.vx || 0) + pushX;
        target.vy = (target.vy || 0) + pushY;

        if (typeof target.applyHitStun === 'function') {
          target.applyHitStun(20);
        }
        if (typeof target.interruptAttacks === 'function') {
          target.interruptAttacks();
        }
      }
    });
  }

  /**
   * Modifies incoming knockback impulses according to boss super-armor settings
   */
  static mitigateKnockback(impulse, config) {
    if (!config || typeof config.knockbackReceivedMultiplier !== 'number') return impulse;
    return impulse * config.knockbackReceivedMultiplier;
  }

  /**
   * Modifies incoming hit-stun frames according to boss poise
   */
  static mitigateHitStun(frames, config) {
    if (!config || typeof config.hitStunReduction !== 'number') return frames;
    const mult = Math.max(0, 1 - config.hitStunReduction);
    return Math.round(frames * mult);
  }
}
