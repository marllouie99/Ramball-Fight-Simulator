// ─────────────────────────────────────────────
// COUNTER-STRIKE STYLE TACTICAL KILL LOG (KILL FEED)
// Renders animated kill notifications in the top-right corner of the arena
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

/**
 * Pushes a new kill log event to state.killFeed
 */
export function pushKillFeed(attacker, victim, weaponName = '', isHeadshot = false) {
  if (!state.killFeed) state.killFeed = [];

  const attackerName = attacker ? (attacker.name || attacker._def?.name || 'ATTACKER').toUpperCase() : 'UNKNOWN';
  const attackerColor = attacker ? (attacker.color || attacker.themeColor || '#38bdf8') : '#38bdf8';

  const victimName = victim ? (victim.name || victim._def?.name || 'VICTIM').toUpperCase() : 'TARGET';
  const victimColor = victim ? (victim.color || victim.themeColor || '#f87171') : '#f87171';

  // Push new kill entry to top of feed
  state.killFeed.unshift({
    id: Date.now() + Math.random(),
    attackerName,
    attackerColor,
    victimName,
    victimColor,
    isHeadshot: Boolean(isHeadshot),
    timer: 260,       // Total lifetime (~4.3 seconds at 60fps)
    maxTimer: 260,
  });

  // Limit to maximum 5 concurrent kill log items
  if (state.killFeed.length > 5) {
    state.killFeed.pop();
  }
}

/**
 * Renders a unified crisp vector tactical bullet cartridge icon
 */
function drawTacticalBulletIcon(ctx, cx, cy, isHeadshot = false) {
  ctx.save();
  ctx.translate(cx, cy);

  const casingColor = isHeadshot ? '#ef4444' : '#f59e0b';
  const casingDark = isHeadshot ? '#991b1b' : '#b45309';
  const tipColor = isHeadshot ? '#fca5a5' : '#e2e8f0';

  // 1. Bullet Ogive / Conical Jacketed Tip (Pointed Right ->)
  ctx.fillStyle = tipColor;
  ctx.beginPath();
  ctx.moveTo(3, -2.4);
  ctx.quadraticCurveTo(8.0, -1.0, 9.5, 0);
  ctx.quadraticCurveTo(8.0, 1.0, 3, 2.4);
  ctx.closePath();
  ctx.fill();

  // 2. Cartridge Case Body (Brass/Steel)
  const grad = ctx.createLinearGradient(0, -3.0, 0, 3.0);
  grad.addColorStop(0, '#fde68a');
  grad.addColorStop(0.3, casingColor);
  grad.addColorStop(1, casingDark);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-6, -3.0);
  ctx.lineTo(1, -3.0);
  ctx.lineTo(3, -2.4);
  ctx.lineTo(3, 2.4);
  ctx.lineTo(1, 3.0);
  ctx.lineTo(-6, 3.0);
  ctx.closePath();
  ctx.fill();

  // 3. Extractor Groove Cutout
  ctx.fillStyle = '#0b0f19';
  ctx.fillRect(-7.2, -2.0, 1.2, 4.0);

  // 4. Extractor Rim
  ctx.fillStyle = casingColor;
  ctx.fillRect(-8.8, -3.0, 1.6, 6.0);

  // 5. Specular Sheen Highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.70)';
  ctx.fillRect(-5.5, -2.0, 7.5, 0.9);

  ctx.restore();
}

/**
 * Renders Counter-Strike style kill feed in top-right arena corner
 */
export function drawKillFeed(ctx) {
  if (!state.killFeed || state.killFeed.length === 0) return;

  // Arena bounds anchor
  const arenaX = (state.arena && state.arena.x !== undefined) ? state.arena.x : 20;
  const arenaY = (state.arena && state.arena.y !== undefined) ? state.arena.y : 65;
  const arenaW = (state.arena && state.arena.width !== undefined) ? state.arena.width : (state.canvas.width - 40);

  const rightMarginX = arenaX + arenaW - 10;
  let currentY = arenaY + 12;
  const cardH = 22;
  const gap = 5;

  ctx.save();

  for (let i = state.killFeed.length - 1; i >= 0; i--) {
    const item = state.killFeed[i];
    item.timer--;

    if (item.timer <= 0) {
      state.killFeed.splice(i, 1);
      continue;
    }

    // 1. Entrance & Exit Animation
    const age = item.maxTimer - item.timer;
    const enterProgress = Math.min(1.0, age / 10);
    const enterEase = 1 - Math.pow(1 - enterProgress, 3); // easeOutCubic
    const slideOffset = (1 - enterEase) * 50;

    const fadeAlpha = item.timer < 30 ? (item.timer / 30) : 1.0;
    const itemAlpha = Math.min(1.0, enterProgress) * fadeAlpha;

    ctx.save();
    ctx.globalAlpha = itemAlpha;

    // 2. Measure Text Widths
    ctx.font = '900 11.5px "Outfit", "Rajdhani", "Segoe UI", Arial, sans-serif';
    const attackerW = ctx.measureText(item.attackerName).width;
    const victimW = ctx.measureText(item.victimName).width;

    const bulletIconW = item.isHeadshot ? 30 : 20;
    const padding = 7;
    const spacing = 8;
    const cardW = padding * 2 + attackerW + bulletIconW + victimW + spacing * 2;
    const cardX = rightMarginX - cardW + slideOffset;
    const cardY = currentY;

    // 3. CS2 Glassmorphism Dark Card Background
    ctx.fillStyle = 'rgba(11, 15, 25, 0.90)';
    ctx.strokeStyle = item.isHeadshot ? 'rgba(239, 68, 68, 0.85)' : 'rgba(71, 85, 105, 0.65)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 3.5);
    ctx.fill();
    ctx.stroke();

    // 4. Attacker Team Color Left Accent Strip
    ctx.fillStyle = item.attackerColor;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, 3.0, cardH, [3.5, 0, 0, 3.5]);
    ctx.fill();

    // 5. Attacker Name
    let textCursorX = cardX + padding + 3;
    const textCenterY = cardY + cardH / 2;

    ctx.font = '900 11.5px "Outfit", "Rajdhani", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Black stroke shadow for readability
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.strokeText(item.attackerName, textCursorX, textCenterY);
    ctx.fillStyle = item.attackerColor;
    ctx.fillText(item.attackerName, textCursorX, textCenterY);

    textCursorX += attackerW + spacing;

    // 6. Center Tactical Bullet Icon (Just the bullet icon!)
    const bulletCenterX = textCursorX + (item.isHeadshot ? 10 : 9);
    drawTacticalBulletIcon(ctx, bulletCenterX, textCenterY, item.isHeadshot);

    if (item.isHeadshot) {
      ctx.font = '900 10px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fca5a5';
      ctx.fillText('💀', bulletCenterX + 11, textCenterY);
    }

    textCursorX += bulletIconW + spacing;

    // 7. Victim Name
    ctx.font = '900 11.5px "Outfit", "Rajdhani", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.strokeText(item.victimName, textCursorX, textCenterY);
    ctx.fillStyle = item.victimColor;
    ctx.fillText(item.victimName, textCursorX, textCenterY);

    ctx.restore();

    currentY += cardH + gap;
  }

  ctx.restore();
}
