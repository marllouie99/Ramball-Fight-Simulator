// ─────────────────────────────────────────────
// MAHITO FIGHTER SKIN RENDERER
// Follows: docs/fighter_hand_positioning_guide.md
// Features:
// 1. Base Form: Sickly pale stitched skin, heterochromia eyes,
//    grey-blue long parted hair, dark sleeveless tunic, stitched hands.
// 2. Transformed Form (Instant Spirit Body of Distorted Killing):
//    Armored obsidian-indigo carapace, glowing cyan eye slits,
//    curved forearm elbow blades, shoulder spikes, and bladed tail.
// 3. Stance: Standard brawler 2-handed guard stance (front hand on body,
//    back hand on forward edge, lunging along +X attack vector).
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';

/**
 * Draws Mahito's cursed soul wisp aura (No shadowBlur, optimized canvas fills).
 */
function drawCursedSoulAura(ctx, fighter) {
  const r = fighter.r || 25;
  const now = Date.now() * 0.003;
  const isTransformed = fighter.isTransformed || fighter.isDistortedKilling;

  ctx.save();
  const wispCount = isTransformed ? 6 : 4;
  const primaryColor = isTransformed ? 'rgba(0, 229, 255, 0.25)' : 'rgba(0, 168, 204, 0.20)';
  const coreColor = isTransformed ? 'rgba(15, 23, 42, 0.35)' : 'rgba(123, 158, 175, 0.18)';

  for (let i = 0; i < wispCount; i++) {
    const angle = now * 1.2 + (i * Math.PI * 2 / wispCount);
    const dist = r * 1.25 + Math.sin(now * 2.5 + i * 1.5) * 4;
    const wx = Math.cos(angle) * dist;
    const wy = Math.sin(angle) * dist;
    const wispRadius = 3.5 + Math.sin(now * 3 + i) * 1.5;

    // Outer aura blob
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.arc(wx, wy, wispRadius * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Inner soul core
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.arc(wx, wy, wispRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws surgical stitches with tiny cross-threads.
 */
function drawStitchLine(ctx, x1, y1, x2, y2, stitchCount = 4, crossLength = 3.0, stitchColor = '#1F2937') {
  ctx.save();
  ctx.strokeStyle = stitchColor;
  ctx.lineWidth = 1.3;

  // Main suture cut line
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Cross stitch threads
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len > 0) {
    const nx = -dy / len;
    const ny =  dx / len;

    for (let i = 1; i <= stitchCount; i++) {
      const t = i / (stitchCount + 1);
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      ctx.beginPath();
      ctx.moveTo(px - nx * crossLength, py - ny * crossLength);
      ctx.lineTo(px + nx * crossLength, py + ny * crossLength);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Draws Mahito's exact facial surgical stitches matching the anime screenshot.
 * Includes:
 * 1. Transverse suture line across nose & cheeks with 2 clean pairs of vertical stitch loops on right cheek and 1 pair on left.
 * 2. Vertical suture cut running down the left cheek with 2 horizontal cross-stitches on the lower cheek.
 * 3. Forehead diagonal suture with 3 cross-stitches in the open upper-left forehead.
 * 4. Clean horizontal neck suture across the collar opening.
 */
function drawMahitoFacialStitches(ctx, r) {
  ctx.save();
  ctx.strokeStyle = '#181C26';
  ctx.fillStyle = '#181C26';
  ctx.lineWidth = 1.25;
  ctx.lineCap = 'round';

  const crossH = 3.2; // Half-length of cross stitches

  // 1. ── MAIN HORIZONTAL TRANSVERSE SUTURE ACROSS NOSE & CHEEKS ──
  const hy = -r * 0.04;
  ctx.beginPath();
  ctx.moveTo(-r * 0.70, hy);
  ctx.lineTo(r * 0.70, hy);
  ctx.stroke();

  // Vertical stitch loops on Right Cheek (Viewer's Right: Two clean pairs matching anime)
  const rightStitches = [r * 0.36, r * 0.43, r * 0.55, r * 0.62];
  for (const sx of rightStitches) {
    ctx.beginPath();
    ctx.moveTo(sx, hy - crossH);
    ctx.lineTo(sx, hy + crossH);
    ctx.stroke();
  }

  // Vertical stitch loops on Left Cheek (Viewer's Left: Pair near nose)
  const leftStitches = [-r * 0.16, -r * 0.23];
  for (const sx of leftStitches) {
    ctx.beginPath();
    ctx.moveTo(sx, hy - crossH);
    ctx.lineTo(sx, hy + crossH);
    ctx.stroke();
  }

  // 2. ── LEFT CHEEK VERTICAL SUTURE CUT & LOWER CHEEK STITCHES (Viewer's Left) ──
  const vx = -r * 0.38;
  ctx.beginPath();
  ctx.moveTo(vx, -r * 0.20);
  ctx.lineTo(vx, hy);
  ctx.lineTo(-r * 0.34, r * 0.22);
  ctx.stroke();

  // Two horizontal cross-stitches on lower left cheek cut
  const lowerCrosses = [
    { x: -r * 0.37, y: +r * 0.05 },
    { x: -r * 0.35, y: +r * 0.14 }
  ];
  for (const cross of lowerCrosses) {
    ctx.beginPath();
    ctx.moveTo(cross.x - crossH, cross.y);
    ctx.lineTo(cross.x + crossH, cross.y);
    ctx.stroke();
  }

  // 3. ── FOREHEAD DIAGONAL SUTURE (Viewer's Upper Left Forehead) ──
  const fx1 = -r * 0.50, fy1 = -r * 0.48;
  const fx2 = -r * 0.28, fy2 = -r * 0.22;
  ctx.beginPath();
  ctx.moveTo(fx1, fy1);
  ctx.lineTo(fx2, fy2);
  ctx.stroke();

  // 3 perpendicular cross stitches along forehead diagonal cut
  const fdx = fx2 - fx1, fdy = fy2 - fy1;
  const flen = Math.hypot(fdx, fdy);
  const fnx = -fdy / flen, fny = fdx / flen;
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    const px = fx1 + fdx * t;
    const py = fy1 + fdy * t;
    ctx.beginPath();
    ctx.moveTo(px - fnx * (crossH * 0.85), py - fny * (crossH * 0.85));
    ctx.lineTo(px + fnx * (crossH * 0.85), py + fny * (crossH * 0.85));
    ctx.stroke();
  }

  // Delicate faint vertical incision trace dropping towards brow
  ctx.save();
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = 'rgba(24, 28, 38, 0.60)';
  ctx.beginPath();
  ctx.moveTo(fx2, fy2);
  ctx.lineTo(-r * 0.32, -r * 0.12);
  ctx.stroke();
  ctx.restore();

  // 4. ── NECK SUTURE (Throat across collar opening) ──
  const ny = r * 0.26;
  ctx.beginPath();
  ctx.moveTo(-r * 0.28, ny);
  ctx.lineTo(r * 0.28, ny);
  ctx.stroke();

  const neckStitches = [-r * 0.18, 0, r * 0.18];
  for (const nx of neckStitches) {
    ctx.beginPath();
    ctx.moveTo(nx, ny - (crossH * 0.75));
    ctx.lineTo(nx, ny + (crossH * 0.75));
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws Mahito's brawler hand fist with surgical stitches or armored claws.
 */
function drawHandFist(ctx, x, y, handRadius, isTransformed, fighter) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(x, y);

  if (isTransformed) {
    // ── Transformed Form: Armored Obsidian Claw Fist with Cyan Edge ──
    ctx.fillStyle = '#0E1322';
    ctx.beginPath();
    ctx.arc(0, 0, handRadius * 1.05, 0, Math.PI * 2);
    ctx.fill();

    // Cyan energy rim highlight
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Sharp claw knuckle plates
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(handRadius * 0.35, 0, handRadius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Cyan claw tip
    ctx.fillStyle = '#00F0FF';
    ctx.beginPath();
    ctx.moveTo(handRadius * 0.7, -handRadius * 0.3);
    ctx.lineTo(handRadius * 1.35, 0);
    ctx.lineTo(handRadius * 0.7, handRadius * 0.3);
    ctx.closePath();
    ctx.fill();
  } else {
    // ── Base Form: Pale Stitched Human Fist ──
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.arc(0, 0, handRadius, 0, Math.PI * 2);
    ctx.fill();

    // Dark outline
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Cross-stitch across the wrist/knuckle
    drawStitchLine(ctx, -handRadius * 0.4, -handRadius * 0.5, -handRadius * 0.4, handRadius * 0.5, 2, 2.2, '#1F2937');
  }

  ctx.restore();
}

/**
 * Draws the Instant Spirit Body of Distorted Killing (ISBoDK) Carapace in Upright Orientation.
 */
function drawTransformedCarapace(ctx, r) {
  // 1. Segmented Bladed Tail extending from behind the lower body
  ctx.save();
  ctx.fillStyle = '#0E1322';
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 1.4;

  let currX = 0;
  let currY = r * 0.8;

  ctx.beginPath();
  ctx.moveTo(currX, currY);
  const tailNodes = 4;
  for (let i = 0; i < tailNodes; i++) {
    currX += (i % 2 === 0 ? 4 : -4) + Math.sin(Date.now() * 0.005 + i) * 3;
    currY += 7 + i * 2;
    ctx.lineTo(currX, currY);
  }
  ctx.stroke();

  // Tail scythe blade tip
  ctx.fillStyle = '#00E5FF';
  ctx.beginPath();
  ctx.moveTo(currX - 5, currY);
  ctx.lineTo(currX, currY + 11);
  ctx.lineTo(currX + 5, currY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 2. Large Curved Elbow/Forearm Scythe Blades (Left & Right)
  ctx.save();
  ctx.fillStyle = '#0E1322';
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 1.6;

  // Left Scythe Blade
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, 0);
  ctx.quadraticCurveTo(-r * 1.5, -r * 0.5, -r * 1.35, -r * 1.1);
  ctx.quadraticCurveTo(-r * 0.9, -r * 0.4, -r * 0.70, -r * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right Scythe Blade
  ctx.beginPath();
  ctx.moveTo(r * 0.75, 0);
  ctx.quadraticCurveTo(r * 1.5, -r * 0.5, r * 1.35, -r * 1.1);
  ctx.quadraticCurveTo(r * 0.9, -r * 0.4, r * 0.70, -r * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 3. Top Head Crest / Armored Horns (Upward at -y)
  ctx.save();
  ctx.fillStyle = '#0E1322';
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 1.5;

  // Left Horn
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.75);
  ctx.lineTo(-r * 0.35, -r * 1.25);
  ctx.lineTo(-r * 0.15, -r * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right Horn
  ctx.beginPath();
  ctx.moveTo(r * 0.45, -r * 0.75);
  ctx.lineTo(r * 0.35, -r * 1.25);
  ctx.lineTo(r * 0.15, -r * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 4. Main Armored Obsidian Body Base
  ctx.fillStyle = '#0E1322';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 5. Exoskeleton Plating & Glowing Visor
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // Torso Rib Plating (Bottom +y)
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.3);
  ctx.lineTo(-r * 0.3, r * 0.15);
  ctx.lineTo(0, r * 0.25);
  ctx.lineTo(r * 0.3, r * 0.15);
  ctx.lineTo(r, r * 0.3);
  ctx.lineTo(r, r);
  ctx.lineTo(-r, r);
  ctx.closePath();
  ctx.fill();

  // Plating seams
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, r * 0.5);
  ctx.lineTo(r * 0.6, r * 0.5);
  ctx.moveTo(-r * 0.4, r * 0.75);
  ctx.lineTo(r * 0.4, r * 0.75);
  ctx.stroke();

  // Glowing Cyan Horizontal Eye Slits
  ctx.fillStyle = '#00F0FF';
  // Left eye slit
  ctx.beginPath();
  ctx.ellipse(-r * 0.28, -r * 0.15, r * 0.24, r * 0.07, -Math.PI * 0.08, 0, Math.PI * 2);
  ctx.fill();
  // Right eye slit
  ctx.beginPath();
  ctx.ellipse(r * 0.28, -r * 0.15, r * 0.24, r * 0.07, Math.PI * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Inner white hot core
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(-r * 0.28, -r * 0.15, r * 0.14, r * 0.035, -Math.PI * 0.08, 0, Math.PI * 2);
  ctx.ellipse(r * 0.28, -r * 0.15, r * 0.14, r * 0.035, Math.PI * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws Mahito's Base Form in Upright Orientation matching the reference anime design.
 * Features:
 * - Flowing steel-blue hair with tied hair bundles & dark bands
 * - Sickly pale skin with iconic facial and neck surgical stitches (NO eyes)
 * - Detailed dark patchwork poncho tunic with stitched square grid pattern
 */
function drawBaseMahito(ctx, r) {
  // ── 1. BACK HAIR VOLUME & TIED HAIR BUNDLES (Drawn behind body circle) ──
  ctx.save();
  ctx.fillStyle = '#9EB7C6';
  ctx.strokeStyle = '#678696';
  ctx.lineWidth = 1.4;

  // A. Top-Right High Ponytail (Holding hair bundle up/back as in reference)
  ctx.beginPath();
  ctx.moveTo(r * 0.35, -r * 0.55);
  ctx.quadraticCurveTo(r * 0.85, -r * 0.95, r * 1.15, -r * 0.80);
  ctx.lineTo(r * 1.30, -r * 0.95);
  ctx.lineTo(r * 1.20, -r * 0.70);
  ctx.lineTo(r * 1.35, -r * 0.65);
  ctx.lineTo(r * 1.10, -r * 0.50);
  ctx.quadraticCurveTo(r * 0.75, -r * 0.50, r * 0.45, -r * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dark hair tie band for top-right ponytail
  ctx.fillStyle = '#1A1E29';
  ctx.beginPath();
  ctx.ellipse(r * 0.85, -r * 0.70, r * 0.12, r * 0.22, Math.PI * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // B. Left-Front Tied Hair Bundle (Draping down to lower shoulder/chest)
  ctx.fillStyle = '#9EB7C6';
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.10);
  ctx.quadraticCurveTo(-r * 0.85, r * 0.20, -r * 0.65, r * 0.70);
  ctx.lineTo(-r * 0.75, r * 0.85);
  ctx.lineTo(-r * 0.55, r * 0.80);
  ctx.lineTo(-r * 0.60, r * 0.95);
  ctx.lineTo(-r * 0.40, r * 0.80);
  ctx.quadraticCurveTo(-r * 0.45, r * 0.40, -r * 0.25, r * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dark hair tie band for left-front bundle
  ctx.fillStyle = '#1A1E29';
  ctx.beginPath();
  ctx.ellipse(-r * 0.52, r * 0.42, r * 0.14, r * 0.20, -Math.PI * 0.30, 0, Math.PI * 2);
  ctx.fill();

  // C. Lower-Left and Lower-Right Back Hair Volume
  ctx.fillStyle = '#7E9BAA';
  ctx.beginPath();
  ctx.moveTo(-r * 0.65, r * 0.25);
  ctx.quadraticCurveTo(-r * 1.05, r * 0.60, -r * 0.85, r * 0.95);
  ctx.quadraticCurveTo(-r * 0.55, r * 0.80, -r * 0.35, r * 0.65);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(r * 0.65, r * 0.25);
  ctx.quadraticCurveTo(r * 1.05, r * 0.60, r * 0.85, r * 0.95);
  ctx.quadraticCurveTo(r * 0.55, r * 0.80, r * 0.35, r * 0.65);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  // ── 2. PALE CURSED SPIRIT SKIN BASE ──
  ctx.fillStyle = '#EEF3F7';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // ── 3. CLOTHING: DARK SLEEVELESS PATCHWORK PONCHO WITH GRID DETAILS ──
  // Poncho dark base fabric fill
  ctx.fillStyle = '#181920';
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.26);
  ctx.lineTo(-r * 0.40, r * 0.22);
  ctx.lineTo(-r * 0.15, r * 0.36);
  ctx.lineTo(0, r * 0.38);
  ctx.lineTo(r * 0.25, r * 0.32);
  ctx.lineTo(r * 0.55, r * 0.20);
  ctx.lineTo(r, r * 0.24);
  ctx.lineTo(r, r);
  ctx.lineTo(-r, r);
  ctx.closePath();
  ctx.fill();

  // Open Neck Pale Skin Cutout (showing neck and collarbones)
  ctx.fillStyle = '#EEF3F7';
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, r * 0.20);
  ctx.lineTo(-r * 0.15, r * 0.36);
  ctx.lineTo(0, r * 0.38);
  ctx.lineTo(r * 0.25, r * 0.32);
  ctx.lineTo(r * 0.45, r * 0.20);
  ctx.lineTo(0, r * 0.12);
  ctx.closePath();
  ctx.fill();

  // Neck Stitches are now drawn cleanly by drawMahitoFacialStitches

  // Poncho Collar Hem Line
  ctx.strokeStyle = '#2B2E3C';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.26);
  ctx.lineTo(-r * 0.40, r * 0.22);
  ctx.lineTo(-r * 0.15, r * 0.36);
  ctx.lineTo(0, r * 0.38);
  ctx.lineTo(r * 0.25, r * 0.32);
  ctx.lineTo(r * 0.55, r * 0.20);
  ctx.lineTo(r, r * 0.24);
  ctx.stroke();

  // ── DETAILED PATCHWORK GRID & SEAM STITCHES ON PONCHO ──
  ctx.save();
  ctx.strokeStyle = '#2E3242';
  ctx.lineWidth = 1.2;

  // Horizontal Grid Seams
  const horizLines = [r * 0.48, r * 0.65, r * 0.82, r * 0.96];
  for (const hy of horizLines) {
    ctx.beginPath();
    ctx.moveTo(-r, hy);
    ctx.lineTo(r, hy);
    ctx.stroke();

    // Subtle stitch cross-ticks along horizontal seams
    ctx.save();
    ctx.strokeStyle = '#3D4255';
    ctx.lineWidth = 1.0;
    for (let hx = -r * 0.80; hx <= r * 0.80; hx += r * 0.20) {
      ctx.beginPath();
      ctx.moveTo(hx, hy - 1.8);
      ctx.lineTo(hx, hy + 1.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Vertical Grid Seams
  const vertCols = [-r * 0.70, -r * 0.45, -r * 0.20, r * 0.05, r * 0.30, r * 0.55, r * 0.80];
  for (const vx of vertCols) {
    ctx.beginPath();
    ctx.moveTo(vx, r * 0.28);
    ctx.lineTo(vx, r);
    ctx.stroke();

    // Subtle stitch cross-ticks along vertical seams
    ctx.save();
    ctx.strokeStyle = '#3D4255';
    ctx.lineWidth = 1.0;
    for (let vy = r * 0.38; vy <= r * 0.95; vy += r * 0.17) {
      ctx.beginPath();
      ctx.moveTo(vx - 1.8, vy);
      ctx.lineTo(vx + 1.8, vy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Asymmetrical shoulder sleeve opening detail (right side in reference)
  ctx.strokeStyle = '#383C4D';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(r * 0.55, r * 0.20);
  ctx.lineTo(r * 0.82, r * 0.45);
  ctx.stroke();

  ctx.restore();

  // ── 4. EXACT FACIAL SURGICAL SUTURES & STITCHES (Anime Reference) ──
  drawMahitoFacialStitches(ctx, r);

  // ── 5. FLOWING GREY-BLUE HAIR (Anime Fringe with Long Center & Curving Side Locks) ──
  ctx.fillStyle = '#9EB7C6';
  ctx.beginPath();
  ctx.moveTo(-r, -r);
  ctx.lineTo(r, -r);
  ctx.lineTo(r, -r * 0.10);

  // ★ RIGHT LONG CURVING SIDE LOCK ★ (Drapes down along right cheek)
  ctx.quadraticCurveTo(r * 0.95, -r * 0.05, r * 0.78, +r * 0.12);
  ctx.lineTo(r * 0.75, +r * 0.14);
  ctx.quadraticCurveTo(r * 0.68, -r * 0.12, r * 0.62, -r * 0.44);

  // Right-center spikes
  ctx.lineTo(r * 0.48, -r * 0.30);
  ctx.lineTo(r * 0.38, -r * 0.46);
  ctx.lineTo(r * 0.25, -r * 0.32);
  ctx.lineTo(r * 0.12, -r * 0.44);

  // ★ SIGNATURE LONG CENTER HAIR LOCK ★ (Extends far down in the middle)
  ctx.lineTo(-r * 0.02, -r * 0.08);   // Long center tip hanging down
  ctx.lineTo(-r * 0.14, -r * 0.44);   // Recess to left

  // Left-center spike
  ctx.lineTo(-r * 0.28, -r * 0.32);
  ctx.lineTo(-r * 0.42, -r * 0.54);   // Forehead opening recess (exposing forehead stitches)
  ctx.lineTo(-r * 0.54, -r * 0.30);
  ctx.lineTo(-r * 0.62, -r * 0.44);

  // ★ LEFT LONG CURVING SIDE LOCK ★ (Drapes down along left cheek)
  ctx.quadraticCurveTo(-r * 0.68, -r * 0.12, -r * 0.75, +r * 0.14);
  ctx.lineTo(-r * 0.78, +r * 0.12);
  ctx.quadraticCurveTo(-r * 0.95, -r * 0.05, -r, -r * 0.10);
  ctx.closePath();
  ctx.fill();

  // Dark Anime Outline
  ctx.strokeStyle = '#181B24';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Clean hair strand accent lines & curving highlights
  ctx.strokeStyle = '#C7DEEC';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  // Long center lock highlight streak
  ctx.moveTo(-r * 0.02, -r * 0.78);
  ctx.lineTo(-r * 0.02, -r * 0.12);
  // Right curving side lock highlight
  ctx.moveTo(r * 0.62, -r * 0.65);
  ctx.quadraticCurveTo(r * 0.78, -r * 0.10, r * 0.74, +r * 0.08);
  // Left curving side lock highlight
  ctx.moveTo(-r * 0.62, -r * 0.65);
  ctx.quadraticCurveTo(-r * 0.78, -r * 0.10, -r * 0.74, +r * 0.08);
  // Interior spike highlights
  ctx.moveTo(r * 0.38, -r * 0.32);
  ctx.lineTo(r * 0.40, -r * 0.70);
  ctx.moveTo(-r * 0.28, -r * 0.32);
  ctx.lineTo(-r * 0.26, -r * 0.70);
  ctx.stroke();

  ctx.restore();

  // ── 6. CRISP DARK BODY OUTLINE ──
  ctx.strokeStyle = '#181B24';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Main Skin Drawing Entry Point for Mahito.
 * Adheres strictly to docs/fighter_hand_positioning_guide.md and Rule #2.
 */
export function drawMahitoSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isTransformed = Boolean(fighter.isTransformed || fighter.isDistortedKilling);

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // 1. Draw Cursed Soul Aura around Mahito
  drawCursedSoulAura(ctx, fighter);

  // 2. Aim & Orientation Transform (Core Stance Coordinate Frame)
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 3. Smooth Punch Animation Dynamics (Ease curve for lunges/recoils)
  const isMatchEnded = typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd' || fighter._isWinnerReveal);
  const isPunching = !isMatchEnded && fighter.punchAnimTimer > 0;
  let rawProgress = 0;
  if (isPunching) {
    const maxT = fighter.punchMaxTime || 16;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
  }

  let easePunch = 0;
  if (isPunching) {
    if (rawProgress < 0.28) {
      easePunch = Math.sin((rawProgress / 0.28) * (Math.PI / 2));
    } else {
      const retract = (rawProgress - 0.28) / 0.72;
      easePunch = Math.cos(retract * (Math.PI / 2));
    }
  }

  const lungeExtension = isPunching ? easePunch * (r * 1.5) : 0;
  const oppositeRecoil = isPunching ? -Math.sin(rawProgress * Math.PI) * (r * 0.20) : 0;

  // 4. Standard Brawler Guard Stance Calculations (Section 2 of Guide)
  let frontHandX = 0, frontHandY = 0;
  let backHandX = 0, backHandY = 0;

  if (isPunching) {
    if (fighter.isRightPunch) {
      frontHandX = r * 0.85 + lungeExtension * 1.40;
      backHandX  = r * 1.05 + oppositeRecoil;
    } else {
      backHandX  = r * 1.05 + lungeExtension * 1.60;
      frontHandX = oppositeRecoil;
    }
  } else {
    // Idle brawler guard stance: front hand (top layer) at (0, 0), back hand (back layer) at (r * 1.05, 0)
    frontHandX = 0;
    frontHandY = 0;
    backHandX  = r * 1.05;
    backHandY  = 0;
  }

  const handRadius = getHandSize(7.5);

  // 5. Render Back Hand Layer (Behind Body Circle) - Rule #2
  if (!fighter._isWinnerReveal && !fighter.hideBackHand) {
    drawHandFist(ctx, backHandX, backHandY, handRadius, isTransformed, fighter);
  }

  // 6. Render Body Circle
  if (isTransformed) {
    drawTransformedCarapace(ctx, r);
  } else {
    drawBaseMahito(ctx, r);
  }

  // 7. Render Front Hand Layer (On Top of Body Circle) - Rule #2
  if (!fighter._isWinnerReveal && !fighter.hideFrontHand) {
    drawHandFist(ctx, frontHandX, frontHandY, handRadius, isTransformed, fighter);
  }

  // 8. Gojo Infinity Freeze / Time Stop Overlay Standard (Rule #9)
  if (fighter.timeStopTimer > 0 || fighter.isFrozenByInfinity) {
    ctx.fillStyle = 'rgba(0, 229, 255, 0.65)';
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
