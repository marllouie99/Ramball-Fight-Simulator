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

import { CONFIG, getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { isSuppressedByGetsuga } from '../../entities/fighter.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { 
  drawMahitoArmMorph, 
  drawMahitoSubterraneanFleshSurge, 
  drawMahitoFleshSurgeForegroundArm,
  drawMahitoMaceCannon,
  drawMahitoTwinScissor 
} from '../weapons/mahitoWeaponGraphics.js';
import { GojoRenderer } from './gojoRenderer.js';
import { drawMinionHealthBar, drawMahitoFleshBubblyDeformLocal } from '../statusEffects.js';

let _mahitoHairImage = null;
let _mahitoHairImageLoading = false;

export function _getMahitoHairImage() {
  if (_mahitoHairImage && _mahitoHairImage.complete && _mahitoHairImage.naturalWidth > 0) {
    return _mahitoHairImage;
  }
  if (!_mahitoHairImageLoading && typeof Image !== 'undefined') {
    _mahitoHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _mahitoHairImage = img;
      _mahitoHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Mahito hair image at Assets/model/Mahito-hair.png', e);
      _mahitoHairImageLoading = false;
    };
    img.src = 'Assets/model/Mahito-hair.png?v=1';
    _mahitoHairImage = img;
  }
  return _mahitoHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getMahitoHairImage();
}

/**
 * Draws Mahito's signature long steel-blue hair from Assets/model/Mahito-hair.png.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawMahitoHair(ctx, r, facingLeft = false) {
  const hairImg = _getMahitoHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp pixel art fidelity (Rule #19)

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.mahito) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;

    // Mahito-hair.png (536x466). True visible hair bounding box:
    // X: [64, 471] (width 408, horizontal center at 267.5)
    // Y: [6, 463] (height 458, top crown at 6)
    // Calibrated to seamlessly frame the upper circle with crown at -1.25r
    const targetHairWidth = r * 2.35 * wMult;
    const targetHairHeight = r * 2.64 * hMult;
    const scaleX = targetHairWidth / 408;
    const scaleY = targetHairHeight / 458;
    const drawW = 536 * scaleX;
    const drawH = 466 * scaleY;
    const drawX = -267.5 * scaleX + offX;
    const drawY = -r * 1.25 - 6 * scaleY + offY;

    if (rot !== 0) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      ctx.rotate(rot);
      ctx.drawImage(hairImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(hairImg, drawX, drawY, drawW, drawH);
    }
    ctx.restore();
  }
}

/**
 * Renders JJK-authentic Cursed Energy Flame Aura engulfing Mahito.
 * Uses the exact same Sakuga JJK Cursed Energy engine as Gojo, Yuji, and Todo (recolored to Mahito's magenta/violet theme).
 */
export function drawMahitoCursedEnergyAura(ctx, fighter) {
  if (typeof state !== 'undefined' && state.gameState === 'countdown') return;
  if (typeof GojoRenderer !== 'undefined' && typeof GojoRenderer._drawJJKCursedEnergyAura === 'function') {
    // When split into clones, only the chosen clone with hasCursedEnergyAura renders the CE aura!
    if (fighter.isEvading || fighter.isEvasionMinion) {
      if (!fighter.hasCursedEnergyAura) return;
    }

    const opacity = (fighter.combatAuraOpacity !== undefined) ? fighter.combatAuraOpacity : 1.0;
    if (opacity <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = opacity;
    // Pass local coordinates (0, 0) since ctx is already translated to (fighter.x, fighter.y)
    const auraR = (fighter.isEvading || fighter.isEvasionMinion) ? 25 : (fighter.r || 25);
    GojoRenderer._drawJJKCursedEnergyAura(ctx, fighter, 'mahito', 0, 0, auraR);
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
/**
 * Draws Mahito's exact facial surgical stitches matching the anime screenshot.
 * Batched for 60 FPS performance (single path stroke).
 */
function drawMahitoFacialStitches(ctx, r) {
  ctx.save();
  ctx.strokeStyle = '#181C26';
  ctx.lineWidth = 1.25;
  ctx.lineCap = 'round';

  const crossH = 3.2; // Half-length of cross stitches
  const hy = -r * 0.04;

  ctx.beginPath();

  // 1. MAIN HORIZONTAL TRANSVERSE SUTURE ACROSS NOSE & CHEEKS
  ctx.moveTo(-r * 0.70, hy);
  ctx.lineTo(r * 0.70, hy);

  // Vertical stitch loops on Right Cheek
  const rightStitches = [r * 0.36, r * 0.43, r * 0.55, r * 0.62];
  for (let i = 0; i < rightStitches.length; i++) {
    const sx = rightStitches[i];
    ctx.moveTo(sx, hy - crossH);
    ctx.lineTo(sx, hy + crossH);
  }

  // Vertical stitch loops on Left Cheek
  const leftStitches = [-r * 0.16, -r * 0.23];
  for (let i = 0; i < leftStitches.length; i++) {
    const sx = leftStitches[i];
    ctx.moveTo(sx, hy - crossH);
    ctx.lineTo(sx, hy + crossH);
  }

  // 2. LEFT CHEEK VERTICAL SUTURE CUT & LOWER CHEEK STITCHES
  const vx = -r * 0.38;
  ctx.moveTo(vx, -r * 0.20);
  ctx.lineTo(vx, hy);
  ctx.lineTo(-r * 0.34, r * 0.22);

  // Two horizontal cross-stitches on lower left cheek cut
  ctx.moveTo(-r * 0.37 - crossH, r * 0.05);
  ctx.lineTo(-r * 0.37 + crossH, r * 0.05);
  ctx.moveTo(-r * 0.35 - crossH, r * 0.14);
  ctx.lineTo(-r * 0.35 + crossH, r * 0.14);

  // 3. FOREHEAD DIAGONAL SUTURE
  const fx1 = -r * 0.50, fy1 = -r * 0.48;
  const fx2 = -r * 0.28, fy2 = -r * 0.22;
  ctx.moveTo(fx1, fy1);
  ctx.lineTo(fx2, fy2);

  const fdx = fx2 - fx1, fdy = fy2 - fy1;
  const flen = Math.hypot(fdx, fdy) || 1;
  const fnx = -fdy / flen, fny = fdx / flen;
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    const px = fx1 + fdx * t;
    const py = fy1 + fdy * t;
    ctx.moveTo(px - fnx * (crossH * 0.85), py - fny * (crossH * 0.85));
    ctx.lineTo(px + fnx * (crossH * 0.85), py + fny * (crossH * 0.85));
  }

  // 4. NECK SUTURE
  const ny = r * 0.26;
  ctx.moveTo(-r * 0.28, ny);
  ctx.lineTo(r * 0.28, ny);

  const neckStitches = [-r * 0.18, 0, r * 0.18];
  for (let i = 0; i < neckStitches.length; i++) {
    const nx = neckStitches[i];
    ctx.moveTo(nx, ny - (crossH * 0.75));
    ctx.lineTo(nx, ny + (crossH * 0.75));
  }

  ctx.stroke();

  // Faint brow incision line
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = 'rgba(24, 28, 38, 0.60)';
  ctx.beginPath();
  ctx.moveTo(fx2, fy2);
  ctx.lineTo(-r * 0.32, -r * 0.12);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws Mahito's brawler hand fist matching reference image.
 * High performance optimized.
 */
export function drawHandFist(ctx, x, y, handRadius, isTransformed, fighter) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(x, y);

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

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws the Instant Spirit Body of Distorted Killing (ISBoDK) Carapace in Upright Orientation.
 */
function drawTransformedCarapace(ctx, r, hideElbowBlades = false) {
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

  // 2. Large Curved Elbow/Forearm Scythe Blades (Left & Right) - Hidden during Domain Expansion channeling
  if (!hideElbowBlades) {
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
  }

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

  // 4. Main Armored Obsidian Body Base & Exoskeleton Plating (Authentic Procedural Pixel Art)
  drawMahitoPixelBody(ctx, r, true);
}

/**
 * Draws Mahito's Base Form in Upright Orientation (Clean Bald Stitched Spirit).
 * Features:
 * - Sickly pale bald skin with iconic facial and neck surgical stitches (NO eyes)
 * - Detailed dark patchwork poncho tunic with stitched square grid pattern
 */
function drawBaseMahito(ctx, r, fighter, facingLeft = false) {
  // 1. PALE CURSED SPIRIT PIXEL ART BODY
  drawMahitoPixelBody(ctx, r, false);

  // 2. LONG STEEL-BLUE HAIR (Assets/model/Mahito-hair.png)
  _drawMahitoHair(ctx, r, facingLeft);
}

/**
 * Renders Phantom Soul Slip Cursed Energy afterimages in world space.
 */
function drawMahitoDashAfterimages(ctx, fighter) {
  const isChannelingDomain = Boolean(fighter && (fighter.domainChargeTimer > 0 || fighter.isChannelingDomainExpansion));
  if (isChannelingDomain) return;
  const isSuppressed = typeof fighter?.areAttackEffectsSuppressed === 'function' ? fighter.areAttackEffectsSuppressed() : (fighter.isTargetOfAmbush || fighter._suppressFreezeTimer || (fighter.timeStopTimer > 0) || (fighter.paralyzeTimer > 0 && !fighter.isParalyzedByMahito) || fighter.isFrozen || isSuppressedByGetsuga(fighter));
  if (isSuppressed) return;
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
 * Renders the multi-layered isometric Cursed Transfiguration ritual seal
 * on the arena floor beneath Mahito during Domain Expansion channeling.
 */
function drawMahitoDomainSummoningCircle(ctx, fighter, progress) {
  if (progress <= 0.001) return;

  const ringRadius = 175 * progress;
  const now = Date.now();

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.scale(1, 0.42); // Isometric 2.5D perspective

  // 1. Cursed Soul Floor Energy Wash
  const floorGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, ringRadius * 1.15);
  floorGrad.addColorStop(0.0, `rgba(217, 70, 239, ${(progress * 0.32).toFixed(3)})`);
  floorGrad.addColorStop(0.35, `rgba(147, 51, 234, ${(progress * 0.24).toFixed(3)})`);
  floorGrad.addColorStop(0.70, `rgba(59, 7, 100, ${(progress * 0.16).toFixed(3)})`);
  floorGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = floorGrad;
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius * 1.15, 0, Math.PI * 2);
  ctx.fill();

  // 2. Concentric Expanding Cursed Distortion Waves
  const waveCount = 2;
  for (let w = 0; w < waveCount; w++) {
    const waveP = ((now / 650 + w * 0.50) % 1.0);
    const waveR = ringRadius * waveP;
    const waveAlpha = Math.sin(waveP * Math.PI) * (progress * 0.45);
    if (waveR > 5 && waveAlpha > 0.01) {
      ctx.beginPath();
      ctx.arc(0, 0, waveR, 0, Math.PI * 2);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = `rgba(245, 208, 254, ${waveAlpha.toFixed(3)})`;
      ctx.stroke();
    }
  }

  // 3. Creeping Transfigured Woven Hand Tendril Shadows
  const handTendrilCount = 6;
  ctx.save();
  for (let h = 0; h < handTendrilCount; h++) {
    const baseTheta = (h / handTendrilCount) * Math.PI * 2 + (now * 0.0003);
    const tendrilP = Math.min(1.0, progress * 1.25);
    const outerX = Math.cos(baseTheta) * ringRadius;
    const outerY = Math.sin(baseTheta) * ringRadius;
    const innerDist = ringRadius * (1.0 - tendrilP * 0.70);
    const innerX = Math.cos(baseTheta + Math.sin(now * 0.003 + h) * 0.25) * innerDist;
    const innerY = Math.sin(baseTheta + Math.sin(now * 0.003 + h) * 0.25) * innerDist;

    // Shadow tendril body
    ctx.beginPath();
    ctx.moveTo(outerX, outerY);
    const midX = (outerX + innerX) / 2 + Math.sin(h * 1.7) * (ringRadius * 0.15);
    const midY = (outerY + innerY) / 2 + Math.cos(h * 1.7) * (ringRadius * 0.15);
    ctx.quadraticCurveTo(midX, midY, innerX, innerY);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = `rgba(18, 3, 28, ${(progress * 0.75).toFixed(3)})`;
    ctx.stroke();

    // Magenta glowing fingertip claw
    ctx.fillStyle = `rgba(217, 70, 239, ${(progress * 0.90).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(innerX, innerY, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4. Outer Transfigured Ink Boundary & Suture Nodes
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
  ctx.lineWidth = 5.5;
  ctx.strokeStyle = `rgba(12, 4, 18, ${(progress * 0.95).toFixed(3)})`;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = `rgba(217, 70, 239, ${progress.toFixed(3)})`;
  ctx.stroke();

  // 8 Cardinal & Diagonal Surgical Suture Nodes (Ritual Spikes / Staples)
  const nodeCount = 8;
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = `rgba(245, 208, 254, ${(progress * 0.95).toFixed(3)})`;
  for (let n = 0; n < nodeCount; n++) {
    const nodeTheta = (n / nodeCount) * Math.PI * 2;
    const nx = Math.cos(nodeTheta) * ringRadius;
    const ny = Math.sin(nodeTheta) * ringRadius;
    const spikeLen = 10 * progress;
    const sx = Math.cos(nodeTheta) * (ringRadius + spikeLen);
    const sy = Math.sin(nodeTheta) * (ringRadius + spikeLen);

    ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.lineTo(sx, sy);
    ctx.stroke();

    // Knot dot
    ctx.fillStyle = `rgba(217, 70, 239, ${(progress * 0.95).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Mid Rotating Surgical Suture Band (Clockwise)
  ctx.save();
  ctx.rotate(now / 420);
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius * 0.84, 0, Math.PI * 2);
  ctx.setLineDash([14, 8]);
  ctx.lineWidth = 3.0;
  ctx.strokeStyle = `rgba(158, 183, 198, ${(progress * 0.85).toFixed(3)})`;
  ctx.stroke();
  ctx.restore();

  // 6. Inner Counter-Rotating Cursed Soul Glyph Band (Counter-Clockwise)
  ctx.save();
  ctx.rotate(-now / 320);
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius * 0.62, 0, Math.PI * 2);
  ctx.setLineDash([8, 12]);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = `rgba(217, 70, 239, ${(progress * 0.90).toFixed(3)})`;
  ctx.stroke();

  // 6-petal transfiguration glyph arcs
  const glyphPetals = 6;
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = `rgba(168, 85, 247, ${(progress * 0.70).toFixed(3)})`;
  for (let p = 0; p < glyphPetals; p++) {
    const pTheta = (p / glyphPetals) * Math.PI * 2;
    const px = Math.cos(pTheta) * (ringRadius * 0.62);
    const py = Math.sin(pTheta) * (ringRadius * 0.62);
    ctx.beginPath();
    ctx.arc(px, py, ringRadius * 0.22, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

/**
 * Main Skin Drawing Entry Point for Mahito.
 * Adheres strictly to docs/fighter_hand_positioning_guide.md and Rule #2.
 */
export function drawMahitoSkin(ctx, fighter) {
  const isChannelingDomain = Boolean(fighter && (fighter.domainChargeTimer > 0 || fighter.isChannelingDomainExpansion));

  // 0. Isometric Ground Summoning Ring during Domain Expansion Channeling
  if (isChannelingDomain && (fighter.timeStopTimer || 0) <= 0) {
    const maxCharge = fighter.domainChargeMax || CONFIG.mahito?.domainExpansion?.chargeMax || 120;
    const progress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.domainChargeTimer / maxCharge)));
    drawMahitoDomainSummoningCircle(ctx, fighter, progress);
  }

  // 1. Render Phantom Soul Slip afterimages in world space
  drawMahitoDashAfterimages(ctx, fighter);

  if (!isChannelingDomain) {
    // 2. Render Subterranean Flesh Surge tendrils in world coordinates
    drawMahitoSubterraneanFleshSurge(ctx, fighter);

    // 3. Render Mutated Mace Cannon (Stretch Arm Spiked Ball Shrapnel) in world coordinates
    drawMahitoMaceCannon(ctx, fighter);

    // 4. Render Dual Scythe Pincer Guillotine (Twin Stretched Blade Ambush - Back Arm) in world coordinates
    drawMahitoTwinScissor(ctx, fighter, 'back');
  }

  const isEvading = !!fighter.isEvading;
  const isEvasionMinion = !!fighter.isEvasionMinion;
  const isPreSplitting = !!fighter.isPreSplitting;
  const isChosenForReconsolidation = !!fighter.isChosenForReconsolidation;
  const r = (isEvading || isEvasionMinion || isPreSplitting) ? 25 : (fighter.r || 25);
  const isTransformed = Boolean(fighter.isTransformed || fighter.isDistortedKilling);

  // ── Shivering / Tremor Displacement for Pre-Split & Reconsolidation Boiling ──
  let shiverX = 0;
  let shiverY = 0;
  if (isPreSplitting) {
    const tremorAmt = 3.5 + (1.0 - Math.max(0, (fighter.preSplitTimer || 0) / 35)) * 5.5; // 3.5px to 9px shivering shake
    shiverX = (Math.random() - 0.5) * tremorAmt;
    shiverY = (Math.random() - 0.5) * tremorAmt;
  } else if (isChosenForReconsolidation || fighter.isDyingEvasion) {
    const expandP = fighter.evasionExpandProgress || 0;
    const tremorAmt = 2.5 + expandP * 7.5; // 2.5px to 10px shivering shake on expanding/boiling clones
    shiverX = (Math.random() - 0.5) * tremorAmt;
    shiverY = (Math.random() - 0.5) * tremorAmt;
  }

  ctx.save();
  if (fighter.opacity !== undefined) {
    ctx.globalAlpha = Math.max(0, Math.min(1.0, fighter.opacity));
  }
  ctx.translate(fighter.x + shiverX, fighter.y - (fighter.z || 0) + shiverY);

  const baseEvasionScale = (typeof CONFIG !== 'undefined' && CONFIG.mahito?.evasion?.scale) !== undefined 
    ? CONFIG.mahito.evasion.scale 
    : 0.32;
  let evasionScale = baseEvasionScale;

  if (isPreSplitting) {
    const shrinkProgress = 1.0 - Math.max(0, (fighter.preSplitTimer || 0) / 35);
    const easeP = Math.sin(shrinkProgress * (Math.PI / 2));
    evasionScale = 1.0 - (1.0 - baseEvasionScale) * easeP;
    ctx.scale(evasionScale, evasionScale);
  } else if (isEvading || isEvasionMinion) {
    if (isChosenForReconsolidation) {
      const expandProgress = fighter.evasionExpandProgress || 0;
      const easeP = Math.sin(expandProgress * (Math.PI / 2));
      evasionScale = baseEvasionScale + (1.0 - baseEvasionScale) * easeP;
    } else if (fighter.isDyingEvasion) {
      const expandProgress = fighter.evasionExpandProgress || 0;
      const easeP = Math.sin(expandProgress * (Math.PI / 2));
      evasionScale = baseEvasionScale + (0.95 - baseEvasionScale) * easeP; // Body expands/swells as it shivers!
    } else {
      evasionScale = baseEvasionScale;
    }
    ctx.scale(evasionScale, evasionScale);
  }

  // 1. Draw JJK Cursed Energy Aura around Mahito
  drawMahitoCursedEnergyAura(ctx, fighter);

  // 2. Aim & Orientation Transform (Core Stance Coordinate Frame)
  let angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  const isSpinning = (isEvading || isEvasionMinion) && !fighter.isDyingEvasion && !fighter.isChosenForReconsolidation && !isPreSplitting;

  if (isChannelingDomain) {
    angle = 0; // Force Mahito to face directly towards the camera/viewer during domain channeling!
  } else if (isEvading || isEvasionMinion || isPreSplitting) {
    if (fighter.isDyingEvasion || fighter.isChosenForReconsolidation || isPreSplitting) {
      // Lock facing angle during pre-split charge and pre-explosion swell so it stays still while frozen!
      if (fighter._evasionLockAngle === undefined) {
        fighter._evasionLockAngle = (Math.abs(angle) > Math.PI / 2) ? Math.PI : 0;
      }
      angle = fighter._evasionLockAngle;
    } else {
      delete fighter._evasionLockAngle;
      // Spin continuously while moving across the arena!
      fighter._spinAngle = (fighter._spinAngle || 0) + 0.22;
      angle = fighter._spinAngle;
    }
  } else {
    delete fighter._evasionLockAngle;
    delete fighter._spinAngle;
  }
  ctx.rotate(angle);

  const facingLeft = !isChannelingDomain && !isSpinning && Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 3. Smooth Punch Animation Dynamics (Ease curve for lunges/recoils)
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const isPunching = !isPodiumPreview && !isChannelingDomain && !isEvading && !isEvasionMinion && !isPreSplitting && fighter.punchAnimTimer > 0;
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

  if (isChannelingDomain) {
    // Domain Expansion Channeling Hand Animation (Frame 1 -> Frame 2 matching user diagram):
    // Frame 1: Hands start on left & right sides (-r * 0.90, +r * 0.28) and (+r * 0.90, +r * 0.28)
    // Frame 2: Hands smoothly glide inward to meet & overlap at chest center (-r * 0.22, +r * 0.28) and (+r * 0.22, +r * 0.28)
    const maxCharge = fighter.domainChargeMax || CONFIG.mahito?.domainExpansion?.chargeMax || 120;
    const rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.domainChargeTimer / maxCharge)));
    
    // Smooth transition from Frame 1 to Frame 2 over the first 40% of channeling:
    const animT = Math.min(1.0, rawProgress / 0.40);
    const easeT = Math.sin(animT * (Math.PI / 2)); // Smooth cubic ease-out

    const startSpreadX = r * 0.90;
    const endSpreadX = r * 0.22;
    const currentSpreadX = startSpreadX + (endSpreadX - startSpreadX) * easeT;
    const handY = r * 0.28;

    backHandX = -currentSpreadX;
    backHandY = handY;

    frontHandX = currentSpreadX;
    frontHandY = handY;
  } else if (isPunching) {
    if (fighter.isRightPunch) {
      // Right punch (Front Hand lunges forward, Back Hand tucked in guard)
      frontHandX = r * 0.95 + lungeExtension * 1.40;
      frontHandY = Math.sin(rawProgress * Math.PI) * (r * 0.20);
      backHandX  = -r * 0.35 + oppositeRecoil;
      backHandY  = r * 0.15;
    } else {
      // Left punch (Back Hand lunges forward, Front Hand tucked in guard)
      backHandX  = r * 0.95 + lungeExtension * 1.40;
      backHandY  = -Math.sin(rawProgress * Math.PI) * (r * 0.20);
      frontHandX = r * 0.35 + oppositeRecoil;
      frontHandY = -r * 0.15;
    }
  } else {
    // Idle brawler guard stance: front hand at the right edge of body circle, back hand tucked
    frontHandX = r * 0.95;
    frontHandY = 0;
    backHandX  = 0;
    backHandY  = 0;
  }

  const handRadius = getHandSize(7.5);
  const morphType = fighter.morphType || 'blade';
  const drawTransformedHands = isTransformed && !isChannelingDomain;

  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands || isEvading || isEvasionMinion || isPreSplitting;

  // 5. Render Back Hand Layer (Behind Body Circle)
  // During Domain Expansion channeling, both hands render on the front layer (on top of body)
  if (!fighter._isWinnerReveal && !shouldHideHands && !isChannelingDomain) {
    if (isPunching && !fighter.isRightPunch) {
      drawMahitoArmMorph(ctx, fighter, isTransformed, false, morphType, rawProgress, backHandX, backHandY);
    } else if (fighter.clawRevertTimer > 0 && !fighter.isRightPunch) {
      const maxRevert = 18;
      const revertProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.clawRevertTimer / maxRevert)));
      const shiverAmp = (1.0 - revertProgress) * 5.5;
      const shiverX = (Math.random() - 0.5) * shiverAmp;
      const shiverY = (Math.random() - 0.5) * shiverAmp;

      ctx.save();
      ctx.translate(backHandX + shiverX, backHandY + shiverY);

      // Expanding boiling cursed energy aura around hand socket
      const boilRadius = (handRadius || 7) * (1.0 + Math.sin(revertProgress * Math.PI) * 1.5);
      const boilAlpha = (1.0 - revertProgress) * 0.80;
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, boilRadius);
      gradient.addColorStop(0, `rgba(245, 208, 254, ${boilAlpha})`);
      gradient.addColorStop(0.5, `rgba(217, 70, 239, ${(boilAlpha * 0.75).toFixed(2)})`);
      gradient.addColorStop(1, 'rgba(147, 51, 234, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, boilRadius, 0, Math.PI * 2);
      ctx.fill();

      drawHandFist(ctx, 0, 0, handRadius, drawTransformedHands, fighter);
      ctx.restore();
    } else if (!fighter.hideBackHand && backHandX !== 0) {
      drawHandFist(ctx, backHandX, backHandY, handRadius, drawTransformedHands, fighter);
    }
  }

  // 6. Render Body Circle
  if (isTransformed) {
    drawTransformedCarapace(ctx, r, isChannelingDomain);
  } else {
    drawBaseMahito(ctx, r, fighter, facingLeft);
  }

  // 7. Render Front Hand Layer (On Top of Body Circle) - Rule #2 & #20
  if (!fighter._isWinnerReveal && (!fighter.twinScissorAnimTimer || fighter.twinScissorAnimTimer <= 0) && (!fighter.fleshSurgeAnimTimer || fighter.fleshSurgeAnimTimer <= 0) && !shouldHideHands) {
    if (isChannelingDomain) {
      // Draw both hands on top of body (Left hand first, then Right hand overlapping on top)
      // Left Hand (knuckles pointing inwards to the right):
      drawHandFist(ctx, backHandX, backHandY, handRadius, drawTransformedHands, fighter);
      
      // Right Hand (mirrored horizontally so knuckles point inwards to the left, overlapping Left Hand):
      ctx.save();
      ctx.translate(frontHandX, frontHandY);
      ctx.scale(-1, 1);
      drawHandFist(ctx, 0, 0, handRadius, drawTransformedHands, fighter);
      ctx.restore();

      // Cursed Soul Singularity Core between palms at chest center
      const coreProgress = Math.min(1.0, Math.max(0.0, 1.0 - ((fighter.domainChargeTimer || 0) / (fighter.domainChargeMax || 120))));
      const coreY = backHandY;
      const coreRadius = (3.5 + Math.sin(Date.now() * 0.015) * 1.5) * (0.6 + coreProgress * 0.8);

      ctx.save();
      // Outer violet flare
      const coreGrad = ctx.createRadialGradient(0, coreY, 0, 0, coreY, coreRadius * 2.8);
      coreGrad.addColorStop(0.0, `rgba(255, 255, 255, ${(coreProgress * 0.95).toFixed(3)})`);
      coreGrad.addColorStop(0.3, `rgba(245, 208, 254, ${(coreProgress * 0.85).toFixed(3)})`);
      coreGrad.addColorStop(0.65, `rgba(217, 70, 239, ${(coreProgress * 0.70).toFixed(3)})`);
      coreGrad.addColorStop(1.0, 'rgba(147, 51, 234, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, coreY, coreRadius * 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Inner intense core
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, coreY, Math.max(1, coreRadius * 0.6), 0, Math.PI * 2);
      ctx.fill();

      // Smooth crackling cursed lightning arcs around core (Zero 1-frame flickering)
      if (coreProgress > 0.30) {
        const arcT = Date.now() * 0.006;
        const arcCount = 3;
        const arcRadius = coreRadius * 1.4;
        ctx.lineWidth = 1.2;
        for (let a = 0; a < arcCount; a++) {
          const arcAngle = arcT + (a * Math.PI * 2 / arcCount);
          const startX = Math.cos(arcAngle) * (arcRadius * 0.6);
          const startY = coreY + Math.sin(arcAngle) * (arcRadius * 0.4);
          const endX = Math.cos(arcAngle + 1.2) * arcRadius;
          const endY = coreY + Math.sin(arcAngle + 1.2) * (arcRadius * 0.7);
          const midX = (startX + endX) / 2 + Math.sin(arcT * 2 + a) * 2.5;
          const midY = (startY + endY) / 2 + Math.cos(arcT * 2 + a) * 2.5;

          ctx.strokeStyle = (a % 2 === 0) ? '#F5D0FE' : '#D946EF';
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(midX, midY, endX, endY);
          ctx.stroke();
        }
      }
      ctx.restore();
    } else if (!fighter.hideFrontHand) {
      if (isPunching && fighter.isRightPunch) {
        drawMahitoArmMorph(ctx, fighter, isTransformed, true, morphType, rawProgress, frontHandX, frontHandY);
      } else if (fighter.clawRevertTimer > 0 && (fighter.isRightPunch || fighter.isRightPunch === undefined)) {
        const maxRevert = 18;
        const revertProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.clawRevertTimer / maxRevert)));
        const shiverAmp = (1.0 - revertProgress) * 5.5;
        const shiverX = (Math.random() - 0.5) * shiverAmp;
        const shiverY = (Math.random() - 0.5) * shiverAmp;

        ctx.save();
        ctx.translate(frontHandX + shiverX, frontHandY + shiverY);

        // Expanding boiling cursed energy aura around hand socket
        const boilRadius = (handRadius || 7) * (1.0 + Math.sin(revertProgress * Math.PI) * 1.5);
        const boilAlpha = (1.0 - revertProgress) * 0.80;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, boilRadius);
        gradient.addColorStop(0, `rgba(245, 208, 254, ${boilAlpha})`);
        gradient.addColorStop(0.5, `rgba(217, 70, 239, ${(boilAlpha * 0.75).toFixed(2)})`);
        gradient.addColorStop(1, 'rgba(147, 51, 234, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, boilRadius, 0, Math.PI * 2);
        ctx.fill();

        drawHandFist(ctx, 0, 0, handRadius, drawTransformedHands, fighter);
        ctx.restore();
      } else {
        drawHandFist(ctx, frontHandX, frontHandY, handRadius, drawTransformedHands, fighter);
      }
    }
  }

  // Status overlays & Stun visuals are handled uniformly by EntityRenderer / StatusEffectsManager (Rule #9)

  // Draw status overlays (slow, electric stun, black flash, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  // 8.5. Grotesque Flesh Deformation & Swelling Cursed Aura Overlay (Renders ONLY on dying small minion clones, NEVER on Mahito's main fighter body!)
  const isDyingMinionClone = Boolean(fighter.isEvasionMinion && (fighter.isDying || fighter.isDyingEvasion));
  if (isDyingMinionClone) {
    const maxDur = fighter.maxDeathTimer || 18;
    const currentTimer = fighter.deathTimer ?? 18;
    const progress = Math.min(1.0, Math.max(0.0, 1.0 - (currentTimer / maxDur)));

    ctx.save();
    
    // Shivering tremor
    const shiverAmp = (1.0 + progress * 4.5);
    const shiverX = (Math.random() - 0.5) * shiverAmp;
    const shiverY = (Math.random() - 0.5) * shiverAmp;
    ctx.translate(shiverX, shiverY);

    // 1. Sleek Cursed Energy Outer Glow Ring
    const auraRadius = r * (1.0 + progress * 0.40);
    ctx.strokeStyle = `rgba(217, 70, 239, ${(0.60 + progress * 0.35).toFixed(2)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, auraRadius + 4, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Authentic Grotesque Bubbly Deformed Expanding Flesh Lobes (Mahito's Signature Minion Death Expansion)
    // Starts displaying IMMEDIATELY the moment clones stop moving (0.35 initial size up to 1.0 max)
    const immediateProgress = 0.35 + progress * 0.65;
    const deformTimer = Math.max(1, Math.floor((1.0 - immediateProgress) * 45));
    if (typeof drawMahitoFleshBubblyDeformLocal === 'function') {
      drawMahitoFleshBubblyDeformLocal(ctx, r, deformTimer, '#D946EF', fighter);
    }

    // 3. Swirling Cursed Soul Tendrils
    ctx.strokeStyle = `rgba(245, 208, 254, ${(0.70 + progress * 0.25).toFixed(2)})`;
    ctx.lineWidth = 2.0;
    for (let i = 0; i < 3; i++) {
      const rot = progress * Math.PI * 4 + (i * Math.PI * 0.66);
      ctx.beginPath();
      ctx.arc(0, 0, (r + 6) * (1.0 - progress * 0.2), rot, rot + 1.1);
      ctx.stroke();
    }

    ctx.restore();
  } else if (fighter && !fighter.isEvasionMinion && fighter._mahitoFleshDeformSeeds) {
    fighter._mahitoFleshDeformSeeds = null;
  }

  // Evasion Clones Floating HP Healthbar Overlay
  if ((isEvading || isEvasionMinion) && !fighter.isDying && !fighter.isDyingEvasion) {
    ctx.save();
    // Rotate/mirror back to draw healthbar upright relative to the screen
    if (facingLeft) ctx.scale(1, -1);
    ctx.rotate(-angle);
    drawMinionHealthBar(ctx, 0, -(r || 25) - 14, Math.max(32, (r || 25) * 1.4), 6, fighter.hp, fighter.maxHp || 100, '#D946EF');
    ctx.restore();
  }

  ctx.restore();

  // 9. Render Foreground Stretch Arms, Sockets & Scythes in world space (ON TOP of body circle)
  if (!fighter._isWinnerReveal && !isChannelingDomain) {
    if (fighter.fleshSurgeAnimTimer > 0) {
      drawMahitoFleshSurgeForegroundArm(ctx, fighter, isTransformed);
    }
    if (fighter.twinScissorAnimTimer > 0) {
      drawMahitoTwinScissor(ctx, fighter, 'front');
    }
  }
}

/**
 * Draws Mahito's entire body circle model in authentic Pixel Art Style.
 * Uses discrete stepped pixel grid rasterization matching Saitama, Ichigo, Yuji, and Nanami.
 * Minimalist circle brawler aesthetic, upright front POV, faceless with surgical stitches (Rule #19 compliant).
 */
export function drawMahitoPixelBody(ctx, r, isTransformed = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const steps = Math.ceil((r + P) / P);

  if (isTransformed) {
    // ══════════════════════════════════════════════════════════════
    // INSTANT SPIRIT OF BODY OF KILLING (ISBOK) TRANSFORMED PIXEL ART
    // ══════════════════════════════════════════════════════════════
    for (let gy = -steps; gy <= steps; gy++) {
      for (let gx = -steps; gx <= steps; gx++) {
        const rx = gx * P;
        const ry = gy * P;
        const dist = Math.hypot(rx, ry);
        if (dist > r) continue;

        const px = rx - P / 2;
        const py = ry - P / 2;

        // Pixelated Black Stroke Border
        const isBorder = (
          Math.hypot((gx + 1) * P, gy * P) > r ||
          Math.hypot((gx - 1) * P, gy * P) > r ||
          Math.hypot(gx * P, (gy + 1) * P) > r ||
          Math.hypot(gx * P, (gy - 1) * P) > r
        );

        if (isBorder) {
          ctx.fillStyle = '#0E0F14';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Glowing Magenta Horizontal Eye Slit Visors (ry ~ -r * 0.15)
        const isEyeLeft = (Math.abs(ry - (-r * 0.15)) <= P * 1.5 && rx >= -r * 0.52 && rx <= -r * 0.08);
        const isEyeRight = (Math.abs(ry - (-r * 0.15)) <= P * 1.5 && rx >= r * 0.08 && rx <= r * 0.52);
        const isEyeCoreLeft = (Math.abs(ry - (-r * 0.15)) <= P * 0.6 && rx >= -r * 0.40 && rx <= -r * 0.18);
        const isEyeCoreRight = (Math.abs(ry - (-r * 0.15)) <= P * 0.6 && rx >= r * 0.18 && rx <= r * 0.40);

        // Exoskeleton Torso Plating (ry >= r * 0.22)
        const isRibPlating = (ry >= r * 0.22 && (Math.abs(rx) <= r * 0.85));
        const isPlatingSeam1 = (Math.abs(ry - r * 0.48) <= P * 0.8 && Math.abs(rx) <= r * 0.65);
        const isPlatingSeam2 = (Math.abs(ry - r * 0.72) <= P * 0.8 && Math.abs(rx) <= r * 0.48);

        if (isEyeCoreLeft || isEyeCoreRight) {
          ctx.fillStyle = '#FFFFFF';
        } else if (isEyeLeft || isEyeRight) {
          ctx.fillStyle = '#E879F9';
        } else if (isPlatingSeam1 || isPlatingSeam2) {
          ctx.fillStyle = '#D946EF';
        } else if (isRibPlating) {
          ctx.fillStyle = (ry > r * 0.60) ? '#1E122C' : '#2A1B3D';
        } else {
          let col = '#0E1322';
          if (ry < -r * 0.65) col = '#182035';
          else if (Math.abs(rx) > r * 0.72) col = '#090D18';
          ctx.fillStyle = col;
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  } else {
    // ══════════════════════════════════════════════════════════════
    // BASE FORM MAHITO (Pale Stitched Skin & Dark Patchwork Poncho)
    // ══════════════════════════════════════════════════════════════
    // 100% 4-Way Symmetrical Circular Pixel Body Fill & Outer Border
    for (let gy = -steps; gy <= steps; gy++) {
      for (let gx = -steps; gx <= steps; gx++) {
        const rx = gx * P;
        const ry = gy * P;
        const dist = Math.hypot(rx, ry);
        if (dist > r) continue;

        const px = rx - P / 2;
        const py = ry - P / 2;

        // Pixelated Black Stroke Border
        const isBorder = (
          Math.hypot((gx + 1) * P, gy * P) > r ||
          Math.hypot((gx - 1) * P, gy * P) > r ||
          Math.hypot(gx * P, (gy + 1) * P) > r ||
          Math.hypot(gx * P, (gy - 1) * P) > r
        );

        if (isBorder) {
          ctx.fillStyle = '#0E0F14';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // ──────────────────────────────────────────
        // 1. SICKLY PALE SKIN & SURGICAL STITCHES (ry < r * 0.26)
        // ──────────────────────────────────────────
        if (ry < r * 0.26) {
          let col = '#EEF3F7';
          if (ry < -r * 0.65) {
            col = '#F8FAFC'; // Crown dome volumetric glint
          } else if (ry < -r * 0.40) {
            col = '#D4DEE5'; // Forehead contour shading
          } else if (Math.abs(rx) > r * 0.70 || ry > r * 0.18) {
            col = '#D6E2EB'; // Side temple / cheek depth shadow
          }

          // A. Center Horizontal Face Stitch Line
          const isFaceStitchHoriz = (Math.abs(ry - (-r * 0.02)) <= P * 0.6 && Math.abs(rx) <= r * 0.44);
          const isFaceStitchTick = (Math.abs(ry - (-r * 0.02)) <= P * 1.8 && Math.abs(rx) <= r * 0.44 && Math.abs(Math.round(rx / (P * 4)) * (P * 4) - rx) <= P * 0.5);

          // B. Left Cheek Diagonal Stitch Line
          const diagProg = (ry - (r * 0.02)) / (r * 0.20);
          const diagX = -r * 0.35 + (r * 0.23) * diagProg;
          const isDiagStitch = (ry >= r * 0.02 && ry <= r * 0.22 && Math.abs(rx - diagX) <= P * 0.6);
          const isDiagTick = (ry >= r * 0.02 && ry <= r * 0.22 && Math.abs(Math.round(ry / (P * 3)) * (P * 3) - ry) <= P * 0.5 && Math.abs(rx - diagX) <= P * 1.6);

          // C. Forehead Vertical Stitch Line
          const isForeheadStitch = (Math.abs(rx - (-r * 0.34)) <= P * 0.6 && ry >= -r * 0.46 && ry <= -r * 0.26);
          const isForeheadTick = (Math.abs(rx - (-r * 0.34)) <= P * 1.8 && Math.abs(Math.round(ry / (P * 3)) * (P * 3) - ry) <= P * 0.5 && ry >= -r * 0.46 && ry <= -r * 0.26);

          if (isFaceStitchHoriz || isFaceStitchTick || isDiagStitch || isDiagTick || isForeheadStitch || isForeheadTick) {
            ctx.fillStyle = '#222530';
          } else {
            ctx.fillStyle = col;
          }
          ctx.fillRect(px, py, P, P);
        }
        // ──────────────────────────────────────────
        // 2. DARK PATCHWORK PONCHO TUNIC (ry >= r * 0.26)
        // ──────────────────────────────────────────
        else {
          const neckHalfW = (1 - (ry - r * 0.26) / (r * 0.14)) * (r * 0.22);
          const isNeckSkin = (ry <= r * 0.40 && Math.abs(rx) <= Math.max(0, neckHalfW));

          const isNeckStitch = (isNeckSkin && Math.abs(ry - r * 0.32) <= P * 0.6 && Math.abs(rx) <= r * 0.16);
          const isNeckTick = (isNeckSkin && Math.abs(ry - r * 0.32) <= P * 1.8 && Math.abs(rx) <= r * 0.16 && Math.abs(Math.round(rx / (P * 3)) * (P * 3) - rx) <= P * 0.5);

          const isHorizSeam = (Math.abs(ry - r * 0.52) <= P * 0.7 || Math.abs(ry - r * 0.72) <= P * 0.7 || Math.abs(ry - r * 0.88) <= P * 0.7);
          const isVertSeam = (Math.abs(Math.abs(rx) - r * 0.35) <= P * 0.7 || Math.abs(rx) <= P * 0.7 || Math.abs(Math.abs(rx) - r * 0.65) <= P * 0.7);
          const isSeamStitchTick = ((isHorizSeam && Math.abs(rx % (r * 0.12)) <= P * 0.7) || (isVertSeam && Math.abs(ry % (r * 0.12)) <= P * 0.7));

          if (isNeckStitch || isNeckTick) {
            ctx.fillStyle = '#222530';
          } else if (isNeckSkin) {
            ctx.fillStyle = (ry > r * 0.32) ? '#CCD7E0' : '#EEF3F7';
          } else if (isSeamStitchTick) {
            ctx.fillStyle = '#4A5068';
          } else if (isHorizSeam || isVertSeam) {
            ctx.fillStyle = '#282B38';
          } else {
            let col = '#181920';
            if (Math.abs(rx) > r * 0.70 || ry > r * 0.85) {
              col = '#0F1014';
            } else if (ry < r * 0.48 && Math.abs(rx) < r * 0.45) {
              col = '#22242E';
            }
            ctx.fillStyle = col;
          }
          ctx.fillRect(px, py, P, P);
        }
      }
    }
  }

  ctx.restore();
}
