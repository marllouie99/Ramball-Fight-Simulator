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

/** Draws a 45-degree chamfered polygon path (DOOM Eternal Tactical aesthetic). */
export function drawChamferedRect(ctx, x, y, w, h, chamfer = 8) {
  const c = Math.min(chamfer, w / 4, h / 4);
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

/** Draws a semi-transparent chamfered tactical panel with disciplined gunmetal styling. */
function drawPanel(x, y, w, h, alpha = 0.88, chamfer = 8, borderColor = null) {
  const ctx = state.ctx;

  // Create clean dark slate gradient background
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, `rgba(20, 24, 34, ${alpha})`);
  grad.addColorStop(0.5, `rgba(14, 17, 24, ${alpha})`);
  grad.addColorStop(1, `rgba(10, 12, 18, ${alpha})`);

  ctx.fillStyle = grad;
  ctx.strokeStyle = borderColor || `rgba(255, 255, 255, ${alpha * 0.14})`;
  ctx.lineWidth = 1;

  ctx.save();
  if (borderColor) {
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 6;
  }
  drawChamferedRect(ctx, x, y, w, h, chamfer);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Draws a centered text button with disciplined tactical DOOM styling (Crimson CTA / Amber Hovers). */
function drawButton(text, cx, cy, action, w = 200, h = 44, customColor = null, chamfer = 8) {
  const ctx = state.ctx;
  const x = cx - w / 2;
  const y = cy - h / 2;

  // Check if button is hovered
  const isHovered = _hoveredButton &&
    _mouseX >= x && _mouseX <= x + w &&
    _mouseY >= y && _mouseY <= y + h;

  const isPrimary = text.includes('START') || text.includes('LAUNCH') || text.includes('LOCK IN') || text.includes('GAUNTLET');
  
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  
  if (isPrimary) {
    if (isHovered) {
      grad.addColorStop(0, '#ef4444');
      grad.addColorStop(0.5, '#dc2626');
      grad.addColorStop(1, '#991b1b');
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(220, 38, 38, 0.6)';
      ctx.shadowBlur = 12;
    } else {
      grad.addColorStop(0, '#dc2626');
      grad.addColorStop(0.5, '#b91c1c');
      grad.addColorStop(1, '#7f1d1d');
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(220, 38, 38, 0.3)';
      ctx.shadowBlur = 6;
    }
  } else if (customColor) {
    if (isHovered) {
      grad.addColorStop(0, 'rgba(40, 48, 66, 0.98)');
      grad.addColorStop(1, 'rgba(20, 24, 34, 0.98)');
      ctx.strokeStyle = customColor;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = customColor;
      ctx.shadowBlur = 8;
    } else {
      grad.addColorStop(0, 'rgba(24, 30, 42, 0.9)');
      grad.addColorStop(1, 'rgba(14, 18, 26, 0.9)');
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
    }
  } else {
    if (isHovered) {
      grad.addColorStop(0, 'rgba(36, 44, 62, 0.98)');
      grad.addColorStop(0.5, 'rgba(26, 32, 46, 0.98)');
      grad.addColorStop(1, 'rgba(18, 22, 32, 0.98)');
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(245, 158, 11, 0.35)';
      ctx.shadowBlur = 8;
    } else {
      grad.addColorStop(0, 'rgba(22, 27, 38, 0.88)');
      grad.addColorStop(0.5, 'rgba(16, 20, 28, 0.88)');
      grad.addColorStop(1, 'rgba(12, 15, 22, 0.88)');
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
    }
  }

  ctx.fillStyle = grad;
  drawChamferedRect(ctx, x, y, w, h, chamfer);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Button text
  ctx.fillStyle = isHovered ? '#ffffff' : (isPrimary ? '#ffffff' : '#cbd5e1');
  ctx.font = 'bold 13.5px "Rajdhani", "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (isHovered) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1.02, 1.02);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  } else {
    ctx.fillText(text, cx, cy);
  }

  const transform = ctx.getTransform();
  const corners = [
    { x, y },
    { x: x + w, y },
    { x, y: y + h },
    { x: x + w, y: y + h },
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

function drawPremiumStatBar(ctx, x, y, width, label, valueStr, percentage, color = '#f59e0b') {
  // Label
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 10.5px "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, x, y - 4);
  
  // Value text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px "Rajdhani", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(valueStr, x + width, y - 4);

  // Background bar
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, x, y, width, 5, 2);
  ctx.fill();
  ctx.stroke();

  // Foreground bar
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  const fillW = Math.max(4, Math.min(width, width * percentage));
  drawChamferedRect(ctx, x, y, fillW, 5, 2);
  ctx.fill();
  ctx.restore();
}

function drawStatBar(ctx, label, value, maxValue, x, y, width, color = '#f59e0b') {
  // Metric Label on left
  ctx.fillStyle = '#8899aa';
  ctx.font = 'bold 10px "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + 4);

  const labelW = 28;
  const valueW = width > 120 ? 32 : 0;
  const barX = x + labelW;
  const barW = width - labelW - valueW - 4;
  const barH = 5;

  // Background Track
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, barX, y + 1.5, barW, barH, 2);
  ctx.fill();
  ctx.stroke();

  // Filled Gauge
  const fillW = Math.min(barW, Math.max(3, (value / maxValue) * barW));
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  drawChamferedRect(ctx, barX, y + 1.5, fillW, barH, 2);
  ctx.fill();
  ctx.restore();

  // Metric Value on right
  if (valueW > 0) {
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 10px "Rajdhani", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(typeof value === 'number' ? value : value, x + width, y + 4);
  }
}

export { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar };
