// ─────────────────────────────────────────────
// URYU ISHIDA FIGHTER SKIN & BODY MODEL
// The Last Quincy & Sternritter "A" (Bleach)
// Adhering to Rule 19 (Upright Front POV),
// Rule 20 (Hand Visibility), and Rule 11 (Zero shadowBlur)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawUryuBow, drawSeeleSchneider } from '../weapons/uryuWeaponGraphics.js';
import { isSuppressedByGetsuga } from '../../entities/fighter.js';

let _uryuHairImage = null;
let _uryuHairImageLoading = false;

export function _getUryuHairImage() {
  if (_uryuHairImage && _uryuHairImage.complete && _uryuHairImage.naturalWidth > 0) {
    return _uryuHairImage;
  }
  if (!_uryuHairImageLoading && typeof Image !== 'undefined') {
    _uryuHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _uryuHairImage = img;
      _uryuHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Uryu hair image at Assets/model/uryu/Ishida-hair.png', e);
      _uryuHairImageLoading = false;
    };
    img.src = 'Assets/model/uryu/Ishida-hair.png?v=1';
    _uryuHairImage = img;
  }
  return _uryuHairImage;
}

let _uryuGlassesImage = null;
let _uryuGlassesImageLoading = false;

export function _getUryuGlassesImage() {
  if (_uryuGlassesImage && _uryuGlassesImage.complete && _uryuGlassesImage.naturalWidth > 0) {
    return _uryuGlassesImage;
  }
  if (!_uryuGlassesImageLoading && typeof Image !== 'undefined') {
    _uryuGlassesImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _uryuGlassesImage = img;
      _uryuGlassesImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Uryu glasses image at Assets/model/uryu/Ishida-eye-glasses.png', e);
      _uryuGlassesImageLoading = false;
    };
    img.src = 'Assets/model/uryu/Ishida-eye-glasses.png?v=1';
    _uryuGlassesImage = img;
  }
  return _uryuGlassesImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getUryuHairImage();
  _getUryuGlassesImage();
}

/**
 * Draws Uryu's dedicated hair asset model (Assets/model/uryu/Ishida-hair.png)
 */
export function _drawUryuHair(ctx, r, facingLeft = false) {
  const img = _getUryuHairImage();
  if (!img || !img.complete || img.naturalWidth <= 0) return;

  const custom = (typeof state !== 'undefined' && state.skinCustomizations?.uryu)
    ? state.skinCustomizations.uryu
    : {};

  const wMult = custom.widthScale ?? 1.0;
  const hMult = custom.heightScale ?? 1.0;
  const offX = custom.offsetX ?? 0;
  const offY = custom.offsetY ?? 0;
  const rot = custom.angleOffset ?? 0;
  const flipX = custom.flipX ? -1 : 1;
  const flipY = custom.flipY ? -1 : 1;

  const baseW = r * 2.85 * wMult;
  const baseH = r * 2.25 * hMult;

  const drawX = offX;
  const drawY = -r * 0.22 + offY;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(drawX, drawY);
  if (rot !== 0) ctx.rotate(rot);
  if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
  ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
  ctx.restore();
}

/**
 * Draws Uryu's dedicated eye glasses asset model (Assets/model/uryu/Ishida-eye-glasses.png)
 */
export function _drawUryuGlasses(ctx, r, facingLeft = false) {
  const img = _getUryuGlassesImage();
  if (!img || !img.complete || img.naturalWidth <= 0) return;

  const custom = (typeof state !== 'undefined' && state.skinCustomizations?.uryu_glasses)
    ? state.skinCustomizations.uryu_glasses
    : ((typeof state !== 'undefined' && state.skinCustomizations?.uryu) ? state.skinCustomizations.uryu : {});

  const wMult = custom.widthScale ?? 1.0;
  const hMult = custom.heightScale ?? 1.0;
  const offX = custom.offsetX ?? 0;
  const offY = custom.offsetY ?? 0;
  const rot = custom.angleOffset ?? 0;
  const flipX = custom.flipX ? -1 : 1;
  const flipY = custom.flipY ? -1 : 1;

  const baseW = r * 1.75 * wMult;
  const baseH = r * 0.90 * hMult;

  const drawX = offX;
  const drawY = -r * 0.04 + offY;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(drawX, drawY);
  if (rot !== 0) ctx.rotate(rot);
  if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
  ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
  ctx.restore();
}

/**
 * Draws Uryu's hand matching his fair anime skin tone.
 * Fully compliant with Rule 20 (Hand Visibility & Skin Only).
 */
export function drawUryuHand(ctx, x, y, radius, isDrawing = false) {
  ctx.save();
  ctx.translate(x, y);

  // 1. Quincy White Sleeve Cuff (Extending toward the body)
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  if (isDrawing) {
    // Sleeve cuff angled toward the body/elbow during draw pull
    ctx.roundRect(-radius * 1.5, -radius * 0.85, radius * 1.4, radius * 1.7, 3);
  } else {
    ctx.roundRect(-radius * 1.1, -radius * 0.75, radius * 1.0, radius * 1.5, 2);
  }
  ctx.fill();
  ctx.stroke();

  // Subtle royal blue Quincy seam line on cuff
  ctx.strokeStyle = '#1D4ED8';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(isDrawing ? -radius * 1.4 : -radius * 1.0, 0);
  ctx.lineTo(isDrawing ? -radius * 0.3 : -radius * 0.2, 0);
  ctx.stroke();

  // 2. Fair Anime Skin Tone Fist in Pixel Art (Matching face #FFE8D6)
  drawPixelHand(ctx, 0, 0, radius, '#FFE8D6');

  // 4. Glowing Reishi spirit spark at string pinch point
  if (isDrawing) {
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.arc(radius * 0.2, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(radius * 0.2, 0, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws Uryu's Reishi Spirit Particle Aura and ground Quincy Cross ring.
 * Zero shadowBlur filters (Rule 11 compliant).
 */
export function drawUryuReishiAura(ctx, fighter) {
  const r = fighter.r || 25;
  const isPreview = fighter._isWinnerReveal || fighter.isDemoFighter || (typeof state !== 'undefined' && (state.gameState === 'matchEnd' || state.gameState === 'roundEnd' || state.gameState === 'champion'));
  if (isPreview) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const isVollstandig = Boolean(fighter.vollstandigActive);

  ctx.save();
  // Canvas is already translated to (fighter.x, fighter.y) in drawUryuSkin

  // 1. Rising Spirit Particle Sparks (Combat only - Zero shadowBlur - Rule 11)
  ctx.fillStyle = '#00E5FF';
  for (let i = 0; i < 4; i++) {
    const phase = (now * 0.002 + i * 1.57) % 1.0;
    const sparkX = Math.sin(now * 0.003 + i * 2) * (r * 0.9);
    const sparkY = (r * 0.6) - phase * (r * 1.6);
    const sparkAlpha = Math.sin(phase * Math.PI) * (isVollstandig ? 0.9 : 0.4);

    ctx.globalAlpha = sparkAlpha;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 4; i++) {
    const phase = (now * 0.002 + i * 1.57) % 1.0;
    const sparkX = Math.sin(now * 0.003 + i * 2) * (r * 0.9);
    const sparkY = (r * 0.6) - phase * (r * 1.6);
    const sparkAlpha = Math.sin(phase * Math.PI) * (isVollstandig ? 0.9 : 0.6);

    ctx.globalAlpha = sparkAlpha;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Piercing Light Radiant Reishi Aura & Orbiting Diamonds (Passive 1)
  if (fighter.isPiercingLightActive) {
    const pulse = Math.sin(now * 0.008) * 0.5 + 0.5;
    
    // Outer pulsating cyan Reishi shield ring
    ctx.strokeStyle = `rgba(0, 229, 255, ${0.40 + pulse * 0.35})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.32 + pulse * 3.0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25 + pulse * 2.0, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Orbiting Quincy Diamond Motes
    const orbAngle = now * 0.005;
    for (let d = 0; d < 4; d++) {
      const a = orbAngle + (d * Math.PI / 2);
      const dx = Math.cos(a) * (r * 1.55);
      const dy = Math.sin(a) * (r * 1.55);

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(dx, dy - 4);
      ctx.lineTo(dx + 3, dy);
      ctx.lineTo(dx, dy + 4);
      ctx.lineTo(dx - 3, dy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // 3. Ransōtengai (Heavenly Wild Puppet Suit) Overhead Marionette Strings (Passive 2)
  if (fighter.ransotengaiActive) {
    const stringTopX = Math.sin(now * 0.003) * (r * 0.35);
    const stringTopY = -r * 4.8;

    // Anchor joints on Uryu's body
    const joints = [
      { x: 0, y: -r * 0.85 },          // Head crown
      { x: -r * 0.65, y: -r * 0.05 },  // Left shoulder
      { x: r * 0.65, y: -r * 0.05 },   // Right shoulder
      { x: -r * 0.25, y: r * 0.30 },   // Left torso
      { x: r * 0.25, y: r * 0.30 },    // Right torso
    ];

    for (let j = 0; j < joints.length; j++) {
      const jt = joints[j];
      const pulsePhase = ((now * 0.005) + j * 0.20) % 1.0;
      const pulseX = stringTopX + (jt.x - stringTopX) * pulsePhase;
      const pulseY = stringTopY + (jt.y - stringTopY) * pulsePhase;

      const stringGrad = ctx.createLinearGradient(stringTopX, stringTopY, jt.x, jt.y);
      stringGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
      stringGrad.addColorStop(0.25, 'rgba(0, 229, 255, 0.45)');
      stringGrad.addColorStop(1.0, 'rgba(0, 229, 255, 0.85)');

      // Outer glowing Reishi beam
      ctx.strokeStyle = stringGrad;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(stringTopX, stringTopY);
      ctx.lineTo(jt.x, jt.y);
      ctx.stroke();

      // Inner white spirit filament
      const coreGrad = ctx.createLinearGradient(stringTopX, stringTopY, jt.x, jt.y);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      coreGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.65)');
      coreGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.95)');

      ctx.strokeStyle = coreGrad;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(stringTopX, stringTopY);
      ctx.lineTo(jt.x, jt.y);
      ctx.stroke();

      // Flowing Reishi spark mote traveling down string
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(pulseX, pulseY, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Diamond attachment node at joint
      ctx.fillStyle = '#00E5FF';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(jt.x, jt.y - 2.8);
      ctx.lineTo(jt.x + 2.2, jt.y);
      ctx.lineTo(jt.x, jt.y + 2.8);
      ctx.lineTo(jt.x - 2.2, jt.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // 4. Vollständig Single Radiant Reishi Wing (Left Side)
  if (isVollstandig) {
    ctx.save();
    ctx.globalAlpha = 0.90;
    const wingLength = r * 3.2;
    const wingAngle = -0.7 + Math.sin(now * 0.003) * 0.08;

    ctx.rotate(wingAngle);

    // Glowing cyan feather blades
    const wingGrad = ctx.createLinearGradient(0, 0, -wingLength, -wingLength * 0.4);
    wingGrad.addColorStop(0, '#FFFFFF');
    wingGrad.addColorStop(0.3, '#00E5FF');
    wingGrad.addColorStop(1.0, 'rgba(0, 229, 255, 0)');

    ctx.fillStyle = wingGrad;
    for (let f = 0; f < 5; f++) {
      const fOff = f * 8;
      const fLen = wingLength * (1.0 - f * 0.15);
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -fOff);
      ctx.quadraticCurveTo(-fLen * 0.5, -fLen * 0.6 - fOff, -fLen, -fLen * 0.3 - fOff);
      ctx.lineTo(-fLen * 0.7, -fLen * 0.15 - fOff);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws Uryu's dash afterimages at recorded absolute world coordinates.
 */
export function drawUryuAfterImages(ctx, fighter) {
  const isSuppressed = typeof fighter?.areAttackEffectsSuppressed === 'function' ? fighter.areAttackEffectsSuppressed() : isSuppressedByGetsuga(fighter);
  if (!fighter || !fighter.afterImages || fighter.afterImages.length === 0 || isSuppressed) return;
  const r = fighter.r || 25;

  ctx.save();
  for (let i = 0; i < fighter.afterImages.length; i++) {
    const ai = fighter.afterImages[i];
    if (!ai || ai.timer <= 0) continue;
    const progress = ai.timer / (ai.maxTimer || 14);
    const alpha = progress * 0.45;
    const angle = ai.gunAngle !== undefined ? ai.gunAngle : (ai.angle || 0);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(ai.x, ai.y);
    ctx.rotate(angle);

    const facingLeft = Math.abs(angle) > Math.PI / 2;
    if (facingLeft) ctx.scale(1, -1);

    // 1. Radiant Cyan Silhouette
    ctx.beginPath();
    ctx.arc(0, 0, ai.r || r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.fill();
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 2. White Quincy Tunic Ghost (+Y)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, (ai.r || r) * 0.95, 0, Math.PI);
    ctx.fill();

    // 3. Dark Hair Ghost (-Y)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.60)';
    ctx.beginPath();
    ctx.arc(0, 0, (ai.r || r) * 0.98, Math.PI, Math.PI * 2);
    ctx.fill();

    // 4. Ghost Bow
    drawUryuBow(ctx, (ai.r || r) * 0.95, 0, ai.r || r, 0);

    ctx.restore();
  }
  ctx.restore();
}

let _cachedUryuBodyCanvas = null;
let _cachedUryuBodyR = 0;

/**
 * Renders Uryu Ishida's procedural pixel art body model (Rule 24 — Toji Reference Standard).
 * - Stepped dark outer circle manga ink outline (#0E0F14)
 * - Zone 1: Pure Fair Anime Face & Cheeks (ry < r * 0.36)
 * - Zone 2: Lowered Wandenreich Quincy White Tunic (ry >= r * 0.36) with blue zipper seam, gold collar tabs, breast emblem, and 2x2 buttons
 */
function _renderUryuPixelBodyToCanvas(destCtx, r) {
  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);

  // 1. Base Circular Body Clip & Outer Ink Border (Rule 24)
  destCtx.save();
  destCtx.beginPath();
  destCtx.arc(0, 0, r, 0, Math.PI * 2);
  destCtx.clip();

  // A. Warm Fair Anime Skin Base Tone (Zone 1: Face Dome)
  destCtx.fillStyle = '#FFE8D6';
  destCtx.beginPath();
  destCtx.arc(0, 0, r, 0, Math.PI * 2);
  destCtx.fill();

  // Cheek Shading
  const cheekGrad = destCtx.createRadialGradient(-r * 0.20, -r * 0.15, r * 0.15, 0, 0, r * 1.05);
  cheekGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  cheekGrad.addColorStop(0.70, 'rgba(244, 203, 184, 0.15)');
  cheekGrad.addColorStop(1.0, 'rgba(160, 100, 80, 0.30)');
  destCtx.fillStyle = cheekGrad;
  destCtx.beginPath();
  destCtx.arc(0, 0, r, 0, Math.PI * 2);
  destCtx.fill();

  // B. WANDENREICH STERNRITTER UNIFORM (+Y Lowered Coat: topY = r * 0.36)
  const topY = r * 0.36; // Lowered coat boundary so chin & mouth are free
  const coatWhite = '#FFFFFF';
  const seamStroke = '#000000';
  const zipBlue = '#1D4ED8';
  const shadowCool = '#E2E8F0';
  const shadowSubtle = '#F1F5F9';
  const shadowDeep = 'rgba(203, 213, 225, 0.55)';

  // 1. Pure White Coat Base Fill
  destCtx.fillStyle = coatWhite;
  destCtx.beginPath();
  destCtx.moveTo(-r * 1.05, topY);
  destCtx.lineTo(r * 1.05, topY);
  destCtx.lineTo(r * 1.05, r * 1.05);
  destCtx.lineTo(-r * 1.05, r * 1.05);
  destCtx.closePath();
  destCtx.fill();

  // 2. Cel-Shading Fabric Shadows
  const zipBottomY = topY + r * 0.16;
  destCtx.fillStyle = shadowCool;
  destCtx.beginPath();
  destCtx.moveTo(-r * 0.35, topY);
  destCtx.lineTo(r * 0.35, topY);
  destCtx.lineTo(r * 0.01, zipBottomY);
  destCtx.closePath();
  destCtx.fill();

  // Top Neck / Chin Horizontal Cast Shadow Strip
  destCtx.fillStyle = 'rgba(148, 163, 184, 0.25)';
  destCtx.beginPath();
  destCtx.rect(-r * 1.05, topY, r * 2.1, r * 0.04);
  destCtx.fill();

  // Left Flap Underlayer Cel-Shade
  destCtx.fillStyle = shadowSubtle;
  destCtx.beginPath();
  destCtx.moveTo(-r * 0.95, topY + r * 0.08);
  destCtx.lineTo(-r * 0.22, topY + r * 0.32);
  destCtx.lineTo(-r * 0.48, r * 0.74);
  destCtx.lineTo(-r * 1.05, r * 0.74);
  destCtx.lineTo(-r * 1.05, topY + r * 0.08);
  destCtx.closePath();
  destCtx.fill();

  // Diagonal Lapel Drop Shadow
  destCtx.fillStyle = shadowDeep;
  destCtx.beginPath();
  destCtx.moveTo(r * 0.82, topY + r * 0.14);
  destCtx.lineTo(-r * 0.45, r * 0.65);
  destCtx.lineTo(-r * 0.45, r * 0.69);
  destCtx.lineTo(r * 0.78, topY + r * 0.18);
  destCtx.closePath();
  destCtx.fill();

  // Lower Hem Curvature Shading
  destCtx.fillStyle = 'rgba(226, 232, 240, 0.40)';
  destCtx.beginPath();
  destCtx.moveTo(-r * 0.90, r * 0.90);
  destCtx.quadraticCurveTo(0, r * 0.82, r * 0.90, r * 0.90);
  destCtx.lineTo(r * 1.05, r * 1.05);
  destCtx.lineTo(-r * 1.05, r * 1.05);
  destCtx.closePath();
  destCtx.fill();

  // 3. Vertical Blue Zipper on Inner Collar
  destCtx.fillStyle = zipBlue;
  destCtx.strokeStyle = '#0F172A';
  destCtx.lineWidth = 1.0;
  destCtx.beginPath();
  destCtx.moveTo(-r * 0.02, topY);
  destCtx.lineTo(r * 0.04, topY);
  destCtx.lineTo(r * 0.04, zipBottomY);
  destCtx.lineTo(-r * 0.02, zipBottomY);
  destCtx.closePath();
  destCtx.fill();
  destCtx.stroke();

  // 4. Crisp Black Manga Uniform Seams (1.3px line width — sharp & distinguished)
  destCtx.strokeStyle = seamStroke;
  destCtx.lineWidth = 1.3;
  destCtx.lineCap = 'round';
  destCtx.lineJoin = 'round';

  // Top Horizontal Seam Line
  destCtx.beginPath();
  destCtx.moveTo(-r * 1.05, topY);
  destCtx.lineTo(r * 1.05, topY);
  destCtx.stroke();

  // Symmetrical Inner Collar V-Lines
  destCtx.beginPath();
  destCtx.moveTo(-r * 0.35, topY);
  destCtx.lineTo(r * 0.01, zipBottomY);
  destCtx.lineTo(r * 0.35, topY);
  destCtx.stroke();

  // Main Diagonal Crossover Lapel Line
  const leftJunctionX = -r * 0.45;
  const leftJunctionY = r * 0.65;
  const rightNotchX = r * 0.82;
  const rightNotchY = topY + r * 0.14;

  destCtx.beginPath();
  destCtx.moveTo(rightNotchX, rightNotchY);
  destCtx.lineTo(leftJunctionX, leftJunctionY);
  destCtx.stroke();

  // Diagonal seam from zipper bottom down to left junction
  destCtx.beginPath();
  destCtx.moveTo(r * 0.01, zipBottomY);
  destCtx.lineTo(leftJunctionX, leftJunctionY);
  destCtx.stroke();

  // Left Lapel Notched Contour
  destCtx.beginPath();
  destCtx.moveTo(-r * 0.95, topY + r * 0.08);
  destCtx.lineTo(-r * 0.82, topY + r * 0.08);
  destCtx.lineTo(-r * 0.82, topY + r * 0.14);
  destCtx.lineTo(-r * 0.22, topY + r * 0.32);
  destCtx.stroke();

  // Left Lower Flap Vertical Seam Line
  destCtx.beginPath();
  destCtx.moveTo(leftJunctionX, leftJunctionY);
  destCtx.lineTo(-r * 0.48, r * 0.74);
  destCtx.lineTo(-r * 0.48, r * 0.95);
  destCtx.stroke();

  // Right Lapel Notched Contour
  destCtx.beginPath();
  destCtx.moveTo(r * 0.95, topY + r * 0.08);
  destCtx.lineTo(r * 0.82, topY + r * 0.08);
  destCtx.lineTo(rightNotchX, rightNotchY);
  destCtx.stroke();

  // Fabric Tension Folds
  destCtx.strokeStyle = 'rgba(148, 163, 184, 0.40)';
  destCtx.lineWidth = 0.7;
  destCtx.beginPath();
  destCtx.moveTo(r * 0.72, r * 0.74);
  destCtx.quadraticCurveTo(r * 0.58, r * 0.76, r * 0.48, r * 0.72);
  destCtx.moveTo(-r * 0.05, r * 0.76);
  destCtx.lineTo(r * 0.12, r * 0.80);
  destCtx.stroke();

  // 5. Wandenreich Insignia Badges
  const badgeGold = '#C8A251';
  const badgeBorder = '#000000';

  // Collar Diamond Patches
  const drawCollarDiamond = (dx, dy, rot) => {
    destCtx.save();
    destCtx.translate(dx, dy);
    destCtx.rotate(rot);
    destCtx.fillStyle = badgeGold;
    destCtx.strokeStyle = badgeBorder;
    destCtx.lineWidth = 0.8;
    destCtx.beginPath();
    destCtx.moveTo(0, -1.7);
    destCtx.lineTo(1.8, 0);
    destCtx.lineTo(0, 1.7);
    destCtx.lineTo(-1.8, 0);
    destCtx.closePath();
    destCtx.fill();
    destCtx.stroke();
    destCtx.restore();
  };

  drawCollarDiamond(-r * 0.76, topY + r * 0.05, 0.20);
  drawCollarDiamond(r * 0.76, topY + r * 0.05, -0.20);

  // Lower-Left Breast Winged Star Emblem
  destCtx.save();
  destCtx.translate(-r * 0.55, r * 0.56);
  destCtx.fillStyle = '#D4AF37';
  destCtx.strokeStyle = badgeBorder;
  destCtx.lineWidth = 0.7;
  destCtx.lineCap = 'round';
  destCtx.lineJoin = 'round';
  destCtx.beginPath();
  destCtx.arc(0, -0.5, 2.2, Math.PI, 0);
  destCtx.quadraticCurveTo(2.4, -0.6, 3.8, 0.2);
  destCtx.quadraticCurveTo(2.4, 1.2, 1.2, 0.7);
  destCtx.lineTo(0.7, 2.3);
  destCtx.lineTo(0, 1.5);
  destCtx.lineTo(-0.7, 2.3);
  destCtx.lineTo(-1.2, 0.7);
  destCtx.quadraticCurveTo(-2.4, 1.2, -3.8, 0.2);
  destCtx.quadraticCurveTo(-2.4, -0.6, 0, -0.5);
  destCtx.closePath();
  destCtx.fill();
  destCtx.stroke();

  // Central 5-Pointed Star Accent
  destCtx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 4) / 5 - Math.PI / 2;
    const sx = Math.cos(a) * 1.9;
    const sy = Math.sin(a) * 1.9 + 0.2;
    if (i === 0) destCtx.moveTo(sx, sy);
    else destCtx.lineTo(sx, sy);
  }
  destCtx.closePath();
  destCtx.stroke();
  destCtx.restore();

  // Quincy Cross Emblem (+)
  destCtx.save();
  destCtx.translate(-r * 0.32, r * 0.70);
  destCtx.strokeStyle = '#0F172A';
  destCtx.lineWidth = 1.6;
  destCtx.lineCap = 'round';
  destCtx.beginPath();
  destCtx.moveTo(0, -r * 0.10);
  destCtx.lineTo(0, r * 0.10);
  destCtx.moveTo(-r * 0.08, 0);
  destCtx.lineTo(r * 0.08, 0);
  destCtx.stroke();
  destCtx.restore();

  // 6. Four Double-Breasted Buttons (2x2 Grid)
  const drawButton = (bx, by) => {
    destCtx.save();
    destCtx.translate(bx, by);
    destCtx.fillStyle = '#334155';
    destCtx.strokeStyle = '#000000';
    destCtx.lineWidth = 0.8;
    destCtx.beginPath();
    destCtx.arc(0, 0, 1.4, 0, Math.PI * 2);
    destCtx.fill();
    destCtx.stroke();
    destCtx.fillStyle = '#94A3B8';
    destCtx.beginPath();
    destCtx.arc(-0.4, -0.4, 0.45, 0, Math.PI * 2);
    destCtx.fill();
    destCtx.restore();
  };

  const btnColX = r * 0.30;
  const btnTopY = r * 0.65;
  const btnBotY = r * 0.86;
  drawButton(-btnColX, btnTopY);
  drawButton(-btnColX, btnBotY);
  drawButton(btnColX, btnTopY);
  drawButton(btnColX, btnBotY);

  destCtx.restore(); // End clipped body circle

  // 7. Outer 4-Neighbor Ink Stroke (Toji Reference Rule 24 Boundary Outline)
  destCtx.strokeStyle = '#0E0F14';
  destCtx.lineWidth = 2.0;
  destCtx.beginPath();
  destCtx.arc(0, 0, r, 0, Math.PI * 2);
  destCtx.stroke();

  destCtx.restore();
}

/**
 * Draws Uryu's procedural pixel-art body with 1:1 offscreen canvas caching (Toji Standard Rule 24).
 */
export function drawUryuPixelBody(ctx, r) {
  if (typeof document === 'undefined') {
    _renderUryuPixelBodyToCanvas(ctx, r);
    return;
  }

  const intR = Math.round(r);
  if (!_cachedUryuBodyCanvas || _cachedUryuBodyR !== intR) {
    const P = 2.0;
    const steps = Math.ceil((intR + P) / P);
    const size = (steps * 2 + 1) * P;
    _cachedUryuBodyCanvas = document.createElement('canvas');
    _cachedUryuBodyCanvas.width = size;
    _cachedUryuBodyCanvas.height = size;
    const cctx = _cachedUryuBodyCanvas.getContext('2d');
    _renderUryuPixelBodyToCanvas(cctx, intR);
    _cachedUryuBodyR = intR;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const size = _cachedUryuBodyCanvas.width;
  ctx.drawImage(_cachedUryuBodyCanvas, -size / 2, -size / 2);
  ctx.restore();
}

/**
 * Main Skin Renderer for Uryu Ishida (The Last Quincy)
 * Fully compliant with Rule 19 (Upright Front POV), Rule 20 (Hand Visibility), and Rule 11 (Zero shadowBlur).
 */
export function drawUryuSkin(ctx, fighter) {
  fighter.suppressSketchyOutline = true;
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  // 0. Render Hirenkyaku afterimages in absolute world space
  drawUryuAfterImages(ctx, fighter);

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Underfoot Reishi & Ground Quincy Aura
  drawUryuReishiAura(ctx, fighter);

  // 2. Upright Front POV & Local Angle Transforms (Rule 19)
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 3. Bow Drawing & Shooting Animation Progress (Buttery Smooth Kinematics)
  const isMeleeChop = Boolean(fighter.slashSwingTimer && fighter.slashSwingTimer > 0);
  const seeleP = (fighter.seeleEquipProgress !== undefined)
    ? fighter.seeleEquipProgress
    : (isMeleeChop ? 1.0 : 0.0);

  // Smooth lerped draw progress from fighter
  const drawProgress = (fighter.smoothDrawProgress !== undefined)
    ? fighter.smoothDrawProgress
    : (isPodiumPreview ? 0.70 : 0);

  const isDrawing = drawProgress > 0.04;
  const clampedDraw = Math.min(1.0, Math.max(0.0, drawProgress));

  // Hand Position Coordinates (Rule 19 / 20)
  // Front Hand holding bow center grip with firm forward push
  const frontX = r * 1.05 + Math.pow(clampedDraw, 0.7) * 4.0;
  const frontY = 0;

  // Smooth String Nock & Recoil Physics
  const recoilTimer = fighter.stringRecoilTimer || 0;
  const recoilMax = fighter.stringRecoilMax || 6;
  const recoilP = (recoilTimer > 0) ? (1.0 - recoilTimer / recoilMax) : 1.0;
  const recoilOffset = (recoilTimer > 0)
    ? Math.sin(recoilP * Math.PI * 3) * Math.exp(-recoilP * 3.2) * (r * 0.45)
    : 0;

  const isVollstandig = Boolean(fighter.vollstandigActive);
  const bowScale = isVollstandig ? 1.25 : 1.0;
  const imgScale = (r / 25) * 0.140 * bowScale;
  const restStringX = -141 * imgScale;
  const maxDrawBackX = - (r * 2.60 * bowScale);
  const drawBackX = restStringX + (maxDrawBackX - restStringX) * Math.pow(clampedDraw, 0.85) + recoilOffset;

  // Back hand grips the arrow nock (frontX + drawBackX) during draw, rests naturally at idle
  const restBackX = r * 0.40;
  const restBackY = -r * 0.10;
  const targetBackX = (clampedDraw <= 0.02 && recoilTimer <= 0)
    ? restBackX
    : (frontX + drawBackX);
  const targetBackY = (clampedDraw <= 0.02 && recoilTimer <= 0)
    ? restBackY
    : 0;

  // Smooth exponential interpolation for back hand (snappy tracking during active draw)
  if (fighter._smoothBackX === undefined || isPodiumPreview) {
    fighter._smoothBackX = targetBackX;
    fighter._smoothBackY = targetBackY;
  } else {
    const lerpSpeed = isDrawing ? 0.80 : 0.45;
    fighter._smoothBackX += (targetBackX - fighter._smoothBackX) * lerpSpeed;
    fighter._smoothBackY += (targetBackY - fighter._smoothBackY) * lerpSpeed;
  }

  const backX = fighter._smoothBackX;
  const backY = fighter._smoothBackY;

  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  const hideFrontHand = shouldHideHands || fighter.hideFrontHand;
  const hideBackHand = shouldHideHands || fighter.hideBackHand;
  const handRadius = getHandSize(7.0);
  const skinColor = '#FFE8D6'; // Warm, clear fair anime skin tone

  // ── LAYER 1: BACK HAND (Only at idle rest when not drawing) ──
  if (!hideBackHand && !isDrawing && recoilTimer <= 0 && seeleP <= 0.05) {
    drawUryuHand(ctx, backX, backY, handRadius * 0.92, false);
  }

  // ── LAYER 2: BODY CIRCLE (Toji Reference Standard Rule 24 Pixel Art Model) ──
  drawUryuPixelBody(ctx, r);

  // ── LAYER 3: GLASSES FIRST, HAIR SECOND (Hair Bangs Over Glasses) ──
  _drawUryuGlasses(ctx, r, facingLeft);
  _drawUryuHair(ctx, r, facingLeft);

  // ── LAYER 3: HANDS & WEAPON (Smooth Quincy Reishi Synthesis Transition) ──
  const chopMax = fighter.slashSwingMaxTimer || 18;
  const chopTimer = fighter.slashSwingTimer || 0;
  const chopP = Math.min(1.0, Math.max(0.0, 1.0 - (chopTimer / chopMax)));

  // Kinematic Front-Hand Lunge Position during Seele Schneider
  let chopFrontX = frontX;
  let chopFrontY = frontY;

  if (chopP < 0.14) {
    const t = chopP / 0.14;
    const easeW = Math.sin(t * (Math.PI / 2));
    chopFrontX = frontX - easeW * (r * 0.12);
    chopFrontY = -easeW * (r * 0.22);
  } else if (chopP < 0.58) {
    const t = (chopP - 0.14) / 0.44;
    const lunge = Math.sin(t * Math.PI);
    chopFrontX = (frontX - r * 0.12) + t * (r * 0.35) + lunge * 8.0;
    chopFrontY = (-r * 0.22) + t * (r * 0.48);
  } else {
    const recP = (chopP - 0.58) / 0.42;
    const easeRec = 0.5 + 0.5 * Math.cos(recP * Math.PI);
    chopFrontX = frontX + easeRec * (r * 0.23);
    chopFrontY = easeRec * (r * 0.26);
  }

  // Kinematic Back-Hand Fencing Position during Seele Schneider
  const lungeFactor = Math.sin(chopP * Math.PI);
  const chopBackX = -r * 0.45 - lungeFactor * 6.0;
  const chopBackY = r * 0.25 - lungeFactor * 4.0;

  const bowAlpha = (fighter.currentWeaponMode === 'SEELE' || isMeleeChop) ? 0.0 : Math.max(0, 1.0 - seeleP);
  const seeleAlpha = Math.max(0, seeleP);

  // Smooth blended hand coordinates
  const blendedFrontX = frontX * (1 - seeleP) + chopFrontX * seeleP;
  const blendedFrontY = frontY * (1 - seeleP) + chopFrontY * seeleP;

  const stanceBackX = backX;
  const stanceBackY = backY;
  const blendedBackX = stanceBackX * (1 - seeleP) + chopBackX * seeleP;
  const blendedBackY = stanceBackY * (1 - seeleP) + chopBackY * seeleP;

  // 1. Ginrei Kojaku Spirit Bow (Fades out / dissolves into Reishi particles as seeleP increases)
  if (bowAlpha > 0.01 && !hideFrontHand) {
    drawUryuBow(ctx, blendedFrontX, blendedFrontY, r, drawProgress, {
      isAiming: isDrawing,
      isVollstandig: Boolean(fighter.vollstandigActive),
      recoilTimer: fighter.stringRecoilTimer || 0,
      recoilMax: fighter.stringRecoilMax || 6,
      alpha: bowAlpha
    });
  }

  // 2. Seele Schneider Spirit Blade (Materializes & extends as seeleP increases)
  if (seeleAlpha > 0.01 && !hideFrontHand) {
    drawSeeleSchneider(ctx, blendedFrontX, blendedFrontY, r, chopP, {
      alpha: seeleAlpha
    });
  }

  // 3. Reishi Assembly / Dissolve Sparks during active transition
  if (seeleP > 0.05 && seeleP < 0.95 && Math.random() < 0.35 && typeof spawnSparks === 'function') {
    const sparkX = fighter.x + Math.cos(angle) * blendedFrontX - Math.sin(angle) * blendedFrontY;
    const sparkY = fighter.y + Math.sin(angle) * blendedFrontX + Math.cos(angle) * blendedFrontY;
    spawnSparks(sparkX, sparkY, '#00E5FF', 1);
  }

  // 4. Front Hand Grip on top of active weapons
  if (!hideFrontHand) {
    drawUryuHand(ctx, blendedFrontX, blendedFrontY, handRadius, false);
  }

  // 5. Back Hand Grip / Fencing Counterbalance
  const showBackHand = (bowAlpha > 0.5 && (isDrawing || recoilTimer > 0)) || (seeleAlpha > 0.08);
  if (!hideBackHand && showBackHand) {
    const backHandAlpha = (seeleAlpha > 0.08) ? Math.min(1.0, seeleAlpha * 1.5) : 1.0;
    ctx.save();
    if (backHandAlpha < 1.0) ctx.globalAlpha *= backHandAlpha;
    drawUryuHand(ctx, blendedBackX, blendedBackY, handRadius * 0.92, true);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Renders Uryu's ghost skin for preview/selection.
 */
export function drawUryuGhostSkin(ctx, fighter) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  drawUryuSkin(ctx, fighter);
  ctx.restore();
}
