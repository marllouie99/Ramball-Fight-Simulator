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
  state.canvas.style.cursor = found ? 'pointer' : 'default';
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


/** Draws a semi-transparent rounded rectangle panel with gradient and glow. */
function drawPanel(x, y, w, h, alpha = 0.8, r = 8) {
  const ctx = state.ctx;

  // Create gradient background
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, 'rgba(30, 30, 40, ' + alpha + ')');
  grad.addColorStop(0.5, 'rgba(20, 20, 30, ' + alpha + ')');
  grad.addColorStop(1, 'rgba(10, 10, 20, ' + alpha + ')');

  ctx.fillStyle = grad;
  ctx.strokeStyle = `rgba(100, 140, 255, ${alpha * 0.6})`;
  ctx.lineWidth = 2;

  // Outer glow effect
  ctx.shadowColor = 'rgba(100, 140, 255, 0.3)';
  ctx.shadowBlur = 8;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

/** Draws a centered text button with hover effects. */
function drawButton(text, cx, cy, action, w = 200, h = 44) {
  const ctx = state.ctx;
  const x = cx - w / 2;
  const y = cy - h / 2;

  // Check if button is hovered
  const isHovered = _hoveredButton &&
    _mouseX >= x && _mouseX <= x + w &&
    _mouseY >= y && _mouseY <= y + h;

  // Button background with gradient
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  if (isHovered) {
    grad.addColorStop(0, 'rgba(40, 60, 100, 0.95)');
    grad.addColorStop(0.5, 'rgba(30, 50, 90, 0.95)');
    grad.addColorStop(1, 'rgba(20, 40, 80, 0.95)');
    ctx.strokeStyle = 'rgba(120, 180, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(120, 180, 255, 0.5)';
    ctx.shadowBlur = 12;
  } else {
    grad.addColorStop(0, 'rgba(25, 35, 70, 0.9)');
    grad.addColorStop(0.5, 'rgba(20, 30, 60, 0.9)');
    grad.addColorStop(1, 'rgba(15, 25, 50, 0.9)');
    ctx.strokeStyle = 'rgba(100, 140, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(100, 140, 255, 0.2)';
    ctx.shadowBlur = 6;
  }

  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Button text with hover effect
  ctx.fillStyle = isHovered ? '#e0f0ff' : '#ffffff';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Slight scale effect on hover
  if (isHovered) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1.05, 1.05);
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
  const words = text.split(' ');
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

// ─────────────────────────────────────────────
// PREVIEW BALLS (Title Screen Background)
// ─────────────────────────────────────────────


function drawPremiumStatBar(ctx, x, y, width, label, valueStr, percentage, color) {
  // Label
  ctx.fillStyle = '#aaa';
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, x, y - 5);
  
  // Value text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(valueStr, x + width, y - 5);

  // Background bar
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.roundRect(x, y, width, 6, 3);
  ctx.fill();

  // Foreground bar (glow)
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(6, width * percentage), 6, 3);
  ctx.fill();
  ctx.shadowBlur = 0;
}


function drawStatBar(ctx, label, value, maxValue, x, y, width, color) {
  ctx.fillStyle = '#888';
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, x, y);

  const barX = x + 28;
  const barW = width - 28;
  const barH = 7;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.roundRect(barX, y + 2, barW, barH, 3);
  ctx.fill();

  const fillW = Math.min(barW, Math.max(4, (value / maxValue) * barW));
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(barX, y + 2, fillW, barH, 3);
  ctx.fill();
}

export { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar };
