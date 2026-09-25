// ─────────────────────────────────────────────
// BOSS AURA RENDERER
// Draws in-combat ground sigils, runic rings, and phase 2 enrage flames
// Strictly prohibits shadowBlur (Rule 2.2) and preserves Canvas transform stacks (Rule 2.4)
// ─────────────────────────────────────────────

export class BossAuraRenderer {
  /**
   * Draws the thematic Boss Aura / Ground Sigil beneath the boss entity.
   * Completely disabled per user request to remove circular visuals around bosses.
   */
  static drawBossAura(ctx, boss) {
    // Disabled circular visual per user request
    return;
  }
}

