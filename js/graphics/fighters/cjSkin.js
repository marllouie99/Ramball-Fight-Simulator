// ─────────────────────────────────────────────
// Carl "CJ" Johnson ("The Grove Street Cheatmaster") Fighter Skin
// Strictly adheres to:
// - Rule 19 (Upright Front POV, No Eyes/Mouth/Nose Standard)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state, isChampionScreenActive } from '../../core/state.js';
import { drawAuthenticBrassKnucklesShape, drawCjMicroUzi } from '../weapons/cjWeaponGraphics.js';

let _cjImage = null;
let _cjImageLoading = false;
let _cachedSkinGrad = null;
let _cachedSkinGradR = 0;

function _getSkinGrad(ctx, r) {
  if (!_cachedSkinGrad || _cachedSkinGradR !== r) {
    _cachedSkinGradR = r;
    _cachedSkinGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
    _cachedSkinGrad.addColorStop(0, 'rgba(255, 235, 210, 0.25)');
    _cachedSkinGrad.addColorStop(0.65, 'rgba(160, 95, 60, 0.18)');
    _cachedSkinGrad.addColorStop(1, 'rgba(60, 30, 15, 0.40)');
  }
  return _cachedSkinGrad;
}

/**
 * Draws CJ's hand equipped with authentic vintage cast-brass knuckles or gripping Micro-Uzi
 * Rule 20 compliant.
 */
function _drawCjHand(ctx, x, y, radius, skinColor, punchProgress = 0, isHoldingGun = false) {
  ctx.save();
  ctx.translate(x, y);

  // 1. Black Wrist Sweatband / Watch
  ctx.fillStyle = '#18181B';
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-radius * 1.05, -radius * 0.65, radius * 0.55, radius * 1.30, 2);
  ctx.fill();
  ctx.stroke();

  // 2. Fist Base (Natural Warm Brown Skin Tone)
  ctx.fillStyle = skinColor;
  ctx.strokeStyle = '#3E2114';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(-radius * 0.15, 0, radius * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (!isHoldingGun) {
    // Clenched Fingers passing through the brass knuckle holes
    ctx.fillStyle = skinColor;
    const fingerHoles = [
      { x: 3.2 * 0.85, y: -7.2 * 0.85 },
      { x: 4.9 * 0.85, y: -2.3 * 0.85 },
      { x: 4.9 * 0.85, y:  2.3 * 0.85 },
      { x: 3.2 * 0.85, y:  7.2 * 0.85 },
    ];
    for (const h of fingerHoles) {
      ctx.beginPath();
      ctx.arc(h.x, h.y, radius * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }

    // Authentic Cast-Brass Knuckle Overlay
    drawAuthenticBrassKnucklesShape(ctx, (radius / 7.5) * 1.05, { showFingers: false });
  }

  ctx.restore();
}

/**
 * Draws CJ's 1:1 Authentic GTA San Andreas DARPA Jetpack (ROCKETMAN)
 * Correctly oriented along CJ's body axes:
 * - Mounted firmly on CJ's back (-X)
 * - Top Manifold & Capsule Dome Caps at Upper Back (-Y / Head & Shoulder level)
 * - Twin Brushed Slate-Blue Cylinders extending vertically down the back
 * - Central Olive-Drab Avionics Box with Orange Bays & Hazard Chevrons
 * - Nozzles & Rocket Exhaust Flames blasting DOWNWARD (+Y direction towards ground/feet)
 * Rule 11 Compliant (Zero shadowBlur CPU filters)
 */
function _drawCjJetpack(ctx, r, isJetpackActive) {
  if (!isJetpackActive) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const time = now * 0.006;

  ctx.save();

  // Jetpack base anchor on CJ's back (-X direction)
  const jpX = -r * 0.76;
  const tankW = r * 0.32;
  const tankH = r * 0.88;
  const tankTopY = -r * 0.52;
  const tankBtmY = tankTopY + tankH;

  // ── 1. CENTRAL OLIVE-DRAB ENGINE & AVIONICS BOX (Mounted to back) ──
  const boxW = r * 0.42;
  const boxH = r * 0.65;
  const boxX = jpX - boxW * 0.35;
  const boxY = -r * 0.32;

  // Main Olive-Drab Metal Body
  const boxGrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
  boxGrad.addColorStop(0, '#364234');
  boxGrad.addColorStop(0.5, '#404D3E');
  boxGrad.addColorStop(1, '#283327');

  ctx.fillStyle = boxGrad;
  ctx.strokeStyle = '#151C14';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 2);
  ctx.fill();
  ctx.stroke();

  // Top Electronics Module Bay
  const bayW = boxW * 0.75;
  const bayH = boxH * 0.26;
  const bayX = boxX + (boxW - bayW) * 0.5;
  const topBayY = boxY + boxH * 0.06;

  ctx.fillStyle = '#1A2219';
  ctx.strokeStyle = '#2F3D2D';
  ctx.lineWidth = 1.0;
  ctx.fillRect(bayX, topBayY, bayW, bayH);
  ctx.strokeRect(bayX, topBayY, bayW, bayH);

  // Amber Indicator Display Bars
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(bayX + 2, topBayY + 2.5, bayW * 0.55, 1.8);
  ctx.fillRect(bayX + 2, topBayY + 6.0, bayW * 0.35, 1.8);
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(bayX + bayW - 4.5, topBayY + 2.5, 2.2, 2.2);

  // Bottom Electronics Module Bay
  const btmBayY = boxY + boxH * 0.66;
  ctx.fillStyle = '#1A2219';
  ctx.fillRect(bayX, btmBayY, bayW, bayH);
  ctx.strokeRect(bayX, btmBayY, bayW, bayH);

  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(bayX + 2, btmBayY + 2.5, bayW * 0.50, 1.8);
  ctx.fillRect(bayX + 2, btmBayY + 6.0, bayW * 0.30, 1.8);
  ctx.fillStyle = '#22C55E';
  ctx.fillRect(bayX + bayW - 4.5, btmBayY + 2.5, 2.2, 2.2);

  // Center Vertical Caution Hazard Stripe Panel
  const hazardW = boxW * 0.40;
  const hazardH = boxH * 0.26;
  const hazardX = boxX + (boxW - hazardW) * 0.5;
  const hazardY = boxY + (boxH - hazardH) * 0.5;

  ctx.save();
  ctx.beginPath();
  ctx.rect(hazardX, hazardY, hazardW, hazardH);
  ctx.clip();

  ctx.fillStyle = '#D97706';
  ctx.fillRect(hazardX, hazardY, hazardW, hazardH);

  ctx.fillStyle = '#18181B';
  for (let hx = -hazardW; hx <= hazardW * 2; hx += 3.0) {
    ctx.beginPath();
    ctx.moveTo(hazardX + hx, hazardY);
    ctx.lineTo(hazardX + hx - 3.5, hazardY + hazardH);
    ctx.lineTo(hazardX + hx - 1.5, hazardY + hazardH);
    ctx.lineTo(hazardX + hx + 2.0, hazardY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#18181B';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(hazardX, hazardY, hazardW, hazardH);

  // 4 Horizontal Copper Brackets
  ctx.fillStyle = '#D97706';
  ctx.strokeStyle = '#92400E';
  ctx.lineWidth = 0.8;
  const bktYs = [boxY + boxH * 0.36, boxY + boxH * 0.60];
  for (const bY of bktYs) {
    ctx.fillRect(boxX - 3.5, bY - 1.2, 5, 2.4);
    ctx.strokeRect(boxX - 3.5, bY - 1.2, 5, 2.4);
    ctx.fillRect(boxX + boxW - 1.5, bY - 1.2, 5, 2.4);
    ctx.strokeRect(boxX + boxW - 1.5, bY - 1.2, 5, 2.4);
  }

  // ── 2. DUAL BRUSHED SLATE-BLUE STEEL CYLINDERS (Standing vertically along Y) ──
  const tankXPositions = [jpX - tankW * 0.70, jpX + tankW * 0.30];

  for (let tIdx = 0; tIdx < tankXPositions.length; tIdx++) {
    const tX = tankXPositions[tIdx];

    // 3D Metallic Slate-Blue Cylinder Gradient
    const tankGrad = ctx.createLinearGradient(tX, 0, tX + tankW, 0);
    tankGrad.addColorStop(0, '#2C3744');
    tankGrad.addColorStop(0.25, '#536578');
    tankGrad.addColorStop(0.55, '#9CB1C6'); // Center specular light reflection
    tankGrad.addColorStop(0.85, '#435263');
    tankGrad.addColorStop(1, '#1E2732');

    ctx.fillStyle = tankGrad;
    ctx.strokeStyle = '#111822';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(tX, tankTopY, tankW, tankH, 6);
    ctx.fill();
    ctx.stroke();

    // Center Vertical Indented Shadow Groove
    const tankCenterX = tX + tankW * 0.5;
    ctx.strokeStyle = 'rgba(17, 24, 34, 0.65)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(tankCenterX, tankTopY + tankH * 0.18);
    ctx.lineTo(tankCenterX, tankBtmY - tankH * 0.18);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.40)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(tankCenterX + 0.8, tankTopY + tankH * 0.18);
    ctx.lineTo(tankCenterX + 0.8, tankBtmY - tankH * 0.18);
    ctx.stroke();

    // Dual Black Clamp Bands around each cylinder
    const bandYs = [tankTopY + tankH * 0.25, tankBtmY - tankH * 0.25];
    for (const bndY of bandYs) {
      ctx.fillStyle = '#18181B';
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 0.9;
      ctx.fillRect(tX - 1, bndY - 2.5, tankW + 2, 5);
      ctx.strokeRect(tX - 1, bndY - 2.5, tankW + 2, 5);

      // Silver Fastener Buckle
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(tankCenterX - 2, bndY - 1.5, 4, 3);
    }

    // Top Dome Valve Pin
    ctx.fillStyle = '#64748B';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 0.8;
    ctx.fillRect(tankCenterX - 1.5, tankTopY - 3.5, 3, 3.5);
    ctx.strokeRect(tankCenterX - 1.5, tankTopY - 3.5, 3, 3.5);
  }

  // ── 3. WIDE OVERHEAD ARCHING EXHAUST MANIFOLD (Top arch behind neck/shoulders) ──
  const archY = tankTopY - 3.5;
  const archLeftX = tankXPositions[0] - 3.5;
  const archRightX = tankXPositions[1] + tankW + 3.5;
  const archCenterX = (archLeftX + archRightX) * 0.5;

  const pipeGrad = ctx.createLinearGradient(archLeftX, 0, archRightX, 0);
  pipeGrad.addColorStop(0, '#18181B');
  pipeGrad.addColorStop(0.35, '#3F3F46');
  pipeGrad.addColorStop(0.70, '#27272A');
  pipeGrad.addColorStop(1, '#09090B');

  ctx.strokeStyle = pipeGrad;
  ctx.lineWidth = 5.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(archLeftX, tankTopY + 8);
  ctx.quadraticCurveTo(archLeftX, archY, archCenterX, archY);
  ctx.quadraticCurveTo(archRightX, archY, archRightX, tankTopY + 8);
  ctx.stroke();

  // ── 4. DOWNWARD-FACING THRUSTER NOZZLES & ROCKET EXHAUST FLAMES (+Y Direction) ──
  const nozzleXs = [tankXPositions[0] + tankW * 0.5, tankXPositions[1] + tankW * 0.5];

  for (let nIdx = 0; nIdx < nozzleXs.length; nIdx++) {
    const nX = nozzleXs[nIdx];
    const nY = tankBtmY;

    // Dark Titanium Exhaust Bell pointing DOWNWARD (+Y)
    const bellW = 8.5;
    const bellH = 7.5;
    const bellBtmY = nY + bellH;

    ctx.fillStyle = '#27272A';
    ctx.strokeStyle = '#09090B';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(nX - bellW * 0.35, nY);
    ctx.lineTo(nX - bellW * 0.55, bellBtmY);
    ctx.lineTo(nX + bellW * 0.55, bellBtmY);
    ctx.lineTo(nX + bellW * 0.35, nY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Chrome Flange Ring on nozzle
    ctx.fillStyle = '#71717A';
    ctx.fillRect(nX - bellW * 0.45, nY + bellH * 0.35, bellW * 0.90, 2.0);

    // ── 5. VIBRANT DOWNWARD ROCKET THRUST FLAMES (Shooting in +Y direction) ──
    const flameWobble = Math.sin(time * 16 + nIdx * 7) * 0.15 + Math.cos(time * 24 + nIdx * 11) * 0.10;
    const flameLen = (r * 1.60) * (1.0 + flameWobble);
    const flameSpread = (r * 0.36) * (1.0 + flameWobble * 0.5);

    // Stage 1: Outer Orange / Amber Jet Plume
    const outerFlameGrad = ctx.createLinearGradient(nX, bellBtmY, nX, bellBtmY + flameLen);
    outerFlameGrad.addColorStop(0, 'rgba(255, 170, 0, 0.98)');
    outerFlameGrad.addColorStop(0.35, 'rgba(249, 115, 22, 0.88)');
    outerFlameGrad.addColorStop(0.70, 'rgba(234, 88, 12, 0.50)');
    outerFlameGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');

    ctx.fillStyle = outerFlameGrad;
    ctx.beginPath();
    ctx.moveTo(nX - flameSpread * 0.50, bellBtmY);
    ctx.quadraticCurveTo(nX - flameSpread * 0.85, bellBtmY + flameLen * 0.45, nX, bellBtmY + flameLen);
    ctx.quadraticCurveTo(nX + flameSpread * 0.85, bellBtmY + flameLen * 0.45, nX + flameSpread * 0.50, bellBtmY);
    ctx.closePath();
    ctx.fill();

    // Stage 2: Bright Yellow Core Flame (1:1 with GTA San Andreas)
    const coreFlameGrad = ctx.createLinearGradient(nX, bellBtmY, nX, bellBtmY + flameLen * 0.65);
    coreFlameGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    coreFlameGrad.addColorStop(0.30, 'rgba(255, 230, 0, 0.95)');
    coreFlameGrad.addColorStop(0.75, 'rgba(245, 158, 11, 0.60)');
    coreFlameGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');

    ctx.fillStyle = coreFlameGrad;
    ctx.beginPath();
    ctx.moveTo(nX - flameSpread * 0.30, bellBtmY);
    ctx.quadraticCurveTo(nX - flameSpread * 0.45, bellBtmY + flameLen * 0.28, nX, bellBtmY + flameLen * 0.65);
    ctx.quadraticCurveTo(nX + flameSpread * 0.45, bellBtmY + flameLen * 0.28, nX + flameSpread * 0.30, bellBtmY);
    ctx.closePath();
    ctx.fill();

    // Stage 3: Intense White-Hot Throat Stream
    const throatGrad = ctx.createLinearGradient(nX, bellBtmY, nX, bellBtmY + flameLen * 0.30);
    throatGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    throatGrad.addColorStop(0.60, 'rgba(254, 240, 138, 0.90)');
    throatGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = throatGrad;
    ctx.beginPath();
    ctx.moveTo(nX - flameSpread * 0.15, bellBtmY);
    ctx.quadraticCurveTo(nX - flameSpread * 0.20, bellBtmY + flameLen * 0.14, nX, bellBtmY + flameLen * 0.30);
    ctx.quadraticCurveTo(nX + flameSpread * 0.20, bellBtmY + flameLen * 0.14, nX + flameSpread * 0.15, bellBtmY);
    ctx.closePath();
    ctx.fill();

    // Stage 4: Micro Sparks Trailing in the Downward Jet Wash
    for (let s = 0; s < 2; s++) {
      const sparkPhase = ((time * 32 + s * 19 + nIdx * 29) % 45);
      const sparkX = nX + Math.sin(sparkPhase * 1.8) * (flameSpread * 0.35);
      const sparkY = bellBtmY + flameLen * 0.25 + sparkPhase * 1.5;
      const sparkAlpha = Math.max(0, 1.0 - sparkPhase / 45);

      ctx.fillStyle = `rgba(255, 230, 0, ${sparkAlpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Draws BAGUVIX God-Mode & Cheat Code Matrix Aura
 * Rule 11 & Rule 16 Compliant: Zero shadowBlur, purely geometric & gradient based.
 */
function _drawCjCheatAura(ctx, r, isGodMode, isHesoyamActive, isRespectAura = false) {
  if (!isGodMode && !isHesoyamActive && !isRespectAura) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const time = now * 0.0035;

  ctx.save();

  // ── 1. Expanding Golden / Emerald God Mode Barrier Rings ──
  const primaryColor = (isGodMode || isRespectAura) ? 'rgba(245, 158, 11, ' : 'rgba(34, 197, 94, ';
  const ringCount = isGodMode ? 3 : 2;

  for (let i = 0; i < ringCount; i++) {
    const waveProgress = ((time * 0.45 + i * (1.0 / ringCount)) % 1.0);
    const waveR = r * (1.05 + waveProgress * 0.75);
    const waveAlpha = (1.0 - waveProgress) * 0.60;

    ctx.strokeStyle = `${primaryColor}${waveAlpha.toFixed(3)})`;
    ctx.lineWidth = 2.2 * (1.0 - waveProgress * 0.45);
    ctx.setLineDash([8, 6, 4, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, waveR, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // ── 2. Floating Cash Dollar Signs ($) & Binary Cheat Particles ──
  const particleCount = isGodMode ? 8 : 5;
  for (let p = 0; p < particleCount; p++) {
    const pAngle = time * 1.8 + (p * (Math.PI * 2 / particleCount));
    const pDist = r * (1.35 + Math.sin(time * 2.5 + p) * 0.25);
    const px = Math.cos(pAngle) * pDist;
    const py = Math.sin(pAngle) * pDist;

    ctx.fillStyle = isGodMode ? '#FDE047' : '#4ADE80';
    ctx.font = `bold ${Math.round(r * 0.38)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', px, py);
  }

  // ── 3. Subtle Radial Shield Glow Fills (Rule 11: Radial Gradient) ──
  const shieldGrad = ctx.createRadialGradient(0, 0, r * 0.80, 0, 0, r * 1.55);
  shieldGrad.addColorStop(0, `${primaryColor}0.10)`);
  shieldGrad.addColorStop(0.70, `${primaryColor}0.25)`);
  shieldGrad.addColorStop(1, `${primaryColor}0)`);
  ctx.fillStyle = shieldGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws High-Contrast Ground Shadow Silhouette & Thruster Scorch beneath CJ when flying
 * Gives the 3D optical depth illusion of levitation/floating in mid-air (similar to Trickster & Gojo)
 * Rule 11 Compliant (Zero shadowBlur CPU filters)
 */
function _drawCjGroundShadow(ctx, fighter, r, z, isJetpackActive) {
  if (!isJetpackActive && z <= 0) return;

  const floatZ = Math.max(14, z || 26);
  const levFactor = Math.min(1.0, floatZ / 40);
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const heatPulse = 0.70 + Math.sin(now * 0.016) * 0.30;

  ctx.save();
  // Anchor shadow strictly to the ground plane (with perspective ground offset)
  ctx.translate(fighter.x, fighter.y + 8);
  ctx.scale(1.0, 0.48); // Natural perspective ground ellipse

  // 1. Thruster Floor Scorch Burn Rings (Twin orange-yellow heat wash under nozzles)
  const angle = fighter.gunAngle || fighter.angle || 0;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const perpX = -sinA;
  const perpY = cosA;
  const backDist = r * 0.75;
  const nozzleSpread = 16;

  // Left & Right Nozzle floor heat spots
  [-1, 1].forEach(side => {
    const spotX = -cosA * backDist + perpX * (side * nozzleSpread);
    const spotY = -sinA * backDist + perpY * (side * nozzleSpread);
    const spotR = 24;

    const heatGlow = ctx.createRadialGradient(spotX, spotY, 2, spotX, spotY, spotR);
    heatGlow.addColorStop(0, `rgba(251, 191, 36, ${(0.65 * heatPulse * levFactor).toFixed(3)})`);
    heatGlow.addColorStop(0.35, `rgba(249, 115, 22, ${(0.45 * heatPulse * levFactor).toFixed(3)})`);
    heatGlow.addColorStop(0.75, `rgba(234, 88, 12, ${(0.20 * heatPulse * levFactor).toFixed(3)})`);
    heatGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');

    ctx.fillStyle = heatGlow;
    ctx.beginPath();
    ctx.arc(spotX, spotY, spotR, 0, Math.PI * 2);
    ctx.fill();
  });

  // 2. Soft Ambient Outer Ground Shadow
  const shadowR = r * (1.45 + levFactor * 0.20);
  const ambientShadow = ctx.createRadialGradient(0, 0, r * 0.30, 0, 0, shadowR);
  ambientShadow.addColorStop(0, `rgba(0, 0, 0, ${(0.78 * levFactor).toFixed(3)})`);
  ambientShadow.addColorStop(0.60, `rgba(0, 0, 0, ${(0.45 * levFactor).toFixed(3)})`);
  ambientShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = ambientShadow;
  ctx.beginPath();
  ctx.arc(0, 0, shadowR, 0, Math.PI * 2);
  ctx.fill();

  // 3. Crisp High-Contrast Inner Ground Silhouette Core (Body & Backpack)
  const coreR = r * (1.10 - levFactor * 0.15);
  ctx.fillStyle = `rgba(8, 10, 18, ${(0.88 * levFactor).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  // Backpack silhouette lobe extending backward
  const backLobeX = -cosA * (r * 0.45);
  const backLobeY = -sinA * (r * 0.45);
  ctx.arc(backLobeX, backLobeY, coreR * 0.65, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Main Skin Renderer for Carl "CJ" Johnson
 * Fully conforms to Rule 19, Rule 20, and Rule 11
 */
export function drawCjSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const z = fighter.z || 0;
  const isJetpackActive = Boolean(fighter.isJetpackActive || (fighter.jetpackTimer && fighter.jetpackTimer > 0) || z > 0);

  // ── LAYER -1: GROUND SHADOW SILHOUETTE (Drawn on ground plane before Z-elevation) ──
  _drawCjGroundShadow(ctx, fighter, r, z, isJetpackActive);

  ctx.save();
  ctx.translate(fighter.x, fighter.y - z);

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || fighter.angle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 2. Punch Animation Progress (Sinusoidal lead jab / overhand cross)
  const isMatchEnded = (typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd')) || Boolean(fighter._isWinnerReveal);
  const isPunching = !isMatchEnded && Boolean(fighter.punchAnimTimer && fighter.punchAnimTimer > 0);

  let rawProgress = 0;
  if (isPunching) {
    const maxT = fighter.punchMaxTime || 14;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
  }

  const easePunch = isPunching ? Math.sin(rawProgress * Math.PI) : 0;
  const lungeExtension = easePunch * (r * 1.35);

  // Hand Position Coordinates
  let frontX = r * 0.95, frontY = 0;
  let backX = 0, backY = 0;
  let hideFrontHand = false;
  let hideBackHand = true;

  if (isJetpackActive) {
    hideBackHand = false; // Both hands active during Jetpack Dual Uzi mode
    backX = r * 0.88;
    backY = -r * 0.38;
    frontX = r * 0.96;
    frontY = r * 0.38;
  } else if (isPunching) {
    frontX = r * 0.95 + lungeExtension * 1.40;
    frontY = Math.sin(rawProgress * Math.PI) * (r * 0.20);
  } else {
    frontX = r * 0.95;
    frontY = 0;
  }

  const isChampScreen = (typeof isChampionScreenActive === 'function' && isChampionScreenActive()) || Boolean(fighter._isWinnerReveal);
  const hideHandsAndWeapon = isChampScreen || (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  if (hideHandsAndWeapon || fighter.hideFrontHand) hideFrontHand = true;
  if (hideHandsAndWeapon || fighter.hideBackHand) hideBackHand = true;

  const handRadius = getHandSize(7.5);
  const skinColor = '#8D5538'; // Authentic warm brown skin tone

  // Status checks for Jetpack & Cheats
  const isGodMode = Boolean(fighter.isBaguvixActive || fighter.isGodModeActive);
  const isHesoyamActive = Boolean(fighter.hesoyamShield && fighter.hesoyamShield > 0);
  const isRespectAura = Boolean(
    fighter.isGroveStreetOg ||
    (fighter.respectAuraTimer && fighter.respectAuraTimer > 0) ||
    (fighter.respect && fighter.respect >= 50)
  );

  // ── LAYER 0: JETPACK & CHEAT AURA (Background Layer) ──
  _drawCjCheatAura(ctx, r, isGodMode, isHesoyamActive, isRespectAura);
  _drawCjJetpack(ctx, r, isJetpackActive);

  // ── LAYER 1: BACK HAND (Behind Body Layer — Left Micro-Uzi / Fist) ──
  if (!hideBackHand) {
    if (isJetpackActive) {
      const recoilB = fighter.uziRecoilBack || 0;
      const flashB = fighter.uziFlashTimerBack || 0;
      // 1. Draw hand base FIRST behind the gun
      _drawCjHand(ctx, backX - recoilB * 0.5 - 6, backY, handRadius * 0.92, skinColor, 0, true);
      // 2. Draw Micro-Uzi ON TOP of the hand (never overlayed by hand)
      drawCjMicroUzi(ctx, backX, backY, 1.05, recoilB, flashB);
    } else {
      _drawCjHand(ctx, backX, backY, handRadius * 0.92, skinColor, rawProgress, false);
    }
  }

  // ── LAYER 2: PROCEDURAL BODY RENDERING (RULE 19 UPRIGHT FRONT POV COMPLIANT) ──
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

    // A. Base Skin Fill (Rich Warm Brown)
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // B. 3D Body Shading (Rule 11: Zero shadowBlur - Radial Gradient)
    ctx.fillStyle = _getSkinGrad(ctx, r);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // C. White Ribbed Tank Top ("Wifebeater") on Torso (Adjusted to be bigger across chest & torso)
    ctx.fillStyle = '#F8FAFC'; // Crisp White
    ctx.beginPath();
    // Torso Arc (+Y hemisphere)
    ctx.arc(0, 0, r, Math.PI * 0.05, Math.PI * 0.95);
    // Higher scoop neckline curve covering upper chest (Y >= 0.05r)
    ctx.quadraticCurveTo(0, r * 0.05, r * Math.cos(Math.PI * 0.05), r * Math.sin(Math.PI * 0.05));
    ctx.closePath();
    ctx.fill();

    // Tank Top Ribbed Texture Stripes (subtle vertical lines across enlarged torso)
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.55)';
    ctx.lineWidth = 1.0;
    const ribXs = [-r * 0.55, -r * 0.40, -r * 0.25, -r * 0.10, 0, r * 0.10, r * 0.25, r * 0.40, r * 0.55];
    for (const rx of ribXs) {
      ctx.beginPath();
      ctx.moveTo(rx, r * 0.15);
      ctx.lineTo(rx, r * 0.55);
      ctx.stroke();
    }

    // Tank Top Scoop Neckline Hem Trim
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r * Math.cos(Math.PI * 0.95), r * Math.sin(Math.PI * 0.95));
    ctx.quadraticCurveTo(0, r * 0.05, r * Math.cos(Math.PI * 0.05), r * Math.sin(Math.PI * 0.05));
    ctx.stroke();

    // E. Dark Blue Denim Jeans Waistband & Leather Belt (+Y bottom hemisphere)
    // Dark Blue Denim Jeans (#1E3A8A / #1D4ED8)
    ctx.fillStyle = '#1E3A8A';
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI * 0.16, Math.PI * 0.84);
    ctx.closePath();
    ctx.fill();

    // Black Leather Belt
    ctx.fillStyle = '#18181B';
    ctx.fillRect(-r * 0.85, r * 0.54, r * 1.70, r * 0.15);

    // Silver Belt Buckle
    ctx.fillStyle = '#E2E8F0';
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1.1;
    ctx.strokeRect(-r * 0.16, r * 0.52, r * 0.32, r * 0.19);

    // Denim Center Seam Line
    ctx.strokeStyle = '#172554';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.69);
    ctx.lineTo(0, r);
    ctx.stroke();

    // G. Buzzcut Fade Hairstyle & Clean Hairline (-Y top hemisphere)
    ctx.fillStyle = '#1C120C'; // Deep Dark Espresso Black Hair
    ctx.beginPath();
    // Top head curve
    ctx.arc(0, 0, r, Math.PI * 1.15, Math.PI * 1.85);
    // Defined clean tape-up hairline
    ctx.quadraticCurveTo(0, -r * 0.42, r * Math.cos(Math.PI * 1.15), r * Math.sin(Math.PI * 1.15));
    ctx.closePath();
    ctx.fill();

    // Temple Fade / Gradient Hair Shadow
    const fadeGrad = ctx.createLinearGradient(0, -r * 0.85, 0, -r * 0.35);
    fadeGrad.addColorStop(0, '#1C120C');
    fadeGrad.addColorStop(0.70, 'rgba(40, 25, 18, 0.75)');
    fadeGrad.addColorStop(1, 'rgba(141, 85, 56, 0)');

    ctx.fillStyle = fadeGrad;
    ctx.beginPath();
    ctx.arc(0, -r * 0.38, r * 0.55, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();

    // Clean Razor Hairline Contour
    ctx.strokeStyle = '#0F0906';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(r * Math.cos(Math.PI * 1.18), r * Math.sin(Math.PI * 1.18));
    ctx.quadraticCurveTo(0, -r * 0.42, r * Math.cos(Math.PI * 1.82), r * Math.sin(Math.PI * 1.82));
    ctx.stroke();

    ctx.restore(); // restore body clip

  // ── 3. Outer Body Circle Outline ──
  ctx.strokeStyle = '#18181B';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // ── LAYER 3: FRONT HAND (Front Layer — On Top of Body Circle — Right Micro-Uzi / Fist) ──
  if (!hideFrontHand) {
    if (isJetpackActive) {
      const recoilF = fighter.uziRecoilFront || 0;
      const flashF = fighter.uziFlashTimerFront || 0;
      // 1. Draw hand base FIRST behind the gun
      _drawCjHand(ctx, frontX - recoilF * 0.5 - 6, frontY, handRadius, skinColor, 0, true);
      // 2. Draw Micro-Uzi ON TOP of the hand (never overlayed by hand)
      drawCjMicroUzi(ctx, frontX, frontY, 1.05, recoilF, flashF);
    } else {
      _drawCjHand(ctx, frontX, frontY, handRadius, skinColor, rawProgress, false);
    }
  }

  ctx.restore(); // restore local transform

  // ── LAYER 4: RETRO GTA CHEAT CODE TYPING HUD OVERLAY (World Upright) ──
  if (fighter.isTypingCheat && fighter.cheatCodeString) {
    _drawCjCheatTypingOverlay(ctx, fighter, r);
  }
}

/**
 * Renders simple, clean typing text directly above CJ's head as he spells out the cheat.
 */
function _drawCjCheatTypingOverlay(ctx, fighter, r) {
  const fullCode = fighter.cheatCodeString || '';
  const typedCount = Math.min(fullCode.length, fighter.cheatTypedChars || 0);
  const typedSub = fullCode.slice(0, typedCount);
  const isComplete = (typedCount >= fullCode.length);

  // Blinking vertical bar pipe cursor (|)
  const showCursor = !isComplete && (Math.floor(Date.now() / 160) % 2 === 0);
  const displayText = typedSub + (showCursor ? '|' : '');

  ctx.save();
  ctx.translate(fighter.x, fighter.y - r - 16);

  ctx.font = 'bold 14px "Arial Black", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Crisp black outline for clarity against any arena background
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.2;
  ctx.lineJoin = 'round';
  ctx.strokeText(displayText, 0, 0);

  // Simple clean fill: White while typing, Emerald Green when complete
  ctx.fillStyle = isComplete ? '#22C55E' : '#FFFFFF';
  ctx.fillText(displayText, 0, 0);

  ctx.restore();
}
