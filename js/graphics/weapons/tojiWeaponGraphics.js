import { CONFIG, getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';

/**
 * Visual & Animation Speed Configuration for Toji's Weapons.
 * Adjust these values to speed up or slow down weapon attack animations.
 */
export const TOJI_WEAPON_CONFIG = {
  // Global animation speed multiplier (e.g. 1.0 = normal, 1.5 = 50% faster, 2.0 = 2x speed)
  animationSpeed: 1.5,

  // Duration in frames for each phantom flurry slash swing
  flurrySlashDuration: 10,

  // Spear melee swing speed multiplier
  spearSwingAnimSpeed: 1.0,

  // Split Soul Katana slash speed multiplier
  katanaSlashAnimSpeed: 1.0,
};

/**
 * Helper to snap values to standard 2px pixel grid.
 */
const P = 2.0;
function snap(v) {
  return Math.round(v / P) * P;
}

/**
 * Draws Toji's hand/grip in authentic stepped pixel art style.
 */
function drawTojiPixelWeaponGrip(ctx, x, y, radius, handColor = '#E8BD9B') {
  ctx.save();
  const r = Math.max(P * 2, radius);
  const steps = Math.ceil(r / P);

  // 1. Manga dark outline shell (#0E0F14)
  ctx.fillStyle = '#0E0F14';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      if (Math.hypot(gx * P, gy * P) <= r + P * 0.75) {
        ctx.fillRect(snap(x + gx * P), snap(y + gy * P), P, P);
      }
    }
  }

  // 2. Tan skin body
  ctx.fillStyle = handColor || '#E8BD9B';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      if (Math.hypot(gx * P, gy * P) <= r - P * 0.35) {
        ctx.fillRect(snap(x + gx * P), snap(y + gy * P), P, P);
      }
    }
  }

  // 3. Knuckle shadow blocks
  ctx.fillStyle = '#C68A65';
  for (let gy = 0; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      if (Math.hypot(gx * P, gy * P) <= r - P * 0.35 && (gy * P > r * 0.20 || gx * P < -r * 0.35)) {
        ctx.fillRect(snap(x + gx * P), snap(y + gy * P), P, P);
      }
    }
  }

  // 4. Specular highlight
  ctx.fillStyle = '#FFE5D0';
  ctx.fillRect(snap(x + P * 0.5), snap(y - r * 0.45), P, P);

  ctx.restore();
}

/**
 * Helper to compute quadratic bezier point.
 */
function quadBezierPt(p0, p1, p2, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
  };
}

/**
 * Draws natural physics-simulated metal chain links in authentic Pixel-Art style.
 */
export function drawPhysicsChain(ctx, chainNodes) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  if (!chainNodes || chainNodes.length < 2) return;

  ctx.save();

  // 1. Continuous dark metallic spine underlay with stepped pixel thickness
  ctx.beginPath();
  ctx.moveTo(snap(chainNodes[0].x), snap(chainNodes[0].y));
  for (let i = 1; i < chainNodes.length; i++) {
    ctx.lineTo(snap(chainNodes[i].x), snap(chainNodes[i].y));
  }
  ctx.strokeStyle = '#111216';
  ctx.lineWidth = 3.0;
  ctx.stroke();

  // 2. Interlocking stepped pixel-art metal links
  for (let i = 1; i < chainNodes.length; i++) {
    const ptA = chainNodes[i - 1];
    const ptB = chainNodes[i];
    const midX = (ptA.x + ptB.x) / 2;
    const midY = (ptA.y + ptB.y) / 2;
    const linkAngle = Math.atan2(ptB.y - ptA.y, ptB.x - ptA.x);

    ctx.save();
    ctx.translate(snap(midX), snap(midY));
    ctx.rotate(linkAngle);

    if (i % 2 === 0) {
      // Face-on hollow pixel link:
      // Outer black border
      ctx.fillStyle = '#0E0F14';
      ctx.fillRect(-6, -4, 12, 8);
      // Steel body
      ctx.fillStyle = '#4A5260';
      ctx.fillRect(-4, -2, 8, 4);
      // Specular highlight pixel on upper edge
      ctx.fillStyle = '#8A95A5';
      ctx.fillRect(-4, -2, 8, 2);
      // Real hollow center pixel hole
      ctx.fillStyle = '#111216';
      ctx.fillRect(-2, 0, 4, 2);
    } else {
      // Side-on connecting metallic link:
      // Outer black border
      ctx.fillStyle = '#0E0F14';
      ctx.fillRect(-3, -5, 6, 10);
      // Inner steel body
      ctx.fillStyle = '#2A2F38';
      ctx.fillRect(-1, -4, 3, 8);
      // Metallic glint pixel
      ctx.fillStyle = '#9DA4AC';
      ctx.fillRect(0, -3, 1.5, 6);
    }

    ctx.restore();
  }
  ctx.restore();
}

/**
 * Draws Toji's Inverted Spear of Heaven (Accurate to anime reference in Authentic Pixel Art Style).
 */
export function drawInvertedSpear(ctx, cx, cy, angle, r = 25, chainNodes = null, handColor = '#242722', baseAngle = null) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const flipAngle = baseAngle !== null ? baseAngle : angle;
  const normAngle = Math.atan2(Math.sin(flipAngle), Math.cos(flipAngle));
  if (Math.abs(normAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  // Position weapon relative to fighter radius
  ctx.translate(r - 4, 0);

  // Scale for optimal UI/Game visibility
  const scale = 0.75;
  ctx.scale(scale, scale);

  const custom = (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.toji) ? state.weaponCustomizations.toji : null;
  if (custom) {
    ctx.translate(custom.offsetX, custom.offsetY);
    ctx.scale(custom.scale, custom.scale);
    ctx.rotate(custom.angleOffset);
  }

  // 1. Draw static chain fallback if physics nodes not passed (UI / preview cards)
  if (!chainNodes) {
    const staticNodes = [];
    const p0 = { x: 0, y: 0 };
    const p1 = { x: -4, y: 12 };
    const p2 = { x: -7, y: 26 };
    const p3 = { x: -8, y: 40 };
    const numLinks = 9;
    for (let i = 0; i <= numLinks; i++) {
      const t = i / numLinks;
      const invT = 1 - t;
      const x = invT * invT * invT * p0.x + 3 * invT * invT * t * p1.x + 3 * invT * t * t * p2.x + t * t * t * p3.x;
      const y = invT * invT * invT * p0.y + 3 * invT * invT * t * p1.y + 3 * invT * t * t * p2.y + t * t * t * p3.y;
      staticNodes.push({ x, y });
    }
    drawPhysicsChain(ctx, staticNodes);
  }

  // 2. Stepped Pixel-Art Solid Gold Ring Butt (X=0, Y=0)
  // Outer black border
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-8, -8, 16, 16);
  // Gold Ring Plate
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(-6, -6, 12, 12);
  // Top-Left Gold Shine
  ctx.fillStyle = '#FFF2A8';
  ctx.fillRect(-6, -6, 6, 4);
  // Bottom-Right Shadow
  ctx.fillStyle = '#99751A';
  ctx.fillRect(0, 2, 6, 4);
  // Hollow inner center
  ctx.fillStyle = '#111216';
  ctx.fillRect(-3, -3, 6, 6);

  // 3. Stepped Pixel-Art Ribbed Handle (X=7 to X=34)
  // Outer black border
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(6, -6, 29, 12);
  // Base wood/leather brown body
  ctx.fillStyle = '#4A2311';
  ctx.fillRect(7, -4, 27, 8);
  // 3D Ribbed texture segments
  for (let rx = 8; rx < 34; rx += 4) {
    ctx.fillStyle = '#5C2D17';
    ctx.fillRect(rx, -4, 2, 8);
    ctx.fillStyle = '#3B1A0C';
    ctx.fillRect(rx + 2, -4, 2, 8);
    // Highlight glint on top of ribs
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(rx, -4, 2, 2);
  }

  // 3.5. Single hand gripping the dagger handle (Pixel Art assassin grip)
  drawTojiPixelWeaponGrip(ctx, 22, 1, getHandSize(6.0), handColor || '#E8BD9B');

  // 4. Stepped Pixel-Art Golden Collar / Habaki (X=34 to X=38)
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(33, -7, 6, 14);
  ctx.fillStyle = '#E5C158';
  ctx.fillRect(34, -6, 4, 12);
  ctx.fillStyle = '#FFF0A0';
  ctx.fillRect(34, -6, 2, 6); // Top shine
  ctx.fillStyle = '#99751A';
  ctx.fillRect(34, 2, 4, 4);  // Bottom shadow

  // 5. Stepped Pixel-Art Dark Metal Tsuba / Guard (X=38 to X=44)
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(37, -14, 8, 28);
  ctx.fillStyle = '#303438';
  ctx.fillRect(38, -13, 6, 26);
  ctx.fillStyle = '#525860';
  ctx.fillRect(39, -12, 2, 24); // Metallic highlight ridge

  // 6. PIXEL-ART BLADE RENDERING (X=44 to X=118)
  const isohPoly = [
    { x: 44, y: -7 },
    { x: 48, y: -7 },
    { x: 48, y: -9 },
    { x: 54, y: -9 },
    { x: 54, y: -7 },
    { x: 104, y: -7 },
    { x: 118, y: 1 },  // Tanto point
    { x: 106, y: 7 },
    { x: 80, y: 7 },
    { x: 80, y: 2 },
    { x: 58, y: 2 },
    { x: 56, y: 4 },   // U-slot bottom
    { x: 58, y: 6 },
    { x: 74, y: 6 },
    { x: 80, y: 14 },  // Hook prong tip
    { x: 66, y: 16 },
    { x: 52, y: 11 },
    { x: 48, y: 11 },
    { x: 48, y: 8 },
    { x: 44, y: 8 }
  ];

  // Pass A: Outer Black Pixel Outline Shell
  ctx.fillStyle = '#0E0F14';
  for (let j = 0; j < isohPoly.length; j++) {
    const p1 = isohPoly[j];
    const p2 = isohPoly[(j + 1) % isohPoly.length];
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(2, Math.round(len / P));
    for (let st = 0; st <= steps; st++) {
      const rx = p1.x + (p2.x - p1.x) * (st / steps);
      const ry = p1.y + (p2.y - p1.y) * (st / steps);
      ctx.fillRect(snap(rx) - P * 0.5, snap(ry) - P * 0.5, P * 2, P * 2);
    }
  }

  // Pass B: Base Silver Stepped Blade Body
  ctx.fillStyle = '#D8DDE2';
  ctx.beginPath();
  isohPoly.forEach((pt, idx) => {
    if (idx === 0) ctx.moveTo(snap(pt.x), snap(pt.y));
    else ctx.lineTo(snap(pt.x), snap(pt.y));
  });
  ctx.closePath();
  ctx.fill();

  // Pass C: Stepped Blade Bevel & 3D Shading
  ctx.fillStyle = '#9DA4AC';
  ctx.beginPath();
  ctx.moveTo(snap(58), snap(0));
  ctx.lineTo(snap(118), snap(1));
  ctx.lineTo(snap(106), snap(7));
  ctx.lineTo(snap(80), snap(7));
  ctx.lineTo(snap(80), snap(2));
  ctx.lineTo(snap(58), snap(2));
  ctx.closePath();
  ctx.fill();

  // Pass D: Dark Talisman Runic Inscription Block (X=46 to X=53)
  ctx.fillStyle = '#22262A';
  ctx.fillRect(snap(46), snap(-4), 8, 8);
  ctx.fillStyle = '#8A95A5';
  ctx.fillRect(snap(47), snap(-3), 2, 6);
  ctx.fillRect(snap(50), snap(-2), 2, 4);

  // Pass E: Razor Specular Highlight Pixels along Top Spine & Prong Tip
  ctx.fillStyle = '#FFFFFF';
  for (let hx = 54; hx <= 104; hx += 2) {
    ctx.fillRect(snap(hx), snap(-7), 2, 2);
  }
  ctx.fillRect(snap(116), snap(0), 2, 2);
  ctx.fillRect(snap(118), snap(1), 2, 2);
  // Prong tip specular
  for (let px = 66; px <= 80; px += 2) {
    const py = 16 - (px - 66) * (2 / 14);
    ctx.fillRect(snap(px), snap(py), 2, 2);
  }

  // Pass F: Final Crisp Black Perimeter Stroke
  ctx.beginPath();
  isohPoly.forEach((pt, idx) => {
    if (idx === 0) ctx.moveTo(snap(pt.x), snap(pt.y));
    else ctx.lineTo(snap(pt.x), snap(pt.y));
  });
  ctx.closePath();
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws Toji's Split Soul Katana (Accurate slender curved Katana reference in Authentic Pixel Art Style).
 */
export function drawSplitSoulKatana(ctx, cx, cy, angle, r = 25, handColor = '#242722', baseAngle = null) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const flipAngle = baseAngle !== null ? baseAngle : angle;
  const normAngle = Math.atan2(Math.sin(flipAngle), Math.cos(flipAngle));
  if (Math.abs(normAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  // Position weapon relative to fighter radius
  ctx.translate(r - 2, 0);

  const scale = 0.95; // Increased scale for grand imposing Katana proportions!
  ctx.scale(scale, scale);

  // 1. Stepped Pixel-Art Kashira Pommel Cap (X=0 to X=6)
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-1, -4, 8, 8);
  ctx.fillStyle = '#8E1B1B'; // Deep Crimson
  ctx.fillRect(0, -3, 6, 6);
  ctx.fillStyle = '#CCCCCC'; // Silver End Band
  ctx.fillRect(0, -3, 2, 6);
  ctx.fillStyle = '#FFFFFF'; // Highlight pixel
  ctx.fillRect(0, -3, 2, 2);

  // 2. Stepped Pixel-Art Tsukamaki Wrapped Handle (X=6 to X=40)
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(5, -4, 36, 8);
  ctx.fillStyle = '#32342E'; // Charcoal leather wrap base
  ctx.fillRect(6, -3, 34, 6);

  // Diamond wrap hatching pattern
  for (let wx = 8; wx < 38; wx += 4) {
    ctx.fillStyle = '#111210';
    ctx.fillRect(wx, -3, 2, 6);
    ctx.fillStyle = '#4A4E44'; // Wrap glint
    ctx.fillRect(wx + 1, -2, 1, 2);
  }

  // Hand gripping Katana handle (Pixel Art)
  drawTojiPixelWeaponGrip(ctx, 24, 0, getHandSize(5.8), handColor || '#E8BD9B');

  // Dark Metal Habaki / Collar (X=40 to X=44)
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(39, -9, 6, 18);
  ctx.fillStyle = '#4D5159';
  ctx.fillRect(40, -8, 4, 16);
  ctx.fillStyle = '#757B85'; // Metallic collar highlight
  ctx.fillRect(40, -8, 2, 16);

  // 3. BROAD CURVED BLADE WITH SMOOTH CRESCENT TIP (Pixel Art Stepped Mesh)
  const darkSpineColor = '#2A2D34';
  const silverEdgeColor = '#E2E6EC';
  const highlightColor = '#FFFFFF';

  const bStart = 44;
  const bLen = 120; // total X to 164
  const bWidth = 16;
  const curveY = -35;

  const spineStartX = bStart;
  const spineStartY = -bWidth / 2;
  const tipX = bStart + bLen;
  const tipY = -bWidth / 2 + curveY;

  const T_body = 0.82;
  const bodyEndX = bStart + bLen * T_body;
  const bodyEndY = bWidth / 2 + T_body * T_body * curveY;
  const bodyStartX = bStart;
  const bodyStartY = bWidth / 2;

  const tipCtrlX = 153.2;
  const tipCtrlY = -21.2;

  // Generate sampled stepped boundary poly for Katana blade
  const bladePoly = [];
  const N = 24;

  // A. Spine curve: (spineStartX, spineStartY) -> (tipX, tipY)
  const spineMidX = bStart + bLen * 0.5;
  const spineMidY = spineStartY;
  for (let i = 0; i <= N; i++) {
    bladePoly.push(quadBezierPt({ x: spineStartX, y: spineStartY }, { x: spineMidX, y: spineMidY }, { x: tipX, y: tipY }, i / N));
  }

  // B. Tip crescent return: (tipX, tipY) -> (bodyEndX, bodyEndY)
  for (let i = 1; i <= N / 2; i++) {
    bladePoly.push(quadBezierPt({ x: tipX, y: tipY }, { x: tipCtrlX, y: tipCtrlY }, { x: bodyEndX, y: bodyEndY }, i / (N / 2)));
  }

  // C. Lower cutting edge return: (bodyEndX, bodyEndY) -> (bodyStartX, bodyStartY)
  const bodyMidX = bStart + (bodyEndX - bStart) * 0.5;
  const bodyMidY = bodyStartY;
  for (let i = 1; i <= N; i++) {
    bladePoly.push(quadBezierPt({ x: bodyEndX, y: bodyEndY }, { x: bodyMidX, y: bodyMidY }, { x: bodyStartX, y: bodyStartY }, i / N));
  }

  // Pass 1: Outer Dark Pixel Outline Shell
  ctx.fillStyle = '#0E0F14';
  for (let j = 0; j < bladePoly.length; j++) {
    const p1 = bladePoly[j];
    const p2 = bladePoly[(j + 1) % bladePoly.length];
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(2, Math.round(len / P));
    for (let st = 0; st <= steps; st++) {
      const rx = p1.x + (p2.x - p1.x) * (st / steps);
      const ry = p1.y + (p2.y - p1.y) * (st / steps);
      ctx.fillRect(snap(rx) - P * 0.5, snap(ry) - P * 0.5, P * 2, P * 2);
    }
  }

  // Pass 2: Base Blade Fill (Dark Charcoal)
  ctx.fillStyle = darkSpineColor;
  ctx.beginPath();
  bladePoly.forEach((pt, idx) => {
    if (idx === 0) ctx.moveTo(snap(pt.x), snap(pt.y));
    else ctx.lineTo(snap(pt.x), snap(pt.y));
  });
  ctx.closePath();
  ctx.fill();

  // Pass 3: Silver Hamon Cutting Edge & Crescent Tip
  const silverWidth = 5.5;
  const hamonStartX = bStart;
  const hamonStartY = bWidth / 2 - silverWidth;
  const hamonBodyEndX = bodyEndX;
  const hamonBodyEndY = bodyEndY - silverWidth * 0.6;

  ctx.fillStyle = silverEdgeColor;
  ctx.beginPath();
  ctx.moveTo(snap(hamonStartX), snap(hamonStartY));
  ctx.quadraticCurveTo(snap(bStart + (bodyEndX - bStart) * 0.5), snap(hamonStartY), snap(hamonBodyEndX), snap(hamonBodyEndY));
  ctx.quadraticCurveTo(snap(tipCtrlX), snap(tipCtrlY - 3), snap(tipX), snap(tipY));
  ctx.quadraticCurveTo(snap(tipCtrlX), snap(tipCtrlY), snap(bodyEndX), snap(bodyEndY));
  ctx.quadraticCurveTo(snap(bStart + (bodyEndX - bStart) * 0.5), snap(bodyStartY), snap(bodyStartX), snap(bodyStartY));
  ctx.closePath();
  ctx.fill();

  // Pass 4: Specular White Razor Edge Shine Line
  ctx.beginPath();
  ctx.moveTo(snap(bStart), snap(bWidth / 4));
  ctx.quadraticCurveTo(snap(bStart + (bodyEndX - bStart) * 0.5), snap(bWidth / 4), snap(bodyEndX), snap(bodyEndY - 1));
  ctx.quadraticCurveTo(snap(tipCtrlX), snap(tipCtrlY - 1.5), snap(tipX - 2), snap(tipY + 1.5));
  ctx.strokeStyle = highlightColor;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Pass 5: Final Crisp Black Outline
  ctx.beginPath();
  bladePoly.forEach((pt, idx) => {
    if (idx === 0) ctx.moveTo(snap(pt.x), snap(pt.y));
    else ctx.lineTo(snap(pt.x), snap(pt.y));
  });
  ctx.closePath();
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // 4. FLOWING WHITE FUR COLLAR / TASSEL (Authentic Pixel-Art Fur Locks)
  const furLocks = [
    // Top locks
    [{ x: 36, y: -6 }, { x: 48, y: -16 }, { x: 58, y: -13 }, { x: 44, y: -5 }],
    [{ x: 40, y: -4 }, { x: 54, y: -18 }, { x: 66, y: -11 }, { x: 48, y: -3 }],
    [{ x: 38, y: -2 }, { x: 56, y: -8 }, { x: 68, y: -6 }, { x: 46, y: 0 }],
    // Bottom locks
    [{ x: 36, y: 6 }, { x: 48, y: 16 }, { x: 58, y: 13 }, { x: 44, y: 5 }],
    [{ x: 40, y: 4 }, { x: 54, y: 18 }, { x: 66, y: 11 }, { x: 48, y: 3 }],
    [{ x: 38, y: 2 }, { x: 56, y: 8 }, { x: 68, y: 6 }, { x: 46, y: 0 }],
    // Middle overlay locks
    [{ x: 34, y: -3 }, { x: 50, y: -5 }, { x: 60, y: -2 }, { x: 44, y: -1 }],
    [{ x: 34, y: 3 }, { x: 50, y: 5 }, { x: 60, y: 2 }, { x: 44, y: 1 }],
  ];

  furLocks.forEach(pts => {
    // Stepped pixel outline
    ctx.fillStyle = '#0E0F14';
    ctx.beginPath();
    ctx.moveTo(snap(pts[0].x), snap(pts[0].y));
    ctx.quadraticCurveTo(snap(pts[1].x), snap(pts[1].y), snap(pts[2].x), snap(pts[2].y));
    ctx.quadraticCurveTo(snap(pts[3].x), snap(pts[3].y), snap(pts[0].x), snap(pts[0].y));
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // White fur body fill
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // 3D Fur depth shadow block on underside
    ctx.fillStyle = '#D4DAE4';
    ctx.beginPath();
    ctx.moveTo(snap(pts[0].x), snap(pts[0].y));
    ctx.lineTo(snap(pts[3].x), snap(pts[3].y));
    ctx.lineTo(snap(pts[2].x), snap(pts[2].y));
    ctx.closePath();
    ctx.fill();
  });

  ctx.restore();
}

/**
 * Renders Toji's Split Soul Katana rested over his right shoulder/back (Lore Dual-Wield Back Holster Stance).
 */
export function drawRestedKatanaOverShoulder(ctx, cx, cy, angle, r = 25, handColor = '#E8BD9B') {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(cx, cy);

  const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
  const isFacingLeft = Math.abs(normAngle) > Math.PI / 2;

  if (isFacingLeft) {
    ctx.rotate(angle + Math.PI * 1.02);
    ctx.translate(-r * 0.30, -r * 0.85);
    ctx.scale(0.85, -0.85);
  } else {
    ctx.rotate(angle - Math.PI * 1.02);
    ctx.translate(-r * 0.30, r * 0.85);
    ctx.scale(0.85, 0.85);
  }

  ctx.rotate(-0.05);
  drawSplitSoulKatana(ctx, 0, 0, 0, 0, handColor);

  ctx.restore();
}

/**
 * Renders Toji's Inverted Spear of Heaven rested at his left hip/back sheath.
 */
export function drawRestedInvertedSpearAtHip(ctx, cx, cy, angle, r = 25, chainNodes = null, handColor = '#E8BD9B') {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(cx, cy);

  const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
  const isFacingLeft = Math.abs(normAngle) > Math.PI / 2;

  if (isFacingLeft) {
    ctx.rotate(angle - Math.PI * 0.45);
    ctx.translate(-r * 0.4, -r * 0.6);
    ctx.scale(0.60, -0.60);
  } else {
    ctx.rotate(angle + Math.PI * 0.45);
    ctx.translate(-r * 0.4, r * 0.6);
    ctx.scale(0.60, 0.60);
  }

  drawInvertedSpear(ctx, 0, 0, 0, 0, chainNodes, handColor);

  ctx.restore();
}

