// ─────────────────────────────────────────────
// GOJO BOSS ABILITIES
// Boss enhancements: Expanded Infinity Barrier, Super-Sized Purple
// ─────────────────────────────────────────────

export class GojoBossAbilities {
  static update(boss, dt, config) {
    if (!boss || !boss.isBoss || boss.hp <= 0) return;
    // In Phase 2, Gojo Infinity recovers faster
    if (boss.bossState?.phase >= 2 && boss.infinityCooldown > 0) {
      boss.infinityCooldown = Math.max(0, boss.infinityCooldown - 0.3);
    }
  }
}
