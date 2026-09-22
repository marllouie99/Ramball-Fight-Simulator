// ─────────────────────────────────────────────
// BOSS PHASE TRANSITION VFX
// Renders visual shockwave rings and screen flash during Phase 2 Enrage transition
// ─────────────────────────────────────────────

export class BossPhaseTransitionVfx {
  static draw(ctx, boss) {
    if (!boss || !boss.isBoss || !boss.bossState || boss.bossState.phaseTransitionTimer <= 0) return;

    const timer = boss.bossState.phaseTransitionTimer;
    const maxTimer = 45;
    const progress = 1 - (timer / maxTimer); // 0 -> 1

    ctx.save();
    ctx.translate(boss.x, boss.y);

    const config = boss.bossConfig || {};
    const shockColor = config.enrageAuraColor || '#DC2626';

    // 1. Expanding Primary Shock Ring
    const maxRadius = config.enrageShockwaveRadius || 240;
    const currentRadius = boss.r + progress * (maxRadius - boss.r);
    const alpha = Math.max(0, 1 - progress);

    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1, (1 - progress) * 4);
    ctx.strokeStyle = shockColor;
    ctx.globalAlpha = alpha * 0.8;
    ctx.stroke();

    // 2. Trailing Secondary Energy Echo
    if (progress > 0.2) {
      const echoProg = (progress - 0.2) / 0.8;
      const echoRadius = boss.r + echoProg * (maxRadius * 0.75 - boss.r);
      ctx.beginPath();
      ctx.arc(0, 0, echoRadius, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1, (1 - echoProg) * 2.5);
      ctx.strokeStyle = '#FFFFFF';
      ctx.globalAlpha = Math.max(0, 1 - echoProg) * 0.5;
      ctx.stroke();
    }

    ctx.restore();
  }
}
