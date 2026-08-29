// ─────────────────────────────────────────────
// Grove Street Greenwood Sedan & Homies Graphics
// Ultra-Realistic 1980s American Classic Lowrider Sedan & Tec-9 Gangsters
// Rule 11 (Zero shadowBlur) & Rule 19 Compliant
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { drawParalyzeEffect } from '../statusEffects.js';
import { drawCjTec9, drawCjPixelTec9 } from '../weapons/cjWeaponGraphics.js';

let _cachedHeadlightGrad = null;
let _cachedSmokeGrad = null;
let _cachedOilGrad = null;
let _cachedBodyGrad = null;
let _cachedBumpGrad = null;
let _cachedWindshieldGrad = null;
let _cachedRearGlassGrad = null;
let _cachedRoofGrad = null;
let _cachedRimGrad = null;
let _cachedWheelCanvas = null;

function _getHeadlightGrad(ctx, length) {
  _cachedHeadlightGrad = ctx.createLinearGradient(0, 0, length, 0);
  _cachedHeadlightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
  _cachedHeadlightGrad.addColorStop(0.3, 'rgba(253, 224, 71, 0.20)');
  _cachedHeadlightGrad.addColorStop(0.7, 'rgba(250, 204, 21, 0.06)');
  _cachedHeadlightGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');
  return _cachedHeadlightGrad;
}

function _initVehicleGradients(ctx, halfW, length, width, cabinX, cabinW, cabinH, roofH, rimH) {
  // Authentic 1980s Greenwood Sedan Pale Vintage Sage Green Paint
  _cachedBodyGrad = ctx.createLinearGradient(0, -36, 0, 36);
  _cachedBodyGrad.addColorStop(0, '#5A7862');    // Shadowed underside
  _cachedBodyGrad.addColorStop(0.12, '#76987E'); // Muted Pale Sage
  _cachedBodyGrad.addColorStop(0.35, '#95BA9D'); // Soft Pale Mint-Sage
  _cachedBodyGrad.addColorStop(0.5, '#B8DBC0');  // Glossy Pale Sunlit Highlight
  _cachedBodyGrad.addColorStop(0.72, '#95BA9D');
  _cachedBodyGrad.addColorStop(0.92, '#76987E');
  _cachedBodyGrad.addColorStop(1, '#5A7862');

  _cachedBumpGrad = ctx.createLinearGradient(0, -34, 0, 34);
  _cachedBumpGrad.addColorStop(0, '#CBD5E1');
  _cachedBumpGrad.addColorStop(0.5, '#FFFFFF');
  _cachedBumpGrad.addColorStop(1, '#94A3B8');

  _cachedWindshieldGrad = ctx.createLinearGradient(-10, -28, 20, 28);
  _cachedWindshieldGrad.addColorStop(0, '#0F172A');
  _cachedWindshieldGrad.addColorStop(0.4, '#334155');
  _cachedWindshieldGrad.addColorStop(0.7, '#1E293B');
  _cachedWindshieldGrad.addColorStop(1, '#020617');

  _cachedRearGlassGrad = ctx.createLinearGradient(-30, 0, 0, 0);
  _cachedRearGlassGrad.addColorStop(0, '#020617');
  _cachedRearGlassGrad.addColorStop(0.6, '#1E293B');
  _cachedRearGlassGrad.addColorStop(1, '#0F172A');

  // Landau Vinyl Top Roof (Soft Pale Olive-Sage Vinyl)
  _cachedRoofGrad = ctx.createLinearGradient(0, -24, 0, 24);
  _cachedRoofGrad.addColorStop(0, '#4E6554');   // Soft Muted Vinyl Edge
  _cachedRoofGrad.addColorStop(0.3, '#698470');
  _cachedRoofGrad.addColorStop(0.5, '#87A58E');  // Pale Vinyl Crown Highlight
  _cachedRoofGrad.addColorStop(0.7, '#698470');
  _cachedRoofGrad.addColorStop(1, '#4E6554');

  _cachedRimGrad = ctx.createLinearGradient(0, -5, 0, 5);
  _cachedRimGrad.addColorStop(0, '#E2E8F0');
  _cachedRimGrad.addColorStop(0.5, '#FFFFFF');
  _cachedRimGrad.addColorStop(1, '#94A3B8');

  _cachedSmokeGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
  _cachedSmokeGrad.addColorStop(0, 'rgba(245, 248, 255, 0.65)');
  _cachedSmokeGrad.addColorStop(0.65, 'rgba(215, 222, 232, 0.35)');
  _cachedSmokeGrad.addColorStop(1, 'rgba(180, 190, 205, 0)');

  _cachedOilGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 55);
  _cachedOilGrad.addColorStop(0, 'rgba(8, 8, 12, 0.85)');
  _cachedOilGrad.addColorStop(0.6, 'rgba(18, 20, 24, 0.75)');
  _cachedOilGrad.addColorStop(0.88, 'rgba(30, 38, 28, 0.35)');
  _cachedOilGrad.addColorStop(1, 'rgba(6, 6, 8, 0)');
}

/**
 * Draws the illuminated golden-white quad headlight beams projecting onto the asphalt
 */
export function drawCarHeadlights(ctx, carX, carY, carAngle, carLength = 152, carWidth = 72) {
  ctx.save();
  ctx.translate(Math.round(carX), Math.round(carY));
  ctx.rotate(carAngle);

  const frontX = Math.round(carLength * 0.5 + 2);
  const beamLength = 240;
  const beamSpread = 64;
  const lightYs = [-carWidth * 0.32, carWidth * 0.32];

  for (const ly of lightYs) {
    ctx.save();
    ctx.translate(frontX, Math.round(ly));

    // Forward illumination cone
    ctx.fillStyle = _getHeadlightGrad(ctx, beamLength);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(beamLength, -beamSpread);
    ctx.lineTo(beamLength, beamSpread);
    ctx.lineTo(0, 7);
    ctx.closePath();
    ctx.fill();

    // Stepped pixel bulb flares
    ctx.fillStyle = '#0E0F14';
    ctx.fillRect(1, -6, 12, 12);
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(2, -4, 8, 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(3, -2, 4, 4);

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws tire rubber skid marks on the arena floor (High-performance optimized single-stroke pass)
 */
export function drawCarSkidMarks(ctx, skidTracks) {
  if (!skidTracks || skidTracks.length === 0) return;

  ctx.save();
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = '#0C0C10';

  for (let i = 0; i < skidTracks.length; i++) {
    const track = skidTracks[i];
    if (!track.points || track.points.length < 2 || track.alpha <= 0.02) continue;

    ctx.globalAlpha = track.alpha * 0.65;
    ctx.lineWidth = Math.round((track.width || 6.0) / 2) * 2;

    ctx.beginPath();
    ctx.moveTo(Math.round(track.points[0].x), Math.round(track.points[0].y));
    for (let p = 1; p < track.points.length; p++) {
      ctx.lineTo(Math.round(track.points[p].x), Math.round(track.points[p].y));
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Burnout oil puddles removed per user request
 */
export function drawBurnoutOilPuddle(ctx, oilPuddle) {
  // No-op
}

/**
 * Draws expanding billowing burnout tire smoke particles (100% Discrete Stepped Pixel Blocks)
 */
export function drawTireSmokeParticles(ctx, smokeParticles) {
  if (!smokeParticles || smokeParticles.length === 0) return;

  ctx.save();
  for (let i = 0; i < smokeParticles.length; i++) {
    const p = smokeParticles[i];
    if (!p || p.life <= 0) continue;

    const alpha = (p.life / 20) * (p.maxAlpha || 0.40);
    const sSize = Math.max(4, Math.round((p.r * 2) / 2) * 2);
    ctx.fillStyle = `rgba(225, 232, 240, ${alpha.toFixed(3)})`;
    ctx.fillRect(Math.round(p.x - sSize * 0.5), Math.round(p.y - sSize * 0.5), sSize, sSize);
  }
  ctx.restore();
}

/**
 * Draws the high-detail realistic stamped-steel Intratec Tec-9 submachine gun
 */
function _drawTec9SubmachineGun(ctx, x, y, angle, recoil = 0, flashTimer = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  drawCjTec9(ctx, 0, 0, 1.05, recoil, flashTimer);
  ctx.restore();
}

/**
 * Draws a Grove Street Homie leaning out of the car window
 * Rule 19 Compliant (Upright faceless minimalist circle head with green bandana & gang gear)
 */
function _drawGroveHomie(ctx, x, y, targetAngle, recoil = 0, flashTimer = 0, shirtColor = '#F8FAFC') {
  ctx.save();
  ctx.translate(x, y);

  const headR = 12.5;
  const skinColor = '#8D5538'; // Classic brown skin tone

  // 1. Shoulders & Muscular Torso leaning out
  ctx.fillStyle = shirtColor;
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14.5, 10.5, targetAngle * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Gold chain necklace around neck
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 2, 7.5, 0.3, Math.PI - 0.3);
  ctx.stroke();

  // 2. Head Circle (Clean faceless circle body)
  ctx.fillStyle = skinColor;
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -3.5, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. Iconic Grove Street Green Bandana Headwear
  ctx.fillStyle = '#16A34A'; // Grove Street Green
  ctx.beginPath();
  ctx.arc(0, -3.5, headR, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(0, -6.5, headR * Math.cos(Math.PI * 1.02), -3.5 + headR * Math.sin(Math.PI * 1.02));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#14532D';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Bandana paisley speckle details
  ctx.fillStyle = '#DCFCE7';
  ctx.fillRect(-5, -11.5, 1.8, 1.8);
  ctx.fillRect(0, -13.5, 1.8, 1.8);
  ctx.fillRect(5, -11.5, 1.8, 1.8);
  ctx.fillRect(-2, -9, 1.5, 1.5);
  ctx.fillRect(3, -9, 1.5, 1.5);

  // Bandana knot tail hanging off back
  ctx.fillStyle = '#16A34A';
  ctx.strokeStyle = '#14532D';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-headR * 0.85, -6);
  ctx.lineTo(-headR * 1.45, -11);
  ctx.lineTo(-headR * 1.3, -3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. Black Sunglasses Silhouette
  ctx.fillStyle = '#09090B';
  ctx.beginPath();
  ctx.roundRect(-7.0, -6.0, 14.0, 4.8, 1.6);
  ctx.fill();

  // Sunglasses white specular glare glint
  ctx.fillStyle = 'rgba(255, 255, 255, 0.60)';
  ctx.fillRect(-4.5, -5.2, 3.2, 1.2);
  ctx.fillRect(2.5, -5.2, 3.2, 1.2);

  // 5. Holding and Aiming Tec-9 Submachine Gun
  const recoilDist = (recoil || 0) * 1.2;
  const recoilClimb = (recoil > 0) ? -recoil * 0.025 : 0;
  const gunOffsetX = Math.cos(targetAngle) * (14.0 - recoilDist);
  const gunOffsetY = Math.sin(targetAngle) * (14.0 - recoilDist);

  // Arms reaching out from window to hold the TEC-9
  ctx.save();
  ctx.strokeStyle = skinColor;
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, 4);
  ctx.lineTo(gunOffsetX * 0.65, gunOffsetY * 0.65);
  ctx.stroke();

  // Forearm and hand gripping the TEC-9
  ctx.beginPath();
  ctx.moveTo(gunOffsetX * 0.65, gunOffsetY * 0.65);
  ctx.lineTo(gunOffsetX, gunOffsetY);
  ctx.stroke();

  // Hand fist circle
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(gunOffsetX, gunOffsetY, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  _drawTec9SubmachineGun(ctx, gunOffsetX, gunOffsetY, targetAngle + recoilClimb, recoil, flashTimer);

  ctx.restore();
}

/**
 * Vector drawing subroutine for the chrome lowrider wheel
 */
function _renderLowriderWheelVector(ctx, x, y, width = 30, height = 12.5) {
  const halfW = width * 0.5;
  const halfH = height * 0.5;

  // 1. Black Radial Tire Rubber with tread profile
  ctx.fillStyle = '#18181B';
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(x - halfW, y - halfH, width, height, 4.0);
  ctx.fill();
  ctx.stroke();

  // Outer tire tread ribs
  ctx.fillStyle = '#09090B';
  ctx.fillRect(x - halfW + 2, y - halfH, 3.0, height);
  ctx.fillRect(x + halfW - 5, y - halfH, 3.0, height);

  // 2. Thick Whitewall Outer Stripe (Classic 90s Lowrider style)
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x - halfW * 0.65, y - halfH + 1.8);
  ctx.lineTo(x + halfW * 0.65, y - halfH + 1.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - halfW * 0.65, y + halfH - 1.8);
  ctx.lineTo(x + halfW * 0.65, y + halfH - 1.8);
  ctx.stroke();

  // 3. Deep-Dish Chrome Rim Lip
  const rimW = width * 0.60;
  const rimH = height * 0.76;

  ctx.fillStyle = '#E2E8F0';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(x - rimW * 0.5, y - rimH * 0.5, rimW, rimH, 2.5);
  ctx.fill();
  ctx.stroke();

  // 4. Chrome Wire Cross-Spokes (100-Spoke pattern)
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 0.8;
  const spokeCount = 6;
  for (let s = 0; s < spokeCount; s++) {
    const sx = x - rimW * 0.35 + (s / (spokeCount - 1)) * (rimW * 0.7);
    ctx.beginPath();
    ctx.moveTo(sx, y - rimH * 0.4);
    ctx.lineTo(x - (sx - x), y + rimH * 0.4);
    ctx.stroke();
  }

  // 5. 3-Wing Gold Hex Knock-Off Center Spinner
  ctx.fillStyle = '#F59E0B';
  ctx.strokeStyle = '#B45309';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Gold spinner wings
  ctx.fillStyle = '#FDE68A';
  ctx.fillRect(x - 4.5, y - 1.0, 9.0, 2.0);
}

function _getWheelCanvas() {
  if (!_cachedWheelCanvas && typeof document !== 'undefined') {
    _cachedWheelCanvas = document.createElement('canvas');
    _cachedWheelCanvas.width = 36;
    _cachedWheelCanvas.height = 18;
    const wctx = _cachedWheelCanvas.getContext('2d');
    _renderLowriderWheelVector(wctx, 18, 9, 30, 12.5);
  }
  return _cachedWheelCanvas;
}

/**
 * Draws a realistic chrome 100-spoke wire lowrider wheel with GPU texture blitting
 */
function _drawLowriderWheel(ctx, x, y, width = 30, height = 12.5, rotationAngle = 0) {
  const wheelCvs = _getWheelCanvas();
  if (wheelCvs) {
    ctx.drawImage(wheelCvs, x - 18, y - 9, 36, 18);
  } else {
    _renderLowriderWheelVector(ctx, x, y, width, height);
  }
}

let _cachedChassisCanvas = null;

/**
 * Pre-renders the ultra-realistic static 1980s Greenwood Sedan Chassis to an offscreen canvas
 * Contains: Drop shadow, exhaust pipes, body panels, creases, cowl vents, side moldings,
 * door handles, mirrors, cabin glass, wiper blades, vinyl roof, bumpers, grille, headlights, taillights, plate.
 */
function _renderChassisToCanvas(length, width) {
  const pad = 16;
  const cvsW = length + pad * 2;
  const cvsH = width + pad * 2;
  const cvs = document.createElement('canvas');
  cvs.width = cvsW;
  cvs.height = cvsH;
  const ctx = cvs.getContext('2d');
  _initVehicleGradients(ctx);

  ctx.translate(pad + length * 0.5, pad + width * 0.5);

  const halfL = length * 0.5;
  const halfW = width * 0.5;

  // ── LAYER 0: UNDERCAR CHASSIS DROP SHADOW & GROUND OCCLUSION ──
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.roundRect(-halfL - 7, -halfW - 6, length + 14, width + 12, 12);
  ctx.fill();

  // Darker inner chassis shadow core
  ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
  ctx.beginPath();
  ctx.roundRect(-halfL - 2, -halfW - 2, length + 4, width + 4, 8);
  ctx.fill();

  // Dual Chrome Exhaust Pipes on rear bumper (left & right)
  ctx.fillStyle = '#94A3B8';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(-halfL - 8, -halfW * 0.65, 8.5, 4.5, 1.5);
  ctx.roundRect(-halfL - 8, halfW * 0.55, 8.5, 4.5, 1.5);
  ctx.fill();
  ctx.stroke();

  // Exhaust pipe dark bore holes
  ctx.fillStyle = '#020617';
  ctx.fillRect(-halfL - 8.5, -halfW * 0.65 + 0.8, 2.5, 2.9);
  ctx.fillRect(-halfL - 8.5, halfW * 0.55 + 0.8, 2.5, 2.9);

  // ── LAYER 2: MAIN CAR BODY (Pale Vintage Sage Green Paint) ──
  ctx.fillStyle = _cachedBodyGrad;
  ctx.strokeStyle = '#3D5444';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(-halfL, -halfW, length, width, 6.0);
  ctx.fill();
  ctx.stroke();

  // ── LAYER 3: REALISTIC HOOD & TRUNK BODY LINES & PANEL GAPS ──
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-halfL + 8, -halfW * 0.68);
  ctx.lineTo(halfL - 8, -halfW * 0.68);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-halfL + 8, halfW * 0.68);
  ctx.lineTo(halfL - 8, halfW * 0.68);
  ctx.stroke();

  // Front Hood Seam Panel Gap
  ctx.strokeStyle = '#3D5444';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(halfL * 0.22, -halfW * 0.90);
  ctx.lineTo(halfL * 0.22, halfW * 0.90);
  ctx.stroke();

  // Rear Trunk Lid Seam Panel Gap
  ctx.beginPath();
  ctx.moveTo(-halfL * 0.50, -halfW * 0.88);
  ctx.lineTo(-halfL * 0.50, halfW * 0.88);
  ctx.stroke();

  // Chrome Hood Center Spear Molding
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(halfL * 0.24, -1.2, halfL * 0.70, 2.4);

  // Chrome Stand-up Hood Ornament at tip
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(halfL - 2, -2.5, 3.5, 5.0);

  // Cowl Induction Wiper Grille Vents
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(halfL * 0.16, -halfW * 0.65, 5.5, width * 0.65);
  ctx.fillStyle = '#334155';
  for (let vy = -halfW * 0.60; vy <= halfW * 0.60; vy += 4.5) {
    ctx.fillRect(halfL * 0.165, vy, 4.5, 1.6);
  }

  // ── LAYER 4: CHROME SIDE BELTLINE TRIM MOLDINGS & DOOR HANDLES ──
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(-halfL + 8, -halfW + 1.8, length - 16, 2.2);
  ctx.fillRect(-halfL + 8, halfW - 4.0, length - 16, 2.2);

  // Black Rubber Protective Inset on Chrome Moldings
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-halfL + 12, -halfW + 2.3, length - 24, 1.2);
  ctx.fillRect(-halfL + 12, halfW - 3.5, length - 24, 1.2);

  // 4 Chrome Door Handles with keyholes
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 0.8;
  ctx.fillRect(halfL * 0.05, -halfW + 3.8, 9.0, 2.4);
  ctx.strokeRect(halfL * 0.05, -halfW + 3.8, 9.0, 2.4);
  ctx.fillRect(-halfL * 0.32, -halfW + 3.8, 9.0, 2.4);
  ctx.strokeRect(-halfL * 0.32, -halfW + 3.8, 9.0, 2.4);
  ctx.fillRect(halfL * 0.05, halfW - 6.2, 9.0, 2.4);
  ctx.strokeRect(halfL * 0.05, halfW - 6.2, 9.0, 2.4);
  ctx.fillRect(-halfL * 0.32, halfW - 6.2, 9.0, 2.4);
  ctx.strokeRect(-halfL * 0.32, halfW - 6.2, 9.0, 2.4);

  // Dual Chrome Side-View Mirrors
  ctx.fillStyle = '#E2E8F0';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(halfL * 0.16, -halfW - 5.5, 7.5, 4.5, 1.5);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(halfL * 0.16, halfW + 1.0, 7.5, 4.5, 1.5);
  ctx.fill();
  ctx.stroke();

  // ── LAYER 5: CABIN ROOF, TINTED GLASS & REALISTIC REFLECTIONS ──
  const cabinX = -halfL * 0.13;
  const cabinW = length * 0.54;
  const cabinH = width * 0.76;

  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.roundRect(cabinX - cabinW * 0.5 - 1.5, -cabinH * 0.5 - 1.5, cabinW + 3.0, cabinH + 3.0, 5.0);
  ctx.fill();

  ctx.fillStyle = _cachedWindshieldGrad;
  ctx.beginPath();
  ctx.moveTo(cabinX + cabinW * 0.22, -cabinH * 0.48);
  ctx.lineTo(cabinX + cabinW * 0.48, -cabinH * 0.42);
  ctx.lineTo(cabinX + cabinW * 0.48, cabinH * 0.42);
  ctx.lineTo(cabinX + cabinW * 0.22, cabinH * 0.48);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(cabinX + cabinW * 0.26, -cabinH * 0.38);
  ctx.lineTo(cabinX + cabinW * 0.45, -cabinH * 0.12);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cabinX + cabinW * 0.30, -cabinH * 0.44);
  ctx.lineTo(cabinX + cabinW * 0.47, -cabinH * 0.20);
  ctx.stroke();

  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cabinX + cabinW * 0.46, -cabinH * 0.36);
  ctx.lineTo(cabinX + cabinW * 0.32, -cabinH * 0.08);
  ctx.moveTo(cabinX + cabinW * 0.46, 0);
  ctx.lineTo(cabinX + cabinW * 0.32, cabinH * 0.28);
  ctx.stroke();

  ctx.fillStyle = _cachedRearGlassGrad;
  ctx.beginPath();
  ctx.moveTo(cabinX - cabinW * 0.22, -cabinH * 0.46);
  ctx.lineTo(cabinX - cabinW * 0.48, -cabinH * 0.40);
  ctx.lineTo(cabinX - cabinW * 0.48, cabinH * 0.40);
  ctx.lineTo(cabinX - cabinW * 0.22, cabinH * 0.46);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.30)';
  ctx.lineWidth = 0.8;
  for (let ry = -cabinH * 0.30; ry <= cabinH * 0.30; ry += 5.0) {
    ctx.beginPath();
    ctx.moveTo(cabinX - cabinW * 0.44, ry);
    ctx.lineTo(cabinX - cabinW * 0.24, ry);
    ctx.stroke();
  }

  // ── LAYER 6: CLASSIC LANDAU VINYL TOP HARDTOP ROOF ──
  const roofW = cabinW * 0.54;
  const roofH = cabinH * 0.82;

  ctx.fillStyle = _cachedRoofGrad;
  ctx.strokeStyle = '#3D5444';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(cabinX - roofW * 0.5, -roofH * 0.5, roofW, roofH, 4.0);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(cabinX - roofW * 0.5 + 1.2, -roofH * 0.5 + 1.2, roofW - 2.4, roofH - 2.4);

  // ── LAYER 7: CHROME FRONT BUMPER & WATERFALL GRILLE ──
  const bFrontX = halfL - 3;
  ctx.fillStyle = _cachedBumpGrad;
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(bFrontX, -halfW * 0.94, 8.5, width * 0.88, 3.5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(bFrontX - 1, -halfW * 0.48, 10.5, 5.5);
  ctx.fillRect(bFrontX - 1, halfW * 0.38, 10.5, 5.5);

  ctx.fillStyle = '#020617';
  ctx.fillRect(halfL - 9.5, -halfW * 0.28, 6.8, width * 0.56);
  ctx.fillStyle = '#F1F5F9';
  for (let gy = -halfW * 0.25; gy <= halfW * 0.25; gy += 3.8) {
    ctx.fillRect(halfL - 9.0, gy, 5.8, 1.8);
  }

  // Front Sealed-Beam Headlights
  ctx.fillStyle = '#FEF08A';
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 1.0;
  ctx.fillRect(halfL - 7.0, -halfW * 0.78, 5.5, 8.0);
  ctx.strokeRect(halfL - 7.0, -halfW * 0.78, 5.5, 8.0);
  ctx.fillRect(halfL - 7.0, -halfW * 0.55, 5.5, 8.0);
  ctx.strokeRect(halfL - 7.0, -halfW * 0.55, 5.5, 8.0);
  ctx.fillRect(halfL - 7.0, halfW * 0.38, 5.5, 8.0);
  ctx.strokeRect(halfL - 7.0, halfW * 0.38, 5.5, 8.0);
  ctx.fillRect(halfL - 7.0, halfW * 0.61, 5.5, 8.0);
  ctx.strokeRect(halfL - 7.0, halfW * 0.61, 5.5, 8.0);

  // Indicators
  ctx.fillStyle = '#F59E0B';
  ctx.strokeStyle = '#B45309';
  ctx.fillRect(halfL - 5.5, -halfW * 0.90, 4.0, 5.5);
  ctx.strokeRect(halfL - 5.5, -halfW * 0.90, 4.0, 5.5);
  ctx.fillRect(halfL - 5.5, halfW * 0.78, 4.0, 5.5);
  ctx.strokeRect(halfL - 5.5, halfW * 0.78, 4.0, 5.5);

  // ── LAYER 8: CHROME REAR BUMPER, TAILLIGHTS & LICENSE PLATE ──
  const bRearX = -halfL - 5.5;
  ctx.fillStyle = _cachedBumpGrad;
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(bRearX, -halfW * 0.94, 8.5, width * 0.88, 3.5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(bRearX - 1, -halfW * 0.48, 10.5, 5.5);
  ctx.fillRect(bRearX - 1, halfW * 0.38, 10.5, 5.5);

  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#7F1D1D';
  ctx.lineWidth = 1.0;
  ctx.fillRect(-halfL + 0.5, -halfW * 0.80, 5.0, 12.5);
  ctx.strokeRect(-halfL + 0.5, -halfW * 0.80, 5.0, 12.5);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(-halfL + 0.5, -halfW * 0.62, 5.0, 3.2);

  ctx.fillStyle = '#DC2626';
  ctx.fillRect(-halfL + 0.5, halfW * 0.52, 5.0, 12.5);
  ctx.strokeRect(-halfL + 0.5, halfW * 0.52, 5.0, 12.5);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(-halfL + 0.5, halfW * 0.52, 5.0, 3.2);

  ctx.fillStyle = '#1E3A8A';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 0.8;
  ctx.fillRect(-halfL + 1.2, -7.5, 4.2, 15.0);
  ctx.strokeRect(-halfL + 1.2, -7.5, 4.2, 15.0);
  ctx.fillStyle = '#FBBF24';
  ctx.fillRect(-halfL + 2.0, -5.5, 2.5, 11.0);

  return cvs;
}

function _getChassisCanvas(length = 152, width = 72) {
  if (!_cachedChassisCanvas && typeof document !== 'undefined') {
    _cachedChassisCanvas = _renderChassisToCanvas(length, width);
  }
  return _cachedChassisCanvas;
}

function _isDarkMode() {
  return Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' || 
      state.darkMode || 
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );
}

/**
 * Draws a Grove Street Homie leaning out of the car window in Pixel Art Style (Saitama Tech)
 */
function _drawPixelGroveHomie(ctx, x, y, targetAngle, recoil, flashTimer, shirtColor = '#F8FAFC') {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  const skinColor = '#8D5538';
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  // 1. Shoulders & Muscular Torso leaning out
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-14, -10, 28, 20);
  ctx.fillStyle = shirtColor;
  ctx.fillRect(-12, -8, 24, 16);

  // Gold chain
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(-6, 2, 12, 2);

  // 2. Head Circle (Discrete Stepped Pixel with #0E0F14 Outline)
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-11, -15, 22, 20);
  ctx.fillStyle = skinColor;
  ctx.fillRect(-9, -13, 18, 16);

  // 3. Green Bandana & Knots
  ctx.fillStyle = '#16A34A';
  ctx.fillRect(-9, -13, 18, 7);
  // Bandana knot hanging off back
  ctx.fillRect(-13, -11, 4, 4);
  // Paisley dots
  ctx.fillStyle = '#DCFCE7';
  ctx.fillRect(-5, -11, 2, 2);
  ctx.fillRect(0, -12, 2, 2);
  ctx.fillRect(4, -11, 2, 2);

  // 4. Black Sunglasses & Specular Shine
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-7, -7, 14, 5);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-5, -6, 3, 2);
  ctx.fillRect(2, -6, 3, 2);

  // 5. Holding and Aiming Stepped Pixel TEC-9
  const recoilDist = snap((recoil || 0) * 1.2);
  const gunOffsetX = Math.cos(targetAngle) * (14.0 - recoilDist);
  const gunOffsetY = Math.sin(targetAngle) * (14.0 - recoilDist);

  // Arms reaching out from window
  ctx.fillStyle = skinColor;
  ctx.fillRect(-3, 1, snap(gunOffsetX * 0.75), snap(gunOffsetY * 0.75));

  drawCjPixelTec9(ctx, gunOffsetX, gunOffsetY, 1.05, recoil, flashTimer);

  ctx.restore();
}

/**
 * Draws Authentic Grove Street Greenwood Sedan in 100% Discrete Pixel Art Style (Saitama Tech)
 * Uses pure discrete 2D grid-scan rasterization loop with stepped #0E0F14 4-neighbor attached border.
 */
export function drawPixelGroveStreetCar(ctx, car) {
  if (!car || car.dead) return;

  const length = car.length || 152;
  const width = car.width || 72;
  const halfL = length * 0.5;
  const halfW = width * 0.5;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(car.x), Math.round(car.y));
  ctx.rotate(car.angle || 0);

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  // ── LAYER 0: DROP SHADOW ON GROUND PLANE ──
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(snap(-halfL - 6), snap(-halfW - 4), snap(length + 12), snap(width + 8));

  // ── LAYER 1: 4 WHITEWALL LOWRIDER WHEELS ──
  const wheelXPositions = [halfL * 0.55, -halfL * 0.55];
  const wheelOffsetY = halfW * 0.92;
  const wheelRot = car.wheelRotation || 0;

  for (let wx = 0; wx < 2; wx++) {
    const wX = snap(wheelXPositions[wx]);
    [-wheelOffsetY, wheelOffsetY].forEach(wY => {
      const centerY = snap(wY);
      // Outer stepped tire border
      ctx.fillStyle = '#0E0F14';
      ctx.fillRect(wX - 16, centerY - 6, 32, 12);

      // Black rubber tire tread
      ctx.fillStyle = '#18181B';
      ctx.fillRect(wX - 14, centerY - 4, 28, 8);

      // Whitewall stripe
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(wX - 12, centerY - 2, 24, 2);
      ctx.fillRect(wX - 12, centerY + 2, 24, 2);

      // Deep-dish chrome rim
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(wX - 8, centerY - 2, 16, 4);

      // Chrome wheel center cap & rotating spokes
      ctx.fillStyle = '#0E0F14';
      const spokeOff = snap(Math.sin(wheelRot) * 4);
      ctx.fillRect(wX + spokeOff - 1, centerY - 2, 2, 4);
    });
  }

  // ── LAYER 2: 2D DISCRETE GRID-SCAN RASTERIZED SEDAN CHASSIS (SAITAMA TECH) ──
  const cornerR = 6.0;
  const inBody = (x, y) => {
    if (Math.abs(y) > halfW || Math.abs(x) > halfL) return false;
    // Rounded front corners (+X)
    if (x > halfL - cornerR && Math.abs(y) > halfW - cornerR) {
      const dx = x - (halfL - cornerR);
      const dy = Math.abs(y) - (halfW - cornerR);
      return Math.hypot(dx, dy) <= cornerR;
    }
    // Rounded rear corners (-X)
    if (x < -halfL + cornerR && Math.abs(y) > halfW - cornerR) {
      const dx = x - (-halfL + cornerR);
      const dy = Math.abs(y) - (halfW - cornerR);
      return Math.hypot(dx, dy) <= cornerR;
    }
    return true;
  };

  // Cabin / Window regions
  const cabinX = -halfL * 0.13;
  const cabinW = length * 0.54;
  const cabinH = width * 0.76;
  const cabinLeft = cabinX - cabinW * 0.5;
  const cabinRight = cabinX + cabinW * 0.5;
  const cabinTop = -cabinH * 0.5;
  const cabinBtm = cabinH * 0.5;

  const roofW = cabinW * 0.54;
  const roofH = cabinH * 0.82;
  const roofLeft = cabinX - roofW * 0.5;
  const roofRight = cabinX + roofW * 0.5;
  const roofTop = -roofH * 0.5;
  const roofBtm = roofH * 0.5;

  const inCabin = (x, y) => (x >= cabinLeft && x <= cabinRight && y >= cabinTop && y <= cabinBtm);
  const inRoof = (x, y) => (x >= roofLeft && x <= roofRight && y >= roofTop && y <= roofBtm);

  const stepsX = Math.ceil((halfL + P * 2) / P);
  const stepsY = Math.ceil((halfW + P * 2) / P);

  for (let gy = -stepsY; gy <= stepsY; gy++) {
    for (let gx = -stepsX; gx <= stepsX; gx++) {
      const rx = gx * P;
      const ry = gy * P;

      if (!inBody(rx, ry)) continue;

      const px = snap(rx);
      const py = snap(ry);

      // 4-Neighbor Attached Stepped Black Border (Saitama Tech)
      const isEdge = (
        !inBody(rx + P, ry) ||
        !inBody(rx - P, ry) ||
        !inBody(rx, ry + P) ||
        !inBody(rx, ry - P)
      );

      if (isEdge) {
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // 1. LANDAU VINYL TOP ROOF
      if (inRoof(rx, ry)) {
        const isRoofEdge = (
          !inRoof(rx + P, ry) || !inRoof(rx - P, ry) ||
          !inRoof(rx, ry + P) || !inRoof(rx, ry - P)
        );
        if (isRoofEdge) {
          ctx.fillStyle = '#0E0F14'; // Black roof border
        } else if (ry < roofTop + 4) {
          ctx.fillStyle = '#698470'; // Top pale vinyl highlight
        } else if (ry > roofBtm - 4) {
          ctx.fillStyle = '#3D5444'; // Bottom vinyl shadow
        } else {
          ctx.fillStyle = '#4E6554'; // Vintage deep olive-green vinyl
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // 2. TINTED CABIN GLASS (Windshield, Rear Glass, Side Windows)
      if (inCabin(rx, ry)) {
        const isCabinEdge = (
          !inCabin(rx + P, ry) || !inCabin(rx - P, ry) ||
          !inCabin(rx, ry + P) || !inCabin(rx, ry - P)
        );
        if (isCabinEdge) {
          ctx.fillStyle = '#0E0F14'; // Pillar/glass framing
        } else if (
          (rx > cabinRight - 12 && Math.abs(ry - rx * 0.4) < 3) ||
          (rx < cabinLeft + 10 && Math.abs(ry + rx * 0.4) < 3)
        ) {
          ctx.fillStyle = '#CBD5E1'; // Glass diagonal specular sheen
        } else {
          ctx.fillStyle = '#0F172A'; // Deep midnight tinted glass
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // 3. HOOD & TRUNK BODY PANELS (Vintage Pale Sage Green)
      // Front Cowl Vents
      if (rx >= cabinRight + 2 && rx <= cabinRight + 8 && Math.abs(ry) < halfW * 0.6) {
        ctx.fillStyle = (gx % 2 === 0) ? '#0E0F14' : '#5A7862';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // Chrome Side Beltline Trim
      if (Math.abs(ry) >= halfW - 4 && Math.abs(ry) <= halfW - 2) {
        ctx.fillStyle = '#E2E8F0'; // Chrome side trim
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // Center Hood & Trunk Crease Line
      if (Math.abs(ry) <= 1) {
        ctx.fillStyle = '#5A7862'; // Center body line crease
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // Sunlit Top Highlight vs Underside Shadow
      if (ry < -halfW * 0.3) {
        ctx.fillStyle = '#95BA9D'; // Sunlit mint-sage highlight
      } else if (ry > halfW * 0.4) {
        ctx.fillStyle = '#5A7862'; // Shadowed underside
      } else {
        ctx.fillStyle = '#76987E'; // Pale vintage sage green
      }

      ctx.fillRect(px, py, P, P);
    }
  }

  // ── LAYER 3: CHROME FRONT BUMPER, WATERFALL GRILLE, HEADLIGHTS ──
  // Front Bumper Block
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(snap(halfL - 2), snap(-halfW * 0.94), 8, snap(width * 0.88));
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(snap(halfL - 1), snap(-halfW * 0.90), 6, snap(width * 0.80));

  // Chrome Bumper Overriders / Black Rubber Guards
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(snap(halfL - 2), snap(-halfW * 0.45), 8, 6);
  ctx.fillRect(snap(halfL - 2), snap(halfW * 0.35), 8, 6);

  // Chrome Waterfall Grille
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(snap(halfL - 8), snap(-halfW * 0.28), 6, snap(width * 0.56));
  ctx.fillStyle = '#FFFFFF';
  for (let gy = -halfW * 0.24; gy <= halfW * 0.24; gy += 4) {
    ctx.fillRect(snap(halfL - 7), snap(gy), 4, 2);
  }

  // Dual Square Sealed-Beam Headlights (Left & Right)
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(snap(halfL - 8), snap(-halfW * 0.78), 6, 18);
  ctx.fillRect(snap(halfL - 8), snap(halfW * 0.38), 6, 18);

  ctx.fillStyle = '#FEF08A'; // Glowing yellow/white headlights
  ctx.fillRect(snap(halfL - 7), snap(-halfW * 0.76), 4, 6);
  ctx.fillRect(snap(halfL - 7), snap(-halfW * 0.52), 4, 6);
  ctx.fillRect(snap(halfL - 7), snap(halfW * 0.40), 4, 6);
  ctx.fillRect(snap(halfL - 7), snap(halfW * 0.64), 4, 6);

  // Amber Turn Signals
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(snap(halfL - 6), snap(-halfW * 0.90), 4, 4);
  ctx.fillRect(snap(halfL - 6), snap(halfW * 0.80), 4, 4);

  // ── LAYER 4: CHROME REAR BUMPER, TAILLIGHTS, EXHAUST PIPES ──
  // Rear Bumper Block
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(snap(-halfL - 6), snap(-halfW * 0.94), 8, snap(width * 0.88));
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(snap(-halfL - 5), snap(-halfW * 0.90), 6, snap(width * 0.80));

  // Dual Crimson Vertical Taillights
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(snap(-halfL - 4), snap(-halfW * 0.80), 4, 10);
  ctx.fillRect(snap(-halfL - 4), snap(halfW * 0.58), 4, 10);
  ctx.fillStyle = '#DC2626'; // Bright ruby red
  ctx.fillRect(snap(-halfL - 3), snap(-halfW * 0.78), 2, 8);
  ctx.fillRect(snap(-halfL - 3), snap(halfW * 0.60), 2, 8);

  // Dual Chrome Exhaust Tips
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(snap(-halfL - 8), snap(-halfW * 0.60), 4, 4);
  ctx.fillRect(snap(-halfL - 8), snap(halfW * 0.50), 4, 4);
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(snap(-halfL - 8), snap(-halfW * 0.60 + 1), 2, 2);
  ctx.fillRect(snap(-halfL - 8), snap(halfW * 0.50 + 1), 2, 2);

  // 4 Chrome Door Handles
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(snap(halfL * 0.05), snap(-halfW + 6), 6, 2);
  ctx.fillRect(snap(-halfL * 0.32), snap(-halfW + 6), 6, 2);
  ctx.fillRect(snap(halfL * 0.05), snap(halfW - 8), 6, 2);
  ctx.fillRect(-halfL * 0.32, snap(halfW - 8), 6, 2);

  // ── LAYER 5: TWO GROVE STREET HOMIES LEANING OUT (PIXEL ART STYLE) ──
  const h1Aim = car.homie1Aim || 0;
  const h1Recoil = car.homie1Recoil || 0;
  const h1Flash = car.homie1Flash || 0;
  _drawPixelGroveHomie(ctx, snap(cabinX + cabinW * 0.12), snap(halfW * 0.75), h1Aim, h1Recoil, h1Flash, '#F8FAFC');

  const h2Aim = car.homie2Aim || 0;
  const h2Recoil = car.homie2Recoil || 0;
  const h2Flash = car.homie2Flash || 0;
  _drawPixelGroveHomie(ctx, snap(cabinX - cabinW * 0.16), snap(halfW * 0.75), h2Aim, h2Recoil, h2Flash, '#15803D');

  // ── LAYER 6: WHITE HIT-FLASH OVERLAY (WHEN DAMAGED) ──
  if (car.hitFlashTimer && car.hitFlashTimer > 0) {
    const flashAlpha = Math.min(0.85, (car.hitFlashTimer / 8) * 0.85);
    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha.toFixed(2)})`;
    ctx.fillRect(snap(-halfL), snap(-halfW), snap(length), snap(width));
    car.hitFlashTimer--;
  }

  // ── LAYER 7: RULE 9 COMPLIANT LIMITLESS INFINITY CYAN STASIS & STUN VISUALS ──
  if (car.isFrozenByInfinity) {
    const time = Date.now() / 200;
    const pulse = Math.sin(time * 2) * 0.5 + 0.5;

    ctx.fillStyle = 'rgba(0, 229, 255, 0.65)';
    ctx.fillRect(snap(-halfL - 2), snap(-halfW - 2), snap(length + 4), snap(width + 4));

    ctx.strokeStyle = 'rgba(224, 255, 255, 0.90)';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(snap(-halfL - 4 - pulse * 3), snap(-halfW - 4 - pulse * 3), snap(length + 8 + pulse * 6), snap(width + 8 + pulse * 6));
  } else {
    const isGojoDomainActive = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive);
    const isStunnedOrFrozen = Boolean(
      (car.timeStopTimer && car.timeStopTimer > 0) ||
      (car.electricStunTimer && car.electricStunTimer > 0) ||
      (car.hitStunTimer && car.hitStunTimer > 0) ||
      car.frozenByCronos ||
      car.isTargetOfAmbush ||
      car.caughtInSaitamaFlurry
    );
    if (isStunnedOrFrozen && !isGojoDomainActive) {
      drawParalyzeEffect(ctx, 44, false, car.timeStopTimer || car.hitStunTimer || 45, '#FFEE58', car);
    }
  }

  ctx.restore();
}

/**
 * Main Renderer for the Grove Street Greenwood Sedan
 * 100% Discrete 2D Grid-Scan Pixel Art Style (Saitama Tech)
 */
export function drawGroveStreetCar(ctx, car) {
  if (!car || car.dead) return;
  drawPixelGroveStreetCar(ctx, car);
}
