// ─────────────────────────────────────────────
// SPARTAN WEAPONS & COMBAT VFX GRAPHICS
// 1. Hoplon Round Bronze Shield (with Red Spartan Lambda Λ Crest)
// 2. Dory Thrusting Spear (Ashwood Shaft + Bronze Leaf Spearhead & Sauroter)
// 3. Javelin Throwing Spear Projectile & Supersonic Thrust VFX
// Rule 20 (Single-Source-of-Truth Hands), Rule 26 (Clean Concentric Shockwaves)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

let _spartanShieldImage = null;
let _spartanShieldLoading = false;

export function _getSpartanShieldImage() {
  if (_spartanShieldImage && _spartanShieldImage.complete && _spartanShieldImage.naturalWidth > 0) {
    return _spartanShieldImage;
  }
  if (!_spartanShieldLoading && typeof Image !== 'undefined') {
    _spartanShieldLoading = true;
    const img = new Image();
    img.onload = () => {
      _spartanShieldImage = img;
      _spartanShieldLoading = false;
    };
    img.onerror = () => {
      if (!img.src.includes('.jpg')) {
        img.src = 'Assets/model/spartan/spartan_shield.jpg?v=1';
      } else {
        _spartanShieldLoading = false;
      }
    };
    img.src = 'Assets/model/spartan/spartan_shield.png?v=1';
    _spartanShieldImage = img;
  }
  return _spartanShieldImage;
}

let _spartanSpearImage = null;
let _spartanSpearLoading = false;

export function _getSpartanSpearImage() {
  if (_spartanSpearImage && _spartanSpearImage.complete && _spartanSpearImage.naturalWidth > 0) {
    return _spartanSpearImage;
  }
  if (!_spartanSpearLoading && typeof Image !== 'undefined') {
    _spartanSpearLoading = true;
    const img = new Image();
    img.onload = () => {
      _spartanSpearImage = img;
      _spartanSpearLoading = false;
    };
    img.onerror = () => {
      if (!img.src.includes('.jpg')) {
        img.src = 'Assets/model/spartan/spartan_spear.jpg?v=1';
      } else {
        _spartanSpearLoading = false;
      }
    };
    img.src = 'Assets/model/spartan/spartan_spear.png?v=1';
    _spartanSpearImage = img;
  }
  return _spartanSpearImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getSpartanShieldImage();
  _getSpartanSpearImage();
}

/**
 * Draws the iconic round bronze Spartan Hoplon shield with red Lambda (Λ) crest.
 * Uses Assets/model/spartan/spartan_shield.png with procedural fallback.
 * Anchored to the left hand flank (-r * 0.82, +r * 0.38 in local space).
 */
export function drawSpartanHoplon(ctx, x, y, gunAngle, blockFlashTimer = 0, r = 25, shieldVisualOffset = 0) {
  ctx.save();
  ctx.translate(x, y);

  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  const shieldAngle = gunAngle + shieldVisualOffset;
  ctx.rotate(shieldAngle);
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // Position at the left hand flank
  ctx.translate(-(r + 8), 6);

  const shieldR = r * 0.72; // Round Hoplon radius (~18px)
  const isFlashing = blockFlashTimer > 0;

  // ── SPRITE MODEL: Assets/model/spartan/spartan_shield.png ──
  const shieldImg = _getSpartanShieldImage();
  const hasShieldImg = shieldImg && shieldImg.complete && shieldImg.naturalWidth > 0;

  if (hasShieldImg) {
    const shieldSize = r * 1.76;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(shieldImg, -shieldSize / 2, -shieldSize / 2, shieldSize, shieldSize);

    // Golden deflection highlight aura
    if (isFlashing) {
      ctx.beginPath();
      ctx.arc(0, 0, shieldSize * 0.48, 0, Math.PI * 2);
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = '#FEF08A';
      ctx.stroke();
    }
    ctx.restore();

    // Shield Hand drawn directly over grip (Rule 20 single source of truth)
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#C28B38';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#0E0F14';
    ctx.stroke();

    ctx.restore();
    return;
  }

  // ── PROCEDURAL FALLBACK ──
  // 1. Outer Bronze Rim & Bevel
  ctx.beginPath();
  ctx.arc(0, 0, shieldR, 0, Math.PI * 2);
  ctx.fillStyle = isFlashing ? '#FEF08A' : '#784E14';
  ctx.fill();
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = '#0E0F14';
  ctx.stroke();

  // 2. Inner Convex Bronze Face
  ctx.beginPath();
  ctx.arc(0, 0, shieldR - 2.5, 0, Math.PI * 2);
  const bronzeGrad = ctx.createLinearGradient(-shieldR, -shieldR, shieldR, shieldR);
  bronzeGrad.addColorStop(0, isFlashing ? '#FFFFFF' : '#D9A04A');
  bronzeGrad.addColorStop(0.5, isFlashing ? '#FEF08A' : '#B47B28');
  bronzeGrad.addColorStop(1, isFlashing ? '#FDE047' : '#714B15');
  ctx.fillStyle = bronzeGrad;
  ctx.fill();

  // 3. Bronze Rim Rivets
  const rivetCount = 8;
  for (let i = 0; i < rivetCount; i++) {
    const a = (i / rivetCount) * Math.PI * 2;
    const rx = Math.cos(a) * (shieldR - 1.5);
    const ry = Math.sin(a) * (shieldR - 1.5);
    ctx.fillStyle = '#452A08';
    ctx.fillRect(rx - 0.75, ry - 0.75, 1.5, 1.5);
  }

  // 4. Iconic Spartan Lambda (Λ) Crest
  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = '#991B1B'; // Spartan dark red shadow
  ctx.beginPath();
  ctx.moveTo(-shieldR * 0.38, shieldR * 0.35);
  ctx.lineTo(0, -shieldR * 0.42);
  ctx.lineTo(shieldR * 0.38, shieldR * 0.35);
  ctx.stroke();

  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#DC2626'; // Vibrant Spartan red core
  ctx.beginPath();
  ctx.moveTo(-shieldR * 0.38, shieldR * 0.35);
  ctx.lineTo(0, -shieldR * 0.42);
  ctx.lineTo(shieldR * 0.38, shieldR * 0.35);
  ctx.stroke();
  ctx.restore();

  // 5. Shield Hand drawn directly over grip (Rule 20 single source of truth)
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#C28B38';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#0E0F14';
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the Dory spear (spearhead, ashwood shaft, and bronze sauroter counter-spike).
 * Uses Assets/model/spartan/spartan_spear.png with procedural fallback.
 * Anchored to the right hand flank.
 */
export function drawSpartanSpear(ctx, x, y, spearAngle, r = 25, thrustLunge = 0, isThrusting = false) {
  ctx.save();
  ctx.translate(x, y);

  const facingLeft = Math.abs(spearAngle) > Math.PI / 2;
  ctx.rotate(spearAngle);
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // Spear offset: right side flank (+r * 0.82)
  const baseY = r * 0.32;
  ctx.translate(thrustLunge, baseY);

  // ── SPRITE MODEL: Assets/model/spartan/spartan_spear.png ──
  const spearImg = _getSpartanSpearImage();
  const hasSpearImg = spearImg && spearImg.complete && spearImg.naturalWidth > 0;

  if (hasSpearImg) {
    const spearW = 92;
    const spearH = 11.8;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Align red-wrapped grip center directly at (0, 0)
    ctx.drawImage(spearImg, -spearW * 0.508, -spearH / 2, spearW, spearH);
    ctx.restore();

    // Spear Hand drawn over grip at (0, 0) in spear space (Rule 20)
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#C28B38';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#0E0F14';
    ctx.stroke();

    ctx.restore();
    return;
  }

  // ── PROCEDURAL FALLBACK ──
  const spearLength = 80;
  const spearShaftW = 2.5;

  // 1. Ashwood Spear Shaft
  const shaftBack = -28;
  const shaftFront = 40;
  ctx.fillStyle = '#78350F'; // Dark ash wood
  ctx.fillRect(shaftBack, -spearShaftW / 2, shaftFront - shaftBack, spearShaftW);

  // Ashwood grain highlight
  ctx.fillStyle = '#A16207';
  ctx.fillRect(shaftBack, -spearShaftW / 2, shaftFront - shaftBack, 1.0);

  // 2. Bronze Sauroter (Butt Spike on the back end)
  ctx.fillStyle = '#B47B28';
  ctx.beginPath();
  ctx.moveTo(shaftBack, -2.5);
  ctx.lineTo(shaftBack - 9, 0);
  ctx.lineTo(shaftBack, 2.5);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1.0;
  ctx.strokeStyle = '#0E0F14';
  ctx.stroke();

  // 3. Bronze Leaf-Shaped Spearhead
  const tipX = shaftFront;
  const bladeLen = 18;
  const bladeW = 5.5;

  ctx.beginPath();
  ctx.moveTo(tipX, -bladeW * 0.4);
  ctx.lineTo(tipX + bladeLen * 0.45, -bladeW);
  ctx.lineTo(tipX + bladeLen, 0); // Kissaki tip
  ctx.lineTo(tipX + bladeLen * 0.45, bladeW);
  ctx.lineTo(tipX, bladeW * 0.4);
  ctx.closePath();

  const bladeGrad = ctx.createLinearGradient(tipX, -bladeW, tipX + bladeLen, bladeW);
  bladeGrad.addColorStop(0, '#B47B28');
  bladeGrad.addColorStop(0.5, '#F59E0B');
  bladeGrad.addColorStop(1, '#FFFFFF'); // Supersonic white piercing tip
  ctx.fillStyle = bladeGrad;
  ctx.fill();
  ctx.lineWidth = 1.0;
  ctx.strokeStyle = '#0E0F14';
  ctx.stroke();

  // Central spearhead ridge line
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(tipX, 0);
  ctx.lineTo(tipX + bladeLen - 1, 0);
  ctx.stroke();

  // 4. Spear Hand drawn over grip at (0, 0) in spear space (Rule 20)
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#C28B38';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#0E0F14';
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the airborne Javelin projectile hurled across the arena.
 * Uses Assets/model/spartan/spartan_spear.png with procedural fallback.
 */
export function drawSpartanJavelin(ctx, x, y, angle, length = 55) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const halfLen = length / 2;

  // Supersonic air compression trail behind the javelin
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-halfLen - 18, 0);
  ctx.lineTo(-halfLen, 0);
  ctx.stroke();

  // ── SPRITE MODEL: Assets/model/spartan/spartan_spear.png ──
  const spearImg = _getSpartanSpearImage();
  const hasSpearImg = spearImg && spearImg.complete && spearImg.naturalWidth > 0;

  if (hasSpearImg) {
    const javW = length * 1.25;
    const javH = javW * (370 / 2896);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spearImg, -javW * 0.508, -javH / 2, javW, javH);
    ctx.restore();

    ctx.restore();
    return;
  }

  // Ashwood shaft
  ctx.fillStyle = '#92400E';
  ctx.fillRect(-halfLen, -1.2, length, 2.4);

  // Bronze spearhead
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.moveTo(halfLen, -3.5);
  ctx.lineTo(halfLen + 14, 0);
  ctx.lineTo(halfLen, 3.5);
  ctx.closePath();
  ctx.fill();

  // White piercing tip glint
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(halfLen + 10, -1, 4, 2);

  // Bronze tail spike
  ctx.fillStyle = '#B47B28';
  ctx.beginPath();
  ctx.moveTo(-halfLen, -2);
  ctx.lineTo(-halfLen - 6, 0);
  ctx.lineTo(-halfLen, 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Linear supersonic thrust needle effect (Rule 26 & Rule 16 Manga needle standard).
 */
export function drawSpartanThrustVFX(ctx, x, y, angle, reach, progress) {
  if (progress <= 0 || progress >= 1.0) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const ip = progress;
  const alpha = Math.max(0, 1 - Math.pow(ip, 1.5));
  const currentReach = reach * Math.pow(ip, 0.6);

  // 4-point supersonic needle cone
  ctx.fillStyle = `rgba(251, 191, 36, ${0.85 * alpha})`;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(currentReach * 0.65, -4.5 * (1 - ip));
  ctx.lineTo(currentReach, 0);
  ctx.lineTo(currentReach * 0.65, 4.5 * (1 - ip));
  ctx.closePath();
  ctx.fill();

  // White core needle
  ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(currentReach * 0.85, -1.5 * (1 - ip));
  ctx.lineTo(currentReach, 0);
  ctx.lineTo(currentReach * 0.85, 1.5 * (1 - ip));
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
