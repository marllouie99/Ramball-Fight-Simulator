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
import { 
  drawMahitoArmMorph, 
  drawMahitoSubterraneanFleshSurge, 
  drawMahitoFleshSurgeForegroundArm,
  drawMahitoMaceCannon,
  drawMahitoTwinScissor 
} from '../weapons/mahitoWeaponGraphics.js';
import { GojoRenderer } from './gojoRenderer.js';

/**
 * Renders JJK-authentic Cursed Energy Flame Aura engulfing Mahito.
 * Uses the exact same Sakuga JJK Cursed Energy engine as Gojo, Yuji, and Todo (recolored to Mahito's magenta/violet theme).
 */
function drawMahitoCursedEnergyAura(ctx, fighter) {
  if (typeof GojoRenderer !== 'undefined' && typeof GojoRenderer._drawJJKCursedEnergyAura === 'function') {
    const opacity = (fighter.combatAuraOpacity !== undefined) ? fighter.combatAuraOpacity : 1.0;
    if (opacity <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = opacity;
    // Pass local coordinates (0, 0) since ctx is already translated to (fighter.x, fighter.y)
    GojoRenderer._drawJJKCursedEnergyAura(ctx, fighter, 'mahito', 0, 0, fighter.r);
    ctx.restore();
  }
}


/**
 * Draws Mahito's authentic anime surgical stitches matching reference:
 * - Natural dark incision cut line with slight cylindrical curvature.
 * - Paired, bold surgical cross-stitch loops / staples (|| ... ||) crossing the cut.
 * - Bold stitch thickness (2.2px) with subtle knot endpoint dots.
 */
function drawStitchLine(ctx, x1, y1, x2, y2, stitchCount = 4, crossLength = 3.6, stitchColor = '#000000') {
  ctx.save();
  ctx.strokeStyle = stitchColor;
  ctx.fillStyle = stitchColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len <= 0) {
    ctx.restore();
    return;
  }

  const snx = -dy / len;
  const sny =  dx / len;

  // 1. Incision Cut Line (Clean dark surgical incision)
  ctx.lineWidth = 1.35;
  ctx.beginPath();
  const midX = (x1 + x2) / 2 + snx * (len * 0.10);
  const midY = (y1 + y2) / 2 + sny * (len * 0.10);
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(midX, midY, x2, y2);
  ctx.stroke();

  // 2. Cross-Stitches (3 lines: pair of 2 on one side, 1 isolated line on the other side: || ... |)
  ctx.lineWidth = 2.0;

  let tValues = [];
  if (stitchCount === 2) {
    tValues = [0.28, 0.72];
  } else if (stitchCount === 3) {
    // 2 lines close together on one side, 1 isolated line far away on the other side:
    tValues = [0.22, 0.38, 0.80];
  } else {
    // Default 3 lines: pair + isolated single line
    tValues = [0.22, 0.38, 0.80];
  }

  for (let i = 0; i < tValues.length; i++) {
    const t = tValues[i];
    const mt = 1 - t;
    const px = mt * mt * x1 + 2 * mt * t * midX + t * t * x2;
    const py = mt * mt * y1 + 2 * mt * t * midY + t * t * y2;

    const tdx = 2 * (1 - t) * (midX - x1) + 2 * t * (x2 - midX);
    const tdy = 2 * (1 - t) * (midY - y1) + 2 * t * (y2 - midY);
    const tlen = Math.hypot(tdx, tdy) || 1;
    const nx = -tdy / tlen;
    const ny =  tdx / tlen;

    ctx.beginPath();
    ctx.moveTo(px - nx * crossLength, py - ny * crossLength);
    ctx.lineTo(px + nx * crossLength, py + ny * crossLength);
    ctx.stroke();

    // Puncture knots
    ctx.beginPath();
    ctx.arc(px - nx * crossLength, py - ny * crossLength, 0.8, 0, Math.PI * 2);
    ctx.arc(px + nx * crossLength, py + ny * crossLength, 0.8, 0, Math.PI * 2);
    ctx.fill();
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
 * Draws Mahito's brawler hand fist enveloped in authentic JJK Cursed Energy matching reference image.
 * Features:
 * - Anatomical clenched fist with 4 defined knuckle bulges, curled thumb & thumbnail bed
 * - Dual-tone patchwork porcelain/grey skin with signature surgical sutures & cross-ticks
 * - Subterranean Cursed Energy micro-veins
 * - Transformed form: Segmented obsidian chitin exoskeleton with 3 glowing razor scythe talons
 * - Flowing viscous magenta/violet Cursed Energy flame envelope & crackling soul sparks
 */
export function drawHandFist(ctx, x, y, handRadius, isTransformed, fighter) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(x, y);

  const isPunching = fighter && fighter.punchAnimTimer > 0;
  const opacity = (fighter && fighter._isWinnerReveal) ? 1.0 : (fighter.combatAuraOpacity || (isPunching ? 1.0 : 0.0));
  const showCE = opacity > 0.05 || isPunching;

  // ── 1. JJK CURSED ENERGY FLAME ENVELOPE (Reference Anime Screenshot) ──
  if (showCE) {
    ctx.save();
    const ceAlpha = isPunching ? 1.0 : opacity;
    const now = Date.now() * 0.005;
    const ceBlobRadius = handRadius * (isPunching ? 2.4 : 1.85);

    // Dynamic 8-point viscous flame blob contour around the fist
    const numFlamePts = 8;
    const flamePts = [];
    for (let i = 0; i < numFlamePts; i++) {
      const ang = (Math.PI * 2 / numFlamePts) * i;
      const wave = Math.sin(now * 3.5 + i * 1.8) * (handRadius * 0.35);
      const stretch = (Math.cos(ang) > 0.2 ? handRadius * 0.45 : 0); // Stretch along +X punch vector
      const curR = ceBlobRadius + wave + stretch;
      flamePts.push({
        x: Math.cos(ang) * curR,
        y: Math.sin(ang) * curR
      });
    }

    ctx.beginPath();
    let fmx = (flamePts[numFlamePts - 1].x + flamePts[0].x) / 2;
    let fmy = (flamePts[numFlamePts - 1].y + flamePts[0].y) / 2;
    ctx.moveTo(fmx, fmy);
    for (let i = 0; i < numFlamePts; i++) {
      const p = flamePts[i];
      const next = flamePts[(i + 1) % numFlamePts];
      ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
    }
    ctx.closePath();

    // A. Concentric Soft Magenta Bloom (Zero shadowBlur - Rule #11)
    const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
    if (!isLowQuality) {
      ctx.save();
      ctx.scale(1.25, 1.25);
      ctx.beginPath();
      ctx.moveTo(fmx, fmy);
      for (let i = 0; i < numFlamePts; i++) {
        const p = flamePts[i];
        const next = flamePts[(i + 1) % numFlamePts];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(217, 70, 239, ${(0.22 * ceAlpha).toFixed(3)})`;
      ctx.fill();
      ctx.restore();
    }

    // B. Vibrant Radial Cursed Energy Gradient (Lilac Core -> Vivid Magenta Body -> Violet Plum Edge)
    const ceGrad = ctx.createRadialGradient(0, 0, handRadius * 0.2, 0, 0, ceBlobRadius * 1.3);
    ceGrad.addColorStop(0,    `rgba(245, 208, 254, ${(0.95 * ceAlpha).toFixed(3)})`); // Luminous Lilac-White Core
    ceGrad.addColorStop(0.35, `rgba(217, 70, 239, ${(0.85 * ceAlpha).toFixed(3)})`); // Vibrant Magenta CE Body
    ceGrad.addColorStop(0.70, `rgba(168, 85, 247, ${(0.65 * ceAlpha).toFixed(3)})`); // Violet Mid-Tone
    ceGrad.addColorStop(1.0,  `rgba(59, 7, 100, ${(0.15 * ceAlpha).toFixed(3)})`);  // Deep Violet-Plum Edge

    ctx.fillStyle = ceGrad;
    ctx.fill();

    // C. Deep Violet-Plum Ink Stroke Outline (Authentic JJK Ink Brush Effect)
    ctx.strokeStyle = `rgba(59, 7, 100, ${(0.95 * ceAlpha).toFixed(3)})`;
    ctx.lineWidth = 1.9;
    ctx.stroke();

    // D. Tiny Crackling Cursed Soul Sparks
    if (isPunching) {
      ctx.strokeStyle = `rgba(245, 208, 254, 0.90)`;
      ctx.lineWidth = 1.2;
      for (let s = 0; s < 3; s++) {
        const sang = now * 4 + s * 2.1;
        const sr1 = handRadius * 0.8;
        const sr2 = handRadius * 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(sang) * sr1, Math.sin(sang) * sr1);
        ctx.lineTo(Math.cos(sang + 0.3) * sr2, Math.sin(sang + 0.3) * sr2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ── 2. PHYSICAL HAND / FIST ──
  if (isTransformed) {
    // ── Transformed Form: Armored Obsidian Chitin Fist with Scythe Claws ──
    ctx.save();

    // 1. Armored Chitin Exoskeleton Base (Segmented Plates)
    ctx.fillStyle = '#0E1322';
    ctx.beginPath();
    ctx.moveTo(-handRadius * 0.85, -handRadius * 0.75);
    ctx.lineTo(handRadius * 0.45, -handRadius * 0.85);
    ctx.lineTo(handRadius * 1.05, 0);
    ctx.lineTo(handRadius * 0.45, handRadius * 0.85);
    ctx.lineTo(-handRadius * 0.85, handRadius * 0.75);
    ctx.closePath();
    ctx.fill();

    // 2. Chitin Carapace Plates with Deep Violet Bevels
    ctx.fillStyle = '#1E1528';
    ctx.beginPath();
    ctx.moveTo(-handRadius * 0.4, -handRadius * 0.55);
    ctx.lineTo(handRadius * 0.35, -handRadius * 0.65);
    ctx.lineTo(handRadius * 0.65, 0);
    ctx.lineTo(handRadius * 0.35, handRadius * 0.65);
    ctx.lineTo(-handRadius * 0.4, handRadius * 0.55);
    ctx.closePath();
    ctx.fill();

    // Specular Carapace Edges
    ctx.strokeStyle = '#D946EF';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 3. 3 Razor Scythe Claws / Talons extending from knuckle plates
    const clawCount = 3;
    for (let c = 0; c < clawCount; c++) {
      const cy = -handRadius * 0.45 + c * (handRadius * 0.45);
      const cx = handRadius * 0.65;
      const clawLen = handRadius * (0.85 + (c === 1 ? 0.3 : 0)); // Middle talon is longer

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy - handRadius * 0.16);
      ctx.lineTo(cx + clawLen, cy); // Needle-sharp talon tip
      ctx.lineTo(cx, cy + handRadius * 0.16);
      ctx.closePath();

      // Lilac-White Razor Edge with Magenta Core
      ctx.fillStyle = '#F5D0FE';
      ctx.fill();
      ctx.strokeStyle = '#D946EF';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // Glow core line
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + 2, cy);
      ctx.lineTo(cx + clawLen - 2, cy);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Outer Ink & Neon Violet Edge
    ctx.strokeStyle = '#3B0764';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 5. Glowing Soul Slits (Chitin Vents)
    ctx.strokeStyle = 'rgba(245, 208, 254, 0.9)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-handRadius * 0.5, -handRadius * 0.3);
    ctx.lineTo(-handRadius * 0.1, -handRadius * 0.3);
    ctx.moveTo(-handRadius * 0.5, handRadius * 0.3);
    ctx.lineTo(-handRadius * 0.1, handRadius * 0.3);
    ctx.stroke();

    ctx.restore();
  } else {
    // ── Base Form: Pale Stitched Human Fist with Anatomical Knuckles & Patchwork Suture ──
    ctx.save();

    // 1. Dual-tone patchwork skin base
    ctx.beginPath();
    ctx.moveTo(-handRadius * 0.75, -handRadius * 0.65);
    ctx.lineTo(handRadius * 0.45, -handRadius * 0.75); // Top/thumb root
    ctx.quadraticCurveTo(handRadius * 1.05, -handRadius * 0.45, handRadius * 1.05, 0); // Knuckle ridge apex
    ctx.quadraticCurveTo(handRadius * 1.05, handRadius * 0.55, handRadius * 0.45, handRadius * 0.75); // Bottom pinky base
    ctx.lineTo(-handRadius * 0.75, handRadius * 0.65); // Wrist base
    ctx.closePath();

    // Dual-tone patchwork split:
    ctx.fillStyle = '#EEF3F7'; // Pale porcelain skin tone
    ctx.fill();

    // Secondary stitched patch on bottom/wrist half
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-handRadius * 0.75, 0);
    ctx.lineTo(handRadius * 1.05, 0);
    ctx.lineTo(handRadius * 0.45, handRadius * 0.75);
    ctx.lineTo(-handRadius * 0.75, handRadius * 0.65);
    ctx.closePath();
    ctx.fillStyle = '#E2E8F0'; // Slightly darker stitched skin patch
    ctx.fill();
    ctx.restore();

    // 2. 4 Defined Knuckle Bulges on +X edge
    const numKnuckles = 4;
    for (let k = 0; k < numKnuckles; k++) {
      const ky = -handRadius * 0.52 + k * (handRadius * 0.35);
      const kx = handRadius * (0.88 + Math.cos((k - 1.5) * 0.7) * 0.18);
      const kr = handRadius * 0.22;

      // Knuckle highlight cap
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(kx, ky, kr, 0, Math.PI * 2);
      ctx.fill();

      // Subtle finger crease line
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(kx - kr * 0.8, ky);
      ctx.lineTo(kx + kr * 0.3, ky);
      ctx.stroke();
    }

    // 3. Folded Thumb & Thumbnail across the upper edge
    ctx.save();
    ctx.fillStyle = '#F1F5F9';
    ctx.strokeStyle = '#181C26';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-handRadius * 0.35, -handRadius * 0.55);
    ctx.quadraticCurveTo(handRadius * 0.25, -handRadius * 0.85, handRadius * 0.45, -handRadius * 0.35);
    ctx.quadraticCurveTo(handRadius * 0.15, -handRadius * 0.25, -handRadius * 0.35, -handRadius * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pale lilac thumbnail bed
    ctx.fillStyle = 'rgba(216, 180, 254, 0.75)';
    ctx.beginPath();
    ctx.ellipse(handRadius * 0.28, -handRadius * 0.45, handRadius * 0.12, handRadius * 0.08, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Dark Ink Silhouette Contour
    ctx.strokeStyle = '#181C26';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-handRadius * 0.75, -handRadius * 0.65);
    ctx.lineTo(handRadius * 0.45, -handRadius * 0.75);
    ctx.quadraticCurveTo(handRadius * 1.05, -handRadius * 0.45, handRadius * 1.05, 0);
    ctx.quadraticCurveTo(handRadius * 1.05, handRadius * 0.55, handRadius * 0.45, handRadius * 0.75);
    ctx.lineTo(-handRadius * 0.75, handRadius * 0.65);
    ctx.closePath();
    ctx.stroke();

    // 5. Mahito's Signature Cross-Stitches & Suture Lines (Paired anime surgical staples)
    // Diagonal main suture seam
    drawStitchLine(ctx, -handRadius * 0.45, -handRadius * 0.6, -handRadius * 0.15, handRadius * 0.65, 4, 3.4, '#000000');
    // Secondary wrist suture
    drawStitchLine(ctx, -handRadius * 0.75, -handRadius * 0.35, -handRadius * 0.75, handRadius * 0.35, 2, 3.0, '#000000');

    // 6. Micro Cursed Energy Veins branching across dorsal skin
    ctx.strokeStyle = 'rgba(192, 38, 211, 0.55)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-handRadius * 0.5, -handRadius * 0.1);
    ctx.lineTo(-handRadius * 0.1, -handRadius * 0.15);
    ctx.lineTo(handRadius * 0.3, -handRadius * 0.05);
    ctx.moveTo(-handRadius * 0.1, -handRadius * 0.15);
    ctx.lineTo(handRadius * 0.2, -handRadius * 0.35);
    ctx.stroke();

    ctx.restore();
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
  ctx.strokeStyle = '#D946EF';
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
  ctx.fillStyle = '#D946EF';
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
  ctx.strokeStyle = '#D946EF';
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
  ctx.strokeStyle = '#D946EF';
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

  ctx.strokeStyle = '#D946EF';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 5. Exoskeleton Plating & Glowing Visor
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // Torso Rib Plating (Bottom +y)
  ctx.fillStyle = '#2A1B3D';
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
  ctx.strokeStyle = '#D946EF';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, r * 0.5);
  ctx.lineTo(r * 0.6, r * 0.5);
  ctx.moveTo(-r * 0.4, r * 0.75);
  ctx.lineTo(r * 0.4, r * 0.75);
  ctx.stroke();

  // Glowing Magenta/Violet Horizontal Eye Slits
  ctx.fillStyle = '#E879F9';
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
 * Renders Phantom Soul Slip Cursed Energy afterimages in world space.
 */
function drawMahitoDashAfterimages(ctx, fighter) {
  if (!fighter._dashAfterimages || fighter._dashAfterimages.length === 0) return;
  const r = fighter.r || 25;

  for (let i = 0; i < fighter._dashAfterimages.length; i++) {
    const img = fighter._dashAfterimages[i];
    if (!img || img.alpha <= 0.02) continue;

    ctx.save();
    ctx.globalAlpha = img.alpha * 0.45;
    ctx.translate(img.x, img.y);
    ctx.rotate(img.angle || 0);

    const facingLeft = Math.abs(img.angle || 0) > Math.PI / 2;
    if (facingLeft) {
      ctx.scale(1, -1);
    }

    // Semi-transparent phantom silhouette in glowing Cursed Energy violet
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = img.isTransformed ? 'rgba(217, 70, 239, 0.65)' : 'rgba(192, 38, 211, 0.55)';
    ctx.fill();
    ctx.strokeStyle = img.isTransformed ? '#F5D0FE' : '#D946EF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Main Skin Drawing Entry Point for Mahito.
 * Adheres strictly to docs/fighter_hand_positioning_guide.md and Rule #2.
 */
export function drawMahitoSkin(ctx, fighter) {
  // 1. Render Phantom Soul Slip afterimages in world space
  drawMahitoDashAfterimages(ctx, fighter);

  // 2. Render Subterranean Flesh Surge tendrils in world coordinates
  drawMahitoSubterraneanFleshSurge(ctx, fighter);

  // 3. Render Mutated Mace Cannon (Stretch Arm Spiked Ball Shrapnel) in world coordinates
  drawMahitoMaceCannon(ctx, fighter);

  // 4. Render Dual Scythe Pincer Guillotine (Twin Stretched Blade Ambush - Back Arm) in world coordinates
  drawMahitoTwinScissor(ctx, fighter, 'back');

  const r = fighter.r || 25;
  const isTransformed = Boolean(fighter.isTransformed || fighter.isDistortedKilling);

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // 1. Draw JJK Cursed Energy Aura around Mahito
  drawMahitoCursedEnergyAura(ctx, fighter);

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
    if (rawProgress < 0.12) {
      // Instant snap forward in first 12% of animation
      easePunch = Math.sin((rawProgress / 0.12) * (Math.PI / 2));
    } else if (rawProgress < 0.46) {
      // Hold extended snap strike through the apex
      easePunch = 1.0;
    } else {
      // Clean smooth retraction
      const retract = (rawProgress - 0.46) / 0.54;
      easePunch = Math.cos(retract * (Math.PI / 2));
    }
  }

  const lungeExtension = isPunching ? easePunch * (r * 0.25) : 0;
  const oppositeRecoil = isPunching ? -Math.sin(rawProgress * Math.PI) * (r * 0.08) : 0;

  // 4. Compact Brawler Guard Stance Calculations (Hands anchored tightly to body rim)
  let frontHandX = 0, frontHandY = 0;
  let backHandX = 0, backHandY = 0;

  if (isPunching) {
    if (fighter.isRightPunch) {
      frontHandX = r * 0.70 + lungeExtension;
      frontHandY = r * 0.12;
      backHandX  = r * 0.40 + oppositeRecoil;
      backHandY  = -r * 0.15;
    } else {
      backHandX  = r * 0.70 + lungeExtension;
      backHandY  = -r * 0.12;
      frontHandX = r * 0.40 + oppositeRecoil;
      frontHandY = r * 0.15;
    }
  } else {
    // Idle brawler guard stance: front hand at (r * 0.45, r * 0.18), back hand at (r * 0.70, -r * 0.18)
    frontHandX = r * 0.45;
    frontHandY = r * 0.18;
    backHandX  = r * 0.70;
    backHandY  = -r * 0.18;
  }

  const handRadius = getHandSize(7.5);
  const morphType = fighter.morphType || 'blade';

  // 5. Render Back Hand Layer (Behind Body Circle) - Rule #2 & #20
  if (!fighter._isWinnerReveal && !fighter.hideBackHand) {
    if (isPunching && !fighter.isRightPunch) {
      drawMahitoArmMorph(ctx, fighter, isTransformed, false, morphType, rawProgress, backHandX, backHandY);
    } else {
      drawHandFist(ctx, backHandX, backHandY, handRadius, isTransformed, fighter);
    }
  }

  // 6. Render Body Circle
  if (isTransformed) {
    drawTransformedCarapace(ctx, r);
  } else {
    drawBaseMahito(ctx, r);
  }

  // 7. Render Front Hand Layer (On Top of Body Circle) - Rule #2 & #20
  if (!fighter._isWinnerReveal && (!fighter.twinScissorAnimTimer || fighter.twinScissorAnimTimer <= 0)) {
    if (fighter.fleshSurgeAnimTimer > 0) {
      // Draw Front Hand Stretch Socket & Foreground Arm in world space on top of body and aura
      ctx.save();
      if (facingLeft) ctx.scale(1, -1);
      ctx.rotate(-angle);
      ctx.translate(-fighter.x, -(fighter.y - (fighter.z || 0)));
      drawMahitoFleshSurgeForegroundArm(ctx, fighter, isTransformed);
      ctx.restore();
    } else if (!fighter.hideFrontHand) {
      if (isPunching && fighter.isRightPunch) {
        drawMahitoArmMorph(ctx, fighter, isTransformed, true, morphType, rawProgress, frontHandX, frontHandY);
      } else {
        drawHandFist(ctx, frontHandX, frontHandY, handRadius, isTransformed, fighter);
      }
    }
  }

  // 8. Gojo Infinity Freeze / Time Stop Overlay Standard (Rule #9)
  if (fighter.timeStopTimer > 0 || fighter.isFrozenByInfinity) {
    ctx.fillStyle = 'rgba(0, 229, 255, 0.65)';
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw status overlays (slow, electric stun, black flash, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();

  // 9. Render Front Stretch Arm, Socket & Scythe in world space (ON TOP of body circle)
  if (!fighter._isWinnerReveal && fighter.twinScissorAnimTimer > 0) {
    drawMahitoTwinScissor(ctx, fighter, 'front');
  }
}
