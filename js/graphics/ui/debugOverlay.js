// ─────────────────────────────────────────────
// DEBUG & PERFORMANCE OVERLAY RENDERER
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';

export function renderFpsDebugOverlay(ctx) {
  if (!state || !state.fps) return;

  ctx.save();
  ctx.font = 'bold 12px Consolas, monospace';
  ctx.fillStyle = state.fps < 45 ? '#ff4444' : '#00ff66';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';

  const text = `FPS: ${Math.round(state.fps)} | Q: ${Math.round((state.qualityLevel || 1) * 100)}%`;
  ctx.fillText(text, state.canvas.width - 15, 15);
  ctx.restore();
}
