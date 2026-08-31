// ─────────────────────────────────────────────
// Uryu Ishida Weapon Graphics: Ginrei Kojaku & Seele Schneider
// Quincy Spirit Particle Bow & High-Frequency Vibrating Blade
// Adhering to Rule 11 (Zero shadowBlur) & Rule 20 (Skin Only Guard)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

let _uryuBowImage = null;
let _uryuBowImageLoading = false;

export function _getUryuBowImage() {
  if (_uryuBowImage && _uryuBowImage.complete && _uryuBowImage.naturalWidth > 0) {
    return _uryuBowImage;
  }
  if (!_uryuBowImageLoading && typeof Image !== 'undefined') {
    _uryuBowImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _uryuBowImage = img;
      _uryuBowImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Ishida bow image at Assets/model/ISHIDA-BOW.png', e);
      _uryuBowImageLoading = false;
    };
    img.src = 'Assets/model/ISHIDA-BOW.png?v=2';
    _uryuBowImage = img;
  }
  return _uryuBowImage;
}

let _uryuBowFrameImage = null;
let _uryuBowFrameImageLoading = false;

export function _getUryuBowFrameImage() {
  if (_uryuBowFrameImage && _uryuBowFrameImage.complete && _uryuBowFrameImage.naturalWidth > 0) {
    return _uryuBowFrameImage;
  }
  if (!_uryuBowFrameImageLoading && typeof Image !== 'undefined') {
    _uryuBowFrameImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _uryuBowFrameImage = img;
      _uryuBowFrameImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Ishida bow frame image at Assets/model/ISHIDA-BOW-FRAME.png', e);
      _uryuBowFrameImageLoading = false;
    };
    img.src = 'Assets/model/ISHIDA-BOW-FRAME.png?v=2';
    _uryuBowFrameImage = img;
  }
  return _uryuBowFrameImage;
}

let _uryuArrowImage = null;
let _uryuArrowImageLoading = false;

export function _getUryuArrowImage() {
  if (_uryuArrowImage && _uryuArrowImage.complete && _uryuArrowImage.naturalWidth > 0) {
    return _uryuArrowImage;
  }
  if (!_uryuArrowImageLoading && typeof Image !== 'undefined') {
    _uryuArrowImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _uryuArrowImage = img;
      _uryuArrowImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Ishida arrow image at Assets/model/ISHIDA-ARROW.png', e);
      _uryuArrowImageLoading = false;
    };
    img.src = 'Assets/model/ISHIDA-ARROW.png?v=2';
    _uryuArrowImage = img;
  }
  return _uryuArrowImage;
}

let _uryuBowBladeImage = null;
let _uryuBowBladeImageLoading = false;

export function _getUryuBowBladeImage() {
  if (_uryuBowBladeImage && _uryuBowBladeImage.complete && _uryuBowBladeImage.naturalWidth > 0) {
    return _uryuBowBladeImage;
  }
  if (!_uryuBowBladeImageLoading && typeof Image !== 'undefined') {
    _uryuBowBladeImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _uryuBowBladeImage = img;
      _uryuBowBladeImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Ishida bow blade image at Assets/model/ISHIDA-BOW-BLADE.png', e);
      _uryuBowBladeImageLoading = false;
    };
    img.src = 'Assets/model/ISHIDA-BOW-BLADE.png?v=2';
    _uryuBowBladeImage = img;
  }
  return _uryuBowBladeImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getUryuBowImage();
  _getUryuBowFrameImage();
  _getUryuArrowImage();
  _getUryuBowBladeImage();
}

export const URYU_WEAPON_GRAPHICS = {
  bow: {
    coreCyan: '#00E5FF',
    brightWhite: '#FFFFFF',
    deepBlue: '#0052CC',
    glowCyan: 'rgba(0, 229, 255, 0.65)',
    silverMetal: '#E2E8F0',
    silverDark: '#64748B'
  },
  positioning: {
    offsetX: 0,
    offsetY: 0,
    scale: 1.0,
    angleOffset: 0
  }
};

/**
 * Draws Ginrei Kojaku (Sacred Spirit Bow) and loaded Heilig Pfeil arrow.
 * Supports pixel art weapon model rendering from Assets/model/ISHIDA-BOW-FRAME.png & ISHIDA-ARROW.png
 * (matching Ichigo's weapon model method with physical dynamic arrow pull-back).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Front hand grip X in local space
 * @param {number} y - Front hand grip Y in local space
 * @param {number} r - Fighter body radius
 * @param {number} drawProgress - 0.0 (idle) to 1.0 (fully drawn string)
 * @param {Object} opts - Additional options (e.g. isDrawing, isVollstandig)
 */
export function drawUryuBow(ctx, x, y, r, drawProgress = 0, opts = {}) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  if (opts.alpha !== undefined && opts.alpha <= 0.005) return;

  const isVollstandig = Boolean(opts.isVollstandig);
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  ctx.save();
  if (opts.alpha !== undefined && opts.alpha < 1.0) {
    ctx.globalAlpha *= Math.max(0, Math.min(1.0, opts.alpha));
  }
  ctx.translate(x, y);

  const custom = (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.uryu)
    ? state.weaponCustomizations.uryu
    : { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };

  const customScale = custom.scale !== undefined ? custom.scale : 1.0;
  const customOffsetX = custom.offsetX !== undefined ? custom.offsetX : 0;
  const customOffsetY = custom.offsetY !== undefined ? custom.offsetY : 0;
  const customAngle = custom.angleOffset !== undefined ? custom.angleOffset : 0;

  ctx.translate(customOffsetX, customOffsetY);
  ctx.rotate(customAngle);
  ctx.scale(customScale, customScale);

  const scale = isVollstandig ? 1.25 : 1.0;
  const clampedDraw = Math.min(1.0, Math.max(0.0, drawProgress));
  const recoilTimer = opts.recoilTimer || 0;
  const recoilMax = opts.recoilMax || 6;
  const recoilP = (recoilTimer > 0) ? (1.0 - recoilTimer / recoilMax) : 1.0;
  const recoilOffset = (recoilTimer > 0)
    ? Math.sin(recoilP * Math.PI * 3) * Math.exp(-recoilP * 3.2) * (r * 0.45)
    : 0;

  const bowFrameImg = _getUryuBowFrameImage();
  const arrowImg = _getUryuArrowImage();
  const bowImg = _getUryuBowImage();

  const hasModular = (bowFrameImg && bowFrameImg.complete && bowFrameImg.naturalWidth > 0) ||
                     (bowImg && bowImg.complete && bowImg.naturalWidth > 0);

  if (hasModular) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; 

    // Grand Anime Spirit Bow Scaling: ~95px span matching Ichigo's Zangetsu blade
    const imgScale = (r / 25) * 0.140 * scale;
    const gripX = 370;
    const gripY = 337;

    const frameToDraw = (bowFrameImg && bowFrameImg.complete && bowFrameImg.naturalWidth > 0) ? bowFrameImg : bowImg;
    ctx.save();
    ctx.scale(imgScale, imgScale);
    ctx.drawImage(frameToDraw, -gripX, -gripY);
    ctx.restore();

    const topTipX = -141 * imgScale - clampedDraw * 2.5 * scale;
    const topTipY = -329 * imgScale + clampedDraw * 2.0 * scale;
    const botTipX = -142 * imgScale - clampedDraw * 2.5 * scale;
    const botTipY = 329 * imgScale - clampedDraw * 2.0 * scale;

    const maxDrawBackX = - (r * 2.60 * scale);
    const restStringX = -141 * imgScale;
    const drawBackX = restStringX + (maxDrawBackX - restStringX) * Math.pow(clampedDraw, 0.85) + recoilOffset;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.65)';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(topTipX, topTipY);
    ctx.lineTo(drawBackX, 0);
    ctx.lineTo(botTipX, botTipY);
    ctx.stroke();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(topTipX, topTipY);
    ctx.lineTo(drawBackX, 0);
    ctx.lineTo(botTipX, botTipY);
    ctx.stroke();
    ctx.restore();

    const isFiringRecoil = recoilTimer > 0 && clampedDraw <= 0.05;
    if ((clampedDraw > 0.03 || opts.isAiming) && !isFiringRecoil) {
      const arrowAlpha = Math.min(1.0, (clampedDraw > 0 ? (clampedDraw / 0.18) : 0.85));

      ctx.save();
      ctx.globalAlpha = (ctx.globalAlpha || 1.0) * arrowAlpha;

      if (arrowImg && arrowImg.complete && arrowImg.naturalWidth > 0) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.scale(imgScale, imgScale);
        ctx.drawImage(arrowImg, drawBackX / imgScale, -33);
        ctx.restore();
      }

      const arrowTipX = drawBackX + 520 * imgScale;

      if (clampedDraw > 0.10) {
        ctx.save();
        for (let k = 0; k < 6; k++) {
          const streamPhase = ((now * 0.005) + k * 0.18) % 1.0;
          const streamAngle = (k * Math.PI * 2 / 6) + (now * 0.004);
          const streamDist = (1.0 - streamPhase) * 24 * clampedDraw;
          const sx = arrowTipX + Math.cos(streamAngle) * streamDist + (1.0 - streamPhase) * 10;
          const sy = Math.sin(streamAngle) * streamDist * 0.65;
          const sAlpha = Math.sin(streamPhase * Math.PI) * 0.85 * clampedDraw;
          ctx.strokeStyle = `rgba(0, 229, 255, ${sAlpha.toFixed(2)})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(arrowTipX, 0);
          ctx.stroke();
        }
        ctx.restore();
      }

      const flareSize = (5 + clampedDraw * 14);
      const flareAlpha = 0.50 + clampedDraw * 0.50 + Math.sin(now * 0.015) * 0.15;
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1.0, flareAlpha).toFixed(2)})`;
      ctx.lineWidth = 1.3 + clampedDraw * 0.7;
      ctx.beginPath();
      ctx.moveTo(arrowTipX - flareSize * 0.3, 0);
      ctx.lineTo(arrowTipX + flareSize * 1.2, 0);
      ctx.moveTo(arrowTipX + flareSize * 0.4, -flareSize * 0.55);
      ctx.lineTo(arrowTipX + flareSize * 0.4, flareSize * 0.55);
      ctx.stroke();

      if (clampedDraw > 0.60) {
        const diagSize = flareSize * 0.50;
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.90)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(arrowTipX + flareSize * 0.4 - diagSize, -diagSize);
        ctx.lineTo(arrowTipX + flareSize * 0.4 + diagSize, diagSize);
        ctx.moveTo(arrowTipX + flareSize * 0.4 - diagSize, diagSize);
        ctx.lineTo(arrowTipX + flareSize * 0.4 + diagSize, -diagSize);
        ctx.stroke();
      }

      // Sacred Spirit Spark Fletching at Nock
      ctx.fillStyle = '#00E5FF';
      ctx.beginPath();
      ctx.arc(drawBackX, 0, 3.4 + clampedDraw * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(drawBackX, 0, 1.8 + clampedDraw * 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // end arrow Alpha save
    }

    ctx.restore(); // end modular save
    ctx.restore(); // end outer drawUryuBow save
    return;
  }

  // ── PROCEDURAL FALLBACK (When image is not yet loaded) ──
  const R_center = r * 2.15 * scale; // Radius of circular bow arc (~54px)
  const centerX = - (R_center - r * 0.45); // Arc center behind the grip (~-43px)
  const bladeHW = r * 0.22 * scale; // Broad-blade half-width (~5.5px)
  const R_inner = R_center - bladeHW;
  const R_outer = R_center + bladeHW;

  const stemHW = 1.8;
  const needleHW = 1.3;

  // Key angles (in radians) along the circular arc
  const a_stem_start = 0.07; // Just above/below the central grip
  const a_stem_end   = 0.18; // Stepped shoulder expanding into broad blade
  const a_blade_end  = 0.88; // Stepped shoulder tapering into needle tip rod
  const a_tip_end    = 1.06; // Final needle tip where bowstring attaches

  // Elastic bow limb tip deflection under string tension
  const flexX = -clampedDraw * 2.5 * scale;
  const flexY = clampedDraw * 1.8 * scale;

  // String nock endpoints (with subtle elastic inward flex under tension)
  const topTipX = centerX + R_center * Math.cos(-a_tip_end) + flexX;
  const topTipY = R_center * Math.sin(-a_tip_end) + flexY;
  const botTipX = centerX + R_center * Math.cos(a_tip_end) + flexX;
  const botTipY = R_center * Math.sin(a_tip_end) - flexY;

  const maxDrawBackX = - (r * 1.85 * scale);
  const restStringX = topTipX; // Natural straight resting line
  const drawBackX = restStringX + (maxDrawBackX - restStringX) * Math.pow(clampedDraw, 0.85) + recoilOffset;

  // ── 0. FLOATING AMBIENT REISHI SPARKLES (Frosted starlight aura) ──
  ctx.save();
  ctx.fillStyle = '#00E5FF';
  for (let p = 0; p < 6; p++) {
    const particlePhase = ((now * 0.002) + p * 1.1) % 1.0;
    const aP = a_stem_end + (a_blade_end - a_stem_end) * particlePhase;
    const dirP = (p % 2 === 0) ? -1 : 1;
    const rOffset = Math.sin(now * 0.003 + p * 2.3) * (bladeHW * 0.6);
    const px = centerX + (R_center + rOffset) * Math.cos(dirP * aP);
    const py = (R_center + rOffset) * Math.sin(dirP * aP);
    const pAlpha = Math.sin(particlePhase * Math.PI) * 0.85;
    ctx.globalAlpha = pAlpha;
    ctx.beginPath();
    ctx.arc(px, py, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── 1. REISHI ENERGY BOWSTRING (Straight Laser Beam) ──
  ctx.save();
  // Outer Cyan Spirit Glow
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.50)';
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (clampedDraw <= 0.02 && recoilTimer <= 0) {
    // Pure straight laser string at rest
    ctx.moveTo(topTipX, topTipY);
    ctx.lineTo(botTipX, botTipY);
  } else {
    // Drawn / vibrating V-shape
    ctx.moveTo(topTipX, topTipY);
    ctx.lineTo(drawBackX, 0);
    ctx.lineTo(botTipX, botTipY);
  }
  ctx.stroke();

  // Pure White-Hot Laser Core
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (clampedDraw <= 0.02 && recoilTimer <= 0) {
    ctx.moveTo(topTipX, topTipY);
    ctx.lineTo(botTipX, botTipY);
  } else {
    ctx.moveTo(topTipX, topTipY);
    ctx.lineTo(drawBackX, 0);
    ctx.lineTo(botTipX, botTipY);
  }
  ctx.stroke();
  ctx.restore();

  // ── 2. LOADED HEILIG PFEIL (SACRED ARROW) ──
  // Arrow is visible while drawing / aiming, but not during pure release recoil (arrow is in flight!)
  const isFiringRecoil = recoilTimer > 0 && clampedDraw <= 0.05;
  if ((clampedDraw > 0.03 || opts.isAiming) && !isFiringRecoil) {
    const arrowAlpha = Math.min(1.0, (clampedDraw > 0 ? (clampedDraw / 0.18) : 0.85));
    // Fixed arrow physical length: Arrow slides backward through the front grip as drawBackX pulls back!
    const arrowLength = r * 2.65 * scale;
    const arrowTipX = drawBackX + arrowLength;

    ctx.save();
    ctx.globalAlpha = (ctx.globalAlpha || 1.0) * arrowAlpha;

    // Converging Reishi particle suction streaks (gathering ambient spirit energy into arrowhead)
    if (clampedDraw > 0.15) {
      ctx.save();
      for (let k = 0; k < 5; k++) {
        const streamPhase = ((now * 0.004) + k * 0.23) % 1.0;
        const streamAngle = (k * Math.PI * 2 / 5) + (now * 0.002);
        const streamDist = (1.0 - streamPhase) * 22 * clampedDraw;
        const sx = arrowTipX + Math.cos(streamAngle) * streamDist + (1.0 - streamPhase) * 8;
        const sy = Math.sin(streamAngle) * streamDist * 0.6;
        const sAlpha = Math.sin(streamPhase * Math.PI) * 0.75 * clampedDraw;
        ctx.strokeStyle = `rgba(0, 229, 255, ${sAlpha.toFixed(2)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(arrowTipX, 0);
        ctx.stroke();
      }
      ctx.restore();
    }

    // A. Arrow Outer Spirit Aura
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.60)';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(drawBackX, 0);
    ctx.lineTo(arrowTipX, 0);
    ctx.stroke();

    // B. White-Hot Energy Shaft Core
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(drawBackX, 0);
    ctx.lineTo(arrowTipX, 0);
    ctx.stroke();

    // C. Reishi Energy Spiral Helix around shaft (tightens and spins faster as draw tension peaks)
    const helixSpeed = now * (0.006 + clampedDraw * 0.012);
    const spirals = 7 + Math.floor(clampedDraw * 4);
    ctx.strokeStyle = `rgba(56, 189, 248, ${(0.60 + clampedDraw * 0.35).toFixed(2)})`;
    ctx.lineWidth = 1.0 + clampedDraw * 0.4;
    ctx.beginPath();
    for (let s = 0; s <= spirals; s++) {
      const sx = drawBackX + (s / spirals) * (arrowTipX - drawBackX);
      const phase = (helixSpeed + s * 0.75) % (Math.PI * 2);
      const sy = Math.sin(phase) * (2.2 + clampedDraw * 1.0);
      if (s === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // D. Diamond Reishi Arrowhead
    const headScale = 1.0 + clampedDraw * 0.35;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(arrowTipX + 10 * headScale, 0);
    ctx.lineTo(arrowTipX - 4.5 * headScale, -4.5 * headScale);
    ctx.lineTo(arrowTipX - 1.5 * headScale, 0);
    ctx.lineTo(arrowTipX - 4.5 * headScale, 4.5 * headScale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // E. 4-Pointed Cruciform Reishi Flare at Arrowhead
    const flareSize = (4 + clampedDraw * 12);
    const flareAlpha = 0.50 + clampedDraw * 0.50 + Math.sin(now * 0.015) * 0.15;
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1.0, flareAlpha).toFixed(2)})`;
    ctx.lineWidth = 1.2 + clampedDraw * 0.6;
    ctx.beginPath();
    ctx.moveTo(arrowTipX - flareSize * 0.3, 0);
    ctx.lineTo(arrowTipX + flareSize * 1.2, 0);
    ctx.moveTo(arrowTipX + flareSize * 0.4, -flareSize * 0.55);
    ctx.lineTo(arrowTipX + flareSize * 0.4, flareSize * 0.55);
    ctx.stroke();

    // Diagonal mini cross glint at peak tension
    if (clampedDraw > 0.75) {
      const diagSize = flareSize * 0.45;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(arrowTipX + flareSize * 0.4 - diagSize, -diagSize);
      ctx.lineTo(arrowTipX + flareSize * 0.4 + diagSize, diagSize);
      ctx.moveTo(arrowTipX + flareSize * 0.4 - diagSize, diagSize);
      ctx.lineTo(arrowTipX + flareSize * 0.4 + diagSize, -diagSize);
      ctx.stroke();
    }

    // F. Sacred Spirit Spark Fletching at Nock (Anchored to drawBackX)
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.arc(drawBackX + 2, 0, 3.2 + clampedDraw * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(drawBackX + 2, 0, 1.6 + clampedDraw * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── 3. CIRCULAR ARC BROAD-BLADE CRYSTAL LIMBS (TOP & BOTTOM) ──
  const drawArcLimb = (isTop) => {
    const dir = isTop ? -1 : 1;
    ctx.save();

    // Build the clean circular arc polygon with stepped shoulders
    const buildArcLimbPath = () => {
      ctx.beginPath();

      if (isTop) {
        // TOP LIMB: Angles are negative (-a), counter-clockwise = going up (-Y), clockwise = going down (+Y)
        // 1. Start at inner stem base
        ctx.arc(centerX, 0, R_center - stemHW, -a_stem_start, -a_stem_end, true);
        // 2. Step shoulder out to broad blade inner radius
        ctx.arc(centerX, 0, R_inner, -a_stem_end, -a_blade_end, true);
        // 3. Step shoulder in to needle rod inner radius
        ctx.arc(centerX, 0, R_center - needleHW, -a_blade_end, -a_tip_end, true);
        // 4. Tip cap across to outer needle radius
        ctx.arc(centerX, 0, R_center + needleHW, -a_tip_end, -a_blade_end, false);
        // 5. Step shoulder out to broad blade outer radius
        ctx.arc(centerX, 0, R_outer, -a_blade_end, -a_stem_end, false);
        // 6. Step shoulder in to stem outer radius
        ctx.arc(centerX, 0, R_center + stemHW, -a_stem_end, -a_stem_start, false);
      } else {
        // BOTTOM LIMB: Angles are positive (+a), clockwise = going down (+Y), counter-clockwise = going up (-Y)
        // 1. Start at inner stem base
        ctx.arc(centerX, 0, R_center - stemHW, a_stem_start, a_stem_end, false);
        // 2. Step shoulder out to broad blade inner radius
        ctx.arc(centerX, 0, R_inner, a_stem_end, a_blade_end, false);
        // 3. Step shoulder in to needle rod inner radius
        ctx.arc(centerX, 0, R_center - needleHW, a_blade_end, a_tip_end, false);
        // 4. Tip cap across to outer needle radius
        ctx.arc(centerX, 0, R_center + needleHW, a_tip_end, a_blade_end, true);
        // 5. Step shoulder out to broad blade outer radius
        ctx.arc(centerX, 0, R_outer, a_blade_end, a_stem_end, true);
        // 6. Step shoulder in to stem outer radius
        ctx.arc(centerX, 0, R_center + stemHW, a_stem_end, a_stem_start, true);
      }

      ctx.closePath();
    };

    // A. Outer Radiant Cyan Spirit Glow Shell (Zero shadowBlur - Rule 11)
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.lineWidth = 5.5;
    ctx.lineJoin = 'miter';
    buildArcLimbPath();
    ctx.stroke();

    // B. Frosted Sparkling Crystal Broad-Blade Body (Gradient Fill)
    const midAngle = dir * (a_stem_end + a_blade_end) * 0.5;
    const gradStartX = centerX + R_inner * Math.cos(dir * a_stem_end);
    const gradStartY = R_inner * Math.sin(dir * a_stem_end);
    const gradEndX = centerX + R_outer * Math.cos(midAngle);
    const gradEndY = R_outer * Math.sin(midAngle);

    const bladeGrad = ctx.createLinearGradient(gradStartX, gradStartY, gradEndX, gradEndY);
    bladeGrad.addColorStop(0, '#FFFFFF');
    bladeGrad.addColorStop(0.20, '#67E8F9');
    bladeGrad.addColorStop(0.60, '#00E5FF');
    bladeGrad.addColorStop(0.90, '#0284C7');
    bladeGrad.addColorStop(1.0, '#38BDF8');

    ctx.fillStyle = bladeGrad;
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.4;
    buildArcLimbPath();
    ctx.fill();
    ctx.stroke();

    // C. Internal Frosted Crystalline Starlight Sparkles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    for (let k = 0; k < 6; k++) {
      const spFrac = 0.15 + k * 0.14;
      const spA = dir * (a_stem_end + (a_blade_end - a_stem_end) * spFrac);
      const spR = R_center + Math.sin(now * 0.0035 + k * 1.8) * (bladeHW * 0.45);
      const spX = centerX + spR * Math.cos(spA);
      const spY = spR * Math.sin(spA);
      const spPulse = Math.sin(now * 0.006 + k * 1.3) * 0.35 + 0.65;
      ctx.beginPath();
      ctx.arc(spX, spY, 1.0 * spPulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // D. Pure White Central Energy Light Spine (Concentric circle arc)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (isTop) {
      ctx.arc(centerX, 0, R_center, -a_stem_start, -a_tip_end, true);
    } else {
      ctx.arc(centerX, 0, R_center, a_stem_start, a_tip_end, false);
    }
    ctx.stroke();

    // E. Slender Needle Tip Energy Nock Glint
    const tipX = isTop ? topTipX : botTipX;
    const tipY = isTop ? topTipY : botTipY;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  // Draw Upper & Lower Broad-Blade Crystal Limbs
  drawArcLimb(true);
  drawArcLimb(false);

  // ── 4. SILVER QUINCY CROSS CENTER GRIP ──
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-2.8, -6, 5.6, 12, 1.4);
  ctx.fill();
  ctx.stroke();

  // Central Gemstone Core
  ctx.fillStyle = '#00E5FF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Core Glint
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-0.5, -0.5, 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws Seele Schneider (vibrating spirit blade for melee intercept).
 * Enhanced with 3-stage kinematic motion curve and high-frequency Reishi saw-tooth visuals.
 */
export function drawSeeleSchneider(ctx, x, y, r, swingProgress = 0, opts = {}) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  if (opts.alpha !== undefined && opts.alpha <= 0.005) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  ctx.save();
  if (opts.alpha !== undefined && opts.alpha < 1.0) {
    ctx.globalAlpha *= Math.max(0, Math.min(1.0, opts.alpha));
  }
  ctx.translate(x, y);

  // 3-Stage Kinematic Swing Angle Curve
  let swingAngle = 0.35; // Default guard angle
  if (swingProgress > 0 && swingProgress < 1.0) {
    if (swingProgress < 0.14) {
      // Phase 1: High Windup Anticipation (0.0 -> 0.14)
      const t = swingProgress / 0.14;
      const easeWindup = Math.sin(t * (Math.PI / 2));
      swingAngle = 0.35 - easeWindup * 1.60; // Cock back upward to -1.25 rad (~11 o'clock)
    } else if (swingProgress < 0.58) {
      // Phase 2: Supersonic Downward Chop (0.14 -> 0.58)
      const t = (swingProgress - 0.14) / 0.44;
      const easeChop = t * t * (3 - 2 * t); // Smooth Hermite S-Curve
      swingAngle = -1.25 + easeChop * 2.45; // Downward sweep through horizontal to +1.20 rad (~5 o'clock)
    } else {
      // Phase 3: Follow-Through & Cosine Deceleration Recovery (0.58 -> 1.0)
      const recP = (swingProgress - 0.58) / 0.42;
      const easeRec = 0.5 + 0.5 * Math.cos(recP * Math.PI); // Cosine ease-out
      swingAngle = 0.35 + (1.20 - 0.35) * easeRec; // Smooth return to guard stance (+0.35 rad)
    }
  }
  ctx.rotate(swingAngle);

  const bladeLen = r * 2.1;

  // 1. Handle & Silver Reishi Tube Base (Polished Quincy Hilt)
  ctx.fillStyle = '#64748B';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-2.5, -3, 5, 16, 1.5);
  ctx.fill();
  ctx.stroke();

  // Silver tube bottom cap with Quincy emblem dot
  ctx.fillStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.arc(0, 13, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 2. Vibrating Spirit Blade (3M RPM Reishi Saw-Tooth Chainsaw Edge)
  const vibration = Math.sin(now * 0.12) * 1.1;

  // Outer Quincy Cyan Reishi Glow (Rule 11 compliant: layered gradient fill, zero shadowBlur)
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
  ctx.lineWidth = 6.0;
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(0, -bladeLen);
  ctx.stroke();

  // Inner Quincy Cyan Glow
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.70)';
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(0, -bladeLen);
  ctx.stroke();

  // Razor-sharp White Core
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(0, -bladeLen);
  ctx.stroke();

  // High-frequency oscillating Reishi saw-tooth edge notches
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 1.2;
  const numTeeth = 7;
  for (let i = 0; i < numTeeth; i++) {
    const toothY = -6 - i * (bladeLen / (numTeeth + 0.5)) + vibration;
    ctx.beginPath();
    ctx.moveTo(-3, toothY);
    ctx.lineTo(3, toothY - 2.5);
    ctx.stroke();
  }

  // Sharp Reishi Diamond Tip Point
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(0, -bladeLen - 5);
  ctx.lineTo(3.5, -bladeLen + 2);
  ctx.lineTo(-3.5, -bladeLen + 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws Uryu Ishida's Seele Schneider Crescent Slash Arc (Rule 15 Compliant).
 * Features 3-stage kinematic sweep, sharp double-tapering needle geometry,
 * dynamic trail eraser, and radiant Quincy Reishi color palette.
 */
export function drawUryuSeeleSlashArc(ctx, fighter) {
  if (!fighter) return;

  const chopMax = fighter.slashSwingMaxTimer || 18;
  const chopTimer = fighter.slashSwingTimer || 0;
  if (chopTimer <= 0) return;

  const rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (chopTimer / chopMax)));
  if (rawProgress <= 0 || rawProgress >= 1.0) return;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  const angle = fighter.gunAngle || fighter.angle || 0;
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft && !fighter.isSpinning) {
    ctx.scale(1, -1);
  }

  const r = fighter.r || 25;
  const outerRadius = r + 56;
  const maxThick = 18.0;

  // Keyframe Angle Constants matching weapon sweep kinematics:
  const windupAngle = -1.25;  // Cocked overhead angle
  const finishAngle = +1.20;  // Final chop sweep angle

  const cutCutoff = 0.58; // Active cutting phase ends at 58% progress

  let currentTipOffset = 0;
  let currentTailOffset = 0;
  let trailAlpha = 1.0;

  if (rawProgress < cutCutoff) {
    // ── ACTIVE CUTTING PHASE (0.0 -> 0.58) ──
    const tCut = rawProgress / cutCutoff;
    const easeCut = tCut * tCut * (3 - 2 * tCut); // Hermite curve
    currentTipOffset = windupAngle + easeCut * (finishAngle - windupAngle);
    
    // Trail stretches backwards behind tip
    const maxArcLength = 1.90; // Radians of crescent arc width
    const currentSpan = maxArcLength * Math.sin(tCut * Math.PI * 0.85);
    currentTailOffset = currentTipOffset - currentSpan;
    trailAlpha = Math.sin(tCut * Math.PI * 0.90);
  } else {
    // ── RECOVERY & DYNAMIC TRAIL ERASER PHASE (0.58 -> 1.0) ──
    const recP = (rawProgress - cutCutoff) / (1.0 - cutCutoff);
    currentTipOffset = finishAngle;
    
    // Tail chases tip using power curve so trail erases cleanly from start to finish
    const eraseFactor = Math.pow(1 - recP, 1.4);
    const maxArcLength = 1.90;
    currentTailOffset = currentTipOffset - maxArcLength * eraseFactor;
    trailAlpha = Math.max(0, 1 - recP * 1.2);
  }

  if (trailAlpha <= 0.01 || currentTipOffset <= currentTailOffset) {
    ctx.restore();
    return;
  }

  const N = 24;
  const outerPoly = [];
  const innerPoly = [];

  for (let i = 0; i <= N; i++) {
    const t = i / N; // 0 at tail, 1 at tip
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);

    // Rule 15 sharp double-tapering function: zero thickness at tip and tail
    const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
    const thick = maxThick * taper;

    const outR = outerRadius + thick * 0.5;
    const inR  = outerRadius - thick * 0.5;

    outerPoly.push({ x: Math.cos(ang) * outR, y: Math.sin(ang) * outR });
    innerPoly.push({ x: Math.cos(ang) * inR,  y: Math.sin(ang) * inR });
  }

  // 1. Layer 1: Radiant Quincy Cyan Reishi Glow Arc
  ctx.beginPath();
  outerPoly.forEach((pt, idx) => (idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
  for (let i = innerPoly.length - 1; i >= 0; i--) {
    ctx.lineTo(innerPoly[i].x, innerPoly[i].y);
  }
  ctx.closePath();

  const slashGrad = ctx.createRadialGradient(0, 0, outerRadius - maxThick, 0, 0, outerRadius + maxThick);
  slashGrad.addColorStop(0.0, 'rgba(0, 229, 255, 0)');
  slashGrad.addColorStop(0.3, `rgba(0, 229, 255, ${(0.45 * trailAlpha).toFixed(3)})`);
  slashGrad.addColorStop(0.7, `rgba(56, 189, 248, ${(0.85 * trailAlpha).toFixed(3)})`);
  slashGrad.addColorStop(1.0, 'rgba(0, 229, 255, 0)');

  ctx.fillStyle = slashGrad;
  ctx.fill();

  // 2. Layer 2: White-Hot Laser Cutting Core Line
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.20) * (0.25 + 0.75 * t);
    const rad = outerRadius + taper * 1.5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = `rgba(255, 255, 255, ${(0.95 * trailAlpha).toFixed(3)})`;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // 3. Layer 3: Reishi Spark Gleam at Leading Blade Tip
  if (rawProgress < cutCutoff) {
    const tipAngle = currentTipOffset;
    const tipX = Math.cos(tipAngle) * outerRadius;
    const tipY = Math.sin(tipAngle) * outerRadius;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Diamond Cross Glint
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.90)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(tipX - 7, tipY);
    ctx.lineTo(tipX + 7, tipY);
    ctx.moveTo(tipX, tipY - 7);
    ctx.lineTo(tipX, tipY + 7);
    ctx.stroke();
  }

  ctx.restore();
}

