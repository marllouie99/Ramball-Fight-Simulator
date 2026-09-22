// ─────────────────────────────────────────────
// BOSS DECORATOR
// Decorates any standard Fighter instance with Boss traits, scaled stats, and super-armor
// ─────────────────────────────────────────────

import { getBossConfig } from '../../configs/bosses/bossConfigRegistry.js';
import { BaseBossAbilities } from '../abilities/BaseBossAbilities.js';

export class BossDecorator {
  /**
   * Decorates a fighter instance as an active Boss
   */
  static decorate(fighter) {
    if (!fighter || fighter.isBoss) return fighter;

    const config = getBossConfig(fighter);
    fighter.isBoss = true;
    fighter.bossConfig = config;

    // 1. Stat Multipliers & Scaling
    const baseHp = config.hp || config.defaultHp || 2500;
    fighter.maxHp = baseHp;
    fighter.hp = baseHp;
    fighter._originalMaxHp = baseHp;

    const baseR = config.r || config.radius || fighter.r || 25;
    const sizeMult = (typeof config.sizeMultiplier === 'number' && config.sizeMultiplier > 0) ? config.sizeMultiplier : 1.0;
    fighter.r = Math.round(baseR * sizeMult);

    if (config.damage && !fighter._bossDamageDecorated) {
      fighter.damage = config.damage;
      fighter._bossDamageDecorated = true;
    } else if (config.damageMultiplier && !fighter._bossDamageDecorated) {
      fighter.damage = Math.round((fighter.damage || 20) * config.damageMultiplier);
      fighter._bossDamageDecorated = true;
    }

    if (config.speed || config.moveSpeed) {
      fighter.speed = config.speed || config.moveSpeed;
    }

    const cd = config.attackCooldown || config.slashCooldown || config.cooldown;
    if (cd) {
      fighter.shootCooldownMax = cd;
    }

    // 2. Boss State Lifecycle
    fighter.bossState = {
      phase: 1,
      isEnraged: false,
      phaseTransitionTimer: 0,
    };

    // 3. Super-Armor Knockback & Hit-Stun Interceptors
    const originalApplyHitStun = fighter.applyHitStun?.bind(fighter);
    if (originalApplyHitStun) {
      fighter.applyHitStun = function(frames) {
        const mitigated = BaseBossAbilities.mitigateHitStun(frames, config);
        return originalApplyHitStun(mitigated);
      };
    }

    return fighter;
  }
}
