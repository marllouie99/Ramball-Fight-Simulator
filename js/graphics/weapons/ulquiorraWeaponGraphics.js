// ─────────────────────────────────────────────
// Ulquiorra Cifer — Weapon & Technique Graphics
// Zanpakutō Murciélago & Lanza del Relámpago
// Bleach: Arrancar / Hueco Mundo Arc
//
// Authentic Single-Edged Japanese Katana in True 2D Grid Scan Pixel Art:
// - Uniform 4.8px blade width along the shaft with authentic upward Sori curvature
// - Classic Japanese Kissaki (Tip) with upward Fukura sweep & Yokote line
// - Mint/Seafoam green silk Tsuka-ito wrap over white Samegawa with diamond lozenges (◆ ◆ ◆ ◆ ◆ ◆)
// - Elongated beveled Espada eye Tsuba with curved horn prongs & Brass Habaki
// - Discrete 2D Grid Scan Rasterization (P = 2.0px) with 4-neighbor attached black border shell
// - Rule 11 (Zero shadowBlur - Concentric fills)
// - Rule 15 (Double-tapered crescent slashes)
// - Rule 20 (Skin Only & Hand Visibility)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

/**
 * Checks if a 2D point (x, y) is inside a closed polygon using ray-casting.
 */
function _isPointInPoly(x, y, poly) {
  if (!poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Draws Ulquiorra's Zanpakutō: Murciélago (The Great Black-Winged Bat) in True Stepped Pixel Art Style.
 * Uses 2D grid scan rasterization matching drawUlquiorraPixelBody and _drawUlquiorraPixelWings.
 *
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x Hand anchor X
 * @param {number} y Hand anchor Y
 * @param {number} angle Additional swing angle in radians
 * @param {number} r Fighter radius
 * @param {boolean} isSwinging Whether actively slashing
 * @param {number} swingProgress Progress of the swing (0 to 1)
 */
export function drawUlquiorraMurcielago(ctx, x = 0, y = 0, angle = 0, r = 25, isSwinging = false, swingProgress = 0, opts = {}) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  const custom = (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.ulquiorra)
    ? state.weaponCustomizations.ulquiorra
    : { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };

  const customScale = custom.scale !== undefined ? custom.scale : 1.0;
  const customOffsetX = custom.offsetX !== undefined ? custom.offsetX : 0;
  const customOffsetY = custom.offsetY !== undefined ? custom.offsetY : 0;
  const customAngle = custom.angleOffset !== undefined ? custom.angleOffset : 0;

  ctx.save();
  ctx.translate(x + customOffsetX, y + customOffsetY);
  ctx.rotate(angle + customAngle);
  ctx.scale(customScale, customScale);

  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const swordStartX = 0;
  const bladeLen = opts.bladeLen || 94;
  const bladeBaseX = swordStartX + 5.5;
  const tipX = swordStartX + bladeLen;
  const yokoteX = tipX - 10.0;
  const halfW = 2.4; // 4.8px blade thickness

  // Curvature Sori (Authentic Katana upward arch toward Kissaki)
  const getSori = (xCoord) => {
    const t = Math.max(0, Math.min(1.0, (xCoord - bladeBaseX) / (tipX - bladeBaseX)));
    return -Math.pow(t, 1.45) * 7.5;
  };

  // 1. Blade Polygons
  const steps = 18;
  const spineEdge = [];
  const cuttingEdge = [];
  const ridgeLine = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const curX = bladeBaseX + t * (tipX - bladeBaseX);
    const s = getSori(curX);
    spineEdge.push({ x: curX, y: s - halfW });
    ridgeLine.push({ x: curX, y: s - halfW * 0.25 });
  }

  const cutSteps = 15;
  for (let i = 0; i <= cutSteps; i++) {
    const t = i / cutSteps;
    const curX = bladeBaseX + t * (yokoteX - bladeBaseX);
    const s = getSori(curX);
    cuttingEdge.push({ x: curX, y: s + halfW });
  }

  // Fukura tip curve from yokoteX to tipX
  const fukuraEdge = [
    { x: yokoteX, y: getSori(yokoteX) + halfW },
    { x: yokoteX + 5.0, y: getSori(yokoteX + 5.0) + halfW * 0.4 },
    { x: tipX, y: getSori(tipX) - halfW }
  ];

  // Full Blade Polygon
  const bladePoly = [
    ...spineEdge,
    ...fukuraEdge.slice().reverse(),
    ...cuttingEdge.slice().reverse(),
    { x: bladeBaseX, y: getSori(bladeBaseX) - halfW }
  ];

  // Top Spine Facet Polygon (Mune-ji)
  const munePoly = [
    ...spineEdge,
    { x: tipX, y: getSori(tipX) - halfW },
    ...ridgeLine.slice().reverse(),
    { x: bladeBaseX, y: getSori(bladeBaseX) - halfW }
  ];

  // 2. Habaki Polygon
  const habakiPoly = [
    { x: swordStartX, y: -halfW - 0.8 },
    { x: swordStartX + 5.5, y: -halfW - 0.8 },
    { x: swordStartX + 5.5, y: halfW + 0.8 },
    { x: swordStartX, y: halfW + 0.8 }
  ];

  // 3. Tsuba Polygon (Espada Eye + curved horn prongs)
  const tsubaPoly = [
    { x: 0, y: -9.5 },
    { x: 2.2, y: -11.5 },
    { x: 1.8, y: -6.5 },
    { x: 3.8, y: -3.5 },
    { x: 4.0, y: 0 },
    { x: 3.8, y: 3.5 },
    { x: 1.8, y: 6.5 },
    { x: 0, y: 9.5 },
    { x: -2.2, y: 11.5 },
    { x: -1.8, y: 6.5 },
    { x: -3.8, y: 3.5 },
    { x: -4.0, y: 0 },
    { x: -3.8, y: -3.5 },
    { x: -1.8, y: -6.5 }
  ];

  // 4. Tsuka Hilt & Pommel Polygons
  const hiltStartX = swordStartX - 32.0;
  const hiltPoly = [
    { x: hiltStartX, y: -3.4 },
    { x: swordStartX, y: -3.4 },
    { x: swordStartX, y: 3.4 },
    { x: hiltStartX, y: 3.4 }
  ];

  const pommelPoly = [
    { x: hiltStartX - 3.2, y: -3.8 },
    { x: hiltStartX, y: -3.8 },
    { x: hiltStartX, y: 3.8 },
    { x: hiltStartX - 3.2, y: 3.8 }
  ];

  // 5. Diamonds on Tsuka
  const diamondCenters = [
    hiltStartX + 3.8,
    hiltStartX + 9.2,
    hiltStartX + 14.6,
    hiltStartX + 20.0,
    hiltStartX + 25.4,
    hiltStartX + 30.0
  ];

  // Global Katana Bounding Box
  let minX = -38, maxX = tipX + 4, minY = getSori(tipX) - 15, maxY = 15;

  const startGx = Math.floor(minX / P);
  const endGx   = Math.ceil(maxX / P);
  const startGy = Math.floor(minY / P);
  const endGy   = Math.ceil(maxY / P);

  // Helper tester for any part of the weapon
  const inAnyKatana = (rx, ry) => {
    return _isPointInPoly(rx, ry, bladePoly) ||
           _isPointInPoly(rx, ry, habakiPoly) ||
           _isPointInPoly(rx, ry, tsubaPoly) ||
           _isPointInPoly(rx, ry, hiltPoly) ||
           _isPointInPoly(rx, ry, pommelPoly);
  };

  // ─────────────────────────────────────────────
  // 2D GRID SCAN PIXEL RASTERIZATION LOOP
  // ─────────────────────────────────────────────
  for (let gy = startGy; gy <= endGy; gy++) {
    for (let gx = startGx; gx <= endGx; gx++) {
      const rx = gx * P;
      const ry = gy * P;

      if (!inAnyKatana(rx, ry)) continue;

      const px = snap(rx);
      const py = snap(ry);

      // 4-Neighbor Attached Outer Border Test
      const isBorder = !inAnyKatana(rx + P, ry) ||
                       !inAnyKatana(rx - P, ry) ||
                       !inAnyKatana(rx, ry + P) ||
                       !inAnyKatana(rx, ry - P);

      if (isBorder) {
        ctx.fillStyle = '#080A0E'; // Crisp solid black border shell
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // 1. Pommel
      if (_isPointInPoly(rx, ry, pommelPoly)) {
        ctx.fillStyle = (Math.abs(ry) > 2.0) ? '#475569' : '#CBD5E1';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // 2. Tsuka Hilt (Mint silk wrap with white diamond lozenges)
      if (_isPointInPoly(rx, ry, hiltPoly)) {
        // Check if inside any white diamond lozenge
        let inDiamond = false;
        let isDiamondCenter = false;
        for (let i = 0; i < diamondCenters.length; i++) {
          const cx = diamondCenters[i];
          const ddx = Math.abs(rx - cx);
          const ddy = Math.abs(ry);
          if (ddx / 1.7 + ddy / 1.8 <= 1.0) {
            inDiamond = true;
            if (ddx < 0.9 && ddy < 0.9) isDiamondCenter = true;
            break;
          }
        }

        if (inDiamond) {
          ctx.fillStyle = isDiamondCenter ? '#334155' : '#F8FAFC'; // White rayskin with dark center dot
        } else if (Math.abs(ry) > 2.2) {
          ctx.fillStyle = '#059669'; // Darker emerald edge cord
        } else {
          ctx.fillStyle = '#34D399'; // Vibrant mint green silk wrap
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // 3. Tsuba (Espada Curved Eye Guard)
      if (_isPointInPoly(rx, ry, tsubaPoly)) {
        if (Math.abs(rx) > 2.5 || Math.abs(ry) > 7.0) {
          ctx.fillStyle = '#64748B'; // Silver steel edge bevel
        } else {
          ctx.fillStyle = '#CBD5E1'; // Polished face
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // 4. Habaki (Collar)
      if (_isPointInPoly(rx, ry, habakiPoly)) {
        ctx.fillStyle = (ry < 0) ? '#FFF2A8' : '#E5C158'; // Brass gold collar
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // 5. Blade
      if (_isPointInPoly(rx, ry, bladePoly)) {
        const curSori = getSori(rx);
        const edgeY = curSori + halfW;
        const spineY = curSori - halfW;
        const ridgeY = curSori - halfW * 0.25;

        // Cutting Edge Pixel Layer
        if (ry >= edgeY - P * 0.9 || (rx >= yokoteX && ry >= spineY + (edgeY - spineY) * 0.6)) {
          ctx.fillStyle = '#FFFFFF'; // Razor pure white cutting edge
        }
        // Radiant Emerald Reishi Ridge Line
        else if (Math.abs(ry - ridgeY) <= P * 0.6) {
          ctx.fillStyle = '#00FF88'; // Emerald Reishi fuller gleam
        }
        // Top Spine Facet (Mune-ji)
        else if (_isPointInPoly(rx, ry, munePoly)) {
          ctx.fillStyle = (ry < spineY + P * 0.8) ? '#1E293B' : '#334155'; // Dark tempered spine
        }
        // Polished Blade Face (Hira-ji)
        else {
          ctx.fillStyle = (ry > curSori) ? '#F8FAFC' : '#E2E8F0'; // Gleaming silver steel face
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  ctx.restore();
}

/**
 * Draws Ulquiorra's Lanza del Relámpago (Segunda Etapa Ultimate Spear).
 * A colossal Reishi lightning javelin crackling with nuclear emerald Reishi plasma.
 */
export function drawLanzaDelRelampago(ctx, x = 0, y = 0, angle = 0, r = 25, chargeRatio = 1.0) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const spearLength = 110;
  const pulse = Math.sin(now * 0.015) * 1.5;

  // 1. Concentric Radial Lightning Core Glow (Rule 11 compliant)
  const coreGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 40 * chargeRatio);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  coreGrad.addColorStop(0.35, 'rgba(0, 255, 136, 0.70)');
  coreGrad.addColorStop(0.70, 'rgba(0, 200, 100, 0.25)');
  coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 40 * chargeRatio, 0, Math.PI * 2);
  ctx.fill();

  // 2. Central Lightning Shaft (White-hot energy core)
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.5 + pulse * 0.4;
  ctx.beginPath();
  ctx.moveTo(-spearLength * 0.4, 0);
  ctx.lineTo(spearLength * 0.6, 0);
  ctx.stroke();

  ctx.strokeStyle = '#00FF88';
  ctx.lineWidth = 6.0 + pulse * 0.6;
  ctx.beginPath();
  ctx.moveTo(-spearLength * 0.4, 0);
  ctx.lineTo(spearLength * 0.6, 0);
  ctx.stroke();

  // 3. Dual Spearhead Needle Tips
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#00FF88';
  ctx.lineWidth = 1.5;

  // Forward Tip (+X)
  ctx.beginPath();
  ctx.moveTo(spearLength * 0.6 + 18, 0);
  ctx.lineTo(spearLength * 0.6 - 10, -6);
  ctx.lineTo(spearLength * 0.6 - 4, 0);
  ctx.lineTo(spearLength * 0.6 - 10, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rear Tip (-X)
  ctx.beginPath();
  ctx.moveTo(-spearLength * 0.4 - 14, 0);
  ctx.lineTo(-spearLength * 0.4 + 8, -5);
  ctx.lineTo(-spearLength * 0.4 + 3, 0);
  ctx.lineTo(-spearLength * 0.4 + 8, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. Crackling Arc Flares
  ctx.strokeStyle = '#00FF88';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const t = (now * 0.005 + i * 0.25) % 1.0;
    const lx = -spearLength * 0.3 + t * (spearLength * 0.8);
    const flareY = Math.sin(t * Math.PI * 4 + i) * (8 + pulse);
    ctx.beginPath();
    ctx.moveTo(lx - 6, 0);
    ctx.lineTo(lx, flareY);
    ctx.lineTo(lx + 6, 0);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws Ulquiorra's signature Crescent Blade Slash Arc (Rule 15 Compliant).
 * Features sharp double-tapering and clean dynamic trail wiping.
 */
export function drawUlquiorraSlashArc(ctx, fighter) {
  if (!fighter || !fighter.isSlashing) return;

  const progress = fighter.slashProgress || 0;
  if (progress <= 0 || progress >= 1.0) return;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  const angle = fighter.gunAngle || fighter.angle || 0;
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft && !fighter.isSpinning) {
    ctx.scale(1, -1);
  }

  const r = fighter.r || 25;
  const isSegunda = Boolean(fighter.segundaEtapaActive || fighter.isSegundaEtapa);
  const slashRadius = r * (isSegunda ? 3.4 : 2.8);
  const maxThick = isSegunda ? 18.0 : 14.0;

  // Swing sweep angles
  const startAng = -1.25 + progress * 2.5;
  const arcSpan = Math.PI * 0.95 * Math.sin(progress * Math.PI);

  const N = 24;
  const outerPoly = [];
  const innerPoly = [];

  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const curAng = startAng - arcSpan * (1 - t);
    // Rule 15 double-tapering
    const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
    const thick = maxThick * taper;

    const outR = slashRadius + thick / 2;
    const inR  = slashRadius - thick / 2;

    outerPoly.push({ x: Math.cos(curAng) * outR, y: Math.sin(curAng) * outR });
    innerPoly.push({ x: Math.cos(curAng) * inR,  y: Math.sin(curAng) * inR });
  }

  // Draw Crescent Slash Polygon
  ctx.beginPath();
  outerPoly.forEach((pt, idx) => (idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
  for (let i = innerPoly.length - 1; i >= 0; i--) {
    ctx.lineTo(innerPoly[i].x, innerPoly[i].y);
  }
  ctx.closePath();

  const slashGrad = ctx.createRadialGradient(0, 0, slashRadius - 10, 0, 0, slashRadius + 10);
  if (isSegunda) {
    slashGrad.addColorStop(0, 'rgba(0, 0, 0, 0.90)'); // Black Cero Oscuras core
    slashGrad.addColorStop(0.5, 'rgba(0, 255, 136, 0.95)');
    slashGrad.addColorStop(1, 'rgba(0, 200, 100, 0)');
  } else {
    slashGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    slashGrad.addColorStop(0.4, 'rgba(0, 255, 136, 0.85)');
    slashGrad.addColorStop(1, 'rgba(0, 200, 100, 0)');
  }
  ctx.fillStyle = slashGrad;
  ctx.fill();

  ctx.restore();
}
