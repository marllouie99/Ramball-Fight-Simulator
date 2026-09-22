// ─────────────────────────────────────────────
// BOSS MANAGER
// Global orchestrator for Boss instances, phase lifecycle, and ability updates
// ─────────────────────────────────────────────

import { BossDecorator } from './BossDecorator.js';
import { BossPhaseController } from './BossPhaseController.js';
import { BossAbilityRegistry } from '../abilities/BossAbilityRegistry.js';

class BossManagerClass {
  constructor() {
    this.activeBoss = null;
  }

  /**
   * Initializes and transforms the given fighter into the active Boss
   */
  initializeBoss(fighter) {
    if (!fighter) {
      this.activeBoss = null;
      return null;
    }
    this.activeBoss = BossDecorator.decorate(fighter);
    return this.activeBoss;
  }

  /**
   * Per-frame update for Boss systems (Phase checks, ability timers)
   */
  update(dt = 1) {
    const boss = this.activeBoss;
    if (!boss || !boss.isBoss || boss.hp <= 0) return;

    // 1. Check HP thresholds and Phase 2 Enrage
    BossPhaseController.checkPhaseTransition(boss);

    // 2. Decrement Phase Transition VFX Timer
    if (boss.bossState && boss.bossState.phaseTransitionTimer > 0) {
      boss.bossState.phaseTransitionTimer = Math.max(0, boss.bossState.phaseTransitionTimer - dt);
    }

    // 3. Update character-specific boss abilities
    BossAbilityRegistry.updateBossAbilities(boss, dt, boss.bossConfig);
  }

  /**
   * Resets active boss references on match reset or title exit
   */
  reset() {
    this.activeBoss = null;
  }

  getActiveBoss() {
    return this.activeBoss;
  }

  isBoss(fighter) {
    return Boolean(fighter && fighter.isBoss);
  }
}

export const BossManager = new BossManagerClass();
