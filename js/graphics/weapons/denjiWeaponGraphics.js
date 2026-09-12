// ─────────────────────────────────────────────
// Denji (Chainsaw Devil) Weapon & Combat FX Visuals
// Adheres strictly to:
// - Rule 16 (Manga Action Speed Lines — 4-Point Filled Needle Polygons)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

const P = 2.0;
function snap(v) {
  return Math.round(v / P) * P;
}

let _denjiSpeedLineSeeds = null;

function _initDenjiSpeedLineSeeds() {
  const seeds = [];
  const count = 22;
  for (let i = 0; i < count; i++) {
    const norm = (i / (count - 1)) * 2 - 1; // -1 to +1
    const perpOffset = norm * 32;          // Cluster width: ±32px (matching body radius 25px)
    const normDist = 1 - Math.abs(norm);   // Parabolic length
    const length = 40 + normDist * 50;     // 40px to 90px
    const speed = 1.2 + Math.random() * 0.8;
    const phase = Math.random() * 100;
    seeds.push({ perpOffset, length, speed, phase });
  }
  return seeds;
}

/**
 * Draws Manga Action Speed Lines behind Denji during Engine Lunges (Rule 16)
 */
export function drawDenjiSpeedLines(ctx, fighter) {
  if (!fighter || !fighter.isEngineLunging) return;

  if (!_denjiSpeedLineSeeds) {
    _denjiSpeedLineSeeds = _initDenjiSpeedLineSeeds();
  }

  const now = Date.now();
  const aimAngle = fighter.gunAngle || fighter.angle || 0;
  const backOffset = (fighter.r || 25) * 1.2;
  const cosA = Math.cos(aimAngle);
  const sinA = Math.sin(aimAngle);
  const perpX = -sinA;
  const perpY =  cosA;

  ctx.save();
  for (let i = 0; i < _denjiSpeedLineSeeds.length; i++) {
    const seed = _denjiSpeedLineSeeds[i];
    const travel = ((now * 0.001 * seed.speed * 60 + seed.phase) % 80);

    const lineCenterX = fighter.x - cosA * (backOffset + travel) + perpX * seed.perpOffset;
    const lineCenterY = fighter.y - sinA * (backOffset + travel) + perpY * seed.perpOffset;

    const halfLen = seed.length * 0.5;
    const startX = lineCenterX - cosA * halfLen;
    const startY = lineCenterY - sinA * halfLen;
    const endX   = lineCenterX + cosA * halfLen;
    const endY   = lineCenterY + sinA * halfLen;

    const midOff = halfLen * 0.15;
    const bulgeX = lineCenterX + cosA * midOff;
    const bulgeY = lineCenterY + sinA * midOff;
    const halfThick = 1.2;

    const topMidX = bulgeX + perpX * halfThick;
    const topMidY = bulgeY + perpY * halfThick;
    const botMidX = bulgeX - perpX * halfThick;
    const botMidY = bulgeY - perpY * halfThick;

    // 4-Slot Color Theme Standard (Rule 16)
    let color;
    if (i % 4 === 0) color = 'rgba(234, 179, 8, 0.90)';   // Chainsaw Amber Gold
    else if (i % 4 === 1) color = 'rgba(220, 38, 38, 0.85)'; // Blood Engine Crimson
    else if (i % 4 === 2) color = 'rgba(255, 255, 255, 0.95)'; // White-hot core
    else color = 'rgba(15, 23, 42, 0.90)';                 // Dark Gunmetal Ink

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(topMidX, topMidY);
    ctx.lineTo(endX, endY);
    ctx.lineTo(botMidX, botMidY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws Denji's Ripcord & Forearm Chainsaw Preview for Weapon Detail Studio
 */
export function drawDenjiWeaponPreview(ctx, x = 0, y = 0, angle = 0, r = 25, opts = {}) {
  const sawLen = 42;
  const sawThick = 9;
  const now = Date.now();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 1. Engine Starter Grip & Ripcord Ring at Base
  ctx.fillStyle = '#090D16';
  ctx.fillRect(-12, -sawThick / 2 - 2, 10, sawThick + 4);
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(-11, -sawThick / 2 - 1, 8, sawThick + 2);
  ctx.fillStyle = '#F97316'; // Orange pull cord
  ctx.fillRect(-14, -1, 3, 2);
  ctx.fillStyle = '#CBD5E1'; // Metallic pull ring
  ctx.fillRect(-18, -3, 4, 6);
  ctx.fillStyle = '#090D16';
  ctx.fillRect(-16, -1, 1.5, 2);

  // 2. Tapered Guide Bar Dark Ink Shell
  ctx.fillStyle = '#090D16';
  ctx.fillRect(-2, -sawThick / 2 - 2, sawLen - 2, sawThick + 4);
  ctx.fillRect(sawLen - 4, -sawThick / 2 - 1, 4, sawThick + 2);
  ctx.fillRect(sawLen, -sawThick / 2 + 1, 3, sawThick - 2);

  // 3. Multi-Tone Brushed Steel Guide Bar
  // Top bevel highlight
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(0, -sawThick / 2 - 1, sawLen - 5, 1.5);
  // Upper steel face
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(0, -sawThick / 2 + 0.5, sawLen - 3, 2);
  // Lower steel shadow
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, sawThick / 2 - 2.5, sawLen - 3, 2);
  // Bottom bevel shadow
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, sawThick / 2 - 0.5, sawLen - 5, 1.5);

  // Recessed center guide groove with rail tracks
  ctx.fillStyle = '#090D16';
  ctx.fillRect(2, -1.5, sawLen - 8, 3);
  ctx.fillStyle = '#64748B';
  ctx.fillRect(2, -0.8, sawLen - 8, 0.8);
  ctx.fillRect(2, 0.4, sawLen - 8, 0.8);

  // Weight-reduction cutouts
  const cutouts = [8, 18, 28];
  for (let cx of cutouts) {
    ctx.fillStyle = '#090D16';
    ctx.fillRect(cx, -2, 5, 4);
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx + 1, -1, 3, 2);
  }

  // Nose Sprocket on tip
  const noseX = sawLen - 3;
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(noseX, -0.5, 1.5, 1.5);
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(noseX - 1, -2, 1, 1);
  ctx.fillRect(noseX - 1, 1, 1, 1);

  // 4. Rotating Hooked Razor Teeth
  const toothStep = 4.5;
  const scrollOffset = (now * 0.08) % toothStep;

  // Top cutting teeth
  for (let sx = 0; sx < sawLen - 3; sx += toothStep) {
    const tx = snap(sx + scrollOffset);
    if (tx < sawLen - 3) {
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(tx, -sawThick / 2 - 2, 2, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(tx + 1, -sawThick / 2 - 2.5, 1.5, 1.5);
      ctx.fillStyle = '#334155';
      ctx.fillRect(tx - 1, -sawThick / 2 - 1, 1, 1);
    }
  }

  // Bottom cutting teeth
  for (let sx = 0; sx < sawLen - 3; sx += toothStep) {
    const tx = snap(sx - scrollOffset + toothStep);
    if (tx > 0 && tx < sawLen - 3) {
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(tx, sawThick / 2 + 0.5, 2, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(tx + 1, sawThick / 2 + 1.5, 1.5, 1.5);
      ctx.fillStyle = '#334155';
      ctx.fillRect(tx - 1, sawThick / 2, 1, 1);
    }
  }

  // Nose tip razor
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(sawLen + 1, -1.5, 2, 3);

  // 5. Blood Gore & Splatters
  ctx.fillStyle = '#7F1D1D';
  ctx.fillRect(snap(5 + scrollOffset), -1, 5, 2);
  ctx.fillRect(snap(22 + scrollOffset), -1, 6, 2);

  ctx.fillStyle = '#DC2626';
  ctx.fillRect(snap(7 + scrollOffset), -sawThick / 2 - 2, 3, 2);
  ctx.fillRect(snap(20 + scrollOffset), sawThick / 2, 4, 2);
  ctx.fillRect(sawLen - 1, -1, 2, 2);

  ctx.fillStyle = '#EF4444';
  ctx.fillRect(snap(8 + scrollOffset), -sawThick / 2 - 1, 1.5, 1);
  ctx.fillRect(sawLen, 0, 2, 1);

  ctx.restore();
}
