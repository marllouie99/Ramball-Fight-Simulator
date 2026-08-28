// ─────────────────────────────────────────────
// MAHORAGA FIGHTER SKIN & BODY GRAPHICS MODULE
// Contains eye-socket wings, ritual chest necklace, and facial features.
// ─────────────────────────────────────────────

let cachedWingUL = null;
let cachedWingUR = null;
let cachedWingLL = null;
let cachedWingLR = null;

function renderSingleWingBuffer(r, side, isUpper) {
  // Render at HALF resolution — when drawn at 2x with imageSmoothingEnabled=false,
  // this creates clean pixel art: smooth filled interiors with crisp stepped edges
  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.translate(90, 55);
  // Scale down to 50% — all geometry stays original size but renders half-res
  ctx.scale(0.5, 0.5);

  // Colors for divine feathered wings:
  const featherWhite = '#FAFAF8';
  const featherLight = '#E8E8E0';
  const featherGrey = '#C8C8C0';
  const featherDark = '#383830';
  const outlineColor = '#000000';

  function drawFeatherWing(layerIndex) {
    ctx.save();

    const layerTilt = side * (isUpper ? -0.07 : 0.07) * layerIndex;
    ctx.rotate(layerTilt);

    const rootX = side * r * 0.06;
    const rootY = isUpper ? -r * 0.58 : -r * 0.33;

    const layerOffset = layerIndex * 0.12;
    const baseLength = isUpper ? 2.1 : 1.8;
    const tipX = side * r * (baseLength + layerOffset);
    const tipY = isUpper ? -r * (1.05 + layerOffset * 0.25) : -r * (0.52 + layerOffset * 0.18);

    const cp1x = side * r * (0.35 + layerOffset * 0.12);
    const cp1y = isUpper ? -r * (1.75 + layerOffset * 0.28) : -r * (0.95 + layerOffset * 0.20);
    const cp2x = side * r * (0.95 + layerOffset * 0.18);
    const cp2y = isUpper ? -r * (0.75 + layerOffset * 0.12) : -r * (0.38 + layerOffset * 0.08);

    const getTopPoint = (t) => {
      const mt = 1 - t;
      return { x: mt*mt*mt*rootX + 3*mt*mt*t*cp1x + 3*mt*t*t*cp2x + t*t*t*tipX,
               y: mt*mt*mt*rootY + 3*mt*mt*t*cp1y + 3*mt*t*t*cp2y + t*t*t*tipY };
    };

    const botCpX = (rootX + tipX) * 0.5 + side * r * 0.08;
    const botCpY = (rootY + tipY) * 0.5 + r * (isUpper ? 0.18 : 0.14);

    const getBotPoint = (t) => {
      const mt = 1 - t;
      return { x: mt*mt*rootX + 2*mt*t*botCpX + t*t*tipX,
               y: mt*mt*rootY + 2*mt*t*botCpY + t*t*tipY };
    };

    const getSpinePoint = (t) => {
      const topP = getTopPoint(t);
      const botP = getBotPoint(t);
      return { x: topP.x + (botP.x - topP.x) * 0.35, y: topP.y + (botP.y - topP.y) * 0.35 };
    };

    const notches = [0.75, 0.50, 0.25];
    const getNotchPoint = (t) => {
      const topP = getTopPoint(t);
      const botP = getBotPoint(t);
      return { x: botP.x + (topP.x - botP.x) * 0.22, y: botP.y + (topP.y - botP.y) * 0.22 };
    };

    // 1. MAIN WING BODY WITH SCALLOPED TRAILING EDGE
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tipX, tipY);

    const lobePoints = [
      { start: notches[0], end: 1.0 },
      { start: notches[1], end: notches[0] },
      { start: notches[2], end: notches[1] },
      { start: 0.0, end: notches[2] }
    ];

    for (let i = 0; i < lobePoints.length; i++) {
      const lobe = lobePoints[i];
      const endP = (lobe.start === 0.0) ? { x: rootX, y: rootY } : getNotchPoint(lobe.start);
      const midT = (lobe.start + lobe.end) * 0.5;
      const topMid = getTopPoint(midT);
      const botMid = getBotPoint(midT);
      const cpX = botMid.x + (botMid.x - topMid.x) * 0.16;
      const cpY = botMid.y + (botMid.y - topMid.y) * 0.16;
      ctx.quadraticCurveTo(cpX, cpY, endP.x, endP.y);
    }
    ctx.closePath();

    const grad = ctx.createLinearGradient(rootX, rootY, tipX, tipY);
    if (layerIndex === 0) {
      grad.addColorStop(0.0, '#FFFFFF');
      grad.addColorStop(0.3, featherWhite);
      grad.addColorStop(0.7, featherLight);
      grad.addColorStop(1.0, featherGrey);
    } else if (layerIndex === 1) {
      grad.addColorStop(0.0, featherWhite);
      grad.addColorStop(0.4, featherLight);
      grad.addColorStop(1.0, '#B8B8B0');
    } else {
      grad.addColorStop(0.0, featherLight);
      grad.addColorStop(0.5, '#D0D0C8');
      grad.addColorStop(1.0, '#989890');
    }
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 2. CENTRAL SPINE / RACHIS
    ctx.beginPath();
    const spineStart = getSpinePoint(0.05);
    ctx.moveTo(spineStart.x, spineStart.y);
    for (let t = 0.15; t <= 0.92; t += 0.1) {
      const sp = getSpinePoint(t);
      ctx.lineTo(sp.x, sp.y);
    }
    ctx.strokeStyle = '#4A4A42';
    ctx.lineWidth = 1.5 - layerIndex * 0.2;
    ctx.globalAlpha = 0.85;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(spineStart.x, spineStart.y - 0.8);
    for (let t = 0.15; t <= 0.90; t += 0.1) {
      const sp = getSpinePoint(t);
      ctx.lineTo(sp.x, sp.y - 0.8);
    }
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.0;
    ctx.globalAlpha = 0.95;
    ctx.stroke();

    // 3. CLOUD LINES & FEATHER BARBS
    ctx.strokeStyle = featherDark;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.85 - layerIndex * 0.1;

    const upperCloudStations = [0.18, 0.32, 0.46, 0.60, 0.74, 0.86];
    for (let i = 0; i < upperCloudStations.length; i++) {
      const t = upperCloudStations[i];
      const startP = getSpinePoint(t);
      const topEnd = getTopPoint(Math.min(0.96, t + 0.08));
      const endX = startP.x + (topEnd.x - startP.x) * 0.86;
      const endY = startP.y + (topEnd.y - startP.y) * 0.86;
      const cpX = startP.x + (endX - startP.x) * 0.6 - side * r * 0.04;
      const cpY = startP.y + (endY - startP.y) * 0.6 - r * 0.03;

      ctx.beginPath();
      ctx.moveTo(startP.x, startP.y);
      ctx.quadraticCurveTo(cpX, cpY, endX, endY);
      ctx.lineWidth = 1.2 - layerIndex * 0.15;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(startP.x + 0.6, startP.y + 0.6);
      ctx.quadraticCurveTo(cpX + 0.6, cpY + 0.6, endX + 0.6, endY + 0.6);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = 0.65;
      ctx.stroke();
      ctx.strokeStyle = featherDark;
      ctx.globalAlpha = 0.85 - layerIndex * 0.1;
    }

    for (let i = 0; i < notches.length; i++) {
      const nt = notches[i];
      const startP = getSpinePoint(Math.max(0.05, nt - 0.22));
      const notchP = getNotchPoint(nt);
      const endX = startP.x + (notchP.x - startP.x) * 0.92;
      const endY = startP.y + (notchP.y - startP.y) * 0.92;
      const cpX = (startP.x + endX) * 0.5 + side * r * 0.03;
      const cpY = (startP.y + endY) * 0.5 + r * 0.02;

      ctx.beginPath();
      ctx.moveTo(startP.x, startP.y);
      ctx.quadraticCurveTo(cpX, cpY, endX, endY);
      ctx.lineWidth = 1.4 - layerIndex * 0.15;
      ctx.stroke();
    }

    const lowerCloudStations = [0.12, 0.20, 0.30, 0.38, 0.45, 0.55, 0.62, 0.70, 0.80, 0.88];
    for (let i = 0; i < lowerCloudStations.length; i++) {
      const t = lowerCloudStations[i];
      if (notches.some(nt => Math.abs(t - (nt - 0.1)) < 0.03)) continue;

      const startP = getSpinePoint(t);
      const botP = getBotPoint(Math.min(0.98, t + 0.05));
      const endX = startP.x + (botP.x - startP.x) * 0.82;
      const endY = startP.y + (botP.y - startP.y) * 0.82;
      const cpX = (startP.x + endX) * 0.5 + side * r * 0.02;
      const cpY = (startP.y + endY) * 0.5 + r * 0.01;

      ctx.beginPath();
      ctx.moveTo(startP.x, startP.y);
      ctx.quadraticCurveTo(cpX, cpY, endX, endY);
      ctx.lineWidth = 1.0 - layerIndex * 0.1;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(startP.x - 0.5, startP.y - 0.5);
      ctx.quadraticCurveTo(cpX - 0.5, cpY - 0.5, endX - 0.5, endY - 0.5);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.strokeStyle = featherDark;
      ctx.globalAlpha = 0.85 - layerIndex * 0.1;
    }

    if (layerIndex === 0) {
      for (let c = 0; c < 3; c++) {
        const ct = 0.06 + c * 0.06;
        const cp = getSpinePoint(ct);
        const covR = r * (0.14 - c * 0.02);
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, covR, 0, Math.PI * 2);
        ctx.fillStyle = '#E8E8E0';
        ctx.fill();
        ctx.strokeStyle = '#4A4A42';
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1.0;

    ctx.beginPath();
    ctx.moveTo(rootX + side * 2, rootY - 2);
    ctx.bezierCurveTo(cp1x + side * 2, cp1y - 3, cp2x + side * 1.5, cp2y - 2, tipX + side * 0.8, tipY - 0.8);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  }

  // Draw 3 layers for depth
  drawFeatherWing(2);
  drawFeatherWing(1);
  drawFeatherWing(0);

  return canvas;
}

/**
 * Draws Mahoraga's Eye-Socket Organic Feathered Wings with Floating & Flapping Motion.
 * Half-res buffers scaled up 2x with nearest-neighbor for clean pixel art look!
 */
export function drawMahoragaFaceWings(ctx, fighter) {
  if (!fighter) return;

  const r = fighter.r || 30;
  if (!cachedWingUL) {
    cachedWingUL = renderSingleWingBuffer(r, -1, true);
    cachedWingUR = renderSingleWingBuffer(r, 1, true);
    cachedWingLL = renderSingleWingBuffer(r, -1, false);
    cachedWingLR = renderSingleWingBuffer(r, 1, false);
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  
  const rotAngle = fighter.angle || 0;
  ctx.rotate(rotAngle);
  if (Math.abs(rotAngle) > Math.PI / 2) ctx.scale(1, -1);

  // Disable smoothing for crisp pixel art nearest-neighbor upscaling
  const prevSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;

  // === Dynamic Organic Floating & Flapping Motion with Center Space Gap ===
  const floatTime = Date.now() * 0.003;
  const floatY = Math.sin(floatTime) * 2.5;

  const wingGap = 6;

  // Buffers are 180x100 (half of original 360x200), drawn at 2x = 360x200
  const dw = 360, dh = 200;

  const ulPivotX = -r * 0.06 - wingGap, ulPivotY = -r * 0.58;
  const urPivotX = r * 0.06 + wingGap,  urPivotY = -r * 0.58;
  const llPivotX = -r * 0.06 - wingGap, llPivotY = -r * 0.33;
  const lrPivotX = r * 0.06 + wingGap,  lrPivotY = -r * 0.33;

  // 1. Upper Left Wing
  ctx.save();
  const ulFlap = Math.sin(floatTime * 1.2) * 0.08;
  ctx.translate(ulPivotX, ulPivotY + floatY);
  ctx.rotate(ulFlap);
  ctx.translate(-ulPivotX, -ulPivotY - floatY);
  ctx.drawImage(cachedWingUL, -180 - wingGap, -110 + floatY, dw, dh);
  ctx.restore();

  // 2. Upper Right Wing
  ctx.save();
  const urFlap = -Math.sin(floatTime * 1.2) * 0.08;
  ctx.translate(urPivotX, urPivotY + floatY);
  ctx.rotate(urFlap);
  ctx.translate(-urPivotX, -urPivotY - floatY);
  ctx.drawImage(cachedWingUR, -180 + wingGap, -110 + floatY, dw, dh);
  ctx.restore();

  // 3. Lower Left Wing
  ctx.save();
  const llFlap = Math.sin(floatTime * 1.2 - 0.5) * 0.06;
  ctx.translate(llPivotX, llPivotY + floatY * 0.8);
  ctx.rotate(llFlap);
  ctx.translate(-llPivotX, -llPivotY - floatY * 0.8);
  ctx.drawImage(cachedWingLL, -180 - wingGap, -110 + floatY * 0.8, dw, dh);
  ctx.restore();

  // 4. Lower Right Wing
  ctx.save();
  const lrFlap = -Math.sin(floatTime * 1.2 - 0.5) * 0.06;
  ctx.translate(lrPivotX, lrPivotY + floatY * 0.8);
  ctx.rotate(lrFlap);
  ctx.translate(-lrPivotX, -lrPivotY - floatY * 0.8);
  ctx.drawImage(cachedWingLR, -180 + wingGap, -110 + floatY * 0.8, dw, dh);
  ctx.restore();

  ctx.imageSmoothingEnabled = prevSmoothing;
  ctx.restore();
}

/**
 * Draws Mahoraga's Ritual Chest Necklace & Tassels.
 */
export function drawMahoragaChestNecklace(ctx, fighter) {
  if (!fighter) return;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  
  const rotAngle = fighter.angle || 0;
  ctx.rotate(rotAngle);
  if (Math.abs(rotAngle) > Math.PI / 2) ctx.scale(1, -1);

  const r = fighter.r || 30;
  const chestY = r * 0.15;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  // Pixel line helper
  function _neckPixLine(x0, y0, x1, y1, color, thick) {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(2, Math.ceil(len / P));
    const halfT = Math.max(P * 0.5, (thick || P) * 0.5);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = snap(x0 + dx * t);
      const py = snap(y0 + dy * t);
      ctx.fillStyle = color;
      ctx.fillRect(px - halfT, py - halfT, halfT * 2, halfT * 2);
    }
  }

  // Pixel quadratic bezier helper
  function _neckPixQuad(x0, y0, cpx, cpy, x1, y1, color, thick) {
    const segs = 12;
    let prevX = x0, prevY = y0;
    for (let s = 1; s <= segs; s++) {
      const t = s / segs;
      const mt = 1 - t;
      const nx = mt * mt * x0 + 2 * mt * t * cpx + t * t * x1;
      const ny = mt * mt * y0 + 2 * mt * t * cpy + t * t * y1;
      _neckPixLine(prevX, prevY, nx, ny, color, thick);
      prevX = nx; prevY = ny;
    }
  }

  const leftX = -r * 0.75;
  const rightX = r * 0.75;
  const topY = chestY - 6;
  const bottomY = chestY + 3;

  // 1. DUAL PARALLEL BLACK CORDS — pixel art quadratic beziers
  _neckPixQuad(leftX, topY, 0, bottomY - 3, rightX, topY, '#000000', P * 1.1);
  _neckPixQuad(leftX + 2, topY + 3, 0, bottomY, rightX - 2, topY + 3, '#000000', P * 1.1);

  // 2. 4 CIRCULAR RING NODES WITH DOUBLE RIBBON TASSELS — pixel art
  const nodes = [
    { x: -r * 0.70, y: topY + 1 },
    { x: -r * 0.35, y: chestY - 1 },
    { x: r * 0.35,  y: chestY - 1 },
    { x: r * 0.70,  y: topY + 1 },
  ];

  nodes.forEach((node) => {
    // Ring Node — pixel filled circle
    const ringR = 3.8;
    const gridR = Math.ceil(ringR / P);
    for (let gy = -gridR; gy <= gridR; gy++) {
      for (let gx = -gridR; gx <= gridR; gx++) {
        const dist = Math.sqrt(gx * gx + gy * gy) * P;
        if (dist > ringR + P * 0.3) continue;
        const px = snap(node.x + gx * P);
        const py = snap(node.y + gy * P);
        if (dist > ringR - P * 0.7) {
          ctx.fillStyle = '#000000';
        } else {
          ctx.fillStyle = '#EBEBE6';
        }
        ctx.fillRect(px - P * 0.5, py - P * 0.5, P, P);
      }
    }

    // Double Ribbon Tassels — pixel lines
    _neckPixLine(node.x - 1.5, node.y + 3.5, node.x - 3.5, node.y + 16, '#000000', P);
    _neckPixLine(node.x + 1.5, node.y + 3.5, node.x + 3.5, node.y + 16, '#000000', P);
  });

  ctx.restore();
}

/**
 * Draws Mahoraga's entire circular body in authentic Pixel Art Style.
 * Uses discrete stepped pixel grid rasterization matching Saitama, Ichigo, Yuji, Nanami, Gojo, and Mahito.
 * Features:
 * - Stepped 1-pixel outer black stroke (#0E0F14)
 * - Ivory / Bone-White Divine Flesh (#F4F4EC, #EBEBE0)
 * - Shaded Demonic Brow & Eye-Socket Sockets (where feathered wings emerge)
 * - Muscular Pectoral & Abdominal Grooves
 * - Shinto Ritual Chest Markings & Divine Forehead Gem
 */
export function drawMahoragaPixelBody(ctx, r, fighter = null) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);

      // ──────────────────────────────────────────
      // 0. PIXELATED BLACK STROKE BORDER
      // ──────────────────────────────────────────
      if (
        Math.hypot(rx + P, ry) > r ||
        Math.hypot(rx - P, ry) > r ||
        Math.hypot(rx, ry + P) > r ||
        Math.hypot(rx, ry - P) > r
      ) {
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // ZONE 1: HEAD & DEMONIC FACE (-r <= ry < -r * 0.15)
      // ──────────────────────────────────────────
      if (ry < -r * 0.15) {
        // Eye-Socket Wing Sockets
        const isWingSocketLeft = (rx >= -r * 0.45 && rx <= -r * 0.12 && Math.abs(ry - (-r * 0.46)) <= P * 1.5);
        const isWingSocketRight = (rx >= r * 0.12 && rx <= r * 0.45 && Math.abs(ry - (-r * 0.46)) <= P * 1.5);
        const isWingSocketLeftLower = (rx >= -r * 0.40 && rx <= -r * 0.10 && Math.abs(ry - (-r * 0.32)) <= P * 1.2);
        const isWingSocketRightLower = (rx >= r * 0.10 && rx <= r * 0.40 && Math.abs(ry - (-r * 0.32)) <= P * 1.2);

        // Demonic Brow Ridge
        const isBrowRidge = (Math.abs(ry - (-r * 0.58)) <= P * 0.8 && Math.abs(rx) <= r * 0.55);

        // Central Forehead Third Eye / Divine Crest Gem
        const isForeheadGem = (Math.abs(rx) <= P * 1.0 && ry >= -r * 0.78 && ry <= -r * 0.64);
        const isForeheadGemCore = (Math.abs(rx) <= P * 0.5 && ry >= -r * 0.74 && ry <= -r * 0.68);

        if (isForeheadGemCore) {
          ctx.fillStyle = '#FFAE33';
        } else if (isForeheadGem) {
          ctx.fillStyle = '#C2780A';
        } else if (isWingSocketLeft || isWingSocketRight || isWingSocketLeftLower || isWingSocketRightLower) {
          ctx.fillStyle = '#18181A';
        } else if (isBrowRidge) {
          ctx.fillStyle = '#C8C8BE';
        } else {
          let col = '#F4F4EC';
          if (ry < -r * 0.72) {
            col = '#FFFFFF';
          } else if (Math.abs(rx) > r * 0.70 || ry > -r * 0.25) {
            col = '#D4D4C8';
          }
          ctx.fillStyle = col;
        }
        ctx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: CHEST & PECTORALS (-r * 0.15 <= ry < r * 0.45)
      // ──────────────────────────────────────────
      else if (ry < r * 0.45) {
        const isSternum = (Math.abs(rx) <= P * 0.6 && ry >= -r * 0.15 && ry <= r * 0.45);
        const isPecLeft = (rx >= -r * 0.65 && rx <= -P * 1.5 && Math.abs(ry - r * 0.22) <= P * 0.8);
        const isPecRight = (rx >= P * 1.5 && rx <= r * 0.65 && Math.abs(ry - r * 0.22) <= P * 0.8);
        const isPecHighlight = (ry >= -r * 0.05 && ry <= r * 0.15 && Math.abs(rx) >= r * 0.12 && Math.abs(rx) <= r * 0.50);

        if (isSternum || isPecLeft || isPecRight) {
          ctx.fillStyle = '#B4B4A8';
        } else if (isPecHighlight) {
          ctx.fillStyle = '#FFFFFF';
        } else {
          let col = '#EBEBE0';
          if (Math.abs(rx) > r * 0.72 || ry > r * 0.35) {
            col = '#D0D0C4';
          }
          ctx.fillStyle = col;
        }
        ctx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: ABDOMINALS & LOWER TORSO (ry >= r * 0.45)
      // ──────────────────────────────────────────
      else {
        const isLineaAlba = (Math.abs(rx) <= P * 0.6);
        const isAbSeam1 = (Math.abs(ry - r * 0.62) <= P * 0.7 && Math.abs(rx) <= r * 0.50);
        const isAbSeam2 = (Math.abs(ry - r * 0.80) <= P * 0.7 && Math.abs(rx) <= r * 0.40);
        const isAbPack1 = (ry >= r * 0.48 && ry <= r * 0.58 && Math.abs(rx) >= r * 0.08 && Math.abs(rx) <= r * 0.40);
        const isAbPack2 = (ry >= r * 0.66 && ry <= r * 0.76 && Math.abs(rx) >= r * 0.08 && Math.abs(rx) <= r * 0.32);

        if (isLineaAlba || isAbSeam1 || isAbSeam2) {
          ctx.fillStyle = '#A4A498';
        } else if (isAbPack1 || isAbPack2) {
          ctx.fillStyle = '#F8F8F2';
        } else {
          let col = '#DFDFD4';
          if (Math.abs(rx) > r * 0.65 || ry > r * 0.85) {
            col = '#BEBEB2';
          }
          ctx.fillStyle = col;
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  ctx.restore();
}

/**
 * Top-level skin drawer for Mahoraga.
 */
export function drawMahoragaSkin(ctx, fighter) {
  if (!fighter) return;
  const r = fighter.r || 30;
  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
  const angle = fighter.angle || 0;
  ctx.rotate(angle);
  if (Math.abs(angle) > Math.PI / 2) ctx.scale(1, -1);

  drawMahoragaPixelBody(ctx, r, fighter);

  ctx.restore();
}
