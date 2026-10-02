// ─────────────────────────────────────────────
// Draedon Character Skin (Terraria: Calamity Mod)
// Upright Minimalist Faceless Cybernetic Pixel Art Model (Rule 19 & 20)
// Features: Holographic Visor Stripe, Obsidian Exo-Chassis, Floating Exo-Thrusters
// ─────────────────────────────────────────────

import { drawPixelHand } from '../draw.js';
import { state } from '../../core/state.js';

let _draedonBodyImg = null;
let _cachedDraedonCanvas = null;
let _cachedDraedonR = 0;

function _getDraedonBodyImage() {
  if (_draedonBodyImg && _draedonBodyImg.complete && _draedonBodyImg.naturalWidth > 0) return _draedonBodyImg;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = 'Assets/model/Exo-Disintegrator-PIXEL-SKIN.png';
    _draedonBodyImg = img;
  }
  return _draedonBodyImg;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getDraedonBodyImage();
}

/**
 * Offscreen discrete rasterization for Draedon cybernetic chassis.
 */
function _renderDraedonPixelBodyToCanvas(destCtx, r) {
  const P = 2.0;
  const size = Math.ceil(r * 2.8);
  const cx = size / 2;
  const cy = size / 2;

  // 1. Obsidian Titanium Armor & Circuitry Core
  for (let y = -r; y <= r; y += P) {
    for (let x = -r; x <= r; x += P) {
      const dist = Math.hypot(x, y);
      if (dist > r) continue;

      const normY = y / r;
      const normX = x / r;

      let color = '#0B0F19'; // Obsidian Exo-Alloy Base

      if (normY < -0.30) {
        // High-Tech Cybernetic Helm & Sensor Crest
        color = (dist > r * 0.88) ? '#030712' : (Math.abs(normX) < 0.25 ? '#06B6D4' : '#1E293B');
      } else if (normY >= -0.30 && normY <= 0.05) {
        // Holographic Visor Stripe (Strictly faceless — pure glowing cyan sensor array)
        if (normY >= -0.15 && normY <= -0.02 && Math.abs(normX) < 0.65) {
          color = (Math.abs(normX) < 0.3) ? '#FFFFFF' : '#06B6D4';
        } else {
          color = (dist > r * 0.90) ? '#030712' : '#0F172A';
        }
      } else if (normY > 0.05 && normY <= 0.55) {
        // High-Voltage Chest Core & Ares Conduit
        if (Math.abs(normX) < 0.25 && normY >= 0.15 && normY <= 0.40) {
          color = '#F59E0B'; // Amber Energy Core
        } else {
          color = (dist > r * 0.88) ? '#030712' : '#1E293B';
        }
      } else {
        // Armored Greaves & Plasma Exhaust Channels
        color = (dist > r * 0.90) ? '#030712' : (Math.abs(normX) < 0.2 ? '#06B6D4' : '#0F172A');
      }

      destCtx.fillStyle = color;
      destCtx.fillRect(Math.round(cx + x - P / 2), Math.round(cy + y - P / 2), P, P);
    }
  }

  // 2. Cyan Neon Contour Trims (Ink Outline)
  destCtx.strokeStyle = '#06B6D4';
  destCtx.lineWidth = 1.4;
  destCtx.beginPath();
  destCtx.arc(cx, cy, r, 0, Math.PI * 2);
  destCtx.stroke();
}

/**
 * Main draw call for Draedon fighter skin.
 */
export function drawDraedonSkin(ctx, fighter) {
  const r = fighter.r || 28;
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);

  // Invalidate offscreen cache if radius changes
  if (!_cachedDraedonCanvas || _cachedDraedonR !== r) {
    _cachedDraedonCanvas = document.createElement('canvas');
    const size = Math.ceil(r * 2.8);
    _cachedDraedonCanvas.width = size;
    _cachedDraedonCanvas.height = size;
    const offCtx = _cachedDraedonCanvas.getContext('2d');
    if (offCtx) {
      offCtx.imageSmoothingEnabled = false;
      _renderDraedonPixelBodyToCanvas(offCtx, r);
    }
    _cachedDraedonR = r;
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Floating Ares / Exo-Thruster Drones behind the body
  const hoverTimer = (typeof state !== 'undefined' && state.gameTime) ? state.gameTime : Date.now() * 0.05;
  const bob1 = Math.sin(hoverTimer * 0.08) * 3;
  const bob2 = Math.cos(hoverTimer * 0.08) * 3;

  ctx.save();
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = '#06B6D4';
  ctx.lineWidth = 1.2;

  // Left Drone Wing
  ctx.beginPath();
  ctx.rect(-r * 1.35, -r * 0.65 + bob1, r * 0.35, r * 0.65);
  ctx.fill();
  ctx.stroke();

  // Right Drone Wing
  ctx.beginPath();
  ctx.rect(r * 1.0, -r * 0.65 + bob2, r * 0.35, r * 0.65);
  ctx.fill();
  ctx.stroke();

  // Amber Core Glow on Drones
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(-r * 1.25, -r * 0.40 + bob1, 3, 3);
  ctx.fillRect(r * 1.15, -r * 0.40 + bob2, 3, 3);
  ctx.restore();

  // 2. Orient Upright towards player / aim direction (Rule 19)
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 3. Render Body Skin (PNG with Discrete Rasterization Fallback)
  const bodyImg = _getDraedonBodyImage();
  if (bodyImg && bodyImg.complete && bodyImg.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    const bodyW = r * 2.15;
    const bodyH = r * 2.3;
    ctx.drawImage(bodyImg, -bodyW / 2, -bodyH / 2, bodyW, bodyH);
  } else if (_cachedDraedonCanvas) {
    const size = _cachedDraedonCanvas.width;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(_cachedDraedonCanvas, -size / 2, -size / 2);
  }

  // 4. Symmetrical Lower-Flank Pixel Hands (Rule 20)
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  if (!shouldHideHands) {
    const handRadius = r * 0.30;
    const handOffset = r * 0.82;
    const handY = r * 0.38;

    // Left Hand (Exo-Plated Gauntlet)
    drawPixelHand(ctx, -handOffset, handY, handRadius, '#06B6D4', '#0B0F19');

    // Right Hand / Wielding Hand
    drawPixelHand(ctx, handOffset, handY, handRadius, '#06B6D4', '#0B0F19');
  }

  ctx.restore();
}
