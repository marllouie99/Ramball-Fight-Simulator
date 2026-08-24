// ─────────────────────────────────────────────
// TACTICAL FORCE — TACTICAL MAP RENDERER
// Clean, minimalist tactical battleground renderer with solid cover walls
// ─────────────────────────────────────────────

import { STARTER_MAP } from './starterMap.js';
import { getCurrentPlayingBgmTitle } from '../../js/systems/arenaBgmSystem.js';
import { state } from '../../js/core/state.js';

/** Main entry point for drawing the custom tactical battleground */
export function drawTacticalMap(ctx, map = STARTER_MAP) {
  const arena = map.arena;
  const { x, y, width: w, height: h, wallWidth = 6 } = arena;

  ctx.save();

  // 1. Fill the entire canvas background outside the arena with pitch black
  const canvasW = ctx.canvas ? ctx.canvas.width : 540;
  const canvasH = ctx.canvas ? ctx.canvas.height : 960;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // 2. Clean Dark Arena Floor
  ctx.fillStyle = map.theme?.floorBase || '#0d1117';
  ctx.fillRect(x, y, w, h);

  // 3. Draw All Solid Tactical Barrier Walls
  if (map.obstacles && Array.isArray(map.obstacles)) {
    map.obstacles.forEach(obs => {
      drawWallObstacle(ctx, obs);
    });
  }

  // 4. Clean Solid Arena Outer Border
  ctx.strokeStyle = map.theme?.wallBorder || '#475569';
  ctx.lineWidth = wallWidth;
  ctx.strokeRect(x, y, w, h);

  // 5. Background Music Title Text above Top Arena Wall
  const bgmTitle = getCurrentPlayingBgmTitle();
  if (bgmTitle && (typeof state !== 'undefined') && (state.gameState === 'playing' || state.gameState === 'countdown' || state.gameState === 'roundEnd' || state.gameState === 'matchEnd')) {
    const centerX = x + w / 2;
    const textY = y - 10;
    ctx.save();
    ctx.font = '900 11.5px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Dark stroke outline
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.strokeText(bgmTitle, centerX, textY);

    // High-visibility amber-gold fill
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(bgmTitle, centerX, textY);
    ctx.restore();
  }

  ctx.restore();
}

/** Draws a clean solid tactical barrier wall */
function drawWallObstacle(ctx, obs) {
  const { x, y, w, h } = obs;
  const wallColor = obs.color || '#1e293b';
  const borderColor = obs.borderColor || '#475569';

  ctx.save();

  // Solid Wall Body
  ctx.fillStyle = wallColor;
  ctx.fillRect(x, y, w, h);

  // Crisp Wall Border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  ctx.restore();
}
