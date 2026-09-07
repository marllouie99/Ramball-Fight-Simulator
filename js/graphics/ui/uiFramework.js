import { state } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';

// ─────────────────────────────────────────────
// BUTTON REGISTRY
// ─────────────────────────────────────────────
let _buttons = [];
let _hoveredButton = null;
let _mouseX = 0;
let _mouseY = 0;

function _clearButtons() {
  _buttons = [];
  _hoveredButton = null;
}

function _registerButton(x, y, w, h, action) {
  _buttons.push({ x, y, w, h, action });
}

function handleUIMove(mx, my) {
  _mouseX = mx;
  _mouseY = my;
  let found = null;
  for (let i = _buttons.length - 1; i >= 0; i -= 1) {
    const btn = _buttons[i];
    if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      found = btn;
      break;
    }
  }
  _hoveredButton = found;
  if (state.canvas) {
    state.canvas.style.cursor = found ? 'pointer' : 'default';
  }
}

function handleUIClick(mx, my) {
  for (let i = _buttons.length - 1; i >= 0; i -= 1) {
    const btn = _buttons[i];
    if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      btn.action();
      return true;
    }
  }
  return false;
}

/** Draws a rounded or chamfered rectangle path. */
export function drawChamferedRect(ctx, x, y, w, h, radius = 4) {
  const r = Math.min(radius, w / 4, h / 4);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Draws a vintage 90s Mac OS / Pixel Art cream window panel with dark chocolate border and 3D bevel. */
function drawPanel(x, y, w, h, alpha = 0.96, radius = 4, borderColor = null) {
  const ctx = state.ctx;

  ctx.save();
  // 3D Drop shadow underneath panel
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.35})`;
  drawChamferedRect(ctx, x + 3, y + 3, w, h, radius);
  ctx.fill();

  // Warm cream/parchment panel body
  ctx.fillStyle = `rgba(245, 238, 220, ${alpha})`;
  ctx.strokeStyle = borderColor || '#2d080c';
  ctx.lineWidth = 2;

  drawChamferedRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.stroke();

  // Inner subtle highlight line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, Math.max(1, radius - 1));
  ctx.stroke();

  ctx.restore();
}

/** Draws a chunky 3D extruded pixel button with authentic 90s depth and depress physics. */
function drawButton(text, cx, cy, action, w = 200, h = 40, customColor = null, radius = 4) {
  const ctx = state.ctx;
  const x = cx - w / 2;
  const y = cy - h / 2;

  // Check hover state
  const isHovered = _hoveredButton &&
    _mouseX >= x && _mouseX <= x + w &&
    _mouseY >= y && _mouseY <= y + h;

  const upperText = (text || '').toUpperCase();
  const isPrimary = upperText.includes('START') || upperText.includes('LAUNCH') || upperText.includes('LOCK IN') || upperText.includes('PLAY AGAIN') || upperText.includes('PLAY NOW') || upperText.includes('GAUNTLET') || upperText.includes('DEPLOY');
  const isSecondary = upperText.includes('BACK') || upperText.includes('CANCEL') || upperText.includes('CLOSE') || upperText.includes('TUTORIAL') || upperText.includes('MAIN MENU') || upperText.includes('EDIT') || upperText.includes('RESET');

  const shadowDepth = isHovered ? 4 : 3;
  const topFaceY = isHovered ? y - 1 : y;

  ctx.save();

  // Draw 3D Bottom Extruded Shadow Block
  let shadowColor = '#baa88c';
  let faceColor = '#e8dec8';
  let textColor = '#2d080c';
  let strokeColor = '#2d080c';

  if (isPrimary) {
    shadowColor = '#4d0a13';
    faceColor = isHovered ? '#b51f33' : '#9e1a2b';
    textColor = '#ffffff';
    strokeColor = '#2d080c';
  } else if (isSecondary) {
    shadowColor = '#7c2d37';
    faceColor = isHovered ? '#f7cad0' : '#f0b6ba';
    textColor = '#2d080c';
    strokeColor = '#2d080c';
  } else if (customColor) {
    shadowColor = '#4d0a13';
    faceColor = customColor;
    textColor = '#ffffff';
    strokeColor = '#2d080c';
  } else {
    shadowColor = '#baa88c';
    faceColor = isHovered ? '#f2e8d5' : '#e8dec8';
    textColor = '#2d080c';
    strokeColor = '#2d080c';
  }

  // Shadow bevel rectangle
  ctx.fillStyle = shadowColor;
  drawChamferedRect(ctx, x, topFaceY + shadowDepth, w, h, radius);
  ctx.fill();

  // Top button face
  ctx.fillStyle = faceColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.8;
  drawChamferedRect(ctx, x, topFaceY, w, h, radius);
  ctx.fill();
  ctx.stroke();

  // Top highlight gloss line
  ctx.strokeStyle = isPrimary ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + radius + 1, topFaceY + 2);
  ctx.lineTo(x + w - radius - 1, topFaceY + 2);
  ctx.stroke();

  // Button text
  ctx.fillStyle = textColor;
  ctx.font = isPrimary 
    ? '700 8.5px "Press Start 2P", monospace'
    : '700 7.5px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, topFaceY + h / 2 + 0.5);

  ctx.restore();

  const transform = ctx.getTransform();
  const corners = [
    { x, y: topFaceY },
    { x: x + w, y: topFaceY },
    { x, y: topFaceY + h + shadowDepth },
    { x: x + w, y: topFaceY + h + shadowDepth },
  ];
  const points = corners.map((pt) => ({
    x: transform.a * pt.x + transform.c * pt.y + transform.e,
    y: transform.b * pt.x + transform.d * pt.y + transform.f,
  }));
  const minX = Math.min(...points.map((pt) => pt.x));
  const maxX = Math.max(...points.map((pt) => pt.x));
  const minY = Math.min(...points.map((pt) => pt.y));
  const maxY = Math.max(...points.map((pt) => pt.y));
  _registerButton(minX, minY, maxX - minX, maxY - minY, action);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight = 16) {
  const words = (text || '').split(' ');
  let line = '';
  for (let i = 0; i < words.length; i += 1) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = words[i];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
  }
}

function drawPremiumStatBar(ctx, x, y, width, label, valueStr, percentage, color = '#9e1a2b') {
  // Label
  ctx.fillStyle = '#2d080c';
  ctx.font = '700 7.5px "Silkscreen", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, x, y - 2);
  
  // Value text
  ctx.fillStyle = '#702028';
  ctx.font = '700 7.5px "Silkscreen", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(valueStr, x + width, y - 2);

  // Background track
  ctx.fillStyle = '#eed8dc';
  ctx.strokeStyle = '#2d080c';
  ctx.lineWidth = 1.2;
  drawChamferedRect(ctx, x, y, width, 5, 2);
  ctx.fill();
  ctx.stroke();

  // Foreground fill
  ctx.save();
  ctx.fillStyle = color;
  const fillW = Math.max(2, Math.min(width - 2, (width - 2) * percentage));
  drawChamferedRect(ctx, x + 1, y + 1, fillW, 3, 1);
  ctx.fill();
  ctx.restore();
}

function drawStatBar(ctx, label, value, maxValue, x, y, width, color = '#9e1a2b') {
  // Metric Label on left
  ctx.fillStyle = '#2d080c';
  ctx.font = '700 7.5px "Silkscreen", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + 3);

  const labelW = 28;
  const valueW = width > 120 ? 32 : 0;
  const barX = x + labelW;
  const barW = width - labelW - valueW - 4;
  const barH = 5;

  // Background Track
  ctx.fillStyle = '#eed8dc';
  ctx.strokeStyle = '#2d080c';
  ctx.lineWidth = 1.2;
  drawChamferedRect(ctx, barX, y + 1, barW, barH, 2);
  ctx.fill();
  ctx.stroke();

  // Filled Gauge
  const fillW = Math.min(barW - 2, Math.max(2, (value / maxValue) * (barW - 2)));
  ctx.save();
  ctx.fillStyle = color;
  drawChamferedRect(ctx, barX + 1, y + 2, fillW, barH - 2, 1);
  ctx.fill();
  ctx.restore();

  // Metric Value on right
  if (valueW > 0) {
    ctx.fillStyle = '#702028';
    ctx.font = '700 7.5px "Silkscreen", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(typeof value === 'number' ? value : value, x + width, y + 3);
  }
}

export { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar };
