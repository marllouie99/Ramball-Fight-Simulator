// ─────────────────────────────────────────────
// CJ's Skill 2: Dropped DARPA Jetpack Floating Item Pickup
// Spawns on the ground when Rocketman flight expires.
// Floats with smooth vertical sine wave bobbing, rotates continuously
// in full 360° pseudo-3D perspective, projects dynamic ground drop shadow,
// and emits classic GTA item pickup corona rings & sparkling glints.
// Rule 11 & Rule 12 Compliant (Zero shadowBlur CPU filters)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

if (typeof state !== 'undefined' && !state.cjDroppedJetpacks) {
  state.cjDroppedJetpacks = [];
}

/**
 * Spawns a floating 360-degree rotating Jetpack item at the specified ground coordinates
 * @param {number} x Ground X coordinate
 * @param {number} y Ground Y coordinate
 */
export function spawnDroppedJetpack(x, y) {
  if (typeof state === 'undefined') return;
  if (!state.cjDroppedJetpacks) state.cjDroppedJetpacks = [];

  state.cjDroppedJetpacks.push({
    x: Number(x) || 0,
    y: Number(y) || 0,
    spawnTime: (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    phaseOffset: Math.random() * Math.PI * 2,
    sparkleTimer: 0,
    alpha: 1.0,
    sparkles: []
  });
}

/**
 * Updates floating jetpack animations and pickup sparkle particles
 */
export function updateFloatingJetpacks() {
  if (typeof state === 'undefined' || !state.cjDroppedJetpacks) return;

  for (let i = state.cjDroppedJetpacks.length - 1; i >= 0; i--) {
    const item = state.cjDroppedJetpacks[i];
    if (!item) continue;

    // Spawn tiny golden pickup sparkle stars periodically
    item.sparkleTimer = (item.sparkleTimer || 0) + 1;
    if (item.sparkleTimer % 14 === 0) {
      if (!item.sparkles) item.sparkles = [];
      if (item.sparkles.length < 8) {
        item.sparkles.push({
          x: item.x + (Math.random() - 0.5) * 32,
          y: item.y - 18 + (Math.random() - 0.5) * 22,
          vy: -0.35 - Math.random() * 0.45,
          life: 28,
          maxLife: 28,
          size: 2.8 + Math.random() * 2.2,
          color: (Math.random() > 0.35) ? '#FBBF24' : '#60A5FA'
        });
      }
    }

    // Update internal sparkles
    if (item.sparkles && item.sparkles.length > 0) {
      for (let s = item.sparkles.length - 1; s >= 0; s--) {
        const sp = item.sparkles[s];
        sp.y += sp.vy;
        sp.life--;
        if (sp.life <= 0) {
          item.sparkles.splice(s, 1);
        }
      }
    }
  }
}

/**
 * Draws a 4-point diamond sparkle glint
 */
function _draw4PointStar(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.quadraticCurveTo(cx, cy, cx + size * 0.3, cy);
  ctx.quadraticCurveTo(cx, cy, cx + size, cy);
  ctx.quadraticCurveTo(cx, cy, cx + size * 0.3, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + size);
  ctx.quadraticCurveTo(cx, cy, cx - size * 0.3, cy);
  ctx.quadraticCurveTo(cx, cy, cx - size, cy);
  ctx.quadraticCurveTo(cx, cy, cx - size * 0.3, cy);
  ctx.closePath();
  ctx.fill();
}

/**
 * Renders the authentic GTA San Andreas DARPA Jetpack 3D model in rotating perspective
 */
function _drawFloatingJetpackModel(ctx, facingFront, cosRot) {
  const tankW = 12.0;
  const tankH = 38.0;
  const tankHalfH = tankH * 0.5;

  // 1. Rear Mounting Frame & Riser Block
  ctx.fillStyle = '#1A1D24';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(-16, -14, 32, 30, 2.5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#232730';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.2;
  ctx.fillRect(-3.5, -tankHalfH - 4, 7, 6);
  ctx.strokeRect(-3.5, -tankHalfH - 4, 7, 6);

  // 2. Twin Brushed Chrome / Silver Fuel Cylinders (Left & Right)
  const leftX = -17.5;
  const rightX = 5.5;
  const tankXs = [leftX, rightX];

  for (let t = 0; t < tankXs.length; t++) {
    const tx = tankXs[t];
    const isLeft = (t === 0);

    // Silver Feeder Tube from Tank Dome to Top Manifold (with black outline)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx + tankW * 0.5, -tankHalfH);
    ctx.quadraticCurveTo(tx + tankW * 0.5, -tankHalfH - 4, (isLeft ? -2.5 : 2.5), -tankHalfH - 4);
    ctx.stroke();

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 3D Metallic Brushed Chrome/Silver Gradient
    const tankGrad = ctx.createLinearGradient(tx, 0, tx + tankW, 0);
    tankGrad.addColorStop(0.00, '#475569');
    tankGrad.addColorStop(0.15, '#94A3B8');
    tankGrad.addColorStop(0.35, '#FFFFFF'); // Specular highlight reflection
    tankGrad.addColorStop(0.55, '#E2E8F0');
    tankGrad.addColorStop(0.82, '#CBD5E1');
    tankGrad.addColorStop(1.00, '#334155');

    ctx.fillStyle = tankGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(tx, -tankHalfH, tankW, tankH, 5.5);
    ctx.fill();
    ctx.stroke();

    // Vertical Cyan Sight Glass Fuel Gauge
    const glassX = isLeft ? (tx + 1.8) : (tx + tankW - 4.2);
    const glassY = -tankHalfH + 9;
    const glassW = 2.4;
    const glassH = 18.0;

    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.0;
    ctx.fillRect(glassX, glassY, glassW, glassH);
    ctx.strokeRect(glassX, glassY, glassW, glassH);

    const fuelGrad = ctx.createLinearGradient(glassX, glassY, glassX + glassW, glassY);
    fuelGrad.addColorStop(0, '#0284C7');
    fuelGrad.addColorStop(0.5, '#38BDF8');
    fuelGrad.addColorStop(1, '#7DD3FC');
    ctx.fillStyle = fuelGrad;
    ctx.fillRect(glassX + 0.4, glassY + 0.4, glassW - 0.8, glassH - 0.8);

    // Olive-Drab Clamp Strap
    const strapY = -tankHalfH + 6.5;
    const strapH = 4.0;
    ctx.fillStyle = '#4D5824';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.4;
    ctx.fillRect(tx - 0.8, strapY, tankW + 1.6, strapH);
    ctx.strokeRect(tx - 0.8, strapY, tankW + 1.6, strapH);
  }

  // 3. Central Olive-Drab Engine & Avionics Core Module
  const boxW = 14.0;
  const boxH = 34.0;
  const boxX = -boxW * 0.5;
  const boxY = -12.0;

  const boxGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
  boxGrad.addColorStop(0.0, '#5E6B2C');
  boxGrad.addColorStop(0.5, '#4D5824');
  boxGrad.addColorStop(1.0, '#343C18');

  ctx.fillStyle = boxGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 2.0);
  ctx.fill();
  ctx.stroke();

  // Upper Display Monitor & Buttons
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.fillRect(boxX + 1.5, boxY + 2.0, boxW - 3.0, 2.6);
  ctx.strokeRect(boxX + 1.5, boxY + 2.0, boxW - 3.0, 2.6);

  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.7;
  ctx.fillRect(boxX + 1.5, boxY + 5.5, 4.0, 2.0);
  ctx.strokeRect(boxX + 1.5, boxY + 5.5, 4.0, 2.0);

  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(boxX + 1.5, boxY + 8.2, 2.0, 1.6);
  ctx.fillStyle = '#06B6D4';
  ctx.fillRect(boxX + 4.0, boxY + 8.2, 2.0, 1.6);
  ctx.fillStyle = '#10B981';
  ctx.fillRect(boxX + 6.5, boxY + 8.2, 2.0, 1.6);

  // Center Red/Black Caution Hazard Warning Sticker
  const hazX = boxX + 2.0;
  const hazY = boxY + 13.0;
  const hazW = boxW - 4.0;
  const hazH = 8.5;

  ctx.save();
  ctx.beginPath();
  ctx.rect(hazX, hazY, hazW, hazH);
  ctx.clip();
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(hazX, hazY, hazW, hazH);

  ctx.fillStyle = '#111827';
  for (let sx = -hazW * 2; sx <= hazW * 3; sx += 3.2) {
    ctx.beginPath();
    ctx.moveTo(hazX + sx, hazY);
    ctx.lineTo(hazX + sx + 2.0, hazY);
    ctx.lineTo(hazX + sx + 2.0 - 3.5, hazY + hazH);
    ctx.lineTo(hazX + sx - 3.5, hazY + hazH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(hazX, hazY, hazW, hazH);

  // Lower Pushbuttons
  const swCols = ['#DC2626', '#DC2626', '#EAB308'];
  for (let s = 0; s < swCols.length; s++) {
    const sY = boxY + 23.5 + s * 2.4;
    ctx.fillStyle = swCols[s];
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.6;
    ctx.fillRect(boxX + 1.8, sY, boxW - 3.6, 1.6);
    ctx.strokeRect(boxX + 1.8, sY, boxW - 3.6, 1.6);
  }

  // 4. Glossy Black Overhead Cross-Pipe Manifold
  const archLeftX = -27.0;
  const archRightX = 27.0;
  const archTopY = -tankHalfH - 5.0;
  const elbowY = -tankHalfH + 5.0;

  // Black Outer Stroke Underlayer
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 9.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(archLeftX, elbowY);
  ctx.quadraticCurveTo(archLeftX, archTopY, 0, archTopY);
  ctx.quadraticCurveTo(archRightX, archTopY, archRightX, elbowY);
  ctx.stroke();

  const pipeGrad = ctx.createLinearGradient(archLeftX, 0, archRightX, 0);
  pipeGrad.addColorStop(0.0, '#1E2228');
  pipeGrad.addColorStop(0.25, '#3B424D');
  pipeGrad.addColorStop(0.5, '#181A1F');
  pipeGrad.addColorStop(0.75, '#3B424D');
  pipeGrad.addColorStop(1.0, '#1E2228');

  ctx.strokeStyle = pipeGrad;
  ctx.lineWidth = 6.0;
  ctx.beginPath();
  ctx.moveTo(archLeftX, elbowY);
  ctx.quadraticCurveTo(archLeftX, archTopY, 0, archTopY);
  ctx.quadraticCurveTo(archRightX, archTopY, archRightX, elbowY);
  ctx.stroke();

  // 5. Downward Thruster Nozzles with Bronze Collars
  const nozzleXs = [archLeftX, archRightX];
  for (let n = 0; n < nozzleXs.length; n++) {
    const nX = nozzleXs[n];

    // Metallic Bronze Ring Collar
    const ringW = 6.5;
    const ringH = 3.5;
    const ringY = elbowY;
    const ringGrad = ctx.createLinearGradient(nX - ringW * 0.5, 0, nX + ringW * 0.5, 0);
    ringGrad.addColorStop(0.0, '#92400E');
    ringGrad.addColorStop(0.35, '#FDE047');
    ringGrad.addColorStop(0.7, '#D97706');
    ringGrad.addColorStop(1.0, '#78350F');

    ctx.fillStyle = ringGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(nX - ringW * 0.5, ringY, ringW, ringH, 0.8);
    ctx.fill();
    ctx.stroke();

    // Tapered Titanium Nozzle Cone
    const coneTopW = 5.8;
    const coneBtmW = 3.6;
    const coneTopY = ringY + ringH;
    const coneH = 5.5;
    const coneBtmY = coneTopY + coneH;

    ctx.fillStyle = '#27272A';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(nX - coneTopW * 0.5, coneTopY);
    ctx.lineTo(nX + coneTopW * 0.5, coneTopY);
    ctx.lineTo(nX + coneBtmW * 0.5, coneBtmY);
    ctx.lineTo(nX - coneBtmW * 0.5, coneBtmY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Nozzle Core Glow
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.ellipse(nX, coneBtmY, coneBtmW * 0.45, 1.0, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draws all active floating, 360-degree rotating Jetpack pickups on the arena floor
 */
export function drawFloatingJetpacks(ctx) {
  if (typeof state === 'undefined' || !state.cjDroppedJetpacks || state.cjDroppedJetpacks.length === 0) return;

  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  for (let i = 0; i < state.cjDroppedJetpacks.length; i++) {
    const item = state.cjDroppedJetpacks[i];
    if (!item) continue;

    const time = now * 0.0014 + item.phaseOffset; // Elegant, steady 360° rotation speed
    const hoverZ = 16 + Math.sin(time * 2.2) * 5.0; // Smooth 11px to 21px vertical floating bob
    const rotAngle = time; // Continuous 360° rotation angle
    const cosRot = Math.cos(rotAngle);
    const sinRot = Math.sin(rotAngle);

    // ── 1. GROUND PICKUP DROP SHADOW ──
    const shadowScale = Math.max(0.65, 1.0 - (hoverZ / 40) * 0.35);
    const shadowAlpha = Math.max(0.18, (0.45 - (hoverZ / 40) * 0.22) * (item.alpha || 1.0));

    ctx.save();
    ctx.translate(item.x, item.y + 6);
    ctx.scale(1.0, 0.42);
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(0, 0, 24 * shadowScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── 2. GTA ROTATING GOLDEN PICKUP CORONA / HALO AURA ──
    ctx.save();
    ctx.translate(item.x, item.y - hoverZ);

    const auraAlpha = 0.24 + Math.sin(time * 2.2) * 0.08;
    const coronaGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, 34);
    coronaGrad.addColorStop(0, `rgba(251, 191, 36, ${(auraAlpha * 1.25).toFixed(3)})`);
    coronaGrad.addColorStop(0.55, `rgba(245, 158, 11, ${(auraAlpha * 0.65).toFixed(3)})`);
    coronaGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');

    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();

    // ── 3. ROTATING 360° JETPACK MODEL (3D Pseudo-Perspective Transform) ──
    // Horizontal perspective scaling by cosRot gives authentic 3D rotating pickup rotation
    const facingFront = (sinRot >= 0);
    const horizScale = Math.abs(cosRot);
    const sign = cosRot >= 0 ? 1 : -1;

    ctx.scale(Math.max(0.14, horizScale) * sign, 1.0);

    _drawFloatingJetpackModel(ctx, facingFront, cosRot);

    ctx.restore();

    // ── 4. PICKUP SPARKLE STARS ──
    if (item.sparkles && item.sparkles.length > 0) {
      ctx.save();
      for (const sp of item.sparkles) {
        const spAlpha = Math.min(1.0, sp.life / 10);
        ctx.fillStyle = sp.color || '#FBBF24';
        ctx.globalAlpha = spAlpha;
        _draw4PointStar(ctx, sp.x, sp.y, sp.size);
      }
      ctx.restore();
    }
  }
}

/**
 * Clears all active floating jetpack items on round or match reset
 */
export function clearFloatingJetpacks() {
  if (typeof state === 'undefined' || !state.cjDroppedJetpacks) return;
  state.cjDroppedJetpacks.length = 0;
}
