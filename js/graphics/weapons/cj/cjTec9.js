// ─────────────────────────────────────────────
// CJ TEC-9 Graphics
// ─────────────────────────────────────────────

import { getHandSize } from '../../../core/config.js';
import { state } from '../../../core/state.js';
import { isDarkMode } from './cjShared.js';

export function drawCjPixelTec9(ctx, x = 0, y = 0, scale = 1.0, recoil = 0, flashTimer = 0) {
  ctx.save();
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const recoilOff = snap(recoil * 0.9);
  ctx.translate(snap(x - recoilOff), snap(y));
  ctx.scale(scale, scale);

  // 1. Long 32-Round Straight Steel Box Magazine
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(5, 5, 7, 30);
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(6, 6, 5, 28);
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(5, 33, 7, 2);

  // 2. Lower Receiver & Ergonomic Grip
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-8, 3, 11, 16);
  ctx.fillStyle = '#181B22'; // Black polymer frame
  ctx.fillRect(-7, 4, 9, 14);
  // Grip texture
  ctx.fillStyle = '#0F1116';
  ctx.fillRect(-6, 6, 7, 2);
  ctx.fillRect(-6, 10, 7, 2);
  ctx.fillRect(-6, 14, 7, 2);

  // Trigger Guard
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(2, 6, 5, 8);

  // 3. Tubular Upper Receiver & Perforated Heat Shroud
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-14, -6, 42, 11);
  ctx.fillStyle = '#334155'; // Parkerized steel finish
  ctx.fillRect(-13, -5, 40, 9);
  ctx.fillStyle = '#475569'; // Cylindrical highlight
  ctx.fillRect(-12, -4, 38, 2);

  // Perforated Barrel Shroud Cooling Holes (Discrete pixel dots)
  ctx.fillStyle = '#0E0F14';
  for (let hX = 14; hX <= 24; hX += 4) {
    ctx.fillRect(hX, -4, 2, 2);
    ctx.fillRect(hX + 2, -1, 2, 2);
    ctx.fillRect(hX, 2, 2, 2);
  }

  // Ejection Port
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-2, -3, 8, 4);
  ctx.fillStyle = '#D97706';
  ctx.fillRect(-1, -2, 6, 2);

  // 4. Threaded Barrel Extension Tip
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(27, -4, 8, 7);
  ctx.fillStyle = '#475569';
  ctx.fillRect(28, -3, 6, 5);
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(33, -2, 2, 3);

  // Front & Rear Sights
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(26, -8, 3, 3);
  ctx.fillRect(-13, -8, 3, 3);

  // 5. Muzzle Flash
  if (flashTimer > 0) {
    drawCjPixelMuzzleFlash(ctx, 36, -0.5, 1.25);
  }

  ctx.restore();
}

/**
 * Draws sharp, multi-petal starburst muzzle flash on Tec-9
 */
export function drawCjTec9MuzzleFlash(ctx, x, y, scale = 1.0) {
  if (_isDarkMode()) {
    drawCjPixelMuzzleFlash(ctx, x, y, scale * 1.2);
    return;
  }

  ctx.save();
  ctx.translate(x, y);

  const burstSize = 22 * scale;

  // 1. Fiery Orange/Amber Outer Starburst Spikes
  ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
  ctx.beginPath();
  ctx.moveTo(burstSize, 0);
  ctx.lineTo(burstSize * 0.38, -burstSize * 0.35);
  ctx.lineTo(burstSize * 0.15, -burstSize * 0.85);
  ctx.lineTo(-burstSize * 0.22, -burstSize * 0.38);
  ctx.lineTo(-burstSize * 0.55, 0);
  ctx.lineTo(-burstSize * 0.22, burstSize * 0.38);
  ctx.lineTo(burstSize * 0.15, burstSize * 0.85);
  ctx.lineTo(burstSize * 0.38, burstSize * 0.35);
  ctx.closePath();
  ctx.fill();

  // 2. Bright Golden Yellow Intermediate Core
  ctx.fillStyle = '#FBBF24';
  ctx.beginPath();
  ctx.moveTo(burstSize * 0.72, 0);
  ctx.lineTo(burstSize * 0.22, -burstSize * 0.52);
  ctx.lineTo(-burstSize * 0.35, 0);
  ctx.lineTo(burstSize * 0.22, burstSize * 0.52);
  ctx.closePath();
  ctx.fill();

  // 3. White-Hot Inner Core Diamond
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(burstSize * 0.48, 0);
  ctx.lineTo(0, -burstSize * 0.30);
  ctx.lineTo(-burstSize * 0.22, 0);
  ctx.lineTo(0, burstSize * 0.30);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

let _cachedTec9MagGrad = null;
let _cachedTec9FrameGrad = null;
let _cachedTec9TubeGrad = null;
let _cachedTec9ShroudGrad = null;
let _cachedTec9CapGrad = null;

function _initTec9Gradients(ctx) {
  if (_cachedTec9MagGrad) return;
  _cachedTec9MagGrad = ctx.createLinearGradient(-3, 0, 3, 0);
  _cachedTec9MagGrad.addColorStop(0.0, '#161B22');
  _cachedTec9MagGrad.addColorStop(0.35, '#2D3644');
  _cachedTec9MagGrad.addColorStop(0.70, '#161B22');
  _cachedTec9MagGrad.addColorStop(1.0, '#0C0E12');

  _cachedTec9FrameGrad = ctx.createLinearGradient(-16, 0, 14, 0);
  _cachedTec9FrameGrad.addColorStop(0.0, '#151820');
  _cachedTec9FrameGrad.addColorStop(0.35, '#242933');
  _cachedTec9FrameGrad.addColorStop(0.70, '#151820');
  _cachedTec9FrameGrad.addColorStop(1.0, '#0A0C0F');

  _cachedTec9TubeGrad = ctx.createLinearGradient(0, -8.8, 0, -0.6);
  _cachedTec9TubeGrad.addColorStop(0.00, '#252C36');
  _cachedTec9TubeGrad.addColorStop(0.18, '#4A5769');
  _cachedTec9TubeGrad.addColorStop(0.40, '#64748B');
  _cachedTec9TubeGrad.addColorStop(0.70, '#384454');
  _cachedTec9TubeGrad.addColorStop(1.00, '#1B2027');

  _cachedTec9ShroudGrad = ctx.createLinearGradient(0, -8.2, 0, -1.0);
  _cachedTec9ShroudGrad.addColorStop(0.00, '#11141A');
  _cachedTec9ShroudGrad.addColorStop(0.20, '#28303C');
  _cachedTec9ShroudGrad.addColorStop(0.50, '#181D24');
  _cachedTec9ShroudGrad.addColorStop(0.85, '#0E1015');
  _cachedTec9ShroudGrad.addColorStop(1.00, '#060709');

  _cachedTec9CapGrad = ctx.createLinearGradient(0, -6.8, 0, -2.0);
  _cachedTec9CapGrad.addColorStop(0, '#2E3744');
  _cachedTec9CapGrad.addColorStop(0.3, '#526075');
  _cachedTec9CapGrad.addColorStop(1, '#1B2027');
}

/**
 * Draws Authentic GTA: San Andreas TEC-9 Submachine Gun (Intratec TEC-9)
 * Faithful to GTA SA Urban-Gang Aesthetic & Real Firearm Architecture:
 * - Receiver and Barrel Jacket: Matte gunmetal gray with a slightly worn, parkerized steel finish, stamped-metal weld lines
 * - Furniture: Molded dark charcoal / black polymer for the lower frame and grip
 * - Details: Contrasting black barrel shroud with distinctive cooling perforations (holes)
 * Rule 11 (Zero shadowBlur) & Rule 20 Compliant
 */
export function drawCjTec9(ctx, x = 0, y = 0, scale = 1.0, recoil = 0, flashTimer = 0, opts = {}) {
  _initTec9Gradients(ctx);

  ctx.save();
  const recoilOffset = recoil * 0.9;
  const recoilClimb = -recoil * 0.018;

  ctx.translate(x - recoilOffset, y);
  if (recoil > 0) {
    ctx.rotate(recoilClimb);
  }
  ctx.scale(scale, scale);

  // ── LAYER 1: LONG 32-ROUND STRAIGHT BOX MAGAZINE (STAMPED STEEL) ──
  const magX = 7.2;
  const magTopY = 6.0;
  const magW = 6.0;
  const magH = 32.0;

  // Stamped Steel Body Gradient (Cached)
  ctx.fillStyle = _cachedTec9MagGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(magX - magW * 0.5, magTopY, magW, magH, 0.8);
  ctx.fill();
  ctx.stroke();

  // Vertical Stamped Central Stiffener Flute down the magazine body
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(magX, magTopY + 2.0);
  ctx.lineTo(magX, magTopY + magH - 2.5);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(magX + 0.6, magTopY + 2.0);
  ctx.lineTo(magX + 0.6, magTopY + magH - 2.5);
  ctx.stroke();

  // Steel Magazine Baseplate / Floorplate at bottom
  ctx.fillStyle = '#262D38';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(magX - (magW + 1.6) * 0.5, magTopY + magH - 0.5, magW + 1.6, 2.6, 0.8);
  ctx.fill();
  ctx.stroke();

  // Floorplate retention button dimple
  ctx.fillStyle = '#0C0E12';
  ctx.fillRect(magX - 0.8, magTopY + magH + 0.6, 1.6, 0.9);

  // ── LAYER 2: MOLDED DARK CHARCOAL / BLACK POLYMER LOWER RECEIVER FRAME ──
  // A. Horizontal Receiver Rail Base (Bridge beneath tubular receiver)
  ctx.fillStyle = _cachedTec9FrameGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-16.0, -1.2, 28.0, 5.0, [1.0, 1.0, 0, 0]);
  ctx.fill();
  ctx.stroke();

  // B. Forward Magazine Well Housing
  ctx.fillStyle = _cachedTec9FrameGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(2.8, -1.2, 9.2, 8.5, [0, 0, 1.5, 1.5]);
  ctx.fill();
  ctx.stroke();

  // Magwell Lower Flared Bevel Mouth Lip
  ctx.fillStyle = '#1A1E26';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(2.2, 6.2, 10.4, 1.6, 0.6);
  ctx.fill();
  ctx.stroke();

  // Front Takedown Pivot Pin / Screw Head (Dark Steel)
  ctx.fillStyle = '#374151';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(4.6, 1.2, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Screw Slot
  ctx.fillStyle = '#09090B';
  ctx.fillRect(3.8, 0.8, 1.6, 0.8);

  // Subtle Manufacturer Stamping "INTRATEC"
  ctx.fillStyle = 'rgba(100, 116, 139, 0.40)';
  ctx.font = '700 2.2px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('INTRATEC', 4.0, 4.2);

  // Magazine Release Catch Lever (behind magwell inside trigger guard)
  ctx.fillStyle = '#262D38';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(2.6, 7.2, 1.8, 3.2, 0.6);
  ctx.fill();
  ctx.stroke();

  // C. Molded Integral Trigger Guard Loop (Clean Rectangular Loop)
  ctx.strokeStyle = '#0F1217';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(2.6, 6.5);
  ctx.lineTo(2.6, 13.5);
  ctx.lineTo(-4.5, 13.5);
  ctx.lineTo(-4.5, 6.5);
  ctx.stroke();

  // Inner Dark Trigger Guard Void
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.moveTo(1.8, 6.5);
  ctx.lineTo(1.8, 12.2);
  ctx.lineTo(-3.6, 12.2);
  ctx.lineTo(-3.6, 6.5);
  ctx.closePath();
  ctx.fill();

  // Polished Curved Steel Trigger Blade inside
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-0.2, 6.0);
  ctx.quadraticCurveTo(-1.8, 8.8, -1.0, 11.2);
  ctx.stroke();

  // D. Ergonomic Swept-Back Pistol Grip (Molded Dark Charcoal Polymer)
  ctx.save();
  ctx.fillStyle = _cachedTec9FrameGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;

  // Grip Body Polygon (Sleek angle, front finger swell, flared base heel)
  ctx.beginPath();
  ctx.moveTo(-4.5, 6.5);     // Top front junction to trigger guard
  ctx.lineTo(-4.8, 13.5);    // Front strap upper
  ctx.lineTo(-7.2, 23.5);    // Front strap lower
  ctx.lineTo(-9.8, 25.5);    // Front toe
  ctx.lineTo(-17.2, 24.0);   // Flared base heel
  ctx.lineTo(-14.8, 13.0);   // Backstrap palm swell
  ctx.lineTo(-11.5, 2.0);    // Beavertail under receiver
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Recessed Textured Diamond Checkering Panel with Strict Clipping
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-5.5, 13.5);
  ctx.lineTo(-7.2, 22.0);
  ctx.lineTo(-14.8, 21.0);
  ctx.lineTo(-13.0, 13.5);
  ctx.closePath();
  ctx.fillStyle = '#0A0C0F';
  ctx.fill();
  ctx.clip(); // STRICT CLIPPING: Texture lines will NEVER bleed outside this panel!

  // Checkering Grid Lines (Clean 45-degree cross-hatch)
  ctx.strokeStyle = '#1E242E';
  ctx.lineWidth = 0.6;
  for (let gy = 11.0; gy <= 25.0; gy += 1.8) {
    ctx.beginPath();
    ctx.moveTo(-16.0, gy);
    ctx.lineTo(-4.0, gy + 4.0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-16.0, gy + 4.0);
    ctx.lineTo(-4.0, gy);
    ctx.stroke();
  }
  ctx.restore();

  // Subtle Border around Checkering Panel
  ctx.strokeStyle = '#242933';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-5.5, 13.5);
  ctx.lineTo(-7.2, 22.0);
  ctx.lineTo(-14.8, 21.0);
  ctx.lineTo(-13.0, 13.5);
  ctx.closePath();
  ctx.stroke();

  // Molded Intratec Medallion Logo (in upper section of grip)
  const logoX = -10.2;
  const logoY = 8.5;
  ctx.fillStyle = '#0A0C0F';
  ctx.strokeStyle = '#2E3744';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(logoX, logoY, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Stylized Intratec "T" / Crosshair Mark
  ctx.strokeStyle = '#55647A';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(logoX, logoY, 1.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(logoX - 1.2, logoY - 0.5);
  ctx.lineTo(logoX + 1.2, logoY - 0.5);
  ctx.moveTo(logoX, logoY - 0.5);
  ctx.lineTo(logoX, logoY + 1.2);
  ctx.stroke();

  ctx.restore();

  // ── LAYER 3: UPPER WORN MATTE GUNMETAL GRAY PARKERIZED STEEL RECEIVER ──
  const recLeftX = -17.5;
  const recRightX = 12.5;
  const recTopY = -8.8;
  const recH = 8.2;

  // Stamped-Metal Tubular Receiver (Cached)
  ctx.fillStyle = _cachedTec9TubeGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(recLeftX, recTopY, recRightX - recLeftX, recH, [2.0, 0, 0, 1.5]);
  ctx.fill();
  ctx.stroke();

  // Visible Stamped-Metal Weld Seam Line along the tubular receiver
  ctx.strokeStyle = '#090B0E';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(recLeftX + 3.0, recTopY + 2.2);
  ctx.lineTo(recRightX - 1.0, recTopY + 2.2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'; // Industrial weld glint
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(recLeftX + 3.0, recTopY + 1.8);
  ctx.lineTo(recRightX - 1.0, recTopY + 1.8);
  ctx.stroke();

  // Rear Threaded Receiver End Cap with Knurling
  ctx.fillStyle = '#252C36';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(recLeftX - 1.5, recTopY - 0.5, 3.8, recH + 1.0, 1.2);
  ctx.fill();
  ctx.stroke();

  // Vertical Knurling Ribs on End Cap
  ctx.fillStyle = '#526075';
  ctx.fillRect(recLeftX - 0.8, recTopY + 1.0, 0.8, recH - 2.0);
  ctx.fillRect(recLeftX + 0.6, recTopY + 1.0, 0.8, recH - 2.0);

  // Rear Iron Notch Sight Post (Stamped Sheet Metal)
  ctx.fillStyle = '#161B22';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(recLeftX + 2.0, recTopY);
  ctx.lineTo(recLeftX + 2.0, recTopY - 3.2);
  ctx.lineTo(recLeftX + 5.5, recTopY - 3.2);
  ctx.lineTo(recLeftX + 5.5, recTopY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Top Charging Handle / Round Cocking Knob with Stem
  ctx.fillStyle = '#09090B';
  // Cocking Slide Slot in Receiver
  ctx.fillRect(-6.5, recTopY, 8.5, 1.8);

  const boltRecoilOffset = recoil * 1.5;
  const knobX = -3.2 - boltRecoilOffset;

  // Handle Stem (Dark Steel)
  ctx.fillStyle = '#2E3744';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.9;
  ctx.fillRect(knobX - 1.0, recTopY - 4.5, 2.0, 5.0);
  ctx.strokeRect(knobX - 1.0, recTopY - 4.5, 2.0, 5.0);

  // Knurled Round Knob Top (Worn Gunmetal Steel)
  ctx.fillStyle = '#526075';
  ctx.strokeStyle = '#1E242E';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(knobX, recTopY - 5.0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Specular Highlight Glint on Knob
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(knobX - 0.8, recTopY - 6.2, 1.4, 0.9);

  // Right-Side Ejection Port & Reciprocating Steel Bolt
  const ejectX = -2.0;
  const ejectW = 8.5;
  const ejectH = 4.0;
  const ejectY = recTopY + 2.2;

  // Stamped Ejection Port Cutout
  ctx.fillStyle = '#020617';
  ctx.strokeStyle = '#252C36';
  ctx.lineWidth = 0.8;
  ctx.fillRect(ejectX, ejectY, ejectW, ejectH);
  ctx.strokeRect(ejectX, ejectY, ejectW, ejectH);

  // Reciprocating Industrial Steel Bolt Face inside Ejection Port
  const boltX = ejectX - boltRecoilOffset;
  ctx.fillStyle = '#64748B';
  ctx.fillRect(Math.max(ejectX, boltX), ejectY + 0.4, Math.min(ejectW, ejectW + boltRecoilOffset), ejectH - 0.8);

  // Brass Extractor Rim Glint inside
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(Math.max(ejectX, boltX + 3.0), ejectY + 1.2, 2.4, 1.6);

  // ── LAYER 4: CONTRASTING MATTE BLACK PERFORATED BARREL SHROUD ──
  const shroudLeftX = 12.5;
  const shroudRightX = 40.5;
  const shroudTopY = -8.2;
  const shroudH = 7.2;

  // Shroud Collar Weld Ring & Intermediate Sight Boss
  ctx.fillStyle = '#161B22';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.fillRect(shroudLeftX - 0.5, shroudTopY - 0.5, 2.8, shroudH + 1.0);
  ctx.strokeRect(shroudLeftX - 0.5, shroudTopY - 0.5, 2.8, shroudH + 1.0);

  // Intermediate sling loop / sight collar boss
  ctx.fillStyle = '#2E3744';
  ctx.fillRect(shroudLeftX + 0.2, shroudTopY - 2.5, 1.8, 2.5);

  // Main Cylindrical Perforated Shroud Body (Contrasting Matte Black Oxide Finish - Cached)
  ctx.fillStyle = _cachedTec9ShroudGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(shroudLeftX, shroudTopY, shroudRightX - shroudLeftX, shroudH, 1.0);
  ctx.fill();
  ctx.stroke();

  // 3 STAGGERED ROWS OF CIRCULAR COOLING HOLES (Authentic TEC-9 Perforations)
  // Row 1 (Upper Row)
  const row1Xs = [17.0, 21.0, 25.0, 29.0, 33.0, 37.0];
  const row1Y = shroudTopY + 1.6;
  // Row 2 (Middle Row - Staggered)
  const row2Xs = [15.0, 19.0, 23.0, 27.0, 31.0, 35.0, 39.0];
  const row2Y = shroudTopY + shroudH * 0.5;
  // Row 3 (Lower Row)
  const row3Xs = [17.0, 21.0, 25.0, 29.0, 33.0, 37.0];
  const row3Y = shroudTopY + shroudH - 1.6;

  // Draw inner dark holes with cold steel barrel depth underneath
  const allHoles = [
    ...row1Xs.map(hx => ({ x: hx, y: row1Y, r: 1.15 })),
    ...row2Xs.map(hx => ({ x: hx, y: row2Y, r: 1.35 })),
    ...row3Xs.map(hx => ({ x: hx, y: row3Y, r: 1.15 }))
  ];

  for (let i = 0; i < allHoles.length; i++) {
    const h = allHoles[i];
    // Dark Hole Cavity
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
    ctx.fill();

    // Cold Steel Inner Barrel Glimpse
    ctx.fillStyle = '#3E4A5C';
    ctx.beginPath();
    ctx.arc(h.x + 0.2, h.y - 0.2, h.r * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Outer Bezel Rim Glint
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
  }

  // Front Blade Sight Post (on top of shroud near muzzle)
  ctx.fillStyle = '#161B22';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(37.5, shroudTopY);
  ctx.lineTo(37.5, shroudTopY - 3.5);
  ctx.lineTo(39.8, shroudTopY - 3.5);
  ctx.lineTo(39.8, shroudTopY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // White Dot on Front Sight Blade
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(38.0, shroudTopY - 3.0, 1.2, 1.2);

  // ── LAYER 5: STEPPED THREADED BARREL TIP & 9MM MUZZLE CROWN ──
  const barrelTipX = shroudRightX;
  const barrelTipW = 8.5;
  const barrelTipTopY = -6.2;
  const barrelTipH = 3.6;

  // Protruding Barrel Tube (Dark Worn Steel)
  ctx.fillStyle = '#252C36';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.fillRect(barrelTipX, barrelTipTopY, barrelTipW, barrelTipH);
  ctx.strokeRect(barrelTipX, barrelTipTopY, barrelTipW, barrelTipH);

  // Threaded Muzzle Cap / Protector Collar (Matte Dark Steel - Cached)
  const capX = barrelTipX + 3.5;
  const capW = 5.0;
  const capTopY = -6.8;
  const capH = 4.8;

  ctx.fillStyle = _cachedTec9CapGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(capX, capTopY, capW, capH, 0.8);
  ctx.fill();
  ctx.stroke();

  // Thread Knurling Rings on Cap
  ctx.fillStyle = '#11141A';
  ctx.fillRect(capX + 1.2, capTopY + 0.6, 0.8, capH - 1.2);
  ctx.fillRect(capX + 2.8, capTopY + 0.6, 0.8, capH - 1.2);

  // Dark 9mm Muzzle Bore Opening Crown
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.ellipse(barrelTipX + barrelTipW, 0, 0.7, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── LAYER 6: FLYING EJECTED BRASS CASING PARTICLE ──
  if (flashTimer > 0) {
    ctx.save();
    const caseProgress = (3 - flashTimer) / 3;
    const caseX = ejectX + 4.0 + caseProgress * 5.5;
    const caseY = ejectY - 4.0 - caseProgress * 6.5;
    const caseAngle = caseProgress * Math.PI * 1.8;

    ctx.translate(caseX, caseY);
    ctx.rotate(caseAngle);

    // 9mm brass casing
    ctx.fillStyle = '#F59E0B';
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(-2.0, -0.8, 4.0, 1.6, 0.4);
    ctx.fill();
    ctx.stroke();

    // Extractor groove & rim
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(-1.8, -0.5, 0.7, 1.0);
    ctx.restore();
  }

  // ── LAYER 7: REALISTIC STARBURST MUZZLE FLASH ──
  if (flashTimer > 0) {
    drawCjTec9MuzzleFlash(ctx, barrelTipX + barrelTipW + 2.0, -4.4, 1.35);
  }

  ctx.restore();
}

/**
 * Standalone Intratec TEC-9 renderer for Weapon Studio / UI screens & in-game Weapon Detail
 */

export function drawCjTec9Weapon(ctx, x = 0, y = 0, gunAngle = 0, r = 25, opts = {}) {
  ctx.save();
  let posX = x;
  let posY = y;
  let angle = 0;
  let scale = 1.0;

  if (typeof gunAngle === 'object') {
    opts = gunAngle;
    scale = opts.scale || 1.0;
  } else if (typeof gunAngle === 'number') {
    angle = gunAngle;
    if (typeof r === 'number') {
      posX = x + (r * 0.75);
      posY = y;
      scale = (opts && opts.scale) ? opts.scale : 1.35;
    } else if (typeof r === 'object') {
      opts = r;
      scale = opts.scale || 1.0;
    }
  }

  const recoil = (opts && opts.recoil) ? opts.recoil : 0;
  const flashTimer = (opts && opts.flashTimer) ? opts.flashTimer : 0;

  ctx.translate(posX, posY);
  ctx.rotate(angle);
  drawCjTec9(ctx, 0, 0, scale, recoil, flashTimer, opts);
  ctx.restore();
}
