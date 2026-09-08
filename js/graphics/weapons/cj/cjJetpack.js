// ─────────────────────────────────────────────
// CJ DARPA Area 69 Jetpack Graphics
// ─────────────────────────────────────────────

import { state } from '../../../core/state.js';
import { isDarkMode } from './cjShared.js';

export function drawCjJetpackWeapon(ctx, x = 0, y = 0, gunAngle = 0, r = 25, opts = {}) {
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
      posX = x + (r * 0.4);
      posY = y;
      scale = (opts && opts.scale) ? opts.scale : 1.15;
    } else if (typeof r === 'object') {
      opts = r;
      scale = opts.scale || 1.0;
    }
  }

  ctx.translate(posX, posY);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // ── LAYER 0: REAR HARNESS & MATTE INDUSTRIAL SILVER / BRUSHED ALUMINUM BACKING FRAME ──
  const frameGrad = ctx.createLinearGradient(-24, -20, 24, 26);
  frameGrad.addColorStop(0.00, '#64748B'); // Brushed aluminum dark edge
  frameGrad.addColorStop(0.25, '#94A3B8');
  frameGrad.addColorStop(0.50, '#CBD5E1'); // Metallic silver sheen
  frameGrad.addColorStop(0.80, '#94A3B8');
  frameGrad.addColorStop(1.00, '#475569');

  ctx.fillStyle = frameGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.roundRect(-24, -20, 48, 46, 4);
  ctx.fill();
  ctx.stroke();

  // Visible Metallic Structural Panels & Weld Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-22, 2);
  ctx.lineTo(22, 2);
  ctx.stroke();

  // Dark-Tan Leather Harness Straps with Heavy Buckles (Crossing Backplate)
  ctx.fillStyle = '#784B28'; // Dark-tan leather strap
  ctx.strokeStyle = '#3D2514';
  ctx.lineWidth = 1.0;
  ctx.fillRect(-22, -18, 44, 4.0);
  ctx.strokeRect(-22, -18, 44, 4.0);
  ctx.fillRect(-22, 18, 44, 4.0);
  ctx.strokeRect(-22, 18, 44, 4.0);

  // Heavy Silver Harness Buckles
  ctx.fillStyle = '#E2E8F0';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.fillRect(-18, -19, 5.0, 6.0);
  ctx.strokeRect(-18, -19, 5.0, 6.0);
  ctx.fillRect(13, -19, 5.0, 6.0);
  ctx.strokeRect(13, -19, 5.0, 6.0);

  // Central Vertical Manifold Riser Block (Matte Brushed Aluminum)
  const riserGrad = ctx.createLinearGradient(-5, 0, 5, 0);
  riserGrad.addColorStop(0.0, '#64748B');
  riserGrad.addColorStop(0.5, '#CBD5E1');
  riserGrad.addColorStop(1.0, '#475569');
  ctx.fillStyle = riserGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.6;
  ctx.fillRect(-5, -28, 10, 10);
  ctx.strokeRect(-5, -28, 10, 10);

  // ── LAYER 1: DUAL MUTED OLIVE DRAB / MILITARY GREEN FUEL TANKS ──
  const tankW = 16.0;
  const tankH = 54.0;
  const tankTopY = -22.0;
  const tankBtmY = tankTopY + tankH;
  const tankXs = [-25.0, 9.0]; // Left and Right Tank X coordinates

  for (let i = 0; i < tankXs.length; i++) {
    const tX = tankXs[i];
    const isLeft = (i === 0);

    // Curved Silver Feeder Tube from Tank Dome to Top Manifold (with black outline)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tX + tankW * 0.5, tankTopY);
    ctx.quadraticCurveTo(tX + tankW * 0.5, tankTopY - 6, (isLeft ? -4 : 4), -26);
    ctx.stroke();

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // 3D Muted Olive Drab / Military Green Cylinder Gradient
    const tankGrad = ctx.createLinearGradient(tX, 0, tX + tankW, 0);
    tankGrad.addColorStop(0.00, '#2E381C'); // Shadowed olive drab
    tankGrad.addColorStop(0.18, '#44542A'); // Military olive body
    tankGrad.addColorStop(0.40, '#657B3E'); // Top specular military sheen
    tankGrad.addColorStop(0.70, '#44542A'); // Matte green
    tankGrad.addColorStop(1.00, '#1D2411'); // Dark underside shadow

    ctx.fillStyle = tankGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(tX, tankTopY, tankW, tankH, 8.0);
    ctx.fill();
    ctx.stroke();

    // Top Dome Specular Arc Highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(tX + tankW * 0.5, tankTopY + 7.5, 5.5, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Vertical Cyan Sight Glass Fuel Gauge Slot
    const glassX = isLeft ? (tX + 2.5) : (tX + tankW - 6.5);
    const glassY = tankTopY + 14;
    const glassW = 4.0;
    const glassH = 26.0;

    // Recessed Dark Housing
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(glassX, glassY, glassW, glassH, 1.8);
    ctx.fill();
    ctx.stroke();

    // Glowing Cyan Fuel Column
    const fuelGrad = ctx.createLinearGradient(glassX, glassY, glassX + glassW, glassY);
    fuelGrad.addColorStop(0.0, '#0284C7');
    fuelGrad.addColorStop(0.5, '#38BDF8');
    fuelGrad.addColorStop(1.0, '#7DD3FC');
    ctx.fillStyle = fuelGrad;
    ctx.fillRect(glassX + 0.6, glassY + 0.6, glassW - 1.2, glassH - 1.2);

    // White Glint Line on Glass
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(glassX + 0.9, glassY + 2.0, 0.8, glassH - 4.0);

    // Dark Canvas Strap with Heavy Buckles
    const strapY = tankTopY + 9.5;
    const strapH = 6.5;
    const strapGrad = ctx.createLinearGradient(tX - 1, 0, tX + tankW + 1, 0);
    strapGrad.addColorStop(0, '#181B14');
    strapGrad.addColorStop(0.4, '#2B3024');
    strapGrad.addColorStop(1, '#11140E');

    ctx.fillStyle = strapGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.8;
    ctx.fillRect(tX - 1.2, strapY, tankW + 2.4, strapH);
    ctx.strokeRect(tX - 1.2, strapY, tankW + 2.4, strapH);

    // Heavy Silver Buckle Clasp
    ctx.fillStyle = '#CBD5E1';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.8;
    ctx.fillRect(tX + 2.5, strapY + 1.2, 4.0, strapH - 2.4);
    ctx.strokeRect(tX + 2.5, strapY + 1.2, 4.0, strapH - 2.4);
    ctx.fillRect(tX + tankW - 6.5, strapY + 1.2, 4.0, strapH - 2.4);
    ctx.strokeRect(tX + tankW - 6.5, strapY + 1.2, 4.0, strapH - 2.4);
  }

  // ── LAYER 2: CENTRAL OLIVE-DRAB AVIONICS & CONTROL MODULE ──
  const boxW = 20.0;
  const boxH = 48.0;
  const boxX = -boxW * 0.5;
  const boxY = -16.0;

  const boxGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
  boxGrad.addColorStop(0.0, '#44542A');
  boxGrad.addColorStop(0.5, '#3B4824');
  boxGrad.addColorStop(1.0, '#242C16');

  ctx.fillStyle = boxGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 2.5);
  ctx.fill();
  ctx.stroke();

  // 4 Copper/Brass Curved Wiring Conduits / Brackets connecting Box to Tanks
  const copperYs = [boxY + 18, boxY + 24];
  for (const cY of copperYs) {
    // Left Copper Bracket
    const cGradL = ctx.createLinearGradient(boxX - 4, cY, boxX, cY);
    cGradL.addColorStop(0, '#B45309');
    cGradL.addColorStop(0.5, '#F59E0B');
    cGradL.addColorStop(1, '#92400E');
    ctx.fillStyle = cGradL;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.4;
    ctx.fillRect(boxX - 4.0, cY - 1.5, 4.5, 3.0);
    ctx.strokeRect(boxX - 4.0, cY - 1.5, 4.5, 3.0);

    // Right Copper Bracket
    const cGradR = ctx.createLinearGradient(boxX + boxW, cY, boxX + boxW + 4, cY);
    cGradR.addColorStop(0, '#92400E');
    cGradR.addColorStop(0.5, '#F59E0B');
    cGradR.addColorStop(1, '#B45309');
    ctx.fillStyle = cGradR;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.4;
    ctx.fillRect(boxX + boxW - 0.5, cY - 1.5, 4.5, 3.0);
    ctx.strokeRect(boxX + boxW - 0.5, cY - 1.5, 4.5, 3.0);
  }

  // A. Upper Instrument Section Bay
  const upperBayX = boxX + 2.0;
  const upperBayY = boxY + 2.5;
  const upperBayW = boxW - 4.0;
  const upperBayH = 15.0;

  ctx.fillStyle = '#1D2411';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.fillRect(upperBayX, upperBayY, upperBayW, upperBayH);
  ctx.strokeRect(upperBayX, upperBayY, upperBayW, upperBayH);

  // White Status Display Monitor
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.fillRect(upperBayX + 2.0, upperBayY + 2.0, upperBayW - 4.0, 3.2);
  ctx.strokeRect(upperBayX + 2.0, upperBayY + 2.0, upperBayW - 4.0, 3.2);

  // Red Rectangular Command Button
  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.9;
  ctx.fillRect(upperBayX + 2.0, upperBayY + 6.8, 6.5, 3.0);
  ctx.strokeRect(upperBayX + 2.0, upperBayY + 6.8, 6.5, 3.0);

  // Status LED Array (Amber, Cyan, Green)
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(upperBayX + 2.0, upperBayY + 11.0, 2.8, 2.2);
  ctx.fillStyle = '#06B6D4';
  ctx.fillRect(upperBayX + 5.6, upperBayY + 11.0, 2.8, 2.2);
  ctx.fillStyle = '#10B981';
  ctx.fillRect(upperBayX + 9.2, upperBayY + 11.0, 2.8, 2.2);

  // B. Center Authentic Red/Black Caution Hazard Warning Sticker
  const hazX = boxX + 3.5;
  const hazY = boxY + 19.5;
  const hazW = boxW - 7.0;
  const hazH = 12.0;

  ctx.save();
  ctx.beginPath();
  ctx.rect(hazX, hazY, hazW, hazH);
  ctx.clip();

  // Solid Red Base
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(hazX, hazY, hazW, hazH);

  // Bold Black Diagonal Stripes
  ctx.fillStyle = '#111827';
  for (let sx = -hazW * 2; sx <= hazW * 3; sx += 4.5) {
    ctx.beginPath();
    ctx.moveTo(hazX + sx, hazY);
    ctx.lineTo(hazX + sx + 3.0, hazY);
    ctx.lineTo(hazX + sx + 3.0 - 5.0, hazY + hazH);
    ctx.lineTo(hazX + sx - 5.0, hazY + hazH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(hazX, hazY, hazW, hazH);

  // C. Lower Switch Section Bay
  const lowerBayX = boxX + 2.0;
  const lowerBayY = boxY + 33.5;
  const lowerBayW = boxW - 4.0;
  const lowerBayH = 12.0;

  ctx.fillStyle = '#1D2411';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.fillRect(lowerBayX, lowerBayY, lowerBayW, lowerBayH);
  ctx.strokeRect(lowerBayX, lowerBayY, lowerBayW, lowerBayH);

  // 3 Stacked Rectangular Pushbuttons (Red, Red, Gold)
  const swColors = ['#DC2626', '#DC2626', '#EAB308'];
  for (let sIdx = 0; sIdx < swColors.length; sIdx++) {
    const sY = lowerBayY + 1.8 + sIdx * 3.4;
    ctx.fillStyle = swColors[sIdx];
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.9;
    ctx.fillRect(lowerBayX + 2.5, sY, lowerBayW - 5.0, 2.2);
    ctx.strokeRect(lowerBayX + 2.5, sY, lowerBayW - 5.0, 2.2);
  }

  // ── LAYER 3: TOP OVERHEAD EXHAUST MANIFOLD (Dark Charcoal / Burnt-Metal Steel Cross-Pipe) ──
  const archLeftX = -38.0;
  const archRightX = 38.0;
  const archTopY = -34.0;
  const elbowY = -14.0;

  // 1. Pipe Black Outer Outline Stroke Underlayer
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 13.0;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(archLeftX, elbowY);
  ctx.quadraticCurveTo(archLeftX, archTopY, 0, archTopY);
  ctx.quadraticCurveTo(archRightX, archTopY, archRightX, elbowY);
  ctx.stroke();

  // 2. Main Dark Charcoal / Burnt-Metal Steel Pipe Body
  const pipeGrad = ctx.createLinearGradient(archLeftX, 0, archRightX, 0);
  pipeGrad.addColorStop(0.0, '#1C1E24');
  pipeGrad.addColorStop(0.25, '#3B424D');
  pipeGrad.addColorStop(0.5, '#16191F');
  pipeGrad.addColorStop(0.75, '#3B424D');
  pipeGrad.addColorStop(1.0, '#1C1E24');

  ctx.strokeStyle = pipeGrad;
  ctx.lineWidth = 8.5;
  ctx.beginPath();
  ctx.moveTo(archLeftX, elbowY);
  ctx.quadraticCurveTo(archLeftX, archTopY, 0, archTopY);
  ctx.quadraticCurveTo(archRightX, archTopY, archRightX, elbowY);
  ctx.stroke();

  // 3. Specular Highlight Center Curve
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(archLeftX + 2, elbowY - 2);
  ctx.quadraticCurveTo(archLeftX + 2, archTopY + 2, 0, archTopY + 2);
  ctx.quadraticCurveTo(archRightX - 2, archTopY + 2, archRightX - 2, elbowY - 2);
  ctx.stroke();

  // ── LAYER 4: DOWNWARD-FACING THRUSTER NOZZLES (Burnt-Metal Steel & Heat-Treated Rings) ──
  const nozzleXs = [archLeftX, archRightX];

  for (let n = 0; n < nozzleXs.length; n++) {
    const nX = nozzleXs[n];

    // A. Heat-Treated Burnt Bronze/Steel Collar Ring
    const ringW = 9.0;
    const ringH = 5.0;
    const ringY = elbowY;
    const ringGrad = ctx.createLinearGradient(nX - ringW * 0.5, 0, nX + ringW * 0.5, 0);
    ringGrad.addColorStop(0.0, '#78350F');
    ringGrad.addColorStop(0.35, '#D97706');
    ringGrad.addColorStop(0.7, '#92400E');
    ringGrad.addColorStop(1.0, '#451A03');

    ctx.fillStyle = ringGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(nX - ringW * 0.5, ringY, ringW, ringH, 1.2);
    ctx.fill();
    ctx.stroke();

    // B. Tapered Dark Charcoal / Burnt Steel Nozzle Cone
    const coneTopW = 8.2;
    const coneBtmW = 5.2;
    const coneTopY = ringY + ringH;
    const coneH = 8.0;
    const coneBtmY = coneTopY + coneH;

    const coneGrad = ctx.createLinearGradient(nX - coneTopW * 0.5, 0, nX + coneTopW * 0.5, 0);
    coneGrad.addColorStop(0.0, '#1C1E24');
    coneGrad.addColorStop(0.35, '#3F4654');
    coneGrad.addColorStop(0.7, '#2A303C');
    coneGrad.addColorStop(1.0, '#121418');

    ctx.fillStyle = coneGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(nX - coneTopW * 0.5, coneTopY);
    ctx.lineTo(nX + coneTopW * 0.5, coneTopY);
    ctx.lineTo(nX + coneBtmW * 0.5, coneBtmY);
    ctx.lineTo(nX - coneBtmW * 0.5, coneBtmY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Open Exhaust Rim
    ctx.fillStyle = '#09090B';
    ctx.beginPath();
    ctx.ellipse(nX, coneBtmY, coneBtmW * 0.5, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // ── LAYER 5: LEFT-SIDE THROTTLE EXTENSION ARM & FLIGHT STICK (Reference Image 2 & 3) ──
  ctx.save();
  // Structural Curved Olive-Drab Arm
  const armGrad = ctx.createLinearGradient(-26, 10, -48, 22);
  armGrad.addColorStop(0.0, '#4D5824');
  armGrad.addColorStop(0.5, '#5E6B2C');
  armGrad.addColorStop(1.0, '#343C18');

  ctx.fillStyle = armGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-25, 10);
  ctx.quadraticCurveTo(-36, 12, -47, 21);
  ctx.lineTo(-47, 26);
  ctx.quadraticCurveTo(-36, 17, -25, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Side Avionics Switch Box
  ctx.fillStyle = '#22280F';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.fillRect(-41, 14, 7.5, 9.0);
  ctx.strokeRect(-41, 14, 7.5, 9.0);

  // Red & Cyan Instrument Buttons on Arm
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(-39.5, 15.5, 4.5, 2.2);
  ctx.fillStyle = '#06B6D4';
  ctx.fillRect(-39.5, 19.2, 4.5, 2.2);

  // Flight Control Stick (Grip Handle & Thumb Trigger)
  const gripX = -49.0;
  const gripTopY = 8.0;
  const gripH = 15.0;

  ctx.fillStyle = '#18181B';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(gripX - 2.5, gripTopY, 5.0, gripH, 2.0);
  ctx.fill();
  ctx.stroke();

  // Grip Rib Texture
  ctx.strokeStyle = '#3F3F46';
  ctx.lineWidth = 0.8;
  for (let g = 0; g < 3; g++) {
    const gy = gripTopY + 4 + g * 3;
    ctx.beginPath();
    ctx.moveTo(gripX - 2, gy);
    ctx.lineTo(gripX + 2, gy);
    ctx.stroke();
  }

  // Red Top Thumb Button
  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(gripX, gripTopY - 0.5, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  ctx.restore();
}
