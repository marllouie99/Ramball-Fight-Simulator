// ─────────────────────────────────────────────
// HUD & FIGHTER STATUS UI RENDERER
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { MODE_SETTINGS } from '../../core/modeConfig.js';

export function renderTeamHpCard(teamIndex, fighterIndexes, x, y, w, h, teamColor, teamName, drawPanelFn) {
  const ctx = state.ctx;
  if (drawPanelFn) drawPanelFn(x, y, w, h, 0.84, 14);

  // Team tint overlay
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = teamColor;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 12);
  ctx.fill();
  ctx.restore();

  // Team header stripe
  ctx.fillStyle = teamColor;
  ctx.fillRect(x + 2, y + 2, w - 4, 24);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(teamName, x + 14, y + 14);

  const rowX = x + 12;
  const rowW = w - 24;
  const rowH = 32;
  const rowGap = 8;

  fighterIndexes.forEach((fighterIndex, i) => {
    const fighter = state.fighters[fighterIndex];
    if (!fighter) return;

    const currentY = y + 32 + 8 + i * (rowH + rowGap);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.roundRect(rowX, currentY, rowW, rowH, 10);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fighter.name, rowX + 10, currentY + 6);

    const displayHp = Number.isInteger(fighter.hp) ? `${fighter.hp}` : fighter.hp.toFixed(1);
    const displayMaxHp = Number.isInteger(fighter.maxHp) ? `${fighter.maxHp}` : fighter.maxHp.toFixed(1);
    ctx.font = '11px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`${displayHp}/${displayMaxHp}`, rowX + rowW - 10, currentY + 6);

    const barX = rowX + 10;
    const barY = currentY + rowH - 14;
    const barW = rowW - 20;
    const barH = 8;
    const hpRatio = Math.max(0, fighter.hp / fighter.maxHp);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    ctx.fillStyle = `hsl(${hpRatio * 120}, 92%, 56%)`;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * hpRatio, barH, 4);
    ctx.fill();
  });
}
