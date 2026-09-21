// ─────────────────────────────────────────────
// ZEUS FIGHTER SKIN & BODY MODEL (Authentic Pixel Art Edition)
// King of Olympus — God of Thunder & Lightning (Greek Mythology)
//
// Adheres strictly to:
// - Rule 11 (Prohibition of shadowBlur CPU Filters)
// - Rule 18 (HUD Skill Bar Theme Consistency)
// - Rule 19 (Upright Front POV Camera Orientation, Zero Eyes/Mouth/Nose)
// - Rule 19.1 (Proportional Vertical Bands, Faceless God Skin, Golden Diadem & Royal Toga)
// - Rule 20 (Fighter Hand Visibility & Skin Only Guard)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';

const P = 2.0; // 2.0px authentic retro pixel grid

let _zeusHairImage = null;
let _zeusHairImageLoading = false;
let _zeusCrownImage = null;
let _zeusCrownImageLoading = false;

export function _getZeusHairImage() {
  if (_zeusHairImage && _zeusHairImage.complete && _zeusHairImage.naturalWidth > 0) {
    return _zeusHairImage;
  }
  if (!_zeusHairImageLoading && typeof Image !== 'undefined') {
    _zeusHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _zeusHairImage = img;
      _zeusHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Zeus hair image at Assets/model/Zeus-hair.png', e);
      _zeusHairImageLoading = false;
    };
    img.src = 'Assets/model/Zeus-hair.png?v=1';
    _zeusHairImage = img;
  }
  return _zeusHairImage;
}

export function _getZeusCrownImage() {
  if (_zeusCrownImage && _zeusCrownImage.complete && _zeusCrownImage.naturalWidth > 0) {
    return _zeusCrownImage;
  }
  if (!_zeusCrownImageLoading && typeof Image !== 'undefined') {
    _zeusCrownImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _zeusCrownImage = img;
      _zeusCrownImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Zeus crown image at Assets/model/Zeus-crown.png', e);
      _zeusCrownImageLoading = false;
    };
    img.src = 'Assets/model/Zeus-crown.png?v=1';
    _zeusCrownImage = img;
  }
  return _zeusCrownImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getZeusHairImage();
  _getZeusCrownImage();
}

/**
 * Draws Zeus's authentic flowing silver anime hair from Assets/model/Zeus-hair.png.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [isStormActive=false]
 * @param {boolean} [facingLeft=false]
 */
export function _drawZeusHair(ctx, r, isStormActive = false, facingLeft = false) {
  const hairImg = _getZeusHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;

    const custom = (typeof state !== 'undefined' && (state.skinCustomizations?.zeus || state.skinCustomizations?.zeus_hair)) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;

    // Zeus-hair.png (1254x1254). True visible hair bounding box:
    // X: [41, 1235] (width 1195, horizontal center at 638)
    // Y: [31, 1253] (height 1223, top crown at 31)
    const targetHairWidth = r * 3.10 * wMult;
    const targetHairHeight = r * 2.85 * hMult;
    const scaleX = targetHairWidth / 1195;
    const scaleY = targetHairHeight / 1223;
    const drawW = 1254 * scaleX;
    const drawH = 1254 * scaleY;
    const drawX = -638 * scaleX + offX;
    const drawY = -r * 1.30 - 31 * scaleY + offY;

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
 * Draws Zeus's golden Olympian crown / headband from Assets/model/Zeus-crown.png.
 * Positioned cleanly as a headband wrapping across the brow and hair.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [isStormActive=false]
 * @param {boolean} [facingLeft=false]
 */
export function _drawZeusCrown(ctx, r, isStormActive = false, facingLeft = false) {
  const crownImg = _getZeusCrownImage();
  if (crownImg && crownImg.complete && crownImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;

    const custom = (typeof state !== 'undefined' && (state.skinCustomizations?.zeus_crown || state.skinCustomizations?.zeus?.crown)) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;

    // Zeus-crown.png (1627x967). True visible crown bounding box:
    // X: [0, 1587] (width 1588, horizontal center at 793.5)
    // Y: [62, 966] (height 905, top crown peak at 62)
    // Scales to sit naturally across the brow at y ~ -0.08r with central peak reaching -1.05r
    const targetCrownWidth = r * 1.70 * wMult;
    const targetCrownHeight = (r * 1.70 * (905 / 1588)) * hMult;
    const scaleX = targetCrownWidth / 1588;
    const scaleY = targetCrownHeight / 905;
    const drawW = 1627 * scaleX;
    const drawH = 967 * scaleY;
    const drawX = -793.5 * scaleX + offX;
    const drawY = -r * 1.05 - 62 * scaleY + offY;

    if (rot !== 0) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      ctx.rotate(rot);
      ctx.drawImage(crownImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(crownImg, drawX, drawY, drawW, drawH);
    }

    ctx.restore();
  }
}

/**
 * Draws a smooth Olympian hand with golden wrist vambrace for Zeus.
 */
export function drawZeusHand(ctx, cx, cy, radius = 5.6, skinColor = '#FCD34D', isStorm = false, angle = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  if (angle !== 0) {
    ctx.rotate(angle);
  }

  // 1. Golden Olympian Armored Vambrace / Gauntlet
  const cuffW = radius * 1.5;
  const cuffH = radius * 0.9;
  const bx = -cuffW * 0.5;
  const by = -radius * 0.35 - cuffH;

  const vambraceGrad = ctx.createLinearGradient(bx, by, bx + cuffW, by);
  if (isStorm) {
    vambraceGrad.addColorStop(0, '#0284C7');
    vambraceGrad.addColorStop(0.5, '#E0F2FE');
    vambraceGrad.addColorStop(1, '#0284C7');
  } else {
    vambraceGrad.addColorStop(0, '#CA8A04');
    vambraceGrad.addColorStop(0.3, '#FEF08A');
    vambraceGrad.addColorStop(0.6, '#FACC15');
    vambraceGrad.addColorStop(1, '#A16207');
  }

  ctx.beginPath();
  ctx.rect(bx, by, cuffW, cuffH);
  ctx.fillStyle = vambraceGrad;
  ctx.fill();
  ctx.strokeStyle = isStorm ? '#0369A1' : '#78350F';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // 2. Smooth Hand / Fist
  const handGrad = ctx.createRadialGradient(-radius * 0.2, -radius * 0.2, radius * 0.1, 0, 0, radius);
  if (isStorm) {
    handGrad.addColorStop(0, '#FFFFFF');
    handGrad.addColorStop(0.5, '#BAE6FD');
    handGrad.addColorStop(1, '#0284C7');
  } else {
    handGrad.addColorStop(0, '#FFF0E4');
    handGrad.addColorStop(0.4, '#FDE68A');
    handGrad.addColorStop(0.8, '#FCD34D');
    handGrad.addColorStop(1, '#B87E60');
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = handGrad;
  ctx.fill();
  ctx.strokeStyle = isStorm ? '#0284C7' : '#1E293B';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 3. Knuckles & Finger Grip Definition wrapping over the weapon shaft
  ctx.strokeStyle = isStorm ? 'rgba(2, 132, 199, 0.65)' : 'rgba(120, 53, 15, 0.55)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.65, -0.4, 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.35, -0.3, 0.7);
  ctx.stroke();

  ctx.restore();
}

export function _drawZeusVambrace(ctx, cx, cy, radius = 6.4, isStorm = false) {
  drawZeusHand(ctx, cx, cy, radius, '#FCD34D', isStorm);
}

/**
 * Renders the smooth, elegant anime body of Zeus.
 * Features Authentic Greek God Faceless Model matching repository standards (Rule 19):
 * - Smooth sun-kissed Olympian god faceless skin complexion
 * - Golden segmented gorget / collar armor at neck
 * - Diagonal draped white toga on left chest & bare muscular tanned god chest on right
 * - Golden armored segmented belt with central buckle plate
 * - Flowing white pleated himation / skirt
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character radius
 * @param {boolean} [isStormActive=false] - Whether Divine Wrath / Thunder Storm is active
 */
export function drawZeusBody(ctx, r = 25, isStormActive = false) {
  ctx.save();

  // 1. BASE BODY CIRCLE CLIP
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.save();
  ctx.clip();

  // 2. SMOOTH GOD SKIN BASE (Face, Crown, Neck, Right Chest)
  const skinGrad = ctx.createLinearGradient(0, -r, 0, r * 0.7);
  if (isStormActive) {
    skinGrad.addColorStop(0, '#FFFFFF');
    skinGrad.addColorStop(0.25, '#E0F2FE');
    skinGrad.addColorStop(0.60, '#38BDF8');
    skinGrad.addColorStop(1.0, '#0284C7');
  } else {
    skinGrad.addColorStop(0, '#FFF0E4');
    skinGrad.addColorStop(0.25, '#F3BF9F');
    skinGrad.addColorStop(0.55, '#E8AC8B');
    skinGrad.addColorStop(0.85, '#D4A373');
    skinGrad.addColorStop(1.0, '#B87E60');
  }
  ctx.fillStyle = skinGrad;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // 3. DIAGONAL DRAPED WHITE TOGA (Viewer's Left side)
  ctx.beginPath();
  ctx.moveTo(-r, -r * 0.2);
  ctx.bezierCurveTo(-r * 0.6, r * 0.05, -r * 0.3, r * 0.35, 0, r * 0.65);
  ctx.lineTo(-r, r * 0.65);
  ctx.closePath();

  const togaGrad = ctx.createLinearGradient(-r, 0, 0, r * 0.65);
  if (isStormActive) {
    togaGrad.addColorStop(0, '#FFFFFF');
    togaGrad.addColorStop(0.5, '#BAE6FD');
    togaGrad.addColorStop(1, '#38BDF8');
  } else {
    togaGrad.addColorStop(0, '#FFFFFF');
    togaGrad.addColorStop(0.4, '#F8FAFC');
    togaGrad.addColorStop(0.8, '#F1F5F9');
    togaGrad.addColorStop(1.0, '#CBD5E1');
  }
  ctx.fillStyle = togaGrad;
  ctx.fill();

  // Smooth Toga Fold Creases
  ctx.strokeStyle = isStormActive ? 'rgba(2, 132, 199, 0.45)' : 'rgba(148, 163, 184, 0.55)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, -r * 0.05);
  ctx.bezierCurveTo(-r * 0.55, r * 0.2, -r * 0.35, r * 0.45, -r * 0.15, r * 0.65);
  ctx.moveTo(-r * 0.5, -r * 0.15);
  ctx.bezierCurveTo(-r * 0.35, r * 0.15, -r * 0.2, r * 0.4, -0.05, r * 0.65);
  ctx.stroke();

  // Golden Shoulder Fibula Brooch
  ctx.beginPath();
  ctx.arc(-r * 0.62, r * 0.12, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = isStormActive ? '#E0F2FE' : '#FACC15';
  ctx.fill();
  ctx.strokeStyle = isStormActive ? '#0284C7' : '#A16207';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // 4. BARE MUSCULAR GOD CHEST CONTOURS (Viewer's Right side)
  ctx.strokeStyle = isStormActive ? 'rgba(2, 132, 199, 0.4)' : 'rgba(180, 83, 9, 0.4)';
  ctx.lineWidth = 1.4;
  // Sternal Center Crease
  ctx.beginPath();
  ctx.moveTo(0, r * 0.28);
  ctx.lineTo(0, r * 0.65);
  ctx.stroke();
  // Pectoral Muscle Underline
  ctx.beginPath();
  ctx.arc(r * 0.36, r * 0.42, r * 0.26, 0.2, Math.PI * 0.8);
  ctx.stroke();
  // Oblique / Rib definition
  ctx.beginPath();
  ctx.moveTo(r * 0.45, r * 0.52);
  ctx.lineTo(r * 0.25, r * 0.65);
  ctx.stroke();

  // 5. GOLDEN SEGMENTED GORGET / NECK ARMOR (y ~ 0.22r to 0.34r)
  ctx.beginPath();
  ctx.ellipse(0, r * 0.26, r * 0.55, r * 0.08, 0, 0, Math.PI * 2);
  const gorgetGrad = ctx.createLinearGradient(-r * 0.55, 0, r * 0.55, 0);
  if (isStormActive) {
    gorgetGrad.addColorStop(0, '#0284C7');
    gorgetGrad.addColorStop(0.5, '#E0F2FE');
    gorgetGrad.addColorStop(1, '#0284C7');
  } else {
    gorgetGrad.addColorStop(0, '#CA8A04');
    gorgetGrad.addColorStop(0.2, '#FEF08A');
    gorgetGrad.addColorStop(0.5, '#FACC15');
    gorgetGrad.addColorStop(0.8, '#FEF08A');
    gorgetGrad.addColorStop(1, '#A16207');
  }
  ctx.fillStyle = gorgetGrad;
  ctx.fill();
  ctx.strokeStyle = isStormActive ? '#0369A1' : '#78350F';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // 6. GOLDEN ARMORED WAIST BELT (y ~ 0.65r to 0.78r)
  ctx.beginPath();
  ctx.rect(-r, r * 0.65, r * 2, r * 0.13);
  const beltGrad = ctx.createLinearGradient(-r, 0, r, 0);
  if (isStormActive) {
    beltGrad.addColorStop(0, '#0284C7');
    beltGrad.addColorStop(0.5, '#E0F2FE');
    beltGrad.addColorStop(1, '#0284C7');
  } else {
    beltGrad.addColorStop(0, '#CA8A04');
    beltGrad.addColorStop(0.3, '#FEF08A');
    beltGrad.addColorStop(0.5, '#FACC15');
    beltGrad.addColorStop(0.7, '#FEF08A');
    beltGrad.addColorStop(1, '#A16207');
  }
  ctx.fillStyle = beltGrad;
  ctx.fill();

  // Golden Buckle Diamond / Hexagonal Plate
  ctx.beginPath();
  ctx.moveTo(0, r * 0.63);
  ctx.lineTo(r * 0.16, r * 0.71);
  ctx.lineTo(0, r * 0.79);
  ctx.lineTo(-r * 0.16, r * 0.71);
  ctx.closePath();
  ctx.fillStyle = isStormActive ? '#FFFFFF' : '#FEF08A';
  ctx.fill();
  ctx.strokeStyle = isStormActive ? '#0284C7' : '#78350F';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // 7. WHITE PLEATED HIMATION / SKIRT (y >= 0.78r)
  ctx.beginPath();
  ctx.rect(-r, r * 0.78, r * 2, r * 0.35);
  const skirtGrad = ctx.createLinearGradient(0, r * 0.78, 0, r);
  if (isStormActive) {
    skirtGrad.addColorStop(0, '#BAE6FD');
    skirtGrad.addColorStop(1, '#38BDF8');
  } else {
    skirtGrad.addColorStop(0, '#FFFFFF');
    skirtGrad.addColorStop(1, '#E2E8F0');
  }
  ctx.fillStyle = skirtGrad;
  ctx.fill();

  // Smooth vertical pleats
  ctx.strokeStyle = isStormActive ? 'rgba(2, 132, 199, 0.45)' : 'rgba(148, 163, 184, 0.50)';
  ctx.lineWidth = 1.2;
  for (let px = -r * 0.65; px <= r * 0.65; px += r * 0.28) {
    ctx.beginPath();
    ctx.moveTo(px, r * 0.78);
    ctx.lineTo(px * 1.08, r);
    ctx.stroke();
  }

  // Restore clip
  ctx.restore();

  // 8. SLEEK OUTER CIRCULAR BORDER
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = isStormActive ? '#0284C7' : '#1E293B';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  ctx.restore();
}

export const drawZeusPixelBody = drawZeusBody;

/**
 * Draws Zeus's Celestial Thunderstorm & Electric God Aura (Rule 11 compliant - Zero shadowBlur)
 */
function _drawZeusElectricAura(ctx, r, fighter, now) {
  const isStorm = Boolean(fighter.isChargingStorm || fighter.stormActive);
  const pulse = Math.sin(now * 0.009) * 2.5;
  const auraR = r * (isStorm ? 1.60 : 1.25) + pulse;

  ctx.save();

  // 1. Outer Electric Corona Glow (Concentric Flat Circles)
  ctx.fillStyle = isStorm ? 'rgba(56, 189, 248, 0.28)' : 'rgba(0, 220, 255, 0.14)';
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Middle Radiant Electric Ring
  ctx.strokeStyle = isStorm ? 'rgba(224, 242, 254, 0.85)' : 'rgba(56, 189, 248, 0.50)';
  ctx.lineWidth = isStorm ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, auraR - 2.5, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Crackling Micro-Lightning Sparks along the perimeter
  const numSparks = isStorm ? 6 : 3;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < numSparks; i++) {
    const angle = (now * 0.004 * (i % 2 === 0 ? 1 : -1)) + (i * Math.PI * 2 / numSparks);
    const sparkDist = r + 4 + (Math.sin(now * 0.02 + i) * 6);
    const sx = Math.cos(angle) * sparkDist;
    const sy = Math.sin(angle) * sparkDist;
    const jx = (Math.sin(now * 0.05 + i * 3) - 0.5) * 8;
    const jy = (Math.cos(now * 0.05 + i * 3) - 0.5) * 8;

    ctx.beginPath();
    ctx.moveTo(sx - jx, sy - jy);
    ctx.lineTo(sx, sy);
    ctx.lineTo(sx + jx, sy + jy);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Main Skin Renderer for Zeus (King of Olympus - Authentic Faceless Pixel Art Edition)
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} fighter - Fighter instance
 */
export function drawZeusSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const isStorm = Boolean(fighter.isChargingStorm || fighter.stormActive);
  const now = Date.now();

  const isSuppressed = !isPodiumPreview && Boolean(
    fighter.isTargetOfAmbush ||
    (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
  );

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = (isPodiumPreview || isStorm) ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft && !fighter.isSpinning) {
    ctx.scale(1, -1);
  }

  // 2. Divine Electric God Aura (Rule 11 compliant)
  if (!isSuppressed) {
    _drawZeusElectricAura(ctx, r, fighter, now);
  }

  // LAYER 1: MAIN BODY (Clean God Face + Royal Toga & Pleats)
  drawZeusPixelBody(ctx, r, isStorm);

  // LAYER 2: AUTHENTIC ANIME HAIR ASSET (Assets/model/Zeus-hair.png)
  _drawZeusHair(ctx, r, isStorm, facingLeft);

  // LAYER 3: GOLDEN OLYMPIAN CROWN HEADBAND (Assets/model/Zeus-crown.png)
  _drawZeusCrown(ctx, r, isStorm, facingLeft);

  // Status Overlays (Stun, Freeze, Paralyze, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}

