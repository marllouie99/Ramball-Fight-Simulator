// ─────────────────────────────────────────────
// BOSS PHASE CONTROLLER
// Evaluates HP thresholds and manages Boss Phase transitions & enrage states
// ─────────────────────────────────────────────

import { BaseBossAbilities } from '../abilities/BaseBossAbilities.js';

export class BossPhaseController {
  /**
   * Evaluates current Boss HP and executes phase transition when passing thresholds
   */
  static checkPhaseTransition(boss) {
    if (!boss || !boss.isBoss || !boss.bossState || boss.hp <= 0) return;

    const config = boss.bossConfig;
    const maxHp = boss._originalMaxHp || boss.maxHp || 1;
    const curHp = (typeof boss.getDisplayHp === 'function') ? boss.getDisplayHp() : boss.hp;
    const hpRatio = Math.max(0, curHp / maxHp);

    const threshold = config?.phase2Threshold;
    if (typeof threshold !== 'number') return;

    // Trigger Phase 2 if currently in Phase 1 and drops to or below threshold
    if (boss.bossState.phase === 1 && hpRatio <= threshold) {
      this.enterPhase2(boss, config);
    }
  }

  /**
   * Promotes the Boss into Phase 2 Enrage
   */
  static enterPhase2(boss, config) {
    boss.bossState.phase = 2;
    boss.bossState.isEnraged = true;
    boss.bossState.phaseTransitionTimer = 45; // 0.75s transition FX timer

    // 1. Buff movement speed
    const speedMult = config?.phase2SpeedMultiplier ?? 1.15;
    boss.speed = (boss.speed || 5.0) * speedMult;

    // 2. Reduce attack cooldown max
    if (boss.shootCooldownMax) {
      const cdMult = config?.phase2CooldownMultiplier ?? 0.80;
      boss.shootCooldownMax = Math.max(20, Math.round(boss.shootCooldownMax * cdMult));
    }

    // 3. Trigger Universal Enrage Shockwave
    BaseBossAbilities.triggerEnrageShockwave(boss, config);
  }
}
