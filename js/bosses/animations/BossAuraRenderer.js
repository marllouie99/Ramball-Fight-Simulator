// ─────────────────────────────────────────────
// BOSS AURA RENDERER
// Draws in-combat ground sigils, runic rings, and phase 2 enrage flames
// Strictly prohibits shadowBlur (Rule 2.2) and preserves Canvas transform stacks (Rule 2.4)
// ─────────────────────────────────────────────

export class BossAuraRenderer {
  /**
   * Draws the thematic Boss Aura / Ground Sigil beneath the boss entity
   */
  static drawBossAura(ctx, boss) {
    if (!boss || !boss.isBoss || boss.hp <= 0) return;

    const config = boss.bossConfig || {};
    const isEnraged = Boolean(boss.bossState?.isEnraged);
    const auraColor = isEnraged ? (config.enrageAuraColor || '#DC2626') : (config.entranceAuraColor || config.themeColor || '#38BDF8');

    boss._bossAuraAngle = (boss._bossAuraAngle || 0) + (isEnraged ? 0.04 : 0.015);
    const angle = boss._bossAuraAngle;

    ctx.save();
    ctx.translate(boss.x, boss.y);

    const baseRadius = boss.r * (isEnraged ? 1.45 : 1.25);

    // 1. Outer Concentric Concentrated Glow (Zero shadowBlur - Rule 2.2)
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius + 6, 0, Math.PI * 2);
    ctx.fillStyle = isEnraged ? 'rgba(220, 38, 38, 0.08)' : 'rgba(56, 189, 248, 0.06)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, baseRadius + 2, 0, Math.PI * 2);
    ctx.fillStyle = isEnraged ? 'rgba(220, 38, 38, 0.14)' : 'rgba(56, 189, 248, 0.12)';
    ctx.fill();

    // 2. Rotating Segmented Runic Outer Ring
    ctx.save();
    ctx.rotate(angle);
    ctx.lineWidth = isEnraged ? 2.5 : 1.8;
    ctx.strokeStyle = auraColor;
    ctx.globalAlpha = isEnraged ? 0.85 : 0.65;

    const segments = isEnraged ? 6 : 4;
    const arcLen = (Math.PI * 2) / segments;
    for (let i = 0; i < segments; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, i * arcLen, i * arcLen + arcLen * 0.65);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Counter-Rotating Inner Decorative Dots
    ctx.save();
    ctx.rotate(-angle * 1.5);
    const innerRadius = baseRadius * 0.78;
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = isEnraged ? 0.9 : 0.6;
    for (let i = 0; i < 4; i++) {
      const dotAngle = (i * Math.PI) / 2;
      const dx = Math.cos(dotAngle) * innerRadius;
      const dy = Math.sin(dotAngle) * innerRadius;
      ctx.beginPath();
      ctx.arc(dx, dy, isEnraged ? 2.5 : 2.0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }
}
