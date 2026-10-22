import { state } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { drawChamferedRect } from './uiFramework.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SURVIVOR UPGRADE MODAL
 * Tactical 3-Card Level-Up Selection Interface for Circle Survivor Mode.
 * Features 90s tactical card aesthetics, hover feedback, keyboard shortcuts (1, 2, 3),
 * and audio confirmation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

let _hoveredCardIndex = -1;
let _cardBoxes = [];

export function setUpgradeHoveredCard(index) {
  _hoveredCardIndex = index;
}

export function handleUpgradeMouseMove(mx, my) {
  _hoveredCardIndex = -1;
  for (let i = 0; i < _cardBoxes.length; i++) {
    const box = _cardBoxes[i];
    if (mx >= box.x && mx <= box.x + box.w && my >= box.y && my <= box.y + box.h) {
      _hoveredCardIndex = i;
      if (state.canvas) state.canvas.style.cursor = 'pointer';
      return true;
    }
  }
  if (state.canvas && _cardBoxes.length > 0) state.canvas.style.cursor = 'default';
  return false;
}

export function handleUpgradeClick(mx, my, survivorSystem) {
  if (!survivorSystem || !survivorSystem.state || !survivorSystem.state.isPausedForUpgrade) {
    return false;
  }

  for (let i = 0; i < _cardBoxes.length; i++) {
    const box = _cardBoxes[i];
    if (mx >= box.x && mx <= box.x + box.w && my >= box.y && my <= box.y + box.h) {
      survivorSystem.selectUpgrade(i);
      return true;
    }
  }
  return false;
}

export function handleUpgradeKeyDown(e, survivorSystem) {
  if (!survivorSystem || !survivorSystem.state || !survivorSystem.state.isPausedForUpgrade) {
    return false;
  }

  if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
    survivorSystem.selectUpgrade(0);
    return true;
  } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
    survivorSystem.selectUpgrade(1);
    return true;
  } else if (e.key === '3' || e.code === 'Digit3' || e.code === 'Numpad3') {
    survivorSystem.selectUpgrade(2);
    return true;
  }
  return false;
}

/**
 * Draws the 3-Card Upgrade Modal overlay on top of the paused screen.
 */
export function drawSurvivorUpgradeModal(ctx, survivorState) {
  if (!survivorState || !survivorState.isPausedForUpgrade || !survivorState.upgradeChoices) {
    _cardBoxes = [];
    return;
  }

  const choices = survivorState.upgradeChoices;
  if (choices.length === 0) return;

  const canvasW = ctx.canvas.width;
  const canvasH = ctx.canvas.height;

  ctx.save();

  // 1. Full-screen dark translucent backdrop
  ctx.fillStyle = 'rgba(5, 7, 12, 0.82)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // 2. Animated header banner
  const centerX = canvasW / 2;
  const headerY = Math.max(50, canvasH * 0.16);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow halo
  ctx.shadowColor = '#00FF66';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#00FF66';
  ctx.font = 'bold 26px "Segoe UI", Roboto, "Trebuchet MS", sans-serif';
  ctx.fillText('⚡ LEVEL UP! CHOOSE AN UPGRADE', centerX, headerY);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '13px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Select a weapon or stat passive • Press [1], [2], or [3] on keyboard or click card', centerX, headerY + 28);

  // 3. Card dimensions and responsive positioning
  const numCards = choices.length;
  const cardW = Math.min(220, (canvasW - 80) / numCards - 20);
  const cardH = 260;
  const totalW = numCards * cardW + (numCards - 1) * 20;
  const startX = centerX - totalW / 2;
  const cardY = headerY + 60;

  _cardBoxes = [];

  for (let i = 0; i < numCards; i++) {
    const choice = choices[i];
    const x = startX + i * (cardW + 20);
    const y = cardY;
    const isHovered = (_hoveredCardIndex === i);

    _cardBoxes.push({ x, y, w: cardW, h: cardH, index: i });

    ctx.save();

    // Hover elevation
    const drawY = isHovered ? (y - 6) : y;

    // Card drop shadow
    ctx.fillStyle = isHovered ? 'rgba(0, 255, 102, 0.25)' : 'rgba(0, 0, 0, 0.5)';
    drawChamferedRect(ctx, x + 2, drawY + 4, cardW, cardH, 8);
    ctx.fill();

    // Card body background
    ctx.fillStyle = isHovered ? '#141E1C' : '#0E1317';
    ctx.strokeStyle = isHovered ? '#00FF66' : (choice.color || '#4A5568');
    ctx.lineWidth = isHovered ? 2.5 : 1.5;

    drawChamferedRect(ctx, x, drawY, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();

    // Inner subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, x + 3, drawY + 3, cardW - 6, cardH - 6, 6);
    ctx.stroke();

    // Card Header Pill (Shortcut Number)
    const pillW = 34;
    const pillH = 20;
    ctx.fillStyle = isHovered ? '#00FF66' : '#2D3748';
    drawChamferedRect(ctx, x + cardW / 2 - pillW / 2, drawY + 12, pillW, pillH, 4);
    ctx.fill();

    ctx.fillStyle = isHovered ? '#000000' : '#E2E8F0';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`[${i + 1}]`, x + cardW / 2, drawY + 22);

    // Card Icon
    ctx.font = '36px sans-serif';
    ctx.fillText(choice.icon || '⚡', x + cardW / 2, drawY + 65);

    // Card Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px "Segoe UI", Roboto, sans-serif';
    ctx.fillText(choice.name, x + cardW / 2, drawY + 105);

    // Category & Tier Badge
    const isNew = (choice.currentTier === 0);
    const badgeText = isNew ? '★ NEW WEAPON' : `Lv. ${choice.currentTier + 1}`;
    ctx.fillStyle = isNew ? '#00E5FF' : '#FFD700';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(badgeText, x + cardW / 2, drawY + 128);

    // Dividing separator line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(x + 16, drawY + 144);
    ctx.lineTo(x + cardW - 16, drawY + 144);
    ctx.stroke();

    // Description text (word wrapped)
    ctx.fillStyle = '#CBD5E0';
    ctx.font = '12px "Segoe UI", Roboto, sans-serif';
    _wrapText(ctx, choice.description, x + cardW / 2, drawY + 166, cardW - 24, 16);

    // Equip / Select Prompt Button
    const btnW = cardW - 32;
    const btnH = 28;
    const btnY = drawY + cardH - 38;

    ctx.fillStyle = isHovered ? '#00FF66' : 'rgba(255, 255, 255, 0.08)';
    drawChamferedRect(ctx, x + 16, btnY, btnW, btnH, 4);
    ctx.fill();

    ctx.fillStyle = isHovered ? '#000000' : '#A0AEC0';
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillText(isHovered ? 'SELECT [ENTER]' : 'SELECT', x + cardW / 2, btnY + btnH / 2);

    ctx.restore();
  }

  ctx.restore();
}

function _wrapText(ctx, text, x, startY, maxWidth, lineHeight) {
  if (!text) return;
  const words = text.split(' ');
  let line = '';
  let y = startY;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, y);
}
