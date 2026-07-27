// ─────────────────────────────────────────────
// MAHORAGA FIGHTER SKIN & BODY GRAPHICS MODULE
// Contains eye-socket wings, ritual chest necklace, and facial features.
// ─────────────────────────────────────────────

let cachedWingsCanvas = null;

function renderFullWingsToOffscreenBuffer(r) {
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  ctx.translate(180, 110);

  // Colors for organic divine feathered wings:
  const featherWhite = '#FAFAF8';    // Soft white feather body
  const featherLight = '#E8E8E0';   // Light cream highlight
  const featherGrey = '#C8C8C0';    // Soft grey shadow
  const featherDark = '#383830';    // Bold dark charcoal for crisp cloud lines & feather barbs
  const outlineColor = '#000000';   // Black outline

  // Helper to draw one organic feathered wing segment with divine cloud lines
  function drawFeatherWing(side, isUpper, layerIndex) {
    ctx.save();

    // Fan out layers slightly so back layers are visible behind front layers
    const layerTilt = side * (isUpper ? -0.07 : 0.07) * layerIndex;
    ctx.rotate(layerTilt);

    // Origin at eye socket area (upper wing higher, lower wing below)
    const rootX = side * r * 0.06;
    const rootY = isUpper ? -r * 0.58 : -r * 0.33;

    // Layer-based parameters for depth
    const layerOffset = layerIndex * 0.12;
    
    // Wing extends with organic curved flow
    const baseLength = isUpper ? 2.1 : 1.8;
    const tipX = side * r * (baseLength + layerOffset);
    const tipY = isUpper ? -r * (1.05 + layerOffset * 0.25) : -r * (0.52 + layerOffset * 0.18);

    // Control points for wavy S-curve upper edge
    const cp1x = side * r * (0.35 + layerOffset * 0.12);
    const cp1y = isUpper ? -r * (1.75 + layerOffset * 0.28) : -r * (0.95 + layerOffset * 0.20);
    const cp2x = side * r * (0.95 + layerOffset * 0.18);
    const cp2y = isUpper ? -r * (0.75 + layerOffset * 0.12) : -r * (0.38 + layerOffset * 0.08);

    // Evaluate point on upper cubic curve at parameter t [0..1]
    const getTopPoint = (t) => {
      const mt = 1 - t;
      const x = mt*mt*mt * rootX + 3*mt*mt*t * cp1x + 3*mt*t*t * cp2x + t*t*t * tipX;
      const y = mt*mt*mt * rootY + 3*mt*mt*t * cp1y + 3*mt*t*t * cp2y + t*t*t * tipY;
      return { x, y };
    };

    // Baseline bottom curve control point
    const botCpX = (rootX + tipX) * 0.5 + side * r * 0.08;
    const botCpY = (rootY + tipY) * 0.5 + r * (isUpper ? 0.18 : 0.14);

    // Evaluate point on bottom baseline curve at parameter t [0..1]
    const getBotPoint = (t) => {
      const mt = 1 - t;
      const x = mt*mt * rootX + 2*mt*t * botCpX + t*t * tipX;
      const y = mt*mt * rootY + 2*mt*t * botCpY + t*t * tipY;
      return { x, y };
    };

    // Evaluate point on central spine / rachis at parameter t [0..1]
    const getSpinePoint = (t) => {
      const topP = getTopPoint(t);
      const botP = getBotPoint(t);
      // Spine runs roughly 35% from upper edge toward lower edge
      return {
        x: topP.x + (botP.x - topP.x) * 0.35,
        y: topP.y + (botP.y - topP.y) * 0.35
      };
    };

    // Scalloped trailing edge notches (dividing wing into overlapping feather lobes)
    const notches = [0.75, 0.50, 0.25];
    const getNotchPoint = (t) => {
      const topP = getTopPoint(t);
      const botP = getBotPoint(t);
      // Dip inward toward top curve to form distinct overlapping feather V-notches
      const dipRatio = 0.22;
      return {
        x: botP.x + (topP.x - botP.x) * dipRatio,
        y: botP.y + (topP.y - botP.y) * dipRatio
      };
    };

    // 1. DRAW MAIN WING BODY WITH SCALLOPED TRAILING EDGE
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    // Upper organic wavy curve
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tipX, tipY);

    // Lower trailing edge: return through scalloped feather lobes
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
      // Push control point outward for rounded feather lobe belly
      const cpX = botMid.x + (botMid.x - topMid.x) * 0.16;
      const cpY = botMid.y + (botMid.y - topMid.y) * 0.16;
      ctx.quadraticCurveTo(cpX, cpY, endP.x, endP.y);
    }
    ctx.closePath();

    // Layer-adjusted gradient fill (back layers slightly darker/shadowed)
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

    // Black outline
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 2. DRAW CENTRAL SPINE / RACHIS (Dividing the white space)
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

    // White highlight along central spine
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

    // 3. DRAW CLOUD LINES & FEATHER BARBS (Filling the white empty space!)
    ctx.strokeStyle = featherDark;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.85 - layerIndex * 0.1;

    // A. Upper White Space Cloud Lines (Sweeping curved plumes above central spine)
    const upperCloudStations = [0.18, 0.32, 0.46, 0.60, 0.74, 0.86];
    for (let i = 0; i < upperCloudStations.length; i++) {
      const t = upperCloudStations[i];
      const startP = getSpinePoint(t);
      // Curve forward and upward toward top edge (stopping at 86% across white space)
      const topEnd = getTopPoint(Math.min(0.96, t + 0.08));
      const endX = startP.x + (topEnd.x - startP.x) * 0.86;
      const endY = startP.y + (topEnd.y - startP.y) * 0.86;
      // Cloud swirl control point (curving like traditional Japanese cloud/wind motif)
      const cpX = startP.x + (endX - startP.x) * 0.6 - side * r * 0.04;
      const cpY = startP.y + (endY - startP.y) * 0.6 - r * 0.03;

      ctx.beginPath();
      ctx.moveTo(startP.x, startP.y);
      ctx.quadraticCurveTo(cpX, cpY, endX, endY);
      ctx.lineWidth = 1.2 - layerIndex * 0.15;
      ctx.stroke();

      // White 3D highlight next to cloud line
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

    // B. Lower White Space Cloud Lines & Notch Separation Grooves (Sweeping below central spine)
    // Major separation lines out to each trailing edge notch
    for (let i = 0; i < notches.length; i++) {
      const nt = notches[i];
      const startP = getSpinePoint(Math.max(0.05, nt - 0.22));
      const notchP = getNotchPoint(nt);
      // Stop just inside the notch border
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

    // Diagonal cloud-barb lines filling each feather lobe body in the lower white space
    const lowerCloudStations = [0.12, 0.20, 0.30, 0.38, 0.45, 0.55, 0.62, 0.70, 0.80, 0.88];
    for (let i = 0; i < lowerCloudStations.length; i++) {
      const t = lowerCloudStations[i];
      // Skip if very close to a major notch to keep linework clean
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

      // White 3D highlight next to lower cloud line
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

    // 4. COVERT BASE FEATHERS (Small rounded overlapping scale feathers at eye socket root)
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

    // Soft white highlight along upper edge
    ctx.beginPath();
    ctx.moveTo(rootX + side * 2, rootY - 2);
    ctx.bezierCurveTo(cp1x + side * 2, cp1y - 3, cp2x + side * 1.5, cp2y - 2, tipX + side * 0.8, tipY - 0.8);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  }

  // Draw upper wings (3 layers per side for depth)
  drawFeatherWing(-1, true, 2); // Upper Left - Back
  drawFeatherWing(1, true, 2);  // Upper Right - Back
  drawFeatherWing(-1, true, 1); // Upper Left - Middle
  drawFeatherWing(1, true, 1);  // Upper Right - Middle
  drawFeatherWing(-1, true, 0); // Upper Left - Front
  drawFeatherWing(1, true, 0);  // Upper Right - Front

  // Draw lower wings (3 layers per side for depth)
  drawFeatherWing(-1, false, 2); // Lower Left - Back
  drawFeatherWing(1, false, 2);  // Lower Right - Back
  drawFeatherWing(-1, false, 1); // Lower Left - Middle
  drawFeatherWing(1, false, 1);  // Lower Right - Middle
  drawFeatherWing(-1, false, 0); // Lower Left - Front
  drawFeatherWing(1, false, 0);  // Lower Right - Front

  return canvas;
}

/**
 * Draws Mahoraga's Eye-Socket Organic Feathered Wings (Upper and Lower).
 * Hardware-accelerated with offscreen canvas caching to guarantee 60 FPS performance!
 */
export function drawMahoragaFaceWings(ctx, fighter) {
  if (!fighter) return;

  const r = fighter.r || 30;
  if (!cachedWingsCanvas) {
    cachedWingsCanvas = renderFullWingsToOffscreenBuffer(r);
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  const angle = fighter.gunAngle || 0;
  ctx.rotate(angle);

  // Flip Y when facing left so wings mirror correctly
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  // Blit pre-cached high-resolution offscreen canvas (0ms CPU time!)
  ctx.drawImage(cachedWingsCanvas, -180, -110);

  ctx.restore();
}

/**
 * Draws Mahoraga's Ritual Chest Necklace & Tassels.
 */
export function drawMahoragaChestNecklace(ctx, fighter) {
  if (!fighter) return;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  
  // Rotate fully to match fighter facing angle and orientation
  const angle = fighter.gunAngle || 0;
  ctx.rotate(angle);

  // Flip Y when facing left so necklace ribbons orient correctly with body direction
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  const r = fighter.r || 30;
  const chestY = r * 0.15; // Lowered mid-chest position

  // 1. DUAL PARALLEL BLACK CORDS (Wide V-Dip across full chest width)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';

  const leftX = -r * 0.75;
  const rightX = r * 0.75;
  const topY = chestY - 6;
  const bottomY = chestY + 3;

  // Upper Cord Line
  ctx.beginPath();
  ctx.moveTo(leftX, topY);
  ctx.quadraticCurveTo(0, bottomY - 3, rightX, topY);
  ctx.stroke();

  // Lower Cord Line
  ctx.beginPath();
  ctx.moveTo(leftX + 2, topY + 3);
  ctx.quadraticCurveTo(0, bottomY, rightX - 2, topY + 3);
  ctx.stroke();

  // 2. 4 CIRCULAR RING NODES WITH DOUBLE RIBBON TASSELS
  const nodes = [
    { x: -r * 0.70, y: topY + 1 },
    { x: -r * 0.35, y: chestY - 1 },
    { x: r * 0.35,  y: chestY - 1 },
    { x: r * 0.70,  y: topY + 1 },
  ];

  nodes.forEach((node) => {
    // Ring Node (Hollow Black Ring)
    ctx.beginPath();
    ctx.arc(node.x, node.y, 3.8, 0, Math.PI * 2);
    ctx.fillStyle = '#EBEBE6'; // Skin tone center
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Double Ribbon Tassels (Two hanging black ribbons per node)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.8;

    // Left Ribbon Strand
    ctx.beginPath();
    ctx.moveTo(node.x - 1.5, node.y + 3.5);
    ctx.lineTo(node.x - 3.5, node.y + 16);
    ctx.stroke();

    // Right Ribbon Strand
    ctx.beginPath();
    ctx.moveTo(node.x + 1.5, node.y + 3.5);
    ctx.lineTo(node.x + 3.5, node.y + 16);
    ctx.stroke();
  });

  ctx.restore();
}
