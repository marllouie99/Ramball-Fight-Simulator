// ─────────────────────────────────────────────
// Grove Street Greenwood Sedan & Homies Graphics
// Ultra-Realistic 1980s American Classic Lowrider Sedan & Tec-9 Gangsters
// Rule 11 (Zero shadowBlur) & Rule 19 Compliant
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { drawParalyzeEffect } from '../statusEffects.js';

let _cachedHeadlightGrad = null;

function _getHeadlightGrad(ctx, length) {
  const grad = ctx.createRadialGradient(0, 0, 8, length * 0.7, 0, length);
  grad.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
  grad.addColorStop(0.25, 'rgba(253, 224, 71, 0.28)');
  grad.addColorStop(0.65, 'rgba(250, 204, 21, 0.10)');
  grad.addColorStop(1, 'rgba(234, 179, 8, 0)');
  return grad;
}

/**
 * Draws the illuminated golden-white quad headlight beams projecting onto the asphalt
 */
export function drawCarHeadlights(ctx, carX, carY, carAngle, carLength = 152, carWidth = 72) {
  ctx.save();
  ctx.translate(carX, carY);
  ctx.rotate(carAngle);

  const frontX = carLength * 0.5 + 2;
  const beamLength = 240;
  const beamSpread = 64;
  const lightYs = [-carWidth * 0.32, carWidth * 0.32];

  for (const ly of lightYs) {
    ctx.save();
    ctx.translate(frontX, ly);

    // Forward illumination cone
    ctx.fillStyle = _getHeadlightGrad(ctx, beamLength);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(beamLength, -beamSpread);
    ctx.lineTo(beamLength, beamSpread);
    ctx.lineTo(0, 7);
    ctx.closePath();
    ctx.fill();

    // Concentric hot core bulb flare (Rule 11 compliant: simulated glow without shadowBlur)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(3, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(254, 240, 138, 0.65)';
    ctx.beginPath();
    ctx.arc(3, 0, 9.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws tire rubber skid marks on the arena floor
 */
export function drawCarSkidMarks(ctx, skidTracks) {
  if (!skidTracks || skidTracks.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < skidTracks.length; i++) {
    const track = skidTracks[i];
    if (!track.points || track.points.length < 2 || track.alpha <= 0) continue;

    // Dark rubber skid tire marks
    ctx.strokeStyle = `rgba(12, 12, 16, ${(track.alpha * 0.75).toFixed(3)})`;
    ctx.lineWidth = track.width || 6.5;

    ctx.beginPath();
    ctx.moveTo(track.points[0].x, track.points[0].y);
    for (let p = 1; p < track.points.length; p++) {
      ctx.lineTo(track.points[p].x, track.points[p].y);
    }
    ctx.stroke();

    // Textured tire tread groove striation
    ctx.strokeStyle = `rgba(28, 28, 36, ${(track.alpha * 0.40).toFixed(3)})`;
    ctx.lineWidth = (track.width || 6.5) * 0.4;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws dark asphalt burnout oil puddles left on the ground
 */
export function drawBurnoutOilPuddle(ctx, oilPuddle) {
  if (!oilPuddle || oilPuddle.life <= 0) return;

  const alpha = Math.min(1.0, oilPuddle.life / 40) * (oilPuddle.maxAlpha || 0.80);
  const r = oilPuddle.r || 55;

  ctx.save();
  ctx.translate(oilPuddle.x, oilPuddle.y);

  // 1. Dark glossy motor oil puddle
  const oilGrad = ctx.createRadialGradient(0, 0, r * 0.12, 0, 0, r);
  oilGrad.addColorStop(0, `rgba(8, 8, 12, ${alpha.toFixed(3)})`);
  oilGrad.addColorStop(0.6, `rgba(18, 20, 24, ${(alpha * 0.90).toFixed(3)})`);
  oilGrad.addColorStop(0.88, `rgba(30, 38, 28, ${(alpha * 0.45).toFixed(3)})`);
  oilGrad.addColorStop(1, 'rgba(6, 6, 8, 0)');

  ctx.fillStyle = oilGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.18, r * 0.82, oilPuddle.angle || 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Iridescent gasoline sheen streaks
  ctx.strokeStyle = `rgba(34, 197, 94, ${(alpha * 0.45).toFixed(3)})`;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(-r * 0.22, -r * 0.16, r * 0.48, 0.4, Math.PI * 0.95);
  ctx.stroke();

  ctx.strokeStyle = `rgba(245, 158, 11, ${(alpha * 0.38).toFixed(3)})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(r * 0.18, r * 0.12, r * 0.40, 2.2, Math.PI * 1.65);
  ctx.stroke();

  ctx.strokeStyle = `rgba(59, 130, 246, ${(alpha * 0.32).toFixed(3)})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(-r * 0.05, r * 0.25, r * 0.32, 1.1, Math.PI * 1.4);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws expanding billowing burnout tire smoke particles
 */
export function drawTireSmokeParticles(ctx, smokeParticles) {
  if (!smokeParticles || smokeParticles.length === 0) return;

  ctx.save();
  for (let i = 0; i < smokeParticles.length; i++) {
    const p = smokeParticles[i];
    if (p.life <= 0) continue;

    const alpha = Math.min(1.0, p.life / 20) * (p.maxAlpha || 0.50);

    // Volumetric smoke shading
    const smokeGrad = ctx.createRadialGradient(p.x, p.y, p.r * 0.15, p.x, p.y, p.r);
    smokeGrad.addColorStop(0, `rgba(245, 248, 255, ${(alpha * 0.90).toFixed(3)})`);
    smokeGrad.addColorStop(0.65, `rgba(215, 222, 232, ${(alpha * 0.55).toFixed(3)})`);
    smokeGrad.addColorStop(1, 'rgba(180, 190, 205, 0)');

    ctx.fillStyle = smokeGrad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws the high-detail realistic stamped-steel Tec-9 submachine gun
 */
function _drawTec9SubmachineGun(ctx, x, y, angle, recoil = 0, flashTimer = 0) {
  ctx.save();
  ctx.translate(x - recoil * 0.85, y);
  ctx.rotate(angle);

  // 1. Long 32-Round Straight Box Magazine (Stamped Steel)
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(-3, 6, 6.0, 24, 1.2);
  ctx.fill();
  ctx.stroke();

  // Magazine baseplate & witness holes
  ctx.fillStyle = '#334155';
  ctx.fillRect(-3.5, 28, 7.0, 2.5);
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(-0.8, 12, 1.6, 2.2); // Brass casing peek
  ctx.fillRect(-0.8, 18, 1.6, 2.2);

  // 2. Polymer Lower Receiver & Textured Pistol Grip
  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-6, -1, 9.5, 15, 1.8);
  ctx.fill();
  ctx.stroke();

  // Grip checkering texture
  ctx.fillStyle = '#0F172A';
  for (let gy = 4; gy <= 11; gy += 2.5) {
    ctx.fillRect(-4.5, gy, 6.5, 1.0);
  }

  // Trigger Guard & Trigger
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(2, 4, 3.8, 0, Math.PI * 0.85);
  ctx.stroke();

  // 3. Stamped Steel Upper Tube Receiver
  const receiverGrad = ctx.createLinearGradient(0, -5.5, 0, 5.5);
  receiverGrad.addColorStop(0, '#475569');
  receiverGrad.addColorStop(0.4, '#64748B'); // Cylindrical highlight
  receiverGrad.addColorStop(1, '#1E293B');

  ctx.fillStyle = receiverGrad;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-11, -5.2, 30, 10.4, 2.2);
  ctx.fill();
  ctx.stroke();

  // Cocking Handle on top
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-4, -6.8, 4.2, 2.2);

  // Ejection Port
  ctx.fillStyle = '#020617';
  ctx.fillRect(4, -4.5, 7.5, 3.2);

  // 4. Perforated Barrel Shroud (Iconic Tec-9 feature!)
  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(18, -4.5, 19, 9.0, 1.5);
  ctx.fill();
  ctx.stroke();

  // Dual-row circular cooling perforations
  ctx.fillStyle = '#020617';
  for (let hx = 21; hx <= 33; hx += 4.5) {
    ctx.beginPath();
    ctx.arc(hx, -2.2, 1.2, 0, Math.PI * 2);
    ctx.arc(hx, 2.2, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Extended Threaded Barrel Tip & Front Blade Sight
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(37, -2.4, 7.5, 4.8);
  ctx.fillRect(35, -5.5, 2.0, 2.5); // Front sight blade

  // 6. Realistic Muzzle Flash
  if (flashTimer > 0) {
    _drawTec9MuzzleFlash(ctx, 44.5, 0, 1.4);
  }

  ctx.restore();
}

/**
 * Draws sharp starburst muzzle flash on Tec-9
 */
function _drawTec9MuzzleFlash(ctx, x, y, scale = 1.0) {
  ctx.save();
  ctx.translate(x, y);

  const burstSize = 22 * scale;

  // Outer orange-amber flash spikes
  ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
  ctx.beginPath();
  ctx.moveTo(burstSize, 0);
  ctx.lineTo(burstSize * 0.35, -burstSize * 0.35);
  ctx.lineTo(0, -burstSize * 0.85);
  ctx.lineTo(-burstSize * 0.25, -burstSize * 0.35);
  ctx.lineTo(-burstSize * 0.5, 0);
  ctx.lineTo(-burstSize * 0.25, burstSize * 0.35);
  ctx.lineTo(0, burstSize * 0.85);
  ctx.lineTo(burstSize * 0.35, burstSize * 0.35);
  ctx.closePath();
  ctx.fill();

  // Inner white-hot core
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(burstSize * 0.65, 0);
  ctx.lineTo(0, -burstSize * 0.35);
  ctx.lineTo(-burstSize * 0.3, 0);
  ctx.lineTo(0, burstSize * 0.35);
  ctx.closePath();
  ctx.fill();

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
  const gunOffsetX = Math.cos(targetAngle) * 12.5;
  const gunOffsetY = Math.sin(targetAngle) * 12.5;
  _drawTec9SubmachineGun(ctx, gunOffsetX, gunOffsetY, targetAngle, recoil, flashTimer);

  ctx.restore();
}

/**
 * Draws a realistic chrome 100-spoke wire lowrider wheel with classic white-wall radial tire
 */
function _drawLowriderWheel(ctx, x, y, width = 30, height = 12.5, rotationAngle = 0) {
  ctx.save();
  ctx.translate(x, y);

  const halfW = width * 0.5;
  const halfH = height * 0.5;

  // 1. Black Radial Tire Rubber with tread profile
  ctx.fillStyle = '#18181B';
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-halfW, -halfH, width, height, 4.0);
  ctx.fill();
  ctx.stroke();

  // Outer tire tread ribs
  ctx.fillStyle = '#09090B';
  ctx.fillRect(-halfW + 2, -halfH, 3.0, height);
  ctx.fillRect(halfW - 5, -halfH, 3.0, height);

  // 2. Thick Whitewall Outer Stripe (Classic 90s Lowrider style)
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.65, -halfH + 1.8);
  ctx.lineTo(halfW * 0.65, -halfH + 1.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.65, halfH - 1.8);
  ctx.lineTo(halfW * 0.65, halfH - 1.8);
  ctx.stroke();

  // 3. Deep-Dish Chrome Rim Lip
  const rimW = width * 0.60;
  const rimH = height * 0.76;
  const rimGrad = ctx.createLinearGradient(0, -rimH * 0.5, 0, rimH * 0.5);
  rimGrad.addColorStop(0, '#E2E8F0');
  rimGrad.addColorStop(0.5, '#FFFFFF');
  rimGrad.addColorStop(1, '#94A3B8');

  ctx.fillStyle = rimGrad;
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(-rimW * 0.5, -rimH * 0.5, rimW, rimH, 2.5);
  ctx.fill();
  ctx.stroke();

  // 4. Chrome Wire Cross-Spokes (100-Spoke pattern)
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 0.8;
  const spokeCount = 6;
  for (let s = 0; s < spokeCount; s++) {
    const sx = -rimW * 0.35 + (s / (spokeCount - 1)) * (rimW * 0.7);
    ctx.beginPath();
    ctx.moveTo(sx, -rimH * 0.4);
    ctx.lineTo(-sx, rimH * 0.4);
    ctx.stroke();
  }

  // 5. 3-Wing Gold Hex Knock-Off Center Spinner
  ctx.fillStyle = '#F59E0B';
  ctx.strokeStyle = '#B45309';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Gold spinner wings
  ctx.fillStyle = '#FDE68A';
  ctx.fillRect(-4.5, -1.0, 9.0, 2.0);

  ctx.restore();
}

/**
 * Main 2D Vector Renderer for the Ultra-Realistic Grove Street Greenwood Sedan
 * Fully detailed 1980s 4-door boxy lowrider sedan with chrome moldings, Landau vinyl top,
 * realistic glass reflections, hood ornament, and 2 gang homies leaning out.
 */
export function drawGroveStreetCar(ctx, car) {
  if (!car || car.dead) return;

  const length = car.length || 152;
  const width = car.width || 72;
  const halfL = length * 0.5;
  const halfW = width * 0.5;

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle || 0);

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

  // ── LAYER 1: 4 WHEELS (Top & Bottom pairs) ──
  const wheelOffsetFrontX = halfL * 0.55;
  const wheelOffsetRearX = -halfL * 0.55;
  const wheelOffsetY = halfW * 0.94;
  const wheelRot = (car.wheelRotation || 0);

  // Front Left & Right Wheels
  _drawLowriderWheel(ctx, wheelOffsetFrontX, -wheelOffsetY, 30, 12.5, wheelRot);
  _drawLowriderWheel(ctx, wheelOffsetFrontX, wheelOffsetY, 30, 12.5, wheelRot);
  // Rear Left & Right Wheels
  _drawLowriderWheel(ctx, wheelOffsetRearX, -wheelOffsetY, 30, 12.5, wheelRot);
  _drawLowriderWheel(ctx, wheelOffsetRearX, wheelOffsetY, 30, 12.5, wheelRot);

  // ── LAYER 2: MAIN CAR BODY (Metallic Midnight Emerald Green Paint) ──
  const bodyGrad = ctx.createLinearGradient(0, -halfW, 0, halfW);
  bodyGrad.addColorStop(0, '#052E16');    // Shadowed underside
  bodyGrad.addColorStop(0.12, '#14532D'); // Deep Forest Green
  bodyGrad.addColorStop(0.35, '#166534'); // Rich metallic mid-tone
  bodyGrad.addColorStop(0.5, '#15803D');  // Sunlit glossy shoulder highlight
  bodyGrad.addColorStop(0.72, '#166534');
  bodyGrad.addColorStop(0.92, '#14532D');
  bodyGrad.addColorStop(1, '#052E16');

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#022C12';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  // Classic 1980s boxy angular American sedan silhouette
  ctx.roundRect(-halfL, -halfW, length, width, 6.0);
  ctx.fill();
  ctx.stroke();

  // ── LAYER 3: REALISTIC HOOD & TRUNK BODY LINES & PANEL GAPS ──
  // Longitudinal Hood Crisp Creases (Dual speed lines running down the hood)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
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
  ctx.strokeStyle = '#022C12';
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

  // Cowl Induction Wiper Grille Vents (at base of windshield)
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(halfL * 0.16, -halfW * 0.65, 5.5, width * 0.65);
  ctx.fillStyle = '#334155';
  for (let vy = -halfW * 0.60; vy <= halfW * 0.60; vy += 4.5) {
    ctx.fillRect(halfL * 0.165, vy, 4.5, 1.6);
  }

  // ── LAYER 4: CHROME SIDE BELTLINE TRIM MOLDINGS & DOOR HANDLES ──
  // Chrome Body-Side Molding Strips
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
  // Left side handles (Front & Rear)
  ctx.fillRect(halfL * 0.05, -halfW + 3.8, 9.0, 2.4);
  ctx.strokeRect(halfL * 0.05, -halfW + 3.8, 9.0, 2.4);
  ctx.fillRect(-halfL * 0.32, -halfW + 3.8, 9.0, 2.4);
  ctx.strokeRect(-halfL * 0.32, -halfW + 3.8, 9.0, 2.4);
  // Right side handles (Front & Rear)
  ctx.fillRect(halfL * 0.05, halfW - 6.2, 9.0, 2.4);
  ctx.strokeRect(halfL * 0.05, halfW - 6.2, 9.0, 2.4);
  ctx.fillRect(-halfL * 0.32, halfW - 6.2, 9.0, 2.4);
  ctx.strokeRect(-halfL * 0.32, halfW - 6.2, 9.0, 2.4);

  // Dual Chrome Side-View Mirrors (Projecting out from A-Pillars)
  ctx.fillStyle = '#E2E8F0';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.0;
  // Left Mirror
  ctx.beginPath();
  ctx.roundRect(halfL * 0.16, -halfW - 5.5, 7.5, 4.5, 1.5);
  ctx.fill();
  ctx.stroke();
  // Right Mirror
  ctx.beginPath();
  ctx.roundRect(halfL * 0.16, halfW + 1.0, 7.5, 4.5, 1.5);
  ctx.fill();
  ctx.stroke();

  // ── LAYER 5: CABIN ROOF, TINTED GLASS & REALISTIC REFLECTIONS ──
  const cabinX = -halfL * 0.13;
  const cabinW = length * 0.54;
  const cabinH = width * 0.76;

  // Dark Rubber Weatherstrip Border
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.roundRect(cabinX - cabinW * 0.5 - 1.5, -cabinH * 0.5 - 1.5, cabinW + 3.0, cabinH + 3.0, 5.0);
  ctx.fill();

  // Front Tinted Windshield Glass
  const windshieldGrad = ctx.createLinearGradient(cabinX + cabinW * 0.22, -cabinH * 0.5, cabinX + cabinW * 0.5, cabinH * 0.5);
  windshieldGrad.addColorStop(0, '#0F172A');
  windshieldGrad.addColorStop(0.4, '#334155');
  windshieldGrad.addColorStop(0.7, '#1E293B');
  windshieldGrad.addColorStop(1, '#020617');

  ctx.fillStyle = windshieldGrad;
  ctx.beginPath();
  ctx.moveTo(cabinX + cabinW * 0.22, -cabinH * 0.48);
  ctx.lineTo(cabinX + cabinW * 0.48, -cabinH * 0.42);
  ctx.lineTo(cabinX + cabinW * 0.48, cabinH * 0.42);
  ctx.lineTo(cabinX + cabinW * 0.22, cabinH * 0.48);
  ctx.closePath();
  ctx.fill();

  // Windshield Specular Sunlight Reflection Streak
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

  // Black Windshield Wiper Blades resting on cowl
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cabinX + cabinW * 0.46, -cabinH * 0.36);
  ctx.lineTo(cabinX + cabinW * 0.32, -cabinH * 0.08);
  ctx.moveTo(cabinX + cabinW * 0.46, 0);
  ctx.lineTo(cabinX + cabinW * 0.32, cabinH * 0.28);
  ctx.stroke();

  // Rear Tinted Window Glass
  const rearGlassGrad = ctx.createLinearGradient(cabinX - cabinW * 0.48, 0, cabinX - cabinW * 0.22, 0);
  rearGlassGrad.addColorStop(0, '#020617');
  rearGlassGrad.addColorStop(0.6, '#1E293B');
  rearGlassGrad.addColorStop(1, '#0F172A');

  ctx.fillStyle = rearGlassGrad;
  ctx.beginPath();
  ctx.moveTo(cabinX - cabinW * 0.22, -cabinH * 0.46);
  ctx.lineTo(cabinX - cabinW * 0.48, -cabinH * 0.40);
  ctx.lineTo(cabinX - cabinW * 0.48, cabinH * 0.40);
  ctx.lineTo(cabinX - cabinW * 0.22, cabinH * 0.46);
  ctx.closePath();
  ctx.fill();

  // Rear window defroster horizontal heater lines
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
  const roofGrad = ctx.createLinearGradient(0, -roofH * 0.5, 0, roofH * 0.5);
  roofGrad.addColorStop(0, '#064E3B');   // Dark Vinyl Emerald
  roofGrad.addColorStop(0.3, '#047857');
  roofGrad.addColorStop(0.5, '#10B981');  // Vinyl grain crown highlight
  roofGrad.addColorStop(0.7, '#047857');
  roofGrad.addColorStop(1, '#064E3B');

  ctx.fillStyle = roofGrad;
  ctx.strokeStyle = '#022C12';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(cabinX - roofW * 0.5, -roofH * 0.5, roofW, roofH, 4.0);
  ctx.fill();
  ctx.stroke();

  // Chrome Halo Trim Molding surrounding the Landau vinyl roof
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(cabinX - roofW * 0.5 + 1.2, -roofH * 0.5 + 1.2, roofW - 2.4, roofH - 2.4);

  // ── LAYER 7: CHROME FRONT BUMPER & WATERFALL GRILLE ──
  const bFrontX = halfL - 3;

  // Massive 1980s Chrome Front Bumper
  const fBumpGrad = ctx.createLinearGradient(0, -halfW * 0.94, 0, halfW * 0.94);
  fBumpGrad.addColorStop(0, '#CBD5E1');
  fBumpGrad.addColorStop(0.5, '#FFFFFF');
  fBumpGrad.addColorStop(1, '#94A3B8');

  ctx.fillStyle = fBumpGrad;
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(bFrontX, -halfW * 0.94, 8.5, width * 0.88, 3.5);
  ctx.fill();
  ctx.stroke();

  // Vertical Black Rubber Bumper Overriders (Nerf Guards)
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(bFrontX - 1, -halfW * 0.48, 10.5, 5.5);
  ctx.fillRect(bFrontX - 1, halfW * 0.38, 10.5, 5.5);

  // Chrome Waterfall Vertical Grille
  ctx.fillStyle = '#020617';
  ctx.fillRect(halfL - 9.5, -halfW * 0.28, 6.8, width * 0.56);
  ctx.fillStyle = '#F1F5F9';
  for (let gy = -halfW * 0.25; gy <= halfW * 0.25; gy += 3.8) {
    ctx.fillRect(halfL - 9.0, gy, 5.8, 1.8);
  }

  // Front Quad Rectangular Sealed-Beam Headlights
  const hLightGrad = ctx.createLinearGradient(0, -5, 0, 5);
  hLightGrad.addColorStop(0, '#FFFFFF');
  hLightGrad.addColorStop(0.5, '#FEF08A');
  hLightGrad.addColorStop(1, '#FDE047');

  ctx.fillStyle = hLightGrad;
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 1.0;

  // Left Headlight Pair
  ctx.fillRect(halfL - 7.0, -halfW * 0.78, 5.5, 8.0);
  ctx.strokeRect(halfL - 7.0, -halfW * 0.78, 5.5, 8.0);
  ctx.fillRect(halfL - 7.0, -halfW * 0.55, 5.5, 8.0);
  ctx.strokeRect(halfL - 7.0, -halfW * 0.55, 5.5, 8.0);

  // Right Headlight Pair
  ctx.fillRect(halfL - 7.0, halfW * 0.38, 5.5, 8.0);
  ctx.strokeRect(halfL - 7.0, halfW * 0.38, 5.5, 8.0);
  ctx.fillRect(halfL - 7.0, halfW * 0.61, 5.5, 8.0);
  ctx.strokeRect(halfL - 7.0, halfW * 0.61, 5.5, 8.0);

  // Amber Corner Turn Indicators (Front Fender edges)
  ctx.fillStyle = '#F59E0B';
  ctx.strokeStyle = '#B45309';
  ctx.fillRect(halfL - 5.5, -halfW * 0.90, 4.0, 5.5);
  ctx.strokeRect(halfL - 5.5, -halfW * 0.90, 4.0, 5.5);
  ctx.fillRect(halfL - 5.5, halfW * 0.78, 4.0, 5.5);
  ctx.strokeRect(halfL - 5.5, halfW * 0.78, 4.0, 5.5);

  // ── LAYER 8: CHROME REAR BUMPER, TAILLIGHTS & LICENSE PLATE ──
  const bRearX = -halfL - 5.5;

  // Chrome Rear Bumper
  const rBumpGrad = ctx.createLinearGradient(0, -halfW * 0.94, 0, halfW * 0.94);
  rBumpGrad.addColorStop(0, '#CBD5E1');
  rBumpGrad.addColorStop(0.5, '#FFFFFF');
  rBumpGrad.addColorStop(1, '#94A3B8');

  ctx.fillStyle = rBumpGrad;
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(bRearX, -halfW * 0.94, 8.5, width * 0.88, 3.5);
  ctx.fill();
  ctx.stroke();

  // Rear Black Rubber Bumper Overriders
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(bRearX - 1, -halfW * 0.48, 10.5, 5.5);
  ctx.fillRect(bRearX - 1, halfW * 0.38, 10.5, 5.5);

  // Ribbed Horizontal Ruby Red & Amber Taillights
  // Left Taillight Cluster (Red Brake + Amber Signal + White Reverse)
  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#7F1D1D';
  ctx.lineWidth = 1.0;
  ctx.fillRect(-halfL + 0.5, -halfW * 0.80, 5.0, 12.5);
  ctx.strokeRect(-halfL + 0.5, -halfW * 0.80, 5.0, 12.5);
  ctx.fillStyle = '#F8FAFC'; // Reverse light segment
  ctx.fillRect(-halfL + 0.5, -halfW * 0.62, 5.0, 3.2);

  // Right Taillight Cluster
  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#7F1D1D';
  ctx.fillRect(-halfL + 0.5, halfW * 0.52, 5.0, 12.5);
  ctx.strokeRect(-halfL + 0.5, halfW * 0.52, 5.0, 12.5);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(-halfL + 0.5, halfW * 0.52, 5.0, 3.2);

  // California Blue/Yellow License Plate ("GROV34L")
  ctx.fillStyle = '#1E3A8A'; // Blue California plate base
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 0.8;
  ctx.fillRect(-halfL + 1.2, -7.5, 4.2, 15.0);
  ctx.strokeRect(-halfL + 1.2, -7.5, 4.2, 15.0);

  // Yellow License Plate Text ("GROVE")
  ctx.fillStyle = '#FBBF24';
  ctx.fillRect(-halfL + 2.0, -5.5, 2.5, 11.0);

  // ── LAYER 9: TWO GROVE STREET HOMIES LEANING OUT OF THE PASSENGER WINDOWS ──
  // Homie 1: Front Passenger Window (White tank-top & Gold chain)
  const h1Aim = car.homie1Aim || 0;
  const h1Recoil = car.homie1Recoil || 0;
  const h1Flash = car.homie1Flash || 0;
  _drawGroveHomie(ctx, cabinX + cabinW * 0.12, halfW * 0.75, h1Aim, h1Recoil, h1Flash, '#F8FAFC');

  // Homie 2: Rear Passenger Window (Grove Street Dark Green flannel shirt)
  const h2Aim = car.homie2Aim || 0;
  const h2Recoil = car.homie2Recoil || 0;
  const h2Flash = car.homie2Flash || 0;
  _drawGroveHomie(ctx, cabinX - cabinW * 0.16, halfW * 0.75, h2Aim, h2Recoil, h2Flash, '#15803D');

  // ── LAYER 10: WHITE HIT-FLASH OVERLAY (WHEN VEHICLE TAKES DAMAGE) ──
  if (car.hitFlashTimer && car.hitFlashTimer > 0) {
    const flashAlpha = Math.min(0.85, (car.hitFlashTimer / 8) * 0.85);
    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.roundRect(-halfL, -halfW, length, width, 6.0);
    ctx.fill();
    car.hitFlashTimer--;
  }

  // ── LAYER 11: STUN / PARALYZE / TIME-STOP VISUAL (Mahoraga Wall Slam Orbiting Golden Rings & Stars) ──
  const isStunnedOrFrozen = Boolean(
    (car.timeStopTimer && car.timeStopTimer > 0) ||
    (car.electricStunTimer && car.electricStunTimer > 0) ||
    (car.hitStunTimer && car.hitStunTimer > 0) ||
    car.isFrozenByInfinity ||
    car.frozenByCronos ||
    car.isTargetOfAmbush ||
    car.caughtInSaitamaFlurry
  );
  if (isStunnedOrFrozen) {
    drawParalyzeEffect(ctx, 44, false, car.timeStopTimer || car.hitStunTimer || 45, '#FFEE58', car);
  }

  ctx.restore();
}
