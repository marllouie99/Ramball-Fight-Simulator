// ─────────────────────────────────────────────
// TACTICAL FORCE — TACTICAL MAP RENDERER
// Clean, minimalist tactical battleground renderer with solid cover walls
// ─────────────────────────────────────────────

import { STARTER_MAP } from './starterMap.js';
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

  ctx.restore();
}

/** Draws a clean solid tactical barrier wall with reinforced bevels and structural detail */
function drawWallObstacle(ctx, obs) {
  const { x, y, w, h } = obs;
  const wallColor = obs.color || '#1e293b';
  const borderColor = obs.borderColor || '#475569';

  ctx.save();

  // Solid Wall Body with subtle rounded bevel
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, 3.0);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fillStyle = wallColor;
  ctx.fill();

  // Crisp Wall Border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Subtle interior ballistic reinforced ribs
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1.0;
  if (w > h && w >= 60) {
    // Horizontal barrier: draw vertical division ribs
    const step = 28;
    const startX = x + 16;
    const endX = x + w - 16;
    for (let rx = startX; rx <= endX; rx += step) {
      ctx.beginPath();
      ctx.moveTo(rx, y + 3);
      ctx.lineTo(rx, y + h - 3);
      ctx.stroke();
    }
  } else if (h > w && h >= 60) {
    // Vertical barrier: draw horizontal division ribs
    const step = 28;
    const startY = y + 16;
    const endY = y + h - 16;
    for (let ry = startY; ry <= endY; ry += step) {
      ctx.beginPath();
      ctx.moveTo(x + 3, ry);
      ctx.lineTo(x + w - 3, ry);
      ctx.stroke();
    }
  }

  ctx.restore();
}
